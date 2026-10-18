# 1997 - POD7 - POD7 - SPECIFICATIONS (POD7).wpd
Wiki page: [POD7](../../../PAGES/POD7.md)


- **Year:** 1997 (original file date 1997-08-25)
- **Module:** POD7
- **Category:** PODS
- **Module year estimate:** 1994 — month "Sep-94" in WBSps Engineering from H drive-20261018T013433Z-1-003/WBSps Engineering from H drive/WBSps - POD_OLD/POD7/ISS1/ORCAD/#ESP_OUT.TXT
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - POD_OLD/POD7/POD7.WPD`
- **SHA-256:** `0d3d65ac0e940cb96414877f67bec710412c6779547323d39e2b770f0c27f1c1`
- **Size:** 22,086 bytes
- **Pages:** 1

## Full text

### Page 1 (office)

```text
﻿POD 7 
UNIVERSAL INTERFACE


Just one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and afforable.  For table top use, or rack-mountable singly or in pairs, in any combination.
         
___________________________________________


POD7 is a universal interface providing eight (8) inputs (opto-isolator or logic level), ten (10) open collector outputs and four (4) form C relays.  POD7 also has a switchable audio amplifier capable of driving an 8 Ohm speaker and has a front panel level trim is provided.

On the standard POD7, the parallel inputs are mapped directly to the parallel outputs, i.e. opto or logic input 1 will activate relay 1 and open collector 1.  The inputs of the POD7 are located on a DB-25S connector.  These inputs may be activated in one of two ways (Please refer to the schematic and I/O Tables). One way to activate an input is to apply a voltage ranging from 3 to 28 Volts with the respective polarity.  The other way to activate these inputs is to provide a closure to ground at the logic inputs.

Open collector outputs 9 and 10 on the audio connector follow the audio control input, i.e. when the audio control input is held low, the audio is enabled.  Open collector 9 is active and open collector 10 is inactive; when the control input is high or open, the audio is cut off, open collector 9 is inactive and open collector 10 is active.

RS422/RS485 serial control optional - consult factory

Custom input/output logic is available - consult factory








SPECIFICATIONS
(I/O INTERFACE)

Opto-isolator Input Voltage Max						      + 28 V
Opto-isolator Input Voltage Min						        + 3 V
Open Collector Current Max						       250 mA
Relay Max Operating Current							 2 A
Relay Rated Load							   0.5 A at 125 VAC
       2 A at 30 VDC

(AUDIO AMPLIFIER)

Gain Range									   -13 - 19dB
Max Output Level								       2 Watts
Frequency Response						    + 1dB. 20 Hz to 20 kHz
Noise										       - 80 dB
Input Impedance								         20 kW
Source Impedance								       600 W
Common Mode Rejection				       Greater than 60 dB at 60 Hz

(GENERAL)

Power Requirements		         		        110 AC, 60 or 50Hz, 12 VA
Ambient Temperature						   0° to 50° Celsius
Dimensions					      8.69" wide x 1.73" high x 7.0" deep
Weight									        1.3 kg
     2.86 lbs














I/O Configurations

Opto-isolator Inputs

      PIN NUMBERS
       FUNCTION
14,1
Opto 1+, Opto 1-
2
Logic 1
3,5
Opto 2+, Opto 2-
16
Logic 2
17,4
Opto 3+, Opto 3-
5
Logic 3
6,18
Opto 4+, Opto 4-
19
Logic 4
20,7
Opto 5+, Opto 5-
8
Logic 5
9,21
Opto 6+, Opto 6-
22
Logic 6
23,10
Opto 7+, Opto 7-
11
Logic 7
12,24
Opto 8+, Opto 8-
25
Logic 8
13
Ground


Opto Inputs (8)
3-28V Activation Voltage

Logic Inputs (8)
0-5 Volt logic or momentary closure to ground

Opto and logic inputs operate in parallel








I/O Configurations cont'd

Open Collectors

      PIN NUMBERS
      FUNCTION
5
Open Collector 1
4
Open Collector 2
3
Open Collector 3
2
Open Collector 4
1
Open Collector 5
9
Open Collector 6
8
Open Collector 7
7
Open Collector 8
6
Ground

Open Collector Outputs (10)
150mA sink capability
Relay outputs 4-form c

Audio

     PIN NUMBER
    FUNCTION
1
Input +
2
Input -
3
Ground
4
Open Collector Out 9
5
Open Collector Out 10
6
Audio Out
7
Ground
8
Ground
9
Control Input




I/O Configurations cont'd

Relay Outputs

      PIN NUMBERS
      FUNCTION
25
Common 1A
12
Normally open 1A
13
Normally closed 1A
11
Common 1B
23
Normally open 1B
24
Normally closed 1B
22
Common 2A
9
Normally open 2A
10
Normally closed 2A
8
Common 2B
20
Normally open 2B
21
Normally closed 2B
19
Common 3A
6
Normally open 3A
7
Normally closed 3A
5
Common 3B
17
Normally open 3B
18
Normally closed 3B
16
Common 4A
3
Normally open 4A
4
Normally closed 4A
2
Common 4B
14
Normally open 4B
15
Normally closed 4B
1
N/C
```

## Contents (JSON)

```json
{
 "file": "Products/PODS/POD7/1997 - POD7 - POD7 - SPECIFICATIONS (POD7).wpd",
 "sha256": "0d3d65ac0e940cb96414877f67bec710412c6779547323d39e2b770f0c27f1c1",
 "kind": "module",
 "models": [
  "POD7"
 ],
 "year": 1997,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "SPECIFICATIONS",
     "kind": "specs"
    }
   ]
  }
 ]
}
```
