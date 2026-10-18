# 2014 - POD30 - MANUAL (2).docx
Wiki page: [POD30](../../../PAGES/POD30.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** POD30
- **Category:** PODS
- **Module year estimate:** 2014 — month "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD30 MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD30 MANUAL.docx`
- **SHA-256:** `7e5afda6ee5286b7afe4cf05b58a97f1c70d705299d3a842d50d66b588930a90`
- **Size:** 1,043,461 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …POD30 4X1 HD-SDI SWITCHER by Ward-Beck Systems Rev:Oct.01 2014 POD30 4x1 HD-SDI VIDEO SWITCHER This is one of many in our…

## Full text

### Page 1 (Word document)

```text
POD30
4X1 HD-SDI SWITCHER












by Ward-Beck Systems
Rev:Oct.01 2014
POD30 

4x1 HD-SDI VIDEO SWITCHER

This is one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and affordable. They are suited for tabletop use  or rack-mountable singly or in pairs, in any combination.
          

___________________________________________

POD30 is a four by one HD-SDI video switcher with remote control capabilities. POD30 may be controlled remotely using its RS485 serial interface.  The serial communications are eight bit, no parity at 9600 baud rate.  In order to remotely control POD30, two bytes of information must be sent.  The first byte is an address byte (ALWAYS F0) and the second byte is the command byte.  The communication protocol is detailed on the following page.

There is also a remote control panel available called POD30R which connects to the POD30 serial port and provides the same front panel control and status remotely for POD30.




STATUS TALLIES

The Pod 30 is equipped with three LED status tallies, located on the front panel.
The function of these tallies are the following:


GREEN LED 
SDI - indicates that the receiver is lock to the incoming digital video signal.

GREEN LED
HD - indicates the 1.485 Gbps sampling rate signals, otherwise the incoming digital video signal is one of 143, 177, 270 or 360 Mbps.

RED LED
ERROR - indicates that the receiver cannot lock to the   incoming digital video signal. 


GPI Control Connections               COMMUNICATIONS CONTROLCONNECTIONS(DB9F)   

1. Input 1
5. GND

Receive data (3-RX+,8-RX-)
2. Input 2
6. N/C

Transmit data (7-TX+,2-TX-)
3. Input 3
7. N/C

Ground (5-GND)
4. Input 4
8. N/C



        SPECIFICATIONS

SDI INPUT

Input Impedance (4)
75Ω
Input Level
0.8 Vp-p, nominal

SDI OUTPUT

Output Impedance (2)
75Ω
Output level
0.8 Vp-p, terminated

REFERENCE INPUT
Video Input
1 Vp-p, terminated
Impedance
75Ω unbalanced
Standards
NTSC (PAL - consult factory)

GENERAL
Power Requirements
100-240 VAC,50-60 Hz
Dimensions
8.69" wide x 1.73" high x 7.0" deep
(221mm x 44mm x 178 mm)
Weight
1.37 kg (3.01 lbs)




Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.
























SERIAL PROTOCOL

1)

REQUEST STATUS
ACTION:
Two bytes are sent
1st byte  1 1 1 1 0 0 0 0
2nd byte 0 0 0 0 0 0 0 0

RESPONSE:
1st byte (POD30 Status)
      1 X X X  X X X X
                                                                     [ 4 3 2 1]

                                                                └────Video Inputs 1 through six
X=0 Video source not selected
X=1 Video source selected
 2nd byte
      0 0 0 0 0 0 0 0


2)

SWITCH VIDEO
ACTION:
Two bytes are sent
1st byte  1 1 1 1    0 0 0 0
2nd byte 1 0 X X  X X X X
              └───────
Video input
001⇨100(1⇨4)
RESPONSE
POD30 will send back the same status bits as shown in the REQUEST STATUS command.

Note: If switching from SUM MODE send command F0, 80 followed by the desired switch command.











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
 "file": "Products/PODS/POD30/2014 - POD30 - MANUAL (2).docx",
 "sha256": "7e5afda6ee5286b7afe4cf05b58a97f1c70d705299d3a842d50d66b588930a90",
 "kind": "module",
 "models": [
  "POD30"
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
