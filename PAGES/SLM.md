---
type: "product"
code: "SLM"
title: "Series Stereo Loudness Meter"
category: "METERING"
year: 2014
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# SLM — Series Stereo Loudness Meter

**▶ [Open the SLM loudness meters simulation](../siumulation.html?plugin=slm)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: SLM loudness meters](../siumulation.html?plugin=slm) · [KiCad symbol generator](../kicad.html?m=SLM) · [download package (zip)](../_packages/SLM.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/SLM Series MANUAL_(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md) |
| Folder | [DOCUMENTS/METER/WBS PRODUCTS 2013 - documents-export-2013-03-08](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/) |
| Folder | [DOCUMENTS/RAW Photos/2021 Information sheets](../DOCUMENTS/RAW%20Photos/2021%20Information%20sheets/) |
| Folder | [Products/BUDDIES/ABS1](../Products/BUDDIES/ABS1/) |

## Connections

_What it is made of and what it is part of._

<div class="wbs-conn"><div class="wbs-face"><div class="wbs-live" data-m="SLM" data-n="Series Stereo Loudness Meter" data-cat="METERING"></div><svg class="wbs-panel" data-m="SLM" data-n="Series Stereo Loudness Meter" data-cat="METERING" role="img" aria-label="SLM front panel (drawn from the simulator's layout)"></svg></div><div class="wbs-main"><div class="wbs-spice"></div><script type="application/json" class="wbs-spice-data">{"code":"SLM","title":"Series Stereo Loudness Meter","rto":null,"parts":[],"parents":[{"label":"microDriver","href":"microDriver.html","note":"on 4 drawings with it: Miniature Stereo Headpho"},{"label":"ABS1","href":"ABS1.html","note":"on 4 drawings with it: Audio Bit Spitter Portab"}]}</script></div></div><script src="wbs_spice.js"></script>

<a id="software"></a>

## Software

_What runs on the SLM: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| SLM1A | Microcontroller | PIC12F675 | INT. CLOCK | **SLM1V101A** | 2010-01-25 | Standard Products |
| SLM4 | Microcontroller | PIC12F675 | INT. CLOCK | **SLM4V100** | 2003-10-20 | Standard Products |
| SLM4C | Microcontroller | PIC12F675 | INT. CLOCK | **SLM4V100** | 2003-10-20 | Standard Products |
| SLM8 (110 ohm balanced) | Microcontroller | ATMEGA128L | HS | **SLM8V103** | 2006-05-24 | Standard Products |
| SLM8 (75 ohm unbalanced) | Microcontroller | ATMEGA128L | HS | **SLM8V104** | 2007-05-07 | Standard Products |
| SLM1A | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **SLM1V101** | — | Sharc |
| SLM1A (HI-RES METER) | SHARC DSP boot (E)EPROM | AT25F512N |  | **SLM1V102** | — | Sharc |
| SLM1D | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **SLM1V101** | — | Sharc |
| SLM1D (HI-RES METER) | SHARC DSP boot (E)EPROM | AT25F512N |  | **SLM1-5_4LEDV102** | — | Sharc |
| SLM4 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **SLM4V100** | — | Sharc |
| SLM8 | Altera FPGA / CPLD | EPC1S |  | **SLM8V100** | — | Altera |
| SLM8 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **SLM8V102** | — | Sharc |

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2003\|36 | 2003-10-20 | SLM4 | PIC12F675 | SLM4V100 |  |  |
| 2003\|36 | 2003-10-20 | SLM4C | PIC12F675 | SLM4V100 |  |  |
| 2006\|39 | 2006-05-24 | SLM8 (110 ohm balanced) | ATMEGA128L | SLM8V103 | SLM8V104 |  |
| 2007\|40 | 2007-05-07 | SLM8 (75 ohm unbalanced) | ATMEGA128L | SLM8V104 |  | WKW 2007-05-07 |
| 2010\|43 | 2010-01-25 | SLM1A | PIC12F675 | SLM1V101A |  |  |
|  | — | SLM1A | AM29LV04OB-120JC | SLM1V101 |  |  |
|  | — | SLM1A (HI-RES METER) | AT25F512N | SLM1V102 |  |  |
|  | — | SLM1D | AM29LV04OB-120JC | SLM1V101 |  |  |
|  | — | SLM1D (HI-RES METER) | AT25F512N | SLM1-5_4LEDV102 |  |  |
|  | — | SLM4 | AM29LV04OB-120JC | SLM4V100 |  |  |
|  | — | SLM8 | EPC1S | SLM8V100 |  |  |
|  | — | SLM8 | AM29LV04OB-120JC | SLM8V102 |  |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **SLM8V103** — 2006|39 · 2006-05-24 — _SLM8 (110 ohm balanced) · ATMEGA128L_: UPDATED FOR PEAK HOLD FUNCTION
- **SLM8V104** — 2007|40 · 2007-05-07 — _SLM8 (75 ohm unbalanced) · ATMEGA128L_: UPDATED FOR IMPROVED DOLBY DETECTION
- **SLM1V101A** — 2010|43 · 2010-01-25 — _SLM1A · PIC12F675_: Updated to compile for MPLab v8.36. Fixed program memory order.
- **SLM4V100** — undated — _SLM4 · AM29LV04OB-120JC_: SOFTWARE NEEDS TO BE PLACED IN PROPER DIRECTORY — April 7, 2015- programming image was copied from one of the sample units and placed in the pfiles folder for production programming

_No change note in the listing for: SLM4V100, SLM8V100, SLM1V101, SLM1V102, SLM1-5_4LEDV102, SLM8V102._

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - SLM - Series MANUAL_ (2).docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - SLM - Series MANUAL_.docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - SLM - Series MANUAL_ (2).docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_%20%282%29.docx) | [note](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_%20%282%29.docx.md) |
| 2014 | [2014 - SLM - Series MANUAL_.docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_.docx) | [note](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_.docx.md) |

