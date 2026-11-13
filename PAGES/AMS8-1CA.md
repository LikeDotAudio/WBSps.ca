---
type: "product"
code: "AMS8-1CA"
title: "Mkiii 8 Channel Audio Monitoring System"
category: "METERING"
year: 2013
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# AMS8-1CA — Mkiii 8 Channel Audio Monitoring System

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [simulator & front panel](../simulator.html?m=AMS8-1CA) · [KiCad symbol generator](../kicad.html?m=AMS8-1CA) · [download package (zip)](../_packages/AMS8-1CA.zip) |
| Earliest dated evidence | [2013\|46](Year-2013.md) — dated folder |
| Evidence | in "WBS PRODUCTS 2013 - documents-export-2013-03-08" |
| Confidence | low (named by) |
| All years found | [2013\|46](Year-2013.md), [2018\|51](Year-2018.md) |
| Variants | [AMS8-1](AMS8-1.md), [AMS8-1A](AMS8-1A.md), [AMS8-1AA](AMS8-1AA.md), [AMS8-1AAE](AMS8-1AAE.md), [AMS8-1AAEM](AMS8-1AAEM.md), [AMS8-1AAM](AMS8-1AAM.md), [AMS8-1AE](AMS8-1AE.md), [AMS8-1AEM](AMS8-1AEM.md), [AMS8-1AM](AMS8-1AM.md), [AMS8-1AN](AMS8-1AN.md), [AMS8-1BA](AMS8-1BA.md), [AMS8-1CAEM](AMS8-1CAEM.md), [AMS8-1CAM](AMS8-1CAM.md), [AMS8-2](AMS8-2.md), [AMS8-2A](AMS8-2A.md), [AMS8-2AA](AMS8-2AA.md), [AMS8-2AAE](AMS8-2AAE.md), [AMS8-2AAEM](AMS8-2AAEM.md), [AMS8-2AAM](AMS8-2AAM.md), [AMS8-2AE](AMS8-2AE.md), [AMS8-2AEM](AMS8-2AEM.md), [AMS8-2AM](AMS8-2AM.md) |
| Folder | [Products/METERING/AMS8-1CA](../Products/METERING/AMS8-1CA/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS8-1CA" data-n="Mkiii 8 Channel Audio Monitoring System" data-cat="METERING" role="img" aria-label="AMS8-1CA front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS8-1CA: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS81-C PRODUCT REVISIONS | AMS8E-1 firmware |  |  | **C1000** (in C1.0.0.0) | not released | AMS8-1B |
| AMS81-C PRODUCT REVISIONS | AMS8E-5 firmware |  |  | **C1000** (in C1.0.0.0) | not released | AMS8-1B |
| AMS81-C PRODUCT REVISIONS | SHARC firmware |  |  | **AMS81B102** (in C1.0.0.0) | not released | AMS8-1B |
| AMS81-C PRODUCT REVISIONS | ALTERA firmware |  |  | **V1000** (in C1.0.0.0) | not released | AMS8-1B |

**Product firmware versions (PFV)**: AMS81-C PRODUCT REVISIONS: 1 revisions, latest released **C1.0.0.0**

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### AMS81-C PRODUCT REVISIONS

_Sheet **AMS8-1B**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
|  | — | **C1.0.0.0** | C1000 | C1000 | AMS81B102 | V1000 | not released |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **C1.0.0.0** — not released — _AMS81-C PRODUCT REVISIONS_: USED FOR ABC DEMO

## Photos & scans (1)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS8-1CA - Series Front.jpg](../Products/METERING/AMS8-1CA/2014%20-%20AMS8-1CA%20-%20Series%20Front.jpg) | [note](../Products/METERING/AMS8-1CA/2014%20-%20AMS8-1CA%20-%20Series%20Front.jpg.md) |

## Contents (JSON)

```json
{
 "device": "AMS8-1CA",
 "name": "Mkiii 8 Channel Audio Monitoring System",
 "category": "METERING",
 "year": 2013,
 "documents": [
  {
   "file": "Products/METERING/AMS8-1CA/2014 - AMS8-1CA - Series Front.jpg",
   "year": 2014,
   "pages": 1,
   "holds": []
  }
 ]
}
```
