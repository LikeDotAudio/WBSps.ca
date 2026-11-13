/* =====================================================================
   RD10 — Integrate Cyclone IV into product (Ward-Beck R&D register, Peter, Z = completed 2011-12-01)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD10 itself holds no Ward-Beck HDL: it is the evaluation folder (Altera handbooks, EP4CE30/40/55
   pin-out tables, IO_Notes.xlsx, CycloneIv_Price_Comparison.xls, PowerPlay, and an unmodified Altera
   Cyclone IV GX dev kit). The model therefore simulates what RD10 decided, inside the three products
   that later carried a Cyclone IV E, cycle by cycle where the code allows:
   - power-on: POR, nCONFIG/nSTATUS, Active Serial read of the M25P16 bit by bit (opcode, 24-bit
     address, DCLK count), CONF_DONE, initialisation, user mode, PLL lock
   - the main-board ATmega128 boot code that races the FPGA, timed from the compiled listings
     (ICCAVR .lis: wait() 7 cycles/pass, wait_ms() 807 cycles per "ms", 4.9152 MHz crystal)
   - two small VHDL entities clocked cycle by cycle (clkdiv_98M304_to_12M288, reset_delay_V)

   Sources (all in this archive):
   - ENGINEERING - 2016 RD FILES/R&D_List.xls (RD10 row), README.md
   - RD10_cycloneIV/CycloneIv_Price_Comparison.xls (created 2011-05-19, saved 2012-05-16): parts, LEs,
       list and quoted prices, "LE's used in project", replacement vs current part, QTY 2010
   - RD10_cycloneIV/IO_Notes.xlsx (2011-05-24): DPCLK/CDPCLK vs dedicated clock pins
   - RD10_cycloneIV/pinouts/EP4CE30.xls, EP4CE40.xls, EP4CE55.xls (Altera pin lists, F484 column)
   - RD10_cycloneIV/cyclone4-handbook.pdf (Table 1-1 resources, JTAG IDCODEs, Table 9-6 CRC),
       cyiv-51008Programming.pdf (Table 8-2 .rbf sizes, Table 8-5 MSEL, Eq. 8-3, Table 8-11 timing,
       "EPCS1 does not support Cyclone IV devices"), cyc_c51014EPCSDevicesDatasheet.pdf (opcodes,
       sizes, silicon IDs, tWB/tEB), an447 (3.3-V LVTTL interfacing), PowerPlay/cycloneiii_civ_cv_epe.xls
   - AMS16 - #Master/…/AMS16-3G v700 October 24 2012/Altera/AMS16TEST.qsf, .cdf, ams163g.sdc,
       altpll0.vhd, altpll1.vhd, reset_delay_V.vhd; …/Atmel Main Board/ams16.c, altera.c (isAlteraReady),
       common.c/.lis (wait, waitMillis), sharc.c; AMS16A-3-4/AMS163G-ISS7-BOM.xls
   - AMS81 - #Master/…/AMS8 - #Software #Altera #V050000/AMS81.qsf, ams81-ep4ce30.qsf (+ _description.txt),
       AMS81.cdf, AMS81.sdc, altpll0/1/2.v, PLLJ_PLLSPE_INFO.txt, clkdiv_98M304_to_12M288.vhd
   - #MLC - #SERIES/…/MLC8N - #Software #ALTERA #v050000/AMS81.qsf, ams81-ep4ce30.qsf, AMS81.sdc
   - RD60…/software/AMS81-AEM/atmel/ams8e-1/vcurrent/v200w.c, v200w.lis (Jan 21 2013 rev)
   - RD66…/Software/ATmel/ams8e-1/v105/v100w.c (Apr 3 2013 rev)
   - AMS8E - #Master/AMS8E-1 - #Master/AMS8E-1 ISS5 - ALTIUM.csv, AMS8E-1 ISS5 - MISYS.xls,
       AMS8E-1 ISS5.xlsx, AMS8E-1-ISS5-GERBER.zip (Ams8e-1iss5.GTO/.GTS → assets/rd10-cycloneiv-ams8e1-*.png,
       Ams8e-1iss5-net.ipc → U4/U13/U14/H2/JTAG1/Q1 nets)
   - MISC/BOM Summary Tool.xlsx (EP4CE30F23I7N at Arrow, 2012-02-01, $55.00)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const KEY = '__rd10cycloneivActive';
/* ---------- data generated from the archive (see header) ---------- */
// F484 ball table, identical for EP4CE30 and EP4CE40 (pinouts/EP4CE30.xls, EP4CE40.xls 'Pin List'): ball|bank|function|optional|config|DPCLK
const BALLS_RAW = "A1||GND|||;A2||VCCIO8|||;A3|8|IO|DIFFIO_T4n|DATA10|;A4|8|IO|DIFFIO_T6n||;A5|8|IO|DIFFIO_T11p|DATA5|;A6|8|IO|DIFFIO_T18n|PADD19|;A7|8|IO|DIFFIO_T19n|PADD18|;A8|8|IO|DIFFIO_T20n|DATA2|;A9|8|IO|DIFFIO_T24n|PADD16|;A10|8|IO|DIFFIO_T25n||;A11|8|CLK10|DIFFCLK_4n||;A12|7|CLK8|DIFFCLK_5n||;A13|7|IO|DIFFIO_T29n|PADD11|;A14|7|IO|DIFFIO_T31n|PADD9|;A15|7|IO|DIFFIO_T36n|PADD5|;A16|7|IO|DIFFIO_T40n||;A17|7|IO|DIFFIO_T41n|PADD1|;A18|7|IO|DIFFIO_T45n||;A19|7|IO|RDN4||;A20|7|IO|PLL2_CLKOUTn||;A21||VCCIO7|||;A22||GND|||;B1|1|IO|DIFFIO_L2n||;B2|1|IO|DIFFIO_L2p||;B3|8|IO|DIFFIO_T4p|DATA11|;B4|8|IO|DIFFIO_T6p|DATA8|;B5|8|IO|VREFB8N2||;B6|8|IO|DIFFIO_T18p|DATA15|;B7|8|IO|DIFFIO_T19p|DATA4|;B8|8|IO|DIFFIO_T20p|DATA3|;B9|8|IO|DIFFIO_T24p|PADD17|DPCLK10;B10|8|IO|DIFFIO_T25p|PADD15|;B11|8|CLK11|DIFFCLK_4p||;B12|7|CLK9|DIFFCLK_5p||;B13|7|IO|DIFFIO_T29p|PADD12|DPCLK9;B14|7|IO|DIFFIO_T31p|PADD10|;B15|7|IO|DIFFIO_T36p|PADD6|;B16|7|IO|DIFFIO_T40p||;B17|7|IO|DIFFIO_T41p|PADD2|;B18|7|IO|DIFFIO_T45p|PADD0|;B19|7|IO|RUP4||;B20|7|IO|PLL2_CLKOUTp||;B21|6|IO|DIFFIO_R5p|PADD21|;B22|6|IO|DIFFIO_R5n|PADD22|;C1|1|IO|DIFFIO_L7n||;C2|1|IO|DIFFIO_L7p||CDPCLK0;C3|8|IO|DIFFIO_T3n||;C4|8|IO|DIFFIO_T3p|DATA12|CDPCLK7;C5||GND|||;C6|8|IO|DIFFIO_T7n|DATA7|;C7|8|IO|DIFFIO_T16p|DATA13|;C8|8|IO|DIFFIO_T16n|DATA14|DPCLK11;C9||GND|||;C10|8|IO|VREFB8N0||;C11||GND|||;C12||GND|||;C13|7|IO|DIFFIO_T35n|PADD7|;C14||GND|||;C15|7|IO|VREFB7N2||;C16||GND|||;C17|7|IO|DIFFIO_T46p||;C18||GND|||;C19|7|IO|DIFFIO_T47n||;C20|6|IO|DIFFIO_R4n|PADD20|CDPCLK5;C21|6|IO|DIFFIO_R6p||;C22|6|IO|DIFFIO_R6n||;D1|1|IO|DIFFIO_L8n|DATA1,ASDO|;D2|1|IO|DIFFIO_L8p||;D3||GND|||;D4||VCCIO1|||;D5||VCCIO8|||;D6|8|IO|VREFB8N3||;D7|8|IO|DIFFIO_T7p||;D8||GND|||;D9||VCCIO8|||;D10|8|IO|DIFFIO_T26n||;D11||VCCIO8|||;D12||VCCIO7|||;D13|7|IO|DIFFIO_T35p|PADD8|;D14||VCCIO7|||;D15|7|IO|VREFB7N1||;D16||VCCIO7|||;D17|7|IO|VREFB7N0||;D18||VCCIO7|||;D19|7|IO|DIFFIO_T47p||;D20|6|IO|VREFB6N0||;D21|6|IO|DIFFIO_R9p||;D22|6|IO|DIFFIO_R9n||;E1|1|IO|DIFFIO_L10n||;E2|1|IO|DIFFIO_L10p|FLASH_nCE,nCSO|;E3|1|IO|DIFFIO_L4n||;E4|1|IO|DIFFIO_L4p|nRESET|;E5|8|IO|PLL3_CLKOUTp||;E6|8|IO|PLL3_CLKOUTn||;E7|8|IO|||;E8||VCCIO8|||;E9|8|IO|VREFB8N1||;E10|8|IO|DIFFIO_T26p||;E11|7|IO|DIFFIO_T27n|PADD13|;E12|7|IO|DIFFIO_T28p||;E13|7|IO|VREFB7N3||;E14|7|IO|DIFFIO_T38n|PADD3|;E15|7|IO|DIFFIO_T44n||;E16|7|IO|DIFFIO_T51p||;E17||VCCD_PLL2|||;E18||GNDA2|||;E19||VCCIO6|||;E20||GND|||;E21|6|IO|DIFFIO_R12p|nOE|;E22|6|IO|DIFFIO_R12n|nWE|;F1|1|IO|DIFFIO_L12n||;F2|1|IO|DIFFIO_L12p||;F3||GND|||;F4||VCCIO1|||;F5||GNDA3|||;F6||VCCD_PLL3|||;F7|8|IO|DIFFIO_T1n||;F8|8|IO|DIFFIO_T5n|DATA9|;F9|8|IO|||;F10|8|IO|DIFFIO_T8p|DATA6|;F11|7|IO|DIFFIO_T27p|PADD14|;F12||GND|||;F13|7|IO|DIFFIO_T37p|PADD4|DPCLK8;F14|7|IO|DIFFIO_T49p||CDPCLK6;F15|7|IO|DIFFIO_T50n||;F16|7|IO|DIFFIO_T51n||;F17|6|IO|DIFFIO_R2n||;F18||VCCA2|||;F19|6|IO|DIFFIO_R8p||;F20|6|IO|DIFFIO_R8n|nAVD|;F21|6|IO|DIFFIO_R18p||;F22|6|IO|DIFFIO_R18n||;G1|1|CLK1|DIFFCLK_0n||;G2||GND|||;G3|1|IO|DIFFIO_L1n||;G4|1|IO|DIFFIO_L1p||;G5|1|IO|VREFB1N0||;G6||VCCA3|||;G7|8|IO|DIFFIO_T1p||;G8|8|IO|DIFFIO_T5p||;G9|8|IO|||;G10|8|IO|DIFFIO_T8n||;G11|8|IO|DIFFIO_T22n||;G12||VCCINT|||;G13|7|IO|DIFFIO_T42n||;G14|7|IO|DIFFIO_T44p||;G15|7|IO|DIFFIO_T49n||;G16|7|IO|DIFFIO_T50p||;G17|6|IO|DIFFIO_R2p||;G18|6|IO|DIFFIO_R7n|PADD23|;G19||VCCIO6|||;G20||GND|||;G21|6|CLK4|DIFFCLK_2p||;G22|6|CLK5|DIFFCLK_2n||;H1|1|IO|DIFFIO_L23n||;H2|1|IO|DIFFIO_L23p||;H3||GND|||;H4||VCCIO1|||;H5|1|IO|VREFB1N2||;H6|1|IO|DIFFIO_L9p||;H7|1|IO|VREFB1N1||;H8|1|IO|DIFFIO_L14p||;H9||VCCINT|||;H10|8|IO|DIFFIO_T14p||;H11|8|IO|DIFFIO_T14n||;H12||GND|||;H13||GND|||;H14|7|IO|DIFFIO_T48p||;H15|7|IO|DIFFIO_T48n||;H16|6|IO|DIFFIO_R10p||;H17|6|IO|DIFFIO_R7p||;H18|6|IO|VREFB6N1||;H19|6|IO|DIFFIO_R13p||;H20|6|IO|DIFFIO_R13n||;H21|6|IO|DIFFIO_R22p||;H22|6|IO|DIFFIO_R22n||;J1|1|IO|DIFFIO_L24n||;J2|1|IO|DIFFIO_L24p||;J3|1|IO|VREFB1N3||;J4|1|IO|||DPCLK0;J5|1|IO|DIFFIO_L18n||;J6|1|IO|DIFFIO_L9n||;J7|1|IO|DIFFIO_L21p||;J8|1|IO|DIFFIO_L14n||;J9||GND|||;J10||VCCINT|||;J11||VCCINT|||;J12||VCCINT|||;J13||VCCINT|||;J14||VCCINT|||;J15||GND|||;J16||VCCINT|||;J17|6|IO|DIFFIO_R10n||;J18|6|IO|VREFB6N2||;J19||GND|||;J20||VCCIO6|||;J21|6|IO|DIFFIO_R23p||;J22|6|IO|DIFFIO_R23n||DPCLK7;K1|1|IO||DATA0|;K2|1|DCLK||DCLK|;K3||GND|||;K4||VCCIO1|||;K5|1|nCONFIG||nCONFIG|;K6|1|nSTATUS||nSTATUS|;K7|1|IO|DIFFIO_L21n||;K8|1|IO|DIFFIO_L20n||;K9||VCCINT|||;K10||GND|||;K11||GND|||;K12||GND|||;K13||GND|||;K14||VCCINT|||;K15||VCCINT|||;K16||GND|||;K17|6|IO|DIFFIO_R20n||;K18|6|IO|DIFFIO_R20p||;K19|6|IO|VREFB6N3||;K20|6|MSEL3||MSEL3|;K21|6|IO|DIFFIO_R24p|CLKUSR|;K22|6|IO|DIFFIO_R24n|nCEO|;L1|1|TMS||TMS|;L2|1|TCK||TCK|;L3|1|nCE||nCE|;L4|1|TDO||TDO|;L5|1|TDI||TDI|;L6|2|IO|DIFFIO_L26p||;L7|2|IO|DIFFIO_L30n||;L8|1|IO|DIFFIO_L20p||;L9||VCCINT|||;L10||GND|||;L11||GND|||;L12||GND|||;L13||GND|||;L14||VCCINT|||;L15||GND|||;L16||VCCINT|||;L17|6|MSEL2||MSEL2|;L18|6|MSEL1||MSEL1|;L19||VCCIO6|||;L20||GND|||;L21|6|IO|DIFFIO_R27p|CRC_ERROR|;L22|6|IO|DIFFIO_R27n|INIT_DONE|;M1|2|IO|DIFFIO_L27n||;M2|2|IO|DIFFIO_L27p||;M3|2|IO|DIFFIO_L28n||;M4|2|IO|DIFFIO_L28p||;M5|2|IO|VREFB2N0||;M6|2|IO|DIFFIO_L26n||;M7|2|IO|DIFFIO_L41n||;M8|2|IO|DIFFIO_L42p||;M9||VCCINT|||;M10||GND|||;M11||GND|||;M12||GND|||;M13||GND|||;M14||VCCINT|||;M15||VCCINT|||;M16|5|IO|VREFB5N0||;M17|6|MSEL0||MSEL0|;M18|6|CONF_DONE||CONF_DONE|;M19|5|IO|DIFFIO_R30p||;M20|5|IO|DIFFIO_R30n||;M21|5|IO|DIFFIO_R31p||;M22|5|IO|DIFFIO_R31n||;N1|2|IO|DIFFIO_L29n||;N2|2|IO|DIFFIO_L29p||;N3||GND|||;N4||VCCIO2|||;N5|2|IO|||;N6|2|IO|DIFFIO_L41p||;N7|2|IO|DIFFIO_L49p||;N8|2|IO|DIFFIO_L42n||;N9||VCCINT|||;N10||GND|||;N11||GND|||;N12||GND|||;N13||GND|||;N14||VCCINT|||;N15||GND|||;N16|5|IO|DIFFIO_R40p||;N17|5|IO|DIFFIO_R33n||;N18|5|IO|DIFFIO_R33p||DPCLK6;N19|5|IO|DIFFIO_R36p||;N20|5|IO|DIFFIO_R36n||;N21|5|IO|DIFFIO_R32p|DEV_CLRn|;N22|5|IO|DIFFIO_R32n|DEV_OE|;P1|2|IO|DIFFIO_L32n||;P2|2|IO|DIFFIO_L32p||;P3|2|IO|DIFFIO_L34n||;P4|2|IO|DIFFIO_L34p||DPCLK1;P5|2|IO|VREFB2N1||;P6|2|IO|DIFFIO_L52p||;P7|2|IO|DIFFIO_L49n||;P8||GND|||;P9||VCCINT|||;P10||VCCINT|||;P11||VCCINT|||;P12||VCCINT|||;P13||VCCINT|||;P14||VCCINT|||;P15|5|IO|DIFFIO_R46n||;P16|5|IO|DIFFIO_R46p||;P17|5|IO|||;P18||VCCIO5|||;P19||GND|||;P20|5|IO|VREFB5N1||;P21|5|IO|DIFFIO_R38p||;P22|5|IO|DIFFIO_R38n||;R1|2|IO|DIFFIO_L33n||;R2|2|IO|DIFFIO_L33p||;R3||GND|||;R4||VCCIO2|||;R5|2|IO|VREFB2N3||;R6|2|IO|||;R7|2|IO|DIFFIO_L53p||;R8||VCCINT|||;R9||GND|||;R10||VCCINT|||;R11||GND|||;R12||VCCINT|||;R13||GND|||;R14|4|IO|DIFFIO_B52p||;R15|4|IO|DIFFIO_B52n||;R16|4|IO|PLL4_CLKOUTn||;R17|5|IO|VREFB5N2||;R18|5|IO|DIFFIO_R42n||;R19|5|IO|DIFFIO_R42p||;R20|5|IO|DIFFIO_R44n||;R21|5|IO|DIFFIO_R39p||;R22|5|IO|DIFFIO_R39n||;T1|2|CLK3|DIFFCLK_1n||;T2|2|CLK2|DIFFCLK_1p||;T3|2|IO|VREFB2N2||;T4|2|IO|||CDPCLK1;T5|2|IO|||;T6||VCCA1|||;T7|2|IO|DIFFIO_L53n||;T8|3|IO|DIFFIO_B11p||;T9|3|IO|DIFFIO_B11n||;T10|3|IO|DIFFIO_B15p||;T11|3|IO|DIFFIO_B15n||;T12|4|IO|DIFFIO_B36p||;T13|4|IO|DIFFIO_B36n||;T14|4|IO|DIFFIO_B42p||;T15|4|IO|DIFFIO_B42n||;T16|4|IO|PLL4_CLKOUTp||;T17|5|IO|RUP3||;T18|5|IO|RDN3||;T19||VCCIO5|||;T20||GND|||;T21|5|CLK6|DIFFCLK_3p||;T22|5|CLK7|DIFFCLK_3n||;U1|2|IO|DIFFIO_L35n||;U2|2|IO|DIFFIO_L35p||;U3||GND|||;U4||VCCIO2|||;U5||GNDA1|||;U6||VCCD_PLL1|||;U7|3|IO|DIFFIO_B3p||;U8|3|IO|DIFFIO_B3n||;U9|3|IO|DIFFIO_B13p||;U10|3|IO|DIFFIO_B17n||;U11|3|IO|VREFB3N0||;U12|4|IO|DIFFIO_B34p||;U13|4|IO|DIFFIO_B38n||;U14|4|IO|DIFFIO_B39n||;U15|4|IO|DIFFIO_B40p||;U16|4|IO|DIFFIO_B50p||;U17|4|IO|DIFFIO_B50n||;U18||VCCA4|||;U19|5|IO|DIFFIO_R50p||;U20|5|IO|DIFFIO_R50n||;U21|5|IO|DIFFIO_R43p||;U22|5|IO|DIFFIO_R43n||;V1|2|IO|DIFFIO_L38n||;V2|2|IO|DIFFIO_L38p||;V3|2|IO|RDN1||;V4|2|IO|RUP1||;V5|3|IO|DIFFIO_B1n||;V6|3|IO|DIFFIO_B1p||;V7|3|IO|DIFFIO_B7n||;V8|3|IO|DIFFIO_B13n||;V9|3|IO|VREFB3N1||;V10|3|IO|DIFFIO_B16p||DPCLK2;V11|3|IO|DIFFIO_B25n||;V12|4|IO|VREFB4N3||;V13|4|IO|||DPCLK5;V14|4|IO|DIFFIO_B39p||;V15|4|IO|DIFFIO_B40n||;V16|4|IO|VREFB4N0||;V17||VCCD_PLL4|||;V18||GNDA4|||;V19||VCCIO5|||;V20||GND|||;V21|5|IO|DIFFIO_R45p||;V22|5|IO|DIFFIO_R45n||;W1|2|IO|DIFFIO_L44n||;W2|2|IO|DIFFIO_L44p||;W3||GND|||;W4||VCCIO2|||;W5||VCCIO3|||;W6|3|IO|DIFFIO_B7p||;W7|3|IO|DIFFIO_B12p||;W8|3|IO|||;W9||VCCIO3|||;W10|3|IO|DIFFIO_B26p||;W11||VCCIO3|||;W12||VCCIO4|||;W13|4|IO|DIFFIO_B32p||;W14|4|IO|VREFB4N2||;W15|4|IO|DIFFIO_B41n||;W16||VCCIO4|||;W17|4|IO|DIFFIO_B48p||;W18||VCCIO4|||;W19|5|IO|VREFB5N3||;W20|5|IO|||CDPCLK4;W21|5|IO|DIFFIO_R49p||;W22|5|IO|DIFFIO_R49n||;Y1|2|IO|DIFFIO_L45n||;Y2|2|IO|DIFFIO_L45p||;Y3|3|IO|DIFFIO_B4p||;Y4|3|IO|VREFB3N3||;Y5||GND|||;Y6|3|IO|DIFFIO_B6p||CDPCLK2;Y7|3|IO|DIFFIO_B12n||;Y8|3|IO|||;Y9||GND|||;Y10|3|IO|DIFFIO_B26n||;Y11||GND|||;Y12||GND|||;Y13|4|IO|DIFFIO_B32n||DPCLK4;Y14||VCCIO4|||;Y15||GND|||;Y16||GND|||;Y17|4|IO|DIFFIO_B48n||CDPCLK3;Y18||GND|||;Y19||VCCIO5|||;Y20||GND|||;Y21|5|IO|DIFFIO_R51p||;Y22|5|IO|DIFFIO_R51n||;AA1|2|IO|DIFFIO_L50n||;AA2||GND|||;AA3|3|IO|PLL1_CLKOUTp||;AA4|3|IO|||;AA5|3|IO|DIFFIO_B8p||;AA6||VCCIO3|||;AA7|3|IO|DIFFIO_B14p||;AA8|3|IO|DIFFIO_B18p||;AA9|3|IO|DIFFIO_B21p||;AA10|3|IO|DIFFIO_B27p||;AA11|3|CLK15|DIFFCLK_6p||;AA12|4|CLK13|DIFFCLK_7p||;AA13|4|IO|DIFFIO_B28p||;AA14|4|IO|DIFFIO_B29p||;AA15|4|IO|DIFFIO_B33p||;AA16|4|IO|DIFFIO_B35p||;AA17|4|IO|DIFFIO_B43p||;AA18|4|IO|VREFB4N1||;AA19|4|IO|RUP2||;AA20|4|IO|DIFFIO_B49p||;AA21|5|IO|DIFFIO_R56p||;AA22||GND|||;AB1||GND|||;AB2||VCCIO3|||;AB3|3|IO|PLL1_CLKOUTn||;AB4|3|IO|VREFB3N2||;AB5|3|IO|DIFFIO_B8n||;AB6||GND|||;AB7|3|IO|DIFFIO_B14n||;AB8|3|IO|DIFFIO_B18n||;AB9|3|IO|DIFFIO_B21n||DPCLK3;AB10|3|IO|DIFFIO_B27n||;AB11|3|CLK14|DIFFCLK_6n||;AB12|4|CLK12|DIFFCLK_7n||;AB13|4|IO|DIFFIO_B28n||;AB14|4|IO|DIFFIO_B29n||;AB15|4|IO|DIFFIO_B33n||;AB16|4|IO|DIFFIO_B35n||;AB17|4|IO|DIFFIO_B43n||;AB18|4|IO|||;AB19|4|IO|RDN2||;AB20|4|IO|DIFFIO_B49n||;AB21||VCCIO4|||;AB22||GND|||";
// balls whose role differs on EP4CE55 F484 (pinouts/EP4CE55.xls)
const CE55_CHANGED = ["AA6", "AB6", "C18", "D18", "D8", "E8", "H10", "H11", "H14", "H15", "H3", "H4", "H8", "J19", "J20", "J8", "K8", "L7", "L8", "M7", "M8", "N8", "P15", "P16", "R3", "R4", "R7", "T12", "T13", "T19", "T20", "T7", "T8", "T9", "Y14", "Y15"];
// AMS8E-1 iss5 U4 nets (AMS8E-1-ISS5-GERBER.zip / Ams8e-1iss5-net.ipc, IPC-D-356A, 01/11/2012): ball=net
const U4_RAW = "A1=GNDD;A10=DR1B;A11=DSPCLK1;A12=SCLK_REF_FPGA;A13=AES_REF_FPGA;A14=AES_110REF_IN;A15=EN_AES9-12;A16=PORTA6;A17=PORTC6;A18=DPCLK5;A19=PORTC2;A2=+3V3;A20=PORTC0;A21=+3V3;A22=GNDD;A3=FLAG1;A4=FLAG3;A5=RCLK0;A6=DR0B;A7=TCLK0;A8=DT0B;A9=RCLK1;AA1=DATA_OUT8;AA10=UP1;AA12=VCO_OUT1;AA13=N_SMD_DS1;AA14=SMD_CLK;AA15=EXPIO0;AA16=N_HSP_SEL;AA17=HSP_RXD;AA18=IABC4;AA19=IABC2;AA2=GNDD;AA20=IAFS0;AA21=IABC0;AA22=GNDD;AA3=EXPIO13;AA4=N_AOK;AA5=HPC2;AA6=+3V3;AA7=N_HSP_IRQ;AA8=EXPIO12;AA9=EXPIO8;AB1=GNDD;AB10=DN1;AB12=VCO_OUT2;AB13=SMD_DS0;AB14=EXPIO1;AB15=EXPIO14;AB16=HSP_TXD;AB17=IAFS4;AB18=IADA2;AB19=IADA0;AB2=+3V3;AB20=HPC0;AB21=+3V3;AB22=GNDD;AB3=EXPIO6;AB4=EXPIO2;AB5=N_HSP_BSY;AB6=GNDD;AB7=ASF2;AB8=RUN0;AB9=EXPIO7;B1=I64O2;B10=DR1A;B12=MCLK_REF;B13=LRCLK_REF_FPGA;B14=AES_75REF_IN;B15=EN_AES13-16;B16=PORTA5;B17=PORTC7;B18=PORTC5;B19=PORTC3;B2=I64O1;B20=PORTC1;B21=MUTE;B22=NetR188_2;B3=FLAG0;B4=FLAG2;B5=RFS0;B6=DR0A;B7=TFS0;B8=DT0A;B9=RFS1;C1=I64O4;C10=DSPCLK2;C11=GNDD;C12=GNDD;C13=EN_AES1-4;C14=GNDD;C15=DATA_OUTCS8416;C16=GNDD;C18=GNDD;C19=PORTG1;C2=I64O3;C20=DAC_D1;C21=DAC_LRCK;C22=NetR187_2;C3=TP7;C4=TP6;C5=GNDD;C6=FLAG4;C7=FLAG6;C8=TFS1;C9=GNDD;D1=ASDI;D10=FLAG8;D11=+3V3;D12=+3V3;D13=EN_AES5-8;D14=+3V3;D16=+3V3;D18=+3V3;D19=PORTG0;D2=I64O5;D20=DAC_D2;D21=MMODE2_AD1895;D22=MMODE1_AD1895;D3=GNDD;D4=+3V3;D5=+3V3;D6=FLAG5;D7=FLAG7;D8=GNDD;D9=+3V3;E1=I64O6;E10=FLAG9;E13=GPO0;E14=GPO1;E17=+1V2;E18=GNDD;E19=+3V3;E2=NCS;E20=GNDD;E21=MMODE0_AD1895;E22=NNAME1;E3=L22;E4=L21;E5=TP5;E6=TP2;E8=+3V3;E9=FLAG11;F1=I64O7;F12=GNDD;F13=GPO2;F17=ALTERA37;F18=VCCPLL2;F19=DAC_D3;F2=I64O8;F20=DAC_D4;F21=NNAME7;F22=MCLK_INAD1895;F3=GNDD;F4=+3V3;F5=GNDD;F6=+1V2;F8=TP1;F9=DT1A;G10=DT1B;G12=+1V2;G17=ALTERA41;G18=ALTERA38;G19=+3V3;G2=GNDD;G20=GNDD;G21=SCLK_OUTAD1895;G22=MCLK_OUTAD1895;G3=J22;G4=J21;G6=VCCPLL3;G7=TP4;G8=TP3;G9=TCLK1;H1=DATA1_IN_I64;H12=GNDD;H13=GNDD;H16=ALTERA44;H17=ALTERA39;H18=ALTERA43;H19=ALTERA53;H2=DATA2_IN_I64;H21=NNAME2;H22=BYPASS_AD1895;H3=GNDD;H4=+3V3;H6=H21;H7=DATA5_IN_I64;H9=+1V2;J1=DATA3_IN_I64;J10=+1V2;J11=+1V2;J12=+1V2;J13=+1V2;J14=+1V2;J15=GNDD;J16=+1V2;J17=ALTERA42;J19=GNDD;J2=DATA4_IN_I64;J20=+3V3;J21=NNAME4;J22=NNAME3;J4=DATA6_IN_I64;J5=I64OFS;J6=H22;J7=DATA7_IN_I64;J9=GNDD;K1=NetR97_1;K10=GNDD;K11=GNDD;K12=GNDD;K13=GNDD;K14=+1V2;K15=+1V2;K16=GNDD;K17=WLNGTH1_AD1895;K19=WLNGTH0_AD1895;K2=DCLK;K20=GNDD;K21=TDM_IN_AD1895;K3=GNDD;K4=+3V3;K5=N_CONFIG;K6=N_STATUS;K7=DATA8_IN_I64;K9=+1V2;L1=TMS;L10=GNDD;L11=GNDD;L12=GNDD;L13=GNDD;L14=+1V2;L15=GNDD;L16=+1V2;L17=GNDD;L18=+2V5;L19=+3V3;L2=TCK;L20=GNDD;L21=NNAME6;L22=NNAME5;L3=NCE;L4=TDO;L5=TDI;L6=PB1;L9=+1V2;M1=DAFS;M10=GNDD;M11=GNDD;M12=GNDD;M13=GNDD;M14=+1V2;M15=+1V2;M16=AES_OUT15;M17=GNDD;M18=CONF_DONE;M19=AES_OUT13;M2=PGP;M20=AES_IN15;M21=AES_OUT10;M22=AES_IN10;M3=DADC;M4=DADD;M5=DABC;M6=PB0;M9=+1V2;N1=PLS;N10=GNDD;N11=GNDD;N12=GNDD;N13=GNDD;N14=+1V2;N15=GNDD;N16=AES_OUT16;N17=AES_IN16;N18=AES_OUT14;N19=AES_IN13;N2=PLE;N20=AES_IN12;N21=AES_IN9;N22=AES_OUT9;N3=GNDD;N4=+3V3;N5=DADM;N6=PB2;N7=EAFS;N9=+1V2;P1=DLM2;P10=+1V2;P11=+1V2;P12=+1V2;P13=+1V2;P14=+1V2;P17=AES_IN14;P18=+3V3;P19=GNDD;P2=DLM1;P20=AES_OUT11;P21=AES_OUT8;P22=AES_IN11;P3=DADA;P4=EABC;P5=EAD;P6=DADB;P7=I64OMCLK;P8=GNDD;P9=+1V2;R1=ACS;R10=+1V2;R11=GNDD;R12=+1V2;R13=GNDD;R14=EXTCLK;R16=IADA1;R17=AES_OUT12;R18=AES_OUT7;R19=AES_OUT3;R2=PDN;R20=AES_OUT2;R21=AES_IN8;R22=AES_OUT5;R3=GNDD;R4=+3V3;R8=+1V2;R9=GNDD;T1=FSYNC_IN_I64;T10=N_ERR;T11=N_HSP_ATN;T14=EMD_TXD0;T15=OAFS;T16=OADA1;T17=IAFS1;T18=IABC3;T19=+3V3;T2=MCLK_IN_I64;T20=GNDD;T3=PRG0;T4=PRG1;T5=DLM0;T6=VCCPLL1;U1=PRG2;U10=TTL_SMD_RXD;U11=HSYNC0;U12=VSYNC0;U13=HSP_CLK;U14=OABC;U15=EMD_TXD1;U16=IAFS3;U17=IADA3;U18=VCCPLL4;U19=AES_OUT6;U2=DATA_OUT1;U20=AES_IN7;U21=AES_IN6;U22=AES_IN5;U3=GNDD;U4=+3V3;U5=GNDD;U6=+1V2;U7=ASF1;U8=ASF0;U9=VSYNC1;V1=DATA_OUT2;V10=N_ERR1;V11=EXPIO10;V12=HPC1;V13=EMD_RXD0;V14=EMD_RXD1;V15=IADA4;V16=OADA2;V17=+1V2;V18=GNDD;V19=+3V3;V2=DATA_OUT3;V20=GNDD;V21=AES_OUT4;V22=AES_OUT1;V3=MAP1;V4=MAP0;V5=EXPIO9;V6=HSYNC1;V7=OCS0;V8=OADA5;V9=OADA4;W1=DATA_OUT4;W10=EXPIO11;W11=+3V3;W12=+3V3;W13=UP2;W14=OADA3;W15=OADA0;W16=+3V3;W17=IABC1;W18=+3V3;W2=DATA_OUT5;W21=AES_IN4;W22=AES_IN2;W3=GNDD;W4=+3V3;W5=+3V3;W6=IADA5;W7=EXPIO5;W8=EXPIO4;W9=+3V3;Y1=DATA_OUT6;Y10=RUN1;Y11=GNDD;Y12=GNDD;Y13=DN2;Y14=+3V3;Y15=GNDD;Y16=GNDD;Y17=IAFS2;Y18=GNDD;Y19=+3V3;Y2=DATA_OUT7;Y20=GNDD;Y21=AES_IN3;Y22=AES_IN1;Y3=N_RST;Y4=SMD_TXD;Y5=GNDD;Y6=OCS2;Y7=OCS1;Y8=EXPIO3;Y9=GNDD";
// .qsf pin assignments ball|net|IO_STANDARD
const QSF_AMS16 = "W19|RCVR_20B_10B|1.8 V;U20|RCVR_AUD_EN|1.8 V;N19|RCVR_DOUT[0]|1.8 V;W17|RCVR_CS_N|1.8 V;Y22|RCVR_DOUT[19]|1.8 V;W22|RCVR_DOUT[18]|1.8 V;Y21|RCVR_DOUT[17]|1.8 V;V22|RCVR_DOUT[16]|1.8 V;W21|RCVR_DOUT[15]|1.8 V;U22|RCVR_DOUT[14]|1.8 V;V21|RCVR_DOUT[13]|1.8 V;AA21|RCVR_DOUT[12]|1.8 V;U21|RCVR_DOUT[11]|1.8 V;R22|RCVR_DOUT[10]|1.8 V;R21|RCVR_DOUT[9]|1.8 V;P22|RCVR_DOUT[8]|1.8 V;P21|RCVR_DOUT[7]|1.8 V;N22|RCVR_DOUT[6]|1.8 V;N21|RCVR_DOUT[5]|1.8 V;M22|RCVR_DOUT[4]|1.8 V;M21|RCVR_DOUT[3]|1.8 V;N20|RCVR_DOUT[2]|1.8 V;M19|RCVR_DOUT[1]|1.8 V;Y17|RCVR_IOPROC_EN|1.8 V;T22|RCVR_PCLK|1.8 V;W20|RCVR_RC_BYPN|1.8 V;W15|RCVR_SCLK|1.8 V;V13|RCVR_RESET|1.8 V;W14|RCVR_SDIN|1.8 V;AB14|RCVR_DVB_ASI|1.8 V;R17|RCVR_SDO_EN|1.8 V;V15|RCVR_SDOUT_TDO|1.8 V;AA14|RCVR_SMPTE_BYPASS|1.8 V;AB18|RCVR_STAT[5]|1.8 V;AA18|RCVR_STAT[4]|1.8 V;AA20|RCVR_STAT[3]|1.8 V;AA19|RCVR_STAT[2]|1.8 V;AB20|RCVR_STAT[1]|1.8 V;AB19|RCVR_STAT[0]|1.8 V;V14|RCVR_SW_EN|1.8 V;U19|RCVR_TIM_861|1.8 V;P20|RCVR_WCLK|1.8 V;G18|SRL_20B_10B|1.8 V;F16|SRL_ANC_BLANK|1.8 V;F22|SRL_CSN|1.8 V;F17|SRL_DETECT_TRS|1.8 V;A13|SRL_DIN[19]|1.8 V;B13|SRL_DIN[18]|1.8 V;A14|SRL_DIN[17]|1.8 V;B14|SRL_DIN[16]|1.8 V;A15|SRL_DIN[15]|1.8 V;B16|SRL_DIN[14]|1.8 V;A16|SRL_DIN[13]|1.8 V;B15|SRL_DIN[12]|1.8 V;A17|SRL_DIN[11]|1.8 V;B17|SRL_DIN[10]|1.8 V;B18|SRL_DIN[9]|1.8 V;A18|SRL_DIN[8]|1.8 V;B19|SRL_DIN[7]|1.8 V;A19|SRL_DIN[6]|1.8 V;C19|SRL_DIN[5]|1.8 V;C17|SRL_DIN[4]|1.8 V;D17|SRL_DIN[3]|1.8 V;E16|SRL_DIN[2]|1.8 V;B20|SRL_DIN[1]|1.8 V;D15|SRL_DIN[0]|1.8 V;H19|SRL_DVB_ASI|1.8 V;C15|SRL_F|1.8 V;C13|SRL_H|1.8 V;J18|SRL_IOPROC|1.8 V;F20|SRL_LOCKED|1.8 V;K18|SRL_RESET_N|1.8 V;H22|SRL_SDIN|1.8 V;H21|SRL_SCLK|1.8 V;D20|SRL_SDO_EN|1.8 V;F21|SRL_SDOUT|1.8 V;D19|SRL_SEL0|1.8 V;C20|SRL_SEL1|1.8 V;H20|SRL_SMPTE_BYPASS_N|1.8 V;F19|SRL_TIM_861|1.8 V;D13|SRL_V|1.8 V;A20|SRL_PCLK|1.8 V;B3|ALTERA12|3.3-V LVTTL;C10|AESOUT1|3.3-V LVTTL;B10|AESOUT2|3.3-V LVTTL;D10|AESOUT5|3.3-V LVTTL;C8|AESOUT4|3.3-V LVTTL;E10|AESOUT3|3.3-V LVTTL;A9|ALTERA5|3.3-V LVTTL;B9|ALTERA4|3.3-V LVTTL;A8|ALTERA3|3.3-V LVTTL;B8|ALTERA2|3.3-V LVTTL;A7|ALTERA1|3.3-V LVTTL;B7|ALTERA0|3.3-V LVTTL;A10|AESOUT6|3.3-V LVTTL;E9|AESOUT7|3.3-V LVTTL;C7|AESOUT9|3.3-V LVTTL;D7|AESOUT8|3.3-V LVTTL;B5|altera8|3.3-V LVTTL;G10|H3_7_TP7|3.3-V LVTTL;F10|H3_6_TP6|3.3-V LVTTL;C6|ALTERA13_ATMEL_SDIN|3.3-V LVTTL;A4|ALTERA9|3.3-V LVTTL;B4|altera10|3.3-V LVTTL;F8|H3_4_TP4|3.3-V LVTTL;A3|ALTERA11|3.3-V LVTTL;D6|AESOUT10|3.3-V LVTTL;E7|H3_2_TP2|3.3-V LVTTL;C3|altera6|3.3-V LVTTL;C4|ALTERA16_ATMEL_CS|3.3-V LVTTL;F7|H3_1_TP1|3.3-V LVTTL;F9|H3_3_TP3|3.3-V LVTTL;E6|ALTERA14_ATMEL_SDOUT|3.3-V LVTTL;E5|ALTERA15_ATMEL_SCLK|3.3-V LVTTL;G9|H3_5_TP5|3.3-V LVTTL;L6|DOLBY8_cat552|3.3-V LVTTL;M2|DAI_P19_ENABLE|3.3-V LVTTL;N2|DAI_P17_DATA_IN1|3.3-V LVTTL;N1|DAI_P18_CLK|3.3-V LVTTL;M5|DOLBY9|3.3-V LVTTL;P2|DAI_P15_U4SEL|3.3-V LVTTL;R2|DAI_P13_U4_IN|3.3-V LVTTL;R1|DAI_P14_U4RESET|3.3-V LVTTL;N5|DOLBY11|3.3-V LVTTL;P4|DOLBY13|3.3-V LVTTL;P3|DOLBY14|3.3-V LVTTL;U2|DAI_P10_SDATA1|3.3-V LVTTL;U1|DAI_P11_U4OUT|3.3-V LVTTL;W1|DAI_P9_SCLK|3.3-V LVTTL;P5|DOLBY12|3.3-V LVTTL;V2|DAI_P8_FSYNCH|3.3-V LVTTL;Y2|DAI_P4_cntrl_tdm_dout|3.3-V LVTTL;T3|DAI_P12_U4CLK|3.3-V LVTTL;AA1|DAI_P3_cntrl_tdm_din|3.3-V LVTTL;V4|DAI_P1_cntrl_tdm_FS|3.3-V LVTTL;V3|DAI_P2_cntrl_tdm_sclk|3.3-V LVTTL;P6|DOLBY10|3.3-V LVTTL;T5|DOLBY16|3.3-V LVTTL;T4|DOLBY17|3.3-V LVTTL;R5|DOLBY15|3.3-V LVTTL;G4|DOLBY3_DAC_lrclk_9|3.3-V LVTTL;G3|DOLBY4|3.3-V LVTTL;B2|REF_IN_ics662|3.3-V LVTTL;B1|SEL0_ics662|3.3-V LVTTL;G5|DOLBY2_DAC_sclk_9|3.3-V LVTTL;E4|altera7|3.3-V LVTTL;E3|DOLBY1_DAC_mclk_9|3.3-V LVTTL;C2|SEL3_ics662|3.3-V LVTTL;C1|SEL1_ics662|3.3-V LVTTL;D2|SEL2_ics662|3.3-V LVTTL;J6|DOLBY7|3.3-V LVTTL;H5|DOLBY5|3.3-V LVTTL;J5|DOLBY6|3.3-V LVTTL;E1|DATA_OUT5|3.3-V LVTTL;F1|DATA_OUT8|3.3-V LVTTL;J4|DATA_OUT4|3.3-V LVTTL;H2|DATA_OUT7|3.3-V LVTTL;H1|DATA_OUT6|3.3-V LVTTL;J3|DATA_OUT1|3.3-V LVTTL;J2|DATA_OUT2|3.3-V LVTTL;J1|DATA_OUT3|3.3-V LVTTL;G1|HDCLK_ics662_clkout|3.3-V LVTTL;V5|DOLBY18|3.3-V LVTTL;AA3|U4_XT1_pll1705_out|3.3-V LVTTL;AB3|VCO_OUT3|;AA4|dn3|3.3-V LVTTL;AB4|up3|3.3-V LVTTL;AA5|VCO_OUT1|3.3-V LVTTL;AB5|DN1|3.3-V LVTTL;U9|CBL2_EQ_MUTE|3.3-V LVTTL;AA7|UP1|3.3-V LVTTL;AB7|VCO_OUT2|3.3-V LVTTL;V9|CBL2_EQ_CD_N|3.3-V LVTTL;V10|CBL2_EQ_BYPASS|3.3-V LVTTL;U10|CBL1_EQ_CD_N|3.3-V LVTTL;AA8|dn2|3.3-V LVTTL;AB8|up2|3.3-V LVTTL;AA9|SDI_SEL|3.3-V LVTTL;AB9|MUTE|3.3-V LVTTL;U11|CBL1_EQ_MUTE|3.3-V LVTTL;V11|CBL1_EQ_BYPASS|3.3-V LVTTL;Y10|DAC_D1|3.3-V LVTTL;AA10|DAC_SCLK|3.3-V LVTTL;AB10|DAC_LRCLK|3.3-V LVTTL;AB11|AUDIO_CLOCK|3.3-V LVTTL;Y8|DAC_MCLK|3.3-V LVTTL";
const QSF_AMS81 = "Y22|AES_IN_1|;W22|AES_IN_2|;Y21|AES_IN_3|;W21|AES_IN_4|;U22|AES_IN_5|;U21|AES_IN_6|;U20|AES_IN_7|;R21|AES_IN_8|;V22|AES_OUT_1|;R20|AES_OUT_2|;R19|AES_OUT_3|;V21|AES_OUT_4|;R22|AES_OUT_5|;U19|AES_OUT_6|;R18|AES_OUT_7|;P21|AES_OUT_8|;U2|DATA_OUT_1|;V1|DATA_OUT_2|;V2|DATA_OUT_3|;W1|DATA_OUT_4|;W2|DATA_OUT_5|;Y1|DATA_OUT_6|;Y2|DATA_OUT_7|;AA1|DATA_OUT_8|;A13|AES-5_ref_out|;B12|AES5_REF_MCLK|;C20|DAC_D1|;C21|DAC_LRCK|;C22|DAC_MCK|;B22|DAC_SCLK|;D20|DAC_D2|;F19|DAC_D3|;F20|DAC_D4|;P3|DADA|;P6|DADB|;M3|DADC|;N5|DADM|;M1|DAFS|;P5|EAD|;P4|EABC|;N7|EAFS|;R1|ACS|;M5|DABC|;M4|DADD|;T5|DLM0|;P2|DLM1|;P1|DLM2|;V4|MAP0|;V3|MAP1|;R2|PDN|;M2|PGP|;N2|PLE|;N1|PLS|;T3|PRG0|;U1|PRG2|;T4|PRG1|;B6|DR0A|;A6|DR0B|;B8|DT0A|;A8|DT0B|;B5|RFS0|;B7|TFS0|;A5|RCLK0|;A7|TCLK0|;F8|TP1|;E6|TP2|;G8|TP3|;G7|TP4|;E5|TP5|;C4|TP6|;A11|DSPCLK1|;C10|DSPCLK2|;A20|portc0|;B20|portc1|;A19|portc2|;B19|portc3|;A9|RCLK1|;B9|RFS1|;B10|DR1A|;F9|DT1A|;G9|TCLK1|;C8|TFS1|;C3|TP7|;A18|portc4|;B18|portc5|;A17|portc6|;B17|portc7|;B3|flag0|;A3|flag1|;B4|flag2|;A4|flag3|;D19|portg0|;C19|portg1|;F17|altera37|;G18|altera38|;H17|altera39|;G17|altera41|;J17|altera42|;H18|altera43|;H16|altera44|;H19|altera53|;B21|MUTE|";
const QSF_MLC8N = "Y22|AES_IN_1|;W22|AES_IN_2|;Y21|AES_IN_3|;W21|AES_IN_4|;U22|AES_IN_5|;U21|AES_IN_6|;U20|AES_IN_7|;R21|AES_IN_8|;V22|AES_OUT_1|;R20|AES_OUT_2|;R19|AES_OUT_3|;V21|AES_OUT_4|;R22|AES_OUT_5|;U19|AES_OUT_6|;R18|AES_OUT_7|;P21|AES_OUT_8|;U2|DATA_OUT_1|;V1|DATA_OUT_2|;V2|DATA_OUT_3|;W1|DATA_OUT_4|;W2|DATA_OUT_5|;Y1|DATA_OUT_6|;Y2|DATA_OUT_7|;AA1|DATA_OUT_8|;A13|AES-5_ref_out|;B12|AES5_REF_MCLK|;C20|DAC_D1|;C21|DAC_LRCK|;C22|DAC_MCK|;B22|DAC_SCLK|;D20|DAC_D2|;F19|DAC_D3|;F20|DAC_D4|;P3|DADA|;P6|DADB|;M3|DADC|;N5|DADM|;M1|DAFS|;P5|EAD|;P4|EABC|;N7|EAFS|;R1|ACS|;M5|DABC|;M4|DADD|;T5|DLM0|;P2|DLM1|;P1|DLM2|;V4|MAP0|;V3|MAP1|;R2|PDN|;M2|PGP|;N2|PLE|;N1|PLS|;T3|PRG0|;U1|PRG2|;T4|PRG1|;B6|DR0A|;A6|DR0B|;B8|DT0A|;A8|DT0B|;B5|RFS0|;B7|TFS0|;A5|RCLK0|;A7|TCLK0|;F8|TP1|;E6|TP2|;G8|TP3|;G7|TP4|;E5|TP5|;C4|TP6|;A11|DSPCLK1|;C10|DSPCLK2|;A20|portc0|;B20|portc1|;A19|portc2|;B19|portc3|;A9|RCLK1|;B9|RFS1|;B10|DR1A|;F9|DT1A|;G9|TCLK1|;C8|TFS1|;C3|TP7|;A18|portc4|;B18|portc5|;A17|portc6|;B17|portc7|;B3|flag0|;A3|flag1|;B4|flag2|;A4|flag3|;D19|portg0|;C19|portg1|;F17|altera37|;G18|altera38|;H17|altera39|;G17|altera41|;J17|altera42|;H18|altera43|;H16|altera44|;H19|altera53|;B21|MUTE|;T1|ARCH_FSYNC_PIN|;T2|ARCH_MCLK_PIN|;H7|ARCH_SDIN0_PIN|;J2|ARCH_SDIN1_PIN|;F1|ARCH_SDOUT0_PIN|;E1|ARCH_SDOUT1_PIN|";

