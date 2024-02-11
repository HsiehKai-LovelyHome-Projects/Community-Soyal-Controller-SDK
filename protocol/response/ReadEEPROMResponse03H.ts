import {ISoyalResponsePayload} from "./SoyalResponse";
import {DeserializeResult} from "../Serializable";

export class ReadEEPROMResponse03H implements ISoyalResponsePayload {

    public readonly data: Uint8Array;

    public constructor(data: Uint8Array) {
        this.data = data;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<ReadEEPROMResponse03H> {
        return {
            instance: new ReadEEPROMResponse03H(Uint8Array.from(buffer)),
            bufferConsumed: buffer.length,
        }
    }

    public serialize(): Uint8Array {
        return Uint8Array.from(this.data);
    }

}