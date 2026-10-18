# 1979 - M202 - Logic Latch Module (2).pdf
Wiki page: [M202](../../../PAGES/M202.md)


- **Year:** 1979 (module estimate (manual_issue))
- **Module:** M202
- **Category:** LOGIC
- **Module year estimate:** 1979 — manual_issue "MANUAL ISSUE #1 MARCH 1979" in PUBLIC/Manuals + tech DOCUMENTS/Modules/M202/WBS M202 p1.JPG
- **Original file:** `WBSps.env/wbsps - website ARCHIVE/WBSPS 2008/PDF NEW/Ward-Beck Systems - M202 - Logic Latch Module - www.WBSps.ca.pdf`
- **SHA-256:** `072c0cc4750f5aa951fba9e1b7ef477441bf4426543f6532a6fda5c1df77316c`
- **Size:** 2,889,036 bytes
- **Pages:** 11
- **PDF created (scan date, not design date):** Thu Nov  2 15:10:41 2006 EST

## Full text

### Page 1 (PDF text layer)

```text
WARD-BEC K S YS TE M S LTD .
('NElS]   _      •   _
          .....,., oee·~
                         -........ . . .   -   · ....... ~ ....... a)<..
                                           ~ ''''8 '-_            =-0




                     M202
              lOGIC LATCH MODULE




                                                                           a
                                                                        .c
                                                                     ps
                                                                 BS
                                                            ://W
                                                         tp
                                                       ht
```

### Page 2 (PDF text layer)

```text
WAFlo - e e:CK SYSTEMS LTC .




                                      C IRCUIT DESCRIPT ION

                                  M202 LOG I C L A T CH MODULE



  The    M202 L og i c L a tc h  mod .... re accep ts th ree momentary p u s h b u 1ton
  input s and sto res o r l a tc h e s t h e s t a t .... s of t he p .... a h b u tton d epressed .
  Only one of the t hrae s t a t .... s outp .... t s w i l l be la tched a t any one t i me .

  Add i t iona l l y , a n a lte r na te   ac t i o n    t yp a   l a tch   I s p rov ided f or a    f ourth
  pushbu tt on I n p u t .

  I n pu t s

  T h e I n p u t etrevn configurat ion Is I den tical for a ll f our p u s hb ....1ton
  I n p .... t a , Wi t h the cont ro l i n p u ts f l oat i ng , t h e ope n -e ir<;u ;t vol t a ge at
  the c on t rol p i n s I s app ro", lmate l y +9 vo lts . The i npu ts are p r o tected
  a g ai ns t I na dv e r ten t h igh- v o ltage a p pl ica t io n and ma y b e sa f e l y opera-
  ted a t pote ntial s up to +30 vol t s. A n R/C n e tw ork g uard s th e in p u ts
  agai ns t t h e eHect s of s w itch bounce . Each I n p u t c l r<;u it is f o l l o wed
  by a n Inv er ti n g Schm ill tr igger.

  I n ord er to affect a change o f s t a t us ,                  a l ogic "0" I s app lied to a ny
  of t he i n p u t s, r a ngi ng f rom 0 to +2                   v o l ts , a n d ha vi n g a m in i m .... m
  d u r at i o n of 100 mil li seconds .

  Interlock in g T h r ee P u shbutton Con t ..o l L ogi c

  T h e func t i o n o f the t h r .... con tro l input s at p in s 2, B and 13 can be
  compared to that of a ban k of t h r ee I n te r l oc ki n g p u shb .... tto n s w i tc h es,
  wh e..e l h e ope r at i on o f a ny one s w i tc h cau ses the other two to re l e a se .

  Th i s ope r- a tl on I s a c h i e v ed in the fo ll o w i ng w a y .

  U2 i s a BCD to d ec i ma l d ecoder, used as a p r i o r i t y decod er. Of the
  fo ur available b inary inputs, only t h e f i r s t three a re being u sed,
  namely A ( pi n t 5), a ( pi n 14) and C ( p in 13 ). A s t h e s e I n p u t s e re
  I n divi d u al l y a d d r e ssed w it h a log ic "1 " leve l 0";9 ln ating from t h e
  outputs of UI ,          the decoder- w il l p ..oduce a log ic "0 " dec ima l ou tpu t
  s i gnal at outp ut I ( pin 2 } , output 2 ( pi n 3 ) or outp u t ' (pin S). If
  more t h a n one I n put I s a d d res sed simult aneou sly, no d ecode .. outp ut
  w il l res ult.
                                                                                                         a




  The t h r-ee dec im al ou tpu ts a"e combined via an OR gate con s i st i n g o f
                                                                                                       .c
                                                                                                     ps




  CR9,       CR IO    and   CR1 1,  the output   of wh ich      tr lgge.. s a  one- shot
  mul t i v lb r-ato.. configured f rom t wo of the f o u .. g ate s contai ned I n U J .
                                                                                                 BS




  A. nega t ive-going pul se o f about 20 m ill i seconds d u r at i o n I s generated
                                                                                              W




  at UJ , p in J. Rou ted v i a CRI 2, t hi s p ulse f eed s the CLEAR I n p u ts o f
                                                                                           ://




  t he R/ S t ype latches U4A , U4 S and U SA. .
                                                                                         tp
                                                                                      ht




                                                        1-1
```

