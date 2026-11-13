---
type: "product"
code: "VMS33"
title: "Video And Audio Monitoring System"
category: "METERING"
year: 2015
confidence: "estimate"
tags: ["product", "metering", "2010s"]
---

# VMS33 — Video And Audio Monitoring System

**▶ [Open the VMS simulation](../siumulation.html?plugin=vms)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: VMS](../siumulation.html?plugin=vms) · [KiCad symbol generator](../kicad.html?m=VMS33) · [download package (zip)](../_packages/VMS33.zip) |
| Earliest dated evidence | [2015\|48](Year-2015.md) — similar models |
| Evidence | filed with 19 dated models in "Metering and Monitoring Manuals" |
| Confidence | estimate |
| All years found | [2015\|48](Year-2015.md) |
| Folder | [Products/METERING/VMS33](../Products/METERING/VMS33/) |

## Front panel

<svg class="wbs-panel solo" data-m="VMS33" data-n="Video And Audio Monitoring System" data-cat="METERING" role="img" aria-label="VMS33 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the VMS33: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| VMS33 | Microcontroller | PIC16F874 | HS | **VMS33V102** | 2003-06-12 | Standard Products |
| VMS33 (ANALOG INPUTS) | Microcontroller | PIC16F874 | HS | **VMS33V105** | 2007-09-12 | Standard Products |
| VMS33 | Altera FPGA / CPLD | EPM3128ATC144-10 |  | **VMS33V103** | — | Altera |
| VMS33 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **VMS33V101** | — | Sharc |
| VMS33 (ANALOG INPUTS) | Altera FPGA / CPLD | EPM3128ATC144-10 |  | **VMS33V102** | — | Altera |
| VMS33 (ANALOG INPUTS) | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **VMS33V102** | — | Sharc |

**Programming:** Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2003\|36 | 2003-06-12 | VMS33 | PIC16F874 | VMS33V102 |  |  |
| 2007\|40 | 2007-09-12 | VMS33 (ANALOG INPUTS) | PIC16F874 | VMS33V105 |  | WKW 2007-09-12 |
|  | — | VMS33 | EPM3128ATC144-10 | VMS33V103 |  |  |
|  | — | VMS33 | AM29LV04OB-120JC | VMS33V101 |  |  |
|  | — | VMS33 (ANALOG INPUTS) | EPM3128ATC144-10 | VMS33V102 |  |  |
|  | — | VMS33 (ANALOG INPUTS) | AM29LV04OB-120JC | VMS33V102 |  |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **VMS33V102** — 2003|36 · 2003-06-12 — _VMS33 · PIC16F874_: REAR PANEL PUSHBUTTON CHANGE
- **VMS33V105** — 2007|40 · 2007-09-12 — _VMS33 (ANALOG INPUTS) · PIC16F874_: MODIFIED SOFTWARE TO FIX INTERMITTENT MONITOR 1 POWER ON STATUS

_No change note in the listing for: VMS33V103, VMS33V102, VMS33V101._

## Documents (2)

| Year | File |  |
|---|---|---|
| ? | [19xx - VMS33 - Manual (2).docx](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual%20%282%29.docx) | [note](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual%20%282%29.docx.md) |
| ? | [19xx - VMS33 - Manual.docx](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual.docx) | [note](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual.docx.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 136 words · 19xx - VMS33 - Manual.docx, page 1</summary><p>DIGITAL</p><p>Input Standard 110 Ohm, transformer balanced screw terminal</p><p>75 Ohm, unbalanced BNC Input Level 0.2-5Vp-p Sampling Frequency Range 30 kHz to 96 kHz Frequency Response +/- 0.25 dB 20 Hz to 20 kHz</p><p>ANALOG</p><p>Input Impedance greater than 20KOhm balanced Meter Level 0 VU = +4 dBu Frequency Response +/- 0.25 dB 20 Hz to 20 kHz</p><p>ANALOG VIDEO INPUT (NTSC)</p><p>Input Level 1 V p-p (nominal) Input Impedance 75 Ohm</p><p>DIGITAL OUTPUT</p><p>Resolution 24 bits Output Standard AES/EBU 75 Ohm unbalanced Sampling Frequency 48 kHz Jitter 5 ns Level 1 Vp-p terminated</p><p>GENERAL</p><p>Horizontal Viewing Angle +/- 55 degrees Tilting Angle +/- 40 degrees Telescoping Range 1.5 inches Power Requirements 90-230 V/50-60 Hz Dimensions 19&quot; wide x 5.25&quot; high x 10.75&quot; deep</p><p>(483mm x 88 mm x 273 mm) Weight 8.03 lbs (3.65 kg)</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [19xx - VMS33 - Manual.docx](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual.docx), p. 1
- also in: [19xx - VMS33 - Manual (2).docx](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 19xx - VMS33 - Manual.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [19xx - VMS33 - Manual.docx](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual.docx), p. 1
<details><summary>Warranty — 0 words · 19xx - VMS33 - Manual (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [19xx - VMS33 - Manual (2).docx](../Products/METERING/VMS33/19xx%20-%20VMS33%20-%20Manual%20%282%29.docx), p. 1
