# 1981 - microCOM - Inst Man p11.jpg
Wiki page: [microCOM](../../../PAGES/microCOM.md)


- **Year:** 1981 (module estimate (numeric))
- **Module:** microCOM
- **Category:** MICRO SERIES
- **Module year estimate:** 1981 — numeric "07/13/81" in PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p49.JPG
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p11.JPG`
- **SHA-256:** `05c08d72d8f966f149898b699172e6a82f3c34d1456329f10412dd3c98f314db`
- **Size:** 372,223 bytes
- **Pages:** 1

## Full text

### Page 1 (OCR, spell-checked: 2 words corrected)

```text
WAAD-BECK SYSTEMS LTD_
e=" `
SYSTEMS DESCRIPTION
MicroCom Communication System
B ) Central Matrix Control
The control system of the MicroCOM consists of processor based Input and Output Controllers Transmit/Receive and Matrix Latch Modules
series of micro- with associated
MicroCOM systems up to 24 inputs and 24 outputs require one Input and one Output Controller Module. In larger systems every 24 inputs require one M774A Input Controller and every 24 outputs require one M776A Output Controller Systems matrix sizes of 200 200 and beyond can be configured in this fashion
Each M774A Input Controller is associated with M772 Transmit/ Receive Module. The M772 sends   commands to the communication termi- nals that are connected to its 24 ba anced serial i/o data ports and in turn receives their assignment and key data_ In systems wi th the calling tally feature this module also transmits the calling tally information back to the remote terminals_
The M774A Input Controller directs the flow of data between the remote terminals and the M772 Transmit/Receive Module. This data is transferred serially in three blocks of eight between the M772 and the Input Controller It is then re-formated and sent to all other control lers upon the request of Master Controller.
This data transfer takes place on multiprocessor bus which connects to all controllers The Input Controllers transmit and receive data via this bus while the Output Control lers only receive the data. The data transfer on this bus is synchronized by an Output Controller that is assigned to be the Master . selector switch in the system allows the choice of any one of the Output Controllers to be Master . This provides maximum of reliability since no one particular module is vital to overall system operation. Since the system is divided into groups of 24 inputs and 24 outputs the failure of one module would only effect its own group without disturbing the rema ining system.
The M776A Output Controllers assimilate and re-configure the data received from the Input Controllers_ The data is assembled into crosspoint bit pattern and then transferred to the respective M771 Matrix Latch Modules. The M771 in turn control the crosspoint clos- ures in the central matrix with this bit pattern.

2-3
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECK SYSTEMS LTD_
e=" `
SYSTEMS DESCRIPTION
MicroCom Communication System
B ) Central Matrix Control
The control system of the MicroCOM consists of processor based Input and Output Controllers Transmit/Receive and Matrix Latch Modules
series of micro- with associated
MicroCOM systems up to 24 inputs and 24 outputs require one Input and one Output Controller Module. In larger systems every 24 inputs require one M774A Input Controller and every 24 outputs require one M776A Output Controller Systems matrix sizes of 200 200 and beyond can be configured in this fashion
Each M774A Input Controller is associated with M772 Transmit/ Receive Module. The M772 sends   commands to the communication termi- nals that are connected to its 24 ba anced serial i/o data ports and in turn receives their assignment and key data_ In systems wi th the calling tally feature this module also transmits the calling tally information back to the remote terminals_
The M774A Input Controller directs the flow of data between the remote terminals and the M772 Transmit/Receive Module. This data is transfered serially in three blocks of eight between the M772 and the Input Controller It is then re-formated and sent to all other control lers upon the request of Master Controller.
This data transfer takes place on multiprocessor bus which connects to all controllers The Input Controllers transmit and receive data via this bus while the Output Control lers only receive the data. The data transfer on this bus is synchronized by an Output Controller that is assigned to be the Master . selector switch in the system allows the choice of any one of the Output Controllers to be Master . This provides maximum of reliability since no one particular module is vital to overall system operation. Since the system is divided into groups of 24 inputs and 24 outputs the failure of one module would only effect its own group without disturbing the rema ining system.
The M776A Output Controllers assimilate and re-configure the data received from the Input Controllers_ The data is assembled into crosspoint bit pattern and then transfered to the respective M771 Matrix Latch Modules. The M771 in turn control the crosspoint clos- ures in the central matrix with this bit pattern.

