# 2014 - 32ME - MANUAL (2).docx
Wiki page: [32ME](../../../PAGES/32ME.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** 32ME
- **Category:** METERING
- **Module year estimate:** 2014 — month "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/32ME MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/32ME MANUAL.docx`
- **SHA-256:** `83b119cd2143393335a11ea65a40e931a348349e53c57f50208016678a32ff88`
- **Size:** 1,835,494 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …IGH DENSITY 32 CHANNEL AUDIO METER by Ward-Beck Systems Rev:Oct.01 2014 Cautionary Information There are no user serviceable compon…

## Full text

### Page 1 (Word document)

```text
5t`32ME
HIGH DENSITY 32 CHANNEL AUDIO METER





by Ward-Beck Systems
Rev:Oct.01 2014
Cautionary Information

There are no user serviceable components in this unit.  Repairs and calibration should only be performed by factory trained personnel.
Removing the top cover of this unit will expose the user to potentially lethal AC voltages and will void the warranty.

Contact our Service Department:
416-335-5999 or toll free 800-771-2556

In Case of Problems

Should any problem arise with your unit, please contact the Ward-Beck Technical Support Department.  A Return Material Authorization number (RMA) will be issued to you, as well as specific shipping instructions, should you wish our factory to repair your unit.  If required, a temporary replacement unit will be made available at a nominal charge.  Any shipping costs incurred will be the responsibility of you, the customer.  All products shipped to you from Ward-Beck Systems Inc. will be shipped collect.  The Ward-Beck Technical Support Department will continue to provide advice on any product manufactured by Ward-Beck Systems, beyond the warranty period without charge, for the life time of the equipment. 
Chapter 1
Introduction

1.0
Features
Simultaneous visual monitoring of 32 audio channels within the MADI stream.  Audio is displayed on 32 tri-colored LED bar-graph meters.
User configurable option to monitor audio channels 1 to 32, or 33 to 64 within the MADI stream.
Single 75 Ohm BNC MADI (AES10) input and one low latency 75 Ohm BNC MADI loop-through
One multi-mode socket FDDI fiber MADI input/output.  Fiber MADI output is a low latency loop-through of the fiber input.(Single-Mode Fiber available upon request).
 Auto-detection of 56/64 channel and 48kHz/96kHz frame MADI modes.
Break-out of MADI audio available on 4x D-type 25 pin female connectors.  Audio is distributed as 16 AES (stereo pairs) channels.
Listen to any stereo pair within the MADI stream through TRS headset, or on left / right analog audio monitor outputs.
Chapter 2
Quick Setup and Installation Guide

The 32ME-MADI unit is a powerful device yet simple to operate and setup.  
Steps for setting up the 32ME-MADI unit are as follows:
The 32ME-MADI mounts in a standard 19 inch rack and occupies one rack unit of space.
Plug in AC power to the socket located at the rear of the unit.  Upon power up, the unit will display the current firmware version until the user presses the front control knob for the first time.  Push the control knob to exit the firmware version screen.
The 32ME-MADI unit accepts a MADI signal through both the BNC and fiber optic inputs.  If both BNC and fiber MADI inputs are used simultaneously, the unit will monitor the first signal it detects.  It is recommended that only one MADI input be used at any given time.  Connect the MADI input to the rear of the unit.
The expected sample rate of the embedded audio within the MADI stream must be assigned in the 32ME-MADI settings to ensure that the unit is accurately monitoring the incoming audio.  To do so, access the Sample Rate menu by pushing and holding down the control knob until the display displays “SR Sel”.  Rotate the knob to set the unit to match the desired sample rate of the incoming audio embedded within the MADI stream.
 ie. for an embedded audio sample rate of 48kHz choose option “30-50kHz”. 
 ie. for an embedded audio sample rate of 192kHz choose option “120-200k”
NOTE: The following step only applies when Sample Rate is set to “30-50kHz“.
The 32ME-MADI can visually monitor audio channels 1 to 32, or channels 33 to 64 within the MADI stream.  To change this setting, push the control knob until the display reads “Grp Sel”.  Rotate the knob to modify this setting.  
The unit is now setup and ready for monitoring.  For instructions on other configuration settings please refer to chapter 4 “Configuration Menu Settings”.  
Chapter 3
Front Panel Features and Rear Connections

This chapter provides detailed information on the features available on the front panel and descriptions of the rear panel inputs and outputs including pin-out diagrams.

Figure 3.1-1 32ME Front Panel Drawing
3.1
Front Panel User Interface
The following section lists and describes the features located on the front panel of the 32ME.  Figure 3.1-1 illustrates the location of each feature.


A) Audio Level Meters and Indicators
A silk is imposed onto the lens indicating the audio level, below and above the reference point, in dBFS.  The zero level, or red reference level LED indicates the -20 dBFS reference point.

B) SEL Indicator
SEL indicator is a visual indication of the currently selected audio pair being monitored.  The monitored audio is available on the rear analog audio monitor outputs and front panel TRS headset output.  The selected audio pair is indicated by an illuminated blue LED between bar-graph meters.
 
