/* =====================================================================
   M8252 — equalizing / clamping analog video DA
   Plugin for the WBS Device Simulator (../siumulation.html).
   Sources (all under #MF8200 #SERIES/M8252 - #Master  #MF82/):
   - M8252 - #PCB/M8252.PCB (= M8252.BAK; Tango ASCII, 21 Nov 1997), M8252.REP (DRC report)
   - M8252 - #PCB/M8252.DSN (OrCAD, 9 Mar 2001), M8252.DBK (OrCAD backup, 17 Nov 1997)
   - ../M8251 - #Master  #MF82/M8251 - #Engineering/m8251man.pdf, m8251term.cdr, PCB/M8251.BAK, PCB/M8251-2.BAK
   - ../8200 Series Rear Module options graphical Guides…/M8251 - rear module options.cdr
   Assets: m8252-board.png (rendered from M8252.PCB), m8252-rear-bnc.png (M8251 terminal art, cut from m8251term.cdr)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const DATA = {
 "id": "m8252",
 "product": "M8252",
 "year": 1997,
 "what": "equalizing / clamping analog video DA",
 "name": "M8252 · Equalizing/clamping video DA (1997|30)",
 "family": "8200 Distribution Series",
 "folder": "#MF8200 #SERIES/M8252 - #Master  #MF82",
 "summary": "The cable-equalizing, hum-clamping version of the M8251 video DA. It keeps the M8251’s EL2099 output stage and eight 75 Ω outputs and adds an OPA650 equaliser and an LM1881-keyed back-porch clamp. Laid out in Tango in Nov 1997|30; the OrCAD sheet titled “ANALOG VIDEO DA — EQULIZING/CLAMPING” was revised in 2001|34.",
 "highlights": [
  "Board drawn from the real M8252.PCB Tango layout",
  "Cable EQ: dial out up to 300 m of loss at 3.58 MHz",
  "LM1881 back-porch clamp kills 60 Hz hum, line by line",
  "BNC1 / BNC3 rear modules and the looping input",
  "Findings: M8251 title block and 12 stray frame connectors left in the files"
 ],
 "defModule": "BNC3",
 "eq": true,
 "clamp": true,
 "response": false,
 "levelPot": "500",
 "boardFile": "M8252.PCB (Tango-PCB PLUS, 21 Nov 1997)",
 "boardSrc": "M8252 - #PCB/M8252.PCB",
 "boardCaption": "M8252, ISSUE.1 — copper, pads and silk rendered from M8252.PCB (Tango ASCII)",
 "artSrc": "M8251 - #Engineering/m8251term.cdr",
 "artInf": "no M8252 terminal art exists; the M8251 BNC1/BNC3 modules are assumed because the output section is identical",
 "parts": [
  {
   "ref": "U1",
   "val": "EL2099C",
   "pat": "TO225",
   "x": 10350,
   "y": 2925,
   "w": 40,
   "h": 26,
   "what": "Video distribution amplifier: one stage drives all eight back-matched outputs (assembly text “EL2099C”)."
  },
  {
   "ref": "HIZ",
   "val": "link",
   "pat": "H1X3",
   "x": 11100,
   "y": 3725,
   "w": 22,
   "h": 30,
   "what": "Input termination link: Hi-Z (looping) or R3 75R0 across the input. Click to move it."
  },
  {
   "ref": "R3",
   "val": "75R0",
   "pat": "R400",
   "x": 10700,
   "y": 3850,
   "w": 34,
   "h": 10,
   "what": "75 Ω input termination, switched in by the HIZ link."
  },
  {
   "ref": "R1",
   "val": "47K",
   "pat": "R400",
   "x": 10700,
   "y": 4050,
   "w": 34,
   "h": 10,
   "what": "Input bias/bleed resistor: the input impedance when the HIZ link is in Hi-Z."
  },
  {
   "ref": "Q1",
   "val": "2N3904",
   "pat": "TO-92",
   "x": 10575,
   "y": 4000,
   "w": 18,
   "h": 18,
   "what": "Input buffer next to the input pins (assembly text 2N3904)."
  },
  {
   "ref": "R10",
   "val": "75R0 ×8",
   "pat": "R400",
   "x": 10700,
   "y": 2925,
   "w": 36,
   "h": 112,
   "what": "R10–R17: one 75R0 back-match resistor per output, OUT 1 (R10) to OUT 8 (R17)."
  },
  {
   "ref": "LEVEL",
   "val": "500",
   "pat": "POT4S",
   "x": 1800,
   "y": 3800,
   "w": 46,
   "h": 18,
   "what": "Front-edge LEVEL trim (500): sets the overall gain; long tracks run it back to U1."
  },
  {
   "ref": "REG1",
   "val": "LM317",
   "pat": "REG2",
   "x": 8400,
   "y": 2200,
   "w": 70,
   "h": 50,
   "what": "Positive regulator: +21 V frame rail → +11.4 V (221R / 1K8)."
  },
  {
   "ref": "REG2",
   "val": "LM337",
   "pat": "REG2",
   "x": 7500,
   "y": 2200,
   "w": 70,
   "h": 50,
   "what": "Negative regulator: −21 V → −11.4 V. The OrCAD sheet calls both regulators LM317; the board text says LM337 here."
  },
  {
   "ref": "P1",
   "val": "EDAC 30-way",
   "pat": "EDGE30/156",
   "x": 11525,
   "y": 2860,
   "w": 30,
   "h": 250,
   "what": "30-way 0.156″ edge connector into the MF82 backplane: power, input and the outputs to the rear module."
  },
  {
   "ref": "EQ",
   "val": "2K",
   "pat": "POT4S",
   "x": 2300,
   "y": 2150,
   "w": 46,
   "h": 18,
   "what": "Front-edge EQ pot (2K): sets the HF boost for the input cable length."
  },
  {
   "ref": "CV1",
   "val": "2-18p",
   "pat": "VCAP",
   "x": 3300,
   "y": 1925,
   "w": 26,
   "h": 26,
   "what": "Trimmer capacitor in the EQ network (2–18 pF)."
  },
  {
   "ref": "L1",
   "val": "10uH",
   "pat": "R400",
   "x": 2825,
   "y": 3100,
   "w": 34,
   "h": 10,
   "what": "10 µH inductor of the EQ network."
  },
  {
   "ref": "U2",
   "val": "OPA650A",
   "pat": "IC8",
   "x": 4149,
   "y": 2400,
   "w": 34,
   "h": 36,
   "what": "Wideband op-amp for the EQ / clamp stage (“NO SOCKET”)."
  },
  {
   "ref": "INA",
   "val": "BERG link",
   "pat": "H1X2",
   "x": 3625,
   "y": 2200,
   "w": 24,
   "h": 10,
   "what": "Two-pin link into the EQ/clamp section (with OUTA): fitted = section in circuit."
  },
  {
   "ref": "OUTA",
   "val": "BERG link",
   "pat": "H1X2",
   "x": 3625,
   "y": 2100,
   "w": 24,
   "h": 10,
   "what": "Two-pin link out of the EQ/clamp section."
  },
  {
   "ref": "RV1",
   "val": "20K",
   "pat": "TRIM1",
   "x": 4525,
   "y": 2550,
   "w": 24,
   "h": 24,
   "what": "20K trim beside the clamp transistors — clamp (blanking) level."
  },
  {
   "ref": "U4",
   "val": "LM1881",
   "pat": "IC8",
   "x": 5925,
   "y": 3350,
   "w": 34,
   "h": 36,
   "what": "Sync separator. R36 680K is its Rset; it gives composite sync, vertical sync and the burst/back-porch gate."
  },
  {
   "ref": "U3",
   "val": "74HC00",
   "pat": "IC14",
   "x": 5100,
   "y": 3350,
   "w": 50,
   "h": 36,
   "what": "Quad NAND: turns the LM1881 back-porch gate into the clamp drive."
  },
  {
   "ref": "REG3",
   "val": "78L05",
   "pat": "TO-92",
   "x": 6600,
   "y": 3800,
   "w": 18,
   "h": 18,
   "what": "+5 V for U3 and U4."
  },
  {
   "ref": "CV2",
   "val": "2-18p",
   "pat": "VCAP",
   "x": 6750,
   "y": 2950,
   "w": 26,
   "h": 26,
   "what": "Second 2–18 pF trimmer."
  },
  {
   "ref": "Q4",
   "val": "2N3904",
   "pat": "TO-92",
   "x": 3350,
   "y": 3000,
   "w": 18,
   "h": 18,
   "what": "Clamp / buffer transistor (Q3–Q6 are 2N3904)."
  }
 ],
 "blocks": [
  {
   "k": "in",
   "x": 10,
   "y": 40,
   "w": 150,
   "h": 96,
   "t": "Input + HIZ link",
   "s": [
    "BNC INPUT / INPUT LOOP",
    "R1 47K, R3 75R0",
    "Q1 2N3904 buffer"
   ],
   "d": "The looping input. The HIZ link chooses Hi-Z (loop through, terminate at the end of the line) or the on-card 75 Ω.",
   "parts": "HIZ (H1X3), R1, R3, Q1",
   "live": "M.vin.toFixed(3)+' V p-p'"
  },
  {
   "k": "lvl",
   "x": 200,
   "y": 40,
   "w": 150,
   "h": 96,
   "t": "LEVEL",
   "s": [
    "front-edge trim",
    "Q2 + R19 499R"
   ],
   "d": "Front-edge LEVEL trim. On the board it sits at the far front edge with long tracks back to U1.",
   "parts": "LEVEL, Q2, R18, R19",
   "live": "(D.level>=0?'+':'')+(+D.level).toFixed(2)+' dB'"
  },
  {
   "k": "eq",
   "x": 390,
   "y": 10,
   "w": 160,
   "h": 96,
   "t": "Cable EQ (U2 OPA650)",
   "s": [
    "EQ 2K pot, L1 10 µH",
    "CV1 2–18 p, C6 220 p",
    "R31–R35"
   ],
   "d": "Equaliser for long input cables: HF boost set by the EQ pot and trimmers, built round U2 OPA650A (“NO SOCKET”). Bypassable with the INA/OUTA links <span class=\"tag-inf\" title=\"Not stated in the source; inferred from the BERG headers either side of U2\">inferred</span>.",
   "parts": "U2, EQ, CV1, CV2, L1, C5–C10, R31–R35, INA, OUTA",
   "live": "'+'+(D.insA?D.eq*0.023*0.846:0).toFixed(2)+' dB'"
  },
  {
   "k": "clamp",
   "x": 390,
   "y": 130,
   "w": 160,
   "h": 96,
   "t": "Keyed clamp",
   "s": [
    "U4 LM1881 sync sep.",
    "U3 74HC00, Q4–Q6",
    "R36 680K Rset"
   ],
   "d": "U4 LM1881 finds sync and opens a back-porch gate every line; U3 74HC00 conditions it and Q4–Q6 clamp blanking to 0 V, removing hum and tilt. RV1 20K sets the clamp level <span class=\"tag-inf\" title=\"Not stated in the source; inferred from RV1 sits next to the clamp transistors\">inferred</span>.",
   "parts": "U3, U4, Q3–Q6, RV1, R36–R38, C11–C13, REG3 78L05",
   "live": "(M.humOut*1000).toFixed(1)+' mV hum'"
  },
  {
   "k": "amp",
   "x": 590,
   "y": 40,
   "w": 150,
   "h": 96,
   "t": "U1 EL2099C",
   "s": [
    "gain 2×",
    "±11.4 V rails"
   ],
   "d": "One EL2099 drives the whole output bus; the 2× gain makes up the 6 dB lost in each back-match/load divider.",
   "parts": "U1, R4–R8, C1, C23A/B",
   "live": "M.vdrive.toFixed(3)+' V p-p'"
  },
  {
   "k": "out",
   "x": 790,
   "y": 40,
   "w": 150,
   "h": 96,
   "t": "8 × 75R0 → P1",
   "s": [
    "R10–R17",
    "BNC1: OUT 1–6",
    "BNC3: OUT 1–8"
   ],
   "d": "Each output has its own 75R0 back-match, so a short or open on one output barely disturbs the others.",
   "parts": "R10–R17, P1",
   "live": "M.out[D.sel-1].v.toFixed(3)+' V p-p @OUT'+D.sel"
  },
  {
   "k": "pwr",
   "x": 200,
   "y": 180,
   "w": 150,
   "h": 80,
   "t": "Power",
   "s": [
    "P1 ±21 V",
    "REG1 LM317 / REG2 LM337"
   ],
   "d": "±21 V from the frame is regulated to ±11.4 V on the card (221R / 1K8). Manual: 46 mA.",
   "parts": "REG1, REG2, R20–R23, C3, C4",
   "live": "(M.isup*1000).toFixed(0)+' mA'"
  }
 ],
 "wires": [
  [
   "in",
   "lvl",
   ""
  ],
  [
   "lvl",
   "eq",
   ""
  ],
  [
   "eq",
   "amp",
   ""
  ],
  [
   "clamp",
   "amp",
   "keyed"
  ],
  [
   "amp",
   "out",
   "×8"
  ],
  [
   "pwr",
   "amp",
   "±11.4 V"
  ]
 ],
 "blockH": 280,
 "tutSrc": "no M8252 manual exists; steps follow the M8251 spec sheet plus the EQ/clamp parts on the board",
 "tutorial": [
  [
   "Pick the rear module",
   "The card can sit behind two BNC modules. <b>BNC1</b> (INPUT + OUT 1–6) fits any 8200 frame; <b>BNC3</b> (INPUT, INPUT LOOP, OUT 1–8) is “*MF8210 only”. Choose BNC3 and the MF8210 frame so all eight outputs are available.",
   "Use the “Rear module” selector above the board.",
   "D.module==='BNC3' && D.frame==='MF8210'"
  ],
  [
   "Connect the source",
   "Plug the video source into INPUT. The manual: “The input is a high impedance looping input”, nominal 1 V p-p.",
   "Click INPUT on the rear module.",
   "D.srcOn"
  ],
  [
   "Terminate the line exactly once",
   "A looping input must be terminated at the end of the line. With the HIZ link in Hi-Z, fit a 75 Ω terminator on INPUT LOOP (or cable it on to the next DA). The card input should read 1.00 V p-p and the return loss should be high.",
   "Set HIZ to Hi-Z (H) and cycle the loop (L) to “75 Ω term.”.",
   "M.terms===1 && Math.abs(M.vin-1)<0.02"
  ],
  [
   "Load the outputs",
   "Each output is 75 Ω (back-matched by R10–R17) and gives “1 Vp-p, terminated”. Plug four outputs into 75 Ω loads.",
   "Click OUT 1–4 until each says 75 Ω.",
   "M.out.slice(0,4).every(o=>o.L==='75')"
  ],
  [
   "Trim the level",
   "Measure a terminated output and set LEVEL so it reads 1.00 V p-p (within 1 %).",
   "Use LEVEL on the bench or click LEVEL on the board, then ◀ / ▶.",
   "Math.abs(M.out[0].v-1)<0.01 && M.out[0].L==='75'"
  ],
  [
   "Long input cable",
   "Set 150 m of input cable. The chroma at the card falls by about 2.4 dB at 3.58 MHz; the M8252 is the “EQUALIZING/CLAMPING” version made for this.",
   "Move the “Input cable” slider to 150 m.",
   "D.cable>=150"
  ],
  [
   "Equalise",
   "Turn EQ until the chroma error is within ±0.05 dB (the manual’s response figure for the M8251).",
   "EQ slider ≈ cable length.",
   "D.cable>=150 && Math.abs(M.hfNet)<=0.05"
  ],
  [
   "Clamp out the hum",
   "Add 100 mV of 60 Hz hum (a ground loop). With the INA/OUTA links fitted, the LM1881-keyed clamp resets blanking to 0 V every line and the hum at the outputs drops below 3 mV.",
   "Hum slider to 100 mV; keep the links fitted.",
   "D.hum>=100 && M.humOut<0.003"
  ],
  [
   "Check the supply",
   "The manual gives ±21 V DC, 46 mA. With eight terminated outputs on colour bars the estimate here should be near that figure.",
   "Load all eight outputs with 75 Ω (BNC3).",
   "M.out.every(o=>o.L==='75') && M.isup>0.035"
  ]
 ],
 "sheets": [
  {
   "name": "1 · Input, EQ and clamp",
   "h": 340,
   "svg": "<circle cx=\"50\" cy=\"90\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"50\" cy=\"90\" r=\"3\" fill=\"var(--ink)\"/><text x=\"50\" y=\"74\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">INPUT</text><polyline points=\"61,90 120,90\" fill=\"none\" stroke=\"var(--ink)\"/><rect x=\"150\" y=\"70\" width=\"120\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"210\" y=\"54\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">Q2 / LEVEL</text><text x=\"210\" y=\"66\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">500 Ω trim, R19 499R</text><line x1=\"120\" y1=\"90\" x2=\"150\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"154\" y=\"94\" font-size=\"10\" fill=\"var(--ink)\">in</text><text x=\"117\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">video</text><line x1=\"270\" y1=\"90\" x2=\"300\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"266\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">out</text><text x=\"303\" y=\"94\" font-size=\"10\" fill=\"var(--accent2)\"></text><polyline points=\"300,90 330,90\" fill=\"none\" stroke=\"var(--ink)\"/><rect x=\"360\" y=\"50\" width=\"160\" height=\"110\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"440\" y=\"34\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">EQ network</text><text x=\"440\" y=\"46\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">EQ 2K · L1 10 µH · CV1 2–18p</text><line x1=\"330\" y1=\"70\" x2=\"360\" y2=\"70\" stroke=\"var(--ink)\"/><text x=\"364\" y=\"74\" font-size=\"10\" fill=\"var(--ink)\">in</text><text x=\"327\" y=\"74\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\"></text><line x1=\"330\" y1=\"88\" x2=\"360\" y2=\"88\" stroke=\"var(--ink)\"/><text x=\"364\" y=\"92\" font-size=\"10\" fill=\"var(--ink)\">L</text><text x=\"327\" y=\"92\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\"></text><line x1=\"330\" y1=\"106\" x2=\"360\" y2=\"106\" stroke=\"var(--ink)\"/><text x=\"364\" y=\"110\" font-size=\"10\" fill=\"var(--ink)\">R</text><text x=\"327\" y=\"110\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\"></text><line x1=\"520\" y1=\"70\" x2=\"550\" y2=\"70\" stroke=\"var(--ink)\"/><text x=\"516\" y=\"74\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">boost</text><text x=\"553\" y=\"74\" font-size=\"10\" fill=\"var(--accent2)\"></text><polyline points=\"550,70 580,70\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"318\" y=\"82\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">INA</text><text x=\"555\" y=\"64\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">EQ out</text><rect x=\"610\" y=\"50\" width=\"130\" height=\"70\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"675\" y=\"34\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">U2 OPA650A</text><text x=\"675\" y=\"46\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">wideband op-amp</text><line x1=\"580\" y1=\"70\" x2=\"610\" y2=\"70\" stroke=\"var(--ink)\"/><text x=\"614\" y=\"74\" font-size=\"10\" fill=\"var(--ink)\">+IN</text><text x=\"577\" y=\"74\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\"></text><line x1=\"740\" y1=\"70\" x2=\"770\" y2=\"70\" stroke=\"var(--ink)\"/><text x=\"736\" y=\"74\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"773\" y=\"74\" font-size=\"10\" fill=\"var(--accent2)\">→ OUTA → U1</text><rect x=\"360\" y=\"230\" width=\"160\" height=\"70\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"440\" y=\"214\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">U4 LM1881</text><text x=\"440\" y=\"226\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">R36 680K Rset, C11 560p</text><line x1=\"330\" y1=\"250\" x2=\"360\" y2=\"250\" stroke=\"var(--ink)\"/><text x=\"364\" y=\"254\" font-size=\"10\" fill=\"var(--ink)\">VIDEO</text><text x=\"327\" y=\"254\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">from U2 path</text><line x1=\"520\" y1=\"250\" x2=\"550\" y2=\"250\" stroke=\"var(--ink)\"/><text x=\"516\" y=\"254\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">BP gate</text><text x=\"553\" y=\"254\" font-size=\"10\" fill=\"var(--accent2)\"></text><line x1=\"520\" y1=\"268\" x2=\"550\" y2=\"268\" stroke=\"var(--ink)\"/><text x=\"516\" y=\"272\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">VSYNC</text><text x=\"553\" y=\"272\" font-size=\"10\" fill=\"var(--accent2)\"></text><polyline points=\"550,250 580,250\" fill=\"none\" stroke=\"var(--ink)\"/><rect x=\"610\" y=\"230\" width=\"130\" height=\"70\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"675\" y=\"214\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">U3 74HC00</text><text x=\"675\" y=\"226\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">+ Q4–Q6 2N3904</text><line x1=\"580\" y1=\"250\" x2=\"610\" y2=\"250\" stroke=\"var(--ink)\"/><text x=\"614\" y=\"254\" font-size=\"10\" fill=\"var(--ink)\">gate</text><text x=\"577\" y=\"254\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\"></text><line x1=\"740\" y1=\"250\" x2=\"770\" y2=\"250\" stroke=\"var(--ink)\"/><text x=\"736\" y=\"254\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">CLAMP</text><text x=\"773\" y=\"254\" font-size=\"10\" fill=\"var(--accent2)\">hold blanking</text><line x1=\"740\" y1=\"268\" x2=\"770\" y2=\"268\" stroke=\"var(--ink)\"/><text x=\"736\" y=\"272\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">RV1</text><text x=\"773\" y=\"272\" font-size=\"10\" fill=\"var(--accent2)\">20K level</text><polyline points=\"750,260 800,260 800,85 770,85\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"805\" y=\"180\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--warn)\">clamp node</text>",
   "note": "Part values from the assembly-layer text of M8252.PCB; the LM1881/OPA650/74LS00/EL2099 symbols and the “VIDEO IN”, “EQULIZING/CLAMPING” labels from M8252.DSN. Interconnections are inferred from part roles and positions (the Tango file stores no nets)."
  },
  {
   "name": "2 · EL2099 and outputs",
   "h": 290,
   "svg": "<rect x=\"330\" y=\"70\" width=\"150\" height=\"120\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"405\" y=\"54\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">U1 EL2099C</text><text x=\"405\" y=\"66\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">TO225 · video distribution amp</text><line x1=\"300\" y1=\"90\" x2=\"330\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"334\" y=\"94\" font-size=\"10\" fill=\"var(--ink)\">+IN</text><text x=\"297\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">from buffer/level</text><line x1=\"300\" y1=\"108\" x2=\"330\" y2=\"108\" stroke=\"var(--ink)\"/><text x=\"334\" y=\"112\" font-size=\"10\" fill=\"var(--ink)\">FB</text><text x=\"297\" y=\"112\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">R6 / R8 (1K)</text><line x1=\"300\" y1=\"126\" x2=\"330\" y2=\"126\" stroke=\"var(--ink)\"/><text x=\"334\" y=\"130\" font-size=\"10\" fill=\"var(--ink)\">COMP</text><text x=\"297\" y=\"130\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">C1 5p6</text><line x1=\"480\" y1=\"90\" x2=\"510\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"476\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"513\" y=\"94\" font-size=\"10\" fill=\"var(--accent2)\">bus → R10–R17</text><line x1=\"480\" y1=\"108\" x2=\"510\" y2=\"108\" stroke=\"var(--ink)\"/><text x=\"476\" y=\"112\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">V+</text><text x=\"513\" y=\"112\" font-size=\"10\" fill=\"var(--accent2)\">+11.4 V</text><line x1=\"480\" y1=\"126\" x2=\"510\" y2=\"126\" stroke=\"var(--ink)\"/><text x=\"476\" y=\"130\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">V−</text><text x=\"513\" y=\"130\" font-size=\"10\" fill=\"var(--accent2)\">−11.4 V</text><line x1=\"640\" y1=\"60\" x2=\"650\" y2=\"60\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"55\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"60\" x2=\"690\" y2=\"60\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"51\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R10</text><text x=\"665\" y=\"78\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,60 740,60\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"64\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 1</text><line x1=\"640\" y1=\"90\" x2=\"650\" y2=\"90\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"85\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"90\" x2=\"690\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"81\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R11</text><text x=\"665\" y=\"108\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,90 740,90\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"94\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 2</text><line x1=\"640\" y1=\"120\" x2=\"650\" y2=\"120\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"115\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"120\" x2=\"690\" y2=\"120\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"111\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R12</text><text x=\"665\" y=\"138\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,120 740,120\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"124\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 3</text><line x1=\"640\" y1=\"150\" x2=\"650\" y2=\"150\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"145\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"150\" x2=\"690\" y2=\"150\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"141\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R13</text><text x=\"665\" y=\"168\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,150 740,150\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"154\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 4</text><line x1=\"640\" y1=\"180\" x2=\"650\" y2=\"180\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"175\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"180\" x2=\"690\" y2=\"180\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"171\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R14</text><text x=\"665\" y=\"198\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,180 740,180\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"184\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 5</text><line x1=\"640\" y1=\"210\" x2=\"650\" y2=\"210\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"205\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"210\" x2=\"690\" y2=\"210\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"201\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R15</text><text x=\"665\" y=\"228\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,210 740,210\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"214\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 6</text><line x1=\"640\" y1=\"240\" x2=\"650\" y2=\"240\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"235\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"240\" x2=\"690\" y2=\"240\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"231\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R16</text><text x=\"665\" y=\"258\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,240 740,240\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"244\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 7</text><line x1=\"640\" y1=\"270\" x2=\"650\" y2=\"270\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"265\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"270\" x2=\"690\" y2=\"270\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"261\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R17</text><text x=\"665\" y=\"288\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,270 740,270\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"274\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 8</text><polyline points=\"540,90 600,90 600,270 640,270\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,60 640,60\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,90 640,90\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,120 640,120\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,150 640,150\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,180 640,180\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,210 640,210\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,240 640,240\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,270 640,270\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"330\" y=\"230\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Each output: 75R0 back-match → P1 → BNC1/BNC3 → 75 Ω cable → 75 Ω load: ½ of the drive at the load.</text><text x=\"330\" y=\"248\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Gain 2× in the EL2099 stage makes up that 6 dB (1 V p-p in → 1 V p-p terminated out, manual spec).</text><text x=\"330\" y=\"266\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Gain-set values near U1 on the board: 499R, 1K, 47R, 5p6 (assembly-layer text).</text>",
   "note": "Identical to the M8251: same coordinates for U1, R10–R17, HIZ, R1–R3 and P1 in both Tango files."
  },
  {
   "name": "3 · Power",
   "h": 330,
   "svg": "<circle cx=\"60\" cy=\"80\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"60\" cy=\"80\" r=\"3\" fill=\"var(--ink)\"/><text x=\"60\" y=\"64\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">P1 +21 V</text><circle cx=\"60\" cy=\"210\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"60\" cy=\"210\" r=\"3\" fill=\"var(--ink)\"/><text x=\"60\" y=\"194\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">P1 −21 V</text><rect x=\"240\" y=\"60\" width=\"140\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"310\" y=\"44\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">REG1 LM317</text><text x=\"310\" y=\"56\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">positive regulator</text><line x1=\"210\" y1=\"80\" x2=\"240\" y2=\"80\" stroke=\"var(--ink)\"/><text x=\"244\" y=\"84\" font-size=\"10\" fill=\"var(--ink)\">IN</text><text x=\"207\" y=\"84\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">+21 V</text><line x1=\"380\" y1=\"80\" x2=\"410\" y2=\"80\" stroke=\"var(--ink)\"/><text x=\"376\" y=\"84\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"413\" y=\"84\" font-size=\"10\" fill=\"var(--accent2)\">+11.4 V</text><rect x=\"240\" y=\"190\" width=\"140\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"310\" y=\"174\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">REG2 LM337</text><text x=\"310\" y=\"186\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">negative regulator</text><line x1=\"210\" y1=\"210\" x2=\"240\" y2=\"210\" stroke=\"var(--ink)\"/><text x=\"244\" y=\"214\" font-size=\"10\" fill=\"var(--ink)\">IN</text><text x=\"207\" y=\"214\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">−21 V</text><line x1=\"380\" y1=\"210\" x2=\"410\" y2=\"210\" stroke=\"var(--ink)\"/><text x=\"376\" y=\"214\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"413\" y=\"214\" font-size=\"10\" fill=\"var(--accent2)\">−11.4 V</text><line x1=\"450\" y1=\"100\" x2=\"460\" y2=\"100\" stroke=\"var(--ink)\"/><rect x=\"460\" y=\"95\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"490\" y1=\"100\" x2=\"500\" y2=\"100\" stroke=\"var(--ink)\"/><text x=\"475\" y=\"91\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R20/R22</text><text x=\"475\" y=\"118\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">221R</text><line x1=\"450\" y1=\"230\" x2=\"460\" y2=\"230\" stroke=\"var(--ink)\"/><rect x=\"460\" y=\"225\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"490\" y1=\"230\" x2=\"500\" y2=\"230\" stroke=\"var(--ink)\"/><text x=\"475\" y=\"221\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R21/R23</text><text x=\"475\" y=\"248\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">1K8</text><text x=\"240\" y=\"290\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">V = 1.25 V × (1 + 1K8 / 221R) = 11.43 V per rail. C3/C4 1µ/35 on the inputs, C23A/C23B 10µ/35 at U1.</text><text x=\"240\" y=\"308\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Layer-13 notes on the board add “2 X RXE050”, “1N4003” ×2 and “47\\63” ×2 near P1 (fuses, reverse diodes, bulk caps) — see Findings.</text><rect x=\"640\" y=\"60\" width=\"140\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"710\" y=\"44\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">REG3 78L05</text><text x=\"710\" y=\"56\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">TO-92</text><line x1=\"610\" y1=\"80\" x2=\"640\" y2=\"80\" stroke=\"var(--ink)\"/><text x=\"644\" y=\"84\" font-size=\"10\" fill=\"var(--ink)\">IN</text><text x=\"607\" y=\"84\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">+11.4 V</text><line x1=\"780\" y1=\"80\" x2=\"810\" y2=\"80\" stroke=\"var(--ink)\"/><text x=\"776\" y=\"84\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"813\" y=\"84\" font-size=\"10\" fill=\"var(--accent2)\">+5 V → U3, U4</text><polyline points=\"71,80 210,80\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"71,210 210,210\" fill=\"none\" stroke=\"var(--ink)\"/>",
   "note": "REG1 LM317, REG2 LM337, REG3 78L05 (board text). The DSN library list also carries PIC16C54A, 4098, 4538/4539 symbols that are not placed on the board."
  }
 ],
 "schemNote": "Redrawn from M8252.PCB (part positions, assembly text), M8252.DSN (part list and labels) and the M8251 spec sheet. Not the original CAD.",
 "softIntro": "No processor: the only “sequencing” on the M8252 is hardware. The LM1881 watches every line and, 0.2 µs after each sync pulse ends, opens a ≈ 4 µs back-porch gate; U3 and Q4–Q6 use it to clamp blanking to 0 V. Below, each stage’s level for the current bench and the clamp state at the playhead.",
 "fsmNote": [
  "LM1881 CSYNC low",
  "+0.2 µs gate delay",
  "Q4–Q6 hold blanking = 0 V",
  "clamp released",
  "U2 / U1 pass picture",
  "LM1881 VSYNC out"
 ],
 "findings": [
  "<b>BNC1 is a 1×6, not a 1×8.</b> The M8251 manual calls the card “a one by eight video distribution amplifier”, but its own terminal art (<span class=\"mono\">m8251term.cdr</span>, and the rear-module guide <span class=\"mono\">M8251 - rear module options.cdr</span>) shows BNC1 with INPUT and OUT 1–6 only, titled “M8251 -1x6 Analog Utility Video Distribution Amplifier”. All eight 75R0 back-match resistors R10–R17 are on the card; OUT 7 and OUT 8 only reach a connector on BNC3, which is “*MF8210 only”. Try it: switch the Simulator to BNC1 and click OUT 7.",
  "<b>The loop-through needs the HIZ link.</b> The board has a three-pin <span class=\"mono\">HIZ</span> header (H1X3) next to R3 75R0 and R1 47K. With BNC3 the input is meant to loop on (“high impedance looping input”); with BNC1 there is no loop connector, so the link must select the on-card 75 Ω or the line is unterminated and the picture doubles to 2 V p-p. The manual does not mention the link at all.",
  "<b>The M8252 schematic still says M8251.</b> The title block of <span class=\"mono\">M8252.DSN</span> carries the document name <span class=\"mono\">M8251.DSN</span> and the date “NOV 8,1997”, with “M8252” beside it: the sheet was saved-as from the M8251 and the file name field never updated (the drawing title itself reads “EQULIZING/CLAMPING”, misspelt).",
  "<b>Twelve frame connectors parked at the origin.</b> <span class=\"mono\">M8252.PCB</span> contains P1D–P12D, twelve DIN48RM 48-way connectors, all at (0, 0) with no pads on the board. They are a leftover from a 12-slot backplane drawing (the MF8212 frame has 12 slots) pasted into the card file.",
  "<b>Copy-paste reference designators.</b> Parts such as C23BAA, C24BA, R34BBAA and R34BAAA (and the duplicate set in <span class=\"mono\">M8251-2.PCB</span> with “A”/“B” suffixes) show the board was assembled by pasting blocks; several “R34…” parts are actually capacitors on CAP100 footprints with value 0.1.",
  "<b>LEVEL changed from 1K to 500 Ω.</b> At the same front-edge position the M8251 board text reads “1K” and the M8252 reads “500”; the M8252 also drops the RESPONSE trim in favour of the EQ pot and two 2–18 pF trimmers (CV1, CV2).",
  "<b>“Do Not Install” over the new circuit.</b> The large layer-13 note “Do Not Install” covers X 3.0–7.05″, Y 2.1–2.5″ on both boards. On the M8251 that area is empty; on the M8252 it lies over R31–R35, C7–C10 and CV1 — the EQ network. Either the note was carried over from the M8251, or the EQ was an assembly option <span class=\"tag-inf\" title=\"Not stated in the source; inferred from identical note text and coordinates in both files\">inferred</span>.",
  "<b>M8252.DBK is not a copy of the DSN.</b> <span class=\"mono\">M8252.DBK</span> (17 Nov 1997) is the OrCAD backup from the first layout; <span class=\"mono\">M8252.DSN</span> is the 9 Mar 2001 revision. Same size (61 952 bytes), different contents.",
  "<b>No manual, no terminal art.</b> There is no M8252 manual or rear-module drawing in the archive; the BNC1/BNC3 modules on the Simulator tab are the M8251 ones <span class=\"tag-inf\" title=\"Not stated in the source; inferred from identical output section\">inferred</span>.",
  "<b>EQ range and clamp behaviour are modelled, not documented.</b> The EQ is modelled as undoing up to 300 m of 75 Ω cable at 3.58 MHz, and the clamp as a perfect line-rate reset (residual hum = the 60 Hz slope across one 63.6 µs line, −32 dB) <span class=\"tag-inf\" title=\"Not stated in the source; inferred from typical 1990s equalising DAs and the LM1881 datasheet\">inferred</span>."
 ],
 "sources": [
  "M8252 - #PCB/M8252.PCB (= M8252.BAK; Tango ASCII, 21 Nov 1997), M8252.REP (DRC report)",
  "M8252 - #PCB/M8252.DSN (OrCAD, 9 Mar 2001), M8252.DBK (OrCAD backup, 17 Nov 1997)",
  "../M8251 - #Master  #MF82/M8251 - #Engineering/m8251man.pdf, m8251term.cdr, PCB/M8251.BAK, PCB/M8251-2.BAK",
  "../8200 Series Rear Module options graphical Guides…/M8251 - rear module options.cdr"
 ],
 "assets": [
  "m8252-board.png (rendered from M8252.PCB)",
  "m8252-rear-bnc.png (M8251 terminal art, cut from m8251term.cdr)"
 ],
 "infNote": "NTSC timing is RS-170A; LM1881 gate figures (0.2 µs delay, 4 µs width, 230 µs vertical) are datasheet values for Rset = 680 kΩ; cable loss is a typical RG-59/8281 figure. All are marked inferred where shown."
};
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const ID = DATA.id, FLAG = '__' + ID + 'Active';
const inf = (why)=>`<span class="tag-inf" title="${why?('Not stated in the source; inferred from '+why):'Not stated in the source; inferred'}">inferred</span>`;
const card = (t,b,extra)=>`<div class="card" ${extra||''}><h2>${t}</h2>${b}</div>`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const dB = v => (20*Math.log10(Math.max(1e-9,v)));

/* ---------------- NTSC timing (RS-170A; the manual quotes its specs at 3.58 MHz) ---------------- */
const FSC = 315e6/88;                  // 3.579545 MHz colour subcarrier
const HL = 455/(2*FSC);                // 63.556 µs line
const FIELD = 262.5*HL;                // 16.683 ms field
const SYNC = 4.7e-6, BP0 = 5.3e-6, BURST = 2.5e-6, ACT0 = 10.9e-6, ACT1 = 63.556e-6-1.5e-6;
const IRE = 0.714/100;                 // volts per IRE at 1 V p-p
/* 75 % SMPTE-style bars: luma IRE (with 7.5 IRE setup) and chroma p-p IRE, phase deg */
const BARS = [[77,0,0],[69,62,167],[56,88,283],[48,82,241],[36,82,61],[28,88,103],[15,62,347],[7.5,0,0]];
/* LM1881 burst/back-porch gate with Rset 680 kΩ (datasheet figures, not in the archive) */
const BPG_DLY = 0.2e-6, BPG_W = 4.0e-6, VS_W = 230e-6;
/* cable: Belden 8281-type 75 Ω, ≈ 2.3 dB/100 m at 5 MHz, loss ∝ √f; velocity 0.66 → 5.05 ns/m */
const CAB_DB_5M = 2.3/100, VEL_NS = 5.05;

