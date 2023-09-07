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
import {IDeviceEventLogPayload} from "./SoyalDeviceEvent";

export class DeviceEventInvalidCard03H implements IDeviceEventLogPayload {
    // data fields
    public readonly timestamp: Date;
    public readonly readerID: number;
    public readonly address: number;
    public readonly dutyKey: number;
    public readonly flag: number; // bit7:  Forced Open Alarm
    public readonly bitSelection: number; // (20*xxx#)
    public readonly wiegandFlag: number; // if message comes from Wiegand reader, bit 7 = 1
    public readonly site: number;
    // public readonly doorNumber: number; // == readerID
    public readonly elevatorCtrlParameter: number; // 401RO16 Parameter Setting (24*xxx#)
    public readonly cardUID: number; // 16 bits only

    public readonly sorDeductedAmount: number;
    public readonly sorBalance: number;

    public constructor(timestamp: Date, readerID: number, address: number, dutyKey: number, flag: number,
                       bitSelection: number, wiegandFlag: number, site: number,
                       elevatorCtrlParameter: number, cardUID: number,
                       sorDeductedAmount: number, sorBalance: number) {
        if (readerID > MAX_UINT8 || address > MAX_UINT16 || dutyKey > MAX_UINT8 || flag > MAX_UINT8 ||
            bitSelection > MAX_UINT8 || wiegandFlag > MAX_UINT8 || site > MAX_UINT16 ||
            elevatorCtrlParameter > MAX_UINT8 || cardUID > MAX_UINT16 ||
            sorDeductedAmount > MAX_UINT16 || sorBalance > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }

        this.timestamp = timestamp;
        this.readerID = readerID;
        this.address = address;
        this.dutyKey = dutyKey;
        this.flag = flag;
        this.bitSelection = bitSelection;
        this.wiegandFlag = wiegandFlag;
        this.site = site;
        this.elevatorCtrlParameter = elevatorCtrlParameter;
        this.cardUID = cardUID;
        this.sorDeductedAmount = sorDeductedAmount;
        this.sorBalance = sorBalance;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventInvalidCard03H> {
        if (buffer.length < 24) {
            throw new PacketFormatError("not enough data");
        }

        if (buffer[7] != buffer[16]) {
            throw new PacketValueError("readerID and doorNumber mismatch");
        }

        const timestamp = timestampFromSoyalFormat(buffer);

        return {
            instance: new DeviceEventInvalidCard03H(timestamp, buffer[7], composeUInt16MSBLSB(buffer[8], buffer[9]),
                buffer[10], buffer[11], buffer[12], buffer[13], composeUInt16MSBLSB(buffer[14], buffer[15]),
                buffer[17], composeUInt16MSBLSB(buffer[18], buffer[19]),
                composeUInt16MSBLSB(buffer[20], buffer[21]), composeUInt16MSBLSB(buffer[22], buffer[23])),
            bufferConsumed: 24,
        }
    }

    public serialize(): Uint8Array {
        let data = timestamp2SoyalFormat(this.timestamp);

        data.push(this.readerID, ...getBytesFromUInt16BE(this.address),
            this.dutyKey, this.flag, this.bitSelection, this.wiegandFlag, ...getBytesFromUInt16BE(this.site),
            this.readerID, this.elevatorCtrlParameter, ...getBytesFromUInt16BE(this.cardUID));

        return Uint8Array.from(data);
    }
}