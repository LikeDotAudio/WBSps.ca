/* =====================================================================
   POD14A — dual analog-to-AES/EBU converter (Ward-Beck Systems, 2008|41)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD14A - #Master/):
   - POD14A - #Engineering /Software/atmel/v100/d6203_test.c
       main(), SWITCH_ENCODER1, TRANSLATE_ENCODER1, REFRESH_LEDS, NO_LOCK_CHIRP, wait(),
       ADC_RESET_CONSTANT 5714 ("1 cycle = 175us"), RESET_MAX 2, SAVE_SETTINGS_CONSTANT, LOCK_CONSTANT 25
   - .../atmel/v100/D6203A.c/.h  ALTERA_write (the 8-bit control word), SAVE/RESTORE_INFORMATION_EEPROM,
       timer0_ovf_isr (500 Hz on PE3), LED / RESET port macros, REFERENCE_1/2, INTERNAL_REF, SR_32..SR_192
   - .../atmel/v100/altera.c/.h  write_data, ALTERA_RESET, ALTERA_read (ALTERA1..18), pin macros
   - .../atmel/v100/cs84xx.c/.h  init_CS8416 register values, CS8416_READ_LOCK_ALL (reg 0x0C),
       commented-out CS8416_READ_AUDIO_ALL (PCM bit), RESET_CS8416 (never called)
   - .../atmel/v100/shaft_encoder1.c  READ_ENCODER1 (PD2), DEBOUNCE_ENCODER1 (SWITCH1_DEBOUNCE 255)
   - .../altera/v100/POD14A.qsf (pins), POD14A_1.bdf (nets), SR_DETECT_192.vhd, mclk_sel.vhd,
       shift_in.vhd, shift_out.vhd, div_3_50.vhd, sel4_1.vhd, i2s_gen_cuv.vhd, i2s8416_aes.vhd, I2S_s_p.vhd
   - #POD #SERIES/POD14A - #Master/README.md (hardware + software analysis, netlist trace),
     POD14A - #Engineering /Software/README.md
   - POD14A - #Manual/POD14A MANUAL.docx (Rev Oct.01 2014), #Engineering/MANUAL/POD14A Manual.pdf (2009)
   - POD14A - #ARTWORK #DA #2016/POD14A-FRONT&REAR-SILK (CURVE).cdr → assets/pod14a-front.svg, -rear.svg, -rear-ink.svg (Artwork 2026|59),
     Pics/POD14A Front.jpg, POD14A Rear.jpg (panel colours and parts the silk does not show)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);

/* ---------------- constants from the source ---------------- */
const RATES = [32000, 44100, 48000, 96000, 192000];          // SR_32 … SR_192 (D6203A.h)
const RATE_TXT = ['32', '44.1', '48', '96', '192'];
const C = {
  LOOP_T: 175e-6,              // d6203_test.c: "#define ADC_RESET_CONSTANT 5714 //1 cycle = 175us or 5714 cycles = 1 sec"
  ADC_RESET_CONSTANT: 5714,
  RESET_MAX: 2,
  SAVE_SETTINGS_CONSTANT: 57140,   // 5714*10
  LOCK_CONSTANT: 25,
  SWITCH1_DEBOUNCE: 255,
  CHIRP_ON: 1000, CHIRP_OFF: 7000, // NO_LOCK_CHIRP_CONSTANT_ON/OFF (altera.h)
  WAIT_IT: 1e-6,               // wait(50000) is commented "50ms of delay" → 1 µs per iteration
  EE_WRITE: 8.5e-3,            // ATmega128 EEPROM byte write (datasheet) × 3 bytes — INFERRED duration
  FPGA_CONF: 0.030,            // EP1C3 Active-Serial load from the M25P40 — INFERRED
  CS_LOCK_FRAMES: 64,          // CS8416 PLL acquisition — INFERRED
  ADC_CAL: 8192,               // AK5394A offset calibration after RSTN rises, in LRCK periods — INFERRED
  PRESS: 0.12,                 // how long a click holds the step switch down — INFERRED
  HORIZON: 12,                 // the emulator runs 12 s so the 2.1 s double reset and the 10 s EEPROM save are visible
};
const CS_BITS = new Set([0,18,19,21,187,189,190]);   // i2s_gen_cuv constant channel status (README §I.6)
const REF_NAME = {0:'REFERENCE_1', 1:'REFERENCE_2', 2:'EXTERNAL_REF(2)', 3:'INTERNAL_REF'};
const REF_SHORT = {0:'REF1', 1:'REF2', 2:'(2)', 3:'INT'};
const portName = p => p==='phx' ? 'REF INPUT Phoenix (110 Ω, TB5 → T2 → IN1_110 → FPGA pin 68 REF1)' : 'REF INPUT BNC (75 Ω, BNC1 → T1 → IN1_75 → FPGA pin 70 REF2)';
const fmtRate = r => (r/1000).toLocaleString(undefined,{maximumFractionDigits:1})+' kHz';
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');

/* main-loop steps (order and names from main() in d6203_test.c; the split of the 175 µs is INFERRED) */
const STEPS = [
  ['WDR · SWITCH_ENCODER1', .06, 'READ_ENCODER1 reads PD2; TRANSLATE_ENCODER1 steps sample_rate on a press; DEBOUNCE_ENCODER1'],
  ['CS8416_READ_LOCK_ALL · INVERT_DATA', .30, 'CS8416_read1(0x0C) over PC1–PC3/PC6; any error bit = NO_LOCK; Astatus = ~status & BIT0'],
  ['ALTERA_write', .22, 'reference_sel = (Astatus && clocks_stable) ? reference : INTERNAL_REF; write_data(0), write_data(word); strobe PE7'],
  ['reference_sel change · reset_count', .06, 'A new reference_sel sets reset_adc; while resetting count reset_count to ADC_RESET_CONSTANT'],
  ['NO_LOCK_CHIRP · REFRESH_LEDS', .12, 'chirp_on toggles (drives nothing); LEDs on PD3–PD7, PG0 EXT, PG1 INT; CAL_LED_ON = PE6'],
  ['WDR · save_settings', .04, 'Count SAVE_SETTINGS_CONSTANT passes, then SAVE_INFORMATION_EEPROM (3 bytes)'],
  ['sample_rate / Astatus change · clocks_stable', .10, 'Rate change in internal mode sets reset_adc; count LOCK_CONSTANT locked passes → clocks_stable'],
  ['unlock_count → REF1 ⇄ REF2', .04, 'While unlocked, swap reference every 26 passes (≈4.55 ms) to try the other connector'],
  ['RESET_LOW / RESET_HIGH (PE2)', .06, 'Drive the ADC reset; between the two resets wait(50000) × 2 = 100 ms (blocking)'],
];
const FR = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const VARS = ['sample_rate','psample_rate','reference','reference_sel','preference_sel','Astatus','pAstatus','clocks_stable','clocks_stable_count',
  'lock_status_changed','reset_adc','reset_count','no_of_adc_resets','unlock_count','switch1','release1','switch1_counter','chirp_on','no_lock_counter',
  'save_settings','save_settings_count','da_disabled'];
const VI = {}; VARS.forEach((v,i)=>VI[v]=i);

/* ---------------- scenarios ---------------- */
const SCEN = {
  run48:  {name:'Running on internal 48 kHz (no reference)', init:{power:true, sr:2, ref:null}, ev:[]},
  cold:   {name:'Power-up from cold at 0 s', init:{power:false, sr:2, ref:null}, ev:[{t:0, type:'power', on:true}]},
  refbnc: {name:'House reference (48 kHz) plugged into the REF BNC at 200 ms', init:{power:true, sr:2, ref:null}, ev:[{t:0.2, type:'ref', on:true, port:'bnc', rate:48000, valid:true}]},
  refphx: {name:'Reference on the REF Phoenix at 100 ms (the scan has to find it)', init:{power:true, sr:2, ref:null}, ev:[{t:0.1, type:'ref', on:true, port:'phx', rate:48000, valid:true}]},
  lost:   {name:'Locked to a 96 kHz reference; cable pulled at 300 ms', init:{power:true, sr:2, ref:{on:true, port:'bnc', rate:96000, valid:true}}, ev:[{t:0.3, type:'ref', on:false}]},
  step:   {name:'Step switch pressed at 100 ms (48 → 96 kHz)', init:{power:true, sr:2, ref:null}, ev:[{t:0.1, type:'press', dur:C.PRESS}]},
  vbit:   {name:'Programme feed with the V bit set used as reference at 100 ms', init:{power:true, sr:2, ref:null}, ev:[{t:0.1, type:'ref', on:true, port:'bnc', rate:48000, valid:false}]},
  badee:  {name:'Power-up with a corrupt EEPROM (sample_rate = 7)', init:{power:false, sr:2, ref:null, ee:{sig:0xAA, ref:1, sr:7}}, ev:[{t:0, type:'power', on:true}]},
};

/* ---------------- device state (what the user controls) ---------------- */
const D = {
  scenario: 'run48',
  init: null, events: [],
  refRate: 48000, refValid: true,
  inputs: [ { L:{on:true, dbu:4, f:1000}, R:{on:true, dbu:4, f:400} }, { L:{on:true, dbu:-6, f:1000}, R:{on:false, dbu:4, f:1000} } ],
  trim: [0,0,0,0],            // RV1 In1 R, RV2 In1 L, RV3 In2 R, RV4 In2 L (dB, ±0.18)
  jumper: [false,false,false,false],   // H3 In1 R, H4 In1 L, H5 In2 R, H6 In2 L (+2.2 dB)
  drift: false,
  log: [],
};
function loadScenario(id){
  const s = SCEN[id]; D.scenario = id;
  D.init = JSON.parse(JSON.stringify(s.init));
  D.events = JSON.parse(JSON.stringify(s.ev)).map(e=>(e.scn=true, e));
  EMU_KEY = '';
}

/* =====================================================================
   THE EMULATOR — runs main() pass by pass with the firmware's own variables.
   Each pass is 175 µs (the source's own figure). Blocking waits and EEPROM writes stretch a pass.
   ===================================================================== */