### Page 3 (PDF text layer)

```text
0 - >      .
           .. =. .
                      ,,
                    • 0               ,. - _. . .
                                      z,
                                     o p

                                            ."        -
                                                  c:;, " -i         ,                              >    =nllO ~               00                        - ' 1£1 )-
                                                                                                                                                                                        ~
    ··_' .' , •• ,• ',, ,". - ..'                                     -
     0'
          a..   .,      i  ..        g.,      '"  ",,1»::r
                                                        •    ••     -    9
                                                                        .,
                                                                                                       O-..l::J:T
                                                                                                                              ~ !.                      '0   .. It
                                                                                                                                                                :l ..
                              , ." , . ,
                                                                                                                                                         _ ...     _.
    .1:.      ~                   - '                 ,                                   e        ~                                                                                   o,
                                      ,
                                     o • •
                                                      ,
                                                  :::'.
                                                  0 0
                                                      •     =.. ,   •
                                                                    •
                                                                                      Vl;;_
                                                                                      o   ,
                                                                                                       .., _.
                                                                                                        =.. n
                                                                                                              o.
                                                                                                                    ::I
                                                                                                                                     ~                   =.
                                                                                                                                                        " c roll-
                                                                                                                                                        .. - ., It

                                                                                                                                                                                       •o
    ;- :T "
           o'

     ,.-. , •,'.
              l .,
                    .   III
                         ,
                              ::!,"
                                      ·
                                     ~ 0

                                     Ill ,,; -
                                              a   III
                                                 ••
                                              - .It :
                                             .,

                                                        --
                                                   _ .. ., n

                                                        .      .   !-
                                                                                ..                     .. ... - 0
                                                                                                       ;; ~ ~ I
                                                                                                                          o                             ~~ [;r                         m
              -
              ,       , -. .. = 3' •"
                                      •   '
                                                                                                           ..                                              ,-
                                                  o_ I -e 0c'
        ,N
                  . q
                    "
                           ,
                           .          ,   .           -
      ·,• ..-, .-K ",- - • g : .. ... •--.. ••,.• • r -' ,. ,- -_.
    III ll;;


                                                        "
                                                             -
                                                          " - ._.
                                                  :T " _ ::J
                                                                                ••
                                                                                      -   0,
                                                                                       3.u~·
                                                                                               0   ~
                                                                                                   j
                                                                                                       II '< I .,                                       ;;;- .. 3

                                                                                                                                                        -,.~ - ,.
                                                                                                                                                               -...
                                                                                                                                                                 c
                                                                                                                                                           (II l;I
                                                                                                                                                                                       x
                                                                                                                                                                                       ~
                                     0 - ·
                                                                    o                 • •Q. c_.
                                                                                      III
                                                                                                                                                                 ,                     •m.
    "1 "
           •• _.

                •   ..  _0

                           ,
                              . -   .    ~' n

                                     .. !. ~
                                             _.
                                                ·-•             H         ~.
                                                                                            •          0 <0 _ ::I

                                                                                                           Cl       c.
                                                                                                                                                        _ 0 "'_.
                                                                                                                                                        '" Ill . :J
                                                                                                                                                        - 0' III
                              ••" z-
                                                                          ...                          ,- - ca. III                                     . "
    H •''                                                                                 c        o                                                                                   ~
       ,. ,
    •o 0,
                        0'                        ••n 60 111 •n .:
                                                                • I                       on
                                                                                               ,
                                                                                                                e,
                                                                                                                                                                                       •~
           -.
                        <>           l '< ;;                                                           (l  - I -
                                                                                                                                                           .s=.,0 It:T   s:
                                                                                                                                                           .-. '
                                                                                                        c ::r,,'<
    i ~ ~
                        •c s e cr < :1 =.                                                              .'
                                                            •
                                                                                                                                                                         ~
    •••
    a.a.~
                              0
                            • z..~g :!.:1~
                                                  .,



                         •l ' :::.• •- • • • ••.,,•
                              c,
                                     "       0
                                                        Q
                                                         :=', 0


                                                                          · ·-            •
                                                                                          •. 0
                                                                                               •       ::r"-ll
                                                                                                       O ~ " l;I'.                                               ".
                                                                                                                                                                         N

                                                                                                                                                                         r-
                                                                                                                                                                         s
                                                                                                                                                                                       o
    ,- ..
                             .                                                                         •"' '''' c
                                                                                                                rn=
                                                                                • •
                                                  II C 0 C
                                                                                          0,                                                                  "
                                     00.';;                                               '-                      ''                                       :Tell
                ~
                       ...,\   =. -, ,ii" ., " •,
                                                  1M - - • .,                                                                                                            n
,
N
    "
    n Q :t
    g~;­
           :I



                 - . .   .•
                           -.
                               •
                               ••
                                  ,.   , , •-
                                                  _110(00-
                                                                                          , a
                                                                                                       ;l ;" »-
                                                                                                       :JlO ll_
                                                                                                                                                           ' N

                                                                                                                                                                -.-,
                                                                                                                                                            = I !!       s:
    a
                     ·    ••
                               " .•
                                                                                                                                                           0 - 0
                                                  •             "                                      g;.::;".;                                            ..           n
           .i III
                 "     -~. ~              "                                                    c

                                                                                                                                                           •,- ..,
                                                                                                        ' on                                                             r
                       "       •                        -                 .i s            ,
                                    " .
                                                                                                       o - C_ n0
                                                                                                       ()                                                  2'!l ....
        l
            .'                                                                                                                                                           o<
                                         o 0

                                                                                                                                                             --.
                                                                    ~


                i
                               ·         •-, '0         ~ , ;l.;
                              c                                           o      •                     :> -   .. 3
                                                                                                                                                                 ••
    ," . , ..
    n                                                                                     •    0
    ~, c_ i0         • •       ss                                         ~<;'!                                                                                          o
            -,- .N
                 •                                                                                     c   .. 0 _.
                     ' ."
                        •  ,                                                                                                                                             c
                ,•
                       ..
                        •      ·
                               ·  ,          •

                                                    • ..
                                                           ' ..
                                                        cr ;;" '0
                                                                    :;;
                                                                          ,_.   ~
                                                                                               ~
                                                                                                       o
                                                                                                       ::'. -
                                                                                                                "
                                                                                                                III
                                                                                                        :J :T c _
                                                                                                                                                           Sl,:T"
                                                                                                                                                                         r
                                                                                                                                                                         c


                           '" .'
                 ••               -                          •
                                                        ,. -0·
                                                        '< - . I                                       <Q '~ o
                                                                                                                                                                     •
    •
    - .. ·
    0-0
    - 0
    ~ 3 "   ,-
            "
                        .
                         •
                           •
               a .. , • • -.
                 "•     • 00   "'
                               ,.
                                     -c.
                                     '., I 0    ·   -
                                                    ,-
                                                        .. " 0

                                                . , . : ".      •
                                                                          •               • .,
                                                                                                           •• •> ,            1) 0
                                                                                                                              ,
                                                                                                                              "    c
                                                                                                                                     ... 0

                                                                                                                                                           " ., =.


                                     .."                     ..                           A'

                                                        .                                                  o• n               o "    o '
                                                        I    "                                                                • o. ~ ~
          -
    ;'< iii"            es "         ·   :   0
                                                        •"
                                                         -
                                                                          ':!. (l         j 0:             ,                                               '0 :: ,

    -
            ·    .0
       .an .,-.- • ··..:r- .-
                                         ••
                                        ,•            -  ,
                                                        '.
                                                                                                                              • >1                         ,::. :> _.




                                                                                                                                                                                      ca
                                                                                                                    .
        "'
        ••     ,     ,.
                        ,     0


                               "                  '.  -    0. ,
                                                        ! '0 l            o il




                                                                                                                                                                                       .
                                                                                                                                                                                    ps
                                                           -,                             On
                           •   ••        ;"         -   .,      -                                          'c.
                                                                                                           • 0                       ' • c
                                                                                                                                                           C - 'Ill

                             • ,-




                                                                                                                                                                                 BS
                                                                o               • •
           ,    0
                ,
                              •          • ,                              "                                . ">."                 \ _ 3 .> lJ'             ~ III 0
                                                                                                                                                               -,
              , • • , -. ••• -,•".- .., -.=.. .                           c,
                                                        l       .


                                                           , ..




                                                                                                                                                                                W
                                         o'             -.                                                 "0                     '" .. 0         III      - lII B
                                         · c            ;:; g'                            ,,                                      N ~     g. .... ill      !o a, c_




                                                                                                                                                                                ://
                                                                                                           _ ,      0
        •  ,0                 •
                                         •• •
                                                                    ::I
                                                                                                                                    _ _ :T _




                                                                                                                                                                              tp
           ,"
            •
                                                        •       H                                                                 ... I   It .. ..




                                                                                                                                                                         ht
```

