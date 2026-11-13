---
type: "product"
code: "POD27"
title: "Audio Muxer"
category: "PODS"
year: 2014
confidence: "medium"
tags: ["product", "pods", "2010s"]
---

# POD27 — Audio Muxer

**▶ [Open the POD27 simulation](../siumulation.html?plugin=pod27)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [PODS](Series-PODS.md) |
| Try it | [full simulation: POD27](../siumulation.html?plugin=pod27) · [simulator & front panel](../simulator.html?m=POD27) · [KiCad symbol generator](../kicad.html?m=POD27) · [download package (zip)](../_packages/POD27.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD27 MANUAL(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md) |
| Folder | [Products/PODS/POD27](../Products/PODS/POD27/) |

## Front panel

<svg class="wbs-panel solo" data-m="POD27" data-n="Audio Muxer" data-cat="PODS" role="img" aria-label="POD27 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the POD27: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| POD27 | Microcontroller | PIC16F874 | HS | **Firmware Upgrade Required POD27V102** | 2005-02-24 | Standard Products |
| POD27 (NO SRC FOR DOLBY EMBEDDING) | Microcontroller | PIC16F874 | HS | **POD27V102(NO SRC)** | 2006-09-27 | Standard Products |
| POD27 (PAL - No Dolby) | Microcontroller | PIC16F874 | HS | **v200** | 2012-02-28 | Standard Products |

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2005\|38 | 2005-02-24 | POD27 | PIC16F874 | Firmware Upgrade Required POD27V102 | Firmware Update Required | Bob New firmware upgrade required to replace PUG mux core |
| 2006\|39 | 2006-09-27 | POD27 (NO SRC FOR DOLBY EMBEDDING) | PIC16F874 | POD27V102(NO SRC) |  | Bob 2006-09-27 |
| 2012\|45 | 2012-02-28 | POD27 (PAL - No Dolby) | PIC16F874 | v200 |  |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **Firmware Upgrade Required
POD27V102** — 2005|38 · 2005-02-24 — _POD27 · PIC16F874_: DISTORTED AUDIO WOULD OCCUR EVERYTIME AUDIO IN GROUP STATUS CHANGED
- **POD27V102(NO SRC)** — 2006|39 · 2006-09-27 — _POD27 (NO SRC FOR DOLBY EMBEDDING) · PIC16F874_: DISTORTED AUDIO WOULD OCCUR EVERYTIME AUDIO IN GROUP STATUS CHANGED
- **v200** — 2012|45 · 2012-02-28 — _POD27 (PAL - No Dolby) · PIC16F874_: PIC program changed to set genum chip for PAL SD SDI, this version doesn't work for NTSC SD SDI

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD27 - MANUAL (2).docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD27 - MANUAL.docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD27 - MANUAL (2).docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL%20%282%29.docx) | [note](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL%20%282%29.docx.md) |
| 2014 | [2014 - POD27 - MANUAL.docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL.docx) | [note](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL.docx.md) |

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD27 - Front.jpg](../Products/PODS/POD27/2014%20-%20POD27%20-%20Front.jpg) | [note](../Products/PODS/POD27/2014%20-%20POD27%20-%20Front.jpg.md) |
| 2014 | [2014 - POD27 - Rear.jpg](../Products/PODS/POD27/2014%20-%20POD27%20-%20Rear.jpg) | [note](../Products/PODS/POD27/2014%20-%20POD27%20-%20Rear.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 83 words · 2014 - POD27 - MANUAL.docx, page 1</summary><p>SDI INPUT/OUTPUT Input Impedance 75 Ω Input Level 0.8 V p-p (typical) Output Level 0.8 V p-p Output Impedance 75 Ω Return Loss 18 dB Data Rate 270 Mbps</p><p>DIGITAL INPUT Input Standard AES/EBU 110Ω transformer balanced screw terminal or 75Ω unbalanced BNC Input Level 0.2-7V p-p Sampling Frequency Range 30kHz to 96kHz</p><p>GENERAL Power Requirements 115 VAC,60Hz (available upon request) 230 VAC,50Hz Dimensions 8.69&quot; wide x 1.73&quot; high x 7.0&quot; deep (221mm x 44mm x 178 mm) Weight 1.37 kg (3.01 lbs)</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - POD27 - MANUAL.docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL.docx), p. 1
- also in: [2014 - POD27 - MANUAL (2).docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - POD27 - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD27 - MANUAL.docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - POD27 - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD27 - MANUAL (2).docx](../Products/PODS/POD27/2014%20-%20POD27%20-%20MANUAL%20%282%29.docx), p. 1

## Contents (JSON)

```json
{
 "device": "POD27",
 "name": "Audio Muxer",
 "category": "PODS",
 "year": 2014,
 "documents": [
  {
   "file": "Products/PODS/POD27/2014 - POD27 - Front.jpg",
   "year": 2014,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/PODS/POD27/2014 - POD27 - MANUAL (2).docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/PODS/POD27/2014 - POD27 - MANUAL.docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/PODS/POD27/2014 - POD27 - Rear.jpg",
   "year": 2014,
   "pages": 1,
   "holds": []
  }
 ]
}
```
