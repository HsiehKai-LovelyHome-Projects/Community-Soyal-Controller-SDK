import {DeserializeResult, Serializable} from "../Serializable";
import {checkBufferLength, checkUnsignedField, MAX_UINT8} from "../Commons";
import {PacketFormatError} from "../Errors";
import {IDeviceEventLogPayload, LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventLogEntry} from "./DeviceEventLogEntry";
import {DeviceEventWrongPin01H} from "./DeviceEventWrongPin01H";
import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";
import {DeviceEventTimeZoneError04H} from "./DeviceEventTimeZoneError04H";
import {DeviceEventNormalAccess0BH} from "./DeviceEventNormalAccess0BH";
import {DeviceEventEgress10H} from "./DeviceEventEgress10H";
import {DeviceEventAlarm11H} from "./DeviceEventAlarm11H";
import {DeviceEventAccessByPin1CH} from "./DeviceEventAccessByPin1CH";
import {DeviceEventAntiPassBackError1EH} from "./DeviceEventAntiPassBackError1EH";

export {IDeviceEventLogPayload, LogEntryEventType};

export interface IDeviceEvent extends Serializable {
}

type EventLogDeserializer = (buffer: Uint8Array) => DeserializeResult<DeviceEventLogEntry>;

/**
 * An event log entry: [event code] [reader ID] [24 bytes body], 26 bytes in total (2.11).
 */
export class SoyalDeviceEvent implements IDeviceEvent {
    public static readonly LENGTH = 2 + DeviceEventLogEntry.LENGTH;

    private static readonly deserializers = new Map<number, EventLogDeserializer>([
        [LogEntryEventType.PIN_ERROR, DeviceEventWrongPin01H.deserialize],
        [LogEntryEventType.INVALID_CARD, DeviceEventInvalidCard03H.deserialize],
        [LogEntryEventType.TIME_ZONE_ERROR, DeviceEventTimeZoneError04H.deserialize],
        [LogEntryEventType.NORMAL_ACCESS, DeviceEventNormalAccess0BH.deserialize],
        [LogEntryEventType.EGRESS, DeviceEventEgress10H.deserialize],
        [LogEntryEventType.ALARM_EVENT, DeviceEventAlarm11H.deserialize],
        [LogEntryEventType.ACCESS_BY_PIN, DeviceEventAccessByPin1CH.deserialize],
        [LogEntryEventType.ANTI_PASS_BACK_ERROR, DeviceEventAntiPassBackError1EH.deserialize],
    ]);

    // data fields
    public readonly eventType: LogEntryEventType | number;
    public readonly readerID: number;
    public readonly logEntry: DeviceEventLogEntry;

    public constructor(eventType: LogEntryEventType | number, readerID: number, logPayload: DeviceEventLogEntry) {
        checkUnsignedField(eventType, MAX_UINT8);
        checkUnsignedField(readerID, MAX_UINT8);

        this.eventType = eventType;
        this.readerID = readerID;
        this.logEntry = logPayload;
    }

    /** false for event codes without a dedicated class, the entry is then a plain {@link DeviceEventLogEntry} */
    public get isKnownEventType(): boolean {
        return SoyalDeviceEvent.deserializers.has(this.eventType);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalDeviceEvent> {
        checkBufferLength(buffer, SoyalDeviceEvent.LENGTH);
        if (buffer.length !== SoyalDeviceEvent.LENGTH) {
            throw new PacketFormatError(`an event log entry is ${SoyalDeviceEvent.LENGTH} bytes, got ${buffer.length}`);
        }

        const eventType = buffer[0];
        const readerID = buffer[1];
        const body = buffer.subarray(2);

        const deserializer = SoyalDeviceEvent.deserializers.get(eventType);
        const result = deserializer ? deserializer(body) : DeviceEventLogEntry.deserializeAs(eventType, body);

        return {
            instance: new SoyalDeviceEvent(eventType, readerID, result.instance),
            bufferConsumed: 2 + result.bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.eventType, this.readerID, ...this.logEntry.serialize()]);
    }

    public toJSON() {
        return {...this.logEntry.toJSON(), reportedByReaderID: this.readerID};
    }
}
