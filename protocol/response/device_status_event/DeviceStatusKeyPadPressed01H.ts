import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16, MAX_UINT8} from "../../Commons";
import {PacketFormatError} from "../../Errors";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusResponse09H";

/**
 * 2.1.2 event 01H, keys entered on the keypad:
 *
 * [data 0: 5th key, bit7 set in mode 8] [data 1~2: value] [data 3: 0] [data 4: 20*xxx#] [data 5: 24*xxx#] [data 6: 0]
 * ([data 7~11: key data] [data 12: 0])
 *
 * Manual examples: mode 8 `1234#` -> 80 04 D2, mode 4 `12345` -> 05 30 39 (the value already holds all the digits).
 */
export class DeviceIOEventKeyPadPressed01H implements IDeviceStatusEventPayload {
    public static readonly MODE_8_FLAG = 0b10000000;
    private static readonly BASE_LENGTH = 7;
    private static readonly KEY_DATA_LENGTH = 5;

    public readonly isMode8: boolean;
    public readonly pin: number; // data 1~2
    public readonly fifthKey: number; // data 0 without the mode 8 flag
    public readonly reserved0: number = 0;
    public readonly data4: number; // device parameters (20*xxx#)
    public readonly data5: number; // 401RO16’s parameters (24*xxx#)
    public readonly reserved1: number = 0;
    public readonly keyData?: Uint8Array; // data 7~11
    public readonly reserved2?: number = 0; // data 12

    public constructor(pin: number, isMode8: boolean, data4: number, data5: number, keyData?: Uint8Array,
                       fifthKey?: number) {
        if (isMode8 && pin > 9999) { // mode 8 allow 4 pin password
            throw new PacketFormatError("data is out of range");
        }
        checkUnsignedField(pin, MAX_UINT16);
        checkUnsignedField(data4, MAX_UINT8);
        checkUnsignedField(data5, MAX_UINT8);
        if (keyData && keyData.length != DeviceIOEventKeyPadPressed01H.KEY_DATA_LENGTH) {
            throw new PacketFormatError("keyData (Data 7 - Data 11) must be 5 bytes");
        }

        this.isMode8 = isMode8
        this.pin = pin;
        this.fifthKey = fifthKey ?? (isMode8 ? 0 : pin % 10);
        this.data4 = data4;
        this.data5 = data5;
        this.keyData = keyData;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceIOEventKeyPadPressed01H> {
        checkBufferLength(buffer, DeviceIOEventKeyPadPressed01H.BASE_LENGTH);

        const isMode8 = (buffer[0] & DeviceIOEventKeyPadPressed01H.MODE_8_FLAG) !== 0;
        const fifthKey = buffer[0] & ~DeviceIOEventKeyPadPressed01H.MODE_8_FLAG;
        const pin = composeUInt16MSBLSB(buffer[1], buffer[2]);

        const data4 = buffer[4];
        const data5 = buffer[5];

        let bufferConsumed = DeviceIOEventKeyPadPressed01H.BASE_LENGTH;

        let keyData = undefined;
        if (buffer.length > DeviceIOEventKeyPadPressed01H.BASE_LENGTH) {
            checkBufferLength(buffer, 13);

            keyData = buffer.slice(7, 12);
            bufferConsumed = 13;
        }

        return {
            instance: new DeviceIOEventKeyPadPressed01H(pin, isMode8, data4, data5, keyData, fifthKey),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        const data0 = this.isMode8 ? DeviceIOEventKeyPadPressed01H.MODE_8_FLAG | this.fifthKey : this.fifthKey;

        const result = [data0, ...getBytesFromUInt16BE(this.pin), this.reserved0, this.data4, this.data5,
            this.reserved1];
        if (this.keyData) {
            result.push(...this.keyData);
            result.push(this.reserved2!!);
        }

        return Uint8Array.from(result);
    }

}
