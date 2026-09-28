import {describe, expect, test} from "@jest/globals";
import {SOYAL_PROTOCOL_SHORT, SoyalProtocol} from "./SoyalProtocol";
import {ISoyalCommandPayload, SoyalCommand, SoyalCommandCode} from "./command/SoyalCommand";
import {SoyalCommandDeserializer} from "./command/SoyalCommandDeserializer";
import {PromptAcceptedMessage04H} from "./command/PromptAcceptedMessage04H";
import {PromptInvalidMessage05H} from "./command/PromptInvalidMessage05H";
import {PromptKeyingInPassword09H} from "./command/PromptKeyingInPassword09H";
import {ReadEEPROMCommand12H} from "./command/ReadEEPROMCommand12H";
import {WriteEEPROMCommand20H} from "./command/WriteEEPROMCommand20H";
import {ControlRelayCommand21H, RelayControlParameter} from "./command/ControlRelayCommand21H";
import {ReadRTCCommand24H} from "./command/ReadRTCCommand24H";
import {GetOldestDeviceEventLogCommand25H} from "./command/GetOldestDeviceEventLogCommand25H";
import {SetLcdTextCommand27H} from "./command/SetLcdTextCommand27H";
import {SetTimeZoneCommand2AH} from "./command/SetTimeZoneCommand2AH";
import {SetHolidaysCommand2CH} from "./command/SetHolidaysCommand2CH";
import {RemoveAllDeviceEventLogCommand2DH} from "./command/RemoveAllDeviceEventLogCommand2DH";
import {PassThroughCommand30H} from "./command/PassThroughCommand30H";
import {MifareComplexCommand31H} from "./command/MifareComplexCommand31H";
import {RemoveOldestDeviceEventLogCommand37H} from "./command/RemoveOldestDeviceEventLogCommand37H";
import {SetNodeIDCommand80H} from "./command/SetNodeIDCommand80H";
import {ResetDeviceCommand81H} from "./command/ResetDeviceCommand81H";
import {SetDutyCodeCommand82H} from "./command/SetDutyCodeCommand82H";
import {AccessControlMode, SetCardContentCommand83H} from "./command/SetCardContentCommand83H";
import {StopWaitingForResponseCommand84H} from "./command/StopWaitingForResponseCommand84H";
import {RemoveAllEntryCards85H} from "./command/RemoveAllEntryCards85H";
import {ResetAntiPassBackCommand86H} from "./command/ResetAntiPassBackCommand86H";
import {GetCardContentCommand87H} from "./command/GetCardContentCommand87H";
import {DutyStatus} from "./response/DeviceIOStatus";
import {SoyalFunctionCode, SoyalResponse} from "./response/SoyalResponse";
import {DeviceEchoResponse03H} from "./response/DeviceEchoResponse03H";
import {ReadRTCResponse} from "./response/ReadRTCResponse";
import {DoorStatusResponse} from "./response/DoorStatusResponse";
import {CardContentResponse} from "./response/CardContentResponse";
import {SetExtendParametersCommand88H} from "./command/SetExtendParametersCommand88H";
import {InsertTagByUIDCommand89H} from "./command/InsertTagByUIDCommand89H";
import {DeleteTagByUIDCommand8AH} from "./command/DeleteTagByUIDCommand8AH";
import {LockIndicatorCommand90H} from "./command/LockIndicatorCommand90H";

const DAY = {beginMinute: 480, endMinute: 900}; // 08:00 ~ 15:00