C) ERR Indicator
Located on the front of the unit are sixteen ERR LED indicators.  A single ERR LED is associated with each of the sixteen audio pairs respectively.  When illuminated, the red ERR LED indicates there is no audio data present within its respective audio pair.   

D) Audio Level Meters (1 to 32)
Thirty-two 22-segment tri-colored audio bar-graph meters with simultaneous PPM dot over VU, indicate the current audio levels.  Level displays are divided into groups of eight (four stereo pairs) to easily identify tracks.  The audio level bar-graphs indicate a level starting from -34dBFS to -6dBFS.

E) Character Display

Eight character alphanumeric display used to display menu and settings information.

F) User Control Knob
The user control knob allows the user to cycle through menus by pushing the knob, or modify settings by rotating the knob.

G) TRS Headset Jack
A TRS headset jack is available to listen to the selected audio pair being monitored.  The TRS output follows the selected audio pair indicated by the BLUE monitor select LED.  The TRS output volume can be adjusted through the volume setting.


H) Channel Number Indicators
Numbers are located across the face of the unit ranging from 1 to 32 and 33 to 64 which provide a visual indication of the bar-graph meter channel number.




Figure 3.2-1 32ME Rear Panel Drawing
3.2
Rear Panel Connections
The following section lists and describes the connections located on the rear panel of the 32ME.  Figure 3.2-1 illustrates the location of each connection. 


I) AC Power

AC power input.

J) MADI Audio Fiber Optic Input / Output
A fiber optic MADI (AES10) input and output are present on the rear of the unit.  The output is a low latency loop-through of the fiber optic MADI input.  If both BNC and fiber optic MADI signals are present simultaneously, the 32ME unit will process the first MADI input it detects.  It is recommended that the user does not use both fiber and BNC inputs simultaneously.  See technical specifications for further details.

K) MADI Audio 75 Ohm BNC Input / Output
A 75Ohm BNC MADI (AES10) input and output are present on the rear of the unit.  The output is a low latency loop-through of the 75Ohm BNC MADI input.  If both BNC and fibre optic MADI signals are present simultaneously, the 32ME unit will process the first MADI input it detects.  It is recommended that the user does not use both fiber and BNC inputs simultaneously.  See technical specifications for further details.

L) Analog Audio Monitor Output
A left and right channel analog audio monitor output is available on the rear of the 32ME unit.  The output is a balanced output with an impedance of 60 Ohms.  The physical interface is available on two phoenix 3 pin terminal blocks (left and right channels).  This analog monitor output follows the user selected audio pair indicated by the blue SEL LED.  Refer to Figure 3.2-2.
Figure 3.2-2  Analog Audio Output (3 Pin Phoenix Terminal Block)
M) AES Outputs
Sixteen AES outputs are available on the four female 25 pin D-sub connectors.  Refer to Table 3.2-1 for pin assignment information.
N) Sync LED Indicator
Two Sync LED indicators, next to each of the MADI inputs (1x BNC, 1x fiber), are present on the rear of the unit.  When the LED Sync indicator is illuminated, it indicates that a valid MADI signal is present, and the unit is monitoring MADI audio from the respective input.  
NOTE: If both MADI inputs are used simultaneously, only the input which detects valid MADI data first will illuminate.  It is recommended that the user does not use both BNC and fiber MADI inputs simultaneously.


DB-25 AES1-4

 
Output
Signal
Contact Designation
AES1
Shield
19

Return
6

Positive
18
AES2
Shield
5

Return
17

Positive
4
AES3
Shield
16

Return
3

Positive
15
AES4
Shield
2

Return
14

Positive
1


DB-25 AES5-8

 
Output
Signal
Contact Designation
AES5
Shield
19

Return
6

Positive
18
AES6
Shield
5

Return
17

Positive
4
AES7
Shield
16

Return
3

Positive
15
AES8
Shield
2

Return
14

Positive
1


DB-25 AES9-12

 
Output
Signal
Contact Designation
AES9
Shield
19

Return
6

Positive
18
AES10
Shield
5

Return
17

Positive
4
AES11
Shield
16

Return
3

Positive
15
AES12
Shield
2

Return
14

Positive
1


DB-25 AES13-16

 
Output
Signal
Contact Designation
AES13
Shield
19

Return
6

Positive
18
AES14
Shield
5

Return
17

Positive
4
AES15
Shield
16

Return
3

Positive
15
AES16
Shield
2

Return
14

Positive
1

Table 3.2-1  32ME Rear Female DB-25 Connector Output Pin AssignmentChapter 4
Configuration Menu Settings

This chapter provides instructions for accessing the configuration menu settings and details on each setting.
4.1
Accessing the Configuration Menu
The 32ME is designed to be simple to operate providing the user with 4 menu settings.  Toggle through each of the menu settings by pushing the user control knob.  Refer to figure 3.1-1 item “F” for the user control knob location.  Each setting can be modified by rotating the knob in either the clockwise or counter clockwise direction.  Refer to figure 4.1-1 for the menu tree.

