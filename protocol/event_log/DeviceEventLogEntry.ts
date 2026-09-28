import {
    checkBufferLength,
    checkUnsignedField,
    composeCardUID,
    composeUInt16MSBLSB,
    getBytesFromUInt16BE,
    MAX_UINT16,
    MAX_UINT32,
    MAX_UINT8,
    timestamp2SoyalFormat,
    timestampFromSoyalFormat
} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {IDeviceEventLogPayload, LogEntryEventType} from "./DeviceEventTypes";
import {DeviceParameters, DutyStatus, dutyStatusOf} from "../response/DeviceIOStatus";

export interface DeviceEventLogFields {
    timestamp: Date;
    sourceID: number; // data 7, the reader which generated the event
    address: number; // data 8~9, user address
    dutyKey: number; // data 10, bit 7~5: duty status
    flag: number; // data 11, bit 7: forced open alarm
    bitSelection: number; // data 12, function option 0 (20*xxx#)
    wiegandFlag: number; // data 13, bit 7: from the Wiegand reader
    siteCode: number; // data 14~15, tag UID bit 31~16
    readerID: number; // data 16, door number
    elevatorCtrlParameter: number; // data 17, 401RO16 parameters (24*xxx#)
    cardCode: number; // data 18~19, tag UID bit 15~0
    data20_21: number; // SOR deducted amount
    data22_23: number; // SOR balance, or the entered PIN of PIN events
}

/**
 * The 24 bytes body shared by every event log entry (2.11, "fixed in 26 bytes format" with event code and reader ID).
 * Every field is decoded for every event code; subclasses only name what a field means for their event.
 */
export class DeviceEventLogEntry implements IDeviceEventLogPayload, DeviceEventLogFields {
    public static readonly LENGTH = 24;

    public readonly timestamp: Date;
    public readonly sourceID: number;
    public readonly address: number;
    public readonly dutyKey: number;
    public readonly flag: number;
    public readonly bitSelection: number;
    public readonly wiegandFlag: number;
    public readonly siteCode: number;
    public readonly readerID: number;
    public readonly elevatorCtrlParameter: number;
    public readonly cardCode: number;
    public readonly data20_21: number;
    public readonly data22_23: number;

    public constructor(private readonly _eventType: number, fields: DeviceEventLogFields) {
        checkUnsignedField(_eventType, MAX_UINT8);
        for (const value of [fields.sourceID, fields.dutyKey, fields.flag, fields.bitSelection, fields.wiegandFlag,
            fields.readerID, fields.elevatorCtrlParameter]) {
            checkUnsignedField(value, MAX_UINT8);
        }
        for (const value of [fields.address, fields.siteCode, fields.cardCode, fields.data20_21, fields.data22_23]) {
            checkUnsignedField(value, MAX_UINT16);
        }

        this.timestamp = fields.timestamp;
        this.sourceID = fields.sourceID;
        this.address = fields.address;
        this.dutyKey = fields.dutyKey;
        this.flag = fields.flag;
        this.bitSelection = fields.bitSelection;
        this.wiegandFlag = fields.wiegandFlag;
        this.siteCode = fields.siteCode;
        this.readerID = fields.readerID;
        this.elevatorCtrlParameter = fields.elevatorCtrlParameter;
        this.cardCode = fields.cardCode;
        this.data20_21 = fields.data20_21;
        this.data22_23 = fields.data22_23;
    }

    public get eventType(): number {
        return this._eventType;
    }

    /** tag UID bit 31~0 */
    public get cardUID(): number {
        return composeCardUID(this.siteCode, this.cardCode);
    }

    public get dutyStatus(): DutyStatus {
        return dutyStatusOf(this.dutyKey);
    }

    public get forcedOpenAlarm(): boolean {
        return (this.flag & 0x80) !== 0;
    }

    public get fromWiegandReader(): boolean {
        return (this.wiegandFlag & 0x80) !== 0;
    }

    public get deviceParameters(): DeviceParameters {
        return new DeviceParameters(this.bitSelection);
    }

    public get sorDeductedAmount(): number {
        return this.data20_21;
    }

    public get sorBalance(): number {
        return this.data22_23;
    }

    public static parseFields(buffer: Uint8Array): DeviceEventLogFields {
        checkBufferLength(buffer, DeviceEventLogEntry.LENGTH);

        return {
            timestamp: timestampFromSoyalFormat(buffer),
            sourceID: buffer[7],
            address: composeUInt16MSBLSB(buffer[8], buffer[9]),
            dutyKey: buffer[10],
            flag: buffer[11],
            bitSelection: buffer[12],
            wiegandFlag: buffer[13],
            siteCode: composeUInt16MSBLSB(buffer[14], buffer[15]),
            readerID: buffer[16],
            elevatorCtrlParameter: buffer[17],
            cardCode: composeUInt16MSBLSB(buffer[18], buffer[19]),
            data20_21: composeUInt16MSBLSB(buffer[20], buffer[21]),
            data22_23: composeUInt16MSBLSB(buffer[22], buffer[23]),
        };
    }

    public static deserializeAs(eventType: number, buffer: Uint8Array): DeserializeResult<DeviceEventLogEntry> {
        return {
            instance: new DeviceEventLogEntry(eventType, DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([
            ...timestamp2SoyalFormat(this.timestamp),
            this.sourceID,
            ...getBytesFromUInt16BE(this.address),
            this.dutyKey, this.flag, this.bitSelection, this.wiegandFlag,
            ...getBytesFromUInt16BE(this.siteCode),
            this.readerID, this.elevatorCtrlParameter,
            ...getBytesFromUInt16BE(this.cardCode),
            ...getBytesFromUInt16BE(this.data20_21),
            ...getBytesFromUInt16BE(this.data22_23),
        ]);
    }

    public toJSON() {
        return {
            eventType: this.eventType,
            eventName: LogEntryEventType[this.eventType] ?? "UNKNOWN",
            timestamp: this.timestamp.toISOString(),
            sourceID: this.sourceID,
            address: this.address,
            dutyStatus: DutyStatus[this.dutyStatus],
            forcedOpenAlarm: this.forcedOpenAlarm,
            fromWiegandReader: this.fromWiegandReader,
            readerID: this.readerID,
            elevatorCtrlParameter: this.elevatorCtrlParameter,
            cardUID: this.cardUID,
            data20_21: this.data20_21,
            data22_23: this.data22_23,
        };
    }
}

/** build fields for a card event, the rest defaults to zero */
export function cardEventFields(timestamp: Date, readerID: number, address: number, cardUID: number,
                                overrides: Partial<DeviceEventLogFields> = {}): DeviceEventLogFields {
    checkUnsignedField(cardUID, MAX_UINT32);

    return {
        timestamp, sourceID: readerID, address, dutyKey: 0, flag: 0, bitSelection: 0, wiegandFlag: 0,
        siteCode: Math.floor(cardUID / 0x10000), readerID, elevatorCtrlParameter: 0, cardCode: cardUID & 0xFFFF,
        data20_21: 0, data22_23: 0,
        ...overrides,
    };
}