/* ---------- shared view kit (same as the other R&D plugins; no globals) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function kv(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows, cls){ return `<table class="kv ${cls||''}"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
const Y = y => SIM.year(y);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hex2 = v => (v&0xFF).toString(16).toUpperCase().padStart(2,'0');
const ms = t => (t*1e3).toFixed(t<0.01?3:1)+' ms';
const OK = '<b style="color:var(--accent)">✓</b>', BAD = '<b style="color:var(--bad)">✗</b>', WARN = '<b style="color:var(--warn)">!</b>';

const LOG = { items: [] };
function act(name, fn){
  const trace = []; const tr = s => trace.push(s);
  try { fn(tr); } catch(e){ tr('error: '+e.message); console.error(e); }
  LOG.items.unshift({ t: SIM.t, name, trace });
  if (LOG.items.length > 60) LOG.items.length = 60;
  SIM.refresh();
}
function traceHTML(){
  const e = LOG.items[0];
  return e ? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>` + e.trace.map(s=>`<div>→ ${s}</div>`).join('')
           : '<div class="muted">Use the controls. Each step the model takes, and the file, register or function it comes from, is listed here.</div>';
}
function blockView(m, B, W, opts){
  opts = opts || {};
  let sel = opts.start || Object.keys(B)[0];
  const vw = opts.w || 760, vh = opts.h || 470;
  m.innerHTML = `<div class="grid2"><div>${card(opts.title||'Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${opts.side? card(opts.sideTitle||'In one sentence', opts.side) : ''}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 ${vw} ${vh}" style="width:100%"><defs><marker id="arBD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; if(!A_||!B_) return; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1);
      const hot = sel===a || sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#arBD)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in B){ const b = B[k]; const on = sel===k; const live = b.live && b.live();
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${live?'color-mix(in srgb,var(--accent) 14%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>
        ${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; draw(); });
    const b = B[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${typeof b.d==='function'?b.d():b.d}</p>${b.src?`<p class="small muted mono">${b.src}</p>`:''}${b.link?`<p class="small">${b.link}</p>`:''}`;
  };
  draw();
  SIM.on('time', draw);
}
function chip(x,y,w,name,left,right,sub){
  const n = Math.max(left.length, right.length), h = 26 + n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function res(x,y,vert,label,val){ // small resistor symbol
  return vert ? `<rect x="${x-5}" y="${y}" width="10" height="26" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${y+11}" font-size="10" fill="var(--ink)">${label}</text><text x="${x+9}" y="${y+23}" font-size="10" fill="var(--ink2)">${val}</text>`
              : `<rect x="${x}" y="${y-5}" width="26" height="10" fill="none" stroke="var(--ink)"/><text x="${x}" y="${y-8}" font-size="10" fill="var(--ink)">${label} ${val}</text>`;
}
function sheetsView(m, SHEETS, label, caption){
  let i = 0;
  m.innerHTML = card(`Schematic set — redrawn from ${label}, not the original CAD`, `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">${caption}</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick = ()=>{ i = +b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">${label} · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note;
  };
  draw();
  SIM.on('time', draw);
}
function tutorialView(m, L, st, opts){
  m.innerHTML = `<div class="grid2">
    <div>${card(opts.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card(opts.panelTitle||'The model', `<div id="tpanel"></div>`)}${card('What the model did (last action)', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw = ()=>{
    opts.panel(m.querySelector('#tpanel'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = L.map((l,i)=>`<li style="cursor:pointer;${i===st.i?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<st.i?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick = ()=>{ st.i = +li.dataset.i; draw(); });
    const l = L[st.i]; let ok = false; try { ok = !!l.check(); } catch(e){ ok = false; }
    m.querySelector('#lesson').innerHTML = `<h2>${l.title}</h2>${l.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (l.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(l.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${st.i?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${st.i<L.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick = ()=>{ st.i = Math.max(0, st.i-1); draw(); };
    m.querySelector('#nxt').onclick = ()=>{ st.i = Math.min(L.length-1, st.i+1); if (L[st.i].enter) L[st.i].enter(); draw(); };
    m.querySelector('#rs').onclick = ()=>{ opts.reset(); st.i = 0; draw(); };
  };
  SIM.on('time', draw);
}
function laneText(c, X, t0, y, h, s, col){ c.fillStyle = col || SIM.css('--ink2'); c.font = '11px '+SIM.css('--sans'); c.fillText(s, X(t0)+6, y+h/2+4); }
function bandAt(c, X, a, b, y, h, col, alpha, label){ c.fillStyle = col; c.globalAlpha = alpha==null?.6:alpha; c.fillRect(X(a), y+3, Math.max(1, X(b)-X(a)), h-6); c.globalAlpha = 1; if (label){ c.font = '10px '+SIM.css('--sans'); if (X(b)-X(a) > c.measureText(label).width+8){ c.fillStyle = '#fff'; c.fillText(label, Math.max(X(a),0)+4, y+h/2+3); } } }
function bindActs(root, map){ root.querySelectorAll('[data-a]').forEach(b=>{ const f = map[b.dataset.a]; if (!f) return; const ev = (b.tagName==='SELECT'||b.tagName==='INPUT')?'onchange':'onclick'; b[ev] = e=>{ if (ev==='onclick') e.preventDefault(); f(b.dataset.v!=null?b.dataset.v:b.value, b); }; }); }
function flowSVG(steps, on, opts){
  opts = opts || {}; const w = opts.w || 520, rh = opts.rh || 30;
  return `<svg viewBox="0 0 ${w} ${steps.length*rh+10}" style="width:100%">${steps.map((s,i)=>{ const hot = i===on, done = opts.done && i<on;
    return `<rect x="6" y="${6+i*rh}" width="${w-12}" height="${rh-7}" rx="6" fill="${hot?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${hot?'var(--accent)':'var(--line)'}" stroke-width="${hot?2:1}" opacity="${done?.7:1}"/>
      <text x="16" y="${6+i*rh+(rh-7)/2+4}" font-size="11.5" fill="var(--ink)">${s}</text>`; }).join('')}</svg>`;
}
/* step-wave helper: draws a 0/1 signal from a list of [t, level] change points */
function wave(c, X, t0, t1, y, h, pts, col, opts){
  opts = opts||{}; const hi = y+5, lo = y+h-5; c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath();
  let lvl = pts.length? pts[0][1] : 0; for (const p of pts){ if (p[0] <= t0) lvl = p[1]; }
  c.moveTo(X(t0), lvl?hi:lo);
  for (const p of pts){ if (p[0] <= t0 || p[0] >= t1) continue; const x = X(p[0]); c.lineTo(x, lvl?hi:lo); lvl = p[1]; c.lineTo(x, lvl?hi:lo); }
  c.lineTo(X(t1), lvl?hi:lo); c.stroke();
  if (opts.fillHigh){ c.globalAlpha=.12; c.fillStyle=col; let l2 = pts.length?pts[0][1]:0, a=t0; for (const p of pts){ if (p[0]<=t0){ l2=p[1]; continue; } if (p[0]>=t1) break; if (l2) c.fillRect(X(a),hi,X(p[0])-X(a),lo-hi); a=p[0]; l2=p[1]; } if (l2) c.fillRect(X(a),hi,X(t1)-X(a),lo-hi); c.globalAlpha=1; }
}

