import {
    composeUInt16MSBLSB,
    getBytesFromUInt16BE, getBytesFromUInt40BE,
    MAX_CARD_UID,
    MAX_UINT16,
    MAX_UINT8
} from "../../Commons";
import {PacketFormatError} from "../../Errors";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusResponse09H";

export class DeviceStatusNewCardPresent02H implements IDeviceStatusEventPayload {
    // data fields
    public readonly dutyCode: number;
    public readonly cardUID: number;

    public readonly value: number;

    public readonly idCode: number;
    public readonly deviceParameters: number;
    public readonly userStatus: number;

    // Used after Mifare 6.X
    public readonly identify ?: number; //  8AH for Mifare Tag
    public readonly tagType ?: number; // data 11
    public readonly flag ?: number; // data 12
    public readonly data ?: Uint8Array; // data 13 - 16

    public constructor(dutyCode: number, cardUID: number, value: number,
                       idCode: number, deviceParameters: number, userStatus: number,
                       identify ?: number, tagType?: number, flag?: number, data?: Uint8Array) {
        if (dutyCode > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (cardUID > MAX_CARD_UID) {
            throw new PacketFormatError("data is out of range");
        }
        if (value > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (idCode > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (deviceParameters > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (userStatus > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (identify && identify > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (tagType && tagType > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (flag && flag > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data && data.length !== 4) {
            throw new PacketFormatError("data is out of range");
        }

        this.dutyCode = dutyCode;
        this.cardUID = cardUID;
        this.value = value;
        this.idCode = idCode;
        this.deviceParameters = deviceParameters;
        this.userStatus = userStatus;

        this.identify = identify;
        this.tagType = tagType;
        this.flag = flag;
        this.data = data;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusNewCardPresent02H> {
        if (buffer.length < 10) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        const site = composeUInt16MSBLSB(buffer[1], buffer[2]);
        const cardID = composeUInt16MSBLSB(buffer[5], buffer[6]);
        const cardUID = (buffer[7] * 2 ** 32) + (site << 16) + cardID;

        const value = composeUInt16MSBLSB(buffer[3], buffer[4]);

        let bufferConsumed = 10;

        let identify: undefined | number;
        let tagType: undefined | number;
        let flag: undefined | number;
        if (buffer.length > 10) {
            if (buffer.length < 13) {
                throw new PacketFormatError("not enough data for deserialization (Mifare info)");
            }

            identify = buffer[10];
            tagType = buffer[11];
            flag = buffer[12];
            bufferConsumed = 13;
        }

        let data: undefined | Uint8Array;
        if (buffer.length > 13) {
            if (buffer.length < 17) {
                throw new PacketFormatError("not enough data for deserialization (Ultra Light info)");
            }

            data = buffer.slice(13, 17);
            bufferConsumed = 17;
        }

        return {
            instance: new DeviceStatusNewCardPresent02H(buffer[0], cardUID, value, buffer[7], buffer[8], buffer[9],
                identify, tagType, flag, data),
            bufferConsumed: bufferConsumed,
        };

    }

    serialize(): Uint8Array {
        const cardUIDBytes = getBytesFromUInt40BE(this.cardUID);
        const valueBytes = getBytesFromUInt16BE(this.value);

        let packet = [this.dutyCode, cardUIDBytes[3], cardUIDBytes[2], valueBytes[1], valueBytes[0],
            cardUIDBytes[1], cardUIDBytes[0], cardUIDBytes[4], this.deviceParameters, this.userStatus];

        if (this.identify !== undefined) {
            packet.push(this.identify, this.tagType!, this.flag!);
        }

        if (this.data) {
            packet.push(...this.data);
        }

        return Uint8Array.from(packet);
    }
}