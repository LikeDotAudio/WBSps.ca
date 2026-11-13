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

**▶ [Open the AMS81 simulation](../siumulation.html?plugin=ams81)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AMS81](../siumulation.html?plugin=ams81) · [KiCad symbol generator](../kicad.html?m=AMS8-1CA) · [download package (zip)](../_packages/AMS8-1CA.zip) |
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

## Footnotes

1. Artwork 2026|59: the front, lens and rear are drawn from AMS8-1A-FRONT-SILK (CURVES).cdr (OCT.19/15), AMS8-M6-SILK(MLC8-M3) (CURVE).cdr (May 08/15) and AMS8-M2-Rear-SILK(Curve).cdr (MAY 07/15). — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
2. The ‘CURVES’ front file is not in curves: all 46 legends are still live Arial text, and the conversion loses their alignment. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
3. The 2015 front has hexagonal vents; the AMS8-1A (AMS8-M24) photo shows slotted vents, so the photo is of another issue. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/Pics/AMS8-1A (AMS8-M24)Front.jpg`
4. The meter lens is a shared part: the AMS8-M6 sheet is the long MLC8-M3 window with eight round holes on its right; the AMS8-1 uses only its left 216 pt. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr`
5. The front legend reads PRESET (singular), the AMS8-2 front reads PRESETS. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
6. Two AMS8-1A front sheets sit side by side with the same date: the CURVES file and AMS8-1A-FRONT-SILK (AMS8-M24).cdr. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (AMS8-M24).cdr`
7. The 1B and 1CA fronts (Apr 2016) are separate variants that the simulator does not model. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1CA-FRONT-SILK (CURVES).cdr`
