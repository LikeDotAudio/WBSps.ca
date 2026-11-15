---
type: "product"
code: "XTM4"
title: "Extended Range Test Meter"
category: "METERING"
year: 2014
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# XTM4 — Extended Range Test Meter

**▶ [Open the XTM-4 Live Soundcard Visualizer](../XTM.WBSps.ca/)** — standalone real-time audio metering engine with live soundcard & system audio capture, VU & PPM electromechanical ballistics, and phase correlation

**▶ [Open the XTM4 simulation](../siumulation.html?plugin=xtm4)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [live visualizer: XTM-4](../XTM.WBSps.ca/) · [full simulation: XTM4](../siumulation.html?plugin=xtm4) · [KiCad symbol generator](../kicad.html?m=XTM4) · [download package (zip)](../_packages/XTM4.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/XTM4 MANUAL(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md) |
| Folder | [Products/METERING/XTM4](../Products/METERING/XTM4/) |

## Front panel

<svg class="wbs-panel solo" data-m="XTM4" data-n="Extended Range Test Meter" data-cat="METERING" role="img" aria-label="XTM4 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the XTM4: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| XTM41 | Microcontroller | PIC16F74 | HS | **XTM41V202** | 2002-07-07 | Standard Products |
| XTM41/DMS1 (XTM41 board in DMS-1 units) | Microcontroller | PIC16F74 | HS | **XTM41V204** | 2011-04-06 | Standard Products |
| XTM41/DMS1(obsolete) (XTM41 board in DMS-1 units) | Microcontroller | PIC16F74 | HS | **XTM41V202** | 2002-07-07 | Standard Products |
| XTM41/DMS1(obsolete) (XTM41 board in DMS-1 units) | Microcontroller | PIC16F74 | HS | **XTM41V203** | 2011-02-18 | Standard Products |
| XTM42(demux3) | Microcontroller | PIC16F874 | HS | **XTM42V203(B)** | 2002-05-16 | Standard Products |
| XTM42(demux4) | Microcontroller | PIC16F874 | HS | **V040000(XTM42V400B)** | 2013-11-27 | Standard Products |
| XTM42(demux4) | Microcontroller | PIC16F874 | HS | **V040001(XTM42V400C)** | 2015-11-25 | Standard Products |
| DEMUX-3 FOR XTM4 UNITS (DEMUX-3) | ATMEL firmware |  |  | **v400** (in 4.0.0.0) | 2012-04-27 | DEMUX-3 |
| DEMUX-3 FOR XTM4 UNITS (DEMUX-3) | ALTERA firmware |  |  | **v301** (in 4.0.0.0) | 2012-04-27 | DEMUX-3 |
| DEMUX-4 FOR XTM4 UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020202** (in 02AV0202) | 2014-07-15 | DEMUX-4 |
| DEMUX-4 FOR XTM4 UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0202) | 2014-07-15 | DEMUX-4 |

