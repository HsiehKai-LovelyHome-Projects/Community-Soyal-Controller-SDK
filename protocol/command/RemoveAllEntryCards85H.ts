import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkUnsignedField, MAX_UINT8} from "../Commons";
import {DeserializeResult} from "../Serializable";

export class RemoveAllEntryCards85H implements ISoyalCommandPayload {
    public readonly option: number;

    public constructor(option: number) {
        checkUnsignedField(option, MAX_UINT8);

        this.option = option;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<RemoveAllEntryCards85H> {
        return {
            instance: new RemoveAllEntryCards85H(buffer[0]),
            bufferConsumed: 0,
        }
    }

    serialize(): Uint8Array {
        return Uint8Array.from([this.option]);
    }
}
