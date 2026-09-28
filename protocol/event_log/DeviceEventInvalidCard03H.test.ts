import {expect, test} from "@jest/globals";
import {DeviceEventInvalidCard03H} from "./DeviceEventInvalidCard03H";

test("deserialize_siteCodeWithHighBitSet", () => {
    // captured from the device: invalid card, site 0xFB51, card 0xC652
    const buffer = Buffer.from("020008051107" + "0e01c65200001800fb510180c652d4dbdf4e", "hex");

    const deserialized = DeviceEventInvalidCard03H.deserialize(buffer);

    expect(deserialized.bufferConsumed).toBe(24);
    expect(deserialized.instance.cardUID).toBe(0xFB51C652);
    expect(deserialized.instance.address).toBe(0xC652);
    expect(deserialized.instance.readerID).toBe(1);
});

test("roundTrip", () => {
    const buffer = Buffer.from("020008051107" + "0e01c65200001800fb510180c652d4dbdf4e", "hex");

    expect(Buffer.from(DeviceEventInvalidCard03H.deserialize(buffer).instance.serialize()).toString("hex"))
        .toBe(buffer.toString("hex"));
});
