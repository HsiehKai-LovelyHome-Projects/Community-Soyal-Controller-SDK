import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";
import {ISoyalCommandPayload} from "./SoyalCommand";

export class GetDeviceStatusCommand18H implements ISoyalCommandPayload {
    public readonly timestamp?: Date;

    public constructor(timestamp ?: Date) {
        this.timestamp = timestamp;
    }

    public static deserialize(payload: Uint8Array): DeserializeResult<GetDeviceStatusCommand18H> {
        if (payload.length == 0) {
            return {
                instance: new GetDeviceStatusCommand18H(),
                bufferConsumed: 0,
            };
        }

        if (payload.length < 10) {
            throw new PacketFormatError("buffer length is too short");
        }

        // we can not apply std util function here, since the date format here is not standard
        const year = payload[8] + 2000;
        const month = payload[5] - 1;
        const date = payload[4];
        const hour = payload[2];
        const minute = payload[1];
        const second = payload[0];

        const timestamp = new Date(year, month, date, hour, minute, second);

        return {
            instance: new GetDeviceStatusCommand18H(timestamp),
            bufferConsumed: 10,
        };
    }

    public serialize(): Uint8Array {
        if (this.timestamp === undefined) {
            return new Uint8Array(0);
        } else {
            const payload = new Uint8Array(10);
            payload[0] = this.timestamp.getSeconds(); // Second: 0 - 59
            payload[1] = this.timestamp.getMinutes(); // Minute: 0 - 59
            payload[2] = this.timestamp.getHours(); // Hour: 0 - 23
            payload[3] = this.timestamp.getDay() + 1; // Weekday: 1 - 7
            payload[4] = this.timestamp.getDate(); // Day: 1 - 31
            payload[5] = this.timestamp.getMonth() + 1; // Month: 1 - 12
            payload[6] = 0; // 0x00
            payload[7] = this.timestamp.getDay() + 1;
            payload[8] = this.timestamp.getFullYear() % 100;
            payload[9] = 0; // 0x00

            return payload;
        }
    }
}