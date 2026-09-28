import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField} from "../Commons";
import {DeserializeResult} from "../Serializable";

/**
 * 2.14: [length] [data...] (max. 10 bytes), answered with an ACK.
 *
 * AR-721H: the data is sent on the TTL serial port, e.g. a command for an AR-401RO16 relay board.
 * AR-727H: the data is a bitmap pattern for the LCD (firmware 4.4+).
 */
export class PassThroughCommand30H implements ISoyalCommandPayload {
    public static readonly MAX_LENGTH = 10;

    public readonly data: Uint8Array;

    public constructor(data: Uint8Array) {
        checkUnsignedField(data.length, PassThroughCommand30H.MAX_LENGTH);
        this.data = data;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<PassThroughCommand30H> {
        checkBufferLength(buffer, 1);
        checkBufferLength(buffer, 1 + buffer[0]);

        return {
            instance: new PassThroughCommand30H(buffer.slice(1, 1 + buffer[0])),
            bufferConsumed: 1 + buffer[0],
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.data.length, ...this.data]);
    }
}
