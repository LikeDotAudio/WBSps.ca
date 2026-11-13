---
type: "product"
code: "RD45-DolbyD-AC3"
title: "metadata chunk model"
category: "R&D register"
year: 2012
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD45 Dolby Digital AC-3 — metadata chunk model

**▶ [Open the RD45 Dolby Digital AC-3 simulation](../siumulation.html?plugin=rd45-dolbyd-ac3)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2012\|45](Year-2012.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd45-dolbyd-ac3#sim) · [Tutorial: metadata](../siumulation.html?plugin=rd45-dolbyd-ac3#tutorial) · [One second of AC-3](../siumulation.html?plugin=rd45-dolbyd-ac3#second) · [Block diagram](../siumulation.html?plugin=rd45-dolbyd-ac3#block) · [Schematics](../siumulation.html?plugin=rd45-dolbyd-ac3#schematic) · [Software](../siumulation.html?plugin=rd45-dolbyd-ac3#software) · [Findings](../siumulation.html?plugin=rd45-dolbyd-ac3#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD45-DolbyD_AC3` |

## What it is

The EBU <dbmd> Dolby metadata chunk as a live editor: set channel format, data rate, downmix and dialnorm, and see the bytes, checksums, AC-3 frame timing and what a decoder does with dialnorm.

## In the simulation

- dbmd chunk built byte by byte with checksums
- Dolby E segment with live SMPTE timecode
- dialnorm → decoder level, mismatch shown in dB
- AC-3 sync frames vs video frames on one timeline
- Links to the D6207A and POD31 decoders

This page was made from the device simulation because the archive database has no device page for RD45 Dolby Digital AC-3. See the [simulation index](../siumulation-index.html) for every simulated product.
