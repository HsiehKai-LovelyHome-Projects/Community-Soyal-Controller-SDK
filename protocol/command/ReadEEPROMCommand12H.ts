import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";

export class ReadEEPROMCommand12H implements ISoyalCommandPayload {
    private static MAX_BYTES_TO_READ = 32; // (721HV3/727HV3 can be up to 32 bytes at a time)

    public readonly address: number;
    public readonly numberOfBytes: number;

    public constructor(address: number, numberOfBytes: number) {
        checkUnsignedField(address, MAX_UINT16);
        checkUnsignedField(numberOfBytes, ReadEEPROMCommand12H.MAX_BYTES_TO_READ);

        this.address = address;
        this.numberOfBytes = numberOfBytes;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<ReadEEPROMCommand12H> {
        checkBufferLength(buffer, 3);

        return {
            instance: new ReadEEPROMCommand12H(composeUInt16MSBLSB(buffer[0], buffer[1]), buffer[2]),
            bufferConsumed: 3,
        }
    }


    serialize(): Uint8Array {
        return Uint8Array.from([...getBytesFromUInt16BE(this.address), this.numberOfBytes]);
    }
}
