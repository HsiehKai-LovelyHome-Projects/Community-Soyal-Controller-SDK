import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeCardUID, composeUInt16MSBLSB, getBytesFromUInt32BE, MAX_UINT32} from "../Commons";
import {DeserializeResult} from "../Serializable";

/**
 * 2.29 (721Q 6.6+ only): delete a card without knowing its user address.
 * [site H] [site L] [card H] [card L], answered with an ACK.
 */
export class DeleteTagByUIDCommand8AH implements ISoyalCommandPayload {
    private static readonly LENGTH = 4;

    public constructor(public readonly cardUID: number) {
        checkUnsignedField(cardUID, MAX_UINT32);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeleteTagByUIDCommand8AH> {
        checkBufferLength(buffer, DeleteTagByUIDCommand8AH.LENGTH);

        return {
            instance: new DeleteTagByUIDCommand8AH(
                composeCardUID(composeUInt16MSBLSB(buffer[0], buffer[1]), composeUInt16MSBLSB(buffer[2], buffer[3]))),
            bufferConsumed: DeleteTagByUIDCommand8AH.LENGTH,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from(getBytesFromUInt32BE(this.cardUID));
    }
}
