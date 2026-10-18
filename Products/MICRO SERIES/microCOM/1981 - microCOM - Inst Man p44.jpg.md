# 1981 - microCOM - Inst Man p44.jpg
Wiki page: [microCOM](../../../PAGES/microCOM.md)


- **Year:** 1981 (module estimate (numeric))
- **Module:** microCOM
- **Category:** MICRO SERIES
- **Module year estimate:** 1981 — numeric "07/13/81" in PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p49.JPG
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p44.JPG`
- **SHA-256:** `94d52b551f9220d3afd6661aad940c690614e84c1d7b2053d6ed2e68e814d480`
- **Size:** 326,944 bytes
- **Pages:** 1

## Full text

### Page 1 (OCR, spell-checked: 3 words corrected)

```text
WAAD-BECK SYSTEMS LTD.
e t
FIXED LEVER KEY
AND PUSHBUTTON
CROSSPOINT ADDRESSING
The addressing for fixed lever key and pushbutton control on communications terminal is determined by series of tables located within one 2716 EPROM memory chip. It is located on the 5A14-033 daughter assemb ly of the M774A input controllers
Each table corresponds to one block of 24 system control inputs The starting address of each table is located every 256 bytes (eg . OOooH , 01O0H, 0200H, etc)
The first 24 locations of table represent index pointers for the quantity of fixed crosspoints controlled for each bus The rema ining 232 table locations are used for the actual bus codes that are utilized_
The index pointer not only gives the quantity of fixed crosspoints assigned but also whether the assignable function for the bus in question is activated. This is determined by setting bit to logic Mf it remains logic then only the fixed address keys are activated_ An index poi nter code of 00 signifies no assignment on that bus in question
Normally the total number of fixed address keys per bus is limited to 24, however with the addition of certain special control routines in the control system software, this total can be increased (e.g NTC Supervisor
The fixed lever key address code for talk control function is the bus number of the crosspoint to be activated_ It should be noted that all codes are stored in memory in hexadecimal format_
In the NTC Microcom System, one of the groups of stations, the Graphics station, has fixed pushbutton control as wel | as fixed Ever key control .
Each Graphics station has Graphics Select panel associated with its M7800 communications terminal This panel has three push- buttons which operate fixed listen crosspoint on each of the three Graphics Party Line buses to allow the associated Graphics station to Listen to any one of the Graphics Party Lines_
2-1
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECK SYSTEMS LTD.
e t
FIXED LEVER KEY
AND PUSHBUTTON
CROSSPOINT ADDRESSING
The addressing for fixed lever key and pushbutton control on communications terminal is determined by series of tables located within one 2716 EPROM memory chip. It is located on the 5A14-033 daughter assemb ly of the M774A input controllers
Each table corresponds to one block of 24 system control inputs The starting address of each table is located every 256 bytes (eg . OOooH , 01O0H, 0200H, etc)
The first 24 locations of table represent index pointers for the quantity of fixed crosspoints controlled for each bus The rema ining 232 table locations are used for the actual bus codes that are utilized_
The index pointer not only gives the quantity of fixed crosspoints assigned but also whether the assignable function for the bus in question is activated. This is determined by setting bit to logic Mf it remains logic then only the fixed address keys are activated_ An index poi nter code of 00 signifies no assignment on that bus in question
Normally the total number of fixed address keys per bus is limited to 24, however with the addition of certain special control routines in the control system software, this total can be increased (e.g NTC Supervisor
The fixed lever key address code for talk control function is the bus number of the crosspoint to be activated_ It should be noted that all codes are stored in memory in hexadecimal format_
In the NTC Microcom System, one of the groups of stations, the Graphics station, has fixed pushbutton control as wel | as fixed Tever key control .
Each Graphics station has Graphics Select panel associated with its M7800 communications terminal This panel has three push- buttons which operate fixed isten crosspoint on each of the three Graphics Party Line buses to allow the associated Graphics station to Iisten to any one of the Graphics Party Lines_
2-1
```

</details>

## Contents (JSON)

```json
{
 "file": "Products/MICRO SERIES/microCOM/1981 - microCOM - Inst Man p44.jpg",
 "sha256": "94d52b551f9220d3afd6661aad940c690614e84c1d7b2053d6ed2e68e814d480",
 "kind": "module",
 "models": [
  "microCOM"
 ],
 "year": 1981,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "modules": [
    "M774",
    "M7800"
   ],
   "module_boxes": [
    {
     "code": "WAAD-BECK SYSTEMS",
     "box": [
      0.0952,
      0.0308,
      0.3887,
      0.0479
     ]
    },
    {
     "code": "LTD.",
     "box": [
      0.3952,
      0.0319,
      0.4484,
      0.0479
     ]
    },
    {
     "code": ". ^ .`' :.",
     "box": [
      0.5855,
      0.0308,
      0.7661,
      0.0468
     ]
    },
    {
     "code": "t",
     "box": [
      0.7742,
      0.0297,
      0.9355,
      0.0456
     ]
    },
    {
     "code": "FIXED",
     "box": [
      0.4258,
      0.1244,
      0.4887,
      0.1392
     ]
    },
    {
     "code": "LEVER",
     "box": [
      0.4968,
      0.1255,
      0.5629,
      0.1392
     ]
    },
    {
     "code": "KEY",
     "box": [
      0.571,
      0.1244,
      0.6129,
      0.1392
     ]
    },
    {
     "code": "AND",
     "box": [
      0.4306,
      0.1529,
      0.4726,
      0.1689
     ]
    },
    {
     "code": "PUSHBUTTON",
     "box": [
      0.4806,
      0.154,
      0.6065,
      0.1689
     ]
    },
    {
     "code": "CROSSPOINT",
     "box": [
      0.3952,
      0.1825,
      0.5145,
      0.1974
     ]
    },
    {
     "code": "ADDRESSING",
     "box": [
      0.5258,
      0.1825,
      0.6468,
      0.1962
     ]
    },
    {
     "code": "addressing",
     "box": [
      0.225,
      0.2413,
      0.3419,
      0.2578
     ]
    },
    {
     "code": "for",
     "box": [
      0.3532,
      0.2419,
      0.3871,
      0.2556
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.3984,
      0.2419,
      0.4548,
      0.2556
     ]
    },
    {
     "code": "lever",
     "box": [
      0.4677,
      0.2419,
      0.5226,
      0.2556
     ]
    },
    {
     "code": "key",
     "box": [
      0.5339,
      0.2413,
      0.5734,
      0.2567
     ]
    },
    {
     "code": "and",
     "box": [
      0.5871,
      0.2419,
      0.6274,
      0.2556
     ]
    },
    {
     "code": "pushbutton",
     "box": [
      0.6395,
      0.239,
      0.7532,
      0.2567
     ]
    },
    {
     "code": "control",
     "box": [
      0.7645,
      0.2407,
      0.8387,
      0.2544
     ]
    },
    {
     "code": "on",
     "box": [
      0.8492,
      0.2424,
      0.8734,
      0.2539
     ]
    },
    {
     "code": "communications",
     "box": [
      0.1371,
      0.2578,
      0.2968,
      0.2715
     ]
    },
    {
     "code": "terminal",
     "box": [
      0.3089,
      0.2556,
      0.3952,
      0.2715
     ]
    },
    {
     "code": "is",
     "box": [
      0.4097,
      0.2567,
      0.4323,
      0.2704
     ]
    },
    {
     "code": "determined",
     "box": [
      0.4452,
      0.2567,
      0.5581,
      0.2704
     ]
    },
    {
     "code": "by",
     "box": [
      0.571,
      0.2567,
      0.5984,
      0.2715
     ]
    },
    {
     "code": "series",
     "box": [
      0.6411,
      0.2573,
      0.704,
      0.2687
     ]
    },
    {
     "code": "of",
     "box": [
      0.7161,
      0.2556,
      0.7387,
      0.2693
     ]
    },
    {
     "code": "tables",
     "box": [
      0.75,
      0.2556,
      0.8177,
      0.2693
     ]
    },
    {
     "code": "located",
     "box": [
      0.8274,
      0.2556,
      0.9016,
      0.2693
     ]
    },
    {
     "code": "within",
     "box": [
      0.1387,
      0.2727,
      0.2065,
      0.2864
     ]
    },
    {
     "code": "one",
     "box": [
      0.2202,
      0.2744,
      0.2573,
      0.2858
     ]
    },
    {
     "code": "2716",
     "box": [
      0.2726,
      0.2715,
      0.3177,
      0.2852
     ]
    },
    {
     "code": "EPROM",
     "box": [
      0.3323,
      0.2704,
      0.4,
      0.2852
     ]
    },
    {
     "code": "memory",
     "box": [
      0.4105,
      0.271,
      0.4871,
      0.2864
     ]
    },
    {
     "code": "chip.",
     "box": [
      0.5,
      0.2715,
      0.5565,
      0.2864
     ]
    },
    {
     "code": "It",
     "box": [
      0.5718,
      0.2721,
      0.5927,
      0.2835
     ]
    },
    {
     "code": "is",
     "box": [
      0.6073,
      0.2721,
      0.6282,
      0.2835
     ]
    },
    {
     "code": "located",
     "box": [
      0.6403,
      0.2704,
      0.7161,
      0.2852
     ]
    },
    {
     "code": "on",
     "box": [
      0.7298,
      0.2721,
      0.7524,
      0.2835
     ]
    },
    {
     "code": "the",
     "box": [
      0.7677,
      0.2704,
      0.8032,
      0.2841
     ]
    },
    {
     "code": "5A14-033",
     "box": [
      0.8145,
      0.2693,
      0.9032,
      0.2841
     ]
    },
    {
     "code": "daughter",
     "box": [
      0.1387,
      0.2875,
      0.2339,
      0.3023
     ]
    },
    {
     "code": "assembly",
     "box": [
      0.2419,
      0.2864,
      0.3339,
      0.3012
     ]
    },
    {
     "code": "of",
     "box": [
      0.3435,
      0.2864,
      0.3677,
      0.3001
     ]
    },
    {
     "code": "the",
     "box": [
      0.3742,
      0.2864,
      0.4113,
      0.3001
     ]
    },
    {
     "code": "M774A",
     "box": [
      0.4194,
      0.2852,
      0.479,
      0.3001
     ]
    },
    {
     "code": "input",
     "box": [
      0.4887,
      0.2864,
      0.5468,
      0.3012
     ]
    },
    {
     "code": "controllers",
     "box": [
      0.5548,
      0.2852,
      0.6694,
      0.2989
     ]
    },
    {
     "code": "Each",
     "box": [
      0.1758,
      0.316,
      0.2258,
      0.3297
     ]
    },
    {
     "code": "table",
     "box": [
      0.2387,
      0.316,
      0.2952,
      0.3297
     ]
    },
    {
     "code": "corresponds",
     "box": [
      0.3056,
      0.3143,
      0.4323,
      0.332
     ]
    },
    {
     "code": "to",
     "box": [
      0.4444,
      0.3166,
      0.4653,
      0.328
     ]
    },
    {
     "code": "one",
     "box": [
      0.4782,
      0.3166,
      0.5153,
      0.328
     ]
    },
    {
     "code": "block",
     "box": [
      0.5242,
      0.3149,
      0.5839,
      0.3286
     ]
    },
    {
     "code": "of",
     "box": [
      0.5935,
      0.3137,
      0.6161,
      0.3286
     ]
    },
    {
     "code": "24",
     "box": [
      0.6274,
      0.3137,
      0.6516,
      0.3274
     ]
    },
    {
     "code": "system",
     "box": [
      0.6597,
      0.3132,
      0.7315,
      0.3303
     ]
    },
    {
     "code": "control",
     "box": [
      0.7403,
      0.3137,
      0.8145,
      0.3274
     ]
    },
    {
     "code": "inputs",
     "box": [
      0.825,
      0.3132,
      0.8952,
      0.3292
     ]
    },
    {
     "code": "The",
     "box": [
      0.1387,
      0.3297,
      0.1774,
      0.3446
     ]
    },
    {
     "code": "starting",
     "box": [
      0.1895,
      0.3297,
      0.2758,
      0.3457
     ]
    },
    {
     "code": "address",
     "box": [
      0.2887,
      0.3297,
      0.3726,
      0.3434
     ]
    },
    {
     "code": "of",
     "box": [
      0.3839,
      0.3297,
      0.4065,
      0.3434
     ]
    },
    {
     "code": "each",
     "box": [
      0.4194,
      0.3297,
      0.4677,
      0.3434
     ]
    },
    {
     "code": "table",
     "box": [
      0.4806,
      0.3297,
      0.5371,
      0.3434
     ]
    },
    {
     "code": "is",
     "box": [
      0.5484,
      0.3297,
      0.571,
      0.3434
     ]
    },
    {
     "code": "located",
     "box": [
      0.5839,
      0.3286,
      0.6597,
      0.3434
     ]
    },
    {
     "code": "every",
     "box": [
      0.6726,
      0.3309,
      0.7306,
      0.3446
     ]
    },
    {
     "code": "256",
     "box": [
      0.7435,
      0.3274,
      0.779,
      0.3423
     ]
    },
    {
     "code": "bytes",
     "box": [
      0.7887,
      0.3286,
      0.8468,
      0.3434
     ]
    },
    {
     "code": "(eg.",
     "box": [
      0.8548,
      0.3269,
      0.9024,
      0.3446
     ]
    },
    {
     "code": "OoooH ,",
     "box": [
      0.1387,
      0.3446,
      0.2032,
      0.3605
     ]
    },
    {
     "code": "0100H,",
     "box": [
      0.2145,
      0.3446,
      0.279,
      0.3605
     ]
    },
    {
     "code": "0200H,",
     "box": [
      0.2903,
      0.3446,
      0.3565,
      0.3594
     ]
    },
    {
     "code": "etc)",
     "box": [
      0.3677,
      0.3434,
      0.4129,
      0.3582
     ]
    },
    {
     "code": "The",
     "box": [
      0.1758,
      0.3731,
      0.2145,
      0.3879
     ]
    },
    {
     "code": "first",
     "box": [
      0.2242,
      0.3742,
      0.2742,
      0.3879
     ]
    },
    {
     "code": "24",
     "box": [
      0.2855,
      0.3731,
      0.3097,
      0.3868
     ]
    },
    {
     "code": "locations",
     "box": [
      0.3194,
      0.3742,
      0.4161,
      0.3879
     ]
    },
    {
     "code": "of",
     "box": [
      0.4242,
      0.3731,
      0.4484,
      0.3868
     ]
    },
    {
     "code": "table",
     "box": [
      0.4855,
      0.3731,
      0.5403,
      0.3868
     ]
    },
    {
     "code": "represent",
     "box": [
      0.5492,
      0.3725,
      0.65,
      0.3879
     ]
    },
    {
     "code": "index",
     "box": [
      0.6597,
      0.3719,
      0.7194,
      0.3868
     ]
    },
    {
     "code": "pointers",
     "box": [
      0.7274,
      0.3725,
      0.8161,
      0.3873
     ]
    },
    {
     "code": "for",
     "box": [
      0.8258,
      0.3719,
      0.8581,
      0.3856
     ]
    },
    {
     "code": "the",
     "box": [
      0.8694,
      0.3719,
      0.9032,
      0.3856
     ]
    },
    {
     "code": "quantity",
     "box": [
      0.1379,
      0.3879,
      0.229,
      0.4039
     ]
    },
    {
     "code": "of",
     "box": [
      0.2419,
      0.3879,
      0.2645,
      0.4027
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.2758,
      0.3879,
      0.3323,
      0.4027
     ]
    },
    {
     "code": "crosspoints",
     "box": [
      0.3444,
      0.3868,
      0.4629,
      0.4039
     ]
    },
    {
     "code": "controlled",
     "box": [
      0.4726,
      0.3879,
      0.5774,
      0.4016
     ]
    },
    {
     "code": "for",
     "box": [
      0.5871,
      0.3868,
      0.621,
      0.4005
     ]
    },
    {
     "code": "each",
     "box": [
      0.6306,
      0.3879,
      0.679,
      0.4016
     ]
    },
    {
     "code": "The",
     "box": [
      0.7516,
      0.3868,
      0.7887,
      0.4005
     ]
    },
    {
     "code": "rema",
     "box": [
      0.8008,
      0.3885,
      0.8476,
      0.3999
     ]
    },
    {
     "code": "ining",
     "box": [
      0.8452,
      0.3851,
      0.904,
      0.4027
     ]
    },
    {
     "code": "232",
     "box": [
      0.1387,
      0.4027,
      0.1742,
      0.4164
     ]
    },
    {
     "code": "table",
     "box": [
      0.1911,
      0.4044,
      0.246,
      0.4159
     ]
    },
    {
     "code": "locations",
     "box": [
      0.2621,
      0.4016,
      0.3581,
      0.4181
     ]
    },
    {
     "code": "are",
     "box": [
      0.375,
      0.4044,
      0.4105,
      0.4159
     ]
    },
    {
     "code": "used",
     "box": [
      0.4274,
      0.4027,
      0.4774,
      0.4164
     ]
    },
    {
     "code": "for",
     "box": [
      0.4919,
      0.4016,
      0.5258,
      0.4164
     ]
    },
    {
     "code": "the",
     "box": [
      0.5444,
      0.4033,
      0.5782,
      0.4147
     ]
    },
    {
     "code": "actual",
     "box": [
      0.596,
      0.4033,
      0.6605,
      0.4147
     ]
    },
    {
     "code": "bus",
     "box": [
      0.6782,
      0.4033,
      0.7169,
      0.4147
     ]
    },
    {
     "code": "codes",
     "box": [
      0.7339,
      0.4016,
      0.7919,
      0.4153
     ]
    },
    {
     "code": "that",
     "box": [
      0.8081,
      0.4016,
      0.8532,
      0.4153
     ]
    },
    {
     "code": "are",
     "box": [
      0.8685,
      0.4033,
      0.9024,
      0.4147
     ]
    },
    {
     "code": "utilized_",
     "box": [
      0.1387,
      0.4176,
      0.2242,
      0.4313
     ]
    },
    {
     "code": "index",
     "box": [
      0.2258,
      0.4472,
      0.2855,
      0.4609
     ]
    },
    {
     "code": "pointer",
     "box": [
      0.2944,
      0.445,
      0.3726,
      0.4621
     ]
    },
    {
     "code": "not",
     "box": [
      0.3831,
      0.4478,
      0.4169,
      0.4592
     ]
    },
    {
     "code": "only",
     "box": [
      0.4274,
      0.4461,
      0.4742,
      0.4609
     ]
    },
    {
     "code": "gives",
     "box": [
      0.4855,
      0.4461,
      0.5435,
      0.4621
     ]
    },
    {
     "code": "the",
     "box": [
      0.5516,
      0.4461,
      0.5871,
      0.4598
     ]
    },
    {
     "code": "quantity",
     "box": [
      0.5952,
      0.4461,
      0.6839,
      0.4609
     ]
    },
    {
     "code": "of",
     "box": [
      0.6919,
      0.445,
      0.7161,
      0.4586
     ]
    },
    {
     "code": "fixed crosspoints",
     "box": [
      0.7226,
      0.4438,
      0.9048,
      0.4615
     ]
    },
    {
     "code": "assigned",
     "box": [
      0.1387,
      0.4621,
      0.2323,
      0.4769
     ]
    },
    {
     "code": "but",
     "box": [
      0.2468,
      0.4621,
      0.2839,
      0.4758
     ]
    },
    {
     "code": "also",
     "box": [
      0.2984,
      0.4621,
      0.3435,
      0.4758
     ]
    },
    {
     "code": "whether",
     "box": [
      0.3597,
      0.4609,
      0.4403,
      0.4758
     ]
    },
    {
     "code": "the",
     "box": [
      0.4548,
      0.4609,
      0.4903,
      0.4746
     ]
    },
    {
     "code": "assignable",
     "box": [
      0.5032,
      0.4604,
      0.6177,
      0.4769
     ]
    },
    {
     "code": "function",
     "box": [
      0.6306,
      0.4609,
      0.7161,
      0.4746
     ]
    },
    {
     "code": "for",
     "box": [
      0.7306,
      0.4598,
      0.7645,
      0.4735
     ]
    },
    {
     "code": "the",
     "box": [
      0.779,
      0.4609,
      0.8145,
      0.4746
     ]
    },
    {
     "code": "in",
     "box": [
      0.8798,
      0.4615,
      0.9024,
      0.4729
     ]
    },
    {
     "code": "question",
     "box": [
      0.1403,
      0.4769,
      0.2274,
      0.4917
     ]
    },
    {
     "code": "is",
     "box": [
      0.2387,
      0.4769,
      0.2613,
      0.4906
     ]
    },
    {
     "code": "activated.",
     "box": [
      0.271,
      0.4758,
      0.379,
      0.4906
     ]
    },
    {
     "code": "This",
     "box": [
      0.3919,
      0.4758,
      0.4387,
      0.4894
     ]
    },
    {
     "code": "is",
     "box": [
      0.4484,
      0.4758,
      0.471,
      0.4894
     ]
    },
    {
     "code": "determined",
     "box": [
      0.4823,
      0.4758,
      0.5952,
      0.4894
     ]
    },
    {
     "code": "by",
     "box": [
      0.6048,
      0.4758,
      0.6339,
      0.4906
     ]
    },
    {
     "code": "setting",
     "box": [
      0.6427,
      0.4746,
      0.7177,
      0.4906
     ]
    },
    {
     "code": "bit",
     "box": [
      0.7274,
      0.4746,
      0.7613,
      0.4894
     ]
    },
    {
     "code": "to",
     "box": [
      0.7968,
      0.4758,
      0.8194,
      0.4894
     ]
    },
    {
     "code": "logic",
     "box": [
      0.8516,
      0.4746,
      0.9048,
      0.4906
     ]
    },
    {
     "code": "Mf",
     "box": [
      0.1798,
      0.4923,
      0.2008,
      0.5037
     ]
    },
    {
     "code": "it",
     "box": [
      0.2169,
      0.4923,
      0.2363,
      0.5037
     ]
    },
    {
     "code": "remains",
     "box": [
      0.2516,
      0.4917,
      0.3339,
      0.5054
     ]
    },
    {
     "code": "logic",
     "box": [
      0.379,
      0.4906,
      0.4323,
      0.5066
     ]
    },
    {
     "code": "then",
     "box": [
      0.4758,
      0.4906,
      0.521,
      0.5043
     ]
    },
    {
     "code": "only",
     "box": [
      0.5371,
      0.4906,
      0.5839,
      0.5054
     ]
    },
    {
     "code": "the",
     "box": [
      0.5984,
      0.4906,
      0.6323,
      0.5043
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.6435,
      0.4894,
      0.6984,
      0.5043
     ]
    },
    {
     "code": "address",
     "box": [
      0.7129,
      0.4894,
      0.7935,
      0.5043
     ]
    },
    {
     "code": "keys",
     "box": [
      0.8056,
      0.49,
      0.8565,
      0.506
     ]
    },
    {
     "code": "are",
     "box": [
      0.8685,
      0.4912,
      0.904,
      0.5026
     ]
    },
    {
     "code": "activated_",
     "box": [
      0.1387,
      0.5066,
      0.2419,
      0.5203
     ]
    },
    {
     "code": "An",
     "box": [
      0.2629,
      0.5054,
      0.2919,
      0.5191
     ]
    },
    {
     "code": "index",
     "box": [
      0.3065,
      0.5054,
      0.3661,
      0.5191
     ]
    },
    {
     "code": "nter",
     "box": [
      0.4129,
      0.5054,
      0.4565,
      0.5191
     ]
    },
    {
     "code": "code",
     "box": [
      0.471,
      0.5054,
      0.5194,
      0.5191
     ]
    },
    {
     "code": "of",
     "box": [
      0.5323,
      0.5054,
      0.5565,
      0.5191
     ]
    },
    {
     "code": "00",
     "box": [
      0.571,
      0.5043,
      0.5952,
      0.518
     ]
    },
    {
     "code": "signifies",
     "box": [
      0.6073,
      0.5026,
      0.7,
      0.5208
     ]
    },
    {
     "code": "no",
     "box": [
      0.7137,
      0.5071,
      0.7379,
      0.5174
     ]
    },
    {
     "code": "assignment",
     "box": [
      0.7516,
      0.5043,
      0.8661,
      0.5203
     ]
    },
    {
     "code": "on",
     "box": [
      0.8782,
      0.5071,
      0.9024,
      0.5174
     ]
    },
    {
     "code": "that",
     "box": [
      0.1387,
      0.5203,
      0.1855,
      0.5339
     ]
    },
    {
     "code": "bus",
     "box": [
      0.1944,
      0.522,
      0.2315,
      0.5334
     ]
    },
    {
     "code": "in",
     "box": [
      0.2427,
      0.522,
      0.2637,
      0.5334
     ]
    },
    {
     "code": "question",
     "box": [
      0.2734,
      0.5191,
      0.3645,
      0.5351
     ]
    },
    {
     "code": "Normally",
     "box": [
      0.1766,
      0.5482,
      0.2694,
      0.5647
     ]
    },
    {
     "code": "the",
     "box": [
      0.2879,
      0.5505,
      0.3202,
      0.5619
     ]
    },
    {
     "code": "total",
     "box": [
      0.3395,
      0.5505,
      0.3879,
      0.5619
     ]
    },
    {
     "code": "number",
     "box": [
      0.4065,
      0.5488,
      0.4823,
      0.5625
     ]
    },
    {
     "code": "of",
     "box": [
      0.4984,
      0.5488,
      0.521,
      0.5625
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.5371,
      0.5488,
      0.5935,
      0.5625
     ]
    },
    {
     "code": "address",
     "box": [
      0.6089,
      0.5476,
      0.6911,
      0.5625
     ]
    },
    {
     "code": "keys",
     "box": [
      0.7065,
      0.5476,
      0.7581,
      0.5642
     ]
    },
    {
     "code": "per",
     "box": [
      0.7734,
      0.5505,
      0.8105,
      0.5619
     ]
    },
    {
     "code": "bus",
     "box": [
      0.8258,
      0.5476,
      0.8661,
      0.5625
     ]
    },
    {
     "code": "is",
     "box": [
      0.8831,
      0.5493,
      0.904,
      0.5608
     ]
    },
    {
     "code": "Timited",
     "box": [
      0.1387,
      0.5636,
      0.2145,
      0.5784
     ]
    },
    {
     "code": "to",
     "box": [
      0.2298,
      0.5665,
      0.2508,
      0.5779
     ]
    },
    {
     "code": "however",
     "box": [
      0.3137,
      0.563,
      0.4,
      0.5801
     ]
    },
    {
     "code": "with",
     "box": [
      0.4129,
      0.5636,
      0.4597,
      0.5773
     ]
    },
    {
     "code": "the",
     "box": [
      0.4726,
      0.5636,
      0.5065,
      0.5773
     ]
    },
    {
     "code": "addition",
     "box": [
      0.5194,
      0.5625,
      0.6056,
      0.5773
     ]
    },
    {
     "code": "of",
     "box": [
      0.6194,
      0.5625,
      0.6419,
      0.5773
     ]
    },
    {
     "code": "certain",
     "box": [
      0.6548,
      0.5636,
      0.7306,
      0.5773
     ]
    },
    {
     "code": "special",
     "box": [
      0.7427,
      0.563,
      0.8177,
      0.579
     ]
    },
    {
     "code": "control",
     "box": [
      0.8298,
      0.5625,
      0.9024,
      0.5762
     ]
    },
    {
     "code": "routines",
     "box": [
      0.1403,
      0.5796,
      0.2274,
      0.5933
     ]
    },
    {
     "code": "in",
     "box": [
      0.2371,
      0.5796,
      0.2613,
      0.5933
     ]
    },
    {
     "code": "the",
     "box": [
      0.2726,
      0.5796,
      0.3065,
      0.5933
     ]
    },
    {
     "code": "control",
     "box": [
      0.3177,
      0.5796,
      0.3903,
      0.5933
     ]
    },
    {
     "code": "system",
     "box": [
      0.4153,
      0.5784,
      0.4855,
      0.5938
     ]
    },
    {
     "code": "software,",
     "box": [
      0.4952,
      0.5773,
      0.5927,
      0.5944
     ]
    },
    {
     "code": "this",
     "box": [
      0.6065,
      0.5773,
      0.6484,
      0.5921
     ]
    },
    {
     "code": "total",
     "box": [
      0.6581,
      0.5784,
      0.7097,
      0.5921
     ]
    },
    {
     "code": "can",
     "box": [
      0.7218,
      0.5801,
      0.7573,
      0.5916
     ]
    },
    {
     "code": "be",
     "box": [
      0.7702,
      0.579,
      0.796,
      0.5904
     ]
    },
    {
     "code": "increased",
     "box": [
      0.8048,
      0.5784,
      0.9048,
      0.5921
     ]
    },
    {
     "code": "(e.g",
     "box": [
      0.1387,
      0.5927,
      0.1879,
      0.6092
     ]
    },
    {
     "code": "NTC",
     "box": [
      0.1952,
      0.5933,
      0.2371,
      0.607
     ]
    },
    {
     "code": "Supervisor",
     "box": [
      0.2444,
      0.5927,
      0.3581,
      0.6098
     ]
    },
    {
     "code": "The",
     "box": [
      0.179,
      0.6229,
      0.2177,
      0.6366
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.229,
      0.6229,
      0.2839,
      0.6366
     ]
    },
    {
     "code": "lever",
     "box": [
      0.2968,
      0.6229,
      0.3532,
      0.6366
     ]
    },
    {
     "code": "key",
     "box": [
      0.3629,
      0.6224,
      0.404,
      0.6378
     ]
    },
    {
     "code": "address",
     "box": [
      0.4161,
      0.6218,
      0.4984,
      0.6366
     ]
    },
    {
     "code": "code",
     "box": [
      0.5113,
      0.6218,
      0.5597,
      0.6355
     ]
    },
    {
     "code": "for",
     "box": [
      0.571,
      0.6218,
      0.6048,
      0.6355
     ]
    },
    {
     "code": "talk",
     "box": [
      0.6452,
      0.6218,
      0.6887,
      0.6355
     ]
    },
    {
     "code": "control",
     "box": [
      0.7016,
      0.6218,
      0.7758,
      0.6355
     ]
    },
    {
     "code": "function",
     "box": [
      0.7847,
      0.6201,
      0.871,
      0.6361
     ]
    },
    {
     "code": "is",
     "box": [
      0.8831,
      0.6224,
      0.904,
      0.6338
     ]
    },
    {
     "code": "the",
     "box": [
      0.1403,
      0.6378,
      0.1758,
      0.6515
     ]
    },
    {
     "code": "bus",
     "box": [
      0.1855,
      0.6378,
      0.2242,
      0.6515
     ]
    },
    {
     "code": "number",
     "box": [
      0.2355,
      0.6378,
      0.3113,
      0.6515
     ]
    },
    {
     "code": "of",
     "box": [
      0.321,
      0.6366,
      0.3452,
      0.6503
     ]
    },
    {
     "code": "the",
     "box": [
      0.3548,
      0.6378,
      0.3903,
      0.6515
     ]
    },
    {
     "code": "crosspoint",
     "box": [
      0.3992,
      0.6355,
      0.5081,
      0.6532
     ]
    },
    {
     "code": "to",
     "box": [
      0.5185,
      0.6383,
      0.5395,
      0.6497
     ]
    },
    {
     "code": "be",
     "box": [
      0.55,
      0.6366,
      0.5774,
      0.6503
     ]
    },
    {
     "code": "activated_",
     "box": [
      0.5871,
      0.6366,
      0.6887,
      0.6503
     ]
    },
    {
     "code": "It",
     "box": [
      0.7073,
      0.6372,
      0.7266,
      0.6486
     ]
    },
    {
     "code": "should",
     "box": [
      0.7355,
      0.6366,
      0.8048,
      0.6503
     ]
    },
    {
     "code": "be",
     "box": [
      0.8129,
      0.6366,
      0.8403,
      0.6503
     ]
    },
    {
     "code": "noted",
     "box": [
      0.8484,
      0.6366,
      0.9048,
      0.6503
     ]
    },
    {
     "code": "that",
     "box": [
      0.1403,
      0.6526,
      0.1871,
      0.6663
     ]
    },
    {
     "code": "all",
     "box": [
      0.1935,
      0.6526,
      0.2258,
      0.6663
     ]
    },
    {
     "code": "codes",
     "box": [
      0.2347,
      0.6515,
      0.2935,
      0.6669
     ]
    },
    {
     "code": "are",
     "box": [
      0.3024,
      0.6543,
      0.3379,
      0.6657
     ]
    },
    {
     "code": "stored",
     "box": [
      0.3468,
      0.6515,
      0.4129,
      0.6651
     ]
    },
    {
     "code": "in",
     "box": [
      0.4218,
      0.6532,
      0.4444,
      0.6646
     ]
    },
    {
     "code": "memory",
     "box": [
      0.4524,
      0.6515,
      0.529,
      0.6663
     ]
    },
    {
     "code": "in",
     "box": [
      0.5387,
      0.6515,
      0.5629,
      0.6651
     ]
    },
    {
     "code": "hexadecimal",
     "box": [
      0.5944,
      0.6509,
      0.7226,
      0.6651
     ]
    },
    {
     "code": "format_",
     "box": [
      0.7298,
      0.6497,
      0.8032,
      0.6651
     ]
    },
    {
     "code": "In",
     "box": [
      0.1798,
      0.6828,
      0.2024,
      0.6942
     ]
    },
    {
     "code": "the",
     "box": [
      0.2185,
      0.6828,
      0.2508,
      0.6942
     ]
    },
    {
     "code": "NTC",
     "box": [
      0.2645,
      0.68,
      0.3048,
      0.6948
     ]
    },
    {
     "code": "Microcom",
     "box": [
      0.3194,
      0.68,
      0.4113,
      0.6948
     ]
    },
    {
     "code": "System,",
     "box": [
      0.4226,
      0.6811,
      0.5,
      0.6959
     ]
    },
    {
     "code": "one",
     "box": [
      0.5153,
      0.6828,
      0.5524,
      0.6942
     ]
    },
    {
     "code": "of",
     "box": [
      0.5645,
      0.68,
      0.5887,
      0.6948
     ]
    },
    {
     "code": "the",
     "box": [
      0.6016,
      0.68,
      0.6355,
      0.6937
     ]
    },
    {
     "code": "groups",
     "box": [
      0.6468,
      0.6823,
      0.7194,
      0.6959
     ]
    },
    {
     "code": "of",
     "box": [
      0.7306,
      0.68,
      0.7532,
      0.6937
     ]
    },
    {
     "code": "stations,",
     "box": [
      0.7653,
      0.6783,
      0.8581,
      0.6959
     ]
    },
    {
     "code": "the",
     "box": [
      0.871,
      0.68,
      0.9065,
      0.6937
     ]
    },
    {
     "code": "Graphics",
     "box": [
      0.1395,
      0.6954,
      0.2331,
      0.7114
     ]
    },
    {
     "code": "station,",
     "box": [
      0.2427,
      0.6942,
      0.3258,
      0.7119
     ]
    },
    {
     "code": "has",
     "box": [
      0.3387,
      0.6959,
      0.3774,
      0.7096
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.3871,
      0.6959,
      0.4435,
      0.7096
     ]
    },
    {
     "code": "pushbutton",
     "box": [
      0.4524,
      0.6937,
      0.5677,
      0.7108
     ]
    },
    {
     "code": "control",
     "box": [
      0.579,
      0.6948,
      0.6532,
      0.7096
     ]
    },
    {
     "code": "as",
     "box": [
      0.6653,
      0.6977,
      0.6895,
      0.7079
     ]
    },
    {
     "code": "wel ",
     "box": [
      0.7,
      0.6948,
      0.7435,
      0.7085
     ]
    },
    {
     "code": "as",
     "box": [
      0.7524,
      0.6965,
      0.7782,
      0.7079
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.7855,
      0.6948,
      0.8419,
      0.7085
     ]
    },
    {
     "code": "Tever",
     "box": [
      0.85,
      0.6948,
      0.9048,
      0.7085
     ]
    },
    {
     "code": "key",
     "box": [
      0.1387,
      0.7114,
      0.1798,
      0.7268
     ]
    },
    {
     "code": "control .",
     "box": [
      0.1887,
      0.7108,
      0.271,
      0.7245
     ]
    },
    {
     "code": "Each",
     "box": [
      0.179,
      0.7404,
      0.229,
      0.7541
     ]
    },
    {
     "code": "Graphics",
     "box": [
      0.2468,
      0.7393,
      0.3387,
      0.7541
     ]
    },
    {
     "code": "station",
     "box": [
      0.3548,
      0.7404,
      0.429,
      0.7541
     ]
    },
    {
     "code": "has",
     "box": [
      0.4452,
      0.7393,
      0.4855,
      0.753
     ]
    },
    {
     "code": "Graphics",
     "box": [
      0.5355,
      0.7393,
      0.6274,
      0.7541
     ]
    },
    {
     "code": "Select",
     "box": [
      0.6435,
      0.7382,
      0.7048,
      0.753
     ]
    },
    {
     "code": "panel",
     "box": [
      0.7202,
      0.7387,
      0.779,
      0.7541
     ]
    },
    {
     "code": "associated",
     "box": [
      0.7984,
      0.7376,
      0.9048,
      0.7524
     ]
    },
    {
     "code": "with",
     "box": [
      0.1419,
      0.7553,
      0.1887,
      0.769
     ]
    },
    {
     "code": "its",
     "box": [
      0.2016,
      0.7553,
      0.2323,
      0.769
     ]
    },
    {
     "code": "M7800",
     "box": [
      0.2452,
      0.7541,
      0.3048,
      0.7678
     ]
    },
    {
     "code": "communications",
     "box": [
      0.3153,
      0.753,
      0.4742,
      0.7701
     ]
    },
    {
     "code": "terminal",
     "box": [
      0.4871,
      0.7541,
      0.5758,
      0.7678
     ]
    },
    {
     "code": "This",
     "box": [
      0.5984,
      0.753,
      0.6468,
      0.7678
     ]
    },
    {
     "code": "panel",
     "box": [
      0.6573,
      0.753,
      0.7161,
      0.769
     ]
    },
    {
     "code": "has",
     "box": [
      0.7306,
      0.7541,
      0.7694,
      0.7678
     ]
    },
    {
     "code": "three",
     "box": [
      0.779,
      0.7541,
      0.8339,
      0.7678
     ]
    },
    {
     "code": "push-",
     "box": [
      0.8419,
      0.7524,
      0.9065,
      0.769
     ]
    },
    {
     "code": "buttons",
     "box": [
      0.1403,
      0.7701,
      0.2194,
      0.7838
     ]
    },
    {
     "code": "which",
     "box": [
      0.2339,
      0.769,
      0.2935,
      0.7827
     ]
    },
    {
     "code": "operate",
     "box": [
      0.3056,
      0.769,
      0.3855,
      0.7844
     ]
    },
    {
     "code": "fixed",
     "box": [
      0.421,
      0.769,
      0.4774,
      0.7827
     ]
    },
    {
     "code": "isten",
     "box": [
      0.4871,
      0.769,
      0.5484,
      0.7827
     ]
    },
    {
     "code": "crosspoint",
     "box": [
      0.5589,
      0.7667,
      0.6661,
      0.7855
     ]
    },
    {
     "code": "on",
     "box": [
      0.6766,
      0.7707,
      0.7008,
      0.7809
     ]
    },
    {
     "code": "each",
     "box": [
      0.7121,
      0.7678,
      0.7629,
      0.7832
     ]
    },
    {
     "code": "of",
     "box": [
      0.7726,
      0.7678,
      0.7952,
      0.7815
     ]
    },
    {
     "code": "the",
     "box": [
      0.8073,
      0.7695,
      0.8395,
      0.7809
     ]
    },
    {
     "code": "three",
     "box": [
      0.8524,
      0.7695,
      0.9056,
      0.7809
     ]
    },
    {
     "code": "Graphics",
     "box": [
      0.1403,
      0.7838,
      0.2339,
      0.7998
     ]
    },
    {
     "code": "Party",
     "box": [
      0.2476,
      0.7832,
      0.3081,
      0.7992
     ]
    },
    {
     "code": "Line",
     "box": [
      0.3226,
      0.7838,
      0.371,
      0.7975
     ]
    },
    {
     "code": "buses",
     "box": [
      0.3823,
      0.7838,
      0.4419,
      0.7975
     ]
    },
    {
     "code": "to",
     "box": [
      0.4556,
      0.7855,
      0.4766,
      0.7969
     ]
    },
    {
     "code": "allow",
     "box": [
      0.4903,
      0.7838,
      0.5468,
      0.7975
     ]
    },
    {
     "code": "the",
     "box": [
      0.5597,
      0.7838,
      0.5952,
      0.7975
     ]
    },
    {
     "code": "associated",
     "box": [
      0.6065,
      0.7827,
      0.7161,
      0.7963
     ]
    },
    {
     "code": "Graphics",
     "box": [
      0.7274,
      0.7827,
      0.821,
      0.7975
     ]
    },
    {
     "code": "station",
     "box": [
      0.8315,
      0.7821,
      0.904,
      0.7958
     ]
    },
    {
     "code": "to",
     "box": [
      0.1411,
      0.8003,
      0.1637,
      0.8118
     ]
    },
    {
     "code": "Iisten",
     "box": [
      0.1726,
      0.7986,
      0.2339,
      0.8123
     ]
    },
    {
     "code": "to",
     "box": [
      0.2427,
      0.8003,
      0.2653,
      0.8118
     ]
    },
    {
     "code": "any",
     "box": [
      0.275,
      0.8015,
      0.3137,
      0.8129
     ]
    },
    {
     "code": "one",
     "box": [
      0.3234,
      0.8003,
      0.3605,
      0.8118
     ]
    },
    {
     "code": "of",
     "box": [
      0.3677,
      0.7975,
      0.3903,
      0.8123
     ]
    },
    {
     "code": "the",
     "box": [
      0.4,
      0.7986,
      0.4339,
      0.8123
     ]
    },
    {
     "code": "Graphics",
     "box": [
      0.4419,
      0.7975,
      0.5355,
      0.8135
     ]
    },
    {
     "code": "Party",
     "box": [
      0.5435,
      0.7975,
      0.6016,
      0.8123
     ]
    },
    {
     "code": "Lines_",
     "box": [
      0.6097,
      0.7975,
      0.671,
      0.8112
     ]
    },
    {
     "code": "2-1",
     "box": [
      0.5065,
      0.8967,
      0.5387,
      0.9104
     ]
    },
    {
     "code": "The",
     "box": [
      0.1718,
      0.2402,
      0.2161,
      0.2584
     ]
    },
    {
     "code": "bus",
     "box": [
      0.6879,
      0.3851,
      0.7323,
      0.4033
     ]
    },
    {
     "code": "The",
     "box": [
      0.175,
      0.4444,
      0.2177,
      0.4626
     ]
    },
    {
     "code": "bus",
     "box": [
      0.825,
      0.4581,
      0.8694,
      0.4763
     ]
    },
    {
     "code": "poi",
     "box": [
      0.379,
      0.5048,
      0.4169,
      0.5208
     ]
    },
    {
     "code": "24,",
     "box": [
      0.2629,
      0.5619,
      0.3008,
      0.5807
     ]
    }
   ]
  }
 ]
}
```
