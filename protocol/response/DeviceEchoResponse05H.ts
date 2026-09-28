import {DeserializeResult} from "../Serializable";
import {DeviceEchoResponse04H} from "./DeviceEchoResponse04H";

// nack, same layout as ack
export class DeviceEchoResponse05H extends DeviceEchoResponse04H {
    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEchoResponse05H> {
        const result = DeviceEchoResponse04H.deserialize(buffer);
        const ack = result.instance;

        return {
            instance: new DeviceEchoResponse05H(ack.readerType, ack.ioStatus0, ack.ioStatus1, ack.parameters,
                ack.firmwareVersion, ack.data4),
            bufferConsumed: result.bufferConsumed,
        };
    }
}
