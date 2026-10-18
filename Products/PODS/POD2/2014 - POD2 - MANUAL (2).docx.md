# 2014 - POD2 - MANUAL (2).docx
Wiki page: [POD2](../../../PAGES/POD2.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** POD2
- **Category:** PODS
- **Module year estimate:** 1997 — month "OCT 7,1997" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD2 - #Schematic.pdf
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD2 MANUAL(1).docx`
- **SHA-256:** `d0851b8023dc24cd3483c167ea54f5159a9b68f32d28ff29e1269cd892419001`
- **Size:** 1,248,860 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …POD2 STEREO AUDIO SWITCHER by Ward-Beck Systems Rev:Oct.01 2014 POD2 STEREO AUDIO SWITCHER This is one of many in our line…

## Full text

### Page 1 (Word document)

```text
POD2
STEREO AUDIO SWITCHER










by Ward-Beck Systems

                                                                 Rev:Oct.01 2014
POD2

STEREO AUDIO SWITCHER

This is one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and affordable. They are suited for tabletop use, or rack-mountable singly or in pairs, in any combination.


___________________________________________

POD2 is a unity gain six by one stereo audio switcher. Connections to POD2 are on the rear panel via two rows of screw terminal blocks. 

POD2 operates as either a one of six switcher or, in the SUM mode, as a selective multi-input mixer. The unit is placed in the SUM mode by depressing the SUM button. Sources one through six may now be mixed by depressing the appropriate numbered buttons. To return to the one of six selection mode press the SUM button first and then the numbered button of the desired selection.

POD2 may be used in conjunction with POD9 as an audio follow video switcher. When POD2 and 9 are in the audio follow video mode, any switch activated on POD9 will result in the same switch occurring on POD2 and any switch activated on POD2 will result in the same switch occurring on POD9.

POD2 may also be controlled remotely using its RS422 serial interface. The serial communications are eight bit, no parity at 9600 baud rate. The serial interface will also allow POD2 to control POD9 if it is present. In order to remotely control POD2 two bytes of information must be sent. The first byte is an address byte (ALWAYS F0) and the second byte is the command byte.



COMMUNICATIONS CONTROL CONNECTIONS (DB9F)
Transit data from (3-TX+, 8-TX-)
Receive data from (7-RX+, 2-RX-)
Ground (5-GND)


The communication protocol is detailed on the following pages.
 


SERIAL PROTOCOL

1)     REQUEST STATUS 
      
ACTION:
Two bytes are sent


1st byte   
11110000

2nd byte
00000000



RESPONSE:
1st byte (POD9 Status)


1 X X X X X X X

X=0 Slave switch not activated
────┘[6 5 4 3 2 1]

X=1 Slave switch activated
└──
Video Inputs 1 through 6


X=0 Video source not selected


X=1 Video source selected

2nd byte (POD2 Status)


0 X X X X X X X

X=0 Sum switch not activated
────┘[6 5 4 3 2 1]

X=1 Sum switch activated
└──
Audio Inputs 1 through 6


X=0 Audio source not selected


X=1 Audio source selected
     
Note:If POD9 is not present the second byte of response would read 0000 0000.

2)     SUM AUDIO
Action:
Two bytes are sent


1st byte   
1 1 1 1 0 0 0 0

2nd byte
0 1 X X X X X X


   [6 5 4 3 2 1]


└── Audio Inputs 1 through 6


X=0 Audio source not selected


X=1 Audio source selected

RESPONSE
POD2 will send back the same status bits as shown in the REQUEST STATUS command.

NOTE: To cancel SUM MODE send command F0, 80 (HEX) followed by the desired switch command.


3)      SWITCH AUDIO AND VIDEO


Action:
Two bytes are sent


1st byte   
1 1 1 1 0 0 0 0

2nd byte
1 0 X X X X X X


└── Audio Input
001➩110 (1➩ 6)
└───── Video Input
001➩110 (1➩ 6)

RESPONSE
POD2 will send back the same status bits as shown in the REQUEST STATUS command.
NOTE: If switching from SUM MODE send command F0, 80 followed by the desired switch command.

4)        SLAVE AUDIO AND VIDEO

Action:
Two bytes are sent


1st byte   
1 1 1 1 0 0 0 0

2nd byte
1 1 0 0 0 X X X


└── Input
001➩110 (1➩ 6)
 RESPONSE
POD2 will send back the same status bits as shown in the REQUEST STATUS command.

NOTE: The Slave indicator on POD9 may be turned on by sending the command F0, C0 (HEX) and turned off by F0, C7 (HEX).
  
          GPI CONNECTIONS for POD2
                  (Available as Option)

Mix
N/C
Input 1
Input 2
Input 3
Input 4
Input 5
Input 6
GND 


 SPECIFICATIONS



Gain
Unity
Max Input Level
+30 dBu
Max Output Level
+30 dBu
Frequency Response
± 0.1 dB, 20Hz to 20kHz
Noise
better than 90dBu, 20Hz to 20kHz
THD + Noise
better than 0.01%, 20Hz to 20kHz
Inter-Channel Crosstalk
better than 80dB, 20Hz to 20kHz
Stereo Separation
better than 80dB, 20Hz to 20kHz
Input Impedance
40 kOhm balanced
Output Impedance
60 Ohm balanced


Power Requirements

100-240 VAC, 50-60Hz
Dimensions
8.69” wide x 1.73” high x 7.0" deep

(221mm x 44mm x 178 mm)
Weight
1.37 kg (3.01 lbs)



Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.  




















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
 "file": "Products/PODS/POD2/2014 - POD2 - MANUAL (2).docx",
 "sha256": "d0851b8023dc24cd3483c167ea54f5159a9b68f32d28ff29e1269cd892419001",
 "kind": "module",
 "models": [
  "POD2"
 ],
 "year": 2014,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "CONNECTIONS",
     "kind": "installation"
    },
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