/* ---------------- state ---------------- */
const D = {
  module: DATA.defModule, frame: DATA.defModule==='BNC3'?'MF8210':'MF8212',
  srcOn: true, src: 'bars', srcAmp: 1.0, hiz: DATA.defModule==='BNC3', loop: 'term',
  cable: 0, level: 0, resp: 0, eq: 0, hum: 0, insA: true,
  outs: Array.from({length:8},(_,i)=>i<4?'75':'none'), sel: 1, part: 'U1', log: [], last: null,
};
const RESET = JSON.parse(JSON.stringify(D));
function nOuts(){ return D.module==='BNC1' ? 6 : 8; }
function hasLoop(){ return D.module==='BNC3'; }

/* ---------------- model ---------------- */
const LOADZ = {'75':75, 'open':1e9, '37.5':37.5, 'none':1e9};
function par(a,b){ return 1/(1/a+1/b); }
function cableDb(f){ return D.cable*CAB_DB_5M*Math.sqrt(f/5e6); }          // loss in dB at f
function eqDb(f){ return DATA.eq && D.insA ? D.eq*CAB_DB_5M*Math.sqrt(f/5e6) : 0; }  // EQ set in metres of cable it undoes
function respDb(f){ return DATA.response ? D.resp*Math.pow(f/FSC,2)/(1+Math.pow(f/12e6,4)) : 0; }
function model(){
  const r = {};
  r.zcard = D.hiz ? 47e3 : par(75, 47e3);                                   // R1 47K bias, R3 75R0 via HIZ link
  r.zloop = hasLoop() && D.loop!=='open' ? 75 : 1e12;
  r.zline = par(r.zcard, r.zloop);
  r.voc = D.srcOn ? 2*D.srcAmp : 0;                                         // generator: 1 V p-p into 75 Ω = 2 V open circuit
  r.vin = r.voc * r.zline/(75 + r.zline);                                   // low-frequency level at the card
  r.terms = (D.hiz?0:1) + (hasLoop() && D.loop!=='open'?1:0);
  r.rl = (()=>{ const g=Math.abs((r.zline-75)/(r.zline+75)); return g<1e-4? 80 : -dB(g); })();
  r.hfIn = cableDb(FSC);
  r.hfNet = -r.hfIn + eqDb(FSC) + respDb(FSC);                              // chroma gain relative to LF
  r.g = 2*Math.pow(10, D.level/20);                                         // EL2099 stage: 2× (back-match) × LEVEL trim
  r.vdrive = r.vin * r.g;
  r.rail = 1.25*(1+1800/221);                                               // LM317/LM337, 221R + 1K8 → ±11.43 V
  r.out = [];
  let iSum=0;
  for (let k=0;k<8;k++){
    const L = D.outs[k], avail = k < nOuts(), zl = LOADZ[L];
    const v = avail ? r.vdrive*zl/(75+zl) : 0;
    const ipk = avail && L!=='none' && L!=='open' ? (r.vdrive*0.714)/(75+zl) : 0;  // white level current
    iSum += ipk*0.5;                                                         // ~50 % APL average
    r.out.push({L, avail, v, ipk, ok: avail && L==='75' && Math.abs(v-1)<0.05});
  }
  r.iq = 0.009;                                                             // EL2099 quiescent — inferred (datasheet class)
  r.isup = r.iq + iSum + (DATA.clamp?0.004:0);
  r.humIn = D.hum/1000;
  r.humOut = DATA.clamp && D.insA ? r.humIn*2*Math.PI*60*HL : r.humIn;      // keyed clamp leaves only the in-line tilt
  r.clipHead = dB((r.rail-2.0)/(Math.max(1e-3,r.vdrive*0.714)));
  r.delay = D.cable*VEL_NS*1e-9 + 12e-9;                                    // cable + card (≈12 ns, inferred)
  return r;
}

