---
type: "product"
code: "MLC8B"
title: "Multi-Channel Level Control"
category: "METERING"
year: 2019
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# MLC8B — Multi-Channel Level Control

**▶ [Open the MLC8 / MLC6 level control simulation](../siumulation.html?plugin=mlc8) · [Open the RD66-MLC8UsingAMS8E-1-iss5 simulation](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: MLC8 / MLC6 level control](../siumulation.html?plugin=mlc8) · [full simulation: RD66-MLC8UsingAMS8E-1-iss5](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5) · [simulator & front panel](../simulator.html?m=MLC8B) · [KiCad symbol generator](../kicad.html?m=MLC8B) · [download package (zip)](../_packages/MLC8B.zip) |
| Earliest dated evidence | [2019\|52](Year-2019.md) — month & year |
| Evidence | "Apr .25 2019" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/MLC8B MANUAL.docx |
| Confidence | medium |
| All years found | [2019\|52](Year-2019.md) |
| Variants | [MLC8](MLC8.md), [MLC8-N](MLC8-N.md), [MLC8A](MLC8A.md), [MLC8C](MLC8C.md), [MLC8D](MLC8D.md) |
| Folder | [Products/METERING/MLC8B](../Products/METERING/MLC8B/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC8B" data-n="Multi-Channel Level Control" data-cat="METERING" role="img" aria-label="MLC8B front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC8B: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC8B (aka MLC8AM) | Microcontroller |  | HS | **2.0.0.3** | 2008-03-19 | Standard Products |
| MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **V050100** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions | SHARC firmware |  |  | **v106** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **AMS81 v050000** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **V040000** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **V040000** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions | ATMEL firmware |  |  | **V040100** (in 05AV0200) | 2014-10-06 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions | ALTERA firmware |  |  | **V040100** (in 05AV0200) | 2014-10-06 | MLCs |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020001** (in 02AV0001) | 2014-06-03 | DEMUX-4 |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0001) | 2014-06-03 | DEMUX-4 |

**Product firmware versions (PFV)**: MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions: 9 revisions, latest released **05AV0100** (2014-01-27) · MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions: 5 revisions, latest released **05AV0100** (2014-01-27) · MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions: 7 revisions, latest released **05AV0200** (2014-10-06)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

**Also:** [DEMUX-4 FOR AMS-8 AND MLC UNITS](DEMUX-4.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2008\|41 | 2008-03-19 | MLC8B (aka MLC8AM) |  | 2.0.0.3 | 2.0.0.3 | Bob 2008-03-19 |

### MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.0.0** | V101 | V100 | AMS8V201 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | V102 | V102 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | V103 | V104 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | V104 | v105 | AMS8V201 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-03-19 | **2.0.0.4** | V105 | v105 | AMS8V202 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2013\|46 | 2013-04-01 | **2.0.0.5** | V105 | v106 | AMS8V203 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
|  | — | **05AV0000** | v050000 | v106 | AMS81 v050000 |  | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2014\|47 | 2014-01-27 | **05AV0100** | V050100 | v106 | AMS81 v050000 | released | DEMUX compatibility DEMUX4 - 02AV0000 |

> LOCATED IN THE "H:\mlc\Software\MLC8B\AMS8-1" FOLDER

### MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-10-02 | **2.0.0.0** | V202 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.1** | V203 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-14 | **2.0.0.2** | V204 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-03-19 | **2.0.0.3** | V205 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2014\|47 | 2014-01-27 | **05AV0100** | V040000 | V040000 | released | DEMUX compatibility DEMUX4 - 02AV0000 |

> LOCATED IN THE "H:\mlc\Software\MLC8AM\" FOLDER

### MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-08-10 | **1.0.0.0** | V100 | V100 | released |  |
| 2006\|39 | 2006-08-31 | **2.0.0.0** | V201 | V200 | released |  |
| 2006\|39 | 2006-10-02 | **2.0.0.1** | MLC8RV202 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.2** | MLC8RV203 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-12 | **2.0.0.3** | MLC8RV204 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-03-19 | **2.0.0.4** | MLC8RV205 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2014\|47 | 2014-10-06 | **05AV0200** | V040100 | V040100 | released | DEMUX compatibility DEMUX4 - 02AV0001 |

> LOCATED IN THE "H:\mlc\Software\MLC8R\" FOLDER
> if the MAIN UNIT is MLC8B use the MLC8R software

### DEMUX-4 FOR AMS-8 AND MLC UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the MLC8B._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2013\|46 | 2013-12-12 | **02AV0000** | V020000 | V020000 | released | Bob 2013-11-20; Flash M25P16; PCB issue 2 |
| 2014\|47 | 2014-06-03 | **02AV0001** | V020001 | V020000 | released | Bob 2014-05-30; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - N/A
    - Proto released to CBC
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_: N/A
- **2.0.0.0** — 2006|39 · 2006-08-31 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - MLC8 - V2.0.0.0 or greater
- **2.0.0.0** — 2006|39 · 2006-10-02 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - MLC8 MAIN BOARD - V2.0.0.2 or greater (NO CARRIER INFORMATION REPORTED TO REMOTE PANEL)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS NO CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-12-20 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - MLC8 MAIN BOARD - V2.0.0.2 or greater (CARRIER INFORMATION REPORTED TO REMOTE PANEL)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD (USE MLC8RV203)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - FOR MLC8A/C/D, USE AMS8-1 IN MLC8A FOLDER. USE AMS8-1 IN MLC8B FOLDER FOR MLC8B. USE AMS8-1 IN MLC8CA FOLDER FOR MLC8CA
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2007|40 · 2007-02-14 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2008|41 · 2008-03-19 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2008|41 · 2008-03-19 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2008|41 · 2008-03-19 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE AND FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.5** — 2013|46 · 2013-04-01 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **02AV0000** — 2013|46 · 2013-12-12 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: First version of demux4 created for AMS8 series
- **05AV0100** — 2014|47 · 2014-01-27 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - added compatibility with demux4
    - DEMUX compatibility: DEMUX4 - 02AV0000
- **05AV0100** — 2014|47 · 2014-01-27 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - added compatibility with demux4
    - DEMUX compatibility: DEMUX4 - 02AV0000
- **02AV0001** — 2014|47 · 2014-06-03 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: Fixes the bug that happens sometimes by resetting the power where the demux board doesn’t lock, to resolve it generates a watchdog reset, it should be implemented in other versions as well.
- **05AV0200** — 2014|47 · 2014-10-06 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - AS of August 2018 the Aux Connector has been updated to a Female Tascam Standard
    - DEMUX compatibility: DEMUX4 - 02AV0001
- **05AV0000** — undated — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - removed dependence on cs8416 and ad1895 chipsets within fpga and main board atmel
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2019\|52](Year-2019.md) | month & year | `Apr .25 2019` | [2019 - MLC8B - MANUAL.docx](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20MANUAL.docx) |

