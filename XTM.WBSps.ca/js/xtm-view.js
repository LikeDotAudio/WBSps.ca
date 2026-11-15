/**
 * WBS XTM Vector View & SVG Renderer
 * Renders the authentic 2RU broadcast rack unit with illuminated dials,
 * moving-coil needle mechanics, 5x7 VFD dot-matrix display, and 8-LED phase bar.
 */

// 5x7 Dot-Matrix Font Glyphs
const FONT_5X7 = {
  ' ': [0,0,0,0,0,0,0], '-': [0,0,0,31,0,0,0], '/': [0,1,2,4,8,16,0], '.': [0,0,0,0,0,12,12],
  ':': [0,12,12,0,12,12,0], '+': [0,4,4,31,4,4,0], '%': [24,25,2,4,8,19,3],
  '0': [14,17,19,21,25,17,14], '1': [4,12,4,4,4,4,14], '2': [14,17,1,2,4,8,31],
  '3': [31,2,4,2,1,17,14], '4': [2,6,10,18,31,2,2], '5': [31,16,30,1,1,17,14],
  '6': [6,8,16,30,17,17,14], '7': [31,1,2,4,8,8,8], '8': [14,17,17,14,17,17,14], '9': [14,17,17,15,1,2,12],
  A: [14,17,17,17,31,17,17], B: [30,17,17,30,17,17,30], C: [14,17,16,16,16,17,14], D: [28,18,17,17,17,18,28],
  E: [31,16,16,30,16,16,31], F: [31,16,16,30,16,16,16], G: [14,17,16,23,17,17,15], H: [17,17,17,31,17,17,17],
  I: [14,4,4,4,4,4,14], J: [7,2,2,2,2,18,12], K: [17,18,20,24,20,18,17], L: [16,16,16,16,16,16,31],
  M: [17,27,21,21,17,17,17], N: [17,17,25,21,19,17,17], O: [14,17,17,17,17,17,14], P: [30,17,17,30,16,16,16],
  Q: [14,17,17,17,21,18,13], R: [30,17,17,30,20,18,17], S: [15,16,16,14,1,1,30], T: [31,4,4,4,4,4,4],
  U: [17,17,17,17,17,17,14], V: [17,17,17,17,17,10,4], W: [17,17,17,21,21,21,10], X: [17,17,10,4,10,17,17],
  Y: [17,17,17,10,4,4,4], Z: [31,1,2,4,8,16,31],
  a: [0,0,14,1,15,17,15], b: [16,16,22,25,17,17,30], c: [0,0,14,16,16,17,14], d: [1,1,13,19,17,17,15],
  e: [0,0,14,17,31,16,14], f: [6,9,8,28,8,8,8], g: [0,15,17,17,15,1,14], h: [16,16,22,25,17,17,17],
  i: [4,0,12,4,4,4,14], k: [16,16,18,20,24,20,18], l: [12,4,4,4,4,4,14], m: [0,0,26,21,21,17,17],
  n: [0,0,22,25,17,17,17], o: [0,0,14,17,17,17,14], p: [0,0,30,17,30,16,16], r: [0,0,22,25,16,16,16],
  s: [0,0,14,16,14,1,30], t: [8,8,28,8,8,9,6], u: [0,0,17,17,17,19,13], v: [0,0,17,17,17,10,4],
  w: [0,0,17,17,21,21,10], x: [0,0,17,10,4,10,17], y: [0,0,17,17,15,1,14], z: [0,0,31,2,4,8,31]
};

