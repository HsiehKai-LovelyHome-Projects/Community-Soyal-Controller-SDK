// 00H: event code; for ar721H, ar727H
// noinspection JSUnusedGlobalSymbols
import {checkBufferLength, checkUnsignedField, MAX_UINT8} from "../../Commons";
import {DeserializeResult} from "../../Serializable";
import {IDeviceStatusEventPayload} from "../DeviceStatusResponse09H";
import {SoyalDeviceEvent} from "../../event_log/SoyalDeviceEvent";
import {DeviceIOStatus, DeviceParameters} from "../DeviceIOStatus";

/**
 * 2.1.2 event 00H: [I/O status 0] [I/O status 1] [device parameters] [data 3] ([oldest event log, 26 bytes])
 *
 * The oldest event log stays appended until removed by 37H. A log which can not be decoded does not fail the status:
 * its raw bytes are kept in {@link rawEventLog} with the reason in {@link eventLogError}, so it can still be reported
 * and removed.
 */
export class DeviceStatusIOStatus00H implements IDeviceStatusEventPayload {
    // data fields
    public readonly data0: number; // I/O status 0
    public readonly data1: number; // I/O status 1
    public readonly data2: number; // device parameters (20*xxx#)
    public readonly data3: number; // bit 7: card present, bit 6: in free open zone

    public readonly eventLog?: SoyalDeviceEvent;
    public readonly rawEventLog?: Uint8Array;
    public readonly eventLogError?: Error;

    public constructor(data0: number, data1: number, data2: number, data3: number, eventLog?: SoyalDeviceEvent,
                       rawEventLog?: Uint8Array, eventLogError?: Error) {
        for (const value of [data0, data1, data2, data3]) {
            checkUnsignedField(value, MAX_UINT8);
        }

        this.data0 = data0;
        this.data1 = data1;
        this.data2 = data2;
        this.data3 = data3;

        this.eventLog = eventLog;
        this.rawEventLog = rawEventLog ?? eventLog?.serialize();
        this.eventLogError = eventLogError;
    }

    public get ioStatus(): DeviceIOStatus {
        return new DeviceIOStatus(this.data0, this.data1);
    }

    public get deviceParameters(): DeviceParameters {
        return new DeviceParameters(this.data2);
    }

    public get cardPresent(): boolean {
        return (this.data3 & 0x80) !== 0;
    }

    public get inFreeOpenZone(): boolean {
        return (this.data3 & 0x40) !== 0;
    }

    /** true when an event log is appended, decodable or not */
    public get hasEventLog(): boolean {
        return this.rawEventLog !== undefined && this.rawEventLog.length > 0;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceStatusIOStatus00H> {
        checkBufferLength(buffer, 4);

        let eventLog: SoyalDeviceEvent | undefined;
        let rawEventLog: Uint8Array | undefined;
        let eventLogError: Error | undefined;
        if (buffer.length > 4) {
            rawEventLog = buffer.slice(4);
            try {
                eventLog = SoyalDeviceEvent.deserialize(rawEventLog).instance;
            } catch (err) {
                eventLogError = err instanceof Error ? err : new Error(`${err}`);
            }
        }

        return {
            instance: new DeviceStatusIOStatus00H(buffer[0], buffer[1], buffer[2], buffer[3], eventLog, rawEventLog,
                eventLogError),
            bufferConsumed: buffer.length,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.data0, this.data1, this.data2, this.data3, ...(this.rawEventLog ?? [])]);
    }

    public toJSON() {
        return {
            ioStatus: this.ioStatus.toJSON(),
            deviceParameters: this.deviceParameters.toJSON(),
            cardPresent: this.cardPresent,
            inFreeOpenZone: this.inFreeOpenZone,
            eventLog: this.eventLog?.toJSON(),
            rawEventLog: this.rawEventLog ? Buffer.from(this.rawEventLog).toString("hex") : undefined,
            eventLogError: this.eventLogError?.message,
        };
    }
}
