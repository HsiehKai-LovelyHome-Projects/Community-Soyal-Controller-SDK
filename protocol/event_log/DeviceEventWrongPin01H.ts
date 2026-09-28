import {
    composeUInt16MSBLSB,
    getBytesFromUInt16BE,
    MAX_UINT16,
    MAX_UINT8,
    timestamp2SoyalFormat,
    timestampFromSoyalFormat
} from "../Commons";
import {PacketFormatError, PacketValueError} from "../Errors";
import {DeserializeResult} from "../Serializable";
import {IDeviceEventLogPayload, LogEntryEventType} from "./DeviceEventTypes";
import {DeviceStatusType} from "../response/DeviceStatusResponse09H";

export class DeviceEventWrongPin01H implements IDeviceEventLogPayload {
    // data fields
    public readonly timestamp: Date;
    public readonly address: number;
    public readonly dutyKey: number;
    public readonly flag: number; // bit7:  Forced Open Alarm
    public readonly bitSelection: number; // (20*xxx#)
    public readonly wiegandFlag: number; // if message comes from Wiegand reader, bit 7 = 1
    public readonly reserved_14_15: number = 0; // site is useless here
    public readonly readerID: number;// == doorNumber

    public readonly elevatorCtrlParameter: number; // 401RO16 Parameter Setting (24*xxx#)

    public readonly reserved_18_19: number = 0; // cardID is useless here

    public readonly unknown_20_21: number = 0;  // TODO figure it out wtf is this since it is not listed on the doc
    public readonly enteredPin: number;

    public constructor(timestamp: Date, address: number, dutyKey: number, flag: number,
                       bitSelection: number, wiegandFlag: number, readerID: number,
                       elevatorCtrlParameter: number, enteredPin: number) {
        if (address > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (dutyKey > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (flag > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (bitSelection > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (wiegandFlag > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (readerID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (elevatorCtrlParameter > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (enteredPin > 9999) { // TODO 5 digit pin is not yet supported by us
            throw new PacketFormatError("data is out of range");
        }

        this.timestamp = timestamp;
        this.address = address;
        this.dutyKey = dutyKey;
        this.flag = flag;
        this.bitSelection = bitSelection;
        this.wiegandFlag = wiegandFlag;
        this.readerID = readerID;
        this.elevatorCtrlParameter = elevatorCtrlParameter;
        this.enteredPin = enteredPin;
    }

    get eventType(): number {
        return LogEntryEventType.PIN_ERROR;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventWrongPin01H> {
        if (buffer.length < 24) {
            throw new PacketFormatError("not enough data");
        }

        if (buffer[7] != buffer[16]) {
            throw new PacketValueError("readerID and doorNumber mismatch");
        }

        const timestamp = timestampFromSoyalFormat(buffer);

        return {
            instance: new DeviceEventWrongPin01H(timestamp, composeUInt16MSBLSB(buffer[8], buffer[9]),
                buffer[10], buffer[11], buffer[12], buffer[13],
                buffer[16], buffer[17], composeUInt16MSBLSB(buffer[22], buffer[23])),
            bufferConsumed: 24,
        }
    }

    public serialize(): Uint8Array {
        let data = timestamp2SoyalFormat(this.timestamp);

        data.push(...getBytesFromUInt16BE(this.address),
            this.dutyKey, this.flag, this.bitSelection, this.wiegandFlag, ...getBytesFromUInt16BE(this.reserved_14_15),
            this.readerID, this.elevatorCtrlParameter, ...getBytesFromUInt16BE(this.reserved_18_19),
            ...getBytesFromUInt16BE(this.unknown_20_21), ...getBytesFromUInt16BE(this.enteredPin));

        return Uint8Array.from(data);
    }
}