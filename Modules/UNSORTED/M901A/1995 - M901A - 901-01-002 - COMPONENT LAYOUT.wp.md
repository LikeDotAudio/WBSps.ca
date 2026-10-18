# 1995 - M901A - 901-01-002 - COMPONENT LAYOUT.wp
Wiki page: [M901A](../../../PAGES/M901A.md)


- **Year:** 1995 (found in this file: "Issue #5 December 14, 1995")
- **Module:** M901A
- **Category:** UNSORTED
- **Module year estimate:** 1994 — original file date saved 1994-06-29: WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - FA93001/M901A.DWG
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M901A#5.WP`
- **SHA-256:** `08d57c1968e2378774686becf34d14eda79551b3ce473fedad0d9a6a84e19e89`
- **Size:** 115,261 bytes
- **Pages:** 1

## Dates found in this file

- **1995** (manual_issue): `Issue #5 December 14, 1995` — …continued optimum equipment performance. M901A INPUT MODULE Issue #5 December 14, 1995 MW94002/M901A#5WP…

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M901A  INPUT MODULE


SECTION									PAGE	


Warranty

1	Technical Data						1-1 to 1-2
2	General							2-1 to 2-2
3	Operational Description					3-1 
4	Circuit Description						4-1 to 4-4
Configuration Jumper Table
5	Parts List							5-1 to 5-15
6	P1,P2 Connector Layouts					6-1 to 6-2

7	Drawings:
Front Panel Layout						A 901-04-005
Functional							B 901-01-002
Schematic							B 901-02-008/1
Schematic							B 901-02-008/2
Schematic							B 901-02-008/3
Component Layout						B 901-06-008
Input Sensitivities

Line:			-10 to +10 dBu.

Mic:			-68 to -24 dBm (150 ohms).

Mic Padded to Line:	0 to +10 dBu.


Frequency Response		+/-0.25 dB from 20 Hz to 20 kHz.

Noise

Line:			Greater than 82 dB signal to noise ratio for +4 dBu input sensitivity.

Mic:			-125 dB EIN at -60 dBm sensitivity.
(measured over 20 Hz to 20 kHz bandwidth)

Harmonic Distortion

Less than 0.15% from 20 Hz to 20 kHz at test level.

Less than 0.03% at 1 kHz at test level.


Source Impedances

Line:			600 ohms or  less, balanced/unbalanced.

Mic:			150 ohms, balanced/unbalanced.


Input Impedances

Line:			Greater than 20000 ohms, balanced.

Mic:			Greater than 1500 ohms , balanced.


Output Impedances		Less than 60 ohms at insert and direct outputs.

Load Impedances		10000 ohms or greater , balanced.

Output Level			-6 dBu (nominal) unbalanced.

Power Requirements		+/-24 volts dc. 120 mA nominal.

Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:			1.5" wide x 16.2" high x 6.6" deep.
(38 mm x 410 mm x 168 mm)

Weight:			560 grams (1.25 lbs.).
The M901A is a cost - effective module for the Renaissance series of radio consoles.  Two microphone and two line amplifiers can be configured to provide a single stereo or two mono microphone inputs, or two stereo line inputs. 

The input source selector allows two separate stereo inputs to be connected to the input module.  Each input has it's own preamplifier, allowing individual sensitivity trimming of the discrete source inputs.

The sensitivity controls are front panel accessible.  These continuously variable controls provide adjustment for microphone input sensitivities from -68 to 24 dBu, and line sensitivities from -10 to +10.  When microphone preamplifiers are used as line amps; the input sensitivity range is 0 to +10 dBu.

Solid-state switching after the preamplifiers allows low noise source selection.  The source selection is then routed to the module connector for insertion of optional processing.

The cue bus feed is connected to the insert return line so that pre-fade listening of source material can take place before any input module processing.

Direct left and right channel outputs are provided at the module connector.  These direct feeds may be optionally used for multitrack applications or to feed the console mix-minus system.

The output from this module may be assigned to either of two stereo program buses. 

The module also contains a "blind assignable" monophonic post VCA bus output.  This bus may be utilized for use by the console mix minus system.

Unitary control of most module functions is also available at the module connector for machine control as well as external control inputs.

Outgoing control signals are furnished as open collector paths to control common when activated.  Comprehensive internal module logic allows intelligent control of external machines, with all outgoing control signals following module source selection (source A or B).

A momentary closure to control common (through an open collector transistor), is provided when the module is turned on or off for both the A or B source.  This totals four independent outputs, one start and stop signal for both the A and B module sources.

An additional sustained closure to common is provided for both the A and B input sources that is active when the main channel is on is also provided for external use.  These outputs are also internally assignable to one or all of three internal console muting buses.  These buses run to the M905 monitor modules in the console system for muting the monitor speakers.

The internal bus structure of the console also has a cue control bus.  If a module is assigned to this bus, putting the module into cue will activate the auto cue function in the M905A control room monitor module.

