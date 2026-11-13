---
type: "product"
code: "POD3A"
title: "Analog Stereo Loudness Meter"
category: "PODS"
year: 2014
confidence: "medium"
tags: ["product", "pods", "2010s"]
---

# POD3A — Analog Stereo Loudness Meter

**▶ [Open the POD3A simulation](../siumulation.html?plugin=pod3a)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [PODS](Series-PODS.md) |
| Try it | [full simulation: POD3A](../siumulation.html?plugin=pod3a) · [KiCad symbol generator](../kicad.html?m=POD3A) · [download package (zip)](../_packages/POD3A.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD3A MANUAL(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md) |
| Variants | [POD3](POD3.md) |
| Folder | [Products/PODS/POD3A](../Products/PODS/POD3A/) |

## Front panel

<svg class="wbs-panel solo" data-m="POD3A" data-n="Analog Stereo Loudness Meter" data-cat="PODS" role="img" aria-label="POD3A front panel"></svg>

<a id="software"></a>

## Software

_What runs on the POD3A: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| POD3A | Microcontroller | PIC12F675 | INT. CLOCK | **SLM1V100A** | 2006-10-19 | Standard Products |
| POD3A / SLM1A (HI-RES METER) (hi-res meter, shared with SLM1A) | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **POD3V100** | — | Sharc |

**Programming:** Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-10-19 | POD3A | PIC12F675 | SLM1V100A |  | WKW 2006-11-01 |
|  | — | POD3A / SLM1A (HI-RES METER) | AM29LV04OB-120JC | POD3V100 |  |  |

## Changes in each version

_No change note in the listing for: SLM1V100A, POD3V100._

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD3A - MANUAL (2).docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - POD3A - MANUAL.docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD3A - MANUAL (2).docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL%20%282%29.docx) | [note](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL%20%282%29.docx.md) |
| 2014 | [2014 - POD3A - MANUAL.docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL.docx) | [note](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL.docx.md) |

## Photos & scans (3)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD3A - Front.jpg](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20Front.jpg) | [note](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20Front.jpg.md) |
| 2014 | [2014 - POD3A - Information Sheet.jpg](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20Information%20Sheet.jpg) | [note](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20Information%20Sheet.jpg.md) |
| 2014 | [2014 - POD3A - Rear.jpg](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20Rear.jpg) | [note](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20Rear.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 60 words · 2014 - POD3A - MANUAL.docx, page 1</summary><p>ANALOG AUDIO</p><p>Meter Calibration 0VU = +4 dBu (or specify when ordering) Input Impedance &gt;20kΩ balanced Input Level +24 dBu max Frequency Response +/- 0.25dB, 20Hz to 20kHz Peak Hold Indicator Threshold +21 dBu</p><p>GENERAL</p><p>Power Requirements 100-240 VAC,50-60 Hz Dimensions 8.69&quot; wide x 1.73&quot; high x 7.0&quot; deep (221mm x 44mm x 178 mm) Weight 1.37 kg (3.01 lbs)</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - POD3A - MANUAL.docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL.docx), p. 1
- also in: [2014 - POD3A - MANUAL (2).docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - POD3A - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD3A - MANUAL.docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - POD3A - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - POD3A - MANUAL (2).docx](../Products/PODS/POD3A/2014%20-%20POD3A%20-%20MANUAL%20%282%29.docx), p. 1

## Footnotes

1. The panel artwork POD3A-FRONT&amp;REAR-SILK (CURVE).cdr is stored twice, byte for byte: in #ARTWORK #DA #2016 and in #Engineering/SILK. — `#POD #SERIES/POD3A - #Master/POD3A - #Engineering/SILK/POD3A-FRONT&REAR-SILK (CURVE).cdr`
2. The front plates draw no outline for the LED window or the phase column; only the scale numbers place them, so the simulator takes the LED rows from the photo. — `#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).cdr`
3. POD3-SILK-NEW.cdr (21 Sep 2006) is an older live-text version of the same POD-3A legend, eight years before the curve sheet. — `#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3-SILK-NEW.cdr`
4. The rear "+ - G" terminal legend is printed once, rotated beside the R input; the L input has none of its own. — `#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).cdr`
5. The sheet prints the DIP legend OFF above ON, while the switch body in the photo has its ON at the top. — `#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/Pics/POD3A Rear.jpg`
