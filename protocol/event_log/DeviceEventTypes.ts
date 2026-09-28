import {Serializable} from "../Serializable";

// Kept apart from SoyalDeviceEvent.ts: the payload classes need these at runtime, while SoyalDeviceEvent.ts imports
// the payload classes, a shared module would be a circular import.

// noinspection JSUnusedGlobalSymbols
// refer to Protocol_881E_725Ev2_82xEv5+4V04.pdf::4.2 Function code define table for more detailed
export enum LogEntryEventType {
    PIN_ERROR = 0x01,
    INVALID_CARD = 0x03,

    TIME_ZONE_ERROR = 0x04,

    NORMAL_ACCESS = 0x0B,
    EGRESS = 0x10,
    ALARM_EVENT = 0x11,
    ACCESS_BY_PIN = 0x1c,
    ANTI_PASS_BACK_ERROR = 0x1E,
}

export interface IDeviceEventLogPayload extends Serializable {
    get eventType(): number
}
