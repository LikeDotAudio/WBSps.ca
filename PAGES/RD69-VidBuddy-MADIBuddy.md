---
type: "product"
code: "RD69-VidBuddy-MADIBuddy"
title: "handheld tester on the Demux4 board"
category: "R&D register"
year: 2013
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD69 Vid/MADI Buddy — handheld tester on the Demux4 board

**▶ [Open the RD69 Vid/MADI Buddy simulation](../siumulation.html?plugin=rd69-vidbuddy-madibuddy)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2013\|46](Year-2013.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#sim) · [Tutorial: specifying the Buddy](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#tutorial) · [One second, old vs new](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#second) · [Block diagram](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#block) · [Schematics](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#schematic) · [Software](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#software) · [Findings](../siumulation.html?plugin=rd69-vidbuddy-madibuddy#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD69-VidBuddy_MADIBuddy` |

## What it is

An April 2013 scope for a battery handheld that de-embeds SDI and reads MADI, built on the SA-DEMUX4 board for $750 or less. The model puts the Demux4 in an AVB1-sized case, tests its battery life against the 2002 VIDBuddy’s measured hours, costs it from the real Demux4 assembly quote, and shows that the MADI reclocker on Issue 2 was never fitted.

## In the simulation

- 3G/HD/SD and MADI inputs, with the unfitted U20 MADI reclocker
- Battery hours vs the AVB1 VIDBuddy manual table
- Cost from the Jan 2013 Demux4 assembly quote vs $750
- Signal timing: lines, HANC packets, AES frames, MCU passes
- Old VIDBuddy vs new Buddy comparison

This page was made from the device simulation because the archive database has no device page for RD69 Vid/MADI Buddy. See the [simulation index](../siumulation-index.html) for every simulated product.
