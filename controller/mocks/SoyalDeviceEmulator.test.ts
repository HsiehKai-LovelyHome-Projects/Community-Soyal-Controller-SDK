import {expect, test} from "@jest/globals";
import {EmulatorEventCode, SoyalDeviceEmulator} from "./SoyalDeviceEmulator";
import {SOYAL_PROTOCOL_SHORT, SoyalProtocol} from "../../protocol/SoyalProtocol";
import {ISoyalCommandPayload, SoyalCommandCode} from "../../protocol/command/SoyalCommand";
import {SoyalFunctionCode, SoyalResponse} from "../../protocol/response/SoyalResponse";
import {GetDeviceStatusCommand18H} from "../../protocol/command/GetDeviceStatusCommand18H";
import {DeviceStatusResponse09H, DeviceStatusType} from "../../protocol/response/DeviceStatusResponse09H";
import {DeviceStatusIOStatus00H} from "../../protocol/response/device_status_event/DeviceStatusIOStatus00H";
import {DeviceEventNormalAccess0BH} from "../../protocol/event_log/DeviceEventNormalAccess0BH";
import {DeviceStatusNewCardPresent02H} from "../../protocol/response/device_status_event/DeviceStatusNewCardPresent02H";
import {DeviceIOEventKeyPadPressed01H} from "../../protocol/response/device_status_event/DeviceStatusKeyPadPressed01H";
import {AccessControlMode, SetCardContentCommand83H} from "../../protocol/command/SetCardContentCommand83H";
import {ControlRelayCommand21H, RelayControlParameter} from "../../protocol/command/ControlRelayCommand21H";
import {DoorStatusResponse} from "../../protocol/response/DoorStatusResponse";
import {DeviceEchoResponse03H} from "../../protocol/response/DeviceEchoResponse03H";
import {WriteRTCCommand23H} from "../../protocol/command/WriteRTCCommand23H";
import {ReadRTCCommand24H} from "../../protocol/command/ReadRTCCommand24H";
import {ReadRTCResponse} from "../../protocol/response/ReadRTCResponse";
import {WriteEEPROMCommand20H} from "../../protocol/command/WriteEEPROMCommand20H";
import {ReadEEPROMCommand12H} from "../../protocol/command/ReadEEPROMCommand12H";
import {RemoveOldestDeviceEventLogCommand37H} from "../../protocol/command/RemoveOldestDeviceEventLogCommand37H";
import {DeviceEchoResponse04H} from "../../protocol/response/DeviceEchoResponse04H";

function frame(command: number, payload: ISoyalCommandPayload | Uint8Array, nodeID: number = 1): Uint8Array {
    const data = payload instanceof Uint8Array ? payload : payload.serialize();
    return new SoyalProtocol(SOYAL_PROTOCOL_SHORT, nodeID, Uint8Array.from([command, ...data])).serialize();
}

function exchange(emulator: SoyalDeviceEmulator, command: number,
                  payload: ISoyalCommandPayload | Uint8Array = new Uint8Array(0)): SoyalResponse {
    const responses = emulator.receive(frame(command, payload));
    expect(responses.length).toBe(1);

    return SoyalResponse.deserialize(SoyalProtocol.deserialize(responses[0]).payload).instance;
}

function poll(emulator: SoyalDeviceEmulator, payload = new GetDeviceStatusCommand18H()): DeviceStatusResponse09H {
    const response = exchange(emulator, SoyalCommandCode.GET_DEVICE_STATUS_18H, payload);
    expect(response.functionCode).toBe(SoyalFunctionCode.DEVICE_STATUS_EVENT);

    return response.payload as DeviceStatusResponse09H;
}

test("poll_idle", () => {
    const status = poll(new SoyalDeviceEmulator());

    expect(status.statusType).toBe(DeviceStatusType.AR721H);
    expect((status.deviceStatus as DeviceStatusIOStatus00H).eventLog).toBeUndefined();
});

