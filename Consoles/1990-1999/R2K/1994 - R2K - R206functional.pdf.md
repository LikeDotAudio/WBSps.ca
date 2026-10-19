# 1994 - R2K - R206functional.pdf
Wiki page: [Consoles](../../../PAGES/Consoles.md)


- **Year:** 1994 (inferred: project R2K: M908, which it is about (traced))
- **Console:** R2K
- **Project:** R2K
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Consoles/R2K/R206R206AR248 (1)/R206functional (1).pdf`
- **SHA-256:** `347942e3bc0069b6e59f9fd8eed63acdc626e80c1c72af465ad830bb5cdb022b`
- **Size:** 35,627 bytes
- **Pages:** 1
- **PDF created (scan date, not design date):** Fri Dec  6 10:15:18 2002 EST

## Dates found in this file

- **1999** (month): `OCT. 18, 1999` — …R2K R206 FUNCTIONAL UTILITY MODULE R206ISS4.DSN PAGE 1 OF 1 OCT. 18, 1999…

## Vectors (traced)

### Page 1

- **Sheet:** drawing, size B (assumed) 432 × 334 mm, 2000 × 1546 px traced (0.216 mm/px)
- **Ink extent:** 12–430 mm across, 2–317 mm up
- **Outlines:** line 96 rings, 1,289 straight (9,044 mm) / 66 curved (81.7 mm); text 638 rings, 4,398 straight (4,657 mm) / 1,218 curved (1,644 mm)
- **Closed boxes:** 3; named: TIMER; MODULE CONTROL LOGIC
- **Dots (junctions):** 1
- **Words (OCR):** 132 in 72 lines: CUE AUDIO BUS · MUTE · LEFT VU+ · EXT CUE · CUE OUT+ · LEFT VU- · CUE OUT- · STEREO VU BAR GRAPH METER · EXT CUE · RIGHT VU+ · RIGHT VU- · EXT CUE
- **Title block:** (318, 18)–(431, 39) mm: WARD-BECK SYSTEMS

Every curve, box, word and wire group: [1994 - R2K - R206functional p1 (traced).json](1994%20-%20R2K%20-%20R206functional%20p1%20%28traced%29.json) (the CAD file: `1994 - R2K - R206functional p1 (traced).dxf`).

## Full text

### Page 1 (PDF text layer)

```text
CUE AUDIO BUS
                                                                         MUTE                                                     LEFT VU+                 +

                                                                                           CUE OUT+                               LEFT VU-                 -
                 EXT CUE 1+           +
                                                                                           CUE OUT-                                                                    STEREO VU BAR GRAPH METER
                 EXT CUE 1-           -                                                                                           RIGHT VU+                +

                                                                                                                                  RIGHT VU-                -
                 EXT CUE 2+           +

                 EXT CUE 2-           -                                                                CUE SPEAKER




HEADSET RIGHT

                                                                                                                                                                 SERIAL
                                                                                                                                                                 OUT TO
                                                                                                                                                                 REMOTE     TMR+
FROM R203                                                                                                                                                        TIMER                                    TIMER
                                                                                                                                                                 DISPLAY    TMR-



                                                                                           PHONEJACK STEREO                                   INTERNAL TIMER RESET

HEADSET LEFT                                                                                                                                  EXTERNAL TIMER RESET

                                                                                                                                              EXT TIMER RUN TALLY




                                                                                                                                                         T\B AUDIO +                   +
                                                                                                                              EXT OUT 1                                                                 T\B AUDIO
                                                              EXT IN1                                                                                    T\B AUDIO -                   -           TO STUDIO MONITOR
                                                              EXT IN2

                                                              EXT IN3                                                         EXT OUT 1

                                                              EXT IN4

                                                              EXT IN5
                                                                                                                              EXT OUT 1
                                                              EXT IN6

                                                              EXT IN7     MODULE CONTROL

                                                              EXT IN8           LOGIC                                         EXT OUT 1

                                          MUTEA

                                          MUTEB
                              LOCAL
                                          MUTEC

                                      AUTO CUE

                                                                RX422+

                                                                RX422-
                                           EXTERNAL SERIAL

                                              CONTROL

                                                                TX422+                                T\B 1 ENABLE      TO R204

                                                                TX422-                                T\B 2 ENABLE   STUDIO MONITOR



                                             INTERNALSERIAL     RS485+
                                                  CONTROL       RS485-




                                                                                                                                                                WARD-BECK SYSTEMS
                                                                                                                                                                R2K                        R206 FUNCTIONAL
                                                                                                                                                                                           UTILITY MODULE
                                                                                                                                                                R206ISS4.DSN          PAGE 1 OF 1            OCT. 18, 1999
```

## Contents (JSON)

```json
{
 "file": "Consoles/1990-1999/R2K/1994 - R2K - R206functional.pdf",
 "sha256": "347942e3bc0069b6e59f9fd8eed63acdc626e80c1c72af465ad830bb5cdb022b",
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
     "text": "OCT. 18, 1999"
    }
   ]
  }
 ]
}
```
