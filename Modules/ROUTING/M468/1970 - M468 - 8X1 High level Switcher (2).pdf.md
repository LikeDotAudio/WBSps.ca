# 1970 - M468 - 8X1 High level Switcher (2).pdf
Wiki page: [M468](../../../PAGES/M468.md)


- **Year:** 1970 (module estimate (labelled))
- **Module:** M468
- **Category:** ROUTING
- **Module year estimate:** 1970 — labelled "DATE OCt 70" in PUBLIC/Manuals + tech DOCUMENTS/Modules/M468 - 8X1 High level Switcher.pdf
- **Used in jobs:** 76045 (1976)
- **Original file:** `WBSps.env/wbsps - website ARCHIVE/WBSPS 2008/PDF NEW/Ward-Beck Systems - M468 - 8X1 High level Switcher - www.WBSps.ca.pdf`
- **SHA-256:** `42cdafd3e37ea08d58de9c2aa4655c42547e71fb06f3fc5fc91be77988698463`
- **Size:** 27,160,910 bytes
- **Pages:** 12
- **PDF created (scan date, not design date):** Mon Aug 17 16:44:19 2009 EDT

## Full text

### Page 1 (PDF text layer)

```text
M468
8 x 1 HIGH LEVEL SWITCHER




             Designed &Manufactured
                      By
             Ward-Beck Systems Limited
             841 Progress Avenue
             Scarborough, Ontario
             (416) 438-6550
                                                 a
                                                .c
                                                ps
                                            BS
                                          //W
                                            :
                                         tp
                                    ht
```

### Page 2 (PDF text layer)

```text
M468     Teehnical Data




Configuration:-    8 inputs to 1 output
                                                                        I
Latching:-         Self or external by conditional strapping            i,


Power Requirement:-       24 v dc unregulated
                          (negative ground)
                           40 rna relay
                           40 rna lamp

Ambient    Temperature:-      octo 50 C

Dimensions:-          1.6"W X 6.625 "H    X 6" D

Weight:-                   10 oz.




                                                                    a
                                                                .c
                                                                ps
                                                               BS
                                                         //W
                                                         :
                                                      tp
                                                     ht
```

### Page 3 (PDF text layer)

```text
M468   CIRCUIT DESCRIPTION


The M468 Switcher module contains an 8 input to 1 output relay
switcher. The switcher may be operated directly by depressing
the momentary pushbuttons on the front panel or they may be
remotely operated from a separate remote panel.

Depressing SWl grounds the lower side of Kl which will
energize,closing its contacts. The base of 01 is switched to two
diode ' drops above ground via CR2 and CR18. Since the emitter is
3.3 volts above ground, 01 will turn off removing the ground
return path for the hold circuit of the remaining relays. When
SWl returns to its normal position (OFF), Ol,which turns on
within several microseconds,provides the ground return path via
the Kl holding contacts and therefore Kl remains energized.

To prevent more than one relay from being energized at a time,
the ground control line is looped through each pushbutton switch.

The self-latching capability may be removed by disconnecting the
ground return jumper between module connector pins U and 16. In
addition, the cancel function is brought out at pin T to permit
expanding the switcher size beyond 8 X 1.

Audio input #1 appearing 'at pins 1 and A is switched onto the
output buss (pins 10 and L) via two sets of KI ts contacts.
Depending upon the nature of the switcher built, isolation
resistors may be required. These are normally not supplied, but
may be installed when necessary.




                                                                 a
                                                              .c
                                                           ps
                                                         BS
                                                     //W
                                                      :
                                                   tp
                                                 ht
```

### Page 4 (PDF text layer)

