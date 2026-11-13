/* =====================================================================
   T6203 — 10 terminal-block rear module for balanced signals
   Plugin for the WBS Device Simulator (../siumulation.html). Generated from
   the shared openGear rear-module engine; all data below comes from the
   netlists, Gerbers and drawings listed in DATA.sources.
   ===================================================================== */
(function(){
const DATA = {
 "id": "t6203",
 "product": "T6203",
 "year": 2008,
 "what": "10 terminal-block rear module for balanced signals",
 "name": "T6203 · 10 terminal-block openGear rear module (2008|41)",
 "folder": "#OPENGEAR #SERIES/T6203 - #Master #OPENGEAR #TERMINATION",
 "summary": "Ten Phoenix pluggable terminal blocks for 110 Ω AES or balanced analog audio, wired to the openGear AES pairs. ISS2 (2008|41) moved the two single-ended BNC pin pairs from positions 9–10 to 1–2 so a card can take a balanced input there, without changing the 9K76 ID.",
 "highlights": [
  "ISS3 Gerbers drawn 1:1",
  "D6202A, D6202B and AA6201A pinouts",
  "ISS1 → ISS2 pinout change, same ID",
  "Balanced input on BNCx_SIG / BNCx_GND pins",
  "Card-side ID read"
 ],
 "intro": "The T6203 is the first-generation all-terminal-block module, used behind the 110 Ω AES DAs (D6202A, D6202B) and the AA6201A analog audio DA. It was superseded by the T6303.",
 "alloc": {
  "bmid": 3570,
  "bmid2": 9760
 },
 "defaultIssue": "iss2",
 "issues": {
  "iss2": {
   "label": "ISS2/ISS3 (T6203-iss2.net, ISS3 Gerbers 3 Oct 2008)",
   "img": "t6203-pcb",
   "w": 1.265,
   "h": 3.228,
   "face": "top layer, terminal blocks on this side",
   "cardSide": "bottom layer, mirrored",
   "art": "T6203 - #ISS3 #GERBERS (TOP/TSM/TSS, BOT/BSM/BSS), first board of the panel",
   "netlist": "T6203-iss2.net (no ISS3 netlist; ISS3 assumed the same)",
   "pos": [
    {
     "n": 1,
     "kind": "tbu",
     "x": 0.32,
     "y": 0.524,
     "ref": "TB1",
     "bnc": 1,
     "net": "BNC1",
     "pin1": "BNC1_SIG",
     "pin2": "BNC1_GND",
     "pin3": "GNDD",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gnd": "iso"
    },
    {
     "n": 2,
     "kind": "tbu",
     "x": 1.055,
     "y": 0.524,
     "ref": "TB2",
     "bnc": 2,
     "net": "BNC2",
     "pin1": "BNC2_SIG",
     "pin2": "BNC2_GND",
     "pin3": "GNDD",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gnd": "iso"
    },
    {
     "n": 3,
     "kind": "tb",
     "x": 0.32,
     "y": 1.049,
     "ref": "TB3",
     "pair": "AES1",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 4,
     "kind": "tb",
     "x": 1.055,
     "y": 1.049,
     "ref": "TB4",
     "pair": "AES5",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 5,
     "kind": "tb",
     "x": 0.32,
     "y": 1.574,
     "ref": "TB5",
     "pair": "AES2",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 6,
     "kind": "tb",
     "x": 1.055,
     "y": 1.574,
     "ref": "TB6",
     "pair": "AES6",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 7,
     "kind": "tb",
     "x": 0.32,
     "y": 2.099,
     "ref": "TB7",
     "pair": "AES3",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 8,
     "kind": "tb",
     "x": 1.055,
     "y": 2.099,
     "ref": "TB8",
     "pair": "AES7",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 9,
     "kind": "tb",
     "x": 0.32,
     "y": 2.624,
     "ref": "TB9",
     "pair": "AES4",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 10,
     "kind": "tb",
     "x": 1.055,
     "y": 2.624,
     "ref": "TB10",
     "pair": "AES8",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    }
   ],
   "id": {
    "bmid": 3570,
    "bmid2": 9760,
    "note": ""
   },
   "parts": "10 × PHEN3PTOP (TB1–TB10), R1 3K57, R2 9K76, P101 MEC1-150-02-L-D-A. No other parts."
  },
  "iss1": {
   "label": "ISS1 (T6203.net, 14 Aug 2006)",
   "img": "t6203-pcb",
   "w": 1.265,
   "h": 3.228,
   "face": "top layer (ISS3 artwork shown)",
   "cardSide": "bottom layer, mirrored",
   "art": "ISS3 Gerbers shown; ISS1 Gerbers are the “#PROBLEM UNKNOWN VERSION” folder",
   "netlist": "T6203.net",
   "pos": [
    {
     "n": 1,
     "kind": "tb",
     "x": 0.32,
     "y": 0.524,
     "ref": "TB1",
     "pair": "AES1",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 2,
     "kind": "tb",
     "x": 1.055,
     "y": 0.524,
     "ref": "TB2",
     "pair": "AES5",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 3,
     "kind": "tb",
     "x": 0.32,
     "y": 1.049,
     "ref": "TB3",
     "pair": "AES2",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 4,
     "kind": "tb",
     "x": 1.055,
     "y": 1.049,
     "ref": "TB4",
     "pair": "AES6",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 5,
     "kind": "tb",
     "x": 0.32,
     "y": 1.574,
     "ref": "TB5",
     "pair": "AES3",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 6,
     "kind": "tb",
     "x": 1.055,
     "y": 1.574,
     "ref": "TB6",
     "pair": "AES7",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 7,
     "kind": "tb",
     "x": 0.32,
     "y": 2.099,
     "ref": "TB7",
     "pair": "AES4",
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "n": 8,
     "kind": "tb",
     "x": 1.055,
     "y": 2.099,
     "ref": "TB8",
     "pair": "AES8",
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "n": 9,
     "kind": "tbu",
     "x": 0.32,
     "y": 2.624,
     "ref": "TB9",
     "bnc": 9,
     "net": "BNC9",
     "pin1": "BNC9_GND",
     "pin2": "BNC9_SIG",
     "pin3": null,
     "pitch": 0.1375,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gnd": "iso"
    },
    {
     "n": 10,
     "kind": "tbu",
     "x": 1.055,
     "y": 2.624,
     "ref": "TB10",
     "bnc": 10,
     "net": "BNC10",
     "pin1": "BNC10_GND",
     "pin2": "BNC10_SIG",
     "pin3": null,
     "pitch": 0.1375,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gnd": "iso"
    }
   ],
   "id": {
    "bmid": 3570,
    "bmid2": 9760,
    "note": ""
   },
   "parts": "10 × PHEN3PTOP, R1 3K57, R2 9K76, P101. TB9 and TB10 pin 3 not connected."
  }
 },
 "cards": [
  {
   "id": "D6202A",
   "short": "1×8 110 Ω AES DA",
   "issues": [
    "iss2"
   ],
   "label": "D6202A 1×8 110 Ω AES DA",
   "src": "D6202A-T6203.cdr (IN 1, NC, OUT1–OUT8); output order from the D6202A T6303A guide — inferred",
   "roles": {
    "1": [
     "IN1",
     "in",
     "aes110"
    ],
    "2": [
     "not connected",
     "nc",
     "nc"
    ],
    "3": [
     "OUT1",
     "out",
     "aes110"
    ],
    "4": [
     "OUT5",
     "out",
     "aes110"
    ],
    "5": [
     "OUT2",
     "out",
     "aes110"
    ],
    "6": [
     "OUT6",
     "out",
     "aes110"
    ],
    "7": [
     "OUT3",
     "out",
     "aes110"
    ],
    "8": [
     "OUT7",
     "out",
     "aes110"
    ],
    "9": [
     "OUT4",
     "out",
     "aes110"
    ],
    "10": [
     "OUT8",
     "out",
     "aes110"
    ]
   }
  },
  {
   "id": "D6202B",
   "short": "dual 110 Ω AES DA",
   "issues": [
    "iss2"
   ],
   "label": "D6202B dual 1×4 110 Ω AES DA",
   "src": "D6202B-T6203.cdr",
   "roles": {
    "1": [
     "IN1",
     "in",
     "aes110"
    ],
    "2": [
     "IN2",
     "in",
     "aes110"
    ],
    "3": [
     "OUT1-1",
     "out",
     "aes110"
    ],
    "4": [
     "OUT2-1",
     "out",
     "aes110"
    ],
    "5": [
     "OUT1-2",
     "out",
     "aes110"
    ],
    "6": [
     "OUT2-2",
     "out",
     "aes110"
    ],
    "7": [
     "OUT1-3",
     "out",
     "aes110"
    ],
    "8": [
     "OUT2-3",
     "out",
     "aes110"
    ],
    "9": [
     "OUT1-4",
     "out",
     "aes110"
    ],
    "10": [
     "OUT2-4",
     "out",
     "aes110"
    ]
   }
  },
  {
   "id": "AA6201A",
   "short": "analog audio DA",
   "issues": [
    "iss2"
   ],
   "label": "AA6201A dual analog audio DA",
   "src": "AA6201A-T6203.pdf",
   "roles": {
    "1": [
     "IN1",
     "in",
     "analog"
    ],
    "2": [
     "IN2",
     "in",
     "analog"
    ],
    "3": [
     "OUT1-1",
     "out",
     "analog"
    ],
    "4": [
     "OUT2-1",
     "out",
     "analog"
    ],
    "5": [
     "OUT1-2",
     "out",
     "analog"
    ],
    "6": [
     "OUT2-2",
     "out",
     "analog"
    ],
    "7": [
     "OUT1-3",
     "out",
     "analog"
    ],
    "8": [
     "OUT2-3",
     "out",
     "analog"
    ],
    "9": [
     "OUT1-4",
     "out",
     "analog"
    ],
    "10": [
     "OUT2-4",
     "out",
     "analog"
    ]
   }
  },
  {
   "id": "generic1",
   "short": "generic pinout, ISS1",
   "issues": [
    "iss1"
   ],
   "label": "T6203 ISS1 generic: AES1–AES8, BNC9, BNC10",
   "src": "T6203 generic.pdf",
   "roles": {
    "1": [
     "AES1",
     "io",
     "aes110"
    ],
    "2": [
     "AES5",
     "io",
     "aes110"
    ],
    "3": [
     "AES2",
     "io",
     "aes110"
    ],
    "4": [
     "AES6",
     "io",
     "aes110"
    ],
    "5": [
     "AES3",
     "io",
     "aes110"
    ],
    "6": [
     "AES7",
     "io",
     "aes110"
    ],
    "7": [
     "AES4",
     "io",
     "aes110"
    ],
    "8": [
     "AES8",
     "io",
     "aes110"
    ],
    "9": [
     "BNC9 (on TB)",
     "in",
     "aes110"
    ],
    "10": [
     "BNC10 (on TB)",
     "io",
     "aes110"
    ]
   }
  },
  {
   "id": "D6202B1",
   "short": "D6202B on ISS1 (mismatch)",
   "issues": [
    "iss1"
   ],
   "label": "D6202B pinout applied to ISS1 wiring",
   "src": "D6202B-T6203.cdr over T6203.net — shows what moves",
   "roles": {
    "1": [
     "IN1",
     "in",
     "aes110"
    ],
    "2": [
     "IN2",
     "in",
     "aes110"
    ],
    "3": [
     "OUT1-1",
     "out",
     "aes110"
    ],
    "4": [
     "OUT2-1",
     "out",
     "aes110"
    ],
    "5": [
     "OUT1-2",
     "out",
     "aes110"
    ],
    "6": [
     "OUT2-2",
     "out",
     "aes110"
    ],
    "7": [
     "OUT1-3",
     "out",
     "aes110"
    ],
    "8": [
     "OUT2-3",
     "out",
     "aes110"
    ],
    "9": [
     "OUT1-4",
     "out",
     "aes110"
    ],
    "10": [
     "OUT2-4",
     "out",
     "aes110"
    ]
   }
  }
 ],
 "tutorial": {
  "card": "D6202B",
  "issueHint": "On ISS1 the inputs at positions 1–2 land on the AES1/AES5 pairs and positions 9–10 on the single-ended BNC9/BNC10 pins; on ISS2 positions 1–2 are the BNC1/BNC2 pins and the eight AES pairs shift down one row."
 },
 "findings": [
  "<b>ISS2 changed the pinout but not the ID.</b> In <span class=\"mono\">T6203.net</span> (ISS1) TB1–TB8 carry AES1–AES8 and TB9/TB10 carry BNC9/BNC10. In <span class=\"mono\">T6203-iss2.net</span> TB1/TB2 carry BNC1/BNC2 and TB3–TB10 carry AES1–AES8. Both have AN_BMID2 = 9K76, so a card cannot tell which is fitted. Switch the Issue list with the D6202B selected to see positions move.",
  "<b>Balanced inputs on the BNC pins.</b> ISS2 wires TB1 pin 1 to BNC1_SIG and pin 2 to BNC1_GND, the isolated shell pins. A card can use the isolated ground pin as the cold leg of a balanced input. That is how the D6202A 1×8 fits one input plus eight outputs on ten blocks.",
  "<b>The “unknown version” Gerbers are ISS1.</b> The folder <span class=\"mono\">T6203 - #GERBERS #PROBLEM  UNKNOWN VERSION</span> holds <span class=\"mono\">T6203.TOP</span> etc., plotted 14 Aug 2006 from <span class=\"mono\">H:\\OPEN GEAR\\T62XX\\T6203\\T6203.pcb</span>, the same day and tree as the ISS1 plots of T6201, T6202 and T6204.",
  "<b>The generic drawing is ISS1.</b> <span class=\"mono\">T6203 generic.pdf</span> shows AES1 at position 1 and BNC9/BNC10 at 9/10.",
  "<b>ISS1 polarity on the single-ended blocks.</b> TB9 and TB10 pin 1 (printed “+”) is the shell net BNCx_GND, pin 2 the signal, pin 3 unconnected. ISS2 puts the signal on pin 1.",
  "<b>No ISS3 netlist.</b> ISS3 Gerbers and PCB exist (Oct 2008); the netlist stops at ISS2, so this model assumes ISS3 kept the ISS2 wiring <span class=\"tag-inf\">inferred</span>.",
  "<b>Ross reused the type value.</b> DevGuide Appendix B gives Ross's “2 BNC, 8 AUD” module AN_BMID2 = 9K76 too (with AN_BMID 6K98), so the full ID stays distinct."
 ],
 "sources": [
  "T6203 - #ENGINEERING/T6203.net, T6203-iss2.net, T6203 generic.pdf, T6203 generic #ARTWORK.pdf, REAR-MODULE-T6203.pdf",
  "T6203 - #GERBERS/T6203 - #ISS3 #GERBERS/T6203-ISS3.*; T6203 - #GERBERS #PROBLEM  UNKNOWN VERSION/T6203.TOP",
  "AA6201A - #Master #OPENGEAR/AA6201A - #Engineering/AA6201A - #FUNCTIONAL/AA6201A-T6203.pdf",
  "D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-T6203.cdr, D6202B-T6203.cdr",
  "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/OpenGear Frame Address ID.xls (sheets “Rear Module ID”, “Midplane Card Addressing”)",
  "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGearDevGuideSet/openGear DevGuide Part I_rev3.pdf (MEC1 pinout, Rear Module Identification, Appendix B)",
  "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/OGP_SDK - #Engineering/ZTC-8399/zeuslib/common/adclib.c, board.c; application/ztcboard.c",
  "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/…/application/boardimp.c (getRearModuleId)"
 ],
 "family": "openGear"
};
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const ID = DATA.id, FLAG = '__' + ID + 'Active';
const inf = (why)=>`<span class="tag-inf" title="${why?('Not stated in the source; inferred from '+why):'Not stated in the source; inferred'}">inferred</span>`;
const yr = y => SIM.year(y);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');

/* ---------------- openGear standard MEC1-150 rear connector (DevGuide Part I, "Rear Module Signal Descriptions") ---------------- */
const BNC_SIG = {1:97,2:92,3:75,4:80,5:37,6:34,7:17,8:22,9:5,10:12};
const BNC_ISO = {1:[95,96,98,99,100],2:[89,90,91,93,94],9:[3,4,6,7,8],10:[9,10,11,13,14]};
const AES_PIN = {AES1:[69,67],AES2:[63,61],AES3:[57,55],AES4:[51,49],AES5:[70,68],AES6:[64,62],AES7:[58,56],AES8:[52,50]};
const GND_PINS = [15,16,18,19,20,21,23,24,31,32,33,35,36,38,39,40,47,48,53,54,59,60,65,66,71,72,73,74,76,77,78,79,81,82,87,88];
function pinName(p){
  if (p===1) return 'AN_BMID2'; if (p===2) return 'AN_BMID';
  for (const k in BNC_SIG) if (BNC_SIG[k]===p) return 'BNC'+k+'_SIG';
  for (const k in BNC_ISO) if (BNC_ISO[k].includes(p)) return 'BNC'+k+'_GND';
  for (const k in AES_PIN){ if (AES_PIN[k][0]===p) return k+'P'; if (AES_PIN[k][1]===p) return k+'N'; }
  if (GND_PINS.includes(p)) return 'GND';
  if (p===41||p===42) return 'KEY'; if (p===43||p===44) return '3.3V (active rear only)';
  return 'Reserved';
}

/* ---------------- signal types (levels from the AES-3id, AES3, SMPTE 259M/292M and RS-170A standards) ---------------- */
const SIG = {
  aes75: {short:'AES-3id 75 Ω', label:'AES-3id, 75 Ω unbalanced', kind:'aes', z:75,  voc:2.0, spec:'1.0 V p-p ±20 % into 75 Ω', minRx:0.32, unit:'Vpp', bal:false, loads:['75','open','37.5']},
  aes110:{short:'AES3 110 Ω balanced', label:'AES3, 110 Ω balanced',     kind:'aes', z:110, voc:8.0, spec:'2–7 V p-p into 110 Ω',       minRx:0.2,  unit:'Vpp', bal:true,  loads:['110','open','55']},
  sdi:   {short:'SDI 75 Ω', label:'SD/HD-SDI, 75 Ω',          kind:'sdi', z:75,  voc:1.6, spec:'800 mV p-p ±10 % into 75 Ω', minRx:0.2,  unit:'Vpp', bal:false, loads:['75','open','37.5']},
  video: {short:'analog video', label:'Analog video, 75 Ω',       kind:'video',z:75, voc:2.0, spec:'1.0 V p-p into 75 Ω',       minRx:0.5,  unit:'Vpp', bal:false, loads:['75','open','37.5']},
  ref:   {short:'reference', label:'Reference (black burst)',  kind:'video',z:75, voc:2.0, spec:'1.0 V p-p (0.3 V sync) into 75 Ω', minRx:0.5, unit:'Vpp', bal:false, loads:['75','open']},
  analog:{short:'balanced analog', label:'Balanced analog audio',    kind:'analog',z:50,voc:1.228,spec:'+4 dBu nominal, +24 dBu max', minRx:0.0, unit:'dBu', bal:true, loads:['10k','600','open']},
  meta:  {short:'metadata', label:'Metadata (serial data)',   kind:'data', z:110, voc:5.0, spec:'differential serial (format not documented)', minRx:0.2, unit:'Vpp', bal:true, loads:['110','open']},
  nc:    {short:'—', label:'not connected',            kind:'nc',  z:0, voc:0, spec:'—', unit:'', loads:['open']},
};
const LOADZ = {'75':75,'37.5':37.5,'110':110,'55':55,'600':600,'10k':10000,'open':1e9};
const CARD_RX_Z = {aes75:75, sdi:75, video:75, ref:75, aes110:110, analog:10000, meta:110};

/* ---------------- rear-module ID allocations (OpenGear Frame Address ID.xls "Rear Module ID" + DevGuide Appendix B) ---------------- */
const OPEN = 1e12;
const ALLOC = [
  ['Ross 10-BNC (8310A-030)',30900,OPEN,'Ross','ID.xls'],['Ross 100-BNC (8310A-031)',15000,OPEN,'Ross','ID.xls'],
  ['Ross 6-BNC 4-AUD (8310A-035)',9760,OPEN,'Ross','ID.xls'],['Ross 10-BNC-L (8310A-032)',6980,30900,'Ross','ID.xls'],
  ['Cobalt 19-slot 100 BNC aligned',5360,30900,'Cobalt','ID.xls'],['Cobalt 19-slot 100 BNC not aligned',4320,30900,'Cobalt','ID.xls'],
  ['Ross 8 BNC 2 AUD Full (DevGuide)',6980,3010,'Ross','DevGuide'],['Ross 6 BNC 4 AUD Full (DevGuide)',6980,4320,'Ross','DevGuide'],
  ['Ross 2 BNC 8 AUD Full (DevGuide)',6980,9760,'Ross','DevGuide'],['Ross 10 AUD Full (DevGuide)',3570,3570,'Ross','DevGuide'],
  ['Ross 10 BNC Split (DevGuide)',6980,6980,'Ross','DevGuide'],['Ross 6 BNC 4 AUD Split (DevGuide)',6980,3570,'Ross','DevGuide'],
  ['Ross 10 AUD Split (DevGuide)',3570,887,'Ross','DevGuide'],
  ['T6201',3570,30900,'WBS','ID.xls'],['T6202',3570,15000,'WBS','ID.xls'],['T6203',3570,9760,'WBS','ID.xls'],['T6204',3570,6980,'WBS','ID.xls'],
  ['T6301',3570,5360,'WBS','ID.xls'],['T6302',3570,4320,'WBS','ID.xls'],['T6303',3570,3570,'WBS','ID.xls'],['T6304',3570,3010,'WBS','ID.xls'],
  ['T6305',3570,2550,'WBS','ID.xls'],['T6306',3570,2210,'WBS','ID.xls'],['T6307',3570,1910,'WBS','ID.xls'],['T6308',3570,1650,'WBS','ID.xls'],
  ['T6401',3570,1130,'WBS','ID.xls'],['T6402',3570,1000,'WBS','ID.xls'],['T6403',3570,887,'WBS','ID.xls'],['T6406',3570,604,'WBS','ID.xls'],
];
const E96ID = [OPEN,100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681,604,523,453,392,332,280,232,187,143,102,66.5,32.4];
function rTxt(r){ if (r>=OPEN) return 'open'; if (r>=1000){ const t=String(r/1000); return t.includes('.')? t.replace('.','K') : t+'K'; } return r+'R'; }
function rFmt(r){ if (r>=OPEN) return 'open (not fitted)'; return r>=1000 ? (r/1000)+' kΩ' : r+' Ω'; }
/* card side: 1K00 pull-up to +3V3, AVR 10-bit ADC with AVcc reference (adclib.c getAdcValue: ADMUX = BIT(REFS0)|ch) */
function adcOf(R){ if (R>=OPEN) return 1023; return Math.min(1023, Math.floor(1024*R/(R+1000))); }   // ratiometric: ADC = 1024·V/AVcc
function binOf(adc){ return 32 - Math.floor((adc+16)/32); }      // getAdcBin(): MAX_BIN - (adc + ADC_ROUND)/ADC_BIN
function idOf(r1, r2){ const b1=binOf(adcOf(r1)), b2=binOf(adcOf(r2)); return {b1,b2,rm:(b2<<8)|(b1&0xFF),disp:(b2&0x0F)+'.'+(b1&0x0F)}; }
function idRange(R, tol){ // worst-case ADC codes with 1 % parts and rail 3.28–3.31 V (sheet "Midplane Card Addressing")
  if (R>=OPEN) return [1023,1023];
  const lo = R*(1-tol), hi = R*(1+tol), pl = 1000*(1+tol), ph = 1000*(1-tol);
  const a = Math.floor(1024*lo/(lo+pl)), b = Math.min(1023, Math.floor(1024*hi/(hi+ph)));
  return [a,b];
}

/* ---------------- state ---------------- */
const S = {
  issue: DATA.defaultIssue, card: DATA.cards[0].id, sel: 1, cable:{}, load:{}, srcLvl:0, padC:0.45,
  fit1:true, fit2:true, r1:null, r2:null, idReads:0, idAt:null, showRL:false, view:'rear',
  log:[], last:null, blockSel:'p101',
};
function I(){ return DATA.issues[S.issue]; }
function P(n){ return I().pos.find(p=>p.n===n); }
function cardObj(){ return DATA.cards.find(c=>c.id===S.card) || DATA.cards[0]; }
function cardsForIssue(){ return DATA.cards.filter(c=>!c.issues || c.issues.includes(S.issue)); }
function role(n){ const c=cardObj(); const r=c.roles[n]; return r? {name:r[0], dir:r[1], sig:r[2], note:r[3]||''} : {name:'—',dir:'nc',sig:'nc',note:''}; }
function R1(){ return !S.fit1 ? OPEN : (S.r1!=null? S.r1 : I().id.bmid); }
function R2(){ return !S.fit2 ? OPEN : (S.r2!=null? S.r2 : I().id.bmid2); }
function loadOf(n){ const r=role(n); const L=S.load[n]||(SIG[r.sig]||SIG.nc).loads[0]; return L; }

/* level at the connector for position n */
function level(n){
  const r=role(n), sg=SIG[r.sig]||SIG.nc, p=P(n);
  const o={sg, r, plugged:!!S.cable[n], txt:'', v:0, ok:false, rx:false};
  if (r.sig==='nc'){ o.txt = 'Card leaves this position unused.'; return o; }
  const k = Math.pow(10, S.srcLvl/20);
  if (r.dir==='in'){
    if (!o.plugged){ o.txt='No cable: the card input sees nothing (loss of signal).'; return o; }
    const zin = CARD_RX_Z[r.sig]||75, voc = sg.voc*k;
    o.v = voc*zin/(sg.z+zin); o.rx = o.v >= (sg.minRx||0);
    o.txt = `External source ${sg.z} Ω, ${fmtV(voc,sg)} open-circuit → card input ${zin>=10000?'10 kΩ bridging':zin+' Ω'} → ${fmtV(o.v,sg)} at the card`; o.ok=o.rx; return o;
  }
  const zl = o.plugged ? LOADZ[loadOf(n)] : 1e9, voc = sg.voc*k;
  o.v = voc*zl/(sg.z+zl); o.zl=zl;
  const nom = sg.voc/2; o.ok = o.plugged && Math.abs(o.v/nom-1) < 0.21;
  o.txt = `Card driver ${sg.z} Ω source, ${fmtV(voc,sg)} open-circuit → ${o.plugged? 'load '+(zl>=1e8?'open (unterminated)':zl+' Ω'):'no cable (open)'} → ${fmtV(o.v,sg)}`;
  return o;
}
function fmtV(v, sg){ if (sg.unit==='dBu') return (v>0? (20*Math.log10(v/0.7746)).toFixed(1):'−∞')+' dBu ('+v.toFixed(3)+' V rms)'; return v.toFixed(2)+' V p-p'; }

/* ---------------- network (series L or L‖R, shunt pad capacitance) and return loss ---------------- */
function parseL(s){ if(!s) return 0; const m=String(s).match(/(\d+)n(\d*)/i); return m? parseFloat(m[1]+'.'+(m[2]||0))*1e-9 : 0; }
function parseR(s){ if(!s) return 0; const m=String(s).match(/^(\d+)R/i); return m? +m[1] : 0; }
const C = { add:(a,b)=>[a[0]+b[0],a[1]+b[1]], mul:(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]], div:(a,b)=>{const d=b[0]*b[0]+b[1]*b[1]; return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];}, abs:a=>Math.hypot(a[0],a[1]) };
function s11(f, Lh, Rp, Cpad){
  const w=2*Math.PI*f, Z0=[75,0];
  let Zs = Lh? [0,w*Lh] : [0,0];
  if (Lh && Rp) Zs = C.div(C.mul(Zs,[Rp,0]), C.add(Zs,[Rp,0]));
  const Y=[0,w*Cpad];
  // ABCD: shunt C · series Zs · shunt C, load 75 Ω
  let A=[1,0],B=[0,0],Cc=Y,D=[1,0];                    // shunt
  let A2=A, B2=C.add(C.mul(A,Zs),B), C2=Cc, D2=C.add(C.mul(Cc,Zs),D); // · series
  let A3=C.add(A2,C.mul(B2,Y)), B3=B2, C3=C.add(C2,C.mul(D2,Y)), D3=D2; // · shunt
  const Zin = C.div(C.add(C.mul(A3,Z0),B3), C.add(C.mul(C3,Z0),D3));
  const g = C.div(C.add(Zin,[-75,0]), C.add(Zin,[75,0]));
  return 20*Math.log10(Math.max(1e-6,C.abs(g)));
}

