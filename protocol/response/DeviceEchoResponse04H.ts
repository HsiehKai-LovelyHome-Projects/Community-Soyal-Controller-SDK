import {DeserializeResult} from "../Serializable";
import {ISoyalResponsePayload} from "./SoyalResponse";
import {checkUnsignedField, MAX_UINT8} from "../Commons";

/**
 * ACK. The reader ID is part of the enclosing {@link SoyalResponse}, what follows is optional:
 *
 * - H series (721H / 725H): nothing, i.e. `7E 05 00 04 <node> XOR SUM`
 * - firmware after 2009.FEB.09 (2.11 (1)) and AR-727H (1.4):
 *   [reader type] [I/O status 0] [I/O status 1 / 721Q tag bit 31~24] [parameters / tag bit 23~16]
 *   [firmware version / tag bit 15~8] [721Q tag bit 7~0]
 */
export class DeviceEchoResponse04H implements ISoyalResponsePayload {
    public static readonly MAX_LENGTH = 6;

    public readonly readerType?: number; // (For Version 6.3 and later, In old version the reader always 00H)
    public readonly ioStatus0?: number;
    public readonly ioStatus1?: number; // or (721Q) tag bit 31~24
    public readonly parameters?: number; // or (721Q) tag bit 23~16
    public readonly firmwareVersion?: number; // or (721Q) tag bit 15~8
    public readonly data4?: number; // (721Q) tag bit 7~0

    public constructor(readerType?: number, ioStatus0?: number, ioStatus1?: number, parameters?: number,
                       firmwareVersion?: number, data4?: number) {
        for (const field of [readerType, ioStatus0, ioStatus1, parameters, firmwareVersion, data4]) {
            if (field !== undefined) {
                checkUnsignedField(field, MAX_UINT8);
            }
        }

        this.readerType = readerType;
        this.ioStatus0 = ioStatus0;
        this.ioStatus1 = ioStatus1;
        this.parameters = parameters;
        this.firmwareVersion = firmwareVersion;
        this.data4 = data4;
    }

    public get isExtended(): boolean {
        return this.readerType !== undefined;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEchoResponse04H> {
        const fields = Array.from(buffer.subarray(0, DeviceEchoResponse04H.MAX_LENGTH));

        return {
            instance: new DeviceEchoResponse04H(...fields),
            bufferConsumed: fields.length,
        };
    }

    public serialize(): Uint8Array {
        const packet: number[] = [];
        for (const field of [this.readerType, this.ioStatus0, this.ioStatus1, this.parameters,
            this.firmwareVersion, this.data4]) {
            if (field === undefined) {
                break;
            }
            packet.push(field);
        }

        return Uint8Array.from(packet);
    }
}
