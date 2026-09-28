import {expect, test} from "@jest/globals";
import {PromptAcceptedMessage04H} from "./PromptAcceptedMessage04H";


test("serialize", () => {
    const payload = new PromptAcceptedMessage04H()
    const serialized = payload.serialize();

    expect(serialized.length).toBe(0);
});

test("serializeOptionalFields", () => {
    const payload = new PromptAcceptedMessage04H(
        0x42, 0x1234, 0x5678, 0x87654321,
    );
    const serialized = payload.serialize();

    expect(Array.from(serialized)).toStrictEqual([0x42, 0x12, 0x34, 0x56, 0x78, 0x87, 0x65, 0x43, 0x21]);
});


test("deserialize", () => {
    const payload = new PromptAcceptedMessage04H()
    const serialized = payload.serialize();
    const deserialized = PromptAcceptedMessage04H.deserialize(serialized);

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
});

test("deserializeWithOptionData", () => {
    const payload = new PromptAcceptedMessage04H(
        0x42, 0x1234, 0x5678, 0x87654321,
    );
    const serialized = payload.serialize();
    const deserialized = PromptAcceptedMessage04H.deserialize(serialized);

    expect(deserialized.bufferConsumed).toBe(serialized.length);
    expect(deserialized.instance).toStrictEqual(payload);
});

test("deserialize_manualExample", () => {
    // 2.4: Host Responce:7E 0D 01 04 00 0F C5 00 4E 00 00 00 65 1B A7
    const deserialized = PromptAcceptedMessage04H.deserialize(
        Uint8Array.from([0x00, 0x0F, 0xC5, 0x00, 0x4E, 0x00, 0x00, 0x00, 0x65]));

    expect(deserialized.bufferConsumed).toBe(9);
    expect(deserialized.instance.auxiliaryCommand).toBe(0x00);
    expect(deserialized.instance.cardUID).toBe(0x0FC5);
    expect(deserialized.instance.lcdCommand).toBe(0x004E);
    expect(deserialized.instance.liftStops).toBe(0x65);
});
