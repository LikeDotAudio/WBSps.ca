# 1994 - R2K - RoughDraftConsoleManualorginial (1).docx
Wiki page: [Consoles](../../../PAGES/Consoles.md)


- **Year:** 1994 (inferred: project R2K: M908, which it is about (traced))
- **Console:** R2K
- **Project:** R2K
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Consoles/R2K/RoughDraftConsoleManualorginial (1)(1).docx`
- **SHA-256:** `cf373343d8ce6a06a98b32108143bf76f03b601600e512dc8781c269f73f8ed3`
- **Size:** 234,291 bytes
- **Pages:** 1

## Full text

### Page 1 (Word document)

```text
R201 & R221
STEREO INPUT MODULE

The R201 & R221 accept two balanced stereo console, inputs, A or B, and has individual front panel accessible screw driver adjustments to trim the level of the left (lower trim) and right (upper trim) channels.  A MONO pushbutton switch will sum the left and right stereo signal.  This feature is particularly useful when only a mono signal is available at the input or either of the channels of the stereo signal is missing.  The MONO function may be selected by pressing the front panel pushbutton.

Stereo balanced insert points are provided prior to the FADER and CHANNEL ON switch.  Convenient insert bypass jumpers are located on the module circuit board.

The pre-FADER, pre-CHANNEL ON, CUE switch allows the operator to preview an incoming signal on the cue speaker located in the console meter bridge.

The direct audio FADER controls the overall signal level through the module.  A reference indicating mark at the 12dB in-hand position is provided.  The CHANNEL ON control routes the signal to the output stage of the module.

The signal may be assigned to any or all of stereo PROGRAM 1, 2, 3, 4 or MONO MIX 1,2 mixing buses.  All mixing buses are balanced.  Send levels to the MONO MIX 1 and 2 buses may be adjusted via front panel potentiometers only on the R221.  Each input module also has a stereo DIRECT output  that  follows the CHANNEL ON switch.

All select, function and assignment switches are equipped with LED indicators.  The LED’s illuminate to indicate that the switch has been activated.  The R221 also has a separate channel on LED indicator in parallel to the channel on switch indicator.

Each R201/R221 input module has four programmable input and four programmable output controls for external control.  The module may also be configured to activate the MUTE A, B, C, AUTO CUE or TIMER RESET buses.  An RS485 serial I/O port on the R221 allows some module functions to be under serial control. 



R201 & R221
STEREO INPUT MODULE CONTROL

A-B SOURCE SELECT
Source pushbuttons A and B are electronically interlocked and select between stereo inputs A and B respectively.  Left and right trim controls are accessible from the front panel.  These trim controls are post input select.

MONO SELECT
Pressing the MONO pushbutton will mix the left and right channels (L+R) with a -6dB  gain.  This mono mix  is then fed equally to the left and right  channels prior to the  module insert out.

P1-P4 PROGRAM ASSIGN
Alternate action pushbuttons P1 to P4 assign the signal to the four stereo program mix buses. The audio signal assigned to buses P1 to P4 is picked up post fader and is channel on dependent. 

M1 and M2  MONO ASSIGN
Alternate action pushbuttons assign the signal to the two mono mix buses.  The audio may be picked up post-fader or pre-fader by setting programming jumpers and follows the channel on control.  The audio may be picked up pre-channel on or post-channel on by setting SW4 and SW5 on the DIP Switch.  Assignment to the mixing buses may be enabled or muted by the setting SW6 and SW7 on the DIP Switch.  M1 and M2 may also be sent to the module direct output by setting SW8 appropriately.

CUE  ASSIGN
Assignment of the signal to the cue bus is via the alternate action CUE pushbutton. The end of travel switch on the fader will turn the CUE off. The signal for assignment to the cue bus is picked up pre fader and pre channel on.  The cue audio is heard on the local console speaker.  The volume control for this speaker is located on the R206/R206A utility module.  Pressing the cue button also activates the auto cue feature in the console headset circuit.  Auto cue superimposes pre fader audio, from the cued input channel, over the dimmed monitor audio in the right headset channel.  The level of the left monitor audio in the headset remains unchanged.  Cue speaker muting can be selective effected by mute bus A,B or C.

