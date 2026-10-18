# 1995 - M901B - 14-280-02-001 - SA14-280 - INPUT AMPLIFIER - ASSEMBLY.wp
Wiki page: [M901B](../../../PAGES/M901B.md)


- **Year:** 1995 (found in this file: "Issue #4 September 21, 1995")
- **Module:** M901B
- **Category:** UNSORTED
- **Module year estimate:** 1994 — original file date saved 1994-06-29: WBSps Engineering from H drive-20261018T013433Z-1-002/WBSps Engineering from H drive/WBSps - FA93001/M901B.DWG
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M901B#4.WP`
- **SHA-256:** `bbe0deba00ccbcee9517f9e50d1131e1de3d2631e314a66a628f6c67f66659bb`
- **Size:** 96,770 bytes
- **Pages:** 1

## Dates found in this file

- **1995** (manual_issue): `Issue #4 September 21, 1995` — …inued optimum equipment performance. M901B MIC INPUT MODULE Issue #4 September 21, 1995 MW94001/M901B#4.WP…

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M901B MIC  INPUT MODULE


SECTION									PAGE	


Warranty

1	Technical Data							1-1
2	General								2-1 to 2-2
3	Operational Description						3-1 to 3-2
4	Circuit Description						4-1 to 4-3 
5	Parts List							5-1 to 5-12
6	P1,P2 Connector Layouts						6-1 to 6-2

7	Drawings:
Front Panel Layout						A 901-04-006
Functional							B 901-01-003
Schematic							B 901-02-009/1
Schematic							B 901-02-009/2
Schematic							B 901-02-009/3
Component Layout						B 901-06-009

ll)		Subassembly

A	SA14-280 Input Amplifier Assembly

1	Circuit Description						1-1
2	Parts List							2-1 to 2-3
3	Drawings:
Schematic							B 14-280-02-001
Component Layout						B 14-280-06-001

TECHNICAL DATA

M901B MIC INPUT MODULE


Input Sensitivity:		-70 to -30 dBm (ref. 150 ohm source).

Frequency Response:	+/-0.4 dB from 20 Hz to 20 kHz.
+/-0.2 dB from 30 Hz to 20 kHz.
Measured at direct output.

Noise:		Greater than 126 dB EIN (20 Hz to 20 kHz).

Harmonic Distortion:	Less than 0.2% from 20 Hz to -20 kHz
Less than 0.1% from 30 Hz to -20 kHz.
At 10 dB above nominal operating level.

Source Impedance:		150 ohms, balanced/ unbalanced.

Input Impedance:		1500 ohms, minimum.

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

Power Requirements:	+/-24 volts dc, 150 mA.

Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:		1.5"  wide x 16.2" high x 6.6" deep.
(38 mm x 410 mm x 168 mm).

Weight:		725 grams. 
The M901B provides the microphone input channel facility for the Renaissance series of radio consoles.

The input source selector allows two separate microphone inputs to be connected to the input module.  Each input has its own preamplifier, allowing individual gain trimming of the discrete source inputs.

The sensitivity controls are front panel accessible.  These continuously variable controls provide adjustment for input source levels from -60 to -30 dBu.  

The preamplifier outputs, once selected, appear at the module connector for the insertion of optional processing.

The cue buss feed is connected to the insert return line so that pre-fade listening of source material can take place before any input module level control.

Direct left and right channel outputs are provided at the module connector.  These direct feeds may be optionally used for multitrack applications or to feed the console mix-minus system.

The output from this module may be assigned to any or all of four stereo program busses.  These buss selectors are preceded by a centre detent panorama control, giving the operator the ability to pan the input source between the left and right channel of the console program outputs.

Two auxiliaries are also integral to the module.  Both are assignable individually pre or post VCA, and each auxiliary has it's own level control and on/off control.  

The module also contains a "blind assignable" monophonic post VCA buss output.  This buss may be utilized for use by the console mix-minus system.

Unitary control of most module functions is also available at the module connector for machine control as well as external control inputs.

