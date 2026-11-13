---
type: "product"
code: "AMS16"
category: "METERING"
year: 2013
confidence: "low (named by)"
tags: ["product", "metering", "2010s"]
---

# AMS16

**▶ [Open the AMS16 simulation](../siumulation.html?plugin=ams16) · [Open the RD23AMS163GSDIUpgrade simulation](../siumulation.html?plugin=rd23-ams16-3g)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product |
| Series | [METERING](Series-METERING.md) |
| Try it | [full simulation: AMS16](../siumulation.html?plugin=ams16) · [full simulation: RD23AMS163GSDIUpgrade](../siumulation.html?plugin=rd23-ams16-3g) · [KiCad symbol generator](../kicad.html?m=AMS16) · [download package (zip)](../_packages/AMS16.zip) |
| Earliest dated evidence | [2013\|46](Year-2013.md) — dated folder |
| Evidence | in "WBS PRODUCTS 2013 - documents-export-2013-03-08" |
| Confidence | low (named by) |
| All years found | [2013\|46](Year-2013.md), [2014\|47](Year-2014.md), [2021\|54](Year-2021.md) |
| Variants | [AMS16-2A](AMS16-2A.md), [AMS16-2AE](AMS16-2AE.md), [AMS16-2AM](AMS16-2AM.md) |
| Folder | [Products/METERING/AMS16](../Products/METERING/AMS16/) |

## Front panel

<svg class="wbs-panel solo" data-m="AMS16" data-n="" data-cat="METERING" role="img" aria-label="AMS16 front panel"></svg>

<a id="software"></a>

## Software

_What runs on the AMS16: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| AMS16A | Microcontroller |  | HS | **V2002** | 2009-06-15 | Standard Products |
| AMS16A-1 | Microcontroller |  | HS | **V1000** | 2007-11-15 | Standard Products |
| AMS16A PRODUCT REVISIONS | AMS16A-2 (FRONT) firmware |  |  | **V040002** (in 06AV0002) | 2015-07-09 | AMS16 |
| AMS16A PRODUCT REVISIONS | AMS16A-3 (MAIN) firmware |  |  | **V070000** (in 06AV0002) | 2015-07-09 | AMS16 |
| AMS16A PRODUCT REVISIONS | SHARC firmware |  |  | **V070000** (in 06AV0002) | 2015-07-09 | AMS16 |
| AMS16A PRODUCT REVISIONS | ALTERA firmware |  |  | **V070001** (in 06AV0002) | 2015-07-09 | AMS16 |
| AMS16A PRODUCT REVISIONS | AMS16-9 (ATMEL) firmware |  |  | **N/A** (in 06AV0002) | 2015-07-09 | AMS16 |
| AMS16A PRODUCT REVISIONS | AMS16-9 (ALTERA) firmware |  |  | **V030000** (in 06AV0002) | 2015-07-09 | AMS16 |
| AMS16A-1 PRODUCT REVISIONS | AMS16A-2 (FRONT) firmware |  |  | **V100** (in V1000) | 2008-03-31 | AMS16 |
| AMS16A-1 PRODUCT REVISIONS | AMS16A-3 (MAIN) firmware |  |  | **V100** (in V1000) | 2008-03-31 | AMS16 |
| AMS16A-1 PRODUCT REVISIONS | SHARC firmware |  |  | **V100** (in V1000) | 2008-03-31 | AMS16 |
| AMS16A-1 PRODUCT REVISIONS | ALTERA firmware |  |  | **AMS16V100** (in V1000) | 2008-03-31 | AMS16 |

**Product firmware versions (PFV)**: AMS16A PRODUCT REVISIONS: 17 revisions, latest released **06AV0002** (2015-07-09) · AMS16A-1 PRODUCT REVISIONS: 1 revisions, latest released **V1000** (2008-03-31)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### Listed versions

| Year | Date | Listed as | Chip | Released | Not released / work copy | Tested |
|---|---|---|---|---|---|---|
| 2007\|40 | 2007-11-15 | AMS16A-1 |  | V1000 |  |  |
| 2009\|42 | 2009-06-15 | AMS16A |  | V2002 |  |  |

### AMS16A PRODUCT REVISIONS

