/**
 * Receives every packet exchanged with a reader, e.g. to persist a protocol trace.
 */
export interface IPacketLogger {
    logPacket(packet: Uint8Array, source: number, destination: number): void;
}