/* ---------------- action log ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  S.last={name, tr, t:SIM.t}; S.log.unshift({name,t:SIM.t}); if (S.log.length>40) S.log.length=40;
  SIM.refresh();
}
function routeTrace(n, tr){
  const p=P(n), r=role(n), c=cardObj();
  if (!p){ tr('Position '+n+' is empty on this issue.'); return; }
  const pins = pinsOf(p);
  const chain = p.kind==='bnc'
    ? `${p.ref} centre pin → ${p.L? p.L+' '+p.Lv+(p.R?' ‖ '+p.R+' '+p.Rv:'') : 'direct track'} → net ${p.net} → P101-${pins.sig}`
    : p.kind==='tb' ? `${p.ref} pin1 (+) → net ${p.pair}P → P101-${pins.p} ; pin2 (−) → ${p.pair}N → P101-${pins.n} ; pin3 → GND`
    : `${p.ref} pin1 → ${p.pin1} ; pin2 → ${p.pin2} (single-ended pair on a terminal block)`;
  tr(chain);
  tr(`Card ${c.id}: P101-${pins.sig||pins.p} is “${r.name}” (${r.dir==='in'?'input':r.dir==='out'?'output':r.dir==='io'?'in/out':'unused'}, ${(SIG[r.sig]||SIG.nc).label})`);
  tr('Ground: '+gndText(p));
}
function pinsOf(p){
  if (p.kind==='bnc'){ const sig=BNC_SIG[p.bnc]; return {sig, gnd: p.gnd==='gndd'? 'GNDD plane' : 'P101-'+BNC_ISO[p.bnc].join(',')}; }
  if (p.kind==='tb'){ const a=AES_PIN[p.pair]; return {p:a[0], n:a[1]}; }
  return {sig:BNC_SIG[p.bnc], gnd:'P101-'+BNC_ISO[p.bnc].join(',')};
}
function gndText(p){
  if (p.kind==='tb') return 'pin 3 to GNDD (signal ground plane)';
  if (p.gnd==='gndd') return 'shell bonded straight to GNDD';
  if (p.gnd==='iso') return `shell on isolated net BNC${p.bnc}_GND, carried to the card on ${BNC_ISO[p.bnc].length} pins; no capacitor on the module`;
  return `shell on isolated net BNC${p.bnc}_GND, AC-coupled to ${p.capTo||'GNDD'} by ${p.caps.join(', ')} (${p.caps.length} × 0.1 µF)`;
}

/* ---------------- panel drawing ---------------- */
const PX = 100; // SVG units per inch
function panelSVG(opts){
  opts=opts||{};
  const iss=I(), W=iss.w*PX, H=iss.h*PX, M=150, card=cardObj();
  const img = S.view==='card' ? iss.img+'-card.png' : iss.img+'-rear.png';
  let s=`<svg viewBox="0 0 ${W+2*M} ${H+40}" style="width:100%;max-width:${opts.max||560}px;display:block;margin:auto" role="img" aria-label="${DATA.product} rear module drawn from ${esc(iss.art)}">
   <defs><filter id="${ID}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
   <rect x="${M-4}" y="16" width="${W+8}" height="${H+8}" rx="5" fill="#0b0c0d"/>
   <image href="${ASSET}${img}" x="${M}" y="20" width="${W}" height="${H}" preserveAspectRatio="none"/>`;
  if (S.view==='card'){
    s+=`<text x="${M+W/2}" y="12" text-anchor="middle" font-size="11" fill="var(--ink2)">card side (${iss.cardSide}) — the MEC1 edge connector P101 faces the card</text></svg>`;
    return s;
  }
  s+=`<text x="${M+W/2}" y="12" text-anchor="middle" font-size="11" fill="var(--ink2)">connector face, seen from behind the frame (${iss.face})</text>`;
  iss.pos.forEach(p=>{
    const x=M+p.x*PX, y=20+p.y*PX, r=role(p.n), sel=S.sel===p.n, plug=!!S.cable[p.n], L=level(p.n);
    const col = r.dir==='in'? 'var(--accent2)' : r.dir==='out'||r.dir==='io'? 'var(--accent)' : '#777';
    if (p.kind==='bnc'){
      s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="27" fill="transparent"/>
        <circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${sel?'#ffd34d':'#b9b9b0'}" stroke-width="${sel?4:2}"/>
        ${plug?`<circle cx="${x}" cy="${y}" r="17" fill="#2d63a6" stroke="#9cc3ff" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="#d6e6ff"/>`:''}
        ${L.v>0&&plug?`<circle cx="${x+18}" cy="${y-18}" r="5" fill="${L.ok||L.rx?'var(--led-g)':'var(--led-a)'}" filter="url(#${ID}glow)"/><circle cx="${x+18}" cy="${y-18}" r="4" fill="${L.ok||L.rx?'var(--led-g)':'var(--led-a)'}"/>`:''}</g>`;
    } else {
      const hh=p.pitch*PX*3+10;
      s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><rect x="${x-17}" y="${y-hh/2}" width="34" height="${hh}" rx="3" fill="${plug?'#1f8a45':'transparent'}" fill-opacity="${plug?0.85:0}" stroke="${sel?'#ffd34d':'#b9b9b0'}" stroke-width="${sel?4:1.5}"/>
        ${plug?[-1,0,1].map(d=>`<circle cx="${x}" cy="${y+d*p.pitch*PX}" r="5" fill="#0d3a1c"/>`).join(''):''}
        ${L.v>0&&plug?`<circle cx="${x+20}" cy="${y-hh/2}" r="5" fill="${L.ok||L.rx?'var(--led-g)':'var(--led-a)'}"/>`:''}</g>`;
    }
    const left = p.x < iss.w/2, tx = left? M-10 : M+W+10;
    s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><text x="${tx}" y="${y-3}" text-anchor="${left?'end':'start'}" font-size="13" font-weight="700" fill="${sel?'var(--warn)':'var(--ink)'}">${p.n} · ${esc(r.name)}</text>
      <text x="${tx}" y="${y+12}" text-anchor="${left?'end':'start'}" font-size="10" fill="${col}">${r.dir==='nc'?'—':(r.dir==='in'?'◀ in':'out ▶')} ${esc((SIG[r.sig]||SIG.nc).short)}</text>
      <text x="${tx}" y="${y+24}" text-anchor="${left?'end':'start'}" font-size="9.5" fill="var(--ink2)">${p.kind==='bnc'?p.ref+(p.L?' · '+p.L+(p.R?'‖'+p.R:''):''):p.ref+' · '+(p.pair||p.net)}</text></g>`;
  });
  s+=`<text x="${M+W/2}" y="${H+36}" text-anchor="middle" font-size="10" fill="var(--ink2)">${iss.w.toFixed(3)}″ × ${iss.h.toFixed(3)}″ at 1:1 scale</text></svg><div class="small muted" style="text-align:center">Artwork: ${esc(iss.art)}</div>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.pos').forEach(g=>{
    g.addEventListener('click', ()=>A.select(+g.dataset.n));
    g.addEventListener('dblclick', e=>{ e.preventDefault(); A.plug(+g.dataset.n); });
  });
}
const A = {
  select(n){ act('Select position '+n, tr=>{ S.sel=n; routeTrace(n,tr); }); },
  plug(n){ act((S.cable[n]?'Unplug':'Plug')+' cable at position '+n, tr=>{ S.cable[n]=!S.cable[n]; S.sel=n; routeTrace(n,tr); const L=level(n); tr(L.txt); }); },
  setLoad(n,v){ act('Set far-end load on '+n+' to '+v, tr=>{ S.load[n]=v; const L=level(n); tr(L.txt); if (v==='open' && L.sg.unit==='Vpp') tr('Unterminated: the line is not loaded, so the voltage doubles. A long cable will also reflect the signal back to the card.'); }); },
  setCard(id){ act('Mate with card '+id, tr=>{ S.card=id; const c=cardObj(); tr('Card '+c.id+': '+c.label); tr('Source: '+c.src); }); },
  setIssue(k){ act('Switch to '+DATA.issues[k].label, tr=>{ S.issue=k; S.r1=S.r2=null; const iss=I(); tr('Netlist '+iss.netlist+' · artwork '+iss.art); tr('ID: AN_BMID '+rFmt(iss.id.bmid)+', AN_BMID2 '+rFmt(iss.id.bmid2)); if (!cardsForIssue().find(c=>c.id===S.card)) S.card=cardsForIssue()[0].id; }); },
  readId(){ act('Card reads the rear-module ID', tr=>{
    S.idReads++; S.idAt=SIM.t;
    const r1=R1(), r2=R2(), a1=adcOf(r1), a2=adcOf(r2), b1=binOf(a1), b2=binOf(a2);
    tr(`getRearModuleId() → getRearModuleType() → getAdcBin(ADC_BMTYPE=1)`);
    tr(`getAdcValue(1): ADMUX = BIT(REFS0)|1 = 0x41 · ADCSRA = BIT(ADEN)|ADPS2..0 = 0x87 · ADCSRA |= BIT(ADSC) · spin while ADSC`);
    tr(`AN_BMID: ${rFmt(r1)} with the card's 1K00 pull-up to 3V3 → ${(3.3*(r1>=OPEN?1:r1/(r1+1000))).toFixed(3)} V → ADC = ${a1} → 32 − (${a1}+16)/32 = bin ${b1}`);
    tr(`getOptionCardType() → getAdcBin(ADC_DAUGHTER=4): AN_BMID2 ${rFmt(r2)} → ADC = ${a2} → bin ${b2}`);
    tr(`rmId = (${b2} << 8) | ${b1} = 0x${((b2<<8)|b1).toString(16).padStart(4,'0')} · getRearModuleName() prints "%d.%d " with & 0x0F → “${(b2&15)+'.'+(b1&15)}”`);
    const m=ALLOC.filter(a=>idOf(a[1],a[2]).rm===((b2<<8)|b1)).map(a=>a[0]);
    tr(m.length? 'Allocation table match: '+m.join(', ') : (b1===0&&b2===0? 'Both open: the card reports no rear module.' : 'No entry in the allocation table has this code.'));
  }); },
  fit(which,v){ act((v?'Fit ':'Remove ')+(which===1?'AN_BMID (R1)':'AN_BMID2 (R2)'), tr=>{ if(which===1) S.fit1=v; else S.fit2=v; tr('New ID read on the next getRearModuleId() call: '+idOf(R1(),R2()).disp); }); },
  setR(which,v){ act('Change '+(which===1?'AN_BMID':'AN_BMID2')+' to '+rFmt(v), tr=>{ if(which===1){S.r1=v;S.fit1=v<OPEN;} else {S.r2=v;S.fit2=v<OPEN;} const d=idOf(R1(),R2()); tr('Code '+d.disp+' (rmId 0x'+d.rm.toString(16).padStart(4,'0')+')'); }); },
  reset(){ act('Reset the bench', tr=>{ Object.assign(S,{issue:DATA.defaultIssue,card:DATA.cards[0].id,sel:1,cable:{},load:{},srcLvl:0,fit1:true,fit2:true,r1:null,r2:null,idReads:0,idAt:null,showRL:false,view:'rear'}); tr('Default issue, first card, no cables.'); }); },
};
document.addEventListener('keydown', e=>{
  if (!window[FLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (/^[0-9]$/.test(k)){ const n = k==='0'?10:+k; if (P(n)) A.select(n); e.preventDefault(); }
  else if (k==='p'){ A.plug(S.sel); e.preventDefault(); }
  else if (k==='r'){ A.readId(); e.preventDefault(); }
});

/* ---------------- timing lanes for the selected position ---------------- */
const FS=48000, FIELD=1001/60000, HLINE=FIELD/262.5;
const ADC_FIRST = 25/125000, ADC_NEXT = 13/125000;   // AVR ADC: clock F_CPU/128 (ADPS2..0) — F_CPU 16 MHz inferred
function lanes(){
  const n=S.sel, r=role(n), sg=SIG[r.sig]||SIG.nc, L=level(n), css=SIM.css;
  const ls=[];
  const t0id = S.idAt!=null? S.idAt : 0;
  ls.push({label:'Card reads ID: ADC1 AN_BMID, ADC4 AN_BMID2', h:26, draw(c,X,a,b,y,h){
    const segs=[[t0id,ADC_FIRST,'ADC1'],[t0id+ADC_FIRST+20e-6,ADC_NEXT,'ADC4']];
    segs.forEach(([t,d,l])=>{ c.fillStyle=css('--warn'); c.fillRect(X(t),y+4,Math.max(2,X(t+d)-X(t)),h-8); c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); if (X(t+d)-X(t)>30) c.fillText(l,X(t)+3,y+h/2+4); });
    c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText(S.idAt!=null?'read when you pressed “Card reads ID”':'read at card power-up (t = 0)', X(t0id)+Math.max(8,X(t0id+0.0004)-X(t0id)), y+h/2+4);
  }});
  ls.push({label:'Cable at position '+n, h:22, draw(c,X,a,b,y,h){ c.fillStyle=S.cable[n]?css('--accent2'):css('--grid'); c.fillRect(X(a),y+6,X(b)-X(a),h-12); c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(S.cable[n]?'plugged — '+L.txt.slice(0,90):'no cable', X(a)+6, y+h/2+4); }});
  if (sg.kind==='aes'){
    ls.push({label:'AES block (192 frames, Z preamble)', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,192/FS,0,1/FS,css('--warn'),'blocks'); }});
    ls.push({label:'AES frame = 1 sample pair (48 kHz)', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,1/FS,0,0.5/FS,css('--accent'),'frames'); }});
    ls.push({label:'Bit cells (128 per frame, 6.144 MHz)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,1/(128*FS),0,0.5/(128*FS),css('--accent2'),'cells'); }});
  } else if (sg.kind==='video'||sg.kind==='sdi'){
    ls.push({label:'Video fields (59.94 Hz)', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,FIELD,0,9*HLINE,css('--warn'),'fields'); }});
    ls.push({label:'Lines (63.56 µs) · H sync 4.7 µs', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,HLINE,0,4.7e-6,css('--accent'),'lines'); }});
    if (sg.kind==='sdi') ls.push({label:'SD-SDI 10-bit words (27 MHz)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,1/27e6,0,0.5/27e6,css('--accent2'),'words'); }});
  } else if (sg.kind==='analog'){
    ls.push({label:'1 kHz test tone at the terminals', h:44, draw(c,X,a,b,y,h){ const span=b-a, pw=X(b)-X(a); c.strokeStyle=css('--accent'); if (span*1000>pw/3){ c.globalAlpha=.3; c.fillStyle=css('--accent'); c.fillRect(X(a),y+6,pw,h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText((span*1000).toFixed(0)+' cycles (zoom in to see the wave)',X(a)+6,y+h/2+4); return; } c.beginPath(); for(let i=0;i<=400;i++){ const t=a+span*i/400, v=Math.sin(2*Math.PI*1000*t); const yy=y+h/2-v*(h/2-4); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }});
  } else if (sg.kind==='data'){
    ls.push({label:'Metadata bursts (format not documented)', h:24, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,FIELD,0,2e-3,css('--accent'),'bursts'); }});
  }
  ls.push({label:'Transit through the module', h:22, draw(c,X,a,b,y,h){ c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText(`≈ ${transit().toFixed(0)} ps from connector to P101 (${inf().replace(/<[^>]+>/g,'')}: ~2″ of track at ~170 ps/inch) — far below one bit cell`, X(a)+6, y+h/2+4); }});
  return ls;
}
function transit(){ const p=P(S.sel); if(!p) return 0; return (Math.abs(p.y-1.7)+0.6)*170; }

