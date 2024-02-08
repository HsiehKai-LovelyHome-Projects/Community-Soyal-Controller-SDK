import {DeserializeResult} from "../Serializable";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {ISoyalCommandPayload, SoyalCommand, SoyalCommandCode} from "./SoyalCommand";
import {GetDeviceStatusCommand18H} from "./GetDeviceStatusCommand18H";
import {GetOldestDeviceEventLogCommand25H} from "./GetOldestDeviceEventLogCommand25H";
import {PromptAcceptedMessage04H} from "./PromptAcceptedMessage04H";
import {RemoveOldestDeviceEventLogCommand37H} from "./RemoveOldestDeviceEventLogCommand37H";

export class SoyalCommandDeserializer {
    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalCommand> {
        if (buffer.length < 1) {
            throw new Error("buffer length is too short");
        }

        const bufferLength = buffer.length;
        const commandID = buffer[0];
        let bufferConsumed: number = 1;
        buffer = buffer.subarray(1);

        let payload: ISoyalCommandPayload;

        switch (commandID) {
            case SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H: {
                const result = PromptAcceptedMessage04H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }

            case SoyalCommandCode.PROMPT_INVALID_MESSAGE_05H: {
                const result = PromptAcceptedMessage04H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }

            case SoyalCommandCode.GET_DEVICE_STATUS_18H: {
                const result = GetDeviceStatusCommand18H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            case SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG_25H: {
                const result = GetOldestDeviceEventLogCommand25H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            case SoyalCommandCode.REMOVE_OLDEST_DEVICE_EVENT_LOG_37H: {
                const result = RemoveOldestDeviceEventLogCommand37H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown command ID: ${commandID.toString(16)}`);
        }

        if (bufferConsumed !== bufferLength) {
            throw new PacketFormatError("deserialization did not consume all data");
        }

        return {
            instance: new SoyalCommand(commandID, payload),
            bufferConsumed: bufferConsumed,
        };
    }
}