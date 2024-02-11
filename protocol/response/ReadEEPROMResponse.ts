import {DeserializeResult} from "../Serializable";
import {DeviceEchoResponse03H} from "./DeviceEchoResponse03H";
import {ISoyalResponsePayload} from "./SoyalResponse";

export class ReadEEPROMResponse03H implements ISoyalResponsePayload {

    public readonly data: Uint8Array;

    public constructor(data: Uint8Array) {
        this.data = data;
    }

    public static deserialize(response: DeviceEchoResponse03H): DeserializeResult<ReadEEPROMResponse03H> {
        return {
            instance: new ReadEEPROMResponse03H(Uint8Array.from(response.data)),
            bufferConsumed: response.data.length,
        }
    }

    public serialize(): Uint8Array {
        return Uint8Array.from(this.data);
    }

}