## Documents (1)

| Year | File |  |
|---|---|---|
| 2019 | [2019 - MLC8B - MANUAL.docx](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20MANUAL.docx) | [note](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20MANUAL.docx.md) |

## Photos & scans (3)

| Year | File |  |
|---|---|---|
| 2019 | [2019 - MLC8B - Front.jpg](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20Front.jpg) | [note](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20Front.jpg.md) |
| 2019 | [2019 - MLC8B - Information Sheet.jpg](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20Information%20Sheet.jpg.md) |
| 2019 | [2019 - MLC8B - Rear (OBSOLETE).jpg](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20Rear%20%28OBSOLETE%29.jpg) | [note](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20Rear%20%28OBSOLETE%29.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (1)

<details><summary>Specifications — 89 words · 2019 - MLC8B - MANUAL.docx, page 1</summary><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB 25 female</p><p>AES/EBU INPUTS</p><p>Impedance 110Ω transformer balanced Level 0.2 to 7V p-p Max Input 0 dbfs Standard AES31D-1995 Type 3 Pin Terminal Block</p><p>AES/EBU OUTPUTS</p><p>Impedance 110Ω transformer balanced Level 2.5V p-p terminated Output 0 dbfs Noise Less than -100 dbfs Standard AES31D-1995 THD Less than 0.001% Type 3 pin Terminal Block</p><p>MONITOR OUTPUT</p><p>POWER</p><p>Input 90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2019 - MLC8B - MANUAL.docx](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20MANUAL.docx), p. 1

### Warranty (1)

<details><summary>Warranty — 0 words · 2019 - MLC8B - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2019 - MLC8B - MANUAL.docx](../Products/METERING/MLC8B/2019%20-%20MLC8B%20-%20MANUAL.docx), p. 1

## Contents (JSON)

```json
{
 "device": "MLC8B",
 "name": "Multi-Channel Level Control",
 "category": "METERING",
 "year": 2019,
 "documents": [
  {
   "file": "Products/METERING/MLC8B/2019 - MLC8B - Front.jpg",
   "year": 2019,
   "pages": 1,
   "holds": []
  },
  {
   "file": "Products/METERING/MLC8B/2019 - MLC8B - Information Sheet.jpg",
   "year": 2019,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/METERING/MLC8B/2019 - MLC8B - MANUAL.docx",
   "year": 2019,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/MLC8B/2019 - MLC8B - Rear (OBSOLETE).jpg",
   "year": 2019,
   "pages": 1,
   "holds": []
  }
 ]
}
```
