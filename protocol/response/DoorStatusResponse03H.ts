import {ISoyalResponsePayload} from "./SoyalResponse";
import {MAX_UINT8} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";

export class DoorStatusResponse03H implements ISoyalResponsePayload {
    public readonly version: number;
    public readonly doorStatus: number;
    public readonly forcedOpenAlarmStatus: number;
    public readonly bitSelection: number; // 20*xxx#

    public constructor(version: number, doorStatus: number, forcedOpenAlarmStatus: number, bitSelection: number) {
        if (version > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (doorStatus > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (forcedOpenAlarmStatus > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }
        if (bitSelection > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.version = version;
        this.doorStatus = doorStatus;
        this.forcedOpenAlarmStatus = forcedOpenAlarmStatus;
        this.bitSelection = bitSelection;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DoorStatusResponse03H> {
        if (buffer.length < 4) {
            throw new PacketFormatError("not enough data for deserialization");
        }

        return {
            instance: new DoorStatusResponse03H(buffer[0], buffer[1], buffer[2], buffer[3]),
            bufferConsumed: 4,
        }
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([
            this.version, this.doorStatus, this.forcedOpenAlarmStatus, this.bitSelection
        ]);
    }

}