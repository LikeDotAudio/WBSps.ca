---
type: "software"
code: "AMS8-1B"
title: "AMS8-1B software"
tags: ["software"]
---

# AMS8-1B

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as | AMS81-B PRODUCT REVISIONS |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the AMS8-1B: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS81-B PRODUCT REVISIONS | AMS8E-1 firmware |  |  | **V050000** (in 06VA0001) | 2015-07-29 | AMS8-1B |
| AMS81-B PRODUCT REVISIONS | AMS8E-5 firmware |  |  | **V040001** (in 06VA0001) | 2015-07-29 | AMS8-1B |
| AMS81-B PRODUCT REVISIONS | SHARC firmware |  |  | **AMS81B102** (in 06VA0001) | 2015-07-29 | AMS8-1B |
| AMS81-B PRODUCT REVISIONS | ALTERA firmware |  |  | **AMS81 V050000** (in 06VA0001) | 2015-07-29 | AMS8-1B |

**Product firmware versions (PFV)**: AMS81-B PRODUCT REVISIONS: 5 revisions, latest released **06VA0001** (2015-07-29)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### AMS81-B PRODUCT REVISIONS

_Sheet **AMS8-1B**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2009\|42 | 2009-05-01 | **1.0.0.0** | V1000 | V1000 | AMS81B101 | V1000 | released | DEMUX compatibility ATMEL - V202, ALTERA - V203 |
| 2009\|42 | 2009-05-20 | **1.0.0.1** | V1001 | V1001 | AMS81B102 | V1000 | released |  |
|  | — | **1.0.0.2** | V1001 | V1002 | AMS81B102 | V1000 | not released |  |
| 2013\|46 | 2013-06-18 | **06VA0000** | V050000 | V040000 | AMS81B102 | AMS81 V050000 | released |  |
| 2015\|48 | 2015-07-29 | **06VA0001** | V050000 | V040001 | AMS81B102 | AMS81 V050000 | released |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.0** — 2009|42 · 2009-05-01 — _AMS81-B PRODUCT REVISIONS_: DEMUX compatibility: ATMEL - V202, ALTERA - V203
- **1.0.0.1** — 2009|42 · 2009-05-20 — _AMS81-B PRODUCT REVISIONS_: FIXED LEFT/RIGHT SOLOING IN MULTI/DOLBY MODE, ADDED 5.1 AND STEREO MONITORING OPTION
- **06VA0000** — 2013|46 · 2013-06-18 — _AMS81-B PRODUCT REVISIONS_
    - Utilizing new AMS8E-1 ISS5 MAIN BOARD.
    - 1. removed dependencies on CS8416 & ad1895
    - 2. passing SDI lock status to main board. Utilizing as CAT552 reset when SDI input removed and re-asserted.
    - Used by ABC/Disney HD Release
- **06VA0001** — 2015|48 · 2015-07-29 — _AMS81-B PRODUCT REVISIONS_
    - Front panel Atmel display initialization updated. Now compatible with PDSP1884 & HDSP2533
    - As of July 2018 the AMS8E-6 board has been changed to Support Round buttons and the Aux Connector has been changed to a Female Tascam Standard
- **1.0.0.2** — not released — _AMS81-B PRODUCT REVISIONS_: FIXED BUG WITH NO AUDIO APPEARING INSTEAD NO LOCK WHEN MENU TIMES OUT
