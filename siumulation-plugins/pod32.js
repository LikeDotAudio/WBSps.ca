/* =====================================================================
   POD32 — SD/HD-SDI AES embedder (muxer) with sample-rate converters
   (Ward-Beck Systems, released v100, Nov 2010|43)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Model: the ENGINEERING RELEASE — #POD #SERIES/POD32 - #Master/POD32 - #Engineering/
     software/atmel/v100 (pod32v100.c, 30 Nov 2010) + software/altera/v100 (= R&D build v100LB).
   Sources used (all in this archive, under #POD #SERIES/):
   - POD32 - #Master/POD32 - #Engineering/software/atmel/v100/pod32v100.c
       main(), init_devices/port_init, timer0_init/timer0_ovf_isr, init_CS8416, CS8416_write_ALL,
       CS8416_read1..4, CS8416_READ_LOCK_ALL, INVERT_DATA, leds_refresh, PROCESS_SDI_LOCK_STATUS,
       TRANSLATE_INPUT/DEBOUNCE_INPUT, ALTERA_SORT, ALTERA_write, DEBOUNCE_SWITCHES, RESET_VECTOR,
       DIP_SWITCH_CONSTANT 100, FORMAT_CONSTANT 200, RESET_VECTOR_CONSTANT 255, LED bit defines
   - .../atmel/v100/altera.c/.h (write_data, STROBE_READ/WRITE, ALTERA_BUFFER 8, unused
       ALTERA_read_write), pod32v100._c (24 Nov 2010 backup), pod32v100.s (cycle counts), pod32.mak
   - .../altera/v100/pod32.qsf (pins), pod32_audio_router.vhd (DIP routing), sw16x8.vhd (AES out
       group select), shift_in_128/shift_out_128.vhd (MCU link), src_tdm_gen_pod32.vhd (AD1895 I2S),
       mux_active_groups.vhd, vc_299m_291mo_new.v (PugMedia HD encoder header), pod32.sdc (clocks)
   - POD32 - #Engineering/control.doc, dipswitch.doc(x) (24 Nov 2010), POD32MAN_ROUGH.doc,
       Front&Rear Identification.cdr, PCB/POD32-1iss2.bom, POD32-2iss1.bom, pod32-1iss2.net
   - POD32 - #RD #RD3 READMEs (progress.xlsx summary), adam/POD32 firmware copy
   - POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD32/
       POD32-FRONT&REAR(FINAL CURVE).pdf (CorelDRAW export, Jun 25 2014) → assets/pod32-*.png;
       Pics/POD32 Front.jpg, POD32 Rear.jpg (panel colour, LED colours, connectors)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants from the source ---------------- */
const F_CPU = 4915200, TCY = 1/F_CPU;          // "Crystal: 4.9152Mhz" (pod32v100.c header, BOM XTAL1 4.9152)
const C = {
  DIP: 100,            // DIP_SWITCH_CONSTANT
  FORMAT: 200,         // FORMAT_CONSTANT
  RV: 255,             // RESET_VECTOR_CONSTANT
  LOCK_SDI: 0.020,     // GS1559 equalise + lock time — INFERRED (about one field)
  LOCK_AES: 0.008,     // CS8416 PLL lock time — INFERRED (two AES blocks)
  CONF_T: 0.35,        // EP2C35 Active-Serial configuration from the EPCS16 — INFERRED (≈6.9 Mbit at ≈20 MHz)
};
/* Main-loop steps with cycle estimates counted from pod32v100.s / altera.s (ICCAVR 7.15 output):
   CS8416_write_data ≈ 14 cycles/bit, write_data ≈ 19 cycles/bit plus call overhead. INFERRED totals. */
const STEPS = [
  ['PROCESS_SDI_LOCK_STATUS',     60,  'Decode sdi_lock_status (from the FPGA, last pass) into CD and format'],
  ['TRANSLATE_INPUT · DEBOUNCE_INPUT', 40, '“add CD debounce here” — sets switch1/release1, which nothing reads'],
  ['leds_refresh',                90,  'SD / HD / ERR on PORTE; AES1–4 lock LEDs from last pass’s Astatus'],
  ['CS8416_READ_LOCK_ALL',      2240,  'SPI-read register 0x0C of all four CS8416 (PD1 data, PD2 clock, PD3 in, PD4–7 CS)'],
  ['INVERT_DATA · ALTERA_SORT',   30,  'Astatus = ~status; out[0] = dip_switch1, out[1] = dip_switch2'],
  ['ALTERA_write (16 bytes)',   2900,  'STROBE_READ, 128 bits each way on ALTERA8/9 (PB3 data, PB4 clock) and ALTERA7 (PC7 in), STROBE_WRITE'],
  ['DEBOUNCE_SWITCHES',           60,  'sdi_lock_status = in[2] at once; DIPs only after 100 more “different” passes'],
  ['RESET_VECTOR · WDR',          80,  'FORMAT_CONSTANT and RESET_VECTOR_CONSTANT counters drive PB7 (FPGA internal reset)'],
];
const LOOP_CYC = STEPS.reduce((a,s)=>a+s[1],0);  // 5,500 cycles
const LOOP_T = LOOP_CYC*TCY;                     // ≈ 1.119 ms
const STEP_CYC0 = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
/* Boot, from main(): ALTERA_RESET(1000) · wait(5000)×2 · init_CS8416 · wait(5000) · PB7 low · wait(5000) · PB7 high.
   wait() = 7 cycles per count (wdr, subi, sbci, cpi, cpc, brne) → 35,000 cycles = 7.12 ms. */
const BOOT = { altReset: 7000, waits1: 70000, initCS: 2000, wait3: 35000, pb7low: 35000 };
const BOOT_CYC = BOOT.altReset + BOOT.waits1 + BOOT.initCS + BOOT.wait3 + BOOT.pb7low;
const BOOT_T = BOOT_CYC*TCY;                     // ≈ 30.3 ms
const T_CS_OUT = (BOOT.altReset+BOOT.waits1)*TCY; // PG0 high: CS8416 + AD1895 out of reset

/* ---------------- video formats (manual: SMPTE 292M list + SD 270 Mb/s) ---------------- */
const VF = {
  '1080i59': {name:'1080i/59.94', hd:1, field:1001/60000, lines:1125, perField:562.5, words:2200, pclk:74.25e6/1.001, rate:'1.485/1.001 Gb/s'},
  '1080i50': {name:'1080i/50',    hd:1, field:1/50,       lines:1125, perField:562.5, words:2640, pclk:74.25e6,       rate:'1.485 Gb/s'},
  '720p59':  {name:'720p/59.94',  hd:1, field:1001/60000, lines:750,  perField:750,   words:1650, pclk:74.25e6/1.001, rate:'1.485/1.001 Gb/s'},
  '525':     {name:'525i/59.94 (NTSC)', hd:0, ntsc:1, field:1001/60000, lines:525, perField:262.5, words:1716, pclk:27e6, rate:'270 Mb/s'},
  '625':     {name:'625i/50 (PAL)',     hd:0, pal:1,  field:1/50,       lines:625, perField:312.5, words:1728, pclk:27e6, rate:'270 Mb/s'},
};
Object.values(VF).forEach(v=>{ v.H = v.field/v.perField; v.spl = 48000*v.H; });
const AES_SRC = {
  none:  {name:'— (nothing plugged)', fs:0},
  '48s': {name:'48 kHz, locked to the video', fs:48000},
  '48a': {name:'48 kHz, free-running (+60 ppm)', fs:48000*(1+60e-6)},
  '44':  {name:'44.1 kHz (CD player)', fs:44100},
  '96':  {name:'96 kHz', fs:96000},
  dolbyE:{name:'Dolby E data, video-locked 48 kHz', fs:48000},
};
/* SMPTE 272M (SD) and 299M (HD) audio data-packet DIDs, groups 1–4 */
const DID_SD = [0xFF,0xFD,0xFB,0xF9], DID_HD = [0xE7,0xE6,0xE5,0xE4];
function anc(v){ let p=0; for(let b=0;b<8;b++) p^=(v>>b)&1; v=(v&0xFF)|(p<<8); return v | ((p?0:1)<<9); }
const hex3 = v=>v.toString(16).toUpperCase().padStart(3,'0');
const hex2 = v=>v.toString(16).toUpperCase().padStart(2,'0');

/* ---------------- device inputs as time histories (what the operator did, and when) ---------------- */
const NEG = -Infinity;
function fresh(){
  return {
    pwr: [{t:NEG, v:true}],
    sdi: [{t:NEG, v:'1080i59'}],
    aes: [[{t:NEG,v:'48a'}],[{t:NEG,v:'none'}],[{t:NEG,v:'none'}],[{t:NEG,v:'none'}]],
    dip: [{t:NEG, v:0}],                      // 16 bits, bit 15 = DIP1 … bit 0 = DIP16 (control.doc Reg1[31:16])
  };
}
const D = {
  h: fresh(),
  grp: [true,true,false,false],               // audio groups already embedded in the incoming SDI
  sdiFmt: '1080i59',                          // format chosen for the next plug-in
  aesSel: ['48a','48s','dolbyE','44'],        // source type for the next plug-in of each AES IN
  watchOut: 0,                                // AES OUT shown in the scope
  log: [],
};
function entryAt(h,t){ let e=h[0]; for (const x of h) if (x.t<=t) e=x; return e; }
function valAt(h,t){ return entryAt(h,t).v; }
function nextAfter(h,t){ for (const x of h) if (x.t>t) return x.t; return Infinity; }
function setAt(h,t,v){ for (let i=h.length-1;i>0;i--) if (h[i].t>=t) h.splice(i,1); if (h.length===1 && h[0].t>=t && h[0].t!==NEG) h.length=0; h.push({t,v}); }
const dipAt = t => valAt(D.h.dip,t);
const dipOn = (v,n) => (v>>(16-n))&1;          // DIP n (1..16)

/* ---------------- what the FPGA reports (control.doc FPGA→ATMEL Reg1) ---------------- */
function pwrOn(t){ return valAt(D.h.pwr,t); }
function configured(t){ const e=entryAt(D.h.pwr,t); return e.v && (t-e.t)>=C.CONF_T; }
function sdiLocked(t){ const e=entryAt(D.h.sdi,t); return !!e.v && (t-e.t)>=C.LOCK_SDI; }
function aesLocked(k,t){ const e=entryAt(D.h.aes[k],t); return e.v!=='none' && (t-e.t)>=C.LOCK_AES; }
function sdiByte(t){ if (!sdiLocked(t)) return 0; const v=VF[valAt(D.h.sdi,t)]; return 0x80 | (v.hd?0:0x40) | (v.pal?0x20:0) | (v.ntsc?0x10:0); }
function fpgaIn(t){ // 16 bytes shifted back to the MCU by ALTERA_write
  if (!configured(t)) return new Array(16).fill(0xFF);   // FPGA pins tri-state while configuring; PC7 pull-up (PORTC=0xFF) reads 1s — INFERRED
  const b=new Array(16).fill(0), d=dipAt(t); b[0]=d>>8; b[1]=d&255; b[2]=sdiByte(t); return b;
}

/* ---------------- ATmega128 firmware, emulated pass by pass ---------------- */
const NO_LOCK=0, HD=1, SD=2, PAL=3, NTSC=4;
const FMT_NAME = ['NO_LOCK','HD','SD','PAL','NTSC'];
function newFw(){ return { sls:0, CD:0, format:0, pformat:0, fstable:0, fc:0, fuc:0, ren:0, rc:0, PB7:1, dip1:0, dip2:0, dcnt:0, status:0, Astatus:0, fpgaOut:null, led:{sd:0,hd:0,err:1,aes:[0,0,0,0]} }; }
function runPass(fw, t0, i){
  const tStep = j => t0 + STEP_CYC0[j]*TCY;
  // 1 PROCESS_SDI_LOCK_STATUS
  if (fw.sls & 0x80){ fw.CD=1; if (fw.sls & 0x40) fw.format = (fw.sls&0x20)?PAL:(fw.sls&0x10)?NTSC:SD; else fw.format=HD; }
  else { fw.format=NO_LOCK; fw.pformat=NO_LOCK; fw.CD=0; fw.fstable=0; fw.fc=0; fw.fuc=0; }
  // 3 leds_refresh — uses sdi_lock_status and the Astatus read on the PREVIOUS pass
  const d=(fw.sls&0xC0)>>6;
  fw.led = { sd: d===3?1:0, hd: d===2?1:0, err: d<2?1:0, aes:[0,1,2,3].map(k=>(fw.Astatus>>k)&1) };
  // 4 CS8416_READ_LOCK_ALL: reg 0x0C (receiver errors, only UNLOCK unmasked by reg 6 = 0x10) == 0 → locked
  const tcs = tStep(3) + STEPS[3][1]*TCY/2;
  for (let k=0;k<4;k++){ if (pwrOn(tcs) && aesLocked(k,tcs)) fw.status &= ~(1<<k); else fw.status |= (1<<k); }
  fw.Astatus = (~fw.status)&0xFF;
  // 5 ALTERA_SORT + ALTERA_write
  const out = [fw.dip1, fw.dip2, 0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
  const tw = tStep(5) + STEPS[5][1]*TCY;
  const inn = fpgaIn(tw);
  if (configured(tw)) fw.fpgaOut = out.slice(0,2);
  // 7 DEBOUNCE_SWITCHES
  let latched=false;
  if (inn[0]!==fw.dip1 || inn[1]!==fw.dip2 || inn[2]!==fw.sls){
    fw.sls = inn[2];
    if (fw.dcnt < C.DIP) fw.dcnt++; else { fw.dcnt=0; fw.dip1=inn[0]; fw.dip2=inn[1]; latched=true; }
  }
  // 8 RESET_VECTOR
  let rv='';
  if (fw.CD===NO_LOCK){ fw.PB7=0; fw.ren=1; fw.rc=C.RV; rv='no lock: PB7 low, reset_counter = 255'; }
  else if (!fw.fstable){ fw.PB7=0;
    if (fw.pformat===fw.format && fw.format!==NO_LOCK){ if (fw.fc < C.FORMAT) fw.fc++; else { fw.fstable=1; fw.fc=0; fw.fuc=0; } }
    fw.pformat=fw.format; rv = fw.fstable? 'format_stable = YES' : 'format_counter '+fw.fc+'/200';
  } else if (fw.CD===1){
    if (fw.ren && fw.rc!==0){ fw.rc--; rv='reset_counter '+fw.rc; }
    else { if (fw.pformat!==fw.format){ fw.fc=0; if (fw.fuc<C.FORMAT) fw.fuc++; else { fw.fstable=0; fw.fuc=0; } }
      fw.pformat=fw.format; fw.ren=0; fw.PB7=1; rv='PB7 high: FPGA running'; }
  }
  return { kind:'pass', i, t0, t1:t0+LOOP_T, tcs, tw, inn, out, latched, rv,
    s:{ sls:fw.sls, CD:fw.CD, format:fw.format, fstable:fw.fstable, fc:fw.fc, fuc:fw.fuc, ren:fw.ren, rc:fw.rc, PB7:fw.PB7, dip1:fw.dip1, dip2:fw.dip2, dcnt:fw.dcnt, Astatus:fw.Astatus, fpgaOut:fw.fpgaOut, led:fw.led } };
}
let SCHED=null, SKEY='';
function schedule(){
  const key = JSON.stringify([D.h, D.grp]);
  if (key===SKEY && SCHED) return SCHED;
  SKEY = key; const passes=[]; let t=0, fw=null, i=0;
  let guard=0;
  while (t < 1.0005 && guard++ < 5000){
    const e = entryAt(D.h.pwr, t);
    if (!e.v){ const nx=Math.min(1.001, nextAfter(D.h.pwr,t)); passes.push({kind:'off', t0:t, t1:nx}); fw=null; t=nx; continue; }
    if (!fw){
      fw = newFw();
      if (e.t===NEG){ for (let w=0; w<1500; w++) runPass(fw, -2 + w*LOOP_T, -1); i=0; }   // warm-up: the unit has been running for a while
      else { const b={kind:'boot', t0:e.t, t1:e.t+BOOT_T}; passes.push(b); t=b.t1; i=0;
        const off=nextAfter(D.h.pwr,e.t); if (off<b.t1){ b.t1=off; t=off; fw=null; } continue; }
    }
    const p = runPass(fw, t, i++);
    const off = nextAfter(D.h.pwr, t);
    if (off < p.t1){ p.t1=off; fw=null; }
    passes.push(p); t=p.t1;
  }
  SCHED = {passes}; return SCHED;
}
function passAt(t){ const ps=schedule().passes; let lo=0, hi=ps.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; } return ps[lo]; }
function stepAt(t){ const p=passAt(t); if (p.kind!=='pass') return {pass:p, step:-1}; const c=(t-p.t0)/TCY; let k=0; for (let j=0;j<STEPS.length;j++) if (c>=STEP_CYC0[j]) k=j; return {pass:p, step:k}; }
/* LEDs at time t */
function ledsAt(t){
  const p=passAt(t), o={pwr:0, sd:0, hd:0, err:0, aes:[0,0,0,0], dolby:[0,0,0,0,0,0], casc:[0,0]};
  if (p.kind==='off') return o;
  o.pwr=1;
  if (p.kind==='boot'){ o.err=1; return o; }        // port_init: PORTE = 0x23 → PE5 (ERR) high until leds_refresh
  const L=p.s.led; o.sd=L.sd; o.hd=L.hd; o.err=L.err; o.aes=L.aes.slice(); return o;
}
function pb7At(t){ const p=passAt(t); if (p.kind!=='pass') return 0; return p.s.PB7; }   // port_init: PORTB = 0x7F → PB7 low through boot
function embedding(t){ return pwrOn(t) && configured(t) && sdiLocked(t) && pb7At(t)===1; }

