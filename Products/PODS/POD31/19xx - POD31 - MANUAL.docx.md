# 19xx - POD31 - MANUAL.docx
Wiki page: [POD31](../../../PAGES/POD31.md)


- **Year:** unknown (unknown)
- **Module:** POD31
- **Category:** PODS
- **Module year estimate:** unknown —
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/PODS/POD31 MANUAL.docx`
- **SHA-256:** `d13c1e58a757f38e3e9b3339ecbd82e952558605879c911e98f99e9859f3386c`
- **Size:** 421,261 bytes
- **Pages:** 1

## Full text

### Page 1 (Word document)

```text
POD31
SD/HD-SDI AES DEMUXER










by Ward-Beck Systems
Rev:Oct.01/14
POD31
SD/HD-SDI AES DEMUXER

This is one of many in our line of top quality, low-cost broadcast problem solvers.  PODs are compact, rugged and affordable.  They are suited for tabletop use or rack-mountable singly or in pairs, in any combination.

___________________________________________

POD31 is an audio demultiplexer designed to extract two groups of AES digital audio (four AES signals) simultaneously from an SD/HD-SDI signal.  A rear panel dip switch selects either groups 1, 2, 3 or 4 for demuxing. 

POD31 has one SD/HD-SDI input and two re-clocked SD/HD-SDI outputs on rear panel BNC connectors.  The demuxed AES outputs of the two selected groups appear on the balanced Phoenix connectors and the unbalanced BNC connectors located on the rear panel.

The POD31 has four modes of operation. 

Mode 1 is a conventional 2 group demuxer, where AES1 and AES2 of the first group selected are received on the rear panel BNC and Phoenix connectors labeled AES1 and AES2.  AES3 and AES4 are demuxed from the second group selected and are received on the rear panel BNC and Phoenix connectors labeled AES3 and AES4. 

Modes 2, 3 and 4 are for demuxing DolbyE/AC-3 signals.  In these modes the Dolby signal will be decoded into discrete PCM signals.  The AES1 output will have the L and R signals.  The AES2 output will have the C and LFE signals.  The AES3 output will have the LS and RS signals (see Table 2 for the output on AES4).  The Dolby Auto Detection option (SW5) used in Mode 2, 3 and 4 will look for a Dolby signal in the selected Audio Groups and decode it into discrete PCM audio signals.  The Non Multi-Channel Balanced Output option (SW6) used in Mode 2, 3 and 4 will not decode the compressed Dolby signal into discrete PCM signals on the rear panel Phoenix connectors.  The balanced Phoenix outputs will be the conventional 2 group demux as in Mode 1.

Note: Modes 2, 3 and 4 require the optional DolbyE/AC-3 decoder.

Front panel status LED tallies will indicate LOCK when a valid or SD/HD-SDI signal has been detected at the input.  If a valid signal is not detected at the input the ERROR LED will illuminate. 

When audio is present in the two selected groups (AUDIO GROUPS 1, 2, 3 and 4) their respective LED will illuminate.  If audio is not detected in the selected groups the respective LED’s will flash indicating NO AUDIO.  If Dolby E or AC-3 (DD) is detected in a group the respective group LED will flash along with the type of Dolby signal detected under the DOLBY header.
POD31 DIP SWITCH SETTINGS



ON


OFF
SW1
Group 1 MSB Selector

See Table 1
SW2
Group 1 LSB Selector


See Table 1
SW3
Group 2 MSB Selector

See Table 1
SW4
Group 2 LSB Selector


See Table 1
SW5
Dolby Auto Detection


Enabled

Disabled
SW6
Non Multi-Channel Balanced Output
Enabled

Disabled
SW7
Mode 1



See Table 2
SW8
Mode 0



See Table 2

-----------------------------------------------------------------------------------------------------------------
Table 1

Group X MSB

Group X LSB  
Group
1
   OFF

   
OFF


1
2
   OFF

   
ON


2
3
   ON

   
OFF


3
4
   ON

   
ON


4

- Group 1 and Group 2 Selector may be assigned to the same group.
-----------------------------------------------------------------------------------------------------------------
Table 2

Mode 1
Mode 0
Mode


1
   OFF

   OFF

No Dolby Decoding Enabled
2
   OFF

   ON

6-channel Dolby Decoding and 1 PCM 
3
   ON

   OFF

8-channel Dolby Decoding
4
   ON

   ON

6-channel Dolby Decoding and 1 Downmix (Lt/Rt)

- In Modes 2 and 4, if the multi-channel audio has information in ch7 and 8 it will not be demuxed on AES4 because of conflict with the PCM audio or the Downmix (Lt/Rt) of the respective modes.
                                                            
SPECIFICATIONS
HD/SD-SDI INPUT/OUTPUT
Input Impedance
75 Ohm
Input Level
0.8 V p-p
Output Level
0.8 V p-p
Output Impedance
75 Ohm
Return Loss
18 dB
Data Rate
270 Mb/s or 1.485 Gb/s
AES OUTPUT
Resolution
20 or 24 bits
Output Standard

AES/EBU 75 Ohm unbalanced




AES/EBU 110 Ohm  transformer balanced
Sampling Frequency 
48 kHz
Jitter
less than 5 ns
Level

1 Vp-p terminated
Power Requirements
115V AC/60Hz, 12 VA

230V AC/50Hz, 6 VA
Dimensions
8.69" wide x 1.73" high x 7.0" deep

(221mm x 44mm x 178 mm)
Weight                                                                                                                           3.01 lbs (1.37kg)

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
 "file": "Products/PODS/POD31/19xx - POD31 - MANUAL.docx",
 "sha256": "d13c1e58a757f38e3e9b3339ecbd82e952558605879c911e98f99e9859f3386c",
 "kind": "module",
 "models": [
  "POD31"
 ],
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
   ]
  }
 ]
}
```
