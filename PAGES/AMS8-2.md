---
type: "product"
code: "AMS8-2"
title: "Mkiii 8 Channel Audio Monitoring System"
category: "METERING"
year: 2014
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# AMS8-2 — Mkiii 8 Channel Audio Monitoring System

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AMS82](../siumulation.html?plugin=ams82) · [simulator & front panel](../simulator.html?m=AMS8-2) · [KiCad symbol generator](../kicad.html?m=AMS8-2) · [download package (zip)](../_packages/AMS8-2.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-2 MANUAL(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md) |
| Variants | [AMS8-1](AMS8-1.md), [AMS8-1A](AMS8-1A.md), [AMS8-1AA](AMS8-1AA.md), [AMS8-1AAE](AMS8-1AAE.md), [AMS8-1AAEM](AMS8-1AAEM.md), [AMS8-1AAM](AMS8-1AAM.md), [AMS8-1AE](AMS8-1AE.md), [AMS8-1AEM](AMS8-1AEM.md), [AMS8-1AM](AMS8-1AM.md), [AMS8-1AN](AMS8-1AN.md), [AMS8-1BA](AMS8-1BA.md), [AMS8-1CA](AMS8-1CA.md), [AMS8-1CAEM](AMS8-1CAEM.md), [AMS8-1CAM](AMS8-1CAM.md), [AMS8-2A](AMS8-2A.md), [AMS8-2AA](AMS8-2AA.md), [AMS8-2AAE](AMS8-2AAE.md), [AMS8-2AAEM](AMS8-2AAEM.md), [AMS8-2AAM](AMS8-2AAM.md), [AMS8-2AE](AMS8-2AE.md), [AMS8-2AEM](AMS8-2AEM.md), [AMS8-2AM](AMS8-2AM.md) |
| Folder | [Products/METERING/AMS8-2](../Products/METERING/AMS8-2/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS8-2" data-n="Mkiii 8 Channel Audio Monitoring System" data-cat="METERING" role="img" aria-label="AMS8-2 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS8-2: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS82 | Microcontroller |  | HS | **2.1.2.0** | 2009-05-28 | Standard Products |
| AMS82-ISSUE 1 (Issue 1 boards) | Microcontroller |  | HS | **1.1.0.2** | 2008-08-20 | Standard Products |
| AMS82 PRODUCT REVISIONS | AMS8E-1 firmware |  |  | **v050001 (AMS81 version)** (in 03AV0101) | 2015-07-29 | AMS8-2 |
| AMS82 PRODUCT REVISIONS | AMS8E-5 firmware |  |  | **V040001** (in 03AV0101) | 2015-07-29 | AMS8-2 |
| AMS82 PRODUCT REVISIONS | SHARC firmware |  |  | **V205** (in 03AV0101) | 2015-07-29 | AMS8-2 |
| AMS82 PRODUCT REVISIONS | ALTERA firmware |  |  | **V050000** (in 03AV0101) | 2015-07-29 | AMS8-2 |
| AMS82 PRODUCT REVISIONS — custom projects | AMS8E-1 firmware |  |  | **c103v1** (in C.1.0.6) | 2009-06-23 | AMS8-2 |
| AMS82 PRODUCT REVISIONS — custom projects | AMS8E-5 firmware |  |  | **c106** (in C.1.0.6) | 2009-06-23 | AMS8-2 |
| AMS82 PRODUCT REVISIONS — custom projects | SHARC firmware |  |  | **V205C** (in C.1.0.6) | 2009-06-23 | AMS8-2 |
| AMS82 PRODUCT REVISIONS — custom projects | ALTERA firmware |  |  | **C202** (in C.1.0.6) | 2009-06-23 | AMS8-2 |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020001** (in 02AV0001) | 2014-06-03 | DEMUX-4 |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0001) | 2014-06-03 | DEMUX-4 |

**Product firmware versions (PFV)**: AMS82 PRODUCT REVISIONS: 38 revisions, latest released **03AV0101** (2015-07-29) · AMS82 PRODUCT REVISIONS — custom projects: 3 revisions, latest released **C.1.0.6** (2009-06-23)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

**Also:** [DEMUX-4 FOR AMS-8 AND MLC UNITS](DEMUX-4.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2008\|41 | 2008-08-20 | AMS82-ISSUE 1 |  | 1.1.0.2 |  | Bob 2008-08-20 |
| 2009\|42 | 2009-05-28 | AMS82 |  | 2.1.2.0 |  | Bob 2009-05-28 |

### AMS82 PRODUCT REVISIONS

_Sheet **AMS8-2**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2005\|38 | 2005-08-25 | **B.E.T.A** | V107 | V100 | V100 | V102 | released |  |
| 2005\|38 | 2005-08-29 | **1.0.0.0** | V1071 | V1001 | V101 | V102 | released |  |
| 2005\|38 | 2005-09-01 | **1.0.0.1** | V1071 | V1002 | V101 | V102 | released |  |
| 2005\|38 | 2005-09-09 | **1.0.0.2** | V1072 | V1002 | V101 | V102 | released |  |
| 2005\|38 | 2005-09-12 | **1.0.0.3** | V1072 | V1003 | V101 | V102 | released |  |
| 2005\|38 | 2005-10-12 | **1.0.0.4** | V1072 | V1004 | V101 | V102 | released |  |
| 2005\|38 | 2005-11-04 | **1.0.0.5** | V1072 | V1005 | V101 | V102 | released |  |
| 2006\|39 | 2006-01-02 | **1.0.0.6** | V1072 | v1006 | V101 | V102 | released |  |
| 2006\|39 | 2006-01-31 | **1.0.0.7** | V1072 | v1007 | V101 | V102 | released | DEMUX compatibility ATMEL - V101, ALTERA - V105 |
| 2009\|42 | 2009-05-20 | **1.0.0.8** | V1072 | v1008 | V102 | V102 | released |  |
| 2011\|44 | 2011-01-31 | **1.0.0.9** | V1072 | v1009 | v102 | v102 | released |  |
| 2011\|44 | 2011-04-26 | **1.0.1.0** | V1074 | V1010 | v102 | v103 | released |  |
| 2007\|40 | 2007-02-27 | **1.1.0.0** | v1100 | v1100 | V203 | V201 | released |  |
| 2007\|40 | 2007-11-16 | **1.1.0.1** | v1101 | v1101 | V203 | V202 | released |  |
| 2008\|41 | 2008-08-20 | **1.1.0.2** | v1102 | v1102 | V204 | V202 | released |  |

> use 2.0.0.0 for AMS8E-1 issue 2 PCBs otherwise use 1.0.0.7

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-03-20 | **2.0.0.0** | V200 | V200 | V200 | V200 | released |  |
| 2006\|39 | 2006-03-30 | **2.0.0.1** | V2001 | V2001 | V200 | V200 | released |  |
| 2006\|39 | 2006-04-04 | **2.0.0.2** | V2002 | V2002 | V200 | V200 | released |  |
| 2006\|39 | 2006-04-06 | **2.0.0.3** | V2003 | V2003 | V200 | V200 | released |  |
| 2006\|39 | 2006-05-26 | **2.0.1.0** | V201 | V201 | V201 | V200 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.1.1** | V2011 | V2011 | V201 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-10-25 | **2.0.1.2** | V2011 | V2012 | V202 | V200 | released |  |
| 2006\|39 | 2006-10-02 | **2.1.1.1** | V2011 | v2111 | V201 | V200 | released |  |
| 2006\|39 | 2006-10-25 | **2.1.1.2** | V2011 | v2112 | V202 | V200 | released |  |
| 2007\|40 | 2007-02-27 | **2.1.1.3** | V2012 | v2113 | V203 | V201 | released |  |
| 2007\|40 | 2007-10-16 | **2.1.1.4** | V2012 | v2114 | V203 | V201 | released |  |
| 2007\|40 | 2007-11-20 | **2.1.1.5** | v2013 | v2115 | V203 | v202 | released |  |
| 2008\|41 | 2008-02-25 | **2.1.1.6** | v2014 | v2116 | V203 | v202 | released |  |
| 2008\|41 | 2008-05-13 | **2.1.1.7** | v2015 | V2117 | V203 | v202 | released |  |
| 2008\|41 | 2008-06-03 | **2.1.1.8** | v2016 | V2118 | V204 | v202 | released |  |
| 2008\|41 | 2008-12-03 | **2.1.1.9** | v2017 | V2119 | V204 | V203 | released |  |
| 2009\|42 | 2009-05-28 | **2.1.2.0** | v2017 | V2120 | V205 | V203 | released | DEMUX compatibility ATMEL - V202, ALTERA - V203 |
| 2013\|46 | 2013-06-01 | **03AV0000** | v050000 (ams81 version) | V030000 | V205 | V050000 | released |  |
| 2013\|46 | 2013-06-24 | **03AV0001** | v050001 (AMS81 version) | v030001 | V205 | V050000 | released |  |
| 2014\|47 | 2014-01-23 | **03AV0100** | v050001 (AMS81 version) | V040000 | V205 | V050000 | released |  |
| 2015\|48 | 2015-07-29 | **03AV0101** | v050001 (AMS81 version) | V040001 | V205 | V050000 | released |  |

> use 2.2.0.0 for AMS8E-6 issue 3 PCBs otherwise use 2.0.0.0

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
|  | — | **2.2.0.0** | v2017 | v2200 | v205 | v203 | not released |  |

> version 3.0.0.0 has assigned inputs (ANALOG, AES, SDI1/2, SDI3/4)

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2008\|41 | 2008-07-09 | **3.0.0.0** | v3000 | v3000 | v300 | v300 | released |  |

### AMS82 PRODUCT REVISIONS — custom projects

_Sheet **AMS8-2**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-04-20 | **C.1.0.0** | c100 | c100 | V200 | V200 | released |  |
| 2008\|41 | 2008-12-08 | **C.1.0.4** | c103v1 | c104 | V204C | C202 | released |  |
| 2009\|42 | 2009-06-23 | **C.1.0.6** | c103v1 | c106 | V205C | C202 | released |  |

> DO NOT USE THE WORKING FILES - USE THE FILE IN THE SPECIFIC FOLDER

### DEMUX-4 FOR AMS-8 AND MLC UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the AMS8-2._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2013\|46 | 2013-12-12 | **02AV0000** | V020000 | V020000 | released | Bob 2013-11-20; Flash M25P16; PCB issue 2 |
| 2014\|47 | 2014-06-03 | **02AV0001** | V020001 | V020000 | released | Bob 2014-05-30; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.0.7** — 2006|39 · 2006-01-31 — _AMS82 PRODUCT REVISIONS_: DEMUX compatibility: ATMEL - V101, ALTERA - V105
- **C.1.0.0** — 2006|39 · 2006-04-20 — _AMS82 PRODUCT REVISIONS — custom projects_: Dome Productions - Mode 5
- **2.0.1.0** — 2006|39 · 2006-05-26 — _AMS82 PRODUCT REVISIONS_: CHANGED FROM 1 TO 2 GROUP SDI MONITORING
- **2.0.1.1** — 2006|39 · 2006-08-25 — _AMS82 PRODUCT REVISIONS_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.1.1.1** — 2006|39 · 2006-10-02 — _AMS82 PRODUCT REVISIONS_: CHANGED METADATA CONNECTOR
- **2.0.1.2** — 2006|39 · 2006-10-25 — _AMS82 PRODUCT REVISIONS_: PUT IN FAIL SAFE FOR EEPROM DATA RECALL AND FIXED MODE 4 VOLUME CONTROL ISSUE
- **2.1.1.2** — 2006|39 · 2006-10-25 — _AMS82 PRODUCT REVISIONS_: PUT IN FAIL SAFE FOR EEPROM DATA RECALL AND FIXED MODE 4 VOLUME CONTROL ISSUE
- **1.1.0.0** — 2007|40 · 2007-02-27 — _AMS82 PRODUCT REVISIONS_: USED 2.1.1.3 AS THE BASE FOR ISSUE 1 FIX
- **2.1.1.3** — 2007|40 · 2007-02-27 — _AMS82 PRODUCT REVISIONS_: CHANGED ALTERA AND SHARC SOFTWARE
- **2.1.1.4** — 2007|40 · 2007-10-16 — _AMS82 PRODUCT REVISIONS_: ADDED DEFAULT VOLUME SETTINGS IN SETUP
- **1.1.0.1** — 2007|40 · 2007-11-16 — _AMS82 PRODUCT REVISIONS_: FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE
- **2.1.1.5** — 2007|40 · 2007-11-20 — _AMS82 PRODUCT REVISIONS_: FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE
- **2.1.1.6** — 2008|41 · 2008-02-25 — _AMS82 PRODUCT REVISIONS_: IN MODE 2, LOCK STATUS REFLECTS INPUT MONITORED.
- **2.1.1.7** — 2008|41 · 2008-05-13 — _AMS82 PRODUCT REVISIONS_: FIXED DIALNORM ISSUE
- **2.1.1.8** — 2008|41 · 2008-06-03 — _AMS82 PRODUCT REVISIONS_: IN MODE 2, AES OUTPUTS FOLLOW AES INPUT INSTEAD OF 4 COPIES OF MONITORED INPUT
- **3.0.0.0** — 2008|41 · 2008-07-09 — _AMS82 PRODUCT REVISIONS_: MONITOR OUTPUT IS DELAYED WHEN DOLBY ERROR OCCURS NEEDS FIXING. ALSO HOW DO YOU LISTEN THE SECONDARY PROGRAMMING - CTV DEMO
- **1.1.0.2** — 2008|41 · 2008-08-20 — _AMS82 PRODUCT REVISIONS_: IN MODE 2, LOCK STATUS REFLECTS INPUT MONITORED, FIXED DIALNORM ISSUE, IN MODE 2, AES OUTPUTS FOLLOW AES INPUT INSTEAD OF 4 COPIES OF MONITORED INPUT
- **2.1.1.9** — 2008|41 · 2008-12-03 — _AMS82 PRODUCT REVISIONS_: FIXED PHASE ISSUE WITH AES OUTPUTS, FIXED DOLBY ERROR AND MAPPING ISSUE
- **C.1.0.4** — 2008|41 · 2008-12-08 — _AMS82 PRODUCT REVISIONS — custom projects_: CBC - Mode 6 Version 2 w/ Fixed Analog Output Issue and modified Mode 2
- **1.0.0.8** — 2009|42 · 2009-05-20 — _AMS82 PRODUCT REVISIONS_
    - FIXED LED DISPLAY FREEZE ISSUE
    - Lag in volume knob response found by MTV in this version. Bob has found that it is a prbolem with ams8e-5 v1008 software.
- **2.1.2.0** — 2009|42 · 2009-05-28 — _AMS82 PRODUCT REVISIONS_
    - FIXED ISSUE IN SHARC WITH MUX COUNT AND LED DISPLAY FREEZE.
    - DEMUX compatibility: ATMEL - V202, ALTERA - V203
- **C.1.0.6** — 2009|42 · 2009-06-23 — _AMS82 PRODUCT REVISIONS — custom projects_: CBC - Mode 6 Version 2 w/ Fixed Analog Output Issue and modified Mode 2 with fix for LED display freeze.
- **1.0.0.9** — 2011|44 · 2011-01-31 — _AMS82 PRODUCT REVISIONS_: Onlu up issued version 1.0.0.7 but it doesn't fix the problem of volume lag
- **1.0.1.0** — 2011|44 · 2011-04-26 — _AMS82 PRODUCT REVISIONS_: AMS8E-1: v1074 is just a recompilation of v1072 with CORRECT project options, v1072 had WRONG options and caused a lag between volume knob and volume increasing AMS8E-5: up-issued to display v1010 Altera: Phase shift on aes outputs and parity error on aes outputs are fixed
- **03AV0000** — 2013|46 · 2013-06-01 — _AMS82 PRODUCT REVISIONS_
    - Hardware version: ams8e-1iss5, ams8e-5iss4.
    - Main board no longer uses cs8416 or ad1895 to process audio.
    - modified communication to pass sdi_lock information to main board
    - removed ad1895 and cs8416 routines in atmel
    - modified altera clocks and audio
- **03AV0001** — 2013|46 · 2013-06-24 — _AMS82 PRODUCT REVISIONS_: When monitoring embedded SDI in mode 1, or 4 (dolby decode mode). Removed and re-asserted AES! Will cause the cat552 card to reset. This was incorrect. Bug resolved.
- **02AV0000** — 2013|46 · 2013-12-12 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: First version of demux4 created for AMS8 series
- **03AV0100** — 2014|47 · 2014-01-23 — _AMS82 PRODUCT REVISIONS_: This version added DEMUX4 functionality with demux4 version 02VA0000. Only front board has been modified
- **02AV0001** — 2014|47 · 2014-06-03 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: Fixes the bug that happens sometimes by resetting the power where the demux board doesn’t lock, to resolve it generates a watchdog reset, it should be implemented in other versions as well.
- **03AV0101** — 2015|48 · 2015-07-29 — _AMS82 PRODUCT REVISIONS_: Front panel Atmel display initialization updated. Now compatible with PDSP1884 & HDSP2533
- **2.2.0.0** — not released — _AMS82 PRODUCT REVISIONS_: CREATED A NEW ISSUE FRONT PANEL BOARD FOR AMS8-1B

_No change note in the listing for: B.E.T.A, 1.0.0.0, 1.0.0.1, 1.0.0.2, 1.0.0.3, 1.0.0.4, 1.0.0.5, 1.0.0.6, 2.0.0.0, 2.0.0.1, 2.0.0.2, 2.0.0.3._

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx) |

## Documents (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx) | [note](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx.md) |
| 2014 | [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx) | [note](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx.md) |

## Photos & scans (1)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS8-2 - Information Sheet.jpg](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20Information%20Sheet.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (2)

<details><summary>Specifications — 49 words · 2014 - AMS8-2 - MANUAL.docx, page 1</summary><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB 25 male</p><p>AES/EBU INPUTS</p><p>AES/EBU OUTPUTS</p><p>MONITOR OUTPUT</p><p>HEADSET JACK</p><p>Type ¼ inch TRS jack</p><p>POWER</p><p>Input 90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-f0e6d1b5e71be8e8">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-82b3bc8d6c0b8d76">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx), p. 1
- also in: [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx), p. 1