### Page 4 (PDF text layer)

```text
WARO -BECK S YS TEM S L T O .




                            INTE GRATED CIRCUIT DATA
                                       74C 4 2:                                       •

                            BCD TO DEC I MAL DECODER


  The 74C42: o ne - of - t e n decoder I s a ~on o l ithf c CMOS c irc uft.
  This de cod er produ c es a logi c ' 0 ' at t he ou t put corresp ondin g
  t o a f our b ft b inary f nput frolll zero to nin e , and a l og f c ' I'
  at the ot her out puts.         For bfnary inp uts fr om te n t o f 1f teen
  all ou t puts are lo gic ' 1 ' .

                                                   , OUTPUTS
                                                        •
                                • c o • •
                       I"     " " ta " " " •
                                   .

     TOP V IEW




                        , ,
                          , , , • s•
                                •                                   •
                                  s3                          7


                              •
                                   OUTPUTS


                         IN PUTS                  OU TPU TS
        TR UTH
        TA BLE
                        0   c8 A       0 1 2 J 4 5       , ,  7 8

                        0 DOD          0 1 1 1 1 1 1 1 1 1
                        0 o 0 1        1 0 1 1 1 1 1 1 1 1
                        0 D I D        1 1 0 1 1 1 1 1 1 1
                        0 0 1 1        1 1 1 0 1 1 1 1 1 1
                        0 100          1 1 1 1 0 1 1 1 1 1
                        0 1 0 1        1 1 1 1 1 0 1 1 1 1
                        0 1 1 0        1 1 1 1 1 1 0 1 1 1
                                                                                 ca




                        0 I I I        1 1 1 1 1 1 1 0 1 1
                                                                                 s.




                        1 000          1 1 1 1 1 1 I 1 0 1
                                                                                p




                        1 o 0 1
                                                                             BS




                                       1 1 1 1 1 1 1 1 1 0
                                                                             W
                                                                         ://
                                                                        tp
                                                                        ht




                                       74C4 2:
```