let EMU = null, EMU_KEY = '';
function emulate(){
  const key = JSON.stringify([D.init, D.events]);
  if (key === EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const H = C.HORIZON, LT = C.LOOP_T;
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  const N = Math.ceil(H/LT) + 50;
  const P = { t0:new Float64Array(N), x5:new Float32Array(N), x8:new Float32Array(N), word:new Uint8Array(N), snap:new Int32Array(N*VARS.length), n:0, special:[] };
  const sig = {};
  const rec = (k,t,v)=>{ const a = sig[k] || (sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; if (a.length>1 && a[a.length-2][1]===v) a.pop(); return; } } a.push([t,v]); };
  const notes = []; const note = (t,txt,cls)=>notes.push({t, txt, cls:cls||''});
  const boots = [];
  let ei = 0;
  let ref = Object.assign({on:false, port:'bnc', rate:48000, valid:true, t:-1e9}, D.init.ref||{}); ref.t = -1e9;
  const presses = ev.filter(e=>e.type==='press');
  let ee = Object.assign({sig:0xAA, ref:1, sr:D.init.sr}, D.init.ee||{});
  const fp = { word:0, conf:true, selT:-1e9, cs:false };
  let V = null;
  rec('ee', 0, ee.sr*16+ee.ref); rec('rrate', 0, ref.rate); rec('rvalid', 0, ref.valid?1:0); rec('ref', 0, ref.on?(ref.port==='phx'?1:2):0);

  function applyEvents(t){
    while (ei < ev.length && ev[ei].t <= t){ const e = ev[ei++];
      if (e.type==='ref'){
        if (e.on) ref = {on:true, port:e.port, rate:e.rate, valid:e.valid!==false, t:e.t};
        else ref = Object.assign({}, ref, {on:false, t:e.t});
        rec('ref', e.t, ref.on?(ref.port==='phx'?1:2):0); rec('rrate', e.t, ref.rate); rec('rvalid', e.t, ref.valid?1:0);
        note(e.t, ref.on ? `Reference ${fmtRate(ref.rate)}${ref.valid?'':' with the V bit set'} appears on the ${portName(ref.port)}` : 'Reference cable removed: the CS8416 input goes quiet', 'in');
      } else if (e.type==='press') note(e.t, 'Step switch SW1 pressed: PD2 pulled low (R93 10 k pull-up to +5 V, R94 332 Ω series)', 'in');
    }
  }
  const pressed = t => presses.some(e=> t>=e.t && t < e.t + (e.dur||C.PRESS));
  function latch(t, w){
    const old = fp.word; fp.word = w;
    if ((old&3) !== (w&3)) fp.selT = t;
    rec('word', t, w);
  }
  function fresh(){ const v = {}; VARS.forEach(k=>v[k]=0); Object.assign(v,{reference_sel:3, preference_sel:0xFF, pAstatus:0xFF, lock_status_changed:1}); return v; }
  function lockAt(t){   // the CS8416 as the MCU sees it through register 0x0C
    const w = fp.word & 3, port = w===0 ? 'phx' : w===1 ? 'bnc' : null;     // sel4_1: REF1/REF2 → RXP3 (pin 75)
    const cond = fp.cs && fp.conf && ref.on && ref.port===port;
    const since = Math.max(ref.t, fp.selT);
    const pll = cond && (t - since) >= C.CS_LOCK_FRAMES/ref.rate;
    rec('pll', pll ? Math.max(since + C.CS_LOCK_FRAMES/ref.rate, 0) : Math.max(0, Math.min(t, since)), pll?1:0);
    return pll && ref.valid;
  }
  function offAt(t, why){
    rec('power',t,0); rec('rst',t,0); rec('fconf',t,0); rec('pll',t,0); rec('ledE',t,0); rec('ledI',t,0); rec('ledR',t,255); rec('cal',t,0); rec('chirp',t,0);
    rec('save',t,0); fp.conf=false; fp.cs=false;
    if (why) note(t, why, 'boot');
  }
  function steadyInit(t){
    V = fresh(); fp.cs = true; fp.conf = true;
    V.sample_rate = D.init.sr;
    if (ref.on){ V.reference = ref.port==='phx'?0:1; V.Astatus=ref.valid?1:0; V.clocks_stable=V.Astatus; V.lock_status_changed=0; V.reference_sel = V.Astatus?V.reference:3; V.unlock_count=100; }
    else { V.reference = 1; V.Astatus = 0; V.clocks_stable = 0; V.reference_sel = 3; V.lock_status_changed = 0; }
    V.preference_sel = V.reference_sel; V.psample_rate = V.sample_rate; V.pAstatus = V.Astatus; V.no_of_adc_resets = C.RESET_MAX;
    fp.selT = -1e9;
    const w = ((V.da_disabled<<7)|(V.reference_sel<<5)|(V.sample_rate<<2)|V.reference) & 255; fp.word = w; rec('word', t - 10, w);
    const tb = t - 10;   // the unit has been running for a while: backdate so nothing looks freshly started
    rec('power',tb,1); rec('rst',tb,1); rec('fconf',tb,1); rec('cs',tb,1); rec('pll',tb,ref.on?1:0);
    if (!D.init.ee) ee = {sig:0xAA, ref:V.reference, sr:V.sample_rate}; rec('ee', t, ee.sr*16+ee.ref);
    led(t);
  }
  function led(t){   // REFRESH_LEDS
    if (V.reference_sel===3){ rec('ledI',t,1); rec('ledE',t,0); }
    else if (V.reference_sel===0 || V.reference_sel===1){ rec('ledE',t,1); rec('ledI',t,0); }
    if (V.sample_rate<=4) rec('ledR', t, V.sample_rate);           // no else-branch: a value > 4 leaves the LEDs as they were
    rec('cal', t, V.reset_adc?1:0);
    rec('chirp', t, V.chirp_on?1:0);
  }
  function boot(tp, tEnd){
    V = fresh(); V.da_disabled = 1;
    const b = { a:tp, phases:[] }; boots.push(b);
    const ok = t => t < tEnd;
    rec('power',tp,1); rec('rst',tp,0); rec('fconf',tp,0); rec('cs',tp,0); rec('pll',tp,0); rec('ledE',tp,0); rec('ledI',tp,0); rec('ledR',tp,255); rec('cal',tp,0); rec('chirp',tp,0);
    fp.conf = false; fp.cs = false;
    note(tp, 'Power on → main(): init_devices() — port_init() (PORTC = 0x00 holds the CS8416 in reset on PC7, PORTD/PG = 0 → all LEDs off), watchdog_init() (WDTCR = 0x08), timer0_init() (1 ms overflow → PE3 = 500 Hz gate to FPGA5)', 'boot');
    note(tp, 'RESET_LOW (PE2 → FPGA6 → both AK5394A RSTN low); da_disabled = YES', 'boot');
    let t = tp + 5e-6;
    const cfgA = t, cfgB = t + 1000*C.WAIT_IT;
    b.phases.push([tp, cfgB, 'init · ALTERA_RESET(1000)']);
    note(cfgA, 'ALTERA_RESET(1000): PC0 high → Q1 pulls nCONFIG low ≈1 ms — the Cyclone erases itself', 'boot');
    t = cfgB; const confDone = t + C.FPGA_CONF;
    b.phases.push([t, t+0.150, 'wait(30000) × 5 = 150 ms (FPGA loads from M25P40)']);
    if (ok(confDone)){ rec('fconf', confDone, 1); fp.conf = true; rec('word', confDone, 0); fp.word = 0; note(confDone, 'Cyclone EP1C3 configured from the M25P40 in Active-Serial mode (time ≈30 ms is inferred); shift_in latch holds 0', 'boot'); }
    t += 0.150;
    if (!ok(t)) return t;
    fp.cs = true; rec('cs', t, 1);
    note(t, 'init_CS8416(): RS1 high, then registers 0x00–0x06 = 00 04 08 88 9B B0 10 (RUN, input RXP3, AES3-direct serial out, master)', 'boot');
    V.reference_sel = 1; V.reference = 1; V.sample_rate = 2;
    V.reference_sel = (V.Astatus && V.clocks_stable) ? V.reference : 3;
    const w = ((V.da_disabled<<7)|(V.reference_sel<<5)|(V.sample_rate<<2)|V.reference)&255; latch(t, w);
    note(t, `reference = REFERENCE_2, sample_rate = SR_48 → ALTERA_write(): Astatus is still 0, so reference_sel = INTERNAL_REF; word ${hex2(w)} (${bin8(w)}b, da_disabled = 1: outputs muted)`, 'boot');
    rec('rst', t, 1); note(t, 'RESET_HIGH (ADCs run); wait(50000) × 15 = 750 ms', 'boot');
    b.phases.push([t, t+0.75, 'ADCs released · 15 × wait(50000) = 750 ms']);
    t += 0.75; if (!ok(t)) return t;
    rec('rst', t, 0); rec('rst', t+2e-6, 1); t += 4e-6;
    note(t, 'RESET_LOW then RESET_HIGH (a pulse of a few µs)', 'boot');
    if (ee.sig === 0xAA){ V.reference = ee.ref; V.sample_rate = ee.sr; note(t, `RESTORE_INFORMATION_EEPROM(): address 10 = 0xAA → reference = ${ee.ref} (addr 13), sample_rate = ${ee.sr} (addr 14)${ee.sr>4?' — no range check! (Findings S1)':''}`, 'boot'); }
    else note(t, 'RESTORE_INFORMATION_EEPROM(): no 0xAA signature → keep REFERENCE_2 / SR_48', 'boot');
    V.da_disabled = 0; note(t, 'da_disabled = NO; enter while(1)', 'boot');
    b.loop = t;
    return t;
  }
  function runPasses(t, tEnd){
    while (t < tEnd && t < H && P.n < N){
      applyEvents(t);
      const t0 = t, n = P.n;
      let x5 = 0, x8 = 0;
      const ts = k => t0 + FR[k]*LT + (k>5 ? x5 : 0);
      /* 0: SWITCH_ENCODER1 */
      if (pressed(t0)){
        if (!V.release1 && !V.switch1){ V.switch1 = 1; const o=V.sample_rate; V.sample_rate = (V.sample_rate===4) ? 0 : (V.sample_rate+1)&255;
          note(t0, `pass ${n}: SWITCH_ENCODER1 → READ_ENCODER1() sees PD2 low → TRANSLATE_ENCODER1(): switch1 = 1; sample_rate ${o} → ${V.sample_rate}${o===4?' (SAMPLE_RATE_MAX → SAMPLE_RATE_MIN)':''}`, 'act'); }
      } else if (V.switch1 && !V.release1){ V.release1 = 1; note(t0, `pass ${n}: switch released → release1 = 1; DEBOUNCE_ENCODER1 now ignores PD2 for 255 passes (≈45 ms)`, 'act'); }
      if (V.release1){ if (V.switch1_counter < C.SWITCH1_DEBOUNCE) V.switch1_counter++; else { V.switch1_counter=0; V.release1=0; V.switch1=0; } }
      /* 1: CS8416_READ_LOCK_ALL */
      const lk = lockAt(ts(1)) ? 1 : 0;
      if (lk !== V.Astatus) note(ts(1), `pass ${n}: CS8416_READ_LOCK_ALL(): register 0x0C ${lk?'= 0x00 → INVERT_DATA → Astatus = 1 (LOCK)':'≠ 0 → Astatus = 0 (NO_LOCK)'}${!lk && ref.on && !ref.valid ? ' — the V bit counts as an error' : ''}`, 'lock');
      V.Astatus = lk; rec('ast', ts(1), lk);
      /* 2: ALTERA_write */
      const oldSel = V.reference_sel;
      V.reference_sel = (V.Astatus && V.clocks_stable) ? V.reference : 3;
      const w = ((V.da_disabled<<7)|(V.reference_sel<<5)|(V.sample_rate<<2)|V.reference) & 255;
      if (w !== fp.word) note(ts(3), `pass ${n}: ALTERA_write(): word ${hex2(fp.word)} → ${hex2(w)} (${bin8(w)}b) shifted on PE5/PE6, strobed on PE7 → shift_in latch → FPGA`, ((fp.word^w)&~3)===0 ? 'scanbus' : 'bus');
      latch(ts(3), w); P.word[n] = w;
      if (oldSel !== V.reference_sel) rec('rsel', ts(3), V.reference_sel);
      /* 3: reference_sel change, reset counting */
      if (V.reference_sel !== V.preference_sel){
        note(ts(3), `pass ${n}: reference_sel ${REF_NAME[V.preference_sel]||'0xFF'} → ${REF_NAME[V.reference_sel]}: reset_adc = YES, no_of_adc_resets = 0`, 'ref');
        V.preference_sel = V.reference_sel; V.reset_adc = 1; V.no_of_adc_resets = 0; }
      if (V.reset_adc){ if (V.reference_sel===V.preference_sel && V.sample_rate===V.psample_rate){
          if (V.reset_count >= C.ADC_RESET_CONSTANT){ V.reset_adc=0; V.reset_count=0; V.no_of_adc_resets++; note(ts(3), `pass ${n}: reset_count reached ADC_RESET_CONSTANT (5714) → reset_adc = NO, no_of_adc_resets = ${V.no_of_adc_resets}`, 'adc'); }
          else V.reset_count++; } }
      /* 4: NO_LOCK_CHIRP, REFRESH_LEDS */
      if (!V.no_lock_counter){ if (V.chirp_on){ V.no_lock_counter = C.CHIRP_OFF; V.chirp_on = 0; } else { V.no_lock_counter = C.CHIRP_ON; V.chirp_on = 1; } } else V.no_lock_counter--;
      const pE = sv0(sig,'ledE',0), pI = sv0(sig,'ledI',0), pR = sv0(sig,'ledR',255);
      led(ts(4));
      const nE = sv0(sig,'ledE',0), nI = sv0(sig,'ledI',0), nR = sv0(sig,'ledR',255);
      if (pE!==nE || pI!==nI || pR!==nR) note(ts(4), `pass ${n}: REFRESH_LEDS(): ${nE?'EXTERNAL_LED_ON (PG0)':''}${nI?'INTERNAL_LED_ON (PG1)':''} · rate LED ${nR<=4?'SR'+RATE_TXT[nR].replace('.1','')+'_LED_ON':'none lit'}`, 'led');
      /* 5: save_settings */
      if (V.save_settings){
        if (V.save_settings_count >= C.SAVE_SETTINGS_CONSTANT){ x5 = 3*C.EE_WRITE; ee = {sig:0xAA, ref:V.reference, sr:V.sample_rate};
          note(ts(5), `pass ${n}: SAVE_INFORMATION_EEPROM(): 0xAA → addr 10, reference ${V.reference} → 13, sample_rate ${V.sample_rate} → 14 (the loop stalls ≈25 ms in EEPROMwrite, inferred)`, 'ee');
          rec('ee', ts(5)+x5, ee.sr*16+ee.ref); rec('eew', ts(5), 1); rec('eew', ts(5)+x5, 0); V.save_settings=0; V.save_settings_count=0; }
        else V.save_settings_count++; }
      rec('save', ts(5), V.save_settings);
      /* 6: sample-rate change, lock change, clocks_stable */
      if (V.sample_rate !== V.psample_rate){ V.psample_rate = V.sample_rate;
        if (V.reference_sel===3){ V.reset_adc=1; V.no_of_adc_resets=0; note(ts(6), `pass ${n}: sample_rate changed while reference_sel = INTERNAL_REF → reset_adc = YES, no_of_adc_resets = 0`, 'adc'); }
        else note(ts(6), `pass ${n}: sample_rate changed while locked to the reference → no ADC reset and save_settings is not set (Findings S3); only the rate LED moves`, 'adc'); }
      if (V.Astatus !== V.pAstatus){ V.pAstatus = V.Astatus; V.lock_status_changed = 1; }
      if (V.lock_status_changed){
        if (V.Astatus){ if (V.clocks_stable_count >= C.LOCK_CONSTANT){ V.clocks_stable=1; V.lock_status_changed=0; note(ts(6), `pass ${n}: clocks_stable_count reached LOCK_CONSTANT (25) → clocks_stable = YES; the next ALTERA_write switches to the reference`, 'lock'); }
                        else { V.clocks_stable_count++; V.clocks_stable=0; } }
        else { V.clocks_stable=0; V.clocks_stable_count=0; }
      } else V.clocks_stable_count = 0;
      rec('cst', ts(6), V.clocks_stable);
      /* 7: scan */
      if (!V.Astatus && V.unlock_count >= C.LOCK_CONSTANT){ V.unlock_count = 0; const o = V.reference; V.reference = (V.reference===0) ? 1 : 0;
        note(ts(7), `pass ${n}: Astatus = NO_LOCK and unlock_count ≥ 25 → reference ${REF_SHORT[o]} → ${REF_SHORT[V.reference]} (next ALTERA_write points sel4_1 at the ${V.reference?'BNC':'Phoenix'})`, 'scan'); }
      else V.unlock_count = (V.unlock_count + 1) & 255;
      /* 8: reset line, the 100 ms gap */
      if (V.reset_adc){ rec('rst', ts(8), 0); V.save_settings = 1; } else rec('rst', ts(8), 1);
      if (!V.reset_adc && V.no_of_adc_resets < C.RESET_MAX){
        x8 = 0.1; note(ts(8), `pass ${n}: reset_adc = NO and no_of_adc_resets = ${V.no_of_adc_resets} < RESET_MAX → RESET_HIGH, wait(50000) × 2 = 100 ms with the loop blocked, then reset_adc = YES again`, 'adc');
        rec('wait', ts(8), 1); rec('wait', ts(8)+x8, 0); V.reset_adc = 1; }
      rec('radc', ts(8), V.reset_adc);
      /* snapshot */
      P.t0[n] = t0; P.x5[n] = x5; P.x8[n] = x8; const o = n*VARS.length; VARS.forEach((k,i)=>P.snap[o+i] = V[k]|0);
      if (x5 || x8) P.special.push(n);
      P.n++;
      t = t0 + LT + x5 + x8;
    }
    return t;
  }
  /* power intervals */
  const segs = []; { let on = D.init.power, st = 0, steady = D.init.power;
    ev.filter(e=>e.type==='power').forEach(e=>{ if (e.on===on) return; if (on) segs.push({a:st, b:e.t, steady}); on=e.on; st=e.t; steady=false; });
    if (on) segs.push({a:st, b:H, steady}); }
  let cur = 0;
  if (!segs.length || segs[0].a > 0) offAt(0);
  for (const s of segs){
    if (s.a > cur){ applyEvents(s.a); if (cur>0) offAt(cur, 'Power off'); }
    applyEvents(s.a);
    let t;
    if (s.steady){ steadyInit(s.a); t = s.a; }
    else { t = boot(s.a, s.b); const bb = boots[boots.length-1]; if (bb.loop===undefined) bb.loop = s.b; }
    if (t < s.b) runPasses(t, s.b);
    if (s.b < H) offAt(s.b, 'Power switched off: every rail collapses, the EEPROM keeps reference and sample_rate');
    cur = s.b;
  }
  applyEvents(H);
  EMU = { P, sig, notes, boots, ee };
  /* output-rate segments (for the AES and ADC lanes) */
  const keys = ['power','fconf','word','pll','rrate']; const ts = new Set([0]);
  keys.forEach(k=> (sig[k]||[]).forEach(p=>ts.add(p[0])));
  const fs = []; [...ts].filter(x=>x>=0 && x<=H).sort((a,b)=>a-b).forEach(t=>{ const v = fsAt(t); if (!fs.length || fs[fs.length-1][1]!==v) fs.push([t,v]); });
  sig.fs = fs;
  return EMU;
}
function sv0(sig, name, def){ const a = sig[name]; return (a && a.length) ? a[a.length-1][1] : def; }
function idxAt(a, t){ let lo=0, hi=a.length-1; if (!a.length || a[0][0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a = emulate().sig[name]; if (!a) return def; const i = idxAt(a,t); return i<0 ? def : a[i][1]; }
function since(name, t){ const a = emulate().sig[name]; if (!a) return 0; const i = idxAt(a,t); return i<0 ? 0 : a[i][0]; }
/* output sample rate at t: 0 = no AES (off / unconfigured), -1 = CS8416 unlocked (RMCK free-running) */
function fsAt(t){
  const sig = emulate().sig, g=(k,d)=>{ const a=sig[k]; if(!a) return d; const i=idxAt(a,t); return i<0?d:a[i][1]; };
  if (!g('power',0) || !g('fconf',0)) return 0;
  const w = g('word',0), rs = (w>>5)&3;
  if (rs===3){ const s=(w>>2)&7; return RATES[Math.min(s,4)]; }       // mclk_sel: sr ≥ 4 falls into the "else" (192 k) branch
  return g('pll',0) ? g('rrate',48000) : -1;
}
function passAt(t){ const E=emulate(), P=E.P; if (!P.n || P.t0[0] > t) return -1; let lo=0, hi=P.n-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (P.t0[m]<=t) lo=m; else hi=m-1; } return lo; }
function passEnd(i){ const P=emulate().P; return P.t0[i] + C.LOOP_T + P.x5[i] + P.x8[i]; }
function snap(i){ const P=emulate().P; const o={}; if (i<0) return null; VARS.forEach((k,j)=>o[k]=P.snap[i*VARS.length+j]); return o; }
function finalSnap(){ const P=emulate().P; return P.n? snap(P.n-1) : null; }
function stepBounds(i){ const P=emulate().P, t0=P.t0[i], LT=C.LOOP_T; const b=[]; for (let k=0;k<=STEPS.length;k++){ let t=t0 + (k<STEPS.length?FR[k]:1)*LT; if (k>5) t+=P.x5[i]; if (k===STEPS.length) t+=P.x8[i]; b.push(t); } return b; }
function stepAt(t){
  const i = passAt(t); if (i<0) return {pass:-1, step:-1};
  if (t >= passEnd(i)) return {pass:i, step:-2};          // after the last pass (power off)
  const b = stepBounds(i); let k=0; for (let j=0;j<STEPS.length;j++) if (t>=b[j]) k=j;
  const waiting = k===8 && emulate().P.x8[i] && t >= b[8] + 0.06*C.LOOP_T;
  const saving = k===5 && emulate().P.x5[i] && t >= b[5] + 0.02*C.LOOP_T;
  return {pass:i, step:k, waiting, saving};
}
function bootAt(t){ const E=emulate(); for (const b of E.boots){ if (t>=b.a && (b.loop===undefined || t<b.loop)) return b; } return null; }
function powerAt(t){ return !!sv('power',t,0); }
function ledsAt(t){ if (!powerAt(t)) return {pwr:0,E:0,I:0,R:255}; return {pwr:1, E:sv('ledE',t,0), I:sv('ledI',t,0), R:sv('ledR',t,255)}; }
function adcAt(t){   // AK5394A state
  const fs = fsAt(t);
  if (!powerAt(t)) return {st:'off'};
  if (!sv('rst',t,0)) return {st:'reset', since:since('rst',t)};
  const rel = since('rst',t), f = fs>0 ? fs : 48000;
  if (t - rel < C.ADC_CAL/f) return {st:'cal', since:rel, until:rel + C.ADC_CAL/f};
  return {st:fs===0?'noclk':'run'};
}
function dbfs(k, s){ const ch = D.inputs[k][s?'R':'L']; const ti = k*2 + (s?0:1); return ch.dbu - 24 + D.trim[ti] + (D.jumper[ti]?2.2:0); }
function outSample(k, s, t){
  const fs = fsAt(t); if (fs<=0) return null;
  const n = Math.floor(t*fs), tn = n/fs;
  if (adcAt(tn).st !== 'run') return 0;
  const ch = D.inputs[k][s?'R':'L']; if (!ch.on) return 0;
  const v = Math.pow(10, dbfs(k,s)/20) * Math.sin(2*Math.PI*ch.f*tn);
  return Math.max(-0.99999988, Math.min(0.99999988, v));
}
function detFor(fs){ return fs>125000 ? 2 : fs>60000 ? 1 : 0; }     // SR_DETECT_192 thresholds 0x7D00 / 0x3C00 counts per 1 ms gate
function refStateAt(t){   // the reference cable as the user set it (inputs, not what the unit detected)
  let r = Object.assign({on:false, port:'bnc', rate:48000, valid:true}, D.init.ref||{});
  D.events.filter(e=>e.type==='ref' && e.t<=t).sort((a,b)=>a.t-b.t).forEach(e=>{ r = e.on ? {on:true, port:e.port, rate:e.rate, valid:e.valid!==false} : Object.assign({}, r, {on:false}); });
  return r;
}

/* ---------------- user actions (what the buttons do in code) ---------------- */
function act(name, fn){
  const tr = []; const t = SIM.t;
  fn(s=>tr.push(s));
  EMU_KEY = ''; const E = emulate();
  const later = E.notes.filter(n=> n.t >= t - 1e-9 && n.t <= t + 2.5 && n.cls!=='in');
  let scans = 0; const out = [];
  for (const n of later){ if (n.cls==='scan'||n.cls==='scanbus'){ scans++; if (scans===4){ out.push({t:n.t, txt:'… the scan keeps alternating REF1 / REF2 every 26 passes (≈4.55 ms) while unlocked'}); } if (scans>3) continue; } out.push(n); if (out.length>=16) break; }
  out.forEach(n=> tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))}</span> ${n.txt}`));
  D.log.unshift({t, name, trace:tr}); if (D.log.length>50) D.log.length=50;
  SIM.refresh();
}
const A = {
  press(){ act('Press the STEP switch', tr=>{
    if (!powerAt(SIM.t)) tr('The unit is off: the press does nothing.');
    tr(`SW1 closes for ${C.PRESS*1000|0} ms (${inf}). The firmware only polls PD2 once per 175 µs pass; there is no interrupt.`);
    D.events.push({t:SIM.t, type:'press', dur:C.PRESS, user:true}); }); },
  plug(port){ const r = refStateAt(SIM.t);
    if (r.on && r.port===port){ act(`Unplug the reference from the ${port==='phx'?'Phoenix':'BNC'}`, tr=>{ tr(`The ${portName(port)} goes quiet.`); D.events.push({t:SIM.t, type:'ref', on:false, user:true}); }); return; }
    act(`Plug a ${fmtRate(D.refRate)} reference into the ${port==='phx'?'REF Phoenix':'REF BNC'}`, tr=>{
      if (r.on) tr(`(The cable moves from the ${r.port==='phx'?'Phoenix':'BNC'}: one reference generator.)`);
      tr(`${portName(port)} → DS34LV86 → sel4_1 (driven by the reference bits of the control word) → AES_8416 (pin 75) → CS8416 RXP3`);
      D.events.push({t:SIM.t, type:'ref', on:true, port, rate:D.refRate, valid:D.refValid, user:true}); }); },
  unplug(){ const r = refStateAt(SIM.t); if (!r.on) return; A.plug(r.port); },
  refRate(rate){ D.refRate = rate; const r = refStateAt(SIM.t);
    if (r.on) act(`Reference generator → ${fmtRate(rate)}`, tr=>{ tr('The CS8416 loses lock and re-acquires at the new rate; SR_DETECT_192 re-classifies REF_MCLK on its 1 ms gates.'); D.events.push({t:SIM.t, type:'ref', on:true, port:r.port, rate, valid:r.valid, user:true}); });
    else SIM.refresh(); },
  refValid(v){ D.refValid = v; const r = refStateAt(SIM.t);
    if (r.on) act(v?'Reference V bit cleared (valid)':'Reference V bit set (programme feed)', tr=>{ tr('CS8416 register 0x0C reports the validity error; CS8416_READ_LOCK_ALL treats any non-zero value as NO_LOCK.'); D.events.push({t:SIM.t, type:'ref', on:true, port:r.port, rate:r.rate, valid:v, user:true}); });
    else SIM.refresh(); },
  power(){ const on = powerAt(SIM.t); act(on?'Power switch off':'Power switch on', tr=>{ tr(on? 'Mains off: the VAF1005 5 V module and all rails drop.' : 'Mains on: 5 V module → LM1117 3.3 V → ATmega128L comes out of reset (R92/C128) and runs main().'); D.events.push({t:SIM.t, type:'power', on:!on, user:true}); }); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['Events replaced; the emulator re-ran the firmware from 0 to 12 s.']}); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
  input(k, s, prop, v){ const ch = D.inputs[k][s?'R':'L']; ch[prop] = v;
    D.log.unshift({t:SIM.t, name:`INPUT${k+1} ${s?'RIGHT':'LEFT'} ${prop==='dbu'?'level '+v+' dBu':prop==='f'?'frequency '+v+' Hz':v?'connected':'disconnected'}`,
      trace:[`Analog only — the firmware is not involved. ${k?'TB3/TB4':'TB1/TB2'} → 21.5 k / 10 k leg dividers → NE5532 instrumentation pair (${k?'U9/U7':'U6/U4'}) → AK5394A ${k?'U8':'U5'} AIN${s?'R':'L'}±.`,
        `Output = ${ch.on?dbfs(k,s).toFixed(2)+' dBFS':'digital silence'} (0 dBFS = +24 dBu; +4 dBu → −20 dBFS; trim ${D.trim[k*2+(s?0:1)].toFixed(2)} dB${D.jumper[k*2+(s?0:1)]?', jumper +2.2 dB':''})${ch.on&&dbfs(k,s)>0?' — CLIPPING':''}`]}); SIM.refresh(); },
  trim(i, d){ D.trim[i] = Math.max(-0.18, Math.min(0.18, +(D.trim[i]+d).toFixed(3)));
    const nm = ['RV1 (Input 1 Right)','RV2 (Input 1 Left)','RV3 (Input 2 Right)','RV4 (Input 2 Left)'][i];
    D.log.unshift({t:SIM.t, name:`Trim ${nm} → ${D.trim[i]>=0?'+':''}${D.trim[i].toFixed(2)} dB`, trace:[`${nm} is a 2 k rheostat in series with the 21.5 k gain resistor: 1 + 20k / (21.5k + 0…2k) gives a total range of only 0.36 dB (README §I.3).`, `Shown as ±0.18 dB about the factory setting (${inf}).`]}); SIM.refresh(); },
};

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* Built on POD14A - #ARTWORK #DA #2016/POD14A-FRONT&REAR-SILK (CURVE).pdf (2016|49 drafting set, sheet dated Jun.24/14).
   tools/silk_extract.py cut the FRONT GREEN, FRONT WHITE and REAR WHITE separations at 200 dpi between the crop marks
   (x 296–2009, y 175–496 / 723–1044 / 1208–1529) → 1713 × 321 px. Drill crosshairs on the artwork: front (298.5,217) power LED,
   (833.5,217) 32 kHz, (983.5,217) 96 kHz [green separation only], (1033.5,217) 192 kHz, (1168.5,217) INT REF; rear big crosshairs
   (166,219) RV1 and (531,221) RV4. 44.1 / 48 sit on the 50 px LED pitch; EXT REF, the step switch, the power rocker and the
   connectors are measured from Pics/POD14A Front.jpg and Rear.jpg. */
const ASSET = 'siumulation-plugins/assets/';
const LEDX = [833.5, 883.5, 933.5, 983.5, 1033.5];
function frontSVG(t, opts){
  opts = opts||{};
  const L = ledsAt(t), st = stepAt(t), down = powerAt(t) && D.events.some(e=>e.type==='press' && t>=e.t && t<e.t+(e.dur||C.PRESS));
  const led = (x,on,col,id)=>`<circle cx="${x}" cy="217" r="14" fill="#060707"/><circle cx="${x}" cy="217" r="10" fill="${on?col:'#2a1d1d'}" ${on?'filter="url(#p14glow)"':''}/>${on?`<circle cx="${x-3}" cy="214" r="3.5" fill="#fff" opacity=".55"/>`:''}`;
  const rateCol = '#ff3b2f', extCol = '#4dff5a', intCol = '#ffd23a';
  return `<svg viewBox="0 0 1713 321" role="img" aria-label="POD14A front panel (CorelDRAW silk artwork)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p14glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1713" height="321" rx="8" fill="#141517"/>
    <image href="${ASSET}pod14a-front.svg" width="1713" height="321"/>
    <g class="p14pwr" style="cursor:pointer"><title>Power rocker (click)</title><rect x="126" y="56" width="106" height="150" rx="8" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
      <rect x="140" y="${L.pwr?70:126}" width="78" height="66" rx="6" fill="#1b1d20" stroke="#3a3e42"/><rect x="146" y="${L.pwr?76:180}" width="66" height="10" rx="3" fill="#2b2e31"/></g>
    <circle cx="298.5" cy="217" r="14" fill="#060707"/><circle cx="298.5" cy="217" r="10" fill="${L.pwr?'#e9ff7a':'#262a1c'}" ${L.pwr?'filter="url(#p14glow)"':''}/>
    <g class="p14step" style="cursor:pointer"><title>STEP switch SW1 → PD2 (click, or press S)</title>
      <circle cx="714" cy="218" r="40" fill="transparent"/><circle cx="714" cy="218" r="29" fill="#050606" stroke="#2c2f32" stroke-width="3"/>
      <circle cx="714" cy="${down?220:217}" r="${down?20:22}" fill="${down?'#141617':'#1d2022'}" stroke="#3b3f43" stroke-width="2"/></g>
    ${LEDX.map((x,i)=>led(x, L.R===i, rateCol)).join('')}
    ${led(1119, L.E, extCol)}${led(1168.5, L.I, intCol)}
    <g opacity=".9"><text x="1033.5" y="191" text-anchor="middle" font-size="22" fill="#f0f0ec" font-family="Arial,Helvetica,sans-serif">192</text>
      <rect x="1011" y="171" width="45" height="26" fill="none" stroke="#f0f0ec" stroke-width=".8" stroke-dasharray="3 3" opacity=".35"><title>“192” is on the 2015 photo but not on the 2016|49 silk separation: added from Pics/POD14A Front.jpg</title></rect></g>
    <circle cx="50" cy="160" r="9" fill="#3a3d40"/><circle cx="1664" cy="160" r="9" fill="#3a3d40"/>
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const r = refStateAt(t), on = powerAt(t), fs = fsAt(t);
  const outTxt = !on ? 'unit off' : fs===0 ? 'no AES (FPGA not configured)' : fs<0 ? 'reference unlocked (RMCK free-running)' : (sv('word',t,0)&128) ? 'held static (da_disabled)' : fmtRate(fs)+' AES3';
  const phx = (x,y,plug,id,tip)=>`<g ${id?`class="p14j" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title>
      <rect x="${x-50}" y="${y-41}" width="100" height="82" rx="4" fill="#2fbf4f" stroke="#167a2c" stroke-width="2"/>
      ${[-30,0,30].map(d=>`<rect x="${x+d-12}" y="${y-8}" width="24" height="30" rx="3" fill="#0f4a1e"/><circle cx="${x+d}" cy="${y-24}" r="6" fill="#bfc6c0"/>`).join('')}
      ${plug?`<rect x="${x-46}" y="${y-37}" width="92" height="74" rx="4" fill="#26a043" stroke="#0f5a22" stroke-width="2" opacity=".95"/>${[-30,0,30].map((d,i)=>`<path d="M${x+d} ${y+37} q 0 30 ${8-i*8} 50" stroke="${['#c33','#222','#888'][i]}" stroke-width="6" fill="none"/>`).join('')}`:''}</g>`;
  const bnc = (x,plug,id,tip)=>`<g ${id?`class="p14j" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title>
      <circle cx="${x}" cy="91" r="50" fill="#1a1b1c"/><circle cx="${x}" cy="91" r="40" fill="#b9bcc0" stroke="#6d7175" stroke-width="3"/><circle cx="${x}" cy="91" r="27" fill="#d6c27c"/><circle cx="${x}" cy="91" r="8" fill="#7a5f12"/>
      ${plug?`<rect x="${x-24}" y="62" width="48" height="58" rx="8" fill="#3a74b8"/><rect x="${x-16}" y="10" width="32" height="56" fill="#2b5f9e"/>`:''}</g>`;
  const inp = (k,s,x,y)=>{ const ch=D.inputs[k][s?'R':'L']; return phx(x,y,ch.on,`in${k}${s}`,`INPUT${k+1} ${s?'RIGHT':'LEFT'}: ${ch.on?ch.dbu+' dBu '+ch.f+' Hz (click to unplug)':'unplugged (click to plug)'}`); };
  const trim = (i,x)=>`<g class="p14t" data-t="${i}" style="cursor:ew-resize"><title>${['RV1 Input 1 Right','RV2 Input 1 Left','RV3 Input 2 Right','RV4 Input 2 Left'][i]}: ${D.trim[i]>=0?'+':''}${D.trim[i].toFixed(2)} dB — click left/right half or use the wheel</title>
      <circle cx="${x}" cy="220" r="20" fill="transparent"/><circle cx="${x}" cy="220" r="11" fill="#c9a640" stroke="#6b5414" stroke-width="2"/>
      <line x1="${x}" y1="220" x2="${x + 9*Math.sin(D.trim[i]/0.18*2.4)}" y2="${220 - 9*Math.cos(D.trim[i]/0.18*2.4)}" stroke="#3a2b05" stroke-width="3"/></g>`;
  return `<svg viewBox="0 0 1713 321" role="img" aria-label="POD14A rear panel (CorelDRAW silk artwork)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1713" height="321" rx="8" fill="#141517"/>
    <image href="${ASSET}pod14a-rear.svg" width="1713" height="321"/>
    <rect x="20" y="12" width="172" height="46" fill="#ececea"/><text x="34" y="31" font-size="15" fill="#222" font-family="Times,serif">WBS  89173</text><text x="30" y="51" font-size="15" fill="#222" font-family="Times,serif">Made In Canada</text>
    ${inp(0,0,290,97)}${inp(1,0,395,97)}${inp(0,1,290,208)}${inp(1,1,395,208)}
    ${trim(0,166)}${trim(1,211)}${trim(2,487)}${trim(3,531)}
    ${bnc(717, r.on&&r.port==='bnc', 'refbnc', `REF INPUT BNC (75 Ω → REF2). ${r.on&&r.port==='bnc'?'Click to unplug':'Click to plug in a '+fmtRate(D.refRate)+' reference'}`)}
    ${phx(717, 205, r.on&&r.port==='phx', 'refphx', `REF INPUT Phoenix (110 Ω → REF1). ${r.on&&r.port==='phx'?'Click to unplug':'Click to plug in a '+fmtRate(D.refRate)+' reference'}`)}
    ${bnc(927,true,null,'OUTPUT1 BNC (75 Ω, EL5263, ground-referenced): '+outTxt)}${phx(927,205,true,null,'OUTPUT1 Phoenix (110 Ω, DS34LV87 + T4): '+outTxt)}
    ${bnc(1137,true,null,'OUTPUT2 BNC (75 Ω): '+outTxt)}${phx(1137,205,true,null,'OUTPUT2 Phoenix (110 Ω, T3): '+outTxt)}
    <rect x="1372" y="30" width="236" height="218" rx="10" fill="#0b0c0d" stroke="#2e3134" stroke-width="2"/><rect x="1392" y="52" width="70" height="176" rx="5" fill="#16181a"/><rect x="1480" y="62" width="110" height="150" rx="10" fill="#050606"/>
    ${[[1510,95],[1560,95],[1535,170]].map(([x,y])=>`<rect x="${x-10}" y="${y-14}" width="20" height="28" fill="#c9cdd2"/>`).join('')}
    ${[[207,87],[627,87],[822,138],[1032,138],[1227,87],[50,160],[1664,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} ${y} h12 M${x} ${y-6} v12" stroke="#47494c" stroke-width="2"/>`).join('')}
    <image href="${ASSET}pod14a-rear-ink.svg" width="1713" height="321" style="pointer-events:none"/>
    ${on && fs!==0 ? [927,1137].map(x=>`<circle cx="${x+48}" cy="40" r="7" fill="${fs>0 && !(sv('word',t,0)&128)?'var(--accent)':'var(--warn)'}"/>`).join('') : ''}
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p14step').forEach(g=>g.addEventListener('click', ()=>A.press()));
  root.querySelectorAll('.p14pwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p14j').forEach(g=>g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='refbnc') A.plug('bnc'); else if (j==='refphx') A.plug('phx');
    else if (j.startsWith('in')){ const k=+j[2], s=+j[3]; A.input(k, s, 'on', !D.inputs[k][s?'R':'L'].on); } }));
  root.querySelectorAll('.p14t').forEach(g=>{ const i=+g.dataset.t;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); A.trim(i, (e.clientX-r.left)/r.width < 0.5 ? -0.01 : 0.01); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.trim(i, e.deltaY<0?0.01:-0.01); }, {passive:false}); });
}
function controlsHTML(){
  const r = refStateAt(SIM.t);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <button data-a="press" title="S">Press STEP</button>
    <button data-a="bnc" class="${r.on&&r.port==='bnc'?'on':''}" title="R">Ref → BNC</button>
    <button data-a="phx" class="${r.on&&r.port==='phx'?'on':''}" title="P">Ref → Phoenix</button>
    <button data-a="unplug" ${r.on?'':'disabled'} title="U">Unplug ref</button>
    <label class="small">Ref rate <select data-a="rate">${[32000,44100,48000,88200,96000,176400,192000].map(v=>`<option value="${v}" ${v===D.refRate?'selected':''}>${fmtRate(v)}</option>`).join('')}</select></label>
    <label class="small"><input type="checkbox" data-a="vbit" ${D.refValid?'':'checked'}> V bit set</label>
    <button data-a="power">Power ${powerAt(SIM.t)?'off':'on'}</button>
    <span class="small muted">Keys: S step · R BNC · P Phoenix · U unplug</span></div>
    <div class="small muted" style="margin-top:4px">Each action is inserted at the playhead and the firmware is re-run from 0 s. Click the step switch or the power rocker on the front, the REF BNC / Phoenix and the input blocks on the rear; turn a trim with the wheel.</div>`;
}
function bindControls(root){
  const m = { press:()=>A.press(), bnc:()=>A.plug('bnc'), phx:()=>A.plug('phx'), unplug:()=>A.unplug(), power:()=>A.power() };
  root.querySelectorAll('button[data-a]').forEach(b=> b.onclick = ()=>m[b.dataset.a]());
  const rs = root.querySelector('select[data-a="rate"]'); if (rs) rs.onchange = e=>A.refRate(+e.target.value);
  const vb = root.querySelector('input[data-a="vbit"]'); if (vb) vb.onchange = e=>A.refValid(!e.target.checked);
}
function inputsHTML(){
  return `<table class="kv"><tr><th>Input</th><th>plugged</th><th>level (dBu)</th><th>tone</th><th>→ AES out</th></tr>${[0,1].map(k=>[0,1].map(s=>{ const ch=D.inputs[k][s?'R':'L']; const d=dbfs(k,s);
    return `<tr><td>IN${k+1} ${s?'R':'L'}</td><td><input type="checkbox" data-in="${k}${s}" data-p="on" ${ch.on?'checked':''}></td>
      <td><input type="range" min="-40" max="28" step="1" value="${ch.dbu}" data-in="${k}${s}" data-p="dbu" style="width:110px;vertical-align:middle"> <span class="mono">${ch.dbu>0?'+':''}${ch.dbu}</span></td>
      <td><select data-in="${k}${s}" data-p="f">${[100,400,1000,10000].map(f=>`<option ${f===ch.f?'selected':''} value="${f}">${f>=1000?f/1000+' kHz':f+' Hz'}</option>`).join('')}</select></td>
      <td class="mono" style="color:${ch.on&&d>0?'var(--bad)':'inherit'}">${ch.on?d.toFixed(2)+' dBFS'+(d>0?' CLIP':''):'—'}</td></tr>`; }).join('')).join('')}</table>
    <p class="small muted">0 dBFS = +24 dBu (SMPTE RP 155): +4 dBu → −20 dBFS, the factory calibration in the manual. Jumpers H3–H6 (+2.2 dB): ${[0,1,2,3].map(i=>`<label><input type="checkbox" data-jp="${i}" ${D.jumper[i]?'checked':''}>H${i+3}</label>`).join(' ')}</p>`;
}
function bindInputs(root){
  root.querySelectorAll('[data-in]').forEach(el=>{ const k=+el.dataset.in[0], s=+el.dataset.in[1], p=el.dataset.p;
    el.onchange = ()=> A.input(k, s, p, p==='on' ? el.checked : +el.value); });
  root.querySelectorAll('[data-jp]').forEach(el=> el.onchange = ()=>{ D.jumper[+el.dataset.jp]=el.checked; D.log.unshift({t:SIM.t, name:`Jumper H${+el.dataset.jp+3} ${el.checked?'on pins 2–3':'removed'}`, trace:['Adds R14/R27/R40/R53 36 kΩ in parallel with the 21.5 k gain resistor: about +2.2 dB (README §III.6).']}); SIM.refresh(); });
}
window.__pod14aKeys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod14aKeys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase(); const m = { s:()=>A.press(), r:()=>A.plug('bnc'), p:()=>A.plug('phx'), u:()=>A.unplug() };
  if (m[k] && !e.ctrlKey && !e.metaKey && !e.altKey){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf){
  const a = emulate().sig[name] || []; let i = Math.max(0, idxAt(a, t0));
  c.font = '10.5px '+SIM.css('--sans');
  for (; i < a.length && a[i][0] <= t1; i++){
    const s = Math.max(t0, a[i][0]), e = Math.min(t1, i+1<a.length ? a[i+1][0] : C.HORIZON);
    if (e < t0) continue;
    const col = colOf(a[i][1]); const xa = X(s), xb = X(e);
    if (col){ c.fillStyle = col; c.fillRect(xa, y+3, Math.max(1, xb-xa), h-6); }
    const tx = txtOf && txtOf(a[i][1]);
    if (tx && xb-xa > c.measureText(tx).width+8){ c.fillStyle = col ? '#fff' : SIM.css('--ink2'); c.fillText(tx, xa+4, y+h/2+4); }
  }
}
function segLoop(t0, t1, fn){   // iterate the output-rate segments overlapping [t0,t1]
  const a = emulate().sig.fs; let i = Math.max(0, idxAt(a,t0));
  for (; i<a.length && a[i][0] <= t1; i++){ const s=a[i][0], e = i+1<a.length ? a[i+1][0] : C.HORIZON; if (e < t0) continue; fn(Math.max(s,t0), Math.min(e,t1), a[i][1], s); }
}
function lanes(){
  const css = SIM.css; const ls = [];
  const txt = (c,s,x,y)=>{ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(s,x,y); };
  ls.push({label:'Analog IN1 LEFT (TB1)', h:30, draw(c,X,t0,t1,y,h,pw){
    const ch = D.inputs[0].L; if (!ch.on){ txt(c,'unplugged',X(t0)+6,y+h/2+4); return; }
    const a = Math.min(1, Math.pow(10,(ch.dbu-24)/20)) , span=t1-t0;
    c.strokeStyle = css('--accent2');
    if (span*ch.f > pw/3){ c.fillStyle=css('--accent2'); c.globalAlpha=.3; c.fillRect(X(t0), y+h/2-a*(h/2-3), pw, 2*a*(h/2-3)); c.globalAlpha=1; txt(c, `${ch.dbu} dBu, ${ch.f} Hz (${Math.round(span*ch.f).toLocaleString()} cycles in view)`, X(t0)+6, y+h-4); return; }
    c.beginPath(); for (let i=0;i<=pw;i++){ const tt=t0+span*i/pw; const yy=y+h/2 - a*(h/2-3)*Math.sin(2*Math.PI*ch.f*tt); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }});
  ls.push({label:'AK5394A U5: RSTN · cal · LRCK', h:28, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'rst', v=> v? null : css('--bad'), v=> v? '' : 'RSTN low (in reset)');
    segLoop(t0,t1,(a,b,fs,s0)=>{ if (fs===0) return; const f = fs>0?fs:48000;
      c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip();
      // calibration shading after each rising edge of RSTN
      (emulate().sig.rst||[]).forEach(p=>{ if (p[1]===1 && p[0] < b){ const ce = p[0]+C.ADC_CAL/f; if (ce > a){ c.fillStyle=css('--warn'); c.globalAlpha=.4; c.fillRect(X(p[0]), y+3, X(ce)-X(p[0]), h-6); c.globalAlpha=1; } } });
      SIM.pulses(c,X,a,b,y+h*0.55,h*0.45,1/f,s0,0.5/f,css('--accent'),'LRCK'); c.restore(); }); }});
  ls.push({label:'I²S to FPGA: SCLK 64 fs', h:22, draw(c,X,t0,t1,y,h){
    segLoop(t0,t1,(a,b,fs,s0)=>{ if (fs<=0) return; c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip(); SIM.pulses(c,X,a,b,y,h,1/(64*fs),s0,0.5/(64*fs),css('--ink2'),'SCLK edges'); c.restore(); }); }});
  ls.push({label:'AES3 OUT1: frames · blocks (Z)', h:30, draw(c,X,t0,t1,y,h){
    segLoop(t0,t1,(a,b,fs,s0)=>{ const xa=X(a), xb=X(b);
      if (fs===0){ c.fillStyle=css('--grid'); c.fillRect(xa,y+3,xb-xa,h-6); if (xb-xa>90) txt(c,'no AES output',xa+4,y+h/2+4); return; }
      if (fs<0){ c.fillStyle=css('--bad'); c.globalAlpha=.3; c.fillRect(xa,y+3,xb-xa,h-6); c.globalAlpha=1; if (xb-xa>160) txt(c,'CS8416 unlocked → RMCK free-running',xa+4,y+h/2+4); return; }
      c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip();
      SIM.pulses(c,X,a,b,y,h*0.5,192/fs,s0,1/fs,css('--warn'),'blocks (192 frames)');
      SIM.pulses(c,X,a,b,y+h*0.5,h*0.5,1/fs,s0,0.5/fs,css('--accent'),'frames @ '+fmtRate(fs));
      c.restore(); });
    drawSig(c,X,t0,t1,y,h,'word', w=> (w&128)? 'rgba(160,160,160,.55)' : null, w=> (w&128)? 'aes_off: line held static' : ''); }});
  ls.push({label:'OUT1 LEFT audio (dBFS)', h:30, draw(c,X,t0,t1,y,h,pw){
    const span=t1-t0, ch=D.inputs[0].L, A_=Math.min(1,Math.pow(10,dbfs(0,0)/20));
    c.fillStyle=css('--accent'); c.strokeStyle=css('--accent');
    if (span*ch.f > pw/3){ for (let i=0;i<pw;i+=2){ const tt=t0+span*i/pw; const fs=fsAt(tt); const run = fs>0 && adcAt(tt).st==='run' && ch.on; if (run) c.fillRect(X(t0)+i, y+h/2-A_*(h/2-3), 2, 2*A_*(h/2-3)); else { c.fillStyle=css('--ink2'); c.fillRect(X(t0)+i, y+h/2, 2, 1); c.fillStyle=css('--accent'); } } return; }
    c.beginPath(); let mv=true; for (let i=0;i<=pw;i++){ const tt=t0+span*i/pw; const v=outSample(0,0,tt); if (v===null){ mv=true; continue; } const yy=y+h/2 - v*(h/2-3); mv?c.moveTo(X(tt),yy):c.lineTo(X(tt),yy); mv=false; } c.stroke(); }});
  ls.push({label:'ATmega128 main loop (175 µs passes)', h:34, draw(c,X,t0,t1,y,h){
    const E=emulate(), P=E.P; const pxPass = X(t0+C.LOOP_T)-X(t0);
    E.boots.forEach(b=> b.phases.forEach(([a,e,l],j)=>{ if (e<t0||a>t1) return; c.fillStyle=css('--accent2'); c.globalAlpha=j%2?.35:.55; c.fillRect(X(a),y+3,X(e)-X(a),h-6); c.globalAlpha=1; if (X(e)-X(a)>c.measureText(l).width+8){ c.fillStyle=css('--ink'); c.font='10.5px '+css('--sans'); c.fillText(l, Math.max(X(a),X(t0))+4, y+h/2+4); } }));
    let i0 = Math.max(0, passAt(t0)), i1 = passAt(t1); if (i1<0) return;
    if (pxPass < 2){ // band + special passes
      const a=Math.max(t0,P.t0[i0]), b=Math.min(t1,passEnd(i1)); c.fillStyle=css('--accent'); c.globalAlpha=.45; c.fillRect(X(a),y+8,X(b)-X(a),h-16); c.globalAlpha=1;
      E.P.special.forEach(i=>{ if (i<i0||i>i1) return; const bb=stepBounds(i); const k = P.x8[i]?8:5; c.fillStyle = k===8? css('--warn') : css('--bad'); c.fillRect(X(bb[k]),y+3,Math.max(2,X(bb[k+1])-X(bb[k])),h-6); });
      const n=i1-i0+1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${n.toLocaleString()} passes in view · orange = wait(50000)×2 between ADC resets · red = EEPROM write`, X(t0)+6, y+h/2+4);
      return; }
    for (let i=i0;i<=i1;i++){ const bb=stepBounds(i);
      if (pxPass > 60){ for (let k=0;k<STEPS.length;k++){ const xa=X(bb[k]), xb=X(bb[k+1]); if (xb<X(t0)-5||xa>X(t1)+5) continue;
          c.fillStyle = k===2? css('--accent2') : (k===8&&P.x8[i])? css('--warn') : (k===5&&P.x5[i])? css('--bad') : css('--accent'); c.globalAlpha = k%2? .55 : .85; c.fillRect(xa, y+3, Math.max(1,xb-xa-1), h-6); c.globalAlpha=1;
          if (xb-xa > 60){ c.fillStyle='#fff'; c.font='10px '+css('--sans'); c.fillText(STEPS[k][0].split(' · ')[0].slice(0, Math.floor((xb-xa)/6)), xa+3, y+h/2+3); } } }
      else { c.fillStyle = P.x8[i]? css('--warn') : P.x5[i]? css('--bad') : (i%2? css('--accent2') : css('--accent')); c.globalAlpha=.75; c.fillRect(X(P.t0[i]), y+3, Math.max(1, X(passEnd(i))-X(P.t0[i])-0.5), h-6); c.globalAlpha=1; } } }});
  ls.push({label:'FPGA bus: ALTERA_write PE5/PE6/PE7', h:26, draw(c,X,t0,t1,y,h){
    const P=emulate().P; const i0=Math.max(0,passAt(t0)), i1=passAt(t1); if (i1<0) return; const pxPass=X(t0+C.LOOP_T)-X(t0);
    if (pxPass < 3){ c.fillStyle=css('--accent2'); c.globalAlpha=.4; c.fillRect(X(Math.max(t0,P.t0[i0])), y+6, X(Math.min(t1,passEnd(i1)))-X(Math.max(t0,P.t0[i0])), h-12); c.globalAlpha=1; txt(c, `${(i1-i0+1).toLocaleString()} writes × 16 bits (one per pass)`, X(t0)+6, y+h/2+4); return; }
    for (let i=i0;i<=i1;i++){ const bb=stepBounds(i); const a=bb[2], b=bb[3], w=P.word[i]; const xa=X(a), xb=X(b);
      if (xb-xa > 64){ const bits=(0<<8)|w; for (let k=0;k<16;k++){ const bit=(bits>>(15-k))&1; const ca=xa+(xb-xa)*0.9*k/16, cb=xa+(xb-xa)*0.9*(k+1)/16; c.fillStyle= bit? css('--accent2'): css('--grid'); c.fillRect(ca, y+4, cb-ca-1, h*0.45); }
        c.fillStyle=css('--warn'); c.fillRect(xa+(xb-xa)*0.92, y+4, Math.max(2,(xb-xa)*0.04), h-8);
        c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`${hex2(w)} → strobe`, xa+2, y+h-3);
        const sn=snap(i); if (sn && sn.reset_adc){ const xc=X(bb[4]+0.6*(bb[5]-bb[4])); c.fillStyle=css('--bad'); c.fillRect(xc, y+2, 3, h-4); if (X(bb[5])-xc>60) { c.font='10px '+css('--sans'); c.fillText('PE6 ↑ (CAL_LED_ON)', xc+5, y+h-3); } } }
      else { c.fillStyle=css('--accent2'); c.fillRect(xa, y+5, Math.max(1,xb-xa), h-10); } } }});
  ls.push({label:'Timer0 → PE3 → FPGA5 (500 Hz gate)', h:22, draw(c,X,t0,t1,y,h){
    (emulate().sig.power||[]).forEach((p,i,a)=>{ if (!p[1]) return; const s=p[0], e=i+1<a.length?a[i+1][0]:C.HORIZON; if (e<t0||s>t1) return; c.save(); c.beginPath(); c.rect(X(Math.max(s,t0)),y,X(Math.min(e,t1))-X(Math.max(s,t0)),h); c.clip(); SIM.pulses(c,X,Math.max(s,t0),Math.min(e,t1),y,h,0.002,s,0.001,css('--ink2'),'1 ms gates (SR_DETECT_192 counts REF_MCLK)'); c.restore(); }); }});
  ls.push({label:'sel4_1 → CS8416 RXP3 (reference bits)', h:24, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'word', w=> (w&3)===0? css('--accent2') : (w&3)===1? css('--accent') : css('--ink2'), w=> (w&3)===0? 'REF1 · Phoenix' : (w&3)===1? 'REF2 · BNC' : '?'); }});
  ls.push({label:'Reference cable (input)', h:20, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'ref', v=> v===0? null : css('--warn'), v=> v===1? 'on Phoenix' : v===2? 'on BNC' : 'none'); }});
  ls.push({label:'CS8416 lock · Astatus · clocks_stable', h:30, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y-2,h/3+4,'pll', v=> v? css('--accent'):null, v=> v?'PLL':'');
    drawSig(c,X,t0,t1,y+h/3-2,h/3+4,'ast', v=> v? css('--accent2'):null, v=> v?'Astatus':'');
    drawSig(c,X,t0,t1,y+2*h/3-2,h/3+4,'cst', v=> v? css('--warn'):null, v=> v?'clocks_stable':''); }});
  ls.push({label:'reference_sel → FPGA (ref_sel)', h:24, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'word', w=>{ const r=(w>>5)&3; return r===3? css('--warn') : css('--accent'); }, w=>{ const r=(w>>5)&3; return r===3? 'INTERNAL_REF · '+RATE_TXT[Math.min(4,(w>>2)&7)]+' k' : 'external '+REF_SHORT[r]; }); }});
  ls.push({label:'ADC reset line PE2 → FPGA6 → RSTN', h:22, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'rst', v=> v? null : css('--bad'), v=> v? 'high (run)' : 'RESET_LOW');
    drawSig(c,X,t0,t1,y,h,'wait', v=> v? css('--warn') : null, v=> v? '100 ms gap' : ''); }});
  ls.push({label:'LEDs 32 · 44.1 · 48 · 96 · 192 · EXT · INT', h:44, draw(c,X,t0,t1,y,h){
    const rh=(h-4)/7; for (let r=0;r<5;r++) drawSig(c,X,t0,t1,y+r*rh-3,rh+6,'ledR', v=> v===r? '#e5483b' : null, null);
    drawSig(c,X,t0,t1,y+5*rh-3,rh+6,'ledE', v=> v? '#3fbf5f' : null, null);
    drawSig(c,X,t0,t1,y+6*rh-3,rh+6,'ledI', v=> v? '#e8b23a' : null, null); }});
  ls.push({label:'chirp_on (NO_LOCK_CHIRP) — drives nothing', h:18, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'chirp', v=> v? css('--ink2') : null, v=> v? 'on 1000 passes' : 'off 7000 passes'); }});
  ls.push({label:'EEPROM: save_settings · write', h:20, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'save', v=> v? css('--accent2') : null, v=> v? 'save_settings = YES (counting 57 140 passes)' : '');
    drawSig(c,X,t0,t1,y,h,'eew', v=> v? css('--bad') : null, v=> v? 'SAVE_INFORMATION_EEPROM' : ''); }});
  return ls;
}
function longLanes(){
  const L = lanes(); const pick = ['ATmega128 main loop (175 µs passes)','reference_sel → FPGA (ref_sel)','ADC reset line PE2 → FPGA6 → RSTN','CS8416 lock · Astatus · clocks_stable','LEDs 32 · 44.1 · 48 · 96 · 192 · EXT · INT','EEPROM: save_settings · write','AES3 OUT1: frames · blocks (Z)'];
  return L.filter(l=>pick.includes(l.label));
}

