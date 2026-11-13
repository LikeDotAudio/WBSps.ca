---
type: "product"
code: "POD22"
title: "Stereo Loudness Meter"
category: "PODS"
year: 2014
confidence: "low (named by)"
tags: ["product", "pods", "2010s"]
---

# POD22 — Stereo Loudness Meter

**▶ [Open the POD22 - simulation](../siumulation.html?plugin=pod22)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [PODS](Series-PODS.md) |
| Try it | [full simulation: POD22 -](../siumulation.html?plugin=pod22) · [KiCad symbol generator](../kicad.html?m=POD22) · [download package (zip)](../_packages/POD22.zip) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — named in document |
| Evidence | named in 2014 - POD22A - MANUAL.docx |
| Confidence | low (named by) |
| All years found | [2014\|47](Year-2014.md) |
| Variants | [POD22A](POD22A.md) |
| Folder | [Products/PODS/POD22](../Products/PODS/POD22/) |

## Front panel

<svg class="wbs-panel solo" data-m="POD22" data-n="Stereo Loudness Meter" data-cat="PODS" role="img" aria-label="POD22 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the POD22: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| POD22 | Microcontroller | PIC16F874 | HS | **POD22V103** | 2006-05-16 | Standard Products |
| POD22 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **v103** | 2011-06-13 | Sharc |
| POD22 | SHARC DSP boot (E)EPROM | AM29LV04OB-120JC |  | **POD22V102** | — | Sharc |

**Programming:** Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2006\|39 | 2006-05-16 | POD22 | PIC16F874 | POD22V103 |  |  |
| 2011\|44 | 2011-06-13 | POD22 | AM29LV04OB-120JC | v103 |  |  |
|  | — | POD22 | AM29LV04OB-120JC | POD22V102 |  |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **POD22V103** — 2006|39 · 2006-05-16 — _POD22 · PIC16F874_: UPDATED TO FIX THE NOISE ISSUE ON LOSS OF LOCK
- **v103** — 2011|44 · 2011-06-13 — _POD22 · AM29LV04OB-120JC_: DSP upgraded to support high resolution display boards

_No change note in the listing for: POD22V102._

## Photos & scans (1)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - POD22 - pod22_front.jpg](../Products/PODS/POD22/2014%20-%20POD22%20-%20pod22_front.jpg) | [note](../Products/PODS/POD22/2014%20-%20POD22%20-%20pod22_front.jpg.md) |

## Footnotes

1. The only curve version of the POD22 silk (Sep 2002) is a rear panel alone and names DIP levers 7–8 AUTO / MAN; the Jan 2003 silk calls them A0 / A1. — `#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/SILK/POD22-S2curve.cdr`
2. The Jan 2003 silk keeps every label as live Arial text; libcdr loses its alignment and lays the 41 rotated scale numbers flat. — `#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/SILK/POD22-Silk.cdr`
3. POD22-Silk-iss2.cdr (2006) already carries the 52 … +20 scale of the later POD22A. — `#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/SILK/POD22-Silk-iss2.cdr`
4. The 2002 mechanical drawings call for silkscreen “#POD22A-FRONT&REAR-SILK”, a name from the later product. — `#POD #SERIES/POD22A - #Master/POD22A - #ARTWORK #DA #2016/POD22A-FRONT&REAR-SILK (CURVE).cdr`
5. MANUAL/Backup_of_Pod22manu.pdf is a “POD 9 VIDEO SWITCHER” page. — `#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/MANUAL/Backup_of_Pod22manu.pdf`