// [section, node, command, payload, packet from the manual]
const COMMAND_EXAMPLES: [string, number, SoyalCommandCode, ISoyalCommandPayload, string][] = [
    ["2.2 04H (727H)", 1, SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H,
        new PromptAcceptedMessage04H(0xA0, 0x0000, 0x012C), "7e090104a00000012c7749"],
    ["2.2 04H", 1, SoyalCommandCode.PROMPT_ACCEPTED_MESSAGE_04H, new PromptAcceptedMessage04H(), "7e040104faff"],
    ["2.3 05H", 1, SoyalCommandCode.PROMPT_INVALID_MESSAGE_05H, new PromptInvalidMessage05H(), "7e040105fb01"],
    ["2.4 09H", 1, SoyalCommandCode.PROMPT_KEYING_IN_PASSWORD_09H, new PromptKeyingInPassword09H(0x58),
        "7e0901094000000058ef91"],
    ["2.5 20H", 1, SoyalCommandCode.WRITE_EEPROM_20H,
        new WriteEEPROMCommand20H(0x80, Uint8Array.of(0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88)),
        "7e0f01200080081122334455667788deeb"],
    ["2.6 12H", 1, SoyalCommandCode.READ_EEPROM_12H, new ReadEEPROMCommand12H(0x80, 8), "7e07011200800864ff"],
    ["2.7 21H", 1, SoyalCommandCode.CONTROL_RELAY_21H,
        new ControlRelayCommand21H(RelayControlParameter.DOOR_RELAY_ON), "7e050121825d01"],
    ["2.9 24H", 1, SoyalCommandCode.READ_RTC_24H, new ReadRTCCommand24H(), "7e040124daff"],
    ["2.10 27H", 1, SoyalCommandCode.SET_LCD_TEXT_27H, new SetLcdTextCommand27H(0x30, "Tony") /* the manual says TONY but its bytes spell Tony */,
        "7e0a01273004546f6e79c1c7"],
    ["2.11 25H", 1, SoyalCommandCode.GET_OLDEST_DEVICE_EVENT_LOG_25H, new GetOldestDeviceEventLogCommand25H(),
        "7e040125db01"],
    ["2.12 37H", 1, SoyalCommandCode.REMOVE_OLDEST_DEVICE_EVENT_LOG_37H, new RemoveOldestDeviceEventLogCommand37H(),
        "7e040137c901"],
    ["2.13 2DH", 1, SoyalCommandCode.REMOVE_ALL_DEVICE_EVENT_LOG_2DH, new RemoveAllDeviceEventLogCommand2DH(),
        "7e04012dd301"],
    ["2.14.2 30H", 2, SoyalCommandCode.PASS_THROUGH_30H,
        new PassThroughCommand30H(Uint8Array.of(0x01, 0x17, 0x00, 0x80, 0x08, 0x40, 0x04)),
        "7e0c02300701170080084004102d"],
    ["2.15 31H", 1, SoyalCommandCode.MIFARE_COMPLEX_31H, new MifareComplexCommand31H(0x13), "7e05013113dc21"],
    ["2.16 80H", 1, SoyalCommandCode.SET_NODE_ID_80H, new SetNodeIDCommand80H(2), "7e050180027cff"],
    ["2.17 81H", 1, SoyalCommandCode.RESET_DEVICE_81H, new ResetDeviceCommand81H(), "7e0401817f01"],
    ["2.18 82H", 1, SoyalCommandCode.SET_DUTY_CODE_82H, new SetDutyCodeCommand82H(DutyStatus.OFF_DUTY),
        "7e050182017d01"],
    ["2.19 83H", 1, SoyalCommandCode.SET_CARD_CONTENT_83H,
        new SetCardContentCommand83H(1, 0x0441EA4B, 1234, AccessControlMode.CARD_OR_PIN, false, 1),
        "7e0e018300010441ea4b04d202014d25"],
    ["2.20 87H", 1, SoyalCommandCode.GET_CARD_CONTENT_87H, new GetCardContentCommand87H(2, 1), "7e0701870002017a05"],
    ["2.21 84H", 1, SoyalCommandCode.STOP_WAITING_FOR_RESPONSE_84H, new StopWaitingForResponseCommand84H(),
        "7e0401847aff"],
    ["2.22 85H", 1, SoyalCommandCode.CLEARING_ALL_CARD_85H, new RemoveAllEntryCards85H(), "7e0401857b01"],
    ["2.23 86H", 1, SoyalCommandCode.RESET_ANTI_PASS_BACK_86H, new ResetAntiPassBackCommand86H(), "7e04018678ff"],
    ["2.24 2AH", 1, SoyalCommandCode.SET_TIME_ZONE_2AH, new SetTimeZoneCommand2AH(1, [{
        nextLink: 0x0C, availableOnHolidays: false, level: 0, weekly: [DAY, DAY, DAY, DAY, DAY, DAY, DAY],
    }]), "7e24012a01010c00" + "01e00384".repeat(7) + "becf"],
    ["2.25 2CH", 1, SoyalCommandCode.SET_HOLIDAYS_2CH, new SetHolidaysCommand2CH(0, [1, 2, 3, 4, 5, 6].map(day =>
        ({month: 12, day}))), "7e12012c00060c010c020c030c040c050c06d363"],
];

function packetHex(nodeID: number, commandCode: SoyalCommandCode, payload: ISoyalCommandPayload): string {
    const command = new SoyalCommand(commandCode, payload);
    return Buffer.from(new SoyalProtocol(SOYAL_PROTOCOL_SHORT, nodeID, command.serialize()).serialize()).toString("hex");
}

