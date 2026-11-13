---
type: "product"
code: "RD22-MADI"
title: "AES10 input for the 32ME monitor"
category: "R&D register"
year: 2012
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD22 MADI — AES10 input for the 32ME monitor

**▶ [Open the RD22 MADI simulation](../siumulation.html?plugin=rd22-madi)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2012\|45](Year-2012.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd22-madi#sim) · [Tutorial: the RD22 bench](../siumulation.html?plugin=rd22-madi#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd22-madi#second) · [Block diagram](../siumulation.html?plugin=rd22-madi#block) · [Schematics](../siumulation.html?plugin=rd22-madi#schematic) · [Software](../siumulation.html?plugin=rd22-madi#software) · [Findings](../siumulation.html?plugin=rd22-madi#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD22-MADI` |

## What it is

The R&D project that brought MADI (AES10, 64 channels on one coax) into the AMS8x monitor platform and became the 32ME. A DirectOut i64 module decodes the 125 Mbit/s link; a Cyclone IV unpacks SMUX1/2/4 into I2S for the SHARC meters and reports dead channels to the ATmega128 over SPI.

## In the simulation

- MADI down to 4B/5B symbols, JK syncs and NRZI cells
- smux_to_i2s.v and spicontrol.v run cycle by cycle
- Real Feb 2013 32ME panel artwork
- ERR-LED flicker traced to a 5-bit counter compare
- FPGA part history EP1C6 → EP4CE40 → EP4CE30

This page was made from the device simulation because the archive database has no device page for RD22 MADI. See the [simulation index](../siumulation-index.html) for every simulated product.
