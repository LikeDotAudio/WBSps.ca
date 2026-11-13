---
type: "product"
code: "POD15"
title: "1\u00d76 composite video DA, POD15A board (1999|32\u20132009|42)"
category: "Obsolete products"
year: 1999
tags: ["product", "simulation", "obsolete-products"]
made_by: "sim_pages"
---

# POD15 — 1×6 composite video DA, POD15A board (1999|32–2009|42)

**▶ [Open the POD15 simulation](../siumulation.html?plugin=pod15)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Obsolete products |
| Year | [1999\|32](Year-1999.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=pod15#sim) · [Tutorial](../siumulation.html?plugin=pod15#tutorial) · [One second](../siumulation.html?plugin=pod15#second) · [Block diagram](../siumulation.html?plugin=pod15#block) · [Schematics (redrawn)](../siumulation.html?plugin=pod15#schematic) · [Signal path (no firmware)](../siumulation.html?plugin=pod15#software) · [Findings](../siumulation.html?plugin=pod15#findings) |
| Archive folder | `#POD #SERIES/XXX - POD15 - #Master #Obsolete` |

## What it is

Half-rack video distribution amplifier: a bridging looping input, a level trim and seven 75 Ω outputs (six rear, one front monitor). The folder holds the later POD15A issue 1 and issue 3 netlists, so this model runs on the real nets: differential input, GB4571 clamp, two-section EQ, paired drivers and a CD4538 sync one-shot.

## In the simulation

- Real POD15A ISS3 silkscreen with working EQ, 300 m, CLAMP and LEVEL controls
- SYNCH/ERROR from the real CD4538 10 ms one-shot
- Shorted, open and terminated outputs on paired drivers
- Issue 1 vs issue 3 board differences from the netlists
- Four redrawn schematic sheets with real net names

This page was made from the device simulation because the archive database has no device page for POD15. See the [simulation index](../siumulation-index.html) for every simulated product.
