/* =====================================================================
   M8251 — 1×8 analog video distribution amplifier
   Plugin for the WBS Device Simulator (../siumulation.html).
   Sources (all under #MF8200 #SERIES/M8251 - #Master  #MF82/):
   - M8251 - #Engineering/m8251man.wpd, m8251man.pdf (2002), m8251.pdf (2005) — description and specifications
   - M8251 - #Engineering/m8251term.cdr — “M8251 TERMINAL OPTIONS”: BNC1 and BNC3 (MF8210 ONLY)
   - ../8200 Series Rear Module options graphical Guides…/M8251 - rear module options.cdr — “1x6” / “1x8 Analog Utility Video Distribution Amplifier”
   - M8251 - #Engineering/PCB/M8251.BAK (Tango ASCII: COMP, PAD, LINE, ARC, TEXT), M8251.PCB, M8251.REP
   - M8251 - #Engineering/PCB/M8251.DSN (OrCAD part list), M8251-2.PCB/.BAK (M8252 working file)
   Assets: m8251-board.png (rendered from M8251.BAK), m8251-rear-bnc1.svg, m8251-rear-bnc3.svg (m8251term.cdr converted to SVG, 2026|59; replace the earlier m8251-rear-bnc.png)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const DATA = {
 "id": "m8251",
 "product": "M8251",
 "year": 1997,
 "what": "1×8 analog video distribution amplifier",
 "name": "M8251 · 1×8 analog video DA (1997|30)",
 "family": "8200 Distribution Series",
 "folder": "#MF8200 #SERIES/M8251 - #Master  #MF82",
 "summary": "A one-in, eight-out analog video DA for the 8200 frames: a high-impedance looping input, one Elantec EL2099C driving eight 75 Ω back-matched outputs, a LEVEL and a RESPONSE trim, and its own ±11.4 V regulators. The Tango board, OrCAD sheet and manual date from 1997–2002|30–35.",
 "highlights": [
  "Board drawn from the real M8251.BAK Tango layout",
  "BNC1 (1×6) vs BNC3 (1×8 + loop) rear modules from the terminal art",
  "Looping input: terminate once, see double/no termination",
  "Line-by-line NTSC timing down to the 3.58 MHz subcarrier",
  "Hum and cable loss pass straight through (no clamp, no EQ)"
 ],
 "defModule": "BNC3",
 "eq": false,
 "clamp": false,
 "response": true,
 "levelPot": "1K",
 "boardFile": "M8251.BAK (Tango-PCB PLUS, 18 Nov 1997)",
 "boardSrc": "PCB/M8251.BAK",
 "boardCaption": "M8251, ISSUE.1 — copper, pads and silk rendered from M8251.BAK (Tango ASCII; M8251.PCB is the 2003 P-CAD binary of the same board)",
 "artSrc": "M8251 - #Engineering/m8251term.cdr (“M8251 TERMINAL OPTIONS”)",
 "artInf": "",
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
   "val": "1K",
   "pat": "POT4S",
   "x": 1800,
   "y": 3800,
   "w": 46,
   "h": 18,
   "what": "Front-edge LEVEL trim (1K): sets the overall gain; long tracks run it back to U1."
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
   "ref": "RESPONSE",
   "val": "5K trim",
   "pat": "HTRIM",
   "x": 2325,
   "y": 3300,
   "w": 40,
   "h": 24,
   "what": "Front-edge RESPONSE trim (HTRIM footprint, “5K” in the assembly text): HF flatness at 3.58 MHz."
  },
  {
   "ref": "Q2",
   "val": "2N3906",
   "pat": "TO-92",
   "x": 2325,
   "y": 3700,
   "w": 18,
   "h": 18,
   "what": "PNP transistor next to the LEVEL trim (assembly text 2N3906; the OrCAD sheet has Q2 = PNP)."
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
   "k": "resp",
   "x": 390,
   "y": 40,
   "w": 150,
   "h": 96,
   "t": "RESPONSE trim",
   "s": [
    "HTRIM next to LEVEL",
    "HF peaking"
   ],
   "d": "High-frequency response trim: sets flatness at 3.58 MHz (spec better than 0.05 dB). The exact network is not recoverable from the Tango file; modelled as a small HF shelf <span class=\"tag-inf\" title=\"Not stated in the source; inferred from the part name RESPONSE and the manual spec\">inferred</span>.",
   "parts": "RESPONSE (HTRIM)",
   "live": "(D.resp>=0?'+':'')+(+D.resp).toFixed(2)+' dB'"
  },
  {
   "k": "amp",
   "x": 580,
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
   "x": 780,
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
   "resp",
   ""
  ],
  [
   "resp",
   "amp",
   ""
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
 "tutSrc": "m8251man.pdf / m8251.pdf (spec sheet) and the terminal options art",
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
   "Flatten the response",
   "Add 50 m of input cable, then use the RESPONSE trim to bring the chroma error at 3.58 MHz back within ±0.05 dB (“Response better than 0.05 dB @ 3.58M”). The M8251 has no EQ; RESPONSE has only about ±1 dB of range.",
   "Cable 50 m, then RESPONSE ≈ +0.5 dB.",
   "D.cable>=50 && Math.abs(M.hfNet)<=0.05"
  ],
  [
   "See what it cannot do",
   "Add 100 mV of 60 Hz hum. The M8251 has no clamp, so all of it reaches every output — that is the job of the M8252.",
   "Hum slider to 100 mV.",
   "D.hum>=100 && M.humOut>=0.09"
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
   "name": "1 · Input and level",
   "h": 330,
   "svg": "<circle cx=\"60\" cy=\"90\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"60\" cy=\"90\" r=\"3\" fill=\"var(--ink)\"/><text x=\"60\" y=\"74\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">INPUT</text><circle cx=\"60\" cy=\"170\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"60\" cy=\"170\" r=\"3\" fill=\"var(--ink)\"/><text x=\"60\" y=\"154\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">INPUT LOOP</text><polyline points=\"71,90 150,90 150,170 71,170\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"150,90 230,90\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"230\" y1=\"90\" x2=\"240\" y2=\"90\" stroke=\"var(--ink)\"/><rect x=\"240\" y=\"85\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"270\" y1=\"90\" x2=\"280\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"255\" y=\"81\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R3</text><text x=\"255\" y=\"108\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><text x=\"240\" y=\"125\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--warn)\">via HIZ link (H1X3)</text><line x1=\"160\" y1=\"230\" x2=\"160\" y2=\"240\" stroke=\"var(--ink)\"/><rect x=\"155\" y=\"240\" width=\"10\" height=\"30\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"160\" y1=\"270\" x2=\"160\" y2=\"280\" stroke=\"var(--ink)\"/><text x=\"169\" y=\"252\" font-size=\"10\" fill=\"var(--ink)\">R1</text><text x=\"169\" y=\"264\" font-size=\"10\" fill=\"var(--accent2)\">47K</text><polyline points=\"150,90 165,90 165,230\" fill=\"none\" stroke=\"var(--ink)\"/><rect x=\"420\" y=\"70\" width=\"140\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"490\" y=\"54\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">Q1 2N3904</text><text x=\"490\" y=\"66\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">input buffer</text><line x1=\"390\" y1=\"90\" x2=\"420\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"424\" y=\"94\" font-size=\"10\" fill=\"var(--ink)\">B</text><text x=\"387\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">input</text><line x1=\"560\" y1=\"90\" x2=\"590\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"556\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">E</text><text x=\"593\" y=\"94\" font-size=\"10\" fill=\"var(--accent2)\">→ LEVEL</text><rect x=\"700\" y=\"70\" width=\"150\" height=\"80\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"775\" y=\"54\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">LEVEL / Q2</text><text x=\"775\" y=\"66\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">1K trim, 2N3906, R19 499R</text><line x1=\"670\" y1=\"90\" x2=\"700\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"704\" y=\"94\" font-size=\"10\" fill=\"var(--ink)\">in</text><text x=\"667\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">from Q1</text><line x1=\"850\" y1=\"90\" x2=\"880\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"846\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">out</text><text x=\"883\" y=\"94\" font-size=\"10\" fill=\"var(--accent2)\">→ U1 +IN</text><line x1=\"850\" y1=\"108\" x2=\"880\" y2=\"108\" stroke=\"var(--ink)\"/><text x=\"846\" y=\"112\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">RESP</text><text x=\"883\" y=\"112\" font-size=\"10\" fill=\"var(--accent2)\">RESPONSE 5K</text><text x=\"60\" y=\"300\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--warn)\">Values from the assembly-layer text of M8251.BAK; connections between them are not stored in the Tango file, so the topology is inferred from part names and positions.</text>",
   "note": "Input BNCs from m8251term.cdr; R1, R3, HIZ, Q1 at the P1 end of the board, LEVEL/RESPONSE/Q2 at the front edge (M8251.BAK positions)."
  },
  {
   "name": "2 · EL2099 and outputs",
   "h": 290,
   "svg": "<rect x=\"330\" y=\"70\" width=\"150\" height=\"120\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"405\" y=\"54\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">U1 EL2099C</text><text x=\"405\" y=\"66\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">TO225 · video distribution amp</text><line x1=\"300\" y1=\"90\" x2=\"330\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"334\" y=\"94\" font-size=\"10\" fill=\"var(--ink)\">+IN</text><text x=\"297\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">from buffer/level</text><line x1=\"300\" y1=\"108\" x2=\"330\" y2=\"108\" stroke=\"var(--ink)\"/><text x=\"334\" y=\"112\" font-size=\"10\" fill=\"var(--ink)\">FB</text><text x=\"297\" y=\"112\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">R6 / R8 (1K)</text><line x1=\"300\" y1=\"126\" x2=\"330\" y2=\"126\" stroke=\"var(--ink)\"/><text x=\"334\" y=\"130\" font-size=\"10\" fill=\"var(--ink)\">COMP</text><text x=\"297\" y=\"130\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">C1 5p6</text><line x1=\"480\" y1=\"90\" x2=\"510\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"476\" y=\"94\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"513\" y=\"94\" font-size=\"10\" fill=\"var(--accent2)\">bus → R10–R17</text><line x1=\"480\" y1=\"108\" x2=\"510\" y2=\"108\" stroke=\"var(--ink)\"/><text x=\"476\" y=\"112\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">V+</text><text x=\"513\" y=\"112\" font-size=\"10\" fill=\"var(--accent2)\">+11.4 V</text><line x1=\"480\" y1=\"126\" x2=\"510\" y2=\"126\" stroke=\"var(--ink)\"/><text x=\"476\" y=\"130\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">V−</text><text x=\"513\" y=\"130\" font-size=\"10\" fill=\"var(--accent2)\">−11.4 V</text><line x1=\"640\" y1=\"60\" x2=\"650\" y2=\"60\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"55\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"60\" x2=\"690\" y2=\"60\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"51\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R10</text><text x=\"665\" y=\"78\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,60 740,60\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"64\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 1</text><line x1=\"640\" y1=\"90\" x2=\"650\" y2=\"90\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"85\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"90\" x2=\"690\" y2=\"90\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"81\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R11</text><text x=\"665\" y=\"108\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,90 740,90\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"94\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 2</text><line x1=\"640\" y1=\"120\" x2=\"650\" y2=\"120\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"115\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"120\" x2=\"690\" y2=\"120\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"111\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R12</text><text x=\"665\" y=\"138\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,120 740,120\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"124\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 3</text><line x1=\"640\" y1=\"150\" x2=\"650\" y2=\"150\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"145\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"150\" x2=\"690\" y2=\"150\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"141\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R13</text><text x=\"665\" y=\"168\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,150 740,150\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"154\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 4</text><line x1=\"640\" y1=\"180\" x2=\"650\" y2=\"180\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"175\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"180\" x2=\"690\" y2=\"180\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"171\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R14</text><text x=\"665\" y=\"198\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,180 740,180\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"184\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 5</text><line x1=\"640\" y1=\"210\" x2=\"650\" y2=\"210\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"205\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"210\" x2=\"690\" y2=\"210\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"201\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R15</text><text x=\"665\" y=\"228\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,210 740,210\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"214\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 6</text><line x1=\"640\" y1=\"240\" x2=\"650\" y2=\"240\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"235\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"240\" x2=\"690\" y2=\"240\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"231\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R16</text><text x=\"665\" y=\"258\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,240 740,240\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"244\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 7</text><line x1=\"640\" y1=\"270\" x2=\"650\" y2=\"270\" stroke=\"var(--ink)\"/><rect x=\"650\" y=\"265\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"680\" y1=\"270\" x2=\"690\" y2=\"270\" stroke=\"var(--ink)\"/><text x=\"665\" y=\"261\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R17</text><text x=\"665\" y=\"288\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">75R0</text><polyline points=\"690,270 740,270\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"745\" y=\"274\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--accent2)\">P1 → OUT 8</text><polyline points=\"540,90 600,90 600,270 640,270\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,60 640,60\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,90 640,90\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,120 640,120\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,150 640,150\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,180 640,180\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,210 640,210\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,240 640,240\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"600,270 640,270\" fill=\"none\" stroke=\"var(--ink)\"/><text x=\"330\" y=\"230\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Each output: 75R0 back-match → P1 → BNC1/BNC3 → 75 Ω cable → 75 Ω load: ½ of the drive at the load.</text><text x=\"330\" y=\"248\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Gain 2× in the EL2099 stage makes up that 6 dB (1 V p-p in → 1 V p-p terminated out, manual spec).</text><text x=\"330\" y=\"266\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Gain-set values near U1 on the board: 499R, 1K, 47R, 5p6 (assembly-layer text).</text>",
   "note": "R10–R17 sit in one column at X = 10 700 mil, Y 2 400–3 450 mil, between U1 and P1."
  },
  {
   "name": "3 · Power",
   "h": 330,
   "svg": "<circle cx=\"60\" cy=\"80\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"60\" cy=\"80\" r=\"3\" fill=\"var(--ink)\"/><text x=\"60\" y=\"64\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">P1 +21 V</text><circle cx=\"60\" cy=\"210\" r=\"11\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><circle cx=\"60\" cy=\"210\" r=\"3\" fill=\"var(--ink)\"/><text x=\"60\" y=\"194\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--ink)\">P1 −21 V</text><rect x=\"240\" y=\"60\" width=\"140\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"310\" y=\"44\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">REG1 LM317</text><text x=\"310\" y=\"56\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">positive regulator</text><line x1=\"210\" y1=\"80\" x2=\"240\" y2=\"80\" stroke=\"var(--ink)\"/><text x=\"244\" y=\"84\" font-size=\"10\" fill=\"var(--ink)\">IN</text><text x=\"207\" y=\"84\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">+21 V</text><line x1=\"380\" y1=\"80\" x2=\"410\" y2=\"80\" stroke=\"var(--ink)\"/><text x=\"376\" y=\"84\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"413\" y=\"84\" font-size=\"10\" fill=\"var(--accent2)\">+11.4 V</text><rect x=\"240\" y=\"190\" width=\"140\" height=\"60\" fill=\"var(--panel2)\" stroke=\"var(--ink)\" stroke-width=\"1.4\"/><text x=\"310\" y=\"174\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"var(--ink)\">REG2 LM337</text><text x=\"310\" y=\"186\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink2)\">negative regulator</text><line x1=\"210\" y1=\"210\" x2=\"240\" y2=\"210\" stroke=\"var(--ink)\"/><text x=\"244\" y=\"214\" font-size=\"10\" fill=\"var(--ink)\">IN</text><text x=\"207\" y=\"214\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--accent2)\">−21 V</text><line x1=\"380\" y1=\"210\" x2=\"410\" y2=\"210\" stroke=\"var(--ink)\"/><text x=\"376\" y=\"214\" font-size=\"10\" text-anchor=\"end\" fill=\"var(--ink)\">OUT</text><text x=\"413\" y=\"214\" font-size=\"10\" fill=\"var(--accent2)\">−11.4 V</text><line x1=\"450\" y1=\"100\" x2=\"460\" y2=\"100\" stroke=\"var(--ink)\"/><rect x=\"460\" y=\"95\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"490\" y1=\"100\" x2=\"500\" y2=\"100\" stroke=\"var(--ink)\"/><text x=\"475\" y=\"91\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R20/R22</text><text x=\"475\" y=\"118\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">221R</text><line x1=\"450\" y1=\"230\" x2=\"460\" y2=\"230\" stroke=\"var(--ink)\"/><rect x=\"460\" y=\"225\" width=\"30\" height=\"10\" fill=\"none\" stroke=\"var(--ink)\"/><line x1=\"490\" y1=\"230\" x2=\"500\" y2=\"230\" stroke=\"var(--ink)\"/><text x=\"475\" y=\"221\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--ink)\">R21/R23</text><text x=\"475\" y=\"248\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--accent2)\">1K8</text><text x=\"240\" y=\"290\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">V = 1.25 V × (1 + 1K8 / 221R) = 11.43 V per rail. C3/C4 1µ/35 on the inputs, C23A/C23B 10µ/35 at U1.</text><text x=\"240\" y=\"308\" font-size=\"10.5\" text-anchor=\"start\" fill=\"var(--ink2)\">Layer-13 notes on the board add “2 X RXE050”, “1N4003” ×2 and “47\\63” ×2 near P1 (fuses, reverse diodes, bulk caps) — see Findings.</text><polyline points=\"71,80 210,80\" fill=\"none\" stroke=\"var(--ink)\"/><polyline points=\"71,210 210,210\" fill=\"none\" stroke=\"var(--ink)\"/>",
   "note": "Regulator values from the board text: LM317 / LM337, 221R and 1K8 ×2, 1\\35 capacitors. The OrCAD sheet M8251.DSN lists REG1 and REG2 both as LM317."
  }
 ],
 "schemNote": "Redrawn from M8251.BAK (part positions and assembly-layer values), M8251.DSN (part list: EL2099, LM317 ×2, NPN, PNP, JP3, R1–R23) and the spec sheet. Not the original CAD.",
 "softIntro": "The M8251 has no processor and no logic: the card is one buffer, one level trim and one EL2099 driving eight back-matched lines. Below, each stage’s level for the current bench, and where in the TV line the playhead sits.",
 "fsmNote": [
  "−40 IRE, 4.7 µs",
  "blanking returns",
  "no clamp on this card",
  "9 cycles 3.58 MHz",
  "52.6 µs of picture",
  "serrated broad pulses"
 ],
 "findings": [
  "<b>BNC1 is a 1×6, not a 1×8.</b> The M8251 manual calls the card “a one by eight video distribution amplifier”, but its own terminal art (<span class=\"mono\">m8251term.cdr</span>, and the rear-module guide <span class=\"mono\">M8251 - rear module options.cdr</span>) shows BNC1 with INPUT and OUT 1–6 only, titled “M8251 -1x6 Analog Utility Video Distribution Amplifier”. All eight 75R0 back-match resistors R10–R17 are on the card; OUT 7 and OUT 8 only reach a connector on BNC3, which is “*MF8210 only”. Try it: switch the Simulator to BNC1 and click OUT 7.",
  "<b>The loop-through needs the HIZ link.</b> The board has a three-pin <span class=\"mono\">HIZ</span> header (H1X3) next to R3 75R0 and R1 47K. With BNC3 the input is meant to loop on (“high impedance looping input”); with BNC1 there is no loop connector, so the link must select the on-card 75 Ω or the line is unterminated and the picture doubles to 2 V p-p. The manual does not mention the link at all.",
  "<b>The OrCAD sheet and the board disagree on the negative regulator.</b> <span class=\"mono\">M8251.DSN</span> places REG1 and REG2 both as LM317; the board text in <span class=\"mono\">M8251.BAK</span> says LM317 at REG1 and <b>LM337</b> at REG2. An LM317 cannot regulate the −21 V rail.",
  "<b>“46 mA” is a light-load figure.</b> The spec sheet gives ±21 V DC 46 mA. Eight terminated outputs at white draw about 8 × 1.43 V / 150 Ω ≈ 76 mA from U1 alone; 46 mA matches a ~50 % picture level average, so the frame budget should allow more <span class=\"tag-inf\" title=\"Not stated in the source; inferred from back-match arithmetic, EL2099 quiescent ≈ 9 mA\">inferred</span>.",
  "<b>Two boards in one folder.</b> <span class=\"mono\">M8251-2.PCB/.BAK</span> are not a second M8251 issue: they contain the M8252 parts (OPA650A, LM1881, 74HC00, EQ) plus an un-suffixed copy of every M8251 part — the working file in which the M8252 was grown out of the M8251.",
  "<b>Same board, three formats.</b> <span class=\"mono\">M8251.BAK</span> (Tango ASCII, 18 Nov 1997), <span class=\"mono\">M8251.PCB</span> (P-CAD 2002 binary, 2003) and the .REP statistics (Sep 2000) describe the same 46-part layout; only the .BAK can be read without P-CAD, and it is what the board on the Simulator tab is drawn from.",
  "<b>Layer-13 notes that are not parts.</b> A second text layer carries “30R 1W” beside each output resistor, “2 X RXE050”, “1N4003” ×2, “47\\63” and a large “Do Not Install” across the empty middle of the board. None of these are placed components in M8251.BAK; they read like notes copied from the audio DA template (the M8209 uses exactly RXE050, 1N4003 and 47/63 parts) <span class=\"tag-inf\" title=\"Not stated in the source; inferred from the matching M8209 BOM\">inferred</span>.",
  "<b>LEVEL is at the front, U1 at the back.</b> The LEVEL and RESPONSE trims sit at the front edge (X ≈ 1.8–2.3″), U1 at X ≈ 10.35″: about 8.5″ of track carries the video forward and back. At 3.58 MHz that is short (≈ 1.3 ns) but it explains the two long parallel tracks on the render.",
  "<b>The manual folder is empty.</b> <span class=\"mono\">M8251 - #Manual/</span> has nothing in it; the only manual text is the one-page spec sheet <span class=\"mono\">m8251man.wpd/.pdf</span> (2002) and its 2005 reprint <span class=\"mono\">m8251.pdf</span>."
 ],
 "sources": [
  "M8251 - #Engineering/m8251man.wpd, m8251man.pdf (2002), m8251.pdf (2005) — description and specifications",
  "M8251 - #Engineering/m8251term.cdr — “M8251 TERMINAL OPTIONS”: BNC1 and BNC3 (MF8210 ONLY)",
  "../8200 Series Rear Module options graphical Guides…/M8251 - rear module options.cdr — “1x6” / “1x8 Analog Utility Video Distribution Amplifier”",
  "M8251 - #Engineering/PCB/M8251.BAK (Tango ASCII: COMP, PAD, LINE, ARC, TEXT), M8251.PCB, M8251.REP",
  "M8251 - #Engineering/PCB/M8251.DSN (OrCAD part list), M8251-2.PCB/.BAK (M8252 working file)"
 ],
 "assets": [
  "m8251-board.png (rendered from M8251.BAK)",
  "m8251-rear-bnc1.svg, m8251-rear-bnc3.svg (m8251term.cdr converted from CorelDRAW, 2026|59)"
 ],
 "infNote": "NTSC timing values are RS-170A; cable loss uses a typical RG-59/8281 figure (2.3 dB/100 m at 5 MHz) and is marked inferred."
};
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const ID = DATA.id, FLAG = '__' + ID + 'Active';
DATA.findings.unshift(`<b>Artwork 2026|59: rear modules now from ${SIM.src('#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/m8251term.cdr','m8251term.cdr')} (2000-05-23).</b> Both panels (BNC1, BNC3) are converted from CorelDRAW to SVG and the BNCs are clickable where the art draws them. The 2012 guide ${SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8251 - rear module options.cdr','M8251 - rear module options.cdr')} (2012-01-09) redraws the same two modules smaller and adds the captions “1x6” / “1x8 Analog Utility Video Distribution Amplifier”; the older sheet is used because it is the master the guide was copied from. On BNC1 the BNCs are staggered (INPUT, OUT 2, 4, 6 on the left column; OUT 1, 3, 5 on the right) and each BNC carries a small tag (INPUT, 1–6) as well as its boxed legend; on BNC3 one dotted box spans INPUT and INPUT LOOP, the two BNCs joined by a bar.`);
const FOOT=[
  {text:'BNC1 has seven BNCs (INPUT + OUT 1–6) although the manual calls the M8251 a one-by-eight DA; only BNC3 (MF8210 only) brings out all eight outputs.', src:'#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/m8251term.cdr'},
  {text:'Each BNC on the terminal sheet carries two labels: a boxed legend (INPUT, OUT 1 …) and a small tag beside it (INPUT, 1–8, INPUT LOOP).', src:'#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/m8251term.cdr'},
  {text:'BNC3 is marked “(MF8210 ONLY)”: the double-width 1×8 + loop panel does not fit the MF8212 frame.', src:'#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/m8251term.cdr'},
  {text:'The terminal options are drawn twice: m8251term.cdr (2000) in the card folder and “M8251 - rear module options.cdr” (2012) in the rear-module guides, which adds the 1x6 / 1x8 captions.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8251 - rear module options.cdr'},
  {text:'The rear-module guide README lists M8251 as “CDR only, no PDF”; a rendered PDF has since been added beside it.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8251 - rear module options.cdr'},
  {text:'M8251-2.PCB/.BAK in the M8251 folder hold the M8252 board (OPA650A, LM1881, EQ), not a second M8251 issue.', src:'#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/PCB/M8251-2.PCB'},
  {text:'The OrCAD part list places both regulators as LM317, while the board text names an LM337 for the negative rail.', src:'#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/PCB/M8251.DSN'} ];
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
/* Rear modules — CorelDRAW art (2026|59): assets/m8251-rear-bnc1.svg / -bnc3.svg, the two panels of m8251term.cdr
   (2000-05-23) converted with Inkscape; sheet title removed, hairlines widened. Coordinates are the CDR's points; BNC
   centres read off the converted art. */
