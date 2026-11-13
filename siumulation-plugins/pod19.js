/* =====================================================================
   POD19 — SDI → AES de-embedder, one group of four (Ward-Beck Systems, 2001|34)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive):
   - #POD #SERIES/POD19 - #Master/README.md and POD19 - #Engineering/README.md
   - POD19 - #Engineering/Software/19-014/19-014.asm (PODXX v1.00 → v1.01 PIC16F73 → POD19-014, Feb 11 2004):
       init, read, main, sdi_check, switch_press, led_output, switch_debounce, write, write_enable, eew, eer,
       press_flag bits, rem0..rem4, source, 93LC66 Microwire bit-bang on PORTA
   - #POD #SERIES/POD  - #Engineering/PODXX/Podxx Software/PIC VERSIONS/v101/v101.asm (the generic PODXX v1.01;
       identical to 19-014.asm except that switch_press and switch_debounce are still called)
   - POD19 - #Engineering/Software/v101/POD19_DEMUX.asm (= demuxis2.asm, Demux-1 PIC16F874, Aug 9 2001) and
       Software/v100/POD19_DEMUXv100.asm (PIC16C73A, Mar 1 2001): MAIN, refreshgs9023, refreshoutputmux, setgroup,
       readgroupselect, readgs9023, GS9023 register shadows addr0..addr15
   - POD19 - #Engineering/pod19/pic/pod19.asm + pod19.h (first design, Slava Lee, Mar 17 2000) and
       pod19/altera/decoder_top.rpt (EPF10K30ETC144-3 pin list)
   - #POD #SERIES/POD  - #Engineering/PODXX/PODXX.SCH (component list: PIC16C73, 93LC66, 4.9152 MHz, LEDs, DS75176, PE65612)
   - xxx-OBSOLETE…/DEMUX1…/DEMUX-1 - #PCB/DEMUX-1ISS2.bom (CLC014, CLC016, CLC011, CLC007, GS9023, PLL1700E,
       74HC153, PIC16F874, 4.9152 MHz) — the Demux-1 module that POD19 carries
   - POD19 - #Engineering/MANUAL/pod19.pdf (2002 operator sheet), POD19man.cdr, POD19MANU*.cdr (cover drawings)
   - POD19 - #TESTREPORT/POD19-V2003-5JUL10.pdf (2010 rebuild with DEMUX-3) and
       xxx-OBSOLETE…/DEMUX3…/v203-POD19/demux_201.c (its P2 pin map)
   - #POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD19/POD19-FRONT&REAR(FINAL CURVE) .cdr
       → converted with Inkscape (libcdr) → assets/pod19-front-green.png, pod19-front-white.png, pod19-rear-white.png
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants from the source ---------------- */
const XTAL = 4.9152e6;                 // X1 on PODXX.SCH and on DEMUX-1ISS2.bom
const TCY = 4 / XTAL;                  // PIC instruction cycle 813.8 ns
const C = {
  DM_CYC: 1123,          // Demux-1 MAIN pass, counted from POD19_DEMUX.asm (≈1024 of it is the rdelay1 loop)
  DEB: 256,              // incfsz rem0 → 256 passes with RB7 high
  REL: 256,              // incfsz rem1 → 256 passes with RB7 low
  REM4: 75,              // movlw 75 → rem4 (was 150, commented out)
  BOOT_CYC: 197380,      // powerupdelay with output1 = 0 at power-up (RAM content unknown → inferred worst case)
  EE_CYC: 330,           // cycles of write_enable + eew + eew (counted, excluding the busy waits)
  TWC: 0.004,            // 93LC66 self-timed write — inferred (datasheet class value)
  DM_BOOT_CYC: 40,       // INIT of the Demux PIC
};
const AES_FS = 48000, BLOCK = 192/AES_FS;
const STD = {
  '525': {name:'525/59.94 (NTSC)', H:1001/15750000, words:1716, lines:525, field:1001/60000, eav:4, hanc:268, ctlLine:12},
  '625': {name:'625/50 (PAL)',     H:64e-6,         words:1728, lines:625, field:0.02,       eav:4, hanc:280, ctlLine:8},
};
const WORD_T = 1/27e6;                 // 270 Mb/s ÷ 10 bits
const A3 = {1:0xEF, 2:0xCD, 3:0xAB, 4:0x89};       // setgroup: DID audio packet ext/group
const A4 = {1:0x0F, 2:0x0E, 3:0x0D, 4:0x0C};       // setgroup: DID control packet
const A3G = {0xEF:1, 0xCD:2, 0xAB:3, 0x89:4};
const AUD_DID = [0,0xFF,0xFD,0xFB,0xF9], EXT_DID=[0,0xFE,0xFC,0xFA,0xF8], CTL_DID=[0,0xEF,0xEE,0xED,0xEC];
const TONE_F = [[400,1000,400,1000],[500,1500,500,1500],[600,2000,600,2000],[700,3000,700,3000]]; // test source — inferred
const LEVEL = 0.1;                                 // −20 dBFS test tone
const GRP_BIT = {1:3, 2:0, 3:1, 4:2};              // group n → PORTB bit (group1: bsf portb,3 … group4: bsf portb,2)

/* ---------------- device + world state ---------------- */
const D = {
  fw: 'v101',            // PODXX firmware: 'v101' (switch works) or '014' (POD19-014, switch calls commented out)
  dmfw: 'v101',          // Demux-1 firmware: 'v101' (PIC16F874) or 'v100' (PIC16C73A)
  std: '525',
  emb: [true, true, false, false],                 // which groups the SDI source carries
  hold: 0.15,                                      // how long a press is held
  init: null,            // state at t = 0
  events: [],            // {t, type:'press'|'sdi'|'power', dur, on, user}
  scenario: 'step',
  log: [],
};
function freshInit(eeGroup){
  const g = eeGroup||1;
  const ee = eeGroup ? {w0:0xAAAA, w1:((1<<(g-1))<<8)|(1<<(g-1))} : {w0:0xFFFF, w1:0xFFFF};
  return { power:true, sdi:true,
    pod:{src:1<<(g-1), pf:0x80|(eeGroup?0x40:0), r0:0, r1:0, r2:128, r4:C.REM4, pb:(1<<GRP_BIT[g])|0x60, pc:g-1},
    dm:{group:1<<(g-1), a3:A3[g], a4:A4[g], lock:1}, gsA3:A3[g], ee };
}
const SCEN = {
  step:   {name:'Step the group at 0.200 s (groups 1 + 2 embedded)', ee:1, emb:[1,1,0,0], ev:[{t:0.2,type:'press',dur:0.15}]},
  steady: {name:'Steady: group 1, SDI with groups 1 + 2', ee:1, emb:[1,1,0,0], ev:[]},
  empty:  {name:'Step into an empty group (3) at 0.150 s', ee:2, emb:[1,1,0,0], ev:[{t:0.15,type:'press',dur:0.12}]},
  write:  {name:'EEPROM write-back: SELECT released 0.8 s before this second', ee:1, emb:[1,1,0,0], ev:[], pend:true},
  cable:  {name:'SDI cable pulled at 0.300 s, back at 0.650 s', ee:1, emb:[1,1,0,0], ev:[{t:0.3,type:'sdi',on:false},{t:0.65,type:'sdi',on:true}]},
  boot:   {name:'Power-up at 0.100 s with group 3 stored', ee:3, emb:[1,1,1,0], ev:[{t:0.0,type:'power',on:false},{t:0.1,type:'power',on:true}]},
  f014:   {name:'POD19-014 firmware: the press is ignored', ee:0, emb:[1,1,0,0], ev:[{t:0.2,type:'press',dur:0.15}], fw:'014'},
  bounce: {name:'Two quick presses (0.10 s and 0.40 s): 1 → 2 → 3', ee:1, emb:[1,1,1,1], ev:[{t:0.1,type:'press',dur:0.08},{t:0.4,type:'press',dur:0.08}]},
};
function loadScenario(id){
  const s = SCEN[id]; D.scenario = id;
  D.init = freshInit(s.ee); D.emb = s.emb.map(Boolean); D.fw = s.fw || 'v101';
  if (s.pend){ const g=1; D.init.pod.src=2; D.init.pod.pc=1; D.init.pod.pb=(1<<GRP_BIT[2])|0x60; D.init.dm.group=2; D.init.dm.a3=A3[2]; D.init.dm.a4=A4[2]; D.init.gsA3=A3[2];
    D.init.pod.pf = 0x80|0x40|0x04; D.init.pod.r2 = 0; D.init.pod.r4 = 158; }
  D.events = s.ev.map(e=>Object.assign({scn:true}, e));
  dirty();
}

/* ---------------- event helpers ---------------- */
let EVC = null;
function dirty(){ EMU_KEY=''; EVC=null; }
function evs(type){ if (!EVC){ EVC={}; for (const k of ['press','sdi','power']) EVC[k] = D.events.filter(e=>e.type===k).sort((a,b)=>a.t-b.t); } return EVC[type]; }
function powerAt(t){ let p = D.init.power; for (const e of evs('power')) if (e.t<=t) p=e.on; return p; }
function sdiAt(t){ let p = D.init.sdi; for (const e of evs('sdi')) if (e.t<=t) p=e.on; return p; }
function sdiOnSince(t){ let s = D.init.sdi ? -1 : null; for (const e of evs('sdi')){ if (e.t>t) break; s = e.on ? e.t : null; } return s; }
function btnAt(t){ for (const e of evs('press')){ if (e.t>t) break; if (t<e.t+e.dur) return 1; } return 0; }

/* ================================================================
   EMULATOR — both PICs pass by pass, co-simulated in time order
   ================================================================ */
let EMU = null, EMU_KEY = '';
function emulate(){
  if (EMU_KEY === 'ok' && EMU) return EMU;
  EMU_KEY = 'ok'; EVC = null;
  const CAP = 80000;
  const P = { n:0, t0:new Float64Array(CAP), cyc:new Float32Array(CAP), src:new Uint8Array(CAP), pf:new Uint8Array(CAP), pb:new Uint8Array(CAP), pc:new Uint8Array(CAP),
    r0:new Uint8Array(CAP), r1:new Uint8Array(CAP), r2:new Uint8Array(CAP), r4:new Uint8Array(CAP), inp:new Uint8Array(CAP),
    sdi:new Uint8Array(CAP), sp:new Uint8Array(CAP), lo:new Uint8Array(CAP), sd:new Uint16Array(CAP), wr:new Uint16Array(CAP), busy:new Float32Array(CAP) };
  const M = { n:0, t0:new Float64Array(3000), grp:new Uint8Array(3000), a3:new Uint8Array(3000), lock:new Uint8Array(3000), out:new Uint8Array(3000), lines:new Uint8Array(3000) };
  const dark = [];                   // [t0, t1, kind] PODXX not in main loop
  const did = [];                    // GS9023 audio-DID register changes {t, a3}
  const gsOn = [];                   // GS9023 power-on times
  const eew = [];                    // EEPROM writes {t0, t1, w0, w1, grp}
  const marks = [];                  // notable events for traces {t, k, v}
  let ee = Object.assign({}, D.init.ee);
  const embedded = g => !!D.emb[g-1];
  const lockTime = t0 => { const H = STD[D.std].H; return Math.ceil((t0 + H)/BLOCK)*BLOCK; };   // inferred
  const gsLockAt = t => {
    if (!sdiAt(t)) return 0;
    let a=null, ta=-1; for (let i=did.length-1;i>=0;i--) if (did[i].t<=t){ a=did[i].a3; ta=did[i].t; break; }
    if (a===null) return 0;
    const g = A3G[a]; if (!g || !embedded(g)) return 0;
    const s = sdiOnSince(t); const on = gsOn.filter(x=>x<=t).pop(); const start = Math.max(ta, s===null?0:s, on===undefined?-1:on);
    return (start < 0 || t >= lockTime(start)) ? 1 : 0;
  };
  // power segments
  const pev = evs('power'); const segs = []; let pw = D.init.power, st = 0;
  for (const e of pev){ if (e.on===pw) continue; if (pw) segs.push([st, e.t, st>0 || segs.length>0 || !!pev.find(x=>x.t===0 && x.on) ]); else dark.push([st, e.t, 'off']); pw=e.on; st=e.t; }
  if (pw) segs.push([st, 1.0001, st>0]); else dark.push([st, 1.0001, 'off']);
  let lastPod = null, lastDm = null, gsA3now = D.init.gsA3;
  if (D.init.power) did.push({t:-1, a3:D.init.gsA3});
  for (const [s0, s1, booted] of segs){
    let pod, dm, tp, td;
    if (!booted && s0===0){
      pod = Object.assign({}, D.init.pod); dm = Object.assign({}, D.init.dm); tp = 0; td = 0.00031;   // phase between the two PICs — arbitrary
    } else {
      // power-on: PODXX init clears PORTB/PORTC, waits in powerupdelay, reads the 93LC66, then enters main
      pod = {src:1, pf:0, r0:0, r1:0, r2:128, r4:C.REM4, pb:0, pc:0};
      const tb = s0 + C.BOOT_CYC*TCY; dark.push([s0, tb, 'boot']); tp = tb;
      if (ee.w0>>8 === 0xAA){ pod.src = ee.w1 & 0xFF; pod.pf |= 0x40; }        // read: checks setup1 == 0xAA (twice), source = setup2
      dm = {group:1, a3:0xEF, a4:0x0F, lock:0}; td = s0 + C.DM_BOOT_CYC*TCY;
      gsOn.push(s0); gsA3now = null; marks.push({t:s0, k:'boot'});
    }
    while (true){
      const tn = Math.min(tp, td); if (tn >= s1 || tn > 1.0) break;
      if (tp <= td){
        // ---------------- PODXX pass (19-014.asm / v101.asm main) ----------------
        const btn = btnAt(tp), cd = sdiAt(tp) ? 1 : 0, aes = dm.lock;
        const fw014 = D.fw === '014';
        let cyc = fw014 ? 9 : 13, cS, cP=0, cL, cD=0, cW, busy=0;
        if (cd){ pod.pb = (pod.pb | 0x20) & ~0x10; pod.pb = aes ? (pod.pb|0x40) : (pod.pb & ~0x40); cS = 11; }
        else { pod.pb = (pod.pb & ~0x20 & ~0x40) | 0x10; cS = 9; }
        if (!fw014){
          if (pod.pf & 2) cP = 3;
          else if (!btn){ pod.r0 = 0; cP = 8; }
          else { pod.r0 = (pod.r0+1)&255;
            if (pod.r0) cP = 7;
            else { pod.pf |= 1; pod.pf &= ~2; if (!(pod.pf & 8)) pod.pf &= ~4;
              if (pod.src === 8){ pod.src = 1; cP = 19; } else { pod.src = (pod.src<<1)&255; cP = 20; }   // subwf left C=0, so rlf is a clean shift
              pod.r0 = 0; marks.push({t:tp, k:'ack', v:pod.src}); } }
        }
        const groupN = n => { pod.pb = (pod.pb & 0xF0) | (1<<GRP_BIT[n]); pod.pc = (pod.pc & ~3) | (n-1); pod.src = 1<<(n-1); };
        const groupCheck = () => { if (pod.src & 8){ groupN(4); return 13; } if (pod.src & 4){ groupN(3); return 15; } if (pod.src & 2){ groupN(2); return 17; } groupN(1); return 19; };
        if (!(pod.pf & 0x80)){ pod.pf |= 0x80; cL = 5 + ((pod.pf & 0x40) ? groupCheck() : (groupN(1), 12)); }
        else if (!(pod.pf & 1)) cL = 6;
        else if (pod.pf & 2) cL = 8;
        else cL = 5 + groupCheck();
        if (!fw014){
          if (!(pod.pf & 1)) cD = 3;
          else { pod.pf |= 2;
            if (btn) cD = 6;
            else { pod.r1 = (pod.r1+1)&255;
              if (pod.r1) cD = 8;
              else { pod.pf |= 4; pod.pf &= ~1; pod.pf &= ~2; pod.r1 = 0; pod.r4 = C.REM4; cD = 15; marks.push({t:tp, k:'rel'}); } } }
        }
        if (!(pod.pf & 4)) cW = 3;
        else { pod.r2 = (pod.r2+1)&255;
          if (pod.r2) cW = 5;
          else { pod.r4 = (pod.r4+1)&255;
            if (pod.r4) cW = 7;
            else { // write: write_enable, then eew(0, 0xAAAA), eew(1, source:source); eerwait spins on the 93LC66 busy flag twice
              pod.pf &= ~4; pod.pf &= ~8; const w1 = (pod.src<<8)|pod.src;
              const tw = tp + (cyc + cS + cP + cL + cD + 30)*TCY;
              eew.push({t0:tw, t1:tw + 2*C.TWC + C.EE_CYC*TCY, w0:0xAAAA, w1, grp:Math.log2(pod.src)+1});
              ee = {w0:0xAAAA, w1}; pod.r2 = 0; pod.r4 = C.REM4; cW = C.EE_CYC; busy = 2*C.TWC; marks.push({t:tw, k:'ee', v:w1}); } } }
        cyc += cS + cP + cL + cD + cW;
        const i = P.n++;
        if (i < CAP){ P.t0[i]=tp; P.cyc[i]=cyc; P.src[i]=pod.src; P.pf[i]=pod.pf; P.pb[i]=pod.pb; P.pc[i]=pod.pc; P.r0[i]=pod.r0; P.r1[i]=pod.r1; P.r2[i]=pod.r2; P.r4[i]=pod.r4;
          P.inp[i]=btn|(cd<<1)|(aes<<2); P.sdi[i]=cS; P.sp[i]=cP; P.lo[i]=cL; P.sd[i]=cD; P.wr[i]=cW; P.busy[i]=busy; }
        tp += cyc*TCY + busy;
      } else {
        // ---------------- Demux-1 pass (POD19_DEMUX.asm MAIN) ----------------
        // 1 refreshgs9023: writes addr0, addr3, addr4, addr6 (addr3 at ≈ cycle 25)
        if (dm.a3 !== gsA3now){ gsA3now = dm.a3; did.push({t:td + 25*TCY, a3:dm.a3}); }
        // 2 refreshoutputmux: v1.01 tests PORTE,2 (its own output latch, set by MOVWF PORTE 0xFF) — v1.00 tested PORTC,2 (cd)
        const cd = sdiAt(td);
        dm.out = D.dmfw === 'v101' ? 0 : (cd ? 0 : 2);
        // 3 setgroup (uses the group read on the previous pass)
        const g = dm.group & 8 ? 4 : dm.group & 4 ? 3 : dm.group & 2 ? 2 : 1;
        dm.a3 = A3[g]; dm.a4 = A4[g];
        // 4 readgroupselect: RB7 = LSB (PODXX RC0), RC0 = MSB (PODXX RC1)
        const inPodBoot = dark.some(d=>d[2]==='boot' && td>=d[0] && td<d[1]);
        const code = inPodBoot ? 0 : (pod.pc & 3);
        dm.group = [1,2,4,8][code];
        // 5 readgs9023: addr0 bit 3 → PORTE,1 → "AES" line to the PODXX
        dm.lock = gsLockAt(td + 90*TCY);
        const j = M.n++;
        M.t0[j]=td; M.grp[j]=dm.group; M.a3[j]=dm.a3; M.lock[j]=dm.lock; M.out[j]=dm.out; M.lines[j]=code;
        td += C.DM_CYC*TCY;
      }
    }
    lastPod = pod; lastDm = dm;
  }
  P.n = Math.min(P.n, CAP);
  EMU = { P, M, dark, did, gsOn, eew, marks, eeEnd:ee, gsLockAt, final:{pod:lastPod, dm:lastDm, gsA3:gsA3now} };
  return EMU;
}
function bs(arr, n, t){ let lo=0, hi=n-1; if (n===0 || arr[0]>t) return -1; while(lo<hi){ const m=(lo+hi+1)>>1; if (arr[m]<=t) lo=m; else hi=m-1; } return lo; }
function darkAt(t){ const E=emulate(); for (const d of E.dark) if (t>=d[0] && t<d[1]) return d[2]; return null; }
function podAt(t){ const E=emulate(), P=E.P; if (darkAt(t)) return null; let i=bs(P.t0,P.n,t); if (i<0){ if (P.n && powerAt(t) && P.t0[0]-t<0.001) i=0; else return null; }
  return {i, t0:P.t0[i], cyc:P.cyc[i], src:P.src[i], pf:P.pf[i], pb:P.pb[i], pc:P.pc[i], r0:P.r0[i], r1:P.r1[i], r2:P.r2[i], r4:P.r4[i], inp:P.inp[i], sub:[P.sdi[i],P.sp[i],P.lo[i],P.sd[i],P.wr[i]], busy:P.busy[i]}; }
