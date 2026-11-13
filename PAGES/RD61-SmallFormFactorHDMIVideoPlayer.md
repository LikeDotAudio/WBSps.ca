---
type: "product"
code: "RD61-SmallFormFactorHDMIVideoPlayer"
title: "the USB-key sketch as a working model"
category: "R&D register"
year: 2013
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD61 HDMI player stick — the USB-key sketch as a working model

**▶ [Open the RD61 HDMI player stick simulation](../siumulation.html?plugin=rd61-hdmi-player)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2013\|46](Year-2013.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd61-hdmi-player#sim) · [Tutorial: using the stick](../siumulation.html?plugin=rd61-hdmi-player#tutorial) · [One second of HDMI](../siumulation.html?plugin=rd61-hdmi-player#second) · [Block diagram](../siumulation.html?plugin=rd61-hdmi-player#block) · [Schematics](../siumulation.html?plugin=rd61-hdmi-player#schematic) · [Software](../siumulation.html?plugin=rd61-hdmi-player#software) · [Findings](../siumulation.html?plugin=rd61-hdmi-player#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD61-SmallFormFactorHDMIVideoPlayer` |

## What it is

An early-2013 idea for a USB-key-sized HDMI video player, known only from a pencil sketch: USB plug, HDMI plug, a PLAY/STOP button and a LOOP/PLAY ONCE switch. The model makes the sketch work: hot-plug and EDID, playback with loop or stop, and the HDMI frame, line and pixel timing underneath.

## In the simulation

- The original sketch, and a clickable drawing of it
- PLAY/STOP and LOOP/PLAY ONCE state machine
- EDID read and mode choice at hot-plug
- 24p clip on a 60 Hz output: 3:2 cadence
- Why the USB end exists: power

This page was made from the device simulation because the archive database has no device page for RD61 HDMI player stick. See the [simulation index](../siumulation-index.html) for every simulated product.
