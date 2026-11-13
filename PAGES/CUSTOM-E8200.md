---
type: "product"
code: "CUSTOM-E8200"
title: "custom MF8200 card-to-D-sub extender"
category: "Obsolete products"
year: 2004
tags: ["product", "simulation", "obsolete-products"]
made_by: "sim_pages"
---

# CUSTOM - E8200 — custom MF8200 card-to-D-sub extender

**▶ [Open the CUSTOM - E8200 simulation](../siumulation.html?plugin=custom-e8200)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Obsolete products |
| Year | [2004\|37](Year-2004.md) |
| Depth | Hardware model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=custom-e8200#sim) · [Tutorial](../siumulation.html?plugin=custom-e8200#tutorial) · [One second](../siumulation.html?plugin=custom-e8200#second) · [Block diagram](../siumulation.html?plugin=custom-e8200#block) · [Schematics (redrawn)](../siumulation.html?plugin=custom-e8200#schematic) · [Signal path (no electronics)](../siumulation.html?plugin=custom-e8200#software) · [Findings](../siumulation.html?plugin=custom-e8200#findings) |
| Archive folder | `#CUSTOM #SYSTEMS/XXX - CUSTOM - E8200 - #Engineering` |

## What it is

Two pinout sheets for a passive module that brings an 8200-series card's 30-way edge out to a D-sub: E8200C (DB25, for CBC, M8204/M8205) and E8200D (DB37, eight D82xx cards, with power). The model traces every pin and shows the signal it carries.

## In the simulation

- Click any D-sub pin and follow it to the card edge
- Ten card pinouts from the two sheets
- Harness mismatch between M8204 and M8205
- Signal on the pin over one second: tone, AES bits, supplies
- Finding: the CDR wiring sheet swaps the edge rows against the PDF

This page was made from the device simulation because the archive database has no device page for CUSTOM - E8200. See the [simulation index](../siumulation-index.html) for every simulated product.
