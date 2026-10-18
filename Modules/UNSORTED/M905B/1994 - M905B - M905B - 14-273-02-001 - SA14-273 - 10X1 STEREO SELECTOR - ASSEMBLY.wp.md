# 1994 - M905B - M905B - 14-273-02-001 - SA14-273 - 10X1 STEREO SELECTOR - ASSEMBLY.wp
Wiki page: [M905B](../../../PAGES/M905B.md)


- **Year:** 1994 (original file date 1994-06-07)
- **Module:** M905B
- **Category:** UNSORTED
- **Module year estimate:** 1994 — original file date saved 1994-06-07: WBSps Engineering from H drive-20261018T013433Z-1-002/WBSps Engineering from H drive/WBSps - FA93001/M905B.DWG
- **Original file:** `WBSps.env/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M905B.WP`
- **SHA-256:** `84e144e3ad15853fc9fcd19834bdc5a24ce4c87efddd1b89bfa4652cabe6e937`
- **Size:** 62,847 bytes
- **Pages:** 1

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M905B STUDIO MONITOR MODULE


SECTION									PAGE	


Warranty

1	Technical Data						1-1
2	General							2-1
3	Operational Description					3-1
4	Circuit Description						4-1 to 4-2
5	Parts List							5-1 to 5-9
6	P1,P2 Connector Layouts					6-1 to 6-2

7	Drawings:
Front Panel Layout						A 905-04-005
Functional							B 905-01-003
Schematic							B 905-02-003/1
Schematic							B 905-02-003/2
Component Layout						B 905-06-002

ll)		Subassemby

A	SA14-273 10x1 Stereo Selector Assembly

1	General							1-1
2	Circuit Description						2-1 to 2-2
3	Parts List							3-1 to 3-4
4	Drawings:
Schematic							B 14-273-02-001
Component Layout						B 14-273-06-001
TECHNICAL DATA

M905B STUDIO MONITOR MODULE




Gain:				10 dB ±1 dB.

Frequency Response:		±0.2 dB from 20 Hz to 20 kHz.

Noise:				Less than 70 dB below nominal output with 10 dB "in hand" over 20 Hz to 20 kHz bandwidth.

Harmonic Distortion:		Less than 0.1% from 20 Hz to 20 kHz at 
+24 dBm output or less.

Source Impedance:			600 ohms or less, balanced / unbalanced.

Input Impedance:			Greater than 20k ohms balanced.
Greater than 4.5k ohms unbalanced.

Input Level:				+4 dBu balanced, -6 dBu unbalanced.

Output Level:			0 dBu, nominal.

Output Impedance:			60 ohms or less, balanced.

Channel Separation:			60 dB.

Crosspoint Attenuation:		75dB.

Power Requirements:		±24 volts DC, 150 mA.

Ambient Temperature:		0 to 50 degrees Celsius.

Dimensions:				1.5" wide x 16.2" high x 6.6" deep.
(38 mm x 410 mm x 168 mm)

Weight:				750 grams (26.5 oz.).
GENERAL

M905B STUDIO MONITOR MODULE


The M905B Studio Monitor Module provides the monitoring and talkback facility for two remote studios within the Renaissance Radio Console system.  Typically these would be used for a news booth and an announce booth with two headphone monitoring positions (in addition to a monitor speaker output).

The M905B is capable of selecting one of 10 stereo line level sources for monitoring in the remote studios.  All audio switching is realized within the module for muting and talkback using solid-state active switching (no relays are employed).  The source selection is tallied with an LED indicator which is integral to the pushbutton.

Each of the two studios controllable from the M905B has three level controls associated with it.  There is a control for the monitor speaker feed (Monitor Level), the announcer headset level (Announcer), and the guest headset level (Guest).

The Monitor Level can be muted by using the console muting buss structure.  Each studio is individually assignable to one of the three muting busses within the console.  Muting does not effect the Announce or Guest Headset feeds.  A front panel LED indicates when the associated studio has enabled the mute buss in the console.