test("poll_appendedEventLogUntilRemoved", () => {
    const emulator = new SoyalDeviceEmulator();
    const timestamp = new Date(2025, 0, 26, 13, 45, 30);
    emulator.pushEventLog(EmulatorEventCode.NORMAL_ACCESS, {cardUID: 0xFB51C652, address: 5, timestamp});

    for (let i = 0; i < 2; i++) { // stays appended until 37H
        const eventLog = (poll(emulator).deviceStatus as DeviceStatusIOStatus00H).eventLog!;
        const entry = eventLog.logEntry as DeviceEventNormalAccess0BH;

        expect(eventLog.eventType).toBe(EmulatorEventCode.NORMAL_ACCESS);
        expect(entry.cardUID).toBe(0xFB51C652);
        expect(entry.address).toBe(5);
        expect(entry.timestamp.getTime()).toBe(timestamp.getTime());
    }

    const ack = exchange(emulator, SoyalCommandCode.REMOVE_OLDEST_DEVICE_EVENT_LOG_37H,
        new RemoveOldestDeviceEventLogCommand37H());
    expect(ack.functionCode).toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);
    expect((poll(emulator).deviceStatus as DeviceStatusIOStatus00H).eventLog).toBeUndefined();
});

test("poll_withTimestamp_syncsClockWithoutOpeningDoor", () => {
    const emulator = new SoyalDeviceEmulator();
    const timestamp = new Date(2025, 5, 15, 12, 0, 0);

    poll(emulator, new GetDeviceStatusCommand18H(timestamp));

    expect(emulator.doorRelayOn).toBe(false);
    expect(emulator.doorRelayForcedByPollCount).toBe(0);
    expect(Math.abs(emulator.clock.getTime() - timestamp.getTime())).toBeLessThan(1000);
});

test("poll_legacyTenBytesLayout_forcedDoorRelayOnInOddYears", () => {
    // what the SDK used to send in 2025: [sec min hour WEEKDAY day month 0 weekday year 0]
    const emulator = new SoyalDeviceEmulator();
    emulator.receive(frame(SoyalCommandCode.GET_DEVICE_STATUS_18H,
        Uint8Array.from([30, 45, 13, 1, 26, 1, 0, 1, 25, 0])));

    expect(emulator.doorRelayForcedByPollCount).toBe(1);
    expect(emulator.doorRelayOn).toBe(true);
});

test("poll_realAr725hCapture_legacyLayoutOpenedTheDoor", () => {
    // captured on 2025-01-22 with the legacy 10 bytes 18H layout, the reply reports the door relay on (0x40)
    const emulator = new SoyalDeviceEmulator();
    emulator.doorOpened = true; // bit 0, the door sensor followed the relay in the capture

    const responses = emulator.receive(Buffer.from("7e0e0118001e0b04160100041900fd77", "hex"));

    expect(responses.map(response => Buffer.from(response).toString("hex")))
        .toStrictEqual(["7e0a0009010041001800ae11"]);
});

test("ack_shortAndExtended", () => {
    for (const ackFormat of ["short", "extended"] as const) {
        const emulator = new SoyalDeviceEmulator({ackFormat});
        const response = exchange(emulator, SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH);
        const ack = response.payload as DeviceEchoResponse04H;

        expect(response.functionCode).toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);
        expect(response.readerID).toBe(1);
        expect(ack.isExtended).toBe(ackFormat === "extended");
        if (ack.isExtended) {
            expect(ack.readerType).toBe(emulator.readerType);
            expect(ack.firmwareVersion).toBe(emulator.firmwareVersion);
        }
    }
});

test("presentCard_thenAccept", () => {
    const emulator = new SoyalDeviceEmulator();
    emulator.presentCard(0xFB51C652);

    const status = poll(emulator);
    expect(status.statusType).toBe(DeviceStatusType.NEW_CARD);
    expect((status.deviceStatus as DeviceStatusNewCardPresent02H).cardUID).toBe(0xFB51C652);
    expect(emulator.awaitingHostDecision).toBe(true);

    expect(emulator.receive(frame(SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H, new Uint8Array(0)))).toHaveLength(0);
    expect(emulator.awaitingHostDecision).toBe(false);
    expect(emulator.hostDecisions).toStrictEqual(["ACCEPTED"]);
});

test("pressKeys_mode8", () => {
    const emulator = new SoyalDeviceEmulator();
    emulator.pressKeys(1234, 8);

    const status = poll(emulator);
    const keypad = status.deviceStatus as DeviceIOEventKeyPadPressed01H;
    expect(status.statusType).toBe(DeviceStatusType.PIN_PAD);
    expect(keypad.isMode8).toBe(true);
    expect(keypad.pin).toBe(1234);
});