### Page 5 (PDF text layer)

```text
WAFlO - 8 ECK S Y STE M S LTO .




                                   INT EGRATE a CIRCU IT DATA
                                                   74C76
                    DUAL     J -K FL IP - FLOP WITH CLEAR AND PRESE T


  The 74C76 J - K f11 p- f lop is • mo no li th i c CMOS ci rc ui t . Eac h flip -
  flop has 1ndepe nde nt J , K, clock , cl ear an d pr es et inp uts as wel l
  as Q an d "lT o ut put s. The flip -flops a r e edge se ns H1ve t o t he
  cloc k 1np ut a nd ch ange s ta te on t he ne ga t iv e g01ng tra nsiti on
  of t he clock puls es . Cle a r or pr ese t is in de pe ndent o f the clo ck
  a nd is ac compl t s bed by a low le vel on th e r-espec e t ve i nput.


                    CLOCK A
                                     1
                                                                      " K.
                    PRESET A

                                  jJ              J CLEAR

                                               ~CLOCK
                                                            Q         "
                    CLEAR A
                                                  KpRESET~ ...J
                                                                      "
                                  ~        -                          ~
                                  ....!.                              ra
                                                                           K,
                                                  KPRESETa
                    CLOC K B      --'- '--< CLOCK                     11
                                                                           Q,

                                  .:                        C         "
                    PRESET B

                    CLEAR B          •
                                                   CLEA R
                                                                           "
                                                                         • J,
                                                 T OP V I EW
      Hat e 1:          A 10g1 c ~ D " on cl ea r sets Q t o a l og ic "0" .
      Hate Z:           A 10g1c " D ~ on preset sets Q t o a 10g1c ·1 " .
                                                                                             0,
           J
           0
               t,
                    ,
                    0
                           tn+l
                            Q
                            Q,
                                               TRUnt
                                               TA BLE
                                                                  Preset
                                                                     0
                                                                     0
                                                                            Cl ea r
                                                                                0
                                                                                1
                                                                                       Q,
                                                                                       0
                                                                                       1
                                                                                             0
                                                                                             0
           0        1       0                                        1          0      0     1
                                                                                                   a




                                                                                             0,
                                                                                                  .c




           1        0       1                                        1          1     . Q"
                                                                                                  ps




           1        1       0,
                                                                                             BS




  t n· b1t t 1me before c l ock pu lse.                           · NO change 1n ou tp ut
                                                                                        W




  tn+l • b1t t 1me after cloc k pu ls e.                            f r om prev i ous state
                                                                                      ://
                                                                                    tp
                                                                                ht




                                                   14C75
```