/* composite video at the source (volts, blanking = 0) */
const T0 = 30*HL;                                                          // t = 0 starts on line 30 (active picture)
function lineNo(t){ return Math.floor((t+T0)/HL) % 525; }
function vidSrc(t){
  if (!D.srcOn) return 0;
  const ln = lineNo(t), u = t - Math.floor(t/HL)*HL, fl = ln % 262.5;
  if (fl < 9){                                                              // vertical interval: serrated broad pulses (simplified)
    if (fl>=3 && fl<6) return (u < HL/2-4.7e-6 || (u>HL/2 && u<HL-4.7e-6)) ? -40*IRE : 0;
    return (u<2.3e-6 || (u>HL/2 && u<HL/2+2.3e-6)) ? -40*IRE : 0;
  }
  if (u < SYNC) return -40*IRE;
  if (u > BP0 && u < BP0+BURST) return 20*IRE*Math.sin(2*Math.PI*FSC*t+Math.PI);
  if (u < ACT0 || u > ACT1 || fl < 20) return D.src==='black' ? 0 : (u<ACT0||u>ACT1?0:7.5*IRE);
  if (D.src==='black') return 7.5*IRE;
  const x = (u-ACT0)/(ACT1-ACT0);
  if (D.src==='ramp') return (7.5+92.5*x)*IRE;
  const b = BARS[Math.min(7,Math.floor(x*8))];
  return (b[0] + b[1]/2*Math.sin(2*Math.PI*FSC*t + b[2]*Math.PI/180))*IRE;
}
/* luma and chroma envelope separately (for drawing when the subcarrier is too dense to plot) */
function vidParts(t){
  const ln=lineNo(t), u=t-Math.floor(t/HL)*HL, fl=ln%262.5;
  if (!D.srcOn) return [0,0];
  if (fl<9) return [vidSrc(t),0];
  if (u<SYNC) return [-40*IRE,0];
  if (u>BP0 && u<BP0+BURST) return [0,20*IRE];
  if (u<ACT0||u>ACT1||fl<20||D.src==='black') return [D.src==='black'||u<ACT0||u>ACT1?0:7.5*IRE,0];
  const x=(u-ACT0)/(ACT1-ACT0);
  if (D.src==='ramp') return [(7.5+92.5*x)*IRE,0];
  const b=BARS[Math.min(7,Math.floor(x*8))]; return [b[0]*IRE,b[1]/2*IRE];
}
/* level at a point of the chain: 'in' (card input), 'eq' (after EQ/clamp), 'out' (selected BNC) */
function vAt(t, where, M){
  M = M || model();
  const k = M.vin/2, [y,c] = vidParts(t), hf = Math.pow(10,(where==='in'? -M.hfIn : M.hfNet)/20);
  const hum = (where==='in'? M.humIn : M.humOut) * Math.sin(2*Math.PI*60*t);
  let v = (y + c*hf*Math.sin(2*Math.PI*FSC*t)) * k*2 + hum;                  // c envelope → instantaneous
  if (where==='out'){ const o=M.out[D.sel-1]; const zl=LOADZ[o.L]; v = o.avail? v*M.g*zl/(75+zl) : 0; }
  return v;
}

