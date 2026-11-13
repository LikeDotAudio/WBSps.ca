---
type: "product"
code: "RD39-MPEG-HEAAC"
title: "encoder sizing model"
category: "R&D register"
year: 2012
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD39 MPEG / HE-AAC — encoder sizing model

**▶ [Open the RD39 MPEG / HE-AAC simulation](../siumulation.html?plugin=rd39-mpeg-heaac)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2012\|45](Year-2012.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd39-mpeg-heaac#sim) · [Tutorial: sizing the encoder](../siumulation.html?plugin=rd39-mpeg-heaac#tutorial) · [One second, frame by frame](../siumulation.html?plugin=rd39-mpeg-heaac#second) · [Block diagram](../siumulation.html?plugin=rd39-mpeg-heaac#block) · [Schematics](../siumulation.html?plugin=rd39-mpeg-heaac#schematic) · [Software](../siumulation.html?plugin=rd39-mpeg-heaac#software) · [Findings](../siumulation.html?plugin=rd39-mpeg-heaac#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD39-MPEG-HEAAC` |

## What it is

The January 2012 study of an HE-AAC v2 encoder, as a working model. Set the bitrate and codec mode to see the AAC/SBR/PS split, frame timing and config string, and check the SHARC memory problem that ended the idea.

## In the simulation

- AAC / SBR / PS band split from the EBU paper
- Bitrates of all 23 listening-test files
- SHARC memory check vs Fraunhofer’s advice
- A/153 AudioSpecificConfig rebuilt bit by bit
- RTP and TS packet timing

This page was made from the device simulation because the archive database has no device page for RD39 MPEG / HE-AAC. See the [simulation index](../siumulation-index.html) for every simulated product.