**Also:** [DEMUX-3 FOR XTM4 UNITS](DEMUX-3.md#software) · [DEMUX-4 FOR XTM4 UNITS](DEMUX-4.md#software)

**Production files:** `H:\Production\PFiles\XTM4\V040001\42V400C\42V400C.HEX`

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2002\|35 | 2002-05-16 | XTM42(demux3) | PIC16F874 | XTM42V203(B) |  |  |
| 2002\|35 | 2002-07-07 | XTM41 | PIC16F74 | XTM41V202 |  |  |
| 2002\|35 | 2002-07-07 | XTM41/DMS1(obsolete) | PIC16F74 | XTM41V202 |  |  |
| 2011\|44 | 2011-02-18 | XTM41/DMS1(obsolete) | PIC16F74 | XTM41V203 |  | ALI 2011-02-18 |
| 2011\|44 | 2011-04-06 | XTM41/DMS1 | PIC16F74 | XTM41V204 |  | ALI 2011-04-06 |
| 2013\|46 | 2013-11-27 | XTM42(demux4) | PIC16F874 | V040000(XTM42V400B) |  |  |
| 2015\|48 | 2015-11-25 | XTM42(demux4) | PIC16F874 | V040001(XTM42V400C) |  |  |

### DEMUX-3 FOR XTM4 UNITS

_From the [DEMUX-3](DEMUX-3.md#software) sheet: the build used in the XTM4._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2012\|45 | 2012-04-27 | **4.0.0.0** | v400 | v301 | released | ALI 2012-04-27 |

### DEMUX-4 FOR XTM4 UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the XTM4._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2013\|46 | 2013-12-12 | **02AV0200** | V020200 | V020000 | released | WKW 2013-11-27; Flash M25P16; PCB issue 2 |
|  | — | **02AV0201** | V020201 | V020000 |  | Flash M25P16; PCB issue 2 |
| 2014\|47 | 2014-07-15 | **02AV0202** | V020202 | V020000 | released | WKW 2014-06-15; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **XTM42V203(B)** — 2002|35 · 2002-05-16 — _XTM42(demux3) · PIC16F874_
    - v202(b)UPDATED COMMUNICATIONS AND FOR IMPROVED CHECKER FOR DEMUX BOARD
    - v203(b) updated to function with icd3 programmer and mplab 8.43
- **XTM41V202** — 2002|35 · 2002-07-07 — _XTM41 · PIC16F74_: UPDATED TO FIX THE BUG FOR EMBEDDED AUDIO PAIR 8 (SDI 8)
- **XTM41V202** — 2002|35 · 2002-07-07 — _XTM41/DMS1(obsolete) · PIC16F74_: UPDATED TO FIX THE BUG FOR EMBEDDED AUDIO PAIR 8 (SDI 8)
- **XTM41V203** — 2011|44 · 2011-02-18 — _XTM41/DMS1(obsolete) · PIC16F74_: ONLY for DMS-1 units. It corrects the issue with SDI LED lock flashing at startup
- **XTM41V204** — 2011|44 · 2011-04-06 — _XTM41/DMS1 · PIC16F74_: ONLY for DMS-1 units. This versions corrects the communication conflict with demux3 boards.
- **4.0.0.0** — 2012|45 · 2012-04-27 — _DEMUX-3 FOR XTM4 UNITS_: Fixed bug with front panel freezing when SDI is selected. This is the same version that works with DMS1
- **V040000(XTM42V400B)** — 2013|46 · 2013-11-27 — _XTM42(demux4) · PIC16F874_: Updated to accommodate DEMUX4
- **02AV0200** — 2013|46 · 2013-12-12 — _DEMUX-4 FOR XTM4 UNITS_: based on 02VA0000, Atmel Changed to accommodate XTM4 control
- **02AV0202** — 2014|47 · 2014-07-15 — _DEMUX-4 FOR XTM4 UNITS_: Fixes the bug that happens sometimes by resetting the power where the demux board doesn’t lock, to resolve it generates a watchdog reset, it should be implemented in other versions as well.
- **V040001(XTM42V400C)** — 2015|48 · 2015-11-25 — _XTM42(demux4) · PIC16F874_: Updated to accommodate new display
- **02AV0201** — undated — _DEMUX-4 FOR XTM4 UNITS_: fixed bug of loosing audio when doing failiur test

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - XTM4 - MANUAL (2).docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - XTM4 - MANUAL.docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - XTM4 - MANUAL (2).docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx) | [note](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx.md) |
| 2014 | [2014 - XTM4 - MANUAL.docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx) | [note](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx.md) |

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - XTM4 - Front Three Quarter.jpg](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20Front%20Three%20Quarter.jpg) | [note](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20Front%20Three%20Quarter.jpg.md) |
| 2014 | [2014 - XTM4 - Information Sheet.jpg](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20Information%20Sheet.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 139 words · 2014 - XTM4 - MANUAL.docx, page 1</summary><p>SDI INPUTS/OUTPUT Input Impedance 75Ω Input Level 0.8 Vp-p (typical) Output Level 0.8 V p-p Output Impedance 75Ω Data Rate 270-1485-2970 Mbps</p><p>DIGITAL</p><p>Input Standard</p><p>110 Ohm, transformer balanced - XLR3</p><p>75 Ohm, unbalanced - BNC</p><p>TRS front panel jack Input Level</p><p>0.2-5Vp-p Sampling Frequency Range</p><p>30 kHz to 96 kHz Meter Level</p><p>0 VU = -50 dBFS to 0 dBFS Frequency Response</p><p>+0.25 dB 50 Hz to 20 kHz</p><p>ANALOG</p><p>Input Impedance</p><p>HiZ mode greater than 20KOhm balanced</p><p>LowZ mode 600 Ohm balanced Meter Level</p><p>0 VU = -60 dBu to +30 dBu Frequency Response</p><p>+0.25 dB 50 Hz to 20 kHz</p><p>GENERAL</p><p>Power Requirements</p><p>115 VAC,60 Hz</p><p>(Available upon request) 230 VAC,50 Hz Dimensions</p><p>19&quot; wide x 3.5&quot; high x 10.75&quot; deep</p><p>(483mm x 88mm x 273mm)</p><p>Weight</p><p>8.03lbs (3.65 kg) Peak Detection Accuracy</p><p>+/- 1 dB</p><p class="bp">Also: <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - XTM4 - MANUAL.docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx), p. 1
- also in: [2014 - XTM4 - MANUAL (2).docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx), p. 1

