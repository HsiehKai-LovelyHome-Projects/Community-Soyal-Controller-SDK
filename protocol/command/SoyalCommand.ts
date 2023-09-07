import {DeserializeResult, Serializable} from "../Serializable";
import {GetOldestDeviceEventLogCommand25H} from "./GetOldestDeviceEventLogCommand25H";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {GetDeviceStatusCommand18H} from "./GetDeviceStatusCommand18H";

export interface ISoyalCommand extends Serializable {
    handleResponse(data: Uint8Array): void;
}

export enum SoyalCommandCode {
    GET_DEVICE_STATUS_18H = 0x18, // event polling

    GET_OLDEST_DEVICE_EVENT_LOG_25H = 0x25,
}

export type SoyalCommandPayload_t = GetDeviceStatusCommand18H | GetOldestDeviceEventLogCommand25H;

export abstract class SoyalCommand implements ISoyalCommand {
    // data fields
    public readonly commandCode: SoyalCommandCode;

    protected constructor(commandCode: SoyalCommandCode) {
        this.commandCode = commandCode;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalCommandPayload_t> {
        if (buffer.length < 1) {
            throw new Error("buffer length is too short");
        }

        const commandID = buffer[0];

        let instance: SoyalCommandPayload_t;
        let bufferConsumed: number;

        switch (commandID) {
            case SoyalCommandCode.GET_DEVICE_STATUS_18H: {
                const result = GetDeviceStatusCommand18H.deserialize(buffer)
                instance = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            case SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG_25H: {
                const result = GetOldestDeviceEventLogCommand25H.deserialize(buffer);
                instance = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown command ID: ${commandID.toString(16)}`);
        }

        if (bufferConsumed !== buffer.length) {
            throw new PacketFormatError("deserialization did not consume all data");
        }

        return {
            instance: instance,
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return new Uint8Array([this.commandCode]);
    }

    public abstract handleResponse(data: Uint8Array): void;
}