import {ISoyalCommandPayload} from "./SoyalCommand";
import {DeserializeResult} from "../Serializable";

/**
 * The command to deny opening the door.
 */
export class PromptInvalidMessage05H implements ISoyalCommandPayload {

    public constructor() {
    }

    public static deserialize(_: Uint8Array): DeserializeResult<PromptInvalidMessage05H> {
        return {
            instance: new PromptInvalidMessage05H(),
            bufferConsumed: 0,
        }
    }

    public serialize(): Uint8Array {
        return new Uint8Array(0);
    }
}