The lamp internal to the channel off button is uncommitted and is brought out on the module connector.  This is intended for utilization as a tally indicator for external machinery.

Module control inputs are also configured to activate when a closure to control common is provided.  The module can be turned on and off, the cue can be toggled, and the source can be selected between A and B by simply grounding the appropriate module connector pin.

Program bus assignment is also possible external to the module.  Again, a closure to control common will effect this assignment.  To change a previous bus assignment, the electronic latches require clearing before loading them with new bus assignments.  A closure to common will also perform this function.

External control of the VCA within each module is also brought out to the edge connector.  Application of a voltage between 0 and 5 volts DC will bring the attenuator from no external attenuation to full attenuation from the current fader position.  This feature can be of benefit for automated cross-fading.
The M901A Input Module is packaged in a 1.5" wide x 16.2" high x 6.6" deep.

This module derives its power from the console system bipolar +/- 24 volt power supplies.
1) 	Source "B Select

Depressing this momentary switch (SW4), enables the "B" input source and disables the "A" input source selection (if it was selected).  Double pressing the active switch will cancel the selection.

2) 	Source "A" Select

Depressing this momentary switch (SW3), enables the "A" input source and disables the "B" input source selection (if it was selected).  Double pressing the active switch will cancel the selection.  This source is selected automatically when power is supplied to the module.

3)	P1 Select

This electronically latched, momentary switch (SW2), assigns the stereo audio signal to the program 1 stereo mix bus.  This assignment is performed automatically on module power - up.

4)	Q

This momentary electronic switch assigns the pre-fader signal to the console's stereo cue bus.  This provides a pre-fade listen feed for cueing.

5)	OFF

This switch turns off the audio feeds from the console mixing buses, and contains an externally accessible lamp for machine tally purposes.

6)	ON

This momentary switch enables the audio feeds to the console mixing buses.

7)	"B" Source Right Channel Sensitivity Control

This front panel accessible screwdriver trim control allows adjustment of the right channel microphone/line preamplifier sensitivity.

8)	"B" Source Left Channel Sensitivity Control

This front panel accessible screwdriver trim control allows adjustment of the left channel microphone/line preamplifier sensitivity.

9)	"A" Source Right Channel Sensitivity Control

This front panel accessible screwdriver trim control allows adjustment of the right channel line preamplifier sensitivity.

10)	"A" Source Left Channel Sensitivity Control

This front panel accessible screwdriver trim control allows adjustment of the left channel line preamplifier sensitivity.

11)	P2 Bus Assignment Switch

Switch SW5, a momentary switch controlling an electronic latch, actuates the assignment of the module output to the Program 2 bus in the console.

12)	Main Channel Fader

This 105mm Penny and Giles linear fader controls the main channel voltage controlled amplifiers.
Inputs

The M901A is capable of selecting between two stereo sources, two microphone inputs or two line inputs.  By selectively configuring the inputs, it is possible to use the module to provide; a mono microphone and stereo line input, a stereo microphone and stereo line input, and two stereo line inputs.  The table on the following page details the jumper configurations for various source possibilities.

The normal configurations are those which place the module edge connector inputs on their normal inputs on the source selector (i.e. the "A" inputs are line inputs and the "B" inputs are microphone inputs).  Whereas the optional configuration places the "B" right input (on the edge card connector) on the "A" input source selector.  The 'X' on the table details over which pins the shorting jumper should be placed.

The "A" input amplifiers comprised of U3 and U4 and associated components are a balanced input differential amplifier with a 20 dB sensitivity range.  Input levels of between -10 and +10 dBu can be adjusted to the system operating level of -6 dBu.

The "B" input amplifiers are single chip balanced microphone preamplifiers.  The input circuit consists of common mode resistors R39 and R40 for U5 and R51 and R52 for U6 which allow the simplexing of phantom power on condenser microphones, depending on configuration by jumpers LK7 and/or LK8.  The jumpers at U5; LK28 and LK29 (LK30 and LK31 for U6), are a loss network for using the B inputs as line inputs.  In addition to this fixed loss network, a gain change is also implemented with LK10 and L11 for realizing the line input configuration.  An additional loss network on the output of each "B" preamplifier further augments the line input capabilities of the preamplifiers.  Zener diodes CR18 through CR25 act as hard limiters to transients generated when plugging and unplugging condenser microphones with phantom power supplied to the preamplifier.  This protects the preamplifiers from damage.

On power application to the module, a reset circuit comprised of R14, CR7, C104, and C136 globally resets all of the logic circuitry on the module (see B 901-02-008/2).  This reset signal directly sets the "A" source flip-flop in U1 and resets the "B" source latch on U1.  This is the initial input source selection.  Selection of the "B" source is enabled by closing SW4 to control common.  Switch bounce is controlled by U29 sections E and F, a Schmidt trigger inverter.  This clean switching signal is coupled to the toggle input of U1, and via CR3 to the reset input of the "A" latch.  This connection provides electronic alternate action operation for the source selection.

