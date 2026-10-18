# 2017 - POD33 - MANUAL.docx
Wiki page: [POD33](../../../PAGES/POD33.md)


- **Year:** 2017 (found in this file: "Mar.07 2017")
- **Module:** POD33
- **Category:** PODS
- **Module year estimate:** 2017 — month "Mar.07 2017" in PUBLIC/Manuals + tech DOCUMENTS/PODS/POD33 MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD33 MANUAL.docx`
- **SHA-256:** `a96da51b09decf065507e06b3c979c784527288f202064dcfdcda9ce1d5fcbb0`
- **Size:** 273,495 bytes
- **Pages:** 1

## Dates found in this file

- **2017** (month): `Mar.07 2017` — …POD33 AES DARS TONE GENERATOR by Ward-Beck Systems Rev:Mar.07 2017 POD33 DARS GENERATOR OVERVIEW POD33 is a Digital Audio Refe…

## Full text

### Page 1 (Word document)

```text
POD33
AES DARS TONE GENERATOR









by Ward-Beck Systems
Rev:Mar.07 2017
POD33
DARS GENERATOR

OVERVIEW

POD33 is a Digital Audio Reference Signal (DARS) tone generator.  This DARS reference signal can be synchronized to an external Video or AES reference or it can be synched to an internally generated 96 kHz or 48 kHz reference.  POD33 is designed to selectively provide a 100 Hz, 400 Hz or 1 kHz tone at amplitudes ranging from Digital Silence through -60 dBFS to 0 dBFS.

POD33 has four independent digital outputs.  Each output is available as an unbalanced 75 Ohm or balanced 110 Ohm signal. These outputs can be individually set to be either an AES reference or a Word Clock signal.  The level and frequency for each individual output can be set. 

All controls and read-outs are located on the front panel.  Input, output and power connections are located on the rear panel.  Phoenix 3-pin pluggable connectors are provided for the balanced AES signals and unbalanced AES and video reference connections are made via BNC type connectors.

FRONT PANEL CONTROLS AND TALLIES

The operable controls and tallies located on the front panel include:
A power ON/OFF switch and green LED that illuminates when the unit is powered up.  
Three tallies labeled AES, VIDEO and INTERNAL illuminate to indicate the type of reference that is selected.  If a reference tally is illuminated but flashing it indicates that the selected reference signal is not available.  POD33 will automatically search for and switch to the next available reference signal.  The search hierarchy for reference signals if  AES is selected is AES – VIDEO – INTERNAL.  If VIDEO is selected the search hierarchy is VIDEO – AES – INTERNAL.
Two shaft encoder rotary controls labeled SELECT and ADJUST.  Each rotary control has an integral push-push switch
A sixteen character LED dot-matrix readout.  

OPERATION
When the unit is first powered on the read-out displays Pod 33  VXXX. (VXXX is the operational software version identification and should be noted when calling the factory for technical assistance)  After a brief period the default status display appears which shows the levels for the A and B channels of the AES 1 signal.

The SELECT control allows you to scroll through the four DARS outputs (AES 1 to AES4) and display the settings for that output.  For example AES 2 is selected and the readout shows AES2  A/B   -20/-10. This means that on the AES2 reference output the level of the A channel is set to -20dBFS and the level of the B channel is set to -10 dBFS.  To view the frequency settings for the AES 2 output push the ADJUST knob once. The readout should change to display the frequency settings for AES 2.  For example if the display reads AES2  A/B   1k/400 it means that the A channel is set to 1 kHz frequency and the B channel is set to 400 Hz frequency.
Output Level and Frequency Adjust

The output level of the AES signals can be adjusted individually over a range from digital full scale, 0dBFS, to digital silence, OFF.  Incremental adjustment can be made in 1 dB steps in the range from  0 to -30dBFS and in 10 dB steps in the range from -30 to -60dBFS, Digital silence (OFF) is the step below -60dBFS.
The frequency of the individual outputs may be set to 100 Hz, 400 Hz or 1 kHz.

