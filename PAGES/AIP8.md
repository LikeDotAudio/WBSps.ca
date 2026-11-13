---
type: "product"
code: "AIP8"
category: "METERING"
year: 2015
confidence: "estimate"
tags: ["product", "metering", "2010s"]
---

# AIP8

**▶ [Open the AIP8-2A simulation](../siumulation.html?plugin=aip8-2a)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AIP8-2A](../siumulation.html?plugin=aip8-2a) · [KiCad symbol generator](../kicad.html?m=AIP8) · [download package (zip)](../_packages/AIP8.zip) |
| Earliest dated evidence | [2015\|48](Year-2015.md) — similar models |
| Evidence | filed with 19 dated models in "Metering and Monitoring Manuals" |
| Confidence | estimate |
| All years found | [2015\|48](Year-2015.md) |
| Folder | [Products/METERING/AIP8](../Products/METERING/AIP8/) |

## Front panel

<svg class="wbs-panel solo" data-m="AIP8" data-n="" data-cat="METERING" role="img" aria-label="AIP8 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AIP8: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AIP8-2A | Microcontroller |  | HS | **1.0.0.2** | 2009-05-07 | Standard Products |
| AIP8-2A PRODUCT REVISIONS | AMS8E-1 firmware |  |  | **V102** (in 1.0.0.2) | 2009-05-07 | AIP8-2A |
| AIP8-2A PRODUCT REVISIONS | AIP8-2A-2 firmware |  |  | **V102** (in 1.0.0.2) | 2009-05-07 | AIP8-2A |
| AIP8-2A PRODUCT REVISIONS | SHARC firmware |  |  | **V102** (in 1.0.0.2) | 2009-05-07 | AIP8-2A |
| AIP8-2A PRODUCT REVISIONS | ALTERA firmware |  |  | **V100** (in 1.0.0.2) | 2009-05-07 | AIP8-2A |

**Product firmware versions (PFV)**: AIP8-2A PRODUCT REVISIONS: 3 revisions, latest released **1.0.0.2** (2009-05-07)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2009\|42 | 2009-05-07 | AIP8-2A |  | 1.0.0.2 |  | Bob 2009-05-07 |

### AIP8-2A PRODUCT REVISIONS

_Sheet **AIP8-2A**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AIP8-2A-2 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2007\|40 | 2007-01-26 | **1.0.0.0** | V100 | V100 | V100 | V100 | released |  |
| 2007\|40 | 2007-03-12 | **1.0.0.1** | V101 | V101 | V101 | V100 | released |  |
| 2009\|42 | 2009-05-07 | **1.0.0.2** | V102 | V102 | V102 | V100 | released |  |

> DO NOT USE THE WORKING FILES - USE THE FILE IN THE SPECIFIC FOLDER

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.0** — 2007|40 · 2007-01-26 — _AIP8-2A PRODUCT REVISIONS_: USE DEMUX-3 (AIP8-2A) SOFTWARE
- **1.0.0.1** — 2007|40 · 2007-03-12 — _AIP8-2A PRODUCT REVISIONS_: USE DEMUX-3 (AIP8-2A) SOFTWARE
- **1.0.0.2** — 2009|42 · 2009-05-07 — _AIP8-2A PRODUCT REVISIONS_: CHANGED DV OUTPUT LEFT = DV SELECTION, RIGHT = ST MONO, MODIFIED DISPLAY TO CHANGED UPON USER INTERFACE SELECTION, IE. KNOB OR PUSHBUTTON

## Documents (2)

| Year | File |  |
|---|---|---|
| ? | [19xx - AIP8 - 2A Manual Updated (2).docx](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated%20%282%29.docx) | [note](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated%20%282%29.docx.md) |
| ? | [19xx - AIP8 - 2A Manual Updated.docx](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated.docx) | [note](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated.docx.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 42 words · 19xx - AIP8 - 2A Manual Updated (2).docx, page 1</summary><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB 25 male</p><p>AES/EBU INPUTS</p><p>AES/EBU OUTPUTS</p><p>MONITOR OUTPUT</p><p>POWER</p><p>Input 90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-f0e6d1b5e71be8e8">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-82b3bc8d6c0b8d76">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [19xx - AIP8 - 2A Manual Updated (2).docx](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated%20%282%29.docx), p. 1
- also in: [19xx - AIP8 - 2A Manual Updated.docx](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 19xx - AIP8 - 2A Manual Updated (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [19xx - AIP8 - 2A Manual Updated (2).docx](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated%20%282%29.docx), p. 1
<details><summary>Warranty — 0 words · 19xx - AIP8 - 2A Manual Updated.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [19xx - AIP8 - 2A Manual Updated.docx](../Products/METERING/AIP8/19xx%20-%20AIP8%20-%202A%20Manual%20Updated.docx), p. 1

## Footnotes

1. ISS1 of the front silk (Nov 2006) has ST · SOURCE · MONITOR over “L/Only Phase AES SDI 1/2 3/4 5/6 7/8”. — `AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-CURVE.cdr`
2. ISS2 (Jan 2007) already has IN ST/DV and OUT ST/DV but still starts the button row with “L/Only”. — `AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS2-curve.cdr`
3. ISS3 (Feb 2007) renames L/Only to “B” and moves Phase to the first button. The firmware then reserves B (“previously L/only”). — `AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr`
4. The silk has only the control-area legends; the GREEN plate carries WARD-BECK SYSTEMS, AIP8-2A and the brackets over SOURCE / IN / OUT. — `AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr`
5. Every issue of the silk is stored twice, as a Backup_of_ copy beside the original. — `AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/Backup_of_AIP8-2A-FRONTSILK-ISS3-curve.cdr`
6. No AIP8-2A rear silk exists in the folder, so the rear is the AMS8-M2 silk (inferred). — `AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr`
