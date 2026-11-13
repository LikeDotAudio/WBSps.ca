---
type: "product"
code: "RD10-cycloneIV"
title: "FPGA adoption and power-on model"
category: "R&D register"
year: 2011
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD10 Cyclone IV — FPGA adoption and power-on model

**▶ [Open the RD10 Cyclone IV simulation](../siumulation.html?plugin=rd10-cycloneiv)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2011\|44](Year-2011.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd10-cycloneiv#sim) · [Tutorial: the investigation](../siumulation.html?plugin=rd10-cycloneiv#tutorial) · [One second](../siumulation.html?plugin=rd10-cycloneiv#second) · [Block diagram](../siumulation.html?plugin=rd10-cycloneiv#block) · [Schematics](../siumulation.html?plugin=rd10-cycloneiv#schematic) · [Software](../siumulation.html?plugin=rd10-cycloneiv#software) · [Findings](../siumulation.html?plugin=rd10-cycloneiv#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD10_cycloneIV` |

## What it is

Peter’s 2011 evaluation of the Altera Cyclone IV E: price, logic, pins, configuration flash and clocking, followed into the AMS16-3G, the AMS8E-1 iss5 board (AMS81 family) and the MLC8N. Power the boards up in slow motion: the ATmega128 boot code, the Active Serial read of the M25P16 bit by bit, CONF_DONE, user mode and PLL lock.

## In the simulation

- Price sheet decisions checked live (LEs, cost, flash, IDCODE, pins)
- AS configuration bit by bit: opcode, address, DCLK count
- ATmega boot races timed from the compiled .lis cycle counts
- Real AMS8E-1 iss5 board from Gerbers and the IPC netlist
- FBGA-484 ball map from Altera’s pin tables with each product’s .qsf
- Cycle-by-cycle VHDL of two Cyclone IV entities

This page was made from the device simulation because the archive database has no device page for RD10 Cyclone IV. See the [simulation index](../siumulation-index.html) for every simulated product.
