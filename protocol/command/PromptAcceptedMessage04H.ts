import {ISoyalCommandPayload} from "./SoyalCommand";
import {getBytesFromUInt16BE, getBytesFromUInt32BE, MAX_UINT16, MAX_UINT32, MAX_UINT8} from "../Commons";
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

    public static deserialize(_: Uint8Array): DeserializeResult<PromptAcceptedMessage04H> {
        // TODO add AR727 support

        return {
            instance: new PromptAcceptedMessage04H(),
            bufferConsumed: 0,
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