CHANNEL ON
The channel ON pushbutton enables the audio signal to the program assignment pushbuttons, P1 to P4, the mono assignment pushbuttons, M1 and M2 and the channel direct output.  Pressing the channel ON button generates a timer reset and mute control.  The timer reset bus is connected internally to the timer electronics and any module may be jumper programmed to reset the timer.  The mute control may be jumper selected to any or all of mute buses A, B or C.  The mute control may also be set to follow input selection A or B.  The channel ON button normally operates as an alternate action switch to turn the channel on (switch illuminated) and off, or the channel may be programmed to always be on (switch illuminated) and the button may be used as an event start control. 

EXTERNAL CONTROL
For external control, the R221 input modules offer four control inputs and four control outputs.  Up to eight different pre-programmed operating modes are offered.  The different modes are selected by setting a series of DIP switches and include the definition of the operation of the channel ON and OFF switches.

DIP SWITCH SETTINGS (REF DES=SW2)

SWITCH FUNCTIONS

SW1

Mode Selection
SW2

Mode Selection
SW3

Mode Selection
SW4

M1 Pre/Post Channel On
SW5

M2 Pre/Post Channel On
SW6

M1 Muted/Enabled
SW7

M2 Muted/Enabled
SW8

Direct Out Enable/Disable

MODE SELECTION

SW3
SW2
SW1
OFF
OFF
OFF

Mode0
OFF
OFF
ON

Mode1
OFF
ON
OFF

Mode2
OFF
ON
ON

Mode3
ON
OFF
OFF

Mode4
ON
OFF
ON

Mode5
ON
ON
OFF

Mode6
ON
ON
ON

Mode7



M1 AND M2 CONTROLS

SW4
OFF

M1 Pre-Channel On
ON

M1 Post-Channel On

SW5
OFF

M2 Pre-Channel On
ON

M2 Post-Channel On

SW6
OFF

M1 muted
ON

M1 enabled

SW7
OFF

M2 muted
ON

M2 enabled

SW8
OFF

Direct output disable (M1 to direct out left
M2 to direct out right)
ON

Direct output enable


Note: OFF position is down, ON position is up 







MODES OF OPERATION:

MODE 0:
Control in 1- CH ON
Control out 1- CH ON + INA Tally
     
Control in 2- CH OFF
Control out 2- CH ON + INB Tally
    
Control in 3- A SEL
Control out 3- A Tally


Control in 4- B SEL
Control out 4- B Tally



Channel ON acts as an alternate action push button.

MODE 1:
Control in 1- CH ON
Control out 1- CH ON  + INA event pulse
Control in 2- CH OFF
Control out 2- CH ON + INB event pulse
Control in 3- A  SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator. When bringing fader down, the end of travel turns the channel off.  

MODE 2:
Control in 1- CH ON
Control out 1- CH ON + INA Tally
Control in 2- CH OFF
Control out 2- CH ON + INB Tally
Control in 3- A  SEL
Control out 3- CH OFF + INA Tally
Control in 4- B SEL
 Control out 4- CH OFF + INB Tally

Channel ON acts as an alternate action pushbutton.


MODES OF OPERATION(cont'd)
MODE 3:
Control in 1- CH ON
Control out 1- CH ON  + INA event pulse
Control in 2-CH OFF
Control out 2- CH ON + INB event pulse
Control in 3- A  SEL
Control out 3- CH OFF  + INA event pulse
Control in 4- B SEL
Control out 4- CH OFF + INB event pulse



Channel ON acts as an alternate action pushbutton

MODE 4:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- A  SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).

MODE 5:
Control in 1- CH ON
Control out 1- CH ON Tally
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- A  SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally
When bringing fader down, the end of travel turns the channel off.  Channel ON acts as an alternate action pushbutton.


MODE 6:
Control in 1- CH ON
Control out 1- CH ON Tally
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- CUE ON
Control out 3- CUE ON Tally
Control in 4- CUE OFF
Control out 4- CUE OFF Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON acts as an alternate action push button

MODE 7:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- Cue On
Control out 3- Cue on Tally
Control in 4- Cue Off
Control out 4- Cue off Tally

