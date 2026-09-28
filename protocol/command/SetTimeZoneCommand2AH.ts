import {ISoyalCommandPayload} from "./SoyalCommand";
import {checkBufferLength, checkUnsignedField, composeUInt16MSBLSB, getBytesFromUInt16BE, MAX_UINT8} from "../Commons";
import {DeserializeResult} from "../Serializable";
import {PacketFormatError} from "../Errors";

export interface TimeRange {
    beginMinute: number; // minutes since 00:00, e.g. 08:00 = 480
    endMinute: number;
}

/**
 * 3.2 time zone. Zone 0 is the auto-shift (duty) zone, refer to 2.24.1.
 */
export interface TimeZone {
    /** index of the next linked time zone (bit 6~0 of link) */
    nextLink: number;
    /** the zone is also valid on holidays (bit 7 of link) */
    availableOnHolidays: boolean;
    /** users pass only when their level is higher than the zone level */
    level: number;
    /** 7 ranges, Sunday first */
    weekly: TimeRange[];
}

/**
 * 2.24: [first index] [number of zones] then per zone [link] [level] 7 x ([begin H] [begin L] [end H] [end L]),
 * answered with an ACK.
 *
 * The manual describes a 32 bytes structure with 2 reserved bytes, but its example (length 24H, XOR BE, SUM CF) only
 * carries 30 bytes per zone: the reserved bytes are not transmitted.
 */
export class SetTimeZoneCommand2AH implements ISoyalCommandPayload {
    public static readonly ZONE_LENGTH = 30;
    public static readonly MAX_INDEX = 63; // 11 zones on 1024 users firmware, 64 on 3072 users firmware
    public static readonly MAX_MINUTE = 24 * 60 - 1;
    /** zones fitting in one frame (length byte <= 255) */
    public static readonly MAX_ZONES_PER_COMMAND = 8;

    public readonly startIndex: number;
    public readonly zones: TimeZone[];

    public constructor(startIndex: number, zones: TimeZone[]) {
        checkUnsignedField(startIndex, SetTimeZoneCommand2AH.MAX_INDEX);
        if (zones.length === 0 || zones.length > SetTimeZoneCommand2AH.MAX_ZONES_PER_COMMAND) {
            throw new PacketFormatError(`1 to ${SetTimeZoneCommand2AH.MAX_ZONES_PER_COMMAND} zones per command`);
        }
        checkUnsignedField(startIndex + zones.length - 1, SetTimeZoneCommand2AH.MAX_INDEX);

        for (const zone of zones) {
            checkUnsignedField(zone.nextLink, 0x7F);
            checkUnsignedField(zone.level, MAX_UINT8);
            if (zone.weekly.length !== 7) {
                throw new PacketFormatError("a time zone needs 7 daily ranges, Sunday first");
            }
            for (const range of zone.weekly) {
                checkUnsignedField(range.beginMinute, SetTimeZoneCommand2AH.MAX_MINUTE);
                checkUnsignedField(range.endMinute, SetTimeZoneCommand2AH.MAX_MINUTE);
            }
        }

        this.startIndex = startIndex;
        this.zones = zones;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<SetTimeZoneCommand2AH> {
        checkBufferLength(buffer, 2);
        const count = buffer[1];
        const length = 2 + count * SetTimeZoneCommand2AH.ZONE_LENGTH;
        checkBufferLength(buffer, length);

        const zones: TimeZone[] = [];
        for (let i = 0; i < count; i++) {
            const zone = buffer.subarray(2 + i * SetTimeZoneCommand2AH.ZONE_LENGTH);
            const weekly: TimeRange[] = [];
            for (let day = 0; day < 7; day++) {
                const offset = 2 + day * 4;
                weekly.push({
                    beginMinute: composeUInt16MSBLSB(zone[offset], zone[offset + 1]),
                    endMinute: composeUInt16MSBLSB(zone[offset + 2], zone[offset + 3]),
                });
            }

            zones.push({
                nextLink: zone[0] & 0x7F,
                availableOnHolidays: (zone[0] & 0x80) !== 0,
                level: zone[1],
                weekly,
            });
        }

        return {
            instance: new SetTimeZoneCommand2AH(buffer[0], zones),
            bufferConsumed: length,
        };
    }

    public serialize(): Uint8Array {
        const packet = [this.startIndex, this.zones.length];
        for (const zone of this.zones) {
            packet.push((zone.availableOnHolidays ? 0x80 : 0) | zone.nextLink, zone.level);
            for (const range of zone.weekly) {
                packet.push(...getBytesFromUInt16BE(range.beginMinute), ...getBytesFromUInt16BE(range.endMinute));
            }
        }

        return Uint8Array.from(packet);
    }
}
