# 1996 - POD5 - POD5 - GREATER THAN 70 DB BELOW -10 DBU OUTPUT - COMPONENT LAYOUT.wpd
Wiki page: [POD5](../../../PAGES/POD5.md)


- **Year:** 1996 (original file date 1996-02-22)
- **Module:** POD5
- **Category:** PODS
- **Module year estimate:** 1995 — month "December 7, 1995" in WBSps Engineering from H drive-20261018T013433Z-1-002/WBSps Engineering from H drive/WBSps - POD_OLD/POD5/MANUAL/INTER5.WPD
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - POD_OLD/POD5/MANUAL/POD5SRV.WPD`
- **SHA-256:** `5e1b9bed70ccbceef6817d228f0615f5fa1bf6b36c2162e3bcfe1fd9a48539f5`
- **Size:** 416,281 bytes
- **Pages:** 1

## Full text

### Page 1 (office)

```text
﻿Service Manual
Dual Headset Amplifier
POD-5
Specifications:
Power Requirement:				110 or 220 volts ac, 60 or 50 Hz; 5 Watts.
Ambient Temperature:				0o to 50o Celsius.
Relative Humidity:				20 % to 90 %, non-condensing.
Dimensions:					8.69" wide x 1.73" high x 7.00" deep
(221 mm x 44 mm x 178 mm).
Weight:					             454 grams (1 pound).

Balanced to Unbalanced Conversion

Sensitivity:
         0 to +8 dBu for -10 dBu output.

Frequency Response:
    ±0.2 dB, 20 Hz to 20 kHz.

Noise:
Greater than 70 dB below -10 dBu output
     (20 Hz to 30 kHz).

Total Harmonic Distortion:
  Less than 0.02%, 20 Hz to 20 kHz.

Dynamic Range:
           Greater than 100 dB.

Input Impedance:
   30 000 ohms or greater, balanced.

Source Impedance:
600 ohms or less, balanced.

Output Impedance:
Less than 47 000 ohms, unbalanced.

Load Impedance:
  5000 ohms or greater, unbalanced.
Unbalanced to Balanced Conversion

Sensitivity:
     -10 dBu input for 0 dBu to +8 dBu output.

Frequency Response:Load Impedance:
  5000 ohms or greater, unbalanced.

   ±0.2 dB, 20 Hz to 20 kHz.
Noise:
        Greater than 85 dB below 0 dBu output
        (20 Hz to 30 kHz).

Total Harmonic Distortion:
  Less than 0.02%, 20 Hz to 20 kHz.

Dynamic Range:
           Greater than 110 dB.

Input Impedance:
47 000 ohms or greater, unbalanced.

Source Impedance:
      5000 ohms or less, unbalanced.

Output Impedance:
60 ohms, balanced.

Load Impedance:
       600 ohms or greater, balanced.
CONTENTS

ITEM				         PAGE
●	Safety Precautions				2
●	Insulation Resistance Test			2
●	Location of Controls and Components	3
●	Measurement and Adjustment		4
ITEM				         PAGE
●	Schematic					5
●	Component Layout				6
●	Block Diagram				8
●	Circuit Board Layout			9

Safety Precautions

1.	Before servicing, unplug power cord to prevent an electric shock.
2.	When replacing parts, use only the manufacturer's recommended components for safety.
3.	Check the condition of the power cord.  Replace it if wear or damage is apparent.
4.	After servicing, be sure to restore the dressing of leads, insulation barriers, insulation paper, shields, etcetera.
5.	Before returning the equipment to the customer, be sure to make the following insulation resistan test to
      prevent the customer from being exposed to a shock hazard. 

Insulation Resistance Test

1.	Unplug the power cord and short the two blade prongs of the plug together with a jumper
wire.
2.	Turn on the power switch.
3.	Measure the resistance between the chassis and the jumpered ac cord.  The meter
should measure around infinity (∞).
4.	If the measurement is outside the specified limits, there is a possibility of a shock hazard. 
The equipment should be repaired and re-checked before being returned to the customer.



LOCATION OF CONTROLS AND COMPONENTS







































MEASUREMENT AND ADJUSTMENT METHODS

























Notes: Set switches and controls in the following 	 	positions, unless specified otherwise.
.Power Switch'ON'
.Output Level Controls: Maximum
.R16 and R5: Maximum
.If unit has been outdoors, be sure that the 	   	 temperature has been stabilized





➀	Common Mode Rejection Nulling

Objective:	To Minimize transmission of common mode signals through the
POD-1 balanced audio input to the unbalanced audio output.

Equipment:	Audio Oscillator 
Audio Meter
Test Cables

Procedure:

a)	Inject a +4 dBu test signal into the left POD-1 balanced input (J1) at a frequency of
60Hz.

