import {test, expect} from "@jest/globals";
import {DeviceStatusIOStatus00H} from "./DeviceStatusIOStatus00H";

test("serialize", () => {
    const payload = new DeviceStatusIOStatus00H(0x12, 0x34, 0x56, 0x78);
    const serialized = payload.serialize();

    expect(serialized.length).toBe(4);
    expect(serialized[0]).toBe(0x12);
    expect(serialized[1]).toBe(0x34);
    expect(serialized[2]).toBe(0x56);
    expect(serialized[3]).toBe(0x78);
});


test("deserialize", () => {
    const payload = new DeviceStatusIOStatus00H(0x12, 0x34, 0x56, 0x78);
    const serialized = payload.serialize();
    const deserialized = DeviceStatusIOStatus00H.deserialize(serialized);

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
    expect(deserialized.instance.data0).toBe(0x12);
    expect(deserialized.instance.data1).toBe(0x34);
    expect(deserialized.instance.data2).toBe(0x56);
    expect(deserialized.instance.data3).toBe(0x78);
});

