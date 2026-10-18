# 1994 - R2K - MODIFIED R201MODEScoughcontrol.docx
Wiki page: [Consoles](../../../PAGES/Consoles.md)


- **Year:** 1994 (inferred: project R2K: M908, which it is about (traced))
- **Console:** R2K
- **Project:** R2K
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Consoles/R2K/MODIFIED R201MODEScoughcontrol (1).docx`
- **SHA-256:** `372ed9a124351f0a3a89392675bbd27430981d5a651cc714bdab66acf81258b7`
- **Size:** 218,133 bytes
- **Pages:** 1

## Full text

### Page 1 (Word document)

```text
CUSTOM SETTINGS FOR THE R221/R201 (18-DEC-06)  

EXTERNAL CONTROL
For external control, the R201 module offers four inputs and four outputs.  Up to eight different pre-programmed operating modes are offered.  These different modes are jumper selectable and include the definition of the operation of the channel ON switch. Control inputs require a momentary closure to ground and outputs are open collectors.

MODES OF OPERATION
MODE#1 (SOFTWARE M1.01)
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
Control in 2- CHOFF
Control out 2- CH ON + INB event pulse
Control in 3- A SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator. When bringing fader down, the end of travel turns the channel off.  

MODE 2:
Control in 1- CH ON
Control out 1- CH ON + INA Tally
Control in 2- CH OFF
Control out 2- CH ON + INB Tally
Control in 3- A SEL
Control out 3- CH OFF + INA Tally
Control in 4- B SEL
 Control out 4- CH OFF + INB Tally

Channel ON acts as an alternate action pushbutton.

MODE 3:
Control in 1- CH ON
Control out 1- CH ON  + INA event pulse
Control in 2-CH OFF
Control out 2- CH ON + INB event pulse
Control in 3- A SEL
Control out 3- CH OFF  + INA event pulse
Control in 4- B SEL
Control out 4- CH OFF + INB event pulse

 

Channel ON acts as an alternate action pushbutton

MODE 4:
Control in 1- CH ON
Control out 1- CH ON event pulse
Control in 2- CHOFF
Control out 2- CH OFF Tally
Control in 3- A SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON\OFF button keeps the channel on all the time and is used as an event pulse generator (control out 1).

MODE 5:
Control in 1- CH ON
Control out 1- CH ON Tally
Control in 2- CHOFF
Control out 2- CH OFF Tally
Control in 3- A SEL
Control out 3- A Tally
Control in 4- B SEL
Control out 4- B Tally

When bringing fader down, the end of travel turns the channel off.  Channel ON acts as an alternate action pushbutton.

MODIFIED 
MODE 6:
Control in 1- CHON/OFF
Control out 1- CH ON Tally + IN A Tally
Control in 2- A SEL

Control out 2- CH ON Tally + IN B Tally
Control in 3- PT COUGH
Control out 3- CUE ON Tally
Control in 4- B SEL

Control out 4- B Tally

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
```

## Contents (JSON)

```json
{
 "file": "Consoles/1990-1999/R2K/1994 - R2K - MODIFIED R201MODEScoughcontrol.docx",
 "sha256": "372ed9a124351f0a3a89392675bbd27430981d5a651cc714bdab66acf81258b7",
 "kind": "console",
 "models": [
  "R2K"
 ],
 "year": 1994,
 "pages": 1
}
```