An input is provided on the M905B for sending talkback audio to a selected studio (via a momentary pushbutton).  The tally lamp within the talkback button is uncommited and may be used for externally signalling the console operator from the remote location.  Enabling the talkback will shift a mono sum of the selected source to the left speaker of the studio (This level may be diminished with internal controls).  Talkback is then placed on the right channel of the monitor feed.

The Announcer may also have the talkback audio assigned to his headset in the same fashion as the monitor speakers.  Printed circuit board links provide this feature.

In all cases, the Guest Headset feed is unaffected by either muting or talkback operations.

The M905B may be used in place of an M905A monitor module.  However, the cue speaker will not function.  The Studio 1 Monitor and Announcer controls will effect the Control Room Monitor speakers and the console Headset Level respectively.  Please note that in this configuration, it will not be possible to drive low impedance headsets.

All outputs are actively balanced and are configured for a nominal output level of 0 dBu.

The M905B is packaged in the standard Renaissance modular package, 1.50" wide x 16.2" high x 6.6" deep.

The module derives it's power from the console system ±24 volts.
OPERATIONAL DESCRIPTION

M905B STUDIO MONITOR MODULE


1)	Designation Strip

Source selector designation strip. A plastic covered designation strip for the identification of selector sources.

2)	Studio 2 Announcer Headset Level

A stereo control which allows adjustment of the headset level of the announcer in Studio 2.

3)	Studio 2 Mute LED

A green LED which tallies the operation of the mute function for Studio 2.

4)	Studio 1 Announcer Headset Level

A stereo control which allows adjustment of the headset level of the announcer in Studio 1.

5)	Studio 1 Mute LED

A green LED which tallies the operation of the mute function for Studio 1.

6)	Talkback to Announcer 1 Pushbutton

This button enables the talkback path to the monitor speakers in Studio 1, and optionally, the Studio 1 Announcer Headset.

7)	Input Source Selector Switches

Ten electrically interlocked momentary switches which control the stereo solid state audio switches within the M905B.  These switches select the source that the M905B will provide to both Studio 1 and 2.  The active source selection is tallied via illumination within the active button.





8)	Studio 2 Guest Headset Level

A stereo control which allows adjustment of the headset level for the guest in Studio 2.

9)	Studio 2 Monitor Level

A stereo control which allows adjustment of the speaker monitor level in Studio 2.

10)	Studio 1 Guest Headset Level

A stereo control which allows adjustment of the headset level for the guest in Studio 1.

11)	Studio 1 Monitor Level

A stereo control which allows adjustment of the speaker monitor level in Studio 1.

12)	Talkback to Announcer 2 Pushbutton

This button enables the talkback path to the monitor speakers in Studio 2, and optionally, the Studio 2 Announcer Headset.
Inputs

The ten stereo inputs to the M905B Studio Monitor Module are brought into the module through edge card connector P1.

The inputs are coupled to the SA14-273 10x1 Stereo Selector Assembly through 273J3 and 273J3, where the switching function takes place.  Please refer to the subassembly section of this manual for a detailed description of this assembly.
The M905B has two signal paths that are identical, for both Studio 1 and Studio 2.  The description of circuit operation is the same for both studios.

Studio 1 Monitor Section

Please refer to schematic sheet B 905-02-003/1.

Studio 1 Monitor Outputs

The left output of the SA14-273 is coupled into the M905B through C1.  This signal is current switched through R3 by U1 in normal operational mode.  The left signal is then ac coupled into the summing node of U4A.  The right output of the SA14-273 is likewise coupled through C2, R8 and U2 into the summing node of U4B.  The outputs of U4 are connected to the front panel mounted Studio 1 monitor level control.  This signal can be muted by grounding the external mute pin of the module, or by assigning the appropriate muting buss to U5, the solid state audio switch, with LK1, LK2, and/or LK3.

The mute LED is lit whenever that state has been enabled, no matter the source.

Integrated circuit U6 provides a balanced signal for the Monitor Outputs capable of driving a 600 ohm load.


Talkback to Announcer

Depressing the front panel switch "Talkback to Announcer", causes the mode of the monitor speaker to change.  This switch places the sum of the SA14-273 outputs in the left channel of the monitor speakers, with diminished level based on the adjustment of R4 and R6.  The right channel receives the input audio that is present at the talkback input at edge connector P1-41.