class XtmView {
  constructor(containerEl) {
    this.container = containerEl;
    this.viewMode = 'front'; // 'front' or 'rear'

    // Button press tracking
    this.heldButton = null;
    this.holdTimer = null;
    this.repeatTimer = null;

    // Needle angles for smooth interpolations
    this.needles = {
      m0: -48, // Ch A VU
      m1: -45, // Ch A PPM
      m2: -48, // Ch B VU
      m3: -45  // Ch B PPM
    };

    // Geometry constants (matching physical silkscreen)
    this.OX = 190;
    this.OY = 10;
    this.MW = 580;
    this.MH = 256;
    this.MX = [380, 1095, 2325, 3040];
    this.MYc = 286;
    this.BX = { MODE: 1507, SOURCE: 1642, DOWN: 1777, UP: 1911 };
    this.BYc = 360;
    this.JX = [1511, 1643, 1776, 1908];
    this.JYc = 550;
    this.DISP = { x: 1504, y: 122, w: 406, h: 98 };

    // Interaction callbacks
    this.onButtonPressed = null;
    this.onButtonReleased = null;
    this.onJackClicked = null;
    this.onPowerToggle = null;
  }

  /* ---------------- Needle Angle Calculations ---------------- */
  vuFrac(db) {
    return Math.pow(10, (db - 3) / 20);
  }

  vuAngle(p) {
    // -20 VU -> -48 deg, 0 VU (p=0.708) -> +20 deg, +3 VU (p=1.0) -> +48 deg
    return -48 + 96 * Math.max(-0.03, Math.min(1.08, p));
  }

  ppmFrac(db) {
    if (db === null || !isFinite(db)) return -0.12;
    return db >= -12 ? (db + 12) / 24 : -0.12 * (1 - Math.pow(10, (db + 12) / 20));
  }

  ppmAngle(q) {
    // -12 dB -> -45 deg, +12 dB -> +45 deg
    return -45 + 90 * Math.max(-0.13, Math.min(1.08, q));
  }

