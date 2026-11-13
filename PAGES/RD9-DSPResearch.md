---
type: "product"
code: "RD9-DSPResearch"
title: "SHARC cycle-budget workbench"
category: "R&D register"
year: 2011
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD9 DSP Research — SHARC cycle-budget workbench

**▶ [Open the RD9 DSP Research simulation](../siumulation.html?plugin=rd9-dspresearch)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2011\|44](Year-2011.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd9-dspresearch#sim) · [Tutorial: budgeting](../siumulation.html?plugin=rd9-dspresearch#tutorial) · [One second, sample by sample](../siumulation.html?plugin=rd9-dspresearch#second) · [Block diagram](../siumulation.html?plugin=rd9-dspresearch#block) · [Schematics](../siumulation.html?plugin=rd9-dspresearch#schematic) · [Software](../siumulation.html?plugin=rd9-dspresearch#software) · [Findings](../siumulation.html?plugin=rd9-dspresearch#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD9-DSPResearch` |

## What it is

The Analog Devices DSP library behind every WBS meter. The model turns its numbers (dispatcher overheads, biquad and FIR cycle counts, clock rates, memory) into a live per-sample cycle budget on a redrawn ADSP-21065L EZ-KIT Lite, with the SLM-1, AMS8-2 and M6205 workloads as presets.

## In the simulation

- Per-sample cycle budget with ISR breakdown
- Normal / fast / super interrupt dispatchers
- 21065L vs 21262 (SIMD) on real WBS workloads
- A real cascaded biquad running on the timeline
- EZ-KIT Lite board with FLAG buttons, IRQs and LEDs

This page was made from the device simulation because the archive database has no device page for RD9 DSP Research. See the [simulation index](../siumulation-index.html) for every simulated product.
