import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";

export interface IndicatorLocks {
    lcd: boolean;
    leds: boolean;
    keyboard: boolean;
}

/**
 * 2.27 (AR-727H only): lock the LCD, LEDs and / or keyboard for a while, answered with an ACK.
 * [selection: bit0 LCD, bit3 LEDs, bit4 keyboard] [lock time H] [lock time L] (10ms unit)
 *
 * Keys pressed while the keyboard is locked are buffered and reported by 18H with status event 06H.
 */
export class LockIndicatorCommand90H implements ISoyalCommandPayload {
    private static readonly LCD = 1 << 0;
    private static readonly LEDS = 1 << 3;
    private static readonly KEYBOARD = 1 << 4;

    public constructor(public readonly locks: IndicatorLocks, public readonly lockTime10ms: number) {
        checkUnsignedField(lockTime10ms, MAX_UINT16);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<LockIndicatorCommand90H> {
        checkBufferLength(buffer, 3);

        return {
            instance: new LockIndicatorCommand90H({
                lcd: (buffer[0] & LockIndicatorCommand90H.LCD) !== 0,
                leds: (buffer[0] & LockIndicatorCommand90H.LEDS) !== 0,
                keyboard: (buffer[0] & LockIndicatorCommand90H.KEYBOARD) !== 0,
            }, composeUInt16MSBLSB(buffer[1], buffer[2])),
            bufferConsumed: 3,
        };
    }

    public serialize(): Uint8Array {
        const selection = (this.locks.lcd ? LockIndicatorCommand90H.LCD : 0) |
            (this.locks.leds ? LockIndicatorCommand90H.LEDS : 0) |
            (this.locks.keyboard ? LockIndicatorCommand90H.KEYBOARD : 0);

        return Uint8Array.from([selection, ...getBytesFromUInt16BE(this.lockTime10ms)]);
    }
}
