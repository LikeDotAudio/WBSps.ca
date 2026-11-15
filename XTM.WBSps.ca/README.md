# Ward-Beck Systems XTM-4 & POD-22 — Standalone Broadcast Metering Rack

A standalone, broadcast-accurate implementation of the **Ward-Beck Systems XTM-4 Extended Range Test Meter** paired with the **POD-22 Stereo Loudness Meter** in a unified equipment rack.

Both units share the exact same live audio input stream captured from your computer's sound cards (inputs, line-ins, microphones, USB audio interfaces) or system audio outputs ("listen to whatever is playing").

```
=================================================================================================
 [XTM-4 Extended Range Test Meter - 2RU]
  - Dual Illuminated Moving-Coil Meters: Left & Right pairs (VU + PPM)
  - 8-Character Dot-Matrix Alphanumeric Display
  - 8-Segment Horizontal Phase Correlation Bar
  - Sub-Audible High-Pass Filter & Line Termination Switching
-------------------------------------------------------------------------------------------------
 [POD-22 Stereo Loudness Meter - 1RU]
  - Dual 41-Segment High-Resolution LED Bargraphs (Channel L and Channel R)
  - Peak-Over-Average Display (VU bar with floating PPM Peak Hold dot)
  - 7-Segment Vertical Phase Correlation Bar (-1.0 to +1.0)
  - Broadcast 0 VU Alignment Markers & Digital Tallies (LOCK, COM, 44.1K/48K/96K, ERROR)
=================================================================================================
```

---

## 1. Quick Start

Run the included local server launcher from the terminal:

```bash
cd /home/anthony/Documents/GitProjects/WBSps.ca/XTM.WBSps.ca
./run.sh
```

Or using Python directly:

```bash
python3 server.py
```

The server binds to `http://localhost:8080` and opens your default web browser automatically. Running over `http://localhost` ensures full access to audio devices and system audio capture without browser permission restrictions.

---

## 2. Audio Capture & Soundcard Features

### A. Listen to Sound Card (Input / Line-In / Microphone)
- Click **`🎤 Listen to Soundcard`** in the top bar or initial prompt banner.
- The browser prompts for permission to use your sound card / audio input.
- Once granted, the **Soundcard Input** dropdown dynamically lists all available audio hardware devices on your system (e.g. built-in analog stereo line-in, USB audio interfaces, audio loopback sinks).
- Selecting any device immediately switches the active audio feed without reloading.

### B. Listen to Computer Output (System Audio / "Listen to whatever...")
- Click **`🔊 Listen to Computer Output`**.
- The browser displays the sharing dialog. Select **Entire Screen**, **Window**, or **Tab**, and ensure **"Share audio" / "System audio"** is checked.
- Whatever audio is playing on your computer (media player, DAW, YouTube, browser, etc.) is captured and metered directly by the XTM needles.

### C. Input Gain / Trim & Safe Monitoring
- **Input Gain / Trim:** $-24\text{ dB}$ to $+24\text{ dB}$ slider with fine precision calibration.
- **Listen Through (Monitor):** Allows you to hear the input signal through your headphones or monitor speakers. Muted by default to prevent acoustic feedback when a microphone is selected.
- **Signal Generator:** Built-in test generator supporting $1\text{ kHz}$ reference sine tone, $400\text{ Hz}$ sine tone, pink noise, and $20\text{ Hz}\text{–}20\text{ kHz}$ logarithmic sweep.

---

## 3. Physical Hardware Emulation & Controls

The visualizer renders the authentic CorelDRAW silkscreen artwork and PIC16F874 firmware state:

```
+-----------------------------------------------------------------------------------------------+
| [Ch A VU]   [Ch A PPM]       [Phase LEDs]        [Dot-Matrix Display]     [Ch B VU]   [Ch B PPM] |
|                              [-1 ... +1]         [   A1 +04   ]                               |
|                                                  [MODE][SRC][DN][UP]                          |
|                                                  (CHA) (CHB) (AES) (HDST)                     |
+-----------------------------------------------------------------------------------------------+
```

