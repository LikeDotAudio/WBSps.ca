---
type: "product"
code: "DMS1"
title: "Select Series Digital Monitoring System"
category: "METERING"
year: 2015
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# DMS1 — Select Series Digital Monitoring System

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: DMS](../siumulation.html?plugin=dms) · [full simulation: DMS1](../siumulation.html?plugin=dms1) · [simulator & front panel](../simulator.html?m=DMS1) · [KiCad symbol generator](../kicad.html?m=DMS1) · [download package (zip)](../_packages/DMS1.zip) |
| Earliest dated evidence | [2015\|48](Year-2015.md) — month & year |
| Evidence | "Jan.01 2015" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/DMS1 Manual(1).docx |
| Confidence | medium |
| All years found | [2015\|48](Year-2015.md) |
| Folder | [Products/METERING/DMS1](../Products/METERING/DMS1/) |

## Front panel

<svg class="wbs-panel solo" data-m="DMS1" data-n="Select Series Digital Monitoring System" data-cat="METERING" role="img" aria-label="DMS1 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the DMS1: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| DMS-1 | Microcontroller | PIC16F73 | HS | **DMS1V102** | 2011-02-18 | Standard Products |
| DMS-1(obsolete) | Microcontroller | PIC16F73 | HS | **DMS1V101** | 2001-11-23 | Standard Products |
| DEMUX-3 FOR DMS-1 UNITS (DEMUX-3) | ATMEL firmware |  |  | **v400** (in 4.0.0.0) | 2011-08-16 | DEMUX-3 |
| DEMUX-3 FOR DMS-1 UNITS (DEMUX-3) | ALTERA firmware |  |  | **v301** (in 4.0.0.0) | 2011-08-16 | DEMUX-3 |
| DEMUX-4 FOR DMS1 UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020300** (in 02AV0300) | 2014-04-30 | DEMUX-4 |
| DEMUX-4 FOR DMS1 UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0300) | 2014-04-30 | DEMUX-4 |

**Also:** [DEMUX-3 FOR DMS-1 UNITS](DEMUX-3.md#software) · [DEMUX-4 FOR DMS1 UNITS](DEMUX-4.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2001\|34 | 2001-11-23 | DMS-1(obsolete) | PIC16F73 | DMS1V101 |  |  |
| 2011\|44 | 2011-02-18 | DMS-1 | PIC16F73 | DMS1V102 |  | ALI 2011-02-18 |

### DEMUX-3 FOR DMS-1 UNITS

_From the [DEMUX-3](DEMUX-3.md#software) sheet: the build used in the DMS1._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2011\|44 | 2011-04-06 | **2.0.0.5** | V204 | V301 | released | ALI 2011-04-06 |
| 2011\|44 | 2011-08-16 | **4.0.0.0** | v400 | v301 | released | ALI 2011-08-16 |

### DEMUX-4 FOR DMS1 UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the DMS1._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2014\|47 | 2014-04-30 | **02AV0300** | V020300 | V020000 | released | WKW 2014-04-28; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **DMS1V101** — 2001|34 · 2001-11-23 — _DMS-1(obsolete) · PIC16F73_: UPDATED FOR PIC16F73 AND IMPROVED COMMUNICATIONS
- **DMS1V102** — 2011|44 · 2011-02-18 — _DMS-1 · PIC16F73_: Corrects the Issue with SDI LED lost lock when startup
- **2.0.0.5** — 2011|44 · 2011-04-06 — _DEMUX-3 FOR DMS-1 UNITS_: Atmel based on V200-4, corrected the communication procedure and wrong device type
- **4.0.0.0** — 2011|44 · 2011-08-16 — _DEMUX-3 FOR DMS-1 UNITS_: Atmel based on V201-4 to correct the communication problems the previous version had
- **02AV0300** — 2014|47 · 2014-04-30 — _DEMUX-4 FOR DMS1 UNITS_: based on 02VA0000, Atmel Changed to accommodate XTM4 control

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2015\|48](Year-2015.md) | month & year | `Jan.01 2015` | [2015 - DMS1 - Manual (2).docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual%20%282%29.docx) |
| [2015\|48](Year-2015.md) | month & year | `Jan.01 2015` | [2015 - DMS1 - Manual.docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2015 | [2015 - DMS1 - Manual (2).docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual%20%282%29.docx) | [note](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual%20%282%29.docx.md) |
| 2015 | [2015 - DMS1 - Manual.docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual.docx) | [note](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual.docx.md) |

## Photos & scans (3)

| Year | File |  |
|---|---|---|
| 2015 | [2015 - DMS1 - Front.jpg](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Front.jpg) | [note](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Front.jpg.md) |
| 2015 | [2015 - DMS1 - Information Sheet.jpg](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Information%20Sheet.jpg.md) |
| 2015 | [2015 - DMS1 - Rear.jpg](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Rear.jpg) | [note](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Rear.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 99 words · 2015 - DMS1 - Manual (2).docx, page 1</summary><p>DIGITAL Input Standard AES/EBU 110Ω transformer balanced XLR3 or 75Ω unbalanced BNC Input Level 1-5V p-p Sampling Frequency Range 30kHz to 50kHz Meter Level 0VU = -20dBFS (or specify when ordering)</p><p>ANALOG Input Impedance &gt;20kΩ balanced Input Level +24dBu max Meter Level 0VU = +4dBu(or specify when ordering)</p><p>SDI Input Impedance 75Ω Input Level 0.8 Vp-p (typical) Output Level 0.8 V p-p Output Impedance 75Ω Data Rate (Demux-4)</p><p>270-1485-2970Mbps</p><p>GENERAL Power Requirements 115V AC/60Hz 25VA</p><p>(Available upon request) 230V AC/50Hz Dimensions 19&quot; wide x 1¾&quot; high x 10¾&quot; deep</p><p>(483mm x 44mm x 273 mm) Weight 4.5kg (10 lbs)</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2015 - DMS1 - Manual (2).docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual%20%282%29.docx), p. 1
- also in: [2015 - DMS1 - Manual.docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2015 - DMS1 - Manual (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2015 - DMS1 - Manual (2).docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual%20%282%29.docx), p. 1
<details><summary>Warranty — 0 words · 2015 - DMS1 - Manual.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2015 - DMS1 - Manual.docx](../Products/METERING/DMS1/2015%20-%20DMS1%20-%20Manual.docx), p. 1

## Contents (JSON)

```json
{
 "device": "DMS1",
 "name": "Select Series Digital Monitoring System",
 "category": "METERING",
 "year": 2015,
 "documents": [
  {
   "file": "Products/METERING/DMS1/2015 - DMS1 - Front.jpg",
   "year": 2015,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/DMS1/2015 - DMS1 - Information Sheet.jpg",
   "year": 2015,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/METERING/DMS1/2015 - DMS1 - Manual (2).docx",
   "year": 2015,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/DMS1/2015 - DMS1 - Manual.docx",
   "year": 2015,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/DMS1/2015 - DMS1 - Rear.jpg",
   "year": 2015,
   "pages": 1,
   "holds": []
  }
 ]
}
```