To change the level ensure that you are in the level display mode (for example the read-out displays AES2  A/B   -20/-10) press the SELECT knob once and the read-out will show AES2  A  -20dBFS, to change this level rotate the ADJUST knob in either direction to set a new level. Push the SELECT knob once more for the B channel.  If it is desired to change the frequency of the A or B channel push the ADJUST knob.  (Please note that once an individual AES channel is selected pushing the ADJUST knob toggles between level and frequency) Once all the level and frequency adjustments are completed push the SELECT knob to return to A/B status display window.  Rotate the SELECT knob to select another AES output.

Selecting the Reference Input:

Press the SELECT and ADJUST knobs simultaneously.  The readout will display one of the following: 
Ref  AES, which means that an external AES reference signal is selected
Ref   Video 48k, which means that an external NTSC/PAL video black reference signal is selected 
Ref   Int  48k, which means that the internal 48 kHz reference is selected
Ref   Int  96k, which means that the internal 96 kHz reference is selected

To select the appropriate reference signal rotate the ADJUST knob.  To exit the reference selection menu rotate the SELECT knob counter-clockwise to display Exit    Setup and push the SELECT knob once.  (Note that if the unit will eventually time out and return to the status display mode if the exit procedure is not executed)

Setting the Reference Output (AES or Word Clock)

Press the SELECT and ADJUST knobs simultaneously.  The reference display will appear.  Turn the SELECT knob clockwise and the display will read AES1   AES or AES1  Wrd Clk indicating whether that output is set to deliver an AES or Word Clock signal.  To choose the appropriate signal rotate the ADJUST knob to toggle between the two types of output signal.  Rotate the SELECT knob to scroll through AES outputs 1 to 4. 

Note: When output has been set to deliver a Word Clock signal, its frequency follows the Reference Input.






SPECIFICATIONS


AES REFERENCE INPUT
Input Impedance
AES/EBU 75Ω unbalanced
AES/EBU 110Ω transformer balanced
Sampling Frequency
32, 44.1, 48 or 96 kHz
Level
0.2-7.0 Vp-p

VIDEO REFERENCE INPUT
Input Impedance
75Ω unbalanced
Sampling Frequency 
48kHz
Video Format
NTSC or PAL
Level
1.0 Vp-p

AES OUTPUT
Resolution
24 bits
Output Standard
AES/EBU 75Ω unbalanced
AES/EBU 110 Ohm transformer balanced
Sampling Frequency (Video)
48 kHz
Sampling Frequency (Audio)
32, 44.1, 48 or 96 kHz
Jitter
less than 5 ns
Level
1 Vp-p 75Ω terminated
3.0 Vp-p 110Ω terminated

WORD CLOCK
Output Standard
AES/EBU 75Ω unbalanced
AES/EBU 110Ω transformer balanced
Sampling Frequency (Video)
48 kHz
Sampling Frequency (AES In or Internal)
32, 44.1, 48 or 96 kHz
Level
1 Vp-p 75Ω terminated
3.0 Vp-p 110Ω terminated


GENERAL
Power Requirements
100-240 VAC,50-60Hz
Dimensions
8.69" wide x 1.73" high x 7.0" deep
(221mm x 44mm x 178 mm)
Weight
3.01 lbs (1.37 kg)





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
 "file": "Products/PODS/POD33/2017 - POD33 - MANUAL.docx",
 "sha256": "a96da51b09decf065507e06b3c979c784527288f202064dcfdcda9ce1d5fcbb0",
 "kind": "module",
 "models": [
  "POD33"
 ],
 "year": 2017,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "CONTROLS",
     "kind": "operation"
    },
    {
     "heading": "OPERATION",
     "kind": "operation"
    },
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
     "year": 2017,
     "kind": "month",
     "text": "Mar.07 2017"
    }
   ]
  }
 ]
}
```