b)	Measure a reference level on the unbalanced output.  Note this level.

c)	Remove one leg of the balanced audio signal.  Connect the "hot pins" (2 and 3 on
the XLR input) to the same unbalanced leg.  Increase the generator level by +6dB
to +10 dBu.  While monitoring the unbalanced output (J3), trim potentiometer R5 for
minimum signal.  This should be 80 dB below the reference level noted previously.


d)	Repeat the process for the right channel, adjusting R16 for minimum signal present
		at the Right unbalanced output (J4).
➁	Balanced to Unbalanced Frequency Response and Distortion Measurement 

Objective: 	To verify the transparency of POD-1 to the audio spectrum
when converting balanced audio to unbalanced audio.

Procedure:

a)	Inject a 1 kHz, +0 dBu signal into the right balanced input (J2).  Measure audio
output at the right unbalanced output (J4).  Adjust R21 (front panel accessible) for 
-10 dBu at J4.  Change the input signal level to +8 dBu.  Verify that a -10 dBu signal
can be obtained at the output jack.  Set the generator for +4 dBu input, and trim the
output level for -10 dBu.

b)	Sweep the signal generator through the audio spectrum.  The signal should be
within 0.2 dB of -10 dBu between 20 Hz and 20 kHz, with the output unterminated.

c)	Measure the total harmonic distortion plus noise at several selected points across
the spectrum.  It should not exceed 0.02%, when measured at 10 dB above nominal
signal level.

d)	Turn the audio signal off.  With a 600Ω termination on the balanced input, the output should read -80 		dBu absolute, when passed through a 20 kHz low pass filter.

e)	Repeat steps a through d for the left channel.


➂	Unbalanced to Balanced Frequency Response and Distortion Measurement

Objective: 	To verify the audio transparency of POD-1 when converting
unbalanced audio to balanced audio.

Procedure:

a)	Inject a 1 kHz, -10 dBu signal into the left unbalanced input (J5).  Measure audio
output at the left balanced output (P1).  Adjust R27 (front panel accessible) for 
+0 dBu at P1.  Adjust R27 and verify that a +8 dBu signal is obtainable at P1.  Set
R27 for +4 dBu output level for -10 dBu input level.

b)	Sweep the signal generator through the audio spectrum.  The signal should be
within 0.2 dB of +4 dBu between 20 Hz and 20 kHz, with the output unterminated.

c)	Measure the total harmonic distortion plus noise at several selected points across
the spectrum.  It should not exceed 0.02%, when measured at 10 dB above nominal
signal level.

d)	Turn the audio signal off.  With a 600Ω termination on the unbalanced input, the
output should read -85 dBu absolute, when passed through a 20 kHz low pass filter.

e)	Repeat steps a through d for the right channel.
















Block Diagram





POD-5 Parts List

Reference Designator	Part Value		Manufacturer		Manufacturer's Part Number


C1	47/50	Phillips	03590015
C2	47/50	Phillips	03590015
C3	0.1/50	Phillips	K104K20X7RFVBWN
C4	220/10	ITT	220M10
C5	47/50	Phillips	03590015

C6	47/50	Phillips	03590015
C7	0.1/50	Phillips	K104K20X7RFVBWN
C8	0.1/50	Phillips	K104K20X7RFVBWN
C9	220/10	ITT	220M10
C10 through C13	0.1/50	Phillips	K104K20X7RFVBWN

C14	0.01	Aselco	CQ92-MC-100-103J
C15 through C18	47/50	Phillips	03590015
C19 through C21	0.1/50	Phillips	K104K20X7RFVBWN
C22 through C25	22P	Phillips	638-10229
C26        	0.1/50	Phillips	K104K20X7RFVBWN

C27	47/50	Phillips	03590015
C28	0.1/50	Phillips	K104K20X7RFVBWN
C29	220/10	ITT	220M10
C30	47/50	Phillips	03590015
C31	47/50	Phillips	03590015

C32	0.1/50	Phillips	K104K20X7RFVBWN
C33	0.1/50	Phillips	K104K20X7RFVBWN
C34	220/10	ITT	220M10
C35 through C38	0.1/50	Phillips	K104K20X7RFVBWN
       C39    	47/50	Phillips	03590015

C40       	47/50	Phillips	03590015
C41    	0.1/50	Phillips	K104K20X7RFVBWN
       C42	0.1/50	Phillips	K104K20X7RFVBWN
C43 through C46	22P	Phillips	638-10229
C47	0.01	Aselco	CQ92-MC-100-103J

C48	0.1/50	Phillips	K104K20X7RFVBWN
C49	47/50	Phillips	03590015
C50 through C53	10/25	ITT	10M25
       C54 	0.1/50	Phillips	K104K20X7RFVBWN
