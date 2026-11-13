---
type: "product"
code: "RD86-SLM1D-with-old-board"
title: "SLM-1D on the old ADSP-21065L board"
category: "R&D register"
year: 2016
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD86 SLM-1D old board — SLM-1D on the old ADSP-21065L board

**▶ [Open the RD86 SLM-1D old board simulation](../siumulation.html?plugin=rd86-slm1d-with-old-board)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2016\|49](Year-2016.md) |
| Depth | Full model |
| Simulation tabs | [Simulator (before / after)](../siumulation.html?plugin=rd86-slm1d-with-old-board#sim) · [Tutorial: doing the port](../siumulation.html?plugin=rd86-slm1d-with-old-board#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd86-slm1d-with-old-board#second) · [Block diagram](../siumulation.html?plugin=rd86-slm1d-with-old-board#block) · [Schematics](../siumulation.html?plugin=rd86-slm1d-with-old-board#schematic) · [Software](../siumulation.html?plugin=rd86-slm1d-with-old-board#software) · [Findings](../siumulation.html?plugin=rd86-slm1d-with-old-board#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD86-SLM1D with old board` |

## What it is

A 2016 R&D attempt to drive the 57-LED SLM1-4 head from the 2002 SLM-1 board (ADSP-21065L + CS8427). The digital v1.01 firmware was merged with the analog SLM-1A display engine. Before/after simulator, MD5 comparison with every SLM master, and the two parts the port missed.

## In the simulation

- Before (v1.01, 41-LED head) and after (RD86, SLM1-4 head) driven by the same samples
- Hash check: 29 files = v1.01, 8 tables = slm1v102 analog / POD3A, only slm-1-main.asm edited
- Old 7-LED phase table lands on U6 LOCK2-6 and the L/R selects
- Lock LED never sent; ERROR only on the old head
- MM5450 frames bit by bit, both layouts

This page was made from the device simulation because the archive database has no device page for RD86 SLM-1D old board. See the [simulation index](../siumulation-index.html) for every simulated product.