function dmAt(t){ const E=emulate(), M=E.M; if (!powerAt(t)) return null; let i=bs(M.t0,M.n,t); if (i<0){ if (M.n && M.t0[0]-t<0.002) i=0; else return null; } return {i, t0:M.t0[i], grp:M.grp[i], a3:M.a3[i], lock:M.lock[i], out:M.out[i], lines:M.lines[i]}; }
function gsA3At(t){ const E=emulate(); let a=null; for (const d of E.did){ if (d.t<=t) a=d.a3; else break; } return powerAt(t) ? a : null; }
function gsGroupAt(t){ const a=gsA3At(t); return a===null ? 0 : (A3G[a]||0); }
function gsLock(t){ return powerAt(t) ? emulate().gsLockAt(t) : 0; }
function ledsAt(t){
  const pw = powerAt(t); const p = podAt(t);
  if (!pw || !p) return {pwr:pw?1:0, g:[0,0,0,0], sdi:0, aes:0, err:0};
  const b = p.pb; return {pwr:1, g:[b>>3&1, b&1, b>>1&1, b>>2&1], sdi:b>>5&1, aes:b>>6&1, err:b>>4&1};
}
function groupShown(t){ const L=ledsAt(t); const k=L.g.indexOf(1); return k<0?0:k+1; }
function podStep(t){
  const p = podAt(t); if (!p) return {step:-1, p};
  const c = (t - p.t0)/TCY; const base = D.fw==='014' ? 9 : 13; const o = base/6;
  const lens = [o + p.sub[0], o + p.sub[1], o + p.sub[2], o + p.sub[3], o + p.sub[4]];
  let a=0; for (let k=0;k<5;k++){ a+=lens[k]; if (c < a) return {step:k, p, eeBusy: k===4 && p.busy>0}; } return {step:4, p, eeBusy:p.busy>0};
}
const DM_STEPS = [['refreshgs9023',0,50,'Write addr0, addr3, addr4, addr6 to the GS9023 (A3..A0 on RA3..RA0, data on PORTD, RA5 write strobe)'],
  ['refreshoutputmux',50,58,'Set out1:out0 (RC4:RC3) for the output selector'],
  ['setgroup',58,72,'Turn the group number into the two DID registers (addr3, addr4)'],
  ['readgroupselect',72,82,'Read the group code from the PODXX: RB7 = LSB, RC0 = MSB'],
  ['readgs9023',82,99,'Read addr0; bit 3 = audio lock → PORTE,1 → AES tally line'],
  ['rdelay1 (clrwdt · decfsz delay1)',99,1121,'256 × 4-cycle wait loop, then goto MAIN']];
function dmStep(t){ const d=dmAt(t); if(!d) return {step:-1, d}; const c=(t-d.t0)/TCY; let k=DM_STEPS.findIndex(s=>c>=s[1]&&c<s[2]); if(k<0) k=5; return {step:k, d}; }
const POD_STEPS = [['sdi_check','Carrier detect on RC2 → SDI / ERROR LEDs; RC3 → AES LED'],
  ['switch_press','Count rem0 while RB7 is high; on overflow step source'],
  ['led_output','If a new press (press_flag,0 and not ,1): light group LED, drive RC1:RC0'],
  ['switch_debounce','Wait for release; 256 quiet passes → press_flag,2 (write pending)'],
  ['write','rem2/rem4 count ≈1.7 s of quiet, then write the group to the 93LC66']];

/* ---------------- audio + SDI words ---------------- */
function toneVal(g, ch, n){ return LEVEL * Math.sin(2*Math.PI*TONE_F[g-1][ch]*n/AES_FS); }
function aesSample(k, side, t){ if (!gsLock(t)) return 0; const g=gsGroupAt(t); if(!g) return 0; return toneVal(g, k*2+side, Math.floor(t*AES_FS)); }
function par9(v){ let p=0; for(let i=0;i<8;i++) p^=(v>>i)&1; return p; }
function anc(v8){ const b8=par9(v8); return v8 | (b8<<8) | ((b8^1)<<9); }       // SMPTE 291 8-bit value + even parity + !b8
function hex3(v){ return v.toString(16).toUpperCase().padStart(3,'0'); }
function samplesOnLine(n){ const R = AES_FS*STD[D.std].H; return Math.floor((n+1)*R) - Math.floor(n*R); }
function lineInfo(t){
  const S = STD[D.std]; const n = Math.floor(t/S.H); const w = Math.floor((t - n*S.H)/WORD_T);
  return { n, ln:(n % S.lines)+1, w, ns:samplesOnLine(n), s0:Math.floor(n*AES_FS*S.H) };
}
/* Audio data packet for group g on line n: ADF, DID, DBN, DC, 3 words per sample per channel, CS (SMPTE 272M) */
function audioPacket(g, n){
  const ns = samplesOnLine(n), s0 = Math.floor(n*AES_FS*STD[D.std].H);
  const w = [0x000, 0x3FF, 0x3FF, anc(AUD_DID[g]), anc((n % 255)+1), anc(12*ns)];
  const lbl = ['ADF','ADF','ADF','DID','DBN','DC'];
  for (let k=0;k<ns;k++){ for (let ch=0; ch<4; ch++){
    const sn = s0+k; let v = Math.round(toneVal(g, ch, sn) * 524287); if (v<0) v += 1<<20;
    const z = (sn % 192)===0 ? 1 : 0; const V=0, U=0, Cb = 0;
    const x0 = z | (ch<<1) | ((v & 0x3F)<<3); const x1 = (v>>6) & 0x1FF; let x2 = ((v>>15)&0x1F) | (V<<5) | (U<<6) | (Cb<<7);
    let p=0; for (let b=0;b<9;b++) p ^= (x0>>b)&1; for (let b=0;b<9;b++) p ^= (x1>>b)&1; for (let b=0;b<8;b++) p ^= (x2>>b)&1; x2 |= p<<8;
    const nb = x => x | ((((x>>8)&1)^1)<<9);
    w.push(nb(x0), nb(x1), nb(x2)); lbl.push(`s${k} ch${ch+1} X`, `s${k} ch${ch+1} X+1`, `s${k} ch${ch+1} X+2`); } }
  let cs = 0; for (let i=3;i<w.length;i++) cs = (cs + (w[i] & 0x1FF)) & 0x1FF; w.push(cs | ((((cs>>8)&1)^1)<<9)); lbl.push('CS');
  return {w, lbl, ns};
}
function hancLayout(n){   // packets in the HANC of line n (embedded groups in order) — packing order inferred
  const out = []; let at = STD[D.std].eav;
  for (let g=1; g<=4; g++){ if (!D.emb[g-1]) continue; const len = 7 + 12*samplesOnLine(n); out.push({g, a:at, b:at+len, kind:'audio'}); at += len; }
  const ln = (n % STD[D.std].lines)+1, cl = STD[D.std].ctlLine;
  if (ln === cl || ln === cl + (D.std==='525'?263:312)) for (let g=1; g<=4; g++){ if (!D.emb[g-1]) continue; if (at+18 > STD[D.std].eav+STD[D.std].hanc) break; out.push({g, a:at, b:at+18, kind:'control'}); at += 18; }
  return out;
}

