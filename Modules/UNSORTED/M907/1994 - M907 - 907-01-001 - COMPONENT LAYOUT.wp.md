# 1994 - M907 - 907-01-001 - COMPONENT LAYOUT.wp
Wiki page: [M907](../../../PAGES/M907.md)


- **Year:** 1994 (found in this file: "Issue #2 November 2, 1994")
- **Module:** M907
- **Category:** UNSORTED
- **Module year estimate:** 1994 — manual_issue "Issue #2 November 2, 1994" in WBSps Engineering from H drive-20261018T013433Z-1-002/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M907#2.WP
- **Original file:** `WBSps.env/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M907#2.WP`
- **SHA-256:** `557deec9a3dbe41bdc69c5f03c4bc17d17241efad8d4a39eaef4d15d3da06025`
- **Size:** 49,156 bytes
- **Pages:** 1

## Dates found in this file

- **1994** (manual_issue): `Issue #2 November 2, 1994` — …d optimum equipment performance. M907 SUMMING/OUTPUT MODULE Issue #2 November 2, 1994 MW94001/M907#2.WP…

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M907 SUMMING/OUTPUT MODULE


SECTION									PAGE	


Warranty

1	Technical Data						1-1
2	General							2-1
3	Operational Description					3-1
4	Circuit Description						4-1 to 4-2
5	Parts List							5-1 to 5-8
6	P1,P2 Connector Layouts					6-1 to 6-2

7	Drawings:
Front Panel Layout						A 907-04-002
Functional							B 907-01-001
Schematic							B 907-02-001
Component Layout						B 907-06-001
TECHNICAL DATA

M907 SUMMING/OUTPUT MODULE

(Note: 0 dBu = 0.774V rms)


Gain: (Bridging)		10 dB nominal, +14 dB +/-0.5 dB maximum in two steps. Trim control is provided.

Frequency Response:	+/-0.2 dB from 10 Hz to 20 kHz.

Dynamic Range:		110 dB.

Noise:			84 dB below +4 dBu nominal output level
(20 Hz to 30 kHz).

Harmonic Distortion:	Less than 0.01% from 20 Hz to 20 kHz at +27 dBu output.

Less than 0.02% from 20 Hz to 20 kHz at +27 dBm into one 600 ohm load.

Source Impedance:

Summing:			10,000 or 15,000 ohms, unbalanced.
Insert:			600 ohms or less, unbalanced.

Input Impedance:

Summing:			Less than 3 ohms.
Insert:			6500 ohms unbalanced.

Program Output Impedance:	60 ohms, balanced.

Load Impedance:		600  ohms or greater, balanced.

Output Level:		+4 dBu  nominal, +30 dBu maximum .
+27 dBm maximum.

Channel Separation:		80 dB or greater at 1 kHz.

Power Requirements:	+/-24 volts DC, 105 mA nominal.

Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:			1.5"  wide x 16.2" high x 6.6" deep.
(38 mm x 410 mm x 168 mm).

Weight:			425 grams (15 ounces).
GENERAL

M907 SUMMING/OUTPUT MODULE


The M907 is designed to receive up to five separate mixed feeds from the mixing busses of the Renaissance series of radio consoles.  The signals are independently processed and amplified to standard user configurable line levels.
The outputs of the M907 supply the main program output channels of the console system and provide bridging feeds for the monitoring section and metering sections of the console.
OPERATIONAL DESCRIPTION

M907 SUMMING/OUTPUT MODULE

Refer to drawing A 907-04-002


1)	A1 Level Adjust

The A1 level adjust trim control allows setup of the console output level to standard operating levels for the A1 amplifier chain.  This could be one of three busses from the console system: AUX 2 left, PGM 1 music left, or PGM 3 left.

2)	A2 Level Adjust

The A2 level adjust trim control allows setup of the console output level to standard operating levels for the A2 amplifier chain.  This could be one of three busses from the console system: AUX 2 right, PGM 1 music right, or PGM 3 right.

3)	A1+A2 Level Adjust

The A1+A2 level adjust trim control allows setup of the console output level for the sum of A1 and A2 outputs.  This provides a mono sum output.