### Operation (6)

<details><summary>Controls — 2123 words · 2014 - AMS8-2 - MANUAL.docx, page 1</summary><p>There are eight illuminated push button switches arranged in two rows of four.  The upper row designated INPUTS selects the input source to be monitored.  The lower row designated PRESETS selects a preset configuration or condition under which the signal is monitored.</p><p>The two control knobs designated SELECT and VOLUME are rotary shaft encoders with integral push switches.  In the simplest mode of operation, the SELECT knob allows the user to scroll through available options while the VOLUME button adjusts the listening level of the AMS8&#x27;s speakers.</p><p>All eight pushbuttons, as well as the two knobs with integral push switches, are used in conjunction with the three eight-segment readouts when the unit is configured during SYSTEM SETUP.</p><p>SYSTEM SETUP</p><p>To enter system setup, press and hold INPUT buttons 1/2 and 7/8 with one hand and press the SELECT knob.  The top left readout will display System and the top right readout will display Setup. Press the SELECT button again to enter the mode of operation selection.  The top right readout will display Mode X, where X is 1, 2, or 4.  The VOLUME knob may be rotated, in either direction, to select the appropriate mode of operation.</p><p>Rotate the SELECT knob one step clockwise to enter the reference signal setup. The top right readout will display Ref and also  Int, 75Ω or 110Ω.</p><p>Ref Int - means that the internal 48 kHz reference is used Ref 75Ω - means that an external unbalanced reference will be used Ref 110Ω - means that an external balanced reference will be used Rotating the VOLUME knob in either direction selects the appropriate reference source.</p><p>Rotate the SELECT knob another step clockwise to enter the AES OUTPUT #4 Setup.  The top right readout will display Out4 and In4 or Mon. Rotating the VOLUME knob in either direction will toggle between In4 and Mon.</p><p>Out4 In4- means that AES input #4 will be routed to AES output #4. Out4 Mon - means that the Monitor Output will be routed to AES output #4.</p><p>Rotate the SELECT knob another step clockwise to enter the Dialogue Normalization setup.  The top right readout will display Dn and Enbd or Dsbd. Rotating the VOLUME knob in either direction will toggle between Enbd and Dsbd.</p><p>Dn Enbd - means that the dialogue normalization level in the metadata will be applied to the dolby signal. Dn Dsbd - means that the dialogue normalization level in the metadata will not be applied to the dolby signal.</p><p>Rotate the SELECT knob another step clockwise.  The top right readout will display Vol and a default volume level reading between OFF, -60db and +15dB.</p><p>The VOLUME control is used to set the default volume level, in one dB steps, for monitoring  audio.</p><p>Rotate the SELECT knob another step clockwise.  The top right readout will display O/P and either Var or Fix.  Rotating the VOLUME knob in either direction will toggle between Var and Fix.</p><p>O/P Var - means that all the outputs of the unit will be level controlled and follow the action of the VOLUME control O/P Fix - means that all the outputs will be a fixed line level (-20 dBFs for digital outputs and +4dBu for analog outputs) the VOLUME control will only affect the level of the internal speakers and also the two monitor outputs on the back of the unit.</p><p>Rotate the SELECT knob another step clockwise.  The top right readout will display Cal and a reference level reading between -22dB and -10dB.</p><p>The VOLUME control is used to set the reference level, in two dB steps, for monitoring  audio.</p><p>Rotate the SELECT knob one more step clockwise.  The top right readout will display Spkr and either On or Off.  Rotating the VOLUME knob in either direction will toggle between On and Off.</p><p>(In version 1.x.x.x) Spkr On means the internal speakers, headset jack, and monitor output are enabled. Spkr Off means the internal speakers, headset jack, and monitor output are disabled. (In version 2.x.x.x) Spkr On means the internal speakers and headset jack are enabled. Spkr Off means the internal speakers and headset jack are disabled.</p><p>Rotate the SELECT knob one more step.  The top right readout will display Exit.</p><p>Push the SELECT knob to return to the System Setup screen.  To exit system setup, turn the SELECT knob one step counter clockwise.  The top left readout displays Exit and the top right readout displays System.  Push the SELECT knob once to exit the system setup procedure.</p><p>CHECKING THE FIRMWARE</p><p>When the system setup mode has been activated and the top left readout displays System, and the top right readout displays Setup rotating the SELECT knob clockwise the top left readout will cycle through the following.</p><p>Inputs - This configuration setup allows you to select the input sources that will be enabled during monitoring (See INPUTS SETUP).</p><p>Assigns - This configuration setup applies only to units set to operate in Mode 1.  (See ASSIGNMENT SETUP)</p><p>Firmware - This allows you to check the version of firmware installed in your unit.  Press the SELECT knob once and a numeric code will be displayed in the top right readout such as 1.0.0.1.  This is the firmware version identifier and is information that will be helpful if you contact the factory for technical assistance.</p><p>To exit the firmware interrogation mode, rotate the SELECT knob one step in either direction and push the SELECT knob once when the top right readout displays Exit.</p><p>INPUTS SETUP (for all modes)</p><p>A fully assembled AMS8 has multiple program inputs (75Ω, 110Ω, Analog, SDI 1 (A) Groups 1 and 2, SDI 1 (A) Groups 3and 4,  SD1 2 (B) Groups 1 and 2 and SDI 2 (B) Groups 3 and 4. The Inputs setup allows an operator to enable or disable the input option during monitoring.  When the System Setup mode has been activated and the top left readout displays System and the top right readout displays Setup, rotating the SELECT knob clockwise one step will put the unit in the Inputs setup mode.  Press the SELECT knob once and the 75Ω option will be displayed in the top right readout and whether the Input option is enabled.  If (Y</p></details>
- source: [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx), p. 1
<details><summary>Front Panel — 48 words · 2014 - AMS8-2 - MANUAL.docx, page 1</summary><p>DISPLAYS</p><p>Eight 46 segment LED bargraph meters display VU and Peak Program information simultaneously.  A reference LED (red) at the zero mark is continuously illuminated.</p><p>Three eight-character dot-matrix displays display signal parameters and status information.  During setup, these displays are used to guide the user in making selections</p></details>
- source: [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx), p. 1
<details><summary>Controls — 18 words · 2014 - AMS8-2 - MANUAL.docx, page 1</summary><p>Please note that primary functions for controls are designated in white, while secondary functions are designated in green</p></details>
- source: [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx), p. 1
- also in: [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx), p. 1 · [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx), p. 1 · [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (2)

<details><summary>Warranty — 0 words · 2014 - AMS8-2 - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - AMS8-2 - MANUAL.docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - AMS8-2 - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - AMS8-2 - MANUAL (2).docx](../Products/METERING/AMS8-2/2014%20-%20AMS8-2%20-%20MANUAL%20%282%29.docx), p. 1

## Contents (JSON)

```json
{
 "device": "AMS8-2",
 "name": "Mkiii 8 Channel Audio Monitoring System",
 "category": "METERING",
 "year": 2014,
 "documents": [
  {
   "file": "Products/METERING/AMS8-2/2014 - AMS8-2 - Information Sheet.jpg",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/METERING/AMS8-2/2014 - AMS8-2 - MANUAL (2).docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/AMS8-2/2014 - AMS8-2 - MANUAL.docx",
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
