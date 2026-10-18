# 2018 - AMS8-1CAM - Manual (2).docx
Wiki page: [AMS8-1CAM](../../../PAGES/AMS8-1CAM.md)


- **Year:** 2018 (found in this file: "Aug.13 2018")
- **Module:** AMS8-1CAM
- **Category:** METERING
- **Module year estimate:** 2018 — month "Aug.13 2018" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-1CAM Manual(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-1CAM Manual.docx`
- **SHA-256:** `e4e2c6424ee26087584ed86248d6b207309d2bc943339a97d743a8ee62ea0422`
- **Size:** 5,423,946 bytes
- **Pages:** 1

## Dates found in this file

- **2018** (month): `Aug.13 2018` — …8 CHANNEL AUDIO MONITORING SYSTEM by Ward-Beck Systems Rev:Aug.13 2018 REVISIONS August 13, 2018: The following manual has been re…
- **2018** (month): `August 13, 2018` — …ORING SYSTEM by Ward-Beck Systems Rev:Aug.13 2018 REVISIONS August 13, 2018: The following manual has been revised as of August 13, 201…
- **2018** (month): `August 13, 2018` — …ugust 13, 2018: The following manual has been revised as of August 13, 2018 to reflect hardware redesigns to the front and back panel.…
- **2018** (month): `August 2018` — …he unit. AMS8-1CAM CONNECTER LAYOUTS SPECIFICATIONS * As of August 2018, the Analog Audio output connector has been redesigned to b…

## Full text

### Page 1 (Word document)

```text
AMS8-1CAM
8 CHANNEL AUDIO MONITORING SYSTEM 














by Ward-Beck Systems
Rev:Aug.13 2018



REVISIONS

August 13, 2018: The following manual has been revised as of August 13, 2018 to reflect hardware redesigns to the front and back panel. Changes have been made to the input and control buttons on the front panel, and to the analog audio output connector and pinout on the rear panel. The analog audio output is now compatible with Ward-Beck’s QTP series of cabling and connecting products.
































AMS8-1CAM  Multichannel Audio Monitor

OPERATOR’S MANUAL

CAUTION

There are no user serviceable components in this unit.  Repairs and calibration should only be performed by factory trained personnel.

Removing the top cover of this unit will expose the user to potentially lethal AC voltages and will void the warranty.


Contact our Service department:

416 335 5999 or toll free 800 771 2556

Ward-Beck Systems Ltd. is not liable for improper installation or any misuse of this equipment.

Unpacking:

Please inspect the unit carefully to ensure that damage had not occurred during shipping.
Report any damage immediately to the factory, note if there is any obvious damage to the packaging.

A standard 3-pin disconnect IEC power cable is included.

Installation:

The AMS8-1CAM mounts in a standard 19 inch rack and occupies one rack unit of space.

Connections to the unit are made on the rear panel.  Please refer to the rear panel layout diagram for details.

The AMS8-1CAM is factory calibrated to operate at a nominal level of -20dBFS = 0 Vu.





Overview

The AMS8-1CAM is a compact one rack-unit aural and visual monitor designed to handle discrete AES/EBU and embedded audio signals. Eight PPM/VU LED bargraphs display signal activity, while a sophisticated four-speaker system allows operators to listen, with great clarity, to the signal being monitored.

Inputs:

The AMS8-1CAM accepts four digital audio inputs, 110 Ohm balanced via Phoenix™ 3-pin screw terminal pluggable connectors, or 75 Ohm unbalanced via BNC connectors. An internal switcher will allow the unit to toggle between the bank of four balanced inputs and four unbalanced inputs. The unit is also equipped with an 3G/HD/SD SDI demuxer to extract embedded audio signals from either an 3G, HD or SD signal.

A reference input for DARS is provided.  Again, this may be 110 Ohm balanced via Phoenix™ 3-pin screw terminal pluggable connectors or 75 Ohm unbalanced via BNCs .

Outputs:

The unit is capable of providing an AES signal output that is a copy of the input signal. The AES signals are provided as balanced or unbalanced signals on Phoenix™ pluggable terminals or BNCs respectively.  Additionally, an analog copy of the signals is also provided on a DB25 multi-pin connector.

The demux module will provide a reclocked output of the input signal and two outputs, which are copies of the demuxed audio signal.
 System Setup

To enter the system setup mode, push and hold simultaneously the 1 / 2, 7 / 8 and the select rotary shaft encoder. until you see the firmware version appear in the display.



2.x.x.x

This displays the firmware version installed in your AMS8-1BA.  

Vol

This setting is used to set the start up volume of the AMS8-1BA the settings range from mute to –60 to + 15 dBu.

O/P

This controls the 5.1 Analog Outputs on the DB25 to be either fixed +4 dBu out or variable to follow the volume control on the front panel.


Spkr

This setting either enables or disables the internal speakers.

Cal

This setting is used to change the reference level of the front panel meters.  You can select from -22, –20, -18, -16, -14, -12, or –10 dBfs. (Default: -20dBfs)

AES

This setting decides if you are using the 110 Ohm or 75 Ohm AES/EBU inputs. (Default: 75 Ohm inputs.)

Ref

This setting allows you to choose the internal 48 kHz reference or the external reference on the 75 Ohm BNC or the 110 Ohm Phoenix Screw Terminal.

Out4

This setting allows AES/EBU output 4 to follow either the monitor or AES/EBU input 4.

Exit

This exits the system setup.














Operational Controls

FRONT PANEL DISPLAYS

Eight 22 segment LED bargraph meters display VU and Peak Program information simultaneously.  A reference LED (red) at the zero mark is continuously illuminated.  The ERR LED indicates an alarm. 

An eight-character dot-matrix display located above the SELECT and VOLUME controls  to display signal parameters and status information.  This display also assists the user in making input selections.

FRONT PANEL CONTROLS

There are eight illuminated pushbutton switches arranged in two rows of four.  The upper row of white buttons designated MONITOR selects the source to be monitored. Buttons 1/2, 3/4, 5/6 and 7/8 select the appropriate displayed audio pair for monitoring.  The lower row has three grey buttons labelled AES and Embedded 1-8 and 9-16. These allow the user to select the type of signal they would like to monitor. Pushing the AES button routes the bank of either the 75 or 110 Ohm AES inputs to the meter for monitoring. Selecting the 75 or 110 Ohm bank of AES inputs is determined in the initial setup of the unit. The AMS8-1CAM has been shipped with the 75 Ohm AES bank already selected. Pushing the Embedded 1-8 buttons extracts the first 8 channels (2 groups) from an 3G/HD/SD-SDI signal. Pushing the Embedded 9-16 extracts the last 8 channels (2 groups) from a 3G/HD/SD-SDI signal. The lower row also has one yellow button labelled SUM; when pushed, this allows the operator to mix any of the four sources available on the meter by pressing the appropriate pair buttons from the top row of monitor sources.

The two control knobs designated SELECT and VOLUME are rotary shaft encoders with integral push switches.  The VOLUME button adjusts the listening level of the unit’s integral speakers. Depressing the VOLUME knob mutes the speakers. To cancel the mute, depress the VOLUME knob again. The SELECT rotary shaft encoder is used during the initial setup of the unit.









AMS8-1CAM CONNECTER LAYOUTS







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


HEADSET JACK

THD
¼ inch


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
 "file": "Products/METERING/AMS8-1CAM/2018 - AMS8-1CAM - Manual (2).docx",
 "sha256": "e4e2c6424ee26087584ed86248d6b207309d2bc943339a97d743a8ee62ea0422",
 "kind": "module",
 "models": [
  "AMS8-1CAM"
 ],
 "year": 2018,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "FRONT PANEL",
     "kind": "operation"
    },
    {
     "heading": "CONTROLS",
     "kind": "operation"
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
     "year": 2018,
     "kind": "month",
     "text": "Aug.13 2018"
    },
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