Outgoing control signals are furnished as open collector paths to control common when activated.  Comprehensive internal module logic allows intelligent control of external machines, with all outgoing control signals following module source selection (source A or B).

A momentary closure to control common (through an open collector transistor), is provided when the module is turned on or off for both the A or B source.  This totals four independent outputs, one start and stop signal for both the A and B module sources.

An additional sustained closure to common is provided for both the A and B input sources.  This closure is active when the main channel is on, and is provided for external use.  These outputs are also internally assignable to one or all of three internal console muting busses.  These busses run to the M905 monitor modules in the console system for muting the monitor speakers.

The internal buss structure of the console also has a cue control buss.  If a module is assigned to this buss, putting the module into cue will activate the auto cue function in the M905A control room monitor module.

The lamp internal to the channel off button is uncommitted and is brought out on the module connector.  This is intended for utilization as a tally indicator for external machinery.

Module control inputs are also configured to activate when a closure to control common is provided.  The module can be turned on and off, the cue can be toggled, and the source can be selected between A and B by simply grounding the appropriate module connector pin.


Program buss assignment is also possible external to the module.  Again, a closure to control common will effect this assignment.  To change a previous buss assignment, the electronic latches require clearing before loading them with new buss assignments.  A closure to common will also perform this function.

External control of the VCA within each module is also brought out to the edge connector.  Application of a voltage between 0 and 5 volts DC will bring the attenuator from no external attenuation to full attenuation from the current fader position.  This feature can be of benefit for automated cross-fading.
The M901B Mic input module is packaged in a 1.5" wide x 16.2" high x 6.6" deep.

This module derives its power from the console system bipolar +/-24 volt power supplies.
1)	Source "B" Select

Depressing this momentary switch (SW2), enables the "B" input source and disables the "A" input source selection (if it was selected).  Double pressing the active switch will cancel the selection.

2)	Source "A" Select

Depressing this momentary switch (SW1), enables the "A" input source and disables the "B" input source selection (if it was selected).  Double pressing the active switch will cancel the selection.  This source is selected automatically when power is supplied to the module.

3)	P3 Select

Switch SW14, a momentary switch with an electronic latch attached to it, controls the assignment of the module output to the program 3 stereo buss in the console.

4)	P1 Select

This electronically latched, momentary switch, (SW12), assigns the stereo audio signal to the program 1 stereo mix buss.  This assignment is performed automatically on module power-up.

5)	Pan Control

This centre detent rotary control determines the level balance between the left and right stereo outputs which feed the console program buss assignment switches.

6)	AUX 1 prefade or post fade selection

Switch SW6 determines the source for the AUX 1 console output, either pre-VCA or post-VCA.  The switch is illuminated when depressed, indicating post-VCA selection.

7)	AUX 1 level control

This level control (R66), allows the adjustment of the level of the audio signal fed to the mono auxiliary buss.

8)	AUX 1 on/off

This alternate action switch (SW7), assigns the auxiliary signal to the console mono auxiliary mixing buss.

9)	Q

This momentary electronic switch assigns the pre fader signal to the console's stereo cue buss.  This provides a pre-fade listen feed for cueing.

10)	OFF

This switch turns off the audio feeds from the console mixing busses, and contains an externally accessible lamp for machine tally purposes.

11)	ON

This momentary switch enables the audio feeds to the console mixing busses.

12)	"B" source  sensitivity control

This front panel accessible screwdriver trim control allows adjustment of the input sensitivity of the "B" source. 

13)	"A" source sensitivity control

This front panel accessible screwdriver trim control allows adjustment of the input sensitivity of the  the "A" source.

14)	P4 buss assignment switch

Switch SW15, a momentary switch with an electronic latch attached to it, controls the assignment of the module output to the program 4 stereo buss in the console.

15)	P2 buss assignment switch

Switch SW14, a momentary switch with an electronic latch attached to it, controls the assignment of the module output to the program 2 stereo buss in the console.

16)	AUX 2 prefade or post fade selection

Switch SW8, determines the source for the AUX 2 console output, either pre-VCA or post-VCA. The switch is illuminated when depressed, indicating post-VCA selection.
17)	AUX 2 level control

