import {DeserializeResult} from "../Serializable";
import {SoyalCommand, SoyalCommandCode} from "./SoyalCommand";

export class GetOldestDeviceEventLogCommand25H extends SoyalCommand {

    public constructor() {
        super(SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG_25H);
    }

    public static deserialize(_: Uint8Array): DeserializeResult<GetOldestDeviceEventLogCommand25H> {
        return {
            instance: new GetOldestDeviceEventLogCommand25H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return super.serialize();
    }

    public handleResponse(data: Uint8Array): void {
    }
}