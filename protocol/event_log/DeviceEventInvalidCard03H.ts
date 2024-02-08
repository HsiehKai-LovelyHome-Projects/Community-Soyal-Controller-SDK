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
    public readonly address: number;
    public readonly dutyKey: number;
    public readonly flag: number; // bit7:  Forced Open Alarm
    public readonly bitSelection: number; // (20*xxx#)
    public readonly wiegandFlag: number; // if message comes from Wiegand reader, bit 7 = 1
    public readonly site: number;
    public readonly readerID: number;// == doorNumber

    public readonly elevatorCtrlParameter: number; // 401RO16 Parameter Setting (24*xxx#)

    public readonly cardUID: number; // 16 bits only

    public readonly sorDeductedAmount: number;
    public readonly sorBalance: number;

    public constructor(timestamp: Date, address: number, dutyKey: number, flag: number,
                       bitSelection: number, wiegandFlag: number, site: number, readerID: number,
                       elevatorCtrlParameter: number, cardUID: number,
                       sorDeductedAmount: number, sorBalance: number) {
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
        if (site > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (readerID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (elevatorCtrlParameter > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (cardUID > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (sorDeductedAmount > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (sorBalance > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }

        this.timestamp = timestamp;
        this.address = address;
        this.dutyKey = dutyKey;
        this.flag = flag;
        this.bitSelection = bitSelection;
        this.wiegandFlag = wiegandFlag;
        this.site = site;
        this.readerID = readerID;
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
            instance: new DeviceEventInvalidCard03H(timestamp, composeUInt16MSBLSB(buffer[8], buffer[9]),
                buffer[10], buffer[11], buffer[12], buffer[13], composeUInt16MSBLSB(buffer[14], buffer[15]),
                buffer[16], buffer[17], composeUInt16MSBLSB(buffer[18], buffer[19]),
                composeUInt16MSBLSB(buffer[20], buffer[21]), composeUInt16MSBLSB(buffer[22], buffer[23])),
            bufferConsumed: 24,
        }
    }

    public serialize(): Uint8Array {
        let data = timestamp2SoyalFormat(this.timestamp);

        data.push(...getBytesFromUInt16BE(this.address),
            this.dutyKey, this.flag, this.bitSelection, this.wiegandFlag, ...getBytesFromUInt16BE(this.site),
            this.readerID, this.elevatorCtrlParameter, ...getBytesFromUInt16BE(this.cardUID),
            ...getBytesFromUInt16BE(this.sorDeductedAmount), ...getBytesFromUInt16BE(this.sorBalance));

        return Uint8Array.from(data);
    }
}