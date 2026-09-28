import {ISoyalCommandPayload} from "./SoyalCommand";
import {
    composeUInt16MSBLSB,
    composeUInt32MSBLSB,
    getBytesFromUInt16BE,
    getBytesFromUInt32BE,
    MAX_UINT16,
    MAX_UINT32,
    MAX_UINT8
} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";

/**
 * The command to open the door.
 */
export class PromptAcceptedMessage04H implements ISoyalCommandPayload {

    public readonly auxiliaryCommand?: number;
    public readonly cardUID ?: number;
    public readonly lcdCommand ?: number;
    public readonly liftStops ?: number;

    public constructor(auxiliaryCommand?: number, cardUID?: number, lcdCommand?: number, liftStops?: number) {
        if (auxiliaryCommand && auxiliaryCommand > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (cardUID && cardUID > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (lcdCommand && lcdCommand > MAX_UINT16) {
            throw new PacketFormatError("data is out of range");
        }
        if (liftStops && liftStops > MAX_UINT32) {
            throw new PacketFormatError("data is out of range");
        }

        this.auxiliaryCommand = auxiliaryCommand;
        this.cardUID = cardUID;
        this.lcdCommand = lcdCommand;
        this.liftStops = liftStops;
    }

    /**
     * Optional fields are cumulative: [SS] [UID H] [UID L] [display H] [display L] [lift LL] [LH] [HL] [HH]
     */
    public static deserialize(buffer: Uint8Array): DeserializeResult<PromptAcceptedMessage04H> {
        let auxiliaryCommand: number | undefined;
        let cardUID: number | undefined;
        let lcdCommand: number | undefined;
        let liftStops: number | undefined;
        let bufferConsumed = 0;

        if (buffer.length >= 1) {
            auxiliaryCommand = buffer[0];
            bufferConsumed = 1;
        }
        if (buffer.length >= 3) {
            cardUID = composeUInt16MSBLSB(buffer[1], buffer[2]);
            bufferConsumed = 3;
        }
        if (buffer.length >= 5) {
            lcdCommand = composeUInt16MSBLSB(buffer[3], buffer[4]);
            bufferConsumed = 5;
        }
        if (buffer.length >= 9) {
            liftStops = composeUInt32MSBLSB(buffer.subarray(5, 9));
            bufferConsumed = 9;
        }

        return {
            instance: new PromptAcceptedMessage04H(auxiliaryCommand, cardUID, lcdCommand, liftStops),
            bufferConsumed: bufferConsumed,
        }
    }

    public serialize(): Uint8Array {
        const packet: number[] = [];

        if (this.auxiliaryCommand !== undefined) {
            packet.push(this.auxiliaryCommand);
        }
        if (this.cardUID !== undefined) {
            packet.push(...getBytesFromUInt16BE(this.cardUID));
        }
        if (this.lcdCommand !== undefined) {
            packet.push(...getBytesFromUInt16BE(this.lcdCommand));
        }
        if (this.liftStops !== undefined) {
            packet.push(...getBytesFromUInt32BE(this.liftStops));
        }

        return Uint8Array.from(packet);
    }
}