/* ---------------- scope at the playhead ---------------- */
function drawScope(cv, t){
  const {c,w,h}=SIM.canvas(cv,170); const n=S.sel, r=role(n), sg=SIG[r.sig]||SIG.nc, L=level(n);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), grid=SIM.css('--grid');
  c.strokeStyle=grid; for(let i=0;i<=10;i++){ c.beginPath(); c.moveTo(10+i*(w-20)/10,10); c.lineTo(10+i*(w-20)/10,140); c.stroke(); }
  c.beginPath(); c.moveTo(10,75); c.lineTo(w-10,75); c.stroke();
  const vpp = L.v||0, live = r.dir==='in'? S.cable[n] : r.sig!=='nc';
  c.font='11px '+SIM.css('--mono'); c.fillStyle=ink;
  if (!live || sg.kind==='nc'){ c.fillText(sg.kind==='nc'?'Position unused by this card.':'No signal (input has no cable).',16,80); return; }
  const scale = 60/Math.max(1, sg.unit==='dBu'? 1.228*1.4142*2 : Math.max(2, sg.voc)); // px per volt
  const trace=(f,col,off)=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=600;i++){ const x=10+i*(w-20)/600; const v=f(i/600); const y=75+(off||0)-v*scale; i?c.lineTo(x,y):c.moveTo(x,y);} c.stroke(); };
  let label='';
  if (sg.kind==='aes'){
    const frame=Math.floor(t*FS), cells=[]; const pre=(frame%192===0)?[1,1,1,0,1,0,0,0]:[1,1,1,0,0,0,1,0];
    let lv=0; pre.forEach(b=>cells.push(b));
    let seed=frame*2654435761>>>0; lv=pre[7];
    for(let i=0;i<28;i++){ seed=(seed*1103515245+12345)>>>0; const bit=(seed>>16)&1; lv^=1; cells.push(lv); if(bit) lv^=1; cells.push(lv); }
    while(cells.length<64) cells.push(lv);
    const amp=vpp/2;
    if (sg.bal){ trace(u=>cells[Math.min(63,Math.floor(u*64))]?amp/2:-amp/2,acc,-20); trace(u=>cells[Math.min(63,Math.floor(u*64))]?-amp/2:amp/2,a2,20); label='+ leg (green) and − leg (blue), each half the differential swing'; }
    else trace(u=>cells[Math.min(63,Math.floor(u*64))]?amp:-amp,acc);
    label=`one subframe (${frame%192===0?'Z':'X'} preamble), 32 bits × 2 cells, cell = 81.4 ns · ${fmtV(vpp,sg)} ${label}`;
  } else if (sg.kind==='video'){
    const k=vpp/1.0; const ph=(t%HLINE)/HLINE;
    trace(u=>{ const us=u*63.556; if(us<4.7) return -0.3*k; if(us<5.3) return 0; if(us<7.9) return 0.2*k*Math.sin(2*Math.PI*3.579545*us)*(r.sig==='ref'?1:1); if(us<10.9) return 0; return r.sig==='ref'? 0 : 0.7*k*Math.min(1,(us-10.9)/50); }, acc, 20);
    label=`one line (63.56 µs) at line ${Math.floor(t/HLINE)%525}: sync −${(0.3*k).toFixed(2)} V · ${r.sig==='ref'?'black burst':'ramp'} · ${fmtV(vpp,sg)}`;
  } else if (sg.kind==='sdi'){
    let seed=Math.floor(t*27e6)>>>0; const bits=[]; let lv=0; for(let i=0;i<40;i++){ seed=(seed*1103515245+12345)>>>0; if((seed>>17)&1) lv^=1; bits.push(lv); }
    trace(u=>bits[Math.min(39,Math.floor(u*40))]?vpp/2:-vpp/2, acc);
    label=`40 bits of scrambled NRZI (270 Mb/s → 3.7 ns per bit) · ${fmtV(vpp,sg)}`;
  } else if (sg.kind==='analog'){
    const pk=vpp*1.4142;
    trace(u=>pk/2*Math.sin(2*Math.PI*(t*1000+u*2)),acc,-15); trace(u=>-pk/2*Math.sin(2*Math.PI*(t*1000+u*2)),a2,15);
    label=`2 ms of a 1 kHz tone · + leg green, − leg blue · ${fmtV(vpp,sg)} differential`;
  } else { trace(u=>((Math.floor(u*24)%3)?1:-1)*vpp/2,acc); label='serial data (format not documented in the archive)'; }
  c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText(label,10,160);
}

