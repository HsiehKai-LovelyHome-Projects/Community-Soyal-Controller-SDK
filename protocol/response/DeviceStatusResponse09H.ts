import {DeserializeResult, Serializable} from "../Serializable";
import {PacketFormatError} from "../Errors";
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
            default: {
                // e.g. 03H (card + PIN input, 2.4 examples) or 06H (727H keyboard buffer), kept raw
                event = new DeviceStatusUnknown(data.slice());
                bufferConsumed += data.length;
            }
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

/** a status event without a dedicated decoder */
export class DeviceStatusUnknown implements IDeviceStatusEventPayload {
    public constructor(public readonly data: Uint8Array) {
    }

    public serialize(): Uint8Array {
        return Uint8Array.from(this.data);
    }

    public toJSON() {
        return {data: Buffer.from(this.data).toString("hex")};
    }
}