This level control (R77), allows the adjustment of the level of the audio signal fed to the stereo auxiliary buss.

18)	AUX 2 on/off

This alternate action switch (SW9), assigns the auxiliary signal to the console stereo auxiliary mixing buss.

19)	Main channel fader

This 105mm Penny and Giles linear fader controls the main channel voltage controlled amplifiers.
Inputs

The M901B Mic Input Module is capable of selecting between two low-level microphone sources. The SA14-280 Input Amplifier Assembly provides the preamplification and source selection. Please refer to the subassembly section of the manual for a detailed circuit description of this assembly.

Control of the SA14-280 is provided on the M901B main circuit board.  Please refer to drawing B 901-02-003/2 for this description.

On power up, a reset circuit consisting of R107, C79, C113, and CR27 provides a momentary logic 0 (0 volts DC) to globally reset the logic circuitry on the module.  This signal provides the reset signal to U14 through CR13 and CR14.  U14 is a dual flip-flop that controls the source selection (source A or B).  On power up the A source is enabled and the B source is disabled.

Selection of the B source is enabled by closing SW2 to control common.  Switch bounce is eradicated by U13 sections E and F, a Schmidt trigger inverter.  This clean switching signal is coupled to the toggle input of U14, and via CR3, to the direct reset of the flip-flop for source A.  This connection provides electronic alternate action operation for the source selection.

By double switching the currently active switch, it too is disabled.  This allows disabling of both input sources, a function not normally available with a mechanically interlocked switch.

External A and B source selection is available at edge card connector P2 pins 26 and 25 respectively.  Selecting source A directly sets the flip flop for A on and resets the B flip flop to the off state.  Likewise, selecting source B directly resets the A input off.

Source selection is tallied via illumination in the associated pushbutton.  The lamp circuitry is reproduced on drawing number B 901-02-003/3.  Examining the B source tally lamp, a logic 0 at tag "B" on R141 turns Q13 on.  This transistor provides current to the base of transistor Q14, effectively shorting out DS3, preventing it from being illuminated.  A logic 1 at R141 disables Q13, as well as Q14.  This allows DS3 to illuminate.  The lamps are all run in series via a constant current source comprised of Q39, and R192 through R194.  This provides approximately 20 mA of current through the series LED string.  The illumination was handled in this fashion to maintain constant current consumption no matter the number of lamps on in a string.

Inserts

Two unbalanced inserts are provided, one for each channel; following the input selector.

Attenuator

The linear attenuator, ATT1 (on drawing  B901-02-003/3), controls two voltage controlled amplifiers (VCA), U1 and U2 and associated components (on audio schematic sheet B 901- 02-003/1).

Detailing U1's circuitry:  The unbalanced insert return is AC coupled to U1 via C1 and R1.  VCA U1 is configured as a non-inverting voltage controlled amplifier.  The gain of the amplifier is controlled by the voltage present at pin 11, which is bypassed to control common by C4 to damp any external sources of interference with this control signal.  Trim control R2 is used to trim the gain cell symmetry in the VCA so that signal distortion is minimized.  Trim control R6 is adjusted to null any feed through at the VCA output should the VCA control port be modulated.  Resistors R10 through R13, CR1 and CR2, and Q1 and Q2 are configured as a simple bipolar emitter follower that boosts the current output capability of U1.

The VCA control amplifier on sheet B 901-02-003/3 consisting of U25, U26 and associated components generates a piece-wise linear correction for the attenuation characteristic of U1 and U2.  This amplifier generates an overall pseudo-audio taper characteristic for the attenuator circuit.

Panorama Control

A centre detent Pan control, R36, provides panorama adjustment for the audio feeds going to the program buss assignment switches.

Buss Assignment

Solid state active buss assignments are performed by U5 through U8.  These switches are controlled by the control logic in the module, and are active when the channel is switched on, the fader is brought up from the infinity position, and the program has been assigned.

