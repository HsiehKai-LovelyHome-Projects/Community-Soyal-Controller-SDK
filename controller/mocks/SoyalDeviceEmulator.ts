/**
 * A byte level emulator of an AR-721H / AR-725H reader in networking mode.
 *
 * Every response is encoded here directly from the protocol manual, deliberately without using the classes under
 * `src/protocol`, so that the emulator can catch encoding bugs in the SDK instead of mirroring them.
 *
 * The receiver is a byte state machine (wait 0x7E -> read length -> read `length` bytes) just like the real device,
 * so a frame interrupted in the middle leaves the emulator stuck waiting for the missing bytes, as the real one does.
 */

const HEAD = 0x7E;
const HOST_ID = 0x00;
const BROADCAST_ID = 0xFF;

const FUNCTION_ECHO = 0x03;
const FUNCTION_ACK = 0x04;
const FUNCTION_NACK = 0x05;
const FUNCTION_STATUS = 0x09;

const EVENT_LOG_BODY_LENGTH = 24;
const MAX_EEPROM_TRANSFER = 32;

// EEPROM layout, refer to 3.5
const EEPROM_FUNCTION_OPTION_0 = 0x06;
const EEPROM_NODE_ID = 0x08;
const EEPROM_EXTEND_PARAMETER = 0x17;

export enum EmulatorEventCode {
    PIN_ERROR = 0x01,
    INVALID_CARD = 0x03,
    TIME_ZONE_ERROR = 0x04,
    NORMAL_ACCESS = 0x0B,
    EGRESS = 0x10,
    ALARM_EVENT = 0x11,
    ACCESS_BY_PIN = 0x1C,
    ANTI_PASS_BACK_ERROR = 0x1E,
}

export type HostDecision = "ACCEPTED" | "DENIED" | "RELEASED" | "PIN_REQUESTED";

export interface EmulatedUser {
    cardUID: number; // site (bit 31~16) + card (bit 15~0)
    pin: number;
    mode: number; // raw mode byte, bit 1~0 access mode, bit 7 anti-pass-back
    zone: number;
    group?: number;
}

export interface EmulatorEventLogFields {
    timestamp?: Date;
    address?: number;
    cardUID?: number;
    pin?: number;
    dutyKey?: number;
}

export interface ReceivedCommand {
    destinationID: number;
    command: number;
    data: Uint8Array;
}

export interface SoyalDeviceEmulatorOptions {
    nodeID?: number;
    firmwareVersion?: number; // 0x63 == 6V3
    readerType?: number;
    eepromSize?: number;
    /**
     * "extended": ACK / NACK followed by reader type, I/O status, parameters and firmware version,
     * as documented in 2.11 (1) for firmware after 2009.FEB.09.
     * "short" (default): bare `04 <node>` / `05 <node>`, what H series readers such as AR-725H send.
     */
    ackFormat?: "extended" | "short";
}

type RxState = "HEAD" | "LENGTH" | "BODY";

export class SoyalDeviceEmulator {
    // ----- device state -----
    public readonly eeprom: Uint8Array;
    public readonly users = new Map<number, EmulatedUser>();
    /** raw 30 bytes zone structures by index (2AH) */
    public readonly timeZones = new Map<number, Uint8Array>();
    /** [month, day] pairs by index (2CH) */
    public readonly holidays = new Map<number, [number, number]>();
    /** 4 x 16 characters (27H) */
    public lcd = " ".repeat(64);
    public readonly passThroughData: Uint8Array[] = [];
    public dutyCode = 0;
    public cardInterval10ms = 0;
    public antiPassBackResetCount = 0;
    public readonly eventLogs: Uint8Array[] = []; // oldest first, each is [event code, reader ID, 24 bytes]
    public readonly firmwareVersion: number;
    public readonly readerType: number;
    public readonly ackFormat: "extended" | "short";

    public doorRelayOn = false;
    public alarmRelayOn = false;
    public armed = false;
    public keypadLocked = false;
    public doorOpened = false;
    public exitButtonPressed = false;

