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
import {IDeviceEventLogPayload} from "./SoyalEventLog";

export class DeviceEventNoEvent04H implements IDeviceEventLogPayload {
    // data fields
    // appended after 2009.FEB.09
    public readonly readerType?: number; // (For Version 6.3 and later, In old version the reader always 00H)
    public readonly ioStatus0?: number;
    public readonly data1 ?: number;
    public readonly data2 ?: number;
    public readonly data3 ?: number;
    public readonly data4 ?: number;

    public constructor(readerType?: number, ioStatus0?: number,
                       data1?: number, data2?: number, data3?: number, data4?: number) {
        if ((readerType && readerType > MAX_UINT8) || (ioStatus0 && ioStatus0 > MAX_UINT8) ||
            (data1 && data1 > MAX_UINT8) || (data2 && data2 > MAX_UINT8) ||
            (data3 && data3 > MAX_UINT8) || (data4 && data4 > MAX_UINT8)) {
            throw new PacketFormatError("data is out of range");
        }

        this.readerType = readerType;
        this.ioStatus0 = ioStatus0;
        this.data1 = data1;
        this.data2 = data2;
        this.data3 = data3;
        this.data4 = data4;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventNoEvent04H> {
        if (buffer.length < 5) {
            throw new PacketFormatError("not enough data");
        }

        if(buffer.length > 5 && buffer.length < 7) {
            throw new PacketFormatError("not enough data (extended part)");
        }

        const readerType = buffer[7]

        for(let index = buffer)
    }

    public serialize(): Uint8Array {
        let data = timestamp2SoyalFormat(this.timestamp);

        data.push(this.readerID, ...getBytesFromUInt16BE(this.address),
            this.dutyKey, this.flag, this.bitSelection, this.wiegandFlag, ...getBytesFromUInt16BE(this.site),
            this.readerID, this.elevatorCtrlParameter, ...getBytesFromUInt16BE(this.cardUID));

        return Uint8Array.from(data);
    }
}