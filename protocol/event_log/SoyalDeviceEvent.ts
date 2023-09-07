import {DeserializeResult, Serializable} from "../Serializable";
import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";
import {DeviceEventNormalAccess0BH} from "./DeviceEventNormalAccess0BH";
import {MAX_UINT8} from "../Commons";
import {PacketFormatError, PacketValueError} from "../Errors";

export type DeviceEventLog_t = DeviceEventInvalidCard03H | DeviceEventNormalAccess0BH;

// noinspection JSUnusedGlobalSymbols
export enum LogEntryEventType {
    PIN_ERROR = 0x01,
    INVALID_CARD = 0x03,

    TIME_ZONE_ERROR = 0x04,

    NORMAL_ACCESS = 0x0B,
    EGRESS = 0x10,
    ALARM_EVENT = 0x11,
    ANTI_PASS_BACK_ERROR = 0x1E,
}

export interface IDeviceEvent extends Serializable {
}

export class SoyalDeviceEvent implements IDeviceEvent {
    // data fields
    public readonly eventType: LogEntryEventType;
    public readonly readerID: number;
    public readonly logEntry: DeviceEventLog_t;

    public constructor(eventType: LogEntryEventType, readerID: number, logPayload: DeviceEventLog_t) {
        if (eventType > MAX_UINT8 || readerID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.eventType = eventType;
        this.readerID = readerID;
        this.logEntry = logPayload;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalDeviceEvent> {
        if (buffer.length < 2) {
            throw new PacketFormatError("buffer length is too short");
        }

        const eventType = buffer[0];
        const readerID = buffer[1];

        const logPayloadBuffer = buffer.subarray(2);
        let payload: DeviceEventLog_t;
        let bufferConsumed: number;

        switch (eventType) {
            case LogEntryEventType.INVALID_CARD: {
                const result = DeviceEventInvalidCard03H.deserialize(logPayloadBuffer);

                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            case LogEntryEventType.NORMAL_ACCESS: {
                const result = DeviceEventNormalAccess0BH.deserialize(logPayloadBuffer);

                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            default:
                throw new PacketValueError(`unknown event log type ${eventType}`);
        }

        if (bufferConsumed !== buffer.length) {
            throw new PacketFormatError("deserialization not consumed all data");
        }

        return {
            instance: new SoyalDeviceEvent(eventType, readerID, payload),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.eventType, this.readerID, ...this.logEntry.serialize()]);
    }
}

export interface IDeviceEventLogPayload extends Serializable {
}