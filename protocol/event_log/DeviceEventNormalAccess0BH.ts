import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";
import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./SoyalDeviceEvent";

export class DeviceEventNormalAccess0BH extends DeviceEventInvalidCard03H {

    get eventType(): number {
        return LogEntryEventType.NORMAL_ACCESS;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventNormalAccess0BH> {
        return DeviceEventInvalidCard03H.deserialize(buffer) as DeserializeResult<DeviceEventNormalAccess0BH>;
    }
}