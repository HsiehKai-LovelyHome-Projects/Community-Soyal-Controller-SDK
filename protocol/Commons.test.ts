import {expect, test} from "@jest/globals";
import {getBytesFromUInt16BE, getBytesFromUInt32BE, getBytesFromUInt40BE, visualizeByte} from "./Commons";

test("getBytesFromUInt16BE", () => {
    const bytes = getBytesFromUInt16BE(0x1234);

    expect(bytes).toStrictEqual([0x12, 0x34]);
});

test("getBytesFromUInt32BE", () => {
    const bytes = getBytesFromUInt32BE(0x12345678);

    expect(bytes).toStrictEqual([0x12, 0x34, 0x56, 0x78]);
});

test("getBytesFromUInt40BE", () => {
    const bytes = getBytesFromUInt40BE(0x123456789a);

    expect(bytes).toStrictEqual([0x12, 0x34, 0x56, 0x78, 0x9a]);
});

// TODO timestampFromSoyalFormat
// TODO timestamp2SoyalFormat

test("visualizeHex", () => {
    expect(visualizeByte(0x78)).toBe("78H");
    expect(() => {
        visualizeByte(0xff + 1)
    }).toThrowError(RangeError);
});