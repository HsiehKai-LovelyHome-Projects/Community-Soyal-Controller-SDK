import {ISoyalCommandPayload} from "./SoyalCommand";
import {
    checkBufferLength,
    checkUnsignedField,
    composeCardUID,
    composeUInt16MSBLSB,
    getBytesFromUInt16BE,
    getBytesFromUInt32BE,
    MAX_UINT16,
    MAX_UINT32
} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {AccessControlMode} from "./SetCardContentCommand83H";

/**
 * 2.28 (721Q 6.6+ only): add a card without choosing its user address.
 * [site H] [site L] [card H] [card L] [PIN H] [PIN L] [mode] [zone], answered with an ACK.
 */
export class InsertTagByUIDCommand89H implements ISoyalCommandPayload {
    private static readonly LENGTH = 8;

    public constructor(public readonly cardUID: number,
                       public readonly pin: number,
                       public readonly mode: AccessControlMode,
                       public readonly zone: number) {
        checkUnsignedField(cardUID, MAX_UINT32);
        checkUnsignedField(pin, MAX_UINT16);
        checkUnsignedField(mode, AccessControlMode.MAX);
        checkUnsignedField(zone, 63);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<InsertTagByUIDCommand89H> {
        checkBufferLength(buffer, InsertTagByUIDCommand89H.LENGTH);

        return {
            instance: new InsertTagByUIDCommand89H(
                composeCardUID(composeUInt16MSBLSB(buffer[0], buffer[1]), composeUInt16MSBLSB(buffer[2], buffer[3])),
                composeUInt16MSBLSB(buffer[4], buffer[5]), buffer[6], buffer[7]),
            bufferConsumed: InsertTagByUIDCommand89H.LENGTH,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([...getBytesFromUInt32BE(this.cardUID), ...getBytesFromUInt16BE(this.pin),
            this.mode, this.zone]);
    }
}
