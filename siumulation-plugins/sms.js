/* =====================================================================
   SMS4 / SMS4A — Stereo Meter System (Ward-Beck Systems, 1999|32 and 2003|36)
   Plugin for the WBS Device Simulator (../siumulation.htm)

   Sources used (all in this archive; folder from _manifest.json: "XXX - SMS - #Engineering #OBSOLETE"):
   SMS4A (2003, the "revised SMS4" on the VMS44-3 DSP board)
   - SMS - #SOFTWARE #Pic/…#v100/sms443v4.asm  "VMS44-3 FOR REVISED SMS4, VERSION 2.00, August 12 2003"
       MAIN, autodetect1..4, read8420s, shiftin/shiftout, refresh_sharc_registers, cs8420lockprocess,
       refresh8420_1..4, sharc / sharc_shift / continue_shift, read_jumpers, process_jumpers
   - …#v100/init443.asm   pin map comments, cal constants (dig_20dbfs 121, dig_18dbfs 101, anal_4db 73,
       anal_0db 113), detect_count 8, detect_count1 2, rsconstant 5, CS8420 register defaults, boot delays
   - …#v100/sms4.pjt [Fuses] Frequency=4000000 (MPLAB setting, used here as the PIC clock — inferred)
   - …#working/working.asm  (March 2003 NAB prototype, no autodetect)
   - SMS - #SOFTWARE #Altera/v100/vms44-1.rpt  EPM3128ATC144-10 pins + equations (A/D-or-AES mux, 74165, latch)
   - SMS4 - #PCB/SMS4VMS44-3_iss2BOM.doc  (PIC16F874, ADSP21065, EPM3128, 4× CS8420, 4× CS5333, PLL1700E, 27 MHz)
   - SMS4A - #Mechanical/SMS4A-FRONT.dwg (21 08 03), SMS4-REAR.dwg (11 07 03)  → panels drawn to scale
   - SMS-4MAN.wpd  (SMS4A manual: 28 segment VU/Peak, 5 segment correlation, DIP SW3/SW4, specs)
   - SHARC code is shared with the VMS44 (README): XXX - VMS - #Engineering #OBSOLETE/vms-44/sharc/v103/
       vms44_main.asm (sport0_isr, mux_ctl, shift_led_data, translate_meter_results, synch_test, input_gain),
       vumeter.asm (TCONST_VU/PPM), phasemeter.asm, vms44_vu_data.dat, vms44_pk_data.dat, vms44_phase_data.dat,
       point_one_dB_table.dat, vms44_LDF.LDF
   SMS4 (1999 original)
   - SMS - #Old Version/V100/SMS4V100.ASM, sms4v101.asm, sms4v102.asm (PIC16C73A dig1_check..dig4_check)
   - SMS - #Old Version/SMSSLKS.CDR (real silkscreen, converted with Inkscape → assets/sms-sms4-*.png),
       TEMP.CDR (same art with LEDs/connectors placed), SMS-4MAN.WPD (1999 manual), SMS4.DSN (OrCAD parts)
   - SMS4.cdr (= "SMS4 - #Artwork.cdr", identical): the 1999 block diagram
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const FS = 48000;

/* ---------------- constants from the source ---------------- */
const C = {
  FOSC: 4e6,            // sms4.pjt Frequency=4000000 — the crystal itself is not in the BOM: INFERRED
  DETECT: 8,            // detect_count  (passes without lock before falling back to analog)
  DETECT1: 2,           // detect_count1 (passes of lock before lockaes_analogN,1 is set)
  RSCONST: 5,           // rsconstant    (cs8420lockprocess runs every 5th pass)
  T_LOCK: 0.010,        // receiver PLL lock time after a cable goes in — INFERRED (datasheet value, not in archive)
  MUX: 300,             // mux_rate 300 = "80Hz mux rate at 48K" (vms44_main.asm)
  SHIFT_CLK: 36,        // MM5450: start bit + 35 data bits
  TVU: 0.000319752, TPA: 0.009548227, TPD: 0.000031979,   // vumeter.asm (assume 48 kHz)
  PH_A: 0.999, PH_THR: 4e-4,                               // phasemeter.asm
  GAIN3: 1.412537,      // sport0_isr: f3=1.412537 "+3dB offset"
  OLD_CYC: 8030,        // SMS4 1999 loop: re_init + 4× dig_check + sel pulse + DELAY (256×31 cycles), counted from source
  OLD_BNCE: 5,          // bnce_num
  OLD_ATT: 0.001, OLD_DEC: 0.30,  // LF353 rectifier → LM3914 ballistics: INFERRED
  ANA_FS: 19.3,         // analog dBu for a full-scale sine: INFERRED from anal_4db 73 / anal_0db 113
  CAL: { dig20:121, dig18:101, ana4:73, ana0:113 },
};
const TCY = 4 / C.FOSC;                          // one instruction cycle
/* PIC main-loop steps (sms443v4.asm MAIN) with instruction cycles counted from the source (±10 %) */
const PSTEPS = [
  ['autodetect1…4', 48, 'Per channel: confirm lock for 2 passes (detect_count1) or count 8 passes without lock (detect_count) before switching source'],
  ['read8420s', 450, 'Global write of map byte 16, then read CS8420 register 16 (receiver error) from U4, U3, U10, U5; bit 4 = UNLOCK'],
  ['refresh_sharc_registers', 72, 'Lock bits into sharc_out+25/27/29/31; pick Data/Clock Flow Control defaults for AES or analog; flag a run/stop when A/D mode changes'],
  ['cs8420lockprocess', 5, 'rsdelay counts 5 passes; then stop/run (reg 4 bit 6) any CS8420 that relocked'],
  ['refresh8420_1…4', 3508, 'Rewrite control registers 1–6, 9, 17 of all four CS8420s: 19 bytes each, bit-banged on RA0/RA1'],
  ['sharc', 1405, 'SPORT1 frame: 17 × 10-bit words (FSYNC RD1, SCLK RD2, data RD3) + 4 bits for the CPLD = aes,0..3'],
  ['read_jumpers', 62, 'Strobe the 74165 inside the CPLD, clock in DIP 1–8 and the front push-button'],
  ['process_jumpers', 79, 'DIP 5/6 → cald / cala; each channel gets the digital or analog cal index in sharc_out'],
];
const LOOP_CYC = PSTEPS.reduce((a,s)=>a+s[1],0);
const SEG_LBL = [14,12,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-10,-12,-16,-20,-26,-32,-38];   // vms44_vu_data.dat comments, top-down (MM5450 bits 1–28)
const SEG_ST  = [0,13,17,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,61,65,73,85,97,109,121];
const OLD_LBL = [-34,-28,-22,-19,-16,-13,-10,-7,-5,-3,-1,0,1,2,3,6,9,12];                             // SMSSLKS.CDR scale, left to right
const REL = {in:'in phase (L = R)', anti:'out of phase (R = −L)', left:'left only', quad:'90° apart', diff:'different tones'};
const CHIPS = ['U4','U3','U10','U5'];           // init443.asm: CS1 U4 (RA3), CS2 U3 (RE0), CS3 U10 (RE1), CS4 U5 (RE2)
const CSPIN = ['RA3','RE0','RE1','RE2'];

/* ---------------- device state ---------------- */
function defaults(){
  return {
    gen: 'SMS4A', power: true, sel: 0,
    dip: [0,0,0,0,0,0,0,0],     // SW1 positions, 1 = "up". dip5 (index 4) digital cal, dip6 (index 5) analog cal
    inp: [
      {ana:{on0:true, dbu:4},   aes:{on0:false, dbfs:-20, fs:48000, port:'75'}, sw:'75', freq:1000, rel:'in',   prog:'steady'},
      {ana:{on0:false, dbu:4},  aes:{on0:true,  dbfs:-20, fs:48000, port:'75'}, sw:'75', freq:400,  rel:'quad', prog:'steady'},
      {ana:{on0:true, dbu:8},   aes:{on0:true,  dbfs:-10, fs:44100, port:'75'}, sw:'75', freq:1000, rel:'diff', prog:'burst'},
      {ana:{on0:true, dbu:0},   aes:{on0:false, dbfs:-20, fs:96000, port:'110'},sw:'110',freq:100,  rel:'anti', prog:'steady'},
    ],
    ev: [],                     // cable events {t,k,what:'aes'|'ana',on}
    log: [], lastTrace: [], camera: false,
  };
}
let D = defaults();

/* ---------------- cables and receivers ---------------- */
function cable(k, what, t){ let on = D.inp[k][what].on0; for (const e of D.ev) if (e.k===k && e.what===what && e.t<=t) on = e.on; return on; }
function lastOn(k, t){ let at = -1; for (const e of D.ev) if (e.k===k && e.what==='aes' && e.t<=t && e.on) at = e.t; return at; }
function fsOK(k){ const f = D.inp[k].aes.fs; return D.gen==='SMS4A' ? (f>=30000 && f<=96000) : (f>=30000 && f<=50000); }
function aesReaches(k){ return D.gen==='SMS4A' ? true : D.inp[k].sw===D.inp[k].aes.port; }
function lockPhys(k, t){
  if (!D.power || !cable(k,'aes',t) || !fsOK(k) || !aesReaches(k)) return false;
  const on = lastOn(k, t); return on < 0 || t - on >= C.T_LOCK;
}

/* ---------------- PIC16F874 main loop over the second (SMS4A) ---------------- */
let SCHED = null, SCHED_KEY = '';
function calIdx(k, aes){ return aes ? (D.dip[4] ? C.CAL.dig18 : C.CAL.dig20) : (D.dip[5] ? C.CAL.ana0 : C.CAL.ana4); }
function schedule(){
  const key = JSON.stringify([D.gen, D.power, D.ev, D.dip, D.inp.map(i=>[i.aes.on0,i.aes.fs,i.sw,i.aes.port])]);
  if (key === SCHED_KEY) return SCHED;
  SCHED_KEY = key; AUDIO_KEY = '';
  SCHED = D.gen==='SMS4A' ? schedA() : schedOld();
  return SCHED;
}
function schedA(){
  const ps = []; let t = 0, i = 0, rsdelay = C.RSCONST;
  const ch = [0,1,2,3].map(k=>{ const L = lockPhys(k,0)?1:0; return {lockRead:L, aes:L, la1:L, la0:0, bc:C.DETECT, bc1:C.DETECT1, a_d:L, rs:0, sel:L, lockBit:L, cal:calIdx(k,L), calSent:calIdx(k,L), reg3:L?0x89:0x8A, reg4:L?0x41:0x45}; });
  const init = ch.map(c=>({...c}));
  let pend = ch.map(c=>c.aes);
  while (t < 1.0005){
    const p = {i, t0:t, ev:[], off:[]}; let cyc = 0;
    p.off.push(cyc); cyc += PSTEPS[0][1];
    ch.forEach((c,k)=>{
      if (c.lockRead){
        if (c.la1){ if (!c.aes) p.ev.push(`IN${k+1}: sig_lock${k+1} → bsf aes,${k} (digital; CPLD switches at the next FSYNC)`); c.aes = 1; c.bc1 = C.DETECT1; c.bc = C.DETECT; }
        else if (--c.bc1 <= 0){ c.bc1 = C.DETECT1; c.bc = C.DETECT; c.la1 = 1; p.ev.push(`IN${k+1}: switch_state${k+1} → bsf lockaes_analog${k+1},1 (lock confirmed)`); }
      } else if (--c.bc <= 0){
        c.bc1 = C.DETECT1; c.bc = C.DETECT; c.la0 ^= 1; c.la1 = 0;
        if (c.aes) p.ev.push(`IN${k+1}: no_lock${k+1} after 8 passes → bcf aes,${k} (back to analog)`);
        c.aes = 0;
      }
    });
    p.off.push(cyc); const tRead = t + (cyc + 100) * TCY; cyc += PSTEPS[1][1];
    ch.forEach((c,k)=>{ const L = lockPhys(k, tRead)?1:0; if (L!==c.lockRead) p.ev.push(`IN${k+1}: ${CHIPS[k]} register 16 bit 4 = ${L?0:1} → lock_8420,${k} = ${L}`); c.lockRead = L; });
    p.off.push(cyc); cyc += PSTEPS[2][1];
    ch.forEach((c,k)=>{
      const was = c.a_d;
      c.lockBit = c.aes ? c.lockRead : 0; c.a_d = c.aes; c.reg3 = c.aes?0x89:0x8A; c.reg4 = c.aes?0x41:0x45;
      if (was !== c.a_d){ c.rs = 1; p.ev.push(`IN${k+1}: a_d,${k} ${was}→${c.a_d}: bsf lock_8420,${k+4} (run/stop needed); cs8420reg3_${k+1}=0x${c.reg3.toString(16).toUpperCase()}`); }
    });
    p.off.push(cyc); let lp = PSTEPS[3][1];
    if (--rsdelay <= 0){ rsdelay = C.RSCONST; lp += 40; p.rs = true;
      ch.forEach((c,k)=>{ if (c.rs){ if (c.lockRead){ c.rs = 0; lp += 1770; p.ev.push(`IN${k+1}: force_runstop_${k+1}: bcf cs8420reg4_${k+1},6 → refresh8420_${k+1} → bsf … ,6 → refresh (SRC restarted)`); (p.runstop = p.runstop||[]).push(k); } } else if (!c.lockRead) c.rs = 1; });
    }
    cyc += lp;
    p.off.push(cyc); cyc += PSTEPS[4][1];
    p.off.push(cyc); p.fsync = t + cyc * TCY;
    ch.forEach((c,k)=>{ if (c.sel !== pend[k]) p.ev.push(`CPLD latch :${[232,227,221,223][k]} at FSYNC → IN${k+1} DR0${k<2?'A':'B'} source = ${pend[k]?'aes_data_in'+(k+1):'a/d_data_in'+(k+1)}`); c.sel = pend[k]; c.calSent = c.cal; });
    cyc += PSTEPS[5][1]; pend = ch.map(c=>c.aes);
    p.off.push(cyc); cyc += PSTEPS[6][1];
    p.off.push(cyc); cyc += PSTEPS[7][1];
    ch.forEach((c,k)=>{ c.cal = calIdx(k, c.aes); });
    p.t1 = t + cyc * TCY; p.rsdelay = rsdelay; p.ch = ch.map(c=>({...c})); p.pend = pend.slice();
    ps.push(p); t = p.t1; i++;
  }
  return {passes: ps, init, loopT: LOOP_CYC*TCY};
}
/* SMS4 (1999): PIC16C73A dig1_check..dig4_check, 5-pass debounce on CS8412 E2..E0 */
function schedOld(){
  const ps = []; let t = 0, i = 0;
  const ch = [0,1,2,3].map(k=>{ const L = lockPhys(k,0)?1:0; return {pin:L, bc:C.OLD_BNCE, e:L?0:7}; });
  const init = ch.map(c=>({...c, sel:c.pin, lockBit:c.pin}));
  while (t < 1.0005){
    const p = {i, t0:t, ev:[], off:[0, 16, 64]};
    ch.forEach((c,k)=>{
      const L = lockPhys(k, t + 20*TCY); c.e = L ? 0 : 7;
      if (L){ if (c.pin) c.bc = C.OLD_BNCE; else if (--c.bc <= 0){ c.pin = 1; c.bc = C.OLD_BNCE; p.ev.push(`IN${k+1}: got_lock${k+1} 5 passes → bsf PORTA,lock${k+1} · bsf PORT${k<2?'B':'C'},ad_${k+1} (4053 → DAC)`); } }
      else { if (!c.pin) c.bc = C.OLD_BNCE; else if (--c.bc <= 0){ c.pin = 0; c.bc = C.OLD_BNCE; p.ev.push(`IN${k+1}: E2..E0 = 111 for 5 passes → bcf lock${k+1}, bcf ad_${k+1} (4053 → analog)`); } }
    });
    p.fsync = t; p.t1 = t + C.OLD_CYC*TCY;
    p.ch = ch.map(c=>({...c, sel:c.pin, lockBit:c.pin, lockRead: c.e===0?1:0}));
    ps.push(p); t = p.t1; i++;
  }
  return {passes: ps, init, loopT: C.OLD_CYC*TCY};
}
function passIdx(t){ const ps = schedule().passes; let lo=0, hi=ps.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; } return lo; }
function passAt(t){ return schedule().passes[passIdx(t)]; }
function stepAt(t){
  const p = passAt(t); if (D.gen!=='SMS4A') return {pass:p, step:-1};
  const c = (t - p.t0)/TCY; let k = 0; p.off.forEach((o,j)=>{ if (c >= o) k = j; }); return {pass:p, step:k};
}
/* what the CPLD / SHARC sees at time t (latched at the last FSYNC) */
function frameState(t){
  const S = schedule(), j = passIdx(t), p = S.passes[j];
  if (t >= p.fsync) return p.ch;
  return j ? S.passes[j-1].ch : S.init;
}
function chState(k, t){ return passAt(t).ch[k]; }

