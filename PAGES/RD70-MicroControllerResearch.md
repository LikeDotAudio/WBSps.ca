---
type: "product"
code: "RD70-MicroControllerResearch"
title: "Microcontroller research: Cortex-M + FreeRTOS evaluation"
category: "R&D register"
year: 2013
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD70 Microcontroller Research — Microcontroller research: Cortex-M + FreeRTOS evaluation

**▶ [Open the RD70 Microcontroller Research simulation](../siumulation.html?plugin=rd70-microcontrollerresearch)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2013\|46](Year-2013.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd70-microcontrollerresearch#sim) · [Tutorial: the evaluation](../siumulation.html?plugin=rd70-microcontrollerresearch#tutorial) · [One second, tick by tick](../siumulation.html?plugin=rd70-microcontrollerresearch#second) · [Block diagram](../siumulation.html?plugin=rd70-microcontrollerresearch#block) · [Schematics](../siumulation.html?plugin=rd70-microcontrollerresearch#schematic) · [Software](../siumulation.html?plugin=rd70-microcontrollerresearch#software) · [Findings](../siumulation.html?plugin=rd70-microcontrollerresearch#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD70-MicroControllerResearch` |

## What it is

The 2013|46 search for a 32-bit successor to the ATmega128: Kinetis, XMEGA, SAM7 and STM32 parts compared, an STM32F100/F103/F407 family picked as Low/Mid/High, and the stock FreeRTOS V7.4.2 STM32F4 demo built in IAR and run on a Discovery board. The plugin runs that demo tick by tick and sets it beside the WBS super-loops and the Ross gearos scheduler.

## In the simulation

- FreeRTOS V7.4.2 scheduler, tick by tick, with real priorities and round-robin order
- STM32F4DISCOVERY drawn to scale; B1, B2, CN1, CN3, JP1 drive the model
- IAR window: PLL, pin map and priority edits, Make, Download & Debug
- Same button press on FreeRTOS, POD33, AMS8-2 and gearos
- Why the archived demo would not blink on the Discovery
- Candidate sheet, quotes and the “Final Decision” tiers

This page was made from the device simulation because the archive database has no device page for RD70 Microcontroller Research. See the [simulation index](../siumulation-index.html) for every simulated product.
