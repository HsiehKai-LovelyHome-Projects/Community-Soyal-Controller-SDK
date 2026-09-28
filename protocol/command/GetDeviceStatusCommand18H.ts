import {PacketFormatError} from "../Errors";
import {DeserializeResult} from "../Serializable";
import {ISoyalCommandPayload} from "./SoyalCommand";

/**
 * Optional payload layout (9 bytes), refer to 2.1.1:
 * [Second] [Minute] [Hour] [Day] [Month] [0x00] [Weekday] [Year] [Flags]
 *
 * Flags bit 0 forces the door relay on. It must stay cleared unless explicitly requested, otherwise the device opens
 * the door on every poll.
 */
export class GetDeviceStatusCommand18H implements ISoyalCommandPayload {
    public static readonly TIMESTAMP_PAYLOAD_LENGTH = 9;
    public static readonly FLAG_FORCE_DOOR_RELAY_ON = 0b00000001;

    public readonly timestamp?: Date;
    public readonly forceDoorRelayOn: boolean;

    public constructor(timestamp ?: Date, forceDoorRelayOn: boolean = false) {
        if (forceDoorRelayOn && timestamp === undefined) {
            throw new PacketFormatError("forceDoorRelayOn requires a timestamp");
        }

        this.timestamp = timestamp;
        this.forceDoorRelayOn = forceDoorRelayOn;
    }

    public static deserialize(payload: Uint8Array): DeserializeResult<GetDeviceStatusCommand18H> {
        if (payload.length == 0) {
            return {
                instance: new GetDeviceStatusCommand18H(),
                bufferConsumed: 0,
            };
        }

        if (payload.length < GetDeviceStatusCommand18H.TIMESTAMP_PAYLOAD_LENGTH) {
            throw new PacketFormatError("buffer length is too short");
        }

        // we can not apply std util function here, since the date format here is not standard
        const second = payload[0];
        const minute = payload[1];
        const hour = payload[2];
        const date = payload[3];
        const month = payload[4] - 1;
        const year = payload[7] + 2000;
        const forceDoorRelayOn = (payload[8] & GetDeviceStatusCommand18H.FLAG_FORCE_DOOR_RELAY_ON) !== 0;

        const timestamp = new Date(year, month, date, hour, minute, second);

        return {
            instance: new GetDeviceStatusCommand18H(timestamp, forceDoorRelayOn),
            bufferConsumed: GetDeviceStatusCommand18H.TIMESTAMP_PAYLOAD_LENGTH,
        };
    }

    public serialize(): Uint8Array {
        if (this.timestamp === undefined) {
            return new Uint8Array(0);
        }

        const payload = new Uint8Array(GetDeviceStatusCommand18H.TIMESTAMP_PAYLOAD_LENGTH);
        payload[0] = this.timestamp.getSeconds(); // Second: 0 - 59
        payload[1] = this.timestamp.getMinutes(); // Minute: 0 - 59
        payload[2] = this.timestamp.getHours(); // Hour: 0 - 23
        payload[3] = this.timestamp.getDate(); // Day: 1 - 31
        payload[4] = this.timestamp.getMonth() + 1; // Month: 1 - 12
        payload[5] = 0; // must be zero
        payload[6] = this.timestamp.getDay() + 1; // Weekday: 1 - 7 (SUN - SAT)
        payload[7] = this.timestamp.getFullYear() % 100; // Year: 0 - 99
        payload[8] = this.forceDoorRelayOn ? GetDeviceStatusCommand18H.FLAG_FORCE_DOOR_RELAY_ON : 0;

        return payload;
    }
}