4)	A3 Level Adjust

The A3 level adjust trim control allows setup of the console output level to standard operating levels for the A3 amplifier chain.  This could be one of three busses from the console system: PGM 1 voice left, PGM 2 left, and PGM 4 left.

5)	A4 Level Adjust

The A4 level adjust trim control allows setup of the console output level to standard operating levels for the A4 amplifier chain.  This could be one of three busses from the console system: PGM 1 voice right, PGM 2 right, and PGM 4 right.


6)	A3+A4 Level Adjust

The A3+A4 level adjust trim control allows setup of the console output level for the sum of A3 and A4 outputs.  This provides a mono sum output.

7)	A5 Level Adjust

The A5 level adjust trim control allows setup of the console output level to standard operating levels for the mono A5 amplifier chain.  This could be one of two busses from the console system; AUX 1 or MIX MINUS.
All channels operate in a similar fashion, so the following description refers to channel A1 only.

Input

The signal originating from the external mixing network enters the module at connector P1 pin 2.  The signal is routed through user programmable jumper LK5 and into the summing node of U1.  U2, along with capacitors C21, C22, C152, C153 and resistors R18, R19, R20, R21, and R22 form a 30 kHz low pass filter with a -40 dB per decade roll off characteristic.  The output of U2 provides a nominal level of -6 dBu at connector P2 pin 1.

Insert

An unbalanced insert point is provided between connector P2 pin 1 and P2 pin 2.  This permits the insertion of an external equalizer, limiter or compressor into the main program channel.

Level Adjustment

From the insert point, the signal is returned to the module and is coupled to level adjust potentiometer R24.  When the console is operated at operating levels of 0 dBu or +4 dBu, LK23 is shorted; for operation at +8 dBu, LK23 is opened.  Trimming the output level is done by adjusting R24 which is front panel accessible.

Output

Output of the module is balanced through amplifiers U3 and U4.  A 60 ohm output network provides two external stereo outputs for the console and a metering output for use by the console meter module (M909) and the monitor module (M905).  M907 channels A1 & A2 (and A3 & A4) are combined to provide a mono sum output through U9 and U10.  A single mono output is available for external use from the console system.

Power Supply

The power supply is decoupled through a passive decoupling circuit consisting of R1, R8, R153, R154 and C1, C6, C142, C143 for channel 1.  Nominal power supply voltage at the amplifiers is 22 volts.

Configurations

The M907 is designed to be a universal output amplifier for the Renaissance series of consoles. 
To this end, it is possible to assign a summing bus to a particular output channel with certain restrictions. Tabulating these combinations:


Program 1L Music to A1 	: LK 5 in position 1-2
Program 1R Music to A2 	: LK 7 in position 1-2
Program 1L Speech to A3	: LK 9 in position 1-2
Program 1R Speech to A4	: LK 13 in position 1-2

Program 2L to A3		: LK 10 in position 1-2
Program 2R to A4		: LK 14 in position 1-2

Program 3L to A1		: LK 6 in position 1-2
Program 3R to A2		: LK 8 in position 1-2

Program 4L toA3		: LK 11 in position 1-2
Program 4R to A4		: LK 15 in position 1-2

Mix Minus buss to A5	: LK 17 in position 1-2

Aux 1 to A5			: LK 18 in position 1-2

Aux 2L to A1		: LK 12 in position 1-2
Aux 2R to A2		: LK 16 in position 1-2


*****All unused links in this group must be left open.*****



Program 1 Speech/Music Option

In console systems where the Program 1 buss is split and used in both the music and speech mode, the M907 can be configured to provide a sum of the music and speech buss after the module insert point.  To do this, optional components R163, R164, R165, and R166 must be installed and printed circuit board links LK19, LK20, LK21, and LK22 must be cut.
Alignment

A signal at normal console operating level should be brought up on the console on the program 1 music buss, and a reference taken for both left and right channels.   Repeat this procedure for the speech buss, ensuring level equality.

