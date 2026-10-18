# 2015 - M6202AE - Manual _.docx
Wiki page: [M6202AE](../../../PAGES/M6202AE.md)


- **Year:** 2015 (found in this file: "©2015")
- **Module:** M6202AE
- **Category:** OPENGEAR
- **Module year estimate:** 2015 — copyright "©2015" in PUBLIC/Manuals + tech DOCUMENTS/openGear Series Manuals/M6202AE Manual _(1).docx
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/openGear Series Manuals/M6202AE Manual _.docx`
- **SHA-256:** `657b45fda5980065cd31ef04dc62b4d1fee46f81c5b7d2a35108ee5771e30ea4`
- **Size:** 1,039,195 bytes
- **Pages:** 1

## Dates found in this file

- **2015** (copyright): `©2015` — …s subject to change without notice or obligation. Copyright ©2015 Ward-Beck Systems Inc. All rights reserved. Contents of thi…
- **2015** (month): `Jan.01 2015` — …1450161925 -7619838100 by Ward-Beck Systems -7619838100 Rev:Jan.01 2015 Ward-Beck Part Number: M6202AE Document Issue: 1 Printed in…

## Full text

### Page 1 (Word document)

```text
M6202AE
OPENGEAR HD/SD-SDI AES/EBU AUDIO DEMUXER WITH DOLBY DECODER

User Manual








171450161925












-7619838100

by Ward-Beck Systems -7619838100

Rev:Jan.01 2015
Ward-Beck Part Number: M6202AE

Document Issue: 1
Printed in Canada

The information contained in this User Manual is subject to change without notice or obligation.

Copyright

©2015 Ward-Beck Systems Inc. All rights reserved.

Contents of this publication may not be reproduced in any form without the written permission of Ward-Beck Systems Inc. Reproduction or reverse engineering of copyrighted software is prohibited. 

Notice

The material in this manual is furnished for informational use only. It is subject to change without notice and should not be construed as a commitment by Ward-Beck Systems Inc. Ward-Beck Systems Inc. assumes no responsibility or liability for errors or inaccuracies that may appear in this manual.

Trademark
457200133350

is a registered trademark of Ross Video Limited.

530225177800

is a registered trademark of Ward-Beck Systems Inc.


All other product names and any registered and unregistered trademarks mentioned in this manual are used for identification purposes only and remain the exclusive property of their respective owners.
Important Regulatory and Safety Notices

Before using this product and any associated equipment, refer to the “Important Safety Instructions” listed below so as to avoid personnel injury and to prevent product damage.  Products may require specific equipment, and /or installation procedures be carried out to satisfy certain regulatory compliance requirements. Notices have been included in this publication to call attention to these Specific requirements.
Symbols Meanings

This symbol on the equipment refers you to important operating and maintenance (servicing) instructions within the Product Manual Documentation. Failure to heed this information may present a major risk of damage or injury to persons or equipment.
Warning
The symbol with the word “Warning” within the equipment manual indicates a potentially hazardous situation, which if not avoided, could result in death or serious injury.
Caution
The symbol with the word “Caution” within the equipment manual indicates a potentially hazardous situation, which if not avoided, may result in minor or moderate injury. It may also be used to alert against unsafe practices.
Notice
The symbol with the word “Notice” within the equipment manual indicates a situation, which if not avoided, may result in major or minor equipment damage or a situation which could place the equipment in a non-compliant operating state. 
ESD Susceptibility
This symbol is used to alert the user that an electrical or electronic device or assembly is susceptible to damage from an ESD event. 

Important Safety Instructions
Caution
This product is intended to be a component product of the openGear 8000 series frame. Refer to the openGear 8000 series frame User Manual for important safety instructions regarding the proper installation and safe operation of the frame as well as it’s component products. 
Warning
Certain parts of this equipment namely the power supply area still present a safety hazard, with the power switch in the OFF position. To avoid electrical shock, disconnect all A/C power cords from the chassis' rear appliance connectors before servicing this area.
Warning
Service barriers within this product are intended to protect the operator and service personnel from hazardous voltages. For continued safety, replace all barriers after any servicing.
This product contains safety critical parts, which if incorrectly replaced may present a risk of fire or electrical shock. Components contained within the product’s power supplies and power supply area, are not intended to be customer serviced and should be returned to the factory for repair.
To reduce the risk of fire, replacement fuses must be the same type and rating.
Only use attachments/accessories specified by the manufacturer.


EMC Notices

