---
type: "product"
code: "MLC8A"
title: "Multi-Channel Level Control"
category: "METERING"
year: 2018
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# MLC8A — Multi-Channel Level Control

**▶ [Open the MLC8 / MLC6 level control simulation](../siumulation.html?plugin=mlc8) · [Open the RD66-MLC8UsingAMS8E-1-iss5 simulation](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: MLC8 / MLC6 level control](../siumulation.html?plugin=mlc8) · [full simulation: RD66-MLC8UsingAMS8E-1-iss5](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5) · [simulator & front panel](../simulator.html?m=MLC8A) · [KiCad symbol generator](../kicad.html?m=MLC8A) · [download package (zip)](../_packages/MLC8A.zip) |
| Earliest dated evidence | [2018\|51](Year-2018.md) — month & year |
| Evidence | "August 13, 2018" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/MLC8A MANUAL(1).docx |
| Confidence | medium |
| All years found | [2018\|51](Year-2018.md) |
| Variants | [MLC8](MLC8.md), [MLC8-N](MLC8-N.md), [MLC8B](MLC8B.md), [MLC8C](MLC8C.md), [MLC8D](MLC8D.md) |
| Folder | [Products/METERING/MLC8A](../Products/METERING/MLC8A/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC8A" data-n="Multi-Channel Level Control" data-cat="METERING" role="img" aria-label="MLC8A front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC8A: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC8A | Microcontroller |  | HS | **Custom 039** | 2008-11-21 | Standard Products |
| MLC8A REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **V050000** (in 05AV0000) | 2014-12-15 | MLCs |
| MLC8A REVISIONS — Main Board Revisions | SHARC firmware |  |  | **V106** (in 05AV0000) | 2014-12-15 | MLCs |
| MLC8A REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **AMS81 v050000** (in 05AV0000) | 2014-12-15 | MLCs |
| MLC8A REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **V205** (in 2.0.0.5) | 2007-12-21 | MLCs |
| MLC8A REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **V200** (in 2.0.0.5) | 2007-12-21 | MLCs |
| MLC8A REVISIONS — MLC8R Front Panel Revisions | ATMEL firmware |  |  | **MLC8AV205** (in 2.0.0.4) | 2007-12-21 | MLCs |
| MLC8A REVISIONS — MLC8R Front Panel Revisions | ALTERA firmware |  |  | **V200** (in 2.0.0.4) | 2007-12-21 | MLCs |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020001** (in 02AV0001) | 2014-06-03 | DEMUX-4 |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0001) | 2014-06-03 | DEMUX-4 |

**Product firmware versions (PFV)**: MLC8A REVISIONS — Main Board Revisions: 10 revisions, latest released **05AV0000** (2014-12-15) · MLC8A REVISIONS — Front Panel Revisions: 7 revisions, latest released **2.0.0.5** (2007-12-21) · MLC8A REVISIONS — MLC8R Front Panel Revisions: 6 revisions, latest released **2.0.0.4** (2007-12-21)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

