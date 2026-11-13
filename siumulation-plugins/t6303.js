/* =====================================================================
   T6303 — 10-terminal-block single-card rear module
   Plugin for the WBS Device Simulator (../siumulation.html). Built on the
   shared openGear rear-module engine (extended copy: dual-card slots, 9-pin
   blocks, card pin maps keyed by MEC1 signal). Positions and routes were
   traced through the real Gerber copper and checked against the netlists
   listed in DATA.sources.
   ===================================================================== */
(function(){
const DATA = {
 "id": "t6303",
 "product": "T6303",
 "year": 2006,
 "what": "10-terminal-block single-card rear module",
 "name": "T6303 · 10 terminal-block openGear rear module (2006|39)",
 "folder": "#OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION",
 "summary": "Single-card rear with ten 3-pin Phoenix blocks for balanced audio: two single-ended pairs on the BNC1/BNC2 pins and eight AES pairs. ISS1 (2006|39) had the inputs on the BNC9/BNC10 pins; ISS2 moved them to the top. ISS4 (2012|45) is drawn from its Gerbers.",
 "highlights": [
  "ISS4 Gerbers drawn 1:1",
  "Every block traced through the copper",
  "AA6201A, D6202A/B, D6203A pin-outs",
  "ISS1 → ISS2 input move",
  "ID 3K57/3K57 clash with Ross"
 ],
 "intro": "The T6303 is the all-audio single-card rear: ten pluggable terminal blocks behind an AA6201A analog DA, a D6202A/B 110 Ω AES DA or a 110 Ω D6203A converter.",
 "alloc": {
  "bmid": 3570,
  "bmid2": 3570
 },
 "defaultIssue": "iss4",
 "issues": {
  "iss4": {
   "label": "ISS4 (Gerbers 29 May 2012; nets from T6303-iss3.net)",
   "img": "t6303-pcb",
   "w": 1.335,
   "h": 3.38,
   "face": "bottom layer, mirrored",
   "cardSide": "top layer",
   "art": "T6303-ISS4 Gerbers (BOT/BSM/BSS face, TOP/TSM/TSS card side, NCD drill), first board of the panel",
   "netlist": "none for ISS4 (P-CAD binary only) — T6303-iss3.net, confirmed by the ISS4 copper",
   "pos": [
    {
     "kind": "tbu",
     "ref": "TB1",
     "slot": "P101",
     "key": "BNC1",
     "nets": {
      "sig": "BNC1_SIG",
      "ret": "BNC1_GND"
     },
     "pins": {
      "sig": 97,
      "ret": [
       95,
       96,
       98,
       99,
       100
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 1,
     "x": 0.198,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → GND(36) | P101-95, P101-96, P101-98, P101-99, P101-100 | P101-97"
    },
    {
     "kind": "tbu",
     "ref": "TB2",
     "slot": "P101",
     "key": "BNC2",
     "nets": {
      "sig": "BNC2_SIG",
      "ret": "BNC2_GND"
     },
     "pins": {
      "sig": 92,
      "ret": [
       89,
       90,
       91,
       93,
       94
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 2,
     "x": 0.863,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → P101-92 | P101-89, P101-90, P101-91, P101-93, P101-94 | GND(36)"
    },
    {
     "kind": "tb",
     "ref": "TB3",
     "slot": "P101",
     "key": "AES1",
     "nets": {
      "p": "AES1P",
      "n": "AES1N"
     },
     "pins": {
      "p": 69,
      "n": 67
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 3,
     "x": 0.198,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → GND(36) | P101-67 | P101-69"
    },
    {
     "kind": "tb",
     "ref": "TB4",
     "slot": "P101",
     "key": "AES5",
     "nets": {
      "p": "AES5P",
      "n": "AES5N"
     },
     "pins": {
      "p": 70,
      "n": 68
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 4,
     "x": 0.863,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → P101-70 | P101-68 | GND(36)"
    },
    {
     "kind": "tb",
     "ref": "TB5",
     "slot": "P101",
     "key": "AES2",
     "nets": {
      "p": "AES2P",
      "n": "AES2N"
     },
     "pins": {
      "p": 63,
      "n": 61
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 5,
     "x": 0.198,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → GND(36) | P101-61 | P101-63"
    },
    {
     "kind": "tb",
     "ref": "TB6",
     "slot": "P101",
     "key": "AES6",
     "nets": {
      "p": "AES6P",
      "n": "AES6N"
     },
     "pins": {
      "p": 64,
      "n": 62
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 6,
     "x": 0.863,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → P101-64 | P101-62 | GND(36)"
    },
    {
     "kind": "tb",
     "ref": "TB7",
     "slot": "P101",
     "key": "AES3",
     "nets": {
      "p": "AES3P",
      "n": "AES3N"
     },
     "pins": {
      "p": 57,
      "n": 55
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 7,
     "x": 0.198,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → GND(36) | P101-55 | P101-57"
    },
    {
     "kind": "tb",
     "ref": "TB8",
     "slot": "P101",
     "key": "AES7",
     "nets": {
      "p": "AES7P",
      "n": "AES7N"
     },
     "pins": {
      "p": 58,
      "n": 56
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 8,
     "x": 0.863,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → P101-58 | P101-56 | GND(36)"
    },
    {
     "kind": "tb",
     "ref": "TB9",
     "slot": "P101",
     "key": "AES4",
     "nets": {
      "p": "AES4P",
      "n": "AES4N"
     },
     "pins": {
      "p": 51,
      "n": 49
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 9,
     "x": 0.198,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → GND(36) | P101-49 | P101-51"
    },
    {
     "kind": "tb",
     "ref": "TB10",
     "slot": "P101",
     "key": "AES8",
     "nets": {
      "p": "AES8P",
      "n": "AES8N"
     },
     "pins": {
      "p": 52,
      "n": 50
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 10,
     "x": 0.863,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "gerber": "Traced in the ISS4 Gerbers: pins top→bottom → P101-52 | P101-50 | GND(36)"
    }
   ],
   "ids": {
    "P101": {
     "r1": "R1",
     "bmid": 3570,
     "r2": "R2",
     "bmid2": 3570
    }
   },
   "parts": "10 × PHEN3PV-3.81 terminal blocks, R1 3K57, R2 3K57, MH1 (MH106P) and MH5–MH11 (MH150P) on GNDD, P101. Silk “T6303A ▪ −B ▪ … T6303, ISS4”.",
   "bused": [],
   "gndPins": {
    "P101": [
     15,
     16,
     18,
     19,
     20,
     21,
     23,
     24,
     31,
     32,
     33,
     35,
     36,
     38,
     39,
     40,
     47,
     48,
     53,
     54,
     59,
     60,
     65,
     66,
     71,
     72,
     73,
     74,
     76,
     77,
     78,
     79,
     81,
     82,
     87,
     88
    ]
   },
   "gndExtra": {
    "P101": []
   },
   "verify": "Every one of the 10 connectors traced through the ISS4 copper (TOP, BOT, GND1, GND2, joined at the drill hits and through the series inductors) lands on exactly the MEC1 pins T6303-iss3.net (used as a stand-in: the issue has no netlist of its own) gives it.",
   "idNote": "ISS4 values from T6303A-ISS4 PNP.pnp (R1 = R2 = 3K57)"
  },
  "iss3": {
   "label": "ISS3 (T6303-iss3.net, 2010|43)",
   "img": "t6303-pcb",
   "w": 1.335,
   "h": 3.38,
   "face": "bottom layer, mirrored",
   "cardSide": "top layer",
   "art": "T6303-ISS4 Gerbers (BOT/BSM/BSS face, TOP/TSM/TSS card side, NCD drill), first board of the panel — ISS3 not plotted; its connectors are drawn where ISS4 puts the same reference designators",
   "netlist": "T6303-iss3.net",
   "pos": [
    {
     "kind": "tbu",
     "ref": "TB1",
     "slot": "P101",
     "key": "BNC1",
     "nets": {
      "sig": "BNC1_SIG",
      "ret": "BNC1_GND"
     },
     "pins": {
      "sig": 97,
      "ret": [
       95,
       96,
       98,
       99,
       100
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 1,
     "x": 0.198,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "kind": "tbu",
     "ref": "TB2",
     "slot": "P101",
     "key": "BNC2",
     "nets": {
      "sig": "BNC2_SIG",
      "ret": "BNC2_GND"
     },
     "pins": {
      "sig": 92,
      "ret": [
       89,
       90,
       91,
       93,
       94
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 2,
     "x": 0.863,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB3",
     "slot": "P101",
     "key": "AES1",
     "nets": {
      "p": "AES1P",
      "n": "AES1N"
     },
     "pins": {
      "p": 69,
      "n": 67
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 3,
     "x": 0.198,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB4",
     "slot": "P101",
     "key": "AES5",
     "nets": {
      "p": "AES5P",
      "n": "AES5N"
     },
     "pins": {
      "p": 70,
      "n": 68
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 4,
     "x": 0.863,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB5",
     "slot": "P101",
     "key": "AES2",
     "nets": {
      "p": "AES2P",
      "n": "AES2N"
     },
     "pins": {
      "p": 63,
      "n": 61
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 5,
     "x": 0.198,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB6",
     "slot": "P101",
     "key": "AES6",
     "nets": {
      "p": "AES6P",
      "n": "AES6N"
     },
     "pins": {
      "p": 64,
      "n": 62
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 6,
     "x": 0.863,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB7",
     "slot": "P101",
     "key": "AES3",
     "nets": {
      "p": "AES3P",
      "n": "AES3N"
     },
     "pins": {
      "p": 57,
      "n": 55
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 7,
     "x": 0.198,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB8",
     "slot": "P101",
     "key": "AES7",
     "nets": {
      "p": "AES7P",
      "n": "AES7N"
     },
     "pins": {
      "p": 58,
      "n": 56
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 8,
     "x": 0.863,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB9",
     "slot": "P101",
     "key": "AES4",
     "nets": {
      "p": "AES4P",
      "n": "AES4N"
     },
     "pins": {
      "p": 51,
      "n": 49
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 9,
     "x": 0.198,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ]
    },
    {
     "kind": "tb",
     "ref": "TB10",
     "slot": "P101",
     "key": "AES8",
     "nets": {
      "p": "AES8P",
      "n": "AES8N"
     },
     "pins": {
      "p": 52,
      "n": 50
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 10,
     "x": 0.863,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ]
    }
   ],
   "ids": {
    "P101": {
     "r1": "R1",
     "bmid": 3570.0,
     "r2": "R2",
     "bmid2": 3570.0
    }
   },
   "parts": "Same nets as ISS4. Footprint changed from PHEN3PTOP to PHEN3PV-3.81; seven MH150P ground holes added. ISS3 Gerbers (no drill file) have the same panel outline as ISS4.",
   "bused": [],
   "gndPins": {
    "P101": [
     15,
     16,
     18,
     19,
     20,
     21,
     23,
     24,
     31,
     32,
     33,
     35,
     36,
     38,
     39,
     40,
     47,
     48,
     53,
     54,
     59,
     60,
     65,
     66,
     71,
     72,
     73,
     74,
     76,
     77,
     78,
     79,
     81,
     82,
     87,
     88
    ]
   },
   "gndExtra": {
    "P101": []
   }
  },
  "iss2": {
   "label": "ISS2 (T6303-iss2.net, 2007|40)",
   "img": "t6303-pcb",
   "w": 1.335,
   "h": 3.38,
   "face": "bottom layer, mirrored",
   "cardSide": "top layer",
   "art": "T6303-ISS4 Gerbers (BOT/BSM/BSS face, TOP/TSM/TSS card side, NCD drill), first board of the panel — ISS2 not plotted; its connectors are drawn where ISS4 puts the same reference designators",
   "netlist": "T6303-iss2.net",
   "pos": [
    {
     "kind": "tbu",
     "ref": "TB1",
     "slot": "P101",
     "key": "BNC1",
     "nets": {
      "sig": "BNC1_SIG",
      "ret": "BNC1_GND"
     },
     "pins": {
      "sig": 97,
      "ret": [
       95,
       96,
       98,
       99,
       100
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 1,
     "x": 0.198,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tbu",
     "ref": "TB2",
     "slot": "P101",
     "key": "BNC2",
     "nets": {
      "sig": "BNC2_SIG",
      "ret": "BNC2_GND"
     },
     "pins": {
      "sig": 92,
      "ret": [
       89,
       90,
       91,
       93,
       94
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 2,
     "x": 0.863,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB3",
     "slot": "P101",
     "key": "AES1",
     "nets": {
      "p": "AES1P",
      "n": "AES1N"
     },
     "pins": {
      "p": 69,
      "n": 67
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 3,
     "x": 0.198,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB4",
     "slot": "P101",
     "key": "AES5",
     "nets": {
      "p": "AES5P",
      "n": "AES5N"
     },
     "pins": {
      "p": 70,
      "n": 68
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 4,
     "x": 0.863,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB5",
     "slot": "P101",
     "key": "AES2",
     "nets": {
      "p": "AES2P",
      "n": "AES2N"
     },
     "pins": {
      "p": 63,
      "n": 61
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 5,
     "x": 0.198,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB6",
     "slot": "P101",
     "key": "AES6",
     "nets": {
      "p": "AES6P",
      "n": "AES6N"
     },
     "pins": {
      "p": 64,
      "n": 62
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 6,
     "x": 0.863,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB7",
     "slot": "P101",
     "key": "AES3",
     "nets": {
      "p": "AES3P",
      "n": "AES3N"
     },
     "pins": {
      "p": 57,
      "n": 55
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 7,
     "x": 0.198,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB8",
     "slot": "P101",
     "key": "AES7",
     "nets": {
      "p": "AES7P",
      "n": "AES7N"
     },
     "pins": {
      "p": 58,
      "n": 56
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 8,
     "x": 0.863,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB9",
     "slot": "P101",
     "key": "AES4",
     "nets": {
      "p": "AES4P",
      "n": "AES4N"
     },
     "pins": {
      "p": 51,
      "n": 49
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 9,
     "x": 0.198,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB10",
     "slot": "P101",
     "key": "AES8",
     "nets": {
      "p": "AES8P",
      "n": "AES8N"
     },
     "pins": {
      "p": 52,
      "n": 50
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 10,
     "x": 0.863,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    }
   ],
   "ids": {
    "P101": {
     "r1": "R1",
     "bmid": 3570.0,
     "r2": "R2",
     "bmid2": 3570.0
    }
   },
   "parts": "TB1/TB2 on BNC1/BNC2 single-ended pins, TB3–TB10 on AES1–AES8; MH1 on GNDD.",
   "bused": [],
   "gndPins": {
    "P101": [
     15,
     16,
     18,
     19,
     20,
     21,
     23,
     24,
     31,
     32,
     33,
     35,
     36,
     38,
     39,
     40,
     47,
     48,
     53,
     54,
     59,
     60,
     65,
     66,
     71,
     72,
     73,
     74,
     76,
     77,
     78,
     79,
     81,
     82,
     87,
     88
    ]
   },
   "gndExtra": {
    "P101": []
   }
  },
  "iss1": {
   "label": "ISS1 (T6303.net, 2006|39)",
   "img": "t6303-pcb",
   "w": 1.335,
   "h": 3.38,
   "face": "bottom layer, mirrored",
   "cardSide": "top layer",
   "art": "T6303-ISS4 Gerbers (BOT/BSM/BSS face, TOP/TSM/TSS card side, NCD drill), first board of the panel — ISS1 not plotted; its connectors are drawn where ISS4 puts the same reference designators",
   "netlist": "T6303.net",
   "pos": [
    {
     "kind": "tb",
     "ref": "TB1",
     "slot": "P101",
     "key": "AES1",
     "nets": {
      "p": "AES1P",
      "n": "AES1N"
     },
     "pins": {
      "p": 69,
      "n": 67
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 1,
     "x": 0.198,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB2",
     "slot": "P101",
     "key": "AES5",
     "nets": {
      "p": "AES5P",
      "n": "AES5N"
     },
     "pins": {
      "p": 70,
      "n": 68
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 2,
     "x": 0.863,
     "y": 0.5,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB3",
     "slot": "P101",
     "key": "AES2",
     "nets": {
      "p": "AES2P",
      "n": "AES2N"
     },
     "pins": {
      "p": 63,
      "n": 61
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 3,
     "x": 0.198,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB4",
     "slot": "P101",
     "key": "AES6",
     "nets": {
      "p": "AES6P",
      "n": "AES6N"
     },
     "pins": {
      "p": 64,
      "n": 62
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 4,
     "x": 0.863,
     "y": 1.125,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB5",
     "slot": "P101",
     "key": "AES3",
     "nets": {
      "p": "AES3P",
      "n": "AES3N"
     },
     "pins": {
      "p": 57,
      "n": 55
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 5,
     "x": 0.198,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB6",
     "slot": "P101",
     "key": "AES7",
     "nets": {
      "p": "AES7P",
      "n": "AES7N"
     },
     "pins": {
      "p": 58,
      "n": 56
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 6,
     "x": 0.863,
     "y": 1.75,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB7",
     "slot": "P101",
     "key": "AES4",
     "nets": {
      "p": "AES4P",
      "n": "AES4N"
     },
     "pins": {
      "p": 51,
      "n": 49
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 7,
     "x": 0.198,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tb",
     "ref": "TB8",
     "slot": "P101",
     "key": "AES8",
     "nets": {
      "p": "AES8P",
      "n": "AES8N"
     },
     "pins": {
      "p": 52,
      "n": 50
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "n": 8,
     "x": 0.863,
     "y": 2.375,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    },
    {
     "kind": "tbu",
     "ref": "TB9",
     "slot": "P101",
     "key": "BNC9",
     "nets": {
      "sig": "BNC9_SIG",
      "ret": "BNC9_GND"
     },
     "pins": {
      "sig": 5,
      "ret": [
       3,
       4,
       6,
       7,
       8
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 9,
     "x": 0.198,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "G",
      "−",
      "+"
     ],
     "refInf": true
    },
    {
     "kind": "tbu",
     "ref": "TB10",
     "slot": "P101",
     "key": "BNC10",
     "nets": {
      "sig": "BNC10_SIG",
      "ret": "BNC10_GND"
     },
     "pins": {
      "sig": 12,
      "ret": [
       9,
       10,
       11,
       13,
       14
      ]
     },
     "tbPins": [
      1,
      2,
      3
     ],
     "g3": "GNDD",
     "n": 10,
     "x": 0.863,
     "y": 3.0,
     "pitch": 0.138,
     "order": [
      "+",
      "−",
      "G"
     ],
     "refInf": true
    }
   ],
   "ids": {
    "P101": {
     "r1": "R1",
     "bmid": 3570.0,
     "r2": "R2",
     "bmid2": 3570.0
    }
   },
   "parts": "TB1–TB8 on AES1, AES5, AES2, AES6, AES3, AES7, AES4, AES8; TB9/TB10 on the BNC9/BNC10 single-ended pins; ground net named GND, MH1 (MH125P) alone on GNDCHASSIS.",
   "bused": [],
   "gndPins": {
    "P101": [
     15,
     16,
     18,
     19,
     20,
     21,
     23,
     24,
     31,
     32,
     33,
     35,
     36,
     38,
     39,
     40,
     47,
     48,
     53,
     54,
     59,
     60,
     65,
     66,
     71,
     72,
     73,
     74,
     76,
     77,
     78,
     79,
     81,
     82,
     87,
     88
    ]
   },
   "gndExtra": {
    "P101": []
   },
   "chassis": "ISS1 puts the mounting hole MH1 on its own GNDCHASSIS net with nothing else on it."
  }
 },
 "cards": [
  {
   "short": "stereo A/D converter",
   "label": "D6203A analog-to-AES converter (110 Ω variant on terminal blocks)",
   "src": "#OPEN GEAR - #Engineering/…/openGear Rear Module Guides/D6203A - rear module options.pdf; D6203A #Functional/D6203-T6302.pdf",
   "pins": {
    "BNC1": [
     "REF IN",
     "in",
     "ref"
    ],
    "BNC2": [
     "not used",
     "nc",
     "nc"
    ],
    "BNC3": [
     "AES OUT1 (75 Ω)",
     "out",
     "aes75"
    ],
    "BNC4": [
     "AES OUT3 (75 Ω)",
     "out",
     "aes75"
    ],
    "BNC5": [
     "AES OUT2 (75 Ω)",
     "out",
     "aes75"
    ],
    "BNC6": [
     "AES OUT4 (75 Ω)",
     "out",
     "aes75"
    ],
    "AES1": [
     "AES OUT1",
     "out",
     "aes110"
    ],
    "AES5": [
     "AES OUT3",
     "out",
     "aes110"
    ],
    "AES2": [
     "AES OUT2",
     "out",
     "aes110"
    ],
    "AES6": [
     "AES OUT4",
     "out",
     "aes110"
    ],
    "AES3": [
     "ANALOG IN LEFT",
     "in",
     "analog"
    ],
    "AES4": [
     "ANALOG IN RIGHT",
     "in",
     "analog"
    ],
    "AES7": [
     "not connected",
     "nc",
     "nc",
     "D6203-T6302.pdf calls this pair a balanced AES1 output; every guide says “Not Connected”"
    ],
    "AES8": [
     "not connected",
     "nc",
     "nc",
     "D6203-T6302.pdf calls this pair a balanced AES2 output; every guide says “Not Connected”"
    ]
   },
   "id": "D6203A",
   "guide": {
    "1": "REF IN",
    "2": "Not Connected",
    "3": "AES OUT1",
    "4": "AES OUT3",
    "5": "AES OUT2",
    "6": "AES OUT4",
    "7": "Analog IN Left",
    "8": "Not Connected",
    "9": "Analog IN Right",
    "10": "Not Connected"
   }
  },
  {
   "short": "1×8 AES DA, 110 Ω",
   "label": "D6202A 1×8 / dual 1×4 AES distribution amplifier, 110 Ω",
   "src": "#OPEN GEAR - #Engineering/…/openGear Rear Module Guides/D6202A - rear module options.pdf",
   "pins": {
    "BNC1": [
     "IN 1",
     "in",
     "aes110"
    ],
    "BNC2": [
     "not connected",
     "nc",
     "nc"
    ],
    "AES1": [
     "OUT 1",
     "out",
     "aes110"
    ],
    "AES2": [
     "OUT 2",
     "out",
     "aes110"
    ],
    "AES3": [
     "OUT 3",
     "out",
     "aes110"
    ],
    "AES4": [
     "OUT 4",
     "out",
     "aes110"
    ],
    "AES5": [
     "OUT 5",
     "out",
     "aes110"
    ],
    "AES6": [
     "OUT 6",
     "out",
     "aes110"
    ],
    "AES7": [
     "OUT 7",
     "out",
     "aes110"
    ],
    "AES8": [
     "OUT 8",
     "out",
     "aes110"
    ]
   },
   "id": "D6202A",
   "guide": {
    "1": "IN 1",
    "2": "Not Connected",
    "3": "OUT 1",
    "4": "OUT 5",
    "5": "OUT 2",
    "6": "OUT 6",
    "7": "OUT 3",
    "8": "OUT 7",
    "9": "OUT 4",
    "10": "OUT 8"
   }
  },
  {
   "short": "1×8 / 2×4 AES DA, 110 Ω",
   "label": "D6202B 1×8 / 2×4 AES distribution amplifier, 110 Ω",
   "src": "#OPEN GEAR - #Engineering/…/openGear Rear Module Guides/D6202B - rear module options.pdf",
   "pins": {
    "BNC1": [
     "IN 1",
     "in",
     "aes110"
    ],
    "BNC2": [
     "IN 2",
     "in",
     "aes110"
    ],
    "AES1": [
     "OUT1-1",
     "out",
     "aes110"
    ],
    "AES2": [
     "OUT1-2",
     "out",
     "aes110"
    ],
    "AES3": [
     "OUT1-3",
     "out",
     "aes110"
    ],
    "AES4": [
     "OUT1-4",
     "out",
     "aes110"
    ],
    "AES5": [
     "OUT2-1",
     "out",
     "aes110"
    ],
    "AES6": [
     "OUT2-2",
     "out",
     "aes110"
    ],
    "AES7": [
     "OUT2-3",
     "out",
     "aes110"
    ],
    "AES8": [
     "OUT2-4",
     "out",
     "aes110"
    ]
   },
   "id": "D6202B",
   "guide": {
    "1": "IN 1",
    "2": "IN 2",
    "3": "OUT1-1",
    "4": "OUT2-1",
    "5": "OUT1-2",
    "6": "OUT2-2",
    "7": "OUT1-3",
    "8": "OUT2-3",
    "9": "OUT1-4",
    "10": "OUT2-4"
   }
  },
  {
   "short": "analog audio DA",
   "label": "AA6201A 1×8 / 2×4 / dual 2×3 analog audio distribution amplifier",
   "src": "#OPEN GEAR - #Engineering/…/openGear Rear Module Guides/AA6101A - Rear Module Guide.pdf (the AA6201A sheet)",
   "pins": {
    "BNC1": [
     "IN 1",
     "in",
     "analog"
    ],
    "BNC2": [
     "IN 2",
     "in",
     "analog"
    ],
    "AES1": [
     "OUT1-1",
     "out",
     "analog"
    ],
    "AES2": [
     "OUT1-2",
     "out",
     "analog"
    ],
    "AES3": [
     "OUT1-3",
     "out",
     "analog"
    ],
    "AES4": [
     "OUT1-4",
     "out",
     "analog"
    ],
    "AES5": [
     "OUT2-1",
     "out",
     "analog"
    ],
    "AES6": [
     "OUT2-2",
     "out",
     "analog"
    ],
    "AES7": [
     "OUT2-3",
     "out",
     "analog"
    ],
    "AES8": [
     "OUT2-4",
     "out",
     "analog"
    ]
   },
   "id": "AA6201A",
   "guide": {
    "1": "IN 1",
    "2": "IN 2",
    "3": "OUT1-1",
    "4": "OUT2-1",
    "5": "OUT1-2",
    "6": "OUT2-2",
    "7": "OUT1-3",
    "8": "OUT2-3",
    "9": "OUT1-4",
    "10": "OUT2-4"
   }
  }
 ],
 "tutorial": {
  "card": "D6202A",
  "issueHint": "Pick ISS1 with the D6202A: its IN 1 pin (BNC1) has no connector at all, and the blocks at 9 and 10 land on BNC9/BNC10 pins the card never reads."
 },
 "findings": [
  "<b>ISS1 put the inputs at the bottom, on the wrong pins.</b> In <span class=\"mono\">T6303.net</span> the two single-ended blocks TB9/TB10 go to BNC9_SIG/BNC9_GND (P101-5, 3–8) and BNC10 (P101-12, 9–14), and TB1–TB8 carry AES1–AES8. Every card in the guides takes its input on BNC1/BNC2 (P101-97 / 92). From ISS2 on, TB1/TB2 carry BNC1/BNC2 and TB3–TB10 carry AES1–AES8, and that is what the ISS4 copper shows. All issues keep the same 3K57/3K57 ID, so a card cannot tell an ISS1 module. ISS1 positions are drawn where ISS4 puts the same reference designators <span class=\"tag-inf\">inferred</span>.",
  "<b>No netlist for the current issue.</b> ISS4 exists only as P-CAD binaries (<span class=\"mono\">T6303-iss4.sch/.pcb</span>) and Gerbers. Its nets were traced here from the ISS4 copper (TOP, BOT and both inner planes): all ten blocks land on the same pins as <span class=\"mono\">T6303-iss3.net</span>.",
  "<b>AN_BMID2 equals AN_BMID.</b> The type value is 3K57, the same as the base value, so both ADC channels read bin 7 and the card prints “7.7”. Ross later used exactly 3K57/3K57 for its own “10 AUD Full” module (DevGuide Appendix B), so the codes clash outright.",
  "<b>The silkscreen says T6303A.</b> The ISS4 copper is labelled “T6303A ▪ −B ▪”, the sold part number; the AA6201A guide also names the T6303A. The T6303A folder holds only the procurement package for the same ISS4 board (identical Gerber layers except the paste stencil).",
  "<b>Duplicate CAD files.</b> <span class=\"mono\">T6303.cdr, T6303-iss2.cdr, T6303.dwg</span> sit both in <span class=\"mono\">T6303 - #ENGINEERING</span> and in its <span class=\"mono\">#ARCHIVE</span> subfolder, and the ISS4 Gerbers are zipped twice (<span class=\"mono\">T6303-ISS4 - #Gerbers.zip</span> at the top and <span class=\"mono\">#GERBERS/T6303-ISS4.zip</span>).",
  "<b>The 110 Ω D6203A has no reference termination here.</b> REF IN arrives on a terminal block (TB1 + and −), straight to P101-97 and the isolated BNC1_GND pins; any 75 Ω termination must be on the card <span class=\"tag-inf\">inferred</span>."
 ],
 "sources": [
  "T6303 - #ENGINEERING/T6303 - #PCB/T6303 - #OBSOLETE/T6303.net, T6303-iss2.net, iss3/T6303-iss3.net, iss3/T6303-iss3.pnp; T6303-iss4.sch/.pcb (binary)",
  "T6303-ISS4 - #Gerbers.zip (T6303-ISS4.TOP/BOT/GND1/GND2/TSM/BSM/TSS/BSS/NCD); T6303 - #GERBERS/Iss3/T6303-ISS3.*",
  "T6303A - #Master #OPENGEAR #TERMINATION/T6303A-ISS4 PNP.pnp, T6303-ISS4 BOM PCAD.bom",
  "#OPEN GEAR - #Engineering/…/openGear Rear Module Guides/AA6101A - Rear Module Guide.pdf, D6202A, D6202B, D6203A - rear module options.pdf",
  "D6203A - #Master #OPENGEAR/D6203A #Functional/D6203-T6302.pdf (balanced AES pairs)",
  "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/OpenGear Frame Address ID.xls (sheet “Rear Module ID”)",
  "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGearDevGuideSet/openGear DevGuide Part I_rev3.pdf (MEC1 pinout, Rear Module Identification, Appendix B)",
  "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/OGP_SDK - #Engineering/ZTC-8399/zeuslib/common/adclib.c, board.c; application/ztcboard.c",
  "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/…/application/boardimp.c (getRearModuleId, getRearModuleName)"
 ],
 "family": "openGear",
 "slots": [
  "P101"
 ]
};
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';

/* ---- CorelDRAW rear-module art (artwork pass 2026|59) ----
   Each issue's “REAR MODULE PINOUTS” sheet (.cdr, libcdr → SVG, hairlines restored, sheet furniture removed: GENERIC title,
   frame, pinout arrows, SINGLE CARD TERMINATION / ISSUE captions) recoloured as the built module: green PCB, silver BNCs,
   white silk. view/plate in inches; pos = connector centres from the drawing, inches from the plate's top-left corner;
   iso = BNCs the drawing shades grey (isolated-shell positions). */
const CDR_ART = {"iss4":{"file":"t6303-rear.svg","src":"#OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION/T6303 - #ENGINEERING/T6303-iss2.cdr","label":"T6303-iss2.cdr","date":"5 Mar 2007","view":[2.354,3.774],"plate":[0.547,0.314,1.31,3.293],"pos":{"1":[0.168,0.493],"2":[0.867,0.493],"3":[0.168,1.118],"4":[0.867,1.118],"5":[0.168,1.743],"6":[0.867,1.743],"7":[0.168,2.368],"8":[0.867,2.368],"9":[0.173,2.993],"10":[0.867,2.993]},"legend":{"1":"BNC1","2":"BNC2","3":"AES1","4":"AES5","5":"AES2","6":"AES6","7":"AES3","8":"AES7","9":"AES4","10":"AES8"},"iso":[]},"iss3":{"file":"t6303-rear.svg","src":"#OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION/T6303 - #ENGINEERING/T6303-iss2.cdr","label":"T6303-iss2.cdr","date":"5 Mar 2007","view":[2.354,3.774],"plate":[0.547,0.314,1.31,3.293],"pos":{"1":[0.168,0.493],"2":[0.867,0.493],"3":[0.168,1.118],"4":[0.867,1.118],"5":[0.168,1.743],"6":[0.867,1.743],"7":[0.168,2.368],"8":[0.867,2.368],"9":[0.173,2.993],"10":[0.867,2.993]},"legend":{"1":"BNC1","2":"BNC2","3":"AES1","4":"AES5","5":"AES2","6":"AES6","7":"AES3","8":"AES7","9":"AES4","10":"AES8"},"iso":[]},"iss2":{"file":"t6303-rear.svg","src":"#OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION/T6303 - #ENGINEERING/T6303-iss2.cdr","label":"T6303-iss2.cdr","date":"5 Mar 2007","view":[2.354,3.774],"plate":[0.547,0.314,1.31,3.293],"pos":{"1":[0.168,0.493],"2":[0.867,0.493],"3":[0.168,1.118],"4":[0.867,1.118],"5":[0.168,1.743],"6":[0.867,1.743],"7":[0.168,2.368],"8":[0.867,2.368],"9":[0.173,2.993],"10":[0.867,2.993]},"legend":{"1":"BNC1","2":"BNC2","3":"AES1","4":"AES5","5":"AES2","6":"AES6","7":"AES3","8":"AES7","9":"AES4","10":"AES8"},"iso":[]},"iss1":{"file":"t6303-rear-iss1.svg","src":"#OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION/T6303 - #ENGINEERING/T6303.cdr","label":"T6303.cdr","date":"15 Nov 2006","view":[2.375,3.774],"plate":[0.547,0.314,1.31,3.293],"pos":{"1":[0.168,0.493],"2":[0.867,0.493],"3":[0.168,1.118],"4":[0.867,1.118],"5":[0.168,1.743],"6":[0.867,1.743],"7":[0.168,2.368],"8":[0.867,2.368],"9":[0.173,2.993],"10":[0.867,2.993]},"legend":{"1":"AES1","2":"AES5","3":"AES2","4":"AES6","5":"AES3","6":"AES7","7":"AES4","8":"AES8","9":"BNC9","10":"BNC10"},"iso":[]}};
function cdrArt(){ return S.view==='cdr' ? (CDR_ART[S.issue]||null) : null; }
function cdrXY(p, art){ return art && art.pos[p.n] ? art.pos[p.n] : [p.x, p.y]; }
function cdrCaption(art){ return 'CorelDRAW art: '+SIM.src(art.src, art.label)+' ('+art.date+')'; }
DATA.findings.unshift(`<b>Artwork ${SIM.year(2026)}: rear panel now from ${SIM.src(CDR_ART.iss2.src,'T6303-iss2.cdr')} (5 Mar 2007, ISS2–ISS4) and ${SIM.src(CDR_ART.iss1.src,'T6303.cdr')} (15 Nov 2006, ISS1).</b> ISS1 is legended AES1–AES4 / AES5–AES8 on blocks 1–8 and BNC9/BNC10 on blocks 9/10; ISS2 moves BNC1/BNC2 to blocks 1/2 and shifts AES1–AES4 down, matching the netlists. The sheet carries the numbers 1–10 above each block and the polarity legend “G-+-G” between each pair. Its 1.310″ × 3.293″ outline and rows match the ISS4 Gerbers (2012) to within 0.03″, so the 2007 drawing still fits the last board; both sheets say SINGLE CARD TERMINATION.`);
DATA.sources.push("#OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION/T6303 - #ENGINEERING/T6303-iss2.cdr, #OPENGEAR #SERIES/T6303 - #Master #OPENGEAR #TERMINATION/T6303 - #ENGINEERING/T6303.cdr (CorelDRAW rear-module pinout art → assets/t6303-rear-iss1.svg, t6303-rear.svg)");
const ID = DATA.id, FLAG = '__' + ID + 'Active';
const inf = (why)=>`<span class="tag-inf" title="${why?('Not stated in the source; inferred from '+why):'Not stated in the source; inferred'}">inferred</span>`;
const yr = y => SIM.year(y);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const SLOTS = DATA.slots || ['P101'];
const DUAL = SLOTS.length > 1;

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
  gpi:   {short:'GPI/O', label:'GPI/O contact (circuit not documented in the module files)', kind:'gpi', z:100, voc:5.0, spec:'contact closure / logic level (not documented)', minRx:0.5, unit:'Vpp', bal:true, loads:['open','10k']},
  nc:    {short:'—', label:'not connected',            kind:'nc',  z:0, voc:0, spec:'—', unit:'', loads:['open']},
};
const LOADZ = {'75':75,'37.5':37.5,'110':110,'55':55,'600':600,'10k':10000,'open':1e9};
const CARD_RX_Z = {aes75:75, sdi:75, video:75, ref:75, aes110:110, analog:10000, meta:110, gpi:10000};

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
  ['T6309 (reserved)',3570,1470,'WBS','ID.xls'],['T6310 (reserved)',3570,1270,'WBS','ID.xls'],
  ['T6401',3570,1130,'WBS','ID.xls'],['T6402',3570,1000,'WBS','ID.xls'],['T6403',3570,887,'WBS','ID.xls'],['T6404 (reserved)',3570,787,'WBS','ID.xls'],['T6405 (reserved)',3570,681,'WBS','ID.xls'],['T6406',3570,604,'WBS','ID.xls'],
  ['T6407 (reserved)',3570,523,'WBS','ID.xls'],['T6408 (reserved)',3570,453,'WBS','ID.xls'],['T6409 (reserved)',3570,392,'WBS','ID.xls'],['T6410 (reserved)',3570,332,'WBS','ID.xls'],
].concat(DATA.extraAlloc||[]);
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
function freshRR(){ const o={}; SLOTS.forEach(s=>o[s]={fit1:true,fit2:true,r1:null,r2:null}); return o; }
function defCards(){ const o={}; SLOTS.forEach((s,i)=>o[s]=(DATA.defaultCards&&DATA.defaultCards[s])||DATA.cards[0].id); return o; }
const S = {
  issue: DATA.defaultIssue, cards: defCards(), sel: 1, cable:{}, load:{}, srcLvl:0, padC:0.45,
  rr: freshRR(), idReads:0, idReadSlots:{}, idAt:null, showRL:false, view:'cdr',
  log:[], last:null, blockSel:'p101',
};
function I(){ return DATA.issues[S.issue]; }
function P(n){ return I().pos.find(p=>p.n===n); }
function lab(n){ const p=P(n); return p&&p.lab? p.lab : String(n); }
function cardAt(slot){ return DATA.cards.find(c=>c.id===S.cards[slot]) || DATA.cards[0]; }
function cardObj(){ const p=P(S.sel); return cardAt(p? p.slot : SLOTS[0]); }
function cardsForIssue(){ return DATA.cards.filter(c=>!c.issues || c.issues.includes(S.issue)); }
function role(n){ const p=P(n); if(!p) return {name:'—',dir:'nc',sig:'nc',note:''}; const c=cardAt(p.slot); const r=c.pins[p.key];
  return r? {name:r[0], dir:r[1], sig:r[2], note:r[3]||''} : {name:'not used by '+c.id, dir:'nc', sig:'nc', note:''}; }
function guideOf(n){ const p=P(n); if(!p) return null; const c=cardAt(p.slot); return c.guide? (c.guide[p.n]!=null? c.guide[p.n] : null) : null; }
function idSlot(){ const p=P(S.sel); return p? p.slot : SLOTS[0]; }
function idDesign(slot){ return I().ids[slot||SLOTS[0]]; }
function R1(slot){ slot=slot||idSlot(); const q=S.rr[slot]; return !q.fit1 ? OPEN : (q.r1!=null? q.r1 : idDesign(slot).bmid); }
function R2(slot){ slot=slot||idSlot(); const q=S.rr[slot]; return !q.fit2 ? OPEN : (q.r2!=null? q.r2 : idDesign(slot).bmid2); }
function loadOf(n){ const r=role(n); const L=S.load[n]||(SIG[r.sig]||SIG.nc).loads[0]; return L; }
function slotTxt(slot){ return DUAL? `${slot}${DATA.slotNames&&DATA.slotNames[slot]?' ('+DATA.slotNames[slot]+')':''}` : slot; }

/* level at the connector for position n */
function level(n){
  const r=role(n), sg=SIG[r.sig]||SIG.nc, p=P(n);
  const o={sg, r, plugged:!!S.cable[n], txt:'', v:0, ok:false, rx:false};
  if (r.sig==='nc'){ o.txt = 'The card in '+(p?p.slot:'this slot')+' leaves this pin unused: anything on this connector goes nowhere.'; return o; }
  const k = Math.pow(10, S.srcLvl/20);
  if (r.dir==='in'){
    if (!o.plugged){ o.txt='No cable: the card input sees nothing (loss of signal).'; return o; }
    const zin = CARD_RX_Z[r.sig]||75, voc = sg.voc*k;
    o.v = voc*zin/(sg.z+zin); o.rx = o.v >= (sg.minRx||0);
    o.txt = `External source ${sg.z} Ω, ${fmtV(voc,sg)} open-circuit → card input ${zin>=10000?'10 kΩ bridging':zin+' Ω'} → ${fmtV(o.v,sg)} at the card`; o.ok=o.rx; return o;
  }
  const zl = o.plugged ? LOADZ[loadOf(n)] : 1e9, voc = sg.voc*k;
  o.v = voc*zl/(sg.z+zl); o.zl=zl;
  const nom = sg.voc/2; o.ok = o.plugged && (sg.kind==='gpi' ? true : Math.abs(o.v/nom-1) < 0.21);
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
  let A=[1,0],B=[0,0],Cc=Y,D=[1,0];
  let A2=A, B2=C.add(C.mul(A,Zs),B), C2=Cc, D2=C.add(C.mul(Cc,Zs),D);
  let A3=C.add(A2,C.mul(B2,Y)), B3=B2, C3=C.add(C2,C.mul(D2,Y)), D3=D2;
  const Zin = C.div(C.add(C.mul(A3,Z0),B3), C.add(C.mul(C3,Z0),D3));
  const g = C.div(C.add(Zin,[-75,0]), C.add(Zin,[75,0]));
  return 20*Math.log10(Math.max(1e-6,C.abs(g)));
}

/* ---------------- routing text ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  S.last={name, tr, t:SIM.t}; S.log.unshift({name,t:SIM.t}); if (S.log.length>40) S.log.length=40;
  SIM.refresh();
}
function pinsOf(p){ return p.pins; }
function sigPinTxt(p){ const q=p.pins; return p.kind==='tb'? q.p+'/'+q.n : String(q.sig); }
function retTxt(p){ const q=p.pins; if (!q.ret) return 'GNDD plane'; return p.slot+'-'+q.ret.join(','); }
function seriesTxt(p){ return p.L? p.L+' '+p.Lv+(p.R?' ‖ '+p.R+' '+p.Rv:'') : (p.kind==='bnc'?'direct track':''); }
function routeTrace(n, tr){
  const p=P(n), r=role(n), c=cardAt(p? p.slot : SLOTS[0]);
  if (!p){ tr('Position '+n+' is empty on this issue.'); return; }
  const q=p.pins, tp=p.tbPins||[1,2,3];
  const chain = p.kind==='bnc'
    ? `${p.ref} centre pin → ${seriesTxt(p)} → net ${p.nets.sig} → ${p.slot}-${q.sig} (${pinName(q.sig)})`
    : p.kind==='tb' ? `${p.ref} pin${tp[0]} (+) → net ${p.nets.p} → ${p.slot}-${q.p} ; pin${tp[1]} (−) → ${p.nets.n} → ${p.slot}-${q.n} ; pin${tp[2]} → GNDD`
    : `${p.ref} pin${tp[0]} (+) → ${p.nets.sig} → ${p.slot}-${q.sig} ; pin${tp[1]} (−) → ${p.nets.ret} → ${retTxt(p)} ; pin${tp[2]} → ${p.g3||'GNDD'}`;
  tr(chain);
  tr(`Card ${c.id} in ${slotTxt(p.slot)}: card pin “${p.key}” is ${r.dir==='nc'? 'unused' : '“'+r.name+'”'} (${r.dir==='in'?'input':r.dir==='out'?'output':r.dir==='io'?'in/out':'no signal'}, ${(SIG[r.sig]||SIG.nc).label})`);
  const g=guideOf(n); if (g!=null) tr(`Rear-module guide prints “${g}” for position ${lab(n)}${r.dir==='nc'&&g&&!/not connected|reserved/i.test(g)?' — but this issue routes it to a pin the card does not use':''}`);
  if ((I().bused||[]).includes(p.key)) tr(`Warning: on this issue ${p.key} is also tied to the same pin of the other connector (net shared by P101 and P102).`);
  tr('Ground: '+gndText(p));
}
function gndText(p){
  if (p.kind==='tb') return 'terminal G pin to GNDD (signal ground plane)';
  if (p.kind==='tbu') return `− leg on ${p.nets.ret}${p.pins.ret?', carried to the card on '+p.pins.ret.length+' pins':' (GNDD)'}; the card sees a single-ended or pseudo-balanced pair`;
  if (p.gnd==='gndd') return 'shell bonded straight to GNDD';
  if (p.gnd==='iso') return `shell on isolated net ${p.nets.ret}, carried to the card on ${p.pins.ret.length} pins; no capacitor on the module`;
  return `shell on isolated net ${p.nets.ret}, AC-coupled to ${p.capTo||'GNDD'} by ${p.caps.join(', ')} (${p.caps.length} × 0.1 µF)`;
}
/* card pins with a job that land on no connector of this issue, per slot */
function lostOf(slot){
  const c=cardAt(slot), have=new Set(I().pos.filter(p=>p.slot===slot).map(p=>p.key));
  return Object.keys(c.pins).filter(k=>c.pins[k][1]!=='nc' && !have.has(k)).map(k=>({key:k, name:c.pins[k][0], dir:c.pins[k][1]}));
}

/* ---------------- panel drawing ---------------- */
const PX = 100; // SVG units per inch
function panelSVG(opts){
  opts=opts||{};
  const iss=I(), art=cdrArt(), W=(art?art.plate[2]:iss.w)*PX, H=(art?art.plate[3]:iss.h)*PX, LX=art?art.plate[0]*PX:0, RX=art?(art.view[0]-art.plate[0]-art.plate[2])*PX:0, M=185+LX, TOP=(DUAL?38:20)+(art?art.plate[1]*PX:0);
  const img = S.view==='card' ? iss.img+'-card.png' : iss.img+'-rear.png';
  let s=`<svg viewBox="0 0 ${W+2*M+RX-LX} ${H+TOP+28+(art?16:0)}" style="width:100%;max-width:${opts.max||560}px;display:block;margin:auto" role="img" aria-label="${DATA.product} rear module drawn from ${esc(iss.art)}">
   <defs><filter id="${ID}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
   ${art? `<image href="${ASSET}${art.file}" x="${M-LX}" y="${TOP-art.plate[1]*PX}" width="${art.view[0]*PX}" height="${art.view[1]*PX}"/>`
     : `<rect x="${M-4}" y="${TOP-4}" width="${W+8}" height="${H+8}" rx="5" fill="#0b0c0d"/>
   <image href="${ASSET}${img}" x="${M}" y="${TOP}" width="${W}" height="${H}" preserveAspectRatio="none"/>`}`;
  if (S.view==='card'){
    s+=`<text x="${M+W/2}" y="12" text-anchor="middle" font-size="11" fill="var(--ink2)">card side (${iss.cardSide}) — ${SLOTS.join(' and ')} face the card${DUAL?'s':''}</text></svg>`;
    return s;
  }
  s+=`<text x="${M+W/2}" y="12" text-anchor="middle" font-size="11" fill="var(--ink2)">connector face, seen from behind the frame (${art?'CorelDRAW pinout sheet':iss.face})</text>`;
  if (DUAL) SLOTS.forEach((sl,i)=>{ const x = i===0? M-6 : M+W+6; s+=`<text x="${x}" y="30" text-anchor="${i===0?'end':'start'}" font-size="11" font-weight="700" fill="var(--accent)">${i===0?'◀ ':''}${sl} · ${esc(cardAt(sl).id)}${i===0?'':' ▶'}</text>`; });
  (art?[]:(iss.blocks||[])).forEach(b=>{ s+=`<rect x="${M+b.x*PX-15}" y="${TOP+b.y0*PX-9}" width="30" height="${(b.y1-b.y0)*PX+18}" rx="3" fill="none" stroke="#b9b9b0" stroke-width="1.2" stroke-dasharray="3 2"/><text x="${M+b.x*PX}" y="${TOP+b.y0*PX-12}" text-anchor="middle" font-size="9" fill="var(--ink2)">${b.ref}</text>`; });
  iss.pos.forEach(p=>{
    const q=cdrXY(p,art), x=M+q[0]*PX, y=TOP+q[1]*PX, r=role(p.n), sel=S.sel===p.n, plug=!!S.cable[p.n], L=level(p.n);
    const col = r.dir==='in'? 'var(--accent2)' : r.dir==='out'||r.dir==='io'? 'var(--accent)' : '#777';
    const g=guideOf(p.n), warn = r.dir==='nc' && g && !/not connected|reserved/i.test(g);
    if (p.kind==='bnc'){
      s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="27" fill="transparent"/>
        <circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${sel?'#ffd34d':warn?'var(--bad)':'#b9b9b0'}" stroke-width="${sel?4:2}"/>
        ${plug?`<circle cx="${x}" cy="${y}" r="17" fill="#2d63a6" stroke="#9cc3ff" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="#d6e6ff"/>`:''}
        ${L.v>0&&plug?`<circle cx="${x+18}" cy="${y-18}" r="5" fill="${L.ok||L.rx?'var(--led-g)':'var(--led-a)'}" filter="url(#${ID}glow)"/><circle cx="${x+18}" cy="${y-18}" r="4" fill="${L.ok||L.rx?'var(--led-g)':'var(--led-a)'}"/>`:''}</g>`;
    } else {
      const np = p.blk? 2 : 3, hh=p.pitch*PX*np+(p.blk?4:10), offs = p.blk? [-0.5,0.5] : [-1,0,1];
      s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><rect x="${x-14}" y="${y-hh/2}" width="28" height="${hh}" rx="3" fill="${plug?'#1f8a45':'transparent'}" fill-opacity="${plug?0.85:0}" stroke="${sel?'#ffd34d':warn?'var(--bad)':'#b9b9b0'}" stroke-width="${sel?3.5:1.4}"/>
        ${plug?offs.map(d=>`<circle cx="${x}" cy="${y+d*p.pitch*PX}" r="4.5" fill="#0d3a1c"/>`).join(''):''}
        ${L.v>0&&plug?`<circle cx="${x+18}" cy="${y-hh/2+3}" r="4.5" fill="${L.ok||L.rx?'var(--led-g)':'var(--led-a)'}"/>`:''}</g>`;
    }
    const left = p.x < iss.w/2, tx = left? M-LX-10 : M+W+RX+10, an=left?'end':'start';
    if (p.blk){
      s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><text x="${tx}" y="${y-1}" text-anchor="${an}" font-size="11" font-weight="700" fill="${sel?'var(--warn)':warn?'var(--bad)':'var(--ink)'}">${esc(lab(p.n))} · ${esc(r.name)}</text>
        <text x="${tx}" y="${y+10}" text-anchor="${an}" font-size="9" fill="${col}">${r.dir==='nc'?'—':(r.dir==='in'?'◀ in':'out ▶')} ${esc((SIG[r.sig]||SIG.nc).short)} · ${p.ref}-${p.tbPins[0]}/${p.tbPins[1]}</text></g>`;
    } else {
      s+=`<g class="pos" data-n="${p.n}" style="cursor:pointer"><text x="${tx}" y="${y-3}" text-anchor="${an}" font-size="13" font-weight="700" fill="${sel?'var(--warn)':warn?'var(--bad)':'var(--ink)'}">${esc(lab(p.n))} · ${esc(r.name)}</text>
        <text x="${tx}" y="${y+12}" text-anchor="${an}" font-size="10" fill="${col}">${r.dir==='nc'?'—':(r.dir==='in'?'◀ in':'out ▶')} ${esc((SIG[r.sig]||SIG.nc).short)}</text>
        <text x="${tx}" y="${y+24}" text-anchor="${an}" font-size="9.5" fill="var(--ink2)">${p.ref}${p.L?' · '+p.L+(p.R?'‖'+p.R:''):''} · ${p.slot}-${sigPinTxt(p)}</text></g>`;
    }
  });
  s+=`<text x="${M+W/2}" y="${H+TOP+22+(art?16:0)}" text-anchor="middle" font-size="10" fill="var(--ink2)">${art? 'plate '+art.plate[2].toFixed(3)+'″ × '+art.plate[3].toFixed(3)+'″ as drawn, 1:1' : iss.w.toFixed(3)+'″ × '+iss.h.toFixed(3)+'″ at 1:1 scale'}</text></svg><div class="small muted" style="text-align:center">${art? cdrCaption(art)+' · View → Gerber silk shows the PCB' : 'Artwork: '+esc(iss.art)}</div>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.pos').forEach(g=>{
    g.addEventListener('click', ()=>A.select(+g.dataset.n));
    g.addEventListener('dblclick', e=>{ e.preventDefault(); A.plug(+g.dataset.n); });
  });
}
const A = {
  select(n){ act('Select position '+lab(n), tr=>{ S.sel=n; routeTrace(n,tr); }); },
  plug(n){ act((S.cable[n]?'Unplug':'Plug')+' cable at position '+lab(n), tr=>{ S.cable[n]=!S.cable[n]; S.sel=n; routeTrace(n,tr); const L=level(n); tr(L.txt); }); },
  setLoad(n,v){ act('Set far-end load on '+lab(n)+' to '+v, tr=>{ S.load[n]=v; const L=level(n); tr(L.txt); if (v==='open' && L.sg.unit==='Vpp' && L.sg.kind!=='gpi') tr('Unterminated: the line is not loaded, so the voltage doubles. A long cable will also reflect the signal back to the card.'); }); },
  setCard(slot,id){ act('Mate '+slot+' with card '+id, tr=>{ S.cards[slot]=id; const c=cardAt(slot); tr('Card '+c.id+': '+c.label); tr('Source: '+c.src); const lost=lostOf(slot); if (lost.filter(l=>l.dir==='in').length) tr('Card inputs with no connector on this issue: '+lost.filter(l=>l.dir==='in').map(l=>l.key+' “'+l.name+'”').join(', ')); }); },
  setIssue(k){ act('Switch to '+DATA.issues[k].label, tr=>{ S.issue=k; S.rr=freshRR(); const iss=I(); tr('Netlist '+iss.netlist+' · artwork '+iss.art); SLOTS.forEach(sl=>tr(sl+' ID: AN_BMID '+rFmt(iss.ids[sl].bmid)+', AN_BMID2 '+rFmt(iss.ids[sl].bmid2))); if (!P(S.sel)) S.sel=iss.pos[0].n; SLOTS.forEach(sl=>{ if (!cardsForIssue().find(c=>c.id===S.cards[sl])) S.cards[sl]=cardsForIssue()[0].id; }); }); },
  readId(){ const slot=idSlot(); act('Card in '+slot+' reads the rear-module ID', tr=>{
    S.idReads++; S.idReadSlots[slot]=(S.idReadSlots[slot]||0)+1; S.idAt=SIM.t;
    const r1=R1(slot), r2=R2(slot), a1=adcOf(r1), a2=adcOf(r2), b1=binOf(a1), b2=binOf(a2), ds=idDesign(slot);
    tr(`Card ${cardAt(slot).id} on ${slot}: getRearModuleId() → getRearModuleType() → getAdcBin(ADC_BMTYPE=1)`);
    tr(`getAdcValue(1): ADMUX = BIT(REFS0)|1 = 0x41 · ADCSRA = BIT(ADEN)|ADPS2..0 = 0x87 · ADCSRA |= BIT(ADSC) · spin while ADSC`);
    tr(`AN_BMID (${slot}-2, ${ds.r1}): ${rFmt(r1)} with the card's 1K00 pull-up to 3V3 → ${(3.3*(r1>=OPEN?1:r1/(r1+1000))).toFixed(3)} V → ADC = ${a1} → 32 − (${a1}+16)/32 = bin ${b1}`);
    tr(`getOptionCardType() → getAdcBin(ADC_DAUGHTER=4): AN_BMID2 (${slot}-1, ${ds.r2}) ${rFmt(r2)} → ADC = ${a2} → bin ${b2}`);
    tr(`rmId = (${b2} << 8) | ${b1} = 0x${((b2<<8)|b1).toString(16).padStart(4,'0')} · getRearModuleName() prints "%d.%d " with & 0x0F → “${(b2&15)+'.'+(b1&15)}”`);
    const m=ALLOC.filter(a=>idOf(a[1],a[2]).rm===((b2<<8)|b1)).map(a=>a[0]);
    tr(m.length? 'Allocation table match: '+m.join(', ') : (b1===0&&b2===0? 'Both open: the card reports no rear module.' : 'No entry in the allocation table has this code.'));
    if (m.filter(x=>!x.startsWith(DATA.product)).length && m.some(x=>/^T6/.test(x))) tr('CLASH: another module answers with the same code; the card cannot tell them apart.');
  }); },
  setR(which,v){ const slot=idSlot(); act('Change '+slot+' '+(which===1?'AN_BMID':'AN_BMID2')+' to '+rFmt(v), tr=>{ const q=S.rr[slot]; if(which===1){q.r1=v;q.fit1=v<OPEN;} else {q.r2=v;q.fit2=v<OPEN;} const d=idOf(R1(slot),R2(slot)); tr('Code '+d.disp+' (rmId 0x'+d.rm.toString(16).padStart(4,'0')+')'); }); },
  reset(){ act('Reset the bench', tr=>{ Object.assign(S,{issue:DATA.defaultIssue,cards:defCards(),sel:1,cable:{},load:{},srcLvl:0,rr:freshRR(),idReads:0,idReadSlots:{},idAt:null,showRL:false,view:'cdr'}); tr('Default issue, default cards, no cables.'); }); },
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
  ls.push({label:'Card reads ID ('+idSlot()+'): ADC1, ADC4', h:26, draw(c,X,a,b,y,h){
    const segs=[[t0id,ADC_FIRST,'ADC1'],[t0id+ADC_FIRST+20e-6,ADC_NEXT,'ADC4']];
    segs.forEach(([t,d,l])=>{ c.fillStyle=css('--warn'); c.fillRect(X(t),y+4,Math.max(2,X(t+d)-X(t)),h-8); c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); if (X(t+d)-X(t)>30) c.fillText(l,X(t)+3,y+h/2+4); });
    c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText(S.idAt!=null?'read when you pressed “Card reads ID”':'read at card power-up (t = 0)', X(t0id)+Math.max(8,X(t0id+0.0004)-X(t0id)), y+h/2+4);
  }});
  ls.push({label:'Cable at position '+lab(n), h:22, draw(c,X,a,b,y,h){ c.fillStyle=S.cable[n]?css('--accent2'):css('--grid'); c.fillRect(X(a),y+6,X(b)-X(a),h-12); c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(S.cable[n]?'plugged — '+L.txt.slice(0,90):'no cable', X(a)+6, y+h/2+4); }});
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
  } else if (sg.kind==='gpi'){
    ls.push({label:'GPI/O state (static contact)', h:24, draw(c,X,a,b,y,h){ c.fillStyle=S.cable[n]?css('--accent'):css('--grid'); c.fillRect(X(a),y+6,X(b)-X(a),h-12); c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(S.cable[n]?'closed: the card polls it, no timing structure':'open',X(a)+6,y+h/2+4); }});
  }
  ls.push({label:'Transit through the module', h:22, draw(c,X,a,b,y,h){ c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText(`≈ ${transit().toFixed(0)} ps from connector to ${P(S.sel)?P(S.sel).slot:'P101'} (${inf().replace(/<[^>]+>/g,'')}: ~2″ of track at ~170 ps/inch) — far below one bit cell`, X(a)+6, y+h/2+4); }});
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
  if (!live || sg.kind==='nc'){ c.fillText(sg.kind==='nc'?'Pin unused by the card on this slot.':'No signal (input has no cable).',16,80); return; }
  const scale = 60/Math.max(1, sg.unit==='dBu'? 1.228*1.4142*2 : Math.max(2, sg.voc));
  const trace=(f,col,off)=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=600;i++){ const x=10+i*(w-20)/600; const v=f(i/600); const y=75+(off||0)-v*scale; i?c.lineTo(x,y):c.moveTo(x,y);} c.stroke(); };
  let label='';
  if (sg.kind==='aes'){
    const frame=Math.floor(t*FS), cells=[]; const pre=(frame%192===0)?[1,1,1,0,1,0,0,0]:[1,1,1,0,0,0,1,0];
    let lv=0; pre.forEach(b=>cells.push(b));
    let seed=frame*2654435761>>>0; lv=pre[7];
    for(let i=0;i<28;i++){ seed=(seed*1103515245+12345)>>>0; const bit=(seed>>16)&1; lv^=1; cells.push(lv); if(bit) lv^=1; cells.push(lv); }
    while(cells.length<64) cells.push(lv);
    const amp=vpp/2;
    if (sg.bal){ trace(u=>cells[Math.min(63,Math.floor(u*64))]?amp/2:-amp/2,acc,-20); trace(u=>cells[Math.min(63,Math.floor(u*64))]?-amp/2:amp/2,a2,20); label='+ leg and − leg, each half the differential swing'; }
    else trace(u=>cells[Math.min(63,Math.floor(u*64))]?amp:-amp,acc);
    label=`one subframe (${frame%192===0?'Z':'X'} preamble), 32 bits × 2 cells, cell = 81.4 ns · ${fmtV(vpp,sg)} ${label}`;
  } else if (sg.kind==='video'){
    const k=vpp/1.0;
    trace(u=>{ const us=u*63.556; if(us<4.7) return -0.3*k; if(us<5.3) return 0; if(us<7.9) return 0.2*k*Math.sin(2*Math.PI*3.579545*us); if(us<10.9) return 0; return r.sig==='ref'? 0 : 0.7*k*Math.min(1,(us-10.9)/50); }, acc, 20);
    label=`one line (63.56 µs) at line ${Math.floor(t/HLINE)%525}: sync −${(0.3*k).toFixed(2)} V · ${r.sig==='ref'?'black burst':'ramp'} · ${fmtV(vpp,sg)}`;
  } else if (sg.kind==='sdi'){
    let seed=(Math.floor(t*27e6))>>>0; const bits=[]; for(let i=0;i<40;i++){ seed=(seed*1664525+1013904223)>>>0; bits.push((seed>>>20)&1); }
    trace(u=>{ const i=Math.min(39,Math.floor(u*40)); const f=u*40-i; const prev=i?bits[i-1]:bits[0]; const v=bits[i]?1:-1, pv=prev?1:-1; return (vpp/2)*(f<0.25? pv+(v-pv)*(f/0.25) : v); }, acc);
    label=`40 bits of scrambled NRZI at 270 Mb/s (3.7 ns each), ${fmtV(vpp,sg)}, rise ≈ 0.9 ns`;
  } else if (sg.kind==='analog'){
    const pk=vpp*1.4142; trace(u=>pk/2*Math.sin(2*Math.PI*(u*4+t*1000)),acc,-12); trace(u=>-pk/2*Math.sin(2*Math.PI*(u*4+t*1000)),a2,12);
    label=`4 ms of a 1 kHz tone: + leg and − leg, ${fmtV(vpp,sg)}`;
  } else if (sg.kind==='gpi'){ trace(u=>S.cable[n]?0:vpp/2,acc); label='GPI/O: a static level; closed = pulled low (assumed)'; }
  else { trace(u=>((Math.floor(u*24)%3)?1:-1)*vpp/2,acc); label='serial data (format not documented in the archive)'; }
  c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText(label,10,160);
}

/* ---------------- return loss chart ---------------- */
function drawRL(cv){
  const {c,w,h}=SIM.canvas(cv,210); const p=P(S.sel); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), grid=SIM.css('--grid');
  const x0=46, x1=w-10, y0=12, y1=180, f0=5e6, f1=3e9, X=f=>x0+(Math.log10(f/f0)/Math.log10(f1/f0))*(x1-x0), Y=db=>y0+(-db/40)*(y1-y0);
  c.strokeStyle=grid; c.fillStyle=ink2; c.font='10px '+SIM.css('--mono');
  [1e7,1e8,1e9].forEach(f=>{ c.beginPath(); c.moveTo(X(f),y0); c.lineTo(X(f),y1); c.stroke(); c.fillText(f>=1e9?f/1e9+' GHz':f/1e6+' MHz',X(f)+2,y1+12); });
  [0,10,20,30,40].forEach(d=>{ c.beginPath(); c.moveTo(x0,Y(-d)); c.lineTo(x1,Y(-d)); c.stroke(); c.fillText('−'+d+' dB',2,Y(-d)+4); });
  c.strokeStyle=SIM.css('--bad'); c.setLineDash([5,4]); c.beginPath(); c.moveTo(X(5e6),Y(-15)); c.lineTo(X(1.485e9),Y(-15)); c.lineTo(X(1.485e9),Y(-10)); c.lineTo(X(2.97e9),Y(-10)); c.stroke(); c.setLineDash([]);
  if (!p || p.kind!=='bnc'){ c.fillStyle=ink; c.font='12px '+SIM.css('--sans'); c.fillText(I().pos.some(q=>q.kind==='bnc')?'Return loss applies to the 75 Ω BNC positions. Select a BNC.':'This module has no BNCs: return loss does not apply.', x0+10, 100); return; }
  const curves=[['as built: '+(p.L?p.L+' '+p.Lv+(p.R?' ‖ '+p.R+' '+p.Rv:''):'direct'), parseL(p.Lv), parseR(p.Rv), SIM.css('--accent')],['no series part (straight track)',0,0,SIM.css('--ink2')]];
  if (p.L && !p.R) curves.push(['same L with 75 Ω across it', parseL(p.Lv), 75, SIM.css('--accent2')]);
  if (p.L && p.R) curves.push(['L alone (resistor not fitted)', parseL(p.Lv), 0, SIM.css('--accent2')]);
  curves.forEach(([lab,Lh,Rp,col],k)=>{ c.strokeStyle=col; c.lineWidth=k?1.3:2.2; c.beginPath(); for(let i=0;i<=300;i++){ const f=f0*Math.pow(f1/f0,i/300); const d=Math.max(-40,s11(f,Lh,Rp,S.padC*1e-12)); i?c.lineTo(X(f),Y(d)):c.moveTo(X(f),Y(d)); } c.stroke(); });
  c.lineWidth=1; c.font='11px '+SIM.css('--sans');
  curves.forEach(([lab,,,col],k)=>{ c.fillStyle=col; c.fillText('■ '+lab, x0+8+k*Math.min(250,(w-60)/3), 205); });
}

/* ---------------- shared bits of UI ---------------- */
function card(title, body, extra){ return `<div class="card" ${extra||''}><h2>${title}</h2>${body}</div>`; }
function controlsHTML(){
  const ks=Object.keys(DATA.issues);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin:6px 0">
    ${SLOTS.map(sl=>`<label class="small">${DUAL?'Card on '+sl:'Mating card'} <select data-c="card" data-slot="${sl}">${cardsForIssue().map(c=>`<option value="${c.id}" ${c.id===S.cards[sl]?'selected':''}>${esc(c.id)} — ${esc(c.short||c.label)}</option>`).join('')}</select></label>`).join('')}
    ${ks.length>1?`<label class="small">Issue <select data-c="issue">${ks.map(k=>`<option value="${k}" ${k===S.issue?'selected':''}>${esc(DATA.issues[k].label)}</option>`).join('')}</select></label>`:''}
    <label class="small">View <select data-c="view"><option value="cdr" ${S.view==='cdr'?'selected':''}>CorelDRAW art</option><option value="rear" ${S.view==='rear'?'selected':''}>Gerber silk, connector face</option><option value="card" ${S.view==='card'?'selected':''}>card side (${SLOTS.join('/')})</option></select></label>
    <button data-c="plug">Plug / unplug selected (P)</button><button data-c="id">Card reads ID (R)</button><button data-c="reset">Reset</button></div>
    <div class="small muted">Click a connector to select it; double-click it (or press P) to plug a cable in. Keys 1–9, 0 select positions 1–10.${DUAL?' Each column mates with its own card: the ID read uses the slot of the selected position.':''}</div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{
    const k=el.dataset.c;
    if (el.tagName==='SELECT') el.onchange=()=>{ if(k==='card') A.setCard(el.dataset.slot, el.value); if(k==='issue') A.setIssue(el.value); if(k==='view'){ S.view=el.value; SIM.refresh(); } };
    else el.onclick=()=>{ if(k==='plug') A.plug(S.sel); if(k==='id') A.readId(); if(k==='reset') A.reset(); };
  });
}
function kindTxt(p){ return p.kind==='bnc'?'BNC ('+p.ref+')' : (p.blk?'pair on 9-pin Phoenix block '+p.ref+' (pins '+p.tbPins.join('/')+')' : '3-pin Phoenix terminal block ('+p.ref+')'); }
function selHTML(){
  const n=S.sel, p=P(n), r=role(n), L=level(n), sg=SIG[r.sig]||SIG.nc;
  if (!p) return '<div class="muted">Nothing at this position.</div>';
  const q=p.pins, tp=p.tbPins||[1,2,3], g=guideOf(n);
  const loads=(sg.loads||[]).map(v=>`<option ${loadOf(n)===v?'selected':''}>${v}</option>`).join('');
  return `<table class="kv">
   <tr><th>Position</th><td><b>${esc(lab(n))}</b> · ${kindTxt(p)}${p.kind!=='bnc'&&p.order?' · pins top→bottom '+p.order.join(' '):''}${p.refInf?' '+inf('the reference designator order of the plotted issue'):''}</td></tr>
   <tr><th>Card role</th><td>${DUAL?'<b>'+p.slot+'</b> · ':''}${esc(cardAt(p.slot).id)} pin <span class="mono">${p.key}</span>: ${esc(r.name)} · ${r.dir==='in'?'input to the card':r.dir==='nc'?'unused':'output from the card'} · ${sg.label} ${r.note?'· '+esc(r.note):''}</td></tr>
   ${g!=null?`<tr><th>Rear-module guide</th><td>“${esc(g)}”${r.dir==='nc'&&g&&!/not connected|reserved/i.test(g)?' <b style="color:var(--bad)">— this issue does not deliver it to the card</b>':''}</td></tr>`:''}
   <tr><th>Route</th><td class="mono small">${p.kind==='bnc'? `${p.ref}-3 → ${p.L?seriesTxt(p):'(no part)'} → ${p.nets.sig} → ${p.slot}-${q.sig}`
      : p.kind==='tb' ? `${p.ref}-${tp[0]} (+) → ${p.nets.p} → ${p.slot}-${q.p}<br>${p.ref}-${tp[1]} (−) → ${p.nets.n} → ${p.slot}-${q.n}<br>${p.ref}-${tp[2]} (G) → GNDD`
      : `${p.ref}-${tp[0]} → ${p.nets.sig} → ${p.slot}-${q.sig}<br>${p.ref}-${tp[1]} → ${p.nets.ret} → ${retTxt(p)}<br>${p.ref}-${tp[2]} → ${p.g3||'GNDD'}`}</td></tr>
   <tr><th>Ground</th><td class="small">${gndText(p)}${p.kind==='bnc'&&p.gnd==='iso-ac'?` · X<sub>C</sub> ${(1/(2*Math.PI*60*p.caps.length*1e-7)/1000).toFixed(1)} kΩ at 60 Hz, ${(1/(2*Math.PI*6.144e6*p.caps.length*1e-7)).toFixed(2)} Ω at 6.144 MHz`:''}</td></tr>
   ${p.gerber?`<tr><th>Gerber trace</th><td class="small">${esc(p.gerber)}</td></tr>`:''}
   <tr><th>Level</th><td>${L.txt} ${L.v>0?(L.ok||L.rx?'<b style="color:var(--accent)">in spec</b>':'<b style="color:var(--warn)">out of spec ('+sg.spec+')</b>'):''}</td></tr>
   ${r.dir!=='in'&&r.sig!=='nc'?`<tr><th>Far-end load</th><td><select data-load="${n}">${loads}</select> ${sg.unit==='dBu'?'· generator <input type="range" data-lvl min="-20" max="20" value="'+S.srcLvl+'"> '+(S.srcLvl>=0?'+':'')+S.srcLvl+' dB':''}</td></tr>`:''}
  </table>`;
}
function bindSel(m){
  const s=m.querySelector('[data-load]'); if (s) s.onchange=()=>A.setLoad(+s.dataset.load, s.value);
  const l=m.querySelector('[data-lvl]'); if (l) l.oninput=()=>{ S.srcLvl=+l.value; SIM.refresh(); };
}
function checkHTML(){
  return SLOTS.map(sl=>{ const c=cardAt(sl), lost=lostOf(sl), mine=I().pos.filter(p=>p.slot===sl);
    const dead=mine.filter(p=>{ const r=role(p.n), g=guideOf(p.n); return r.dir==='nc' && g && !/not connected|reserved/i.test(g); });
    const bus=(I().bused||[]).filter(k=>c.pins[k]&&c.pins[k][1]!=='nc');
    return `<div class="small" style="margin-bottom:6px"><b>${slotTxt(sl)} · ${esc(c.id)}</b>: ${mine.filter(p=>role(p.n).dir!=='nc').length} of ${mine.length} connectors carry a card signal.
      ${lost.filter(l=>l.dir==='in').length?`<br><span style="color:var(--bad)">Card inputs with no connector: ${lost.filter(l=>l.dir==='in').map(l=>`<span class="mono">${l.key}</span> “${esc(l.name)}”`).join(', ')}</span>`:''}
      ${lost.filter(l=>l.dir!=='in').length?`<br><span class="muted">Card outputs not brought out on this module: ${lost.filter(l=>l.dir!=='in').map(l=>`<span class="mono">${l.key}</span> “${esc(l.name)}”`).join(', ')}</span>`:''}
      ${dead.length?`<br><span style="color:var(--bad)">Guide labels that land on unused card pins: ${dead.map(p=>lab(p.n)+' “'+esc(guideOf(p.n))+'” → '+p.key).join(', ')}</span>`:''}
      ${bus.length?`<br><span style="color:var(--warn)">Pins this card uses that are tied to the other connector: ${bus.join(', ')}</span>`:''}
      ${!lost.filter(l=>l.dir==='in').length&&!dead.length&&!bus.length?'<span style="color:var(--accent)"> ✓ every card input has its connector and every guide label reaches the card.</span>':''}</div>`; }).join('');
}
function traceHTML(){ return S.last? `<div><b>${esc(S.last.name)}</b> at ${SIM.fmtT(S.last.t)}</div>`+S.last.tr.map(x=>`<div>→ ${esc(x)}</div>`).join('') : '<div class="muted">Click a connector. Each step from the outside world to the card pin is listed here.</div>'; }
function idHTML(){
  const slot=idSlot(), ds=idDesign(slot), r1=R1(slot), r2=R2(slot), d=idOf(r1,r2), [a1lo,a1hi]=idRange(r1,0.01), [a2lo,a2hi]=idRange(r2,0.01);
  const same=ALLOC.filter(a=>idOf(a[1],a[2]).rm===d.rm), alias=ALLOC.filter(a=>idOf(a[1],a[2]).disp===d.disp && idOf(a[1],a[2]).rm!==d.rm);
  const opt=(cur)=>E96ID.map(v=>`<option value="${v}" ${v===cur?'selected':''}>${rFmt(v)}</option>`).join('');
  const other = DUAL? SLOTS.filter(s=>s!==slot).map(s=>{ const o=idOf(R1(s),R2(s)); return `<tr><th>Other slot (${s})</th><td class="mono">${rTxt(R1(s))} / ${rTxt(R2(s))} → “${o.disp}” 0x${o.rm.toString(16).padStart(4,'0')} <span class="small muted">(select a position in that column to edit it)</span></td></tr>`; }).join('') : '';
  return `<table class="kv">
   ${DUAL?`<tr><th>Slot read</th><td><b>${slotTxt(slot)}</b> (the column of the selected position)</td></tr>`:''}
   <tr><th>${ds.r1} · AN_BMID (${slot}-2 → ADC1)</th><td><select data-r="1">${opt(r1)}</select> → ADC ${adcOf(r1)} (worst case ${a1lo}–${a1hi}) → bin <b>${d.b1}</b></td></tr>
   <tr><th>${ds.r2} · AN_BMID2 (${slot}-1 → ADC4)</th><td><select data-r="2">${opt(r2)}</select> → ADC ${adcOf(r2)} (worst case ${a2lo}–${a2hi}) → bin <b>${d.b2}</b></td></tr>
   <tr><th>rmId / DashBoard text</th><td class="mono">0x${d.rm.toString(16).padStart(4,'0')} · “${d.disp} ${same.map(a=>a[0]).join(' / ')||'Unsupported'}”</td></tr>
   <tr><th>Same full code</th><td>${same.length? same.map(a=>`<span class="chip" style="${a[0].startsWith(DATA.product)?'':'border-color:var(--bad)'}">${esc(a[0])} (${a[4]})</span>`).join('') : '<span class="muted">none</span>'}${same.filter(a=>/^T6/.test(a[0])&&!a[0].startsWith(DATA.product)).length?' <b style="color:var(--bad)">clash</b>':''}</td></tr>
   <tr><th>Same printed “r2.r1”</th><td>${alias.length? alias.map(a=>`<span class="chip" style="border-color:var(--warn)">${esc(a[0])}</span>`).join('')+' <span class="small muted">(the name string masks each bin with 0x0F)</span>' : '<span class="muted">none</span>'}</td></tr>
   ${other}
   <tr><th>Design value (${esc(I().label)})</th><td>AN_BMID ${rFmt(ds.bmid)}, AN_BMID2 ${rFmt(ds.bmid2)} · allocated ${rFmt(DATA.alloc.bmid)} / ${rFmt(DATA.alloc.bmid2)} ${I().idNote?'· '+I().idNote:''}</td></tr></table>`;
}
function bindId(m){ m.querySelectorAll('[data-r]').forEach(s=> s.onchange=()=>A.setR(+s.dataset.r, +s.value)); }

/* ---------------- views ---------------- */
function viewSim(m){
  window[FLAG]=true;
  m.innerHTML = `<div class="grid2"><div>
     ${card(DATA.product+' — '+DATA.what, `${controlsHTML()}<div id="pn"></div>`)}
   </div><div>
     ${card('Selected position', `<div id="sel"></div>`)}
     ${card('Card ↔ module check', `<div id="chk"></div>`)}
     ${card('What happened (last action)', `<div id="tr" class="log"></div>`)}
     ${card('Rear-module ID the card reads', `<div id="idb"></div>`)}
   </div></div>
   ${card('Timeline — one second through position <span id="tln"></span> (zoom with the transport)', `<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Scope at the connector, at the playhead', `<canvas id="sc"></canvas>`)}
     ${card('Return loss at the selected BNC', `<canvas id="rl"></canvas><label class="small">Pad + connector capacitance per side <input type="range" id="pc" min="0.1" max="1.5" step="0.05" value="${S.padC}"> <span id="pcv"></span> pF</label> <span class="small">${inf('typical BNC and 0.093″ PCB pad values; the archive has no capacitance figures')}</span><p class="small muted">Model: shunt C at the BNC, the series part, shunt C at the MEC1 pad, 75 Ω card. Dashed red: SMPTE 292M (15 dB to 1.485 GHz) and 424M (10 dB to 2.97 GHz) return-loss limits.</p>`)}</div>`;
  bindControls(m);
  m.querySelector('#pc').oninput=e=>{ S.padC=+e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>{
    m.querySelector('#pn').innerHTML=panelSVG(); bindPanel(m.querySelector('#pn'));
    m.querySelector('#sel').innerHTML=selHTML(); bindSel(m);
    m.querySelector('#chk').innerHTML=checkHTML();
    m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#idb').innerHTML=idHTML(); bindId(m);
    m.querySelector('#tln').textContent=lab(S.sel);
    m.querySelector('#pcv').textContent=S.padC.toFixed(2);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawScope(m.querySelector('#sc'), SIM.t);
    drawRL(m.querySelector('#rl'));
  });
}

let lesson=0;
function tutSteps(){
  const tc=DATA.tutorial.card, c=DATA.cards.find(x=>x.id===tc)||DATA.cards[0], sl=DATA.tutorial.slot||SLOTS[0];
  const mine=I().pos.filter(p=>p.slot===sl);
  const rl=p=>c.pins[p.key];
  const inP=mine.find(p=>rl(p)&&rl(p)[1]==='in'), outP=mine.find(p=>rl(p)&&/out|io/.test(rl(p)[1]));
  const inN=inP?inP.n:mine[0].n, outN=outP?outP.n:mine[1].n, outName=outP?rl(outP)[0]:'?', inName=inP?rl(inP)[0]:'?';
  const ks=Object.keys(DATA.issues), d=idOf(I().ids[sl].bmid,I().ids[sl].bmid2);
  const st=[
    {t:'Meet the '+DATA.product, b:`<p>${DATA.intro}</p><p>A rear module is passive: no chips, no code. It carries connectors, a few series parts and two <b>ID resistors</b>${DUAL?' per card':''}. All the work is done by the front card${DUAL?'s':''} that plug${DUAL?'':'s'} into it through the 100-pin MEC1 edge connector${DUAL?'s <span class="mono">P101</span> and <span class="mono">P102</span>':' <span class="mono">P101</span>'}.</p><p class="muted">The panel is drawn from the ${esc(I().art)} Gerbers at 1:1 scale; every route was traced through the copper.</p>`, ok:()=>true, auto:true},
    {t:'1 · Choose the card', b:`<p>The same module can sit behind several cards. Each card gives each pin its own job. Pick <b>${esc(c.id)}</b> (${esc(c.short||c.label)}) ${DUAL?'for <b>'+sl+'</b> ':''}from the card list.</p>`, ok:()=>S.cards[sl]===c.id, hint:`Use the “${DUAL?'Card on '+sl:'Mating card'}” list above the panel.`},
    {t:'2 · Find the input', b:`<p>On ${esc(c.id)} the input is position <b>${esc(lab(inN))}</b> (“${esc(inName)}”). Click it. The table shows the route from the connector through the copper to the card pin, and how the shield or return is grounded.</p>`, ok:()=>S.sel===inN, hint:`Click connector ${lab(inN)}${inN<=10?' or press '+(inN%10):''}.`},
    {t:'3 · Plug in a source', b:`<p>Double-click position ${esc(lab(inN))} (or press <b>P</b>) to plug a cable in. A green dot means the card sees a signal in spec. Scrub the timeline to watch the signal's structure go by.</p>`, ok:()=>!!S.cable[inN], hint:'Press P with the input selected.'},
    {t:'4 · Feed an output', b:`<p>Select output position <b>${esc(lab(outN))}</b> (“${esc(outName)}”) and plug a cable into it. The far end is terminated correctly by default, so the level is the nominal one.</p>`, ok:()=>!!S.cable[outN], hint:`Select ${lab(outN)} and press P.`},
    {t:'5 · Forget the terminator', b:`<p>Set the far-end load of position ${esc(lab(outN))} to <b>open</b>. The output voltage rises: the card's source impedance and the load no longer form a divider. On a long cable the signal would also reflect back.</p>`, ok:()=>loadOf(outN)==='open'&&!!S.cable[outN], hint:'Use the “Far-end load” list in the Selected position card.'},
    {t:'6 · Let the card read the ID', b:`<p>Press <b>Card reads ID</b> (or R). The card's AT90CAN128 converts the voltage on AN_BMID (ADC1) and AN_BMID2 (ADC4), turns each into one of 32 bins and shows “r2.r1” in DashBoard. ${DUAL?'Each card reads its own pair of resistors. ':''}This module should read <b>${d.disp}</b> (rmId 0x${d.rm.toString(16).padStart(4,'0')}). Check “Same full code” for clashes.</p>`, ok:()=>S.idReads>0, hint:'Press R.'},
    {t:'7 · Pull the type resistor', b:`<p>Set <b>AN_BMID2</b> to <b>open</b> (as if ${I().ids[sl].r2} were not fitted). Every WBS module uses AN_BMID = 3K57, so with AN_BMID2 gone the card can no longer tell which WBS module it is.</p>`, ok:()=>R2(idSlot())>=OPEN, hint:'Pick “open (not fitted)” in the AN_BMID2 list.'},
  ];
  if (DUAL){ const o=SLOTS.find(s=>s!==sl); const op=I().pos.find(p=>p.slot===o); st.push({t:'8 · The second card', b:`<p>The other column belongs to the card on <b>${o}</b>. Select position ${esc(lab(op.n))} and press <b>R</b>: that card reads its own resistors (${I().ids[o].r1}, ${I().ids[o].r2}) through ${o}-2 and ${o}-1.</p>`, ok:()=>(S.idReadSlots[o]||0)>0, hint:`Click ${lab(op.n)}, then press R.`}); }
  if (ks.length>1) st.push({t:(DUAL?'9':'8')+' · Compare issues', b:`<p>Put the resistor back, then switch the <b>Issue</b> list. ${DATA.tutorial.issueHint||'The netlists changed between issues; check which positions moved.'} Watch the <b>Card ↔ module check</b>.</p>`, ok:()=>S.issue!==DATA.defaultIssue, hint:'Use the Issue list.'});
  else st.push({t:(DUAL?'9':'8')+' · Look at the series parts', b:`<p>Put the resistor back and select a BNC. The <b>Return loss</b> chart on the Simulator tab shows what the small series inductor does at SDI frequencies. Move the pad-capacitance slider.</p>`, ok:()=>S.padC!==0.45, hint:'Move the pad-capacitance slider.'});
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
   <div class="grid2">${card('Timeline (selected position, click to seek)', `<label class="small">Position <select id="ps">${I().pos.map(p=>`<option value="${p.n}" ${p.n===S.sel?'selected':''}>${esc(lab(p.n))}${DUAL?' ('+p.slot+')':''} · ${esc(role(p.n).name)}</option>`).join('')}</select></label><canvas id="tl"></canvas>`)}
   ${card('What the card and the cable see at the playhead', `<div id="now"></div><canvas id="sc"></canvas>`)}</div>`;
  m.querySelector('#ps').onchange=e=>{ S.sel=+e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>{
    const r=role(S.sel), sg=SIG[r.sig]||SIG.nc, t=SIM.t, sl=idSlot();
    const rows=[['1 s','the simulated second',1],['16.7 ms','one video field (59.94 Hz)',FIELD],['4 ms','one AES block of 192 frames at 48 kHz',0.004],['1 ms','one cycle of a 1 kHz tone',1e-3],['200 µs','first ADC conversion of AN_BMID (25 ADC clocks at 125 kHz)',ADC_FIRST],['63.6 µs','one video line',HLINE],['20.8 µs','one AES frame (one sample pair)',1/FS],['163 ns','one AES bit (2 cells)',1/(64*FS)],['37 ns','one SD-SDI 10-bit word (27 MHz)',1/27e6],['3.7 ns','one SD-SDI bit (270 Mb/s)',1/270e6],['0.67 ns','one HD-SDI bit (1.485 Gb/s)',1/1.485e9],[transit().toFixed(0)+' ps','transit from connector to the MEC1 pad ('+inf().replace(/<[^>]+>/g,'')+')',transit()*1e-12]];
    m.querySelector('#lad').innerHTML=`<svg viewBox="0 0 900 ${rows.length*24+10}" style="width:100%">${rows.map((rw,i)=>{ const w=Math.max(2,(Math.log10(rw[2])+12)/12*380); return `<rect x="250" y="${6+i*24}" width="${w}" height="16" rx="3" fill="${i===rows.length-1?'var(--warn)':'var(--accent)'}" opacity=".75"/><text x="240" y="${18+i*24}" text-anchor="end" font-size="12" font-family="var(--mono)" fill="var(--ink)">${rw[0]}</text><text x="${258+w}" y="${18+i*24}" font-size="11.5" fill="var(--ink2)">${rw[1]}</text>`; }).join('')}</svg><p class="small muted">Log scale. The module adds nothing in time: every structure the card produces, from the 4 ms AES block down to the 0.67 ns HD-SDI bit, crosses it unchanged. What it can change is level (termination, loading), where a signal lands, and at gigahertz, return loss.</p>`;
    const frame=Math.floor(t*FS);
    m.querySelector('#now').innerHTML=`<table class="kv"><tr><th>Position</th><td>${esc(lab(S.sel))} · ${esc(r.name)} · ${sg.label}</td></tr>
      <tr><th>AES</th><td class="mono">frame ${frame.toLocaleString()} · block ${Math.floor(frame/192)} · frame ${frame%192}/191</td></tr>
      <tr><th>Video</th><td class="mono">field ${Math.floor(t/FIELD)} · line ${Math.floor((t%FIELD)/HLINE)+1} · ${((t%HLINE)*1e6).toFixed(2)} µs into the line</td></tr>
      <tr><th>ID read (${sl})</th><td class="mono">${S.idAt!=null||t<0.001? (t<(S.idAt||0)+ADC_FIRST+ADC_NEXT+30e-6 && t>=(S.idAt||0)? 'converting now' : 'done: '+idOf(R1(sl),R2(sl)).disp) : 'done at power-up: '+idOf(R1(sl),R2(sl)).disp}</td></tr></table>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#sc'), t);
  });
}

const BLOCKS = {
  card:{t:'Front card', d:()=>`${DUAL?'Two cards, one per slot ('+SLOTS.map(s=>s+': '+esc(cardAt(s).id)).join(', ')+'), each':'The card ('+esc(cardObj().id)+')'} does all the processing. Its rear edge carries the mating half of MEC1. It pulls AN_BMID and AN_BMID2 up to 3V3 through 1K00 resistors and reads them on AVR ADC channels 1 and 4 (OGP-SDK <span class="mono">adclib.c</span>, <span class="mono">ztcboard.c</span>).`},
  p101:{t:SLOTS.join(' + ')+' — Samtec MEC1-150-02-L-D-A', d:()=>SLOTS.map(sl=>`<b>${sl}</b>: pins used ${[...new Set(I().pos.filter(p=>p.slot===sl).flatMap(p=>p.kind==='tb'?[p.pins.p,p.pins.n]:[p.pins.sig].concat(p.pins.ret||[])))].sort((a,b)=>a-b).join(', ')}, ID pins 1 and 2${I().gndPins&&I().gndPins[sl]?', and '+I().gndPins[sl].length+' pins on GNDD'+(I().gndExtra&&I().gndExtra[sl]&&I().gndExtra[sl].length?' (including non-standard '+I().gndExtra[sl].join(', ')+')':''):''}.`).join('<br>')+(I().bused&&I().bused.length?`<br><b style="color:var(--warn)">Shared nets:</b> ${I().bused.join(', ')} join the same pins of P101 and P102.`:'')},
  ser:{t:'Series parts', d:()=>{ const ps=I().pos.filter(p=>p.L); return ps.length? `${ps.length} series inductors (0603)${ps.some(p=>p.R)?' and '+ps.filter(p=>p.R).length+' 75 Ω resistors across them':''}: ${ps.map(p=>p.ref+': '+p.L+' '+p.Lv+(p.R?'‖'+p.R+' '+p.Rv:'')).join(' · ')}. With the pad capacitance on each side, the inductor makes a short 75 Ω low-pass section and improves return loss; the resistor damps its resonance ${inf('the part values and placement')}.${I().shunt?' '+I().shunt:''}` : 'No series parts: every connector is wired straight to the MEC1 pins.'+(I().shunt?' '+I().shunt:''); }},
  conn:{t:'Connectors', d:()=>`${I().pos.filter(p=>p.kind==='bnc').length} BNCs and ${I().pos.filter(p=>p.kind!=='bnc').length} terminal-block pairs (${I().tbType||'PHEN3PTOP'}). ${I().blocks?'Each 9-pin block holds three balanced pairs, a G pin and one single-ended pair.':'The drawings print the terminal pins as G / − / + on the left column and + / − / G on the right, so both columns put + towards the centre line.'}`},
  id:{t:'ID resistors', d:()=>SLOTS.map(sl=>{ const d=I().ids[sl]; return `${sl}: ${d.r1} = AN_BMID ${rTxt(d.bmid)}, ${d.r2} = AN_BMID2 ${rTxt(d.bmid2)}`; }).join(' · ')+`. Allocated type value ${rFmt(DATA.alloc.bmid2)}. 1 % 0805 parts. The card's 1K00 pull-up and the 10-bit ADC put each value in one of 32 bins.`},
  gnd:{t:'Grounds', d:()=>{ const iso=I().pos.filter(p=>p.kind!=='tb'&&p.pins.ret); return `GNDD is the signal ground plane, tied to the standard MEC1 GND pins and the terminal-block G pins. ${iso.length? iso.map(p=>lab(p.n)).join(', ')+' keep their shell or return on isolated nets BNCx_GND that run to the card (“For video inputs”, DevGuide)'+(iso.some(p=>p.gnd==='iso-ac')?', AC-coupled to ground by 0.1 µF capacitors where fitted.':'.') : 'All shells go straight to GNDD.'} ${I().chassis||''}`; }},
  out:{t:'Outside world', d:()=>'Coax (75 Ω) to BNCs, twisted pair to the terminal blocks. The module is the frame\'s rear panel for this slot pair: its 1.3″-wide face spans two card slots of the MF6220 / DFR-8310 frame'+(DUAL?', and here each slot gets its own column.':'.')},
};
function viewBlock(m){
  window[FLAG]=false;
  const box=(k,x,y,w,h,sub)=>`<g class="blk" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${S.blockSel===k?'color-mix(in srgb,var(--accent) 25%,var(--panel2))':'var(--panel2)'}" stroke="${S.blockSel===k?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+w/2}" y="${y+h/2-2}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${BLOCKS[k].t.split(' — ')[0]}</text><text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text></g>`;
  const ar=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="2" marker-end="url(#${ID}ar)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-6}" text-anchor="middle" font-size="10" fill="var(--ink2)">${l||''}</text>`;
  const draw=()=>{
    m.innerHTML=`${card('Block diagram — click a block', `<svg viewBox="0 0 980 300" style="width:100%"><defs><marker id="${ID}ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>
      ${box('card',10,90,150,80,SLOTS.map(s=>cardAt(s).id).join(' + '))}${ar(160,130,205,130,'MEC1')}
      ${box('p101',205,90,160,80,DUAL?'2 × 100 pins':'100 pins, 1–2 = ID')}${ar(365,130,410,130,'')}
      ${box('ser',410,90,160,80,I().pos.some(p=>p.L)?'L / L‖R per BNC':'none')}${ar(570,130,615,130,'')}
      ${box('conn',615,90,160,80,I().pos.filter(p=>p.kind==='bnc').length+' BNC · '+I().pos.filter(p=>p.kind!=='bnc').length+' TB pairs')}${ar(775,130,820,130,'cables')}
      ${box('out',820,90,150,80,'coax / pairs')}
      ${box('id',205,210,160,70,SLOTS.map(s=>rTxt(I().ids[s].bmid)+'/'+rTxt(I().ids[s].bmid2)).join(' · '))}${ar(205,245,90,175,'ADC1 / ADC4')}
      ${box('gnd',615,210,160,70,'GNDD · BNCx_GND')}
      <text x="10" y="30" font-size="12" fill="var(--ink2)">Everything right of the card${DUAL?'s':''} is passive copper on the ${DATA.product} (${esc(I().label)}).</text></svg>`)}
      ${card(BLOCKS[S.blockSel].t, `<p>${BLOCKS[S.blockSel].d()}</p>`)}
      ${card('Signal path stage by stage, all positions', stageTable())}`;
    m.querySelectorAll('.blk').forEach(g=>g.onclick=()=>{ S.blockSel=g.dataset.k; draw(); });
  };
  draw();
}
function stageTable(){
  return `<div class="scroll"><table class="kv"><tr><th>Pos</th>${DUAL?'<th>Slot / card</th>':''}<th>Card role</th><th>Guide</th><th>Connector</th><th>Series part</th><th>Net → pin</th><th>Ground</th><th>Level (nominal load)</th></tr>
   ${I().pos.map(p=>{ const r=role(p.n), sg=SIG[r.sig]||SIG.nc, g=guideOf(p.n); const nomV = sg.kind==='nc'?'—': sg.unit==='dBu'? '+4 dBu' : sg.kind==='gpi'?'logic':(sg.voc/2).toFixed(2)+' V p-p';
     const bad = r.dir==='nc' && g && !/not connected|reserved/i.test(g);
     return `<tr${bad?' style="color:var(--bad)"':''}><td>${esc(lab(p.n))}</td>${DUAL?`<td>${p.slot} · ${esc(cardAt(p.slot).id)}</td>`:''}<td>${esc(r.name)} <span class="muted small">${r.dir}</span></td><td class="small">${g!=null?esc(g):'—'}</td><td>${p.ref}${p.blk?'-'+p.tbPins.join('/'):''}</td><td class="mono small">${p.L?seriesTxt(p):'—'}</td><td class="mono small">${p.kind==='bnc'?p.nets.sig+' → '+p.pins.sig:p.kind==='tb'?p.nets.p+'/'+p.nets.n.replace(/.*?(N[^ ]*)$/,'$1')+' → '+p.pins.p+'/'+p.pins.n:p.nets.sig+' → '+p.pins.sig}</td><td class="small">${p.kind==='tb'?'G → GNDD':p.kind==='tbu'?'− on '+p.nets.ret:p.gnd==='gndd'?'GNDD':p.gnd==='iso'?'isolated':'isolated, '+p.caps.length+'×0.1 µF'}</td><td class="mono small">${nomV}</td></tr>`; }).join('')}</table></div>`;
}

function viewSchem(m){
  window[FLAG]=false;
  const iss=I(), rows=iss.pos.slice().sort((a,b)=>(a.slot>b.slot)-(a.slot<b.slot) || a.n-b.n), RH=54;
  const H=rows.length*RH+60+SLOTS.length*80;
  let s=`<svg viewBox="0 0 980 ${H}" style="width:100%;min-width:760px" font-family="var(--mono)">
    <text x="10" y="18" font-size="12" fill="var(--warn)" font-family="var(--sans)">REDRAWN from ${esc(iss.netlist)} — not the original CAD schematic</text>`;
  SLOTS.forEach(sl=>{ const rs=rows.map((p,i)=>[p,i]).filter(([p])=>p.slot===sl); if(!rs.length) return; const y0=34+rs[0][1]*RH, hh=rs.length*RH+10;
    s+=`<rect x="20" y="${y0}" width="120" height="${hh}" fill="var(--panel2)" stroke="var(--ink2)"/><text x="80" y="${y0+hh/2}" text-anchor="middle" font-size="12" fill="var(--ink)" transform="rotate(-90 80 ${y0+hh/2})">${sl} MEC1-150-02-L-D-A</text>`; });
  rows.forEach((p,i)=>{
    const y=50+i*RH, sel=p.n===S.sel, col=sel?'var(--warn)':'var(--ink)';
    if (p.kind==='bnc'){
      s+=`<text x="146" y="${y+4}" font-size="10" fill="var(--ink2)">${p.pins.sig}</text><line x1="140" y1="${y}" x2="330" y2="${y}" stroke="${col}"/><text x="180" y="${y-4}" font-size="10.5" fill="${col}">${p.nets.sig}</text>`;
      if (p.L){ s+=`<path d="M330,${y} q6,-10 12,0 q6,-10 12,0 q6,-10 12,0 q6,-10 12,0" fill="none" stroke="${col}" stroke-width="1.6"/><text x="334" y="${y-12}" font-size="10" fill="${col}">${p.L} ${p.Lv}</text>`;
        if (p.R) s+=`<path d="M326,${y} v16 h8 l3,-5 l5,10 l5,-10 l5,10 l5,-10 l5,10 l3,-5 h10 v-16" fill="none" stroke="${col}"/><text x="340" y="${y+30}" font-size="10" fill="${col}">${p.R} ${p.Rv}</text>`;
        s+=`<line x1="378" y1="${y}" x2="560" y2="${y}" stroke="${col}"/>`;
      } else s+=`<line x1="330" y1="${y}" x2="560" y2="${y}" stroke="${col}"/>`;
      s+=`<circle cx="580" cy="${y+6}" r="16" fill="none" stroke="${col}" stroke-width="2"/><circle cx="580" cy="${y+6}" r="3" fill="${col}"/><line x1="560" y1="${y}" x2="577" y2="${y+5}" stroke="${col}"/><text x="602" y="${y+10}" font-size="11" fill="${col}">${p.ref} · position ${esc(lab(p.n))}</text>`;
      const g = p.gnd==='gndd'?'shell → GNDD':p.gnd==='iso'?`shell → ${p.nets.ret} → ${p.slot}-${p.pins.ret.join(',')}`:`shell → ${p.nets.ret} → ${p.slot}-${p.pins.ret.join(',')} · ${p.caps.join(',')} 0.1µ → ${p.capTo||'GNDD'}`;
      s+=`<text x="602" y="${y+24}" font-size="9.5" fill="var(--ink2)">${g}</text>`;
    } else {
      const a = p.kind==='tb'? [p.pins.p,p.pins.n] : [p.pins.sig, (p.pins.ret||['GNDD']).join(',')];
      const n1 = p.kind==='tb'? p.nets.p : p.nets.sig, n2 = p.kind==='tb'? p.nets.n : p.nets.ret, tp=p.tbPins||[1,2,3];
      s+=`<text x="146" y="${y-2}" font-size="10" fill="var(--ink2)">${a[0]}</text><line x1="140" y1="${y-6}" x2="560" y2="${y-6}" stroke="${col}"/><text x="230" y="${y-10}" font-size="10.5" fill="${col}">${n1}</text>
          <text x="146" y="${y+12}" font-size="10" fill="var(--ink2)">${a[1]}</text><line x1="140" y1="${y+8}" x2="560" y2="${y+8}" stroke="${col}"/><text x="230" y="${y+20}" font-size="10.5" fill="${col}">${n2}</text>
          <line x1="520" y1="${y+22}" x2="560" y2="${y+22}" stroke="var(--ink2)"/><text x="470" y="${y+26}" font-size="9.5" fill="var(--ink2)">GNDD</text>
          <rect x="560" y="${y-14}" width="30" height="44" fill="none" stroke="${col}" stroke-width="2"/>${[-6,8,22].map((d,k)=>`<circle cx="575" cy="${y+d}" r="3" fill="${col}"/><text x="596" y="${y+d+4}" font-size="9" fill="var(--ink2)">${tp[k]}</text>`).join('')}
          <text x="610" y="${y+6}" font-size="11" fill="${col}">${p.ref} ${p.blk?'PHEN9PTOP':'PHEN3PTOP'} · position ${esc(lab(p.n))}</text><text x="610" y="${y+20}" font-size="9.5" fill="var(--ink2)">${p.kind==='tb'?'balanced pair':'single-ended BNC pins on a terminal block'}</text>`;
    }
  });
  let yb=60+rows.length*RH;
  SLOTS.forEach(sl=>{ const d=iss.ids[sl];
    s+=`<text x="146" y="${yb+4}" font-size="10" fill="var(--ink2)">${sl}-1</text><line x1="140" y1="${yb}" x2="420" y2="${yb}" stroke="var(--ink)"/><text x="190" y="${yb-4}" font-size="10.5" fill="var(--ink)">AN_BMID2</text><path d="M420,${yb} l4,-6 l6,12 l6,-12 l6,12 l6,-12 l4,6 h20" fill="none" stroke="var(--ink)"/><text x="424" y="${yb-12}" font-size="10" fill="var(--ink)">${d.r2} ${rTxt(d.bmid2)}</text><text x="480" y="${yb+4}" font-size="10" fill="var(--ink2)">→ GNDD</text>
     <text x="146" y="${yb+34}" font-size="10" fill="var(--ink2)">${sl}-2</text><line x1="140" y1="${yb+30}" x2="420" y2="${yb+30}" stroke="var(--ink)"/><text x="190" y="${yb+26}" font-size="10.5" fill="var(--ink)">AN_BMID</text><path d="M420,${yb+30} l4,-6 l6,12 l6,-12 l6,12 l6,-12 l4,6 h20" fill="none" stroke="var(--ink)"/><text x="424" y="${yb+18}" font-size="10" fill="var(--ink)">${d.r1} ${rTxt(d.bmid)}</text><text x="480" y="${yb+34}" font-size="10" fill="var(--ink2)">→ GNDD</text>
     <text x="146" y="${yb+58}" font-size="10" fill="var(--ink2)">${sl} GND: ${(iss.gndPins&&iss.gndPins[sl]||GND_PINS).length} pins → GNDD plane${iss.gndExtra&&iss.gndExtra[sl]&&iss.gndExtra[sl].length?' · non-standard: '+iss.gndExtra[sl].join(', '):''}</text>`; yb+=80; });
  s+=`</svg>`;
  m.innerHTML=`${card('Schematic — '+esc(iss.label), `<label class="small">${Object.keys(DATA.issues).length>1?`Issue <select id="is">${Object.keys(DATA.issues).map(k=>`<option value="${k}" ${k===S.issue?'selected':''}>${esc(DATA.issues[k].label)}</option>`).join('')}</select>`:''}</label> <span class="small muted">Highlighted row = selected position (${esc(lab(S.sel))}). Click a coloured pin in the MEC1 map below to select its position.</span><div class="scroll">${s}</div>`)}
   ${SLOTS.map(sl=>card(sl+' pin map (MEC1, card component side odd / solder side even)', pinMap(sl))).join('')}
   ${card('Parts list and verification', `<p class="small">${esc(iss.parts)}</p>${iss.verify?`<p class="small"><b>Gerber check:</b> ${iss.verify}</p>`:''}`)}`;
  const is=m.querySelector('#is'); if (is) is.onchange=()=>{ A.setIssue(is.value); };
  m.querySelectorAll('[data-pin]').forEach(el=>el.onclick=()=>{ const n=+el.dataset.pos; if(n) { S.sel=n; viewSchem(m); } });
}
function pinMap(slot){
  const used={}; I().pos.filter(p=>p.slot===slot).forEach(p=>{ const q=p.pins; if(p.kind==='tb'){ used[q.p]=p.n; used[q.n]=p.n; } else { used[q.sig]=p.n; (q.ret||[]).forEach(x=>used[x]=p.n); } });
  const ex=(I().gndExtra&&I().gndExtra[slot])||[];
  let s='<svg viewBox="0 0 980 150" style="width:100%;min-width:760px">';
  for (let k=0;k<50;k++){ [1,2].forEach(side=>{ const pin=side===1? 99-2*k : 100-2*k, x=10+k*19.4, y=side===1?20:80; const nm=pinName(pin), u=used[pin], sel=u===S.sel;
    const fill = pin<=2?'var(--warn)': sel?'#ffd34d': u?'var(--accent)': ex.includes(pin)?'var(--bad)': nm==='GND'?'var(--ink2)':'var(--panel2)';
    s+=`<g data-pin="${pin}" data-pos="${u||0}" style="cursor:${u?'pointer':'default'}"><rect x="${x}" y="${y}" width="16" height="40" rx="2" fill="${fill}" stroke="var(--line)"><title>${slot}-${pin}: ${nm}${u?' · position '+lab(u):''}${ex.includes(pin)?' · tied to GNDD on this module':''}</title></rect></g>`;
    if (k%5===0) s+=`<text x="${x+8}" y="${side===1?14:136}" text-anchor="middle" font-size="9" fill="var(--ink2)">${pin}</text>`; }); }
  return s+`</svg><div class="small"><span class="chip" style="background:var(--warn);color:#fff">ID pins 1–2</span><span class="chip" style="background:var(--accent);color:#fff">wired on this module</span><span class="chip" style="background:#ffd34d">selected position</span><span class="chip" style="background:var(--ink2);color:var(--bg)">GND</span>${ex.length?'<span class="chip" style="background:var(--bad);color:#fff">non-GND pin tied to GNDD</span>':''}<span class="chip">open</span> Hover a pin for its standard name.</div>`;
}

function viewSoft(m){
  window[FLAG]=false;
  m.innerHTML=`${card('The module has no logic — this is the card-side code that reads it', `<p class="small">From the Ross OGP-SDK-AVR copied into each WBS card tree (<span class="mono">zeuslib/common/adclib.c</span>, <span class="mono">application/ztcboard.c</span> or <span class="mono">boardimp.c</span> in M6205, <span class="mono">zeuslib/common/board.c</span>). The highlighted step follows the playhead inside the ID read; press “Card reads ID” on the Simulator tab to move the read.${DUAL?' Shown for the slot of the selected position ('+idSlot()+').':''}</p><div id="fl"></div>`)}
   <div class="grid2">${card('Live values', `<div id="lv"></div>`)}${card('Bins for every allocated value', `<canvas id="bins"></canvas>`)}</div>
   ${card('Clash check: every allocation and every as-designed value', clashTable())}
   ${card('Signal path, stage by stage', stageTable())}`;
  SIM.on('time', ()=>{
    const sl=idSlot(), t=SIM.t, t0=S.idAt!=null?S.idAt:0, r1=R1(sl), r2=R2(sl), a1=adcOf(r1), a2=adcOf(r2), d=idOf(r1,r2);
    const rel=t-t0; const k = rel<0?-1: rel<ADC_FIRST?1: rel<ADC_FIRST+20e-6?2: rel<ADC_FIRST+20e-6+ADC_NEXT?3: rel<ADC_FIRST+60e-6+ADC_NEXT?4:5;
    const steps=[['getRearModuleId()','boardimp.c: (getOptionCardType() << 8) | (getRearModuleType() & 0xFF)'],['getAdcValue(ADC_BMTYPE=1)','ADMUX=0x41 · ADCSRA=0x87 · ADSC · 25 ADC clocks'],['getAdcBin()','32 − (ADC + 16) / 32 → bin '+d.b1],['getAdcValue(ADC_DAUGHTER=4)','AN_BMID2 · 13 ADC clocks'],['getAdcBin()','→ bin '+d.b2+' · rmId 0x'+d.rm.toString(16).padStart(4,'0')],['getRearModuleName()','csprintf("%d.%d ", r2&0x0F, r1&0x0F) → “'+d.disp+'”']];
    m.querySelector('#fl').innerHTML=`<svg viewBox="0 0 980 100" style="width:100%">${steps.map((s,i)=>`<rect x="${6+i*162}" y="10" width="154" height="78" rx="7" fill="${i===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${12+i*162}" y="32" font-size="${s[0].length>22?8.6:10.5}" font-family="var(--mono)" fill="${i===k?'#fff':'var(--ink)'}">${s[0]}</text>${wrapSvg(s[1],14+i*162,50,26,i===k?'#fff':'var(--ink2)')}`).join('')}</svg>`;
    m.querySelector('#lv').innerHTML=`<table class="kv"><tr><th>AN_BMID (${sl})</th><td class="mono">${rFmt(r1)} → ${(3.3*(r1>=OPEN?1:r1/(r1+1000))).toFixed(3)} V → ADC ${a1} → bin ${d.b1}</td></tr>
     <tr><th>AN_BMID2 (${sl})</th><td class="mono">${rFmt(r2)} → ${(3.3*(r2>=OPEN?1:r2/(r2+1000))).toFixed(3)} V → ADC ${a2} → bin ${d.b2}</td></tr>
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
function clashTable(){
  const rows=ALLOC.filter(a=>a[3]==='WBS'||/^T6/.test(a[0])).map(a=>{ const d=idOf(a[1],a[2]); return {a,d}; });
  return `<div class="scroll"><table class="kv"><tr><th>Module / source</th><th>AN_BMID / AN_BMID2</th><th>bins</th><th>rmId</th><th>printed</th><th>shares full code with</th><th>shares printed text with</th></tr>${rows.map(({a,d})=>{
    const same=ALLOC.filter(b=>b!==a&&idOf(b[1],b[2]).rm===d.rm&&b[0].split(' ')[0]!==a[0].split(' ')[0]).map(b=>b[0]);
    const al=ALLOC.filter(b=>b!==a&&idOf(b[1],b[2]).disp===d.disp&&idOf(b[1],b[2]).rm!==d.rm&&b[3]==='WBS').map(b=>b[0]);
    const me=a[0].startsWith(DATA.product);
    return `<tr${me?' style="font-weight:700"':''}><td>${esc(a[0])} <span class="small muted">${esc(a[4])}</span></td><td class="mono">${rTxt(a[1])} / ${rTxt(a[2])}</td><td class="mono">${d.b1}, ${d.b2}</td><td class="mono">0x${d.rm.toString(16).padStart(4,'0')}</td><td class="mono">“${d.disp}”</td><td class="small" style="color:${same.length?'var(--bad)':'inherit'}">${same.map(esc).join(', ')||'—'}</td><td class="small" style="color:${al.length?'var(--warn)':'inherit'}">${al.map(esc).join(', ')||'—'}</td></tr>`; }).join('')}</table></div><p class="small muted">Red: two modules give the card the identical 16-bit rmId (a real clash). Orange: different rmId, but <span class="mono">getRearModuleName()</span> prints the same “r2.r1” because each bin is masked with 0x0F.</p>`;
}
function wrapSvg(t,x,y,n,col){ const ws=t.split(' '); let line='',out='',yy=y; ws.forEach(w=>{ if((line+' '+w).length>n){ out+=`<text x="${x}" y="${yy}" font-size="9.5" fill="${col}">${esc(line)}</text>`; yy+=12; line=w; } else line=line?line+' '+w:w; }); return out+`<text x="${x}" y="${yy}" font-size="9.5" fill="${col}">${esc(line)}</text>`; }

function aliasPairs(){
  const w=ALLOC.filter(a=>a[3]==='WBS'&&a[4]==='ID.xls'), out=[];
  w.forEach((a,i)=>w.slice(i+1).forEach(b=>{ const x=idOf(a[1],a[2]), y=idOf(b[1],b[2]); if (x.disp===y.disp && x.rm!==y.rm) out.push(a[0].split(' ')[0]+'/'+b[0].split(' ')[0]+' “'+x.disp+'”'); }));
  return out.join(', ');
}
function viewFind(m){
  window[FLAG]=false;
  const me=idOf(DATA.alloc.bmid,DATA.alloc.bmid2);
  const common=[
    `<b>Every WBS module shares AN_BMID = 3K57.</b> Only AN_BMID2 tells them apart (allocation sheet “Rear Module ID” in <span class="mono">OpenGear Frame Address ID.xls</span>). The SDK reads AN_BMID2 on ADC4, the channel it also calls <span class="mono">ADC_DAUGHTER</span> / <span class="mono">getOptionCardType()</span>, and <span class="mono">ztcboard.c</span> only uses it when <span class="mono">getBoardIssue() >= 4</span>. On an older card every WBS rear module reads the same code.`,
    `<b>The printed ID aliases (4-bit mask).</b> <span class="mono">getRearModuleName()</span> prints <span class="mono">"%d.%d"</span> of each bin masked with <span class="mono">0x0F</span>, so bins 16–31 wrap onto 0–15. ${DATA.product} (allocated ${rTxt(DATA.alloc.bmid2)}, bin ${me.b2}) prints “${me.disp}”, the same text as ${ALLOC.filter(a=>idOf(a[1],a[2]).disp===me.disp && !a[0].startsWith(DATA.product)).map(a=>a[0]).join(', ')||'no other module'}. Pairs in the WBS table that collide this way: ${aliasPairs()}. The full 16-bit rmId used to look up the name is still unique, so only a person reading the number can be fooled.`,
    `<b>Ross later reused the WBS base value.</b> openGear DevGuide Part I Appendix B gives Ross's own “10 AUD Full” module AN_BMID = 3K57 / AN_BMID2 = 3K57 and “10 AUD Split” 3K57 / 887R. Those are exactly the WBS allocations for T6303 and T6403, so a card reading either code cannot tell a WBS module from the Ross one.`,
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
