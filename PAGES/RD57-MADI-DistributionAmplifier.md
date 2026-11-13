---
type: "product"
code: "RD57-MADI-DistributionAmplifier"
title: "bench test of WBS DAs with MADI"
category: "R&D register"
year: 2012
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD57 MADI DA — bench test of WBS DAs with MADI

**▶ [Open the RD57 MADI DA simulation](../siumulation.html?plugin=rd57-madi-distributionamplifier)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2012\|45](Year-2012.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd57-madi-distributionamplifier#sim) · [Tutorial: repeating the test](../siumulation.html?plugin=rd57-madi-distributionamplifier#tutorial) · [One second of MADI](../siumulation.html?plugin=rd57-madi-distributionamplifier#second) · [Block diagram](../siumulation.html?plugin=rd57-madi-distributionamplifier#block) · [Schematics](../siumulation.html?plugin=rd57-madi-distributionamplifier#schematic) · [Software](../siumulation.html?plugin=rd57-madi-distributionamplifier#software) · [Findings](../siumulation.html?plugin=rd57-madi-distributionamplifier#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD57-MADI_DistributionAmplifier` |

## What it is

In October 2012 a customer asked whether a Ward-Beck DA could distribute MADI; the analog-video, AES and SDI DAs were all tried and none passed. This model re-runs that bench test, shows why each card rejects a 125 Mbaud MADI stream (down to the M6203A firmware that mutes its outputs), and what a real MADI DA needs.

## In the simulation

- RME source → DA → analyser bench with three real WBS cards
- M6203A V101 lock filter and mute traced line by line
- MADI frames, subframes and NRZI symbols in slow motion
- T6301 rear drawn to scale, outputs clickable
- MADI reclocker later drawn on Demux4 Issue 2 (fitted DNI)

This page was made from the device simulation because the archive database has no device page for RD57 MADI DA. See the [simulation index](../siumulation-index.html) for every simulated product.
