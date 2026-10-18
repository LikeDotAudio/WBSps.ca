# 1994 - M808C - M808C - 808-02-004 - COMPONENT LAYOUT.wp
Wiki page: [M808C](../../../PAGES/M808C.md)


- **Year:** 1994 (original file date 1994-08-09)
- **Module:** M808C
- **Category:** AMPLIFIERS
- **Module year estimate:** 1994 — original file date saved 1994-08-09: WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M808C.WP
- **Original file:** `WBSps.env/WBSps Engineering from H drive-20261018T013433Z-1-001/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/M808C.WP`
- **SHA-256:** `dec8071402c09cd1d4ea896e5280f8dc83006c1ff7f236a1bcbddb192356d80d`
- **Size:** 15,087 bytes
- **Pages:** 1

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

M808C 8x1 RELAY SWITCHER


SECTION									PAGE	


Warranty

1	Technical Data						1-1
2	General							2-1
3	Circuit Description						3-1 
4	Parts List							4-1
5	P1 Connector Layout					5-1

6	Drawings:
Schematic							B 808-02-004
Component Layout						B 808-06-004
TECHNICAL DATA

M808C 8x1 RELAY SWITCHER




Configuration:		Single 8 input to 1 output or dual 4 to 1 switcher.

Latching:			Either self or external.
Determined by conditional strapping.

Cancel:			Only on 8 to 1 switcher.

Frequency Response:	Not applicable. The input is switched directly to the output.

Input Impedance:		Optional.

Phasing:			Numbered inputs are in phase with the numbered outputs.

Power Requirements:	+24 volts dc, 35 mA.

Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:			1.00"  wide x 2.75" high x 10.60" deep.

Weight:			180 grams (7 ounces).
GENERAL

M808C 8x1 RELAY SWITCHER



The M808C Relay switching module was designed to provide selection of any one of 8 inputs to a single output using a single wire for both control and tally of each input.
This versatile module can be either self latching or latched by external circuitry. The input capability can be expanded beyond 8 by connecting together a number of switching modules. This module may also be used as a dual 4x1 switcher if external latched or if a small number of components are added.
Input

Input One is applied through edge connector pins 15 and S. When K1 is energized, the signal will pass to the output buss (pins 3 and C) through the optional isolating resistors R3 and R4. Links 17 and 18 are cut when resistors R3 and R4 are installed.

Latching Circuit

K1 is energized by momentarily grounding the control terminal at pin 2. At the same time Q1 will be turned off as a result of the ground being applied to the base through isolating diodes CR2 and CR5. Q1 provides the ground return path through the associated relay holding contacts. Thus when Q1 turns off, any previously latched relay will de-energize and open.

When the momentary ground is removed from pin 2, Q1 will turn on in a few micro-seconds providing the ground return path for K1 through its holding contacts and CR3  (the turn on time of Q1 is much shorter than the time required for K1 to open its contacts).

Grounding the cancel buss at pin 6 will also turn off Q1 and therefore de-energize any relay that may be latched up on the card. If many cards are to be tied together then, the cancel buss terminals (pin 6), must be tied together.

If the relays are to be held latched by some external circuitry, then pin A should not be grounded.

Prioritized Selector

To build a prioritized selector, a momentary SPDT switch is required for each control input. The N.O. contacts of the switches are connected to the control inputs while the N.C. contacts are connected to the armature of the switch with the next lower priority. The armature of the switch with the  highest priority is connected to ground. 

Thus if more than one switch is pressed, only the switch with the higher priority will ground its associated control input. This prevents more than one relay being energized at any one time.

Tally lamps may be tied to the control wires to indicate which relay is energized.

To expand the  number of inputs beyond 8, the output (pins 3 and C) and the cancel buss (pin 6) must be connected to the outputs and cancel busses of the other modules.

Dual 4x1 configuration

In order to use the card as a dual 4x1 selector, links LK1, LK2, LK3, LK4, and LK7 must be cut and links LK5 and LK6 must be shorted.  This disconnects the cancel and pins 6 and F are now the second output. The card must now be externally latched (pin A ungrounded) or the additional components should be added so that inputs 5, 6, 7 and 8 have their own latching circuit comprised of  CR27, CR28, Q2, R19 and R20.
CR1	Diode, Zener		Motorola	1N746A

CR2 To	Diode				"	1N4003
CR26	

K1 To K8	Relay			Omron	G6A-434P-ST-US 24V DC

Q1	Transistor			Motorola	2N6731

R1	Resistor	1/4W 5%	4K7	Philips	CR25
R2		"		15K		"		"

PCB	Printed Circuit Board		WBS	14-287

Additional Components for Dual 4x1 Switcher

CR27	Diode			Motorola	1N4003
CR28	Diode, Zener			"	1N746A

Q2	Transistor				"	2N6731

R19	Resistor	1/4W 5%	4K7	Philips	CR25
R20		"	1/4W 5%	15K		"		"

WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance.

M808C

8x1 RELAY SWITCHER
Issue #1

MW94001/M808C .wp
```

## Contents (JSON)

```json
{
 "file": "Modules/AMPLIFIERS/M808C/1994 - M808C - M808C - 808-02-004 - COMPONENT LAYOUT.wp",
 "sha256": "dec8071402c09cd1d4ea896e5280f8dc83006c1ff7f236a1bcbddb192356d80d",
 "kind": "module",
 "models": [
  "M808C"
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
   ]
  }
 ]
}
```
