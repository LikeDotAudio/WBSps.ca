/**
 * WBS POD-22 Stereo Loudness Meter - View & Renderer
 * Simulates the dual 41-segment high-resolution LED bargraphs,
 * 7-segment vertical phase correlation bar, tallies, and silkscreen artwork.
 */

class Pod22View {
  constructor(containerEl) {
    this.container = containerEl;
    this.viewMode = 'front'; // 'front' or 'rear'

    // Hardware DIP switch state
    this.dip = {
      BRIGHT: 1, // 1 = 100% LED brightness, 0 = 50%
      'A/D': 1,  // 1 = Digital AES, 0 = Analog
      BS0: 1,    // 1 = Type 1 decay (1.5s/24dB), 0 = Type 2 decay (3s/24dB)
      BS1: 1,    // 1 = Peak Hold ON, 0 = Peak Hold OFF
      CAL0: 0,
      CAL1: 0,
      A0: 0,
      A1: 0
    };

    // Peak hold memory
    this.heldPeak = [0, 0]; // Index of held segment
    this.holdTimer = [0, 0]; // Countdown in frames

    // Geometry constants (200 dpi silkscreen pixels: 1714 x 321)
    this.PW = 1714;
    this.PH = 321;
    this.SCALE = ['PR','36','32','28','26','24','22','20','18','16','15','14','13','12','11','10','9','8','7','6','5','4','3','2','1','0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','','PK'];
    this.ROWY = [132, 190]; // Y positions of Left and Right LED rows
    this.PHX = 411;         // X position of vertical Phase LEDs
    this.PHY0 = 100;        // Y position of top Phase LED
    this.TALLY_Y = 271;     // Y position of tallies

    this.DB_THRESHOLDS = [
      -45, -36, -32, -28, -26, -24, -22, -20, -18, -16,
      -15, -14, -13, -12, -11, -10,  -9,  -8,  -7,  -6,
       -5,  -4,  -3,  -2,  -1,   0,   1,   2,   3,   4,
        5,   6,   7,   8,   9,  10,  11,  12,  13,  14
    ];

    this.PH_COL = ['#b9f05a', '#d8ec3a', '#ff9a2a', '#ff9a2a', '#ff5a3a', '#ff3b30', '#ff3b30'];
  }

  segX(p) {
    return 476 + 20 * p;
  }

  segColor(p) {
    if (p === 41) return '#ff3b30'; // PK Overload red
    if (p <= 18) return '#c9e43a';  // Green-yellow
    if (p <= 23) return '#ff9a2a';  // Amber
    if (p <= 26) return '#b9f05a';  // Bright green near 0 VU
    if (p <= 33) return '#ff9a2a';  // Amber
    return '#ff3b30';               // Red
  }