_Sheet **AMS16**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS16A-2 (FRONT) | AMS16A-3 (MAIN) | SHARC | ALTERA | AMS16-9 (ATMEL) | AMS16-9 (ALTERA) | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|---|---|
| 2007\|40 | 2007-11-15 | **V1000** | V100 | V100 | V100 | V100 | N/A | N/A | released |  |
| 2008\|41 | 2008-02-07 | **V1001** | V101 | V101 | V100 | V100 | N/A | N/A | released |  |
| 2008\|41 | 2008-08-21 | **V1002** | V102 | V102 | V101 | V100 | N/A | N/A | released |  |
| 2008\|41 | 2008-10-29 | **V1003** | v103 | V102 | V101 | V101 | N/A | N/A | released |  |
| 2008\|41 | 2008-12-08 | **V1004** | v104 | V103 | V101 | V101 | N/A | N/A | released |  |
| 2008\|41 | 2008-12-20 | **V1005** | V105 | V104 | v103 | v103 | N/A | N/A | released |  |
| 2009\|42 | 2009-01-19 | **V1006** | V106 | v105 | v104 | v103 | N/A | N/A | released |  |
| 2009\|42 | 2009-03-09 | **V1007** | V107 | v105 | v104 | v103 | N/A | N/A | released |  |
| 2009\|42 | 2009-01-22 | **V2000** | V200 | V200 | V200 | V103 | V100 | V100 | released |  |
|  | — | **V2001** | V201 | V201 | V201 | V103 | V100 | V100 | released |  |
| 2009\|42 | 2009-06-15 | **V2002** | V202 | V201 | V201 | V103 | V100 | V100 | released |  |
|  | — | **v2003** | v203 | V201 | V201 | v104 | V100 | V100 |  |  |
| 2011\|44 | 2011-01-17 | **V2004** | v204 | v201 | v201 | v104 | v100 | v100 | released |  |
| 2012\|45 | 2012-01-16 | **v5000** | v400 | v600 | v201 | v600 | N/A | v100 | released |  |
| 2012\|45 | 2012-10-30 | **06AV0000** | V040000 | V070000 | V070000 | V070000 | N/A | V030000 | released |  |
| 2014\|47 | 2014-08-20 | **06AV0001** | V040001 | V070000 | V070000 | V070001 | N/A | V030000 | released |  |
| 2015\|48 | 2015-07-09 | **06AV0002** | V040002 | V070000 | V070000 | V070001 | N/A | V030000 | released |  |

> DO NOT USE THE WORKING FILES - USE THE FILE IN THE SPECIFIC FOLDER

### AMS16A-1 PRODUCT REVISIONS

_Sheet **AMS16**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | AMS16A-2 (FRONT) | AMS16A-3 (MAIN) | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|---|
| 2008\|41 | 2008-03-31 | **V1000** | V100 | V100 | V100 | AMS16V100 | released |  |

> DO NOT USE THE WORKING FILES - USE THE FILE IN THE SOFTWARE 1RU FOLDER

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **V1000** — 2007|40 · 2007-11-15 — _AMS16A PRODUCT REVISIONS_: NONE IN THE FIELD
- **V1001** — 2008|41 · 2008-02-07 — _AMS16A PRODUCT REVISIONS_: 5 AT CTV (NO L,R BUTTONS)
- **V1002** — 2008|41 · 2008-08-21 — _AMS16A PRODUCT REVISIONS_: ADDED A LEFT ONLY, RIGHT ONLY AND A SUMMING MODE FOR DOWNMIXING CONTROL. IN THE ALTERA A MUTE PIN (ALTERA9) WAS ADDED (2 AT CTV)
- **V1003** — 2008|41 · 2008-10-29 — _AMS16A PRODUCT REVISIONS_: FIXED ISSUE WITH EEPROM READING AND WRITING
- **V1004** — 2008|41 · 2008-12-08 — _AMS16A PRODUCT REVISIONS_: FIXED COMMUNICATION BUG
- **V1005** — 2008|41 · 2008-12-20 — _AMS16A PRODUCT REVISIONS_: ASSIGNED FIRST AES PAIR FOR DOWNMIXING AS AES2 NOT AES1
- **V1006** — 2009|42 · 2009-01-19 — _AMS16A PRODUCT REVISIONS_: FIXED BUG WITH MULTI MODE MUTING A8 WHEN DOLBY IS ON A1. ALSO, DEMUX MODE AND SUMMING A8 IS ALWAYS IN8.
- **V2000** — 2009|42 · 2009-01-22 — _AMS16A PRODUCT REVISIONS_: ALLOWS FOR SOLOING IN 5.1 MODE (ANALOG AND AES OUTPUTS). AES8 CAN IN8 OR DOWNMIX (USED FOR SOLOING)
- **V2002** — 2009|42 · 2009-06-15 — _AMS16A PRODUCT REVISIONS_: FIXED BUG WITH LEFT AND RIGHT SOLOING IN MULTI MODE WHEN MULTI IS SET FOR >1.
- **V2004** — 2011|44 · 2011-01-17 — _AMS16A PRODUCT REVISIONS_
    - Atmel changed to fix the bug with bad values stored in eeprom for dialnorm.
    - The faulty unit came back from Systems Group, #Serial = 79409
