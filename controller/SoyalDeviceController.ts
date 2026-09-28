import {SoyalHeader} from "../protocol/SoyalProtocol";
import {SerialPort, SerialPortOpenOptions} from "serialport";
import {Ar721hMock} from "./mocks/Ar721hMock";
import {SerialPortStream} from "@serialport/stream";
import {SoyalFrameParser} from "./common/SoyalFrameParser";
import {DeviceNoResponse} from "../protocol/Errors";

export enum TransactionPriority {
    NORMAL,
    LOW, // e.g. status polling, served only when no normal transaction waits
}

export interface TransactionOptions {
    /** false for commands the device never answers (04H, 05H, 81H), default true */
    expectResponse?: boolean;
    timeoutMs?: number;
    priority?: TransactionPriority;
    /**
     * Function codes (first payload byte) a response may carry, other frames are discarded as stale.
     * Responses carry no request identifier, this keeps a late response of a timed out request from being taken
     * as the response of the next one. Default: any.
     */
    expectedFunctionCodes?: readonly number[];
    /** reader ID the response must carry, default: the controller device ID (80H answers with the new ID) */
    expectedReaderID?: number;
}

export interface SoyalDeviceControllerOptions {
    requestTimeoutMs?: number;
    /** idle time between two transactions, gives the device time to breathe */
    interTransactionDelayMs?: number;
    /** send a zero burst after opening the port, to release a reader stuck in a half received frame */
    flushOnOpen?: boolean;
    /** errors raised by the serial port itself (unplugged adapter, ...) */
    onSerialError?: (err: Error) => void | Promise<void>;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface Transaction {
    packet: Uint8Array;
    expectResponse: boolean;
    timeoutMs: number;
    expectedFunctionCodes?: readonly number[];
    expectedReaderID: number;
    resolve:(frame: Uint8Array | undefined) => void;
    reject: (err: Error) => void;
}

/**
 * The serial link to one Soyal reader. The link is half-duplex and responses carry no request identifier, so
 * transactions are strictly serialized: one request on the wire at a time, its response is the next frame received.
 */
export class SoyalDeviceController {
    /**
     * The reader waits for `length` bytes after a head and a length byte, zeros are ignored while idle. A burst this
     * long completes any partial frame (failing its checksum) whatever state the reader is in.
     */
    public static readonly FLUSH_LENGTH = 1 /* length byte */ + 255 + 1;

    private static readonly HOST_ID = 0x00;

    private readonly serialOptions: SerialPortOpenOptions<any>;
    private readonly requestTimeoutMs: number;
    private readonly interTransactionDelayMs: number;
    private readonly flushOnOpen: boolean;
    private readonly onSerialError?: (err: Error) => void | Promise<void>;

    private port: SerialPortStream<any> | null = null;
    private readonly parser: SoyalFrameParser;

    private readonly queues: Record<TransactionPriority, Transaction[]> = {
        [TransactionPriority.NORMAL]: [],
        [TransactionPriority.LOW]: [],
    };
    private pumping = false;

    private frameWaiter: ((frame: Uint8Array) => void) | null = null;
    private unsolicitedFrames: Uint8Array[] = [];

    public constructor(devicePath: string,
                       public readonly deviceID: number, public readonly header: SoyalHeader,
                       options: SoyalDeviceControllerOptions = {}) {
        this.serialOptions = {
            path: devicePath,
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            autoOpen: false,
        };
        this.requestTimeoutMs = options.requestTimeoutMs ?? 3000;
        this.interTransactionDelayMs = options.interTransactionDelayMs ?? 20;
        this.flushOnOpen = options.flushOnOpen ?? true;
        this.onSerialError = options.onSerialError;
        this.parser = new SoyalFrameParser(header);
    }

    public get isOpen(): boolean {
        return this.port !== null;
    }

    public async open(): Promise<void> {
        if (this.port !== null) {
            return;
        }

        const port = this.serialOptions.path.startsWith('/dev/mock') ?
            new Ar721hMock(this.serialOptions) :
            new SerialPort(this.serialOptions);

        await new Promise<void>((resolve, reject) => {
            port.open(err => {
                if (err) {
                    console.error("Failed to open Soyal controller:", err);
                    reject(err);
                } else {
                    console.log(`Soyal controller opened (${this.serialOptions.path})`);
                    resolve();
                }
            });
        });

        port.on("data", (data: Buffer) => this.onData(data));
        port.on("error", async (err: Error) => {
            console.error(`[SOYAL_CONTROLLER] Protocol error:`, err);
            await this.onSerialError?.(err);
        });

        this.port = port;

        if (this.flushOnOpen) {
            await this.flush();
        }
    }