By double switching the currently active switch, it too is disabled.  The allows both sources to be turned off, a function not normally available with a mechanically interlocked switch.

External A or B source selection is available at edge card connector P2 pin 26 and pin 25 respectively.  Selecting source "A" this way directly sets the "A" latch, and resets the "B".  The converse is also true.

Source selection is tallied via illumination in the associated pushbutton.  For the "A" source, a logic 0 at tag A on R183 turns Q17 on.  This transistor sources current to the base of Q16 through R181 and R182.  This shorts out DS6 and prevents it from illuminating.  The lamps are all connected in series and powered by a constant current source consisting of Q24 and R193 through R195.  This source provides approximately 20mA of current for the series LED string.  Illumination is performed this way to maintain constant current consumption no matter the number of lamps on in the LED string.

The source audio is switched into the node of U9 and U10 through U7 and U8, a pair of analog multiplexors.  Integrated circuit U9 and U10 drive the insert outputs to a -6dBu level for the insertion of optional processing.

Attenuator

A linear attenuator, ATT1 (on drawing B 901-02-008/3), controls two voltage controlled amplifiers (VCA); U17 and U18.

The insert return audio is AC coupled to the non-inverting input of U17 through C65.  The gain of U17 is controlled by the voltage present at pin 11, which is bypassed to control common by C119.  Trim control R108 is used to adjust the gain cell symmetry to minimize VCA distortion.  Trim adjustment of the control feed through is done with R106.  Resistors R233 through R236, CR72 and CR73 and Q29 and Q30 are a bipolar emitter follower to boost the current output abilities of the VCA.

U18 operates similarly, except R241 allows fine adjustment of the level balance between the left and right channels.

The VCA characteristic is tailored to give a familiar audio taper to the level adjustment with a control amplifier comprised of U25 and U26 and associated components.

Bus Assignment

Solid state active bus assignments are performed by U22 through U24.  These switches are controlled by the control logic in the module, and are active when the channel is switched on, the fader is brought up from infinity, and when the bus has been assigned.

The Program 1 bus can be assigned to either a "speech" or a "music" bus by moving programming jumpers LK12 and LK13.  A blind assigned mix minus (mix -) can also be programmed with link LK20.  The blind mix minus is active whenever the channel is turned on.

Channel Control Logic

Channel On

Momentary operation of the channel on switch SW7, will produce a negative going pulse at U11 pin 13, resulting in directly setting one of the flip flops in U14.  Alternatively, a momentary closure of P2 pin 44 to ground will have the same effect.

Once the flip flop is preset, it's output at pin 15 changes from logic 0 to logic 1.  This enables the VCA control amplifier, the Channel On lamp, and the program assignment bus controls (U30 sections A and D, and CR62, CR65 and CR71).  
An open collector transistor, Q5 or Q6 is latched on, again depending on source selection, when the channel is on.  These outputs can be used for external muting and signalling functions and are capable of sinking 20mA to control common.

A logical OR is realized with CR43 through CR45, and CR46 through CR48.  These OR gate inputs are assignable to the internal muting buses in the console through a series of user-programmable links; LK1 through LK7.  Notice that source A can mute a different bus configuration that source B.

Turning the channel on also causes a momentary low impedance path to ground to be enabled via an open collector transistor.  This is intended for machine control applications, and is logically steered to follow the input source selection.  Transistors Q1 through Q4 handle this task, and are capable of sinking 20mA to control common.

Channel Off

Momentary operation of the Channel Off switch SW8, or momentary ground closure of the External Off control input at connector P2 pin 44 will result in a negative going pulse at U11 pin 11.  This results in a direct reset of the "A" section of the flip flop U14.  This produces a direct reset of the "A" section of U14, producing a logic 0 at pin 15.  This disables the VCA amplifier, disables the bus switches and extinguishes the Channel On lamp.

A momentary closure to control common via an open collector transistor which follows source selection is available at module connector P2 pin 36 and P2 pin 35 for the A and B inputs respectively.

The lamp integral to the Channel Off switch is uncommitted and available at module connector P2 pins 45 and 46.  This can be used for external machine tally purposes (CD ready indicators, for example).

In addition to the normal channel pushbutton off, operated by the Channel Off function detailed above, the channel output is also disabled whenever the channel attenuator is moved to the infinite position (∞).  This disables the VCA control amplifier and the Program Bus switches.  However, the tally lamps for Channel On, muting controls and bus assignment switches remain unaffected.

Cue

The B section of U14 is used to control the solid state cue switches.  The flop-flop will change state each time a negative going transition occurs at pin 3 of U11.  Consequently, with each input pulse, the Cue channel toggles on and off.

This alternate action can be invoked by either momentarily closing Cue switch SW1 (Q), or momentarily grounding the external Cue control input at module connector P2 pin 41.

The status of the Cue channel is indicated by DS3, integral to SW1.

