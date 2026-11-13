---
type: "product"
code: "Big-VU"
title: "RD87 LED tower"
category: "Monitors, meters & tools"
year: 2015
tags: ["product", "simulation", "monitors-meters-tools"]
made_by: "sim_pages"
---

# Big VU (RD87) — RD87 LED tower

**▶ [Open the Big VU (RD87) simulation](../siumulation.html?plugin=bigvu)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Monitors, meters & tools |
| Year | [2015\|48](Year-2015.md) |
| Depth | Small model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=bigvu#sim) · [Tutorial](../siumulation.html?plugin=bigvu#tutorial) · [Software & blocks](../siumulation.html?plugin=bigvu#software) · [Findings](../siumulation.html?plugin=bigvu#findings) |
| Archive folder | `Big VU - #MASTER` |

## What it is

Free-standing stereo LED level tower: an Arduino (ATmega328P / 32U4) samples line input and drives two 57-pixel WS2812 strips with peak-hold dots and a fixed red reference dot.

## In the simulation

- Live LED towers frame by frame
- Ceiling-pot calibration
- Serial.println bottleneck: about 7 samples per frame

This page was made from the device simulation because the archive database has no device page for Big VU (RD87). See the [simulation index](../siumulation-index.html) for every simulated product.
