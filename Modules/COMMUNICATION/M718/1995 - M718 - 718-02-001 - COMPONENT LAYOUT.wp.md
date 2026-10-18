# 1995 - M718 - 718-02-001 - COMPONENT LAYOUT.wp
Wiki page: [M718](../../../PAGES/M718.md)


- **Year:** 1995 (found in this file: "Issue #1 March 30, 1995")
- **Module:** M718
- **Category:** COMMUNICATION
- **Module year estimate:** 1995 — manual_issue "Issue #1 March 30, 1995" in WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M718.WP
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M718.WP`
- **SHA-256:** `756347c755f74c0646729efff344d8968f5dc39ca703e7f833f89a210ddf1710`
- **Size:** 59,733 bytes
- **Pages:** 1

## Dates found in this file

- **1995** (manual_issue): `Issue #1 March 30, 1995` — …le all buffers X X X X 1 1 1 1 M718 TALKBACK ADDRESS MODULE Issue #1 March 30, 1995 MW94001/M718 .wp…

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M718 TALKBACK ADDRESS MODULE


SECTION									PAGE	


Warranty

1	Technical Data						1-1
2	General							2-1
3	Circuit Description						3-1 to 3-2
Tables 1, 2, 3						
4	Parts List							4-1 to 4-3
5	Connector Layout						5-1		

6	Drawings:
Schematic							C 718-02-001
Component Layout						B 718-06-001
TECHNICAL DATA

M718 TALKBACK ADDRESS MODULE



Logic Level:			HC Logic Levels with a 5 volt supply.

Control Inputs:			Logic 0 - less than 1.1 volts and greater than 0 volts
Logic 1 -  greater than 3 volts and  less than 24 volts

Control Outputs:			Open collector busy tally - 24 volts at 30 mA.
Mute & Talkback relays- 30 volts at 100 mA.
Talkback Address - Standard HC logic.

Power Requirements:		+10 to +25 volts dc, unregulated, 70 mA.

Circuit Protection:		0.5 Amp fuse, current limiting regulator and over voltage protecting Zener diode.

Ambient Temperature:		0  to 50 degrees Celsius.

Dimensions:			0.7"  wide x 4.40" high x 11" deep.

Weight:			180 grams (6.4 ounces).

GENERAL

M718 TALKBACK ADDRESS MODULE



The M718 module generates a talkback address for consoles that require a 4 bit binary address code. The module is capable of multiplexing 16 external keys and tally LEDs for address selection.

A separate talkback input enables the output of the four bit binary address. Three additional inputs are provided to send three corresponding preset address remotely. Three binary coded rotary switches on the front edge of the card provide selection of the preset address.
The module provides two form C relay contacts that are activated when one of the talkback or remote address inputs are activated and four form C relay contacts that are activated when one of the talkback or remote address or Mic On inputs is activated.

One control input is provided to control an open collector output which may be used for tally LEDs that cannot be driven by standard logic gates.

The M718 is self contained in that it has its own switching regulator that can run off +24V unregulated .
Inputs

The talkback control inputs activate the talkback relay K1,the mute relay K2 and signal the microcontroller to output the current talkback address.  When one or more of edge connector pins 8, 10, 12 or 14 is grounded, pin 4 of U7B goes high turning on both Q1 and Q2 which activate K1 and K2.

The remote address control inputs activate the talkback relay K1, the mute relay K2, signal the microcontroller to read the corresponding preset address switch, change the display to reflect the new talkback address and output the new talkback address.  When remote address 1 control input (edge connector pin 4) is grounded the talkback address is set to that of the preset address on SW1.

The mic on control inputs only activate the mute relay K2. When one or more of edge connector pins 7, 9, 11 or 13 are grounded, pin 8 of U8D goes high which turns on Q2 and activates K2.

The M718 can have up to 16 address selector keys.  The keys should be wired in an eight row by two column matrix as shown in schematic C 718-02-001.  The diodes are to prevent damage to the outputs of U3 in the event that two keys in the same column are pressed with one key being on a row that has a high output and the other on a row that has a low output.  The address selector keys only select the current talkback address.  The talkback address is not output until one of the talkback control inputs or remote address control inputs is grounded.

The busy tally input activates the open collector busy tally output. When edge connector pin 3 is grounded, pin 12 of U7F goes high and Q3 turns on.





Outputs

The talkback relay K1 has two form C contacts.  The mute relay K2 has four form C contacts.  Both are capable of switching 30 volts dc at 100 mA.

The busy tally output on edge connector pin 33 is an open collector output capable of sinking 30 mA.

The talkback address output is a four bit binary code with the LSB on edge connector pin 54 and the MSB on edge connector pin 48.

Talkback Address Keys