/* ================= decoded archive tables ================= */
const ROWS = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','R','T','U','V','W','Y','AA','AB'];
const BALL = {};
BALLS_RAW.split(';').forEach(s=>{ const [b,bank,fn,opt,cfg,dp] = s.split('|'); BALL[b] = {b,bank,fn,opt,cfg,dp}; });
const U4NET = {}; U4_RAW.split(';').forEach(s=>{ const i = s.indexOf('='); U4NET[s.slice(0,i)] = s.slice(i+1); });
const qp = raw => raw.split(';').map(s=>{ const [b,n,io] = s.split('|'); return {b,n,io}; });
const PINS = { ams16: qp(QSF_AMS16), ams8e: qp(QSF_AMS81), mlc8n: qp(QSF_MLC8N) };
const CE55 = new Set(CE55_CHANGED);
const ballXY = b => { const m = /^([A-Z]+)(\d+)$/.exec(b); return m ? [ +m[2]-1, ROWS.indexOf(m[1]) ] : [0,0]; };

/* ---------- devices: CycloneIv_Price_Comparison.xls + cyclone4-handbook Table 1-1, IDCODE table, Table 8-2 ---------- */
const DEV = {
  'EP4CE30F23C8N': { fam:'Cyclone IV E', die:'CE30', les:28848, memK:594, mult:66, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:8, list:39.92, quote:22.36, src:'price sheet' },
  'EP4CE30F23C7N': { fam:'Cyclone IV E', die:'CE30', les:28848, memK:594, mult:66, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:7, list:49.90, src:'price sheet' },
  'EP4CE30F23I7N': { fam:'Cyclone IV E', die:'CE30', les:28848, memK:594, mult:66, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:7, ind:true, list:55.00, src:'BOM Summary Tool, Arrow 2012-02-01; AMS8E-1 ISS5.xlsx note' },
  'EP4CE40F23C6N': { fam:'Cyclone IV E', die:'CE40', les:39600, memK:1134, mult:116, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:6, list:99.55, quote:55.75, src:'price sheet' },
  'EP4CE40F23C7':  { fam:'Cyclone IV E', die:'CE40', les:39600, memK:1134, mult:116, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:7, list:91.26, quote:46.46, src:'price sheet' },
  'EP4CE40F23I7N': { fam:'Cyclone IV E', die:'CE40', les:39600, memK:1134, mult:116, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:7, ind:true, list:99.55, src:'price sheet' },
  'EP4CE40F23C8N': { fam:'Cyclone IV E', die:'CE40', les:39600, memK:1134, mult:116, pll:4, io:328, rbf:9534304, id:0x020F40DD, sg:8, list:66.37, src:'price sheet (typed “epce40f23c8n”)' },
  'EP4CE55F23C8':  { fam:'Cyclone IV E', die:'CE55', les:55856, memK:2340, mult:154, pll:4, io:324, rbf:14889560, id:0x020F50DD, sg:8, list:null, src:'pinouts/EP4CE55.xls only (no price)' },
  'EP2C35F484C6N': { fam:'Cyclone II', die:'2C35', les:33216, memK:472.5, mult:35, pll:4, io:null, rbf:null, id:null, sg:6, list:136, quote:'≈100', src:'price sheet; Arrow $99.10 (2011-03-07)' },
  'EP2C35F484C7N': { fam:'Cyclone II', die:'2C35', les:33216, memK:472.5, mult:35, pll:4, io:null, rbf:null, id:null, sg:7, list:113.30, src:'price sheet' },
  'EP2C35F484C8':  { fam:'Cyclone II', die:'2C35', les:33216, memK:472.5, mult:35, pll:4, io:null, rbf:null, id:null, sg:8, list:99.77, src:'price sheet' },
  'EP1C12Q240C8':  { fam:'Cyclone', die:'1C12', les:12060, memK:234, mult:0, pll:2, io:null, rbf:null, id:null, sg:8, list:39.05, src:'price sheet' },
};
/* "LE's used in project" rows of the price sheet */
const NEEDS = [
  { p:'M6205', les:30000, repl:'EP4CE40F23C6N', cur:'EP2C35F484C6N', qty:7 },
  { p:'M6204', les:null,  repl:'EP4CE40F23C6N', cur:'EP2C35F484C6N', qty:4 },
  { p:'M6202', les:null,  repl:'',              cur:'EP1C12-240',    qty:null },
  { p:'AMS16', les:16860, repl:'EP4CE30F23C8N', cur:'EP2C35F484C8',  qty:46 },
  { p:'POD32', les:null,  repl:'',              cur:'',              qty:null },
  { p:'DEMUX-3', les:null, repl:'',             cur:'EP1C12-240',    qty:75 },
  { p:'32 Channel audio meter', les:null, repl:'EP4CE30F23C6N', cur:'N/A', qty:null },
];
/* serial flash: cyc_c51014EPCSDevicesDatasheet Table 3-1 (bits), Table 3-14 (silicon ID) */
const FLASH = {
  'EPCS1':  { bits:1048576,  sid:0x10, note:'named in AMS81.qsf (CYCLONE_CONFIGURATION_DEVICE EPCS1)' },
  'EPCS4':  { bits:4194304,  sid:0x12 },
  'EPCS16': { bits:16777216, sid:0x14, note:'what AMS81.cdf / AMS16TEST.cdf program (PartName EPCS16)' },
  'M25P16': { bits:16777216, sid:0x14, note:'fitted on both boards (U12 AMS16-3G, U13 AMS8E-1 iss5); EPCS16-compatible '+'(inferred: same opcodes and size)' },
  'EPCS64': { bits:67108864, sid:0x16 },
};
const OPS = { 0x03:{ n:'Read bytes', dummy:0, fmax:20e6 }, 0x0B:{ n:'Fast read', dummy:8, fmax:40e6 } };

/* ---------- the three products that carried the decision ---------- */
const PROD = {
  ams16: { short:'AMS16-3G', label:'AMS16-3G v700 (24 Oct 2012|45)', plugin:'ams16', qsfDev:'EP4CE30F23C8', bom:'EP4CE30F23I7N (U3, AMS163G-ISS7-BOM.xls)', dflt:'EP4CE30F23I7N', was:'EP2C35F484C8', need:16860,
    qsf:'AMS16 - #Master/…/AMS16-3G v700 October 24 2012/Altera/AMS16TEST.qsf (created 20 Oct 2011 in Quartus 10.1, last 11.1)', cdf:'AMS16TEST.cdf: PartName(EPCS16) AMS16TEST.pof, ActionCode(Ign)', cfgDev:'(none — CYCLONEIII_CONFIGURATION_SCHEME "ACTIVE SERIAL")',
    flashRef:'U12', board:false, msel:null, boot:'ams16',
    plls:[ {inst:'altpll1', net:'RCVR_PCLK', ball:'T22', fin:148.5e6, outs:[['c0',148.5e6,0],['c1',148.5e6,180]], src:'altpll1.vhd: inclk0 6734 ps, clk0 ×1, clk1 ×1 phase 3367 ps'} ],
    clkpins:[ ['RCVR_PCLK','T22','GS2970A parallel clock, 148.5 MHz (3G) / 27 MHz (SD) per ams163g.sdc'], ['AUDIO_CLOCK','AB11','PLL1705 mclk 12.288 MHz (81.38 ns, ams163g.sdc)'], ['HDCLK_ics662_clkout','G1','ICS662 74.25 MHz (mclkSync.v comment)'] ] },
  ams8e: { short:'AMS8E-1 iss5 (AMS81)', label:'AMS8E-1 iss5 main board · AMS81 V050000', plugin:'ams8e', qsfDev:'EP4CE40F23C6', alt:'EP4CE30F23I7 (revision ams81-ep4ce30.qsf, created 1 Apr 2013)', bom:'EP4CE40F23C6N (U4, ALTIUM.csv) → EP4CE30F23I7N (MISYS 22 Mar 2013, 2016 BOMs)', dflt:'EP4CE40F23C6N', was:'EP1C6Q240C7 (pre-iss5 AMS81, RD60 README)', need:null,
    qsf:'AMS81 - #Master/…/AMS8 - #Software #Altera #V050000/AMS81.qsf (created 18 Nov 2004, Quartus 4.1 SP2; last 11.1)', cdf:'AMS81.cdf: PartName(EPCS16) AMS81.pof, ChainType(asc)', cfgDev:'CYCLONE_CONFIGURATION_DEVICE EPCS1',
    flashRef:'U13', board:true, msel:'0010', boot:'ams8e',
    plls:[ {inst:'altpll2 (inst60)', net:'DSPCLK1', ball:'A11', fin:12.288e6, outs:[['c0',98.304e6,0]], src:'altpll2.v: inclk0 81380 ps, clk0 ×8; AMS81.sdc dsppllout_98M304'},
           {inst:'altpll1 (inst59)', net:'AES5_REF_MCLK', ball:'B12', fin:12.288e6, outs:[['c0',98.304e6,0]], src:'altpll1.v: inclk0 81380 ps, clk0 ×8; AMS81.sdc cs8416pllout_98M304'},
           {inst:'altpll0 (inst39)', net:'(input not traced)', ball:null, fin:24.576e6, outs:[['c0',98.304e6,0],['c1',12.288e6,0]], src:'altpll0.v: inclk0 40690 ps, clk0 ×4, clk1 ÷2'} ],
    clkpins:[ ['DSPCLK1','A11','12.288 MHz (dspref_12M288, AMS81.sdc)'], ['AES5_REF_MCLK','B12','12.288 MHz CS8416 reference (cs8416ref_12M288)'] ] },
  mlc8n: { short:'MLC8N', label:'MLC8N v050000 (4 Nov 2015|48) on AMS8E-1 iss5', plugin:'mlc8', qsfDev:'EP4CE40F23C6', alt:'EP4CE30F23I7 (ams81-ep4ce30.qsf, 102 pins)', bom:'EP4CE30F23I7N (AMS8E-1-ISS5-BOM-updated.xlsx, 2016)', dflt:'EP4CE30F23I7N', was:'MLC8A main board AMS8-1 (Cyclone EP1C6)', need:null,
    qsf:'#MLC - #SERIES/…/MLC8N - #Software #ALTERA #v050000/AMS81.qsf (108 pins incl. RD85 Archwave)', cdf:'(as AMS81)', cfgDev:'CYCLONE_CONFIGURATION_DEVICE EPCS1',
    flashRef:'U13', board:true, msel:'0010', boot:'mlc8n',
    plls:[ {inst:'altpll2 (inst60)', net:'DSPCLK1', ball:'A11', fin:12.288e6, outs:[['c0',98.304e6,0]], src:'AMS81.sdc'},
           {inst:'altpll1 (inst59)', net:'AES5_REF_MCLK', ball:'B12', fin:12.288e6, outs:[['c0',98.304e6,0]], src:'AMS81.sdc'} ],
    clkpins:[ ['DSPCLK1','A11','12.288 MHz'], ['AES5_REF_MCLK','B12','12.288 MHz'], ['ARCH_MCLK_PIN','T2','ARCH_REF_12M288 (RD85 Archwave)'], ['ARCH_FSYNC_PIN','T1','ARCH_FSYNC_48K'] ] },
};
const VCCIO = { ams16:{1:3.3,2:3.3,3:3.3,4:1.8,5:1.8,6:1.8,7:1.8,8:3.3}, ams8e:{1:3.3,2:3.3,3:3.3,4:3.3,5:3.3,6:3.3,7:3.3,8:3.3}, mlc8n:{1:3.3,2:3.3,3:3.3,4:3.3,5:3.3,6:3.3,7:3.3,8:3.3} };

