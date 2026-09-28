import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

/** Valid card presented outside of its time zone. */
export class DeviceEventTimeZoneError04H extends DeviceEventInvalidCard03H {
    public constructor(fields: DeviceEventLogFields) {
        super(fields, LogEntryEventType.TIME_ZONE_ERROR);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventTimeZoneError04H> {
        return {
            instance: new DeviceEventTimeZoneError04H(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }
}
