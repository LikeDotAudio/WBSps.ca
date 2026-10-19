---
type: "product"
code: "POD30"
title: "4x1 HD-SDI Switcher"
category: "PODS"
year: 2014
confidence: "medium"
tags: ["product", "pods", "2010s"]
---

# POD30 — 4x1 HD-SDI Switcher

|  |  |
|---|---|
| Type | product |
| Series | [PODS](Series-PODS.md) |
| Try it | [simulator & front panel](../simulator.html?m=POD30) · [download package (zip)](../_packages/POD30.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD30 MANUAL(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md) |
| Folder | [Products/PODS/POD30](../Products/PODS/POD30/) |

## Front panel

<svg class="wbs-panel solo" data-m="POD30" data-n="4x1 HD-SDI Switcher" data-cat="PODS" role="img" aria-label="POD30 front panel"></svg>

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD30 - MANUAL (2).docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD30 - MANUAL.docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD30 - MANUAL (2).docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL%20%282%29.docx) | [note](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL%20%282%29.docx.md) |
| 2014 | [2014 - POD30 - MANUAL.docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL.docx) | [note](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL.docx.md) |

## Photos & scans (3)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD30 - Front.jpg](../Products/PODS/POD30/2014%20-%20POD30%20-%20Front.jpg) | [note](../Products/PODS/POD30/2014%20-%20POD30%20-%20Front.jpg.md) |
| 2014 | [2014 - POD30 - Information Sheet.jpg](../Products/PODS/POD30/2014%20-%20POD30%20-%20Information%20Sheet.jpg) | [note](../Products/PODS/POD30/2014%20-%20POD30%20-%20Information%20Sheet.jpg.md) |
| 2014 | [2014 - POD30 - Rear.jpg](../Products/PODS/POD30/2014%20-%20POD30%20-%20Rear.jpg) | [note](../Products/PODS/POD30/2014%20-%20POD30%20-%20Rear.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 200 words · 2014 - POD30 - MANUAL.docx, page 1</summary><p>SDI INPUT</p><p>Input Impedance (4) 75Ω Input Level 0.8 Vp-p, nominal</p><p>SDI OUTPUT</p><p>Output Impedance (2) 75Ω Output level 0.8 Vp-p, terminated</p><p>REFERENCE INPUT Video Input 1 Vp-p, terminated Impedance 75Ω unbalanced Standards NTSC (PAL - consult factory)</p><p>GENERAL Power Requirements 100-240 VAC,50-60 Hz Dimensions 8.69&quot; wide x 1.73&quot; high x 7.0&quot; deep (221mm x 44mm x 178 mm) Weight 1.37 kg (3.01 lbs)</p><p>SERIAL PROTOCOL</p><p>1)</p><p>REQUEST STATUS ACTION: Two bytes are sent 1st byte  1 1 1 1 0 0 0 0 2nd byte 0 0 0 0 0 0 0 0</p><p>RESPONSE: 1st byte (POD30 Status)       1 X X X  X X X X                                                                      [ 4 3 2 1]</p><p>└────Video Inputs 1 through six X=0 Video source not selected X=1 Video source selected  2nd byte       0 0 0 0 0 0 0 0</p><p>2)</p><p>SWITCH VIDEO ACTION: Two bytes are sent 1st byte  1 1 1 1    0 0 0 0 2nd byte 1 0 X X  X X X X               └─────── Video input 001⇨100(1⇨4) RESPONSE POD30 will send back the same status bits as shown in the REQUEST STATUS command.</p><p>Note: If switching from SUM MODE send command F0, 80 followed by the desired switch command</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - POD30 - MANUAL.docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL.docx), p. 1
- also in: [2014 - POD30 - MANUAL (2).docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - POD30 - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD30 - MANUAL.docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - POD30 - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD30 - MANUAL (2).docx](../Products/PODS/POD30/2014%20-%20POD30%20-%20MANUAL%20%282%29.docx), p. 1
