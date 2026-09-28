import {DeserializeResult} from "../Serializable";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {ISoyalCommandPayload, SoyalCommand, SoyalCommandCode} from "./SoyalCommand";
import {GetDeviceStatusCommand18H} from "./GetDeviceStatusCommand18H";
import {GetOldestDeviceEventLogCommand25H} from "./GetOldestDeviceEventLogCommand25H";
import {PromptAcceptedMessage04H} from "./PromptAcceptedMessage04H";
import {PromptInvalidMessage05H} from "./PromptInvalidMessage05H";
import {RemoveOldestDeviceEventLogCommand37H} from "./RemoveOldestDeviceEventLogCommand37H";
import {RemoveAllDeviceEventLogCommand2DH} from "./RemoveAllDeviceEventLogCommand2DH";
import {ControlRelayCommand21H} from "./ControlRelayCommand21H";
import {WriteEEPROMCommand20H} from "./WriteEEPROMCommand20H";
import {ReadEEPROMCommand12H} from "./ReadEEPROMCommand12H";
import {SetCardContentCommand83H} from "./SetCardContentCommand83H";
import {WriteRTCCommand23H} from "./WriteRTCCommand23H";
import {ReadRTCCommand24H} from "./ReadRTCCommand24H";
import {RemoveAllEntryCards85H} from "./RemoveAllEntryCards85H";
import {PromptKeyingInPassword09H} from "./PromptKeyingInPassword09H";
import {SetLcdTextCommand27H} from "./SetLcdTextCommand27H";
import {SetTimeZoneCommand2AH} from "./SetTimeZoneCommand2AH";
import {SetHolidaysCommand2CH} from "./SetHolidaysCommand2CH";
import {PassThroughCommand30H} from "./PassThroughCommand30H";
import {MifareComplexCommand31H} from "./MifareComplexCommand31H";
import {SetNodeIDCommand80H} from "./SetNodeIDCommand80H";
import {ResetDeviceCommand81H} from "./ResetDeviceCommand81H";
import {SetDutyCodeCommand82H} from "./SetDutyCodeCommand82H";
import {StopWaitingForResponseCommand84H} from "./StopWaitingForResponseCommand84H";
import {ResetAntiPassBackCommand86H} from "./ResetAntiPassBackCommand86H";
import {GetCardContentCommand87H} from "./GetCardContentCommand87H";
import {SetExtendParametersCommand88H} from "./SetExtendParametersCommand88H";
import {InsertTagByUIDCommand89H} from "./InsertTagByUIDCommand89H";
import {DeleteTagByUIDCommand8AH} from "./DeleteTagByUIDCommand8AH";
import {LockIndicatorCommand90H} from "./LockIndicatorCommand90H";

type CommandPayloadDeserializer = (buffer: Uint8Array) => DeserializeResult<ISoyalCommandPayload>;

/**
 * Host command deserialization, mainly used to decode logged or emulated traffic.
 */
export class SoyalCommandDeserializer {
    private static readonly deserializers = new Map<number, CommandPayloadDeserializer>([
        [SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H, PromptAcceptedMessage04H.deserialize],
        [SoyalCommandCode.PROMPT_INVALID_MESSAGE_05H, PromptInvalidMessage05H.deserialize],
        [SoyalCommandCode.READ_EEPROM_12H, ReadEEPROMCommand12H.deserialize],
        [SoyalCommandCode.GET_DEVICE_STATUS_18H, GetDeviceStatusCommand18H.deserialize],
        [SoyalCommandCode.WRITE_EEPROM_20H, WriteEEPROMCommand20H.deserialize],
        [SoyalCommandCode.CONTROL_RELAY_21H, ControlRelayCommand21H.deserialize],
        [SoyalCommandCode.WRITE_RTC_23H, WriteRTCCommand23H.deserialize],
        [SoyalCommandCode.READ_RTC_24H, ReadRTCCommand24H.deserialize],
        [SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG_25H, GetOldestDeviceEventLogCommand25H.deserialize],
        [SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH, RemoveAllDeviceEventLogCommand2DH.deserialize],
        [SoyalCommandCode.REMOVE_OLDEST_DEVICE_EVENT_LOG_37H, RemoveOldestDeviceEventLogCommand37H.deserialize],
        [SoyalCommandCode.SET_CARD_CONTENT_83H, SetCardContentCommand83H.deserialize],
        [SoyalCommandCode.CLEARING_ALL_CARD_85H, RemoveAllEntryCards85H.deserialize],
        [SoyalCommandCode.PROMPT_KEYING_IN_PASSWORD_09H, PromptKeyingInPassword09H.deserialize],
        [SoyalCommandCode.SET_LCD_TEXT_27H, SetLcdTextCommand27H.deserialize],
        [SoyalCommandCode.SET_TIME_ZONE_2AH, SetTimeZoneCommand2AH.deserialize],
        [SoyalCommandCode.SET_HOLIDAYS_2CH, SetHolidaysCommand2CH.deserialize],
        [SoyalCommandCode.PASS_THROUGH_30H, PassThroughCommand30H.deserialize],
        [SoyalCommandCode.MIFARE_COMPLEX_31H, MifareComplexCommand31H.deserialize],
        [SoyalCommandCode.SET_NODE_ID_80H, SetNodeIDCommand80H.deserialize],
        [SoyalCommandCode.RESET_DEVICE_81H, ResetDeviceCommand81H.deserialize],
        [SoyalCommandCode.SET_DUTY_CODE_82H, SetDutyCodeCommand82H.deserialize],
        [SoyalCommandCode.STOP_WAITING_FOR_RESPONSE_84H, StopWaitingForResponseCommand84H.deserialize],
        [SoyalCommandCode.RESET_ANTI_PASS_BACK_86H, ResetAntiPassBackCommand86H.deserialize],
        [SoyalCommandCode.GET_CARD_CONTENT_87H, GetCardContentCommand87H.deserialize],
        [SoyalCommandCode.SET_EXTEND_PARAMETERS_88H, SetExtendParametersCommand88H.deserialize],
        [SoyalCommandCode.INSERT_TAG_BY_UID_89H, InsertTagByUIDCommand89H.deserialize],
        [SoyalCommandCode.DELETE_TAG_BY_UID_8AH, DeleteTagByUIDCommand8AH.deserialize],
        [SoyalCommandCode.LOCK_INDICATOR_90H, LockIndicatorCommand90H.deserialize],
    ]);

    public static register(commandCode: number, deserializer: CommandPayloadDeserializer) {
        SoyalCommandDeserializer.deserializers.set(commandCode, deserializer);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalCommand> {
        if (buffer.length < 1) {
            throw new PacketFormatError("buffer length is too short");
        }

        const commandID = buffer[0];
        const deserializer = SoyalCommandDeserializer.deserializers.get(commandID);
        if (!deserializer) {
            throw new UnknownProtocol(`Unknown command ID: ${commandID.toString(16)}`);
        }

        const result = deserializer(buffer.subarray(1));
        const bufferConsumed = 1 + result.bufferConsumed;

        if (bufferConsumed !== buffer.length) {
            throw new PacketFormatError(`deserialization not consumed all data: ${bufferConsumed} / ${buffer.length}`);
        }

        return {
            instance: new SoyalCommand(commandID, result.instance),
            bufferConsumed: bufferConsumed,
        };
    }
}
