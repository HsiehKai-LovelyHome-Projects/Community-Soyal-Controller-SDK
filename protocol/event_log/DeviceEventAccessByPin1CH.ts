import {DeserializeResult} from "../Serializable";
import {LogEntryEventType} from "./DeviceEventTypes";
import {DeviceEventWrongPin01H} from "./DeviceEventWrongPin01H";

export class DeviceEventAccessByPin1CH extends DeviceEventWrongPin01H {
    public constructor(timestamp: Date, address: number, dutyKey: number, flag: number,
                       bitSelection: number, wiegandFlag: number, readerID: number,
                       elevatorCtrlParameter: number, enteredPin: number) {
        super(timestamp, address, dutyKey, flag, bitSelection, wiegandFlag, readerID,
            elevatorCtrlParameter, enteredPin);
    }

    get eventType(): number {
        return LogEntryEventType.ACCESS_BY_PIN;
    }

    public static deserialize(buffer: Uint8Array): DeserializeResult<DeviceEventAccessByPin1CH> {
        return DeviceEventWrongPin01H.deserialize(buffer) as DeserializeResult<DeviceEventAccessByPin1CH>;
    }
}