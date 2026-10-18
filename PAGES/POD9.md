---
type: "product"
code: "POD9"
title: "Video Switcher"
category: "PODS"
year: 1995
confidence: "medium"
tags: ["product", "pods", "1990s"]
---

# POD9 — Video Switcher

|  |  |
|---|---|
| Type | product |
| Series | [PODS](Series-PODS.md) |
| Try it | [simulator & front panel](../simulator.html?m=POD9) · [download package (zip)](../_packages/POD9.zip) |
| Earliest dated evidence | [1995\|28](Year-1995.md) — original file date |
| Evidence | saved 1995-09-11: WBSps Engineering from H drive-20261018T013433Z-1-003/WBSps Engineering from H drive/WBSps - POD_OLD/POD9/ACAD/FAPOD9.DWG |
| Confidence | medium |
| All years found | [1995\|28](Year-1995.md), [1997\|30](Year-1997.md), [2014\|47](Year-2014.md) |
| Folder | [Products/PODS/POD9](../Products/PODS/POD9/) |

## Front panel

<svg class="wbs-panel solo" data-m="POD9" data-n="Video Switcher" data-cat="PODS" role="img" aria-label="POD9 front panel"></svg>

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD9 - MANUAL (2).docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD9 - MANUAL.docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL.docx) |

## Documents (3)

| Year | File |  |
|---|---|---|
| 1995 | [1995 - POD9 - POD2 - POD9.CFG - DOCUMENT.docx](../Products/PODS/POD9/1995%20-%20POD9%20-%20POD2%20-%20POD9.CFG%20-%20DOCUMENT.docx) | [note](../Products/PODS/POD9/1995%20-%20POD9%20-%20POD2%20-%20POD9.CFG%20-%20DOCUMENT.docx.md) |
| 2014 | [2014 - POD9 - MANUAL (2).docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL%20%282%29.docx) | [note](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL%20%282%29.docx.md) |
| 2014 | [2014 - POD9 - MANUAL.docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL.docx) | [note](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL.docx.md) |

## Photos & scans (3)

| Year | File |  |
|---|---|---|
| 1995 | [1995 - POD9 - Front.jpg](../Products/PODS/POD9/1995%20-%20POD9%20-%20Front.jpg) | [note](../Products/PODS/POD9/1995%20-%20POD9%20-%20Front.jpg.md) |
| 1995 | [1995 - POD9 - Information Sheet.jpg](../Products/PODS/POD9/1995%20-%20POD9%20-%20Information%20Sheet.jpg) | [note](../Products/PODS/POD9/1995%20-%20POD9%20-%20Information%20Sheet.jpg.md) |
| 1995 | [1995 - POD9 - Rear.jpg](../Products/PODS/POD9/1995%20-%20POD9%20-%20Rear.jpg) | [note](../Products/PODS/POD9/1995%20-%20POD9%20-%20Rear.jpg.md) |

## Drawings & design files (2)

