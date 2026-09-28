import {expect, test} from "@jest/globals";
import {
    composeCardUID,
    composeUInt16MSBLSB,
    getBytesFromUInt16BE,
    getBytesFromUInt32BE,
    getBytesFromUInt40BE,
    visualizeByte
} from "./Commons";


test("composeUInt16MSBLSB", () => {
    const value = composeUInt16MSBLSB(0x12, 0x34);
    expect(value).toBe(0x1234);
});

test("composeCardUID", () => {
    expect(composeCardUID(0x636B, 0xB8B4)).toBe(0x636BB8B4);
    expect(composeCardUID(0x636B, 0xB8B4, 0x04)).toBe(0x04636BB8B4);
    expect(composeCardUID(0xFB51, 0xC652)).toBe(0xFB51C652); // site >= 0x8000 must stay positive
    expect(composeCardUID(0xFFFF, 0xFFFF, 0xFF)).toBe(0xFFFFFFFFFF);
});

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