import {DeserializeResult, Serializable} from "../Serializable";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {ISoyalResponsePayload} from "./SoyalResponse";
import {SoyalDeviceEvent} from "../event_log/SoyalDeviceEvent";
import {DeviceStatusEventPayload00H} from "./device_status_event/DeviceStatusEventPayload00H";
import {DeviceStatusEventPayload01H} from "./device_status_event/DeviceStatusEventPayload01H";
import {DeviceStatusEventPayload02H} from "./device_status_event/DeviceStatusEventPayload02H";

type DeviceEventPayload_t = DeviceStatusEventPayload00H | DeviceStatusEventPayload01H | DeviceStatusEventPayload02H;

// noinspection JSUnusedGlobalSymbols
export enum DeviceStatusEventType {
    AR721H = 0x0,
    AR727H = 0x0,

    AR721W = 0x81,
    AR721D = 0x82,
    AR721Q = 0x83,

    PIN_PAD = 0x1, // Keypad Status of the Device
    NEW_CARD = 0x2, // Card Present Status of the Device
}

export class DeviceStatusEventResponse09H implements ISoyalResponsePayload {

    public readonly event: DeviceEventPayload_t;
    public readonly deviceLog ?: SoyalDeviceEvent;

    public constructor(event: DeviceEventPayload_t, deviceEventLog ?: SoyalDeviceEvent) {
        this.event = event;
        this.deviceLog = deviceEventLog;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusEventResponse09H> {
        if (buffer.length < 1) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        const eventType = buffer[0];

        let data = buffer.subarray(1);
        let event: DeviceEventPayload_t;
        let eventDataLength: number;

        switch (eventType) {
            case DeviceStatusEventType.AR721H: {
                const result = DeviceStatusEventPayload00H.deserialize(data);
                event = result.instance;
                eventDataLength = result.bufferConsumed;
                break;
            }
            case DeviceStatusEventType.PIN_PAD: {
                const result = DeviceStatusEventPayload01H.deserialize(data);
                event = result.instance;
                eventDataLength = result.bufferConsumed;
                break;
            }
            case DeviceStatusEventType.NEW_CARD: {
                const result = DeviceStatusEventPayload02H.deserialize(data);
                event = result.instance;
                eventDataLength = result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown event type: ${eventType}`);
        }

        data = buffer.slice(eventDataLength);

        let eventLog: SoyalDeviceEvent | undefined;
        if (data.length > 0) {
            const result = SoyalDeviceEvent.deserialize(data);

            eventLog = result.instance;
            data = data.slice(result.bufferConsumed);
        }

        return {
            instance: new DeviceStatusEventResponse09H(event, eventLog),
            bufferConsumed: buffer.length - data.length,
        };
    }

    public serialize(): Uint8Array {
        if (this.deviceLog) {
            return Uint8Array.from([...this.event.serialize(), ...this.deviceLog.serialize()]);
        }

        return this.event.serialize();
    }
}

export interface IDeviceStatusEventPayload extends Serializable {
}


