# 1994 - R2K - INPUT MODULES MANUAL.pdf
Wiki page: [Consoles](../../../PAGES/Consoles.md)


- **Year:** 1994 (inferred: project R2K: M908, which it is about (traced))
- **Console:** R2K
- **Project:** R2K
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Consoles/R2K/INPUT MODULES MANUAL (1).pdf`
- **SHA-256:** `200f309214d8d97a8e6077b3c8dbcfcb3c82a63a7502faa37547d83901954eb4`
- **Size:** 192,473 bytes
- **Pages:** 7
- **PDF created (scan date, not design date):** Wed Oct 20 10:49:54 2004 EDT

## Full text

### Page 1 (PDF text layer)

```text
R241                  R242             R243             R244



                                                                 SAS              SAS
                 I         A           I         A              ROUTER           ROUTER
                N                     N
                P                     P
                U          B          U          B
                T                     T


                           MONO                  MONO


  COOL GREY
INPUT MODULES
   R241/R242
   R243/R244
                1                 2   1                 2   1            2   1            2

                     SENDS                 SENDS                SENDS            SENDS
                     ASSIGN                ASSIGN               ASSIGN           ASSIGN
                P                 A   P                 A   P            A   P            A
                G                 U   G                 U   G            U   G            U
                M                 D   M                 D   M            D   M            D

                U                 A   U                 A   U            A   U            A
                T                 U   T                 U   T            U   T            U
                L                 X   L                 X   L            X   L            X



                C                     C                     C                C
                U                     U                     U                U
                E                     E                     E                E



                     +12                   +12                  +12              +12



                     +6                    +6                   +6               +6



                      0                     0                    0                0




                      -6                    -6                   -6               -6




                     -20                   -20                  -20              -20




                     -40                   -40                  -40              -40


                     -60                   -60                  -60              -60
                     8




                                           8




                                                                8




                                                                                 8
```

### Page 2 (PDF text layer)

```text
A   B
GND                                      A RIGHT INPUT +
                                                                              TYPICAL TERMINAL BLOCK
A LEFT INPUT -                           A RIGHT INPUT -   1
A LEFT INPUT +                                     GND

GND                                      B RIGHT INPUT +
B LEFT INPUT -                           B RIGHT INPUT -   2
B LEFT INPUT +                                     GND

GND                                  RIGHT INSERT OUT+
LEFT INSERT OUT -                     RIGHT INSERT OUT-    3
                                                                                      + - G
LEFT INSERT OUT +                                  GND

GND                                 RIGHT INSERT INPUT+
LEFT INSERT INPUT -                 RIGHT INSERT INPUT-    4
LEFT INSERT INPUT +                                GND

GND                              RIGHT DIRECT OUTPUT+**         ** WHEN ENABLED
LEFT DIRECT OUTPUT -**           RIGHT DIRECT OUTPUT-**    5    SEND 1 APPEARS ON LEFT DIRECT OUTPUT
LEFT DIRECT OUTPUT +**                             GND          SEND 2 APPEARS ON RIGHT DIRECT OUTPUT
GND                                     NO CONNECTION
NOT CONNECTED                           NO CONNECTION      6
NOT CONNECTED                                      GND

GND                                     NO CONNECTION
NO CONNECTION                           NO CONNECTION      7
NO CONNECTION                                      GND

GND                                     NO CONNECTION
NO CONNECTION                           NO CONNECTION
                                                           8
NO CONNECTION                                      GND

GND                                    CONTROL INPUT 3
CONTROL INPUT 2                        CONTROL INPUT 4     9
CONTROL INPUT 1                                    GND              R2K CONSOLE
GND                                  CONTROL OUTPUT 3
CONTROL OUTPUT 2                     CONTROL OUTPUT 4
                                                                R241/R242 TERMINATION
                                                           10
