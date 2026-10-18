# 19xx - Systems Description MicroCOM Communication System.jpg
Wiki page: [microCOM](../../PAGES/microCOM.md)


- **Year:** unknown (title block (read by eye))
- **Module:** microCOM
- **Category:** MICRO SERIES
- **Module year estimate:** 1981 — numeric "07/13/81" in PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p49.JPG

## Title block (found by software, read by eye)

- **Title:** Systems Description MicroCOM Communication System

Manual page describing data transfer between MicroCOM matrix modules, with Figure 2 block diagram.

- **Original file:** `WBSps.env/WBS Photos-1-001/WBS MicroCOM Inst Man p12.JPG`
- **SHA-256:** `494e40c84d7acbd5ab2993e4861be6febac12de83a89dc02572561e459c7764f`
- **Size:** 441,958 bytes
- **Pages:** 1

## Full text

### Page 1 (OCR, spell-checked: 8 words corrected)

```text
RMf~.
WARD-BECK SYSTEMS LTD_
SYSTEMS DESCRIPTION
MicroCoM Communication System
M771 Matrix Latch Module is located in the first position of each MFZD matrix block . multi position frame selector switch on each M771 is set to decode its appropriate address_ i.e. position for matrix inputs to 24 or position for inputs 25 to 48 etc
The audio crosspoints of an MFZD matrix block are activated by an X-Y type control from the M771 The crosspoint bit pattern of given output bus is loaded into these crosspoint control Latches The Bus Select Strobe of this bus is then activated, which in turn enables the control gates of the respective M724B Matrix Amplifier. This in turn refreshes the "memory capacitors" of the M724B which determine the crosspoint state. AM 24 output buses are addressed in this fashion consecutively approximately every 150 milliseconds, with each bus select strobe being enabled for approximately 500 micro- seconds P, :` "~c- "` ^ - Figure 2 below illustrates the data transfer between modules of the MicroCoM control system To 4771 MatRix LATCHES
METD_MAIRIX_BLOCK K771 CROSSPOINT MatrIX CONTROLS LATCHES 25 To Bus SeLecT stroBES To 24
; ; _ 701o 48 0 SERIAL Poss 1 M 350 F^ yi "on` 4Cw"  . YWWd 137 Cit:5783 Lo.4
Xul_ IIPROCESSQR Bus
1 1
METO_MATRIX BLock M771 CROSSPOINT MaTRIX CONTROLS LATCHES to bus SELECT StrOBES J024 76 4771 Matrix LaTCHES #8 BUSES25 To
' _ {6 tjc
240 SERIAL J/o Ports 6 M
I I1 1
' -`
K7764 OutPUT
47764 OUTPUT
CONTROLLER
CONTROLLER
D..ADaTA A. Address C,.CONTROL
DAIa Bu5
ADDRESS BuS
Figure
COKIBOL _ Bus
2-4
```

<details><summary>As read by the OCR</summary>

```text
RMf~.
WARD-BECK SYSTEMS LTD_
SYSTEMS DESCRIPTION
MicroCoM Communication System
M771 Matrix Latch Module is located in the first position of each MFZD matrix block . multi position frame selector switch on each M771 is set to decode its appropriate address_ i.e. position for matrix inputs to 24 or position for inputs 25 to 48 etc
The audio crosspoints of an MFZD matrix block are activated by an X-Y type control from the M771 The crosspoint bit pattern of given output bus is loaded into these crosspoint control Iatches The Bus Select Strobe of this bus is then activated, which in turn enables the control gates of the respective M724B Matrix Amplifier. This in turn refreshes the "memory capacitors" of the M724B which determine the crosspoint state. AM 24 output buses are addressed in this fashion consecutively approximately every 150 milliseconds, with each bus select strobe being enabled for approximately 500 micro- seconds P, :` "~c- "` ^ - Figure 2 below ilustrates the data transfer between modules of the MicroCoM control system To 4771 MatRix LATCHES
METD_MAIRIX_BLOCK K771 CROSSPOINT MatrIX CONTROLS AATCHES 25 To Bus SeLecT stroBES To 24
; ; _ 701o 48 0 SERIAL Poxss 1 M 350 F^ yi "on` 4Cw"  . YWWd 137 Cit:5783 Lo.4
Xul_ IIPROCESSQR Bus
1 1
METO_MATRIX BLock M771 CROSSPOINT MaTRIX CONTROLS LATCKES to bus SELECT StrOBES J024 76 4771 Matrix LaTCHES #8 BUSES25 To
' _ {6 tjc
240 SERIAL J/o Ports 6 M
I I1 1
' -`
K7764 OutPUT
47764 CUTPUT
CONTROLLER
CONTROLLER
D..ADaTA A. AdorESS C,.CONTROL
DAIa Bu5
ADQRESS BuS
Figure
COKIBOL _ Bus
2-4
```

</details>

## Contents (JSON)

```json
{
 "file": "PHOTOS/Drawings/19xx - Systems Description MicroCOM Communication System.jpg",
 "sha256": "494e40c84d7acbd5ab2993e4861be6febac12de83a89dc02572561e459c7764f",
 "kind": "module",
 "models": [
  "microCOM"
 ],
 "pages": 1,
 "order": [
  {
   "page": 1,
   "title_block": [
    {
     "title": "Systems Description MicroCOM Communication System"
    }
   ],
   "modules": [
    "M724",
    "M771"
   ],
   "module_boxes": [
    {
     "code": "RMf~.",
     "box": [
      0.6371,
      0.0262,
      0.7629,
      0.0399
     ]
    },
    {
     "code": "WARD-BECK SYSTEMS",
     "box": [
      0.0895,
      0.0325,
      0.3839,
      0.0496
     ]
    },
    {
     "code": "LTD_",
     "box": [
      0.3903,
      0.0331,
      0.4419,
      0.0491
     ]
    },
    {
     "code": "SYSTEMS",
     "box": [
      0.4008,
      0.1278,
      0.4887,
      0.1449
     ]
    },
    {
     "code": "DESCRIPTION",
     "box": [
      0.4968,
      0.1289,
      0.6306,
      0.1438
     ]
    },
    {
     "code": "MicroCoM",
     "box": [
      0.3516,
      0.1586,
      0.4484,
      0.1734
     ]
    },
    {
     "code": "Communication",
     "box": [
      0.4556,
      0.158,
      0.6065,
      0.1751
     ]
    },
    {
     "code": "System",
     "box": [
      0.6129,
      0.1597,
      0.6823,
      0.1746
     ]
    },
    {
     "code": "M771",
     "box": [
      0.1629,
      0.2168,
      0.2113,
      0.2305
     ]
    },
    {
     "code": "Matrix",
     "box": [
      0.2258,
      0.2168,
      0.2952,
      0.2305
     ]
    },
    {
     "code": "Latch",
     "box": [
      0.3081,
      0.2168,
      0.3661,
      0.2305
     ]
    },
    {
     "code": "Module",
     "box": [
      0.3806,
      0.2168,
      0.4532,
      0.2305
     ]
    },
    {
     "code": "is",
     "box": [
      0.4653,
      0.2185,
      0.4847,
      0.2299
     ]
    },
    {
     "code": "located",
     "box": [
      0.4968,
      0.2168,
      0.5726,
      0.2316
     ]
    },
    {
     "code": "in",
     "box": [
      0.5839,
      0.2168,
      0.6081,
      0.2305
     ]
    },
    {
     "code": "the",
     "box": [
      0.6177,
      0.2168,
      0.6532,
      0.2305
     ]
    },
    {
     "code": "first",
     "box": [
      0.6629,
      0.2168,
      0.7129,
      0.2316
     ]
    },
    {
     "code": "position",
     "box": [
      0.7218,
      0.2162,
      0.8065,
      0.2327
     ]
    },
    {
     "code": "of",
     "box": [
      0.8161,
      0.2168,
      0.8403,
      0.2316
     ]
    },
    {
     "code": "each",
     "box": [
      0.8484,
      0.2179,
      0.8984,
      0.2316
     ]
    },
    {
     "code": "MFZD",
     "box": [
      0.1355,
      0.2305,
      0.1871,
      0.2453
     ]
    },
    {
     "code": "matrix",
     "box": [
      0.2024,
      0.2305,
      0.2726,
      0.2464
     ]
    },
    {
     "code": "block .",
     "box": [
      0.2871,
      0.2316,
      0.3532,
      0.2453
     ]
    },
    {
     "code": "multi",
     "box": [
      0.4,
      0.2316,
      0.4548,
      0.2453
     ]
    },
    {
     "code": "position",
     "box": [
      0.4661,
      0.2305,
      0.5516,
      0.2481
     ]
    },
    {
     "code": "frame",
     "box": [
      0.5645,
      0.2316,
      0.6242,
      0.2453
     ]
    },
    {
     "code": "selector",
     "box": [
      0.6363,
      0.2305,
      0.7194,
      0.2481
     ]
    },
    {
     "code": "switch",
     "box": [
      0.7306,
      0.2327,
      0.7984,
      0.2464
     ]
    },
    {
     "code": "on",
     "box": [
      0.8121,
      0.2345,
      0.8363,
      0.2459
     ]
    },
    {
     "code": "each",
     "box": [
      0.85,
      0.2327,
      0.8984,
      0.2464
     ]
    },
    {
     "code": "M771",
     "box": [
      0.1355,
      0.2453,
      0.1823,
      0.2601
     ]
    },
    {
     "code": "is",
     "box": [
      0.1984,
      0.2464,
      0.221,
      0.2601
     ]
    },
    {
     "code": "set",
     "box": [
      0.2363,
      0.2481,
      0.2685,
      0.2596
     ]
    },
    {
     "code": "to",
     "box": [
      0.2831,
      0.2481,
      0.3056,
      0.2596
     ]
    },
    {
     "code": "decode",
     "box": [
      0.321,
      0.2464,
      0.3903,
      0.2601
     ]
    },
    {
     "code": "its",
     "box": [
      0.4048,
      0.2464,
      0.4355,
      0.2601
     ]
    },
    {
     "code": "appropriate",
     "box": [
      0.4476,
      0.2464,
      0.571,
      0.2624
     ]
    },
    {
     "code": "address_",
     "box": [
      0.5831,
      0.2453,
      0.6677,
      0.2613
     ]
    },
    {
     "code": "i.e.",
     "box": [
      0.6879,
      0.2481,
      0.7242,
      0.2618
     ]
    },
    {
     "code": "position",
     "box": [
      0.7427,
      0.2464,
      0.8258,
      0.2624
     ]
    },
    {
     "code": "for",
     "box": [
      0.8645,
      0.2464,
      0.8984,
      0.2613
     ]
    },
    {
     "code": "matrix",
     "box": [
      0.1339,
      0.2613,
      0.2048,
      0.275
     ]
    },
    {
     "code": "inputs",
     "box": [
      0.2121,
      0.2607,
      0.2806,
      0.2767
     ]
    },
    {
     "code": "to",
     "box": [
      0.3121,
      0.263,
      0.3347,
      0.2744
     ]
    },
    {
     "code": "24",
     "box": [
      0.3435,
      0.2613,
      0.3677,
      0.275
     ]
    },
    {
     "code": "or",
     "box": [
      0.3766,
      0.2641,
      0.3992,
      0.2744
     ]
    },
    {
     "code": "position",
     "box": [
      0.4073,
      0.2601,
      0.4919,
      0.2761
     ]
    },
    {
     "code": "for",
     "box": [
      0.5226,
      0.2613,
      0.5565,
      0.275
     ]
    },
    {
     "code": "inputs",
     "box": [
      0.5653,
      0.2607,
      0.6323,
      0.2767
     ]
    },
    {
     "code": "25",
     "box": [
      0.6403,
      0.2613,
      0.6661,
      0.275
     ]
    },
    {
     "code": "to",
     "box": [
      0.675,
      0.263,
      0.696,
      0.2744
     ]
    },
    {
     "code": "48",
     "box": [
      0.7048,
      0.2613,
      0.729,
      0.275
     ]
    },
    {
     "code": "etc",
     "box": [
      0.7379,
      0.263,
      0.7718,
      0.2744
     ]
    },
    {
     "code": "The",
     "box": [
      0.1355,
      0.2898,
      0.1742,
      0.3035
     ]
    },
    {
     "code": "audio",
     "box": [
      0.1871,
      0.2898,
      0.2468,
      0.3035
     ]
    },
    {
     "code": "crosspoints",
     "box": [
      0.2573,
      0.2886,
      0.3758,
      0.3063
     ]
    },
    {
     "code": "of",
     "box": [
      0.3887,
      0.2898,
      0.4113,
      0.3035
     ]
    },
    {
     "code": "an",
     "box": [
      0.425,
      0.2926,
      0.4492,
      0.3041
     ]
    },
    {
     "code": "MFZD",
     "box": [
      0.4645,
      0.2898,
      0.5177,
      0.3046
     ]
    },
    {
     "code": "matrix",
     "box": [
      0.5274,
      0.2909,
      0.5968,
      0.3046
     ]
    },
    {
     "code": "block",
     "box": [
      0.6081,
      0.2909,
      0.6661,
      0.3046
     ]
    },
    {
     "code": "are",
     "box": [
      0.6766,
      0.2926,
      0.7121,
      0.3041
     ]
    },
    {
     "code": "activated",
     "box": [
      0.7226,
      0.2909,
      0.821,
      0.3046
     ]
    },
    {
     "code": "by",
     "box": [
      0.8306,
      0.2909,
      0.8597,
      0.3058
     ]
    },
    {
     "code": "an",
     "box": [
      0.8702,
      0.2926,
      0.896,
      0.3041
     ]
    },
    {
     "code": "X-Y",
     "box": [
      0.1339,
      0.3035,
      0.1742,
      0.3183
     ]
    },
    {
     "code": "type",
     "box": [
      0.1903,
      0.3058,
      0.2371,
      0.3206
     ]
    },
    {
     "code": "control",
     "box": [
      0.2548,
      0.3046,
      0.3274,
      0.3183
     ]
    },
    {
     "code": "from",
     "box": [
      0.3435,
      0.3046,
      0.3919,
      0.3183
     ]
    },
    {
     "code": "the",
     "box": [
      0.4081,
      0.3046,
      0.4435,
      0.3183
     ]
    },
    {
     "code": "M771",
     "box": [
      0.4581,
      0.3046,
      0.5065,
      0.3183
     ]
    },
    {
     "code": "The",
     "box": [
      0.5323,
      0.3046,
      0.5726,
      0.3183
     ]
    },
    {
     "code": "crosspoint",
     "box": [
      0.5847,
      0.3035,
      0.6935,
      0.3223
     ]
    },
    {
     "code": "bit",
     "box": [
      0.7073,
      0.3063,
      0.7395,
      0.3177
     ]
    },
    {
     "code": "pattern",
     "box": [
      0.7524,
      0.3041,
      0.8306,
      0.3206
     ]
    },
    {
     "code": "of",
     "box": [
      0.8452,
      0.3046,
      0.8677,
      0.3195
     ]
    },
    {
     "code": "given",
     "box": [
      0.1355,
      0.3195,
      0.1935,
      0.3343
     ]
    },
    {
     "code": "output",
     "box": [
      0.2048,
      0.3206,
      0.2726,
      0.3343
     ]
    },
    {
     "code": "bus",
     "box": [
      0.2823,
      0.3195,
      0.3226,
      0.3331
     ]
    },
    {
     "code": "is",
     "box": [
      0.3323,
      0.3195,
      0.3565,
      0.3331
     ]
    },
    {
     "code": "loaded",
     "box": [
      0.3661,
      0.3195,
      0.4355,
      0.3331
     ]
    },
    {
     "code": "into",
     "box": [
      0.4476,
      0.3212,
      0.4879,
      0.3326
     ]
    },
    {
     "code": "these",
     "box": [
      0.5,
      0.3195,
      0.5548,
      0.3331
     ]
    },
    {
     "code": "crosspoint",
     "box": [
      0.5645,
      0.3206,
      0.6726,
      0.3343
     ]
    },
    {
     "code": "control",
     "box": [
      0.6815,
      0.3212,
      0.754,
      0.3326
     ]
    },
    {
     "code": "Iatches",
     "box": [
      0.7661,
      0.3195,
      0.8435,
      0.3343
     ]
    },
    {
     "code": "The",
     "box": [
      0.8581,
      0.3189,
      0.8992,
      0.3343
     ]
    },
    {
     "code": "Select",
     "box": [
      0.1903,
      0.3343,
      0.2532,
      0.348
     ]
    },
    {
     "code": "Strobe",
     "box": [
      0.2677,
      0.3343,
      0.3355,
      0.348
     ]
    },
    {
     "code": "of",
     "box": [
      0.3516,
      0.3343,
      0.3742,
      0.348
     ]
    },
    {
     "code": "this",
     "box": [
      0.3903,
      0.3343,
      0.4339,
      0.348
     ]
    },
    {
     "code": "bus",
     "box": [
      0.45,
      0.3343,
      0.4887,
      0.348
     ]
    },
    {
     "code": "is",
     "box": [
      0.5065,
      0.3343,
      0.5274,
      0.348
     ]
    },
    {
     "code": "then",
     "box": [
      0.5452,
      0.3343,
      0.5903,
      0.348
     ]
    },
    {
     "code": "activated,",
     "box": [
      0.6081,
      0.3343,
      0.7145,
      0.3503
     ]
    },
    {
     "code": "which",
     "box": [
      0.7331,
      0.3331,
      0.7935,
      0.3491
     ]
    },
    {
     "code": "in",
     "box": [
      0.8121,
      0.336,
      0.8347,
      0.3474
     ]
    },
    {
     "code": "turn",
     "box": [
      0.8516,
      0.3354,
      0.8984,
      0.3491
     ]
    },
    {
     "code": "enables",
     "box": [
      0.1339,
      0.3491,
      0.2161,
      0.3628
     ]
    },
    {
     "code": "the",
     "box": [
      0.2306,
      0.3491,
      0.2645,
      0.3628
     ]
    },
    {
     "code": "control",
     "box": [
      0.279,
      0.3491,
      0.3532,
      0.3628
     ]
    },
    {
     "code": "gates",
     "box": [
      0.3661,
      0.3491,
      0.4242,
      0.3639
     ]
    },
    {
     "code": "of",
     "box": [
      0.4355,
      0.3491,
      0.4581,
      0.3628
     ]
    },
    {
     "code": "the",
     "box": [
      0.4694,
      0.3491,
      0.5048,
      0.3628
     ]
    },
    {
     "code": "respective",
     "box": [
      0.5169,
      0.3485,
      0.6258,
      0.3645
     ]
    },
    {
     "code": "M724B",
     "box": [
      0.6371,
      0.348,
      0.6984,
      0.3628
     ]
    },
    {
     "code": "Matrix",
     "box": [
      0.7113,
      0.3491,
      0.7806,
      0.3628
     ]
    },
    {
     "code": "Amplifier.",
     "box": [
      0.7935,
      0.3491,
      0.8968,
      0.3639
     ]
    },
    {
     "code": "This",
     "box": [
      0.1355,
      0.3628,
      0.1823,
      0.3776
     ]
    },
    {
     "code": "in",
     "box": [
      0.1968,
      0.3639,
      0.221,
      0.3776
     ]
    },
    {
     "code": "turn",
     "box": [
      0.2363,
      0.3657,
      0.2815,
      0.3771
     ]
    },
    {
     "code": "refreshes",
     "box": [
      0.2952,
      0.3628,
      0.3919,
      0.3776
     ]
    },
    {
     "code": "the",
     "box": [
      0.4048,
      0.3639,
      0.4403,
      0.3776
     ]
    },
    {
     "code": "\"memory",
     "box": [
      0.4508,
      0.3634,
      0.5371,
      0.3788
     ]
    },
    {
     "code": "capacitors\"",
     "box": [
      0.5492,
      0.3634,
      0.6694,
      0.3799
     ]
    },
    {
     "code": "of",
     "box": [
      0.6806,
      0.3639,
      0.7048,
      0.3776
     ]
    },
    {
     "code": "the",
     "box": [
      0.7161,
      0.3639,
      0.7516,
      0.3776
     ]
    },
    {
     "code": "M724B",
     "box": [
      0.7645,
      0.3628,
      0.8242,
      0.3776
     ]
    },
    {
     "code": "which",
     "box": [
      0.8387,
      0.3639,
      0.8984,
      0.3776
     ]
    },
    {
     "code": "determine",
     "box": [
      0.1347,
      0.3771,
      0.2371,
      0.3936
     ]
    },
    {
     "code": "the",
     "box": [
      0.2484,
      0.3788,
      0.2839,
      0.3925
     ]
    },
    {
     "code": "crosspoint",
     "box": [
      0.2944,
      0.3782,
      0.4032,
      0.3942
     ]
    },
    {
     "code": "state.",
     "box": [
      0.4129,
      0.3788,
      0.4742,
      0.3925
     ]
    },
    {
     "code": "AM",
     "box": [
      0.4871,
      0.3776,
      0.5194,
      0.3913
     ]
    },
    {
     "code": "24",
     "box": [
      0.5306,
      0.3788,
      0.5548,
      0.3925
     ]
    },
    {
     "code": "output",
     "box": [
      0.5645,
      0.3799,
      0.6339,
      0.3936
     ]
    },
    {
     "code": "buses",
     "box": [
      0.6435,
      0.3788,
      0.7032,
      0.3925
     ]
    },
    {
     "code": "are",
     "box": [
      0.7137,
      0.3805,
      0.7492,
      0.3919
     ]
    },
    {
     "code": "addressed",
     "box": [
      0.7597,
      0.3788,
      0.8629,
      0.3925
     ]
    },
    {
     "code": "in",
     "box": [
      0.8742,
      0.3788,
      0.8984,
      0.3925
     ]
    },
    {
     "code": "this",
     "box": [
      0.1355,
      0.3925,
      0.1774,
      0.4062
     ]
    },
    {
     "code": "fashion",
     "box": [
      0.1903,
      0.3925,
      0.2677,
      0.4062
     ]
    },
    {
     "code": "consecutively",
     "box": [
      0.2798,
      0.3925,
      0.4194,
      0.4084
     ]
    },
    {
     "code": "approximately",
     "box": [
      0.4315,
      0.3936,
      0.5774,
      0.4084
     ]
    },
    {
     "code": "every",
     "box": [
      0.5903,
      0.3948,
      0.6484,
      0.4084
     ]
    },
    {
     "code": "150",
     "box": [
      0.6613,
      0.3925,
      0.6935,
      0.4062
     ]
    },
    {
     "code": "milliseconds,",
     "box": [
      0.7032,
      0.3925,
      0.8387,
      0.4084
     ]
    },
    {
     "code": "with",
     "box": [
      0.8516,
      0.3936,
      0.8984,
      0.4073
     ]
    },
    {
     "code": "each",
     "box": [
      0.1339,
      0.4073,
      0.1839,
      0.421
     ]
    },
    {
     "code": "bus",
     "box": [
      0.1984,
      0.4073,
      0.2371,
      0.421
     ]
    },
    {
     "code": "select",
     "box": [
      0.2524,
      0.409,
      0.3137,
      0.4204
     ]
    },
    {
     "code": "strobe",
     "box": [
      0.3282,
      0.409,
      0.3944,
      0.4204
     ]
    },
    {
     "code": "being",
     "box": [
      0.4065,
      0.4062,
      0.4685,
      0.4238
     ]
    },
    {
     "code": "enabled",
     "box": [
      0.4823,
      0.4073,
      0.5645,
      0.4221
     ]
    },
    {
     "code": "for",
     "box": [
      0.579,
      0.4073,
      0.6113,
      0.421
     ]
    },
    {
     "code": "approximately",
     "box": [
      0.6234,
      0.4067,
      0.771,
      0.4238
     ]
    },
    {
     "code": "500",
     "box": [
      0.7839,
      0.4073,
      0.8194,
      0.421
     ]
    },
    {
     "code": "micro-",
     "box": [
      0.8306,
      0.4084,
      0.8984,
      0.4221
     ]
    },
    {
     "code": "seconds",
     "box": [
      0.1331,
      0.4216,
      0.2153,
      0.4353
     ]
    },
    {
     "code": "P, :`",
     "box": [
      0.3589,
      0.4307,
      0.4073,
      0.4421
     ]
    },
    {
     "code": "\"~c-",
     "box": [
      0.4702,
      0.4318,
      0.5073,
      0.4421
     ]
    },
    {
     "code": "\"` ^ -",
     "box": [
      0.5218,
      0.433,
      0.5911,
      0.4432
     ]
    },
    {
     "code": "Figure",
     "box": [
      0.1323,
      0.4501,
      0.2065,
      0.4683
     ]
    },
    {
     "code": "2",
     "box": [
      0.2202,
      0.4524,
      0.2315,
      0.4649
     ]
    },
    {
     "code": "below",
     "box": [
      0.2435,
      0.4507,
      0.3032,
      0.4655
     ]
    },
    {
     "code": "ilustrates",
     "box": [
      0.3161,
      0.4518,
      0.4274,
      0.4655
     ]
    },
    {
     "code": "the",
     "box": [
      0.4403,
      0.4518,
      0.4742,
      0.4655
     ]
    },
    {
     "code": "data",
     "box": [
      0.4871,
      0.4518,
      0.5355,
      0.4655
     ]
    },
    {
     "code": "transfer",
     "box": [
      0.5484,
      0.4507,
      0.6355,
      0.4655
     ]
    },
    {
     "code": "between",
     "box": [
      0.6468,
      0.4518,
      0.729,
      0.4655
     ]
    },
    {
     "code": "modules",
     "box": [
      0.7403,
      0.4518,
      0.821,
      0.4655
     ]
    },
    {
     "code": "of",
     "box": [
      0.8306,
      0.4518,
      0.8548,
      0.4655
     ]
    },
    {
     "code": "the",
     "box": [
      0.8629,
      0.4518,
      0.9,
      0.4655
     ]
    },
    {
     "code": "MicroCoM",
     "box": [
      0.1347,
      0.4655,
      0.2298,
      0.4803
     ]
    },
    {
     "code": "control",
     "box": [
      0.2387,
      0.4666,
      0.3129,
      0.4803
     ]
    },
    {
     "code": "system",
     "box": [
      0.3202,
      0.4655,
      0.3935,
      0.482
     ]
    },
    {
     "code": "To 4771",
     "box": [
      0.5782,
      0.4763,
      0.6331,
      0.4866
     ]
    },
    {
     "code": "MatRix LATCHES",
     "box": [
      0.5468,
      0.4837,
      0.6645,
      0.4974
     ]
    },
    {
     "code": "METD_MAIRIX_BLOCK",
     "box": [
      0.7218,
      0.5117,
      0.8605,
      0.5231
     ]
    },
    {
     "code": "; ; _",
     "box": [
      0.1669,
      0.5197,
      0.204,
      0.5288
     ]
    },
    {
     "code": "Xul_",
     "box": [
      0.3911,
      0.5231,
      0.4185,
      0.5322
     ]
    },
    {
     "code": "IIPROCESSQR",
     "box": [
      0.4137,
      0.5191,
      0.5048,
      0.5339
     ]
    },
    {
     "code": "701o",
     "box": [
      0.1266,
      0.5317,
      0.1806,
      0.5454
     ]
    },
    {
     "code": "Bus",
     "box": [
      0.4331,
      0.5322,
      0.4605,
      0.5414
     ]
    },
    {
     "code": "K771",
     "box": [
      0.6734,
      0.5288,
      0.7056,
      0.5391
     ]
    },
    {
     "code": "CROSSPOINT",
     "box": [
      0.7734,
      0.5277,
      0.8524,
      0.5379
     ]
    },
    {
     "code": "MatrIX",
     "box": [
      0.6653,
      0.5379,
      0.7185,
      0.5493
     ]
    },
    {
     "code": "CONTROLS",
     "box": [
      0.7798,
      0.5357,
      0.846,
      0.5471
     ]
    },
    {
     "code": "48 0",
     "box": [
      0.1282,
      0.5505,
      0.1637,
      0.5608
     ]
    },
    {
     "code": "AATCHES",
     "box": [
      0.6669,
      0.5482,
      0.7137,
      0.5585
     ]
    },
    {
     "code": "25 To",
     "box": [
      0.7831,
      0.5459,
      0.8234,
      0.5562
     ]
    },
    {
     "code": "Bus SeLecT",
     "box": [
      0.775,
      0.5562,
      0.8524,
      0.5676
     ]
    },
    {
     "code": "SERIAL",
     "box": [
      0.1444,
      0.5642,
      0.1944,
      0.5756
     ]
    },
    {
     "code": "stroBES",
     "box": [
      0.7847,
      0.5653,
      0.8427,
      0.5767
     ]
    },
    {
     "code": "Poxss",
     "box": [
      0.1452,
      0.5727,
      0.1935,
      0.6024
     ]
    },
    {
     "code": "1",
     "box": [
      0.204,
      0.5722,
      0.2153,
      0.5961
     ]
    },
    {
     "code": "M",
     "box": [
      0.2121,
      0.5608,
      0.2581,
      0.6104
     ]
    },
    {
     "code": "1",
     "box": [
      0.3298,
      0.5659,
      0.3637,
      0.5984
     ]
    },
    {
     "code": "1",
     "box": [
      0.3621,
      0.5505,
      0.375,
      0.6087
     ]
    },
    {
     "code": "To 24",
     "box": [
      0.8008,
      0.5756,
      0.8411,
      0.5859
     ]
    },
    {
     "code": "METO_MATRIX BLock",
     "box": [
      0.721,
      0.5944,
      0.8613,
      0.6081
     ]
    },
    {
     "code": "350",
     "box": [
      0.1282,
      0.6064,
      0.1605,
      0.6167
     ]
    },
    {
     "code": "M771",
     "box": [
      0.675,
      0.6167,
      0.7073,
      0.6258
     ]
    },
    {
     "code": "CROSSPOINT",
     "box": [
      0.7734,
      0.6115,
      0.8524,
      0.6229
     ]
    },
    {
     "code": "F^",
     "box": [
      0.125,
      0.6235,
      0.1508,
      0.6326
     ]
    },
    {
     "code": "yi",
     "box": [
      0.1637,
      0.6224,
      0.1927,
      0.6326
     ]
    },
    {
     "code": "MaTRIX",
     "box": [
      0.6653,
      0.6235,
      0.7169,
      0.6349
     ]
    },
    {
     "code": "CONTROLS",
     "box": [
      0.7815,
      0.6235,
      0.8476,
      0.6338
     ]
    },
    {
     "code": "\"on`",
     "box": [
      0.1234,
      0.6349,
      0.2048,
      0.6486
     ]
    },
    {
     "code": "LATCKES",
     "box": [
      0.6653,
      0.6326,
      0.7202,
      0.644
     ]
    },
    {
     "code": "to",
     "box": [
      0.8008,
      0.6315,
      0.8218,
      0.6429
     ]
    },
    {
     "code": "bus SELECT",
     "box": [
      0.775,
      0.6406,
      0.854,
      0.652
     ]
    },
    {
     "code": "4Cw\"",
     "box": [
      0.1331,
      0.6497,
      0.1911,
      0.6612
     ]
    },
    {
     "code": "StrOBES",
     "box": [
      0.7863,
      0.6497,
      0.8444,
      0.6612
     ]
    },
    {
     "code": "J024",
     "box": [
      0.8024,
      0.66,
      0.8427,
      0.6703
     ]
    },
    {
     "code": "YWWd",
     "box": [
      0.1258,
      0.6629,
      0.1968,
      0.6766
     ]
    },
    {
     "code": "137",
     "box": [
      0.2024,
      0.6657,
      0.2347,
      0.676
     ]
    },
    {
     "code": "76 4771",
     "box": [
      0.7653,
      0.6691,
      0.8234,
      0.6794
     ]
    },
    {
     "code": "Cit:5783",
     "box": [
      0.1347,
      0.6794,
      0.2315,
      0.6908
     ]
    },
    {
     "code": "' _",
     "box": [
      0.5492,
      0.6805,
      0.5815,
      0.6908
     ]
    },
    {
     "code": "Matrix LaTCHES",
     "box": [
      0.7379,
      0.6783,
      0.8524,
      0.6897
     ]
    },
    {
     "code": "#8",
     "box": [
      0.8621,
      0.6714,
      0.9202,
      0.6965
     ]
    },
    {
     "code": "BUSES25",
     "box": [
      0.7411,
      0.6885,
      0.804,
      0.6988
     ]
    },
    {
     "code": "To",
     "box": [
      0.8089,
      0.6897,
      0.8282,
      0.6988
     ]
    },
    {
     "code": "Lo.4",
     "box": [
      0.1427,
      0.6942,
      0.1976,
      0.7045
     ]
    },
    {
     "code": "{6",
     "box": [
      0.5258,
      0.6948,
      0.5694,
      0.7068
     ]
    },
    {
     "code": "240",
     "box": [
      0.1282,
      0.7159,
      0.1685,
      0.7262
     ]
    },
    {
     "code": "I",
     "box": [
      0.4218,
      0.6897,
      0.4702,
      0.7285
     ]
    },
    {
     "code": "tjc",
     "box": [
      0.5153,
      0.7102,
      0.5766,
      0.7205
     ]
    },
    {
     "code": "' -`",
     "box": [
      0.546,
      0.7262,
      0.575,
      0.7353
     ]
    },
    {
     "code": "SERIAL",
     "box": [
      0.1476,
      0.7307,
      0.1976,
      0.741
     ]
    },
    {
     "code": "Ports",
     "box": [
      0.1508,
      0.7444,
      0.1992,
      0.7661
     ]
    },
    {
     "code": "J/o",
     "box": [
      0.1605,
      0.7399,
      0.1879,
      0.749
     ]
    },
    {
     "code": "6",
     "box": [
      0.204,
      0.7365,
      0.2169,
      0.7593
     ]
    },
    {
     "code": "M",
     "box": [
      0.2113,
      0.7199,
      0.2605,
      0.7747
     ]
    },
    {
     "code": "I1",
     "box": [
      0.3347,
      0.733,
      0.3653,
      0.7638
     ]
    },
    {
     "code": "1",
     "box": [
      0.3637,
      0.7159,
      0.3766,
      0.7741
     ]
    },
    {
     "code": "K7764",
     "box": [
      0.5879,
      0.7513,
      0.6282,
      0.7616
     ]
    },
    {
     "code": "47764",
     "box": [
      0.7782,
      0.7536,
      0.8169,
      0.7627
     ]
    },
    {
     "code": "OutPUT",
     "box": [
      0.5831,
      0.7616,
      0.6347,
      0.7707
     ]
    },
    {
     "code": "CUTPUT",
     "box": [
      0.7718,
      0.7604,
      0.8234,
      0.7718
     ]
    },
    {
     "code": "CONTROLLER",
     "box": [
      0.5653,
      0.7695,
      0.6508,
      0.7809
     ]
    },
    {
     "code": "CONTROLLER",
     "box": [
      0.754,
      0.7695,
      0.8395,
      0.7809
     ]
    },
    {
     "code": "D..ADaTA",
     "box": [
      0.1702,
      0.806,
      0.2347,
      0.8163
     ]
    },
    {
     "code": "A. AdorESS",
     "box": [
      0.2395,
      0.806,
      0.325,
      0.8163
     ]
    },
    {
     "code": "C,.CONTROL",
     "box": [
      0.3298,
      0.806,
      0.4153,
      0.8163
     ]
    },
    {
     "code": "DAIa",
     "box": [
      0.5847,
      0.8152,
      0.6202,
      0.8243
     ]
    },
    {
     "code": "Bu5",
     "box": [
      0.625,
      0.8152,
      0.6508,
      0.8243
     ]
    },
    {
     "code": "ADQRESS",
     "box": [
      0.5815,
      0.838,
      0.6379,
      0.8471
     ]
    },
    {
     "code": "BuS",
     "box": [
      0.6427,
      0.8369,
      0.6685,
      0.846
     ]
    },
    {
     "code": "Figure",
     "box": [
      0.171,
      0.842,
      0.2419,
      0.8568
     ]
    },
    {
     "code": "COKIBOL _",
     "box": [
      0.5798,
      0.8597,
      0.6363,
      0.8688
     ]
    },
    {
     "code": "Bus",
     "box": [
      0.6411,
      0.8585,
      0.6669,
      0.8677
     ]
    },
    {
     "code": "2-4",
     "box": [
      0.4984,
      0.9013,
      0.5339,
      0.915
     ]
    },
    {
     "code": "Bus",
     "box": [
      0.1331,
      0.3314,
      0.1758,
      0.3497
     ]
    },
    {
     "code": " .",
     "box": [
      0.2024,
      0.648,
      0.2403,
      0.6629
     ]
    }
   ]
  }
 ]
}
```