/* ---------------- AES3 frame at the playhead ---------------- */
function aesFrame(t){
  const fs = fsAt(t); if (fs<=0) return null;
  const s0 = since('word', t); // frame count origin is not known; count from 0 s
  const n = Math.floor(t*fs), fr = n % 192, internal = ((sv('word',t,0)>>5)&3)===3;
  const out = [];
  for (const side of [0,1]){
    const v = outSample(0, side, n/fs) || 0;
    let s = Math.round(v*8388607); if (s<0) s += 1<<24;
    const bits = new Array(32).fill(0);
    for (let b=0;b<24;b++) bits[4+b] = (s>>b)&1;          // aux used for audio: 24-bit word, LSB first in slots 4–27
    bits[28] = 0; bits[29] = 0;
    bits[30] = internal ? (CS_BITS.has(fr)?1:0) : ((fr===0)?1:0);
    let par = 0; for (let b=4;b<31;b++) par ^= bits[b]; bits[31] = par;
    out.push({pre: side? 'Y' : (fr===0?'Z':'X'), bits, sample:v, raw:s});
  }
  return {n, fr, fs, internal, sub:out};
}
function biphase(pre, bits, start){
  const Pp = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv = []; Pp.forEach(b=>lv.push(start? 1-b : b)); let cur = lv[lv.length-1];
  for (let i=4;i<32;i++){ cur = 1-cur; lv.push(cur); if (bits[i]) cur = 1-cur; lv.push(cur); }
  return lv;
}
function drawScope(cv, el, t){
  const F = aesFrame(t); const {c,w} = SIM.canvas(cv, 150);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (!F){ c.fillStyle=ink2; c.font='13px '+SIM.css('--sans'); c.fillText('No AES3 at the playhead (unit off, FPGA not configured or CS8416 unlocked).', 12, 70); el.innerHTML=''; return; }
  const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase(F.sub[1].pre, F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB), cw = (w-20)/lv.length;
  const zones = [[0,8,SIM.css('--warn'),'pre'],[8,56,SIM.css('--accent'),'audio 24 bits (LSB first)'],[56,64,SIM.css('--accent2'),'VUCP']];
  [0,64].forEach(off=>zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px '+SIM.css('--sans'); if ((b-a)*cw>30) c.fillText(lb, 12+(off+a)*cw, 104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?30:80; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${F.sub[0].pre})`,12,14); c.fillText('Subframe B (Y)',12+64*cw,14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 in block · cell ${SIM.fmtDur(1/(F.fs*128))} · frame ${SIM.fmtDur(1/F.fs)}`, 10, 130);
  const fmt = s=> s.bits.slice(4,28).reverse().join('');
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} ${s.sample.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} (MSB…LSB ${fmt(s)}) · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')
    + `<br><span class="muted">${F.internal ? `Internal reference: C bits come from <span class="mono">i2s_gen_cuv</span>'s constant block (1 at frames 0, 18, 19, 21, 187, 189, 190 = professional, 24-bit, fs not indicated, CRCC 0x68).` : `External reference: C/U/V come from the CS8416's AES3-direct output (reg 0x05 = 0xB0), copied from the reference. Shown here as byte 0 = professional only (${inf}).`} The block counter's phase against 0 s is ${inf}.</span>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>` + l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press STEP, plug a reference or move an input. The firmware path the emulator took is listed here, with time offsets after your action.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p14scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p14clr">Clear my actions</button>`; }
function bindScenario(m){ m.querySelectorAll('.p14scn').forEach(s=>s.onchange=e=>A.scenario(e.target.value)); m.querySelectorAll('.p14clr').forEach(b=>b.onclick=()=>A.clear()); }

function inspectorHTML(t){
  const st = stepAt(t), b = bootAt(t), sn = st.pass>=0 ? snap(st.pass) : null, w = sv('word',t,0), fs = fsAt(t), adc = adcAt(t), r = refStateAt(t);
  const L = ledsAt(t);
  return `<table class="kv">
    <tr><th>Power / boot</th><td class="mono">${!powerAt(t)?'OFF':b?'booting: '+(b.phases.find(p=>t>=p[0]&&t<p[1])||['','', 'main() init'])[2]:'running'}</td></tr>
    <tr><th>Main-loop pass</th><td class="mono">${st.pass<0||b||!powerAt(t)?'—':'#'+st.pass.toLocaleString()+' · '+STEPS[st.step]?.[0]}${st.waiting?' <b style="color:var(--warn)">blocked in wait(50000)</b>':''}${st.saving?' <b style="color:var(--bad)">writing EEPROM</b>':''}</td></tr>
    <tr><th>sample_rate / reference</th><td class="mono">${sn?`${sn.sample_rate} (${sn.sample_rate<=4?RATE_TXT[sn.sample_rate]+' k':'out of range'}) / ${REF_SHORT[sn.reference]}`:'—'}</td></tr>
    <tr><th>Astatus · clocks_stable</th><td class="mono">${sn?`${sn.Astatus?'LOCK':'NO_LOCK'} · ${sn.clocks_stable?'YES':'NO ('+sn.clocks_stable_count+'/25)'} · unlock_count ${sn.unlock_count}`:'—'}</td></tr>
    <tr><th>reference_sel</th><td class="mono">${sn?REF_NAME[sn.reference_sel]:'—'}</td></tr>
    <tr><th>ADC reset</th><td class="mono">${sn?`reset_adc ${sn.reset_adc?'YES':'NO'} · reset_count ${sn.reset_count}/5714 · no_of_adc_resets ${sn.no_of_adc_resets}/2`:'—'}</td></tr>
    <tr><th>Control word → FPGA</th><td class="mono">${hex2(w)} = ${bin8(w)}b · aes_off ${w>>7} · ref_sel ${(w>>5)&3} · sr ${(w>>2)&7} · aes_sw ${w&3}</td></tr>
    <tr><th>CS8416</th><td class="mono">${sv('cs',t,0)?'running':'in reset'} · RXP3 = ${(w&3)===0?'REF1 (Phoenix)':(w&3)===1?'REF2 (BNC)':'?'} · PLL ${sv('pll',t,0)?'locked':'unlocked'} · cable ${r.on?(r.port==='phx'?'Phoenix':'BNC')+' '+fmtRate(r.rate)+(r.valid?'':' V=1'):'none'}</td></tr>
    <tr><th>AK5394A ×2</th><td class="mono">${adc.st==='run'?'converting':adc.st==='cal'?'offset calibration ('+inf+')':adc.st==='reset'?'RSTN low':adc.st} · DFS ${fs>0?['normal','double','quad'][detFor(fs)]:'—'}</td></tr>
    <tr><th>AES outputs</th><td class="mono">${fs===0?'none':fs<0?'unlocked':(w&128)?'held static (da_disabled)':fmtRate(fs)+' · frame '+Math.floor(t*fs).toLocaleString()+' · block '+Math.floor(t*fs/192).toLocaleString()}</td></tr>
    <tr><th>LEDs</th><td class="mono">${L.R<=4?RATE_TXT[L.R]+' kHz':'(no rate LED)'} · ${L.E?'EXT REF':''}${L.I?'INT REF':''}${!L.pwr?'all off':''}</td></tr>
    <tr><th>save_settings</th><td class="mono">${sn?`${sn.save_settings?'YES':'NO'} · ${sn.save_settings_count.toLocaleString()}/57 140`:'—'} · EEPROM holds reference ${sv('ee',t,0)&15}, sample_rate ${sv('ee',t,0)>>4}</td></tr>
  </table>`;
}

function viewSim(m){
  window.__pod14aKeys = true;
  m._ck = m._ik = null;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — what the operator sees', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click the REF BNC or Phoenix, the input blocks and the trims', `<div id="rp"></div><div id="ins" style="margin-top:8px"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src('#POD #SERIES/POD14A - #Master/POD14A - #ARTWORK #DA #2016/POD14A-FRONT&REAR-SILK (CURVE).cdr', 'POD14A-FRONT&REAR-SILK (CURVE).cdr')} (2016-06-16|49), CorelDRAW silk plates in their real inks.</div>`)}
    </div>
    <div>
      ${card('What the firmware did (emulated, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Each main-loop pass is 175 µs: the source says so (<span class="mono">ADC_RESET_CONSTANT 5714 // 1 cycle = 175us</span>). How the 175 µs splits between the steps is ${inf}. Every LED, reset and reference decision above comes from running <span class="mono">main()</span> pass by pass with the firmware's own variables.</p>`)}
  ${card('After the second: the next 12 s (ADC double reset, EEPROM save)', `<canvas id="tl12"></canvas>`)}
  <div class="grid2">
    ${card('Scope: OUT1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const ck = JSON.stringify([refStateAt(t), powerAt(t), D.refRate, D.refValid]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const ik = JSON.stringify([D.inputs, D.trim, D.jumper]); if (ik!==m._ik){ m._ik=ik; m.querySelector('#ins').innerHTML = inputsHTML(); bindInputs(m.querySelector('#ins')); }
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    SIM.drawLanes(m.querySelector('#tl12'), longLanes(), {labelW:210, range:[0, C.HORIZON]});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  bindScenario(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const fin = ()=> finalSnap() || {};
const finRef = ()=> refStateAt(C.HORIZON);
const LESSONS = [
  { title:'Meet the POD14A', body:`<p>The POD14A is a half-rack <b>dual analog-to-AES/EBU converter</b> (manual, Rev Oct.01 2014). It turns two stereo line inputs into two AES3 outputs at 24 bits. Output 1 always carries Input 1 and Output 2 carries Input 2.</p>
     <p>The front panel has a power rocker, a momentary <b>STEP</b> switch, five red <b>SAMPLE RATE</b> LEDs (32, 44.1, 48, 96, 192 kHz) and two reference LEDs: green <b>EXT REF</b> and yellow <b>INT REF</b>.</p>
     <p>On the rear: four Phoenix analog inputs with four trim holes, a <b>REF INPUT</b> (BNC 75 Ω <i>or</i> Phoenix 110 Ω), two outputs on both BNC and Phoenix, and the mains inlet.</p><p class="muted">Hover over the front panel. Click “Next” when you are ready.</p>`, check:()=>true, auto:true },
  { title:'1 · Power it up', body:`<p>The manual says there is no setup: plug it in and connect cables. Load the cold start and watch the first second. <button data-scn="cold">Load “Power-up from cold”</button></p>
     <p>Scrub the playhead. For the first 0.9 s the firmware is still in <span class="mono">main()</span>: it reloads the FPGA (<span class="mono">ALTERA_RESET</span>), waits 150 ms, programs the CS8416, then holds the converters for 750 ms. Only then does the loop start and <b>INT REF</b> light.</p>
     <p><b>Goal:</b> put the playhead after 0.91 s with INT REF lit.</p>`, check:()=> emulate().boots.length>0 && SIM.t>0.905 && ledsAt(SIM.t).I===1, hint:'Load the scenario, then drag the time slider near the end of the second.' },
  { title:'2 · Choose the internal rate', body:`<p>Each press of <b>STEP</b> advances the internal rate: 32 → 44.1 → 48 → 96 → 192 → 32 kHz (<span class="mono">TRANSLATE_ENCODER1</span>).</p><p>The firmware only looks at the switch once every 175 µs pass, and ignores it for 255 passes (≈45 ms) after you let go.</p><p><b>Goal:</b> light the <b>96</b> LED.</p>`, check:()=> fin().sample_rate===3, hint:'Click the step switch on the front panel (or press S) until 96 is lit.' },
  { title:'3 · Watch the converters recalibrate', body:`<p>A new internal rate re-clocks the ADCs, so the firmware resets them: <span class="mono">reset_adc</span> holds RSTN low for 5714 passes (1 s), lets go for 100 ms, then does it once more (<span class="mono">RESET_MAX = 2</span>). The manual's advice follows from this: don't change settings on air.</p>
     <p><b>Goal:</b> put the playhead inside an ADC reset (the red band on the “ADC reset line” lane). Set the zoom window to 1 s to see it.</p>`, check:()=> powerAt(SIM.t) && sv('rst',SIM.t,1)===0, hint:'After your press, scrub forward a few milliseconds.' },
  { title:'4 · Back to the house rate', body:`<p>Set the internal rate to your house rate, usually <b>48 kHz</b>. If the reference is ever lost, the unit falls back to this rate, so downstream gear only sees a clock change, not a rate change.</p><p><b>Goal:</b> 48 lit.</p>`, check:()=> fin().sample_rate===2, hint:'Keep pressing STEP: 96 → 192 → 32 → 44.1 → 48.' },
  { title:'5 · Connect house sync', body:`<p>Plug a <b>48 kHz</b> reference into the <b>REF BNC</b> on the rear. The CS8416 must stay locked for 26 passes (<span class="mono">LOCK_CONSTANT</span>, ≈4.6 ms) before <span class="mono">ALTERA_write</span> switches <span class="mono">reference_sel</span> to it. Then <b>EXT REF</b> lights, <b>INT REF</b> goes out, and the ADCs are reset twice again.</p><p><b>Goal:</b> locked to the BNC.</p>`, check:()=> { const f=fin(); return f.reference_sel===1 && finRef().on && finRef().port==='bnc'; }, hint:'Click the top-left BNC on the rear panel (REF INPUT), or press R.' },
  { title:'6 · What the rate LEDs really show', body:`<p>Change the reference generator to <b>96 kHz</b> (the “Ref rate” selector). The outputs follow the reference: <span class="mono">mclk_sel</span> passes the CS8416's clock straight to the AES framer and <span class="mono">SR_DETECT_192</span> divides it by 2 for the ADCs.</p>
     <p>But the <b>48</b> LED stays lit. The firmware never reads the FPGA's rate detector back, so the LEDs show the stored internal rate (the fallback), not what is on the wire.</p><p><b>Goal:</b> locked to a 96 kHz reference with the 48 LED lit.</p>`, check:()=> { const f=fin(), r=finRef(); return r.on && r.rate===96000 && f.reference_sel!==3 && f.sample_rate===2; }, hint:'Set “Ref rate” to 96 kHz while the cable is plugged in.' },
  { title:'7 · Try the Phoenix connector', body:`<p>Move the reference to the <b>REF Phoenix</b> (110 Ω). There is no switch for this. While unlocked, the firmware swaps between <span class="mono">REFERENCE_1</span> (Phoenix) and <span class="mono">REFERENCE_2</span> (BNC) every 26 passes until the CS8416 locks.</p><p>Zoom to 20 ms on the timeline to watch the scan on the “sel4_1 → CS8416” lane.</p><p><b>Goal:</b> locked via REF1.</p>`, check:()=> { const f=fin(); return f.reference_sel===0; }, hint:'Click the green block under the REF BNC, or press P.' },
  { title:'8 · Pull the reference', body:`<p><b>Unplug</b> the reference. The external reference has priority, but there is no hold-off on the way down: on the very next pass <span class="mono">Astatus = NO_LOCK</span> and <span class="mono">ALTERA_write</span> sends <span class="mono">INTERNAL_REF</span>. INT REF lights and the ADCs are reset twice.</p><p><b>Goal:</b> running on internal with no reference connected.</p>`, check:()=> !finRef().on && fin().reference_sel===3, hint:'Click “Unplug ref” or press U.' },
  { title:'9 · A reference that is not a reference', body:`<p>Tick <b>V bit set</b>, then plug the cable back into the BNC. A programme feed often has its validity bit set. The CS8416 locks to it, but <span class="mono">CS8416_READ_LOCK_ALL</span> treats <i>any</i> non-zero error register as “no lock”, so the unit refuses it and keeps scanning.</p><p><b>Goal:</b> V-bit reference plugged, unit still on INT REF.</p>`, check:()=> { const r=finRef(); return r.on && !r.valid && fin().reference_sel===3; }, hint:'Tick “V bit set”, then Ref → BNC.' },
  { title:'10 · Calibrate an input', body:`<p>The unit is factory-calibrated for <b>+4 dBu in → −20 dBFS out</b>. Set INPUT1 LEFT to <b>+4 dBu</b>, then <button data-drift="1">simulate a drifted RV2</button> (an exercise: it moves the trim by +0.12 dB).</p>
     <p>Turn <b>RV2</b> (second trim from the left on the rear panel: click its halves or use the wheel) until OUT1 LEFT reads −20.00 dBFS. The four trims only cover 0.36 dB, so they are for fine calibration only.</p>`, check:()=> D.drift && D.inputs[0].L.dbu===4 && Math.abs(dbfs(0,0)+20)<0.006, hint:()=>`OUT1 LEFT now reads ${dbfs(0,0).toFixed(2)} dBFS.` },
  { title:'Done', body:`<p>You've used everything on the POD14A. The other tabs show the same events from the inside: <b>Software</b> follows the main loop and the control word, <b>One second, frame by frame</b> breaks the output down to single AES3 bit cells, and <b>Findings</b> lists what the firmware does that the manual doesn't say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod14aKeys = true;
  m._ck = m._ik = null;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD14A (from the manual and the firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}
      ${card('Timeline (1 s)', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot = `<g><rect x="120" y="50" width="200" height="190" fill="transparent"><title>Power rocker and power LED</title></rect>
    <rect x="660" y="150" width="100" height="120" fill="transparent"><title>STEP switch: each press steps the internal sample rate</title></rect>
    <rect x="780" y="140" width="290" height="100" fill="transparent"><title>SAMPLE RATE LEDs: the stored internal rate (also while on external reference)</title></rect>
    <rect x="1090" y="140" width="120" height="170" fill="transparent"><title>EXT REF (green): following the external reference · INT REF (yellow): internal oscillator</title></rect></g>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{hot}); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const ck = JSON.stringify([refStateAt(t), powerAt(t), D.refRate, D.refValid]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    m.querySelector('#lv').textContent = `OUT1 LEFT ${D.inputs[0].L.on?dbfs(0,0).toFixed(2)+' dBFS':'—'} · OUT1 RIGHT ${D.inputs[0].R.on?dbfs(0,1).toFixed(2)+' dBFS':'—'} · output rate ${fsAt(t)>0?fmtRate(fsAt(t)):'—'}`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check(); const hint = typeof L.hint==='function' ? L.hint() : L.hint;
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelectorAll('#lesson [data-scn]').forEach(b=>b.onclick=()=>{ A.scenario(b.dataset.scn); });
    m.querySelectorAll('#lesson [data-drift]').forEach(b=>b.onclick=()=>{ D.drift=true; D.trim[1]=0.12; D.log.unshift({t:SIM.t,name:'Exercise: RV2 drifted +0.12 dB',trace:['Only the analog gain changed; the firmware is not involved.']}); SIM.refresh(); });
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0); };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter((l,i)=>[1,3,5,8,10,11,12,13].includes(i)), {labelW:190});
  };
  SIM.on('time', draw);
}
function resetAll(){ loadScenario('run48'); D.refRate=48000; D.refValid=true; D.trim=[0,0,0,0]; D.jumper=[false,false,false,false]; D.drift=false;
  D.inputs = [ { L:{on:true, dbu:4, f:1000}, R:{on:true, dbu:4, f:400} }, { L:{on:true, dbu:-6, f:1000}, R:{on:false, dbu:4, f:1000} } ]; D.log=[]; }

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod14aKeys = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><h3>Downstream: a meter fed from OUTPUT1</h3><canvas id="meter"></canvas><p class="small muted">Peak of OUT1 over the last 10 ms, −60 … 0 dBFS, with the −20 dBFS alignment mark (${inf} meter ballistics).</p>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, fs0=fsAt(t), fs = fs0>0?fs0:48000;
    const rows = [
      ['ATmega128 main-loop passes', '≈ 5 714', '175 µs', 'The source: “1 cycle = 175us or 5714 cycles = 1 sec”'],
      ['Control-word writes to the FPGA', '≈ 5 714 × 16 bits', '175 µs', 'ALTERA_write: write_data(0), write_data(word), strobe PE7'],
      ['CS8416 lock reads (SPI)', '≈ 5 714', '175 µs', 'CS8416_read1(0x0C) on PC1–PC3, chip select PC6'],
      ['Timer0 overflows', '1 000', '1 ms', 'timer0_ovf_isr toggles PE3 → FPGA5'],
      ['SR_DETECT_192 gates', '500', '2 ms', 'counter1 counts REF_MCLK while the gate is high (1 ms)'],
      ['REF1 ⇄ REF2 swaps while unlocked', '≈ 220', '26 passes ≈ 4.55 ms', 'unlock_count ≥ LOCK_CONSTANT'],
      ['chirp_on toggles', '≈ 1.4', '1 000 / 7 000 passes', 'NO_LOCK_CHIRP — inherited, drives nothing'],
      ['AES3 blocks', (fs/192).toFixed(1), SIM.fmtDur(192/fs), '192 frames; Z preamble; one channel-status block'],
      ['AES3 frames = ADC samples per channel', fs.toLocaleString(), SIM.fmtDur(1/fs), 'AK5394A LRCK → I2S_s_p → i2s8416_aes'],
      ['AES3 subframes', (2*fs).toLocaleString(), SIM.fmtDur(0.5/fs), 'A = left, B = right'],
      ['I²S SCLK cycles (64 fs)', (64*fs).toLocaleString(), SIM.fmtDur(1/(64*fs)), 'ADC → FPGA, 24-bit words'],
      ['AES framer clock (256 fs)', (256*fs).toLocaleString(), SIM.fmtDur(1/(256*fs)), 'mclk_aes from mclk_sel'],
      ['AES3 bit cells (biphase)', (128*fs).toLocaleString(), SIM.fmtDur(1/(128*fs)), `${(128*fs/1e6).toFixed(3)} Mbaud, BNC and Phoenix together`],
      ['ADC master clock', ['8 192 000','11 289 600','12 288 000'][fs===32000?0:(fs%44100===0)?1:2], '', 'Never above 12.288 MHz: 96 k and 192 k use the AK5394A double / quad speed (DFS)'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">At the playhead the outputs run at ${fs0>0?fmtRate(fs0):'— (no valid clock)'}. Use <b>Step</b> on the transport to move one pass, one AES frame or one AES block at a time.</p>`;
    const st=stepAt(t), F=aesFrame(t), adc=adcAt(t), w=sv('word',t,0), b=bootAt(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>ATmega128</th><td class="mono">${!powerAt(t)?'off':b?'main() start-up':st.step>=0?'pass #'+st.pass.toLocaleString()+': '+STEPS[st.step][0]+'<br><span class="muted">'+STEPS[st.step][2]+'</span>':'—'}</td></tr>
      <tr><th>FPGA</th><td class="mono">${!sv('fconf',t,0)?'not configured':`latched ${hex2(w)}: ${((w>>5)&3)===3?'internal '+RATE_TXT[Math.min(4,(w>>2)&7)]+' k from '+(((w>>2)&7)===1?'INTCLK_33868 ÷3':((w>>2)&7)===0?'INTCLK_24576 ÷3':((w>>2)&7)===2?'INTCLK_24576 ÷2':((w>>2)&7)===3?'INTCLK_24576':'altpll2 49.152 MHz'):'external: REF_MCLK, SR_DETECT_192 ÷'+[1,2,4][detFor(sv('rrate',t,48000))]+' for the ADCs'}${st.step===2?' · <b>shifting a new word in</b>':''}`}</td></tr>
      <tr><th>CS8416</th><td class="mono">RXP3 ← ${(w&3)===0?'REF1 Phoenix':'REF2 BNC'} · ${sv('pll',t,0)?'locked':'searching'}</td></tr>
      <tr><th>AK5394A</th><td class="mono">${adc.st}${F?' · sample '+F.n.toLocaleString():''}</td></tr>
      <tr><th>OUT1 frame</th><td class="mono">${F?`${F.fr}/191 · A=${F.sub[0].sample.toFixed(4)} B=${F.sub[1].sample.toFixed(4)} · preamble ${F.sub[0].pre}`:'—'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w:W} = SIM.canvas(m.querySelector('#meter'), 74);
    [0,1].forEach(sd=>{ let pk=0; for (let i=0;i<64;i++){ const v=outSample(0,sd,t-0.01*i/64); if (v) pk=Math.max(pk,Math.abs(v)); }
      const db = pk>0? 20*Math.log10(pk) : -99, segs=46, lit=Math.max(0,Math.min(segs,Math.round((db+60)/60*segs)));
      for (let s=0;s<segs;s++){ const x=10+s*(W-20)/segs; const col = s>=segs-4?'#e3453a':s>=segs-12?'#e8b23a':'#3fbf5f'; c.fillStyle = s<lit?col:SIM.css('--grid'); c.fillRect(x, 8+sd*30, (W-20)/segs-2, 22); }
      const xm = 10 + (40/60)*(W-20); c.fillStyle=SIM.css('--ink'); c.fillRect(xm-1, 4+sd*30, 2, 30);
      c.font='11px '+SIM.css('--mono'); c.fillText((sd?'B ':'A ')+(db>-99?db.toFixed(1)+' dBFS':'—'), 12, 23+sd*30); });
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const fs0 = fsAt(t), fs = fs0>0?fs0:48000;
  const levels = [['1 second',1],['100 ms',0.1],['1 AES block',192/fs],['1 main-loop pass',C.LOOP_T],['1 AES frame',1/fs]];
  const db0 = dbfs(0,0), norm = 1/Math.min(1,Math.pow(10,db0/20));
  const H = levels.length*44+10, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2));
    c.fillStyle=ink; c.font='12px '+SIM.css('--sans'); c.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14); c.fillStyle=ink2; c.font='10px '+SIM.css('--sans'); c.fillText('OUT1 left, scaled',6,y+28);
    const x0=170, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    c.strokeStyle=acc; c.beginPath(); const N=Math.min(700,pw); let mv=true;
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=outSample(0,0,tt); if (v===null){ mv=true; continue; } const yy=y+17-v*norm*13; mv?c.moveTo(x0+pw*k/N,yy):c.lineTo(x0+pw*k/N,yy); mv=false; } c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(1-ns,t-ns/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),30); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  panel:{x:20,y:20,w:180,h:100,t:'Front panel',s:['STEP switch SW1 → PD2','LEDs PD3–PD7, PG0, PG1','power rocker + LED'],d:'SW1 is a momentary switch on PD2 with R93 10 k to +5 V and R94 332 Ω in series. Rate LEDs 32/44.1/48/96/192 are on PD3–PD7, EXT REF on PG0, INT REF on PG1, each through 332 Ω. The power LED runs from +5 V through 511 Ω (README §I.7).'},
  mcu:{x:250,y:20,w:200,h:100,t:'ATmega128L @ 8 MHz',s:['while(1): 175 µs pass','rate / reference logic','EEPROM: addr 10, 13, 14'],d:'d6203_test.c main(): a super-loop with no RTOS. All timeouts are counted in passes. Timer0 only makes the 500 Hz gate. The firmware is ICCAVR 7.15 C, cloned from the D6203 openGear card (2008|41).'},
  ref:{x:20,y:170,w:180,h:90,t:'REF INPUT',s:['BNC1 → T1 → IN1_75 → REF2','TB5 → T2 → IN1_110 → REF1','both transformer-isolated'],d:'PE-65612 transformers, 75 Ω / 110 Ω terminations, DS34LV86 receivers. The BNC shell is not grounded: the house-sync coax cannot form a ground loop. FPGA pins 70 (REF2) and 68 (REF1).'},
  cs:{x:20,y:300,w:180,h:90,t:'CS8416 (U11)',s:['RXP3 ← FPGA pin 75','RMCK 256 fs → REF_MCLK','AES3-direct serial out'],d:'Programmed by init_CS8416 (0x04 = 0x9B: RUN, RXP3; 0x05 = 0xB0: master, AES3-direct). Polled by CS8416_READ_LOCK_ALL every pass (register 0x0C). Its recovered clock and C/U/V data feed the FPGA in external mode.'},
  fpga:{x:250,y:170,w:200,h:220,t:'Cyclone EP1C3T100C8',s:['shift_in ← control word','sel4_1 REF1/REF2 → CS8416','SR_DETECT_192 · mclk_sel','div_3_50 ×2 · altpll2 ×2','I2S_s_p ×2 · i2s_gen_cuv','i2s8416_aes ×2 → OUT1/2','(no AES transmitter IC)'],d:'POD14A.bdf / POD14A_1.bdf, Quartus II 7.2 SP2 (project created 11 Sep 2008|41). The FPGA makes every audio clock, picks the reference input for the CS8416, frames the ADC data into AES3 and biphase-encodes it itself. Configuration: M25P40 in Active-Serial mode; the MCU can force a reload through PC0 → Q1 → nCONFIG.'},
  clk:{x:500,y:20,w:190,h:100,t:'27 MHz → PLL1705',s:['AUDIO_CLOCK → INTCLK_24576','AUDIO_CLOCK2 → INTCLK_33868','pin 98 → pin 10 loop'],d:'X1 27 MHz into a TI PLL1705. The 24.576 MHz clock also leaves the FPGA on pin 98 and comes back on pin 10 (pll_clk0) so that altpll2 can double it to 49.152 MHz for 192 kHz.'},
  ana:{x:500,y:170,w:190,h:90,t:'Analog inputs ×4',s:['21.5 k / 10 k leg dividers','NE5532 instrumentation pairs','trims RV1–RV4, jumpers H3–H6'],d:'Each channel: non-inverting pair with a shared gain resistor (21.5 k + 2 k trim). +4 dBu → −20 dBFS; trim range 0.36 dB, jumper +2.2 dB. Input impedance 31.5 kΩ per leg on issue 2 (the manual still says 24 kΩ).'},
  adc:{x:500,y:300,w:190,h:90,t:'AK5394A ×2 (U5, U8)',s:['MCLK ≤ 12.288 MHz','DFS normal / double / quad','RSTN ← FPGA6 (PE2)'],d:'AKM 24-bit delta-sigma ADCs, I²S masters (LRCK/SCLK to the FPGA). Offset calibration runs when RSTN goes high, which is why the firmware resets them twice after every clock change.'},
  out:{x:250,y:430,w:440,h:60,t:'OUTPUT1 / OUTPUT2',s:['FPGA pins 71/72 → DS34LV87 + T4/T3 → Phoenix (isolated)  ·  EL5263 ×−0.75 → 75 Ω BNC (ground-referenced)'],d:'Both connectors of an output are driven at once. 1.1 Vpp measured into 75 Ω (README §I.5).'},
};
const WIRES = [['panel','mcu','PD2 · LEDs'],['mcu','fpga','PE7 strobe · PE6 clk · PE5 data · PE3 500 Hz · PE2 reset'],['ref','fpga','REF1 / REF2'],['fpga','cs','AES_8416 (RXP3)'],['cs','fpga','REF_MCLK/SCLK/LRCLK/DATA'],['mcu','cs','SPI PC1–3, CS PC6, RST PC7'],['clk','fpga','INTCLK_24576 / 33868'],['ana','adc','AIN±'],['fpga','adc','MCLK · DFS · RSTN'],['adc','fpga','SCLK · LRCK · SDATA'],['fpga','out','OUT1 · OUT2']];
function viewBlock(m){
  window.__pod14aKeys = false;
  let sel = 'fpga';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one sentence', `<p>The <b>MCU</b> decides the clock (internal rate or the reference) and writes it to the <b>FPGA</b> as one byte every 175 µs. The FPGA builds the clocks for the two <b>AK5394A</b> converters, reads their samples and transmits them as AES3, while the <b>CS8416</b> only listens to the reference.</p>`)}
    ${card('Where the parts came from', `<table class="kv"><tr><th>Block</th><th>Origin</th></tr><tr><td>ATmega128 + Cyclone + CS8416 core</td><td>D6203 openGear card (2008|41)</td></tr><tr><td>Analog front end, PLL1705 family, two-board split</td><td>POD14 (2001|34, PIC + CS5396 + CS8427)</td></tr><tr><td>AK5394A ADCs, 192 kHz</td><td>New in POD14A</td></tr></table><p class="small muted">From README §I.2a, which compares the two netlists.</p>`)}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 710 510" style="width:100%"><defs><marker id="p14ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p14ar)"/>`;
      if (l && hot) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b = BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p><p class="small muted">Connections: ${WIRES.filter(w=>w[0]===sel||w[1]===sel).map(w=>`${BLOCKS[w[0]].t} → ${BLOCKS[w[1]].t}${w[2]?' ('+w[2]+')':''}`).join('; ')}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn, net-label style) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function box(x,y,w,h,lines){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/>`+lines.map((l,i)=>`<text x="${x+w/2}" y="${y+18+i*15}" text-anchor="middle" font-size="11" fill="var(--ink)">${l}</text>`).join(''); }
const SHEETS = [
  { name:'1 · ATmega128L and front panel', note:'Port functions from D6203A.h, altera.h, cs84xx.h, shaft_encoder1.c (v100) and DDRx in port_init(); board connections from the issue 2 netlist trace in README §I.7. Port A is not connected on POD14A.', svg:()=>
    chip(320,60,200,'U14 ATmega128L',[['PE7','FPGA1 strobe (STROBE_WRITE)'],['PE6','FPGA2 clock (+ CAL_LED!)'],['PE5','FPGA3 data → FPGA'],['PE4','FPGA4 ← data (readback)'],['PE3','FPGA5 500 Hz (Timer0)'],['PE2','FPGA6 ADC RESET'],['PC0','ALTERA_RESET → Q1 → nCONFIG'],['PA0–7','DIP_SWITCHES_PIN (n.c.)']],
      [['PC1','CS8416 CDOUT'],['PC2','CS8416 CCLK'],['PC3','CS8416 CDIN'],['PC6','CS8416 CS'],['PC7','CS8416 RST'],['PD2','SW1 STEP (R94 332 Ω)'],['PD3…PD7','SR32…SR192 LEDs'],['PG0 / PG1','EXT REF / INT REF LED'],['XTAL','X2 8.000 MHz'],['JTAG','JTAG2 (fitted)']],'3.3 V · ICCAVR 7.15 · d6203_test.prj')
    + box(40,330,200,56,['SW1 → PD2','R93 10 k to +5 V (README H8)','']) + box(620,330,200,56,['7 LEDs, 332 Ω each','power LED 511 Ω from +5 V','']) },
  { name:'2 · Cyclone EP1C3 pin map (POD14A.qsf)', note:'Every pin number and net name below is copied from Software/altera/v100/POD14A.qsf (51 assignments). Direction from POD14A.bdf.', svg:()=>
    chip(330,40,200,'U1 EP1C3T100C8',[['97','FPGA1'],['1','FPGA2'],['2','FPGA3'],['3','FPGA4 (out)'],['4','FPGA5'],['5','FPGA6'],['68','REF1'],['70','REF2'],['79','REF_MCLK'],['77','REF_SCLK'],['76','REF_LRCLK'],['78','REF_DATA'],['84/85/86','GPO_8416_1/2/3'],['99','INTCLK_24576'],['100','INTCLK_33868'],['10','pll_clk0'],['20/42','SDATA_5394_1/2'],['35/57','SCLK_5394_1/2'],['34/56','LRCK_5394_1/2'],['21/47','FSYNCH_5394_1/2'],['27/53','CAL_1/2']],
      [['71','OUT1'],['72','OUT2'],['75','AES_8416'],['98','pll_out'],['22/48','MCLK_5394_1/2'],['23/49','DFS0_5394_1/2'],['25/51','DFS1_5394_1/2'],['24/50','HPF_5394_1/2'],['26/52','ZCAL_1/2'],['28/54','RSTN_1/2'],['29/55','SMODE1_1/2'],['41…37','TP1…TP5']],'Quartus II 7.2 SP2 · EPCS1 in the .cdf, M25P40 fitted') },
  { name:'3 · Clock generation', note:'Clock names from POD14A.qsf and POD14A_1.bdf nets; dividers from div_3_50.vhd, mclk_sel.vhd, SR_DETECT_192.vhd; PLL1705 and the pin 98 → 10 loop from README §I.4.', svg:()=>
    box(30,60,140,56,['X1 27 MHz','→ PLL1705 (U3)']) + `<line x1="170" y1="88" x2="230" y2="70" stroke="var(--ink)"/><line x1="170" y1="88" x2="230" y2="150" stroke="var(--ink)"/>`
    + box(230,46,170,48,['AUDIO_CLOCK 24.576 MHz','pin 99 INTCLK_24576']) + box(230,128,170,48,['AUDIO_CLOCK2 33.8688 MHz','pin 100 INTCLK_33868'])
    + box(450,20,170,40,['÷2 → 12.288 (48 k)']) + box(450,70,170,40,['div_3_50 → 8.192 (32 k)']) + box(450,128,170,40,['div_3_50 → 11.2896 (44.1 k)']) + box(450,190,170,52,['pin 98 → pin 10 loop','altpll2 ×2 → 49.152 (192 k)'])
    + box(450,270,170,52,['REF_MCLK (CS8416 RMCK)','SR_DETECT_192 ÷1/÷2/÷4']) + box(680,120,150,90,['mclk_sel','→ MCLK_5394 ≤12.288','→ mclk_aes 256 fs','→ DFS[1..0]'])
    + [40,90,148,216,296].map(y=>`<line x1="620" y1="${y}" x2="680" y2="165" stroke="var(--ink2)"/>`).join('') + `<line x1="400" y1="70" x2="450" y2="40" stroke="var(--ink2)"/><line x1="400" y1="70" x2="450" y2="90" stroke="var(--ink2)"/><line x1="400" y1="70" x2="450" y2="216" stroke="var(--ink2)"/><line x1="400" y1="152" x2="450" y2="148" stroke="var(--ink2)"/>` },
  { name:'4 · One analog channel + AK5394A', note:'Converter 1 right channel, values from the issue 2 netlist trace in README §I.3. The other three channels are identical (U6/U4 → U5, U9/U7 → U8).', svg:()=>
    `<text x="30" y="80" font-size="12" fill="var(--accent2)">IN+ (TB1)</text><text x="30" y="200" font-size="12" fill="var(--accent2)">IN− (TB1)</text>
     <line x1="100" y1="76" x2="140" y2="76" stroke="var(--ink)"/><rect x="140" y="68" width="50" height="16" fill="none" stroke="var(--ink)"/><text x="148" y="64" font-size="10" fill="var(--ink2)">R18 21k5</text><line x1="190" y1="76" x2="260" y2="76" stroke="var(--ink)"/>
     <line x1="100" y1="196" x2="140" y2="196" stroke="var(--ink)"/><rect x="140" y="188" width="50" height="16" fill="none" stroke="var(--ink)"/><text x="148" y="184" font-size="10" fill="var(--ink2)">R23 21k5</text><line x1="190" y1="196" x2="260" y2="196" stroke="var(--ink)"/>
     <text x="200" y="104" font-size="10" fill="var(--ink2)">R19 10k → VCOM</text><text x="200" y="224" font-size="10" fill="var(--ink2)">R25 10k → VCOM</text>
     <polygon points="260,56 260,96 300,76" fill="none" stroke="var(--ink)"/><text x="262" y="50" font-size="10" fill="var(--ink)">U4A NE5532</text>
     <polygon points="260,176 260,216 300,196" fill="none" stroke="var(--ink)"/><text x="262" y="236" font-size="10" fill="var(--ink)">U4B NE5532</text>
     <rect x="268" y="120" width="34" height="34" fill="none" stroke="var(--ink)"/><text x="310" y="134" font-size="10" fill="var(--ink2)">Rg = R16 21k5 + RV1 2k (trim)</text><text x="310" y="148" font-size="10" fill="var(--ink2)">H3 → R14 36k ∥ (+2.2 dB)</text>
     <line x1="300" y1="76" x2="420" y2="76" stroke="var(--ink)"/><line x1="300" y1="196" x2="420" y2="196" stroke="var(--ink)"/><text x="330" y="70" font-size="10" fill="var(--ink2)">R17 150 Ω</text><text x="330" y="190" font-size="10" fill="var(--ink2)">R22 150 Ω</text>
     <text x="430" y="140" font-size="10" fill="var(--ink2)">R20 90R9 ∥ 6n8 + 27p</text>`
    + chip(600,50,170,'U5 AK5394A',[['AINR+','(25)'],['AINR−','(24)'],['MCLK','MCLK_5394_1'],['DFS0/1','DFS0/1_5394_1'],['HPF','HPF_5394_1'],['RSTN','RSTN_1'],['ZCAL / CAL','ZCAL_1 / CAL_1']],[['SDATA','→ pin 20'],['SCLK','→ pin 35'],['LRCK','→ pin 34'],['FSYNC','→ pin 21'],['SMODE1','SMODE1_1']],'24-bit ΔΣ, I²S master') },
  { name:'5 · Reference input and CS8416', note:'Transformers and terminations from README §I.5; CS8416 register values from init_CS8416() in cs84xx.c; FPGA pins from POD14A.qsf.', svg:()=>
    box(30,50,170,60,['BNC1 → C104 → T1','R68 75 Ω → DS34LV86','IN1_75 → pin 70 REF2']) + box(30,140,170,60,['TB5 → C105 → T2','R69 110 Ω → DS34LV86','IN1_110 → pin 68 REF1'])
    + box(250,95,150,60,['FPGA sel4_1','in1 REF1 · in2 REF2','sel = reference bits']) + `<line x1="200" y1="80" x2="250" y2="115" stroke="var(--ink)"/><line x1="200" y1="170" x2="250" y2="135" stroke="var(--ink)"/><line x1="400" y1="125" x2="470" y2="125" stroke="var(--ink)"/><text x="406" y="118" font-size="10" fill="var(--accent2)">AES_8416 pin 75</text>`
    + chip(510,80,170,'U11 CS8416',[['RXP3','← FPGA pin 75'],['CCLK/CDIN','PC2 / PC3'],['CDOUT','PC1'],['CS / RST','PC6 / PC7'],['FILT','R70 3k48 + C108 15n ∥ C106 1n']],[['RMCK','REF_MCLK pin 79'],['OSCLK','REF_SCLK 77'],['OLRCK','REF_LRCLK 76'],['SDOUT','REF_DATA 78'],['GPO0–2','pins 84–86']],'reg 01=04 02=08 03=88 04=9B 05=B0 06=10') },
  { name:'6 · AES outputs', note:'Output circuits from README §I.5 (issue 2 netlist). The FPGA itself is the AES3 transmitter (i2s8416_aes.vhd biphase-mark encoder).', svg:()=>{ let s=''; [0,1].forEach(k=>{ const y=60+k*180;
      s += `<text x="30" y="${y+5}" font-size="12" fill="var(--accent2)">FPGA OUT${k+1} (pin ${71+k})</text><line x1="180" y1="${y}" x2="230" y2="${y}" stroke="var(--ink)"/><text x="186" y="${y-6}" font-size="10" fill="var(--ink2)">R${8-k} 30 Ω</text>
        <polygon points="230,${y-14} 230,${y+14} 258,${y}" fill="none" stroke="var(--ink)"/><text x="262" y="${y-16}" font-size="10" fill="var(--ink)">DS34LV87</text><line x1="258" y1="${y}" x2="330" y2="${y}" stroke="var(--ink)"/><text x="270" y="${y+16}" font-size="10" fill="var(--ink2)">R${89-k} 110 Ω + 0.1 µF</text>
        <path d="M330 ${y} q10 -10 0 -20 m14 0 q-10 10 0 20" fill="none" stroke="var(--ink)" transform="translate(0 10)"/><text x="360" y="${y+4}" font-size="12" fill="var(--ink)">T${4-k} → Phoenix TB${6+k} (+ − G), isolated</text>
        <line x1="200" y1="${y}" x2="200" y2="${y+70}" stroke="var(--ink)"/><line x1="200" y1="${y+70}" x2="230" y2="${y+70}" stroke="var(--ink)"/><text x="204" y="${y+62}" font-size="10" fill="var(--ink2)">1 µF</text>
        <polygon points="230,${y+56} 230,${y+84} 258,${y+70}" fill="none" stroke="var(--ink)"/><text x="262" y="${y+90}" font-size="10" fill="var(--ink)">EL5263 gain −0.75</text><line x1="258" y1="${y+70}" x2="330" y2="${y+70}" stroke="var(--ink)"/><text x="276" y="${y+64}" font-size="10" fill="var(--ink2)">75 Ω</text><circle cx="342" cy="${y+70}" r="10" fill="none" stroke="var(--ink)"/><text x="360" y="${y+74}" font-size="12" fill="var(--ink)">BNC${2+k} — shell on GNDD (not isolated)</text>`; });
    return s + `<text x="560" y="420" font-size="11" fill="var(--ink2)">≈1.2 Vpp predicted, 1.1 Vpp measured into 75 Ω</text>`; } },
];
function viewSchem(m){
  window.__pod14aKeys = false;
  let i = 0;
  m.innerHTML = card('Schematic set — REDRAWN from net names in POD14A.qsf, the firmware headers and the README netlist trace (not the P-CAD drawing)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD 2002 schematic (6 sheets) is only in <span class="mono">#POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/</span> (<span class="mono">POD14Aiss2.sch</span>, <span class="mono">POD14A-iss1.pdf</span>). These sheets are a reading guide; blue labels are net names.</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="884" y="456" text-anchor="end" font-size="10" fill="var(--ink2)">POD14A · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__pod14aKeys = true;
  m.innerHTML = `<div class="grid2">
    ${card('ATmega128 main loop — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('Reference / rate state machine (live)', `<div id="fsm"></div>`)}${card('ADC reset discipline (live)', `<div id="adcfsm"></div>`)}</div></div>
  <div class="grid2">
    ${card('Control word: ALTERA_write → shift_in → FPGA nets (live)', `<div id="reg"></div>`)}
    ${card('FPGA clock pipeline (live: the active path is highlighted)', `<div id="pipe"></div>`)}
  </div>
  <div class="grid2">
    ${card('How the buttons did things — action → code → signal', `<div id="btn"></div>`)}
    ${card('Firmware variables at the playhead (snapshot after this pass)', `<div id="vars"></div>`)}
  </div>`;
  const draw = ()=>{
    const t=SIM.t, st=stepAt(t), b=bootAt(t), sn = st.pass>=0? snap(st.pass) : null, on=powerAt(t);
    let s = `<svg viewBox="0 0 540 ${STEPS.length*44+90}" style="width:100%"><defs><marker id="p14a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="130" y="6" width="280" height="26" rx="13" fill="${b?'var(--accent2)':'var(--chip)'}" stroke="var(--line)"/><text x="270" y="24" text-anchor="middle" font-size="12" fill="${b?'#fff':'var(--ink)'}">main(): init, ALTERA_RESET, init_CS8416, EEPROM</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, act = on && !b && st.pass>=0 && st.step===j, warn = act && (st.waiting||st.saving);
      s += `<line x1="270" y1="${y-12}" x2="270" y2="${y}" stroke="var(--ink2)" marker-end="url(#p14a2)"/><rect x="30" y="${y}" width="470" height="32" rx="6" fill="${warn?'var(--warn)':act?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="40" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${act?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+27}" font-size="9.5" fill="${act?'#eef':'var(--ink2)'}">${p[2].length>84?p[2].slice(0,82)+'…':p[2]}</text>`; });
    const yb = 44+STEPS.length*44; s += `<path d="M500 ${yb-28} h22 V40 h-22" fill="none" stroke="var(--ink2)" marker-end="url(#p14a2)"/><text x="526" y="${yb/2}" font-size="10" fill="var(--ink2)" transform="rotate(90 526 ${yb/2})">while(1)</text>
      <text x="30" y="${yb+18}" font-size="11" fill="var(--ink2)">${!on?'Unit off.':b?'Still in main() start-up.':'Pass #'+st.pass.toLocaleString()+(st.waiting?' — blocked in wait(50000) × 2 (100 ms, no switch polling)':st.saving?' — inside SAVE_INFORMATION_EEPROM':'')}. Timer0 interrupt every 1 ms toggles PE3 in the background.</text></svg>`;
    m.querySelector('#flow').innerHTML = s;
    // reference FSM
    const node=(x,y,lbl,on_,sub)=>`<g><rect x="${x-78}" y="${y-30}" width="156" height="60" rx="12" fill="${on_?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-6}" text-anchor="middle" font-size="12" font-weight="700" fill="${on_?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="10" fill="${on_?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const S0 = sn && !sn.Astatus, S1 = sn && sn.Astatus && !sn.clocks_stable, S2 = sn && sn.clocks_stable && sn.reference_sel!==3;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 560 230" style="width:100%">
      ${node(85,70,'INTERNAL, scanning',S0,sn?'reference = '+REF_SHORT[sn.reference]+' · unlock '+sn.unlock_count+'/25':'')}
      ${node(280,70,'Locked, waiting',S1,sn?'clocks_stable_count '+sn.clocks_stable_count+'/25':'')}
      ${node(475,70,'EXTERNAL',S2,sn&&S2?'reference_sel = '+REF_SHORT[sn.reference_sel]:'reference_sel = REF1/2')}
      <path d="M163 60 H202" stroke="var(--ink2)" marker-end="url(#p14a2)"/><text x="182" y="30" font-size="9.5" text-anchor="middle" fill="var(--ink2)">reg 0x0C = 0</text>
      <path d="M358 60 H397" stroke="var(--ink2)" marker-end="url(#p14a2)"/><text x="378" y="30" font-size="9.5" text-anchor="middle" fill="var(--ink2)">26 passes</text>
      <path d="M475 100 Q 280 170 100 100" fill="none" stroke="var(--bad)" marker-end="url(#p14a2)"/><text x="270" y="150" font-size="10" text-anchor="middle" fill="var(--bad)">any error bit → INTERNAL on the very next pass (no hold-off)</text>
      <path d="M40 100 q -20 40 20 40 q 30 0 30 -40" fill="none" stroke="var(--ink2)" marker-end="url(#p14a2)"/><text x="20" y="165" font-size="9.5" fill="var(--ink2)">every 26 passes: REF1 ⇄ REF2</text>
      <text x="10" y="200" font-size="11" fill="var(--ink)">Each transition of reference_sel → reset_adc = YES (double ADC reset). STEP changes sample_rate in any state;</text>
      <text x="10" y="216" font-size="11" fill="var(--ink)">only in INTERNAL does it reset the ADCs. Now: ${sn?`sample_rate ${sn.sample_rate}, reference_sel ${REF_NAME[sn.reference_sel]}`:'—'}</text></svg>`;
    // ADC FSM
    const ph = !sn ? -1 : sn.reset_adc ? (sn.no_of_adc_resets===0?1:3) : (sn.no_of_adc_resets>=2?0: 2);
    const waiting = st.waiting;
    const an = (x,lbl,k,sub)=>`<rect x="${x}" y="20" width="96" height="54" rx="8" fill="${(ph===k||(k===2&&waiting))?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+48}" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="${(ph===k||(k===2&&waiting))?'#fff':'var(--ink)'}">${lbl}</text><text x="${x+48}" y="60" text-anchor="middle" font-size="9.5" fill="${(ph===k||(k===2&&waiting))?'#fff':'var(--ink2)'}">${sub}</text>`;
    m.querySelector('#adcfsm').innerHTML = `<svg viewBox="0 0 520 110" style="width:100%">${an(4,'IDLE',0,'RSTN high')}${an(128,'RESET #1',1,'5714 passes ≈ 1 s')}${an(252,'GAP',2,'wait 100 ms')}${an(376,'RESET #2',3,'5714 passes ≈ 1 s')}
      ${[100,224,348].map(x=>`<path d="M${x} 47 H${x+28}" stroke="var(--ink2)" marker-end="url(#p14a2)"/>`).join('')}<path d="M424 74 Q 250 110 52 74" fill="none" stroke="var(--ink2)" marker-end="url(#p14a2)"/>
      <text x="8" y="104" font-size="10.5" fill="var(--ink2)">${sn?`reset_count ${sn.reset_count}/5714 · no_of_adc_resets ${sn.no_of_adc_resets}/RESET_MAX 2 · RSTN ${sv('rst',t,0)?'high':'LOW'}`:''}</text></svg>
      <p class="small muted">Why twice: <span class="mono">mclk_sel</span> switches clocks combinationally, so the first calibration may see runt clock pulses; the second runs on settled clocks (README §II.3). It also covers <span class="mono">SR_DETECT_192</span>, which needs 16–32 ms (${inf}) to classify a new reference rate.</p>`;
    // control word
    const w = sv('word',t,0); const fields = [[7,7,'da_disabled','aes_off','1 = hold the AES lines static'],[6,5,'reference_sel','ref_sel[1..0]','0 REF1 · 1 REF2 · 3 INTERNAL'],[4,2,'sample_rate','sr[2..0]','0 32k … 4 192k (≥4 → 192k)'],[1,0,'reference','aes_sw[1..0] → sel4_1','which REF connector feeds the CS8416']];
    m.querySelector('#reg').innerHTML = `<div class="mono" style="font-size:20px;letter-spacing:4px;margin:4px 0">${'00000000'} ${[...bin8(w)].map((b,i)=>`<span style="color:${i===0?'var(--bad)':i<3?'var(--warn)':i<6?'var(--accent)':'var(--accent2)'}">${b}</span>`).join('')}</div>
      <table class="kv"><tr><th>bits</th><th>firmware (D6203A.c)</th><th>FPGA net (shift_in q)</th><th>value</th><th>meaning</th></tr>${fields.map(([h,l,a,bn,mn])=>{ const v=(w>>l)&((1<<(h-l+1))-1); return `<tr><td class="mono">${h===l?h:h+'–'+l}</td><td class="mono">${a}</td><td class="mono">${bn}</td><td class="mono">${v}</td><td class="small">${mn}</td></tr>`; }).join('')}
      <tr><td class="mono">15–8</td><td class="mono">data_upper = 0</td><td class="mono">q8–q15</td><td class="mono">0</td><td class="small">sent, unused</td></tr></table>
      <p class="small">Upper byte first, MSB first (write_data). <span class="mono">shift_in</span> is a 16-bit shift register with a latch that is transparent while the strobe (PE7) is high: <span class="mono">STROBE_WRITE_LOW; HIGH; LOW</span>.</p>
      <table class="kv"><tr><th>ALTERA1..18</th><td class="small">Declared in altera.c for an 18-byte read-back (“ALTERA 1-6 first group of audio … 13 DIP SWITCH”). In POD14A only <span class="mono">ALTERA1/ALTERA2</span> are ever written: the bits <span class="mono">write_data()</span> samples on PE4 (FPGA4 ← <span class="mono">shift_out</span>) while it shifts. Nothing reads them. <span class="mono">ALTERA_read()</span> (ALTERA1–6 via PA1/PA6) is never called; ALTERA7–18 are behind <span class="mono">#ifdef ALTERA2_read / ALTERA3_read</span>, which are not defined.</td></tr></table>`;
    // pipeline
    const rs=(w>>5)&3, sr=(w>>2)&7, ext = rs!==3, fsr=sv('rrate',t,48000), det=detFor(fsr);
    const hot = k=>{ if (!on) return false; if (ext) return ['ref','det','sel','adc','aes','cs'].includes(k); return k==='sel'||k==='adc'||k==='aes'||k==='pll'||(sr===0&&(k==='x24'||k==='d8'))||(sr===1&&(k==='x33'||k==='d11'))||(sr===2&&(k==='x24'||k==='h12'))||(sr===3&&(k==='x24'||k==='h12'))||(sr>=4&&(k==='x24'||k==='h12'||k==='p49')); };
    const nb=(k,x,y,w_,l1,l2)=>`<rect x="${x}" y="${y}" width="${w_}" height="40" rx="6" fill="${hot(k)?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w_/2}" y="${y+17}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${hot(k)?'#fff':'var(--ink)'}">${l1}</text><text x="${x+w_/2}" y="${y+32}" text-anchor="middle" font-size="9.5" fill="${hot(k)?'#fff':'var(--ink2)'}">${l2}</text>`;
    const aesMHz = ext ? (256*fsr/1e6).toFixed(4) : [8.192,11.2896,12.288,24.576,49.152][Math.min(sr,4)];
    const adcMHz = ext ? (256*fsr/[1,2,4][det]/1e6).toFixed(4) : [8.192,11.2896,12.288,12.288,12.288][Math.min(sr,4)];
    m.querySelector('#pipe').innerHTML = `<svg viewBox="0 0 560 330" style="width:100%">
      ${nb('pll',10,10,130,'PLL1705 (27 MHz)','AUDIO_CLOCK / 2')}${nb('x24',160,10,120,'INTCLK_24576','pin 99')}${nb('x33',160,60,120,'INTCLK_33868','pin 100')}
      ${nb('h12',300,10,120,'÷2 → 12.288','int_mclk_24_2')}${nb('d8',300,60,120,'div_3_50 → 8.192','mclk_8')}${nb('d11',300,110,120,'div_3_50 → 11.29','mclk_11')}${nb('p49',300,160,120,'altpll2 → 49.152','98 → 10 loop')}
      ${nb('cs',10,230,130,'CS8416 RMCK','REF_MCLK 256 fs')}${nb('ref',160,230,120,'ref_mclk','to AES framer')}${nb('det',300,230,120,'SR_DETECT_192','÷'+[1,2,4][det]+' (det '+['48','96','192'][det]+'-class)')}
      ${nb('sel',440,100,110,'mclk_sel','ref '+(ext?'ext':'="11"')+' · sr '+sr)}
      ${nb('adc',440,190,110,'MCLK_5394 ×2',adcMHz+' MHz · DFS '+['00','01','10'][ext?det:Math.max(0,Math.min(sr,4)-2)])}${nb('aes',440,250,110,'i2s8416_aes ×2',aesMHz+' MHz (256 fs)')}
      ${[[140,30,160,30],[140,30,160,80],[280,30,300,30],[280,30,300,80],[280,80,300,130],[280,30,300,180],[420,30,440,120],[420,80,440,120],[420,130,440,120],[420,180,440,120],[140,250,160,250],[280,250,300,250],[420,250,440,130],[495,140,495,190],[495,140,495,250]].map(([a,b_,c_,d])=>`<line x1="${a}" y1="${b_}" x2="${c_}" y2="${d}" stroke="var(--ink2)"/>`).join('')}
      <text x="10" y="310" font-size="11" fill="var(--ink)">${!on?'Unit off.':ext?`External: AES framer runs on the CS8416's 256 fs clock (${fmtRate(fsr)}); the ADCs get it divided to ≤12.288 MHz.`:`Internal ${RATE_TXT[Math.min(sr,4)]} kHz${sr>4?' (sr = '+sr+' → the “else” branch = 192 k)':''}: ADC MCLK ${adcMHz} MHz, AES framer ${aesMHz} MHz.`}</text></svg>
      <p class="small muted">mclk_sel.vhd comments still describe an <b>AK4396</b> DAC (“divide mclk by 2 … set ak4396 for normal / double / quad”) from the D6203.</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the wire</th></tr>
      <tr><td>Press STEP</td><td class="mono small">SWITCH_ENCODER1 → READ_ENCODER1 (PD2) → TRANSLATE_ENCODER1 → sample_rate++ (wrap at SAMPLE_RATE_MAX) → DEBOUNCE_ENCODER1 (255 passes)</td><td class="small">Word bits 4–2 on the same pass's ALTERA_write → mclk_sel re-clocks the ADCs and the AES framer. Internal mode: reset_adc → RSTN low ×2. Rate LED moves in REFRESH_LEDS.</td></tr>
      <tr><td>Plug a reference</td><td class="mono small">CS8416_READ_LOCK_ALL → Astatus → lock_status_changed → clocks_stable_count → clocks_stable → ALTERA_write (reference_sel = reference)</td><td class="small">Bits 6–5 = REF1/REF2 → mclk_sel switches to REF_MCLK, SR_DETECT_192 divides it; EXT REF on (PG0); double ADC reset.</td></tr>
      <tr><td>Reference on the other connector</td><td class="mono small">unlock_count ≥ LOCK_CONSTANT → reference = REF1 ⇄ REF2</td><td class="small">Bits 1–0 → sel4_1 feeds REF1 (pin 68) or REF2 (pin 70) to the CS8416 on AES_8416 (pin 75).</td></tr>
      <tr><td>Pull the reference</td><td class="mono small">Astatus = NO_LOCK → ALTERA_write: reference_sel = INTERNAL_REF</td><td class="small">Bits 6–5 = 11 on the next pass; INT REF on (PG1); double ADC reset; the scan starts.</td></tr>
      <tr><td>Stop touching it</td><td class="mono small">save_settings_count → SAVE_SETTINGS_CONSTANT (57 140) → SAVE_INFORMATION_EEPROM</td><td class="small">EEPROM addresses 10 (0xAA), 13 (reference), 14 (sample_rate), ≈10 s after the reset started.</td></tr>
      <tr><td>Power on</td><td class="mono small">main(): init_devices → ALTERA_RESET(1000) → init_CS8416 → ALTERA_write → RESTORE_INFORMATION_EEPROM</td><td class="small">nCONFIG pulse reloads the FPGA; outputs muted (da_disabled) for ≈0.9 s.</td></tr>
      <tr><td>Turn a trim / move a jumper</td><td class="mono small">— (analog only)</td><td class="small">Gain of one channel, 0.36 dB range / +2.2 dB.</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    m.querySelector('#vars').innerHTML = sn ? `<table class="kv">${VARS.map(k=>`<tr><th class="mono">${k}</th><td class="mono">${sn[k]}${k==='reference'||k==='reference_sel'||k==='preference_sel'?' <span class="muted">'+(REF_NAME[sn[k]]||'')+'</span>':''}</td></tr>`).join('')}</table>` : '<p class="muted">No pass at the playhead (off or in main() start-up).</p>';
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod14aKeys = false;
  const f = (file, fn)=>`<span class="small muted">[<span class="mono">${file}</span> · <span class="mono">${fn}</span>]</span>`;
  m.innerHTML = card('What the POD14A firmware is up to — findings from the source', `<ol><li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#POD #SERIES/POD14A - #Master/POD14A - #ARTWORK #DA #2016/POD14A-FRONT&REAR-SILK (CURVE).cdr', 'POD14A-FRONT&REAR-SILK (CURVE).cdr')} (2016-06-16|49).</b> GREEN + WHITE front plates and the WHITE rear plate registered on the panel outline (assets/pod14a-front.svg, pod14a-rear.svg, pod14a-rear-ink.svg). The CDR confirms the earlier PDF finding: the SAMPLE RATE row is legended 32 · 44.1 · 48 · 96 and the fifth LED hole (drilled, with its crosshair) has no “192” legend, so the overlay text stays marked as taken from the photo. Rear legend: 100-240 VAC, 50-60 Hz, ½ A.S.B. The older rear sheet POD14A-SILK-RR-ISS2.cdr (2010|43) was not used.</li>
    <li><b>It is a D6203 openGear card with a different job.</b> The project is <span class="mono">d6203_test.prj</span> building <span class="mono">D6203_TEST.hex</span>, the logic lives in <span class="mono">D6203A.c</span>, <span class="mono">common.h</span> still has <span class="mono">#define ROSS_VIDEO</span>, and <span class="mono">D6203A.c</span> keeps the card's routing modes (<span class="mono">MODE1</span> “OUT1 = IN1, OUT2 = IN1” … <span class="mono">MODE5</span> “REF2”) that POD14A cannot do. ${f('D6203A.c, common.h, D6203_TEST.mak','—')}</li>
    <li><b>The CAN / DashBoard code is not in the build.</b> <span class="mono">CAN.c</span> (1327 lines) and <span class="mono">Dashboard.c</span> (936) sit in the folder, but the <span class="mono">.mak</span> <span class="mono">FILES</span> list leaves them out. <span class="mono">eeprom.c</span> still includes <span class="mono">ioCAN128v.h</span>, the AT90CAN128 header. ${f('D6203_TEST.mak, eeprom.c','FILES')}</li>
    <li><b>The “chirp” chirps at nothing.</b> <span class="mono">NO_LOCK_CHIRP()</span> runs on every pass, locked or not, toggling <span class="mono">chirp_on</span> 1000 passes on / 7000 off. Nothing reads <span class="mono">chirp_on</span>. The REF LEDs are steady; only the D6203 used it. See the “chirp_on” lane. ${f('d6203_test.c','NO_LOCK_CHIRP, REFRESH_LEDS')}</li>
    <li><b>CAL_LED is the FPGA bus clock.</b> <span class="mono">REFRESH_LEDS()</span> calls <span class="mono">CAL_LED_ON</span> (<span class="mono">PORTE |= BIT6</span>) on every pass while <span class="mono">reset_adc</span> is set. PE6 is <span class="mono">ALTERA_CLOCK</span>, so it clocks one stray bit into <span class="mono">shift_in</span> each pass. It is harmless only because the next <span class="mono">ALTERA_write</span> shifts 16 fresh bits through before the strobe. Zoom to one pass during a reset to see the red PE6 edge on the bus lane. ${f('D6203A.h, altera.h, d6203_test.c','REFRESH_LEDS')}</li>
    <li><b>The DIP switches and the PCM bit are never read.</b> <span class="mono">READ_DIP_SWITCHES()</span> is never called, and Port A is not connected anyway, so <span class="mono">ALTERA_write</span> computes <span class="mono">temp = INVERT_DATA(dip_switches)</span> and throws it away. The DIP-switch block that set reference and rate is inside <span class="mono">/* … */</span>. <span class="mono">CS8416_READ_AUDIO_ALL()</span> (PCM / non-PCM via register 0x0B) is commented out as well, and <span class="mono">RESET_CS8416()</span> is never called. ${f('d6203_test.c, D6203A.c, cs84xx.c','READ_DIP_SWITCHES, ALTERA_write, CS8416_READ_AUDIO_ALL')}</li>
    <li><b>The MCU never learns the incoming rate.</b> <span class="mono">write_data()</span> samples PE4 into <span class="mono">ALTERA1/ALTERA2</span> while it shifts, and nobody reads them. <span class="mono">ALTERA_read()</span> (18 bytes) is never called. With a reference, the rate LEDs show the stored internal rate, not the rate on the wire (README S2). Try tutorial lesson 6.</li>
    <li><b>Timing is counted in loop passes.</b> 5714 passes = 1 s (“1 cycle = 175us”), 57 140 = 10 s, 25 = lock hold-off. Timer0 runs every 1 ms but is used only to toggle the 500 Hz gate for <span class="mono">SR_DETECT_192</span>; its ISR comment still says “reload counter value for 100us”. Anything that lengthens a pass stretches every timeout. ${f('d6203_test.c, D6203A.c','ADC_RESET_CONSTANT, timer0_ovf_isr')}</li>
    <li><b>The loop goes deaf for 100 ms between the two ADC resets.</b> <span class="mono">wait(50000)</span> twice, inside the loop, with only <span class="mono">WDR()</span>. A STEP press shorter than that (${inf}: under about 100 ms) during the gap is never seen, and neither is a reference change. ${f('d6203_test.c','main: no_of_adc_resets < RESET_MAX')}</li>
    <li><b>A second change during a reset does not restart the 1 s count.</b> A new rate or reference sets <span class="mono">reset_adc = YES</span> and <span class="mono">no_of_adc_resets = 0</span>, but leaves <span class="mono">reset_count</span> where it was. The first reset after the second change can therefore be much shorter than 1 s (press STEP twice, about 0.85 s apart, and watch the reset line). The second reset is always full length. ${f('d6203_test.c','main: reset_count')}</li>
    <li><b>Any reference error means “no reference”.</b> <span class="mono">CS8416_READ_LOCK_ALL()</span> treats any non-zero register 0x0C as unlocked. Parity, CRC and validity errors all count, so a perfectly-timed programme feed with V = 1 is refused (scenario “Programme feed with the V bit set”). ${f('cs84xx.c','CS8416_READ_LOCK_ALL')}</li>
    <li><b>No hold-off on the way down, 26 passes on the way up.</b> <span class="mono">ALTERA_write</span> switches to <span class="mono">INTERNAL_REF</span> on the first unlocked read; returning needs <span class="mono">clocks_stable</span> after 26 locked passes. While unlocked, <span class="mono">unlock_count</span> swaps REF1/REF2 every 26 passes. While locked it keeps counting and wraps at 255, so on loss of lock the first swap usually happens immediately (README S5). ${f('d6203_test.c','main: unlock_count')}</li>
    <li><b>A corrupt EEPROM byte selects 192 kHz with no LED.</b> <span class="mono">RESTORE_INFORMATION_EEPROM()</span> does not range-check. With <span class="mono">sample_rate = 7</span>, <span class="mono">REFRESH_LEDS</span> has no matching branch (no LED), STEP counts up to 255 before it wraps, and the FPGA's <span class="mono">mclk_sel</span> sends anything not 0–3 to its <span class="mono">else</span> branch (commented <span class="mono">-- sr="011" then--192</span>), so the unit quietly runs at 192 kHz. Above 7, <span class="mono">sample_rate &lt;&lt; 2</span> spills into the reference_sel bits of the control word. Scenario “Power-up with a corrupt EEPROM”. ${f('D6203A.c, mclk_sel.vhd','RESTORE_INFORMATION_EEPROM, mclk_sel')}</li>
    <li><b>Every power-up schedules an EEPROM write.</b> The first pass after boot sees <span class="mono">reference_sel ≠ preference_sel (0xFF)</span>, starts the double ADC reset, and the reset sets <span class="mono">save_settings = YES</span>. About 10 s later the same bytes are written back (see the 12 s strip after a cold start). A rate change while locked to a reference never sets <span class="mono">save_settings</span> (README S3). ${f('d6203_test.c','main: save_settings')}</li>
    <li><b>“ALTERA reset” really reloads the FPGA.</b> PC0 drives Q1 onto nCONFIG, so <span class="mono">ALTERA_RESET(1000)</span> at boot clears the Cyclone and reloads it from the M25P40 during the 150 ms wait that follows. ${f('altera.c, README §I.7','ALTERA_RESET')}</li>
    <li><b>The gateware still talks about the D6203's DAC.</b> <span class="mono">mclk_sel.vhd</span>: “For the ak4396 divide mclk by 2 … set ak4396 for normal for 48K double for 96K and quad for 192K”. POD14A has no AK4396. <span class="mono">i2s_gen_cuv.vhd</span> (“created for D6203”) carries a 48-point −20 dBFS 1 kHz sine table (peak 0x0CCCCD = 0.1 FS) that the output path does not use. ${f('mclk_sel.vhd, i2s_gen_cuv.vhd','header comments, sd0…sd47')}</li>
    <li><b>The panel artwork lost a label.</b> The 2016|49 FRONT WHITE separation (sheet dated Jun.24/14) prints <span class="mono">32 44.1 48 96</span> under SAMPLE RATE and no “192”. The 2015 photo shows “192”, and so does the front panel here (dashed box). The 96 kHz drill crosshair appears only on the GREEN separation. ${f('POD14A-FRONT&REAR-SILK (CURVE).pdf','FRONT WHITE')}</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Pass length 175 µs is from the source. How it splits between the nine steps is ${inf}.</li>
    <li>Blocking waits use the source's own scale: <span class="mono">wait(50000)</span> “50ms of delay” → 1 µs per iteration, so <span class="mono">ALTERA_RESET(1000)</span> ≈ 1 ms. The EEPROM write stall (3 × 8.5 ms, ATmega128 datasheet), FPGA configuration time (≈30 ms), CS8416 lock time (64 frames), AK5394A calibration (8192 LRCK periods) and the 120 ms button press are ${inf}.</li>
    <li>RSTN_1/RSTN_2 are taken to follow FPGA6 (the <span class="mono">reset</span> net in POD14A_1.bdf); the ADCs output digital silence while in reset or calibrating (${inf}).</li>
    <li>The rate-detector settling time and the meter ballistics are ${inf}. External-reference channel status is not modelled bit by bit.</li>
    <li>Analog gain follows the README's netlist arithmetic: 0 dBFS = +24 dBu, trim ±0.18 dB about the factory setting, jumper +2.2 dB.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD14A - #Master/POD14A - #Engineering /Software/atmel/v100/d6203_test.c, D6203A.c/.h, altera.c/.h, cs84xx.c/.h, shaft_encoder1.c, eeprom.c, common.h, D6203_TEST.mak</li>
    <li>…/Software/altera/v100/POD14A.qsf, POD14A_1.bdf, SR_DETECT_192.vhd, mclk_sel.vhd, shift_in.vhd, shift_out.vhd, sel4_1.vhd, div_3_50.vhd, i2s_gen_cuv.vhd, i2s8416_aes.vhd, I2S_s_p.vhd</li>
    <li>…/POD14A - #Master/README.md (Parts I–III), …/Software/README.md</li>
    <li>…/POD14A - #Manual/POD14A MANUAL.docx (Rev Oct.01 2014) · …/#Engineering /MANUAL/POD14A Manual.pdf (${Y(2009)})</li>
    <li>…/POD14A - #ARTWORK #DA #2016/POD14A-FRONT&amp;REAR-SILK (CURVE).pdf, Pics/POD14A Front.jpg, POD14A Rear.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
loadScenario('run48');
SIM.register({
  footnotes:[{text:"The SAMPLE RATE row is legended 32 · 44.1 · 48 · 96; the fifth LED hole is drilled (with its crosshair) but has no “192” legend, although the 2015 photo shows one.", src:"#POD #SERIES/POD14A - #Master/POD14A - #ARTWORK #DA #2016/POD14A-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"The rear power legend reads “100-240 VAC, 50-60 Hz, ½ A.S.B.”, a wider range than the POD10A/POD12A “100-230 VAC”.", src:"#POD #SERIES/POD14A - #Master/POD14A - #ARTWORK #DA #2016/POD14A-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"An older rear-only sheet, POD14A-SILK-RR-ISS2.cdr, dates from 2010|43.", src:"#POD #SERIES/POD14A - #Master/POD14A - #ARTWORK #DA #2016/POD14A-SILK-RR-ISS2.cdr"}],
  id:'pod14a', name:'POD14A · dual A-D converter, AES/EBU out ('+Y(2008)+')', duration:1,
  product:'POD14A', year:2008, family:'#POD #SERIES',
  folder:'#POD #SERIES/POD14A - #Master',
  summary:'Half-rack dual analog-to-AES/EBU converter: two AK5394A ADCs at 32–192 kHz from an internal clock or an external AES reference. ATmega128 (step switch, LEDs, CS8416 lock, reference scan, ADC resets) + Cyclone EP1C3 (clocks, AES3 framing), firmware cloned from the D6203 openGear card.',
  highlights:['Firmware emulated pass by pass (175 µs) with its own variables','Interactive front and rear panel on the real silkscreen','11-step operator tutorial','Control word and FPGA clock pipeline live','Reference scan, double ADC reset, EEPROM save'],
  depth:'Full model',
  stepUnits:[
    {label:'1 MCU loop pass (175 µs)', period:()=>C.LOOP_T},
    {label:'1 AES frame (1 sample)', period:()=>1/Math.max(1,fsAt(SIM.t)>0?fsAt(SIM.t):48000)},
    {label:'1 AES block (192 frames)', period:()=>192/(fsAt(SIM.t)>0?fsAt(SIM.t):48000)},
    {label:'1 ms (Timer0 tick)', period:()=>0.001},
    {label:'26 passes (REF scan dwell)', period:()=>26*C.LOOP_T},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (REF scan)'],[0.004,'4 ms (1 AES block @48k)'],[0.001,'1 ms'],[0.0004,'400 µs (2 passes)'],[0.00018,'180 µs (1 pass)'],[0.00006,'60 µs (3 AES frames)']],
  defaultZoom:1,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD14A', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