The Program 1 buss can be assigned by moving programming jumpers LK1 and LK2.  In the "1" position, the Program 1 feed is assigned to the program 1 music buss.  In the "3" position, the Program 1 feed is assigned to the voice buss.

The blind mix minus buss is assigned to the module output when LK3 is placed in the "1" position, and is active when the channel is turned on.

Auxiliary switching

The monophonic and dual monophonic auxiliaries; AUX 1 and AUX 2, are selectable pre or post VCA.  The pre and post VCA audio is summed with active summing amplifiers consisting of U3 and U4 respectively.  These summed feeds are coupled to U9, a four channel solid state multiplexer chip.  This determines whether the pre or post VCA signal is selected to the AUX 1 level control, R66.  The level output from R66 is coupled to the buss assignment switch, U12 pin 4.

The dual mono auxiliary; AUX 2, functions in a similar fashion, the exception being that channel and channel signals remain discrete.  The pre and post VCA selection is performed by U10.  The AUX 2 level control is R77.  Buss assignment is controlled by U12 at pin 14 and 15.

U12 is active when the Auxiliary is turned on from its associated switch.

Channel Control Logic

Channel On

Momentary operation of the channel on switch SW4, will produce a negative going pulse at U15 pin 13, resulting in directly setting one of the flip flops in U17.  Alternatively, a momentary closure of P2 pin 44 to ground will have the same effect.

Once the flip flop is preset, its output at pin 15 changes from logic 0 to logic 1.  This enables the VCA control amplifier, the Channel On lamp, and the program assignment buss controls (U21 and U23 sections C and D, and CR45 through CR50 and CR57 through 62).  

An open collector transistor, Q11 or Q12 is latched on, again depending on source selection, when the channel is on.  These outputs can be used for external muting and signalling functions and are capable of sinking 20 mA to control common.

A logical OR is realized with CR31 through CR33, and CR35 through CR37.  These OR gate inputs are assignable to the internal muting busses in the console through a series of user-programmable links; LK7 through LK12.  Notice that source A can mute a different buss configuration that source B.

Turning the channel on also causes a momentary low impedance path to ground to be enabled via an open collector transistor.  This is intended for machine control applications, and is logically steered to follow the input source selection.  Transistor Q5 through Q8 handle this task, and are capable of sinking 20 mA to control common.

Channel Off

Momentary operation of the Channel Off switch SW3, or momentary ground closure of the External Off control input at connector P2 pin 44 will result in a negative going pulse at U15 pin 13.  This results in a direct reset of the "A" section of flip-flop U17.  This produces a logic 0 at pin 15 of U17.  Consequently, the VCA amplifier is disabled, the buss switches are disabled, and the Channel On lamp is extinguished.

A momentary closure to control common via an open collector transistor which follows input source selection is available at module connector P2 pin 36 and P2 pin 35 for the A and B inputs respectively.

The lamp integral to the Channel Off switch is uncommitted and available at module connector P2 pins 45 and 46.  This can be used for external machine tally purposes (CD ready indicators, for example).

In addition to the normal channel pushbutton off, operated by the Channel Off function detailed above, the channel output is also disabled whenever the channel attenuator is moved to the infinite position (∞).  This disables the VCA control amplifier and the Program Buss switches.  However, the tally lamps for Channel On, muting controls and Buss assignment switches remain unaffected.

Cue

The B section of U17 is used to control the solid state cue switches.  The flip-flop will change state each time a negative going transition occurs at pin 5 of U15.  Consequently, with each input pulse, the Cue channel toggles on and off.

This alternate action can be invoked by either momentarily closing Cue switch SW5 (Q), or momentarily grounding of the external Cue control input at module connector P2 pin 41.

The status of the Cue channels is indicated by DS15, internal to SW5.

An additional feature ensures that the Cue channels are always switched off whenever the attenuator is moved into or away from the infinity position; regardless of the prior state of the Cue channels.  The control signal for this action is initiated by the change of state of the end of travel switch integral to the attenuator.  The resulting level change, is processed through U15, U16D, and U18.