```text
M 468

REPLACEABLE PARTS LIST


SYMBOL      DESCRIPTION              MFG         PART NUMBER

CRl         Diode                    I.R.        lM4003
CR2         Diode                    I.R.        lN4003
CR3         Diode                    I.R.        IN4003
CR4         Diode                    I.R.        IN4003
CR5         Diode                    I.R.        lN4003

CR6         Diode                    I.R.        IN4003
CR7         Diode                    I.R.        IN4003
CR8         Diode                    I.R.        lN4003
CR9         Diode                    I.R.        IN4003
CRIO        Diode                    I.R.        lN4003

CRll        Diode                    J;.R.       IN4003
CR12        Diode                    I.R.        IN4003
CR13        Diode                    I.R.        lN4003
CR14        Diode                    I.R.        IN4003
CR15        Diode                    I .a,       IN4003

CR16        Diode                    I.R.        IN4003
CR17        Zener Diode 3.3 V        I.R.        IN746A
CR18        Diode                    I.R.        IN4003

DSl        Lamp 28V 40 rna           C.M.        387
DS2        Lamp 28V 40 rna           C.M.        387
DS3        Lamp 28V 40 rna           C.M.        387
DS4        Lamp 28V 40 rna           CoM.        387
DS5        Lamp 28V 40 rna           C.M.        387

DS6         Lamp 28V 40 rna          C.M.        387
DS7         Lamp 28V 40 rna          CoM.        387
DS8         Lamp 28V 40 rna          C.M.        387

Kl          Relay 4C    24V 40 rna   ITT         PZ -4/A2610
K2          Relay 4C   24v 40 rna    ITT
K3
K4
            Relay 4C
            Relay 4C
                       24V 40 rna
                       24V 40 rna
                                     ITT
                                     ITT
                                                                   I
                                                                   I
                                                               a


K5          Relay 4C   24V 40 rna    ITT
                                                          .c
                                                          ps




K6          Relay 4C 24V 40 rna      ITT         PZ-4/A2610        II
                                                       BS




K7          Relay 4C 24V 40 rna      ITT
                                                 //W




                                                                   I
K8          Relay 4C 24V 40 rna      ITT
                                                                   I
                                                                   I,
                                                   :
                                                tp




            NPN Transistor           Motorola    2N4923            I'
Ql
                                                                   I,
                                             ht




                                                                   i
```

### Page 5 (PDF text layer)

```text
M46S Replaceable Parts List                           Page 2



R1          10K All resistors 1/4W          Philips
R2          10K S% unless specified
R3          10K otherwise
R4          10K
RS          10K

R6          10K                             P~ilips
R7          10K
RS          10K
R9          10K
R10         10K

Rll         10K                             Philips
R12         10K
R13         10K
R14         10K
R1S         10K

R16         10K                             Philips
R17         4K7
R1S         lSK

SW1         Momentary   Pushbutton switch   Pendar       SlS0-116-1F4
SW2
SW3
SW4
SWS

SW6         Momentary Pushbutton switch     Pendar       SlS0-116-1F4
SW7
SWS

XSW1        Lens Cap S/S" X S/S" white      Pendar      C14S-0A-WW
XSW2        Lens Cap
XSW3        Lens Cap
XSW4        Lens Cap
XSWS        Lens Cap                                       "
XSW6        Lens CapS/S" X S/S" white       Pendar      C14S-0A-WW
                                                                  a
                                                                .c



XSW7        Lens Cap
                                                               ps




XSWS        Lens Cap
                        "
                                                           BS




            Printed Circuit   Board         WBS         M17S
                                                        //W
                                                         :
                                                      tp
                                                      ht
```

### Page 6 (PDF text layer)

```text
- -(} -- ,

A UO l O    t N P U T~.
                       H
                       --+            r
                                                                            E <,-(--- -+- 1

                                                                                         ' ~R\O
                                                                                                      --< , ,--J..
                                                                                                      ;. LJ



                                      l p
      + O d     I'>"
           roc>o n



                       7 ~ ·- - t~
                                            ~\OK.

                                            r       - - -                                    r        - ---
                                            ~   --:=;:=1                               I -
                                                                                       L,.
                                                                                             ~. , -- ,
                                                                                                        h - - l.
                                                         ").............1                    , --..)l- J

     ..24
                                                                                             II
X~-+--.,---r---+--r---:----
                                                                                             II        1
                                                                                                        I
                                                                                                        I
                                                                                                   .L
                                                                                     CR91 ... .0 !, ")
                                                                                  ,,, :t" U , r; -
                                                                                                       I
                                                                                                  -     I
                                                                                                       ..

                              IN~~~~~           J
                               (::,,'11 7            I
                                    --V         I             -
                                      (,..>-                                                                               l.
                       15 (
                                                                                                                   - -- -!.~<
u -c                                                \.
                                                    o .---1-
                                                              " -,
                                                                                                            -L
                                                                                                                       a


                                                    0 -.1                                                      I
                                                                                                                     .c
                                                                                                                     ps




     -c
                                                                                                            BS




16( ~-
                                                                                                     ://W
                                                                                                  tp
                                                                                             ht
```

### Page 7 (PDF text layer)

```text
I
                                                                        J

               R6              N'2 I




           I        t

           .:
C.1 ,:::       j
                        J( ~                                          ~ K2.
 t" 1\                                      j       1
                                                L__ j
                    1
                                                    I

                                                    I
    ." -




                                       !/
    I
                                                                  a


    1.-
                                                               .c
                                                               ps




                                            1
                                                             BS
                                                         //W
                                                           :
                                                        tp
                                                        ht




         1 '
```

### Page 8 (PDF text layer)