  dbToSegmentIndex(db) {
    if (!isFinite(db) || db < -55) return -1;
    let idx = -1;
    for (let i = 0; i < this.DB_THRESHOLDS.length; i++) {
      if (db >= this.DB_THRESHOLDS[i]) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }

  renderFrontPanel(model, levels) {
    const powered = model.power;
    const hasAudio = levels.hasAudio;
    const op = this.dip.BRIGHT ? 1 : 0.6;

    // Calculate lit segments for Row 0 (L) and Row 1 (R)
    const lit = [new Array(42).fill(false), new Array(42).fill(false)];

    if (powered && hasAudio) {
      for (let ch = 0; ch < 2; ch++) {
        // VU average bar
        const vuDb = levels.vuDb[ch];
        const vuIdx = this.dbToSegmentIndex(vuDb);

        for (let p = 0; p <= vuIdx && p < 40; p++) {
          lit[ch][p] = true;
        }

        // Peak Hold Dot
        if (this.dip.BS1) {
          const ppmDb = levels.ppmDb[ch];
          const pkIdx = this.dbToSegmentIndex(ppmDb);

          if (pkIdx >= this.heldPeak[ch]) {
            this.heldPeak[ch] = pkIdx;
            this.holdTimer[ch] = 90; // Hold for 90 frames (~1.5s)
          } else {
            if (this.holdTimer[ch] > 0) {
              this.holdTimer[ch]--;
            } else {
              this.heldPeak[ch] = Math.max(-1, this.heldPeak[ch] - 1);
            }
          }

          if (this.heldPeak[ch] >= 0 && this.heldPeak[ch] < 40) {
            lit[ch][this.heldPeak[ch]] = true;
          }
        }

        // Peak Clip LED (p = 41)
        if (levels.peak[ch] || levels.ppmDb[ch] >= 14) {
          lit[ch][41] = true;
        }
      }
    } else {
      this.heldPeak = [-1, -1];
      this.holdTimer = [0, 0];
    }

    // Phase Correlation LEDs (7 vertical segments)
    const phaseLit = new Array(7).fill(false);
    if (powered && hasAudio) {
      const corr = levels.phaseCorrelation;
      if (corr > 0.70) phaseLit[0] = true;
      else if (corr > 0.40) phaseLit[1] = true;
      else if (corr > 0.15) phaseLit[2] = true;
      else if (corr >= -0.15) phaseLit[3] = true;
      else if (corr >= -0.40) phaseLit[4] = true;
      else if (corr >= -0.70) phaseLit[5] = true;
      else phaseLit[6] = true;
    }

    // Tallies
    const isLocked = powered && hasAudio;
    const isError = powered && (levels.peak[0] || levels.peak[1]);

    const L = (x, y, w, h, on, col, title) =>
      `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="2"
             fill="${on ? col : '#23201d'}" ${on ? `opacity="${op}" filter="url(#p22g)"` : ''}>
        ${title ? `<title>${title}</title>` : ''}
      </rect>`;

    let s = `<svg viewBox="0 0 ${this.PW} ${this.PH}" role="img" aria-label="Ward-Beck Systems POD-22 Front Panel" style="width:100%;display:block;border-radius:6px">
      <defs>
        <filter id="p22g" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Panel Background -->
      <rect width="${this.PW}" height="${this.PH}" rx="8" fill="#141517"/>
      <rect x="2" y="2" width="${this.PW - 4}" height="${this.PH - 4}" rx="7" fill="none" stroke="#25272a" stroke-width="3"/>

      <!-- LED Bars: Left (Row 0) and Right (Row 1) -->
      ${[0, 1].map(row => {
        let rowStr = '';
        for (let p = 0; p < 42; p++) {
          if (p === 40) continue; // Gap before PK LED
          rowStr += L(this.segX(p), this.ROWY[row], 14, 12, lit[row][p], this.segColor(p), `${row ? 'R' : 'L'} ${this.SCALE[p]}`);
        }
        return rowStr;
      }).join('')}

      <!-- Vertical Phase Correlation Bar (7 LEDs) -->
      ${[0, 1, 2, 3, 4, 5, 6].map(i =>
        L(this.PHX, this.PHY0 + 20 * i, 14, 11, phaseLit[i], this.PH_COL[i], `Phase Bar Segment ${i + 1}`)
      ).join('')}

      <!-- 0 VU Alignment Markers (Red Hard-Wired LED Ticks) -->
      ${L(976, 96, 13, 10, powered, '#ff3b30', '0 VU Marker (Nominal Broadcast Alignment)')}
      ${L(976, 226, 13, 10, powered, '#ff3b30', '0 VU Marker (Nominal Broadcast Alignment)')}

      <!-- Tallies -->
      ${L(600, this.TALLY_Y, 13, 11, isLocked, '#c9f03a', 'LOCK Tally')}
      ${L(697, this.TALLY_Y, 13, 11, isLocked, '#c9f03a', 'COM Active')}
      ${L(799, this.TALLY_Y, 13, 11, isLocked && window.xtmAudio?.ctx?.sampleRate === 44100, '#c9f03a', '44.1 kHz Sample Rate')}
      ${L(898, this.TALLY_Y, 13, 11, isLocked && (window.xtmAudio?.ctx?.sampleRate === 48000 || !window.xtmAudio?.ctx), '#c9f03a', '48 kHz Broadcast Standard')}
      ${L(995, this.TALLY_Y, 13, 11, isLocked && window.xtmAudio?.ctx?.sampleRate === 96000, '#c9f03a', '96 kHz High-Res')}
      ${L(1089, this.TALLY_Y, 13, 11, isError, '#ff3b30', 'ERROR / Overload Tally')}

      <!-- Rotated Scale Labels -->
      ${this.SCALE.map((lb, p) => {
        if (!lb) return '';
        return `<text x="${this.segX(p)}" y="161" transform="rotate(90 ${this.segX(p)} 161)" text-anchor="middle" dominant-baseline="central"
                      font-size="16" font-weight="700" fill="#f4f4f0" font-family="Arial, Helvetica, sans-serif">${lb}</text>`;
      }).join('')}

      <!-- Silkscreen Overlay Vector Artwork -->
      <image href="assets/pod22-front.svg" width="${this.PW}" height="${this.PH}"/>

      <!-- Mounting Screws -->
      ${[50, 337, 1477, 1664].map(x => this.renderScrew(x, 161)).join('')}

      ${!powered ? `<text x="857" y="300" text-anchor="middle" font-size="16" fill="#888">(Power Off)</text>` : ''}
    </svg>`;

    return s;
  }

  renderScrew(x, y) {
    return `<circle cx="${x}" cy="${y}" r="13" fill="#6d7175" stroke="#3a3d40" stroke-width="2"/>
            <path d="M${x - 7} ${y}h14M${x} ${y - 7}v14" stroke="#25282b" stroke-width="3"/>`;
  }

  renderRearPanel(model) {
    return `<svg viewBox="0 0 ${this.PW} ${this.PH}" role="img" aria-label="POD22 Rear Panel" style="width:100%;display:block;border-radius:6px">
      <rect width="${this.PW}" height="${this.PH}" fill="#1b1c1e"/>
      <image href="assets/pod22-rear.svg" width="${this.PW}" height="${this.PH}"/>
    </svg>`;
  }

  render(model, levels) {
    if (!this.container) return;
    if (this.viewMode === 'front') {
      this.container.innerHTML = this.renderFrontPanel(model, levels);
    } else {
      this.container.innerHTML = this.renderRearPanel(model);
    }
  }
}

window.Pod22View = Pod22View;
