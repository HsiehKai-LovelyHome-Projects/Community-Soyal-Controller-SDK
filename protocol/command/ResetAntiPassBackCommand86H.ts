import {DeserializeResult} from "../Serializable";
import {ISoyalCommandPayload} from "./SoyalCommand";

/**
 * 2.23: restore the initial anti-pass-back state of every user, answered with an ACK.
 */
export class ResetAntiPassBackCommand86H implements ISoyalCommandPayload {

    public static deserialize(_: Uint8Array): DeserializeResult<ResetAntiPassBackCommand86H> {
        return {
            instance: new ResetAntiPassBackCommand86H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array(0);
    }
}