### Front Panel Buttons & Shortcuts
- **`MODE` (Key `M`):** Cycles input domain between **Analog (`A`)**, **Digital AES (`D`)**, and **SDI (`S`)**.
  - **Hold `MODE` for 3s (Key `H`):** Enters the **`SETUP`** menu to toggle High-Pass Filtering and Termination.
- **`SOURCE` (Key `S`):**
  - In Analog mode: toggles between Front TRS jacks (`A0`) and Rear XLR-3F inputs (`A1`).
  - In AES mode: toggles between Front AES jack (`D0`) and Rear XLR/BNC (`D1`).
  - In SDI mode: cycles embedded audio channel pairs $1\text{ through }8$.
  - In SETUP mode: toggles between `HP` and `TERM` configuration menus.
- **`DOWN` / `UP` (Keys `D` / `U`):** Steps the calibration reference level down or up in $1\text{ dB}$ increments (from $-60\text{ dBu}$ to $+30\text{ dBu}$). In SETUP mode, switches HP filter out/in or termination HZ/LZ.
- **Power (Key `P` or Space):** Switches mains power on/off. When powered off, needles fall to rest, display and lamps extinguish.
- **Flip View (Key `R`):** Flips between the Front Panel rack view and Rear Panel connector layout (rear XLRs, BNCs, and IEC inlet).

---

## 4. DSP & Electromechanical Ballistics Specification

### 1. Moving-Coil VU Meter (ANSI C16.5 / IEC 60268-17)
Simulated via a continuous 2nd-order electromechanical mass-spring-damper differential equation transformed via bilinear transform:
$$H_{needle}(s) = \frac{\omega_0^2}{s^2 + 2\zeta \omega_0 s + \omega_0^2}$$
- **Simpson Style:** $\omega_0 = 2\pi \cdot 2.1\text{ Hz}$, damping ratio $\zeta = 0.65$ ($300\text{ ms}$ rise time, $1.0\%\text{--}1.5\%$ overshoot, warm amber dial backlighting).
- **Modern Sifam Style:** $\omega_0 = 2\pi \cdot 3.2\text{ Hz}$, damping ratio $\zeta = 0.85$ ($200\text{ ms}$ settling, taut-band movement, crisp white dial).

### 2. Peak Program Meter (IEC 60268-10 Type IIb Nordic / BBC)
- Logarithmic attack time constant $\tau_{att} = 5\text{ ms}$.
- Accurate logarithmic decay rate of $24\text{ dB} / 2.8\text{ s}$ ($8.6\text{ dB/s}$).
- Scaled from $-12\text{ dB}$ to $+12\text{ dB}$ reference with peak overload indication.

### 3. Normalized Pearson Phase Correlation Engine
Calculates the real-time normalized cross-correlation between Left (Channel A) and Right (Channel B):
$$r = \frac{\sum (L \cdot R)}{\sqrt{\sum L^2 \cdot \sum R^2} + \epsilon}$$
- Integrated with a $300\text{ ms}$ exponential moving average.
- Drives the 8 discrete glowing phase LEDs from $-1.0$ (anti-phase / amber-red) to $+1.0$ (pure mono in-phase / bright green).

---

## 5. Directory Structure

```
XTM.WBSps.ca/
├── index.html          # Main standalone application HTML
├── css/
│   └── xtm.css         # Studio rack aesthetic & responsive styling
├── js/
│   ├── audio-engine.js # Web Audio capture, DSP ballistics, phase correlation
│   ├── xtm-model.js    # PIC firmware state machine & EEPROM simulation
│   ├── xtm-view.js     # SVG vector renderer for XTM-4 (moving coils & display)
│   ├── pod22-view.js   # SVG vector renderer for POD-22 (dual LED bargraphs)
│   └── app.js          # Main coordinator & 60 FPS animation loop
├── assets/
│   ├── xtm4-front.svg  # CorelDRAW vector silkscreen XTM-4 front panel
│   ├── xtm4-rear.svg   # CorelDRAW vector silkscreen XTM-4 rear panel
│   ├── pod22-front.svg # CorelDRAW vector silkscreen POD-22 front panel
│   ├── pod22-rear.svg  # CorelDRAW vector silkscreen POD-22 rear panel
│   └── ...
├── server.py           # Zero-dependency Python 3 local server
├── run.sh              # Terminal launch script
└── README.md           # Documentation
```