/* ---------------- AES3 frame bits (for the scope) ---------------- */
function aesFrameBits(t, k){
  const n = Math.floor(t*AES_FS), fr = n % 192, out=[];
  for (const side of [0,1]){
    const v = aesSample(k, side, n/AES_FS); let s = Math.round(v*8388607); if (s<0) s += 1<<24;
    const bits = new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    bits[28] = gsLock(t) ? 0 : 1;                              // V — inferred: invalid when not locked
    const cs0 = 0x85; bits[30] = fr<8 ? (cs0>>fr)&1 : 0;      // channel status byte 0 professional, 48 kHz — inferred
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, sample:v, raw:s});
  }
  return {n, fr, sub:out};
}
function biphase(pre, bits, startLevel){
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv=[]; const inv = startLevel?0:1; P.forEach(b=>lv.push(inv?1-b:b)); let cur=lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>60) D.log.length=60; dirty(); SIM.refresh();
}
function clampT(){ return Math.min(SIM.t, 0.9); }
function nextMark(k, t0){ return emulate().marks.find(m=>m.k===k && m.t>=t0); }
const A = {
  press(){
    const t = clampT();
    D.events.push({t, type:'press', dur:D.hold, user:true}); dirty();
    const E = emulate();
    act(`Press SELECT for ${SIM.fmtDur(D.hold)}`, tr=>{
      tr(`SW1 closes at ${SIM.fmtT(t)} → PODXX RB7 reads high (the PODXX treats high as pressed; the 2000 design treated low as pressed)`);
      if (!powerAt(t)){ tr('The unit is off — nothing happens.'); return; }
      if (darkAt(t)==='boot'){ tr('The PODXX is still in powerupdelay — RB7 is not read until main starts.'); }
      if (D.fw==='014'){ tr('POD19-014: main has ;call switch_press and ;call switch_debounce commented out → RB7 is never read. The LEDs stay put.'); return; }
      const ack = nextMark('ack', t);
      if (!ack){ tr('The press was too short or too late to be counted.'); return; }
      const g = Math.log2(ack.v)+1;
      tr(`switch_press: incfsz rem0 on every pass while RB7 = 1; rem0 wraps after 256 passes → press_flag,0 = 1 at ${SIM.fmtT(ack.t)} (${SIM.fmtDur(ack.t-t)} after the press)`);
      tr(`source ${g===1?'0x08 = group 4 → clrf source; bsf source,0':'rlf source → 0x'+ack.v.toString(16).padStart(2,'0')} = group ${g}`);
      tr(`led_output → group_check → group${g}: PORTB bit ${GRP_BIT[g]} lights the group ${g} LED; PORTC RC1:RC0 = ${((g-1)>>1)&1}${(g-1)&1}`);
      const M = E.M; let k = bs(M.t0, M.n, ack.t)+1; while (k<M.n && M.lines[k]!==g-1) k++;
      if (k<M.n){ tr(`Demux-1 readgroupselect at ${SIM.fmtT(M.t0[k])}: RB7/RC0 → group = ${[1,2,4,8][g-1]}; setgroup on the next pass → addr3 = 0x${A3[g].toString(16).toUpperCase()}`); }
      const dw = E.did.find(d=>d.t>ack.t && A3G[d.a3]===g); if (dw) tr(`refreshgs9023 writes addr3 = 0x${A3[g].toString(16).toUpperCase()} to the GS9023 at ${SIM.fmtT(dw.t)} (${SIM.fmtDur(dw.t-ack.t)} after the LED changed)`);
      if (dw){ if (D.emb[g-1]) tr(`The GS9023 finds DID 0x${hex3(anc(AUD_DID[g]))} packets and locks at about ${SIM.fmtT(Math.ceil((dw.t+STD[D.std].H)/BLOCK)*BLOCK)} (next AES block start, ${inf})`); else tr(`Group ${g} is not embedded in this SDI: no DID 0x${hex3(anc(AUD_DID[g]))} packets → addr0 bit 3 stays 0 → AES LED off`); }
      const rel = nextMark('rel', ack.t); if (rel) tr(`switch_debounce: 256 passes with RB7 low after release → press_flag,2 at ${SIM.fmtT(rel.t)}; the EEPROM write follows ≈1.7 s later (rem2 × rem4)`);
    });
    SIM.seek(Math.min(1, t + Math.max(0.02, Math.min(D.hold+0.012, 0.06))));
  },
  sdi(){ const t=clampT(), on=!sdiAt(t);
    D.events.push({t, type:'sdi', on, user:true});
    act(on?'Plug SDI into SDI INPUT':'Unplug SDI INPUT', tr=>{
      tr(on? 'CLC014 equaliser sees a carrier → CD high → PODXX RC2 (and Demux RC2)':'CLC014 loses the carrier → CD low');
      tr(on? 'sdi_check → sdi_valid: bsf portb,5 (SDI), bcf portb,4 (ERROR); AES LED follows RC3':'sdi_check → sdi_error: SDI off, ERROR on, AES off — on the very next 36 µs pass');
      tr(on? `GS9023 re-acquires the selected group's packets; lock at the next AES block (${inf})`:'The GS9023 finds no packets: addr0 bit 3 = 0; the AES outputs go silent ('+inf+')');
      if (D.dmfw==='v100') tr(`Demux v1.00 refreshoutputmux: cd ${on?'high → out1:out0 = 00':'low → out1:out0 = 10'}`);
      else tr('Demux v1.01 refreshoutputmux tests PORTE,2 (its own LED latch), so out1:out0 stays 00 either way — see Findings');
    }); SIM.seek(Math.min(1, t+0.006)); },
  power(){ const t=clampT(), on=!powerAt(t);
    D.events.push({t, type:'power', on, user:true});
    act(on?'Power switch on':'Power switch off', tr=>{
      if (!on){ tr('Rails drop; both PICs stop; the 93LC66 keeps what was last written.'); const p=emulate().eew.filter(e=>e.t0<t); tr(`EEPROM holds: word0 0x${emulate().eeEnd.w0.toString(16).toUpperCase()}${p.length?'':' (no write happened in this second)'}.`); return; }
      tr('PODXX init: TRIS set, PORTB/PORTC cleared (all LEDs off, group lines 00 → the Demux selects group 1)');
      tr(`powerupdelay: two nested incfsz loops on output/output1 — output1 is never initialised, so the wait is up to ${SIM.fmtDur(C.BOOT_CYC*TCY)} (${inf}: RAM = 0)`);
      tr('read: eer(0) → setup1 == 0xAA? → eer(1) → source = setup2 → press_flag,6');
      tr('First led_output pass lights the stored group and drives RC1:RC0; the Demux follows on its next two passes');
    }); SIM.seek(Math.min(1, t + (on?0.17:0.004))); },
  nextSecond(){
    const E = emulate(); const f = E.final; const ini = D.init;
    const pw = powerAt(1), sd = sdiAt(1);
    D.init = { power:pw, sdi:sd, pod: f.pod ? Object.assign({}, f.pod) : ini.pod, dm: f.dm ? Object.assign({}, f.dm, {lock:gsLock(1)}) : ini.dm, gsA3: f.gsA3 || A3[1], ee: Object.assign({}, E.eeEnd) };
    if (!pw){ D.init.pod = freshInit(0).pod; }
    D.events = []; D.scenario = 'carry'; dirty();
    D.log.unshift({t:0, name:'Next second ▸', trace:['Carried the full state at t = 1 s into a new second: PODXX counters (rem2 = '+(f.pod?f.pod.r2:'-')+', rem4 = '+(f.pod?f.pod.r4:'-')+'), press_flag, group, Demux registers, GS9023 DID and the 93LC66 contents.','Your earlier events are gone; the timeline starts at 0 again.']});
    SIM.seek(0);
  },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['Events replaced; both PICs re-emulated from 0 to 1 s.']}); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); dirty(); D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
};

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* POD19-FRONT&REAR(FINAL CURVE) .cdr (2016|49 drafting set, dated Jun.25/14) was converted with Inkscape (libcdr).
   Its black-stroked shapes are the cut-out guides (panel outline, rocker, button, LED and connector holes); the filled
   shapes and thin strokes are the ink. The ink was rendered at 200 dpi and cut between the panel outlines
   (x 93.2–710.2 pt, front green y 59.5, front white y 257.0, rear y 441.3; 115.6 pt high) → 1714 × 321 px.
   Hole centres below come from the cut-out guides: power LED (299.2,217.8); SELECT (808.9,214.5) r 28;
   LEDs at x 910.8 / 980.8 / 1050.8 / 1120.8 (GROUP 1–4) and 1280.8 / 1350.8 / 1420.8 (SDI / AES / ERROR), y 218.1;
   rear D-cut BNCs at x 253.1 / 403.1 / 553.1 / 703.1, y 162.4; XLRs (949.4,156.4) and (1174.5,156.4) r 95;
   IEC inlet 1357–1609 × 33–249. The front legend (GROUP bracket, 1–4, SDI/AES/ERROR, SELECT) sits about 19 pt to the
   right of its holes in the converted file; it was moved back over the holes (see Findings). */
