import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

/** Door opened by the exit button (request to exit), card fields are meaningless. */
export class DeviceEventEgress10H extends DeviceEventLogEntry {
    public constructor(fields: DeviceEventLogFields) {
        super(LogEntryEventType.EGRESS, fields);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventEgress10H> {
        return {
            instance: new DeviceEventEgress10H(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }
}
