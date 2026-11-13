---
type: "software"
code: "RLM12"
title: "RLM12 software"
tags: ["software"]
---

# RLM12

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as | RLM12 CTL PRODUCT REVISIONS; RLM12 PRODUCT REVISIONS |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the RLM12: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| RLM12 PRODUCT REVISIONS | RLM24 (MAIN) firmware |  |  | **RLM24V100** (in V1000) | 2006-09-20 | RLM SERIES |
| RLM12 PRODUCT REVISIONS | SHARC firmware |  |  | **V100** (in V1000) | 2006-09-20 | RLM SERIES |
| RLM12 PRODUCT REVISIONS | ALTERA firmware |  |  | **V100** (in V1000) | 2006-09-20 | RLM SERIES |
| RLM12 CTL PRODUCT REVISIONS | POD23A (FRONT) firmware |  |  | **RLM12V100** (in V1000) | not released | RLM SERIES |
| RLM12 CTL PRODUCT REVISIONS | AMS4E-1 (MAIN) firmware |  |  | **V101** (in V1000) | not released | RLM SERIES |

**Product firmware versions (PFV)**: RLM12 PRODUCT REVISIONS: 2 revisions, latest released **V1000** (2006-09-20) · RLM12 CTL PRODUCT REVISIONS: 1 revisions, latest released **V1000**

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### RLM12 PRODUCT REVISIONS

_Sheet **RLM SERIES**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | RLM24 (MAIN) | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2006\|39 | 2006-09-20 | **V1000** | RLM24V100 | V100 | V100 | released |  |
|  | — | **V1001** | RLM12V101 | V100 | V100 | not released |  |

> DO NOT USE THE WORKING FILES

### RLM12 CTL PRODUCT REVISIONS

_Sheet **RLM SERIES**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | POD23A (FRONT) | AMS4E-1 (MAIN) | Status | Tested / PCB |
|---|---|---|---|---|---|---|
|  | — | **V1000** | RLM12V100 | V101 | not released |  |

> DO NOT USE THE WORKING FILES

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **V1001** — not released — _RLM12 PRODUCT REVISIONS_: ADDED COMMUNICATION WITH RLM12 CTL UNIT

_No change note in the listing for: V1000._
