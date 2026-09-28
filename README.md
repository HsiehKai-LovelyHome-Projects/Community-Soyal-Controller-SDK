# Community Soyal Controller SDK

> **This is an independent community project.** It is not made, endorsed, sponsored or supported by SOYAL Technology
> Co., Ltd. For official software, documentation and support, contact SOYAL directly.

A TypeScript SDK for the RS-485 communication protocol of SOYAL® access controllers of the H series: AR-721H, AR-725H
and AR-727H (and compatible readers). It encodes host commands, decodes device responses and event logs, drives a
reader over a serial port, and ships a byte-level device emulator for testing without hardware.

The implementation follows the publicly available SOYAL "Communication Protocol" document for AR-721H / AR-721HV3 /
AR-727HV3 (revision of 2025-02-06), and was verified by the community against a real AR-725H. Behavior on other
models or firmware versions may differ; use it at your own risk, see the [license](#license).

## Layout

| Path | Content |
|---|---|
| `protocol/` | Packet framing (`SoyalProtocol`), host commands (`command/`), device responses (`response/`), event logs (`event_log/`) |
| `controller/SoyalDeviceController.ts` | Serial link to one reader: one transaction on the wire at a time, priorities, timeouts, recovery of a stuck reader |
| `controller/common/SoyalFrameParser.ts` | Turns a serial byte stream into checksum-verified frames, resynchronizing after noise |
| `controller/mocks/` | `SoyalDeviceEmulator`, a stateful AR-721H / AR-725H emulator with fault injection, and `Ar721hMock`, a serial port bound to it |

## Usage

```ts
import {
    GetDeviceStatusCommand18H, SoyalCommand, SoyalCommandCode, SoyalDeviceController, SoyalProtocol,
    SOYAL_PROTOCOL_SHORT, SoyalResponse, SoyalFunctionCode, TransactionPriority,
} from "community-soyal-controller-sdk";

const controller = new SoyalDeviceController("/dev/ttyUSB0", 1 /* node ID */, SOYAL_PROTOCOL_SHORT, {
    onSerialError: err => console.error(err),
});
await controller.open();

// poll the status of node 1, synchronizing its clock
const command = new SoyalCommand(SoyalCommandCode.GET_DEVICE_STATUS_18H, new GetDeviceStatusCommand18H(new Date()));
const frame = await controller.transact(
    new SoyalProtocol(SOYAL_PROTOCOL_SHORT, 1, command.serialize()).serialize(),
    {priority: TransactionPriority.LOW, expectedFunctionCodes: [SoyalFunctionCode.DEVICE_STATUS_EVENT]});

const response = SoyalResponse.deserialize(SoyalProtocol.deserialize(frame!).payload).instance;
console.log(JSON.stringify(response.payload));
```

The link runs at 9600 bps, 8N1. Responses carry no request identifier: `SoyalDeviceController` keeps a single request
on the wire and matches the next frame of the addressed reader to it. Paths starting with `/dev/mock` open an
emulated reader instead of a serial port.

### Commands

Every host command of the protocol document is implemented, each class is named after its command code:
04H / 05H / 09H prompts, 12H / 20H EEPROM, 18H status polling, 21H relay control, 23H / 24H clock, 25H / 2DH / 37H
event logs, 27H LCD text, 2AH time zones, 2CH holidays, 30H pass-through, 31H Mifare, 80H node ID, 81H reset,
82H duty code, 83H / 85H / 87H users, 84H release, 86H anti-pass-back, 88H extended parameters, 89H / 8AH users by
UID, 90H indicator lock. `SystemParameters` decodes the EEPROM parameter block (00H~3FH).

The encrypted RS-485 mode (SSC) is not supported: its specification is not public.

### Emulator

```ts
const emulator = new SoyalDeviceEmulator({nodeID: 1});
emulator.presentCard(0x636BB8B4);          // reported on the next 18H poll
const responses = emulator.receive(packet); // response frames, byte exact
```

It keeps users, EEPROM, event logs, relays and clock, and can drop responses, go silent, or stay stuck on a half
received frame like a real reader after a cable interruption.

## Protocol notes

Findings from real devices that are not, or not clearly, in the protocol document:

- H series readers ACK with the bare `7E 05 00 04 <node> XOR SUM`.
- 18H optional data is 9 bytes, bit 0 of the last byte forces the door relay on. Early revisions of the document had
  a different layout that could open the door on every poll.
- A reader interrupted in the middle of a frame waits for the missing bytes and ignores everything else. Zeros are
  ignored by an idle reader, so a burst of 257 `0x00` releases a stuck one without side effects.
- 2AH carries 30 bytes per time zone (the 2 reserved bytes are not transmitted).
- The event log is always 26 bytes; the "no event" answer of 25H is an ACK, whose function code 04H collides with the
  time zone error event code.

## Development

```sh
yarn install
yarn typecheck   # TypeScript 7 (tsc)
yarn test        # jest, transpiled by babel
yarn build
```

Contributions are welcome, especially captures from other models and firmware versions.

## Trademarks

SOYAL® is a registered trademark of SOYAL Technology Co., Ltd. All other product names, such as AR-721H, AR-725H and
AR-727H, are used only to identify the devices this SDK can communicate with. Their use does not imply any
affiliation with or endorsement by SOYAL Technology Co., Ltd.

## License

Licensed under the Apache License 2.0, see [LICENSE](LICENSE). The software is provided "as is", without warranty of
any kind. It controls physical access hardware: test it thoroughly before relying on it.
