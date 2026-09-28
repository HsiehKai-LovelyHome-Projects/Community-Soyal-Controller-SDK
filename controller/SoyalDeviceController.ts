import {SoyalHeader, SoyalProtocol} from "../protocol/SoyalProtocol";
import {SoyalCommand, SoyalCommandCode} from "../protocol/command/SoyalCommand";
import {GetOldestDeviceEventLogCommand25H} from "../protocol/command/GetOldestDeviceEventLogCommand25H";
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
    /** check the reader answers when opening the port, releasing it with a zero burst if it does not, default true */
    checkReaderOnOpen?: boolean;
    /**
     * On open, the reader is first probed with 25H (read the oldest event log, which consumes nothing); only when it
     * does not answer within this time is it assumed stuck and sent the zero burst. Default 1000 ms. A timeout while
     * running only fails its request: recovery happens when reopening, e.g. after the application restarted.
     */
    probeTimeoutMs?: number;
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
    private static readonly DEFAULT_DRAIN_TIMEOUT_MS = 5000;

    private readonly serialOptions: SerialPortOpenOptions<any>;
    private readonly requestTimeoutMs: number;
    private readonly interTransactionDelayMs: number;
    private readonly checkReaderOnOpen: boolean;
    private readonly probeTimeoutMs: number;
    private readonly onSerialError?: (err: Error) => void | Promise<void>;

    private port: SerialPortStream<any> | null = null;
    private readonly parser: SoyalFrameParser;

    private readonly queues: Record<TransactionPriority, Transaction[]> = {
        [TransactionPriority.NORMAL]: [],
        [TransactionPriority.LOW]: [],
    };
    private pumping = false;
    private closing = false;
    private idleWaiters: (() => void)[] = [];

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
        this.checkReaderOnOpen = options.checkReaderOnOpen ?? true;
        this.probeTimeoutMs = options.probeTimeoutMs ?? 1000;
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
        port.on("error", (err: Error) => {
            console.error(`[SOYAL_CONTROLLER] Protocol error:`, err);
            // a failing handler must not become an unhandled rejection, which stops the process
            Promise.resolve()
                .then(() => this.onSerialError?.(err))
                .catch(handlerErr => console.error("[SOYAL_CONTROLLER] Serial error handler failed:", handlerErr));
        });

        if (this.checkReaderOnOpen) {
            try {
                await this.checkReader(port);
            } catch (err) {
                port.close();
                throw err;
            }
        }

        this.port = port;
    }

    /**
     * Close the port once the transaction on the wire and the ones already queued have completed, so a started
     * sequence is not cut in the middle. New transactions are refused from now on. Transactions still queued after
     * `drainTimeoutMs` are rejected.
     */
    public async close(options: { drainTimeoutMs?: number } = {}): Promise<void> {
        const port = this.port;
        if (port === null || this.closing) {
            return;
        }

        this.closing = true;
        try {
            if (!await this.waitIdle(options.drainTimeoutMs ?? SoyalDeviceController.DEFAULT_DRAIN_TIMEOUT_MS)) {
                console.warn("[SOYAL_CONTROLLER] Closing with transactions still pending");
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
        } finally {
            this.closing = false;
        }
    }

    private get idle(): boolean {
        return !this.pumping && Object.values(this.queues).every(queue => queue.length === 0);
    }

    /** resolves true once no transaction is running nor queued, false on timeout */
    private waitIdle(timeoutMs: number): Promise<boolean> {
        if (this.idle) {
            return Promise.resolve(true);
        }

        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this.idleWaiters = this.idleWaiters.filter(waiter => waiter !== onIdle);
                resolve(false);
            }, timeoutMs);
            const onIdle = () => {
                clearTimeout(timer);
                resolve(true);
            };
            this.idleWaiters.push(onIdle);
        });
    }

    /**
     * Queue a request, resolves with the response frame, or undefined when no response is expected.
     * Rejects with {@link DeviceNoResponse} on timeout; nothing else is sent, a reader which keeps timing out is
     * recovered by reopening the controller.
     */
    public transact(packet: Uint8Array, options: TransactionOptions = {}): Promise<Uint8Array | undefined> {
        if (this.port === null) {
            return Promise.reject(new Error("controller is not opened yet"));
        }
        if (this.closing) {
            return Promise.reject(new Error("controller is closing"));
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
     * Make sure the reader listens: probe it, and only when it does not answer (it may be stuck in a half received
     * frame, e.g. after a cable issue) send the zero burst.
     */
    private async checkReader(port: SerialPortStream<any>): Promise<void> {
        this.parser.reset();
        if (await this.probe(port)) {
            return;
        }

        console.warn("[SOYAL_CONTROLLER] The reader does not answer, flushing the link");
        this.parser.reset();
        await this.write(new Uint8Array(SoyalDeviceController.FLUSH_LENGTH), port);
    }

    private async probe(port: SerialPortStream<any>): Promise<boolean> {
        const command = new SoyalCommand(SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG_25H,
            new GetOldestDeviceEventLogCommand25H());
        await this.write(new SoyalProtocol(this.header, this.deviceID, command.serialize()).serialize(), port);

        try {
            // any answer of this reader proves it listens: an ACK (no event) or an event log
            await this.waitFrame(this.probeTimeoutMs, this.deviceID);
            return true;
        } catch (err) {
            if (err instanceof DeviceNoResponse) {
                return false;
            }
            throw err;
        }
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
            for (const waiter of this.idleWaiters.splice(0)) {
                waiter();
            }
        }
    }

    private async execute(transaction: Transaction): Promise<Uint8Array | undefined> {
        this.discardUnsolicitedFrames();
        await this.write(transaction.packet);

        if (!transaction.expectResponse) {
            return undefined;
        }

        try {
            return await this.waitFrame(transaction.timeoutMs, transaction.expectedReaderID,
                transaction.expectedFunctionCodes);
        } catch (err) {
            if (err instanceof DeviceNoResponse) {
                // drop what was received of the missing answer; recovering a stuck reader is left to reopening
                this.parser.reset();
            }
            throw err;
        }
    }

    private write(data: Uint8Array, port: SerialPortStream<any> | null = this.port): Promise<void> {
        if (port === null) {
            return Promise.reject(new Error("controller is closed"));
        }

        return new Promise((resolve, reject) => {
            port.write(Buffer.from(data), (err: Error | null | undefined) => err ? reject(err) : resolve());
        });
    }

    private waitFrame(timeoutMs: number, expectedReaderID: number,
                      expectedFunctionCodes?: readonly number[]): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.frameWaiter = null; // a late response must not be taken by the next transaction
                reject(new DeviceNoResponse("Device request timed out."));
            }, timeoutMs);

            this.frameWaiter = frame => {
                // [head] [length] [destination] [function code] [reader ID] ...
                const functionCode = frame[this.header.length + 2];
                const readerID = frame[this.header.length + 3];
                if (readerID !== expectedReaderID) {
                    SoyalDeviceController.warnDiscarded("foreign reader", frame);
                    return;
                }
                if (expectedFunctionCodes && !expectedFunctionCodes.includes(functionCode)) {
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
