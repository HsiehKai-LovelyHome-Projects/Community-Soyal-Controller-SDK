import {expect, test} from "@jest/globals";
import {DeviceIOEventKeyPadPressed01H} from "./DeviceStatusKeyPadPressed01H";

test("deserialize_manualExampleMode8", () => {
    // `1234#` in mode 8: data 0 = 0x80, value = 0x04D2
    const deserialized = DeviceIOEventKeyPadPressed01H.deserialize(
        Uint8Array.from([0x80, 0x04, 0xD2, 0x00, 0x18, 0x14, 0x00]));

    expect(deserialized.bufferConsumed).toBe(7);
    expect(deserialized.instance.isMode8).toBe(true);
    expect(deserialized.instance.pin).toBe(1234);
    expect(deserialized.instance.data4).toBe(0x18);
    expect(deserialized.instance.data5).toBe(0x14);
});

test("deserialize_manualExampleMode4", () => {
    // 2.1.2 (2): `12345` -> 05 30 39 00 18 14 00
    const deserialized = DeviceIOEventKeyPadPressed01H.deserialize(
        Uint8Array.from([0x05, 0x30, 0x39, 0x00, 0x18, 0x14, 0x00]));

    expect(deserialized.instance.isMode8).toBe(false);
    expect(deserialized.instance.pin).toBe(12345);
    expect(deserialized.instance.fifthKey).toBe(5);
});

test("deserialize_withKeyData", () => {
    const buffer = Uint8Array.from([0x80, 0x04, 0xD2, 0x00, 0x18, 0x14, 0x00, 1, 2, 3, 4, 0, 0]);
    const deserialized = DeviceIOEventKeyPadPressed01H.deserialize(buffer);

    expect(deserialized.bufferConsumed).toBe(13);
    expect(Array.from(deserialized.instance.keyData!)).toStrictEqual([1, 2, 3, 4, 0]);
});

test("roundTrip", () => {
    for (const buffer of [
        Uint8Array.from([0x80, 0x04, 0xD2, 0x00, 0x18, 0x14, 0x00]),
        Uint8Array.from([0x05, 0x30, 0x39, 0x00, 0x18, 0x14, 0x00]),
        Uint8Array.from([0x80, 0x04, 0xD2, 0x00, 0x18, 0x14, 0x00, 1, 2, 3, 4, 0, 0]),
    ]) {
        expect(Array.from(DeviceIOEventKeyPadPressed01H.deserialize(buffer).instance.serialize()))
            .toStrictEqual(Array.from(buffer));
    }
});
