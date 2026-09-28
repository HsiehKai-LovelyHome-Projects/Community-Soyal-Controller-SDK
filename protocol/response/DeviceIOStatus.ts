/**
 * Decoders for the status bytes shared by several responses of H series readers (AR-721H / AR-725H / AR-727H).
 */

function bit(value: number, index: number): boolean {
    return (value & (1 << index)) !== 0;
}

/**
 * I/O status 0 and 1, refer to 2.1.2 "Echo Status Field for AR721H, AR727H" and 2.11 (1).
 */
export class DeviceIOStatus {
    public constructor(public readonly status0: number, public readonly status1: number = 0) {
    }

    // status 0
    public get keypadLocked(): boolean {
        return bit(this.status0, 7);
    }

    public get doorRelayOn(): boolean {
        return bit(this.status0, 6);
    }

    public get alarmRelayOn(): boolean {
        return bit(this.status0, 5);
    }

    public get armed(): boolean {
        return bit(this.status0, 4);
    }

    public get alarming(): boolean {
        return bit(this.status0, 3);
    }

    /** 2.11 (1) only, reserved in 2.1.2 */
    public get doorRelayManualLatched(): boolean {
        return bit(this.status0, 2);
    }

    public get exitButtonPressed(): boolean {
        return bit(this.status0, 1);
    }

    /** door sensor input */
    public get doorOpened(): boolean {
        return bit(this.status0, 0);
    }

    // status 1
    public get forcedOpenAlarm(): boolean {
        return bit(this.status1, 7);
    }

    public get editing(): boolean {
        return bit(this.status1, 5);
    }

    public toJSON() {
        return {
            keypadLocked: this.keypadLocked,
            doorRelayOn: this.doorRelayOn,
            alarmRelayOn: this.alarmRelayOn,
            armed: this.armed,
            alarming: this.alarming,
            doorRelayManualLatched: this.doorRelayManualLatched,
            exitButtonPressed: this.exitButtonPressed,
            doorOpened: this.doorOpened,
            forcedOpenAlarm: this.forcedOpenAlarm,
            editing: this.editing,
        };
    }
}

/**
 * Function option 0 (`20*xxx#`, EEPROM 06H), reported as "device parameters" / "bit selection" in many responses.
 * Refer to 3.5 and 2.1.2 (3).
 */
export class DeviceParameters {
    public constructor(public readonly value: number) {
    }

    public get antiPassBackEnabled(): boolean {
        return bit(this.value, 7);
    }

    /** true: entry door, false: exit door */
    public get entryDoor(): boolean {
        return bit(this.value, 6);
    }

    public get masterReader(): boolean {
        return bit(this.value, 5);
    }

    public get egressButtonEnabled(): boolean {
        return bit(this.value, 4);
    }

    /** reported as the arming state in the card present status (2.1.2 (3)) */
    public get armed(): boolean {
        return bit(this.value, 3);
    }

    /** auto open time zone (63) / remote control function */
    public get autoOpenTimeZoneEnabled(): boolean {
        return bit(this.value, 2);
    }

    public get autoRelockWhenDoorClosed(): boolean {
        return bit(this.value, 1);
    }

    public get timeAttendanceEnabled(): boolean {
        return !bit(this.value, 0);
    }

    public toJSON() {
        return {
            antiPassBackEnabled: this.antiPassBackEnabled,
            entryDoor: this.entryDoor,
            masterReader: this.masterReader,
            egressButtonEnabled: this.egressButtonEnabled,
            armed: this.armed,
            autoOpenTimeZoneEnabled: this.autoOpenTimeZoneEnabled,
            autoRelockWhenDoorClosed: this.autoRelockWhenDoorClosed,
            timeAttendanceEnabled: this.timeAttendanceEnabled,
        };
    }
}

/**
 * Time & attendance status carried in bit 7~5 of duty fields, refer to 2.11.3 and 2.18.
 */
export enum DutyStatus {
    ON_DUTY = 0,
    OFF_DUTY = 1,
    OVERTIME_ON = 2,
    OVERTIME_OFF = 3,
    LUNCH_OUT = 4,
    LUNCH_IN = 5,
    EXIT = 6,
    RETURN = 7,
}

export function dutyStatusOf(dutyByte: number): DutyStatus {
    return (dutyByte >> 5) & 0b111;
}
