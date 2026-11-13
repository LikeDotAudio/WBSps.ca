---
type: "product"
code: "AMS8-1"
title: "Mkiii 8 Channel Audio Monitoring System"
category: "METERING"
year: 2014
confidence: "medium"
tags: ["product", "metering", "2010s"]
---

# AMS8-1 — Mkiii 8 Channel Audio Monitoring System

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AMS81](../siumulation.html?plugin=ams81) · [simulator & front panel](../simulator.html?m=AMS8-1) · [KiCad symbol generator](../kicad.html?m=AMS8-1) · [download package (zip)](../_packages/AMS8-1.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — month & year |
| Evidence | "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-1 MANUAL (Archived - OBSOLETE as of July 13, 2018)(1).docx |
| Confidence | medium |
| All years found | [2014\|47](Year-2014.md), [2018\|51](Year-2018.md) |
| Variants | [AMS8-1A](AMS8-1A.md), [AMS8-1AA](AMS8-1AA.md), [AMS8-1AAE](AMS8-1AAE.md), [AMS8-1AAEM](AMS8-1AAEM.md), [AMS8-1AAM](AMS8-1AAM.md), [AMS8-1AE](AMS8-1AE.md), [AMS8-1AEM](AMS8-1AEM.md), [AMS8-1AM](AMS8-1AM.md), [AMS8-1AN](AMS8-1AN.md), [AMS8-1BA](AMS8-1BA.md), [AMS8-1CA](AMS8-1CA.md), [AMS8-1CAEM](AMS8-1CAEM.md), [AMS8-1CAM](AMS8-1CAM.md), [AMS8-2](AMS8-2.md), [AMS8-2A](AMS8-2A.md), [AMS8-2AA](AMS8-2AA.md), [AMS8-2AAE](AMS8-2AAE.md), [AMS8-2AAEM](AMS8-2AAEM.md), [AMS8-2AAM](AMS8-2AAM.md), [AMS8-2AE](AMS8-2AE.md), [AMS8-2AEM](AMS8-2AEM.md), [AMS8-2AM](AMS8-2AM.md) |
| Folder | [Products/METERING/AMS8-1](../Products/METERING/AMS8-1/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS8-1" data-n="Mkiii 8 Channel Audio Monitoring System" data-cat="METERING" role="img" aria-label="AMS8-1 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS8-1: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS81 | Microcontroller |  | HS | **2.1.1.9** | 2009-06-23 | Standard Products |
| AMS81-ISSUE 1 (Issue 1 boards) | Microcontroller |  | HS | **1.1.0.1** | 2009-06-23 | Standard Products |
| AMS8-12 (ANALOG) | Altera FPGA / CPLD | EPC1S |  | **AMS8-12V100** | — | Altera |
| AMS81 PRODUCT REVISIONS | AMS8E-1 firmware |  |  | **V050001** (in 06VA0002) | 2015-07-29 | AMS8-1 |
| AMS81 PRODUCT REVISIONS | AMS8E-5 firmware |  |  | **V040002** (in 06VA0002) | 2015-07-29 | AMS8-1 |
| AMS81 PRODUCT REVISIONS | SHARC firmware |  |  | **v205** (in 06VA0002) | 2015-07-29 | AMS8-1 |
| AMS81 PRODUCT REVISIONS | ALTERA firmware |  |  | **v050000** (in 06VA0002) | 2015-07-29 | AMS8-1 |
| AMS81 PRODUCT REVISIONS — custom projects | AMS8E-1 firmware |  |  | **C050000** (in 06VC0000) | 2016-02-26 | AMS8-1 |
| AMS81 PRODUCT REVISIONS — custom projects | AMS8E-5 firmware |  |  | **C040000** (in 06VC0000) | 2016-02-26 | AMS8-1 |
| AMS81 PRODUCT REVISIONS — custom projects | SHARC firmware |  |  | **V205C** (in 06VC0000) | 2016-02-26 | AMS8-1 |
| AMS81 PRODUCT REVISIONS — custom projects | ALTERA firmware |  |  | **C050000** (in 06VC0000) | 2016-02-26 | AMS8-1 |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020001** (in 02AV0001) | 2014-06-03 | DEMUX-4 |
| DEMUX-4 FOR AMS-8 AND MLC UNITS (DEMUX-4) | XILINX firmware |  |  | **V020000** (in 02AV0001) | 2014-06-03 | DEMUX-4 |

**Product firmware versions (PFV)**: AMS81 PRODUCT REVISIONS: 36 revisions, latest released **06VA0002** (2015-07-29) · AMS81 PRODUCT REVISIONS — custom projects: 9 revisions, latest released **06VC0000** (2016-02-26)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

**Also:** [DEMUX-4 FOR AMS-8 AND MLC UNITS](DEMUX-4.md#software)

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2009\|42 | 2009-06-23 | AMS81 |  | 2.1.1.9 |  |  |
| 2009\|42 | 2009-06-23 | AMS81-ISSUE 1 |  | 1.1.0.1 | 1.1.0.1 | Bob 2007-02-22 |
|  | — | AMS8-12 (ANALOG) | EPC1S | AMS8-12V100 |  |  |

### AMS81 PRODUCT REVISIONS

_Sheet **AMS8-1**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2005\|38 | 2005-02-24 | **1.0.3.0** | V103 | V103 | V100 | V101 | released |  |
| 2005\|38 | 2005-03-15 | **1.0.4.0** | V104 | V104 | V100 | V101 | released |  |
| 2005\|38 | 2005-04-11 | **1.0.5.0** | V105 | V105 | V100 | V101 | released |  |
| 2005\|38 | 2005-04-13 | **1.0.5.1** | V105 | V1051 | V100 | V101 | released |  |
| 2005\|38 | 2005-05-02 | **1.0.5.2** | V1051 | v1052 | V102 | V101 | released |  |
| 2005\|38 | 2005-06-13 | **1.0.6.0** | V106 | V106 | V102 | V101 | released |  |
| 2005\|38 | 2005-07-05 | **1.0.6.1** | V1061 | V1061 | V102 | V101 | released |  |
| 2005\|38 | 2005-09-01 | **1.0.7.0** | V1071 | V107 | V102 | V102 | released |  |
| 2005\|38 | 2005-09-09 | **1.0.7.1** | V1072 | V1071 | V102 | V102 | released |  |
| 2005\|38 | 2005-09-12 | **1.0.7.2** | V1072 | V1072 | V102 | V102 | released |  |
| 2005\|38 | 2005-10-12 | **1.0.7.3** | V1072 | v1073 | V102 | V102 | released |  |
| 2006\|39 | 2006-01-02 | **1.0.7.4** | V1072 | v1074 | V102 | V102 | released |  |
| 2006\|39 | 2006-01-11 | **1.0.7.5** | V1072 | v1075 | V102 | V102 | released |  |
| 2006\|39 | 2006-02-01 | **1.0.7.6** | V1072 | v1076 | V102 | V102 | released |  |
| 2006\|39 | 2006-05-08 | **1.0.7.7** | V1073 | v1077 | V102 | V102 | released | DEMUX compatibility ATMEL - V101, ALTERA - V105 |
| 2007\|40 | 2007-02-27 | **1.1.0.0** | v1100 | v1100 | V203 | V201 | released |  |
| 2009\|42 | 2009-06-23 | **1.1.0.1** | v1101 | v1101 | V203M | V201 | released |  |
| 2011\|44 | 2011-04-21 | **1.1.0.2** | 1.1.0.1 | 1.1.0.2 | v203M | v204 | released |  |

> use 2.0.0.0 for AMS8E-1 issue 2 PCBs otherwise use 1.0.7.7

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-03-21 | **2.0.0.0** | V2001 | V200 | V200 | V200 | released |  |
| 2006\|39 | 2006-04-06 | **2.0.0.1** | V2002 | V2001 | V200 | V200 | released |  |
| 2006\|39 | 2006-05-08 | **2.0.1.0** | V201 | V201 | V201 | V200 | released |  |
| 2006\|39 | 2006-08-25 | **2.0.1.1** | v2011 | V2011 | V201 | V200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-10-25 | **2.1.1.1** | v2011 | v2111 | V202 | V200 | released |  |
| 2007\|40 | 2007-02-27 | **2.1.1.2** | v2012 | v2112 | V203 | V201 | released |  |
| 2007\|40 | 2007-10-11 | **2.1.1.3** | v2012 | v2113 | V203 | V201 | released |  |
| 2007\|40 | 2007-11-16 | **2.1.1.4** | v2013 | V2114 | V203 | v202 | released |  |
| 2008\|41 | 2008-02-25 | **2.1.1.5** | v2014 | V2115 | V203 | v202 | released |  |
| 2008\|41 | 2008-05-09 | **2.1.1.6** | v2015 | V2116 | V203 | v202 | released |  |
| 2008\|41 | 2008-06-03 | **2.1.1.7** | v2016 | V2117 | V204 | v202 | released |  |
| 2008\|41 | 2008-12-11 | **2.1.1.8** | v2017 | V2118 | V204 | V203 | released |  |
| 2009\|42 | 2009-06-23 | **2.1.1.9** | v2017 | V2119 | V205 | V203 | released | DEMUX compatibility ATMEL - V202, ALTERA - V203 |

> use 2.2.0.0 for AMS8E-6 issue 3 PCBs otherwise use 2.0.0.0

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2009\|42 | 2009-09-08 | **2.0.0.0** | v2017 | v2200 | v205 | v203 | released |  |
| 2013\|46 | 2013-05-28 | **06VA0000** | v050000 | v040000 | v205 | v050000 | released |  |
| 2013\|46 | 2013-07-02 | **06VA0001** | V050001 | v040001 | v205 | v050000 | released |  |
| 2015\|48 | 2015-07-29 | **06VA0002** | V050001 | V040002 | v205 | v050000 | released |  |

> version 3.0.0.0 is an audio switcher with assigned inputs (ANALOG, AES, SDI1/2, SDI3/4)

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
|  | — | **3.0.0.0** | v3000 | v3000 | v300 | v300 | not released |  |

### AMS81 PRODUCT REVISIONS — custom projects

_Sheet **AMS8-1**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2007\|40 | 2007-02-27 | **C.1.0.0** | c101 | c100 | V203 | V201 | released |  |
| 2007\|40 | 2007-04-24 | **C.1.0.1** | c102 | c101 | V203/ V205 | V201 | released |  |
| 2008\|41 | 2008-06-27 | **C.1.0.2** | c103 | c102 | V204/ V205 | V202C | released |  |
| 2008\|41 | 2008-07-03 | **C.1.0.3** | c104 | c103 | V204C/V205C | C202 | released |  |
| 2008\|41 | 2008-08-01 | **C.1.0.4** | c103v1 | c104 | V204C/V205C | C202 | released |  |
| 2010\|43 | 2010-04-15 | **C1.0.5** | c103v1 | c105 | V204C/V205C | C202 | released |  |
| 2010\|43 | 2010-10-25 | **C.1.0.6** | c104 | c106 | V204C/V205C | C203 | released |  |
| 2010\|43 | 2010-10-20 | **C.1.0.7** | v2017 | c107 | V205 | v203 | released |  |
| 2016\|49 | 2016-02-26 | **06VC0000** | C050000 | C040000 | V205C | C050000 | released |  |

> DO NOT USE THE WORKING FILES - USE THE FILE IN THE SPECIFIC FOLDER

### DEMUX-4 FOR AMS-8 AND MLC UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the AMS8-1._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2013\|46 | 2013-12-12 | **02AV0000** | V020000 | V020000 | released | Bob 2013-11-20; Flash M25P16; PCB issue 2 |
| 2014\|47 | 2014-06-03 | **02AV0001** | V020001 | V020000 | released | Bob 2014-05-30; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **1.0.7.7** — 2006|39 · 2006-05-08 — _AMS81 PRODUCT REVISIONS_
    - for CBC Analog Inputs
    - DEMUX compatibility: ATMEL - V101, ALTERA - V105
- **2.0.1.0** — 2006|39 · 2006-05-08 — _AMS81 PRODUCT REVISIONS_: CHANGED FROM 1 TO 2 GROUP SDI MONITORING
- **2.0.1.1** — 2006|39 · 2006-08-25 — _AMS81 PRODUCT REVISIONS_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.1.1.1** — 2006|39 · 2006-10-25 — _AMS81 PRODUCT REVISIONS_: CHANGED METADATA CONNECTOR AND FIXED MODE 4 VOLUME CONTROL ISSUE
- **1.1.0.0** — 2007|40 · 2007-02-27 — _AMS81 PRODUCT REVISIONS_: USED 2.1.1.2 AS THE BASE FOR ISSUE 1 FIX
- **2.1.1.2** — 2007|40 · 2007-02-27 — _AMS81 PRODUCT REVISIONS_: CHANGED ALTERA AND SHARC SOFTWARE
- **C.1.0.0** — 2007|40 · 2007-02-27 — _AMS81 PRODUCT REVISIONS — custom projects_: CBC - Mode 6
- **C.1.0.1** — 2007|40 · 2007-04-24 — _AMS81 PRODUCT REVISIONS — custom projects_: CBC - Mode 6 Version 2/FIXED LED DISPLAY FREEZE
- **2.1.1.3** — 2007|40 · 2007-10-11 — _AMS81 PRODUCT REVISIONS_: ADDED DEFAULT VOLUME SETTINGS IN SETUP
- **2.1.1.4** — 2007|40 · 2007-11-16 — _AMS81 PRODUCT REVISIONS_: FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE
- **2.1.1.5** — 2008|41 · 2008-02-25 — _AMS81 PRODUCT REVISIONS_: IN MODE 2, LOCK STATUS REFLECTS INPUT MONITORED.
- **2.1.1.6** — 2008|41 · 2008-05-09 — _AMS81 PRODUCT REVISIONS_: FIXED DIALNORM ISSUE
- **2.1.1.7** — 2008|41 · 2008-06-03 — _AMS81 PRODUCT REVISIONS_: IN MODE 2, AES OUTPUTS FOLLOW AES INPUT INSTEAD OF 4 COPIES OF MONITORED INPUT
- **C.1.0.2** — 2008|41 · 2008-06-27 — _AMS81 PRODUCT REVISIONS — custom projects_: CBC - Mode 6 Version 2 w/ Current Fixes and Fixed Outputs /FIXED LED DISPLAY FREEZE
- **C.1.0.3** — 2008|41 · 2008-07-03 — _AMS81 PRODUCT REVISIONS — custom projects_: CBC - Mode 6 Version 3
- **C.1.0.4** — 2008|41 · 2008-08-01 — _AMS81 PRODUCT REVISIONS — custom projects_: CBC - Mode 6 Version 2 w/ Fixed Analog Output Issue and modified Mode 2
- **2.1.1.8** — 2008|41 · 2008-12-11 — _AMS81 PRODUCT REVISIONS_: FIXED PHASE ISSUE WITH AES OUTPUTS, FIXED DOLBY ERROR AND MAPPING ISSUE
- **1.1.0.1** — 2009|42 · 2009-06-23 — _AMS81 PRODUCT REVISIONS_: FIXED LED DISPLAY FREEZE
- **2.1.1.9** — 2009|42 · 2009-06-23 — _AMS81 PRODUCT REVISIONS_
    - FIXED ISSUE IN SHARC WITH MUX COUNT AND LED DISPLAY FREEZE.
    - DEMUX compatibility: ATMEL - V202, ALTERA - V203
- **2.0.0.0** — 2009|42 · 2009-09-08 — _AMS81 PRODUCT REVISIONS_: CREATED A NEW ISSUE FRONT PANEL BOARD FOR AMS8-1B
- **C1.0.5** — 2010|43 · 2010-04-15 — _AMS81 PRODUCT REVISIONS — custom projects_: cbc mode 6 - functions the same as version c104. Ams8e-5 atmel firmware changed to support issue 2 and 3 ams8e-6 boards with the LED driver.
- **C.1.0.7** — 2010|43 · 2010-10-20 — _AMS81 PRODUCT REVISIONS — custom projects_: DOME - Mode 5, based on AMS82 Mode 5 Revision 2.1.2.0
- **C.1.0.6** — 2010|43 · 2010-10-25 — _AMS81 PRODUCT REVISIONS — custom projects_: CBC - Mode 6, Version 3 AMS8E-5 Atmel changed to support LED driver on AMS8E-6 boards, also the problem with Left channel volume not updating was resolved. AMS8E-1 ALTERA changed to route the same signal for AES, AUX and Analoge Outputs
- **1.1.0.2** — 2011|44 · 2011-04-21 — _AMS81 PRODUCT REVISIONS_
    - Altera: changed to have analog monitor output mute when speakers are muted.
    - Atmel: ams8e-5 changed to reflect new software versino.
- **06VA0000** — 2013|46 · 2013-05-28 — _AMS81 PRODUCT REVISIONS_
    - removed dependence on cs8416 and ad1895 chipsets within fpga on ams8e-1 main board. Ams8e-1 main board atmel modified to recieve sdi lock status from ams8e-5. AMS8e-5 atmel changed to communicate SDI lock status to ams8e-1 main board.
    - Fixed mode4 LED problems on ams8e-5
    - Ali has added his code into this version for Demux4
- **06VA0001** — 2013|46 · 2013-07-02 — _AMS81 PRODUCT REVISIONS_: When monitoring embedded SDI in mode 1, or 4 (dolby decode mode). Removed and re-asserted AES! Will cause the cat552 card to reset. This was incorrect. Bug resolved.
- **02AV0000** — 2013|46 · 2013-12-12 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: First version of demux4 created for AMS8 series
- **02AV0001** — 2014|47 · 2014-06-03 — _DEMUX-4 FOR AMS-8 AND MLC UNITS_: Fixes the bug that happens sometimes by resetting the power where the demux board doesn’t lock, to resolve it generates a watchdog reset, it should be implemented in other versions as well.
- **06VA0002** — 2015|48 · 2015-07-29 — _AMS81 PRODUCT REVISIONS_
    - Front panel Atmel display initialization updated. Now compatible with PDSP1884 & HDSP2533
    - software revision should change from 06VAxxxx to 06AVxxxx for next revisions
    - As of July 2018 the AMS8E-6 board has been changed to Support Round buttons and the Aux Connector has been changed to a Female Tascam Standard
- **06VC0000** — 2016|49 · 2016-02-26 — _AMS81 PRODUCT REVISIONS — custom projects_
    - CBC - Mode 6 - Version 2 - based on C1.0.5 - updated to support AMS8e-1 ISS5 and DEMUX4-ISS2
    - NOTE: It should have been 06AC0000 must change for the next revision
    - As of July 2018 the AMS8E-6 board has been changed to Support Round buttons and the Aux Connector has been changed to a Female Tascam Standard
- **3.0.0.0** — not released — _AMS81 PRODUCT REVISIONS_: MONITOR OUTPUT IS DELAYED WHEN DOLBY ERROR OCCURS NEEDS FIXING. ALSO HOW DO YOU LISTEN THE SECONDARY PROGRAMMING

_No change note in the listing for: AMS8-12V100, 1.0.3.0, 1.0.4.0, 1.0.5.0, 1.0.5.1, 1.0.5.2, 1.0.6.0, 1.0.6.1, 1.0.7.0, 1.0.7.1, 1.0.7.2, 1.0.7.3, 1.0.7.4, 1.0.7.5, 1.0.7.6, 2.0.0.0, 2.0.0.1._

## Dates found in the documents

| Year | Kind | Text | File |
|---|---|---|---|
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx) |
| [2014\|47](Year-2014.md) | month & year | `Oct.01 2014` | [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `Jul.12 2018` | [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `July 12, 2018` | [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `July 12, 2018` | [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx) |
| [2018\|51](Year-2018.md) | month & year | `Jul.12 2018` | [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx) |
| [2018\|51](Year-2018.md) | month & year | `July 12, 2018` | [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx) |
| [2018\|51](Year-2018.md) | month & year | `July 12, 2018` | [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx) |

## Documents (4)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx) | [note](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx.md) |
| 2014 | [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx) | [note](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx.md) |
| 2018 | [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx) | [note](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx.md) |
| 2018 | [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx) | [note](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx.md) |

## Photos & scans (1)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS8-1 - Information Sheet.jpg](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20Information%20Sheet.jpg.md) |

## From the manuals

_Each manual split into its sections. Text that is the same in many Ward-Beck manuals (warranty, address, standard notes) is kept once on the [Boilerplate](Boilerplate.md) page and linked._

### Specifications (4)

<details><summary>Specifications — 95 words · 2018 - AMS8-1 - MKIII - MANUAL.docx, page 1</summary><p>* As of 2014, the SDI Demuxer option has been upgraded from the Demux3 (HD/SD-SDI) to the Demux 4 (Dual In 3G/HD/SD SDI Demuxer) ** As of July 2018, the Analog Audio output connector has been redesigned to be a DB25 female connector with Tascam pinout.</p><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB25 female Tascam**</p><p>AES/EBU INPUTS</p><p>AES/EBU OUTPUTS</p><p>MONITOR OUTPUT</p><p>HEADSET JACK</p><p>Type ¼ inch TRS jack</p><p>POWER</p><p>Input</p><p>90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-f0e6d1b5e71be8e8">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-82b3bc8d6c0b8d76">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx), p. 1
<details><summary>Specifications — 73 words · 2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx, page 1</summary><p>* As of 2014, the SDI Demuxer option has been upgraded from the Demux3 (HD/SD-SDI) to the Demux 4 (Dual In 3G/HD/SD SDI Demuxer)</p><p>ANALOG OUTPUT</p><p>Frequency Response 1.5 dBu from 20Hz to 20kHz Impedance 60Ω Balanced Max Output 23.5 dBu Noise Less than -70 dBu THD Less than 0.05% Connector Type DB 25 male</p><p>AES/EBU INPUTS</p><p>AES/EBU OUTPUTS</p><p>MONITOR OUTPUT</p><p>HEADSET JACK</p><p>Type ¼ inch TRS jack</p><p>POWER</p><p>Input</p><p>90-230 VAC,50-60 Hz</p><p class="bp">Also: <a href="Boilerplate.md#bp-f0e6d1b5e71be8e8">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-82b3bc8d6c0b8d76">specs boilerplate (6 devices)</a> · <a href="Boilerplate.md#bp-0e2984c715963899">specs boilerplate (7 devices)</a> · <a href="Boilerplate.md#bp-d598fd57bc8328e0">specs boilerplate (56 devices)</a></p></details>
- source: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx), p. 1
- also in: [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx), p. 1 · [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx), p. 1

### Operation (12)

<details><summary>Controls — 2098 words · 2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx, page 1</summary><p>There are eight illuminated push button switches arranged in two rows of four.  The upper row designated INPUTS selects the input source to be monitored.  The lower row  designated PRESETS selects a preset configuration or condition under which the signal is monitored.</p><p>The two control knobs designated SELECT and VOLUME are rotary shaft encoders with integral push switches.  In the simplest mode of operation, the SELECT knob allows the user to scroll through available options while the VOLUME button adjusts the listening level of the AMS8&#x27;s speakers.</p><p>All eight push buttons, as well as the two knobs with integral push switches, are used in conjunction with the eight-segment read out when the unit is configured during SYSTEM SETUP.</p><p>SYSTEM SETUP</p><p>To enter system setup, press and hold INPUT buttons 1/2 and 7/8 with one hand and press the SELECT knob.  The readout will display System.  Press the SELECT button again to enter the mode of operation selection.  The readout will display Mode X, where X is 1, 2, or 4.</p><p>The VOLUME knob may be rotated, in either direction, to select the appropriate mode of operation.</p><p>Rotate the SELECT knob one step clockwise to enter the reference signal setup. The readout will display Ref above the SELECT knob and Int, 75Ω or 110Ω above the VOLUME knob.</p><p>Ref Int - means that the internal 48 kHz reference is used Ref 75Ω - means that an external unbalanced reference will be used Ref 110Ω - means that an external balanced reference will be used</p><p>Rotating the VOLUME knob in either direction selects the appropriate reference source.</p><p>Rotate the SELECT knob another step clockwise to enter the AES OUTPUT #4 Setup.  The readout will display Out4 above the SELECT knob and In4 or Mon above the VOLUME knob.</p><p>Out4 In4- means that AES input #4 will be routed to AES output #4. Out4 Mon - means that the Monitor Output will be routed to AES output #4.</p><p>Rotate the SELECT knob another step clockwise to enter the Dialogue Normalization setup.  The readout will display Dn above the SELECT knob and Enbd or Dsbd above the VOLUME knob.</p><p>Dn Enbd - means that the dialogue normalization level in the metadata will be applied to the dolby signal. Dn Dsbd - means that the dialogue normalization level in the metadata will not be applied to the dolby signal.</p><p>Rotate the SELECT knob another step clockwise.  The readout will display Vol over the SELECT knob and a default volume level reading between OFF, -60db and +15dB above the VOLUME knob.</p><p>The VOLUME control is used to set the default volume level, in one dB steps, for monitoring audio.</p><p>Rotate the SELECT knob another step clockwise.  The readout will display O/P above the SELECT knob and either Var or Fix above the VOLUME knob.  Rotating the VOLUME knob in either direction will toggle between Var and Fix.</p><p>O/P Var - means that all the outputs of the unit will be level controlled and follow the action of the VOLUME control O/P Fix - means that all the outputs will be a fixed line level (-20 dBFs for digital outputs and +4dBu for analog outputs) the VOLUME control will only affect the level of the internal speakers and also the two monitor outputs on the back of the unit.</p><p>Rotate the SELECT knob another step clockwise.  The readout will display Cal over the SELECT knob and a reference level reading between -22dB and -10dB above the VOLUME knob.</p><p>The VOLUME control is used to set the reference level, in two dB steps, for monitoring  audio.</p><p>Rotate the SELECT knob one more step clockwise.  The readout will display Spkr above the SELECT knob and either On or Off above the VOLUME knob.  Rotating the VOLUME knob in either direction will toggle between On and Off.</p><p>(In Version 1.x.x.x.) Spkr On means the internal speakers and headset jack are enabled, and enables monitor output. Spkr Off means the internal speakers and headset jack are disabled, and disables the monitor output.</p><p>(In Version 2.x.x.x. and above) Spkr On means the internal speakers and headset jack are enabled. Spkr Off means the internal speakers and headset jack are disabled.</p><p>Rotate the SELECT knob one more step.  The readout now displays Exit.</p><p>Push the SELECT knob to return to the System setup screen.  To exit system setup, turn the SELECT knob one step counter clockwise.  The readout displays Exit.  Push the SELECT knob once to exit the system setup procedures.</p><p>CHECKING THE FIRMWARE</p><p>When the system setup mode has been activated and the readout displays System, rotating the SELECT knob clockwise will cycle through the following:</p><p>Inputs - This configuration setup allows you to select the input sources that will be enable during monitoring.  (See INPUTS SETUP). Assigns - This configuration setup applies only to units set to operate in Mode 1.  (See ASSIGNMENT SETUP). Firmware - This allows you to check the version of firmware installed in your unit.  Press the SELECT knob once and a numeric code will be displayed in the readout window, such as 2.0.0.0.  This is the firmware version identifier and is information that will be helpful if you contact the factory for technical assistance.</p><p>To exit the firmware interrogation mode, rotate the SELECT knob one step counter clockwise and push the SELECT knob once when the readout displays Exit.</p><p>INPUTS SETUP (for all modes)</p><p>A fully assembled AMS8 has multiple program inputs (75Ω, 110Ω, Analog, SDI 1 (A) Groups 1 and 2, SDI 1 (A) Groups 3 and 4 and SD1 2 (B) Groups 1 and 2 and SDI 2 (B) Groups 3 and 4. The Inputs setup allows an operator to enable or disable the input option during monitoring.  When the System Setup mode has been activated and the readout displays System, rotating the SELECT knob clockwise one step will put the unit in the Inputs mode.  Press the SELECT knob once and the 75Ω option will be displayed in the readout window above the SELECT knob.  The display above the VOLUME knob will indicate whether the Input option is enabled.  If (Y) is displayed then the Input option is enabled.  If (N) is displayed then the input opt</p></details>
- source: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx), p. 1
<details><summary>Front Panel — 56 words · 2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx, page 1</summary><p>DISPLAYS</p><p>Eight 22 segment LED bar graph meters display VU and Peak Program information simultaneously.  A reference LED (red) at the zero mark is continuously illuminated.</p><p>An eight-character dot-matrix display located above the SELECT and VOLUME controls display signal parameters and status information.  During setup, this display is used to guide the user in making selections</p></details>
- source: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx), p. 1
<details><summary>Controls — 18 words · 2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx, page 1</summary><p>Please note that primary functions for controls are designated in white, while secondary functions are designated in green</p></details>
- source: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx), p. 1
- also in: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx), p. 1 · [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx), p. 1 · [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx), p. 1 · [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx), p. 1 · [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx), p. 1 · [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx), p. 1 · [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx), p. 1 · [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx), p. 1 · [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx), p. 1