C55	0.1/50	Phillips	K104K20X7RFVBWN

C56	1000/63	Phillips	02118102
C57	1000/63	Phillips	02118102
C58	680/63	Phillips	02118681

D1 through D11  	1N4003	Motorola	1N4003
D12             	1N4748	National	1N4748
D13             	1N4748	National	1N4748
D14             	1N4003	Motorola	1N4003
D15             	1N4003	Motorola	1N4003

DS1	PWR 'ON' LED	Dialight	551-0405

F1	1/4A Secondary Fuse	Littelfuse	251.250

J1 and J2	XLR-3F	Neutrik	
J3 through J6	RCA x 4

P1 and P2	XLR-3M	Neutrik
P3	Power Connector	Panduit

	R1	100K 1% 1/4W Resistor	Phillips	MRS25F
	R2	8K25 1% 1/4W Resistor	Phillips	MRS25F
	R3	7K5 1%  1/4W Resistor	Phillips	MRS25F
	R4	2K Horizontal Trimpot	Piher	PT10V-2K
	R5	100K 5% 1/4W Resistor	Phillips	CR25
Reference Designator	Part Value	Manufacturer	Manufacturer's Part Number


R6	16K2 1% 1/4W Resistor	Phillips	MRS25F
	R7	100K 1% 1/4W Resistor	Phillips	MRS25F
	R8	12K 5% 1/4W Resistor	Phillips	CR25
	R9	100K 1% 1/4W Resistor	Phillips	MRS25F
	R10	8K25 1% 1/4W Resistor	Phillips	MRS25F

R11	7K5 1% 1/4W ResistoR	Philips	MRS25F
R12	2K Potentiometer	Piher	PT10V-2K
R13	100K 5% 1/4W Resistor	Philips	CR25
R14	8K2 5% 1/4W Resistor	Philips	CR25
R15	6K8 5% 1/4W Resistor	Philips	CR25

R16	4K3 5% 1/4W Resistor	Philips	CR25
R17	150K 5% 1/4W Resistor	Philips	CR25
R18	15K 5% 1/4W Resistor	Philips	CR25
R19	4K7 5% 1/4W Resistor	Philips	CR25
R20	4K7 5% 1/4W Resistor	Philips	CR25

R21	2R2 5% 1W Resistor	Philips	R01MF
R22	2R2 5% 1W Resistor	Philips	R01MF
R23	100 5% 1/4W Resistor	Philips	CR25
R24	150K 5% 1/4W Resistor	Philips	CR25
R25	15K 5% 1/4W Resistor	Philips	CR25

R26	4K7 5% 1/4W Resistor	Philips	CR25
R27	4K7 5% 1/4W Resistor	Philips	CR25
R28	2R2 5% 1W Resistor	Philips	R01MF
R29	2R2 5% 1W Resistor	Philips	R01MF
R30	100 5% 1/4W Resistor	Philips	CR25

R31	100K 1% 1/4W Resistor	Philips	MRS25F
R32	100K 1% 1/4W Resistor	Philips	MRS25F
R33	33K2 1% 1/4W Resistor	Philips	MRS25F
R34	33K2 1% 1/4W Resistor	Philips	MRS25F
R35	150K 5% 1/4W Resistor	Philips	CR25

R36	33K2 1% 1/4W Resistor	Philips	MRS25F
R37	33K2 1% 1/4W Resistor	Philips	MRS25F
R38	33K2 1% 1/4W Resistor	Philips	MRS25F
R39	33K2 1% 1/4W Resistor	Philips	MRS25F
R40	2K2 5% 1/4W Resistor	Philips	CR25

R41	33K 5% 1/4W Resistor	Philips	CR25
R42	33K 5% 1/4W Resistor	Philips	CR25
R43	10K 5% 1/4W Resistor	Philips	CR25
R44	13K 5% 1/4W Resistor	Philips	CR25
R45	13K 5% 1/4W Resistor	Philips	CR25

R46	100K 5% 1/4W Resistor	Philips	CR25
R47	5K Potentiometer	Clarostat	10-072
R48	100K 5% 1/4W Resistor	Philips	CR25
R49	20K Potentiometer	Piher	PT10H-20K
R50	100K 1% 1/4W Resistor	Phillips	MRS25F

	R51	8K25 1% 1/4W Resistor	Phillips	MRS25F
R52	7K5 1% 1/4W ResistoR	Philips	MRS25F
R53	2K Potentiometer	Piher	PT10V-2K
R54	100K 5% 1/4W Resistor	Philips	CR25
R55	8K2 5% 1/4W Resistor	Philips	CR25