When bringing fader down the end of travel turns the channel off. Channel  ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).



R207
STEREO INPUT MODULE


        
The R207 accepts two balanced stereo inputs, A or B, and has individual front panel accessible screw driver adjustments to trim the level of the left and right channels.  A MONO pushbutton switch will sum the left and right stereo signal.  This feature is particularly useful when only a mono signal is available at the input or either of the channels of the stereo signal is missing.

Stereo balanced insert points are provided prior to the FADER and CHANNEL ON switch.  Convenient insert bypass jumpers are located on the module circuit board.

The pre-FADER, pre-CHANNEL ON, CUE switch allows the operator to preview an incoming signal on the cue speaker located in the console meter bridge.

The direct audio FADER controls the overall signal level through the module.  A reference indicating mark at the 12dB in-hand position is provided.  In the R207 module, the BALANCE control follows the FADER in circuit.  The CHANNEL ON control routes the signal to the output stage of the module.

The signal may be assigned to any or all of stereo PROGRAM 1, 2, 3, 4 or MONO MIX 1,2 mixing buses.  All mixing buses are balanced.  Each input module also has a stereo DIRECT output that follows the FADER, BALANCE and CHANNEL ON switch.

All select, function and assignment switches are equipped with LED indicators.  The LEDs illuminate to indicate that the switch has been activated.

Each R207 input module has four programmable input and four programmable output controls for external control.  The module may also be configured to activate the MUTE A, B, C, AUTO CUE or TIMER RESET buses.  An RS485 serial I/O port on the R207 allows some module functions to be under serial control.


R207 
STEREO INPUT MODULE CONTROL

A-B SOURCE SELECT
Source pushbuttons A and B are electronically interlocked and select between stereo inputs A and B respectively.  Left and right trim controls are accessible from the front panel.  These trim controls are post input select.

MONO SELECT
Pressing the MONO pushbutton will mix the left and right channels (L+R) with a -6dB  gain.  This mono mix  is then fed equally to the left and right  channels prior to the  module insert out.

P1-P4 PROGRAM ASSIGN
Alternate action pushbuttons P1 to P4 assign the signal to the four stereo program mix buses. The audio signal assigned to buses P1 to P4 is picked up post fader and is channel on dependent. 

M1 and M2  MONO ASSIGN
Alternate action pushbuttons M1 and M2 assign the signal to two mono mix buses. The audio signal assigned to buses M1 and M2 is picked up post fader and is channel on dependent. 


CUE  ASSIGN
Assignment of the signal to the cue bus is via the alternate action CUE pushbutton. The end of travel switch on the fader will turn the CUE off. The signal for assignment to the cue bus is picked up pre fader and pre channel on.  The cue audio is heard on the local console speaker.  The volume control for this speaker is located on the R206 utility module.  Pressing the cue button also activates the auto cue feature in the console headset circuit.  Auto cue superimposes pre fader audio, from the cued input channel, over the dimmed monitor audio in the right headset channel.  The level of the left monitor audio in the headset remains unchanged.  Cue speaker muting can be selective effected by mute bus A,B or C.

Channel ON
The channel ON pushbutton enables the audio signal to the program assignment pushbuttons, P1 to P4, the mono assignment pushbuttons, M1 and M2 and the channel direct output.  Pressing the channel ON button generates a timer reset and mute control.  The timer reset bus is connected internally to the timer electronics and any module may be jumper programmed to reset the timer.  The mute control may be jumper selected to any or all of mute buses A, B or C.  The mute control may also be set to follow input selection A or B.  The channel ON button normally operates as an alternate action switch to turn the channel on (switch illuminated) and off, or the channel may be programmed to always be on (switch illuminated) and the button may be used as an event start control. 

EXTERNAL CONTROL
For external control, the R201 module offers four inputs and four outputs.  Up to eight different pre-programmed operating modes are offered.  These different modes are jumper selectable and include the definition of the operation of the channel ON switch. Control inputs require a momentary closure to ground and outputs are open collectors.

MODES OF OPERATION

MODE 0:
Control in 1- CH ON
Control out 1- CH ON Tally
     
Control in 2- CH OFF
Control out 2- CH OFF Tally
    
