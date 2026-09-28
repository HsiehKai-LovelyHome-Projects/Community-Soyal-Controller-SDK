import {SoyalPackets} from "../../protocol/SoyalPackets";

/**
 * Splits a byte stream into Soyal frames: [head...] [length] [destination] [payload...] [xor] [sum]
 *
 * The protocol has no byte stuffing, the head byte may appear inside a payload. The parser therefore aligns on the
 * head, waits for `length` bytes, verifies the checksums, and on a bad checksum drops a single byte and scans again,
 * so a frame can be recovered right after garbage or a truncated frame.
 */
export class SoyalFrameParser {
    // destination + xor + sum, anything shorter can not be a frame
    private static readonly MIN_LENGTH = 3;

    private pending: number[] = [];
    private lastReceivedAt = 0;

    /** bytes thrown away since creation, for diagnostics */
    public droppedBytes = 0;

    /**
     * @param head frame head, e.g. `[0x7E]`
     * @param staleAfterMs a partial frame older than this is discarded when new bytes arrive
     * @param now clock, injectable for tests
     */
    public constructor(private readonly head: Uint8Array,
                       private readonly staleAfterMs: number = 200,
                       private readonly now: () => number = Date.now) {
    }

    public get pendingLength(): number {
        return this.pending.length;
    }

    public reset() {
        this.droppedBytes += this.pending.length;
        this.pending = [];
    }

    public push(bytes: Uint8Array): Uint8Array[] {
        const receivedAt = this.now();
        if (this.pending.length > 0 && receivedAt - this.lastReceivedAt > this.staleAfterMs) {
            this.reset();
        }
        this.lastReceivedAt = receivedAt;

        for (const byte of bytes) {
            this.pending.push(byte);
        }

        const frames: Uint8Array[] = [];
        for (; ;) {
            if (!this.alignOnHead()) {
                break;
            }

            const headLength = this.head.length;
            if (this.pending.length <= headLength) {
                break; // wait for the length byte
            }

            const length = this.pending[headLength];
            if (length < SoyalFrameParser.MIN_LENGTH) {
                this.drop(1);
                continue;
            }

            if (this.pending.length < headLength + 1 + length) {
                // a garbage head with a large length would swallow the frames behind it, resync on the first
                // complete and valid frame found further in the buffer
                const resyncOffset = this.findCompleteFrame(1);
                if (resyncOffset > 0) {
                    this.drop(resyncOffset);
                    continue;
                }
                break; // wait for the rest of the frame
            }

            const frame = this.validFrameAt(0);
            if (frame) {
                frames.push(frame);
                this.pending.splice(0, frame.length);
            } else {
                this.drop(1);
            }
        }

        return frames;
    }

    /**
     * Drops bytes until the pending buffer starts with the head, keeps a trailing partial head.
     * Returns true when the buffer starts with a complete head.
     */
    private alignOnHead(): boolean {
        const headLength = this.head.length;

        for (let offset = 0; offset < this.pending.length; offset++) {
            const matched = this.headBytesAt(offset);
            if (matched === headLength || offset + matched === this.pending.length) {
                // complete head, or a partial head at the very end of the buffer
                this.drop(offset);
                return matched === headLength;
            }
        }

        this.drop(this.pending.length);
        return false;
    }

    /** offset of the first complete frame with valid checksums at or after `from`, -1 if none */
    private findCompleteFrame(from: number): number {
        for (let offset = from; offset + this.head.length < this.pending.length; offset++) {
            if (this.validFrameAt(offset)) {
                return offset;
            }
        }

        return -1;
    }

    /** number of head bytes found at this offset, up to the end of the buffer */
    private headBytesAt(offset: number): number {
        let matched = 0;
        while (matched < this.head.length && offset + matched < this.pending.length &&
        this.pending[offset + matched] === this.head[matched]) {
            matched++;
        }
        return matched;
    }

    /** the frame at this offset when it is complete and its checksums match, else null */
    private validFrameAt(offset: number): Uint8Array | null {
        const headLength = this.head.length;
        if (this.headBytesAt(offset) < headLength || offset + headLength >= this.pending.length) {
            return null;
        }

        const length = this.pending[offset + headLength];
        const frameLength = headLength + 1 + length;
        if (length < SoyalFrameParser.MIN_LENGTH || offset + frameLength > this.pending.length) {
            return null;
        }

        const frame = Uint8Array.from(this.pending.slice(offset, offset + frameLength));
        return SoyalFrameParser.checksumMatches(frame, headLength) ? frame : null;
    }

    private drop(count: number) {
        if (count > 0) {
            this.pending.splice(0, count);
            this.droppedBytes += count;
        }
    }

    private static checksumMatches(frame: Uint8Array, headLength: number): boolean {
        const destinationID = frame[headLength + 1];
        const payload = frame.subarray(headLength + 2, frame.length - 2);
        const checkSums = SoyalPackets.getPacketCheckSums(destinationID, payload);

        return checkSums.xor === frame[frame.length - 2] && checkSums.sum === frame[frame.length - 1];
    }
}
