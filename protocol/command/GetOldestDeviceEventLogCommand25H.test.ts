import {expect, test} from "@jest/globals";
import {GetOldestDeviceEventLogCommand25H} from "./GetOldestDeviceEventLogCommand25H";

test("serialize", () => {
    const payload = new GetOldestDeviceEventLogCommand25H()
    const serialized = payload.serialize();

    expect(serialized.length).toBe(0);
});


test("deserialize", () => {
    const payload = new GetOldestDeviceEventLogCommand25H()
    const serialized = payload.serialize();

    const deserialized = GetOldestDeviceEventLogCommand25H.deserialize(serialized);
    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
});

