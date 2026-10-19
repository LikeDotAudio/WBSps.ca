# 1994 - R2K - R221functional.pdf
Wiki page: [Consoles](../../../PAGES/Consoles.md)


- **Year:** 1994 (inferred: project R2K: M908, which it is about (traced))
- **Console:** R2K
- **Project:** R2K
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Consoles/R2K/R221functional (1).pdf`
- **SHA-256:** `fb5b97c5fe6390fd1c570514bb2906538256fa0c64ad390af1c126df7a74e586`
- **Size:** 102,426 bytes
- **Pages:** 1
- **PDF created (scan date, not design date):** Fri Dec  6 10:24:01 2002 EST

## Dates found in this file

- **1999** (month): `NOV 10, 1999` — …R221 FUNCTIONAL LINE INPUT MODULE R221ISS1.DSN PAGE 1 OF 1 NOV 10, 1999…

## Vectors (traced)

### Page 1

- **Sheet:** drawing, size B (assumed) 432 × 334 mm, 2000 × 1546 px traced (0.216 mm/px)
- **Ink extent:** 2–432 mm across, 2–317 mm up
- **Outlines:** line 223 rings, 2,926 straight (14,862 mm) / 496 curved (657 mm); text 558 rings, 3,665 straight (4,002 mm) / 1,011 curved (1,353 mm)
- **Closed boxes:** 21; named: MODULE CONTROL LOGIC
- **Dots (junctions):** 8
- **Words (OCR):** 106 in 77 lines: P1-L · A-LEFT+ · P2-L · P3-L · A-LEFT- · INSERT BYPASS · P4-L · B-LEFT+ · LEFT+ · LEFT+ · MM1-L · LEFT-
- **Title block:** (319, 18)–(432, 40) mm: WARD-BECK SYSTEMS

Every curve, box, word and wire group: [1994 - R2K - R221functional p1 (traced).json](1994%20-%20R2K%20-%20R221functional%20p1%20%28traced%29.json) (the CAD file: `1994 - R2K - R221functional p1 (traced).dxf`).

## Full text

### Page 1 (PDF text layer)

```text
P1-L


A-LEFT+                                                                                                                                                       P2-L


                                                                                                                                                              P3-L
                                                                   INSERT BYPASS
A-LEFT-
                                   +
                                                                                                                                                              P4-L
                                   -
B-LEFT+                                                           LEFT+     LEFT+                  +                                                                  MM1-L

                                                                  LEFT-     LEFT-                  -

B-LEFT-                                                                                                                                                       MM2-L

           A-B SELECT                                             BALANCED INSERTS

                                                                   +4 dBU NOMINAL
A-RIGHT+
                                       INPUT TRIM                                                                                                                 SUMMING BUS

                                                           MONO
                                                                   INSERT BYPASS
A-RIGHT-                                                                                                                                                      P1-R
                                                                                                       FADER -12dB
                                   +

                                   -                                                                                                                          P2-R
B-RIGHT+                                                          RIGHT+    RIGHT+                 +

                                                                  RIGHT-    RIGHT-                 -                                                          P3-R

B-RIGHT-
                                                                                                                                                              P4-R

                                                                                                                                                                      MM1-R



                                                                                                                                                              MM2-R
                                                                                     EXT OUT 1

                                                                                                                                                              CUE


                                                                                     EXT OUT 2
                        EXT IN1

                        EXT IN2

                        EXT IN3                                                      EXT OUT 3

                        EXT IN4
                                          MODULE CONTROL

                                                LOGIC
                                                                                     EXT OUT 4


                          AD0
             ADDRESS
                          AD1                                                        MUTE A                                                    RIGHT+
               INPUT
                          AD2                                                                                                                  RIGHT-
                                                                                     MUTE B
                                                                                                                                                           BALANCED DIRECT
                          AD3
                                                                                                                                                              OUTPUT
                          AD4                                                        MUTE C                                                    LEFT+\M1+

                                                                                     AUTO CUE                                                  LEFT-\M1-

           SERIAL I\O
                          RS485+
             FROM
             R206
                          RS485-
                                                                                     TIMER RESET




                                                                                                                     WARD-BECK SYSTEMS
                                                                                                                     R2K            R221 FUNCTIONAL
                                                                                                                                    LINE INPUT MODULE
                                                                                                                     R221ISS1.DSN    PAGE 1 OF 1           NOV 10, 1999
```

## Contents (JSON)

```json
{
 "file": "Consoles/1990-1999/R2K/1994 - R2K - R221functional.pdf",
 "sha256": "fb5b97c5fe6390fd1c570514bb2906538256fa0c64ad390af1c126df7a74e586",
 "kind": "console",
 "models": [
  "R2K"
 ],
 "year": 1994,
 "pages": 1,
 "order": [
  {
   "page": 1,
   "dates": [
    {
     "year": 1999,
     "kind": "month",
     "text": "NOV 10, 1999"
    }
   ]
  }
 ]
}
```
