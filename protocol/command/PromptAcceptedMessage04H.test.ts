import {expect, test} from "@jest/globals";
import {PromptAcceptedMessage04H} from "./PromptAcceptedMessage04H";
import {SoyalCommandCode} from "./SoyalCommand";
import {SoyalCommandDeserializer} from "./SoyalCommandDeserializer";


test("serialize", () => {
    const payload = new PromptAcceptedMessage04H()
    const serialized = payload.serialize();

    expect(serialized.length).toBe(0);
    expect(serialized.length).toBe(1);
    expect(serialized[0]).toBe(SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H);
});

test("serializeOptionalFields", () => {
    const payload = new PromptAcceptedMessage04H(
        0x42, 0x1234, 0x5678, 0x87654321,
    );
    const serialized = payload.serialize();

    expect(serialized.length).toBe(9);
    expect(serialized[0]).toBe(0x42);
    expect(serialized[1]).toBe(0x12);
    expect(serialized[2]).toBe(0x34);
    expect(serialized[3]).toBe(0x56);
    expect(serialized[4]).toBe(0x78);
    expect(serialized[5]).toBe(0x87);
    expect(serialized[6]).toBe(0x65);
    expect(serialized[7]).toBe(0x43);
    expect(serialized[8]).toBe(0x21);
});


test("deserialize", () => {
    const payload = new PromptAcceptedMessage04H()
    const serialized = payload.serialize();
    const deserialized = PromptAcceptedMessage04H.deserialize(serialized);

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
});

/*
// Test skipped since deserialize with optional data is not yet supported for PromptAcceptedMessage04H
test("deserializeWithOptionData", () => {
    const payload = new PromptAcceptedMessage04H(
        0x42, 0x1234, 0x5678, 0x87654321,
    );
    const serialized = payload.serialize();
    const deserialized = PromptAcceptedMessage04H.deserialize(serialized);

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
});
*/

// TODO test in case too big value are provided

