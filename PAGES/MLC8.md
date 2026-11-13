---
type: "product"
code: "MLC8"
title: "Multi-Channel Level Control"
category: "METERING"
year: 2017
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# MLC8 — Multi-Channel Level Control

**▶ [Open the MLC8 / MLC6 level control simulation](../siumulation.html?plugin=mlc8) · [Open the RD66-MLC8UsingAMS8E-1-iss5 simulation](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: MLC8 / MLC6 level control](../siumulation.html?plugin=mlc8) · [full simulation: RD66-MLC8UsingAMS8E-1-iss5](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5) · [simulator & front panel](../simulator.html?m=MLC8) · [KiCad symbol generator](../kicad.html?m=MLC8) · [download package (zip)](../_packages/MLC8.zip) |
| Earliest dated evidence | [2017\|50](Year-2017.md) — dated folder |
| Evidence | in "WBS.NAB - 2017 - Rack layout images" |
| Confidence | low (named by) |
| All years found | [2017\|50](Year-2017.md), [2018\|51](Year-2018.md), [2019\|52](Year-2019.md) |
| Variants | [MLC8-N](MLC8-N.md), [MLC8A](MLC8A.md), [MLC8B](MLC8B.md), [MLC8C](MLC8C.md), [MLC8D](MLC8D.md) |
| Folder | [Products/METERING/MLC8](../Products/METERING/MLC8/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC8" data-n="Multi-Channel Level Control" data-cat="METERING" role="img" aria-label="MLC8 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC8: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC8A REVISIONS — Main Board Revisions (MLC8A) | ATMEL firmware |  |  | **V050000** (in 05AV0000) | 2014-12-15 | MLCs |
| MLC8A REVISIONS — Main Board Revisions (MLC8A) | SHARC firmware |  |  | **V106** (in 05AV0000) | 2014-12-15 | MLCs |
| MLC8A REVISIONS — Main Board Revisions (MLC8A) | ALTERA firmware |  |  | **AMS81 v050000** (in 05AV0000) | 2014-12-15 | MLCs |
| MLC8A REVISIONS — Front Panel Revisions (MLC8A) | ATMEL firmware |  |  | **V205** (in 2.0.0.5) | 2007-12-21 | MLCs |
| MLC8A REVISIONS — Front Panel Revisions (MLC8A) | ALTERA firmware |  |  | **V200** (in 2.0.0.5) | 2007-12-21 | MLCs |
| MLC8A REVISIONS — MLC8R Front Panel Revisions (MLC8A) | ATMEL firmware |  |  | **MLC8AV205** (in 2.0.0.4) | 2007-12-21 | MLCs |
| MLC8A REVISIONS — MLC8R Front Panel Revisions (MLC8A) | ALTERA firmware |  |  | **V200** (in 2.0.0.4) | 2007-12-21 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions (MLC8B) | ATMEL firmware |  |  | **V050100** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions (MLC8B) | SHARC firmware |  |  | **v106** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions (MLC8B) | ALTERA firmware |  |  | **AMS81 v050000** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions (MLC8B) | ATMEL firmware |  |  | **V040000** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions (MLC8B) | ALTERA firmware |  |  | **V040000** (in 05AV0100) | 2014-01-27 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions (MLC8B) | ATMEL firmware |  |  | **V040100** (in 05AV0200) | 2014-10-06 | MLCs |
| MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions (MLC8B) | ALTERA firmware |  |  | **V040100** (in 05AV0200) | 2014-10-06 | MLCs |

**Also:** [MLC8A REVISIONS — Main Board Revisions](MLC8A.md#software) · [MLC8A REVISIONS — Front Panel Revisions](MLC8A.md#software) · [MLC8A REVISIONS — MLC8R Front Panel Revisions](MLC8A.md#software) · [MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions](MLC8B.md#software) · [MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions](MLC8B.md#software) · [MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions](MLC8B.md#software)

## Versions

### MLC8A REVISIONS — Main Board Revisions

_From the [MLC8A](MLC8A.md#software) sheet: the build used in the MLC8._

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

_From the [MLC8A](MLC8A.md#software) sheet: the build used in the MLC8._

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

_From the [MLC8A](MLC8A.md#software) sheet: the build used in the MLC8._

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

### MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions

_From the [MLC8B](MLC8B.md#software) sheet: the build used in the MLC8._

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

_From the [MLC8B](MLC8B.md#software) sheet: the build used in the MLC8._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-10-02 | **2.0.0.0** | V202 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2006\|39 | 2006-12-20 | **2.0.0.1** | V203 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2007\|40 | 2007-02-14 | **2.0.0.2** | V204 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2008\|41 | 2008-03-19 | **2.0.0.3** | V205 | MLC8AV200 | released | DEMUX compatibility ATMEL - V201, ALTERA - V202 |
| 2014\|47 | 2014-01-27 | **05AV0100** | V040000 | V040000 | released | DEMUX compatibility DEMUX4 - 02AV0000 |

> LOCATED IN THE "H:\mlc\Software\MLC8AM\" FOLDER

### MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions

_From the [MLC8B](MLC8B.md#software) sheet: the build used in the MLC8._

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
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - Proto released to CBC
- **1.0.0.0** — 2006|39 · 2006-08-10 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - N/A
    - Proto released to CBC
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8A REVISIONS — Front Panel Revisions_
    - N/A
    - MLC8 MAIN BOARD - V2.0.0.0 or greater
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8A REVISIONS — Main Board Revisions_: N/A
- **2.0.0.0** — 2006|39 · 2006-08-25 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_: N/A
- **2.0.0.1** — 2006|39 · 2006-08-31 — _MLC8A REVISIONS — Front Panel Revisions_: N/A
- **2.0.0.0** — 2006|39 · 2006-08-31 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - MLC8 - V2.0.0.0 or greater
- **2.0.0.0** — 2006|39 · 2006-08-31 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - N/A
    - MLC8 - V2.0.0.0 or greater
- **2.0.0.2** — 2006|39 · 2006-10-02 — _MLC8A REVISIONS — Front Panel Revisions_: N/A
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS NO CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8A REVISIONS — Main Board Revisions_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.0** — 2006|39 · 2006-10-02 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - MLC8 MAIN BOARD - V2.0.0.2 or greater (NO CARRIER INFORMATION REPORTED TO REMOTE PANEL)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS NO CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-10-02 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_: DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8A REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD (USE MLC8RV203)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8A REVISIONS — Main Board Revisions_
    - FOR MLC8A/C/D, USE AMS8-1 IN MLC8A FOLDER. USE AMS8-1 IN MLC8B FOLDER FOR MLC8B. USE AMS8-1 IN MLC8CA FOLDER FOR MLC8CA
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.1** — 2006|39 · 2006-12-20 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - MLC8 MAIN BOARD - V2.0.0.2 or greater (CARRIER INFORMATION REPORTED TO REMOTE PANEL)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - MLC8B HAS CARRIER LOCK INFORMATION RECEIVED FROM MOTHERBOARD (USE MLC8RV203)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2006|39 · 2006-12-20 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
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
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.3** — 2007|40 · 2007-02-12 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - ADDED DIM FEATURE (default -10dB of MASTER VOLUME)
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.2** — 2007|40 · 2007-02-14 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
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
- **2.0.0.3** — 2008|41 · 2008-03-19 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2008|41 · 2008-03-19 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.4** — 2008|41 · 2008-03-19 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - FIXED AUDIO MISMATCHING AND EEPROM CHANGE IN MODE AND FIXED COMMUNICATION ISSUE
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **Custom 039** — 2008|41 · 2008-11-21 — _MLC8A REVISIONS — Main Board Revisions_
    - ADDED LTRT OUTPUT ON AES4 WHEN ST BUTTON IS PRESSED. USE WITH FRONT PANEL V2.0.0.5 AND REMOTE PANEL V2.0.0.4
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.6** — 2009|42 · 2009-06-01 — _MLC8A REVISIONS — Main Board Revisions_
    - FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **2.0.0.5** — 2013|46 · 2013-04-01 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE, ATMEL - V202, ALTERA - V203
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202
- **05AV0100** — 2014|47 · 2014-01-27 — _MLC8B (aka MLC8AM) REVISIONS — Front Panel Revisions_
    - added compatibility with demux4
    - DEMUX compatibility: DEMUX4 - 02AV0000
- **05AV0100** — 2014|47 · 2014-01-27 — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - added compatibility with demux4
    - DEMUX compatibility: DEMUX4 - 02AV0000
- **05AV0200** — 2014|47 · 2014-10-06 — _MLC8B (aka MLC8AM) REVISIONS — MLC8R Front Panel Revisions_
    - AS of August 2018 the Aux Connector has been updated to a Female Tascam Standard
    - DEMUX compatibility: DEMUX4 - 02AV0001
- **05AV0000** — 2014|47 · 2014-12-15 — _MLC8A REVISIONS — Main Board Revisions_: AS of August 2018 the Aux Connector has been updated to a Female Tascam
- **05AV0000** — undated — _MLC8B (aka MLC8AM) REVISIONS — Main Board Revisions_
    - removed dependence on cs8416 and ad1895 chipsets within fpga and main board atmel
    - DEMUX compatibility: ATMEL - V201, ALTERA - V202

## Photos & scans (1)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - MLC8 - SLM1 Front Three Quarter.jpg](../Products/METERING/MLC8/2018%20-%20MLC8%20-%20SLM1%20Front%20Three%20Quarter.jpg) | [note](../Products/METERING/MLC8/2018%20-%20MLC8%20-%20SLM1%20Front%20Three%20Quarter.jpg.md) |

## Contents (JSON)

```json
{
 "device": "MLC8",
 "name": "Multi-Channel Level Control",
 "category": "METERING",
 "year": 2017,
 "documents": [
  {
   "file": "Products/METERING/MLC8/2018 - MLC8 - SLM1 Front Three Quarter.jpg",
   "year": 2018,
   "pages": 1,
   "holds": []
  }
 ]
}
```
