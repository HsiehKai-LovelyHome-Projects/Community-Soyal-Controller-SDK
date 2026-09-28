import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

/**
 * Card events: tag UID in data 14~15 (bit 31~16) and data 18~19 (bit 15~0), SOR amounts in data 20~23.
 */
export class DeviceEventInvalidCard03H extends DeviceEventLogEntry {
    public constructor(fields: DeviceEventLogFields, eventType: number = LogEntryEventType.INVALID_CARD) {
        super(eventType, fields);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventInvalidCard03H> {
        return {
            instance: new DeviceEventInvalidCard03H(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }
}