/* ---------- timing constants ---------- */
const AVR_HZ = 4915200;                       // X1 (AMS16 BOM) / X2 → U14 XTAL (AMS8E-1 IPC netlist), 4.9152 MHz
const TW16 = n => (7*n + 3)/AVR_HZ;           // common.lis wait(): wdr+subi+sbci+cpi+cpc+brne = 7 cycles per pass
const TWMS = n => (807*n + 8)/AVR_HZ;         // v200w.lis wait_ms(): 100 × (wdr subi sbci cpi ldi cpc brlt = 8) + 8 = 807 cycles per "ms"
const T_CF2ST1 = 230e-6, T_ST2CK = 2e-6, T_CD2UM = 650e-6, T_CD2UM_MIN = 300e-6;   // cyiv-51008 Table 8-11
const T_LOCK = 1e-3;                          // PLL lock — inferred (datasheet value not archived)
const JTAG_HZ = 6e6;                          // USB-Blaster TCK — inferred
const COMP = 0.6;                             // compressed size factor — inferred from "35 % to 55 %" (EPCS datasheet)
const DUR = 1.5;

/* ================= state ================= */
const D0 = () => ({ prod:'ams16', dev:'EP4CE30F23I7N', flash:'M25P16', dclk:30, por:'std', porMs:100, avrStart:65, op:0x0B, comp:false, legacy:false, events:[], sel:'T22', seen55:false, hdl:'clkdiv', hcyc:[], hst:null });
let D = D0();
function reset(){ D = D0(); LOG.items = []; hdlReset(); SIM.seek(0); SIM.refresh(); }
const P = () => PROD[D.prod];
const dv = () => DEV[D.dev];

/* ---------- ATmega128 main() as a list of timed steps (product specific) ---------- */
function bootSteps(){
  const S = [], st = D.avrStart*1e-3;
  const add = (n, d, fx, src) => S.push({ n, d, fx: fx||{}, src: src||'' });
  add('reset start-up (CKSEL/SUT fuses) '+'(inferred)', st, {});
  if (D.prod==='ams16'){
    add('initialization(): port_init — PORTB=BIT7 (GLOBAL_RESET high), DDRE=BIT3, PORTE=0 (NCE low)', 0.0005, {gr:1}, 'ams16.c '+'(duration inferred)');
    add('ALTERA_FSYNCH_LOW; CAT_RESET; wait(4500)', TW16(4500), {}, 'ams16.c main()');
    add('SHARC_RESET(1000): PORTD7 low, wait(1000)', TW16(1000), {}, 'sharc.c');
    add('wait(3000)', TW16(3000), {}, 'ams16.c');
    add('wait(50000) ×5', 5*TW16(50000), {}, 'ams16.c');
    add('NORMAL_OPERATION; wait(50000) ×2', 2*TW16(50000), {gr:1}, 'altera.h: PORTB |= BIT7');
    add('GLOBAL_RESET; wait(50000) ×2', 2*TW16(50000), {gr:0}, 'altera.h: PORTB &= ~BIT7');
    add('NORMAL_OPERATION; wait(50000) ×2', 2*TW16(50000), {gr:1}, 'ams16.c');
    add('initAlteraSpi(); alteraSpiRead(0x16); alteraSpiWrite(ALTERA_REG_DES_RESET) — GS2970A out of reset; wait(50000)', TW16(50000), {spi:1, des:1}, 'ams16.c / altspi.c');
    add('alteraSpiRead(0x14); alteraSpiWrite(ALTERA_REG_SER_RESET) — GS2962; wait(50000)', TW16(50000), {spi:1}, 'ams16.c');
    add('ALTERA_REG_FPGA_MODE 0x01 → 0x00 (“loopback to get clock to lock up”); gs2970AInit(); ALTERA_SORT(); ALTERA_read_write()', 0.004, {spi:1}, 'ams16.c '+'(duration inferred)');
    add('while(1): WDR(); if (isAlteraReady()) … else fpgaReprogrammed = YES', 0, {loop:1}, 'ams16.c, altera.c: return PIND & BIT6 (CONF_DONE)');
  } else {
    const v105 = D.prod==='mlc8n';
    add(`initialization(): port_init — PORTB=0xF4 → PB7 ALTERA_RESET=1 → Q1 pulls nCONFIG low; PORTA=0x8F, DDRA=0xC0 ${D.legacy?'<b>(legacy: PORTA=0xFF, DDRA=0xF0 → NCE driven high)</b>':''}; CS8416_write_ALL ×5`, 0.0004, {hold:1}, v105?'RD66 v100w.c port_init (3 Apr 2013)':'RD60 v200w.c port_init (21 Jan 2013)');
    add('PORTG &= ~BIT0 (hold TDM FSYNC low); wait_ms(500) ×9', 9*TWMS(500), {hold:1}, 'main()');
    add('CONFIGURE_ALTERA(): ALTERA_IN_RESET(); wait_ms(100) ×2', 2*TWMS(100), {hold:1}, 'CONFIGURE_ALTERA()');
    add('ALTERA_IN_NORMAL_OPERATION(): PORTB &= ~0x80 → Q1 off → nCONFIG released (R183 1 k pull-up)', 0, {release:1}, 'CONFIGURE_ALTERA()');
    if (v105) add('wait_ms(500) ×6 (added in the MLC8 v105 port)', 6*TWMS(500), {}, 'RD66 v100w.c main()');
    add(v105?'RECALL_LAST_SETTINGS(); ALTERA_TRANSLATE_UART0(); ALTERA_SORT(); ALTERA_read_write()':'RECALL_MODE/MIX_FROM_EEPROM(); ALTERA_TRANSLATE_UART0(); ALTERA_SORT(); ALTERA_read_write()', 0.003, {spi:1, first:1}, 'main() '+'(duration inferred)');
    add('init_CS8416(); RESET_SHARC(); PORTG |= BIT0', 0.002, {}, 'main()');
    add('while(1): WDR(); … ALTERA_read_write() each pass', 0, {loop:1}, 'main()');
  }
  let t = 0; S.forEach(s=>{ s.t0 = t; t += s.d; s.t1 = t; });
  return S;
}

/* ---------- FPGA configuration engine (Cyclone IV handbook ch. 8) ---------- */
let TLc = null;
function TL(){
  const key = JSON.stringify([D.prod,D.dev,D.flash,D.dclk,D.por,D.porMs,D.avrStart,D.op,D.comp,D.legacy,D.events]);
  if (TLc && TLc.key === key) return TLc;
  const d = dv(), steps = bootSteps(), f = D.dclk*1e6, op = OPS[D.op];
  const tPOR = (D.por==='fast'? clamp(D.porMs,3,9) : clamp(D.porMs,50,200))*1e-3;
  const isCIV = d.fam==='Cyclone IV E';
  const bits = d.rbf ? Math.round(d.rbf*(D.comp?COMP:1)) : 9534304;
  const cmdBits = 8 + 24 + op.dummy;
  const fits = FLASH[D.flash].bits >= bits;
  // nCONFIG low intervals: AVR (ATmega → Q1) and user pulses
  const low = [];
  const hold = steps.filter(s=>s.fx.hold), rel = steps.find(s=>s.fx.release);
  if (hold.length) low.push([hold[0].t0, rel ? rel.t0 : 1e9, 'ALTERA_RESET (PB7 → Q1)']);
  const nceHighFrom = (D.legacy && hold.length) ? hold[0].t0 : null;
  D.events.filter(e=>e.k==='ncfg').forEach(e=> low.push([e.t, e.t+1e-3, 'nCONFIG pulse']));
  low.sort((a,b)=>a[0]-b[0]);
  const isLow = t => low.find(l=> t>=l[0] && t<l[1]);
  const jt = D.events.filter(e=>e.k==='jtag').map(e=>e.t).sort((a,b)=>a-b);
  const att = []; let t = tPOR, guard = 0;
  while (t < DUR && guard++ < 20){
    const L = isLow(t); if (L){ t = L[1]; if (t>=DUR) break; }
    const a = { start:t, nst: t+T_CF2ST1 }; a.ck = a.nst + T_ST2CK;
    if (!isCIV){ a.fail = d.fam+': the .pof/.rbf for this project is a Cyclone IV E image'; att.push(a); break; }
    if (nceHighFrom!=null && a.ck >= nceHighFrom){ a.fail = 'nCE high — AS configuration never starts (legacy port_init drives PA4 = NCE high)'; att.push(a); break; }
    a.cmdEnd = a.ck + cmdBits/f; a.done = a.cmdEnd + bits/f; a.user = a.done + T_CD2UM;
    if (!fits){ a.fail = `image (${bits.toLocaleString()} bits) larger than ${D.flash} (${FLASH[D.flash].bits.toLocaleString()} bits)`; a.done = a.user = null; }
    const nl = low.find(l=> l[0] > t && l[0] < (a.user||1e9));
    const nj = jt.find(x=> x > t && x < (a.user||1e9));
    if (nl && (!nj || nl[0] < nj)){ a.abort = nl[0]; a.abortBy = nl[2]; att.push(a); t = nl[0]; continue; }
    if (nj!=null){ a.abort = nj; a.abortBy = 'JTAG'; att.push(a); const j = { start:nj, jtag:true, done: nj + (d.rbf||9534304)/JTAG_HZ }; j.user = j.done + T_CD2UM; att.push(j); t = j.user; const nl2 = low.find(l=> l[0] > nj); if (!nl2) break; t = Math.max(t, nl2[0]); continue; }
    att.push(a);
    if (!a.user) break;
    const later = low.find(l=> l[0] >= a.user); const lj = jt.find(x=> x >= a.user);
    if (lj!=null && (!later || lj < later[0])){ const j = { start:lj, jtag:true, done: lj + (d.rbf||9534304)/JTAG_HZ }; j.user = j.done + T_CD2UM; att.push(j); t = j.user; continue; }
    if (!later) break; t = later[0];
  }
  // user-mode intervals
  const user = []; att.forEach(a=>{ if (a.user!=null && a.user < DUR){ const next = att[att.indexOf(a)+1]; user.push([a.user, next? next.start : 1e9]); } });
  const inUser = t => !!user.find(u=> t>=u[0] && t<u[1]);
  const firstUser = user.length ? user[0][0] : null;
  // AMS16: dynamic recovery — main loop finds CONF_DONE low → fpgaReprogrammed → resetAndInit()
  const ex = { };
  if (D.prod==='ams16'){
    const loop = steps.find(s=>s.fx.loop), des = steps.find(s=>s.fx.des);
    ex.loopAt = loop.t0;
    ex.gr = steps.filter(s=>s.fx.gr===0).map(s=>[s.t0, s.t1]);
    ex.desOk = inUser(des.t0);
    ex.pclk = ex.desOk ? des.t0 : null;
    if (!inUser(ex.loopAt)){
      const u = user.find(u=> u[0] >= ex.loopAt) || user.find(u=> u[1] > ex.loopAt);
      if (u){ const r0 = Math.max(u[0], ex.loopAt) + 0.0002; ex.reinit = r0;
        const T = TW16(50000);
        ex.reinitSteps = [ ['resetAndInit(): NORMAL_OPERATION; wait ×2', r0, r0+2*T], ['GLOBAL_RESET; wait ×2', r0+2*T, r0+4*T], ['NORMAL_OPERATION; wait ×2', r0+4*T, r0+6*T], ['initAlteraSpi(); read 0x16; waitMillis(50); DES_RESET', r0+6*T, r0+6*T+TW16(35000)] ];
        ex.gr.push([r0+2*T, r0+4*T]);
        if (!ex.pclk) ex.pclk = r0+6*T+TW16(35000);
      }
    }
    ex.grSeen = ex.gr.map(g=> inUser(g[0]) && inUser(g[1]));
  } else {
    const first = steps.find(s=>s.fx.first);
    ex.firstAccess = first.t0; ex.firstOk = inUser(first.t0);
    ex.firstGood = ex.firstOk ? first.t0 : (user.find(u=>u[1] > first.t0)||[null])[0];
  }
  // PLL lock
  const plls = P().plls.map(p=>{ let src = firstUser;
    if (D.prod==='ams16') src = (ex.pclk!=null && firstUser!=null) ? Math.max(firstUser, ex.pclk) : null;
    return Object.assign({}, p, { lock: src!=null ? src + T_LOCK : null }); });
  TLc = { key, steps, tPOR, bits, cmdBits, f, fits, low, att, user, inUser, firstUser, ex, plls, nceHighFrom };
  return TLc;
}
function stateAt(t){
  const T = TL();
  if (t < T.tPOR) return { s:'POR', d:'power-on reset: nSTATUS and CONF_DONE held low' };
  for (let i=T.att.length-1; i>=0; i--){ const a = T.att[i]; if (t < a.start) continue;
    if (a.abort!=null && t >= a.abort) return { s:'RESET', d:`configuration aborted by ${a.abortBy}` };
    if (a.jtag){ if (t < a.done) return { s:'JTAG', d:'JTAG configuration from the USB-Blaster (CONF_DONE low)' }; if (t < a.user) return { s:'INIT', d:'initialising' }; return { s:'USER', d:'user mode (configured over JTAG)' }; }
    if (a.fail && t >= a.start) return { s:a.fail.startsWith('nCE')?'STALL':'ERROR', d:a.fail, a };
    if (t < a.nst) return { s:'RESET', d:'nCONFIG high → nSTATUS release (tCF2ST1)', a };
    if (t < a.ck) return { s:'CFG', d:'nSTATUS high, waiting tST2CK', a };
    if (t < a.cmdEnd) return { s:'CMD', d:'AS command on ASDO', a, bit: Math.floor((t-a.ck)*T.f) };
    if (t < a.done) return { s:'DATA', d:'reading configuration data on DATA0', a, bit: Math.floor((t-a.cmdEnd)*T.f) };
    if (t < a.user) return { s:'INIT', d:'CONF_DONE high — initialisation (tCD2UM)', a };
    return { s:'USER', d:'user mode: the design runs', a };
  }
  const L = T.low.find(l=> t>=l[0] && t<l[1]);
  return { s:'RESET', d: L? `nCONFIG held low by ${L[2]}` : 'waiting for nCONFIG' };
}
const STATE_COL = { POR:'--ink2', RESET:'--bad', CFG:'--warn', CMD:'--warn', DATA:'--warn', INIT:'--accent2', USER:'--accent', JTAG:'--accent2', ERROR:'--bad', STALL:'--bad' };
const sigAt = (t) => { const s = stateAt(t).s; return { nstatus: !['POR','RESET'].includes(s) && s!=='ERROR'?1:0, confdone: ['INIT','USER'].includes(s)?1:0, ncso: ['CMD','DATA'].includes(s)?0:1 }; };
function avrStepAt(t){ const S = TL().steps; let i = S.findIndex(s=> t>=s.t0 && t<s.t1); if (i<0) i = S.length-1; return i; }

