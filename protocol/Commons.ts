import {PacketFormatError} from "./Errors";

export const MAX_UINT8 = 0xff;
export const MAX_UINT16 = 0xffff;

export const MAX_UINT32 = 0xffffffff; // 32 bits

export const MAX_CARD_UID = 0xFFFFFFFFFF; // 40 bits


export function assertUnreachable(x: never): never {
    throw new Error("Didn't expect to get here");
}

export function composeUInt16MSBLSB(msb: number, lsb: number): number {
    return (msb << 8) + lsb;
}

/**
 * [ID code (bit 39~32)] [site code (bit 31~16)] [card code (bit 15~0)] -> 40 bits card UID
 *
 * Arithmetic instead of bitwise operations: `site << 16` overflows into the sign bit when site >= 0x8000.
 */
export function composeCardUID(siteCode: number, cardCode: number, idCode: number = 0): number {
    return idCode * 2 ** 32 + siteCode * 2 ** 16 + cardCode;
}


function getBytesFromUIntLE(value: number, valueLength: number): Array<number> {
    if (valueLength > 4) {
        // bitwise operation is supported under 32-bit integer specified by javascript's standard.
        throw new RangeError("given value is too big (max. 32 bits, 4 bytes are supported)");
    }

    const result = new Array<number>(valueLength);
    for (let count = 0; count < result.length; count++) {
        result[count] = value & MAX_UINT8;
        value >>= 8;
    }

    return result;
}

/**
 * 0x1234 -> [0x12 0x34]
 */
export function getBytesFromUInt16BE(value: number): Array<number> {
    return getBytesFromUIntLE(value, 2).reverse();
}

/**
 * 0x12345678 -> [0x12 0x34 0x56 0x78]
 */
export function getBytesFromUInt32BE(value: number): Array<number> {
    return getBytesFromUIntLE(value, 4).reverse();
}

/**
 * 0x0123456789 -> [0x01 0x23 0x45 0x67 0x89]
 */
export function getBytesFromUInt40BE(value: number): Array<number> {
    const result = getBytesFromUIntLE(value & MAX_UINT32, 4);
    result.push(Math.floor(value / 2 ** 32));

    return result.reverse();
}

export function timestampFromSoyalFormat(buffer: Uint8Array): Date {
    const year = buffer[6] + 2000;
    const month = buffer[5] - 1;
    const date = buffer[4];
    const hour = buffer[2];
    const minute = buffer[1];
    const second = buffer[0];

    return new Date(year, month, date, hour, minute, second);
}

/**
 * payload[0] = timestamp.getSeconds(); // Second: 0 - 59
 * payload[1] = timestamp.getMinutes(); // Minute: 0 - 59
 * payload[2] = timestamp.getHours(); // Hour: 0 - 23
 * payload[3] = timestamp.getDay() + 1; // Weekday: 1 - 7
 * payload[4] = timestamp.getDate(); // Day: 1 - 31
 * payload[5] = timestamp.getMonth() + 1; // Month: 1 - 12
 * payload[6] = timestamp.getDay() + 1;
 * payload[7] = timestamp.getFullYear() % 100;
 */
export function timestamp2SoyalFormat(timestamp: Date): Array<number> {
    const payload = new Array<number>(9);

    payload[0] = timestamp.getSeconds(); // Second: 0 - 59
    payload[1] = timestamp.getMinutes(); // Minute: 0 - 59
    payload[2] = timestamp.getHours(); // Hour: 0 - 23
    payload[3] = timestamp.getDay() + 1; // Weekday: 1 - 7
    payload[4] = timestamp.getDate(); // Day: 1 - 31
    payload[5] = timestamp.getMonth() + 1; // Month: 1 - 12
    payload[6] = timestamp.getFullYear() % 100;

    return payload;
}

export function visualizeByte(number: number): string {
    if (number > MAX_UINT8) {
        throw new RangeError("given number is too big (support uint8)");
    }

    return number.toString(16).toUpperCase() + "H";
}

export function checkUnsignedField(value: number, maxValue: number) {
    if (value < 0) {
        throw new PacketFormatError(`given value (${value}) is a negative value`);
    }

    if (value > maxValue) {
        throw new PacketFormatError(`given value (${value}) is out of range`);
    }
}

export function checkBufferLength(buffer: Uint8Array, required: number) {
    if (buffer.length < required) {
        throw new PacketFormatError("buffer length is too short");
    }
}