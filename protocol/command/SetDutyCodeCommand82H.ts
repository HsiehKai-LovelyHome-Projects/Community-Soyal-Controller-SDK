import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {DutyStatus} from "../response/DeviceIOStatus";

/**
 * 2.18: select the time & attendance status recorded with the next accesses, answered with an ACK.
 */
export class SetDutyCodeCommand82H implements ISoyalCommandPayload {
    public constructor(public readonly duty: DutyStatus) {
        checkUnsignedField(duty, DutyStatus.RETURN);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetDutyCodeCommand82H> {
        checkBufferLength(buffer, 1);

        return {
            instance: new SetDutyCodeCommand82H(buffer[0]),
            bufferConsumed: 1,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.of(this.duty);
    }
}
