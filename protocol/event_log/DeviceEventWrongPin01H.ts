import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventLogEntry, DeviceEventLogFields} from "./DeviceEventLogEntry";

/**
 * PIN events: the entered PIN lives in data 22~23 (not listed in the manual, observed on the device).
 */
export class DeviceEventWrongPin01H extends DeviceEventLogEntry {
    public constructor(fields: DeviceEventLogFields, eventType: number = LogEntryEventType.PIN_ERROR) {
        super(eventType, fields);
    }

    public get enteredPin(): number {
        return this.data22_23;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventWrongPin01H> {
        return {
            instance: new DeviceEventWrongPin01H(DeviceEventLogEntry.parseFields(buffer)),
            bufferConsumed: DeviceEventLogEntry.LENGTH,
        };
    }

    public toJSON() {
        return {...super.toJSON(), enteredPin: this.enteredPin};
    }
}
