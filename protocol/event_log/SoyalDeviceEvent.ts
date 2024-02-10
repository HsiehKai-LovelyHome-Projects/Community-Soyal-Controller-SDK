import {DeserializeResult, Serializable} from "../Serializable";
import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";
import {DeviceEventNormalAccess0BH} from "./DeviceEventNormalAccess0BH";
import {MAX_UINT8} from "../Commons";
import {PacketFormatError, PacketValueError} from "../Errors";
import {DeviceEventWrongPin01H} from "./DeviceEventWrongPin01H";
import {DeviceEventAccessByPin1CH} from "./DeviceEventAccessByPin1CH";

// noinspection JSUnusedGlobalSymbols
// refer to Protocol_881E_725Ev2_82xEv5+4V04.pdf::4.2 Function code define table for more detailed
export enum LogEntryEventType {
    PIN_ERROR = 0x01,
    INVALID_CARD = 0x03,

    TIME_ZONE_ERROR = 0x04,

    NORMAL_ACCESS = 0x0B,
    EGRESS = 0x10,
    ALARM_EVENT = 0x11,
    ACCESS_BY_PIN = 0x1c,
    ANTI_PASS_BACK_ERROR = 0x1E,
}

export interface IDeviceEvent extends Serializable {
}

export class SoyalDeviceEvent implements IDeviceEvent {
    // data fields
    public readonly eventType: LogEntryEventType;
    public readonly readerID: number;
    public readonly logEntry: IDeviceEventLogPayload;

    public constructor(eventType: LogEntryEventType, readerID: number, logPayload: IDeviceEventLogPayload) {
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

        buffer = buffer.subarray(2, buffer.length);
        let payload: IDeviceEventLogPayload;
        let bufferConsumed: number = 2;

        switch (eventType) {
            case LogEntryEventType.PIN_ERROR: {
                const result = DeviceEventWrongPin01H.deserialize(buffer);

                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            case LogEntryEventType.INVALID_CARD: {
                const result = DeviceEventInvalidCard03H.deserialize(buffer);

                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            case LogEntryEventType.NORMAL_ACCESS: {
                const result = DeviceEventNormalAccess0BH.deserialize(buffer);

                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            case LogEntryEventType.ACCESS_BY_PIN: {
                const result = DeviceEventAccessByPin1CH.deserialize(buffer);

                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }

            default:
                throw new PacketValueError(`unknown event log type ${eventType}`);
        }

        if (bufferConsumed !== buffer.length) {
            throw new PacketFormatError(`deserialization not consumed all data: ${bufferConsumed} / ${buffer.length}`);
        }

        return {
            instance: new SoyalDeviceEvent(eventType, readerID, payload),
            bufferConsumed: 2 /*eventType and readerID*/ + bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.eventType, this.readerID, ...this.logEntry.serialize()]);
    }
}

export interface IDeviceEventLogPayload extends Serializable {
    get eventType(): number
}