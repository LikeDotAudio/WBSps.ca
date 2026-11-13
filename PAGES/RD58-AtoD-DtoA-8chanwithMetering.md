---
type: "product"
code: "RD58-AtoD-DtoA-8chanwithMetering"
title: "POD-size converter study"
category: "R&D register"
year: 2012
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD58 8+8 converter POD — POD-size converter study

**▶ [Open the RD58 8+8 converter POD simulation](../siumulation.html?plugin=rd58-adda-8ch-metering)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2012\|45](Year-2012.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd58-adda-8ch-metering#sim) · [Tutorial: sizing the POD](../siumulation.html?plugin=rd58-adda-8ch-metering#tutorial) · [One second inside](../siumulation.html?plugin=rd58-adda-8ch-metering#second) · [Block diagram](../siumulation.html?plugin=rd58-adda-8ch-metering#block) · [Schematics](../siumulation.html?plugin=rd58-adda-8ch-metering#schematic) · [Signal path](../siumulation.html?plugin=rd58-adda-8ch-metering#software) · [Findings](../siumulation.html?plugin=rd58-adda-8ch-metering#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD58-AtoD-DtoA-8chanwithMetering` |

## What it is

A December 2012 idea: one ½ RU POD with 8 channels of A/D, 8 of D/A and 16 meters, built on the AMS8E-1 main board and AMS8 meter boards. The model sizes the front and rear to scale, runs the levels through the house −20 dBFS = +4 dBu alignment, and shows the meters with the real VU ballistics.

## In the simulation

- Front to scale with two live AMS8E-4 meter boards
- Rear-panel connector budget: ½ RU vs 1 RU, XLR vs DB25, external PSU
- dBu ↔ dBFS level chain with clipping
- vumeter.asm VU time constant in slow motion
- Shows which half of the hardware already existed

This page was made from the device simulation because the archive database has no device page for RD58 8+8 converter POD. See the [simulation index](../siumulation-index.html) for every simulated product.
