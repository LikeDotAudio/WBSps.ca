---
type: "software"
code: "MicroDemux"
title: "MicroDemux software"
tags: ["software"]
---

# MicroDemux

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as |  |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the MicroDemux: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| DEMUX-4 FOR MicroDemux UNITS (DEMUX-4) | ATMEL firmware |  |  | **V020401** (in 02AV0401) | 2015-07-09 | DEMUX-4 |
| DEMUX-4 FOR MicroDemux UNITS (DEMUX-4) | XILINX firmware |  |  | **V020100** (in 02AV0401) | 2015-07-09 | DEMUX-4 |

**Also:** [DEMUX-4 FOR MicroDemux UNITS](DEMUX-4.md#software)

## Versions

### DEMUX-4 FOR MicroDemux UNITS

_From the [DEMUX-4](DEMUX-4.md#software) sheet: the build used in the MicroDemux._

| Year | Date | Revision | ATMEL | XILINX | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2014\|47 | 2014-04-30 | **02AV0400** | V020400 | V020000 | released | Flash M25P16; PCB issue 2 |
| 2015\|48 | 2015-07-09 | **02AV0401** | V020401 | V020100 | released | WKW 2015-07-09; Flash M25P16; PCB issue 2 |

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **02AV0400** — 2014|47 · 2014-04-30 — _DEMUX-4 FOR MicroDemux UNITS_: NOT TESTED YET
- **02AV0401** — 2015|48 · 2015-07-09 — _DEMUX-4 FOR MicroDemux UNITS_: atmel changed to give individual control on each AES output. FPGA changed to silent the outputs when there is no lock