describe("host commands match the manual examples", () => {
    for (const [section, nodeID, commandCode, payload, expected] of COMMAND_EXAMPLES) {
        test(section, () => {
            expect(packetHex(nodeID, commandCode, payload)).toBe(expected);
        });

        test(`${section} round trip`, () => {
            const packet = SoyalProtocol.deserialize(Buffer.from(expected, "hex"));
            const command = SoyalCommandDeserializer.deserialize(packet.payload).instance;

            expect(command.commandCode).toBe(commandCode);
            expect(Buffer.from(command.serialize()).toString("hex"))
                .toBe(Buffer.from(packet.payload).toString("hex"));
        });
    }
});

describe("commands without a usable manual example round trip", () => {
    const commands: [SoyalCommandCode, ISoyalCommandPayload][] = [
        [SoyalCommandCode.SET_LCD_TEXT_27H, SetLcdTextCommand27H.at(1, 2, "Hello", 300, 2)],
        [SoyalCommandCode.SET_NODE_ID_80H, new SetNodeIDCommand80H(3, {doorNumber: 0x0102, doorRelayTime10ms: 150})],
        [SoyalCommandCode.RESET_DEVICE_81H, new ResetDeviceCommand81H(true)],
        [SoyalCommandCode.SET_EXTEND_PARAMETERS_88H, new SetExtendParametersCommand88H(0b10001, 0b100)],
        [SoyalCommandCode.INSERT_TAG_BY_UID_89H, new InsertTagByUIDCommand89H(0x0441EA4B, 1234, AccessControlMode.CARD_OR_PIN, 1)],
        [SoyalCommandCode.DELETE_TAG_BY_UID_8AH, new DeleteTagByUIDCommand8AH(0xFB51C652)],
        [SoyalCommandCode.LOCK_INDICATOR_90H, new LockIndicatorCommand90H({lcd: true, leds: false, keyboard: true}, 0x80)],
        [SoyalCommandCode.CONTROL_RELAY_21H, ControlRelayCommand21H.cardInterval(100)],
        [SoyalCommandCode.CLEARING_ALL_CARD_85H, new RemoveAllEntryCards85H(RemoveAllEntryCards85H.OPTION_NORMAL_TAGS)],
    ];

    for (const [commandCode, payload] of commands) {
        test(SoyalCommandCode[commandCode], () => {
            const serialized = new SoyalCommand(commandCode, payload).serialize();
            const deserialized = SoyalCommandDeserializer.deserialize(serialized).instance;

            expect(deserialized.commandPayload).toStrictEqual(payload);
        });
    }

    test("89H / 8AH carry site and card codes", () => {
        expect(Buffer.from(new InsertTagByUIDCommand89H(0x0441EA4B, 1234, AccessControlMode.CARD_OR_PIN, 1)
            .serialize()).toString("hex")).toBe("0441ea4b04d20201");
        expect(Buffer.from(new DeleteTagByUIDCommand8AH(0x0441EA4B).serialize()).toString("hex")).toBe("0441ea4b");
    });
});

describe("responses match the manual examples", () => {
    function echo(hex: string): DeviceEchoResponse03H {
        return new DeviceEchoResponse03H(Buffer.from(hex, "hex"));
    }

    test("2.7 21H echo", () => {
        const status = DoorStatusResponse.deserialize(echo("62400010")).instance;

        expect(status.version).toBe(0x62);
        expect(status.ioStatus.doorRelayOn).toBe(true);
        expect(status.deviceParameters.egressButtonEnabled).toBe(true);
    });

    test("2.9 24H echo", () => {
        const info = ReadRTCResponse.deserialize(echo("0a160d06090c056327010126")).instance;

        expect(info.timestamp).toStrictEqual(new Date(2005, 11, 9, 13, 22, 10));
        expect(info.firmwareVersion).toBe(0x63);
        expect(info.doorNumber).toBe(0x2701);
        expect(info.firmwareIdentityCode).toBe(0x01);
        expect(info.readerType).toBe(0x26);
    });

    test("2.20 87H echo", () => {
        const [user] = CardContentResponse.deserialize(echo("0441ea4b04d2020b"), 2, 1).users;

        expect(user.address).toBe(2);
        expect(user.cardUID).toBe(0x0441EA4B);
        expect(user.pin).toBe(1234);
        expect(user.mode).toBe(AccessControlMode.CARD_OR_PIN);
        expect(user.zone).toBe(11);
    });

    test("2.6 12H reply with function code 02H", () => {
        const response = SoyalResponse.deserialize(SoyalProtocol.deserialize(
            Buffer.from("7e0d000201112233445566778874db", "hex")).payload).instance;

        expect(response.functionCode).toBe(SoyalFunctionCode.DEVICE_MESSAGE);
        expect(Buffer.from((response.payload as DeviceEchoResponse03H).data).toString("hex"))
            .toBe("1122334455667788");
    });
});
