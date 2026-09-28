import {checkBufferLength, composeUInt16MSBLSB} from "../Commons";
import {DeviceParameters} from "./DeviceIOStatus";

function bit(value: number, index: number): boolean {
    return (value & (1 << index)) !== 0;
}

/**
 * Function option 2 (`24*xxx#`, EEPROM 16H), refer to 3.5.
 */
export class FunctionOption2 {
    public constructor(public readonly value: number) {
    }

    /** `#` rings the door bell */
    public get bellEnabled(): boolean {
        return bit(this.value, 7);
    }

    public get closingDoorOrEgressStopsAlarm(): boolean {
        return bit(this.value, 6);
    }

    public get globalFreeCards(): boolean {
        return bit(this.value, 5);
    }

    /** 0: lift control, 1: LED display, 2: printer, 3: duress output */
    public get terminalPortFormat(): number {
        return (this.value >> 3) & 0b11;
    }

    public get controllerFrozen(): boolean {
        return bit(this.value, 2);
    }

    /** 727H: lift output instead of duress output */
    public get liftOutputEnabled(): boolean {
        return bit(this.value, 1);
    }

    /** the door relay is on during the open time zone without waiting for a card */
    public get openZoneWithoutCard(): boolean {
        return bit(this.value, 0);
    }
}

export interface OpenZone {
    beginMinute: number;
    endMinute: number;
    /** bit mapped weekdays as stored (bit1 Sunday ~ bit7 Saturday) */
    weekdays: number;
}

/**
 * The system parameter block at EEPROM 00H~3FH of AR-721H / AR-725H / AR-727H, refer to 3.5.
 * Times are in 10ms units unless named otherwise.
 */
export class SystemParameters {
    public static readonly ADDRESS = 0x00;
    public static readonly LENGTH = 0x40;

    public constructor(public readonly raw: Uint8Array) {
        checkBufferLength(raw, SystemParameters.LENGTH);
    }

    private uint16(address: number): number {
        return composeUInt16MSBLSB(this.raw[address], this.raw[address + 1]);
    }

    /** function option 0, 20*xxx# */
    public get functionOption0(): DeviceParameters {
        return new DeviceParameters(this.raw[0x06]);
    }

    /** function option 1, 28*xxx# (bit7: forced open alarm, 721H bit6: open different doors for WG / main reader) */
    public get functionOption1(): number {
        return this.raw[0x07];
    }

    public get nodeID(): number {
        return this.raw[0x08];
    }

    public get readerType(): number {
        return this.raw[0x09];
    }

    public get armingPulseOutputTime(): number {
        return this.raw[0x0A];
    }

    /** 4, 6 or 8 */
    public get operationMode(): number {
        return this.raw[0x0B];
    }

    public get doorRelayTime10ms(): number {
        return this.uint16(0x12);
    }

    public get alarmRelayTime10ms(): number {
        return this.uint16(0x14);
    }

    public get functionOption2(): FunctionOption2 {
        return new FunctionOption2(this.raw[0x16]);
    }

    /** see ExtendParameter of 88H */
    public get extendParameter(): number {
        return this.raw[0x17];
    }

    public get armingDelay10ms(): number {
        return this.uint16(0x18);
    }

    public get alarmDelay10ms(): number {
        return this.uint16(0x1A);
    }

    public get doorCloseDelay10ms(): number {
        return this.uint16(0x1C);
    }

    public get openZones(): [OpenZone, OpenZone] {
        return [
            {beginMinute: this.uint16(0x26), endMinute: this.uint16(0x28), weekdays: this.raw[0x2E]},
            {beginMinute: this.uint16(0x2A), endMinute: this.uint16(0x2C), weekdays: this.raw[0x2F]},
        ];
    }

    public get managerUserStart(): number {
        return this.raw[0x30];
    }

    public get managerUserEnd(): number {
        return this.raw[0x31];
    }

    public get doorNumber(): number {
        return this.uint16(0x33);
    }

    public get tagInterval10ms(): number {
        return this.uint16(0x35);
    }

    /** function option 3, 34*xxx# */
    public get functionOption3(): number {
        return this.raw[0x3B];
    }

    // passwords (0CH duress, 0EH master, 1EH arming) are deliberately not exposed
}