R56	6K8 5% 1/4W Resistor	Philips	CR25
R57	4K3 5% 1/4W Resistor	Philips	CR25
R58	100K 1% 1/4W Resistor	Phillips	MRS25F
R59	8K25 1% 1/4W Resistor	Phillips	MRS25F
R60	7K5 1% 1/4W ResistoR	Philips	MRS25F

R61	2K Potentiometer	Piher	PT10V-2K
R62	100K 5% 1/4W Resistor	Philips	CR25
R63	8K2 5% 1/4W Resistor	Philips	CR25
R64	6K8 5% 1/4W Resistor	Philips	CR25
R65	4K3 5% 1/4W Resistor	Philips	CR25

R66	150K 5% 1/4W Resistor	Philips	CR25
R67	15K 5% 1/4W Resistor	Philips	CR25
R68	4K7 5% 1/4W Resistor	Philips	CR25
R69	4K7 5% 1/4W Resistor	Philips	CR25

Reference Designator	Part Value	Manufacturer	Manufacturer's Part Number


R70	2R2 5% 1W Resistor	Philips	R01MF

R71	2R2 5% 1W Resistor	Philips	R01MF
R72	100 5% 1/4W Resistor	Philips	CR25
R73	150K 5% 1/4W Resistor	Philips	CR25
R74	15K 5% 1/4W Resistor	Philips	CR25
R75	4K7 5% 1/4W Resistor	Philips	CR25

R76	4K7 5% 1/4W Resistor	Philips	CR25
R77	2R2 5% 1W Resistor	Philips	R01MF
R78	2R2 5% 1W Resistor	Philips	R01MF
R79	100 5% 1/4W Resistor	Philips	CR25
R80	100K 1% 1/4W Resistor	Philips	MRS25F

R81	100K 1% 1/4W Resistor	Philips	MRS25F
R82	33K2 1% 1/4W Resistor	Philips	MRS25F
R83	33K2 1% 1/4W Resistor	Philips	MRS25F
R84	150K 5% 1/4W Resistor	Philips	CR25
R85	33K2 1% 1/4W Resistor	Philips	MRS25F

R86	33K2 1% 1/4W Resistor	Philips	MRS25F
R87	33K2 1% 1/4W Resistor	Philips	MRS25F
R88	33K2 1% 1/4W Resistor	Philips	MRS25F
R89	13K 5% 1/4W Resistor	Philips	CR25
R90	13K 5% 1/4W Resistor	Philips	CR25

R91	5K Potentiometer	Clarostat	10-072
R92	4K7 5% 1/4W Resistor	Philips	CR25
R93	270 5% 3W Resistor	Dale	CW-2B 270
R94	270 5% 3W Resistor	Dale	CW-2B 270
R95	15K 5% 1/4W Resistor	Philips	CR25

R96	15K 5% 1/4W Resistor	Philips	CR25
R97	7K5 5% 1/4W Resistor	Philips	CR25
R98	15K 5% 1/4W Resistor	Philips	CR25
R99	6K8 5% 1/4W Resistor	Philips	CR25
R100	91K 5% 1/4W Resistor	Philips	CR25

R101	7K5 5% 1/4W Resistor	Philips	CR25
R102	10K 5% 3W Resistor	Dale	CW-2B 10K

T1	Power Transformer	Hammond	229C56

U1	Integrated Circuit	National	NE5534N
U2	Integrated Circuit	National	NE5534N
U3	Integrated Circuit	National	LM833N
U4	Integrated Circuit	National	LM833N
U5	Integrated Circuit	Motorola	74HC4053CN

U6	Integrated Circuit	Motorola	74HC4053CN
U7	Integrated Circuit	Motorola	74HC4053CN
U8	Integrated Circuit	National	LM833N
U9	Integrated Circuit	National	NE5534N
U10	Integrated Circuit	National	NE5534N

U11	Integrated Circuit	National	LM833N
U12	Integrated Circuit	Motorola	74HC4053CN
U13	Integrated Circuit	Motorola	74HC4053CN
U14	Integrated Circuit	Motorola	74HC4053CN


Reference Designator	Part Value	Manufacturer	Manufacturer's Part Number
```

## Contents (JSON)

```json
{
 "file": "Products/PODS/POD5/1996 - POD5 - POD5 - GREATER THAN 70 DB BELOW -10 DBU OUTPUT - COMPONENT LAYOUT.wpd",
 "sha256": "5e1b9bed70ccbceef6817d228f0615f5fa1bf6b36c2162e3bcfe1fd9a48539f5",
 "kind": "module",
 "models": [
  "POD5"
 ],
 "year": 1996,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "ADJUSTMENT",
     "kind": "maintenance"
    }
   ]
  }
 ]
}
```
