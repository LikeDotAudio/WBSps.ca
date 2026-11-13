---
type: "software"
code: "DEMUX-3"
title: "DEMUX-3 software"
tags: ["software"]
---

# DEMUX-3

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as | *DEMUX-3 (PLEASE USE THE DEMUX-3 TAB); *DEMUX-3 FOR AMS8 (PLEASE USE DEMUX-3 TAB); DEMUX-3 FOR AIP8-2A; DEMUX-3 FOR AMS4; DEMUX-3 FOR AMS8 UNITS; DEMUX-3 FOR DMS-1 UNITS; DEMUX-3 FOR DMS1; DEMUX-3 FOR POD19; DEMUX-3 FOR XTM4; DEMUX-3 FOR XTM4 UNITS |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the DEMUX-3: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| *DEMUX-3 FOR AMS8 (PLEASE USE DEMUX-3 TAB) | Microcontroller | ATMEGA128L | HS | **DEMUX3V202** | 2009-05-19 | Standard Products |
| DEMUX-3 FOR AIP8-2A | Microcontroller | ATMEGA128L | HS | **DEMUX3V201-AIP8-2A** | 2007-01-26 | Standard Products |
| DEMUX-3 FOR AMS4 | Microcontroller | ATMEGA128L | HS | **DEMUX3V200-AMS4** | 2006-05-05 | Standard Products |
| DEMUX-3 FOR DMS1 | Microcontroller | PLEASE USE DEMUX-3 TAB |  | — | — | Standard Products |
| DEMUX-3 FOR XTM4 | Microcontroller | ATMEGA128L | HS | **v400** | 2012-04-27 | Standard Products |
| *DEMUX-3 (PLEASE USE THE DEMUX-3 TAB) | Altera FPGA / CPLD | EPC1S |  | **DEMUX3V203** | — | Altera |
| DEMUX-3 FOR AMS8 UNITS | ATMEL firmware |  |  | **V203** (in 2.0.0.4) | 2010-08-18 | DEMUX-3 |
| DEMUX-3 FOR AMS8 UNITS | ALTERA firmware |  |  | **v301** (in 2.0.0.4) | 2010-08-18 | DEMUX-3 |
| DEMUX-3 FOR POD19 | ATMEL firmware |  |  | **V203-POD19** (in 2.0.0.3 - POD19) | 2010-07-05 | DEMUX-3 |
| DEMUX-3 FOR POD19 | ALTERA firmware |  |  | **V300** (in 2.0.0.3 - POD19) | 2010-07-05 | DEMUX-3 |
| DEMUX-3 FOR DMS-1 UNITS | ATMEL firmware |  |  | **v400** (in 4.0.0.0) | 2011-08-16 | DEMUX-3 |
| DEMUX-3 FOR DMS-1 UNITS | ALTERA firmware |  |  | **v301** (in 4.0.0.0) | 2011-08-16 | DEMUX-3 |
| DEMUX-3 FOR XTM4 UNITS | ATMEL firmware |  |  | **v400** (in 4.0.0.0) | 2012-04-27 | DEMUX-3 |
| DEMUX-3 FOR XTM4 UNITS | ALTERA firmware |  |  | **v301** (in 4.0.0.0) | 2012-04-27 | DEMUX-3 |

**Product firmware versions (PFV)**: DEMUX-3 FOR AMS8 UNITS: 2 revisions, latest released **2.0.0.4** (2010-08-18) · DEMUX-3 FOR POD19: 1 revisions, latest released **2.0.0.3 - POD19** (2010-07-05) · DEMUX-3 FOR DMS-1 UNITS: 2 revisions, latest released **4.0.0.0** (2011-08-16) · DEMUX-3 FOR XTM4 UNITS: 1 revisions, latest released **4.0.0.0** (2012-04-27)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-05-05 | DEMUX-3 FOR AMS4 | ATMEGA128L | DEMUX3V200-AMS4 |  |  |
| 2007\|40 | 2007-01-26 | DEMUX-3 FOR AIP8-2A | ATMEGA128L | DEMUX3V201-AIP8-2A |  |  |
| 2009\|42 | 2009-05-19 | *DEMUX-3 FOR AMS8 (PLEASE USE DEMUX-3 TAB) | ATMEGA128L | DEMUX3V202 |  | Bob 2009-05-19 |
| 2012\|45 | 2012-04-27 | DEMUX-3 FOR XTM4 | ATMEGA128L | v400 |  |  |
|  | — | *DEMUX-3 (PLEASE USE THE DEMUX-3 TAB) | EPC1S | DEMUX3V203 |  |  |
|  | — | DEMUX-3 FOR DMS1 | PLEASE USE DEMUX-3 TAB | — |  |  |

