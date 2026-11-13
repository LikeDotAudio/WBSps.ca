---
type: "product"
code: "POD22"
title: "Stereo Loudness Meter"
category: "PODS"
year: 2014
confidence: "low (named by)"
tags: ["product", "pods", "2010s"]
---

# POD22 — Stereo Loudness Meter

|  |  |
|---|---|
| Type | product |
| Series | [PODS](Series-PODS.md) |
| Try it | [full simulation: POD22 -](../siumulation.html?plugin=pod22) · [simulator & front panel](../simulator.html?m=POD22) · [KiCad symbol generator](../kicad.html?m=POD22) · [download package (zip)](../_packages/POD22.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — named in document |
| Evidence | named in 2014 - POD22A - MANUAL.docx |
| Confidence | low (named by) |
| All years found | [2014\|47](Year-2014.md) |
| Variants | [POD22A](POD22A.md) |
| Folder | [Products/PODS/POD22](../Products/PODS/POD22/) |

## Front panel

<svg class="wbs-panel solo" data-m="POD22" data-n="Stereo Loudness Meter" data-cat="PODS" role="img" aria-label="POD22 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the POD22: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| POD22 | Microcontroller | PIC16F874 | HS | **POD22V103** | 2006-05-16 | Standard Products |
| POD22 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **v103** | 2011-06-13 | Sharc |
| POD22 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **POD22V102** | — | Sharc |

**Programming:** Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-05-16 | POD22 | PIC16F874 | POD22V103 |  |  |
| 2011\|44 | 2011-06-13 | POD22 | AM29LV04OB-120JC | v103 |  |  |
|  | — | POD22 | AM29LV04OB-120JC | POD22V102 |  |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **POD22V103** — 2006|39 · 2006-05-16 — _POD22 · PIC16F874_: UPDATED TO FIX THE NOISE ISSUE ON LOSS OF LOCK
- **v103** — 2011|44 · 2011-06-13 — _POD22 · AM29LV04OB-120JC_: DSP upgraded to support high resolution display boards

_No change note in the listing for: POD22V102._

## Photos & scans (1)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD22 - pod22_front.jpg](../Products/PODS/POD22/2014%20-%20POD22%20-%20pod22_front.jpg) | [note](../Products/PODS/POD22/2014%20-%20POD22%20-%20pod22_front.jpg.md) |

## Contents (JSON)

```json
{
 "device": "POD22",
 "name": "Stereo Loudness Meter",
 "category": "PODS",
 "year": 2014,
 "documents": [
  {
   "file": "Products/PODS/POD22/2014 - POD22 - pod22_front.jpg",
   "year": 2014,
   "pages": 1,
   "holds": []
  }
 ]
}
```
