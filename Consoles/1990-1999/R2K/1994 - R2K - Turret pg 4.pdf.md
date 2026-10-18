# 1994 - R2K - Turret pg 4.pdf
Wiki page: [Consoles](../../../PAGES/Consoles.md)


- **Year:** 1994 (inferred: project R2K: M908, which it is about (traced))
- **Console:** R2K
- **Project:** R2K
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Consoles/R2K/Turrets (1)/Turret pg 4 (1).pdf`
- **SHA-256:** `b1e8f828d5e147384c2e6182039a8c970b64b683fe75957b0afbce755eadb99b`
- **Size:** 502,605 bytes
- **Pages:** 1
- **PDF created (scan date, not design date):** Mon Mar 13 12:55:26 2006 EST

## Full text

### Page 1 (OCR)

```text
27
Input or 8x2 Selector Module 26 Input or 8x2 Selector Module 27 Program Master Module 28 Control Room Monitor 29
1 1 0 1 0
28
110 1 1
29
1 1 1 0 0
30
1110 1
31
Studio Monitor
30
11110
32
Utility Module
31
11111
To assign the Turret to control the channel on and channel off functions associated with a particular input channel we use the binary coded address shown in bold in the above table_
The eight program select buttons are used to program the Turret The binary coded address for the input channel is set by using the #1 (LSB) to #5 (MSB) pushbuttons of the studio program selector ' The #8 pushbutton is used to assign the studio, OFF = Studio and ON Studio 2_
NOTE: If two turrets are used simultaneously with the same console it is imperative that - they be assigned to different control ports
Pushbutton #1
Pushbutton Pushbutton #2 #3
Pushbutton #4
Pushbutton Pushbutton #5 #8 MSB Studio (16) Select Off = 0 Off Std: On = On = Std. 2
LSB (1) Off = 0 On =
(2) Off = 0 On = 1
(4) Off = 0 On = 1
(8) Off = 0 On =
To put the Turret in the programming mode remove power from the Turret and make sure that the programming switch on the rear panel is in the "out" position i.e. not depressed: Reapply power. Once programming is complete depress the program button on the rear panel to exit the setup mode_
As a safeguard the Turret can only be put into the programming mode by removing power first.
```

## Contents (JSON)

```json
{
 "file": "Consoles/1990-1999/R2K/1994 - R2K - Turret pg 4.pdf",
 "sha256": "b1e8f828d5e147384c2e6182039a8c970b64b683fe75957b0afbce755eadb99b",
 "kind": "console",
 "models": [
  "R2K"
 ],
 "year": 1994,
 "pages": 1
}
```