An additional feature ensures that the Cue channel is switched off whenever the attenuator is moved into or away from the infinity position: regardless of the prior state of the cue channel.  The control signal for this action is initiated by the change of state of the end of travel switch integral to the attenuator.  The resulting level change is processed through U11 section C and D, U13, and U12C.

All logic control inputs are buffered to guard against switch bounce and spurious noise.

Power Supply Decoupling

Please refer to drawing B 901-02-008/3.

An active decoupling network consisting of Q25 through Q28, U28 and associated components decouple the ±24 volt power supply down to the ±18 volts, and +6 volts required for use in the module.  CR51 and CR52 protect the module in the event of power supply reversal.

Three terminal regulator U28 provides 6 volts nominal for utilization by the logic circuitry within the module.  The -22 volt power supply is used to drive the LED current source.
ATT1	Fader			P&G	PGF3210

C1	Capacitor		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C2  		"		0.1 uF/100 V		"		"
C3		"		0.1 uF/100 V		"		"
C4		"		0.1 uF/100 V		"		"
C5		"		68 uF/10 V	ITT	68M10

C6		"		68 uF/10 V		"		"
C7		"		22 pF	Philips	638-10229
C8  		"		10 pF		"	638-10109
C9		"		10 uF/25 V	ITT	10M25
C10		"		SOT

C11		"		10 uF/25 V	ITT	10M25
C12		"		10 pF	Philips	638-10109
C13		"		33 uF/16 V	ITT	33M16
C14		"		68 uF/10 V		"	68M10
C15		"		68 uF/10 V		"		"

C16		"		22 pF	Philips	638-10229
C17		"		10 uF/25 V	ITT	10M25
C18		"		SOT
C19		"		10 pF	Philips	638-10109
C20		"		10 uF/25 V	ITT	10M25

C21		"		10 pF	Philips	638-10109
C22		"		33 uF/16 V	ITT	33M16
C23		"		47 uF/50 V	Philips	03590015
C24		"		47 uF/50 V		"		"
C25		"		47 uF/50 V		"		"

C26		"		47 uF/50 V		"		"
C27		"		47 uF/50 V		"		"
C28		"		47 uF/25 V	ITT	47M25
C29		"		47 uF/25 V		"		"
C30		"		220 pF	Philips	638-03221

C31		"		68 uF/10 V	ITT		68M10
C32		"		47 uF/50 V	Philips	03590015
C33		"		47 uF/50 V		"		"
C34		"		47 uF/50 V		"		"
C35		"		47 uF/50 V		"		"

C36	Capacitor		47 uF/25 V	ITT	47M25
C37		"		47 uF/25 V		"		"
C38		"		220 pF	Philips	638-03221
C39		"		68 uF/10 V	ITT	68M10
C40		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

C41		"		delete
C42		"		47 pF	Philips	638-34479
C43		"		SOT
C44		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C45		"		0.1 uF/100 V		"		"

C46		"		47 pF	Philips	638-34479
C47		"		33 uF/16 V	ITT	33M16
C48		"		47 pF	Philips	638-34479
C49		"		SOT
C50		"		33 uF/16 V	ITT	33M16

C51		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C52		"		47 pF	Philips	638-34479
C53		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C54		"		0.1 uF/100 V		"		"
C55		"		delete

C56		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C57		"		0.1 uF/100 V		"		"
C58		"		1 uF/35 V	ITT	1M35
C59		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C60		"		1 uF/35 V	ITT	1M35

C61		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C62		"		delete
C63		"		47 pF	Philips	638-34479
C64		"		22 uF/25 V	Siemens	85200
C65		"		10 uF/25 V	ITT	10M25

C66		"		150 pF	Philips	638-70151
C67		"		22 uF/25 V	Siemens	85200
C68		"		22 uF/25 V		"		"
C69		"		150 pF	Philips	638-70151
C70		"		10 uF/25 V	ITT	10M25

C71		"		22 uF/25 V	Siemens	85200
C72		"		47 pF	Philips	638-34479
C73	 	"		0.1 uF /100V	Sprague	K104K20X7RFVBWN
C74		"		10 uF/25 V	ITT	10M25
C75		"		0.1 uF /100V	Sprague	K104K20X7RFVBWN

C76	Capacitor		47 pF	Philips	638-34479
C77		"		delete
C78		"		delete
C79		"		delete
C80		"		delete

C81		"		delete
C82	Capacitor		33 uF/16 V	ITT	33M16
C83		"		delete
C84		"		delete
C85		"		delete

C86		"		delete
C87		"		33 uF/16 V	ITT	33M16
C88		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C89		"		0.1 uF/100 V		"		"
C90		"		0.1 uF/100 V		"		"

C91		"		delete
C92		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C93		"		0.1 uF/100 V		"		"
C94		"		0.1 uF/100 V		"		"
C95		"		0.1 uF/100 V		"		"

C96		"		2.2 uF/20  V	ITT	2.2M20
C97		"		2.2 uF/20  V		"		"
C98		"		22 uF/25 V	Siemens	85200
C99		"		22 uF/25 V		"		"
C100		"		47 uF/25 V	Philips	03556479

