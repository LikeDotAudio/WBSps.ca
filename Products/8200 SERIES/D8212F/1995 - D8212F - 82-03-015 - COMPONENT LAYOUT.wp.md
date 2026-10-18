# 1995 - D8212F - 82-03-015 - COMPONENT LAYOUT.wp
Wiki page: [D8212F](../../../PAGES/D8212F.md)


- **Year:** 1995 (found in this file: "MANUAL ISSUE #1 November 28,1995")
- **Module:** D8212F
- **Category:** 8200 SERIES
- **Module year estimate:** 1995 — manual_issue "MANUAL ISSUE #1 November 28,1995" in WBSps Engineering from H drive-20261018T013433Z-1-002/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/D8212F.WP
- **Original file:** `WBSps.env/WBSps Engineering from H drive/WBSps - Word Perfect Manuals/D8212F.WP`
- **SHA-256:** `8ad64824a314dd841f53f2808cea5db596e785507fecd6f0c9a8e922363b3f3a`
- **Size:** 25,798 bytes
- **Pages:** 1

## Dates found in this file

- **1995** (manual_issue): `MANUAL ISSUE #1 November 28,1995` — …mum equipment performance. D8212F AUDIO DISTRIBUTION SYSTEM MANUAL ISSUE #1 November 28,1995 MW94002/D8212F.wp…

## Full text

### Page 1 (office)

