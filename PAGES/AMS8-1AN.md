---
type: "module"
code: "AMS8-1AN"
category: "RAVENNA AES67"
year: 2014
confidence: "family"
tags: ["module", "ravenna-aes67", "2010s"]
---

# AMS8-1AN

**▶ [Open the AMS81 simulation](../siumulation.html?plugin=ams81)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | module |
| Category | [RAVENNA AES67](Category-RAVENNA-AES67.md) |
| Try it | [full simulation: AMS81](../siumulation.html?plugin=ams81) · [KiCad symbol generator](../kicad.html?m=AMS8-1AN) |
| Earliest dated evidence | [2014\|47](Year-2014.md) — estimate from a dated variant |
| Evidence | from AMS8-1 |
| Confidence | family |
| Variants | [AMS8-1](AMS8-1.md), [AMS8-1A](AMS8-1A.md), [AMS8-1AA](AMS8-1AA.md), [AMS8-1AAE](AMS8-1AAE.md), [AMS8-1AAEM](AMS8-1AAEM.md), [AMS8-1AAM](AMS8-1AAM.md), [AMS8-1AE](AMS8-1AE.md), [AMS8-1AEM](AMS8-1AEM.md), [AMS8-1AM](AMS8-1AM.md), [AMS8-1BA](AMS8-1BA.md), [AMS8-1CA](AMS8-1CA.md), [AMS8-1CAEM](AMS8-1CAEM.md), [AMS8-1CAM](AMS8-1CAM.md), [AMS8-2](AMS8-2.md), [AMS8-2A](AMS8-2A.md), [AMS8-2AA](AMS8-2AA.md), [AMS8-2AAE](AMS8-2AAE.md), [AMS8-2AAEM](AMS8-2AAEM.md), [AMS8-2AAM](AMS8-2AAM.md), [AMS8-2AE](AMS8-2AE.md), [AMS8-2AEM](AMS8-2AEM.md), [AMS8-2AM](AMS8-2AM.md) |
| Folder | [Products/RAVENNA AES67/AMS8-1AN](../Products/RAVENNA%20AES67/AMS8-1AN/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS8-1AN" data-n="" data-cat="RAVENNA AES67" role="img" aria-label="AMS8-1AN front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS8-1AN: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS8-1AN | AMS8E-1 firmware |  |  | **V050001** (in 06AV0100) | 2016-05-15 | AMS8-1 |
| AMS8-1AN | AMS8E-5 firmware |  |  | **V040100** (in 06AV0100) | 2016-05-15 | AMS8-1 |
| AMS8-1AN | SHARC firmware |  |  | **v205** (in 06AV0100) | 2016-05-15 | AMS8-1 |
| AMS8-1AN | ALTERA firmware |  |  | **V050100** (in 06AV0100) | 2016-05-15 | AMS8-1 |

**Product firmware versions (PFV)**: AMS8-1AN: 1 revisions, latest released **06AV0100** (2016-05-15)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### AMS8-1AN

_Sheet **AMS8-1**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS8E-1 | AMS8E-5 | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2016\|49 | 2016-05-15 | **06AV0100** | V050001 | V040100 | v205 | V050100 | released |  |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **06AV0100** — 2016|49 · 2016-05-15 — _AMS8-1AN_
    - This is to accommodate unet Standard board for AMS8-1AN
    - NAB2016

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS8-1AN - 002 - AMS8-1AN Three Quarter.jpg](../Products/RAVENNA%20AES67/AMS8-1AN/2014%20-%20AMS8-1AN%20-%20002%20-%20AMS8-1AN%20Three%20Quarter.jpg) | [note](../Products/RAVENNA%20AES67/AMS8-1AN/2014%20-%20AMS8-1AN%20-%20002%20-%20AMS8-1AN%20Three%20Quarter.jpg.md) |
| 2014 | [2014 - AMS8-1AN - Information Sheet.jpg](../Products/RAVENNA%20AES67/AMS8-1AN/2014%20-%20AMS8-1AN%20-%20Information%20Sheet.jpg) | [note](../Products/RAVENNA%20AES67/AMS8-1AN/2014%20-%20AMS8-1AN%20-%20Information%20Sheet.jpg.md) |

## Footnotes

1. Artwork 2026|59: the front, lens and rear are drawn from AMS8-1A-FRONT-SILK (CURVES).cdr (OCT.19/15), AMS8-M6-SILK(MLC8-M3) (CURVE).cdr (May 08/15) and AMS8-M2-Rear-SILK(Curve).cdr (MAY 07/15). — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
2. The ‘CURVES’ front file is not in curves: all 46 legends are still live Arial text, and the conversion loses their alignment. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
3. The 2015 front has hexagonal vents; the AMS8-1A (AMS8-M24) photo shows slotted vents, so the photo is of another issue. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/Pics/AMS8-1A (AMS8-M24)Front.jpg`
4. The meter lens is a shared part: the AMS8-M6 sheet is the long MLC8-M3 window with eight round holes on its right; the AMS8-1 uses only its left 216 pt. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr`
5. The front legend reads PRESET (singular), the AMS8-2 front reads PRESETS. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr`
6. Two AMS8-1A front sheets sit side by side with the same date: the CURVES file and AMS8-1A-FRONT-SILK (AMS8-M24).cdr. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (AMS8-M24).cdr`
7. The 1B and 1CA fronts (Apr 2016) are separate variants that the simulator does not model. — `AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-1CA-FRONT-SILK (CURVES).cdr`
