import {MAX_UINT8} from "./Commons";

export interface PacketChecksums {
    xor: number;
    sum: number;
}

export class SoyalPackets {
    public static getPacketCheckSums(destinationID: number, packet: Uint8Array): PacketChecksums {
        let xor = MAX_UINT8 ^ destinationID;
        for (const byte of packet) {
            xor ^= byte;
        }

        let sum = destinationID;
        for (const byte of packet) {
            sum += byte;
        }
        sum += xor;

        return {
            xor: xor,
            sum: sum & MAX_UINT8,
        };
    }
}