### Page 6 (PDF text layer)

```text
WA~D -BEC K    S YSTEM S LTD .




                                   PARTS LIST
                           MZOZ   LOGIC LATCH MODULE


  PART      DESCRIPT ION
                                          , '" •                  ",    PART NUMBER
  Cl        Cap aci to r    o. 1 uf n S          K••l t           T390AI04M03SAS
  C2             •               •                                            •
  C3             •               •                  •                         •
                 •               •                  •                         •
  "
  C5             •
                 •
                            ZZDO p'
                                    ,
                                                 Aseleo           CQ9Z -HC-ZZZM
                            ZZ uf/Z5             h.lt             T3900ZZ6MOZ5AS
  "
  C7
  C8
                 •
                 •
                                  •
                            I uf/3S V
                                     ,
                                                    •
                                                    •
                                                                              •
                                                                  T390 B10 5KO35A5
   cs            •          4 . 7 uFnS              •             T39 0 D47 5MO 35AS
   Cl.           •                •                 •                         •


  CR!       Ofo de                               f e lrell l1 d   I N4 14 8
   CR2           •                                  •               •
   CR3           •                                  •               •
  CR4            •                                  •               •
  CR5            •                                  •               •
                 •                                  •               •
  '"
   CR7
   CRB
                 •
                 •
                 •
                                                    •
                                                    •
                                                    •
                                                                    •
                                                                    •
                                                                    •
   cas
   CliO          •                                  •               •
   CRt I         •                                  •               •
   CR IZ         •                                  •               •
   CR13          •                                  •               •
   CRt.          •                                  •               •
   CR I 5        •                                  •               •
   CRI6          •                               Motoro la        1N4 0 0 3
   CRt7          •                                  •               •
   CRI8          •                                  •               •
   CR I9         •                                  •               •
                 •                                  •               •
                                                                                       a




   CRZO
                                                                                   .c
                                                                                   ps




   CR2 1         •                                  •               •
                                                                                  BS
                                                                              W
                                                                          ://
                                                                        tp
                                                                    ht




                                          a- i
```

### Page 7 (PDF text layer)

```text
WA~O ·BEC K   S YSTEMS LTO .




                                  PART S LI ST

                         M20 2   LOGI C L AT C ~ MOOULE



  PART    DESCR[PTI ON                            HF G         MFG PART NU MBER

  QI      Trllnsistor                             Nati onal    2N 35 69
  Q2            0                                   0            0


  QJ            0                                   0            0

                0                                   0            0
  Q'            0                                   0            0
  Q'
                0                                   0            0
  Q'
  Q7            0

                0
                                                    0

                                                    0
                                                                 0

                                                                 0
  Q'


   'I     Res i s t or
                0
                         .- " mm                  Ph il ip s
                                                    0


  "
  RJ
  R4
                0

                0
                                 m
                                 m
                                                    0

                                                    0

                                                    0
   R5           0
                                 47 01<
                0                                    0
   R6                            47 01<
                0                                   0
   R7                            47 01::
   RB           0
                                 47 01<             0


   R9           0
                                 m                  0


   RI O         0
                                 10K                0




   RlI          0
                                 m                   0


   Rl2          0
                                 m                   0


   RlJ          0
                                 m                   0


   RI'          0
                                 m                   0


   RI '         0
                                 m                   0




   '16
                0
                                 m                   0


   Rl7          0

                0
                                 m                   0

                                                     0
   '18
   '19
   " 0
                0

                0
                                 '"
                                 '"
                                 exa
                                                     0

                                                     0




                •                                    0


                                 '"
                                                                                a




   '21
                                                                              .c




                0                                    0
  "2
                                 '"
                                                                            ps




                                                     0
   R2J
                                 '"
                0



   ".
                                                                          BS




                                                     0



                                 '"
                0

                                                     0



                                 '"
                0
   R25
                                                                          W
                                                                     ://
                                                                     tp
                                                                 ht




                                           '· 2
```

### Page 8 (PDF text layer)