/* ---------------- FPGA audio routing (pod32_audio_router.vhd, sw16x8.vhd) ---------------- */
function routeFromDips(d){
  // sel(1:0) = {DIP1,DIP2} … sel(11:10) = {DIP11,DIP12}; "11" (Reserved) falls back to embedded in the VHDL
  const sel = n => (dipOn(d,2*n-1)<<1) | dipOn(d,2*n);
  const r = [];
  for (let p=1;p<=4;p++){ const s=sel(p); r.push(s===1?{kind:'src',k:p}:s===2?{kind:'dir',k:p}:{kind:'emb',n:p,res:s===3}); }
  const g3=sel(5), g4=sel(6);
  [[5,1],[6,2]].forEach(([n,k])=> r.push(g3===1?{kind:'src',k}:g3===2?{kind:'dir',k}:{kind:'emb',n,res:g3===3}));
  [[7,3],[8,4]].forEach(([n,k])=> r.push(g4===1?{kind:'src',k}:g4===2?{kind:'dir',k}:{kind:'emb',n,res:g4===3}));
  return { pairs:r, outHi: dipOn(d,13) };
}
function routeAt(t){ const p=passAt(t); if (p.kind!=='pass' || !p.s.fpgaOut) return null; return routeFromDips((p.s.fpgaOut[0]<<8)|p.s.fpgaOut[1]); }
function pairStatus(src, t){
  const v = sdiLocked(t)? VF[valAt(D.h.sdi,t)] : null;
  const bits = v && !v.hd ? 20 : 24;
  if (src.kind==='emb'){ const g=Math.ceil(src.n/2); const has=D.grp[g-1];
    return { label:`embedded AES${src.n}${src.res?' (DIPs “Reserved” → embedded)':''}`, ok:has, note: has? `passes through from input group ${g}` : `input has no group ${g} → silence`, tone: has? {f:1000*src.n/2+500, a:0.1}:null }; }
  const s = valAt(D.h.aes[src.k-1], t), lk = aesLocked(src.k-1, t);
  const base = src.kind==='src'? `ext AES${src.k} via AD1895 SRC` : `ext AES${src.k}, SRC disabled`;
  if (s==='none' || !lk) return { label:base, ok:false, note: s==='none'?'nothing plugged → CS8416 mutes (HOLD = zeros) → silence':'CS8416 still locking → zeros', tone:null };
  const tone = {f:250*src.k+250, a:0.125};
  if (src.kind==='src'){
    if (s==='dolbyE') return { label:base, ok:false, note:'Dolby E is data: the SRC resamples it and destroys it', tone:{noise:true} };
    return { label:base, ok:true, note:`${AES_SRC[s].fs/1000|0}${s==='44'?'.1':''} kHz → 48 kHz locked to the video${bits===20?' · cut to 20 bits (SD)':''}`, tone };
  }
  if (s==='48s') return { label:base, ok:true, note:'bit-exact (input already locked to the video)'+(bits===20?' · cut to 20 bits (SD)':''), tone };
  if (s==='dolbyE') return { label:base, ok:bits===24, note: bits===24? 'Dolby E passes bit-exact' : 'SD embeds only 20 bits: a 20-bit Dolby E stream survives, 24-bit does not ('+inf+')', tone:{noise:true} };
  if (s==='48a') return { label:base, ok:false, note:'not locked to video: one sample slips about every 0.35 s ('+inf+')', tone };
  return { label:base, ok:false, note:`${AES_SRC[s].fs/1000} kHz cannot go out at 48 kHz without the SRC: wrong pitch / dropouts (${inf})`, tone:{noise:true} };
}
function outputAt(t){
  if (!pwrOn(t)) return {state:'off'};
  if (!sdiLocked(t)) return {state:'nosdi'};
  if (!configured(t)) return {state:'config'};
  const r = routeAt(t); if (!r) return {state:'config'};
  const emb = pb7At(t)===1;
  const pairs = r.pairs.map(s=>pairStatus(s,t));
  return { state: emb? 'run':'reset', route:r, pairs, aesOut:[0,1,2,3].map(k=> r.outHi? k+4 : k) };
}
function sampleOf(st, t){ if (!st || !st.tone) return 0; if (st.tone.noise){ const n=Math.floor(t*48000); return ((Math.sin(n*12.9898)*43758.5453)%1)*0.9; } const n=Math.floor(t*48000); return st.tone.a*Math.sin(2*Math.PI*st.tone.f*n/48000); }

/* ---------------- user actions ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({ t:SIM.t, name, trace:tr }); if (D.log.length>60) D.log.length=60;
  SKEY=''; SIM.refresh();
}
const A = {
  dip(n){ const t=SIM.t, old=dipAt(t), nv = old ^ (1<<(16-n)); setAt(D.h.dip, t, nv);
    act(`DIP${n} → ${dipOn(nv,n)?'ON (up)':'OFF (down)'}`, tr=>{
      tr(`The switch is on POD32-2 (SW${n<=8?2:3}, 219-8MS); the FPGA reads it on pin_h5_${n} and reports it in Reg1 bit ${32-n} (byte ${n<=8?0:1}).`);
      tr(`ALTERA_write brings it in as ALTERA_BUFFER_in[${n<=8?0:1}] = 0x${hex2(n<=8?nv>>8:nv&255)} on the next pass (≈${(LOOP_T*1e3).toFixed(2)} ms).`);
      tr(`DEBOUNCE_SWITCHES: in[] ≠ dip_switch → dip_switch_counter++ each pass; only when it passes DIP_SWITCH_CONSTANT (100) is the new value latched — about ${(101*LOOP_T*1e3).toFixed(0)} ms.`);
      tr('The counter is never cleared when the switch goes back, so earlier wobbles count towards the next change (see Findings).');
      tr(`ALTERA_SORT then puts dip_switch1/2 into out[0..1]; the FPGA latches it on STROBE_WRITE and pod32_audio_router re-routes at once.`);
      tr(describeDip(n, nv));
    }); },
  plugSdi(on){ const t=SIM.t; setAt(D.h.sdi, t, on? D.sdiFmt : null);
    act(on? `Connect SDI INPUT (${VF[D.sdiFmt].name})` : 'Disconnect SDI INPUT', tr=>{
      if (on){
        tr(`GS1574 equalises, GS1559 locks (≈${C.LOCK_SDI*1e3} ms ${inf}) and raises lock_59; the FPGA sets Reg1 bit 15${VF[D.sdiFmt].hd?'':' and bit 14 (SD)'}${VF[D.sdiFmt].pal?' and bit 13 (PAL)':''}${VF[D.sdiFmt].ntsc?' and bit 12 (NTSC)':''}.`);
        tr('DEBOUNCE_SWITCHES copies in[2] into sdi_lock_status straight away; leds_refresh lights '+(VF[D.sdiFmt].hd?'HD (PE4)':'SD (PE2)')+' on the next pass and ERR (PE5) goes out.');
        tr(`RESET_VECTOR keeps PB7 low until format has read the same for FORMAT_CONSTANT (200) passes, then counts reset_counter down from 255: the embedder starts ≈ ${((C.FORMAT+C.RV+3)*LOOP_T*1e3).toFixed(0)} ms after lock.`);
      } else {
        tr('lock_59 drops → Reg1 bit 15 = 0 → PROCESS_SDI_LOCK_STATUS: CD = NO_LOCK, format_stable = NO.');
        tr('leds_refresh: case 0 → ERR (PE5) on, SD/HD off. RESET_VECTOR: PB7 low, reset_enable = YES, reset_counter = 255.');
        tr('With no input clock there is no SDI output either (GS1531 is clocked by pclk_out from the input) '+inf+'.');
      }
    }); },
  setFmt(f){ D.sdiFmt=f; if (valAt(D.h.sdi,SIM.t)) { const t=SIM.t; setAt(D.h.sdi,t,f); act('Input format → '+VF[f].name, tr=>{ tr('The source changes format: the GS1559 loses lock and re-locks (≈20 ms '+inf+').'); tr('The firmware goes through NO_LOCK, so RESET_VECTOR runs the full 200 + 255-pass sequence again.'); }); } else SIM.refresh(); },
  plugAes(k, on){ const t=SIM.t, s=on? D.aesSel[k] : 'none'; setAt(D.h.aes[k], t, s);
    act(on? `Connect AES IN ${k+1}: ${AES_SRC[s].name}` : `Disconnect AES IN ${k+1}`, tr=>{
      tr(`PE-65612 transformer → CS8416 U${[18,19,21,24][k]} RXP0. ${on?`The receiver PLL locks (≈${C.LOCK_AES*1e3} ms ${inf}) and clears UNLOCK in register 0x0C.`:'UNLOCK is set; with Control1 = 0x14 (HOLD = 01) the receiver outputs zeros.'}`);
      tr(`CS8416_READ_LOCK_ALL → status bit ${k} = ${on?0:1}; INVERT_DATA → Astatus bit ${k} = ${on?1:0}.`);
      tr(`leds_refresh lights AES INPUTS ${k+1} (${['PE6','PD0','PA7','PA6'][k]}) one pass later, because it runs before the read.`);
      if (on) tr(`I²S (24-bit, CS8416 master: reg 5 = 0x85) goes to both AD1895 U${[17,20,22,23][k]} (SRC) and straight to the FPGA (SDATA_IN${k+1}).`);
    }); },
  setAesSel(k,s){ D.aesSel[k]=s; if (valAt(D.h.aes[k],SIM.t)!=='none') A.plugAes(k,true); else SIM.refresh(); },
  power(){ const t=SIM.t, on=!pwrOn(t); setAt(D.h.pwr, t, on);
    act(on?'Power on':'Power off', tr=>{
      if (!on){ tr('All LEDs go dark. The FPGA loses its configuration.'); return; }
      tr('main(): init_devices → port_init (PORTE = 0x23 lights ERR), timer0_init (1 kHz overflow, does nothing), SEI.');
      tr(`ALTERA_RESET(1000) pulses PG2; wait(5000)×2; init_CS8416 releases PG0 at ${(T_CS_OUT*1e3).toFixed(1)} ms and writes regs 0,1,4,5,6 to all four receivers at once.`);
      tr(`PB7 (FPGA internal reset) is already low from port_init (PORTB = 0x7F); main() pulses it low again for wait(5000), sets it high, and the loop starts at ${(BOOT_T*1e3).toFixed(1)} ms — where RESET_VECTOR pulls it low again until the SDI is stable.`);
      tr(`Meanwhile the EP2C35 loads from the EPCS16 (≈${C.CONF_T*1e3} ms ${inf}). Until it is done ALTERA_write reads 0xFF (pull-up on PC7), so the firmware sees “SDI locked, SD, PAL” and all DIPs ON (${inf}).`);
    }); },
  setGrp(g,on){ D.grp[g]=on; act(`Incoming SDI ${on?'carries':'does not carry'} audio group ${g+1}`, tr=>tr(`Group ${g+1} = embedded AES${2*g+1}/AES${2*g+2} in the source (DID ${hex3(anc(DID_HD[g]))} HD / ${hex3(anc(DID_SD[g]))} SD).`)); },
  reset(){ D.h=fresh(); D.grp=[true,true,false,false]; D.sdiFmt='1080i59'; D.aesSel=['48a','48s','dolbyE','44']; D.log=[]; SKEY=''; SIM.refresh(); },
};
function describeDip(n, v){
  const r=routeFromDips(v);
  if (n===13) return `DIP13 ${dipOn(v,13)?'ON: AES OUT 1–4 carry embedded AES5–8 (groups 3/4)':'OFF: AES OUT 1–4 carry embedded AES1–4 (groups 1/2)'} — sw16x8 group_sel.`;
  if (n>=14) return `DIP${n} is Reserved (dipswitch.doc). The FPGA receives it but nothing uses it.`;
  const p = n<=8? Math.ceil(n/2) : n<=10? 5 : 7;
  const s = r.pairs[p-1];
  return `Output AES${p}${p>=5?'/'+(p+1):''} source: ${s.kind==='emb'?'embedded (from the input)'+(s.res?' — both ON is “Reserved”, the VHDL falls back to embedded':''):s.kind==='src'?'external AES'+s.k+' through the SRC':'external AES'+s.k+' with the SRC disabled'}.`;
}

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* POD32-FRONT&REAR(FINAL CURVE).pdf (CorelDRAW export of the Jun 25 2014 silk) rendered at 200 dpi.
   The panels are drawn rotated on the page; they were cut between the red/black outlines, rotated 90°,
   and recoloured: front GREEN (52,168,83), front WHITE and rear WHITE (240,240,236). Drill crosshairs,
   cut-out outlines and the frame were removed. Image pixels are the SVG units (front 1719×323, rear 1716×324). */