User-configured links LK1, LK2, LK3, and LK4 are then installed in the 2-3 position.  The correct mix of speech into music and music into speech is then achieved by adjusting trimmers R163, R164, R165, and R166 to required system levels.
C1 To C14	Capacitor		22 uF/40 V	Philips	035.57229
C15		"		220 uF/10 V	ITT	220M010
C16		"		SOT
C17		"		22 pF	Philips	638-10229
C18		"		10 uF/35 V	ITT	10M35

C19		"		22 pF	Philips	638-10229
C20		"		10 uF/35 V	ITT	10M35
C21		"		1000 pF	Aselco	CQ92-MC-100-102M
C22		"		1000 pF		"		"
C23		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C24		"		47 pF	Philips	638-34479
C25		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C26		"		47 uF/20 V	ITT	47M20
C27		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C28		"		22 pF	Philips	638-10229

C29		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C30		"		47 pF	Philips	638-34479
C31		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C32		"		22 pF	Philips	638-10229
C33		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C34		"		100 pF	Philips	638-58101
C35		"		220 uF/10 V	ITT	220M010
C36		"		22 pF	Philips	638-10229
C37		"		10 uF/35 V	ITT	10M35
C38		"		22 pF	Philips	638-10229

C39		"		10 uF/35 V	ITT	10M35
C40		"		1000 pF	Aselco	CQ92-MC-100-102M
C41		"		1000 pF		"		"
C42		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C43		"		47 pF	Philips	638-34479

C44		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C45		"		47 uF/20 V	ITT	47M20
C46		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C47		"		22 pF	Philips	638-10229
C48		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C49	Capacitor		47 pF	Philips	638-34479
C50		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C51		"		22 pF	Philips	638-10229
C52		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C53		"		100 pF	Philips	638-58101

C54		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C55		"		22 pF	Philips	638-10229
C56		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C57		"		100 pF	Philips	638-58101
C58		"		47 pF	Philips	638-34479

C59		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C60		"		22 pF	Philips	638-10229
C61		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C62		"		100 pF	Philips	638-58101
C63		"		220 uF/10 V	ITT	220M010

C64		"		SOT
C65		"		22 pF	Philips	638-10229
C66		"		10 uF/35 V	ITT	10M35
C67		"		22 pF	Philips	638-10229
C68		"		10 uF/35 V	ITT	10M35

C69		"		1000 pF	Aselco	CQ92-MC-100-102M
C70		"		1000 pF		"		"
C71		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C72		"		47 pF	Philips	638-34479
C73		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C74		"		47 uF/20 V	ITT	47M20
C75		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C76		"		22 pF	Philips	638-10229
C77		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C78		"		47 pF	Philips	638-34479

C79		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C80		"		22 pF	Philips	638-10229
C81		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C82		"		100 pF	Philips	638-58101
C83		"		220 uF/10 V	ITT	220M010

C84		"		SOT
C85		"		22 pF	Philips	638-10229
C86		"		10 uF/35 V	ITT	10M35
C87		"		22 pF	Philips	638-10229
C88		"		10 uF/35 V	ITT	10M35
C89	Capacitor		1000 pF	Aselco	CQ92-MC-100-102M
C90		"		1000 pF		"		"
C91		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C92		"		47 pF	Philips	638-34479
C93		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C94		"		47 uF/20 V	ITT	47M20
C95		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C96		"		22 pF	Philips	638-10229
C97		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C98		"		47 pF	Philips	638-34479

C99		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C100		"		22 pF	Philips	638-10229
C101		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C102		"		100 pF	Philips	638-58101
C103		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C104		"		22 pF	Philips	638-10229
C105		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C106		"		100 pF	Philips	638-58101
C107		"		47 pF	Philips	638-34479
C108		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C109		"		22 pF	Philips	638-10229
C110		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C111		"		100 pF	Philips	638-58101
C112		"		220 uF/10 V	ITT	220M010
C113		"		22 pF	Philips	638-10229

C114		"		10 uF/35 V	ITT	10M35
C115		"		22 pF	Philips	638-10229
C116		"		10 uF/35 V	ITT	10M35
C117		"		1000 pF	Aselco	CQ92-MC-100-102M
C118		"		1000 pF		"		"