```text
WAFlD -BECK S YSTEMS LTD.




                                    PART S LIST

                          M202     LOGI C LATCH MODUL E



   PART

   ."
   R27
            DESCR I PTION

            Resistor
                 •
                 •
                         .   ss m
                                   m
                                   m
                                                MFG
                                                Phll f ps
                                                   •
                                                   •
                                                              MFG PART II' UMBER




  '"
  '"
   R30
                 •
                 •
                                   m
                                   m
                                                   •
                                                   •

   " 1           •                 m               •
   R32           •                 m               •
   R33           •                 m               •
   ."
   R3 5
            Res i st or A:\ W 5'
                 •
                                   100
                                   4. 7
                                                   •
                                                   •

   ."
   R37
                 •
                 •
                 •
                                   100
                                   4. 7
                                                   •
                                                   •
                                                   •
   R38                             100
   R39           •                 4.7             •
   040           •                 4.7             •
   041           •                 4.7             •


   01       I n te gn tt d Ci r cui t           Na tion a l   MM74 CHII'
  U2             •                                 •          MH74C4211'
   OJ            •                                 •          MM74COO"
  U4             •                                 •          MM74C7611
  US             •                                 •            •
   U6       YolUge Regula tor                      •          LM34 0T-I 2
                                                                                a
                                                                             .c
                                                                            ps
                                                                           BS




   WB S re c o ~ men d5 the us e of replace ~ ent parts ~ade by t he
   sp ecf f ie d manufacturers f or continu ed op t1~ um equipment
                                                                     //W




   perf orman ce .
                                                                       :
                                                                    tp
                                                               ht




                                          3-3
```

### Page 9 (PDF text layer)

```text
....         C
                                                                                                                                                                                                            "I                                       NOTES.
                                                                                                                                                                                                                                                   J,. Poou. 1l.~lbTOR!. ARE ,..W 'i.~
                                                                                                                                                                                       100 'laW        T....U.y
                                                                                                                                                                    ~'&          <:>,                                                                  • AU. GLP6L\T'OR.~ ,....,.....; UNL£!6
                                                                                                                                                                               tNMio'
                                                                                                                                                                    tJa                                                                                S~I!='I~D OTH."Q.W'\~e..

                                            +11,V                                                                                          +l~V                           ~                                                                        1. LA~T COM~e.NT [)£50ICaN...T10....f
                                                                                                                                                                       41<1                                                                            .....Go&' : t::,\OI c:.Rtl ,G8,R.4I,Uliio .
                                                                                                                                      ~,~             7AC'"
                                     A.                                                                                                                                                   A"                                                       1   Us.a PC.B 9-10'2.
                                    "71<                          74C.1~                                                              ..'k                                                             ~    ,,~
                                                                                                                                                                                       401 'JlLIJI'    <DNTIlQL
                                 CR'                <R5                    ,~
                                                                                                                                                                    ""~
                            t
                                 It.....       UU'.I         " 1!     UI
                                                                                                                                    .,tv            ,         "     tK~
                                                     ~5      CI                                                               I!.I1                                    R'l:7
                                                    ""'k    ·i / SS
                                                                                                                             "'It                 •
                                                                                                                                                                       4lC1
                                                                                                                                                                                          A...
                                                                                                                                                                                       l00~W
                                                                                                                                                                                                       • &1
                                                                                                                                                                                                       TAu..Y
                                                                                                                                                                    "'10         ",
                                                                                                                                                                               'IN'!161
                                                                                                                                                                                                                   CONTA,OL OUT PUT~
                                                                                                                                                                    ll<~                                           40..... ""'AlL ,UAIIltfr
                                                                                                    74C.4t.                                                                                                             EM.M OUTPUT
                                           +~V                                                      I        \                             ~V                         IUa
                                                                                                                                                                      4lC1
                                    ....                                                        •                                                                                         "'>1
                                                                                                                                                                                                       •
CONTROL INPUTS
                        •
                                   411t
                                  <.U               CR.
                                               Itlt'.1       " V' I
                                                                           10
                                                                                                        U~
                                                                                                                                                  1
                                                                                                                                                               .
                                                                                                                                                               II   At.
                                                                                                                                                                    11<~
                                                                                                                                                                               .....
                                                                                                                                                                               ... -..
                                                                                                                                                                                       .7 ~W
                                                                                                                                                                                                            U
                                                                                                                                                                                                       c:ow_~



( tre)MiH Tl!lr.1t¥ )
                                                     ....    Cl                                                                                   " U4                 ~~
                                                  4"'1t     .l/~oz.                                                                                     &             41<T
                                                                                                                                                  •                                    100 'f\W
                                                                                                                                                                                                       ,. C,
                                                                                                                                                                                                        T..U.V
                                                                                                                                                                                 <as
                                                                                                                                                                               t .. ~'

                                                                                                                                                                       -
                                                                                                                                                                    Zltl
                                        +t1.V                                                                                              +Ity
                                                                                                                                                                                          ....,
                                                                                                                                                                      41<7
                                     1>..                                                                                                             ~""
                        C   15
                                 CU
                                   411'
                                                    CA.l      , 1!
                                                                      UI
                                                                           L                                     +1'IlI                                        .    A..
                                                                                                                                                                    tk~
                                                                                                                                                                                 Q~ . .,
                                                                                                                                                                                tN55<oe
                                                                                                                                                                                             '11.'11
                                                                                                                                                                                                       L    C..
                                                                                                                                                                                                       CONTQOL.



                                                    AT
                                                ""'I<
                                                            C.
                                                            . 1/ )$
                                                                                            I
                                                                                                                                                  • .   VI              IU'
                                                                                                                                                                      4I<T


                                                                                                74c.00
                                                                                                                          , IlDaT

                                                                                                                          U                             .1tV
                                                                                                             ON! !>HOT                                       QIT
                                                                                                                                                             "'k




                                                                                                                                         .'&
                                                                                                                                           •
                                        +t1.V                                                                                              +Ity

                                                                                                                                                                                                       L    C z,
                                                                                                                                                                                                       CONTQOL.
                                                                           L
                        e
                                                    AT
                                                ""'I<                                       I


                                                                                                74C.00
                                                                                                                                                  ·.    VI




                                                                                                                                                                                                                                                                          a
                                                                                                                          , IlDaT

                                                                                                                          U




                                                                                                                                                                                                                                                                     .c
                                                                                                                                                                                                                                                             ps
                                                                                                             ON! !>HOT                      CIllO            QIT
                                                                                                                                                             "'k
                                                                                                                             cs:!1t     CRI'




                                                                                                                                                                                                                                                    BS
                                                                                                                            INII••,     IM_




                                                                                                                                                                                                                                                   W
                                                                                                                                                                                                                                               ://
                                                                                                                                                                                                                                              tp
                                           .,tv                                                                                          .'&




                                                                                                                                                                                                                                              ht
                                                                                                                                      Illlo
                                                                                                                                      411<
                                                                                                                                               ,               II
                                                                                                                                                                     Il?A
                                                                                                                                                                                        """,o\w
                                                                                                                                                                                        +1
                                                                                                                                                                                                       ,~   A/A COtolTQOL OUTPuT


  A'A CONTROL INPuT
                                                                                S
                                                                                    I   •                                                      •                    tKt
```