US FCC Part 15This equipment has been tested and found to comply with the limits for a class A Digital device, pursuant to part 15 of the FCC Rules. These limits are designed to provide reasonable protection against harmful interference when the equipment is operated in a commercial environment. This equipment generates, uses, and can radiate radio frequency energy and, if not installed and used in accordance with the instruction manual, may cause harmful interference to radio communications. Operation of this equipment in a residential area is likely to cause harmful interference in which case  users will be required to correct the interference at their own expense.

Notice
Changes or modifications to this equipment not expressly approved by Ward-Beck Systems  Inc. could void the user’s authority to operate this equipment.

CANADAThis Class “A” digital apparatus complies with Canadian ICES-003. 
Cet appareil numerique de classe “A” est conforme à la norme NMB-003 du Canada.

EUROPEThis equipment is in compliance with the essential requirements and other relevant provisions of CE Directive 93/68/EEC.

INTERNATIONALThis equipment has been tested to CISPR 22:1997 along with amendments A1:2000 and A2:2002 and found to comply with the limits for a Class A Digital device.
Notice
This is a Class A product. In domestic environments this product may cause radio interference in which case the user may have to take adequate measures.


Maintenance/User Serviceable PartsRoutine maintenance to this openGear product is not required. This product contains no user serviceable parts. If the module does not appear to be working properly, please contact Technical Support using the numbers listed under the “Contact Us” section on the last page of this manual.  All openGear products are covered by a generous 5-year warranty and will be repaired without charge for materials or labor within this period.  See the “Warranty and Repair Policy” section in this manual for details.  
Environmental Information

The equipment that you purchased required the extraction and use of natural resources for its production. It may contain hazardous substances that could impact health and the environment.
To avoid the potential release of those substances into the environment and to diminish the need for the extraction of natural resources, Ward-Beck Systems Inc. encourages you to use the appropriate take-back systems. These systems will reuse or recycle most of the materials from your end-of-life equipment in an environmentally friendly and health conscious manner.

The crossed-out wheeled bin symbol invites you to use these systems.


If you need more information on the collection, reuse, and recycling systems, please contact your local or regional waste administration.
















Introduction
Overview
The M6202AE is an HD/SD-SDI AES/EBU Audio Demuxer with integral Dolby decoder designed for broadcast use.  If the M6202AE is used as a demuxer only it can extract up to  two groups an SD-SDI or HD-SDI signal.  When the M6202AE is used as a Dolby decoder it becomes a one group demuxer.  Three modes are offered for Dolby decoding, please refer to TABLE 3.
The M6202AE will extract embedded audio in accordance with SMPTE 272M & SMPTE 299M standards and can decode Dolby E or Dolby digital signals according to the mode selected.  The M6202AE will also extract the metadata from the Dolby signal and present it at its output. Cable equalization and reclocking techniques enable the M6202AE to recover the incoming SD-SDI or HD-SDI signal reliably. With the appropriate rear module installed the M6202AE can provide either balanced 110 Ohm AES/EBU outputs or unbalanced 75 Ohm AES/EBU outputs. The M6202AE is housed in the openGear OG3-FR-C series frames.  
Functional Block Diagram 
Figure 1. Simplified Block Diagram of the M6202AE functions
Features
Automatic detection of video input format
Cable equalization and data reclocking on the incoming SD-SDI or HD-SDI signal
Card edge LED’s indicating video presence,  audio presence and card status
Audio group selection via DIP switches or DASHBOARD remote control and monitoring software.
Three  modes of Dolby extraction
5 year warranty
Fits openGear OG3-FR-C series frames
Documentation Terms
The following terms are used throughout this guide:
“Frame” refers to the OG3-FR-C frame that houses the M6202AE card. 
“Operator” and “User” refer to the person who uses the M6202AE.
“Board”, and “Card” refer to the M6202AE card itself, including all components and switches.
Installation and Setup
Static Discharge
Whenever handling the M6202AE and other related equipment, please observe all static discharge precautions as described in the following note:
ESDSusceptibility
Static discharge can cause serious damage to sensitive semiconductor devices. Avoid handling circuit boards in high static environments such as carpeted areas, and when wearing synthetic fiber clothing. Always exercise proper grounding precautions when working on circuit boards and related equipment.
Unpacking
Unpack each M6202AE you received from the shipping container, and check the contents against the packing list to ensure that all items are included.  If any items are missing or damaged, contact your sales representative or Ward-Beck Systems Inc. directly.