/* ---------------- actions with a trace of the real parts ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.last={name,tr,t:SIM.t}; D.log.unshift({name,t:SIM.t}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  module(m){ act('Fit rear module '+m, tr=>{ D.module=m; if(m==='BNC3') D.frame='MF8210'; if(m==='BNC1' && D.sel>6) D.sel=1;
    tr(m==='BNC3' ? 'BNC3 “BNC Terminals *MF8210 Only”: INPUT + INPUT LOOP + OUT 1–8 (1×8) — '+DATA.artSrc : 'BNC1: INPUT + OUT 1–6 (the guide calls it “1x6 Analog Utility Video Distribution Amplifier”) — '+DATA.artSrc);
    if (m==='BNC1') tr('OUT 7 and OUT 8 still leave the card on P1 but have no connector on BNC1');
    const M=model(); tr(`Input now sees ${M.terms} termination(s): ${(M.vin).toFixed(2)} V p-p at the card`); }); },
  frame(f){ act('Frame '+f, tr=>{ D.frame=f; tr(f==='MF8212'?'MF8212: 1.0″ slot pitch — BNC3 is “*MF8210 only” and will not fit':'MF8210: wider pitch, takes the 10-BNC BNC3'); }); },
  hiz(){ act('Move the HIZ link', tr=>{ D.hiz=!D.hiz; tr(`HIZ (H1X3) → ${D.hiz?'Hi-Z: R3 75R0 out of circuit, input bridged by R1 47K':'75 Ω: R3 75R0 across the input'}`); const M=model(); tr(`Input termination count ${M.terms} → ${M.vin.toFixed(2)} V p-p at the card, return loss ${M.rl.toFixed(1)} dB`); if (M.terms===2) tr('⚠ Double-terminated: the card AND the loop are both 75 Ω — the picture drops to half level'); if (M.terms===0) tr('⚠ Unterminated: nothing loads the 75 Ω line — level doubles and the cable rings'); }); },
  loop(){ if(!hasLoop()) return; act('INPUT LOOP', tr=>{ D.loop = D.loop==='open'?'term':D.loop==='term'?'next':'open'; tr(D.loop==='open'?'Loop BNC left open':D.loop==='term'?'75 Ω terminator on the loop BNC':'Loop cabled on to the next DA (which terminates it)'); const M=model(); tr(`${M.terms} termination(s) on the line → ${M.vin.toFixed(2)} V p-p`); }); },
  src(){ act((D.srcOn?'Disconnect':'Connect')+' the source at INPUT', tr=>{ D.srcOn=!D.srcOn; tr(D.srcOn?'Generator 75 Ω source, 1 V p-p into 75 Ω (2 V open circuit)':'No input: outputs fall to blanking'); }); },
  out(k){ if (k>nOuts()){ act('OUT '+k, tr=>tr('No BNC for OUT '+k+' on '+D.module+'.')); return; } act('OUT '+k+' load', tr=>{ const c=['none','75','open','37.5'], L=D.outs[k-1]; D.outs[k-1]=c[(c.indexOf(L)+1)%c.length]; D.sel=k; const M=model(), o=M.out[k-1];
    tr(`U1 EL2099C → R${9+k} 75R0 back-match → P1 → ${D.module} OUT ${k}`); tr(`Load ${o.L==='none'?'nothing':o.L==='open'?'open cable':o.L+' Ω'} → ${o.v.toFixed(2)} V p-p ${o.ok?'(in spec)':''}`); if(o.L==='open') tr('Unterminated: 2 V p-p, and reflections come back into R'+(9+k)+' (absorbed by the 75 Ω back-match)'); if(o.L==='37.5') tr('Two monitors looped on one output: 0.67 V p-p'); }); },
  sel(k){ D.sel=k; SIM.refresh(); },
  set(k,v){ D[k]=v; SIM.refresh(); },
  part(p){ act('Select '+p, tr=>{ D.part=p; const P=DATA.parts.find(x=>x.ref===p); if(P){ tr(`${P.ref} · ${P.val} · ${P.pat} at (${P.x}, ${P.y}) mil`); tr(P.what); } }); },
  trim(k,d){ act(`Turn ${k==='level'?'LEVEL':k==='resp'?'RESPONSE':'EQ'} ${d>0?'clockwise':'anticlockwise'}`, tr=>{
    if (k==='level'){ D.level=Math.max(-3,Math.min(3,+(D.level+d*0.25).toFixed(2))); const M=model(); tr(`LEVEL (${DATA.levelPot}) → EL2099 stage gain ${M.g.toFixed(3)}× (${dB(M.g).toFixed(2)} dB)`); tr(`OUT ${D.sel}: ${M.out[D.sel-1].v.toFixed(3)} V p-p`); }
    if (k==='resp'){ D.resp=Math.max(-1,Math.min(1,+(D.resp+d*0.1).toFixed(2))); tr(`RESPONSE (HTRIM) → ${respDb(FSC).toFixed(2)} dB at 3.58 MHz`); }
    if (k==='eq'){ D.eq=Math.max(0,Math.min(300,D.eq+d*25)); tr(`EQ (2K) → boost ${eqDb(FSC).toFixed(2)} dB at 3.58 MHz (undoes ${D.eq} m of cable)`); const M=model(); tr(`Net chroma error ${M.hfNet>=0?'+':''}${M.hfNet.toFixed(2)} dB`); }
  }); },
  reset(){ act('Reset the bench', tr=>{ const keep=D.log; Object.assign(D, JSON.parse(JSON.stringify(RESET))); D.log=keep; tr('Default module, one source, four terminated outputs.'); }); },
};
document.addEventListener('keydown', e=>{
  if (!window[FLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (/^[1-8]$/.test(k)){ A.out(+k); e.preventDefault(); }
  else if (k==='h'){ A.hiz(); e.preventDefault(); }
  else if (k==='l'){ A.loop(); e.preventDefault(); }
  else if (k==='+'||k==='='){ A.trim('level',1); e.preventDefault(); }
  else if (k==='-'){ A.trim('level',-1); e.preventDefault(); }
});

/* ---------------- drawings ---------------- */
const BW=1070, BH=283;                                                         // board render: 100 dpi, x 0.95–11.65 in, y 1.45–4.28 in
const bx = x => (x-950)/10, by = y => (4280-y)/10;
function boardSVG(){
  const M=model();
  let s=`<svg viewBox="-6 -6 ${BW+12} ${BH+40}" style="width:100%;border-radius:6px" role="img" aria-label="${DATA.product} board drawn from ${esc(DATA.boardSrc)}">
   <defs><filter id="${ID}g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
   <rect x="${bx(1000)}" y="${by(4230)}" width="${(11600-1000)/10}" height="${(4230-1500)/10}" rx="3" fill="#124a2c"/>
   <image href="${ASSET}${ID}-board.png" x="0" y="0" width="${BW}" height="${BH}"/>`;
  DATA.parts.forEach(p=>{
    const x=bx(p.x), y=by(p.y), w=p.w||26, h=p.h||18, sel=D.part===p.ref;
    s+=`<g class="vp" data-p="${p.ref}" style="cursor:pointer"><title>${esc(p.ref+' · '+p.val+' — '+p.what)}</title><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="3" fill="${sel?'rgba(255,211,77,.25)':'rgba(255,255,255,.04)'}" stroke="${sel?'#ffd34d':'rgba(255,255,255,.35)'}" stroke-width="${sel?2:1}" stroke-dasharray="${sel?'':'3 2'}"/>
      <text x="${x}" y="${y-h/2-3}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" paint-order="stroke" stroke="#0b2a18" stroke-width="3">${esc(p.ref)}</text></g>`;
  });
  // live jumper / trim indicators
  const hz=DATA.parts.find(p=>p.ref==='HIZ');
  if (hz) s+=`<g class="vhiz" style="cursor:pointer"><rect x="${bx(hz.x)-12}" y="${by(hz.y)+(D.hiz?-14:2)}" width="24" height="12" rx="2" fill="#222" stroke="#ffd34d"/><text x="${bx(hz.x)+18}" y="${by(hz.y)+4}" font-size="9.5" fill="#ffd34d" paint-order="stroke" stroke="#0b2a18" stroke-width="3">${D.hiz?'HI-Z':'75 Ω'}</text></g>`;
  const led = M.out.some(o=>o.ok);
  s+=`<text x="${bx(1000)+4}" y="${BH+16}" font-size="11" fill="var(--ink2)">${esc(DATA.boardCaption)}</text>
      <text x="${BW-4}" y="${BH+16}" text-anchor="end" font-size="11" fill="var(--ink2)">front edge ◀ · 10.60″ × 2.73″ (layer 14 outline) · ▶ P1 EDGE30/156</text>
      <text x="${bx(1000)+4}" y="${BH+31}" font-size="10.5" fill="var(--ink2)">Click a dashed box to inspect the part; click the HIZ link to move it. Supply ≈ ${(M.isup*1000).toFixed(0)} mA per rail (${led?'outputs live':'no terminated output'}).</text></svg>`;
  return s;
}
/* BNC centres: the connector rings of m8251term.cdr (2000-05-23), mapped into the 1375 × 865 frame of the old PNG
   (pt − 69, 91.6 → × 1375/655.9, 865/415.5). assets/m8252-rear-bnc.svg is that file converted with Inkscape. */