Control in 3- A  SEL
Control out 3- A Tally


Control in 4- B SEL
Control out 4- B Tally



Channel ON acts as an alternate action push button.

MODE 1:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- A  SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).

MODE 2:
Control in 1- CH ON
Control out 1- CH ON Tally
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- Cue On
Control out 3- Cue on Tally
Control in 4- Cue Off
 Control out 4-  Cue off Tally

Channel ON acts as an alternate action pushbutton.

MODE 3:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2-CH OFF
Control out 2- CH OFF Tally
Control in 3- Cue On
Control out 3- Cue on Tally
Control in 4- Cue Off
Control out 4-  Cue off Tally



Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).

MODE 4:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- A  SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).

MODE 5:
Control in 1- CH ON
Control out 1- CH ON Tally
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- A  SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON acts as an alternate action pushbutton.

MODE 6:
Control in 1- CH ON
Control out 1- CH ON Tally
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- CUE ON
Control out 3- CUE ON Tally
Control in 4- CUE OFF
Control out 4- CUE OFF Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON acts as an alternate action push button

MODE 7:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2- CH OFF
Control out 2- CH OFF Tally
Control in 3- Cue On
Control out 3- Cue on Tally
Control in 4- Cue Off
Control out 4- Cue off Tally

When bringing fader down the end of travel turns the channel off. Channel  ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).

MODE SETUP FOR R207 USING MODE JUMPERS

2

1

0
Off

Off

Off

Mode0
Off

Off

On

Mode1
Off     

On

Off

Mode2
Off

On

On

Mode3
On 

Off

Off

Mode4
On 

Off

On

Mode5
On

On

Off

Mode6
On

On

On

Mode7
















R202
STEREO OUTPUT MODULE


The R202 contains the summing and output amplifiers for PROGRAM 1, 2, 3, 4 and MONO MIX 1,2 buses.  To provide the correct console outputs, the R202 must be installed in slot 13 of the R2K/12, slot 21 of  the R2K/20 or slot 29 of the R2K/28 console.

Balanced, low impedance outputs suitable for driving bridging loads are provided.  PROGRAM 1 left and right have three splits each while the remaining PROGRAM and MONO MIX outputs each have two splits.  For increased program distribution, WBS 8200 series distribution amplifiers may be mounted in the ancillary module slots of the MF251 power supply frame. 
R203
CONTROL ROOM MONITOR MODULE

The R203 module provides monitoring and metering selection for the console.  This module is equipped with an eight input two output balanced  stereo audio switcher and has two banks of 8 front panel switches for independent meter and monitor selections.  All audio connections are made via convenient pluggable screw terminal blocks. 

The meter output is connected to the AUX LED Bargraph meter in  the meter bridge of the console.

The monitor output is equipped with a VCA allowing front panel volume control via a rotary optical encoder, which ensures a long operating  life.  The monitor output may also be muted by the consoles mute buses A and/or B.  When mute C is active it switches monitor selector to 1.  The monitor output level can automatically diminish when the auto cue is active.  Shorting jumpers on the main circuit board allow  for easy configuration of these  features.  The monitor selector output is routed via the R251 mother board to the auto cue/headset circuit on the R206 utility board.  This feed is the output of the monitor switcher and is not affected by the R203 volume or mute controls. 


R204
STUDIO MONITOR MODULE

The R204 module provides studio monitoring and talkback selection for the console. This module is equipped with an eight input, two output balanced stereo audio switcher and has two banks of 8 front panel switches for independent monitor selections for two studios.  All audio connections are made via convenient pluggable screw terminal blocks. 

The monitor outputs for studio 1 and 2 each have a front panel volume control and a talkback enable pushbutton. The talkback audio is fed internally via the R251 motherboard from the R206 to the R204. When talkback is enabled, the right monitor output is diminished by 20dB and the talkback audio is inserted at full level. The talkback audio may also be enabled externally via the R206. The monitor outputs may be muted by the mute buses A, B or C on the console.  Shorting jumpers on the main circuit board allow for easy  configuration of  this feature.