The output produced at pin 4 of U10 will always be a negative going pulse of approximately 500 milliseconds duration.  Diode CR28 passes this pulse to U17 pin 8, which directly clears the cue section of the flip-flop, disabling the Cue channels.

All logic control inputs are buffered to guard against switch bounce and spurious noise.

Power Supply Decoupling

Please refer to drawing number B 901-02-003/3.

An active decoupling network consisting of Q45 through Q48, U27 and associated components decouple the incoming +24 volt power supply voltage down to +/-18 volts, -22 volts, and +6 volts for use in the module.  CR84 and CR85 prevent module damage in the event of power supply reversal.  The decoupling network drops the +/-24 volt power supply inputs down to a nominal +/-18 volts for use by the audio circuitry.  Additional decoupling to +6 volts is handled by U27, R236, and R237.  Integrated circuit U27 is an adjustable three terminal regulator set for 6 volts of output voltage for utilization by the logic circuitry within the module.  The -22 volt supply is utilized by the LED current source driver for the module indicators.
ATT1	Fader			P&G	PGF3210

C1	Capacitor	10 uF/25 V		ITT	10M25
C2  		"	56 pF		Philips	638-46569
C3		"	22 pF			"	638-10229
C4		"	0.33 uF/100 V	Sprague	2C20X7R334M050B
C5		"	0.1 uF/100 V		"	K104K20X7RFVBWN

C6		"	0.1 uF/100 V		"		"
C7		"	10 uF/25 V	ITT	10M25
C8  		"	56 pF		Philips	638-46569
C9		"	22 pF		Philips	638-10229
C10		"	0.33 uF/100 V	Sprague	2C20X7R334M050B

C11		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C12		"	0.1 uF/100 V		"		"
C13		"	4.7 uF/10 V	ITT	4.7M10
C14		"	4.7 uF/10 V		"		"
C15		"	22 pF		Philips	638-10229

C16		"	22 pF		"		"
C17		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C18		"	0.1 uF/100 V		"		"
C19		"	33 uF/10 V	ITT	33M10
C20 to C23		"	68 uF/10 V		"	68M10

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
C39	Capacitor	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C40		"	10 uF/25 V	ITT	10M25
C41		"	10 uF/25 V		"		"
C42		"	10 uF/25 V		"		"
C43		"	10 uF/25 V		"		"

C44		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C45		"	10 uF/25 V	ITT	10M25
C46		"	10 uF/25 V		"		"
C47		"	10 uF/25 V		"		"
C48		"	10 uF/25 V		"		"

C49		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C50		"	33 uF/10 V	ITT	33M10
C51		"	33 uF/10 V		"		"
C52		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C53		"	0.1 uF/100 V		"		"

C54 to C59		"	33 uF/10 V	ITT	33M10
C60		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C61		"	0.1 uF/100 V		"		"
C62 to C64		"	10 uF/25 V	ITT	10M25
C65 to C67		"	10 uF/25 V		"		"

C68		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C69 to C71		"	10 uF/25 V	ITT	10M25
C72 to C78		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C79		"	47 uF/25 V	Philips	03556479
C80		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C81		"	0.1 uF/100 V		"		"
C82		"	1 uF/35 V		ITT	1M35
C83		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C84		"	1 uF/35 V		ITT	1M35
C85 to C95		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C96		"	SOT
C97		"	82 pF		Philips	58829
C98		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C99		"	82 pF		Philips	58829
C100		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C101		"	0.1 uF/100 V		"		"
C102		"	2.2 uF/20 V	ITT	2.2M20
C103		"	2.2 uF/20 V		"		"
C104		"	82 pF		Philips	58829
C105		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C106	Capacitor	22  uF/25  V	Siemens	85200
C107		"	22  uF/25  V		"		"
C108		"	47 uF/25 V	Philips	03556479
C109		"	22  uF/25  V	Siemens	85200
C110		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C111		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C112		"		1 uF/35 V	ITT	1M35
C113		"		47 uF/25 V	Philips	03556479
C114 to C123		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

