// 00H: event code; for ar721H, ar727H
// noinspection JSUnusedGlobalSymbols
import {MAX_UINT8} from "../../Commons";
import {PacketFormatError} from "../../Errors";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusResponse09H";
import {IDeviceEvent, SoyalDeviceEvent} from "../../event_log/SoyalDeviceEvent";

export class DeviceStatusIOStatus00H implements IDeviceStatusEventPayload {
    // data fields
    public readonly data0: number;
    public readonly data1: number;
    public readonly data2: number;
    public readonly data3: number;

    public readonly eventLog?: SoyalDeviceEvent;

    public constructor(data0: number, data1: number, data2: number, data3: number, eventLog?: SoyalDeviceEvent) {
        if (data0 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data1 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data2 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data3 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.data0 = data0;
        this.data1 = data1;
        this.data2 = data2;
        this.data3 = data3;

        this.eventLog = eventLog;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusIOStatus00H> {
        if (buffer.length < 4) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        const data0 = buffer[0];
        const data1 = buffer[1];
        const data2 = buffer[2];
        const data3 = buffer[3];

        let eventLog: SoyalDeviceEvent | undefined;
        let eventLogBufferConsumed = 0
        if (buffer.length > 4) {
            const deserialized = SoyalDeviceEvent.deserialize(buffer.subarray(4));
            eventLog = deserialized.instance;
            eventLogBufferConsumed = deserialized.bufferConsumed;
        }


        return {
            instance: new DeviceStatusIOStatus00H(data0, data1, data2, data3, eventLog),
            bufferConsumed: 4 + eventLogBufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.data0, this.data1, this.data2, this.data3, ...(this.eventLog?.serialize() ?? [])]);
    }
}
