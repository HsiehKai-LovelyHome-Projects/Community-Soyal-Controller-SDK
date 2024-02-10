import {DeserializeResult, Serializable} from "../Serializable";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {ISoyalResponsePayload} from "./SoyalResponse";
import {DeviceStatusIOStatus00H} from "./device_status_event/DeviceStatusIOStatus00H";
import {DeviceIOEventKeyPadPressed01H} from "./device_status_event/DeviceStatusKeyPadPressed01H";
import {DeviceStatusNewCardPresent02H} from "./device_status_event/DeviceStatusNewCardPresent02H";

// noinspection JSUnusedGlobalSymbols
export enum DeviceStatusType {
    AR721H = 0x0,
    AR727H = 0x0,

    AR721W = 0x81,
    AR721D = 0x82,
    AR721Q = 0x83,

    PIN_PAD = 0x1, // Keypad Status of the Device
    NEW_CARD = 0x2, // Card Present Status of the Device
}

export class DeviceStatusResponse09H implements ISoyalResponsePayload {

    public readonly statusType: DeviceStatusType;
    public readonly deviceStatus: IDeviceStatusEventPayload;

    public constructor(statusType: DeviceStatusType, deviceStatus: IDeviceStatusEventPayload) {
        this.statusType = statusType;
        this.deviceStatus = deviceStatus;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusResponse09H> {
        const incomingBufferLength = buffer.length;
        if (incomingBufferLength < 1) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        const eventType = buffer[0];

        let data = buffer.subarray(1);
        let event: IDeviceStatusEventPayload;
        let bufferConsumed: number = 1;


        switch (eventType) {
            case DeviceStatusType.AR721H:
            case DeviceStatusType.AR727H:
            case DeviceStatusType.AR721W:
            case DeviceStatusType.AR721D:
            case DeviceStatusType.AR721Q: {
                const result = DeviceStatusIOStatus00H.deserialize(data);
                event = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            case DeviceStatusType.PIN_PAD: {
                const result = DeviceIOEventKeyPadPressed01H.deserialize(data);
                event = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            case DeviceStatusType.NEW_CARD: {
                const result = DeviceStatusNewCardPresent02H.deserialize(data);
                event = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown event type: ${eventType}`);
        }

        return {
            instance: new DeviceStatusResponse09H(eventType, event),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        let packet = [this.statusType, ...this.deviceStatus.serialize()];
        return Uint8Array.from(packet);
    }
}

export interface IDeviceStatusEventPayload extends Serializable {
}