### Warranty (4)

<details><summary>Warranty — 0 words · 2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29.docx), p. 1
<details><summary>Warranty — 0 words · 2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx](../Products/METERING/AMS8-1/2014%20-%20AMS8-1%20-%20MANUAL%20%28Archived%20-%20OBSOLETE%20as%20of%20July%2013%2C%202018%29%20%282%29.docx), p. 1
<details><summary>Warranty — 0 words · 2018 - AMS8-1 - MKIII - MANUAL.docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2018 - AMS8-1 - MKIII - MANUAL.docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL.docx), p. 1
<details><summary>Warranty — 0 words · 2018 - AMS8-1 - MKIII - MANUAL (2).docx, page 1</summary><p><em>(only shared text)</em></p><p class="bp">Also: <a href="Boilerplate.md#bp-63617240bb5bb638">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1a488a5cc38d92fe">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-045065cd9adcbfb5">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-073c30eb0adcf664">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1cbf852f43462543">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-b6240b9a7aed9a9e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-72f55892a1c53496">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-34741163f3361dce">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-f4e5345ab11dc585">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-1637977c20b2600e">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-7f976e2b41601d05">warranty boilerplate (67 devices)</a> · <a href="Boilerplate.md#bp-c1c0908fa3aad7e2">warranty boilerplate (68 devices)</a></p></details>
- source: [2018 - AMS8-1 - MKIII - MANUAL (2).docx](../Products/METERING/AMS8-1/2018%20-%20AMS8-1%20-%20MKIII%20-%20MANUAL%20%282%29.docx), p. 1

## Contents (JSON)

```json
{
 "device": "AMS8-1",
 "name": "Mkiii 8 Channel Audio Monitoring System",
 "category": "METERING",
 "year": 2014,
 "documents": [
  {
   "file": "Products/METERING/AMS8-1/2014 - AMS8-1 - Information Sheet.jpg",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates"
   ]
  },
  {
   "file": "Products/METERING/AMS8-1/2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018) (2).docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/AMS8-1/2014 - AMS8-1 - MANUAL (Archived - OBSOLETE as of July 13, 2018).docx",
   "year": 2014,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/AMS8-1/2018 - AMS8-1 - MKIII - MANUAL (2).docx",
   "year": 2018,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  },
  {
   "file": "Products/METERING/AMS8-1/2018 - AMS8-1 - MKIII - MANUAL.docx",
   "year": 2018,
   "pages": 1,
   "holds": [
    "dates",
    "sections"
   ]
  }
 ]
}
```