### Operation (4)

<details><summary>Operation — 1046 words · 2014 - XTM4 - MANUAL.docx, page 1</summary><p>AES digital or analog audio signals may be connected via the front panel TRS ¼” jacks or via the rear mounted XLR-3(F) connectors. Please note that the digital XLR-3(F) connector is for balanced, 110 Ω signals, while a BNC connector for unbalanced 75 Ω signals is also provided.</p><p>Setup Mode</p><p>If the user needs to re-configure the parameters under which the signal will be measured, press and hold the MODE button. Once ‘SETUP’ is displayed, release the MODE button to begin.  The front panel SOURCE button allows the user to change between the different settings. The UP and DOWN buttons allow the user to increase or decrease the peak threshold value in peak mode or change the filter and impedance settings. To leave the setup mode and begin metering, press the MODE button. The last source stored will be first to be metered and the changed settings will be stored in memory. The parameters are as follows:</p><p>PEAK (optional) - the threshold value for peak detection with respect to the reference setting (PPM) ranging from -14 to +14 dB. See the section Peak Detection for more information. HP - to meter using a high pass filter. (UP - HPI, DOWN - HPO) TERM - to switch the input between bridging and terminated (600 Ω).(UP - HZ, DOWN - LZ) Source Selection The front panel MODE button cycles through the three signal sources:</p><p>ANALOG A0 - Front Panel TRS Jacks (CH A (L) and CH B (R)) A1 - Rear Panel XLRs (CH A (L) and CH B (R))</p><p>DIGITAL D0 - Front Panel TRS Jack D1 - Rear Panel connector (XLR or BNC as defined in MODE )</p><p>SDI 1 (SDI A) SA’x’ - Rear Panel BNC input 1 (input A), (x indicates the AES pair 1-&gt;8)</p><p>SDI 2 (SDI B) SB’x’ - Rear Panel BNC input 2 (input B), (x indicates the AES pair 1-&gt;8)</p><p>Analog Signals With an analog input signal selected, push the SOURCE button to toggle between A0 or A1.  The settings from the setup mode that effect the metering of analog signals are: LZ  - Low Impedance (600 Ω) HZ - High Impedance (20 kΩ or higher) HPO - High Pass Filter out HPI - High Pass Filter in PEAK - Peak detection</p><p>If LZ is selected a lower case “z” will be displayed in the readout immediately following the level selection. If HPI is selected a lower case “f” will be displayed on the extreme right hand side of the readout.</p><p>Digital Signals With a digital input signal selected (if a digital signal is not present the readout display will flash NO LOCK), push the SOURCE button to toggle between D0 or D1. The settings from the setup mode that effect the metering of digital signals are: HPO - High Pass Filter out HPI    - High Pass Filter in PEAK - Peak detection</p><p>If HPI is selected a lower case “f” will be displayed on the extreme right hand side of the readout.</p><p>For D1 sources, the auto-detect feature is used for rear panel BNC and XLR signals. When both inputs have valid signals, the first signal detected will be metered.</p><p>The XTM4 can store the parameters selected for analog, digital or sdi metering. After cycling through the options, the XTM4 will store the most recent parameters for the setup mode, analog, digital and sdi sources.</p><p>The meter will default to the saved metering parameters on power up.</p><p>Peak Detection (Optional)</p><p>The peak detection option is available to assist in the metering of audio signals. Using PPM metering, the XTM4 can be configured for a threshold value of +/- 14 dB with respect to the reference setting. Once the measured signal has eclipsed the threshold value, the XTM4 will display PEAK L for the left channel or PEAK R for the right channel. If both channels have peaked, PEAK LR will be displayed.</p><p>Peak Setup</p><p>After entering the SETUP MODE, press the SOURCE button until PEAK is displayed. Then press the UP and DOWN buttons to increase or decrease the threshold value by 2 until the desired value has been selected. If further changes to other settings are necessary press the SOURCE button, else press the MODE button to allow the changes to take effect.</p><p>SDI DEMUX OPTION</p><p>Serial digital video signals can carry up to four groups of two AES digital audio signals (16 monaural signals). Adding the demux option enables the user to extract these embedded audio signals and monitor them in the AES digital audio domain. As with analog and AES signals an analog output of the metered signal will be available on the rear panel.</p><p>To meter an embedded signal use the source selection button to select either SA or SB signal.  The first signal displayed will be SA1 (SB1). This is pair 1 of group 1. Use the SOURCE button to cycle through the eight SDI signal pairs:</p><p>SA1 (SB1) - pair 1 of group 1 of input A (input B) SA2 (SB2) - pair 2 of group 1 of input A (input B) SA3 (SB3) - pair 1 of group 2 of input A (input B) SA4 (SB4) - pair 2 of group 2 of input A (input B) SA5 (SB5) - pair 1 of group 3 of input A (input B) SA6 (SB6) - pair 2 of group 3 of input A (input B) SA7 (SB7) - pair 1 of group 4 of input A (input B) SA8 (SB8) - pair 2 of group 4 of input A (input B)</p><p>If the SDI source selected and signal is not present the LCD readout will display a flashing NO SDI. If an SDI signal is present, but the embedded audio is absent the LED readout will display a flashing NO AUDIO. The settings from the setup mode that effect the metering of the disembedded digital signals are: HPO - High Pass Filter out HPI - High Pass Filter in PEAK - Peak detection</p><p>If HPI is selected a lower case “f” will be displayed on the extreme right hand side of the readout.</p><p>Please note that the selected SDI input signal is actively looped through the demuxer. The SDI output available on the rear panel of the XTM4 is an equalized and reclocked signal</p></details>
- source: [2014 - XTM4 - MANUAL.docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx), p. 1
<details><summary>Front Panel — 161 words · 2014 - XTM4 - MANUAL.docx, page 1</summary><p>The front panel of the XTM4 comprises of two illuminated VU/Peak Program Meter pairs, an eight LED Phase Meter, an eight character dot-matrix LED display, four push button switches and four TRS ¼” jacks.</p><p>The meter pairs are labeled CHANNEL A and CHANNEL B. The four push buttons are labeled SOURCE, MODE, DOWN and UP. Starting from the left the first pair of jacks are the front panel analog inputs (A0) the AES jack is the front panel digital input (D0) and the HDST jack is to allow aural monitoring of the signal with an impedance of 600 Ω headset.</p><p>REAR PANEL The rear panel comprises an IEC AC power connector with internal fuse, the AES signal input connectors, BNC for 75 Ω and XLR-3(F) for 110 Ω, a pair of analog signal outputs on XLR-3(M) and a pair of analog input connectors on XLR-3(F).</p><p>The analog outputs are set to deliver a +4 dBu signal for a meter reading of</p></details>
- source: [2014 - XTM4 - MANUAL.docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx), p. 1
- also in: [2014 - XTM4 - MANUAL (2).docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx), p. 1 · [2014 - XTM4 - MANUAL (2).docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - XTM4 - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - XTM4 - MANUAL.docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - XTM4 - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - XTM4 - MANUAL (2).docx](../Products/METERING/XTM4/2014%20-%20XTM4%20-%20MANUAL%20%282%29.docx), p. 1

