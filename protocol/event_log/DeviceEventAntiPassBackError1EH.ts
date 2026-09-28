import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

/** Card refused by the anti-pass-back rule. */
export class DeviceEventAntiPassBackError1EH extends DeviceEventInvalidCard03H {
    public constructor(fields: DeviceEventLogFields) {
        super(fields, LogEntryEventType.ANTI_PASS_BACK_ERROR);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventAntiPassBackError1EH> {
        return {
            instance: new DeviceEventAntiPassBackError1EH(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }
}
