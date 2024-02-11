import {DeserializeResult} from "../Serializable";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {ISoyalCommandPayload, SoyalCommand, SoyalCommandCode} from "./SoyalCommand";
import {GetDeviceStatusCommand18H} from "./GetDeviceStatusCommand18H";
import {GetOldestDeviceEventLogCommand25H} from "./GetOldestDeviceEventLogCommand25H";
import {PromptAcceptedMessage04H} from "./PromptAcceptedMessage04H";
import {RemoveOldestDeviceEventLogCommand37H} from "./RemoveOldestDeviceEventLogCommand37H";
import {RemoveAllDeviceEventLogCommand2DH} from "./RemoveAllDeviceEventLogCommand2DH";
import {ControlRelayCommand21H} from "./ControlRelayCommand21H";
import {ReadEEPROMResponse03H} from "../response/ReadEEPROMResponse03H";
import {WriteEEPROMCommand20H} from "./WriteEEPROMCommand20H";
import {SetCardContentCommand83H} from "./SetCardContentCommand83H";
import {WriteRTCCommand23H} from "./WriteRTCCommand23H";

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
            case SoyalCommandCode.READ_EEPROM_12H: {
                const result = ReadEEPROMResponse03H.deserialize(buffer);
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
            case SoyalCommandCode.WRITE_EEPROM_20H: {
                const result = WriteEEPROMCommand20H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            case SoyalCommandCode.CONTROL_RELAY_21H: {
                const result = ControlRelayCommand21H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            case SoyalCommandCode.WRITE_RTC_23H: {
                const result = WriteRTCCommand23H.deserialize(buffer);
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
            case SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH: {
                const result = RemoveAllDeviceEventLogCommand2DH.deserialize(buffer);
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
            case SoyalCommandCode.SET_CARD_CONTENT_83H: {
                const result = SetCardContentCommand83H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed += result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown command ID: ${commandID.toString(16)}`);
        }

        if (bufferConsumed !== bufferLength) {
            throw new PacketFormatError(`deserialization not consumed all data: ${bufferConsumed} / ${bufferLength}`);
        }

        return {
            instance: new SoyalCommand(commandID, payload),
            bufferConsumed: bufferConsumed,
        };
    }
}