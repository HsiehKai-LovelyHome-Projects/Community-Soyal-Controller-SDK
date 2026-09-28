import {composeCardUID, composeUInt16MSBLSB} from "../Commons";
import {PacketFormatError} from "../Errors";
import {DeviceEchoResponse03H} from "./DeviceEchoResponse03H";
import {AccessControlMode} from "../command/SetCardContentCommand83H";

// AccessControlMode[x] would name 0 "MIN" and 3 "MAX"
const ACCESS_CONTROL_MODE_NAMES = ["INVALID", "READ_ONLY", "CARD_OR_PIN", "CARD_AND_PIN"];

/**
 * A user slot as stored on the reader, refer to 3.1.
 */
export class UserRecord {
    public constructor(public readonly address: number,
                       public readonly siteCode: number,
                       public readonly cardCode: number,
                       public readonly pin: number,
                       public readonly modeByte: number,
                       public readonly zone: number,
                       public readonly highTagID?: number) {
    }

    public get cardUID(): number {
        return composeCardUID(this.siteCode, this.cardCode);
    }

    public get mode(): AccessControlMode {
        return this.modeByte & 0b11;
    }

    public get antiPassBackEnabled(): boolean {
        return (this.modeByte & 0x80) !== 0;
    }

    public toJSON() {
        return {
            address: this.address,
            cardUID: this.cardUID,
            pin: this.pin,
            mode: ACCESS_CONTROL_MODE_NAMES[this.mode],
            antiPassBackEnabled: this.antiPassBackEnabled,
            zone: this.zone,
            highTagID: this.highTagID,
        };
    }
}

/**
 * 2.20 echo: per user [site H] [site L] [card H] [card L] [PIN H] [PIN L] [mode] [zone] ([Sony tag bit 41~32, 2 bytes])
 */
export class CardContentResponse {
    private static readonly RECORD_LENGTH = 8;
    private static readonly SONY_RECORD_LENGTH = 10;

    public constructor(public readonly users: UserRecord[]) {
    }

    public static deserialize(response: DeviceEchoResponse03H, firstAddress: number, count: number): CardContentResponse {
        const data = response.data;
        const recordLength = data.length / count;
        if (recordLength !== CardContentResponse.RECORD_LENGTH && recordLength !== CardContentResponse.SONY_RECORD_LENGTH) {
            throw new PacketFormatError(`unexpected user data length ${data.length} for ${count} users`);
        }

        const users: UserRecord[] = [];
        for (let i = 0; i < count; i++) {
            const record = data.subarray(i * recordLength, (i + 1) * recordLength);
            users.push(new UserRecord(firstAddress + i,
                composeUInt16MSBLSB(record[0], record[1]),
                composeUInt16MSBLSB(record[2], record[3]),
                composeUInt16MSBLSB(record[4], record[5]),
                record[6], record[7],
                recordLength === CardContentResponse.SONY_RECORD_LENGTH ?
                    composeUInt16MSBLSB(record[8], record[9]) : undefined));
        }

        return new CardContentResponse(users);
    }
}