C119		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C120		"		47 pF	Philips	638-34479
C121		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C122		"		47 uF/20 V	ITT	47M20
C123		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C124	Capacitor		22 pF	Philips	638-10229
C125		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C126		"		47 pF	Philips	638-34479
C127		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C128		"		22 pF	Philips	638-10229

C129		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C130		"		100 pF	Philips	638-58101
C131		"		SOT
C132		"		10 uF/25 V	ITT	10M25
C133		"		10 uF/25 V		"		"

C134		"		68 uF/10 V	ITT	68M10
C135		"		68 uF/10 V		"		"
C136		"		68 uF/10 V		"		"
C137		"		68 uF/10 V		"		"
C138		"		68 uF/10 V		"		"

C139		"		10 uF/25 V	ITT	10M25
C140		"		10 uF/25 V		"		"
C141		"		SOT
C142 To C151		"		22 uF/40 V	Philips	035.57229

C152 To C161		"		SOT

CR1	Diode			Motrola	1N4003
CR2		"				"		"

LK1 To LK18	Connector,  3P, PCB,MT,Male	3M	929705-01-03
"	  2 Pin Jumper	Aptronics	929955-06

R1 To R14	Resistor	1/4W 5%	4.7 ohm	Philips	CR25
R15		"		100K		"		"
R16		"		SOT
R17		"	1/4W 1%	15K		"	MRS25 F
R18		"		6K19		"		"

R19		"		6K19		"		"
R20		"		8K25		"		"
R21		"		47K5		"		"
R22		"		8K25		"		"
R23		"	1/4W 5%	62K		"	CR25
R24	Potentiometer	5K	Piher	PT10H-5K
R25	Resistor	1/4W 5%	1K5	Philips	CR25
R26		"		6K8		"		"
R27		"		6K8		"		"
R28		"		30K		"		"

R29		"	1W 5%	30		"	PR37 J
R30		"		30		"		"
R31		"		30		"		"
R32		"	1/4W 1%	10K		"	MRS25 F
R33		"		10K		"		"

R34		"	1W 5%	30		"	PR37 J
R35		"		30		"		"
R36		"		30		"		"
R37		"	1/4W 5%	100K		"	CR25
R38		"		SOT		"		"

R39		"	1/4W 1%	15K		"	MRS25 F
R40		"		8K25		"		"
R41		"		6K19		"		"
R42		"		6K19		"		"
R43		"		47K5		"		"

R44		"		8K25		"		"
R45		"	1/4W 5%	62K		"	CR25
R46	Potentiometer	5K	Piher	PT10H-5K
R47	Resistor	1/4W 5%	1K5	Philips	CR25
R48		"		6K8		"		"

R49		"		6K8		"		"
R50		"		30K		"		"
R51		"	1W 5%	30		"	PR37 J
R52		"		30		"		"
R53		"		30		"		"

R54		"	1/4W 1%	10K		"	MRS25 F
R55		"		10K		"		"
R56		"	1W 5%	30		"	PR37 J
R57		"		30		"		"
R58		"		30		"		"

R59		"	1/4W 1%	10K		"	MRS25 F
R60		"		10K		"		"
R61		"	1/4W 5%	15K	Philips	CR25
R62		"		5K1		"		"
R63		"		620		"		"
R64	Potentiometer	5K	Piher	PT10H-5K
R65	Resistor	1/4W 5%	5K1	Philips	CR25
R66		"	1W 5%	30		"	PR37 J
R67		"		30		"		"
R68		"		5K1		"		"

R69		"	1W 5%	30		"	PR37 J
R70		"		30		"		"
R71		"	1/4W 1%	10K		"	MRS25 F
R72		"		10K		"		"
R73		"	1/4W 5%	100K		"	CR25

R74		"		 SOT	
R75		"	1/4W 1%	15K		"	MRS25 F
R76		"		6K19		"		"
R77		"		6K19		"		"
R78		"		8K25		"		"

R79		"		47K5		"		"
R80		"		8K25		"		"
R81		"	1/4W 5%	62K		"	CR25
R82	Potentiometer	5K	Piher	PT10H-5K
R83	Resistor	1/4W 5%	1K5	Philips	CR25

