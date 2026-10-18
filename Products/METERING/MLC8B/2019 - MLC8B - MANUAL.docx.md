# 2019 - MLC8B - MANUAL.docx
Wiki page: [MLC8B](../../../PAGES/MLC8B.md)


- **Year:** 2019 (found in this file: "Apr .25 2019")
- **Module:** MLC8B
- **Category:** METERING
- **Module year estimate:** 2019 — month "Apr .25 2019" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/MLC8B MANUAL.docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/MLC8B MANUAL.docx`
- **SHA-256:** `c0c72db4725768f7b8a6a47451874bda6beea83ba0aa704138c46235e2b5da93`
- **Size:** 2,770,084 bytes
- **Pages:** 1

## Dates found in this file

- **2019** (month): `Apr .25 2019` — …MLC8B MULTI-CHANNEL LEVEL CONTROL by Ward-Beck Systems Rev:Apr .25 2019 Unpacking: Please inspect the unit carefully to ensure that…

## Full text

### Page 1 (Word document)

```text
MLC8B 


MULTI-CHANNEL LEVEL CONTROL

















by Ward-Beck Systems
Rev:Apr .25 2019
Unpacking:

Please inspect the unit carefully to ensure that damage had not occurred during shipping.
Report any damage immediately to the factory, note if there is any obvious damage to the packaging.

The unit is supplied with a full complement of Phoenix ™ 3pin pluggable connectors installed in their mating sockets.  DB multi-pin type connectors and BNC connectors are not supplied.

A standard 3-pin disconnect IEC power cable is included.


Installation:

The MLC8B mounts in a standard 19 inch rack and occupies one rack unit of space.

Connections to the unit are made on the rear panel.  Please note that the 25-pin DB female connector labelled AUX 1 is used to connect the analog inputs while the 25-pin DB male connector labelled AUX 2 is used to connect the analog outputs.  The 9-pin DB female connector labelled SERIAL COMM is an RS422 control port for external control of the device and is typically connected to and MLC8BR REMOTE control panel.  Please refer to the rear panel layout diagram and the detailed connector diagram for connectors AUX1, AUX2 and SERIAL COMM.

The MLC8B is factory calibrated to operate at the nominal level of -20dBFS = 0.  The unit may be field calibrated for nominal levels of -18dBFS, -14dBFS or -12dBFS, please refer to the calibration table in this manual.

USING THE MLC8B

The MLC8B is designed to display the levels of multiple audio signals in a surround sound environment (5.1 + 2) and to provide acoustic mixing of these signals with an overall global level control.  Every effort has been made to make using the MLC8B as intuitive as possible.
 
All connections to the unit are made on the rear panel and all displays and operating controls are located on the front panel.

The MLC8B accepts AES, 110 Ohm, balanced audio signals, analog audio signals or AES audio signals embedded in a 3G, HD or SD SDI video stream. The operator must switch the input selector to the type of signal being controlled. To select the Group 3 and Group 4 signals from the SDI data stream for disembedding, the button labelled GR 3/4 must be selected. 

The push buttons labelled AES, ANALOG, SDI 1, SDI 2 and GR 3/4 in the cluster of five LED illuminated push buttons on the right-hand side allows the operator to select the input signal source.  The LED in the push button will illuminate to show the selection that had been made.  Please note that a mix of signal types can not be controlled simultaneously.

When the sixth button in the cluster, labelled ST MODE, is pushed inputs one through six (AES 1, 2 and 3) and (Analog 1, 2, and 3) are disconnected the seventh and eighth channels (AES4) and (Analog4) are switched to the inputs 1 and 2 controls.  This allows the operator to listen to the ST L and ST R on the L and R monitor speakers.  In the ST MODE the C, LFE, LS and RS controls are disabled. 

Eight bargraph displays on the left-hand side show the level of the incoming signal.  The factory setting for the bargraph meters is -20dBFS = 0.  Field calibration of the meter for other nominal levels is achieved by using DIP switches 3 and 4 on the rear panel. 

SW3

SW4

NOMINAL
Down

Down

-20dBFS
Down

Up

-18dBFS
Up

Down

-16dBFS
Up

Up

-12dBFS



The eight rotary level controls labelled L, R, C, LFE, LS, RS, ST L and ST R are used to adjust the level of the individual signals being fed to the output of the MLC8B.  These rotary controls are equipped with concentric array of LED indicators that show the proportionate value of the signal.  Each rotary control incorporates a push-push switch that instantly mutes that signal.  When muted the concentric LEDs extinguish except for the highest level LED which flashes to indicate the mute condition.  The MASTER level control adjusts over-all level of the proportional mix set by the eight individual level controls.  The MASTER level control also incorporates a push-push switch.  Activating this switch mutes all eight channels.

It is possible to store one preset proportionate mix in the MLC8B.  Once the correct mix is set up push and hold the AES and ANALOG selector buttons simultaneously until the level indicator LEDs flicker (approximately five seconds) and the mix will be stored.  To recall the setup press and hold the ST MODE button (approximately five seconds) until the level indicating LEDs flicker.

MLC8BR Remote Panel

The MLC8BR Remote Panel permits secondary control of the MLC8B from a remote location.  Controls and displays on the MLC8BR mimic those on the main unit and status changes can be effected from either location.

The MLC8BR mounts in a standard 19 inch rack and occupies one rack unit of space.  The unit is equipped with a single DB 9(M) connector for interfacing to the main MLC8B unit.

























MLC8B CONNECTOR LAYOUTS



AES CONNECTOR ASSIGNMENT







MLC8B INTERCONNECT CABLE




MLC8B FUNCTIONAL DIAGRAM



SPECIFICATIONS

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
DB 25 female


AES/EBU INPUTS

Impedance
110Ω transformer balanced
Level
0.2 to 7V p-p
Max Input
0 dbfs
Standard
AES31D-1995
Type
3 Pin Terminal Block


AES/EBU OUTPUTS

Impedance
110Ω transformer balanced
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
3 pin Terminal Block


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
 "file": "Products/METERING/MLC8B/2019 - MLC8B - MANUAL.docx",
 "sha256": "c0c72db4725768f7b8a6a47451874bda6beea83ba0aa704138c46235e2b5da93",
 "kind": "module",
 "models": [
  "MLC8B"
 ],
 "year": 2019,
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
     "year": 2019,
     "kind": "month",
     "text": "Apr .25 2019"
    }
   ]
  }
 ]
}
```
