# 1994 - M901NW - 14-281-02-001 - SA14-281 - INPUT AMPLIFIER - ASSEMBLY.wp
Wiki page: [M901NW](../../../PAGES/M901NW.md)


- **Year:** 1994 (original file date 1994-10-27)
- **Module:** M901NW
- **Category:** UNSORTED
- **Module year estimate:** 1994 — original file date saved 1994-10-27: WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M901NW.WP
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M901NW.WP`
- **SHA-256:** `da17633613426824a20f10d7b0dc59e6716ad1589b9b399e2ce1623eeb925a72`
- **Size:** 70,448 bytes
- **Pages:** 1

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M901NW CUSTOM LINE INPUT MODULE


SECTION									PAGE	


Warranty

1	Technical Data						1-1
2	General							2-1 to 2-2
3	Operational Description					3-1 to 3-2
4	Circuit Description						4-1 to 4-3
5	Parts List							5-1 to 5-10
6	P1,P2 Connector Layouts					6-1 to 6-2

7	Drawings:
Front Panel Layout						A 940238-04-100
Schematic							B 901-02-006/1
Schematic							B 901-02-006/2
Schematic							B 901-02-006/3
Component Layout						B 901-06-006

ll)		Subassemby

A	SA14-281 Input Amplifier Assembly

1	Circuit Description						1-1
2	Parts List							2-1 to 2-5
3	Drawings:
Schematic							B 14-281-02-001
Component Layout						B 14-281-06-001
TECHNICAL DATA

M901NW CUSTOM LINE INPUT MODULE


Input Sensitivity:		-10 to +10 dBu. (ref. 600 ohm source).

Frequency Response:	+/-0.2 dB from 20 Hz to 20 kHz.
Measured at direct output.

Noise:			Greater than 80 dB below nominal operating level, with the attenuator set for 15 dB "in hand" ( 20 Hz to 20 kHz).

Harmonic Distortion:	Less than 0.01% from 20 Hz to 20 kHz at 10 dB above operating level.

Source Impedance:		600 ohms or less balanced.

Input Impedance:		30,000 ohms, balanced.

Output Impedance:		Less than  60 ohms at insert and direct outputs.

Load Impedance:		Greater than 10K balanced at insert and direct outputs.

Output Level:		-6 dBu  nominal, unbalanced.

Logic Input Levels:		
Logic 0: 	0 to +1.75 volts dc.	
Logic 1:	+3 to +24 volts dc.

External Control Output:	Open Collector.
Minimum Load Impedance:	600 ohms.
Maximum Load Current:	30 mA.
Maximum Supply Voltage:	+24 volts dc.
Saturated Collector Voltage:	+2 volts maximum at 30 mA load.

Power Requirements:	+/-23 volts dc, 150 mA.

Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:			1.5"  wide x 16.2" high x 6.6" deep.
(38 mm x 410 mm x 168 mm).

Weight:			700 grams. 
The M901NW is a custom M901C input module designed to provide dual stereo line level input facilities for the Renaissance series of radio consoles.

The input source selector allows two separate stereo inputs to be connected to the input module.  Each input has its own preamplifier, allowing individual gain trimming and common mode balancing of the discrete source inputs.

The sensitivity controls are front panel accessible and accommodate input source levels from -10 to +10 dBu.

The selected preamplifier output is routed to the module connector for the insertion of optional processing.

The cue bus assignment is directed from the insert return to the cue bus to allow pre-VCA monitoring of source material.

A direct left and right channel output is provided at the module connector. These direct feeds may be optionally used for multitrack applications or to feed the console mix-minus system.

The  module output is also assignable to any or all of four stereo program buses.

Two blind auxiliaries (one mono and one stereo) are also built into the M901NW. Both are pre-set to unity gain, and are assignable pre or post fader by appropriate placement of wire jumpers. The auxiliaries can be turned on and off in similar fashion.

A blind assignable monophonic post-VCA feed is assignable by a "Berg" jumper to the console mix minus bus.

Unitary control of most module functions is also available at the module connector for machine control as well as external control inputs.

Outgoing control signals are furnished as open collector paths to control common when activated.  Comprehensive internal module logic allows intelligent control of external machines, with all outgoing control signals following module source selection (source A or B).

A momentary closure to control common (through an open collector transistor), is provided when the module is turned on or off for both the A or B source.  This totals four independent outputs, one start and stop signal for both the A and B module sources.

An additional sustained closure to common is provided for both the A and B input sources.  This closure is active when the main channel is on, and is  provided for external use.  These outputs are also internally assignable to one or all of three internal console muting busses.  These busses run to the M905 monitor modules in the console system for muting the monitor speakers.

The internal buss structure of the console includes a cue control buss.  If a module is assigned to this buss, putting the module into cue will activate the auto cue function in the M905A control room monitor module.

A separate LED over the channel fader indicates when the channel has been turned on. Both lamps in the ON and OFF pushbuttons are connected to the edge connector for use as external tally indicators.

Module control inputs are also configured to activate when a closure to control common is provided.  The module can be turned on and off, the cue can be toggled, and the source can be selected between A and B by simply grounding the appropriate module connector pin.

Program buss assignment is also possible external to the module.  Again, a closure to control common will effect this assignment.  To change a previous buss assignment, the electronic latches require clearing before loading them with new buss assignments.  A closure to common will also perform this function.

External control of the VCA within each module is also brought out to the edge connector.  Application of a voltage between 0 and 5 volts DC will bring the attenuator from no external attenuation to full attenuation from the current fader position.  This feature can be of benefit for automated cross-fading.
The M901NW Stereo Line Input  module is packaged in a 1.5" wide x 16.2" high x 6.6" deep space.

This module derives its power from the console system bipolar +/-23 volt power supplies.
1)	Source "B" Select

Depressing this momentary switch (SW2), enables the "B" input source and disables the "A" input source selection (if it was selected).  Double pressing the active switch will cancel the selection.

2)	Source "A" Select

Depressing this momentary switch (SW1), enables the "A" input source and disables the "B" input source selection (if it was selected).  Double pressing the active switch will cancel the selection.  This source is selected automatically when power is supplied to the module.

3)	P3 Select

Switch SW14, a momentary switch with an electronic latch attached to it, controls the assignment of the module output to the program 3 stereo buss in the console.

4)	P1 Select

This electronically latched, momentary switch, (SW12), assigns the stereo audio signal to the program 1 stereo mix buss.  This assignment is performed automatically on module power-up.

5)	Q

This momentary electronic switch assigns the pre-fader signal to the console's stereo cue buss.  This provides a pre-fade listen feed for cueing.

6)	ON

This momentary switch enables the audio feeds to the console mixing busses,  and contains an externally accessible amp for machine tally purposes.


7)	OFF

This switch turns off the audio feeds from the console mixing busses, and contains an externally accessible lamp for machine tally purposes.

8)	Main channel fader

This 105mm Penny and Giles linear fader controls the main channel voltage controlled amplifiers.

9)	LED DS2 Illuminates whenever the channel has been turned on.

10)	P2 buss assignment switch

Switch SW14, a momentary switch with an electronic latch attached to it, controls the assignment of the module output to the program 2 stereo buss in the console.

11)	P4 buss assignment switch

Switch SW15 , a momentary switch with an electronic latch attached to it, controls the assignment of the module output to the program 4 stereo buss in the console.


12)	"A" source left channel sensitivity control

This front panel accessible screwdriver trim control allows adjustment of the input sensitivity of the left channel of the "A" source.

13)	"A" source right channel sensitivity 	
control

This front panel accessible screwdriver trim control allows adjustment of the input sensitivity of the right channel of the "A" source.



14)	"B" source left channel sensitivity control

This front panel accessible screwdriver trim control allows adjustment of the input sensitivity of the left channel of the "B" source.

15)	"B" source right channel sensitivity 	
control

This front panel accessible screwdriver trim control allows adjustment of the input sensitivity of the right channel of the "B" source.
Input and Preamplifier

The Input  and preamplifier section of the M901NW is contained on WBS plug on assembly SA14-281. Refer to drawing B14-281-02-001.

Source selection is controlled from the main circuit board, Refer to drawing B901-02-006/2.

Switches SW1 and SW2 are the electrically interlocked input selector switches. Depressing SW1 generates a negative going pulse at U13 pin 4. This directly sets section A of U14, a dual J-K flip-flop with preset and clear. This pulse also clears section B through CR9. This operation has resulted in the "A" source being selected and cancelling of the "B" source. Conversely, selecting "B" will cancel "A". An additional operation of the currently selected source will cancel it too. This OFF feature is not normally possible with mechanically inerlocked switches.

The active low logic outputs of U14 are coupled to the SA14-281 preamplifier assembly through connector 281P2 pin 1 (for source "B") and pin 2 for source "A".

The M901NW does not fully utilize all of the functionality of the SA14-281. The mode selection is set for normal stereo on the M901NW main board by R131 and R132. Otherwise, the SA14-281 operates normally.

Inserts

Two series-connected, unbalanced insert points are made available at P2, pins 12/14 and 11/13, operating at a nominal level of -6 dBu.

They allow insertion of ancillary processing equipment into the mixing channel signal path such as a compressor, equalizer or filter.

From the insert points, the signal is routed to U1 and U2, two voltage controlled amplifiers (VCA).  The insert return is also coupled to the cue bus switch (U11) and a pre-fade summing amplifier comprised of U3 and associated components.

VCA

The main channel VCA; U1 and U2 for left and right respectively, provide the main channel level function. An output class AB amplifier within the feedback loop of the amplifier ensures the bus summing resistors can be fed with consistent amplitude. The control voltage to the VCA is coupled from the control amplifier by R7, R8 and C4 for the left channel VCA and R20, R21 and C10 for the right channel. Unequal level balance between the left and right channel is factory trimmed with R23.

Program Outputs

The P1 through P4 bus assignments are activated by U5, U6, U7 and U8 . These CMOS analog switches are active when the bus has been assigned, the channel is turned on, and the fader is brought up from the infinity (∞) position.

Cue Channel

The cue signal originates from a bridging takeoff at the inputs to the channel VCA. The stereo feed is switched onto the cue bus by U11 section Bb and C. U11 is a CMOS analog switch.

Aux 1

Aux 1 is a mono auxiliary which can be assigned pre or post by clipping the appropriate jumper on the main circuit board.  The pre-VCA mono feed is generated by U3; while the post VCA mono feed is generated by U4 and associated components.

The feeds are routed to U9, CMOS analog switch which controls which feed (pre or post VCA) is connected to the bus summing resistor (R89), and bus control switch (U12 section A). The jumper for turning Aux 1 on is enabled, clipping it will turn the auxiliary off.

Aux 2

Aux 2 is the stereo auxiliary which can be assigned pre  or post VCA by clipping the appropriate jumper on the main circuit assembly. The pre-VCA audio is bridged across the insert return through C54, C55 and U10. The post-VCA audio is likewise coupled to U10 via C56 and C57. U10 acts as a voltage level CMOS analog switch, which selects the pre or post VCA feed to the bus summing resistors (R90 and R91). Analog switch U12 section Band C expresses the audio to the Aux 2 summing bus when the auxiliary has been turned on.

Control Logic

The control voltages required to operate the solid state switches and the VCA chips is detailed on schematic sheets B901-02-006/2 and B901-02-006/3.

Initial Reset

Diode CR24, CR26 and CR27 along with C79, C113 and R107 act as the main power on reset circuit. The slow charging of C79 and C113 by R107 holds the reset lines of U17, U14, U22 and U24 long enough to ensure that:

1) The channel is Off.
2) Cue is not selected.
3) P1 is assigned.
4) Source "A" is selected.
5) P2, P3 and P4 are no assigned.

Channel On

Momentary action of the Channel On Switch, SW4 produces a negative going pulse at U17 pin 2; presetting the A section of U17. Alternately an external ground applied at edge connector P2 pin 43 will produce the same effect.

Once the flip-flop is preset, it's output at pin 15 changes from 0 to 1. This enables the bus program switches, the VCA and the channel on open collector control output. Furthermore, Q10 will saturate and illuminate DS2, the channel on indicator.

The channel on logic also provides a momentary closure to control common. This is controlled by U19 and associated components. This closure is active for as long as the switch is closed, and is logically routed by the choice of source (A or B).

The timer reset bus runs throughout the console and is essentially a "wired or" circuit. Placing jumper link LK4 into position 1-2 will place a reset signal on the bus which will reset the console timer whenever the channel on button is pressed.

Channel Off

Momentary operation of the channel off switch SW3 or momentary grounding of the external channel off control input at P2-44 will result in a negative going pulse at U17 pin 3 and "clear" the A section of U17. Consequently Q9 will stop conducting, extinguishing DS2, the mute bus outputs are disabled, a pulse to the open collector off transistors is enabled, the buss assignment solid state switches are disabled and the channel VCA's are turned off.

Cue

The B section of U17 is used to control the solid state CUE switch, U11 section B and C. This flip flop will change state whenever SW5 is activated. Therefore, with each input pulse, the cue channel will alternate between on and off.

This state change can be brought about by two different methods: Momentary operation of the Cue switch SW5, or momentary closure of the external Cue control input at P2-41.

Cue channel status is indicated by DS15.

Cue Off

An additional feature ensures that the Cue Channel will always switch off whenever the mixing attenuator is moved into or out of the infinity (∞) position.

This control signal is generated by U18 and associated components. The closure (or opening) of the end of travel switch in the mixing attenuator generates a pulse at U18 pin 10 through U15 section B and D. The output produced at pin 4 of U18 will always be negative going. Diode CR28 passes this pulse to U17 pin 8 , thereby clearing the B section of U17 and disabling the cue circuit.

Module Tally Lamps

All of the bus alignment, source selection, and the cue pushbuttons have integral tally lamps. These LED's are run in a current mode, by a constant current source. Two such current sources are present in this module each furnishing approximately 20 mA for the illumination of the LED's.

One current source consists of Q40 and R195 through R197. The current is always running through either DS15 or Q38. When Q38 is on, the LED is short-circuited, and is therefore extinguished. 

Q38 is enabled when buffer transistor Q37 is turned on by a logic 1 (+6 volts) at tag Q at R189.

Since all of the LED's are in series, failure of an LED or a transistor open circuit will extinguish all of the LED's on the same current source.

Power Supply Decoupling

Power Supply Decoupling is provided by Q45 through Q48 and associated components. Transistors Q45 and Q46 act as darlington connected pass transistors for the positive 18 volts power supply.  A secondary decoupler for +6 volts consists of U27, a three terminal regulator and R237, R238 and C111.

Negative power supply decoupling is comprised of Q47, Q48 and associated components. Resistors R235 and R230 are fusing resistors which protect the module in the event of catastrophic faults.

ATT1	Fader			P&G	PG3210

C1	Capacitor		10 uF/25 V	ITT	10M25
C2  		"		56 pF	Philips	638-46569
C3		"		22 pF		"	638-10229
C4		"		0.33 uF/100 V	Sprague	2C20X7R334M050B
C5		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN	

C6		"		0.1 uF/100 V		"		"
C7		"		10 uF/25 V	ITT	10M25
C8  		"		56 pF	Philips	638-46569
C9		"		22 pF		"	638-10229
C10		"		0.33 uF/100 V	Sprague	2C20X7R334M050B

C11		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C12		"		0.1 uF/100 V		"		"
C13		"		4.7 uF/10 V	ITT	4.7M10
C14		"		4.7 uF/10 V		"		"
C15		"		22 pF	Philips	638-10229

C16		"		22 pF		"		"
C17		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C18		"		0.1 uF/100 V		"		"
C19		"		33 uF/10 V	ITT	33M10
C20 to C23		"		68 uF/10 V		"	68M10

C24		"		4.7 uF/10 V	ITT	4.7M10
C25		"		4.7 uF/10 V		"		"
C26		"		22 pF	Philips	638-10229
C27		"		22 pF		"		"
C28		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C29		"		0.1 uF/100 V		"		"
C30		"		10 uF/25 V	ITT	10M25
C31		"		10 uF/25 V		"		"
C32		"		10 uF/25 V		"		"
C33		"		10 uF/25 V		"		"

C34		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C35		"		10 uF/25 V	ITT	10M25
C36		"		10 uF/25 V		"		"
C37		"		10 uF/25 V		"		"
C38		"		10 uF/25 V		"		"
C39		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C40		"		10 uF/25 V	ITT	10M25
C41		"		10 uF/25 V		"		"
C42		"		10 uF/25 V		"		"
C43		"		10 uF/25 V		"		"

C44		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C45		"		10 uF/25 V	ITT	10M25
C46		"		10 uF/25 V		"		"
C47		"		10 uF/25 V		"		"
C48		"		10 uF/25 V		"		"

C49		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C50		"		33 uF/10 V	ITT	33M10
C51		"		33 uF/10 V		"		"
C52		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C53		"		0.1 uF/100 V		"		"

C54 to C59		"		33 uF/10 V	ITT	33M10
C60		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C61		"		0.1 uF/100 V		"		"
C62 to C67		"		10 uF/25 V	ITT	10M25

C68		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C69 to C71		"		10 uF/25 V	ITT	10M25
C72 to C78		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C79		"		47 uF/25 V	Philips	03556479
C80		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C81		"		0.1 uF/100 V		"		"
C82		"		1 uF/35  V	ITT	1M35
C83		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C84		"		10 uF/25 V	ITT	10M25
C85 to C95		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C96		"		SOT
C97		"		82 pF	Philips	58829
C98		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C99		"		82 pF	Philips	58829
C100		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C101		"		0.1 uF/100 V		"		"
C102		"		2.2 uF/20 V	ITT	2.2M20
C103		"		2.2 uF/20 V		"		"
C104		"		82 pF	Philips	58829
C105		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C106	Capacitor		22  uF/25  V	Siemens	85200
C107		"		22  uF/25  V		"		"
C108		"		47 uF/25 V	Philips	03556479
C109		"		22  uF/25  V	Siemens	85200
C110		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C111		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C112		"		1 uF/35 V	ITT	1M35
C113		"		47 uF/25 V	Philips	03556479
C114		"		delete

CR1 to CR15	Diode			National	1N4148
CR16		"				"	1N4003
CR17		"				"	1N4148
CR18		"				"	1N4003
CR19		"				"	1N4148

CR20		"				"	1N4003
CR21 	delete
CR22	Diode				"	1N4148
CR23		"				"	1N4003
CR24 to CR28		"				"	1N4148

CR29		"				"	1N4003
CR30		"				"	1N4148
CR31 to CR38		"				"	1N4003
CR39 to CR68		"				"	1N4148
CR69		"				"	1N4003

CR70	delete
CR71	Diode				"	1N4003
CR72 to CR80	delete
CR81 to CR82	Diode				"	1N4148

CR83	delete
CR84, CR85	Diode				"	1N4003

DS1	Lamp, Min Flange 24V	Spectro	387
DS2	Super-Right, Clear Red,T1-3/4	Liteon	LTL-4268-H4
DS3, DS4	LED, Yellow		H.P.	HLMP-1401
DS5, DS6	delete
DS7 to DS10	LED, Yellow		H.P.	HLMP-1401

DS11 to DS14	delete
DS15	LED, Yellow		H.P.	HLMP-1401
DS16	Lamp, Min Flange 24V	Spectro	387


LK1 - LK4	Connector, 3 Pin Male	Berg	929705-01-03
LK5, LK6	PCB Solder Link		
LK7- LK13	Connector, 3 Pin Male	Berg	929705-01-03
LK14- LK16	PCB Solder Link		

Q1	Transistor		National	2N3904
Q2		"				"	2N3906
Q3		"				"	2N3904
Q4		"				"	2N3906
Q5 to Q8		"				"	2N3904

Q9		"				"	2N3906
Q10 to Q12		"				"	2N3904
Q13		"				"	2N3906
Q14		"				"	2N3904

Q15		"				"	2N3906
Q16		"				"	2N3904
Q17		"				"	2N3906
Q18		"				"	2N3904
Q19		"				"	2N3906

Q20		"				"	2N3904
Q21		"				"	2N3906
Q22		"				"	2N3904
Q23		"				"	2N3906
Q24		"				"	2N3904

Q25 To Q36		"				"	delete
Q37		"				"	2N3906
Q38		"				"	2N3904
Q39		"				"	2N6731

Q40		"				"		"
Q41 to Q43		"				"	2N3906
Q44		"				"	delete
Q45		"				"	TIP29B
Q46		"				"	2N3904

Q47		"				"	2N3906
Q48		"				"	TIP30B

R1	Resistor	1/4W 5%	15K	Philips	CR25
R2	Potentiometer	500K	Piher	PT10V 500K
R3	Resistor	1/4W 5%	470K	Philips	CR25
R4		"		150K		"		"
R5		"		10M		"		"

R6	Potentiometer	100K	Piher	PT10V 100K
R7	Resistor	1/4W 1%	1K	Philips	MRS25F
R8		"		10K		"		"
R9		"	1/4W 5%	24K		"	CR25
R10		"		16K		"		"

R11		"		47		"		"
R12		"		16K		"		"
R13		"		47		"		"
R14		"		15K		"		"
R15	Potentiometer	500K	Piher	PT10V 500K

R16	Resistor	1/4W 5%	470K	Philips	CR25
R17		"		150K		"		"
R18		"		10M		"		"
R19	Potentiometer	100K	Piher	PT10V 100K
R20	Resistor	1/4W 1%	1K	Philips	MRS25F

R21		"		10K		"		"
R22		"	1/4W 5%	22K		"	CR25
R23	Potentiometer	5K	Piher	PT10V 5K
R24	Resistor	1/4W 5%	16K	Philips	CR25
R25		"		47		"		"

R26		"		16K		"		"
R27		"		47		"		"
R28		"		20K		"		"
R29		"		20K		"		"
R30		"		10K		"		"

R31		"		100K		"		"
R32		"		30		"		"
R33		"		30		"		"
R34				Jumpered
R35				Jumpered

R36				delete
R37	Resistor	1/4W 5%	20K	Philips	CR25
R38		"		20K		"		"
R39		"		10K		"		"
R40		"		100K		"		"

R41	Resistor	1/4W 1%	15K	Philips	MRS25F
R42		"		15K		"		"
R43		"	1/4W 5%	100K		"	CR25
R44		"		100K		"		"
R45		"		100K		"		"

R46	Resistor	1/4W 5%	100K	Philips	CR25
R47	Resistor	1/4W 1%	15K		"	MRS25F
R48		"		15K		"		"
R49 to R52		"	1/4W 5%	100K		"	CR25
R53		"	1/4W 1%	15K		"	MRS25F

R54		"	1/4W 1%	15K		"		"
R55 to R58		"	1/4W 5%	100K		"	CR25
R59		"	1/4W 1%	15K		"	MRS25F
R60		"		15K		"		"
R61 to R65		"	1/4W 5%	100K		"	CR25

R66				delete
R67	Resistor	1/4W 5%	10K	Philips	CR25
R68		"		10K		"		"
R69 to R74 		"		100K		"		"
R75		"		2K		"		"

R76		"		2K		"		"
R77				Jumpered
R78	Resistor	1/4W 5%	10K	Philips	CR25
R79		"		10K		"		"
R80		"	1/4W 1%	15K		"	MRS25F

R81		"		15K		"		"
R82		"		15K		"		"
R83 to R88		"	1/4W 5%	100K		"	CR25
R89		"	1/4W 1%	15K		"	MRS25F
R90		"		15K		"		"

R91		"		15K		"		"
R92 to R94		"	1/4W 5%	100K		"	CR25
R95	SIP Resistor Network 10K	Bourns	15-002
R96	Resistor	1/4W 5%	3K3	Philips	CR25
R97		"		39K		"		"

R98		"		3K3		"		"
R99		"		39K		"		"
R100	SIP Resistor Network 10K	Bourns	15-002
R101	Resistor	1/4W 5%	3K3	Philips	CR25
R102		"		39K		"		"

R103		"		3K3		"		"
R104		"		39K		"		"
R105		"		3K3		"		"
R106		"		39K		"		"

R107	Resistor	1/4W 5%	100K	Philips	CR25
R108		"		27K		"		"
R109		"		9K1		"		"
R110		"		100K		"		"
R111		"		47K		"		"

R112				delete
R113 to R116		"		15K		"		"
R117	SIP Resistor Network   4K7	Bourns	15-005
R118 to R121	Resistor	1/4W 5%	22K	Philips	CR25
R122		"		1K5		"		"

R123		"		15K		"		"
R124		"		4K7		"		"
R125		"		15K		"		"
R126 to R130				delete
R131,  R132		"		10K		"		"
R133	SIP Resistor Network    10K	Bourns	15-002
R134 	Resistor	1/4W 5%	3K3	Philips	CR25

R135		"		39K		"		"
R136		"		3K3		"		"
R137	SIP Resistor Network    10K	Bourns	15-002
R138 	Resistor	1/4W 5%	3K3	Philips	CR25
R139		"		3K3		"		"

R140		"		22K
R141		"		100K		"		"
R142		"		4K7		"		"
R143		"		22K
R144		"		22K

R145		"		100K		"		"
R146		"		4K7
R147		"		22K
R148		"		22K

R149		"		100K		"		"
R150		"		4K7
R151		"		22K
R152		"		22K
R153		"		100K		"		"

R154		"		4K7
R155		"		22K
R156		"		22K
R157		"		100K		"		"
R158		"		4K7


R159	Resistor	1/4W 5%	22K	Philips	CR25
R160		"		22K		"		"
R161		"		100K		"		"
R162		"		4K7		"		"
R163		"		22K		"		"

R164 to R187							delete
R188	Resistor	1/4W 5%	22K	Philips	CR25
R189		"		100K		"		"
R190		"		4K7		"		"
R191		"		22K		"		"

R192		"		20K		"		"
R193		"		4K7		"		"
R194		"	1/2W 5%	180		"	SFR25 HJ
R195	Resistor	1/4W 5%	20K	Philips	CR25
R196		"		4K7		"		"

R197		"	1/2W 5%	180		"	SFR25 HJ
R198		"	1/4W 5%	1K		"	CR25
R199		"		9K1		"		"
R200		"	1/4W 1%	10K		"	MRS25F
R201	Potentiometer	5K	Piher	PT10V 5K

R202	Resistor	1/4W 1%	47K5	Philips	MRS25F
R203		"		47K5		"		"
R204		"		4K7		"		"
R205		"		9K09		"		"
R206		"		499		"		"

R207		"		1K		"		"
R208		"		28K5		"		"
R209		"		20K		"		"
R210		"		13K		"		"
R211		"		9K09		"		"

R212		"		3K92		"		"
R213		"		10K		"		"
R214		"		13K		"		"
R215		"		10K		"		"
R216		"	1/4W 5%	33K	Philips	CR25

R217		"		47K		"		"
R218		"	1/4W 1%	47K5		"	MRS25F
R219		"		47K5		"		"
R220		"		47K5		"		"
R221	Potentiometer	5K	Piher	PT10V 5K

R222	Potentiometer	5K	Piher	PT10V 5K
R223	Resistor	1/4W1%	10K	Philips	MRS25F
R224 to R228				delete
R229		"	1/2W 5%	2.2		"	SFR25 HJ
R230		"	1/2W 5%	2.2		"		"

R231		"	1/4W 5%	11K		"	CR25
R232		"		120K		"		"
R233		"		11K		"		"
R234		"	1/2W 5%	2.2		"	SFR25 HJ
R235		"	1/2W 5%	2.2		"		"

R236		"	1/4W 5%	22		"	CR25
R237		"	1/4W 1%	931		"	MRS25F
R238		"		243		"		"
R239		"	1/4W 5%	39K		"	CR25
R240		"		39K		"		"

R241		"		39K		"		"
R242		"		10K		"		"
R243		"		10K		"		"
R244		"		10K		"		"
R245		"		100K		"		"

R246		"		SOT
R247  to R250				delete

SW1 to SW2	Switch			Licon	39-22100
SW3		"				"	325-0073
SW4		"				"	326-0071
SW5		"				"	39-22100	
SW6 to SW11							delete

SW12 to SW15	Switch			Licon	39-22100

U1	Integrated Circuit		Analog	SSM2018P
U2		"	"			"		"
U3 , U4		"	"		Signetics	NE5534N
U5 to U8		"	"			"	74HC4053
U9		"	"			"	DG	509A

U10		"	"			"		"
U11, U12		"	"			"	74HC4053
U13		"	"			"	74HC14N
U14		"	"			"	74HC76N
U15		"	"			"	74HC14N

U16	Integrated Circuit		Signetics	74HC00N
U17		"	"			"	74HC76N
U18		"	"			"	74HC221N
U19		"	"			"	74HC125N
U20		"	"			"	74HC125N

U21		"	"			"	74HC14N
U22		"	"			"	74HC76N
U23		"	"			"	74HC14N
U24		"	"			"	74HC76N
U25		"	"			"	LF353N

U26		"	"			"		"
U27		"	"			"	LM317LZ
U28, U29							delete



MISCELLANEOUS COMPONENTS



USED ON	DESCRIPTION		MFG	MFG PART­ NUMBER

PCB	Printed Circuit Board	WBS	14-279

U3, U4,	8 Pin Socket		Amp	640463-3
U25,U26

U13, U15,	14  Pin Socket		Amp	640357-3
U16,  U19,U20, U21, U23

U1,U2,	16  Pin Socket		Amp	640357-3
U5,U6, U7,	
U8, U9, U10
U11,U12,
U14, U17, U18, U22,U24

LK1-LK4,	Connector, 2P		Aptronics	929955-06
LK7-LK13

Q45, Q48	Heatsink			Aavid	577102
M901NW

CUSTOM LINE INPUT MODULE
Issue #1

MW94001/M901NW.WP
```

## Contents (JSON)

```json
{
 "file": "Modules/UNSORTED/M901NW/1994 - M901NW - 14-281-02-001 - SA14-281 - INPUT AMPLIFIER - ASSEMBLY.wp",
 "sha256": "da17633613426824a20f10d7b0dc59e6716ad1589b9b399e2ce1623eeb925a72",
 "kind": "module",
 "models": [
  "M901NW"
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
    }
   ],
   "modules": [
    "M901C",
    "M905A"
   ],
   "dates": [
    {
     "year": 2018,
     "kind": "year",
     "text": "2018"
    }
   ]
  }
 ]
}
```
