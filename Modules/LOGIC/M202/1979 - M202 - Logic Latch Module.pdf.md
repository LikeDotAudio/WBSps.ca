# 1979 - M202 - Logic Latch Module.pdf
Wiki page: [M202](../../../PAGES/M202.md)


- **Year:** 1979 (module estimate (manual_issue))
- **Module:** M202
- **Category:** LOGIC
- **Module year estimate:** 1979 — manual_issue "MANUAL ISSUE #1 MARCH 1979" in PUBLIC/Manuals + tech DOCUMENTS/Modules/M202/WBS M202 p1.JPG
- **Original file:** `WBSps.env/wbsps - website ARCHIVE/WBSPS 2008/PDF DOCUMENTS/Done/M202 - Logic Latch Module.pdf`
- **SHA-256:** `974531f0bd5bd6d8d379437ad0f8f84ae8f3550a2ccb5f441f46a5cee76fd464`
- **Size:** 2,318,108 bytes
- **Pages:** 11
- **PDF created (scan date, not design date):** Thu Nov  2 15:10:41 2006 EST

## Full text

### Page 1 (OCR)

```text
WARD-BECK SYSTEMS LTD_ 841 PROGRESS AVENUE, SCARBOROUGH, ONTARIO M1h 2X4 TeleX: 065-25399 TELEPHONE: 416/438-6550
WES
Mz0z LOGIc LATCH MODULE
OESICN AND MANLFACTUPE Of POCFESSONAL AUDIO EOUPMENT
```

### Page 2 (OCR, spell-checked: 8 words corrected)