/* ---------------- audio sources and the meter DSP (per sample, cached) ---------------- */
function srcVal(inp, side, t, amp){
  if (inp.prog==='burst'){ const ph = ((t % 0.5) + 0.5) % 0.5; if (ph >= 0.25) return 0; }
  const w = 2*Math.PI*inp.freq*t;
  if (side===0) return amp*Math.sin(w);
  switch (inp.rel){ case 'anti': return -amp*Math.sin(w); case 'left': return 0; case 'quad': return amp*Math.cos(w); case 'diff': return amp*Math.sin(w*1.5); default: return amp*Math.sin(w); }
}
const anaAmp = k => Math.pow(10, (D.inp[k].ana.dbu - C.ANA_FS)/20);
const aesAmp = k => Math.pow(10, D.inp[k].aes.dbfs/20);
/* sample presented to the meter DSP for channel k/side at t (after the CPLD mux, before gain) */
function meterInput(k, side, t, fsState, tSig){
  if (!D.power) return 0;
  if (tSig === undefined) tSig = t;
  const sel = fsState ? fsState[k].sel : frameState(t)[k].sel;
  if (sel) return lockPhys(k,t) ? srcVal(D.inp[k], side, tSig, aesAmp(k)) : 0;          // CS8420 output muted while unlocked (inferred)
  return cable(k,'ana',t) ? srcVal(D.inp[k], side, tSig, anaAmp(k)) : 0;
}
const tblGain = idx => Math.pow(10, (-12 + 0.1*idx)/20);   // point_one_dB_table.dat: entry 0 = −12 dB, 0.1 dB steps
let AUDIO = null, AUDIO_KEY = '';
function audio(){
  schedule();
  const key = SCHED_KEY + JSON.stringify(D.inp);
  if (key === AUDIO_KEY) return AUDIO;
  AUDIO_KEY = key;
  const N = FS + 1, ps = SCHED.passes;
  const vu = new Float32Array(8*N), pp = new Float32Array(8*N), sm = new Float32Array(4*N), df = new Float32Array(4*N), env = new Float32Array(8*N);
  const st = new Float64Array(8*2), ph = new Float64Array(8), ev = new Float64Array(8);
  const aA = Math.exp(-1/(FS*C.OLD_ATT)), aD = Math.exp(-1/(FS*C.OLD_DEC));
  const run = (n0, n1, store)=>{
    let j = 0;
    for (let n = n0; n < n1; n++){
      const t = n/FS;
      let fsS;
      if (store){ while (j+1 < ps.length && ps[j+1].t0 <= t) j++; fsS = t >= ps[j].fsync ? ps[j].ch : (j ? ps[j-1].ch : SCHED.init); }
      else fsS = SCHED.init;
      for (let k=0;k<4;k++){
        const y = [0,0];
        for (let s=0;s<2;s++){
          const x = store ? meterInput(k, s, t, fsS) : meterInput(k, s, 0, fsS, t);
          const c = k*2+s;
          if (D.gen==='SMS4A'){
            const g = C.GAIN3 * tblGain(fsS[k].calSent);
            const v = x*g, P = v*v; y[s] = v;
            const d = P - st[c*2]; st[c*2] += d > 0 ? d*C.TPA : d*C.TPD;   // PPM = max(PPMA, PPMD)
            st[c*2+1] += (P - st[c*2+1]) * C.TVU;                          // VU
          } else {
            const ref = fsS[k].sel ? 10 : Math.pow(10,(C.ANA_FS-4)/20);
            const a = Math.abs(x*ref); ev[c] = a > ev[c] ? a + (ev[c]-a)*aA : ev[c]*aD;
          }
        }
        if (D.gen==='SMS4A'){
          const a = 0.7*y[0], b = 0.7*y[1];
          ph[k*2] = C.PH_A*ph[k*2] + (1-C.PH_A)*Math.abs(a+b); ph[k*2+1] = C.PH_A*ph[k*2+1] + (1-C.PH_A)*Math.abs(a-b);
        }
      }
      if (store){
        for (let c=0;c<8;c++){ pp[c*N+n] = st[c*2]; vu[c*N+n] = st[c*2+1]; env[c*N+n] = ev[c]; }
        for (let k=0;k<4;k++){ sm[k*N+n] = ph[k*2]; df[k*N+n] = ph[k*2+1]; }
      }
    }
  };
  run(-24000, 0, false);      // 0.5 s pre-roll with the t=0 state so the meters start settled
  run(0, N, true);
  AUDIO = {N, vu, pp, sm, df, env};
  return AUDIO;
}
/* meter numbers as the SHARC returns them */
const vOf = P => P > 0 ? Math.max(0, Math.min(255, Math.round(-10*Math.log10(P)*2))) : 255;   // VUMeterGet: −dB×2, clamped 0–255
const readOf = P => P > 0 ? 10*Math.log10(P) + 20 : -99;                                        // meter scale units (0 = 0 VU)
function phaseV(sum, dif){ const s = sum+dif; const y = s < C.PH_THR ? 0 : Math.max(-1, Math.min(1, (sum-dif)/s)); return Math.trunc(128*y + 128); }
function phaseLit(v){ return v < 51 ? 5 : v < 102 ? 4 : v < 154 ? 3 : v < 205 ? 2 : 1; }
function segIdx(v){ if (v >= 121) return -1; let j = 0; while (j < 27 && v >= SEG_ST[j+1]) j++; return j; }
function barBits(vV, vP){ const a = new Array(28).fill(0); const j = segIdx(vV); if (j >= 0) for (let i=j;i<28;i++) a[i] = 1; const q = segIdx(Math.min(261, vP + 6)); if (q >= 0) a[q] = 1; return a; }
function sampleOf(t){ return Math.max(0, Math.min(FS, Math.floor(t*FS))); }
/* MM5450 mux: mux_ctl at sample 300·n (n ≥ 1); odd slots = right row (BIT31 set), even = left; latched after 36 clocks = 72 samples */
function slotFor(row, s){
  let n = Math.floor((s - 72)/C.MUX); if (n < 1) n = row==='R' ? 1 : 2;
  if ((n % 2 === 1) !== (row === 'R')) n -= 1; if (n < 1) n += 2;
  return n;
}
function activeRow(s){ const n = Math.floor((s - 72)/C.MUX); return n < 1 ? 'R' : (n % 2 ? 'R' : 'L'); }
function display(t){
  const out = {bars:[], peaks:[], lock:[0,0,0,0], corr:[0,0,0,0], corrV:[128,128,128,128], read:[], v:[], pwr: D.power?1:0, rowOn:{L:1,R:1}};
  if (!D.power){ for (let c=0;c<8;c++){ out.bars.push(new Array(28).fill(0)); out.read.push(-99); out.v.push([255,255]); } return out; }
  const A = audio(), s = sampleOf(t);
  if (D.gen === 'SMS4A'){
    const act = activeRow(s);
    if (D.camera){ out.rowOn = {L: act==='L'?1:0, R: act==='R'?1:0}; }
    for (let k=0;k<4;k++){
      for (let side=0; side<2; side++){
        const row = side ? 'R' : 'L', n = slotFor(row, s), ss = Math.min(A.N-1, n*C.MUX), c = k*2+side;
        const vV = vOf(A.vu[c*A.N+ss]), vP = vOf(A.pp[c*A.N+ss]);
        out.bars.push(out.rowOn[row] ? barBits(vV, vP) : new Array(28).fill(0)); out.v.push([vV, vP]);
        out.read.push(readOf(A.vu[c*A.N+ss]));
      }
      const row = k % 2 ? 'R' : 'L', n = slotFor(row, s), ss = Math.min(A.N-1, n*C.MUX), tt = ss/FS;
      const pv = phaseV(A.sm[k*A.N+ss], A.df[k*A.N+ss]);
      out.corrV[k] = pv; out.corr[k] = out.rowOn[row] ? phaseLit(pv) : 0;
      out.lock[k] = out.rowOn[row] ? frameState(tt)[k].lockBit : 0;
    }
  } else {
    for (let k=0;k<4;k++){
      for (let side=0; side<2; side++){
        const e = A.env[(k*2+side)*A.N + s], r = e > 0 ? 20*Math.log10(e) : -99;
        out.bars.push(OLD_LBL.map(l => r >= l ? 1 : 0)); out.read.push(r); out.v.push([0,0]);
      }
      out.lock[k] = chState(k, t).pin;
    }
  }
  return out;
}

/* ---------------- what the PIC sends the SHARC: sharc_out[34] ---------------- */
function sharcOut(t){
  const f = frameState(t), b = new Array(34).fill(0);
  const ord = [[0,0],[1,0],[0,1],[1,1],[2,0],[3,0],[2,1],[3,1]];   // words 0–7 = input_cal_fix (L1),(L2),(R1),(R2),(L3),(L4),(R3),(R4)
  ord.forEach(([k],w)=>{ b[2*w] = 0x02; b[2*w+1] = f[k].calSent; });
  for (let k=0;k<4;k++){ b[17+2*k] = 0x00; b[25+2*k] = f[k].lockBit<<1; }
  return b;
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  D.lastTrace = []; const tr = s => D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({t: SIM.t, name, trace: D.lastTrace.slice()}); if (D.log.length > 60) D.log.length = 60;
  SIM.refresh();
}
function afterEvent(k, tr, t0){
  const S = schedule(); let aesAt = null, selAt = null, ledAt = null;
  const p0 = passIdx(t0), wasAes = chState(k,t0).aes, wasSel = frameState(t0)[k].sel;
  for (let j = p0; j < S.passes.length; j++){ const p = S.passes[j];
    if (aesAt===null && p.ch[k].aes !== wasAes) aesAt = p;
    if (selAt===null && p.ch[k].sel !== wasSel) selAt = p;
    if (ledAt===null && p.ch[k].lockBit !== frameState(t0)[k].lockBit) ledAt = p; }
  if (D.gen === 'SMS4A'){
    if (aesAt) tr(`autodetect${k+1} changes aes,${k} on pass #${aesAt.i} at ${SIM.fmtT(aesAt.t0)} (+${SIM.fmtDur(aesAt.t0 - t0)})`);
    if (selAt) tr(`The CPLD latches the new source at the next frame's FSYNC (pass #${selAt.i}) → ${SIM.fmtT(selAt.fsync)} (+${SIM.fmtDur(selAt.fsync - t0)}); the meter sees ${selAt.ch[k].sel?'the CS8420 (AES)':'the CS5333 A/D'} from there`);
    if (ledAt) tr(`sharc_out+${25+2*k} bit 1 (lock) = ${ledAt.ch[k].lockBit} from pass #${ledAt.i}; the SHARC shows it on the next ${k%2?'right':'left'} mux slot (≤ 12.5 ms)`);
    if (!aesAt && !selAt) tr('No source change follows before the end of the simulated second.');
  } else {
    const p = S.passes.find((q,j)=> j>=p0 && q.ch[k].pin !== chState(k,t0).pin);
    tr(p ? `dig${k+1}_check flips PORTA,lock${k+1} and ad_${k+1} on pass #${p.i} at ${SIM.fmtT(p.t0)} (+${SIM.fmtDur(p.t0-t0)}, 5 passes of bnce_cnt${k+1})` : 'No change within the simulated second.');
  }
}
const A = {
  aes(k){ const t = SIM.t, on = !cable(k,'aes',t);
    act(`${on?'Connect':'Disconnect'} AES to INPUT ${k+1}`, tr=>{
      D.ev.push({t, k, what:'aes', on}); D.ev.sort((a,b)=>a.t-b.t); SCHED_KEY = '';
      if (D.gen === 'SMS4A'){
        tr(`${CHIPS[k]} CS8420 ${on ? `starts to lock to ${D.inp[k].aes.fs/1000} kHz (≈${C.T_LOCK*1e3} ms, ${inf})` : 'loses lock at once'}`);
        if (on && !fsOK(k)) tr(`${D.inp[k].aes.fs/1000} kHz is outside the CS8420 range in the manual (30–96 kHz): register 16 bit 4 stays 1`);
        tr(`read8420s: chip select ${CSPIN[k]} low, write 0x20 + map 16, read 0x21 → shiftin → temp2 bit 4 (UNLOCK)`);
        tr(on ? `autodetect${k+1}: sig_lock${k+1} → switch_state${k+1}: bcount1${k?k+1:''} counts detect_count1 = 2 passes → bsf lockaes_analog${k+1},1 → next pass bsf aes,${k}`
              : `autodetect${k+1}: no_lock${k+1}: bcount${k?k+1:''} counts detect_count = 8 passes → xorwf lockaes_analog${k+1} · bcf aes,${k}`);
      } else {
        tr(`CS8412 ${on?'locks':'unlocks'}: E2..E0 ${on?'= 000 (or any code ≠ 111)':'= 111'} on PORT${k<2?'B':'C'}`);
        if (on && !aesReaches(k)) tr(`The 110/75 Ω switch for INPUT ${k+1} is on ${D.inp[k].sw} Ω but the cable is on the ${D.inp[k].aes.port} Ω connector: no signal reaches the CS8412`);
        if (on && !fsOK(k)) tr(`${D.inp[k].aes.fs/1000} kHz is outside the 1999|32 manual's 30–50 kHz range: no lock`);
      }
      afterEvent(k, tr, t);
    }); },
  ana(k){ const t = SIM.t, on = !cable(k,'ana',t);
    act(`${on?'Connect':'Disconnect'} analog to INPUT ${k+1}`, tr=>{
      D.ev.push({t, k, what:'ana', on}); D.ev.sort((a,b)=>a.t-b.t); SCHED_KEY = '';
      const dig = (D.gen==='SMS4A' ? frameState(t)[k].sel : chState(k,t).pin);
      tr(`Analog ${on?'appears':'removed'} on the ${D.gen==='SMS4A'?'CS5333 A/D (via NE5532)':'LF353 input stage'}`);
      tr(dig ? 'This input is in AES mode: the digital signal overrides, so the meter does not change (manual)' : 'This input is in analog mode: the meter follows at once — there is no detection for analog audio');
    }); },
  dip(n){ act(`DIP switch ${n+1} → ${D.dip[n]?'down':'up'}`, tr=>{
      D.dip[n] ^= 1; SCHED_KEY = '';
      tr(`read_jumpers: strobe RC4 (CPLD pin 10, 74165 load), 9 clocks on RC3 → jumper0 bit ${n} = ${D.dip[n]}`);
      if (n===4) tr(`process_jumpers: btfsc jumper0,4 → ${D.dip[4]?'level_18dbfs: cald = dig_18dbfs = 101':'level_20dbfs: cald = dig_20dbfs = 121'} → sharc_out odd bytes of AES channels; SHARC input_gain looks up point_one_db_table → ${D.dip[4]?'−1.9':'+0.1'} dB`);
      else if (n===5) tr(`process_jumpers: btfsc jumper0,5 → ${D.dip[5]?'level_0db: cala = anal_0db = 113':'level_4db: cala = anal_4db = 73'} → ${D.dip[5]?'−0.7':'−4.7'} dB on analog channels`);
      else tr(`process_jumpers never tests jumper0 bit ${n}: ${n<4?'"a/d '+(n+1)+'" (manual: reserved)':'"v'+(n-6)+'"'} — no effect`);
    }); },
  setInp(k, path, val){ act(`INPUT ${k+1}: ${path} = ${val}`, tr=>{
      const [a,b] = path.split('.'); if (b) D.inp[k][a][b] = val; else D.inp[k][a] = val; SCHED_KEY = '';
      if (path==='aes.fs') tr(D.gen==='SMS4A' ? `CS8420 sample-rate converter re-times ${val/1000} kHz to the board's 48 kHz (PLL1700E from 27 MHz)` : `CS8412 + CS4330 DAC: the 1999|32 manual allows 30–50 kHz`);
      else tr('Test-signal change (applies to the whole simulated second).');
    }); },
  sw(k){ act(`INPUT ${k+1} 110/75 Ω switch`, tr=>{ D.inp[k].sw = D.inp[k].sw==='75'?'110':'75'; SCHED_KEY=''; tr(`SW100-style SPDT selects the ${D.inp[k].sw} Ω AES input (SMS4.DSN: SW SPDT, transformer T1 for 110 Ω)`); }); },
  port(k){ act(`INPUT ${k+1}: move AES cable`, tr=>{ D.inp[k].aes.port = D.inp[k].aes.port==='75'?'110':'75'; SCHED_KEY=''; tr(`AES cable now on the ${D.inp[k].aes.port==='75'?'BNC (75 Ω)':'screw terminal (110 Ω)'}`); }); },
  gen(g){ act(`Show the ${g==='SMS4A'?'2003|36 SMS4A':'1999|32 SMS4'}`, tr=>{ D.gen = g; SCHED_KEY=''; tr(g==='SMS4A'?'PIC16F874 + CPLD + SHARC (VMS44-3 board), 28-segment meters':'PIC16C73A lock detector + analog LED drivers, 18-segment meters (real SMSSLKS silkscreen)'); }); SIM.openTab(location.hash.slice(1) || 'sim'); },
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power = !D.power; SCHED_KEY='';
      if (D.power) (D.gen==='SMS4A' ? ['INIT: ports, TRIS, CS lines high, reset8420/resetsharc/reset_adc low, Altera power on (RA4=0)',`pdelay1 (5×255×256 loops ≈ ${(1305600*TCY).toFixed(2)} s), defaults, UART, pdelay (${(261120*TCY).toFixed(2)} s)`,'release CS8420 + SHARC reset, pdelay2, release ADC reset → PRE_MAIN: refresh8420_1…4 → MAIN','See "One second" → Power-up for the timeline'] : ['init: ADCON1 digital, TRIS, lock1..4 and ad_1..4 high (v102) → all LOCK LEDs on until the debounce clears them']).forEach(tr);
      else tr('All LEDs off.'); }); },
  camera(){ D.camera = !D.camera; SIM.refresh(); },
  clearEv(){ D.ev = []; SCHED_KEY = ''; SIM.refresh(); },
  reset(){ const g = D.gen; D = defaults(); D.gen = g; SCHED_KEY = ''; SIM.refresh(); },
};

