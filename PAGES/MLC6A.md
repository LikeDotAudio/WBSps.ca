---
type: "product"
code: "MLC6A"
category: "METERING"
year: 2013
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# MLC6A

**▶ [Open the MLC6A simulation](../siumulation.html?plugin=mlc6a)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: MLC6A](../siumulation.html?plugin=mlc6a) · [KiCad symbol generator](../kicad.html?m=MLC6A) · [download package (zip)](../_packages/MLC6A.zip) |
| Earliest dated evidence | [2013\|46](Year-2013.md) — dated folder |
| Evidence | in "WBS PRODUCTS 2013 - documents-export-2013-03-08" |
| Confidence | low (named by) |
| All years found | [2013\|46](Year-2013.md) |
| Folder | [Products/METERING/MLC6A](../Products/METERING/MLC6A/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC6A" data-n="" data-cat="METERING" role="img" aria-label="MLC6A front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC6A: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC6A | Microcontroller |  | HS | **2.0.0.2** | not released | Standard Products |
| MLC6A REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **V106** (in 2.0.0.1) | 2007-12-21 | MLCs |
| MLC6A REVISIONS — Main Board Revisions | SHARC firmware |  |  | **MLC8Av105** (in 2.0.0.1) | 2007-12-21 | MLCs |
| MLC6A REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **AMS8V202** (in 2.0.0.1) | 2007-12-21 | MLCs |
| MLC6A REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **V205** (in 2.0.0.1) | 2007-12-21 | MLCs |
| MLC6A REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **MLC8AV200** (in 2.0.0.1) | 2007-12-21 | MLCs |
| MLC6A REVISIONS — MLC6R Front Panel Revisions | ATMEL firmware |  |  | **MLC6AV205** (in 2.0.0.1) | 2007-12-21 | MLCs |
| MLC6A REVISIONS — MLC6R Front Panel Revisions | ALTERA firmware |  |  | **MLC8AV200** (in 2.0.0.1) | 2007-12-21 | MLCs |

**Product firmware versions (PFV)**: MLC6A REVISIONS — Main Board Revisions: 3 revisions, latest released **2.0.0.1** (2007-12-21) · MLC6A REVISIONS — Front Panel Revisions: 2 revisions, latest released **2.0.0.1** (2007-12-21) · MLC6A REVISIONS — MLC6R Front Panel Revisions: 2 revisions, latest released **2.0.0.1** (2007-12-21)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
|  | not released | MLC6A |  | 2.0.0.2 |  | Bob 2007-12-21 |

### MLC6A REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2007\|40 | 2007-11-27 | **2.0.0.0** | V105 | MLC8Av105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-12-21 | **2.0.0.1** | V106 | MLC8Av105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
|  | — | **2.0.0.2** | V106 | MLC8Av106 | AMS8V203 | not released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\MLC6A\Software\MLC6A\AMS8-1" FOLDER

### MLC6A REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2007\|40 | 2007-11-27 | **2.0.0.0** | V204 | MLC8AV200 | released |  |
| 2007\|40 | 2007-12-21 | **2.0.0.1** | V205 | MLC8AV200 | released |  |

> LOCATED IN THE "H:\mlc\MLC6A\Software\MLC6A\" FOLDER

### MLC6A REVISIONS — MLC6R Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2007\|40 | 2007-11-27 | **2.0.0.0** | MLC6AV204 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-12-21 | **2.0.0.1** | MLC6AV205 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> If the MAIN UNIT is the MLC6A, use the MLC6A FRONT PANEL software for the ATMEL

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **2.0.0.0** — 2007|40 · 2007-11-27 — _MLC6A REVISIONS — Front Panel Revisions_
    - N/A
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
- **2.0.0.0** — 2007|40 · 2007-11-27 — _MLC6A REVISIONS — MLC6R Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.0** — 2007|40 · 2007-11-27 — _MLC6A REVISIONS — Main Board Revisions_
    - FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2007|40 · 2007-12-21 — _MLC6A REVISIONS — Front Panel Revisions_
    - N/A
    - FIXED COMMUNICATION ISSUE
- **2.0.0.1** — 2007|40 · 2007-12-21 — _MLC6A REVISIONS — MLC6R Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2007|40 · 2007-12-21 — _MLC6A REVISIONS — Main Board Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — not released — _MLC6A REVISIONS — Main Board Revisions_
    - FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| ? | [19xx - MLC6A - Front.jpg](../Products/METERING/MLC6A/19xx%20-%20MLC6A%20-%20Front.jpg) | [note](../Products/METERING/MLC6A/19xx%20-%20MLC6A%20-%20Front.jpg.md) |
| ? | [19xx - MLC6A - Rear.jpg](../Products/METERING/MLC6A/19xx%20-%20MLC6A%20-%20Rear.jpg) | [note](../Products/METERING/MLC6A/19xx%20-%20MLC6A%20-%20Rear.jpg.md) |

## Footnotes

1. The 2016 front silk has only six channel holes (L R C LFE LS RS) and no 5.1/ST buttons, although the shared MLC8A firmware still scans encoders 7/8. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/Obsolete/MLC6A-FRONT-SILK(CURVE).cdr`
2. The newest MLC6A silk (JUN.24/16) is filed under Obsolete in the shared MLC6 & MLC8 artwork folder, beside a live-text twin of the same date. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/Obsolete/MLC6A-FRONT-SILK.cdr`
3. The 2007 mlc6A-SILK.cdr exists in two folders plus a Backup_of_ copy; its live text cannot be placed by libcdr. — `#MLC - #SERIES/MLC8 #Engineering #TIM/MLC6A/Backup_of_mlc6A-SILK.cdr`
4. The curve sheet adds a black mechanical layer: 600 px (3.0 in) meter window, 0.685 in knob holes, 0.935 in MASTER hole, two 0.34 in PRESET cut-outs and twelve screw holes; the photo-measured screws were up to 18 px off. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/Obsolete/MLC6A-FRONT-SILK(CURVE).cdr`
5. The 2010 front-and-rear illustration uses live text: as converted, its captions overlap (“75 Ohm AES REF. INPUT” over “4 x 75 Ohm AES INPUTS”, “MLC-6A” over “MULTICHANNEL LEVEL CONTROL”), so only the rear connector labels are used. — `#MLC - #SERIES/XXX - MLC6A - #OBSOLETE #Archive/MLC6A (Front & Rearview).cdr`
6. The rear illustration shows a DB-25 “AUX” marked “PLEASE REFER TO MANUAL”, but there is no MLC6A manual in the archive. — `#MLC - #SERIES/XXX - MLC6A - #OBSOLETE #Archive/MLC6A (Front & Rearview).cdr`
