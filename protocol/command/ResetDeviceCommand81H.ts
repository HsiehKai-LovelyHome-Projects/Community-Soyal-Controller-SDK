import {ISoyalCommandPayload} from "./SoyalCommand";
import {DeserializeResult} from "../Serializable";

/**
 * 2.17: reboot the reader; with "FAC" (2.17.1) restore the factory default first. Unresponsive command.
 */
export class ResetDeviceCommand81H implements ISoyalCommandPayload {
    private static readonly FACTORY_DEFAULT = [0x46, 0x41, 0x43]; // "FAC"

    public constructor(public readonly factoryDefault: boolean = false) {
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<ResetDeviceCommand81H> {
        const factoryDefault = buffer.length >= 3 &&
            ResetDeviceCommand81H.FACTORY_DEFAULT.every((byte, index) => buffer[index] === byte);

        return {
            instance: new ResetDeviceCommand81H(factoryDefault),
            bufferConsumed: factoryDefault ? 3 : 0,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from(this.factoryDefault ? ResetDeviceCommand81H.FACTORY_DEFAULT : []);
    }
}
