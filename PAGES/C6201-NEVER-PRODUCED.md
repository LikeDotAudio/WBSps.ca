---
type: "product"
code: "C6201-NEVER-PRODUCED"
title: "openGear frame controller concept"
category: "Obsolete products"
year: 2006
tags: ["product", "simulation", "obsolete-products"]
made_by: "sim_pages"
---

# C6201 - NEVER PRODUCED — openGear frame controller concept

**▶ [Open the C6201 - NEVER PRODUCED simulation](../siumulation.html?plugin=c6201-never-produced)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Obsolete products |
| Year | [2006\|39](Year-2006.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=c6201-never-produced#sim) · [Tutorial](../siumulation.html?plugin=c6201-never-produced#tutorial) · [One second](../siumulation.html?plugin=c6201-never-produced#second) · [Block diagram](../siumulation.html?plugin=c6201-never-produced#block) · [Schematics (redrawn)](../siumulation.html?plugin=c6201-never-produced#schematic) · [Controller logic (no firmware)](../siumulation.html?plugin=c6201-never-produced#software) · [Findings](../siumulation.html?plugin=c6201-never-produced#findings) |
| Archive folder | `#OPENGEAR #SERIES/XXX - C6201 - #Engineering NEVER PRODUCED` |

## What it is

One functional drawing from June 2006 for a card that was never sold: a controller for Ward-Beck's own openGear frame, with CAN to the cards, slot addressing, power-supply and frame 1-Wire monitoring, fan-kit enable and an AES receiver. The model shows the concept at work in the frame and links it to the board that implemented it, the FC6221A.

## In the simulation

- Frame with clickable slots: CAN addressing from the slot resistor ladder
- PSU, fan-kit and reference alarms
- The controller's second: CAN polls, 1-Wire reads, AES reference blocks
- Finding: the concept became the FC6221A “problem” board

This page was made from the device simulation because the archive database has no device page for C6201 - NEVER PRODUCED. See the [simulation index](../siumulation-index.html) for every simulated product.