Rear Module Options 
There are two variations of the rear module offered.  The T6304 and T6306 are both for use with the 20-slot OG3-FR-C frame.
A retimed output of the SDI signal is provided, as well as the six AES outputs of the demuxed or decoded signal as well as a Metadata output on a pluggable 3 pin connector. The T6204 and T6304 rear modules offer 110 Ohm balanced AES outputs on pluggable 3 pin connectors while the T6306 offers unbalanced 75 Ohm AES outputs on BNC type connectors. For AES output assignments when the M6202AE is used as a demuxer/Dolby decoder please refer to TABLE 3 in the USER CONTROLS “DIP switch settings” section of this manual.

Figure 2. Rear Modules
Board Installation
Use the following procedure to install the M6202AE in an openGear Series frame. 
Refer to the User Manual of the openGear OG3-FR-C series frame to ensure that the frame is properly installed according to instructions. 
When using the M6202AE with the OG3-FR-C frame, please note that the even numbered slots are to be used.   Plug the M6202AE modules into slots 2,4,6,8,10,12,14,16,18, and 20 for a maximum of 10 cards.  Slot 1 is the left most slot as you look into the frame from the front.
After selecting the desired frame installation slot, hold the M6202AE card by the edges and carefully align the card edges with the slots in the frame.  Then fully insert the card into the frame until the rear connection plugs are properly seated on the midplane and on the rear module.
This completes the procedure for installing the M6202AE in an openGear OG3-FR-C Series frame.
User Controls
User Control Diagram
Figure 3.  Card-edge User Controls
LEDs
The front-edge of the card features LEDs that display the status of the input signals. As selections are made in the menus, (refer to the subsequent chapter for complete menu  descriptions), the LEDs display the status of the input signals. Descriptions are provided in the following table:

LED
Color
Location 
Display and Description
SD
Green
Top of the card
When on there is a valid SD-SDI signal at the input.

HD
Green
Second from the top
When on there is a valid HD-SDI signal at the input.

ERR
Red
Third from the top
When on a valid SD-SDI or HD-SDI signal is not present
AES1
Yellow
Fourth from the top
When on this indicates there is audio present within the SDI signal
AES2
Yellow
Fifth from the top
When on this indicates there is audio present within the SDI signal
AES3
Yellow
Sixth from the top
When on this indicates there is audio present within the SDI signal
AES4
Yellow
Seventh from the top
When on this indicates there is audio present within the SDI signal
Com Activity
Green
Eighth from the top
When on this indicates that the M6202AE is communicating to Dashboard through the CAN bus.
Error
Red
Ninth from the top
When on this indicates that there is an error in the communications to Dashboard through the CAN bus.
Table 1:  Status LED Descriptions
DIP switch settings

SW1
Reserved
SW2
Program 7 and 8 / Downmix Selector
SW3
Dolby Enable
SW4
Dolby Decoder Input AES Selector


SW5
AES5/AES6 MSB Selector& Dolby Decoder Input Group Selector
SW6
AES5 / AES6 LSB Selector & Dolby Decoder Input Group Selector
SW7
Reserved
SW8
Reserved

Program 7 and 8 / Downmix Selector SW2

ON
Lt/Rt Downmix on AES4
OFF
Program7 and 8 on AES4

Dolby Enable SW3

ON
Dolby decoding enabled
OFF
Dolby decoding disabled

Dolby Decoder AES1 / AES2 Selector SW4

ON
Decode embedded AES2 of selected group
OFF
Decode embedded AES1 of selected group

AES5 / AES6 OUT Group Selector & Dolby Decoder Input Group Selector SW5, SW6


MSB (SW5)
LSB (SW6)
Group
1
OFF
OFF
1(Default) 
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

Remote Control
General Information
This card may be monitored by a remote computer through Dashboard version 2.2.1 or higher. This free configuration monitoring software is available to openGear users at www.opengear.tv and is compatible with operating systems such as Windows, Linux and Mac.

The Dashboard control system is built on Ethernet and TCP/IP, allowing remote access across both LAN and WAN architectures. Multiple frames and cards can be connected to multiple control and monitoring stations at once.

Dashboard Control

The five sections pertinent to card control monitoring are shown in Figure 8 below:
Basic Tree View
Card Communication Summary
Card Info Menu
Card Status Menu
General Tasks

Figure 4.  Dashboard Remote Monitoring User Interface