/* ---------------- return loss chart ---------------- */
function drawRL(cv){
  const {c,w,h}=SIM.canvas(cv,210); const p=P(S.sel); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), grid=SIM.css('--grid');
  const x0=46, x1=w-10, y0=12, y1=180, f0=5e6, f1=3e9, X=f=>x0+(Math.log10(f/f0)/Math.log10(f1/f0))*(x1-x0), Y=db=>y0+(-db/40)*(y1-y0);
  c.strokeStyle=grid; c.fillStyle=ink2; c.font='10px '+SIM.css('--mono');
  [1e7,1e8,1e9].forEach(f=>{ c.beginPath(); c.moveTo(X(f),y0); c.lineTo(X(f),y1); c.stroke(); c.fillText(f>=1e9?f/1e9+' GHz':f/1e6+' MHz',X(f)+2,y1+12); });
  [0,10,20,30,40].forEach(d=>{ c.beginPath(); c.moveTo(x0,Y(-d)); c.lineTo(x1,Y(-d)); c.stroke(); c.fillText('−'+d+' dB',2,Y(-d)+4); });
  // SMPTE masks: 292M 15 dB 5 MHz–1.485 GHz; 424M 10 dB 1.485–2.97 GHz
  c.strokeStyle=SIM.css('--bad'); c.setLineDash([5,4]); c.beginPath(); c.moveTo(X(5e6),Y(-15)); c.lineTo(X(1.485e9),Y(-15)); c.lineTo(X(1.485e9),Y(-10)); c.lineTo(X(2.97e9),Y(-10)); c.stroke(); c.setLineDash([]);
  if (!p || p.kind!=='bnc'){ c.fillStyle=ink; c.font='12px '+SIM.css('--sans'); c.fillText('Return loss applies to the 75 Ω BNC positions. Select a BNC.', x0+10, 100); return; }
  const curves=[['as built: '+(p.L?p.L+' '+p.Lv+(p.R?' ‖ '+p.R+' '+p.Rv:''):'direct'), parseL(p.Lv), parseR(p.Rv), SIM.css('--accent')],['no series part (straight track)',0,0,SIM.css('--ink2')]];
  if (p.L && !p.R) curves.push(['same L with 75 Ω across it (ISS4 style)', parseL(p.Lv), 75, SIM.css('--accent2')]);
  if (p.L && p.R) curves.push(['L alone (resistor not fitted)', parseL(p.Lv), 0, SIM.css('--accent2')]);
  curves.forEach(([lab,Lh,Rp,col],k)=>{ c.strokeStyle=col; c.lineWidth=k?1.3:2.2; c.beginPath(); for(let i=0;i<=300;i++){ const f=f0*Math.pow(f1/f0,i/300); const d=Math.max(-40,s11(f,Lh,Rp,S.padC*1e-12)); i?c.lineTo(X(f),Y(d)):c.moveTo(X(f),Y(d)); } c.stroke(); });
  c.lineWidth=1; c.font='11px '+SIM.css('--sans');
  curves.forEach(([lab,,,col],k)=>{ c.fillStyle=col; c.fillText('■ '+lab, x0+8+k*Math.min(250,(w-60)/3), 205); });
}