Studio 1 and 2 talkback controls are jumper selectable for input or output signals.  If the jumper is set for an input, the R204 will accept signals from the R206 external talkback controls.  The status of the R206 external talkback controls’ status will be displayed on the tallies of the studio1/2 buttons respectively.  If the jumper is set for an output, the R204 will read the studio1 and 2 pushbuttons and the send their control output signals to the R206 utility module.


R205 
8 x 2 STEREO LINE SELECTOR

The R205 is an 8 x 2 Stereo Line Selector.  Two banks of eight illuminating pushbutton switches allow for the independent selection of any input to the two selector outputs.  A convenient, front panel designation strip allows for easy identification of the eight selector inputs.

In a standard console, the four left hand module slots are equipped with all input and output connectors to accommodate the R205 module.  In custom configurations, the R205 may be located in any input channel slot, as long as the full complement of external input connectors are installed.
R206
UTILITY MODULE

The R206 Utility Module serves as a “catchall” module for various console functions.  It houses the drive amplifiers for the console headset, cue speaker, timer driver and controls, a utility LED, bar graph, and a level indicator.  The R206 also contains the RS422/485 interface circuitry that facilitates serial data communications between the console and an external device.  The standard version of the R206 contains software that is intended to communicate with Ward-Becks R257 series studio turrets.  The studio turrets are addressable and are polled by R206 via its RS422 port.  Control information from the turrets is transferred to the internal RS485 bus on the console.  Consult factory for other control options.  

Front panel accessible features include the headphone level and jack, timer controls (please refer to the detailed timer control description), cue level control, auto cue and mute indicator and the stereo ten segment LED level indicators.

The LED level indicators may be fed directly with any program signal or may be fed via a selector module (R203, R204 or R205).

The R206 is slot specific and is located in the most right hand module slot on all R2K series consoles.  Via the internal console serial bus, the R206 can transport control and tally information between console modules such as the R201, R203, R204, R205 and R207, and an external device operating with appropriate communications protocol.

TIMER CONTROLS

STOP/RESET

(SEC)

The LED in the STOP/RESET control serves to indicate the 


following states:
1)  LED is extinguished means that the timer is running
2) LED is illuminated means that the timer has been stopped or reseted.  Pushing the timer button while the LED is illuminated will cause the timer to reset.  The timer will reset to 0:00:00 unless the DOWN button is activated and a preset time has been loaded for the timer, in which case the timer will reset to the pre-loaded value.

START
(MIN)

Pressing the START button will initiate the count.  The timer will resume counting up or down (if the DOWN button is active) from the displayed time.  While the timer is counting the START LED is lit while the STOP/RESET LED is extinguished.

DOWN 

(HR)

The DOWN button can only be activated while the timer is stopped.  Pressing the DOWN button will preset the timer to count down from the displayed time the next time the START button is pushed.

LOAD

The LOAD button can only be activated if the timer is stopped.  Pressing the LOAD button will cause the function of the STOP/RESET, START and DOWN to change to (SEC) seconds preset, (MIN) minutes preset and (HR) hour preset, respectively.  After the LOAD button is pressed using the (SEC),(MIN) and (HR) buttons, a preset time can be entered.  When the LOAD button is active, the display will flash and time will increment from the displayed value.

CLOCK SETTING CONTROLS

The R206 module also embeds the time of day in the timer display serial code for installations that do not have time code available.  To use this feature you must ensure that the timer serial code output is connected to the time code input at the R206 module position.

When the timer is stopped, pressing and holding the LOAD button for about 5 seconds will cause the CLOCK SETUP MODE to start.  The timer display will display dashes ( -.-.--) once the set time mode is entered.  When you are in this mode you can set the time of day in the same manner as setting the timer except that the seconds button will reset the seconds to zero.  To exit the CLOCK SETUP MODE press the LOAD button.




R206A
UTILITY MODULE

The R206A Utility Module serves as a “catchall” module for various console functions.  It houses the drive amplifiers for the console headset, cue speaker, timer driver and controls, and system settings recall.  The R206A also contains the RS422/485 interface circuitry that facilitates serial data communications between the console and an external device.  The standard version of the R206A contains software that is intended to communicate with Ward-Becks R257 series studio turrets.  The studio turrets are addressable and are polled by R206A via its RS422 port.  Control information from the turrets is transferred to the internal RS485 bus on the console.  Consult factory for other control options.
 
