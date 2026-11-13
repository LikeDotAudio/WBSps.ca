---
type: "product"
code: "AMS8-1CAM"
title: "Mkiii 8 Channel Audio Monitoring System"
category: "METERING"
year: 2018
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# AMS8-1CAM — Mkiii 8 Channel Audio Monitoring System

**▶ [Open the AMS81 simulation](../siumulation.html?plugin=ams81)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AMS81](../siumulation.html?plugin=ams81) · [KiCad symbol generator](../kicad.html?m=AMS8-1CAM) · [download package (zip)](../_packages/AMS8-1CAM.zip) |
| Earliest dated evidence | [2018\|51](Year-2018.md) — month & year |
| Evidence | "Aug.13 2018" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-1CAM Manual(1).docx |
| Confidence | medium |
| All years found | [2018\|51](Year-2018.md) |
| Variants | [AMS8-1](AMS8-1.md), [AMS8-1A](AMS8-1A.md), [AMS8-1AA](AMS8-1AA.md), [AMS8-1AAE](AMS8-1AAE.md), [AMS8-1AAEM](AMS8-1AAEM.md), [AMS8-1AAM](AMS8-1AAM.md), [AMS8-1AE](AMS8-1AE.md), [AMS8-1AEM](AMS8-1AEM.md), [AMS8-1AM](AMS8-1AM.md), [AMS8-1AN](AMS8-1AN.md), [AMS8-1BA](AMS8-1BA.md), [AMS8-1CA](AMS8-1CA.md), [AMS8-1CAEM](AMS8-1CAEM.md), [AMS8-2](AMS8-2.md), [AMS8-2A](AMS8-2A.md), [AMS8-2AA](AMS8-2AA.md), [AMS8-2AAE](AMS8-2AAE.md), [AMS8-2AAEM](AMS8-2AAEM.md), [AMS8-2AAM](AMS8-2AAM.md), [AMS8-2AE](AMS8-2AE.md), [AMS8-2AEM](AMS8-2AEM.md), [AMS8-2AM](AMS8-2AM.md) |
| Folder | [Products/METERING/AMS8-1CAM](../Products/METERING/AMS8-1CAM/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS8-1CAM" data-n="Mkiii 8 Channel Audio Monitoring System" data-cat="METERING" role="img" aria-label="AMS8-1CAM front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS8-1CAM: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS81-1CAM PRODUCT REVISIONS | AMS8E-1 firmware |  |  | **V050000** (in 06VA0001) | 2015-07-29 | AMS8-1B |
| AMS81-1CAM PRODUCT REVISIONS | AMS8E-5 firmware |  |  | **V040001** (in 06VA0001) | 2015-07-29 | AMS8-1B |
| AMS81-1CAM PRODUCT REVISIONS | SHARC firmware |  |  | **AMS81B102** (in 06VA0001) | 2015-07-29 | AMS8-1B |
| AMS81-1CAM PRODUCT REVISIONS | ALTERA firmware |  |  | **AMS81 V050000** (in 06VA0001) | 2015-07-29 | AMS8-1B |

**Product firmware versions (PFV)**: AMS81-1CAM PRODUCT REVISIONS: 3 revisions, latest released **06VA0001** (2015-07-29)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### AMS81-1CAM PRODUCT REVISIONS

_Sheet **AMS8-1B**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2009\|42 | 2009-08-24 | **1.0.0.0** | V1000 | V1000 | AMS81B102 | V1000 | released | DEMUX compatibility ATMEL - V202, ALTERA - V203 |
| 2013\|46 | 2013-08-29 | **06VA0000** | V050000 | V040000 | AMS81B102 | AMS81 V050000 | released |  |
| 2015\|48 | 2015-07-29 | **06VA0001** | V050000 | V040001 | AMS81B102 | AMS81 V050000 | released |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.0** — 2009|42 · 2009-08-24 — _AMS81-1CAM PRODUCT REVISIONS_: DEMUX compatibility: ATMEL - V202, ALTERA - V203
- **06VA0000** — 2013|46 · 2013-08-29 — _AMS81-1CAM PRODUCT REVISIONS_
    - Utilizing new AMS8E-1 ISS5 MAIN BOARD.
    - used by ABC/Disney Graphics
- **06VA0001** — 2015|48 · 2015-07-29 — _AMS81-1CAM PRODUCT REVISIONS_
    - Front panel Atmel display initialization updated. Now compatible with PDSP1884 & HDSP2533
    - As of July 2018 the AMS8E-6 board has been changed to Support Round buttons and the Aux Connector has been changed to a Female Tascam Standard

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2018\|51](Year-2018.md) | month & year | `Aug.13 2018` | [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `Aug.13 2018` | [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx) | [note](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx.md) |
| 2018 | [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx) | [note](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx.md) |

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - AMS8-1CAM - Information Sheet.jpg](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Information%20Sheet.jpg.md) |
| 2018 | [2018 - AMS8-1CAM - Rear.jpg](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Rear.jpg) | [note](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Rear.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 68 words · 2018 - AMS8-1CAM - Manual.docx, page 1</summary><p>* As of August 2018, the Analog Audio output connector has been redesigned to be a DB25 female connector with Tascam pinout.</p><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB25 female*</p><p>AES/EBU INPUTS</p><p>AES/EBU OUTPUTS</p><p>MONITOR OUTPUT</p><p>HEADSET JACK</p><p>THD ¼ inch</p><p>POWER</p><p>Input 90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-f0e6d1b5e71be8e8">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-82b3bc8d6c0b8d76">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx), p. 1
- also in: [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx), p. 1