/* ---------------- shared bits of UI ---------------- */
function card(title, body, extra){ return `<div class="card" ${extra||''}><h2>${title}</h2>${body}</div>`; }
function controlsHTML(){
  const iss=I(), ks=Object.keys(DATA.issues);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin:6px 0">
    <label class="small">Mating card <select data-c="card">${cardsForIssue().map(c=>`<option value="${c.id}" ${c.id===S.card?'selected':''}>${esc(c.id)} — ${esc(c.short||c.label)}</option>`).join('')}</select></label>
    ${ks.length>1?`<label class="small">Issue <select data-c="issue">${ks.map(k=>`<option value="${k}" ${k===S.issue?'selected':''}>${esc(DATA.issues[k].label)}</option>`).join('')}</select></label>`:''}
    <label class="small">View <select data-c="view"><option value="rear" ${S.view==='rear'?'selected':''}>connector face</option><option value="card" ${S.view==='card'?'selected':''}>card side (P101)</option></select></label>
    <button data-c="plug">Plug / unplug selected (P)</button><button data-c="id">Card reads ID (R)</button><button data-c="reset">Reset</button></div>
    <div class="small muted">Click a connector to select it; double-click it (or press P) to plug a cable in. Keys 1–9, 0 select positions.</div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{
    const k=el.dataset.c;
    if (el.tagName==='SELECT') el.onchange=()=>{ if(k==='card') A.setCard(el.value); if(k==='issue') A.setIssue(el.value); if(k==='view'){ S.view=el.value; SIM.refresh(); } };
    else el.onclick=()=>{ if(k==='plug') A.plug(S.sel); if(k==='id') A.readId(); if(k==='reset') A.reset(); };
  });
}
function selHTML(){
  const n=S.sel, p=P(n), r=role(n), L=level(n), sg=SIG[r.sig]||SIG.nc;
  if (!p) return '<div class="muted">Nothing at this position.</div>';
  const pins=pinsOf(p);
  const loads=(sg.loads||[]).map(v=>`<option ${loadOf(n)===v?'selected':''}>${v}</option>`).join('');
  return `<table class="kv">
   <tr><th>Position</th><td><b>${n}</b> · ${p.kind==='bnc'?'BNC ('+p.ref+')':'3-pin Phoenix terminal block ('+p.ref+')'}${p.kind!=='bnc'?' · pins top→bottom '+p.order.join(' '):''}</td></tr>
   <tr><th>Card role</th><td>${esc(r.name)} · ${r.dir==='in'?'input to the card':r.dir==='nc'?'unused':'output from the card'} · ${sg.label} ${r.note?'· '+r.note:''}</td></tr>
   <tr><th>Route</th><td class="mono small">${p.kind==='bnc'? `${p.ref}-3 → ${p.L?p.L+' '+p.Lv+(p.R?' ‖ '+p.R+' '+p.Rv:''):'(no part)'} → ${p.net} → P101-${pins.sig}`
      : p.kind==='tb' ? `${p.ref}-1 (+) → ${p.pair}P → P101-${pins.p}<br>${p.ref}-2 (−) → ${p.pair}N → P101-${pins.n}<br>${p.ref}-3 (G) → GNDD`
      : `${p.ref}-1 → ${p.pin1}<br>${p.ref}-2 → ${p.pin2}<br>${p.ref}-3 → ${p.pin3||'not connected'}`}</td></tr>
   <tr><th>Ground</th><td class="small">${gndText(p)}${p.kind==='bnc'&&p.gnd==='iso-ac'?` · X<sub>C</sub> ${(1/(2*Math.PI*60*p.caps.length*1e-7)/1000).toFixed(1)} kΩ at 60 Hz, ${(1/(2*Math.PI*6.144e6*p.caps.length*1e-7)).toFixed(2)} Ω at 6.144 MHz`:''}</td></tr>
   <tr><th>Level</th><td>${L.txt} ${L.v>0?(L.ok||L.rx?'<b style="color:var(--accent)">in spec</b>':'<b style="color:var(--warn)">out of spec ('+sg.spec+')</b>'):''}</td></tr>
   ${r.dir!=='in'&&r.sig!=='nc'?`<tr><th>Far-end load</th><td><select data-load="${n}">${loads}</select> ${sg.unit==='dBu'?'· generator <input type="range" data-lvl min="-20" max="20" value="'+S.srcLvl+'"> '+(S.srcLvl>=0?'+':'')+S.srcLvl+' dB':''}</td></tr>`:''}
  </table>`;
}
function bindSel(m){
  const s=m.querySelector('[data-load]'); if (s) s.onchange=()=>A.setLoad(+s.dataset.load, s.value);
  const l=m.querySelector('[data-lvl]'); if (l) l.oninput=()=>{ S.srcLvl=+l.value; SIM.refresh(); };
}
function traceHTML(){ return S.last? `<div><b>${esc(S.last.name)}</b> at ${SIM.fmtT(S.last.t)}</div>`+S.last.tr.map(x=>`<div>→ ${esc(x)}</div>`).join('') : '<div class="muted">Click a connector. Each step from the outside world to the card pin is listed here.</div>'; }
function idHTML(){
  const r1=R1(), r2=R2(), d=idOf(r1,r2), [a1lo,a1hi]=idRange(r1,0.01), [a2lo,a2hi]=idRange(r2,0.01);
  const same=ALLOC.filter(a=>idOf(a[1],a[2]).rm===d.rm), alias=ALLOC.filter(a=>idOf(a[1],a[2]).disp===d.disp && idOf(a[1],a[2]).rm!==d.rm);
  const opt=(cur)=>E96ID.map(v=>`<option value="${v}" ${v===cur?'selected':''}>${rFmt(v)}</option>`).join('');
  return `<table class="kv">
   <tr><th>R1 · AN_BMID (P101-2 → ADC1)</th><td><select data-r="1">${opt(r1)}</select> → ADC ${adcOf(r1)} (worst case ${a1lo}–${a1hi}) → bin <b>${d.b1}</b></td></tr>
   <tr><th>R2 · AN_BMID2 (P101-1 → ADC4)</th><td><select data-r="2">${opt(r2)}</select> → ADC ${adcOf(r2)} (worst case ${a2lo}–${a2hi}) → bin <b>${d.b2}</b></td></tr>
   <tr><th>rmId / DashBoard text</th><td class="mono">0x${d.rm.toString(16).padStart(4,'0')} · “${d.disp} ${same.map(a=>a[0]).join(' / ')||'Unsupported'}”</td></tr>
   <tr><th>Same full code</th><td>${same.length? same.map(a=>`<span class="chip" style="${a[0].startsWith(DATA.product)?'':'border-color:var(--bad)'}">${esc(a[0])} (${a[4]})</span>`).join('') : '<span class="muted">none</span>'}</td></tr>
   <tr><th>Same printed “r2.r1”</th><td>${alias.length? alias.map(a=>`<span class="chip" style="border-color:var(--warn)">${esc(a[0])}</span>`).join('')+' <span class="small muted">(the name string masks each bin with 0x0F)</span>' : '<span class="muted">none</span>'}</td></tr>
   <tr><th>Design value (${esc(I().label)})</th><td>AN_BMID ${rFmt(I().id.bmid)}, AN_BMID2 ${rFmt(I().id.bmid2)} · allocated ${rFmt(DATA.alloc.bmid)} / ${rFmt(DATA.alloc.bmid2)} ${I().id.note?'· '+I().id.note:''}</td></tr></table>`;
}
function bindId(m){ m.querySelectorAll('[data-r]').forEach(s=> s.onchange=()=>A.setR(+s.dataset.r, +s.value)); }

