# 1995 - M8202A - OUTPUT LEVEL 0 DBU TO +8 DBU NOMINAL - PARTS LIST.wp
Wiki page: [M8202A](../../../PAGES/M8202A.md)


- **Year:** 1995 (found in this file: "Manual Issue #1 December 12, 1995")
- **Module:** M8202A
- **Category:** 8200 SERIES
- **Module year estimate:** 1995 — manual_issue "Manual Issue #1 December 12, 1995" in WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M8202A.WP
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M8202A.WP`
- **SHA-256:** `88396598fb6126c66f26c40d29f83944a901447c24eabc5e7dc4145a2a02f8fc`
- **Size:** 39,438 bytes
- **Pages:** 1

## Dates found in this file

- **1995** (manual_issue): `Manual Issue #1 December 12, 1995` — …equipment perfor­mance. M8202A REMOTE SENSITIVITY AMPLIFIER Manual Issue #1 December 12, 1995 MW94002/M8202A.WP…

## Full text

### Page 1 (office)

```text
﻿Gain: (Bridging)		+30 dB to -8 dB continuously variable.

Input Sensitivity:		30 dB continuously variable.

Frequency Response:		+/-0.2 dB 20 Hz to 20 kHz.

Noise:				115 dB below maximum output at unity gain.
90 dB below the nominal +8 dBu output level at unity gain.
75 dB below the nominal +8 dBu output level at 30 dB gain.
(measured with an average responding meter over a 20 Hz to 20 kHz bandwidth and terminated in 600 ohms).

Harmonic Distortion:		Less than 0.05% 20 Hz to 20 kHz, with sens­itivity set for unity gain and an output of +18 dBu.

Less than 0.15% 20 Hz to 20 kHz, with sensitivity set for unity gain and output level of +24 dBu.

Input Level:			-20 dBu to +14 dBu nominal, for +8 dBu output.
+24 dBu maximum.


Input Impedance:		15,000 ohms balanced.

Source Impedance:		600 ohms or less, balanced.

Common Mode Rejection:	Greater than 75 dB.

Output Level:			0 dBu to +8 dBu nominal.
+30 dBu maximum into a 1K5 ohm load or greater.
+25 dBm maximum into a 600 ohm load.

Output Impedance:		Output 1:  0.1 ohms or less actively balanced.
Output 2:  60 ohms resistive actively balanced.

Load Impedance:		600 ohms balanced or greater (1 output).

Output Isolation:		40 dB, 30 Hz to 20 kHz with 60 ohm splitter network.

Output Offset:		Less than +/-500 microvolts.

Remote Sensitivity:		-4 to +1 volts DC for minimum to maximum sensitivity control. Slope of sensitivity versus control voltage curve is 6.4 dB/volt.

Phasing:			Lower alphabetic character is high. i.e. the A,B,C triplet pins are +, -, common respectively.

Power Requirements:		+/-22 volts DC, 85 ma.


Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:			1.00" wide x 2.75" high x 10.60" deep.
(25.4 mm x 70.0 mm x 270.0 mm).

Weight:			0.5 lbs (227 gms).
GENERAL 

M8202AREMOTE SENSITIVITY AMPLIFIER



The M8202A Remote Sensitivity Amplifier fulfils the need of terminating remote line feeds that are subject to level variations.

The M8202A is designed to integrate with third party  automatic systems. A decibel-linear sensitivity control law within the amplifier provides the user with a direct "volts to dB of sensitivity" characteristic.

Input line level variations of as much as 30 dB may be accommodated  with control of  a single voltage . This is achieved while maintaining the defined dynamic range of the distribution system and without any form of range switching.

The M8202A may be adjusted for system operating levels from 0 to +8 dBm. The maximum output capability of the amplifier's power stage (+30 dBu) assures dynamic range capabilities in excess of that of other audio system distribution com­ponents.
Input level variations from -20 dBu to +14 dBu may be accommodated directly.  The input circuitry will withstand transient overloads that may occur from misconnec­ting the amplifier input terminals or from atmospheric interferences.

The M8202A Remote Sensitivity amplifier is packaged to be an integral component of the WBS D8212 Audio Distribution Sys­tems.
Input

The remote line input connects to pins 9 & K of the module connector.  The remote line cable shield should be terminated at the remote amplifier input only. A separate terminal is provided for this connection and connects to pin L of the module con­nector.

R4, R5 and R6 form a "U" pad input loss network presenting a balanced bridging load of 15000 ohms to the remote line source. The output from the input loss network is coupled through coupling capacitors C2 to C9 to the discrete transis­tors of the preamplifier input stage.

Zener diodes CR1 to CR4 protect the dual differential preamplifier circuitry from input overload transients.

Preamplifier

The low noise preamplifier is a dual dif­ferential design, made up of Q1 to Q4 and U1. This amplifier has a very low input noise and provides a high rejection to com­mon mode input signal voltages.

The gain of this preamplifier is deter­mined by the ratio of R20 and R21 to the variable solid state resistor LDR1.

The low noise characteristics of the op­tical­ly coupled variable resistor is the means by which the gain (input sensitivity) of the preamplifier may be remotely al­tered without affecting the low input noise charac­teristics.

The outputs from the preamplifier stages are fed through R22 and R23 to differen­tial buffer amplifier U2A.

R26 and C26 adjust the low frequency and high frequency gain of this amplifier stage to set the common mode rejection of the amplifier to greater than 75 dB across the audio band.

Low Pass Filter

A 12 dB per octave low pass filter with a 3 dB cut off point of 40 kHz is made up of U2B, R27, R28 and C28 through to C31.

This low pass filter helps suppress out of band interference which may be picked up from TV monitors, SCR lighting systems, etc.

Output

C33 couples the audio signal to the output power stage from the low pass filter. The output power stage is made up U3A, U3B and their associated components.

Two direct actively balanced outputs are provided at pins 4 & D and 5 & E of the module connector. Output #1 at 4 & D is a "0" impedance output which feeds an exter­nal splitter network such as the WBS 14-257 assembly.

Output #2 at pins 5 & E has its output impedance set to 60 ohms by R43 and R45. The overall amplifier gain is adjusted by R35. This gain adjustment is made to set the amplifiers output to the desired system operating level (from 0 dBu to +8 dBu).

Any output dc offset voltage may be trimmed by R31 and R38 down to the microvolt region. If adjustment is neces­sary adjust R31 first by observing the dc output voltage at connector pin 4 or 5 and then adjust R38 by observing the dc output at connector pin D or E.

The output amplifier is capable of a maximum output of +30 dBu into a bridging load of 1500 ohms or greater and +25 dBm into a single 600 ohm load.

Voltage Control Amplifier

Integrated Circuit U4 and U7, along with associated components form a DC control amplifier. This sets the current (and illumination) of the LED in the light dependent resistor (LDR1).

The more intense he output of the LED , the lower the resistance of the LDR's resistor. This results in higher input  sensitivity of the M8202A (higher input stage gain).
Power Supply Decoupling

The +/-22 volt dc supply voltage appearing at amplifier connector pins 15 & S, and 13 & P are isolated from the amplifier cir­cuitry via fusing resistors R68 and R69. The in­coming +/-22 supply voltages are filtered by C46 through C51, after which they connect directly to the amplifier stages.

Regulators U5 and U6 decouple the input voltage to +/-20 volts. This provides a stable reference voltage source for control amplifier U4.

The typical quiescent supply current for the M8202A is 80 mA at maximum sen­sitivity and 60 mA at minimum sensitivity.
Refer to the technical manual of the D8212 Audio Distribution System  for initial mounting frame setup.

Mounting

The M8202A may be mounted in any of the twelve amplifier positions of the D8212 Audio System mounting frame.

Amplifier connections are made via SA14-146,   SA14-257 or SA14-312 interface assembly.

Input

The shielded remote line input is made to terminals #9 and #K with the shield con­nec­ting to pin #L.

It is normal audio system practice to con­nect cable shields only at one end. This is to prevent ground loops and possible hum pickup. The shield is normally connected to ground at the receiving end.

Input levels from -20 dBu to +14 dBu are readily accommodated for system output levels up to +8 dBu.

Remote Input Sensitivity

The remote input sensitivity control provides a 30 dB continuous gain change of the M8202A preamplifier.  

The remote input sensitivity should be controlled by an external DC voltage source within a range of +1 volt to -4 volts. This control voltage should be applied to edge connector pin M with respect to ground. Applying successively +1 volt, 0 volt and -3.6 volts (plus or minus 0.1 volts) should give input sensitivities of +10 dB, 0 dB and -20 dB respectively (typically plus or minus 1 dB).

The remote input sensitivity control can be calibrated as follows:

1)	Apply a -20 dBu balanced input signal at 1 kHz to edge connector inputs K&9.

2)	Turn R35 fully CW.

3)	Take a reference level of the balanced output at edge connector pins D&4 and turn R35 CCW until the output level is 11 dB below the reference. (Note that the output should not be loaded with greater than 20k ohm).

4)	Apply +1.0 volt DC to edge connector pin M.

5)	Adjust R49 until the output is -30 dBu.

6)	Apply 0.0 volts to pin M.

7)	Adjust R84  so that the output is -20 dBu (unity gain).

8)	Repeat steps 4 through 7 if necessary.

9)	Varying the control voltage between +1 volt and -4 volts should now give an input sensitivity range from +10 dB to -20 dB with 0 volts being unit gain.

The remote sensitivity control may be located up to 1000 ft (300m) from the amplifier.

System Levels

The M8202A gain is set for particular sys­tem operating levels by adjusting trim control R35 (e.g.  0 dBu, +4 dBu, +8 dBu). This trim control is located above the handle when inserted in the mounting frame and has a range of typically 10 dB.

The sensitivity control (whether internal or external) will accommodate input levels from -20 dBu to +14 dBu on a continual adjustment basis.

The maximum output capability of the M8202A is + 30 dBu into a bridging load (1500 ohms or greater) or +25 dBm into a 600 ohm load.

Outputs

The M8202A remote sensitivity amplifier has two outputs. One presenting a source im­pedance of 60  ohms and a second which has a low impedance (less than 0.1 ohms), for the purpose of driving an external isolation network such as the SA14-257 or SA14-312 inter­face as­sembly.

The SA14-257 interface assembly mounts on the rear of the D8212 Audio Distribution System. It provides 8, 60 ohm isolated outputs. 

The SA14-312 interface assembly mounts integral to the D8212E/R. It provides eight 60 ohms isolated outputs, and transition  connectos for interface to other termination schemes. The SA14-313 is an example of Edac interconnects. 
Both interface assemblies will typically provide 40 dB of isolation between its outputs. The cumu­lative load impedance of all outputs should not be less than 600 ohms to realize the maximum dynamic range of the amplifier.
C1	Capacitor	delete	
C2 To C9		"	47 uF/50V	Philips	035 90015
C10		"	0.47uF/100 V 	Sprague	2C20X7R474M050B
C11		"	0.47uF/100 V 		"		"
C12		"	1500 pF	Aselco	CQ92-MC-100-153M

C13		"	1500 pF		"		"
C14		"	5-56 pF	Philips	808-32659
C15		"	150 pF		"	2222-638-70151
C16		"	10 uF/35 V 	 ITT	10M35
C17		"	10 uF/35 V		"		"

C18		"	3300 pF	Aselco	CQ92-MC-100-332M
C19		"	3300 pF		"		"
C20		"	330 uF/6 V	Kemet	330M6  
C21		"	56 pF	Philips	638-46569
C22		"	56 pF		"		"

C23		"	100 pF		"	638-58101
C24		"	100 pF		"		"
C25		"	10 pF		"	630810109
C26		"	2-18 pF		"	809-05003
C27		"	47 pF		"	638-34479

C28		"	2200 pF	Aselco	CQ92-MC-222M	
C29		"	4700 pF		"	CQ92-MC-100-472M
C30		"	SOT	

C31		"	2700 pF	Aselco	CQ92-MC-100-272M
C32		"	47 pF	Philips	2222-630-34479
C33		"	150 uF/10 V	ITT	150M10
C34		"	47 pF	Philips	638-34479
C35		"	0.47/100 uF	Sprague	 2C20X7R474M050B

C36		"	0.47/100 uF		"		"
C37		"	47 pF	Philips	638-34479
C38		"	0.1 uF/50 V		
C39		"	10 uF/35 V 	 ITT	10M35
C40		"	delete


C41	Capacitor	0.47/100 uF		Sprague	2C20X7R474M050B
C42		"	0.47/100 uF		"		"
C43		"	220 pF		 Philips	638-03221
C44		"	47 uF/50 V		"	035 90015
C45		"	47 uF/50 V		"		"

C46		"	22 uF/35 V		ITT	22M35
C47		"	22 uF/35 V		"		"
C48		"	47 uF/50 V		 Philips	035 90015
C49		"	47 uF/50 V		"		"
C50		"	47 uF/50 V		"		"

C51		"	47 uF/50 V		"		"
C52		"	10 uF/35 V 		 ITT	10M35
C53		"	10 uF/35 V		"		"
C54		"	47 uF/50 V		"	035 90015
C55		"	47 uF/50 V		"		"

C56		"	2.7 pF	Philips	638-09278
C57		"	2.7 pF		"		"
C58		"	2.7 pF		"		"
C59		"	0.01	Aselco	CQ92-MC-100-103J
C60		"	220 pF	Philips	638-03221

C61		"	0.47/100 uF	Sprague	2C20X7R474M050B
C62		"	220 pF	Philips	638-03221
C63		"	0.47/100 uF	Sprague	2C20X7R474M050B
C64		"	0.01	Aselco	CQ92-MC-100-103J

CR1 To	Diode, Zener 5.6V		Motorola	1N756A 
CR4z

CR5, CR6	delete

CR7	Diode			"	1N4148

LDR1	Light Dependent Resistor	EG&G Vactec	VTL5C4



Q1 To	Transistor			National	2N4401
Q4

Q5 To Q6	Transistor		National	2N3904

R1	delete
R2	Resistor	1/4W 1%	33K2	Philips	MR25 F
R3		"	"	33K2		"	 "
R4		"	"	8K25		"	 "			
R5		"	"	8K25		"	 "

R6		"	"	1K58		"	 "
R7		"	"	15K		"	 "
R8		"	"	15K		"	 "
R9		"	1/4W 5%	100		"	CR25
R10		"	"	8K2		"	 "

R11		"	"	8K2		"	 "
R12		"	"	10K		"	 "
R13		"	"	10K		"	 "
R14		"	"	100		"	 "
R15		"	"	220		"	 "

R16	Resistor	1/4W 5%	220	Philips	CR25
R17		"	"	10K		"	 "
R18		"	"	10K		"	 "
R19		"	"	47K		"	 "
R20	   	"	1/4W 1%	4K12		"	MR25 F

R21		"	"	4K12		"	 "
R22		"	"	10K		"	 "
R23		"	"	10K		"	 "
R24		"	"	5K36		"	 "
R25		"	"	5K1		"	 "

R26	Potentiometer	500		Piher	PT10V 500
R27	Resistor	1/4W 5%	1K		Philips	CR25
R28		"	"	1K		"	 "
R29		"	"	4K7		"	 "
R30		"	"	22K		"	 "

R31	Potentiometer	100K	Piher	3006P 100K
R32	Resistor	1/4W 1%	20K	Philips	MR25 F
R33		"	1/4W 5%	4K7		"	CR25
R34		"	"	2K2		"	 "
R35	Potentiometer	20K	Piher	PT10H 20K

R36	Resistor	1/4W 1%	15K	Philips	MR25 F
R37		"	"	15K			"	 "
R38	Potentiometer	100K	Piher	3006P 100K
R39	Resistor	1/4W 5%	47K	Philips	CR25
R40		"	"	10K		"	 "

R41		"	"	10K		"	 "
R42		"	1/4W 5%	0		"	 "
R43		"	1W 1%	30.1		"	MR52F
R44		"	1/4W 5%	0		"	CR25
R45		"	1W 1%	30.1		"	MR52F

R46	delete
R47	Resistor	1/4W 1%	20K		"	MR25F
R48		"	1/4W 1%	4K75		"		"
R49	Potentiometer		Multiturn	3296P-1-502
R50	Resistor	1/4W 1%	4K75	Philips	MR25F

R51		"	"	4K75		"		"
R52 To R60	delete	
R61	Resistor	1/4W 1%	28K7	Philips	MR25F
R62 To R64	delete
R65		"	1/4W 5%	2K		"	CR25

R66		"	3W 5%	470		"	CW-2B
R67		"	"	600		"		"
R68	Resistor	1/4W 5%	2.2	Philips	CR25
R69		"	"	2.2		"		"
R70		"	"	10		"		"

R71		"	"	10		"		"
R72		"	"	3K9		"		"
R73		"	"	3K9		"		"
R74		"	"	240		"		"

R75	Resistor	1/4W 5%	240 	Philips	CR25
R76 To R77	delete
R78		"	1/4W 1%	28K7		"	MR25F
R79		"	1/4W 1%	1K		"		"
R80		"	1/4W 5%	2K		"	CR25

R81		"	1/4W 1%	28K7		"	MR25F
R82		"	1/4W 1%	18K		"		"
R83		"	SOT 
R84	Potentiometer	2K	Piher	PT10V 2K

U1 To U3	Integrated Circuit		National	NE5533N
U4		"	"			"	NE5534N
U5		"	"			"	LM317LZ
U6		"	"			"	LM337LZ
U7		"	"			"	NE5534N



MISCELLANEOUS COMPONENTS


USED ON	DESCRIPTION			MFG	MFG PART NUMBER

PCB		Printed Circuit Board		WBS	14-212 

Q5,Q6		Heatsink			WBS	7840-06-1

U1,U2,U3		14 Pin Dip Socket		Amp	640357-3

U4,U7		8 Pin Dip Socket			 "	640463-3

WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment perfor­mance.
M8202A REMOTE SENSITIVITY AMPLIFIER 





Manual Issue #1
December 12, 1995



MW94002/M8202A.WP
```

## Contents (JSON)

```json
{
 "file": "Products/8200 SERIES/M8202A/1995 - M8202A - OUTPUT LEVEL 0 DBU TO +8 DBU NOMINAL - PARTS LIST.wp",
 "sha256": "88396598fb6126c66f26c40d29f83944a901447c24eabc5e7dc4145a2a02f8fc",
 "kind": "module",
 "models": [
  "M8202A"
 ],
 "year": 1995,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "modules": [
    "M8202"
   ],
   "dates": [
    {
     "year": 1995,
     "kind": "manual_issue",
     "text": "Manual Issue #1 December 12, 1995"
    }
   ]
  }
 ]
}
```
