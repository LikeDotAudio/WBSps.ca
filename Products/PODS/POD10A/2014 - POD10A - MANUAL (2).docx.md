# 2014 - POD10A - MANUAL (2).docx
Wiki page: [POD10A](../../../PAGES/POD10A.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** POD10A
- **Category:** PODS
- **Module year estimate:** 2014 — month "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD10A MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD10A MANUAL(1).docx`
- **SHA-256:** `81543164348f3bd7fd75d48fe8f57f662dbf9ae0e456353aced513f82ebdede0`
- **Size:** 560,483 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …HER POD10A/75 REAR POD10A/110 REAR by Ward-Beck Systems Rev:Oct.01 2014 POD10A AES SWITCHER This is one of many in our line of top…

## Full text

### Page 1 (Word document)

```text
POD10A
AES SWITCHER


POD10A/75 REAR

POD10A/110 REAR


by Ward-Beck Systems
                 Rev:Oct.01 2014
POD10A

AES SWITCHER

This is one of many in our line of top quality, low-cost broadcast problem solvers. PODS are compact, rugged and affordable. They are suited for tabletop use or rack-mountable singly or in pairs, in any combination.


___________________________________________

POD10A is an interlocking digital audio switcher which can be configured as a single eight by one switcher or a dual four by one switcher. Configuration is done via a slide switch on the front panel of the device. When the slide switch is in the top position, a single switcher is active and inputs 1 to 8 are mapped to both output A and output B simultaneously. When the slide switch is in the bottom position the dual switcher is active and inputs A1 to A4 (1 to 4) are mapped to output A and inputs B1 to B4 (5 to 8) are mapped to output B. 

Connections to POD10A are on the rear panel via terminal blocks or BNC connectors. These connections contain eight transformer balanced inputs and two transformer balanced outputs.

POD10A can be controlled directly by use of the buttons on the front panel.  POD10A can also be controlled remotely via the RS-485 serial interface and a suitable serial terminal program.  Alternatively, the POD10R remote panel is also available, which provides a visually similar control interface to the POD10A with the exception of the mode switch.  POD10R communicates with POD10A via the RS-485 serial interface and provides a convenient means of remotely controlling the POD10A from up to 1200m (4000ft) away.  The details of the serial communication protocol are provided on the next page.

Should the POD10A need to be controlled by another device without an RS-485 interface, an optional GPIO port is available.  Any input may be controlled in this fashion via TTL-level signals.  The POD10A inputs are active-low and have an internal pull-up to 5V.  Simply assert a 0V pulse to the required input.











RS-485 PROTOCOL

The POD10A RS-485 interface operates at 9600baud, 8 bits, no parity, no flow control.  All commands issued to, and responses from the POD10A consist of two bytes of hexadecimal or binary data.  The first byte is ALWAYS “F0” in hex, or “11110000” in binary.  

The input push-buttons are active low, and are mapped to the input register relative to the front panel. That is, input 1 corresponds to the MSB of the input register while input 8 corresponds to the LSB of the input register.


Status Request

The response of the POD10A to the Status Request command indicates which input is routed to the output(s) as well as which mode the unit is operating in.


SEND
Binary
Hexadecimal
1st byte
2nd byte
1 1 1 1 0 0 0 0
1 1 1 1 1 1 1 1
F0
FF
RESPONSE


1st byte
2nd byte
1 1 1 1 0 0 0 0
X X X X X X X X
F0
??


X = 0: input is active
X = 1: input is not active
?? = hex equivalent of binary data

If only one input indicates low, the POD10A is in 8x1 mode.
If two inputs indicate low, the POD10A is in dual 4x1 mode.












Switch Input/Mode

The response of the POD10A to the Switch Input/Mode command is the same as the response to the Status Request command, and indicates the the same information.

SEND
Binary
Hexadecimal
1st byte
2nd byte
1 1 1 1 0 0 0 0
X X X X X X X X
F0
??
RESPONSE


1st byte
2nd byte
1 1 1 1 0 0 0 0
X X X X X X X X
F0
??

X = 0: input is active
X = 1: input is not active
?? = hex equivalent of binary data

8x1 Mode
To switch from dual 4x1 mode, or to switch inputs in 8x1 mode send F0 followed by one of the values in the table below.

Dual 4x1 Mode
To switch from 8x1 mode, or to switch inputs in dual 4x1 mode send F0 followed by one of the values from section A “anded” with one of the values from section B in the table below.  For example, to activate inputs A2 (2) and B3 (7) send F0, BD.  

Desired Input
Binary
Hexadecimal
1 (A1)
0 1 1 1 1 1 1 1
7F
2 (A2)
1 0 1 1 1 1 1 1
BF
3 (A3)
1 1 0 1 1 1 1 1
DF
4 (A4)
1 1 1 0 1 1 1 1
EF
5 (B1)
1 1 1 1 0 1 1 1
F7
6 (B2)
1 1 1 1 1 0 1 1
FB
7 (B3)
1 1 1 1 1 1 0 1
FD
8 (B4)
1 1 1 1 1 1 1 0
FE


SPECIFICATIONS

Input Level
0.2-7V p-p
Input Impedance (POD10A/110)
110Ω balanced
Input Impedance (POD10A/75)
75Ω unbalanced
Output Level
3V p-p
Output Impedance (POD10A/110)
110Ω balanced
Output Impedance (POD10A/75)
75Ω unbalanced
Power Requirements
115 VAC,60Hz,12VA
230 VAC,50Hz, 6VA
Dimensions
221mm wide x 44mm high x 178mm deep
(8.69” wide x 1.73” high x 7.0” deep)
Weight
1.37 kg
(3.01 lbs)

Ward-Beck Systems Inc.reserves the right to change performance specifications without prior notice.
GPI Control Connections
for POD10A
(Available as Option)

1. Input1

2. Input 2

3. Input 3

4. Input 4

5. Input 5

6. Input 6

7. Input 7

8. Input 8

9. GND

WARRANTY

All Ward-Beck Systems Inc. products are warranted against defective materials and workmanship for a period of one year from the date of shipment. 

Ward-Beck Systems Inc. will repair or replace, at its option and without charge, all said products or parts thereof which upon factory inspection prove to be defective during the warranty period, provided that: 

The original serial numbers are intact and have not been tampered with.

The purchaser shall return any equipment or parts thereof to Ward­-Beck Systems Inc. only after obtaining prior authorization and shipping instructions from the factory. (Ward-Beck Systems Inc. reserves the right to inspect or repair equipment on the purchaser’s premises).

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
 "file": "Products/PODS/POD10A/2014 - POD10A - MANUAL (2).docx",
 "sha256": "81543164348f3bd7fd75d48fe8f57f662dbf9ae0e456353aced513f82ebdede0",
 "kind": "module",
 "models": [
  "POD10A"
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