## Footnotes

1. Artwork 2026|59: the front and rear panels are drawn from XTM4M1-FRONT-SILK (CURVE).cdr and XTM4M2-REAR-SILK (CURVE).cdr (files Nov 9 2015). — `XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M1-FRONT-SILK (CURVE).cdr`
2. The rear sheet is dated MAY 15/15 on its title line, six months before the file date. — `XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M2-REAR-SILK (CURVE).cdr`
3. The rear is legended “115 VAC, 1 A S.B”, a 115 V-only rating. — `XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M2-REAR-SILK (CURVE).cdr`
4. The rear art has no OUTPUT 1/2 or SDI holes left of the DEMUX-4 cut-out; the rear photo shows them, so the photo is of another issue. — `XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/Pics/XTM4M2 (Rear).jpg`
5. The eight phase-LED holes between 0° and 180° are on the front sheet, at the 32-pixel pitch the simulator had already measured from the photo. — `XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M1-FRONT-SILK (CURVE).cdr`
6. Drill crosshairs on the rear mark only AES 110 Ω, MONITOR OUTPUT A and ANALOG INPUT B. — `XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M2-REAR-SILK (CURVE).cdr`
7. The front and rear CURVE sheets are stored twice, byte-identical, in #ARTWORK #DA #2016 and in XTM4 - #Engineering/SILK. — `XTM4 - #MASTER/XTM4 - #Engineering/SILK/XTM4M1-FRONT-SILK (CURVE).cdr`