const RB = { BNC1:{vb:[72,92,325,415],pts:[['in',217.6,206.4],['o1',252.1,242.8],['o2',217.6,279.3],['o3',252.1,315],['o4',217.6,351.4],['o5',252.1,388.5],['o6',217.6,424.9]]},
             BNC3:{vb:[396,92,326,415],pts:[['in',533.8,203.8],['loop',583.3,203.8],['o1',533.8,259.1],['o2',583.3,259.1],['o3',533.8,314.4],['o4',583.3,314.4],['o5',533.8,370.3],['o6',583.3,370.3],['o7',533.8,426.9],['o8',583.3,426.9]]} };
const TERM_CDR='#MF8200 #SERIES/M8251 - #Master  #MF82/M8251 - #Engineering/m8251term.cdr';
function rearSVG(){
  const M=model(), R=RB[D.module], [vx,vy,vw,vh]=R.vb;
  let s=`<svg viewBox="${vx} ${vy} ${vw} ${vh}" style="width:100%;max-width:360px;display:block;margin:auto;border-radius:6px" role="img" aria-label="${D.module} rear module, CorelDRAW art from m8251term.cdr">
    <image href="${ASSET}${ID}-rear-${D.module.toLowerCase()}.svg" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
  R.pts.forEach(([k,x,y])=>{
    let fill='none', ring='#2d63a6', lab='', live=false, sel=false;
    if (k==='in'){ live=D.srcOn; lab=D.srcOn?'source':'—'; }
    else if (k==='loop'){ live=D.loop!=='open'; lab=D.loop==='open'?'open':D.loop==='term'?'75 Ω term.':'→ next DA'; }
    else { const n=+k.slice(1), o=M.out[n-1]; live=o.L!=='none'; lab=o.L==='none'?'':o.L==='open'?'open':o.L+' Ω'; sel=D.sel===n; if(live) fill=o.ok?'var(--led-g)':'var(--led-a)'; }
    s+=`<g class="vb" data-k="${k}" style="cursor:pointer"><title>${k==='in'?'INPUT':k==='loop'?'INPUT LOOP':'OUT '+k.slice(1)}</title><circle cx="${x}" cy="${y}" r="23" fill="transparent"/>${live?`<circle cx="${x}" cy="${y}" r="14" fill="${ring}" opacity=".8"/><circle cx="${x}" cy="${y}" r="4" fill="#d6e6ff"/>`:''}
      ${sel?`<circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#e0a000" stroke-width="3"/>`:''}${fill!=='none'?`<circle cx="${x+17}" cy="${y-17}" r="5" fill="${fill}" stroke="#333"/>`:''}
      ${lab?`<text x="${x}" y="${y+30}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0d3a6a" paint-order="stroke" stroke="#fff" stroke-width="2.5">${lab}</text>`:''}</g>`;
  });
  return s+`</svg><div class="small muted" style="text-align:center">Rear artwork: ${SIM.src(TERM_CDR,'m8251term.cdr')} (2000-05-23, “M8251 TERMINAL OPTIONS”), converted from CorelDRAW${DATA.artInf?' '+inf(DATA.artInf):''}. Click INPUT to connect the source, INPUT LOOP to cycle open / terminator / next DA, an output to cycle its load (none → 75 Ω → open → 37.5 Ω).</div>`;
}
function bindBoard(m){
  m.querySelectorAll('.vp').forEach(g=>g.onclick=()=>{ const p=g.dataset.p; if(p==='HIZ') A.hiz(); else A.part(p); });
  m.querySelectorAll('.vhiz').forEach(g=>g.onclick=()=>A.hiz());
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

SIM.register({
  footnotes:FOOT,
  id: DATA.id, name: DATA.name, product: DATA.product, year: DATA.year, family: DATA.family, folder: DATA.folder,
  summary: DATA.summary, highlights: DATA.highlights, depth: 'Hardware model', duration: 1,
  stepUnits: [{label:'1 line (63.56 µs)', period:()=>HL}, {label:'1 field (16.68 ms)', period:()=>FIELD}, {label:'1 subcarrier cycle', period:()=>1/FSC}, {label:'1 µs', period:()=>1e-6}],
  zooms: [[1,'1 s (60 fields)'],[0.05,'50 ms (3 fields)'],[FIELD,'1 field'],[0.001,'1 ms (16 lines)'],[2*HL,'2 lines'],[HL,'1 line'],[12e-6,'12 µs (sync + burst)'],[1e-6,'1 µs (subcarrier)']],
  defaultZoom: 5,
  tabs: [{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewFind}],
});

})();
