---
type: "software"
code: "POD19"
title: "POD19 software"
tags: ["software"]
---

# POD19

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as | POD19 |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the POD19: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| POD19 | Microcontroller | PIC16F73 | HS | **PODXXV101** | 2002-03-06 | Standard Products |
| DEMUX-3 FOR POD19 (DEMUX-3) | ATMEL firmware |  |  | **V203-POD19** (in 2.0.0.3 - POD19) | 2010-07-05 | DEMUX-3 |
| DEMUX-3 FOR POD19 (DEMUX-3) | ALTERA firmware |  |  | **V300** (in 2.0.0.3 - POD19) | 2010-07-05 | DEMUX-3 |

**Also:** [DEMUX-3 FOR POD19](DEMUX-3.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2002\|35 | 2002-03-06 | POD19 | PIC16F73 | PODXXV101 |  |  |

### DEMUX-3 FOR POD19

_From the [DEMUX-3](DEMUX-3.md#software) sheet: the build used in the POD19._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2010\|43 | 2010-07-05 | **2.0.0.3 - POD19** | V203-POD19 | V300 | released | Bob 2010-07-05; PCB issue 4 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **PODXXV101** — 2002|35 · 2002-03-06 — _POD19 · PIC16F73_: UPDATED FOR PIC16F73
- **2.0.0.3 - POD19** — 2010|43 · 2010-07-05 — _DEMUX-3 FOR POD19_: Demux1 obsolete. Replaced Demux1 with Demux3 iss 4. Hardware modifications to remove RS485 transceiver to eliminate UART communication from Demux3 to POD19.