/* ---------------- views ---------------- */
function viewSim(m){
  window[FLAG]=true;
  m.innerHTML = `<div class="grid2"><div>
     ${card(DATA.product+' — '+DATA.what, `${controlsHTML()}<div id="pn"></div>`)}
   </div><div>
     ${card('Selected position', `<div id="sel"></div>`)}
     ${card('What happened (last action)', `<div id="tr" class="log"></div>`)}
     ${card('Rear-module ID the card reads', `<div id="idb"></div>`)}
   </div></div>
   ${card('Timeline — one second through position <span id="tln"></span> (zoom with the transport)', `<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Scope at the connector, at the playhead', `<canvas id="sc"></canvas>`)}
     ${card('Return loss at the selected BNC', `<canvas id="rl"></canvas><label class="small">Pad + connector capacitance per side <input type="range" id="pc" min="0.1" max="1.5" step="0.05" value="${S.padC}"> <span id="pcv"></span> pF</label> <span class="small">${inf('typical BNC and 0.093″ PCB pad values; the archive has no capacitance figures')}</span><p class="small muted">Model: shunt C at the BNC, the series part, shunt C at P101, 75 Ω card. Dashed red: SMPTE 292M (15 dB to 1.485 GHz) and 424M (10 dB to 2.97 GHz) return-loss limits.</p>`)}</div>`;
  bindControls(m);
  m.querySelector('#pc').oninput=e=>{ S.padC=+e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>{
    m.querySelector('#pn').innerHTML=panelSVG(); bindPanel(m.querySelector('#pn'));
    m.querySelector('#sel').innerHTML=selHTML(); bindSel(m);
    m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#idb').innerHTML=idHTML(); bindId(m);
    m.querySelector('#tln').textContent=S.sel;
    m.querySelector('#pcv').textContent=S.padC.toFixed(2);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawScope(m.querySelector('#sc'), SIM.t);
    drawRL(m.querySelector('#rl'));
  });
}

let lesson=0;
function tutSteps(){
  const tc=DATA.tutorial.card, c=DATA.cards.find(x=>x.id===tc)||DATA.cards[0];
  const ins=Object.keys(c.roles).filter(k=>c.roles[k][1]==='in').map(Number), outs=Object.keys(c.roles).filter(k=>/out|io/.test(c.roles[k][1])).map(Number);
  const inN=ins[0]||1, outN=outs[0]||2, outName=(c.roles[outN]||['?'])[0], inName=(c.roles[inN]||['?'])[0];
  const ks=Object.keys(DATA.issues);
  const st=[
    {t:'Meet the '+DATA.product, b:`<p>${DATA.intro}</p><p>A rear module is passive: no chips, no code. It carries connectors, a few series parts and two <b>ID resistors</b>. All the work is done by the front card that plugs into it through the 100-pin MEC1 edge connector <span class="mono">P101</span>.</p><p class="muted">The panel on the right is drawn from the ${esc(I().art)} Gerbers at 1:1 scale.</p>`, ok:()=>true, auto:true},
    {t:'1 · Choose the card', b:`<p>The same module can sit behind several cards. Each card gives each position its own job. Pick <b>${esc(c.id)}</b> (${esc(c.short||c.label)}) from the <b>Mating card</b> list.</p>`, ok:()=>S.card===c.id, hint:'Use the “Mating card” list above the panel.'},
    {t:'2 · Find the input', b:`<p>On ${esc(c.id)} the input is position <b>${inN}</b> (“${esc(inName)}”). Click it. The table shows the route from the connector to the card pin, and how the shield is grounded.</p>`, ok:()=>S.sel===inN, hint:`Click connector ${inN} or press ${inN%10}.`},
    {t:'3 · Plug in a source', b:`<p>Double-click position ${inN} (or press <b>P</b>) to plug a cable in. A green dot means the card sees a signal in spec. Scrub the timeline to watch the signal's structure go by.</p>`, ok:()=>!!S.cable[inN], hint:'Press P with the input selected.'},
    {t:'4 · Feed an output', b:`<p>Select output position <b>${outN}</b> (“${esc(outName)}”) and plug a cable into it. The far end is terminated correctly by default, so the level is the nominal one.</p>`, ok:()=>!!S.cable[outN], hint:`Select ${outN} and press P.`},
    {t:'5 · Forget the terminator', b:`<p>Set the far-end load of position ${outN} to <b>open</b>. The output voltage doubles: the card's source impedance and the load no longer form a divider. On a long cable the signal would also reflect back.</p>`, ok:()=>loadOf(outN)==='open'&&!!S.cable[outN], hint:'Use the “Far-end load” list in the Selected position card.'},
    {t:'6 · Let the card read the ID', b:`<p>Press <b>Card reads ID</b> (or R). The card's AT90CAN128 converts the voltage on AN_BMID (ADC1) and AN_BMID2 (ADC4), turns each into one of 32 bins and shows “r2.r1” in DashBoard. This module should read <b>${idOf(I().id.bmid,I().id.bmid2).disp}</b>.</p>`, ok:()=>S.idReads>0, hint:'Press R.'},
    {t:'7 · Pull the type resistor', b:`<p>Set <b>AN_BMID2</b> to <b>open</b> (as if R2 were not fitted). Every WBS module uses AN_BMID = 3K57, so with AN_BMID2 gone the card can no longer tell which WBS module it is. Watch “Same full code” and “Same printed r2.r1”.</p>`, ok:()=>R2()>=OPEN, hint:'Pick “open (not fitted)” in the R2 list.'},
  ];
  if (ks.length>1) st.push({t:'8 · Compare issues', b:`<p>Put R2 back, then switch the <b>Issue</b> list. ${DATA.tutorial.issueHint||'The netlists changed between issues; check which positions moved.'}</p>`, ok:()=>S.issue!==DATA.defaultIssue, hint:'Use the Issue list.'});
  else st.push({t:'8 · Look at the series parts', b:`<p>Put R2 back and select a BNC. The <b>Return loss</b> chart shows what the small series inductor does at SDI frequencies. Move the pad-capacitance slider.</p>`, ok:()=>S.padC!==0.45, hint:'Move the slider under the Return loss chart on the Simulator tab, or here.'});
  st.push({t:'Done', b:`<p>You have used every part of the ${DATA.product}. The <b>Schematics</b> tab lists every net, <b>Block diagram</b> explains the parts and <b>Findings</b> lists what the files disagree on.</p>`, ok:()=>true, auto:true});
  return st;
}
function viewTut(m){
  window[FLAG]=true;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — fitting and checking a '+DATA.product, `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="ln"></div></div>
   <div>${card('The module', `${controlsHTML()}<div id="pn"></div><div id="sel" style="margin-top:6px"></div>`)}${card('Rear-module ID', `<div id="idb"></div><label class="small">Pad capacitance <input type="range" id="pc" min="0.1" max="1.5" step="0.05" value="${S.padC}"></label>`)}</div></div>`;
  bindControls(m); m.querySelector('#pc').oninput=e=>{ S.padC=+e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>{
    const st=tutSteps(); lesson=Math.min(lesson,st.length-1);
    m.querySelector('#pn').innerHTML=panelSVG({max:440}); bindPanel(m.querySelector('#pn'));
    m.querySelector('#sel').innerHTML=selHTML(); bindSel(m);
    m.querySelector('#idb').innerHTML=idHTML(); bindId(m);
    m.querySelector('#ls').innerHTML=st.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.t}${l.ok()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=st[lesson], ok=L.ok();
    m.querySelector('#ln').innerHTML=`<h2>${L.t}</h2>${L.b}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<st.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson--; SIM.refresh(); }; m.querySelector('#nx').onclick=()=>{ lesson++; SIM.refresh(); }; m.querySelector('#rs').onclick=()=>{ A.reset(); lesson=0; };
  });
}

