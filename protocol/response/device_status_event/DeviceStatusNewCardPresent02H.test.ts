import {expect, test} from "@jest/globals";
import {DeviceStatusNewCardPresent02H} from "./DeviceStatusNewCardPresent02H";

test("deserialize_manualExample", () => {
    // 2.1.2 (3) Card Present Status: 1E 63 6B 04 D2 B8 B4 04 10 00
    const deserialized = DeviceStatusNewCardPresent02H.deserialize(
        Uint8Array.from([0x1E, 0x63, 0x6B, 0x04, 0xD2, 0xB8, 0xB4, 0x04, 0x10, 0x00]));

    expect(deserialized.bufferConsumed).toBe(10);
    expect(deserialized.instance.dutyCode).toBe(0x1E);
    expect(deserialized.instance.cardUID).toBe(0x04636BB8B4);
    expect(deserialized.instance.value).toBe(0x04D2);
    expect(deserialized.instance.idCode).toBe(0x04);
    expect(deserialized.instance.deviceParameters).toBe(0x10);
});

test("roundTrip", () => {
    const buffer = Uint8Array.from([0x1E, 0x63, 0x6B, 0x04, 0xD2, 0xB8, 0xB4, 0x04, 0x10, 0x00]);
    expect(Array.from(DeviceStatusNewCardPresent02H.deserialize(buffer).instance.serialize()))
        .toStrictEqual(Array.from(buffer));
});

test("deserialize_siteCodeWithHighBitSet", () => {
    const deserialized = DeviceStatusNewCardPresent02H.deserialize(
        Uint8Array.from([0x00, 0xFB, 0x51, 0x00, 0x00, 0xC6, 0x52, 0x00, 0x18, 0x00]));

    expect(deserialized.instance.cardUID).toBe(0xFB51C652);
});
