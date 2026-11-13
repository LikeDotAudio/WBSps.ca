---
type: "product"
code: "RD74-T6301UpgradeTo3G-SDI"
title: "rear-module cable-reach test"
category: "R&D register"
year: 2013
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD74 T6301 → 3G — rear-module cable-reach test

**▶ [Open the RD74 T6301 → 3G simulation](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2013\|46](Year-2013.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#sim) · [Tutorial: the cable test](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#tutorial) · [One second, in and out](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#second) · [Block diagram](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#block) · [Schematics](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#schematic) · [Signal path](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#software) · [Findings](../siumulation.html?plugin=rd74-t6301upgradeto3g-sdi#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD74-T6301UpgradeTo3G-SDI` |

## What it is

June 2013: an M6203A on a T6301 rear reached only 66 m of 3G-SDI cable, because the T6301’s BNC is rated to 1 GHz. The model rebuilds that bench, calibrated to the M6203A test reports (75 m on a Ross 3G rear), so you can swap rear modules, formats and cable and watch the card lock or mute.

## In the simulation

- T6301 rear to scale, BNCs clickable
- Cable reach calibrated to the 2011–2013 test reports
- M6203A lock filter, rate LEDs and mute from the V101 source
- 3G vs HD: why only 3G suffers
- Rise-time and output-reach data alongside

This page was made from the device simulation because the archive database has no device page for RD74 T6301 → 3G. See the [simulation index](../siumulation-index.html) for every simulated product.