Front panel accessible features include the headphone level and jack, timer controls (please refer to the detailed timer control description), cue level control, auto cue and mute indicator and four programmable system settings recall buttons.

The R206A is slot specific and is located in the most right hand module slot on all R2K series consoles.  Via the internal console serial bus, the R206A can transport control and tally information between console modules such as the inputs (R201 to R221), R203, R204 and an external device operating with appropriate communications protocol.

TIMER CONTROLS

RESET

The LED in the RESET control serves to indicate the following 
(SEC)

 states:
1)  LED is illuminated means that the timer has been reseated.
2)  LED is extinguished means that the timer is running.  Pushing the RESET button while the timer is not running will cause the timer to reset.  The timer will reset to 0:00:00 unless the DOWN button is activated and a preset time has been loaded for the timer, in which case the timer will reset to the pre-loaded value.

START/STOP
Pressing the START/STOP button will initiate the count. The timer (MIN)will resume counting up or down (if the DOWN button is active) from the displayed time. While the timer is counting the START/STOP LED is illuminated while the RESET LED is extinguished.  Pressing the START/STOP button while the timer is counting will stop the count.

DOWN

The DOWN button can only be activated while the timer is
(HR)

stopped.  Pressing the DOWN button will preset the timer to count down from the displayed time the next time the START/STOP button is pushed.

LOAD

The LOAD button can only be activated if the timer is stopped.  Pressing the LOAD button will cause the function of the RESET, START/STOP and DOWN to change to (SEC) seconds preset, (MIN) minutes preset and (HR) hour preset, respectively.  After the LOAD button is pressed using the (SEC),(MIN) and (HR) buttons, a preset time can be entered.  When the LOAD button is active, the display will flash and time will increment from the displayed value.
PROGRAMMABLE CONFIGURATION RECALL FUNCTION

The programmable configuration recall function allows for system settings to be saved and  recalled with the push of a button.  There are four buttons on the front panel which allow for four system settings to be saved and restored.  

Saving the System Settings

When SW5-1 is the ON position or a  closure to ground is detected on the positive terminal of A8, the save feature is enabled.  To save the current system settings, simply press and hold one of the recall buttons for approximately 10 seconds.  Then all recall buttons will illuminate indicating that the reading of  the system settings has begun.  Release the recall button.  The system settings have been saved when all the recall leds have extinguished.  The current system settings will be assigned to the recall button that was pressed and held, therefore allowing for four (4) different settings to be stored. If SW5-1 is the OFF position, the save feature is disabled.  

NOTE: A closure to ground on the positive terminal of A8 overrides the SW5-1.


Recalling the System Settings

When SW5-1 is the ON position, simply press the recall button that has the system settings that are to be recalled.  Once pressed, the recall button led will stay illuminated.  Once the settings have been restored, the recall button led will extinguish.  When SW5-1 is the OFF position, press and hold one of the recall buttons for approximately 10 seconds, the recall button will stay illuminated.  Release the recall button.  Once the setting have been restored, the recall button led will extinguish.



CLOCK SETTING CONTROLS

The R206A module embeds the time of day in the timer display serial code for installations that do not have time code available.  To use this feature you must ensure that the timer serial code output is connected to the time code input at the R206A module position.

When the timer is stopped, pressing and holding the LOAD button for about 5 seconds will cause the CLOCK SETUP MODE to start.  The timer will display dashes (–.–.–) once the set time mode is entered.  When you are in the mode you can set the time of day in the same manner as setting the timer except that the seconds button will reset the seconds to zero.  To exit the CLOCK SETUP MODE press the LOAD button.


CONTROL OUTPUTS

When SW5-2 is in the OFF position and the R204 module is set to OUTPUT then the CONTROL OUTPUT 3 is TB1 and CONTROL OUTPUT 4 is TB2 and terminal B3 is not used.









R208
EQUALIZER MODULE

The R208 equalizer module provides four independent stereo three band equalizers in a single module strip.  The equalizers may be wired into the insert point of any of the input modules by installing the appropriate jumpers on the motherboard.

The boost cut controls provide approximately 15 dB of boost or cut to the signal in the low (LF) mid (MF) or high (HF) frequency bands.