C101		"		22 uF/25 V	Siemens	85200
C102		"		delete
C103		"		1 uF/35 V	ITT	1M35
C104		"		47 uF/25 V	Philips	03556479
C105		"		47 pF	Philips	638-34479

C106		"		delete
C107		"		delete
C108		"		delete
C109		"		delete
C110		"		delete

C111		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C112		"		0.1 uF/100 V		"		"
C113		"		10 uF/25 V	ITT	10M25
C114		"		10 uF/25 V		"		"
C115		"		10 uF/25 V		"		"

C116	Capacitor		10 uF/25 V	ITT	10M25
C117		"		6.8 uF/16 V		"	6.8M16
C118		"		6.8 uF/16 V		"		"
C119		"		0.33 	Sprague	2C20X7R334M050B
C120		"		0.1 uF/100 V		"	K104K20X7RFVBWN

C121		"		0.33 		"	2C20X7R334M050B
C122		"		0.1 uF/100 V		"	K104K20X7RFVBWN
C123		"		0.1 uF/100 V		"		"
C124		"		0.1 uF/100 V		"		"
C125		"		0.1 uF/100 V		"		"

C126		"		delete
C127		"		33 uF/16 V	ITT	33M16
C128		"		33 uF/16 V		"		"
C129		"		10 uF/25 V		"	10M25
C130		"		10 uF/25 V		"		"

C131		"		10 uF/25 V		"		"
C132		"		10 uF/25 V		"		"
C133		"		10 uF/25 V		"		"
C134		"		10 uF/25 V		"		"
C135		"		10 uF/25 V		"		"

C136		"		47 uF/25 V	Philips	03556479
C137		"		delete
C138		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C139		"		82 pF	Philips	638-58829
C140		"		SOT

C141		"		82  pF	Philips	638-58829
C142		"		82  pF		"		"
C143		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C144		"		47  pF	Philips	638-34479
C145		"		47  pF		"		"

C146		"		47  pF		"		"
C147		"		47  pF		"		"
C148 to C154		"		0.1 uF/100 V	Sprague	K104K20X7RFVBWN

CR1	Diode			National	1N4148
CR2	delete
CR3 to CR17	Diode			National	1N4148
CR18 to CR25		"				"	1N752A
CR26		"				"	1N4148
CR27		"				"	1N4003
CR28		"				"	1N4148

CR29 	Diode			National	1N4003
CR30		"				"	1N4148
CR31		"				"	1N4148
CR32		"				"	1N4003
CR33 to CR36		"				"	1N4148


CR37,CR38	delete
CR39	Diode				"	1N4003
CR40		"				"		"
CR41 to CR48		"				"		"

CR49	delete
CR50	Diode				"	1N4148
CR51		"				"	1N4003
CR52		"				"		"
CR53 to CR56		"				"	1N4148
CR57	delete

CR58 to CR75		"				"	1N4148

CR76	delete
CR77	Diode				"	1N4003
CR78		"				"		"
CR79 to CR85		"				"	1N4148

DS1-DS5	LED, Yellow		H.P	HLMP1401
DS6	delete
DS7	LED-T1, Red			
DS8	Lamp, Min Flange				387

LK1-LK20	Connector, 3 Pin, Male		Berg	929705-01-03
LK21-LK22	delete
LK23	Connector, 3 Pin, Male		Berg	929705-01-03
LK24	delete
LK25	PCB Link

LK26-LK31	Connector, 3 Pin, Male		Berg	929705-01-03
LK32-LK37	PCB Link
LK38 	delete
LK40-LK43	Connector, 3Pin Maale		Berg	929705-01-03

Q1 to Q4	Transistor			National	2N3904
Q5		"				"	2N6731
Q6		"				"	2N6731
Q7		"				"	2N3906

Q8		"				"	2N3906
Q9	delete
Q10	Transistor				"	2N3906
Q11	delete
Q12	Transistor			National	2N3904
Q13		"				"	2N3906
Q14		"				"	2N3904

Q15	   "      			    "	2N3906
Q16		"				"	2N3904
Q17		"				"	2N3906
Q18		"				"	2N3904
Q19		"				"	2N3906

Q20		"				"	2N3904
Q21		"				"	2N3906
Q22		"				"	2N3906
Q23		"				"	2N3904
Q24		"				"	2N6731

Q25		"				"	TIP29B
Q26		"				"	2N3904
Q27		"				"	2N3906
Q28		"				"	TIP30B
Q29		"				"	2N3904

Q30		"				"	2N3906
Q31		"				"	2N3904
Q32		"				"	2N3906

R1	SIP Resistor		10K	Bourns	15-002
R2	SIP Resistor		39K		"	15-014
R3	Resistor	1/4W 5%	3K3	Philips	CR25
R4		"	"	3K3		"		"
R5		"	"	10K		"		"

