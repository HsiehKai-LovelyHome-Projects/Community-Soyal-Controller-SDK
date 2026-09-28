import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, getBytesFromUInt16BE, MAX_UINT16, MAX_UINT8} from "../Commons";
import {DeserializeResult} from "../Serializable";

/**
 * 2.7.1, the reader answers with an echo (03H): [firmware version] [I/O status 0] [I/O status 1] [20*xxx#]
 */
export enum RelayControlParameter {
    GET_IO_STATUS = 0x00,
    LOCK_KEYPAD = 0x01, // data 1: 1/0 lock/unlock, 6V2 or above
    CARD_INTERVAL = 0x02, // data 1~2: interval between card flashing in 10ms, 6V2 or above

    ARM = 0x80,
    DISARM = 0x81,
    DOOR_RELAY_ON = 0x82,
    DOOR_RELAY_OFF = 0x83,
    DOOR_RELAY_PULSE = 0x84, // on for the door relay time (EEPROM 12~13H), then off
    ALARM_RELAY_ON = 0x85,
    ALARM_RELAY_OFF = 0x86,
    ALARM_RELAY_PULSE = 0x87, // on for the alarm relay time (EEPROM 14~15H), then off
    DIGITAL_OUTPUT_ON = 0x88, // 721W / 721Q, data 1: output bit mask
    DIGITAL_OUTPUT_OFF = 0x89, // 721W / 721Q, data 1: output bit mask
}

export class ControlRelayCommand21H implements ISoyalCommandPayload {
    public readonly data: RelayControlParameter;
    public readonly extraData: Uint8Array;

    public constructor(data: RelayControlParameter, extraData: Uint8Array = new Uint8Array(0)) {
        checkUnsignedField(data, MAX_UINT8);

        this.data = data;
        this.extraData = extraData;
    }

    public static lockKeypad(locked: boolean): ControlRelayCommand21H {
        return new ControlRelayCommand21H(RelayControlParameter.LOCK_KEYPAD, Uint8Array.of(locked ? 1 : 0));
    }

    public static cardInterval(interval10ms: number): ControlRelayCommand21H {
        checkUnsignedField(interval10ms, MAX_UINT16);
        return new ControlRelayCommand21H(RelayControlParameter.CARD_INTERVAL,
            Uint8Array.from(getBytesFromUInt16BE(interval10ms)));
    }

    public static digitalOutput(on: boolean, outputMask: number): ControlRelayCommand21H {
        checkUnsignedField(outputMask, MAX_UINT8);
        return new ControlRelayCommand21H(
            on ? RelayControlParameter.DIGITAL_OUTPUT_ON : RelayControlParameter.DIGITAL_OUTPUT_OFF,
            Uint8Array.of(outputMask));
    }

    public static deserialize(payload: Uint8Array): DeserializeResult<ControlRelayCommand21H> {
        checkBufferLength(payload, 1);

        return {
            instance: new ControlRelayCommand21H(payload[0], payload.slice(1)),
            bufferConsumed: payload.length,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.data, ...this.extraData]);
    }

}
