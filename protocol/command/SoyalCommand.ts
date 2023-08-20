import {DeserializeResult, Serializable} from "../Serializable";
import {GetOldestDeviceEventLogCommandPayload25H} from "./GetOldestDeviceEventLogCommandPayload25H";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {GetDeviceStatusCommandPayload18H} from "./GetDeviceStatusCommandPayload18H";

export interface ISoyalCommand extends Serializable {
}

export enum SoyalCommandCode {
    GET_DEVICE_STATUS = 0x18, // event polling

    GET_OLDEST_DEVICE_EVENT_LOG = 0x25,
}

export type SoyalCommandPayload_t = GetDeviceStatusCommandPayload18H | GetOldestDeviceEventLogCommandPayload25H;

export class SoyalCommand implements ISoyalCommand {
    // data fields
    public readonly commandCode: SoyalCommandCode;
    public readonly payload: SoyalCommandPayload_t;

    public constructor(commandCode: SoyalCommandCode, payload: SoyalCommandPayload_t) {
        this.commandCode = commandCode;
        this.payload = payload;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalCommand> {
        if (buffer.length < 1) {
            throw new Error("buffer length is too short");
        }

        const commandID = buffer[0];
        buffer = buffer.subarray(1);

        let payload: SoyalCommandPayload_t;
        let bufferConsumed: number;

        switch (commandID) {
            case SoyalCommandCode.GET_DEVICE_STATUS: {
                const result = GetDeviceStatusCommandPayload18H.deserialize(buffer)
                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            case SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG: {
                const result = GetOldestDeviceEventLogCommandPayload25H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown command ID: ${commandID.toString(16)}`);
        }

        if(bufferConsumed !== buffer.length) {
            throw new PacketFormatError("deserialization not consumed all data");
        }

        return {
            instance: new SoyalCommand(commandID, payload),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.commandCode, ...this.payload.serialize()]);
    }
}

export interface ISoyalCommandPayload extends Serializable {
}