/* ================= actions (each logs the real file / register / function path) ================= */
const pinMap = () => { const m = {}; PINS[D.prod].forEach(p=> m[p.b] = p); return m; };
function setZoom(v){ SIM.win = v; const z = document.querySelector('#zoomSel'); if (z){ const o = [...z.options].find(o=> Math.abs(+o.value - v) < v*1e-6); if (o) z.value = o.value; } }
const A = {
  prod(k){ act('Product → '+PROD[k].short, tr=>{ D.prod = k; D.dev = PROD[k].dflt; D.events = []; const p = PROD[k];
    tr(`${p.qsf}`); tr(`DEVICE ${p.qsfDev}${p.alt?' · alternate '+p.alt:''}; BOM ${p.bom}`); tr(`${PINS[k].length} set_location_assignment lines; ${p.cfgDev}; ${p.cdf}`);
    if (p.board) tr('board AMS8E-1 iss5: MSEL[3..0] = GND,GND,+2V5,GND = 0010 → AS, standard POR, 3.3 V (Ams8e-1iss5-net.ipc)'); }); },
  dev(v){ act('Device → '+v, tr=>{ D.dev = v; if (v.startsWith('EP4CE55')) D.seen55 = true; const d = dv(), p = P();
    tr(`${d.fam}: ${d.les.toLocaleString()} LEs, ${d.memK} Kbit M9K, ${d.mult} 18×18, ${d.pll} PLLs (cyclone4-handbook Table 1-1)`);
    tr(d.list!=null? `list $${d.list.toFixed(2)}${d.quote!=null?' · quoted $'+d.quote:''} (${d.src})` : `no price (${d.src})`);
    if (d.id) tr(`JTAG IDCODE 0x${d.id.toString(16).toUpperCase().padStart(8,'0')} · .rbf ${d.rbf.toLocaleString()} bits (Table 8-2)`);
    const q = DEV[p.qsfDev+'N'] || DEV[p.qsfDev]; if (q && d.id && q.id) tr(d.id===q.id? `same IDCODE and .rbf size as the compiled device ${p.qsfDev} → the image loads` : `IDCODE differs from ${p.qsfDev} → the .sof/.pof must be recompiled`); }); },
  flash(v){ act('Configuration flash → '+v, tr=>{ D.flash = v; const T = TL(); tr(`${v}: ${FLASH[v].bits.toLocaleString()} bits, silicon ID 0x${hex2(FLASH[v].sid)}${FLASH[v].note?' — '+FLASH[v].note:''}`);
    tr(T.fits? `${T.bits.toLocaleString()}-bit image fits (${(T.bits/FLASH[v].bits*100).toFixed(0)} %)` : `image ${T.bits.toLocaleString()} bits does NOT fit — “EPCS1 does not support Cyclone IV devices because of its insufficient memory capacity” (cyiv-51008, p. 8-12)`); }); },
  op(v){ act('AS read opcode → 0x'+hex2(+v), tr=>{ D.op = +v; const o = OPS[D.op]; tr(`${o.n}: opcode ${(+v).toString(2).padStart(8,'0')}, 3 address bytes, ${o.dummy/8} dummy byte, DCLK fMAX ${o.fmax/1e6} MHz (EPCS Table 3-8)`); if (D.dclk*1e6 > o.fmax) tr(`⚠ DCLK ${D.dclk} MHz exceeds ${o.fmax/1e6} MHz for this opcode`); tr('which opcode the Cyclone IV AS engine issues is not stated in the archive '+'(inferred)'); }); },
  dclk(v){ act(`DCLK → ${v} MHz`, tr=>{ D.dclk = clamp(+v,20,40); const T = TL(); tr(`internal oscillator, 20–40 MHz over PVT (Cyclone IV E, cyiv-51008 p. 8-11): ${T.bits.toLocaleString()} bits + ${T.cmdBits} command bits → ${ms((T.bits+T.cmdBits)/T.f)}`); tr('Eq. 8-3: 9,600,000 bits × 50 ns = 480 ms worst case'); }); },
  por(v){ act('POR → '+v, tr=>{ D.por = v; D.porMs = v==='fast'? 6 : 100; tr(v==='fast'? 'MSEL fast POR (MSEL 1101 for 3.3 V) — 3–9 ms '+'(inferred, Cyclone IV datasheet not archived)' : 'MSEL standard POR (0010 on AMS8E-1 iss5) — 50–200 ms '+'(inferred)'); }); },
  porMs(v){ act(`POR delay → ${v} ms`, tr=>{ D.porMs = +v; tr('the POR time inside the allowed range is set by silicon, not by the board '+'(inferred)'); }); },
  avr(v){ act(`ATmega start-up → ${v} ms`, tr=>{ D.avrStart = clamp(+v,0,70); tr('CKSEL/SUT fuses are not archived; ATmega128 crystal start-up is 16K CK up to +64 ms '+'(inferred)'); }); },
  comp(v,el){ act('On-chip decompression '+(el.checked?'ON':'OFF'), tr=>{ D.comp = !!el.checked; tr(`AMS16TEST.qsf has ON_CHIP_BITSTREAM_DECOMPRESSION OFF; compressed size ×${COMP} ${inf}`); }); },
  legacy(v,el){ act('port_init '+(el.checked?'before':'after')+' 21 Jan 2013', tr=>{ D.legacy = !!el.checked; tr(el.checked? '// PORTA = 0xFF; DDRA = 0xF0 → PA4 is an output driven high; on iss5 PA4 is NCE (U14.47 → U4.L3) → nCE high blocks AS configuration' : 'PORTA = 0x8F; DDRA = 0xC0 → PA4 input; R182 1 k holds NCE low'); }); },
  power(){ act('Power on (restart)', tr=>{ D.events = []; SIM.seek(0); const T = TL(); tr(`POR ends ${ms(T.tPOR)}; first configuration starts ${ms(T.att[0]? T.att[0].start : NaN)}`); }); },
  ncfg(){ act('Pulse nCONFIG low (1 ms) at '+SIM.fmtT(SIM.t), tr=>{ D.events.push({k:'ncfg', t:SIM.t}); tr('tCFG ≥ 500 ns; nSTATUS and CONF_DONE go low within 500 ns; on release the device re-reads the flash from address 0'); if (P().board) tr('on AMS8E-1 the ATmega can do this through PB7 → R181 10 k → Q1 (2N4401) → N_CONFIG, or PE3 directly (U14.5)'); if (D.prod==='ams16') tr('AMS16 main loop: isAlteraReady() reads CONF_DONE (PIND & BIT6) → fpgaReprogrammed = YES → resetAndInit() when it returns'); }); },
  jtag(){ act('USB-Blaster: JTAG .sof download at '+SIM.fmtT(SIM.t), tr=>{ D.events.push({k:'jtag', t:SIM.t}); const n = (dv().rbf||9534304); tr(`CONF_DONE low while ${n.toLocaleString()} bits shift in at TCK ${JTAG_HZ/1e6} MHz ${inf} → ${ms(n/JTAG_HZ)}`); tr('JTAG configuration overrides MSEL (cyiv-51008 Table 8-5 note 2)'); if (D.prod==='ams16') tr('ams16.c: while(1){ if (isAlteraReady()) … else fpgaReprogrammed = YES; } → resetAndInit() after the download'); else tr('AMS8E-1 Atmel cannot see CONF_DONE (U4.M18 → R184, H2.3 only) — it keeps calling ALTERA_read_write() into an unconfigured part'); }); },
  pof(){ act('Program '+(D.prod==='ams16'?'AMS16TEST':'AMS81')+'.pof through the AS header', tr=>{ const pages = Math.ceil((dv().rbf||9534304)/8/256);
    tr('USB-Blaster in AS mode drives nCONFIG low (H2.5) and nCE high (H2.6), then talks to the flash directly on DCLK/ASDI/NCS/CNF_DATA');
    tr(`erase bulk ${D.flash==='EPCS64'?'68':'17'} s typ, then ${pages.toLocaleString()} pages × tWB 1.5 ms typ = ${(pages*1.5e-3).toFixed(1)} s (EPCS Table 3-16)`);
    D.events.push({k:'ncfg', t:SIM.t}); tr('the FPGA reconfigures from the new image when the cable releases nCONFIG'); }); },
  sel(b){ act('Select '+b, tr=>{ D.sel = b; const B = BALL[b]; const pm = pinMap()[b];
    if (B){ tr(`ball ${b}: bank ${B.bank}, ${B.fn}${B.opt?' / '+B.opt:''}${B.cfg?' / '+B.cfg:''}${B.dp?' / '+B.dp:''} (pinouts/EP4CE30.xls = EP4CE40.xls)`);
      tr(pm? `${PROD[D.prod].short}: ${pm.n}${pm.io?' · '+pm.io:''} (set_location_assignment PIN_${b})` : 'not assigned in this product');
      if (P().board) tr(`AMS8E-1 iss5 net: ${U4NET[b]||'(unconnected)'}`); if (CE55.has(b)) tr('this ball changes role on EP4CE55 F484'); }
    else tr(REFINFO[b] ? REFINFO[b]() : b); }); },
  goto(v){ const T = TL(); const a = T.att.find(x=>!x.jtag && x.ck && !x.fail) || T.att[0];
    const map = { por:[T.tPOR, 0.01], ck:[a&&a.ck? a.ck - 0.2e-6 : 0, 0.000002], data:[a&&a.cmdEnd? a.cmdEnd - 0.3e-6:0, 0.000002], done:[a&&a.done? a.done : 0, 0.001], user:[T.firstUser||0, 0.01], first:[(T.ex.firstAccess!=null?T.ex.firstAccess:T.ex.loopAt)||0, 0.5], whole:[0.75, 1.5] };
    const [t, z] = map[v]; setZoom(z); SIM.seek(t); },
};
const REFS = { U4:[116,172,124,124,'top'], U13:[25,106,53,57,'top'], H2:[308,17,60,15,'th'], JTAG1:[393,17,60,15,'th'], Q1:[325,44,12,13,'bottom'], R97:[189,145,10,9,'top'], R182:[343,47,10,9,'top'], R183:[333,47,10,9,'top'], R184:[314,42,9,10,'top'], R186:[175,201,9,10,'bottom'], U14:[378,328,92,92,'bottom'] };
const REFINFO = {
  U4: ()=> `U4 ${D.dev} (BOM: EP4CE40F23C6N in ALTIUM.csv, EP4CE30F23I7N in MISYS/2016) — state ${stateAt(SIM.t).s}: ${stateAt(SIM.t).d}`,
  U13: ()=> 'U13 M25P16-VMF6P: 1 HOLD, 2 VCC, 7 S# = NCS, 8 Q = CNF_DATA (→ R97 → U4.K1 DATA0), 15 D = ASDI (U4.D1), 16 C = DCLK (U4.K2), 9 W# +3V3, 10 GNDD',
  H2: ()=> 'H2 AS header: 1 DCLK, 2 GND, 3 CONF_DONE, 4 +3V3, 5 N_CONFIG, 6 NCE, 7 CNF_DATA, 8 NCS, 9 ASDI, 10 GND',
  JTAG1: ()=> 'JTAG1: 1 TCK (R179 1 k to GND), 3 TDO, 4 +2V5, 5 TMS (R185 10 k to +2V5), 9 TDI (R180 10 k to +2V5), 2/10 GND',
  Q1: ()=> 'Q1 2N4401 (bottom): base ← R181 10 k ← ALTERA_RESET (U14.17 = PB7); collector → N_CONFIG; emitter GND',
  R97: ()=> 'R97 25R5 1 %: CNF_DATA → DATA0 (the 25 Ω series resistor of cyiv-51008 Figure 8-2)',
  R182: ()=> 'R182 1 k: NCE → GND (enables AS configuration; U14.47 PA4 also on this net)',
  R183: ()=> 'R183 1 k: N_CONFIG → +3V3', R184: ()=> 'R184 1 k: CONF_DONE → +3V3', R186: ()=> 'R186 1 k: N_STATUS → +3V3 (bottom, under U4)',
  U14: ()=> `U14 ATmega128L (bottom): PA0 DCLK, PA1 CNF_DATA, PA2 ASDI, PA3 NCS, PA4 NCE, PE3 N_CONFIG, PB7 ALTERA_RESET — now running: ${TL().steps[avrStepAt(SIM.t)].n}`,
};

/* ================= checks ================= */
function checks(){
  const p = P(), d = dv(), T = TL(), out = [];
  const need = p.need;
  out.push(['Logic', need? (d.les>=need? OK : BAD) : WARN, need? `${need.toLocaleString()} LEs needed (price sheet “LE's used in project”) vs ${d.les.toLocaleString()} → ${(need/d.les*100).toFixed(0)} %` : `not recorded — no Cyclone IV fit report is archived (talkback files in these folders are 2006 EP1C6 leftovers) ${inf}`]);
  out.push(['Configuration flash', T.fits? OK : BAD, `${T.bits.toLocaleString()} bits in ${D.flash} (${FLASH[D.flash].bits.toLocaleString()})`]);
  out.push(['.qsf configuration device', p.cfgDev.includes('EPCS1')? BAD : OK, p.cfgDev + (p.cfgDev.includes('EPCS1')? ' — a Cyclone I setting left from 2004; the board has an M25P16 and the .cdf programs EPCS16' : '')]);
  const q = DEV[p.qsfDev+'N'] || DEV[p.qsfDev];
  const sameDie = d.id && q && d.id===q.id;
  out.push(['Image / IDCODE', sameDie? OK : BAD, sameDie? `0x${d.id.toString(16).toUpperCase()} = ${p.qsfDev}: same die, same ${d.rbf.toLocaleString()}-bit .rbf` : `${D.dev} is not ${p.qsfDev}'s die — recompile${d.fam!=='Cyclone IV E'?' (different family)':''}`]);
  let pinOk, pinTxt;
  if (d.die==='CE30'||d.die==='CE40'){ pinOk = OK; pinTxt = 'EP4CE30.xls and EP4CE40.xls F484 tables are identical in all 484 balls'; }
  else if (d.die==='CE55'){ const hit = PINS[D.prod].filter(x=>CE55.has(x.b)); pinOk = p.board? BAD : WARN; pinTxt = `36 balls change role; product pins hit ${hit.length}. ${p.board?'On AMS8E-1 iss5 the 20 balls that become VCCINT/GND are unconnected (IPC) → not a drop-in':''}`; }
  else { pinOk = BAD; pinTxt = d.fam==='Cyclone'? 'Q240 package — a different board' : 'Cyclone II F484 pin-out is not the same table (not archived here) '+inf; }
  out.push(['Pins / footprint', pinOk, pinTxt]);
  const sgQ = +p.qsfDev.slice(-1); const slower = d.sg > sgQ;
  out.push(['Speed grade', slower? WARN : OK, `compiled for -${sgQ}, part is ${d.ind?'I':'C'}${d.sg}${slower?' — slower than the timing was closed for; use a revision compiled for it'+(p.alt?' ('+p.alt+')':''):''}`]);
  const pm = pinMap();
  const ck = p.plls.filter(x=>x.ball).map(x=>{ const B = BALL[x.ball]; return `${x.net} ${x.ball} ${B.fn}${B.fn.startsWith('CLK')?'':' ✗'}`; });
  out.push(['PLL inputs on dedicated CLK pins (IO_Notes.xlsx)', ck.every(s=>!s.includes('✗'))? OK : BAD, ck.join(' · ')]);
  const dpk = PINS[D.prod].filter(x=> BALL[x.b] && BALL[x.b].dp).map(x=>`${x.n} on ${x.b} (${BALL[x.b].dp})`);
  out.push(['DPCLK pins used as clocks', OK, `none drive a PLL; ${dpk.length} DPCLK balls carry ordinary signals: ${dpk.slice(0,4).join(', ')}${dpk.length>4?' …':''}`]);
  const bankStd = {}; PINS[D.prod].forEach(x=>{ const B = BALL[x.b]; if (!B) return; (bankStd[B.bank] = bankStd[B.bank]||new Set()).add(x.io||'default'); });
  const mixed = Object.keys(bankStd).filter(k=> bankStd[k].size>1 && !(bankStd[k].size===2 && bankStd[k].has('default')));
  out.push(['One VCCIO per bank', mixed.length? BAD : OK, Object.keys(VCCIO[D.prod]).map(b=>`B${b} ${VCCIO[D.prod][b]} V`).join(' · ')]);
  const b33 = Object.keys(VCCIO[D.prod]).filter(b=>VCCIO[D.prod][b]===3.3).length;
  out.push(['AN447 (3.3-V receivers)', WARN, `${b33} bank${b33>1?'s':''} at 3.3 V: “apply series termination or use driver selection table” (≤ 30 mA 3.3-V LVTTL, ≤ 12 mA LVCMOS drivers)`]);
  out.push(['MSEL', p.msel? OK : WARN, p.msel? `${p.msel} → AS, standard POR, 3.3 V (Table 8-5)` : `board netlist not used for AMS16-3G; AS assumed from CYCLONEIII_CONFIGURATION_SCHEME ${inf}`]);
  const n = NEEDS.find(x=>x.p==='AMS16');
  out.push(['Cost', OK, d.list!=null? `$${d.list.toFixed(2)} list${D.prod==='ams16'?` × ${n.qty} units (QTY 2010) = $${(d.list*n.qty).toFixed(0)}/yr vs EP2C35F484C8 $${(99.77*n.qty).toFixed(0)}`:''}` : 'no price']);
  return out;
}
function checksHTML(){ return tbl(['check','','detail'], checks().map(r=>[`<span class="small">${r[0]}</span>`, r[1], `<span class="small">${r[2]}</span>`])); }

