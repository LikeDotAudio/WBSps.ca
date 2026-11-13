---
type: "product"
code: "PPM-Driver-14-060-RD81"
title: "discrete PPM meter driver"
category: "Monitors, meters & tools"
year: 2015
tags: ["product", "simulation", "monitors-meters-tools"]
made_by: "sim_pages"
---

# PPM Driver 14-060 (RD81) — discrete PPM meter driver

**▶ [Open the PPM Driver 14-060 (RD81) simulation](../siumulation.html?plugin=ppm-driver)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Monitors, meters & tools |
| Year | [2015\|48](Year-2015.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=ppm-driver#sim) · [Tutorial: setting up](../siumulation.html?plugin=ppm-driver#tutorial) · [One second & ballistics](../siumulation.html?plugin=ppm-driver#second) · [Block diagram](../siumulation.html?plugin=ppm-driver#block) · [Schematics](../siumulation.html?plugin=ppm-driver#schematic) · [Signal path](../siumulation.html?plugin=ppm-driver#software) · [Findings](../siumulation.html?plugin=ppm-driver#findings) |
| Archive folder | `#PPM #SERIES` |

## What it is

Analog board that turns a balanced line into Sifam PPM ballistics: difference amp, precision full-wave rectifier, a six-transistor dB-linear shaper and a 1 ms / 2.2 s peak detector driving a 1 mA movement. Issue 5 (RD81) is the 2015|48 surface-mount redesign.

## In the simulation

- Real board artwork with clickable CAL / THLD / SET trimmers
- Attack and release derived from R51, R54 and C4
- IEC burst and fall tests on a simulated bench
- Log law from the ladder resistor values
- Four needle movements fitted to the Sifam chart

This page was made from the device simulation because the archive database has no device page for PPM Driver 14-060 (RD81). See the [simulation index](../siumulation-index.html) for every simulated product.