1. BasicTree View
The basic tree view lists all frames connected remotely to Dashboard. Double-click the frame corresponding to the M6202AE card. An expanded list of all cards connected to the frame will appear. Locate the card labelled M6202AE and double-click to open the control monitoring panels for this card.

2. Card Communication Summary
MENU
ITEM
DISPLAY
DESCRIPTION
Card Communication Summary (Read Only)

M6202AE
Product identification code

Card State
(Green Dot) Ok
Card is functioning properly and appropriate signals are connected


(Red Dot) SDI Unlocked
SDI signal is not present


(Grey Dot) No connection to device
Communication between card and Dashboard is unavailable

Connection
(Green Dot) Online
Communication between card, frame and Dashboard is unavailable


(Red Dot) Offline
Communication between card and Dashboard is unavailable


(Grey Dot) No connection to frame
Communication between frame and Dashboard is unavailable

3. Card Info Menu
MENU
ITEM
DISPLAY
DESCRIPTION
Card Info (Read Only)
Product
M6202AE
Product identification code

Name
MD-SDI Embedded Audio Demultiplexer w/ Dolby Decoding
Product functional description

Manufacturer
Ward-Beck Systems Inc.
Manufacturer of the card

Software Rev.
###
Three digit software revision code

Web site
www.ward-beck.com
Manufacturer’s web address

4. Card Status Menu
MENU
HEADING
ITEM
DISPLAY
DESCRIPTION
Status (Read Only)
Inputs
SDI
(Green Dot) HD XXXX
Provides HD format information



(Green Dot) SD XXXX
Provides SD format information



(Red Dot) Unlocked
No SDI signal detected


Embedded Audio
-, C, D, E, P
Provides Embedded Audio Type Information for Each Channel
- - No Audio
C - Unidentifiable Compressed
D - Dolby Digital 
E - Dolby E
P - PCM


Dolby Decoder Status
(Green Dot) Ok
Dolby decoder installed and enabled



(Green Dot) N/A
Dolby decoder disabled



(Red Dot) Error
Dolby decoder not installed or not functioning properly


Outputs
AES1, AES2, AES3, AES4, AES5, AES6
(Green Dot)
Output functioning correctly



(Red Dot)
Output not functioning properly

Settings
Dolby Decoding
Enabled
Indicates that Dolby decoding has been Enabled / Disabled



Disabled



Dolby Decoder Input
Embed Audio Group # - AES#
Indicates the embedded audio location (group and AES number) from which the Dolby decoder is processing

4. Card Status Menu
MENU
DISPLAY
DESCRIPTION
General Tasks (Button)
REFRESH
When pressed, refreshes the dashboard display.

UPLOAD
Reserved.

REBOOT
When pressed, reboots the card.

CLOSE
When pressed, closes monitor control window.

Application
Processing Dolby Digital or Dolby E Audio with Dolby Decoder Enabled3981450361950
Set dip switch settings according to figure 5 to decode Dolby Digital or E audio. Dip switch [5,6] (AES5 / AES6 Selector & Dolby Decoder Input Group Selector) selects the group location of the Dolby signal proceeded by the Dolby decoder. Dip switch 4 (Dolby Decoder Input AES Selector) selects the AES1 or AES2 location of the Dolby signal within the respective group. Embedded audio transitioning from Dolby to PCM/Compressed will automatically be detected and passed by the card using these settings. outputs AES1-4 will function according to table 2. AES5 and AES6 outputs will always function as the de-embedded output set by dip switch ⅚.

Creating Lt/Rt Downmix of the Main Audio Program using Dolby Decoder
Toggle dip switch 2 to the ON position show in Figure 6, to create a Lt/Rt downmix of the main program (Program 1). A downmix will now be available on output AES4 OUT.






Dolby E Program Config or Dolby Digital coding mode
Main Output Channel Assignment

AES1 OUT
AES2OUT
AES3 OUT
*AES4 OUT

