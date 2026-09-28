import {afterEach, beforeEach, expect, test} from "@jest/globals";
import {SoyalDeviceController, TransactionPriority} from "./SoyalDeviceController";
import {SOYAL_PROTOCOL_SHORT, SoyalProtocol} from "../protocol/SoyalProtocol";
import {GetDeviceStatusCommand18H} from "../protocol/command/GetDeviceStatusCommand18H";
import {SoyalCommand, SoyalCommandCode} from "../protocol/command/SoyalCommand";
import {Ar721hMock} from "./mocks/Ar721hMock";
import {DeviceNoResponse} from "../protocol/Errors";
import {SoyalFunctionCode} from "../protocol/response/SoyalResponse";


let path: string;
let controller: SoyalDeviceController;
let testIndex = 0;

function packet(commandCode: number, payload: Uint8Array = new Uint8Array(0), nodeID: number = 1): Uint8Array {
    return new SoyalProtocol(SOYAL_PROTOCOL_SHORT, nodeID, new SoyalCommand(commandCode, {serialize: () => payload})
        .serialize()).serialize();
}

const POLL = packet(SoyalCommandCode.GET_DEVICE_STATUS_18H, new GetDeviceStatusCommand18H().serialize());

function functionCodeOf(frame: Uint8Array | undefined): number {
    return SoyalProtocol.deserialize(frame!).payload[0];
}

beforeEach(async () => {
    Ar721hMock.reset();
    path = `/dev/mock-controller-${testIndex++}`;
    controller = new SoyalDeviceController(path, 1, SOYAL_PROTOCOL_SHORT,
        {requestTimeoutMs: 200, interTransactionDelayMs: 0});
});

afterEach(async () => {
    await controller.close();
});

test("transact", async () => {
    await controller.open();

    expect(functionCodeOf(await controller.transact(POLL))).toBe(SoyalFunctionCode.DEVICE_STATUS_EVENT);
});

test("transact_jitteredResponse", async () => {
    await controller.open();
    Ar721hMock.instanceAt(path)!.faults = {responseChunkSize: 3, interChunkDelayMs: 5};

    expect(functionCodeOf(await controller.transact(POLL))).toBe(SoyalFunctionCode.DEVICE_STATUS_EVENT);
});

test("transact_concurrentRequestsAreSerialized", async () => {
    await controller.open();
    const emulator = Ar721hMock.emulatorAt(path);

    const results = await Promise.all([
        controller.transact(POLL, {priority: TransactionPriority.LOW}),
        controller.transact(packet(SoyalCommandCode.CONTROL_RELAY_21H, Uint8Array.of(0x82))),
        controller.transact(packet(SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH)),
        controller.transact(packet(SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H), {expectResponse: false}),
    ]);

    expect(results.map(result => result && functionCodeOf(result))).toStrictEqual([
        SoyalFunctionCode.DEVICE_STATUS_EVENT, SoyalFunctionCode.DEVICE_ECHO_RESPONSE,
        SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK, undefined,
    ]);
    // normal priority first, the low priority poll last
    expect(emulator.receivedCommands.map(command => command.command))
        .toStrictEqual([0x21, 0x2D, 0x04, 0x18]);
});

test("transact_droppedResponse_nextRequestGetsItsOwnResponse", async () => {
    await controller.open();
    Ar721hMock.emulatorAt(path).responsesToDrop = 1;

    await expect(controller.transact(POLL)).rejects.toThrow(DeviceNoResponse);
    expect(functionCodeOf(await controller.transact(packet(SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH))))
        .toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);
});

test("transact_lateResponseIsNotTakenByNextRequest", async () => {
    await controller.open();
    const mock = Ar721hMock.instanceAt(path)!;

    mock.faults = {responseDelayMs: 300};
    await expect(controller.transact(POLL, {expectedFunctionCodes: [SoyalFunctionCode.DEVICE_STATUS_EVENT]}))
        .rejects.toThrow(DeviceNoResponse);

    // the late 09H status arrives while waiting for this ACK and must be skipped
    mock.faults = {responseDelayMs: 150};
    const ack = await controller.transact(packet(SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH),
        {expectedFunctionCodes: [SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK]});
    expect(functionCodeOf(ack)).toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);
});

test("transact_cableCutMidFrame_recoversAfterFlush", async () => {
    await controller.open();
    const mock = Ar721hMock.instanceAt(path)!;

    mock.cutCableAfter(3);
    await expect(controller.transact(POLL)).rejects.toThrow(DeviceNoResponse);
    expect(mock.emulator.receiverIdle).toBe(true); // released by the flush following the timeout

    expect(functionCodeOf(await controller.transact(POLL))).toBe(SoyalFunctionCode.DEVICE_STATUS_EVENT);
});

test("open_flushesAReaderStuckFromAPreviousSession", async () => {
    Ar721hMock.emulatorAt(path).receive(POLL.subarray(0, 3)); // stuck before the service starts

    await controller.open();

    expect(functionCodeOf(await controller.transact(POLL))).toBe(SoyalFunctionCode.DEVICE_STATUS_EVENT);
});

test("transact_noiseBeforeResponse", async () => {
    await controller.open();
    Ar721hMock.instanceAt(path)!.injectNoise(Uint8Array.of(0x7E, 0x13, 0x37));

    expect(functionCodeOf(await controller.transact(POLL))).toBe(SoyalFunctionCode.DEVICE_STATUS_EVENT);
});

test("transact_foreignReaderIsIgnored", async () => {
    Ar721hMock.emulatorAt(path).receive(packet(0x80, Uint8Array.of(2))); // re-address the device to node 2
    await controller.open();

    // a broadcast is answered by node 2, which is not the reader of this controller
    await expect(controller.transact(packet(SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH, undefined, 0xFF)))
        .rejects.toThrow(DeviceNoResponse);

    const ack = await controller.transact(packet(SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH, undefined, 0xFF),
        {expectedReaderID: 2});
    expect(functionCodeOf(ack)).toBe(SoyalFunctionCode.DEVICE_ECHO_RESPONSE_ACK);
});
