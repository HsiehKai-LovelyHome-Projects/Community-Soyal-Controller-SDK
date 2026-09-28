import {SerialPortMock} from "serialport";
import {SerialPortMockOpenOptions} from "serialport/dist/serialport-mock";
import {ErrorCallback} from "@serialport/stream";
import {SoyalDeviceEmulator} from "./SoyalDeviceEmulator";

export interface SerialLinkFaults {
    /** delay before the first byte of a response, default 0 */
    responseDelayMs?: number;
    /** split every response into chunks of this size to emulate bus jitter, default: whole response at once */
    responseChunkSize?: number;
    /** delay between two chunks, default 0 */
    interChunkDelayMs?: number;
}

/**
 * Serial port bound to a {@link SoyalDeviceEmulator}. Paths starting with `/dev/mock` are routed here by
 * `SoyalDeviceController`.
 *
 * Device state lives per path and survives re-opening the port, like a real device survives a reconnect:
 * ```
 * const emulator = Ar721hMock.emulatorAt("/dev/mock-test");
 * emulator.presentCard(0x636BB8B4);
 * Ar721hMock.instanceAt("/dev/mock-test")!.cutCableAfter(3); // after the controller opened the port
 * ```
 */
export class Ar721hMock extends SerialPortMock {
    private static readonly emulators = new Map<string, SoyalDeviceEmulator>();
    private static readonly instances = new Map<string, Ar721hMock>();

    public readonly emulator: SoyalDeviceEmulator;
    public faults: SerialLinkFaults = {};

    private bytesUntilCableCut?: number;

    public constructor(options: SerialPortMockOpenOptions, openCallback?: ErrorCallback) {
        SerialPortMock.binding.createPort(options.path);

        super(options, openCallback);

        this.emulator = Ar721hMock.emulatorAt(options.path);
        Ar721hMock.instances.set(options.path, this);
    }

    public static emulatorAt(path: string): SoyalDeviceEmulator {
        let emulator = Ar721hMock.emulators.get(path);
        if (!emulator) {
            emulator = new SoyalDeviceEmulator();
            Ar721hMock.emulators.set(path, emulator);
        }

        return emulator;
    }

    public static instanceAt(path: string): Ar721hMock | undefined {
        return Ar721hMock.instances.get(path);
    }

    /** forget all emulated devices, call it between tests */
    public static reset() {
        Ar721hMock.emulators.clear();
        Ar721hMock.instances.clear();
        SerialPortMock.binding.reset();
    }

    /**
     * Only the next `bytes` bytes written by the host reach the device, the rest of that write is lost, e.g. a cable
     * unplugged in the middle of a frame. The device is then stuck waiting for the rest of the frame.
     */
    public cutCableAfter(bytes: number) {
        this.bytesUntilCableCut = bytes;
    }

    /** emit arbitrary bytes towards the host, e.g. line noise */
    public injectNoise(bytes: Uint8Array) {
        this.emitToHost(bytes);
    }

    public write(buffer: Uint8Array): boolean {
        let bytes = Uint8Array.from(buffer);

        if (this.bytesUntilCableCut !== undefined) {
            bytes = bytes.subarray(0, this.bytesUntilCableCut);
            this.bytesUntilCableCut = undefined;
        }

        for (const response of this.emulator.receive(bytes)) {
            this.sendResponse(response);
        }

        return true;
    }

    private sendResponse(response: Uint8Array) {
        const chunkSize = this.faults.responseChunkSize ?? response.length;
        let delay = this.faults.responseDelayMs ?? 0;

        for (let offset = 0; offset < response.length; offset += chunkSize) {
            const chunk = response.slice(offset, offset + chunkSize);
            setTimeout(() => this.emitToHost(chunk), delay);
            delay += this.faults.interChunkDelayMs ?? 0;
        }
    }

    private emitToHost(bytes: Uint8Array) {
        if (this.port) {
            this.port.emitData(Buffer.from(bytes));
        }
    }
}
