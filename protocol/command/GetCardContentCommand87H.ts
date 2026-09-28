import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";

/**
 * 2.20: [user address H] [user address L] [number of users], answered with an echo (03H) decoded by
 * {@link CardContentResponse}.
 */
export class GetCardContentCommand87H implements ISoyalCommandPayload {
    /** users fitting in one echo frame */
    public static readonly MAX_USERS_PER_COMMAND = 30;

    public readonly address: number;
    public readonly count: number;

    public constructor(address: number, count: number = 1) {
        checkUnsignedField(address, MAX_UINT16);
        if (count < 1 || count > GetCardContentCommand87H.MAX_USERS_PER_COMMAND) {
            throw new PacketFormatError(`1 to ${GetCardContentCommand87H.MAX_USERS_PER_COMMAND} users per command`);
        }

        this.address = address;
        this.count = count;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<GetCardContentCommand87H> {
        checkBufferLength(buffer, 3);

        return {
            instance: new GetCardContentCommand87H(composeUInt16MSBLSB(buffer[0], buffer[1]), buffer[2]),
            bufferConsumed: 3,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([...getBytesFromUInt16BE(this.address), this.count]);
    }
}
