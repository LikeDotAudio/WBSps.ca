---
type: "product"
code: "MLC8C"
title: "Multi-Channel Level Control"
category: "METERING"
year: 2013
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# MLC8C — Multi-Channel Level Control

**▶ [Open the MLC8 / MLC6 level control simulation](../siumulation.html?plugin=mlc8) · [Open the RD66-MLC8UsingAMS8E-1-iss5 simulation](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: MLC8 / MLC6 level control](../siumulation.html?plugin=mlc8) · [full simulation: RD66-MLC8UsingAMS8E-1-iss5](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5) · [simulator & front panel](../simulator.html?m=MLC8C) · [KiCad symbol generator](../kicad.html?m=MLC8C) · [download package (zip)](../_packages/MLC8C.zip) |
| Earliest dated evidence | [2013\|46](Year-2013.md) — dated folder |
| Evidence | in "WBS PRODUCTS 2013 - documents-export-2013-03-08" |
| Confidence | low (named by) |
| All years found | [2013\|46](Year-2013.md) |
| Variants | [MLC8](MLC8.md), [MLC8-N](MLC8-N.md), [MLC8A](MLC8A.md), [MLC8B](MLC8B.md), [MLC8D](MLC8D.md) |
| Folder | [Products/METERING/MLC8C](../Products/METERING/MLC8C/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC8C" data-n="Multi-Channel Level Control" data-cat="METERING" role="img" aria-label="MLC8C front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC8C: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC8C | Microcontroller |  | HS | **2.0.0.0** | 2006-12-20 | Standard Products |
| MLC8CA | Microcontroller |  | HS | **2.0.0.0** | 2007-01-26 | Standard Products |
| MLC8C REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **MLC8AV106** (in 2.0.0.5) | 2008-04-24 | MLCs |
| MLC8C REVISIONS — Main Board Revisions | SHARC firmware |  |  | **v105** (in 2.0.0.5) | 2008-04-24 | MLCs |
| MLC8C REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **AMS8V202** (in 2.0.0.5) | 2008-04-24 | MLCs |
| MLC8C REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **MLC8CV202** (in 2.0.0.0) | 2006-12-20 | MLCs |
| MLC8C REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **MLC8AV200** (in 2.0.0.0) | 2006-12-20 | MLCs |
| MLC8C REVISIONS — MLC8R Front Panel Revisions | ATMEL firmware |  |  | **MLC8AV205** (in 2.0.0.4) | 2008-04-24 | MLCs |
| MLC8C REVISIONS — MLC8R Front Panel Revisions | ALTERA firmware |  |  | **V200** (in 2.0.0.4) | 2008-04-24 | MLCs |
| MLC8CA REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **v105** (in 2.0.0.4) | 2007-03-26 | MLCs |
| MLC8CA REVISIONS — Main Board Revisions | SHARC firmware |  |  | **v105** (in 2.0.0.4) | 2007-03-26 | MLCs |
| MLC8CA REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **AMS8V201** (in 2.0.0.4) | 2007-03-26 | MLCs |
| MLC8CA REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **MLC8CAV203** (in 2.0.0.0) | 2007-01-26 | MLCs |
| MLC8CA REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **MLC8AV200** (in 2.0.0.0) | 2007-01-26 | MLCs |
| MLC8CA REVISIONS — MLC8R Front Panel Revisions | ATMEL firmware |  |  | **MLC8AV204** (in 2.0.0.3) | 2007-02-12 | MLCs |
| MLC8CA REVISIONS — MLC8R Front Panel Revisions | ALTERA firmware |  |  | **V200** (in 2.0.0.3) | 2007-02-12 | MLCs |

**Product firmware versions (PFV)**: MLC8C REVISIONS — Main Board Revisions: 8 revisions, latest released **2.0.0.5** (2008-04-24) · MLC8C REVISIONS — Front Panel Revisions: 1 revisions, latest released **2.0.0.0** (2006-12-20) · MLC8C REVISIONS — MLC8R Front Panel Revisions: 6 revisions, latest released **2.0.0.4** (2008-04-24) · MLC8CA REVISIONS — Main Board Revisions: 7 revisions, latest released **2.0.0.4** (2007-03-26) · MLC8CA REVISIONS — Front Panel Revisions: 1 revisions, latest released **2.0.0.0** (2007-01-26) · MLC8CA REVISIONS — MLC8R Front Panel Revisions: 5 revisions, latest released **2.0.0.3** (2007-02-12)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-12-20 | MLC8C |  | 2.0.0.0 | 2.0.0.1 | Bob NEEDS TESTING, WKW NEEDS TESTING |
| 2007\|40 | 2007-01-26 | MLC8CA |  | 2.0.0.0 | 2.0.0.1 | Bob NEEDS TESTING, WKW NEEDS TESTING |

### MLC8C REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.0.0** | V101 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | V102 | V102 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | MLC8AV103 | V104 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | MLC8AV104 | v105 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-03-19 | **2.0.0.4** | MLC8AV105 | v105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-04-24 | **2.0.0.5** | MLC8AV106 | v105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
|  | — | **2.0.0.6** | MLC8AV106 | v106 | AMS8V203 | not released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\Software\MLC8A\AMS8-1" FOLDER

### MLC8C REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-12-20 | **2.0.0.0** | MLC8CV202 | MLC8AV200 | released |  |

> LOCATED IN THE "H:\mlc\Software\MLC8C\" FOLDER

### MLC8C REVISIONS — MLC8R Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | released |  |
| 2006\|39 | 2006-08-31 | **2.0.0.0** | V201 | V200 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | MLC8AV202 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | MLC8AV203 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | MLC8AV204 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-04-24 | **2.0.0.4** | MLC8AV205 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\Software\MLC8R\" FOLDER
> If the MAIN UNIT is the MLC8C, use the MLC8A FRONT PANEL software for the ATMEL

### MLC8CA REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.0.0** | V101 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | V102 | V102 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | V103 | V104 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | V104 | v105 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-03-26 | **2.0.0.4** | v105 | v105 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
|  | — | **2.0.0.5** | V106 | v106 | AMS8V203 | not released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\Software\MLC8CA\AMS8-1" FOLDER

### MLC8CA REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2007\|40 | 2007-01-26 | **2.0.0.0** | MLC8CAV203 | MLC8AV200 | released |  |

> LOCATED IN THE "H:\mlc\Software\MLC8CA\" FOLDER

### MLC8CA REVISIONS — MLC8R Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | released |  |
| 2006\|39 | 2006-08-31 | **2.0.0.0** | V201 | V200 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | MLC8AV202 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | MLC8AV203 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | MLC8AV204 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\Software\MLC8R\" FOLDER
> if the MAIN UNIT is MLC8C/CA use MLC8A FRONT PANEL ATMEL SOFTWARE

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8C REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8C REVISIONS — Main Board Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8CA REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8CA REVISIONS — Main Board Revisions_
    - N/A
    - Proto released to CBC
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8C REVISIONS — Main Board Revisions_: N/A
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8CA REVISIONS — Main Board Revisions_: N/A
- **2.0.0.0** — 2006|39 · 2006-08-31 — _MLC8C REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - MLC8 - V2.0.0.0 or greater
- **2.0.0.0** — 2006|39 · 2006-08-31 — _MLC8CA REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - MLC8 - V2.0.0.0 or greater
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8C REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS NO CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8C REVISIONS — Main Board Revisions_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8CA REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS NO CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8CA REVISIONS — Main Board Revisions_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.0** — 2006|39 · 2006-12-20 — _MLC8C REVISIONS — Front Panel Revisions_
    - N/A
    - MLC8 MAIN BOARD - V2.0.0.2 or greater
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8C REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD (USE MLC8RV203)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8C REVISIONS — Main Board Revisions_
    - FOR MLC8A/C/D, USE AMS8-1 IN MLC8A FOLDER. USE AMS8-1 IN MLC8B FOLDER FOR MLC8B. USE AMS8-1 IN MLC8CA FOLDER FOR MLC8CA
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8CA REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD (USE MLC8RV203)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8CA REVISIONS — Main Board Revisions_
    - FOR MLC8A/C/D, USE AMS8-1 IN MLC8A FOLDER. USE AMS8-1 IN MLC8B FOLDER FOR MLC8B. USE AMS8-1 IN MLC8CA FOLDER FOR MLC8CA
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.0** — 2007|40 · 2007-01-26 — _MLC8CA REVISIONS — Front Panel Revisions_
    - N/A
    - MLC8 MAIN BOARD - ATMEL MLC8CA V103 with MLC8A altera and sharc
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8C REVISIONS — MLC8R Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8C REVISIONS — Main Board Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8CA REVISIONS — MLC8R Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8CA REVISIONS — Main Board Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2007|40 · 2007-03-26 — _MLC8CA REVISIONS — Main Board Revisions_
    - This is a MLC8-CA quick fix for CBC
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2008|41 · 2008-03-19 — _MLC8C REVISIONS — Main Board Revisions_
    - FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2008|41 · 2008-04-24 — _MLC8C REVISIONS — MLC8R Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.5** — 2008|41 · 2008-04-24 — _MLC8C REVISIONS — Main Board Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.6** — not released — _MLC8C REVISIONS — Main Board Revisions_
    - FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.5** — not released — _MLC8CA REVISIONS — Main Board Revisions_
    - FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE. ALSO, FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - MLC8C - Front.jpg](../Products/METERING/MLC8C/2018%20-%20MLC8C%20-%20Front.jpg) | [note](../Products/METERING/MLC8C/2018%20-%20MLC8C%20-%20Front.jpg.md) |
| 2018 | [2018 - MLC8C - Rear.jpg](../Products/METERING/MLC8C/2018%20-%20MLC8C%20-%20Rear.jpg) | [note](../Products/METERING/MLC8C/2018%20-%20MLC8C%20-%20Rear.jpg.md) |

## Contents (JSON)

```json
{
 "device": "MLC8C",
 "name": "Multi-Channel Level Control",
 "category": "METERING",
 "year": 2013,
 "documents": [
  {
   "file": "Products/METERING/MLC8C/2018 - MLC8C - Front.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/MLC8D/2018 - MLC8D - Rear.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  }
 ]
}
```
