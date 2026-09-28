import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, MAX_UINT8} from "../Commons";
import {DeserializeResult} from "../Serializable";

/**
 * 2.15: [Mifare command code] [data...], refer to the AR-737U1356 protocol for the Mifare command set, e.g. 13H reads
 * the presented card. Answers are an echo (03H) or one of the echo codes of 1.4 (06H auth error, 07H no tag, ...).
 */
export class MifareComplexCommand31H implements ISoyalCommandPayload {
    public static readonly READ_CARD = 0x13;

    public readonly mifareCommand: number;
    public readonly data: Uint8Array;

    public constructor(mifareCommand: number, data: Uint8Array = new Uint8Array(0)) {
        checkUnsignedField(mifareCommand, MAX_UINT8);

        this.mifareCommand = mifareCommand;
        this.data = data;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<MifareComplexCommand31H> {
        checkBufferLength(buffer, 1);

        return {
            instance: new MifareComplexCommand31H(buffer[0], buffer.slice(1)),
            bufferConsumed: buffer.length,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.mifareCommand, ...this.data]);
    }
}