The LED integral to SW11, Talkback to Announcer, can be illuminated by connecting P2-21 to ground.  This can be used to tally incoming talkback to the console cue system.


Studio 1 Announcer Output

The Announcer Output can be selected to be the same signal feed as the monitor speakers by placing LK4 and LK5 in position 1-2.  Alternately, with LK4 and LK5 in position 2-3, a clean stereo feed from the SA14-273 output is coupled to the headset level control R43.

The dual balancing amplifier consisting of U7 provides output drive to the announcer's headset position.


Studio 1 Guest Output

The guest headset position gets a clean feed from the SA14-273 selector outputs at all times.  This dual balancing amplifier consisting of U8 and all related components is schematically identical to the Announcer Output.  The level is front panel adjustable with dual potentiometer R60.

Power Supply Decoupling

The power supply for the M905B is decoupled from the console power buss by the active decoupler consisting of Q1 through Q6.  Q1 and Q2 are a darlington connected pass transistor for the positive power supply, while Q3 and Q4 perform the complementary function.

Capacitors C112 through C115 help to further smooth the power supply response.

A separate +6 volt power supply to drive the logic circuitry on the module is coupled down from the +18 volt supply by Q5 and Q6.

Fusing resistors R151 and R155 protect the module in the event of a catastrophic power supply fault.
C1	Capacitor	33 uF/10 V	ITT	33M10
C2  		"	33 uF/10 V		"		"
C3		"	33 uF/10 V		"		"
C4		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C5		"	0.1 uF/100 V		"		"

C6		"	10 uF/25 V	ITT	10M25
C7		"	10 uF/25 V		"		"
C8  		"	10 uF/25 V		"		"
C9		"	10 uF/25 V		"		"
C10		"	10 uF/25 V		"		"

C11		"	100 pF		Philips	638-03102
C12		"	22 pF			"	638-10229
C13		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C14		"	100 pF		Philips	638-03102
C15		"	22 pF			"	638-10229

C16		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C17		"	33 uF/10 V	ITT	33M10
C18 		"	33 uF/10 V		"		"
C19		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C20		"	10 uF/25 V	ITT	10M25

C21		"	100 pF		Philips	638-03102
C22		"	22 pF			"	638-10229
C23		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C24		"	100 pF		Philips	638-03102
C25		"	22 pF			"	638-10229

C26		"	10 uF/25 V	ITT	10M25
C27		"	100 pF		Philips	638-03102
C28		"	22 pF			"	638-10229
C29		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C30		"	100 pF		Philips	638-03102

C31		"	22 pF			"	638-10229
C32		"	33 uF/10 V	ITT	33M10
C33 		"	33 uF/10 V		"		"
C34		"	100 pF		Philips	638-03102
C35		"	22 pF			"	638-10229

C36		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C37		"	100 pF		Philips	638-03102
C38		"	22 pF			"	638-10229
C39		"	100 pF		Philips	638-03102
C40		"	22 pF			"	638-10229

C41	Capacitor	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C42		"	100 pF		Philips	638-03102
C43		"	22 pF			"	638-10229
C44		"	33 uF/10 V	ITT	33M10
C45 		"	33 uF/10 V		"		"

C46		"	100 pF		Philips	638-03102
C47		"	22 pF			"	638-10229
C48		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C49		"	100 pF		Philips	638-03102
C50		"	22 pF			"	638-10229

C51		"	100 pF			"	638-03102
C52		"	22 pF			"	638-10229
C53		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C54		"	100 pF		Philips	638-03102
C55		"	22 pF			"	638-10229

C56		"	33 uF/10 V	ITT	33M10
C57 		"	33 uF/10 V		"		"
C58 		"	33 uF/10 V		"		"
C59		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C60		"	0.1 uF/100 V		"		"

C61		"	10 uF/25 V	ITT	10M25
C62		"	10 uF/25 V		"		"
C63		"	10 uF/25 V		"		"
C64		"	10 uF/25 V		"		"
C65		"	10 uF/25 V		"		"

