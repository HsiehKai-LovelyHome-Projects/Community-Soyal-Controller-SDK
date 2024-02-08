import {DeserializeResult} from "../Serializable";
import {ISoyalCommandPayload} from "./SoyalCommand";

export class RemoveOldestDeviceEventLogCommand37H implements ISoyalCommandPayload {

    public constructor() {
    }

    public static deserialize(_: Uint8Array): DeserializeResult<RemoveOldestDeviceEventLogCommand37H> {
        return {
            instance: new RemoveOldestDeviceEventLogCommand37H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array(0);
    }
}