const ASSET = 'siumulation-plugins/assets/';
const LEDX = { pwr:302, sd:564, hd:614, err:664, aes:[784,834,884,934], dolby:[1054,1104,1154,1204,1324,1374], casc:[1474,1524] };
const LEDY = 219;
const COL = { g:'#6dff5a', y:'#ffd23a', r:'#ff3b2f', p:'#d8ff7a' };
function frontSVG(t, opts){
  opts=opts||{};
  const L = ledsAt(t);
  const led = (x,on,col,tip)=>`<g><circle cx="${x}" cy="${LEDY}" r="15" fill="#08090a"/><circle cx="${x}" cy="${LEDY}" r="11" fill="${on?col:'#2b2d22'}" ${on?'filter="url(#p32glow)"':''}/><circle cx="${x-3}" cy="${LEDY-4}" r="3.5" fill="#fff" opacity="${on?.55:.12}"/>${tip?`<title>${tip}</title>`:''}</g>`;
  const on = pwrOn(t);
  return `<svg viewBox="0 0 1719 323" role="img" aria-label="POD32 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p32glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1719" height="323" rx="10" fill="#141516"/>
    <image href="${ASSET}pod32-front-green.png" width="1719" height="323"/>
    <image href="${ASSET}pod32-front-white.png" width="1719" height="323"/>
    <g class="p32pwr" style="cursor:pointer"><rect x="128" y="50" width="112" height="164" rx="10" fill="#060707" stroke="#2c2f31" stroke-width="2"/>
      <rect x="142" y="${on?62:118}" width="84" height="84" rx="8" fill="#1b1d1f" stroke="#3c4043" stroke-width="2"/><rect x="150" y="${on?70:126}" width="68" height="10" rx="4" fill="#2a2d30"/>
      <title>Power switch (click)</title></g>
    ${led(LEDX.pwr,L.pwr,COL.p,'Power')}
    ${led(LEDX.sd,L.sd,COL.g,'SDI SD — PE2 (led_sd)')}${led(LEDX.hd,L.hd,COL.g,'SDI HD — PE4 (led_hd)')}${led(LEDX.err,L.err,COL.r,'SDI ERR — PE5 (led_sdi_err)')}
    ${L.aes.map((v,k)=>led(LEDX.aes[k],v,COL.y,`AES INPUTS ${k+1} — ${['PE6','PD0','PA7','PA6'][k]}`)).join('')}
    ${LEDX.dolby.map((x,k)=>led(x,0,k===4?COL.g:COL.y,`DOLBY ${['1','2','3','4','E','DD'][k]} — ${['PA5','PA4','PA3','PA2','PA1','PA0'][k]}, never driven (no Dolby card)`)).join('')}
    ${LEDX.casc.map((x,k)=>led(x,0,k?COL.r:COL.y,`CASCADE ${k?'ERR — PG4':'ON — PG3'}, never driven`)).join('')}
    ${[53,1667].map(x=>`<circle cx="${x}" cy="161" r="15" fill="#8d9093" stroke="#55585b" stroke-width="2"/><path d="M${x-9} ${161} h18 M${x} ${152} v18" stroke="#4a4d50" stroke-width="3"/>`).join('')}
    ${opts.hot||''}
  </svg>`;
}
const RJ = { db9:[93,54,93,154], bnc:[[261,'in'],[411,'o1'],[561,'o2']], dip:[[276,32],[476,32]],
  aesOut:[[755.5,60],[880.5,60],[755.5,185],[880.5,185]], aesIn:[[1005.5,60],[1130.5,60],[1005.5,185],[1130.5,185]], iec:[1359,34,248,216],
  screws:[[240,60],[680,60],[680,185],[1205,60],[1205,185],[943,122],[50,162],[1664,52],[1664,162]] };
function rearSVG(t){
  const d = dipAt(t), out = outputAt(t);
  const sdiIn = valAt(D.h.sdi,t);
  const bnc = (x,y,r,live,cls,data,tip,plug)=>`<g class="${cls||''}" ${data||''} style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${r}" fill="#a9acae" stroke="#5d6062" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r*0.68}" fill="#d9dbdc" stroke="#8a8d8f"/><circle cx="${x}" cy="${y}" r="${r*0.22}" fill="#c9a43a"/>
      ${plug?`<circle cx="${x}" cy="${y}" r="${r*0.72}" fill="#2a2c2e" stroke="#555" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r*0.3}" fill="#c4c6c8"/>`:''}
      ${live!==null?`<circle cx="${x+r*0.78}" cy="${y-r*0.78}" r="8" fill="${live?'var(--accent)':'#555'}"/>`:''}<circle cx="${x}" cy="${y}" r="${r+6}" fill="transparent"><title>${tip}</title></circle></g>`;
  let s = `<svg viewBox="0 0 1716 324" role="img" aria-label="POD32 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1716" height="324" rx="10" fill="#141516"/>`;
  RJ.screws.forEach(([x,y])=> s+=`<circle cx="${x}" cy="${y}" r="13" fill="#8d9093" stroke="#55585b" stroke-width="2"/><path d="M${x-8} ${y} h16 M${x} ${y-8} v16" stroke="#4a4d50" stroke-width="3"/>`);
  // CONTROL DB9 (RS-485, ADM3485) with hex standoffs
  const [dx,dy,dw,dh]=RJ.db9;
  s += `<g class="p32db9" style="cursor:pointer"><rect x="${dx-6}" y="${dy-4}" width="${dw+12}" height="${dh+8}" rx="12" fill="#7d6e2e" stroke="#4d4419" stroke-width="2"/>
    <path d="M${dx+14} ${dy+10} h${dw-28} l10 ${dh-20} h${-dw+8} z" fill="#cfd2d4" stroke="#7a7d80" stroke-width="2"/>
    ${[0,1,2,3,4].map(i=>`<circle cx="${dx+dw/2-14}" cy="${dy+28+i*25}" r="5" fill="#3a3c3e"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="${dx+dw/2+14}" cy="${dy+40+i*25}" r="5" fill="#3a3c3e"/>`).join('')}
    <title>CONTROL (DB9, RS-485 via ADM3485). Wired to UART0 (PE0/PE1) but the v100 firmware never sets the UART up.</title></g>`;
  [[140,32],[140,230]].forEach(([x,y])=> s+=`<polygon points="${[0,1,2,3,4,5].map(a=>`${x+14*Math.cos(a*Math.PI/3)},${y+14*Math.sin(a*Math.PI/3)}`).join(' ')}" fill="#b8babc" stroke="#6d7072" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="#4b4e50"/>`);
  // SDI BNCs
  s += bnc(261,199.5,44, !!sdiIn, 'p32sdi','', sdiIn? `INPUT: ${VF[sdiIn].name} (click to unplug)`:'INPUT: click to plug in SDI', !!sdiIn);
  s += bnc(411,199.5,44, out.state==='run'||out.state==='reset', '','', 'SDI 1 out (reclocked, with embedded audio) — GS1531', false);
  s += bnc(561,199.5,44, out.state==='run'||out.state==='reset', '','', 'SDI 2 out (GS1528 cable driver)', false);
  // DIP switches (POD32-2 SW2 = DIP1–8, SW3 = DIP9–16), UP = ON
  RJ.dip.forEach(([x0,y0],bank)=>{
    s += `<rect x="${x0-4}" y="${y0-4}" width="176" height="56" rx="3" fill="#1d2f6b" stroke="#0e1838" stroke-width="2"/>`;
    for (let i=0;i<8;i++){ const n=bank*8+i+1, on=dipOn(d,n), x=x0+3+i*21;
      s += `<g class="p32dip" data-n="${n}" style="cursor:pointer"><rect x="${x}" y="${y0}" width="17" height="48" rx="2" fill="#0d1430"/><rect x="${x+2}" y="${on?y0+2:y0+24}" width="13" height="22" rx="2" fill="#f2f2ee"/><title>DIP${n}: ${on?'ON':'OFF'} (click)</title></g>`; }
    s += `<text x="${x0}" y="${y0-8}" font-size="13" fill="#e8e8e2">ON</text><text x="${x0+150}" y="${y0-8}" font-size="12" fill="#e8e8e2">${bank?'9–16':'1–8'}</text>`;
  });
  // AES BNCs
  RJ.aesOut.forEach(([x,y],k)=>{ const src = out.state==='run'? out.pairs[out.aesOut[k]] : null;
    s += bnc(x,y,50, src? src.ok : null, 'p32aout', `data-k="${k}"`, `AES OUT ${k+1}: ${src? 'embedded AES'+(out.aesOut[k]+1)+' — '+src.label : 'nothing (embedder not running)'} (click to watch it)`, false); });
  RJ.aesIn.forEach(([x,y],k)=>{ const v=valAt(D.h.aes[k],t);
    s += bnc(x,y,50, v!=='none'? aesLocked(k,t):null, 'p32ain', `data-k="${k}"`, v!=='none'? `AES IN ${k+1}: ${AES_SRC[v].name} (click to unplug)` : `AES IN ${k+1}: click to plug in ${AES_SRC[D.aesSel[k]].name}`, v!=='none'); });
  // IEC inlet
  const [ix,iy,iw,ih]=RJ.iec;
  s += `<g class="p32iec" style="cursor:pointer"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="12" fill="#0c0d0e" stroke="#3a3d40" stroke-width="2"/><rect x="${ix+22}" y="${iy+18}" width="70" height="${ih-36}" rx="8" fill="#1a1c1e" stroke="#333"/>
    <rect x="${ix+120}" y="${iy+30}" width="104" height="${ih-60}" rx="10" fill="#1f2123"/>${[[ix+150,iy+62],[ix+150,iy+150],[ix+196,iy+108]].map(([x,y])=>`<rect x="${x-14}" y="${y-6}" width="28" height="12" fill="#c8cacc"/>`).join('')}
    <title>IEC inlet with integral fuse (Front&Rear Identification) — click for power</title></g>`;
  s += `<image href="${ASSET}pod32-rear-white.png" width="1716" height="324"/></svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.p32pwr,.p32iec').forEach(g=> g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p32dip').forEach(g=> g.addEventListener('click', ()=>A.dip(+g.dataset.n)));
  root.querySelectorAll('.p32sdi').forEach(g=> g.addEventListener('click', ()=>A.plugSdi(!valAt(D.h.sdi,SIM.t))));
  root.querySelectorAll('.p32ain').forEach(g=> g.addEventListener('click', ()=>{ const k=+g.dataset.k; A.plugAes(k, valAt(D.h.aes[k],SIM.t)==='none'); }));
  root.querySelectorAll('.p32aout').forEach(g=> g.addEventListener('click', ()=>{ D.watchOut=+g.dataset.k; SIM.refresh(); }));
  root.querySelectorAll('.p32db9').forEach(g=> g.addEventListener('click', ()=>act('Look at CONTROL (DB9)', tr=>{ tr('CPU_RX/CPU_TX (U11 pins 2/3 = PE0/PE1) go to ADM3485 U8/U10; their enables go to PF2/PF3.'); tr('pod32v100.c never writes UCSR0B or UBRR0, and DDRF = 0x00: the port is dead in v100. The silk says nothing about it; the identification sheet says “Reserved for future use”.'); })));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">SDI format <select id="p32fmt">${Object.keys(VF).map(k=>`<option value="${k}" ${k===D.sdiFmt?'selected':''}>${VF[k].name}</option>`).join('')}</select></label>
    <button data-p32="sdi">${valAt(D.h.sdi,SIM.t)?'Unplug':'Plug in'} SDI</button>
    <span class="small muted" style="margin-left:6px">Groups in the source:</span>${[0,1,2,3].map(g=>`<label class="small"><input type="checkbox" data-grp="${g}" ${D.grp[g]?'checked':''}> ${g+1}</label>`).join('')}
    <span style="flex-basis:100%"></span>
    ${[0,1,2,3].map(k=>`<label class="small">IN ${k+1} <select data-aes="${k}">${Object.keys(AES_SRC).filter(x=>x!=='none').map(x=>`<option value="${x}" ${x===D.aesSel[k]?'selected':''}>${AES_SRC[x].name}</option>`).join('')}</select></label>`).join('')}
    <span style="flex-basis:100%"></span>
    <button data-p32="t10">+10 ms</button><button data-p32="t100">+100 ms</button><button data-p32="t500">+500 ms</button><button data-p32="rst">Start over</button>
    <span class="small muted">Keys: 1–8 = DIP1–8 · Q–I = DIP9–16 · S = SDI · A = AES IN 1 · P = power</span></div>
    <div class="small muted" style="margin-top:4px">Click the rear DIP switches, the INPUT BNC, the AES IN BNCs (plug/unplug) and an AES OUT BNC (to watch it). The power rocker and IEC inlet switch the unit. Each action happens at the playhead; move the playhead on to see the firmware react.</div>`;
}
function bindControls(m){
  const f=m.querySelector('#p32fmt'); if (f) f.onchange=e=>A.setFmt(e.target.value);
  m.querySelectorAll('[data-grp]').forEach(c=> c.onchange=()=>A.setGrp(+c.dataset.grp, c.checked));
  m.querySelectorAll('[data-aes]').forEach(c=> c.onchange=()=>A.setAesSel(+c.dataset.aes, c.value));
  const map={ sdi:()=>A.plugSdi(!valAt(D.h.sdi,SIM.t)), t10:()=>SIM.seek(SIM.t+0.01), t100:()=>SIM.seek(SIM.t+0.1), t500:()=>SIM.seek(SIM.t+0.5), rst:()=>{ A.reset(); SIM.seek(0); } };
  m.querySelectorAll('[data-p32]').forEach(b=> b.onclick=()=>map[b.dataset.p32]());
}
document.addEventListener('keydown', e=>{
  if (!window.__pod32Active || e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), row='qwertyui';
  if (k>='1' && k<='8'){ A.dip(+k); e.preventDefault(); }
  else if (row.includes(k)){ A.dip(9+row.indexOf(k)); e.preventDefault(); }
  else if (k==='s'){ A.plugSdi(!valAt(D.h.sdi,SIM.t)); e.preventDefault(); }
  else if (k==='a'){ A.plugAes(0, valAt(D.h.aes[0],SIM.t)==='none'); e.preventDefault(); }
  else if (k==='p'){ A.power(); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function segs(c,X,t0,t1,y,h,valFn,colFn,lblFn){
  const ps=schedule().passes; let cur=null, a=t0;
  const flush=(b)=>{ if (cur===null || cur===undefined) return; const col=colFn(cur); if (!col) return; c.fillStyle=col; c.globalAlpha=.75; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)),h-8); c.globalAlpha=1;
    if (lblFn && X(b)-X(a)>60){ c.fillStyle=SIM.css('--ink'); c.font='10.5px '+SIM.css('--mono'); c.fillText(String(lblFn(cur)).slice(0,Math.floor((X(b)-X(a))/6.5)), X(a)+4, y+h/2+4); } };
  for (const p of ps){ if (p.t1<t0 || p.t0>t1) continue; const v=valFn(p); const tt=Math.max(t0,p.t0); if (v!==cur){ flush(tt); cur=v; a=tt; } }
  flush(t1);
}
function lanes(){
  const css=n=>SIM.css(n), fmt=valAt(D.h.sdi,SIM.t), vf=fmt?VF[fmt]:null;
  const ls=[];
  ls.push({label:'SDI in: fields / lines', h:30, draw(c,X,t0,t1,y,h){
    const ps=D.h.sdi; let any=false;
    for (let i=0;i<ps.length;i++){ const e=ps[i]; const a=Math.max(t0,e.t===NEG?t0:e.t), b=Math.min(t1, i+1<ps.length?ps[i+1].t:t1); if (b<=a || !e.v) continue; any=true; const v=VF[e.v];
      c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip();
      if (t1-t0 < 60*v.H) SIM.pulses(c,X,a,b,y+h*0.45,h*0.55,v.H,0,v.H*0.12,css('--ink2'),'lines');
      SIM.pulses(c,X,a,b,y,h*(t1-t0<60*v.H?0.5:1),v.field,0,v.H*(v.hd?22:20),css('--accent2'),'fields · '+v.name); c.restore(); }
    if (!any){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no SDI connected', X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:'GS1559 lock_59 → Reg1 bit 15', h:20, draw(c,X,t0,t1,y,h){ segs(c,X,t0,t1,y,h, p=> sdiLocked(Math.max(p.t0,0))?1:0, v=>v?css('--accent'):null, ()=> 'locked'); }});
  ls.push({label:'HANC audio packets (48 kHz)', h:28, draw(c,X,t0,t1,y,h){
    if (!vf){ return; }
    const span=t1-t0; const ok=embedding((t0+t1)/2);
    if (span > 300*vf.H){ c.fillStyle=css('--ink2'); c.font='11px '+css('--mono'); segs(c,X,t0,t1,y,h,p=>embedding(p.t0+1e-6)?1:0,v=>v?css('--warn'):null,()=>`embedding: ${vf.hd?'1–2':'3–4'} samples per line per group, ${Math.round(48000*vf.H*100)/100} on average`); return; }
    const n0=Math.floor(t0/vf.H), n1=Math.ceil(t1/vf.H);
    for (let n=n0;n<=n1;n++){ const tl=n*vf.H; if (!embedding(tl)) continue; const ns=Math.floor((n+1)*vf.spl)-Math.floor(n*vf.spl);
      c.fillStyle=css('--warn'); const w=Math.max(2,X(tl+vf.H*0.08)-X(tl)); c.fillRect(X(tl),y+4,w,h-8);
      if (X(tl+vf.H)-X(tl)>34){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(ns+' smp', X(tl)+w+3, y+h/2+4); } }
    if (!ok){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no packets: embedder not running', X(t0)+6, y+h/2+4); }
  }});
  for (let k=0;k<4;k++) ls.push({label:`AES IN ${k+1} → CS8416 lock`, h:18, draw(c,X,t0,t1,y,h){
    const hist=D.h.aes[k];
    for (let i=0;i<hist.length;i++){ const e=hist[i]; if (e.v==='none') continue; const a=Math.max(t0, e.t===NEG?t0:e.t), b=Math.min(t1, i+1<hist.length?hist[i+1].t:t1); if (b<=a) continue;
      const la=Math.max(a, e.t===NEG?a:e.t+C.LOCK_AES);
      c.fillStyle=css('--grid'); c.fillRect(X(a),y+4,X(Math.min(la,b))-X(a),h-8);
      if (la<b) { const fs=AES_SRC[e.v].fs; c.save(); c.beginPath(); c.rect(X(la),y,X(b)-X(la),h); c.clip(); SIM.pulses(c,X,la,b,y,h,1/fs,0,0.5/fs, e.v==='dolbyE'?css('--bad'):css('--accent'), `${AES_SRC[e.v].name} frames`); c.restore(); } }
  }});
  ls.push({label:'AD1895 out → FPGA (48 kHz LRCK)', h:18, draw(c,X,t0,t1,y,h){ if (!vf) return; SIM.pulses(c,X,t0,t1,y,h,1/48000,0,0.5/48000,css('--accent2'),'video-locked 48 kHz samples'); }});
  ls.push({label:'ATmega128 main loop', h:34, draw(c,X,t0,t1,y,h){
    const ps=schedule().passes, pxPass=X(t0+LOOP_T)-X(t0); let shown=0;
    for (const p of ps){ if (p.t1<t0 || p.t0>t1) continue;
      if (p.kind==='off'){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('power off', Math.max(X(p.t0),X(t0))+4, y+h/2+4); continue; }
      if (p.kind==='boot'){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(p.t0),y+3,X(p.t1)-X(p.t0),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('main(): init, ALTERA_RESET, wait(5000)×4, init_CS8416', Math.max(X(p.t0),X(t0))+4, y+h/2+4); continue; }
      shown++;
      if (pxPass>70){ STEPS.forEach((s,j)=>{ const a=p.t0+STEP_CYC0[j]*TCY, b=a+s[1]*TCY; c.fillStyle= j===5?css('--accent2'): j===3?css('--warn'): css('--accent'); c.globalAlpha=j%2?.55:.8; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h-6); c.globalAlpha=1;
          if (X(b)-X(a)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].slice(0,Math.floor((X(b)-X(a))/6)), X(a)+3, y+h/2+3); } }); }
      else { c.fillStyle= p.latched? css('--bad') : [css('--accent'),css('--accent2')][p.i%2]; c.globalAlpha=.75; c.fillRect(X(p.t0),y+3,Math.max(1,X(p.t1)-X(p.t0)-0.5),h-6); c.globalAlpha=1; }
    }
    if (pxPass<3){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${shown} passes of ≈${(LOOP_T*1e3).toFixed(3)} ms (${LOOP_CYC} cycles, ${'inferred'}); red = DIPs latched`, X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:'SPI: CS8416 0x0C reads (PD1–PD7)', h:18, draw(c,X,t0,t1,y,h){ const ps=schedule().passes; c.fillStyle=css('--warn'); for (const p of ps){ if (p.kind!=='pass'||p.t1<t0||p.t0>t1) continue; const a=p.t0+STEP_CYC0[3]*TCY; c.fillRect(X(a),y+4,Math.max(1,X(a+STEPS[3][1]*TCY)-X(a)),h-8); } }});
  ls.push({label:'ALTERA_write: 128 bits each way', h:18, draw(c,X,t0,t1,y,h){ const ps=schedule().passes; c.fillStyle=css('--accent2'); for (const p of ps){ if (p.kind!=='pass'||p.t1<t0||p.t0>t1) continue; const a=p.t0+STEP_CYC0[5]*TCY; c.fillRect(X(a),y+4,Math.max(1,X(a+STEPS[5][1]*TCY)-X(a)),h-8); } }});
  ls.push({label:'dip_switch_counter (0…100)', h:30, draw(c,X,t0,t1,y,h){ const ps=schedule().passes; c.fillStyle=css('--warn');
    for (const p of ps){ if (p.kind!=='pass'||p.t1<t0||p.t0>t1) continue; const v=p.s.dcnt/C.DIP; if (v>0) c.fillRect(X(p.t0), y+h-3-v*(h-6), Math.max(1,X(p.t1)-X(p.t0)), v*(h-6)); if (p.latched){ c.fillStyle=css('--bad'); c.fillRect(X(p.t0)-1,y+2,3,h-4); c.fillStyle=css('--warn'); } } }});
  ls.push({label:'RESET_VECTOR: format / reset counters', h:30, draw(c,X,t0,t1,y,h){ const ps=schedule().passes;
    for (const p of ps){ if (p.kind!=='pass'||p.t1<t0||p.t0>t1) continue; const s=p.s; let v=0, col=css('--accent2');
      if (!s.fstable && s.CD){ v=s.fc/C.FORMAT; col=css('--accent2'); } else if (s.fstable && s.ren && s.rc>0){ v=s.rc/C.RV; col=css('--warn'); }
      if (v>0){ c.fillStyle=col; c.fillRect(X(p.t0), y+h-3-v*(h-6), Math.max(1,X(p.t1)-X(p.t0)), v*(h-6)); } }
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('blue: format_counter ↑ 200 · orange: reset_counter ↓ from 255', X(t0)+4, y+10); }});
  ls.push({label:'PB7 = ALTERA12 (FPGA reset, low = held)', h:20, draw(c,X,t0,t1,y,h){ segs(c,X,t0,t1,y,h, p=> p.kind==='pass'? p.s.PB7 : p.kind==='boot'? 2 : null, v=> v===1?css('--accent'): v===0?css('--bad'): v===2?css('--warn'):null, v=> v===1?'high: running':v===0?'low: embedder held in reset':'boot'); }});
  ls.push({label:'EP2C35 configured (EPCS16)', h:18, draw(c,X,t0,t1,y,h){ segs(c,X,t0,t1,y,h, p=> p.kind==='off'?null: configured(p.t0+1e-7)?1:0, v=> v?css('--accent2'):css('--warn'), v=> v?'user mode':'loading configuration ('+'inferred'+')'); }});
  ls.push({label:'Output groups (router state)', h:24, draw(c,X,t0,t1,y,h){ segs(c,X,t0,t1,y,h, p=>{ const o=outputAt(Math.min(p.t1-1e-7, Math.max(p.t0,0))); return o.state==='run'? o.pairs.map(q=>q.ok?'■':'□').join('') + ' AES1–8 · OUT'+(o.route.outHi?'5–8':'1–4') : o.state; }, v=> v==='off'||v==='nosdi'?null: v==='reset'||v==='config'? css('--warn') : css('--accent'), v=>v); }});
  ls.push({label:'LEDs: SD · HD · ERR · AES1–4', h:44, draw(c,X,t0,t1,y,h){
    const rows=[['sd',COL.g],['hd',COL.g],['err',COL.r],[0,COL.y],[1,COL.y],[2,COL.y],[3,COL.y]]; const ps=schedule().passes;
    for (const p of ps){ if (p.t1<t0||p.t0>t1) continue; const L=ledsAt(p.t0+1e-7);
      rows.forEach(([k,col],r)=>{ const on= typeof k==='number'? L.aes[k] : L[k]; if (on){ c.fillStyle=col; c.fillRect(X(p.t0), y+2+r*6, Math.max(1,X(p.t1)-X(p.t0)+0.5), 5); } }); } }});
  return ls;
}