### Page 10 (PDF text layer)

```text
•
                                                                  C                                .....
                                                                  ~                                en•
                                                                                                   en
                                                                                                   -
                                                                  CD
                                                                  ~           UJ
                                                                  W           - I I-
                                                                              :::> :::>
                                                                  t-          00
                                                                              0>-
                                                                  CD          ~    c<:
                                                                  >
                                                                  CD
                                                                         N::I:
                                                                         ouo::
                                                                                   -I              .....
                                                                                                   a
                                                                                                   0
                                                                         N    1- 0                     I
                                                                         :::E c( I-                v
                                                                  ~           -1 U
                                                                               UJ
                                                                                                   0
                                                                                                       I

                         NC   A 1    +24 V                        U           UZ
                                                                              _z
                                                                                                   N
                                                                                                   a
                                                                  w           <..!l 0              N

               cn INPUT B     B 2    cn IN PUT A                  m           au
                                                                              -I

                                                                  •
                                                                  c
                 OUTPUT Al    C 3    OUTPUT A2
                                                                  a:
                          *   D 4    *                            c(
                                              •

                         NC   E 5    NC                           ~
                 OUTPUT Bl    F 6    OUTPUT B2
                          *   H 7    *                                                               •
                                                                                                 )((:)
                                                                                               IOCZ
                         NC   J 8    NC                                                        )()(e(

                                                                        .... o........ en. .
                                                                                                • •

                         NC   K 9    NC                                ZI-                e(       ....

                 OUTPUT C2    l 10   OU TPUT Cl          -   ::=- a::   e(
                                                                       00
                                                                                  lII: (J
                                                                                  (J      en
                                                                                                   0
                                                                                                   I-


                          *   M 11   *
            A/A CTl OUTPUT    N 12   A/A cn OUTPUT
             A/A CTl INPUT    P 13   cn INPUT C
                         NC   R 14   cn COM
                         NC          NC                  ....
                                                         -
                                                            •
                                                                             J:
                              S 15                       I-                  -Z
                                                                             en
                                                         e(
                                                         ~                   -
                                                                             ""
                                                         Z
                                                         o
                                                         ...oen
                                                                                  a



                                                         ::J
                                                                             .c
                                                                        ps
                                                                       BS




                                                             •
                                                         0
                                                                  W




                                                         lII:
                                                         (J
                                                              ://




                                                             •
lE GEND:
                                                         tp




                                                         0
NC : NOT CO NNEC TED                                 •   0                                                 -.
                                                         ht




                                                                   •                           •       /.
                                                         ~
*: STE ERI NG NETWOR K, REFE R TO SCHEMATIC              en
                                                             •
                                                         en
```

