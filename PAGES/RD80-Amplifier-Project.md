---
type: "product"
code: "RD80-Amplifier-Project"
title: "QubeAmp class-D bench study"
category: "R&D register"
year: 2014
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD80 Amplifier Project — QubeAmp class-D bench study

**▶ [Open the RD80 Amplifier Project simulation](../siumulation.html?plugin=rd80-amplifier-project)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2014\|47](Year-2014.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator (bench)](../siumulation.html?plugin=rd80-amplifier-project#sim) · [Tutorial: the sweeps](../siumulation.html?plugin=rd80-amplifier-project#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd80-amplifier-project#second) · [Block diagram](../siumulation.html?plugin=rd80-amplifier-project#block) · [Schematics](../siumulation.html?plugin=rd80-amplifier-project#schematic) · [Signal path & measurements](../siumulation.html?plugin=rd80-amplifier-project#software) · [Findings](../siumulation.html?plugin=rd80-amplifier-project#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD80-Amplifier Project` |

## What it is

The R&D behind the QubeAmp board: AES or analog in, PCM5100A DAC, NE5532 mixer and a TPA3124D2 class-D stage, measured single-ended and bridged on an Audio Precision analyser in November 2014. The model replays those 11 sweeps on the real ISS.2 assembly drawing, with driver loudness and 24 V supply sizing.

## In the simulation

- All 11 Final Sweeps as a stage-by-stage model
- SE vs BTL, gain links and clipping
- Class-D PWM at 250 kHz in slow motion
- Driver SPL vs the Fostex 6301N yardstick
- Sixteen 24 V supplies against the power budget

This page was made from the device simulation because the archive database has no device page for RD80 Amplifier Project. See the [simulation index](../siumulation-index.html) for every simulated product.
