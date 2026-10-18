# 2014 - POD9 - MANUAL.docx
Wiki page: [POD9](../../../PAGES/POD9.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** POD9
- **Category:** PODS
- **Module year estimate:** 1995 — original file date saved 1995-09-11: WBSps Engineering from H drive-20261018T013433Z-1-003/WBSps Engineering from H drive/WBSps - POD_OLD/POD9/ACAD/FAPOD9.DWG
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD9 MANUAL(1).docx`
- **SHA-256:** `a82b9ab5b582052f3d4ad2259dccb2d77ff25a66878ea13c7fc0661ec3d105bf`
- **Size:** 2,987,084 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …POD9 VIDEO SWITCHER by Ward-Beck Systems Rev:Oct.01 2014 POD9 6 X 1 VIDEO SWITCHER This is one of many in our line o…

## Full text

### Page 1 (Word document)

```text
POD9
VIDEO SWITCHER











by Ward-Beck Systems
Rev:Oct.01 2014

POD9
6 X 1 VIDEO SWITCHER 

This is one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and affordable. They are suited for tabletop use, or rack-mountable singly or in pairs, in any combination.


___________________________________________

POD9 is a six by one video selector with remote control capabilities. POD9 may be used in conjunction with an analog audio switcher (POD2) for audio follow video applications. When slave mode is engaged, any channel selection on the video switcher will result in the same selection on the audio switch and vice versa. The video switching on POD9 occurs in the vertical interval. If the currently selected input does not have valid synch, POD9 will switch randomly.

POD9 may also be controlled remotely using its RS422 serial interface. The serial communications are eight bit, no parity at 9600 baud rate. In order to remotely control POD9, two bytes of information must be sent. The first byte is an address byte (ALWAYS F0) and the second byte is the command byte. 


COMMUNICATIONS CONTROL CONNECTIONS (DB9F)
Transit data from (3-TX+, 8-TX-)
Receive data from (7-RX+, 2-RX-)
Ground (5-GND)

The communication protocol is detailed on the following pages.











SPECIFICATIONS

Input Impedance (6)
75 ohm
Input Level
1 Vp-p, nominal
Input Return Loss
46 dB Typical, @ 3.58M
Output Impedance (2 splits)
75 ohm
Output Level
1 Vp-p, terminated
Response
better than 0.05dB @ 3.58M
Differential Gain
better than 0.1% @ 3.58M
Differential Phase
better than 0.1deg @ 3.58M
Crosstalk
better than 60dB, @ 3.58M
S/N
better than 60dB, 5MHz B.W.

Power Requirements
115 VAC,60Hz
 (available upon request) 230 VAC,50Hz
Dimensions
8.69" wide x 1.73" high x 7.0" deep
                                                                                        (221mm x 44mm x 178 mm)
Weight
1.37 kg (3.01 lbs)


Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.

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
POD9 will send back the same status bits as shown in the REQUEST STATUS command.

NOTE: To cancel SUM MODE send command F0, 80 (HEX) followed by desired switch command,                         

3)
  SWITCH AUDIO AND VIDEO

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

           GPI CONNECTIONS for POD9
           (Available as Option)

N/C
N/C
Input 1
Input 2
Input 3
Input 4
Input 5
Input 6 
GND     

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
 "file": "Products/PODS/POD9/2014 - POD9 - MANUAL.docx",
 "sha256": "a82b9ab5b582052f3d4ad2259dccb2d77ff25a66878ea13c7fc0661ec3d105bf",
 "kind": "module",
 "models": [
  "POD9"
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
