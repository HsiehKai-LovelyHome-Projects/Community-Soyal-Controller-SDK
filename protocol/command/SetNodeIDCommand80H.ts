import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT16} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";

export interface DoorSettings {
    /** door group number, 1~254 per byte */
    doorNumber: number;
    doorRelayTime10ms: number;
}

/**
 * 2.16: [new node ID] (['D'] [door number H] [door number L] [relay time H] [relay time L]), answered with an ACK
 * carrying the NEW node ID. The door settings need AR-721H 6.0 / AR-727H 7.0 or later.
 */
export class SetNodeIDCommand80H implements ISoyalCommandPayload {
    private static readonly DOOR_SETTINGS_MARK = 0x44; // 'D'
    public static readonly MIN_NODE_ID = 1;
    public static readonly MAX_NODE_ID = 254; // 00: host, FF: broadcast

    public readonly nodeID: number;
    public readonly doorSettings?: DoorSettings;

    public constructor(nodeID: number, doorSettings?: DoorSettings) {
        if (nodeID < SetNodeIDCommand80H.MIN_NODE_ID || nodeID > SetNodeIDCommand80H.MAX_NODE_ID) {
            throw new PacketFormatError(`node ID must be ${SetNodeIDCommand80H.MIN_NODE_ID}~${SetNodeIDCommand80H.MAX_NODE_ID}`);
        }
        if (doorSettings) {
            checkUnsignedField(doorSettings.doorNumber, MAX_UINT16);
            checkUnsignedField(doorSettings.doorRelayTime10ms, MAX_UINT16);
        }

        this.nodeID = nodeID;
        this.doorSettings = doorSettings;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetNodeIDCommand80H> {
        checkBufferLength(buffer, 1);

        if (buffer.length >= 6 && buffer[1] === SetNodeIDCommand80H.DOOR_SETTINGS_MARK) {
            return {
                instance: new SetNodeIDCommand80H(buffer[0], {
                    doorNumber: composeUInt16MSBLSB(buffer[2], buffer[3]),
                    doorRelayTime10ms: composeUInt16MSBLSB(buffer[4], buffer[5]),
                }),
                bufferConsumed: 6,
            };
        }

        return {
            instance: new SetNodeIDCommand80H(buffer[0]),
            bufferConsumed: 1,
        };
    }

    public serialize(): Uint8Array {
        if (!this.doorSettings) {
            return Uint8Array.of(this.nodeID);
        }

        return Uint8Array.from([this.nodeID, SetNodeIDCommand80H.DOOR_SETTINGS_MARK,
            ...getBytesFromUInt16BE(this.doorSettings.doorNumber),
            ...getBytesFromUInt16BE(this.doorSettings.doorRelayTime10ms)]);
    }
}