CONTROL OUTPUT 1                                   GND
```

### Page 3 (PDF text layer)

```text
A   B
GND                                  RIGHT INPUT + From Switcher
                                                                                      TYPICAL TERMINAL BLOCK
LEFT INPUT - From Switcher           RIGHT INPUT - From Switcher   1
LEFT INPUT + From Switcher                                 GND

NC                                         SAS CONTROL DATA +
NC                                         SAS CONTROL DATA -      2
NC                                                          NC

GND                                         RIGHT INSERT OUT+
LEFT INSERT OUT -                            RIGHT INSERT OUT-     3
                                                                                              + - G
LEFT INSERT OUT +                                          GND

GND                                       RIGHT INSERT INPUT+
LEFT INSERT INPUT -                        RIGHT INSERT INPUT-     4
LEFT INSERT INPUT +                                        GND

GND                                    RIGHT DIRECT OUTPUT+**           ** WHEN ENABLED
LEFT DIRECT OUTPUT -**                 RIGHT DIRECT OUTPUT-**      5    SEND 1 APPEARS ON LEFT DIRECT OUTPUT
LEFT DIRECT OUTPUT + **                                    GND          SEND 2 APPEARS ON RIGHT DIRECT OUTPUT
GND                                            NO CONNECTION
NOT CONNECTED                                  NO CONNECTION       6
NOT CONNECTED                                              GND

GND                                            NO CONNECTION
NO CONNECTION                                  NO CONNECTION       7
NO CONNECTION                                              GND

GND                                            NO CONNECTION
NO CONNECTION                                  NO CONNECTION
                                                                   8
NO CONNECTION                                              GND

GND                                           CONTROL INPUT 3
CONTROL INPUT 2                               CONTROL INPUT 4      9
CONTROL INPUT 1                                            GND              R2K CONSOLE
GND                                         CONTROL OUTPUT 3
CONTROL OUTPUT 2                            CONTROL OUTPUT 4
                                                                        R243/R244 TERMINATION
                                                                   10
CONTROL OUTPUT 1                                           GND
```

### Page 4 (PDF text layer)

```text
R241\R242\R243\R244
                                     STEREO INPUT MODULE
The R241 Stereo Input Module is the basic input channel module for the Cool Grey radio audio console series.
The model R242 offers all the features and facilities of the R241 as well as individual level controls on the two
mono sends . The model R243 mimics the features of the R241 but instead of A/B/MONO input selector is
instead equipped with a SAS CD8 router control head. Similarly the model R244 is identical to the R242 but
is equipped with the SAS CD8 router control head. Except for the four right hand most positions of the Cool
Grey console, the R241, R242, R243 and R244 input modules may be inserted into any module slot in the
console.

The R241/R242 accepts two balanced stereo inputs, A or B. A MONO pushbutton switch will sum the left and
right stereo signal. This feature is particularly useful when only a mono signal is available at the input or either
of the channels of the stereo signal is missing. The R243/R244 modules accept a single stereo input from
the SAS router. The router control/tally connections appear on the terminals where the B right input is
normally located.

Stereo balanced insert points are provided prior to the FADER and CHANNEL ON switch. Convenient insert
bypass jumpers are located on the module circuit board.

The pre-FADER, pre-CHANNEL ON, CUE switch allows the operator to preview an incoming signal on the
cue speaker located in the console meter bridge.

The direct audio FADER controls the overall signal level through the module. A reference indicating mark at
the 12dB in-hand position is provided. In the R242 and R244 modules, the individual level controls adjust the
level of the two mono sends. The CHANNEL ON control routes the signal to the output stage of the module
and the CHANNEL OFF shuts the output of the module down.

The signal may be assigned to any or all of the four stereo program or two mono send mixing buses. All
mixing buses are balanced. Each input module also has a stereo DIRECT output that follows the FADER,
and CHANNEL ON switch.

All select, function and assignment switches are equipped with LED indicators. The LEDs illuminate to
indicate that the switch has been activated.

