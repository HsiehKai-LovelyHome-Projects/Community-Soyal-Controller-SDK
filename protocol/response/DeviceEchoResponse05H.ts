import {DeserializeResult} from "../Serializable";
import {DeviceEchoResponse04H} from "./DeviceEchoResponse04H";

// nack
export class DeviceEchoResponse05H extends DeviceEchoResponse04H {
    public constructor(controllerNodeID: number, controllerType ?: number,
                       ioStatus0?: number, ioStatus1?: number, parameters?: number, firmwareVersion?: number,
                       data4?: number) {
        super(controllerNodeID, controllerType, ioStatus0, ioStatus1, parameters, firmwareVersion, data4);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEchoResponse05H> {
        return DeviceEchoResponse04H.deserialize(buffer) as DeserializeResult<DeviceEchoResponse05H>;
    }
}
