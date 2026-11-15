/**
 * WBS XTM Hardware Firmware Model (PIC16F874 / 42V400C Emulation)
 * Handles front panel state, EEPROM persistence, source selection,
 * filter & impedance configuration, and dot-matrix display formatting.
 */

class XtmModel {
  constructor() {
    this.power = true;
    this.mode = 'A'; // 'A' (Analog), 'D' (AES), 'S' (SDI), 'SET' (Setup)
    this.prevMode = 'A'; // Mode prior to entering SETUP

    // Inputs
    this.a = { src: 1, lvl: 64 }; // A0 (front jacks), A1 (rear XLRs), lvl 64 = +4 dBu
    this.d = { src: 1, lvl: 40, bnc: 0, locked: true }; // D0 (front AES), D1 (rear XLR/BNC), lvl 40 = -20 dBFS
    this.s = { sel: 0, pair: [1, 1], lvl: 40, dmx: 0, carrier: true, audio: true };

    // Sub-Audible Filter & Termination
    this.hp = 0;   // 0 = HP OUT (filter bypassed), 1 = HP IN (80Hz rumble cut)
    this.term = 0; // 0 = TERM HZ (bridging >20k), 1 = TERM LZ (600 Ohm load)

    // Setup Menu
    this.set = {
      scr: 'HP' // 'HP' or 'TERM'
    };

    // Front/Rear physical patch plugs
    this.plug = {
      a0: false, // Front CHA / CHB jacks
      a1: true,  // Rear Analog XLRs
      d0: false, // Front AES jack
      xlr: true, // Rear AES XLR
      bnc: false,// Rear AES BNC
      sdiA: true,
      sdiB: false,
      hdst: false
    };

    // Meter movement style & backlight
    this.meterStyle = 'simpson'; // 'simpson', 'sifam', or 'ppm'
    this.dialLamp = 'amber';     // 'amber', 'white', 'parchment'
    this.artMode = 'svg';        // 'svg' or 'png'

    this.onChange = null;

    // Load persisted state from EEPROM simulation
    this.loadEEPROM();
  }

  /* ---------------- Table conversions (42V400C.asm) ---------------- */
  // Level index: 0 = -60 dB, 60 = 0 dB, 64 = +4 dB, 90 = +30 dB
  lvlDb(idx) {
    return idx - 60;
  }

  lvlChars(idx) {
    const db = this.lvlDb(idx);
    const sign = db > 0 ? '+' : (db < 0 ? '-' : ' ');
    const abs = Math.abs(db);
    const str = abs < 10 ? '0' + abs : '' + abs;
    return sign + str;
  }

  /* ---------------- Display Text Formatter ---------------- */
  getDisplayText() {
    if (!this.power) return '        ';

    if (this.mode === 'SET') {
      if (this.set.scr === 'HP') {
        return this.hp ? ' HP  IN ' : ' HP  OUT';
      } else {
        return this.term ? 'TERM LZ ' : 'TERM HZ ';
      }
    }

    if (this.mode === 'A') {
      // e.g. "A1 +04 " or "A0z+04f"
      const src = 'A' + this.a.src;
      const termCh = this.term ? 'z' : ' ';
      const lvlStr = this.lvlChars(this.a.lvl);
      const hpCh = this.hp ? 'f' : ' ';
      return src + termCh + lvlStr + hpCh;
    }

    if (this.mode === 'D') {
      if (!this.d.locked) return ' NO LOCK';
      const src = 'D' + this.d.src;
      const lvlStr = this.lvlChars(this.d.lvl);
      const hpCh = this.hp ? 'f' : ' ';
      return src + '  ' + lvlStr + hpCh;
    }

    if (this.mode === 'S') {
      if (!this.s.carrier) return 'NO SDI  ';
      if (!this.s.audio) return 'NO AUDIO';
      const bank = this.s.sel ? 'B' : 'A';
      const pair = this.s.pair[this.s.sel];
      const lvlStr = this.lvlChars(this.s.lvl);
      const hpCh = this.hp ? 'f' : ' ';
      return 'S' + bank + pair + ' ' + lvlStr + hpCh;
    }

    return 'XTM4    ';
  }

  /* ---------------- Button Handlers ---------------- */
  pressMode() {
    if (!this.power) return;
    if (this.mode === 'SET') {
      // Exit setup
      this.mode = this.prevMode;
    } else {
      // Cycle A -> D -> S -> A
      if (this.mode === 'A') this.mode = 'D';
      else if (this.mode === 'D') this.mode = 'S';
      else this.mode = 'A';
    }
    this.saveEEPROM();
    this.notify();
  }