R209
CLEAN FEED MODULE

The R209 Clean Feed Module can provide mix minus sends to feed up to six telephone hybrids.   Front panel pushbuttons allow assignment of Mono Mix 1, Mono Mix 2 or both to any of the six send outputs.

The return signal from any or all hybrids may be connected to the R209 to allow a telephone conference circuit to be set up using internal jumpers.














































R209A
CLEAN FEED MODULE

The R209A Clean Feed Module can provide mix minus sends to feed up to six telephone hybrids.   Front panel pushbuttons allow assignment of Mono Mix 1, Mono Mix 2 or both to any of the six send outputs.  Each channel has a talkback and an input disable, as well as, external controls for input and output disables.  The ALL CALL feature is provided to allow for talkback to all channels with output enabled.

The return signal from any or all hybrids may be connected to the R209A to allow a telephone conference circuit to be set up using internal jumpers.

MODES OF OPERATION

DISABLE 
(alternate action)
-disables input from respective channel from buss
-does not affect M1, M2 and talkback

M2 

(alternate action)
-enables M2 to feed the respective channel output

M1 

(alternate action)
-enables M1 to feed the respective channel output

TB 

(momentary)
-enables TB to feed the respective channel output

ALL CALL 
(momentary)
-enables TB to feed all channel outputs

EXTERNAL CONTROLS

Input X Disable
-closure to ground will allow for the input channel to disable audio to the input buss.
-the module DISABLE button will override external input X disable.

Channel X Output Disable
-closure to ground will allow for the channel to disable audio to the output.

Note:
A modification must be made to channel 6 output enable and input enable.  A jumper must be made to the 24th thru-hole (from the top) of both A and B side terminations of the module’s respective channel.  This modification will allow access to the external control Channel 6.  Otherwise Channel 6 will always have output disabled.  See R209A termination diagram.



R210
STUDIO MONITOR MODULE

The R210 module provides studio monitoring and talkback from the console to six locations.  This module is equipped with a four  input switcher that is used to select the program to be fed to the six locations.  The six momentary talkback pushbuttons allows the console operator to talk to the six locations. 

Operating a talkback button causes the right program feed to be interrupted and replaced by the talkback signal.  The left program signal is not altered.  Talkback pushbutton 6 is used as ALL CALL to talk to all 6 locations at the same time.

The R210 can be jumper programmed to have outputs 1 to 6 selectively muted.  The module may also be programmed to operate in one of two distinct modes

JUMPER SETTINGS

MUTE ENABLE
To enable the muting of the six outputs of the R210 select the mute bus A, B or C that will effect the mute of the R210 outputs.  Place the mute enable jumpers M1 to M6 in the ON position to enable the mute control of that output.

To indicate that a channel output is muted, the LED tally in the talkback switch will flash when the switch is pushed.

MODE 1 SELECTION
CTL2 jumper in OFF position

In MODE 1 operation operating a talkback button interrupts the right program audio and replaces it with the talkback signal. Mute Enable jumpers will only effect the program audio and has no effect on the talkback audio

MODE 2 SELECTION

CTL2 jumper in ON position

Operating talkback switches 1 through 6 is as described in MODE 1 operation.

Mute enable jumpers will effect both the program and talkback audio.

EXTERNAL CONNECTIONS TO R210*

TALKBACK CONTROL
1
R206 Module slot connector B3 (TB1)
2
R206 Module slot connector B3 (TB2)
3
R210 Module slot HDST2 R (3) 
|
4
R210 Module slot HDST2 R (4) 
|not active
5
R210 Module slot HDST2 L (5)    |in MODE 2
6
R210 Module slot HDST2 L (6) 
|

*Please refer to console termination diagrams of R206 and R210
```

## Contents (JSON)

```json
{
 "file": "Consoles/1990-1999/R2K/1994 - R2K - RoughDraftConsoleManualorginial (1).docx",
 "sha256": "cf373343d8ce6a06a98b32108143bf76f03b601600e512dc8781c269f73f8ed3",
 "kind": "console",
 "models": [
  "R2K"
 ],
 "year": 1994,
 "pages": 1
}
```
