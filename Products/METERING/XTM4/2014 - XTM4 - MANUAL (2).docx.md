# 2014 - XTM4 - MANUAL (2).docx
Wiki page: [XTM4](../../../PAGES/XTM4.md)


- **Year:** 2014 (found in this file: "Oct.01 2014")
- **Module:** XTM4
- **Category:** METERING
- **Module year estimate:** 2014 — month "Oct.01 2014" in PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/XTM4 MANUAL(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Metering and Monitoring Manuals/XTM4 MANUAL.docx`
- **SHA-256:** `fd57e9ee73ea6caf45470be8b9e800092e19857e32bfd675f71f8dd09ec43d9e`
- **Size:** 354,295 bytes
- **Pages:** 1

## Dates found in this file

- **2014** (month): `Oct.01 2014` — …XTM4 EXTENDED RANGE TEST METER by Ward-Beck Systems Rev:Oct.01 2014 XTM4 EXTENDED RANGE TEST METER The XTM4 is a versatile test…

## Full text

### Page 1 (Word document)

```text
XTM4
EXTENDED RANGE TEST METER














by Ward-Beck Systems
Rev:Oct.01 2014
XTM4 EXTENDED RANGE TEST METER


The XTM4 is a versatile test meter for the measurement of analog, AES-3 and SDI embedded audio signals over a wide range. Occupying two rack units of space, the unit is equipped with a high quality stereo VU and PPM moving needle meter pair. All meters are LED illuminated.

Front panel controls and a bright dot matrix display allow the user to select between the various signal sources, the mode of operation, the sensitivity of the meter and peak audio detection (optional). A bargraph LED phase indicator is included. 

Connection to the XTM4 is via rear panel XLR-(F)s for the analog and 110 Ohm AES-3 signals and via BNCs for the AES-3ID and SDI signals. The rear panel has a stereo analog output of the displayed signal on an XLR-(M) connector pair. The analog input pair and AES-3 input pairs are routed through TRS ¼” jacks located on the front panel. These jacks give rapid access to the XTM4. A stereo headset jack is also provided on the front panel.

The base XTM4 comes equipped with analog, AES-3 and AES-3ID inputs. SDI and expanded AES ports may be added as an option. See the SDI Demux option section. The XTM4 is internally powered and will operate with 115V 60 Hz or 230V 50 Hz (optional) AC mains.

FRONT PANEL
The front panel of the XTM4 comprises of two illuminated VU/Peak Program Meter pairs, an eight LED Phase Meter, an eight character dot-matrix LED display, four push button switches and four TRS ¼” jacks.

The meter pairs are labeled CHANNEL A and CHANNEL B. The four push buttons are labeled SOURCE, MODE, DOWN and UP. Starting from the left the first pair of jacks are the front panel analog inputs (A0) the AES jack is the front panel digital input (D0) and the HDST jack is to allow aural monitoring of the signal with an impedance of 600 Ω headset.

REAR PANEL
The rear panel comprises an IEC AC power connector with internal fuse, the AES signal input connectors, BNC for 75 Ω and XLR-3(F) for 110 Ω, a pair of analog signal outputs on XLR-3(M) and a pair of analog input connectors on XLR-3(F). 

The analog outputs are set to deliver a +4 dBu signal for a meter reading of 0.



OPERATION:

AES digital or analog audio signals may be connected via the front panel TRS ¼” jacks or via the rear mounted XLR-3(F) connectors. Please note that the digital XLR-3(F) connector is for balanced, 110 Ω signals, while a BNC connector for unbalanced 75 Ω signals is also provided.

Setup Mode

If the user needs to re-configure the parameters under which the signal will be measured, press and hold the MODE button. Once ‘SETUP’ is displayed, release the MODE button to begin.  The front panel SOURCE button allows the user to change between the different settings. The UP and DOWN buttons allow the user to increase or decrease the peak threshold value in peak mode or change the filter and impedance settings. To leave the setup mode and begin metering, press the MODE button. The last source stored will be first to be metered and the changed settings will be stored in memory. The parameters are as follows:

PEAK (optional) - the threshold value for peak detection with respect to the reference setting (PPM) ranging from -14 to +14 dB. See the section Peak Detection for more information.
HP - to meter using a high pass filter. (UP - HPI, DOWN - HPO)
TERM - to switch the input between bridging and terminated (600 Ω).(UP - HZ, DOWN - LZ)
Source Selection
The front panel MODE button cycles through the three signal sources:

ANALOG
A0 - Front Panel TRS Jacks (CH A (L) and CH B (R))
A1 - Rear Panel XLRs (CH A (L) and CH B (R))

DIGITAL
D0 - Front Panel TRS Jack
D1 - Rear Panel connector (XLR or BNC as defined in MODE )

SDI 1 (SDI A)
SA’x’ - Rear Panel BNC input 1 (input A), (x indicates the AES pair 1->8)

SDI 2 (SDI B)
SB’x’ - Rear Panel BNC input 2 (input B), (x indicates the AES pair 1->8)

Analog Signals
With an analog input signal selected, push the SOURCE button to toggle between A0 or A1.  The settings from the setup mode that effect the metering of analog signals are:
LZ 
- Low Impedance (600 Ω)
HZ
- High Impedance (20 kΩ or higher)
HPO
- High Pass Filter out
HPI
- High Pass Filter in
PEAK
- Peak detection

If LZ is selected a lower case “z” will be displayed in the readout immediately following the level selection. If HPI is selected a lower case “f” will be displayed on the extreme right hand side of the readout.

Digital Signals
With a digital input signal selected (if a digital signal is not present the readout display will flash NO LOCK), push the SOURCE button to toggle between D0 or D1. The settings from the setup mode that effect the metering of digital signals are:
HPO
- High Pass Filter out
HPI   
- High Pass Filter in
PEAK
- Peak detection

If HPI is selected a lower case “f” will be displayed on the extreme right hand side of the readout.

For D1 sources, the auto-detect feature is used for rear panel BNC and XLR signals. When both inputs have valid signals, the first signal detected will be metered.

The XTM4 can store the parameters selected for analog, digital or sdi metering. After cycling through the options, the XTM4 will store the most recent parameters for the setup mode, analog, digital and sdi sources.

The meter will default to the saved metering parameters on power up.



Peak Detection (Optional)

The peak detection option is available to assist in the metering of audio signals. Using PPM metering, the XTM4 can be configured for a threshold value of +/- 14 dB with respect to the reference setting. Once the measured signal has eclipsed the threshold value, the XTM4 will display PEAK L for the left channel or PEAK R for the right channel. If both channels have peaked, PEAK LR will be displayed.

Peak Setup

After entering the SETUP MODE, press the SOURCE button until PEAK is displayed. Then press the UP and DOWN buttons to increase or decrease the threshold value by 2 until the desired value has been selected. If further changes to other settings are necessary press the SOURCE button, else press the MODE button to allow the changes to take effect.

SDI DEMUX OPTION

Serial digital video signals can carry up to four groups of two AES digital audio signals (16 monaural signals). Adding the demux option enables the user to extract these embedded audio signals and monitor them in the AES digital audio domain. As with analog and AES signals an analog output of the metered signal will be available on the rear panel.

To meter an embedded signal use the source selection button to select either SA or SB signal.  The first signal displayed will be SA1 (SB1). This is pair 1 of group 1. Use the SOURCE button to cycle through the eight SDI signal pairs:

SA1 (SB1) - pair 1 of group 1 of input A (input B)
SA2 (SB2) - pair 2 of group 1 of input A (input B)
SA3 (SB3) - pair 1 of group 2 of input A (input B)
SA4 (SB4) - pair 2 of group 2 of input A (input B)
SA5 (SB5) - pair 1 of group 3 of input A (input B)
SA6 (SB6) - pair 2 of group 3 of input A (input B)
SA7 (SB7) - pair 1 of group 4 of input A (input B)
SA8 (SB8) - pair 2 of group 4 of input A (input B)

If the SDI source selected and signal is not present the LCD readout will display a flashing NO SDI. If an SDI signal is present, but the embedded audio is absent the LED readout will display a flashing NO AUDIO. The settings from the setup mode that effect the metering of the disembedded digital signals are:
HPO
- High Pass Filter out
HPI
- High Pass Filter in
PEAK
- Peak detection

If HPI is selected a lower case “f” will be displayed on the extreme right hand side of the readout.

Please note that the selected SDI input signal is actively looped through the demuxer. The SDI output available on the rear panel of the XTM4 is an equalized and reclocked signal.

  






             SPECIFICATIONS

SDI INPUTS/OUTPUT
Input Impedance
75Ω
Input Level
0.8 Vp-p (typical)
Output Level
0.8 V p-p
Output Impedance
75Ω
Data Rate
270-1485-2970 Mbps

DIGITAL

Input Standard


     

110 Ohm, transformer balanced - XLR3
     

  
75 Ohm, unbalanced - BNC
     


   
TRS front panel jack
Input Level







          
0.2-5Vp-p
Sampling Frequency Range



         
30 kHz to 96 kHz
Meter Level





  
0 VU = -50 dBFS to 0 dBFS
Frequency Response



      

+0.25 dB 50 Hz to 20 kHz

ANALOG

Input Impedance


   
 HiZ mode greater than 20KOhm balanced
       
 LowZ mode 600 Ohm balanced
Meter Level





    
0 VU = -60 dBu to +30 dBu
Frequency Response

   

    
  
+0.25 dB 50 Hz to 20 kHz

GENERAL

Power Requirements





115 VAC,60 Hz 
  
 (Available upon request) 230 VAC,50 Hz
Dimensions



    
  
 19" wide x 3.5" high x 10.75" deep
   

  
 (483mm x 88mm x 273mm)

Weight








8.03lbs (3.65 kg)
Peak Detection Accuracy

+/- 1 dB


                                

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
 "file": "Products/METERING/XTM4/2014 - XTM4 - MANUAL (2).docx",
 "sha256": "fd57e9ee73ea6caf45470be8b9e800092e19857e32bfd675f71f8dd09ec43d9e",
 "kind": "module",
 "models": [
  "XTM4"
 ],
 "year": 2014,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "sections": [
    {
     "heading": "FRONT PANEL",
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
     "year": 2014,
     "kind": "month",
     "text": "Oct.01 2014"
    }
   ]
  }
 ]
}
```
