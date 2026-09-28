import {DeserializeResult, Serializable} from "../Serializable";
import {DeviceStatusResponse09H} from "./DeviceStatusResponse09H";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {checkBufferLength, MAX_UINT8} from "../Commons";
import {DeviceEchoResponse05H} from "./DeviceEchoResponse05H";
import {DeviceEchoResponse04H} from "./DeviceEchoResponse04H";
import {DeviceEchoResponse03H} from "./DeviceEchoResponse03H";

export enum SoyalFunctionCode {
    DEVICE_ECHO_RESPONSE = 0x03,
    DEVICE_ECHO_RESPONSE_ACK = 0x04,
    DEVICE_ECHO_RESPONSE_NACK = 0x05,
    DEVICE_STATUS_EVENT = 0x09,
}

export interface ISoyalResponse extends Serializable {
}

export class SoyalResponse implements ISoyalResponse {
    public readonly functionCode: SoyalFunctionCode;
    public readonly readerID: number;
    public readonly payload: ISoyalResponsePayload;

    public constructor(functionCode: SoyalFunctionCode, readerID: number, payload: ISoyalResponsePayload) {
        if (functionCode > MAX_UINT8 || readerID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.functionCode = functionCode;
        this.readerID = readerID;
        this.payload = payload;
    }

    private static deserializeWithDeserializer(buffer: Uint8Array,
                                              deserializer: (buffer: Uint8Array) => DeserializeResult<ISoyalResponsePayload>): DeserializeResult<SoyalResponse> {
        checkBufferLength(buffer, 2);

        const functionCode = buffer[0];
        const readerID = buffer[1];

        buffer = buffer.subarray(2);

        const result = deserializer(buffer);
        let payload: ISoyalResponsePayload = result.instance;
        let bufferConsumed: number = result.bufferConsumed;

        if (bufferConsumed !== buffer.length) {
            throw new PacketFormatError(`deserialization not consumed all data: ${bufferConsumed} / ${buffer.length}`);
        }

        return {
            instance: new SoyalResponse(functionCode, readerID, payload),
            bufferConsumed: 2 /* function code and reader ID */ + bufferConsumed,
        };
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalResponse> {
        checkBufferLength(buffer, 1);

        const functionCode = buffer[0];
        switch (functionCode) {
            case SoyalFunctionCode.DEVICE_ECHO_RESPONSE:
                return SoyalResponse.deserializeWithDeserializer(buffer, DeviceEchoResponse03H.deserialize);

            case SoyalFunctionCode.DEVICE_STATUS_EVENT:
                return SoyalResponse.deserializeWithDeserializer(buffer, DeviceStatusResponse09H.deserialize);

            case SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK:
                return SoyalResponse.deserializeWithDeserializer(buffer, DeviceEchoResponse04H.deserialize);

            case SoyalFunctionCode.DEVICE_ECHO_RESPONSE_NACK:
                return SoyalResponse.deserializeWithDeserializer(buffer, DeviceEchoResponse05H.deserialize);

            default:
                throw new UnknownProtocol(`Unknown function code: ${functionCode.toString(16)}`);
        }
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.functionCode, this.readerID, ...this.payload.serialize()]);
    }
}

export interface ISoyalResponsePayload extends Serializable {
}