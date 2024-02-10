import {DeserializeResult} from "../Serializable";
import {ISoyalCommandPayload} from "./SoyalCommand";

export class RemoveAllDeviceEventLogCommand2DH implements ISoyalCommandPayload {

    public constructor() {
    }

    public static deserialize(_: Uint8Array): DeserializeResult<RemoveAllDeviceEventLogCommand2DH> {
        return {
            instance: new RemoveAllDeviceEventLogCommand2DH(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array(0);
    }
}