Each input module has four programmable input and four programmable output controls for external control.
The module may also be configured to activate the MUTE A, B, C, AUTO CUE or TIMER RESET buses. An
RS485 serial I/O port on the input module allows some module functions to be under serial control.
```

### Page 5 (PDF text layer)

```text
A-B SOURCE SELECT (R241/R242)
Source pushbuttons A and B are electronically interlocked and select between stereo inputs A and B
respectively. Left and right trim controls are accessible from the front panel. These trim controls are post
input select.

MONO SELECT (R241/R242)
Pressing the MONO pushbutton will mix the left and right channels (L+R) with a -6dB gain. This mono mix
is then fed equally to the left and right channels prior to the module insert out.

SAS ROUTER CONTROL (R243/R244)
The integrated SAS CD-8 router control communicates with the external router.

PGM, AUD, UTL and AUX PROGRAM ASSIGN
Alternate action pushbuttons assign the signal to the four stereo program mix buses - Program , Audition ,
Utility and Auxiliary . The audio signal assigned is picked up post fader and follows the channel on control.

MONO SENDS 1 and 2
Alternate action pushbuttons assign the signal to two mono send mix buses. The audio may be picked up post
fader or pre fader by setting programming jumpers and follows the channel on control. Assignment to the
mixing buses may be enabled or disabled by the setting the appropriate DIP switch. SEND 1 and 2 may also
be sent to the module direct output by setting the appropriate DIP switch

MONO SEND LEVEL (R242/R244)
The send level controls provide adjustment of the send signals from full level (+4dBu) to off.

CUE ASSIGN
Assignment of the signal to the cue bus is via the alternate action CUE pushbutton. The end of travel switch
on the fader will turn the CUE off. The signal for assignment to the cue bus is picked up pre fader and pre
channel on. The cue audio is heard on the local console speaker. The volume control for this speaker is
located on the R248 utility module. Pressing the cue button also activates the auto cue feature in the console
headset circuit. Auto cue superimposes pre fader audio, from the cued input channel, over the dimmed
monitor audio in the right headset channel. The level of the left monitor audio in the headset remains
unchanged. Cue speaker muting can be selective effected by mute bus A,B or C.

CHANNEL ON
The channel ON pushbutton enables the audio signal to the program assignment pushbuttons, PGM,
AUD,UTL and AUX, the mono send pushbuttons, 1 and 2 and the direct channel output. Pressing the channel
ON button generates a timer reset and mute control. The timer reset bus is connected internally to the timer
electronics and any module may be jumper programmed to reset the timer. The mute control may be jumper
selected to any or all of mute buses A, B or C. The mute control may also be set to follow input selection A
or B. The channel ON button normally operates as momentary action switch to turn the channel on (switch
illuminated).

CHANNEL OFF
The channel OFF push button cancels the channel ON function. If the channel is programmed permanently
on, the OFF control may be used as an event stop control.
```

### Page 6 (PDF text layer)

```text
EXTERNAL CONTROL
For external control, the Cool Grey input modules offer four control inputs and four control outputs. Up to
eight different pre-programmed operating modes are offered. The different modes are selected by setting
a series of DIP switches and include the definition of the operation of the channel ON and OFF switches.

                                DIP SWITCH SETTINGS (REF DES=SW2)

SWITCH FUNCTIONS

                         SW1             Mode Selection
                         SW2             Mode Selection
                         SW3             Mode Selection
                         SW4             Reserved
                         SW5             Reserved
                         SW6             Send1 On
                         SW7             Send2 On
                         SW8             Send 1 and 2 to Direct Out

MODE SELECTION

                         SW1     SW2     SW3
                         OFF     OFF     OFF              Mode0
                         OFF     OFF     ON               Mode1
                         OFF     ON      OFF              Mode2
                         OFF     ON      ON               Mode3
                         ON      OFF     OFF              Mode4
                         ON      OFF     ON               Mode5
                         ON      ON      OFF              Mode6
                         ON      ON      ON               Mode7

