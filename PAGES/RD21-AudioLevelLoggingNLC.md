---
type: "product"
code: "RD21-AudioLevelLoggingNLC"
title: "DTS NLC card + Java \"LumberJack\" logger"
category: "R&D register"
year: 2011
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD21 NLC loudness logger — DTS NLC card + Java "LumberJack" logger

**▶ [Open the RD21 NLC loudness logger simulation](../siumulation.html?plugin=rd21-audiolevelloggingnlc)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2011\|44](Year-2011.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd21-audiolevelloggingnlc#sim) · [Tutorial: logging an NLC card](../siumulation.html?plugin=rd21-audiolevelloggingnlc#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd21-audiolevelloggingnlc#second) · [Block diagram](../siumulation.html?plugin=rd21-audiolevelloggingnlc#block) · [Schematics (redrawn)](../siumulation.html?plugin=rd21-audiolevelloggingnlc#schematic) · [Software](../siumulation.html?plugin=rd21-audiolevelloggingnlc#software) · [Findings](../siumulation.html?plugin=rd21-audiolevelloggingnlc#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD21-AudioLevelLoggingNLC` |

## What it is

R&D from 2011: log what the DTS Neural Loudness Control on an M6205A-3G openGear card measures, once a second, on a PC. The model runs the card firmware (LogTask, logman/logcomm, DTS getters over SPI), CAN and the frame bridge, and the Java logger (NTP, WBSLAP request, parser, card10.txt) with timing taken from the 2011 network capture.

## In the simulation

- Byte-exact WBSLAP request and reply, matched to the 2011 Wireshark capture
- Redrawn LumberJack window with tree, card tab and log viewer
- Loudness → NLC gain → SPI getters → row, in slow motion
- Why rows were duplicated, stale or late: two loggers, two clocks, NTP
- 12-step tutorial and 20 findings, including what became of it

This page was made from the device simulation because the archive database has no device page for RD21 NLC loudness logger. See the [simulation index](../siumulation-index.html) for every simulated product.
