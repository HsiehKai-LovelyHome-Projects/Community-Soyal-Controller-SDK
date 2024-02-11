import {
    checkBufferLength,
    checkUnsignedField,
    composeUInt16MSBLSB,
    getBytesFromUInt16BE,
    MAX_UINT16,
    MAX_UINT8,
    timestamp2SoyalFormat, timestampFromSoyalFormat
} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {DeviceEchoResponse03H} from "./DeviceEchoResponse03H";
import {ISoyalCommandPayload} from "../command/SoyalCommand";

export class ReadRTCResponse implements ISoyalCommandPayload {
    public readonly timestamp: Date;
    public readonly firmwareVersion: number;
    public readonly doorNumber: number;
    public readonly firmwareIdentityCode: number;
    public readonly readerType: number;

    public constructor(timestamp: Date, firmwareVersion: number, doorNumber: number,
                       firmwareIdentityCode: number, readerType: number) {
        checkUnsignedField(firmwareVersion, MAX_UINT8);
        checkUnsignedField(doorNumber, MAX_UINT16);
        checkUnsignedField(firmwareIdentityCode, MAX_UINT8);
        checkUnsignedField(readerType, MAX_UINT8);

        this.timestamp = timestamp;
        this.firmwareVersion = firmwareVersion;
        this.doorNumber = doorNumber;
        this.firmwareIdentityCode = firmwareIdentityCode;
        this.readerType = readerType;
    }

    public static deserialize(response: DeviceEchoResponse03H): DeserializeResult<ReadRTCResponse> {
        const buffer = response.data;
        checkBufferLength(buffer, 12);

        const timestamp = timestampFromSoyalFormat(buffer);

        return {
            instance: new ReadRTCResponse(timestamp,
                buffer[7],
                composeUInt16MSBLSB(buffer[8], buffer[9]),
                buffer[10], buffer[11],
            ),
            bufferConsumed: 12,
        }
    }

    serialize(): Uint8Array {
        return Uint8Array.from([
            ...timestamp2SoyalFormat(this.timestamp),
            this.firmwareVersion,
            ...getBytesFromUInt16BE(this.doorNumber),
            this.firmwareIdentityCode,
            this.readerType,
        ]);
    }
}