SEND CONTROL

                         SW6
                         OFF             SEND1 muted
                         ON              SEND1 enabled


                         SW7
                         OFF             SEND2 muted
                         ON              SEND2 enabled

                         SW8
                         OFF             Direct output post fade enabled
                         ON              SEND1 to direct out left
                                         SEND2 to direct out right


Note: OFF position is down, ON position is up
```

### Page 7 (PDF text layer)

```text
MODE#1 (SOFTWARE M1.02)
MODE 0:     Control in 1- CH ON            Control out 1- CH ON + INA Tally
            Control in 2- CH OFF           Control out 2- CH ON + INB Tally
            Control in 3- A SEL            Control out 3- A Tally
            Control in 4- B SEL            Control out 4- B Tally

MODE 1:          Control in 1- CH ON       Control out 1- CH ON + INA event pulse
                 Control in 2- CHOFF       Control out 2- CH ON + INB event pulse
                 Control in 3- A SEL       Control out 3- A Tally
                 Control in 4- B SEL       Control out 4- B Tally

                 Channel ON button is used as an event pulse generator when pressed. When bringing fader
                 down, the end of travel turns the channel off.

MODE 2:          Control in 1- CH ON       Control out 1- CH ON + INA Tally
                 Control in 2- CH OFF      Control out 2- CH ON + INB Tally
                 Control in 3- A SEL       Control out 3- CH OFF + INA Tally
                 Control in 4- B SEL       Control out 4- CH OFF + INB Tally

MODE 3:          Control in 1- CH ON       Control out 1- CH ON + INA event pulse
                 Control in 2-CH OFF       Control out 2- CH ON + INB event pulse
                 Control in 3- A SEL       Control out 3- CH OFF + INA event pulse
                 Control in 4- B SEL       Control out 4- CH OFF + INB event pulse

MODE 4:          Control in 1- CH ON       Control out 1- CH ON event pulse
                 Control in 2- CH OFF      Control out 2- CH OFF Tally
                 Control in 3- A SEL       Control out 3- A Tally
                 Control in 4- B SEL       Control out 4- B Tally

                 When bringing fader down, the end of travel turns the channel off. Channel ON button is
                 used as an event pulse generator (control out 1) when pressed.

MODE 5:          Control in 1- CH ON       Control out 1- CH ON Tally
                 Control in 2- CH OFF      Control out 2- CH OFF Tally
                 Control in 3- A SEL       Control out 3- A Tally
                 Control in 4- B SEL       Control out 4- B Tally

                 When bringing fader down, the end of travel turns the channel off.

MODE 6:          Control in 1- CH ON   Control out 1- CH ON Tally
                 Control in 2- CH OFF Control out 2- CH OFF Tally
                 Control in 3- CUE ON Control out 3- CUE ON Tally
                 Control in 4- CUE OFF Control out 4- CUE OFF Tally

                 When bringing fader down, the end of travel turns the channel off.

MODE 7:          Control in 1- CH ON       Control out 1- CH ON event pulse
                 Control in 2- CH OFF      Control out 2- CH OFF Tally
                 Control in 3- Cue On      Control out 3- Cue on Tally
                 Control in 4- Cue Off     Control out 4- Cue off Tally

                 When bringing fader down the end of travel turns the channel off. Channel ON button is used
                 as an event pulse generator (control out 1) when pressed.

Note: Control software may be customized to address customer specific requirements.
```

## Contents (JSON)

```json
{
 "file": "Consoles/1990-1999/R2K/1994 - R2K - INPUT MODULES MANUAL.pdf",
 "sha256": "200f309214d8d97a8e6077b3c8dbcfcb3c82a63a7502faa37547d83901954eb4",
 "kind": "console",
 "models": [
  "R2K"
 ],
 "year": 1994,
 "pages": 7
}
```