### DEMUX-3 FOR AMS8 UNITS

_Sheet **DEMUX-3**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2009\|42 | 2009-08-24 | **2.0.0.3** | V203 | V300 | released |  |
| 2010\|43 | 2010-08-18 | **2.0.0.4** | V203 | v301 | released | Bob 2010-08-18 |

### DEMUX-3 FOR POD19

_Sheet **DEMUX-3**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2010\|43 | 2010-07-05 | **2.0.0.3 - POD19** | V203-POD19 | V300 | released | Bob 2010-07-05; PCB issue 4 |

### DEMUX-3 FOR DMS-1 UNITS

_Sheet **DEMUX-3**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2011\|44 | 2011-04-06 | **2.0.0.5** | V204 | V301 | released | ALI 2011-04-06 |
| 2011\|44 | 2011-08-16 | **4.0.0.0** | v400 | v301 | released | ALI 2011-08-16 |

### DEMUX-3 FOR XTM4 UNITS

_Sheet **DEMUX-3**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2012\|45 | 2012-04-27 | **4.0.0.0** | v400 | v301 | released | ALI 2012-04-27 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **DEMUX3V200-AMS4** — 2006|39 · 2006-05-05 — _DEMUX-3 FOR AMS4 · ATMEGA128L_: FIXED COMMUNICATIONS BUG FOR AMS4 (FOR ISSUE 1 & 2)
- **DEMUX3V202** — 2009|42 · 2009-05-19 — _*DEMUX-3 FOR AMS8 (PLEASE USE DEMUX-3 TAB) · ATMEGA128L_: FIXED PHASE ISSUE IN ALTERA BETWEEN EMBEDDED AES STREAMS
- **2.0.0.3** — 2009|42 · 2009-08-24 — _DEMUX-3 FOR AMS8 UNITS_: FIXED PHASE ISSUE IN ALTERA BETWEEN EMBEDDED AES STREAMS
- **2.0.0.3 - POD19** — 2010|43 · 2010-07-05 — _DEMUX-3 FOR POD19_: Demux1 obsolete. Replaced Demux1 with Demux3 iss 4. Hardware modifications to remove RS485 transceiver to eliminate UART communication from Demux3 to POD19.
- **2.0.0.4** — 2010|43 · 2010-08-18 — _DEMUX-3 FOR AMS8 UNITS_: Altera: Audio artifacts on AES4 ch2 on some of the demux boards, but not all. This problem was seen by bob on issue2,3,4 demux3 boards. Problem was resolved within FPGA
- **2.0.0.5** — 2011|44 · 2011-04-06 — _DEMUX-3 FOR DMS-1 UNITS_: Atmel based on V200-4, corrected the communication procedure and wrong device type
- **4.0.0.0** — 2011|44 · 2011-08-16 — _DEMUX-3 FOR DMS-1 UNITS_: Atmel based on V201-4 to correct the communication problems the previous version had
- **4.0.0.0** — 2012|45 · 2012-04-27 — _DEMUX-3 FOR XTM4 UNITS_: Fixed bug with front panel freezing when SDI is selected. This is the same version that works with DMS1
- **v400** — 2012|45 · 2012-04-27 — _DEMUX-3 FOR XTM4 · ATMEGA128L_: Fixed bug with front panel freezing when SDI is selected. (see DEMUX3 TAB)
- **DEMUX3V203** — undated — _*DEMUX-3 (PLEASE USE THE DEMUX-3 TAB) · EPC1S_: FIXED PHASE ISSUE IN ALTERA BETWEEN EMBEDDED AES STREAMS

_No change note in the listing for: DEMUX3V201-AIP8-2A, DEMUX-3 FOR DMS1._