const RB = { BNC1:{x0:0,w:687,pts:[['in',312,240],['o1',384,315],['o2',312,390],['o3',384,465],['o4',311,541],['o5',385,619],['o6',311,695]]},
             BNC3:{x0:688,w:687,pts:[['in',976,235],['loop',1079,235],['o1',976,350],['o2',1079,350],['o3',976,465],['o4',1079,465],['o5',976,582],['o6',1079,582],['o7',976,699],['o8',1079,699]]} };
const M8251_TERM = '#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/m8251term.cdr';
const M8251_RO = '#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8251 - rear module options.cdr';
function rearSVG(){
  const M=model(), R=RB[D.module], x0=R.x0;
  let s=`<svg viewBox="${x0} 0 ${R.w} 865" style="width:100%;max-width:360px;display:block;margin:auto" role="img" aria-label="${D.module} rear module, artwork ${esc(DATA.artSrc)}">
    <rect x="${x0}" y="0" width="${R.w}" height="865" fill="#e9e7e0"/><image href="${ASSET}${ID}-rear-bnc.${D.rearPng?'png':'svg'}" x="0" y="0" width="1375" height="865" preserveAspectRatio="none"/>
    <text x="${x0+R.w/2}" y="80" text-anchor="middle" font-size="34" font-weight="700" fill="#222">${D.module} BNC TERMINAL</text>
    <text x="${x0+R.w/2}" y="122" text-anchor="middle" font-size="24" fill="#444">${D.module==='BNC3'?'(MF8210 ONLY) · 1×8 + loop':'1×6 · MF8212'}</text>`;
  R.pts.forEach(([k,x,y])=>{
    let fill='none', ring='#2d63a6', lab='', live=false, sel=false;
    if (k==='in'){ live=D.srcOn; lab=D.srcOn?'source':'—'; }
    else if (k==='loop'){ live=D.loop!=='open'; lab=D.loop==='open'?'open':D.loop==='term'?'75 Ω term.':'→ next DA'; }
    else { const n=+k.slice(1), o=M.out[n-1]; live=o.L!=='none'; lab=o.L==='none'?'':o.L==='open'?'open':o.L+' Ω'; sel=D.sel===n; if(live) fill=o.ok?'var(--led-g)':'var(--led-a)'; }
    s+=`<g class="vb" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="50" fill="transparent"/>${live?`<circle cx="${x}" cy="${y}" r="30" fill="${ring}" opacity=".85"/><circle cx="${x}" cy="${y}" r="9" fill="#d6e6ff"/>`:''}
      ${sel?`<circle cx="${x}" cy="${y}" r="46" fill="none" stroke="#e0a000" stroke-width="6"/>`:''}${fill!=='none'?`<circle cx="${x+36}" cy="${y-36}" r="10" fill="${fill}" stroke="#333"/>`:''}
      ${lab?`<text x="${x}" y="${y+64}" text-anchor="middle" font-size="22" font-weight="700" fill="#0d3a6a">${lab}</text>`:''}</g>`;
  });
  return s+`</svg><div class="small muted" style="text-align:center">Rear artwork: ${D.rearPng?'old PNG cut from ':'CorelDRAW, vector: '}${SIM.src(M8251_TERM,'m8251term.cdr')} (2000-05-23, the M8251’s “M8251 TERMINAL OPTIONS”; sheet title and module captions removed)${DATA.artInf?' '+inf(DATA.artInf):''}. <label><input type="checkbox" class="vpng" ${D.rearPng?'checked':''}> old PNG</label> Click INPUT to connect the source, INPUT LOOP to cycle open / terminator / next DA, an output to cycle its load (none → 75 Ω → open → 37.5 Ω).</div>`;
}
function bindBoard(m){
  m.querySelectorAll('.vp').forEach(g=>g.onclick=()=>{ const p=g.dataset.p; if(p==='HIZ') A.hiz(); else A.part(p); });
  m.querySelectorAll('.vhiz').forEach(g=>g.onclick=()=>A.hiz());
  m.querySelectorAll('.vpng').forEach(c=>c.onchange=()=>{ D.rearPng=c.checked; SIM.refresh(); });
  m.querySelectorAll('.vb').forEach(g=>g.onclick=()=>{ const k=g.dataset.k; if(k==='in') A.src(); else if(k==='loop') A.loop(); else A.out(+k.slice(1)); });
}
function controlsHTML(){
  const opt=(v,l,cur)=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:6px 0">
   <label>Rear module <select data-c="module">${opt('BNC1','BNC1 (1×6)',D.module)}${opt('BNC3','BNC3 (1×8 + loop, MF8210)',D.module)}</select></label>
   <label>Frame <select data-c="frame">${opt('MF8212','MF8212',D.frame)}${opt('MF8210','MF8210',D.frame)}</select></label>
   <label>Source <select data-c="src">${opt('bars','75 % colour bars',D.src)}${opt('ramp','luma ramp',D.src)}${opt('black','black burst',D.src)}</select></label>
   <label>Input cable <input type="range" data-r="cable" min="0" max="300" step="10" value="${D.cable}"> ${D.cable} m</label>
   <label>60 Hz hum <input type="range" data-r="hum" min="0" max="200" step="10" value="${D.hum}"> ${D.hum} mV</label>
   <label>LEVEL <input type="range" data-r="level" min="-3" max="3" step="0.05" value="${D.level}"> ${D.level>=0?'+':''}${(+D.level).toFixed(2)} dB</label>
   ${DATA.response?`<label>RESPONSE <input type="range" data-r="resp" min="-1" max="1" step="0.05" value="${D.resp}"> ${(+D.resp).toFixed(2)} dB</label>`:''}
   ${DATA.eq?`<label>EQ <input type="range" data-r="eq" min="0" max="300" step="5" value="${D.eq}"> ${D.eq} m</label><label><input type="checkbox" data-c="insA" ${D.insA?'checked':''}> INA/OUTA links fitted</label>`:''}
   <button data-c="hiz">HIZ link (H)</button>${hasLoop()?'<button data-c="loop">Loop (L)</button>':''}<button data-c="reset">Reset</button></div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{ const k=el.dataset.c;
    if (el.tagName==='SELECT') el.onchange=()=>{ if(k==='module') A.module(el.value); else if(k==='frame') A.frame(el.value); else { D[k]=el.value; SIM.refresh(); } };
    else if (el.type==='checkbox') el.onchange=()=>act(k==='insA'?(el.checked?'Fit INA/OUTA links':'Remove INA/OUTA links'):k, tr=>{ D[k]=el.checked; tr(D[k]?'EQ / clamp section (U2 OPA650, Q4–Q6) in the signal path':'Links out: the EQ/clamp section is bypassed '+inf('the INA/OUTA two-pin BERG headers either side of U2')); });
    else el.onclick=()=>{ if(k==='hiz') A.hiz(); if(k==='loop') A.loop(); if(k==='reset') A.reset(); };
  });
  m.querySelectorAll('[data-r]').forEach(el=>el.onchange=()=>{ const k=el.dataset.r, v=+el.value; act(`Set ${k} to ${v}`, tr=>{ D[k]=v; const M=model();
    if(k==='cable') tr(`${v} m of 75 Ω cable: −${cableDb(FSC).toFixed(2)} dB at 3.58 MHz, ${(v*VEL_NS).toFixed(0)} ns delay`);
    if(k==='hum') tr(`${v} mV of 60 Hz on the input shield/centre — after the card: ${(M.humOut*1000).toFixed(1)} mV ${DATA.clamp&&D.insA?'(keyed clamp)':'(no clamp: passes straight through)'}`);
    if(k==='level') tr(`EL2099 stage ${M.g.toFixed(3)}× → OUT ${D.sel} ${M.out[D.sel-1].v.toFixed(3)} V p-p`);
    if(k==='eq') tr(`EQ boost ${eqDb(FSC).toFixed(2)} dB at 3.58 MHz`);
    if(k==='resp') tr(`RESPONSE ${respDb(FSC).toFixed(2)} dB at 3.58 MHz`);
    tr(`Net chroma error ${M.hfNet>=0?'+':''}${M.hfNet.toFixed(2)} dB (spec: response better than 0.05 dB)`); }); });
}
function partHTML(){
  const P=DATA.parts.find(x=>x.ref===D.part)||DATA.parts[0], M=model();
  let extra='';
  if (P.ref==='LEVEL') extra=`<div style="margin-top:6px"><button data-t="level:-1">◀ anticlockwise</button> <button data-t="level:1">clockwise ▶</button> ${dB(M.g).toFixed(2)} dB</div>`;
  if (P.ref==='RESPONSE') extra=`<div style="margin-top:6px"><button data-t="resp:-1">◀</button> <button data-t="resp:1">▶</button> ${respDb(FSC).toFixed(2)} dB at 3.58 MHz</div>`;
  if (P.ref==='EQ') extra=`<div style="margin-top:6px"><button data-t="eq:-1">◀</button> <button data-t="eq:1">▶</button> ${eqDb(FSC).toFixed(2)} dB at 3.58 MHz (${D.eq} m)</div>`;
  return `<table class="kv"><tr><th>Part</th><td><b>${esc(P.ref)}</b> · ${esc(P.val)} · footprint ${esc(P.pat)}</td></tr><tr><th>Position</th><td class="mono">X ${P.x} · Y ${P.y} mil (${esc(DATA.boardFile)})</td></tr><tr><th>Job</th><td>${P.what}</td></tr></table>${extra}`;
}
function bindPart(m){ m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ const [k,d]=b.dataset.t.split(':'); A.trim(k,+d); }); }
function levelsHTML(){
  const M=model();
  const row=(a,b,c)=>`<tr><th>${a}</th><td class="mono">${b}</td><td class="small">${c||''}</td></tr>`;
  let s=`<table class="kv">`+row('Input line',`${M.vin.toFixed(3)} V p-p`,`${M.terms} termination(s) · return loss ${M.rl>79?'> 46':M.rl.toFixed(1)} dB`)+
    row('Cable loss @3.58 MHz',`−${M.hfIn.toFixed(2)} dB`,`${D.cable} m, ${(M.delay*1e9).toFixed(0)} ns total delay`)+
    (DATA.eq?row('EQ boost',`+${eqDb(FSC).toFixed(2)} dB`,D.insA?'U2 OPA650 stage':'bypassed'):'')+
    (DATA.response?row('RESPONSE',`${respDb(FSC).toFixed(2)} dB`,'HF trim'):'')+
    row('Chroma error',`${M.hfNet>=0?'+':''}${M.hfNet.toFixed(2)} dB`, Math.abs(M.hfNet)<=0.05?'<b style="color:var(--accent)">flat</b>':'<b style="color:var(--warn)">tilted</b>')+
    row('Hum on output',`${(M.humOut*1000).toFixed(1)} mV`, DATA.clamp&&D.insA?'keyed back-porch clamp':'no clamp')+
    row('EL2099 drive',`${M.vdrive.toFixed(3)} V p-p`,`gain ${M.g.toFixed(3)}× · headroom to ±${M.rail.toFixed(2)} V rails ${M.clipHead.toFixed(1)} dB`)+`</table>`;
  s+=`<table class="kv" style="margin-top:6px"><tr><th>OUT</th><th>load</th><th>level</th></tr>${M.out.map((o,i)=>`<tr style="cursor:pointer" class="vo" data-k="${i+1}"><td>${i+1}${D.sel===i+1?' ◀':''}</td><td>${o.avail?(o.L==='none'?'—':o.L==='open'?'open':o.L+' Ω'):'<span class="muted">no BNC on '+D.module+'</span>'}</td><td class="mono">${o.avail&&o.L!=='none'?o.v.toFixed(3)+' V p-p':''} ${o.ok?'✓':''}</td></tr>`).join('')}</table>
   <div class="small muted">Supply estimate ${(M.isup*1000).toFixed(0)} mA (manual: ±21 V DC, 46 mA). Load currents are ${inf('the EL2099 driving 75 Ω back-matched lines at 50 % picture level')}.</div>`;
  return s;
}
function traceHTML(){ return D.last? `<div><b>${esc(D.last.name)}</b> at ${SIM.fmtT(D.last.t)}</div>`+D.last.tr.map(x=>`<div>→ ${x}</div>`).join('') : '<div class="muted">Click a part, a BNC or a control. Each step through the real parts is listed here.</div>'; }

