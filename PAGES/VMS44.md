---
type: "software"
code: "VMS44"
title: "VMS44 software"
tags: ["software"]
---

# VMS44

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as | VMS44; VMS44 FULL; VMS44-6; VMS44SE |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the VMS44: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| VMS44 | Microcontroller | PIC16F874 | HS | **VMS43V200** | 2004-01-26 | Standard Products |
| VMS44 FULL | Microcontroller | PIC16F874 | HS | **VMS44V104** | 2003-06-12 | Standard Products |
| VMS44-6 | Microcontroller | PIC16F874 | HS | **VMS446V101** | 2004-07-09 | Standard Products |
| VMS44SE | Microcontroller | PIC16F874 | HS | **VMS44SEV101** | 2004-05-14 | Standard Products |
| VMS44 | Altera FPGA / CPLD | EPM3128ATC144-10 |  | **VMS443V102** | — | Altera |
| VMS44 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **VMS443V103** | — | Sharc |
| VMS44SE | Altera FPGA / CPLD | EPM3128ATC144-10 |  | **VMS44SEV100** | — | Altera |
| VMS44SE | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **VMS443V103** | — | Sharc |

**Programming:** Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2003\|36 | 2003-06-12 | VMS44 FULL | PIC16F874 | VMS44V104 |  |  |
| 2004\|37 | 2004-01-26 | VMS44 | PIC16F874 | VMS43V200 |  |  |
| 2004\|37 | 2004-05-14 | VMS44SE | PIC16F874 | VMS44SEV101 |  |  |
| 2004\|37 | 2004-07-09 | VMS44-6 | PIC16F874 | VMS446V101 |  |  |
|  | — | VMS44 | EPM3128ATC144-10 | VMS443V102 |  |  |
|  | — | VMS44 | AM29LV04OB-120JC | VMS443V103 |  |  |
|  | — | VMS44SE | EPM3128ATC144-10 | VMS44SEV100 |  |  |
|  | — | VMS44SE | AM29LV04OB-120JC | VMS443V103 |  |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **VMS44V104** — 2003|36 · 2003-06-12 — _VMS44 FULL · PIC16F874_: USE THE VMS44-3 ISSUE 2 BOARD
- **VMS43V200** — 2004|37 · 2004-01-26 — _VMS44 · PIC16F874_: UPDATED FOR THE USE OF VMS44-5 BOARD
- **VMS44SEV101** — 2004|37 · 2004-05-14 — _VMS44SE · PIC16F874_: UPDATED FOR ERROR CHECKING THE UART
- **VMS446V101** — 2004|37 · 2004-07-09 — _VMS44-6 · PIC16F874_: UPDATED FOR TURNING OFF VIDEO DACS IF NO SDI INPUTS
- **VMS443V102** — undated — _VMS44 · EPM3128ATC144-10_: IN THE PROCESS OF CHANGING TO VMS44SE BOARD

_No change note in the listing for: VMS44SEV100, VMS443V103._
