import {ISoyalCommandPayload} from "./SoyalCommandCode";
import {DeserializeResult} from "../Serializable";

export class GetOldestDeviceEventLogCommandPayload25H implements ISoyalCommandPayload {

    public constructor() {
    }

    public static deserialize(_: Uint8Array): DeserializeResult<GetOldestDeviceEventLogCommandPayload25H> {
        return {
            instance: new GetOldestDeviceEventLogCommandPayload25H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array([]);
    }
}