R6		"	"	delete
R7		"	"	10K		"		"
R8		"	"	10K		"		"
R9		"	"	3K3		"		"
R10		"	"	3K3		"		"

R11		"	"	delete
R12		"	"	10K		"		"
R13		"	"	10K		"		"
R14		"	"	100K		"		"
R15		"	1/4W 1%	15K		"	MRS25F

R16		"	1/4W 1%	15K		"		"
R17		"	1/4W 1%	100K		"		"
R18		"	1/4W 1%	100K		"		"
R19	Resistor	1/4W 1%	4K75	Philips	MRS25F
R20		"	1/4W 1%	4K75		"		"

R21	Resistor		SOT
R22		"	1/4W 5%	15K	Philips	CR25
R23		"	"	1K		"		"
R24	Potentiometer	5K	Piher	PT10H 5K
R25	Resistor	1/4W 5%	100K	Philips	CR25

R26		"		delete
R27		"	1/4W 1%	15K		"	MRS25F
R28		"	1/4W 1%	15K		"		"
R29		"	1/4W 1%	100K		"		"
R30		"	1/4W 1%	100K		"		"

R31		"	1/4W 1%	4K75		"	MRS25F
R32		"	1/4W 1%	4K75		"		"
R33		"		SOT
R34		"	1/4W 5%	15K		"	CR25
R35		"	"	1K		"		"

R36	Potentiometer	5K	Piher	PT10H 5K
R37	Resistor	1/4W 5%	100K	Philips	CR25
R38		"		delete
R39		"	1/4W 1%	6K81		"	MRS25F
R40		"	1/4W 1%	6K81		"		"

R41		"	1/4W 1%	100K		"	MRS25F
R42		"	1/4W 1%	100K		"		"
R43		"	1/4W 1%	1K1		"		"
R44		"	1/4W 1%	1K1		"		"
R45		"	1/4W 5%	300		"	CR25

R46		"	"	4.7		"		"
R47	Potentiometer	500	Piher	PT10H 500
R48				delete
R49	Resistor	1/4W 5%	2K2	Philips	CR25
R50		"	"	470		"		"

R51	Resistor	1/4W 1%	6K81	Philips	MRS25F
R52		"	1/4W 1%	6K81		"		"
R53		"	1/4W 1%	100K		"		"
R54		"	1/4W 1%	100K		"		"
R55		"	1/4W 1%	1K1		"		"

R56		"	1/4W 1%	1K1		"		"
R57		"	1/4W 5%	4.7		"	CR25
R58	Resistor	1/4W 5%	300	Philips	CR25
R59	Potentiometer	500	Piher	PT10H 500
R60				delete

R61	Resistor	1/4W 5%	2K2	Philips	CR25
R62		"	"	2K2		"		"
R63		"	"	9K1		"		"
R64		"	"	9K1		"		"
R65		"	"	9K1		"		"

R66		"	"	9K1		"		"
R67		"	"	22K		"		"
R68		"	"	SOT
R69		"	"	100K		"		"
R70		"	"	100K		"		"

R71	Resistor	1/4W 5%	22K	Philips	CR25
R72		"	"	100K		"		"
R73	SIP Resistor	10K	Bourns	15-002
R74	Resistor	1/4W 5%	3K3	Philips	CR25
R75		"	"	39K		"		"

R76		"	"	10K		"		"
R77		"	"	3K3		"		"
R78		"	"	39K		"		"
R79		"	"	3K3		"		"
R80		"	"	39K		"		"

R81	Resustor	1/4W 5%	27K	Philips	CR25
R82		"	"	9K1		"		"
R83		"	"	100K		"		"
R84		"	"	10K		"		"
R85		"	"	10K		"		"

R86		"	"	10K		"		"
R87		"	"	15K		"		"
R88	SIP Resistor		10K	Bourns	15-002
R89	Resistor	1/4W 5%	15K	Philips	CR25
R90		"	"	100K		"		"

R91	Resistor	1/4W 5%	15K	Philips	CR25
R92		"	"	10K		"		"
R93				delete
R94				delete
R95				delete

R96				delete
R97	Resistor	1/4W 5%	15K	Philips	CR25
R98		"	"	15K		"		"
R99		"	"	15K		"		"
R100		"	"	delete				

R101	Resistor	1/4W 5%	150K	Philips	CR25
R102		"	"	24K		"		"
R103		"	"	15K		"		"
R104				delete
R105		"	"	10M		"		"

R106	Potentiometer	100K	Piher	PT10V 100K
R107				delete
R108	Potentiometer	500K	Piher	PT10V 500K
R109	Resistor	1/4W 5%	470K	Philips	CR25
R110		"	"	150K		"		"

R111	Resistor	1/4W 5%	22K	Philips	CR25
R112		"	"	15K		"		"
R113				delete
R114		"	"	10M		"		"
R115	Potentiometer	100K	Piher	PT10V 100K