2-3
```

</details>

## Contents (JSON)

```json
{
 "file": "Products/MICRO SERIES/microCOM/1981 - microCOM - Inst Man p11.jpg",
 "sha256": "05c08d72d8f966f149898b699172e6a82f3c34d1456329f10412dd3c98f314db",
 "kind": "module",
 "models": [
  "microCOM"
 ],
 "year": 1981,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "DESCRIPTION",
     "kind": "general"
    }
   ],
   "modules": [
    "M771",
    "M772",
    "M774"
   ],
   "module_boxes": [
    {
     "code": "WAAD-BECK SYSTEMS LTD_",
     "box": [
      0.0919,
      0.0245,
      0.4435,
      0.0422
     ]
    },
    {
     "code": "e=\" `",
     "box": [
      0.629,
      0.0331,
      0.9355,
      0.0479
     ]
    },
    {
     "code": "SYSTEMS",
     "box": [
      0.4008,
      0.1198,
      0.4903,
      0.1369
     ]
    },
    {
     "code": "DESCRIPTION",
     "box": [
      0.4968,
      0.1209,
      0.6306,
      0.1358
     ]
    },
    {
     "code": "MicroCom",
     "box": [
      0.3516,
      0.15,
      0.4484,
      0.1649
     ]
    },
    {
     "code": "Communication",
     "box": [
      0.4565,
      0.1517,
      0.6065,
      0.1666
     ]
    },
    {
     "code": "System",
     "box": [
      0.6145,
      0.1517,
      0.6839,
      0.1666
     ]
    },
    {
     "code": "B )",
     "box": [
      0.1355,
      0.2099,
      0.1597,
      0.2236
     ]
    },
    {
     "code": "Central",
     "box": [
      0.1694,
      0.2099,
      0.2468,
      0.2236
     ]
    },
    {
     "code": "Matrix",
     "box": [
      0.2581,
      0.2088,
      0.3274,
      0.2236
     ]
    },
    {
     "code": "Control",
     "box": [
      0.3347,
      0.2082,
      0.4097,
      0.2242
     ]
    },
    {
     "code": "control",
     "box": [
      0.1887,
      0.2396,
      0.2629,
      0.2533
     ]
    },
    {
     "code": "system",
     "box": [
      0.2766,
      0.2384,
      0.3468,
      0.255
     ]
    },
    {
     "code": "of",
     "box": [
      0.3613,
      0.2384,
      0.3839,
      0.2521
     ]
    },
    {
     "code": "the",
     "box": [
      0.4008,
      0.2402,
      0.4331,
      0.2516
     ]
    },
    {
     "code": "MicroCOM",
     "box": [
      0.4484,
      0.2373,
      0.5452,
      0.2521
     ]
    },
    {
     "code": "consists",
     "box": [
      0.5597,
      0.2384,
      0.6435,
      0.2521
     ]
    },
    {
     "code": "of",
     "box": [
      0.6581,
      0.2384,
      0.6806,
      0.2521
     ]
    },
    {
     "code": "series",
     "box": [
      0.721,
      0.2384,
      0.7855,
      0.2521
     ]
    },
    {
     "code": "of",
     "box": [
      0.7968,
      0.2384,
      0.821,
      0.2521
     ]
    },
    {
     "code": "micro-",
     "box": [
      0.8323,
      0.2384,
      0.9,
      0.2521
     ]
    },
    {
     "code": "processor",
     "box": [
      0.1331,
      0.2539,
      0.2339,
      0.2693
     ]
    },
    {
     "code": "based",
     "box": [
      0.2581,
      0.2544,
      0.321,
      0.2681
     ]
    },
    {
     "code": "Input",
     "box": [
      0.3468,
      0.2544,
      0.4048,
      0.2681
     ]
    },
    {
     "code": "and",
     "box": [
      0.429,
      0.2533,
      0.4677,
      0.267
     ]
    },
    {
     "code": "Output",
     "box": [
      0.4895,
      0.2527,
      0.5629,
      0.2687
     ]
    },
    {
     "code": "Controllers",
     "box": [
      0.5839,
      0.2533,
      0.7,
      0.267
     ]
    },
    {
     "code": "with",
     "box": [
      0.7226,
      0.2533,
      0.7694,
      0.267
     ]
    },
    {
     "code": "associated",
     "box": [
      0.7919,
      0.2533,
      0.9,
      0.267
     ]
    },
    {
     "code": "Transmit/Receive",
     "box": [
      0.1347,
      0.2681,
      0.3129,
      0.2829
     ]
    },
    {
     "code": "Matrix",
     "box": [
      0.371,
      0.2681,
      0.4403,
      0.2829
     ]
    },
    {
     "code": "Latch",
     "box": [
      0.4484,
      0.2681,
      0.5081,
      0.2818
     ]
    },
    {
     "code": "Modules",
     "box": [
      0.5169,
      0.2681,
      0.6008,
      0.2818
     ]
    },
    {
     "code": "MicroCOM",
     "box": [
      0.1347,
      0.2961,
      0.2315,
      0.3109
     ]
    },
    {
     "code": "systems",
     "box": [
      0.2444,
      0.2966,
      0.3258,
      0.3143
     ]
    },
    {
     "code": "up",
     "box": [
      0.3379,
      0.3006,
      0.3637,
      0.312
     ]
    },
    {
     "code": "to",
     "box": [
      0.3798,
      0.2995,
      0.4008,
      0.3109
     ]
    },
    {
     "code": "24",
     "box": [
      0.4145,
      0.2966,
      0.4387,
      0.3103
     ]
    },
    {
     "code": "inputs",
     "box": [
      0.4508,
      0.2972,
      0.5194,
      0.3132
     ]
    },
    {
     "code": "and",
     "box": [
      0.5306,
      0.2978,
      0.571,
      0.3115
     ]
    },
    {
     "code": "24",
     "box": [
      0.5823,
      0.2966,
      0.6081,
      0.3103
     ]
    },
    {
     "code": "outputs",
     "box": [
      0.6177,
      0.2978,
      0.6952,
      0.3126
     ]
    },
    {
     "code": "require",
     "box": [
      0.7048,
      0.2966,
      0.7839,
      0.3115
     ]
    },
    {
     "code": "one",
     "box": [
      0.7944,
      0.2995,
      0.8298,
      0.3109
     ]
    },
    {
     "code": "Input",
     "box": [
      0.8419,
      0.2978,
      0.9,
      0.3126
     ]
    },
    {
     "code": "and",
     "box": [
      0.1355,
      0.3126,
      0.1758,
      0.3263
     ]
    },
    {
     "code": "one",
     "box": [
      0.1879,
      0.3143,
      0.2234,
      0.3257
     ]
    },
    {
     "code": "Output",
     "box": [
      0.2331,
      0.312,
      0.3048,
      0.328
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.3145,
      0.3126,
      0.4194,
      0.3263
     ]
    },
    {
     "code": "Module.",
     "box": [
      0.4298,
      0.3103,
      0.5113,
      0.3274
     ]
    },
    {
     "code": "In",
     "box": [
      0.5266,
      0.3132,
      0.5476,
      0.3246
     ]
    },
    {
     "code": "larger",
     "box": [
      0.5589,
      0.312,
      0.6274,
      0.328
     ]
    },
    {
     "code": "systems",
     "box": [
      0.6363,
      0.3115,
      0.7177,
      0.3274
     ]
    },
    {
     "code": "every",
     "box": [
      0.7274,
      0.3137,
      0.7855,
      0.3274
     ]
    },
    {
     "code": "24",
     "box": [
      0.7984,
      0.3115,
      0.8226,
      0.3252
     ]
    },
    {
     "code": "inputs",
     "box": [
      0.8331,
      0.3109,
      0.9,
      0.3269
     ]
    },
    {
     "code": "require",
     "box": [
      0.1347,
      0.3263,
      0.2145,
      0.3428
     ]
    },
    {
     "code": "one",
     "box": [
      0.2266,
      0.3292,
      0.2637,
      0.3406
     ]
    },
    {
     "code": "M774A",
     "box": [
      0.2742,
      0.3263,
      0.3339,
      0.3411
     ]
    },
    {
     "code": "Input",
     "box": [
      0.3476,
      0.3269,
      0.4065,
      0.3428
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.4161,
      0.3263,
      0.521,
      0.3411
     ]
    },
    {
     "code": "every",
     "box": [
      0.5823,
      0.3286,
      0.6419,
      0.3423
     ]
    },
    {
     "code": "24",
     "box": [
      0.6532,
      0.3263,
      0.6774,
      0.34
     ]
    },
    {
     "code": "outputs",
     "box": [
      0.6871,
      0.3274,
      0.7661,
      0.3423
     ]
    },
    {
     "code": "require",
     "box": [
      0.775,
      0.3252,
      0.8532,
      0.3417
     ]
    },
    {
     "code": "one",
     "box": [
      0.8637,
      0.3292,
      0.8992,
      0.3394
     ]
    },
    {
     "code": "M776A",
     "box": [
      0.1371,
      0.3411,
      0.1968,
      0.356
     ]
    },
    {
     "code": "Output",
     "box": [
      0.2153,
      0.3406,
      0.2871,
      0.3577
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.3048,
      0.3423,
      0.4113,
      0.356
     ]
    },
    {
     "code": "Systems",
     "box": [
      0.4387,
      0.3411,
      0.5194,
      0.3571
     ]
    },
    {
     "code": "matrix",
     "box": [
      0.5387,
      0.3411,
      0.6081,
      0.3548
     ]
    },
    {
     "code": "sizes",
     "box": [
      0.6258,
      0.3411,
      0.679,
      0.3548
     ]
    },
    {
     "code": "of",
     "box": [
      0.6968,
      0.3411,
      0.721,
      0.3548
     ]
    },
    {
     "code": "200",
     "box": [
      0.7387,
      0.34,
      0.7742,
      0.3548
     ]
    },
    {
     "code": "200",
     "box": [
      0.8065,
      0.34,
      0.8419,
      0.3548
     ]
    },
    {
     "code": "and",
     "box": [
      0.8597,
      0.3411,
      0.9,
      0.3548
     ]
    },
    {
     "code": "beyond",
     "box": [
      0.1355,
      0.3571,
      0.2097,
      0.3719
     ]
    },
    {
     "code": "can",
     "box": [
      0.2185,
      0.3588,
      0.2556,
      0.3702
     ]
    },
    {
     "code": "be",
     "box": [
      0.2653,
      0.3577,
      0.2911,
      0.3691
     ]
    },
    {
     "code": "configured",
     "box": [
      0.3,
      0.356,
      0.4113,
      0.3719
     ]
    },
    {
     "code": "in",
     "box": [
      0.4218,
      0.3577,
      0.4427,
      0.3691
     ]
    },
    {
     "code": "this",
     "box": [
      0.4532,
      0.356,
      0.4968,
      0.3697
     ]
    },
    {
     "code": "fashion",
     "box": [
      0.5048,
      0.356,
      0.5839,
      0.3697
     ]
    },
    {
     "code": "Each",
     "box": [
      0.1355,
      0.3856,
      0.1871,
      0.3993
     ]
    },
    {
     "code": "M774A",
     "box": [
      0.2048,
      0.3856,
      0.2645,
      0.3993
     ]
    },
    {
     "code": "Input",
     "box": [
      0.2839,
      0.3856,
      0.3419,
      0.4005
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.3581,
      0.3856,
      0.4629,
      0.3993
     ]
    },
    {
     "code": "is",
     "box": [
      0.4806,
      0.3856,
      0.5032,
      0.3993
     ]
    },
    {
     "code": "associated",
     "box": [
      0.5194,
      0.3845,
      0.6274,
      0.3993
     ]
    },
    {
     "code": "with",
     "box": [
      0.6435,
      0.3845,
      0.6887,
      0.3982
     ]
    },
    {
     "code": "M772",
     "box": [
      0.7355,
      0.3845,
      0.7839,
      0.3982
     ]
    },
    {
     "code": "Transmit/",
     "box": [
      0.7984,
      0.3833,
      0.9,
      0.3993
     ]
    },
    {
     "code": "Receive",
     "box": [
      0.1355,
      0.4005,
      0.2145,
      0.4141
     ]
    },
    {
     "code": "Module.",
     "box": [
      0.2258,
      0.3993,
      0.3048,
      0.4141
     ]
    },
    {
     "code": "M772",
     "box": [
      0.3677,
      0.3993,
      0.4161,
      0.413
     ]
    },
    {
     "code": "sends   commands",
     "box": [
      0.425,
      0.3982,
      0.5984,
      0.4159
     ]
    },
    {
     "code": "to",
     "box": [
      0.6073,
      0.401,
      0.6282,
      0.4124
     ]
    },
    {
     "code": "the",
     "box": [
      0.6371,
      0.3993,
      0.671,
      0.413
     ]
    },
    {
     "code": "communication",
     "box": [
      0.679,
      0.3993,
      0.8258,
      0.413
     ]
    },
    {
     "code": "termi-",
     "box": [
      0.8355,
      0.3993,
      0.9,
      0.413
     ]
    },
    {
     "code": "nals",
     "box": [
      0.1363,
      0.417,
      0.1831,
      0.4284
     ]
    },
    {
     "code": "that",
     "box": [
      0.1919,
      0.413,
      0.2411,
      0.4295
     ]
    },
    {
     "code": "are",
     "box": [
      0.2508,
      0.417,
      0.2863,
      0.4284
     ]
    },
    {
     "code": "connected",
     "box": [
      0.296,
      0.4136,
      0.3968,
      0.4295
     ]
    },
    {
     "code": "to",
     "box": [
      0.4089,
      0.4159,
      0.4298,
      0.4273
     ]
    },
    {
     "code": "its",
     "box": [
      0.4411,
      0.4159,
      0.4702,
      0.4273
     ]
    },
    {
     "code": "24",
     "box": [
      0.4823,
      0.4141,
      0.5065,
      0.4278
     ]
    },
    {
     "code": "ba",
     "box": [
      0.5177,
      0.4141,
      0.5452,
      0.4278
     ]
    },
    {
     "code": "anced",
     "box": [
      0.55,
      0.4141,
      0.6113,
      0.4278
     ]
    },
    {
     "code": "serial",
     "box": [
      0.621,
      0.4141,
      0.6839,
      0.4278
     ]
    },
    {
     "code": "i/o",
     "box": [
      0.6952,
      0.413,
      0.7306,
      0.4278
     ]
    },
    {
     "code": "data",
     "box": [
      0.7387,
      0.4141,
      0.7871,
      0.4278
     ]
    },
    {
     "code": "ports",
     "box": [
      0.796,
      0.4136,
      0.8516,
      0.429
     ]
    },
    {
     "code": "and",
     "box": [
      0.8597,
      0.413,
      0.9,
      0.4278
     ]
    },
    {
     "code": "in",
     "box": [
      0.1363,
      0.4307,
      0.1589,
      0.4421
     ]
    },
    {
     "code": "turn",
     "box": [
      0.1718,
      0.4318,
      0.2169,
      0.4421
     ]
    },
    {
     "code": "receives",
     "box": [
      0.2298,
      0.4307,
      0.3153,
      0.4421
     ]
    },
    {
     "code": "their",
     "box": [
      0.3258,
      0.429,
      0.379,
      0.4427
     ]
    },
    {
     "code": "assignment",
     "box": [
      0.3887,
      0.429,
      0.5048,
      0.4438
     ]
    },
    {
     "code": "and",
     "box": [
      0.5161,
      0.429,
      0.5565,
      0.4427
     ]
    },
    {
     "code": "key",
     "box": [
      0.5645,
      0.4278,
      0.6056,
      0.4444
     ]
    },
    {
     "code": "data_",
     "box": [
      0.6161,
      0.429,
      0.6677,
      0.4427
     ]
    },
    {
     "code": "In",
     "box": [
      0.6871,
      0.429,
      0.7113,
      0.4427
     ]
    },
    {
     "code": "systems",
     "box": [
      0.7218,
      0.4278,
      0.8032,
      0.4438
     ]
    },
    {
     "code": "th",
     "box": [
      0.8339,
      0.429,
      0.8581,
      0.4427
     ]
    },
    {
     "code": "the",
     "box": [
      0.8661,
      0.429,
      0.9016,
      0.4427
     ]
    },
    {
     "code": "calling",
     "box": [
      0.1355,
      0.4427,
      0.2137,
      0.4598
     ]
    },
    {
     "code": "tally",
     "box": [
      0.229,
      0.4438,
      0.2823,
      0.4586
     ]
    },
    {
     "code": "feature",
     "box": [
      0.2984,
      0.4438,
      0.3758,
      0.4575
     ]
    },
    {
     "code": "this",
     "box": [
      0.3919,
      0.4438,
      0.4355,
      0.4575
     ]
    },
    {
     "code": "module",
     "box": [
      0.4484,
      0.4438,
      0.5226,
      0.4575
     ]
    },
    {
     "code": "also",
     "box": [
      0.5363,
      0.4455,
      0.5815,
      0.4569
     ]
    },
    {
     "code": "transmits",
     "box": [
      0.5952,
      0.4438,
      0.6935,
      0.4575
     ]
    },
    {
     "code": "the",
     "box": [
      0.7081,
      0.4438,
      0.7435,
      0.4575
     ]
    },
    {
     "code": "calling",
     "box": [
      0.7581,
      0.4438,
      0.8339,
      0.4586
     ]
    },
    {
     "code": "tally",
     "box": [
      0.8468,
      0.4438,
      0.9,
      0.4586
     ]
    },
    {
     "code": "information",
     "box": [
      0.1355,
      0.4575,
      0.2548,
      0.4723
     ]
    },
    {
     "code": "back",
     "box": [
      0.2629,
      0.4586,
      0.3145,
      0.4723
     ]
    },
    {
     "code": "to",
     "box": [
      0.325,
      0.4604,
      0.346,
      0.4718
     ]
    },
    {
     "code": "the",
     "box": [
      0.3548,
      0.4586,
      0.3887,
      0.4723
     ]
    },
    {
     "code": "remote",
     "box": [
      0.3984,
      0.4586,
      0.4661,
      0.4723
     ]
    },
    {
     "code": "terminals_",
     "box": [
      0.4742,
      0.4586,
      0.5758,
      0.4723
     ]
    },
    {
     "code": "M774A",
     "box": [
      0.1919,
      0.4872,
      0.2516,
      0.5009
     ]
    },
    {
     "code": "Input",
     "box": [
      0.2726,
      0.4883,
      0.3306,
      0.5031
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.3468,
      0.4872,
      0.4516,
      0.5009
     ]
    },
    {
     "code": "directs",
     "box": [
      0.4677,
      0.4872,
      0.5419,
      0.5009
     ]
    },
    {
     "code": "the",
     "box": [
      0.5597,
      0.4872,
      0.5935,
      0.5009
     ]
    },
    {
     "code": "flow",
     "box": [
      0.6097,
      0.4872,
      0.6548,
      0.5009
     ]
    },
    {
     "code": "of",
     "box": [
      0.6694,
      0.4872,
      0.6919,
      0.5009
     ]
    },
    {
     "code": "data",
     "box": [
      0.7065,
      0.4872,
      0.7548,
      0.5009
     ]
    },
    {
     "code": "between",
     "box": [
      0.7694,
      0.4872,
      0.8516,
      0.5009
     ]
    },
    {
     "code": "the",
     "box": [
      0.8661,
      0.4872,
      0.9016,
      0.5009
     ]
    },
    {
     "code": "remote",
     "box": [
      0.1355,
      0.5031,
      0.2048,
      0.5168
     ]
    },
    {
     "code": "terminals",
     "box": [
      0.2161,
      0.5031,
      0.3161,
      0.5168
     ]
    },
    {
     "code": "and",
     "box": [
      0.3242,
      0.502,
      0.3661,
      0.5168
     ]
    },
    {
     "code": "the",
     "box": [
      0.3782,
      0.5037,
      0.4121,
      0.5151
     ]
    },
    {
     "code": "M772",
     "box": [
      0.4226,
      0.5009,
      0.4726,
      0.5157
     ]
    },
    {
     "code": "Transmit/Receive",
     "box": [
      0.4823,
      0.502,
      0.6597,
      0.5168
     ]
    },
    {
     "code": "Module.",
     "box": [
      0.6694,
      0.502,
      0.75,
      0.5157
     ]
    },
    {
     "code": "This",
     "box": [
      0.7629,
      0.502,
      0.8097,
      0.5157
     ]
    },
    {
     "code": "data",
     "box": [
      0.8194,
      0.502,
      0.8677,
      0.5157
     ]
    },
    {
     "code": "is",
     "box": [
      0.8782,
      0.5037,
      0.9008,
      0.5151
     ]
    },
    {
     "code": "transfered",
     "box": [
      0.1347,
      0.5157,
      0.2452,
      0.5317
     ]
    },
    {
     "code": "serially",
     "box": [
      0.2548,
      0.5168,
      0.3387,
      0.5317
     ]
    },
    {
     "code": "in",
     "box": [
      0.3508,
      0.5185,
      0.3734,
      0.5299
     ]
    },
    {
     "code": "three",
     "box": [
      0.3855,
      0.5168,
      0.4403,
      0.5305
     ]
    },
    {
     "code": "blocks",
     "box": [
      0.45,
      0.5168,
      0.5194,
      0.5305
     ]
    },
    {
     "code": "of",
     "box": [
      0.529,
      0.5168,
      0.5532,
      0.5305
     ]
    },
    {
     "code": "eight",
     "box": [
      0.5629,
      0.5168,
      0.6177,
      0.5317
     ]
    },
    {
     "code": "between",
     "box": [
      0.6258,
      0.5168,
      0.7065,
      0.5305
     ]
    },
    {
     "code": "the",
     "box": [
      0.7161,
      0.5168,
      0.7516,
      0.5305
     ]
    },
    {
     "code": "M772",
     "box": [
      0.7597,
      0.5157,
      0.8097,
      0.5305
     ]
    },
    {
     "code": "and",
     "box": [
      0.8177,
      0.5168,
      0.8581,
      0.5305
     ]
    },
    {
     "code": "the",
     "box": [
      0.8661,
      0.5168,
      0.9016,
      0.5305
     ]
    },
    {
     "code": "Input",
     "box": [
      0.1379,
      0.5311,
      0.1968,
      0.5471
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.2129,
      0.5317,
      0.3194,
      0.5454
     ]
    },
    {
     "code": "It",
     "box": [
      0.3669,
      0.5322,
      0.3879,
      0.5436
     ]
    },
    {
     "code": "is",
     "box": [
      0.4032,
      0.5317,
      0.4274,
      0.5454
     ]
    },
    {
     "code": "then",
     "box": [
      0.4435,
      0.5317,
      0.4887,
      0.5454
     ]
    },
    {
     "code": "re-formated",
     "box": [
      0.5081,
      0.5305,
      0.6274,
      0.5454
     ]
    },
    {
     "code": "and",
     "box": [
      0.6452,
      0.5317,
      0.6855,
      0.5454
     ]
    },
    {
     "code": "sent",
     "box": [
      0.7016,
      0.5317,
      0.7468,
      0.5454
     ]
    },
    {
     "code": "to",
     "box": [
      0.7637,
      0.5334,
      0.7847,
      0.5448
     ]
    },
    {
     "code": "all",
     "box": [
      0.7984,
      0.5317,
      0.8306,
      0.5454
     ]
    },
    {
     "code": "other",
     "box": [
      0.8444,
      0.5305,
      0.9016,
      0.5459
     ]
    },
    {
     "code": "control lers",
     "box": [
      0.1355,
      0.5465,
      0.25,
      0.5602
     ]
    },
    {
     "code": "upon",
     "box": [
      0.2581,
      0.5476,
      0.3081,
      0.5613
     ]
    },
    {
     "code": "the",
     "box": [
      0.3177,
      0.5465,
      0.3532,
      0.5602
     ]
    },
    {
     "code": "request",
     "box": [
      0.3613,
      0.5465,
      0.4387,
      0.5602
     ]
    },
    {
     "code": "of",
     "box": [
      0.4468,
      0.5454,
      0.4694,
      0.559
     ]
    },
    {
     "code": "Master",
     "box": [
      0.5024,
      0.5448,
      0.5726,
      0.5619
     ]
    },
    {
     "code": "Controller.",
     "box": [
      0.5806,
      0.5454,
      0.6935,
      0.5602
     ]
    },
    {
     "code": "This",
     "box": [
      0.1339,
      0.5744,
      0.1847,
      0.591
     ]
    },
    {
     "code": "data",
     "box": [
      0.2048,
      0.575,
      0.2532,
      0.5898
     ]
    },
    {
     "code": "transfer",
     "box": [
      0.2742,
      0.575,
      0.3613,
      0.5898
     ]
    },
    {
     "code": "takes",
     "box": [
      0.3806,
      0.5762,
      0.4387,
      0.5898
     ]
    },
    {
     "code": "place",
     "box": [
      0.4565,
      0.5762,
      0.5161,
      0.591
     ]
    },
    {
     "code": "on",
     "box": [
      0.5347,
      0.5779,
      0.5589,
      0.5893
     ]
    },
    {
     "code": "multiprocessor",
     "box": [
      0.6137,
      0.5739,
      0.7629,
      0.5927
     ]
    },
    {
     "code": "bus",
     "box": [
      0.779,
      0.575,
      0.8218,
      0.5904
     ]
    },
    {
     "code": "which",
     "box": [
      0.8403,
      0.575,
      0.9,
      0.5898
     ]
    },
    {
     "code": "connects",
     "box": [
      0.1355,
      0.591,
      0.2242,
      0.6047
     ]
    },
    {
     "code": "to",
     "box": [
      0.2476,
      0.5916,
      0.2685,
      0.603
     ]
    },
    {
     "code": "all",
     "box": [
      0.2887,
      0.591,
      0.321,
      0.6047
     ]
    },
    {
     "code": "controllers",
     "box": [
      0.3419,
      0.591,
      0.4565,
      0.6047
     ]
    },
    {
     "code": "The",
     "box": [
      0.4855,
      0.5898,
      0.5242,
      0.6035
     ]
    },
    {
     "code": "Input",
     "box": [
      0.5435,
      0.591,
      0.6016,
      0.6047
     ]
    },
    {
     "code": "Controllers",
     "box": [
      0.621,
      0.5898,
      0.7355,
      0.6047
     ]
    },
    {
     "code": "transmit",
     "box": [
      0.7532,
      0.591,
      0.8419,
      0.6047
     ]
    },
    {
     "code": "receive",
     "box": [
      0.1355,
      0.6058,
      0.2129,
      0.6195
     ]
    },
    {
     "code": "data",
     "box": [
      0.2258,
      0.6047,
      0.2726,
      0.6195
     ]
    },
    {
     "code": "via",
     "box": [
      0.2863,
      0.6064,
      0.3218,
      0.6178
     ]
    },
    {
     "code": "this",
     "box": [
      0.3371,
      0.6047,
      0.379,
      0.6184
     ]
    },
    {
     "code": "bus",
     "box": [
      0.3911,
      0.6064,
      0.4298,
      0.6178
     ]
    },
    {
     "code": "while",
     "box": [
      0.4435,
      0.6047,
      0.5016,
      0.6184
     ]
    },
    {
     "code": "the",
     "box": [
      0.5129,
      0.6047,
      0.5484,
      0.6184
     ]
    },
    {
     "code": "Output",
     "box": [
      0.5589,
      0.6041,
      0.6306,
      0.6201
     ]
    },
    {
     "code": "Control lers",
     "box": [
      0.6435,
      0.6041,
      0.7581,
      0.6195
     ]
    },
    {
     "code": "only",
     "box": [
      0.7677,
      0.6058,
      0.8145,
      0.6207
     ]
    },
    {
     "code": "receive",
     "box": [
      0.8242,
      0.6058,
      0.9016,
      0.6195
     ]
    },
    {
     "code": "the",
     "box": [
      0.1355,
      0.6195,
      0.171,
      0.6332
     ]
    },
    {
     "code": "data.",
     "box": [
      0.1871,
      0.6195,
      0.2452,
      0.6332
     ]
    },
    {
     "code": "The",
     "box": [
      0.2645,
      0.6184,
      0.3032,
      0.6332
     ]
    },
    {
     "code": "data",
     "box": [
      0.3194,
      0.6195,
      0.3677,
      0.6332
     ]
    },
    {
     "code": "transfer",
     "box": [
      0.3855,
      0.6195,
      0.4726,
      0.6332
     ]
    },
    {
     "code": "on",
     "box": [
      0.4895,
      0.6224,
      0.5137,
      0.6326
     ]
    },
    {
     "code": "this",
     "box": [
      0.5323,
      0.6195,
      0.5758,
      0.6332
     ]
    },
    {
     "code": "bus",
     "box": [
      0.5887,
      0.6195,
      0.629,
      0.6332
     ]
    },
    {
     "code": "is",
     "box": [
      0.6419,
      0.6195,
      0.6645,
      0.6332
     ]
    },
    {
     "code": "synchronized",
     "box": [
      0.6782,
      0.6184,
      0.8145,
      0.6343
     ]
    },
    {
     "code": "by",
     "box": [
      0.829,
      0.6195,
      0.8565,
      0.6343
     ]
    },
    {
     "code": "an",
     "box": [
      0.8734,
      0.6224,
      0.8992,
      0.6326
     ]
    },
    {
     "code": "Output",
     "box": [
      0.1347,
      0.6326,
      0.2065,
      0.6497
     ]
    },
    {
     "code": "Controller",
     "box": [
      0.2242,
      0.6343,
      0.3306,
      0.648
     ]
    },
    {
     "code": "that",
     "box": [
      0.3468,
      0.6343,
      0.3919,
      0.648
     ]
    },
    {
     "code": "is",
     "box": [
      0.4089,
      0.6361,
      0.4298,
      0.6475
     ]
    },
    {
     "code": "assigned",
     "box": [
      0.4468,
      0.6338,
      0.5403,
      0.6492
     ]
    },
    {
     "code": "to",
     "box": [
      0.5573,
      0.6361,
      0.5782,
      0.6475
     ]
    },
    {
     "code": "be",
     "box": [
      0.5952,
      0.6343,
      0.6226,
      0.648
     ]
    },
    {
     "code": "the",
     "box": [
      0.6387,
      0.6343,
      0.6742,
      0.648
     ]
    },
    {
     "code": "Master .",
     "box": [
      0.6895,
      0.6326,
      0.7677,
      0.6497
     ]
    },
    {
     "code": "selector",
     "box": [
      0.8194,
      0.6343,
      0.9016,
      0.648
     ]
    },
    {
     "code": "switch",
     "box": [
      0.1355,
      0.6492,
      0.2032,
      0.6629
     ]
    },
    {
     "code": "in",
     "box": [
      0.2194,
      0.6492,
      0.2419,
      0.6629
     ]
    },
    {
     "code": "the",
     "box": [
      0.2581,
      0.6492,
      0.2935,
      0.6629
     ]
    },
    {
     "code": "system",
     "box": [
      0.3073,
      0.6475,
      0.3774,
      0.6646
     ]
    },
    {
     "code": "allows",
     "box": [
      0.3903,
      0.6492,
      0.4597,
      0.6629
     ]
    },
    {
     "code": "the",
     "box": [
      0.4742,
      0.6492,
      0.5097,
      0.6629
     ]
    },
    {
     "code": "choice",
     "box": [
      0.5226,
      0.648,
      0.5903,
      0.6629
     ]
    },
    {
     "code": "of",
     "box": [
      0.6032,
      0.648,
      0.6258,
      0.6617
     ]
    },
    {
     "code": "any",
     "box": [
      0.6419,
      0.6503,
      0.6806,
      0.664
     ]
    },
    {
     "code": "one",
     "box": [
      0.696,
      0.6509,
      0.7331,
      0.6623
     ]
    },
    {
     "code": "of",
     "box": [
      0.7468,
      0.648,
      0.7694,
      0.6617
     ]
    },
    {
     "code": "the",
     "box": [
      0.7839,
      0.6492,
      0.8194,
      0.6629
     ]
    },
    {
     "code": "Output",
     "box": [
      0.8298,
      0.6475,
      0.9016,
      0.6634
     ]
    },
    {
     "code": "Controllers",
     "box": [
      0.1355,
      0.6629,
      0.2516,
      0.6777
     ]
    },
    {
     "code": "to",
     "box": [
      0.2645,
      0.664,
      0.2871,
      0.6777
     ]
    },
    {
     "code": "be",
     "box": [
      0.2984,
      0.664,
      0.3258,
      0.6777
     ]
    },
    {
     "code": "Master .",
     "box": [
      0.3677,
      0.6629,
      0.4452,
      0.6766
     ]
    },
    {
     "code": "This",
     "box": [
      0.4597,
      0.6629,
      0.5065,
      0.6766
     ]
    },
    {
     "code": "provides",
     "box": [
      0.5194,
      0.6629,
      0.6113,
      0.6788
     ]
    },
    {
     "code": "maximum",
     "box": [
      0.65,
      0.6634,
      0.7435,
      0.6783
     ]
    },
    {
     "code": "of",
     "box": [
      0.7548,
      0.6629,
      0.7774,
      0.6766
     ]
    },
    {
     "code": "reliability",
     "box": [
      0.7903,
      0.6617,
      0.9,
      0.6777
     ]
    },
    {
     "code": "since",
     "box": [
      0.1355,
      0.6788,
      0.1919,
      0.6925
     ]
    },
    {
     "code": "no",
     "box": [
      0.204,
      0.6805,
      0.2298,
      0.6908
     ]
    },
    {
     "code": "one",
     "box": [
      0.2444,
      0.6805,
      0.2798,
      0.6908
     ]
    },
    {
     "code": "particular",
     "box": [
      0.2911,
      0.6771,
      0.4016,
      0.6925
     ]
    },
    {
     "code": "module",
     "box": [
      0.4137,
      0.6771,
      0.4863,
      0.6908
     ]
    },
    {
     "code": "is",
     "box": [
      0.4976,
      0.6794,
      0.5185,
      0.6908
     ]
    },
    {
     "code": "vital",
     "box": [
      0.529,
      0.6777,
      0.5823,
      0.6914
     ]
    },
    {
     "code": "to",
     "box": [
      0.5944,
      0.6794,
      0.6153,
      0.6908
     ]
    },
    {
     "code": "overall",
     "box": [
      0.6258,
      0.6777,
      0.7,
      0.6914
     ]
    },
    {
     "code": "system",
     "box": [
      0.7121,
      0.6777,
      0.7823,
      0.6925
     ]
    },
    {
     "code": "operation.",
     "box": [
      0.7911,
      0.6766,
      0.8984,
      0.6925
     ]
    },
    {
     "code": "Since",
     "box": [
      0.1355,
      0.6925,
      0.1919,
      0.7062
     ]
    },
    {
     "code": "the",
     "box": [
      0.2048,
      0.6925,
      0.2387,
      0.7062
     ]
    },
    {
     "code": "system",
     "box": [
      0.2508,
      0.6925,
      0.321,
      0.7091
     ]
    },
    {
     "code": "is",
     "box": [
      0.3331,
      0.6942,
      0.354,
      0.7056
     ]
    },
    {
     "code": "divided",
     "box": [
      0.3661,
      0.6914,
      0.4452,
      0.7062
     ]
    },
    {
     "code": "into",
     "box": [
      0.4548,
      0.6925,
      0.4984,
      0.7062
     ]
    },
    {
     "code": "groups",
     "box": [
      0.5089,
      0.6925,
      0.5806,
      0.7085
     ]
    },
    {
     "code": "of",
     "box": [
      0.5903,
      0.6925,
      0.6145,
      0.7062
     ]
    },
    {
     "code": "24",
     "box": [
      0.6242,
      0.6925,
      0.6484,
      0.7062
     ]
    },
    {
     "code": "inputs",
     "box": [
      0.6597,
      0.6925,
      0.7274,
      0.7074
     ]
    },
    {
     "code": "and",
     "box": [
      0.7371,
      0.6925,
      0.7774,
      0.7062
     ]
    },
    {
     "code": "24",
     "box": [
      0.7887,
      0.6925,
      0.8129,
      0.7062
     ]
    },
    {
     "code": "outputs",
     "box": [
      0.8226,
      0.6937,
      0.9016,
      0.7074
     ]
    },
    {
     "code": "the",
     "box": [
      0.1355,
      0.7074,
      0.171,
      0.721
     ]
    },
    {
     "code": "failure",
     "box": [
      0.1839,
      0.7074,
      0.2613,
      0.721
     ]
    },
    {
     "code": "of",
     "box": [
      0.2742,
      0.7074,
      0.2968,
      0.721
     ]
    },
    {
     "code": "one",
     "box": [
      0.3121,
      0.7102,
      0.3476,
      0.7205
     ]
    },
    {
     "code": "module",
     "box": [
      0.3629,
      0.7074,
      0.4355,
      0.721
     ]
    },
    {
     "code": "would",
     "box": [
      0.4484,
      0.7062,
      0.5097,
      0.721
     ]
    },
    {
     "code": "only",
     "box": [
      0.521,
      0.7074,
      0.5677,
      0.7222
     ]
    },
    {
     "code": "effect",
     "box": [
      0.5806,
      0.7062,
      0.6403,
      0.721
     ]
    },
    {
     "code": "its",
     "box": [
      0.654,
      0.7091,
      0.6831,
      0.7205
     ]
    },
    {
     "code": "own",
     "box": [
      0.6976,
      0.7102,
      0.7363,
      0.7205
     ]
    },
    {
     "code": "group",
     "box": [
      0.7492,
      0.7074,
      0.8097,
      0.7233
     ]
    },
    {
     "code": "without",
     "box": [
      0.8242,
      0.7074,
      0.9016,
      0.721
     ]
    },
    {
     "code": "disturbing",
     "box": [
      0.1347,
      0.7199,
      0.2468,
      0.7382
     ]
    },
    {
     "code": "the",
     "box": [
      0.2565,
      0.7222,
      0.2903,
      0.7359
     ]
    },
    {
     "code": "rema",
     "box": [
      0.2992,
      0.7239,
      0.3492,
      0.7353
     ]
    },
    {
     "code": "ining",
     "box": [
      0.3435,
      0.7205,
      0.404,
      0.7382
     ]
    },
    {
     "code": "system.",
     "box": [
      0.4105,
      0.7222,
      0.4903,
      0.737
     ]
    },
    {
     "code": "M776A",
     "box": [
      0.1919,
      0.7507,
      0.2532,
      0.7655
     ]
    },
    {
     "code": "Output",
     "box": [
      0.2669,
      0.7501,
      0.3387,
      0.7673
     ]
    },
    {
     "code": "Controllers",
     "box": [
      0.3532,
      0.7507,
      0.4677,
      0.7655
     ]
    },
    {
     "code": "assimilate",
     "box": [
      0.4815,
      0.7501,
      0.5903,
      0.7673
     ]
    },
    {
     "code": "and",
     "box": [
      0.6024,
      0.7501,
      0.6444,
      0.7655
     ]
    },
    {
     "code": "re-configure",
     "box": [
      0.6589,
      0.7496,
      0.7887,
      0.7673
     ]
    },
    {
     "code": "the",
     "box": [
      0.8032,
      0.7519,
      0.8387,
      0.7655
     ]
    },
    {
     "code": "data",
     "box": [
      0.85,
      0.7501,
      0.9008,
      0.7667
     ]
    },
    {
     "code": "received",
     "box": [
      0.1355,
      0.7667,
      0.2242,
      0.7804
     ]
    },
    {
     "code": "from",
     "box": [
      0.2387,
      0.7667,
      0.2855,
      0.7804
     ]
    },
    {
     "code": "the",
     "box": [
      0.3,
      0.7667,
      0.3371,
      0.7804
     ]
    },
    {
     "code": "Input",
     "box": [
      0.3516,
      0.7667,
      0.4097,
      0.7815
     ]
    },
    {
     "code": "Controllers_",
     "box": [
      0.4242,
      0.7655,
      0.5435,
      0.7804
     ]
    },
    {
     "code": "The",
     "box": [
      0.5645,
      0.7655,
      0.6048,
      0.7792
     ]
    },
    {
     "code": "data",
     "box": [
      0.6145,
      0.765,
      0.6653,
      0.7815
     ]
    },
    {
     "code": "is",
     "box": [
      0.6782,
      0.7673,
      0.6992,
      0.7787
     ]
    },
    {
     "code": "assembled",
     "box": [
      0.7129,
      0.7655,
      0.8177,
      0.7804
     ]
    },
    {
     "code": "into",
     "box": [
      0.829,
      0.7655,
      0.8726,
      0.7792
     ]
    },
    {
     "code": "crosspoint",
     "box": [
      0.1347,
      0.7804,
      0.2435,
      0.7969
     ]
    },
    {
     "code": "bit",
     "box": [
      0.2597,
      0.7815,
      0.2919,
      0.7952
     ]
    },
    {
     "code": "pattern",
     "box": [
      0.3089,
      0.7798,
      0.3871,
      0.7963
     ]
    },
    {
     "code": "and",
     "box": [
      0.4056,
      0.7821,
      0.4427,
      0.7935
     ]
    },
    {
     "code": "then",
     "box": [
      0.4597,
      0.7815,
      0.5065,
      0.7952
     ]
    },
    {
     "code": "transfered",
     "box": [
      0.5218,
      0.7792,
      0.6306,
      0.7952
     ]
    },
    {
     "code": "to",
     "box": [
      0.646,
      0.7821,
      0.6669,
      0.7935
     ]
    },
    {
     "code": "the",
     "box": [
      0.6831,
      0.7821,
      0.7153,
      0.7935
     ]
    },
    {
     "code": "respective",
     "box": [
      0.7298,
      0.7804,
      0.8371,
      0.7969
     ]
    },
    {
     "code": "M771",
     "box": [
      0.8532,
      0.7804,
      0.8984,
      0.7941
     ]
    },
    {
     "code": "Matrix",
     "box": [
      0.1347,
      0.7946,
      0.2065,
      0.8112
     ]
    },
    {
     "code": "Latch",
     "box": [
      0.2153,
      0.7946,
      0.2758,
      0.81
     ]
    },
    {
     "code": "Modules.",
     "box": [
      0.2871,
      0.7952,
      0.3774,
      0.81
     ]
    },
    {
     "code": "The",
     "box": [
      0.3903,
      0.7952,
      0.429,
      0.8089
     ]
    },
    {
     "code": "M771",
     "box": [
      0.4403,
      0.7952,
      0.4871,
      0.8089
     ]
    },
    {
     "code": "in",
     "box": [
      0.5194,
      0.7952,
      0.5435,
      0.8089
     ]
    },
    {
     "code": "turn",
     "box": [
      0.5524,
      0.7969,
      0.5976,
      0.8083
     ]
    },
    {
     "code": "control",
     "box": [
      0.6081,
      0.7952,
      0.6806,
      0.8089
     ]
    },
    {
     "code": "the crosspoint",
     "box": [
      0.6903,
      0.7941,
      0.8403,
      0.8129
     ]
    },
    {
     "code": "clos-",
     "box": [
      0.8468,
      0.7952,
      0.9,
      0.8089
     ]
    },
    {
     "code": "ures",
     "box": [
      0.1363,
      0.8118,
      0.1831,
      0.8232
     ]
    },
    {
     "code": "in",
     "box": [
      0.1927,
      0.8118,
      0.2153,
      0.8232
     ]
    },
    {
     "code": "the",
     "box": [
      0.2242,
      0.81,
      0.2597,
      0.8237
     ]
    },
    {
     "code": "central",
     "box": [
      0.2685,
      0.8118,
      0.3427,
      0.8232
     ]
    },
    {
     "code": "matrix",
     "box": [
      0.3532,
      0.81,
      0.4226,
      0.8237
     ]
    },
    {
     "code": "with",
     "box": [
      0.4306,
      0.81,
      0.4774,
      0.8237
     ]
    },
    {
     "code": "this",
     "box": [
      0.4871,
      0.81,
      0.5306,
      0.8237
     ]
    },
    {
     "code": "bit",
     "box": [
      0.5371,
      0.81,
      0.571,
      0.8237
     ]
    },
    {
     "code": "pattern.",
     "box": [
      0.5782,
      0.8089,
      0.6661,
      0.8249
     ]
    },
    {
     "code": "",
     "box": [
      0.7806,
      0.842,
      0.8532,
      0.8568
     ]
    },
    {
     "code": "2-3",
     "box": [
      0.5016,
      0.8945,
      0.5371,
      0.9093
     ]
    },
    {
     "code": "The",
     "box": [
      0.1331,
      0.2367,
      0.1758,
      0.255
     ]
    },
    {
     "code": "and",
     "box": [
      0.3194,
      0.267,
      0.3629,
      0.2847
     ]
    },
    {
     "code": "and",
     "box": [
      0.5306,
      0.3252,
      0.5734,
      0.3423
     ]
    },
    {
     "code": "The",
     "box": [
      0.3153,
      0.3976,
      0.3581,
      0.4159
     ]
    },
    {
     "code": "wi",
     "box": [
      0.8121,
      0.4295,
      0.8371,
      0.4427
     ]
    },
    {
     "code": "The",
     "box": [
      0.1331,
      0.4855,
      0.1774,
      0.5037
     ]
    },
    {
     "code": "and",
     "box": [
      0.8597,
      0.5887,
      0.9016,
      0.6064
     ]
    },
    {
     "code": "The",
     "box": [
      0.1331,
      0.749,
      0.1774,
      0.7673
     ]
    }
   ]
  }
 ]
}
```
