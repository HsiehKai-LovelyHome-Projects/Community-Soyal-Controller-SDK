import {test, expect} from "@jest/globals";
import {GetDeviceStatusCommand18H} from "./GetDeviceStatusCommand18H";


test("serialize18H", () => {
    const payload = new GetDeviceStatusCommand18H();
    const serialized = payload.serialize();
    expect(serialized.length).toBe(0);
});

test("serialize18H_withTimestamp", () => {
    const now = new Date();
    const payload = new GetDeviceStatusCommand18H(now);

    const serialized = payload.serialize();
    expect(serialized.length).toBe(10);
    expect(serialized[0]).toBe(now.getSeconds());
    expect(serialized[1]).toBe(now.getMinutes());
    expect(serialized[2]).toBe(now.getHours());
    expect(serialized[3]).toBe(now.getDay() + 1);
    expect(serialized[4]).toBe(now.getDate());
    expect(serialized[5]).toBe(now.getMonth() + 1);
    expect(serialized[6]).toBe(0);
    expect(serialized[7]).toBe(now.getDay() + 1);
    expect(serialized[8]).toBe(now.getFullYear() - 2000);
    expect(serialized[9]).toBe(0);
});

test("deserialize_withoutTimestamp", () => {
    const payload = new GetDeviceStatusCommand18H();
    const serialized = payload.serialize();

    const deserialized = GetDeviceStatusCommand18H.deserialize(serialized);
    const instance = deserialized.instance;

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
    expect(instance.timestamp).toBe(undefined);
});

test("deserialize_withTimestamp", () => {
    const now = new Date();
    const payload = new GetDeviceStatusCommand18H(now);
    const serialized = payload.serialize();

    const deserialized = GetDeviceStatusCommand18H.deserialize(serialized);
    const instance = deserialized.instance;

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
    expect(Math.abs(instance.timestamp!.getTime() - now.getTime())).toBeLessThan(1000);
});