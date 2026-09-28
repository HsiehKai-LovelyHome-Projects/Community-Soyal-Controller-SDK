import {DeserializeResult} from "../Serializable";
import {ISoyalCommandPayload} from "./SoyalCommand";

/**
 * 2.21: release a reader waiting for the host decision (04H / 05H) on a card or keypad event. The manual calls it unresponsive but also lists an ACK echo, the SDK does not wait for one.
 */
export class StopWaitingForResponseCommand84H implements ISoyalCommandPayload {

    public static deserialize(_: Uint8Array): DeserializeResult<StopWaitingForResponseCommand84H> {
        return {
            instance: new StopWaitingForResponseCommand84H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array(0);
    }
}
