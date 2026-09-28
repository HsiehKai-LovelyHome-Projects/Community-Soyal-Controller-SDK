import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventWrongPin01H} from "./DeviceEventWrongPin01H";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

export class DeviceEventAccessByPin1CH extends DeviceEventWrongPin01H {
    public constructor(fields: DeviceEventLogFields) {
        super(fields, LogEntryEventType.ACCESS_BY_PIN);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventAccessByPin1CH> {
        return {
            instance: new DeviceEventAccessByPin1CH(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }
}
