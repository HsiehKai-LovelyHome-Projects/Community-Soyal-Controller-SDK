import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";

export class WriteEEPROMCommand20H implements ISoyalCommandPayload {
    private static MAX_BYTES_TO_WRITE = 32; // (721HV3/727HV3 can be up to 32 bytes at a time)

    public readonly address: number;
    public readonly bytes: Uint8Array;

    public constructor(address: number, bytes: Uint8Array) {
        checkUnsignedField(address, MAX_UINT16);
        checkUnsignedField(bytes.length, WriteEEPROMCommand20H.MAX_BYTES_TO_WRITE);

        this.address = address;
        this.bytes = bytes;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<WriteEEPROMCommand20H> {
        // [addr H] [addr L] [number of bytes] [data...]
        checkBufferLength(buffer, 3);
        const numberOfBytes = buffer[2];

        checkBufferLength(buffer, 3 + numberOfBytes);
        const data = buffer.slice(3, 3 + numberOfBytes);

        return {
            instance: new WriteEEPROMCommand20H(composeUInt16MSBLSB(buffer[0], buffer[1]), data),
            bufferConsumed: 3 + numberOfBytes,
        }
    }


    serialize(): Uint8Array {
        return Uint8Array.from([...getBytesFromUInt16BE(this.address), this.bytes.length, ...this.bytes]);
    }
}
