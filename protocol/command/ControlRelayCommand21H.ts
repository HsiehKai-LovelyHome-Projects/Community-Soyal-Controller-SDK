import {ISoyalCommandPayload} from "./SoyalCommand";
import {MAX_UINT8} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";

export enum RelayControlParameter {
    // other parameters, refer to p.21 (2.7.1)
    DOOR_RELAY_ON = 0x82,
    DOOR_RELAY_OFF = 0x83,
}

export class ControlRelayCommand21H implements ISoyalCommandPayload {
    public readonly data: RelayControlParameter;

    public constructor(data: RelayControlParameter) {
        if (data > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.data = data;
    }

    public static deserialize(payload: Uint8Array): DeserializeResult<ControlRelayCommand21H> {
        if(payload.length < 1) {
            throw new PacketFormatError("buffer length is too short");
        }

        return {
            instance: new ControlRelayCommand21H(payload[0]),
            bufferConsumed: 1,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.data]);
    }

}