The address selector keys and their tally LEDs are multiplexed to reduce the number of inputs and outputs.  To scan the keyboard, the 1 of 8 decoder U3 drives one of the rows (edge connector pins 39, 41 ... 53) low while the rest remain high.  Edge connector pins 46 and 44 can only be pulled low by the switches connected to the row that is driven low by U3. Note that the display is turned off while scanning the keyboard by turning off Q4 and Q5.  Thus for the microcontroller U1 to scan the keyboard it must set the upper 2 bits of its port B (B6 & B7) as outputs and keep them both high so that Q4 and Q5 remain off.  Bits B4 and B5 are set as inputs so that U1 can read the status of edge connector pins 46 and 44.  Bits B0, B1 B2 and B3 are set as outputs with B3 held low to enable decoder U3 and buffer U6A.  B0, B1 and B2 select which row is driven low by U3.

See table 1 for the values that the microcontroller U1 writes to port B in order for U3 to drive a specific row of the keyboard low.

The display works in a manner similar to the keyboard in that U3 drives a single row low but in order to turn on an LED either Q4 or Q5 must be turned on.  See table 2 for the values that the microcontroller U1 writes to port B in order to turn on a specific LED.  Note that when B7 of U1 is low Q4 in turned on which enables the first column of the display.  When B6 of U1 is low Q5 is turned on enabling the second column of the display.


Reading Inputs and Remote Addresses

In addition to scanning the rows of the keyboard, the microcontroller U1 reads the state of the talkback and remote address control inputs.  U1 sets the upper four bits of its port B (B4, B5, B6 & B7) as inputs and the lower four bits of port B (B0, B1, B2 & B3) as outputs.  U1 then writes a value to port B (see table 3) selecting the remote inputs by enabling U4A.  The state of the talkback and remote address control inputs is then read on the upper bits of port B.  If any of the talkback inputs are grounded then the current talkback address is output on port A of U1.  (Buffer U6B protects the port A pins of U1 and provides more drive capability for the talkback address outputs.)  If the remote address 1 control input (edge connector pin 4) is grounded then the microcontroller U1 writes a value (see table 3) to its port B to select SW1 by enabling U4B.  U1 then reads the state of SW1 (remote address 1 selector) on the upper bits of its port B and outputs this address on its port A.

Power Supply

The +10 to +25 volts dc applied at pin 1 of the edge connector is supplied to the switching regulator U9 through fuse F1, filtering capacitor C10 and protection circuitry CR23 and R51.

U9 is operating as a step-down switching regulator with L1 and C11 providing a low-pass filtered output from the regulator.  CR24 is the commutating diode for the switching regulator U9.

The output is sensed by R52 through R55.  This is used as the error correction voltage by U9.  R53 should be adjusted to provide +5 volts +/- 0.1 volts from the power supply.

CR25 provides further protection for the logic circuitry in the event of U9 failure.
C1	Capacitor	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C2		"	0.1 uF/100 V		"		"
C3		"	0.1 uF/100 V		"		"
C4		"	0.1 uF/100 V		"		"
C5		"	0.1 uF/100 V		"		"

C6		"	330 pF		Philips	638-03331
C7		"	22 uF/25 V	Siemens	85200
C8		"	SOT
C9		"	SOT
C10		"	220 uF/40 V	Philips	03217221

C11		"	1000 uF/10 V	S.M.	SM10VB102M12X20LL
C12		"	0.1 uF/100 V	Sprague	K104K20X7RFVBWN
C13		"	0.1 uF/100 V		"		"
C14		"	0.1 uF/100 V		"		"
C15		"	0.1 uF/100 V		"		"

C16		"	0.1 uF/100 V		"		"

CR1 to CR13	Diode			Motorola	1N4148
CR14		"				"	1N4003
CR15 to CR20	"				"	1N4148

CR21		"				"	1N4003
CR22		"				"	1N4148
CR23		"				"	1N5822
CR24		"				"	1N5822
CR25		Zener Diode, 6.8V			"	1N5342B

DS1	LED, Green		Dialight	555-2301 GN

F1	Fuse, 0.500 amp		AGC	AGC.500

K1	Relay 24V			ITT	RZ-24W-C
K2	Relay, 24V, 4PDT		Omron	G6A-434P-ST-US-24VDC

L1	Filter Inductor, 50 uH	Hammond	80-36	

Q1	Transistor			National	2N6731
Q2		"				"		"
Q3		"				"		"
Q4		"				"	2N3906
Q5		"				"		"

SW1 to SW3	Switch, Rotary		NKK	DRFR16H


R1	SIP Resistor Network	10K	Bourns	WBS 15-002
R2 to R6	Resistor	1/4W 5%	3K3 ohm	Philips	CR25
R7	SIP Resistor Network	39K	Bourns	WBS 15-014
R8	Resistor	1/4W 5%	39K	Philips	CR25
R9		"		4K7		"		"
R10		"		4K7		"		"

R11		"		3K3		"		"
R12		"		39K		"		"
R13		"		4K7		"		"
R14		"		4K7		"		"
R15		"		4K7		"		"

R16		"		100		"		"
R17		"		100K		"		"
R18	SIP Resistor Network	39K	Bourns	WBS 15-014
R19		"	"	39K		"
R20 to R23	Resistor	1/4W 5%	100	Philips	CR25

