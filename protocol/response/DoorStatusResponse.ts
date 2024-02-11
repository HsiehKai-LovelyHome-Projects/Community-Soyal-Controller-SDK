import {ISoyalResponsePayload} from "./SoyalResponse";
import {checkBufferLength, MAX_UINT8} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";
import {DeviceEchoResponse03H} from "./DeviceEchoResponse03H";

export class DoorStatusResponse implements ISoyalResponsePayload {
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

    public static deserialize(response: DeviceEchoResponse03H): DeserializeResult<DoorStatusResponse> {
        const buffer = response.data;
        checkBufferLength(buffer, 4);

        return {
            instance: new DoorStatusResponse(buffer[0], buffer[1], buffer[2], buffer[3]),
            bufferConsumed: 4,
        }
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([
            this.version, this.doorStatus, this.forcedOpenAlarmStatus, this.bitSelection
        ]);
    }

}