# 1997 - POD7B - POD7 - SPECIFICATIONS (POD7B).wpd
Wiki page: [POD7B](../../../PAGES/POD7B.md)


- **Year:** 1997 (original file date 1997-08-28)
- **Module:** POD7B
- **Category:** PODS
- **Module year estimate:** 1997 — original file date saved 1997-08-28: WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - POD_OLD/POD7/POD7B.WPD
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - POD_OLD/POD7/POD7B.WPD`
- **SHA-256:** `9e49fe235f8ea1f5b08c5a14a0a5d2d7a839c45d6838629f3baf5e5ceda564ca`
- **Size:** 27,839 bytes
- **Pages:** 1

## Full text

### Page 1 (office)

```text
﻿POD 7
UNIVERSAL INTERFACE

Just one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and afforable.  For table top use, or rack-mountable singly or in pairs, in any combination.
         
___________________________________________


POD 7 is a control interface module designed for use where isolation is required between console logic level outputs and the controls of external devices, such as CD players, ON Air lights, etc.  The unit provides eight inputs (logic level or opto-couple) which can be mapped to ten open collector outputs and/or four form C relays.  POD 7 also includes a small, switchable amplifier capable of driving a 2W, 8 Ohm speaker.

In POD 7 mapping of the input controls to outputs is achieved in software.  In the standard software configuration the contols are mapped as follows:
Inputs 1 through 4 activate open collector outputs 1 to 4 as well as relays t to 4, respectively.
Inputs 5 throudh 8 activate open collector outputs 5 to 8, respectively.
"Audio amplifier on" control causes open collectors 9 and 10 to toggle

Logic input control is a closure to ground, opto-coupled control requires a properly polarised voltage ranging from 3 to 28 Volts.  The audio amplifier in POD 7 is enabled by a closure to ground.  Open collector 9 is normally active or low, while open collector 10 is inactive or high.  When the audio amplifier is enabled the state of open collectors 9 and 10 toggle i.e. 10 becomes active or low while 9 becomes inactive or high.

Factory options for POD 7 includes custom mapping of input control to outputs and RS422/485 serial control.  Please consult the factory to address your special needs. 















SPECIFICATIONS
(I/O INTERFACE)

Opto-isolator Input Voltage Max:	+ 28 V
Opto-isolator Input Voltage Min:	+ 3 V
Logic Inputs	0 to 5 V
Open Collector Current Max:	250 mA
Relay Max Operating Current:	2 A
Relay Rated Load:	0.5 A at 125 VAC
2 A at 30 VDC

(AUDIO AMPLIFIER)

Max Output Level:	2 Watts RMS into a 8 Ω Load
Frequency Response:	± 1dB. 20 Hz to 20 kHz
Noise:	- 80 dBu, 20Hz to 20 kHz
Input Impedance:	20 kW
Common Mode Rejection:	Greater than 60 dB at 60 Hz
Power Requirements:	110 Volts ac, 60 or 50Hz, 12 VA
Ambient Temperature:	0° to 50° Celsius
Dimensions:	8.69" wide x 1.73" high x 7.0" deep
221 mm x 44 mm x 178 mm
Weight:	1.3 kg
(2.86 lbs)













I/O Tables

Opto-isolator Inputs

      PIN NUMBERS
       FUNCTION
      PIN NUMBERS
       FUNCTION
14,1
Opto 1+, Opto 1-
9,21
Opto 6+, Opto 6-
2
Logic 1
22
Logic 6
3,5
Opto 2+, Opto 2-
23,10
Opto 7+, Opto 7-
16
Logic 2
11
Logic 7
17,4
Opto 3+, Opto 3-
12,24
Opto 8+, Opto 8-
5
Logic 3
25
Logic 8
6,18
Opto 4+, Opto 4-
13
Ground
19
Logic 4


20,7
Opto 5+, Opto 5-


8
Logic 5



Opto Inputs (8)
3-28V Activation Voltage

Logic Inputs (8)
0-5 Volt logic or momentary closure to ground

Opto and logic inputs operate in parallel

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


I/O Tables cont'd

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


Relay Outputs

      PIN NUMBERS
      FUNCTION
      PIN NUMBERS
      FUNCTION
25
Common 1A
5
Common 3B
12
Normally open 1A
17
Normally open 3B
13
Normally closed 1A
18
Normally closed 3B
11
Common 1B
16
Common 4A
23
Normally open 1B
3
Normally open 4A
24
Normally closed 1B
4
Normally closed 4A
22
Common 2A
2
Common 4B
9
Normally open 2A
14
Normally open 4B
10
Normally closed 2A
15
Normally closed 4B
8
Common 2B
1
N/C
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
```

## Contents (JSON)

```json
{
 "file": "Products/PODS/POD7B/1997 - POD7B - POD7 - SPECIFICATIONS (POD7B).wpd",
 "sha256": "9e49fe235f8ea1f5b08c5a14a0a5d2d7a839c45d6838629f3baf5e5ceda564ca",
 "kind": "module",
 "models": [
  "POD7B"
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
