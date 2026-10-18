# 2018 - MLC8A - MANUAL.docx
Wiki page: [MLC8A](../../../PAGES/MLC8A.md)


- **Year:** 2018 (found in this file: "August 13, 2018")
- **Module:** MLC8A
- **Category:** METERING
- **Module year estimate:** 2018 — month "August 13, 2018" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/MLC8A MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/MLC8A MANUAL.docx`
- **SHA-256:** `cb3635dc2e60d45030b13982f5371bb47142c0ebc8535704ea539f8807b8ba4b`
- **Size:** 6,851,855 bytes
- **Pages:** 1

## Dates found in this file

- **2018** (month): `August 13, 2018` — …VEL CONTROL by Ward-Beck Systems Rev:Aug.13 20148 REVISIONS August 13, 2018: The following manual has been revised as of August 13, 201…
- **2018** (month): `August 13, 2018` — …ugust 13, 2018: The following manual has been revised as of August 13, 2018 to reflect hardware redesigns to the rear panel. Changes ha…
- **2018** (month): `August 2018` — …ASSIGNMENT MLC8A INTERCONNECT CABLE SPECIFICATIONS * As of August 2018, the Analog Audio output connector has been redesigned to b…

## Full text

### Page 1 (Word document)

```text
MLC8A 

MULTI-CHANNEL LEVEL CONTROL














by Ward-Beck Systems
Rev:Aug.13 20148
REVISIONS

August 13, 2018: The following manual has been revised as of August 13, 2018 to reflect hardware redesigns to the rear panel. Changes have been made to the analog audio output connector and pinout on the rear panel. The analog audio output is now compatible with Ward-Beck’s QTP series of cabling and connecting products.

-----

Unpacking:

Please inspect the unit carefully to ensure that damage had not occurred during shipping.
Report any damage immediately to the factory, note if there is any obvious damage to the packaging.

The unit is supplied with a full complement of Phoenix™ 3pin pluggable connectors installed in their mating sockets. DB multi-pin type connectors and BNC connectors are not supplied.

A standard 3-pin disconnect IEC power cable is included.


Installation:

The MLC8A mounts in a standard 19 inch rack and occupies one rack unit of space.

Connections to the unit are made on the rear panel. Please note that the 25-pin DB FEmale connector labelled AUX is used to connect the analog outputs. The 9-pin DB female connector labelled SERIAL COMM is an RS422 control port for connection to an external controlling device such as the MLC8R remote panel.  Please refer to the rear panel layout diagram and the detailed connector diagram for connectors AUX and SERIAL COMM.

The MLC8A is factory calibrated to operate at the nominal level of -20dBFS = 0.  Other operating nominal levels (such as -18, -14, -12 dBFS) may be set provided it is specified at the time of order. 








USING THE MLC8A

The MLC8A is designed to display the levels of multiple audio signals in a surround sound environment (5.1 + 2) and to provide acoustic mixing of these signals with overall global level control. 
 
All connections to the unit are made on the rear panel and all displays and operating controls are located on the front panel.

Eight bargraph displays on the left-hand side show the level of the incoming signal. The factory setting for the bargraph meters is -20dBFS = 0. The bargraphs display the incoming level of the 5.1+2 signals.

The MLC8A accepts, 75 Ohm, unbalanced, or 110 Ohm, balanced AES audio signals.  The operator must switch the input selector between the balanced and unbalanced AES signals.  The cluster of four LED illuminated push buttons labelled (PRESET) 1, 2, (MODE) 5.1 and ST in conjunction with the push-push control in the MASTER level control are used to make the input source selection. To make the selection, simultaneously depress PRESET 1, 2 and the MASTER knob until both PRESET 1 and 2 LEDs illuminate and release the buttons. Either the 5.1 or ST button will be illuminated.  5.1 represents 75 Ohms while ST represents 110 Ohms. Operating these buttons will toggle between the 75 and 110 Ohm AES sources connected to the MLC8A.
NOTE: The selection function will time out and the buttons will revert back to their normal function.

