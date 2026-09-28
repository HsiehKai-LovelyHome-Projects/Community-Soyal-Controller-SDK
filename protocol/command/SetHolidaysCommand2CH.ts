import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";

export interface Holiday {
    month: number; // 1~12
    day: number; // 1~31
}

/**
 * 2.25: [first index] [number of holidays] then [month] [day] per holiday, answered with an ACK.
 * 120 holidays available; the manual asks to sort them, earliest first, and fill the rest with zeros.
 */
export class SetHolidaysCommand2CH implements ISoyalCommandPayload {
    public static readonly CAPACITY = 120;

    public readonly startIndex: number;
    public readonly holidays: Holiday[];

    public constructor(startIndex: number, holidays: Holiday[]) {
        checkUnsignedField(startIndex, SetHolidaysCommand2CH.CAPACITY - 1);
        if (startIndex + holidays.length > SetHolidaysCommand2CH.CAPACITY) {
            throw new PacketFormatError(`only ${SetHolidaysCommand2CH.CAPACITY} holidays can be stored`);
        }
        for (const holiday of holidays) {
            // 0/0 fills unused slots
            checkUnsignedField(holiday.month, 12);
            checkUnsignedField(holiday.day, 31);
        }

        this.startIndex = startIndex;
        this.holidays = holidays;
    }

    /** the whole table, sorted and zero filled as the manual recommends */
    public static table(holidays: Holiday[]): SetHolidaysCommand2CH {
        const sorted = [...holidays].sort((a, b) => a.month - b.month || a.day - b.day);
        while (sorted.length < SetHolidaysCommand2CH.CAPACITY) {
            sorted.push({month: 0, day: 0});
        }

        return new SetHolidaysCommand2CH(0, sorted);
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetHolidaysCommand2CH> {
        checkBufferLength(buffer, 2);
        const count = buffer[1];
        checkBufferLength(buffer, 2 + count * 2);

        const holidays: Holiday[] = [];
        for (let i = 0; i < count; i++) {
            holidays.push({month: buffer[2 + i * 2], day: buffer[3 + i * 2]});
        }

        return {
            instance: new SetHolidaysCommand2CH(buffer[0], holidays),
            bufferConsumed: 2 + count * 2,
        };
    }

    public serialize(): Uint8Array {
        return Uint8Array.from([this.startIndex, this.holidays.length,
            ...this.holidays.flatMap(holiday => [holiday.month, holiday.day])]);
    }
}
