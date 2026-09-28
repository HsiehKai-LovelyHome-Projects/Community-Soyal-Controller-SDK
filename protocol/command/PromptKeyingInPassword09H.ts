import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";

/**
 * 2.4: answer to a card event asking the user to key in the PIN (card + PIN in networking mode). Four beeps, the
 * number is shown as 5 digits on the LCD (AR-727H only). Unresponsive command.
 *
 * [0x40] [0x00] [0x00] [number H] [number L]
 */
export class PromptKeyingInPassword09H implements ISoyalCommandPayload {
    private static readonly DATA0 = 0x40;
    private static readonly LENGTH = 5;

    public readonly displayNumber: number;

    public constructor(displayNumber: number = 0) {
        checkUnsignedField(displayNumber, MAX_UINT16);
        this.displayNumber = displayNumber;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<PromptKeyingInPassword09H> {
        checkBufferLength(buffer, PromptKeyingInPassword09H.LENGTH);

        return {
            instance: new PromptKeyingInPassword09H(composeUInt16MSBLSB(buffer[3], buffer[4])),
            bufferConsumed: PromptKeyingInPassword09H.LENGTH,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([PromptKeyingInPassword09H.DATA0, 0x00, 0x00, ...getBytesFromUInt16BE(this.displayNumber)]);
    }
}
