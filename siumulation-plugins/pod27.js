/* =====================================================================
   POD27 — SDI audio muxer: embeds one group (2 × AES = 4 channels) into SMPTE 272M SD-SDI
   (Ward-Beck Systems, firmware Aug 2003|36 → V200 Apr 2012|45)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #POD #SERIES/POD27 - #Master/ unless noted):
   - POD27 - #Engineering/Software/<v100|v101|v102|v102 no src|v103w|working|working AA|v200|27-014>/
       27v100.asm (MAIN, process, set_cascade, refreshgs9023_2, readgs9023s, refresh_status, refresh8420_1/2,
       shiftout, read8420s16, read8420s15, shiftin, delay_2, run_stop, check_aes3/4, refresh_leds),
       init405.asm (cs8420reg… constants, RAM map, INIT), switch.asm (switch_press1/2, switch_debounce1/2),
       ee_data.asm (eer, eew, eewrite, eeread), ad.asm (audio_source1/2, audio_source_type1/2),
       autodetect.asm (autodetect1/2), 27v100.err / 27V100.ERR
   - POD27 - #Engineering/PCB/pod27iss2.net, pod27iss2.bom, pod27iss2.ECO (P-CAD 2002, 19 Feb 2004)
   - POD27 - #Engineering/POD27sheet1/2/4.pdf (schematic sheets, sheet 3 missing), POD27 - Functional Diagram.cdr
   - POD27 - #Engineering/MANUAL/POD27MAN.doc ("AUDIO MUXER")
   - POD27 - #TESTREPORT/POD27-V200-25APR12.pdf, POD27-CABLE LENGTH.pdf (17 Sep 2013)
   - ../POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR(FINAL CURVE).cdr
       (Jul.02/14, converted with Inkscape, ink-only objects exported to PDF and cut with tools/silk_extract.py:
        FRONT GREEN / FRONT WHITE / REAR WHITE at 200 dpi, x 292–2006, y 156–477 / 686–1007 / 1200–1521
        → assets/pod27-front-green.png, pod27-front-white.png, pod27-rear-white.png, 1714 × 321 px;
        replaced 2026|59 by the vector assets/pod27-front.svg, pod27-rear.svg from the same .cdr).
       Drill and cut-out positions come from the same drawing's guide layer; colours from Pics/POD27 Front.jpg, Rear.jpg.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const hx = v => (v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');
const h3 = v => (v&1023).toString(16).padStart(3,'0').toUpperCase();
const mono = s => `<span class="mono">${s}</span>`;

/* ---------------- constants from the source, netlist and BOM ---------------- */
const FOSC = 4.9152e6;               // X2 4.9152 (BOM) on U12 pins 30/31 = OSC1/OSC2 (netlist)
const TCY = 4/FOSC;                  // 813.8 ns
/* One main-loop pass, counted instruction by instruction from 27v100.asm (V200). shiftout = 8 × 5 Tcy + call/return,
   refresh8420_x = 17 SPI bytes ≈ 863 Tcy, read8420s16 ≈ 271 Tcy (called twice). Branch-dependent: ±5 %. */
const SEG = [
  ['sw',   32, 'switch_press1/2, switch_debounce1/2', '--accent2'],
  ['gsw',  86, 'refreshgs9023_2 (9 bus writes)', '#c77d2a'],
  ['gsr',  38, 'readgs9023s', '#c77d2a'],
  ['spi1',863, 'refresh8420_1 → U14 (AES1)', '--accent'],
  ['spi2',863, 'refresh8420_2 → U10 (AES2)', '--accent'],
  ['r16', 542, 'read8420s16 ×2 (lock)', '#3f8fbf'],
  ['r15', 279, 'read8420s15 (audio/data)', '#3f8fbf'],
  ['proc', 80, 'process (pclath 2)', '--warn'],
  ['led',  96, 'refresh_status + refresh_leds (4094)', '#8a5cc7'],
  ['chk',  48, 'check_aes3/4', '--bad'],
  ['ad',   42, 'autodetect1/2, audio_source_type1/2, delay_2, eewrite', '--ink2'],
];
const PASS_TCY = SEG.reduce((a,s)=>a+s[1],0);       // 2969 Tcy
const PASS = PASS_TCY*TCY;                          // ≈ 2.42 ms
const C = {
  LOCK_T: 0.005,        // CS8420 receiver PLL lock time — INFERRED (it must be well under the 9-pass autodetect dwell)
  PWRT: 0.072,          // power-up timer: config bits are not in the source — INFERRED PWRTE on
  BOOT_TCY: 256*3 + 2*870 + 120,   // pdelay loop + audio_source1/2 (refresh8420 each) + eeread
  EE_T: 0.004,          // EEPROM write: the second eew waits for the first — INFERRED typical 4 ms
  PRESS: 0.15,          // a click holds the button 150 ms — INFERRED
  WARM: 1.2,            // seconds emulated before 0 s for the "already running" scenarios
  HORIZON: 1,
  EQ_MAX: 250,          // max SDI input cable (POD27-CABLE LENGTH.pdf, V200 PAL SD625)
};
const DETECT = {dc1:2, dc:9, count3:8};             // detect_count1, detect_count, count3 (init405.asm)
const STD = {525:{lps:15734.2657, fps:59.94, lines:525, edh:9, word:0x81}, 625:{lps:15625, fps:50, lines:625, edh:5, word:0x85}};
/* group tables from process: set21…set24 */
const GRP = [{a23:0xEF,a24:0x8F},{a23:0xCD,a24:0x8E},{a23:0xAB,a24:0x8D},{a23:0x89,a24:0x8C}];
const DID = {aud:[0xFF,0xFD,0xFB,0xF9], ext:[0xFE,0xFC,0xFA,0xF8], ctl:[0xEF,0xEE,0xED,0xEC]};   // SMPTE 272M
const did10 = x => { let p=0; for (let k=0;k<8;k++) p^=(x>>k)&1; return (x&255)|(p<<8)|((p?0:1)<<9); };

/* firmware builds in the archive */
const FW = {
  v100:  {name:'v1.00 (Aug 2003)', std:525, addr22:null, sw1:true, sw2:true, unlock:false, reg2:0x00},
  v101:  {name:'v1.01 (un_lock / AUDIO_LOCK)', std:525, addr22:null, sw1:true, sw2:true, unlock:true, reg2:0x00},
  v102:  {name:'v1.02 (addr22 = E1)', std:525, addr22:0xE1, sw1:true, sw2:true, unlock:false, reg2:0x00},
  v102n: {name:'v1.02 “no src” (reg2 = 20h)', std:525, addr22:0xE1, sw1:true, sw2:true, unlock:false, reg2:0x20},
  v103w: {name:'v1.03w (addr22 = C1)', std:525, addr22:0xC1, sw1:true, sw2:true, unlock:false, reg2:0x00},
  v200:  {name:'V200 (Ali, Apr 2012, 625 PAL)', std:625, addr22:0xE1, sw1:true, sw2:true, unlock:false, reg2:0x00},
  c014a: {name:'27-014 v100 (custom, SELECT off)', std:525, addr22:null, sw1:false, sw2:true, unlock:false, reg2:0x00},
  c014b: {name:'27-014 v101 (custom, both buttons off)', std:525, addr22:null, sw1:false, sw2:false, unlock:false, reg2:0x00},
};
const RAM22 = 0x5A;   // power-up RAM in addr22 for builds that never initialise it — INFERRED (undefined on a real PIC)

/* ---------------- scenarios ---------------- */
const base = ()=>({fw:'v200', on:true, sdi:{on:true, std:625, len:50, emb:[]}, aes:[{conn:'bnc', fs:48000, data:false, vpp:2},{conn:'tb', fs:44100, data:false, vpp:2}], ee:{0:0x00, 20:0xAA}, ram:0x00, ev:[]});
const SCEN = {
  run:     {name:'Running: 625 SDI, AES1 on BNC (48 k), AES2 on Phoenix (44.1 k), group 1', mk:b=>b},
  cold:    {name:'Power-up from cold at 20 ms', mk:b=>(b.on=false, b.ev=[{t:0.02,type:'power',on:true}], b)},
  select:  {name:'Press SELECT at 200 ms (group 1 → 2)', mk:b=>(b.ev=[{t:0.2,type:'btn',b:'sel',dur:0.15}], b)},
  cascade: {name:'SDI already carries group 1: CASCADE on at 200 ms, embedding into group 2', mk:b=>(b.sdi.emb=[1], b.ee[0]=0x01, b.ev=[{t:0.2,type:'btn',b:'cas',dur:0.15}], b)},
  unplug:  {name:'AES1 pulled from the BNC at 250 ms, plugged into the Phoenix at 550 ms', mk:b=>(b.ev=[{t:0.25,type:'aes',i:0,conn:'none'},{t:0.55,type:'aes',i:0,conn:'tb'}], b)},
  both:    {name:'AES2 connected to BNC and Phoenix at once (manual: “randomly lock”)', mk:b=>(b.aes[1].conn='none', b.ev=[{t:0.1,type:'aes',i:1,conn:'both'}], b)},
  dolby:   {name:'AES1 carries non-audio data (Dolby E): SRC bypassed', mk:b=>(b.aes[0].data=true, b)},
  wrong:   {name:'V200 fed 525-line SDI: ERROR on, SDI off', mk:b=>(b.sdi.std=525, b)},
  fresh:   {name:'Blank EEPROM at power-up (jumper0 = RAM garbage)', mk:b=>(b.on=false, b.ee={0:0xFF,20:0xFF}, b.ram=0xC3, b.ev=[{t:0.02,type:'power',on:true}], b)},
  custom:  {name:'Custom 27-014 v101: the buttons do nothing', mk:b=>(b.fw='c014b', b.sdi.std=525, b.ev=[{t:0.2,type:'btn',b:'sel',dur:0.2},{t:0.55,type:'btn',b:'cas',dur:0.2}], b)},
};
const D = { scenario:'run', cfg:null, events:[], press:C.PRESS, log:[] };
function loadScenario(id){ D.scenario=id; D.cfg = SCEN[id].mk(base()); D.events = D.cfg.ev.map(e=>Object.assign({scn:true}, e)); EMU_KEY=''; }

/* =====================================================================
   THE EMULATOR — the PIC16F874 main loop pass by pass, with its own file registers, the two CS8420s
   (U14 = AES1, U10 = AES2), the GS9023 embedder registers, the 4094 LED latch and the EEPROM.
   ===================================================================== */
