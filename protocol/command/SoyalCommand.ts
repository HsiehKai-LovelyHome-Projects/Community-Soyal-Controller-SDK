import {Serializable} from "../Serializable";

export interface ISoyalCommand extends Serializable {
}

export enum SoyalCommandCode {
    PROMPT_ACCEPTED_MESSAGE_04H = 0x04, // open door
    PROMPT_INVALID_MESSAGE_05H = 0x05, // deny open door

    READ_EEPROM_12H = 0x12,
    GET_DEVICE_STATUS_18H = 0x18, // event polling

    WRITE_EEPROM_20H = 0x20,
    CONTROL_RELAY_21H = 0x21,
    GET_OLDEST_DEVICE_EVENT_LOG_25H = 0x25,

    REMOVE_OLDEST_DEVICE_EVENT_LOG_37H = 0x37,
    REMOVE_ALL_DEVICE_EVENT_LOG_2DH = 0x2d,

    SET_CARD_CONTENT_83H = 0x83
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