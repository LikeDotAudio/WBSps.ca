---
type: "product"
code: "Custom-55XXXX-systems"
title: "customer jobs, R2K hub/turret system"
category: "Obsolete products"
year: 2008
tags: ["product", "simulation", "obsolete-products"]
made_by: "sim_pages"
---

# Custom 55xxxx systems — customer jobs, R2K hub/turret system

**▶ [Open the Custom 55xxxx systems simulation](../siumulation.html?plugin=55xxxx-systems)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Obsolete products |
| Year | [2008\|41](Year-2008.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=55xxxx-systems#sim) · [Tutorial: the 557572 system](../siumulation.html?plugin=55xxxx-systems#tutorial) · [One second, frame by frame](../siumulation.html?plugin=55xxxx-systems#second) · [Block diagram](../siumulation.html?plugin=55xxxx-systems#block) · [Schematics](../siumulation.html?plugin=55xxxx-systems#schematic) · [Software](../siumulation.html?plugin=55xxxx-systems#software) · [Jobs](../siumulation.html?plugin=55xxxx-systems#jobs) · [Findings](../siumulation.html?plugin=55xxxx-systems#findings) |
| Archive folder | `#CUSTOM #SYSTEMS/#CUSTOM 55XXXX Systems - #OBSOLETE #Archive` |

## What it is

About 100 Ward-Beck custom jobs from 1999|32 to 2011|44, each with a summary card and a job selector. The most complete, 557572 for Rogers Kitchener, runs in full: an ATmega128 hub polling two R2K consoles and a custom PIC turret, with its volume controller and Mode 7 cough logic.

## In the simulation

- Job selector + a card for every job
- 554951-3 hub polling cycle from the 2008 firmware
- Real turret, hub and controller silks (converted .cdr)
- Turret setup per the programming chart
- Two-hub token passing over the LINK
- Bugs: an assignment in every if, no real LED flash

This page was made from the device simulation because the archive database has no device page for Custom 55xxxx systems. See the [simulation index](../siumulation-index.html) for every simulated product.
