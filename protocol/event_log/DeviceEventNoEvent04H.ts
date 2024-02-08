import {
    MAX_UINT8
} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";
import {IDeviceEventLogPayload} from "./SoyalDeviceEvent";

export class DeviceEventNoEvent04H implements IDeviceEventLogPayload {
    // data fields
    // appended after 2009.FEB.09
    public readonly readerType?: number; // (For Version 6.3 and later, In old version the reader always 00H)
    public readonly ioStatus0?: number;
    public readonly ioStatus1 ?: number; // or (721Q) tag data0
    public readonly parameters ?: number; // or (721Q) tag data1
    public readonly firmwareVersion ?: number; // or (721Q) tag data2
    public readonly data4 ?: number; // or (721Q) tag data3

    public constructor(readerType?: number, ioStatus0?: number,
                       data1?: number, data2?: number, data3?: number, data4?: number) {
        if (readerType && readerType > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (ioStatus0 && ioStatus0 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data1 && data1 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data2 && data2 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data3 && data3 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data4 && data4 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.readerType = readerType;
        this.ioStatus0 = ioStatus0;
        this.ioStatus1 = data1;
        this.parameters = data2;
        this.firmwareVersion = data3;
        this.data4 = data4;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventNoEvent04H> {

        let bufferConsumed = 0;

        let readerType;
        let ioStatus0;
        let ioStatus1;
        let parameters;
        let firmwareVersion;
        let data4;
        if (buffer.length >= 1) {
            readerType = buffer[0];
            bufferConsumed += 1;
        }
        if (buffer.length >= 2) {
            ioStatus0 = buffer[1];
            bufferConsumed += 1;
        }
        if (buffer.length >= 3) {
            ioStatus1 = buffer[2];
            bufferConsumed += 1;
        }
        if (buffer.length >= 4) {
            parameters = buffer[3];
            bufferConsumed += 1;
        }
        if (buffer.length >= 5) {
            firmwareVersion = buffer[4];
            bufferConsumed += 1;
        }
        if (buffer.length >= 6) {
            data4 = buffer[5];
            bufferConsumed += 1;
        }

        return {
            instance: new DeviceEventNoEvent04H(readerType, ioStatus0, ioStatus1, parameters,
                firmwareVersion, data4),
            bufferConsumed: bufferConsumed,
        }
    }

    public serialize(): Uint8Array {
        let packet = [];
        if (this.readerType !== undefined) {
            packet.push(this.readerType);
        }
        if (this.ioStatus0 !== undefined) {
            packet.push(this.ioStatus0);
        }
        if (this.ioStatus1 !== undefined) {
            packet.push(this.ioStatus1);
        }
        if (this.parameters !== undefined) {
            packet.push(this.parameters);
        }
        if (this.firmwareVersion !== undefined) {
            packet.push(this.firmwareVersion);
        }
        if (this.data4 !== undefined) {
            packet.push(this.data4);
        }

        return Uint8Array.from(packet);
    }
}