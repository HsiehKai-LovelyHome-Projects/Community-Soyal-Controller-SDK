import {expect, test} from "@jest/globals";
import {PromptInvalidMessage05H} from "./PromptInvalidMessage05H";

test("serialize", () => {
    const payload = new PromptInvalidMessage05H()
    const serialized = payload.serialize();

    expect(serialized.length).toBe(0);
});


test("deserialize", () => {
    const payload = new PromptInvalidMessage05H()
    const serialized = payload.serialize();
    const deserialized = PromptInvalidMessage05H.deserialize(serialized);

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
});