/* ---------------- SD/HD audio data packet at the playhead ---------------- */
function packetAt(t, g){
  const fmt=valAt(D.h.sdi,t); if (!fmt || !embedding(t)) return null;
  const v=VF[fmt], o=outputAt(t); const n=Math.floor(t/v.H), line=(n % v.lines)+1, ns=Math.floor((n+1)*v.spl)-Math.floor(n*v.spl);
  const pa=[o.pairs[2*g], o.pairs[2*g+1]]; const s0=Math.floor(n*v.spl);
  const words=[]; const W=(val,l,cls)=>words.push({v:val,l,cls});
  W(0x000,'ADF','adf'); W(0x3FF,'ADF','adf'); W(0x3FF,'ADF','adf');
  const did=anc((v.hd?DID_HD:DID_SD)[g]); W(did,'DID','h'); const dbn=anc((n%255)+1); W(dbn,'DBN','h');
  if (!v.hd){
    W(anc(12*ns),'DC','h'); let sum=did+dbn+anc(12*ns);
    for (let si=0; si<ns; si++){ const smp=s0+si; for (let ch=0; ch<4; ch++){ const st=pa[ch>>1]; const val=Math.round(sampleOf(st,smp/48000)*((1<<19)-1)); const a=val<0? val+(1<<20) : val;
      const z=(smp%192===0 && ch<2)?1:0, c=0, vbit=0, u=0; let w0=z|(ch<<1)|((a&0x3F)<<3), w1=(a>>6)&0x1FF, w2=((a>>15)&0x1F)|(vbit<<5)|(u<<6)|(c<<7);
      let par=0; [w0,w1,w2&0xFF].forEach((w,i)=>{ for(let b=0;b<(i===2?8:9);b++) par^=(w>>b)&1; }); w2|=par<<8;
      [w0,w1,w2].forEach((w,i)=>{ const ww=(w&0x1FF)|(((w>>8)&1)?0:0x200); sum+=ww; W(ww, `CH${ch+1}${['X','X+1','X+2'][i]}${si?'':''} s${si+1}`, 'u'+ch); }); } }
    W(((sum&0x1FF) | (((sum>>8)&1)?0:0x200)),'CS','cs');
  } else {
    W(anc(0x18),'DC','h'); W(anc(0x40),'CLK','c'); W(anc(0x10),'CLK','c');
    for (let ch=0; ch<4; ch++){ const st=pa[ch>>1]; const val=Math.round(sampleOf(st,s0/48000)*((1<<23)-1)); const a=val<0?val+(1<<24):val;
      for (let i=0;i<4;i++) W(anc((a>>(6*i))&0x3F | (i===0&&s0%192===0?0x40:0)), `CH${ch+1} w${i}`, 'u'+ch); }
    for (let i=0;i<6;i++) W(anc(0),'ECC'+i,'c'); W(0x200,'CS','cs');
  }
  return {v,line,ns,words,g,did,hd:v.hd};
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a DIP switch or plug something into the rear panel. Each step the firmware and FPGA take is listed here.</div>'; }
function routeTable(t){
  const o=outputAt(t);
  if (o.state!=='run') return `<p class="small" style="color:var(--warn)">${{off:'Unit off.',nosdi:'No SDI locked: no output video, no embedding.',config:'FPGA still loading its configuration: no output.',reset:'PB7 low: the FPGA holds the embedder in reset while RESET_VECTOR counts (no new audio packets '+inf+').'}[o.state]}</p>`;
  return `<table class="kv"><tr><th>Output</th><th>Group</th><th>Source (router)</th><th>Result</th></tr>${o.pairs.map((p,i)=>`<tr><td class="mono">AES${i+1}</td><td>${Math.ceil((i+1)/2)}</td><td class="small">${p.label}</td><td class="small" style="color:${p.ok?'var(--accent)':'var(--warn)'}">${p.note}</td></tr>`).join('')}</table>
    <p class="small">AES OUT 1–4 = embedded AES${o.route.outHi?'5–8':'1–4'} (DIP13 ${o.route.outHi?'ON':'OFF'}).</p>`;
}
function viewSim(m){
  window.__pod32Active = true;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Front panel at the playhead', `<div id="fp"></div>`)}
      ${card('Rear panel — DIP switches, SDI and AES jacks are live', `<div id="rp"></div><div id="ctl"></div>`)}
    </div><div>
      ${card('What the firmware and FPGA did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div></div>
    ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
      <p class="small muted">Pass length ≈ ${(LOOP_T*1e3).toFixed(3)} ms is ${inf}: about ${LOOP_CYC.toLocaleString()} cycles at 4.9152 MHz, counted from the bit-bang loops in <span class="mono">pod32v100.s</span>/<span class="mono">altera.s</span> (four 32-bit SPI reads + a 128-bit exchange dominate). The counters (100 / 200 / 255 passes) are from the source, so the delays you see scale with that estimate.</p>`)}
    <div class="grid2">${card('Output stream: where each embedded pair comes from', `<div id="route"></div>`)}${card('Scope: watched AES OUT', `<canvas id="scope"></canvas><div id="sc" class="small mono"></div>`)}</div>
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m);
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    const sb=m.querySelector('[data-p32="sdi"]'); if (sb) sb.textContent=(valAt(D.h.sdi,t)?'Unplug':'Plug in')+' SDI';
    const st=stepAt(t), p=st.pass, s=p.s||{};
    m.querySelector('#insp').innerHTML = p.kind!=='pass'? `<p class="mono">${p.kind==='off'?'Power off':'Booting: main() init sequence ('+SIM.fmtDur(t-p.t0)+' of '+SIM.fmtDur(BOOT_T)+')'}</p>` : `<table class="kv">
      <tr><th>Main-loop pass</th><td class="mono">#${p.i} · ${STEPS[st.step][0]}</td></tr>
      <tr><th>sdi_lock_status</th><td class="mono">0x${hex2(s.sls)} → CD = ${s.CD?'LOCK':'NO_LOCK'}, format = ${FMT_NAME[s.format]}</td></tr>
      <tr><th>RESET_VECTOR</th><td class="mono">format_stable ${s.fstable?'YES':'NO'} · format_counter ${s.fc} · reset_counter ${s.rc}${s.ren?' (counting)':''} · PB7 ${s.PB7?'high':'<b style="color:var(--bad)">low</b>'}</td></tr>
      <tr><th>DIPs (switches / latched)</th><td class="mono">${dipAt(t).toString(2).padStart(16,'0')} / ${(((s.dip1<<8)|s.dip2)>>>0).toString(2).padStart(16,'0')} · counter ${s.dcnt}/100</td></tr>
      <tr><th>Astatus (AES lock)</th><td class="mono">0x${hex2(s.Astatus)} → ${[0,1,2,3].map(k=>`IN${k+1} ${(s.Astatus>>k)&1?'locked':'—'}`).join(' · ')}</td></tr>
      <tr><th>ALTERA_write out / in</th><td class="mono small">${p.out.map(hex2).join(' ')}<br>${p.inn.map(hex2).join(' ')}</td></tr>
      <tr><th>FPGA</th><td class="mono">${configured(t)?'configured':'loading EPCS16'} · embedder ${embedding(t)?'running':'idle'}</td></tr></table>`;
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    m.querySelector('#route').innerHTML = routeTable(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#sc'), t);
  };
  SIM.on('time', draw);
}
function drawScope(cv, el, t){
  const {c,w,h}=SIM.canvas(cv,150); const o=outputAt(t), k=D.watchOut;
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), cols=[SIM.css('--accent'),SIM.css('--bad')];
  c.strokeStyle=SIM.css('--grid'); c.strokeRect(8,8,w-16,h-30); c.beginPath(); c.moveTo(8,8+(h-30)/2); c.lineTo(w-8,8+(h-30)/2); c.stroke();
  if (o.state!=='run'){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('AES OUT '+(k+1)+': no audio ('+o.state+')', 16, 40); el.innerHTML=''; return; }
  const pi=o.aesOut[k], st=o.pairs[pi]; const span=0.004, ta=Math.max(0,t-span/2);
  [0,1].forEach(sd=>{ c.strokeStyle=cols[sd]; c.lineWidth=1.3; c.beginPath(); for (let i=0;i<=400;i++){ const tt=ta+span*i/400; const v=sampleOf(st,tt+sd*0.00031)*(st&&st.tone&&!st.tone.noise?6:1); const yy=8+(h-30)/2 - v*((h-30)/2-4); i?c.lineTo(8+(w-16)*i/400,yy):c.moveTo(8,yy);} c.stroke(); });
  const px=8+(w-16)*(t-ta)/span; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,8); c.lineTo(px,h-22); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`AES OUT ${k+1} = embedded AES${pi+1} · 4 ms window · tones scaled ×6`, 10, h-6);
  const n=Math.floor(t*48000); const bits = sdiLocked(t) && !VF[valAt(D.h.sdi,t)].hd ? 20 : 24;
  el.innerHTML = `${st.label}: ${st.note}<br>frame ${n.toLocaleString()} (${n%192}/191 of the AES block) · sample A = ${sampleOf(st,t).toFixed(5)} → ${bits}-bit 0x${(Math.round(sampleOf(st,t)*((1<<(bits-1))-1))>>>0 & ((1<<bits)-1)).toString(16).toUpperCase().padStart(bits/4,'0')}${bits===20?' (SD: 20-bit packets, low 4 bits lost)':''}
    <br><span class="muted">Test tones: embedded AESn = ${inf} 1 kHz-family tones at −20 dBFS; external AES k = (250k+250) Hz at −18 dBFS; Dolby E drawn as data noise.</span>`;
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  {title:'Meet the POD32', body:`<p>The POD32 is a half-rack <b>SD/HD-SDI audio embedder</b>. Video comes in on <b>INPUT</b>. Up to four external AES signals on <b>AES IN 1–4</b> are written into the video's audio groups, and the result leaves on <b>SDI 1</b> and <b>SDI 2</b>. Each external input can go through an <b>AD1895 sample-rate converter</b>, so a free-running or 44.1 kHz source still comes out locked to the video. The four <b>AES OUT</b> jacks let you hear what went into the stream.</p>
    <p>There are no menus. Everything is set with the <b>16 DIP switches</b> on the rear (UP = ON). The front panel only shows status: SDI <b>SD / HD / ERR</b> and the four <b>AES INPUTS</b> lock LEDs. The DOLBY and CASCADE LEDs were for options that were never finished.</p><p class="muted">Hover over the panel parts on the right. Click “Next” when you are ready.</p>`, check:()=>true, auto:true},
  {title:'1 · Read the status LEDs', body:`<p>An HD source (1080i/59.94) is plugged into INPUT and AES IN 1 has a free-running 48 kHz signal. So <b>HD</b> and <b>AES INPUTS 1</b> are lit.</p><p><b>Goal:</b> unplug the SDI (click the INPUT BNC or press S), then move the playhead on by 10 ms. <b>ERR</b> lights.</p>`, check:()=>ledsAt(SIM.t).err===1 && pwrOn(SIM.t), hint:'Click the INPUT BNC, then +10 ms.'},
  {title:'2 · Plug the SDI back in and wait', body:`<p>Plug the SDI back in and watch the timeline. <b>HD</b> comes on about 20 ms later, as soon as the GS1559 locks. But the firmware keeps the FPGA's embedder in <b>reset</b> (PB7 low) until the format has read the same for 200 loop passes, and then counts another 255 passes. That is about half a second of silence on the output after every lock.</p><p><b>Goal:</b> the embedder is running at the playhead (PB7 high in the State table).</p>`, check:()=>embedding(SIM.t) && ledsAt(SIM.t).hd===1, hint:'Plug the SDI in (S), then +500 ms twice. Look at the “RESET_VECTOR” lane.'},
  {title:'3 · Embed AES IN 1 through the SRC', body:`<p>DIP1 and DIP2 choose what goes out as <b>AES1</b> (group 1, channels 1–2):</p><table class="kv small"><tr><th>DIP1</th><th>DIP2</th><th>AES1 =</th></tr><tr><td>OFF</td><td>OFF</td><td>embedded AES1 from the input (pass-through)</td></tr><tr><td>OFF</td><td>ON</td><td>external AES IN 1 through the SRC</td></tr><tr><td>ON</td><td>OFF</td><td>external AES IN 1, SRC disabled</td></tr><tr><td>ON</td><td>ON</td><td>Reserved</td></tr></table><p>Turn <b>DIP2 ON</b>. The firmware waits about 100 loop passes (≈113 ms) before it believes a DIP change.</p><p><b>Goal:</b> AES1 in the output comes from external AES1 through the SRC.</p>`, check:()=>{ const o=outputAt(SIM.t); return o.state==='run' && o.route.pairs[0].kind==='src' && o.route.pairs[0].k===1; }, hint:'Click DIP2 on the rear (or press 2), then +500 ms.'},
  {title:'4 · Dolby E needs the SRC off', body:`<p>Set <b>IN 2</b> to “Dolby E data” in the list below the rear panel and plug in <b>AES IN 2</b>. Turn <b>DIP4 ON</b> (AES2 = external through the SRC) and look at the Output table: a sample-rate converter rewrites every sample, so the Dolby E data is destroyed.</p><p>Now set <b>DIP3 ON and DIP4 OFF</b> (SRC disabled). The data goes in bit-exact. This needs a source that is already locked to the video.</p><p><b>Goal:</b> AES2 = external AES2 with the SRC disabled, carrying Dolby E.</p>`, check:()=>{ const o=outputAt(SIM.t); return o.state==='run' && o.route.pairs[1].kind==='dir' && valAt(D.h.aes[1],SIM.t)==='dolbyE'; }, hint:'IN 2 = Dolby E (list), click AES IN 2, press 3 (DIP3 ON), then +500 ms.'},
  {title:'5 · Copy the inputs into group 3', body:`<p>DIP9/DIP10 put external AES1 and AES2 into <b>group 3</b> as AES5/AES6 (DIP11/12 do the same for AES3/4 into group 4). The manual: “to embed audio on AES channels 5–8 the AES signals will be grouped as AES 5&6 and AES 7&8.”</p><p><b>Goal:</b> DIP10 ON, so AES5/AES6 come from external AES1/AES2 through the SRC.</p>`, check:()=>{ const o=outputAt(SIM.t); return o.state==='run' && o.route.pairs[4].kind==='src'; }, hint:'Press W (DIP10) and wait 200 ms.'},
  {title:'6 · Listen to groups 3/4', body:`<p>The four <b>AES OUT</b> jacks carry embedded AES1–4. <b>DIP13 ON</b> switches them to AES5–8 (the FPGA's <span class="mono">sw16x8</span> group select).</p><p><b>Goal:</b> AES OUT 1–4 = AES5–8. Click AES OUT 1 to watch it in the scope.</p>`, check:()=>{ const o=outputAt(SIM.t); return o.state==='run' && o.route.outHi===1; }, hint:'Press T (DIP13) and wait 200 ms.'},
  {title:'7 · Switch to SD', body:`<p>Choose <b>525i/59.94</b> in “SDI format”. The source re-locks, <b>SD</b> lights and the 500 ms reset sequence runs again.</p><p>SD embedding follows SMPTE 272M with <b>20-bit</b> samples, so the lowest 4 bits of the 24-bit inputs are lost. HD (SMPTE 299M) keeps all 24 bits.</p><p><b>Goal:</b> SD lit and the embedder running again.</p>`, check:()=>ledsAt(SIM.t).sd===1 && embedding(SIM.t), hint:'Pick 525i in the SDI format list, then +500 ms twice.'},
  {title:'8 · Power-up', body:`<p>Switch the unit <b>off and on</b> with the front rocker. The ATmega128 boots in about 30 ms, but the FPGA needs about 0.35 s to load from its EPCS16 (${inf}). Until then every read returns 0xFF, which the firmware takes as “SDI locked, SD, PAL” and “all DIPs ON”. Watch the SD LED come on first, and the DIP counter latch 0xFFFF.</p><p><b>Goal:</b> power on, with the playhead at least 0.6 s later and the embedder running.</p>`, check:()=>{ const e=entryAt(D.h.pwr,SIM.t); return e.v && e.t!==NEG && SIM.t-e.t>0.6 && embedding(SIM.t); }, hint:'Click the power rocker twice at a playhead near 0.1 s (press P twice), then +500 ms twice.'},
  {title:'Done', body:`<p>You have used every control the POD32 has. <b>Software</b> shows the main loop and the counters from the inside, <b>One second</b> breaks the stream down to the audio data packet, and <b>Findings</b> lists what the firmware is really doing.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__pod32Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — using the POD32 (from POD32MAN_ROUGH.doc and dipswitch.doc)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('Output stream', `<div id="route"></div>`)}</div>
    <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div><div id="ctl"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m);
  const hot = `<g><rect x="120" y="45" width="230" height="200" fill="transparent"><title>Power rocker and power LED</title></rect>
    <rect x="530" y="150" width="170" height="130" fill="transparent"><title>SDI: SD (PE2), HD (PE4), ERR (PE5) — from the FPGA status register</title></rect>
    <rect x="760" y="150" width="200" height="130" fill="transparent"><title>AES INPUTS 1–4: lit when that CS8416 has no UNLOCK error</title></rect>
    <rect x="1030" y="150" width="380" height="130" fill="transparent"><title>DOLBY: for the optional Dolby decoder card (P5, CAT_NO_552). Never driven in v100.</title></rect>
    <rect x="1430" y="150" width="140" height="130" fill="transparent"><title>CASCADE: reserved; PG3/PG4 never written</title></rect></g>`;
  const draw=()=>{
    m.querySelector('#fp').innerHTML=frontSVG(SIM.t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(SIM.t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#route').innerHTML=routeTable(SIM.t);
    const sb=m.querySelector('[data-p32="sdi"]'); if (sb) sb.textContent=(valAt(D.h.sdi,SIM.t)?'Unplug':'Plug in')+' SDI';
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; SIM.seek(0); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__pod32Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}${card('As seen by the front panel', `<div id="fp"></div>`)}</div>
    ${card('The audio data packet on this line (group shown below)', `<div style="margin-bottom:6px">${[0,1,2,3].map(g=>`<button data-g="${g}">Group ${g+1}</button>`).join(' ')}</div><div id="pkt" class="scroll"></div>`)}`;
  let grp=0;
  m.querySelectorAll('[data-g]').forEach(b=> b.onclick=()=>{ grp=+b.dataset.g; SIM.refresh(); });
  const draw=()=>{
    const t=SIM.t, fmt=valAt(D.h.sdi,t), v=fmt?VF[fmt]:VF['1080i59'];
    const rows=[
      ['SDI fields', (1/v.field).toFixed(3), SIM.fmtDur(v.field), v.name+(fmt?'':' (nothing plugged; figures for 1080i)')],
      ['SDI lines', Math.round(1/v.H).toLocaleString(), SIM.fmtDur(v.H), `${v.lines} lines per frame`],
      ['Parallel words (pclk)', Math.round(v.pclk).toLocaleString(), SIM.fmtDur(1/v.pclk), `${v.hd?'20-bit Y+C at 74.25(/1.001) MHz':'27 MHz'} (pod32.sdc: 13.468 ns / 37.04 ns) · ${v.words} per line · ${v.rate} serial`],
      ['Audio samples per channel', '48,000', SIM.fmtDur(1/48000), `${v.spl.toFixed(4)} per line → packets of ${Math.floor(v.spl)}–${Math.ceil(v.spl)} samples`],
      ['Audio data packets per group', Math.round(1/v.H).toLocaleString()+' (one per line)', SIM.fmtDur(v.H), `${v.hd?'SMPTE 299M, 24-bit, DID 2E7…2E4':'SMPTE 272M, 20-bit, DID 2FF/1FD/1FB/2F9'} · PugMedia ${v.hd?'vc_299m_291mo':'vc_272m_291mo'}`],
      ['AES3 blocks', '250', '4 ms', '192 frames; Z bit set in the first packet of each block (PugMedia v24–v26 fixes)'],
      ['AES3 bit cells per input', (128*48000).toLocaleString(), SIM.fmtDur(1/48000/128), '6.144 Mbaud biphase into each CS8416'],
      ['ATmega128 main-loop passes', '≈ '+Math.round(1/LOOP_T)+' '+inf, SIM.fmtDur(LOOP_T), `${LOOP_CYC} cycles at 4.9152 MHz`],
      ['MCU ↔ FPGA bits', '≈ '+(128*Math.round(1/LOOP_T)).toLocaleString()+' each way', '', 'ALTERA_write: 16 bytes, PB4 clock'],
      ['CS8416 register reads', '≈ '+(4*Math.round(1/LOOP_T)).toLocaleString(), '', 'reg 0x0C of all four receivers every pass'],
      ['Timer0 interrupts', '1,004', '0.996 ms', 'timer0_ovf_isr only reloads TCNT0 = 0x67 — it does nothing else'],
      ['DIP change → routing', '—', SIM.fmtDur(101*LOOP_T), '101 passes (DIP_SWITCH_CONSTANT 100) + 1 pass to the FPGA'],
      ['SDI lock → audio embedded', '—', SIM.fmtDur((C.FORMAT+C.RV+3)*LOOP_T+C.LOCK_SDI), 'GS1559 lock + 201 + 255 passes (RESET_VECTOR)'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one SDI line, one loop pass or one AES frame at a time.</p>`;
    const st=stepAt(t), p=st.pass, n=fmt?Math.floor(t/v.H):0;
    m.querySelector('#dev').innerHTML = `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SDI</th><td class="mono">${fmt? `${v.name} · field ${Math.floor(t/v.field)} · line ${(n%v.lines)+1} · ${sdiLocked(t)?'locked':'locking'}`:'not connected'}</td></tr>
      <tr><th>Audio this line</th><td class="mono">${fmt? (Math.floor((n+1)*v.spl)-Math.floor(n*v.spl))+' samples per group'+(embedding(t)?'':' (not embedding)'):'—'}</td></tr>
      <tr><th>ATmega128</th><td class="mono">${p.kind==='pass'? `pass #${p.i}: ${STEPS[st.step][0]}<br><span class="muted">${STEPS[st.step][2]}</span>` : p.kind}</td></tr>
      <tr><th>FPGA</th><td class="mono">${!pwrOn(t)?'off':!configured(t)?'loading EPCS16':st.step===5?'shift_in_128 / shift_out_128 clocking the MCU registers':'de-embed → pod32_audio_router → '+(v.hd?'HD_mux (299M)':'SD_mux (272M)')+' → GS1531'}</td></tr>
      <tr><th>AES frame</th><td class="mono">${Math.floor(t*48000).toLocaleString()} · ${Math.floor(t*48000)%192}/191 of block ${Math.floor(t*48000/192)}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    const P=packetAt(t,grp);
    m.querySelector('#pkt').innerHTML = !P? `<p class="muted">No packet: ${!fmt?'no SDI':'the embedder is not running at the playhead'}.</p>` :
      `<p class="small">Line ${P.line} of ${P.v.name}, group ${grp+1}, DID ${hex3(P.did)}, ${P.ns} sample${P.ns>1?'s':''} per channel on this line${P.hd?' (HD: one sample set per packet, the rest go in a second packet in the same HANC — shown as one here)':''}. Values are 10-bit words; b8 = even parity, b9 = NOT b8.</p>
      <div style="display:flex;flex-wrap:wrap;gap:3px">${P.words.map(w=>`<div style="border:1px solid var(--line);border-radius:5px;padding:2px 5px;background:${w.cls==='adf'?'var(--chip)':w.cls==='h'||w.cls==='cs'?'color-mix(in srgb,var(--accent2) 18%,transparent)':w.cls==='c'?'var(--panel2)':'color-mix(in srgb,var(--accent) '+(10+6*(+w.cls.slice(1)||0))+'%,transparent)'}"><div class="mono small">${hex3(w.v)}</div><div class="muted" style="font-size:10px">${w.l}</div></div>`).join('')}</div>
      <p class="small muted">${P.hd?`HD layout (SMPTE 299M): ADF, DID, DBN, DC = 24, two CLK words, 4 words × 4 channels, six ECC words, CS. The CLK, ECC and the exact bit split inside the channel words are shown schematically (${inf}); the PugMedia core's log mentions fixing ECC parity and the checksum bit 8 (rev 1.18, Jan 2009).`:'SD layout (SMPTE 272M): ADF, DID, DBN (1–255, per line), DC = 12 × samples, then three words per channel sample: X = Z, channel, audio bits 0–5; X+1 = bits 6–14; X+2 = bits 15–19, V, U, C, P. CS = 9-bit sum of DID…last word. Computed here from the simulated test tones.'}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  sdiin:{x:10,y:20,w:150,h:76,t:'INPUT BNC → GS1574',s:['adaptive cable EQ','CD1 → FPGA AA18'],d:'Gennum GS1574 equaliser (U1). Manual: automatic EQ to 100 m of Belden 1694 at 1.5 Gb/s. Its carrier-detect net CD1 reaches FPGA pin AA18, which pod32.qsf never assigns.'},
  gs1559:{x:10,y:120,w:150,h:76,t:'GS1559 deserialiser',s:['20-bit Yin/Cin, pclk_in','lock_59, SD/HD_059'],d:'U7, BGA-100. Reclocks and deserialises SD/HD to 20-bit parallel (pclk 74.25(/1.001) MHz for HD, 27 MHz for SD per pod32.sdc). Reports lock and SD/HD to the FPGA (Y19, Y20).'},
  aesin:{x:10,y:230,w:150,h:96,t:'AES IN 1–4',s:['PE-65612 transformers','CS8416 × 4 (U18,19,21,24)','24-bit I²S master'],d:'Each 75 Ω input feeds a CS8416. The MCU programs all four at once (CS8416_write_ALL: reg 1 = 0x14, reg 4 = 0x80, reg 5 = 0x85, reg 6 = 0x10) and polls register 0x0C for UNLOCK every pass.'},
  src:{x:10,y:350,w:150,h:76,t:'AD1895 SRC × 4',s:['U17, U20, U22, U23','output clocked by FPGA'],d:'Asynchronous sample-rate converters. Input: the CS8416 I²S. Output: 24-bit I²S clocked by the FPGA (src_i2s_gen_ad1895 makes LRCK), so every input ends up at 48 kHz locked to the video. BYPASS1–4 pins are wired to the FPGA too. Resets share CS8416_RESET (PG0).'},
  fpga:{x:220,y:110,w:230,h:250,t:'Cyclone II EP2C35F484C8',s:['sd_demux / hd_demux (de-embed)','pod32_audio_router (DIP1–12)','SD_mux 272M · HD_mux 299M','  (PugMedia cores)','sw16x8 → AES out (DIP13)','i2sx4_aes / audio_par_aes_4','shift_in_128 / shift_out_128','PLL1705 + ICS662 clocks','EPCS16 (M25P16) config'],d:'pod32.bdf, Quartus II 9.0 SP2 (released v100 = R&D v100LB). De-embeds the incoming groups, routes 16 channels (embedded vs external with or without SRC) per the debounced DIPs, re-embeds with the PugMedia encoder cores, and builds four AES outputs. 128-bit shift registers carry the MCU control/status word.'},
  mcu:{x:220,y:400,w:230,h:86,t:'ATmega128(L) @ 4.9152 MHz',s:['DIP debounce, reset sequencing','CS8416 lock → LEDs','UART0/RS-485 wired, unused'],d:'pod32v100.c (ICCAVR 7.15). One while(1) loop, ≈1.1 ms per pass. It does not touch the audio; it debounces DIPs, sequences the FPGA reset (PB7) after SDI lock, and drives the status LEDs.'},
  gs1531:{x:510,y:110,w:160,h:86,t:'GS1531 + GS1528',s:['serialiser (U13)','cable driver','→ SDI 1, SDI 2'],d:'GS1531 serialises Yout/Cout (DOUT_0…19) with pclk_out; the GS1528 drives the second output. Both outputs carry the re-embedded stream.'},
  aesout:{x:510,y:230,w:160,h:76,t:'AES OUT 1–4',s:['FPGA AES_OUT1–4','A11 A10 B11 B10'],d:'Embedded AES1–4 or AES5–8 of the output stream (DIP13), via sw16x8 and audio_par_aes_4. 75 Ω BNC on POD32-2 (the board also has footprints for Phoenix terminal blocks TB1–8).'},
  dips:{x:510,y:330,w:160,h:66,t:'DIP1–16 (POD32-2)',s:['2 × 219-8MS','pin_h5_1…16'],d:'Read by the FPGA, reported to the MCU in Reg1[31:16], debounced by the MCU, written back as dbDIP[31:16], then used by the router.'},
  leds:{x:510,y:420,w:160,h:66,t:'Front LEDs (16)',s:['4 GREEN · 2 RED · 10 YEL','PORTA/D/E/G'],d:'Driven straight from ATmega128 port pins through resistors (pod32-1iss2.net LED2…LED16). Only SD, HD, ERR and AES1–4 are ever written.'},
  opt:{x:220,y:20,w:230,h:66,t:'Option connector P5',s:['CAT_NO_552_RA (SIMM)','MSFS/MSBC/MSD to MCU + FPGA'],d:'A SIMM-style card edge for the optional Dolby decoder (“For future use when optional Dolby Decoder is installed”, identification sheet). Its serial lines reach PB0–PB2 and FPGA A5/A6/B6, but neither the firmware nor the qsf uses them.'},
};
const WIRES=[['sdiin','gs1559','DDI'],['gs1559','fpga','Yin/Cin 20-bit'],['aesin','src','I²S'],['aesin','fpga','I²S direct (SRC off)'],['src','fpga','SRCDATA 48k'],['fpga','gs1531','Yout/Cout'],['fpga','aesout','AES3 ×4'],['dips','fpga','pin_h5'],['mcu','fpga','ALTERA0…12'],['mcu','aesin','SPI + reset'],['mcu','leds',''],['opt','fpga','']];
function viewBlock(m){
  window.__pod32Active=false; let sel='fpga';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdi"></div>`)}${card('Signal flow in one paragraph', `<p>The <b>GS1559</b> turns the incoming SDI into 20-bit parallel video. The <b>FPGA</b> pulls out the audio groups already in it, chooses for every AES pair either that embedded audio or one of the four external inputs (through its <b>AD1895</b> SRC or straight from the <b>CS8416</b>), and writes the result back into the HANC with the PugMedia encoder cores. The <b>GS1531</b> sends it out on both SDI outputs. The <b>ATmega128</b> only supervises: it debounces the DIPs, holds the FPGA in reset until the input is stable, and lights the LEDs.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 690 500" style="width:100%"><defs><marker id="p32ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p32ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net and pin names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS=[
  {name:'1 · ATmega128 (U11)', note:'Pin numbers and net names from PCB/pod32-1iss2.net; port bits from the TQFP-64 pin-out and pod32v100.c. LED numbers are the board reference designators.', svg:()=>
    chip(330,50,190,'U11 ATmega128(L)',[
      ['35 PC0','ALTERA0 (CD_FLAG, unused)'],['36 PC1','ALTERA1 (SD_HD_FLAG, unused)'],['37 PC2','ALTERA2 (PAL_LOCK, unused)'],['38 PC3','ALTERA3 (NTSC_LOCK, unused)'],['39–41 PC4–6','ALTERA4–6'],['42 PC7','ALTERA7 = data in'],['13 PB3','ALTERA8 = data out'],['14 PB4','ALTERA9 = clock'],['15 PB5','ALTERA10 = STROBE_READ'],['16 PB6','ALTERA11 = STROBE_WRITE'],['17 PB7','ALTERA12 = int. reset'],['43 PG2','ALTERA_RESET'],['5 PE3','N_CONFIG (via Q1)'],['10–12 PB0–2','MSFS/MSBC/MSD (P5)'],['2/3 PE0/1','CPU_RX/TX → ADM3485'],
    ],[
      ['26 PD1','CS8416_IN (CDIN)'],['27 PD2','CS8416_CLK'],['28 PD3','CS8416_OUT (CDOUT)'],['29–32 PD4–7','CS8416_SEL1–4'],['33 PG0','CS8416_RESET (+AD1895)'],['6 PE4','LED5 HD'],['4 PE2','LED6 SD'],['7 PE5','LED7 ERR'],['8 PE6','LED8 AES1'],['25 PD0','LED9 AES2'],['44 PA7','LED10 AES3'],['45 PA6','LED2 AES4'],['46–51 PA5–0','LED3,4,11–14 DOLBY'],['18/19 PG3/4','LED15/16 CASCADE'],['23/24','X1 4.9152 MHz'],
    ],'ICCAVR 7.15 · JTAG1 on PF4–PF7')},
  {name:'2 · FPGA I/O (U3)', note:'EP2C35F484C8. Ball numbers and names copied from software/altera/v100/pod32.qsf. Yin/Cin/Yout/Cout[9:0] are omitted.', svg:()=>
    chip(330,40,180,'U3 EP2C35F484C8',[
      ['M22','pclk_in'],['Y19 / Y20','lock_59 / SD/HD_059'],['AB18 / W20','rc_byp59 / smpte_bypass59'],['C1 F1 R1 V2','AES1–4_8416'],['D3 E3 L8 Y3','i2s_1–4 (direct)'],['D4 E4 L7 Y4','sclk_1–4'],['D5 F4 M7 AA3','lrcl_in_1–4'],['F2 J2 U2 Y2','src_data1–4'],['E2 H2 T2 W2','sclk_scr1–4'],['E1 H1 U1 Y1','lrck_scr1–4'],['D1 G1 T1 V1','SRC_BYPASS1–4'],['C2','mclk_1895'],['C20 … E11','pin_h5_1…16 (DIPs)'],
    ],[
      ['E22','pclk_out'],['F21 / J19','lock_31 / sd/hd_31'],['J20 H21','20/10_31 · proc_31'],['F14','SDO_EN31'],['M19','sd/hd_1528'],['A11 A10 B11 B10','AES_OUT1–4'],['C9 D8 C10 E8','AES1–4'],['B7 A7','altera0/1'],['D7 B5 A4 B4 A3 B3','altera7–12'],['AB11 / AA11','pll1705_27 / mclk'],['AB7 AA5','clock662_27 / ref662'],['AB5 AB6 AA7 AA6','sel662_0–3'],['L18…T18 Y18','TP1–TP7'],
    ],'Quartus II 9.0 SP2 · EPCS16')},
  {name:'3 · AES input 1 (×4)', note:'Nets from pod32-1iss2.net for channel 1 (U18 CS8416, U17 AD1895). Channels 2–4 repeat with U19/U20, U21/U22, U24/U23.', svg:()=>
    chip(120,70,170,'U18 CS8416',[['RXP0','AES IN 1 (PE-65612)'],['14 CS','CS8416_SEL1 (PD4)'],['15 CDIN','CS8416_IN (PD1)'],['16 CCLK','CS8416_CLK (PD2)'],['17 CDOUT','CS8416_OUT (PD3)'],['9 RST','CS8416_RESET (PG0)']],[['26 SDOUT','SDATA_IN1'],['27 OSCLK','SCLK_IN1'],['28 OLRCK','LRCLK_IN1'],['24 RMCK','RMCK1 → D2'],['4','AES1 → C1']],'regs 1=0x14 4=0x80 5=0x85 6=0x10')
    + chip(560,70,170,'U17 AD1895',[['4 SDATA_I','SDATA_IN1'],['5 SCLK_I','SCLK_IN1'],['6 LRCLK_I','LRCLK_IN1'],['13 RESET','CS8416_RESET'],['2 MCLK_I','mclk_1895 (C2)']],[['23 SDATA_O','SRCDATA1 → F2'],['25 SCLK_O','SCLK1 ← E2'],['24 LRCLK_O','LRCLK1 ← E1'],['9 BYPASS','BYPASS1 ← D1'],['3 MCLK_O','MCLKOUT1 → U20']],'asynchronous SRC')
    + `<text x="60" y="350" font-size="11.5" fill="var(--ink2)">SDATA_IN1 / SCLK_IN1 / LRCLK_IN1 also go straight to the FPGA (D3/D4/D5): that is the “SRC disabled” path (router inputs 9b–16b, ${'inferred from the router code'}).</text>`},
  {name:'4 · SDI path', note:'From the BOM and netlist: U1 GS1574, U7 GS1559, U13 GS1531, U16 GS1528, U9/U14 GO1525 VCOs. Termination values not traced.', svg:()=>{
    let s=''; const box=(x,y,w,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="56" rx="4" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+24}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+w/2}" y="${y+42}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`;
    s+=box(30,80,120,'INPUT BNC','75 Ω')+box(190,80,120,'U1 GS1574','EQ · CD1')+box(350,80,130,'U7 GS1559','+ U9 GO1525 VCO')+box(520,80,150,'U3 FPGA','DIN → re-embed → DOUT')+box(520,220,150,'U13 GS1531','+ U14 GO1525')+box(340,220,130,'U16 GS1528','cable driver')+box(700,170,110,'SDI 1 / SDI 2','BNC');
    s+=`<g stroke="var(--ink)" fill="none"><path d="M150 108 H190 M310 108 H350 M480 108 H520 M595 136 V220 M520 248 H470 M670 248 H700 M405 276 V320 H755 V226"/></g>`;
    s+=`<g font-size="10.5" fill="var(--accent2)"><text x="314" y="100">DDI1P/N</text><text x="484" y="100">DD0–19</text><text x="600" y="190">DOUT_0–19 · PCLK_OUT</text></g>`;
    return s; }},
  {name:'5 · Rear board POD32-2', note:'From PCB/POD32-2iss1.bom: SW2/SW3 219-8MS DIP switches, IN1–4 and OUT1–4 BNCs (RFX), TB1–8 Phoenix 3-pin footprints, H3/H4/H6 headers to POD32-1. Which TB is populated is not recorded; the silk has only BNC holes.', svg:()=>{
    let s=''; for (let i=0;i<16;i++){ const x=60+i*44+(i>=8?30:0); s+=`<rect x="${x}" y="70" width="26" height="50" fill="none" stroke="var(--ink)"/><text x="${x+13}" y="62" text-anchor="middle" font-size="10" fill="var(--ink)">${i+1}</text><line x1="${x+13}" y1="120" x2="${x+13}" y2="150" stroke="var(--ink)"/><text x="${x+13}" y="166" text-anchor="middle" font-size="9.5" fill="var(--accent2)">h5_${i+1}</text>`; }
    s+=`<text x="60" y="44" font-size="12" font-weight="700" fill="var(--ink)">SW2 (DIP1–8)</text><text x="442" y="44" font-size="12" font-weight="700" fill="var(--ink)">SW3 (DIP9–16)</text>`;
    for (let k=0;k<8;k++){ const x=80+k*90; s+=`<circle cx="${x}" cy="260" r="16" fill="none" stroke="var(--ink)"/><circle cx="${x}" cy="260" r="4" fill="var(--ink)"/><text x="${x}" y="296" text-anchor="middle" font-size="11" fill="var(--ink)">${k<4?'IN'+(k+1):'OUT'+(k-3)}</text><rect x="${x-16}" y="320" width="32" height="18" fill="none" stroke="var(--ink2)" stroke-dasharray="3 2"/><text x="${x}" y="352" text-anchor="middle" font-size="9.5" fill="var(--ink2)">TB${k+1}</text>`; }
    return s+`<text x="60" y="400" font-size="11" fill="var(--ink2)">To POD32-1 via H3/H4 (H1X12) and H6 (2×10). DIP pull-ups/sense are on the FPGA side (${'not traced'}).</text>`; }},
];
function viewSchem(m){
  window.__pod32Active=false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from net and pin names — not the P-CAD drawings)', `<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD files are <span class="mono">POD32 - #Engineering/PCB/pod32-1iss2.sch</span> and <span class="mono">pod32-2iss1.sch</span>, with PDF prints of two sheets (<span class="mono">pod32[Sheet8].pdf</span>, <span class="mono">pod32[Sheet9].pdf</span>). These sheets are rebuilt from the netlist, BOM and qsf. Blue labels are net names.</p>`);
  const draw=()=>{
    m.querySelector('#t2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 880 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="868" height="458" fill="none" stroke="var(--line)"/><text x="860" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">POD32 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__pod32Active=true;
  m.innerHTML = `<div class="grid2">${card('ATmega128 main loop — the box lit up is running at the playhead', `<div id="flow"></div>`)}
      <div>${card('RESET_VECTOR state machine (PB7 = FPGA internal reset)', `<div id="fsm"></div>`)}${card('DEBOUNCE_SWITCHES', `<div id="deb"></div>`)}</div></div>
    <div class="grid2">${card('pod32_audio_router.vhd — live (DIPs as the FPGA has them)', `<div id="rt"></div>`)}${card('The 128-bit MCU ↔ FPGA word (control.doc), live', `<div id="reg"></div>`)}</div>
    ${card('How the switches did things — switch → code → signal', `<div id="btn"></div>`)}
    ${card('FPGA audio pipeline', `<div id="pipe"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, st=stepAt(t), p=st.pass, s=p.s||{};
    let f=`<svg viewBox="0 0 540 ${STEPS.length*46+80}" style="width:100%"><defs><marker id="p32a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="120" y="6" width="300" height="26" rx="13" fill="${p.kind==='boot'?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="270" y="24" text-anchor="middle" font-size="11.5" fill="var(--ink)">main(): init_devices · ALTERA_RESET · init_CS8416</text>`;
    STEPS.forEach((q,j)=>{ const y=44+j*46, on=p.kind==='pass'&&st.step===j;
      f+=`<line x1="270" y1="${y-12}" x2="270" y2="${y}" stroke="var(--ink2)" marker-end="url(#p32a2)"/><rect x="30" y="${y}" width="480" height="34" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="40" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${q[0]} <tspan font-size="10" fill="${on?'#eef':'var(--ink2)'}">(${q[1]} cyc)</tspan></text><text x="40" y="${y+28}" font-size="9.8" fill="${on?'#eef':'var(--ink2)'}">${q[2].slice(0,92)}</text>`; });
    const yb=44+STEPS.length*46; f+=`<path d="M510 ${yb-30} h20 V40 h-20" fill="none" stroke="var(--ink2)" marker-end="url(#p32a2)"/><text x="40" y="${yb+18}" font-size="11" fill="var(--ink2)">${p.kind==='pass'?'Pass #'+p.i:p.kind} · WDR() is called but the watchdog is never enabled (no WDTCR write).</text></svg>`;
    m.querySelector('#flow').innerHTML=f;
    const state = p.kind!=='pass'? -1 : !s.CD? 0 : !s.fstable? 1 : (s.ren && s.rc>0)? 2 : 3;
    const node=(x,y,l,sub,on)=>`<g><rect x="${x-62}" y="${y-28}" width="124" height="56" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 560 180" style="width:100%">${node(70,80,'NO_LOCK','PB7 low · rc = 255',state===0)}${node(210,80,'COUNTING','format_counter '+(state===1?s.fc:'')+'/200',state===1)}${node(350,80,'RESET HOLD','reset_counter '+(state===2?s.rc:''),state===2)}${node(490,80,'RUNNING','PB7 high',state===3)}
      <g stroke="var(--ink2)" fill="none"><path d="M132 80 H148" marker-end="url(#p32a2)"/><path d="M272 80 H288"/><path d="M412 80 H428"/><path d="M490 108 Q280 175 70 108"/></g>
      <text x="140" y="40" text-anchor="middle" font-size="9.5" fill="var(--ink2)">CD lock</text><text x="280" y="40" text-anchor="middle" font-size="9.5" fill="var(--ink2)">200 same</text><text x="420" y="40" text-anchor="middle" font-size="9.5" fill="var(--ink2)">rc = 0</text><text x="280" y="168" text-anchor="middle" font-size="9.5" fill="var(--ink2)">SDI lost (any state) → NO_LOCK</text></svg>
      <p class="small muted">A format change without losing lock only bumps <span class="mono">format_unstable_counter</span> once (pformat is updated the same pass), so it would take 200 separate changes to restart the sequence. In practice a format change always passes through NO_LOCK.</p>`;
    m.querySelector('#deb').innerHTML = p.kind!=='pass'? '<p class="muted">—</p>' : `<div style="height:16px;background:var(--grid);border-radius:4px;overflow:hidden"><div style="height:100%;width:${s.dcnt}%;background:var(--warn)"></div></div>
      <p class="small mono">dip_switch_counter ${s.dcnt}/100 · in[0..1] = ${hex2(p.inn[0])} ${hex2(p.inn[1])} · dip_switch1/2 = ${hex2(s.dip1)} ${hex2(s.dip2)}${p.latched?' · <b style="color:var(--bad)">latched this pass</b>':''}</p>
      <p class="small muted">The counter climbs on every pass where the switches, or sdi_lock_status, differ from the stored copy. It is not cleared when they agree again.</p>`;
    const r=routeAt(t), d=r? ((p.s.fpgaOut[0]<<8)|p.s.fpgaOut[1]) : 0;
    const selTxt = n => `${dipOn(d,2*n-1)}${dipOn(d,2*n)}`;
    const rows=[['sel(1:0) DIP1,2','audio1x/2x → AES1',['input1a/2a','input1b/2b','input9b/10b','input1a/2a']],['sel(3:2) DIP3,4','audio3x/4x → AES2',['input3a/4a','input3b/4b','input11b/12b','input3a/4a']],['sel(5:4) DIP5,6','audio5x/6x → AES3',['input5a/6a','input5b/6b','input13b/14b','input5a/6a']],['sel(7:6) DIP7,8','audio7x/8x → AES4',['input7a/8a','input7b/8b','input15b/16b','input7a/8a']],['sel(9:8) DIP9,10','audio9x–12x → AES5,6',['input9a–12a','input1b–4b','input9b–12b','input9a–12a']],['sel(11:10) DIP11,12','audio13x–16x → AES7,8',['input13a–16a','input5b–8b','input13b–16b','input13a–16a']]];
    m.querySelector('#rt').innerHTML = !r? '<p class="muted">FPGA not running.</p>' : `<table class="kv small"><tr><th>case</th><th>output</th><th>"00" emb</th><th>"01" SRC</th><th>"10" direct</th><th>"11" res.</th></tr>${rows.map((q,n)=>{ const v=parseInt(selTxt(n+1),2); return `<tr><td class="mono">${q[0]} = ${selTxt(n+1)}</td><td class="mono">${q[1]}</td>${q[2].map((x,j)=>`<td class="mono ${j===v?'hl':''}">${x}</td>`).join('')}</tr>`; }).join('')}</table>
      <p class="small muted">“a” = embedded audio from the input stream, “b1–8” = external through the AD1895s (two channels per input), “b9–16” = external straight from the CS8416s. sw16x8: DIP13 = ${dipOn(d,13)} → AES OUT = group ${dipOn(d,13)?'3/4':'1/2'}.</p>`;
    const bits = (b,names)=>`<tr>${names.map((n,i)=>`<td class="mono" style="text-align:center;${(b>>(7-i))&1?'background:color-mix(in srgb,var(--accent) 30%,transparent)':''}">${n}<br>${(b>>(7-i))&1}</td>`).join('')}</tr>`;
    m.querySelector('#reg').innerHTML = p.kind!=='pass'? '<p class="muted">—</p>' : `<p class="small"><b>FPGA → ATmega</b> (ALTERA_BUFFER_in[0..2], Reg1[31:8])</p><table class="kv small">${bits(p.inn[0],['DIP1','DIP2','DIP3','DIP4','DIP5','DIP6','DIP7','DIP8'])}${bits(p.inn[1],['DIP9','10','11','12','13','14','15','16'])}${bits(p.inn[2],['sdi','sd/hd','PAL','NTSC','-','-','-','-'])}</table>
      <p class="small"><b>ATmega → FPGA</b> (ALTERA_BUFFER_out[0..1] = dbDIP[31:16])</p><table class="kv small">${bits(p.out[0],['db1','db2','db3','db4','db5','db6','db7','db8'])}${bits(p.out[1],['db9','10','11','12','13','14','15','16'])}</table>
      <p class="small muted">Bytes 3–15 of both directions are zero/reserved; 13 of the 16 bytes shifted every pass carry nothing.</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware / FPGA path</th><th>What changes</th></tr>
      <tr><td>Flip a DIP</td><td class="mono small">pin_h5_n → Reg1 → ALTERA_write → DEBOUNCE_SWITCHES (100 passes) → ALTERA_SORT → shift_out_128 → sel[11:0]</td><td class="small">pod32_audio_router picks a new source for that AES pair ≈ 113 ms later</td></tr>
      <tr><td>Plug SDI in</td><td class="mono small">lock_59 → Reg1[15:12] → sdi_lock_status → PROCESS_SDI_LOCK_STATUS → leds_refresh, RESET_VECTOR</td><td class="small">SD/HD LED next pass; PB7 released after 200 + 255 passes</td></tr>
      <tr><td>Pull SDI out</td><td class="mono small">CD = NO_LOCK → RESET_VECTOR</td><td class="small">ERR LED, PB7 low at once</td></tr>
      <tr><td>Plug AES in</td><td class="mono small">CS8416 reg 0x0C → CS8416_READ_LOCK_ALL → INVERT_DATA → Astatus → leds_refresh</td><td class="small">AES INPUTS LED two passes later; audio path is all hardware</td></tr>
      <tr><td>Power on</td><td class="mono small">main(): ALTERA_RESET(1000), init_CS8416, PB7 pulse (≈30 ms)</td><td class="small">FPGA loads from EPCS16 in parallel</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    const v = valAt(D.h.sdi,t)? VF[valAt(D.h.sdi,t)] : VF['1080i59'];
    const stg=[['GS1559','Yin/Cin 20-bit'],[v.hd?'hd_demux':'sd_demux',v.hd?'hd274_296_decoder':'sd656_decoder'],['pod32_audio_router','16 × 24-bit · sel[11:0]'],[v.hd?'HD_mux':'SD_mux',v.hd?'vc_299m_291mo (24-bit)':'vc_272m_291mo (20-bit)'],['hanc_delete · parity_gen16','old packets out, parity'],['GS1531','SDI 1 / SDI 2']];
    m.querySelector('#pipe').innerHTML = `<svg viewBox="0 0 900 110" style="width:100%">${stg.map((q,i)=>`<rect x="${6+i*149}" y="16" width="138" height="48" rx="6" fill="${embedding(t)&&i>0&&i<5?'color-mix(in srgb,var(--accent) 20%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${75+i*149}" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${q[0]}</text><text x="${75+i*149}" y="52" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${q[1]}</text>${i<5?`<line x1="${144+i*149}" y1="40" x2="${155+i*149}" y2="40" stroke="var(--ink2)"/>`:''}`).join('')}
      <text x="8" y="92" font-size="11" fill="var(--ink2)">Side chain: CS8416 ×4 → AD1895 ×4 (or direct) → router “b” inputs · sw16x8 → audio_par_aes_4 / i2sx4_aes → AES OUT 1–4. ${embedding(t)?'Running.':'Embedder idle at the playhead.'}</text></svg>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod32Active=false;
  m.innerHTML = card('What POD32 is up to — findings from the source', `<ol>
    <li><b>Half a second of no audio after every lock.</b> <span class="mono">RESET_VECTOR()</span> holds PB7 (net ALTERA12, the FPGA's internal reset) low until <span class="mono">format</span> has read the same for <span class="mono">FORMAT_CONSTANT</span> = 200 passes, then counts <span class="mono">reset_counter</span> down from 255. At ≈1.1 ms a pass ${inf} that is ≈0.5 s after the GS1559 locks. The v100LA–LD history (“audio does not return after re-plugging SD-SDI”, v100f) explains why it is there.</li>
    <li><b>The format-change check almost never fires.</b> In the running branch, <span class="mono">pformat</span> is set to <span class="mono">format</span> on the same pass that bumps <span class="mono">format_unstable_counter</span>, so one change adds 1, and 200 separate changes are needed before the sequence restarts. The variable <span class="mono">delay = 10000</span> next to it is set and never used (the busy loop is commented out; the R&D <span class="mono">adam/POD32</span> copy still runs it as <span class="mono">delay = 3000</span>, without WDR).</li>
    <li><b>The DIP debounce never forgets.</b> <span class="mono">DEBOUNCE_SWITCHES()</span> counts passes where the switches differ from the stored copy, but never clears <span class="mono">dip_switch_counter</span> when they agree again. Bounces accumulate, and a change can latch sooner than 100 passes after a few earlier wobbles. The same comparison also includes <span class="mono">sdi_lock_status</span>, so every SDI status change adds one count too.</li>
    <li><b>LED defines don't match the code.</b> The header defines <span class="mono">led_aes3 3 //PA3</span>, but <span class="mono">leds_refresh</span> drives <b>PA7</b> for AES3 (next to an otherwise unused define <span class="mono">aes3 7 //PA7</span>). The netlist confirms PA7 = LED10 and PA3 = LED11, which is really the missing <b>DOLBY 3</b> (dolby 1, 2, 4, E and DD are all defined; dolby 3 is not). The engineering README's “PORTE bit 2 = lock” is the <b>SD</b> LED (<span class="mono">led_sd 2 //PE2</span>).</li>
    <li><b>Six DOLBY and two CASCADE LEDs are never lit.</b> PA0–PA5 and PG3/PG4 are set as outputs and cleared in <span class="mono">port_init</span>, then never written. The DOLBY row belongs to the optional Dolby decoder card on P5 (<span class="mono">CAT_NO_552_RA</span>, same “552” name as POD31's option); its MSFS/MSBC/MSD lines reach PB0–2 and FPGA balls A5/A6/B6, but neither the firmware nor <span class="mono">pod32.qsf</span> uses them.</li>
    <li><b>CONTROL port wired, never used.</b> UART0 (PE0/PE1) goes to two ADM3485 RS-485 transceivers (5 on the BOM, plus a DS34LV86T receiver), with enables on PF2/PF3. The firmware never configures the UART and leaves PORTF as inputs.</li>
    <li><b>Four status pins the code ignores.</b> <span class="mono">CD_FLAG</span>, <span class="mono">SD_HD_FLAG</span>, <span class="mono">PAL_LOCK</span> and <span class="mono">NTSC_LOCK</span> are defined on PINC0–3 (nets ALTERA0–3, FPGA B7/A7/B8/A8), but the code gets the same information from the shifted register byte instead.</li>
    <li><b>A leftover that would reset the FPGA.</b> <span class="mono">altera.h</span> (copied “FROM D6204A”) defines <span class="mono">ALTERA_WRITE_LOW/HIGH</span> on <b>PG2</b> and <span class="mono">ALTERA_FSYNCH</span> on PG0. On POD32 PG2 is <span class="mono">ALTERA_RESET</span> and PG0 is <span class="mono">CS8416_RESET</span>. Only the unused <span class="mono">ALTERA_read_write()</span> touches them, so it is harmless, but calling it would reset both. <span class="mono">ALTERA_BUFFER</span> is 8 while <span class="mono">ALTERA_write</span> moves 16 bytes into 128-byte buffers.</li>
    <li><b>The watchdog is fed but never armed.</b> <span class="mono">WDR()</span> appears in the loop and in <span class="mono">wait()</span>, but no code writes WDTCR. Timer0 is set for a 0.996 ms overflow and <span class="mono">timer0_ovf_isr</span> only reloads <span class="mono">TCNT0</span>.</li>
    <li><b>Power-up reads all ones</b> ${inf}. The EP2C35 takes a few hundred ms to load from the EPCS16, while the MCU starts its loop after ≈30 ms. During that time PC7 (pull-up on, <span class="mono">PORTC = 0xFF</span>) reads 1s, so the firmware sees “SDI locked, SD, PAL”, lights SD, and after 101 passes latches all 16 DIPs ON. When the FPGA wakes up it is sent 0xFFFF (DIP13 ON, every pair “Reserved” → embedded) for about 113 ms until the real DIPs are debounced. Try the Power-up lesson.</li>
    <li><b>“Reserved” is not reserved.</b> In <span class="mono">pod32_audio_router.vhd</span> every <span class="mono">"11"</span> case passes the embedded audio, the same as <span class="mono">"00"</span>.</li>
    <li><b>Manual vs DIP sheet.</b> The rough manual says the AES outputs give “copies of the AES inputs OR the AES signals that are demuxed from the output video stream”; the DIP sheet only offers embedded AES1–4 or AES5–8 (DIP13). The HD 1080p formats and 1035i listed in the manual's spec table are not something the firmware checks; it only knows HD/SD/PAL/NTSC.</li>
    <li><b>SD is 20-bit.</b> The manual's “20 bits for SD” is the PugMedia <span class="mono">vc_272m_291mo</span> core (v11–v13: “SD embedder 20-bit only”). A 24-bit external source loses 4 bits in SD.</li>
    <li><b>Makefile is for the wrong chip.</b> <span class="mono">pod32.mak</span> says <span class="mono">-DATMega165P</span>, 16 KB flash, RAM end 0x4FF and a 512-byte EEPROM; the source includes <span class="mono">iom128v.h</span> and the board has an ATmega128. The 24 Nov backup <span class="mono">pod32v100._c</span> differs in one line: an HD lock lit HD <i>and</i> SD (<span class="mono">PORTE |= (BIT4 | BIT2)</span>).</li>
    <li><b>The released FPGA is not the fixed one.</b> <span class="mono">software/altera/v100</span> is byte-identical to R&D v100LB. v100LC fixed audio artefacts after an hour with the lid on, but only lives in R&D, and still had an open “AES out wrong when SRC disabled (Dolby on AES out not passing)” note. No .pof/.sof of either is archived.</li>
  </ol>`) + card('Variants in the folder (≈9,600 files)', `<table class="kv small">
    <tr><th>Path</th><th>What it is</th></tr>
    <tr><td class="mono">POD32 - #Engineering/software/atmel/v100</td><td><b>Modelled here.</b> pod32v100.c 30 Nov 2010|43 (+ <span class="mono">._c</span> 24 Nov backup).</td></tr>
    <tr><td class="mono">…/altera/v100</td><td><b>Modelled here.</b> = R&D v100LB “Final released version”, EP2C35F484C8, DSE revision Nov222010_DSE.</td></tr>
    <tr><td class="mono">…/altera/OBSOLETE/pug</td><td>PugMedia v1–v28 (Aug–Oct ${Y(2007)}), .sof per version; colour-bar NTSC test output early on.</td></tr>
    <tr><td class="mono">…/atmel/OBSOLETE/PROTOTYPING/v101 working</td><td>M6204A openGear-card firmware on AT90CAN128 (DashBoard/CAN) — not POD32 code.</td></tr>
    <tr><td class="mono">POD32 - #RD #RD3/POD32/Altera/Progress</td><td>v100a…v100M, v100L/LA/LB/LC/LD (C6 speed grade from v100L; LD in Quartus 10.1).</td></tr>
    <tr><td class="mono">…/RD3/POD32/atmel/v100</td><td>Aug ${Y(2008)} firmware state; makefile with no device define.</td></tr>
    <tr><td class="mono">…/RD3 POD32Nov27/28/Dec4 2012, Copy of POD32, adam/</td><td>${Y(2012)} rework snapshots: altpll3, clock_divider_2, det1001, par_sel_2of32.v; adam copy re-enables the delay loop.</td></tr>
    <tr><td class="mono">…/RD3/m6204, m6205c100, m6205ce400</td><td>openGear M6204A/M6205C designs whose embedder blocks were borrowed (reference only).</td></tr>
    <tr><td class="mono">PCB/</td><td>POD32-1 iss1 (OBSOLETE), iss2 (modelled), iss2b bottom PNP, unreleased iss3 (WORKING); POD32-2 iss1 rear board; POD32-3 iss1.</td></tr>
    <tr><td class="mono">POD PANELS…/Silks/POD32</td><td>FINAL CURVE silk (Jun 25 ${Y(2014)}), used for the panels here; older SILK/*.dwg and .cdr in Engineering.</td></tr></table>`)
  + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass ≈ ${(LOOP_T*1e3).toFixed(3)} ms (${LOOP_CYC} cycles) from hand-counted bit-bang loops ${inf}; boot ≈ ${(BOOT_T*1e3).toFixed(1)} ms from the wait() loop (7 cycles per count).</li>
    <li>GS1559 lock ${C.LOCK_SDI*1e3} ms, CS8416 lock ${C.LOCK_AES*1e3} ms, FPGA configuration ${C.CONF_T*1e3} ms ${inf}.</li>
    <li>While PB7 is low, no new audio packets are embedded ${inf}; with no SDI input there is no output video ${inf}.</li>
    <li>“External, SRC disabled” = the CS8416 I²S taken straight into the FPGA (router inputs 9b–16b), based on the nets SDATA_IN1 → D3 ${inf}. All four groups are embedded (mux_active_groups exists but its input is not traced) ${inf}.</li>
    <li>Audio content is a set of test tones; slips and wrong-rate behaviour are described, not sample-accurate.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD32 - #Master/POD32 - #Engineering/software/atmel/v100/pod32v100.c, pod32v100._c, altera.c/.h, pod32v100.s, pod32.mak</li>
    <li>…/software/altera/v100/pod32.qsf, pod32.sdc, pod32_audio_router.vhd, sw16x8.vhd, shift_in_128.vhd, shift_out_128.vhd, src_tdm_gen_pod32.vhd, mux_active_groups.vhd, vc_299m_291mo_new.v</li>
    <li>…/control.doc, dipswitch.doc(x), POD32MAN_ROUGH.doc, Front&Rear Identification.cdr, PCB/POD32-1iss2.bom, POD32-2iss1.bom, pod32-1iss2.net</li>
    <li>#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD32/POD32-FRONT&REAR(FINAL CURVE).pdf, Pics/POD32 Front.jpg, POD32 Rear.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'pod32', name:'POD32 · SD/HD-SDI AES embedder with SRC ('+Y(2010)+')', duration:1,
  product:'POD32', year:2010, family:'POD series',
  folder:'#POD #SERIES/POD32 - #Master',
  summary:'Half-rack SD/HD-SDI audio embedder: four external AES inputs, each through an AD1895 sample-rate converter or straight in, are written into audio groups 1–4 of the video, chosen by 16 rear DIP switches. A Cyclone II with PugMedia SMPTE 272M/299M encoder cores does the audio; an ATmega128 debounces the DIPs, sequences the FPGA reset and drives the LEDs. The v100 firmware is emulated pass by pass.',
  highlights:['Real 2014 front and rear silkscreen with live DIPs, jacks and LEDs','ATmega128 v100 emulated pass by pass: DIP debounce and the ½-second reset sequence','DIP → router → SMPTE 272M/299M packet down to the 10-bit word','Dolby E vs SRC, group 3/4 copies, AES OUT monitoring','Findings: dead Dolby/Cascade/RS-485 hardware, LED define mismatch, power-up 0xFF reads'],
  depth:'Full model',
  stepUnits:[
    {label:'1 SDI line', period:()=>VF[valAt(D.h.sdi,SIM.t)||'1080i59'].H},
    {label:'1 MCU loop pass', period:()=>LOOP_T},
    {label:'1 AES frame (48 kHz)', period:()=>1/48000},
    {label:'1 AES block (4 ms)', period:()=>192/48000},
    {label:'1 video field', period:()=>VF[valAt(D.h.sdi,SIM.t)||'1080i59'].field},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.1,'100 ms (≈90 passes)'],[1001/60000,'1 field (16.7 ms)'],[0.004,'1 AES block (4 ms)'],[LOOP_T*2,'2 loop passes (2.2 ms)'],[0.0003,'300 µs (HD/SD lines)'],[0.00005,'50 µs (one line)']],
  defaultZoom:0,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD32', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
