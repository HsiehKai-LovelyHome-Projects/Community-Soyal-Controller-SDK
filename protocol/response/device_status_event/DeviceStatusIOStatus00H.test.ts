import {test, expect} from "@jest/globals";
import {RemoveOldestDeviceEventLogCommand37H} from "./RemoveOldestDeviceEventLogCommand37H";
import {SoyalCommandCode} from "./SoyalCommand";
import {SoyalCommandDeserializer} from "./SoyalCommandDeserializer";

test("serialize", () => {
    const payload = new RemoveOldestDeviceEventLogCommand37H()
    const serialized = payload.serialize();

    expect(serialized.length).toBe(0);
});


test("deserialize", () => {
    const payload = new RemoveOldestDeviceEventLogCommand37H()
    const serialized = payload.serialize();
    const deserialized = RemoveOldestDeviceEventLogCommand37H.deserialize(serialized);

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
});