C66		"	100 pF		Philips	638-03102
C67		"	22 pF			"	638-10229
C68		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C69		"	100 pF		Philips	638-03102
C70		"	22 pF			"	638-10229

C71		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C72		"	33 uF/10 V	ITT	33M10
C73 		"	33 uF/10 V		"		"
C74		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C75		"	10 uF/25 V	ITT	10M25

C76		"	100 pF		Philips	638-03102
C77		"	22 pF			"	638-10229
C78		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C79		"	100 pF		Philips	638-03102
C80		"	22 pF			"	638-10229

C81	Capacitor	10 uF/25 V	ITT	10M25
C82		"	100 pF		Philips	638-03102
C83		"	22 pF			"	638-10229
C84		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C85		"	100 pF		Philips	638-03102

C86		"	22 pF			"	638-10229
C87		"	33 uF/10 V	ITT	33M10
C88 		"	33 uF/10 V		"		"
C89		"	100 pF		Philips	638-03102
C90		"	22 pF			"	638-10229

C91		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C92		"	100 pF		Philips	638-03102
C93		"	22 pF			"	638-10229
C94		"	100 pF			"	638-03102
C95		"	22 pF			"	638-10229

C96		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C97		"	100 pF		Philips	638-03102
C98		"	22 pF			"	638-10229
C99		"	33 uF/10 V	ITT	33M10
C100		"	33 uF/10 V		"		"

C101		"	100 pF		Philips	638-03102
C102		"	22 pF			"	638-10229
C103		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C104		"	100 pF		Philips	638-03102
C105		"	22 pF			"	638-10229

C106		"	100 pF			"	638-03102
C107		"	22 pF			"	638-10229
C108		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN	
C109		"	100 pF		Philips	638-03102
C110		"	22 pF			"	638-10229

C111		"	22 uF/25 V	Siemens	85200
C112		"	22 uF/25 V		"		"
C113		"	22 uF/25 V		"		"
C114		"	22 uF/25 V		"		"
C115		"	22 uF/25 V		"		"

CR1 to CR4	Diode			National	1N4148
CR5		"				"	1N4003
CR6		"				"		"


DS1-DS10	LED, Yellow		Siemens	HLMP1401
DS11,DS12	LED, Green			"	HLMP1501
DS13,DS14	LED, Green			"	FLV310

LK1-LK10	Connector, 3 Pin Male			?	929705-01-03

282P1,	Connector, 20 Pin		Berg	65645-120
282P2,282P3

282P4,282P5	Connector, 6 Pin 			"	65645-106

Q1	Transistor		National	TIP29B
Q2		"				"	2N3904
Q3		"				"	2N3906
Q4		"				"	TIP30B
Q5		"				"	2N3904
Q6		"				"	2N6731

R1	Resistor	1/4W 5%	100K	Philips	CR25
R2		"	"	100K		"		"
R3		"	"	15K		"		"
R4	Potentiometer	50K	Piher	PT10V 50K
R5	Resistor	1/4W 5%	30K	Philips	CR25

R6	Potentiometer	50K	Piher	PT10V 50K
R7	Resistor	1/4W 5%	30K	Philips	CR25
R8		"	"	15K		"		"
R9		"	"	100K		"		"
R10		"	"	4K7		"		"

R11		"	"	15K		"		"
R12		"	"	820		"		"
R13		"	"	15K		"		"
R14		"	"	15K		"		"
R15		"	"	15K		"		"

R16		"	"	15K		"		"
R17		"	"	15K		"		"
R18		"	"	220		"		"
R19		"	"	220		"		"
R20		"	"	27K		"		"

R21		"	"	27K		"		"
R22	Potentiometer	5K	Piher	10-072
R23	Resistor	1/4W 5%	15K	Philips	CR25
R24		"	"	15K		"		"
R25		"	"	15K		"		"

R26	Resistor	1/4W 5%	820	Philips	CR25
R27		"	"	15K		"		"
R28		"	"	220		"		"
R29		"	"	47K		"		"
R30		"	1/4W 1%	15K		"	MRS25F

R31		"	1/4W 5%	220		"	CR25
R32		"	1/4W 1%	15K		"	MRS25F
R33		"	1/4W 5%	30		"	CR25
R34		"	"	30		"		"
R35		"	"	15K		"		"

