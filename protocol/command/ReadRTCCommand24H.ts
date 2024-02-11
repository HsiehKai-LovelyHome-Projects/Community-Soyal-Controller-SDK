import {ISoyalCommandPayload} from "./SoyalCommand";
import {DeserializeResult} from "../Serializable";

export class ReadRTCCommand24H implements ISoyalCommandPayload {
    public constructor() {
    }

    public static deserialize(_: Uint8Array): DeserializeResult<ReadRTCCommand24H> {
        return {
            instance: new ReadRTCCommand24H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array(0);
    }
}