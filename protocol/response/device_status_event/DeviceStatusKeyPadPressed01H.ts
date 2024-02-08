import {composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT8} from "../../Commons";
import {PacketFormatError} from "../../Errors";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusResponse09H";

// TODO verify and write test for this
export class DeviceIOEventKeyPadPressed01H implements IDeviceStatusEventPayload {
    public readonly isMode8: boolean;
    public readonly pin: number;
    public readonly reserved0: number = 0;
    public readonly data4: number; // device parameters (20*xxx#)
    public readonly data5: number; // 401RO16’s parameters (24*xxx#)
    public readonly reserved1: number = 0;
    public readonly keyData?: Uint8Array;
    public readonly reserved2?: number = 0;


    public constructor(pin: number, isMode8: boolean, data4: number, data5: number, keyData?: Uint8Array) {
        if (isMode8 && pin > 9999) { // mode 8 allow 4 pin password
            throw new PacketFormatError("data is out of range");
        }
        if (!isMode8 && pin > 99999) { // mode 4 allow 5 pin password
            throw new PacketFormatError("data is out of range");
        }
        if (data4 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data5 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (keyData && keyData.length != 5) {
            throw new PacketFormatError("keyData (Data 7 - Data 11) must be 5 bytes");
        }

        this.isMode8 = isMode8
        this.pin = pin;
        this.data4 = data4;
        this.data5 = data5;
        this.keyData = keyData;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceIOEventKeyPadPressed01H> {
        if (buffer.length < 7) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        const isMode8 = (buffer[0] & 0b01000000) > 0;
        const fifthPinDigit = buffer[0] % 10;
        const fourPinDigits = composeUInt16MSBLSB(buffer[1], buffer[2]);

        const pin = isMode8 ? fourPinDigits : fourPinDigits * 10 + fifthPinDigit;

        const data4 = buffer[4];
        const data5 = buffer[5];

        let bufferConsumed = 7;

        let keyData = undefined;
        if (buffer.length > 7) {
            if (buffer.length < 13) {
                throw new PacketFormatError("not enough data for deserialization");
            }

            keyData = buffer.subarray(7, 12);
            bufferConsumed += keyData.length;
        }


        return {
            instance: new DeviceIOEventKeyPadPressed01H(
                pin, isMode8, data4, data5, keyData,
            ),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        const pinFifthDigit = this.isMode8 ? 0b01000000 : this.pin % 10;
        const pinFourDigits =
            getBytesFromUInt16BE(this.isMode8 ? this.pin : Math.floor(this.pin / 10));

        const result = [pinFifthDigit, ...pinFourDigits, this.reserved0, this.data4, this.data5, this.reserved1];
        if (this.keyData) {
            result.push(...this.keyData);
            result.push(this.reserved2!!);
        }

        return Uint8Array.from(result);
    }

}