    public doorRelayPulseCount = 0;
    public alarmRelayPulseCount = 0;
    public doorRelayForcedByPollCount = 0;
    public resetCount = 0;

    /** true after a card / keypad status event is reported, until the host sends 04H, 05H or 84H */
    public awaitingHostDecision = false;
    public readonly hostDecisions: HostDecision[] = [];

    // ----- observation & fault injection -----
    public readonly receivedCommands: ReceivedCommand[] = [];
    public checksumErrorCount = 0;
    /** every byte received from the host, e.g. to tell whether a zero burst was sent */
    public bytesReceived = 0;
    /** the next N responses are silently discarded (the command is still executed) */
    public responsesToDrop = 0;
    /** the device executes commands but never answers */
    public unresponsive = false;

    private readonly pendingStatusEvents: Uint8Array[] = [];
    private rtcOffsetMs = 0;
    private lastKeyedValue = 0;

    private rxState: RxState = "HEAD";
    private rxLength = 0;
    private rxBody: number[] = [];

    public constructor(options: SoyalDeviceEmulatorOptions = {}) {
        this.eeprom = new Uint8Array(options.eepromSize ?? 0x8000);
        this.firmwareVersion = options.firmwareVersion ?? 0x63;
        this.readerType = options.readerType ?? 0x21;
        this.ackFormat = options.ackFormat ?? "short";
        this.loadFactoryDefault(options.nodeID ?? 1);
    }

    public get nodeID(): number {
        return this.eeprom[EEPROM_NODE_ID];
    }

    /** true when the receiver is waiting for a new frame, false when it is stuck in the middle of one */
    public get receiverIdle(): boolean {
        return this.rxState === "HEAD";
    }

    public get clock(): Date {
        return new Date(Date.now() + this.rtcOffsetMs);
    }

    public set clock(time: Date) {
        this.rtcOffsetMs = time.getTime() - Date.now();
    }

    // ---------------------------------------------------------------------------------------------------------------
    // wire interface
    // ---------------------------------------------------------------------------------------------------------------

    /**
     * Feed bytes coming from the host, returns complete response frames to send back (possibly none).
     */
    public receive(bytes: Uint8Array): Uint8Array[] {
        const responses: Uint8Array[] = [];
        this.bytesReceived += bytes.length;

        for (const byte of bytes) {
            switch (this.rxState) {
                case "HEAD":
                    if (byte === HEAD) {
                        this.rxState = "LENGTH";
                    }
                    break;
                case "LENGTH":
                    this.rxLength = byte;
                    this.rxBody = [];
                    this.rxState = "BODY";
                    break;
                case "BODY":
                    this.rxBody.push(byte);
                    if (this.rxBody.length >= this.rxLength) {
                        this.rxState = "HEAD";
                        const response = this.handleFrame(Uint8Array.from(this.rxBody));
                        if (response) {
                            responses.push(response);
                        }
                    }
                    break;
            }
        }

        return responses;
    }

    private handleFrame(body: Uint8Array): Uint8Array | undefined {
        // body: [destination] [command] [data...] [xor] [sum]
        if (body.length < 4) {
            this.checksumErrorCount++;
            return undefined;
        }

        const content = body.subarray(0, body.length - 2);
        const {xor, sum} = SoyalDeviceEmulator.checksums(content);
        if (xor !== body[body.length - 2] || sum !== body[body.length - 1]) {
            this.checksumErrorCount++;
            return undefined;
        }

        const destinationID = content[0];
        if (destinationID !== this.nodeID && destinationID !== BROADCAST_ID) {
            return undefined;
        }

        const command = content[1];
        const data = Uint8Array.from(content.subarray(2));
        this.receivedCommands.push({destinationID, command, data});

        const response = this.handleCommand(command, data);
        if (!response || this.unresponsive) {
            return undefined;
        }
        if (this.responsesToDrop > 0) {
            this.responsesToDrop--;
            return undefined;
        }

        return SoyalDeviceEmulator.encodeFrame(response);
    }

