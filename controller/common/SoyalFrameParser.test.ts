import {expect, test} from "@jest/globals";
import {SoyalFrameParser} from "./SoyalFrameParser";
import {SOYAL_PROTOCOL_LARGE, SOYAL_PROTOCOL_SHORT} from "../../protocol/SoyalProtocol";

// real AR-725H status reply
const STATUS = Buffer.from("7e0a0009010041001800ae11", "hex");
// 2.5 ACK example
const ACK = Buffer.from("7e05000401faff", "hex");

function hex(frames: Uint8Array[]): string[] {
    return frames.map(frame => Buffer.from(frame).toString("hex"));
}

test("wholeFrame", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    expect(hex(parser.push(STATUS))).toStrictEqual([STATUS.toString("hex")]);
    expect(parser.pendingLength).toBe(0);
});

test("byteByByte", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    const frames: Uint8Array[] = [];
    for (const byte of STATUS) {
        frames.push(...parser.push(Uint8Array.from([byte])));
    }

    expect(hex(frames)).toStrictEqual([STATUS.toString("hex")]);
});

test("severalFramesInOneChunk", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    expect(hex(parser.push(Buffer.concat([ACK, STATUS, ACK]))))
        .toStrictEqual([ACK.toString("hex"), STATUS.toString("hex"), ACK.toString("hex")]);
});

test("leadingGarbage", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    expect(hex(parser.push(Buffer.concat([Buffer.from([0x00, 0x13, 0x37]), STATUS]))))
        .toStrictEqual([STATUS.toString("hex")]);
    expect(parser.droppedBytes).toBe(3);
});

test("garbageHeadByteBeforeFrame", () => {
    // a stray 0x7E with a plausible length swallows the real frame head, the checksum rejects it and rescans
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    expect(hex(parser.push(Buffer.concat([Buffer.from([0x7E, 0x05]), ACK]))))
        .toStrictEqual([ACK.toString("hex")]);
});

test("garbageHeadWithLargeLengthDoesNotSwallowFollowingFrame", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    expect(hex(parser.push(Buffer.concat([Buffer.from([0x7E, 0x13, 0x37]), STATUS]))))
        .toStrictEqual([STATUS.toString("hex")]);
});

test("truncatedFrameThenFullFrame", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    expect(hex(parser.push(Buffer.concat([STATUS.subarray(0, 5), STATUS])))).toStrictEqual([STATUS.toString("hex")]);
});

test("corruptedFrameIsDropped", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT);
    const corrupted = Buffer.from(STATUS);
    corrupted[6] ^= 0xFF;

    expect(parser.push(corrupted)).toHaveLength(0);
    expect(hex(parser.push(ACK))).toStrictEqual([ACK.toString("hex")]);
});

test("stalePartialFrameIsDiscarded", () => {
    let now = 0;
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_SHORT, 200, () => now);

    parser.push(STATUS.subarray(0, 4));
    now = 1000;
    // without the stale timeout, these bytes would be taken as the rest of the old frame
    expect(hex(parser.push(ACK))).toStrictEqual([ACK.toString("hex")]);
});

test("largeHead", () => {
    const parser = new SoyalFrameParser(SOYAL_PROTOCOL_LARGE);
    const frame = Buffer.concat([Buffer.from(SOYAL_PROTOCOL_LARGE), ACK.subarray(1)]);

    expect(hex(parser.push(Buffer.concat([Buffer.from([0xFF]), frame])))).toStrictEqual([frame.toString("hex")]);
});