test("setCardContent_storesUser", () => {
    const emulator = new SoyalDeviceEmulator();
    const response = exchange(emulator, SoyalCommandCode.SET_CARD_CONTENT_83H,
        new SetCardContentCommand83H(3, 0xFB51C652, 1234, AccessControlMode.CARD_OR_PIN, false, 1));

    expect(response.functionCode).toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);
    expect(emulator.users.get(3)).toMatchObject({cardUID: 0xFB51C652, pin: 1234, mode: 2, zone: 1});
});

test("controlRelay_doorOnOff", () => {
    const emulator = new SoyalDeviceEmulator();

    const on = exchange(emulator, SoyalCommandCode.CONTROL_RELAY_21H,
        new ControlRelayCommand21H(RelayControlParameter.DOOR_RELAY_ON));
    expect(on.functionCode).toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE);
    expect(DoorStatusResponse.deserialize(on.payload as DeviceEchoResponse03H).instance.doorStatus & 0x40)
        .toBe(0x40);
    expect(emulator.doorRelayOn).toBe(true);

    exchange(emulator, SoyalCommandCode.CONTROL_RELAY_21H,
        new ControlRelayCommand21H(RelayControlParameter.DOOR_RELAY_OFF));
    expect(emulator.doorRelayOn).toBe(false);
});

test("writeReadRTC", () => {
    const emulator = new SoyalDeviceEmulator();
    const timestamp = new Date(2026, 8, 28, 9, 30, 15);

    expect(exchange(emulator, SoyalCommandCode.WRITE_RTC_23H, new WriteRTCCommand23H(timestamp)).functionCode)
        .toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);

    const response = exchange(emulator, SoyalCommandCode.READ_RTC_24H, new ReadRTCCommand24H());
    const rtc = ReadRTCResponse.deserialize(response.payload as DeviceEchoResponse03H).instance;
    expect(Math.abs(rtc.timestamp.getTime() - timestamp.getTime())).toBeLessThan(2000);
    expect(rtc.firmwareVersion).toBe(emulator.firmwareVersion);
});

test("writeReadEEPROM", () => {
    const emulator = new SoyalDeviceEmulator();

    expect(exchange(emulator, SoyalCommandCode.WRITE_EEPROM_20H,
        new WriteEEPROMCommand20H(0x16, Uint8Array.from([0x80]))).functionCode)
        .toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);

    const response = exchange(emulator, SoyalCommandCode.READ_EEPROM_12H, new ReadEEPROMCommand12H(0x16, 1));
    expect(Array.from((response.payload as DeviceEchoResponse03H).data)).toStrictEqual([0x80]);
});

test("otherNode_isIgnored", () => {
    const emulator = new SoyalDeviceEmulator({nodeID: 2});
    expect(emulator.receive(frame(SoyalCommandCode.GET_DEVICE_STATUS_18H, new Uint8Array(0), 1))).toHaveLength(0);
});

test("interruptedFrame_swallowsNextRequest", () => {
    const emulator = new SoyalDeviceEmulator();
    const pollFrame = frame(SoyalCommandCode.GET_DEVICE_STATUS_18H, new Uint8Array(0));

    emulator.receive(pollFrame.subarray(0, 3)); // cable cut after 3 bytes
    expect(emulator.receiverIdle).toBe(false);

    // the next request completes the stale frame (bad checksum) instead of being answered
    expect(emulator.receive(pollFrame)).toHaveLength(0);
    expect(emulator.checksumErrorCount).toBe(1);
});

test("interruptedFrame_recoversWithZeroPadding", () => {
    const emulator = new SoyalDeviceEmulator();
    const pollFrame = frame(SoyalCommandCode.GET_DEVICE_STATUS_18H, new Uint8Array(0));

    emulator.receive(pollFrame.subarray(0, 3));

    // idle receivers ignore anything but 0x7E, so a burst long enough to fill the longest possible frame
    // (length byte + 255 bytes) flushes a stuck receiver without side effect on an idle one
    emulator.receive(new Uint8Array(257));

    expect(emulator.receiverIdle).toBe(true);
    expect(emulator.receive(pollFrame)).toHaveLength(1);
});

test("responsesToDrop", () => {
    const emulator = new SoyalDeviceEmulator();
    emulator.responsesToDrop = 1;
    const pollFrame = frame(SoyalCommandCode.GET_DEVICE_STATUS_18H, new Uint8Array(0));

    expect(emulator.receive(pollFrame)).toHaveLength(0);
    expect(emulator.receive(pollFrame)).toHaveLength(1);
});