R36		"	"	220		"		"
R37		"	"	47K		"		"
R38		"	1/4W 1%	15K		"	MRS25F	
R39		"	1/4W 5%	220		"	CR25
R40		"	1/4W 1%	15K		"	MRS25F	

R41		"	1/4W 5%	30		"	CR25
R42		"	"	30		"		"
R43	Potentiometer	5K	Piher	10-072
R44	Resistor	1/4W 5%	15K	Philips	CR25
R45		"	"	220		"		"

R46		"	"	47K		"		"
R47		"	1/4W 1%	15K		"	MRS25F	
R48		"	1/4W 5%	220		"	CR25
R49		"	1/4W 1%	15K		"	MRS25F	
R50		"	1/4W 5%	30		"	CR25

R51		"	"	30		"		"	
R52		"	"	15K		"		"
R53		"	"	220		"		"
R54		"	"	47K		"		"
R55		"	1/4W 1%	15K		"	MRS25F	

R56		"	1/4W 5%	220		"	CR25
R57		"	1/4W 1%	15K		"	MRS25F	
R58		"	1/4W 5%	30		"	CR25
R59		"	"	30		"		"	
R60	Potentiometer	5K	Piher	10-072

R61	Resistor	1/4W 5%	15K	Philips	CR25
R62		"	"	220		"		"
R63		"	"	47K		"		"
R64		"	1/4W 1%	15K		"	MRS25F	
R65		"	1/4W 5%	220		"	CR25
R66	Resistor	1/4W 1%	15K	Philips	MRS25F	
R67		"	1/4W 5%	30		"	CR25
R68		"	"	30		"		"	
R69		"	"	15K		"		"
R70		"	"	220		"		"

R71		"	"	47K		"		"
R72		"	1/4W 1%	15K		"	MRS25F	
R73		"	1/4W 5%	220		"	CR25
R74		"	1/4W 1%	15K		"	MRS25F	
R75		"	1/4W 5%	30		"	CR25

R76		"	"	30		"		"	
R77		"	"	15K		"		"
R78	Potentiometer	50K	Piher	PT10V 50K
R79	Resistor	1/4W 5%	30K	Philips	CR25
R80	Potentiometer	50K	Piher	PT10V 50K

R81	Resistor	1/4W 5%	30K	Philips	CR25
R82		"	"	15K		"		"
R83		"	"	4K7		"		"
R84		"	"	15K		"		"
R85		"	"	820		"		"

R86		"	"	15K		"		"
R87		"	"	15K		"		"
R88		"	"	15K
R89		"	"	15K		"		"
R90		"	"	15K		"		"

R91		"	"	220		"		"
R92		"	"	220		"		"
R93		"	"	27K		"		"
R94		"	"	27K		"		"
R95	Potentiometer	5K	Piher	10-072

R96	Resustor	1/4W 5%	15K	Philips	CR25
R97		"	"	15K		"		"
R98		"	"	15K
R99		"	"	820		"		"
R100		"	"	15K		"		"

R101		"	"	220		"		"
R102		"	"	47K		"		"
R103		"	1/4W 1%	15K		"	MRS25F	
R104		"	1/4W 5%	220		"	CR25
R105		"	1/4W 1%	15K		"	MRS25F	

R106	Resistor	1/4W 5%	30	Philips	CR25
R107		"	"	30		"		"	
R108		"	"	15K		"		"
R109		"	"	220		"		"
R110		"	"	47K		"		"

R111		"	1/4W 1%	15K		"	MRS25F	
R112		"	1/4W 5%	220		"	CR25
R113		"	1/4W 1%	15K		"	MRS25F	
R114		"	1/4W 5%	30		"	CR25
R115		"	"	30		"		"	

R116	Potentiometer	5K	Piher	10-072
R117	Resustor	1/4W 5%	15K	Philips	CR25
R118		"	"	220		"		"
R119		"	"	47K
R120		"	1/4W 1%	15K		"	MRS25F	

