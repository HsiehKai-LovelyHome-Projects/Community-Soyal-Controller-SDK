import {Serializable} from "../Serializable";

export interface ISoyalCommand extends Serializable {
}

export enum SoyalCommandCode {
    PROMPT_ACCEPTED_MESSAGE_04H = 0x04, // open door
    PROMPT_INVALID_MESSAGE_05H = 0x05, // deny open door
    PROMPT_KEYING_IN_PASSWORD_09H = 0x09,

    READ_EEPROM_12H = 0x12,
    GET_DEVICE_STATUS_18H = 0x18, // event polling

    WRITE_EEPROM_20H = 0x20,
    CONTROL_RELAY_21H = 0x21,
    WRITE_RTC_23H = 0x23,
    READ_RTC_24H = 0x24,
    GET_OLDEST_DEVICE_EVENT_LOG_25H = 0x25,
    SET_LCD_TEXT_27H = 0x27, // AR-727H only
    SET_TIME_ZONE_2AH = 0x2a,
    SET_HOLIDAYS_2CH = 0x2c,
    REMOVE_ALL_DEVICE_EVENT_LOG_2DH = 0x2d,

    PASS_THROUGH_30H = 0x30, // AR-721H: TTL serial port, AR-727H: LCD bitmap
    MIFARE_COMPLEX_31H = 0x31,
    REMOVE_OLDEST_DEVICE_EVENT_LOG_37H = 0x37,

    SET_NODE_ID_80H = 0x80,
    RESET_DEVICE_81H = 0x81,
    SET_DUTY_CODE_82H = 0x82,
    SET_CARD_CONTENT_83H = 0x83,
    STOP_WAITING_FOR_RESPONSE_84H = 0x84,
    CLEARING_ALL_CARD_85H = 0x85,
    RESET_ANTI_PASS_BACK_86H = 0x86,
    GET_CARD_CONTENT_87H = 0x87,
    SET_EXTEND_PARAMETERS_88H = 0x88,
    INSERT_TAG_BY_UID_89H = 0x89, // 721Q only
    DELETE_TAG_BY_UID_8AH = 0x8a, // 721Q only
    LOCK_INDICATOR_90H = 0x90, // AR-727H only
}

export class SoyalCommand implements ISoyalCommand {
    // data fields
    public readonly commandCode: SoyalCommandCode;
    public readonly commandPayload: ISoyalCommandPayload;

    public constructor(commandCode: SoyalCommandCode, commandPayload: ISoyalCommandPayload) {
        this.commandCode = commandCode;
        this.commandPayload = commandPayload;
    }

    public serialize(): Uint8Array {
        return new Uint8Array([this.commandCode, ...this.commandPayload.serialize()]);
    }
}

export interface ISoyalCommandPayload extends Serializable {
}