CR1 to CR6	Diode			National	1N4148
CR7							delete
CR8 to CR15		"				"	1N4148
CR16		"				"	1N4003
CR17		"				"	1N4148

CR18		"				"	1N4003
CR19		"				"	1N4148
CR20		"				"	1N4003
CR21		"				"	1N4148
CR22		"				"	1N4148

CR23		"				"	1N4003
CR24		"				"	1N4148
CR25		"				"	delete
CR26		"				"	1N4148
CR27		"				"	1N4148

CR28		"				"	1N4148
CR29		"				"	1N4003
CR30		"				"	1N4148
CR31 to CR38		"				"	1N4003
CR39 to CR42		"				"	1N4148

CR43							delete
CR44 to CR68		"				"	1N4148
CR69		"				"	1N4003
CR70		"				"	delete
CR71		"				"	1N4003

CR72		"				"	delete
CR73		"				"	delete
CR74		"				"	1N4148
CR75		"				"	delete
CR76		"				"	1N4148
CR77							delete
CR78	Diode			National	1N4148
CR79							delete
CR80 to CR82		"				"	1N4148
CR83							delete

CR84		"				"	1N4003
CR85		"				"		"
CR86 to CR92		"				"	1N4148

DS1	Lamp, Min Flange 24V	Spectro	387
DS2	Led-T1, 3/4 12V  Red	Densitron	T1 3/4R
DS3, DS4	Led, Yellow		H.P.	HLMP 1401
DS5	delete

DS6	delete
DS7 to DS15	Led, Yellow		H.P.	HLMP 1401

Q1	Transistor			National	2N3904
Q2		"				"	2N3906
Q3		"				"	2N3904
Q4		"				"	2N3906
Q5 to Q8		"				"	2N3904

Q9		"				"	2N3906
Q10		"				"	2N3904
Q11		"				"	2N6731
Q12		"				"	2N6731
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
Q25		"				"	delete
Q26		"				"	delete
Q27		"				"	delete
Q28							delete
Q29	Transistor			National	2N3906
Q30		"				"	2N3904
Q31		"				"	2N3906
Q32		"				"	2N3904

Q33		"				"	2N3906
Q34		"				"	2N3904
Q35		"				"	2N3906
Q36		"				"	2N3904
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
Q49							delete

Q50							delete

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

R21	Resistor	1/4W 1%	10K	Philips	MRS25F
R22		"	1/4W 5%	22K		"	CR25
R23	Potentiometer	5K	Piher	PT10V 5K
R24	Resistor	1/4W 5%	16K	Philips	CR25
R25		"		47		"		"

R26	Resistor	1/4W 5%	16K	Philips	CR25
R27		"		47		"		"
R28		"		20K		"		"
R29		"		20K		"		"
R30		"		10K		"		"

R31		"		100K		"		"
R32		"		30		"		"
R33		"		30		"		"
R34		"		750		"		"
R35		"		750		"		"

R36	Potentiometer	10K	Clarostat	10-075
R37	Resistor	1/4W 5%	20K	Philips	CR25
R38		"		20K		"		"
R39		"		10K		"		"
R40		"		100K		"		"

R41	Resistor	1/4W 1%	10K	Philips	MRS25F
R42		"		10K		"		"
R43		"	1/4W 5%	100K		"	CR25
R44		"		100K		"		"
R45		"		100K		"		"

R46	Resistor	1/4W 5%	100K	Philips	CR25
R47	Resistor	1/4W 1%	10K		"	MRS25F
R48		"		10K		"		"
R49 to R52		"	1/4W 5%	100K		"	CR25
R53		"	1/4W 1%	10K		"	MRS25F

R54		"		10K		"		"
R55 to R58		"	1/4W 5%	100K		"	CR25
R59		"	1/4W 1%	10K		"	MRS25F
R60		"		10K		"		"
R61 to R65	Resistor	1/4W 5%	100K	Philips	CR25
R66	Potentiometer	5K	Clarostat	10-073
R67	Resistor	1/4W 5%	10K	Philips	CR25
R68		"		10K		"		"
R69 to R74 		"		100K		"		"

