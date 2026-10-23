# 1995 - M445 - DOC - CONTROL SYSTEM - POWER MANAGEMENT - PARTS LIST (14-305A).wp
Wiki page: [Documents](../../../PAGES/Documents.md)


- **Year:** 1995 (found in this ad: "Issue #1 November 23, 1995")
- **Type:** document scan
- **About:** M445

## Text recovered by OCR

> ﻿ Control System / Power Management Control of the M445 is managed by U12, a one-time programmable (OTP) microcontroller. When power is initially applied, a reset pulse is provided to U12 by R138 and C60. The oscillator consisting of X1, R139, C63 and C64; along with circuitry within U12 begins to free run. The reset pulse transitions to +5 volts; at which time the software programmed within U12 begins to execute. The status of LK2 and LK3 is read. Based on the result (see the operational description), the initial level is sent to the LCD display through P7; and to the audio chain's U11, U2 through U4, and U6 through U8. Integrated circuit U11 receives a mute signal which calibrates it internally. Relays K1 and K2 are also triggered to place them in the correct state for the chosen initial reference. A quadrature signal, received from the rotary encoder on SA14-304; is read and interpreted by the microcontroller. By rotating the encoder clockwise, the reference level is increased. Counter-clockwise rotation reduces the reference level. Connector P10 and LK1 are for factory use only. These connectors are used to test the meter's function when first manufactured. Improper use may result in loss of M445 function. The SA14-305 is powered by 4 'AA' NiCd batteries, connected in series through P9 pins 4 and 5. The batteries are always connected to U13, a fast charge controller. The charge controller maintains a time and voltage charge to the batteries whenever it is furnished with +24 volts at P8. Battery voltage is monitored by a window detector realized by U16 and associated components. The output of U16A sends a low battery indication to U12, which displays the "lo bat" signal in the LCD display. When the voltage decreases to a point where the M445 can no longer function accurately, U16B generates a signal. This allows U12 to disable the meter's audio path, and displays the recharge necessary indication, as detailed in the operations section. The audio circuitry within the meter requires bipolar power. To generate a negative voltage from the batteries, a small inverting switching power supply is utilized. This consists of U14, U15, Q13, and associated components. When the M445 is powered from +24 volts DC, integrated circuit regulator U18 generates +5 volts DC to power the meter as though it was running off of batteries. Note: WBS recommends the use of the supplied NiCd batteries at all times. If it becomes necessary to utilize batteries which are not those supplied; you must remove LK4. Removing LK4 will disable the charging circuit. Any damage caused to the M445 through failure to observe this recommendation is not covered under warranty. Audio Circuitry Both the left and right channels function similarly. This discussion will pertain to the left channel. Differences with the right channel will be noted as necessary. The M445, owing to it's large input sensitivity range, uses three different input amplifiers to spread across the full sensitivity ra
- **Original file:** `WBSps.env/wbsPS-NOT UPLOADED/WBSps - Word Perfect Manuals-20221115T024240Z-001/WBSps - Word Perfect Manuals/14-305A.WP`
- **SHA-256:** `29266381bbbcd1c2d4d91d8c4dd813e5a99a8e295de5cb912803b0690326f048`
- **Size:** 69,604 bytes
- **Pages:** 1

## Dates found in this file

- **1995** (manual_issue): `Issue #1 November 23, 1995` — …timum equipment performance. SA14-305A MOTHERBOARD ASSEMBLY Issue #1 November 23, 1995 MW94002/14-305A.WP…

## Full text

### Page 1 (office)