- **v5000** — 2012|45 · 2012-01-16 — _AMS16A PRODUCT REVISIONS_: Prototype Version - NOT RELEASED
- **06AV0000** — 2012|45 · 2012-10-30 — _AMS16A PRODUCT REVISIONS_: Sharc only up issued to match the new version format. AMS16-9 Altera only up issued to match the new vesion format
- **06AV0001** — 2014|47 · 2014-08-20 — _AMS16A PRODUCT REVISIONS_: FPGA updated to fix the CRC errors in 3G format. Front atmel upissued
- **06AV0002** — 2015|48 · 2015-07-09 — _AMS16A PRODUCT REVISIONS_: Front panel Atmel display initialization updated. Now compatible with PDSP1884 & HDSP2533
- **V2001** — released — _AMS16A PRODUCT REVISIONS_: ALLOWS FOR USER CONFIGURABLE MULTI MIX SETUP. FIXED BUG WITH SOLOING FROM SUMMING MODE APPEARING IN DEMUX MODE.
- **v2003** — undated — _AMS16A PRODUCT REVISIONS_
    - ams16a-3 altera: changed to shut off sdi loop through driver upon loss of lock.
    - Ams16a-2 changed to display v2.0.0.3

_No change note in the listing for: V1007, V1000._

## Photos & scans (2)

| Year | File |  |
|---|---|---|
| 2014 | [2014 - AMS16 - Information Sheet.jpg](../Products/METERING/AMS16/2014%20-%20AMS16%20-%20Information%20Sheet.jpg) | [note](../Products/METERING/AMS16/2014%20-%20AMS16%20-%20Information%20Sheet.jpg.md) |
| 2014 | [2014 - AMS16 - Series Front.jpg](../Products/METERING/AMS16/2014%20-%20AMS16%20-%20Series%20Front.jpg) | [note](../Products/METERING/AMS16/2014%20-%20AMS16%20-%20Series%20Front.jpg.md) |

## Footnotes

1. **AMS16:** Artwork 2026|59: the front and rear are drawn from AMS16A2-M1-FRONT-SILK (CURVE).cdr (OCT.27/15) and AMS16AQ-3G-M2-SILK (curve).cdr. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16A2-M1-FRONT-SILK (CURVE).cdr`
2. **AMS16:** The rear ‘curve’ .cdr (Oct 23 2012) still has its 22 legends as live text. It is older than the PDF beside it (Aug 7 2015), which adds MADE IN CANADA and sets AMS-16A larger in bold italic. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16AQ-3G-M2-SILK (curve).pdf`
3. **AMS16:** AMS16AQ-3G-M2-SILK_final curve.cdr in Engineering/SILK is a byte-identical copy of the ARTWORK file. — `AMS16 - #Master/AMS16 - #Engineering/SILK/AMS16AQ-3G-M2-SILK_final curve.cdr`
4. **AMS16:** AMS16A2-M2-SILK.cdr and AMS16A2-M6-SILK.cdr are the same 47 610-byte file under two part numbers. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16A2-M6-SILK.cdr`
5. **AMS16:** The front drill crosshairs on SOLO L/R, VOLUME and INPUT 1/2 are drawn on the mechanical layer, so they sit under the knobs and buttons. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16A2-M1-FRONT-SILK (CURVE).cdr`
6. **AMS16:** AUX 1 and the DOLBY E METADATA D-sub are legended on the rear but not simulated. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16AQ-3G-M2-SILK (curve).cdr`
7. **RD23AMS163GSDIUpgrade:** The rear sheet is dated 23 Oct 2012, the day before the v700 release, and still reads AMS-16A: the 3G upgrade changed no hole or legend. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16AQ-3G-M2-SILK (curve).cdr`
8. **RD23AMS163GSDIUpgrade:** The same rear sheet is stored three times, byte-identical (ARTWORK “(curve)”, Engineering/SILK and AMS16A - #SILK “_final curve”). — `AMS16 - #Master/AMS16 - #Engineering/SILK/AMS16AQ-3G-M2-SILK_final curve.cdr`
9. **RD23AMS163GSDIUpgrade:** The sheet's assembled view uses live Arial text; only its WHITE plate is in curves. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16AQ-3G-M2-SILK (curve).cdr`
10. **RD23AMS163GSDIUpgrade:** SDI IN1/IN2/OUT1/OUT2 are D-shaped holes with flats; the eight AES outputs and two MONITOR outputs are round Ø0.485″ BNC holes. — `AMS16 - #Master/AMS16 - #ARTWORK #DA #2016/AMS16AQ-3G-M2-SILK (curve).cdr`
11. **RD23AMS163GSDIUpgrade:** The RD23 folder holds a 2008 front sheet (AMS16A2-SILK-FINALcurve.cdr); the newest front is AMS16A2-M1-FRONT-SILK (CURVE).cdr, dated OCT.27/15. RD23 did not change the front. — `ENGINEERING - 2016 RD FILES/RD23AMS163GSDIUpgrade/Adam/AMS16/SILK/AMS16A2-SILK-FINALcurve.cdr`