R75		"		delete
R76		"		delete
R77	Potentiometer	5K	Clarostat	10-072
R78	Resistor	1/4W 5%	10K	Philips	CR25
R79		"		10K		"		"

R80		"	1/4W 1%	15K		"	MRS25F
R81	Resistor	1/4W 1%	15K	Philips	MRS25F
R82		"		15K		"		"
R83 to R88		"	1/4W 5%	100K		"	CR25
R89		"	1/4W 1%	15K		"	MRS25F

R90		"		15K		"		"
R91		"		15K		"		"
R92 to R94		"	1/4W 5%	100K		"	CR25
R95	SIP Resistor Network 10K	Bourns	15-002
R96	Resistor	1/4W 5%	3K3	Philips	CR25

R97		"		39K		"		"
R98	Resistor	1/4W 5%	3K3	Philips	CR25
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
R111		"		10K		"		"

R112				delete
R113 to R116		"		15K		"		"
R117	SIP Resistor Network    10K	Bourns	15-002
R118 to R121	Resistor	1/4W 5%	22K	Philips	CR25
R122	Resistor	1/4W 5%	620	Philips	CR25
R123		"		15K		"		"
R124		"		delete				
R125		"		15K		"		"
R126				delete

R127		"		10K		"		"
R128	Resistor	1/4W 5%	10K	Philips	CR25
R129		"		10K		"		"
R130		"		10K		"		"
R131		"		delete

R132		"		delete
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
R143	Resistor	1/4W 5%	22K	Philips	CR25
R144		"		22K
R145		"		100K		"		"
R146		"		4K7

R147		"		22K
R148	Resistor	1/4W 5%	22K	Philips	CR25
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
R161	Resistor	1/4W 5%	100K	Philips	CR25
R162		"		4K7		"		"
R163		"		22K		"		"
R164		"		delete
R165		"		delete	

R166		"		delete	
R167		"		delete	
R168		"		delete	
R169		"		delete	
R170		"		delete	

R171		"		delete	
R172	Resistor	1/4W 5%	22K	Philips	CR25
R173	Resistor	1/4W 5%	100K	Philips	CR25
R174		"		4K7		"		"
R175		"		22K		"		"

R176		"		22K		"		"
R177		"		100K		"		"
R178		"		4K7		"		"
R179		"		22K		"		"
R180		"		22K		"		"

R181		"		100K		"		"
R182		"		4K7		"		"
R183	Resistor	1/4W 5%	22K	Philips	CR25
R184		"		22K		"		"
R185		"		100K		"		"

R186		"		4K7		"		"
R187		"		22K		"		"
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
R199	Resistor	1/4W 5%	9K1	Philips	CR25
R200	Resistor	1/4W 1%	10K	Philips	MRS25F
R201	Potentiometer	5K	Piher	PT10V 5K
R202	Resistor	1/4W 1%	47K5	Philips	MRS25F
R203		"		47K5		"		"
R204		"		4K75		"		"

R205		"		9K09		"		"
R206		"		499		"		"
R207		"		1K		"		"
R208	Resistor	1/4W 5%	28K7	Philips	CR25
R209		"	1/4W 1%	28K7		"	MRS25F

R210		"	1/4W 5%	13K		"	CR25
R211		"	1/4W 1%	8K25		"	MRS25F
R212		"		3K92		"		"
R213	Resistor	1/4W 1%	10K	Philips	MRS25F
R214		"		13K		"		"

R215		"		10K		"		"
R216		"	1/4W 5%	33K	Philips	CR25
R217		"		47K		"		"
R218		"	1/4W 1%	47K5		"	MRS25F
R219		"		47K5		"		"

R220		"		47K5		"		"
R221		"	1/4W 5%	4K7		"	CR25
R222		"		620		"		"
R223	Resistor	1/4W 1%	10K	Philips	MRS25F
R224 to R228		"		delete

R229		"	1/2W 5%	2.2		"	SFR25 HJ
R230		"	1/2W 5%	10		"	SFR25 HJ
R231		"	1/4W 5%	11K		"	CR25
R232	Resistor	1/4W 5%	120K	Philips	CR25
R233		"		11K		"		"