Figure 4.1-1  32ME Menu Tree
4.2
Menu Description
Upon power up, the 32ME will display the current firmware version until the user pushes the control knob (location of control knob can be seen in figure 3.1-1 item F) for the first time.

Volume Menu
To access the volume menu, push the control knob until the character display displays “Volume”.   Rotate the control knob clockwise to increase the volume on the analog monitor output and TRS headset outputs.  Rotate the control knob counter clockwise to decrease the volume.  The volume control does not affect the levels on the 25 pin female D-sub AES outputs.
  
Monitor Select Menu
To access the monitor select menu, push the control knob until the character display displays “Mon Sel”.  Rotate the control knob clockwise or counter clockwise to select the audio pair to be monitored on the analog audio monitor output and TRS headset output.  The currently selected pair is indicated by the blue “SEL” LED.
Group Select Menu
NOTE: The Group Select option is only available if the input Sample Rate is set to    “30- 50kHz” within the Sample Rate select menu of the 32ME-MADI unit.
To access the group select menu, push the control knob until the character display displays “Grp Sel”.  Rotate the control knob clockwise or counter clockwise to select the desired audio channels to be displayed on the audio bar meters.  When the knob is rotated options include “ch 1-32” or “ch 33-64”.
The MADI audio specifications supports up to 64 channels of audio within the MADI stream (64 channels available when the embedded audio sample rate is 48kHz within the incoming MADI stream).  The 32ME unit displays 32 channels of audio simultaneously on the audio bar meters and allows the user to display audio channels 1 to 32, or channels 33 to 64 within the MADI stream.
Changes to the Group Select settings are stored into memory and recalled upon startup.  
Sample Rate Select Menu
To access the sample rate select menu, push and hold the control knob until the character display displays “SR Sel”.  Rotate the control knob clockwise or counter clockwise to change between settings “30-50kHz”, “60-100kHz” or “12-200kHz”.
This setting must match the sample rate of the embedded audio within the incoming MADI stream for accurate monitoring.  ie. for 48kHz audio, the sample rate must be set to “30-50kHz”.  For 192kHz audio, the sample rate must be set to “120-200k”.
Changes to the Sample Rate Select settings are stored into memory and recalled upon startup.


Chapter 5
Technical Specifications

This chapter provides the specifications for the 32ME unit.

5.1
Technical Details
The 32ME-MADI unit is designed to monitor a MADI (AES10) signal.  The unit will automatically detect 56 or 64 channel MADI mode and will automatically detect 48khz or 96kHz MADI frames.  

5.2
Specifications





AES Digital Audio


Output Voltage
3.02 V pk-pk

Output Impedance
110 Ohm Balanced

Number of AES outputs
16

Output Sample Rate
32kHz to 48kHz

Noise
Less than -100 dBFS

THD
Less than 0.001%

Max Output Cable Length
250 meters

I/O Connector Type
25 Pin D-type (Female)- Tascam AES59 Standard

Audio Output Format
AES3 / EBU




MADI Optical Input/Output


Standard
ISC/IEC 934-3

Wavelength
1310 nm

Multi-Mode
62.5/125 or 50/125

(Single-Mode available upon request)
I/O Connector
1 x SC-Socket FDDI (Input/Output)

Number of Optical Input/Output
1 input, 1 output




MADI Coaxial Input/Output


I/O Voltage
0.3 V to 0.6 V pk-pk

I/O Impedance
75 Ohm

I/O Connector Type
BNC

Number of Coaxial Input/Output
1 input, 1 output




MADI Input/Output Sample Rates
32 kHz to 192 kHz (+/- 12.5%) 

MADI formats
AES10, 48k / 96k Frame, 56 / 64 channel

Output Description
Low-latency re-clocked loop-through output copy of input




Analog Audio


Max Output
23.5 dBU

Output Impedance
60 Ohm balanced

Frequency Response
1.5 dBU from 20Hz to 20Khz

Noise
Less than -65 dBU

THD
less than 0.05%

Monitor Output Connector
3 pin Phoenix type terminal block (output)

Number of Monitor Output Connectors
2 output (L / R)

Headset
1/4" TRS (output)





Audio Level Bar Meter


Reference Indicator
0 Ref = - 20 dBFS

Range
-34 dBFS to -6 dBFS

Resolution
22 LED segments




SDI Digital Video: 32ME-SDI only


Input Level
0.8V p-p

Input Impedance
75 Ohm

Output Level
0.8V p-p

Output Impedance
75 Ohm

Data Rates
Per SMPTE 259M,292M,424M




General


Power
90-230VAC 50-60Hz

Dimensions
19"W x 1 3/4" H x 13" D (483 mm x 44 mm x 300 mm)















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
 "file": "Products/METERING/32ME/2014 - 32ME - MANUAL (2).docx",
 "sha256": "83b119cd2143393335a11ea65a40e931a348349e53c57f50208016678a32ff88",
 "kind": "module",
 "models": [
  "32ME"
 ],
 "year": 2014,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
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
