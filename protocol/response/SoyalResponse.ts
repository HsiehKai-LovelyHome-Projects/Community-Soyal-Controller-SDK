import {DeserializeResult, Serializable} from "../Serializable";
import {DeviceStatusResponse09H} from "./DeviceStatusResponse09H";
import {PacketFormatError, UnknownProtocol} from "../Errors";
import {MAX_UINT8} from "../Commons";

export enum SoyalFunctionCode {
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

    public static deserialize(buffer: Uint8Array): DeserializeResult<SoyalResponse> {
        if (buffer.length < 2) {
            throw new Error("buffer length is too short");
        }

        const functionCode = buffer[0];
        const readerID = buffer[1];

        buffer = buffer.subarray(2);

        let payload: ISoyalResponsePayload;
        let bufferConsumed: number;

        switch (functionCode) {
            case SoyalFunctionCode.DEVICE_STATUS_EVENT: {
                const result = DeviceStatusResponse09H.deserialize(buffer);
                payload = result.instance;
                bufferConsumed = result.bufferConsumed;
                break;
            }
            default:
                throw new UnknownProtocol(`Unknown function code: ${functionCode.toString(16)}`);
        }

        if (bufferConsumed !== buffer.length) {
            throw new PacketFormatError("deserialization not consumed all data");
        }

        return {
            instance: new SoyalResponse(functionCode, readerID, payload),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.functionCode, this.readerID, ...this.payload.serialize()]);
    }
}

export interface ISoyalResponsePayload extends Serializable {
}