Ch 1
Ch 2
Ch 3
Ch 4
Ch 5
Ch 6
Ch 7
Ch 8
5.1 + 2
1L
1R
1C
1LFE
1Ls
1Rs
2L
2R
5.1 + 1 + 1
1L
1R
1C
1LFE
1Ls
1Rs
2C
3C
4 + 4
1L
1R
1C
1S
2C
2S
2L
2R
4 + 2 + 2
1L
1R
1C
1S
3L
3R
2L
2R
4 + 2 + 1 + 1
1L
1R
1C
1S
3C
4C
2L
2R
4 + 1 + 1 + 1 +1
1L
1R
1C
1S
4C
5C
2C
3C
2 + 2 + 2 + 2
1L
1R
3L
3R
4L
4R
2L
2R
2 + 2 + 2 + 1 + 1
1L
1R
3L
3R
4C
5C
2L
2R
2 + 2 + 1 + 1 + 1 + 1
1L
1R
3C
4C
5C
6C
2L
2R
2 + 1 + 1 + 1 + 1 + 1 + 1
1L
1R
4C
5C
6C
7C
2C
3C
1 + 1 + 1 + 1 + 1 + 1 + 1 + 1
1C
2C
3C
4C
5C
6C
7C
8C
5.1
1L
1R
1C
1LFE
1Ls
1Rs
none
none
4 + 2
1L
1R
1C
1S
none
none
2L
2R
4 + 1 + 1
1L
1R
1C
1S
none
none
2C
3C
2 + 2 + 2
1L
1R
3L
3R
none
none
2L
2R
2 + 2 + 1 + 1
1L
1R
3C
4C
none
none
2L
2R
2 + 1 + 1 + 1 + 1
1L
1R
4C
5C
none
none
2C
3C
1 + 1 + 1 + 1 + 1 + 1
1C
2C
3C
4C
5C
6C
none
none
4
1L
1R
1C
1S
none
none
none
none
2 + 2
1L
1R
none
none
none
none
2L
2R
2 + 1 + 1
1L
1R
none
none
none
none
2C
3C
1 + 1 + 1 + 1
1C
2C
3C
4C
none
none
none
none
3/2L (Dolby Digital)
1L
1R
1C
1LFE
1Ls
1Rs
none
none
3/2 (Dolby Digital)
1L
1R
1C
none
1Ls
1Rs
none
none
2/2L (Dolby Digital)
1L
1R
none
1LFE
1Ls
1Rs
none
none
2/2 (Dolby Digital)
1L
1R
none
none
1Ls
1Rs
none
none
3/1L (Dolby Digital)
1L
1R
1C
1LFE
1S
none
none
none
3/1 (Dolby Digital)
1L
1R
1C
none
1S
none
none
none
2/1L (Dolby Digital)
1L
1R
none
1LFE
1S
none
none
none
2/1 (Dolby Digital)
1L
1R
none
none
1S
none
none
none
3/0L (Dolby Digital)
1L
1R
1C
1LFE
none
none
none
none
3/0 (Dolby Digital)
1L
1R
1C
none
none
none
none
none
2/0 (Dolby Digital)
1L
1R
none
none
none
none
none
none
1/0 (Dolby Digital)
none
none
1C
none
none
none
none
none
1 + 1 (Dolby Digital)
1C
2C
none
none
none
none
none
none
PCM
1L
1R
none
none
none
none
none
none
* Note: When dip switch 2 is up, AES4 OUT functions as an Lt/Rt downmix and does not function according to table.

Table 2: Output Channel Assignment


Processing PCM or Dolby Audio with Dolby Decoder Disabled
A three group demux is available on the AES 1-6 outputs with the Dolby decoder disabled. Set dip switch settings according to Figure 7. Dip switch [5,6] (AES5 / AES6 Selector & Dolby Decoder Input Group Selector) selects the audio group of AES5 OUT and AES6 OUT. Dip switch 4 has no effect in this mode. Refer to section Dip Switch Settings for full details.
The AES 1-6 outputs will function according to table 3 below. 


Name of Output
Audio Description
AES1 OUT
Embedded Group 1, AES1
AES2 OUT
Embedded Group 1, AES2
AES3 OUT
Embedded Group 2,AES1
AES4 OUT
Embedded Group 2, AES2
AES5 OUT
Selectable via dip switch 5,6
AES6 OUT
Selectable via dip switch 5,6
Table 3












Technical Specifications

AES/EBU OUTPUTS

Output Impedance
75 Ohm or 110 Ohm transformer balanced
Output Level
1 V p-p terminated
Standard
AES3ID-1995


METADATA OUTPUT

Type
3-pin Phoenix connector female
Standard
RS-485
Bit Rate
115.2 kbps


SDI INPUT/ OUTPUT (RE-CLOCKED)

Connector Type
BNC Female
Format (HD-SDI)
1920 x 1080: 60, 59.94, 50 Hz
1280 x 720: 60, 59.94 Hz
Format (SD-SDI)
625-270, 525-270
Impedance

