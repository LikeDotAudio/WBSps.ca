---
type: "product"
code: "RD13-TimingAnalysis"
title: "TimeQuest/SDC lab and the products it constrained"
category: "R&D register"
year: 2010
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD13 Timing Analysis — TimeQuest/SDC lab and the products it constrained

**▶ [Open the RD13 Timing Analysis simulation](../siumulation.html?plugin=rd13-timinganalysis)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2010\|43](Year-2010.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd13-timinganalysis#sim) · [Tutorial: the timing lab](../siumulation.html?plugin=rd13-timinganalysis#tutorial) · [One second, cycle by cycle](../siumulation.html?plugin=rd13-timinganalysis#second) · [Block diagram](../siumulation.html?plugin=rd13-timinganalysis#block) · [Schematics](../siumulation.html?plugin=rd13-timinganalysis#schematic) · [Software](../siumulation.html?plugin=rd13-timinganalysis#software) · [Findings](../siumulation.html?plugin=rd13-timinganalysis#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD13-TimingAnalysis` |

## What it is

Peter’s September 2010 TimeQuest course, run on its real lab files. Toggle each line of his top.sdc, compare it with Altera’s solution, and watch clocks, slack and clock domains change on the PLL-driven time-multiplexed multiplier. The same commands are then traced into the POD32, M6205, AMS16 and AMS81 SDC files.

## In the simulation

- Static timing engine: edges, multicycle setup/hold, false paths, corners
- Peter’s top.sdc vs Altera’s solution, ignored constraints included
- −1.923 ns y_regtwo violation and the −38.51° clk_out centring reproduced
- Pin Planner from top.qsf with per-ball output slack
- Clock trees of pod32.sdc and five later product SDC files

This page was made from the device simulation because the archive database has no device page for RD13 Timing Analysis. See the [simulation index](../siumulation-index.html) for every simulated product.