R121		"	1/4W 5%	220		"	CR25
R122		"	1/4W 1%	15K		"	MRS25F	
R123		"	1/4W 5%	30		"	CR25
R124		"	"	30		"		"
R125		"	"	15K		"		"

R126		"	"	220		"		"
R127		"	"	47K		"		"
R128		"	1/4W 1%	15K		"	MRS25F	
R129		"	1/4W 5%	220		"	CR25
R130		"	1/4W 1%	15K		"	MRS25F	

R131		"	1/4W 5%	30		"	CR25
R132		"	"	30		"		"
R133	Potentiometer	5K	Piher	10-072
R134	Resustor	1/4W 5%	15K	Philips	CR25
R135		"	"	220		"		"

R136		"	"	47K
R137		"	1/4W 1%	15K		"	MRS25F	
R138		"	1/4W 5%	220		"	CR25
R139		"	1/4W 1%	15K		"	MRS25F	
R140		"	1/4W 5%	30		"	CR25

R141		"	"	30		"		"
R142		"	"	15K		"		"
R143		"	"	220		"		"
R144		"	"	47K		"		"
R145		"	1/4W 1%	15K		"	MRS25F	
R146	Resistor	1/4W 5%	220	Philips	CR25
R147		"	1/4W 1%	15K		"	MRS25F	
R148		"	1/4W 5%	30		"	CR25
R149		"	"	30		"		"
R150		"	"	2R2		"		"

R151		"	"	2R2		"		"
R152		"	"	47K		"		"
R153		"	"	390K		"		"
R154		"	"	47K		"		"
R155		"	"	10		"		"

R156		"	"	22		"		"
R157		"	"	15K		"		"
R158		"	"	9K1		"		"

SW1 to SW12	Switch			Licon	39-22100

U1	Integrated Circuit		National	74HC4053N
U2		"	"			"		"
U3		"	"			"	74HC14N
U4		"	"			"	LM833N
U5		"	"			"	74HC4053N

U6		"	"			"	LM837N
U7		"	"			"		"
U8		"	"			"		"
U9		"	"			"	74HC4053N
U10		"	"			"		"

U11		"	"			"	74HC14N
U12		"	"			"	LM833N
U13		"	"			"	74HC4053N
U14		"	"			"	LM837N
U15		"	"			"		"

U16		"	"			"	LM837N
PARTS LIST

M905B STUDIO MONITOR MODULE

MISCELLANEOUS COMPONENTS



USED ON		DESCRIPTION		MFG	MFG PART­ NUMBER

PCB		Printed Circuit Board	WBS	14-282

LK1-LK10		Jumper			Aptronics	929955-06

Q1-Q4		Heatsink		WBS	577102
Insulator			"	K4-58
Insulator			"	B51547F019

R22,R43,R60,
R95,R116,R133	Knob,  Black 10mm	Elma	021-2225
Cap, Black 10mm			"	040-1625


SW1-SW12		Socket, R/A pins		Licon	39-80002
Keycap, Black			"	80-390104

SW12		Socket, Straight Pin		"	39-80001

U4,U12		8 Pin Socket		Amp	640463-3

U3,U6-U8,	14  Pin Socket		Amp	640357-3
U11,  U14-U16

U1,U2,	16  Pin Socket		Amp	640358-3
U5,U9, U10,U13	

WBS recommends the use of replacement parts made by the specified manufactures for continued optimum equipment performance.
M905B

STUDIO MONITOR MODULE


MANUAL ISSUE #1


MW94001/M905B.WP
```

## Contents (JSON)

```json
{
 "file": "Modules/UNSORTED/M905B/1994 - M905B - M905B - 14-273-02-001 - SA14-273 - 10X1 STEREO SELECTOR - ASSEMBLY.wp",
 "sha256": "84e144e3ad15853fc9fcd19834bdc5a24ce4c87efddd1b89bfa4652cabe6e937",
 "kind": "module",
 "models": [
  "M905B"
 ],
 "year": 1994,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "TECHNICAL DATA",
     "kind": "specs"
    },
    {
     "heading": "DESCRIPTION",
     "kind": "general"
    }
   ],
   "modules": [
    "M905A"
   ]
  }
 ]
}
```
