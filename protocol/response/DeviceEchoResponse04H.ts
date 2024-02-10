import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";
import {ISoyalResponsePayload} from "./SoyalResponse";
import {MAX_UINT8} from "../Commons";

export class DeviceEchoResponse04H implements ISoyalResponsePayload {

    public readonly controllerNodeID: number;

    // data fields
    // appended after 2009.FEB.09
    public readonly readerType?: number; // (For Version 6.3 and later, In old version the reader always 00H)
    public readonly ioStatus0?: number;
    public readonly ioStatus1 ?: number; // or (721Q) tag data0
    public readonly parameters ?: number; // or (721Q) tag data1
    public readonly firmwareVersion ?: number; // or (721Q) tag data2
    public readonly data4 ?: number; // or (721Q) tag data3

    public constructor(controllerNodeID: number, readerType ?: number,
                       ioStatus0?: number, ioStatus1?: number, parameters?: number, firmwareVersion?: number,
                       data4?: number) {
        if (controllerNodeID && controllerNodeID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (readerType && readerType > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (ioStatus0 && ioStatus0 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (ioStatus1 && ioStatus1 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (parameters && parameters > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (firmwareVersion && firmwareVersion > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data4 && data4 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.controllerNodeID = controllerNodeID;
        this.readerType = readerType;
        this.ioStatus0 = ioStatus0;
        this.ioStatus1 = ioStatus1;
        this.parameters = parameters;
        this.firmwareVersion = firmwareVersion;
        this.data4 = data4;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEchoResponse04H> {

        const controllerNodeID = buffer[0];
        let bufferConsumed = 1;

        let readerType;
        let ioStatus0;
        let ioStatus1;
        let parameters;
        let firmwareVersion;
        let data4;
        if (buffer.length >= 2) {
            readerType = buffer[1];
            bufferConsumed += 1;
        }
        if (buffer.length >= 3) {
            ioStatus0 = buffer[2];
            bufferConsumed += 1;
        }
        if (buffer.length >= 4) {
            ioStatus1 = buffer[3];
            bufferConsumed += 1;
        }
        if (buffer.length >= 5) {
            parameters = buffer[4];
            bufferConsumed += 1;
        }
        if (buffer.length >= 6) {
            firmwareVersion = buffer[5];
            bufferConsumed += 1;
        }
        if (buffer.length >= 7) {
            data4 = buffer[6];
            bufferConsumed += 1;
        }

        return {
            instance: new DeviceEchoResponse04H(controllerNodeID, readerType, ioStatus0, ioStatus1,
                parameters, firmwareVersion, data4),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        const packet = [this.controllerNodeID];

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
