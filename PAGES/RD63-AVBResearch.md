---
type: "product"
code: "RD63-AVBResearch"
title: "Audio Video Bridging sizing and vendor model"
category: "R&D register"
year: 2013
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD63 AVB research — Audio Video Bridging sizing and vendor model

**▶ [Open the RD63 AVB research simulation](../siumulation.html?plugin=rd63-avbresearch)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2013\|46](Year-2013.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd63-avbresearch#sim) · [Tutorial: sizing AVB](../siumulation.html?plugin=rd63-avbresearch#tutorial) · [One second on the link](../siumulation.html?plugin=rd63-avbresearch#second) · [Block diagram](../siumulation.html?plugin=rd63-avbresearch#block) · [Schematics](../siumulation.html?plugin=rd63-avbresearch#schematic) · [Software](../siumulation.html?plugin=rd63-avbresearch#software) · [Findings](../siumulation.html?plugin=rd63-avbresearch#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD63-AVBResearch` |

## What it is

The 2013–2014 research into IEEE AVB networked audio for WBS monitors. The model reserves talker streams on a 100 Mb/s or 1 Gb/s link, shows gPTP, shaped AVTP packets and the 2 ms presentation time in slow motion, breaks the cloud with a plain switch, and compares the XMOS and DDC licence routes that led to the RD79 XMOS listener.

## In the simulation

- SRP admission: why 100 Mb/s means about 32 channels
- Class A vs class B packets in slow motion
- Non-AVB switch and Wi-Fi break the reservation
- DDC licence vs XMOS reference design per unit
- Leads to RD79 WBS-AVB-DG and RD85 RAVENNA

This page was made from the device simulation because the archive database has no device page for RD63 AVB research. See the [simulation index](../siumulation-index.html) for every simulated product.
