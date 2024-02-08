import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";
import {ISoyalResponsePayload} from "./SoyalResponse";
import {MAX_UINT8} from "../Commons";
import {DeviceEventNoEvent04H} from "../event_log/DeviceEventNoEvent04H";

export class DeviceEchoResponse04H extends DeviceEventNoEvent04H implements ISoyalResponsePayload {

    public readonly controllerNodeID : number;

    public constructor(controllerNodeID : number, controllerType ?: number,
                       ioStatus0?: number, ioStatus1?: number, parameters?: number, firmwareVersion?: number,
                       data4?: number) {
        if (controllerNodeID && controllerNodeID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (controllerType && controllerType > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (ioStatus0 && ioStatus0 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (ioStatus1 && ioStatus1 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (parameters && parameters > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (firmwareVersion && firmwareVersion > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (data4 && data4 > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        super(controllerType, ioStatus0, ioStatus1, parameters, firmwareVersion, data4);
        this.controllerNodeID = controllerNodeID;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEchoResponse04H> {

        const controllerNodeID = buffer[0];
        let bufferConsumed = 1;

        const result = DeviceEventNoEvent04H.deserialize(buffer.subarray(1));
        const eventLog = result.instance;
        bufferConsumed += result.bufferConsumed;


        return {
            instance: new DeviceEchoResponse04H(controllerNodeID, eventLog.readerType,
                eventLog.ioStatus0, eventLog.ioStatus1, eventLog.parameters, eventLog.firmwareVersion, eventLog.data4),
            bufferConsumed: bufferConsumed,
        };
    }

    public serialize(): Uint8Array {
        const packet = [this.controllerNodeID];
        if (this.controllerNodeID !== undefined) {
            packet.push(...super.serialize());
        }

        return Uint8Array.from(packet);
    }
}