R24	SIP Resistor Network	39K	Bourns	WBS 15-014
R25		"	"	39K		"
R26	Resistor	1/4W 5%	3K3	Philips	CR25
R27		"		3K3		"		"
R28		"		10K		"		"

R29		"		47		"		"
R30		"		47		"		"
R31		"		10K		"		"
R32		"		SOT
R33		"		SOT

R34	Resistor	1/4W 5%	22K	Philips	CR25
R35		"		22K		"		"
R36		"		4K7		"		"
R37		"		4K7		"		"
R38		"		100		"		"

R39		"		100		"		"
R40		"		39K		"		"
R41to R48		"		100		"		"
R49		"		4K7		"		"
R50		"		4K7		"		"

R51		"	5W	1 ohm	Dale	CW-5-5
R52		"	1/4W 5%	3K9	Philips	CR25
R53	Potentiometer	500	Piher	PT10V-500
R54	Resistor	1/4W 5%	1K	Philips	CR25

R55	Resistor	1/4W 5%	1K	Philips	CR25
R56		"		430		"		"
R57		"		0		"		"
R58		"		0		"		"

U1	Integrated Circuit		National	PIC16C54-RC/P
U2		"	"			"	74HC138N
U3		"	"			"		"
U4		"	"			"	74HC244
U5		"	"			"		"

U6		"	"			"		"
U7		"	"			"	74HC14N
U8		"	"			"		"
U9		"	"			"	LM2575T
U10		"	"			"	74HC14N



MISCELLANEOUS COMPONENTS



USED ON	DESCRIPTION		MFG	MFG PART­ NUMBER

PCB	Printed Circuit Board		WBS	14-291

U7,U8,U10	14  Pin Socket		Amp	640357-3

U2, U3	16  Pin Socket		Amp	640357-3

U1	18  Pin Socket		Amp	640359-3

U4-U6	20  Pin Socket		Amp	640464-3

SW1-SW3	Knob, Snap in		NKK	AT4061
Fusholder Clip				102068

Handle, Grey		Vero	21-0247J
WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance.


TABLE 1 U1 PORT B VALUES FOR SCANNING KEYS

Selected Row
Edge Conn.
B7
B6
B5
B4
B3
B2
B1
B0
row  1
39
1
1
X
X
0
0
0
0
row 2
41
1
1
X
X
0
0
0
1
row 3
43
1
1
X
X
0
0
1
0
row 4
45
1
1
X
X
0
0
1
1
row 5
47
1
1
X
X
0
1
0
0
row 6
49
1
1
X
X
0
1
0
1
row 7
51
1
1
X
X
0
1
1
0
row 8
53
1
1
X
X
0
1
1
1
TABLE 2 U1 PORT B VALUES FOR TURNING ON TALLY LEDs

LED Row,Column
B7
B6
B5
B4
B3
B2
B1
B0
turn on LED 1,1
0
1
X
X
0
0
0
0
turn on LED 1,2
1
0
X
X
0
0
0
0
turn on LED 2,1
0
1
X
X
0
0
0
1
turn on LED 2,2
1
0
X
X
0
0
0
1
turn on LED 3,1
0
1
X
X
0
0
1
0
turn on LED 3,2
1
0
X
X
0
0
1
0
turn on LED 4,1
0
1
X
X
0
0
1
1
turn on LED 4,2
1
0
X
X
0
0
1
1
turn on LED 5,1
0
1
X
X
0
1
0
0
turn on LED 5,2
1
0
X
X
0
1
0
0
turn on LED 6,1
0
1
X
X
0
1
0
1
turn on LED 6,2
1
0
X
X
0
1
0
1
turn on LED 7,1
0
1
X
X
0
1
1
0
turn on LED 7,2
1
0
X
X
0
1
1
0
turn on LED 8,1
0
1
X
X
0
1
1
1
turn on LED 8,2
1
0
X
X
0
1
1
1
turn off all LEDs
1
1
X
X
0
X
X
X


TABLE 3 U1 PORT B VALUES TO SELECT INPUTS OR SWITCHES



B7
B6
B5
B4
B3
B2
B1
B0
select remote inputs
X
X
X
X
1
0
0
0
select SW1
X
X
X
X
1
0
0
1
select SW2
X
X
X
X
1
0
1
0
select SW3
X
X
X
X
1
0
1
1
disable all buffers
X
X
X
X
1
1
1
1

M718

TALKBACK ADDRESS MODULE


Issue #1
March 30, 1995
MW94001/M718 .wp
```

## Contents (JSON)

```json
{
 "file": "Modules/COMMUNICATION/M718/1995 - M718 - 718-02-001 - COMPONENT LAYOUT.wp",
 "sha256": "756347c755f74c0646729efff344d8968f5dc39ca703e7f833f89a210ddf1710",
 "kind": "module",
 "models": [
  "M718"
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
   "dates": [
    {
     "year": 1995,
     "kind": "manual_issue",
     "text": "Issue #1 March 30, 1995"
    }
   ]
  }
 ]
}
```
