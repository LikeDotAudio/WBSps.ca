---
type: "module"
code: "MLC8-N"
title: "Three Quarter"
category: "RAVENNA AES67"
year: 2017
confidence: "low (named by)"
tags: ["module", "ravenna-aes67", "2010s"]
---

# MLC8-N — Three Quarter

**▶ [Open the MLC8 / MLC6 level control simulation](../siumulation.html?plugin=mlc8) · [Open the RD66-MLC8UsingAMS8E-1-iss5 simulation](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | module |
| Category | [RAVENNA AES67](Category-RAVENNA-AES67.md) |
| Try it | [full simulation: MLC8 / MLC6 level control](../siumulation.html?plugin=mlc8) · [full simulation: RD66-MLC8UsingAMS8E-1-iss5](../siumulation.html?plugin=rd66-mlc8-ams8e1-iss5) · [KiCad symbol generator](../kicad.html?m=MLC8-N) |
| Earliest dated evidence | [2017\|50](Year-2017.md) — dated folder |
| Evidence | in "WBS.NAB - 2017 - Rack layout images" |
| Confidence | low (named by) |
| All years found | [2017\|50](Year-2017.md), [2021\|54](Year-2021.md) |
| Variants | [MLC8](MLC8.md), [MLC8A](MLC8A.md), [MLC8B](MLC8B.md), [MLC8C](MLC8C.md), [MLC8D](MLC8D.md) |
| Folder | [Products/RAVENNA AES67/MLC8-N](../Products/RAVENNA%20AES67/MLC8-N/) |

## Front panel

<svg class="wbs-panel solo" data-m="MLC8-N" data-n="Three Quarter" data-cat="RAVENNA AES67" role="img" aria-label="MLC8-N front panel"></svg>

<a id="software"></a>

## Software

_What runs on the MLC8-N: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| MLC8N (Ravenna) REVISIONS — Main Board Revisions | ATMEL firmware |  |  | **MLC8A V050000** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Main Board Revisions | SHARC firmware |  |  | **MLC8A v106** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Main Board Revisions | ALTERA firmware |  |  | **v050000** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Front Panel Revisions | ATMEL firmware |  |  | **MLC8A V205** (in 05AV0000) | 2016-05-25 | MLCs |
| MLC8N (Ravenna) REVISIONS — Front Panel Revisions | ALTERA firmware |  |  | **MLC8A V200** (in 05AV0000) | 2016-05-25 | MLCs |

**Product firmware versions (PFV)**: MLC8N (Ravenna) REVISIONS — Main Board Revisions: 2 revisions, latest released **05AV0000** (2016-05-25) · MLC8N (Ravenna) REVISIONS — Front Panel Revisions: 2 revisions, latest released **05AV0000** (2016-05-25)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### MLC8N (Ravenna) REVISIONS — Main Board Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2016\|49 | 2016-05-25 | **05AV0000** | MLC8A V050000 | MLC8A v106 | v050000 | released |  |
| 2016\|49 | 2016-05-25 | **05AV0100** | MLC8B V050100 | MLC8B v106 | v050000 | released |  |

> ALTERA LOCATED IN THE "H:\Engineering\WBSProducts\MLC\MLC8\Software\MLC8N\AMS8-1" FOLDER

### MLC8N (Ravenna) REVISIONS — Front Panel Revisions

_Sheet **MLCs**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | ATMEL | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2016\|49 | 2016-05-25 | **05AV0000** | MLC8A V205 | MLC8A V200 | released |  |
| 2016\|49 | 2016-05-25 | **05AV0100** | MLC8B V040000 | MLC8B V040000 | released |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **05AV0000** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Front Panel Revisions_
    - based on MLC8A 2.0.0.5
    - NOT RELEASED
- **05AV0100** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Front Panel Revisions_
    - based on MLC8B 05AV0100
    - NAB2016
- **05AV0000** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Main Board Revisions_
    - based on MLC8A 05AV0000
    - NOT RELEASED
- **05AV0100** — 2016|49 · 2016-05-25 — _MLC8N (Ravenna) REVISIONS — Main Board Revisions_
    - based on MLC8B 05AV0100
    - NAB2016

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2018 | [2018 - MLC8-N - Information Sheet.jpg](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Information%20Sheet.jpg) | [note](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Information%20Sheet.jpg.md) |
| 2018 | [2018 - MLC8-N - Three Quarter.jpg](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Three%20Quarter.jpg) | [note](../Products/RAVENNA%20AES67/MLC8-N/2018%20-%20MLC8-N%20-%20Three%20Quarter.jpg.md) |

## Footnotes

1. **MLC8 / MLC6 level control:** Artwork 2026|59: the front panel and meter lens are drawn from MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr (Jan 18 2016) and AMS8-M6-SILK(MLC8-M3) (CURVE).cdr. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr`
2. **MLC8 / MLC6 level control:** The MLC-8A front sheet prints “MLC-8B MULTICHANNEL LEVEL CONTROL” on its GREEN plate. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr`
3. **MLC8 / MLC6 level control:** The meter-lens sheet is shared with the AMS8-1: a byte-identical copy sits in the AMS81 artwork folder. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr`
4. **MLC8 / MLC6 level control:** The lens prints the bottom meter mark as 34; the meter table ams81_vu_data.dat labels it −36. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr`
5. **MLC8 / MLC6 level control:** The 8A front draws its panel outline as an ink-coloured hairline instead of on the mechanical layer. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr`
6. **MLC8 / MLC6 level control:** No 8A rear CorelDRAW exists: mlc8-rear-silk-CURVE.cdr (Sep 2006) is an SDI IN / SDI OUT / AES1 / AES2 variant with no 75 Ω BNC legends, so the rear stays on the manual drawing. — `#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #SILK/mlc8-rear-silk-CURVE.cdr`
7. **MLC8 / MLC6 level control:** The MLC8 SILK folder keeps seven 2006|39 front iterations (ver1, ver2, ver4, ver5 — no ver3 — and latest-ver1–3), and the same set of .cdr files appears again under MLC8 #Engineering #TIM/SILK. — `#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #SILK/mlc8-SILK-latest-ver3.cdr`
8. **RD66-MLC8UsingAMS8E-1-iss5:** The front, rear and lens sheets are from May 2015, two years after RD66, and already carry the RD73 SDI 1 / SDI 2 button column. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8B-FRONT-SILK(CURVE MLC-M11).cdr`
9. **RD66-MLC8UsingAMS8E-1-iss5:** The MLC8B rear plate's model line reads “MLC-8”, not MLC-8B. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC8B-REAR-SILK(CURVE AMS8-M19).cdr`
10. **RD66-MLC8UsingAMS8E-1-iss5:** The M19 rear is stored twice as different files: the MLC copy is all curves; the AMS81 copy (Apr 2016) has three live-text objects but the same layout. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M19-REAR-SILK (CURVE) (MLC-8B).cdr`
11. **RD66-MLC8UsingAMS8E-1-iss5:** The rear also has an AUX 2 DB25, an option-card slot and two round holes with a small rectangle at the top right, none used by this bench. — `#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC8B-REAR-SILK(CURVE AMS8-M19).cdr`
12. **RD66-MLC8UsingAMS8E-1-iss5:** The lens is the shared AMS8/MLC8 M6 part; the MLC8B uses only its left 3″ (CH1–CH8 scales, DD and ERR). — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr`