**Also:** [DEMUX-4 FOR AMS-8 AND MLC UNITS](DEMUX-4.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2008\|41 | 2008-11-21 | MLC8A |  | Custom 039 |  | Bob 2007-12-21 |

### MLC8A REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.0.0** | V101 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | V102 | V102 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | V103 | V104 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | V104 | v105 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-11-20 | **2.0.0.4** | V105 | v105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-12-21 | **2.0.0.5** | V106 | v105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2009\|42 | 2009-06-01 | **2.0.0.6** | V106 | v106 | AMS8V203 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2014\|47 | 2014-12-15 | **05AV0000** | V050000 | V106 | AMS81 v050000 | released |  |
| 2008\|41 | 2008-11-21 | **Custom 039** | V106 | CUSTOM 039 | AMS8V203 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\Software\MLC8A\AMS8-1" FOLDER

### MLC8A REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.0.0** | V200 | V200 | released |  |
| 2006\|39 | 2006-08-31 | **2.0.0.1** | V201 | V200 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.2** | V202 | V200 | released |  |
| 2007\|40 | 2007-01-08 | **2.0.0.3** | V203 | V200 | released |  |
| 2007\|40 | 2007-02-12 | **2.0.0.4** | V204 | V200 | released |  |
| 2007\|40 | 2007-12-21 | **2.0.0.5** | V205 | V200 | released |  |

> LOCATED IN THE "H:\mlc\Software\MLC8A\" FOLDER

### MLC8A REVISIONS — MLC8R Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | released |  |
| 2006\|39 | 2006-08-31 | **2.0.0.0** | V201 | V200 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | MLC8AV202 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | MLC8AV203 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | MLC8AV204 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-12-21 | **2.0.0.4** | MLC8AV205 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |

> LOCATED IN THE "H:\mlc\Software\MLC8R\" FOLDER
> If the MAIN UNIT is the MLC8A, use the MLC8A FRONT PANEL software for the ATMEL

### DEMUX-4 FOR AMS-8 AND MLC UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the MLC8A._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2013\|46 | 2013-12-12 | **02AV0000** | V020000 | V020000 | released | Bob 2013-11-20; Flash M25P16; PCB issue 2 |
| 2014\|47 | 2014-06-03 | **02AV0001** | V020001 | V020000 | released | Bob 2014-05-30; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8A REVISIONS — Front Panel Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8A REVISIONS — Main Board Revisions_
    - N/A
    - Proto released to CBC
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8A REVISIONS — Front Panel Revisions_
    - N/A
    - MLC8 MAIN BOARD - V2.0.0.0 or greater
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8A REVISIONS — Main Board Revisions_: N/A
- **2.0.0.1** — 2006|39 · 2006-08-31 — _MLC8A REVISIONS — Front Panel Revisions_: N/A
- **2.0.0.0** — 2006|39 · 2006-08-31 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - MLC8 - V2.0.0.0 or greater
- **2.0.0.2** — 2006|39 · 2006-10-02 — _MLC8A REVISIONS — Front Panel Revisions_: N/A
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS NO CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8A REVISIONS — Main Board Revisions_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD (USE MLC8RV203)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8A REVISIONS — Main Board Revisions_
    - FOR MLC8A/C/D, USE AMS8-1 IN MLC8A FOLDER. USE AMS8-1 IN MLC8B FOLDER FOR MLC8B. USE AMS8-1 IN MLC8CA FOLDER FOR MLC8CA
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-01-08 — _MLC8A REVISIONS — Front Panel Revisions_
    - N/A
    - MLC8 MAIN BOARD - V2.0.0.2 or greater
- **2.0.0.4** — 2007|40 · 2007-02-12 — _MLC8A REVISIONS — Front Panel Revisions_
    - N/A
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8A REVISIONS — Main Board Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2007|40 · 2007-11-20 — _MLC8A REVISIONS — Main Board Revisions_
    - FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.5** — 2007|40 · 2007-12-21 — _MLC8A REVISIONS — Front Panel Revisions_
    - N/A
    - FIXED COMMUNICATION ISSUE
- **2.0.0.4** — 2007|40 · 2007-12-21 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.5** — 2007|40 · 2007-12-21 — _MLC8A REVISIONS — Main Board Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **Custom 039** — 2008|41 · 2008-11-21 — _MLC8A REVISIONS — Main Board Revisions_
    - ADDED LTRT OUTPUT ON AES4 WHEN ST BUTTON IS PRESSED. USE WITH FRONT PANEL V2.0.0.5 AND REMOTE PANEL V2.0.0.4
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.6** — 2009|42 · 2009-06-01 — _MLC8A REVISIONS — Main Board Revisions_
    - FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **02AV0000** — 2013|46 · 2013-12-12 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: First version of demux4 created for AMS8 series
- **02AV0001** — 2014|47 · 2014-06-03 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: Fixes the bug that happens sometimes by resetting the power where the demux board doesn’t lock, to resolve it generates a watchdog reset, it should be implemented in other versions as well.
- **05AV0000** — 2014|47 · 2014-12-15 — _MLC8A REVISIONS — Main Board Revisions_: AS of August 2018 the Aux Connector has been updated to a Female Tascam

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - MLC8A - MANUAL (2).docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - MLC8A - MANUAL (2).docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 2018` | [2018 - MLC8A - MANUAL (2).docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - MLC8A - MANUAL.docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 13, 2018` | [2018 - MLC8A - MANUAL.docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx) |
| [2018\|51](Year-2018.md) | month & year | `August 2018` | [2018 - MLC8A - MANUAL.docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - MLC8A - MANUAL (2).docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx) | [note](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx.md) |
| 2018 | [2018 - MLC8A - MANUAL.docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx) | [note](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx.md) |

## Photos & scans (3)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - MLC8A - Front.jpg](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20Front.jpg) | [note](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20Front.jpg.md) |
| 2018 | [2018 - MLC8A - Information Sheet.jpg](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20Information%20Sheet.jpg.md) |
| 2018 | [2018 - MLC8A - Rear.jpg](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20Rear.jpg) | [note](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20Rear.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 63 words · 2018 - MLC8A - MANUAL (2).docx, page 1</summary><p>* As of August 2018, the Analog Audio output connector has been redesigned to be a DB25 female connector with Tascam pinout.</p><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB25 female*</p><p>AES/EBU INPUTS</p><p>AES/EBU OUTPUTS</p><p>MONITOR OUTPUT</p><p>POWER</p><p>Input 90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-f0e6d1b5e71be8e8">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-82b3bc8d6c0b8d76">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2018 - MLC8A - MANUAL (2).docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx), p. 1
- also in: [2018 - MLC8A - MANUAL.docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2018 - MLC8A - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2018 - MLC8A - MANUAL (2).docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL%20%282%29.docx), p. 1
<details><summary>Warranty — 0 words · 2018 - MLC8A - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2018 - MLC8A - MANUAL.docx](../Products/METERING/MLC8A/2018%20-%20MLC8A%20-%20MANUAL.docx), p. 1

## Contents (JSON)

```json
{
 "device": "MLC8A",
 "name": "Multi-Channel Level Control",
 "category": "METERING",
 "year": 2018,
 "documents": [
  {
   "file": "Products/METERING/MLC8A/2018 - MLC8A - Front.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/MLC8A/2018 - MLC8A - Information Sheet.jpg",
   "year": 2018,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/METERING/MLC8A/2018 - MLC8A - MANUAL (2).docx",
   "year": 2018,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/MLC8A/2018 - MLC8A - MANUAL.docx",
   "year": 2018,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/MLC8D/2018 - MLC8D - Rear.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  }
 ]
}
```