let EMU = null, EMU_KEY = '';
function emulate(){
  const key = JSON.stringify([D.cfg, D.events]);
  if (key===EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const cfg = D.cfg, fw = FW[cfg.fw], H = C.HORIZON;
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  const sig = {}, notes = [], passes = [], spi = [];
  const rec = (k,t,v)=>{ const a = sig[k] || (sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; return; } } a.push([t,v]); };
  const note = (t,txt,cls)=>notes.push({t, txt, cls:cls||''});
  const ee = Object.assign({}, cfg.ee);
  /* inputs as functions of time */
  const lastEv = (type, t, f, def)=>{ let v=def; for (const e of ev) if (e.type===type && e.t<=t && (!f || f(e))) v=e; return v; };
  const powerAt = t => { const e=lastEv('power',t,null,null); return e? e.on : cfg.on; };
  const connAt = (i,t) => { const e=lastEv('aes',t,e=>e.i===i,null); return e? e.conn : cfg.aes[i].conn; };
  const connSince = (i,t) => { const e=lastEv('aes',t,e=>e.i===i,null); return e? e.t : -9; };
  const sdiAt = t => { const e=lastEv('sdi',t,null,null); return e? e.on : cfg.sdi.on; };
  const down = (b,t) => ev.some(e=>e.type==='btn' && e.b===b && t>=e.t && t<e.t+(e.dur||C.PRESS));
  const valid = (i,sel,t) => { const c=connAt(i,t), a=cfg.aes[i]; return (c==='both'||c===sel) && a.fs>=30000 && a.fs<=96000 && a.vpp>=0.2; };

  let v = null, chip = null, t = cfg.on ? -C.WARM : 0, on = false;
  const nextPower = from => { const e = ev.find(e=>e.type==='power' && e.t>from && e.on!==on); return e? e.t : Infinity; };
  const offAll = tt => { ['led.pwr','led.sdi','led.aes1','led.aes2','led.err','led.cas'].forEach(k=>rec(k,tt,0)); rec('led.g',tt,-1); rec('phase',tt,'off'); rec('out',tt,'—'); };

  function boot(tt){
    const jram = cfg.ram;
    v = { jumper0: jram, output_led: 0x8F, porte0: 0, lock_8420:0, temp0:0, SRC:0, pf:0, rem0:0, rem1:225, rem4:235, rem5:225,
          a20: fw.std===625?0x85:0x81, a21:0x1F, a22: fw.addr22===null? RAM22 : fw.addr22, a23:0xEF, a24:0x8F, a26:0x01,
          aes:[0,0], ec:[8,8], l75:[0,0], bc1:[2,2], bc:[9,9], audio_lock:0, out:220, out1:8, flag:0,
          file:[0,1].map(()=>({1:0x08, 2:fw.reg2, 3:0x81, 4:0x41, 5:0x00, 6:0x82, 9:0x00, 17:0x10})) };
    chip = [0,1].map(()=>({sel:'bnc', since:null, selT:tt + C.PWRT, hw:{1:0x08, 2:fw.reg2, 3:0x81, 4:0x41, 5:0, 6:0x82, 9:0, 17:0x10}}));
    const tb = tt + C.PWRT + 1024/FOSC;
    note(tt, `Power on: VAF1005 → +5 V, LM1117-3.3 → 3V. PIC16F874 reset, then PWRT 72 ms ${inf} + 1024-cycle OST on the 4.9152 MHz crystal`, 'boot');
    rec('phase', tt, 'boot'); rec('led.pwr', tt, 1);
    const tInit = tb + C.BOOT_TCY*TCY;
    let eeok = ee[20]===0xAA;
    if (eeok){ v.jumper0 = ee[0]; if (v.jumper0&0x40) v.porte0 = 1; v.output_led = (v.output_led&0x0F) | (0x80>>(v.jumper0&3)); }
    note(tb, `INIT: ports, TRIS, ADCON1 digital; addr20 = ${hex2(v.a20)} (${fw.std}), addr21 = 1F, addr22 = ${fw.addr22===null? 'never written (RAM '+hex2(RAM22)+' '+inf+')' : hex2(fw.addr22)}, addr23 = EF, addr24 = 8F; cs8420reg… defaults; RC1 = 1 (8420 reset released); output_led = 8F (lamp test, never shifted out); audio_source1/2 → both inputs on BNC; eeread: ${eeok? 'EEPROM[20] = AA → jumper0 = EEPROM[0] = '+hex2(v.jumper0)+' (group '+((v.jumper0&3)+1)+', cascade '+(v.jumper0&0x40?'on':'off')+')' : 'EEPROM[20] ≠ AA (blank) → nomatch: jumper0 keeps its power-up RAM value '+hex2(jram)+' — group '+((jram&3)+1)+', cascade '+(jram&0x40?'ON':'off')+' — while the group LEDs say GR1'}`, 'boot');
    rec('jumper0', tInit, v.jumper0);
    return tInit;
  }

  const TO = k => { let s=0; for (const x of SEG){ if (x[0]===k) return s; s+=x[1]; } return s; };
  function refresh8420(i, tt, why){ chip[i].hw = Object.assign({}, v.file[i]); const bytes=[0x20,0x81,v.file[i][1],v.file[i][2],v.file[i][3],v.file[i][4],v.file[i][5],v.file[i][6],0,0,v.file[i][9],v.file[i][9],v.file[i][9],v.file[i][9],v.file[i][9],v.file[i][9],v.file[i][9],v.file[i][9],v.file[i][17]];
    if (why) spi.push({t:tt, chip:i, bytes:bytes.slice(0,19), why}); }
  function refreshGS(tt){ rec('gs.a21', tt, v.a21); }

  function pass(t0){
    const P = {t:t0, extra:0, ee:false, chk:[0,0], gsx:0};
    const tr = (txt,cls)=>note(t0, txt, cls);
    /* ---- switch_press1/2, switch_debounce1/2 (pclath 5) ---- */
    const dSel = down('sel',t0), dCas = down('cas',t0);
    rec('btn.sel', t0, dSel?1:0); rec('btn.cas', t0, dCas?1:0);
    if (fw.sw1){
      if (!(v.pf&2)){
        if (!dSel) v.rem0 = 235;
        else if (++v.rem0 >= 256){ v.rem0 = 235; v.pf |= 1; v.pf &= ~2; v.pf &= ~4;
          let g = v.jumper0&3; g = g===3 ? 0 : g+1; v.jumper0 = (v.jumper0&~3)|g; v.output_led = (v.output_led&0x0F)|(0x80>>g);
          tr(`switch_press1: RE1 high for 21 passes (rem0 235 → 0) → acknowledged: jumper0 bits 1:0 = ${g} → group ${g+1}; output_led bit ${7-g} (GR${g+1}); press_flag,0 = 1`, 'btn'); }
      }
      if (v.pf&1){ v.pf |= 2; if (!dSel){ if (++v.rem1 >= 256){ v.rem1=225; v.pf |= 4; v.pf &= ~3; tr('switch_debounce1: SELECT released for 31 passes → press_flag,2 = 1 (save to EEPROM)', 'btn'); } } }
    }
    if (fw.sw2){
      if (!(v.pf&32)){
        if (!dCas) v.rem4 = 235;
        else if (++v.rem4 >= 256){ v.rem4 = 235; v.pf |= 16; v.pf &= ~32; v.pf &= ~4; v.jumper0 ^= 0x40; v.porte0 ^= 1;
          tr(`switch_press2: CASCADE acknowledged → jumper0 ^= 40h (cascade ${v.jumper0&0x40?'ON':'off'}), PORTE ^= 01h (RE0 cascade LED ${v.porte0?'on':'off'})`, 'btn'); }
      }
      if (v.pf&16){ v.pf |= 32; if (!dCas){ if (++v.rem5 >= 256){ v.rem5=225; v.pf |= 4; v.pf &= ~48; tr('switch_debounce2: CASCADE released for 31 passes → press_flag,2 = 1', 'btn'); } } }
    }
    rec('jumper0', t0, v.jumper0); rec('pf', t0, v.pf);
    /* ---- refreshgs9023_2: write addr20,21,22,23,24,26 then E = 00, F = A0, F = 20 ---- */
    const sdiOn = sdiAt(t0), cd = sdiOn && cfg.sdi.len <= C.EQ_MAX;
    refreshGS(t0);
    /* ---- readgs9023s ---- */
    const stdLock = cd && (v.a20===STD[cfg.sdi.std].word);
    const gsA = [0,1].map(i=> !(chip[i].hw[3]&0x40) && !!(chip[i].hw[4]&0x40) );
    v.temp0 = (gsA[0]?8:0)|(gsA[1]?4:0);
    rec('gs', t0, v.temp0); rec('cd', t0, cd?1:0); rec('std', t0, stdLock?1:0);
    /* ---- refresh8420_1 / refresh8420_2 ---- */
    refresh8420(0, t0+TO('spi1')*TCY, null); refresh8420(1, t0+TO('spi2')*TCY, null);
    /* ---- read8420s16 ×2: lock from reg 16 bit 4 (UNLOCK) ---- */
    const tl = t0 + TO('r16')*TCY;
    for (let i=0;i<2;i++){ const c=chip[i]; if (valid(i,c.sel,tl)){ if (c.since===null) c.since = Math.max(connSince(i,tl), c.selT); } else c.since=null; }
    const lk = i => chip[i].since!==null && tl-chip[i].since >= C.LOCK_T && !!(chip[i].hw[4]&0x40);
    const prevL = v.lock_8420;
    v.lock_8420 = (lk(0)?8:0)|(lk(1)?4:0);
    if (prevL!==v.lock_8420) tr(`read8420s16: reg 16 UNLOCK bit → lock_8420 = ${bin8(v.lock_8420).slice(4)}b (bit3 = U14/AES1 ${v.lock_8420&8?'locked':'unlocked'}, bit2 = U10/AES2 ${v.lock_8420&4?'locked':'unlocked'})`, 'lock');
    rec('lk', t0, v.lock_8420);
    /* ---- read8420s15: channel-status AUDIO bit → SRC ---- */
    const nonaud = i => (v.lock_8420 & (i?4:8)) && cfg.aes[i].data;
    const pS = v.SRC; v.SRC = (nonaud(0)?0:1) | (nonaud(1)?0:2);
    if (pS!==v.SRC) tr(`read8420s15: reg 15 bit 2 (non-audio) → SRC = ${bin8(v.SRC).slice(6)}b: AES1 ${v.SRC&1?'sample-rate converted':'NOT converted (data)'}, AES2 ${v.SRC&2?'sample-rate converted':'NOT converted (data)'}`, 'src');
    rec('src', t0, v.SRC);
    /* ---- process (org 0x200) ---- */
    const g = v.jumper0&3; v.a23 = GRP[g].a23; v.a24 = GRP[g].a24;
    v.a21 &= 0xF0;
    const L2 = !!(v.lock_8420&4), L3 = !!(v.lock_8420&8), cas = !!(v.jumper0&0x40);
    const gsCall = why => { P.gsx++; tr(`v1.01 ${why}: addr21 low nibble cleared and refreshgs9023_2 called (an extra CHACT write, ${86} Tcy)`, 'gs'); };
    if (!fw.unlock){
      if (L2) v.a21 |= 0x0C;
      if (L3) v.a21 |= 0x03;
      if (!L2 && !L3 && !cas) v.a21 |= 0x01;
    } else {
      const al = ()=>v.audio_lock;
      const un_lock1 = ()=>{ if (al()&16) return; gsCall('un_lock1'); v.audio_lock |= 16; };
      const un_lock2 = ()=>{ if (al()&8) return; gsCall('un_lock2'); v.audio_lock |= 8; };
      const un_mute1 = ()=>{ if (!(al()&4) && (al()&1)){ gsCall('un_mute1 (CHACT reset after AES1 lock)'); v.audio_lock &= ~17; } v.audio_lock &= ~4; v.a21 |= 3; };
      if (L2){ if (al()&2){ gsCall('un_mute2 (CHACT reset after AES2 lock)'); v.audio_lock &= ~2; v.audio_lock |= 4; v.audio_lock &= ~8; } v.a21 |= 0x0C;
        if (L3) un_mute1(); else { un_lock1(); v.audio_lock |= 1; } }
      else { un_lock2(); v.audio_lock |= 2; if (L3) un_mute1(); else { un_lock1(); v.audio_lock |= 1; if (!cas) v.a21 |= 1; } }
    }
    for (let i=0;i<2;i++){ const s = v.SRC&(1<<i); v.file[i][3] = s? 0x81 : 0x95; v.file[i][6] = s? 0x82 : 0xB2; }
    if (!L3) v.file[0][3] |= 0x40;
    if (!L2) v.file[1][3] |= 0x40;
    v.a24 = cas ? (v.a24|0x80) : (v.a24&0x7F);
    v.a20 = fw.std===625 ? 0x85 : 0x81;
    rec('chact', t0, v.a21); rec('a24', t0, v.a24); rec('a23', t0, v.a23);
    /* ---- refresh_status + refresh_leds ---- */
    const vid = cd && stdLock;
    const err = !vid || ((v.lock_8420&0x0C) !== v.temp0);
    const tLed = t0 + (TO('led')+SEG[8][1])*TCY;
    v.porte0 = cas?1:0;
    rec('led.sdi', tLed, vid?1:0); rec('led.err', tLed, err?1:0); rec('led.aes1', tLed, L3?1:0); rec('led.aes2', tLed, L2?1:0);
    rec('led.g', tLed, [7,6,5,4].findIndex(b=>v.output_led&(1<<b))); rec('led.cas', tLed, v.porte0); rec('led.pwr', tLed, 1);
    rec('err.mm', tLed, (vid && err)?1:0);
    /* ---- check_aes3 / check_aes4 ---- */
    const tc = t0 + TO('chk')*TCY;
    for (let i=0;i<2;i++){ const lockd = !!(v.lock_8420 & (i?4:8));
      if (lockd){ if (!v.aes[i]){ v.aes[i]=1; v.file[i][1]=0x08; v.file[i][3] = (v.SRC&(1<<i))?0x81:0x95; v.file[i][4]=0x41; refresh8420(i, tc, 'check_aes'+(3+i)+': first pass locked → reg1/3/4 defaults'); P.chk[i]=1; v.ec[i]=8;
          tr(`check_aes${3+i}: AES${i+1} locked → aes${3+i},0 = 1, reg1 = 08, reg3 = ${hex2(v.file[i][3])}, reg4 = 41, refresh8420_${i+1} (an extra 863 Tcy)`, 'lock'); } }
      else if (--v.ec[i]===0){ v.ec[i]=8; const was=v.aes[i]; v.aes[i]=0; v.file[i][3] |= 0x40; refresh8420(i, tc, 'check_aes'+(3+i)+': 8th unlocked pass → reg3 bit 6'); P.chk[i]=1;
          if (was) tr(`check_aes${3+i}: 8 unlocked passes → aes${3+i},0 = 0, reg3 |= 40h (AESBP ${inf}), refresh8420_${i+1}`, 'lock'); }
    }
    /* ---- autodetect1/2 + audio_source_type1/2 ---- */
    for (let i=0;i<2;i++){ const lockd = !!(v.lock_8420 & (i?4:8));
      if (lockd){ if (!(v.l75[i]&2)){ if (--v.bc1[i]===0){ v.bc1[i]=2; v.bc[i]=9; v.l75[i] |= 2; tr(`autodetect${i+1}: locked for 2 passes → lock75_110_${i+1},1 = 1 (stay on ${chip[i].sel==='tb'?'Phoenix':'BNC'})`, 'ad'); } } else { v.bc1[i]=2; v.bc[i]=9; } }
      else if (--v.bc[i]===0){ v.bc1[i]=2; v.bc[i]=9; v.l75[i] ^= 1; v.l75[i] &= ~2; }
      const sel = (v.l75[i]&1) ? 'tb' : 'bnc';
      if (sel!==chip[i].sel){ chip[i].sel=sel; chip[i].since=null; chip[i].selT=t0; if (t0>-0.05) tr(`autodetect${i+1}: 9 passes without lock → lock75_110_${i+1} ^= 1 → audio_source_type${i+1}: ${sel==='tb'?(i?'RC6 = 1 (BNC U21 off), RC0 = 0 (Phoenix U19 on)':'RB4 = 1 (BNC U22 off), RC7 = 0 (Phoenix U18 on)'):(i?'RC6 = 0 (BNC U21 on), RC0 = 1':'RB4 = 0 (BNC U22 on), RC7 = 1')}`, 'ad'); }
      rec('sel'+i, t0, sel);
    }
    /* ---- delay_2 (its only user, run_stop, is commented out) ---- */
    if (!(v.flag&1)){ if (--v.out<=0){ v.out=256; if (--v.out1<=0){ v.out1=8; v.flag|=1; } } }
    /* ---- eewrite ---- */
    if (v.pf&4){ v.pf &= ~4; ee[0]=v.jumper0; ee[20]=0xAA; P.ee=true; P.extra += C.EE_T + 24*TCY;
      tr(`eewrite: press_flag,2 → EEPROM[0] = jumper0 = ${hex2(v.jumper0)}, EEPROM[20] = AA; the second eew waits for the first write (≈4 ms ${inf}): this pass is ${SIM.fmtDur(PASS+C.EE_T)}`, 'ee'); }
    /* ---- outputs (GS9023 behaviour per register, INFERRED where marked) ---- */
    const E = cfg.sdi.emb||[];
    let out;
    if (!sdiOn) out = 'no SDI input';
    else if (!cd) out = 'cable too long: no carrier';
    else { const ours = v.a21&0x0F ? g+1 : 0; const kept = cas ? E : (ours ? [] : E);
      const grs = Array.from(new Set(kept.concat(ours?[ours]:[]))).sort();
      const chs = (v.a21&15)===1 ? ['ch1 forced (silent)'] : [(v.a21&3)===3?'ch1/2':'', v.a21&12?'ch3/4':''].filter(Boolean);
      out = (grs.length? 'groups '+grs.join('+') : 'no audio') + (ours? ` · ours G${ours} ${chs.join('+')}` : '') + (!cas && E.length && ours? ' · input audio stripped' : '') + (cas && ours && E.includes(ours)? ' · CLASH with input G'+ours : '') + (!stdLock? ' · wrong standard' : ''); }
    rec('out', t0, out);
    rec('reg3_0', t0, chip[0].hw[3]); rec('reg3_1', t0, chip[1].hw[3]);
    P.dur = PASS + P.extra + (P.chk[0]+P.chk[1])*863*TCY + P.gsx*86*TCY;
    if (t0 > -0.02) passes.push(P);
    return P.dur;
  }

  /* run */
  if (!cfg.on){ offAll(t); }
  while (t < H){
    if (!on){ const tp = cfg.on && t<=-C.WARM+1e-9 ? t : nextPower(t-1e-9); if (tp===Infinity || tp>=H) break; on=true; t = boot(tp); rec('phase', t, 'loop'); continue; }
    const tOff = nextPower(t);
    const d = pass(t); t += d;
    if (tOff <= t){ on=false; offAll(tOff); note(tOff,'Power off.','boot'); t = tOff; }
  }
  EMU = {sig, notes, passes, spi, ee};
  return EMU;
}