    public async close(): Promise<void> {
        const port = this.port;
        if (port === null) {
            return;
        }

        this.port = null;
        for (const queue of Object.values(this.queues)) {
            for (const transaction of queue.splice(0)) {
                transaction.reject(new Error("controller closed"));
            }
        }

        await new Promise<void>((resolve, reject) => {
            port.close(err => err ? reject(err) : resolve());
        });
    }

    /**
     * Queue a request, resolves with the response frame, or undefined when no response is expected.
     * Rejects with {@link DeviceNoResponse} on timeout, after the link is flushed.
     */
    public transact(packet: Uint8Array, options: TransactionOptions = {}): Promise<Uint8Array | undefined> {
        if (this.port === null) {
            return Promise.reject(new Error("controller is not opened yet"));
        }

        return new Promise((resolve, reject) => {
            this.queues[options.priority ?? TransactionPriority.NORMAL].push({
                packet,
                expectResponse: options.expectResponse ?? true,
                timeoutMs: options.timeoutMs ?? this.requestTimeoutMs,
                expectedFunctionCodes: options.expectedFunctionCodes,
                expectedReaderID: options.expectedReaderID ?? this.deviceID,
                resolve,
                reject,
            });

            this.pump();
        });
    }

    /**
     * Release a reader stuck in a half received frame (e.g. after a cable issue), queued like a transaction.
     */
    public async flush(): Promise<void> {
        await this.transact(new Uint8Array(SoyalDeviceController.FLUSH_LENGTH), {expectResponse: false});
    }

    private nextTransaction(): Transaction | undefined {
        return this.queues[TransactionPriority.NORMAL].shift() ?? this.queues[TransactionPriority.LOW].shift();
    }

    private async pump() {
        if (this.pumping) {
            return;
        }

        this.pumping = true;
        try {
            await Promise.resolve(); // let requests issued in the same tick be queued, so priorities apply

            let transaction: Transaction | undefined;
            while ((transaction = this.nextTransaction()) !== undefined) {
                try {
                    transaction.resolve(await this.execute(transaction));
                } catch (err) {
                    transaction.reject(err instanceof Error ? err : new Error(`${err}`));
                }

                await delay(this.interTransactionDelayMs);
            }
        } finally {
            this.pumping = false;
        }
    }

    private async execute(transaction: Transaction): Promise<Uint8Array | undefined> {
        this.discardUnsolicitedFrames();
        await this.write(transaction.packet);

        if (!transaction.expectResponse) {
            return undefined;
        }

        try {
            return await this.waitFrame(transaction);
        } catch (err) {
            if (err instanceof DeviceNoResponse) {
                // the request may have been swallowed by a stuck reader, release it for the next transaction
                this.parser.reset();
                await this.write(new Uint8Array(SoyalDeviceController.FLUSH_LENGTH));
            }
            throw err;
        }
    }

    private write(data: Uint8Array): Promise<void> {
        const port = this.port;
        if (port === null) {
            return Promise.reject(new Error("controller is closed"));
        }

        return new Promise((resolve, reject) => {
            port.write(Buffer.from(data), (err: Error | null | undefined) => err ? reject(err) : resolve());
        });
    }

    private waitFrame(transaction: Transaction): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.frameWaiter = null; // a late response must not be taken by the next transaction
                reject(new DeviceNoResponse("Device request timed out."));
            }, transaction.timeoutMs);

            this.frameWaiter = frame => {
                // [head] [length] [destination] [function code] [reader ID] ...
                const functionCode = frame[this.header.length + 2];
                const readerID = frame[this.header.length + 3];
                if (readerID !== transaction.expectedReaderID) {
                    SoyalDeviceController.warnDiscarded("foreign reader", frame);
                    return;
                }
                if (transaction.expectedFunctionCodes && !transaction.expectedFunctionCodes.includes(functionCode)) {
                    SoyalDeviceController.warnDiscarded("unexpected function code", frame);
                    return;
                }

                clearTimeout(timer);
                this.frameWaiter = null;
                resolve(frame);
            };
        });
    }

    private onData(data: Buffer) {
        for (const frame of this.parser.push(data)) {
            const destinationID = frame[this.header.length + 1];
            if (destinationID !== SoyalDeviceController.HOST_ID) {
                continue; // not addressed to the host, e.g. an RS-485 adapter echoing our own requests
            }

            if (this.frameWaiter) {
                this.frameWaiter(frame);
            } else {
                this.unsolicitedFrames.push(frame);
            }
        }
    }

    private static warnDiscarded(reason: string, frame: Uint8Array) {
        console.warn(`[SOYAL_CONTROLLER] Discarded a frame (${reason}): ${Buffer.from(frame).toString("hex")}`);
    }

    private discardUnsolicitedFrames() {
        for (const frame of this.unsolicitedFrames.splice(0)) {
            SoyalDeviceController.warnDiscarded("unsolicited or late", frame);
        }
    }
}