R116				delete
R117	Potentiometer	500K	Piher	PT10V 500K
R118	Resistor	1/4W 5%	470K	Philips	CR25
R119		"	"	10K		"		"
R120		"	"	20K		"		"

R121	Resistor	1/4W 5%	20K	Philips	CR25
R122		"	"	100K		"		"
R123				delete
R124				delete
R125		"	1/4W 5%	100K		"	CR25

R126				delete
R127				delete
R128		"	1/4W 5%	100K		"	CR25
R129				delete
R130		"	1/4W 1%	15K		"	MRS25F

R131		"	1/4W 1%	15K		"		"
R132				delete
R133		"	1/4W 1%	15K		"		"
R134		"	1/4W 1%	15K		"		"
R135				delete

R136	Resistor	1/4W 1%	15K	Philips	MRS25F
R137		"	1/4W 1%	15K		"		"
R138		"	1/4W 1%	15K		"		"
R139		"	1/4W 5%	20K		"	CR25
R140		"		delete

R141	delete
R142	delete
R143	Resistor	1/4W 1%	10K	Philips	MRS25F
R144		"	1/4W 1%	47K5		"		"
R145		"	1/4W 1%	47K5		"		"

R146		"	1/4W 1%	47K5		"		"
R147		"	1/4W 1%	47K5		"		"
R148		"	delete
R149		"	delete
R150		"	delete

R151	Resistor	1/4W 1%	47K5	Philips	MRS25F
R152		"	1/4W 1%	10K		"		"
R153		"	1/4W 5%	1K		"	CR25
R154		"	delete
R155		"	1/4W 5%	9K1		"	CR25

R156		"	1/4W 1%	4K75		"	MRS25F
R157		"	1/4W 1%	9K09		"		"
R158		"	1/4W 1%	499		"		"
R159		"	1/4W 1%	1K		"		"
R160		"	1/4W 1%	28K7		"		"

R161	Resistor	1/4W 1%	28K7	Philips	MRS25F
R162		"	1/4W 1%	8K25		"		"
R163		"	1/4W 1%	13K		"		"
R164		"	1/4W 1%	3K92		"		"
R165		"	1/4W 1%	10K		"		"

R166		"	1/4W 1%	13K		"		"
R167		"	1/4W 1%	10K		"		"
R168		"	1/4W 5%	47K		"	CR25 
R169		"	1/4W 5%	33K		"		"
R170 to R174	delete	

R175	Resistor	1/4W 5%	22K	Philips	CR25
R176		"	"	4K7		"		"
R177		"	"	100K		"		"
R178		"	"	22K		"		"
R179		"	"	4K7		"		"

R180	Resistor	1/4W 5%	100K	Philips	CR25
R181		"	"	22K		"		"
R182		"	"	4K7		"		"
R183		"	"	100K		"		"
R184		"	"	22K		"		"
R185		"	"	4K7		"		"

R186		"	"	100K		"		"
R187		"	"	22K		"		"
R188		"	"	4K7		"		"
R189		"	"	100K		"		"
R190		"	"	22K		"		"

R191	Resistor	1/4W 5%	22K	Philips	CR25
R192		"	"	620		"		"
R193		"	"	20K		"		"
R194		"	"	4K7		"		"
R195		"	1/2W 5%	180		"	SFR25 HJ

R196		"	1/4W 5%	2.2		"	CR25
R197		"		11K		"		"
R198		"	"	120K		"		"
R199		"		11K		"		"
R200		"	"	2.2		"		"

R201	Potentiometer	5K	Piher	PT10V 5K
R202	Resistor	1/4W 5%	100	Philips	CR25
R203		"	"	68		"		"
R204		"	1/4W 1%	499		"	MRS25F
R205		"	1/4W 1%	137		"		"

R206		"	delete
R207		"	1/4W 5%	68		"		CR25
R208		"	"	100		"		"
R209		"	delete
R210		"	SOT

R211	Resistor	1/4W 5%	22K	Philips		CR25
R212		"	delete
R213		"	1/4W 5%	22K		"		"
R214		"	delete
R215		"	delete

R216		"	delete
R217		"	delete
R218		"	delete
R219		"	delete
R220	delete

R221	Resistor	delete
R222		"	1/4W 5%	2K2	Philips	CR25
R223		"	"	100		"		"
R224		"	"	100		"		"
R225		"	"	100K		"		"

R226		"	"	100K		"		"
R227		"	"	100K		"		"
R228		"	"	100K		"		"
R229		"	"	30		"		"
R230		"	"	30		"		"

R231	Resistor	1/4W 1%	1K	Philips	MRS25F
R232		"	"	10K		"		"
R233		"	1/4W 5%	16K		"	CR25
R234		"	"	47		"		"
R235		"	"	47		"		"

R236		"	"	16K		"		"
R237		"	"	68		"		"
R238		"	1/4W 1%	1K		"	MRS25F
R239		"	1/4W 1%	10K		"		"
R240		"	1/4W 5%	68		"	CR25

