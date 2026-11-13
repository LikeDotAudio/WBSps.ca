---
type: "product"
code: "microIMP4"
title: "4-channel passive interface box"
category: "Monitors, meters & tools"
year: 2015
tags: ["product", "simulation", "monitors-meters-tools"]
made_by: "sim_pages"
---

# microIMP4 — 4-channel passive interface box

**▶ [Open the microIMP4 simulation](../siumulation.html?plugin=microimp4)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Monitors, meters & tools |
| Year | [2015\|48](Year-2015.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=microimp4#sim) · [Tutorial](../siumulation.html?plugin=microimp4#tutorial) · [One second](../siumulation.html?plugin=microimp4#second) · [Block diagram & assembly](../siumulation.html?plugin=microimp4#block) · [Schematic (conceptual)](../siumulation.html?plugin=microimp4#schematic) · [Signal path](../siumulation.html?plugin=microimp4#software) · [Findings](../siumulation.html?plugin=microimp4#findings) |
| Archive folder | `microIMP4 - #Engineering` |

## What it is

A Ward-Beck “micro” box known only from its 2015|48 silkscreen: a printed top cover numbered 1–4, four XLR cut-outs on one end, four round holes on the other, and no power. The plugin builds it from the real artwork and models the most likely use: four passive 110 Ω AES3 ↔ 75 Ω coax baluns, down to the biphase-mark bit cells.

## In the simulation

- Real green + white top-cover silk
- Both end panels drawn 1:1 from the artwork
- AES3 stream to the bit: preambles, parity, channel status
- Pad, coax length and reflection effects (inferred)
- Leftover “micro AMP” logo off the page

This page was made from the device simulation because the archive database has no device page for microIMP4. See the [simulation index](../siumulation-index.html) for every simulated product.
