export const MAX_UINT8 = 0xff;
export const MAX_UINT16 = 0xffff;

export const MAX_CARD_UID = 0xFFFFFFFFFF; // 40 bits

export function assertUnreachable(x: never): never {
    throw new Error("Didn't expect to get here");
}

export function composeUInt16MSBLSB(msb: number, lsb: number): number {
    return (msb << 8) + lsb;
}

/**
 * 0x1234 -> [0x12 0x34]
 */
export function getBytesFromUInt16BE(value: number): Array<number> {
    const result = new Array<number>(2);
    for (let count = 0; count < result.length; count++) {
        result[count] = value & MAX_UINT8;
        value >>= 8;
    }

    return result;
}

/**
 * 0x12345678 -> [0x12 0x34 0x56 0x78]
 */
export function getBytesFromUInt32BE(value: number): Array<number> {
    const result = new Array<number>(4);
    for (let count = 0; count < result.length; count++) {
        result[count] = value & MAX_UINT8;
        value >>= 8;
    }

    return result;
}

/**
 * 0x1234567812345678 -> [0x12 0x34 0x56 0x78 0x12 0x34 0x56 0x78]
 */
export function getBytesFromUInt64BE(value: number): Array<number> {
    const result = new Array<number>(8);
    for (let count = 0; count < result.length; count++) {
        result[count] = value & MAX_UINT8;
        value >>= 8;
    }

    return result;
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