/* ================= drawings ================= */
function ballCol(b){
  const B = BALL[b], pm = pinMap()[b];
  if (pm){ const io = pm.io||''; return io.includes('1.8')? 'var(--accent)' : io.includes('3.3')||io==='' ? 'var(--accent2)' : 'var(--accent2)'; }
  if (!B) return 'var(--line)';
  if (B.fn==='IO') return 'var(--chip)';
  if (/^CLK/.test(B.fn)) return 'var(--chip)';
  if (B.fn==='GND') return 'color-mix(in srgb,var(--ink) 55%,transparent)';
  if (B.fn==='VCCINT') return 'var(--bad)';
  if (/^VCCIO/.test(B.fn)) return 'var(--warn)';
  if (/^(VCCA|VCCD|GNDA)/.test(B.fn)) return '#8a5cc7';
  return '#c9a227';
}
function ballMapSVG(){
  const pt = 15, ox = 26, oy = 22, W = ox + 22*pt + 8, H = oy + 22*pt + 44, pm = pinMap(), st = stateAt(SIM.t).s;
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:470px;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  s += `<rect x="${ox-6}" y="${oy-6}" width="${22*pt+4}" height="${22*pt+4}" rx="6" fill="none" stroke="${SIM.css(STATE_COL[st])}" stroke-width="3" opacity=".8"/>`;
  for (let c=0;c<22;c++) if (c%3===0||c===21) s += `<text x="${ox+c*pt+pt/2-4}" y="${oy-9}" font-size="8.5" fill="var(--ink2)">${c+1}</text>`;
  ROWS.forEach((r,i)=>{ s += `<text x="3" y="${oy+i*pt+pt/2+3}" font-size="8.5" fill="var(--ink2)">${r}</text>`; });
  Object.keys(BALL).forEach(b=>{ const [c,r] = ballXY(b), B = BALL[b]; const cx = ox+c*pt+pt/2-2, cy = oy+r*pt+pt/2-2;
    const ring = /^CLK/.test(B.fn)? 'var(--accent2)' : B.dp? 'var(--warn)' : (B.cfg||/^(nCONFIG|nSTATUS|nCE|DCLK|CONF_DONE|MSEL|TCK|TMS|TDI|TDO)/.test(B.fn))? '#c9a227' : 'none';
    const on = D.sel===b; const c55 = D.dev.startsWith('EP4CE55') && CE55.has(b);
    s += `<circle data-ball="${b}" cx="${cx}" cy="${cy}" r="5.4" fill="${ballCol(b)}" stroke="${on?'var(--play)':c55?'var(--bad)':ring}" stroke-width="${on?2.6:c55?2.2:1.4}" ${B.dp&&!/^CLK/.test(B.fn)?'stroke-dasharray="2 1.5"':''} style="cursor:pointer"><title>${b} ${B.fn}${B.opt?' '+B.opt:''}${B.cfg?' '+B.cfg:''}${B.dp?' '+B.dp:''}${pm[b]?' — '+pm[b].n:''}</title></circle>`; });
  const lg = [['var(--accent2)','3.3 V signal'],['var(--accent)','1.8 V signal'],['var(--chip)','unused I/O'],['var(--bad)','VCCINT'],['var(--warn)','VCCIO'],['#8a5cc7','PLL supply']];
  lg.forEach((l,i)=>{ const xx = ox+4+(i%3)*112, yy = H-30+Math.floor(i/3)*12; s += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="${l[0]}" stroke="var(--line)"/><text x="${xx+8}" y="${yy+3}" font-size="8.5" fill="var(--ink2)">${l[1]}</text>`; });
  s += `<text x="${ox}" y="${H-5}" font-size="8.5" fill="var(--ink2)">rings: blue CLK pin · amber config/JTAG · dashed DPCLK · top view, A1 top left</text>`;
  return s + '</svg>';
}
function boardSVG(){
  const st = stateAt(SIM.t), sig = sigAt(SIM.t), T = TL(), step = T.steps[avrStepAt(SIM.t)];
  const hold = T.low.find(l=> SIM.t>=l[0] && SIM.t<l[1]);
  let s = `<svg viewBox="0 0 480 442" style="width:100%;max-width:560px;border-radius:8px;border:1px solid var(--line)"><rect width="480" height="442" fill="#16543a"/>
    <image href="${ASSET}rd10-cycloneiv-ams8e1-pads.png" width="480" height="442"/><image href="${ASSET}rd10-cycloneiv-ams8e1-silk.png" width="480" height="442"/>`;
  for (const k in REFS){ const [x,y,w,h,side] = REFS[k]; let col = 'rgba(255,255,255,.0)', str = '#ffd34d';
    if (k==='U4') col = `color-mix(in srgb,${SIM.css(STATE_COL[st.s])} 45%,transparent)`;
    if (k==='U13' && !sig.ncso) col = 'rgba(255,200,60,.45)';
    if ((k==='Q1'||k==='U14') && hold) col = 'rgba(230,80,60,.45)';
    s += `<rect data-ref="${k}" x="${x-3}" y="${y-3}" width="${w+6}" height="${h+6}" rx="3" fill="${col}" stroke="${D.sel===k?'var(--play)':str}" stroke-width="${D.sel===k?2.4:1.1}" ${side==='bottom'?'stroke-dasharray="4 3"':''} style="cursor:pointer"><title>${k}${side==='bottom'?' (bottom side)':''}</title></rect>`;
    s += `<text x="${x+w+5}" y="${y+8}" font-size="10" fill="#ffd34d" style="pointer-events:none">${k}</text>`; }
  s += `<text x="8" y="434" font-size="10.5" fill="#fff">U4: ${st.s}${st.bit!=null?' · bit '+st.bit.toLocaleString():''} · nCONFIG ${hold?'LOW ('+hold[2]+')':'high'} · CONF_DONE ${sig.confdone}</text>`;
  return s + '</svg>';
}
function boardCaption(){ return `<p class="small muted">AMS8E-1 iss5 top side, ${(480/150).toFixed(1)}″ × ${(442/150).toFixed(2)}″ crop at 150 dpi, cut from Ams8e-1iss5.GTS (pads) and .GTO (silk) in AMS8E-1-ISS5-GERBER.zip. Outlines and nets from Ams8e-1iss5-net.ipc; dashed = bottom side. U4 colour = FPGA state, U13 glows while nCSO is low, Q1/U14 glow while the ATmega holds nCONFIG low.</p>`; }

/* ================= timeline lanes ================= */
function ptsFrom(list, init){ return [[0, init]].concat(list).sort((a,b)=>a[0]-b[0]); }
function lanes(){
  const T = TL(), css = SIM.css, p = P();
  const A_ = T.att;
  const ncfg = ptsFrom(T.low.flatMap(l=>[[l[0],0],[Math.min(l[1],9),1]]), 1);
  const nst = [], cd = [], cso = [];
  A_.forEach(a=>{ if (a.jtag){ cd.push([a.start,0],[a.done,1]); nst.push([a.start,1]); return; }
    nst.push([a.nst,1]); if (a.ck) cso.push([a.ck,0]);
    if (a.fail && !a.fail.startsWith('nCE') && a.ck){ const tEnd = a.ck + FLASH[D.flash].bits/T.f; nst.push([tEnd,0]); cso.push([tEnd,1]); }
    if (a.done){ cd.push([a.done,1]); cso.push([a.done,1]); }
    if (a.abort!=null){ nst.push([a.abort,0]); cd.push([a.abort,0]); cso.push([a.abort,1]); } });
  const L = [];
  L.push({ label:'ATmega128 main() (4.9152 MHz)', h:30, draw(c,X,t0,t1,y,h){ const cols=[css('--accent2'),css('--ink2')];
    T.steps.forEach((s,i)=>{ if (s.t1<t0||s.t0>t1||s.d<=0) return; bandAt(c,X,Math.max(s.t0,t0),Math.min(s.t1,t1),y,h,cols[i%2],.55,s.n.replace(/<[^>]+>/g,'')); });
    const lp = T.steps[T.steps.length-1]; if (lp.t0<t1) bandAt(c,X,Math.max(lp.t0,t0),t1,y,h,css('--accent'),.35,'while(1) main loop');
    (T.ex.reinitSteps||[]).forEach(r=>{ if (r[2]>t0&&r[1]<t1) bandAt(c,X,Math.max(r[1],t0),Math.min(r[2],t1),y,h,css('--warn'),.75,r[0]); }); } });
  if (D.prod==='ams16'){
    const gr = ptsFrom(T.ex.gr.flatMap(g=>[[g[0],0],[g[1],1]]), 1);
    L.push({ label:'GLOBAL_RESET (PORTB7 → FPGA pin)', h:22, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,gr,css('--warn')); T.ex.gr.forEach((g,i)=>{ if (g[1]>t0&&g[0]<t1){ c.fillStyle = T.ex.grSeen[i]? css('--accent') : css('--bad'); c.font='10px '+css('--sans'); c.fillText(T.ex.grSeen[i]?'seen by the design':'FPGA not in user mode — pulse lost', X(Math.max(g[0],t0))+4, y+h-3); } }); } });
  } else {
    const ar = ptsFrom(T.low.filter(l=>l[2].startsWith('ALTERA')).flatMap(l=>[[l[0],1],[l[1],0]]), 0);
    L.push({ label:'ALTERA_RESET (PB7 → R181 → Q1)', h:22, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,ar,css('--bad'),{fillHigh:true}); } });
  }
  L.push({ label:'nCONFIG (K5)', h:22, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,ncfg,css('--ink')); } });
  if (p.board) L.push({ label:'nCE (L3) — R182 1 k to GND', h:20, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h, T.nceHighFrom!=null? [[0,0],[T.nceHighFrom,1]] : [[0,0]], T.nceHighFrom!=null?css('--bad'):css('--ink2')); } });
  L.push({ label:'nSTATUS (K6)', h:22, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,ptsFrom(nst,0),css('--ink')); if (T.tPOR>t0) { c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText('POR '+ms(T.tPOR), X(Math.max(t0,0))+4, y+h-3); } } });
  L.push({ label:'nCSO (E2) → '+p.flashRef+' S#', h:22, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,ptsFrom(cso,1),css('--warn')); } });
  L.push({ label:'DCLK (K2) '+D.dclk+' MHz', h:24, draw(c,X,t0,t1,y,h){ const per = 1/T.f;
    A_.forEach(a=>{ if (!a.ck || a.jtag) return; const end = Math.min(a.abort!=null?a.abort:9, a.done || (a.ck + FLASH[D.flash].bits*per)); if (end<t0||a.ck>t1) return;
      const a0 = Math.max(t0,a.ck), a1 = Math.min(t1,end); const px = X(a.ck+per)-X(a.ck);
      if (px < 2.5){ bandAt(c,X,a0,a1,y,h,css('--warn'),.35); c.fillStyle=css('--ink'); c.font='10.5px '+css('--mono'); c.fillText(`${Math.round((a1-a0)*T.f).toLocaleString()} DCLK cycles in view (${SIM.fmtDur(per)} each)`, X(a0)+4, y+h/2+4); return; }
      const n0 = Math.max(0, Math.floor((a0-a.ck)/per)), n1 = Math.ceil((a1-a.ck)/per); c.strokeStyle = css('--warn'); c.lineWidth = 1.4; c.beginPath();
      for (let n=n0; n<=n1; n++){ const ta = a.ck+n*per; c.moveTo(X(ta),y+h-5); c.lineTo(X(ta),y+5); c.lineTo(X(ta+per/2),y+5); c.lineTo(X(ta+per/2),y+h-5); c.lineTo(X(ta+per),y+h-5); } c.stroke();
      if (px > 16){ c.fillStyle = css('--ink2'); c.font='9px '+css('--mono'); for (let n=n0; n<=n1; n++) if (n%(px>30?1:4)===0) c.fillText(n, X(a.ck+n*per)+2, y+12); } }); } });
  L.push({ label:'ASDO / DATA1 (D1) → ASDI', h:24, draw(c,X,t0,t1,y,h){ const per = 1/T.f, op = D.op, cb = T.cmdBits;
    A_.forEach(a=>{ if (!a.ck || a.jtag || a.fail && a.fail.startsWith('nCE')) return; if (a.cmdEnd<t0||a.ck>t1) return; const px = X(a.ck+per)-X(a.ck);
      if (px < 4){ bandAt(c,X,Math.max(a.ck,t0),Math.min(a.cmdEnd,t1),y,h,css('--accent2'),.7,`0x${hex2(op)} + 000000${OPS[op].dummy?' + dummy':''}`); return; }
      const bit = n => n<8 ? (op>>(7-n))&1 : 0; c.strokeStyle = css('--accent2'); c.lineWidth=1.6; c.beginPath();
      for (let n=0;n<cb;n++){ const ta=a.ck+n*per-per/2, tb=ta+per; if (tb<t0||ta>t1) continue; const yy = bit(n)? y+5 : y+h-5; c.moveTo(X(ta),yy); c.lineTo(X(tb),yy); if (n<cb-1 && bit(n)!==bit(n+1)){ c.lineTo(X(tb), bit(n+1)? y+5 : y+h-5); } }
      c.stroke(); if (px > 12){ c.fillStyle=css('--ink'); c.font='9px '+css('--mono'); for (let n=0;n<cb;n++){ const tx=a.ck+n*per; if (tx<t0||tx>t1) continue; c.fillText(n<8?'op'+(7-n):n<32?'A'+(31-n):'d', X(tx)-6, y+h/2+3); } } }); } });
  L.push({ label:'DATA0 (K1) ← R97 ← '+p.flashRef+' Q', h:24, draw(c,X,t0,t1,y,h){ const per = 1/T.f;
    A_.forEach(a=>{ if (!a.cmdEnd || a.jtag) return; const end = Math.min(a.abort!=null?a.abort:9, a.done || (a.ck + FLASH[D.flash].bits*per)); if (end<t0||a.cmdEnd>t1) return;
      const a0 = Math.max(t0,a.cmdEnd), a1 = Math.min(t1,end); const px = X(a.ck+per)-X(a.ck);
      if (px < 10){ bandAt(c,X,a0,a1,y,h,css('--accent'),.45,`bitstream bits ${Math.floor((a0-a.cmdEnd)*T.f).toLocaleString()}–${Math.floor((a1-a.cmdEnd)*T.f).toLocaleString()} of ${T.bits.toLocaleString()}`); return; }
      const n0 = Math.floor((a0-a.cmdEnd)/per), n1 = Math.ceil((a1-a.cmdEnd)/per); c.font='9px '+css('--mono');
      for (let n=n0;n<=n1;n++){ const ta=a.cmdEnd+n*per+per*0.1; c.strokeStyle=css('--accent'); c.strokeRect(X(ta),y+5,X(ta+per*0.8)-X(ta),h-10); if (px>22){ c.fillStyle=css('--ink2'); c.fillText('b'+n, X(ta)+2, y+h/2+3); } } }); } });
  L.push({ label:'CONF_DONE (M18)', h:22, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,ptsFrom(cd,0),css('--accent'),{fillHigh:true}); } });
  L.push({ label:'FPGA state', h:24, draw(c,X,t0,t1,y,h){ const cuts = new Set([0,t0,t1,T.tPOR]); A_.forEach(a=>['start','nst','ck','cmdEnd','done','user','abort'].forEach(k=>{ if (a[k]!=null) cuts.add(a[k]); })); T.low.forEach(l=>{cuts.add(l[0]);cuts.add(l[1]);});
    const cs = [...cuts].filter(x=>x>=t0&&x<=t1).sort((a,b)=>a-b); for (let i=0;i<cs.length-1;i++){ const m = (cs[i]+cs[i+1])/2, s = stateAt(m); bandAt(c,X,cs[i],cs[i+1],y,h,css(STATE_COL[s.s]),.7,s.s); } } });
  if (D.prod==='ams16'){
    L.push({ label:'isAlteraReady() = PIND & BIT6', h:22, draw(c,X,t0,t1,y,h){ const lp = T.ex.loopAt; if (lp>t1) { laneText(c,X,t0,y,h,`main loop starts at ${ms(lp)}`); return; }
      const cuts=[lp]; T.user.forEach(u=>{ if (u[0]>lp) cuts.push(u[0]); if (u[1]>lp&&u[1]<9) cuts.push(u[1]); }); cuts.push(t1); cuts.sort((a,b)=>a-b);
      for (let i=0;i<cuts.length-1;i++){ const ok = T.inUser((cuts[i]+cuts[i+1])/2); if (cuts[i+1]<t0) continue; bandAt(c,X,Math.max(cuts[i],t0),cuts[i+1],y,h,ok?css('--accent'):css('--bad'),.55, ok?'ready → UART0_translate, gs2970AReadVidInfo, ALTERA_SORT …':'not ready → fpgaReprogrammed = YES'); } } });
  } else {
    L.push({ label:'ALTERA_read_write() SPI access', h:22, draw(c,X,t0,t1,y,h){ const fa = T.ex.firstAccess; if (fa>=t0&&fa<=t1){ c.fillStyle = T.ex.firstOk? css('--accent') : css('--bad'); c.fillRect(X(fa)-1,y+3,3,h-6); c.font='10px '+css('--sans'); c.fillText(T.ex.firstOk? 'first access: FPGA ready' : 'first access lands while the FPGA is configuring — lost', X(fa)+5, y+h/2+4); }
      if (T.ex.firstGood!=null && T.ex.firstGood>fa) bandAt(c,X,Math.max(t0,T.ex.firstGood),t1,y,h,css('--accent'),.3,'loop accesses answered'); } });
  }
  T.plls.forEach(pl=> pl.outs.forEach(o=>{ L.push({ label:`${pl.inst.split(' ')[0]} ${o[0]} ${(o[1]/1e6).toFixed(3)} MHz${o[2]?' @'+o[2]+'°':''}`, h:20, draw(c,X,t0,t1,y,h){ if (pl.lock==null){ laneText(c,X,t0,y,h, D.prod==='ams16'? 'no RCVR_PCLK yet (GS2970A held in reset)' : 'FPGA not configured'); return; } if (pl.lock>t1){ laneText(c,X,t0,y,h,`locks at ${ms(pl.lock)} ${'(lock time inferred)'}`); return; }
      const per = 1/o[1]; SIM.pulses(c,X,Math.max(t0,pl.lock),t1,y,h,per,pl.lock+per*o[2]/360,per/2,css('--accent2'),'clocks'); } }); }));
  if (D.prod==='ams16') L.push({ label:'lrclk 48 kHz (AUDIO_CLOCK ÷ 256)', h:20, draw(c,X,t0,t1,y,h){ const lk = T.plls[0].lock; if (lk==null||lk>t1){ laneText(c,X,t0,y,h,'waits for RCVR_PCLK / PLL1705 '+'(inferred)'); return; } SIM.pulses(c,X,Math.max(t0,lk),t1,y,h,1/48000,lk,1/96000,css('--accent'),'lrclk'); } });
  else L.push({ label:'clk_div8 12.288 MHz (clkdiv_98M304_to_12M288)', h:20, draw(c,X,t0,t1,y,h){ const lk = T.plls[0].lock; if (lk==null||lk>t1){ laneText(c,X,t0,y,h,'after PLL lock'); return; } const per = 8/98.304e6; SIM.pulses(c,X,Math.max(t0,lk),t1,y,h,per,lk+per/2,per/2,css('--accent'),'clk_div8'); } });
  return L;
}

/* ================= views ================= */
function bindAll(root){
  bindActs(root, { prod:v=>A.prod(v), dev:v=>A.dev(v), flash:v=>A.flash(v), op:v=>A.op(v), dclk:v=>A.dclk(v), por:v=>A.por(v), porMs:v=>A.porMs(v), avr:v=>A.avr(v),
    comp:(v,el)=>A.comp(v,el), legacy:(v,el)=>A.legacy(v,el), power:()=>A.power(), ncfg:()=>A.ncfg(), jtag:()=>A.jtag(), pof:()=>A.pof(), goto:v=>A.goto(v) });
  root.querySelectorAll('[data-ball]').forEach(e=> e.onclick = ()=> A.sel(e.dataset.ball));
  root.querySelectorAll('[data-ref]').forEach(e=> e.onclick = ()=>{ const r = e.dataset.ref; if (r==='H2') A.pof(); else if (r==='JTAG1') A.jtag(); else A.sel(r); });
}
function controlsHTML(){
  const p = P();
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${Object.keys(PROD).map(k=>`<button data-a="prod" data-v="${k}" class="${D.prod===k?'on':''}">${PROD[k].short}</button>`).join('')}</div>
  <div class="small" style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center">
   <span class="muted">Device</span><select data-a="dev">${Object.keys(DEV).map(k=>`<option ${D.dev===k?'selected':''}>${k}</option>`).join('')}</select>
   <span class="muted">Config flash</span><select data-a="flash">${Object.keys(FLASH).map(k=>`<option ${D.flash===k?'selected':''}>${k}</option>`).join('')}</select>
   <span class="muted">AS read opcode</span><select data-a="op">${Object.keys(OPS).map(k=>`<option value="${k}" ${D.op===+k?'selected':''}>0x${hex2(+k)} ${OPS[k].n}</option>`).join('')}</select>
   <span class="muted">DCLK ${D.dclk} MHz</span><input type="range" min="20" max="40" step="1" value="${D.dclk}" data-a="dclk">
   <span class="muted">POR</span><span><select data-a="por"><option value="std" ${D.por==='std'?'selected':''}>standard 50–200 ms</option><option value="fast" ${D.por==='fast'?'selected':''}>fast 3–9 ms</option></select> <input type="number" style="width:64px" value="${D.porMs}" data-a="porMs"> ms ${inf}</span>
   <span class="muted">ATmega start-up</span><span><input type="number" style="width:64px" value="${D.avrStart}" data-a="avr"> ms ${inf}</span>
   <span class="muted">Options</span><span><label><input type="checkbox" data-a="comp" ${D.comp?'checked':''}> decompression</label> ${p.board?`<label><input type="checkbox" data-a="legacy" ${D.legacy?'checked':''}> pre-21-Jan-2013 port_init</label>`:''}</span>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button data-a="power">⏻ Power on</button><button data-a="ncfg">nCONFIG pulse here</button><button data-a="jtag">JTAG .sof here</button><button data-a="pof">Program .pof (AS header)</button></div>
  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px" class="small"><span class="muted">go to:</span>${[['whole','whole 1.5 s'],['por','POR end'],['ck','first DCLK (2 µs)'],['data','first data bit'],['done','CONF_DONE'],['user','user mode'],['first','first FPGA access']].map(g=>`<button data-a="goto" data-v="${g[0]}">${g[1]}</button>`).join('')}</div>`;
}
function infoHTML(){
  const s = D.sel; if (!s) return '<span class="muted small">Click a ball or a part.</span>';
  if (REFINFO[s]) return `<p class="small">${REFINFO[s]()}</p>`;
  const B = BALL[s]; if (!B) return '';
  const pm = pinMap()[s];
  return kv([['Ball',`${s} · bank ${B.bank}`],['Function',`${B.fn}${B.opt?' · '+B.opt:''}${B.cfg?' · '+B.cfg:''}${B.dp?' · '+B.dp:''}`],[P().short, pm? `<span class="mono">${pm.n}</span> ${pm.io||'(default '+(D.prod==='ams16'?'2.5 V':'LVCMOS')+')'}` : '—'],
    ...(P().board? [['AMS8E-1 iss5 net', `<span class="mono">${U4NET[s]||'(unconnected)'}</span>`]] : []), ['On EP4CE55', CE55.has(s)? '<b style="color:var(--bad)">changes role</b>' : 'same']]);
}
function statusHTML(){
  const T = TL(), st = stateAt(SIM.t), step = T.steps[avrStepAt(SIM.t)];
  const a = T.att.find(x=>!x.jtag && x.done) || {};
  return kv([['FPGA', `<b style="color:${SIM.css(STATE_COL[st.s])}">${st.s}</b> — ${st.d}${st.bit!=null?` · bit ${st.bit.toLocaleString()}`:''}`],
    ['ATmega', `<span class="small">${step.n}</span>`],
    ['Configuration', a.done? `POR ${ms(T.tPOR)} → first DCLK ${ms(a.ck)} → CONF_DONE ${ms(a.done)} → user ${ms(a.user)} (${ms(a.done-a.ck)} of DCLK)` : (T.att[0]&&T.att[0].fail)||'—'],
    ['Attempts', T.att.map(x=> x.jtag? 'JTAG' : x.abort!=null? `aborted at ${ms(x.abort)} (${x.abortBy})` : x.fail? 'failed' : 'completed').join(' · ')],
    D.prod==='ams16'? ['AMS16 guard', `main loop ${ms(T.ex.loopAt)}; DES_RESET write ${T.ex.desOk?'landed':'<b style="color:var(--bad)">lost</b>'}; ${T.ex.reinit? 'resetAndInit() at '+ms(T.ex.reinit):'no resetAndInit needed'}`]
                    : ['First FPGA access', `${ms(T.ex.firstAccess)} — ${T.ex.firstOk? 'FPGA ready' : '<b style="color:var(--bad)">FPGA still configuring</b>; first answered access '+(T.ex.firstGood!=null?ms(T.ex.firstGood):'never')}`]]);
}
function viewSim(m){
  window[KEY] = false;
  m.innerHTML = `<div class="grid2"><div>${card('Bench: product, part and configuration', `<div id="ctl"></div>`)}<div class="card"><h2 id="brdT"></h2><div id="brd"></div></div></div>
    <div>${card('Now', `<div id="stat"></div>`)}${card('Selected', `<div id="info"></div>`)}${card('RD10 checks for this choice', `<div id="chk"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('Power-on in slow motion: ATmega128 boot code, AS configuration bit by bit, PLLs (1.5 s; click to seek)', `<canvas id="tl"></canvas>`)}`;
  let lastKey = null;
  const draw = ()=>{
    const k = JSON.stringify([D.prod,D.dev,D.flash,D.dclk,D.por,D.porMs,D.avrStart,D.op,D.comp,D.legacy]);
    if (k!==lastKey){ const c = m.querySelector('#ctl'); c.innerHTML = controlsHTML(); bindAll(c); lastKey = k; }
    m.querySelector('#brdT').textContent = P().board? 'The real board: AMS8E-1 iss5 configuration corner' : 'The real chip: FBGA-484 ball map with AMS16TEST.qsf';
    const b = m.querySelector('#brd'); b.innerHTML = P().board? boardSVG()+boardCaption()+`<details><summary class="small">FBGA-484 ball map (AMS81.qsf)</summary>${ballMapSVG()}</details>` : ballMapSVG()+'<p class="small muted">Ball functions from pinouts/EP4CE30.xls (identical to EP4CE40.xls); colours from the IO_STANDARD lines of AMS16TEST.qsf. No AMS16A-3 Gerber is used here; the board is drawn in the AMS16 plugin.</p>'; bindAll(b);
    m.querySelector('#stat').innerHTML = statusHTML(); m.querySelector('#info').innerHTML = infoHTML(); m.querySelector('#chk').innerHTML = checksHTML();
    m.querySelector('#trace').innerHTML = traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230});
  };
  SIM.on('time', draw);
}

/* ---------- tutorial: the investigation as the engineer ran it ---------- */
const tutor = { i:0 };
const LESSONS = [
  { title:'Why RD10 existed', auto:true, check:()=>true, body:`<p>The R&amp;D register lists <b>RD10 “Integrate cyclone iv into product”</b>, Peter, completed 2011-12-01. Cyclone II parts (EP2C35) cost $99–136 each in the price sheet; Altera's new Cyclone IV E was cheaper per LE. The folder holds what Peter worked from: the handbooks, the EP4CE30/40/55 pin tables, a one-page price comparison, two lines of I/O notes and a dev kit. These lessons repeat the checks he had to make, then follow the result into the products.</p>` },
  { title:'1 · Price the AMS16 swap', enter:()=>{ if (D.prod!=='ams16') A.prod('ams16'); }, check:()=>D.prod==='ams16'&&D.dev==='EP4CE30F23C8N', hint:'Device → EP4CE30F23C8N.',
    body:`<p>The price sheet says the AMS16 uses <b>16,860 LEs</b> on an EP2C35F484C8 ($99.77, 46 units in 2010). Pick the proposed replacement <b>EP4CE30F23C8N</b> ($39.92 list, $22.36 quoted) and read the Logic and Cost lines in the checks.</p>` },
  { title:'2 · Is the CE30 big enough for the M6205?', check:()=>D.dev.startsWith('EP4CE40'), hint:'Device → EP4CE40F23C6N.',
    body:`<p>The same sheet gives the M6205 3G-SDI card <b>30,000 LEs</b>: more than a CE30 (28,848). That is why it lists <b>EP4CE40F23C6N</b> for the M6205 and M6204. Select it. (Those cards never moved: every M6204/M6205 .qsf up to 2016 still targets EP2C35F484C6.)</p>` },
  { title:'3 · Where does the bitstream live?', check:()=>D.flash==='M25P16' && LOG.items.some(e=>/EPCS1$/.test(e.name)), hint:'Config flash → EPCS1, then → M25P16.',
    body:`<p>Both CE30 and CE40 need a <b>9,534,304-bit</b> image (Table 8-2). Choose <b>EPCS1</b> — the part still named in AMS81.qsf — and watch the configuration fail, then choose <b>M25P16</b>, the 16-Mbit flash both boards actually fit.</p>` },
  { title:'4 · Watch the AS read, bit by bit', check:()=>SIM.win<=2.1e-6 && ['CMD','DATA'].includes(stateAt(SIM.t).s), hint:'Press “first DCLK (2 µs)”, then step with “1 DCLK”.',
    body:`<p>Press <b>go to: first DCLK</b>. The FPGA drives nCSO low and clocks the opcode then a 24-bit address of 0 out of ASDO; the flash answers on DATA0. Step one DCLK at a time with the transport.</p>` },
  { title:'5 · Slowest oscillator', check:()=>D.dclk===20, hint:'Set DCLK to 20 MHz.',
    body:`<p>DCLK comes from an internal oscillator that varies from 20 to 40 MHz. Set it to <b>20 MHz</b>: configuration takes about 477 ms, matching Equation 8-3 (9.6 Mbit × 50 ns = 480 ms).</p>` },
  { title:'6 · The I/O note: clocks on CLK pins', check:()=>D.sel==='T22', hint:'Click ball T22 on the ball map (bottom right area).',
    body:`<p>IO_Notes.xlsx copies one rule: clock-control blocks fed from DPCLK pins “are not able to drive PLL inputs”. Click <b>T22</b>: the AMS16-3G puts RCVR_PCLK (148.5 MHz from the GS2970A) on <b>CLK7</b>, a dedicated clock pin, and feeds altpll1.</p>` },
  { title:'7 · Two parts, one die', check:()=>D.prod==='ams8e' && D.dev==='EP4CE30F23I7N' && D.seen55, hint:'Product AMS8E-1 iss5 → device EP4CE55F23C8 → then EP4CE30F23I7N.',
    body:`<p>Switch to <b>AMS8E-1 iss5</b>. Its AMS81.qsf compiles for EP4CE40F23C6, but the 2013/2016 BOMs fit EP4CE30F23I7N. Try <b>EP4CE55F23C8</b> first (36 balls change role, red rings), then <b>EP4CE30F23I7N</b>: same JTAG IDCODE, same .rbf size, same pin table.</p>` },
  { title:'8 · The boot race on AMS8E-1', check:()=>D.prod==='ams8e' && SIM.t>=TL().ex.firstAccess, hint:'Press “first FPGA access”.',
    body:`<p>The ATmega's port_init sets PB7, which turns Q1 on and pulls nCONFIG low. It then runs nine wait_ms(500) calls: 807 cycles per “ms”, so 739 ms, not the 4.5 s the comment suggests. CONFIGURE_ALTERA releases nCONFIG and ALTERA_read_write() runs at once, while the FPGA is still reading its flash. Press <b>go to: first FPGA access</b>.</p>` },
  { title:'9 · The MLC8 port waits', check:()=>D.prod==='mlc8n' && TL().ex.firstOk, hint:'Press the MLC8N product button.',
    body:`<p>The MLC8 port of the same board (RD66 v100w.c, April 2013) adds six more wait_ms(500) after CONFIGURE_ALTERA: 493 ms, longer than the slowest configuration. Select <b>MLC8N</b> and the first access lands in user mode.</p>` },
  { title:'10 · AMS16-3G watches CONF_DONE', check:()=>D.prod==='ams16' && D.events.some(e=>e.k==='jtag'), hint:'AMS16-3G → play to ~1.2 s → “JTAG .sof here”.',
    body:`<p>The AMS16-3G main board wires CONF_DONE to PIND6. Its main loop calls <span class="mono">isAlteraReady()</span> every pass and sets <span class="mono">fpgaReprogrammed</span> when the FPGA drops out, then calls <span class="mono">resetAndInit()</span> when it comes back. Select AMS16-3G, move the playhead past 1.1 s and press <b>JTAG .sof here</b>, as an engineer reloading a test build with the USB-Blaster would.</p>` },
];
function viewTutorial(m){ window[KEY] = false;
  tutorialView(m, LESSONS, tutor, { title:'Tutorial — the Cyclone IV investigation', panelTitle:'Bench', reset,
    panel(el){ el.innerHTML = controlsHTML() + `<div style="margin-top:8px">${statusHTML()}</div>` + `<div style="margin-top:8px">${P().board? boardSVG() : ballMapSVG()}</div>` + `<details><summary class="small">checks</summary>${checksHTML()}</details>`; bindAll(el); } }); }

/* ---------- one second as each part sees it ---------- */
function viewSecond(m){ window[KEY] = false;
  m.innerHTML = `${card('What each part sees during power-on', `<div id="ev"></div>`)}<div class="grid2">${card('Where the first 1.5 s go', `<div id="bar"></div>`)}${card('At the playhead', `<div id="ph"></div>`)}</div>`;
  const draw = ()=>{ const T = TL(), d = dv(), a = T.att.find(x=>!x.jtag && x.done) || {};
    const rows = [
      ['ATmega128 clock', '4,915,200 cycles/s', 'AMS16 BOM X1 / AMS8E-1 X2 → U14 XTAL'],
      [D.prod==='ams16'?'wait() passes':'wait_ms() “ms”', D.prod==='ams16'? Math.round(AVR_HZ/7).toLocaleString()+' /s (7 cycles each)' : Math.round(AVR_HZ/807).toLocaleString()+' /s (807 cycles each)', D.prod==='ams16'?'common.lis':'v200w.lis'],
      ['DCLK during configuration', `${(T.f/1e6).toFixed(0)} MHz → ${(T.bits+T.cmdBits).toLocaleString()} cycles`, 'one bit per cycle on DATA0'],
      ['Configuration data', `${T.bits.toLocaleString()} bits = ${(T.bits/8).toLocaleString()} bytes`, `${(T.bits/FLASH[D.flash].bits*100).toFixed(0)} % of ${D.flash}`],
      ['Initialisation', '300–650 µs (tCD2UM)', 'internal oscillator; 3,192 clocks if CLKUSR were used'],
      ...T.plls.flatMap(p=> p.outs.map(o=>[`${p.inst} ${o[0]}`, `${(o[1]/1e6).toFixed(3)} MHz`, p.src])),
      [D.prod==='ams16'?'lrclk / AES frames':'clk_div8', D.prod==='ams16'?'48,000 /s':'12,288,000 /s', D.prod==='ams16'?'AUDIO_CLOCK ÷ 256 (ams163g.sdc)':'98.304 MHz ÷ 8 (counter bit 2)'],
      ['CRC error detection', 'off', `ERROR_CHECK_FREQUENCY_DIVISOR 1 is set in AMS16TEST.qsf but the check is not enabled; enabled it would scan every ≥ 15 ms (Table 9-6, EP4CE30) ${inf}`]];
    m.querySelector('#ev').innerHTML = tbl(['Event','Rate / count','Source'], rows.map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="small">${r[2]}</span>`]));
    const segs = [['POR', 0, T.tPOR, '--ink2']];
    T.att.forEach(x=>{ if (x.jtag) segs.push(['JTAG', x.start, Math.min(x.done,DUR), '--accent2']); else if (x.ck){ segs.push(['config', x.ck, Math.min(x.abort!=null?x.abort:(x.done||DUR),DUR), '--warn']); } if (x.user!=null && x.user<DUR) segs.push(['user', x.user, Math.min(DUR, (T.att[T.att.indexOf(x)+1]||{}).start||DUR), '--accent']); });
    T.low.forEach(l=> segs.push(['nCONFIG low', l[0], Math.min(l[1],DUR), '--bad']));
    let s = `<svg viewBox="0 0 620 ${40+segs.length*0}" style="width:100%"><rect x="10" y="8" width="600" height="24" fill="var(--lane)" stroke="var(--line)"/>`;
    segs.forEach(g=>{ const x = 10+g[1]/DUR*600, w = Math.max(1,(g[2]-g[1])/DUR*600); s += `<rect x="${x}" y="${g[0]==='nCONFIG low'?26:8}" width="${w}" height="${g[0]==='nCONFIG low'?6:18}" fill="${SIM.css(g[3])}" opacity=".75"><title>${g[0]} ${ms(g[1])}–${ms(g[2])}</title></rect>`; if (w>40 && g[0]!=='nCONFIG low') s += `<text x="${x+3}" y="21" font-size="10" fill="#fff">${g[0]}</text>`; });
    s += `<line x1="${10+SIM.t/DUR*600}" y1="4" x2="${10+SIM.t/DUR*600}" y2="36" stroke="var(--play)" stroke-width="2"/></svg>`;
    s += flowSVG(T.steps.map(x=>`${ms(x.t0).padStart(9)}  ${x.n.replace(/<[^>]+>/g,'')}`.slice(0,96)), avrStepAt(SIM.t), {w:620, rh:24, done:true});
    m.querySelector('#bar').innerHTML = s;
    const st = stateAt(SIM.t);
    m.querySelector('#ph').innerHTML = kv([['t', SIM.fmtT(SIM.t)], ['FPGA', st.s+' — '+st.d], ['bit', st.bit!=null? st.bit.toLocaleString() : '—'], ['DCLK cycles since nCSO↓', a.ck && SIM.t>a.ck? Math.floor((Math.min(SIM.t,a.done||9)-a.ck)*T.f).toLocaleString() : '—'], ['ATmega cycles since reset', Math.round(Math.max(0,SIM.t-D.avrStart*1e-3)*AVR_HZ).toLocaleString()]]);
  };
  SIM.on('time', draw);
}

/* ---------- block diagram ---------- */
function viewBlock(m){ window[KEY] = false;
  const st = ()=> stateAt(SIM.t).s;
  const B = {
    docs:{x:14,y:16,w:170,h:64,t:'Altera documents',s:['handbook, config, EPCS, AN447'],d:'cyclone4-handbook.pdf, cyiv-51008Programming.pdf, cyc_c51014EPCSDevicesDatasheet.pdf, pin_connection_guide.pdf, an447. The numbers the model uses come from these: .rbf sizes, MSEL table, AS timing, opcodes, IDCODEs.'},
    pins:{x:14,y:96,w:170,h:64,t:'Pin tables',s:['EP4CE30 / 40 / 55 .xls'],d:'Altera pin lists. The F484 columns of EP4CE30 and EP4CE40 are identical; EP4CE55 changes 36 balls.'},
    price:{x:14,y:176,w:170,h:64,t:'Price comparison',s:['LEs needed, parts, $'],d:'CycloneIv_Price_Comparison.xls: the decision record. AMS16 → EP4CE30F23C8N; M6205/M6204 → EP4CE40F23C6N.'},
    notes:{x:14,y:256,w:170,h:54,t:'IO_Notes.xlsx',s:['DPCLK vs CLK pins'],d:'Two rules about which pins may clock a PLL.'},
    kit:{x:14,y:326,w:170,h:64,t:'Cyclone IV GX dev kit',s:['EP4CGX150, third party'],d:'Unmodified Altera kit v10.1 (PCIe demo, board test system). Its GX transceivers reappear in the Demux4 SDI experiments (c4gx_f896_host.qsf, 2011), not in a product.'},
    dec:{x:240,y:120,w:190,h:110,t:'RD10 decision',s:['Cyclone IV E, F484','AS from 16-Mbit flash','3.3 V / 1.8 V banks','clocks on CLK pins'],d:'Completed 2011-12-01, the date of the AMS16TEST “dec12011” snapshot in RD23.', live:()=>true},
    fpga:{x:480,y:30,w:150,h:70,t:'FPGA U3/U4',s:[()=>D.dev],d:()=>`Now: ${st()} — ${stateAt(SIM.t).d}`, live:()=>st()==='USER'},
    flash:{x:480,y:120,w:150,h:56,t:'M25P16 U12/U13',s:['16 Mbit, AS'],d:'DCLK, ASDI, NCS, CNF_DATA through R97 25R5 to DATA0.', live:()=>['CMD','DATA'].includes(st())},
    avr:{x:480,y:196,w:150,h:64,t:'ATmega128',s:['boot code races the FPGA'],d:'AMS16: watches CONF_DONE. AMS8E-1: holds nCONFIG low through Q1, then cannot see CONF_DONE.'},
    ams16:{x:660,y:20,w:150,h:64,t:'AMS16-3G',s:['EP4CE30, Oct 2012'],d:'AMS16TEST v700, EP4CE30F23C8 (BOM I7N).', link:'<a href="siumulation.html?plugin=ams16#sim">open the AMS16 plugin</a>'},
    ams8e:{x:660,y:104,w:150,h:64,t:'AMS8E-1 iss5',s:['AMS81 / 32ME / RD72/79/85'],d:'Main board for the AMS81 family from 2013, compiled for EP4CE40F23C6 with an EP4CE30F23I7 revision.', link:'<a href="siumulation.html?plugin=ams8e#sim">open the AMS8E plugin</a>'},
    mlc8:{x:660,y:188,w:150,h:64,t:'MLC8N',s:['RD66, same board'],d:'MLC8 on AMS8E-1 iss5 (2013); MLC8N v050000 (2015) adds RD85 Archwave pins.', link:'<a href="siumulation.html?plugin=mlc8#sim">open the MLC8 plugin</a>'},
    still:{x:660,y:300,w:150,h:64,t:'Stayed Cyclone II',s:['M6204, M6205'],d:'Planned for EP4CE40F23C6N in the price sheet; every .qsf to 2016 still targets EP2C35F484C6.'},
  };
  B.fpga.s = [D.dev];
  blockView(m, B, [['docs','dec',''],['pins','dec',''],['price','dec',''],['notes','dec',''],['kit','dec','tried'],['dec','fpga','part'],['dec','flash','config'],['flash','fpga','AS'],['avr','fpga','nCONFIG / SPI'],['fpga','ams16',''],['fpga','ams8e',''],['ams8e','mlc8',''],['price','still','plan']], {start:'dec', w:830, h:400,
    side:'<p>RD10 turned a price list and a handbook into one platform: a Cyclone IV E in FBGA-484, booted in Active Serial mode from a 16-Mbit flash, which three product lines then shared.</p>'});
}

/* ---------- schematics ---------- */
const SHEETS = [
  { name:'1 · AS configuration (AMS8E-1 iss5)', note:'Redrawn from Ams8e-1iss5-net.ipc (01/11/2012) and AMS8E-1 ISS5 - ALTIUM.csv: U4 config balls, U13 M25P16, H2 AS header, U14 ATmega128 port A/E/B, Q1 2N4401. Values from the BOM.', svg:()=>{
    let s = chip(500,60,160,'U4 EP4CE40F23C6N',[['K2 DCLK','DCLK'],['K1 DATA0','NetR97_1'],['D1 ASDO','ASDI'],['E2 nCSO','NCS'],['L3 nCE','NCE'],['K5 nCONFIG','N_CONFIG'],['K6 nSTATUS','N_STATUS'],['M18 CONF_DONE','CONF_DONE']],[['M17 MSEL0','GNDD'],['L18 MSEL1','+2V5'],['L17 MSEL2','GNDD'],['K20 MSEL3','GNDD'],['L22 INIT_DONE','NNAME5→U10'],['L21 CRC_ERROR','NNAME6→U10'],['K22 nCEO','—']],'FBGA-484, bank 1/6');
    s += chip(120,60,110,'U13 M25P16',[['16 C','DCLK'],['8 Q','CNF_DATA'],['15 D','ASDI'],['7 S#','NCS']],[['2 VCC','+3V3'],['9 W#','+3V3'],['1 HOLD#','+3V3'],['10 VSS','GNDD']],'SO16');
    s += res(150,262,false,'R97','25R5') + `<text x="120" y="285" font-size="10" fill="var(--ink2)">CNF_DATA → DATA0 (near-end series R)</text>`;
    s += res(520,250,true,'R183','1k↑') + res(590,250,true,'R186','1k↑') + res(660,250,true,'R184','1k↑') + res(730,250,true,'R182','1k↓ NCE');
    s += chip(120,320,130,'U14 ATmega128L',[['51 PA0','DCLK'],['50 PA1','CNF_DATA'],['49 PA2','ASDI'],['48 PA3','NCS'],['47 PA4','NCE']],[['5 PE3','N_CONFIG'],['17 PB7','ALTERA_RESET']],'bottom side');
    s += `<g transform="translate(400,340)"><text x="0" y="0" font-size="12" font-weight="700" fill="var(--ink)">Q1 2N4401</text><line x1="0" y1="30" x2="40" y2="30" stroke="var(--ink)"/>${res(40,30,false,'R181','10k')}<line x1="66" y1="30" x2="90" y2="30" stroke="var(--ink)"/><line x1="90" y1="14" x2="90" y2="46" stroke="var(--ink)" stroke-width="2"/><line x1="90" y1="22" x2="112" y2="8" stroke="var(--ink)"/><line x1="90" y1="38" x2="112" y2="52" stroke="var(--ink)"/><text x="116" y="8" font-size="10" fill="var(--accent2)">N_CONFIG</text><text x="116" y="56" font-size="10" fill="var(--accent2)">GNDD</text><text x="-2" y="46" font-size="10" fill="var(--accent2)">ALTERA_RESET</text></g>`;
    s += chip(690,310,90,'H2 AS header',[['1','DCLK'],['3','CONF_DONE'],['5','N_CONFIG'],['7','CNF_DATA'],['9','ASDI']],[['2','GND'],['4','+3V3'],['6','NCE'],['8','NCS'],['10','GND']]);
    return s; } },
  { name:'2 · JTAG and power', note:'Redrawn from Ams8e-1iss5-net.ipc: JTAG1 pull resistors, U4 supply balls (28 VCCINT on +1V2, all 36 VCCIO on +3V3, VCCA on VCCPLL1–4), REG2 TPS70402 (+1V2/+2V5).', svg:()=>{
    let s = chip(120,70,130,'JTAG1 (H2X5)',[['1 TCK','TCK'],['3 TDO','TDO'],['5 TMS','TMS'],['9 TDI','TDI']],[['4','+2V5'],['2,10','GNDD']]);
    s += res(330,180,true,'R179','1k → GND (TCK)') + res(430,180,true,'R185','10k → +2V5 (TMS)') + res(560,180,true,'R180','10k → +2V5 (TDI)');
    s += chip(330,280,200,'U4 supplies',[['VCCINT ×28','+1V2'],['VCCD_PLL1–4','+1V2'],['VCCA1–4','VCCPLL1–4 (L2, L5, L7, L8 4N7)']],[['VCCIO1–8 ×36','+3V3'],['GND ×67','GNDD'],['MSEL1','+2V5']]);
    s += chip(590,80,120,'REG2 TPS70402',[['VIN','+5V']],[['OUT1','+1V2'],['OUT2','+2V5'],['8','RESET_TPS70402']]);
    return s; } },
  { name:'3 · AMS16-3G FPGA banks and clocks', note:'Redrawn from AMS16TEST.qsf (v700, 24 Oct 2012), altpll1.vhd and ams163g.sdc. Pin numbers and IO_STANDARD are as assigned; bank voltages follow from them.', svg:()=>{
    let s = chip(300,60,230,'U3 EP4CE30F23C8 (BOM I7N)',[['T22 CLK7','RCVR_PCLK 148.5 MHz'],['AB11 CLK14','AUDIO_CLOCK 12.288'],['G1 CLK1','HDCLK_ics662_clkout'],['N19–Y22','RCVR_DOUT[19:0] 1.8 V'],['W17','RCVR_CS_N'],['F20','SRL_LOCKED']],[['B1–3,8','3.3-V LVTTL (103 pins)'],['B4–7','1.8 V (82 pins)'],['B7 A13…B18','SRL_DIN[19:9]'],['B8 A7…C4','ALTERA0–16 (Atmel)'],['E4 (nRESET opt.)','altera7']],'Cyclone IV E, AS');
    s += `<g transform="translate(300,300)"><rect width="230" height="80" fill="var(--panel2)" stroke="var(--ink)"/><text x="10" y="18" font-size="12" font-weight="700" fill="var(--ink)">altpll1 (AUTO)</text><text x="10" y="36" font-size="10.5" fill="var(--ink)">inclk0 6734 ps ← RCVR_PCLK</text><text x="10" y="52" font-size="10.5" fill="var(--ink)">c0 ×1 0° · c1 ×1 3367 ps (180°)</text><text x="10" y="68" font-size="10.5" fill="var(--ink2)">altpll0.vhd: Cyclone II FAST PLL, unused</text></g>`;
    s += `<text x="40" y="420" font-size="11" fill="var(--ink)">ams163g.sdc: RECEIVER_PCLK_PLL_3G 6.734 ns · _SD 37 ns · PLL1705_AUDIO_CLOCK 81.38 ns · lrclk ÷256 · sclk ÷4 · 3G/SD groups exclusive</text>`;
    return s; } },
  { name:'4 · AMS81 clock tree', note:'Redrawn from AMS81.sdc, altpll0/1/2.v, PLLJ_PLLSPE_INFO.txt (jitter 37 ps, SPE −53/+84 ps) and clkdiv_98M304_to_12M288.vhd of AMS81 V050000.', svg:()=>{
    const box = (x,y,w,t,l2) => `<rect x="${x}" y="${y}" width="${w}" height="46" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+8}" y="${y+18}" font-size="11.5" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+8}" y="${y+35}" font-size="10" fill="var(--ink2)">${l2}</text>`;
    const ar = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.4"/>`;
    let s = box(30,80,170,'DSPCLK1 A11 (CLK10)','12.288 MHz dspref') + box(30,200,170,'AES5_REF_MCLK B12 (CLK9)','12.288 MHz cs8416ref');
    s += box(260,80,150,'altpll2 inst60','×8 → 98.304 MHz') + box(260,200,150,'altpll1 inst59','×8 → 98.304 MHz') + box(470,200,190,'clkdiv inst68 / inst69','counter(2) → clk_div8 12.288');
    s += box(260,320,150,'altpll0 inst39','24.576 → ×4, ÷2');
    s += ar(200,103,260,103)+ar(200,223,260,223)+ar(410,223,470,223)+ar(410,103,470,140);
    s += `<text x="470" y="140" font-size="10.5" fill="var(--ink2)">dsppllout_98M304 → I2S/TDM to SHARC</text><text x="40" y="420" font-size="11" fill="var(--ink)">MLC8N adds ARCH_MCLK_PIN T2 (CLK2) 12.288 MHz and ARCH_FSYNC_PIN T1 (CLK3) 48 kHz on the i64 MADI header balls.</text>`;
    return s; } },
];
function viewSchem(m){ window[KEY] = false; sheetsView(m, SHEETS, 'the AMS8E-1 iss5 netlist and the Cyclone IV .qsf/.sdc files', 'RD10 has no schematic of its own. These sheets redraw the circuits its decisions produced.'); }