/* ---------------- signal access ---------------- */
function idxAt(a, t){ let lo=0, hi=a.length-1; if (!a.length || a[0][0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a = emulate().sig[name]; if (!a) return def; const i = idxAt(a,t); return i<0 ? def : a[i][1]; }
const fin = (name, def)=> sv(name, C.HORIZON, def);
function passAt(t){ const P = emulate().passes; let lo=0, hi=P.length-1; if (!P.length || P[0].t>t) return null; while (lo<hi){ const m=(lo+hi+1)>>1; if (P[m].t<=t) lo=m; else hi=m-1; } const p=P[lo]; return t < p.t+p.dur ? p : null; }
function segAt(t){ const p = passAt(t); if (!p) return null; let off=(t-p.t)/TCY, s=0; for (const x of SEG){ if (off < s+x[1]) return {p, seg:x, off:off-s}; s+=x[1]; } return {p, seg:['ext',0,p.ee?'eewrite: waiting for the EEPROM write':'check_aes: extra refresh8420','--bad'], off:0}; }
const curFw = ()=> FW[D.cfg.fw];
const connNow = (i,t)=>{ let c=D.cfg.aes[i].conn; for (const e of D.events) if (e.type==='aes' && e.i===i && e.t<=t) c=e.conn; return c; };
const sdiNow = t=>{ let c=D.cfg.sdi.on; for (const e of D.events) if (e.type==='sdi' && e.t<=t) c=e.on; return c; };
const powerNow = t=> !!sv('led.pwr', t, 0);
const STDW = ()=> STD[D.cfg.sdi.std];

/* ---------------- actions ---------------- */
function act(name, fn){
  const tr = []; const t = SIM.t;
  fn(s=>tr.push(s));
  EMU_KEY = ''; const E = emulate();
  E.notes.filter(n=> n.t >= t - 1e-9 && n.t <= t + 1.2).slice(0, 16).forEach(n=> tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))}</span> ${n.txt}`));
  D.log.unshift({t, name, trace:tr}); if (D.log.length>50) D.log.length=50;
  SIM.refresh();
}
const A = {
  btn(b){ const t=SIM.t; act(`Press ${b==='sel'?'SELECT (group)':'CASCADE'} for ${Math.round(D.press*1000)} ms`, tr=>{
      if (!powerNow(t)) tr('The unit is off.');
      tr(`${b==='sel'?'SW2 → R43 1 kΩ → RE1 (U12 pin 26)':'SW1 → R44 1 kΩ → RE2 (U12 pin 27)'}, pulled up by ${b==='sel'?'R46':'R45'} 1 kΩ. The firmware treats the pin <b>high</b> as pressed and needs it for 21 consecutive passes (≈51 ms).`);
      if ((b==='sel' && !curFw().sw1) || (b==='cas' && !curFw().sw2)) tr(`This build (${curFw().name}) has <span class="mono">call switch_press${b==='sel'?1:2}</span> commented out: the press is ignored.`);
      D.events.push({t, type:'btn', b, dur:D.press, user:true}); }); },
  power(){ const t=SIM.t, on=powerNow(t); act(`Power ${on?'off':'on'}`, tr=>{ tr(on?'PWRSW off: the VAF1005 supply drops.':'PWRSW on: ACIN → VAF1005 → +5 V.'); D.events.push({t, type:'power', on:!on, user:true}); }); },
  plug(i, which){ const t=SIM.t, c=connNow(i,t); const has = x=> c==='both' || c===x; const nb = which==='bnc' ? !has('bnc') : has('bnc'), nt = which==='tb' ? !has('tb') : has('tb');
    const nc = nb&&nt ? 'both' : nb ? 'bnc' : nt ? 'tb' : 'none';
    act(`AES${i+1} ${which==='bnc'?'BNC':'Phoenix'}: ${(which==='bnc'?nb:nt)?'plugged in':'unplugged'}`, tr=>{ tr(`${which==='bnc'?(i?'BNC5 → T2 → U21 75176 (AES_SEL3, RC6)':'BNC4 → T4 → U22 75176 (AES_SEL1, RB4)'):(i?'TB2 → T3 → U19 75176 (AES_SEL4, RC0)':'TB1 → T5 → U18 75176 (AES_SEL2, RC7)')} → ${i?'U10':'U14'} CS8420 RXP. Only the receiver selected by autodetect${i+1} drives the CS8420.`); D.events.push({t, type:'aes', i, conn:nc, user:true}); }); },
  sdi(){ const t=SIM.t, s=sdiNow(t); act(`SDI input ${s?'unplugged':'connected'}`, tr=>{ tr('BNC3 → L7 → U1 CLC014 adaptive EQ → U2 CLC016 reclocker (CD → RC2) → U5 CLC011 decoder → U9 GS9023.'); D.events.push({t, type:'sdi', on:!s, user:true}); }); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:[`Firmware ${curFw().name}. The emulator re-ran the PIC from ${D.cfg.on?'−'+C.WARM+' s (already running)':'power-off'} to 1 s.`]}); SIM.seek(0); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events.']}); SIM.refresh(); },
  set(path, val){ const p=path.split('.'); let o=D.cfg; for (let k=0;k<p.length-1;k++) o=o[p[k]]; o[p[p.length-1]]=val; EMU_KEY=''; D.log.unshift({t:SIM.t, name:`${path} → ${val}`, trace:['Setting changed for the whole second; the emulator re-ran from the start.']}); SIM.refresh(); },
};

/* ================================================================
   DRAWING: front and rear panels on the real silkscreen
   Artwork 2026|59: assets/pod27-front.svg and pod27-rear.svg, vector conversions of POD27-FRONT&REAR(FINAL CURVE).cdr
   (Inkscape → plain SVG; GREEN + WHITE plates registered on one panel; crop marks, plate captions and date dropped;
   200 dpi px from the panel corner, the same frame as the old PNG silks, so every control below kept its place).
   Built on POD27-FRONT&REAR(FINAL CURVE).cdr (Jul.02/14). Guide-layer positions (pt from the panel corner ×200/72):
   front: screws (51,161) (1665,161); rocker cut-out 130–230 × 53–209; power LED (299,218); CASCADE button (572,218),
   its LED (670,218); SELECT button (811,218); GR1–4 LEDs (913/981/1051/1121, 218); SDI (1262), AES1 (1331), AES2 (1420), ERROR (1491).
   rear: BNC (260/410/560/710/860, 198) Ø 89; Phoenix cut-outs 977–1083 and 1127–1233 × 197–263; IEC 1358–1608 × 33–250.
   ================================================================ */
const ASSET = 'siumulation-plugins/assets/';
const ART_PATH = '#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR(FINAL CURVE).cdr';
const artSrc = ()=> `<p class="small muted" style="margin:6px 0 0">Panel artwork: ${SIM.src(ART_PATH, 'POD27-FRONT&REAR(FINAL CURVE).cdr')} (CorelDRAW, Jul.02/14), converted to vector: green and white ink plates registered on one panel, holes and cut-outs from the same drawing.</p>`;
const FX = {pwr:299, cas:572, casLed:670, sel:811, g:[913,981,1051,1121], sdi:1262, aes1:1331, aes2:1420, err:1491, y:218};
function led(x, y, lit, col, tip){ const c = {g:['#7dff6a','#26361f'], y:['#ffe24a','#3b3517'], r:['#ff3a3a','#3d1616']}[col];
  return `<g><title>${tip}</title><circle cx="${x}" cy="${y}" r="16" fill="#090808"/><circle cx="${x}" cy="${y}" r="12" fill="${lit?c[0]:c[1]}" ${lit?'filter="url(#p27glow)"':''}/>${lit?`<circle cx="${x-3}" cy="${y-4}" r="4" fill="#fff" opacity=".7"/>`:''}</g>`; }
function frontSVG(t, opts){
  opts = opts||{};
  const on = powerNow(t), L = k => on && sv('led.'+k, t, 0)===1, gl = on ? sv('led.g', t, -1) : -1;
  const dn = b => D.events.some(e=>e.type==='btn' && e.b===b && t>=e.t && t<e.t+(e.dur||C.PRESS));
  const btn = (x,b,tip)=>`<g class="p27f" data-a="${b}" style="cursor:pointer"><title>${tip}</title><circle cx="${x}" cy="${FX.y}" r="40" fill="transparent"/><circle cx="${x}" cy="${FX.y}" r="30" fill="#050505" stroke="#2c2a2a" stroke-width="3"/><circle cx="${x}" cy="${FX.y+(dn(b)?2:0)}" r="${dn(b)?22:24}" fill="#151414" stroke="#3a3737" stroke-width="2"/><ellipse cx="${x-6}" cy="${FX.y-8}" rx="9" ry="5" fill="#ffffff" opacity=".08"/></g>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD27 front panel (real silkscreen)" style="width:100%;max-width:${opts.max||980}px;border-radius:8px;display:block">
    <defs><filter id="p27glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#1d1b1c"/>
    <image href="${ASSET}pod27-front.svg" width="1714" height="321"/>
    <g class="p27f" data-a="power" style="cursor:pointer"><title>PWRSW (PAN256) rocker — click to switch the unit ${on?'off':'on'}</title><rect x="130" y="53" width="100" height="156" rx="6" fill="#0b0b0c" stroke="#333" stroke-width="2"/>
      <rect x="146" y="${on?66:110}" width="68" height="86" rx="8" fill="#1b1a1b" stroke="#3d3a3b"/><rect x="152" y="${on?72:188}" width="56" height="8" rx="3" fill="#2a2829"/></g>
    ${led(FX.pwr, FX.y, on, 'g', 'PWR green LED (R21 from +5 V)')}
    ${btn(FX.cas,'cas','CASCADE pushbutton SW1 → RE2 (switch_press2 toggles jumper0 bit 6)')}
    ${led(FX.casLed, FX.y, L('cas'), 'y', 'LED9 yellow CASCADE — RE0 through R38 330 Ω (PORTE bit 0)')}
    ${btn(FX.sel,'sel','SELECT pushbutton SW2 → RE1 (switch_press1 steps the group 1→2→3→4→1)')}
    ${FX.g.map((x,i)=>led(x, FX.y, on && gl===i, 'r', `LED${i+1} red GR${i+1} — 74HC4094 Q${i+1} (output_led bit ${7-i})`)).join('')}
    ${led(FX.sdi, FX.y, L('sdi'), 'g', 'LED5 green SDI — 4094 Q5 (output_led,1: carrier detect AND standard lock)')}
    ${led(FX.aes1, FX.y, L('aes1'), 'y', 'LED6 yellow AES1 — 4094 Q6 (lock_8420,3: U14 locked)')}
    ${led(FX.aes2, FX.y, L('aes2'), 'y', 'LED7 yellow AES2 — 4094 Q7 (lock_8420,2: U10 locked)')}
    ${led(FX.err, FX.y, L('err'), 'r', 'LED8 red ERROR — 4094 Q8 (no video, wrong standard, or CS8420/GS9023 lock mismatch)')}
    ${[51,1665].map(x=>`<circle cx="${x}" cy="161" r="12" fill="#8f8d8b" stroke="#444" stroke-width="2"/><path d="M${x-7} 161 h14 M${x} 154 v14" stroke="#444" stroke-width="2.5"/>`).join('')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const on = powerNow(t), c0 = connNow(0,t), c1 = connNow(1,t), sdi = sdiNow(t), out = on ? sv('out', t, '—') : 'off';
  const has = (c,x)=> c==='both' || c===x;
  const bnc = (x, id, tip, plug, col)=>`<g ${id?`class="p27r" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title><circle cx="${x}" cy="198" r="50" fill="#d8d6d2" stroke="#8d8b88" stroke-width="3"/><circle cx="${x}" cy="198" r="38" fill="#b9b2a0" stroke="#7a756c" stroke-width="2"/><circle cx="${x}" cy="198" r="22" fill="#cfc4a5"/><circle cx="${x}" cy="198" r="6" fill="#4a3c20"/>
      ${plug?`<rect x="${x-26}" y="${172}" width="52" height="52" rx="8" fill="${col}" opacity=".93"/><rect x="${x-14}" y="${226}" width="28" height="95" fill="${col}" opacity=".93"/>`:''}</g>`;
  const tb = (x0, id, tip, plug)=>`<g class="p27r" data-j="${id}" style="cursor:pointer"><title>${tip}</title><rect x="${x0}" y="190" width="106" height="78" rx="4" fill="#3fbf6a" stroke="#1f7a3f" stroke-width="2"/>${[18,53,88].map(d=>`<rect x="${x0+d-12}" y="${214}" width="24" height="30" rx="3" fill="#176b33"/><circle cx="${x0+d}" cy="${203}" r="6" fill="#c9cfcb"/>`).join('')}
      ${plug?`<rect x="${x0+4}" y="194" width="98" height="70" rx="4" fill="#33a85b" stroke="#106030" stroke-width="2" opacity=".96"/>${[18,53,88].map((d,k)=>`<path d="M${x0+d} 264 q 0 30 ${6-k*6} 57" stroke="${['#c33','#eee','#777'][k]}" stroke-width="7" fill="none"/>`).join('')}`:''}</g>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD27 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#1b1a1a"/>
    <image href="${ASSET}pod27-rear.svg" width="1714" height="321"/>
    ${bnc(260,null,`SDI OUTPUT (BNC1, C58 coupled) from U4 GS9032: ${out}`, true, '#3a74b8')}
    ${bnc(410,null,`SDI OUTPUT (BNC2, C57 coupled) from U4 GS9032: ${out}`, true, '#3a74b8')}
    ${bnc(560,'sdi',`SDI INPUT (BNC3, shell isolated through R1/C19, L7) — ${sdi?'connected: '+D.cfg.sdi.std+'-line, '+D.cfg.sdi.len+' m':'nothing connected'} (click)`, sdi, '#c77d2a')}
    ${bnc(710,'b0',`AES1 75 Ω unbalanced (BNC4 → T4 → U22) — ${has(c0,'bnc')?'connected':'empty'} (click)`, has(c0,'bnc'), '#7a3fb8')}
    ${bnc(860,'b1',`AES2 75 Ω unbalanced (BNC5 → T2 → U21) — ${has(c1,'bnc')?'connected':'empty'} (click)`, has(c1,'bnc'), '#7a3fb8')}
    ${tb(977,'t0',`AES1 110 Ω balanced Phoenix TB1 (+ − G) → T5 → U18 — ${has(c0,'tb')?'plugged':'empty'} (click)`, has(c0,'tb'))}
    ${tb(1127,'t1',`AES2 110 Ω balanced Phoenix TB2 (+ − G) → T3 → U19 — ${has(c1,'tb')?'plugged':'empty'} (click)`, has(c1,'tb'))}
    <g class="p27r" data-j="mains" style="cursor:pointer"><title>ACIN IEC inlet (PAN356) with fuse drawer → VAF1005 (click: power)</title><rect x="1358" y="33" width="250" height="217" rx="12" fill="#0b0b0c" stroke="#333" stroke-width="2"/><rect x="1374" y="52" width="66" height="180" rx="5" fill="#161516"/><rect x="1452" y="60" width="138" height="164" rx="12" fill="#050505"/>
      ${[[1488,92],[1556,92],[1522,182]].map(([x,y])=>`<rect x="${x-10}" y="${y-14}" width="20" height="28" fill="#c9cdd2"/>`).join('')}</g>
    ${[[51,160],[1664,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} ${y} h12 M${x} ${y-6} v12" stroke="#47494c" stroke-width="2"/>`).join('')}
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p27f').forEach(g=> g.addEventListener('click', ()=>{ const a=g.dataset.a; if (a==='power') A.power(); else A.btn(a); }));
  root.querySelectorAll('.p27r').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='mains') A.power(); else if (j==='sdi') A.sdi(); else A.plug(+j[1], j[0]==='b'?'bnc':'tb'); }));
}
function controlsHTML(){
  const c = D.cfg, sel = (path, opts, cur)=>`<select data-set="${path}">${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <button data-k="sel" title="G">SELECT</button><button data-k="cas" title="C">CASCADE</button><button data-k="power" title="P">Power</button>
    <label class="small">Hold ${sel('press', [[0.03,'30 ms'],[0.08,'80 ms'],[0.15,'150 ms'],[0.4,'400 ms']], D.press)}</label>
    <span class="small muted">Keys: G select · C cascade · P power</span></div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px" class="small">
    <label>Firmware ${sel('fw', Object.keys(FW).map(k=>[k,FW[k].name]), c.fw)}</label>
    <label>SDI in ${sel('sdi.std', [[525,'525/59.94'],[625,'625/50']], c.sdi.std)}</label>
    <label>cable ${sel('sdi.len', [[2,'2 m'],[50,'50 m'],[200,'200 m'],[250,'250 m'],[300,'300 m']], c.sdi.len)}</label>
    <label>audio already in the SDI ${sel('sdi.emb', [['','none'],['1','group 1'],['2','group 2'],['1,3','groups 1+3'],['1,2,3,4','all four']], (c.sdi.emb||[]).join(','))}</label></div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px" class="small">
    ${[0,1].map(i=>`<span><b>AES${i+1}</b> ${sel('aes.'+i+'.fs', [[32000,'32 k'],[44100,'44.1 k'],[48000,'48 k'],[96000,'96 k'],[192000,'192 k']], c.aes[i].fs)}
      ${sel('aes.'+i+'.data', [['false','PCM audio'],['true','non-audio (Dolby E/AC-3)']], c.aes[i].data)} ${sel('aes.'+i+'.vpp', [[0.1,'0.1 Vpp'],[0.5,'0.5 Vpp'],[2,'2 Vpp'],[5,'5 Vpp']], c.aes[i].vpp)}</span>`).join('')}
  </div>
  <div class="small muted" style="margin-top:4px">Clicks are inserted at the playhead and the PIC is re-run. Plug and unplug on the rear panel. Settings in the selects apply to the whole second.</div>`;
}
function bindControls(root){
  root.querySelectorAll('button[data-k]').forEach(b=> b.onclick = ()=> b.dataset.k==='power' ? A.power() : A.btn(b.dataset.k));
  root.querySelectorAll('select[data-set]').forEach(s=> s.onchange = e=>{ const p=s.dataset.set, x=e.target.value;
    if (p==='press'){ D.press=+x; return; }
    if (p==='fw') return A.set('fw', x);
    if (p==='sdi.emb') return A.set('sdi.emb', x? x.split(',').map(Number) : []);
    if (p.endsWith('.data')) return A.set(p, x==='true');
    A.set(p, isNaN(+x)? x : +x); });
}
window.__pod27Active = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod27Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k==='g'){ A.btn('sel'); e.preventDefault(); } else if (k==='c'){ A.btn('cas'); e.preventDefault(); } else if (k==='p'){ A.power(); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf){
  const a = emulate().sig[name] || []; let i = Math.max(0, idxAt(a, t0));
  c.font = '10.5px '+SIM.css('--sans');
  for (; i < a.length && a[i][0] <= t1; i++){
    const s = Math.max(t0, a[i][0]), e = Math.min(t1, i+1<a.length ? a[i+1][0] : C.HORIZON);
    if (e < t0 || e<=s) continue;
    const col = colOf(a[i][1]); const xa = X(s), xb = X(e);
    if (col){ c.fillStyle = col; c.fillRect(xa, y+3, Math.max(1, xb-xa), h-6); }
    const tx = txtOf && txtOf(a[i][1]);
    if (tx && xb-xa > c.measureText(tx).width+8){ c.fillStyle = col ? '#fff' : SIM.css('--ink2'); c.fillText(tx, xa+4, y+h/2+4); }
  }
}
const segCol = s => s.startsWith('--') ? SIM.css(s) : s;
function drawPasses(c, X, t0, t1, y, h){
  const P = emulate().passes, css=SIM.css; let n=0;
  for (const p of P){ if (p.t+p.dur < t0) continue; if (p.t > t1) break; n++; }
  const pxPass = X(t0+PASS)-X(t0);
  if (pxPass < 3){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(Math.max(t0,P.length?P[0].t:0)), y+5, X(t1)-X(t0), h-10); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${n} passes (≈${SIM.fmtDur(PASS)} each; red = check_aes refresh, purple = EEPROM wait)`, X(t0)+6, y+h/2+4);
    for (const p of P){ if (p.t>t1 || p.t+p.dur<t0) continue; if (p.ee || p.chk[0] || p.chk[1]){ c.fillStyle = p.ee? '#8a5cc7' : css('--bad'); c.fillRect(X(p.t), y+3, Math.max(2, X(p.t+p.dur)-X(p.t)), h-6); } } return; }
  c.font='10px '+css('--sans');
  for (const p of P){ if (p.t+p.dur < t0) continue; if (p.t > t1) break;
    let off=0; for (const s of SEG){ const a=p.t+off*TCY, b=a+s[1]*TCY; off+=s[1]; if (b<t0||a>t1) continue; c.fillStyle=segCol(s[3]); c.globalAlpha=.8; c.fillRect(X(a), y+4, Math.max(1,X(b)-X(a)-1), h-8); c.globalAlpha=1;
      if (X(b)-X(a) > c.measureText(s[2]).width+6){ c.fillStyle='#fff'; c.fillText(s[2], X(a)+3, y+h/2+4); } }
    const a=p.t+PASS_TCY*TCY, b=p.t+p.dur; if (b-a>1e-7){ c.fillStyle=p.ee?'#8a5cc7':css('--bad'); c.globalAlpha=.75; c.fillRect(X(a), y+4, X(b)-X(a), h-8); c.globalAlpha=1; if (X(b)-X(a)>130){ c.fillStyle='#fff'; c.fillText(p.ee?'eewrite: waiting for EEPROM':'check_aes / un_lock extra writes', X(a)+3, y+h/2+4); } }
  }
}
function spiBytesOf(p, k){ const E=emulate(); const i = k==='spi1'?0:1; const r3=sv('reg3_'+i, p.t+PASS, 0x81);
  const f = {1:0x08,2:FW[D.cfg.fw].reg2,3:r3,4:0x41,5:0,6:(r3&0x10)?0xB2:0x82,9:0,17:0x10};
  return [0x20,0x81,f[1],f[2],f[3],f[4],f[5],f[6],0,0,f[9],f[9],f[9],f[9],f[9],f[9],f[9],f[9],f[17]]; }
function drawSPI(c, X, t0, t1, y, h){
  const P = emulate().passes, css=SIM.css; const byteT = 46*TCY;
  if (X(t0+byteT)-X(t0) < 6){ SIM.pulses(c,X,t0,t1,y,h,PASS,P.length?P[0].t:0,(2*863+542+279)*TCY,css('--accent'),'SPI bursts: 2 × 19 writes + 8 reads'); return; }
  c.font='10px '+css('--mono');
  for (const p of P){ if (p.t+p.dur < t0) continue; if (p.t > t1) break;
    for (const k of ['spi1','spi2']){ let off=0; for (const s of SEG){ if (s[0]===k) break; off+=s[1]; }
      spiBytesOf(p,k).forEach((b,j)=>{ const a = p.t+(off+4+j*46)*TCY, e=a+40*TCY; if (e<t0||a>t1) return; const w=X(e)-X(a);
        if (w > 120){ c.strokeStyle=css('--accent'); c.lineWidth=1.4; c.beginPath(); for (let q=0;q<8;q++){ const bit=(b>>(7-q))&1, xa=X(a+q*5*TCY), xb=X(a+(q+1)*5*TCY), yy=bit? y+5 : y+h-6; q?c.lineTo(xa,yy):c.moveTo(xa,yy); c.lineTo(xb,yy); } c.stroke(); c.fillStyle=css('--ink'); c.fillText(`${hx(b)} ${j===0?'chip addr+W':j===1?'MAP 81 (INCR, reg 1)':j<8?'reg '+(j-1):j<10?'reg '+(j-1)+' (RO)':j<18?'reg '+(j-1)+' = reg9 value':'reg 17'}`, X(a)+2, y+10); }
        else { c.fillStyle=css(k==='spi1'?'--accent':'--accent2'); c.globalAlpha=.85; c.fillRect(X(a), y+4, Math.max(1,w), h-8); c.globalAlpha=1; if (w>18){ c.fillStyle='#fff'; c.fillText(hx(b), X(a)+2, y+h/2+4); } } }); }
  }
}
function lanes(){
  const css = SIM.css, ls = [], st = STDW();
  ls.push({label:'Power · firmware state', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'phase', v=> v==='boot'? css('--warn') : v==='off'? null : null, v=> v==='boot'?'PWRT + OST + INIT':v==='off'?'off':'main loop'); }});
  ls.push({label:`PIC16F874 main-loop passes (${SIM.fmtDur(PASS)})`, h:26, draw:drawPasses});
  ls.push({label:'SPI → CS8420s (RB0 SCK, RB1 SDO)', h:26, draw:drawSPI});
  ls.push({label:'SELECT (RE1) · CASCADE (RE2)', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h/2,'btn.sel', v=> v? css('--accent2'):null, v=> v?'SELECT held':''); drawSig(c,X,t0,t1,y+h/2,h/2,'btn.cas', v=> v? css('--warn'):null, v=> v?'CASCADE held':''); }});
  [0,1].forEach(i=> ls.push({label:`AES${i+1}: receiver select · CS8420 lock`, h:24, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'sel'+i, v=> v==='tb'? 'rgba(63,191,106,.35)' : 'rgba(122,63,184,.30)', v=> v==='tb'?'Phoenix (110 Ω)':'BNC (75 Ω)');
    drawSig(c,X,t0,t1,y+h-7,6,'lk', v=> v&(i?4:8)? css('--accent') : null, null); }}));
  [0,1].forEach(i=> ls.push({label:`AES${i+1} input frames`, h:20, draw(c,X,t0,t1,y,h){ const a=D.cfg.aes[i]; const cn = connNow(i,(t0+t1)/2); if (cn==='none'){ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText('nothing connected', X(t0)+6, y+h/2+4); return; } SIM.pulses(c,X,t0,t1,y,h,1/a.fs,0,0.3/a.fs,css('--accent2'),`AES3 frames at ${a.fs/1000} kHz${a.data?' (data)':''}`); }}));
  ls.push({label:'CS8420 TX → GS9023 (after SRC)', h:20, draw(c,X,t0,t1,y,h){ const src = sv('src',(t0+t1)/2,3), lk=sv('lk',(t0+t1)/2,0); if (!lk){ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText('no lock: reg3 bit 6 set, nothing to the embedder', X(t0)+6, y+h/2+4); return; }
    const fs = (src&1 || !(lk&8)) ? 48000 : D.cfg.aes[0].fs; SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.3/fs,css('--accent'),(src===3?'48 kHz frames (OMCK from PLL1700 → 74HC74)':'AES1 data passed at '+fs/1000+' kHz (no SRC)')); }});
  ls.push({label:`SDI fields (${st.fps} Hz) · EDH packet`, h:20, draw(c,X,t0,t1,y,h){ if (!sdiNow((t0+t1)/2)){ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText('no SDI input', X(t0)+6, y+h/2+4); return; } SIM.pulses(c,X,t0,t1,y,h,1/st.fps,0,(st.edh)/st.lps,css('--warn'),'fields (EDH on line '+st.edh+' — RP165 '+'inferred'+')'); }});
  ls.push({label:`SDI lines (${(1e6/st.lps).toFixed(2)} µs) · HANC audio packets`, h:22, draw(c,X,t0,t1,y,h){ if (!sdiNow((t0+t1)/2)){ return; } const Tl=1/st.lps, ch=sv('chact',(t0+t1)/2,0)&15;
    if (X(t0+Tl)-X(t0) < 4){ SIM.pulses(c,X,t0,t1,y,h,Tl,0,Tl*0.08,css('--ink2'),'video lines'); return; }
    SIM.pulses(c,X,t0,t1,y,h,Tl,0,Tl*0.02,css('--ink2'),'EAV'); if (ch) SIM.pulses(c,X,t0,t1,y,h,Tl,Tl*0.025,43/27e6,css('--accent'),'audio data packet'); }});
  ls.push({label:'CHACT (addr21) · group · cascade', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'chact', v=> v&15? css('--accent') : null, v=> `addr21 ${hex2(v)} · ch ${['1','2','3','4'].filter((_,k)=>v&(1<<k)).join(',')||'none'}`); drawSig(c,X,t0,t1,y+h-6,5,'a24', v=> v&0x80? css('--warn') : null, null); }});
  ls.push({label:'SDI OUTPUT contents', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'out', v=> /CLASH|wrong|no SDI|cable/.test(v)? 'rgba(200,40,30,.35)' : 'rgba(60,140,220,.25)', v=> v); }});
  ls.push({label:'Front LEDs (4094 latch, RE0)', h:44, draw(c,X,t0,t1,y,h){ const rows=[['led.sdi','#3c3'],['led.aes1','#db2'],['led.aes2','#db2'],['led.err','#e33'],['led.cas','#db2']];
    rows.forEach(([k,col],j)=> drawSig(c,X,t0,t1,y+j*7,8,k, v=> v? col : null, null)); drawSig(c,X,t0,t1,y+35,9,'led.g', v=> v>=0? '#e33' : null, v=> v>=0? 'GR'+(v+1) : ''); }});
  return ls;
}

/* ---------------- scopes ---------------- */
function aesSub(t, i){
  const a = D.cfg.aes[i], fs = a.fs, n = Math.floor(t*fs), fr = n % 192, f = i? 400 : 1000;
  const out=[]; for (const side of [0,1]){ const v = a.data ? ((n*2+side)*2654435761%65536)/65536-0.5 : 0.5*Math.sin(2*Math.PI*f*(side?1.5:1)*n/fs);
    let s = Math.round(v*8388607); if (s<0) s += 1<<24; const bits = new Array(32).fill(0);
    for (let b=0;b<24;b++) bits[4+b] = (s>>b)&1; bits[30] = (fr===0 || (a.data && fr===1))?1:0; let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, v, raw:s}); }
  return {n, fr, fs, sub:out};
}
function biphase(pre, bits, start){
  const Pp = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv = []; Pp.forEach(b=>lv.push(start? 1-b : b)); let cur = lv[lv.length-1];
  for (let i=4;i<32;i++){ cur = 1-cur; lv.push(cur); if (bits[i]) cur = 1-cur; lv.push(cur); }
  return lv;
}
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 140); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const cn = connNow(0,t);
  if (cn==='none'){ c.fillStyle=ink2; c.font='13px '+SIM.css('--sans'); c.fillText('Nothing is connected to AES1.', 12, 70); el.innerHTML=''; return; }
  const F = aesSub(t, 0), fs=F.fs;
  const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase(F.sub[1].pre, F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB), cw = (w-20)/lv.length;
  const zones = [[0,8,SIM.css('--warn'),'pre'],[8,56,SIM.css('--accent'),'24 bits (LSB first)'],[56,64,SIM.css('--accent2'),'VUCP']];
  [0,64].forEach(off=>zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,64); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px '+SIM.css('--sans'); if ((b-a)*cw>30) c.fillText(lb, 12+(off+a)*cw, 98); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?28:76; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`AES1 at the rear (${cn==='tb'?'TB1':cn==='bnc'?'BNC4':'BNC4 + TB1'}) · subframe A (${F.sub[0].pre})`,12,14); c.fillText('subframe B (Y)',12+64*cw,14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 · cell ${SIM.fmtDur(1/(fs*128))} · frame ${SIM.fmtDur(1/fs)}`, 10, 124);
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} ${s.v.toFixed(4)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')
    + `<br><span class="muted">${D.cfg.aes[0].data? 'Channel-status byte 0 bit 1 = 1 (non-audio): the CS8420 reports it in reg 15 bit 2 and read8420s15 clears SRC,0.' : 'PCM: channel status bit 1 = 0, so SRC stays on and U14 converts to 48 kHz.'} The tone and the data pattern are ${inf}.</span>`;
}
/* SMPTE 272M audio data packet for the line at the playhead */
function ancPacket(t){
  const st = STDW(), Tl = 1/st.lps, line = Math.floor(t/Tl), ch = sv('chact', t, 0), g = sv('a23', t, 0xEF);
  const grp = [0xEF,0xCD,0xAB,0x89].indexOf(g);
  const n = Math.floor((line+1)*48000*Tl) - Math.floor(line*48000*Tl);
  const lk = sv('lk', t, 0);
  const words = [0x000,0x3FF,0x3FF, did10(DID.aud[grp]), did10((line%255)+1), did10(n*12)];
  const rows = [];
  for (let s=0;s<n;s++){ const idx = Math.floor(line*48000*Tl)+s;
    for (let chn=0;chn<4;chn++){
      const active = ch & (1<<chn), src = chn<2 ? 0 : 1, locked = lk & (src?4:8);
      let a = 0; if (active && locked){ const f = src? 400 : 1000; a = Math.round(0.5*Math.sin(2*Math.PI*f*(chn&1?1.5:1)*idx/48000)*524287); if (a<0) a += 1<<20; }
      const z = (idx%192===0 && (chn&1)===0)?1:0;
      const w0 = z | (chn<<1) | ((a&63)<<3), w1 = (a>>6)&511, w2 = ((a>>15)&31) | (0<<5) | (0<<6) | (0<<7);
      let p=0; [w0&511,w1,w2].forEach(x=>{ for (let k=0;k<9;k++) p^=(x>>k)&1; });
      const W = [w0&511, w1&511, (w2&255)|(p<<8)].map(x=> x | (((x>>8)&1)?0:512));
      words.push(...W); rows.push({s, chn, a, W, active, locked});
    } }
  let cs = 0; for (let k=3;k<words.length;k++) cs = (cs + (words[k]&511)) & 511; words.push(cs | (((cs>>8)&1)?0:512));
  return {line, grp, n, words, rows, ch};
}
function ancHTML(t){
  if (!powerNow(t) || !sdiNow(t)) return '<p class="muted">No SDI at the playhead.</p>';
  const P = ancPacket(t);
  if (!(P.ch&15)) return `<p class="small">Line ${P.line % STDW().lines}: CHACT = 0 → the GS9023 embeds no packet for our group (cascade on, no AES locked). Input audio passes untouched.</p>`;
  return `<p class="small">Line ${P.line % STDW().lines} of the ${D.cfg.sdi.std} frame: one audio data packet for <b>group ${P.grp+1}</b> (DID ${h3(did10(DID.aud[P.grp]))}h from addr23 = ${hex2(sv('a23',t,0))}), ${P.n} sample sets × 4 channels × 3 words. Ten-bit words in the HANC after EAV:</p>
    <div class="mono small" style="word-break:break-all;line-height:1.6">${P.words.map((w,k)=>`<span style="${k<3?'color:var(--warn)':k<6?'color:var(--accent2)':k===P.words.length-1?'color:var(--bad)':''}">${h3(w)}</span>`).join(' ')}</div>
    <p class="small muted">ADF 000 3FF 3FF · DID · DBN · DC = ${P.n*12} · UDW (word x: Z, ch, aud 0–5; x+1: aud 6–14; x+2: aud 15–19, V, U, C, P) · checksum. Channels without CHACT or lock carry zero. The sample-to-line distribution and the tones are ${inf}; the word layout is SMPTE 272M.</p>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>` + l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press SELECT or CASCADE, plug something in at the rear, or pick a scenario. The firmware path the emulator took is listed here with time offsets.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p27scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p27clr">Clear my actions</button>`; }
function bindScenario(m){ m.querySelectorAll('.p27scn').forEach(s=>s.onchange=e=>A.scenario(e.target.value)); m.querySelectorAll('.p27clr').forEach(b=>b.onclick=()=>A.clear()); }
function inspectorHTML(t){
  if (!powerNow(t)) return '<p class="muted">The unit is off at the playhead.</p>';
  const j = sv('jumper0', t, 0), lk = sv('lk', t, 0), gs = sv('gs', t, 0), src = sv('src', t, 3), ch = sv('chact', t, 0), a24 = sv('a24', t, 0x8F), sa = segAt(t);
  const last = emulate().notes.filter(n=>n.t<=t).slice(-1)[0];
  return `<table class="kv">
    <tr><th>Firmware</th><td class="mono">${curFw().name}</td></tr>
    <tr><th>Running now</th><td class="mono">${sa? sa.seg[2]+' (Tcy '+Math.floor(sa.off)+')' : 'start-up'}</td></tr>
    <tr><th>jumper0</th><td class="mono">${hex2(j)} = ${bin8(j)}b → group ${(j&3)+1}, cascade ${j&0x40?'ON':'off'}</td></tr>
    <tr><th>lock_8420 · 9023 aud flags</th><td class="mono">${bin8(lk).slice(4)}b · ${bin8(gs).slice(4)}b ${lk!==gs?'<b style="color:var(--bad)">mismatch → ERROR</b>':''}</td></tr>
    <tr><th>SRC</th><td class="mono">${bin8(src).slice(6)}b (AES2, AES1; 1 = convert to 48 kHz)</td></tr>
    <tr><th>addr21 CHACT · addr23 · addr24</th><td class="mono">${hex2(ch)} · ${hex2(sv('a23',t,0xEF))} · ${hex2(a24)} (cascade bit ${a24>>7})</td></tr>
    <tr><th>U14 / U10 reg 3 (hw)</th><td class="mono">${hex2(sv('reg3_0',t,0x81))} / ${hex2(sv('reg3_1',t,0x81))}</td></tr>
    <tr><th>Receivers</th><td class="mono">AES1 ${sv('sel0',t,'bnc')==='tb'?'Phoenix U18':'BNC U22'} · AES2 ${sv('sel1',t,'bnc')==='tb'?'Phoenix U19':'BNC U21'}</td></tr>
    <tr><th>SDI CD · standard lock</th><td class="mono">${sv('cd',t,0)} · ${sv('std',t,0)}</td></tr>
    <tr><th>SDI OUTPUT</th><td class="small">${sv('out',t,'—')}</td></tr>
    <tr><th>Last firmware step</th><td class="small">${last?`<span class="muted">${SIM.fmtT(last.t)}</span> ${last.txt}`:'—'}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__pod27Active = true;
  m._ck = null;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — click SELECT, CASCADE and the rocker', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click SDI INPUT, the AES BNCs or the Phoenix blocks to plug/unplug', `<div id="rp"></div>${artSrc()}`)}
    </div>
    <div>
      ${card('What the firmware did (emulated, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">One pass of <span class="mono">MAIN</span> = ${PASS_TCY} instruction cycles × 813.8 ns = ${SIM.fmtDur(PASS)} (counted from 27v100.asm; most of it is bit-banged SPI). Zoom to 5 ms to see the routines inside a pass, to 200 µs for the SPI bytes, to 50 µs for single SCK bits.</p>`)}
  <div class="grid2">
    ${card('Scope: AES1 input at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('SDI OUTPUT: the HANC audio packet on the current line', `<div id="anc"></div>`)}
  </div>
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const ck = JSON.stringify([D.cfg, D.press]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
    m.querySelector('#anc').innerHTML = ancHTML(t);
  };
  bindScenario(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial (POD27MAN.doc + the firmware) ---------------- */
const LESSONS = [
  { title:'Meet the POD27', body:`<p>The POD27 is an <b>audio muxer</b>. It embeds one group of AES audio (two AES pairs = four channels) into a <b>SMPTE 272M</b> SD-SDI signal (manual). The SDI input has an adaptive cable equaliser, and both rear SDI OUTPUTs carry the result.</p>
     <p>Front: power rocker and LED, <b>CASCADE</b> button and LED, <b>GROUP SELECT</b> button with LEDs 1–4, and the tallies <b>SDI</b>, <b>AES1</b>, <b>AES2</b> and <b>ERROR</b>. Rear: two SDI OUTPUTs, SDI INPUT, AES1/AES2 on 75 Ω BNC <i>and</i> on 110 Ω Phoenix blocks.</p><p class="muted">Hover over anything on the panels to see what it is wired to.</p>`, check:()=>true, auto:true },
  { title:'1 · Power it up', body:`<p>Load the cold start. <button data-scn="cold">Load “Power-up from cold”</button></p><p>After the power-up timer the PIC runs INIT, reads the last group and cascade setting from EEPROM (<span class="mono">eeread</span>), puts both AES inputs on the BNC receivers and starts the main loop. The first pass lights the LEDs.</p><p><b>Goal:</b> put the playhead after start-up with the SDI tally lit.</p>`,
    check:()=> D.scenario==='cold' && SIM.t>0.15 && sv('led.sdi',SIM.t,0)===1, hint:'Load the scenario, then drag the time slider past 0.15 s.' },
  { title:'2 · Feed AES and watch it lock', body:`<p>“AES signals are detected automatically” (manual). Unplug AES1 at the BNC and plug it into the Phoenix block instead (rear panel, AES1 BNC then the left green block).</p><p>The firmware has no idea which connector you used. <span class="mono">autodetect1</span> swaps between the BNC receiver (U22) and the Phoenix receiver (U18) every 9 passes (≈22 ms) until the CS8420 reports lock, then confirms it for 2 passes.</p><p><b>Goal:</b> AES1 locked on the Phoenix block at the end of the second.</p>`,
    check:()=> fin('sel0','bnc')==='tb' && (fin('lk',0)&8)>0, hint:'Put the playhead early (e.g. 0.2 s), click the AES1 BNC (unplug), then click the left Phoenix block.' },
  { title:'3 · Choose the group', body:`<p>“To cycle through the groups, operate the SELECT pushbutton repeatedly.” Each press steps 1 → 2 → 3 → 4 → 1. It needs to be held for 21 passes (≈51 ms): try a 30 ms click first and see it ignored.</p><p><b>Goal:</b> group 3 at the end of the second.</p>`,
    check:()=> fin('led.g',-1)===2, hint:()=>`Now on group ${fin('led.g',-1)+1}. Press SELECT at different times (each click is inserted at the playhead).` },
  { title:'4 · Cascade into a busy SDI', body:`<p>Load the cascade scenario. <button data-scn="cascade">Load “SDI already carries group 1”</button></p><p>Without CASCADE the POD27 strips any audio already in the SDI. With the CASCADE LED lit, existing audio is kept and ours is added (manual). The firmware sets bit 7 of GS9023 register 4 (<span class="mono">addr24</span>) from <span class="mono">jumper0,6</span>.</p><p><b>Goal:</b> both groups 1 and 2 on the SDI OUTPUT.</p>`,
    check:()=> D.scenario==='cascade' && /groups 1\+2/.test(fin('out','')), hint:'Load the scenario; the CASCADE press at 200 ms does it. Look at the output lane.' },
  { title:'5 · Dolby E is not converted', body:`<p>“If the AES signal to be embedded is non-audio data, i.e. Dolby AC3 or E, POD27 will not sample rate convert” (manual). <button data-scn="dolby">Load “non-audio data”</button></p><p><span class="mono">read8420s15</span> reads the received channel status (reg 15 bit 2). For data it clears <span class="mono">SRC,0</span>, and <span class="mono">set_cascade</span> loads <span class="mono">cs8420reg3nosrc</span> = 95h and <span class="mono">reg6_copy</span> = B2h.</p><p><b>Goal:</b> SRC bit 0 cleared at the playhead.</p>`,
    check:()=> D.scenario==='dolby' && !(sv('src',SIM.t,3)&1), hint:'Load the scenario and look at the State table.' },
  { title:'6 · Wrong standard', body:`<p>Every build is fixed to one standard. V200 (Apr 2012|45) writes 625 (<span class="mono">goto pal625 ;Ali-Add</span>); all v1.xx builds write 525. <button data-scn="wrong">Load “V200 fed 525-line SDI”</button></p><p><b>Goal:</b> ERROR lit and SDI dark. Then switch the SDI in select to 625 and see it recover.</p>`,
    check:()=> D.scenario==='wrong' && D.cfg.sdi.std===625 && fin('led.err',1)===0, hint:()=> D.scenario!=='wrong' ? 'Load the scenario first.' : 'Now change “SDI in” to 625/50 under the front panel.' },
  { title:'Done', body:`<p>You have used everything an operator can touch. <b>Software</b> shows the main loop and the registers live, <b>One second</b> goes down to SPI bits and SDI lines, and <b>Findings</b> lists what the firmware does that the manual does not say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod27Active = true;
  m._ck = null;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD27 (from POD27MAN.doc and the firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}
      ${card('Timeline (1 s)', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot = `<rect x="520" y="140" width="200" height="130" fill="transparent"><title>CASCADE: lit = keep the audio already in the SDI</title></rect><rect x="760" y="140" width="400" height="130" fill="transparent"><title>GROUP SELECT: the lit number is the group being embedded</title></rect><rect x="1220" y="140" width="320" height="130" fill="transparent"><title>Status tallies SDI, AES1, AES2, ERROR</title></rect>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t, {hot}); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const ck = JSON.stringify([D.cfg, D.press]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    m.querySelector('#lv').textContent = `SDI OUTPUT: ${powerNow(t)? sv('out',t,'—') : 'off'}`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check(); const hint = typeof L.hint==='function' ? L.hint() : L.hint;
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelectorAll('#lesson [data-scn]').forEach(b=>b.onclick=()=>A.scenario(b.dataset.scn));
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ loadScenario('run'); D.log=[]; lessonIdx=0; SIM.seek(0); };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter(l=>/state|SELECT|receiver|CHACT|OUTPUT|LEDs/.test(l.label)), {labelW:190});
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod27Active = false;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device (PIC16F874 pins at the playhead)', `<div id="dev"></div>`)}
    ${card('As seen by the displays (the front LEDs over the whole second)', `<div id="fp"></div><canvas id="ledstrip"></canvas><p class="small muted">The 74HC4094 latches the eight tallies once per pass on the RB5 strobe; CASCADE is driven straight from RE0.</p>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, st=STDW(), E=emulate();
    const rows = [
      ['Crystal X2', '4 915 200', '203.4 ns', 'HS oscillator on U12 pins 30/31, C39/C44 27 pF'],
      ['Instruction cycles', '1 228 800', '813.8 ns', 'Tcy = 4 / Fosc'],
      ['Main-loop passes', Math.round(1/PASS).toLocaleString(), SIM.fmtDur(PASS), `${PASS_TCY} Tcy counted from 27v100.asm; ${E.passes.filter(p=>p.t>=0&&p.t<1&&(p.chk[0]||p.chk[1])).length} passes this second had an extra check_aes refresh`],
      ['CS8420 register bursts', (2*Math.round(1/PASS)).toLocaleString(), SIM.fmtDur(863*TCY), '19 bytes each (chip addr, MAP 81, regs 1–17), every pass, to both chips'],
      ['SPI bits (SCK on RB0)', (Math.round(1/PASS)*(2*19+12)*8).toLocaleString(), SIM.fmtDur(5*TCY), 'shiftout: 5 Tcy per bit ≈ 246 kHz, MSB first'],
      ['GS9023 register writes', (9*Math.round(1/PASS)).toLocaleString(), '≈ 8 Tcy', 'refreshgs9023_2: regs 0,1,2,3,4,6,E,F,F on the parallel host bus'],
      ['4094 LED latch strobes', Math.round(1/PASS).toLocaleString(), SIM.fmtDur(PASS), 'refresh_leds: 8 bits on the shared SCK/SDO, strobe RB5'],
      ['Button debounce (press)', '—', SIM.fmtDur(21*PASS), 'rem0 235 → 0: 21 passes held'],
      ['Button debounce (release)', '—', SIM.fmtDur(31*PASS), 'rem1 225 → 0: 31 passes released'],
      ['Autodetect dwell per connector', '—', SIM.fmtDur(9*PASS), 'detect_count = 9 unlocked passes, detect_count1 = 2 locked passes'],
      ['AES1 input frames', D.cfg.aes[0].fs.toLocaleString(), SIM.fmtDur(1/D.cfg.aes[0].fs), '192-frame channel-status block = '+SIM.fmtDur(192/D.cfg.aes[0].fs)],
      ['Embedded samples per channel', '48 000', SIM.fmtDur(1/48000), 'after the CS8420 SRC, OMCK from PLL1700E ÷ 74HC74 '+inf],
      ['SDI fields', st.fps.toString(), SIM.fmtDur(1/st.fps), `EDH regenerated each field (RP165), control packet once per field ${inf}`],
      ['SDI lines', Math.round(st.lps).toLocaleString(), SIM.fmtDur(1/st.lps), `${(48000/st.lps).toFixed(3)} samples per line → 3 or 4 per packet`],
      ['SDI words (10 bit)', '27 000 000', '37.0 ns', '270 Mb/s through CLC011 → GS9023 → GS9032'],
      ['SDI bits', '270 000 000', '3.7 ns', 'CLC014 EQ / CLC016 reclocker; max input cable 250 m, output 500 m (cable report)'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">A pass is about 38 SDI lines long, and the PIC never touches audio or video: it re-writes the same registers into the CS8420s and the GS9023 every 2.4 ms and reads lock flags back.</p>`;
    const on = powerNow(t), sa = segAt(t), lk = sv('lk',t,0);
    m.querySelector('#dev').innerHTML = !on ? '<p class="muted">The unit is off.</p>' : `<table class="kv">
      <tr><th>Now executing</th><td class="mono">${sa? sa.seg[2] : '—'}</td></tr>
      <tr><th>PORTA (RA5 ~RE, RA4 ~WE, RA3..0 address)</th><td class="mono">${sa && sa.seg[0]==='gsw' ? '1111aaaa (writing reg '+Math.min(8,Math.floor(sa.off/8))+')' : sa && sa.seg[0]==='gsr' ? 'reading reg 0 / 8 / 7' : '11111111 (idle)'}</td></tr>
      <tr><th>PORTB (RB0 SCK, RB1 SDO, RB2 SDI, RB3 LOCK32, RB4 AES_SEL1, RB5 4094 STR)</th><td class="mono">RB4 = ${sv('sel0',t,'bnc')==='tb'?1:0} · ${sa && /spi|r16|r15/.test(sa.seg[0]) ? 'SPI active' : sa && sa.seg[0]==='led' ? 'shifting the 4094' : 'idle'}</td></tr>
      <tr><th>PORTC (RC0 SEL4, RC1 RESET, RC2 CD, RC3 ~CS6 U10, RC4 ~CS5 U14, RC5 ~CS2 U9, RC6 SEL3, RC7 SEL2)</th><td class="mono">RC2 = ${sv('cd',t,0)} · RC3 = ${sa&&sa.seg[0]==='spi2'?0:1} · RC4 = ${sa&&sa.seg[0]==='spi1'?0:1} · RC6/RC0 = ${sv('sel1',t,'bnc')==='tb'?'1/0':'0/1'} · RC7 = ${sv('sel0',t,'bnc')==='tb'?0:1}</td></tr>
      <tr><th>PORTD (C7..C0 GS9023 data)</th><td class="mono">${sa && sa.seg[0]==='gsw' ? 'output' : 'input (TRISD = E8)'}</td></tr>
      <tr><th>PORTE (RE0 CASCADE LED, RE1 SELECT, RE2 CASCADE)</th><td class="mono">${sv('led.cas',t,0)} · ${sv('btn.sel',t,0)} · ${sv('btn.cas',t,0)}</td></tr>
      <tr><th>lock_8420</th><td class="mono">${bin8(lk).slice(4)}b</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t, {max:700}); bindPanel(m.querySelector('#fp'));
    const names=[['SDI','led.sdi','#3c3'],['AES1','led.aes1','#db2'],['AES2','led.aes2','#db2'],['ERROR','led.err','#e33'],['CASCADE','led.cas','#db2'],['GR1','g0','#e33'],['GR2','g1','#e33'],['GR3','g2','#e33'],['GR4','g3','#e33']];
    const {c,w} = SIM.canvas(m.querySelector('#ledstrip'), names.length*14+14);
    c.font='10px '+SIM.css('--mono');
    names.forEach(([nm,k,col],n)=>{ c.fillStyle=SIM.css('--ink2'); c.fillText(nm, 2, 12+n*14+6);
      const a = E.sig[k[0]==='g'?'led.g':k]||[]; for (let i=0;i<a.length;i++){ const s=Math.max(0,a[i][0]), e=i+1<a.length?a[i+1][0]:1; if (e<=s||s>=1) continue;
        const lit = k[0]==='g' ? a[i][1]===+k[1] : a[i][1]===1; if (lit){ c.fillStyle=col; c.fillRect(60+s*(w-66), 6+n*14, Math.max(1,(e-s)*(w-66)), 10); } } });
    c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(60+t*(w-66), 2); c.lineTo(60+t*(w-66), names.length*14+10); c.stroke();
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const st = STDW();
  const levels = [['1 second',1],['100 ms (button debounce)',0.1],['10 ms (4 passes)',0.01],['2.5 ms (one pass)',0.0025],['200 µs (SPI bytes)',2e-4],['40 µs (SCK bits)',4e-5]];
  const L = lanes().filter(l=>/passes|SPI|AES1 input|lines|LEDs/.test(l.label));
  const H = levels.length*86+10, {c,w} = SIM.canvas(cv, H);
  levels.forEach(([nm,span],i)=>{
    const y=6+i*86, t0=Math.max(0,Math.min(1-span,t-span/2));
    c.fillStyle=SIM.css('--ink'); c.font='12px '+SIM.css('--sans'); c.fillText(nm, 6, y+14);
    const x0=160, pw=w-x0-10, X = tt => x0 + (tt-t0)/span*pw;
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y,pw,80);
    L.slice(0,5).forEach((l,k)=>{ c.save(); c.beginPath(); c.rect(x0,y+k*16,pw,16); c.clip(); try{ l.draw(c,X,t0,t0+span,y+k*16,16,pw); }catch(e){} c.restore(); });
    c.fillStyle=SIM.css('--ink2'); c.font='9.5px '+SIM.css('--sans'); L.slice(0,5).forEach((l,k)=>c.fillText(l.label.slice(0,26), 6, y+28+k*12));
    const px=X(t); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+80); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=X(Math.max(0,Math.min(1-ns,t-ns/2))); c.fillStyle=SIM.css('--play'); c.globalAlpha=.12; c.fillRect(a,y,Math.max(2,ns/span*pw),80); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram (POD27 - Functional Diagram.cdr + pod27iss2.net) ---------------- */
const BLOCKS = {
  sdin:{x:10,y:20,w:150,h:96,t:'SDI INPUT',s:['BNC3, L7, R1/C19','U1 CLC014 adaptive EQ','U2 CLC016 reclock, CD'],d:'BNC3 → L7 → U1 CLC014 adaptive cable equaliser → U2 CLC016 data-retiming PLL. U2 pins 19/28 drive the CD net to RC2 (carrier detect, read by readgs9023s). The cable report (17 Sep 2013|46) found 250 m maximum at the input.'},
  dec:{x:190,y:20,w:140,h:96,t:'U5 CLC011',s:['serial → 10-bit parallel','D0–D9 to U9','PCLK → U15 CY2305'],d:'Serial digital video decoder (functional diagram: “VIDEO DECODER”). D0–D9 go to the GS9023; its 27 MHz parallel clock is buffered by U15 CY2305 (PCLK-1700 to the PLL, PCLK-023-2 to the GS9023, PCLK-032 to the serialiser).'},
  mux:{x:360,y:20,w:150,h:120,t:'U9 GS9023',s:['embedder (“MUXER”)','host bus A0–A3, C0–C7','AES1 ← U14, AES2 ← U10','regs 0,1,2,3,4,6,E,F'],d:'Gennum GS9023 embedded-audio coprocessor. The PIC writes it every pass (refreshgs9023_2): reg 0 = standard (addr20), reg 1 = CHACT channel activity (addr21), reg 2 = addr22, reg 3 = audio/extended DID nibbles for the group (addr23), reg 4 = control DID nibble + cascade bit 7 (addr24), reg 6 = 01, E = 00, F = A0 then 20 (comments “edf ff”, “edf ap”: EDH flags ' + 'inferred' + '). It reads back reg 0 bit 5 (standard lock), reg 8 bits 6/7 (AES1/AES2 lock) and reg 7 bit 0 (error).'},
  ser:{x:540,y:20,w:150,h:96,t:'U4 GS9032 → 2 × OUT',s:['serialiser DO0–DO9','LOCK32 → R42 → RB3','BNC1, BNC2'],d:'Gennum GS9032 serialiser drives both SDI OUTPUT BNCs (C57/C58, L5/L6 R33/R34 output networks). Its LOCK pin reaches RB3 through R42 1 kΩ — the same pin as the ICSP PGM line on H11-6. readgs9023s stores it in lock_9023,5, which nothing reads.'},
  aes1:{x:10,y:160,w:150,h:96,t:'AES1 IN',s:['BNC4 → T4 → U22 (SEL1)','TB1 → T5 → U18 (SEL2)','outputs tied → U14 RXP'],d:'Two 75176 RS-485 transceivers used as receivers; their outputs are tied (NET00079 → C91 → U14 pin 4). Only one is enabled (pin 2 ~RE low): RB4 = AES_SEL1 for the BNC, RC7 = AES_SEL2 for the Phoenix. autodetect1 toggles them until U14 locks. PE-65612 transformers; R73/R69 75R terminations (BOM).'},
  aes2:{x:10,y:290,w:150,h:96,t:'AES2 IN',s:['BNC5 → T2 → U21 (SEL3)','TB2 → T3 → U19 (SEL4)','outputs tied → U10 RXP'],d:'The same for AES2: RC6 = AES_SEL3 (BNC), RC0 = AES_SEL4 (Phoenix), into U10 pin 4. R68/R65 75R.'},
  src1:{x:200,y:160,w:130,h:96,t:'U14 CS8420',s:['AES1 receiver + SRC','~CS5 = RC4','TX (pin 26) → U9 AES1'],d:'Cirrus CS8420 sample-rate converter. SPI on SCK/SDO/SDI (RB0/RB1/RB2), chip address 0x20. Receives AES1, converts to 48 kHz on the ACLK8420 clock and re-transmits AES3 to the GS9023. In data mode reg3 = 95h (no SRC). Unlocked: reg3 bit 6 set.'},
  src2:{x:200,y:290,w:130,h:96,t:'U10 CS8420',s:['AES2 receiver + SRC','~CS6 = RC3','TX → U9 AES2'],d:'The same for AES2. Both share RESET (RC1) with the GS9023.'},
  clk:{x:360,y:170,w:150,h:96,t:'Audio clock',s:['U15 CY2305 buffer','U11 PLL1700E','U13 74HC74 → ACLK8420'],d:'The 27 MHz video clock goes to U11 PLL1700E (from U15), whose output is divided by U13 74HC74 into ACLK8420 (both CS8420 pin 21) and U9 pin 99. So the embedded 48 kHz is locked to the video (' + 'inferred' + ' from the netlist; the PLL1700E settings are on the missing sheet 3).'},
  pic:{x:540,y:160,w:150,h:120,t:'U12 PIC16F874',s:['X2 4.9152 MHz','27v100.asm, MPASM','SPI, host bus, 4094','RE1/RE2 buttons'],d:'TQFP-44. One main loop of ≈2.4 ms (no interrupts: the vector is a bare retfie). EEPROM keeps jumper0 (group + cascade). ICSP on H11 (D6 on MCLR). Firmware V200 (2012|45) is the latest.'},
  pan:{x:540,y:310,w:150,h:96,t:'Front panel',s:['U3 74HC4094 → 8 LEDs','LED9 CASCADE on RE0','SW1 CASCADE, SW2 SELECT'],d:'U3 4094 shares SCK/SDO with the CS8420 SPI and latches on RB5. Q1–Q4 GR1–GR4 (red), Q5 SDI (green), Q6 AES1, Q7 AES2 (yellow), Q8 ERROR (red), 330 Ω each. SW1/SW2 (PHA-2UEE) with R45/R46 1 kΩ pull-ups and R43/R44 1 kΩ series.'},
  psu:{x:360,y:300,w:150,h:80,t:'Power',s:['PSU1 VAF1005 → +5 V','REG2 LM1117-3.3 → 3V','ACIN, PWRSW'],d:'Open-frame supply PSU1 VAF1005 (+5 V). REG2 LM1117-3.3 makes the 3V rail for the GS9023, PLL1700E and CY2305. Manual: 115 V 12 VA / 230 V 6 VA; the rear silk says 115 VAC.'},
};
const WIRES = [['sdin','dec','270 Mb/s'],['dec','mux','D0–D9'],['mux','ser','DO0–DO9'],['aes1','src1','AES3'],['aes2','src2','AES3'],['src1','mux','AES1 48k'],['src2','mux','AES2 48k'],['dec','clk','PCLK'],['clk','src1','ACLK'],['pic','mux','host bus'],['pic','src1','SPI'],['pic','src2','SPI'],['pic','aes1','SEL1/2'],['pic','pan','4094, RE0–2'],['sdin','pic','CD'],['psu','pic','+5 V']];
function viewBlock(m){
  window.__pod27Active = false;
  let sel = 'mux';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block) — live at the playhead', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one sentence', `<p>The SDI is equalised, reclocked and decoded to 10-bit words; the <b>GS9023</b> inserts AES audio that the two <b>CS8420</b>s have converted to the video-locked 48 kHz; the <b>GS9032</b> serialises the result to both outputs. The <b>PIC</b> only configures the chips and reads their lock flags.</p>`)}</div></div>`;
  const draw = ()=>{
    const t=SIM.t, lk=sv('lk',t,0), on=powerNow(t);
    const live = {aes1: lk&8, src1: lk&8, aes2: lk&4, src2: lk&4, sdin: sv('cd',t,0), dec: sv('cd',t,0), mux: sv('std',t,0), ser: sv('std',t,0)};
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 700 420" style="width:100%"><defs><marker id="p27ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b || (on && live[a] && live[b]);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#p27ar)"/>`;
      if (l && (sel===a||sel===b)) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += `<text x="10" y="412" font-size="11" fill="var(--accent)">${on? 'OUT: '+sv('out',t,'—') : 'unit off'}</text></svg>`;
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b = BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d.replace(/\(inferred|inferred\)| inferred /g, x=>x.replace('inferred', inf))}</p><p class="small muted">Connections: ${WIRES.filter(w=>w[0]===sel||w[1]===sel).map(w=>`${BLOCKS[w[0]].t} → ${BLOCKS[w[1]].t} (${w[2]})`).join('; ')}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from pod27iss2.net / .bom) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function box(x,y,w,h,lines){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/>`+lines.map((l,i)=>`<text x="${x+w/2}" y="${y+18+i*15}" text-anchor="middle" font-size="11" fill="var(--ink)">${l}</text>`).join(''); }
const SHEETS = [
  { name:'1 · PIC16F874 (U12)', note:'Pin numbers and net names from pod27iss2.net. The port name of each pin is from the PIC16F874 44-pin TQFP pin-out (the part is listed in pod27iss2.bom); every one agrees with the port use in 27v100.asm, which confirms the package (inferred from that match).', svg:()=>
    chip(330,40,210,'U12 PIC16F874',[['19 RA0','A0'],['20 RA1','A1'],['21 RA2','A2'],['22 RA3','A3'],['23 RA4','~WE (R28)'],['24 RA5','~RE'],['25 RE0','R38 → LED9 CASCADE'],['26 RE1','R43 → SW2 SELECT'],['27 RE2','R44 → SW1 CASCADE'],['30/31 OSC','X2 4.9152 MHz'],['18 MCLR','H11-3, D6'],['16/17 RB6/7','H11 ICSP']],
      [['8 RB0','SCK'],['9 RB1','SDO'],['10 RB2','SDI'],['11 RB3','R42 ← LOCK32, H11-6'],['14 RB4','AES_SEL1'],['15 RB5','U3 STR'],['32 RC0','AES_SEL4'],['35 RC1','RESET'],['36 RC2','CD'],['37 RC3','~CS6 (U10)'],['42 RC4','~CS5 (U14)'],['43 RC5','~CS2 (U9)'],['44 RC6','AES_SEL3'],['1 RC7','AES_SEL2'],['38–41, 2–5 RD','C0–C7']],'TQFP-44 · MPASM 27v100.asm') },
  { name:'2 · AES inputs (×2)', note:'From the netlist: BNC4 shell → T4 pin 2, centre → C105 → T4 pin 1; T4 3/4 → U22 pins 6/7 with R73 across; U22 pin 1 tied to U18 pin 1 (NET00079) → C91 → U14 pin 4. TB1 pin 1 → C90 → T5-1, pin 2 → T5-2, pin 3 GNDD; T5 3/4 → U18 6/7, R69 across. AES2 is identical with BNC5/T2/U21/R68 and TB2/T3/U19/R65 into U10. All four terminations are 75R in the BOM.', svg:()=>
    box(20,60,150,70,['BNC4 (75 Ω)','C105 → T4 PE-65612','R73 75R'])+box(20,180,150,70,['TB1 Phoenix + − G','C90 → T5 PE-65612','R69 75R (BOM)'])
    + chip(250,50,120,'U22 75176',[['6 A','T4-3'],['7 B','T4-4'],['2 ~RE','AES_SEL1 (RB4)']],[['1 R','NET00079'],['3/5','GNDD']],'')
    + chip(250,180,120,'U18 75176',[['6 A','T5-3'],['7 B','T5-4'],['2 ~RE','AES_SEL2 (RC7)']],[['1 R','NET00079'],['3/5','GNDD']],'')
    + chip(560,90,150,'U14 CS8420',[['4 RXP','C91 ← NET00079'],['2 ~CS','~CS5 (RC4)'],['28 SCL/CCLK','SCK'],['27 SDA/CDIN','SDO'],['1 CDOUT','SDI'],['9 ~RST','RESET'],['21 OMCK','ACLK8420']],[['26 TXP','AES1 → U9-21'],['23 VD+','+5V'],['22/24','GNDD']],'pin functions per CS8420 datasheet (inferred)')
    + `<text x="20" y="400" font-size="11" fill="var(--ink2)">The same for AES2: BNC5/T2/U21 (AES_SEL3, RC6) and TB2/T3/U19 (AES_SEL4, RC0) → U10 (~CS6, RC3) → U9-22.</text>` },
  { name:'3 · SDI path', note:'Netlist: BNC3 (shell on NET00128 with R1/R2/C19, centre via L7) → U1 CLC014 → U2 CLC016 (pins 5/6 from U1 13/14; CD on pins 19/28 → RC2) → U5 CLC011 (pins 5–8 from U2 22–25) → D0–D9 → U9 GS9023 (6–16) → DO0–DO9 (56–66) → U4 GS9032 (1–10) → output networks → BNC1/BNC2. U5-16 PCLK → U15 CY2305.', svg:()=>
    box(20,60,120,60,['BNC3 SDI IN','L7 18nH, R1/R2 75R'])+box(170,60,120,60,['U1 CLC014','adaptive EQ'])+box(320,60,120,60,['U2 CLC016','reclocker · CD'])+box(470,60,120,60,['U5 CLC011','decoder'])
    + chip(470,190,150,'U9 GS9023',[['6–16 D9…D0','from U5'],['21 AES1','U14 TX'],['22 AES2','U10 TX'],['72–81 C0…C7','PORTD'],['83 ~RE · 84 ~WE · 85 ~CS','RA5 · RA4 · RC5'],['86–89 A3…A0','RA3…RA0'],['18 RESET','RC1']],[['56–66 DO9…DO0','→ U4'],['24 PCLK','U15-7'],['99','U13-5 (audio clk)']],'3V + 5V')
    + box(20,200,140,60,['U4 GS9032 serialiser','LOCK (20) → R42 → RB3'])+box(20,290,140,60,['BNC1 / BNC2 SDI OUT','C58 / C57'])
    + `<line x1="140" y1="90" x2="170" y2="90" stroke="var(--ink)"/><line x1="290" y1="90" x2="320" y2="90" stroke="var(--ink)"/><line x1="440" y1="90" x2="470" y2="90" stroke="var(--ink)"/><line x1="530" y1="120" x2="530" y2="160" stroke="var(--ink)"/><text x="365" y="140" font-size="10" fill="var(--accent2)">CD → RC2</text>` },
  { name:'4 · Front panel, LEDs, buttons', note:'U3 74HC4094: pin 1 STR ← RB5, 2 D ← SDO, 3 CP ← SCK; Q1–Q4 (4–7) → R29/R49/R50/R51 330R → LED1–LED4 red (GR1–GR4); Q5 (14) → R30 → LED5 green (SDI); Q6 (13) → R31 → LED6 yellow (AES1); Q7 (12) → R32 → LED7 yellow (AES2); Q8 (11) → R37 → LED8 red (ERROR). LED9 yellow ← R38 ← RE0. SW1 → R44 → RE2, R45 1K to +5V; SW2 → R43 → RE1, R46 1K to +5V; switch pin 3 to GNDD. PWR green via R21.', svg:()=>
    chip(300,60,150,'U3 74HC4094',[['1 STR','RB5'],['2 D','SDO'],['3 CP','SCK']],[['4 Q1','GR1'],['5 Q2','GR2'],['6 Q3','GR3'],['7 Q4','GR4'],['14 Q5','SDI'],['13 Q6','AES1'],['12 Q7','AES2'],['11 Q8','ERROR']],'shift order in refresh_leds: error, aes2, aes1, cd, gr4…gr1')
    + box(30,300,230,70,['SW2 SELECT: pin 1 → R43 1K → RE1','R46 1K to +5V, pin 3 GNDD','firmware wants RE1 HIGH when pressed'])
    + box(290,300,230,70,['SW1 CASCADE: pin 1 → R44 1K → RE2','R45 1K to +5V, pin 3 GNDD','normally-closed contacts '+'inferred'])
    + box(550,300,200,70,['LED9 CASCADE (yellow)','R38 330R ← RE0','PWR green ← R21 from +5V']) },
  { name:'5 · Power and clocks', note:'PSU1 VAF1005 (1 ← PWRSW, 2 ← ACIN, 5 → +5V); REG2 LM1117-3.3 (3 ← +5V, 2/4 → 3V). U15 CY2305 (1 ← U5-16 PCLK; 3 → PCLK-1700 → U11-6; 5 → PCLK-032 → R6 → U4; 7 → PCLK-023-2 → U9-24). U11 PLL1700E pin 14 → U13-11 74HC74; U13 3/9 → ACLK8420 (U10-21, U14-21), U13-5 → U9-99. X2 4.9152 MHz with C39/C44 27p.', svg:()=>
    box(20,60,180,60,['ACIN → PWRSW → PSU1 VAF1005','→ +5V'])+box(240,60,170,60,['REG2 LM1117-3.3','+5V → 3V (GS9023 core, PLL)'])
    + box(20,180,170,60,['U5 PCLK 27 MHz','→ U15 CY2305 (3V)'])+box(230,180,170,60,['U11 PLL1700E','← PCLK-1700'])+box(440,180,170,60,['U13 74HC74','÷2 → ACLK8420, U9-99'])
    + box(650,180,120,60,['X2 4.9152 MHz','PIC only'])
    + `<line x1="190" y1="210" x2="230" y2="210" stroke="var(--ink)"/><line x1="400" y1="210" x2="440" y2="210" stroke="var(--ink)"/><text x="20" y="300" font-size="11" fill="var(--ink2)">The 48 kHz audio clock is derived from the incoming video (` + 'inferred' + `: PLL1700E ratios are on the missing sheet 3).</text>` },
];
function viewSchem(m){
  window.__pod27Active = false;
  let i = 0;
  m.innerHTML = card('Schematic set — REDRAWN from pod27iss2.net, pod27iss2.bom and the firmware (not the P-CAD drawing)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The originals are the P-CAD 2002 files <span class="mono">PCB/pod27iss2.sch</span> / <span class="mono">pod27iss2x.sch</span> and the CorelDRAW-printed <span class="mono">POD27sheet1/2/4.pdf</span> (13 Jan 2005; sheet 3 is missing). Blue labels are net names from the netlist.</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 440" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="884" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">POD27 ISS2 · redrawn ${Y(2026)} · ${i+1}/${SHEETS.length}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note.replace(/\(inferred[^)]*\)|inferred/g, s=>s.replace('inferred', inf));
  };
  draw();
}

/* ---------------- software ---------------- */
function regRow(name, val, bits, note){ return `<tr><td class="mono">${name}</td><td class="mono">${hex2(val)}</td><td class="mono">${bits.map((b,k)=>`<span title="${b}" style="padding:0 2px;${(val>>(7-k))&1?'color:var(--accent);font-weight:700':'color:var(--ink2)'}">${(val>>(7-k))&1}</span>`).join('')}</td><td class="small">${note}</td></tr>`; }
function viewSoft(m){
  window.__pod27Active = false;
  m.innerHTML = `<div class="grid2">
    ${card('MAIN — the routine lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('Button state machine (switch.asm, live)', `<div id="fsm"></div>`)}${card('Autodetect state machine (autodetect.asm, live)', `<div id="ad"></div>`)}</div></div>
  <div class="grid2">
    ${card('CS8420 registers as written at the playhead (refresh8420_1 / _2)', `<div id="reg"></div>`)}
    ${card('GS9023 host-bus registers (refreshgs9023_2)', `<div id="gs"></div>`)}
  </div>
  <div class="grid2">
    ${card('Firmware versions in the archive', `<table class="kv"><tr><th>Build</th><th>Standard</th><th>addr22</th><th>Buttons</th><th>Other</th></tr>${Object.keys(FW).map(k=>{ const f=FW[k]; return `<tr><td class="mono">${f.name}</td><td>${f.std}</td><td class="mono">${f.addr22===null?'never set':hex2(f.addr22)}</td><td>${f.sw1&&f.sw2?'both':!f.sw1&&!f.sw2?'none':'CASCADE only'}</td><td class="small">${f.unlock?'un_lock1/2 + AUDIO_LOCK CHACT reset':''}${f.reg2?'cs8420reg2def = 20h':''}</td></tr>`; }).join('')}</table>
      <p class="small muted">“working” = v1.00 with a different TRISD after the GS9023 writes (FFh) and a comment change; “working AA” = v1.02. The select under the front panel switches the emulator between builds.</p>`)}
    ${card('SPI frame to a CS8420 (shiftout, MSB first)', `<div id="spi"></div>`)}
  </div>`;
  const FLOW = [['sw','switch_press1/2, switch_debounce1/2','RE1, RE2 polled; 21 passes'],['gsw','refreshgs9023_2','regs 0,1,2,3,4,6,E,F,F'],['gsr','readgs9023s','std lock, AES1/2 lock, CD (RC2), LOCK32 (RB3)'],['spi1','refresh8420_1','U14: 19 bytes'],['spi2','refresh8420_2','U10: 19 bytes'],['r16','read8420s16 ×2','reg 16 UNLOCK → lock_8420'],['r15','read8420s15','reg 15 AUDIO → SRC'],['proc','process','group DIDs, CHACT, set_cascade, standard'],['led','refresh_status → refresh_leds','ERROR/SDI logic, 4094'],['chk','check_aes3 / check_aes4','first lock → defaults; 8 unlocked → reg3 bit 6'],['ad','autodetect1/2 → audio_source_type1/2 → delay_2 → eewrite','BNC ↔ Phoenix, EEPROM']];
  const draw = ()=>{
    const t=SIM.t, sa=segAt(t), on=powerNow(t);
    m.querySelector('#flow').innerHTML = `<svg viewBox="0 0 520 ${FLOW.length*38+20}" style="width:100%">${FLOW.map((f,i)=>{ const hot = on && sa && sa.seg[0]===f[0]; return `<rect x="10" y="${8+i*38}" width="500" height="32" rx="6" fill="${hot?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${hot?'var(--accent)':'var(--line)'}" stroke-width="${hot?2.5:1}"/><text x="20" y="${28+i*38}" font-size="12" font-weight="700" fill="var(--ink)">${f[1]}</text><text x="500" y="${28+i*38}" text-anchor="end" font-size="10" fill="var(--ink2)">${f[2]}</text>`; }).join('')}
      <path d="M8 ${FLOW.length*38} q-6 -${FLOW.length*19} 0 -${FLOW.length*38-14}" fill="none" stroke="var(--ink2)" marker-end="url(#p27ar2)"/><defs><marker id="p27ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs></svg>
      <p class="small muted">${on? (sa? `Pass at ${SIM.fmtT(sa.p.t)}, Tcy ${Math.floor(sa.off)} into “${sa.seg[2]}”.` : 'Start-up.') : 'Unit off.'} No interrupts are used (the vector at 4h is a bare retfie); clrwdt is sprinkled through MAIN.</p>`;
    const pf = sv('pf',t,0), bs = sv('btn.sel',t,0), bc = sv('btn.cas',t,0);
    const st1 = pf&2 ? (bs? 'held — waiting for release (press_flag,1)' : 'released — counting rem1 to 256 (31 passes)') : bs ? 'pressed — counting rem0 235 → 256 (21 passes)' : 'idle (rem0 = 235)';
    const st2 = pf&32 ? (bc? 'held — waiting for release' : 'released — counting rem5') : bc ? 'pressed — counting rem4' : 'idle (rem4 = 235)';
    m.querySelector('#fsm').innerHTML = `<table class="kv"><tr><th>press_flag</th><td class="mono">${bin8(pf)}b</td></tr><tr><th>SELECT (RE1)</th><td>${curFw().sw1? st1 : '<i>switch_press1 commented out in this build</i>'}</td></tr><tr><th>CASCADE (RE2)</th><td>${curFw().sw2? st2 : '<i>switch_press2 commented out in this build</i>'}</td></tr><tr><th>Group</th><td class="mono">jumper0 = ${hex2(sv('jumper0',t,0))} → group ${(sv('jumper0',t,0)&3)+1}</td></tr></table>
      <p class="small muted">Accept after 21 high passes → change group/cascade immediately → wait for release → 31 low passes → press_flag,2 → eewrite stores jumper0 and the AA signature (≈4 ms stall ${inf}).</p>`;
    const lk = sv('lk',t,0);
    m.querySelector('#ad').innerHTML = [0,1].map(i=>{ const s=sv('sel'+i,t,'bnc'), l=lk&(i?4:8); return `<div style="display:flex;gap:8px;align-items:center;margin:4px 0"><b style="width:44px">AES${i+1}</b>
      <span class="chip" style="padding:2px 8px;border-radius:6px;${s==='bnc'?'background:var(--accent);color:#fff':'background:var(--chip)'}">BNC ${i?'U21':'U22'}</span><span>⇄</span><span class="chip" style="padding:2px 8px;border-radius:6px;${s==='tb'?'background:var(--accent);color:#fff':'background:var(--chip)'}">Phoenix ${i?'U19':'U18'}</span>
      <span class="small">${l? 'locked → stays' : 'unlocked → swap every 9 passes'}</span></div>`; }).join('') + `<p class="small muted">lock75_110_x bit 0 = which receiver, bit 1 = confirmed lock. Manual: “If an unbalanced and balanced AES signal are inadvertently connected to the same input, POD27 will randomly lock to one of the signals.”</p>`;
    const r3 = [sv('reg3_0',t,0x81), sv('reg3_1',t,0x81)], src=sv('src',t,3);
    const B3 = ['TXOFF','AESBP','TXD1','TXD0','SPD1','SPD0','SRCD','—'], B4 = ['—','RUN','—','—','—','—','—','—'];
    m.querySelector('#reg').innerHTML = `<table class="kv"><tr><th>reg</th><th>U14 / U10</th><th>bits</th><th>meaning</th></tr>
      ${regRow('1 Misc 1', 0x08, ['','','','','','','',''], 'cs8420reg1def')}
      ${regRow('2 Misc 2', FW[D.cfg.fw].reg2, ['','','','','','','',''], FW[D.cfg.fw].reg2? '“v102 no src” value 20h' : 'cs8420reg2def')}
      ${regRow('3 Data flow · U14', r3[0], B3, `${r3[0]&0x40?'bit 6 set: AES1 unlocked':'normal'} · ${src&1?'SRC (81h)':'no SRC (95h)'}`)}
      ${regRow('3 Data flow · U10', r3[1], B3, `${r3[1]&0x40?'bit 6 set: AES2 unlocked':'normal'} · ${src&2?'SRC (81h)':'no SRC (95h)'}`)}
      ${regRow('4 Clock', 0x41, B4, 'cs8420reg4def: bit 6 RUN (“cs8420reg4stop = 01: Stop the 8420”)')}
      ${regRow('6 Ser. out', (src&1)?0x82:0xB2, ['','','','','','','',''], 'reg6_24 (82h) or reg6_copy (B2h) in data mode')}
      ${regRow('17 Rx err mask', 0x10, ['','','','UNLOCK','','','',''], 'cs8420reg17def')}</table>
      <p class="small muted">Bit names in reg 3/4 are from the CS8420 data sheet, not the archive (${inf}). The firmware calls reg3 bit 6 a “mute”.</p>`;
    const ch=sv('chact',t,0), a23=sv('a23',t,0xEF), a24=sv('a24',t,0x8F), g=[0xEF,0xCD,0xAB,0x89].indexOf(a23);
    m.querySelector('#gs').innerHTML = `<table class="kv"><tr><th>reg (PORTA)</th><th>value</th><th>source / meaning</th></tr>
      <tr><td class="mono">0 (F0)</td><td class="mono">${hex2(FW[D.cfg.fw].std===625?0x85:0x81)}</td><td class="small">addr20: “2,1,0 — 525d1 = 001, 625d1 = 101, 525d2 = 000”</td></tr>
      <tr><td class="mono">1 (F1)</td><td class="mono">${hex2(ch)}</td><td class="small">addr21 CHACT: ch1+2 (03) when AES1 locks, ch3+4 (0C) when AES2 locks; bit 0 forced when nothing locks and cascade is off</td></tr>
      <tr><td class="mono">2 (F2)</td><td class="mono">${FW[D.cfg.fw].addr22===null?hex2(RAM22)+'?':hex2(FW[D.cfg.fw].addr22)}</td><td class="small">addr22 (v1.02+: E1, v1.03w: C1; v1.00/1.01 never initialise it)</td></tr>
      <tr><td class="mono">3 (F3)</td><td class="mono">${hex2(a23)}</td><td class="small">addr23: high nibble = extended-data DID ${h3(did10(DID.ext[g]))}h, low nibble = audio-data DID ${h3(did10(DID.aud[g]))}h → group ${g+1} (SMPTE 272M; nibble packing ${inf})</td></tr>
      <tr><td class="mono">4 (F4)</td><td class="mono">${hex2(a24)}</td><td class="small">addr24: low nibble = control-packet DID ${h3(did10(DID.ctl[g]))}h; bit 7 = cascade (“1 = add data, 0 = strips data”)</td></tr>
      <tr><td class="mono">6 (F6)</td><td class="mono">01</td><td class="small">addr26</td></tr>
      <tr><td class="mono">E (FE)</td><td class="mono">00</td><td class="small">—</td></tr>
      <tr><td class="mono">F (FF)</td><td class="mono">A0, 20</td><td class="small">“edf ff”, “edf ap” (EDH flags ${inf})</td></tr></table>`;
    const bytes = spiBytesOf({t: (passAt(t)||{t:0}).t}, 'spi1');
    m.querySelector('#spi').innerHTML = `<div class="mono small" style="line-height:1.7">${bytes.map((b,j)=>`<span title="${j===0?'chip address 0010000 + W':j===1?'MAP: INCR + reg 1':'reg '+(j-1)}" style="${j<2?'color:var(--warn)':j>=10&&j<18?'color:var(--ink2)':''}">${hx(b)}</span>`).join(' ')}</div>
      <p class="small">CS low (RC4 for U14, RC3 for U10) → <b>20</b> chip address/write → <b>81</b> MAP with auto-increment from reg 1 → regs 1–6 → two zeros into the read-only regs 7/8 → reg 9 → <b>seven more bytes that re-send temp0</b> (still reg 9's value, 00) into regs 10–16 → reg 17 → CS high. Each byte is 8 × 5 Tcy of bit-banging on RB0/RB1; the 4094 on the same lines shifts along harmlessly until RB5 strobes it.</p>
      <p class="small muted">read8420s16: both CS low → 20 10 (MAP = 16), then per chip 21 + 8 bits in on RB2 → bit 4 = UNLOCK. read8420s15: the same with MAP 0F, bit 2 = non-audio.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod27Active = false;
  const F = (h, b)=>`<li style="margin-bottom:8px"><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('Findings — what the POD27 and its firmware are up to', `<ol class="small" style="padding-left:18px">
    ${F('Every build is locked to one TV standard; V200 is a 625-only build.', `In <span class="mono">process</span> the jumper test is commented out in every version: v1.00–v1.03w end with an unconditional <span class="mono">goto ntsc525d1</span> (addr20 = 81h), V200 with <span class="mono">goto pal625 ;Ali-Add</span> (85h), and INIT was changed the same way (<span class="mono">;Ali-Rem</span>). So V200 does not “add” PAL, it swaps 525 for 625. The V200 test report (25 Apr 2012|45) ticks only “SD, 625i, 50”, and the cable report says “POD27 V200 PAL SD625”. Feed a V200 525-line video and the SDI tally goes out and ERROR lights (scenario “V200 fed 525-line SDI”; the standard-lock reading is from the readgs9023s comment “video standard lock”, ${inf}).`)}
    ${F('Cascade OFF strips the input audio even with no AES connected — the manual says the opposite.', `Manual: “With the cascade function turned off, POD27 will strip out existing embedded audio only if it detects a valid AES signal.” In <span class="mono">process</span>, when neither CS8420 is locked, <span class="mono">btfss jumper0,6 / bsf addr21,0 ;to strip all audio if in cascade mode</span> sets CHACT channel 1 when cascade is <i>off</i> (the comment says “in cascade mode”). With CHACT non-zero and the cascade bit clear the embedder strips (${inf} from the addr24 comment “0 = strips data”).`)}
    ${F('Leftovers of a two-embedder design.', `The RAM map has “mux-1” registers <span class="mono">addr0–addr6</span> and <span class="mono">d1group</span> next to “mux_2” <span class="mono">addr20–addr26</span>; only one GS9023 (U9) is on the board and only addr20–26 are ever sent (addr0 is written with the standard and never used). Comments mention “the four 8420s”, lock flags “aud4, aud3”, routines are called <span class="mono">check_aes3/check_aes4</span>, and <span class="mono">cs8420reg32def–36def</span>, <span class="mono">reg1swclk/3swclk/4swclk</span> and <span class="mono">reg1mute</span> are never used.`)}
    ${F('The “cascade mute” differences between versions are dead constants.', `README.md lists <span class="mono">cs8420reg3mute</span> = 00010101 vs 11000001 as a version difference (working, 27-014/v101). Every use of <span class="mono">cs8420reg3mute</span> in every version is commented out; the code mutes with <span class="mono">bsf cs8420reg3_x,6</span> instead. Likewise <span class="mono">cs8420reg4nosrc</span> in “v102 no src” equals <span class="mono">cs8420reg4def</span> (01000001): the only real change in that build is <span class="mono">cs8420reg2def = 00100000</span>.`)}
    ${F('v1.00, v1.01 and both 27-014 builds send an uninitialised register to the GS9023.', `<span class="mono">refreshgs9023_2</span> writes <span class="mono">addr22</span> to GS9023 register 2 every pass, but INIT only sets it from v1.02 on (<span class="mono">movlw b'11100001'</span>). Earlier builds send whatever the RAM held at power-up (the emulator uses ${hex2(RAM22)}, ${inf}).`)}
    ${F('The custom 27-014 builds do not both lock the panel.', `README.md: “front-panel switches disabled”. <span class="mono">27-014/v100/27-014.asm</span> comments out only <span class="mono">switch_press1</span>/<span class="mono">switch_debounce1</span> (SELECT); CASCADE still toggles. <span class="mono">27-014/v101</span> comments out both presses but still calls <span class="mono">switch_debounce2</span> (harmless: press_flag,4 is never set).`)}
    ${F('The buttons only work with normally-closed contacts.', `<span class="mono">switch_press1</span> counts while <span class="mono">porte,1</span> is <b>high</b> (<span class="mono">btfss porte,1 / goto remember1</span>). The netlist pulls RE1/RE2 up to +5V through R46/R45 1 kΩ and switches SW2/SW1 pin 1 to GNDD on pin 3. With a normally-open contact the firmware would step the group every 21 passes on its own; the PHA-2UEE contacts used must open when pressed (${inf} — the switch pin-out is not in the archive).`)}
    ${F('A blank EEPROM leaves group and cascade to chance.', `<span class="mono">eeread</span> only loads <span class="mono">jumper0</span> when address 20 holds AA. INIT never clears <span class="mono">jumper0</span>, so a new unit runs on power-up RAM: the embedded group can differ from the lit GR1 (output_led is only changed by eeread and switch_press1) until the first SELECT press. Cascade follows the same garbage bit 6, and refresh_status lights RE0 to match it. Scenario “Blank EEPROM”.`)}
    ${F('The INIT lamp test is never seen.', `INIT sets <span class="mono">output_led</span> = error + aud1 + aud2 + cd + gr1, but the 4094 is only loaded in <span class="mono">refresh_leds</span>, after <span class="mono">refresh_status</span> has recomputed bits 0–3 in the first pass.`)}
    ${F('ERROR has a third cause the manual calls “internal board error”.', `<span class="mono">refresh_status</span> XORs <span class="mono">lock_8420</span> with the GS9023's own AES-lock bits (reg 8 bits 6/7). A mismatch lights ERROR even with good video. When an AES input is pulled, ERROR blinks for about one pass until reg3 bit 6 reaches the CS8420 — too short to see.`)}
    ${F('Swapped labels and a double chip-select in the AES code.', `<span class="mono">process</span> says “is aes 1 locked” on <span class="mono">lock_8420,2</span>, which <span class="mono">read8420s16</span> fills from U10 = AES2 (the logic itself is consistent). <span class="mono">audio_source1</span> says “aes1 (u10) cs” and pulls RC3 (U10's ~CS6) low before <span class="mono">refresh8420_1</span> selects U14 on RC4; INIT's PORTC = 11100100 already holds both chip selects low. During INIT both CS8420s therefore receive AES1's set-up; the main loop rewrites them within 2.4 ms.`)}
    ${F('refresh8420 writes reg 9’s value into regs 10–16.', `After reg 9 the routine calls <span class="mono">shiftout</span> seven times without reloading <span class="mono">temp0</span> (“reg10 int mode … reg 16”). The interrupt-mode registers get 00 only because <span class="mono">cs8420reg9def</span> happens to be 00; regs 15/16 are read-only.`)}
    ${F('RB3 is both the ICSP PGM pin and the GS9032 lock input.', `U4 LOCK32 → R42 1 kΩ → U12 pin 11 (RB3) and H11-6. <span class="mono">readgs9023s</span> stores it in <span class="mono">lock_9023,5</span>, which nothing reads. With low-voltage programming enabled in the (unrecorded) config bits, a locked serialiser would hold the PIC in program mode at reset (${inf}).`)}
    ${F('Dead code still in V200.', `<span class="mono">run_stop</span>, <span class="mono">sys_reset1/2</span> (“refreshing the clocks of the four 8420s”) are unreachable (<span class="mono">;call run_stop</span>), yet <span class="mono">delay_2</span> still counts <span class="mono">output/output1</span> each pass and sets <span class="mono">flag,0</span> after ≈2 000 passes. <span class="mono">un_lock1/un_lock2</span> remain in V200 but are only called in v1.01. The variable <span class="mono">audio_lock</span> is declared as <span class="mono">AUDIO_LOCK</span>.`)}
    ${F('The source only assembles case-insensitively.', `Labels and symbols mix case: <span class="mono">MAIN</span>/<span class="mono">goto main</span>, <span class="mono">COUNT1</span>/<span class="mono">count1</span>, <span class="mono">AUDIO_LOCK</span>/<span class="mono">audio_lock</span>, <span class="mono">portc</span> against the header's <span class="mono">PORTC</span>, <span class="mono">CALL REFRESH8420_1</span>. The empty .ERR files of v1.00–v1.03w show it built, so MPASM's case sensitivity was switched off (/c-) in the projects (${inf}).`)}
    ${F('V200 does not build where it is archived.', `<span class="mono">v200/27v100.err</span>: “Error[173] … source file path exceeds 62 characters (H:\\ENGINEERING\\WBSPRODUCTS\\POD\\POD27\\SOFTWARE\\V200\\AUTODE~1.ASM)”. The shipped hex was built in <span class="mono">C:\\Ali\\Projects\\POD27\\PIC\\v102</span>; no .HEX is archived for any version.`)}
    ${F('V200 shipped with an open defect.', `The test report: “This version is still have missing embedded audio error which detected by Tektronic analyzer. This problem need to be fixed before the unit shipped”. No later version exists in the archive. It also lists the main board as “Issue: 3”; only ISS1 (OBSOLETE) and ISS2/ISS2x are archived (ECO dated 19 Feb 2004|37).`)}
    ${F('All four AES terminations are 75 Ω.', `pod27iss2.bom lists R65, R68, R69 and R73 as 75R. R69/R65 sit across the Phoenix-side transformers T5/T3 (manual: “110 Ohm balanced”). Unless the PE-65612 ratio makes up the difference, the balanced inputs are terminated in 75 Ω (${inf}).`)}
    ${F('Mains marking disagrees between drawings.', `Rear silk (FINAL CURVE Jul.02/14 and the 2010|43 photo): “115 VAC, ½ A.S.B. DISCONNECT BEFORE SERVICING”. <span class="mono">POD27-FRONT&amp;REAR.pdf</span> (2 Jul 2015|48) and <span class="mono">SILK/POD27SLK-ISS2.cdr</span>: “100-240 VAC, 50-60 Hz”. The manual lists 115 V/60 Hz 12 VA and 230 V/50 Hz 6 VA.`)}
    ${F('The 2015 silk PDF carries a front panel from another product.', `<span class="mono">POD27-FRONT&amp;REAR.pdf</span> and <span class="mono">POD27SLK-ISS2.cdr</span> hold two fronts: the POD27 one and a “POD-27 SDI MUXER” front with <b>OUTPUT LEVEL ADJUST 1–6</b> trimmer holes — a six-output DA layout (POD20-style, ${inf}) that the POD27 never had. This plugin uses the Jul.02/14 FINAL CURVE drawing, which matches the photos (it adds a “SELECT” legend the 2010 photo does not show).`)}
    ${F('Every button press stalls the loop and writes the EEPROM twice.', `<span class="mono">eewrite</span> stores <span class="mono">jumper0</span> at 0 and the AA signature at 20 after each release. The second <span class="mono">eew</span> spins on <span class="mono">eecon1,wr</span> until the first write ends, so that pass is ≈4 ms longer (${inf}).`)}
    ${F(`Artwork ${Y(2026)}: front/rear panels now from ${SIM.src(ART_PATH,'POD27-FRONT&REAR(FINAL CURVE).cdr')} (Jul.02/14).`, `The CorelDRAW file is converted to vector (<span class="mono">assets/pod27-front.svg</span>, <span class="mono">pod27-rear.svg</span>) in place of the earlier PNG cuts of the same drawing. It also shows a small round hole at the top right of the rear (Ø 4.2 mm, above the right fixing screw) that nothing in the model uses; the POD28 ISS 1 rear-panel drawing calls the same hole a ground-stud insert (FH-440-5), so it is most likely the earth stud here too (${inf}). Every front hole has a legend and a part (PWR LED, CASCADE + LED, SELECT, GR1–4, SDI, AES1, AES2, ERROR).`)}
  </ol>
  <p class="small muted">Archive: POD27 is filed as “SD-SDI audio muxer” in #POD #SERIES/README.md. The POD28 ASI pass-through report (24 Jun 2010|43) is filed in POD27's #TESTREPORT.</p>`);
}

/* ---------------- register plugin ---------------- */
loadScenario('run');
SIM.register({ footnotes:[{text:"The rear panel has a small Ø 4.2 mm hole above the right fixing screw that no part in the model uses; the POD28 drawing calls the same hole a ground-stud insert, so it is probably the earth stud (inferred).",src:"#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR(FINAL CURVE).cdr"},{text:"Every front hole has a legend and a part: PWR LED, CASCADE button and LED, SELECT, GR1–4, SDI, AES1, AES2 and ERROR. Nothing is drilled without being used.",src:"#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR(FINAL CURVE).cdr"},{text:"The FINAL CURVE rear reads “115 VAC, ½ A.S.B.”, while the 2015 PDF and SILK/POD27SLK-ISS2.cdr read “100-240 VAC, 50-60 Hz”.",src:"#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR(FINAL CURVE).cdr"},{text:"The 2015 drawing also carries a “POD-27 SDI MUXER” front with OUTPUT LEVEL ADJUST 1–6 trimmer holes, a six-output DA layout the POD27 never had.",src:"#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR.pdf"},{text:"The FINAL CURVE drawing has a “SELECT” legend under the group button that the 2010 photo of the unit does not show.",src:"#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD27/POD27-FRONT&REAR(FINAL CURVE).cdr"}],
  
  id:'pod27', name:'POD27 · SDI audio muxer, one AES group into SD-SDI ('+Y(2003)+')', duration:1,
  product:'POD27', year:2003, family:'POD series',
  folder:'#POD #SERIES/POD27 - #Master',
  summary:'Half-rack SD-SDI embedder: two AES inputs (75 Ω BNC or 110 Ω Phoenix, auto-detected) are sample-rate converted to 48 kHz by two CS8420s and embedded as one SMPTE 272M group by a GS9023, with cascade mode and front-panel group select. A PIC16F874 bit-bangs the chips every 2.4 ms; the emulator runs that loop pass by pass for eight firmware builds from v1.00 (2003|36) to V200 (2012|45).',
  highlights:['PIC main loop emulated pass by pass (2 969 Tcy, counted from 27v100.asm) down to SPI bits','Front and rear panel on the real Jul.02/14 silkscreen','BNC/Phoenix autodetect, CS8420 SRC bypass for Dolby E, cascade and group DIDs','HANC audio packets drawn word by word','21 findings: V200 is 625-only, cascade-off strips anyway, dead “mute” constants'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (≈2.42 ms)', period:()=>PASS},
    {label:'1 SPI byte (46 Tcy)', period:()=>46*TCY},
    {label:'1 SDI line', period:()=>1/STDW().lps},
    {label:'1 AES1 frame', period:()=>1/D.cfg.aes[0].fs},
    {label:'1 SDI field', period:()=>1/STDW().fps},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms (button debounce)'],[0.05,'50 ms (autodetect)'],[0.01,'10 ms (4 passes)'],[0.0025,'2.5 ms (one pass)'],[0.0003,'300 µs (SPI bytes)'],[0.00006,'60 µs (SCK bits, one SDI line)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD27', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