### Page 11 (PDF text layer)

```text
(was]                                                                  ~
                U~.!
                                                                                                                          ~~id@ in                           .
                                         enrn ••                                                           ~
(
                nii                  9-102                                                                 'fI
                                                                                                             ~

                                                                                                             ....
    \   0
                 I I
                      •
                IQ ;: t1.
                      "! ;l.
                           '(y          D 'J4C.4't
                                             ua.
                                                                ~~
                                                                ....--I I D
                                                                -~

                                                                       I
                                                                               U4
                                                                              704C.~
                                                                                                       "~11
                                                                                                       .:!:
                                                                                                       ..... j
                                                                                                       III
                                                                                                               @ @ !!
                                                                                                                   "' .. .
                                                                                                                         Ii
                                                                                                                                              iT
                                                                                                                                                        II
                                                                                                                                                        v
                                                                                                                                                             C

                                    I
                                                                                                                                                        *
                D7<4uc.,..              q.... ~~ ... !~
                                        ,,!!g ---~:I ~ 2
                                        Q: v~ ~ e ~ li Qt ....
                                                                                          II
                                                                                          ~
                                                                                                       ~ I.il
                                                                                                       !B;;   @ @   ~n~c
                                                                                                                ..- iTiH
            I                            IAA &t& l~ Y y                                    I           I II I

                  ~
                  a
                    ..."y~
                           >., 1-                     us
                                                  , 74tOO
                                                                 ~
                                                                  :i D "14<;7li
                                                                                    us                 II_II
                                                                                                       "!=- @
                                                                                                       1iI T= @
                                                                                                              "'-   .   t ....
                                                                                                                                              \1l11ll
                                                                                                                                               =:t "ii
                                                                                                                                              .... i5
                   I j ..                I                         I   I                               II I                                    II A
    /
        OJ ~~
U                                            ~
                                             .-      LJ
                                                    <;5                    L ~ ~~                      \8..
                                                                                                       ..I ."=
                                                                                                             ;.  @ @                       l1f1t
                                                                                                                                        . - ....
                                                                                                   *
                3 ""'at·                     0
                                                   ::tlt   ~,                  QLar
                                                                              ...    (l
                                                                                                                                              ;{             s
                Aial                         I                                '! I             I            I II                               I Ii i




                                                                                                                                                                   a
                                                                                                                                                                 .c
                                                                                                                                                                           -
                                                                                                                                                              ps
                                                                                                                                                             BS
                                                                                                                                                                   .

                                                                                                                           ('NBS) ."",.Ylll::.4I-="'KC .fa i
                                                                                                                                                   W
                                                                                                                                                   CO




                                                                                                                         ---.
                                                                                                                                               ://

                                                                                                                         --
                                                                                                                         --
                                                                                                                                            tp
                                                                                                                                          ht



                                                                                                                                 IeMI
                                                                                                                                          B         202-06-001         I
```

## Contents (JSON)

```json
{
 "file": "Modules/LOGIC/M202/1979 - M202 - Logic Latch Module (2).pdf",
 "sha256": "072c0cc4750f5aa951fba9e1b7ef477441bf4426543f6532a6fda5c1df77316c",
 "kind": "module",
 "models": [
  "M202"
 ],
 "year": 1979,
 "pages": 11,
 "order": [
  {
   "page": 5,
   "connections": [
    {
     "kind": "control",
     "signal": "CLOCK A"
    }
   ]
  },
  {
   "page": 6,
   "sections": [
    {
     "heading": "PARTS LIST",
     "kind": "parts"
    }
   ]
  },
  {
   "page": 10,
   "connections": [
    {
     "kind": "power",
     "signal": "+24V"
    }
   ]
  }
 ]
}
```