/* ================================================================
   PANELS
   SMS4A: drawn to scale from SMS4A-FRONT.dwg / SMS4-REAR.dwg (17.100 × 1.648 in, 100 units per inch).
     Front: four 3.430 × 0.500 windows (x 0.662/4.777/8.892/13.007, 0.574 from top) and five 0.100 holes
     (x 0.320/4.435/8.550/12.665/16.780, 0.699 from top). "WBS BLACK. SILKSCREEN TO ARTWORK" — the
     SMS4A artwork is not in the archive, so all legends and the LED layout inside the windows are inferred.
     Rear: BNC D-holes (A) at x 7.350…16.350, terminal-block cutouts (C) 1.600 wide at 6.075…15.075,
     0.281 holes (D), IEC (B), stud (G), 7 vent slots (F).
   SMS4 (1999|32): real silkscreen SMSSLKS.CDR (Inkscape), 200 px/in; LEDs and connectors on its drill crosshairs.
   ================================================================ */
const LEDC = {g:'#45d65e', a:'#ffb43a', r:'#ff4a3a'};
const segCol = lbl => lbl >= 9 ? LEDC.r : lbl >= 1 ? LEDC.a : LEDC.g;   // colours INFERRED
function frontA(t){
  const d = display(t);
  const win = [66.2, 477.7, 889.2, 1300.7], hole = [32, 443.5, 855, 1266.5, 1678];
  let s = `<svg viewBox="0 0 1710 164.8" role="img" aria-label="SMS4A front panel, drawn to scale from SMS4A-FRONT.dwg" style="width:100%;display:block;border-radius:6px">
    <defs><filter id="smsg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1710" height="164.8" rx="3" fill="#141516"/>
    <text x="40" y="24" font-size="11" fill="#d9d9d4" font-weight="700" letter-spacing="1">WARD-BECK SYSTEMS</text>
    <text x="1670" y="24" font-size="11" fill="#d9d9d4" font-weight="700" text-anchor="end" letter-spacing="1">SMS4A STEREO METER SYSTEM</text>`;
  win.forEach((x0,k)=>{
    const hot = D.sel===k;
    s += `<g class="smsWin" data-k="${k}" style="cursor:pointer"><text x="${x0+171.5}" y="48" font-size="10" fill="#d9d9d4" text-anchor="middle">INPUT ${k+1}</text>
      <rect x="${x0}" y="57.4" width="343" height="50" rx="2" fill="#050606" stroke="${hot?'var(--accent)':'#333'}" stroke-width="${hot?2:1}"/>
      <text x="${x0+5}" y="72" font-size="7.5" fill="#888">L</text><text x="${x0+5}" y="88" font-size="7.5" fill="#888">R</text>`;
    for (let side=0; side<2; side++){
      const bits = d.bars[k*2+side], y = side ? 81 : 65;
      for (let i=0;i<28;i++){ const top = 27 - i, on = bits[top], lbl = SEG_LBL[top];
        s += `<rect x="${x0+14+i*10}" y="${y}" width="7.4" height="8" rx="1" fill="${on?segCol(lbl):'#1a201b'}" ${on?'filter="url(#smsg)"':''}/>`; }
    }
    for (let i=0;i<5;i++){ const on = i < d.corr[k];
      s += `<rect x="${x0+300+i*8}" y="69" width="6" height="16" rx="1" fill="${on?(i>=3?LEDC.r:i>=1?LEDC.a:LEDC.g):'#1a201b'}" ${on?'filter="url(#smsg)"':''}/>`; }
    s += `<text x="${x0+319}" y="100" font-size="6.5" fill="#888" text-anchor="middle">CORR</text>`;
    [-38,-20,-10,0,6,14].forEach(l=>{ const top = SEG_LBL.indexOf(l), i = 27-top; s += `<text x="${x0+17.7+i*10}" y="118" font-size="7" fill="#c9c9c4" text-anchor="middle">${l>0?'+'+l:l}</text>`; });
    s += `</g>`;
  });
  hole.forEach((x,j)=>{ const on = j<4 ? d.lock[j] : d.pwr, col = j<4 ? LEDC.g : '#ffe680';
    s += `<circle cx="${x}" cy="69.9" r="5" fill="#000"/><circle cx="${x}" cy="69.9" r="3.6" fill="${on?col:'#20261f'}" ${on?'filter="url(#smsg)"':''}/>
      <text x="${x}" y="88" font-size="7" fill="#c9c9c4" text-anchor="middle">${j<4?'AES':'PWR'}</text>`; });
  s += `<text x="855" y="150" font-size="9" fill="#d9d9d4" text-anchor="middle" letter-spacing="2">SELECT SERIES</text></svg>`;
  return s;
}
function rearA(t){
  const order = [3,2,1,0];   // INPUT 4 … 1 left to right, as on the 1999 rear silk (inferred for the SMS4A)
  let s = `<svg viewBox="0 0 1710 164.8" role="img" aria-label="SMS4A rear panel, drawn to scale from SMS4-REAR.dwg" style="width:100%;display:block;border-radius:6px">
    <rect width="1710" height="164.8" rx="3" fill="#161718"/>
    <g class="smsPwr" style="cursor:pointer"><rect x="42" y="27" width="84" height="110" rx="5" fill="#0b0c0c" stroke="#3a3d40"/><rect x="58" y="40" width="52" height="38" rx="4" fill="#202326"/>
      ${[70,84,98].map(x=>`<rect x="${x-2}" y="50" width="4" height="12" fill="#888"/>`).join('')}<rect x="56" y="92" width="56" height="32" rx="3" fill="#202326"/><text x="84" y="112" font-size="8" fill="#aaa" text-anchor="middle">FUSE</text>
      <title>IEC inlet + fuse (hole B). Click to switch power ${D.power?'off':'on'}</title></g>
    <circle cx="188" cy="82.4" r="6.8" fill="#888" stroke="#444"/><text x="188" y="104" font-size="7" fill="#999" text-anchor="middle">⏚</text>
    ${[0,1,2,3,4,5,6].map(i=>`<rect x="${300.4+i*25}" y="37" width="9.3" height="91" rx="4.6" fill="#050505"/>`).join('')}`;
  order.forEach((k,j)=>{
    const cx = 607.5 + 300*j, bx = 735 + 300*j, t0 = t, aOn = cable(k,'aes',t0), nOn = cable(k,'ana',t0);
    s += `<text x="${cx+60}" y="16" font-size="9" fill="#d0d0cc" text-anchor="middle">INPUT ${k+1}</text>
      <g class="smsAna" data-k="${k}" style="cursor:pointer"><rect x="${cx-80}" y="88.3" width="160" height="29.5" fill="#0a0a0a"/>
      ${['L+','L−','⏚','R+','R−','⏚'].map((p,i)=>`<rect x="${cx-72+i*24.5}" y="91" width="20" height="24" rx="2" fill="${nOn?'#2b8a4a':'#1d5f33'}"/><text x="${cx-62+i*24.5}" y="84" font-size="6.5" fill="#bbb" text-anchor="middle">${p}</text>`).join('')}
      <circle cx="${cx-92.5}" cy="102.9" r="5" fill="#333"/><circle cx="${cx+92.5}" cy="102.9" r="5" fill="#333"/>
      ${nOn?`<rect x="${cx-74}" y="113" width="148" height="20" rx="3" fill="#2a5fa0" opacity=".9"/>`:''}
      <title>Analog stereo (pluggable screw terminal, cutout C). Click to ${nOn?'unplug':'plug in'}</title></g>
      <g class="smsAes" data-k="${k}" style="cursor:pointer"><circle cx="${bx}" cy="47.7" r="18.8" fill="#a48a3a" stroke="#5e4d1c" stroke-width="2"/><circle cx="${bx}" cy="47.7" r="11" fill="#dcc781"/><circle cx="${bx}" cy="47.7" r="3.6" fill="#6a5210"/>
        ${aOn?`<rect x="${bx-9}" y="18" width="18" height="18" rx="3" fill="#2a5fa0"/>`:''}<text x="${bx+28}" y="44" font-size="8" fill="#ccc">AES</text><text x="${bx+28}" y="54" font-size="7" fill="#999">75 Ω</text>
        <title>AES/EBU 75 Ω BNC (hole A). Click to ${aOn?'unplug':'plug in'}</title></g>
      <circle cx="${bx}" cy="122.7" r="14" fill="#060606" stroke="#2a2a2a"><title>0.281 dia. hole (D) — purpose not stated in the drawing</title></circle>`;
  });
  return s + `<text x="250" y="150" font-size="7.5" fill="#aaa">90–230 VAC 50/60 Hz (manual)</text></svg>`;
}
const OF = {L:151.7, R:190.5, lockY:170.6, x0:239.3, pitch:32, step:800.6, lockX:847.4, pwr:[3313.8,250.3]};   // drill points from SMSSLKS.CDR
function frontOld(t){
  const d = display(t);
  let s = `<svg viewBox="0 0 3423 332" role="img" aria-label="SMS-4 (1999|32) front panel on its real silkscreen" style="width:100%;display:block;border-radius:6px">
    <defs><filter id="smso" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="3423" height="332" rx="6" fill="#141516"/><image href="${ASSET}sms-sms4-front-ink.png" width="3423" height="332"/>`;
  for (let k=0;k<4;k++){
    s += `<g class="smsWin" data-k="${k}" style="cursor:pointer"><rect x="${OF.x0-20+OF.step*k}" y="130" width="${18*OF.pitch+8}" height="82" fill="transparent" stroke="${D.sel===k?'var(--accent)':'none'}" stroke-width="3" rx="6"/>`;
    [OF.L, OF.R].forEach((y,side)=>{ const bits = d.bars[k*2+side];
      for (let i=0;i<18;i++){ const on = bits[i], x = OF.x0 + OF.step*k + OF.pitch*i, col = OLD_LBL[i] >= 3 ? LEDC.r : OLD_LBL[i] >= 0 ? LEDC.a : LEDC.g;
        s += `<circle cx="${x}" cy="${y}" r="11" fill="#060606"/><circle cx="${x}" cy="${y}" r="8" fill="${on?col:'#1c241d'}" ${on?'filter="url(#smso)"':''}/>`; } });
    const lx = OF.lockX + OF.step*k, on = d.lock[k];
    s += `<circle cx="${lx}" cy="${OF.lockY}" r="11" fill="#060606"/><circle cx="${lx}" cy="${OF.lockY}" r="8" fill="${on?LEDC.a:'#2a2416'}" ${on?'filter="url(#smso)"':''}/></g>`;
  }
  s += `<circle cx="${OF.pwr[0]}" cy="${OF.pwr[1]}" r="8" fill="${d.pwr?'#ffe680':'#2a2a1a'}" ${d.pwr?'filter="url(#smso)"':''}/></svg>`;
  return s;
}
function rearOld(t){
  let s = `<svg viewBox="0 0 3423 336" role="img" aria-label="SMS-4 (1999|32) rear panel on its real silkscreen" style="width:100%;display:block;border-radius:6px">
    <rect width="3423" height="336" rx="6" fill="#161718"/>
    <g class="smsPwr" style="cursor:pointer"><rect x="35" y="17" width="269" height="140" rx="8" fill="#0b0c0c" stroke="#3a3d40"/><rect x="80" y="40" width="180" height="90" rx="8" fill="#202326"/>
      ${[130,170,150].map((x,i)=>`<rect x="${x-4}" y="${i==2?95:60}" width="8" height="22" fill="#888"/>`).join('')}
      <rect x="45" y="180" width="250" height="135" rx="8" fill="#0b0c0c" stroke="#3a3d40"/><title>IEC inlet + fuse. Click to switch power</title></g>
    <image href="${ASSET}sms-sms4-rear-ink.png" width="3423" height="336"/>`;
  for (let j=0;j<4;j++){
    const k = 3-j, bx = 1471.4 + 600*j, tb = 1080 + 600*j, aOn = cable(k,'aes',t), nOn = cable(k,'ana',t), inp = D.inp[k];
    s += `<g class="smsAna" data-k="${k}" style="cursor:pointer">${[0,1,2,3,4,5].map(i=>`<rect x="${tb-14+i*33.75}" y="185" width="28" height="40" rx="3" fill="${nOn?'#2b8a4a':'#1d5f33'}"/>`).join('')}
        ${nOn?`<rect x="${tb-16}" y="222" width="200" height="34" rx="5" fill="#2a5fa0"/>`:''}<title>Analog L/R (+ − G). Click to ${nOn?'unplug':'plug in'}</title></g>
      <g class="smsPort" data-k="${k}" style="cursor:pointer">${[6,7,8].map(i=>`<rect x="${tb-14+i*33.75}" y="185" width="28" height="40" rx="3" fill="${aOn&&inp.aes.port==='110'?'#3aa060':'#1d5f33'}"/>`).join('')}
        ${aOn&&inp.aes.port==='110'?`<rect x="${tb+186}" y="222" width="100" height="34" rx="5" fill="#a04a2a"/>`:''}<title>AES 110 Ω (+ − G). Click to move the AES cable between BNC and terminal</title></g>
      <g class="smsAes" data-k="${k}" style="cursor:pointer"><circle cx="${bx}" cy="97.7" r="44" fill="#a48a3a" stroke="#5e4d1c" stroke-width="4"/><circle cx="${bx}" cy="97.7" r="26" fill="#dcc781"/><circle cx="${bx}" cy="97.7" r="9" fill="#6a5210"/>
        ${aOn&&inp.aes.port==='75'?`<rect x="${bx-20}" y="30" width="40" height="40" rx="6" fill="#2a5fa0"/>`:''}<title>AES 75 Ω BNC. Click to ${aOn?'unplug':'plug in'} the AES cable</title></g>
      <g class="smsSw" data-k="${k}" style="cursor:pointer"><rect x="${bx-38}" y="176" width="22" height="34" rx="3" fill="#0a0a0a" stroke="#555"/><rect x="${bx-35}" y="${inp.sw==='110'?179:194}" width="16" height="13" rx="2" fill="#ccc"/><title>110 / 75 Ω select (now ${inp.sw} Ω). Click to flip</title></g>
      <circle cx="${bx}" cy="248" r="13" fill="#888"/>`;
  }
  return s + '</svg>';
}
function frontSVG(t){ return D.gen==='SMS4A' ? frontA(t) : frontOld(t); }
function rearSVG(t){ return D.gen==='SMS4A' ? rearA(t) : rearOld(t); }
function bindPanel(root){
  root.querySelectorAll('.smsAes').forEach(g=>g.addEventListener('click', ()=>A.aes(+g.dataset.k)));
  root.querySelectorAll('.smsAna').forEach(g=>g.addEventListener('click', ()=>A.ana(+g.dataset.k)));
  root.querySelectorAll('.smsSw').forEach(g=>g.addEventListener('click', ()=>A.sw(+g.dataset.k)));
  root.querySelectorAll('.smsPort').forEach(g=>g.addEventListener('click', ()=>A.port(+g.dataset.k)));
  root.querySelectorAll('.smsWin').forEach(g=>g.addEventListener('click', ()=>{ D.sel = +g.dataset.k; SIM.refresh(); }));
  root.querySelectorAll('.smsPwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
}
document.addEventListener('keydown', e=>{
  if (!window.__smsActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const m = {'1':()=>A.aes(0),'2':()=>A.aes(1),'3':()=>A.aes(2),'4':()=>A.aes(3),q:()=>A.ana(0),w:()=>A.ana(1),e:()=>A.ana(2),r:()=>A.ana(3),c:()=>A.camera()};
  const f = m[e.key.toLowerCase()]; if (f){ f(); e.preventDefault(); }
});

/* ---------------- controls ---------------- */
function controlsHTML(){
  const fsOpts = [32000,44100,48000,88200,96000];
  return `<div class="scroll"><table class="kv small" id="smsCtl"><tr><th>Input</th><th>Analog</th><th>dBu</th><th>AES</th><th>dBFS</th><th>AES rate</th><th>Tone Hz</th><th>L/R</th><th>Program</th></tr>
    ${D.inp.map((p,k)=>`<tr><td>IN ${k+1}</td><td><input type="checkbox" data-c="ana" data-k="${k}"></td>
      <td><input type="number" style="width:60px" step="1" min="-40" max="24" value="${p.ana.dbu}" data-c="ana.dbu" data-k="${k}"></td>
      <td><input type="checkbox" data-c="aes" data-k="${k}"></td>
      <td><input type="number" style="width:60px" step="1" min="-60" max="0" value="${p.aes.dbfs}" data-c="aes.dbfs" data-k="${k}"></td>
      <td><select data-c="aes.fs" data-k="${k}">${fsOpts.map(f=>`<option value="${f}" ${f===p.aes.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></td>
      <td><select data-c="freq" data-k="${k}">${[100,400,1000,5000].map(f=>`<option ${f===p.freq?'selected':''}>${f}</option>`).join('')}</select></td>
      <td><select data-c="rel" data-k="${k}">${Object.keys(REL).map(r=>`<option value="${r}" ${r===p.rel?'selected':''}>${REL[r]}</option>`).join('')}</select></td>
      <td><select data-c="prog" data-k="${k}"><option value="steady" ${p.prog==='steady'?'selected':''}>steady tone</option><option value="burst" ${p.prog==='burst'?'selected':''}>250 ms bursts</option></select></td></tr>`).join('')}
    </table></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center">
      <span class="small muted">Model:</span><button data-g="SMS4A">SMS4A (2003|36)</button><button data-g="SMS4">SMS4 (1999|32)</button>
      <button id="smsCam" title="Key C">Fast-camera view of the L/R multiplex</button><button id="smsClr">Clear cable events</button><button id="smsRst">Defaults</button>
    </div>
    <div class="small muted" style="margin-top:4px">Click a BNC or terminal block on the rear to plug or unplug at the playhead (keys 1–4 = AES, Q W E R = analog). The change is an event at that moment of the second: scrub forward to watch the firmware react. Click a meter window to pick the input the inspector follows.</div>`;
}
function bindControls(root){
  root.querySelectorAll('#smsCtl [data-c]').forEach(el=>{
    const k = +el.dataset.k, c = el.dataset.c;
    el.onchange = ()=>{
      if (c==='ana') A.ana(k); else if (c==='aes') A.aes(k);
      else A.setInp(k, c, el.tagName==='SELECT' && c!=='rel' && c!=='prog' ? +el.value : (el.type==='number' ? +el.value : el.value));
    };
  });
  root.querySelectorAll('[data-g]').forEach(b=> b.onclick = ()=>A.gen(b.dataset.g));
  const cam = root.querySelector('#smsCam'); if (cam) cam.onclick = ()=>A.camera();
  const clr = root.querySelector('#smsClr'); if (clr) clr.onclick = ()=>A.clearEv();
  const rst = root.querySelector('#smsRst'); if (rst) rst.onclick = ()=>A.reset();
}
function syncControls(root){
  root.querySelectorAll('#smsCtl input[type=checkbox]').forEach(el=>{ el.checked = cable(+el.dataset.k, el.dataset.c, SIM.t); });
  root.querySelectorAll('[data-g]').forEach(b=> b.classList.toggle('on', b.dataset.g===D.gen));
  const cam = root.querySelector('#smsCam'); if (cam) cam.classList.toggle('on', D.camera);
}
function dipHTML(){
  const lbl = ['a/d 1','a/d 2','a/d 3','a/d 4','digital cal','analog cal','v0','v1'];
  return `<div style="display:flex;gap:6px;flex-wrap:wrap">${D.dip.map((v,i)=>`<button data-dip="${i}" class="${v?'on':''}" title="${lbl[i]}" style="width:74px;line-height:1.2">${i+1}<br><span class="small">${v?'▲ up':'▼ down'}</span><br><span class="small muted">${lbl[i]}</span></button>`).join('')}</div>
   <p class="small muted">SW1 on the VMS44-3 board, read through the CPLD's 74165 (read_jumpers). Labels are the code's comments. The manual calls the two calibration switches SW3 (analog: up = 0 dBu, down = +4 dBu) and SW4 (digital: up = −18 dBFS, down = −20 dBFS); the code reads them as positions 6 and 5.</p>`;
}
function bindDip(root){ root.querySelectorAll('[data-dip]').forEach(b=> b.onclick = ()=>A.dip(+b.dataset.dip)); }

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css = SIM.css, S = schedule(), k = D.sel, ls = [];
  if (D.gen === 'SMS4A'){
    ls.push({label:'Sample clock fs = 48 kHz (CPLD lrclock)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/FS,0,0.5/FS,css('--accent2'),'samples'); }});
    ls.push({label:'SHARC sport0_isr: VUMeterCalc · PhaseMeterCalc', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/FS,0.02/FS,0.25/FS,css('--accent'),'ISR'); }});
    ls.push({label:'mux_ctl + MM5450 shift (36 clk)', h:26, draw(c,X,t0,t1,y,h){
      const P = C.MUX/FS, n0 = Math.max(1, Math.floor(t0/P)), n1 = Math.ceil(t1/P), px = X(t0+P)-X(t0);
      if (px < 3){ c.fillStyle = css('--ink'); c.font = '11px '+css('--mono'); c.fillText(`${n1-n0} mux slots (every ${SIM.fmtDur(P)}), each followed by a 36-clock shift of ${SIM.fmtDur(72/FS)}`, X(t0)+6, y+h/2+4); return; }
      for (let n=n0;n<=n1;n++){ const a = n*P; c.fillStyle = n%2 ? css('--bad') : css('--accent'); c.globalAlpha = .75; c.fillRect(X(a), y+4, Math.max(1.5, X(a+72/FS)-X(a)), h-8); c.globalAlpha = 1;
        if (px > 60){ c.fillStyle = css('--ink'); c.font = '10px sans-serif'; c.fillText(n%2?'R data':'L data', X(a)+3, y+h-6); } }
    }});
    ls.push({label:'LED row lit (FLG8 L / FLG9 R)', h:22, draw(c,X,t0,t1,y,h){
      const P = C.MUX/FS, n0 = Math.max(0, Math.floor(t0/P)-1), n1 = Math.ceil(t1/P);
      for (let n=n0;n<=n1;n++){ const a = n*P + 72/FS; const row = n < 1 ? 'R' : (n%2 ? 'R' : 'L'); c.fillStyle = row==='R'? css('--bad') : css('--accent'); c.globalAlpha = .35; c.fillRect(X(a), y+4, X(a+P)-X(a), h-8); c.globalAlpha = 1; }
      if (X(t0+P)-X(t0) > 30){ c.fillStyle = css('--ink'); c.font='10px sans-serif'; c.fillText('green = left row, red = right row (80 Hz frame)', X(t0)+6, y+h/2+4); }
    }});
  }
  ls.push({label: D.gen==='SMS4A' ? `PIC16F874 main loop (${SIM.fmtDur(S.loopT)} per pass)` : `PIC16C73A loop (${SIM.fmtDur(S.loopT)})`, h:34, draw(c,X,t0,t1,y,h){
    const ps = S.passes, px = X(t0+S.loopT)-X(t0); let shown = 0;
    for (const p of ps){ if (p.t1 < t0 || p.t0 > t1) continue; shown++;
      if (D.gen==='SMS4A' && px > 80){
        p.off.forEach((o,j)=>{ const a = p.t0 + o*TCY, b = j+1 < p.off.length ? p.t0 + p.off[j+1]*TCY : p.t1;
          c.fillStyle = j===5 ? css('--accent2') : j===4 ? css('--warn') : css('--accent'); c.globalAlpha = j%2 ? .55 : .85;
          c.fillRect(X(a), y+3, Math.max(1, X(b)-X(a)-1), h-6); c.globalAlpha = 1;
          if (X(b)-X(a) > 64){ c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.fillText(PSTEPS[j][0], X(a)+3, y+h/2+3); } });
      } else { c.fillStyle = p.ev.length ? css('--warn') : (p.i%2 ? css('--accent') : css('--accent2')); c.globalAlpha = .75; c.fillRect(X(p.t0), y+3, Math.max(1, X(p.t1)-X(p.t0)-.5), h-6); c.globalAlpha = 1; }
    }
    if (px < 3){ c.fillStyle = css('--ink'); c.font = '11px '+css('--mono'); c.fillText(`${shown} passes in view (${SIM.fmtDur(S.loopT)} each at ${C.FOSC/1e6} MHz, ${'clock inferred'}); orange = a pass where something changed`, X(t0)+6, y+h/2+4); }
  }});
  if (D.gen === 'SMS4A') ls.push({label:'SPORT1 frame to SHARC (FSYNC RD1) + 4 CPLD bits', h:22, draw(c,X,t0,t1,y,h){
    c.fillStyle = css('--accent2'); for (const p of S.passes){ if (p.t1 < t0 || p.t0 > t1) continue; const a = p.fsync, b = a + PSTEPS[5][1]*TCY; c.fillRect(X(a), y+5, Math.max(1, X(b)-X(a)), h-10); } }});
  for (let j=0;j<4;j++){
    const kk = j;
    ls.push({label:`IN ${kk+1}: ${D.gen==='SMS4A'?CHIPS[kk]+' lock · aes bit · CPLD source':'E2..E0 lock · lock/ad pin'}`, h: kk===k ? 36 : 22, draw(c,X,t0,t1,y,h){
      const rows = D.gen==='SMS4A' ? [['lockRead',css('--accent2')],['aes',css('--warn')],['sel',css('--accent')]] : [['lockRead',css('--accent2')],['pin',css('--accent')]];
      const rh = (h-6)/rows.length;
      rows.forEach(([key,col],r)=>{ c.fillStyle = col;
        for (const p of S.passes){ if (p.t1 < t0 || p.t0 > t1) continue; const v = p.ch[kk][key]; if (!v) continue;
          const a = key==='sel' ? p.fsync : p.t0; const nx = S.passes[p.i+1]; const b = nx ? (key==='sel' ? nx.fsync : nx.t0) : p.t1; c.fillRect(X(a), y+3+r*rh, Math.max(1, X(b)-X(a)), rh-1); } });
      if (kk===k && X(t1)-X(t0) > 200){ c.fillStyle = css('--ink2'); c.font = '10px sans-serif'; c.fillText(D.gen==='SMS4A'?'blue: CS8420 locked · orange: aes bit · green: CPLD routes AES':'blue: CS8412 E ≠ 111 · green: lock LED + 4053 on DAC', X(t1)-330, y+h-4); }
      if (D.ev.some(e=>e.k===kk)){ c.strokeStyle = css('--play'); c.setLineDash([3,3]); D.ev.filter(e=>e.k===kk).forEach(e=>{ c.beginPath(); c.moveTo(X(e.t), y); c.lineTo(X(e.t), y+h); c.stroke(); }); c.setLineDash([]); }
    }});
  }
  ls.push({label:`IN ${k+1} L: signal into the meter DSP`, h:38, draw(c,X,t0,t1,y,h){
    const pw = X(t1)-X(t0), N = Math.min(1200, Math.max(200, pw*2)), span = t1-t0, f = D.inp[k].freq;
    c.strokeStyle = css('--accent'); c.lineWidth = 1;
    if (span*f > pw/2){ c.fillStyle = css('--accent'); c.globalAlpha = .4;
      for (let i=0;i<N;i++){ const tt = t0 + span*i/N; let m = 0; for (let q=0;q<4;q++) m = Math.max(m, Math.abs(meterInput(k,0, tt + span/N*q/4))); const a = Math.min(1, m*1.4)*(h/2-3); c.fillRect(X(tt), y+h/2-a, pw/N+.5, 2*a); }
      c.globalAlpha = 1; return; }
    c.beginPath(); for (let i=0;i<=N;i++){ const tt = t0 + span*i/N, v = meterInput(k,0, Math.floor(tt*FS)/FS); const yy = y+h/2 - Math.max(-1,Math.min(1,v*1.4))*(h/2-3); i ? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); } c.stroke();
  }});
  ls.push({label:`IN ${k+1} L: ${D.gen==='SMS4A'?'VU (green) · PPM (orange) on the meter scale':'rectified level (inferred ballistics)'}`, h:56, draw(c,X,t0,t1,y,h){
    const Au = audio(), pw = X(t1)-X(t0), N = Math.min(900, Math.max(100, pw)), span = t1-t0, ch = k*2;
    const Y = r => y + h - 3 - (Math.max(-40, Math.min(16, r)) + 40)/56*(h-6);
    c.strokeStyle = css('--grid'); [0,-20].forEach(r=>{ c.beginPath(); c.moveTo(X(t0),Y(r)); c.lineTo(X(t1),Y(r)); c.stroke(); });
    c.fillStyle = css('--ink2'); c.font = '9px sans-serif'; c.fillText('0', X(t0)+2, Y(0)-2); c.fillText('−20', X(t0)+2, Y(-20)-2);
    const curves = D.gen==='SMS4A' ? [[Au.vu, css('--accent'), P=>readOf(P)],[Au.pp, css('--warn'), P=>readOf(P)]] : [[Au.env, css('--accent'), e=> e>0 ? 20*Math.log10(e) : -99]];
    curves.forEach(([arr,col,fn])=>{ c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath();
      for (let i=0;i<=N;i++){ const tt = t0 + span*i/N, s = sampleOf(tt); const yy = Y(fn(arr[ch*Au.N+s])); i ? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); } c.stroke(); });
  }});
  if (D.gen === 'SMS4A') ls.push({label:`IN ${k+1}: correlation (LEDs lit, 1–5)`, h:24, draw(c,X,t0,t1,y,h){
    const Au = audio(), pw = X(t1)-X(t0), N = Math.min(600, Math.max(60, pw/2)), span = t1-t0;
    for (let i=0;i<N;i++){ const tt = t0 + span*(i+.5)/N, s = sampleOf(tt); const n = phaseLit(phaseV(Au.sm[k*Au.N+s], Au.df[k*Au.N+s]));
      for (let q=0;q<n;q++){ c.fillStyle = q>=3 ? css('--bad') : q>=1 ? css('--warn') : css('--accent'); c.fillRect(X(t0+span*i/N), y+h-4-(q+1)*((h-6)/5), pw/N+.5, (h-6)/5-1); } }
  }});
  return ls;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>` + D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Plug or unplug an input, flip a DIP switch or change a level. Each step the firmware takes is listed here.</div>'; }
function inspectorHTML(t){
  const k = D.sel, d = display(t);
  if (D.gen !== 'SMS4A'){
    const p = passAt(t), c = p.ch[k];
    return `<table class="kv"><tr><th>Pass</th><td class="mono">#${p.i} (dig1_check … dig4_check, sel pulse, DELAY)</td></tr>
      <tr><th>IN ${k+1} CS8412 E2..E0</th><td class="mono">${c.e.toString(2).padStart(3,'0')} ${c.e===7?'(no lock)':'(locked)'}</td></tr>
      <tr><th>lock${k+1} / ad_${k+1}</th><td class="mono">${c.pin} / ${c.pin} · bnce_cnt${k+1} = ${c.bc}</td></tr>
      <tr><th>4053 routes</th><td class="mono">${c.pin?'CS4330 DAC (AES)':'analog input'}</td></tr>
      <tr><th>Meter L / R</th><td class="mono">${d.read[k*2].toFixed(1)} / ${d.read[k*2+1].toFixed(1)} (scale units)</td></tr></table>`;
  }
  const st = stepAt(t), p = st.pass, c = p.ch[k], f = frameState(t)[k];
  const lbl = v => { const j = segIdx(v); return j < 0 ? 'off' : (SEG_LBL[j]>0?'+':'')+SEG_LBL[j]; };
  return `<table class="kv">
    <tr><th>PIC pass</th><td class="mono">#${p.i} · ${PSTEPS[st.step][0]}<br><span class="muted">${PSTEPS[st.step][2]}</span></td></tr>
    <tr><th>IN ${k+1} ${CHIPS[k]} lock_8420,${k}</th><td class="mono">${c.lockRead} · bcount=${c.bc} bcount1=${c.bc1} · lockaes_analog${k+1}=${(c.la1<<1|c.la0).toString(2).padStart(2,'0')}b</td></tr>
    <tr><th>aes,${k} / a_d,${k}</th><td class="mono">${c.aes} / ${c.a_d}${c.rs?' · run/stop pending (lock_8420,'+(k+4)+')':''}</td></tr>
    <tr><th>CPLD source (latched)</th><td class="mono">${f.sel?'aes_data_in'+(k+1)+' (CS8420)':'a/d_data_in'+(k+1)+' (CS5333)'}</td></tr>
    <tr><th>Cal index sent</th><td class="mono">${f.calSent} → point_one_db_table → ${(-12+0.1*f.calSent).toFixed(1)} dB (+3 dB in sport0_isr)</td></tr>
    <tr><th>CS8420 reg 3 / reg 4</th><td class="mono">0x${c.reg3.toString(16).toUpperCase()} / 0x${c.reg4.toString(16).toUpperCase()}</td></tr>
    <tr><th>SHARC VU / PPM (0–255)</th><td class="mono">L ${d.v[k*2][0]} / ${d.v[k*2][1]} → ${lbl(d.v[k*2][0])} · R ${d.v[k*2+1][0]} / ${d.v[k*2+1][1]} → ${lbl(d.v[k*2+1][0])}</td></tr>
    <tr><th>Correlation</th><td class="mono">PhaseMeterGet = ${d.corrV[k]} → ${phaseLit(d.corrV[k])} LED${phaseLit(d.corrV[k])>1?'s':''}${d.corrV[k]===256?' (index 256 is one past the 256-entry table)':''}</td></tr>
    <tr><th>AES tally</th><td class="mono">${d.lock[k]?'ON':'off'} · mux slot ${activeRow(sampleOf(t))} active</td></tr></table>`;
}
function viewSim(m){
  window.__smsActive = true;
  m.innerHTML = `${card(`Front panel at the playhead — ${D.gen==='SMS4A'?'SMS4A, drawn to scale from SMS4A-FRONT.dwg (legends '+inf+')':'SMS-4 (1999|32) on its real silkscreen SMSSLKS.CDR'}`, `<div id="fp"></div>`)}
    ${card(`Rear panel — ${D.gen==='SMS4A'?'from SMS4-REAR.dwg (input order '+inf+')':'real silkscreen; click the 110/75 Ω switches too'}`, `<div id="rp"></div>`)}
    <div class="grid2"><div>
      ${card('Inputs and test signals', controlsHTML())}
      ${D.gen==='SMS4A' ? card('Internal DIP switch SW1', `<div id="dip"></div>`) : ''}
    </div><div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead — the selected input', `<div id="insp"></div>`)}
      ${card('Action log', `<div id="log" class="log" style="max-height:180px"></div>`)}
    </div></div>
    ${card('Timeline — one second, zoomable (wheel, drag, click to seek)', `<canvas id="tl"></canvas>
      <p class="small muted">The PIC pass length is the instruction count of each routine in the source (shown in the Software tab) at ${C.FOSC/1e6} MHz. The 4 MHz figure is the MPLAB setting in sms4.pjt; the BOM lists no PIC crystal, so the clock is ${inf}. The meter traces are the real VUMeterCalc / PhaseMeterCalc recursions run on every sample at 48 kHz.</p>`)}`;
  bindControls(m);
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    const dp = m.querySelector('#dip'); if (dp){ dp.innerHTML = dipHTML(); bindDip(dp); }
    syncControls(m);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (SMS-4MAN.wpd) ---------------- */
const firstEv = (k, what, on) => D.ev.some(e=>e.k===k && e.what===what && e.on===on);
const LESSONS = [
  {title:'Meet the SMS4A', body:`<p>The SMS4A is a 1 RU <b>stereo meter system</b>: four stereo meter pairs, each with two <b>28-segment VU/Peak</b> bargraphs, a <b>5-segment correlation meter</b> and an <b>AES tally</b> (manual). Each input takes analog audio on a pluggable screw terminal or AES/EBU on a 75 Ω BNC.</p>
    <p>Inside are three processors from the VMS44-3 monitor board: a <b>PIC16F874</b> that watches four <b>CS8420</b> AES receivers and decides analog or digital, an <b>EPM3128 CPLD</b> that routes audio and clocks, and an <b>ADSP-21065L SHARC</b> that computes the meters and drives the LEDs through MM5450 shift registers.</p>
    <p class="muted">The panel on the right is the real unit at the playhead. Press ▶ Play on the transport to watch it live.</p>`, check:()=>true, auto:true},
  {title:'1 · Read a meter', body:`<p>INPUT 1 carries an analog +4 dBu tone. With the factory setting (0 VU = +4 dBu) the bargraph tops out at <b>0</b>. The single brighter dot above the bar is the <b>peak</b> (PPM) reading; on a steady tone it sits close to the bar.</p><p><b>Goal:</b> raise INPUT 1's analog level to <b>+10 dBu</b> and watch the bar reach the red segments.</p>`, check:()=>D.inp[0].ana.dbu>=10, hint:'Type 10 in the dBu box of IN 1.'},
  {title:'2 · VU vs peak ballistics', body:`<p>Set INPUT 1's program to <b>250 ms bursts</b>. The VU bar rises with a 65 ms time constant (TCONST_VU) and the peak dot jumps almost at once (attack 2.2 ms) but falls slowly (decay ≈ 6.7 dB/s).</p><p>Zoom the timeline to 100 ms and scrub across a burst edge: the lane "VU · PPM" shows both curves.</p><p><b>Goal:</b> IN 1 program = bursts.</p>`, check:()=>D.inp[0].prog==='burst', hint:'Program column, IN 1.'},
  {title:'3 · Digital overrides analog', body:`<p>Plug an <b>AES</b> cable into INPUT 1 (rear BNC, or key 1). The manual: "In the event that a stereo analog and digital signal are inadvertently connected to the same meter pair, the digital signal will override", and the <b>AES tally</b> lights.</p><p>In code: the CS8420 locks, <span class="mono">autodetect1</span> confirms it for 2 passes, sets <span class="mono">aes,0</span>, and the CPLD switches the SHARC input from the A/D to the CS8420 at the next FSYNC.</p><p><b>Goal:</b> IN 1 in AES mode at the playhead (scrub a little past the event).</p>`, check:()=>D.gen==='SMS4A' && frameState(SIM.t)[0].sel===1, hint:'Click the INPUT 1 BNC on the rear panel, then move the playhead ~30 ms later.'},
  {title:'4 · Pull the AES cable', body:`<p>Unplug the AES cable from INPUT 1. The tally goes out within one pass, but the PIC waits <b>8 passes</b> (detect_count ≈ ${(8*LOOP_CYC*TCY*1e3).toFixed(0)} ms) before giving the meter back to the analog input. During that gap the meter shows the muted CS8420 and falls.</p><p><b>Goal:</b> an "AES out" event on INPUT 1.</p>`, check:()=>firstEv(0,'aes',false), hint:'Click the INPUT 1 BNC again, later in the second.'},
  {title:'5 · Digital calibration (SW4)', body:`<p>The digital reference is 0 VU = −20 dBFS, or −18 dBFS with the switch up. Flip the <b>digital cal</b> switch (code position 5). INPUT 2 (AES, −20 dBFS) drops by 2 dB: the PIC sends cal index 101 instead of 121.</p><p><b>Goal:</b> digital cal = up.</p>`, check:()=>D.dip[4]===1, hint:'DIP card: position 5.'},
  {title:'6 · Analog calibration (SW3)', body:`<p>The analog reference is 0 VU = +4 dBu, or 0 dBu with the switch up (cal index 113 instead of 73: 4.0 dB more gain).</p><p><b>Goal:</b> analog cal = up.</p>`, check:()=>D.dip[5]===1, hint:'DIP card: position 6.'},
  {title:'7 · Correlation', body:`<p>INPUT 4 is wired out of phase (R = −L). Its correlation meter lights all <b>5</b> LEDs. In-phase audio lights only 1, quadrature (INPUT 2) lights 3, and so does silence: PhaseMeterGet forces 128 when there is no signal.</p><p><b>Goal:</b> set INPUT 4 to <b>in phase</b> and watch it drop to one LED.</p>`, check:()=>D.inp[3].rel==='in', hint:'L/R column of IN 4.'},
  {title:'8 · Any sample rate', body:`<p>The SMS4A's CS8420s are <b>sample-rate converters</b>: any AES rate from 30 to 96 kHz (manual) is re-timed to the board's own 48 kHz from the PLL1700E. Set INPUT 2 to <b>96 kHz</b>: it still locks.</p><p>Then press <b>SMS4 (1999|32)</b> to see the original: CS8412 receivers, 30–50 kHz only, 18-segment meters and the real silkscreen.</p><p><b>Goal:</b> IN 2 at 96 kHz and the 1999|32 model shown.</p>`, check:()=>D.inp[1].aes.fs===96000 && D.gen==='SMS4', hint:'AES rate column, then the "SMS4 (1999|32)" button.'},
  {title:'Done', body:`<p>You have used every input, switch and meter of the SMS4. The <b>Software</b> tab follows the same actions through the PIC, CPLD and SHARC, <b>One second</b> breaks the meter down to the sample and the LED shift, and <b>Findings</b> lists what the code is really doing.</p>`, check:()=>true, auto:true},
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__smsActive = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — using the SMS4A (from SMS-4MAN.wpd)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:6px"></div>${controlsHTML()}<div id="dip" style="margin-top:8px"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    const dp = m.querySelector('#dip'); dp.innerHTML = D.gen==='SMS4A' ? dipHTML() : ''; bindDip(dp);
    syncControls(m);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick = ()=>{ lessonIdx = +li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx]; let ok = false; try { ok = L.check(); } catch(e){}
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok ? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick = ()=>{ lessonIdx = Math.max(0, lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick = ()=>{ lessonIdx = Math.min(LESSONS.length-1, lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick = ()=>{ D = defaults(); SCHED_KEY = ''; lessonIdx = 0; SIM.refresh(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, broken down ---------------- */
function bootLanes(){
  const css = SIM.css, cy = TCY;
  const T = { alt:1024*cy, rel:(1305600+261120+400)*cy, adc:(1305600+2*261120+600)*cy };
  T.main = T.adc + 4*880*cy;
  return [
    {label:'PIC INIT delays (pdelay1, pdelay, pdelay2)', h:26, draw(c,X,t0,t1,y,h){ [[0,1305600*cy,'pdelay1: 5×255×256'],[1305600*cy,(1305600+261120)*cy,'pdelay'],[T.rel,T.rel+261120*cy,'pdelay2']].forEach(([a,b,l],i)=>{ c.fillStyle = i%2?css('--accent2'):css('--accent'); c.globalAlpha=.6; c.fillRect(X(a),y+4,X(b)-X(a),h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(l, X(a)+4, y+h/2+4); }); }},
    {label:'RA4 poweraltera (0 = CPLD on)', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent'); c.fillRect(X(T.alt),y+5,X(t1)-X(T.alt),h-10); }},
    {label:'reset8420 / resetsharc released', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent2'); c.fillRect(X(T.rel),y+5,X(t1)-X(T.rel),h-10); }},
    {label:'SHARC boot from AM29LV040 + Init_dsp', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--warn'); c.globalAlpha=.6; c.fillRect(X(T.rel),y+5,X(T.rel+0.05)-X(T.rel),h-10); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText('≈50 ms (inferred)', X(T.rel+0.05)+4, y+h/2+4); }},
    {label:'reset_adc released (CS5333 × 4)', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent2'); c.fillRect(X(T.adc),y+5,X(t1)-X(T.adc),h-10); }},
    {label:'PRE_MAIN refresh8420_1…4 → MAIN', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent'); for (let tt=T.main; tt<t1; tt+=LOOP_CYC*cy) c.fillRect(X(tt),y+5,Math.max(1,X(tt+LOOP_CYC*cy*0.9)-X(tt)),h-10); }},
    {label:'AES on an input: aes bit set after 3 passes', h:20, draw(c,X,t0,t1,y,h){ const a = T.main + 3*LOOP_CYC*cy; c.fillStyle=css('--warn'); c.fillRect(X(a),y+5,X(t1)-X(a),h-10); c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(SIM.fmtT(a), X(a)+4, y+h/2+4); }},
  ];
}
function viewSecond(m){
  window.__smsActive = false;
  const isA = D.gen==='SMS4A', S = schedule();
  const rows = isA ? [
    ['Audio samples per channel (8 channels)', '48,000', SIM.fmtDur(1/FS), 'CPLD lrclock from PLL1700E; CS8420 SRC re-times AES inputs to it'],
    ['sport0_isr (VUMeterCalc, PhaseMeterCalc)', '48,000', SIM.fmtDur(1/FS), 'SPORT0 I²S DMA, 2 pairs per data line (DR0A, DR0B)'],
    ['SHARC main loop (VUMeterGet × 16, PhaseMeterGet × 4)', '≈ 48,000 '+inf, '', 'ends in "idle" until the next interrupt'],
    ['mux_ctl → translate_meter_results', '160', SIM.fmtDur(C.MUX/FS), 'mux_rate 300 samples; alternates L and R rows'],
    ['Full L+R LED frame', '80', SIM.fmtDur(2*C.MUX/FS), '"300=80Hz mux rate at 48K"'],
    ['MM5450 shift clocks (FLG10)', (160*36).toLocaleString(), SIM.fmtDur(2/FS), '36 clocks per slot, one edge per ISR → 1.5 ms burst'],
    ['PIC main-loop passes', (1/S.loopT).toFixed(1), SIM.fmtDur(S.loopT), LOOP_CYC.toLocaleString()+' instruction cycles, clock '+inf],
    ['CS8420 lock reads (register 16)', (4/S.loopT).toFixed(0), '', 'read8420s, 4 chips per pass'],
    ['CS8420 control bytes written', (4*19/S.loopT).toFixed(0), '', 'refresh8420_1…4 rewrite regs 1–6, 9, 17 every pass'],
    ['SPORT1 frames PIC → SHARC', (1/S.loopT).toFixed(1), SIM.fmtDur(PSTEPS[5][1]*TCY), '17 × 10 bit + 4 CPLD bits'],
    ['cs8420lockprocess run/stop checks', (1/(S.loopT*5)).toFixed(1), SIM.fmtDur(S.loopT*5), 'rsconstant 5'],
    ['VU time constant', '', SIM.fmtDur(1/(FS*C.TVU)), 'TCONST_VU on the squared signal'],
    ['PPM attack / decay time constants', '', SIM.fmtDur(1/(FS*C.TPA))+' / '+SIM.fmtDur(1/(FS*C.TPD)), 'decay ≈ '+(10/Math.LN10/(1/(FS*C.TPD))).toFixed(1)+' dB/s'],
    ['Correlation averaging', '', SIM.fmtDur(1/(FS*(1-C.PH_A))), 'PHMETER_ALPHA 0.999'],
  ] : [
    ['PIC16C73A passes', (1/S.loopT).toFixed(1), SIM.fmtDur(S.loopT), 'DELAY: 256 × 31 cycles at 4 MHz '+inf],
    ['Lock debounce', '', SIM.fmtDur(5*S.loopT), 'bnce_num 5 passes'],
    ['sel pulse on RA0', (1/S.loopT).toFixed(1), '13 NOPs', 'net SEL on SMS4.DSN'],
    ['Meter drive', 'continuous', '', 'LF353 rectifiers → LM3914 (no sampling); ballistics '+inf],
  ];
  m.innerHTML = `${card(`One second of the ${isA?'SMS4A':'SMS4 (1999|32)'}, broken down`, `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`)}
    <div class="grid2">
      ${card('As the displays see it (front panel at the playhead)', `<div id="fp"></div><p class="small muted">Tick "fast camera" to see only the row the MM5450s are driving at this instant: the eye merges the 80 Hz L/R multiplex.</p><label class="small"><input type="checkbox" id="cam"> fast camera</label>`)}
      ${card('As the device sees it', `<div id="dev"></div>`)}
    </div>
    ${isA ? `<div class="grid2">${card('MM5450 shift frame for the selected pair (36 clocks)', `<canvas id="mm"></canvas><div id="mmt" class="small mono"></div>`)}${card('SPORT1 frame PIC → SHARC at the playhead (sharc_out[34])', `<div id="so" class="small mono"></div>`)}</div>` : ''}
    ${isA ? card('Power-up (PIC INIT, first 2 s after power is applied)', `<canvas id="boot"></canvas><p class="small muted">Delay loops counted from init443.asm (clrwdt + decfsz + goto = 4 cycles); 4 MHz clock ${inf}. The boot is longer than one second, so it is shown on its own fixed axis.</p>`) : ''}`;
  const draw = ()=>{
    const t = SIM.t, d = display(t);
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const cam = m.querySelector('#cam'); cam.checked = D.camera; cam.onchange = ()=>A.camera();
    const s = sampleOf(t), k = D.sel;
    if (isA){
      const st = stepAt(t), nslot = Math.floor(s/C.MUX);
      m.querySelector('#dev').innerHTML = `<table class="kv">
        <tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · sample ${s.toLocaleString()}</td></tr>
        <tr><th>SHARC</th><td class="mono">sport0_isr #${s.toLocaleString()} · mux_counter = ${C.MUX - (s % C.MUX)} · slot ${nslot} (${nslot%2?'R':'L'} data)${(s % C.MUX) < 72 ? ' · shifting bit '+Math.floor((s%C.MUX)/2) : ''}</td></tr>
        <tr><th>PIC</th><td class="mono">pass #${st.pass.i}: ${PSTEPS[st.step][0]}</td></tr>
        <tr><th>CPLD</th><td class="mono">DR0A = ${frameState(t)[0].sel?'AES1':'A/D1'} / ${frameState(t)[1].sel?'AES2':'A/D2'} · DR0B = ${frameState(t)[2].sel?'AES3':'A/D3'} / ${frameState(t)[3].sel?'AES4':'A/D4'}</td></tr>
        <tr><th>Meters (scale units)</th><td class="mono">${[0,1,2,3].map(q=>`IN${q+1} ${d.read[q*2].toFixed(1)} / ${d.read[q*2+1].toFixed(1)}`).join('<br>')}</td></tr></table>`;
      drawMM(m.querySelector('#mm'), m.querySelector('#mmt'), t);
      const so = sharcOut(t);
      m.querySelector('#so').innerHTML = `<table class="kv"><tr><th>word</th><th>bytes</th><th>10-bit</th><th>meaning</th></tr>${Array.from({length:17},(_,w)=>{ const hi = so[2*w], lo = so[2*w+1], v = ((hi&3)<<8)|lo;
        const mean = w<8 ? `input_cal_fix[${w}] → trim[${v}] = point_one_db_table[${v-512}] (${(-12+0.1*(v-512)).toFixed(1)} dB)` : w<12 ? `anc_data[${w-8}] "v${w-7}" video on (cleared every pass)` : w<16 ? `anc_data[${w-8}] lock IN${w-11}: bit1 = ${(lo>>1)&1}` : 'spare';
        return `<tr><td>${w}</td><td>${hi.toString(16).padStart(2,'0')} ${lo.toString(16).padStart(2,'0')}</td><td>${v}</td><td>${mean}</td></tr>`; }).join('')}</table>
        CPLD tail: aes,0..3 = ${passAt(t).ch.map(c=>c.aes).join('')} (3 clocked + 1 latched by FSYNC, see Software)`;
      SIM.drawLanes(m.querySelector('#boot'), bootLanes(), {labelW:230, range:[0, 2.0]});
    } else {
      const p = passAt(t);
      m.querySelector('#dev').innerHTML = `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
        <tr><th>PIC pass</th><td class="mono">#${p.i}</td></tr>${p.ch.map((c,q)=>`<tr><th>IN ${q+1}</th><td class="mono">E=${c.e.toString(2).padStart(3,'0')} · lock/ad=${c.pin} · bnce=${c.bc} · meter ${d.read[q*2].toFixed(1)} / ${d.read[q*2+1].toFixed(1)}</td></tr>`).join('')}</table>`;
    }
  };
  SIM.on('time', draw);
}
function drawMM(cv, txt, t){
  const {c, w} = SIM.canvas(cv, 120), k = D.sel, s = sampleOf(t), d = display(t);
  const row = slotFor('L', s) > slotFor('R', s) ? 'L' : 'R', chain = k + 1;
  const bits = [1].concat(d.bars[k*2 + (row==='L'?0:1)]);
  const anc = new Array(7).fill(0), pairOf = (a,b)=> row==='L' ? a : b;
  if (chain===1) anc[1] = d.lock[pairOf(0,1)]; else if (chain===4) anc[1] = d.lock[pairOf(2,3)];
  else { const n = d.corr[chain===2 ? pairOf(0,1) : pairOf(2,3)]; for (let i=0;i<n;i++) anc[i] = 1; }
  const all = bits.concat(anc), cw = (w-20)/36;
  all.forEach((b,i)=>{ c.fillStyle = i===0 ? SIM.css('--ink2') : i<=28 ? SIM.css('--accent') : SIM.css('--warn'); c.globalAlpha = b ? .9 : .12; c.fillRect(10+i*cw, 20, cw-2, 40); c.globalAlpha = 1;
    c.fillStyle = SIM.css('--ink2'); c.font = '9px '+SIM.css('--mono'); if (i%4===0) c.fillText(i, 10+i*cw, 74); });
  c.fillStyle = SIM.css('--ink'); c.font = '11px sans-serif';
  c.fillText(`chain meter${chain} (data on FLG${chain+3}) · latest latched slot: ${row} row · bit 0 = start · 1–28 = +14…−38 · 29–35 = anc`, 10, 12);
  c.fillText(`one clock = 2 ISR periods = ${SIM.fmtDur(2/FS)} → 36 clocks = ${SIM.fmtDur(72/FS)}`, 10, 100);
  const what = chain===1 ? `lock of IN ${pairOf(1,2)}` : chain===4 ? `lock of IN ${pairOf(3,4)}` : `correlation of IN ${chain===2 ? pairOf(1,2) : pairOf(3,4)}`;
  txt.innerHTML = `IN ${k+1}'s bars travel in chain meter${chain} (meter${chain}_left / meter${chain}_right). In this ${row} slot its anc bits carry the ${what} (refresh_lock_status puts locks on chains 1 and 4, translate_meter_results puts correlation on chains 2 and 3).`;
}

/* ---------------- block diagram ---------------- */
const BLK_A = {
  ain:{x:10,y:20,w:150,h:64,t:'Analog in ×4',s:['screw terminal','NE5532 ×4 → CS5333 A/D'],d:'Balanced >20 kΩ (manual). NE5532 buffers (U11, U15, U17, U19) feed four CS5333 A/D converters (U1, U16, U18, U20). Full scale ≈ +19.3 dBu, inferred from the calibration constants.'},
  aesin:{x:10,y:120,w:150,h:64,t:'AES in ×4',s:['75 Ω BNC → PE-65612','CS8420 receiver + SRC'],d:'Four CS8420s (U4, U3, U10, U5) on chip selects RA3, RE0, RE1, RE2. Each re-times its input (30–96 kHz) to the board clock with its sample-rate converter and reports UNLOCK in register 16 bit 4.'},
  cpld:{x:220,y:60,w:170,h:110,t:'EPM3128 CPLD (U2)',s:['A/D-or-AES mux per channel','clock dividers (lrclock, sclock)','74165 for DIP SW1','latch of the 4 aes bits'],d:'vms44-1 (MAX+plus II). DR0A = (aes_data_in1 | a/d_data_in1) while TFSO high, input 2 while low; DR0B the same for inputs 3/4. The choice comes from four DFFs clocked by the PIC SPORT clock (pic7) and latched by its FSYNC (pic6).'},
  pll:{x:220,y:200,w:170,h:46,t:'PLL1700E + 27 MHz',s:['audio-clock → 48 kHz'],d:'PLL1700E (U12) from the 27 MHz crystal X1 (a VMS44 video-board leftover). The CPLD divides it to lrclock, sclock and omck for the converters.'},
  pic:{x:220,y:-60,w:170,h:96,t:'PIC16F874 (U8)',s:['CS8420 control port (bit-bang)','autodetect: analog ↔ AES','SPORT1 frame to SHARC'],d:'sms443v4.asm. One endless MAIN loop, no interrupts. Reads the four lock flags, decides each input\'s source, rewrites the CS8420 registers and sends 17 × 10-bit words to the SHARC plus 4 bits to the CPLD.'},
  dsp:{x:450,y:40,w:180,h:110,t:'ADSP-21065L SHARC (U6)',s:['sport0_isr: VU/PPM, correlation','mux_ctl every 300 samples','MM5450 serial on FLG4–11'],d:'VMS443V103 (shared with the VMS44). Boots from the AM29LV040 flash (U7). Calibration gains come from the PIC (input_cal_fix → point_one_db_table).'},
  led:{x:450,y:190,w:180,h:70,t:'LED board',s:['MM5450 chains ×4','28 + 28 + tally/corr per pair'],d:'Bits 1–28 = segments +14 … −38, bits 29–35 = tally or correlation. Rows L and R multiplexed at 80 Hz (FLG8 / FLG9). LED board layout inferred.'},
  dip:{x:10,y:-50,w:150,h:50,t:'DIP SW1 (8)',s:['cal: SW5 dig, SW6 ana'],d:'Read via the CPLD\'s 74165 by read_jumpers. Only positions 5 and 6 are used.'},
};
const WIRE_A = [['ain','cpld','a/d_data_in1–4'],['aesin','cpld','aes_data_in1–4'],['pic','aesin','CCLK/CDIN/CDOUT · CS'],['pic','cpld','pic3–9'],['cpld','dsp','DR0A/DR0B · DR1A'],['pll','cpld','audio-clock'],['dsp','led','FLG4–11'],['dip','cpld','dip1–9'],['dsp','pic','DT1A → RC0']];
const BLK_O = {
  bnc:{x:10,y:20,w:150,h:60,t:'AES in (110 Ω / 75 Ω)',s:['SPDT switch + transformer'],d:'SMS4.DSN: BNC, SW SPDT, TRANSFORMER. The manual warns never to connect 110 Ω and 75 Ω to the same pair.'},
  rx:{x:210,y:20,w:150,h:60,t:'CS8412 + CS4330 DAC',s:['E2..E0 error code → PIC'],d:'Receiver and DAC per channel: the digital input is turned back into analog to share the analog meter chain.'},
  ana:{x:10,y:130,w:150,h:60,t:'Analog in',s:['LF353 balanced input'],d:'LF353 op-amps (U104–U109 on page 1).'},
  sw:{x:410,y:70,w:150,h:60,t:'4053 switch',s:['ad_N selects DAC or analog'],d:'Two 4053s per channel page. Driven by the PIC ad_N pins.'},
  drv:{x:610,y:70,w:150,h:60,t:'LM3914 × 6',s:['18-LED bars + LOCK'],d:'Bargraph drivers on page 2, with LH0070 references. Rectifier ballistics inferred.'},
  pic:{x:210,y:150,w:150,h:60,t:'PIC16C73A',s:['dig1–4_check, 5-pass debounce'],d:'SMS4V100–V102: lock LEDs on RA1, RA2, RA3, RA5; ad_1–4 on RB7, RB3, RC7, RC3.'},
};
const WIRE_O = [['bnc','rx',''],['rx','sw','DAC L/R'],['ana','sw','L/R'],['sw','drv','meter L/R'],['rx','pic','E0–E2'],['pic','sw','ad_N'],['pic','drv','LOCK LED']];
function viewBlock(m){
  window.__smsActive = false;
  const isA = D.gen==='SMS4A', B = isA ? BLK_A : BLK_O, W = isA ? WIRE_A : WIRE_O;
  let sel = isA ? 'cpld' : 'pic';
  m.innerHTML = `<div class="grid2"><div>${card(`Block diagram — ${isA?'SMS4A (2003|36), from the BOM, init443.asm and vms44-1.rpt':'SMS4 (1999|32), from SMS4.cdr and SMS4.DSN'} (click a block)`, `<div id="bd"></div><div style="margin-top:6px"><button data-g="SMS4A" class="${isA?'on':''}">SMS4A</button> <button data-g="SMS4" class="${isA?'':'on'}">SMS4 (1999|32)</button></div>`)}</div>
    <div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', isA ? '<p>Each input reaches the SHARC either from its A/D or from its CS8420; the <b>PIC</b> decides which by watching the CS8420 lock flags, tells the <b>CPLD</b> through four extra bits at the end of its SPORT1 frame, and the <b>SHARC</b> meters whatever arrives and shifts the LED patterns out to the MM5450s.</p>' : '<p>The AES signal is decoded and turned back into analog by a DAC; the <b>PIC</b> only watches the receiver\'s error code and flips a 4053 switch and the LOCK LED, and analog <b>LM3914</b> drivers light the bars.</p>')}
    ${isA?'':card('Original drawing', `<p class="small">SMS4.cdr ("SMS4 - #Artwork.cdr" is the same file): AES INPUT 110S/75S switch → transformer → "D to A CONVERTER 1" → switch → amplifier → trim → amplifier → LED DRIVERS → STEREO LED METER ASSEMBLY; MICROCONTROLLER with A/D1–4 and FROM DAC2–4; "METER CHANNEL 1 SHOWN, METER CHANNELS 2,3 AND 4 ARE IDENTICAL".</p>`)}</div></div>`;
  m.querySelectorAll('[data-g]').forEach(b=> b.onclick = ()=>A.gen(b.dataset.g));
  const draw = ()=>{
    const off = isA ? 70 : 0, ctr = b => [b.x+b.w/2, b.y+off+b.h/2];
    let s = `<svg viewBox="0 0 ${isA?650:780} ${isA?340:230}" style="width:100%"><defs><marker id="smsar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const P = B[a], Q = B[b]; let [x1,y1] = ctr(P), [x2,y2] = ctr(Q);
      const clip = (bx,x,y,tx,ty)=>{ const dx = tx-x, dy = ty-y, sx = dx ? (bx.w/2)/Math.abs(dx) : 1e9, sy = dy ? (bx.h/2)/Math.abs(dy) : 1e9, q = Math.min(sx,sy); return [x+dx*q, y+dy*q]; };
      [x1,y1] = clip(P,x1,y1,x2,y2); [x2,y2] = clip(Q,x2,y2,x1,y1); const hot = sel===a || sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#smsar)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in B){ const b = B[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y+off}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/>
        <text x="${b.x+8}" y="${b.y+off+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+off+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s + '</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; draw(); });
    m.querySelector('#bdinfo').innerHTML = `<h3>${B[sel].t}</h3><p>${B[sel].d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn, net-label style) ---------------- */
function chip(x, y, w, name, left, right, sub){
  const n = Math.max(left.length, right.length), h = 26 + n*17;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy = y+20+i*17; s += `<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy = y+20+i*17; s += `<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  {name:'1 · PIC16F874 (U8)', note:'Pin functions from the comments in init443.asm and the code in sms443v4.asm. RC3/RC4: the comments say RC3 = load, RC4 = clock; the code and the CPLD equations use RC3 as the clock (pic4) and RC4 as the load (pic9). Shown as the code uses them.', h:430, svg:()=>
    chip(330,50,190,'U8 PIC16F874',[
      ['RA0','CS8420 CCLK'],['RA1','CS8420 CDIN'],['RA2','CS8420 CDOUT'],['RA3','CS U4 (AES1)'],['RA4','ALTERA POWER (0=on)'],['RB0','VSYNCH GS4982 (VMS)'],['RB1','HSYNCH GS4982 (VMS)'],['RB2','VIDEO SEL1 4052 (VMS)'],['RB4','VIDEO SEL0 4052 (VMS)'],['RB5','CS8420 RESET'],['RB3/6/7','ICSP'],
    ],[
      ['RC0','DT1A via CPLD pin 23'],['RC1','DIP data, CPLD 22 (74165 QH)'],['RC2','reset_adc, CPLD 21'],['RC3','DIP clock, CPLD 18 (pic4)'],['RC4','DIP load, CPLD 10 (pic9)'],['RC5/6/7','RS485 75176 (U9)'],['RD0','SHARC RESET, CPLD 16'],['RD1','SPORT1 FSYNC, CPLD 15'],['RD2','SPORT1 SCLK, CPLD 14'],['RD3','SPORT1 DATA, CPLD 11'],['RD6/RD7','front tally / push button (unused)'],['RE0/1/2','CS U3, U10, U5'],
    ],'MPASM · sms443v4.asm v2.00 · clock '+'4 MHz (pjt, inferred)')},
  {name:'2 · EPM3128ATC144 CPLD (U2)', note:'Pin numbers and names from vms44-1.rpt (MAX+plus II, "compiled without errors", 52/128 LCs). The four DFFs :221–:232 are the aes-bit shift/latch; the |74165:194| macro is the DIP reader.', h:560, svg:()=>
    chip(330,50,200,'U2 EPM3128ATC144-10',[
      ['25/42/45/63','a/d_data_in1–4'],['29/38/55/69','aes_data_in1–4'],['107','audio-clock'],['86…78, 74','dip1–8, dip9'],['139/138','DT0A / DT0B'],['131','DT1A'],['23','pic1 → RC0'],['22','pic2 (74165 QH) → RC1'],['21','pic3 → reset_adc'],['18','pic4 DIP clk'],['16','pic5 SHARC reset'],['15','pic6 FSYNC / latch'],['14','pic7 SCLK'],['11','pic8 DATA'],['10','pic9 DIP load'],['31/40/60/71','rmck1–4 (unused)'],
    ],[
      ['143 / 142','DR0A / DR0B → SHARC'],['134','DR1A (= pic8)'],['136 / 132','RCLK1 / TCLK1 (= pic7)'],['137','RFS1 (= pic6)'],['141','TFSO (2·fs)'],['6 / 140','RCLK0 / TCLK0'],['5','RFS0'],['28/37/54/68','lrclock1–4'],['27/44/53/67','sclock1–4'],['30/39/56/70','omck1–4'],['32/41/61/72','data_out1–4 (DT0A/B → CS8420 SDIN)'],['65','reset_adc'],['7','SHARC_RESET'],
    ],'MAX+plus II · vms44-1.gdf (Aug 2003|36)')},
  {name:'3 · One input channel (×4)', note:'Parts from SMS4VMS44-3_iss2BOM.doc; connections from the code and the CPLD equations. Exact analog component values per position are not traced.', h:330, svg:()=>
    chip(60,60,150,'NE5532 (U11…)',[['IN L+ / L−','screw term.'],['IN R+ / R−','screw term.']],[['OUT L','→ CS5333'],['OUT R','→ CS5333']],'balanced input')+
    chip(330,60,150,'CS5333 (U1…)',[['AINL',''],['AINR',''],['RST','reset_adc']],[['SDATA','a/d_data_inN'],['LRCK','lrclockN'],['SCLK','sclockN']],'24-bit A/D')+
    chip(60,210,150,'PE-65612 (T1…)',[['BNC 75 Ω','AES IN']],[['sec','→ CS8420 RXP/RXN']],'AES transformer')+
    chip(330,210,150,'CS8420 (U4/U3/U10/U5)',[['RXP/RXN',''],['SDIN','data_outN'],['CCLK/CDIN/CDOUT','RA0/RA1/RA2'],['CS','RA3 / RE0 / RE1 / RE2']],[['SDOUT','aes_data_inN'],['OMCK','omckN'],['RST','RB5']],'AES Rx + SRC')},
  {name:'4 · SHARC and LED drive', note:'ADSP21065 (U6), boot flash AM29LV040 (U7), DS26LS31 line drivers (U13, U14) to the LED board. Flag assignment from vms44_main.asm comments ("flag8=left select, flag9=right select … flag10=clock"). MM5450 is named in the code; the LED board is not in this folder.', h:330, svg:()=>
    chip(300,50,210,'U6 ADSP-21065L',[['DR0A / DR0B','CPLD 143 / 142'],['RFS0 / RCLK0','CPLD 5 / 6'],['DR1A / RFS1 / RCLK1','PIC frame'],['DT1A','→ PIC RC0'],['FLAG0','enable audio clocks'],['FLAG2','ISR busy marker']],[['FLG4…FLG7','data chains 1–4'],['FLG8','left row select'],['FLG9','right row select'],['FLG10','shift clock'],['FLG11','clock enable'],['BMS / data bus','AM29LV040 (U7)']],'VMS443V103, VisualDSP++')+
    `<rect x="620" y="70" width="170" height="120" fill="none" stroke="var(--ink)"/><text x="705" y="95" text-anchor="middle" font-size="12" fill="var(--ink)">DS26LS31 ×2 →</text><text x="705" y="115" text-anchor="middle" font-size="12" fill="var(--ink)">LED board</text><text x="705" y="135" text-anchor="middle" font-size="11" fill="var(--ink2)">4× MM5450 chains</text><text x="705" y="153" text-anchor="middle" font-size="11" fill="var(--ink2)">L/R rows mux 80 Hz</text><text x="705" y="171" text-anchor="middle" font-size="10" fill="var(--warn)">layout inferred</text>`},
  {name:'5 · SMS4 (1999|32) PIC16C73A', note:'Bit equates from SMS4V100.ASM … sms4v102.asm (identical pin map). U3 on page 3 of SMS4.DSN. CS8412 error code: E2..E0 = 111 means no lock (datasheet, not in the archive).', h:330, svg:()=>
    chip(320,50,200,'U3 PIC16C73A',[['RB7 / RB3','ad_1 / ad_2'],['RB6..RB4','e0_1 e1_1 e2_1'],['RB2..RB0','e0_2 e1_2 e2_2'],['RC7 / RC3','ad_3 / ad_4'],['RC6..RC4','e0_3 e1_3 e2_3'],['RC2..RC0','e0_4 e1_4 e2_4']],[['RA0','sel (13-NOP pulse)'],['RA1','LOCK1 LED'],['RA2','LOCK2 LED'],['RA3','LOCK3 LED'],['RA4','input (open drain, skipped)'],['RA5','LOCK4 LED'],['OSC','X1 (value not in archive)']],'SMS4V100 (Feb 1999|32) … V102 (Oct 2003|36)')},
];
let sheetIdx = 0;
function viewSchem(m){
  window.__smsActive = false;
  m.innerHTML = `${card('Schematic set — redrawn from pin and net names (not the original CAD)', `<div id="tabsS" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>`)}
    ${card('Bill of materials (SMS4VMS44-3_iss2BOM.doc, P-CAD)', `<table class="kv small"><tr><th>Part</th><th>RefDes</th><th>Role</th></tr>
      <tr><td>PIC16F874</td><td>U8</td><td>lock detection, CS8420 control, SPORT1 frame</td></tr><tr><td>ADSP21065</td><td>U6</td><td>meters, LED shift</td></tr><tr><td>AM29LV040B-120J</td><td>U7</td><td>SHARC boot flash</td></tr>
      <tr><td>EPM3128/256-144</td><td>U2</td><td>CPLD</td></tr><tr><td>CS8420 ×4</td><td>U3, U4, U5, U10</td><td>AES receiver + SRC</td></tr><tr><td>CS5333 ×4</td><td>U1, U16, U18, U20</td><td>A/D</td></tr>
      <tr><td>NE5532 ×4</td><td>U11, U15, U17, U19</td><td>analog input</td></tr><tr><td>PE-65612 ×4</td><td>T1–T4</td><td>AES transformers</td></tr><tr><td>PLL1700E + 27MEG</td><td>U12, X1</td><td>audio clock</td></tr>
      <tr><td>DS26LS31C ×2</td><td>U13, U14</td><td>drivers to the LED board</td></tr><tr><td>75176</td><td>U9</td><td>RS485 (UART code not linked)</td></tr><tr><td>DIPSW8</td><td>SW1</td><td>calibration</td></tr></table>
      <p class="small muted">Wiring (SMS4 WIRING.sch, P-CAD 2002|35, ISS.1): H2, H3, H10, H11 (1×20 headers) between DSP BOARD, LED BOARD and POWER SUPPLY; ECO of Apr 10 2006|39 merges "+5" into "+5V" and adds P3-5 to GND.</p>`)}`;
  const draw = ()=>{
    m.querySelector('#tabsS').innerHTML = SHEETS.map((s,i)=>`<button data-s="${i}" class="${i===sheetIdx?'on':''}">${s.name}</button>`).join('');
    m.querySelectorAll('[data-s]').forEach(b=> b.onclick = ()=>{ sheetIdx = +b.dataset.s; draw(); });
    const S = SHEETS[sheetIdx];
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 ${S.h}" style="width:100%;min-width:700px"><rect x="2" y="2" width="856" height="${S.h-4}" fill="none" stroke="var(--line)"/><text x="840" y="${S.h-12}" text-anchor="end" font-size="10" fill="var(--warn)">REDRAWN — not the original CAD</text>${S.svg()}</svg>`;
    m.querySelector('#shn').textContent = S.note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__smsActive = false;
  const isA = D.gen==='SMS4A';
  m.innerHTML = isA ? `<div class="grid2"><div>
      ${card('PIC16F874 MAIN (sms443v4.asm) — live', `<div id="loop"></div>`)}
      ${card('autodetect state machine for the selected input — live', `<div id="fsm"></div>`)}
      ${card('CPLD: how the 4 tail bits become the source select', `<p class="small">After the 17 words, <span class="mono">continue_shift</span> puts aes,0…aes,3 on RD3 but clocks only <b>three</b> of them ("shift 4 bits for altara, 3 clocks only; data will be latched next time through"). In the CPLD (vms44-1.rpt) four DFF chains clocked by <span class="mono">pic7</span> feed latches clocked by <span class="mono">pic6</span> (FSYNC):</p>
        <table class="kv small mono"><tr><th>bit</th><th>chain</th><th>latch</th><th>selects</th></tr><tr><td>aes,0</td><td>:229→:230→:231</td><td>:232 (_LC031)</td><td>DR0A, TFSO high: input 1</td></tr><tr><td>aes,1</td><td>:224→:226</td><td>:227 (_LC024)</td><td>DR0A, TFSO low: input 2</td></tr><tr><td>aes,2</td><td>:222</td><td>:221 (_LC027)</td><td>DR0B, TFSO high: input 3</td></tr><tr><td>aes,3</td><td>— (still on the pin)</td><td>:223 (_LC022)</td><td>DR0B, TFSO low: input 4</td></tr></table>
        <p class="small">So the 4th bit is never clocked: the next frame's rising FSYNC latches it straight off the data pin, together with the other three. The new source therefore takes effect at the <b>next</b> pass's frame, ≈${SIM.fmtDur(LOOP_CYC*TCY)} later.</p>`)}
    </div><div>
      ${card('sharc_out[34] — the bytes the PIC sends, live', `<div id="so" class="small mono"></div>`)}
      ${card('CS8420 control registers written every pass (refresh8420_N)', `<div id="regs" class="small"></div>`)}
      ${card('SHARC (VMS443V103): per sample and per mux slot', `<ol class="small">
        <li><b>sport0_isr</b> (every sample): float 8 inputs ×1.412537 (+3 dB) × input_cal_float → <span class="mono">VUMeterCalc</span> (VU += (x²−VU)·0.00031975; PPM attack 0.0095 / decay 0.000032) → <span class="mono">PhaseMeterCalc</span> (|L+R|, |L−R| averaged, α 0.999) → mux_counter−1; on 0 → <span class="mono">mux_ctl</span>; if shifting → <span class="mono">shift_led_data</span> (one clock edge per ISR).</li>
        <li><b>main</b>: input_gain (10-bit index + base of <span class="mono">trim</span>) → synch_test → update_phase_audio → refresh_lock_status → 8× VUMeterGet (VU, PPM: −dB×2, 0–255) + 4× PhaseMeterGet (128·y+128) → <span class="mono">idle</span>.</li>
        <li><b>mux_ctl</b> (every 300 samples): translate_meter_results (vu_data[v] | pk_data[v+6]; phase_data[v]) → toggle BIT31 (L/R) → copy 8 words to shift1–8 → enable the shifter.</li>
        <li><b>shift_led_data</b>: 36 clocks; after clock 36 FLG8/FLG9 select the row that was just loaded.</li></ol>`)}
    </div></div>` :
    `<div class="grid2"><div>${card('SMS4 (1999|32) PIC16C73A main (sms4v102.asm) — live', `<div id="loop"></div>`)}</div><div>${card('dig1_check for the selected input', `<pre class="small mono" style="white-space:pre-wrap">dig1_check  btfss PORTB,e0_1 → got_lock1     ; any E bit low = locked
            btfss PORTB,e1_1 → got_lock1
            btfss PORTB,e2_1 → got_lock1
            btfss PORTA,lock1 → rst_bcnt1      ; already unlocked
            decfsz bnce_cnt1 → return          ; 5 passes
            bcf PORTA,lock1 · bcf PORTB,ad_1
got_lock1   btfsc PORTA,lock1 → rst_bcnt1
            decfsz bnce_cnt1 → return
            bsf PORTA,lock1 · bsf PORTB,ad_1
rst_bcnt1   movlw bnce_num (5) · movwf bnce_cnt1</pre><div id="fsm"></div>`)}</div></div>`;
  const draw = ()=>{
    const t = SIM.t, k = D.sel;
    if (isA){
      const st = stepAt(t);
      m.querySelector('#loop').innerHTML = `<table class="kv"><tr><th></th><th>routine</th><th>cycles</th><th>what it does</th></tr>${PSTEPS.map((s,j)=>`<tr class="${j===st.step?'hl':''}"><td>${j===st.step?'▶':''}</td><td class="mono">${s[0]}</td><td class="mono">${j===3&&st.pass.rs?s[1]+'+40'+(st.pass.runstop?'+1770×'+st.pass.runstop.length:''):s[1]}</td><td class="small">${s[2]}</td></tr>`).join('')}
        <tr><td></td><td class="mono">goto main</td><td class="mono">${LOOP_CYC}</td><td class="small">= ${SIM.fmtDur(LOOP_CYC*TCY)} per pass at ${C.FOSC/1e6} MHz (${inf})</td></tr></table>
        <div class="log" style="margin-top:6px">${st.pass.ev.length ? st.pass.ev.map(e=>`<div>pass #${st.pass.i}: ${e}</div>`).join('') : `<div class="muted">pass #${st.pass.i}: nothing changed</div>`}</div>`;
      const c = st.pass.ch[k];
      const S = c.aes ? (c.lockRead ? 'DIGITAL' : 'LOSING') : (c.lockRead ? 'CONFIRMING' : 'ANALOG');
      const nodes = [['ANALOG',20,'aes=0, no lock'],['CONFIRMING',190,'lock seen, bcount1 '+c.bc1],['DIGITAL',360,'aes=1, la1=1'],['LOSING',530,'no lock, bcount '+c.bc]];
      m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 700 120" style="width:100%">${nodes.map(([n,x,s])=>`<rect x="${x}" y="30" width="150" height="50" rx="10" fill="${n===S?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${n===S?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+75}" y="52" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${n}</text><text x="${x+75}" y="70" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${s}</text>`).join('')}
        <text x="180" y="22" font-size="10" fill="var(--ink2)">lock_8420,${k}=1</text><text x="345" y="22" font-size="10" fill="var(--ink2)">2 passes</text><text x="515" y="22" font-size="10" fill="var(--ink2)">unlock</text><text x="280" y="105" font-size="10" fill="var(--ink2)">8 passes without lock → aes,${k}=0, lockaes_analog${k+1} bit 0 toggled (never read)</text></svg>
        <p class="small muted">IN ${k+1} at the playhead: lock_8420,${k} = ${c.lockRead}, lockaes_analog${k+1} = ${(c.la1<<1|c.la0).toString(2).padStart(2,'0')}b, aes,${k} = ${c.aes}. autodetect runs before read8420s, so it always acts on the previous pass's lock reading.</p>`;
      const so = sharcOut(t);
      m.querySelector('#so').innerHTML = `<table class="kv"><tr><th>+0..</th>${[0,1,2,3,4,5,6,7].map(i=>`<th>${i}</th>`).join('')}</tr>${[0,8,16,24,32].map(r=>`<tr><th>${r}</th>${[0,1,2,3,4,5,6,7].map(i=>{ const j = r+i; if (j>=34) return '<td></td>'; const cls = j<16 ? (j%2?'hl':'') : (j>=25&&j<32&&j%2&&so[j]? 'hl':''); return `<td class="${cls}" title="sharc_out+${j}">${so[j].toString(16).padStart(2,'0')}</td>`; }).join('')}</tr>`).join('')}</table>
        <p class="muted">+0…+15: input_cal_fix (high byte 0x02, low byte = cal index) · +16…+23: "v1–v4" (INIT writes 0x20, refresh_sharc_registers clears bit 5 every pass) · +24…+31: lock words (bit 1 = AES lock, bit 2 = error, never set) · +32/33 spare.</p>`;
      m.querySelector('#regs').innerHTML = `<table class="kv"><tr><th>reg</th><th>value</th><th>source</th></tr>
        <tr><td>1 Misc Control 1</td><td class="mono">0x04</td><td>INIT</td></tr><tr><td>2 Misc Control 2</td><td class="mono">0x00</td><td>INIT</td></tr>
        <tr><td>3 Data Flow Control</td><td class="mono">${[0,1,2,3].map(q=>'0x'+passAt(t).ch[q].reg3.toString(16).toUpperCase()).join(' ')}</td><td>cs8420reg3def 0x89 (AES) / _a 0x8A (analog)</td></tr>
        <tr><td>4 Clock Flow Control</td><td class="mono">${[0,1,2,3].map(q=>'0x'+passAt(t).ch[q].reg4.toString(16).toUpperCase()).join(' ')}</td><td>0x41 / 0x45; bit 6 = RUN (cleared and set by force_runstop)</td></tr>
        <tr><td>5 / 6 serial in / out format</td><td class="mono">0x05 / 0x05</td><td>INIT</td></tr><tr><td>9 Interrupt 1 mask</td><td class="mono">0x00</td><td>all masked</td></tr><tr><td>17 Receiver error mask</td><td class="mono">0x10</td><td>UNLOCK only</td></tr></table>
        <p class="muted">The meaning of the other bits in registers 3 and 4 (which serial/SRC path each value selects) comes from the CS8420 datasheet, which is not in the archive: ${inf}. The code itself only shows that analog mode uses 0x8A/0x45 and AES mode 0x89/0x41.</p>`;
    } else {
      const p = passAt(t), c = p.ch[k];
      m.querySelector('#loop').innerHTML = `<table class="kv"><tr><th>routine</th><th>cycles</th></tr>${[['clrwdt · re_init (ADCON1, OPTION, TRIS)',16],['dig1_check … dig4_check',48],['bsf PORTA,sel · 13× nop · bcf PORTA,sel',15],['call delay: 256 × (7 inner × 4) loop',7950]].map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('')}<tr><td>total</td><td class="mono">≈${C.OLD_CYC} = ${SIM.fmtDur(C.OLD_CYC*TCY)} at 4 MHz (${inf})</td></tr></table>
        <div class="log" style="margin-top:6px">${p.ev.map(e=>`<div>pass #${p.i}: ${e}</div>`).join('') || `<div class="muted">pass #${p.i}: no change</div>`}</div>`;
      m.querySelector('#fsm').innerHTML = `<p class="small">IN ${k+1}: E2..E0 = <span class="mono">${c.e.toString(2).padStart(3,'0')}</span> · lock${k+1}/ad_${k+1} = <b>${c.pin}</b> · bnce_cnt${k+1} = ${c.bc}</p>`;
    }
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__smsActive = false;
  const F = [
    ['The SMS4A runs on a video monitor board', 'sms443v4.asm header "VMS44-3 FOR REVISED SMS4"; init443.asm still defines VIDEO1–4 macros for a 74HC4052 and names RB0/RB1 "VSYNCH/HSYNCH, GS4982"; the BOM keeps the 27 MHz crystal. The SHARC image is the VMS44\'s VMS443V103 (README).'],
    ['The four "Altera" bits were repurposed', 'In <span class="mono">continue_shift</span> the original meanings are commented out ("LRCLK_in2 select", "RMCK select", "27Meg select", "PLL fso 1728/1716"); the bits now carry aes,0…3. vms44-1.rpt shows they select aes_data_in vs a/d_data_in per input — the CPLD, not a relay, is the analog/digital switch.'],
    ['The 4th tail bit is never clocked', '"shift 4 bits for altara, 3 clocks only; data will be latched next time through". The CPLD latch :223 takes aes,3 straight off pic8 on the next FSYNC (pic6). It works, but a source change only reaches the meter one PIC pass later.'],
    ['autodetect acts one pass late', 'MAIN calls autodetect1…4 before read8420s, so each decision uses the previous pass\'s lock flags. Lock → AES takes 3–4 passes (≈'+(4*LOOP_CYC*TCY*1e3).toFixed(0)+' ms) and loss → analog 8–9 passes (≈'+(9*LOOP_CYC*TCY*1e3).toFixed(0)+' ms) at the inferred 4 MHz.'],
    ['The AES tally drops before the source does', 'refresh_sharc_registers copies the live lock flag into sharc_out+25 bit 1 every pass while aes,k is still 1. On a cable pull the tally goes out at once, but the meter stays on the (muted) CS8420 for 8 more passes.'],
    ['lockaes_analogN bit 0 is written but never read', 'no_lock1…4 do <span class="mono">xorwf lockaes_analogN,f</span> ("switch source") every 8 unlocked passes; nothing tests bit 0. It is a leftover of a source-toggling search.'],
    ['Video flags cleared every pass', 'INIT writes 0x20 ("video on") to sharc_out+17/19/21/23; refresh_sharc_registers clears bit 5 of all four at the start of every pass, so the SHARC\'s "bit34 = video on" LED bits are always 0 on the SMS4A.'],
    ['Dead brown-out check', 'In <span class="mono">sharc</span> the brown-out test (brown_out_flag, brown_data 0xAA, brown_count, <span class="mono">here goto here</span>) sits after an unconditional <span class="mono">goto continue_shift</span>: unreachable.'],
    ['Data from the SHARC is read and dropped', '<span class="mono">sharc_shift</span> reads 8 bits from RC0 per word into sharc_in, then <span class="mono">movf sharc_in,w</span> and returns; the stores are commented out. The SHARC\'s pic_out_data (incl. the 0xAA sync word) is never used.'],
    ['Not linked: modes, UART, EEPROM', 'The #INCLUDEs of modes443.asm, uart443.asm and ee_data.asm are commented out. modes443.asm (VMS44 monitor routing) refers to rv1_0/rv2_0 and serial_control, which do not exist in this build; the UART is still initialised ("spbrg 10 … 9600 baud") but no code uses the 75176 RS485.'],
    ['Baud rate and clock do not agree', 'spbrg = 10 with BRGH = 0 gives 9600 baud only with a 6.76 MHz clock; at the 4 MHz in sms4.pjt it is 5682 baud. The BOM lists no PIC crystal, so the real clock is unknown; the simulator uses 4 MHz ('+inf+').'],
    ['Pin comments that disagree with the code', 'init443.asm says RC3 = "load for dip switch" and RC4 = "shift_in clock"; read_jumpers uses RC3 as the clock and RC4 as the load, which matches the CPLD (pin 18 = pic4 = DFF clock, pin 10 = pic9 = load). ADCON1 is commented "porta is analog" but PCFG = 0111 makes it all digital. lock_8420 is described as "x,x,x,x,aes2lock_prev,aes1lock_prev,aes2lock,aes1lock" (a 2-channel layout); it now holds 4 lock flags and 4 run/stop flags.'],
    ['Manual vs code: DIP switches', 'SMS-4MAN.wpd: SW1, SW2 reserved; SW3 analog cal; SW4 digital cal. read_jumpers reads positions 1–4 as "a/d 1–4", 5 = digital cal, 6 = analog cal, 7/8 = v0/v1 and a front push-button; process_jumpers uses only 5 and 6. The manual and the code number the switches differently.'],
    ['The "half dB table" is the 0.1 dB table, by memory layout', 'The PIC sends 0x02 in the high bits ("select half dB table"). The SHARC\'s input_gain adds the 10-bit value to the address of <span class="mono">trim</span> (256 words): 0x200 + 121 lands in <span class="mono">point_one_db_table</span>, the third table after trim and volume. It only works because the four tables are declared back to back ('+inf+', from declaration order).'],
    ['"121 = unity" is 0.1 dB hot', 'point_one_dB_table.dat has 1.000 at entry 120 (−12 dB + 0.1 dB × index); entry 121 is +0.1 dB. So the default digital setting reads 0.1 dB high. Cal indices give: −20 dBFS +0.1 dB, −18 dBFS −1.9 dB, +4 dBu −4.7 dB, 0 dBu −0.7 dB.'],
    ['Implied analog full scale', 'The two analog constants are 4.0 dB apart, as they should be; together with the +3 dB in sport0_isr they put a full-scale A/D sine at about +19.3 dBu ('+inf+').'],
    ['synch_test checks an address, not data', '<span class="mono">r1=dma_in_a; r1 = r0 and r1</span> loads the buffer\'s address (dmblock1 starts at 0xC000 in vms44_LDF.LDF), not the sample. It cannot equal 0xFE, so after 20 main passes the SHARC jumps to Init_dsp once (re-init and LED shift-register flush) and, as the counter runs past 20, never again ('+inf+' from the linker map). The CPLD does inject a sync pattern (the _LC017·_LC018·TFSO term on DR0A/DR0B) that this test was meant to find.'],
    ['Misnamed label in the LED shifter', 'In shift_led_data, after right-row data (BIT31 set) the code jumps to <span class="mono">sel_left</span>, which sets FLG9 — "right select" per the header comment.'],
    ['Crossed flag words in refresh_lock_status', 'lock2 is ORed with anc_data[0] (v1) and lock3 with anc_data[3] (v4). Harmless on the SMS4A because the v words are always 0.'],
    ['Correlation meter details', 'PhaseMeterGet returns 128 when |L+R|+|L−R| is below 4e-4, so silence lights 3 of the 5 LEDs. The lit count rises toward out-of-phase (vms44_phase_data.dat: 0–50 → 5 LEDs, 205–255 → 1). A perfect mono signal gives trunc(128·1+128) = 256, one past the 256-entry table.'],
    ['Peak dot sits 3 dB under the PPM value', 'translate_meter_results adds 6 to the PPM index before pk_data (vms44_pk_data.dat has 262 entries: "NEED EXTRAS FOR 3dB OFFSET WITH VU").'],
    ['Why the SMS4A accepts 96 kHz', 'The board runs at a fixed 48 kHz from the PLL1700E; the CS8420 sample-rate converters re-time each AES input. The 1999|32 SMS4 (CS8412 + CS4330 DAC, no SRC) was specified 30–50 kHz; the SMS4A manual says 30–96 kHz. VUMeter constants are fixed for 48 kHz, which is safe only because of the SRC.'],
    ['1999|32 SMS4 code was cloned from the AMS4', 'SMS4V100.ASM … sms4v102.asm start with ";Audio Monitor Switcher(AMS4)". bnce_cnt1–4 are never initialised (the first change after power-up can take up to 256 passes). Variables are declared with RES after <span class="mono">org 20h</span> in program space and used as file-register addresses, which works only because the numbers coincide. lock4 is on RA5 because RA4 is open-drain.'],
    ['1999|32 versions', 'V100 (Feb 1999|32) starts with LOCK LEDs off and ad high; v101 (Jul 2002|35) targets the PIC16F73 and starts with LOCK on, ad off; v102 (Oct 2003|36) goes back to "list p=16C73A" but was built for another part (SMS4V102.ERR: warning 215 "Processor superceded by command line", message 301 header mismatch) and starts with both LOCK and ad high, so every LOCK LED lights at power-up until the debounce clears it. sms4v1xx.asm is byte-identical to sms4v102.asm.'],
    ['Duplicate and mislabelled files', '"SMS4 - #Artwork.cdr" is byte-identical to SMS4.cdr and is the 1999|32 block diagram, not panel artwork; the SMS4A silkscreen artwork the front drawing calls for ("SILKSCREEN TO ARTWORK") is not in the folder. "SMS4A - #Mechanical" and "SMS4 - #PCB" hold the same five DWGs. SMS443V4.$$$ equals sms443v4.asm. The #CUSTOM 55XXXX Systems/SMS folder repeats the old version (SMS4V100.ASM and SMS4V1XX.ASM there are identical to V100) and keeps the PDF renders used here.'],
    ['Drawing title blocks', 'SMS4A-FRONT.dwg (21 08 03) and SMS4-REAR.dwg (11 07 03) still carry POD10-REAR / ABB-M1 template text and two finishes ("POWDER COAT BEIGE", "TEXTURED BLACK TEXCOTE"); the notes block on the front says "WBS BLACK".'],
    ['Version labels', 'sms443v4.asm says "VERSION 2.00, August 12, 2003|36" (file date 2012|45); the WBS listing calls it SMS443V100. working.asm (Mar 2003|36) is the NAB prototype without autodetect; its history notes "Modified for CBC due to defective monitors" (VMS44 V1.01, Dec 2002|35).'],
  ];
  m.innerHTML = card('What the SMS is "up to" — findings', `<ol>${F.map(([h,b])=>`<li style="margin-bottom:8px"><b>${h}.</b> <span class="small">${b}</span></li>`).join('')}</ol>`) +
    card('Main assumptions', `<ul class="small"><li>PIC16F874 clock 4 MHz (sms4.pjt simulator setting) — sets every PIC timing. The 1999|32 PIC16C73A is assumed to run at 4 MHz too.</li><li>CS8420/CS8412 lock time 10 ms; CS8420 output muted while unlocked.</li><li>SMS4A LED layout inside the windows, segment colours, legends and input order on the rear.</li><li>1999|32 meter ballistics (1 ms attack, 300 ms decay) and LED colours; 1999|32 panel colour (black, white ink).</li><li>Analog full scale +19.3 dBu (derived from the calibration constants).</li></ul>`);
}

SIM.register({
  id:'sms', name:'SMS · SMS4A four-pair stereo LED meter system (2003|36)', duration:1,
  product:'SMS', year:2003, family:'Obsolete products', folder:'XXX - SMS - #Engineering #OBSOLETE',
  summary:'Rack meter bridge with four stereo pairs of LED bargraphs. The 2003|36 SMS4A (VMS44-3 board) auto-selects analog or AES per input with a PIC16F874, routes audio in an EPM3128 CPLD and computes 28-segment VU/peak and correlation meters on a SHARC; the 1999|32 SMS4 used CS8412 receivers, a PIC16C73A and LM3914 drivers.',
  highlights:['Front/rear panels: SMS4A to scale from the DWGs, 1999|32 SMS4 on its real silkscreen','PIC autodetect, CS8420 lock and CPLD source switch, pass by pass','Real VU/PPM/correlation recursions on every 48 kHz sample','80 Hz L/R LED multiplex and MM5450 shift frames','Calibration DIP switches traced into the SHARC gain table'],
  depth:'Full model',
  stepUnits:[
    {label:'1 PIC pass', period:()=>schedule().loopT},
    {label:'1 mux slot (300 samples)', period:()=>C.MUX/FS},
    {label:'1 sample (48 kHz)', period:()=>1/FS},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.1,'100 ms'],[0.025,'25 ms (one mux frame ×2)'],[0.006,'6 ms (≈1 PIC pass)'],[0.002,'2 ms (MM5450 shift)'],[0.0002,'200 µs (samples)']],
  defaultZoom:2,
  init(){ SCHED_KEY = ''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the SMS4A', render:viewTutorial},
    {id:'second', label:'One second, sample by sample', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
