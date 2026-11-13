---
type: "product"
code: "RD18-PCBDesigner"
title: "termination and stack-up study"
category: "R&D register"
year: 2012
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD18 PCB Designer — termination and stack-up study

**▶ [Open the RD18 PCB Designer simulation](../siumulation.html?plugin=rd18-pcbdesigner)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2012\|45](Year-2012.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd18-pcbdesigner#sim) · [Tutorial: the termination study](../siumulation.html?plugin=rd18-pcbdesigner#tutorial) · [One second, edge by edge](../siumulation.html?plugin=rd18-pcbdesigner#second) · [Block diagram](../siumulation.html?plugin=rd18-pcbdesigner#block) · [Schematics](../siumulation.html?plugin=rd18-pcbdesigner#schematic) · [Software](../siumulation.html?plugin=rd18-pcbdesigner#software) · [Findings](../siumulation.html?plugin=rd18-pcbdesigner#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD18-PCBDesigner` |

## What it is

Peter’s 2011–2012 PCB and signal-integrity self-study, run as a working bench: a clock line with selectable termination solved in the time domain, his AC-termination rule checked live, a stack-up per his layer notes, and the ground-loop hum he wrote about.

## In the simulation

- Time-domain transmission-line solver, five terminations
- RC > 2·Td rule from TerminationNotes.txt
- Bounce (lattice) diagram
- Stack-up and microstrip impedance
- Altium vs HyperLynx findings

This page was made from the device simulation because the archive database has no device page for RD18 PCB Designer. See the [simulation index](../siumulation-index.html) for every simulated product.
