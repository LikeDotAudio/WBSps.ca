---
type: "software"
code: "RLM24"
title: "RLM24 software"
tags: ["software"]
---

# RLM24

|  |  |
|---|---|
| Type | device known from the software listings |
| Listed as | RLM24 CTL PRODUCT REVISIONS; RLM24 PRODUCT REVISIONS |
| Find | [Everything finder](../everything.html) — no other files are filed under this code yet |
| All software | [Software](Software.md) |

<a id="software"></a>

## Software

_What runs on the RLM24: every programmable part and the version Ward-Beck released for it, from the [engineering software listings](Software.md) (the FULL HISTORY workbook, kept to 2018|51)._

| Part / board | What | Chip | Clock | Current version | Date | Sheet |
|---|---|---|---|---|---|---|
| RLM24 PRODUCT REVISIONS | RLM24 (MAIN) firmware |  |  | **V101** (in V1001) | 2005-04-06 | RLM SERIES |
| RLM24 PRODUCT REVISIONS | SHARC firmware |  |  | **V100** (in V1001) | 2005-04-06 | RLM SERIES |
| RLM24 PRODUCT REVISIONS | ALTERA firmware |  |  | **V100** (in V1001) | 2005-04-06 | RLM SERIES |
| RLM24 CTL PRODUCT REVISIONS | POD23A (FRONT) firmware |  |  | **RLM24V102** (in V1000) | 2005-04-05 | RLM SERIES |
| RLM24 CTL PRODUCT REVISIONS | AMS4E-1 (MAIN) firmware |  |  | **V101** (in V1000) | 2005-04-05 | RLM SERIES |

**Product firmware versions (PFV)**: RLM24 PRODUCT REVISIONS: 2 revisions, latest released **V1001** (2005-04-06) · RLM24 CTL PRODUCT REVISIONS: 2 revisions, latest released **V1000** (2005-04-05)

**Programming:** Products with the EPC1S configuration device are programmed with Quartus on the lab computer (Tools → Programmer, "Active Serial Programming" instead of JTAG, a .POF file). Boot EEPROMs are programmed with ChipWin (.LDR files from the debug folder); AT25F512 parts with the VisualDSP++ Flash Programmer (session ADSP-21262, AT25F512 driver).

## Versions

### RLM24 PRODUCT REVISIONS

_Sheet **RLM SERIES**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | RLM24 (MAIN) | SHARC | ALTERA | Status | Tested / PCB |
|---|---|---|---|---|---|---|---|
| 2005\|38 | 2005-03-24 | **V1000** | V100 | V100 | V100 | released |  |
| 2005\|38 | 2005-04-06 | **V1001** | V101 | V100 | V100 | released |  |

> DO NOT USE THE WORKING FILES

### RLM24 CTL PRODUCT REVISIONS

_Sheet **RLM SERIES**: one row per product firmware version, with the firmware of each board in it._

| Year | Date | Revision | POD23A (FRONT) | AMS4E-1 (MAIN) | Status | Tested / PCB |
|---|---|---|---|---|---|---|
| 2005\|38 | 2005-04-05 | **V1000** | RLM24V102 | V101 | released |  |
|  | — | **V1001** | RLM24V103 | V101 | not released |  |

> DO NOT USE THE WORKING FILES

## Changes in each version

_What changed, in the words of the listing, oldest first._

- **V1001** — not released — _RLM24 CTL PRODUCT REVISIONS_: REMOVED THE OPTION FOR ONE SECOND DELAY

_No change note in the listing for: V1000, V1001._
