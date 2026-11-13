---
type: "product"
code: "QubeAmp-class-D-amplifier"
title: "class-D amplifier PCBA, UNI-AMP-ISS3"
category: "Monitors, meters & tools"
year: 2015
tags: ["product", "simulation", "monitors-meters-tools"]
made_by: "sim_pages"
---

# QubeAmp — class-D amplifier PCBA, UNI-AMP-ISS3

**▶ [Open the QubeAmp simulation](../siumulation.html?plugin=qubeamp)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Monitors, meters & tools |
| Year | [2015\|48](Year-2015.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator (bench)](../siumulation.html?plugin=qubeamp#sim) · [Tutorial](../siumulation.html?plugin=qubeamp#tutorial) · [One second, frame by frame](../siumulation.html?plugin=qubeamp#second) · [Block diagram](../siumulation.html?plugin=qubeamp#block) · [Schematics](../siumulation.html?plugin=qubeamp#schematic) · [Signal path & BOMs](../siumulation.html?plugin=qubeamp#software) · [Findings](../siumulation.html?plugin=qubeamp#findings) |
| Archive folder | `#QUBE #SERIES` |

## What it is

The QubeAmp is a “Universal Amplifier Board” with an AES receiver and DAC (CS8416, PCM5100A), an NE5532 mixer and a TPA3124D2 class-D stage. The same PCB is built two ways: bridged mono for the QUBE speaker, or stereo single-ended for the AMS2. The model follows the signal from AES frame to PWM to speaker for either build.

## In the simulation

- Board drawn from the ISS3 Gerbers, parts placed from the centroid file
- QUBE bridged vs AMS2 stereo, from the two BOMs
- Gain straps that match the AP test
- The removed DAC divider
- BOM vs supplier quotes

This page was made from the device simulation because the archive database has no device page for QubeAmp. See the [simulation index](../siumulation-index.html) for every simulated product.