  holdMode() {
    if (!this.power) return;
    if (this.mode !== 'SET') {
      this.prevMode = this.mode;
      this.mode = 'SET';
      this.set.scr = 'HP';
    } else {
      this.mode = this.prevMode;
    }
    this.saveEEPROM();
    this.notify();
  }

  pressSource() {
    if (!this.power) return;
    if (this.mode === 'SET') {
      // Toggle setup screen between HP and TERM
      this.set.scr = this.set.scr === 'HP' ? 'TERM' : 'HP';
    } else if (this.mode === 'A') {
      // Toggle Front TRS (0) / Rear XLR (1)
      this.a.src = this.a.src === 0 ? 1 : 0;
    } else if (this.mode === 'D') {
      // Toggle Front AES (0) / Rear (1)
      this.d.src = this.d.src === 0 ? 1 : 0;
    } else if (this.mode === 'S') {
      // Cycle SDI pairs 1..8
      let p = this.s.pair[this.s.sel] + 1;
      if (p > 8) p = 1;
      this.s.pair[this.s.sel] = p;
    }
    this.saveEEPROM();
    this.notify();
  }

  pressDown() {
    if (!this.power) return;
    if (this.mode === 'SET') {
      if (this.set.scr === 'HP') this.hp = 0; // HP OUT
      else this.term = 1; // TERM LZ (600 Ohm)
    } else if (this.mode === 'A') {
      if (this.a.lvl > 0) this.a.lvl--;
    } else if (this.mode === 'D') {
      if (this.d.lvl > 0) this.d.lvl--;
    } else if (this.mode === 'S') {
      if (this.s.lvl > 0) this.s.lvl--;
    }
    this.saveEEPROM();
    this.notify();
  }

  pressUp() {
    if (!this.power) return;
    if (this.mode === 'SET') {
      if (this.set.scr === 'HP') this.hp = 1; // HP IN
      else this.term = 0; // TERM HZ (Bridging)
    } else if (this.mode === 'A') {
      if (this.a.lvl < 90) this.a.lvl++;
    } else if (this.mode === 'D') {
      if (this.d.lvl < 90) this.d.lvl++;
    } else if (this.mode === 'S') {
      if (this.s.lvl < 90) this.s.lvl++;
    }
    this.saveEEPROM();
    this.notify();
  }

  togglePower() {
    this.power = !this.power;
    this.notify();
  }

  setPatchJack(jack, connected) {
    if (this.plug[jack] !== undefined) {
      this.plug[jack] = connected;
      this.notify();
    }
  }

  getActiveReferenceLevel() {
    if (this.mode === 'A') return this.lvlDb(this.a.lvl);
    if (this.mode === 'D') return this.lvlDb(this.d.lvl);
    if (this.mode === 'S') return this.lvlDb(this.s.lvl);
    return 4;
  }

  /* ---------------- EEPROM Storage ---------------- */
  saveEEPROM() {
    try {
      const state = {
        mode: this.mode === 'SET' ? this.prevMode : this.mode,
        a: this.a,
        d: this.d,
        s: this.s,
        hp: this.hp,
        term: this.term,
        meterStyle: this.meterStyle,
        dialLamp: this.dialLamp,
        artMode: this.artMode
      };
      localStorage.setItem('wbs_xtm4_eeprom', JSON.stringify(state));
    } catch (_) {}
  }

  loadEEPROM() {
    try {
      const saved = localStorage.getItem('wbs_xtm4_eeprom');
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj.mode) this.mode = this.prevMode = obj.mode;
        if (obj.a) this.a = Object.assign(this.a, obj.a);
        if (obj.d) this.d = Object.assign(this.d, obj.d);
        if (obj.s) this.s = Object.assign(this.s, obj.s);
        if (obj.hp !== undefined) this.hp = obj.hp;
        if (obj.term !== undefined) this.term = obj.term;
        if (obj.meterStyle) this.meterStyle = obj.meterStyle;
        if (obj.dialLamp) this.dialLamp = obj.dialLamp;
        if (obj.artMode) this.artMode = obj.artMode;
      }
    } catch (_) {}
  }

  notify() {
    if (this.onChange) this.onChange(this);
  }
}

window.xtmModel = new XtmModel();