Input Level
75 Ohm
Max Cable Length
0.8 Vp-p
Output Jitter (HD)
100 m
Output Jitter (SD)
Less than 200 ps
Less than 950 ps
Standard
HD-SDI as per SMPTE 292M
SD-SDI as per SMPTE 259M


GENERAL

Dimensions
3.025” high x 12.800” deep
Power Requirements
+12V, 4 Watts, MAX
Weight
approx. 0.145 kg (.319 lbs)

Ward-Beck Systems Inc. reserves the right to change performance specifications without prior notice.
Warranty and Repair Policy

The openGear M6202AE is warranted to be free of any defect with respect to performance, quality, reliability, and workmanship for a period of FIVE (5) years from the date of shipment from our factory.  In the event that your openGear M6202AE proves to be defective in any way during this warranty period, Ward-Beck Systems Inc. reserves the right to repair or replace this piece of equipment with a unit of equal or superior performance characteristics.
Should you find that this openGear M6202AE has failed after your warranty period has expired, we will repair your defective product should suitable replacement components be available.  You, the owner, will bear any labor and/or part costs incurred in the repair or refurbishment of said equipment beyond the FIVE (5) year warranty period.
In no event shall Ward-Beck Systems be liable for direct, indirect, special, incidental, or consequential damages (including loss of profits) incurred by the use of this product.  Implied warranties are expressly limited to the duration of this warranty.
This openGear M6202AE User Manual provides all pertinent information for the safe installation and operation of your openGear Product. Ward-Beck policy dictates that all repairs to the openGear M6202AE are to be conducted only by an authorized Ward-Beck Systems factory representative. Therefore, any unauthorized attempt to repair this product, by anyone other than an authorized Ward-Beck Systems factory representative, will automatically void the warranty. Please contact Ward-Beck Technical Support for more information.
In Case of Problems
Should any problem arise with your openGear M6202A, please contact the Ward-Beck Technical Support Department.  (Contact information is supplied at the end of this publication.)
A Return Material Authorization number (RMA) will be issued to you, as well as specific shipping instructions, should you wish our factory to repair your openGear M6202A.  If required, a temporary replacement module will be made available at a nominal charge.  Any shipping costs incurred will be the responsibility of you, the customer.  All products shipped to you from Ward-Beck Systems Inc. will be shipped collect. 
The Ward-Beck Technical Support Department will continue to provide advice on any product manufactured by Ward-Beck Systems, beyond the warranty period without charge, for the life of the equipment.





WARD-BECK SYSTEMS INC.
945 Middlefield Road, Unit 9, Toronto, Ontario M1V 5E1
V 416 335 5999 F 416 335 5202 Toll-Free 800 771 2556
Website: www.ward­-beck.com
E-Mail: sales@ward­-beck.com


Ordering Information

Standard Equipment
M6202AE  HD/SD-SDI AES/EBU Audio Demuxer with Dolby Decoder
Optional Equipment
M6202AEUM HD/SDI AES/EBU Audio Demuxer with Dolby Decoder User Manual(additional User Manual)
OG3-FR-C Digital Products Frame and Power Supply with Cooling Fans (2RU, holds up to 20 cards) 
T6306A rear module for single card in OG3-FR-C frame
T6401A Ohm rear module for dual card in OG3-FR-C frame

Your M6202AE HD/SD-SDI AES/EBU Demuxer with Dolby Decoder is a part of the openGear family of products. Ward-Beck offers a full line of openGear terminal equipment including distribution, conversion, monitoring, muxing,  demuxing and processing of AES/EBU and HD/SD-SDI as well as analog audio and video products.
```

## Contents (JSON)

```json
{
 "file": "Products/OPENGEAR/M6202AE/2015 - M6202AE - Manual _.docx",
 "sha256": "657b45fda5980065cd31ef04dc62b4d1fee46f81c5b7d2a35108ee5771e30ea4",
 "kind": "module",
 "models": [
  "M6202AE"
 ],
 "year": 2015,
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
     "heading": "DESCRIPTION",
     "kind": "general"
    }
   ],
   "modules": [
    "M6202A"
   ],
   "dates": [
    {
     "year": 2015,
     "kind": "copyright",
     "text": "©2015"
    },
    {
     "year": 2015,
     "kind": "month",
     "text": "Jan.01 2015"
    },
    {
     "year": 1997,
     "kind": "year",
     "text": "1997"
    },
    {
     "year": 2000,
     "kind": "year",
     "text": "2000"
    },
    {
     "year": 2002,
     "kind": "year",
     "text": "2002"
    }
   ]
  }
 ]
}
```