function viewSecond(m){
  window[FLAG]=false;
  m.innerHTML=`${card('One second through the module, from slow to fast', `<div id="lad"></div>`)}
   <div class="grid2">${card('Timeline (all signals on this module, click to seek)', `<label class="small">Position <select id="ps">${I().pos.map(p=>`<option value="${p.n}" ${p.n===S.sel?'selected':''}>${p.n} · ${esc(role(p.n).name)}</option>`).join('')}</select></label><canvas id="tl"></canvas>`)}
   ${card('What the card and the cable see at the playhead', `<div id="now"></div><canvas id="sc"></canvas>`)}</div>`;
  m.querySelector('#ps').onchange=e=>{ S.sel=+e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>{
    const r=role(S.sel), sg=SIG[r.sig]||SIG.nc, t=SIM.t;
    const rows=[['1 s','the simulated second',1],['16.7 ms','one video field (59.94 Hz)',FIELD],['4 ms','one AES block of 192 frames at 48 kHz',0.004],['1 ms','one cycle of a 1 kHz tone',1e-3],['200 µs','first ADC conversion of AN_BMID (25 ADC clocks at 125 kHz)',ADC_FIRST],['63.6 µs','one video line',HLINE],['20.8 µs','one AES frame (one sample pair)',1/FS],['163 ns','one AES bit (2 cells)',1/(64*FS)],['37 ns','one SD-SDI 10-bit word (27 MHz)',1/27e6],['3.7 ns','one SD-SDI bit (270 Mb/s)',1/270e6],['0.67 ns','one HD-SDI bit (1.485 Gb/s)',1/1.485e9],[transit().toFixed(0)+' ps','transit from connector to P101 ('+inf().replace(/<[^>]+>/g,'')+')',transit()*1e-12]];
    m.querySelector('#lad').innerHTML=`<svg viewBox="0 0 900 ${rows.length*24+10}" style="width:100%">${rows.map((rw,i)=>{ const w=Math.max(2,(Math.log10(rw[2])+12)/12*380); return `<rect x="250" y="${6+i*24}" width="${w}" height="16" rx="3" fill="${i===rows.length-1?'var(--warn)':'var(--accent)'}" opacity=".75"/><text x="240" y="${18+i*24}" text-anchor="end" font-size="12" font-family="var(--mono)" fill="var(--ink)">${rw[0]}</text><text x="${258+w}" y="${18+i*24}" font-size="11.5" fill="var(--ink2)">${rw[1]}</text>`; }).join('')}</svg><p class="small muted">Log scale. The module adds nothing in time: every structure the card produces, from the 4 ms AES block down to the 0.67 ns HD-SDI bit, crosses it unchanged. What it can change is level (termination, loading) and, at gigahertz, return loss.</p>`;
    const frame=Math.floor(t*FS);
    m.querySelector('#now').innerHTML=`<table class="kv"><tr><th>Position</th><td>${S.sel} · ${esc(r.name)} · ${sg.label}</td></tr>
      <tr><th>AES</th><td class="mono">frame ${frame.toLocaleString()} · block ${Math.floor(frame/192)} · frame ${frame%192}/191</td></tr>
      <tr><th>Video</th><td class="mono">field ${Math.floor(t/FIELD)} · line ${Math.floor((t%FIELD)/HLINE)+1} · ${((t%HLINE)*1e6).toFixed(2)} µs into the line</td></tr>
      <tr><th>ID read</th><td class="mono">${S.idAt!=null||t<0.001? (t<(S.idAt||0)+ADC_FIRST+ADC_NEXT+30e-6 && t>=(S.idAt||0)? 'converting now' : 'done: '+idOf(R1(),R2()).disp) : 'done at power-up: '+idOf(R1(),R2()).disp}</td></tr></table>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#sc'), t);
  });
}

const BLOCKS = {
  card:{t:'Front card', d:()=>`The card (${esc(cardObj().id)}) does all the processing. Its rear edge carries the mating half of MEC1. It pulls AN_BMID and AN_BMID2 up to 3V3 through 1K00 resistors and reads them on AVR ADC channels 1 and 4 (OGP-SDK <span class="mono">adclib.c</span>, <span class="mono">ztcboard.c</span>).`},
  p101:{t:'P101 — Samtec MEC1-150-02-L-D-A', d:()=>`100-position card-edge connector, the openGear standard. Pins used here: ${[...new Set(I().pos.flatMap(p=>p.kind==='tb'?AES_PIN[p.pair]:[BNC_SIG[p.bnc]]))].sort((a,b)=>a-b).join(', ')}, ID pins 1 and 2, and 36 GND pins. The rest are left open on this module.`},
  ser:{t:'Series parts', d:()=>{ const ps=I().pos.filter(p=>p.L); return ps.length? `${ps.length} series inductors (0603)${ps.some(p=>p.R)?' and '+ps.filter(p=>p.R).length+' 75 Ω resistors across them':''}: ${ps.map(p=>p.ref+': '+p.L+' '+p.Lv+(p.R?'‖'+p.R+' '+p.Rv:'')).join(' · ')}. With the pad capacitance on each side, the inductor makes a short 75 Ω low-pass section and improves return loss; the resistor damps its resonance ${inf('the part values and placement')}.` : 'No series parts: every connector is wired straight to P101.'; }},
  conn:{t:'Connectors', d:()=>`${I().pos.filter(p=>p.kind==='bnc').length} BNCs and ${I().pos.filter(p=>p.kind!=='bnc').length} three-pin Phoenix pluggable terminal blocks (PHEN3PTOP). The generic drawings print the terminal pins as G / − / + on the left column and + / − / G on the right, so both columns put + towards the centre line.`},
  id:{t:'ID resistors R1, R2', d:()=>`R1 = AN_BMID to ground (all WBS modules 3K57), R2 = AN_BMID2 to ground (type: ${rFmt(DATA.alloc.bmid2)}). 1 % 0805 parts. The card's 1K00 pull-up and the 10-bit ADC put each value in one of 32 bins.`},
  gnd:{t:'Grounds', d:()=>{ const iso=I().pos.filter(p=>p.gnd==='iso'||p.gnd==='iso-ac'); return `GNDD is the signal ground plane, tied to 36 P101 pins and the terminal-block pin 3s. ${iso.length? 'BNC '+iso.map(p=>p.bnc).join(', ')+' keep their shells on isolated nets BNCx_GND that run to the card (“For video inputs”, DevGuide)'+(iso.some(p=>p.gnd==='iso-ac')?', each AC-coupled to ground by 0.1 µF capacitors so hum currents are blocked but RF is shorted.':', with no capacitor on this module.') : 'All shells go straight to GNDD.'} ${I().chassis||''}`; }},
  out:{t:'Outside world', d:()=>'Coax (75 Ω) to BNCs, twisted pair to the terminal blocks. The module is the frame\'s rear panel for this slot pair: its 1.3″-wide face spans two card slots of the MF6220 / DFR-8310 frame.'},
};
function viewBlock(m){
  window[FLAG]=false;
  const box=(k,x,y,w,h,sub)=>`<g class="blk" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${S.blockSel===k?'color-mix(in srgb,var(--accent) 25%,var(--panel2))':'var(--panel2)'}" stroke="${S.blockSel===k?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+w/2}" y="${y+h/2-2}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${BLOCKS[k].t.split(' — ')[0]}</text><text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text></g>`;
  const ar=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="2" marker-end="url(#${ID}ar)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-6}" text-anchor="middle" font-size="10" fill="var(--ink2)">${l||''}</text>`;
  const draw=()=>{
    m.innerHTML=`${card('Block diagram — click a block', `<svg viewBox="0 0 980 300" style="width:100%"><defs><marker id="${ID}ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>
      ${box('card',10,90,150,80,cardObj().id)}${ar(160,130,205,130,'MEC1')}
      ${box('p101',205,90,160,80,'100 pins, 1–2 = ID')}${ar(365,130,410,130,'')}
      ${box('ser',410,90,160,80,I().pos.some(p=>p.L)?'L / L‖R per BNC':'none')}${ar(570,130,615,130,'')}
      ${box('conn',615,90,160,80,I().pos.filter(p=>p.kind==='bnc').length+' BNC · '+I().pos.filter(p=>p.kind!=='bnc').length+' TB')}${ar(775,130,820,130,'cables')}
      ${box('out',820,90,150,80,'coax / pairs')}
      ${box('id',205,210,160,70,'R1 '+rTxt(I().id.bmid)+' · R2 '+rTxt(I().id.bmid2))}${ar(205,245,90,175,'ADC1 / ADC4')}
      ${box('gnd',615,210,160,70,'GNDD · BNCx_GND')}
      <text x="10" y="30" font-size="12" fill="var(--ink2)">Everything right of the card is passive copper on the ${DATA.product} (${esc(I().label)}).</text></svg>`)}
      ${card(BLOCKS[S.blockSel].t, `<p>${BLOCKS[S.blockSel].d()}</p>`)}
      ${card('Signal path stage by stage, all positions', stageTable())}`;
    m.querySelectorAll('.blk').forEach(g=>g.onclick=()=>{ S.blockSel=g.dataset.k; draw(); });
  };
  draw();
}
function stageTable(){
  return `<div class="scroll"><table class="kv"><tr><th>Pos</th><th>Card role (${esc(cardObj().id)})</th><th>Connector</th><th>Series part</th><th>Net → P101</th><th>Ground</th><th>Level (nominal load)</th></tr>
   ${I().pos.map(p=>{ const r=role(p.n), sg=SIG[r.sig]||SIG.nc, pins=pinsOf(p); const nomV = sg.kind==='nc'?'—': sg.unit==='dBu'? '+4 dBu' : (sg.voc/2).toFixed(2)+' V p-p';
     return `<tr><td>${p.n}</td><td>${esc(r.name)} <span class="muted small">${r.dir}</span></td><td>${p.ref}</td><td class="mono small">${p.L?p.L+' '+p.Lv+(p.R?' ‖ '+p.R+' '+p.Rv:''):'—'}</td><td class="mono small">${p.kind==='bnc'?p.net+' → '+pins.sig:p.kind==='tb'?p.pair+'P/N → '+pins.p+'/'+pins.n:p.pin1+' / '+p.pin2}</td><td class="small">${p.kind==='tb'?'pin 3 GNDD':p.gnd==='gndd'?'GNDD':p.gnd==='iso'?'isolated':'isolated, '+p.caps.length+'×0.1 µF'}</td><td class="mono small">${nomV}</td></tr>`; }).join('')}</table></div>`;
}

function viewSchem(m){
  window[FLAG]=false;
  const iss=I(), rows=iss.pos.slice().sort((a,b)=>a.n-b.n), RH=54;
  const H=rows.length*RH+150;
  let s=`<svg viewBox="0 0 980 ${H}" style="width:100%;min-width:760px" font-family="var(--mono)">
    <text x="10" y="18" font-size="12" fill="var(--warn)" font-family="var(--sans)">REDRAWN from ${esc(iss.netlist)} (P-CAD netlist) — not the original CAD schematic</text>
    <rect x="20" y="34" width="120" height="${rows.length*RH+10}" fill="var(--panel2)" stroke="var(--ink2)"/><text x="80" y="${44+rows.length*RH/2}" text-anchor="middle" font-size="13" fill="var(--ink)" transform="rotate(-90 80 ${44+rows.length*RH/2})">P101 MEC1-150-02-L-D-A</text>`;
  rows.forEach((p,i)=>{
    const y=50+i*RH, sel=p.n===S.sel, col=sel?'var(--warn)':'var(--ink)';
    if (p.kind==='bnc'){
      const pins=pinsOf(p);
      s+=`<text x="146" y="${y+4}" font-size="10" fill="var(--ink2)">${pins.sig}</text><line x1="140" y1="${y}" x2="330" y2="${y}" stroke="${col}"/><text x="180" y="${y-4}" font-size="10.5" fill="${col}">${p.net}</text>`;
      if (p.L){ s+=`<path d="M330,${y} q6,-10 12,0 q6,-10 12,0 q6,-10 12,0 q6,-10 12,0" fill="none" stroke="${col}" stroke-width="1.6"/><text x="334" y="${y-12}" font-size="10" fill="${col}">${p.L} ${p.Lv}</text>`;
        if (p.R) s+=`<path d="M326,${y} v16 h8 l3,-5 l5,10 l5,-10 l5,10 l5,-10 l5,10 l3,-5 h10 v-16" fill="none" stroke="${col}"/><text x="340" y="${y+30}" font-size="10" fill="${col}">${p.R} ${p.Rv}</text>`;
        s+=`<line x1="378" y1="${y}" x2="560" y2="${y}" stroke="${col}"/>`;
      } else s+=`<line x1="330" y1="${y}" x2="560" y2="${y}" stroke="${col}"/>`;
      s+=`<circle cx="580" cy="${y+6}" r="16" fill="none" stroke="${col}" stroke-width="2"/><circle cx="580" cy="${y+6}" r="3" fill="${col}"/><line x1="560" y1="${y}" x2="577" y2="${y+5}" stroke="${col}"/><text x="602" y="${y+10}" font-size="11" fill="${col}">${p.ref} · position ${p.n}</text>`;
      const g = p.gnd==='gndd'?'shell → GNDD':p.gnd==='iso'?`shell → BNC${p.bnc}_GND → P101-${BNC_ISO[p.bnc].join(',')}`:`shell → BNC${p.bnc}_GND → P101-${BNC_ISO[p.bnc].join(',')} · ${p.caps.join(',')} 0.1µ → ${p.capTo||'GNDD'}`;
      s+=`<text x="602" y="${y+24}" font-size="9.5" fill="var(--ink2)">${g}</text>`;
    } else {
      const a = p.kind==='tb'? AES_PIN[p.pair] : [BNC_SIG[p.bnc], BNC_ISO[p.bnc][0]];
      const n1 = p.kind==='tb'? p.pair+'P' : p.pin1, n2 = p.kind==='tb'? p.pair+'N' : p.pin2;
      s+=`<text x="146" y="${y-2}" font-size="10" fill="var(--ink2)">${p.kind==='tb'?a[0]:(p.pin1.includes('SIG')?BNC_SIG[p.bnc]:BNC_ISO[p.bnc].join(','))}</text><line x1="140" y1="${y-6}" x2="560" y2="${y-6}" stroke="${col}"/><text x="230" y="${y-10}" font-size="10.5" fill="${col}">${n1}</text>
          <text x="146" y="${y+12}" font-size="10" fill="var(--ink2)">${p.kind==='tb'?a[1]:(p.pin2.includes('SIG')?BNC_SIG[p.bnc]:BNC_ISO[p.bnc].join(','))}</text><line x1="140" y1="${y+8}" x2="560" y2="${y+8}" stroke="${col}"/><text x="230" y="${y+20}" font-size="10.5" fill="${col}">${n2}</text>
          <line x1="520" y1="${y+22}" x2="560" y2="${y+22}" stroke="var(--ink2)"/><text x="470" y="${y+26}" font-size="9.5" fill="var(--ink2)">${p.kind==='tb'||p.pin3?'GNDD':'n.c.'}</text>
          <rect x="560" y="${y-14}" width="30" height="44" fill="none" stroke="${col}" stroke-width="2"/>${[-6,8,22].map((d,k)=>`<circle cx="575" cy="${y+d}" r="3" fill="${col}"/><text x="596" y="${y+d+4}" font-size="9" fill="var(--ink2)">${k+1}</text>`).join('')}
          <text x="610" y="${y+6}" font-size="11" fill="${col}">${p.ref} PHEN3PTOP · position ${p.n}</text><text x="610" y="${y+20}" font-size="9.5" fill="var(--ink2)">${p.kind==='tb'?'balanced pair':'single-ended BNC pins on a terminal block'}</text>`;
    }
  });
  const yb=60+rows.length*RH;
  s+=`<text x="146" y="${yb+4}" font-size="10" fill="var(--ink2)">1</text><line x1="140" y1="${yb}" x2="420" y2="${yb}" stroke="var(--ink)"/><text x="180" y="${yb-4}" font-size="10.5" fill="var(--ink)">AN_BMID2</text><path d="M420,${yb} l4,-6 l6,12 l6,-12 l6,12 l6,-12 l4,6 h20" fill="none" stroke="var(--ink)"/><text x="424" y="${yb-12}" font-size="10" fill="var(--ink)">R2 ${rTxt(iss.id.bmid2)}</text><text x="480" y="${yb+4}" font-size="10" fill="var(--ink2)">→ GNDD</text>
     <text x="146" y="${yb+34}" font-size="10" fill="var(--ink2)">2</text><line x1="140" y1="${yb+30}" x2="420" y2="${yb+30}" stroke="var(--ink)"/><text x="180" y="${yb+26}" font-size="10.5" fill="var(--ink)">AN_BMID</text><path d="M420,${yb+30} l4,-6 l6,12 l6,-12 l6,12 l6,-12 l4,6 h20" fill="none" stroke="var(--ink)"/><text x="424" y="${yb+18}" font-size="10" fill="var(--ink)">R1 ${rTxt(iss.id.bmid)}</text><text x="480" y="${yb+34}" font-size="10" fill="var(--ink2)">→ GNDD</text>
     <text x="146" y="${yb+64}" font-size="10" fill="var(--ink2)">GND: ${GND_PINS.length} pins (${GND_PINS.slice(0,8).join(',')}…) → GNDD plane${iss.extraGnd?' · '+iss.extraGnd:''}</text></svg>`;
  m.innerHTML=`${card('Schematic — '+esc(iss.label), `<label class="small">${Object.keys(DATA.issues).length>1?'Issue ':''}${Object.keys(DATA.issues).length>1?`<select id="is">${Object.keys(DATA.issues).map(k=>`<option value="${k}" ${k===S.issue?'selected':''}>${esc(DATA.issues[k].label)}</option>`).join('')}</select>`:''}</label> <span class="small muted">Highlighted row = selected position (${S.sel}). Click a row in the MEC1 map below to select.</span><div class="scroll">${s}</div>`)}
   ${card('P101 pin map (MEC1, card component side odd / solder side even)', pinMap())}
   ${card('Parts list (from the netlist)', `<p class="small">${esc(iss.parts)}</p>`)}`;
  const is=m.querySelector('#is'); if (is) is.onchange=()=>{ A.setIssue(is.value); };
  m.querySelectorAll('[data-pin]').forEach(el=>el.onclick=()=>{ const n=+el.dataset.pos; if(n) { S.sel=n; viewSchem(m); } });
}
function pinMap(){
  const used={}; I().pos.forEach(p=>{ if(p.kind==='tb'){ used[AES_PIN[p.pair][0]]=p.n; used[AES_PIN[p.pair][1]]=p.n; } else { used[BNC_SIG[p.bnc]]=p.n; if(p.gnd!=='gndd'&&BNC_ISO[p.bnc]) BNC_ISO[p.bnc].forEach(q=>used[q]=p.n); } });
  let s='<svg viewBox="0 0 980 150" style="width:100%;min-width:760px">';
  for (let k=0;k<50;k++){ [1,2].forEach(side=>{ const pin=side===1? 99-2*k : 100-2*k, x=10+k*19.4, y=side===1?20:80; const nm=pinName(pin), u=used[pin], sel=u===S.sel;
    const fill = pin<=2?'var(--warn)': sel?'#ffd34d': u?'var(--accent)': nm==='GND'?'var(--ink2)':'var(--panel2)';
    s+=`<g data-pin="${pin}" data-pos="${u||0}" style="cursor:${u?'pointer':'default'}"><rect x="${x}" y="${y}" width="16" height="40" rx="2" fill="${fill}" stroke="var(--line)"><title>P101-${pin}: ${nm}${u?' · position '+u:''}</title></rect></g>`;
    if (k%5===0) s+=`<text x="${x+8}" y="${side===1?14:136}" text-anchor="middle" font-size="9" fill="var(--ink2)">${pin}</text>`; }); }
  return s+`</svg><div class="small"><span class="chip" style="background:var(--warn);color:#fff">ID pins 1–2</span><span class="chip" style="background:var(--accent);color:#fff">wired on this module</span><span class="chip" style="background:#ffd34d">selected position</span><span class="chip" style="background:var(--ink2);color:var(--bg)">GND</span><span class="chip">open</span> Hover a pin for its standard name.</div>`;
}

function viewSoft(m){
  window[FLAG]=false;
  m.innerHTML=`${card('The module has no logic — this is the card-side code that reads it', `<p class="small">From the Ross OGP-SDK-AVR copied into each WBS card tree (<span class="mono">zeuslib/common/adclib.c</span>, <span class="mono">application/ztcboard.c</span> or <span class="mono">boardimp.c</span> in M6205, <span class="mono">zeuslib/common/board.c</span>). The highlighted step follows the playhead inside the ID read; press “Card reads ID” on the Simulator tab to move the read.</p><div id="fl"></div>`)}
   <div class="grid2">${card('Live values', `<div id="lv"></div>`)}${card('Bins for every allocated value', `<canvas id="bins"></canvas>`)}</div>
   ${card('Signal path, stage by stage', stageTable())}`;
  SIM.on('time', ()=>{
    const t=SIM.t, t0=S.idAt!=null?S.idAt:0, r1=R1(), r2=R2(), a1=adcOf(r1), a2=adcOf(r2), d=idOf(r1,r2);
    const rel=t-t0; const k = rel<0?-1: rel<ADC_FIRST?1: rel<ADC_FIRST+20e-6?2: rel<ADC_FIRST+20e-6+ADC_NEXT?3: rel<ADC_FIRST+60e-6+ADC_NEXT?4:5;
    const steps=[['getRearModuleId()','boardimp.c: (getOptionCardType() << 8) | (getRearModuleType() & 0xFF)'],['getAdcValue(ADC_BMTYPE=1)','ADMUX=0x41 · ADCSRA=0x87 · ADSC · 25 ADC clocks'],['getAdcBin()','32 − (ADC + 16) / 32 → bin '+d.b1],['getAdcValue(ADC_DAUGHTER=4)','AN_BMID2 · 13 ADC clocks'],['getAdcBin()','→ bin '+d.b2+' · rmId 0x'+d.rm.toString(16).padStart(4,'0')],['getRearModuleName()','csprintf("%d.%d ", r2&0x0F, r1&0x0F) → “'+d.disp+'”']];
    m.querySelector('#fl').innerHTML=`<svg viewBox="0 0 980 100" style="width:100%">${steps.map((s,i)=>`<rect x="${6+i*162}" y="10" width="154" height="78" rx="7" fill="${i===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${12+i*162}" y="32" font-size="${s[0].length>22?8.6:10.5}" font-family="var(--mono)" fill="${i===k?'#fff':'var(--ink)'}">${s[0]}</text>${wrapSvg(s[1],14+i*162,50,26,i===k?'#fff':'var(--ink2)')}`).join('')}</svg>`;
    m.querySelector('#lv').innerHTML=`<table class="kv"><tr><th>AN_BMID</th><td class="mono">${rFmt(r1)} → ${(3.3*(r1>=OPEN?1:r1/(r1+1000))).toFixed(3)} V → ADC ${a1} → bin ${d.b1} (letter ${d.b1?String.fromCharCode(64+d.b1):'blank'})</td></tr>
     <tr><th>AN_BMID2</th><td class="mono">${rFmt(r2)} → ${(3.3*(r2>=OPEN?1:r2/(r2+1000))).toFixed(3)} V → ADC ${a2} → bin ${d.b2}</td></tr>
     <tr><th>rmId</th><td class="mono">0x${d.rm.toString(16).padStart(4,'0')} → DashBoard “${d.disp} …”</td></tr>
     <tr><th>Older boards</th><td class="small">The SDK's <span class="mono">ztcboard.c</span> only adds AN_BMID2 when <span class="mono">getBoardIssue() >= 4</span>. On an earlier card every WBS module reads the same code ${binOf(adcOf(3570))}, because all of them use AN_BMID = 3K57.</td></tr>
     <tr><th>ADC timing</th><td class="small">ADC clock = F_CPU/128; at 16 MHz ${inf('typical AT90CAN128 crystal; the card clock is not in this module\'s files')} the first conversion takes ${SIM.fmtDur(ADC_FIRST)}, later ones ${SIM.fmtDur(ADC_NEXT)}.</td></tr></table>`;
    const cv=m.querySelector('#bins'); const {c,w}=SIM.canvas(cv,200);
    const vals=[...new Set(ALLOC.flatMap(a=>[a[1],a[2]]))].sort((a,b)=>b-a);
    c.font='10px '+SIM.css('--mono');
    for (let b=0;b<=32;b++){ const x=10+b*(w-20)/33; c.fillStyle=b%2?SIM.css('--lane'):SIM.css('--panel2'); c.fillRect(x,10,(w-20)/33,150); }
    vals.forEach(v=>{ const a=adcOf(v), b=binOf(a), x=10+(32-b+0.5)*(w-20)/33; const isMe=(v===r1||v===r2); c.fillStyle=isMe?SIM.css('--warn'):SIM.css('--accent'); c.fillRect(x-3,150-a/1023*130,6,4); });
    c.fillStyle=SIM.css('--ink2'); c.fillText('bin 32 … 0 (left to right) · dots = ADC code of each allocated value · orange = this module',10,190);
  });
}
function wrapSvg(t,x,y,n,col){ const ws=t.split(' '); let line='',out='',yy=y; ws.forEach(w=>{ if((line+' '+w).length>n){ out+=`<text x="${x}" y="${yy}" font-size="9.5" fill="${col}">${esc(line)}</text>`; yy+=12; line=w; } else line=line?line+' '+w:w; }); return out+`<text x="${x}" y="${yy}" font-size="9.5" fill="${col}">${esc(line)}</text>`; }

function viewFind(m){
  window[FLAG]=false;
  const common=[
    `<b>Every WBS module shares AN_BMID = 3K57.</b> Only AN_BMID2 tells them apart (allocation sheet “Rear Module ID” in <span class="mono">OpenGear Frame Address ID.xls</span>). The SDK reads AN_BMID2 on ADC4, the channel it also calls <span class="mono">ADC_DAUGHTER</span> / <span class="mono">getOptionCardType()</span>, and <span class="mono">ztcboard.c</span> only uses it when <span class="mono">getBoardIssue() >= 4</span>. On an older card every WBS rear module reads the same code.`,
    `<b>The printed ID can alias.</b> <span class="mono">getRearModuleName()</span> prints <span class="mono">"%d.%d"</span> of each bin masked with <span class="mono">0x0F</span>, so bins 16–31 wrap. ${DATA.product} prints “${idOf(DATA.alloc.bmid,DATA.alloc.bmid2).disp}”, the same as ${ALLOC.filter(a=>idOf(a[1],a[2]).disp===idOf(DATA.alloc.bmid,DATA.alloc.bmid2).disp && a[0]!==DATA.product).map(a=>a[0]).join(', ')||'no other module'}. The full 16-bit rmId used to look up the name is still unique.`,
    `<b>Ross later reused the WBS base value.</b> openGear DevGuide Part I Appendix B gives Ross's own “10 AUD Full” module AN_BMID = 3K57 / AN_BMID2 = 3K57 and “10 AUD Split” 3K57 / 887R. Those are exactly the WBS allocations for T6303 and T6403.`,
  ];
  m.innerHTML=card('Findings — what the '+DATA.product+' files show', `<ol>${DATA.findings.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}${common.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}</ol>`)+
    card('Sources used', `<ul class="small">${DATA.sources.map(s=>`<li class="mono">${esc(s)}</li>`).join('')}</ul>`);
}

SIM.register({
  id:ID, product:DATA.product, name:DATA.name, year:DATA.year, family:DATA.family, folder:DATA.folder,
  summary:DATA.summary, highlights:DATA.highlights, depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 AES frame (48 kHz)',period:()=>1/FS},{label:'1 video line',period:()=>HLINE},{label:'1 AES block (4 ms)',period:()=>192/FS},{label:'1 video field',period:()=>FIELD},{label:'1 ms',period:()=>0.001},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[FIELD,'1 field (16.7 ms)'],[0.004,'1 AES block (4 ms)'],[0.001,'1 ms (ID read)'],[HLINE*2,'2 video lines'],[4/FS,'4 AES frames (83 µs)'],[2e-6,'2 µs (bit cells)']],
  defaultZoom:4,
  init(){},
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: fitting the '+DATA.product,render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Card-side ID code',render:viewSoft},
    {id:'findings',label:'Findings',render:viewFind},
  ],
});

})();