### Operation (4)

<details><summary>Controls — 254 words · 2018 - AMS8-1CAM - Manual.docx, page 1</summary><p>There are eight illuminated pushbutton switches arranged in two rows of four.  The upper row of white buttons designated MONITOR selects the source to be monitored. Buttons 1/2, 3/4, 5/6 and 7/8 select the appropriate displayed audio pair for monitoring.  The lower row has three grey buttons labelled AES and Embedded 1-8 and 9-16. These allow the user to select the type of signal they would like to monitor. Pushing the AES button routes the bank of either the 75 or 110 Ohm AES inputs to the meter for monitoring. Selecting the 75 or 110 Ohm bank of AES inputs is determined in the initial setup of the unit. The AMS8-1CAM has been shipped with the 75 Ohm AES bank already selected. Pushing the Embedded 1-8 buttons extracts the first 8 channels (2 groups) from an 3G/HD/SD-SDI signal. Pushing the Embedded 9-16 extracts the last 8 channels (2 groups) from a 3G/HD/SD-SDI signal. The lower row also has one yellow button labelled SUM; when pushed, this allows the operator to mix any of the four sources available on the meter by pressing the appropriate pair buttons from the top row of monitor sources.</p><p>The two control knobs designated SELECT and VOLUME are rotary shaft encoders with integral push switches.  The VOLUME button adjusts the listening level of the unit’s integral speakers. Depressing the VOLUME knob mutes the speakers. To cancel the mute, depress the VOLUME knob again. The SELECT rotary shaft encoder is used during the initial setup of the unit.</p><p>AMS8-1CAM CONNECTER LAYOUTS</p></details>
- source: [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx), p. 1
<details><summary>Front Panel — 59 words · 2018 - AMS8-1CAM - Manual.docx, page 1</summary><p>DISPLAYS</p><p>Eight 22 segment LED bargraph meters display VU and Peak Program information simultaneously.  A reference LED (red) at the zero mark is continuously illuminated.  The ERR LED indicates an alarm.</p><p>An eight-character dot-matrix display located above the SELECT and VOLUME controls  to display signal parameters and status information.  This display also assists the user in making input selections</p></details>
- source: [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx), p. 1
- also in: [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx), p. 1 · [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2018 - AMS8-1CAM - Manual.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2018 - AMS8-1CAM - Manual.docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual.docx), p. 1
<details><summary>Warranty — 0 words · 2018 - AMS8-1CAM - Manual (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2018 - AMS8-1CAM - Manual (2).docx](../Products/METERING/AMS8-1CAM/2018%20-%20AMS8-1CAM%20-%20Manual%20%282%29.docx), p. 1

## Footnotes

1. Artwork 2026|59: the front, lens and rear are drawn from AMS8-1A-FRONT-SILK (CURVES).cdr (OCT.19/15), AMS8-M6-SILK(MLC8-M3) (CURVE).cdr (May 08/15) and AMS8-M2-Rear-SILK(Curve).cdr (MAY 07/15). — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
2. The ‘CURVES’ front file is not in curves: all 46 legends are still live Arial text, and the conversion loses their alignment. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
3. The 2015 front has hexagonal vents; the AMS8-1A (AMS8-M24) photo shows slotted vents, so the photo is of another issue. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/Pics/AMS8-1A (AMS8-M24)Front.jpg`
4. The meter lens is a shared part: the AMS8-M6 sheet is the long MLC8-M3 window with eight round holes on its right; the AMS8-1 uses only its left 216 pt. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr`
5. The front legend reads PRESET (singular), the AMS8-2 front reads PRESETS. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
6. Two AMS8-1A front sheets sit side by side with the same date: the CURVES file and AMS8-1A-FRONT-SILK (AMS8-M24).cdr. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (AMS8-M24).cdr`
7. The 1B and 1CA fronts (Apr 2016) are separate variants that the simulator does not model. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1CA-FRONT-SILK (CURVES).cdr`