/* ---------------- timing lanes ---------------- */
function waveLane(label, where, h){
  return {label, h:h||56, draw(c,X,a,b,y,hh,pw){
    const M=model(), css=SIM.css, mid=y+hh*0.72, sc=hh*0.62;
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(a),mid); c.lineTo(X(b),mid); c.stroke();
    const span=b-a, n=Math.min(1600, Math.max(200, pw|0)), dt=span/n;
    const kOut = where==='out' ? (()=>{ const o=M.out[D.sel-1]; const zl=LOADZ[o.L]; return o.avail? M.g*zl/(75+zl) : 0; })() : 1;
    const hfk = Math.pow(10,(where==='in'?-M.hfIn:M.hfNet)/20), hum=(where==='in'?M.humIn:M.humOut);
    c.strokeStyle = where==='out'? css('--accent') : where==='eq'? css('--warn') : css('--accent2'); c.fillStyle=c.strokeStyle;
    if (dt < 1/(6*FSC)){ c.lineWidth=1.4; c.beginPath(); for(let i=0;i<=n;i++){ const t=a+i*dt; const v=vAt(t,where,M); const yy=mid-v*sc; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }
    else {
      c.globalAlpha=.55;
      for(let i=0;i<n;i++){ const t0=a+i*dt; let lo=1e9, hi=-1e9; const sub = Math.min(24, Math.max(3, Math.ceil(dt/(HL/40))));
        for(let j=0;j<=sub;j++){ const t=t0+dt*j/sub; const [yv,cv]=vidParts(t); const base=(yv*M.vin)*kOut + hum*kOut*Math.sin(2*Math.PI*60*t); const ch=cv*M.vin*hfk*kOut; lo=Math.min(lo,base-ch); hi=Math.max(hi,base+ch); }
        if (dt > HL){ lo=Math.min(lo,-40*IRE*M.vin*kOut); }
        c.fillRect(X(t0), mid-hi*sc, Math.max(1,X(t0+dt)-X(t0)), Math.max(1,(hi-lo)*sc)); }
      c.globalAlpha=1;
    }
    c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(where==='out'?`OUT ${D.sel}`:where, X(a)+4, y+11);
  }};
}
function lanes(){
  const css=SIM.css, M=model(), L=[];
  L.push({label:'Fields 59.94 Hz (V sync, 9 lines)', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,FIELD,FIELD-T0,9*HL,css('--warn'),'fields'); }});
  L.push({label:'Lines 15.734 kHz · H sync 4.7 µs', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,HL,0,SYNC,css('--accent'),'H syncs'); }});
  L.push({label:'Colour burst 9 cycles of 3.58 MHz', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,HL,BP0,BURST,css('--accent2'),'bursts'); }});
  if (DATA.clamp){
    L.push({label:'U4 LM1881 composite sync out', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,HL,0.06e-6,SYNC,css('--ink2'),'CSYNC'); }});
    L.push({label:'U4 burst/back-porch gate → U3 74HC00 → clamp', h:24, draw(c,X,a,b,y,h){ if(!D.insA){ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText('INA/OUTA links out: clamp section bypassed',X(a)+6,y+h/2+4); return; } SIM.pulses(c,X,a,b,y,h,HL,SYNC+BPG_DLY,BPG_W,css('--bad'),'clamp pulses'); }});
    L.push({label:'U4 vertical sync out (≈230 µs)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,FIELD,FIELD-T0+3*HL,VS_W,css('--warn'),'V sync'); }});
  } else {
    L.push({label:'No clamp: 60 Hz hum passes', h:22, draw(c,X,a,b,y,h){ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(M.humIn>0?`${(M.humIn*1000).toFixed(0)} mV of hum reaches every output — the M8251 has no clamp (the M8252 adds one)`:'Add hum on the Simulator tab to see it pass through', X(a)+6, y+h/2+4); }});
  }
  L.push(waveLane('Video at the card input', 'in', 56));
  if (DATA.eq) L.push(waveLane('After EQ / clamp (U2)', 'eq', 56));
  L.push(waveLane(`OUT ${D.sel} at the load`, 'out', 56));
  L.push({label:'Delay: cable + card', h:22, draw(c,X,a,b,y,h){ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(`${(M.delay*1e9).toFixed(0)} ns (${D.cable} m at 5.05 ns/m + ≈12 ns through the card ${'(inferred)'}) = ${(M.delay*FSC*360).toFixed(0)}° of subcarrier`, X(a)+6, y+h/2+4); }});
  L.push({label:'EL2099 supply current', h:30, draw(c,X,a,b,y,h,pw){ const n=Math.min(600,pw|0), dt=(b-a)/n; c.fillStyle=css('--accent'); c.globalAlpha=.6;
    let iw=0; M.out.forEach(o=>{ if(o.avail && (o.L==='75'||o.L==='37.5')) iw+=M.vdrive/(75+LOADZ[o.L]); });
    for(let i=0;i<n;i++){ const t=a+i*dt; const [yv]=vidParts(t); const cur=M.iq+Math.max(0,yv*M.vin)*iw/1; const hh=Math.min(h-6, cur/0.12*(h-6)); c.fillRect(X(t),y+h-3-hh,Math.max(1,X(t+dt)-X(t)),hh); } c.globalAlpha=1;
    c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(`peak ≈ ${((M.iq+0.714*M.vin*iw)*1000).toFixed(0)} mA at white`, X(a)+4, y+11); }});
  return L;
}
function scopeDraw(cv){
  const {c,w,h}=SIM.canvas(cv,200), M=model(), css=SIM.css;
  const t0=Math.floor(SIM.t/HL)*HL, ln=lineNo(SIM.t);
  c.strokeStyle=css('--grid'); for(let i=0;i<=10;i++){ c.beginPath(); c.moveTo(10+i*(w-20)/10,10); c.lineTo(10+i*(w-20)/10,170); c.stroke(); }
  const Y=v=>120-v*80;
  c.beginPath(); c.moveTo(10,Y(0)); c.lineTo(w-10,Y(0)); c.stroke();
  const tr=(where,col)=>{ c.strokeStyle=col; c.lineWidth=1.3; c.beginPath(); const n=1400; for(let i=0;i<=n;i++){ const t=t0+i*HL/n; const v=vAt(t,where,M); const x=10+i*(w-20)/n; i?c.lineTo(x,Y(v)):c.moveTo(x,Y(v)); } c.stroke(); };
  tr('in',css('--accent2')); tr('out',css('--accent'));
  if (DATA.clamp && D.insA){ c.fillStyle=css('--bad'); c.globalAlpha=.18; c.fillRect(10+(SYNC+BPG_DLY)/HL*(w-20),10,BPG_W/HL*(w-20),160); c.globalAlpha=1; }
  c.fillStyle=css('--ink2'); c.font='11px '+css('--sans');
  c.fillText(`Line ${ln} of 525 (63.56 µs). Blue: card input. Green: OUT ${D.sel}. ${DATA.clamp&&D.insA?'Red band: LM1881 back-porch gate — the clamp pulls blanking to 0 V here.':''}`, 10, 188);
}