R84		"		6K8		"		"
R85		"		6K8		"		"
R86		"		30K		"		"
R87		"	1W 5%	30		"	PR37 J
R88		"		30		"		"

R89		"		30		"		"
R90		"	1/4W 1%	10K		"	MRS25 F
R91		"		10K		"		"
R92		"	1W 5%	30		"	PR37 J
R93		"		30		"		"

R94		"		30		"		"
R95		"	1/4W 5%	100K		"	CR25
R96		"		 SOT	
R97		"	1/4W 1%	15K		"	MRS25 F
R98		"		6K19		"		"

R99		"		6K19		"		"
R100		"		8K25		"		"
R101		"		47K5		"		"
R102		"		8K25		"		"
R103		"	1/4W 5%	62K		"	CR25
R104	Potentiometer	5K	Piher	PT10H-5K
R105	Resistor	1/4W 5%	1K5	Philips	CR25
R106		"		6K8		"		"
R107		"		6K8		"		"
R108		"		30K		"		"

R109		"	1W 5%	30		"	PR37 J
R110		"		30		"		"
R111		"		30		"		"
R112		"	1/4W 1%	10K		"	MRS25 F
R113		"		10K		"		"

R114		"	1W 5%	30		"	PR37 J
R115		"		30		"		"
R116		"		30		"		"
R117		"	1/4W 1%	10K		"	MRS25 F
R118		"		10K		"		"

R119		"	1/4W 5%	15K		"	CR25
R120		"		5K1		"		"
R121		"		620		"		"
R122	Potentiometer	5K	Piher	PT10H-5K
R123	Resistor	1/4W 5%	5K1	Philips	CR25

R124		"	1W 5%	30		"	PR37 J
R125		"		30		"		"
R126		"	1/4W 5%	5K1		"	CR25
R127		"	1W 5%	30		"	PR37 J
R128		"		30		"		"

R129		"	1/4W 1%	10K		"	MRS25 F
R130		"		10K		"		"
R131		"	1/4W 5%	100K		"	CR25
R132		"		 SOT		"		"
R133		"	1/4W 1%	15K		"	MRS25 F

R134		"		6K19		"		"
R135		"		6K19		"		"
R136		"		8K25		"		"
R137		"		47K5		"		"
R138		"		8K25		"		"

R139		"	1/4W 5%	62K		"	CR25
R140	Potentiometer	5K	Piher	PT10H-5K
R141	Resistor	1/4W 5%	1K5	Philips	CR25
R142		"		6K8		"		"
R143		"		30K		"		"

R144	Resistor	1W 5%	30	Philips	 PR37 J
R145		"		30		"		"
R146		"		30		"		"
R147		"	1/4W 1%	10K		"	MRS25 F
R148		"		10K		"		"

R149		"	1W 5%	30		"	PR37 J
R150		"		30		"		"
R151		"		30		"		"
R152		"		delete
R153 To R162	Resistor	1/4W 5%	10 		"	CR25

R163 To R166	Potentiometer	OPT	Piher	
R167 To R171	Resistor	1/4W 5%	SOT	Philips	CR25

U1 To U24	Integrated Circuit	National	NE5534N


MISCELLANEOUS COMPONENTS


USED ON	DESCRIPTION		MFG	MFG PART­ NUMBER

PCB	Printed Circuit Board	WBS	14-267

U1 To U24	8 Pin Socket		Amp	640463-3
WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance.

M907

SUMMING/OUTPUT MODULE
Issue #2
November 2, 1994
MW94001/M907#2.WP
```

## Contents (JSON)

```json
{
 "file": "Modules/UNSORTED/M907/1994 - M907 - 907-01-001 - COMPONENT LAYOUT.wp",
 "sha256": "557deec9a3dbe41bdc69c5f03c4bc17d17241efad8d4a39eaef4d15d3da06025",
 "kind": "module",
 "models": [
  "M907"
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
    "M909"
   ],
   "dates": [
    {
     "year": 1994,
     "kind": "manual_issue",
     "text": "Issue #2 November 2, 1994"
    }
   ]
  }
 ]
}
```