const ASSET = 'siumulation-plugins/assets/';
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod19-front.svg and rear SVG(s)
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD19/POD19-FRONT&REAR(FINAL CURVE) .cdr';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod19-art" ${ART.cdr?'':'checked'}> show the older PNG silks (rasterised from the same CDR in the first build)</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod19-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
const LX = [910.8, 980.8, 1050.8, 1120.8], TX = [1280.8, 1350.8, 1420.8];
function frontSVG(t, opts){
  opts = opts||{};
  const L = ledsAt(t), down = btnAt(t) && powerAt(t);
  const led = (x, on, col)=>`<circle cx="${x}" cy="218.1" r="15" fill="#060707"/><circle cx="${x}" cy="218.1" r="10.5" fill="${on?col:'#271d1d'}" ${on?'filter="url(#p19glow)"':''}/>${on?`<circle cx="${x-3}" cy="215" r="3.5" fill="#fff" opacity=".5"/>`:''}`;
  const red='#ff3b2f', grn='#4dff5a', amb='#ffb43a';
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD19 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p19glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#141517"/>
    ${ART.cdr ? `<image href="${ASSET}pod19-front.svg" width="1714" height="321"/>` : `<image href="${ASSET}pod19-front-green.png" width="1714" height="321"/>
    <image href="${ASSET}pod19-front-white.png" width="1714" height="321"/>`}
    <g class="p19pwr" style="cursor:pointer"><title>Power rocker (click, or P)</title><rect x="130" y="56" width="100" height="150" rx="8" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
      <rect x="142" y="${L.pwr?70:124}" width="76" height="66" rx="6" fill="#1b1d20" stroke="#3a3e42"/><text x="180" y="${L.pwr?110:164}" text-anchor="middle" font-size="22" fill="#777">${L.pwr?'I':'O'}</text></g>
    <circle cx="299.2" cy="217.8" r="15" fill="#060707"/><circle cx="299.2" cy="217.8" r="10.5" fill="${L.pwr?'#e9ff7a':'#262a1c'}" ${L.pwr?'filter="url(#p19glow)"':''}/>
    <g class="p19sel" style="cursor:pointer"><title>SELECT step switch SW1 → PODXX RB7 (click, or S)</title>
      <circle cx="808.9" cy="214.5" r="44" fill="transparent"/><circle cx="808.9" cy="214.5" r="29" fill="#050606" stroke="#2c2f32" stroke-width="3"/>
      <circle cx="808.9" cy="${down?216.5:214.5}" r="${down?19:22}" fill="${down?'#141617':'#1d2022'}" stroke="#3b3f43" stroke-width="2"/></g>
    ${LX.map((x,i)=>led(x, L.g[i], red)).join('')}
    ${led(TX[0], L.sdi, grn)}${led(TX[1], L.aes, grn)}${led(TX[2], L.err, amb)}
    <circle cx="50.3" cy="160.6" r="11" fill="#3a3d40"/><circle cx="1663.9" cy="160.6" r="11" fill="#3a3d40"/>
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const on = powerAt(t), sdi = sdiAt(t), lk = gsLock(t), g = gsGroupAt(t);
  const outTxt = !on ? 'unit off' : !lk ? 'no audio (GS9023 not locked; silent — '+'inferred)' : `AES3 48 kHz from group ${g}`;
  const bnc = (x, plug, id, tip, live)=>`<g ${id?`class="p19j" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title>
      <path d="M${x-45} ${162.4-41} h90 v82 a45 51 0 0 1 -90 0 z" fill="#0b0c0d" opacity="0"/>
      <circle cx="${x}" cy="162.4" r="48" fill="#1a1b1c"/><circle cx="${x}" cy="162.4" r="38" fill="#b9bcc0" stroke="#6d7175" stroke-width="3"/><circle cx="${x}" cy="162.4" r="25" fill="#d6c27c"/><circle cx="${x}" cy="162.4" r="8" fill="#7a5f12"/>
      ${plug?`<rect x="${x-24}" y="133" width="48" height="58" rx="8" fill="#3a74b8"/><rect x="${x-16}" y="186" width="32" height="135" fill="#2b5f9e"/>`:''}
      ${live!==undefined?`<circle cx="${x+50}" cy="112" r="8" fill="${live?'var(--accent)':'#555'}"/>`:''}</g>`;
  const xlr = (x, tip, live)=>`<g><title>${tip}</title><circle cx="${x}" cy="156.4" r="95" fill="#0d0e0f"/><circle cx="${x}" cy="156.4" r="78" fill="#a9adb1" stroke="#5d6165" stroke-width="4"/><circle cx="${x}" cy="156.4" r="60" fill="#202224"/>
      ${[[-22,-14],[22,-14],[0,24]].map(([dx,dy])=>`<circle cx="${x+dx}" cy="${156.4+dy}" r="8" fill="#c9cdd2"/>`).join('')}<rect x="${x-10}" y="${156.4-84}" width="20" height="14" fill="#5d6165"/>
      <circle cx="${x+70}" cy="80" r="8" fill="${live?'var(--accent)':'#555'}"/></g>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD19 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#141517"/>${ART.cdr ? `<image href="${ASSET}pod19-rear.svg" width="1714" height="321"/>` : ''}
    ${bnc(253.1, false, null, 'OUTPUT 1 — AES1 75 Ω unbalanced (Demux-1 AESOUT1). '+outTxt, on&&lk)}
    ${bnc(403.1, false, null, 'OUTPUT 2 — AES2 75 Ω unbalanced (Demux-1 AESOUT2). '+outTxt, on&&lk)}
    ${bnc(553.1, false, null, 'SDI OUTPUT — re-clocked (CLC016 → CLC007 cable driver). '+(on&&sdi?'270 Mb/s':'no signal'), on&&sdi)}
    ${bnc(703.1, sdi, 'sdi', `SDI INPUT — 75 Ω (CLC014 equaliser). ${sdi?'Click to unplug':'Click to plug in'} (or D)`)}
    ${[[874.4,61.4],[1024.4,252.6],[1099.4,61.4],[1249.4,252.6]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/>`).join('')}
    ${xlr(949.4, 'AES 1 — XLR, 110 Ω balanced (PODXX DS75176 + PE65612). '+outTxt, on&&lk)}${xlr(1174.5, 'AES 2 — XLR, 110 Ω balanced. '+outTxt, on&&lk)}
    <g><title>IEC inlet with fuse: 115 VAC, 1/2 A S.B.</title><rect x="1357" y="33" width="252" height="216" rx="10" fill="#0b0c0d" stroke="#2e3134" stroke-width="2"/><rect x="1380" y="58" width="80" height="166" rx="5" fill="#16181a"/><rect x="1476" y="70" width="114" height="142" rx="10" fill="#050606"/>
      ${[[1508,104],[1558,104],[1533,176]].map(([x,y])=>`<rect x="${x-10}" y="${y-14}" width="20" height="28" fill="#c9cdd2"/>`).join('')}</g>
    <circle cx="1664" cy="50.8" r="11" fill="#2a2c2e"><title>Unlabelled 8 pt hole on the 2014 artwork</title></circle>
    ${[[50.3,160.5],[1663.9,160.5]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="#8f9295" stroke="#55585b" stroke-width="2"/>`).join('')}
    ${ART.cdr ? '' : `<image href="${ASSET}pod19-rear-white.png" width="1714" height="321"/>`}
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p19sel').forEach(g=>g.addEventListener('click', ()=>A.press()));
  root.querySelectorAll('.p19pwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p19j').forEach(g=>g.addEventListener('click', ()=>A.sdi()));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <button data-a="press">Press SELECT</button>
    <label class="small">held <select class="p19hold">${[[0.005,'5 ms (too short)'],[0.06,'60 ms'],[0.15,'150 ms'],[0.4,'400 ms']].map(([v,l])=>`<option value="${v}" ${v===D.hold?'selected':''}>${l}</option>`).join('')}</select></label>
    <button data-a="sdi">SDI cable</button><button data-a="power">Power</button><button data-a="next" title="Carry the state at 1 s into a fresh second">Next second ▸</button>
    <span class="small muted">Keys: S select · D SDI · P power · N next second</span></div>
    <div class="small muted" style="margin-top:4px">Actions land at the playhead and the playhead then moves a little forward so you can see the result. Click the rear SDI INPUT BNC to plug or unplug the cable.</div>`;
}
function settingsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center">
    <label class="small">Scenario <select class="p19scn">${D.scenario==='carry'?'<option selected>(carried over from the last second)</option>':''}${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label>
    <button class="p19clr">Clear my actions</button>
    <label class="small">PODXX firmware <select class="p19fw"><option value="v101" ${D.fw==='v101'?'selected':''}>PODXX v1.01 (PIC16F73, 2002)</option><option value="014" ${D.fw==='014'?'selected':''}>POD19-014 (2004 custom)</option></select></label>
    <label class="small">Demux-1 firmware <select class="p19dfw"><option value="v101" ${D.dmfw==='v101'?'selected':''}>v1.01 (PIC16F874)</option><option value="v100" ${D.dmfw==='v100'?'selected':''}>v1.00 (PIC16C73A)</option></select></label>
    <label class="small">SDI standard <select class="p19std">${Object.keys(STD).map(k=>`<option value="${k}" ${k===D.std?'selected':''}>${STD[k].name}</option>`).join('')}</select></label>
    <span class="small">Groups embedded in the SDI: ${[1,2,3,4].map(g=>`<label><input type="checkbox" class="p19emb" data-g="${g}" ${D.emb[g-1]?'checked':''}> ${g}</label>`).join(' ')}</span></div>`;
}
function bindControls(m){
  const map = {press:()=>A.press(), sdi:()=>A.sdi(), power:()=>A.power(), next:()=>A.nextSecond()};
  m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>map[b.dataset.a]());
  m.querySelectorAll('.p19hold').forEach(s=>s.onchange=e=>{ D.hold=+e.target.value; });
  m.querySelectorAll('.p19scn').forEach(s=>s.onchange=e=>{ if (SCEN[e.target.value]) A.scenario(e.target.value); });
  m.querySelectorAll('.p19clr').forEach(b=>b.onclick=()=>A.clear());
  m.querySelectorAll('.p19fw').forEach(s=>s.onchange=e=>{ D.fw=e.target.value; dirty(); D.log.unshift({t:SIM.t,name:'PODXX firmware → '+(D.fw==='014'?'POD19-014':'v1.01'),trace:[D.fw==='014'?'main: ;call switch_press / ;call switch_debounce — the pass shrinks from 44 to 29 cycles and RB7 is never read.':'main calls switch_press and switch_debounce again.']}); SIM.refresh(); });
  m.querySelectorAll('.p19dfw').forEach(s=>s.onchange=e=>{ D.dmfw=e.target.value; dirty(); SIM.refresh(); });
  m.querySelectorAll('.p19std').forEach(s=>s.onchange=e=>{ D.std=e.target.value; dirty(); SIM.refresh(); });
  m.querySelectorAll('.p19emb').forEach(c=>c.onchange=e=>{ D.emb[+c.dataset.g-1]=c.checked; dirty(); SIM.refresh(); });
}
document.addEventListener('keydown', e=>{
  if (!window.__pod19Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase(); const m = {s:()=>A.press(), d:()=>A.sdi(), p:()=>A.power(), n:()=>A.nextSecond()};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const E = emulate(), S = STD[D.std], css = n=>SIM.css(n);
  const txt = (c,s,x,y)=>{ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const sample = (c,X,t0,t1,y,h,fn,col)=>{ const N=Math.min(900,Math.max(80,(X(t1)-X(t0))/1.5)); const sp=(t1-t0)/N; c.fillStyle=col; for(let i=0;i<N;i++){ const tt=t0+sp*(i+.5); if (fn(tt)) c.fillRect(X(t0+sp*i), y, X(t0+sp*(i+1))-X(t0+sp*i)+0.5, h); } };
  const segs = (c,X,t0,t1,y,h,fn,colFn,lblFn)=>{ const N=Math.min(900,Math.max(80,(X(t1)-X(t0))/1.5)); const sp=(t1-t0)/N; let prev=undefined, xs=X(t0);
    const flush=(v,xa,xb)=>{ if (v===null||v===undefined) return; c.fillStyle=colFn(v); c.globalAlpha=.75; c.fillRect(xa,y+3,xb-xa,h-6); c.globalAlpha=1; if (xb-xa>40 && lblFn){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(lblFn(v), xa+3, y+h/2+3); } };
    for (let i=0;i<=N;i++){ const tt=t0+sp*(i+.5); const v = i<N ? fn(tt) : Symbol(); if (v!==prev){ flush(prev, xs, X(t0+sp*i)); prev=v; xs=X(t0+sp*i); } } };
  const ls = [];
  ls.push({label:'Power · PODXX boot', h:22, draw(c,X,t0,t1,y,h){
    for (const d of E.dark){ if (d[1]<t0||d[0]>t1) continue; c.fillStyle = d[2]==='off'? css('--ink2') : css('--warn'); c.globalAlpha=.45; c.fillRect(X(Math.max(t0,d[0])),y+3,X(Math.min(t1,d[1]))-X(Math.max(t0,d[0])),h-6); c.globalAlpha=1;
      txt(c, d[2]==='off'?'power off':'powerupdelay (output1 never cleared) → read EEPROM', X(Math.max(t0,d[0]))+4, y+h/2+4); }
    if (!E.dark.length) txt(c, 'running since before t = 0', X(t0)+6, y+h/2+4); }});
  ls.push({label:`SDI in: ${S.name}`, h:30, draw(c,X,t0,t1,y,h){
    const span=t1-t0, pw=X(t1)-X(t0);
    sample(c,X,t0,t1,y+h-6,4,tt=>!sdiAt(tt),css('--bad'));
    if (span > 40*S.H){ SIM.pulses(c,X,t0,t1,y,h-8,S.field,0,20*S.H,css('--accent2'),'fields'); if (span < 3000*S.H) SIM.pulses(c,X,t0,t1,y+(h-8)*0.55,(h-8)*0.45,S.H,0,S.H*S.eav/S.words,css('--ink2'),'lines (EAV)'); return; }
    const n0=Math.floor(t0/S.H), n1=Math.floor(t1/S.H);
    for (let n=n0;n<=n1;n++){ const tl=n*S.H; if(!sdiAt(tl)) continue;
      c.fillStyle=css('--ink2'); c.fillRect(X(tl), y+2, Math.max(1,X(tl+S.eav*WORD_T)-X(tl)), h-10);
      for (const p of hancLayout(n)){ c.fillStyle = p.g===gsGroupAt(tl)? css('--accent') : css('--accent2'); c.globalAlpha = p.kind==='control'?.45:.8; c.fillRect(X(tl+p.a*WORD_T), y+2, Math.max(1,X(tl+p.b*WORD_T)-X(tl+p.a*WORD_T)), h-10); c.globalAlpha=1;
        if (X(tl+p.b*WORD_T)-X(tl+p.a*WORD_T) > 34){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(`G${p.g} ${p.kind==='control'?'ctl':samplesOnLine(n)+'smp'}`, X(tl+p.a*WORD_T)+2, y+h/2); } }
      const sav=tl+(S.eav+S.hanc)*WORD_T; c.fillStyle=css('--ink2'); c.fillRect(X(sav), y+2, Math.max(1,X(sav+4*WORD_T)-X(sav)), h-10);
      c.globalAlpha=.12; c.fillRect(X(sav+4*WORD_T), y+2, X(tl+S.H)-X(sav+4*WORD_T), h-10); c.globalAlpha=1; }
    if (pw/((n1-n0+1)) > 120) txt(c, 'EAV · HANC audio packets (green = the group being demuxed) · SAV · active video', X(t0)+6, y+h-1); }});
  ls.push({label:'CLC014 carrier detect (CD)', h:18, draw(c,X,t0,t1,y,h){ sample(c,X,t0,t1,y+4,h-8,tt=>sdiAt(tt)&&powerAt(tt),css('--accent')); }});
  ls.push({label:'SW1 SELECT → PODXX RB7', h:18, draw(c,X,t0,t1,y,h){ sample(c,X,t0,t1,y+4,h-8,tt=>btnAt(tt),css('--warn')); }});
  ls.push({label:'PODXX PIC16F73 main loop', h:30, draw(c,X,t0,t1,y,h){
    const P=E.P; const pxPass=(X(t0+44*TCY)-X(t0));
    if (pxPass > 50){ let i=Math.max(0,bs(P.t0,P.n,t0)); const cols=[css('--accent'),css('--accent2'),css('--warn'),css('--accent2'),css('--bad')];
      for (; i<P.n && P.t0[i]<=t1; i++){ const base=(D.fw==='014'?9:13)/6; let tt=P.t0[i];
        const sub=[P.sdi[i],P.sp[i],P.lo[i],P.sd[i],P.wr[i]];
        sub.forEach((s,k)=>{ const d=(base+s)*TCY + (k===4?P.busy[i]:0); c.fillStyle=cols[k]; c.globalAlpha=k%2?.55:.8; c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-1),h-6); c.globalAlpha=1;
          if (X(tt+d)-X(tt)>64){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(POD_STEPS[k][0], X(tt)+3, y+h/2+3); } tt+=d; }); }
    } else { sample(c,X,t0,t1,y+3,h-6,tt=>!darkAt(tt)&&powerAt(tt),css('--accent')); c.globalAlpha=1;
      const i0=Math.max(0,bs(P.t0,P.n,t0)), i1=Math.max(0,bs(P.t0,P.n,t1)); txt(c, `${(i1-i0).toLocaleString()} passes in view (${Math.round((D.fw==='014'?29:44))} cycles ≈ ${SIM.fmtDur((D.fw==='014'?29:44)*TCY)} each @ 4.9152 MHz)`, X(t0)+6, y+h/2+4); }
    for (const w of E.eew){ if (w.t1<t0||w.t0>t1) continue; c.fillStyle=css('--bad'); c.globalAlpha=.6; c.fillRect(X(w.t0),y+3,Math.max(2,X(w.t1)-X(w.t0)),h-6); c.globalAlpha=1; txt(c,'EEPROM write (eerwait)', X(w.t0)+3, y+11); } }});
  ls.push({label:'press_flag ,0 new ,1 held ,2 write', h:26, draw(c,X,t0,t1,y,h){
    const P=E.P; const f=(tt,b)=>{ const i=bs(P.t0,P.n,tt); return i>=0 && !darkAt(tt) && ((P.pf[i]>>b)&1); };
    sample(c,X,t0,t1,y+2,6,tt=>f(tt,0),css('--accent')); sample(c,X,t0,t1,y+10,6,tt=>f(tt,1),css('--warn')); sample(c,X,t0,t1,y+18,6,tt=>f(tt,2),css('--bad')); }});
  ls.push({label:'Group code RC1:RC0 → Demux RC0:RB7', h:22, draw(c,X,t0,t1,y,h){
    segs(c,X,t0,t1,y,h,tt=>{ if(!powerAt(tt)) return null; if (darkAt(tt)) return 0; const p=podAt(tt); return p? (p.pc&3) : 0; }, v=>[css('--accent'),css('--accent2'),css('--warn'),css('--bad')][v], v=>`${(v>>1)&1}${v&1} = group ${v+1}`); }});
  ls.push({label:'Demux-1 PIC16F874 main loop', h:30, draw(c,X,t0,t1,y,h){
    const M=E.M; const pxPass=X(t0+C.DM_CYC*TCY)-X(t0);
    if (pxPass > 30){ let i=Math.max(0,bs(M.t0,M.n,t0)); for(; i<M.n && M.t0[i]<=t1; i++){ DM_STEPS.forEach((s,k)=>{ const a=M.t0[i]+s[1]*TCY, b=M.t0[i]+s[2]*TCY; c.fillStyle = k===5? css('--grid') : k===0? css('--accent2') : k===4? css('--warn') : css('--accent'); c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-0.5),h-6);
        if (X(b)-X(a)>70){ c.fillStyle=k===5?css('--ink2'):'#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' ')[0], X(a)+3, y+h/2+3); } }); } }
    else { sample(c,X,t0,t1,y+3,h-6,tt=>powerAt(tt),css('--accent2')); const i0=Math.max(0,bs(M.t0,M.n,t0)), i1=Math.max(0,bs(M.t0,M.n,t1)); txt(c, `${i1-i0} passes (1123 cycles ≈ ${SIM.fmtDur(C.DM_CYC*TCY)}; 91 % is the rdelay1 loop)`, X(t0)+6, y+h/2+4); } }});
  ls.push({label:'GS9023 addr3 (audio DID)', h:22, draw(c,X,t0,t1,y,h){
    segs(c,X,t0,t1,y,h,tt=>{ const a=gsA3At(tt); return a===null?null:a; }, a=>[css('--accent'),css('--accent2'),css('--warn'),css('--bad')][(A3G[a]||1)-1], a=>`0x${a.toString(16).toUpperCase()} → DID ${hex3(anc(AUD_DID[A3G[a]]))} (G${A3G[a]})`); }});
  ls.push({label:'GS9023 lock (addr0 bit 3)', h:18, draw(c,X,t0,t1,y,h){ sample(c,X,t0,t1,y+4,h-8,tt=>gsLock(tt),css('--accent')); }});
  for (let k=0;k<2;k++) ls.push({label:`AES${k+1} out (ch ${2*k+1}/${2*k+2})`, h:32, draw(c,X,t0,t1,y,h){
    const span=t1-t0, pw=X(t1)-X(t0), cols=[css('--accent'),css('--bad')];
    [0,1].forEach(sd=>{ const g0=gsGroupAt(t0); const f = g0? TONE_F[g0-1][2*k+sd] : 1000;
      if (span*f > pw/3){ c.fillStyle=cols[sd]; c.globalAlpha=.3; const N=Math.min(600,pw); for(let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (gsLock(tt)) c.fillRect(X(t0)+pw*i/N, y+h/2-LEVEL*10*(h/2-3), pw/N+0.5, 2*LEVEL*10*(h/2-3)); } c.globalAlpha=1; return; }
      c.strokeStyle=cols[sd]; c.lineWidth=1; c.beginPath(); const N=Math.min(1400,Math.max(200,pw*2)); for(let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=aesSample(k,sd,tt)*10; const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    if (span*48000 < pw/6) SIM.pulses(c,X,t0,t1,y+h-4,4,1/AES_FS,0,0.15/AES_FS,css('--ink2'),'frames'); }});
  ls.push({label:'AES blocks (Z preamble, 4 ms)', h:16, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,BLOCK,0,1/AES_FS,css('--warn'),'blocks'); }});
  ls.push({label:'93LC66 (CS · DI · CLK)', h:18, draw(c,X,t0,t1,y,h){
    let any=false; for (const w of E.eew){ any=true; if (w.t1<t0||w.t0>t1) continue; c.fillStyle=css('--bad'); c.fillRect(X(w.t0),y+3,Math.max(2,X(w.t1)-X(w.t0)),h-6); txt(c, `WRITE addr0 0xAAAA, addr1 0x${w.w1.toString(16).toUpperCase().padStart(4,'0')} (group ${w.grp})`, Math.min(X(w.t1)+4, X(t1)-300), y+h/2+4); }
    if (!any) txt(c, 'idle (the boot read is inside the power-up block)', X(t0)+6, y+h/2+4); }});
  ls.push({label:'Front LEDs: 1 2 3 4 · SDI AES ERR', h:44, draw(c,X,t0,t1,y,h){
    const rows=[[tt=>ledsAt(tt).g[0],'#e3453a'],[tt=>ledsAt(tt).g[1],'#e3453a'],[tt=>ledsAt(tt).g[2],'#e3453a'],[tt=>ledsAt(tt).g[3],'#e3453a'],[tt=>ledsAt(tt).sdi,'#3fbf5f'],[tt=>ledsAt(tt).aes,'#3fbf5f'],[tt=>ledsAt(tt).err,'#e8a23a']];
    rows.forEach(([fn,col],r)=>sample(c,X,t0,t1,y+2+r*6,5,fn,col)); }});
  return ls;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press SELECT, plug or unplug the SDI cable, or switch the power. The firmware path is listed here with emulated times.</div>'; }
function inspectorHTML(t){
  const E=emulate(), ps=podStep(t), p=ps.p, ds=dmStep(t), d=ds.d, L=ledsAt(t), g=gsGroupAt(t), li=lineInfo(t);
  const dk = darkAt(t);
  return `<table class="kv">
    <tr><th>Power</th><td class="mono">${powerAt(t)?'on':'off'}${dk==='boot'?' · PODXX in powerupdelay':''}</td></tr>
    <tr><th>PODXX pass</th><td class="mono">${p?`#${p.i.toLocaleString()} · ${POD_STEPS[ps.step][0]}${ps.eeBusy?' (eerwait)':''} · ${p.cyc} cycles`:'—'}</td></tr>
    <tr><th>source · press_flag</th><td class="mono">${p?`0x${p.src.toString(16).padStart(2,'0')} (group ${Math.log2(p.src)+1}) · ${p.pf.toString(2).padStart(8,'0')}b`:'—'}</td></tr>
    <tr><th>rem0 · rem1 · rem2 · rem4</th><td class="mono">${p?`${p.r0} · ${p.r1} · ${p.r2} · ${p.r4}`:'—'}</td></tr>
    <tr><th>PORTB · PORTC</th><td class="mono">${p?`${p.pb.toString(2).padStart(8,'0')}b · RC1:RC0 = ${(p.pc>>1)&1}${p.pc&1}`:'—'}</td></tr>
    <tr><th>Demux-1 pass</th><td class="mono">${d?`#${d.i} · ${DM_STEPS[ds.step][0]}`:'—'}</td></tr>
    <tr><th>Demux group · addr3/addr4</th><td class="mono">${d?`${d.grp.toString(2).padStart(4,'0')}b · 0x${d.a3.toString(16).toUpperCase()} / 0x${A4[A3G[d.a3]].toString(16).toUpperCase().padStart(2,'0')} · out1:out0 = ${(d.out>>1)&1}${d.out&1}`:'—'}</td></tr>
    <tr><th>GS9023</th><td class="mono">${g?`DID ${hex3(anc(AUD_DID[g]))} (group ${g}) · ${gsLock(t)?'locked':'<span style="color:var(--warn)">not locked</span>'}`:'—'}</td></tr>
    <tr><th>SDI</th><td class="mono">${sdiAt(t)?`line ${li.ln} · word ${li.w} · ${li.ns} samples/ch on this line`:'no cable'}</td></tr>
    <tr><th>AES frame</th><td class="mono">${Math.floor(t*AES_FS).toLocaleString()} · ${Math.floor(t*AES_FS)%192}/191 of block</td></tr>
    <tr><th>93LC66</th><td class="mono">word0 0x${(E.eew.filter(w=>w.t1<=t).pop()||{w0:D.init.ee.w0}).w0.toString(16).toUpperCase()} · word1 0x${(E.eew.filter(w=>w.t1<=t).pop()||{w1:D.init.ee.w1}).w1.toString(16).toUpperCase().padStart(4,'0')}</td></tr>
    <tr><th>LEDs</th><td class="mono">GROUP ${L.g.map((v,i)=>v?i+1:'·').join(' ')} · SDI ${L.sdi?'●':'○'} AES ${L.aes?'●':'○'} ERROR ${L.err?'●':'○'}</td></tr></table>`;
}
function viewSim(m){
  window.__pod19Active = true;
  m.innerHTML = `
  ${card('Setup', settingsHTML())}
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead', `<div id="fp"></div>${controlsHTML()}`)}
      ${card('Rear panel — click SDI INPUT to plug or unplug', `<div id="rp"></div>${artNote()}`)}
    </div>
    <div>
      ${card('What the firmware did (emulated, last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">Both PICs are emulated pass by pass from their source. Pass lengths are counted instructions at 4.9152 MHz (813.8 ns per cycle): 44 cycles for the PODXX idle pass, 1123 for the Demux-1 pass. The GS9023 lock time, the HANC packet order and the 93LC66 write time are ${inf}.</p>`)}
  <div class="grid2">
    ${card('Scope: AES1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('SDI at the playhead: the audio data packet the GS9023 is looking for', `<div id="pkt" class="small"></div>`)}
  </div>
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
    m.querySelector('#pkt').innerHTML = packetHTML(t);
  };
  bindControls(m);
  SIM.on('time', draw);
}
function packetHTML(t){
  const g = gsGroupAt(t) || 1, li = lineInfo(t);
  if (!sdiAt(t)) return '<p class="muted">No SDI cable: nothing to show.</p>';
  if (!D.emb[g-1]) return `<p>The GS9023 is set to group ${g} (DID ${hex3(anc(AUD_DID[g]))}), but this SDI carries ${D.emb.map((e,i)=>e?'group '+(i+1):null).filter(Boolean).join(' and ')||'no audio'}. No packet matches, so the lock bit stays 0 and the AES LED is off.</p>`;
  const pk = audioPacket(g, li.n); const lay = hancLayout(li.n).find(p=>p.g===g && p.kind==='audio');
  const inPk = lay && li.w>=lay.a && li.w<lay.b ? li.w-lay.a : -1;
  return `<p>Line ${li.ln}, group ${g}: ${pk.ns} samples × 4 channels × 3 words + 7 = ${pk.w.length} words, HANC words ${lay.a}–${lay.b-1} after EAV (${SIM.fmtDur(pk.w.length*WORD_T)} on the wire). ${inPk>=0?'<b>The playhead is inside this packet.</b>':'Drag to a finer zoom to land inside it.'}</p>
    <div class="scroll" style="max-height:220px"><table class="kv mono"><tr><th>#</th><th>word</th><th>b9 b8 | b7…b0</th><th>meaning</th></tr>${pk.w.map((w,i)=>`<tr class="${i===inPk?'hl':''}"><td>${i}</td><td>${hex3(w)}</td><td>${(w>>9)&1} ${(w>>8)&1} | ${(w&255).toString(2).padStart(8,'0')}</td><td>${pk.lbl[i]}</td></tr>`).join('')}</table></div>
    <p class="small muted">Words follow SMPTE 272M: X carries Z, the channel number and audio bits 0–5; X+1 bits 6–14; X+2 bits 15–19, V, U, C and P. The tone values come from the simulated test source (${inf}).</p>`;
}
function drawScope(cv, bitsEl, t){
  const F = aesFrameBits(t, 0); const {c,w} = SIM.canvas(cv, 150);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  if (!powerAt(t)){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('Unit off — no output', 12, 70); bitsEl.innerHTML=''; return; }
  const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase(F.sub[1].pre, F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB); const cw = (w-20)/lv.length;
  const zones = [[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio 20 bits'],[56,64,a2,'VUCP']];
  [0,64].forEach(off=> zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw, 20, (b-a)*cw, 70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>24) c.fillText(lb, 12+(off+a)*cw, 104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?30:80; if(i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${F.sub[0].pre})`, 12, 14); c.fillText('Subframe B (Y)', 12+64*cw, 14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of block · cell ${SIM.fmtDur(1/(AES_FS*128))} · frame ${SIM.fmtDur(1/AES_FS)}`, 10, 130);
  const fmt = s=>s.bits.slice(4,28).reverse().join('');
  bitsEl.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} ${s.sample.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} (${fmt(s)}) V=${s.bits[28]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>') +
    `<br><span class="muted">The GS9023 re-creates AES3 from the 20-bit embedded samples (4 LSBs zero). Channel-status and V-bit handling are ${inf}.</span>`;
}

/* ---------------- tutorial ---------------- */
const pressCount = ()=> D.events.filter(e=>e.type==='press' && e.user).length;
const LESSONS = [
  {title:'Meet the POD19', body:`<p>The POD19 is a half-rack <b>SDI audio de-embedder</b> (the manual calls it a demuxer). A 270 Mb/s SDI video signal can carry up to four <b>groups</b> of embedded audio, each with four channels. The POD19 takes out <b>one group</b> and delivers it as two AES signals: AES 1 (channels 1/2) and AES 2 (channels 3/4), on XLRs and BNCs. The video passes straight through to SDI OUTPUT, re-clocked.</p>
     <p>On the front: the power rocker, the <b>SELECT</b> step switch, four <b>GROUP</b> LEDs and three tallies: <b>SDI</b>, <b>AES</b> and <b>ERROR</b>.</p><p class="muted">Inside are two small PICs that talk over four wires: the PODXX board (switch, LEDs, EEPROM, XLR drivers) and the Demux-1 module (the Gennum GS9023 that does the extraction). Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and SDI', body:`<p>Turn the unit on and feed SDI into <b>SDI INPUT</b> on the rear. The <b>SDI</b> tally lights and <b>ERROR</b> goes out.</p><p>The PODXX checks the SDI carrier on every pass of its main loop, about every 36 µs, so the tallies follow the cable almost instantly.</p><p><b>Goal:</b> SDI on and ERROR off at the playhead.</p>`, check:()=>{ const L=ledsAt(SIM.t); return L.sdi && !L.err; }, hint:'Load the “Steady” scenario, or click the SDI INPUT BNC on the rear panel and the power rocker if needed.'},
  {title:'2 · Read the AES tally', body:`<p><b>AES</b> means the selected group really carries audio and the de-embedder has locked to it. This source carries groups 1 and 2.</p><p><b>Goal:</b> AES on, with group 1 lit.</p>`, check:()=>{ const L=ledsAt(SIM.t); return L.aes && L.g[0]; }, hint:'Choose the “Steady” scenario and put the playhead anywhere.'},
  {title:'3 · Step to group 2', body:`<p><b>Press SELECT</b> once. The firmware waits until the switch has read “pressed” on 256 passes in a row (about 9 ms) before it counts the press. Then it moves to the next group, lights that LED and sends the new group number to the Demux-1 module on two wires.</p><p>Look at the timeline. The Demux-1 picks up the new code on its next pass. One pass later it writes the new DID to the GS9023, and the GS9023 locks to the group 2 packets.</p><p><b>Goal:</b> group 2 lit with AES on.</p>`, check:()=>{ const L=ledsAt(SIM.t); return L.g[1] && L.aes; }, hint:'Press S (or click SELECT). The playhead jumps forward a few ms. If AES is still off, step forward a few ms more.'},
  {title:'4 · An empty group', body:`<p>Press SELECT again to reach <b>group 3</b>. This SDI has no group 3 audio, so the GS9023 never finds packets with DID 1FB and the <b>AES</b> tally stays dark. Both AES outputs go silent (${inf}).</p><p><b>Goal:</b> group 3 lit, AES off.</p>`, check:()=>{ const L=ledsAt(SIM.t); return L.g[2] && !L.aes && L.sdi; }, hint:'Press SELECT once more; tick group 3 off in “Groups embedded” if you turned it on.'},
  {title:'5 · Wrap around', body:`<p>Keep pressing: 3 → 4 → 1. After group 4 the code does <span class="mono">clrf source; bsf source,0</span> and starts again at group 1.</p><p><b>Goal:</b> back on group 1, after at least four presses of your own.</p>`, check:()=>ledsAt(SIM.t).g[0] && pressCount()>=4, hint:'Press SELECT until group 1 lights again. If the playhead is near the end of the second, click “Next second ▸” first.'},
  {title:'6 · Let it remember', body:`<p>The manual says the POD19 remembers its group through a power cycle. It does, but the firmware only writes the 93LC66 EEPROM after a quiet period. Once you let go, <span class="mono">rem2</span> × <span class="mono">rem4</span> count about 46 000 passes, roughly <b>1.7 s</b>.</p><p>Press SELECT to choose <b>group 2</b>, then click <b>Next second ▸</b> once or twice. Watch the red <b>93LC66</b> lane: the write shows up there.</p><p><b>Goal:</b> the EEPROM holds group 2.</p>`, check:()=>{ const E=emulate(); const ee=E.eew.filter(w=>w.t1<=SIM.t).pop(); const w=ee?ee.w1:D.init.ee.w1; return (D.init.ee.w0===0xAAAA||ee) && (w&0xFF)===2; }, hint:'Get group 2 lit, then press N (Next second) and move the playhead past the red EEPROM block.'},
  {title:'7 · Power cycle', body:`<p>Now switch the unit off and on again (P, P). For up to about 160 ms the PODXX sits in its power-up delay with the group lines at 00, so the Demux-1 de-embeds <b>group 1</b>. Then the PODXX reads the EEPROM and the stored group comes back.</p><p><b>Goal:</b> after a power-on, group 2 lit again.</p>`, check:()=>D.events.some(e=>e.type==='power'&&e.on&&e.user&&e.t<SIM.t) && ledsAt(SIM.t).g[1], hint:'Power off (P), power on (P); the playhead jumps 170 ms ahead, past the boot delay.'},
  {title:'8 · Lose the input', body:`<p>Unplug <b>SDI INPUT</b>. <b>ERROR</b> lights and <b>SDI</b> and <b>AES</b> go out on the next 36 µs pass. The manual says ERROR means “not a valid SDI signal”. In the code it is simply “no carrier detect”, which is the cable equaliser's CD pin.</p><p><b>Goal:</b> ERROR on.</p>`, check:()=>ledsAt(SIM.t).err===1, hint:'Click the SDI INPUT BNC or press D.'},
  {title:'Done', body:`<p>You've used every control on the POD19. One more thing to try: set the PODXX firmware to <b>POD19-014</b>. It is a 2004 custom build that ignores SELECT. The header says it “will default and remain in group 1”, but it still loads a stored group from the EEPROM (see Findings).</p>`, check:()=>true, auto:true},
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod19Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD19 (from MANUAL/pod19.pdf)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div style="margin-bottom:6px">${settingsHTML()}</div><div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot = `<g><rect x="120" y="45" width="220" height="190" fill="transparent"><title>Power rocker and power LED (PWRLED, wired to the supply)</title></rect>
    <rect x="880" y="160" width="270" height="90" fill="transparent"><title>GROUP 1–4: one lit = the group being de-embedded (PODXX RB3, RB0, RB1, RB2)</title></rect>
    <rect x="1250" y="160" width="200" height="120" fill="transparent"><title>SDI = carrier detect · AES = GS9023 locked to the group · ERROR = no carrier</title></rect></g>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t, {hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(SIM.t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (Steady scenario)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ loadScenario('steady'); D.log=[]; lessonIdx=0; SIM.seek(0.05); };
  };
  bindControls(m);
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod19Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('The SDI line at the playhead', `<div id="line"></div>`)}${card('As seen by the device and the front panel', `<div id="dev"></div><div id="fp" style="margin-top:8px"></div>`)}</div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, S=STD[D.std], E=emulate();
    const podPass = (D.fw==='014'?29:44)*TCY, dmPass = C.DM_CYC*TCY;
    const nEmb = D.emb.filter(Boolean).length;
    const rows = [
      ['SDI words (10-bit)', '27,000,000', SIM.fmtDur(WORD_T), 'CLC014 equaliser → CLC016 re-timer → CLC011 decoder → GS9023'],
      ['SDI lines', (1/S.H).toFixed(2), SIM.fmtDur(S.H), `${S.words} words; EAV + ${S.hanc} HANC words carry the audio packets`],
      ['SDI fields', (1/S.field).toFixed(2), SIM.fmtDur(S.field), 'one audio control packet per group per field (SMPTE 272M) — line '+S.ctlLine+' here, '+'inferred'],
      ['Audio data packets (all groups)', '≈ '+Math.round(nEmb/S.H).toLocaleString(), SIM.fmtDur(S.H), `${nEmb} group(s) embedded; ${(AES_FS*S.H).toFixed(4)} samples per channel per line → 3 or 4`],
      ['Embedded samples per channel', '48,000', SIM.fmtDur(1/AES_FS), '20 bits in 3 ten-bit words (X, X+1, X+2)'],
      ['AES3 frames per output', '48,000', SIM.fmtDur(1/AES_FS), 'AES 1 = ch 1/2, AES 2 = ch 3/4 of the chosen group'],
      ['AES3 blocks', '250', SIM.fmtDur(BLOCK), '192 frames, Z preamble'],
      ['AES3 bit cells', '6,144,000', SIM.fmtDur(1/(AES_FS*128)), 'biphase-mark, each output'],
      ['PODXX main-loop passes', '≈ '+Math.round(1/podPass).toLocaleString(), SIM.fmtDur(podPass), `${D.fw==='014'?29:44} cycles @ 4.9152 MHz, counted from the source`],
      ['SELECT debounce', '—', SIM.fmtDur(256*podPass), '256 passes with RB7 high (rem0), then 256 with RB7 low (rem1)'],
      ['EEPROM quiet time', '—', '≈ '+SIM.fmtDur(46200*46*TCY), 'rem2 (8 bit) × rem4 (75 → 0) after release'],
      ['Demux-1 main-loop passes', '≈ '+Math.round(1/dmPass).toLocaleString(), SIM.fmtDur(dmPass), '1123 cycles; 1024 of them are the rdelay1 loop'],
      ['GS9023 register writes', '≈ '+Math.round(4/dmPass).toLocaleString(), '', 'addr0, addr3, addr4, addr6 rewritten every pass'],
      ['Group-code latency', '—', SIM.fmtDur(dmPass)+' – '+SIM.fmtDur(2*dmPass), 'readgroupselect → setgroup (next pass) → refreshgs9023 (pass after)'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one SDI line, one PODXX pass, one Demux-1 pass or one AES frame at a time.</p>`;
    // SDI line anatomy
    const li = lineInfo(t), lay = hancLayout(li.n), W=S.words; const sx = x=>10 + x/W*600;
    let s = `<svg viewBox="0 0 620 150" style="width:100%"><rect x="10" y="40" width="600" height="40" fill="var(--panel2)" stroke="var(--line)"/>
      <rect x="${sx(0)}" y="40" width="${sx(4)-sx(0)}" height="40" fill="var(--ink2)"/><text x="${sx(0)}" y="32" font-size="10" fill="var(--ink2)">EAV</text>`;
    const zoomHanc = x => 10 + x/(S.eav+S.hanc+4)*600;
    lay.forEach(p=>{ s+=`<rect x="${sx(p.a)}" y="40" width="${Math.max(1,sx(p.b)-sx(p.a))}" height="40" fill="${p.g===gsGroupAt(t)?'var(--accent)':'var(--accent2)'}" opacity="${p.kind==='control'?.5:.85}"/>`; });
    s += `<rect x="${sx(S.eav+S.hanc)}" y="40" width="${sx(4)-sx(0)}" height="40" fill="var(--ink2)"/><text x="${sx(S.eav+S.hanc)+6}" y="32" font-size="10" fill="var(--ink2)">SAV · active video (${W-S.eav-S.hanc-4} words)</text>
      <line x1="${sx(li.w)}" y1="34" x2="${sx(li.w)}" y2="86" stroke="var(--play)" stroke-width="2"/>
      <text x="10" y="104" font-size="11" fill="var(--ink2)">HANC enlarged:</text><rect x="10" y="110" width="600" height="26" fill="var(--panel2)" stroke="var(--line)"/>`;
    lay.forEach(p=>{ s+=`<rect x="${zoomHanc(p.a)}" y="110" width="${zoomHanc(p.b)-zoomHanc(p.a)}" height="26" fill="${p.g===gsGroupAt(t)?'var(--accent)':'var(--accent2)'}" opacity="${p.kind==='control'?.5:.85}" stroke="var(--panel)"/><text x="${zoomHanc(p.a)+3}" y="127" font-size="10" fill="#fff">G${p.g} ${p.kind==='control'?'ctl':(p.b-p.a)+'w'}</text>`; });
    if (li.w < S.eav+S.hanc+4) s += `<line x1="${zoomHanc(li.w)}" y1="106" x2="${zoomHanc(li.w)}" y2="140" stroke="var(--play)" stroke-width="2"/>`;
    s += `<text x="10" y="16" font-size="12" fill="var(--ink)">Line ${li.ln} of ${S.lines} · word ${li.w} · ${li.ns} samples per channel on this line ${sdiAt(t)?'':'(no cable)'}</text></svg>`;
    m.querySelector('#line').innerHTML = s + `<p class="small muted">Packets of the group selected in the GS9023 are green. The order of the groups in HANC depends on whatever embedded the audio upstream (${inf}).</p>`;
    const ps=podStep(t), ds=dmStep(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PODXX</th><td class="mono">${ps.p?`pass #${ps.p.i.toLocaleString()} → ${POD_STEPS[ps.step][0]}<br><span class="muted">${POD_STEPS[ps.step][1]}</span>`:darkAt(t)||'off'}</td></tr>
      <tr><th>Demux-1</th><td class="mono">${ds.d?`pass #${ds.d.i} → ${DM_STEPS[ds.step][0]}<br><span class="muted">${DM_STEPS[ds.step][3]}</span>`:'off'}</td></tr>
      <tr><th>GS9023</th><td class="mono">${gsGroupAt(t)?'DID '+hex3(anc(AUD_DID[gsGroupAt(t)]))+(gsLock(t)?' · locked':' · searching'):'—'}</td></tr>
      <tr><th>AES1 frame</th><td class="mono">${Math.floor(t*AES_FS)%192}/191 · A ${aesSample(0,0,t).toFixed(4)} · B ${aesSample(0,1,t).toFixed(4)}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const S = STD[D.std];
  const levels = [['1 s', 1], ['1 field', S.field], ['1 ms', 0.001], ['1 line', S.H], ['HANC (≈10 µs)', (S.eav+S.hanc+4)*WORD_T]];
  const {c,w} = SIM.canvas(cv, levels.length*44+10); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), a2=SIM.css('--accent2');
  levels.forEach(([lbl, span], i)=>{
    const y=6+i*44, x0=120, pw=w-130; let t0=Math.max(0, t-span/2); if (lbl.startsWith('1 line')) t0=Math.floor(t/S.H)*S.H; if (lbl.startsWith('HANC')) t0=Math.floor(t/S.H)*S.H; if (t0+span>1) t0=Math.max(0,1-span);
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(lbl, 6, y+20); c.strokeStyle=SIM.css('--line'); c.strokeRect(x0, y, pw, 34);
    if (span >= 0.0005){ c.strokeStyle=acc; c.beginPath(); const N=Math.min(900,pw); for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=aesSample(0,0,tt)*10; const yy=y+17-v*14; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy); } c.stroke(); }
    else { const n=Math.floor(t0/S.H); hancLayout(n).forEach(p=>{ const a=n*S.H+p.a*WORD_T, b=n*S.H+p.b*WORD_T; c.fillStyle=p.g===gsGroupAt(t)?acc:a2; c.globalAlpha=.7; c.fillRect(x0+(a-t0)/span*pw, y+4, (b-a)/span*pw, 26); c.globalAlpha=1; }); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(lbl.startsWith('HANC')?'EAV + audio packets':'whole line: HANC at the left, then active video', x0+4, y+44-14); }
    const px = x0+(t-t0)/span*pw; c.strokeStyle=play; c.lineWidth=2; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke(); c.lineWidth=1;
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  sdiin:{x:10,y:20,w:150,h:60,t:'SDI INPUT (BNC)',s:['75 Ω, 270 Mb/s'],d:'Rear BNC “SDI INPUT” → Demux-1 INPUT1. Manual: 75 Ω, 0.8 V p-p, 18 dB return loss.'},
  eq:{x:190,y:20,w:150,h:60,t:'CLC014 equaliser',s:['carrier detect CD'],d:'U1 on DEMUX-1ISS2.bom. Adaptive cable equaliser; its CD output drives the CD1 red LED on the module, the Demux PIC RC2 and the PODXX RC2 (“SDI” tally). That the PODXX line is CD is '+'inferred from the code comment “check for carrier detect” and from the DEMUX-3 P2 pin 3 “SDI LOCK”.'},
  pll:{x:370,y:20,w:150,h:60,t:'CLC016 re-timer',s:['data re-timing PLL'],d:'U2. Recovers the 270 MHz clock and re-times the data (“DATARETIMINGPLL” in the functional diagram). Its re-clocked serial output feeds the cable driver and the decoder.'},
  drv:{x:550,y:20,w:150,h:60,t:'CLC007 cable driver',s:['→ SDI OUTPUT'],d:'U6 → BNC SDIOUT1 → rear “SDI OUTPUT”. This is the re-clocked loop-through the manual promises.'},
  dec:{x:370,y:110,w:150,h:60,t:'CLC011 decoder',s:['serial → 10-bit parallel'],d:'U5. De-serialises and de-scrambles to the 27 MHz parallel bus (the “DSP.” box on the functional diagram).'},
  gs:{x:370,y:200,w:150,h:76,t:'GS9023',s:['DID filter (addr3/addr4)','lock → addr0 bit 3','AES3 out × 2'],d:'U7 (TQFP100). Gennum embedded-audio codec used as a de-embedder. The PIC writes addr0 = 0x81, addr3 (audio DID pair), addr4 (control DID) and addr6 = 0x05 on every pass, and reads addr0 bit 3 as “aes lock”. The meanings of addr0 and addr6 beyond what the comments say are not recorded ('+inf+').'},
  ck:{x:550,y:110,w:150,h:60,t:'PLL1700E',s:['27 MHz → audio clocks'],d:'U11. Multi-clock generator that gives the GS9023 its audio master clock from the 27 MHz video clock ('+inf+'; part from the BOM).'},
  pic:{x:190,y:200,w:150,h:76,t:'PIC16F874 (Demux-1)',s:['4.9152 MHz · 1094 passes/s','GS9023 bus: RA, PORTD','RB7/RC0 ← group code'],d:'U14, POD19_DEMUX.asm v1.01. MAIN: refreshgs9023, refreshoutputmux, setgroup, readgroupselect, readgs9023, then a 1024-cycle wait. No interrupts, no timers (the Timer2 setup is commented out).'},
  mux:{x:550,y:200,w:150,h:76,t:'74HC153 + 75176 ×4',s:['out1:out0 = RC4:RC3','PE65612 transformers'],d:'U8 dual 4-to-1 selector, U4/U9/U10/U12 DS75176 drivers, T1–T3 PE65612 → BNC AESOUT1/2 (rear OUTPUT 1/2, 75 Ω). Which inputs the selector chooses between is '+inf+'.'},
  podxx:{x:10,y:200,w:150,h:110,t:'PODXX board',s:['PIC16F73 (was 16C73)','SW1 SELECT, 7 LEDs','93LC66 EEPROM','DS75176 → XLR AES 1/2','LM317/LM337 supply'],d:'“PODXX DEMUX SUB-ASSEMBLY” ISS.1 (PODXX.SCH, Feb 2001). User interface plus the balanced AES outputs: U1/U2 DS75176, T2/T3 PE65612, XLR1/XLR2. The code is 19-014.asm / PODXX v101.asm.'},
  xlr:{x:10,y:340,w:150,h:50,t:'AES 1 / AES 2 XLR',s:['110 Ω balanced'],d:'Rear XLRs (XLR3M). Manual: AES/EBU 110 Ω balanced, 1 V p-p terminated, 48 kHz, 20 or 24 bits.'},
  bnc:{x:550,y:300,w:150,h:50,t:'OUTPUT 1 / OUTPUT 2',s:['AES 75 Ω (POD19)'],d:'Rear BNCs. On the POD19V these carry composite video instead (manual); no POD19V video design files are in the archive.'},
  psu:{x:190,y:320,w:150,h:60,t:'Power',s:['TE70040 transformer','LM2596 + LM1117-3.3'],d:'PODXX: T1 TE70040, 1N4004 bridge, 2200 µF, LM317/LM337. Demux-1: LM2596 switcher and LM1117-3.3. The 2010 rebuild changed the transformer to a 70052K, 7.5 VA, 12 V each side (test report).'},
};
const WIRES = [['sdiin','eq',''],['eq','pll',''],['pll','drv',''],['pll','dec',''],['dec','gs','27 MHz parallel'],['ck','gs','MCLK'],['pic','gs','A3..A0 · D7..D0 · RD/WR'],['gs','mux','AES'],['mux','bnc',''],['gs','podxx','AES (H1X3)'],['podxx','pic','LSB · MSB'],['pic','podxx','AES lock'],['eq','podxx','CD'],['podxx','xlr',''],['psu','pic','']];
function viewBlock(m){
  window.__pod19Active = false;
  let sel='gs';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — 2001 design: PODXX + Demux-1 (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one paragraph', `<p>SDI comes in, is equalised and re-timed, and leaves again as a re-clocked loop-through. A copy is de-serialised and passed to the <b>GS9023</b>. The GS9023 looks for the audio data packets whose DID matches its addr3 register and turns that group's four channels into two AES3 streams. The <b>PODXX</b> owns the button, the LEDs and the EEPROM. It tells the <b>Demux-1</b> PIC which group it wants over two wires. The Demux-1 PIC sends back one wire: “AES locked”.</p>
      <p class="small muted">From the functional diagrams (<span class="mono">POD19 - Functional Diagram.cdr</span>, <span class="mono">Demux 1 / Demux 2 - Functional Diagram.cdr</span>) and the Demux-1 ISS2 BOM. The 2000 design (PIC16C73A + FLEX 10KE + two CS8420) is on the Schematics and Software tabs.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 710 400" style="width:100%"><defs><marker id="p19ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p19ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net and pin names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const box=(x,y,w,h,t1,t2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2-2}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${t1}</text>${t2?`<text x="${x+w/2}" y="${y+h/2+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${t2}</text>`:''}`;
const arrow=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)" marker-end="url(#p19sa)"/>${l?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" text-anchor="middle" font-size="10" fill="var(--accent2)">${l}</text>`:''}`;
const SHEETS = [
  { name:'1 · PODXX: PIC16F73 (U8)', note:'Pin functions from 19-014.asm (init TRIS values and the bit operations) and the PODXX.SCH net labels “P1-1 LSB”, “P1-2 MSB”, “P1-4 AES”. P1-3 = carrier detect is inferred. Which LED refdes sits on which pin is not recoverable from the binary schematic.', svg:()=>
    chip(330,50,200,'U8 PIC16F73 (PIC16C73 on PODXX.SCH)',[
      ['RA0','93LC66 DO (busy/data)'],['RA1','93LC66 DI'],['RA2','93LC66 CLK'],['RA3','93LC66 CS'],['RB7','SW1 SELECT (high = pressed)'],['RC2','P1-3 SDI carrier detect'],['RC3','P1-4 AES lock'],['OSC1/2','X1 4.9152 MHz, C39/C40 22p'],
    ],[
      ['RB3','LED group 1'],['RB0','LED group 2'],['RB1','LED group 3'],['RB2','LED group 4'],['RB5','LED SDI'],['RB6','LED AES'],['RB4','LED ERROR'],['RC0','P1-1 LSB → Demux RB7'],['RC1','P1-2 MSB → Demux RC0'],
    ],'TRISA 00000001 · TRISB 10000000 · TRISC 11111100')
    + box(40,330,170,50,'U33 93LC66','256 × 16 Microwire') + box(650,330,170,50,'LED1–4 RED · LED5,7 GREEN','LED6 YELLOW (BOM); PWRLED') },
  { name:'2 · Demux-1: PIC16F874 (U14) ↔ GS9023 (U7)', note:'From POD19_DEMUX.asm v1.01 (TRIS values, port comments and the bus code). The GS9023 pin names are not in the archive; the bus is drawn by function.', svg:()=>
    chip(120,50,190,'U14 PIC16F874',[
      ['RB7','LSB ← PODXX RC0'],['RC0','MSB ← PODXX RC1'],['RC2','cd (CLC014)'],['RC7','aesdetect (unused)'],['OSC','X1 4.9152 MHz'],
    ],[
      ['RA3..RA0','A3..A0'],['RA4','RD strobe'],['RA5','WR strobe'],['RD7..RD0','D7..D0'],['RB2','CS'],['RC3/RC4','out0 / out1'],['RC5','pllres'],['RE0','ERROR LED'],['RE1','AES lock → PODXX'],['RE2','“AUD1 LED” (read by v1.01!)'],
    ],'TRISB 11011011 · TRISC 10000101 · TRISE 11100000')
    + chip(590,70,170,'U7 GS9023',[['A3..A0','addr0/3/4/6'],['D7..D0',''],['RD / WR / CS','']],[['AES out 1','→ 74HC153'],['AES out 2','→ 74HC153'],['parallel in','← CLC011'],['MCLK','← PLL1700E']],'embedded audio codec') },
  { name:'3 · SDI path (Demux-1 ISS2)', note:'Parts and refdes from DEMUX-1ISS2.bom; topology from “POD19 - Demux 1 - Functional Diagram.cdr”. Terminations (75R ×8, 37R5, 18 nH) are on the BOM; where each sits is not traced.', svg:()=>
    `<defs><marker id="p19sa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker></defs>`
    + box(30,80,110,50,'INPUT1 BNC','75 Ω') + arrow(140,105,180,105) + box(180,80,120,50,'U1 CLC014','equaliser · CD') + arrow(300,105,340,105) + box(340,80,120,50,'U2 CLC016','re-timing PLL')
    + arrow(460,105,520,105) + box(520,80,120,50,'U6 CLC007','cable driver') + arrow(640,105,690,105) + box(690,80,120,50,'SDIOUT1 BNC','re-clocked')
    + arrow(400,130,400,180) + box(340,180,120,50,'U5 CLC011','decoder') + arrow(460,205,520,205,'10-bit') + box(520,180,120,50,'U7 GS9023','de-embedder') + arrow(580,280,580,230,'MCLK') + box(520,280,120,50,'U11 PLL1700E','27 MHz → fs clocks')
    + arrow(240,130,240,300,'CD') + box(160,300,160,50,'CD1 red LED · PIC RC2','PODXX RC2 (P1-3, inferred)') },
  { name:'4 · AES outputs', note:'Demux-1: U8 74HC153, four DS75176 (U4, U9, U10, U12), PE65612 (T1–T3) → AESOUT1/2 BNC (rear OUTPUT 1/2). PODXX: DS75176 U1/U2, PE65612 T2/T3, R19/R20 110R → XLR1/XLR2 (rear AES 1/2). The 3-pin harness between them is inferred from the PAN300 headers.', svg:()=>{
    let s=`<defs><marker id="p19sa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker></defs>`;
    s += box(30,170,120,60,'GS9023','AES 1 · AES 2') + arrow(150,200,200,200) + box(200,170,120,60,'U8 74HC153','out1:out0 = RC4:RC3');
    [0,1].forEach(k=>{ const y=70+k*90; s+=arrow(320,190+k*20,380,y+25) + `<polygon points="380,${y+10} 380,${y+40} 410,${y+25}" fill="none" stroke="var(--ink)"/><text x="384" y="${y+5}" font-size="10" fill="var(--ink2)">75176</text>` + arrow(410,y+25,450,y+25) + box(450,y+5,90,40,'PE65612','') + arrow(540,y+25,590,y+25) + box(590,y+5,150,40,`OUTPUT ${k+1} BNC`,'AES'+(k+1)+' 75 Ω');
      const y2=270+k*80; s+=arrow(320,210,380,y2+25) + `<polygon points="380,${y2+10} 380,${y2+40} 410,${y2+25}" fill="none" stroke="var(--ink)"/><text x="384" y="${y2+5}" font-size="10" fill="var(--ink2)">PODXX DS75176</text>` + arrow(410,y2+25,450,y2+25) + box(450,y2+5,90,40,'PE65612','') + arrow(540,y2+25,590,y2+25) + box(590,y2+5,150,40,`AES ${k+1} XLR`,'110 Ω balanced'); });
    return s; } },
  { name:'5 · 2000 design: PIC16C73A + EPF10K30E + CS8420 ×2', note:'First design (pod19/, Slava Lee, Mar 2000). PIC pins from pod19.h; FPGA pins from altera/decoder_top.rpt (EPF10K30ETC144-3, 553 LCs = 32 %, 43 % of the memory bits).', svg:()=>
    chip(120,40,170,'PIC16C73A',[['RB3..RB0','LED_1..LED_4'],['RB5','LED_5 (AUD_PACKETS)'],['RB6','LED_6 (SRC mode)'],['RB4','LED_7 (SDI not locked)'],['RB7','SW (low = pressed)']],
      [['RA1','ALTERA_CS → 28'],['RA3/RA2','ALTERA_A1/A0 → 30/29'],['RC3 SCK','PIC_CLK → 33'],['RC5 SDO','PIC_DIN → 27'],['RC4 SDI','← PIC_DOUT 26'],['RA5','ALTERA_RESET → glb_rst 32'],['RC2/RC1','CS_8420_CH1/CH2'],['RC0','RESET (all chips)']],'__CONFIG HS_OSC, WDT_ON, BODEN, PWRTE')
    + chip(590,40,170,'EPF10K30ETC144-3',[['101…137','din0…din9'],['125','clk27'],['98','carr_detect'],['138','SDI_lock'],['140','EQ'],['131','H_sync (reserved)']],
      [['17 / 21','AUD_DATA0 / 1'],['12 / 19','ILRCLK1 / 2'],['13 / 20','ISCLK1 / 2'],['9 / 8','OMCK1 / 2'],['10 / 18','RMCK1 / 2'],['90','AUD_EXT'],['68/72','wrfull_0/1'],['69/73','rdemp_0/1']],'decoder_top: dec · buf · fs256rcv · interface') },
];
function viewSchem(m){
  window.__pod19Active = false;
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from source pin and net names — not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD files are <span class="mono">POD19 - #Engineering/PCB/POD19-1.sch</span> (2000 design), <span class="mono">POD  - #Engineering/PODXX/PODXX.SCH</span> and <span class="mono">…DEMUX1…/DEMUX-1ISS2.sch</span>. Their binary format only gives up component lists and a few net labels, so these sheets are a readable guide built from the firmware and the BOMs. They are redrawn, not the original CAD.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">POD19 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function flowSVG(title, steps, cur, sub){
  let s=`<svg viewBox="0 0 470 ${steps.length*42+64}" style="width:100%"><defs><marker id="p19a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    <rect x="120" y="6" width="230" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="235" y="22" text-anchor="middle" font-size="11.5" fill="var(--ink)">${title}</text>`;
  steps.forEach((p,j)=>{ const y=40+j*42, on=cur===j;
    s+=`<line x1="235" y1="${y-10}" x2="235" y2="${y}" stroke="var(--ink2)" marker-end="url(#p19a2)"/><rect x="20" y="${y}" width="420" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="30" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="30" y="${y+27}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[1].length>78?p[1].slice(0,76)+'…':p[1]}</text>`; });
  const yb=40+steps.length*42; s+=`<path d="M440 ${yb-26} h18 V36 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#p19a2)"/><text x="20" y="${yb+16}" font-size="10.5" fill="var(--ink2)">${sub}</text></svg>`;
  return s;
}
function viewSoft(m){
  window.__pod19Active = true;
  m.innerHTML = `<div class="grid2">
    ${card('PODXX main loop (19-014.asm / v101.asm) — lit = running at the playhead', `<div id="f1"></div>`)}
    ${card('Demux-1 MAIN (POD19_DEMUX.asm) — lit = running at the playhead', `<div id="f2"></div>`)}</div>
  <div class="grid2">
    ${card('SELECT switch state machine (press_flag bits)', `<div id="fsm"></div>`)}
    ${card('GS9023 registers as the PIC writes them, live', `<div id="reg"></div>`)}</div>
  <div class="grid2">
    ${card('How the button did things — switch → code → wire', `<div id="btn"></div>`)}
    ${card('93LC66 Microwire frames (eew / eer)', `<div id="ee"></div>`)}</div>
  ${card('The 2000 design (pod19/pic/pod19.asm): what it did instead', `<div id="g1"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, ps=podStep(t), ds=dmStep(t), p=ps.p;
    const pSteps = POD_STEPS.map((s,k)=> (D.fw==='014' && (k===1||k===3)) ? [';call '+s[0], 'commented out in POD19-014'] : s);
    m.querySelector('#f1').innerHTML = flowSVG('reset: call init · call read · goto main', [['clrwdt','feed the watchdog (period depends on unwritten OPTION_REG — '+'inferred 2.3 s)']].concat(pSteps).map((s,k)=>s), ps.step<0?-1:ps.step+1,
      p?`pass #${p.i.toLocaleString()} · ${p.cyc} cycles = ${SIM.fmtDur(p.cyc*TCY)}${p.busy?' + '+SIM.fmtDur(p.busy)+' eerwait':''}`:(darkAt(t)==='boot'?'in powerupdelay':'off'));
    m.querySelector('#f2').innerHTML = flowSVG('INIT: TRIS, GS9023 shadow defaults (group 1)', DM_STEPS.map(s=>[s[0], s[3]]), ds.step, ds.d?`pass #${ds.d.i} · 1123 cycles = ${SIM.fmtDur(C.DM_CYC*TCY)}`:'off');
    // FSM
    const pf = p?p.pf:0, rel = p && (pf&1) && (pf&2) && !(p.inp&1), st = !p ? -1 : (pf&4) ? 4 : rel ? 3 : (pf&1)&&(pf&2) ? 2 : (p.inp&1) ? 1 : 0;
    const node=(x,y,lbl,on,sub)=>`<g><rect x="${x-62}" y="${y-24}" width="124" height="48" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 470 210" style="width:100%">${node(80,40,'IDLE',st===0,'rem0 = 0')}${node(240,40,'COUNTING',st===1,p?`rem0 = ${p.r0}/256`:'RB7 high')}${node(400,40,'HELD',st===2,'flag0 + flag1')}
      ${node(400,150,'RELEASING',st===3,p?`rem1 = ${p.r1}/256`:'RB7 low')}${node(240,150,'WRITE PENDING',st===4,p?`rem4 ${p.r4} · rem2 ${p.r2}`:'flag2')}${node(80,150,'EEPROM',false,'eew ×2')}
      <path d="M142 40 H178" stroke="var(--ink2)"/><path d="M302 40 H338" stroke="var(--ink2)"/><path d="M400 64 V126" stroke="var(--ink2)"/><path d="M338 150 H302" stroke="var(--ink2)"/><path d="M178 150 H142" stroke="var(--ink2)"/><path d="M80 126 V64" stroke="var(--ink2)"/>
      <text x="320" y="10" font-size="9.5" text-anchor="middle" fill="var(--ink2)">rem0 wraps → step source, LEDs</text><text x="160" y="190" font-size="9.5" text-anchor="middle" fill="var(--ink2)">rem4 wraps</text><text x="${D.fw==='014'?235:10}" y="200" font-size="10" fill="var(--warn)">${D.fw==='014'?'POD19-014: this machine never runs':''}</text></svg>
      <p class="small muted">A new press while WRITE PENDING clears press_flag,2 (flag3 is never set) and the release starts the 1.7 s count again from rem4 = 75; rem2 is not reset.</p>`;
    // registers
    const g = gsGroupAt(t)||1;
    m.querySelector('#reg').innerHTML = `<table class="kv mono"><tr><th>reg</th><th>value</th><th>source comment / meaning</th></tr>
      <tr><td>addr0</td><td>0x81 → read bit 3 = ${gsLock(t)?1:0}</td><td class="small">written every pass; read back in readgs9023: bit 3 “aes lock”</td></tr>
      <tr><td>addr3</td><td class="${''}">0x${A3[g].toString(16).toUpperCase()}</td><td class="small">“DID audio packet ext/group”: high nibble ${(A3[g]>>4).toString(16).toUpperCase()} = extended DID ${hex3(anc(EXT_DID[g]))}, low nibble ${(A3[g]&15).toString(16).toUpperCase()} = audio DID ${hex3(anc(AUD_DID[g]))} (${inf})</td></tr>
      <tr><td>addr4</td><td>0x${A4[g].toString(16).toUpperCase().padStart(2,'0')}</td><td class="small">“DID control packet”: low nibble of control DID ${hex3(anc(CTL_DID[g]))} (${inf})</td></tr>
      <tr><td>addr6</td><td>0x05</td><td class="small">written every pass; meaning not commented</td></tr>
      <tr><td>addr7–15</td><td>0x00</td><td class="small">“read only” (shadows cleared, never read)</td></tr></table>
      <table class="kv mono" style="margin-top:8px"><tr><th>group</th><th>PODXX source</th><th>LED bit</th><th>RC1:RC0</th><th>Demux group</th><th>addr3/addr4</th><th>SDI audio DID</th></tr>
      ${[1,2,3,4].map(n=>`<tr class="${n===g?'hl':''}"><td>${n}</td><td>0x0${1<<(n-1)}</td><td>RB${GRP_BIT[n]}</td><td>${((n-1)>>1)&1}${(n-1)&1}</td><td>${(1<<(n-1)).toString(2).padStart(4,'0')}b</td><td>${A3[n].toString(16).toUpperCase()}/${A4[n].toString(16).toUpperCase().padStart(2,'0')}</td><td>${hex3(anc(AUD_DID[n]))}</td></tr>`).join('')}</table>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the wire</th></tr>
      <tr><td>Press SELECT</td><td class="mono small">switch_press: incfsz rem0 ×256 → bsf press_flag,0 → rlf source</td><td class="small">nothing yet</td></tr>
      <tr><td>(same pass)</td><td class="mono small">led_output → group_check → groupN</td><td class="small">one group LED; RC1:RC0 = group − 1</td></tr>
      <tr><td>(≤ 0.9 ms)</td><td class="mono small">Demux readgroupselect (RB7, RC0)</td><td class="small">group = 1/2/4/8</td></tr>
      <tr><td>(next pass)</td><td class="mono small">setgroup</td><td class="small">addr3/addr4 shadows</td></tr>
      <tr><td>(pass after)</td><td class="mono small">refreshgs9023</td><td class="small">GS9023 DID filter changes; AES outputs switch group</td></tr>
      <tr><td>(each pass)</td><td class="mono small">readgs9023 → PORTE,1 → PODXX RC3 → sdi_check</td><td class="small">AES tally</td></tr>
      <tr><td>Let go</td><td class="mono small">switch_debounce: rem1 ×256 → press_flag,2; write: rem2 × rem4</td><td class="small">≈1.7 s later: 93LC66 WRITE word 0 = AAAA, word 1 = source:source</td></tr>
      <tr><td>Pull the SDI cable</td><td class="mono small">sdi_check → sdi_error</td><td class="small">ERROR on, SDI and AES off (next pass)</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    // EEPROM frames
    const E=emulate(); const w = E.eew.filter(x=>x.t0<=t).pop() || E.eew[0];
    const frame = (lbl, bits)=>`<div class="mono small" style="margin:3px 0"><b>${lbl}</b> ${bits.map(([b,c])=>`<span style="padding:0 2px;border-radius:3px;background:color-mix(in srgb,${c} 22%,transparent)">${b}</span>`).join('')}</div>`;
    const bitsOf=(v,n)=>v.toString(2).padStart(n,'0');
    const w1 = w? w.w1 : D.init.ee.w1;
    m.querySelector('#ee').innerHTML = frame('EWEN ', [['1','var(--warn)'],['00','var(--accent2)'],['11111111','var(--ink2)']])
      + frame('WRITE', [['1','var(--warn)'],['01','var(--accent2)'],['00000000','var(--ink2)'],[bitsOf(0xAAAA,16),'var(--accent)']])
      + frame('WRITE', [['1','var(--warn)'],['01','var(--accent2)'],['00000001','var(--ink2)'],[bitsOf(w1,16),'var(--accent)']])
      + frame('READ ', [['1','var(--warn)'],['10','var(--accent2)'],['0000000x','var(--ink2)'],['(0)','var(--ink2)'],['16 data bits','var(--accent)']])
      + `<p class="small">start bit · opcode · 8-bit address · data, clocked on RA2 with CS on RA3 and DI on RA1. After each WRITE, <span class="mono">eerwait</span> spins on DO (RA0) until the chip is ready. There is no <span class="mono">clrwdt</span> in that loop. ${w?`Last write in this second: ${SIM.fmtT(w.t0)}, group ${w.grp}.`:'No write in this second.'}</p>
      <p class="small muted">write_enable intends to send EWDS when eeaddress,0 = 0, but an unconditional <span class="mono">bsf porta,1</span> follows the test, so it always sends EWEN (11111111).</p>`;
    m.querySelector('#g1').innerHTML = `<div class="grid2"><div><p class="small">The March 2000 design (Slava Lee) was quite different: <b>PIC16C73A</b> + <b>Altera FLEX 10KE</b> (<span class="mono">decoder_top</span>: <span class="mono">dec</span> SDI audio decoder, <span class="mono">buf</span> dual-clock FIFOs, <span class="mono">fs256rcv</span> 256·fs clock recovery, <span class="mono">interface</span> PIC SPI) + <b>two CS8420</b> sample-rate converters. Its main loop:</p>
      <ol class="mono small"><li>Link_to_ALTERA — 4 bytes each way over SSP (A1:A0 select byte 0–3, dummy 0xE4 first)</li><li>jmp_input — SW, FROM_ALTERA0 bits (aud packets, SDI locked), CS8420 reg 16 (lock, confidence, biphase)</li><li>debounce — 31-pass stability (BCOUNT_NUM 0x1F) → MODE_change_analize → increment_group_number → TO_ALTERA1</li><li>switch_8420_modes — SRC mode when CH1 locks, else BYPASS</li><li>channel_status_proc · LED_processing · flush8420reg · AES_output_control (0x55-pass mute after a mode change)</li></ol></div>
      <div><p class="small">What changed in 2001: the FPGA and the CS8420s went, replaced by the Demux-1 module (GS9023 + its own PIC). The UI moved to the separate PODXX board, which added the 93LC66 so the group survives power-off. The 2000 code has no EEPROM and starts at group_number = 0 on every boot. The gen-1 manual drawing (<span class="mono">MANUAL/POD19man.cdr</span>) shows a <b>REF IN</b> connector and an <b>SRC</b> tally, and comes in 110 Ω and 75 Ω versions. They match the CS8420 sample-rate-converter design.</p></div></div>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod19Active = false;
  const F=(h,b)=>`<li style="margin-bottom:8px"><b>${h}</b> ${b}</li>`;
  const f=(file,fn)=>`<span class="mono small muted">[${file}${fn?' · '+fn:''}]</span>`;
  m.innerHTML = card('Findings — what POD19 and its firmware are up to', `<ol>
    ${F('Artwork 2026|59: front/rear panels now drawn as vectors from '+SIM.src(ART_CDR, ART_CDR.split('/').pop())+' (2014-06-26, sheet dated Jun.25/14).', 'The ink plates are the same art as before, now with the cut-out layer: rocker, power LED, SELECT, seven LED holes, D-cut BNC holes, XLR holes with their screw holes, IEC inlet and the unlabelled top-right rear hole. The CDR draws a drill crosshair for every hole on both the green and white plates; these are not printed on real PODs (photos), so they are shown faint. The front legend is still moved back 19 pt over its holes (see below). It is the only POD19 panel art in the archive: there is no POD19 #ARTWORK #DA #2016 folder, and '+SIM.src('#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD19/Backup_of_POD19-FRONT&REAR(FINAL CURVE) .cdr','the Backup_of_ copy')+' is a day older. The older PNGs are on the toggle under the rear panel.')}
    ${F('“Remain in group 1” is only true for a blank EEPROM.', 'POD19-014 (Feb 2004) comments out <span class="mono">call switch_press</span> and <span class="mono">call switch_debounce</span> and says the unit “will default and remain in group 1”. But <span class="mono">read</span> still loads the stored group and sets <span class="mono">press_flag,6</span>, and the first <span class="mono">led_output</span> pass jumps to <span class="mono">group_check</span> with that value. A PODXX that once stored group 3 boots into group 3 and stays there. Try the “POD19-014” scenario with a stored group. '+f('Software/19-014/19-014.asm','read, led_output'))}
    ${F('The EEPROM signature check reads the same byte twice.', '<span class="mono">read</span> compares <span class="mono">setup1</span> with 0xAA, then compares <span class="mono">setup1</span> with 0xAA again. It never checks <span class="mono">setup2</span>. It then copies <span class="mono">setup1</span> into <span class="mono">source</span> and overwrites it with <span class="mono">setup2</span> (“to be changed later”). '+f('19-014.asm / PODXX v101.asm','read'))}
    ${F('The power-up delay depends on uninitialised RAM.', '<span class="mono">powerupdelay</span> loads <span class="mono">movlw 0x0f</span> into W and never uses it. The outer counter <span class="mono">output1</span> is never cleared, so the wait runs anywhere from about 0.6 ms to 160 ms depending on what the RAM held at power-on. During that time PORTC is 00, so the Demux-1 de-embeds <b>group 1</b> before switching to the stored group (scenario “Power-up”). '+f('19-014.asm','init, powerupdelay'))}
    ${F('The manual’s “remembers the last setting” has a 1.7-second catch.', 'The group is written only after <span class="mono">switch_debounce</span> sees 256 quiet passes and then <span class="mono">write</span> counts <span class="mono">rem2</span> × <span class="mono">rem4</span> (75 → 0): about 46 000 passes, or 1.7 s at 4.9152 MHz. Switch the unit off sooner and the change is lost. A new press inside that window cancels the pending write, because <span class="mono">press_flag,3</span> is never set. The original constant was 150 (≈1 s), visible as a comment. '+f('PODXX v101.asm','switch_debounce, write'))}
    ${F('EWDS can never be sent.', '<span class="mono">write_enable</span> sets DI from <span class="mono">eeaddress,0</span> (“0 for disable”), then does <span class="mono">bsf porta,1</span> unconditionally. Every call sends EWEN, so the 93LC66 is left write-enabled for good. The busy-wait <span class="mono">eerwait</span> has no <span class="mono">clrwdt</span>: a dead EEPROM would hang the PODXX until the watchdog fires. The firmware never writes OPTION_REG, so the watchdog keeps its power-on 1:128 prescaler (about 2.3 s, '+inf+'). '+f('19-014.asm','write_enable, eew'))}
    ${F('Demux-1 v1.01 broke the output-mux test while moving to the PIC16F874.', 'In v1.00 <span class="mono">refreshoutputmux</span> tested <span class="mono">portc,2</span>, the carrier detect. In v1.01 it tests <span class="mono">porte,2</span>, which is an <i>output</i> (TRISE = 11100000, commented “E2=AUD1 LED”) whose latch INIT set high with <span class="mono">MOVWF PORTe</span> 0xFF. The test is always true, so out1:out0 stays 00 even with no SDI. Switch the Demux-1 firmware to v1.00 to see the difference on the timeline. '+f('Software/v101/POD19_DEMUX.asm vs v100/POD19_DEMUXv100.asm','refreshoutputmux'))}
    ${F('Swapped comments, right code.', 'In <span class="mono">readgroupselect</span>, <span class="mono">movlw 2</span> is commented “group1” and <span class="mono">movlw 1</span> “group2”. The code is right: 00 → group 1, 01 → group 2, 10 → group 3, 11 → group 4, the same as the PODXX output and the DEMUX-3 P2 pin map (pin 1 LSB, pin 2 MSB). The TRISC comment still names groupsel0/1 on RC6/RC1, the v1.00 pins, while v1.01 reads RC0 and RB7. The delay comment “1.53MHZ … RELAY PULSE (5mS)” comes from another product; the module runs at 4.9152 MHz. '+f('POD19_DEMUX.asm','readgroupselect, INIT'))}
    ${F('A group change takes two Demux passes.', 'MAIN calls <span class="mono">refreshgs9023</span>, then <span class="mono">setgroup</span>, then <span class="mono">readgroupselect</span>. A new code is read in pass k, becomes addr3 in pass k+1 and reaches the GS9023 in pass k+2. That is 0.9–1.8 ms after the PODXX LED changes, which is visible on the timeline. All four registers are rewritten on every pass (about 4 400 bus writes per second), so a glitched GS9023 heals itself within a millisecond. '+f('POD19_DEMUX.asm','MAIN'))}
    ${F('The tallies are simpler than the manual says.', 'The manual says SDI “signifies that there is a valid SDI signal” and ERROR that “there is not a valid SDI signal”. In <span class="mono">sdi_check</span> both come from one input: carrier detect on RC2 (the CLC014 equaliser’s CD, '+inf+'). A cable carrying junk lights SDI; nothing checks EDH or TRS. AES is the GS9023 lock bit, and it is gated by carrier detect. '+f('19-014.asm','sdi_check'))}
    ${F('The group LEDs may be cross-wired relative to the 2000 design.', 'PODXX code lights RB3, RB0, RB1, RB2 for groups 1–4. The 2000 header <span class="mono">pod19.h</span> names RB3 LED_1, RB2 LED_2, RB1 LED_3, RB0 LED_4, which would put groups 2 and 4 on swapped LEDs. The PODXX board must route them differently, or the LEDs read 1-4-3-2. The binary PODXX.SCH holds no netlist, so this is unresolved. The panel here assumes they read 1-2-3-4. '+f('pod19.h · 19-014.asm','group1…group4'))}
    ${F('The 2000 firmware’s LED header is wrong, and it has leftovers.', '<span class="mono">LED_processing</span> lights LED_5 from AUD_PACKETS (the header says “Locked to SDI”) and LED_7 when SDI is <i>not</i> locked (header: “External Packets”). The file header mentions AD conversion, averaging and hysteresis, but PORTA is all digital outputs. The SHARC timeout constants are unused. <span class="mono">MODE_change_analize</span> resets the FPGA on <i>any</i> debounced input change (SDI lock, packets), not just the switch. That design has no EEPROM, so it always booted in group 1. '+f('pod19/pic/pod19.asm','LED_processing, MODE_change_analize, init'))}
    ${F('The 2014 front artwork is shifted.', 'In <span class="mono">POD19-FRONT&amp;REAR(FINAL CURVE) .cdr</span>, the front legend (GROUP bracket, 1–4, SDI/AES/ERROR, SELECT) sits about 19 pt (6.7 mm) right of its drill crosshairs. The rear legend lines up. The file is curves, not text, so this may be in the artwork itself rather than a libcdr artefact. The manual cover drawings show the labels centred over the holes, so the panel here moves the legend back by 19 pt. The FRONT WHITE also carries the two large rear-style crosshairs on OUTPUT 1 and SDI INPUT, and the rear has an unlabelled 8 pt hole top right. '+f('POD PANELS…/Silks/POD19','FRONT WHITE'))}
    ${F('Three different rear panels in the drawings.', '<span class="mono">POD19man.cdr</span> (2000 design) shows SDI INPUT, OUTPUT 1/2 and REF IN, in 110 Ω (XLR) and 75 Ω (BNC) versions, with tallies AES / ERROR / SRC. <span class="mono">POD19MANU.cdr</span> and the 2014 silk show OUTPUT 1, OUTPUT 2, SDI OUTPUT, SDI INPUT plus AES 1/2 XLRs. The “Demux 3” manual cover shows IN · SDI · OUT, AES 1, AES 2. '+f('MANUAL/*.cdr','cover drawings'))}
    ${F('2010: POD19 rebuilt around a DEMUX-3.', 'Test report V2.0.0.3 (5 Jul 2010) lists DEMUX-3 ISS4 (Altera v300, Atmel v203-POD19) in place of the Demux-1, keeping the PODXX PIC16F73 v1.01. The modifications were: remove U10 and U8, and jumper P2 to PE5/PE2/PE1/PE0. <span class="mono">demux_201.c</span> (Peter L., 28 Jun 2010) says this was “due to shortage of Demux1 boards”. Its header still reads “POD31 with DOLBY card capabilities”. The same four-wire interface carried over: LSB, MSB, SDI LOCK, AUDIO LOCK. '+f('POD19-V2003-5JUL10.pdf · DEMUX3…/v203-POD19/demux_201.c','header'))}
    ${F('Toolchain loose ends.', 'Neither PODXX nor Demux source sets <span class="mono">__CONFIG</span>; only the 2000 <span class="mono">pod19.asm</span> does (HS, WDT on, BODEN, PWRTE). No .hex or .pof files are archived. About 480 numbered <span class="mono">*.cnf</span> files in <span class="mono">pod19/altera</span> and <span class="mono">aterabak</span> are MAX+PLUS II compile snapshots. <span class="mono">demuxis2.asm</span> is byte-for-byte v1.01 without its header. '+f('Engineering/README.md',''))}
  </ol>`) + card('Main assumptions (inferred)', `<ul class="small">
    <li>Pass lengths are instruction counts from the source at 4.9152 MHz (both BOMs), branch by branch. The PODXX idle pass is 44 cycles (29 in POD19-014). The Demux pass is 1123.</li>
    <li>The GS9023 locks at the first AES block boundary after the first line that carries the newly selected DID. When it is not locked the outputs are silent. Neither behaviour is documented in the archive.</li>
    <li>The 93LC66 self-timed write takes 4 ms per word. The power-up delay assumes output1 = 0, the worst case of 160 ms.</li>
    <li>RC2 = CLC014 carrier detect; P1-3 carries it. The tally colours are an assumption: the BOM has 4 red, 2 green and 1 yellow LED, and amber is used for ERROR.</li>
    <li>HANC packet order and the test tones in the SDI are an imagined source. 625/50 support is not stated for the POD19 (the Demux-1 had separate PAL “b” builds).</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD19 - #Master/README.md · POD19 - #Engineering/README.md</li>
    <li>POD19 - #Engineering/Software/19-014/19-014.asm · v101/POD19_DEMUX.asm · v100/POD19_DEMUXv100.asm · demuxis2.asm</li>
    <li>POD19 - #Engineering/pod19/pic/pod19.asm, pod19.h · pod19/altera/decoder_top.rpt</li>
    <li>#POD #SERIES/POD  - #Engineering/PODXX/PODXX.SCH(.md) · Podxx Software/PIC VERSIONS/v100, v101</li>
    <li>#DEMUX #SERIES/XXX - DEMUX1 - #Engineering #OBSOLETE/DEMUX-1 - #PCB/DEMUX-1ISS2.bom</li>
    <li>#DEMUX #SERIES/XXX - DEMUX3 - #Master #OBSOLETE/…/v203-POD19/demux_201.c</li>
    <li>POD19 - #Engineering/MANUAL/pod19.pdf, POD19man.cdr, POD19MANU.cdr, POD19MANU Demux 3.cdr · Functional Diagram .cdr ×3</li>
    <li>POD19 - #TESTREPORT/POD19-V2003-5JUL10.pdf</li>
    <li>POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD19/POD19-FRONT&amp;REAR(FINAL CURVE) .cdr → assets/pod19-front-green.png, pod19-front-white.png, pod19-rear-white.png</li></ul>`);
}

/* ---------------- register plugin ---------------- */
loadScenario('step');
SIM.register({
  id:'pod19', name:'POD19 · SDI → AES de-embedder, one group of four ('+Y(2001)+')', duration:1,
  product:'POD19', year:2001, family:'POD series',
  folder:'#POD #SERIES/POD19 - #Master',
  summary:'Half-rack SDI audio de-embedder. A front step switch picks one of four embedded audio groups, which comes out as two AES3 signals on XLR and BNC, with a re-clocked SDI loop-through. Two PICs are emulated pass by pass: the PODXX user interface (switch, LEDs, 93LC66 EEPROM) and the Demux-1 module that programs a Gennum GS9023.',
  highlights:['Both PICs emulated from their assembly, cycle-counted at 4.9152 MHz','Front and rear panel on the real 2014 silkscreen (converted from CorelDRAW)','SDI line and audio data packet down to the 10-bit word','Group change traced switch → PODXX → Demux-1 → GS9023 DID → AES','EEPROM write-back 1.7 s after release, and the POD19-014 variant','Findings: ignored signature byte, uninitialised boot delay, v1.01 port bug'],
  depth:'Full model',
  stepUnits:[
    {label:'1 SDI line', period:()=>STD[D.std].H},
    {label:'1 PODXX pass (44 cycles)', period:()=>44*TCY},
    {label:'1 Demux-1 pass (1123 cycles)', period:()=>C.DM_CYC*TCY},
    {label:'1 AES frame', period:()=>1/AES_FS},
    {label:'1 AES block (4 ms)', period:()=>BLOCK},
    {label:'1 SDI word (37 ns)', period:()=>WORD_T},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[0.03,'30 ms (press → lock)'],[0.006,'6 ms (Demux passes)'],[0.0006,'600 µs (PODXX passes)'],[0.00007,'70 µs (one SDI line)'],[0.000012,'12 µs (HANC packets)']],
  defaultZoom:0,
  init(){ dirty(); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD19', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
