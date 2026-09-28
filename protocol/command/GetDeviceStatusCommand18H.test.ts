import {test, expect} from "@jest/globals";
import {GetDeviceStatusCommand18H} from "./GetDeviceStatusCommand18H";
import {SOYAL_PROTOCOL_SHORT, SoyalProtocol} from "../SoyalProtocol";
import {SoyalCommand, SoyalCommandCode} from "./SoyalCommand";
import {PacketFormatError} from "../Errors";


test("serialize18H", () => {
    const payload = new GetDeviceStatusCommand18H();
    const serialized = payload.serialize();
    expect(serialized.length).toBe(0);
});

test("serialize18H_withTimestamp", () => {
    const timestamp = new Date(2025, 0, 26, 13, 45, 30); // Sunday
    const payload = new GetDeviceStatusCommand18H(timestamp);

    expect(Array.from(payload.serialize())).toStrictEqual([
        30, 45, 13, // second, minute, hour
        26, 1, // day, month
        0, // must be zero
        1, // weekday: Sunday
        25, // year
        0, // flags: door relay must NOT be forced on
    ]);
});

test("serialize18H_oddYearDoesNotForceDoorRelayOn", () => {
    // regression: the old 10 bytes layout put the year into the flags byte, odd years forced the door relay on
    for (const year of [2025, 2027, 2029]) {
        const serialized = new GetDeviceStatusCommand18H(new Date(year, 5, 15, 12, 0, 0)).serialize();
        expect(serialized.length).toBe(9);
        expect(serialized[8]).toBe(0);
    }
});

test("serialize18H_forceDoorRelayOn", () => {
    const serialized = new GetDeviceStatusCommand18H(new Date(2025, 0, 26), true).serialize();
    expect(serialized[8]).toBe(GetDeviceStatusCommand18H.FLAG_FORCE_DOOR_RELAY_ON);
});

test("constructor_forceDoorRelayOnWithoutTimestamp", () => {
    expect(() => new GetDeviceStatusCommand18H(undefined, true)).toThrow(PacketFormatError);
});

test("serialize18H_matchesManualExample", () => {
    // 2.4: Host Polling :7E 0D 01 18 20 2B 0B 08 04 00 01 12 00 F9 87
    const timestamp = new Date(2018, 3, 8, 11, 43, 32); // Sunday
    const command = new SoyalCommand(SoyalCommandCode.GET_DEVICE_STATUS_18H, new GetDeviceStatusCommand18H(timestamp));
    const packet = new SoyalProtocol(SOYAL_PROTOCOL_SHORT, 1, command.serialize());

    expect(Buffer.from(packet.serialize()).toString("hex"))
        .toBe("7e0d0118202b0b0804000112" + "00f987");
});

test("deserialize_withoutTimestamp", () => {
    const payload = new GetDeviceStatusCommand18H();
    const serialized = payload.serialize();

    const deserialized = GetDeviceStatusCommand18H.deserialize(serialized);
    const instance = deserialized.instance;

    expect(deserialized.instance).toBeDefined();
    expect(deserialized.bufferConsumed).toBe(serialized.length);
    expect(instance.timestamp).toBe(undefined);
    expect(instance.forceDoorRelayOn).toBe(false);
});

test("deserialize_withTimestamp", () => {
    const timestamp = new Date(2025, 0, 26, 13, 45, 30);
    const payload = new GetDeviceStatusCommand18H(timestamp, true);
    const serialized = payload.serialize();

    const deserialized = GetDeviceStatusCommand18H.deserialize(serialized);
    const instance = deserialized.instance;

    expect(deserialized.bufferConsumed).toBe(serialized.length);
    expect(instance.timestamp!.getTime()).toBe(timestamp.getTime());
    expect(instance.forceDoorRelayOn).toBe(true);
});

test("deserialize_manualExample", () => {
    const deserialized = GetDeviceStatusCommand18H.deserialize(
        Uint8Array.from([0x20, 0x2B, 0x0B, 0x08, 0x04, 0x00, 0x01, 0x12, 0x00]));

    expect(deserialized.instance.timestamp!.getTime()).toBe(new Date(2018, 3, 8, 11, 43, 32).getTime());
    expect(deserialized.instance.forceDoorRelayOn).toBe(false);
});