/* ---------------- tutorial ---------------- */
const LESSONS = DATA.tutorial.map(l=>({title:l[0], body:l[1], hint:l[2], check:new Function('D','M','return ('+l[3]+');')}));
let lesson=0, tutInit=false;
function tutStart(){ A.reset(); Object.assign(D,{module:'BNC1',frame:'MF8212',srcOn:false,hiz:true,loop:'open',outs:Array(8).fill('none')}); D.last={name:'Tutorial bench',tr:['BNC1 on an MF8212, no source, nothing plugged in — work through the steps.'],t:SIM.t}; }

/* ---------------- views ---------------- */
function viewSim(m){
  window[FLAG]=true;
  m.innerHTML=`${card(DATA.product+' board — '+esc(DATA.boardFile), `<div id="bd"></div><div id="ct"></div>`)}
   <div class="grid2"><div>${card('Rear module', `<div id="rr"></div>`)}</div><div>${card('Levels, stage by stage', `<div id="lv"></div>`)}${card('Selected part', `<div id="pt"></div>`)}${card('What happened (real parts)', `<div id="tr" class="log"></div>`)}</div></div>
   ${card('Timeline around the playhead', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#rr').innerHTML=rearSVG(); m.querySelector('#lv').innerHTML=levelsHTML(); m.querySelector('#pt').innerHTML=partHTML(); m.querySelector('#tr').innerHTML=traceHTML();
    if (!m.querySelector('#ct').dataset.k || m.querySelector('#ct').dataset.k!==JSON.stringify([D.module,D.frame,D.src,D.cable,D.hum,D.level,D.resp,D.eq,D.insA])){ m.querySelector('#ct').innerHTML=controlsHTML(); m.querySelector('#ct').dataset.k=JSON.stringify([D.module,D.frame,D.src,D.cable,D.hum,D.level,D.resp,D.eq,D.insA]); bindControls(m); }
    bindBoard(m); bindPart(m); m.querySelectorAll('.vo').forEach(r=>r.onclick=()=>A.sel(+r.dataset.k));
    SIM.drawLanes(m.querySelector('#tl'), lanes().slice(0,6), {labelW:200}); };
  SIM.on('time', draw);
}
function viewTut(m){
  window[FLAG]=true; if(!tutInit){ tutInit=true; tutStart(); }
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — '+esc(DATA.tutSrc), `<ol id="ls" class="small" style="padding-left:18px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('Levels', `<div id="lv"></div>`)}</div><div>${card('Rear module', `<div id="rr"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>${card('Board', `<div id="bd"></div><div id="ct"></div>`)}`;
  const draw=()=>{ const M=model();
    m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#rr').innerHTML=rearSVG(); m.querySelector('#lv').innerHTML=levelsHTML(); m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#ct').innerHTML=controlsHTML(); bindControls(m); bindBoard(m); m.querySelectorAll('.vo').forEach(r=>r.onclick=()=>A.sel(+r.dataset.k));
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>{ let ok=false; try{ ok=l.check(D,M); }catch(e){} return `<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${ok?' ✓':''}</li>`; }).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=LESSONS[lesson]; let ok=false; try{ ok=L.check(D,M); }catch(e){}
    m.querySelector('#lz').innerHTML=`<h2>Step ${lesson+1} of ${LESSONS.length}: ${L.title}</h2><p>${L.body}</p><div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:8px"><button id="pv">◀ Back</button><button id="nx">Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); SIM.refresh(); }; m.querySelector('#nx').onclick=()=>{ lesson=Math.min(LESSONS.length-1,lesson+1); SIM.refresh(); }; m.querySelector('#r0').onclick=()=>{ tutStart(); lesson=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){
  window[FLAG]=false;
  const M=model();
  m.innerHTML=`<div class="grid3">${card('In one second', `<table class="kv"><tr><th>Fields</th><td class="mono">59.94</td></tr><tr><th>Lines</th><td class="mono">15 734</td></tr><tr><th>Subcarrier cycles</th><td class="mono">3 579 545</td></tr>${DATA.clamp?'<tr><th>Clamp pulses (U4→U3)</th><td class="mono">15 734 × 4 µs = 63 ms clamped</td></tr>':''}</table>`)}
    ${card('This bench', `<table class="kv"><tr><th>Input</th><td class="mono">${M.vin.toFixed(3)} V p-p</td></tr><tr><th>OUT ${D.sel}</th><td class="mono">${M.out[D.sel-1].v.toFixed(3)} V p-p</td></tr><tr><th>Delay</th><td class="mono">${(M.delay*1e9).toFixed(0)} ns</td></tr></table>`)}
    ${card('How to read it', `<p class="small">Zoom from 1 s (fields) to 100 µs (one line) to 1 µs (subcarrier cycles); click the timeline to move the playhead. The waveforms are computed, not recorded: an RS-170A ${D.src==='bars'?'colour-bar':D.src} signal through the card's real stages.</p>`)}</div>
    ${card('One second, slowed down', `<canvas id="tl"></canvas>`)}${card('Scope: the line under the playhead', `<canvas id="sc"></canvas>`)}`;
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); scopeDraw(m.querySelector('#sc')); });
}
function viewBlock(m){
  window[FLAG]=false;
  let sel=DATA.blocks[0].k;
  const draw=()=>{ const B=DATA.blocks, M=model();
    let s=`<svg viewBox="0 0 980 ${DATA.blockH}" style="width:100%"><defs><marker id="${ID}ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    DATA.wires.forEach(([a,b,l])=>{ const A_=B.find(x=>x.k===a), B_=B.find(x=>x.k===b); const x1=A_.x+A_.w, y1=A_.y+A_.h/2, x2=B_.x, y2=B_.y+B_.h/2; const hot=sel===a||sel===b;
      s+=`<path d="M${x1},${y1} C${x1+30},${y1} ${x2-30},${y2} ${x2},${y2}" fill="none" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.3}" marker-end="url(#${ID}ar)"/>${l?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" text-anchor="middle" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    B.forEach(b=>{ const live = new Function('D','M','return '+(b.live||'""'))(D,M);
      s+=`<g data-b="${b.k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===b.k?'var(--accent)':'var(--line)'}" stroke-width="${sel===b.k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}${live?`<text x="${b.x+8}" y="${b.y+b.h-7}" font-size="10.5" font-family="var(--mono)" fill="var(--accent)">${live}</text>`:''}</g>`; });
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=B.find(x=>x.k===sel); m.querySelector('#bi').innerHTML=`<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p><div class="small muted">Parts: ${b.parts}</div>`; };
  m.innerHTML=`${card('Block diagram — click a block (live levels from the Simulator bench)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}`;
  SIM.on('time', draw);
}
function viewSchem(m){
  window[FLAG]=false;
  let k=0;
  const draw=()=>{ const S=DATA.sheets[k];
    m.querySelector('#sl').innerHTML=DATA.sheets.map((s,i)=>`<button data-i="${i}" class="${i===k?'on':''}">${s.name}</button>`).join(' ');
    m.querySelector('#sv').innerHTML=`<svg viewBox="0 0 980 ${S.h||330}" style="width:100%;min-width:760px" font-family="var(--mono)">${S.svg}</svg>`;
    m.querySelector('#sn').innerHTML=S.note;
    m.querySelectorAll('#sl button').forEach(b=>b.onclick=()=>{ k=+b.dataset.i; draw(); }); };
  m.innerHTML=`${card('Schematics — redrawn from the archive, not the original CAD', `<div id="sl" style="margin-bottom:8px"></div><div style="overflow-x:auto" id="sv"></div><p class="small" id="sn"></p><p class="small muted">${DATA.schemNote}</p>`)}`;
  draw();
}
function viewSoft(m){
  window[FLAG]=false;
  m.innerHTML=`${card('No firmware — the signal path, stage by stage', `<p class="small">${DATA.softIntro}</p><div id="st"></div>`)}<div class="grid2">${card('Level through each stage (selected output)', `<canvas id="bar"></canvas>`)}${card(DATA.clamp?'Clamp sequencer (LM1881 → 74HC00 → Q4–Q6), per line':'Line sequencer, per line', `<div id="fsm"></div>`)}</div>`;
  SIM.on('time', ()=>{
    const M=model(), o=M.out[D.sel-1], u=SIM.t-Math.floor(SIM.t/HL)*HL, fl=lineNo(SIM.t)%262.5;
    const stages=[['Source (open circuit)',M.voc,'75 Ω generator'],['Card input',M.vin,`${M.terms} termination(s); R1 47K bias${D.hiz?'':', R3 75R0'}`],
      ...(DATA.eq?[['EQ / clamp (U2 OPA650)',M.vin*Math.pow(10,(eqDb(FSC)-M.hfIn)/20),'chroma after EQ']]:[]),
      ['EL2099 output',M.vdrive,`${M.g.toFixed(3)}× (LEVEL ${D.level>=0?'+':''}${(+D.level).toFixed(2)} dB)`],[`OUT ${D.sel} at load`,o.v,`R${9+D.sel} 75R0 into ${o.L==='none'?'nothing':o.L}`]];
    m.querySelector('#st').innerHTML=`<table class="kv"><tr><th>Stage</th><th>V p-p</th><th>dB re 1 V</th><th>Why</th></tr>${stages.map(s=>`<tr><td>${s[0]}</td><td class="mono">${s[1].toFixed(3)}</td><td class="mono">${dB(s[1]).toFixed(2)}</td><td class="small">${s[2]}</td></tr>`).join('')}</table>`;
    const {c,w,h}=SIM.canvas(m.querySelector('#bar'),200); const x0=10, bw=(w-20)/stages.length;
    stages.forEach((s,i)=>{ const v=s[1], hh=Math.min(160, v/2.2*160); c.fillStyle= i===stages.length-1 ? (o.ok?SIM.css('--accent'):SIM.css('--warn')) : SIM.css('--accent2'); c.fillRect(x0+i*bw+8, 170-hh, bw-16, hh); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--sans'); c.fillText(s[0].slice(0,22), x0+i*bw+8, 185); c.fillText(v.toFixed(2)+' V', x0+i*bw+8, 165-hh); });
    c.strokeStyle=SIM.css('--bad'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(x0,170-1/2.2*160); c.lineTo(w-10,170-1/2.2*160); c.stroke(); c.setLineDash([]);
    const phase = fl<9?'V interval': u<SYNC?'H sync': u<SYNC+BPG_DLY?'sync trailing edge': u<SYNC+BPG_DLY+BPG_W?'back porch (clamp)': u<ACT0?'burst / blanking':'active picture';
    const st=['H sync','sync trailing edge','back porch (clamp)','burst / blanking','active picture','V interval'];
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 460 150" style="width:100%">${st.map((n,i)=>{ const x=10+(i%3)*150, y=10+Math.floor(i/3)*70; const on=n===phase; return `<rect x="${x}" y="${y}" width="140" height="56" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+70}" y="${y+24}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${n}</text><text x="${x+70}" y="${y+42}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${DATA.fsmNote[i]}</text>`; }).join('')}</svg><div class="small muted">Playhead at ${(u*1e6).toFixed(2)} µs into line ${lineNo(SIM.t)}. ${DATA.clamp?'Gate timing from the LM1881 datasheet with R36 680K '+inf('LM1881 datasheet, not in the archive'):'The M8251 has no line-rate logic: this only shows where in the line the playhead is.'}</div>`;
  });
}
function viewFind(m){
  window[FLAG]=false;
  m.innerHTML=card('Findings — what the '+DATA.product+' files are up to', `<ol>${DATA.findings.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}</ol>`)+card('Sources', `<ul class="small mono">${DATA.sources.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p class="small muted">${DATA.infNote}</p>`);
}


/* ---------------- 2026|59 artwork pass: findings and footnotes ---------------- */
DATA.findings.unshift(
  `<b>Artwork ${SIM.year(2026)}: the rear modules are now vector.</b> The BNC1/BNC3 panel is ${SIM.src(M8251_TERM,'m8251term.cdr')} (2000-05-23), converted with Inkscape, in place of the PNG cut earlier from the same file (still on the “old PNG” checkbox). Every BNC hotspot was re-placed on the file’s connector rings. The M8252 has no artwork of its own; it shares the M8251’s rear modules.`,
  `<b>The 2012 guide re-used another product’s drawing.</b> In ${SIM.src(M8251_RO,'M8251 - rear module options.cdr')} (2012-01-09) every BNC sits at exactly the same coordinates as in the D8204 sheet; only the legends were retyped (OUT n for DIGITAL OUT n). The 2000 m8251term.cdr is a separate, older drawing with the legends in dotted boxes.`
);
const FOOTNOTES = [
  {text:'The M8252 has no rear-module artwork of its own; its BNC1/BNC3 panels are the M8251’s m8251term.cdr (2000).', src:M8251_TERM},
  {text:'The 2012 M8251 rear-module sheet places every BNC exactly where the D8204 sheet does: the same drawing with new legends.', src:M8251_RO},
  {text:'The schematic M8252.DSN still carries the title-block name M8251.DSN and the misspelt title “EQULIZING/CLAMPING”.', src:'#MF8200 #SERIES/M8252 - #Master  #MF82/M8252 - #PCB/M8252.DSN'},
];
SIM.register({
  id: DATA.id, name: DATA.name, product: DATA.product, year: DATA.year, family: DATA.family, folder: DATA.folder,
  summary: DATA.summary, highlights: DATA.highlights, footnotes: FOOTNOTES, depth: 'Hardware model', duration: 1,
  stepUnits: [{label:'1 line (63.56 µs)', period:()=>HL}, {label:'1 field (16.68 ms)', period:()=>FIELD}, {label:'1 subcarrier cycle', period:()=>1/FSC}, {label:'1 µs', period:()=>1e-6}],
  zooms: [[1,'1 s (60 fields)'],[0.05,'50 ms (3 fields)'],[FIELD,'1 field'],[0.001,'1 ms (16 lines)'],[2*HL,'2 lines'],[HL,'1 line'],[12e-6,'12 µs (sync + burst)'],[1e-6,'1 µs (subcarrier)']],
  defaultZoom: 5,
  tabs: [{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewFind}],
});

})();
