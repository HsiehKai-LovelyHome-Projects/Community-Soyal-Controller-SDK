import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkUnsignedField, MAX_UINT8} from "../Commons";
import {DeserializeResult} from "../Serializable";

/**
 * 2.22: clears all users, takes about 10 seconds.
 * The option byte (bit0: normal tags, bit1: black list) is only honored by 721Q (6.6+) / 323D (6.8+).
 */
export class RemoveAllEntryCards85H implements ISoyalCommandPayload {
    public static readonly OPTION_NORMAL_TAGS = 0b01;
    public static readonly OPTION_BLACK_LIST = 0b10;

    public readonly option?: number;

    public constructor(option?: number) {
        if (option !== undefined) {
            checkUnsignedField(option, MAX_UINT8);
        }

        this.option = option;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<RemoveAllEntryCards85H> {
        return {
            instance: new RemoveAllEntryCards85H(buffer.length > 0 ? buffer[0] : undefined),
            bufferConsumed: buffer.length > 0 ? 1 : 0,
        }
    }

    serialize(): Uint8Array {
        return this.option === undefined ? new Uint8Array(0) : Uint8Array.from([this.option]);
    }
}
