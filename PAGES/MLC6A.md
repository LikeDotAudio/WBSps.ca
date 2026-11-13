---
type: "product"
code: "MLC6A"
category: "METERING"
year: 2013
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# MLC6A

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: MLC6A](../siumulation.html?plugin=mlc6a) · [simulator & front panel](../simulator.html?m=MLC6A) · [KiCad symbol generator](../kicad.html?m=MLC6A) · [download package (zip)](../_packages/MLC6A.zip) |
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

## Contents (JSON)

```json
{
 "device": "MLC6A",
 "category": "METERING",
 "year": 2013,
 "documents": [
  {
   "file": "Products/METERING/MLC8D/2018 - MLC8D - Rear.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/MLC6A/19xx - MLC6A - Front.jpg",
   "year": null,
   "pages": 1,
   "holds": []
  }
 ]
}
```