  /* ---------------- Dot Matrix SVG Generator ---------------- */
  renderDotMatrix(text, x, y, pitch, onColor, offColor) {
    let s = '';
    const r = pitch * 0.38;
    for (let ci = 0; ci < text.length; ci++) {
      const g = FONT_5X7[text[ci]] || FONT_5X7[' '];
      const cx = x + ci * pitch * 6.2;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          const on = (g[row] >> (4 - col)) & 1;
          s += `<circle cx="${(cx + col * pitch).toFixed(1)}" cy="${(y + row * pitch).toFixed(1)}" r="${r.toFixed(2)}" fill="${on ? onColor : offColor}"/>`;
        }
      }
    }
    return s;
  }

  /* ---------------- Meter Dial & Needle SVG ---------------- */
  renderMeter(id, cx, cy, kind, angle, isPowered, dialLamp) {
    const MW = this.MW, MH = this.MH;
    const x0 = cx - MW / 2, y0 = cy - MH / 2;
    const px = cx, py = cy + 176, R = 246;

    const P = (a, r) => {
      const t = a * Math.PI / 180;
      return [px + r * Math.sin(t), py - r * Math.cos(t)];
    };

    let fillGrad = '#221c15';
    if (isPowered) {
      if (dialLamp === 'white') fillGrad = 'url(#xwhite)';
      else if (dialLamp === 'parchment') fillGrad = 'url(#xparchment)';
      else fillGrad = 'url(#xamber)';
    }

    const ink = isPowered ? '#141008' : '#0c0a06';

    const arc = (a0, a1, r, w, col) => {
      const [x1, y1] = P(a0, r), [x2, y2] = P(a1, r);
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
    };

    let s = `<clipPath id="xmc${id}"><rect x="${x0}" y="${y0}" width="${MW}" height="${MH}" rx="12"/></clipPath><g clip-path="url(#xmc${id})">
      <rect x="${x0}" y="${y0}" width="${MW}" height="${MH}" fill="${fillGrad}"/>`;

    if (kind === 'vu') {
      // VU Scale Arcs: -20 to 0 VU black, 0 to +3 VU red
      s += arc(this.vuAngle(this.vuFrac(-20)), this.vuAngle(this.vuFrac(0)), R, 3.5, ink);
      s += arc(this.vuAngle(this.vuFrac(0)), this.vuAngle(this.vuFrac(3)), R + 4, 11, '#b91c1c');

      // VU Major Ticks
      [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3].forEach(d => {
        const a = this.vuAngle(this.vuFrac(d));
        const [x1, y1] = P(a, R), [x2, y2] = P(a, R + 20), [tx, ty] = P(a, R + 42);
        const col = d > 0 ? '#b91c1c' : ink;
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="4"/>
              <text x="${tx.toFixed(1)}" y="${(ty + 8).toFixed(1)}" font-size="25" font-weight="700" text-anchor="middle" fill="${col}">${d > 0 ? '+' + d : d}</text>`;
      });

      // Percentage sub-scale: 20, 40, 60, 80, 100%
      [20, 40, 60, 80, 100].forEach(pc => {
        const a = this.vuAngle((pc / 100) * 0.708);
        const [x1, y1] = P(a, R - 6), [tx, ty] = P(a, R - 30);
        s += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="4" fill="${ink}"/>
              <text x="${tx.toFixed(1)}" y="${(ty + 6).toFixed(1)}" font-size="15" text-anchor="middle" fill="${ink}">${pc}</text>`;
      });

      s += `<text x="${(x0 + 120).toFixed(0)}" y="${y0 + 62}" font-size="24" font-weight="700" fill="${ink}">VU</text>
            <text x="${(x0 + MW - 140).toFixed(0)}" y="${y0 + 62}" font-size="24" font-weight="700" fill="#b91c1c">VU</text>`;
    } else {
      // PPM Scale: -12 to +12 dB
      s += arc(this.ppmAngle(0), this.ppmAngle(1), R, 3.5, ink);
      s += arc(this.ppmAngle(20 / 24), this.ppmAngle(1), R + 8, 16, '#c45a10');

      for (let d = -12; d <= 12; d += 2) {
        const a = this.ppmAngle((d + 12) / 24);
        const [x1, y1] = P(a, R), [x2, y2] = P(a, R + (d % 4 ? 12 : 22));
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="4"/>`;
      }

      [-12, -8, -4, 0, 4, 8, 12].forEach(d => {
        const a = this.ppmAngle((d + 12) / 24);
        const [tx, ty] = P(a, R + 44);
        s += `<text x="${tx.toFixed(1)}" y="${(ty + 8).toFixed(1)}" font-size="25" font-weight="700" text-anchor="middle" fill="${ink}">${d > 0 ? '+' + d : d}</text>`;
      });
      s += `<text x="${cx}" y="${y0 + 62}" font-size="22" font-weight="700" text-anchor="middle" fill="${ink}">PPM (dB)</text>`;
    }

    // Ward-Beck Systems Heritage Logo Plate on Dial
    s += `<rect x="${cx - 44}" y="${cy + 46}" width="88" height="30" rx="6" fill="none" stroke="${ink}" stroke-width="2.5"/>
          <text x="${cx}" y="${cy + 68}" font-size="20" font-weight="800" text-anchor="middle" fill="${ink}">WBS</text>`;

    // Needle Drawing with Shadow & Bezel
    const [nx, ny] = P(angle, R + 30);
    const [sx, sy] = P(angle + 1.2, R + 26);

    // Subtle needle drop shadow
    if (isPowered) {
      s += `<line x1="${px + 4}" y1="${py + 3}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="rgba(0,0,0,0.22)" stroke-width="4" stroke-linecap="round"/>`;
    }

    // Physical Needle
    s += `<line x1="${px}" y1="${py}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#0f0f10" stroke-width="4.5" stroke-linecap="round"/>`;

    // Pivot cap hub
    s += `<circle cx="${px}" cy="${py}" r="16" fill="#17191c" stroke="#444" stroke-width="2"/>`;

    s += `</g><rect x="${x0}" y="${y0}" width="${MW}" height="${MH}" rx="12" fill="none" stroke="#090909" stroke-width="8"/>`;
    return s;
  }

  /* ---------------- Complete Front Panel SVG ---------------- */
  renderFrontPanel(model, levels) {
    const on = model.power;
    const txt = model.getDisplayText();
    const led = on ? levels.phaseLed : -1;
    const OX = this.OX, OY = this.OY;

    // Calculate angles
    const m0Ang = on ? this.vuAngle(levels.vu[0]) : -48;
    const m1Ang = on ? this.ppmAngle(levels.ppm[0]) : -45;
    const m2Ang = on ? this.vuAngle(levels.vu[1]) : -48;
    const m3Ang = on ? this.ppmAngle(levels.ppm[1]) : -45;

    let s = `<svg viewBox="0 0 3800 700" role="img" aria-label="Ward-Beck Systems XTM-4 Front Panel" style="width:100%;display:block;border-radius:6px">
      <defs>
        <!-- Dial Backlight Gradients -->
        <radialGradient id="xamber" cx="50%" cy="75%" r="75%">
          <stop offset="0" stop-color="#ffe399"/>
          <stop offset="0.6" stop-color="#f5b842"/>
          <stop offset="1" stop-color="#ce7d14"/>
        </radialGradient>
        <radialGradient id="xwhite" cx="50%" cy="75%" r="75%">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="0.6" stop-color="#eaf0f4"/>
          <stop offset="1" stop-color="#b6c0c7"/>
        </radialGradient>
        <radialGradient id="xparchment" cx="50%" cy="75%" r="75%">
          <stop offset="0" stop-color="#fffbee"/>
          <stop offset="0.6" stop-color="#faecc0"/>
          <stop offset="1" stop-color="#dcbe8d"/>
        </radialGradient>
        <!-- Glowing filters for VFD and Phase LEDs -->
        <filter id="xglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="xledglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Rack Chassis Background & 19" Ears -->
      <rect width="3800" height="700" fill="#25272a"/>
      <rect x="${OX - 6}" y="0" width="${3419 + 12}" height="700" fill="#181a1d"/>

      <!-- Rack Mounting Oval Holes -->
      ${[[68, 52], [68, 648], [3732, 52], [3732, 648]].map(([x, y]) =>
        `<rect x="${x - 42}" y="${y - 20}" width="84" height="40" rx="20" fill="#0d0e10" stroke="#333" stroke-width="2"/>`
      ).join('')}

      <!-- CorelDRAW Vector Silkscreen Artwork -->
      ${model.artMode === 'png' ?
        `<image href="assets/xtm4-front-green.png" x="${OX}" y="${OY}" width="3419" height="679"/>
         <image href="assets/xtm4-front-white.png" x="${OX}" y="${OY}" width="3419" height="679"/>` :
        `<image href="assets/xtm4-front.svg" x="${OX}" y="${OY}" width="3419" height="679" preserveAspectRatio="none"/>`
      }

      <!-- 4 Moving-Coil Meters -->
      ${this.renderMeter('m0', this.MX[0] + OX, this.MYc + OY, 'vu', m0Ang, on, model.dialLamp)}
      ${this.renderMeter('m1', this.MX[1] + OX, this.MYc + OY, 'ppm', m1Ang, on, model.dialLamp)}
      ${this.renderMeter('m2', this.MX[2] + OX, this.MYc + OY, 'vu', m2Ang, on, model.dialLamp)}
      ${this.renderMeter('m3', this.MX[3] + OX, this.MYc + OY, 'ppm', m3Ang, on, model.dialLamp)}

      <!-- Center Alphanumeric Display Window (HDSP-2533 VFD Dot-Matrix) -->
      ${(() => {
        const p = 7.6;
        const w8 = (8 * 6.2 - 1.2) * p;
        const dx = this.DISP.x + OX + (this.DISP.w - w8) / 2;
        const dy = this.DISP.y + OY + (this.DISP.h - 6 * p) / 2;
        return `<rect x="${this.DISP.x + OX}" y="${this.DISP.y + OY}" width="${this.DISP.w}" height="${this.DISP.h}" rx="4" fill="#050604" stroke="#1f2226" stroke-width="2"/>
                <g ${on ? 'filter="url(#xglow)"' : ''}>
                  ${this.renderDotMatrix(txt, dx, dy, p, '#c8f53c', 'rgba(150,200,60,.06)')}
                </g>`;
      })()}

      <!-- 8-Segment Phase Correlation Bar -->
      ${(() => {
        let ps = '';
        for (let i = 0; i < 8; i++) {
          const cx = 1603 + i * 32.14 + OX;
          const cy = 36 + OY;
          const isLit = on && i === led;
          // Colors: LEDs 0-2 (out of phase) amber/red, 3-7 (in phase) green
          const litColor = i <= 1 ? '#ff5a36' : (i <= 3 ? '#ffb43a' : '#9dff3a');
          const offColor = i <= 1 ? '#3a1810' : (i <= 3 ? '#3a2810' : '#142e17');

          ps += `<circle cx="${cx.toFixed(1)}" cy="${cy}" r="12" fill="#0b0d0b" stroke="#222"/>
                 <circle cx="${cx.toFixed(1)}" cy="${cy}" r="9" fill="${isLit ? litColor : offColor}" ${isLit ? 'filter="url(#xledglow)"' : ''}/>`;
        }
        return ps;
      })()}

      <!-- Push Buttons: MODE, SOURCE, DOWN, UP -->
      ${Object.keys(this.BX).map(b => {
        const x = this.BX[b] + OX - 47.5;
        const y = this.BYc + OY - 71;
        const isDown = this.heldButton === b;
        return `<g class="xtm-btn" data-btn="${b}" style="cursor:pointer">
          <rect x="${x}" y="${y}" width="95" height="142" fill="#070809"/>
          <rect x="${x + 5}" y="${y + 5 + (isDown ? 6 : 0)}" width="85" height="${130 - (isDown ? 6 : 0)}" rx="4"
                fill="${isDown ? '#2b2f33' : '#1d2023'}" stroke="#3b3f44" stroke-width="2.5"/>
          <line x1="${x + 8}" y1="${y + 52 + (isDown ? 6 : 0)}" x2="${x + 87}" y2="${y + 52 + (isDown ? 6 : 0)}" stroke="#3a3d42" stroke-width="2"/>
          <title>${b} Button (Click or Hold)</title>
        </g>`;
      }).join('')}

      <!-- Front Patch Jacks: CHA, CHB, AES, HDST -->
      ${(() => {
        const jk = [['a0', 'CHA'], ['a0', 'CHB'], ['d0', 'AES'], ['hdst', 'HDST']];
        return this.JX.map((x, i) => {
          const [key, lbl] = jk[i];
          const plugged = model.plug[key];
          return `<g class="xtm-jack" data-jack="${key}" style="cursor:pointer">
            <circle cx="${x + OX}" cy="${this.JYc + OY}" r="46" fill="#c9c6bd" stroke="#68655e" stroke-width="5"/>
            <circle cx="${x + OX}" cy="${this.JYc + OY}" r="30" fill="#0a0a0a"/>
            ${plugged ?
              `<circle cx="${x + OX}" cy="${this.JYc + OY}" r="40" fill="#2c4f86" stroke="#17305a" stroke-width="5"/>
               <circle cx="${x + OX}" cy="${this.JYc + OY}" r="15" fill="#9fb8de"/>` : ''
            }
            <title>${lbl} Jack — Click to ${plugged ? 'unplug' : 'insert patch cord'}</title>
          </g>`;
        }).join('');
      })()}

      <!-- Power Indicator Lamp -->
      <circle cx="${OX + 120}" cy="${OY + 360}" r="14" fill="#0b0d0b" stroke="#333"/>
      <circle cx="${OX + 120}" cy="${OY + 360}" r="10" fill="${on ? '#70ff54' : '#1a3318'}" ${on ? 'filter="url(#xledglow)"' : ''}/>
      <text x="${OX + 120}" y="${OY + 395}" font-size="16" font-weight="700" fill="#888" text-anchor="middle">POWER</text>

      <!-- Shading Overlay when Mains Off -->
      ${!on ? `<rect x="${OX}" y="${OY}" width="3419" height="679" fill="#000" opacity="0.45"/>` : ''}
    </svg>`;

    return s;
  }

  /* ---------------- Rear Panel SVG ---------------- */
  renderRearPanel(model) {
    const on = model.power;
    const xlr = (x, y, female, key, lbl) => {
      const pl = key ? model.plug[key] : false;
      return `<g ${key ? `class="xtm-rear-conn" data-jack="${key}" style="cursor:pointer"` : ''}>
        <circle cx="${x}" cy="${y}" r="92" fill="#cfcdc6" stroke="#77746c" stroke-width="5"/>
        <circle cx="${x}" cy="${y}" r="70" fill="${female ? '#111' : '#2a2a2a'}"/>
        ${[[0, -30], [-27, 18], [27, 18]].map(([a, b]) =>
          `<circle cx="${x + a}" cy="${y + b}" r="${female ? 10 : 12}" fill="${female ? '#000' : '#d6c27a'}" stroke="#555"/>`
        ).join('')}
        <circle cx="${x - 66}" cy="${y - 66}" r="13" fill="#9b9a95"/>
        <circle cx="${x + 66}" cy="${y + 66}" r="13" fill="#9b9a95"/>
        ${pl ?
          `<circle cx="${x}" cy="${y}" r="80" fill="#26292c" stroke="#111" stroke-width="5"/>
           <rect x="${x - 26}" y="${y + 60}" width="52" height="${679 - y - 60}" fill="#1d2023"/>
           <circle cx="${x + 50}" cy="${y - 60}" r="12" fill="#48bb78"/>` : ''
        }
        <title>${lbl}: Click to ${pl ? 'unplug' : 'connect cable'}</title>
      </g>`;
    };

    const bnc = (x, y, key, lbl, gold) => {
      const pl = key ? model.plug[key] : false;
      return `<g ${key ? `class="xtm-rear-conn" data-jack="${key}" style="cursor:pointer"` : ''}>
        <circle cx="${x}" cy="${y}" r="44" fill="${gold ? '#b8953a' : '#c9c7c0'}" stroke="#6e6a60" stroke-width="4"/>
        <circle cx="${x}" cy="${y}" r="26" fill="${gold ? '#e6cf86' : '#e3e1da'}"/>
        <circle cx="${x}" cy="${y}" r="9" fill="#55500f"/>
        ${pl ?
          `<rect x="${x - 18}" y="${y + 30}" width="36" height="${Math.max(0, 679 - y - 30)}" fill="#2b5f9e"/>
           <rect x="${x - 32}" y="${y - 30}" width="64" height="64" rx="10" fill="#3a74b8"/>
           <circle cx="${x + 40}" cy="${y - 44}" r="11" fill="#48bb78"/>` : ''
        }
        <title>${lbl}: Click to ${pl ? 'unplug' : 'connect cable'}</title>
      </g>`;
    };

    let s = `<svg viewBox="0 0 3419 679" role="img" aria-label="XTM4 Rear Panel" style="width:100%;display:block;border-radius:6px">
      <rect width="3419" height="679" fill="#1b1c1e"/>

      <!-- IEC Mains Inlet with switch -->
      <g class="xtm-power-iec" style="cursor:pointer">
        <rect x="88" y="82" width="214" height="252" rx="10" fill="#0d0d0e" stroke="#3a3a3a" stroke-width="4"/>
        <rect x="118" y="108" width="154" height="110" rx="8" fill="#050505"/>
        ${[[155, 150], [195, 150], [235, 150]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 14}" width="12" height="30" fill="#777"/>`).join('')}
        <rect x="118" y="236" width="154" height="74" rx="4" fill="${on ? '#2b6cb0' : '#161617'}"/>
        <title>IEC Inlet & Mains Switch — Click to toggle mains power ${on ? 'OFF' : 'ON'}</title>
      </g>

      <!-- Rear Connectors -->
      ${bnc(806, 542, 'bnc', 'AES INPUT 75 Ω BNC', false)}
      ${xlr(1055, 536, true, 'xlr', 'AES INPUT 110 Ω XLR')}
      ${xlr(2110, 536, false, null, 'MONITOR OUT A')}
      ${xlr(2388, 536, false, null, 'MONITOR OUT B')}
      ${xlr(2686, 536, true, 'a1', 'ANALOG INPUT A (Rear XLR)')}
      ${xlr(3089, 536, true, 'a1', 'ANALOG INPUT B (Rear XLR)')}

      <!-- Rear Silkscreen Layer -->
      <image href="assets/xtm4-rear.svg" width="3419" height="679" preserveAspectRatio="none" style="pointer-events:none"/>

      ${!on ? `<text x="1700" y="100" font-size="44" font-weight="700" fill="#f87171" text-anchor="middle">MAINS POWER OFF</text>` : ''}
    </svg>`;

    return s;
  }

  /* ---------------- Attach DOM Listeners ---------------- */
  attachEvents(model) {
    if (!this.container) return;

    // Button interactions with pointerdown / pointerup
    this.container.querySelectorAll('.xtm-btn').forEach(btnEl => {
      const btn = btnEl.dataset.btn;

      btnEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { btnEl.setPointerCapture(e.pointerId); } catch (_) {}
        this.heldButton = btn;

        if (btn === 'MODE') {
          // If held for >3s, enter SETUP
          this.holdTimer = setTimeout(() => {
            if (this.heldButton === 'MODE') {
              model.holdMode();
              this.holdTimer = null;
            }
          }, 2800);
        } else if (btn === 'UP' || btn === 'DOWN') {
          // Auto repeat on hold
          const repeatAction = () => {
            if (this.heldButton === btn) {
              if (btn === 'UP') model.pressUp();
              else model.pressDown();
              this.repeatTimer = setTimeout(repeatAction, 200);
            }
          };
          this.repeatTimer = setTimeout(repeatAction, 600);
        }

        // Trigger immediate press
        if (btn === 'MODE') model.pressMode();
        else if (btn === 'SOURCE') model.pressSource();
        else if (btn === 'DOWN') model.pressDown();
        else if (btn === 'UP') model.pressUp();
      });

      const releaseBtn = () => {
        if (this.holdTimer) { clearTimeout(this.holdTimer); this.holdTimer = null; }
        if (this.repeatTimer) { clearTimeout(this.repeatTimer); this.repeatTimer = null; }
        this.heldButton = null;
      };

      btnEl.addEventListener('pointerup', releaseBtn);
      btnEl.addEventListener('pointercancel', releaseBtn);
    });

    // Front Jack toggles
    this.container.querySelectorAll('.xtm-jack').forEach(jackEl => {
      const jack = jackEl.dataset.jack;
      jackEl.addEventListener('click', () => {
        model.setPatchJack(jack, !model.plug[jack]);
      });
    });

    // Rear IEC Inlet
    const iec = this.container.querySelector('.xtm-power-iec');
    if (iec) {
      iec.addEventListener('click', () => {
        model.togglePower();
      });
    }

    // Rear Connectors
    this.container.querySelectorAll('.xtm-rear-conn').forEach(connEl => {
      const jack = connEl.dataset.jack;
      connEl.addEventListener('click', () => {
        model.setPatchJack(jack, !model.plug[jack]);
      });
    });
  }

  /* ---------------- Main Render Dispatcher ---------------- */
  render(model, levels) {
    if (!this.container) return;

    if (this.viewMode === 'front') {
      this.container.innerHTML = this.renderFrontPanel(model, levels);
    } else {
      this.container.innerHTML = this.renderRearPanel(model);
    }

    this.attachEvents(model);
  }
}

window.XtmView = XtmView;
