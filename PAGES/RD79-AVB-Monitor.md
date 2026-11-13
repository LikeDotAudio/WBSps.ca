---
type: "product"
code: "RD79-AVB-Monitor"
title: "XMOS AVB listener for the AMS8 / MLC8"
category: "R&D register"
year: 2014
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD79-AVB Monitor — XMOS AVB listener for the AMS8 / MLC8

**▶ [Open the RD79-AVB Monitor simulation](../siumulation.html?plugin=rd79-avb-monitor)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2014\|47](Year-2014.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd79-avb-monitor#sim) · [Tutorial: evaluating AVB](../siumulation.html?plugin=rd79-avb-monitor#tutorial) · [One second on the wire](../siumulation.html?plugin=rd79-avb-monitor#second) · [Block diagram](../siumulation.html?plugin=rd79-avb-monitor#block) · [Schematics](../siumulation.html?plugin=rd79-avb-monitor#schematic) · [Software](../siumulation.html?plugin=rd79-avb-monitor#software) · [Findings](../siumulation.html?plugin=rd79-avb-monitor#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD79-AVB Monitor` |

## What it is

R&D listener that brings 8 channels of IEEE 802.1 AVB / 1722 audio into the AMS8 and MLC8 monitors through a DSP4YOU XMOS XS1-L16 dongle, a Cyclone IV FPGA clock crossing and a front panel relabelled “AVB”. The model runs the XMOS reference code (gPTP, 1722 listener, media FIFO, clock recovery) from power-up, packet by packet.

## In the simulation

- 8 kHz class-A packets decoded byte by byte (DBC, tv, AM824)
- gPTP BMCA, update_adjust and path delay from gptp.c
- Media FIFO lock and PI clock recovery exactly as coded
- 11 XMOS logical cores on two tiles, live
- Real AMS8-1A silk with AVB metering
- What is WBS’s own: about 10 lines of XMOS config

This page was made from the device simulation because the archive database has no device page for RD79-AVB Monitor. See the [simulation index](../siumulation-index.html) for every simulated product.
