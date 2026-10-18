# Ward-Beck Parts

Built from the **WBS-INVENTORY** folder (`WBSps.env/Company sort 2026/WBS-INVENTORY-…`). Everything in that folder is about parts and stock, not device history, so it lives here. Parts that belong to a specific product are listed under [Parts by device](#parts-by-device). The source files are copied into [`PARTS/`](PARTS/).

- [Part naming convention](#part-naming-convention)
- [Shelf locations](#shelf-locations)
- [Parts by device](#parts-by-device)
- [EuroBlock cross-reference](#euroblock-cross-reference)
- [Inventory count log](#inventory-count-log)
- [Footprints and datasheets](#footprints-and-datasheets)
- [Full parts list](#full-parts-list)

## Part naming convention

_MiSys part naming convention (from `#Inventory #Part #NamingConventions.xlsx`)._

|  |
|---|
| MiSys Part Naming Convention |

### BNC's

|  |  |  |  |  |
|---|---|---|---|---|
| Type | hyphen | Style | Data Rate |  |
| example | BNC | - | CE | 3G |
|  |  | CE - Card edge | 3G - 3gig |  |
|  |  | RA - Right Angle | 1G5 - 1.5g |  |
|  |  | OG - opengear | 1G  - 1Gig |  |

### Capacitors (1xx)

|  |  |  |  |  |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Type: | Voltage | Material | Hyphen | Value | 0 places | tolerance | slash | Mounting | (space) | Package size |  |
| Example: | C | 6v3 | C | - | 10 | 5 | K | / | SM |  | 402 |
|  | V - decimal place for x10^0 units | C - Ceramic |  | * referenced to pico farad ie. 106 = 10uF, 100 = 10pF |  | F +-1% |  | SM - surface mount |  | 402 |  |
|  | K - decimal place for x10^3 | T - Tantalum |  |  |  | G +- 2% |  |  |  | 802 |  |
|  |  |  |  |  |  | J +-5% |  |  |  | 602 |  |
|  |  |  |  |  |  | K +-10% |  |  |  | C - CCASE |  |
|  |  |  |  |  |  | M +-20% |  |  |  |  |  |

### Capacitors (any integer)

|  |  |  |  |  |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Type: | Voltage | Material | Hyphen | Value | Multiplier | tolerance | slash | Mounting | (space) | Package size |  |
| Example: | C | 6V3 | C | - | 47 | M | K | / | SM |  | 402 |
|  | V - decimal place for x10^0 units | C - Ceramic |  |  | # referenced to pico | F +-1% |  | SM - serface mount |  | 402 |  |
|  | K - decimal place for x10^3 | T - Tantalum |  |  |  | G +- 2% |  |  |  | 802 |  |
|  |  |  |  |  |  | J +-5% |  |  |  | 602 |  |
|  |  |  |  |  |  | K +-10% |  |  |  | C - CCASE |  |
|  |  |  |  |  |  | M +-20% |  |  |  |  |  |

### Inductors

|  |  |  |  |  |  |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Type | Current (Amps) |  | Hyphen | Value (H) | Hyphen | Quality Factor | value | slash | Mounting | (space) | Package Size |  |
| Inductors | L | 300m |  | - | 2u2 | - | Q | 8 | / | SM |  | 402 |
|  | M - x10^-3 |  |  | H - x10^0 |  |  |  |  | SM - surface mount |  | 402 |  |
|  | u - x10^-6 |  |  | M - x10^-3 |  |  |  |  |  |  | 602 |  |
|  | A - x10^0 |  |  | u - x10^6 |  |  |  |  |  |  | 802 |  |
|  |  |  |  | n - x10^-9 |  |  |  |  |  |  | 1206 |  |
|  |  |  |  | p - x10^-12 |  |  |  |  |  |  |  |  |

### Resistors

|  |  |  |  |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|---|---|
| Value(Ohm) | - | Power Rating | - | Tolerance | / | Mounting | (space) | Package size |  |
| Example: | 3R2 | - | 1/16w | - | 0.01 | / | SM |  | 402 |
| R - x10^0 |  |  |  |  |  | SM - surface mount |  | 402 |  |
| M - x10^6 |  |  |  |  |  |  |  | 602 |  |
| K - x10^3 |  |  |  |  |  |  |  | 802 |  |

## Shelf locations

Location codes are **unit letter + shelf letter + bin number** (e.g. `BB4` = unit B, shelf B, bin 4). From `WBS Shelf Naming.xlsx` / `WBS-WORKFLOW-Shelf Labels.xlsx`.

| Unit | Locations |
|---|---|
| A | AA1, AA2, AA3, AA4, AA5, AB1, AB2, AB3, AB4, AB5, AC1, AC2, AC3, AC4, AC5 |
| B | BA1, BA2, BA3, BA4, BA5, BB1, BB2, BB3, BB4, BB5, BC1, BC2, BC3, BC4, BC5 |
| C | CA1, CA2, CA3, CA4, CA5, CB1, CB2, CB3, CB4, CB5, CC1, CC2, CC3, CC4, CC5 |
| D | DA1, DA2, DA3, DA4, DA5, DB1, DB2, DB3, DB4, DB5, DC1, DC2, DC3, DC4, DC5 |
| E | EA1, EA2, EA3, EA4, EA5, EB1, EB2, EB3, EB4, EB5 |
| F | FA1, FA2, FA3, FA4, FA5 |
| H | HA1, HA2, HA3, HA4, HA5, HB1, HB2, HB3, HB4, HB5 |
| J | JA1, JA2, JA3, JA4, JA5, JB1, JB2, JB3, JB4, JB5 |
| K | KA1, KA2, KA3, KA4, KA5, KB1, KB2, KB3, KB4, KB5, KC1, KC2, KC3, KC4, KC5 |
| M | MA1, MA2, MA3, MA4, MA5, MB1, MB2, MB3, MB4, MB5 |
| P | PA1, PA2, PA3, PA4, PA5, PB1, PB2, PB3, PB4, PB5, PC1, PC2, PC3, PC4, PC5, PD1, PD2, PD3, PD4, PD5 |

## Parts by device

320 parts whose part number names a product.

### AMS2

| Part number | Description | Category |
|---|---|---|
| AMS2-BOTTOM | Bottom Pan | WBS-CUSTOM / Metal Shop |
| AMS2-SPEAKER BOX | Speaker Box | WBS-CUSTOM / Metal Shop |
| AMS2-TOP | Top Cover | WBS-CUSTOM / Metal Shop |
| AMS2-TWEETER BRACKET | Tweeter Bracket | WBS-CUSTOM / Metal Shop |
| AMS2-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| AMS2-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### AMS4

| Part number | Description | Category |
|---|---|---|
| AMS4-002 | Mid-Range Speaker Bracket | WBS-CUSTOM / Metal Shop |
| AMS4-004 | Large Speaker Enclosure | WBS-CUSTOM / Metal Shop |
| AMS4-005 | Large Speaker Mounting Bracket | WBS-CUSTOM / Metal Shop |
| AMS4-007 | Foam/Large Speaker | WBS-CUSTOM / Metal Shop |
| AMS4-008-2 | Foam/Medium Speaker Right Side | WBS-CUSTOM / Metal Shop |
| AMS4-010 | Heatsink | WBS-CUSTOM / Metal Shop |
| AMS4-BOTTOM | Bottom Panel | WBS-CUSTOM / Metal Shop |
| AMS4-SIDE | SELECT SERIES Side Panel | WBS-CUSTOM / Metal Shop |
| AMS4-SPACER | Spacer/EN5F Speaker | WBS-CUSTOM / Metal Shop |
| AMS4-TOP | SELECT SERIES Top Cover | WBS-CUSTOM / Metal Shop |
| AMS4-012 | AMS4 0.793 Nylon Spacer/DEMUX | WBS-CUSTOM / Metal Shop / AMS |
| AMS4-013 | AMS4 0.312 Nylon Spacer | WBS-CUSTOM / Metal Shop / AMS |
| AMS4-009 | Front Panel Display Lens | WBS-CUSTOM / Metal Shop / FRONT |
| AMS4-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| AMS4-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| AMS4-1PCB | PCB - AMS4 Main Assembly PCB | WBS-CUSTOM / PCB / AMS |
| AMS4-3PCB | PCB - AMS4 Level Control PCB | WBS-CUSTOM / PCB / AMS |
| AMS4-4PCB | PCB - AMS4 Terminal Block PCB | WBS-CUSTOM / PCB / AMS / Terminal |
| AMS4-2PCB | PCB - AMS4 Pushbutton/Meter PCB | WBS-CUSTOM / PCB / Pushbutton / AMS |
| AMS4-6PCB | PCB - AMS4 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton / AMS |

### AMS4E

| Part number | Description | Category |
|---|---|---|
| AMS4E-1PCB | PCB - AMS4E Front Assembly PCB | WBS-CUSTOM / PCB / AMS |
| AMS4E-2PCB | PCB - AMS4E Dolby E  Assembly PCB | WBS-CUSTOM / PCB / AMS |

### AMS8

| Part number | Description | Category |
|---|---|---|
| AMS8-M13 | Brass 1.648 Standoff | WBS-CUSTOM / Metal Shop |
| AMS8-M14 | .125 PVC Standoff x 2-56 | WBS-CUSTOM / Metal Shop |
| AMS8-M15 | 3/16 Hexagonal BR Standoff .804X2-56 | WBS-CUSTOM / Metal Shop |
| AMS8-M16 | Speaker Foam | WBS-CUSTOM / Metal Shop |
| AMS8-M17 | 0.765 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop |
| AMS8-M18 | 0.636 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop |
| AMS8-M3 | Left/Right Wing | WBS-CUSTOM / Metal Shop |
| AMS8-M4 | Top Cover | WBS-CUSTOM / Metal Shop |
| AMS8-M5 | Bottom Pan | WBS-CUSTOM / Metal Shop |
| AMS8-M7 | Tweeter Mounting Bracket | WBS-CUSTOM / Metal Shop |
| AMS8-M8 | Speaker Shim | WBS-CUSTOM / Metal Shop |
| AMS8-M9 | Speaker Washer | WBS-CUSTOM / Metal Shop |
| AMS8-M10 | AMS81 Chroma Filter Display Lens | WBS-CUSTOM / Metal Shop / AMS |
| AMS8-M12 | AMS81 Heatsink Support Bracket | WBS-CUSTOM / Metal Shop / AMS |
| AMS8-M6 | AMS81 Display Lens | WBS-CUSTOM / Metal Shop / AMS |
| AMS8-M22 | AMS8-1BA Front Panel - ABC Release Spec. | WBS-CUSTOM / Metal Shop / AMS / FRONT |
| AMS8-M23 | AMS8-1CA Front Panel - ABC Graphics Spec. | WBS-CUSTOM / Metal Shop / AMS / FRONT |
| AMS8-M24 | AMS8-1A Front Panel New Style | WBS-CUSTOM / Metal Shop / AMS / FRONT |
| AMS8-M21 | AMS8-1AAEM 75 Ohm Rear Panel | WBS-CUSTOM / Metal Shop / AMS / REAR |
| AMS8-M19 | MLC-8B Rear Panel | WBS-CUSTOM / Metal Shop / MLC / REAR |
| AMS8-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| AMS8-2A DEMUX 3 | HD/SD-SDI Option/AMS8-2A | TH / - |
| AMS8-2A DOLBY | Dolby Option/AMS8-2A | TH / - |

### AMS8E

| Part number | Description | Category |
|---|---|---|
| AMS8E-11PCB | PCB - Auxiliary Output PCB | WBS-CUSTOM / PCB |
| AMS8E-2PCB | PCB - Balanced Termination PCB | WBS-CUSTOM / PCB |
| AMS8E-12PCB | PCB - AMS8E Audio Meter PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-1PCB | PCB - AMS8E Main Board PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-3APCB | PCB - AMS8E Termination PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-3BPCB | PCB - AMS8E Termination PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-4PCB | PCB - AMS8E PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-5PCB | PCB - AMS8E PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-6PCB | PCB - AMS8E Display PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-7PCB | PCB - AMS8E Power Supply PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-8PCB | PCB - AMS8E Power Amplifier PCB | WBS-CUSTOM / PCB / AMS |
| AMS8E-10PCB | PCB - AMS8E LED PCB | WBS-CUSTOM / PCB / AMS / LED |
| AMS8E-9PCB | PCB - AMS82 Front Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton / AMS |

### AMS16A

| Part number | Description | Category |
|---|---|---|
| AMS16A-PCB1 | PCB - AMS16A Display PCB | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB2 | PCB - AMS16A Control Board PCB | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB3 | PCB - AMS16A Main PCB | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB4 | PCB - AMS16A Rear PCB | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB5 | PCB - AMS16A Single Rack Display PCB | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB6 | PCB - AMS16A Single Rack Control PCB | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB8 | PCB - AMS16A Power Distribution Board | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB9 | PCB - AMS16A Dolby Decoder Board | WBS-CUSTOM / PCB / AMS |
| AMS16A-PCB7 | PCB - AMS16A Pushbutton Board | WBS-CUSTOM / PCB / Pushbutton / AMS |

### AMS16A2

| Part number | Description | Category |
|---|---|---|
| AMS16A2-M8 | Custom Nylon Standoff 0.203 | WBS-CUSTOM / Metal Shop |
| AMS16A2-M10 | AMS16A2 0.188 Outer Diameter x 0.267 Long Nylon | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M11 | AMS16A2 .187 Outer Diameter x .171 Inner Diameter Nylon | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M3 | AMS16A2 Display Chroma Filter | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M4 | AMS16A2 Bronze Plexiglas Lens | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M5 | AMS16A2 Bottom Pan | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M7 | AMS16A2 Top Cover | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M9 | AMS16A2 .240 Outer Diameter x .110 Inner Diameter PVC | WBS-CUSTOM / Metal Shop / AMS |
| AMS16A2-M1 | AMS16A2 Front Panel | WBS-CUSTOM / Metal Shop / AMS / FRONT |
| AMS16A2-M2 | AMS16A2 Rear Panel | WBS-CUSTOM / Metal Shop / AMS / REAR |

### AMS82

| Part number | Description | Category |
|---|---|---|
| AMS82-1M10 | 3.398 Hexagonal Brass Standoff | WBS-CUSTOM / Metal Shop |
| AMS82-1M8 | Heatsink | WBS-CUSTOM / Metal Shop |
| AMS82-1M9 | Speaker Foam | WBS-CUSTOM / Metal Shop |
| AMS82-1M13 | AMS82 2.515 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop / AMS |
| AMS82-1M14 | AMS82A 0.821 Nylon Standoff DEMUX | WBS-CUSTOM / Metal Shop / AMS |
| AMS82-1M6 | AMS82 Grey Chroma Filter | WBS-CUSTOM / Metal Shop / AMS |
| AMS82-1M7 | AMS82 Display Lens | WBS-CUSTOM / Metal Shop / AMS |
| AMS82-1M1 | AMS82 Front Panel | WBS-CUSTOM / Metal Shop / AMS / FRONT |
| AMS82-1M2 | AMS82 Rear Panel | WBS-CUSTOM / Metal Shop / AMS / REAR |

### D6201

| Part number | Description | Category |
|---|---|---|
| CP-86 WE D6201 | White Ejector Handle | Hardware / Hardware / Handle |

### D6201A

| Part number | Description | Category |
|---|---|---|
| D6201A-PCB | PCB - D6201A Dual 75 Ohm AES DA PCB | WBS-CUSTOM / PCB |

### D6202

| Part number | Description | Category |
|---|---|---|
| CP-86 WE D6202 | White Ejector Handle | Hardware / Hardware / Handle |

### D6202A

| Part number | Description | Category |
|---|---|---|
| D6202A-PCB | PCB - D6202A Dual 110 Ohm AES DA PCB | WBS-CUSTOM / PCB |

### D6203

| Part number | Description | Category |
|---|---|---|
| CP-86 WE D6203 | White Ejector Handle | Hardware / Hardware / Handle |

### D6203A

| Part number | Description | Category |
|---|---|---|
| D6203A-PCB | PCB - D6203A  PCB | WBS-CUSTOM / PCB |

### D6204

| Part number | Description | Category |
|---|---|---|
| CP-86 WE D6204 | White Ejector Handle | Hardware / Hardware / Handle |

### D6204A

| Part number | Description | Category |
|---|---|---|
| D6204A-PCB | PCB - D6204A  PCB | WBS-CUSTOM / PCB |

### D6207

| Part number | Description | Category |
|---|---|---|
| CP-86 WE D6207 | White Ejector Handle | Hardware / Hardware / Handle |

### D6207A

| Part number | Description | Category |
|---|---|---|
| D6207A-PCB | PCB - D6207A  PCB | WBS-CUSTOM / PCB |

### D8200

| Part number | Description | Category |
|---|---|---|
| D8200-PCB | PCB - D8205/D8206/D8207/D8208 PCB | WBS-CUSTOM / PCB / d8 |

### D8201A

| Part number | Description | Category |
|---|---|---|
| D8201A-PCB | PCB - D8201A Digital Audio DA PCB | WBS-CUSTOM / PCB / d8 |

### D8202

| Part number | Description | Category |
|---|---|---|
| D8202-BYPS-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |
| D8202-PCB | PCB - AES/EBU Digital-to-Analog Converter PCB | WBS-CUSTOM / PCB |

### D8203

| Part number | Description | Category |
|---|---|---|
| D8203-PCB | PCB - D8203 PCB | WBS-CUSTOM / PCB / d8 |

### D8204A

| Part number | Description | Category |
|---|---|---|
| D8204A-PCB | PCB - D8204A PCB | WBS-CUSTOM / PCB / d8 |

### D8204B

| Part number | Description | Category |
|---|---|---|
| D8204B-PCB | PCB - D8204B PCB | WBS-CUSTOM / PCB / d8 |

### D8204C

| Part number | Description | Category |
|---|---|---|
| D8204C-PCB | PCB - D8204C PCB | WBS-CUSTOM / PCB / d8 |

### DMS1

| Part number | Description | Category |
|---|---|---|
| DMS1-M2-2 | DMS1 0.625 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop |
| DMS1-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| DMS1-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### M3638

| Part number | Description | Category |
|---|---|---|
| M3638 | Nut for Locking Potentiometer 70&73 Series | Hardware / Hardware / nut |

### M6202

| Part number | Description | Category |
|---|---|---|
| CP-86 WE M6202 | White Ejector Handle | Hardware / Hardware / Handle |
| M6202-PCB | PCB - M6202A HDTV Demuxer PCB | WBS-CUSTOM / PCB |

### M6203

| Part number | Description | Category |
|---|---|---|
| CP-86 WE M6203 | White Ejector Handle | Hardware / Hardware / Handle |
| M6203-PCB | PCB - M6203A MD-SDI DA PCB | WBS-CUSTOM / PCB |

### M6204

| Part number | Description | Category |
|---|---|---|
| CP-86 WE M6204 | White Ejector Handle | Hardware / Hardware / Handle |
| M6204-PCB | PCB - M6204A PCB | WBS-CUSTOM / PCB |

### M6205

| Part number | Description | Category |
|---|---|---|
| CP-86 WE M6205 | White Ejector Handle | Hardware / Hardware / Handle |

### M6205A

| Part number | Description | Category |
|---|---|---|
| M6205A-PCB | PCB - M6205A PCB | WBS-CUSTOM / PCB |

### M6206

| Part number | Description | Category |
|---|---|---|
| CP-86 WE M6206 | White Ejector Handle | Hardware / Hardware / Handle |

### M6206A

| Part number | Description | Category |
|---|---|---|
| M6206A-PCB | PCB - M6206A PCB | WBS-CUSTOM / PCB |

### M8204T

| Part number | Description | Category |
|---|---|---|
| M8204T-PCB | PCB - M8204A Termination Assembly PCB | WBS-CUSTOM / PCB |

### M8209

| Part number | Description | Category |
|---|---|---|
| M8209-PCB | PCB - Dual Communications Buffer DA PCB | WBS-CUSTOM / PCB |

### M8251

| Part number | Description | Category |
|---|---|---|
| M8251-PCB | PCB - Analog Video DA PCB | WBS-CUSTOM / PCB |

### MLC8

| Part number | Description | Category |
|---|---|---|
| MLC8-M14 | MLC8 3/16 Hexagonal Brass Standoff .400 | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M15 | MLC8 3/32 Plastic Spacer .093 | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M2 | MLC8 Inner Potentiometer Support Bracket | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M3 | MLC8 Display Lens | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M4 | MLC8 Top Cover | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M5 | MLC8 Bottom Pan | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M7 | MLC8 Left/Right Mounting Wing | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M8 | MLC8 3/16 Hexagonal Brass Standoff .550 | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M9 | MLC8 3/16 Hexagonal Brass Standoff.857 | WBS-CUSTOM / Metal Shop / MLC |
| MLC8-M1 | MLC8A Front Panel | WBS-CUSTOM / Metal Shop / MLC / FRONT |
| MLC8-M11 | MLC8B Front Panel | WBS-CUSTOM / Metal Shop / MLC / FRONT |
| MLC8-M6 | MLC8R Rear Panel | WBS-CUSTOM / Metal Shop / MLC / REAR |
| MLC8-1PCB | PCB - MLC8 Main PCB | WBS-CUSTOM / PCB |
| MLC8-2PCB | PCB - MLC8 LED PCB | WBS-CUSTOM / PCB / LED |
| MLC8-3PCB | PCB - MLC8 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton |

### POD1

| Part number | Description | Category |
|---|---|---|
| POD1-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD1-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD1-PCB1 | PCB - POD1 Main PCB | WBS-CUSTOM / PCB / POD |
| POD1-PCB2 | PCB - POD1 Bal2Unbal PCB-2 | WBS-CUSTOM / PCB / POD |
| POD1-PCB3 | PCB - POD1 Unbal2Bal PCB-3 | WBS-CUSTOM / PCB / POD |

### POD2

| Part number | Description | Category |
|---|---|---|
| POD2-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD2-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD2-PCB | PCB - POD2 Main Assembly PCB | WBS-CUSTOM / PCB / POD |
| POD2-PCB2 | PCB - POD2 Pushbutton Panel PCB | WBS-CUSTOM / PCB / Pushbutton / POD |

### POD2R

| Part number | Description | Category |
|---|---|---|
| POD2R-PLATE | POD2 Remote Blank Plate | WBS-CUSTOM / Metal Shop / POD |

### POD3A

| Part number | Description | Category |
|---|---|---|
| POD3A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD3A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### POD4

| Part number | Description | Category |
|---|---|---|
| POD4-SHIELD | POD4 Shield | WBS-CUSTOM / Metal Shop / POD |
| POD4-FRONT | POD4 Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT |
| POD4-REAR | POD4 Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR |
| POD4-PCB | PCB - POD4 Main Assembly PCB | WBS-CUSTOM / PCB / POD |
| POD4-PCB2 | PCB - POD4 Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |

### POD5

| Part number | Description | Category |
|---|---|---|
| POD5-FRONT | POD5 Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT |
| POD5-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD5-PCB | PCB - POD5 PCB | WBS-CUSTOM / PCB / POD |

### POD6

| Part number | Description | Category |
|---|---|---|
| POD6-001 | Table Mounting Bracket | WBS-CUSTOM / Metal Shop |
| POD6-MTG | Table Mounting Bracket Kit | WBS-CUSTOM / Metal Shop |
| POD6-002 | POD6C Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR |

### POD7

| Part number | Description | Category |
|---|---|---|
| POD7-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD7-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD7-PCB | PCB - POD7 PCB | WBS-CUSTOM / PCB / POD |

### POD8

| Part number | Description | Category |
|---|---|---|
| POD8-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD8-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD8-PCB | PCB - POD8 Main Assembly PCB | WBS-CUSTOM / PCB / POD / d8 |
| POD8-PCB2 | PCB - POD8 Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal / d8 |

### POD8A

| Part number | Description | Category |
|---|---|---|
| POD8A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD8A-REAR-PHX | Rear Panel Terminal Block | WBS-CUSTOM / Metal Shop / REAR |
| POD8A-REAR-QTP | Rear Panel QTP | WBS-CUSTOM / Metal Shop / REAR |
| POD8A-REAR-XLR | Rear Panel XLR | WBS-CUSTOM / Metal Shop / REAR |
| POD8A-1 PCB | PCB - POD8 Main Assembly PCB | WBS-CUSTOM / PCB / POD / d8 |
| POD8A-3 PCB | PCB - POD8A XLR PCB | WBS-CUSTOM / PCB / POD / d8 |
| POD8A-4 PCB | PCB - POD8A QTP PCB | WBS-CUSTOM / PCB / POD / QTP / d8 |
| POD8A-2 PCB | PCB - POD8A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal / d8 |

### POD9

| Part number | Description | Category |
|---|---|---|
| POD9-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD9-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD9-PCB | PCB - POD9 PCB | WBS-CUSTOM / PCB / POD |

### POD10

| Part number | Description | Category |
|---|---|---|
| POD10-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD10/110-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD10-PCB | PCB - POD10 Main Assembly PCB | WBS-CUSTOM / PCB / POD |
| POD10-PCB2 | PCB - POD10 Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |

### POD10A

| Part number | Description | Category |
|---|---|---|
| POD10A-FRONT | Front Panel - AES Switch | WBS-CUSTOM / Metal Shop / FRONT |
| POD10A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD10A-PCB | PCB - POD10A Main PCB | WBS-CUSTOM / PCB / POD |
| POD10A-PCB2 | PCB - POD10A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |

### POD11A

| Part number | Description | Category |
|---|---|---|
| POD11A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD11A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### POD12

| Part number | Description | Category |
|---|---|---|
| POD12-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD12/110-REAR | POD12/110 Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR |
| POD12/75-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD12-PCB | PCB - POD12 Digital DA PCB | WBS-CUSTOM / PCB / POD |

### POD12A

| Part number | Description | Category |
|---|---|---|
| POD12A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD12A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD12A-PCB1 | PCB - POD12A Main PCB | WBS-CUSTOM / PCB / POD |
| POD12A-PCB2 | PCB - POD12A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |

### POD13A

| Part number | Description | Category |
|---|---|---|
| POD13A-M1 | POD13A Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT |
| POD13A-M2 | POD13A Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR |
| POD13A-PCB1 | PCB - POD13A Main PCB | WBS-CUSTOM / PCB / POD |
| POD13A-PCB2 | PCB - POD13A Rear PCB | WBS-CUSTOM / PCB / POD |

### POD14A

| Part number | Description | Category |
|---|---|---|
| POD14A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD14A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD14A-PCB1 | PCB - POD14A Main PCB | WBS-CUSTOM / PCB / POD |
| POD14A-PCB2 | PCB - POD14A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |

### POD14B

| Part number | Description | Category |
|---|---|---|
| POD14B-BRACKET | Mounting Bracket | WBS-CUSTOM / Metal Shop |
| POD14B-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD14B-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### POD15

| Part number | Description | Category |
|---|---|---|
| POD15-PCB | PCB - POD15A 1X6 Analog Video DA W/EQ | WBS-CUSTOM / PCB / POD |

### POD15A

| Part number | Description | Category |
|---|---|---|
| POD15A-FRONT | POD15A Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT |
| POD15A-REAR | POD15A Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR |

### POD16

| Part number | Description | Category |
|---|---|---|
| POD16-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD16-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD16-PCB1 | PCB - POD16 Main Assembly PCB | WBS-CUSTOM / PCB / POD |
| POD16-PCB3 | PCB - POD16 Terminal Block Assembly PCB | WBS-CUSTOM / PCB / POD / Terminal |
| POD16-PCB2 | PCB - POD16 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton / POD |

### POD17

| Part number | Description | Category |
|---|---|---|
| POD17-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD17/110-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD17/75-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD17-PCB | PCB - POD17 Digital Audio DA PCB | WBS-CUSTOM / PCB / POD |

### POD18

| Part number | Description | Category |
|---|---|---|
| POD18-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD18-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### POD22

| Part number | Description | Category |
|---|---|---|
| POD22-M1 | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD22-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD22-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |
| POD22-PCB2 | PCB - Terminal Block PCB | WBS-CUSTOM / PCB / Terminal |

### POD24

| Part number | Description | Category |
|---|---|---|
| POD24-HEATSINK | Heatsink | WBS-CUSTOM / Metal Shop |
| POD24-PLATE | Mounting Plate | WBS-CUSTOM / Metal Shop |
| POD24-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD24-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD24-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |

### POD25

| Part number | Description | Category |
|---|---|---|
| POD25-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD25-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD25-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |
| POD25-PCB2 | PCB - Terminal Block PCB | WBS-CUSTOM / PCB / Terminal |

### POD26

| Part number | Description | Category |
|---|---|---|
| POD26-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD26-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD26-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |

### POD28

| Part number | Description | Category |
|---|---|---|
| POD28-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD28-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD28-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |

### POD29

| Part number | Description | Category |
|---|---|---|
| POD29-M1 | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD29-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### POD29E

| Part number | Description | Category |
|---|---|---|
| POD29E-PLATE | POD29E- PSU mounting Plate | WBS-CUSTOM / Metal Shop / POD |
| POD29E-Rear | POD-29E-Rear Panel - XLR power output +/- 12V | WBS-CUSTOM / Metal Shop / POD / REAR |

### POD29L

| Part number | Description | Category |
|---|---|---|
| POD29L-PLATE | POD29L-PSU mounting plate | WBS-CUSTOM / Metal Shop / POD |
| POD29L-Rear | POD-29E-Rear Panel - XLR power output +/- 24V with Phantom Power | WBS-CUSTOM / Metal Shop / POD / REAR |

### POD29X

| Part number | Description | Category |
|---|---|---|
| POD29X-Rear | POD-29X-Rear Panel - XLR power output | WBS-CUSTOM / Metal Shop / POD / REAR |

### POD30

| Part number | Description | Category |
|---|---|---|
| POD30-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD30-SPACER | Spacer/SA-POD30-PBB | WBS-CUSTOM / Metal Shop / POD |
| POD30-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD30-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |
| POD30-PCB1 | PCB - Pushbutton Board PCB | WBS-CUSTOM / PCB / Pushbutton |

### POD30R

| Part number | Description | Category |
|---|---|---|
| POD30R-PLATE-1 | POD30 Remote Blank Plate | WBS-CUSTOM / Metal Shop / POD |
| POD30R-PLATE-2 | POD30R Remote Alignment Plate | WBS-CUSTOM / Metal Shop / POD |
| POD30R-PLATE-3 | POD30R Remote Securing Slug | WBS-CUSTOM / Metal Shop / POD |

### POD31

| Part number | Description | Category |
|---|---|---|
| POD31-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD31-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD31-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |
| POD31-PCB2 | PCB - POD31 Rear Board PCB | WBS-CUSTOM / PCB / POD |

### POD33

| Part number | Description | Category |
|---|---|---|
| POD33-M3 | Chroma Filter | WBS-CUSTOM / Metal Shop |
| POD33-M1 | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD33-M5 | POD33 Encoder Modification | WBS-CUSTOM / Metal Shop / POD |
| POD33-M4 | POD33 Standoff For Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT |
| POD33-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| POD33-PCB2 | PCB - Display Board PCB | WBS-CUSTOM / PCB |
| POD33-PCB3 | PCB - Rear Board PCB | WBS-CUSTOM / PCB |
| POD33-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |

### POD34

| Part number | Description | Category |
|---|---|---|
| POD34-PLATE | Mounting Plate | WBS-CUSTOM / Metal Shop |
| POD34-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| POD34-SPACER | POD34 Spacer (Use in RMK2 and RMK3 for headphone jack) | WBS-CUSTOM / Metal Shop / POD |
| POD34-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR |

### QTP

| Part number | Description | Category |
|---|---|---|
| QTP-DB25M-PCB | PCB - QTP-DBM25M PCB | WBS-CUSTOM / PCB / QTP |
| QTP-DB25S-PCB | PCB - QTP-DBM25S PCB | WBS-CUSTOM / PCB / QTP |
| QTP-DB25Y PCB | PCB - QTP-DBYMH25 PCB | WBS-CUSTOM / PCB / QTP |

### RTO47

| Part number | Description | Category |
|---|---|---|
| RTO47-FRONT | RTO47 Front Panel | WBS-CUSTOM / Metal Shop / RTO / FRONT |

### RTO214

| Part number | Description | Category |
|---|---|---|
| RTO214-COVER | RTO214 Cover | WBS-CUSTOM / Metal Shop / RTO |
| RTO214-FRONT | RTO214 Front Panel | WBS-CUSTOM / Metal Shop / RTO / FRONT |
| RTO214-REAR | RTO214 Rear Panel | WBS-CUSTOM / Metal Shop / RTO / REAR |

### SLM

| Part number | Description | Category |
|---|---|---|
| SLM-1M1 | Meter Stand | WBS-CUSTOM / Metal Shop |
| SLM-1M11 | Spacer | WBS-CUSTOM / Metal Shop |
| SLM-1M12 | Quad Meter Enclosure | WBS-CUSTOM / Metal Shop |
| SLM-1M13 | Quad Meter Plexi Lens | WBS-CUSTOM / Metal Shop |
| SLM-1M14 | Quad Joiner Plate | WBS-CUSTOM / Metal Shop |
| SLM-1M15 | Custom Standoff | WBS-CUSTOM / Metal Shop |
| SLM-1M16 | Custom Standoff | WBS-CUSTOM / Metal Shop |
| SLM-1M18 | Meter Enclosure | WBS-CUSTOM / Metal Shop |
| SLM-1M2 | Single Meter Enclosure | WBS-CUSTOM / Metal Shop |
| SLM-1M20 | Dual Analog Meter Enclosure | WBS-CUSTOM / Metal Shop |
| SLM-1M3 | Thumbscrew | WBS-CUSTOM / Metal Shop |
| SLM-1M4 | Dual Meter Enclosure | WBS-CUSTOM / Metal Shop |
| SLM-1M5 | Dual Meter Plexi Lens | WBS-CUSTOM / Metal Shop |
| SLM-1M7 | Single Meter Plexi Lens | WBS-CUSTOM / Metal Shop |
| SLM-1M8 | Single Joiner Plate | WBS-CUSTOM / Metal Shop |
| SLM-1M9 | Dual Joiner Plate | WBS-CUSTOM / Metal Shop |

### XTM4

| Part number | Description | Category |
|---|---|---|
| XTM4-M10 | XTM4 Jack Strip Dress Panel | WBS-CUSTOM / Metal Shop |
| XTM4-M11 | XTM4 Bantam Jack Spacer Strip | WBS-CUSTOM / Metal Shop |
| XTM4-M12 | XTM4 Bantam Jack Dress Strip | WBS-CUSTOM / Metal Shop |
| XTM4-M14-2 | XTM4 1.698 Nylon Spacer/Demux | WBS-CUSTOM / Metal Shop |
| XTM4-M15-1 | Sifam Meter Escutcheon | WBS-CUSTOM / Metal Shop |
| XTM4-M15-2 | Sifam Meter Spacer | WBS-CUSTOM / Metal Shop |
| XTM4-M3 | XTM4 Side Panel | WBS-CUSTOM / Metal Shop |
| XTM4-M4 | XTM4 2RU Rack Wing | WBS-CUSTOM / Metal Shop |
| XTM4-M5 | XTM4 Meter Mounting Bracket | WBS-CUSTOM / Metal Shop |
| XTM4-M5-1 | XTM4 Meter Mounting Bracket | WBS-CUSTOM / Metal Shop |
| XTM4-M6 | XTM4 Top PCB Bracket | WBS-CUSTOM / Metal Shop |
| XTM4-M7 | XTM4 Bottom PCB Bracket | WBS-CUSTOM / Metal Shop |
| XTM4-M8 | XTM4 Chroma Filter | WBS-CUSTOM / Metal Shop |
| XTM4-M9 | XTM4 Jack Strip Spacer | WBS-CUSTOM / Metal Shop |
| XTM4-M1 | XTM4 Front Panel | WBS-CUSTOM / Metal Shop / FRONT |
| XTM4-M2 | XTM4 Rear Panel | WBS-CUSTOM / Metal Shop / REAR |
| XTM4-1PCB | PCB - XTM4 Main PCB | WBS-CUSTOM / PCB |
| XTM4-3PCB | PCB - XTM4 Display Driver PCB | WBS-CUSTOM / PCB |
| XTM4-4PCB | PCB - XTM4 Light Bar Assembly PCB | WBS-CUSTOM / PCB |
| XTM4-2PCB | PCB - XTM4 Pushbutton/Display PCB | WBS-CUSTOM / PCB / Pushbutton |
| XTM4-5PCB | PCB - DMS1 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton |

## EuroBlock cross-reference

| WBS part number | Description | Manufacturer part |
|---|---|---|
| EB-FP-8P-5.08 | EuroBlock Female Plug 8 Position 5.08mm Pin Spacing | 3.95300008E8 |
| EB-FP-16P-5.08 | EuroBlock Female Plug 16 Position 5.08mm Pin Spacing | 3.95300016E8 |
| EB-FP-3P-3.81 | EuroBlock Female Plug 3 Position 3.81mm Pin Spacing | 15EDGK-3.81-03P-14-00AH & MC1.5/3-ST-3.81 |
| EB-MH-3P-3.81-RA | EuroBlock Male Header 3 Position 3.81mm Pin Spacing Right Angle | 15EDGRC-3.81-03P-14-00AH & MC1.5/3-G-3.81 |
| EB-MH-3P-3.81 | EuroBlock Male Header 3 Position 3.81mm Pin Spacing | 15EDGVC-3.81-03P-14-00AH & MCV1.5/3-G-3.81 |
| EB-SC-3P-3.81-RA | EuroBlock Spring Cage 3 Position 3.81mm Pin Spacing Right Angle | 277-1418-ND |
| EB-SC-3P-3.81 | EuroBlock Spring Cage 3 Position 3.81mm Pin Spacing | 277-8666-ND |
| EB-MHPM-3P-5.08 | EuroBlock Male Header Panel Mount 3 Position 5.08mm Pin Spacing | DFK-MSTB2.5/3-ST-5.08 |
| EB-FP-9P-3.5 | EuroBlock Female Plug 9 Position 3.5mm Pin Spacing | MC1.5/9-ST-3.5 |
| EB-FP-9P-3.81 | EuroBlock Female Plug 9 Position 3.81mm Pin Spacing | MC1.5/9-ST-3.81 |
| EB-MH-9P-3.5 | EuroBlock Male Header 9 Position 3.5mm Pin Spacing | MCV1.5/9-G-3.5 |
| EB-MH-9P-3.81 | EuroBlock Male Header 9 Position 3.81mm Pin Spacing | MCV1.5/9-G-3.81 |
| EB-FP-3P-5.08 | EuroBlock Female Plug 3 Position 5.08mm Pin Spacing | MSTB2.5/3-ST-5.08 |
| EB-ST-3P-3.5 | EuroBlock Screw Terminal 3 Position 3.5mm Pin Spacing | SMKDS1/3-3.5 |
| EB-ST-9P-3.5 | EuroBlock Screw Terminal 9 Position 3.5mm Pin Spacing | SMKDS1/9-3.5 |

## Inventory count log

_From the `Inventory (Responses).xlsx` scan form (July 2015)._

| Timestamp | Location Scan | Item Scan | Quantity | Project Number / MO | person | UPLOADED |
|---|---|---|---|---|---|---|
| 2015-07-06 18:14 | AC1 | NC3FXX | 5.0 |  | apk | NO |
| 2015-07-06 18:15 | BB3 | QTP-DB25-PCB | 70.0 |  | apk | NO |
| 2015-07-06 18:24 | BB4 | POD22-PCB1 | 61.0 |  | apk | NO |

## Footprints and datasheets

PCB footprints, mechanical drawings and vendor datasheets (copied into `PARTS/Footprints/`; duplicate sub-folders kept as received).

- 1635F _Dunbar_ with Header May 2011.pdf
- **Assman RJ45 Connector** — 24 files: ASSMAN_0574_COrev04.cdr, ASSMAN_0574_COrev04.pdf, ASSMAN_PCB_and_side.dwg, ASSMAN_PCB_and_side_metric.dwg, ASSMAN_PCB_and_side_metric_ACD_0.jpg, ASSMAN_PCB_and_side_metric_ACD_1.jpg, Assman - APK drawn V-Crushed.dxf, Assman - APK drawn V2.dxf, Assman - APK drawn V3 - crushed.dxf, Assman - APK drawn V4.dxf, Assman - APK drawn V5-Crushed new holes .dxf, Assman - APK drawn.dxf
- **CON - BNC - CTP-7BR-1001-L-B** — 2 files: CTP-BR-1001-L-B.pdf, connect tech - CTP-BR-1001-L-B.dxf
- **Custom Neutrik XLR connector Bisexual footprint** — 1 files: Custom Neutrik bisexual connector footprint.dxf
- **Neutrik A - for QTP** — 8 files: Drawing+NC3FAH.dxf, Drawing+NC3FAH.pdf, Drawing+NC3MAH.dxf, Drawing+NC3MAH.pdf, Neutrik A - Combined.dxf, Neutrik A - male and female combined.dxf, QTP - Drawing+NC3FAH-0.pdf, QTP - Drawing+NC3MAH.pdf
- **Power Supplies** — 2 files: Meanwel EPS-15-spec.pdf, grn80m +-12V.pdf
- **TI** — 1 files: TI ina137.pdf
- **Transformer** — 1 files: Schott 61454 - Transformer pad footprint .dxf
- **cosel** — 3 files: Cosel - SUS1R50505.pdf, SFE_SUW.pdf, cosel_SFJ_SUS.pdf

## Full parts list

1907 parts from `Fixing ERP Parts - V3 - 20150828.xlsx` (the August 2015 ERP clean-up). "Old description" is the name before the clean-up.

| Part number | Description | Category | RoHS | Old description | ERP id |
|---|---|---|---|---|---|
| 320-329 | 2X8W at 4Ohm TPA3110 Class-D Audio Amplifier Board | Amplifier |  | 2X8W at 4 Ohm TPA3110 Class-D Audio Amplifier Board | 44033 |
| DTA-120 | Dayton Audio DTA-120 Class T Digital Mini Amplifier 60 WPC | Amplifier |  |  | 216824 |
| LP-2020A+ | Tripath Class-T Hi-Fi Audio Mini Amplifier with Power Supply | Amplifier |  |  | 44711 |
| B1S | Speaker Swan 1" | Audio Products / Speaker | yes | RoHS 1" SWAN SPEAKER | 37497 |
| CE140-30S-8 | Speaker 1" x 5" Extended Range Driver 8 Ohm | Audio Products / Speaker |  | 1" x 5" Extended Range Driver 8 Ohm | 44001 |
| CE32A-8 | Speaker Mini 1-1/4" 8 Ohm | Audio Products / Speaker |  | 1-1/4" Mini Speaker 8 Ohm | 44002 |
| CEP-2250 | Buzzer CUI | Audio Products / Speaker | yes | RoHS CUI BUZZER | 37817 |
| DC3S | Speaker 3.0"  Square Misco | Audio Products / Speaker |  | 3.0" SQUARE MISCO SPEAKER | 37872 |
| EN5F | Speaker 5" PC with Neodymium Magnet | Audio Products / Speaker | yes | RoHS 5" PC W/NEO MAGNET | 41887 |
| RS100T-8 | Speaker - 4" Reference Woofer Truncated Frame | Audio Products / Speaker |  | 4" Reference Woofer Truncated Frame | 217329 |
| TC2X4FB00-08 | Speaker Driver 1.75" x 4" Rectangle 8 Ohm | Audio Products / Speaker |  | 1.75" x 4" Rectangle 8 Ohm Driver | 216971 |
| TC5FB00-08 | Speaker Full Range Driver 1.5" 8 Ohm | Audio Products / Speaker |  | 1.5" 8 Ohm Full Range Driver | 216972 |
| SDT083A3B | Transducer Magnetic Surface Mount | Audio Products / Transformer / SM | yes | RoHS MAGNETIC TRANSDUCER SMT *NOTES* | 40588 |
| PE-65812 | Transformer 6Mb Pulse Surface Mount | Audio Products / Transformer / SM / pulse |  | TRANSFORMER 6Mb PULSE SM | 41478 |
| 61454 | Transformer Digital/Audio pulse Surface Mount | Audio Products / Transformer / SM / pulse / Audio | yes | RoHS SMT TRANSFORMER DIGITAL/AUDIO | 35733 |
| 229B24 | Transformer Hammond | Audio Products / Transformer / TH | yes | RoHS HAMMOND TRANSFORMER | 44023 |
| 108H | Transformer Audio | Audio Products / Transformer / TH / Audio | yes | RoHS AUDIO TRANSFORMER | 34535 |
| 67137640 | Transformer Digital/Audio Pulse Interface | Audio Products / Transformer / TH / pulse / Audio | yes | RoHS TRANSFORMER DIG/AUD INTRFCE | 35753 |
| PE-65612 | Transformer Digital Audio 6Mb Pulse | Audio Products / Transformer / TH / pulse / Audio | yes | RoHS TRANSFORMER 6Mb PULSE | 42929 |
| Arduino | Arduino Uno Kit Base | Development / Development Board |  | Arduino Kit Base | 216830 |
| Arduino-Micro | Arduino Micro | Development / Development Board |  |  | 217489 |
| CY8CKIT-042 | PSoC Application Processor and SOC Kit | Development / Development Board |  |  | 216855 |
| SOCKIT | Arrow SoCKIT evaluation kit | Development / Development Board |  |  | 216829 |
| TPA3124D2EVM | Audio Power Amplifier Evaluation Module | Development / Development Board |  | TPA3124D2EVM | 216819 |
| VM800C35A-D | Credit Card Size VM800C Module with 3.5 inch TFT LCD display Panel installed. | Development / Development Board |  | Credit Card Size VM800C module with 3.5 inch TFT LCD display panel installed. | 216818 |
| VM800C50A-D | Credit Card Size VM800C Module with 5.0 inch TFT LCD display Panel installed. | Development / Development Board |  | Credit Card Size VM800C module with 5.0 inch TFT LCD display panel installed. | 216817 |
| uREC2500-Eval | uREC2500 Evaluation Kit | Development / Development Board |  |  | 216946 |
| 14P | Socket for I/C 14-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 14 PIN | 34564 |
| 14P.ELV | Socket for I/C 14-Pin Elevated | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 14 PIN ELEVATED | 42621 |
| 16P | Socket for I/C 16-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 16 PIN | 35008 |
| 18P | Socket for I/C 18-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 18 PIN | 35032 |
| 20P | Socket for I/C 20-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 20 PIN | 35144 |
| 24P.3 | Socket for I/C 24-Pin .3 Wide | Electromechanical / Chip Socket |  | I/C SOCKET 24 PIN .3 WIDE | 35004 |
| 28P | Socket for I/C 28-Pin .6" Wide | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 28 PIN .6" WIDE | 35047 |
| 28P.3 | Socket for I/C 28-Pin .3" Wide | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 28 PIN .3" WIDE | 35049 |
| 32P | Socket for I/C 32-Pin Surface Mount | Electromechanical / Chip Socket | yes | RoHS SMT SOCKET 32 PIN | 35175 |
| 40P | Socket for I/C 40-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 40 PIN | 36446 |
| 44P | Socket for I/C 44-Pin Square PLC | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 44 PIN SQUARE PLC | 36451 |
| 84P | Socket for I/C 84-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 84 PIN | 37147 |
| 8P | Socket for I/C 8-Pin | Electromechanical / Chip Socket | yes | RoHS I/C SOCKET 8 PIN | 37156 |
| A725-ND | Connector Socket Adapter | Electromechanical / Connector / Adapter / Socket |  | SOCKET ADAPTER | 42704 |
| A726-ND | Connector Socket Adapter | Electromechanical / Connector / Adapter / Socket |  | SOCKET ADAPTER | 37185 |
| A733-ND | Connector Socket Adapter | Electromechanical / Connector / Adapter / Socket |  | SOCKET ADAPTER | 42705 |
| 1075T | Connector BNC 75 Ohm Terminator Plug +/- 1.0% | Electromechanical / Connector / BNC |  | BNC 75 OHM +/- 1.0% TERMINATOR PLUG | 34534 |
| 1094 | Connector BNC Receptacle Chassis Mount | Electromechanical / Connector / BNC | yes | RoHS CHASSIS MOUNT BNC RECEPTACLE | 34536 |
| 227726-3 | Connector BNC Chassis Mount Insulated | Electromechanical / Connector / BNC | yes | RoHS CONN BNC CHASSIS MT INSULATED | 35191 |
| 31-5329-72RFX | Connector BNC 75 Ohm PCB Mount | Electromechanical / Connector / BNC | yes | RoHS 75 OHM BNC PC MOUNT | 35152 |
| BCJ-FPC02 | Connector BNC 75 Ohm PC Mount Front | Electromechanical / Connector / BNC | yes | RoHS 75 OHM BNC PC MOUNT FRONT | 37502 |
| BNC-OG | Connector BNC 75 Ohm PCB Mount | Electromechanical / Connector / BNC | yes | RoHS 75 OHM BNC STRAIGHT PCB  MOUNT | 37508 |
| BNC-CE1G-CTP | Connector BNC Edge Mount Up to 1GHz | Electromechanical / Connector / BNC / Edge |  | BNC EDGE MOUNT UP TO 1GHZ (NOTES) | 37507 |
| BNC-CE3G | Connector BNC 75 Ohm PCB Edge Mount | Electromechanical / Connector / BNC / Edge | yes | RoHS 75 OHM BNC PCB EDGE MOUNT | 42757 |
| BCJ-FPLV01-P | Connector BNC 75 Ohm Right Angle PC | Electromechanical / Connector / BNC / Right Angle | yes | RoHS 75 OHM BNC RIGHT ANGLE PC | 37503 |
| 65846-010 | Connector 10-Position Cable Mini Polar crimp | Electromechanical / Connector / Crimp | yes | RoHS CONN 10P CABLE MINI POLAR | 35748 |
| XS09723S | Connector Terminal .250 Quick Disconnect crimp | Electromechanical / Connector / Crimp | yes | RoHS TERMINAL .250 QUICK DISCONNECT | 40456 |
| 302A11249X | Connector D-Sub 9 Position Female Right Angle PCB Mount | Electromechanical / Connector / D-sub / Right Angle / Female / Male | yes | RoHS MountCONN R/A PCB DE9S | 35131 |
| 302A11269X | Connector D-Sub 25 Position Female Right Angle PCB Mount | Electromechanical / Connector / D-sub / Right Angle / Female / Male | yes | RoHS MountCONN R/A PCB DB25S | 35133 |
| 301A10939X | Connector D-Sub 9 Position Male Right Angle PCB Mount | Electromechanical / Connector / D-sub / Right Angle / Male | yes | RoHS MountCONN R/A PCB DE9P | 44022 |
| 301A10959X | Connector D-Sub 25 Position Male Right Angle PCB Mount | Electromechanical / Connector / D-sub / Right Angle / Male | yes | RoHS MountCONN R/A PCB DB25P | 35129 |
| DSUB-37-FEMALE | Connector D-Sub 37-Position Female Chassis Mount Solder Cup | Electromechanical / Connector / D-sub / Solder cup / Female / Male | yes | RoHS CONN D-SUB RCPT 37POS GOLD FLASH | 217241 |
| FDB25S | Connector D-Sub 25-Position Female Chassis Mount Solder Cup | Electromechanical / Connector / D-sub / Solder cup / Female / Male | yes | RoHS CONN 25S D SUB CHASSIS | 41906 |
| FDE9S | Connector D-Sub 9-Position Female Chassis Mount Solder Cup | Electromechanical / Connector / D-sub / Solder cup / Female / Male | yes | RoHS CONN 9S D SUB CHASSIS | 41909 |
| DSUB-37-MALE | Connector D-Sub 37-Position Male Chassis Mount Solder Cup | Electromechanical / Connector / D-sub / Solder cup / Male | yes | RoHS CONN D-SUB PLUG 37POS GOLD FLASH | 217247 |
| FDE9P | Connector D-Sub 9-Position Male Chassis Mount Solder Cup | Electromechanical / Connector / D-sub / Solder cup / Male | yes | RoHS CONN 9P D SUB CHASSIS | 41908 |
| AE10980-ND | Connector D-Sub 25-Position Male Right Angle Solder Cup | Electromechanical / Connector / D-sub / Solder cup / Right Angle / Male |  | CONN D-SUB PLUG 25POS R/A SOLDER | 217336 |
| 307-30-20-01 | Connector 30-Position PCB Tabs No Lugs Edac | Electromechanical / Connector / EDAC | yes | RoHS CONN 30P PCB TABS NO LUGS | 35137 |
| 307-24-20-01 | Connector 24-Position Card Edge PCB Tabs No Lugs edac | Electromechanical / Connector / Edge / EDAC | yes | RoHS CONN 24S PCB TABS NO LUGS | 35135 |
| 345-020-520-201 | Connector 20-Position Edge Connector Edac | Electromechanical / Connector / Edge / EDAC | yes | RoHS CONN 20P  EDAC | 36410 |
| 346-056-520-808 | Connector 56-position  Edge Connector Edac | Electromechanical / Connector / Edge / EDAC |  | Edac Connector 56 Pin | 44017 |
| HSEC8-110-01-S-DV-A | Connector 2X10-Pin Surface Mount High Speed Card Edge openGear Backplane | Electromechanical / Connector / Edge / Pin / Surface | yes | RoHS CONN 2X10 PIN SMT | 41962 |
| MEC1-150-02-L-D-A | Connector 100-Pin Surface Mount Card Edge openGear Rear Module | Electromechanical / Connector / Edge / Pin / Surface | yes | RoHS CONN 100 PIN SMT | 41388 |
| 3385-6600 | Connector 14-Position 7X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN 7X2 14S Polarized Flat Cable Header 3M SOCKET | 36404 |
| 3414-6600 | Connector 34-Position 17X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN 17X2 34S POLARIZED SOCKET | 36408 |
| 3421-6600 | Connector 20-Position 10X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN 10X2 20S POLARIZED SOCKET | 36409 |
| 3452-6600 | Connector 16-Position 8X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN 8X2 16S POLARIZED 3M SOCKET | 36411 |
| 3473-6600 | Connector 10-Position 5X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN 5X2 10S POLARIZED 3M SOCKET | 36412 |
| 609-3142-ND | Connector 12-Position 6X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN IDC SOCKET 12POS 2MM GOLD | 44008 |
| PE0506SA100 | Connector 6-Position 3X2 Female Polarized Flat Cable wire Socket | Electromechanical / Connector / Flat Cable / Socket / Female / Male | yes | RoHS CONN 3X2 6S POLARIZED SOCKET | 217485 |
| 7-382483-2 | Connector 72-Pin Right Angle SIMM II Memory Connectors - Inline Module Sockets- crimp | Electromechanical / Connector / Inline / Socket / Pin / Right Angle / Crimp | yes | RoHS CONNECTOR 72 PIN RA SIMM II | 35774 |
| MLAS-100-2 | Connector 2-Position Male  Mas-Con  Right Angle Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Right Angle / locking / Male | yes | RoHS CONN 2 POS HEADER R/A POST | 217289 |
| MLAS-100-3 | Connector 3-Position Male  Mas-Con  Right Angle Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Right Angle / locking / Male | yes | RoHS CONN 3 POS HEADER R/A POST | 41414 |
| MLAS-100-5 | Connector 5-Position Male  Mas-Con  Right Angle Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Right Angle / locking / Male | yes | RoHS CONN 5 POS HEADER R/A POST | 41415 |
| MLAS-100-6 | Connector 6-Position Male  Mas-Con  Right Angle Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Right Angle / locking / Male |  | CONN 6 POS HEADER R/A POST | 41416 |
| MLAS-100-9 | Connector 9-Position Male  Mas-Con  Right Angle Locking    0.1" Spacing | Electromechanical / Connector / Mas-con / Right Angle / locking / Male | yes | RoHS CONN 9 POS HEADER R/A POST | 42923 |
| CE100F22-2 | Connector End 2-Position 0.1" 2.54mm 22GA Female Socket - Mas-Con CONNECTOR - crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 2 POS END PANCON 22GA | 216987 |
| CE100F22-3 | Connector End 3-Position 0.1" 2.54mm  22GA Female Socket - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 3 POS END PANCON 22GA | 37804 |
| CE100F22-4 | Connector End 4-Position 0.1" 2.54mm 22GA Female Socket  - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 4 POS END PANCON 22GA | 216988 |
| CE100F22-5 | Connector End 5-Position 0.1" 2.54mm 22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 5 POS END PANCON 22GA | 37805 |
| CE100F22-9 | Connector End 9-Position 0.1" 2.54mm 22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 9 POS END PANCON 22GA | 37806 |
| CE100F26-10 | Connector End 10-Position  0.1" 2.54mm  26GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 10 POS END PANCON 26GA | 37807 |
| CE100F26-3 | Connector End 3-Position 0.1" 2.54mm  26GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 3 POS END PANCON 26GA | 37808 |
| CE100F26-4 | Connector End 4-Position  0.1" 2.54mm 26GA Female Socket    - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 4 POS END PANCON 26GA | 216991 |
| CE100F26-5 | Connector End 5-Position  0.1" 2.54mm 26GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 5 POS END PANCON 26GA | 37809 |
| CE100F26-6 | Connector End 6-Position  0.1" 2.54mm 26GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 6 POS END PANCON 26GA | 37810 |
| CE100F26-9 | Connector End 9-Position 0.1" 2.54mm  26GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 9 POS END PANCON 26GA | 37811 |
| CE156F22-2 | Connector End 2-Position 0.156" 3.96mm 22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 2 POS END PANCON | 37812 |
| CE156F22-3 | Connector End 3-Position 0.156" 3.96mm  22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 3 POS END PANCON | 37813 |
| CE156F22-4 | Connector End 4-Position 0.156" 3.96mm  22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 4 POS END PANCON | 37814 |
| CE156F22-5 | Connector End 5-Position 0.156" 3.96mm  22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 5 POS END PANCON | 37815 |
| CE156F22-6 | Connector End 6-Position 0.156" 3.96mm  22GA Female Socket   - Mas-Con CONNECTOR- crimp | Electromechanical / Connector / Mas-con / Socket / Crimp / Female / Male | yes | RoHS CONN 6 POS END PANCON | 37816 |
| MLSS-100-10 | Connector 10-Position Male Mas-Con Straight Locking  0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 10 POS PANCON STR. POST | 42927 |
| MLSS-100-2 | Connector 2-Position Male  Mas-Con  Straight Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 2 POS PANCON STR. POST | 41433 |
| MLSS-100-3 | Connector 3-Position Male  Mas-Con  Straight Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 3 POS PANCON STR. POST | 41434 |
| MLSS-100-4 | Connector 4-Position Male  Mas-Con  Straight Locking    0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 4 POS PANCON STR. POST | 41435 |
| MLSS-100-5 | Connector 5-Position Male  Mas-Con  Straight Locking    0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 5 POS PANCON STR. POST | 41436 |
| MLSS-100-6 | Connector 6-Position Male  Mas-Con  Straight Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 6 POS PANCON STR. POST | 41437 |
| MLSS-100-9 | Connector 9-Position Male  Mas-Con  Straight Locking   0.1" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 9 POS PANCON STR. POST | 41438 |
| MLSS-156-2 | Connector 2-Position Male  Mas-Con  Straight Locking    0.156" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 2 POS PANCON STR. POST | 41439 |
| MLSS-156-3 | Connector 3-Position Male  Mas-Con  Straight Locking   0.156" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 3 POS PANCON STR. POST | 41440 |
| MLSS-156-4 | Connector 4-Position Male  Mas-Con  Straight Locking  0.156" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 4 POS PANCON STR. POST | 41441 |
| MLSS-156-5 | Connector 5-Position Male  Mas-Con  Straight Locking  0.156" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 5 POS PANCON STR. POST | 41442 |
| MLSS-156-6 | Connector 6-Position Male  Mas-Con  Straight Locking  0.156" Spacing | Electromechanical / Connector / Mas-con / Straight / locking / Male | yes | RoHS CONN 6 POS PANCON STR. POST | 41443 |
| 090-317 | Jack 3.5mm TRS Threaded phone | Electromechanical / Connector / Phone | yes | RoHS JACK 3.5MM TRS THREADED | 34512 |
| N114B | Jack Audio 1/4" phone plastic threared with nut | Electromechanical / Connector / Phone | yes | RoHS AUDIO JACK | 41452 |
| NP2X | Connector 2-pole 1/4" professional phone plug nickel contacts nickel shell Neutrik Make | Electromechanical / Connector / Phone |  | Neutrik Connector 1/4" professional phone plug 2 pole nickel contacts nickel shell | 217271 |
| NRJ6HH | Connector 1/4" stereo phone jack Switched, half threaded nose Neutrik | Electromechanical / Connector / Phone |  | Neutrik Connector 1/4" stereo jack switched, half threaded nose | 217330 |
| PJ339 | Jack Phone Long frame Solder Eyes | Electromechanical / Connector / Phone |  | ADC Phone Jack | 41188 |
| PJ839 | Jack Bantam Phone panel mounted | Electromechanical / Connector / Phone |  | ADC Bantam Jack | 216805 |
| RA49B14B | Jack 1/4" TRS/TN/RN Threaded phone | Electromechanical / Connector / Phone | yes | RoHS JACK 1/4" TRS/TN/RN THREADED | 40853 |
| NP3X | Connector 3-pole 1/4" professional phone plug nickel contacts nickel shell Neutrik Male | Electromechanical / Connector / Phone / Male |  | Neutrik Connector 3 pole 1/4" professional phone plug nickel contacts nickel shell | 217272 |
| TM2REA-0606 | Jack Telephone 6-Position Right Angle phone | Electromechanical / Connector / Phone / Right Angle |  | RA TELEPHONE JACK 6 POSITION | 40423 |
| CTP-35009-SMT | Jack Stereo 3.5mm phone with Tip and Ring Switches Surface Mount | Electromechanical / Connector / Phone / Surface |  | 3.5MM STEREO JACK WITH TIP AND RING SWITCHES SMT TYPE | 217312 |
| 723W-X2/02 | Connector Power Inlet with Fuseholder AC - IEC connector | Electromechanical / Connector / Power | yes | RoHS POWER INLET/FUSEHOLDER AC | 35780 |
| PJ-005A | Connector Power Jack 2.1 x 5.5mm Panel Mounting - Solder eyelet - nut | Electromechanical / Connector / Power | yes | RoHS CONN PWR JACK 2.1X5.5MM PNL MTG | 41186 |
| PJ-006A | Connector Power Jack 2.1 x 5.5mm PCB Right Angle - | Electromechanical / Connector / Power / Right Angle |  | CONN PWR JACK 2.1X5.5MM VERT | 41187 |
| RCJ-031 | Connector RCA Black Audio Jack | Electromechanical / Connector / RCA | yes | RoHS RCA BLACK AUDIO JACK | 216956 |
| RCJ-032 | Connector RCA Red Audio Jack | Electromechanical / Connector / RCA | yes | RoHS RCA RED AUDIO JACK | 216969 |
| RCJ-033 | Connector RCA White Audio Jack | Electromechanical / Connector / RCA | yes | RoHS RCA WHITE AUDIO JACK | 216970 |
| 04P0605 | Quad RCA Silver-Plated PCB mount Right Angle | Electromechanical / Connector / RCA / Right Angle |  | SOCKET QUAD RCA SILVER PLATED | 34511 |
| RJ45 | Connector Modular RJ45 PCB Mount | Electromechanical / Connector / RJ45 |  | RJ45 Modular Connector PCB Mount | 217545 |
| 950432891 | Connector RJ45 Plug 8-Position 1.02mm Pitch Crimp Termination inline Cable Mount 8 Terminal + 1 Port Cat 5 | Electromechanical / Connector / RJ45 / Inline / Crimp | yes | RoHS Conn RJ-45 PL 8 POS 1.02mm Crimp ST Cable Mount 8 Terminal 1 Port Bag Cat 5 | 217251 |
| RJ45 R/A | Connector Modular RJ45 Right Angle PCB Mount | Electromechanical / Connector / RJ45 / Right Angle |  | RJ45 Modular Connector R/A PCB Mount | 217346 |
| 10118194 | Connector USB MICRO B Receptacle Surface Mount Right Angle | Electromechanical / Connector / Right Angle / Surface |  | CONN USB MICRO B RECPT SMT R/A | 217311 |
| ZF1-30-01-T-WT | Connector 30-Position Horizontal Surface Mount Flexible Ribbon socket | Electromechanical / Connector / Socket / Surface | yes | RoHS CONN 30P HORIZONTAL SMT | 40473 |
| ZF1-30-03-T-WT | Connector 30-Position Vertical Surface Mount  Flexible Ribbon socket | Electromechanical / Connector / Socket / Surface | yes | RoHS CONN 30P VERTICAL SMT | 40474 |
| DFK-MSTB2.5/3-ST-5.08 | Terminal Block Vertical 3-Position 5.08mm - panel mount | Electromechanical / Connector / Terminal Block | yes | RoHS VERT HEADER 3 PIN | 37876 |
| MSTB2.5/3-ST-5.08 | Terminal Block 3-Position - 5.08mm | Electromechanical / Connector / Terminal Block |  | PHOENIX TERM BLOCK 3 PIN | 41450 |
| SMKDS1/3-3.5 | Terminal Block 3-way  - 3.5mm - PCB mounted screw terminal | Electromechanical / Connector / Terminal Block | yes | RoHS TERM BLOCK 3 WAY PHOENIX | 40633 |
| SMKDS1/9-3.5 | Terminal Block 9-way  - 3.5mm - Through Hole screw termination | Electromechanical / Connector / Terminal Block | yes | RoHS TERM BLOCK 9 WAY PHOENIX | 40634 |
| 1829358 | Terminal Block DFK-MC 1,5/ 3-GF-3.81 - Chassis mounted Solder eyelet | Electromechanical / Connector / Terminal Block / 3.81 |  | DFK-MC 1,5/ 3-GF-3,81 | 217306 |
| 277-1418-ND | Terminal Block 3.81MM - Spring Lock 3 position - | Electromechanical / Connector / Terminal Block / 3.81 | yes | RoHSTERM BLOCK 3.81MM | 44009 |
| 277-8666-ND | Terminal Block 3.81MM PCB - SPRING LOADED 45 degrees | Electromechanical / Connector / Terminal Block / 3.81 | yes | RoHS TERM BLOCK 3.81MM | 44010 |
| MCV1.5/3-G-3.81 | Terminal Block Vertical 3-Position - 3.81mm male PCB Vertical | Electromechanical / Connector / Terminal Block / 3.81 / Male | yes | RoHS VERT HEADER 3 PIN | 41384 |
| MCV1.5/9-G-3.81 | Terminal Block Vertical 9-Position  - 3.81mm Male PCB Through Hole | Electromechanical / Connector / Terminal Block / 3.81 / Male | yes | RoHS VERT HEADER 9 PIN | 41385 |
| MCV1.5/9-G-3.5 | Terminal Block Vertical 9-Position  - 3.81mm Right Angle | Electromechanical / Connector / Terminal Block / 3.81 / Right Angle | yes | RoHS VERT HEADER 9 PIN | 43730 |
| MC1.5/3-G-3.81 | Terminal Block  Right Angle PCB Through hole 3-Position 3.81mm Male | Electromechanical / Connector / Terminal Block / 3.81 / Right Angle / Male | yes | RoHS RIGHT ANGLE HEADER 3 PIN | 42922 |
| MC1.5/3-ST-3.81 | Terminal Block 3-Position 3.81mm - inline female | Electromechanical / Connector / Terminal Block / Inline / 3.81 / Female / Male | yes | RoHS TERM BLOCK 3 PIN | 41674 |
| MC1.5/9-ST-3.81 | Terminal Block 9-Position 3.81mm - Inline  female | Electromechanical / Connector / Terminal Block / Inline / 3.81 / Female / Male | yes | RoHS TERMINAL BLOCK 9 PIN | 41675 |
| MC1.5/9-ST-3.5 | Terminal Block 9-Position 3.5 inline female | Electromechanical / Connector / Terminal Block / Inline / Female / Male | yes | RoHS TERMINAL BLOCK 9 PIN | 43729 |
| 395300016 | Connector Screw Right Angle Cable Mount Terminal Block F 16 POS 5.08mm  inline | Electromechanical / Connector / Terminal Block / Inline / Right Angle | yes | RoHS Conn Eurostyle Block F 16 POS 5.08mm Screw RA Cable Mount | 217250 |
| 395300008 | OBSOLETE - Connector Screw Right Angle Cable Mount Terminal Block F 8 POS 5.08mm | Electromechanical / Connector / Terminal Block / Right Angle | yes | RoHS Conn Eurostyle Block F 8 POS 5.08mm Screw RA Cable Mount | 217249 |
| 20020006-H081B01LF | Terminal Block Female Sockets 8POS 5.08mm Screw Right Angle Cable Mount 12A/Contact Box | Electromechanical / Connector / Terminal Block / Socket / Right Angle / Female / Male | yes | RoHS Conn Terminal Block F 8 POS 5.08mm Screw RA Cable Mount 12A/Contact Box | 217248 |
| NC3FAH1 | Connector NC3FAH1 3-Pole Female XLR Panel THT Neutrik - Plastic | Electromechanical / Connector / XLR / Female / Male |  | NEUTRIK  NC3FAH1  Connector XLR PANEL THT 3WAY | 217368 |
| NC3FD-H | Connector 3 pole Female receptacle XLR Horizontal PCB Mount Nickel housing silver contacts Neutrik | Electromechanical / Connector / XLR / Female / Male |  | Neutrik XLR Connector 3 pole female receptacle horizontal PCB mount Nickel housing silver contacts | 41453 |
| NCJ6FI-S | Connector XLR/TRS Combo 3S Chassis Mounting Female | Electromechanical / Connector / XLR / Female / Male |  | CONN 3S CHASSIS MTG FEMALE | 43737 |
| QG3F | Connector XLR Insert Female Switchcraft - no shell | Electromechanical / Connector / XLR / Female / Male | yes | RoHS SWITCHCRAFT XLR INS FEMALE | 41030 |
| NC3FXX | Connector 3-pole Female for cable XLR with Nickel housing and silver contacts Neutrik inline | Electromechanical / Connector / XLR / Inline / Female / Male |  | Neutrik XLR Connector 3 pole female cable connector with Nickel housing and silver contacts | 217274 |
| NC5FXX | Connector NC5FXX 5-Pole Female XLR Inline Neutrik | Electromechanical / Connector / XLR / Inline / Female / Male |  | NC5FXX - Neutrik 5 pin inline connector | 217447 |
| NC3MXX | Connector 3-pole Male for cable XLR with Nickel housing and silver contacts Neutrik inline | Electromechanical / Connector / XLR / Inline / Male |  | Neutrik XLR Connector 3 pole male cable connector with Nickel housing and silver contacts | 217273 |
| NC5MXX | Connector 5-pole XLR Male for cable with Nickel housing and silver contacts Neutrik inline | Electromechanical / Connector / XLR / Inline / Male |  | 5 pole male cable connector with Nickel housing and silver contacts. | 216804 |
| NC3MAH | Connector 3-pole Male XLR receptacle Plug THT Neutrik | Electromechanical / Connector / XLR / Male |  | NEUTRIK  NC3MAH  Connector XLR PLUG THT 3WAY | 217369 |
| NC3MD-H | Connector 3-pole Male receptacle XLR Horizontal PCB Mount Nickel housing silver contacts Neutrik | Electromechanical / Connector / XLR / Male |  | Neutrik XLR Connector 3 pole male receptacle horizontal PCB mount Nickel housing silver contacts | 41455 |
| QG3M | Connector XLR Insert Male Switchcraft - no shell | Electromechanical / Connector / XLR / Male | yes | RoHS SWITCHCRAFT XLR INSERT MALE | 41031 |
| XLR7-32 | Connector 7-Position XLR Chassis Mount Male | Electromechanical / Connector / XLR / Male |  | CONN 7P CHASSIS MOUNT MALE | 43965 |
| NC3FD-L-1 | Connector 3-pole Female receptacle XLR solder cups Nickel housing silver contacts Neutrik | Electromechanical / Connector / XLR / Solder cup / Female / Male |  | Neutrik XLR Connector 3 pole female receptacle solder cups Nickel housing silver contacts | 41454 |
| NC5FD-L-1 | Connector 5-pole Female receptacle XLR solder cups Nickel housing silver contacts Universal D-size metal body Neutrik | Electromechanical / Connector / XLR / Solder cup / Female / Male |  | 5 pole female receptacle solder cups Nickel housing silver contacts Universal D-size metal body XLR panel mount series. | 216803 |
| XLR7-31 | Connector 7-Position Chassis Mount xlr Female solder cup | Electromechanical / Connector / XLR / Solder cup / Female / Male |  | CONN 7S CHASSIS MOUNT FEMALE | 43964 |
| NC3MD-L-1 | Connector 3-pole Male XLR Panel Mounting 3 pole male receptacle, solder cup, Nickel housing, silver contacts | Electromechanical / Connector / XLR / Solder cup / Male | yes | RoHS CONN 3P XLR3-M PANEL MTG | 41456 |
| 091-1160 | Jack Banana Gold-Plated Set of Two post | Electromechanical / Connector / banana / post |  | Gold Plated Banana Jack Pair | 217303 |
| 2514-6002UB | Connector 14-Position 7X2 Male Polarized Flat Cable Header Shrouded | Electromechanical / Connector / header / Flat Cable / Male | yes | RoHS CONN 14P 7X2 MALE Polarized Flat Cable Header | 35005 |
| 2516-6002UB | Connector 16-Position 8X2 Male Polarized Flat Cable Header Shrouded | Electromechanical / Connector / header / Flat Cable / Male | yes | RoHS CONN 16P 8X2 MALE Polarized Flat Cable Header | 35007 |
| 2520-6002UB | Connector 20-Position 10X2 Male Polarized Flat Cable Header Shrouded | Electromechanical / Connector / header / Flat Cable / Male | yes | RoHS CONN 20P 10X2 MALE Polarized Flat Cable Header | 35009 |
| 2534-6002UB | Connector 34-Position 17X2 Male Polarized Flat Cable Header Shrouded | Electromechanical / Connector / header / Flat Cable / Male | yes | RoHS CONN 34P 17X2 MALE Polarized Flat Cable Header | 35011 |
| PG21062V100 | Connector 6P 3X2 Male Polarized Flat Cable Header | Electromechanical / Connector / header / Flat Cable / Male | yes | RoHS CONN 6P 3X2 MALE Polarized Flat Cable Header | 217478 |
| 65645-104 | Connector 4-Position 1X4 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 4P Male Header | 35742 |
| 65645-106 | Connector 6-Position 1X6 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 6P Male Header | 44757 |
| 65645-120 | Connector 20-Position 1X20 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 20P BERGSTICK | 35743 |
| 65645-202 | Connector 2-Position 1X2 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 2P PCB MTG BERG | 35744 |
| 929665-01-07 | Connector 14-Position 7X2 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 14P 7X2 Male Header | 37163 |
| 929665-01-10 | Connector 20-Position 2X10 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 20P 2X10 Male Header | 43544 |
| 929665-01-5 | Connector 10-Position 5X2 Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 10P 5X2 Male Header | 37164 |
| 929705-01-03 | Connector 3-Position PCB Mount Male Header | Electromechanical / Connector / header / Male | yes | RoHS CONN 3P PCB MT MALE HEADER | 37167 |
| 929955-06 | Connector 2-Position Header male Jumper | Electromechanical / Connector / header / Male | yes | RoHS CONN 2P APTRONICS JUMPER | 37171 |
| ESQ-106-33-L-S | Connector 6-Position male 1X6 header raised - Double Spacer - | Electromechanical / Connector / header / Male | yes | RoHS CONNECTOR 6P FEMALE 1X6 | 44735 |
| ZW0310GD470100 | Connector 6-Position 2X3 Gold Header Male - Double Spacer - Long | Electromechanical / Connector / header / Male | yes | RoHS CONNECTOR 3P GOLD DOUBLE ROW | 40477 |
| TSM-103-01-SDV | Connector 6-Position 3X2 Male Surface Mount Header- Length 0.230" | Electromechanical / Connector / header / Male / Surface | yes | RoHS CONN 3X2 PIN MALE SMT | 40433 |
| TSM-104-01-SDV | Connector 8-Position 4X2 Male Surface Mount Header- Length 0.230" | Electromechanical / Connector / header / Male / Surface | yes | RoHS CONN 4X2 PIN MALE SMT | 40434 |
| TSM-105-01-SDV | Connector 10-Position 5X2 Male Surface Mount Header- Length 0.230" | Electromechanical / Connector / header / Male / Surface | yes | RoHS CONN 5X2 PIN MALE SMT | 40435 |
| TSM-107-01-SDV | Connector 14-Position 7X2 Male Surface Mount Header- Length 0.230" | Electromechanical / Connector / header / Male / Surface | yes | RoHS CONN 7X2 PIN MALE SMT | 40436 |
| TSM-110-01-SDV | Connector 20-Position 10X2 Male Surface Mount Header - Length 0.230" | Electromechanical / Connector / header / Male / Surface | yes | RoHS CONN 10X2 PIN MALE SMT | 40437 |
| TSM-110-03-SDV | Connector 20-Position 10X2 Male Surface Mount Header - Length 0.420" | Electromechanical / Connector / header / Male / Surface | yes | RoHS CONN 10X2 PIN MALE SMT | 40438 |
| PV-47712 | Connector Pin - Mini PV Receptacle Header pin crimp | Electromechanical / Connector / header / Pin / Crimp | yes | RoHS CONN PIN MINI PV BERG | 41027 |
| 65624-110 | Connector 10-Position Male Header Right Angle PCB Mounting | Electromechanical / Connector / header / Right Angle / Male | yes | RoHS CONN 10P PCB MTG R/A Male Header | 35741 |
| 929667-01-03 | Connector 6-Position 3X2 Right Angle Male Header | Electromechanical / Connector / header / Right Angle / Male | yes | RoHS CONN 6P 3X2 RT ANGLE MALE | 37165 |
| 929667-04-08 | Connector 16-Position 2X8 Right Angle Male Header | Electromechanical / Connector / header / Right Angle / Male | yes | RoHS CONN 16P 2X8 RA MALE | 37166 |
| 929745-04-07 | Connector 14-Position 2X7 Right Angle Male Header | Electromechanical / Connector / header / Right Angle / Male | yes | RoHS CONN 14P 2X7 RA MALE | 37168 |
| 65780-006 | Connector 6-Position 1X6 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 6S SINGLE Female Header Socket | 35745 |
| 65780-012 | Connector 12-Position 1X12 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 12S SINGLE Female Header Socket | 35746 |
| 65780-020 | Connector 20-Position 1X20 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 20S SINGLE Female Header Socket | 35747 |
| 929852-01-05 | Connector 10-Position 2X5 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 10S 2X5 FEMALE | 37169 |
| 929852-01-07 | Connector 14-Position 2X7 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 14S 2X7 FEMALE APTRON | 37170 |
| SSA-106-S-G | Connector 6-Position 1X6 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS 6S SOCKET STRIP | 40643 |
| SSW-102-06-GS | Connector 2-Position 1X2 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 2S SINGLE Female Header Socket | 40648 |
| SSW-103-06-G-D | Connector 3-Position 2X3 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 3S DOUBLE ROW SOCKET | 40649 |
| SSW-103-06-G-S | Connector 3-Position 1X3 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 3S SINGLE ROW SOCKET | 40650 |
| SSW-105-02-G-D | Connector 5-Position Gold 2X5 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 5S GOLD DBL ROW SOCKET | 40651 |
| SSW-110-02-G-D | Connector 10-Position Gold 2X10 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 10S GOLD DBL ROW SOCKET | 40652 |
| SSW-110-03-G-D | Connector 10-Position Gold 2X10 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 10S GOLD DBL ROW SOCKET | 40653 |
| SSW-122-06-G-S | Connector 22-Position 1X22 Female Header Socket | Electromechanical / Connector / header / Socket / Female / Male | yes | RoHS CONN 22S SINGLE ROW SOCKET | 40654 |
| HLE-105-02-SM-DV-P | Connector 10-Position 2X5 Female Surface Mount Header Socket | Electromechanical / Connector / header / Socket / Female / Male / Surface | yes | RoHS CONN 2X5 PIN SMT *note* | 41957 |
| HLE-107-02-SM-DV-P | Connector 14-Position 2X7 Female Surface Mount Header Socket | Electromechanical / Connector / header / Socket / Female / Male / Surface | yes | RoHS CONN 2X7 PIN SMT | 41958 |
| TSW-102-07-G-S | Post Head Connector 2-Position Male 1X2 Header - Length: 0.230" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 2P MALE 1X2 | 216885 |
| TSW-102-07-L-D | Post Head Connector 4-Position 2X2 Male Header - Length: 0.230" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 4P MALE 2X2 | 40439 |
| TSW-102-15-G-S | Post Head Connector 2-Position 1X2 Male Header - Length: 0.520" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 2P MALE 1X2 | 40440 |
| TSW-103-14-L-D | Post Head Connector 6-Position 2X3 Male Header - Length: 0.320" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 6P MALE 2X3 | 40441 |
| TSW-103-15-G-S | Post Head Connector 3-Position 1X3 Male Header - Length: 0.520" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 3P BERGSTICK | 40442 |
| TSW-104-07-L-D | Post Head Connector 8-Position 2X4 Male Header - Length: 0.230" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 8P MALE 2X4 | 40444 |
| TSW-104-15-G-D | Post Head Connector 8-Position 2X4 Male Header - Length: 0.520" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 8P MALE 2X4 | 44732 |
| TSW-106-17-G-S | Post Head Connector 6-Position 1X6 Male Header - Length: 0.620" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 6P MALE | 40445 |
| TSW-107-15-G-D | Post Head Connector 14-Position 2X7 Male Header - Length: 0.520" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 14P MALE 2X7 | 40446 |
| TSW-107-17-G-D | Post Head Connector 14-Position 2X7 Male Header - Length: 0.620" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 14P MALE 2X7 | 40447 |
| TSW-107-18-G-D | Post Head Connector 14-Position 2X7 Male Header - Length: 0.720" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 14P MALE 2X7 | 40448 |
| TSW-112-14-G-S | Post Head Connector 12-Position 1X12 Male Header - Length: 0.320" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 12P BERGSTICK | 43989 |
| TSW-114-06-G-S | Post Head Connector 14-Position 1X14 Male Header - Length: 0.105" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 14P BERGSTICK | 40451 |
| TSW-120-15-G-S | Post Head Connector 20-Position 1X20 Male Header - Length: 0.520" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 20P BERGSTICK | 40452 |
| TSW-122-15-G-S | Post Head Connector 22-Position 1X22 Male Header - Length: 0.520" | Electromechanical / Connector / header / post / Male | yes | RoHS CONNECTOR 22P BERGSTICK | 40453 |
| TSW-112-08-G-SRA | Post Head Connector 12-Position Single Right Angle Header - Length: 0.230" | Electromechanical / Connector / header / post / Right Angle | yes | RoHS CONNECTOR 12P SINGLE RA | 40449 |
| TSW-112-25-G-SRA | Post Head Connector 12-Position Single Right Angle Header Half plated - Length: 0.320" | Electromechanical / Connector / header / post / Right Angle | yes | RoHS CONNECTOR 12P SINGLE RA | 40450 |
| TSW-103-15-G-D | Post Head Connector 6-Position 2X3 Male Header Right Angle - Length: 0.520" | Electromechanical / Connector / header / post / Right Angle / Male | yes | RoHS CONNECTOR 6P MALE 2X3 | 44024 |
| TSW-103-22-G-SRA | Post Head Connector 1X3 3-Position Male Right Angle Header - Length: 0.230" | Electromechanical / Connector / header / post / Right Angle / Male | yes | RoHS CONNECTOR 3P MALE RA | 40443 |
| TSW-103-25-G-DRA | Post Head Connector 6-Position 3X2 Right Angle Male Header - Length: 0.320" | Electromechanical / Connector / header / post / Right Angle / Male | yes | RoHS CONN 6P 3X2 RT ANGLE MALE | 42943 |
| 11-0102-001 | Connector Binding Post Red Johnson | Electromechanical / Connector / post | yes | RoHS BINDING POST JOHNSON RED | 216973 |
| 11-0103-001 | Connector Binding Post Black Johnson | Electromechanical / Connector / post | yes | RoHS BINDING POST JOHNSON BLACK | 34546 |
| 11-0104-001 | Connector Binding Post Green Johnson | Electromechanical / Connector / post | yes | RoHS BINDING POST JOHNSON GREEN | 34547 |
| 320-3375 | Connector Binding Post Mini 5-Way Gold Plated Set of 2 Red & 2 Black Parts Express | Electromechanical / Connector / post |  | Parts Express Mini Gold Plated Insulated 5-Way Binding Post Set 2 Red 2 Black | 217304 |
| 58-094-0 | 4-Button Speaker Term Mode post spring losded | Electromechanical / Connector / post | yes | RoHS MODE 4 BUTTON SPEAKER TERMINAL | 35721 |
| SIFAMPPM | Meter PPM 32APPM Scale 5 Sifam | Electromechanical / Meter | yes | RoHS SIFAM PPM METER 32APPM SCALE 5 | 40593 |
| G5V-1-DC5 | Relay Switching SPDT 1A | Electromechanical / Relay | yes | RoHS OMRON SPDT 1A SWITCHING RELAY | 41917 |
| G6AK234PSTUSDC5 | Relay DPDT 5V | Electromechanical / Relay | yes | RoHS OMRON DPDT 5V RELAY | 41918 |
| RZ-12W-C | Relay DPDT 12V Bifurcated | Electromechanical / Relay | yes | RoHS RELAY DPDT 12V BIFURCATED ITT | 40870 |
| EVQ-PJU05K/SM | Switch Tactile Surface Mount | Electromechanical / Switch / SM | yes | RoHS SWITCH LT TOUCH | 41900 |
| 219-4MS | Switch DIP Raised Actuator 4 Sections Surface Mount | Electromechanical / Switch / SM / actuator | yes | RoHS SWITCH RAISED ACTUATOR 4 SEC SMT | 35151 |
| 219-8MS | Switch DIP Raised Actuator 8 Sections Surface Mount | Electromechanical / Switch / SM / actuator |  | SWITCH RAISED ACTUATOR 8 SEC SMT | 35154 |
| 206-4RAST | Switch DIP Right Angle Sealed 4 Sections | Electromechanical / Switch / TH | yes | RoHS SWITCH RIGHT ANGLE SEALED 4 SEC | 35130 |
| 206-8RAST | Switch DIP Right Angle Sealed 8 Sections | Electromechanical / Switch / TH |  | SWITCH RIGHT ANGLE SEALED 8 SECTIONS | 42623 |
| 320-22E1-1BLK | Switch SPST Black | Electromechanical / Switch / TH | yes | RoHS-Compliant Black SPST Switch | 35155 |
| 6211691909-V | Switch Rocker Black I/O | Electromechanical / Switch / TH | yes | RoHS SWITCH ROCKER BLACK I/O | 35739 |
| KSD1R4 | Switch Red LED | Electromechanical / Switch / TH | yes | RoHS-compliant Red LED Switch ITT | 41612 |
| TL1105 | Switch Tactile TL Series | Electromechanical / Switch / TH | yes | RoHS TACT SWITCH TL SERIES | 40422 |
| 7099 | Switch Dress Nut C&K | Electromechanical / Switch / TH / C&K |  | C&K SWITCH DRESS NUT | 35776 |
| 7101MD9ABE | Switch 2-Position C&K | Electromechanical / Switch / TH / C&K | yes | RoHS C&K SWITCH 2 POSITION | 35777 |
| 7101SYZQE | Switch 2-Position C&K | Electromechanical / Switch / TH / C&K | yes | RoHS C&K SWITCH 2 POSITION | 35778 |
| 7201MYZQE | Switch Toggle C&K On-None-On DPDT | Electromechanical / Switch / TH / C&K |  | Switch Toggle ON None ON DPDT | 217307 |
| 7203SYZQE | Switch 3-Position C&K | Electromechanical / Switch / TH / C&K | yes | RoHS C&K SWITCH 3 POSITION | 35779 |
| 565-0701 | Switch End Barrier Dialight | Electromechanical / Switch / TH / Dialight |  | DIALIGHT SWITCH END BARRIER | 216984 |
| 5650-111 | Switch Bezel - 1/2" Square Dialight | Electromechanical / Switch / TH / Dialight |  | Dialight Switch Bezel - 1/2" Square | 35715 |
| 5650-211 | Switch Bezel - 5/8" Square Dialight | Electromechanical / Switch / TH / Dialight |  | Dialight Switch Bezel - 5/8" Square | 35716 |
| 5650-311 | Switch Bezel - 5/8" x 3/4" Rectangular Dialight | Electromechanical / Switch / TH / Dialight |  | Dialight Switch Bezel - 5/8" x 3/4" Rectangular | 35717 |
| LED-T1 3/4-R | Switch Red LED - T1 3/4 12 Volt for Dialight | Electromechanical / Switch / TH / Dialight | yes | RoHS-Compliant Red LED Switch - T1 3/4 12 Volt | 41625 |
| LED-T1 3/4-Y | Switch Yellow LED - T1 3/4 12 Volt for Dialight | Electromechanical / Switch / TH / Dialight | yes | RoHS-Compliant Yellow LED Switch - T1 3/4 12 Volt | 216948 |
| B3J-1100 | Switch Key Momentary Omron | Electromechanical / Switch / TH / Momentary | yes | RoHS OMRON MOMENTARY KEY SWITCH | 37498 |
| B3J-2100 | Switch Key Momentary Omron | Electromechanical / Switch / TH / Momentary | yes | RoHS-Compliant OMRON Momentary Key Switch | 37499 |
| JB15LPF-JB | Switch Momentary CLEAR w/Green LED | Electromechanical / Switch / TH / Momentary | yes | RoHS SWITCH MOMENTARY CLEAR w/GREEN LED | 217240 |
| 500SSP1S1M7QEA | Switch Slide SPDT E-Switch | Electromechanical / Switch / TH / Slide | yes | RoHS E-SWITCH Slide Switch SPDT | 43956 |
| C62206L | Switch Slide PCB Mounting | Electromechanical / Switch / TH / Slide | yes | RoHS SLIDE SWITCH PCB MTG | 37797 |
| SWDP3TRA | Switch Slide DP3T 200MA 30V | Electromechanical / Switch / TH / Slide | yes | RoHS SWITCH SLIDE DP3T 200MA 30V | 217476 |
| 1101M1S3ZQE2 | Switch Miniature Slide C&K | Electromechanical / Switch / TH / Slide / C&K | yes | RoHS C&K MINIATURE SLIDE SWITCH | 34551 |
| 1101M2S3ABE2 | Switch Miniature Slide C&K | Electromechanical / Switch / TH / Slide / C&K | yes | RoHS C&K MINIATURE SLIDE SWITCH | 34552 |
| 209-4MS | Switch DIP Raised Actuator 4 Sections | Electromechanical / Switch / TH / actuator |  | SWITCH RAISED ACTUATOR 4 SEC | 35132 |
| 209-8MS | Switch DIP Raised Actuator 8 Sections | Electromechanical / Switch / TH / actuator | yes | RoHS SWITCH RAISED ACTUATOR 8 SEC | 35134 |
| 325-0071 | Switch Cap Red | Electromechanical / Switch / TH / cap |  | 325-0071 | 43943 |
| 325-0073 | Switch Cap Yellow | Electromechanical / Switch / TH / cap |  | 325-0073 | 44755 |
| G003A | Switch Cap Black | Electromechanical / Switch / TH / cap | yes | RoHS BLACK CAP | 41916 |
| KD0101 | Switch Cap Black | Electromechanical / Switch / TH / cap | yes | RoHS SWITCH CAP ITT BLACK | 41606 |
| KD0102 | Switch Cap White | Electromechanical / Switch / TH / cap | yes | RoHS SWITCH CAP ITT WHITE | 41607 |
| KD0103 | Switch Cap Red | Electromechanical / Switch / TH / cap | yes | RoHS SWITCH CAP ITT RED | 41608 |
| KD0104 | Switch Cap Grey | Electromechanical / Switch / TH / cap | yes | RoHS SWITCH CAP ITT GREY | 41609 |
| KD0106 | Switch Cap Yellow | Electromechanical / Switch / TH / cap | yes | RoHS SWITCH CAP ITT YELLOW | 41610 |
| KD0108 | Switch Cap Green | Electromechanical / Switch / TH / cap | yes | RoHS SWITCH CAP ITT GREEN | 41611 |
| TS-1-B6D1 | Switch Tactile Circle Red Cap with Red LED | Electromechanical / Switch / TH / cap |  | CIRCLE TACTILE SWITCH RED CAP/RED LED | 40430 |
| TS-1-B6D5 | Switch Tactile Circle Grey Cap with Red LED | Electromechanical / Switch / TH / cap |  | CIRCLE TACTILE SWITCH GRY CAP/RED LED | 40431 |
| TS-1-B6D6 | Switch Tactile Circle Black Cap with Red LED | Electromechanical / Switch / TH / cap |  | CIRCLE TACTILE SWITCH BLK CAP/RED LED | 40432 |
| JB15LP-3CC | Switch Momentary LED Illuminated Switch (Red) | Electromechanical / Switch / TH / illuminated / Momentary | yes | RoHS-Compliant Momentary LED Illuminated Switch (Red) | 41601 |
| JB15LP-3EE | Switch Momentary LED Illuminated Switch (Yellow) | Electromechanical / Switch / TH / illuminated / Momentary | yes | RoHS-Compliant Momentary LED Illuminated Switch (Yellow) | 41602 |
| JB15LP-3FF | Switch Momentary LED Illuminated Switch (Green) | Electromechanical / Switch / TH / illuminated / Momentary | yes | RoHS-Compliant Momentary LED Illuminated Switch (Green) | 41603 |
| 6CF-GHT-AA | Switch Pushbutton | Electromechanical / Switch / TH / push |  | SWITCH MODULE SPEC 11-151 | 35764 |
| 8CF-GHT-AA | Switch Pushbutton | Electromechanical / Switch / TH / push |  | SWITCH MODULE WBS SPEC 11-151 | 37151 |
| PHA-2UEE | Switch Pushbutton | Electromechanical / Switch / TH / push | yes | RoHS-Compliant Pushbutton Switch | 41180 |
| 554-3221-100 | Switch Base for Pushbutton Switch Dialight | Electromechanical / Switch / TH / push / Dialight |  | Dialight Pushbutton Switch Base | 35699 |
| 554-3221-111 | Switch Pushbutton DPDT 50mA Dialight | Electromechanical / Switch / TH / push / Dialight |  | Dialight Pushbutton Switch DPDT 50mA | 217379 |
| 554-3221-211 | Switch Pushbutton DPDT 50mA Dialight | Electromechanical / Switch / TH / push / Dialight |  | Dialight Pushbutton Switch DPDT 50mA | 217378 |
| 554-3221-311 | Switch Pushbutton On/Off  DPDT 50mA Dialight | Electromechanical / Switch / TH / push / Dialight |  | Dialight Pushbutton On/Off R2K Switch DPDT 50mA | 43936 |
| BVU-BLM | BVU-BLM   - Big Loudness Meter | Finished Goods |  |  | 217460 |
| LTP-DB25-3 | Little Tiny Panel - DB25 X 3 | Finished Goods / Hardware |  |  | 217398 |
| FAN-50X50X15 | Fan 50 x 50 x 15mm | Hardware / Fan | yes | RoHS FAN 50 x 50 x 15mm | 41903 |
| FAN-60X60X15 | Fan 60 x 60 x 15mm | Hardware / Fan | yes | RoHS FAN 60 x 60 x 15mm | 41904 |
| 616-220-301 | Guide PCB Edge EDAC Rack Mounting 6.5" | Hardware / Guide / EDAC | yes | RoHS GUIDE PCB EDAC RACK MTG 6.5" | 35734 |
| 616-220-306 | Guide PCB Edge EDAC Rack Mounting 9" | Hardware / Guide / EDAC | yes | RoHS GUIDE PCB EDAC RACK MTG 9" | 35735 |
| 2003B | Turret Hollow Useco | Hardware / Hardware |  | TURRET HOLLOW USECO | 35122 |
| 577102 | Heatsink Black Aavid | Hardware / Hardware | yes | RoHS HEATSINK AAVID BLACK | 35720 |
| 7-03-209 | Door Panel Latch | Hardware / Hardware | yes | RoHS DOOR PANEL LATCH | 35773 |
| A3-30-519-12 | Black Plastic Spring Latch | Hardware / Hardware | yes | RoHS BLACK PLASTIC SPRING LATCH | 37183 |
| ABMM-A-D | Clamp Adhesive Back Small | Hardware / Hardware |  | CLAMP ADHESIVE BACK SMALL | 37191 |
| B51547F019 | Insulator 2N6395 | Hardware / Hardware | yes | RoHS INSULATOR 2N6395 | 37500 |
| CI-192-028 | Crystal 2-Hole Insulator | Hardware / Hardware |  | CRYSTAL INSULATOR | 37818 |
| E-300 | 3" PCB Econo Guide - Snap Mounting | Hardware / Hardware | yes | RoHS 3" PCB ECONO GUIDE - SNAP MTG | 41879 |
| IU-7/16 | Isolation Bushing - White | Hardware / Hardware | yes | RoHS ISOLATION BUSHING *(WHITE ONLY)* | 41599 |
| K4-58 | Insulator Single T0-220 Package | Hardware / Hardware |  | INSULATOR SINGLE T0-220 PKG (SEE NOTES) | 41604 |
| NOVATTACH SMALL | Small Bracket Novattach CMB | Hardware / Hardware |  | Novattach Small Bracket CMB | 43898 |
| RB-59 | Rubber Gromett | Hardware / Hardware | yes | RoHS RUBBER GROMETT | 40855 |
| TC102 | Ty-Rap Mounting Plate | Hardware / Hardware |  | TY-RAP MOUNTING PLATE | 43738 |
| CP-86 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37824 |
| CP-86 WE AA6201 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37825 |
| CP-86 WE AV6201 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37826 |
| CP-86 WE AV6202 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37827 |
| CP-86 WE D6201 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37828 |
| CP-86 WE D6202 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37829 |
| CP-86 WE D6203 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37830 |
| CP-86 WE D6204 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37831 |
| CP-86 WE D6207 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37832 |
| CP-86 WE M6202 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37833 |
| CP-86 WE M6203 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37834 |
| CP-86 WE M6204 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37835 |
| CP-86 WE M6205 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37836 |
| CP-86 WE M6206 | White Ejector Handle | Hardware / Hardware / Handle |  | WHITE EJECTOR HANDLE | 37837 |
| 616-220-307 | 11" Uni-Guide Rail | Hardware / Hardware / Rail | yes | RoHS 11" UNI-GUIDE RAIL | 35736 |
| 0SET04400500CPH4400 | Set Screw Cup Hexagonal Socket 4-40 X 1/2 | Hardware / Hardware / Socket |  | 4-40 X 1/2 SET SCREW CUP HEX SOCKET | 216816 |
| 0SOC36163000XSH4400 | Socket Cap 3/8-16 x 3" Black Alloy Steel Bolt | Hardware / Hardware / Socket |  | 3/8-16 x 3" Socket Caps Black Alloy Steel Bolt | 217290 |
| 363-373 | Screw Hexagonal Socket Button Head | Hardware / Hardware / Socket |  | HEX SOCKET BUTTON HEAD SCREW | 36413 |
| BSOS-440-18 Self Clinching Standoff | Standoff Self-Clinching BSOS-440-18 | Hardware / Hardware / Standoff |  | BSOS-440-18 Self Clinching Standoff | 216925 |
| SO-440-12 Self-Clinching Standoff | Standoff Self-Clinching SO-440-12 | Hardware / Hardware / Standoff |  | SO-440-12 Self-Clinching Standoff | 43963 |
| SO-440-14 Self-Clinching Standoff | Standoff Self-Clinching SO-440-14 | Hardware / Hardware / Standoff |  | SO-440-14 Self-Clinching Standoff | 216933 |
| SO-440-8 Self-Clinching Standoff | Standoff Self-Clinching SO-440-8 | Hardware / Hardware / Standoff |  | SO-440-8 Self-Clinching Standoff | 43258 |
| SO-632-8 Self-Clinching Standoff | Standoff Self-Clinching SO-632-8 | Hardware / Hardware / Standoff |  | SO-632-8 Self-Clinching Standoff | 43741 |
| SO-6440-10 | Standoff Self-Clinching SO-6440-10 | Hardware / Hardware / Standoff |  | SO-6440-10 Self-Clinching Standoff | 43546 |
| SOS-256-6 Self-Clinching Standoff | Standoff Self-Clinching SOS-256-6 | Hardware / Hardware / Standoff | yes | RoHS SOS-256-6 Self-Clinching Standoff | 43263 |
| SOS-632-6 Self-Clinching Standoff | Standoff Self-Clinching SOS-632-6 | Hardware / Hardware / Standoff |  | SOS-632-6 Self-Clinching Standoff | 216935 |
| SOS-6440-10 Self-Clinching Standoff | Standoff Self-Clinching SOS-6440-10 | Hardware / Hardware / Standoff |  | SOS-6440-10 | 216934 |
| SOS-6440-4 Self-Clinching Standoff | Standoff Self-Clinching SOS-6440-4 | Hardware / Hardware / Standoff |  | SOS-6440-4 Self-Clinching Standoff | 216940 |
| ST8X3#256 | Standoff .500 Brass | Hardware / Hardware / Standoff | yes | RoHS BRASS STANDOFF .500 | 40659 |
| TSO-440-250 Self-Clinching Standoff | Standoff Self-Clinching TSO-440-250 | Hardware / Hardware / Standoff |  | TSO-440-250 Self-Clinching Standoff | 216937 |
| TSO-6440-250 Self-Clinching Standoff | Standoff Self-Clinching TSO-6440-250 | Hardware / Hardware / Standoff |  | TSO-6440-250 Self-Clinching Standoff | 216944 |
| 0050-180-001 | Grounding Lug | Hardware / Hardware / TH |  | GROUNDING LUG | 43747 |
| 1502-2 | Terminal Keystone | Hardware / Hardware / Terminal | yes | RoHS KEYSTONE TERMINAL | 34582 |
| 55 | Terminal Strip Cinch | Hardware / Hardware / Terminal |  | TERMINAL STRIP CINCH | 36484 |
| C14-101 | Ring Terminal 22-16 AWG | Hardware / Hardware / Terminal |  | RING TERMINAL 22-16 AWG | 37548 |
| SE-36-CP | Eyelet 3/32 X 6/32 | Hardware / Hardware / eyelet |  | EYELET 3/32 X 6/32 | 40589 |
| SE-37-CP | Eyelet 3/32 X 7/32 | Hardware / Hardware / eyelet |  | EYELET 3/32 X 7/32 | 40590 |
| SE-38-CP | Eyelet 3/32 X 8/32 | Hardware / Hardware / eyelet |  | EYELET 3/32 X 8/32 | 40591 |
| 9540K42 | Rubber Mounting Feet 1/8"x1/2" | Hardware / Hardware / feet |  | RUBBER MOUNTING FEET 1/8"x1/2" | 37175 |
| SJ5023 | Mounting Feet Rubber 1/2 x 1/2 | Hardware / Hardware / feet | yes | RoHS RUBBER MOUNTING FEET 1/2 x 1/2 | 40596 |
| FBSIBS-5 BLACK | Rubber Mounting Foot | Hardware / Hardware / foot | yes | RoHS RUBBER MOUNTING FOOT | 41905 |
| #4SL | Solder Lug #4 | Hardware / Hardware / lug | yes | RoHS SOLDER LUG #4 | 34493 |
| #6SL | Solder Lug #6 | Hardware / Hardware / lug | yes | RoHS SOLDER LUG #6 | 34494 |
| #8SL | Solder Lug #8 | Hardware / Hardware / lug | yes | RoHS SOLDER LUG #8 | 34495 |
| 0NUT36160000FH001BX | Nut 3/8-16 Hexagonal 18.8SS Black Oxide | Hardware / Hardware / nut |  | 3/8-16 Hex Nut 18.8SS Black Oxide | 217291 |
| 301241-014 | Nut for Mounting Potentiometer Knurled Black TEC | Hardware / Hardware / nut |  | NUT POT MTG KNURLED BLK TEC | 35127 |
| 440-NN | Nut Nylon Hexagonal 4/40 | Hardware / Hardware / nut |  | NYLON HEX NUT 4/40 | 42700 |
| M3638 | Nut for Locking Potentiometer 70&73 Series | Hardware / Hardware / nut |  | POT LOCKING NUT 70&73 SERIES | 41661 |
| NRJ-NUT-B | Fastener Nut Hexagonal Plastic Black Neutrik | Hardware / Hardware / nut |  | Neutrik fastener Hexagonal black plastic nut | 217331 |
| S-256-1 Self-Clinching Pem Nut | Nut Self-clinching S-256-1 Pem | Hardware / Hardware / nut |  | S-256-1 Self-Clinching Pem Nut | 216930 |
| S-440-1 Self-Clinching Pem Nut | Nut Self-clinching S-440-1 Pem | Hardware / Hardware / nut |  | S-440-1 Self-Clinching Pem Nut | 216931 |
| S-632-1 Self-Clinching Pem Nut | Nut Self-clinching S-632-1 Pem | Hardware / Hardware / nut |  | S-632-1 Self-Clinching Pem Nut | 216932 |
| 0NUT02560000MS00100 | Nut for Machine Screw 2-56 Hexagonal | Hardware / Hardware / nut / screw |  | 2-56 HEX NUT FOR MACHINE SCREW | 44751 |
| 0NUT02560000NI00100 | Lock Nut for Machine Screw 2-56 | Hardware / Hardware / nut / screw |  | 2-56 LOCK NUT FOR MACHINE SCREW | 216820 |
| 0NUT04400000KP00100 | Keps Nut for Machine Screw 4-40 | Hardware / Hardware / nut / screw |  | 4-40 KEP NUT FOR MACHINE SCREW | 44752 |
| 0MAS02560125FUP0100 | Screw 2-56 x 1/8 Flathead Undercut Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 1/8 FLATHEAD UNDERCUT PHILLIPS MACHINE SCREW | 216835 |
| 0MAS02560125PNP0100 | Screw 2-56 x 1/8 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 1/8 PANHEAD PHILLIPS MACHINE SCREW | 216813 |
| 0MAS02560187FUP0100 | Screw 2-56 x 3/16 Flathead Undercut Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 3/16 FLATHEAD UNDERCUT PHILLIPS MACHINE SCREW | 44748 |
| 0MAS02560187PNP0100 | Screw 2-56 x 3/16 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 3/16 PANHEAD PHILLIPS MACHINE SCREW | 44749 |
| 0MAS02560375PNP0100 | Screw 2-56 x 3/8 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 3/8 PANHEAD PHILLIPS MACHINE SCREW | 216834 |
| 0MAS02560437FLP0100 | Screw 2-56 x 7/16 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 7/16 FLATHEAD PHILLIPS MACHINE SCREW | 217275 |
| 0MAS02560625FLP0100 | Screw 2-56 x 5/8 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 2-56 x 5/8 FLATHEAD PHILLIPS MACHINE SCREW | 217443 |
| 0MAS04400250FLP0100 | Screw 4-40 x 1/4 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 1/4 FLATHEAD PHILLIPS MACHINE SCREW | 44750 |
| 0MAS04400250FUP0100 | Screw 4-40 x 1/4 Flathead Undercut Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 1/4 FLATHEAD UNDERCUT PHILLIPS MACHINE SCREW | 216815 |
| 0MAS04400250PNP0100 | Screw 4-40 x 1/4 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 1/4 PANHEAD PHILLIPS MACHINE SCREW | 44753 |
| 0MAS04400375PNP0100 | Screw 4-40 x 3/8 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 3/8 PANHEAD PHILLIPS MACHINE SCREW | 217276 |
| 0MAS04400437FLP0100 | Screw 4-40 x 7/16 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 7/16 FLATHEAD PHILLIPS MACHINE SCREW | 44754 |
| 0MAS04400437PNP0100 | Screw 4-40 x 7/16 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 7/16 PANHEAD PHILLIPS MACHINE SCREW | 216822 |
| 0MAS04400875PNP0100 | Screw 4-40 x 7/8 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 7/8 PANHEAD PHILLIPS MACHINE SCREW | 216810 |
| 0MAS04401250PNP0100 | Screw 4-40 x 1-1/4 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 4-40 x 1-1/4 PANHEAD PHILLIPS MACHINE SCREW | 216833 |
| 0MAS06320312FLP0100 | Screw 6-32 x 5/16 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 6-32 x 5/16 FLATHEAD PHILLIPS MACHINE SCREW | 216811 |
| 0MAS06320312TRP0100 | Screw 6-32 x 5/16 Trusshead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 6-32 x 5/16 TRUSSHEAD PHILLIPS MACHINE SCREW | 216825 |
| 0MAS06320500FLP0100 | Screw 6-32 x 1/2 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 6-32 x 1/2 FLATHEAD PHILLIPS MACHINE SCREW | 216823 |
| 0MAS08320312PNP0100 | Screw 8-32 x 5/16 Panhead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 8-32 x 5/16 PANHEAD PHILLIPS MACHINE SCREW | 216814 |
| 0MAS10320437FLP0100 | Screw 10-32 x 7/16 Flathead Machinescrew Phillips Stainless Steel | Hardware / Hardware / screw |  | 10-32 x 7/16 FLATHEAD PHILLIPS MACHINE SCREW | 216808 |
| 370-405 | Screw 8-32X3/8" Allen Keyway | Hardware / Hardware / screw |  | SCREW 8-32X3/8" ALLEN KEYWAY | 36417 |
| 440-NS | Screw Nylon Panhead Slotted 4/40x3/8 | Hardware / Hardware / screw |  | SCREW 4/40x3/8 PAN SLOT NYLON | 36450 |
| MF100-SPACER | Termination Spacer for MF100 | Hardware / Hardware / spacer | yes | RoHS TERMINATION SPACER - MF100 | 41389 |
| SP12X3#4 | Spacer #4 3/4X3/16D Aluminum | Hardware / Hardware / spacer | yes | RoHS SPACER #4 3/4X3/16D ALUM | 40640 |
| SP3X4#4-CUSTOM | Spacer #4 3/16x1/4D Steel | Hardware / Hardware / spacer | yes | RoHS SPACER #4 3/16X 1/4D STEEL | 40641 |
| SP8X4#4 | Spacer #4 1/2X1/4D Aluminum | Hardware / Hardware / spacer | yes | RoHS SPACER #4 1/2X1/4D ALUM | 43354 |
| ST12X3#256 | Spacer 2-56X3/4LX3/16D | Hardware / Hardware / spacer | yes | RoHS SPACER 2-56X3/4LX3/16D | 40655 |
| ST8X3#256N | Spacer 2-56X1/2X3/16D Nylon | Hardware / Hardware / spacer | yes | RoHS SPACER 2-56X1/2X3/16D NYLON | 40660 |
| FH-440-5 Self-Clinching Stud | Stud Self-Clinching FH-440-5 | Hardware / Hardware / stud |  | FH-440-5 Self-Clinching Stud | 216926 |
| FH-440-6 Self-Clinching Stud | Stud Self-Clinching FH-440-6 | Hardware / Hardware / stud |  | FH-440-6 Self-Clinching Stud | 216927 |
| FH-632-6 Self-Clinching Stud | Stud Self-Clinching FH-632-6 | Hardware / Hardware / stud |  | FH-632-6 Self-Clinching Stud | 216928 |
| 0LOC02000000SP00100 | #2 Split Washer | Hardware / Hardware / washer |  | #2 SPLIT WASHER | 216836 |
| 0LOC04000000IT01100 | #4 Internal Tooth Lockwasher | Hardware / Hardware / washer |  | #4 INTERNAL TOOTH LOCKWASHER | 216812 |
| 0WAS36000000SE040BZ | Flat Washer 3/8 SAE Steel Black ZC | Hardware / Hardware / washer |  | 3/8 SAE Flat Washer Steel Black ZC | 217292 |
| 12SWS3016 | Shoulder Washer Nylon | Hardware / Hardware / washer |  | Nylon Shoulder Washer | 217356 |
| 16FW500032 | Nylon Standard Flat Washer | Hardware / Hardware / washer |  |  | 217355 |
| NRJ-WB | Washer Plastic Black Neutrik | Hardware / Hardware / washer |  | Neutrik  washer black plastic | 217332 |
| PW#2-N | Washer Nylon #2 .250D x .032T | Hardware / Hardware / washer |  | WASHER NYLON #2 .250D x .032T | 41028 |
| PW#4-N | Washer Nylon #4 .280D x .032T | Hardware / Hardware / washer |  | WASHER NYLON #4 .280D x .032T | 41029 |
| 040-1025 | Knob Cap 7mm Matte Black without line for 10mm knob Elma | Hardware / Knobs and Knob Caps / Current | yes | RoHS 7mm Matte Black Elma Cap without line for 10mm knob | 34505 |
| 040-1065 | Knob Cap 7mm Matte Green without line for 10mm knob Elma | Hardware / Knobs and Knob Caps / Current | yes | RoHS 7mm Matte Green Elma Cap without line for 10mm knob | 34506 |
| 040-3065 | Knob Cap 10mm Matte Green without line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / Current | yes | RoHS 10mm Matte Green Elma Cap without line for 14.5mm knob | 217266 |
| C150-BLACK | Knob Cap 15mm Matte Black No Line | Hardware / Knobs and Knob Caps / Current |  | KNOB CAP 15MM MATT BLK NO LINE | 37549 |
| S150-250-BLACK | Knob 15mm Matte Black 1/4" S.DIA | Hardware / Knobs and Knob Caps / Current |  | KNOB 15MM MATT BLACK 1/4 S.DIA | 40580 |
| S151-125-BLACK | Knob 15mm Matte Black 1/8" S.DIA | Hardware / Knobs and Knob Caps / Current |  | KNOB 15MM MATT BLACK 1/8 S.DIA | 40581 |
| 020-2225 | Knob 10mm Black with 1/8 in. Shaft and no line Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Black Elma Knob with 1/8 in. Shaft and no line | 34501 |
| 020-3225 | Knob 14.5mm Black with 1/8 in. Shaft and no line Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 14.5mm Black Elma Knob with 1/8 in. Shaft and no line | 34502 |
| 021-2225 | Knob 10mm Black with 1/8 in. Shaft and White line Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Black Elma Knob with 1/8 in. Shaft and white line | 34503 |
| 023-2225 | Knob 10mm Black with 1/8 in. Shaft with wing and White line Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Black Elma Knob with 1/8 in. Shaft with wing and white line | 34504 |
| 040-1055 | Knob Cap 7mm Matte Yellow without line for 10mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 7mm Matte Yellow Elma Cap without line for 10mm knob | 217263 |
| 040-1615 | Knob Cap 7mm Matte Grey with line for 10mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 7mm Matte Grey Elma Cap with line for 10mm knob | 217260 |
| 040-1625 | Knob Cap 7mm Matte Black with line for 10mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 7mm Matte Black Elma Cap with line for 10mm knob | 34507 |
| 040-1635 | Knob Cap 7mm Matte Red with line for 10mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 7mm Matte Red Elma Cap with line for 10mm knob | 217261 |
| 040-1655 | Knob Cap 7mm Matte Yellow with line for 10mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 7mm Matte Yellow Elma Cap with line for 10mm knob | 217262 |
| 040-1665 | Knob Cap 7mm Matte Green with line for 10mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 7mm Matte Green Elma Cap with line for 10mm knob | 34508 |
| 040-3025 | Knob Cap 10mm Matte Black without line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Black Elma Cap without line for 14.5mm knob | 34509 |
| 040-3035 | Knob Cap 10mm Matte Red without line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Red Elma Cap without line for 14.5mm knob | 217264 |
| 040-3055 | Knob Cap 10mm Matte Yellow without line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Yellow Elma Cap without line for 14.5mm knob | 217265 |
| 040-3615 | Knob Cap 10mm Matte Grey with line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Grey Elma Cap with line for 14.5mm knob | 217256 |
| 040-3625 | Knob Cap 10mm Matte Black with line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Black Elma Cap with line for 14.5mm knob | 34510 |
| 040-3635 | Knob Cap 10mm Matte Red with line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Red Elma Cap with line for 14.5mm knob | 217257 |
| 040-3655 | Knob Cap 10mm Matte Yellow with line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Yellow Elma Cap with line for 14.5mm knob | 217258 |
| 040-3665 | Knob Cap 10mm Matte Green with line for 14.5mm knob Elma | Hardware / Knobs and Knob Caps / LEGACY | yes | RoHS 10mm Matte Green Elma Cap with line for 14.5mm knob | 217259 |
| 8630-01 | Jack screw for D-sub connector plate Mounting | Hardware / Screw | yes | RoHS CONN JACK SOCKET | 37148 |
| 00PM3 | Labour/Production - Module | Labour / TH / - |  | LABOUR/PRODUCTION-MODULE | 42581 |
| 00PNP | Labour-Production/PNP | Labour / TH / - |  | LABOUR-PRODUCTION/PNP | 42612 |
| 00PT5 | Labour/Production-Test | Labour / TH / - |  | LABOUR/PRODUCTION-TEST | 42613 |
| 00PW4 | Labour/Production - Wiring | Labour / TH / - |  | LABOUR/PRODUCTION-WIRING | 42614 |
| C10TG-68M/SM | Capacitor Tantalum 68UF 10V D Case Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP TANTALUM 68UF 10V D CASE | 37547 |
| C16TG-33M/SM | Capacitor Tantalum 33UF 16V C Case Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP TANTALUM 33UF 16V C CASE | 43739 |
| C25E-100/SM | Capacitor Electrolytic 100UF 25V Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP 100UF 25V ELECT HA SMD | 37556 |
| C25TG-15M/SM | Capacitor Tantalum 15UF 25V Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP TANTALUM 15UF 25V SMT | 37560 |
| C35E-22/SM | Capacitor Electrolytic 22UF 35V HA Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP 22UF 35V HA SMD | 37563 |
| C35E-47/SM | Capacitor Electrolytic 47UF 35V Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP 47UF 35V SMD | 216878 |
| C35E-470/SM | Capacitor Electrolytic 470UF 35V Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP 470UF 35V SMD | 216879 |
| C35TG-1M/SM | Capacitor Tantalum 1.0UF 35V Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP TANTALUM 1.0UF 35V SMT | 37567 |
| C35TG-6M8/SM | Capacitor Tantalum 6.8UF 35V  D Case Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP TANTALUM 6.8UF 35V  D CASE SMT | 37569 |
| C63E-47M/SM | Capacitor Electrolytic 47UF 63V Surface Mount | Passive / Capacitor / SM / - | yes | RoHS CAP 47UF 63V ELECT HA SMD | 37800 |
| C100C-104K/SM | Capacitor Ceramic 0.1 UF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 0.1 UF 50V 1206 SMT | 37519 |
| C100PF-222/SM | Capacitor Ceramic 2200 PF Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 2200 PF 1206 SMT | 37533 |
| C100PF-682/SM | Capacitor Ceramic 6800PF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 6800PF 50V 1206 SMT | 37537 |
| C10TG-10M/SM | Capacitor Tantalum 10UF 10V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP TANTALUM 10UF 10V 1206 SMT | 37541 |
| C10TG-4M7/SM | Capacitor Tantalum 4.7UF 10V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP TANTALUM 4.7UF 10V 1206 SMT | 37545 |
| C16C-105K/SM | Capacitor Ceramic 1.0UF 16V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 1.0UF 16V 1206 SMT | 37550 |
| C16C-22M/SM | Capacitor Ceramic 22UF 16V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 22UF 16V 1206 SMT | 37554 |
| C50C-100P/SM | Capacitor Ceramic 100PF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 100PF 50V 1206 SMT | 37571 |
| C50C-102P/SM | Capacitor Ceramic 1000PF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 1000PF 50V 1206 SMT | 37573 |
| C50C-103P/SM | Capacitor Ceramic 10000PF Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 10000PF 1206 SMT | 37576 |
| C50C-220P/SM | Capacitor Ceramic 220PF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 220PF 50V 1206 SMT | 37582 |
| C50C-27P/SM | Capacitor Ceramic 27PF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 27PF 50V 1206 SMT | 37585 |
| C50C-473P/SM | Capacitor Ceramic .047UF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC .047UF 50V 1206 SMT | 37586 |
| C50PE-683/SM | Capacitor Ceramic 0.068UF 50V Surface Mount 1206 Package | Passive / Capacitor / SM / 1206 / - | yes | RoHS CAP CERAMIC 0.068UF 50V 1206 SMT | 37793 |
| C16C-103K/SM 402 | Capacitor Ceramic 0.01UF 16V Surface Mount 402 Package | Passive / Capacitor / SM / 402 / - | yes | RoHS CAP CERAMIC 0.01UF 16V 402 SMT | 42759 |
| C16C-104K/SM 402 | Capacitor Ceramic 0.1UF 16V Surface Mount 402 Package | Passive / Capacitor / SM / 402 / - | yes | RoHS CAP CERAMIC 0.1UF 16V 402 SMT | 42760 |
| C16C-105K/SM 402 | Capacitor Ceramic 1.0UF 16V Surface Mount 402 Package | Passive / Capacitor / SM / 402 / - | yes | RoHS CAP CERAMIC 1.0UF 16V 402 SMT | 37551 |
| C6V3C-475K/SM 402 | Capacitor Ceramic 4.7UF 6.3V Surface Mount 402 Package | Passive / Capacitor / SM / 402 / - | yes | RoHS CAP CERAMIC 4.7UF 6.3V 402 SMT | 42763 |
| C100C-104K/SM 603 | Capacitor Ceramic 0.1 UF 50V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 0.1 UF 50V 603 SMT | 37520 |
| C100PF-222/SM 603 | Capacitor Ceramic 2200PF Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 2200PF 603 SMT PKG | 37534 |
| C10C-225/SM 603 | Capacitor Ceramic 2.2UF 10V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 2.2UF 10V 603 SMT | 216877 |
| C16C-105K/SM 603 | Capacitor Ceramic 1.0UF 16V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 1.0UF 16V 603 SMT | 37552 |
| C16C-224/SM 603 | Capacitor Ceramic 0.22 UF 16V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 0.22 UF 16V 603 SMT | 216875 |
| C50C-101K/SM 603 | Capacitor Ceramic 100PF 50V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 100PF 50V 603 SMT | 37572 |
| C50C-102P/SM 603 | Capacitor Ceramic 1000PF 50V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 1000PF 50V 603 SMT PKG | 37574 |
| C50C-103P/SM 603 | Capacitor Ceramic 10000PF 50V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 10000PF 50V 603 SMT | 37577 |
| C50C-220/SM 603 | Capacitor Ceramic 22PF 50V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 22PF 50V 603 SMT | 216873 |
| C50C-223/SM 603 | Capacitor Ceramic 22000PF 50V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 22000PF 50V 603 SMT | 216874 |
| C6V3C-106K/SM 603 | Capacitor Ceramic 10.0UF 6.3V Surface Mount 603 Package | Passive / Capacitor / SM / 603 / - | yes | RoHS CAP CERAMIC 10.0UF 6.3V 603 SMT | 42762 |
| C100C-104K/SM 805 | Capacitor Ceramic 0.1 UF 50V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 0.1 UF 50V 805 SMT | 37521 |
| C100C-27P/SM 805 | Capacitor Ceramic 27PF 50V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 27PF 50V 805 SMT | 37525 |
| C100PF-222/SM 805 | Capacitor Ceramic 2200PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 2200PF 805 SMT | 37535 |
| C100PF-682/SM 805 | Capacitor 6800PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP 6800PF 805 SMT PKG | 37538 |
| C16C-105K/SM 805 | Capacitor Ceramic 1.0UF 16V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 1.0UF 16V 805 SMT | 37553 |
| C16C-474K/SM 805 | Capacitor Ceramic 0.47UF 16V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 0.47UF 16V 805 SMT | 37555 |
| C50C-102P/SM 805 | Capacitor Ceramic 1000PF 50V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 1000PF 50V 805 SMT | 37575 |
| C50C-103P/SM 805 | Capacitor Ceramic 10000PF 50V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 10000PF 50V 805 SMT | 37578 |
| C50C-10P/SM 805 | Capacitor Ceramic 10PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 10PF 805 SMT PKG | 37579 |
| C50C-150P/SM 805 | Capacitor Ceramic 150PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 150PF 805 SMT PKG | 217286 |
| C50C-153P/SM 805 | Capacitor Ceramic 15000PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 15000PF 805 SMT | 37580 |
| C50C-15P/SM 805 | Capacitor Ceramic 15PF 50V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 15PF 50V 805 SMT | 37581 |
| C50C-220P/SM 805 | Capacitor Ceramic 220PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 220PF 805 SMT | 37583 |
| C50C-223P/SM 805 | Capacitor Ceramic 22000PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 22000PF 805 SMT | 37584 |
| C50C-22P/SM 805 | Capacitor Ceramic 22PF Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 22PF 805 SMT PKG | 217285 |
| C50PE-473/SM 805 | Capacitor Ceramic 0.047UF 50V Surface Mount 805 Package | Passive / Capacitor / SM / 805 / - | yes | RoHS CAP CERAMIC 0.047UF 50V 805 SMT | 37591 |
| C100C-102 | Capacitor Ceramic 1000PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 1000PF | 37517 |
| C100C-104K | Capacitor Ceramic 10% 0.1UF 50V | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 10% 0.1UF 50V | 37518 |
| C100C-10P | Capacitor Ceramic 10PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 10PF | 37522 |
| C100C-12P | Capacitor Ceramic 12PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 12PF | 43735 |
| C100C-151 | Capacitor Ceramic 150PF | Passive / Capacitor / TH / - |  | CAP CERAMIC 150PF | 42758 |
| C100C-221 | Capacitor Ceramic 220PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 220PF | 37523 |
| C100C-22P | Capacitor Ceramic 22PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 22PF | 37524 |
| C100C-331 | Capacitor Ceramic 330PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 330PF | 37526 |
| C100C-33P | Capacitor Ceramic 33PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 33PF | 37527 |
| C100C-47P | Capacitor Ceramic 47PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 47PF | 37528 |
| C100C-4P7 | Capacitor Ceramic 4.7PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 4.7PF | 37529 |
| C100C-821 | Capacitor Ceramic 820PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 820PF | 37530 |
| C100C-82P | Capacitor Ceramic 82PF | Passive / Capacitor / TH / - | yes | RoHS CAP CERAMIC 82PF (SEE NOTES) | 43744 |
| C100E-2M2 | Capacitor Electrolytic 2.2UF 100V Non-Polarized | Passive / Capacitor / TH / - |  | CAP ELECT 2.2UF 100V NON POLARIZED | 37531 |
| C10E-470R | Capacitor Electrolytic 470UF 10V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT 470UF 10V | 37540 |
| C10TG-150M | Capacitor Tantalum 150UF 10V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 150UF 10V | 37542 |
| C10TG-33M | Capacitor Tantalum 33UF 10V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 33UF 10V | 37543 |
| C10TG-4M7 | Capacitor Tantalum 4.7UF 10V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 4.7UF 10V | 37544 |
| C10TG-68M | Capacitor Tantalum 68UF 10V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 68UF 10V | 37546 |
| C25E-100 | Capacitor Electrolytic Axial 100UF 25V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT AXL 100UF 25V | 43539 |
| C25E-2200R | Capacitor Electrolytic Radial 2200UF 35V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 2200UF 35V | 37557 |
| C25E-22R | Capacitor Electrolytic Radial 22UF 25V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 22UF 25V (SEE NOTES) | 37558 |
| C25E-47R | Capacitor Electrolytic Radial 47UF 25V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 47UF 25V | 37559 |
| C350E-10R | Capacitor Electrolytic Radial 10UF 350V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 10UF 350V | 37561 |
| C35E-1000R | Capacitor Electrolytic Radial 1000UF 35V | Passive / Capacitor / TH / - | yes | RoHS CAP RADIAL ELECT 1000UF 35V | 37562 |
| C35E-220R | Capacitor Electrolytic Radial 220UF 35V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 220UF 35V | 37564 |
| C35TG-10M | Capacitor Tantalum 10UF 35V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 10UF 35V | 37565 |
| C35TG-1M | Capacitor Tantalum 1.0UF 35V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 1.0UF 35V | 37566 |
| C35TG-22M | Capacitor Tantalum 22UF 35V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 22UF 35V | 37568 |
| C40E-220 | Capacitor Electrolytic Axial 220UF 40V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT AXL 220UF 40V | 37570 |
| C50E-10R | Capacitor Electrolytic Radial NP 10UF 50V | Passive / Capacitor / TH / - |  | CAP ELECT RAL NP 10UF 50V | 37587 |
| C50E-470R | Capacitor Electrolytic Radial 470UF 50V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 470UF 50V | 37588 |
| C50E-47R | Capacitor Electrolytic Radial 47UF 50V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 47UF 50V | 37589 |
| C6.3TG-330M | Capacitor Tantalum 330UF 6.3V | Passive / Capacitor / TH / - | yes | RoHS CAP TANTALUM 330UF 6.3V | 37796 |
| C63E-22R | Capacitor Electrolytic Radial 22UF 63V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 22UF 63V | 37798 |
| C63E-330R | Capacitor Electrolytic Radial 330UF 63V | Passive / Capacitor / TH / - | yes | RoHS CAP ELECT RAL 330UF 63V | 37799 |
| C63F-105K | Capacitor Film Radial 1UF 63V | Passive / Capacitor / TH / - | yes | RoHS CAP FILM 1UF 63V RADIAL | 216960 |
| C63F-224K | Capacitor Film Radial 0.22UF 63V | Passive / Capacitor / TH / - | yes | RoHS CAP FILM 0.22UF 63V RADIAL | 216887 |
| C63F-684K | Capacitor Film Radial 0.68UF 63V | Passive / Capacitor / TH / - | yes | RoHS CAP FILM 0.68UF 63V RADIAL | 216876 |
| CV-2P-18P | Capacitor Variable 2PF to 18PF | Passive / Capacitor / TH / - |  | CAP VARIABLE 2PF TO 18PF | 37858 |
| C50PE-683 | Capacitor  0.068UF 100V 5% | Passive / Capacitor / TH / 0.05 / -0.05 | yes | RoHS CAP  0.068UF 100V 5% | 37792 |
| BLM41PG471SN1 | Ferrite Bead 470 Ohm Surface mount 1806 Package | Passive / Filter / SM | yes | RoHS FERRITE BEAD 470 OHM 1806 PKG | 37504 |
| BLM41PG600SN1 | Ferrite Bead 60 Ohm  Surface mount 1806 Package | Passive / Filter / SM | yes | RoHS FERRITE BEAD 60 OHM 1806 PKG | 37505 |
| LI0805G301R | Ferrite Bead Signal 300 Ohm Surface Mount 805 Package | Passive / Filter / SM | yes | RoHS FERRITE BEAD SIGNAL 300 OHM 805SM | 41629 |
| L3A7-22 | Inductor Radial 22UH 3.7A | Passive / Inductor | yes | RoHS IND 22UH 3.7A RADIAL | 216880 |
| PE-53823 | Inductor 38U 1A | Passive / Inductor | yes | RoHS INDUCTOR 38U 1A | 41477 |
| PTL1608-F18NT/SM | Inductor Photolithographic 18NH | Passive / Inductor |  | INDUCTOR PHOTOLITHOGRAPIC 18NH | 41021 |
| PTL1608-F2N7S/SM | Inductor Photolithographic 2N7H | Passive / Inductor | yes | RoHS INDUCTOR PHOTOLITHOGRAPIC 2N7H | 41022 |
| PTL1608-F3N3S/SM | Inductor Photolithographic 3N3H | Passive / Inductor | yes | RoHS INDUCTOR PHOTOLITHOGRAPIC 3N3H | 41023 |
| PTL1608-F3N9S/SM | Inductor Photolithographic 3N9H | Passive / Inductor | yes | RoHS INDUCTOR PHOTOLITHOGRAPIC 3N9H | 41024 |
| PTL1608-F4N7S/SM | Inductor Photolithographic 4N7H | Passive / Inductor | yes | RoHS INDUCTOR PHOTOLITHOGRAPIC 4N7H | 41025 |
| PTL1608-F8N2S/SM | Inductor Photolithographic 8N2H | Passive / Inductor |  | INDUCTOR PHOTOLITHOGRAPIC 8N2H | 41026 |
| L3A0-47 | Inductor Radial 47UH 3.0A | Passive / Inductor / Radial | yes | RoHS IND 47UH 3.0A RADIAL | 216957 |
| L3A6-33 | Inductor Radial 33UH 3.6A Through Hole | Passive / Inductor / Radial | yes | RoHS IND 33UH 3.6A RADIAL TH | 216962 |
| 380LB-1R0K | Inductor 1uH Surface Mount | Passive / Inductor / SM | yes | RoHS INDUCTOR 1uH SMT PKG | 36423 |
| 380LB-2R7K | Inductor 2.7uH Surface Mount | Passive / Inductor / SM | yes | RoHS INDUCTOR 2.7uH SMT PKG | 36424 |
| 380NB-R68M | Inductor 0.68uH Surface Mount | Passive / Inductor / SM | yes | RoHS INDUCTOR 0.68uH SMT PKG | 36425 |
| IDCP-3020-47UH-20 | Inductor 47uH Surface Mount | Passive / Inductor / SM | yes | RoHS INDUCTOR 47uH SMT ***E-SONIC* | 41966 |
| L140M-5N6-Q13/SM 402 | Inductor 5N6H Surface Mount 402 Package | Passive / Inductor / SM | yes | RoHS IND 5N6H 402 | 42771 |
| LQP15MN-4N7B02/SM | Inductor Photolithographic 4N7H Surface Mount 402 Package | Passive / Inductor / SM | yes | RoHS IND PHOTOLITHOGRAPIC 4N7H 402 SM | 41654 |
| CSX-750V-12.288 | Crystal Oscillator 12.288MHz Surface Mount | Passive / Passive / Crystal / SM / - | yes | RoHS CRYSTAL OSCILLATOR 12.288MHZ SMT | 37855 |
| CSX-750V-24.576 | Crystal Oscillator 24.576MHz Surface Mount | Passive / Passive / Crystal / SM / - | yes | RoHS CRYSTAL OSCILLATOR 24.576MHZ SMT | 37856 |
| CSX-750V-27.000 | Crystal Oscillator 27.000MHz Surface Mount | Passive / Passive / Crystal / SM / - | yes | RoHS CRYSTAL OSCILLATOR 27.000MHZ SMT | 37857 |
| S1-27MHZ/SM | Crystal 27.000 MHz Surface Mount 18pF | Passive / Passive / Crystal / SM / - | yes | RoHS CRYSTAL 27.000 MHZ SMT 18pF | 40876 |
| SG-636PCE27M | Crystal 27 MHz Surface Mount | Passive / Passive / Crystal / SM / - |  | CRYSTAL 27 MHZ SMT PKG | 40592 |
| MHO+13FAD4.9152 | Crystal 4.9152 MHz | Passive / Passive / Crystal / TH / - | yes | RoHS CRYSTAL 4.9152 MHz | 41412 |
| S1-12M288 | Crystal 12.288 MHz 18pF | Passive / Passive / Crystal / TH / - |  | CRYSTAL 12.288 MHZ 18pF | 40871 |
| S1-14M31818 | Crystal 14.31818 MHz | Passive / Passive / Crystal / TH / - | yes | RoHS CRYSTAL 14.31818 MHZ | 40872 |
| S1-24M576 | Crystal 24.576 MHz | Passive / Passive / Crystal / TH / - | yes | RoHS CRYSTAL 24.576 MHZ | 40873 |
| S1-24M576TALL | Crystal 24.576 MHz | Passive / Passive / Crystal / TH / - |  | CRYSTAL 24.576 MHZ | 42937 |
| S1-27MHZ | Crystal 27.000 MHz | Passive / Passive / Crystal / TH / - |  | CRYSTAL 27.000 MHZ | 40875 |
| S1-3.58MHZ | Crystal 3.579545MHz. 003% HC49U | Passive / Passive / Crystal / TH / - |  | CRYSTAL 3.579545MHZ.003% HC49U | 40877 |
| S1-4M9152 | Crystal 4.9152MHz | Passive / Passive / Crystal / TH / - | yes | RoHS CRYSTAL 4.9152MHZ | 40878 |
| S1-6M144 | Crystal 6.144MHz | Passive / Passive / Crystal / TH / - | yes | RoHS CRYSTAL 6.144MHZ | 40879 |
| S1-8MHZ | Crystal 8MHz | Passive / Passive / Crystal / TH / - |  | CRYSTAL 8MHZ | 40579 |
| T500-1670B1 | Crystal Clock Oscillator | Passive / Passive / Crystal / TH / - | yes | RoHS CRYSTAL CLOCK OSCILLATOR (Notes) | 40663 |
| T500-1670D | Crystal Clock Oscillator | Passive / Passive / Crystal / TH / - |  | CRYSTAL CLOCK OSCILLATOR | 40664 |
| GO1525 | I/C Crystal 14.140 MHz Gennum | Passive / Passive / crystal - I / C / TH | yes | RoHS I/C GENNUM 14.140 MHz CRYSTAL | 41921 |
| GO1535 | I/C Crystal 14.140 MHz Gennum | Passive / Passive / crystal - I / C / TH | yes | RoHS I/C GENNUM 14.140 MHz CRYSTAL | 41922 |
| PT10H-20K | Potentiometer Horizontal Adjust PCB Mounting 20K | Passive / Potentiometer / Horizontal | yes | RoHS POT HORIZ ADJUST PCB MTG 20K | 41007 |
| PT10H-2K | Potentiometer Horizontal Adjust PCB Mounting 2K | Passive / Potentiometer / Horizontal | yes | RoHS POT HORIZ ADJUST PCB MTG 2K | 41008 |
| PT10H-500 | Potentiometer Horizontal Adjust PCB Mounting 0.5K | Passive / Potentiometer / Horizontal | yes | RoHS POT HORIZ ADJ PCB MTG 500 OHM | 41009 |
| PT10H-50K | Potentiometer Horizontal Adjust PCB Mounting 50K | Passive / Potentiometer / Horizontal | yes | RoHS POT HORIZ ADJUST PCB MTG 50K | 41010 |
| PT10H-5K | Potentiometer Horizontal Adjust PCB Mounting 5K | Passive / Potentiometer / Horizontal | yes | RoHS POT HORIZ ADJUST PCB MTG 5K | 41011 |
| 3329H-1-103 | Potentiometer Miniature 10K | Passive / Potentiometer / Mini | yes | RoHS MINIATURE 10K POTENTIOMETER | 36394 |
| 3329H-1-202 | Potentiometer Miniature 2K | Passive / Potentiometer / Mini | yes | RoHS MINIATURE 2K POTENTIOMETER | 36395 |
| 3329H-1-203 | Potentiometer Miniature 20K | Passive / Potentiometer / Mini | yes | RoHS MINIATURE 20K POTENTIOMETER | 36396 |
| P160KNP-0EC15B10K | Potentiometer 16mm Rotary Encoder Panel | Passive / Potentiometer / Rotary | yes | RoHS Potentiometers 16mm ROTARY PNL POT | 217242 |
| 3006P10K | Potentiometer Trimmer 10K | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT 10K BOURNS | 35116 |
| 3006P2K | Potentiometer Trimmer 2K | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT 2K BOURNS | 35118 |
| 3006P501 | Potentiometer Trimmer 500 Ohm | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT 500 OHMS BOURNS | 35119 |
| 3006P5K | Potentiometer Trimmer 5K | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT 5K BOURNS | 35121 |
| 3296W-1-104 | Potentiometer Trimmer 100K Multiturn | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT BOURNS 100K MULTITURN | 35160 |
| 3329H-1-501 | Potentiometer Trimmer 500 Ohm | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT BOURNS 500 OHM | 36397 |
| 3362M-1-203 | Potentiometer Trimmer 20K Ohm 0.5W PC Pin | Passive / Potentiometer / Trimmer | yes | RoHS TRIMMER 20K OHM 0.5W PC PIN | 217283 |
| 3362M-1-502 | Potentiometer Trimmer 5K Ohm 0.5W PC Pin | Passive / Potentiometer / Trimmer | yes | RoHS TRIMMER 5K OHM 0.5W PC PIN | 217282 |
| 3362M-1-503 | Potentiometer Trimmer 50K Ohm 0.5W PC Pin | Passive / Potentiometer / Trimmer | yes | RoHS TRIMMER 50K OHM 0.5W PC PIN | 217284 |
| RJC097PK1-B-202K | Potentiometer Trimmer 2K Tocos | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT 2K Tocos | 40856 |
| RJC097PK1-B-502K | Potentiometer Trimmer 5K Tocos | Passive / Potentiometer / Trimmer | yes | RoHS TRIMPOT 5K Tocos | 40857 |
| PT10V-1K | Potentiometer Trimmer Vertical Adjust PCB Mounting 1K | Passive / Potentiometer / Trimmer / Vertical | yes | RoHS POT VERT ADJUST PCB MTG 1K | 41012 |
| PT10V-20K | Potentiometer Trimmer Vertical Adjust PCB Mounting 20K | Passive / Potentiometer / Trimmer / Vertical | yes | RoHS POT VERT ADJUST PCB MTG 20K | 41013 |
| PT10V-2K | Potentiometer Trimmer Vertical Adjust PCB Mounting 2K | Passive / Potentiometer / Trimmer / Vertical | yes | RoHS POT VERT ADJUST PCB MTG 2K | 41014 |
| PT10V-500 | Potentiometer Trimmer Vertical Adjust PCB Mounting 500 Ohm | Passive / Potentiometer / Trimmer / Vertical | yes | RoHS POT VERT ADJ PCB MTG 500 OHM | 41015 |
| PT10V-50K | Potentiometer Trimmer Vertical Adjust PCB Mounting 50K | Passive / Potentiometer / Trimmer / Vertical | yes | RoHS POT VERT ADJUST PCB MTG 50K | 41016 |
| PT10V-5K | Potentiometer Trimmer Vertical Adjust PCB Mounting 5K | Passive / Potentiometer / Trimmer / Vertical | yes | RoHS POT VERT ADJUST PCB MTG 5K | 41017 |
| 10-080 | Potentiometer Dual 10K Linear Taper with Center Detent | Passive / Potentiometer / dual |  | POT DUAL 10K LINEAR TAPER CD | 34517 |
| 10-081 | Potentiometer Dual 10K with Switch Logarithmic TOCOS | Passive / Potentiometer / dual | yes | RoHS POT DUAL 10K + SWITCH LOG TOCOS | 217300 |
| 10-1/4W-1%/SM | Resistor 1/4W 10 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 10 OHM 1% 1206 SMT | 34520 |
| 100-1/4W-1%/SM | Resistor 1/4W 100 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 100 OHM 1% 1206 SMT | 34525 |
| 100K-1/4W-1%/SM | Resistor 1/4W 100K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 100K OHM 1% 1206 SMT | 34530 |
| 10K-1/4W-1%/SM | Resistor 1/4W 10K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 10K OHM 1% 1206 SMT | 34538 |
| 110-1/4W-1%/SM | Resistor 1/4W 110 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 110 OHM 1% 1206 SMT | 34549 |
| 150-1/4W-1%/SM | Resistor 1/4W 150 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 150 OHM 1% 1206 SMT | 34578 |
| 15K-1/4W-1%/SM | Resistor 1/4W 15K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 15K OHM 1% 1206 SMT | 34586 |
| 17R4-1/8W-1%/SM | Resistor 1/4W 17.4 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 17.4 OHM 1% 1206 SMT | 35010 |
| 1K-1/4W-1%/SM | Resistor 1/4W 1K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K OHM 1% 1206 SMT | 35044 |
| 1K1-1/4W-1%/SM | Resistor 1/4W 1K1 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K1 OHM 1% 1206 SMT | 35056 |
| 20-1/4W-1%/SM | Resistor 1/4W 20 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 20 OHM 1% 1206 SMT | 35117 |
| 20K-1/4W-1%/SM | Resistor 1/4W 20K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 20K OHM 1% 1206 SMT | 35138 |
| 221-1/4W-1%/SM | Resistor 1/4W 221 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 221 OHM 1% 1206 SMT | 35189 |
| 22K1-1/4W-1%/SM | Resistor 1/4W 22.1K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 22K1 OHM 1% 1206 SMT | 34993 |
| 261-1/4W-1%/SM | Resistor 1/4W 261 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 261 OHM 1% 1206 SMT | 35033 |
| 2K55-1/4W-1%/SM | Resistor 1/4W 2.55K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 2K55 OHM 1% 1206 SMT | 35076 |
| 330-1/4W-1%/SM | Resistor 1/4W 332 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 332 OHM 1% 1206 SMT | 35179 |
| 33R2-1/4W-1%/SM | Resistor 1/4W 33.2 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 33R2 OHM 1% 1206 SMT | 36407 |
| 374-1/4W-1%/SM | Resistor 1/4W 374 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 374 OHM 1% 1206 SMT | 36418 |
| 3K32-1/4W-1%/SM | Resistor 1/4W 3.32K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K32 OHM 1% 1206 SMT | 36435 |
| 3K48-1/4W-1%/SM | Resistor 1/4W 3.48K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 3K48 OHM 1% 1206 SMT | 36437 |
| 3K57-1/4W-1%/SM | Resistor 1/4W 3.57K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K57 OHM 1% 1206 SMT | 36440 |
| 3K65-1/4W-1%/SM | Resistor 1/4W 3.65K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K65 OHM 1% 1206 SMT | 36443 |
| 43K2-1/4W-1%/SM | Resistor 1/4W 43.2K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 43K2 OHM 1% 1206 SMT | 36449 |
| 47K5-1/4W-5%/SM | Resistor 1/4W 47.5K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 47K5 OHM 1% 1206 SMT | 36460 |
| 47R5-1/4W-1%/SM | Resistor 1/4W 47.5 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 47.5 OHM 1% 1206 SMT | 36462 |
| 4K7-1/4W-1%/SM | Resistor 1/4W 4.75K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 4K75 OHM 1% 1206 SMT | 36471 |
| 5K62-1/4W-1%/SM | Resistor 1/4W 5.62K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 5K62 OHM 1% 1206 SMT | 35730 |
| 75-1/4W-1%/SM | Resistor 1/4W 75 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 75 OHM 1% 1206 SMT | 37098 |
| 750-1/4W-1%/SM | Resistor 1/4W 750 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 750 OHM 1% 1206 SMT | 37103 |
| 1K5-1/4W-1%/SM | Resistor 1/8W 1K5 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 1K5 OHM 1% 1206 SMT | 35069 |
| 1M-1/4W-1%/SM | Resistor 1/8W 1Meg Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 1MEG OHM 1% 1206 SMT | 35090 |
| 200K-1/4W-1%/SM | Resistor 1/8W 200K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 200K OHM 1% 1206 SMT | 35124 |
| 300-1/4W-1%/SM | Resistor 1/8W 301 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 301 OHM 1% 1206 SMT | 35112 |
| 511-1/4W-1%/SM | Resistor 1/8W 511 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 511 OHM 1% 1206 SMT | 36478 |
| 54R9-1/4W-1%/SM | Resistor 1/8W 54.9 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 54R9 OHM 1% 1206 SMT | 36482 |
| 5K49-1/4W-1%/SM | Resistor 1/8W 5.49K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 5K49 OHM 1% 1206 SMT | 35727 |
| 665-1/4W-1%/SM | Resistor 665 Ohm 1/8W 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | 665 OHM 1/8W 1 % RSTR 1206 SMT | 35750 |
| 68R1-1/4W-1%/SM | Resistor 1/8W 68.1 Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 68R1 OHM 1% 1206 SMT | 35762 |
| 6K81-1/4W-1%/SM | Resistor 1/8W 6.81K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 6K81 OHM 1% 1206 SMT | 35770 |
| 7K5-1/4W-1%/SM | Resistor 1/8W 7.5K Ohm 1% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 7K5 OHM 1% 1206 SMT | 37109 |
| 0-1/4W-5%/SM | Resistor 1/4W 0 Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 0 OHM 5% 1206 SMT | 34498 |
| 180-1/4W-5%/SM | Resistor 1/4W 180 Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 180 OHM 5% 1206 SMT | 35026 |
| 220K-1/8W-5%/SM | Resistor 1/4W 220K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 220K OHM 5% 1206 SMT | 35186 |
| 24-1/4W-5%/SM | Resistor 1/4W 24 Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 24 OHM 5% SMT 1206 PKG | 34998 |
| 2K-1/4W-5%/SM | Resistor 1/4W 2K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 2K OHM 5% 1206 SMT | 35060 |
| 2K4-1/4W-5%/SM | Resistor 1/4W 2.4K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 2K4 OHM 5% 1206 SMT | 35072 |
| 30-1/4W-5%/SM | Resistor 1/8W 30 Ohm 5%  Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 30 OHM 5%  1206 SMT | 35106 |
| 39K-1/8W-5%/SM | Resistor 1/8W 39K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 8W / 0.05 |  | RSTR 1/8W 39K OHM 1206 SMT | 36428 |
| 3K-1/4W-5%/SM | Resistor 1/8W 3K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 3K OHM 1206 SMT | 36430 |
| 3K3-1/4W-5%/SM | Resistor 1/8W 3.3K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 3K3 OHM 5% 1206 SMT | 36434 |
| 5K1-1/4W-5%/SM | Resistor 1/8W 5.1K Ohm 5% Surface Mount 1206 Package | Passive / Resistor / SM / 1206 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 5K1 OHM 5% 1206 SMT | 35724 |
| 30R1-1/2W-1%/SM 2010 | Resistor 1/2W 30 Ohm 1%  Surface Mount 2010 Package | Passive / Resistor / SM / 2010 / 0.01 / -1 / 2W / 0.01 | yes | RoHS RSTR 1/2W 30 OHM 1%  2010 SMT | 35147 |
| 0-1/2W-5%/SM 2010 | Resistor 1/2W 0 Ohm 5%  Surface Mount 2010 Package | Passive / Resistor / SM / 2010 / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 0 OHM 5%  2010 SMT | 34496 |
| 300-1/2W-5%/SM 2010 | Resistor 1/2W 300 Ohm 5%  Surface Mount 2010 Package | Passive / Resistor / SM / 2010 / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 300 OHM 5%  2010 SMT | 35110 |
| 4R7-1/2W-5%/SM 2010 | Resistor 1/2W 4.7 Ohm 5%  Surface Mount 2010 Package | Passive / Resistor / SM / 2010 / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 4.7 OHM 5%  2010 SMT | 36475 |
| 37R5-1/10W-1%/SM 402 | Resistor 1/10W 37.5 Ohm 1% Surface Mount 402 Package | Passive / Resistor / SM / 402 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 37R5 OHM 1% 402 SMT | 36420 |
| 75-1/10W-1%/SM 402 | Resistor 1/10W 75 Ohm 1% Surface Mount 402 Package | Passive / Resistor / SM / 402 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 75 OHM 1% 402 SMT | 37096 |
| 0-1/16W-1%/SM 402 | Resistor 1/16W 0 Ohm 1% Surface Mount 402 Package | Passive / Resistor / SM / 402 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 0 OHM 1% 402 SMT | 42615 |
| 105-1/16W-1%/SM 402 | Resistor 1/16W 105 Ohm 1% Surface Mount 402 Package | Passive / Resistor / SM / 402 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 105 OHM 1% 402 SMT | 42618 |
| 200-1/16W-1%/SM 402 | Resistor 1/16W 200 Ohm 1% Surface Mount 402 Package | Passive / Resistor / SM / 402 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 200 OHM 1% 402 SMT | 42622 |
| 10-1/10W-1%/SM 603 | Resistor 1/10W 10 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 10 OHM 1% 603 SMT | 42616 |
| 100K-1/10W-1%/SM 603 | Resistor 1/10W 100K Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 100K OHM 1% 603 SMT | 216872 |
| 105-1/10W-1%/SM 603 | Resistor 1/10W 105 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 105 OHM 1% 603 SMT | 42617 |
| 20K-1/10W-1%/SM 603 | Resistor 1/10W 20K Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 20K OHM 1% 603 SMT | 216866 |
| 25R5-1/10W-1%/SM 603 | Resistor 1/10W 25.5 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 25R5 OHM 1% 603 SMT | 35013 |
| 280-1/4W-1%/SM 603 | Resistor 1/10W 280 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 280 OHM 1% 603 SMT | 35041 |
| 4K64-1/10W-1%/SM 603 | Resistor 1/10W 4.64K Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 4K64 OHM 1% 603 SMT | 216959 |
| 6K81-1/10W-1%/SM 603 | Resistor 1/10W 6.81K Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 6K81 OHM 1% 603 SMT | 216958 |
| 10K-1/4W-1%/SM 603 | Resistor 1/16W 10K Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 10K OHM 1% 603 SMT | 34539 |
| 16K2-1/10W-1%/SM 603 | Resistor 1/16W 16K2 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 16K2 OHM 1% 603 SMT | 216870 |
| 1K-1/4W-1%/SM 603 | Resistor 1/16W 1K Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 1K OHM 1% 603 SMT | 35046 |
| 37R5-1/4W-1%/SM 603 | Resistor 1/16W 37.4 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 37R4 OHM 1% 603 SMT PKG | 36421 |
| 49R9-1/4W-1%/SM 603 | Resistor 1/16W 49.9 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 49R9 OHM 1% 603 SMT | 36465 |
| 68R1-1/4W-1%/SM 603 | Resistor 1/16W 68.1 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 68R1 OHM 1% 603 SMT | 35763 |
| 75-1/4W-1%/SM 603 | Resistor 1/16W 75 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 75 OHM 1% 603 SMT PKG | 37099 |
| 750-1/16W-1%/SM 603 | Resistor 1/16W 750 Ohm 1% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.01 / -1 / 16W / 0.01 | yes | RoHS RSTR 1/16W 750 OHM 1% 603 SMT | 42703 |
| 110-1/10W-5%/SM 603 | Resistor 1/10W 110 Ohm 5% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.05 / -1 / 10W / 0.05 | yes | RoHS RSTR 1/10W 110 OHM 5% 603 SMT | 216868 |
| 30K-1/10W-5%/SM 603 | Resistor 1/10W 30K Ohm 5% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.05 / -1 / 10W / 0.05 | yes | RoHS RSTR 1/10W 30K OHM 5% 603 SMT | 216961 |
| 3K-1/10W-5%/SM 603 | Resistor 1/10W 3K Ohm 5% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.05 / -1 / 10W / 0.05 | yes | RoHS RSTR 1/10W 3K OHM 5% 603 SMT | 216869 |
| 470-1/16W-1%/SM 603 | Resistor 1/10W 470 Ohm 5% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.05 / -1 / 10W / 0.05 | yes | RoHS RSTR 1/10W 470 OHM 5% 603 SMT | 216867 |
| 47K-1/10W-5%/SM 603 | Resistor 1/10W 47K Ohm 5% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.05 / -1 / 10W / 0.05 | yes | RoHS RSTR 1/10W 47K OHM 5% 603 SMT | 216871 |
| 0-1/4W-5%/SM 603 | Resistor 1/16W 0 Ohm 5% Surface Mount 603 Package | Passive / Resistor / SM / 603 / 0.05 / -1 / 16W / 0.05 | yes | RoHS RSTR 1/16W 0 OHM 5% 603 SMT | 34499 |
| 1K5-1/4W-1%/SM 805 | Resistor 1/10W 1K5 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 |  | RSTR 1/10W 1K5 OHM 1% 805 SMT | 35071 |
| 21K5-1/4W-1%/SM 805 | Resistor 1/10W 21.5K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 21K5 OHM 1% 805 SMT | 35158 |
| 280-1/4W-1%/SM 805 | Resistor 1/10W 280 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 280 OHM 1% 805 SMT | 35043 |
| 365-1/4W-1%/SM 805 | Resistor 1/10W 365 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 |  | RSTR 1/10W 365 OHM 1% 805 SMT | 36414 |
| 374-1/4W-1%/SM 805 | Resistor 1/10W 374 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 374 OHM 1% 805 SMT PKG | 36419 |
| 37R5-1/4W-1%/SM 805 | Resistor 1/10W 37.4 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 37R4 OHM 1% 805 SMT | 36422 |
| 39K2-1/4W-5%/SM 805 | Resistor 1/10W 39.2K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 39K2 OHM 1% 805 SMT | 36429 |
| 3K48-1/4W-1%/SM 805 | Resistor 1/10W 3.48K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 3K48 OHM 1% 805 SMT | 36438 |
| 49R9-1/4W-5%/SM 805 | Resistor 1/10W 49.9 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 49R9 OHM 1% 805 SMT | 36466 |
| 511-1/4W-1%/SM 805 | Resistor 1/10W 511 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 511OHM 1% 805 SMT PKG | 36479 |
| 54R9-1/4W-1%/SM 805 | Resistor 1/10W 54.9 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 54R9 OHM 805 SMT PKG | 36483 |
| 620-1/4W-1%/SM 805 | Resistor 1/10W 619 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 619 OHM 1% 805 SMT | 35738 |
| 68-1/4W-1%/SM 805 | Resistor 1/10W 68 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 68 OHM 1% 805 SMT PKG | 35754 |
| 6K81-1/4W-1%/SM 805 | Resistor 1/10W 6.81K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 6K81 OHM 1% 805 SMT PKG | 35771 |
| 75-1/4W-1%/SM 805 | Resistor 1/10W 75 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 10W / 0.01 | yes | RoHS RSTR 1/10W 75 OHM 1% 805 SMT | 37100 |
| 100K-1/4W-1%/SM 805 | Resistor 1/4W 100K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 100K OHM 1% 805 SMT | 34531 |
| 10K-1/4W-1%/SM 805 | Resistor 1/4W 10K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 10K OHM 1% 805 SMT | 34540 |
| 110-1/4W-1%/SM 805 | Resistor 1/4W 110 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 110 OHM 1% 805 SMT | 34550 |
| 121-1/4W-1%/SM 805 | Resistor 1/4W 121 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 121 OHM 1% 805 SMT | 34556 |
| 127-1/4W-1%/SM 805 | Resistor 1/4W 127 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 127 OHM 1% 805 SMT | 34558 |
| 150-1/4W-1%/SM 805 | Resistor 1/4W 150 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 150 OHM 1% 805 SMT | 34579 |
| 15K-1/4W-1%/SM 805 | Resistor 1/4W 15K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 15K OHM 1% 805 SMT | 34587 |
| 16K2-1/4W-1%/SM 805 | Resistor 1/4W 16K2 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 16K2 OHM 1% 805 SMT | 35006 |
| 1K-1/4W-1%/SM 805 | Resistor 1/4W 1K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K OHM 1% 805 SMT | 35048 |
| 1K13-1/4W-1%/SM 805 | Resistor 1/4W 1K13 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K13 OHM 1% 805 SMT | 35058 |
| 1K27-1/4W-1%/SM 805 | Resistor 1/4W 1K27 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K27 OHM 1% 805 SMT | 35064 |
| 1K47-1/4W-1%/SM 805 | Resistor 1/4W 1K47 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K47 OHM 1% 805 SMT | 35068 |
| 1K65-1/4W-1%/SM 805 | Resistor 1/4W 1K65 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K65 OHM 1% 805 SMT | 35079 |
| 1K91-1/4W-1%/SM 805 | Resistor 1/4W 1K91 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K91 OHM 1% 805 SMT | 35085 |
| 22K1-1/4W-1%/SM 805 | Resistor 1/4W 22.1K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 22K1 OHM 1% 805 SMT | 34994 |
| 2K-1/4W-1%/SM 805 | Resistor 1/4W 2K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K OHM 1% 805 SMT | 35055 |
| 2K15-1/4W-1%/SM 805 | Resistor 1/4W 2.15K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K15 OHM 1% 805 SMT | 35061 |
| 2K21-1/4W-1%/SM 805 | Resistor 1/4W 2.21K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K21 OHM 1% 805 SMT | 35066 |
| 2K55-1/4W-1%/SM 805 | Resistor 1/4W 2.55K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K55 OHM 1% 805 SMT | 35078 |
| 301-1/4W-1%/SM 805 | Resistor 1/4W 301 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 301 OHM 1% 805 SMT | 35125 |
| 30K9-1/4W-1%/SM 805 | Resistor 1/4W 30.9K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 30K9 OHM 1% 805 SMT | 35145 |
| 332-1/4W-1%/SM 805 | Resistor 1/4W 332 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 332 OHM 1% 805 SMT | 36393 |
| 3K01-1/4W-1%/SM 805 | Resistor 1/4W 3.01K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K01 OHM 1% 805 SMT | 36432 |
| 3K32-1/4W-1%/SM 805 | Resistor 1/4W 3.32K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K32 OHM 1% 805 SMT | 36436 |
| 3K57-1/4W-1%/SM 805 | Resistor 1/4W 3.57K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K57 OHM 1% 805 SMT | 36441 |
| 475K-1/4W-1%/SM 805 | Resistor 1/4W 475K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 475K OHM 1% 805 SMT | 36457 |
| 47K5-1/4W-5%/SM 805 | Resistor 1/4W 47.5K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 47K5 OHM 1% 805 SMT | 36461 |
| 47R5-1/4W-1%/SM 805 | Resistor 1/4W 47.5 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 47.5 OHM 1% 805 SMT | 36463 |
| 4K32-1/4W-1%/SM 805 | Resistor 1/4W 4.32K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 4K32 OHM 1% 805 SMT | 36469 |
| 5K36-1/4W-1%/SM 805 | Resistor 1/4W 5.36K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 5K36 OHM 1% 805 SMT | 35726 |
| 5K49-1/4W-1%/SM 805 | Resistor 1/4W 5.49K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 5K49 OHM 1% 805 SMT PKG | 35728 |
| 5K76-1/4W-1%/SM 805 | Resistor 1/4W 5.76K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 5K76 OHM 1% 805 SMT | 217475 |
| 681-1/4W-1%/SM 805 | Resistor 1/4W 681 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 681 OHM 1% 805 SMT | 35759 |
| 6K49-1/4W-1%/SM 805 | Resistor 1/4W 6.49K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 6K49 OHM 1% 805 SMT | 35768 |
| 6K98-1/4W-1%/SM 805 | Resistor 1/4W 6.98K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 6K98 OHM 1% 805 SMT | 35772 |
| 750-1/4W-1%/SM 805 | Resistor 1/4W 750 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 750 OHM 1% 805 SMT | 37104 |
| 787-1/4W-1%/SM 805 | Resistor 1/4W 787 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 787 OHM 1% 805 SMT | 37107 |
| 82K5-1/4W-1%/SM 805 | Resistor 1/4W 82.5K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 82K5 OHM 1% 805 SMT | 37146 |
| 887-1/4W-1%/SM 805 | Resistor 1/4W 887 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 887 OHM 1% 805 SMT | 37150 |
| 8K06-1/4W-1%/SM 805 | Resistor 1/4W 8.06K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 8K06 OHM 1% 805 SMT | 37152 |
| 90R9-1/4W-1%/SM 805 | Resistor 1/4W 90.9 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 90R9 OHM 1% 805 SMT | 37160 |
| 9K76-1/4W-1%/SM 805 | Resistor 1/4W 9.76K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 9K76 OHM 1% 805 SMT | 37182 |
| 19K1-1/4W-1%/SM 805 | Resistor 1/8W 19K1 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 19K1 OHM 1% 805 SMT | 35034 |
| 19K6-1/4W-1%/SM 805 | Resistor 1/8W 19K6 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 19K6 OHM 1% 805 SMT | 35038 |
| 1M-1/4W-1%/SM 805 | Resistor 1/8W 1Meg Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 1MEG OHM 1% 805 SMT | 35092 |
| 20K-1/4W-1%/SM 805 | Resistor 1/8W 20K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 20K OHM 1% 805 SMT | 35140 |
| 26K1-1/4W-1%/SM 805 | Resistor 1/8W 26.1K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 |  | RSTR 1/8W 26K1 OHM 1% 805 SMT | 35035 |
| 30K1-1/8W-1%/SM 805 | Resistor 1/8W 30.1K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 30K1 OHM 805 SMT | 35143 |
| 31K6-1/4W-1%/SM 805 | Resistor 1/8W 31.6K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 31K6 OHM 1% 805 SMT | 35153 |
| 47-1/4W-1%/SM 805 | Resistor 1/8W 47.5 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 47R5 OHM 1% 805 SMT | 36452 |
| 4K75-1/4W-1%/SM 805 | Resistor 1/8W 4.75K Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 4K75 OHM 1% 805 SMT | 36473 |
| 604-1/4W-1%/SM 805 | Resistor 1/8W 604 Ohm 1% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.01 / -1 / 8W / 0.01 | yes | RoHS RSTR 1/8W 604 OHM 1% 805 SMT | 35732 |
| 0-1/4W-5%/SM 805 | Resistor 1/10W 0 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 10W / 0.05 | yes | RoHS RSTR 1/10W 0 OHM 5% 805 SMT | 34500 |
| 1K8-1/4W-5%/SM 805 | Resistor 1/10W 1K8 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 10W / 0.05 |  | RSTR 1/10W 1K8 OHM 5% 805 SMT PKG | 35083 |
| 221-1/4W-5%/SM 805 | Resistor 1/10W 221 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 10W / 0.05 |  | RSTR 1/10W 221 OHM 5% 805 SMT | 35190 |
| 10-1/4W-1%/SM 805 | Resistor 1/4W 10 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 10 OHM 5% 805 SMT | 34521 |
| 100-1/4W-1%/SM 805 | Resistor 1/4W 100 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 100 OHM 5% 805 SMT | 34526 |
| 240-1/4W-5%/SM 805 | Resistor 1/4W 240 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 240 OHM 5% SMT 805 PKG | 35000 |
| 36K-1/4W-5%/SM 805 | Resistor 1/4W 36K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 36K  5% 805 SMT | 36416 |
| 11K-1/8W-5%/SM 805 | Resistor 1/8W 11K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 11K OHM 5% 805 SMT | 217277 |
| 12K-1/8W-5%/SM 805 | Resistor 1/8W 12K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 12K OHM 5% 805 SMT | 217278 |
| 2.2M-1/8W-5%/SM 805 | Resistor 1/8W 2.2M Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 2M2 OHM 5% 805 SMT | 217281 |
| 220K-1/8W-5%/SM 805 | Resistor 1/8W 220K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 220K OHM 5% 805 SMT | 35187 |
| 270K-1/8W-5%/SM 805 | Resistor 1/8W 270K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 270K OHM 5% 805 SMT | 217280 |
| 30-1/4W-5%/SM 805 | Resistor 1/8W 30 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 30 OHM 5% 805 SMT | 35108 |
| 3K-1/4W-5%/SM 805 | Resistor 1/8W 3K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 3K OHM 5% 805 SMT | 36431 |
| 475-1/4W-5%/SM 805 | Resistor 1/8W 475 Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 475 OHM 5% 805 SMT | 36456 |
| 62K-1/8W-5%/SM 805 | Resistor 1/8W 62K Ohm 5% Surface Mount 805 Package | Passive / Resistor / SM / 805 / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 62K OHM 5% 805 SMT | 217279 |
| 100-RA4/SMT | Resistor 100 Ohm Surface Mount Array of 4 | Passive / Resistor / SM / Array / - | yes | RoHS RSTR 100 OHM ARRAY OF 4/SMT | 34528 |
| 10K-RA4/SMT | Resistor 10K Ohm Surface Mount Array of 4 | Passive / Resistor / SM / Array / - | yes | RoHS RSTR 10K OHM ARRAY/4 SMT | 34543 |
| 15-RA4/SMT | Resistor 15 Ohm Surface Mount Array of 4 | Passive / Resistor / SM / Array / - | yes | RoHS RSTR 15 OHM ARRAY OF 4/SMT | 34575 |
| 150-RA4/743-SMT | Resistor 150 Ohm Surface Mount Array of 4 | Passive / Resistor / SM / Array / - | yes | RoHS RSTR 150 OHM ARRAY OF 4/SMT | 34581 |
| 1K-RA4/SMT | Resistor 1K Ohm Surface Mount Array of 4 | Passive / Resistor / SM / Array / - | yes | RoHS RSTR 1K OHM ARRAY/4 SMT | 35052 |
| 100M-1/4W-10 | Resistor 1/4W 100 Meg Ohm 10% | Passive / Resistor / TH / -1 / 4W |  | RSTR 1/4W 100 MEG OHM 10% | 34532 |
| 301-1/2W-1% | Resistor 1/2W 301 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 2W / 0.01 | yes | RoHS RSTR 1/2W 301 OHM 1% | 35123 |
| 10-1/4W-1% | Resistor 1/4W 10 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 10 OHM 1% | 34519 |
| 100-1/4W-1% | Resistor 1/4W 100 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 100 OHM 1% | 34524 |
| 100K-1/4W-1% | Resistor 1/4W 100K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 100K OHM 1% | 34529 |
| 10K-1/4W-1% | Resistor 1/4W 10K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 10K OHM 1% | 34537 |
| 10K2-1/4W-1% | Resistor 1/4W 10K2 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 10K2 OHM 1% | 34544 |
| 110-1/4W-1% | Resistor 1/4W 110 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 110 OHM 1% | 34548 |
| 121K-1/4W-1% | Resistor 1/4W 121K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 121K OHM 1% | 34557 |
| 13K-1/4W-1% | Resistor 1/4W 13K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 13K OHM 1% | 34560 |
| 14K3-1/4W-1% | Resistor 1/4W 14K3 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 14K3 OHM 1% | 34563 |
| 150-1/4W-1% | Resistor 1/4W 150 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 150 OHM 1% | 34577 |
| 150K-1/4W-1% | Resistor 1/4W 150K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 150K OHM 1% | 34583 |
| 15K-1/4W-1% | Resistor 1/4W 15K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 15K OHM 1% | 34585 |
| 16K2-1/4W-1% | Resistor 1/4W 16K2 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 16K2 OHM 1% | 35003 |
| 18K-1/4W-1% | Resistor 1/4W 18K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 18K OHM 1% | 35028 |
| 19K6-1/4W-1% | Resistor 1/4W 19K6 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 19K6 OHM 1% | 35036 |
| 1K-1/4W-1% | Resistor 1/4W 1K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS  RSTR 1/4W 1K OHM 1% | 35042 |
| 1K1-1/4W-1% | Resistor 1/4W 1K1 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K1 OHM 1% | 35054 |
| 1K24-1/4W-1% | Resistor 1/4W 1K24 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K24 OHM 1% | 35062 |
| 1K58-1/4W-1% | Resistor 1/4W 1K58 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K58 OHM 1% | 35075 |
| 1K62-1/4W-1% | Resistor 1/4W 1K62 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K62 OHM 1% | 35077 |
| 1K8-1/4W-1% | Resistor 1/4W 1K8 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 1K8 OHM 1% | 35081 |
| 1M-1/4W-1% | Resistor 1/4W 1M Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 1M OHM 1% | 35087 |
| 20K-1/4W-1% | Resistor 1/4W 20K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 20K OHM 1% | 35136 |
| 21K5-1/4W-1% | Resistor 1/4W 21.5K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 21K5 OHM 1% | 35156 |
| 221-1/4W-1% | Resistor 1/4W 221 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 221 OHM 1% | 35188 |
| 24K3-1/4W-1% | Resistor 1/4W 24.3K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 24K3 OHM 1% | 35002 |
| 261-1/4W-1% | Resistor 1/4W 261 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 261 OHM 1% | 35031 |
| 28K7-1/4W-1% | Resistor 1/4W 28.7K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 28K7 OHM 1% | 35045 |
| 2K-1/4W-1% | Resistor 1/4W 2K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K OHM 1% | 35053 |
| 2K37-1/4W-1% | Resistor 1/4W 2.37K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K37 OHM 1% | 35067 |
| 2K43-1/4W-1% | Resistor 1/4W 2.43K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 2K43 OHM 1% | 35074 |
| 2K87-1/4W-1% | Resistor 1/4W 2.87K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 2K87 OHM 1% | 35082 |
| 30K1-1/4W-1% | Resistor 1/4W 30.1K Ohm-1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 30K1 Ohm-1% | 35141 |
| 332K-1/4W-1% | Resistor 1/4W 332K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 332K OHM 1% | 36398 |
| 33K2-1/4W-1% | Resistor 1/4W 33.2K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 33K2 OHM 1% | 36406 |
| 3K09-1/4W-1% | Resistor 1/4W 3.09K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 3K09 OHM 1% | 36433 |
| 3K32-1/4W-1% | Resistor 1/4W 3.32K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 3K32 OHM 1% | 42626 |
| 3K57-1/4W-1% | Resistor 1/4W 3.57K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 3K57 OHM 1% | 36439 |
| 432-1/4W-1% | Resistor 1/4W 432 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 432 OHM 1% | 36447 |
| 43K-1/4W-1% | Resistor 1/4W 43K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 43K OHM 1% | 36448 |
| 47K5-1/4W-1% | Resistor 1/4W 47.5K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 47K5 OHM 1% | 36459 |
| 499-1/4W-1% | Resistor 1/4W 499 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 499 OHM 1% | 36464 |
| 4K12-1/4W-1% | Resistor 1/4W 4.12K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 4K12 OHM 1% | 36467 |
| 4K7-1/4W-1% | Resistor 1/4W 4.7K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 4K7 OHM 1% | 36470 |
| 4K75-1/4W-1% | Resistor 1/4W 4.75K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 4K75 OHM 1% | 36472 |
| 51K1-1/4W-1% | Resistor 1/4W 51.1K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 51K1 OHM 1% | 36480 |
| 54R9-1/4W-1% | Resistor 1/4W 54.9 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 54R9 OHM 1% | 36481 |
| 5K1-1/4W-1% | Resistor 1/4W 5.1K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 5K1 OHM 1% | 35722 |
| 5K36-1/4W-1% | Resistor 1/4W 5.36K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 5K36 OHM 1% | 35725 |
| 619-1/4W-1% | Resistor 1/4W 619 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 |  | RSTR 1/4W 619 OHM 1% | 35737 |
| 665-1/4W-1% | Resistor 1/4W 665 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 665 OHM 1% | 35749 |
| 680K-1/4W-1% | Resistor 1/4W 680K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 680K OHM 1% | 35758 |
| 6K19-1/4W-1% | Resistor 1/4W 6.19K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 6K19 OHM 1% | 35765 |
| 6K49-1/4W-1% | Resistor 1/4W 6.49K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 6K49 OHM 1% | 35767 |
| 6K81-1/4W-1% | Resistor 1/4W 6.81K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 6K81 OHM 1% | 43733 |
| 75-1/4W-1% | Resistor 1/4W 75 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 75 OHM 1% | 37097 |
| 750-1/4W-1% | Resistor 1/4W 750 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 750 OHM 1% | 37102 |
| 7K5-1/4W-1% | Resistor 1/4W 7.5K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 7K5 OHM 1% | 37108 |
| 8K25-1/4W-1% | Resistor 1/4W 8.25K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 8K25 OHM 1% | 37154 |
| 8K45-1/4W-1% | Resistor 1/4W 8.45K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 8K45 OHM 1% | 37155 |
| 931-1/4W-1% | Resistor 1/4W 931 Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 931 OHM 1% | 37172 |
| 9K09-1/4W-1% | Resistor 1/4W 9.09K Ohm 1% | Passive / Resistor / TH / 0.01 / -1 / 4W / 0.01 | yes | RoHS RSTR 1/4W 9K09 OHM 1% | 37180 |
| 10-1/2W-5% | Resistor 1/2W 10 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 10 OHM 5% | 34518 |
| 100-1/2W-5% | Resistor 1/2W 100 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 100 OHM 5% | 34523 |
| 15-1/2W-5% | Resistor 1/2W 15 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 |  | RSTR 1/2W 15 OHM 5% | 34574 |
| 150-1/2W-5% | Resistor 1/2W 150 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 150 OHM 5% | 34576 |
| 1K-1/2W-5% | Resistor 1/2W 1K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 |  | RSTR 1/2W 1K OHM 5% | 35040 |
| 220-1/2W-5% | Resistor 1/2W 220 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 |  | RSTR 1/2W 220 OHM 5% | 35182 |
| 2R2-1/2W-5% | Resistor 1/2W 2.2 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 2.2 OHM 5% | 35098 |
| 30-1/2W-5% | Resistor 1/2W 30 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 30 OHM 5% | 35102 |
| 390-1/2W-5% | Resistor 1/2W 390 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 390 OHM 5% | 36426 |
| 4R7-1/2W-5% | Resistor 1/2W 4.7 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 | yes | RoHS RSTR 1/2W 4.7 OHM 5% | 36474 |
| 56-1/2W-5% | Resistor 1/2W 56 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 2W / 0.05 |  | RSTR 1/2W 56 OHM 5% | 35714 |
| 0-1/4W-5% | Resistor 1/4W 0 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 0 OHM 5% | 34497 |
| 10-1/4W-5% | Resistor 1/4W 10 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 10 OHM 5% | 34522 |
| 100-1/4W-5% | Resistor 1/4W 100 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 100 OHM 5% | 34527 |
| 10K-1/4W-5% | Resistor 1/4W 10K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 10K OHM 5% | 34541 |
| 10M-1/4W-5% | Resistor 1/4W 10 Meg Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 10 MEG OHM 5% | 34545 |
| 11K-1/4W-5% | Resistor 1/4W 11K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 11K OHM 5% | 34553 |
| 120-1/4W-5% | Resistor 1/4W 120 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 120 OHM 5% | 34554 |
| 120K-1/4W-5% | Resistor 1/4W 120K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 120K OHM 5% | 34555 |
| 12K-1/4W-5% | Resistor 1/4W 12K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 12K OHM 5% | 34559 |
| 150-1/4W-5% | Resistor 1/4W 150 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 150 OHM 5% | 34580 |
| 150K-1/4W-5% | Resistor 1/4W 150K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 150K OHM 5% | 34584 |
| 15K-1/4W-5% | Resistor 1/4W 15K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 15K OHM 5% | 34588 |
| 18-1/4W-5% | Resistor 1/4W 18 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 18 OHM 5% | 35012 |
| 180-1/4W-5% | Resistor 1/4W 180 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 180 OHM 5% | 35024 |
| 18K-1/4W-5% | Resistor 1/4W 18K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 18K OHM 5% | 35030 |
| 1K2-1/4W-5% | Resistor 1/4W 1K2 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 1K2 OHM 5% | 35059 |
| 1K3-1/4W-5% | Resistor 1/4W 1K3 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 1K3 OHM 5% | 35065 |
| 1K5-1/4W-5% | Resistor 1/4W 1K5 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 1K5 OHM 5% | 35073 |
| 1M-1/4W-5% | Resistor 1/4W 1 Meg Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 1 MEG OHM 5% | 35093 |
| 1R5-1/4W-5% | Resistor 1/4W 1.5 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 1.5 OHM 5% | 35115 |
| 200-1/4W-5% | Resistor 1/4W 200 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 200 OHM 5% | 35120 |
| 200K-1/4W-5% | Resistor 1/4W 200K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 200K OHM 5% | 35126 |
| 20K-1/4W-5% | Resistor 1/4W 20K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 20K OHM 5% | 35142 |
| 22-1/4W-5% | Resistor 1/4W 22 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 22 OHM 5% | 35159 |
| 220-1/4W-5% | Resistor 1/4W 220 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 220 OHM 5% | 35183 |
| 220K-1/4W-5% | Resistor 1/4W 220K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 220K OHM 5% | 35185 |
| 22K-1/4W-5% | Resistor 1/4W 22K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 22K OHM 5% | 34992 |
| 22M-1/4W-5% | Resistor 1/4W 22 Meg Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 22 MEG OHM 5% | 34995 |
| 24-1/4W-5% | Resistor 1/4W 24 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 24 OHM 5% | 34997 |
| 240-1/4W-5% | Resistor 1/4W 240 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 240 OHM 5% | 34999 |
| 270-1/4W-5% | Resistor 1/4W 270 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 270 OHM 5% | 35037 |
| 270K-1/4W-5% | Resistor 1/4W 270K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 270K OHM 5% | 35039 |
| 2K-1/4W-5% | Resistor 1/4W 2K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 2K OHM 5% | 35057 |
| 2K2-1/4W-5% | Resistor 1/4W 2.2K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 2K2 OHM 5% | 35063 |
| 2K4-1/4W-5% | Resistor 1/4W 2.4K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 2K4 OHM 5% | 35070 |
| 2K7-1/4W-5% | Resistor 1/4W 2.7K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 2K7 OHM 5% | 35080 |
| 2M2-1/4W-5% | Resistor 1/4W 2.2 Meg Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 2.2 MEG OHM 5% | 35084 |
| 2R2-1/4W-5% | Resistor 1/4W 2.2 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 2.2 OHM 5% | 35100 |
| 30-1/4W-5% | Resistor 1/4W 30 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 30 OHM 5% | 35104 |
| 300-1/4W-5% | Resistor 1/4W 300 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 300 OHM 5% | 35114 |
| 30K-1/4W-5% | Resistor 1/4W 30K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 30K OHM 5% | 35139 |
| 33-1/4W-5% | Resistor 1/4W 33 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 33 OHM 5% | 35177 |
| 330-1/4W-5% | Resistor 1/4W 330 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 330 OHM 5% | 35181 |
| 33K-1/4W-5% | Resistor 1/4W 33K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 33K OHM 5% | 36405 |
| 36K-1/4W-5% | Resistor 1/4W 36K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 36K OHM 5% | 36415 |
| 39K-1/4W-5% | Resistor 1/4W 39K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 39K OHM 5% | 36427 |
| 3K6-1/4W-5% | Resistor 1/4W 3.6K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 3K6 OHM 5% | 36442 |
| 3K9-1/4W-5% | Resistor 1/4W 3.9K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 3K9 OHM 5% | 36444 |
| 3R3-1/4W-5% | Resistor 1/4W 3.3 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 3.3 OHM 5% | 36445 |
| 47-1/4W-5% | Resistor 1/4W 47 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 47 OHM 5% | 36453 |
| 470-1/4W-5% | Resistor 1/4W 470 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 470 OHM 5% | 36454 |
| 470K-1/4W-5% | Resistor 1/4W 470K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 470K OHM 5% | 36455 |
| 47K-1/4W-5% | Resistor 1/4W 47K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 47K OHM 5% | 36458 |
| 4K3-1/4W-5% | Resistor 1/4W 4.3K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 4K3 OHM 5% | 36468 |
| 510-1/4W-5% | Resistor 1/4W 510 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 510 OHM 5% | 36477 |
| 56K-1/4W-5% | Resistor 1/4W 56K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 56K OHM 5% | 35718 |
| 5K1-1/4W-5% | Resistor 1/4W 5.1K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 5K1 OHM 5% | 35723 |
| 5K6-1/4W-5% | Resistor 1/4W 5.6K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 5K6 OHM 5% | 35729 |
| 620-1/4W-5% | Resistor 1/4W 620 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 620 OHM 5% | 42701 |
| 62K-1/4W-5% | Resistor 1/4W 62K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 62K OHM 5% | 35740 |
| 68-1/4W-5% | Resistor 1/4W 68 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 68 OHM 5% | 35755 |
| 680-1/4W-5% | Resistor 1/4W 680 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 680 OHM 5% | 35757 |
| 68K-1/4W-5% | Resistor 1/4W 68K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 68K OHM 5% | 35761 |
| 6K-1/4W-5% | Resistor 1/4W 6K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 6K OHM 5% | 217490 |
| 6K2-1/4W-5% | Resistor 1/4W 6.2K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 6K2 OHM 5% | 35766 |
| 6K8-1/4W-5% | Resistor 1/4W 6.8K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 6K8 OHM 5% | 35769 |
| 75-1/4W-5% | Resistor 1/4W 75 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 75 OHM 5% | 37101 |
| 750-1/4W-5% | Resistor 1/4W 750 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 750 OHM 5% | 37105 |
| 75K-1/4W-5% | Resistor 1/4W 75K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 75K OHM 5% | 37106 |
| 82-1/4W-5% | Resistor 1/4W 82 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 82 OHM 5% | 37142 |
| 82K-1/4W-5% | Resistor 1/4W 82K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 82K OHM 5% | 37145 |
| 8K2-1/4W-5% | Resistor 1/4W 8.2K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 8K2 OHM 5% | 37153 |
| 91-1/4W-5% | Resistor 1/4W 91 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 |  | RSTR 1/4W 91 OHM 5% | 37161 |
| 9K1-1/4W-5% | Resistor 1/4W 9.1K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 4W / 0.05 | yes | RoHS RSTR 1/4W 9K1 OHM 5% | 37181 |
| 10K-1/8W-5% | Resistor 1/8W 10K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 10K OHM 5% | 34542 |
| 1K-1/8W-5% | Resistor 1/8W 1K Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 1K OHM 5% | 35050 |
| 220-1/8W-5% | Resistor 1/8W 220 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 220 OHM 5% | 35184 |
| 330-1/8W-5% | Resistor 1/8W 330 Ohm 5% | Passive / Resistor / TH / 0.05 / -1 / 8W / 0.05 | yes | RoHS RSTR 1/8W 330 OHM 5% | 36392 |
| 15-002 | Resistor SIP 10-Pin 10K Ohm Bussed | Passive / Resistor / TH / Bussed / - | yes | RoHS SIP 10 PIN 10K OHM BUSSED | 34565 |
| 15-006 | Resistor SIP 10-Pin 3K3 Ohm Bussed | Passive / Resistor / TH / Bussed / - | yes | RoHS SIP 10 PIN 3K3 OHM BUSSED | 34566 |
| 15-015 | Resistor SIP 6-Pin 20K Ohm Bussed | Passive / Resistor / TH / Bussed / - | yes | RoHS SIP 6 PIN 20K OHM BUSSED | 34567 |
| 15-022 | Resistor SIP 10-Pin 1K Ohm Bussed | Passive / Resistor / TH / Bussed / - | yes | RoHS SIP 10 PIN 1K OHM BUSSED | 34571 |
| 15-025 | Resistor SIP 10-Pin 220 Ohm Bussed | Passive / Resistor / TH / Bussed / - | yes | RoHS SIP 10 PIN 220 OHM BUSSED | 34573 |
| R01MF-2R2 | Resistor Metal Film 1W 2.2 Ohm | Passive / Resistor / TH / Metal / - |  | RSTR METAL FILM 1W 2.2 OHM | 41041 |
| R01MF-30 | Resistor Metal Film 1W 30 Ohm | Passive / Resistor / TH / Metal / - | yes | RoHS RSTR METAL FILM 1W 30 OHM | 41042 |
| R03WE-10R | Resistor Wirewound 3.75W 10 Ohm | Passive / Resistor / TH / Wirewound / - | yes | RoHS RSTR WW 3.75W 10 OHM | 41043 |
| R03WE-22R | Resistor Wirewound 3.75W 22 Ohm | Passive / Resistor / TH / Wirewound / - |  | RSTR WW 3.75W 22 OHM | 41044 |
| R03WE-300R | Resistor Wirewound 3.75W 300 Ohm | Passive / Resistor / TH / Wirewound / - |  | RSTR WW 3.75W 300 OHM | 41045 |
| R03WE-600R | Resistor Wirewound 3.75W 600 Ohm | Passive / Resistor / TH / Wirewound / - |  | RSTR WW 3.75W 600 OHM | 41046 |
| R03WE-750R | Resistor Wirewound 3.75W 750 Ohm | Passive / Resistor / TH / Wirewound / - |  | RSTR WW 3.75W 750 OHM | 41047 |
| 15-018 | Resistor SIP 10-Pin 1K Ohm Isolated | Passive / Resistor / TH / isolated / - | yes | RoHS SIP 10 PIN 1K OHM ISOLATED | 34568 |
| 15-020 | Resistor SIP 10-Pin 330 Ohm Isolated | Passive / Resistor / TH / isolated / - | yes | RoHS SIP 10 PIN 330 OHM ISOLATED | 34569 |
| 15-021 | Resistor SIP 10-Pin 10K Ohm Isolated | Passive / Resistor / TH / isolated / - | yes | RoHS SIP 10 PIN 10K OHM ISOLATED | 34570 |
| 15-023 | Resistor SIP 10-Pin 220 Ohm Isolated | Passive / Resistor / TH / isolated / - | yes | RoHS SIP 10 PIN 220 OHM ISOLATED | 34572 |
| RXE-050/SM | Fuse Surface Mount Polyswitch Raychem | Power / Fuse / SM | yes | RoHS FUSE RAYCHEM POLYSWITCH SMT RXE | 40868 |
| RXE-100/SM | Fuse Surface Mount Polyswitch Raychem | Power / Fuse / SM | yes | RoHS FUSE RAYCHEM POLYSWITCH SMT | 40869 |
| 102068 | Fuseholder Clip Type PCB Mounting | Power / Fuse / TH | yes | RoHS FUSEHOLDER CLIP TYPE PCB MTG | 34533 |
| 218.500 | Fuse Slow Blow 0.500 Amp (5X20mm) | Power / Fuse / TH |  | FUSE SB 0.500 AMP (5X20MM) | 35146 |
| 218001 | Fuse Slow Blow 1.000 Amp (5X20mm) | Power / Fuse / TH | yes | RoHS FUSE SB 1.000 AMP (5X20MM) | 35148 |
| 218002 | Fuse Slow Blow 2.000 Amp (5X20mm) | Power / Fuse / TH |  | FUSE SB 2.000 AMP (5X20MM) | 43542 |
| 218005 | Fuse Slow Blow 5.000 Amp (5X20mm) | Power / Fuse / TH |  | FUSE SB 5.000 AMP (5X20MM) | 35150 |
| HTB-441 | Fuseholder Cap Rubber Nut | Power / Fuse / TH | yes | RoHS FUSEHOLDER CAP RUBBER NUT | 41963 |
| MDL-1.5 | Fuse Slow Blow 1.5 Amp | Power / Fuse / TH | yes | RoHS FUSE SB 1.5 AMP | 41386 |
| MDL.500 | Fuse Slow Blow 0.500 Amp | Power / Fuse / TH | yes | RoHS FUSE SB 0.500 AMP | 41387 |
| RXE-050 | Fuse Polyswitch Raychem | Power / Fuse / TH | yes | RoHS FUSE RAYCHEM POLYSWITCH | 40867 |
| EPSA240100U-P5RP-SZ | Power Supply 24V 1A AC Adapter | Power / Power Supply | yes | RoHS CUI 24V 1A AC ADAPTER | 41899 |
| HBC265-Q7061 | Power Supply 21VDC 7.0 Amp | Power / Power Supply |  | ABSOPULSE 21VDC 7.0 AMP SUPPLY | 41956 |
| IRM-15-15 | Power Supply 15 Volt DC Compact Size On Board Encapsulated | Power / Power Supply |  | 15 Volt DC Power Supply Compact Size On Board Encapsulated | 217477 |
| KLT15F-0522 | Power Supply 15 Watt Triple Output | Power / Power Supply | yes | RoHS POWER SUPPLY TRIPLE OUTPUT 15W Note | 43726 |
| MIW100-5PT-P4845 | Power Supply 15 Amp | Power / Power Supply |  | 15 AMP POWER SUPPLY | 41413 |
| NFM-10-5 | Power Supply 5VDC | Power / Power Supply |  | 5VDC POWER SUPPLY | 41463 |
| R-78E3.3-0.5 | Power Supply DC-DC Converter 3.3V 500mA | Power / Power Supply | yes | RoHS DC/DC Conv 3.3V 500mA | 216884 |
| SRP-40A-2004 | Power Supply 40 Watt +/-12 V | Power / Power Supply |  | 40 WATT POWER SUPPLY +/-12 VOLT | 43756 |
| SRP-40A-2005 | Power Supply 40 Watt +/-15V | Power / Power Supply |  | 40 Watt Powr Supply +-15 Volts | 40642 |
| EPS-15-48 | Power Supply 48V AC/DC | Power / Power Supply / AC / DC |  | EPS-15-48  (48V) PSU | 217406 |
| EPS-25-24 | Power Supply 24V AC/DC | Power / Power Supply / AC / DC |  | EPS-25-24 - 24V PSU | 217405 |
| EPS-65-24 | Power Supply AC/DC 2.7A 2" x 4" | Power / Power Supply / AC / DC |  | AC/DC Power Supply 24V 2.7A 2" x 4" | 216888 |
| GB60S24K | Power Supply AC/DC 24V 2.5A 2" x 3" | Power / Power Supply / AC / DC |  | AC/DC Power Supply 24V 2.5A 2" x 3" | 216889 |
| GRN-80-2003 | Power Supply 80 Watt +/-12V Bi-Polar AC/DC | Power / Power Supply / AC / DC |  | 12V Bi-Polar PSU - GRN-80-2003 (-12V)(GND)(+12V) | 217407 |
| PTH05000WAS | DC-to-DC Converter Surface Mount | Power / Power Supply / DC-to-DC |  | DC TO DC CONVERTER SM | 41018 |
| PTH12050WAH | DC-to-DC Converter | Power / Power Supply / DC-to-DC | yes | RoHS DC TO DC CONVERTER | 41020 |
| SUS1R5-0505 | DC-to-DC Converter Single Output Surface Mount | Power / Power Supply / DC-to-DC |  | DC TO DC CONVERTER SINGLE OUTPUT SM - Cosel | 40661 |
| SUW1R5-1212 | DC-to-DC Converter Dual Out 12V In Surface Mount | Power / Power Supply / DC-to-DC |  | DC TO DC CONVERTER DUAL OUT 12V IN SM cosel | 40662 |
| SUW1R5-2412 | DC-to-DC Converter Dual Out 24V In Surface Mount | Power / Power Supply / DC-to-DC |  | DC TO DC CONVERTER DUAL OUT 24V IN SM | 216993 |
| PTH08080WAH | DC-to-DC Converter Adjustable Switching Regulator | Power / Power Supply / DC-to-DC / switching | yes | RoHS ADJUSTABLE SWITCHING REGULATOR | 41019 |
| DPS060200UPS-P5-SZ | Power Supply External Wall 6V 4A | Power / Power Supply / External |  | PWR SUPPLY WALL 6V 4A | 37882 |
| GS60A24-P1J | Power Supply Desktop Mount 24Vdc External | Power / Power Supply / External |  | 24vdc Desk Top Power Supply | 217323 |
| 34017 | Power Supply 5V 10A Switching | Power / Power Supply / switching |  | 5V 10A Switching Power Supply | 217314 |
| LAM SCD601515 | Power Supply Switching 60W | Power / Power Supply / switching | yes | RoHS SWITCHING POWER SUPPLY 60W | 42948 |
| TE62053-ND | Transformer Power Toroidal 15V 1A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 15V 1A | 42940 |
| TE62063-ND | Transformer Power Toroidal 15V 1.7A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 15V 1.7A | 216802 |
| TE70040-ND | Transformer Power Toroidal 7V 1.43A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 7V 1.43A | 40413 |
| TE70042-ND | Transformer Power Toroidal 12V .834A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 12V .834A | 40414 |
| TE70043-ND | Transformer Power Toroidal 15V .666A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 15V .666A*NOTE | 40415 |
| TE70052-ND | Transformer Power Toroidal 12V 1.25A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 12V 1.25A | 42941 |
| TE70061-ND | Transformer Power Toroidal 9V 2.75A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 9V 2.75A | 40416 |
| TE70062-ND | Transformer Power Toroidal 12V 2.08A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 12V 2.08A | 40417 |
| TE70063-ND | Transformer Power Toroidal 15V 1.7A | Power / Transformer / TH / Power | yes | RoHS TOROIDAL TRANSFORMER 15V 1.7A | 42942 |
| 1N4003/SM | Diode 1N4003 S1D Surface Mount | Semiconductor / Diode / SM | yes | RoHS DIODE 1N4003 S1D SMT | 35097 |
| 1N4148/SM | Diode 1N4148 SOD-323  Surface Mount | Semiconductor / Diode / SM | yes | RoHS DIODE 1N4148 SOD-323  SMT | 35101 |
| MMBN4148LT/SM | Diode 1N4148 SOT23 Surface Mount | Semiconductor / Diode / SM | yes | RoHS DIODE 1N4148 SOT23 SMT | 41445 |
| SK33/SM | Diode Schottky Surface Mount | Semiconductor / Diode / SM | yes | RoHS DIODE SCHOTTKY SMT | 40597 |
| 1N4003 | Diode 1N4003 | Semiconductor / Diode / TH | yes | RoHS DIODE 1N4003 | 35095 |
| 1N4148 | Diode 1N4148 | Semiconductor / Diode / TH | yes | RoHS DIODE 1N4148 | 35099 |
| 1N5711 | Diode Schottky 1N5711 | Semiconductor / Diode / TH | yes | RoHS DIODE 1N5711 SCHOTTKY | 35103 |
| 1N5817 | Diode Schottky 1N5817 | Semiconductor / Diode / TH | yes | RoHS DIODE 1N5817 SCHOTTKY | 35105 |
| 1N749A | Diode Schottky 1N749A ZENER 4.3V 20MA | Semiconductor / Diode / TH | yes | RoHS DIODE 1N749A ZENER 4.3V 20MA | 35107 |
| 1N751A | Diode Schottky 1N751A ZENER 5.1V 20MA | Semiconductor / Diode / TH | yes | RoHS DIODE 1N751A ZENER 5.1V 20MA | 35109 |
| 1N752A | Diode Schottky 1N752A ZENER 5.6V 20MA | Semiconductor / Diode / TH | yes | RoHS DIODE 1N752A ZENER 5.6V 20MA | 35111 |
| 1N756B | Diode Schottky 1N756B ZENER 8.2V 20MA | Semiconductor / Diode / TH | yes | RoHS DIODE 1N756B ZENER 8.2V 20MA | 35113 |
| MBR4045PT | Diode Schottky MBR4045PT | Semiconductor / Diode / TH |  | DIODE MBR4045PT SCHOTTKY | 41673 |
| 5082-4707 | LED Mounting Clip | Semiconductor / LED and Related |  | LED MOUNTING CLIP | 36476 |
| LSV120CTP | LED Light Pipe 30.48mm | Semiconductor / LED and Related | yes | RoHS LIGHT PIPE 30.48mm | 41655 |
| SML190CTP | LED Lens | Semiconductor / LED and Related | yes | RoHS LED LENS | 40635 |
| SPR-54MVWF | LED 5mm 563nm Green/650nm Red White / Diffused | Semiconductor / LED and Related |  | LED 5MM 563GRN/650RED WHT/DIFF | 216992 |
| 551-0205 | LED Right Angle PCB Mounting Green Dialight | Semiconductor / LED and Related / Right Angle | yes | RoHS LED R/A PCB MTG DIALCO GRN | 35694 |
| 551-0305 | LED Right Angle PCB Mounting Yellow Dialight | Semiconductor / LED and Related / Right Angle | yes | RoHS LED R/A PCB MTG DIALCO YEL | 35695 |
| 551-0405 | LED Right Angle PCB Mounting Red Dialight | Semiconductor / LED and Related / Right Angle | yes | RoHS LED R/A PCB MTG DIALCO RED | 35696 |
| 555-2001 | LED Right Angle Red Dialight | Semiconductor / LED and Related / Right Angle | yes | RoHS LED RA DIALIGHT RED | 35704 |
| 555-2301 | LED Right Angle Green Dialight or Equal | Semiconductor / LED and Related / Right Angle | yes | RoHS LED RA DIALIGHT OR EQ GREEN | 35705 |
| 555-2401 | LED Right Angle Yellow Dialight | Semiconductor / LED and Related / Right Angle | yes | RoHS LED RA DIALIGHT YELLOW | 35706 |
| LED GREEN 1206 | LED Super Bright Green Surface Mount 1206 Package | Semiconductor / LED and Related / SM / 1206 | yes | RoHS LED SUPER BRIGHT GREEN 1206 SMT | 41617 |
| LED RED 1206 | LED Super Bright Red Surface Mount 1206 Package | Semiconductor / LED and Related / SM / 1206 | yes | RoHS LED SUPER BRIGHT RED 1206 SMT | 41620 |
| LED YELLOW 1206 | LED Super Bright Yellow Surface Mount 1206 Package | Semiconductor / LED and Related / SM / 1206 | yes | RoHS LED SUPER BRIGHT YELLOW 1206 SMT | 41622 |
| LED GREEN 603 | LED Super Bright Green Surface Mount 603 Package | Semiconductor / LED and Related / SM / 603 | yes | RoHS LED SUPER BRIGHT GREEN 603 SMT | 41618 |
| LED YELLOW 603 | LED Super Bright Yellow Surface Mount 603 Package | Semiconductor / LED and Related / SM / 603 | yes | RoHS LED SUPER BRIGHT YELLOW 603 SMT | 41623 |
| LED BLUE 805 | LED Super Bright Blue Surface Mount 805 Package | Semiconductor / LED and Related / SM / 805 | yes | RoHS LED SUPER BRIGHT BLUE 805 SMT | 42772 |
| LED GREEN 805 | LED Super Bright Green Surface Mount 805 Package | Semiconductor / LED and Related / SM / 805 | yes | RoHS LED SUPER BRIGHT GREEN 805 SMT | 41619 |
| LED RED 805 | LED Super Bright Red Surface Mount 805 Package | Semiconductor / LED and Related / SM / 805 | yes | RoHS LED SUPER BRIGHT RED 805 SMT | 41621 |
| LED YELLOW 805 | LED Super Bright Yellow Surface Mount 805 Package | Semiconductor / LED and Related / SM / 805 | yes | RoHS LED SUPER BRIGHT YELLOW 805 SMT | 41624 |
| 67-1133-ND | LED Green Axial Lead | Semiconductor / LED and Related / axial | yes | RoHS AXIAL LEAD GREEN LED | 35751 |
| 67-1135-ND | LED Red Axial Lead | Semiconductor / LED and Related / axial | yes | RoHS AXIAL LEAD RED LED | 35752 |
| HDSP-2533 | LED 8 Character Dot Matrix Display | Semiconductor / LED and Related / display | yes | RoHS 8 Character Dot Matrix Display | 217552 |
| HLMP-2450 | LED Light Bar display | Semiconductor / LED and Related / display |  | LED BAR | 42770 |
| LTD-6410G | LED Display Green | Semiconductor / LED and Related / display |  | GREEN LED DISPLAY | 41658 |
| PDSP1884 | LED 8-Character Dot Matrix Display | Semiconductor / LED and Related / display | yes | RoHS 8 Character Dot Matrix Display | 42928 |
| SLG2016 | LED Display Module 4-Character Dot Matrix | Semiconductor / LED and Related / display | yes | RoHS SIEMENS 4 CHARACTER | 40598 |
| LCD35 | LED - LCD Monitor | Semiconductor / LED and Related / lcd |  | LCD MONITOR | 41615 |
| LCD35-PAL | LED - LCD Monitor PAL Version | Semiconductor / LED and Related / lcd |  | LCD MONITOR PAL VERSION | 41616 |
| HC-F5V-60L-60LED-B | Neopixels LED strip - 60 LEDs per Meter | Semiconductor / LED and Related / neopixel |  | Neopixels LED strip - 60LED per Meter | 217488 |
| Neopixel | Neopixel - Placeholder | Semiconductor / LED and Related / neopixel |  | neopixel - place holder | 217458 |
| FLV110 | LED Red T 1-3/4 Package | Semiconductor / LED and Related / package | yes | RoHS LED RED T 1-3/4 PKG | 41914 |
| FLV310 | LED Green T 1-3/4 Package | Semiconductor / LED and Related / package |  | LED GREEN T 1-3/4 PKG | 41915 |
| HLMP1301 | LED T1 Package Red | Semiconductor / LED and Related / package | yes | RoHS LED T1 PKG RED | 41959 |
| HLMP1401 | LED T1 Package Yellow | Semiconductor / LED and Related / package | yes | RoHS LED T1 PKG YELLOW | 41960 |
| HLMP1501 | LED T1 Package Green | Semiconductor / LED and Related / package | yes | RoHS LED T1 PKG GREEN | 41961 |
| 2N3904/SM | Transistor 2N3904 SOT-23 Surface Mount | Semiconductor / Transistor / SM | yes | RoHS TRANSISTOR 2N3904 SOT-23 SMT | 217287 |
| 2N3906/SM | Transistor 2N3906 SOT-23 Surface Mount | Semiconductor / Transistor / SM | yes | RoHS TRANSISTOR 2N3906 SOT-23 SMT | 217288 |
| 2N4401/SM | Transistor NPN SOT23 Surface Mount | Semiconductor / Transistor / SM | yes | RoHS TRANSISTOR NPN SOT23 SMT | 35091 |
| 2N4403/SM | Transistor PNP SOT23 Surface Mount | Semiconductor / Transistor / SM | yes | RoHS TRANSISTOR PNP SOT23 SMT | 35096 |
| TIP29/SM | Transistor NPN DPAK Surface Mount | Semiconductor / Transistor / SM | yes | RoHS TRANSISTOR NPN D PAK SMT | 40418 |
| TIP30/SM | Transistor PNP DPAK Surface Mount | Semiconductor / Transistor / SM | yes | RoHS TRANSISTOR PNP D PAK SMT | 40420 |
| 2N3904 | Transistor 2N3904 | Semiconductor / Transistor / TH | yes | RoHS TRANSISTOR 2N3904 | 35086 |
| 2N3906 | Transistor 2N3906 - Straight Leg Version | Semiconductor / Transistor / TH | yes | RoHS TRANSISTOR 2N3906 *STRAIGHT LEG* | 35088 |
| 2N4401 | Transistor 2N4401 | Semiconductor / Transistor / TH |  | TRANSISTOR 2N4401 | 35089 |
| 2N4403 | Transistor 2N4403 - Straight Leg Version | Semiconductor / Transistor / TH |  | TRANSISTOR 2N4403 *STRAIGHT LEG VERSION* | 35094 |
| J174 | Transistor | Semiconductor / Transistor / TH |  | TRANSISTOR | 41600 |
| TIP29B | Transistor NPN | Semiconductor / Transistor / TH | yes | RoHS TRANSISTOR NPN | 40419 |
| TIP30B | Transistor PNP | Semiconductor / Transistor / TH |  | TRANSISTOR PNP | 40421 |
| ZTX949 | Transistor PNP 30V 4500MA TO-92 ZTX949 | Semiconductor / Transistor / TH |  | TRANSISTOR ZTX949 PNP 30V 4500MA TO-92 | 40476 |
| AL05-1.0K | Inductor 1uH RCD Or Equal | Semiconductor / ic | yes | RoHS INDUCTOR 1uH RCD OR EQUAL | 42395 |
| 74HC393M/SM | I/C Dual 4-Stage Binary Counter Surface Mount | Semiconductor / ic / SM | yes | RoHS I/C DUAL 4-STG BIN COUNTER | 35787 |
| ADG419/SM | I/C 2X1 Analog Switch SOIC Surface Mount | Semiconductor / ic / SM | yes | RoHS I/C 2X1 ANALOG SWITCH SM SOIC | 42387 |
| CD4538BCM | I/C Dual Monostable Multivibrator Surface Mount | Semiconductor / ic / SM |  | DUAL MONOSTABLE MULTIVIBRATOR SMT | 37802 |
| DS75176B/SM | I/C RS485 Interface Surface Mount | Semiconductor / ic / SM | yes | RoHS I/C RS485 INTERFACE SMT | 37890 |
| LM393M/SM | I/C Comparator Surface Mount LM393M | Semiconductor / ic / SM | yes | RoHS I/C LM393M COMPARATOR SMT | 41648 |
| MC34164-3/SM | I/C MC34164-3 Surface Mount *Obsolete* | Semiconductor / ic / SM | yes | OBSOLETE RoHS I/C MC34164-3 SMT | 41677 |
| MC34164/SM | I/C Surface Mount MC34164 | Semiconductor / ic / SM | yes | RoHS I/C MC34164 SMT | 41678 |
| SSM2143/SM | I/C -6dB Differential Line Surface Mount | Semiconductor / ic / SM | yes | RoHS SMT I/C -6dB DIFFERENTIAL LINE | 40647 |
| CS8415A-CZ/SM | I/C Digital Audio Interface Surface Mount | Semiconductor / ic / SM / Audio | yes | RoHS DIGITAL AUDIO INTERFACE SMT | 37851 |
| CS8416-CZ/SM | I/C Digital Audio Interface 192 kHz Surface Mount | Semiconductor / ic / SM / Audio | yes | RoHS 192 kHz DIGITAL AUDIO INTERFACE SMT | 37852 |
| MAX1853/SM | I/C Inverting Charge Pump Surface Mount Maxim | Semiconductor / ic / SM / Invert |  | I/C MAXIM INVERTING CHRGE PUMP | 41671 |
| M25P40-VMN6P | I/C Configurable PROM Surface Mount Package | Semiconductor / ic / SM / PROM | yes | RoHS CONFIG. PROM SMT PKG | 41660 |
| 74HC165/SM | I/C Shift Register Serial Out Surface Mount *Obsolete* | Semiconductor / ic / SM / Serial | yes | *Obsolete* RoHS SHIFT REG SERIAL OUT SMT | 35785 |
| 74HC4094D/SM | I/C Shift Register Serial In Surface Mount | Semiconductor / ic / SM / Serial | yes | RoHS I/C SHIFT REGISTER SERIAL IN | 37092 |
| SN65HVD30D | I/C RS485 Transceiver 26Mbps 3.3V Surface Mount | Semiconductor / ic / SM / Transceiver | yes | RoHS RS485 Transceiver 26Mbps 3.3V SMT | 216881 |
| EP1C12-240 | I/C CPLD PQFP240 Surface Mount Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD PQFP240 SMT PKG | 41888 |
| EP1C6-144 | I/C CPLD QFP144 Surface Mount Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD QFP144 SMT PKG | 41890 |
| EP1C6-240 | I/C CPLD PQFP240 Surface Mount Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD PQFP240 SMT PKG | 41891 |
| EPM3032TQFP | I/C CPLD QFP44 Surface Mount Package Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD QFP44 SMT PKG | 41894 |
| EPM3128ATC100-7 | I/C CPLD TQFP100 Surface Mount Package Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD TQFP100 SMT PKG | 41895 |
| EPM3128ATC144-10 | I/C CPLD TQFP144 Surface Mount Package Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD TQFP144 SMT PKG | 41896 |
| EPM7128TQFP | I/C CPLD QFP100 Surface Mount Package Altera | Semiconductor / ic / SM / altera | yes | RoHS ALTERA CPLD QFP100 SMT PKG | 41898 |
| EL5263IS | I/C Video Op-Amp Surface Mount Elantec | Semiconductor / ic / SM / amp | yes | RoHS I/C ELANTIC VIDEO OP AMP SMT | 41885 |
| LF353M/SM | I/C Dual Op-Amp Surface Mount LF353M | Semiconductor / ic / SM / amp | yes | RoHS I/C LF353M DUAL OP AMP SMT | 41626 |
| NE5532D8 | I/C Dual Op-Amp Surface Mount | Semiconductor / ic / SM / amp | yes | RoHS I/C DUAL OP AMP SMT | 41459 |
| OP275/SM | I/C Dual Op-Amp Surface Mount Analog Devices | Semiconductor / ic / SM / amp | yes | RoHS ANALOG DUAL OP AMP SMT | 41466 |
| TPA3124D2 | I/C Amplifier Class D 30W Surface Mount | Semiconductor / ic / SM / amp | yes | RoHS Class D 30W Amplifier SMT | 216883 |
| PLL1700E | I/C Multi-Clock Generator PLL1700E Surface Mount | Semiconductor / ic / SM / clock | yes | RoHS I/C PLL1700E SMT | 41190 |
| PLL1705 | I/C Multi-Clock Generator PLL1705 Surface Mount | Semiconductor / ic / SM / clock |  | I/C PLL1705 SMT | 41191 |
| CS4330 | I/C Stereo Digital-to-Analog Converter Surface Mount *Obsolete* | Semiconductor / ic / SM / converter | yes | RoHS CRYSTAL SEMICONDUCTOR *OBSOLETE* | 37841 |
| CS4334-KS | I/C Digital-to-Analog Converter Surface Mount Crystal Semiconductor | Semiconductor / ic / SM / converter | yes | RoHS CRYSTAL SEMICONDUCTOR SMT | 37842 |
| CS4335-KS | I/C Stereo Digital-to-Analog Converter Surface Mount Crystal Semiconductor | Semiconductor / ic / SM / converter | yes | RoHS CRYSTAL SEMICONDUCTOR SMT | 37843 |
| CS4390-KS | I/C Stereo Digital-to-Analog Converter Surface Mount *Obsolete* | Semiconductor / ic / SM / converter |  | *OBSOLETE* D TO A CONVERTER SMT | 37844 |
| CS5333-KZ | I/C 96KHz Stereo Analog-to-Digital Converter Surface Mount *Obsolete* | Semiconductor / ic / SM / converter |  | *OBSOLETE*  96KHZ STEREO ADC SMT | 37845 |
| LM2596 | I/C DC-DC Converter 5V Surface Mount LM2596 | Semiconductor / ic / SM / converter | yes | RoHS I/C LM2596 DC-DC CONV. 5V SMT | 41635 |
| PCM5100APW | I/C Audio Digital-to-Analog Converter 192KHz 2.2V Surface Mount | Semiconductor / ic / SM / converter / Audio | yes | RoHS Audio DAC 192KHz 2.2V SMT | 216882 |
| 74HC153SC/SM | I/C Data Selector Surface Mount | Semiconductor / ic / SM / data |  | I/C DATA SELECTOR SMT | 35784 |
| FDC634P/SM | I/C P-Channel 2.5V MOSFET Surface Mount | Semiconductor / ic / SM / fet | yes | RoHS I/C P-CHANNEL 2.5V MOSFET | 41907 |
| 74HC00M/SM | I/C NAND Gate Surface Mount MM74HC00M | Semiconductor / ic / SM / gate | yes | RoHS I/C MM74HC00M GATE NAND SMT | 35781 |
| 74HC74/SM | I/C D Latch Dual Surface Mount 74HC74 | Semiconductor / ic / SM / latch |  | I/C 74HC74 D LATCH DUAL SMT | 37094 |
| 74HC4053DW | I/C 2-Channel Analog Multiplexer Surface Mount | Semiconductor / ic / SM / multiplex | yes | RoHS 2 CH ANALOG MULTIPLXR SMT | 35790 |
| 74HC4053M | I/C 2-Channel Analog Multiplexer Surface Mount | Semiconductor / ic / SM / multiplex | yes | RoHS2 CH ANALOG MULTIPLXR SMT | 42702 |
| L79L05A/SM | I/C Negative Voltage Regulator -5V SOT-89 Surface Mount | Semiconductor / ic / SM / regulator / voltage | yes | RoHS NEGATIVE VOLTAGE REG. -5V SOT-89 | 41614 |
| ADG419 | I/C 2X1 Analog Switch | Semiconductor / ic / TH |  | I/C 2X1 ANALOG SWITCH | 42386 |
| CD4538BCN | I/C 16-Pin DIP Dual Monostable Multivibrator | Semiconductor / ic / TH |  | 16 PIN DIP DUAL MONOSTABLE MULTIVIBRATOR | 37803 |
| CS3310-KP | I/C Digital Control Stereo Attenuator | Semiconductor / ic / TH |  | I/C DIG CTL STEREO ATTENUATOR *NOTES* | 37839 |
| CS3310-KSZ | I/C Digital Control Stereo Attenuator | Semiconductor / ic / TH | yes | RoHS DIG CTL STEREO ATTENUATOR | 37840 |
| DS75176B | I/C RS485 Interface | Semiconductor / ic / TH | yes | RoHS I/C RS485 INTERFACE | 37889 |
| GS2974A | I/C HD-LINX II Equalizer Gennum | Semiconductor / ic / TH | yes | RoHS I/C GENNUM HD-LINX II EQUALIZER | 41943 |
| GS4982-CKA | I/C Sync Separator Gennum | Semiconductor / ic / TH | yes | RoHS I/C GENNUM SYNC SEPARATOR | 41947 |
| GS9023 | I/C MUX/DEMUX Gennum | Semiconductor / ic / TH | yes | RoHS I/C GENNUM MUX/DEMUX | 41949 |
| HA4314A | I/C 4X1 Video Crosspoint Switch Harris (SEE NOTES) | Semiconductor / ic / TH |  | HARRIS 4X1 VIDEO CROSSPOINT (SEE NOTES) | 41955 |
| LFXP3KC-T100 | I/C LatticeXP | Semiconductor / ic / TH |  | LATTICE XP | 41628 |
| LM1881N | I/C Video Sync Separator LM1881N | Semiconductor / ic / TH | yes | RoHS I/C LM1881N VIDEO SYNC SEP | 41634 |
| LM393AN | I/C Comparator LM393AN | Semiconductor / ic / TH |  | I/C LM393AN COMPARATOR | 41647 |
| LMH1981 | I/C Video Sync Separator LMH1981 | Semiconductor / ic / TH | yes | RoHS I/C LMH1981 VIDEO SYNC SEP | 41652 |
| M25P16-VMF6P | I/C Configurable Device SOIC Package - No Heatsink | Semiconductor / ic / TH |  | CONFIG. DEVICE SOIC PKG NO HEATSINK | 41659 |
| MC1496P | I/C Balanced Modulator MC1496P | Semiconductor / ic / TH |  | I/C MC1496P BAL MODULATOR | 41676 |
| MT48LC1M16 | I/C 1MX16 SSDRAM 3.3V TSOP Packaging | Semiconductor / ic / TH |  | I/C 1MX16 SSDRAM TSOP 3.3V | 41451 |
| PCA9555 | I/C 16-bit I/O Port with Interrupt | Semiconductor / ic / TH | yes | RoHS 16 BIT I/O PORT W/INTERRUPT | 41476 |
| SY58609U | I/C High-speed Mux Micrel | Semiconductor / ic / TH | yes | RoHS MICREL HIGH SPEED MUX | 42939 |
| ULN2803A | I/C Octal Peripheral DVR Array | Semiconductor / ic / TH | yes | RoHS I/C OCTAL PERIPHERAL DVR ARRAY | 40454 |
| MAX1044 | I/C Voltage Inverter Maxim | Semiconductor / ic / TH / Invert / voltage | yes | RoHS MAXIM VOLTAGE INVERTER | 41670 |
| DS2433S | I/C 4KB 1-Wire EEPROM | Semiconductor / ic / TH / PROM | yes | RoHS 4KB 1-WIRE EEPROM | 37883 |
| NM27C512N-150 | I/C High Performance CMOS EPROM 150ns NM27C512N-150 | Semiconductor / ic / TH / PROM |  | NM27C512N-150 | 41464 |
| CLC034 | I/C HD-SDI Equalizer National | Semiconductor / ic / TH / SDI | yes | RoHS I/C National HD-SDI EQ | 37823 |
| GS1574A | I/C HD-SDI Equalizer Gennum | Semiconductor / ic / TH / SDI | yes | RoHS I/C GENNUM HD-SDI EQUALIZER *NOTES* | 41942 |
| GS2962 | I/C HD-SDI Transmitter Gennum | Semiconductor / ic / TH / SDI | yes | RoHS I/C GENNUM HD-SDI TRANSMITTER | 42767 |
| GS2970A | I/C HD-SDI Receiver Gennum | Semiconductor / ic / TH / SDI | yes | RoHS I/C GENNUM HD-SDI RECEIVER | 42768 |
| GS2984 | I/C HD-SDI Equalizer Gennum | Semiconductor / ic / TH / SDI | yes | RoHS I/C GENNUM HD-SDI EQUALIZER | 42769 |
| GS1559 | I/C HD-SDI Deserializer Gennum | Semiconductor / ic / TH / SDI / Serial | yes | RoHS I/C GENNUM HD-SDI DESERIALIZER | 41940 |
| GS1560A | I/C HD-SDI Deserializer Gennum | Semiconductor / ic / TH / SDI / Serial | yes | RoHS I/C GENNUM HD-SDI DESERIALIZER | 41941 |
| GS9032 | I/C SDI Serializer Gennum | Semiconductor / ic / TH / SDI / Serial | yes | RoHS I/C GENNUM SDI SERIALIZER | 41951 |
| 74HC165N | I/C Shift Register Serial Out | Semiconductor / ic / TH / Serial |  | I/C SHIFT REG SERIAL OUT | 35786 |
| 74HC4094N | I/C Shift Register Serial In*Obsolete* | Semiconductor / ic / TH / Serial | yes | RoHS OBSOLETE I/C SHIFT REGISTER SERIAL IN | 37093 |
| CLC011 | I/C Serial Digital Video Decoder | Semiconductor / ic / TH / Serial | yes | RoHS SER. DIGITAL VIDEO DECODER *NOTES* | 37820 |
| GS1531 | I/C Serializer Gennum | Semiconductor / ic / TH / Serial | yes | RoHS I/C GENNUM SERIALIZER | 42766 |
| GS9025 | I/C Serial Digital Receiver Gennum | Semiconductor / ic / TH / Serial | yes | RoHS I/C GENNUM SERIAL DIGITAL REC. | 41950 |
| ADM3485EAR | I/C RS-485 Transceiver High ESD 3V | Semiconductor / ic / TH / Transceiver | yes | RoHS 3 VOLT RS-485 HIGH ESD I.C. | 42388 |
| CS8427-CS | I/C Transceiver Crystal | Semiconductor / ic / TH / Transceiver | yes | RoHS CRYSTAL TRANSCEIVER | 37854 |
| LTC1480CS8 | I/C RS-485/422 Transceiver | Semiconductor / ic / TH / Transceiver | yes | RoHS RS-485/422 TRANSCEIVER | 41657 |
| SN65HDV233D | I/C 3.3V CAN Transceiver | Semiconductor / ic / TH / Transceiver | yes | RoHS 3.3V CAN TRANSCEIVER | 40637 |
| SN75HVD10D | I/C 3.3V RS-485 Transceiver | Semiconductor / ic / TH / Transceiver | yes | RoHS 3.3V RS-485 TRANSCEIVER | 40638 |
| CS8406 | I/C AES/EBU Crystal Semiconductor | Semiconductor / ic / TH / aes | yes | RoHS CRYSTAL SEMICONDUCTOR AES/EBU | 37848 |
| CS8402A | I/C AES/EBU Digital Audio Interface Transmitter Crystal Semiconductor *Obsolete* | Semiconductor / ic / TH / aes / Audio |  | *OBSOLETE* CRYSTAL SEMICONDUCTOR AES/EBU | 37847 |
| CS8412-CS | I/C AES/EBU Digital Audio Interface Receiver Crystal Semiconductor *Obsolete* | Semiconductor / ic / TH / aes / Audio |  | *OBSOLETE* CRYSTAL SEMICONDUCTOR AES/EBU | 37849 |
| EMP7064S | I/C CPLD Altera | Semiconductor / ic / TH / altera |  | ALTERA CPLD *NOTES* | 41886 |
| EP1C3-100 | I/C FPGA T100 Package Altera Cyclone | Semiconductor / ic / TH / altera | yes | RoHS ALTERA CYCLONE  FPGA T100 PKG | 41889 |
| EP2C35-484 | I/C FBGA-484 Package Altera Cyclone II | Semiconductor / ic / TH / altera | yes | RoHS ALTERA CYCLONE II FBGA-484PKG | 41892 |
| EP2C5-144 | I/C EP2C5 QFP-144 Package Altera Cyclone II | Semiconductor / ic / TH / altera | yes | RoHS ALTERA CYCL II EP2C5 QFP-144 PKG | 41893 |
| EP4CE30F23I7N | I/C IV FPGA Altera Cyclone | Semiconductor / ic / TH / altera | yes | RoHS ALTERA CYCLONE IV FPGA | 42765 |
| EPM7128S | I/C CPLD Altera | Semiconductor / ic / TH / altera | yes | RoHS ALTERA CPLD | 41897 |
| EL2044CN | I/C Low Power Amplifier Elantec *Obsolete* | Semiconductor / ic / TH / amp |  | *OBSOLETE* I/C ELANTIC LOW POWER AMP | 41881 |
| EL2099C | I/C Video Op-Amp Elantec *Obsolete* | Semiconductor / ic / TH / amp |  | *OBSOLETE* I/C ELANTIC VIDEO OP AMP | 41882 |
| EL2244CN | I/C Low Power Amplifier Elantec*Obsolete* | Semiconductor / ic / TH / amp |  | *OBSOLETE* ELANTIC LOW POWER AMP *NOTES* | 41883 |
| EL4430CN | I/C Video Instrumentation Amplifier Elantec *Obsolete* | Semiconductor / ic / TH / amp |  | *OBSOLETE* ELANTIC VIDEO INSTR. AMP. | 41884 |
| ISL55002IBZ | I/C Low Power Amp | Semiconductor / ic / TH / amp | yes | RoHS I/C LOW POWER AMP | 41598 |
| LF353N | I/C Dual Op-Amp LF353N*Obsolete* | Semiconductor / ic / TH / amp | yes | RoHS OBSOLETE I/C LF353N OP AMP DUAL | 41627 |
| LM1458 | I/C  Dual Op-Amp LM1458N | Semiconductor / ic / TH / amp |  | I/C LM1458N OP AMP DUAL | 41633 |
| LMC6482AIM | I/C CMOS Dual Rail-to-Rail Op-Amp | Semiconductor / ic / TH / amp | yes | RoHS I/C CMOS DUAL RAIL-TO-RAIL OP AMP | 41651 |
| NE5532N | I/C NE5532N Dual Op-Amp | Semiconductor / ic / TH / amp | yes | RoHS I/C NE5532N DUAL OP AMP | 41460 |
| NE5534N | I/C NE5534N Op-Amp | Semiconductor / ic / TH / amp |  | I/C NE5534N OP AMP | 41461 |
| NE5538N | I/C NE5538N Op-Amp | Semiconductor / ic / TH / amp |  | I/C NE5538N OP AMP | 41462 |
| OPA2604AP | I/C Dual Op-Amp | Semiconductor / ic / TH / amp | yes | RoHS I/C DUAL OP AMP | 41467 |
| OPA650P | I/C Wideband Op-Amp (Not RoHS-compliant) | Semiconductor / ic / TH / amp |  | *WILL NOT BECOME ROHS*   WIDEBAND AMP | 41468 |
| 2017P | I/C Audio Preamp SSM2017P | Semiconductor / ic / TH / amp / Audio | yes | RoHS I/C SSM2017P AUDIO PREAMP | 35128 |
| LM4766TF | I/C Audio Power Amplifier Dual 30W TO-220-15 | Semiconductor / ic / TH / amp / Audio | yes | RoHS CI AMP AUDIO DUAL 30W TO-220-15 | 41649 |
| AD1895 | I/C Sample Rate Converter | Semiconductor / ic / TH / amp / converter | yes | RoHS  SAMPLE RATE CONVERTER | 42385 |
| CS8420-CS | I/C Sample Rate Converter Crystal | Semiconductor / ic / TH / amp / converter | yes | RoHS CRYSTAL SAMPLE RATE CONVERTER | 37853 |
| 74HC125 | I/C  Buffer Quad 74HC125N | Semiconductor / ic / TH / buffer | yes | RoHS I/C 74HC125N BUFFER QUAD | 35783 |
| GB4571-CDA | I/C Video Buffer Gennum | Semiconductor / ic / TH / buffer | yes | RoHS-Compliant I/C GENNUM Video Buffer | 41919 |
| GB4571-CKA | I/C Video Buffer Gennum | Semiconductor / ic / TH / buffer | yes | RoHS I/C GENNUM VIDEO BUFFER | 41920 |
| NC7WZ16P6CT | I/C Dual Buffer | Semiconductor / ic / TH / buffer |  | I/C DUAL BUFFER | 41457 |
| 74HCT14D | I/C Invert Buffer-Hex Schmitt 74HCT14D | Semiconductor / ic / TH / buffer / Invert | yes | RoHS I/C 74HCT14D INVERT BUFFER-HEX SCH | 37095 |
| DS12887+-ND | I/C Real-Time Clock (Component to Fix Techtronix) | Semiconductor / ic / TH / clock |  | Component to Fix Techtronix | 44747 |
| ICS662-03 | I/C HDTV A/V Clock Generator | Semiconductor / ic / TH / clock | yes | RoHS HDTV A/V CLOCK GENERATOR | 41964 |
| ICS9120-08 | I/C ICS Clock Generator (Not RoHS-compliant) | Semiconductor / ic / TH / clock |  | *NOT ROHS* ICS CLOCK GENERATOR | 41965 |
| GS1535 | I/C HD-SDI Reclocker Gennum | Semiconductor / ic / TH / clock / SDI | yes | RoHS I/C GENNUM HD-SDI RECLOCKER | 41939 |
| GS2975A | I/C HD-SDI Reclocker Gennum | Semiconductor / ic / TH / clock / SDI | yes | RoHS I/C GENNUM HD-SDI RECLOCKER | 41944 |
| ADV7171 | I/C Video Digital-to-Analog Converter | Semiconductor / ic / TH / converter | yes | RoHS I/C VIDEO DAC | 42391 |
| AK4396VFP | I/C Stereo Digital-to-Analog Converter | Semiconductor / ic / TH / converter | yes | RoHS STEREO D/A CONVERTER | 42392 |
| AK5381VTP | I/C Stereo Analog-to-Digital Converter | Semiconductor / ic / TH / converter |  | STEREO A/D CONVERTER | 42393 |
| AK5394AVSP | I/C Stereo Analog-to-Digital Converter | Semiconductor / ic / TH / converter |  | STEREO A/D CONVERTER | 42394 |
| LM2676 | I/C DC-DC Converter 5V LM2676 | Semiconductor / ic / TH / converter | yes | RoHS I/C LM2676 DC-DC CONV. 5V | 41636 |
| LM2676-3.3V | I/C DC-DC Converter 3.3V LM2676 | Semiconductor / ic / TH / converter | yes | RoHS I/C LM2676 DC-DC CONV. 3.3V | 41637 |
| LTC1451CN8 | I/C 12-Bit Digital-to-Analog Converter Linear | Semiconductor / ic / TH / converter | yes | RoHS I/C 12-BIT DAC LINEAR | 41656 |
| CS5394-KS | I/C IPD Audio Analog-to-Digital Converter *Obsolete* | Semiconductor / ic / TH / converter / Audio |  | *OBSOLETE* IPD A/D CONVERTER SEE NOTE | 37846 |
| CLC014 | I/C Adaptive Cable Equalizer for High-Speed Data Recovery | Semiconductor / ic / TH / data | yes | RoHS I/C ACE HSpdRec *NOTES* | 37821 |
| CLC016 | I/C Data Retiming PLL with Automatic Rate Selection | Semiconductor / ic / TH / data | yes | RoHS DATA RETIMING PLL W/ARS *NOTES* | 37822 |
| A6276ELW | I/C LED Display Driver | Semiconductor / ic / TH / driver | yes | RoHS LED DISPLAY DRIVER | 37184 |
| DS26LS31CM | I/C Quad Differential Line Driver | Semiconductor / ic / TH / driver | yes | RoHS I/C QUAD DIFF LINE DRIVER | 37884 |
| DS26LS31CN | I/C Quad Differential Line Driver | Semiconductor / ic / TH / driver |  | I/C DS26LS31CN | 37885 |
| DS26LS32ACM | I/C Quad Differential Line Driver | Semiconductor / ic / TH / driver | yes | RoHS I/C QUAD DIFF LINE RECEIVER | 37886 |
| DS34LV86T | I/C Enhanced CMOS Quad Differential Line Driver | Semiconductor / ic / TH / driver | yes | RoHS I/C ENHNC QUAD DIFF LINE RECEIVER | 37887 |
| DS34LV87T | I/C Enhanced CMOS Quad Differential Line Driver | Semiconductor / ic / TH / driver | yes | RoHS I/C ENHANCED QUAD DIFF LINE DRVR | 37888 |
| DS8921N | I/C Differential Line Driver and Receiver Pair | Semiconductor / ic / TH / driver | yes | RoHS DIFF LINE DRIVER/RECEIVER PR | 37891 |
| GS2978 | I/C HD-LINX III Cable Driver Gennum | Semiconductor / ic / TH / driver | yes | RoHS I/C GENNUM HD-LINX III CABLE DRIVER | 41945 |
| LM3915N | I/C Dot/Bar Display Driver Supply National | Semiconductor / ic / TH / driver | yes | RoHS I/C DOT BAR SUPPLY NATIONAL | 41645 |
| LM3916N | I/C LED Meter Driver | Semiconductor / ic / TH / driver | yes | RoHS I/C LED METER DRIVER | 41646 |
| MM5450V | I/C LED Display Driver | Semiconductor / ic / TH / driver | yes | RoHS I/C LED DISPLAY DRIVER | 41444 |
| SSM2142 | I/C Balanced Line Driver | Semiconductor / ic / TH / driver |  | I/C BALANCE LINE | 40645 |
| GS1528 | I/C HD-SDI Cable Driver Gennum | Semiconductor / ic / TH / driver / SDI | yes | RoHS I/C GENNUM HD-SDI CABLE DRIVER | 41938 |
| CLC007 | I/C Serial Digital Cable Driver with Dual Complementary Outputs | Semiconductor / ic / TH / driver / Serial | yes | RoHS I/C SDCD W/DUAL COMP OUTPUT | 37819 |
| GS9007 | I/C Quad Serial Digital Cable Driver with Dual Complementary Outputs | Semiconductor / ic / TH / driver / Serial |  | I/C SDCD W/DUAL COMP OUTPUT | 41948 |
| CY2305 | I/C Clock Driver | Semiconductor / ic / TH / driver / clock | yes | RoHS I/C CLOCK DRIVER | 37859 |
| NDC652PCT-ND | I/C P-Channel 2.5V MOSFET | Semiconductor / ic / TH / fet |  | I/C P-CHANNEL 2.5V MOSFET | 41458 |
| AM29LV04OB-120JC | I/C Multi-Purpose Flash 512K x 8 3V | Semiconductor / ic / TH / flash |  | I/C AMD 512Kx8 3V | 42710 |
| AT25F512 | I/C Flash RAM | Semiconductor / ic / TH / flash | yes | RoHS I/C FLASH RAM | 42756 |
| SST39VF040-70-4C-NHE | I/C SST Multi-Purpose Flash Memory 512Kx8 3V | Semiconductor / ic / TH / flash |  | I/C SST 512Kx8 3V | 217308 |
| 74HC00N | I/C NAND Gate 74HC00N | Semiconductor / ic / TH / gate | yes | RoHS I/C 74HC00N | 35782 |
| AT90CAN128 | I/C Atmel Microcontroller | Semiconductor / ic / TH / micro | yes | RoHS I/C ATMEL MICROCONTROLLER | 37494 |
| ATMEGA128L | I/C Atmel Microcontroller | Semiconductor / ic / TH / micro | yes | RoHS I/C ATMEL MICROCONTROLLER | 37495 |
| PIC16C63 | I/C Microchip Microcontroller | Semiconductor / ic / TH / micro | yes | RoHS I/C MICROCHIP MICROCONTROLLER | 44756 |
| 93LC66/P | I/C Serial EEPROM Microchip | Semiconductor / ic / TH / micro / PROM / Serial | yes | RoHS I/C SERIAL EEPROM MICROCHIP | 37173 |
| PIC12F675 | I/C Flash Microchip Microcontroller | Semiconductor / ic / TH / micro / flash | yes | RoHS I/C FLASH MICROCHIP MICROCONT | 41181 |
| PIC16F74 | I/C Flash Microchip Microcontroller | Semiconductor / ic / TH / micro / flash | yes | RoHS I/C FLASH MICROCHIP MICROCONTROLLER | 41184 |
| PIC16F874-04/PT | I/C Flash Microchip Microcontroller | Semiconductor / ic / TH / micro / flash | yes | RoHS I/C FLASH MICROCHIP MICROCONTROLLER | 41185 |
| PIC16F887-I/PT | I/C Flash Microchip Microcontroller | Semiconductor / ic / TH / micro / flash | yes | RoHS I/C FLASH MICROCHIP MICROCONTROLLER | 43955 |
| LP2985IM5-5.0 | I/C Low-Dropout Regulator Micropower SOT23 | Semiconductor / ic / TH / micro / regulator |  | I/C REG. LDO MICROPOWER SOT23 | 41653 |
| MC34164P-5 | I/C Micropower Undervoltage Sensing Circuits MC34164P-5 | Semiconductor / ic / TH / micro / voltage / sens |  | I/C MC34164P-5 | 43352 |
| 74HC4052N | I/C 2-Channel Analog Multiplexer | Semiconductor / ic / TH / multiplex |  | I/C 2CH ANALOG MULTIPLEXER | 35788 |
| 74HC4052WM | I/C 2-Channel Analog Multiplexer | Semiconductor / ic / TH / multiplex |  | I/C 2-CH ANALOG MULTIPLEXER | 35789 |
| 74HC4053N | I/C 2-Channel Analog Multiplexer | Semiconductor / ic / TH / multiplex |  | 2 CHANNEL ANALOG MPLXR | 35791 |
| ILD-1 | I/C Opto-Isolator Dual | Semiconductor / ic / TH / opto | yes | RoHS I/C OPTO-ISOLATOR DUAL | 41967 |
| LM1117-ADJ | I/C Adjustable  Regulator LM1117 | Semiconductor / ic / TH / regulator |  | I/C LM1117 ADJUSTABLE  REGULATOR | 41630 |
| LM2825N-5.0 | I/C Regulator LM2825N-5.0 | Semiconductor / ic / TH / regulator | yes | RoHS I/C LM2825N-5.0 REGULATOR | 41638 |
| LM337T | I/C Regulator LM337T | Semiconductor / ic / TH / regulator | yes | RoHS I/C LM337T REGULATOR | 41644 |
| LMS1585ACT-3.3 | I/C Regulator | Semiconductor / ic / TH / regulator | yes | RoHS REGULATOR | 42921 |
| MAX660M/NOPB | I/C Regulator MULTI CONFIG ADJ 8-SOIC | Semiconductor / ic / TH / regulator |  | IC REG MULTI CONFIG ADJ 8-SOIC | 43911 |
| MAX710ESE | I/C Switching Regulator 5V Maxim | Semiconductor / ic / TH / regulator | yes | RoHS MAXIM 5V SWITCHING REGULATOR | 41672 |
| MC7805CT | I/C Regulator 5V | Semiconductor / ic / TH / regulator | yes | RoHS I/C 5V Regulator | 41679 |
| MC7905CT | I/C Negative 5V Regulator | Semiconductor / ic / TH / regulator | yes | RoHS I/C NEGATIVE 5V REGULATOR | 41381 |
| MC7912CT | I/C Negative 12V Regulator | Semiconductor / ic / TH / regulator |  | I/C NEGATIVE 12V REGULATOR | 41382 |
| KA79M05R | I/C Voltage Regulator -5V | Semiconductor / ic / TH / regulator / voltage | yes | RoHS NEGATIVE 5V REGULATOR | 41605 |
| L7812CV | I/C Voltage Regulator 12V L7812CV | Semiconductor / ic / TH / regulator / voltage | yes | RoHS I/C L7812CV 12V REGULATOR | 41613 |
| LM1117MP | I/C Voltage Regulator 3.3V LM1117MP | Semiconductor / ic / TH / regulator / voltage | yes | RoHS LM1117MP-3.3V REGULATOR | 41631 |
| LM1117MPX-5.0 | I/C Voltage Regulator 5V LM1117MP | Semiconductor / ic / TH / regulator / voltage | yes | RoHS I/C LM1117MP-5V REGULATOR | 41632 |
| LM317D2 | I/C Positive Voltage Regulator | Semiconductor / ic / TH / regulator / voltage | yes | RoHS POSITIVE VOLTAGE REGULATOR | 41639 |
| LM317LZ | I/C Voltage Regulator LM317LZ | Semiconductor / ic / TH / regulator / voltage |  | I/C LM317LZ | 41640 |
| LM337D2 | I/C Negative Voltage Regulator | Semiconductor / ic / TH / regulator / voltage |  | NEGATIVE VOLTAGE REGULATOR | 41642 |
| LM337LZ | I/C Voltage Regulator LM337LZ | Semiconductor / ic / TH / regulator / voltage |  | I/C LM337LZ | 41643 |
| MC78L05ACZ | I/C Voltage Regulator Positive 5V NJR | Semiconductor / ic / TH / regulator / voltage |  | NJR VOLTAGE REGULATOR POS 5V | 41380 |
| MC79L05ACZ | I/C Negative 5V Voltage Regulator NJR | Semiconductor / ic / TH / regulator / voltage |  | NJR VOLTAGE REGULATOR NEG 5V | 41383 |
| TPS70402PWP | I/C Dual Output Voltage Regulator 1.22V/5.5V | Semiconductor / ic / TH / regulator / voltage | yes | RoHS DUAL OUTPUT VOLT REG 1.22V/5.5V | 40427 |
| TPS70445PWP | I/C Dual Output Voltage Regulator 3.3V/1.2V | Semiconductor / ic / TH / regulator / voltage | yes | RoHS DUAL OUTPUT VOLT REG 3.3V/1.2V | 40428 |
| TPS70451PWP | I/C Dual Output Voltage Regulator 3.3V/1.8V | Semiconductor / ic / TH / regulator / voltage | yes | RoHS DUAL OUTPUT VOLT REG 3.3V/1.8V | 40429 |
| LM86CIM | I/C Digital Temperature Sensor | Semiconductor / ic / TH / sens | yes | RoHS DIGITAL TEMPERATURE SENSOR | 41650 |
| TC670 | I/C Integrated Fan Speed Sensor | Semiconductor / ic / TH / sens | yes | RoHS INT FAN SPEED SENSOR | 40411 |
| TMP75 | I/C Digital Temperature Sensor | Semiconductor / ic / TH / sens | yes | RoHS DIGITAL TEMPERATURE SENSOR | 40424 |
| ADSP-21061KS-160 | I/C SHARC DSP Analog Devices | Semiconductor / ic / TH / sharc | yes | RoHS ANALOG DEVICES SHARC DSP | 42389 |
| ADSP-21065 | I/C SHARC DSP Analog Devices | Semiconductor / ic / TH / sharc | yes | RoHS ANALOG DEVICES SHARC DSP | 42708 |
| ADSP-21262SKSTZ200 | I/C SHARC DSP Analog Devices | Semiconductor / ic / TH / sharc | yes | RoHS ANALOG DEVICES DSP | 42390 |
| +DownMix | DaySequerra DTS DownMix Option | TH / - |  |  | 43533 |
| +MultiMerge | DaySequerra DTS MultiMerge Option | TH / - |  |  | 43534 |
| +NLC4+ST | Dolby Multichannel Decoder Module | TH / - |  | DOLBY MULTICHANNEL DECODER MODULE | 43535 |
| +NLC5.1+ST | DaySequerra DTS Neural Loudness Control Option 5.1 plus Stereo | TH / - |  |  | 43536 |
| +UpMix | DaySequerra DTS UpMix Option | TH / - |  |  | 43537 |
| 1CON-Patch Normal | 1CON - Patchbay Normal | TH / - |  |  | 217553 |
| AMS8-2A DEMUX 3 | HD/SD-SDI Option/AMS8-2A | TH / - |  | HD/SD-SDI OPTION/AMS8-2A | 43264 |
| AMS8-2A DOLBY | Dolby Option/AMS8-2A | TH / - |  | DOLBY OPTION/AMS8-2A | 43265 |
| BVU-Driver Shield | BVU-Driver Shield | TH / - |  |  | 217462 |
| BVU-NKD | Big VU Meter - Naked - smart pixel VU Meter whip | TH / - |  | Big VU Meter - Naked - smart pixel VU meter whip | 217457 |
| BVU-microDriver | BVU-microDriver | TH / - |  |  | 217461 |
| CAT552 | Multichannel Decoder Module Dolby | TH / - |  | DOLBY MULTICHANNEL DECODER MODULE | 43259 |
| CONVMASA4K | Blackmagic Design Mini Converter - SDI to Analog 4K | TH / - |  |  | 216982 |
| CPU-DSP17-WBS | Clock Display Torpey | TH / - |  | TORPEY CLOCK DISPLAY | 37838 |
| D30552 | Mono Fader Assembly PGF-4250 | TH / - |  | MONO FADER ASSY PGF-4250 | 37860 |
| HD10CEA | AJA Mini Converter - SD/HD-SDI to Analog Audio/Video | TH / - |  |  | 216983 |
| I64 | MADI Card - MultiMode Fiber | TH / - |  | MADI CARD - MultiMode Fiber | 42949 |
| I64-SM | MADI Card - Single Mode Fiber | TH / - |  | MADI CARD - Single Mode Fiber | 216859 |
| MSD600M++ | Master Stereo and Surround Meter | TH / - |  | MASTER STEREO AND SURROUND METER | 41447 |
| MSD600M-CABLE/O | Cable for MSD600M-INPUT/1 - DSUB to XLR | TH / - |  | CABLE FOR MSD600M-INPUT/1 - DSUB to XLR | 41448 |
| MSD600M-INPUT/1 | 2 x Analog Input | TH / - |  | 2XANALOG | 41449 |
| PGF3210 | Fader VCA Type | TH / - |  | FADER VCA TYPE           SEE NOTES | 41479 |
| SNMP | Optional SNMP Control for openGear | TH / - |  | optional SNMP control for openGear | 40639 |
| ZFL-LED-R | ZFL Indicator Assembly | TH / - |  | ZFL INDICATOR ASSY | 40475 |
| 7000-017-1 | Belt Clip | WBS-CUSTOM / Metal Shop | yes | RoHS Belt Clip | 35775 |
| 8100-006 | PCB Isolator Light Bar | WBS-CUSTOM / Metal Shop | yes | RoHS PCB ISOLATOR LIGHT BAR | 37110 |
| 8100-WASHER | MP Series Meter Washer | WBS-CUSTOM / Metal Shop | yes | RoHS MP SERIES METER WASHER | 37116 |
| 82-004-1 | 8210/12 Side Plate Left | WBS-CUSTOM / Metal Shop | yes | RoHS 8210/12 SIDE PLATE LEFT | 37125 |
| 82-004-2 | 8210/12 Side Plate Right Vented | WBS-CUSTOM / Metal Shop | yes | RoHS 8210/12 SIDE PLATE RIGHT VENTED | 37126 |
| 82-008-1 | 8210/12 Mounting Block Power Supply | WBS-CUSTOM / Metal Shop | yes | RoHS 8210/12 MTG BLOCK PWR SUPPLY | 37127 |
| 82-009-1 | 8210/12 Spring Plate | WBS-CUSTOM / Metal Shop | yes | RoHS 8210/12 SPRING PLATE | 37128 |
| 82-011-1 | Lacing Bar | WBS-CUSTOM / Metal Shop | yes | RoHS LACING BAR | 37129 |
| 82-011-2 | Pillar Lacing Bar | WBS-CUSTOM / Metal Shop | yes | RoHS PILLAR LACING BAR | 37130 |
| 82-072 | Power Supply Box | WBS-CUSTOM / Metal Shop | yes | RoHS POWER SUPPLY BOX | 37131 |
| 82-075 | 8212 BNC Termination Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS 8212 BNC TERMINATION BRACKET | 37135 |
| 82-076 | 8210 BNC Termination Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS 8210 BNC TERMINATION BRACKET | 37136 |
| 82-077 | Power Supply Box Door | WBS-CUSTOM / Metal Shop | yes | RoHS POWER SUPPLY BOX DOOR | 37137 |
| 82-078 | BNC Mounting Bracket TB8205P/75 | WBS-CUSTOM / Metal Shop | yes | RoHS BNC MOUNTING BRACKET TB8205P/75 | 37138 |
| 82-079 | 8212 BNC Termination Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS 8212 BNC TERMINATION BRACKET | 37139 |
| 82-080 | TB8205P/75 Spacer | WBS-CUSTOM / Metal Shop | yes | RoHS TB8205P/75 SPACER | 37140 |
| 8205-004 | Universal DA Card Handle | WBS-CUSTOM / Metal Shop | yes | RoHS UNIVERSAL DA CARD HANDLE | 37143 |
| 901-001 | PCB Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS PCB MOUNTING BRACKET | 37157 |
| 905-003 | Slug for Mounting Potentiometer | WBS-CUSTOM / Metal Shop | yes | RoHS POT MOUNTING SLUG | 37158 |
| 905-004 | Scrub Wheel | WBS-CUSTOM / Metal Shop | yes | RoHS SCRUB WHEEL | 37159 |
| 9292 | Module Extractor | WBS-CUSTOM / Metal Shop | yes | RoHS MODULE EXTRACTOR | 37162 |
| 9536 | Floating Nut | WBS-CUSTOM / Metal Shop | yes | RoHS FLOATING NUT | 37174 |
| 9604 | Spring clip | WBS-CUSTOM / Metal Shop | yes | RoHS SPRING CLIP | 37176 |
| 9750 | Washer Fish Paper .14IDx.37OD | WBS-CUSTOM / Metal Shop | yes | RoHS WASHER FISH PAPER .14IDx.37OD | 37177 |
| 9752 | Allen Screw | WBS-CUSTOM / Metal Shop | yes | RoHS ALLEN SCREW | 37178 |
| 9821-2 | Washer (PCB Side) | WBS-CUSTOM / Metal Shop | yes | RoHS WASHER (PCB SIDE) | 37179 |
| ABB-M1 | Audio Bit Buddy Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS AUDIO BIT BUDDY ENCLOSURE | 37186 |
| ABB-M5 | Audio Bit Buddy Inner Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS AUDIO BIT BUDDY INNER BRACKET | 37188 |
| ABB-M6 | Audio Bit Buddy Battery Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS AUDIO BIT BUDDY BATTERY BRACKET | 37189 |
| AMS16A2-M8 | Custom Nylon Standoff 0.203 | WBS-CUSTOM / Metal Shop | yes | RoHS CUSTOM NYLON STANDOFF 0.203 | 42415 |
| AMS2-BOTTOM | Bottom Pan | WBS-CUSTOM / Metal Shop | yes | RoHS BOTTOM PAN | 216998 |
| AMS2-SPEAKER BOX | Speaker Box | WBS-CUSTOM / Metal Shop | yes | RoHS Speaker Box | 217370 |
| AMS2-TOP | Top Cover | WBS-CUSTOM / Metal Shop | yes | RoHS TOP COVER | 217324 |
| AMS2-TWEETER BRACKET | Tweeter Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS Tweeter Bracket | 217371 |
| AMS4-002 | Mid-Range Speaker Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS MID RANGE SPEAKER BRACKET | 42417 |
| AMS4-004 | Large Speaker Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS LARGE SPEAKER ENCLOSURE | 42418 |
| AMS4-005 | Large Speaker Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS LARGE SPEAKER MOUNTING BRACKET | 42419 |
| AMS4-007 | Foam/Large Speaker | WBS-CUSTOM / Metal Shop | yes | RoHS FOAM/LARGE SPEAKER | 42420 |
| AMS4-008-2 | Foam/Medium Speaker Right Side | WBS-CUSTOM / Metal Shop | yes | RoHS FOAM/MEDIUM SPEAKER RIGHT SIDE | 42421 |
| AMS4-010 | Heatsink | WBS-CUSTOM / Metal Shop | yes | RoHS HEATSINK | 42423 |
| AMS4-BOTTOM | Bottom Panel | WBS-CUSTOM / Metal Shop | yes | RoHS BOTTOM PANEL | 42430 |
| AMS4-SIDE | SELECT SERIES Side Panel | WBS-CUSTOM / Metal Shop | yes | RoHS SELECT SERIES SIDE PANEL | 42433 |
| AMS4-SPACER | Spacer/EN5F Speaker | WBS-CUSTOM / Metal Shop | yes | RoHS SPACER/EN5F SPEAKER | 42434 |
| AMS4-TOP | SELECT SERIES Top Cover | WBS-CUSTOM / Metal Shop | yes | RoHS SELECT SERIES TOP COVER | 42435 |
| AMS8-M13 | Brass 1.648 Standoff | WBS-CUSTOM / Metal Shop | yes | RoHS BRASS 1.648 STANDOFF | 42440 |
| AMS8-M14 | .125 PVC Standoff x 2-56 | WBS-CUSTOM / Metal Shop | yes | RoHS .125 PVC STANDOFF x 2-56 | 42441 |
| AMS8-M15 | 3/16 Hexagonal BR Standoff .804X2-56 | WBS-CUSTOM / Metal Shop | yes | RoHS 3/16 HEX BR STNDOFF .804X2-56 | 42442 |
| AMS8-M16 | Speaker Foam | WBS-CUSTOM / Metal Shop | yes | RoHS SPEAKER FOAM | 42443 |
| AMS8-M17 | 0.765 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop | yes | RoHS 0.765 NYLON STNDOFF/DEMUX | 42444 |
| AMS8-M18 | 0.636 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop | yes | RoHS 0.636 NYLON STNDOFF/DEMUX | 42445 |
| AMS8-M3 | Left/Right Wing | WBS-CUSTOM / Metal Shop | yes | RoHS LEFT/RIGHT WING | 42452 |
| AMS8-M4 | Top Cover | WBS-CUSTOM / Metal Shop | yes | RoHS TOP COVER | 42453 |
| AMS8-M5 | Bottom Pan | WBS-CUSTOM / Metal Shop | yes | RoHS BOTTOM PAN | 42454 |
| AMS8-M7 | Tweeter Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS TWEETER MOUNTING BRACKET | 42456 |
| AMS8-M8 | Speaker Shim | WBS-CUSTOM / Metal Shop | yes | RoHS SPEAKER SHIM | 42457 |
| AMS8-M9 | Speaker Washer | WBS-CUSTOM / Metal Shop | yes | RoHS SPEAKER WASHER | 42458 |
| AMS82-1M10 | 3.398 Hexagonal Brass Standoff | WBS-CUSTOM / Metal Shop | yes | RoHS 3.398 HEX BRASS STANDOFF | 42459 |
| AMS82-1M8 | Heatsink | WBS-CUSTOM / Metal Shop | yes | RoHS HEATSINK | 42464 |
| AMS82-1M9 | Speaker Foam | WBS-CUSTOM / Metal Shop | yes | RoHS SPEAKER FOAM | 42465 |
| AMX9A-BOTTOM | AMX9A Bottom Panel | WBS-CUSTOM / Metal Shop | yes | RoHS AMX9A BOTTOM PANEL | 42478 |
| AMX9A-TOP | AMX9A Top Panel | WBS-CUSTOM / Metal Shop | yes | RoHS AMX9A TOP PANEL | 37493 |
| BNC-ADAPT | BNC in XLR Cutout Adapter | WBS-CUSTOM / Metal Shop | yes | RoHS BNC IN XLR CUTOUT ADAPTER | 37506 |
| DE-9 | Cover Plate 9-Position D-Sub | WBS-CUSTOM / Metal Shop | yes | RoHS COVER PLATE - 9 PIN "D" | 37874 |
| DEMUX4-COVER | Cover Plate for Demux 4 | WBS-CUSTOM / Metal Shop |  |  | 216826 |
| DEMUX4-REAR | Adapter Plate for Demux 4 | WBS-CUSTOM / Metal Shop |  |  | 44000 |
| DMS1-M2-2 | DMS1 0.625 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop | yes | RoHS DMS1 0.625 NYLON STANDOFF/DEMUX | 37880 |
| GR200M1 | R2K Blank Panel | WBS-CUSTOM / Metal Shop | yes | RoHS R2K BLANK PANEL | 41923 |
| IMP162013-M1 | 16-Position BNC Panel | WBS-CUSTOM / Metal Shop |  | 16 POSITION BNC CLAM | 43356 |
| IMP162013-M2 | 16-Position XLR Panel | WBS-CUSTOM / Metal Shop |  | 16 POSITION XLR CLAM | 43357 |
| IMP202013-M1 | 20-Position BNC Panel | WBS-CUSTOM / Metal Shop |  | 20 POSITION BNC CLAM | 43528 |
| IMP202013-M2 | 20-Position Terminal Block Panel | WBS-CUSTOM / Metal Shop |  | 20 POSITION Terminal Block CLAM | 43529 |
| IMPM01-3 | Ident Extrusion | WBS-CUSTOM / Metal Shop | yes | RoHS IDENT EXTRUSION | 41977 |
| IMPM01-4 | Ident Cover | WBS-CUSTOM / Metal Shop | yes | RoHS IDENT COVER | 41580 |
| MF250M9 | MF251 Outer Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS MF251 OUTER BRACKET | 41400 |
| MF6220-1M28 | MF6220 Extender Rod Bracket Small Hole | WBS-CUSTOM / Metal Shop |  | MF6220 EXT ROD BRACKET SMALL HOLE | 41402 |
| MF6220-1M29 | MF6220 Nylon Extension Rod | WBS-CUSTOM / Metal Shop |  | MF6220 NYLON EXTENSION ROD | 41404 |
| MF6220-1M33 | MF6220 Nylon Extension Rod | WBS-CUSTOM / Metal Shop |  | MF6220 NYLON EXTENSION ROD | 41406 |
| MF8212RM2 | Power Source Cover | WBS-CUSTOM / Metal Shop | yes | RoHS POWER SOURCE COVER | 41410 |
| POD-005 | RMK2 Center Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS RMK2 CENTER MOUNTING BRACKET | 41198 |
| POD-006 | RMK2 Top Cover | WBS-CUSTOM / Metal Shop | yes | RoHS RMK2 TOP COVER | 41199 |
| POD-007 | RMK2 Bottom Pan | WBS-CUSTOM / Metal Shop | yes | RoHS RMK2 BOTTOM PAN | 41200 |
| POD-008 | RMK2 Mounting Wing | WBS-CUSTOM / Metal Shop | yes | RoHS RMK2 MOUNTING WING | 41201 |
| POD-009-1 | RMK1 Mounting Wing LHS | WBS-CUSTOM / Metal Shop | yes | RoHS RMK1 MOUNTING WING LHS | 41202 |
| POD-009-2 | RMK1 Mounting Wing RHS | WBS-CUSTOM / Metal Shop | yes | RoHS RMK1 MOUNTING WING RHS | 41203 |
| POD-011 | Power Supply Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS POWER SUPPLY MOUNTING BRACKET | 43753 |
| POD-015 | Styrene Mounting Spacer | WBS-CUSTOM / Metal Shop | yes | RoHS STYRENE MOUNTING SPACER | 41206 |
| POD14B-BRACKET | Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS Mounting Bracket | 216955 |
| POD24-HEATSINK | Heatsink | WBS-CUSTOM / Metal Shop | yes | RoHS HEATSINK | 41252 |
| POD24-PLATE | Mounting Plate | WBS-CUSTOM / Metal Shop | yes | RoHS MOUNTING PLATE | 41254 |
| POD33-M3 | Chroma Filter | WBS-CUSTOM / Metal Shop | yes | RoHS CHROMA FILTER | 40980 |
| POD34-PLATE | Mounting Plate | WBS-CUSTOM / Metal Shop | yes | RoHS MOUNTING PLATE | 216996 |
| POD6-001 | Table Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS TABLE MOUNTING BRACKET | 40995 |
| POD6-MTG | Table Mounting Bracket Kit | WBS-CUSTOM / Metal Shop | yes | RoHS TABLE MOUNTING BRACKET KIT | 43736 |
| QSP-BOTTOM | Bottom Panel | WBS-CUSTOM / Metal Shop | yes | RoHS BOTTOM PANEL | 41032 |
| QSP-INS | Main Board INSULATOR | WBS-CUSTOM / Metal Shop | yes | RoHS MAIN BOARD INSULATOR | 41034 |
| R201M1 | R201 FacePlate | WBS-CUSTOM / Metal Shop | yes | RoHS R201 FACEPLATE | 41051 |
| R250M24RETRO-KIT | Retro Kit for Sifam Meters | WBS-CUSTOM / Metal Shop | yes | RoHS RETRO KIT FOR SIFAM METERS | 40796 |
| R257M1 | R257 Endbell | WBS-CUSTOM / Metal Shop | yes | RoHS R257 ENDBELL | 40843 |
| R257M10 | R257-2 Slide Switch Plate | WBS-CUSTOM / Metal Shop | yes | RoHS R257-2 SLIDE SWITCH PLATE | 40844 |
| R257M2 | R257 Bottom Pan | WBS-CUSTOM / Metal Shop | yes | RoHS R257 BOTTOM PAN | 40845 |
| R257M8 | R257-2 Body | WBS-CUSTOM / Metal Shop | yes | RoHS R257-2 BODY | 40851 |
| R257M9 | R257-2 Premic Shield | WBS-CUSTOM / Metal Shop | yes | RoHS R257-2 PREMIC SHIELD | 40852 |
| RAV24-BOTTOM | Bottom Pan | WBS-CUSTOM / Metal Shop | yes | RoHS BOTTOM PAN | 40854 |
| RLM2-M3 | Eyebrow Top Cover | WBS-CUSTOM / Metal Shop | yes | RoHS EYEBROW TOP COVER | 40860 |
| RLM2-M4 | Eyebrow Bottom Cover | WBS-CUSTOM / Metal Shop | yes | RoHS EYEBROW BOTTOM COVER | 40861 |
| RLM2-M5 | Left/Right Side Panel | WBS-CUSTOM / Metal Shop | yes | RoHS LEFT/RIGHT SIDE PANEL | 40862 |
| RLM2-M6 | Seucring Angle | WBS-CUSTOM / Metal Shop | yes | RoHS SECURING ANGLE | 40863 |
| RLM2-M7 | Display Lens | WBS-CUSTOM / Metal Shop | yes | RoHS DISPLAY LENS | 40864 |
| RLM24-1M5 | Left/Right Side Plate | WBS-CUSTOM / Metal Shop | yes | RoHS LEFT/RIGHT SIDE PLATE | 40865 |
| SINGLE RACK-SPEAKER-BOX | Single Rack Speaker Box Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS Single Rack Speaker Box Enclosure | 217377 |
| SLM-1M1 | Meter Stand | WBS-CUSTOM / Metal Shop | yes | RoHS METER STAND | 40599 |
| SLM-1M11 | Spacer | WBS-CUSTOM / Metal Shop | yes | RoHS SPACER | 40600 |
| SLM-1M12 | Quad Meter Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS QUAD METER ENCLOSURE | 40601 |
| SLM-1M13 | Quad Meter Plexi Lens | WBS-CUSTOM / Metal Shop | yes | RoHS QUAD METER PLEXI LENS | 40602 |
| SLM-1M14 | Quad Joiner Plate | WBS-CUSTOM / Metal Shop | yes | RoHS QUAD JOINER PLATE | 40603 |
| SLM-1M15 | Custom Standoff | WBS-CUSTOM / Metal Shop | yes | RoHS CUSTOM STANDOFF | 40604 |
| SLM-1M16 | Custom Standoff | WBS-CUSTOM / Metal Shop | yes | RoHS CUSTOM STANDOFF | 40605 |
| SLM-1M18 | Meter Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS METER ENCLOSURE | 40606 |
| SLM-1M2 | Single Meter Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS SINGLE METER ENCLOSURE | 40607 |
| SLM-1M20 | Dual Analog Meter Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS DUAL ANALOG METER ENCLOSURE | 40608 |
| SLM-1M3 | Thumbscrew | WBS-CUSTOM / Metal Shop | yes | RoHS THUMBSCREW | 40609 |
| SLM-1M4 | Dual Meter Enclosure | WBS-CUSTOM / Metal Shop | yes | RoHS DUAL METER ENCLOSURE | 40610 |
| SLM-1M5 | Dual Meter Plexi Lens | WBS-CUSTOM / Metal Shop | yes | RoHS DUAL METER PLEXI LENS | 40611 |
| SLM-1M7 | Single Meter Plexi Lens | WBS-CUSTOM / Metal Shop | yes | RoHS SINGLE METER PLEXI LENS | 40612 |
| SLM-1M8 | Single Joiner Plate | WBS-CUSTOM / Metal Shop | yes | RoHS SINGLE JOINER PLATE | 40613 |
| SLM-1M9 | Dual Joiner Plate | WBS-CUSTOM / Metal Shop | yes | RoHS DUAL JOINER PLATE | 40614 |
| ST4X3#440 | Standoff | WBS-CUSTOM / Metal Shop | yes | RoHS STANDOFF | 40657 |
| ST5X3#256 | Spacer 2-56X5/16LX3/16D Hexagonal Brass | WBS-CUSTOM / Metal Shop | yes | RoHS SPACER 2-56X5/16LX3/16D HEX BRASS | 40658 |
| XTM4-M10 | XTM4 Jack Strip Dress Panel | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 JACK STRIP DRESS PANEL | 40460 |
| XTM4-M11 | XTM4 Bantam Jack Spacer Strip | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 Bantam Jack Spacer Strip | 216965 |
| XTM4-M12 | XTM4 Bantam Jack Dress Strip | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 Bantam Jack Dress Strip | 216966 |
| XTM4-M14-2 | XTM4 1.698 Nylon Spacer/Demux | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 1.698 NYLON SPACER/DEMUX | 40462 |
| XTM4-M15-1 | Sifam Meter Escutcheon | WBS-CUSTOM / Metal Shop | yes | RoHS SIFAM METER ESCUTCHEON | 40463 |
| XTM4-M15-2 | Sifam Meter Spacer | WBS-CUSTOM / Metal Shop | yes | RoHS SIFAM METER SPACER | 40464 |
| XTM4-M3 | XTM4 Side Panel | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 SIDE PANEL | 40465 |
| XTM4-M4 | XTM4 2RU Rack Wing | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 2RU RACK WING | 40466 |
| XTM4-M5 | XTM4 Meter Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 METER MOUNTING BRACKET | 40467 |
| XTM4-M5-1 | XTM4 Meter Mounting Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 METER MOUNTING BRACKET | 40468 |
| XTM4-M6 | XTM4 Top PCB Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 TOP PCB BRACKET | 40469 |
| XTM4-M7 | XTM4 Bottom PCB Bracket | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 BOTTOM PCB BRACKET | 40470 |
| XTM4-M8 | XTM4 Chroma Filter | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 CHROMA FILTER | 40471 |
| XTM4-M9 | XTM4 Jack Strip Spacer | WBS-CUSTOM / Metal Shop | yes | RoHS XTM4 JACK STRIP SPACER | 40472 |
| 32ME-M1 | 32ME Front Panel | WBS-CUSTOM / Metal Shop / 32ME | yes | RoHS 32ME FRONT PANEL | 35162 |
| 32ME-M2 | 32ME Rear Panel | WBS-CUSTOM / Metal Shop / 32ME | yes | RoHS 32ME REAR PANEL | 35164 |
| 32ME-M3 | Meter Chroma Filter | WBS-CUSTOM / Metal Shop / 32ME | yes | RoHS METER CHROMA FILTER | 35166 |
| 32ME-M4 | Character Display Chroma Filter | WBS-CUSTOM / Metal Shop / 32ME |  | CHARACTER DISPLAY CHROMA FILTER | 35168 |
| 32ME-M6-1 | Standoff-Brass | WBS-CUSTOM / Metal Shop / 32ME | yes | RoHS STANDOFF-BRASS | 35169 |
| 32ME-M6-2 | Standoff-Brass | WBS-CUSTOM / Metal Shop / 32ME | yes | RoHS STANDOFF-BRASS | 35171 |
| 32ME-M7 | 2-56x7/16 Flathead Screw Black | WBS-CUSTOM / Metal Shop / 32ME | yes | RoHS 2-56x7/16 FLATHEAD SCREW BLACK | 35173 |
| 8100-007-1 | Meter Mounting Plate | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS METER MOUNTING PLATE | 37111 |
| 8100-007-2 | Washer | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS WASHER | 37112 |
| 8100-008 | Modified Solder Lug | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS MODIFIED SOLDER LUG | 37113 |
| 8100-COVER | MP Series Top/Bottom Cover | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS MP SERIES TOP/BOTTOM COVER | 43545 |
| 8100-REAR | MP Series Rear Panel | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS MP SERIES REAR PANEL | 37114 |
| 8100-SIDE | MP Series Side Bracket | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS MP SERIES SIDE BRACKET | 37115 |
| 8100MP-1 | Meter Panel (1) | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS METER PANEL (1) | 37117 |
| 8100MP-2 | Meter Panel (2) | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS METER PANEL (2) | 37118 |
| 8100MP-3 | Meter Panel (3) | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS METER PANEL (3) | 37119 |
| 8100MP-4 | Meter Panel (4) | WBS-CUSTOM / Metal Shop / 8100 | yes | RoHS METER PANEL (4) | 37120 |
| AMS16A2-M10 | AMS16A2 0.188 Outer Diameter x 0.267 Long Nylon | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 0.188 OD x 0.267 LONG NYLON | 42409 |
| AMS16A2-M11 | AMS16A2 .187 Outer Diameter x .171 Inner Diameter Nylon | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 .187 OD x .171 ID NYLON | 42410 |
| AMS16A2-M3 | AMS16A2 Display Chroma Filter | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 DISPLAY CHROMA FILTER | 42412 |
| AMS16A2-M4 | AMS16A2 Bronze Plexiglas Lens | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 BRONZE PLEXIGLAS LENS | 42413 |
| AMS16A2-M5 | AMS16A2 Bottom Pan | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 BOTTOM PAN | 42414 |
| AMS16A2-M7 | AMS16A2 Top Cover | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 TOP COVER | 43260 |
| AMS16A2-M9 | AMS16A2 .240 Outer Diameter x .110 Inner Diameter PVC | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS16A2 .240 OD x .110 ID PVC | 42416 |
| AMS4-012 | AMS4 0.793 Nylon Spacer/DEMUX | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS4 0.793 NYLON SPACER/DEMUX | 42424 |
| AMS4-013 | AMS4 0.312 Nylon Spacer | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS4 0.312 NYLON SPACER | 42425 |
| AMS8-M10 | AMS81 Chroma Filter Display Lens | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS81 CHROMA FILTER DISPLAY LENS | 42438 |
| AMS8-M12 | AMS81 Heatsink Support Bracket | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS81 HEATSINK SUPPORT BRACKET | 42439 |
| AMS8-M6 | AMS81 Display Lens | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS81 DISPLAY LENS | 42455 |
| AMS82-1M13 | AMS82 2.515 Nylon Standoff/DEMUX | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS82 2.515 NYLON STNDOFF/DEMUX | 42460 |
| AMS82-1M14 | AMS82A 0.821 Nylon Standoff DEMUX | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS82A 0.821 NYLON STNDOFF DEMUX | 42461 |
| AMS82-1M6 | AMS82 Grey Chroma Filter | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS82 GREY CHROMA FILTER | 42462 |
| AMS82-1M7 | AMS82 Display Lens | WBS-CUSTOM / Metal Shop / AMS | yes | RoHS AMS82 DISPLAY LENS | 42463 |
| AMS16A2-M1 | AMS16A2 Front Panel | WBS-CUSTOM / Metal Shop / AMS / FRONT | yes | RoHS AMS16A2 FRONT PANEL | 42408 |
| AMS8-M22 | AMS8-1BA Front Panel - ABC Release Spec. | WBS-CUSTOM / Metal Shop / AMS / FRONT | yes | RoHS AMS8-1BA Front Panel - ABC Release Spec. | 42449 |
| AMS8-M23 | AMS8-1CA Front Panel - ABC Graphics Spec. | WBS-CUSTOM / Metal Shop / AMS / FRONT | yes | RoHS AMS8-1CA Front Panel - ABC Graphics Spec. | 42450 |
| AMS8-M24 | AMS8-1A Front Panel New Style | WBS-CUSTOM / Metal Shop / AMS / FRONT | yes | RoHS AMS8-1A FRONT PANEL NEW STYLE | 42451 |
| AMS82-1M1 | AMS82 Front Panel | WBS-CUSTOM / Metal Shop / AMS / FRONT | yes | RoHS AMS82 FRONT PANEL | 43261 |
| AMS16A2-M2 | AMS16A2 Rear Panel | WBS-CUSTOM / Metal Shop / AMS / REAR | yes | RoHS AMS16A2 REAR PANEL | 42411 |
| AMS8-M21 | AMS8-1AAEM 75 Ohm Rear Panel | WBS-CUSTOM / Metal Shop / AMS / REAR | yes | RoHS AMS8-1AAEM 75 OHM REAR PANEL | 42448 |
| AMS82-1M2 | AMS82 Rear Panel | WBS-CUSTOM / Metal Shop / AMS / REAR | yes | RoHS AMS82 REAR PANEL | 43262 |
| 82-002-1 | 8212 Support Rail Upper Front | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS 8212 SUPPORT RAIL UPPER FRONT | 37121 |
| 82-002-2 | 8212 Support Rail Lower Front | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS 8212 SUPPORT RAIL LOWER FRONT | 37122 |
| 8212-020 | 8210/12 Front Door Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS 8210/12 FRONT DOOR PANEL | 37144 |
| ABB-M7 | Audio Bit Buddy Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS AUDIO BIT BUDDY FRONT PANEL | 37190 |
| ABS-FRONT | ABS-1 Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS ABS-1 FRONT PANEL | 42380 |
| AMS2-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 217000 |
| AMS4-009 | Front Panel Display Lens | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL DISPLAY LENS | 42422 |
| AMS4-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 42431 |
| AMX9A-FRONT | AMX9A Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS AMX9A FRONT PANEL | 42180 |
| DME64N-FRONT | DME64N Custom Front | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS DME64N Custom FRONT | 217243 |
| DMS1-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 37879 |
| FADER-FRONT | Remote/FADER Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS REMOTE/FADER FRONT PANEL | 41901 |
| POD1-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 43547 |
| POD10-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41210 |
| POD10A-FRONT | Front Panel - AES Switch | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL - AES SWITCH | 43957 |
| POD11A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41213 |
| POD12-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41215 |
| POD12A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 43977 |
| POD14A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41219 |
| POD14B-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 216950 |
| POD16-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41226 |
| POD17-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41231 |
| POD18-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41235 |
| POD2-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41238 |
| POD22-M1 | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41243 |
| POD24-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41251 |
| POD25-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41256 |
| POD26-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41260 |
| POD28-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41264 |
| POD29-M1 | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 43754 |
| POD30-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41269 |
| POD31-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41274 |
| POD33-M1 | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 43758 |
| POD34-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 216994 |
| POD3A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 40984 |
| POD7-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 40998 |
| POD8-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41001 |
| POD8A-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 217483 |
| POD9-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL (SEE NOTES) | 41005 |
| QSP-FRONT | Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS FRONT PANEL | 41033 |
| RLM2-M1 | Eyebrow Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS EYEBROW FRONT PANEL | 40858 |
| XTM4-M1 | XTM4 Front Panel | WBS-CUSTOM / Metal Shop / FRONT | yes | RoHS XTM4 FRONT PANEL | 43731 |
| IMP162013-M3 | IMP Panel Wing | WBS-CUSTOM / Metal Shop / IMP |  | IMP PANEL WING | 43358 |
| IMPM03-EF | IMP XLR Panel Evertz AESIMP-12F | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP XLR PANEL EVERTZ AESIMP-12F | 44005 |
| IMPM03-EFM | IMP XLR Panel Evertz AESIMP-6F6M | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP XLR PANEL EVERTZ AESIMP-6F6M | 44003 |
| IMPM03-EM | IMP XLR Panel Evertz AESIMP-12M | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP XLR PANEL EVERTZ AESIMP-12M | 41582 |
| IMPM04-1-EF | IMP BNC Panel Evertz AESIMP-12F | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP BNC PANEL EVERTZ AESIMP-12F | 44006 |
| IMPM04-1-EFM | IMP BNC Panel Evertz AESIMP-6F6M | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP BNC PANEL EVERTZ AESIMP-6F6M | 44004 |
| IMPM04-1-EM | IMP BNC Panel Evertz AESIMP-12M | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP BNC PANEL EVERTZ AESIMP-12M | 41584 |
| IMPM06-1 | IMP Ident Extrusion 12 | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP IDENT EXTRUSION 12 | 41585 |
| IMPM06-2 | IMP Ident Cover 12 | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP IDENT COVER 12 | 41586 |
| IMPM08 | IMP End Bracket | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP END BRACKET | 41587 |
| IMPM09 | IMP Rack Wing | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP RACK WING | 41588 |
| IMPM12 | IMP End Bracket | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP END BRACKET | 41589 |
| IMPM13 | IMP Rack Wing | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP RACK WING | 41590 |
| IMPM20 | IMP Panel 20BNC/TB3 | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP PANEL 20BNC/TB3 | 41592 |
| IMPM24 | IMP Panel Spacer 0.230OD x 0.084ID | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP PANEL SPACER 0.230OD x 0.084ID | 41596 |
| IMPM25 | IMP Panel Spacer 0.247OD x 0.114ID | WBS-CUSTOM / Metal Shop / IMP | yes | RoHS IMP PANEL SPACER 0.247OD x 0.114ID | 41597 |
| IMPM16 | IMP12 Front Panel 2 Rack Units | WBS-CUSTOM / Metal Shop / IMP / FRONT | yes | RoHS IMP12 Front Panel 2 Rack Units | 41591 |
| IMPM23 | IMP20A Rear Panel 2 RU | WBS-CUSTOM / Metal Shop / IMP / REAR | yes | RoHS IMP20A REAR PANEL 2 RU | 41595 |
| microAmp-BOT | MicroAmp Bottom Cover | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroAmp BOTTOM COVER | 217298 |
| microAmp-TOP-110 | MicroAmp Top Cover / 110 | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroAmp TOP COVER / 110 | 217297 |
| microAmp-TOP-75 | MicroAmp Top Cover / 75 | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroAmp TOP COVER / 75 | 217296 |
| microDemux-BOT | MicroDemux Bottom Cover | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroDemux BOTTOM COVER | 217543 |
| microDemux-TOP | MicroDemux Top Cover | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroDemux TOP COVER | 217544 |
| microMatch-Bottom | MicroMatch Bottom Cover | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroMatch Bottom Cover | 217326 |
| microMatch-Top | MicroMatch Top Cover | WBS-CUSTOM / Metal Shop / MICRO | yes | RoHS MicroMatch Top Cover | 217310 |
| MLC8-M14 | MLC8 3/16 Hexagonal Brass Standoff .400 | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 3/16 HEX BRASS STANDOFF .400 | 41423 |
| MLC8-M15 | MLC8 3/32 Plastic Spacer .093 | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 3/32 PLASTIC SPACER .093 | 41424 |
| MLC8-M2 | MLC8 Inner Potentiometer Support Bracket | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 INNER POT SUPPORT BRACKET | 41425 |
| MLC8-M3 | MLC8 Display Lens | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 DISPLAY LENS | 41426 |
| MLC8-M4 | MLC8 Top Cover | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 TOP COVER | 41427 |
| MLC8-M5 | MLC8 Bottom Pan | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 BOTTOM PAN | 41428 |
| MLC8-M7 | MLC8 Left/Right Mounting Wing | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 LEFT/RIGHT MOUNTING WING | 41430 |
| MLC8-M8 | MLC8 3/16 Hexagonal Brass Standoff .550 | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 3/16 HEX BRASS STANDOFF .550 | 41431 |
| MLC8-M9 | MLC8 3/16 Hexagonal Brass Standoff.857 | WBS-CUSTOM / Metal Shop / MLC | yes | RoHS MLC8 3/16 HEX BRASS STANDOFF.857 | 41432 |
| MLC8-M1 | MLC8A Front Panel | WBS-CUSTOM / Metal Shop / MLC / FRONT | yes | RoHS MLC8A FRONT PANEL | 41419 |
| MLC8-M11 | MLC8B Front Panel | WBS-CUSTOM / Metal Shop / MLC / FRONT | yes | RoHS MLC8B FRONT PANEL | 41421 |
| AMS8-M19 | MLC-8B Rear Panel | WBS-CUSTOM / Metal Shop / MLC / REAR | yes | RoHS MLC-8B REAR PANEL | 42446 |
| MLC8-M6 | MLC8R Rear Panel | WBS-CUSTOM / Metal Shop / MLC / REAR | yes | RoHS MLC8R REAR PANEL | 41429 |
| POD-001 | POD Universal Top Cover | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD UNIVERSAL TOP COVER | 41195 |
| POD-002 | POD Universal Bottom Cover | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD UNIVERSAL BOTTOM COVER | 41196 |
| POD-004 | POD Inner Bracket | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD INNER BRACKET | 41197 |
| POD-016 | Dual POD Mounting Wing | WBS-CUSTOM / Metal Shop / POD | yes | RoHS DUAL POD MOUNTING WING | 41207 |
| POD-017 | Dual POD Joiner Plate | WBS-CUSTOM / Metal Shop / POD | yes | RoHS DUAL POD JOINER PLATE | 41208 |
| POD29E-PLATE | POD29E- PSU mounting Plate | WBS-CUSTOM / Metal Shop / POD |  | POD29E- PSU mounting PLATE | 217413 |
| POD29L-PLATE | POD29L-PSU mounting plate | WBS-CUSTOM / Metal Shop / POD |  |  | 217412 |
| POD2R-PLATE | POD2 Remote Blank Plate | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD2 REMOTE BLANK PLATE | 41268 |
| POD30-SPACER | Spacer/SA-POD30-PBB | WBS-CUSTOM / Metal Shop / POD | yes | RoHS SPACER/SA-POD30-PBB | 41273 |
| POD30R-PLATE-1 | POD30 Remote Blank Plate | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD30 Remote Blank Plate | 216838 |
| POD30R-PLATE-2 | POD30R Remote Alignment Plate | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD30R Remote Alignment Plate | 216839 |
| POD30R-PLATE-3 | POD30R Remote Securing Slug | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD30R Remote Securing Slug | 216840 |
| POD33-M5 | POD33 Encoder Modification | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD33 ENCODER MODIFICATION | 42934 |
| POD34-SPACER | POD34 Spacer (Use in RMK2 and RMK3 for headphone jack) | WBS-CUSTOM / Metal Shop / POD |  |  | 217558 |
| POD4-SHIELD | POD4 Shield | WBS-CUSTOM / Metal Shop / POD | yes | RoHS POD4 SHIELD | 40991 |
| POD13A-M1 | POD13A Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT | yes | RoHS POD13A FRONT PANEL | 41217 |
| POD15A-FRONT | POD15A Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT | yes | RoHS POD15A FRONT PANEL | 41224 |
| POD33-M4 | POD33 Standoff For Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT | yes | RoHS POD33 STANDOFF FOR FRONT PANEL | 43763 |
| POD4-FRONT | POD4 Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT | yes | RoHS POD4 FRONT PANEL | 40986 |
| POD5-FRONT | POD5 Front Panel | WBS-CUSTOM / Metal Shop / POD / FRONT | yes | RoHS POD5 FRONT PANEL | 40992 |
| POD-010 | POD Blank Front/Rear Panel | WBS-CUSTOM / Metal Shop / POD / FRONT / REAR | yes | RoHS POD BLANK FRONT/REAR PANEL | 41204 |
| POD12/110-REAR | POD12/110 Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR | yes | RoHS POD12/110 REAR PANEL | 41216 |
| POD13A-M2 | POD13A Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR | yes | RoHS POD13A REAR PANEL | 41218 |
| POD15A-REAR | POD15A Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR | yes | RoHS POD15A REAR PANEL | 41225 |
| POD29E-Rear | POD-29E-Rear Panel - XLR power output +/- 12V | WBS-CUSTOM / Metal Shop / POD / REAR |  | POD-29E-Rear panel - XLR power output +/- 12V | 217414 |
| POD29L-Rear | POD-29E-Rear Panel - XLR power output +/- 24V with Phantom Power | WBS-CUSTOM / Metal Shop / POD / REAR |  | POD-29E-Rear panel - XLR power output +/- 24V with Phantom Power | 217415 |
| POD29X-Rear | POD-29X-Rear Panel - XLR power output | WBS-CUSTOM / Metal Shop / POD / REAR |  | POD-29X-Rear panel - XLR power output | 217411 |
| POD4-REAR | POD4 Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR | yes | RoHS POD4 REAR PANEL | 40990 |
| POD6-002 | POD6C Rear Panel | WBS-CUSTOM / Metal Shop / POD / REAR | yes | RoHS POD6C REAR PANEL | 40996 |
| 82-003-1 | 8212 Support Rail Upper Rear | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS 8212 SUPPORT RAIL UPPER REAR | 37123 |
| 82-003-2 | 8212 Support Rail Lower Rear | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS 8212 SUPPORT RAIL LOWER REAR | 37124 |
| ABB-M4 | Audio Bit Buddy Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS AUDIO BIT BUDDY REAR PANEL | 37187 |
| ABS-REAR | ABS-1 Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS ABS-1 REAR PANEL | 42381 |
| AMS2-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 216999 |
| AMS4-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 42432 |
| AMS8-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 42447 |
| AMX9A-REAR | AMX9A Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS AMX9A REAR PANEL | 37492 |
| DME64N-REAR | DME64N Custom Rear | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS DME64N Custom REAR | 217245 |
| DMS1-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 37881 |
| FADER-REAR | Remote/FADER Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REMOTE/FADER REAR PANEL | 41902 |
| MF8212RM1 | Rear Housing 8212 | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR HOUSING 8212 | 41409 |
| POD1-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43549 |
| POD10/110-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41212 |
| POD10A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43958 |
| POD11A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41214 |
| POD12/75-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43748 |
| POD12A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43978 |
| POD14A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41220 |
| POD14B-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 216951 |
| POD16-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41230 |
| POD17/110-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41233 |
| POD17/75-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41234 |
| POD18-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41236 |
| POD2-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41240 |
| POD22-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41244 |
| POD24-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41255 |
| POD25-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41259 |
| POD26-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41262 |
| POD28-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41266 |
| POD29-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43765 |
| POD30-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41272 |
| POD31-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41277 |
| POD33-M2 | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43762 |
| POD34-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 216995 |
| POD3A-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 40985 |
| POD5-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 40994 |
| POD7-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41000 |
| POD8-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41004 |
| POD8A-REAR-PHX | Rear Panel Terminal Block | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL PHOENIX | 217484 |
| POD8A-REAR-QTP | Rear Panel QTP | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL QTP | 217540 |
| POD8A-REAR-XLR | Rear Panel XLR | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL XLR | 217549 |
| POD9-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 43742 |
| QSP-REAR | Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS REAR PANEL | 41035 |
| R257M7 | R257-2 Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS R257-2 REAR PANEL | 40850 |
| RLM2-M2 | Eyebrow Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS EYEBROW REAR PANEL | 40859 |
| XTM4-M2 | XTM4 Rear Panel | WBS-CUSTOM / Metal Shop / REAR | yes | RoHS XTM4 REAR PANEL | 43732 |
| RTO214-COVER | RTO214 Cover | WBS-CUSTOM / Metal Shop / RTO |  |  | 216858 |
| RTO214-FRONT | RTO214 Front Panel | WBS-CUSTOM / Metal Shop / RTO / FRONT |  |  | 216856 |
| RTO47-FRONT | RTO47 Front Panel | WBS-CUSTOM / Metal Shop / RTO / FRONT |  |  | 217253 |
| RTO214-REAR | RTO214 Rear Panel | WBS-CUSTOM / Metal Shop / RTO / REAR |  |  | 216857 |
| SLM8-1M9 | SLM8 LED PCB Spacer | WBS-CUSTOM / Metal Shop / SLM | yes | RoHS SLM8 LED PCB SPACER | 40630 |
| 10-079PCB | PCB - Stereo Volume Control PCB | WBS-CUSTOM / PCB |  | STEREO VOLUME CONTROL PCB | 34516 |
| 14-060 | PCB - PPM Amplifier Board | WBS-CUSTOM / PCB |  | PPM AMPLIFIER BOARD | 42619 |
| 14-265 | PCB - M8204A/M8205/M8205B Audio DA PCB | WBS-CUSTOM / PCB | yes | RoHS M8204A/M8205/M8205B Audio DA PCB | 43540 |
| 14-266 | PCB - M8203 Oscillator Module PCB | WBS-CUSTOM / PCB |  | M8203 OSCILLATOR MODULE (SEE NOTES) | 43538 |
| 550208-1-1PCB | PCB - Custom Intercome Main PCB | WBS-CUSTOM / PCB |  | CUSTOM INTERCOM MAIN PCB | 36485 |
| 550208-1-3PCB | PCB - Distribution Channel PCB | WBS-CUSTOM / PCB |  | DISTRIBUTION CHANNEL PCB | 36487 |
| AA6201A-PCB | PCB - openGear Distribution Amplifier PCB | WBS-CUSTOM / PCB | yes | RoHS OPEN GEAR DIST AMP PCB | 43257 |
| ABB1-PCB | PCB - Audio Bit Buddy Main PCB | WBS-CUSTOM / PCB |  | AUDIO BIT BUDDY MAIN PCB | 42706 |
| ABS1-1PCB | PCB - ABS-1 Main Assembly PCB | WBS-CUSTOM / PCB |  | ABS-1 MAIN ASSEMBLY PCB | 42382 |
| ABS1-2PCB | PCB - ABS-1 Analog Output PCB | WBS-CUSTOM / PCB |  | ABS-1 ANALOG OUTPUT PCB | 42383 |
| ABS1-3PCB | PCB - ABS-1 Switch Assembly PCB | WBS-CUSTOM / PCB |  | ABS-1 SWITCH ASSEMBLY PCB | 42384 |
| AMS8E-11PCB | PCB - Auxiliary Output PCB | WBS-CUSTOM / PCB |  | AUX OUTPUT PCB | 42712 |
| AMS8E-2PCB | PCB - Balanced Termination PCB | WBS-CUSTOM / PCB | yes | RoHS BALANCED TERM. PCB | 42469 |
| AMX9A-1PCB | PCB - AMX9A Main PCB | WBS-CUSTOM / PCB |  | AMX9A MAIN PCB | 42754 |
| AMX9A-2PCB | PCB - AMX9A Level Control PCB | WBS-CUSTOM / PCB |  | AMX9A LEVEL CONTROL PCB | 42477 |
| AMX9A-3PCB | PCB - AMX9A Amplifier PCB | WBS-CUSTOM / PCB |  | AMX9A AMPLIFIER PCB | 42755 |
| AV6201A-PCB | PCB -Video DA PCB | WBS-CUSTOM / PCB |  | VIDEO DA PCB | 43266 |
| BVU-Driver RAW PCB | PCB - BVU-Driver Raw PCB | WBS-CUSTOM / PCB |  | BVU-Driver RAW PCB | 217463 |
| CS8412-CS-PCB | PCB - CS8412CS-to-CS8412CP Adapter PCB | WBS-CUSTOM / PCB |  | CS8412CS TO CS8412CP ADAPTER PCB | 37850 |
| D6201A-PCB | PCB - D6201A Dual 75 Ohm AES DA PCB | WBS-CUSTOM / PCB |  | D6201A DUAL 75 OHM AES DA PCB | 43267 |
| D6202A-PCB | PCB - D6202A Dual 110 Ohm AES DA PCB | WBS-CUSTOM / PCB |  | D6202A DUAL 110 OHM AES DA PCB | 37861 |
| D6203A-PCB | PCB - D6203A  PCB | WBS-CUSTOM / PCB |  | D6203A  PCB | 37862 |
| D6204A-PCB | PCB - D6204A  PCB | WBS-CUSTOM / PCB |  | D6204A  PCB | 37863 |
| D6207A-PCB | PCB - D6207A  PCB | WBS-CUSTOM / PCB |  | D6207A  PCB | 37864 |
| D8202-BYPS-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB | 37867 |
| D8202-PCB | PCB - AES/EBU Digital-to-Analog Converter PCB | WBS-CUSTOM / PCB |  | AES/EBU D to A CONVERTER PCB | 37868 |
| DEMUX-3.PCB | PCB - DEMUX-3 Main Board PCB | WBS-CUSTOM / PCB |  | DEMUX-3 MAIN BOARD PCB | 42764 |
| DEMUX-4.PCB | PCB - DEMUX-4 Main Board PCB | WBS-CUSTOM / PCB |  | DEMUX-4 MAIN BOARD PCB | 37875 |
| E250-PCB | PCB - E250 Extender Module PCB | WBS-CUSTOM / PCB |  | E250 EXTENDER MODULE PCB | 41880 |
| M6202-PCB | PCB - M6202A HDTV Demuxer PCB | WBS-CUSTOM / PCB |  | M6202A HDTV DEMUXER PCB | 41662 |
| M6203-PCB | PCB - M6203A MD-SDI DA PCB | WBS-CUSTOM / PCB |  | M6203A MD-SDI DA PCB | 41663 |
| M6204-PCB | PCB - M6204A PCB | WBS-CUSTOM / PCB |  | M6204A PCB | 43530 |
| M6205A-PCB | PCB - M6205A PCB | WBS-CUSTOM / PCB |  | M6205A PCB | 43531 |
| M6206A-PCB | PCB - M6206A PCB | WBS-CUSTOM / PCB |  | M6206A PCB | 41664 |
| M8204T-PCB | PCB - M8204A Termination Assembly PCB | WBS-CUSTOM / PCB |  | M8204A Termination Assembly PCB | 41665 |
| M8209-PCB | PCB - Dual Communications Buffer DA PCB | WBS-CUSTOM / PCB |  | DUAL COMMUNICATIONS BUFFER DA PCB | 41666 |
| M8251-PCB | PCB - Analog Video DA PCB | WBS-CUSTOM / PCB |  | Analog Video DA PCB *dont order Notes* | 43541 |
| MLC8-1PCB | PCB - MLC8 Main PCB | WBS-CUSTOM / PCB |  | MLC8 MAIN PCB | 42924 |
| MP4-PCB1 | PCB - Power Supply & PAD Board PCB MP4-PCB1 | WBS-CUSTOM / PCB |  | POWER SUPPLY & PAD BOARD PCB MP4-PCB1 | 41446 |
| POD33-PCB2 | PCB - Display Board PCB | WBS-CUSTOM / PCB |  | DISPLAY BOARD PCB | 40982 |
| POD33-PCB3 | PCB - Rear Board PCB | WBS-CUSTOM / PCB |  | REAR BOARD PCB | 40983 |
| QSP2-1PCB | PCB - QSP2 Main Assembly PCB | WBS-CUSTOM / PCB |  | QSP2 MAIN ASSEMBLY PCB | 42936 |
| QSP2-3PCB | PCB - QSP2 Level Control PCB | WBS-CUSTOM / PCB |  | QSP2 LEVEL CONTROL PCB | 41037 |
| QubeAmp-PCB | PCB - Cube Speaker Amplifier PCB | WBS-CUSTOM / PCB |  | Cube Speaker Amplifier PCB | 216886 |
| R201-PCB1 | PCB - R201 Motherboard PCB | WBS-CUSTOM / PCB |  | R201 MOTHERBOARD PCB (DO NOT ORDER) | 41049 |
| R202-PCB1 | PCB - R202/R245 Motherboard PCB | WBS-CUSTOM / PCB |  | R202/R245 MOTHERBOARD PCB | 41053 |
| R203-PCB1 | PCB - R203/R205/R246/R249 Main Assembly PCB | WBS-CUSTOM / PCB |  | R203/R205/R246/R249 MAIN ASSEMBLY PCB | 41055 |
| R204-PCB1 | PCB - R204/R247 Motherboard PCB | WBS-CUSTOM / PCB |  | R204/R247 MOTHERBOARD PCB | 41060 |
| R206-PCB1 | PCB - R206 Motherboard PCB | WBS-CUSTOM / PCB |  | R206 MOTHERBOARD PCB | 41063 |
| R208-PCB | PCB - R208 Motherboard PCB | WBS-CUSTOM / PCB |  | R208 MOTHERBOARD PCB | 41067 |
| R209-PCB1 | PCB - R209 Motherboard PCB | WBS-CUSTOM / PCB |  | R209 MOTHERBOARD PCB | 41069 |
| R209A-PCB1 | PCB - R209A Motherboard PCB | WBS-CUSTOM / PCB |  | R209A MOTHERBOARD PCB | 41070 |
| R210-PCB1 | PCB - R210 Motherboard PCB (SEE NOTES) | WBS-CUSTOM / PCB |  | R210 MOTHERBOARD PCB (SEE NOTES) | 41073 |
| R241-PCB1 | PCB - R241 Motherboard PCB | WBS-CUSTOM / PCB |  | R241 MOTHERBOARD PCB | 41078 |
| R251-PCB | PCB - R251 Motherboard PCB | WBS-CUSTOM / PCB |  | R251 MOTHERBOARD PCB | 40831 |
| R252-PCB | PCB - R252 Motherboard PCB | WBS-CUSTOM / PCB |  | R252 MOTHERBOARD PCB | 40832 |
| R253-PCB1 | PCB - R253 Bargraph Driver Assembly PCB | WBS-CUSTOM / PCB |  | R253 BARGRAPH DRIVER ASSEMBLY PCB | 40833 |
| R254-PCB1 | PCB - R254 Timer PCB | WBS-CUSTOM / PCB |  | R254 TIMER PCB | 40835 |
| R255-PCB1 | PCB - R255 Meter Amplifier PCB | WBS-CUSTOM / PCB |  | R255 METER AMPLIFIER PCB | 40836 |
| R257-PCB1 | PCB - Main Assembly PCB | WBS-CUSTOM / PCB |  | MAIN ASSEMBLY PCB | 40838 |
| R257-PCB2 | PCB - Monitor Selector Assembly PCB | WBS-CUSTOM / PCB |  | MONITOR SELECTOR ASSEMBLY PCB | 40839 |
| R2572-PCB1 | PCB - R257-2 Main Assembly PCB | WBS-CUSTOM / PCB |  | R257-2 MAIN ASSEMBLY PCB | 40841 |
| RLM24-6PCB | PCB - Dip Switch Board | WBS-CUSTOM / PCB |  | DIP SWITCH BOARD | 40866 |
| SD400A-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB | 40582 |
| SD402-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB | 40583 |
| SD403-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB | 40584 |
| SD404-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB (SEE NOTE REORDERING) | 40585 |
| SD405-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB *DO NOT ORDER SEE NOTES* | 40586 |
| SD406-PCB | PCB - Main Board PCB | WBS-CUSTOM / PCB |  | MAIN BOARD PCB | 40587 |
| SDM2-3-PCB | PCB - SDM2-3 Main Board PCB | WBS-CUSTOM / PCB |  | SDM2-3 Main Board PCB | 42938 |
| TB8201A-PCB | PCB - Termination PCB | WBS-CUSTOM / PCB |  | TERMINATION PCB | 40675 |
| TB8201AP-PCB | PCB - Termination PCB | WBS-CUSTOM / PCB |  | TERMINATION PCB | 40676 |
| TB8202-PCB | PCB - M8202 Screw Termination PCB | WBS-CUSTOM / PCB |  | M8202 SCREW TERMINATION PCB | 40677 |
| TB8204-PCB | PCB - M8204 Screw Termination PCB | WBS-CUSTOM / PCB |  | M8204 Screw Termination PCB | 40678 |
| TB8204P-PCB | PCB - M8204 Pluggable Termination PCB | WBS-CUSTOM / PCB |  | M8204 Pluggable Termination PCB | 40679 |
| XTM4-1PCB | PCB - XTM4 Main PCB | WBS-CUSTOM / PCB |  | XTM4 MAIN PCB  ***See NOTES*** | 42944 |
| XTM4-3PCB | PCB - XTM4 Display Driver PCB | WBS-CUSTOM / PCB |  | XTM4 DISPLAY DRIVER PCB | 40458 |
| XTM4-4PCB | PCB - XTM4 Light Bar Assembly PCB | WBS-CUSTOM / PCB |  | XTM4 LIGHT BAR ASSEMBLY PCB | 40459 |
| 32ME-5PCB | PCB - 32ME Front Control PCB | WBS-CUSTOM / PCB / 32ME |  | 32ME Front Control PCB | 42625 |
| 32ME-PCB2 | PCB - 32ME Rear D-Sub Connector PCB | WBS-CUSTOM / PCB / 32ME |  | 32ME Rear D-Sub Connector PCB | 43991 |
| AMS16A-PCB1 | PCB - AMS16A Display PCB | WBS-CUSTOM / PCB / AMS |  | AMS16A DISPLAY PCB | 42396 |
| AMS16A-PCB2 | PCB - AMS16A Control Board PCB | WBS-CUSTOM / PCB / AMS |  | AMS16A CONTROL BOARD PCB | 42397 |
| AMS16A-PCB3 | PCB - AMS16A Main PCB | WBS-CUSTOM / PCB / AMS |  | AMS16A MAIN PCB | 42398 |
| AMS16A-PCB4 | PCB - AMS16A Rear PCB | WBS-CUSTOM / PCB / AMS |  | AMS16A REAR PCB | 42399 |
| AMS16A-PCB5 | PCB - AMS16A Single Rack Display PCB | WBS-CUSTOM / PCB / AMS |  | AMS16A SINGLE RACK DISPLAY PCB | 42400 |
| AMS16A-PCB6 | PCB - AMS16A Single Rack Control PCB | WBS-CUSTOM / PCB / AMS |  | AMS16A SINGLE RACK CONTROL PCB | 42401 |
| AMS16A-PCB8 | PCB - AMS16A Power Distribution Board | WBS-CUSTOM / PCB / AMS |  | AMS16A POWER DISTRIBUTION BOARD | 42403 |
| AMS16A-PCB9 | PCB - AMS16A Dolby Decoder Board | WBS-CUSTOM / PCB / AMS |  | AMS16A DOLBY DECODER BOARD | 42404 |
| AMS4-1PCB | PCB - AMS4 Main Assembly PCB | WBS-CUSTOM / PCB / AMS |  | AMS4 MAIN ASSEMBLY PCB | 42711 |
| AMS4-3PCB | PCB - AMS4 Level Control PCB | WBS-CUSTOM / PCB / AMS |  | AMS4 LEVEL CONTROL PCB | 42427 |
| AMS4E-1PCB | PCB - AMS4E Front Assembly PCB | WBS-CUSTOM / PCB / AMS |  | AMS4E FRONT ASSEMBLY PCB | 42436 |
| AMS4E-2PCB | PCB - AMS4E Dolby E  Assembly PCB | WBS-CUSTOM / PCB / AMS |  | AMS4E DOLBY E  ASSEMBLY PCB | 42437 |
| AMS8E-12PCB | PCB - AMS8E Audio Meter PCB | WBS-CUSTOM / PCB / AMS |  | AMS8E AUDIO METER PCB | 42467 |
| AMS8E-1PCB | PCB - AMS8E Main Board PCB | WBS-CUSTOM / PCB / AMS |  | AMS8E MAIN BOARD PCB | 42468 |
| AMS8E-3APCB | PCB - AMS8E Termination PCB | WBS-CUSTOM / PCB / AMS | yes | RoHS AMS8E TERMINATION PCB | 42470 |
| AMS8E-3BPCB | PCB - AMS8E Termination PCB | WBS-CUSTOM / PCB / AMS | yes | RoHS AMS8E TERMINATION PCB | 42471 |
| AMS8E-4PCB | PCB - AMS8E PCB | WBS-CUSTOM / PCB / AMS |  | AMS8E PCB | 42472 |
| AMS8E-5PCB | PCB - AMS8E PCB | WBS-CUSTOM / PCB / AMS |  | AMS8E PCB | 42473 |
| AMS8E-6PCB | PCB - AMS8E Display PCB | WBS-CUSTOM / PCB / AMS | yes | RoHS AMS8E DISPLAY PCB | 42474 |
| AMS8E-7PCB | PCB - AMS8E Power Supply PCB | WBS-CUSTOM / PCB / AMS |  | AMS8E POWER SUPPLY PCB | 42475 |
| AMS8E-8PCB | PCB - AMS8E Power Amplifier PCB | WBS-CUSTOM / PCB / AMS |  | AMS8E POWER AMPLIFIER PCB | 42753 |
| AMS8E-10PCB | PCB - AMS8E LED PCB | WBS-CUSTOM / PCB / AMS / LED |  | AMS8E LED PCB | 42466 |
| AMS4-4PCB | PCB - AMS4 Terminal Block PCB | WBS-CUSTOM / PCB / AMS / Terminal |  | AMS4 TERMINAL BLOCK PCB | 42428 |
| IMP12BNC-PCB | PCB - IMP-12 PCB BNCS | WBS-CUSTOM / PCB / IMP | yes | RoHS IMP-12 PCB BNCS | 41971 |
| IMP12C-PCB | PCB - IMP-12C PCB | WBS-CUSTOM / PCB / IMP |  | IMP-12C PRINTED CIRCUIT BOARD | 41972 |
| IMP12XLR-PCB | PCB - IMP-12 PCB XLRS | WBS-CUSTOM / PCB / IMP | yes | RoHS IMP-12 PCB XLRS | 41973 |
| IMP1M-PCB | PCB - IMP-1M PCB | WBS-CUSTOM / PCB / IMP |  | IMP-1M PRINTED CIRCUIT BOARD | 41974 |
| IMP20-PCB | PCB - IMP-20A PCB | WBS-CUSTOM / PCB / IMP |  | IMP-20A Printed Circuit Board | 41975 |
| IMP202013-PCB | PCB - IMP Male & Female 2013 PCB | WBS-CUSTOM / PCB / IMP |  | PCB IMP MALE & FEMALE 2013 | 41976 |
| ABB1-PCB2 | PCB - Audio Bit Buddy LED PCB | WBS-CUSTOM / PCB / LED |  | AUDIO BIT BUDDY LED PCB | 42707 |
| MLC8-2PCB | PCB - MLC8 LED PCB | WBS-CUSTOM / PCB / LED |  | MLC8 LED PCB | 42925 |
| R253-PCB2 | PCB - R253 Bargraph LED Assembly PCB | WBS-CUSTOM / PCB / LED |  | R253 BARGRAPH LED ASSEMBLY PCB | 40834 |
| 14-268 | PCB - Simpson LED VU Meter Illumination PCB | WBS-CUSTOM / PCB / LED / IMP |  | SIMPSON LED VU ILLUMINATION | 42620 |
| SLM1-3-PCB | PCB - SLM1-3 LED Subassembly PCB | WBS-CUSTOM / PCB / LED / SUBassembly / SLM |  | SLM1-3 LED SUBASSEMBLY PCB | 40617 |
| SLM1-4-PCB | PCB - SLM1-4 LED Subassembly PCB | WBS-CUSTOM / PCB / LED / SUBassembly / SLM |  | SLM1-4 LED SUBASSEMBLY PCB | 40618 |
| BNC1-PCB | PCB - MF8210 BNC-3 PCB Top | WBS-CUSTOM / PCB / MF |  | MF8210 BNC-3 PCB TOP | 37509 |
| BNC2-PCB | PCB - MF8210 BNC-3 PCB Bottom | WBS-CUSTOM / PCB / MF |  | MF8210 BNC-3 PCB BOTTOM | 37510 |
| BNC3-PCB | PCB - MF8210 BNC-4 PCB Top | WBS-CUSTOM / PCB / MF |  | MF8210 BNC-4 PCB TOP | 37511 |
| BNC4-PCB | PCB - MF8210 BNC-4 PCB Bottom | WBS-CUSTOM / PCB / MF |  | MF8210 BNC-4 PCB BOTTOM | 37512 |
| BNC5-PCB | PCB - MF8212 BNC-1 PCB Top | WBS-CUSTOM / PCB / MF |  | MF8212 BNC-1 PCB TOP | 37513 |
| BNC6-PCB | PCB - MF8212 BNC-1 PCB Bottom | WBS-CUSTOM / PCB / MF |  | MF8212 BNC-1 PCB BOTTOM | 37514 |
| BNC7-PCB | PCB - MF8212 BNC-2 PCB Top | WBS-CUSTOM / PCB / MF |  | MF8212 BNC-2 PCB TOP | 37515 |
| BNC8-PCB | PCB - MF8212 BNC-2 PCB Bottom | WBS-CUSTOM / PCB / MF |  | MF8212 BNC-2 PCB BOTTOM | 37516 |
| MF8212-PCB | PCB - MF8212 Backplane PCB | WBS-CUSTOM / PCB / MF |  | MF8212 BACKPLANE PCB | 41408 |
| MF82REF-PCB | PCB - MF82REF Reference Input PCB | WBS-CUSTOM / PCB / MF |  | MF82REF REFERENCE INPUT PCB | 41411 |
| 14-315 | PCB - POD6 PCB | WBS-CUSTOM / PCB / POD | yes | RoHS POD6 PCB | 43734 |
| POD-PSU-PCB | PCB - POD PSU Board | WBS-CUSTOM / PCB / POD |  | POD PSU BOARD | 41209 |
| POD1-PCB1 | PCB - POD1 Main PCB | WBS-CUSTOM / PCB / POD |  | POD1 MAIN PCB | 43979 |
| POD1-PCB2 | PCB - POD1 Bal2Unbal PCB-2 | WBS-CUSTOM / PCB / POD |  | POD1 BAL2UNBAL PCB-2 | 43980 |
| POD1-PCB3 | PCB - POD1 Unbal2Bal PCB-3 | WBS-CUSTOM / PCB / POD |  | POD1 UNBAL2BAL PCB-3 | 43981 |
| POD10-PCB | PCB - POD10 Main Assembly PCB | WBS-CUSTOM / PCB / POD |  | POD10 MAIN ASSEMBLY PCB | 42930 |
| POD10A-PCB | PCB - POD10A Main PCB | WBS-CUSTOM / PCB / POD |  | POD10A MAIN PCB | 43935 |
| POD12-PCB | PCB - POD12 Digital DA PCB | WBS-CUSTOM / PCB / POD |  | *DO NOT ORDER* POD12 DIGITAL DA PCB | 43745 |
| POD12A-PCB1 | PCB - POD12A Main PCB | WBS-CUSTOM / PCB / POD |  | POD12A MAIN PCB | 43918 |
| POD13A-PCB1 | PCB - POD13A Main PCB | WBS-CUSTOM / PCB / POD |  | POD13A MAIN PCB | 42931 |
| POD13A-PCB2 | PCB - POD13A Rear PCB | WBS-CUSTOM / PCB / POD |  | POD13A REAR PCB | 42932 |
| POD14A-PCB1 | PCB - POD14A Main PCB | WBS-CUSTOM / PCB / POD |  | POD14A MAIN PCB | 41221 |
| POD15-PCB | PCB - POD15A 1X6 Analog Video DA W/EQ | WBS-CUSTOM / PCB / POD |  | POD15A 1X6 ANALOG VIDEO DA W/EQ | 41223 |
| POD16-PCB1 | PCB - POD16 Main Assembly PCB | WBS-CUSTOM / PCB / POD |  | POD16 MAIN ASSEMBLY PCB | 41227 |
| POD17-PCB | PCB - POD17 Digital Audio DA PCB | WBS-CUSTOM / PCB / POD |  | POD17 DIGITAL AUDIO DA PCB *dont order N | 41232 |
| POD2-PCB | PCB - POD2 Main Assembly PCB | WBS-CUSTOM / PCB / POD | yes | RoHS POD2 MAIN ASSEMBLY PCB *NOTES | 42933 |
| POD22-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41245 |
| POD24-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41253 |
| POD25-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41257 |
| POD26-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41261 |
| POD28-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41265 |
| POD30-PCB | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41270 |
| POD31-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PCB | 41275 |
| POD31-PCB2 | PCB - POD31 Rear Board PCB | WBS-CUSTOM / PCB / POD |  | POD31 REAR BOARD PCB (SEE NOTES) | 41276 |
| POD33-PCB1 | PCB - Main Board PCB POD | WBS-CUSTOM / PCB / POD |  | MAIN BOARD PC | 40981 |
| POD4-PCB | PCB - POD4 Main Assembly PCB | WBS-CUSTOM / PCB / POD |  | POD4 MAIN ASSEMBLY PCB | 40988 |
| POD5-PCB | PCB - POD5 PCB | WBS-CUSTOM / PCB / POD |  | POD5 PCB | 40993 |
| POD7-PCB | PCB - POD7 PCB | WBS-CUSTOM / PCB / POD |  | POD7 PCB | 40999 |
| POD9-PCB | PCB - POD9 PCB | WBS-CUSTOM / PCB / POD |  | POD9 PCB (SEE NOTES) | 42935 |
| POD8A-4 PCB | PCB - POD8A QTP PCB | WBS-CUSTOM / PCB / POD / QTP / d8 | yes | RoHS POD8A QTP PCB | 217547 |
| POD10-PCB2 | PCB - POD10 Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |  | POD10 TERMINAL BLOCK PCB | 41211 |
| POD10A-PCB2 | PCB - POD10A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |  | POD10A TERMINAL BLOCK PCB | 43972 |
| POD12A-PCB2 | PCB - POD12A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |  | POD12A TERMINAL BLOCK PCB | 43919 |
| POD14A-PCB2 | PCB - POD14A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |  | POD14A TERMINAL BLOCK PCB | 41222 |
| POD16-PCB3 | PCB - POD16 Terminal Block Assembly PCB | WBS-CUSTOM / PCB / POD / Terminal |  | POD16 TERMINAL BLOCK ASSY PCB | 41229 |
| POD4-PCB2 | PCB - POD4 Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal |  | POD4 TERMINAL BLOCK PCB | 40989 |
| POD8-PCB2 | PCB - POD8 Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal / d8 | yes | RoHS POD8 TERMINAL BLOCK PCB *NOTES | 41003 |
| POD8A-2 PCB | PCB - POD8A Terminal Block PCB | WBS-CUSTOM / PCB / POD / Terminal / d8 | yes | RoHS POD8A TERMINAL BLOCK PCB | 217473 |
| POD8-PCB | PCB - POD8 Main Assembly PCB | WBS-CUSTOM / PCB / POD / d8 | yes | RoHS POD8 MAIN ASSEMBLY PCB | 41002 |
| POD8A-1 PCB | PCB - POD8 Main Assembly PCB | WBS-CUSTOM / PCB / POD / d8 | yes | RoHS POD8 MAIN ASSEMBLY PCB | 217474 |
| POD8A-3 PCB | PCB - POD8A XLR PCB | WBS-CUSTOM / PCB / POD / d8 | yes | RoHS POD8A XLR PCB | 217541 |
| 550208-1-2PCB | PCB - 550208 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton |  | 550208 PUSHBUTTON PCB | 36486 |
| MLC8-3PCB | PCB - MLC8 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton |  | MLC8 PUSHBUTTON PCB | 42926 |
| POD30-PCB1 | PCB - Pushbutton Board PCB | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON BOARD PCB | 41271 |
| R201-PCB2 | PCB - Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON ASSEMBLY PCB (NO ORDER) | 41050 |
| R203-PCB2 | PCB - R203/R205/R246/R249 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | R203/R205/R246/R249 PUSHBUTTON ASSY PCB | 41056 |
| R204-PCB2 | PCB - R204/R247 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | R204/R247 PUSHBUTTON ASSY PCB | 41061 |
| R206-PCB2 | PCB - R206 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | R206 PUSHBUTTON ASSEMBLY PCB | 41064 |
| R209A-PCB2 | PCB - R209A Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton |  | R209A PUSHBUTTON PCB | 41071 |
| R210-PCB2 | PCB - R210 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | R210 PUSHBUTTON ASSEMBLY PCB | 41074 |
| R221-PCB2 | PCB - Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON ASSY PCB (DO NOT ORDER) | 41076 |
| R241-PCB2 | PCB - Pushbutton Assembly PCB for R241 | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON ASSY PCB FOR R241 | 41079 |
| R241-PCB3 | PCB - Pushbutton Assembly PCB for R201 | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON ASSY PCB FOR R201 | 40780 |
| R241-PCB4 | PCB - Pushbutton Assembly PCB for R221 | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON ASSY PCB FOR R221 | 40781 |
| R257-PCB3 | PCB - Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | PUSHBUTTON ASSEMBLY PCB | 40840 |
| R2572-PCB2 | PCB - R257-2 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton |  | R257-2 PUSHBUTTON ASSEMBLY PCB | 40842 |
| XTM4-2PCB | PCB - XTM4 Pushbutton/Display PCB | WBS-CUSTOM / PCB / Pushbutton |  | XTM4 PUSHBUTTON/DISPLAY PCB | 40457 |
| XTM4-5PCB | PCB - DMS1 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton |  | DMS1 PUSHBUTTON PCB | 42945 |
| AMS16A-PCB7 | PCB - AMS16A Pushbutton Board | WBS-CUSTOM / PCB / Pushbutton / AMS |  | AMS16A PUSHBUTTON BOARD | 42402 |
| AMS4-2PCB | PCB - AMS4 Pushbutton/Meter PCB | WBS-CUSTOM / PCB / Pushbutton / AMS |  | AMS4 PUSHBUTTON/METER PCB | 42426 |
| AMS4-6PCB | PCB - AMS4 Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton / AMS |  | AMS4 PUSHBUTTON PCB | 42429 |
| AMS8E-9PCB | PCB - AMS82 Front Pushbutton PCB | WBS-CUSTOM / PCB / Pushbutton / AMS |  | AMS82 FRONT PUSH BUTTON PCB | 42476 |
| POD16-PCB2 | PCB - POD16 Pushbutton Assembly PCB | WBS-CUSTOM / PCB / Pushbutton / POD |  | POD16 PUSHBUTTON ASSEMBLY PCB | 41228 |
| POD2-PCB2 | PCB - POD2 Pushbutton Panel PCB | WBS-CUSTOM / PCB / Pushbutton / POD |  | POD2 PUSHBUTTON PANEL PCB | 41239 |
| QTP-DB25M-PCB | PCB - QTP-DBM25M PCB | WBS-CUSTOM / PCB / QTP |  | QTP-DBM25M Printed Circuit Board | 217345 |
| QTP-DB25S-PCB | PCB - QTP-DBM25S PCB | WBS-CUSTOM / PCB / QTP |  | QTP-DBM25S Printed Circuit Board | 217349 |
| QTP-DB25Y PCB | PCB - QTP-DBYMH25 PCB | WBS-CUSTOM / PCB / QTP |  | QTP-DBYMH25 Printed Circuit Board | 217348 |
| SLM1-1-PCB | PCB - SLM1-1 PCB | WBS-CUSTOM / PCB / SLM |  | SLM1-1 PCB | 40615 |
| SLM1-2-PCB | PCB - SLM1-2 PCB | WBS-CUSTOM / PCB / SLM |  | SLM1-2 PCB | 40616 |
| SLM4-1-PCB | PCB - SLM4 PCB | WBS-CUSTOM / PCB / SLM |  | SLM4 PCB | 40621 |
| SLM4-2-PCB | PCB - SLM4-2 DSP PCB | WBS-CUSTOM / PCB / SLM |  | SLM4-2 DSP PCB | 40622 |
| SLM4-3-PCB | PCB - SLM4-3 DSP PCB | WBS-CUSTOM / PCB / SLM |  | SLM4-3 DSP PCB | 40623 |
| SLM4-4-PCB | PCB - SLM4-4 DSP PCB | WBS-CUSTOM / PCB / SLM |  | SLM4-4 DSP PCB | 40624 |
| SLM4-5-PCB | PCB - SLM4-5 DSP PCB | WBS-CUSTOM / PCB / SLM |  | SLM4-5 DSP PCB | 40625 |
| SLM1-5-PCB | PCB - SLM1-5 DSP Subassembly PCB | WBS-CUSTOM / PCB / SUBassembly / SLM |  | SLM1-5 DSP SUBASSEMBLY PCB | 40619 |
| SLM1-6-PCB | PCB - SLM1-6 DSP Subassembly PCB | WBS-CUSTOM / PCB / SUBassembly / SLM |  | SLM1-6 DSP SUBASSEMBLY PCB | 40620 |
| C100PF-102 | Capacitor Polyester 1000PF 100V | WBS-CUSTOM / PCB / TH / - | yes | RoHS CAP POLYEST 1000PF 100V | 37532 |
| C100PF-392 | Capacitor Polyester 3900PF 100V | WBS-CUSTOM / PCB / TH / - | yes | RoHS CAP POLYEST 3900PF 100V | 37536 |
| C100PF-472 | Capacitor Polyester 4700PF 100V | WBS-CUSTOM / PCB / TH / - | yes | RoHS CAP POLYEST 4700PF 100V | 43962 |
| C100PF-822 | Capacitor Polyester 8200PF 100V | WBS-CUSTOM / PCB / TH / - | yes | RoHS CAP POLYEST 8200PF 100V | 37539 |
| C50PF-153 | Capacitor Polyester 0.015UF 100V | WBS-CUSTOM / PCB / TH / - | yes | RoHS CAP POLYEST 0.015UF 100V | 37794 |
| C50PE-103 | Capacitor Polyester 0.01UF 100V 5% | WBS-CUSTOM / PCB / TH / 0.05 / -0.05 | yes | RoHS CAP POLYEST 0.01UF 100V 5% | 37590 |
| C50PF-473 | Capacitor Polyester 0.047UF 100V 5% | WBS-CUSTOM / PCB / TH / 0.05 / -0.05 | yes | RoHS CAP POLYEST 0.047UF 100V 5% | 37795 |
| POD22-PCB2 | PCB - Terminal Block PCB | WBS-CUSTOM / PCB / Terminal |  | TERMINAL BLOCK PCB | 41246 |
| POD25-PCB2 | PCB - Terminal Block PCB | WBS-CUSTOM / PCB / Terminal |  | TERMINAL BLOCK PCB | 41258 |
| QSP2-4PCB | PCB - QSP2 Terminal Block PCB | WBS-CUSTOM / PCB / Terminal |  | QSP2 TERMINAL BLOCK PCB | 41038 |
| T6301-PCB | PCB - T6301 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6301 TERM MODULE PCB | 40665 |
| T6302-PCB | PCB - T6302 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6302 TERM MODULE PCB | 43727 |
| T6303-PCB | PCB - T6303 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6303 TERM MODULE PCB | 40666 |
| T6304-PCB | PCB - T6304 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6304 TERM MODULE PCB | 40667 |
| T6305-PCB | PCB - T6305 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6305 TERM MODULE PCB | 40668 |
| T6306-PCB | PCB - T6306 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6306 TERM MODULE PCB | 40669 |
| T6307-PCB | PCB - T6307 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6307 TERM MODULE PCB | 43728 |
| T6308-PCB | PCB - T6308 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6308 TERM MODULE PCB | 40670 |
| T6401-PCB | PCB - T6401 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6401 TERM MODULE PCB | 40671 |
| T6402-PCB | PCB - T6402 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6402 TERM MODULE PCB | 40672 |
| T6403-PCB | PCB - T6403 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6403 TERM MODULE PCB | 40673 |
| T6406-PCB | PCB - T6406 Terminal Module PCB | WBS-CUSTOM / PCB / Terminal |  | T6406 TERM MODULE PCB | 40674 |
| TB8205-PCB | PCB - M8205/B Screw Terminal PCB | WBS-CUSTOM / PCB / Terminal |  | M8205/B Screw Terminal PCB | 40409 |
| TB8205P-PCB | PCB - M8205/B Pluggable Screw Terminal | WBS-CUSTOM / PCB / Terminal |  | M8205/B Pluggable Screw Terminal | 40410 |
| 14-146 | PCB - MF82 DA Frame Audio Terminal Assembly | WBS-CUSTOM / PCB / Terminal / MF |  | MF82 DA FRAME AUDIO TERM ASSY | 34561 |
| D8200-PCB | PCB - D8205/D8206/D8207/D8208 PCB | WBS-CUSTOM / PCB / d8 |  | D8205/D8206/D8207/D8208 PCB | 37865 |
| D8201A-PCB | PCB - D8201A Digital Audio DA PCB | WBS-CUSTOM / PCB / d8 |  | D8201A DIGITAL AUDIO DA PCB | 37866 |
| D8203-PCB | PCB - D8203 PCB | WBS-CUSTOM / PCB / d8 |  | D8203 PCB *SEE NOTES* | 37869 |
| D8204A-PCB | PCB - D8204A PCB | WBS-CUSTOM / PCB / d8 |  | D8204A PCB | 37870 |
| D8204B-PCB | PCB - D8204B PCB | WBS-CUSTOM / PCB / d8 | yes | RoHS D8204B PCB (SEE NOTES New PCB Iss) | 37871 |
| D8204C-PCB | PCB - D8204C PCB | WBS-CUSTOM / PCB / d8 |  | D8204C PCB | 216828 |
| IMP12013-M1 | IMP Male/Female Tube | Ward-Beck Metal Shop / TH / - |  | IMP MALE/FEMALE TUBE | 43359 |
| 1.00MM-30-10-B | Wire Flat Flex Cable 30-POS 1mm 10" Long | Wire / Flat | yes | RoHS 30-POS 1mm FLAT FLEX CABLE x 10" | 34513 |
| 1.00MM-30-2-B | Wire Flat Flex Cable 30-POS 1mm 2" Long | Wire / Flat | yes | RoHS 30-POS 1mm FLAT FLEX CABLE x 2" | 43757 |
| 1.00MM-30-8-B | Wire Flat Flex Cable 30-POS 1mm 8" Long | Wire / Flat | yes | RoHS 30-POS 1mm FLAT FLEX CABLE x 8" | 34514 |
| 16/19IP-BLK | Wire Irradiated PVC 16GA 19-Strand Black (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 16GA | yes | RoHS WIRE IRR.PVC 16GA 19STR BLACK (Supply on 6-1/2" x 6-3/4" metal spool.) | 34589 |
| 16/19IP-ORG | Wire Irradiated PVC 16GA 19-Strand Orange (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 16GA | yes | RoHS WIRE IRR.PVC 16GA 19STR ORANGE (Supply on 6-1/2" x 6-3/4" metal spool.) | 34590 |
| 16/19IP-RED | Wire Irradiated PVC 16GA 19-Strand Red (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 16GA | yes | RoHS WIRE IRR.PVC 16GA 19STR RED (Supply on 6-1/2" x 6-3/4" metal spool.) | 34591 |
| 16/19IP-WH | Wire Irradiated PVC 16GA 19-Strand White (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 16GA | yes | RoHS WIRE IRR.PVC 16GA 19STR WHITE (Supply on 6-1/2" x 6-3/4" metal spool.) | 35001 |
| 18/16TR64 -GRN/YEL | Wire TR64 18GA 16-Strand Green/Yellow (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 18GA | yes | RoHS WIRE TR64 18GA 16STR GREEN/YELLOW (Supply on 6-1/2" x 6-3/4" metal spool.) | 35016 |
| 18/16TR64-BLK | Wire TR64 18GA 16-Strand Black (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 18GA | yes | RoHS WIRE TR64 18GA 16STR BLACK (Supply on 6-1/2" x 6-3/4" metal spool.) | 35014 |
| 18/16TR64-RED | Wire TR64 18GA 16-Strand Red (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 18GA | yes | RoHS WIRE TR64 18GA 16STR RED (Supply on 6-1/2" x 6-3/4" metal spool.) | 35018 |
| 18/16TR64-VIO | Wire TR64 18GA 16-Strand Violet (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 18GA | yes | RoHS WIRE TR64 18GA 16STR VIOLET (Supply on 6-1/2" x 6-3/4" metal spool.) | 35020 |
| 18/16TR64-WHT | Wire TR64 18GA 16-Strand White (Supply on 6-1/2" x 6-3/4" metal spool.) | Wire / Hookup / 18GA | yes | RoHS WIRE TR64 18GA 16STR WHITE (Supply on 6-1/2" x 6-3/4" metal spool.) | 35022 |
| 22/7IP-BLK | Wire Irradiated PVC 22GA 7-Strand Black (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR BLACK (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35161 |
| 22/7IP-BLU | Wire Irradiated PVC 22GA 7-Strand Blue (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR BLUE (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35163 |
| 22/7IP-BRN | Wire Irradiated PVC 22GA 7-Strand Brown (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR BROWN (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35165 |
| 22/7IP-GR | Wire Irradiated PVC 22GA 7-Strand Green (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR GREEN (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35167 |
| 22/7IP-GRY | Wire Irradiated PVC 22GA 7-Strand Grey (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22STR 7GA GREY (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35170 |
| 22/7IP-ORG | Wire Irradiated PVC 22GA 7-Strand Orange (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR ORANGE (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35172 |
| 22/7IP-RED | Wire Irradiated PVC 22GA 7-Strand Red (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR RED (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35174 |
| 22/7IP-VIO | Wire Irradiated PVC 22GA 7-Strand Violet (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR VIOLET (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35176 |
| 22/7IP-WH | Wire Irradiated PVC 22GA 7-Strand White (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR WHITE (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35178 |
| 22/7IP-YEL | Wire Irradiated PVC 22GA 7-Strand Yellow (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 22GA | yes | RoHS WIRE IRR.PVC 22GA 7STR YELLOW (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35180 |
| 26/7IP-BLK | Wire Irradiated PVC  26GA 7-Strand Black (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR BLACK (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35015 |
| 26/7IP-BLU | Wire Irradiated PVC  26GA 7-Strand Blue (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR BLUE (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35017 |
| 26/7IP-BRN | Wire Irradiated PVC  26GA 7-Strand Brown (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR BROWN (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35019 |
| 26/7IP-GR | Wire Irradiated PVC  26GA 7-Strand Green (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR GREEN (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35021 |
| 26/7IP-GRY | Wire Irradiated PVC  26GA 7-Strand Grey (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR GREY (Supply on 6-1/2" x 2-1/2" plastic spool.) | 43751 |
| 26/7IP-ORG | Wire Irradiated PVC  26GA 7-Strand Orange (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR ORANGE (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35023 |
| 26/7IP-RED | Wire Irradiated PVC  26GA 7-Strand Red (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR RED (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35025 |
| 26/7IP-VIO | Wire Irradiated PVC  26GA 7-Strand Violet (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR VIOLET (Supply on 6-1/2" x 2-1/2" plastic spool.) | 43752 |
| 26/7IP-WHT | Wire Irradiated PVC  26GA 7-Strand White (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR WHITE (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35027 |
| 26/7IP-YEL | Wire Irradiated PVC  26GA 7-Strand Yellow (Supply on 6-1/2" x 2-1/2" plastic spool.) | Wire / Hookup / 26GA | yes | RoHS WIRE IRR.PVC 26GA 7STR YELLOW (Supply on 6-1/2" x 2-1/2" plastic spool.) | 35029 |
| 240-051 | Wire 3.5mm Male-to-Male Slim-Plug Shielded Audio Cable 1 ft. | Wire / Pre-Made / Audio |  | 3.5mm Male to Male Slim-Plug Shielded Audio Cable 1 ft. | 44712 |
| CAT6-10-GREEN | Wire - CAT6 - 10 foot - Green | Wire / Pre-Made / CAT |  | CAT6 - 10 foot - Green | 217358 |
| CAT6-30-GREEN | Wire - CAT6 - 30 Foot - Green | Wire / Pre-Made / CAT |  | CAT6 - 30 Foot - Green | 217455 |
| CAT6-5-GREEN | Wire - CAT6 - 5 Foot - Green | Wire / Pre-Made / CAT |  | CAT6 - 5 Foot - Green | 217363 |
| 17002A | Wire AC Cord Detachable 3C Black | Wire / Pre-Made / cord | yes | RoHS AC CORD-DETACHABLE 3C BLK | 217295 |
| 17237 | Wire AC Cord 6-Feet Black with Male Leads | Wire / Pre-Made / cord | yes | RoHS AC CORD 6FT BLK-MALE LEADS (NOTE) | 43740 |
| 17251 | Wire AC Cord Detachable 3C Black | Wire / Pre-Made / cord | yes | RoHS AC CORD-DETACHABLE 3C BLK | 42946 |
| 8640-WHITE | Wire Audio 1 Pair Shielded 30GA | Wire / RAW / Audio | yes | RoHS AUDIO WIRE 1PR SHIELDED 30GA | 37149 |
| W2534-Black | Wire Standard Audio Quad Mic Cable - Black (price per foot) Mogami | Wire / RAW / Audio |  | Mogami Standard Quad Mic Cable - Black (price per foot) | 217318 |
| W2534-Green | Wire Standard Audio Quad Mic Cable - Green (price per foot) Mogami | Wire / RAW / Audio |  | Mogami Standard Quad Mic Cable - Green (price per foot) | 217322 |
| W2944-Black | Wire Internal/External Standard Audio Console Wiring Cable - Black  (price per foot) Mogami | Wire / RAW / Audio |  | Mogami Internal/External Standard Console Wiring Cable - Black  (price per foot) | 217319 |
| W2944-Green | Wire Internal/External Standard Audio Console Wiring Cable - Green (price per foot) Mogami | Wire / RAW / Audio |  | Mogami Internal/External Standard Console Wiring Cable - Green (price per foot) | 217317 |
| W3162-Black | Wire 8 Channel Audio AES/EBU Snake Cable (price per foot) Mogami | Wire / RAW / Audio |  | Mogami 8 Channel AES/EBU Snake Cable (price per foot) | 217321 |
| 3365-14 | Wire Ribbon Cable 14-Conductor | Wire / Ribbon | yes | RoHS RIBBON CABLE 14 CONDUCTOR | 36400 |
| 3365-16 | Wire Ribbon Cable 16-Conductor | Wire / Ribbon | yes | RoHS RIBBON CABLE 16 CONDUCTOR | 36401 |
| 3365-20 | Wire Ribbon Cable 20-Conductor | Wire / Ribbon | yes | RoHS RIBBON CABLE 20 CONDUCTOR | 36402 |
| 3365-34 | Wire Ribbon Cable 34-Conductor | Wire / Ribbon | yes | RoHS RIBBON CABLE 34 CONDUCTOR | 36403 |
| 33509 | Wire - Power Cable Cord 14/19TC 9-Conductor | Wire / cord | yes | RoHS POWER CABLE 14/19TC 9 COND | 36399 |
| PLCM-54-M | Wiring - Ty-Rap Small with Mounting Hole 4-3/8" | Wiring / Consumable |  | TY-RAP SMALL W/MTG HOLE 4-3/8" | 41189 |
| PLT1M-MP | Wiring - Ty-Rap Small 4" | Wiring / Consumable |  | TY-RAP SMALL 4" | 41193 |
| 1/8" Heatshrink - Blue | Wiring - Heatshrink Blue 2:1 Shrink Ratio 1/8" | Wiring / Consumable / Heatshrink |  | Blue - 2:1 Heatshrink - 1/8" | 217382 |
| 1/8" Heatshrink - Brown | Wiring - Heatshrink Brown 2:1 Shrink Ratio 1/8" | Wiring / Consumable / Heatshrink |  | Brown - 2:1 Heatshrink - 1/8" | 217383 |
| 1/8" Heatshrink - Green | Wiring - Heatshrink Green 2:1 Shrink Ratio 1/8" | Wiring / Consumable / Heatshrink |  | Green - 2:1 Heatshrink - 1/8" | 217381 |
| 1/8" Heatshrink - Orange | Wiring - Heatshrink Orange 2:1 Shrink Ratio 1/8" | Wiring / Consumable / Heatshrink |  | Orange - 2:1 Heatshrink - 1/8" | 217380 |
| FIT221-1/2 | Wiring  - Heatshrink Tubing Black .500" | Wiring / Consumable / Heatshrink |  | HEATSHRINK TUBING BLACK .500" | 41910 |
| FIT221-3/16 | Wiring  - Heatshrink Tubing Black .187" | Wiring / Consumable / Heatshrink |  | HEATSHRINK TUBING BLACK .187" | 41911 |
| PT2NG25-C | Wiring - Techflex 1/4" Expandable Sleeving Neon Green | Wiring / Consumable / Heatshrink |  | Techflex 1/4" Expandable Sleeving Neon Green | 217325 |
| FIT221-3/32 | Wiring  - Heatshrink Tubing Black .093" | Wiring / Consumable / Hellerman |  | HEATSHRINK TUBING BLACK .093" | 41912 |
| H15X1/4 | Wiring - Hellerman Sleeve | Wiring / Consumable / Hellerman |  | HELLERMAN SLEEVE | 41952 |
| H30X3/4 | Wiring - Hellerman Sleeve | Wiring / Consumable / Hellerman |  | HELLERMAN SLEEVE | 41954 |
| FIT221-3/64 | Wiring  - Heatshrink Tubing Black .046" | Wiring / Consumable / Ty-rap |  | HEATSHRINK TUBING BLACK .046" | 41913 |
| H20X3/4 | Wiring - Hellerman Sleeve | Wiring / Consumable / Ty-rap |  | HELLERMAN SLEEVE | 41953 |
| PLT1.5-MP | Wiring - Ty-Rap Large 8" | Wiring / Consumable / Ty-rap |  | TY-RAP  LARGE 8" | 41192 |
| PLT25-MP | Wiring - Ty-Rap Large 7.9" | Wiring / Consumable / Ty-rap |  | TY-RAP LARGE 7.9" | 41194 |
| 5P4 | Wiring - AC Clamp Strain Relief Black | Wiring / Hardware | yes | RoHS AC CLAMP STRAIN RELIEF BLK | 35731 |
| 501-1416-ND | Wiring - Cord Minigrabber Patch 8" Black | Wiring / Wiring |  | CORD MINIGRABBER PATCH 8" BLACK | 217338 |
| 501-1417-ND | Wiring - Cord Minigrabber Patch 8" Red | Wiring / Wiring |  | CORD MINIGRABBER PATCH 8" RED | 217337 |
| 232 | Battery Strap 9V Keystone | power / Battery & Accessories |  | RoHS KEYSTONE 9 VOLT BATTERY STRAP | 34996 |
| 57-342-0 | Battery Holder 4XAA Mode | power / Battery & Accessories |  | RoHS MODE BATTERY HOLDER 4XAA | 35719 |
| P-60AAE | Battery AA Rechargeable 1000 mA comes with Button | power / Battery & Accessories |  | BATTERY AA RECHARGEABLE 1000 mA c/w Button | 41469 |
