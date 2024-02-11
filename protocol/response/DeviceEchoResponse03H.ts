import {ISoyalResponsePayload} from "./SoyalResponse";
import {DeserializeResult} from "../Serializable";

export class DeviceEchoResponse03H implements ISoyalResponsePayload {

    public readonly data: Uint8Array

    public constructor(data: Uint8Array) {
        this.data = data;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEchoResponse03H> {
        return {
            instance: new DeviceEchoResponse03H(buffer),
            bufferConsumed: buffer.length,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from(this.data);
    }
}