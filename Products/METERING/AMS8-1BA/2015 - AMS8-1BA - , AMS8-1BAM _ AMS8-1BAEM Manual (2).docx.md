# 2015 - AMS8-1BA - , AMS8-1BAM _ AMS8-1BAEM Manual (2).docx
Wiki page: [AMS8-1BA](../../../PAGES/AMS8-1BA.md)


- **Year:** 2015 (found in this file: "Mar.01 2015")
- **Module:** AMS8-1BA
- **Category:** METERING
- **Module year estimate:** 2015 — month "Mar.01 2015" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-1BA, AMS8-1BAM _ AMS8-1BAEM Manual(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/AMS8-1BA, AMS8-1BAM _ AMS8-1BAEM Manual.docx`
- **SHA-256:** `15307ec3a4af92287ff2a638f11ff4495991201eef21dd4bc788391c087e3e7d`
- **Size:** 519,072 bytes
- **Pages:** 1

## Dates found in this file

- **2015** (month): `Mar.01 2015` — …8 CHANNEL AUDIO MONITORING SYSTEM by Ward-Beck Systems Rev:Mar.01 2015 AMS8-1BA Multichannel Audio Monitor OPERATOR’S MANUAL CAUTI…

## Full text

### Page 1 (Word document)

```text
AMS8-1BA, AMS8-1BAM & AMS8-1BAEM
8 CHANNEL AUDIO MONITORING SYSTEM 






















by Ward-Beck Systems
Rev:Mar.01 2015




AMS8-1BA  Multichannel Audio Monitor

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

The AMS8-1BA mounts in a standard 19 inch rack and occupies one rack unit of space.

Connections to the unit are made on the rear panel.  Please refer to the rear panel layout diagram for details.

The AMS8-1BA is factory calibrated to operate at a nominal level of -20dBFS = 0.




Overview

The AMS8-1 is a compact one rack-unit aural and visual monitor designed to handle multi-channel format audio signals.  Eight PPM/VU LED bargraphs display signal activity, while a sophisticated four speaker system allows operators to listen, with great clarity, to the signal being monitored.

Inputs:

The AMS8-1 accepts four digital audio inputs, balanced via Phoenix™ 3-pin screw terminal pluggable connectors or unbalanced via BNC  connectors.  The four inputs may be PCM, Dolby E or AC3 or a combination of the three types.  An internal switcher will allow the unit to toggle between the bank of four balanced inputs and four unbalanced inputs.

An 3G/HD/SD SDI demuxer may be added to the unit.  The embedded audio can be PCM or Dolby E/AC3 encoded signals.

A reference input for DARS is provided.  Again, this may be balanced via Phoenix™ 3-pin screw terminal pluggable connectors or unbalanced via BNCs .

Outputs:

The unit is capable of providing an AES signal output that is a copy of the input signal if the input is a PCM signal, or a decoded AES signal group (eg. L, R, C, Lfe, LS, RS) if it is a Dolby signal.  The AES signals are provided as balanced or unbalanced signals on Phoenix™ pluggable terminals or BNCs respectively.  Additionally, an analog copy of the signals is also provided on a DB25 multi-pin connector.

Dolby metadata is provided on a DB9 connector. *

If the optional demux module is added, the unit will provide a reclocked output of the input signal and two outputs, which are copies of the demuxed audio signal.


* Dolby is only available if the optional Dolby function is installed.
 System Setup

To enter the system setup mode push and hold simultaneously the 1 / 2, 7 / 8 and the select rotary shaft encoder until you see the firmware version appear in the display.



2.x.x.x

This displays the firmware version installed in your AMS8-1BA.  

Vol

This setting is used to set the start up volume of the AMS8-1BA the settings range from mute to –60 to + 15 dBu.



O/P

This controls the 5.1 Analog Outputs on the DB25 to be either fixed +4 dBu out or variable to follow the volume control on the front panel.

Spkr

This setting either enables or disables the internal speakers.

Cal

This setting is used to change the reference level of the front panel meters.  You can select from -22, –20, -18, -16, -14, -12, or –10 dBfs.

AES

This setting decides if you are using the 110 Ohm or 75 Ohm AES/EBU inputs.

Ref

This setting allows you to choose the internal 48 kHz reference or the external reference on the 75 Ohm BNC or the 110 Ohm Phoenix Screw Terminal.

Mlti

When using the Multi pushbutton on the front panel to create a 5.1 downmix to Lt/Rt this determines if you use pairs 1, 2, 3 by selecting 1 or pairs 2, 3, 4 by selecting 2.

Dn

This setting allows you to disable or enable dialnorm.  Enabling dialnorm causes the AMS8-1BAEM to normalize the Dolby audio level to a value read from the metadata.  Dialnorm only applies to Dolby.

Out4

This setting allows AES/EBU output 4 to follow either the monitor or AES/EBU input 4.

Exit

This exits the system setup.
Operational Controls
FRONT PANEL DISPLAYS

Eight 22 segment LED bargraph meters display VU and Peak Program information simultaneously.  A reference LED (red) at the zero mark is continuously illuminated.  The ERR LED indicates an alarm. 

An eight-character dot-matrix display located above the SELECT and VOLUME controls  to display signal parameters and status information.  This display also assists the user in making input selections.

FRONT PANEL CONTROLS

There are eight illuminated pushbutton switches arranged in two rows of four.  The upper row of white buttons designated  MONITOR selects the source to be monitored. Buttons 1/2, 3/4, 5/6 and 7/8 select the appropriate displayed audio pair for monitoring.  The lower row has two grey buttons labelled L and R these allow monitoring of the left only or right only channels of the selected pair in a solo mode.  










        
If a Dolby signal is present the meter pair to which the Dolby signal is connected will go to full scale illumination.  In order to meter and monitor the Dolby signal the yellow Dolby button must be pressed.  The Dolby signal is always displayed as L on CH1, R on CH2, C on CH3, Lfe on CH4, Ls on CH5 and Rs on CH6.  CH7 and CH8 displays the auxiliary channels.  

To listen to the downmix  of the signals displayed on the first six channels press the yellow button designated MULTI.  The downmix of the these audio channels is structured to follow the formula defined by ATSC.  The proportions are as follows:

Lt = (1.0 * L) + (0.707 * C) – (0.707 * Ls) – (0.707 * Rs) 

Rt = (1.0 * R) + (0.707 * C) + (0.707 * Ls) + (0.707 * Rs) 

The two control knobs designated SELECT and VOLUME are rotary shaft encoders with integral push switches.  Input selection between Analog, AES, and groups 1/2 and 3/4 disembedded from  3G, HD or SD SDI signals is achieved by depressing the SELECT knob and scrolling through the sources.  The VOLUME button adjusts the listening level of the AMS8-1B’s speakers, depressing the VOLUME knob mutes the speakers to cancel the mute depress the VOLUME knob again.








AMS8-1BA CONNECTOR LAYOUTS











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
DB 25 male


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
 "file": "Products/METERING/AMS8-1BA/2015 - AMS8-1BA - , AMS8-1BAM _ AMS8-1BAEM Manual (2).docx",
 "sha256": "15307ec3a4af92287ff2a638f11ff4495991201eef21dd4bc788391c087e3e7d",
 "kind": "module",
 "models": [
  "AMS8-1BA"
 ],
 "year": 2015,
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
     "year": 2015,
     "kind": "month",
     "text": "Mar.01 2015"
    }
   ]
  }
 ]
}
```
