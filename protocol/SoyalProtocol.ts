import {PacketCheckSumError, PacketFormatError, UnknownProtocol} from "./Errors";
import {Serializable} from "./Serializable";
import {SoyalPackets} from "./SoyalPackets";
import {assertUnreachable, MAX_UINT8} from "./Commons";
import {SoyalResponse} from "./response/SoyalResponse";
import {SoyalDeviceEvent} from "./event_log/SoyalDeviceEvent";
import {SoyalCommand} from "./command/SoyalCommand";

export const SOYAL_PROTOCOL_SHORT = new Uint8Array([0x7E]);
export const SOYAL_PROTOCOL_SECURITY_SHORT = new Uint8Array([0x7F]);
export const SOYAL_PROTOCOL_LARGE = new Uint8Array([0xFF, 0x00, 0x5A, 0xA5]);
export const SOYAL_PROTOCOL_SECURITY_LARGE = new Uint8Array([0xFF, 0x00, 0x55, 0xAA]);


const LENGTH_FIELD_LENGTH = 1;
const DESTINATION_ID_FIELD_LENGTH = 1;
const XOR_FIELD_LENGTH = 1;
const SUM_FIELD_LENGTH = 1;

export enum SoyalApplicationType {
    HOST_COMMAND,
    EVENT,
    DEVICE_RESPONSE,
}

export class SoyalProtocol implements Serializable {
    public readonly head: Uint8Array;
    public readonly length: number; // len(packet) - 2;
    public readonly destinationID: number;
    public readonly data: SoyalCommand | SoyalDeviceEvent | SoyalResponse;
    public readonly xor: number; // 0xff xor packet[2:-2]
    public readonly sum: number; // sum of packet[2:-1]

    public constructor(head: Uint8Array, length: number, destinationID: number,
                       data: SoyalCommand | SoyalDeviceEvent | SoyalResponse,
                       xor: number, sum: number) {
        if (head != SOYAL_PROTOCOL_SHORT && head != SOYAL_PROTOCOL_SECURITY_SHORT &&
            head != SOYAL_PROTOCOL_LARGE && head != SOYAL_PROTOCOL_SECURITY_LARGE) {
            throw new UnknownProtocol("unknown protocol");
        }

        if (length > MAX_UINT8 || destinationID > MAX_UINT8 || xor > MAX_UINT8 || sum > MAX_UINT8) {
            throw new PacketFormatError("data is out of range");
        }

        this.head = head;
        this.length = length;
        this.destinationID = destinationID;
        this.data = data;
        this.xor = xor
        this.sum = sum;
    }

    public static deserialize(buffer: Uint8Array, type: SoyalApplicationType): SoyalProtocol {
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

        let data;
        switch (type) {
            case SoyalApplicationType.HOST_COMMAND:
                data = SoyalCommand.deserialize(buffer);
                break;

            case SoyalApplicationType.EVENT:
                data = SoyalDeviceEvent.deserialize(buffer);
                break;

            case SoyalApplicationType.DEVICE_RESPONSE:
                data = SoyalResponse.deserialize(buffer);
                break;

            default:
                assertUnreachable(type);
        }

        return new SoyalProtocol(head, length, destinationID, data.instance, xorExpected, sumExpected);
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

        const rawData = this.data.serialize();
        packet.set(rawData, offset);

        packet[-2] = this.xor;
        packet[-1] = this.sum;

        return packet;
    }
}