---
type: "product"
code: "AMS4"
title: "Audio Monitor System"
category: "METERING"
year: 2013
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# AMS4 — Audio Monitor System

**▶ [Open the AMS4 simulation](../siumulation.html?plugin=ams4)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AMS4](../siumulation.html?plugin=ams4) · [simulator & front panel](../simulator.html?m=AMS4) · [KiCad symbol generator](../kicad.html?m=AMS4) · [download package (zip)](../_packages/AMS4.zip) |
| Earliest dated evidence | [2013\|46](Year-2013.md) — dated folder |
| Evidence | in "WBS PRODUCTS 2013 - documents-export-2013-03-08" |
| Confidence | low (named by) |
| All years found | [2013\|46](Year-2013.md), [2016\|49](Year-2016.md), [2021\|54](Year-2021.md) |
| Variants | [AMS4-1AA](AMS4-1AA.md) |
| Folder | [DOCUMENTS/RECENT SCANS/WBSps.ca 20210317 - Large pile of D](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/) |
| Folder | [Products/METERING/AMS4](../Products/METERING/AMS4/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS4" data-n="Audio Monitor System" data-cat="METERING" role="img" aria-label="AMS4 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS4: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS4(demux3) (with DEMUX-3) | Microcontroller | PIC16F874 | HS | **AMS4V203** | 2002-06-19 | Standard Products |
| AMS4(demux4) (with DEMUX-4) | Microcontroller | PIC16F874 | HS | **V050000 (AMS4V500)** | 2013-11-25 | Standard Products |
| AMS4N | Microcontroller | PIC16F874 | HS | **AMS4NV100** | 2005-07-26 | Standard Products |
| DEMUX-4 FOR AMS4 UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020101** (in 02AV0101) | 2014-09-17 | DEMUX-4 |
| DEMUX-4 FOR AMS4 UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0101) | 2014-09-17 | DEMUX-4 |

**Also:** [DEMUX-4 FOR AMS4 UNITS](DEMUX-4.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2002\|35 | 2002-06-19 | AMS4(demux3) | PIC16F874 | AMS4V203 |  |  |
| 2005\|38 | 2005-07-26 | AMS4N | PIC16F874 | AMS4NV100 |  |  |
| 2013\|46 | 2013-11-25 | AMS4(demux4) | PIC16F874 | V050000 (AMS4V500) |  |  |

### DEMUX-4 FOR AMS4 UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the AMS4._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2013\|46 | 2013-12-12 | **02AV0100** | V020100 | V020000 | released | WKW 2013-11-25; Flash M25P16; PCB issue 2 |
| 2014\|47 | 2014-09-17 | **02AV0101** | V020101 | V020000 | released | WKW 2014-09-17; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **AMS4V203** — 2002|35 · 2002-06-19 — _AMS4(demux3) · PIC16F874_: UPDATED FOR NEW ISSUE 5 PCB
- **V050000 (AMS4V500)** — 2013|46 · 2013-11-25 — _AMS4(demux4) · PIC16F874_: Updated for using new demux4
- **02AV0100** — 2013|46 · 2013-12-12 — _DEMUX-4 FOR AMS4 UNITS_: based on 02VA0000, Atmel Changed to accomodate AMS4 control
- **02AV0101** — 2014|47 · 2014-09-17 — _DEMUX-4 FOR AMS4 UNITS_: Fixes the bug that happens sometimes by resetting the power where the demux board doesn’t lock, to resolve it generates a watchdog reset, it should be implemented in other versions as well.

_No change note in the listing for: AMS4NV100._

## Photos & scans (12)

| Year | File |  |
|---|---|---|
| 2016 | [2016 - AMS4 - Front.jpg](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Front.jpg) | [note](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Front.jpg.md) |
| 2016 | [2016 - AMS4 - Information Sheet.jpg](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Information%20Sheet.jpg.md) |
| 2016 | [2016 - AMS4 - Rear Demux.jpg](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Rear%20Demux.jpg) | [note](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Rear%20Demux.jpg.md) |
| 2016 | [2016 - AMS4 - Rear.jpg](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Rear.jpg) | [note](../Products/METERING/AMS4/2016%20-%20AMS4%20-%20Rear.jpg.md) |
| ? | [19xx - DOC - 2021-3-16-23-53-33.jpg](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-53-33.jpg) | [note](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-53-33.jpg.md) |
| ? | [19xx - DOC - 2021-3-16-23-54-15.jpg](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-54-15.jpg) | [note](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-54-15.jpg.md) |
| ? | [19xx - DOC - 2021-3-16-23-54-40.jpg](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-54-40.jpg) | [note](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-54-40.jpg.md) |
| ? | [19xx - DOC - 2021-3-16-23-54-55.jpg](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-54-55.jpg) | [note](../DOCUMENTS/RECENT%20SCANS/WBSps.ca%2020210317%20-%20Large%20pile%20of%20D/19xx%20-%20DOC%20-%202021-3-16-23-54-55.jpg.md) |
| ? | [19xx - AMS4 - DOC - 2021-3-16-23-53-33.jpg](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-53-33.jpg) | [note](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-53-33.jpg.md) |
| ? | [19xx - AMS4 - DOC - 2021-3-16-23-54-15.jpg](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-54-15.jpg) | [note](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-54-15.jpg.md) |
| ? | [19xx - AMS4 - DOC - 2021-3-16-23-54-40.jpg](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-54-40.jpg) | [note](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-54-40.jpg.md) |
| ? | [19xx - AMS4 - DOC - 2021-3-16-23-54-55.jpg](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-54-55.jpg) | [note](../Products/METERING/AMS4/19xx%20-%20AMS4%20-%20DOC%20-%202021-3-16-23-54-55.jpg.md) |

## Contents (JSON)

```json
{
 "device": "AMS4",
 "name": "Audio Monitor System",
 "category": "METERING",
 "year": 2013,
 "documents": [
  {
   "file": "Products/METERING/AMS4/2016 - AMS4 - Front.jpg",
   "year": 2016,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/AMS4/2016 - AMS4 - Information Sheet.jpg",
   "year": 2016,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/METERING/AMS4/2016 - AMS4 - Rear Demux.jpg",
   "year": 2016,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/AMS4/2016 - AMS4 - Rear.jpg",
   "year": 2016,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/AMS4/19xx - AMS4 - DOC - 2021-3-16-23-53-33.jpg",
   "year": null,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/AMS4/19xx - AMS4 - DOC - 2021-3-16-23-54-15.jpg",
   "year": null,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/AMS4/19xx - AMS4 - DOC - 2021-3-16-23-54-40.jpg",
   "year": null,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/AMS4/19xx - AMS4 - DOC - 2021-3-16-23-54-55.jpg",
   "year": null,
   "pages": 1,
   "holds": []
  }
 ]
}
```
