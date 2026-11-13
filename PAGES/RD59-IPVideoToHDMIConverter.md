---
type: "product"
code: "RD59-IPVideoToHDMIConverter"
title: "customer requirement model"
category: "R&D register"
year: 2013
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD59 IP-to-video box — customer requirement model

**▶ [Open the RD59 IP-to-video box simulation](../siumulation.html?plugin=rd59-ipvideotohdmiconverter)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2013\|46](Year-2013.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#sim) · [Tutorial: using the box](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#tutorial) · [One second through it](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#second) · [Block diagram](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#block) · [Schematics](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#schematic) · [Software](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#software) · [Findings](../siumulation.html?plugin=rd59-ipvideotohdmiconverter#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD59-IPVideoToHDMIConverter` |

## What it is

A January 2013 customer request for a box that turns IP camera streams (H.264 + AAC, MJPEG) into SDI, composite and analog audio, managed from a web page and able to reconnect by itself. The model runs a stream through jitter buffer, decoder and frame synchroniser into 480i, 720p or 1080i, and shows what a lost connection does to the picture.

## In the simulation

- Packets → camera frames → output frames, with repeats and drops
- Three output standards from the e-mail
- Reconnect state machine and power-up resume
- H.264 waits for an I-frame; MJPEG does not
- Half-rack rear panel from the connector list

This page was made from the device simulation because the archive database has no device page for RD59 IP-to-video box. See the [simulation index](../siumulation-index.html) for every simulated product.
