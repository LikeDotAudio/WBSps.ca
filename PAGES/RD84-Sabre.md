---
type: "product"
code: "RD84-Sabre"
title: "ESS SABRE DAC evaluation"
category: "R&D register"
year: 2015
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD84 Sabre — ESS SABRE DAC evaluation

**▶ [Open the RD84 Sabre simulation](../siumulation.html?plugin=rd84-sabre)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2015\|48](Year-2015.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd84-sabre#sim) · [Tutorial: the evaluation](../siumulation.html?plugin=rd84-sabre#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd84-sabre#second) · [Block diagram](../siumulation.html?plugin=rd84-sabre#block) · [Schematics](../siumulation.html?plugin=rd84-sabre#schematic) · [Registers & control](../siumulation.html?plugin=rd84-sabre#software) · [Findings](../siumulation.html?plugin=rd84-sabre#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD84-Sabre` |

## What it is

An evaluation of ESS SABRE DACs and headphone amplifiers against the converters WBS already used. The model compares dynamic range through each kind of output stage, checks the clocking rules against a CS8416-clocked design, and replays an I²C volume write with the chip’s soft ramp.

## In the simulation

- Seven DACs to scale, with quote prices
- Chain dynamic range: line, headphone, NE5532, class-D speaker
- MCLK rules: I²S, SPDIF and sync mode
- Register 15 volume write and vol_rate ramp in slow motion
- Live ES9018K2M register map

This page was made from the device simulation because the archive database has no device page for RD84 Sabre. See the [simulation index](../siumulation-index.html) for every simulated product.