The eight rotary level controls labelled L, R, C, LFE, LS, RS, L and R are used to adjust the level of the individual signals being fed to the output of the MLC8A. These rotary controls are equipped with concentric array of LED indicators that show the proportionate value of the signal. Each rotary control incorporates a push-push switch that instantly mutes that signal. When muted the concentric LEDs extinguish except for the highest level LED which flashes to indicate the mute condition. The MASTER level control adjusts over-all level of the proportional mix set by the eight individual level controls. The MASTER level control also incorporates a push-push switch. Activating this switch mutes all eight channels. 

It is possible to store two proportionate mixes in the MLC8A. Once the desired mix is set push and hold a PRESET button until the concentric level indicator LEDs flicker, (approximately five seconds) and the mix will be stored under that button. To recall a setup press the appropriate PRESET the concentric level indicator LEDs flicker.

The 5.1 and ST MODE buttons allow toggling between full 5.1 and stereo only monitoring.  When the ST MODE button is pushed inputs one through six (AES 1, 2 and 3) are disconnected the seventh and eighth channels (AES4) are switched to the inputs 1 and 2 controls. This allows the operator to listen to the ST L and ST R on the L and R monitor speakers. In the ST mode the C, LFE, LS and RS controls are disabled. 
MLC8R Remote Panel

The MLC8R Remote Panel permits secondary control of the MLC8A from a remote location. Controls and displays on the MLC8R mimic those on the main unit and status changes can be effected from either location.

The MLC8R mounts in a standard 19 inch rack and occupies one rack unit of space.  The unit is equipped with a single DB 9(M) connector for interfacing to the main MLC8A unit.



    MLC8A CONNECTOR LAYOUTS













MLC8A CONNECTOR ASSIGNMENT





MLC8A INTERCONNECT CABLE



















SPECIFICATIONS
* As of August 2018, the Analog Audio output connector has been redesigned to be a DB25 female connector with Tascam pinout.

ANALOG OUTPUT

Frequency Response
1.5 dBu from 20Hz to 20kHz
Impedance
60Ω Balanced
Max Output
23.5 dBu
Noise
Less than -70 dBu
THD
Less than 0.05%
Connector Type
DB25 female*


AES/EBU INPUTS

Impedance
75Ω unbalanced & 110Ω transformer balanced
Level
0.2 to 7V p-p
Max Input
0 dbfs
Standard
AES31D-1995
Type
BNC Female & 3 Pin Terminal Block


AES/EBU OUTPUTS

Impedance
75Ω Unbalanced & 110Ω transformer balanced
Level
2.5V p-p terminated
Output
0 dbfs
Noise
Less than -100 dbfs
Standard
AES31D-1995
THD
Less than 0.001%
Type
BNC Female & 3 pin Terminal Block


MONITOR OUTPUT

Frequency Response
1.5 dBu from 20Hz to 20kHz
Impedance
60Ω balanced
Max Output
23.5 dBu
Noise
less than -70 dbfs
THD
Less than 0.05%
Connector Type
3 pin Terminal Block


POWER

Input
90-230 VAC,50-60 Hz


Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.

  
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
 "file": "Products/METERING/MLC8A/2018 - MLC8A - MANUAL.docx",
 "sha256": "cb3635dc2e60d45030b13982f5371bb47142c0ebc8535704ea539f8807b8ba4b",
 "kind": "module",
 "models": [
  "MLC8A"
 ],
 "year": 2018,
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
     "year": 2018,
     "kind": "month",
     "text": "August 13, 2018"
    },
    {
     "year": 2018,
     "kind": "month",
     "text": "August 13, 2018"
    },
    {
     "year": 2018,
     "kind": "month",
     "text": "August 2018"
    }
   ]
  }
 ]
}
```
