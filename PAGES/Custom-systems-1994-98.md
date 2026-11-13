---
type: "product"
code: "Custom-systems-1994-98"
title: "37 custom jobs + CTV RS422 relay link"
category: "Obsolete products"
year: 1994
tags: ["product", "simulation", "obsolete-products"]
made_by: "sim_pages"
---

# Custom systems 1994–98 — 37 custom jobs + CTV RS422 relay link

**▶ [Open the Custom systems 1994–98 simulation](../siumulation.html?plugin=systems-94-98)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | Obsolete products |
| Year | [1994\|27](Year-1994.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=systems-94-98#sim) · [Tutorial: using the link](../siumulation.html?plugin=systems-94-98#tutorial) · [One second, frame by frame](../siumulation.html?plugin=systems-94-98#second) · [Block diagram](../siumulation.html?plugin=systems-94-98#block) · [Schematics](../siumulation.html?plugin=systems-94-98#schematic) · [Software](../siumulation.html?plugin=systems-94-98#software) · [Findings](../siumulation.html?plugin=systems-94-98#findings) |
| Archive folder | `#CUSTOM #SYSTEMS/#Custom Systems 94-98` |

## What it is

Ward-Beck's custom-job drawings from 1994|27–1999|32 (Renaissance consoles for WBZ, CFNY, CBC and others, intercom matrices, turrets, a TTC PA relay card), each with a summary card. The job with code, the CTV RS422 link, is emulated pass by pass: a PIC16F874 synchronous transmitter whose bursts an asynchronous PIC receiver decodes into six relay closures.

## In the simulation

- Job selector with a card for all 38 jobs
- Real ARX422 silkscreen panels from CorelDRAW
- txv100/rxv100 emulated pass by pass, with an async UART sampling the line
- Bit-level scope: sync clock vs async start, data and stop samples
- Finds the async receiver behind the "Synch Mode rx slave" comment, plus the crystal mismatch
- 10-step operator tutorial

This page was made from the device simulation because the archive database has no device page for Custom systems 1994–98. See the [simulation index](../siumulation-index.html) for every simulated product.