```text
:1-
I
                                                                 Lz
            0                               J     F/                            J -

ZR4             N'i!4
                                 R8
                                                      N!? <0                      N il



                                            1
lR
<
   3
¢ ----
            4'
                               !n-                6 /.: -

                                                                 i R~
                                                                                8 -




                                                            -   r [- - -
                               - --<.                           --   'r




       K2




            P                                     R                             5 -
                   ....   -!
                          ~




                                        -   ,         r 0

                          t
                                                                           a
                                                                           .c
                                                                          ps
                                                                      BS
                                                                   //W
                                                                    :
                                                                 tp
                                                                ht
```

### Page 9 (PDF text layer)

```text
NO
      _Tel
             "'J
             o      1.
             -c .


                                 .L

/-                                    A
                                  01        ~   l-r

                             - ~ <:   ".I        It. C       .... CC _ L

                                      to
                                ) 11


                                                                  101£ .   1   w ",E..N     MO
                                                                               ') YS,e M _
                                                                               I ':>   1~E.~Ull

                                                                               '>Nt ,H  ;rUM
                                                                               S I10RTI !'I •




                                ;7    T     CA          e,
                                                e u'S
     .,

                         c


                                · 20
                                                                                   a
                                                                               .c
                                                                            ps
                                                                           BS
                                                                    ://W
                                                                 tp
                                                              ht
```

### Page 10 (PDF text layer)

```text
A     '(




           I
         ) It


                            (\101£.   1   V-l   E-tol      MOD uLE   I~   u".>E..D IN
                                          S YS, EM "'           NO L..o ,,:> <;
                                                              wH£l<E.
                                          I';, REC u lP-e.D RE.Pl.A<£ R' - RIS
                                          v-/I , H J UMPER';) A NO 11e.MovE.
                                          S I-\ OR'f! r-J '    J LlMP E. ~':> fRO""

                                          l< E.~ ~'t S .




                C A"JC E'
         7T       e LJ S



    C
          y

4- c4V
         · 20
                                                                              a
                                                                            .c
                                                                          ps
                                                                     BS
                                                                 //W
                                                                 :
                                                              tp
                                                              ht
```

### Page 11 (PDF text layer)

```text
- -- -------""""'""1




C   L EE. / ='D   VIR~
     8 U S>S
                                               P   <!l



                   L?;
                  SW2r
                                   I

                                   I
                     t'- , I       I
                                                          B


                    cs
                         /
                    S W 4-     /
                     (Nln) ,
                                       o                                        Ll




               N ( T ES :
             I. LETTERS FOR W IJ=lING REFE ENCE ONLY.
            2. . .. W I~ E ONLY W HEN Q EQUIREO.
                                                                           a


            .3. WI-lE t-J B R ID G IN G RE S I 5TOR ~; 1=<1 T O r 1<;0
                                                                           .c
                                                                     ps




                  A~ E:  N OT REOUIRED. JUM EQ 5 TO B E                .
                                                                   BS




                  ~E MovE O . SEE SCH E M A T IC      B46 8 -C2- 0 0 1.
                                                               //W
                                                                 :
                                                              tp
                                                           ht
```

### Page 12 (PDF text layer)

```text
~V1/ 7 ~ /c.
                                                                               0 "'7
                                                                               ,/      /
                                                                           /
                                                ------ ~ -


                                                                                            o
                                            I                  I
         ....        r       ..,           _, _     .        ,_, _".L .
     ,n         CR ~ ~. K 5                 R     R ' C-R          ,       ' K7
     ~          10
                   -
                      ,CI:<
                        )
                                           ~._~   14, 14 l _IU C R
                                            I                  •       I   13


                                                                                                             - x
                                                                                                              y



                                                                                                   -
                -~           ~E.   2
                         G
           ~ ...                                                                                        5 \N CO    tJI )
          r-         H
Q.                                                                                                     05~

           ... ~ 0                     0                0
                                       0                r-




                                                                                                                           Lm.
                                                                                                                           a
                                                                                                                       .c
                                                                                                                    ps
                                                                                                                 BS




                                                                                                             E
                                                                                                          //W
                                                                                                           :
                                                                                                        tp
                                                                                                       ht




                                                                                            178 - 06    - 001
```

## Contents (JSON)

```json
{
 "file": "Modules/ROUTING/M468/1970 - M468 - 8X1 High level Switcher (2).pdf",
 "sha256": "42cdafd3e37ea08d58de9c2aa4655c42547e71fb06f3fc5fc91be77988698463",
 "kind": "module",
 "models": [
  "M468"
 ],
 "year": 1970,
 "pages": 12,
 "order": [
  {
   "page": 3,
   "sections": [
    {
     "heading": "CIRCUIT DESCRIPTION",
     "kind": "circuit"
    }
   ]
  }
 ]
}
```