R234		"	1/2W 5%	2.2		"	SFR25 HJ
R235		"	1/2W 5%	10		"		"
R236		"	1/4W 5%	22		"	CR25

R237		"	1/4W 1%	931		"	MRS25F
R238		"		243		"		"
R239		"	1/4W 5%	39K	Philips	CR25
R240		"		39K		"		"
R241		"		39K		"		"


R242	Resistor	1/4W 5%	10K	Philips	CR25
R243		"		10K		"		"
R244		"		10K		"		"
R245		"		100K		"		"
R246		"		SOT

R247  to R250	"		delete	
R251	Potentiometer	5K	Piher	PT10V-5K
R252	Resistor	1/4W 5%	39K	Philips	CR25
R253		"		39K		"		"
R254		"		10K		"		"

R255		"		3K3		"		"
R256		"		39K		"		"
R257		"		39K		"		"
R258		"		39K		"		"
R259		"		10K		"		"

R260		"		3K3		"		"
R253		"		39K		"		"
R261		"		39K		"		"
R262	SIP Resistor Network	10K	Bourns	15-002
R263		"	"	39K		"	15-014

R264	Resistor	1/4W 5%	10K	Philips	CR25
R265		"		3K3		"		"
R266		"		39K		"		"
R267 To R272		"		3K3		"		"

SW1 to SW2		Switch			Licon	39-22100
SW3			"			"	325-0073
SW4			"			"	326-0071
SW5			"			"	39-22100
SW6 to SW9			"			"	39-23100

SW10 to SW11		"			"	delete
SW12 to SW15		"			"	39-22100

U1	Integrated Circuit		Analog	SSM2018P
U2		"	"			"		"
U3 to U4		"	"		Signetics	NE5534N
U5 to U8		"	"			"	74HC4053
U9		"	"			"	DG509A

U10		"	"			"		"
U11to U12		"	"			"	74HC4053
U13	Integrated Circuit		Signetics	74HC14N
U14		"	"			"	74HC74N
U15		"	"			"	74HC14N
U16		"	"			"	74HC00N

U17		"	"			"	74HC74N
U18		"	"			"	74HC123
U19		"	"			"	74HC125
U20		"	"			"	74HC125N
U21		"	"			"	74HC14N

U22		"	"			"	74HC74N
U23		"	"			"	74HC14N
U24		"	"			"	74HC74N
U25		"	"			"	LF353N
U26		"	"			"		"

U27		"	"			"	LM317LZ
U28		"	"			"	delete
U29 to U31		"	"			"	74HC14N

MISCELLANEOUS COMPONENTS


USED ON	DESCRIPTION		MFG	MFG PART­ NUMBER

PCB	Printed Circuit Board		WBS	14-299

U3, U4,	8 Pin Socket		Amp	640463-3
U25,U26

U13 To U24,	14  Pin Socket		Amp	640357-3
U29 To U31

U1,U2,	16  Pin Socket		Amp	640358-3
U5 to U12	

Connector,  3  Pin PCB, Mt Male	Berg	929705-01-03
"	4 Pin 			"	65645-104

"	20 Pin			"	65645-120
"	2 Pin		Aptronics	929955-06


WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance.
M901B

MIC INPUT MODULE
Issue #4
September 21, 1995
MW94001/M901B#4.WP
```

## Contents (JSON)

```json
{
 "file": "Modules/UNSORTED/M901B/1995 - M901B - 14-280-02-001 - SA14-280 - INPUT AMPLIFIER - ASSEMBLY.wp",
 "sha256": "bbe0deba00ccbcee9517f9e50d1131e1de3d2631e314a66a628f6c67f66659bb",
 "kind": "module",
 "models": [
  "M901B"
 ],
 "year": 1995,
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
    "M905A"
   ],
   "dates": [
    {
     "year": 1995,
     "kind": "manual_issue",
     "text": "Issue #4 September 21, 1995"
    },
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