| Year | File |  |
|---|---|---|
| 1995 | [1995 - POD9 - POD9 - FAPOD9 - DRAWING (AUTOCAD).dwg](../Products/PODS/POD9/1995%20-%20POD9%20-%20POD9%20-%20FAPOD9%20-%20DRAWING%20%28AUTOCAD%29.dwg) | [note](../Products/PODS/POD9/1995%20-%20POD9%20-%20POD9%20-%20FAPOD9%20-%20DRAWING%20%28AUTOCAD%29.dwg.md) |
| 1997 | [1997 - POD9 - POD9 - WSX - DOCUMENT.cdr](../Products/PODS/POD9/1997%20-%20POD9%20-%20POD9%20-%20WSX%20-%20DOCUMENT.cdr) | [note](../Products/PODS/POD9/1997%20-%20POD9%20-%20POD9%20-%20WSX%20-%20DOCUMENT.cdr.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 421 words · 2014 - POD9 - MANUAL.docx, page 1</summary><p>Input Impedance (6) 75 ohm Input Level 1 Vp-p, nominal Input Return Loss 46 dB Typical, @ 3.58M Output Impedance (2 splits) 75 ohm Output Level 1 Vp-p, terminated Response better than 0.05dB @ 3.58M Differential Gain better than 0.1% @ 3.58M Differential Phase better than 0.1deg @ 3.58M Crosstalk better than 60dB, @ 3.58M S/N better than 60dB, 5MHz B.W.</p><p>Power Requirements 115 VAC,60Hz  (available upon request) 230 VAC,50Hz Dimensions 8.69&quot; wide x 1.73&quot; high x 7.0&quot; deep                                                                                         (221mm x 44mm x 178 mm) Weight 1.37 kg (3.01 lbs)</p><p>SERIAL PROTOCOL</p><p>1)     REQUEST STATUS</p><p>ACTION: Two bytes are sent</p><p>1st byte    11110000</p><p>2nd byte 00000000</p><p>RESPONSE: 1st byte (POD9 Status)</p><p>1 X X X X X X X</p><p>X=0 Slave switch not activated ────┘[6 5 4 3 2 1]</p><p>X=1 Slave switch activated └── Video Inputs 1 through 6</p><p>X=0 Video source not selected</p><p>X=1 Video source selected</p><p>2nd byte (POD2 Status)</p><p>0 X X X X X X X</p><p>X=0 Sum switch not activated ────┘[6 5 4 3 2 1]</p><p>X=1 Sum switch activated └── Audio Inputs 1 through 6</p><p>X=0 Audio source not selected</p><p>X=1 Audio source selected</p><p>2)     SUM AUDIO</p><p>Action: Two bytes are sent</p><p>1st byte    1 1 1 1 0 0 0 0</p><p>2nd byte 0 1 X X X X X X</p><p>[6 5 4 3 2 1]</p><p>└── Audio Inputs 1 through 6</p><p>X=0 Audio source not selected</p><p>X=1 Audio source selected</p><p>RESPONSE POD9 will send back the same status bits as shown in the REQUEST STATUS command.</p><p>NOTE: To cancel SUM MODE send command F0, 80 (HEX) followed by desired switch command,</p><p>3)   SWITCH AUDIO AND VIDEO</p><p>Action: Two bytes are sent</p><p>1st byte    1 1 1 1 0 0 0 0</p><p>2nd byte 1 0 X X X X X X</p><p>└── Audio Input 001➩110 (1➩ 6) └───── Video Input 001➩110 (1➩ 6) RESPONSE POD2 will send back the same status bits as shown in the REQUEST STATUS command. NOTE: If switching from SUM MODE send command F0, 80 followed by the desired switch command.</p><p>4)        SLAVE AUDIO AND VIDEO</p><p>Action: Two bytes are sent</p><p>1st byte    1 1 1 1 0 0 0 0</p><p>2nd byte 1 1 0 0 0 X X X</p><p>└── Input 001➩110 (1➩ 6)</p><p>RESPONSE POD2 will send back the same status bits as shown in the REQUEST STATUS command.</p><p>NOTE: The Slave indicator on POD9 may be turned on by sending the command F0, C0 (HEX) and turned off by F0, C7 (HEX).</p><p>GPI</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - POD9 - MANUAL.docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL.docx), p. 1
- also in: [2014 - POD9 - MANUAL (2).docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL%20%282%29.docx), p. 1

### Installation (2)

<details><summary>Connections — 22 words · 2014 - POD9 - MANUAL.docx, page 1</summary><p>(DB9F) Transit data from (3-TX+, 8-TX-) Receive data from (7-RX+, 2-RX-) Ground (5-GND)</p><p>The communication protocol is detailed on the following pages</p></details>
- source: [2014 - POD9 - MANUAL.docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL.docx), p. 1
- also in: [2014 - POD9 - MANUAL (2).docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - POD9 - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD9 - MANUAL.docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - POD9 - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD9 - MANUAL (2).docx](../Products/PODS/POD9/2014%20-%20POD9%20-%20MANUAL%20%282%29.docx), p. 1

## Contents (JSON)

```json
{
 "device": "POD9",
 "name": "Video Switcher",
 "category": "PODS",
 "year": 1995,
 "documents": [
  {
   "file": "Products/PODS/POD9/1995 - POD9 - Front.jpg",
   "year": 1995,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/PODS/POD9/1995 - POD9 - Information Sheet.jpg",
   "year": 1995,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/PODS/POD9/1995 - POD9 - POD2 - POD9.CFG - DOCUMENT.docx",
   "year": 1995,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/PODS/POD9/1995 - POD9 - POD9 - FAPOD9 - DRAWING (AUTOCAD).dwg",
   "year": 1995,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/PODS/POD9/1995 - POD9 - Rear.jpg",
   "year": 1995,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/PODS/POD9/1997 - POD9 - POD9 - WSX - DOCUMENT.cdr",
   "year": 1997,
   "pages": null,
   "holds": []
  },
  {
   "file": "Products/PODS/POD9/2014 - POD9 - MANUAL (2).docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/PODS/POD9/2014 - POD9 - MANUAL.docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  }
 ]
}
```