```text
WAAD-BECX SYSTEms LTD
OtJ 2mateyz "338-OAAW
CIRCUIT DESCRIPTION
M202 LoGIc LATCH MODULE
The M202 Logic Latch module accepts three momentary pushbutton inputs and stores or Latches the status of the pushbutton depressed . Only one of the three status outputs wili be latched at any one time . 5 ;= 1 + 0'1? 27'0 / Additionally an alternate action type Latch is provided for fourth pushbutton input. ,eD #Tuqiuc ~78 4360 70( Nat AaV Tc 6 =9 A6t n; 50 501n T0 nj 6 670722 (in St72: A' Inputs a0t e - ) :Heuod 270 27082;G76 `1 529n1 1f 270.321109 F_jjtso 4J63 P70" ? 32- C3'8in: 0 ) = 7J? 67 ' - Cc-' The input circuit configuration is identical for all four pushbutton inputs. With the control inputs floating, the open-circuit voltage at the control pins is approximately 19 volts The inputs are protected against inadvertent high-voltage application and may be sa fely opera- ted at potentials UP to +30 volts An R/c network guards the inputs against the effects of switch bounce . Each input circuit is followed by an inverting Schmitt trigger. Uf" [ 9k2_? nmob Ija 4J Dre 276 312 5'7) en 7Ubn? 052764? 'j" {) In order IO affect change of status, logic "0" is applied to any of the inputs, ranging from to +2 volts, and having minimum duration of 100 milliseconds W1P0J Cc' 'JA BA
Anterlocking Three Pushbutton Control Logic nia 6 1.35 W'gc: 67 , 6| ! > Oya 1700(73 90) Zluan: The function of the three control inputs at pins 2, B and 13 can be compared to that of bank of three interlocking pushbutton switches, where the operation of any one switch causes the other Wo to release . 92u 80 (0 150q8 82s1lov 2r,iOE-svlbzor This operation is achieved in the following way F1 F -a ona bewueiino? CUJ c 0ui5ae- @ 94T u2 is BCD to decimal decoder , used as priority decoder . Of the four available binary inputs, only the first three are being used, namely A (pin 15) , B (pin 14) and c (pin 13) . As these inputs are individually addressed with logic "1" level originating from the outputs of U1 , the decoder wili produce logic "0" decimal output signal at output (pin 2) , output 2 (pin 3) or output (pin 5) f more than one input is addressed simultaneously, no decoder output wiii result. 4Q'Uo 407' 7f KO PL"( 04 enivinb naa The three decimal outputs are combined via an OR gate  consisting of CR9, CRIO and CRII, the output of which triggers one-shot multivibrator configured from [Wo of the four gates con tained in u3 . negative-going pulse of about 20 milliseconds duration is generated at u3_ pin Routed via CR12, this pulse feeds the CLEAR inputs of the R/s type latches U4A, ULB and USA . b9l GnoGto3n1 Traj (cuondi I5'inoica rommoj T0"'Ol? 4 :) 1o @ninone 'd 7olang er{IEE-FO
I-1
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECX SYSTEms LTD
OtJ 2mateyz "338-OAAW
CIRCULT DESCRIPTION
M202 LoGIc LATCH MQDULE
The M202 Logic Latch module accepts three momentary pushbutton inputs and stores or Tatches the status of the pushbutton depressed . Only one of the three status outputs wili be latched at any one time . 5 ;= 1 + 0'1? 27'0 / Additionally an alternate action type Iatch is provided for fourth pushbutton input. ,eD #Tuqiuc ~78 4360 70( Nat AaV Tc 6 =9 A6t n; 50 501n T0 nj 6 670722 (in St72: A' Inputs a0t e - ) :Heuod 270 27082;G76 `1 529n1 1f 270.321109 F_jjtso 4J63 P70" ? 32- C3'8in: 0 ) = 7J? 67 ' - Cc-' The input circuit configuration is identical for all four pushbutton inputs. With the control inputs floating, the open-circuit voltage at the control pins is approximately 19 volts The inputs are protected against inadvertent high-voltage application and may be sa fely opera- ted at potentials UP to +30 volts An R/c network guards the inputs against the effects of switch bounce . Each input circuit is followed by an inverting Schmitt trigger. Uf" [ 9k2_? nmob Ija 4J Dre 276 312 5'7) en 7Ubn? 052764? 'j" {) In order IO affect change of status, logic "0" is applied t0 any of the inputs, ranging from to +2 volts, and having minimum duration of 100 milliseconds W1P0J Cc' 'JA BA
Anterlocking Three Pushbutton Control Legic nia 6 1.35 W'gc: 67 , 6| ! > Oya 1700(73 90) Zluan: The function of the three control inputs at pins 2, B and 13 can be compared t0 that of bank of three interlocking pushbutton switches, where the operation of any one switch causes the other Wo to release . 92u 80 (0 150q8 82s1lov 2r,iOE-svlbzor This operation is achieved in the following way F1 F -a ona bewueiino? CUJ c 0ui5ae- @ 94T u2 is BCD t0 decimal decoder , used as priority decoder . Of the four available binary inputs, only the first three are being used, namely A (pin 15) , B (pin 14) and c (pin 13) . As these inputs are individually addressed with logic "1" level originating from the outputs of U1 , the decoder wili produce logic "0" decimal output signal at output (pin 2) , output 2 (pin 3) or output (pin 5) f more than one input is addressed simultaneously, no decoder output wiii result. 4Q'Uo 407' 7f KO PL"( 04 enivinb naa The three decimal outputs are combined via an OR gate  consisting of CR9, CRIO and CRII, the output of which triggers one-shot multivibrator configured from [Wo of the four gates con tained in u3 . negative-going pulse of about 20 milliseconds duration is generated at u3_ pin Routed via CR12, this pulse feeds the CLEAR inputs of the R/s type latches U4A, ULB and USA . b9l GnoGto3n1 Traj (cuondi I5'inoica rommoj T0"'Ol? 4 :) 1o @ninone 'd 7olang er{IEE-FO
I-1
```

</details>

### Page 3 (OCR, spell-checked: 7 words corrected)

```text
WAAD-BECX SYSTems LTD;
OTJ evateye >iOze-QAW
CIRCUIT DESCRIPTION
M202 Logic LATCH MODULE
Aside from clearing the three Latches, the negative-going OUtPuts generated at pin 2, 3 or of u2 wili preset the corresponding Latch, resulting in logic "1" at the "0" output of the particular Latch (pins 15/16 or 11/12) 17  '( - J0; 630iv0n0 7t31si GQyi CIf > '.35 37 €0751 7D v'e7o ) 'ph^ When at logic "" each of the "0" outputs drives [Wo separate transistors into sa duration, i.e 01 and 02 in the case of ULA The collectors of these transistors are brought out [0 the module connectors via current limiting resistors Each of these OUtPut termi- nals is capable of sinking maximum current of 40 MA from 24 volt source and may be used for control or tally purposes 2). 4"| "u=s" U" 6= JJen: 0V 42| Bmn OFC7" L = ^ "(Fnos ' ~1 ] Initial Reset F0 4' ja #a P;6 noi'83ilacb #2R'in -7E'7 {F9jevbsn: 'c7 206 ~J 07B44" 4"W'_0 3.9 na 2 4< V Oc- 2" 4 QU 2 _ 'n90C :1 C $ When power is initially applied, the combination of C7 , R17 , CRI3 and CRI4 wili pul / down the CLEAR inputs of ULA , U4B and USA until C7 is fully charged, thus ensuring that the three Latches are in the "OFF" state and 01 through 06 are non-conducting. Ve 0I 7807 } r | ~J*v = A bne L"'^ ereaBn 2) ur, 77' T4 Alternate Action Logic 1onojcbi0 O0t T0 0o "`.
The input circuit at pin of the module connector is identical to the inputs described above. It is followed by [Wo series-connected invert- ing Schmitt triggers _ 2, !iQ 2iJoni P_"4 | ~h ? AF " A 7o 'Jat 47,47 1" no:aieL9 Bni4-o1791f: 9474' Kic Anba 04 3n" 08 +onrot? When Pin P is addressed with logic "0" or ground input, negative-going voltage wili appear at the clock input (pin 6 ) of UsB E" '0i :` RJL Oo Tfcc 4~ T The B-section of u5 is configured a5 J-K flip-flop and wiii change state every time negative-going input transition takes place . Both the "0" as weli as the "0"output are followed by transistor switch, identical to the ones described earlier. r'C ! '3 - 0i 0 Mo7 C7i' snlei-0 3 20| beazgabc L Yuocl 'd : separate reset circuit, consisting of C6, R12 and CRIS, clears USB when power is initially applied . In the cleared Or reset  state, 08 is conducting and 07 is switched off. 292:9* @ _ L O^ 9 O
When driving 40 MA Load from any of the control outputs, the voltage at the module output terminals wili be less than volt. Fd 7328/-1 OjT 0 Iq"O 9J Do u Oia3 Q9J Steer ing Network ~R0 "uo? 4F" 'o 0wa {o1 tojue"iric , ~%"/ : " NC ' : 4JU0 Zcno-JZ'^'t cf #Uc_L To 92/JQ 2"ce-"vi1dpSn seperate and independent steering network, consisting of CR17 through CR2I is incorporated into the module. It may be used for OR-gating and/or branching of the control common potential
1-2
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECX SYSTems LTD;
OTJ evateye >iOze-QAW
CIRCUIT DESCRIPTION
M202 Logic LATCH MODULE
Aside from clearing the three Iatches, the negative-going OUtPuts generated at pin 2, 3 or of u2 wili preset the corresponding Iatch, resulting in logic "1" at the "0" output of the particular Iatch (pins 15/16 or 11/12) 17  '( - J0; 630iv0n0 7t31si GQyi CIf > '.35 37 €0751 7D v'e7o ) 'ph^ When at logic "" each of the "0" outputs drives [Wo separate transistors into sa turation, i.e 01 and 02 in the case of ULA The collectors of these transistors are brought out [0 the module connectors via current limiting resistors Each of these OUtPut termi- nals is capable of sinking maximum current of 40 MA from 24 volt source and may be used for control or tally purposes 2). 4"| "u=s" U" 6= JJen: 0V 42| Bmn OFC7" L = ^ "(Fnos ' ~1 ] Initial Reset F0 4' ja #a P;6 noi'83ilacb #2R'in -7E'7 {F9jevbsn: 'c7 206 ~J 07B44" 4"W'_0 3.9 na 2 4< V Oc- 2" 4 QU 2 _ 'n90C :1 C $ When power is initially applied, the combination of C7 , R17 , CRI3 and CRI4 wili pul / down the CLEAR inputs of ULA , U4B and USA until C7 is fully charged, thus ensuring that the three Iatches are in the "OFF" state and 01 through 06 are non-conducting. Ve 0I 7807 } r | ~J*v = A bne L"'^ ereaBn 2) ur, 77' T4 Alternate Action Logic 1onojcbi0 O0t T0 0o "`.
The input circuit at pin of the module connector is identical t0 the inputs described above. It is followed by [Wo series-connected invert- ing Schmitt triggers _ 2, !iQ 2iJoni P_"4 | ~h ? AF " A 7o 'Jat 47,47 1" no:aieL9 Bni4-o1791f: 9474' Kic Anba 04 3n" 08 +onrot? When Pin P is addressed with logic "0" or ground input, negative-going voltage wili appear at the clock input (pin 6 ) of UsB E" '0i :` RJL Oo Tfcc 4~ T The B-section of u5 is configured a5 J-K flip-flop and wiii change state every time negative-going input transition takes place . Both the "0" as weli as the "0"output are followed by transistor switch, identical to the ones described earlier. r'C ! '3 - 0i 0 Mo7 C7i' snlei-0 3 20| beazgabc L Yuocl 'd : separate reset circuit, consisting of C6, R12 and CRIS, clears USB when power is initially applied . In the cleared Or reset  state, 08 is conducting and 07 is switched off. 292:9* @ _ L O^ 9 O
When driving 40 MA Ioad from any of the control outputs, the voltage at the module output terminals wili be less than volt. Fd 7328/-1 OjT 0 Iq"O 9J Do u Oia3 Q9J Steer ing Network ~R0 "uo? 4F" 'o 0wa {o1 tojue"iric , ~%"/ : " NC ' : 4JU0 Zcno-JZ'^'t cf #Uc_L To 92/JQ 2"ce-"vi1dpSn seperate and independent steering network, consisting of CR17 through CR2I is incorporated into the module. It may be used for OR-gating and/or branching of the control common potential
1-2
```

</details>

### Page 4 (OCR, spell-checked: 3 words corrected)

```text
WAAD-BECK SYSTEms LTD_
INTEGRATED CIRCUII_DAIA
24042
BCD IO DECIMAL DECODER
The 74c42 one-of-ten decoder is monolithic CMOS circuit This decoder Produces logic '0 at the output ;ofreseonding to four bit binary input from zero to nine, and Logic 1 at the other outputs For binary inputs from ten to fifteen all outputs are logic '1'
OUTPUtS
Vcc 16
15
14
13
12
11
10
TOP VIEW
GND
OUTPUTS
Inputs
outputs 0 1 2 3 4 5 6 7 8 9
TRUth TABLE
D C B A
2 1 1 i & 1
1 1
{ 0 8 8 i Lii ;
H 1
74042
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECK SYSTEms LTD_
INTEGRATED CIRCUII_DAIA
24042
BCD IO DECIMAL DECODER
The 74c42 one-of-ten decoder is monolithic CMOS circuit This decoder Produces logic '0 at the output ;ofreseonding to four bit binary input from zero to nine, and Togic 1 at the other outputs For binary inputs from ten to fifteen a11 outputs are logic '1'
OUTPUtS
Vcc 16
15
14
13
12
11
10
TOP VIEW
GND
OUTPUTS
Inputs
outputs 0 1 2 3 4 5 6 7 8 9
TRUth TABLE
D C B A
2 1 1 i & 1
1 1
{ 0 8 8 i L i 1 ;
H 1
74042
```

</details>

### Page 5 (OCR, spell-checked: 6 words corrected)

```text
WAAD-BECX Systems LTD_
INTEGRATED CIRCUII_DAIA
14C16
DUAL J-K FLIP-FLOP WILH CLEAR AND_PRESET
The 74c76 J-K flip-fTop is monolithic CMOs circuit Each flip- flop has independent J , K clock, clear and preset inputs a$ well a $ Q and W outputs The flip-flops are edge sensitive to the clock input and change s tate on the negative going transition of the clock pulses Clear or preset i5 independent of the clock and is accomplished by Tow Teve] on the respective input.
16
CLOCK A
KA
PRESET A
CLEAR
Q4
CLOCK
CLEAR A
64
PRESET
JA
GND
Vcc
Kb
PRESET
CLOCK
Q8
CLOCK
10
PRESET B
CLEAR
Q8
CLEAR B
Je
TOP VIEW logic "0" on clear sets Q to Logic "0" A logic "0" on preset sets Q to logic
Note I: Note 2:
tn tn+1 Truth TABLE Qn 1 0 1 Qn tn bit time before clock pulse tn+l bit time a fter clock pulse
Preset Clear Qn lQn 0 0 0 1 1 0 8 Ii Lan
#No change in output from previous state
74C76
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECX Systems LTD_
INTEGRATED CIRCUII_DAIA
14C16
DUAL J-K FLIP-FLOP WIIH CLEAR AND_PRESET
The 74c76 J-K flip-fTop is monolithic CMOs circuit Each flip- flop has independent J , K clock, clear and preset inputs a$ we11 a $ Q and W outputs The flip-flops are edge sensitive to the clock input and change s tate on the negative going transition 0 f the clock pulses Clear or preset i5 independent 0 f the clock and is accomplished by Tow Teve] on the respective input.
16
CLOCK A
KA
PRESET A
CLEAR
Q4
CLOCK
CLEAR A
64
PRESET
JA
GND
Vcc
Kb
PRESET
CLOCK
Q8
CLOCK
10
PRESET B
CLEAR
Q8
CLEAR B
Je
TOP VIEW logic "0" on clear sets Q to Togic "0" A logic "0" on preset sets Q t0 logic
Note I: Note 2:
tn tn+1 Truth TABLE Qn 1 0 1 Qn tn bit time before clock pulse tn+l bit time a fter clock pulse
Preset Clear Qn lQn 0 0 0 1 1 0 8 Ii Lan
#No change in output from previous state
74C76
```

</details>

### Page 6 (OCR, spell-checked: 2 words corrected)

```text
WARD-BECX SYSTEMS LTD_
OTJ emetey 4Ja8-OAAW
PARIS LIST
M202 LOGIC LAICH_MODULE
PARI
DESCRIPTION
MFG
MEG PART NUMBER
C1 C2 C3 C4 c5
Capacitor 0 . 1 uF/35
Kemet
T3904104M035a5 18 5 cq92-MC-222m 3
2200 PF
Aselco
C6 C7 c8 c9 C10
22 uF/25
Kemet
T3900226m025AS Tc T390B105M0 354 T3900475m035as
X.F485= V 7 uF/35 V
281 ( fi9
tA
70j?/ 2#9
K8 31 69 ;9 2 ,
CRI CR2 CR3 CR4 CRS
Diode
Fa irchild
1n4148
54
8 M IS 8 4 0 A 0 [9
CR6 CR7 CR8 CR9 CR10
0
i [ $ S6 c Ix #69 2 ] 9
CR11 CR12 CR13 CR14 CR1S
0 ! 9 5{3 84 9 2 !A 05S
CR16 CR17 CR18 CR19 CR2O
Motorola XS XS
1n4003
4S SaS X $ SY: SXS
;'9 -3r {Sf 4 5 4 2s8
CR21
3-1
```

<details><summary>As read by the OCR</summary>

```text
WARD-BECX SYSTEMS LTD_
OTJ emetey 4Ja8-OAAW
PARIS LIST
M202 LOGIC LAICH_MODULE
PARI
DESCRIPIION
MFG
MEG PART MUMBER
C1 C2 C3 C4 c5
Capacitor 0 . 1 uF/35
Kemet
T3904104M035a5 18 5 cq92-MC-222m 3
2200 PF
Aselco
C6 C7 c8 c9 C10
22 uF/25
Kemet
T3900226m025AS Tc T390B105M0 354 T3900475m035as
X.F485= V 7 uF/35 V
281 ( fi9
tA
70j?/ 2#9
K8 31 69 ;9 2 ,
CRI CR2 CR3 CR4 CRS
Diode
Fa irchild
1n4148
54
8 M IS 8 4 0 A 0 [9
CR6 CR7 CR8 CR9 CR10
0
i [ $ S6 c Ix #69 2 ] 9
CR11 CR12 CR13 CR14 CR1S
0 ! 9 5{3 84 9 2 !A 05S
CR16 CR17 CR18 CR19 CR2O
Motorola XS XS
1n4003
4S SaS X $ SY: SXS
;'9 -3r {Sf 4 5 4 2s8
CR21
3-1
```

</details>

### Page 7 (OCR, spell-checked: 2 words corrected)

```text
WAAD-BECX SYsTems LTD
OTJ emateyz XW3B-OAAW
PARIS LIST
M202 LOGIC LAICH_MQDULE
PART
DESCR[PTION    Transistor 8 2 3 Q5 HS -S-Jm t0j 06 ' Q7 Q8 CcE ? {^-^ o"- aCjre "
37K
MFG
MFG_PART NUMBER
JsmisX
Nationa 1 
2n3569
3 0 3 3 ~[ i
Cj'9? %
J0 Ucss
19393
L:72 67
26 `u 25 ,70 5,$
RI R2 R3 R4 RS
Resistor #w 5% 47k 47k 8w[ 4  47k 47k 470k
Philips
soo ; Q
I93 30 : 293 17 7 (7)
R6 R7 R8 R9 R10
470k 470k 470k 47k 10k
0 ^ ) T7, 34- € v " ";
R1l R12 R13 R14 R15
47k 47k 47k 47k 47k
[[ ; , 47 Ei 7 ` P153 2[) )
R16 R17 R18 R19 R20
47k 47k 2k2 2k2 2k2
of 4J TiR ` 6[9j [ 2 - 6S/;
R2 1 R22 R23 R24 R25
2k2 2k2 2k2 2k2 2k2
>'
3-2
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECX SYsTems LTD
OTJ emateyz XW3B-OAAW
PARIS LIST
M202 LOGIC LAICH_MQDULE
PART
DESCR[PTION    Transistor 8 2 3 Q5 HS -S-Jm t0j 06 ' Q7 Q8 CcE ? {^-^ o"- aCjre "
37K
MFG
MFG_PART NUMBER
JsmisX
Nationa 1 
2n3569
3 0 3 3 ~[ i
Cj'9? %
J0 Ucss
19393
L:72 67
26 `u 25 ,70 5,$
RI R2 R3 R4 RS
Resistor #w 5% 47k 47k 8w[ 4  47k 47k 470k
Philips
s00 ; Q
I93 30 : 293 17 7 (7)
R6 R7 R8 R9 R10
470k 470k 470k 47k 10k
0 ^ ) T7, 34- € v " ";
R1l R12 R13 R14 R15
47k 47k 47k 47k 47k
[[ ; , 47 Ei 7 ` P153 2[) )
R16 R17 R18 R19 R20
47k 47k 2k2 2k2 2k2
0 f 4J TiR ` 6[9j [ 2 - 6S/;
R2 1 R22 R23 R24 R25
2k2 2k2 2k2 2k2 2k2
>'
3-2
```

</details>

### Page 8 (OCR, spell-checked: 1 words corrected)

```text
WAAD-BECK SYSTEMS LTD
PARIS LISI
M202 LOGIC LAICH_MQDULE
PART
DESCRIPTION
MFG
MFG PART NUMBER
R26 R27 R28 R29 R30
Resistor Sw 5% 4k7 4k7 4k7 4k7 4k7
Philips
R31 R32 R33 R34 R35
4k7 4K7 4k7 Resistor Iw 5% 100 4.7
R36 R37 R38 R39 R40
100 4.7 100 4 4
R41
4.7
Integrated circuit
Nationa]
Mm74c14n MM74C42n MMzacqon
4 U6
Voltage Regulator
Lm340T-12
WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance
3-3
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECK SYSTEMS LTD
PARIS LISI
M202 LOGIC LAICH_MQDULE
PART
DESCRIPIION
MFG
MFG PART NUMBER
R26 R27 R28 R29 R30
Resistor Sw 5% 4k7 4k7 4k7 4k7 4k7
Philips
R31 R32 R33 R34 R35
4k7 4K7 4k7 Resistor Iw 5% 100 4.7
R36 R37 R38 R39 R40
100 4.7 100 4 4
R41
4.7
Integrated circuit
Nationa]
Mm74c14n MM74C42n MMzacqon
4 U6
Voltage Regulator
Lm340T-12
WBS recommends the use of replacement parts made by the specified manufacturers for continued optimum equipment performance
3-3
```

</details>

### Page 9 (OCR, spell-checked: 3 words corrected)

```text
P34
NOTES ALL resistors ARe Xw 5 % ALL CapAciTORS IN Af UNLESS specified Otherwise 2 LAST COMPONENT DESigNaTiONs Are cio Cr 2i 08,RA1,U6 2 UsE PcB 9-102
7c A1 TALLY
rib
ioo 'hw Qi 2N3569
2kz Rz6
+i2v
74-76
Ri 47k - Cri
Ri3 47k
Rss
74614
3 A2 CONTROL
crs in4l4B Rs Atok
47 #w Q2 Znss64
Inal8
Ri9 zkz 233
Ui ci 4/35
Rii 476
R36 MN Ioo Ylw 43 2M35k9
7f Bi TALLY
Rzo
ContROL OutputS 4MA MaK_ current E4KH OuTput
Zkz Rz3 4k7
74C42
R37
4= cr2
B2 CONTROL
Cr6
rze
0
CONTROL INpUts (MOMENTARY
23569
1m4148
U2
2kz Rzg 4k7
R6 470k_
cz ./35
Rz8 W ioo mw 95 2n9569
7i0 ci TALLY
rzz
2*2 23
+izv Qs - 74676
R3s
47K  Crs
7L Cz CONTrOL
Cr7 iInanB 48=
rv
rz}
47 'hv 06 2N359
2k2
1 cro CRLL 32A
S%s
u3
74c0o
reset
ONE Shot
GK Ri7 In4KBZ 47k ciz Cri3 InAMB In46B C7 Iiurs
Us
Us
U3
22000 Rio IOk
Rao
712 AIA CONTROL Output +7 'Cw 07 I2n38k9
Ak CRA Cr8 In4MB In4K8 RB 47ok
AIA Control input (MOMenTARY)
R3z
.1/35
A%
Kan AA CONTROL OuTput ~7wh Q8 2n3569
Rz5
Zkz
C6 RI
Cri7 12388 IHoS C3is Inos cto
L4stot-iz
Cri6
+Uv
U6
S3m
WBS WARD-Lrck #atuMd
Inaoos
CONTROL Common
Crr Brw IMd 06 [KoFZL]
Mz02
lOgic LATCH_Modull SchemATIC
u
202-02-001
```

<details><summary>As read by the OCR</summary>

```text
P34
NOTES ALL resistors ARe Xw 5 % ALL CapAciTORS IN Af UNLESS specified Otherwise 2 LAST COMPONENT DESigNaTiONs Are cio Cr 2i 08,RA1,U6 2 UsE PcB 9-102
7c A1 TALLY
rib
ioo 'hw Qi 2N3569
2kz Rz6
+i2v
74-76
Ri 47k - Cri
Ri3 47k
Rss
74614
3 A2 CDNTROL
crs in4l4B Rs Atok
47 #w Q2 Znss64
Inal8
Ri9 zkz 233
Ui ci 4/35
Rii 476
R36 MN Ioo Ylw 43 2M35k9
7f Bi TALLY
Rzo
ContROL OutputS 4MA MaK_ current E4KH OuTput
Zkz Rz3 4k7
74C42
R37
4= cr2
B2 CONTROL
Cr6
rze
0
CONTROL INpUts (MOMENTARY
23569
1m4148
U2
2kz Rzg 4k7
R6 470k_
cz ./35
Rz8 W ioo mw 95 2n9569
7i0 ci TALLY
rzz
2*2 23
+izv Qs - 74676
R3s
47K  Crs
7L Cz CONTrOL
Cr7 iInanB 48=
rv
rz}
47 'hv 06 2N359
2k2
1 cro CRlI 32A
S%s
u3
74c0o
reset
ONE Shot
GK Ri7 In4KBZ 47k ciz Cri3 InAMB In46B C7 Iiurs
Us
Us
U3
22000 Rio IOk
Rao
712 AIA CONTROL Qutput +7 'Cw 07 I2n38k9
Ak CRA Cr8 In4MB In4K8 RB 47ok
AIA Control input (MOMenTARY)
R3z
.1/35
A%
Kan AA CONTROL OuTput ~7wh Q8 2n3569
Rz5
Zkz
C6 RI
Cri7 12388 IHoS C3is Inos cto
L4stot-iz
Cri6
+Uv
U6
S3m
WBS WARD-Lrck #atuMd
Inaoos
CONTROL Common
Crr Brw IMd 06 [KoFZL]
Mz02
lOgic LATCH_Modull SchemATIC
u
202-02-001
```

</details>

### Page 10 (OCR)

```text
7
E g 71 V 82 8 PH 1 ! 2 2 X 4 Baeli
Nc
A 1
+24V
CT Input B
B 2
CTL InpUt A
OUTPUt A1
C 3
0UTPUt A2
D| 4
*
NC
E|5
NC
OUtput B1
F| 6
OUtPUt B2
HI 7
*
NC
J 8
NC
Nc
Ki 9
Nc
OUTPut C2
L/1o
OUtPut C1
M1l
A/ A CTL OUTPUt
N /12
A/A CTL OUtPUt
A/A CTL Input
P /13
CTL Input C
NC
R/14
CT Com
NC
S/15
NC
6
1
8 g
E E
LEGEND: NC : Not COnNECTED * STEERInG NETWORK, REFER To SCHEMATIC
```

### Page 11 (OCR, spell-checked: 2 words corrected)

```text
WBS 9-102
{ 1 # 46  I0 { 1 10 U2 8 3 U4 JW 7c42 74676 Caco (92, (o4) 0 2 1 Ui 1#0 1 49181 334 74C14 8 14 I} MF C3L, G95 88 #  1 4 8 Wl 74c00 1 74676 18 (Z96 295 ' 0 1 1 1 # # 2 1 4 Doop VX I zq2, c9z ,' 8 IS
Issuidate
Reviskom
WBS
WARD-BEck Oystrmd
Drm Wrw 1/1li M202 Eo. Orw logic LATCH mooule cKo Pae COMPONENT LAYOUT App s De 3 202-06-001
```

<details><summary>As read by the OCR</summary>

```text
WBS 9-102
{ 1 # 46  I0 { 1 10 U2 8 3 U4 JW 7c42 74676 Caco (92, (o4) 0 2 1 Ui 1#0 1 49181 334 74C14 8 14 I} MF C3L, G95 88 #  1 4 8 Wl 74c00 1 74676 18 (Z96 295 ' 0 1 1 1 # # 2 1 4 Doop VX I zq2, c9z ,' 8 I S
Issuidate
Reviskom
WBS
WARD-BEck Oystrmd
Drm Wrw 1/1li M202 Eo. Orw lotic LATCH mooule cKo Pae COMPONENT LAYOUT App s De 3 202-06-001
```

</details>

## Contents (JSON)

```json
{
 "file": "Modules/LOGIC/M202/1979 - M202 - Logic Latch Module.pdf",
 "sha256": "974531f0bd5bd6d8d379437ad0f8f84ae8f3550a2ccb5f441f46a5cee76fd464",
 "kind": "module",
 "models": [
  "M202"
 ],
 "year": 1979,
 "pages": 11,
 "order": [
  {
   "page": 2,
   "sections": [
    {
     "heading": "DESCRIPTION",
     "kind": "general"
    }
   ],
   "connections": [
    {
     "kind": "control",
     "signal": "M202 LOGIC LATCH MQDULE"
    }
   ]
  },
  {
   "page": 3,
   "sections": [
    {
     "heading": "CIRCUIT DESCRIPTION",
     "kind": "circuit"
    }
   ]
  },
  {
   "page": 5,
   "connections": [
    {
     "kind": "ground",
     "signal": "GND"
    }
   ]
  }
 ]
}
```
