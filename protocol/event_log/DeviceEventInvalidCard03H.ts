import {
    composeCardUID,
    composeUInt16MSBLSB,
    getBytesFromUInt16BE, getBytesFromUInt32BE, MAX_CARD_UID,
    MAX_UINT16, MAX_UINT32,
    MAX_UINT8,
    timestamp2SoyalFormat,
    timestampFromSoyalFormat
} from "../Commons";
import {PacketFormatError, PacketValueError} from "../Errors";
import {DeserializeResult} from "../Serializable";
import {IDeviceEventLogPayload, LogEntryEventType} from "./DeviceEventTypes";

export class DeviceEventInvalidCard03H implements IDeviceEventLogPayload {
    // data fields
    public readonly timestamp: Date;
    public readonly address: number;
    public readonly dutyKey: number;
    public readonly flag: number; // bit7:  Forced Open Alarm
    public readonly bitSelection: number; // (20*xxx#)
    public readonly wiegandFlag: number; // if message comes from Wiegand reader, bit 7 = 1
    public readonly readerID: number;// == doorNumber

    public readonly elevatorCtrlParameter: number; // 401RO16 Parameter Setting (24*xxx#)

    public readonly cardUID: number; // 16 bits only

    public readonly sorDeductedAmount: number;
    public readonly sorBalance: number;

    public constructor(timestamp: Date, address: number, dutyKey: number, flag: number,
                       bitSelection: number, wiegandFlag: number, readerID: number,
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
        if (readerID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (elevatorCtrlParameter > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (cardUID > MAX_UINT32) {
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
        this.readerID = readerID;
        this.elevatorCtrlParameter = elevatorCtrlParameter;
        this.cardUID = cardUID;
        this.sorDeductedAmount = sorDeductedAmount;
        this.sorBalance = sorBalance;
    }

    get eventType(): number {
        return LogEntryEventType.INVALID_CARD;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventInvalidCard03H> {
        if (buffer.length < 24) {
            throw new PacketFormatError("not enough data");
        }

        if (buffer[7] != buffer[16]) {
            throw new PacketValueError("readerID and doorNumber mismatch");
        }

        const timestamp = timestampFromSoyalFormat(buffer);
        const site = composeUInt16MSBLSB(buffer[14], buffer[15]);
        const cardID = composeUInt16MSBLSB(buffer[18], buffer[19]);
        const cardUID = composeCardUID(site, cardID);
        return {
            instance: new DeviceEventInvalidCard03H(timestamp, composeUInt16MSBLSB(buffer[8], buffer[9]),
                buffer[10], buffer[11], buffer[12], buffer[13],
                buffer[16], buffer[17], cardUID,
                composeUInt16MSBLSB(buffer[20], buffer[21]), composeUInt16MSBLSB(buffer[22], buffer[23])),
            bufferConsumed: 24,
        }
    }

    public serialize(): Uint8Array {
        let data = timestamp2SoyalFormat(this.timestamp);
        const cardUIDRaw = getBytesFromUInt32BE(this.cardUID);


        data.push(this.readerID, // message source
            ...getBytesFromUInt16BE(this.address),
            this.dutyKey, this.flag, this.bitSelection, this.wiegandFlag,
            cardUIDRaw[0], cardUIDRaw[1], // site
            this.readerID, this.elevatorCtrlParameter,
            cardUIDRaw[2], cardUIDRaw[3], // card id
            ...getBytesFromUInt16BE(this.sorDeductedAmount), ...getBytesFromUInt16BE(this.sorBalance));

        return Uint8Array.from(data);
    }
}