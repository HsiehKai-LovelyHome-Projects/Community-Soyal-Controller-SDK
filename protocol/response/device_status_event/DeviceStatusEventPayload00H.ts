// 00H: event code; for ar721H, ar727H
// noinspection JSUnusedGlobalSymbols
import {MAX_UINT8} from "../../Commons";
import {PacketFormatError} from "../../Errors";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusEventResponse09H";

export class DeviceStatusEventPayload00H implements IDeviceStatusEventPayload {
    // data fields
    public readonly data0: number;
    public readonly data1: number;
    public readonly data2: number;
    public readonly data3: number;

    // For data0
    public static readonly MASK_KEYPAD_LOCK_UNLOCK = 0b10000000;
    public static readonly MASK_DOOR_RELAY_ON_OFF = 0b01000000;
    public static readonly MASK_ALARM_RELAY_ON_OFF = 0b00100000;
    public static readonly MASK_ARMING_ACTIVE_INACTIVE = 0b00010000;
    public static readonly MASK_ALARM_ACTIVE_INACTIVE = 0b00001000;
    // public readonly MASK_RESERVED = 0b00000100;
    public static readonly MASK_EXIT_BTN_CLOSE_OPEN = 0b00000010;
    public static readonly MASK_DOOR_SENSOR_CLOSE_OPEN = 0b00000001;

    // For data1
    public static readonly MASK_FORCED_OPEN_ALARM = 0b10000000;
    public static readonly MASK_EDITING = 0b00100000;

    // For data2
    // Device parameters (Command 20＊xxx#)

    // For data3
    public static readonly MASK_CARD_PRESENT = 0b10000000; // tag still in the RF field
    public static readonly MASK_FREE_OPEN_ZON = 0b01000000;

    public constructor(data0: number, data1: number, data2: number, data3: number) {
        if (data0 > MAX_UINT8 || data1 > MAX_UINT8 || data2 > MAX_UINT8 || data3 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.data0 = data0;
        this.data1 = data1;
        this.data2 = data2;
        this.data3 = data3;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusEventPayload00H> {
        if (buffer.length < 4) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        return {
            instance: new DeviceStatusEventPayload00H(buffer[0], buffer[1], buffer[2], buffer[3]),
            bufferConsumed: 4,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.data0, this.data1, this.data2, this.data3]);
    }
}
