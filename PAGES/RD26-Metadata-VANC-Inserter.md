---
type: "product"
code: "RD26-Metadata-VANC-Inserter"
title: "SMPTE 2020 / RDD 6 study"
category: "R&D register"
year: 2011
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD26 Metadata VANC Inserter — SMPTE 2020 / RDD 6 study

**▶ [Open the RD26 Metadata VANC Inserter simulation](../siumulation.html?plugin=rd26-metadata-vanc-inserter)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2011\|44](Year-2011.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd26-metadata-vanc-inserter#sim) · [Tutorial: the RD26 study](../siumulation.html?plugin=rd26-metadata-vanc-inserter#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd26-metadata-vanc-inserter#second) · [Block diagram](../siumulation.html?plugin=rd26-metadata-vanc-inserter#block) · [Schematics](../siumulation.html?plugin=rd26-metadata-vanc-inserter#schematic) · [Software](../siumulation.html?plugin=rd26-metadata-vanc-inserter#software) · [Findings](../siumulation.html?plugin=rd26-metadata-vanc-inserter#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD26-Metadata VANC Inserter` |

## What it is

R&D study (Peter/Ali, never built) into carrying Dolby audio metadata in SDI vertical ancillary data. The model builds bit-exact RDD 6 frames, packs them into SMPTE 2020 packets on a legal VANC line, and shows what the WBS M6205C200 card would read back.

## In the simulation

- Bit-exact RDD 6 subframes, segments and checksums
- VANC line placement and switching-line rule
- Method A vs B packet cadence, 1080i/720p/SD
- M6205C200 parser readback, including its missing checksum test
- Serial 115 200 baud timing against video lines

This page was made from the device simulation because the archive database has no device page for RD26 Metadata VANC Inserter. See the [simulation index](../siumulation-index.html) for every simulated product.
