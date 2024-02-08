import {PacketCheckSumError, PacketFormatError, UnknownProtocol} from "./Errors";
import {Serializable} from "./Serializable";
import {SoyalPackets} from "./SoyalPackets";
import {MAX_UINT8} from "./Commons";


export class SoyalHeader extends Uint8Array {
    public constructor(header: Iterable<number>) {
        super(header);
    }
}

export const SOYAL_PROTOCOL_SHORT = new Uint8Array([0x7E]);
export const SOYAL_PROTOCOL_SECURITY_SHORT = new SoyalHeader([0x7F]);
export const SOYAL_PROTOCOL_LARGE = new SoyalHeader([0xFF, 0x00, 0x5A, 0xA5]);
export const SOYAL_PROTOCOL_SECURITY_LARGE = new SoyalHeader([0xFF, 0x00, 0x55, 0xAA]);


export const LENGTH_FIELD_LENGTH = 1;
export const DESTINATION_ID_FIELD_LENGTH = 1;
export const XOR_FIELD_LENGTH = 1;
export const SUM_FIELD_LENGTH = 1;

export class SoyalProtocol implements Serializable {
    public readonly head: SoyalHeader;
    public readonly length: number; // len(packet) - 2;
    public readonly destinationID: number;
    public readonly payload: Uint8Array;
    public readonly xor: number; // 0xff xor packet[2:-2]
    public readonly sum: number; // sum of packet[2:-1]

    public constructor(head: SoyalHeader, destinationID: number,
                       payload: Uint8Array) {
        if (head != SOYAL_PROTOCOL_SHORT && head != SOYAL_PROTOCOL_SECURITY_SHORT &&
            head != SOYAL_PROTOCOL_LARGE && head != SOYAL_PROTOCOL_SECURITY_LARGE) {
            throw new UnknownProtocol("unknown protocol");
        }

        if (destinationID > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.head = head;
        this.length = DESTINATION_ID_FIELD_LENGTH + payload.length + XOR_FIELD_LENGTH + SUM_FIELD_LENGTH;
        this.destinationID = destinationID;
        this.payload = payload;

        const checkSums = SoyalPackets.getPacketCheckSums(destinationID, this.payload);
        this.xor = checkSums.xor;
        this.sum = checkSums.sum;
    }

    public static deserialize(buffer: Uint8Array): SoyalProtocol {
        const minPayloadSize = LENGTH_FIELD_LENGTH + XOR_FIELD_LENGTH + SUM_FIELD_LENGTH;
        if (buffer.length < SOYAL_PROTOCOL_SHORT.length + minPayloadSize) {
            throw new PacketFormatError("not a valid Soyal packet");
        }

        let head: Uint8Array;

        switch (buffer[0]) {
            case SOYAL_PROTOCOL_SHORT[0]:
                head = SOYAL_PROTOCOL_SHORT;
                break;
            case SOYAL_PROTOCOL_SECURITY_SHORT[0]:
                head = SOYAL_PROTOCOL_SECURITY_SHORT;
                break;
            default: {
                if (buffer.length < SOYAL_PROTOCOL_LARGE.length + minPayloadSize) {
                    throw new PacketFormatError("not a valid Soyal packet");
                }

                if (buffer[0] == SOYAL_PROTOCOL_LARGE[0] && buffer[1] == SOYAL_PROTOCOL_LARGE[1] &&
                    buffer[2] == SOYAL_PROTOCOL_LARGE[2] && buffer[3] == SOYAL_PROTOCOL_LARGE[3]) {
                    head = SOYAL_PROTOCOL_LARGE;
                } else if (buffer[0] == SOYAL_PROTOCOL_SECURITY_LARGE[0] && buffer[1] == SOYAL_PROTOCOL_SECURITY_LARGE[1] &&
                    buffer[2] == SOYAL_PROTOCOL_SECURITY_LARGE[2] && buffer[3] == SOYAL_PROTOCOL_SECURITY_LARGE[3]) {
                    head = SOYAL_PROTOCOL_SECURITY_LARGE;
                } else {
                    throw new PacketFormatError("not a valid Soyal packet");
                }
            }
        }

        buffer = buffer.subarray(head.length);

        const length = buffer[0];
        buffer = buffer.subarray(LENGTH_FIELD_LENGTH);
        if (length != buffer.length) {
            throw new PacketFormatError("not a valid Soyal packet");
        }

        const destinationID = buffer[0];
        buffer = buffer.subarray(DESTINATION_ID_FIELD_LENGTH);

        const xorExpected = buffer[buffer.length - 2];
        const sumExpected = buffer[buffer.length - 1];

        buffer = buffer.subarray(0, buffer.length - 2);

        const checkSums = SoyalPackets.getPacketCheckSums(destinationID, buffer);
        if (checkSums.xor != xorExpected || checkSums.sum != sumExpected) {
            throw new PacketCheckSumError("xor or sum checksum error");
        }

        return new SoyalProtocol(head, destinationID, buffer);
    }

    public serialize(): Uint8Array {
        const packet = new Uint8Array(this.head.length + LENGTH_FIELD_LENGTH + this.length);

        let offset = 0;
        packet.set(this.head, offset);
        offset += this.head.length;

        packet[offset] = this.length;
        offset += LENGTH_FIELD_LENGTH;

        packet[offset] = this.destinationID;
        offset += DESTINATION_ID_FIELD_LENGTH;

        packet.set(this.payload, offset);

        packet[packet.length - 2] = this.xor;
        packet[packet.length - 1] = this.sum;

        return packet;
    }
}