```text
﻿TABLE OF CONTENTS

D8212F AUDIO DISTRIBUTION SYSTEM



SECTION									PAGE


Warranty

l)		Main Frame

1	Technical Data					1-1 to 1-2
2	General						2-1
3	Installation and Setup					3-1 to 3-2
4	System Options					4-1	
5	Parts List						5-1
6	Connector Layouts 1 to 8,
Inputs Mult & Inputs					6-1- to 6-2
7	Drawings:
System Front View Layout				B 8212-04-016
System Outline 					B 8212-04-017
System Schematic					B 8212-02-011
System Grounding Diagram				B 8212-02-002

II)		M8205B Audio Distribution Amplifier

1	Technical Data					1-1 to 1-2
2	General						2-1
3	Circuit Description					3-1 to 3-2
4	Parts List						4-1 to 4-3	
5	Drawings:
Schematic					B 8205-02-003
Component Layout					B 8205-06-003

III)		M8245 Power Supply

1	Technical Data					1-1
2	General						2-1 
3	Circuit Description					3-1 to 3-3
4	Parts List						4-1 to 4-4		
5	Drawings:
Schematic					B 8245-02-001
Component Layout					B 8245-06-001

(Equipped with 12 M8205B Distribution Amplifier) 


Gain:		+30 dB to -6 dB continuously variable.
(Bridging Gain).

Frequency Response:	+/-0.1 dB from 15 Hz to 25 kHz.

Noise:		120 dB below maximum output at unity gain.

104 dB below the nominal + 8 dBu output level at unity gain.

75 dB below the nominal +8 dBu output level at maximum gain.
(Measured with an average responding metering over a 20 Hz to 20 kHz bandwidth).

Harmonic Distortion:	Less than 0.01% 15 Hz to 25 kHz up to +24 dBu output level with 8 isolated outputs driven simultaneously into 600 ohm loads (typically less than 0.005%).

Input Level:	-22 dBu to +14 dBu nominal for +8 dBu output.
+30 dBu maximum.	

Input Impedance:	30,000 ohms or greater, balanced.

Source Impedance:	600 ohms or less, balanced.

Common Mode Rejection:	Greater than 80 dB, 20 Hz to 20 kHz.

Common Mode Voltage:	+/-25 volts peak.

Output Level:	+8 dBm nominal, +28 dBu maximum at each output,
up to 8 outputs maximum.

Output Impedance:	60 ohms resistive, each output actively balanced.

Load Impedance:	600 ohms balanced for each isolated output.

Output Isolation:	Greater than 60 dB, 15 Hz to 25 kHz.
Typically 85 dB mid-band.

Output Offset:	Less than +/-500 microvolts.




Crosstalk:	Greater than 80 dB mid-band.

Phasing:		Lower alphabetic character is high. i.e. the A,B,E triplet pins are +,-, common, respectively.

Power Requirements:	115V/230V AC 45 to 400 Hz.
VA ratings with a full  amplifier compliment:
Idle		-  45 VA
Nominal		-  85 VA
Full power	- 0 to 50 degrees Celsius.

Ambient Temperature:	0 to 50 degrees Celsius.

Dimensions:	19.00" wide x 3.50" high x 17" deep
(482 mm x 89 mm x 432 mm).

Weight:		19 lbs 14 oz (9 kg).
GENERAL

D8212F AUDIO DISTRIBUTION SYSTEM


The D8212F Audio Distribution System consists of an MF82F mounting frame. This frame may house up to twelve WBS M8205 or M8206 series amplifiers and up to two M8245 series power supplies. Audio input/output connectors are integral to the frame.

The mounting frame occupies only two units of a standard nineteen inch mounting rack. Its minimal power consump­tion permits the design of high density distribution systems. Care and consider­ation should still be given to correct equip­ment rack ventilation. Adequate air flow will keep the equipment cool and maximize it's operational life.

Audio terminations to the distribution amplifiers are via gold metal contact Edac 516 series connectors. Elco's compatible 38 pin connectors may also be used.
Two separate primary AC power con­nections, each with a separate fuse, are avail­able at the rear of the D8212F mounting frame. The dual power connections permit redundant M8245 Power Supplies to be connected to separate primary power sources ensuring the highest overall system reliability possible.

In system applications where full access to the distribution amplifier sen­sitivity controls is required, the screwdriver adjustments on many WBS M8200 series amplifiers can be upgraged to adjustment knobs. Please contact WBS for full details after refering to the option section.
Unpacking

Remove equipment from packing carton and examine for any damage that may have occurred during shipment.

Check that all items ordered are as per packing slip and are accounted for.

WARNING

Do not apply any AC power to the assembly until the complete installation section has been read thoroughly.

Mounting

To simplify system installation and setup it is recommended that all distri­bution amplifiers be removed and stored in a safe location.

Mount the distribution frame as required in the equipment rack. Do not mount above other heat generating equipment without due consideration for proper ventilation and allowances for proper unrestricted air flow.

Primary AC Power

The two AC power cords are on the right rear section of the MF82 mounting frame.

For North American operation the M8245 Power Supplies are set up for nominal 115V AC operation (link J1 in place on the M8245 Power Supply). The primary AC fuses at the rear of the distribution system mounting frame are 1.50 amp slow blow type #3AG.

For International operation the M8245 Power Sup­plies are set for a nominal 230V AC operation (link J2 in place on the M8245 Power Supply). The pri­mary AC fuses located at the rear of the distribution system mounting frame are 0.75 amp slow blow type #3AG.

To configure the audio distribution system for the highest possible primary power source reliability, two separate AC circuits should be utilized all the way back to the main distribution brea­ker panel, with the breakers connected to different primary AC power phases if at all possible.

Grounding

Refer to drawing D8212-02-002 for additional details.

At the rear of the MF82 mounting frame a separate binding post is pro­vided for the mechanical frame chassis and one for the system electrical ground. These two points are isolated from each other within the mounting frame. These two points should event­ually connect together at the audio system station ground point (see drawing B8212-02-002).

The chassis connection should be con­nected to all other mounting frames and rack cabinetry either directly from the binding post, or via the neutral "U" ground connection (the green wire) integral to the primary AC wiring.

The use of separate chassis and ground wires return­ed to a central station ground point will assure a system with the minimal amount of AC and possible RF currents circulating in the audio ground system. Keep audio systems ground connections free from any AC, video, control or possible RF ground returns.

Input/Output Connections

It is normal audio system practice that cable shields be connected at one end to the audio system ground. This is usually at the receiving signal end. A separate input shield ground is provided on each distribution amplifier inter­connect assembly, placing the input signal cable shield at the preamplifier potentials of the particular distribution amplifier. This grounding technique can become quite critical in high gain situations where the incoming and outgoing signals have level differences in excess of 20 dB.

A main system ground terminal is pro­vided on each distribution amplifier interconnect assembly where it may be required to connect the shields of high level outgoing cables.

When dressing audio cables at the rear of the MF82 mounting frame always endeavour to keep input and output runs separate from one another as is practical.

To maximize amplifier performance with minimal power dissipation terminate or load only the outputs that are being used.

Power Supply Setup

To prevent the possibility of inadvertent power supply damage, particularly where systems are shipped to other than North American customers, the following inspection should be performed.

With both AC power plugs disconnected, remove the power supply access panel, withdraw each power supply module and examine for the proper intercon­nection of link J1 for 115V AC operation or link J2 for 230V AC operation. Refer to the M8245 technical manual for location details (drawing B8245-06-001).

With all distribution amplifiers removed, apply power to supply #1. Measure the voltage between the rear mounted terminal strip +/-22 volt pins, it should be 44.5 to 45 volts with no load. Remove pri­mary power from power supply #1 and apply to power supply #2 only. Confirm again that the no load DC voltage is 44.5 to 45 volts.

Apply power to both power supplies noting that there is little if any change in the output no load DC voltage. Secure the power supply access panel.

The red load current LED indicator will begin to illuminate on the M8245 Power Supplies. This will normally begin to occur with six or more amplifiers in position.

After approximately 30 minute warm up time, adjust the "V-Adjust" trim control of power supply #2 for equal illumination of the red load current LED's on the two power supplies. This shows that the load is equally shared between the two redundant power sup­plies. 

This adjustment assures that both power supplies are operating with a portion of the total load current, compared to being in an inactive standby state.
SYSTEM OPTIONS

D8212F AUDIO DISTRIBUTION SYSTEM



The standard D8212F Audio Distribution System is supplied with twelve M8205B Audio Distribution Amplifiers and two M8245 Power Supplies.
The M8205B amplifiers provide screwdriver adjust sensitivity controls. A trim knob may be optionally provided on each control to facilitate ease of adjustment. Refer to the parts list page 5-1 of this manual for manufacturer's part numbers.
PARTS LIST

D8212F AUDIO DISTRIBUTION SYSTEM


PART	DESCRIPTION			MFG	MFG PART NUMBER

DA1-DA12	Distribution Amplifier			WBS	M8205B

PS1-PS2	Power Supply				 "		M8245

FRAME	Equipment Frame			 "		MF82F

BA 1	Backplane Assembly			 "		SA14-145

ATA 1-12	Audio Terminal Assembly		 	"		SA14-146

ATA	Audio Termination Assembly			 "		SA14-313A

CORD	AC Power Cord				Belden	17237

CLAMP	AC Cord Strain Relief			Heyco	5P4

F1,F2	Fuseholder Body				Schurter	FEU 031.1653

Fuse Carrier-Finger Grip				"	FEK 031.1667

Fuse 1.5A Slo-Blo			Littelfuse	313 01.5

Fuse 0.75A Slo Blo				"	313 .750

POST	Block Binding Post			Johnson	11-0103-001

Green Binding Post				"	11-0104-001

IDENT	Door Designation Label			WBS	D82-03-015



OPTIONAL COMPONENTS


PART		DESCRIPTION			MFG	MFG PART NUMBER

SENS KNOB		Knob (Black)			Elma	021-2225
Cap  (Grey)			 "		040-1615





WBS recommends the use of replacement parts made by the specified manufac­turers for continued optimum equipment performance.

D8212F

AUDIO DISTRIBUTION SYSTEM


MANUAL ISSUE #1

November 28,1995
MW94002/D8212F.wp
```

## Contents (JSON)

```json
{
 "file": "Products/8200 SERIES/D8212F/1995 - D8212F - 82-03-015 - COMPONENT LAYOUT.wp",
 "sha256": "8ad64824a314dd841f53f2808cea5db596e785507fecd6f0c9a8e922363b3f3a",
 "kind": "module",
 "models": [
  "D8212F"
 ],
 "year": 1995,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "DESCRIPTION",
     "kind": "general"
    }
   ],
   "modules": [
    "M8200",
    "M8205",
    "M8205B",
    "M8206"
   ],
   "dates": [
    {
     "year": 1995,
     "kind": "manual_issue",
     "text": "MANUAL ISSUE #1 November 28,1995"
    }
   ]
  }
 ]
}
```
