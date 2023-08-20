import {composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT8} from "../../Commons";
import {PacketFormatError} from "../../Errors";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusEventResponse09H";

export class DeviceStatusEventPayload01H implements IDeviceStatusEventPayload {
    public readonly fifthPinData: number;
    public readonly fourPinData: number;
    public readonly reserved0: number = 0;
    public readonly data4: number; // (20*xxx#)
    public readonly data5: number; // (24*xxx#)
    public readonly reserved1: number = 0;
    public readonly data7_11: Uint8Array = new Uint8Array(11 - 7 + 1); // Data 7 ~ Data 11
    public readonly data12: Uint8Array = new Uint8Array(1); // Data 12


    public constructor(fifthPinData: number, fourPinData: number, data4: number, data5: number,
                       data7_11: Uint8Array, data12: Uint8Array) {
        if (fifthPinData > 0x80 /* # */ || fourPinData > 9999 || data4 > MAX_UINT8 || data5 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        if (this.data7_11.length !== 11 - 7 + 1 || !this.data12 || this.data12.length !== 1) {
            throw new PacketFormatError("data7_11 and data12 must be 5 bytes and 1 byte respectively");
        }

        this.fifthPinData = fifthPinData;
        this.fourPinData = fourPinData;
        this.data4 = data4;
        this.data5 = data5;
        this.data7_11 = data7_11;
        this.data12 = data12;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusEventPayload01H> {
        if (buffer.length < 13) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        const data7_11 = buffer.slice(7, 11 + 1);
        const data12 = buffer.slice(12, 12 + 1);

        return {
            instance: new DeviceStatusEventPayload01H(buffer[0], composeUInt16MSBLSB(buffer[1], buffer[2]), buffer[4],
                buffer[5], data7_11, data12),
            bufferConsumed: 13,
        };
    }

    public serialize(): Uint8Array {
        const pinBytes = getBytesFromUInt16BE(this.fourPinData);
        return Uint8Array.from([this.fifthPinData, pinBytes[1], pinBytes[0],
            this.reserved0,
            this.data4, this.data5,
            this.reserved1,
            ...this.data7_11, ...this.data12]);
    }

}