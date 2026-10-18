# 2014 - POD27 - MANUAL.docx
Wiki page: [POD27](../../../PAGES/POD27.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** POD27
- **Category:** PODS
- **Module year estimate:** 2014 — month "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD27 MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD27 MANUAL.docx`
- **SHA-256:** `52e2c6416c961867d141f6a798903110ddcbc4c59c82fa324d943d3cd466a28e`
- **Size:** 384,031 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …POD27 AUDIO MUXER by Ward-Beck Systems Rev:Oct.01 2014 POD27 AUDIO MUXER This is one of many in our line of top qu…

## Full text

### Page 1 (Word document)

```text
POD27
AUDIO MUXER








by Ward-Beck Systems
Rev:Oct.01 2014
POD27
AUDIO MUXER

This is one of many in our line of top quality, low-cost broadcast problem solvers.  PODS are compact, rugged and affordable.  They are suited for tabletop use, or rack-mountable singly or in pairs, in any combination.


The POD27 is a muxer designed to embed one group (two stereo channels) of AES audio into a SMPTE 272M serial digital video signal.
  
POD27 is designed to receive a serial digital video signal transmitted over 75 Ohm coaxial cable.  An adaptive cable equalizer in the input circuitry provides equalization for long transmission lines in order to ensure proper recovery of the transmitted, high-bit-rate, digital data.  POD27 provides two serial digital video signals with embedded audio at its’ output.  

The unit is designed to accept either 110 Ohm balanced or 75 Ohm unbalanced AES audio signals.  Balanced signals are connected via Phoenix pluggable screw terminals and unbalanced signals via BNC connectors.  AES signals are detected automatically. If an unbalanced and balanced AES signal are inadvertently connected to the same input, POD27 will randomly lock to one of the signals.  The AES audio signals are sample rate converted to 48 kHz prior to being embedded in the digital video bit stream.  If the AES signal to be embedded is non-audio data, i.e. Dolby AC3 or E, POD27 will not sample rate convert the signal to the internal 48 kHz clock.  Care should be exercised to ensure that AES non-audio data is synchronized with the SMPTE 272M serial digital video input signal in order to avoid creation of digital artefacts.  POD27 has the flexibility to selectively embed the AES signal into any of the four groups of the serial digital video signal.  A front panel pushbutton selects the group into which the audio is embedded.   To cycle through the groups, operate the “SELECT” pushbutton repeatedly. 

POD27 may be used to add embedded audio into an unfilled group without disturbing audio that already exists in another group.  To ensure that existing audio is not lost while embedding additional material in another group, the “CASCADE”  LED mounted on the front panel must be illuminated.  If the “CASCADE”  LED is not illuminated, any pre-existing audio in the digital video bit stream will be stripped out and discarded.  To place POD27 in the CASCADE mode, operate the front panel button so that the “CASCADE”  LED is illuminated.
  
NOTE: Attempting to overwrite existing audio in a particular group is not recommended.
POD27 generates and embeds its’ own EDH packets in accordance with the SMPTE RP165 specification.  EDH data that is present in the input video signal will be stripped out and discarded.
CAUTION:
The cascade mode allows POD27 to embed AES audio into a SDI signal already containing audio.  Care must be exercised when using the cascade mode.  POD27 does not check which group has existing audio.   The user must be certain that the AES audio connected to the POD27 is not assigned for embedding to a group that already contains audio.  With the cascade function turned off, POD27 will strip out  existing embedded audio only if it detects a valid AES signals at its’ input.


STATUS TALLY DEFINITIONS
Four status tallied are mounted along the front panel of POD27.  From the left to right:


SDI
- indicates a viable digital video signal is present at the input.
AES 1
- indicates the presence of a viable AES signal at input 1
AES 2
- indicates the presence of a viable AES signal at input 2
ERROR
- indicates the absence of a signal if SDI tally is not illuminated

- if SDI tally is illuminated it may indicate the following errors

wrong SDI standard

internal board error



SPECIFICATIONS

SDI INPUT/OUTPUT
Input Impedance
75 Ω
Input Level
0.8 V p-p (typical)
Output Level
0.8 V p-p
Output Impedance
75 Ω
Return Loss
18 dB
Data Rate
270 Mbps

DIGITAL INPUT
Input Standard
AES/EBU 110Ω transformer balanced screw terminal
or 75Ω unbalanced BNC
Input Level
0.2-7V p-p
Sampling Frequency Range
30kHz to 96kHz

GENERAL
Power Requirements
115 VAC,60Hz
(available upon request) 230 VAC,50Hz
Dimensions
8.69" wide x 1.73" high x 7.0" deep
(221mm x 44mm x 178 mm)
Weight
1.37 kg (3.01 lbs)


Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.

WARRANTY

All Ward-Beck Systems Inc. products are warranted against defective materials and workmanship for a period of one year from the date of shipment. 

Ward-Beck Systems Inc. will repair or replace, at its option and without charge, all said products or parts thereof which upon factory inspection prove to be defective during the warranty period, provided that: 

The original serial numbers are intact and have not been tampered with.

The purchaser shall return any equipment or parts thereof to Ward-­Beck Systems Inc. only after obtaining prior authorization and shipping instructions from the factory. (Ward-Beck Systems Inc. reserves the right to inspect or repair equipment on the purchaser’s premises).

The purchaser assumes the obligation for all expenses in connection with the shipping and return of such goods, once authorization has been obtained. 

This warranty does not cover items normally considered expendable, such as fuses and lamps. 

This warranty does not cover damages caused by misuse, accident, neglect, unauthorized alteration, repair by unauthorized personnel, or damage caused by an act of God, war, or civil insurrection. 

In no event shall Ward-Beck Systems Inc. be liable for consequential damages. Ward-Beck Systems Inc. shall have the rights to final determination as to the application of this warranty. 

Ward-Beck Systems Inc. reserves the right, at any time and without notice, to make changes in its equipment, components, specifications or designs, as may be warranted by progress in state-of-the-art technology. 

Ward-Beck Systems Inc. reserves the right to make design changes, additions to, and improvements in its products, without obligation to install such revisions in products previously manufactured. 

The warranty set forth herein is in lieu of all other warranties expressed or implied, including the warranties of merchantability and fitness. 


WARD-BECK SYSTEMS INC.
945 Middlefield Road, Unit 9, Toronto, Ontario M1V 5E1
V 416 335 5999 F 416 335 5202 Toll-Free 800 771 2556
Website: www.ward­-beck.com
E-Mail: sales@ward­-beck.com
```

## Contents (JSON)

```json
{
 "file": "Products/PODS/POD27/2014 - POD27 - MANUAL.docx",
 "sha256": "52e2c6416c961867d141f6a798903110ddcbc4c59c82fa324d943d3cd466a28e",
 "kind": "module",
 "models": [
  "POD27"
 ],
 "year": 2014,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "SPECIFICATIONS",
     "kind": "specs"
    },
    {
     "heading": "WARRANTY",
     "kind": "warranty"
    }
   ],
   "dates": [
    {
     "year": 2014,
     "kind": "month",
     "text": "Oct.01 2014"
    }
   ]
  }
 ]
}
```
