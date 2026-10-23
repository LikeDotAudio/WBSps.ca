# Episode 3.1: The MicroCOM Control Story (1988|21 – 1993|26)

**Runtime target:** 10 min · **Voice-over:** ~1091 words · **Slides:** 43

> How the MicroCOM II was told what to do: a DOS program on an IBM-type PC, four small files, a twelve-hundred-baud cable, thirty-five-byte blocks, and a frame full of microcontrollers that never needed the computer once the show was on.

## Timeline

| Year | What happened | Media |
|---|---|---|
| 1988|21 | MicroCOM II manual, issue #2, 17 March 1988: an IBM-PC type "Central Assignment Computer" programs the matrix. | [1988 - microCOM II - 002.jpg](https://drive.google.com/file/d/0B0yR0b5T78SKb1kxc005SlVzMHc/view?resourcekey=0-q4srfkXEYff1VlP4uwn8Gw) |
| 1991|24 | MicroCOM II Assignment Software: copyright 1991, developed for Ward-Beck by Weitech Computer Solutions. | [1993 - microCOM II - Assignment Software v3.20 - screen 12 - About box (emulated).png](#) |
| 1993|26 | Version 3.20, Release 3.2: copyright 1991, 92, 93. Microsoft C and the TCXL text-window library, 198,167 bytes. | [1993 - microCOM II - Assignment Software v3.20 - screen 02 - Title and status panel (emulated).png](#) |
| 2026|59 | MCOM.EXE decompiled (532 functions) and running again, unmodified, in an 8086 emulator with a simulated frame. | [1993 - microCOM II - Assignment Software v3.20 - screen 09 - Upload in progress (emulated).png](#) |

## Script and slides

### 3.1.1 Cold open: Release 3.2

**VO:** Grey screen, red letters, a blue status panel. MicroCOM, Communications System, Release 3.2. This is the program that told a Ward-Beck intercom matrix who could talk to whom. It is one hundred and ninety-eight thousand bytes long, it ran on a DOS computer, and it never carried a single word of audio. This is the story of how it worked.

- Slide 3: [MicroCOM II Assignment Software, Release 3.2 · 1993|26](#)
- Slide 4: **Cross-fade: drawing to module**, microCOM II: from the drawing to the module: [19xx - microCOM II - DOC - IMG_2048-2013-04-08.jpg](https://drive.google.com/file/d/0B0yR0b5T78SKMk5ka2xVcmp3RUU/view?resourcekey=0-vkS4KBivX6W_FxHkCMv0pw) → [1988 - microCOM II - WBSPS - AD - Microcom II 001.jpg](https://drive.google.com/file/d/0B0yR0b5T78SKbUFXOWRoTkctOGs/view?resourcekey=0-UYu2QN3iHx3Fe9ijNO5tsA)

### 3.1.2 The computer in the corner

**VO:** The manual of 1988 calls it the Central Assignment Computer: an IBM-PC type personal computer, on a desk beside the racks. From it, an operator could reprogram every communications terminal from one point. And the manual is clear about its place. The computer only has to be on line when you make changes. Once the plan is in the frame, the computer can be switched off, and the intercom carries on.

- Slide 6: [WBS MicroCOM II racks, with the assignment computer](https://drive.google.com/file/d/0B0yR0b5T78SKTnJqMGw1LU1OLVU/view?resourcekey=0-G4KlIvettVCHgUVwiMO_uA)
- Slide 7: [The 1988 menu: create or edit a file, then transfer it to the system](https://drive.google.com/file/d/0B0yR0b5T78SKb1kxc005SlVzMHc/view?resourcekey=0-q4srfkXEYff1VlP4uwn8Gw)

### 3.1.3 What was in the frame

**VO:** At the other end of the cable was the frame. Its audio switches are blocks of twenty-four inputs by twenty-four outputs, built from M724B modules: twenty-four solid-state switches on each output bus. M771 latches hold which switches are closed. Above them sit M8506 matrix controllers, sixteen-bit microcontrollers running at sixteen megahertz, joined by an internal sixteen-bit bus. M8502 and M8504 cards each look after twenty-four panels. One more card, the M8504-1, is the PC controller: the only part of the frame that ever hears from the computer. What has been set up is kept in electrically erasable memory, so after a power cut the system restarts in seconds, with no batteries and no computer.

- Slide 9: [From the PC to the crosspoint](#)
- Slide 10: [Basic MicroCOM II control system, manual pp. 3-6, 3-7 · 1988|21](https://drive.google.com/file/d/0B0yR0b5T78SKNzQzZDdHUDIxcTA/view?resourcekey=0-VHrAoPF07u9n2-DtKQLPaw)
- Slide 11: [Central matrix: communications audio interconnect · 1988|21](https://drive.google.com/file/d/0B0yR0b5T78SKVHhtMGlPWTRnOHc/view?resourcekey=0-mRXIOOqGrllBtWPZqPAd0g)
- Slide 12: [microCOM II · 015 · 1988|21](https://drive.google.com/file/d/0B0yR0b5T78SKMFdkQkhRZ0d6Wjg/view?resourcekey=0-vkjHbdXhAtydGC6saGEakg) _(pulled from the archive)_

### 3.1.4 The panels keep talking

**VO:** Every M7880 panel needs only three pairs of wires: audio in, audio out, and data. The data pair is a balanced RS-422 line that can run two kilometres. Over it, the frame and the panels exchange crosspoint data about twenty times a second, all day long. Each panel has ten keys with four-character displays, and a keypad with eighteen prefix codes, primary in red and secondary in blue. A new panel plugged in simply learns the current setup from the frame.

- Slide 14: [M7880 communications terminal, manual p. 2-2](https://drive.google.com/file/d/0B0yR0b5T78SKUXU4aTQwOEVmRzQ/view?resourcekey=0-NTdi2g4iRM06Z2j8TA2fNQ)
- Slide 15: [Introduction: three pairs per terminal, refreshed twenty times a second](https://drive.google.com/file/d/0B0yR0b5T78SKYkpxQ2hmRWZESG8/view?resourcekey=0-9VYD6qtxo1j2ybt9s3MTNg)
- Slide 16: [microCOM II · 010 · 1988|21](https://drive.google.com/file/d/0B0yR0b5T78SKNnFMelNGOGM3dlk/view?resourcekey=0-N8PgWxCNcGJCh7WtLtEs0w) _(pulled from the archive)_
- Slide 17: [microCOM II · 012 · 1988|21](https://drive.google.com/file/d/0B0yR0b5T78SKYy05bzN4VTdGZXc/view?resourcekey=0-AzIYd5Z1GxDhYSj0CayGDQ) _(pulled from the archive)_

### 3.1.5 The program

**VO:** The software was written for Ward-Beck by Weitech Computer Solutions, in Microsoft C, with a window library called TCXL. A menu bar across the top: Define System, Data Transfer, Terminal Assignments, Utilities, Quit. A blue status panel at the bottom: the setup, the size, which terminal file and which overlay are active, and whether the matrix is on line. Below it, one red line. That red line is the program's only dialog box. Every prompt and every error appears there.

- Slide 19: [Define System: eight editors](#)
- Slide 20: [First run: a directory, a setup name, a size and a matrix ID](#)

### 3.1.6 Naming the plant

**VO:** Everything starts in the Matrix Index Table. One line per bus: a four-letter name, the talk and listen attributes, a description, and the model of panel plugged in. The names do real work. A bus called IF01 becomes interrupted foldback number one. A bus called CAM1 becomes a camera. The description, Director, Technical Director, is for people only. It is never sent to the frame.

- Slide 22: [The Matrix Index Table, with a small demonstration plant](#)
- Slide 23: [F2: which panel is plugged into this bus](#)

### 3.1.7 Programming a panel

**VO:** Then the panels. The editor draws the real key layout of each model: keys one to six, A to D. Type a name under a key, and the key now reaches that bus. Underneath, the key does not store a name at all. It stores a bus number and an attribute: talk, listen, or both. Group, call and camera keys use the same two bytes with a special attribute. Rename a bus and every key that points at it follows.

- Slide 25: [The director's M7880: ten keys, programmed](#)

### 3.1.8 The plan on disk

**VO:** All of this lived in four small binary files. The matrix index, the overlay, the terminal keys, and the pegboard. For a forty-eight bus system they add up to under eight thousand bytes. F10 writes an editor's part of a file in place. Escape throws the edits away and reads the file again. The disk, not the screen, is the truth. That matters, because every upload reads its data from the files, so the frame always holds exactly what was saved.

- Slide 27: [The plan on disk: four small files](#)

### 3.1.9 The cable to the frame

**VO:** The link was the PC's first serial port, COM1, at twelve hundred baud, eight bits, no parity. The program did not drive the serial chip itself. It asked the computer's BIOS to send each byte. And the frame sets the pace. While it is idle, it keeps sending one character, ENQ: I am here, ready. When the PC has something, it answers ACK. The frame replies SYN: go ahead. The PC sends one block, and the frame answers ACK, accepted, or a carriage return, rejected. Four tries, then the upload is marked invalid.

- Slide 29: [One block, one handshake](#)
- Slide 30: [Data Transfer: press Enter to upload](#)

### 3.1.10 Inside one block

**VO:** Every block is thirty-five bytes. A start byte. A type: this one means index data. A block number, and the same number turned upside down, as a check. Then thirty bytes of data, and a checksum. In an index block the thirty bytes are six buses: four letters of name and one byte of attributes each. Here is the first block of a real upload: DIR, TD, AUD, FM, CAM1, CAM2. A whole forty-eight bus index and keypad is eleven blocks, about three seconds on the wire.

- Slide 32: [The first block of an Index and Keypad upload, byte by byte](#)

### 3.1.11 How often did they talk?

**VO:** So how often did the computer and the frame connect? Hardly ever. The program listens once when it starts, for two seconds, to show ON-LINE or OFF-LINE. After that it touches the port only when someone chooses an upload, presses F9 on a panel, or runs the Data Link Test. It never asks the frame a question, and this version never reads a setup back. The busy conversation was inside the frame: panels and controllers, twenty times a second. The manual calls the transfers subliminal. They slipped in without disturbing the intercom in use.

- Slide 34: [Three clocks: panels, frame, computer](#)
- Slide 35: [Data Link Test: twelve hundred baud, N, 8, 1](#)

### 3.1.12 Why it was built this way

**VO:** Every choice follows from one idea. The computer is the editor, not the controller. The frame runs the show, so it decides when it can take a block. The plan is kept on disk and in print, so uploads come from the saved files. The link is slow and simple, so any PC and any cable will do. And because nothing on air depends on the computer, a crashed PC in nineteen ninety-three meant nothing worse than a late change.

- Slide 37: [Data Transfer: one upload per part of the plan](#)
- Slide 38: [Central matrix control, manual pp. 3-4, 3-5 · 1988|21](https://drive.google.com/file/d/0B0yR0b5T78SKLXZYZ2J1Mmg5SWM/view?resourcekey=0-ZuZQJI24DoVfDjY5n8EFZg)

### 3.1.13 Running it again  [ARCHIVIST: which sites ran v3.20]

**VO:** The program survives in the archive. In twenty twenty-six it was taken apart, all five hundred and thirty-two functions, and every file format and every byte on the wire was written down. The original program runs again, unchanged, on an emulated PC, and it uploads to a simulated frame that answers ENQ, SYN and ACK just as the hardware did. Version three point two zero, developed for Ward-Beck Systems by Weitech.

- Slide 40: [MicroCOM II Assignment Software, Version 3.20](#)
- Slide 41: [The help file, MCOM.HLP](#)

### 3.1.14 End card

**VO:** This series is built from the Ward-Beck Systems archive. Drawings, manuals, ads and photos: WBSps.ca. If you have a Ward-Beck console, module or document, get in touch so it can go in the archive.



_Unmistakably Ward-Beck_ · Anthony Peter Kuzub · WBSps.ca · WBSps.Kuzub.com