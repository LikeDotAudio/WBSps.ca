---
type: "module"
code: "MLC8-N"
title: "Three Quarter"
category: "RAVENNA AES67"
year: 2017
confidence: "low (named by)"
tags: ["module", "ravenna-aes67", "2010s"]
---

# MLC8-N — Three Quarter

**▶ [Open the MLC8 / MLC6 level control simulation](../siumulation.html?plugin=mlc8) · [Open the RD66-MLC8UsingAMS8E-1-iss5 simulation](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | module |
| Category | [RAVENNA AES67](Category-RAVENNA-AES67.md) |
| Try it | [full simulation: MLC8 / MLC6 level control](../siumulation.html?plugin=mlc8) · [full simulation: RD66-MLC8UsingAMS8E-1-iss5](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5) · [simulator & front panel](../simulator.html?m=MLC8-N) · [KiCad symbol generator](../kicad.html?m=MLC8-N) |
| Earliest dated evidence | [2017\|50](Year-2017.md) — dated folder |
| Evidence | in "WBS.NAB - 2017 - Rack layout images" |
| Confidence | low (named by) |
| All years found | [2017\|50](Year-2017.md), [2021\|54](Year-2021.md) |
| Variants | [MLC8](MLC8.md), [MLC8A](MLC8A.md), [MLC8B](MLC8B.md), [MLC8C](MLC8C.md), [MLC8D](MLC8D.md) |
| Folder | [Products/RAVENNA AES67/MLC8-N](../Products/RAVENNA%20AES67/MLC8-N/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC8-N" data-n="Three Quarter" data-cat="RAVENNA AES67" role="img" aria-label="MLC8-N front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC8-N: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC8N (Ravenna) REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **MLC8A V050000** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Main Board Revisions | SHARC firmware |  |  | **MLC8A v106** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **v050000** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **MLC8A V205** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **MLC8A V200** (in 05AV0000) | 2016-05-25 | MLCs |

**Product firmware versions (PFV)**: MLC8N (Ravenna) REVISIONS — Main Board Revisions: 2 revisions, latest released **05AV0000** (2016-05-25) · MLC8N (Ravenna) REVISIONS — Front Panel Revisions: 2 revisions, latest released **05AV0000** (2016-05-25)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### MLC8N (Ravenna) REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2016\|49 | 2016-05-25 | **05AV0000** | MLC8A V050000 | MLC8A v106 | v050000 | released |  |
| 2016\|49 | 2016-05-25 | **05AV0100** | MLC8B V050100 | MLC8B v106 | v050000 | released |  |

> ALTERA LOCATED IN THE "H:\Engineering\WBSProducts\MLC\MLC8\Software\MLC8N\AMS8-1" FOLDER

### MLC8N (Ravenna) REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2016\|49 | 2016-05-25 | **05AV0000** | MLC8A V205 | MLC8A V200 | released |  |
| 2016\|49 | 2016-05-25 | **05AV0100** | MLC8B V040000 | MLC8B V040000 | released |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **05AV0000** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Front Panel Revisions_
    - based on MLC8A 2.0.0.5
    - NOT RELEASED
- **05AV0100** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Front Panel Revisions_
    - based on MLC8B 05AV0100
    - NAB2016
- **05AV0000** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Main Board Revisions_
    - based on MLC8A 05AV0000
    - NOT RELEASED
- **05AV0100** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Main Board Revisions_
    - based on MLC8B 05AV0100
    - NAB2016

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - MLC8-N - Information Sheet.jpg](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Information%20Sheet.jpg) | [note](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Information%20Sheet.jpg.md) |
| 2018 | [2018 - MLC8-N - Three Quarter.jpg](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Three%20Quarter.jpg) | [note](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Three%20Quarter.jpg.md) |

## Contents (JSON)

```json
{
 "device": "MLC8-N",
 "name": "Three Quarter",
 "category": "RAVENNA AES67",
 "year": 2017,
 "documents": [
  {
   "file": "Products/RAVENNA AES67/MLC8-N/2018 - MLC8-N - Information Sheet.jpg",
   "year": 2018,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/RAVENNA AES67/MLC8-N/2018 - MLC8-N - Three Quarter.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  }
 ]
}
```
