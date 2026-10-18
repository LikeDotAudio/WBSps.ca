# 2015 - ABB1 - Manual (2).docx
Wiki page: [ABB1](../../../PAGES/ABB1.md)


- **Year:** 2015 (found in this file: "Jan.01 2015")
- **Module:** ABB1
- **Category:** BUDDIES
- **Module year estimate:** 2015 — month "Jan.01 2015" in PUBLIC/Manuals + tech DOCUMENTS/Buddies/ABB1 Manual(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Buddies/ABB1 Manual.docx`
- **SHA-256:** `47aa2f5745bc2694283042b0df64563a2f379ba583ea9659f76c1d8a94f4066c`
- **Size:** 709,832 bytes
- **Pages:** 1

## Dates found in this file

- **2015** (month): `Jan.01 2015` — …TABLE DIGITAL/ANALOG AUDIO MONITOR by Ward-Beck Systems Rev:Jan.01 2015 ABB-1 AUDIO BIT BUDDY General The Audio Bit Buddy™ is a low…

## Full text

### Page 1 (Word document)

```text
ABB1
AUDIO BIT BUDDY
PORTABLE DIGITAL/ANALOG AUDIO MONITOR






by Ward-Beck Systems 
Rev:Jan.01 2015


ABB-1
AUDIO BIT BUDDY

General

The Audio Bit Buddy™ is a low cost, portable beltpack unit for monitoring digital audio (AES/EBU, S/PDIF) or analog audio signals.  The Audio Bit Buddy™ has a headphone output, and LEDs to display basic signal parameters and the "health" of a digital audio signal.
  
The Audio Bit Buddy™ is well suited for use in professional and consumer environments, such as broadcast installations, production studios, signal distribution facilities, or any other place where digital or analog audio signals are used.  Analog or digital program audio can be listened to on the stereo headset output and left and right levels are displayed on  the LED bargraph meters.
  
When monitoring AES/EBU or S/PDIF signals, the Audio Bit Buddy™ displays many critical signal parameters such as sampling frequency, audio level, emphasis, professional or consumer format and any data error that may be occurring.  If data errors are detected, detailed information can be displayed for system analysis and troubleshooting.  The digital input will accept signals with sampling frequencies from 30kHz to 50kHz. 



Operational Features




NOTE: TO MONITOR DIGITAL SIGNALS IN A 75Ω ENVIRONMENT, WE RECOMMEND THE USE OF A WBS IMP-1M 75Ω TO 110Ω IMPEDANCE CONVERTER






CONNECTING TO THE BIT BUDDY

The ABB-1 uses a 3-pin XLR for an input connector and is wired as shown below. The input impedance can be switched between 110 ohms and HiZ(>20k).  If unbalanced 75 ohm monitoring is required, Ward-Beck offers  a full line of impedance matching products.  As shown below, the IMP-1M is a single in line impedance converter which will match 75 ohm lines to the 110 ohm input of the ABB-1.





BALANCED DIGITAL AUDIO INPUT





BALANCED ANALOG AUDIO INPUT




HEADSET OUTPUT






DISPLAYS

Stereo  Meter 

The Audio Bit Buddy is equipped with a stereo bargraph audio meter.  Two columns of twelve LEDs cover the range from -27 to +12 dBu.  The unit is factory calibrated to read 0 VU for digital signals of -20 dBFS or analog signals of +4dBu.  (Calibration for other standards can be implemented.  Please consult the factory.)  Please note that this is a rudimentary signal presence indicator with an accuracy of +/- 1dB in the -12 to +3 range.


The following STATUS indicators may be illuminated if the digital audio bit stream is in good condition:



AUDIO
Data detected is true AES/EBU audio data
PRE-EMPHASIS
Encoded channel emphasis is enabled
CONSUMER
The channel status data block is set for consumer use
LOCK
Locked to a signal with a sampling frequency other than 32kHz, 44.1kHz or 48kHz
32 kHz
Locked to a signal with a sampling rate of 32kHz
44.1 kHz
Locked to a signal with a sampling rate of 44.1kHz
48 kHz
Locked to a signal with a sampling rate of 48kHz

(NOTE: Only one of the four sampling rate indicators can be illuminated.)


If the STATUS/ERROR switch is in the ERROR position and no error is detected, the NO ERROR LED will be illuminated.  It is recommended that the switch be left in the STATUS mode unless the RCV ERROR LED is illuminated.

The RCV ERROR indicator will illuminate if the digital audio signal is absent or the data is corrupted.  Receive errors are prioritized and only the higher priority error will be indicated.



NO LOCK
Signal absent or data corrupted beyond recoverable limits (highest priority)
BIPHASE ERROR
Biphase coding of the signal is incorrect
PARITY ERROR
Parity bit of the incoming data is not set as specified
CRC ERROR
CRC (Cyclic redundancy check) value calculated for the received signal does not match the CRC byte of the channel status word.
CONFIDENCE FLAG
Indicates an eye pattern violation, it is a warning that the incoming signal is approaching the limits beyond which reliable recovery may be jeopardized. This is typically caused by the band limiting effects of long cable runs. 
VALIDITY BIT
Validity bit of AES/EBU bit stream is high, indicating that the signal is not suitable for D to A conversion


In the analog mode, the RCV ERROR/NO LOCK  LED is illuminated to indicate power on.
DIGITAL AUDIO OVERVIEW

In order to interpret the information displayed when using the ABB-1 to monitor digital audio signals, it may be beneficial to have some understanding of the AES/EBU digital audio standards and the transmission techniques employed.
    
The data bit stream
The recommended interface for serial transmission of linearly represented stereo audio data is defined by the AES/EBU (Audio Engineering Society/European Broadcast Union) standard, AES3-1985 and later amendments.
2971800142875
The standard allows for audio data transmission of 16 to 24 bits sampled at a rate of 30 to 50 kHz.  This data is organized as sub frames, frames and channel status blocks. As illustrated in fig.1, a subframe consists of a preamble, 24 audio data bits, validity bit (V), user data bit (U), channel status bit (C) and subframe parity bit (P).  Each stereo sample or frame comprises two subframes, A and B.  Subframes A and B represent the left and right program information of the stereo sample respectively. The validity bit indicates whether the audio sample is suitable for conversion to analog.  The Audio Bit Buddy™ validity error warns you when this bit is set.  The Audio Bit Buddy™ also tests the subframe parity bit and will warn you if an error is detected. A block structure is used to convey information in the  (C) and (U) bits.  A block consists of 192 frames, as shown in fig. 2.  The 192 channel status (C) and user bits (U) are assembled at the end of the block to form 24 bytes of user and channel status information.  The  channel status block carries information associated with the audio channel.  Examples of information in the block are pre-emphasis, sampling rate, length of audio sample etc.  The 24th byte of the channel status block carries the CRC (cyclic redundancy check) value that is used to test the validity of the entire channel status data block upon reception.  The ABB-1 will calculate the CRC of the first 23 bytes of the channel status block and compare it to the received value in byte 24.  If the CRC does not match, the ABB-1 will indicate a CRC error.
2990850200025
Transmission
The serial data is coded in a biphase mark format (see fig 3).  This format effectively changes the digital data from logic levels into transitions.  A logic 1 level will cause a transition within the bit period while the level 0 will not. Transitions will separate each bit period.  This biphase format has the advantage of being dc free, polarity insensitive and eases clock recovery.  It should be noted that the preamble sync bits are unique in that they violate this coding format, i.e. they do not have transitions on all the bit boundaries. If this coding structure is violated, the ABB-1 will indicate a bi-phase error. From the description of the digital audio  signal data it can be determined that every stereo sample requires 64 bits of data and at a sample rate of 48kHz this translates into a bit rate of 3.072 MHz.  With the biphase coding, logic ones are at twice this rate.
For balanced AES/EBU transmissions 110Ω shielded, twisted pair cable is recommended and for unbalanced transmissions, 75Ω co-axial cable.  As digital signals are inherently rich in harmonics, they require a wide bandwidth for distortion free transmission. The low pass filter effects  of the cable will cause the signal to distort as cable lengths increase, see fig 4.  As shown in the eye diagram of fig.5, the AES/EBU standard dictates that a receiver shall correctly sense data with a minimum voltage of 200mV and a width equal to 25% of the biphase symbol rate. An eye pattern can be seen on an oscilloscope by triggering it so that the pulses overlap. When a signal approaches these limits, the ABB-1 will indicate a confidence error as a warning that it may not be able to receive the signal correctly. 3000375247650


ABB1 FUNCTIONAL DRAWING

POWER

The Audio Bit Buddy™ is powered by four AA Ni-Cad rechargeable batteries or from a 9V, 300 mA AC adapter.  The adapter can recharge the batteries and power the unit simultaneously.  To replace the batteries, remove the two screws on either side of the housing and carefully slide the assembly from the housing.  NOTE: USE Ni-Cad AA CELLS ONLY!

The unit will operate for four hours continuously from a full charge and require eighteen hours to recharge from a full discharge.  It is recommended that the batteries are fully discharged before charging to improve battery life and efficiency.


SPECIFICATIONS

SPECIFICATIONS
DIGITAL 
ANALOG 
Input Standard
AES/EBU transformer balanced on 3 pin XLR connector (unbalanced via optional XLR/BNC adaptor)

2 inputs (L&R) balanced on 1/4" stereo phone jacks
Input Impedance
Selectable:HiZ  or 110 ohm (75 ohm via IMP-1M adaptor)
greater than 20K ohm
Input Level
200mVpp to max 7Vpp
18dBu  (before clip)
D/A Converter
18 bit resolution

Sample Frequency Range
30kHz to 50kHz

Frequency Response
20Hz to 20kHz ±1/2 dB
20Hz to 20kHz ±1/2 dB
Headphone Output
1/4" stereo phone  jack  (600 ohm headphones)
Audio Meters
12 LED Stereo Bargraph






Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.  










WARRANTY

All Ward-Beck Systems Inc. products are warranted against defective materials and workmanship for a period of one year from the date of shipment. 

Ward-Beck Systems Inc. will repair or replace, at its option and without charge, all said products or parts thereof which upon factory inspection prove to be defective during the warranty period, provided that: 

The original serial numbers are intact and have not been tampered with.

The purchaser shall return any equipment or parts thereof to Ward­-Beck Systems Inc. only after obtaining prior authorization and shipping instructions from the factory. (Ward-Beck Systems Inc. reserves the right to inspect or repair equipment on the purchaser’s premises).

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
 "file": "Products/BUDDIES/ABB1/2015 - ABB1 - Manual (2).docx",
 "sha256": "47aa2f5745bc2694283042b0df64563a2f379ba583ea9659f76c1d8a94f4066c",
 "kind": "module",
 "models": [
  "ABB1"
 ],
 "year": 2015,
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
     "year": 2015,
     "kind": "month",
     "text": "Jan.01 2015"
    }
   ]
  }
 ]
}
```
