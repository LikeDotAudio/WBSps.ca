---
type: "product"
code: "RD85-Archwave-Ravenna-Monitor"
title: "uNet AES67 on/off ramp for the AMS8-1"
category: "R&D register"
year: 2015
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD85 Archwave Ravenna Monitor — uNet AES67 on/off ramp for the AMS8-1

**▶ [Open the RD85 Archwave Ravenna Monitor simulation](../siumulation.html?plugin=rd85-archwave-ravenna-monitor)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2015\|48](Year-2015.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#sim) · [Tutorial: the evaluation](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#tutorial) · [One second, packet by packet](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#second) · [Block diagram](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#block) · [Schematics](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#schematic) · [Software](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#software) · [Findings](../siumulation.html?plugin=rd85-archwave-ravenna-monitor#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD85-Archwave Ravenna Monitor` |

## What it is

The 2015–2016 evaluation that put an Archwave uNet2500 RAVENNA/AES67 module inside the AMS8-1 monitor. The model runs the archived Verilog bit by bit (I8S → I2S), locks PTP, streams RTP packets at 1 ms or 125 µs through a switch with jitter, and shows the receiver-delay budget. It ends in the AMS8-1AN, MLC8N, AMS2-N and 32ME-N.

## In the simulation

- I8S → I2S off ramp from i8sx2_i2sx8.v, tick by tick
- PTP states, RTP packets and the receive buffer in slow motion
- Receiver delay, packet time and QoS experiments
- X102 → H4 harness and the Archwave rear plate to scale
- Front-panel “ AES67 ” relabel in v200w.c
- Links to MLC8N, AMS2-N, 32ME-N, PREmo and RD63

This page was made from the device simulation because the archive database has no device page for RD85 Archwave Ravenna Monitor. See the [simulation index](../siumulation-index.html) for every simulated product.