/* ---------- cycle-by-cycle VHDL: two entities from the Cyclone IV designs ---------- */
const HDL = {
  clkdiv: { name:'clkdiv_98M304_to_12M288', file:'AMS81 V050000/clkdiv_98M304_to_12M288.vhd', bits:8, outBit:2, clk:'98.304 MHz (altpll c0)', rst:'reset_n', out:'clk_div8',
    src:['IF rising_edge(clk) THEN','  if reset_n=\'0\' then counter<="00000000";','  else counter<=counter+1;','    if counter(2)=\'1\' then clk_div8<=\'1\';','    else clk_div8<=\'0\'; end if;','  end if;','end if;'] },
  rdelay: { name:'reset_delay_V', file:'AMS16-3G v700/Altera/reset_delay_V.vhd (used in hd_demux16.bdf)', bits:6, outBit:5, clk:'clk', rst:'reset', out:'resout',
    src:['IF rising_edge(clk) THEN','  if reset=\'0\' then counter<="000000";','  else counter<=counter+1;','    if counter(5)=\'1\' then resout<=\'1\';','    else resout<=\'0\'; end if;','  end if;','end if;'] },
};
function hdlReset(){ D.hst = { n:0, rst:0, cnt:0, out:0, line:1 }; D.hcyc = []; hdlStep(3); D.hst.rst = 1; hdlStep(45); }
hdlReset();
function hdlStep(k){ const H = HDL[D.hdl], s = D.hst;
  for (let i=0;i<k;i++){ const old = s.cnt;
    if (!s.rst){ s.cnt = 0; s.line = 1; } else { s.cnt = (old+1) & ((1<<H.bits)-1); s.out = (old>>H.outBit)&1; s.line = s.out? 3 : 4; }
    s.n++; D.hcyc.push({ n:s.n, rst:s.rst, cnt:s.cnt, out:s.out }); if (D.hcyc.length>96) D.hcyc.shift(); } }
