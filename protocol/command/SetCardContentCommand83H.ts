import {ISoyalCommandPayload} from "./SoyalCommand";
import {
    composeUInt16MSBLSB,
    getBytesFromUInt16BE,
    getBytesFromUInt32BE,
    MAX_UINT16,
    MAX_UINT32,
    MAX_UINT8
} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";

export enum AccessControlMode {
    MIN = 0,

    INVALID = 0,
    READ_ONLY = 1,
    CARD_OR_PIN = 2,
    CARD_AND_PIN = 3,

    MAX = CARD_AND_PIN,
}

export class SetCardContentCommand83H implements ISoyalCommandPayload {

    public readonly userID: number;
    public readonly cardUID: number;
    public readonly offlineModePin: number;
    public readonly mode: AccessControlMode;
    public readonly enableAntiPassBack: boolean;
    public readonly timezoneID: number;
    public readonly doorGroup?: number

    public constructor(userID: number, cardUID: number, offlineModePin: number, mode: AccessControlMode,
                       enableAntiPassBack: boolean, timezoneID: number, doorGroup?: number) {
        if (userID > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (cardUID > MAX_UINT32) {
            throw new PacketFormatError("data is out of range");
        }
        if (offlineModePin > 9999) {
            throw new PacketFormatError("data is out of range");
        }
        if (mode < AccessControlMode.MIN || mode > AccessControlMode.MAX) {
            throw new PacketFormatError("data is out of range");
        }
        if (timezoneID > 11 || timezoneID < 0) {
            throw new PacketFormatError("data is out of range");
        }
        if (doorGroup && doorGroup > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.userID = userID;
        this.cardUID = cardUID;
        this.offlineModePin = offlineModePin;
        this.mode = mode;
        this.enableAntiPassBack = enableAntiPassBack;
        this.timezoneID = timezoneID;
        this.doorGroup = doorGroup;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetCardContentCommand83H> {

        let bufferConsumed = 0;
        if (buffer.length < 10) {
            throw new PacketFormatError("buffer length is too short");
        }

        const userAddress = composeUInt16MSBLSB(buffer[0], buffer[1]);
        bufferConsumed += 2;

        const siteID = composeUInt16MSBLSB(buffer[2], buffer[3]);
        bufferConsumed += 2;
        const cardID = composeUInt16MSBLSB(buffer[4], buffer[5]);
        bufferConsumed += 2;

        const cardUID = siteID << 16 + cardID;
        const offlinePin = composeUInt16MSBLSB(buffer[6], buffer[7]);
        bufferConsumed += 2;

        const mode = buffer[8] & 0b01111111;
        const enableAntiBackPass = (buffer[8] & 0b10000000) > 0;
        bufferConsumed += 1;

        const timezoneID = buffer[9];
        bufferConsumed += 1;

        let doorGroup: number | undefined;
        if (buffer.length > 10) {
            doorGroup = buffer[11];
            bufferConsumed += 1;
        }

        return {
            instance: new SetCardContentCommand83H(userAddress, cardUID, offlinePin, mode, enableAntiBackPass,
                timezoneID, doorGroup),
            bufferConsumed: bufferConsumed,
        }
    }

    public serialize(): Uint8Array {
        const uid = getBytesFromUInt32BE(this.cardUID);
        let mode = this.mode;
        if (this.enableAntiPassBack) {
            mode |= 0b10000000;
        }

        const packet = [
            ...getBytesFromUInt16BE(this.userID),
            uid[0], uid[1], // site id
            uid[2], uid[3], // card id
            ...getBytesFromUInt16BE(this.offlineModePin),
            mode,
            this.timezoneID,
        ];

        if (this.doorGroup !== undefined) {
            packet.push(this.doorGroup);
        }

        return Uint8Array.from(packet);
    }


}