import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, MAX_UINT8} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";

/**
 * Extend parameter bits (EEPROM 17H), version 6V9 (727H) / 6V6 (721H) and later.
 */
export enum ExtendParameter {
    /** open door is disabled after a granted access (event still logged, "Tag Locked", 3 beeps) */
    DISABLE_OPEN_DOOR = 1 << 0,
    /** with DISABLE_OPEN_DOOR, also disable the egress button */
    DISABLE_EGRESS_WHEN_OPEN_DOOR_DISABLED = 1 << 1,
    /** latch the door relay (keeps the last state depending on DOOR_RELAY_LATCH_ON) */
    LATCH_DOOR_RELAY = 1 << 2,
    /** latched door relay state on / off */
    DOOR_RELAY_LATCH_ON = 1 << 3,
    /** always require the password */
    ALWAYS_REQUIRE_PASSWORD = 1 << 4,
}

/**
 * 2.26: [set mask] [clear mask], answered with an ACK. Bits in the set mask are set, then bits in the clear mask are
 * cleared, the other bits are kept.
 */
export class SetExtendParametersCommand88H implements ISoyalCommandPayload {
    public constructor(public readonly setMask: number, public readonly clearMask: number) {
        checkUnsignedField(setMask, MAX_UINT8);
        checkUnsignedField(clearMask, MAX_UINT8);
        if ((setMask & clearMask) !== 0) {
            throw new PacketFormatError("a bit can not be both set and cleared");
        }
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetExtendParametersCommand88H> {
        checkBufferLength(buffer, 2);

        return {
            instance: new SetExtendParametersCommand88H(buffer[0], buffer[1]),
            bufferConsumed: 2,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.of(this.setMask, this.clearMask);
    }
}
