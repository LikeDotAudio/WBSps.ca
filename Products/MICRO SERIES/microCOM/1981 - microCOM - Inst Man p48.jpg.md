# 1981 - microCOM - Inst Man p48.jpg
Wiki page: [microCOM](../../../PAGES/microCOM.md)


- **Year:** 1981 (module estimate (numeric))
- **Module:** microCOM
- **Category:** MICRO SERIES
- **Module year estimate:** 1981 — numeric "07/13/81" in PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p49.JPG
- **Original file:** `WBSps.env/PUBLIC/Manuals + tech DOCUMENTS/Intercom/microcom/WBS MicroCOM Inst Man p48.JPG`
- **SHA-256:** `7916585c05a664d1bdc1e3a01c68af98d3097d99a87f9159e780f4857691d856`
- **Size:** 305,990 bytes
- **Pages:** 1

## Full text

### Page 1 (OCR, spell-checked: 4 words corrected)

```text
WAAD-BECK SYSTEMS LTO_
SPECIALIZED CROSSPOINT
CONTROL FUNCTIONS
The program that is loaded into the EPROM on the M776A output controller daughter assembly contains secondary control routine (SECT) which is able to:
i) scan all crosspoints located on the RF Intercom output bus (024 ) to check if any are switched on If any crosspoints are on, status flag register will be set and used to drive relay K1 on the 82700-1 relay module. This relay module controls the direction of the signal path on the RF Intercom bus (024)
ii ) mask off any talk crosspoint operation that appears on the Page bus (002) as result of being assigned on any one of the four News terminals (bus 006 to bus 009 ) or on the NEWS FLASH CAMERA terminal (bus 011 ) These stations should only be able to Listen to bus 002  . iii) shift certain Studio Select crosspoint operations 50 that the CSC Studio inputs (bus 079 to bus 087 ) can talk to the CSC station (bus 004) the Supervisor Studio inputs (bus 070 to bus 078 ) can talk to the NTC Supervisor station (bus 005 ) and the Studio 63/64 Net Delay input (bus 068 and bus 069) can talk to the Net  Delay station (bus 012) _
With this ability to transfer crosspoint control operations, there is no need to have control terminal connected to any of the studio inputs (bus 068 to bus 087) since all crosspoint control comes from the terminal connected to the Studio Select inputs (bus 088 to bus 096 )
iv) shift certain Studio Select crosspoint operations from one output bus to another on the CSC (bus 004 ) and NTC Supervisor (bus 005 ) input Lines
This allows the CSC (bus 004 ) and NTC Supervisor (bus 005 ) stations to talk to their associated studio lines (bus 070 to bus 087 ) and also have ca Lling tally information sent back to the appropriate key on the corresponding Studio Select terminal _
4-2
```

<details><summary>As read by the OCR</summary>

```text
WAAD-BECK SYSTEMS LTO_
SPECIALIZED CROSSPOINT
CONTROL FUNCTIONS
The program that is loaded into the EPROM on the M776A output controller daughter assembly contains secondary control routine (SECTL) which is able to:
i) scan all crosspoints located on the RF Intercom output bus (024 ) to check if any are switched on If any crosspoints are on, status flag register will be set and used to drive relay K1 on the 82700-1 relay module. This relay module controls the direction of the signal path on the RF Intercom bus (024)
ii ) mask off any talk crosspoint operation that appears on the Page bus (002) as result of being assigned on any one of the four News terminals (bus 006 to bus 009 ) or on the NEWS FLASH CAMERA terminal (bus 011 ) These stations should only be able to Iisten to bus 002  . iii) shift certain Studio Select crosspoint operations 50 that the CSC Studio inputs (bus 079 to bus 087 ) can talk to the CSC station (bus 004) the Supervisor Studio inputs (bus 070 to bus 078 ) can talk to the NTC Supervisor station (bus 005 ) and the Studio 63/64 Net Delay input (bus 068 and bus 069) can talk to the Net  Delay station (bus 012) _
With this ability to transfer crosspoint control operations, there is no need to have control terminal connected to any of the studio inputs (bus 068 to bus 087) since all crosspoint control comes from the terminal connected to the Studio Select inputs (bus 088 to bus 096 )
iv) shift certain Studio Select crosspoint operations from one output bus to another on the CSC (bus 004 ) and NTC Supervisor (bus 005 ) input Iines
This allows the CSC (bus 004 ) and NTC Supervisor (bus 005 ) stations to talk to their associated studio lines (bus 070 to bus 087 ) and also have ca Iling tally information sent back to the appropriate key on the corresponding Studio Select terminal _
4-2
```

</details>

## Contents (JSON)

```json
{
 "file": "Products/MICRO SERIES/microCOM/1981 - microCOM - Inst Man p48.jpg",
 "sha256": "7916585c05a664d1bdc1e3a01c68af98d3097d99a87f9159e780f4857691d856",
 "kind": "module",
 "models": [
  "microCOM"
 ],
 "year": 1981,
 "pages": 1
}
```
