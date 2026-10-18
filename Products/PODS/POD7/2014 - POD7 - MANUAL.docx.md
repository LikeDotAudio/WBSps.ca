# 2014 - POD7 - MANUAL.docx
Wiki page: [POD7](../../../PAGES/POD7.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** POD7
- **Category:** PODS
- **Module year estimate:** 1994 — month "Sep-94" in WBSps Engineering from H drive-20261018T013433Z-1-003/WBSps Engineering from H drive/WBSps - POD_OLD/POD7/ISS1/ORCAD/#ESP_OUT.TXT
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD7 MANUAL(1).docx`
- **SHA-256:** `403255ace32e5958fd80d88dd2c13007e2bdbb23e7606ea4dadc890f10899e26`
- **Size:** 342,837 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …POD 7 UNIVERSAL INTERFACE by Ward-Beck Systems Rev:Oct.01 2014 POD 7 UNIVERSAL INTERFACE This is one of many in our line o…

## Full text

### Page 1 (Word document)

```text
POD 7
UNIVERSAL INTERFACE









by Ward-Beck Systems
Rev:Oct.01 2014
POD 7

UNIVERSAL INTERFACE

This is one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and affordable. They are suited for tabletop use, or rack-mountable singly or in pairs, in any combination.
          

___________________________________________


POD7 is a control interface module designed for use where isolation is required between console logic level outputs and the controls of external devices, such as CD players, ON AIR lights, etc.  The unit provides eight inputs (logic level or opto-couple) which can be mapped to ten open collector outputs and/or four form C relays.  POD7 also includes a small, switchable amplifier capable of driving a 2W, 8 Ohm speaker.

In POD7, mapping of the input controls to outputs is achieved in software.  In the standard software configuration the controls are mapped as follows:
Inputs 1 through 4 activate open collector outputs 1 to 4 as well as relays 1 to 4, respectively.
Inputs 5 through 8 activate open collector outputs 5 to 8, respectively.
Audio enable control input, when grounded, enables the audio amplifier.
Open collector output 10 is active when audio is disabled.
Open collector output 9 toggles at 2 Hz from inactive to active when audio is enabled, and is inactive when audio is disabled.

Logic inputs require a closure to ground, while opto-coupled inputs require a properly polarised voltage ranging from 3 to 28 Volts.  

Factory options for POD7 includes custom mapping of input control to outputs and RS422/485 serial control.  Please consult the factory to address your special needs. 

 






SPECIFICATIONS
(I/O INTERFACE)

Opto-isolator Activation Voltage Max:
+ 28 V
Opto-isolator Activation Voltage Min:
+ 3 V
Logic Inputs:
0 to 5 V
Open Collector Current Max:
250 mA
Max Relay Switching Capacity:
0.5 A at 125V AC
2 A at 30V DC

(AUDIO AMPLIFIER)

Max Output Level:
2 Watts RMS into an 8Ω Load
Frequency Response:
0.5 dB, 20Hz to 20kHz
Noise:
better than -80 dBu, 20Hz to 20kHz
Input Impedance:
20kΩ
Common Mode Rejection:
better than 60 dB at 60Hz

Power Requirements:
115 VAC,60Hz
                                                                    (available upon request) 230VAC,50Hz
Dimensions:
8.69" wide x 1.73" high x 7.0" deep
221 mm x 44 mm x 178 mm
Weight:
1.37 kg (3.01 lbs)





Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.















I/O Tables

Opto-Isolator Inputs


             PIN 

        FUNCTION



          PIN 

        FUNCTION

             14,1

Opto 1+, Opto 1-


           9,21

Opto 6+, Opto 6-

               2

Logic 1


            22

Logic 6

              3,15

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

Open Collector Outputs (8)
150mA sink capability
 Relay outputs 4-form c












I/O Tables CONTINUED

Audio


                       PIN 

                               FUNCTION

1

Audio Input +

2

Audio Input -

3

Ground

4

Open Collector Out 9  (Active Toggles @2 Hz, Audio On) 

5

Open Collector Out 10  (Acitve  Audio Off)

6 

Audio Output

7

Ground

8

Ground

9

Control Input  (Audio Enable)




















Relay Outputs


 PIN NUMBER

       FUNCTION



   PIN 

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












WARRANTY

All Ward-Beck Systems Inc. products are warranted against defective materials and workmanship for a period of one year from the date of shipment. 

Ward-Beck Systems Inc. will repair or replace, at its option and without charge, all said products or parts thereof which upon factory inspection prove to be defective during the warranty period, provided that: 

The original serial numbers are intact and have not been tampered with.

The purchaser shall return any equipment or parts thereof to Ward-­Beck Systems Inc. only after obtaining prior authorization and shipping instructions from the factory. (Ward-Beck Systems Inc. reserves the right to inspect or repair equipment on the purchaser’s premises).

The purchaser assumes the obligation for all expenses in connection with the shipping and return of such goods, once authorization has been obtained. 

This warranty does not cover items normally considered expendable, such as fuses and lamps. 

This warranty does not cover damages caused by misuse, accident, neglect, unauthorized alteration, repair by unauthorized personnel, or damage caused by an act of God, war, or civil insurrection. 

In no event shall Ward-Beck Systems Inc. be liable for consequential damages. Ward-Beck Systems Inc. shall have the rights to final determination as to the application of this warranty. 

Ward-Beck Systems Inc. reserves the right, at any time and without notice, to make changes in its equipment, components, specifications or designs, as may be warranted by progress in state-of-the-art technology. 

Ward-Beck Systems Inc. reserves the right to make design changes, additions to, and improvements in its products, without obligation to install such revisions in products previously manufactured. 

The warranty set forth herein is in lieu of all other warranties expressed or implied, including the warranties of merchantability and fitness. 


WARD-BECK SYSTEMS INC.
945 Middlefield Road, Unit 9, Toronto, Ontario M1V 5E1
V 416 335 5999 F 416 335 5202 Toll-Free 800 771 2556
Website: www.ward­-beck.com
E-Mail: sales@ward­-beck.com
```

## Contents (JSON)

```json
{
 "file": "Products/PODS/POD7/2014 - POD7 - MANUAL.docx",
 "sha256": "403255ace32e5958fd80d88dd2c13007e2bdbb23e7606ea4dadc890f10899e26",
 "kind": "module",
 "models": [
  "POD7"
 ],
 "year": 2014,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "SPECIFICATIONS",
     "kind": "specs"
    },
    {
     "heading": "WARRANTY",
     "kind": "warranty"
    }
   ],
   "dates": [
    {
     "year": 2014,
     "kind": "month",
     "text": "Oct.01 2014"
    }
   ]
  }
 ]
}
```
