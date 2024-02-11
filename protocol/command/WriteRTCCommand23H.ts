import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, timestamp2SoyalFormat, timestampFromSoyalFormat} from "../Commons";
import {DeserializeResult} from "../Serializable";

export class WriteRTCCommand23H implements ISoyalCommandPayload {
    public readonly time: Date;

    public constructor(time: Date) {
        this.time = time;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<WriteRTCCommand23H> {
        checkBufferLength(buffer, 7);

        return {
            instance: new WriteRTCCommand23H(timestampFromSoyalFormat(buffer)),
            bufferConsumed: 7,
        }
    }


    public serialize(): Uint8Array {
        return Uint8Array.from(timestamp2SoyalFormat(this.time));
    }

}