function hdlHTML(){
  const H = HDL[D.hdl], s = D.hst, rows = D.hcyc;
  const W = 640, x0 = 70, cw = rows.length? Math.min(14,(W-x0-8)/rows.length) : 14;
  let w = `<svg viewBox="0 0 ${W} 120" style="width:100%;max-width:820px;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  const sig = (y, lab, f, col) => { w += `<text x="4" y="${y+12}" font-size="10" fill="var(--ink)">${lab}</text>`; let p = ''; rows.forEach((r,i)=>{ const v = f(r); const yy = v? y+2 : y+16; p += `${i?'L':'M'}${x0+i*cw},${yy}L${x0+(i+1)*cw},${yy}`; }); w += `<path d="${p}" fill="none" stroke="${col}" stroke-width="1.5"/>`; };
  w += `<text x="4" y="14" font-size="10" fill="var(--ink)">clk</text>`; rows.forEach((r,i)=>{ w += `<path d="M${x0+i*cw},${22}L${x0+i*cw},${6}L${x0+(i+.5)*cw},6L${x0+(i+.5)*cw},22L${x0+(i+1)*cw},22" fill="none" stroke="var(--ink2)"/>`; });
  sig(28, H.rst, r=>r.rst, 'var(--warn)');
  sig(52, `counter(${H.outBit})`, r=>(r.cnt>>H.outBit)&1, 'var(--accent2)');
  sig(76, H.out, r=>r.out, 'var(--accent)');
  w += `<text x="${x0}" y="114" font-size="9.5" fill="var(--ink2)">${rows.length} cycles shown · counter = ${s.cnt} (0x${s.cnt.toString(16)}) · ${H.out} = ${s.out}</text></svg>`;
  const code = H.src.map((l,i)=>`<div class="${i===s.line?'hl':''}">${l.replace(/</g,'&lt;')}</div>`).join('');
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${Object.keys(HDL).map(k=>`<button data-h="pick" data-v="${k}" class="${D.hdl===k?'on':''}">${HDL[k].name}</button>`).join('')}
    <button data-h="rst" class="${s.rst?'':'on'}">${H.rst} = ${s.rst}</button><button data-h="s1">clk ▶ 1</button><button data-h="s8">▶ 8</button><button data-h="s70">▶ 70</button><button data-h="clr">clear</button></div>
    <p class="small muted mono">${H.file} · clock ${H.clk}</p>${w}<div class="log" style="max-height:150px">${code}</div>`;
}
function bindHdl(root, redraw){ root.querySelectorAll('[data-h]').forEach(b=> b.onclick = ()=>{ const k = b.dataset.h;
  if (k==='pick'){ D.hdl = b.dataset.v; hdlReset(); act('HDL → '+HDL[D.hdl].name, tr=>tr(HDL[D.hdl].file)); }
  else if (k==='rst'){ D.hst.rst ^= 1; act(`${HDL[D.hdl].rst} ← ${D.hst.rst}`, tr=>tr('synchronous: takes effect on the next rising edge')); }
  else if (k==='clr'){ hdlReset(); }
  else { const n = k==='s1'?1:k==='s8'?8:70; hdlStep(n); const s = D.hst, H = HDL[D.hdl];
    act(`${n} rising edge${n>1?'s':''} of clk`, tr=>{ tr(`counter = ${s.cnt.toString(2).padStart(H.bits,'0')} · ${H.out} = ${s.out} (registered copy of the previous counter(${H.outBit}))`);
      if (D.hdl==='rdelay' && s.n>64 && s.rst) tr('resout keeps toggling every 32 clocks: the counter wraps, so this is a 64-clock square wave, not a one-shot reset delay');
      if (D.hdl==='clkdiv' && s.rst) tr('clk_div8 = 98.304 MHz ÷ 8 = 12.288 MHz, 50 % duty, one clock behind counter(2)'); }); }
  redraw(); }); }

/* ---------- software tab ---------- */
const CFG_STATES = ['POR — nSTATUS, CONF_DONE low (MSEL sampled)','RESET — nCONFIG low / tCF2ST1','CMD — nCSO↓, opcode + address on ASDO','DATA — bitstream on DATA0, one bit per DCLK','INIT — CONF_DONE↑, tCD2UM 300–650 µs','USER — I/O released, PLLs lock'];
const CFG_IDX = { POR:0, RESET:1, CFG:1, CMD:2, DATA:3, INIT:4, USER:5, JTAG:3, ERROR:3, STALL:1 };
function viewSoft(m){ window[KEY] = false;
  m.innerHTML = `<div class="grid2"><div>${card('Cyclone IV configuration state machine (cyiv-51008 ch. 8)', `<div id="sm"></div>`)}${card('AS command on ASDO, bit by bit', `<div id="cmd"></div>`)}${card('Serial-flash opcodes (EPCS Table 3-8)', `<div id="ops"></div>`)}</div>
    <div>${card('ATmega128 main() — the step running now', `<div id="avr"></div>`)}${card('Project settings that decide the boot (.qsf / .cdf)', `<div id="qsf"></div>`)}</div></div>
    ${card('Cycle-by-cycle VHDL', `<div id="hdl"></div>`)}`;
  const hdlDraw = ()=>{ const h = m.querySelector('#hdl'); h.innerHTML = hdlHTML(); bindHdl(h, hdlDraw); };
  const draw = ()=>{ const T = TL(), st = stateAt(SIM.t);
    m.querySelector('#sm').innerHTML = flowSVG(CFG_STATES, CFG_IDX[st.s], {w:520}) + `<p class="small">${st.s}: ${st.d}</p>`;
    const op = D.op, word = [...Array(8)].map((_,i)=>(op>>(7-i))&1).concat(Array(24).fill(0), Array(OPS[op].dummy).fill(0));
    const nb = st.s==='CMD'? st.bit : st.s==='DATA'||st.s==='INIT'||st.s==='USER'? word.length : -1;
    m.querySelector('#cmd').innerHTML = `<div class="mono small" style="word-break:break-all">${word.map((b,i)=>`<span style="${i<nb?'color:var(--accent);font-weight:700':i===nb?'background:var(--play);color:#fff':'opacity:.5'}">${b}</span>${i===7||i===31?' │ ':(i%8===7?' ':'')}`).join('')}</div>
      <p class="small muted">0x${hex2(op)} ${OPS[op].n} · address 0x000000${OPS[op].dummy?' · 1 dummy byte':''} = ${word.length} DCLKs, then ${T.bits.toLocaleString()} data bits. ${st.s==='DATA'?`Now at data bit ${st.bit.toLocaleString()} = byte 0x${Math.floor(st.bit/8).toString(16).toUpperCase()} of the image.`:''}</p>`;
    m.querySelector('#ops').innerHTML = tbl(['op','code','addr','dummy','fMAX'], [['Write enable','06',0,0,25],['Read status','05',0,0,25],['Read bytes','03',3,0,20],['Read silicon ID','AB',0,3,25],['Fast read','0B',3,1,40],['Write bytes','02',3,0,25],['Erase bulk','C7',0,0,25],['Erase sector','D8',3,0,25]].map(r=>[r[1]===hex2(D.op)?`<b>${r[0]}</b>`:r[0],`<span class="mono">${r[1]}h</span>`,r[2],r[3],r[4]+' MHz']));
    m.querySelector('#avr').innerHTML = flowSVG(T.steps.map(s=>`${ms(s.t0)} · ${s.n.replace(/<[^>]+>/g,'')}`.slice(0,88)), avrStepAt(SIM.t), {w:560, rh:26, done:true})
      + `<p class="small muted">${D.prod==='ams16'?'ams16.c main(); wait() = 7 cycles per pass (common.lis), so wait(50000) = 71.2 ms':'v200w.c / v100w.c main(); wait_ms() = 807 cycles per “ms” (v200w.lis), so wait_ms(500) = 82.1 ms'} at 4.9152 MHz.</p>`;
    const p = P();
    m.querySelector('#qsf').innerHTML = kv([['File', `<span class="small">${p.qsf}</span>`],['DEVICE', `<span class="mono">${p.qsfDev}</span>${p.alt?' · '+p.alt:''}`],['Config device', `<span class="mono">${p.cfgDev}</span>`],['Programmer chain', `<span class="mono small">${p.cdf}</span>`],
      ['Pins', `${PINS[D.prod].length} set_location_assignment`],['Default I/O', D.prod==='ams16'? 'STRATIX_DEVICE_IO_STANDARD "2.5 V"; every used pin overridden (3.3-V LVTTL or 1.8 V)' : 'STRATIX_DEVICE_IO_STANDARD LVCMOS; no per-pin standards'],
      ['Other', D.prod==='ams16'? 'ON_CHIP_BITSTREAM_DECOMPRESSION OFF · GENERATE_RBF_FILE ON · ERROR_CHECK_FREQUENCY_DIVISOR 1 · RESERVE_PIN … RCVR_* "AS INPUT TRI-STATED"' : 'DEVICE_MIGRATION_LIST "EP4CE40F23C6,EP4CE30F23C6" · RESERVE_ASDO_AFTER_CONFIGURATION "AS INPUT TRI-STATED" · ENABLE_SIGNALTAP ON'],
      ['Board', p.board? 'MSEL 0010, R97 25R5, R182 nCE 1 k↓, R183/R184/R186 1 k↑, Q1 on nCONFIG' : 'U12 M25P16 (AMS163G-ISS7-BOM.xls)']]);
  };
  hdlDraw();
  SIM.on('time', draw);
}

/* ---------- findings ---------- */
function viewFindings(m){ window[KEY] = false;
  m.innerHTML = card('What RD10 decided, and what became of it', `<ol>
   <li><b>The decision record is a one-page price sheet.</b> CycloneIv_Price_Comparison.xls (created 19 May 2011|44) lists LEs per project and a replacement for each: AMS16 (16,860 LEs, 46 units in 2010) → EP4CE30F23C8N in place of EP2C35F484C8; M6205 (30,000 LEs) and M6204 → EP4CE40F23C6N in place of EP2C35F484C6N; “32 Channel audio meter” → EP4CE30F23C6N. RD10 is marked complete on 2011-12-01, the date of the <span class="mono">dec12011/AMS16TEST.qsf</span> snapshot in RD23.</li>
   <li><b>What happened next.</b> The AMS16-3G (v700, 24 Oct 2012|45) shipped on EP4CE30 (qsf EP4CE30F23C8, BOM EP4CE30F23I7N). The AMS8E-1 iss5 board (AMS81 family, 32ME, MLC8/MLC8N, RD72/79/85) carried it from 2013. The M6205 and M6204 never moved: every .qsf in those folders up to 2016 still targets EP2C35F484C6.</li>
   <li><b>EP4CE30 and EP4CE40 are the same die to the configuration logic.</b> The handbook gives both the JTAG IDCODE 0x020F40DD and the same 9,534,304-bit .rbf. The F484 columns of EP4CE30.xls and EP4CE40.xls agree in all 484 balls. That is why AMS81.qsf can carry <span class="mono">DEVICE_MIGRATION_LIST "EP4CE40F23C6,EP4CE30F23C6"</span> and a second revision, <span class="mono">ams81-ep4ce30.qsf</span> (1 Apr 2013, EP4CE30F23I7). The price difference was $99.55 against $39.92 list. The AMS8E plugin says a CE30 image will not configure a CE40. The archived data does not show any difference the configuration hardware could detect; whether it works was never recorded ${inf}.</li>
   <li><b>BOM flip on AMS8E-1 iss5.</b> ALTIUM.csv fits EP4CE40F23C6N. AMS8E-1 ISS5 - MISYS.xls (22 Mar 2013) and the 2016 BOMs fit EP4CE30F23I7N (“First time build use Non-RoHS part number EP4CE30F23I7. In stock at Arrow at $55.00”). The industrial -7 part is slower than the -6 the main project is compiled for, so the EP4CE30F23I7 revision is the one that matches the hardware.</li>
   <li><b>“EPCS1” in a Cyclone IV project.</b> AMS81.qsf (AMS81 V050000, MLC8N v050000, RD60/66/72/79/85 copies) still says <span class="mono">CYCLONE_CONFIGURATION_DEVICE EPCS1</span>. The project was created on 18 Nov 2004 in Quartus 4.1 SP2 for a Cyclone I part. RD10's own configuration handbook says “EPCS1 does not support Cyclone IV devices because of its insufficient memory capacity” (1 Mbit against a 9.5 Mbit image). The assignment is an old Cyclone-family setting; the .cdf programs <span class="mono">EPCS16 AMS81.pof</span>, and the board has an M25P16.</li>
   <li><b>M25P16, not Altera EPCS16, on both boards</b> (U12 on AMS16-3G, U13 on AMS8E-1 iss5; $0.884 in MISYS). It has the same 16 Mbit and the same opcodes the model uses ${inf}. The data line has the 25 Ω near-end resistor the handbook asks for (R97 25R5).</li>
   <li><b>AMS8E-1 boot race.</b> port_init writes <span class="mono">PORTB = 0xF4</span>. That sets PB7 = ALTERA_RESET, which drives Q1 (2N4401, via R181 10 k) to pull N_CONFIG low. main() then runs nine <span class="mono">wait_ms(500)</span> calls. The listing shows wait_ms costs 807 cycles per “ms” (164 µs at 4.9152 MHz), so the comment “this loop equals one ms” is about 6× off and the wait is 739 ms. CONFIGURE_ALTERA waits 33 ms and releases nCONFIG. AMS81-AEM <span class="mono">vcurrent/v200w.c</span> then calls ALTERA_read_write() straight away, 240–480 ms before the FPGA can answer. The Atmel cannot see CONF_DONE on this board (U4.M18 goes only to R184 and H2.3); the main loop repeats the access, so the error clears itself.</li>
   <li><b>The MLC8 port waits.</b> RD66 <span class="mono">v100w.c</span> (3 Apr 2013) has the same CONFIGURE_ALTERA but adds six wait_ms(500) after it (493 ms). That covers configuration even at the slowest 20 MHz DCLK.</li>
   <li><b>AMS16-3G watches CONF_DONE.</b> <span class="mono">isAlteraReady()</span> returns <span class="mono">PIND &amp; BIT6</span>. When it is false the main loop sets <span class="mono">fpgaReprogrammed</span>; when it is true again it runs <span class="mono">resetAndInit()</span>. A JTAG reload or a late configuration is therefore handled. The GLOBAL_RESET pulse in main() comes 576–718 ms after the ATmega starts. With a 200 ms POR and a 20 MHz DCLK, the FPGA is not configured until about 680 ms, so the design can miss that pulse; the model shows the case (POR and start-up times ${inf}).</li>
   <li><b>The 21 Jan 2013 port_init fix.</b> Before it, <span class="mono">DDRA = 0xF0; PORTA = 0xFF</span> drove PA4 high. On iss5, PA4 (U14.47) is NCE, so the FPGA could never configure from the flash. After the fix, <span class="mono">DDRA = 0xC0; PORTA = 0x8F</span>. The old CS8416 routines still toggle PORTA bits 4–7 (<span class="mono">CS8416_write_ALL</span>), which now only switches the pull-up on NCE against R182 1 k. Use the “pre-21-Jan-2013 port_init” option to see the old behaviour.</li>
   <li><b>Unused hardware for in-system update.</b> On iss5 the ATmega reaches the whole AS bus (PA0 DCLK, PA1 CNF_DATA, PA2 ASDI, PA3 NCS, PA4 NCE) and nCONFIG (PE3 directly, PB7 through Q1). AMS16's ams16.c also names ASDI/CNF_DATA/DCLK/NCS/NCE on PORTE. No archived firmware writes the flash; only the comments and the wiring remain.</li>
   <li><b>The DPCLK rule was followed.</b> Every PLL input sits on a dedicated CLK pin: RCVR_PCLK T22 (CLK7) → altpll1, AUDIO_CLOCK AB11 (CLK14), DSPCLK1 A11 (CLK10) → altpll2, AES5_REF_MCLK B12 (CLK9) → altpll1, and MLC8N's ARCH_MCLK_PIN T2 (CLK2). Some ordinary signals use DPCLK balls (for example ALTERA16_ATMEL_CS on C4 = CDPCLK7, RFS1 on B9 = DPCLK10). One oddity: the iss5 board net called <span class="mono">DPCLK5</span> lands on A18, an ordinary I/O; the real DPCLK5 is V13.</li>
   <li><b>Board net names vs .qsf names.</b> Of AMS81's 102 pins, 97 match the iss5 netlist exactly. The rest are renames: AES-5_ref_out/AES_REF_FPGA, AES5_REF_MCLK/MCLK_REF, portc4/DPCLK5, and two DAC pins behind series resistors. The MLC8N revision adds six ARCH_* pins (RD85 Archwave) onto the i64 MADI header balls (T1/T2 = FSYNC_IN_I64/MCLK_IN_I64). Its SEARCH_PATH points to <span class="mono">c:/ali/projects/arch_monitor</span>.</li>
   <li><b>EP4CE55 would not drop in.</b> 36 F484 balls change role: 20 I/O become VCCINT/GND, and 16 VCCIO/GND become I/O. No product uses those 20 I/O balls, but on AMS8E-1 iss5 they are unconnected, so a CE55 would have 10 VCCINT and 10 GND balls floating.</li>
   <li><b>Leftovers.</b> AMS16-3G's <span class="mono">altpll0.vhd</span> is a Cyclone II “FAST” PLL (74.25 MHz × 4/11 = 27 MHz), referenced only by the old AMS16A.bdf. <span class="mono">reset_delay_V.vhd</span> is not a one-shot: its 6-bit counter wraps, so resout toggles every 32 clocks (see the Software tab). The talkback files inside the Cyclone IV AMS81 folders (RD24, RD72) are 13 Feb 2006 EP1C6Q240C7 runs, so no Cyclone IV fit result is archived anywhere.</li>
   <li><b>Nothing measured on power.</b> The PowerPlay EPE workbook in RD10 is Altera's blank template (device 5CEBA7, a Cyclone V). The only WBS power study for these boards is RD22's later regulator sheet.</li>
   <li><b>The dev kit stayed a dev kit.</b> The Cyclone IV GX kit (EP4CGX150DF31) is unmodified. GX transceivers turn up only in the Demux4/RD31 SDI experiments (<span class="mono">c4gx_f896_host.qsf</span> 2011, <span class="mono">sdi_test.qsf</span> EP4CGX50CF23C6 2012), not in a shipped product.</li>
  </ol>`) + card('Assumptions', `<ul class="small">
   <li>POR delay (standard 50–200 ms, fast 3–9 ms), PLL lock time (1 ms) and ATmega start-up (65 ms): Cyclone IV and ATmega128 datasheet values that are not in the archive ${inf}.</li>
   <li>The AS read opcode: the EPCS data sheet limits Read bytes (03h) to 20 MHz and Fast read (0Bh) to 40 MHz; which one the FPGA issues is not stated ${inf}.</li>
   <li>Durations of the short ATmega routines (initialization, SPI bursts, gs2970AInit) are estimates; the long waits are counted from the .lis listings ${inf}.</li>
   <li>The compressed size factor (0.6), and USB-Blaster TCK of 6 MHz ${inf}.</li>
   <li>AMS16-3G MSEL straps are not read from a netlist; AS standard POR is assumed ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>ENGINEERING - 2016 RD FILES/R&amp;D_List.xls (RD10) · RD10_cycloneIV/CycloneIv_Price_Comparison.xls, IO_Notes.xlsx, pinouts/*.xls, cyclone4-handbook.pdf, cyiv-51008Programming.pdf, cyc_c51014EPCSDevicesDatasheet.pdf, an447…pdf, PowerPlay/*</li>
   <li>AMS16 - #Master/…/AMS16-3G v700 October 24 2012/Altera/AMS16TEST.qsf, .cdf, ams163g.sdc, altpll0/1.vhd, reset_delay_V.vhd · Atmel Main Board/ams16.c, altera.c, common.c/.lis, sharc.c · AMS163G-ISS7-BOM.xls</li>
   <li>AMS81 - #Master/…/#V050000/AMS81.qsf, ams81-ep4ce30.qsf, AMS81.cdf, AMS81.sdc, altpll0/1/2.v, PLLJ_PLLSPE_INFO.txt, clkdiv_98M304_to_12M288.vhd · #MLC - #SERIES/…/MLC8N…#v050000/AMS81.qsf</li>
   <li>RD60…/atmel/ams8e-1/vcurrent/v200w.c, v200w.lis · RD66…/ATmel/ams8e-1/v105/v100w.c</li>
   <li>AMS8E - #Master/AMS8E-1 - #Master/ALTIUM.csv, MISYS.xls, AMS8E-1 ISS5.xlsx, AMS8E-1-ISS5-GERBER.zip (GTO, GTS, net.ipc) · MISC/BOM Summary Tool.xlsx</li></ul>
   <p class="small">Related plugins: <a href="siumulation.html?plugin=ams16#findings">AMS16-3G</a> · <a href="siumulation.html?plugin=ams8e#findings">AMS8E</a> · <a href="siumulation.html?plugin=mlc8#findings">MLC8</a> · <a href="siumulation.html?plugin=rd5-incremental-compilation#findings">RD5</a> · <a href="siumulation.html?plugin=rd20-veriloghdl#findings">RD20</a></p>`);
}

SIM.register({
  id:'rd10-cycloneiv', name:'RD10 Cyclone IV · FPGA adoption and power-on model ('+SIM.year(2011)+')', duration:DUR,
  product:'RD10 Cyclone IV', year:2011, family:'R&D register', folder:'ENGINEERING - 2016 RD FILES/RD10_cycloneIV',
  summary:'Peter’s 2011 evaluation of the Altera Cyclone IV E: price, logic, pins, configuration flash and clocking, followed into the AMS16-3G, the AMS8E-1 iss5 board (AMS81 family) and the MLC8N. Power the boards up in slow motion: the ATmega128 boot code, the Active Serial read of the M25P16 bit by bit, CONF_DONE, user mode and PLL lock.',
  highlights:['Price sheet decisions checked live (LEs, cost, flash, IDCODE, pins)','AS configuration bit by bit: opcode, address, DCLK count','ATmega boot races timed from the compiled .lis cycle counts','Real AMS8E-1 iss5 board from Gerbers and the IPC netlist','FBGA-484 ball map from Altera’s pin tables with each product’s .qsf','Cycle-by-cycle VHDL of two Cyclone IV entities'],
  depth:'Full model',
  stepUnits:[ {label:'1 DCLK', period:()=>1/(D.dclk*1e6)}, {label:'1 ATmega wait_ms “ms” (164 µs)', period:()=>807/AVR_HZ}, {label:'1 ms', period:()=>1e-3}, {label:'10 ms', period:()=>0.01} ],
  zooms:[[1.5,'1.5 s (whole)'],[0.5,'500 ms'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0001,'100 µs'],[0.00001,'10 µs'],[0.000002,'2 µs']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the investigation', render:viewTutorial},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