```text
﻿

Control System / Power Management

Control of the M445 is managed by U12, a one-time programmable (OTP) microcontroller.

When power is initially applied, a reset pulse is provided to U12 by R138 and C60.  The oscillator consisting of X1, R139, C63 and C64; along with circuitry within U12 begins to free run.  The reset pulse transitions to +5 volts; at which time the software programmed within U12 begins to execute.

The status of LK2 and LK3 is read.  Based on the result (see the operational description), the initial level is sent to the LCD display through P7; and to the audio chain's U11, U2 through U4, and U6 through U8.  Integrated circuit U11 receives a mute signal which calibrates it internally.  Relays K1 and K2 are also triggered to place them in the correct state for the chosen initial reference.

A quadrature signal, received from the rotary encoder on SA14-304; is read and interpreted by the microcontroller.  By rotating the encoder clockwise, the reference level is increased.  Counter-clockwise rotation reduces the reference level.

Connector P10 and LK1 are for factory use only.  These connectors are used to test the meter's function when first manufactured.  Improper use may result in loss of M445 function.

The SA14-305 is powered by 4 'AA' NiCd batteries, connected in series through P9 pins 4 and 5.  The batteries are always connected to U13, a fast charge controller.  The charge controller maintains a time and voltage charge to the batteries whenever it is furnished with +24 volts at P8.  

Battery voltage is monitored by a window detector realized by U16 and associated components.  The output of U16A sends a low battery indication to U12, which displays the "lo bat" signal in the LCD display.  When the voltage decreases to a point where the M445 can no longer function accurately, U16B generates a signal. This allows U12 to disable the meter's audio path, and displays the recharge necessary indication, as detailed in the operations section.

The audio circuitry within the meter requires bipolar power.  To generate a negative voltage from the batteries, a small inverting switching power supply is utilized.  This consists of U14, U15, Q13, and associated components.

When the M445 is powered from +24 volts DC, integrated circuit regulator U18 generates +5 volts DC to power the meter as though it was running off of batteries.

Note:

WBS recommends the use of the supplied NiCd batteries at all times.  If it becomes necessary to utilize batteries which are not those supplied; you must remove LK4.  Removing LK4 will disable the charging circuit.  Any damage caused to the M445 through failure to observe this recommendation is not covered under warranty.



Audio Circuitry

Both the left and right channels function similarly.  This discussion will pertain to the left channel.  Differences with the right channel will be noted as necessary.

The M445, owing to it's large input sensitivity range, uses three different input amplifiers to spread across the full sensitivity range.

The first amplifier; comprised of U1 sections A and B, is an instrumentation amplifier input stage with a gain of +25 dB.  Magnetically latched relay K1 controls audio flow into this amplifier, while U2 controls the output signal into U5 section A and B.  This amplifier stage is active for front panel sensitivity settings of -60 dB to   -35 dB.

The second amplifier consists of U3 and associated components.  This is essentially a unity gain stage, which also has it's input assigned by K1.  Analog multiplexer U3 simply switches the signal into U5 or not for front panel sensitivities from -34 dB to 0 dB.

A loss stage; consisting of U4 and it's input pad, manages input sensitivities from +1 to +30 dB.

Audio which is amplified (or attenuated) by these first three stages is switched into U5 section A and B, where it is unbalanced and either attenuated by 10 dB, or transmitted with no net gain into the high pass filter switch and the filter itself.  The high pass filter is a third order butterworth filter with a -3dB point at 75Hz.  Switch SW4 determines which signal, broadband or filtered enters U11.

The CS3310 (U11), is a Stereo Digital Volume Control.  Internally; U11 contains two ladders which are digitally controlled by a 16 bit control word.  The control word is fed serially from the microprocessor to pin 3 of U11.  All level transitions are internally timed to occur at audio zero crossings, eliminating the "zipper" effect.  The gain structure of the M445 is set up so that a nominal -15 dBu level at the output of U11 will generate a 0 VU signal on the front panel meter.

The output of U11 is switched through SW3, which controls the mixing of L+R and L-R signals; if selected.  The audio signal is then amplified by U9C (+13 dB).  Amplifier U10B generates a balanced audio signal which is coupled to the meter, rear panel outputs and the front panel headphone jack through a series of buildout resistors.
C1	Capacitor	22 uF/25V 		Siemens	85200
C2		"	22 uF/25V 			"		"
C3		"	10 uF/50V	 	Nichicon	UES1H100MPJ
C4		"	10 uF/50V 			"		"
C5		"	330 pF		Philips	638-03331

C6		"	22 pF			"	638-10229
C7		"	22 pF			"		"
C8		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C9		"	22 pF		Philips	638-10229
C10		"	10 uF/25V 		ITT	10M25

C11		"	10 uF/25V 			"		"
C12		"	22 pF		Philips	638-10229
C13		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C14		"	0.1 uF/100V		"		"
C15		"	22 pF		Philips	638-10229

C16		"	10 uF/25V 		ITT	10M25
C17		"	10 uF/25V 			"		"
C18		"	22 pF		Philips	638-10229
C19		"	10 uF/50V	 	Nichicon	UES1H100MPJ
C20		"	10 uF/50V 			"		"

C21		"	330 pF 		Philips	638-03331
C22		"	22 pF			"	638-10229
C23		"	22 pF			"		"
C24		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C25		"	0.1 uF/100V		"		"

C26		"	0.1 uF/100V		"		"
C27		"	0.068 uF/100V	Aselco	CQ92-MC-100-802M
C28		"	0.068 uF/100V		"		"
C29		"	0.068 uF/100V		"		"
C30		"	33 uF/16V 		ITT	33M16

C31		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C32		"	10 uF/25V 		ITT	10M25
C33		"	10 uF/25V 			"		"
C34		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C35		"	0.1 uF/100V		"		"    

C36		"	10 uF/25V 		ITT	10M25
C37		"	0.1 uF/100V	Sprague	1C10X7R104M050B     
C38		"	220 uF/10V 	ITT	220M10
C39		"	22 pF		Philips	638-10229
C40		"	10 uF/25V 		ITT	10M25

C41	Capacitor	10 uF/25V 		ITT	10M25
C42		"	10 uF/25V 			"		"
C43		"	22 pF		Philips	638-10229
C44		"	0.068 uF/100V		"		"
C45		"	0.068 uF/100V		"		"

C46		"	0.068 uF/100V		"		"
C47		"	33 uF/16V 		ITT	33M16
C48		"	220 uF/10V 	ITT	220M10
C49		"	22 pF		Philips	638-10229
C50		"	22 pF			"		"

C51		"	22 pF			"		"
C52		"	10 uF/25V 		ITT	10M25
C53		"	22 pF		Philips	638-10229
C54		"	1000 uF/16 V	Nichicon	TVX1C102MCA
C55		"	1000 uF/16 V		"		"

C56		"	1000 uF/16 V		"		"
C57		"	1000 uF/16 V		"		"
C58		"	22 uF/35V 		ITT	22M35
C59		"	22 uF/35V 			"		"
C60		"	0.1 uF/100V	Sprague	1C10X7R104M050B

C61		"	0.1 uF/100V		"		"    
C62		"	47 uF/25V 		Philips	03556479
C63		"	22 pF		Philips	638-10229
C64		"	22 pF			"		"
C65		"	0.1 uF/100V	Sprague	1C10X7R104M050B

C66		"	22 uF/25V 		Siemens	85200
C67		"	1 uF35V 		ITT	1M35
C68		"	0.01 uF/100V	Aselco	CQ92-MC-100-103J
C69		"	22 uF/25V 		Siemens	85200
C70		"	1000 pF/100V	Aselco	CQ92-MC-100-102M

C71		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C72		"	0.1 uF/100V		"		"    
C73		"	330 pF		Philips	638-03331
C74		"	220 uF/40 V		"	032-17221
C75		"	1000 uF/16 V	Nichicon	TVX1C102MCA

C76		"	220 uF/25 V	Philips	02136221
C77		"	0.1 uF/100V	Sprague	1C10X7R104M050B
C78		"	1 uF35V 		ITT	1M35
C79		"	1 uF35V 			"		"
C80		"	220 uF/25 V	Philips	02136221


C81	Capacitor	10 uF35V 		ITT	10M35
C82		"	150 pF		Philips	638-70151
C83		"	1 uF35V 		ITT	1M35  
C84		"	10 uF35V 			"	10M35
C85		"	150 pF		Philips	638-70151

C86		"	1 uF35V 		ITT	1M35  
C87		"	22 uF/25V 		Siemens	85200
C88		"	0.1 uF/100V	Sprague	1C10X7R104M050B   
C89		"	0.1 uF/100V		"		" 
C90 To C93		"	SOT

C94		"	0.047 uF/100V	Aselco	CQ92-MC-100-473M  
C95		"	0.047 uF/100V		"		"
C96		"	0.047 uF/100V		"		"
C97		"	220 uF/10V 	ITT	220M10

CR1 To CR4 	Diode			National	1N4003
CR5 To CR8		"				"	1N746A
CR9 To CR16		"				"	1N4148    
CR17 To CR20		"				"	1N746A
CR21 To CR36		"				" 	1N4148           

CR37  		"				"	1N4003           
CR38		"				"	1N4148   
CR39              		"				"	1N5822 
CR40  		"				"	1N4003                
CR41  		"				"	   "

CR42  		"				"	1N5822 
CR43  		"				"	1N4003                
CR44  		"				"	   "
CR45 To CR54		"				"	1N4148
CR55  		"				"	1N4003    
   
Q1 To Q5	Transistor			National           	 2N3904           
Q6		"				"	 2N3906           
Q7		"				"	 2N3904
Q8		"				"	 2N3906           
Q9		"				"	 2N3904           

Q10		"				"	 2N3906           
Q11		"				"	 2N3904           
Q12 		"				"	 2N3906           
Q13		"				"	 2N6730           
Q14		"			Motorola	 TIP29B


Q15	Transistor			National	 2N3904           
Q16		"			Motorola	 TIP30B
Q17 To Q28		"			National	 2N3904           

R1 To R8	Resistor	1/4W 5%	10K	Philips	CR25
R9		"	3W 5%	600	Dale	CW-2B
R10		"	3W 5%	150		"		"
R11		"	1/4W 5%	470K	Philips	CR25
R12		"	1/4W 5%	470K

R13		"	1/4W 5%	47K		"		"
R14		"	1/4W 1%	15K		"	MRS25F
R15		"	1/4W 1%	6K8		"		"
R16		"	1/4W 1%	15K		"		"
R17		"	1/4W 1%	2K43		"		"

R18		"	1/4W 1%	15K		"		"
R19		"	1/4W 5%	47K		"	CR25
R20 To R23		"	1/4W 1%	47K5		"	MRS25F
R24		"	1/4W 1%	82K5		"		"
R25		"	1/4W 1%	47K5		"		"

R26		"	1/4W 1%	2K87		"	   "
R27		"	1/4W 1%	2K87		"		"
R28		"	1/4W 1%	82K5		"		"
R29  		"	1/4W 1%	47K5		"		"
R30		"	1/4W 1%	15K		"		"

R31		"	1/4W 1%	15K		"		"
R32		"	1/4W 1%	47K5		"		"
R33		"	1/4W 2%	22K		"		"
R34		"	SOT 
R35		"	3W 5%	600	Dale	CW-2B

R36		"	3W 5%	150		"		"
R37 		"	1/4W 5%	470K	Philips	CR25
R38		"	1/4W 5%	470K		"		"
R39		"	1/4W 5%	47K		"		"
R40		"	1/4W 1%	15K		"	MRS25F

R41		"	1/4W 1%	6K8		"		"
R42		"	1/4W 1%	15K		"		"
R43		"	1/4W 1%	2K43		"		"
R44		"	1/4W 1%	15K		"		"
R45		"	1/4W 5%	47K		"	CR25



R46 To R49	Resistor	1/4W 1%	47K5	Philips	MRS25F
R50		"	1/4W 1%	82K5		"		"
R51		"	1/4W 1%	47K5		"		"
R52		"	1/4W 1%	2K87		"		"
R53		"	1/4W 1%	2K87		"		"

R54		"	1/4W 1%	82K5		"		"
R55		"	1/4W 1%	47K5		"		"
R56 		"	1/4W 1%	15K		"		"
R57 		"	1/4W 1%	15K		"		"
R58		"	1/4W 1%	47K5		"		"

R59		"	1/4W 2%	22K		"		"
R60		"	SOT 
R61		"	1/4W 5%	56K		"	CR25
R62		"	1/4W 5%	82K		"		"
R63		"	1/4W 5%	36K		"		"

R64		"	1/4W 5%	100K		"		"
R65		"	1/4W 5%	100		"		"
R66		"	1/4W 1%	10K		"	MRS25F
R67		"	1/4W 1%	30K1		"		"
R68		"	1/4W 1%	2K43		"		"

R69	Potentiometer	5K	Piher	PT10V-5K
R70	delete
R71	delete
R72	Resistor	1/4W 1%	10K	Philips	MRS25F
R73		"	1/4W 5%	100K		"	CR25

R74		"	1/4W 5%	36K		"		"
R75		"	1/4W 5%	56K		"		"
R76		"	1/4W 5%	82K		"		"
R77		"	1/4W 5%	100K		"		"
R78		"	1/4W 5%	100K		"		"

R79		"	1/4W 5%	100K		"		"
R80		"	1/4W 1%	30K1		"	 MRS25F
R81		"	1/4W 1%	30K1		"		"
R82		"	1/4W 1%	10K		"		"
R83		"	1/4W 1%	10K		"		"

R84	delete
R85	Potentiometer	5K	Piher	PT10V-5K
R86	delete
R87	Resistor	1/4W 1%	2K43	Philips	MRS25F
R88	Potentiometer	5K	Piher	PT10V-5K

R89	Resistor	1/4W 1%	20K	Philips	MRS25F
R90		"	1/4W 1%	28K7		"		"
R91		"	1/4W 5%	20K		"	CR25
R92		"	1/4W 5%	47		"		"
R93		"	1/4W 5%	47		"		"

R94		"	1/4W 5%	20K		"		"
R95		"	1/4W 1%	20K		"	MRS25F
R96		"	1/4W 1%	20K		"		"
R97		"	1/4W 5%	20K		"	CR25
R98		"	1/4W 5%	47		"		"   

R99		"	1/4W 5%	47		"		"
R100		"	1/4W 5%	20K		"		"   
R101		"	1/4W 1%	20K		"	MRS25F
R102		"	1/4W 1%	28K7		"		"
R103		"	1/4W 5%	20K		"	CR25

R104		"	1/4W 5%	47		"		"   
R105		"	1/4W 5%	47		"		"
R106		"	1/4W 5%	20K		"		"   
R107		"	1/4W 1%	20K		"	MRS25F
R108		"	1/4W 1%	20K		"		"

R109		"	1/4W 5%	20K		"	CR25
R110		"	1/4W 5%	47		"		"   
R111		"	1/4W 5%	47		"		"
R112		"	1/4W 5%	20K		"		"   
R113		"	1/4W 5%	30		"		"   

R114		"	1/4W 5%	30		"		"
R115		"	1/4W 5%	100K		"		"   
R116		"	1/4W 5%	100K		"		" 
R117		"	1/4W 5%	30		"		"   
R118		"	1/4W 5%	30		"		"

R119		"	1/4W 5%	100K		"		"   
R120		"	1/4W 5%	100K		"		"
R121		"	1/4W 5%	1K8		"		"   
R122		"	1/4W 5%	1K8		"		" 
R123		"	1/2W 5%	300		"	SFR25 HJ

R124		"	1/2W 5%	300		"		"
R125		"	1/4W 5%	1K8		"	CR25
R126		"	1/4W 1%	1K8		"	MRS25F
R127 To R130		"	1/4W 1%	100K		"		"


R131	SIP Resistor		39K	Bourns	15-014
R132		"		39K		"		"
R133		"		82		"	15-001
R134		"		82		"		"
R135 	Resistor	1/4W 5%	39K	Philips	CR25

R136	SIP Resistor		39K	Bourns	15-014
R137	Resistor	1/4W 5%	39K	Philips	CR25
R138		"	1/4W 5%	100K		"		"   
R139		"	1/4W 5%	10M		"		"
R140		"	1/4W 5%	15K		"		"   

R141		"	1/4W 5%	15K		"		"
R142		"	1/4W 5%	150		"		"   
R143		"	1/4W 5%	3K		"		"
R144	delete 
R145	delete 

R146	delete 
R147		"	1/4W 5%	1.5		"		"   
R148		"	1/4W 5%	120K		"		"
R149		"	1/4W 5%	12K		"		"
R150	Resistor	1/4W 5%	100K	Philips	CR25        

R151		"	1/4W 5%	120K		"	
R152 To R155		"	1/4W 5%	100K		"		"   
R156		"	1/4W 5%	3K3		"	
R157		"	1/4W 5%	1K		"		"   
R158		"	3W 5%	150	Dale	CW-2B

R159		"	1/4W 5%	750	Philips	CR25
R160		"	1/4W 5%	240		"		"
R161		"	1/4W 1%	15K		"	MRS25F
R162		"	1/4W 1%	20K		"		"
R163		"	1/4W 5%	12K		"	CR25

R164		"	1/4W 1%	15K		"	MRS25F
R165		"	1/4W 1%	30K1		"		"
R166		"	1/4W 5%	10K		"	CR25     
R167		"	1/4W 5%	10K		"	    " 
R168		"	1/4W 5%	5K1		"	    " 

R167		"	1/4W 5%	10K		"	    " 
R169		"	1/4W 5%	10K		"	    " 
R170  		"	1/4W5%	10K		"		"
R171	Potentiometer	5K	Piher	PT10H-5K  


R172	Resistor	1/4W 5%	5K1	Philips	CR25
R173		"	1/4W 5%	47K		"		"   
R174		"	1/4W 5%	9K1		"		"
R175		"	1/4W 5%	47K		"		"   

R176		"	1/4W 1%	15K		"	MR25F
R177		"	1/4W 5%	1K1		"	CR25 
R178		"	1/4W 1%	10K		"	MR25F
R179		"	1/4W 1%	10K		"	
R180		"	1/4W 5%	 1K		"	CR25 

R181		"	1/4W 1%	1M		"	MR25F
R182		"	1/4W 1%	1M		"		"
R183		"	1/4W 5%	1K6		"	CR25 
R184 To R189	Potentiometer	20K	Piher	PT10H-20K 
R190 To R195	Resistor	1/4W 5%	47K 	Philips	CR25

R196	Resistor	1/4W 5%	12K		"		"
R197		"	1/4W 5%	18K 		"		"   
R198 To R200		"	1/4W 5%	30K		"		"
R201		"	1/4W 5%	18K		"		"   
R202		"	1/4W 5%	62K		"		"   

R203		"	1/4W 5%	47K		"		"
R204		"	1/4W 5%	33K		"		"   
R205		"	1/4W 5%	18K   		"		"
R206		"	1/4W 5%	12K    		"		"   
R207		"	1/4W 5%	5K6  		"		"

R208		"	1/4W 5%	10K		"		"   
R209		"	1/4W 5%	10K   		"		"
R210		"	1/4W 5%	5K1    		"		"          
R211		"	1/4W 5%	10K		"	    "
R212		"	1/4W 5%	10K		"	    "
   
R213	Potentiometer	5K	Piher	PT10H-5K  
R214	Resistor	1/4W 5%	5K1	Philips	CR25
R215		"	1/4W 5%	47K		"		"    
R216		"	1/4W 5%	9K1		"		"       
R217		"	1/4W 5%	47K		"		"    

R218		"	1/4W 1%	15K		"	MR25F
R219		"	1/4W 5%	1K1		"	CR25       
R220		"	1/4W 1%	10K		"	MR25F
R221		"	1/4W 1%	10K		"		"
R222		"	1/4W 5%	1K		"	CR25


R223	Resistor	1/4W 1%	1M	Phillips	MR25F
R224		"	1/4W 1%	1M		"		"
R225		"	1/4W 5%	1K6		"	CR25
R226 To R231	Potentiometer	20K	Piher	PT10H-20K  
R232 To R237	Resistor	1/4W 5%	47K     	Philips	CR25

R238		"	1/4W 5%	12K		"		"           
R239		"	1/4W 5%	18K   		"		"
R240 To R242		"	1/4W 5%	30K    		"		"          
R243		"	1/4W 5%	18K		"	    "
R244		"	1/4W 5%	62K     		"	    "

R245		"	1/4W 5%	47K 		"		"           
R246		"	1/4W 5%	33K     		"		"
R247		"	1/4W 5%	18K    		"		"          
R248		"	1/4W 5%	12K		"	    "
R249		"	1/4W 5%	5K6        		"	    "

R250	SOT
R251	SOT

K1, K2	Relay			Omron	GGAK234PSTUSDC5
K3		"			ITT	RZ-24W-C

L1, L2	Choke			Delevan	1537-76
L3	Filter Inductor		E.C.	80-36

LK1 To LK4	Link			Berg	65645-202

305P1	Connector,	6 Pos St.Post	Panduit	MLSS-100-6
305P2		"	"	"		"		"
305P3 		"	3 Pos St.Post		"	MLSS-100-3
305P4		"	"	"		"		"
305P5		"	"	"		"		"

305P6		"	"	"		"		"
305P7 		"	6 Pos St.Post		"	MLSS-100-6
305P8 		"	26 Pin , 2x13 Male	Berg	929665-01-13
305P9 		"	6 Pos St.Post	Panduit	MLSS-100-6
305P10		"	4 Pin Header 	Berg	65645-104

305P11		"	6 Pos St.Post	Panduit	MLSS-100-6
305P12 		"	3 Pos St.Post		"	MLSS-100-3





SW1	Switch			Schadow	2CF-GHT-AA 
SW2               		"				"	   "                         
SW3		"				"	4CF-GHT-AA
SW4               		"				"	2CF-GHT-AA 
SW5               		"				"		"

U1	Inegrated Circuit	Analog Devices	OP492GP  
U2 To U4		"	"	Motorola	74HC4053CN
U5		"	"	Analog Devices	OP492GP   
U6 To U8		"	"	Motorola	74HC4053CN    
U9		"	"	Analog Devices	OP492GP   

U10		"	"		"		"
U11		"	"	Crystal Semiconductor	CS3310P    
U12		"	"	Motorola	MC68HC711E9CFN2
U13		"	"	Maxim	MAX713CPE  
U14		"	"	National	LM393N    

U15		"	"		"	LM385Z    
U16		"	"		"	LM393N                       
U17		"	"		"	LM385Z          
U18		"	"		"	LM317T         
U19		"	"		"	LF353N      

U20		"	"		"	LF353N    
U21		"	"		"	LF393N   
U22		"	"		"	LF353N     
U23		"	"		"	LF353N 
 
XT1	Crystal, 4000 MHz	Fox		FOX040-HC49U
PARTS LIST

SA14-305A MOTHERBOARD ASSEMBLY



MISCELLANEOUS COMPONENTS



USED ON		DESCRIPTION			MFGMFG PART­ NUMBER

PCB		Printed Circuit Board		WBS	14-305

Q16		Heat Sink 		Aavid	577102

Q14, Q16, U18		TO220 Single Insulator		Bergquist	K4-58
Insulating Shoulder Washer		Motorola	B51547F019

SW1-SW4		Lens Cap, Black/White		Schadow	FA201-BL/WH

SW5		Lens Cap, Black/Red		Schadow	FA201-BL/RD

SW1-SW5		Switch Frame		WBS	445-024

LK2-LK4		2 Pin Jumper		Aptronics	929955-06

U14, U16,		8 Pin Dip Socket		Amp	640463-3
U19 To U23

U1, U5,		14 Pin Dip Socket		Amp	640357-3
U9, U10

U2 To U4,		16 Pin Dip Socket		Amp	640358-3
U6 To U8, U11,U13

U12		52 Pin Square Socket		 "	82155-1
WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance.
SA14-305A MOTHERBOARD ASSEMBLY




Issue #1
November 23, 1995
MW94002/14-305A.WP
```

## Contents (JSON)

```json
{
 "file": "Modules/METER/M445/1995 - M445 - DOC - CONTROL SYSTEM - POWER MANAGEMENT - PARTS LIST (14-305A).wp",
 "sha256": "29266381bbbcd1c2d4d91d8c4dd813e5a99a8e295de5cb912803b0690326f048",
 "kind": "doc",
 "models": [
  "M445"
 ],
 "year": 1995,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "dates": [
    {
     "year": 1995,
     "kind": "manual_issue",
     "text": "Issue #1 November 23, 1995"
    }
   ]
  }
 ]
}
```
