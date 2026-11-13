---
type: "product"
code: "RD71-TouchDisplay"
title: "Densitron RipDraw 1U touch TFT evaluation"
category: "R&D register"
year: 2015
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD71 Touch Display — Densitron RipDraw 1U touch TFT evaluation

**▶ [Open the RD71 Touch Display simulation](../siumulation.html?plugin=rd71-touchdisplay)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2015\|48](Year-2015.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd71-touchdisplay#sim) · [Tutorial: the evaluation](../siumulation.html?plugin=rd71-touchdisplay#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd71-touchdisplay#second) · [Block diagram](../siumulation.html?plugin=rd71-touchdisplay#block) · [Schematics](../siumulation.html?plugin=rd71-touchdisplay#schematic) · [Software](../siumulation.html?plugin=rd71-touchdisplay#software) · [Findings](../siumulation.html?plugin=rd71-touchdisplay#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD71-TouchDisplay` |

## What it is

A 2015|48 bench evaluation of a Densitron 480 × 110 1U touch TFT with its own Cortex-M4 "RipDraw" GPU, driven over USB from a BeagleBone Black. The likely target was a replacement for the AMS8-2 8-character displays (RD62). The simulation runs the archived C test programs, byte for byte, against a model of the display.

## In the simulation

- Tap the 480 × 110 screen and follow the touch packet through RdGetEventData to the hit test
- Every RipDraw frame decoded: cmd id, seqNo, length, payload, checksum
- LCD refresh, the 35 ms LC response and USB frame timing on one zoomable second
- The deleted-write-id bug and the 2·xPos touch scaling, with switches to expose them
- What was decided: HDSP-2533 dot-matrix displays instead (2015|48–2016|49)

This page was made from the device simulation because the archive database has no device page for RD71 Touch Display. See the [simulation index](../siumulation-index.html) for every simulated product.
