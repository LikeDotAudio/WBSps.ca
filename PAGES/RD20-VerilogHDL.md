---
type: "product"
code: "RD20-VerilogHDL"
title: "self-study and the DEMUX-4 Verilog it led to"
category: "R&D register"
year: 2011
tags: ["product", "simulation", "r-d-register"]
made_by: "sim_pages"
---

# RD20 Verilog HDL — self-study and the DEMUX-4 Verilog it led to

**▶ [Open the RD20 Verilog HDL simulation](../siumulation.html?plugin=rd20-veriloghdl)** — front panel, operator tutorial, one second in slow motion, block diagram, schematics and how each control drives the firmware

|  |  |
|---|---|
| Type | product (simulated) |
| Family | R&D register |
| Year | [2011\|44](Year-2011.md) |
| Depth | Full model |
| Simulation tabs | [Simulator](../siumulation.html?plugin=rd20-veriloghdl#sim) · [Tutorial: the Verilog study](../siumulation.html?plugin=rd20-veriloghdl#tutorial) · [One second, clock by clock](../siumulation.html?plugin=rd20-veriloghdl#second) · [Block diagram](../siumulation.html?plugin=rd20-veriloghdl#block) · [Schematics](../siumulation.html?plugin=rd20-veriloghdl#schematic) · [Software](../siumulation.html?plugin=rd20-veriloghdl#software) · [Findings](../siumulation.html?plugin=rd20-veriloghdl#findings) |
| Archive folder | `ENGINEERING - 2016 RD FILES/RD20-VerilogHDL` |

## What it is

Peter’s 2011 Verilog study, simulated: blocking vs non-blocking in a small event scheduler, `timescale rounding, implicit ports, and the WBS Verilog that followed on DEMUX-4 — the AES3 clock divider and SD clock-enable generator — run cycle by cycle across one second.

## In the simulation

- Event scheduler with Active and NBA regions
- aes_tx_clkdiv.v cycle-exact across a full second
- tx_ce_sd_gen.v 2-of-11 enable pattern
- Course-note errors and the shipped blocking assignment
- Live source with the firing lines lit

This page was made from the device simulation because the archive database has no device page for RD20 Verilog HDL. See the [simulation index](../siumulation-index.html) for every simulated product.
