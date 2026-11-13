---
type: "product"
code: "M8246-R2K-CONSOLE-PSU"
title: "R2K console power supply"
category: "Obsolete products"
year: 1999
tags: ["product", "simulation", "obsolete-products"]
made_by: "sim_pages"
---

# M8246 - R2K CONSOLE PSU — R2K console power supply

**▶ [Open the M8246 - R2K CONSOLE PSU simulation](../siumulation.html?plugin=m8246-r2k-console-psu)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Obsolete products |
| Year | [1999\|32](Year-1999.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=m8246-r2k-console-psu#sim) · [Tutorial: powering the R2K](../siumulation.html?plugin=m8246-r2k-console-psu#tutorial) · [One second, slow motion](../siumulation.html?plugin=m8246-r2k-console-psu#second) · [Block diagram](../siumulation.html?plugin=m8246-r2k-console-psu#block) · [Schematics](../siumulation.html?plugin=m8246-r2k-console-psu#schematic) · [Power path](../siumulation.html?plugin=m8246-r2k-console-psu#software) · [Findings](../siumulation.html?plugin=m8246-r2k-console-psu#findings) |
| Archive folder | `#CONSOLES - #OBSOLETE #Archive/XXX - M8246 - R2K CONSOLE PSU #Master #OBSOLETE` |

## What it is

The plug-in power supply for the R2K radio console: a 4.98 × 2.2 in black-fronted aluminium box that slides into the MF251/MF250 power frame. One is essential and two give redundancy, sharing the ±21 V bus through diodes. Inside is an M8245-type ±22 V switch-mode card (inferred).

## In the simulation

- Front, top and bottom drawn to scale from M8246M1/M2/M3
- R2K/12, /20, /28 load estimates
- Diode-OR sharing and a unit failure in slow motion
- +VD derived through R250SA1
- Mechanics-only folder: what the box contained

This page was made from the device simulation because the archive database has no device page for M8246 - R2K CONSOLE PSU. See the [simulation index](../siumulation-index.html) for every simulated product.
