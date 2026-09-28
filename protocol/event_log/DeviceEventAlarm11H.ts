import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

/** Alarm, e.g. door forced open, card fields are meaningless. */
export class DeviceEventAlarm11H extends DeviceEventLogEntry {
    public constructor(fields: DeviceEventLogFields) {
        super(LogEntryEventType.ALARM_EVENT, fields);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventAlarm11H> {
        return {
            instance: new DeviceEventAlarm11H(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }
}