## Photos & scans (10)

| Year | File |  |
|---|---|---|
| ? | [19xx - DOC - SLM1A Rear.jpg](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/19xx%20-%20DOC%20-%20SLM1A%20Rear.jpg) | [note](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/19xx%20-%20DOC%20-%20SLM1A%20Rear.jpg.md) |
| ? | [19xx - DOC - SLM1D-110 Rear.jpg](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/19xx%20-%20DOC%20-%20SLM1D-110%20Rear.jpg) | [note](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/19xx%20-%20DOC%20-%20SLM1D-110%20Rear.jpg.md) |
| ? | [19xx - DOC - SLM1D-75 Rear.jpg](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/19xx%20-%20DOC%20-%20SLM1D-75%20Rear.jpg) | [note](../DOCUMENTS/METER/WBS%20PRODUCTS%202013%20-%20documents-export-2013-03-08/19xx%20-%20DOC%20-%20SLM1D-75%20Rear.jpg.md) |
| ? | [19xx - DOC - Commonly Requested Parts _ Accessories.jpg](../DOCUMENTS/RAW%20Photos/2021%20Information%20sheets/19xx%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg) | [note](../DOCUMENTS/RAW%20Photos/2021%20Information%20sheets/19xx%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg.md) |
| ? | [19xx - ABS1 - DOC - Commonly Requested Parts _ Accessories.jpg](../Products/BUDDIES/ABS1/19xx%20-%20ABS1%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg) | [note](../Products/BUDDIES/ABS1/19xx%20-%20ABS1%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg.md) |
| ? | [19xx - SLM - DOC - Commonly Requested Parts _ Accessories.jpg](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg) | [note](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg.md) |
| ? | [19xx - SLM - DOC - SLM1A Rear.jpg](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20SLM1A%20Rear.jpg) | [note](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20SLM1A%20Rear.jpg.md) |
| ? | [19xx - SLM - DOC - SLM1D-110 Rear.jpg](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20SLM1D-110%20Rear.jpg) | [note](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20SLM1D-110%20Rear.jpg.md) |
| ? | [19xx - SLM - DOC - SLM1D-75 Rear.jpg](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20SLM1D-75%20Rear.jpg) | [note](../Products/METERING/SLM/19xx%20-%20SLM%20-%20DOC%20-%20SLM1D-75%20Rear.jpg.md) |
| ? | [19xx - microDriver - DOC - Commonly Requested Parts _ Accessories.jpg](../Products/MICRO%20SERIES/microDriver/19xx%20-%20microDriver%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg) | [note](../Products/MICRO%20SERIES/microDriver/19xx%20-%20microDriver%20-%20DOC%20-%20Commonly%20Requested%20Parts%20_%20Accessories.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 97 words · 2014 - SLM - Series MANUAL_.docx, page 1</summary><p>ANALOG AUDIO</p><p>Meter Calibration 0VU = +4 dBu (or specify when ordering) Input Impedance &gt;20kΩ balanced Input Level +24dBu max Frequency Response +/- 0.25 dB, 20 Hz to 20 kHz Peak Hold Indicator Threshold +21 dBu</p><p>DIGITAL AUDIO</p><p>Meter Calibration 0VU = -20 dBFS (default, configurable with DIP SWITCHES) Input Standard AES/EBU 110Ω transformer balanced screw terminal</p><p>or 75Ω unbalanced BNC Input Level 0.2-5V p-p Sampling Frequency Range 30kHz to 96kHz Frequency Response +/- 0.25 dB, 20 Hz to 20 kHz Peak Hold Indicator Threshold -3 dB below Full Scale</p><p>GENERAL</p><p>AC Adaptor 6 Volts,  2 Amperes</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - SLM - Series MANUAL_.docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_.docx), p. 1
- also in: [2014 - SLM - Series MANUAL_ (2).docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - SLM - Series MANUAL_.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - SLM - Series MANUAL_.docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - SLM - Series MANUAL_ (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - SLM - Series MANUAL_ (2).docx](../Products/METERING/SLM/2014%20-%20SLM%20-%20Series%20MANUAL_%20%282%29.docx), p. 1

## Footnotes

1. Artwork 2026|59: the front lens and rear panel are drawn from SLM-1M7-SILK(CURVE).cdr and SLM-1M2-SILK(CURVE).cdr (both Jun 6 2016). — `#SLM #SERIES - To Delete/SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M7-SILK(CURVE).cdr`
2. The lens sheet puts the GREEN plate (logo, WARD-BECK SYSTEMS, meter frame) and the WHITE plate (scale, ranges, LOCK / NO LOCK, PHASE, LOUDNESS METER) side by side rather than stacked. — `#SLM #SERIES - To Delete/SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M7-SILK(CURVE).cdr`
3. The rear legend names the four DIP switches BS1, BS0, CAL1, CAL0 and warns “USE AC ADAPTER PROVIDED WITH THIS PRODUCT”. — `#SLM #SERIES - To Delete/SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M2-SILK(CURVE).cdr`
4. SLM-1M20-SILK(CURVE).cdr is exactly the same size as its non-curve twin, and the M13 CURVE file is smaller than its twin: those two were probably never converted to curves. — `#SLM #SERIES - To Delete/SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M20-SILK(CURVE).cdr`
5. The artwork folder also holds SLM-1 M4, M5, M12, M13, M18 and M20 panels that the simulator does not model. — `#SLM #SERIES - To Delete/SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M5-SILK(CURVE).cdr`
6. The SLM-1-3 engineering folder keeps a separate earlier SLM1-3 silk and front silk in CorelDRAW. — `#SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/PCB/SLM-1-3/SILK/SLM-1-3 FRONT-SILK-CURVE.cdr`