    private static checksums(content: ArrayLike<number>): { xor: number, sum: number } {
        let xor = 0xFF;
        let sum = 0;
        for (let i = 0; i < content.length; i++) {
            xor ^= content[i];
            sum += content[i];
        }

        return {xor, sum: (sum + xor) & 0xFF};
    }

    /** content: [function code] [reader ID] [data...] */
    private static encodeFrame(content: number[]): Uint8Array {
        const withDestination = [HOST_ID, ...content];
        const {xor, sum} = SoyalDeviceEmulator.checksums(withDestination);

        return Uint8Array.from([HEAD, withDestination.length + 2, ...withDestination, xor, sum]);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // command handlers
    // ---------------------------------------------------------------------------------------------------------------

    private handleCommand(command: number, data: Uint8Array): number[] | undefined {
        switch (command) {
            case 0x04: // prompt accepted, no response
                this.resolveHostDecision("ACCEPTED");
                return undefined;
            case 0x05: // prompt invalid, no response
                this.resolveHostDecision("DENIED");
                return undefined;
            case 0x09: // prompt keying in password, no response
                this.resolveHostDecision("PIN_REQUESTED");
                return undefined;
            case 0x12:
                return this.readEEPROM(data);
            case 0x18:
                return this.getDeviceStatus(data);
            case 0x20:
                return this.writeEEPROM(data);
            case 0x21:
                return this.controlRelay(data);
            case 0x23:
                return this.writeRTC(data);
            case 0x24:
                return this.readRTC();
            case 0x25:
                return this.getOldestEventLog();
            case 0x27:
                return this.setLcdText(data);
            case 0x2A:
                return this.setTimeZones(data);
            case 0x2C:
                return this.setHolidays(data);
            case 0x2D:
                this.eventLogs.length = 0;
                return this.ack();
            case 0x30:
                if (data.length < 1 || data[0] > 10 || data.length < 1 + data[0]) {
                    return this.nack();
                }
                this.passThroughData.push(data.slice(1, 1 + data[0]));
                return this.ack();
            case 0x31:
                return [0x07, this.nodeID]; // NOTAG: no Mifare card in the field
            case 0x37:
                this.eventLogs.shift();
                return this.ack();
            case 0x80:
                return this.setNodeID(data);
            case 0x81:
                return this.resetDevice(data);
            case 0x82: // duty code
                if (data.length < 1 || data[0] > 7) {
                    return this.nack();
                }
                this.dutyCode = data[0];
                return this.ack();
            case 0x83:
                return this.setUser(data);
            case 0x84: // 2.21 calls it unresponsive but lists an ACK echo; the ACK is emulated
                this.resolveHostDecision("RELEASED");
                return this.ack();
            case 0x85:
                // the option byte (bit0: normal tags, bit1: black list) only applies to 721Q / 323D
                this.users.clear();
                return this.ack();
            case 0x86: // reset anti-pass-back
                this.antiPassBackResetCount++;
                return this.ack();
            case 0x87:
                return this.getUsers(data);
            case 0x88:
                return this.setExtendParameter(data);
            case 0x90: // lock indicators (727H)
                return data.length >= 3 ? this.ack() : this.nack();
            default: // including 89H / 8AH, 721Q only
                return this.nack();
        }
    }

    private setLcdText(data: Uint8Array): number[] {
        // 2.10: [position] [length] [ASCII...] ([delay H] [delay L] [beeps])
        if (data.length < 2 || data.length < 2 + data[1] || data[0] + data[1] > 64) {
            return this.nack();
        }

        const text = String.fromCharCode(...data.subarray(2, 2 + data[1]));
        this.lcd = this.lcd.substring(0, data[0]) + text + this.lcd.substring(data[0] + text.length);
        return this.ack();
    }

    private setTimeZones(data: Uint8Array): number[] {
        // 2.24: [index] [sets] 30 bytes per zone
        const zoneLength = 30;
        if (data.length < 2 || data.length !== 2 + data[1] * zoneLength) {
            return this.nack();
        }

        for (let i = 0; i < data[1]; i++) {
            this.timeZones.set(data[0] + i, data.slice(2 + i * zoneLength, 2 + (i + 1) * zoneLength));
        }
        return this.ack();
    }

    private setHolidays(data: Uint8Array): number[] {
        // 2.25: [index] [sets] [month] [day]...
        if (data.length < 2 || data.length !== 2 + data[1] * 2 || data[0] + data[1] > 120) {
            return this.nack();
        }

        for (let i = 0; i < data[1]; i++) {
            this.holidays.set(data[0] + i, [data[2 + i * 2], data[3 + i * 2]]);
        }
        return this.ack();
    }

    private ack(): number[] {
        return this.acknowledgement(FUNCTION_ACK);
    }

    private nack(): number[] {
        return this.acknowledgement(FUNCTION_NACK);
    }

    private acknowledgement(functionCode: number): number[] {
        if (this.ackFormat === "short") {
            return [functionCode, this.nodeID];
        }

        return [functionCode, this.nodeID, this.readerType, this.ioStatus0, this.ioStatus1, this.parameters,
            this.firmwareVersion];
    }

    private echo(data: number[]): number[] {
        return [FUNCTION_ECHO, this.nodeID, ...data];
    }

    private resolveHostDecision(decision: HostDecision) {
        this.hostDecisions.push(decision);
        this.awaitingHostDecision = false;
    }

    private get ioStatus0(): number {
        return (this.keypadLocked ? 0x80 : 0) |
            (this.doorRelayOn ? 0x40 : 0) |
            (this.alarmRelayOn ? 0x20 : 0) |
            (this.armed ? 0x10 : 0) |
            (this.exitButtonPressed ? 0x02 : 0) |
            (this.doorOpened ? 0x01 : 0);
    }

    private get ioStatus1(): number {
        return 0; // bit7: forced open alarm, bit5: editing
    }

    private get parameters(): number {
        return this.eeprom[EEPROM_FUNCTION_OPTION_0];
    }

    private getDeviceStatus(data: Uint8Array): number[] {
        // 2.1.1: [sec] [min] [hour] [day] [month] [0x00] [weekday] [year] [flags]
        if (data.length >= 9) {
            this.clock = new Date(2000 + data[7], data[4] - 1, data[3], data[2], data[1], data[0]);
            if ((data[8] & 0x01) !== 0) {
                this.doorRelayOn = true;
                this.doorRelayForcedByPollCount++;
            }
        }

        const pending = this.pendingStatusEvents.shift();
        if (pending) {
            this.awaitingHostDecision = true;
            return [FUNCTION_STATUS, this.nodeID, ...pending];
        }

        // 2.1.2: event 00, I/O status with the oldest event log appended (removed by 37H only)
        const status = [FUNCTION_STATUS, this.nodeID, 0x00, this.ioStatus0, this.ioStatus1, this.parameters, 0x00];
        if (this.eventLogs.length > 0) {
            status.push(...this.eventLogs[0]);
        }

        return status;
    }

    private readEEPROM(data: Uint8Array): number[] {
        if (data.length < 3 || data[2] > MAX_EEPROM_TRANSFER) {
            return this.nack();
        }

        const address = (data[0] << 8) + data[1];
        return this.echo(Array.from(this.eeprom.subarray(address, address + data[2])));
    }

    private writeEEPROM(data: Uint8Array): number[] {
        if (data.length < 3 || data[2] > MAX_EEPROM_TRANSFER || data.length < 3 + data[2]) {
            return this.nack();
        }

        const address = (data[0] << 8) + data[1];
        this.eeprom.set(data.subarray(3, 3 + data[2]), address);
        return this.ack();
    }

    private controlRelay(data: Uint8Array): number[] {
        if (data.length < 1) {
            return this.nack();
        }

        switch (data[0]) {
            case 0x00:
                break;
            case 0x01:
                this.keypadLocked = data[1] === 1;
                break;
            case 0x02:
                if (data.length < 3) {
                    return this.nack();
                }
                this.cardInterval10ms = (data[1] << 8) + data[2];
                break;
            case 0x80:
                this.armed = true;
                break;
            case 0x81:
                this.armed = false;
                break;
            case 0x82:
                this.doorRelayOn = true;
                break;
            case 0x83:
                this.doorRelayOn = false;
                break;
            case 0x84:
                this.doorRelayPulseCount++;
                break;
            case 0x85:
                this.alarmRelayOn = true;
                break;
            case 0x86:
                this.alarmRelayOn = false;
                break;
            case 0x87:
                this.alarmRelayPulseCount++;
                break;
            default:
                return this.nack();
        }

        // 2.7: [firmware version] [status ST0] [forced open alarm] [bit selection 20*xxx#]
        return this.echo([this.firmwareVersion, this.ioStatus0, this.ioStatus1, this.parameters]);
    }

    private writeRTC(data: Uint8Array): number[] {
        // 2.8: [sec] [min] [hour] [weekday] [day] [month] [year]
        if (data.length < 7) {
            return this.nack();
        }

        this.clock = new Date(2000 + data[6], data[5] - 1, data[4], data[2], data[1], data[0]);
        return this.ack();
    }

    private readRTC(): number[] {
        const now = this.clock;

        // 2.9: time, firmware version, door number (2 bytes), firmware identify code, reader type
        return this.echo([
            ...SoyalDeviceEmulator.encodeTimestamp(now),
            this.firmwareVersion, 0x00, this.nodeID, 0x00, this.readerType,
        ]);
    }

    private getOldestEventLog(): number[] {
        if (this.eventLogs.length === 0) {
            return this.ack(); // 2.11 (1) no events
        }

        return Array.from(this.eventLogs[0]);
    }

    private setNodeID(data: Uint8Array): number[] {
        if (data.length < 1 || data[0] === HOST_ID || data[0] === BROADCAST_ID) {
            return this.nack();
        }

        this.eeprom[EEPROM_NODE_ID] = data[0];
        return this.ack();
    }

    private resetDevice(data: Uint8Array): undefined {
        this.resetCount++;
        this.rxState = "HEAD";
        this.pendingStatusEvents.length = 0;
        this.awaitingHostDecision = false;

        const isFactoryReset = data.length >= 3 && data[0] === 0x46 && data[1] === 0x41 && data[2] === 0x43; // "FAC"
        if (isFactoryReset) {
            this.users.clear();
            this.eventLogs.length = 0;
            this.loadFactoryDefault(this.nodeID);
        }

        return undefined; // 2.17: unresponsive command
    }

    private setUser(data: Uint8Array): number[] {
        // 2.19: [addr H] [addr L] [site H] [site L] [card H] [card L] [pin H] [pin L] [mode] [zone] ([group])
        if (data.length < 10) {
            return this.nack();
        }

        const address = (data[0] << 8) + data[1];
        this.users.set(address, {
            cardUID: ((data[2] << 8) + data[3]) * 0x10000 + (data[4] << 8) + data[5],
            pin: (data[6] << 8) + data[7],
            mode: data[8],
            zone: data[9],
            group: data.length > 10 ? data[10] : undefined,
        });

        return this.ack();
    }

    private getUsers(data: Uint8Array): number[] {
        // 2.20: [addr H] [addr L] [number of users] -> 8 bytes per user
        if (data.length < 3) {
            return this.nack();
        }

        const address = (data[0] << 8) + data[1];
        const result: number[] = [];
        for (let offset = 0; offset < data[2]; offset++) {
            const user = this.users.get(address + offset);
            if (!user) {
                result.push(0, 0, 0, 0, 0, 0, 0, 0);
                continue;
            }

            const site = Math.floor(user.cardUID / 0x10000) & 0xFFFF;
            const card = user.cardUID & 0xFFFF;
            result.push(site >> 8, site & 0xFF, card >> 8, card & 0xFF, user.pin >> 8, user.pin & 0xFF,
                user.mode, user.zone);
        }

        return this.echo(result);
    }

    private setExtendParameter(data: Uint8Array): number[] {
        // 2.26: [set mask] [clear mask]
        if (data.length < 2) {
            return this.nack();
        }

        this.eeprom[EEPROM_EXTEND_PARAMETER] = (this.eeprom[EEPROM_EXTEND_PARAMETER] | data[0]) & ~data[1] & 0xFF;
        return this.ack();
    }

    private loadFactoryDefault(nodeID: number) {
        this.eeprom.fill(0);
        this.eeprom[EEPROM_NODE_ID] = nodeID;
        this.eeprom[EEPROM_FUNCTION_OPTION_0] = 0x18; // enable egress button, 20*xxx# as seen on a real AR-725H
    }

    // ---------------------------------------------------------------------------------------------------------------
    // test helpers: simulate what happens in front of the reader
    // ---------------------------------------------------------------------------------------------------------------

    /**
     * A card is presented; reported on the next 18H poll as status event 02H (2.1.2 (3)).
     */
    public presentCard(cardUID: number, dutyCode: number = 0, idCode?: number) {
        const site = Math.floor(cardUID / 0x10000) & 0xFFFF;
        const card = cardUID & 0xFFFF;
        const id = idCode ?? (Math.floor(cardUID / 2 ** 32) & 0xFF);

        this.pendingStatusEvents.push(Uint8Array.from([
            0x02,
            dutyCode,
            site >> 8, site & 0xFF,
            this.lastKeyedValue >> 8, this.lastKeyedValue & 0xFF,
            card >> 8, card & 0xFF,
            id,
            this.parameters,
            0x00, // user status
        ]));
    }

    /**
     * Keys are entered and confirmed; reported on the next 18H poll as status event 01H (2.1.2 (2)).
     *
     * Mode 8 (4 keys, `1234#`): data 0 = 0x80, data 1~2 = value.
     * Mode 4 (5 keys, `12345`): data 0 = the 5th key, data 1~2 = value (manual example: 05 30 39 for 12345).
     */
    public pressKeys(value: number, mode: 4 | 8) {
        if (mode === 8 && value > 9999) {
            throw new RangeError("mode 8 supports 4 digits only");
        }
        if (mode === 4 && value > 0xFFFF) {
            throw new RangeError("the manual does not define how values above 65535 are encoded");
        }

        this.lastKeyedValue = value;
        const data0 = mode === 8 ? 0x80 : value % 10;

        this.pendingStatusEvents.push(Uint8Array.from([
            0x01,
            data0, value >> 8, value & 0xFF,
            0x00, this.parameters, 0x00, 0x00,
        ]));
    }

    /**
     * Append an event to the device log (26 bytes format, 2.11), appended to the next status polls until 37H.
     */
    public pushEventLog(eventCode: EmulatorEventCode, fields: EmulatorEventLogFields = {}) {
        const cardUID = fields.cardUID ?? 0;
        const site = Math.floor(cardUID / 0x10000) & 0xFFFF;
        const card = cardUID & 0xFFFF;
        const address = fields.address ?? 0;
        const pin = fields.pin ?? 0;

        const log = Uint8Array.from([
            eventCode, this.nodeID,
            ...SoyalDeviceEmulator.encodeTimestamp(fields.timestamp ?? this.clock),
            this.nodeID, // message source
            address >> 8, address & 0xFF,
            fields.dutyKey ?? 0,
            0x00, // bit7: forced open alarm
            this.parameters,
            0x00, // bit7: from Wiegand
            site >> 8, site & 0xFF,
            this.nodeID, // door number
            0x00, // 24*xxx#
            card >> 8, card & 0xFF,
            0x00, 0x00, pin >> 8, pin & 0xFF, // SOR amounts, the entered PIN of PIN events lives in data 22~23
        ]);

        if (log.length !== 2 + EVENT_LOG_BODY_LENGTH) {
            throw new Error("emulator bug: event log must be 26 bytes");
        }

        this.eventLogs.push(log);
    }

    /** [sec] [min] [hour] [weekday 1~7] [day] [month] [year] */
    private static encodeTimestamp(time: Date): number[] {
        return [time.getSeconds(), time.getMinutes(), time.getHours(), time.getDay() + 1,
            time.getDate(), time.getMonth() + 1, time.getFullYear() % 100];
    }
}
