import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";

/**
 * 2.10 (AR-727H only): write ASCII text on the 4 x 16 characters LCD, answered with an ACK.
 *
 * [position 0~63] [length] [ASCII...] ([display time H] [display time L] [beeps]) — the display time (10ms unit) and
 * beeps are available from firmware 6.5.
 */
export class SetLcdTextCommand27H implements ISoyalCommandPayload {
    public static readonly COLUMNS = 16;
    public static readonly MAX_POSITION = 63;
    public static readonly MAX_BEEPS = 63;

    public readonly position: number;
    public readonly text: string;
    public readonly displayTime10ms?: number;
    public readonly beeps?: number;

    /**
     * @param position row * 16 + column
     */
    public constructor(position: number, text: string, displayTime10ms?: number, beeps?: number) {
        checkUnsignedField(position, SetLcdTextCommand27H.MAX_POSITION);
        if (!/^[\x20-\x7E]*$/.test(text)) {
            throw new PacketFormatError("only printable ASCII is supported");
        }
        if (position + text.length > SetLcdTextCommand27H.MAX_POSITION + 1) {
            throw new PacketFormatError("text overflows the display");
        }
        if (beeps !== undefined && displayTime10ms === undefined) {
            throw new PacketFormatError("beeps require a display time");
        }
        if (displayTime10ms !== undefined) {
            checkUnsignedField(displayTime10ms, MAX_UINT16);
        }
        if (beeps !== undefined) {
            checkUnsignedField(beeps, SetLcdTextCommand27H.MAX_BEEPS);
        }

        this.position = position;
        this.text = text;
        this.displayTime10ms = displayTime10ms;
        this.beeps = beeps;
    }

    public static at(row: number, column: number, text: string, displayTime10ms?: number,
                     beeps?: number): SetLcdTextCommand27H {
        return new SetLcdTextCommand27H(row * SetLcdTextCommand27H.COLUMNS + column, text, displayTime10ms, beeps);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetLcdTextCommand27H> {
        checkBufferLength(buffer, 2);
        const length = buffer[1];
        checkBufferLength(buffer, 2 + length);

        const text = String.fromCharCode(...buffer.subarray(2, 2 + length));
        let bufferConsumed = 2 + length;

        let displayTime10ms: number | undefined;
        let beeps: number | undefined;
        if (buffer.length >= bufferConsumed + 3) {
            displayTime10ms = composeUInt16MSBLSB(buffer[bufferConsumed], buffer[bufferConsumed + 1]);
            beeps = buffer[bufferConsumed + 2];
            bufferConsumed += 3;
        }

        return {
            instance: new SetLcdTextCommand27H(buffer[0], text, displayTime10ms, beeps),
            bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        const packet = [this.position, this.text.length, ...Array.from(this.text, c => c.charCodeAt(0))];
        if (this.displayTime10ms !== undefined) {
            packet.push(...getBytesFromUInt16BE(this.displayTime10ms), this.beeps ?? 0);
        }

        return Uint8Array.from(packet);
    }
}