R241	Potentiometer	5K	Piher	PT10V 5K
R242	Resistor	1/4W 5%	16K	Philips	CR25
R243		"	"	16K		"		"
R244		"	"	47		"		"
R245		"	"	47		"		"

R246		"	"	30		"		"
R247		"	"	30		"		"
R248		"	"	100K		"		"
R249		"	"	100K		"		"
R250		"	"	100K		"		"

R251		"	"	100K		"		"
R252		"	"	100K		"		"
R253		"	"	100K		"		"
R254		"	"	100K		"		"
R255		"	"	delete

R256		"	"	SOT		"		"
R257		"	"	22K		"		"
R258		"	"	22K		"		"

R259	Resistor	1/4W 5%	22K	Philips	CR25
R260		"	"	22K		"		"
R261		"	"	22K		"		"
R262		"	"	delete
R263		"	"	6.8		"		"
R264		"	"	6.8		"		"

R265	Potentiometer	5K	Piher	PT10V 5K
R266	Resistor	1/4W 5%	4K7	Philips	CR25
R267		"	"	620		"		"
R268		"	"	39K		"		"
R269		"	"	10K		"		"

R270		"	"	3K3		"		"
R271		"	"	39K		"		"
R272		"	"	39K		"		"
R273		"	"	39K		"		"
R274		"	"	10K		"		"

R275		"	"	3K3		"		"
R276		"	"	39K		"		"
R277		"	"	39K		"		"
R278		"	"	10K		"		"
R279		"	"	3K3		"		"

R280		"	"	10K		"		"
R281		"	"	3K3		"		"
R282		"	"	10K		"		"
R283		"	"	3K3		"		"
R284		"	"	3K3		"		"

R285		"	"	39K		"		"
R286		"	"	3K3		"		"
R287		"	"	39K		"		"

SW1 to SW5	Switch			Licon	39-22100
SW6	delete
SW7	Switch			Dialco	554-3221-311
SW8		"				"	554-3221-211

U1	Integrated Circuit		National	74HC74N
U2		"	"			"		"
U3		"	"			"	LM833
U4		"	"			"		"
U5		"	"		Analog	SSM2017P

U6		"	"			"		"
U7		"	"		National	74HC4053N
U8		"	"			"		"
U9		"	"		Signetics	NE5534N
U10		"	"			"		"

U11		"	"		National	74HC14N
U12		"	"			"	74HC00N
U13		"	"			"	74HC123N
U14		"	"			"	74HC74N
U15		"	"			"	74HC125N

U16	Integrated Circuit		National	74HC125N
U17		"	"		Analog	SSM2018P
U18		"	"			"		"
U19		"	"		Signetics	NE5534N
U20						"	delete

U21						"	delete
U22		"	"		National	74HC4053N
U23		"	"			"		"
U24		"	"			"		"
U25		"	"			"	LF353N

U26		"	"			"		"
U27		"	"			"	delete
U28		"	"			"	LM317LZ
U29		"	"			"	74HC14N
U30		"	"			"		"
U31		"	"			"		"
PARTS LIST

M901A INPUT MODULE

MISCELLANEOUS COMPONENTS



USED ON	DESCRIPTION		MFG	MFG PART­ NUMBER

PCB	Printed Circuit Board		WBS	14-294

LK1-LK20,	Connector 2P		Aptronics	929955-06
LK23,LK26-LK31,
LK40-LK43

Q25, Q28	Heatsink			Aavid	577102

SW1-SW5	Keycap, Black		Licon	80-390104
Switch, Light Pipe			"	80-390100
Socket, R/A Pins			"	39-80002

SW5	Socket, Straight Pin			"	39-80001

SW7	Switch, Lens, Red		Dialco	326-0071
Barrier Strip				"	565-0701

SW8	Switch, Lens, Amber			"	325-0073
Barrier Strip				"	565-0701

U3-U6	8 Pin Socket			Amp	640463-3
U9,U10,U19,
U25,U26,U27

U1,U2,	
U11, U12,	14  Pin Socket		Amp	640357-3
U14, U15,  U16,
U29, U30, U31

U7,U8, U13,	16  Pin Socket		Amp	640358-3
U17,U18
U22-U24,


WBS recommends the use of replacement parts made by the specified manufactures for continued optimum equipment performance.
M901A

INPUT MODULE
Issue #5
December 14, 1995
MW94002/M901A#5WP
```

## Contents (JSON)

```json
{
 "file": "Modules/UNSORTED/M901A/1995 - M901A - 901-01-002 - COMPONENT LAYOUT.wp",
 "sha256": "08d57c1968e2378774686becf34d14eda79551b3ce473fedad0d9a6a84e19e89",
 "kind": "module",
 "models": [
  "M901A"
 ],
 "year": 1995,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "modules": [
    "M905A"
   ],
   "dates": [
    {
     "year": 1995,
     "kind": "manual_issue",
     "text": "Issue #5 December 14, 1995"
    },
    {
     "year": 2017,
     "kind": "year",
     "text": "2017"
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
