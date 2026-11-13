/* =====================================================================
   POD31 — SD/HD-SDI AES de-embedder (2 groups) with optional Dolby E / AC-3 decoder
   Ward-Beck Systems, 2005|38 – 2012|45.  Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD31 - #Master/):
   - POD31 - #Engineering/software/atmel/working/pod31_main.c (+ .lis)  main() loop, PROCESS_DIP_SWITCHES,
       PROCESS_AUDIO_FORMAT, ALTERA_write / write_data / ALTERA_read / read_data*, READ_GS1560_STATUS,
       PROCESS_SDI_LOCK_STATUS, PROCESS_HD_SD_CONTROL, PROCESS_AUDIO_INFORMATION, TRANSLATE_RESET_VECTOR(1),
       PROCESS_GROUP_COMPARE1/2, PROCESS_HD_SD_COMPARE, PROCESS_ALIGNMENT_CHECK, NO_LOCK_CHIRP, METADATA_CHIRP,
       REFRESH_LEDS, spi_stc_isr, SPI_translation, Metadata_translation, uart0_rx_isr, process_uart,
       timer0_init (4.792 ms), watchdog_init (WDTCR 0x09), port and LED macros, header "Crystal: 4.9152Mhz"
   - …/atmel/working/dolby.c/.h  DOLBY_DECODER_STATUS, RESET_DOLBY (DOLBY_ERROR_COUNTER 2000),
       DOLBY_CAT552_AUDIO_ERROR_CHECK (1000), RESET_VECTOR_CONSTANT 100, DOLBY_INSTALLED = ALTERA16 bit 6
   - …/atmel/v100/pod31_main.c (diffed against working/)
   - …/altera/working/ and v400/: OUTPUT_SELECT.vhd (both versions), switch_110.vhd, swap.vhd,
       non_audio_detector.vhd (both), CATMAPERR.vhd, pod31.qsf (v102 and v400 pins)
   - POD31 - #Engineering/PCB/pod31iss4.net + POD31-1iss4.bom (U11 ATmega128 pins, P5 CAT No. 552 header,
       U2 GS1560A, U9 ICS662, U4 PLL1705, LED colours), POD31-2iss2.net (SW1 DIP, T1–T4 PE-65612, TB1–TB4)
   - POD31 - #Engineering/MANUAL/POD31 MANUAL.pdf, POD31MAN_ROUGH.doc (modes, DIP tables, specs)
   - POD31 summary of AUTO SWAP and BALANCED OUTPUTS.doc · software/readme.doc (3 Mar 2008)
   - POD31 - #TESTREPORT/POD31-V400-13AUG12.pdf (issue-4 build, v400 FPGA, mode-3 corruption)
   - POD31 - #ARTWORK #DA #2016/POD31-FRONT&REAR-SILK (CURVE).pdf → assets/pod31-front-green.png,
       pod31-front-white.png, pod31-rear-white.png (tools/silk_extract.py, 200 dpi, 1713 × 321 px)
   - POD31 - #Mechanical #DA #2016/POD31-FRONT ISS 3 (PANEL).pdf, POD31-REAR ISS 3 (PANEL).pdf (cut-out positions)
   - POD31 - #Engineering/POD31 Front/Rear Edit-1.jpg (panel colour, LED colours, DIP, IEC inlet)
   Anything not in those files is marked "inferred" on screen. Format names are plain text; no logos.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = why => `<span class="tag-inf" title="Not stated in the source; inferred from ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
const Y = y => SIM.year(y);
const hx = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bn = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');

/* ---------------- constants (source unless marked) ---------------- */
const F_CPU = 4915200;                    // "Crystal: 4.9152Mhz", BOM X1 4.9152
const LOOP_CYC = 5000;                    // one main-loop pass — INFERRED from the pod31_main.lis instruction mix (≈2 000 cycles of bit-banging + metadata translation)
const LT = LOOP_CYC/F_CPU;                // ≈ 1.017 ms
const T0 = 23*1024/F_CPU;                 // timer0: prescale 1024, TCNT0 = 0xE9 → 4.792 ms ("desired 5mSec")
const WDT = 0.028;                        // WDTCR = 0x09 → 32K WDT cycles ≈ 28 ms (ATmega128 datasheet)
const CHIRP_ON = 100, CHIRP_OFF = 600, META_CHIRP = 300;
const RVC = 100;                          // RESET_VECTOR_CONSTANT (dolby.h)
const DOLBY_ERR_N = 2000, CAT_ERR_N = 1000;
const T_LOCK = 0.010;                     // GS1560A lock after carrier — INFERRED
const HOLD = { v102: 32767/48000, v400: 8191/48000 };   // non_audio_detector count = "111…1" (15 bits) / "001…1" in v400
const FS = 48000;

/* ---------------- SDI formats ---------------- */
const VF = {
  sd525:    {name:'SD 525i/59.94', sd:1, clk:27e6,           spl:1716, lines:525,  fr:30000/1001, rate:'270 Mb/s'},
  sd625:    {name:'SD 625i/50',    sd:1, clk:27e6,           spl:1728, lines:625,  fr:25,         rate:'270 Mb/s'},
  hd1080i59:{name:'HD 1080i/59.94',sd:0, clk:74.25e6/1.001,  spl:2200, lines:1125, fr:30000/1001, rate:'1.485/1.001 Gb/s'},
  hd1080i50:{name:'HD 1080i/50',   sd:0, clk:74.25e6,        spl:2640, lines:1125, fr:25,         rate:'1.485 Gb/s'},
  hd720p59: {name:'HD 720p/59.94', sd:0, clk:74.25e6/1.001,  spl:1650, lines:750,  fr:60000/1001, rate:'1.485/1.001 Gb/s'},
  hd1080p24:{name:'HD 1080p/23.98',sd:0, clk:74.25e6/1.001,  spl:2750, lines:1125, fr:24000/1001, rate:'1.485/1.001 Gb/s'},
};
const lineT = f => f.spl/f.clk;
const frameT = f => 1/f.fr;
const TYPE = {P:'PCM', E:'Dolby E', D:'Dolby Digital (AC-3)', '-':'absent'};
const DEC = { E:['L','R','C','LFE','Ls','Rs','2L','2R'], D:['L','R','C','LFE','Ls','Rs',null,null] };   // decoder outputs (programme 5.1+2 / 3/2L) — inferred
const DF = {L:300,R:400,C:500,LFE:60,Ls:700,Rs:800,'2L':900,'2R':1000};

/* ---------------- world: base settings + events at the playhead ---------------- */
function baseWorld(){ return {
  power:true, cable:true, fmt:'hd1080i59',
  grp:[['P','P'],['P','P'],['E','P'],['-','-']],        // what the source embeds in groups 1–4 (pair 1, pair 2)
  dip:[false,false,false,false,false,false,false,false], // SW1…SW8, ON = true
  cat:false, caterr:false,
}; }
const D = { base: baseWorld(), ev: [], fpga:'v400', literal:false, scope:0, log:[], lastTrace:[], steadyFrom:-1.4 };
let WC=null, WKEY='';
function hist(){
  const key = JSON.stringify([D.base, D.ev]);
  if (key!==WKEY){ WKEY=key; RCACHE=null; WC=[]; let w=JSON.parse(JSON.stringify(D.base)); WC.push({t:-Infinity, w});
    for (const e of D.ev){ w=JSON.parse(JSON.stringify(w)); if (e.k==='dip'||e.k==='grp') w[e.k]=JSON.parse(JSON.stringify(e.v)); else w[e.k]=e.v; WC.push({t:e.t, w, e}); } }
  return WC;
}
function segIdx(t){ const h=hist(); let lo=0, hi=h.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (h[m].t<=t) lo=m; else hi=m-1; } return lo; }
function world(t){ return hist()[segIdx(t)].w; }
function addEv(k, v){ const t=SIM.t; D.ev = D.ev.filter(e=> !(e.k===k && e.t >= t-1e-9)); D.ev.push({t,k,v}); D.ev.sort((a,b)=>a.t-b.t); }

/* ---------------- DIP decode (PROCESS_DIP_SWITCHES on ALTERA13 = INVERT_DATA(dip byte)) ---------------- */
function altera13(w){ let b=0; for (let i=0;i<8;i++) if (w.dip[i]) b |= 1<<(7-i); return b; }   // SW1 → bit 7 … SW8 → bit 0
function dipDecode(w){
  const a = altera13(w);
  const audio1 = ((a&0x80)?4:0)+((a&0x40)?2:0), audio2 = ((a&0x20)?4:0)+((a&0x10)?2:0);
  return { a13:a, audio1, audio2, g1: audio1>>1, g2: audio2>>1, mode: ((a&2)?2:0)+((a&1)?1:0), auto_swap: !!(a&8), dolby_off_110: !!(a&4) };
}
const MODE_TXT = ['Mode 1 · 2-group demux (no Dolby decoding)','Mode 2 · 6-ch Dolby + 1 PCM','Mode 3 · 8-ch Dolby','Mode 4 · 6-ch Dolby + Lt/Rt downmix'];
const OS_TXT = ['2 Group Demux','Dolby 6 + 2 (PCM)','Dolby 8 + 0','Dolby 6 + Lt/Rt'];

/* ---------------- GS1560A carrier detect ---------------- */
function lockStart(t){ let s=-Infinity; for (const e of D.ev){ if (e.t>t) break; if (e.k==='cable'||e.k==='fmt'||e.k==='power') s=e.t; } return s+T_LOCK; }
function CD(t){ const w=world(t); return w.power && w.cable && t>=lockStart(t); }
/* the pair that feeds output position k (AES1…AES4) under world w */
function posSrc(w, k){ const d=dipDecode(w); const g = k<2? d.g1 : d.g2; return {g, p:k&1}; }
function posTypeW(w, k){ if (!w.power || !w.cable) return '-'; const s=posSrc(w,k); return w.grp[s.g][s.p]; }
function posType(t, k){ return CD(t) ? posTypeW(world(t), k) : '-'; }

/* ---------------- SMPTE 337 bursts (Dolby E once per frame, AC-3 every 1536 samples) ---------------- */
function burstP(type, f){ return type==='E' ? frameT(f) : 1536/FS; }
function burstLen(type, f){ return type==='E' ? frameT(f)*0.9 : 448/FS; }        // E guard band ≈10 %, AC-3 448 kb/s — inferred
function burstPh(type, f){ return type==='E' ? frameT(f)*0.03 : 0.0031; }          // inferred
function lastBurst(type, f, t){ const P=burstP(type,f), ph=burstPh(type,f); return Math.floor((t-ph)/P)*P+ph; }
/* non_audio_detector: flag + Pc data type, held for HOLD after the last Pa/Pb sync */
function compFlag(k, t){
  const h=hist(); let i=segIdx(t); const hold=HOLD[D.fpga];
  for (; i>=0; i--){ const s=h[i], w=s.w, t0=Math.max(s.t, -5), t1=Math.min(i+1<h.length? h[i+1].t : Infinity, t);
    if (t - t1 > hold) return null;
    const ty = posTypeW(w,k); if (ty!=='E' && ty!=='D') continue;
    const f=VF[w.fmt]; const start = Math.max(t0, lockStart(t0)); let b = lastBurst(ty, f, t1);
    if (b < start) continue; if (t - b < hold) return {type:ty, sync:b, held: t1<t};
    return null; }
  return null;
}
/* PROCESS_AUDIO_FORMAT → aesN_led, cat_input1/2 (cat_input never cleared: sticky) */
function audioFormat(t){
  const leds=[0,1,2,3].map(k=>{ const c=compFlag(k,t); return c? (c.type==='E'?'E':'D') : 'P'; });
  let cs=false, cs2=false, c1=null, c2=null;
  if (leds[0]!=='P'){ cs=true; c1=0; }
  if (leds[1]!=='P'){ if (!cs){ c1=1; cs=true; } else { c2=1; cs2=true; } }
  if (leds[2]!=='P'){ if (!cs){ c1=2; cs=true; } }
  if (leds[3]!=='P'){ if (!cs){ c1=3; cs=true; } else { c2=3; cs2=true; } }
  return {leds, c1, c2, cs2, E: leds.includes('E'), DD: leds.includes('D')};
}
function stickyCat(t){   // last cat_input1/cat_input2 written before t (the globals keep their value)
  const af=audioFormat(t); let c1=af.c1, c2=af.c2;
  if (c1===null || c2===null){ const h=hist(); for (let i=segIdx(t)-1; i>=0 && (c1===null||c2===null); i--){ const te=h[i+1].t-1e-6; if (te < -5) break; const a=audioFormat(te); if (c1===null) c1=a.c1; if (c2===null) c2=a.c2; } }
  return {c1, c2, seen: c1!==null};
}
/* dolby_upper as ALTERA_write builds it (8-bit, exactly like the .lis: subi 49, lsl ×3) */
function dolbyUpper(t){
  const w=world(t), d=dipDecode(w), af=audioFormat(t), sc=stickyCat(t);
  let du = 0x87;                                   // DOLBY_INITIALIZATION: 0xFF with OS1/OS0/CAT1/CAT0 cleared; bit 7 never cleared again
  du &= ~0x78; du |= (d.mode<<5) & 0xFF; du |= (1<<7);     // | (reset_552 << 7) — bit 7 is already 1
  const ci = (d.auto_swap && af.cs2) ? sc.c2 : sc.c1;
  const raw = ci===null ? 0 : 0x31+ci;             // cat_input = NO1…NO4 ('1'…'4'), 0 before the first detection
  du |= (((raw - 0x31) & 0xFF) << 3) & 0xFF;
  return {du, ci, raw, os: (du>>5)&3, cat:(du>>3)&3};
}
/* ---------------- reset vectors (TRANSLATE_RESET_VECTOR / …1) and decoder resets ---------------- */
let RCACHE=null;
function dolbyResets(){
  if (RCACHE) return RCACHE; hist(); const out=[];
  for (let i=0;i<WC.length;i++){ const s=WC[i], w=s.w, d=dipDecode(w); const t0=Math.max(s.t, D.steadyFrom), t1=i+1<WC.length? WC[i+1].t : 2;
    if (t1<=t0 || !w.power || !w.cable || d.mode===0) continue;
    const st = Math.max(t0, lockStart(t0)+(RVC+1)*LT);
    if (!w.cat){ let r = st + (DOLBY_ERR_N+2)*LT; while (r < t1){ out.push({t:r, why:'RESET_DOLBY: DOLBY_INSTALLED low for 2000 passes'}); r += (DOLBY_ERR_N+2+RVC+1)*LT; } }
    else if (w.caterr){ let r = st + (CAT_ERR_N+2)*LT; while (r < t1){ out.push({t:r, why:'DOLBY_CAT552_AUDIO_ERROR_CHECK: CATMAP ERR for 1000 passes'}); r += (CAT_ERR_N+2+RVC+1)*LT; } }
  }
  return RCACHE = out;
}
function rvLow(grp, t){                            // bit 4 of RESET_VECTOR (group 1) / RESET_VECTOR1 (group 2): 0 = FPGA audio path held in reset
  if (!CD(t)) return {low:true, why:'CD = 0'};
  let last=-Infinity, why='';
  const ls=lockStart(t); if (ls>last){ last=ls; why='CD returned (carrier lock)'; }
  const h=hist();
  for (let i=1;i<h.length;i++){ if (h[i].t>t) break; const a=dipDecode(h[i-1].w), b=dipDecode(h[i].w);
    const ga = grp? a.g2:a.g1, gb = grp? b.g2:b.g1;
    if (((ga&6)>>1) !== ((gb&6)>>1) && h[i].t>last){ last=h[i].t; why='ERROR'+(grp?'2_5':'5')+': group selector changed'; } }
  if (!grp) for (const r of dolbyResets()){ if (r.t>t) break; if (r.t>last){ last=r.t; why=r.why; } }
  return (t < last + (RVC+1)*LT) ? {low:true, why} : {low:false, why:''};
}
/* ---------------- main-loop schedule ---------------- */
const STEPS = [
  ['WDR · DOLBY_CAT552_AUDIO_ERROR_CHECK · DOLBY_DECODER_STATUS', .03, 'Only when pod31_mode > 0: count CATMAP ERR and DOLBY_INSTALLED, maybe start a reset'],
  ['READ_GS1560_STATUS · PROCESS_SDI_LOCK_STATUS · PROCESS_HD_SD_CONTROL', .04, '~RC_BYP, LOCK_60, SMPTE, SD/~HD pins → CD, SD/HD/ERR LEDs, PB7 = SD/HD demux select'],
  ['TRANSLATE_INPUT(CD) · DEBOUNCE_INPUT · PROCESS_AUDIO_INFORMATION', .03, 'Which AES transmitters to open (BNC bits 7–4, Phoenix bits 3–0)'],
  ['ALTERA_write (6 bytes)', .12, 'dolby_upper, dolby_lower, reset_data_upper/lower, AUDIO_INFORMATION, group_data → STROBE_WRITE (PC7)'],
  ['ALTERA_read (3 × 6 bytes)', .36, 'ALTERA1–6 (group 1), ALTERA7–12 (group 2), ALTERA13–18 (DIP, Dolby flags) on PC1 / PB3 / PB4'],
  ['PROCESS_DIP_SWITCHES · PROCESS_AUDIO_FORMAT', .05, 'ALTERA13 → groups, mode, auto_swap, dolby_off_110; ALTERA14–17 → compressed / data type'],
  ['Audio1/2_Detect · ALIGNMENT_CHECK(ALTERA6) · COMPARE_AUDIO1_AUDIO2 / 3_4', .08, 'Group 1 lock, 0xA0 header, sample-count difference ≤ 2'],
  ['Audio3/4_Detect · COMPARE_AUDIO5_6 / 7_8 · GROUP/HD_SD_COMPARE · TRANSLATE_RESET_VECTOR(1)', .08, 'Group 2, then build RESET_VECTOR and RESET_VECTOR1'],
  ['NO_LOCK_CHIRP · METADATA_CHIRP · REFRESH_LEDS', .06, 'Flash counters (100 on / 600 off, 300) and all 13 status LEDs'],
  ['SPI_translation · Metadata_translation', .15, '136-byte CAT552 metadata frame (sync 0x02 0xCF) → ≈40 Dolby_*_Conversion calls'],
];
const SFRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const passOf = t => Math.floor(t/LT);
function stepAt(t){ const f=(t/LT)%1; let k=0; for (let j=0;j<STEPS.length;j++) if (f>=SFRAC[j]) k=j; return k; }
const CH_PH = 350;                                 // chirp phase at t = 0 (the unit has been running) — inferred
function chirpOn(t){ const n=passOf(t)+CH_PH; return (n % (CHIRP_ON+CHIRP_OFF+2)) < (CHIRP_ON+1); }
function metaAlt(t){ return Math.floor(passOf(t)/(META_CHIRP+1))%2 ? 'E' : 'D'; }   // format_alternate (starts DOLBY_AC3)

/* ---------------- LEDs (PROCESS_SDI_LOCK_STATUS + REFRESH_LEDS) ---------------- */
function ledsAt(t){
  const w=world(t); const L={pwr:w.power, sd:0,hd:0,err:0, g:[0,0,0,0], d:[0,0,0,0], e:0, dd:0};
  if (!w.power) return L;
  const cd=CD(t), f=VF[w.fmt], d=dipDecode(w);
  if (cd){ L.sd=1; L.hd = f.sd?0:1; } else L.err=1;                  // SD_LED_ON whenever locked (also in HD)
  if (cd){ const ch=chirpOn(t);
    const a=[0,1,2,3].map(k=>posType(t,k)!=='-');
    const set=(g,on)=>{ L.g[g] = on? 1 : (ch?1:0); };
    set(d.g1, a[0]||a[1]); set(d.g2, a[2]||a[3]);                      // second switch() wins when both selectors share a group
  }
  const af=audioFormat(t), both = af.E && af.DD, alt=metaAlt(t);
  af.leds.forEach((x,k)=>{ if (x==='P') return; if (!both) L.d[k]=1; else if (x===alt){ L.d[k]=1; if (x==='E') L.e=1; else L.dd=1; } });
  if (!both){ L.e = af.E?1:0; L.dd = af.DD?1:0; }
  return L;
}
/* ---------------- routing: OUTPUT_SELECT + switch_110 + AES_enable ---------------- */
function audioInfo(t){
  const w=world(t), d=dipDecode(w), af=audioFormat(t), loc = af.E||af.DD;
  const AU=[0,1,2,3].map(k=>posType(t,k)!=='-'?1:0);  // AUDIO1…AUDIO4 (HD: group lock pins, same result here)
  let ai=255;
  if (!(d.mode>0 && loc)){ if(!AU[1]) ai&=~0x80; if(!AU[0]) ai&=~0x40; if(!AU[3]) ai&=~0x20; if(!AU[2]) ai&=~0x10; }
  if (!(!d.dolby_off_110 && loc && d.mode>0)){ if(!AU[1]) ai&=~0x08; if(!AU[0]) ai&=~0x04; if(!AU[3]) ai&=~0x02; if(!AU[2]) ai&=~0x01; }
  return ai;
}
const BNC_BIT=[0x40,0x80,0x10,0x20], PHX_BIT=[0x04,0x08,0x01,0x02];
function rawPair(t,k){ const w=world(t), s=posSrc(w,k), ty=posType(t,k); return {g:s.g, p:s.p, ty}; }
function srcRaw(t,k){ const r=rawPair(t,k); if (r.ty==='-') return {kind:'none', lbl:`G${r.g+1} pair ${r.p+1}: no audio`};
  if (r.ty==='P') return {kind:'pcm', g:r.g, p:r.p, lbl:`G${r.g+1} pair ${r.p+1} PCM`};
  return {kind:'data', ty:r.ty, g:r.g, p:r.p, lbl:`G${r.g+1} pair ${r.p+1} ${TYPE[r.ty]} (raw data)`}; }
function route(t){
  const w=world(t), d=dipDecode(w), U=dolbyUpper(t), ai=audioInfo(t);
  const os = D.literal ? U.os : d.mode, cat = D.literal ? U.cat : (U.ci===null?0:U.ci);
  const rv=[rvLow(0,t), rvLow(1,t)];
  const decIn = srcRaw(t, cat);
  const decOK = w.cat && decIn.kind==='data' && !rv[0].low && os>0;
  const dec = ch => { const lab = decOK ? DEC[decIn.ty][ch] : null;
    return lab ? {kind:'dec', ch:lab, lbl:`decoder ${lab}`} : {kind:'silent', lbl: !w.cat? 'decoder output (no CAT552 fitted): silence' : decIn.kind!=='data' ? 'decoder: no Dolby on its input — silence ('+'inferred'+')' : 'decoder in reset'}; };
  const decPair = (a,b,name)=>({kind:'decpair', a:dec(a), b:dec(b), lbl:name+': '+[dec(a),dec(b)].map(x=>x.kind==='dec'?x.ch:'—').join(' / ')});
  const bnc=[];
  for (let k=0;k<4;k++){
    let s;
    if (os===0) s=srcRaw(t,k);
    else if (k===0) s=decPair(0,1,'DADA'); else if (k===1) s=decPair(2,3,'DADB'); else if (k===2) s=decPair(4,5,'DADC');
    else if (os===1){ const m=[1,0,3,2][cat]; s=Object.assign({}, srcRaw(t,m)); s.lbl = 'PCM partner → '+s.lbl; }
    else if (os===2) s=decPair(6,7,'DADD');
    else s={kind:'downmix', ok:decOK, lbl: decOK? 'DADM: Lt/Rt downmix' : 'DADM: silence'};
    if (os===2 && k<4 && D.fpga==='v102' && s.kind!=='none') s=Object.assign({}, s, {corrupt:true, lbl:s.lbl+' — clocked by SCLK1/2, not SCLK3'});
    const grp = k<2?0:1; if (rv[grp].low && os===0) s={kind:'reset', lbl:'held in reset ('+rv[grp].why+')'};
    if (!(ai & BNC_BIT[k])) s={kind:'muted', lbl:'AES transmitter off (AUDIO_INFORMATION bit '+Math.log2(BNC_BIT[k])+' = 0)'};
    bnc.push(s);
  }
  const phx=[];
  for (let k=0;k<4;k++){
    let s = d.dolby_off_110 ? srcRaw(t,k) : bnc[k];
    if (d.dolby_off_110){ const grp=k<2?0:1; if (rv[grp].low) s={kind:'reset', lbl:'held in reset'}; }
    if (!(ai & PHX_BIT[k])) s={kind:'muted', lbl:'transmitter off (AUDIO_INFORMATION bit '+Math.log2(PHX_BIT[k])+' = 0)'};
    phx.push(s);
  }
  return {os, cat, bnc, phx, decIn, decOK, ai, U, rv, d};
}
/* ---------------- sample values ---------------- */
const pcmF = (g,p,s)=> 200*(2*g+p+1) + 100*s;
function chSample(src, side, t){
  if (!src) return 0; const n=Math.floor(t*FS)/FS;
  switch(src.kind){
    case 'pcm': { const v=0.5*Math.sin(2*Math.PI*pcmF(src.g,src.p,side)*n); return src.corrupt? Math.sign(v)*0.5 : v; }
    case 'data': { const k=Math.floor(t*FS); let x=(k*2654435761 + side*97 + src.g*31)>>>0; x^=x>>>13; x=(x*1274126177)>>>0; return ((x&0xFFFF)/32768-1)*0.9; }
    case 'decpair': return chSample(side? src.b : src.a, 0, t) * (src.corrupt? 1:1);
    case 'dec': { const v=0.5*Math.sin(2*Math.PI*DF[src.ch]*n); return v; }
    case 'downmix': if (!src.ok) return 0; return 0.3*(side? Math.sin(2*Math.PI*DF.R*n) : Math.sin(2*Math.PI*DF.L*n)) + 0.2*Math.sin(2*Math.PI*DF.C*n) + (side?0.15:-0.15)*Math.sin(2*Math.PI*DF.Ls*n);
    default: return 0;
  }
}
function outSample(src, side, t){ const v = chSample(src, side, t); return src && src.corrupt ? Math.sign(v)*Math.min(0.5,Math.abs(v)*4) : v; }

/* ---------------- actions (each one logs the firmware path) ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s); fn(tr);
  D.log.unshift({t:SIM.t, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const SWNAME=['Group 1 MSB','Group 1 LSB','Group 2 MSB','Group 2 LSB','Dolby Auto Detection (code: auto_swap)','Non Multi-Channel Balanced Output (code: dolby_off_110)','Mode 1 (code: pod31_mode +2)','Mode 0 (code: pod31_mode +1)'];
const A = {
  dip(i){ const w=world(SIM.t), nd=w.dip.slice(); nd[i]=!nd[i]; const before=dipDecode(w);
    act(`SW${i+1} ${nd[i]?'ON':'OFF'} (${SWNAME[i]})`, tr=>{
      addEv('dip', nd); const w2=world(SIM.t), d=dipDecode(w2);
      tr(`The DIP switch reaches FPGA pins dip1…dip8 (181–188). Next pass: ALTERA_read() shifts it out as ALTERA13 on PB4 (read_data2)`);
      tr(`PROCESS_DIP_SWITCHES(): ALTERA13 = INVERT_DATA(…) = 0x${hx(d.a13)} = ${bn(d.a13)}b`);
      if (i<4){ const g = i<2? 1:2; const ob = i<2? before.g1 : before.g2, nb = i<2? d.g1 : d.g2;
        tr(`audio${g} = ${i<2?d.audio1:d.audio2} → group_sel${g} = audio${g} >> 1 = ${nb} (group ${nb+1})`);
        tr(`ALTERA_write(): group_data = audio1 | audio2<<3 | dolby_off_110<<6 = 0x${hx(d.audio1|(d.audio2<<3)|((d.dolby_off_110?1:0)<<6))} → HD_group_sel / SD demux pick the new DIDs`);
        if (((ob&6)>>1)===((nb&6)>>1)) tr(`PROCESS_GROUP_COMPARE${g}(): (group_sel${g} & (BIT2|BIT1)) >> 1 is ${(nb&6)>>1} before and after → ERROR${g===1?'5':'2_5'} stays 1. A ${ob+1}↔${nb+1} change does NOT reset the audio path (mask bug, see Findings)`);
        else tr(`PROCESS_GROUP_COMPARE${g}(): MSB changed → ERROR${g===1?'5':'2_5'} = 0 → TRANSLATE_RESET_VECTOR${g===1?'':'1'} clears bit 4 for ${RVC} passes (≈${(RVC*LT*1e3).toFixed(0)} ms)`);
      } else if (i===4) tr(`auto_swap = ${d.auto_swap?'YES':'NO'}: ALTERA_write uses ${d.auto_swap?'cat_input2 when compressed_set2 (a second compressed pair) else cat_input1':'cat_input1 (first compressed pair)'} for CAT1:CAT0`);
      else if (i===5) tr(`dolby_off_110 = ${d.dolby_off_110?'YES':'NO'} → group_data bit 6 → switch_110 sel: Phoenix outputs carry ${d.dolby_off_110?'the raw de-embedded pairs':'the same signals as the BNCs'}`);
      else { tr(`pod31_mode = ${d.mode} → ${MODE_TXT[d.mode]}`); tr(`ALTERA_write(): dolby_upper |= pod31_mode << 5 → OS1:OS0 = ${bn(d.mode,2)} → OUTPUT_SELECT “${OS_TXT[d.mode]}”`);
        if (d.mode>0 && !w2.cat) tr(`No CAT552 fitted: DOLBY_DECODER_STATUS sees DOLBY_INSTALLED (ALTERA16 bit 6) low; after 2000 passes RESET_DOLBY sets reset_enable → the group-1 audio path is reset for ${RVC} passes, over and over (watch the timeline)`);
        if (d.mode===2 && D.fpga==='v102') tr('v102 OUTPUT_SELECT switches the I²S clocks only on sel0, so in Mode 3 (sel = 10) the decoder data is clocked out by the de-embedder clocks — the 2012 test report saw sine waves turned to square waves');
      }
    }); },
  cable(on){ act(on?'Plug SDI into INPUT':'Pull the SDI cable', tr=>{ addEv('cable', on);
    tr(`GS1524 equaliser → GS1560A deserialiser ${on?'locks after ≈'+(T_LOCK*1e3)+' ms ('+'inferred'+')':'loses carrier'}`);
    tr(`READ_GS1560_STATUS(): ~RC_BYP (PE7), LOCK_60 (PD2), SMPTE (PG3) → PROCESS_SDI_LOCK_STATUS(): CD = ${on?1:0}`);
    tr(on? 'ERR_LED_OFF, SD_LED_ON (always, even for HD), HD_LED_ON if SD/~HD (PD7) is low' : 'ERR_LED_ON, SD/HD LEDs off, group LEDs off');
    tr(`TRANSLATE_RESET_VECTOR(1): CD = 0 forces bit 4 low; after CD returns it stays low ${RVC} more passes, then the FPGA audio path restarts`);
    if (!on) tr('reset_552 = 0 is written — but bit 7 of dolby_upper is never cleared, so RESET_552 (P5-3) stays high (see Findings)'); }); },
  fmt(f){ act('SDI format → '+VF[f].name, tr=>{ const old=VF[world(SIM.t).fmt]; addEv('fmt', f);
    tr('GS1560A re-locks (CD drops for ≈'+(T_LOCK*1e3)+' ms, inferred)'); tr(`SD/~HD pin = ${VF[f].sd?1:0} → PROCESS_HD_SD_CONTROL(): PB7 (ALTERA15) = ${VF[f].sd?'1 SD demux':'0 HD demux'}, PG4 = ${VF[f].sd?'10':'20'}-bit mode`);
    if (old.sd!==VF[f].sd) tr('PROCESS_HD_SD_COMPARE(): sd_hd changed → ERROR6 = ERROR2_6 = 0 → both reset vectors drop'); }); },
  grp(g,p,v){ act(`Source: group ${g+1} pair ${p+1} → ${TYPE[v]}`, tr=>{ const w=world(SIM.t), n=JSON.parse(JSON.stringify(w.grp)); n[g][p]=v; addEv('grp', n);
    tr(`The SDI now carries ${TYPE[v]} in group ${g+1}, AES pair ${p+1}`);
    if (v==='E'||v==='D') tr(`non_audio_detector.vhd: four zero words then Pa/Pb (0xF872/0x4E1F, or the 20/24-bit forms) → latches Pc bits 14–8 → ALTERA14–17; data type ${v==='E'?'28 = PC_DOLBY_E':'1 = PC_DOLBY_AC3'}`);
    else tr(`If this pair was carrying Dolby, the detector holds its flag ${(HOLD[D.fpga]*1e3).toFixed(0)} ms (${D.fpga} count) before PROCESS_AUDIO_FORMAT sees PCM`); }); },
  cat(on){ act(on?'Fit the CAT No. 552 Dolby decoder card':'Remove the CAT No. 552 card', tr=>{ addEv('cat', on);
    tr(`P5 (CAT_NO_552_RA): DADA–DADD, DADM, DAFS/DABC ← decoder; EAD/EAFS/EABC → decoder; META → U25 ADM3485`);
    tr(`DOLBY_DECODER_STATUS(): DOLBY_INSTALLED = ALTERA16 bit 6 = ${on?1:0} → RESET_DOLBY() ${on?'Dolby_card_installed = YES':'counts to DOLBY_ERROR_COUNTER (2000) and resets'}`); }); },
  caterr(on){ act(on?'Inject: decoder channel map slips (CATMAP ERR)':'Clear CATMAP ERR', tr=>{ addEv('caterr', on);
    tr('CATMAPERR.vhd: decoder pair 1 is all-zero while pairs 2 and 3 are not → CATERR → ALTERA15 bit 6');
    tr(`DOLBY_CAT552_AUDIO_ERROR_CHECK(): after ${CAT_ERR_N} passes → dolby_audio_cat_error → reset_enable, reset_counter = ${RVC}, reset_552 = 0`);
    tr('readme.doc (3 Mar 2008): “Brought in the CATMAP ERR from the M6206A due the Dolby card misalignment”'); }); },
  power(){ const on=!world(SIM.t).power; act(on?'Power on':'Power off', tr=>{ addEv('power', on);
    if (on){ tr('init_devices(): port_init, watchdog_init (WDTCR = 0x09), timer0_init (4.792 ms), uart0_init (9600), spi_init (SPCR = 0xCC slave)'); tr('ALTERA_RESET(1000): PG2 high while counting 1000 WDRs, then PORTC |= 0x1F'); tr('DOLBY_INITIALIZATION(): dolby_upper = 0x87, dolby_lower = 0xFF'); } }); },
  clear(){ D.ev=[]; D.log=[]; SIM.refresh(); },
  reset(){ D.base=baseWorld(); D.ev=[]; D.log=[]; D.fpga='v400'; D.literal=false; D.scope=0; SIM.refresh(); },
};

/* ================================================================
   PANELS — real silkscreen (2016|49 drafting set) + mechanical cut-outs
   ================================================================ */
const LEDX = {pwr:299, sd:561, hd:611, err:661, g:[781,831,881,931], d:[1051,1101,1151,1201], e:1321, dd:1371};
const LC = { g:['#47e264','#1c2d1f'], y:['#f6d43a','#3a3417'], r:['#ff4a3a','#3d1b18'] };
function frontSVG(t, opts){
  opts=opts||{}; const L=ledsAt(t), w=world(t);
  const led=(x,on,c)=>`<circle cx="${x}" cy="217" r="14" fill="#070808"/><circle cx="${x}" cy="217" r="10" fill="${on?LC[c][0]:LC[c][1]}" ${on?'filter="url(#p31glow)"':''}/>${on?`<circle cx="${x-3}" cy="214" r="3.3" fill="#fff" opacity=".5"/>`:''}`;
  return `<svg viewBox="0 0 1713 321" role="img" aria-label="POD31 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p31glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1713" height="321" rx="8" fill="#141517"/>
    <image href="${ASSET}pod31-front-green.png" width="1713" height="321"/>
    <image href="${ASSET}pod31-front-white.png" width="1713" height="321"/>
    <g class="p31pwr" style="cursor:pointer"><rect x="130" y="54" width="101" height="154" rx="8" fill="#0a0b0c" stroke="#33363a" stroke-width="2"/>
      <rect x="142" y="${w.power?64:118}" width="77" height="78" rx="6" fill="#1d2023" stroke="#3b3f43"/><rect x="146" y="${w.power?70:178}" width="69" height="9" rx="3" fill="#2c2f33"/><title>Power switch (PWRSW, PAN256)</title></g>
    ${led(LEDX.pwr,L.pwr,'g')}${led(LEDX.sd,L.sd,'g')}${led(LEDX.hd,L.hd,'g')}${led(LEDX.err,L.err,'r')}
    ${L.g.map((v,i)=>led(LEDX.g[i],v,'y')).join('')}${L.d.map((v,i)=>led(LEDX.d[i],v,'y')).join('')}${led(LEDX.e,L.e,'g')}${led(LEDX.dd,L.dd,'y')}
    <circle cx="50" cy="160" r="7" fill="#46494c"/><circle cx="1664" cy="160" r="7" fill="#46494c"/>
    ${opts.hot||''}</svg>`;
}
const BX = {input:261, sdi1:411, sdi2:561, aes:[711,861,1011,1161]}, PX=[447,573,699,825];
function rearSVG(t){
  const w=world(t), R=route(t);
  const bnc=(x,id,tip,hot)=>`<g ${id?`class="p31jack" data-j="${id}" style="cursor:pointer"`:''}><circle cx="${x}" cy="198" r="52" fill="#b7babd" stroke="#6e7276" stroke-width="3"/><circle cx="${x}" cy="198" r="40" fill="#d9c27a"/><circle cx="${x}" cy="198" r="27" fill="#a98f3b"/><circle cx="${x}" cy="198" r="8" fill="#5b470f"/>${hot?`<circle cx="${x}" cy="198" r="56" fill="none" stroke="var(--accent)" stroke-width="5"/>`:''}<title>${tip}</title></g>`;
  let s=`<svg viewBox="0 0 1713 321" role="img" aria-label="POD31 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1713" height="321" rx="8" fill="#141517"/>
    <path d="M100 82 h80 l-8 96 h-64 z" fill="#c9a640" stroke="#7d6420" stroke-width="3"/><path d="M110 92 h60 l-6 76 h-48 z" fill="#ece6d4"/>
    ${[0,1,2,3,4].map(i=>`<circle cx="${120+i*10}" cy="112" r="4" fill="#7d6420"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="${125+i*10}" cy="148" r="4" fill="#7d6420"/>`).join('')}
    <circle cx="140" cy="32" r="13" fill="#aeb2b6"/><circle cx="140" cy="228" r="13" fill="#aeb2b6"/>`;
  s += bnc(BX.input,'in',`INPUT (SD/HD-SDI) — ${w.cable?'click to pull the cable':'click to plug in'}`, false);
  if (w.cable) s += `<rect x="${BX.input-20}" y="250" width="40" height="71" fill="#2b5f9e"/><rect x="${BX.input-34}" y="232" width="68" height="34" rx="8" fill="#3a74b8"/>`;
  s += bnc(BX.sdi1,null,'SDI 1 — reclocked output (GS1528 cable driver)') + bnc(BX.sdi2,null,'SDI 2 — reclocked output');
  BX.aes.forEach((x,k)=>{ s+=bnc(x,'a'+k,`AES ${k+1} (75 Ω unbalanced): ${R.bnc[k].lbl} — click to put it on the scope`, D.scope===k); });
  PX.forEach((x,k)=>{ const on = R.phx[k].kind!=='muted'; s+=`<g><rect x="${x-53}" y="24" width="106" height="62" rx="4" fill="#23a052" stroke="#0f5a2b" stroke-width="2"/>${[-30,0,30].map(d=>`<rect x="${x+d-11}" y="40" width="22" height="26" rx="3" fill="#0d3a1c"/>`).join('')}<circle cx="${x+42}" cy="32" r="5" fill="${on?'#9ff0b4':'#2b4a33'}"/><title>AES ${k+1} Phoenix (110 Ω, PE-65612 transformer): ${R.phx[k].lbl}</title></g>`; });
  s += `<rect x="998" y="14" width="176" height="84" rx="4" fill="#4b7fd1" stroke="#244c8c" stroke-width="2"/>`;
  w.dip.forEach((on,i)=>{ const x=1010+i*20.5; s+=`<g class="p31dip" data-i="${i}" style="cursor:pointer"><rect x="${x}" y="30" width="15" height="52" rx="2" fill="#dfe6f2"/><rect x="${x+1.5}" y="${on?32:56}" width="12" height="24" rx="2" fill="#fbfcff" stroke="#8b97ab"/><text x="${x+7.5}" y="26" font-size="11" text-anchor="middle" fill="#fff">${i+1}</text><title>SW${i+1} ${SWNAME[i]}: ${on?'ON':'OFF'} — click to flip</title></g>`; });
  s += `<text x="1003" y="94" font-size="10" fill="#fff">ON ▲</text>
    <rect x="1358" y="33" width="251" height="216" rx="14" fill="#0a0b0c" stroke="#2f3236" stroke-width="2"/><rect x="1378" y="60" width="96" height="160" rx="6" fill="#151719"/><rect x="1488" y="66" width="104" height="150" rx="12" fill="#050606"/>
    ${[[1520,98],[1560,98],[1540,170]].map(([x,y])=>`<rect x="${x-9}" y="${y-14}" width="18" height="28" rx="2" fill="#a8acb0"/>`).join('')}
    <image href="${ASSET}pod31-rear-white.png" width="1713" height="321"/></svg>`;
  return s;
}
function bindPanel(root){
  const p=root.querySelector('.p31pwr'); if (p) p.onclick=()=>A.power();
  root.querySelectorAll('.p31jack').forEach(g=>g.onclick=()=>{ const j=g.dataset.j; if (j==='in') A.cable(!world(SIM.t).cable); else { D.scope=+j.slice(1); SIM.refresh(); } });
  root.querySelectorAll('.p31dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
}
document.addEventListener('keydown', e=>{
  if (!window.__pod31Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (k>='1' && k<='8'){ A.dip(+k-1); e.preventDefault(); }
  else if (k==='c'){ A.cable(!world(SIM.t).cable); e.preventDefault(); }
  else if (k==='d'){ A.cat(!world(SIM.t).cat); e.preventDefault(); }
});

function controlsHTML(){
  const w=world(SIM.t);
  const sel=(g,p)=>`<select data-g="${g}" data-p="${p}" class="p31grp">${['P','E','D','-'].map(v=>`<option value="${v}" ${w.grp[g][p]===v?'selected':''}>${v==='P'?'PCM':v==='E'?'Dolby E':v==='D'?'AC-3':'—'}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px">
      <label>SDI format <select id="p31fmt">${Object.keys(VF).map(k=>`<option value="${k}" ${k===w.fmt?'selected':''}>${VF[k].name}</option>`).join('')}</select></label>
      <button id="p31cab">${w.cable?'Pull SDI cable here':'Plug SDI cable here'}</button>
      <label><input type="checkbox" id="p31cat" ${w.cat?'checked':''}> CAT No. 552 decoder fitted</label>
      <label>FPGA <select id="p31fpga"><option value="v102" ${D.fpga==='v102'?'selected':''}>v102 (issue 3, ${Y(2008)})</option><option value="v400" ${D.fpga==='v400'?'selected':''}>v400 (issue 4, ${Y(2012)})</option></select></label>
    </div>
    <table class="kv small" style="margin-top:6px"><tr><th>Embedded in the SDI</th>${[1,2,3,4].map(g=>`<th>Group ${g}</th>`).join('')}</tr>
      <tr><td>AES pair 1 (ch 1/2)</td>${[0,1,2,3].map(g=>`<td>${sel(g,0)}</td>`).join('')}</tr><tr><td>AES pair 2 (ch 3/4)</td>${[0,1,2,3].map(g=>`<td>${sel(g,1)}</td>`).join('')}</tr></table>
    <div class="small" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center">
      <button id="p31cerr">${w.caterr?'Clear CATMAP ERR':'Inject CATMAP ERR here'}</button><button id="p31clr">Clear timeline events</button><button id="p31rst">Defaults</button>
      <label title="Model the archived working/ source byte-for-byte, including the cat_input1 = 0 start-up value"><input type="checkbox" id="p31lit" ${D.literal?'checked':''}> literal <span class="mono">dolby_upper</span> (working/ source)</label>
    </div>
    <div class="small muted" style="margin-top:4px">Click the rear DIP switches (keys 1–8), the INPUT BNC (C) and an AES BNC (scope). D fits or removes the decoder. Changes happen at the playhead, so the timeline shows the before and after.</div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s);
  if (q('#p31fmt')) q('#p31fmt').onchange=e=>A.fmt(e.target.value);
  if (q('#p31cab')) q('#p31cab').onclick=()=>A.cable(!world(SIM.t).cable);
  if (q('#p31cat')) q('#p31cat').onchange=e=>A.cat(e.target.checked);
  if (q('#p31fpga')) q('#p31fpga').onchange=e=>{ D.fpga=e.target.value; RCACHE=null; act('FPGA image → '+D.fpga, tr=>{ tr(D.fpga==='v400'? 'v400 (Quartus II 9.1 SP2, Aug 2012|45): ICS662 + PLL1705 clocks, OUTPUT_SELECT clocks switch on (sel0 or sel1), detector hold 8191 frames' : 'v102 (Quartus II 5.1, Mar 2008|41): Dolby-card fixes, OUTPUT_SELECT clocks switch on sel0 only, detector hold 32767 frames. The 2012 report says this source no longer compiled'); }); };
  if (q('#p31cerr')) q('#p31cerr').onclick=()=>A.caterr(!world(SIM.t).caterr);
  if (q('#p31clr')) q('#p31clr').onclick=()=>A.clear();
  if (q('#p31rst')) q('#p31rst').onclick=()=>A.reset();
  if (q('#p31lit')) q('#p31lit').onchange=e=>{ D.literal=e.target.checked; act('Literal dolby_upper '+(D.literal?'on':'off'), tr=>tr(D.literal?'OS1:OS0 and CAT1:CAT0 now come from the byte ALTERA_write really builds. Until the first compressed pair is seen, cat_input1 = 0 and (0 − 0x31) << 3 = 0x78 sets OS = 11 and CAT = 11 whatever the mode switches say.':'Routing follows the DIP mode, as the manual describes.')); };
  m.querySelectorAll('.p31grp').forEach(s=>s.onchange=e=>A.grp(+s.dataset.g,+s.dataset.p,e.target.value));
}

/* ---------------- timeline lanes ---------------- */
function segs(fn, t0, t1, N){ const out=[]; let prev=null, a=t0; for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=i<N?fn(tt):null; if (i===0){ prev=v; continue; } if (v!==prev || i===N){ out.push([a, tt, prev]); a=tt; prev=v; } } return out; }
function lanes(){
  const css=n=>SIM.css(n), ls=[]; let RG=null, RGK='';
  const rgrid=(t0,t1)=>{ const k=t0+'|'+t1; if (k!==RGK){ RGK=k; RG=[]; for (let i=0;i<=240;i++) RG.push(route(t0+(t1-t0)*i/240)); } return RG; };
  ls.push({label:'SDI in: frames (V) / lines (H)', h:30, draw(c,X,t0,t1,y,h){
    const w=world(SIM.t), f=VF[w.fmt]; if (!w.cable||!w.power){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no SDI', X(t0)+6, y+h/2+4); }
    const span=t1-t0; if (span < 60*lineT(f)) SIM.pulses(c,X,t0,t1,y+h*0.5,h*0.5,lineT(f),0,lineT(f)*0.04,css('--ink2'),'EAV/SAV + HANC');
    SIM.pulses(c,X,t0,t1,y,h*(span<60*lineT(f)?0.45:1),frameT(f),0,lineT(f)*20,css('--accent2'),'frames'); }});
  ls.push({label:'GS1560A CD (LOCK_60·SMPTE·~RC_BYP)', h:22, draw(c,X,t0,t1,y,h){
    segs(CD,t0,t1,400).forEach(([a,b,v])=>{ c.fillStyle=v?css('--accent'):css('--bad'); c.globalAlpha=v?.7:.45; c.fillRect(X(a),y+4,X(b)-X(a),h-8); c.globalAlpha=1; if (X(b)-X(a)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(v?'CD = 1 · '+(VF[world(a).fmt].sd?'SD':'HD'):'CD = 0 (ERR)', X(a)+4, y+h/2+4);} }); }});
  ls.push({label:'Selected groups: HANC audio packets', h:26, draw(c,X,t0,t1,y,h){
    const w=world(SIM.t), f=VF[w.fmt], d=dipDecode(w); const span=t1-t0;
    [d.g1,d.g2].forEach((g,r)=>{ const has=w.grp[g].some(x=>x!=='-'); const yy=y+2+r*(h/2);
      if (!has||!w.cable){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`group ${g+1}: no packets`, X(t0)+4, yy+9); return; }
      if (span < 200*lineT(f)) SIM.pulses(c,X,t0,t1,yy,h/2-3,lineT(f),lineT(f)*0.05,lineT(f)*0.08,r?css('--warn'):css('--accent'),'');
      else { c.fillStyle=r?css('--warn'):css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),yy,X(t1)-X(t0),h/2-3); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`group ${g+1} (DID ${f.sd?['2FF','1FD','1FB','2F9'][g]:['2E7','1E6','1E5','2E4'][g]}): one packet per line, ≈${(FS*lineT(f)).toFixed(2)} samples each`, X(t0)+4, yy+9); } }); }});
  ls.push({label:'SMPTE 337 bursts → non_audio_detector', h:44, draw(c,X,t0,t1,y,h){
    for (let k=0;k<4;k++){ const yy=y+2+k*10.5;
      const w=world(t0), ty=posTypeW(w,k);
      segs(tt=>{ const cf=compFlag(k,tt); return cf? cf.type : ''; },t0,t1,300).forEach(([a,b,v])=>{ if (!v) return; c.fillStyle=v==='E'?css('--accent2'):css('--warn'); c.globalAlpha=.3; c.fillRect(X(a),yy,X(b)-X(a),7); c.globalAlpha=1; });
      for (const ty2 of ['E','D']){ const f=VF[w.fmt]; let b=lastBurst(ty2,f,t0); for (; b<t1; b+=burstP(ty2,f)){ if (posType(b+1e-6,k)!==ty2) continue; c.fillStyle=ty2==='E'?css('--accent2'):css('--warn'); c.fillRect(X(b), yy, Math.max(1,X(b+burstLen(ty2,f))-X(b)), 7); } }
      c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('AES'+(k+1), X(t0)+2, yy+7); } }});
  ls.push({label:'ATmega128 main loop', h:30, draw(c,X,t0,t1,y,h){
    const pxPass=X(t0+LT)-X(t0); const n0=passOf(t0), n1=passOf(t1)+1;
    if (pxPass>60){ for (let n=n0;n<n1;n++){ STEPS.forEach((s,j)=>{ const a=(n+SFRAC[j])*LT, b=a+s[1]*LT; c.fillStyle= j===4||j===3? css('--accent2') : css('--accent'); c.globalAlpha=j%2?.55:.8; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h-6); c.globalAlpha=1; if (X(b)-X(a)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' ')[0].slice(0,26), X(a)+3, y+h/2+3); } }); } }
    else if (pxPass>2){ for (let n=n0;n<n1;n++){ c.fillStyle=n%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(n*LT),y+3,Math.max(1,pxPass-0.5),h-6); } c.globalAlpha=1; }
    else { c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+3,X(t1)-X(t0),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${n1-n0} passes in view, ≈${(LT*1e3).toFixed(3)} ms each (${LOOP_CYC} cycles at 4.9152 MHz, inferred)`, X(t0)+6, y+h/2+4); } }});
  ls.push({label:'ALTERA bus: write 48 b / read 144 b', h:20, draw(c,X,t0,t1,y,h){
    const pxPass=X(t0+LT)-X(t0); if (pxPass<3){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('PC5 clock, PC0 data out, PC1/PB3/PB4 data in — zoom in to see each transfer', X(t0)+4, y+h/2+4); return; }
    for (let n=passOf(t0); n<=passOf(t1); n++){ const a=(n+SFRAC[3])*LT, b=a+STEPS[3][1]*LT, r=b+STEPS[4][1]*LT; c.fillStyle=css('--warn'); c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)),h-8); c.fillStyle=css('--accent2'); c.fillRect(X(b),y+4,Math.max(1,X(r)-X(b)),h-8); } }});
  ls.push({label:'timer0 overflow ISR (4.792 ms)', h:16, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,T0,0,20/F_CPU*20,css('--ink2'),'reload TCNT0 only'); }});
  ls.push({label:'RESET_VECTOR bit 4 (grp 1) / RESET_VECTOR1 (grp 2)', h:26, draw(c,X,t0,t1,y,h){
    [0,1].forEach(g=>{ const yy=y+2+g*(h/2); segs(tt=>rvLow(g,tt).low,t0,t1,500).forEach(([a,b,v])=>{ c.fillStyle=v?css('--bad'):css('--accent'); c.globalAlpha=v?.65:.35; c.fillRect(X(a),yy,X(b)-X(a),h/2-3); c.globalAlpha=1; if (v && X(b)-X(a)>90){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('reset ('+rvLow(g,a+1e-6).why.slice(0,40)+')', X(a)+3, yy+9);} }); }); }});
  ls.push({label:'CAT No. 552 decoder (P5)', h:22, draw(c,X,t0,t1,y,h){
    segs(tt=>{ const w=world(tt); if (!w.cat) return 'none'; const R=route(tt); return R.os===0?'idle': R.decOK? 'dec' : rvLow(0,tt).low? 'reset' : 'idle'; },t0,t1,300).forEach(([a,b,v])=>{
      c.fillStyle= v==='dec'?css('--accent2'): v==='reset'?css('--bad'): css('--grid'); c.globalAlpha=.6; c.fillRect(X(a),y+4,X(b)-X(a),h-8); c.globalAlpha=1;
      if (X(b)-X(a)>110){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(v==='none'?'not fitted':v==='dec'?'decoding → DADA–DADD, DADM':v==='reset'?'audio path reset':'fitted, nothing to decode', X(a)+4, y+h/2+4);} }); }});
  ls.push({label:'AES3 out: blocks / frames (48 kHz)', h:20, draw(c,X,t0,t1,y,h){ const span=t1-t0; if (span<0.004) SIM.pulses(c,X,t0,t1,y+h/2,h/2,1/FS,0,0.12/FS,css('--accent'),'frames'); SIM.pulses(c,X,t0,t1,y,h*(span<0.004?0.45:1),192/FS,0,1/FS,css('--warn'),'192-frame blocks (Z)'); }});
  for (let k=0;k<4;k++) ls.push({label:`AES ${k+1} BNC`, h:34, draw(c,X,t0,t1,y,h){
    const rg0=rgrid(t0,t1), s=route(SIM.t).bnc[k]; const quiet=x=>['muted','none','reset','silent'].includes(x.kind) || (x.kind==='decpair' && x.a.kind!=='dec' && x.b.kind!=='dec') || (x.kind==='downmix'&&!x.ok); const pw=X(t1)-X(t0), N=Math.min(1400,Math.max(200,pw*2)), span=t1-t0;
    c.fillStyle=css('--ink2'); c.font='9.5px sans-serif'; c.fillText(s.lbl.slice(0,70), X(t0)+3, y+9);
    if (rg0.every(r=>quiet(r.bnc[k]))){ c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2+4); c.lineTo(X(t1),y+h/2+4); c.stroke(); return; }
    [0,1].forEach(sd=>{ c.strokeStyle=sd?css('--bad'):css('--accent'); c.lineWidth=1;
      if (span*1000 > pw/3){ c.globalAlpha=.3; c.fillStyle=c.strokeStyle; for (let i=0;i<240;i++){ if (!quiet(rg0[i].bnc[k])) c.fillRect(X(t0+span*i/240), y+12+sd*10, pw/240+0.5, 8); } c.globalAlpha=1; return; }
      const rg=rgrid(t0,t1); c.beginPath(); for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const tr=rg[Math.min(240,Math.round(i/N*240))].bnc[k]; const v=outSample(tr,sd,tt); const yy=y+h/2+4-v*(h/2-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }); }});
  ls.push({label:'LEDs: SD HD ERR · G1–4 · D1–4 · E DD', h:56, draw(c,X,t0,t1,y,h){
    const N=Math.min(500,Math.max(80,(X(t1)-X(t0))/2)), span=t1-t0, G='#47e264', Yl='#e3b52a';
    const rows=[[L=>L.sd,G],[L=>L.hd,G],[L=>L.err,'#ff4a3a'],[L=>L.g[0],Yl],[L=>L.g[1],Yl],[L=>L.g[2],Yl],[L=>L.g[3],Yl],[L=>L.d[0],Yl],[L=>L.d[1],Yl],[L=>L.d[2],Yl],[L=>L.d[3],Yl],[L=>L.e,G],[L=>L.dd,Yl]];
    for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, L=ledsAt(tt); rows.forEach(([f,col],r)=>{ if (f(L)){ c.fillStyle=col; c.fillRect(X(t0+span*i/N), y+2+r*4, (X(t1)-X(t0))/N+0.5, 3); } }); } }});
  return ls;
}

/* ---------------- AES3 frame on the scope ---------------- */
function aesBits(t, k){
  const R=route(t), s=R.bnc[k], n=Math.floor(t*FS), fr=n%192, out=[];
  const w=world(t), f=VF[w.fmt];
  for (const side of [0,1]){
    let raw;
    if (s.kind==='data'){ const b=lastBurst(s.ty,f,t), i=Math.floor((t-b)*FS); const PW=[0xF87200,0x4E1F00,((s.ty==='E'?28:1)<<8)|(side?0:0),0x0FA000];
      raw = (i>=0 && i<2) ? PW[i*2+side] : ((Math.floor(chSample(s,side,t)*8388607))&0xFFFFFF); }
    else { let v=Math.round(outSample(s,side,t)*8388607); raw = v<0? v+(1<<24) : v; }
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(raw>>b)&1;
    const cs0=0x85; bits[30] = fr<8? (cs0>>fr)&1 : 0; if (s.kind==='data' && fr===0) bits[30]=1; bits[29]=0; bits[28]= s.kind==='data'?1:0;
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, raw});
  }
  return {n, fr, sub:out, src:s};
}
function biphase(pre, bits, start){
  const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=P.map(b=>start?1-b:b); let cur=lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv;
}
function drawScope(cv, el, t){
  const F=aesBits(t, D.scope), {c,w}=SIM.canvas(cv,150);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  if (['muted','none','reset','silent'].includes(F.src.kind)){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText(`AES ${D.scope+1}: ${F.src.lbl}`, 10, 60); el.innerHTML=''; return; }
  const lA=biphase(F.sub[0].pre,F.sub[0].bits,0), lB=biphase(F.sub[1].pre,F.sub[1].bits,lA[lA.length-1]), lv=lA.concat(lB), cw=(w-20)/lv.length;
  [0,64].forEach(off=>[[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio'],[56,64,a2,'VUCP']].forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if((b-a)*cw>24) c.fillText(lb,12+(off+a)*cw,104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?30:80; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`AES ${D.scope+1} · subframe A (${F.sub[0].pre})`,12,14); c.fillText('subframe B (Y)',12+64*cw,14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of block · cell ${SIM.fmtDur(1/(FS*128))} · ${(FS*128/1e6).toFixed(3)} Mbaud`,10,130);
  el.innerHTML = `Source: ${F.src.lbl}<br>` + F.sub.map((s,i)=>`${i?'B':'A'}: 24-bit 0x${hx(s.raw,6)} · V=${s.bits[28]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>') +
    (F.src.kind==='data'? `<br><span class="muted">Data words: Pa 0xF872, Pb 0x4E1F, Pc data type ${F.src.ty==='E'?28:1} at each burst start; V = 1 and channel-status “non-audio” are ${inf}.</span>` : `<br><span class="muted">Channel status is ${inf} (i2sx4_aes.vhd generates it; the bytes are not documented).</span>`);
}

/* ================================================================ VIEWS ================================================================ */
const card=(t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a DIP switch, plug the cable or change the source. Each step the firmware takes is listed here.</div>'; }
function stateHTML(t){
  const w=world(t), d=dipDecode(w), R=route(t), af=audioFormat(t), U=R.U, st=stepAt(t);
  const rs=(R.rv[1].low?0:0x10)|0x0F, rs0=(R.rv[0].low?0:0x10)|0x0F, reset_data=(rs<<5)|rs0;
  return `<table class="kv">
    <tr><th>Main-loop pass</th><td class="mono">#${passOf(t)} · ${STEPS[st][0]}</td></tr>
    <tr><th>CD · format</th><td class="mono">${CD(t)?1:0} · ${VF[w.fmt].name} (${VF[w.fmt].rate}) · sd_hd = 0x${VF[w.fmt].sd?'80':'00'}</td></tr>
    <tr><th>DIP → ALTERA13</th><td class="mono">${w.dip.map((x,i)=>`SW${i+1}${x?'■':'□'}`).join(' ')} → 0x${hx(d.a13)}</td></tr>
    <tr><th>Selection</th><td class="mono">group_sel1 = ${d.g1} (G${d.g1+1}) · group_sel2 = ${d.g2} (G${d.g2+1}) · pod31_mode = ${d.mode} · auto_swap = ${d.auto_swap?'YES':'NO'} · dolby_off_110 = ${d.dolby_off_110?'YES':'NO'}</td></tr>
    <tr><th>aes1…4_led</th><td class="mono">${af.leds.map(x=>x==='P'?'PCM':x==='E'?'DOLBY_E':'DOLBY_AC3').join(' · ')}${af.E&&af.DD?' (both present → METADATA_CHIRP alternates)':''}</td></tr>
    <tr><th>ALTERA_write bytes</th><td class="mono small">dolby_upper ${hx(U.du)} · dolby_lower FF · reset ${hx(reset_data>>8)} ${hx(reset_data&255)} · AUDIO_INFORMATION ${hx(R.ai)} · group_data ${hx(d.audio1|(d.audio2<<3)|((d.dolby_off_110?1:0)<<6))}</td></tr>
    <tr><th>OUTPUT_SELECT</th><td class="mono">sel1:sel0 = ${bn(R.os,2)} “${OS_TXT[R.os]}” · CAT = ${bn(R.cat,2)} (AES${R.cat+1} → decoder)${D.literal && !stickyCat(t).seen?' <span style="color:var(--warn)">← 0x78 from cat_input1 = 0</span>':''}</td></tr>
    <tr><th>BNC outputs</th><td class="small">${R.bnc.map((s,k)=>`AES${k+1}: ${s.lbl}${s.corrupt?' <b style="color:var(--bad)">corrupt</b>':''}`).join('<br>')}</td></tr>
    <tr><th>Phoenix outputs</th><td class="small">${R.phx.map((s,k)=>`AES${k+1}: ${s.lbl}`).join('<br>')}</td></tr></table>`;
}
function viewSim(m){
  window.__pod31Active = true;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Front panel at the playhead', `<div id="fp"></div>`)}
      ${card('Rear panel — DIP switches, INPUT and AES BNCs are live', `<div id="rp"></div><div id="ctl"></div>`)}
    </div><div>
      ${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div></div>
    ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
      <p class="small muted">Main-loop pass ≈ ${(LT*1e3).toFixed(2)} ms is ${inf} from the instruction mix in <span class="mono">pod31_main.lis</span>: 192 bit-banged bits to and from the FPGA plus the Dolby metadata translation, at 4.9152 MHz. The flash rates follow from it: group LEDs blink ${CHIRP_ON+1} passes on, ${CHIRP_OFF+1} off (≈${((CHIRP_ON+CHIRP_OFF+2)*LT).toFixed(2)} s); the E/DD alternation is ${META_CHIRP+1} passes.</p>`)}
    <div class="grid2">${card('Scope: one AES3 frame at the playhead (biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  let lastKey='';
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    const key=JSON.stringify([world(t), D.fpga, D.literal]); if (key!==lastKey){ lastKey=key; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=stateHTML(t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from POD31 MANUAL.pdf) ---------------- */
const dd = ()=>dipDecode(world(SIM.t));
const LESSONS = [
  {title:'Meet the POD31', body:`<p>The POD31 is a half-rack <b>de-embedder</b>. It takes one SD or HD-SDI signal, picks out <b>two audio groups</b> (four AES pairs), and puts them on four rear BNCs (75 Ω) and four Phoenix connectors (110 Ω balanced). Two more BNCs give a reclocked copy of the SDI.</p><p>With the optional Dolby decoder card (CAT No. 552) it can also decode a Dolby E or AC-3 stream into 5.1 or 7.1 PCM.</p><p>Everything is set on the <b>rear DIP switch</b>. The front panel only shows status: SD / HD / ERR, AUDIO GROUPS 1–4, and DOLBY 1–4, E and DD.</p>`, check:()=>true, auto:true},
  {title:'1 · Feed it SDI', body:`<p>The INPUT BNC has an HD-SDI signal. When the GS1560A receiver locks, <b>SD</b> lights (it means “locked”, even for HD), <b>HD</b> lights for HD, and <b>ERR</b> goes out.</p><p><b>Goal:</b> a locked input. If ERR is red, click the INPUT BNC to plug the cable in.</p>`, check:()=>CD(SIM.t), hint:'Click the INPUT BNC on the rear panel (or press C).'},
  {title:'2 · Choose the second group', body:`<p>SW1/SW2 choose the group for AES1–2, SW3/SW4 the group for AES3–4 (Table 1: OFF OFF = 1, OFF ON = 2, ON OFF = 3, ON ON = 4). With every switch OFF, both selectors take group 1.</p><p><b>Goal:</b> send <b>group 2</b> to AES3/AES4.</p>`, check:()=>dd().g2===1 && dd().g1===0, hint:'Turn SW4 ON (click switch 4, or press 4). SW1–SW3 stay OFF.'},
  {title:'3 · A missing group flashes', body:`<p>Choose a group the SDI does not carry. Its AUDIO GROUPS LED <b>flashes</b> (≈0.1 s on, 0.6 s off) to say “no audio”, and the firmware switches those AES transmitters off.</p><p><b>Goal:</b> send <b>group 4</b> (empty here) to AES3/AES4, and watch its LED.</p>`, check:()=>dd().g2===3, hint:'SW3 ON and SW4 ON.'},
  {title:'4 · Find the Dolby', body:`<p>Group 3 carries <b>Dolby E</b> on its first pair. Send group 3 to AES3/AES4. The FPGA spots the SMPTE 337 sync words, so <b>DOLBY 3</b> and <b>E</b> light up. (The manual says the group LED flashes too; the firmware does not do that.)</p><p><b>Goal:</b> DOLBY 3 and E lit.</p>`, check:()=>{ const L=ledsAt(SIM.t); return L.d[2]&&L.e; }, hint:'SW3 ON, SW4 OFF: group 3.'},
  {title:'5 · Fit the decoder, Mode 2', body:`<p>Tick <b>CAT No. 552 decoder fitted</b>, then set <b>Mode 2</b> (SW7 OFF, SW8 ON): 6-channel Dolby + 1 PCM. AES1 = L/R, AES2 = C/LFE, AES3 = Ls/Rs, and AES4 = the PCM pair that shares the Dolby pair's group.</p><p><b>Goal:</b> decoder fitted and Mode 2.</p>`, check:()=>world(SIM.t).cat && dd().mode===1, hint:'Tick the checkbox under the rear panel (or press D), then turn SW8 ON (key 8).'},
  {title:'6 · Mode 3 and the clock bug', body:`<p>Set <b>Mode 3</b> (SW7 ON, SW8 OFF): 8-channel Dolby; AES4 carries channels 7/8.</p><p>Switch the FPGA to <b>v102</b>. In that image <span class="mono">OUTPUT_SELECT</span> switches the I²S clocks only on <span class="mono">sel0</span>, so Mode 3 clocks the decoder's data with the wrong clock. The 2012|45 test report saw sine waves turned into square waves. v400 switches on <span class="mono">sel0 or sel1</span>.</p><p><b>Goal:</b> Mode 3 on v102; look at the AES traces, then go back to v400.</p>`, check:()=>dd().mode===2 && D.fpga==='v400', hint:'SW7 ON, SW8 OFF; try v102, then set the FPGA back to v400.'},
  {title:'7 · Mode 4: Lt/Rt downmix', body:`<p>Set <b>Mode 4</b> (SW7 ON, SW8 ON). AES4 now carries the decoder's Lt/Rt downmix (DADM).</p><p><b>Goal:</b> Mode 4.</p>`, check:()=>dd().mode===3, hint:'SW7 and SW8 ON.'},
  {title:'8 · Keep the Phoenix outputs plain', body:`<p>SW6 is “Non Multi-Channel Balanced Output”. ON: the four Phoenix outputs carry the plain two-group de-embed (as in Mode 1), while the BNCs carry the decoded audio. In the code it is <span class="mono">dolby_off_110</span>, which drives <span class="mono">switch_110.vhd</span>.</p><p><b>Goal:</b> SW6 ON. Hover the green Phoenix blocks to see what each carries.</p>`, check:()=>dd().dolby_off_110, hint:'Turn SW6 ON (key 6).'},
  {title:'9 · Two Dolby pairs: SW5', body:`<p>Set group 3 pair 2 to <b>AC-3</b> in the source table. Now two pairs are compressed: DOLBY 3 and 4 light, and E and DD take turns (every ≈0.3 s) because both kinds are present.</p><p>The decoder only takes one pair. SW5 (the manual calls it “Dolby Auto Detection”; the code calls it <span class="mono">auto_swap</span>) makes it take the <b>second</b> compressed pair.</p><p><b>Goal:</b> two compressed pairs and SW5 ON.</p>`, check:()=>{ const af=audioFormat(SIM.t); return af.leds.filter(x=>x!=='P').length>=2 && dd().auto_swap; }, hint:'Group 3 pair 2 → AC-3, then SW5 ON (key 5).'},
  {title:'10 · Pull the cable', body:`<p>Pull the SDI cable. ERR lights, the group LEDs go out, and both reset vectors drop. When you plug it back in, the audio path stays in reset for ${RVC} more loop passes (≈0.1 s) before the outputs return.</p><p><b>Goal:</b> pull and re-plug the cable, then scrub the timeline across the gap.</p>`, check:()=>D.ev.some(e=>e.k==='cable'&&!e.v) && world(SIM.t).cable, hint:'Click INPUT twice at different playhead positions.'},
  {title:'Done', body:`<p>You have used every setting the POD31 has. <b>Software</b> shows the main loop and the bytes on the MCU–FPGA link, <b>One second</b> breaks the signal down from SDI lines to AES bits, and <b>Findings</b> lists what the firmware really does, including where it disagrees with the manual.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__pod31Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the POD31', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div><div id="ctl"></div>`)}${card('What the software did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot=`<rect x="540" y="150" width="140" height="130" fill="transparent"><title>SDI: SD = locked (any format), HD = HD format, ERR = no valid SDI</title></rect><rect x="750" y="150" width="210" height="130" fill="transparent"><title>AUDIO GROUPS: solid = selected group has audio, flashing = selected group empty</title></rect><rect x="1020" y="150" width="380" height="130" fill="transparent"><title>DOLBY 1–4: which AES position carries a compressed stream; E = Dolby E, DD = Dolby Digital (AC-3)</title></rect>`;
  let lastKey='';
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    const key=JSON.stringify([world(t), D.fpga, D.literal]); if (key!==lastKey){ lastKey=key; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ lessonIdx=0; A.reset(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, broken down ---------------- */
function viewSecond(m){
  window.__pod31Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}${card('As seen by the front panel', `<div id="fp"></div><p class="small muted">Scrub or play: the AUDIO GROUPS flash and the E/DD alternation are counted in main-loop passes, not in time.</p>`)}</div>
    ${card('Zoom ladder at the playhead (AES output on the scope)', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, w=world(t), f=VF[w.fmt];
    const rows=[
      ['SDI words (10-bit)', (f.sd? 27e6 : 2*f.clk).toLocaleString(undefined,{maximumFractionDigits:0}), SIM.fmtDur(1/(f.sd?27e6:2*f.clk)), `${f.rate} serial → GS1560A → Yin/Cin[9:0] at pclk ${(f.clk/1e6).toFixed(3)} MHz`],
      ['Video frames', f.fr.toFixed(3), SIM.fmtDur(frameT(f)), 'Dolby E bursts follow the frame (one per frame)'],
      ['Video lines', Math.round(f.lines*f.fr).toLocaleString(), SIM.fmtDur(lineT(f)), `${f.spl} samples per line; one HANC audio packet per group per line`],
      ['Audio samples per line', (FS*lineT(f)).toFixed(3), '', 'So each packet carries 1 or 2 (HD) or 3 (SD) samples per channel'],
      ['AES3 frames (48 kHz)', FS.toLocaleString(), SIM.fmtDur(1/FS), 'i2sx4_aes.vhd builds 4 streams; ×2 more on the Phoenix side'],
      ['AES3 blocks', (FS/192).toFixed(0), SIM.fmtDur(192/FS), 'Z preamble, 24 channel-status bytes'],
      ['AES3 bit cells', (128*FS).toLocaleString(), SIM.fmtDur(1/(128*FS)), '6.144 Mbaud biphase per output'],
      ['AC-3 bursts', (FS/1536).toFixed(2), SIM.fmtDur(1536/FS), 'Pa/Pb/Pc/Pd every 1536 samples'],
      ['MCU main-loop passes', '≈ '+Math.round(1/LT)+' '+inf, SIM.fmtDur(LT), '192 bits bit-banged per pass (48 out, 144 in)'],
      ['timer0 overflows', (1/T0).toFixed(1), SIM.fmtDur(T0), 'ISR only reloads TCNT0 — no work is done'],
      ['Group-LED flash cycles', (1/((CHIRP_ON+CHIRP_OFF+2)*LT)).toFixed(2), SIM.fmtDur((CHIRP_ON+CHIRP_OFF+2)*LT), `NO_LOCK_CHIRP ${CHIRP_ON} on / ${CHIRP_OFF} off`],
      ['E/DD alternations', (1/((META_CHIRP+1)*LT)).toFixed(2), SIM.fmtDur((META_CHIRP+1)*LT), 'METADATA_CHIRP, only when both kinds are present'],
      ['UART bytes (CONTROL port)', '≤ 960', SIM.fmtDur(10/9600), '9600 baud: 0x88 → 0xE0 “demux present”; other bytes → 0x70 SD / 0x30 HD'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Use <b>Step</b> on the transport to move one frame, one line, one loop pass or one AES frame at a time.</p>`;
    const st=stepAt(t), R=route(t), F=aesBits(t,D.scope), line=Math.floor((t%frameT(f))/lineT(f))+1;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SDI</th><td class="mono">${CD(t)? `frame ${Math.floor(t/frameT(f))} · line ${line} of ${f.lines} · word ${Math.floor(((t%lineT(f))/lineT(f))*f.spl)} of ${f.spl}` : 'no carrier (CD = 0)'}</td></tr>
      <tr><th>FPGA</th><td class="small">${R.os===0?'2-group demux':'routing decoder outputs ('+OS_TXT[R.os]+')'}; RESET_VECTOR bit 4 = ${R.rv[0].low?0:1}, RESET_VECTOR1 bit 4 = ${R.rv[1].low?0:1}</td></tr>
      <tr><th>ATmega128</th><td class="mono">pass #${passOf(t)}: ${STEPS[st][0]}<br><span class="muted">${STEPS[st][2]}</span></td></tr>
      <tr><th>Decoder</th><td class="small">${world(t).cat? (R.decOK? `decoding ${TYPE[R.decIn.ty]} from AES${R.cat+1}` : 'idle / reset') : 'not fitted'}</td></tr>
      <tr><th>AES${D.scope+1} frame</th><td class="mono">${F.fr}/191 · A 0x${hx(F.sub[0].raw,6)} · B 0x${hx(F.sub[1].raw,6)}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    const levels=[['1 second',1],['1 video frame',frameT(f)],['1 AES block',192/FS],['1 loop pass',LT],['8 AES frames',8/FS]];
    const H=levels.length*44+10, {c,w:W}=SIM.canvas(m.querySelector('#zl'),H), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
    levels.forEach(([nm,span],i)=>{ const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2)); c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('AES'+(D.scope+1)+' BNC, A channel',6,y+28);
      const x0=170, pw=W-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30); c.strokeStyle=acc; c.beginPath(); const N=Math.min(700,pw);
      for (let k=0;k<=N;k++){ const tt=t0+span*k/N, v=outSample(route(tt).bnc[D.scope],0,tt), yy=y+17-v*24; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy); } c.stroke();
      const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke(); });
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  inp:{x:16,y:24,w:150,h:78,t:'INPUT → GS1524',s:['cable equaliser','75 Ω BNC'],d:'U1 GS1524 adaptive cable equaliser behind the INPUT BNC (INPUT1).'},
  des:{x:200,y:24,w:170,h:92,t:'GS1560A deserialiser',s:['SD/HD, Yin/Cin[9:0], pclk','LOCK_60 · SMPTE · ~RC_BYP','SD/~HD → MCU PD7'],d:'U2 GS1560A (LQFP80) with GO1525 VCO (U5). Parallel 10-bit Y/C to the FPGA; lock and format pins go to the ATmega128 (READ_GS1560_STATUS). Its GSPI host port (SDCLK_60, SDIN_60, SDOUT_60, CS_60) is wired to PD3–PD6 but the firmware never uses it.'},
  rck:{x:200,y:140,w:170,h:58,t:'GS1528 → SDI 1, SDI 2',s:['reclocked outputs'],d:'U6 GS1528 cable driver: the two reclocked SDI outputs on the rear (OUTPUT1, OUTPUT2).'},
  fpga:{x:410,y:24,w:220,h:200,t:'Cyclone EP1C12Q240',s:['SD403 demux · HD group detect','HD_group_sel (DIDs)','non_audio_detector (SMPTE 337)','CAT552_switch · OUTPUT_SELECT','switch_110 · AES_enable','i2sx4_aes ×4 (+110 Ω copies)','shift_in / shifter_out_48bit'],d:'U3, configured from U7 M25P40 (EPCS4 role). Firmware: Quartus project “pod31” (v100 → v101 → v102 → v400). De-embeds the two DIP-selected groups, flags compressed pairs, routes the pair named by CAT1:CAT0 to the decoder card, picks outputs by OS1:OS0, and drives AES1–4 (pins 119–122) and aes110-1…4 (161–164).'},
  clk:{x:190,y:225,w:190,h:62,t:'ICS662 + PLL1705 (issue 4)',s:['REF_IN, SEL0–3, HDCLK','AUDIO_CLOCK → FPGA 193'],d:'U9 ICS662-03 makes the audio reference from the video clock; U4 PLL1705 makes AUDIO_CLOCK. New in issue 4 / FPGA v400 (the test report: “Clock generation is done by ICS662 and PLL1705”). X2/X3 CSX750V oscillators.'},
  mcu:{x:680,y:24,w:190,h:150,t:'ATmega128 @ 4.9152 MHz',s:['bit-bangs 48 b out / 144 b in','reads DIP via ALTERA13','13 status LEDs','UART0 9600 (CONTROL)','SPI slave: metadata'],d:'U11. ImageCraft ICCAVR 7.15 (pod31_main.c + dolby.c). One while(1) loop with WDR, no work in interrupts except UART0 RX and SPI. Talks to the FPGA on PC0/PC1/PC5/PC6/PC7 + PB3/PB4, holds it in reset with PG2.'},
  cat:{x:680,y:200,w:190,h:112,t:'CAT No. 552 decoder (P5)',s:['Dolby E / AC-3 → 8 ch + Lt/Rt','DADA–DADD, DADM in','RESET_552, MAP, DLM, PRG out','META → ADM3485'],d:'Optional plug-in decoder on the 72-pin P5 header. The FPGA sends it the chosen pair (EAD/EAFS/EABC) and gets back four decoded pairs plus a downmix. Decoder metadata comes back on the SPI (frame sync 0x02 0xCF, 136 bytes) and leaves on P4 through U25 ADM3485.'},
  out:{x:410,y:300,w:220,h:84,t:'Outputs',s:['AES1–4 BNC (EL5263 drivers, inferred)','POD31-2: T1–T4 PE-65612 → Phoenix','SW1 8-way DIP → P3/P1'],d:'BNC drivers on POD31-1; the 110 Ω side runs through P6 to the small POD31-2 board, which carries the PE-65612 transformers, the Phoenix blocks TB1–TB4 and the DIP switch SW1.'},
  fp:{x:900,y:24,w:150,h:110,t:'Front panel',s:['PWR · SD · HD · ERR','GROUPS 1–4','DOLBY 1–4 · E · DD'],d:'14 LEDs (BOM: 4 green, 1 red, 9 yellow). All but PWR are driven by REFRESH_LEDS / PROCESS_SDI_LOCK_STATUS on PORTA, PORTE and PORTG.'},
  ctl:{x:900,y:170,w:150,h:90,t:'CONTROL (DB9)',s:['RS-485 (ADM3485 ×2)','+ metadata (U25)'],d:'P2 carries the UART0 RS-485 pair (U8 receive, U10 transmit). The firmware answers 0x88 with 0xE0 (“demux is present”) and every other byte with 0x70 (SD) or 0x30 (HD). Which DB9 pins carry what is not in the archive ('+'inferred'+').'},
};
const WIRES=[['inp','des','SDI'],['des','rck','reclock'],['des','fpga','Y/C[9:0] pclk'],['des','mcu','lock pins'],['clk','fpga','AUDIO_CLOCK'],['fpga','mcu','ALTERA0–15'],['mcu','fpga',''],['fpga','cat','EAD'],['cat','fpga','DAD*'],['fpga','out','AES ×8'],['mcu','fp','LEDs'],['mcu','ctl','UART0'],['cat','mcu','SPI meta']];
function viewBlock(m){
  window.__pod31Active=false; let sel='fpga';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div><p class="small muted">Drawn from pod31iss4.net / POD31-1iss4.bom, POD31-2iss2.net and the FPGA sources. The CorelDRAW “POD31 - Functional Diagram.cdr” was not converted for this view.</p>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>The GS1560A turns the SDI into parallel video. The <b>FPGA</b> pulls the two selected audio groups out of the horizontal blanking, checks each pair for Dolby sync words, and sends four AES streams to the rear. The <b>ATmega128</b> never touches audio: once a millisecond or so it shifts the DIP settings and error flags out of the FPGA, decides what to reset or mute, shifts its decision back in, and updates the LEDs. With the decoder card fitted, one compressed pair goes to the card and its decoded channels come back to the outputs.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1070 400" style="width:100%"><defs><marker id="p31ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y, sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9, k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p31ar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from netlist / qsf) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS=[
  {name:'1 · ATmega128 (U11)', note:'Pin numbers and net names from pod31iss4.net (TQFP64); port bits from the macros in pod31_main.c. LED refdes in brackets with their BOM colour.', svg:()=>chip(330,50,200,'U11 ATmega128(L)',[
      ['2 PE0','CPU_RX ← U8'],['3 PE1','CPU_TX → U8/U10'],['4 PE2','LED14 DD (Y)'],['5 PE3','N_CONFIG'],['6 PE4','CD/MUTE1'],['7 PE5','LED13 E (G)'],['8 PE6','LED12 DOLBY 4 (Y)'],['9 PE7','~RC_BYP'],
      ['10–17 PB0–7','ALTERA8–15'],['18 PG3','SMPTE'],['27 PD2','LOCK_60'],['28–31 PD3–6','SDCLK/SDIN/SDOUT/CS_60'],['32 PD7','SD/~HD'],['24/23','XTAL 4.9152 MHz (X1)']],
    [['33 PG0','LED10 GROUP 3 (Y)'],['34 PG1','LED2 GROUP 4 (Y)'],['35–42 PC0–7','ALTERA0–7'],['43 PG2','ALTERA_RESET'],['44 PA7','LED6 SD (G)'],['45 PA6','LED5 HD (G)'],['46 PA5','LED7 ERR (R)'],['47 PA4','LED8 GROUP 1 (Y)'],['48 PA3','LED9 GROUP 2 (Y)'],['49 PA2','LED3 DOLBY 1 (Y)'],['50 PA1','LED4 DOLBY 2 (Y)'],['51 PA0','LED11 DOLBY 3 (Y)'],['58 PF3','U10 DE (TX enable)'],['59 PF2','U8 ~RE (RX enable)']],'ICCAVR 7.15 · JTAG1 header · 3V rail')},
  {name:'2 · FPGA pins (v400 .qsf)', note:'Location assignments from altera/v400/pod31.qsf (EP1C12Q240C8). The v102 .qsf has PRG2 on pin 202 and no PDN/ACS/ICS662 pins; the issue-4 netlist matches v400.', svg:()=>chip(330,40,200,'U3 EP1C12Q240C8',[
      ['41–53','Yin[9:0]'],['54–63','Cin[9:0]'],['28','pclk'],['1–8','ALTER0/ALTERA1/ALTER2–7'],['233–240','altera8…ALTER15'],['181–188','dip1–dip8'],['134','ref662 (REF_IN)'],['135–139','sel0–3_662, clock662_27'],['193','pll1700_aclk (AUDIO_CLOCK)'],['159/160/169/166','pll1700_27out, vco_1, up1, down1'],['11','DOLBY_ERR'],['12–14','META_BC / FS / SUB']],
    [['119–122','AES1–AES4 (75 Ω)'],['162,163,164,161','aes110-1…4'],['194','RESET_552'],['195/196','MAP0/MAP1'],['197/200/201','PRG0/1/2'],['202/203','PDN / ACS'],['206–208','DLM0–2'],['213–215','PLE / PLS / PGP'],['216/217/224/225','DADA/DADB/DADC/DADD'],['223','DADM (downmix)'],['226/227','DAFS / DABC'],['218/219/222','EAD / EAFS / EABC'],['85–87, 98–101','TP1–TP7 → H1']],'Quartus II 9.1 SP2 · EPCS4 (U7 M25P40)')},
  {name:'3 · SDI front end', note:'Parts from POD31-1iss4.bom / pod31iss4.net. Equaliser and driver pin names are not traced here.', svg:()=>chip(70,70,150,'U1 GS1524',[['SDI','INPUT1 BNC']],[['SDO','→ U2']],'cable equaliser')+chip(340,70,180,'U2 GS1560A',[['SDI','← U1'],['VCO','U5 GO1525']],[['DOUT[19:0]','Yin/Cin → U3'],['PCLK','pclk → U3 28'],['LOCK','LOCK_60 → PD2'],['SMPTE','→ PG3'],['RC_BYP','~RC_BYP → PE7'],['SD/HD','SD/~HD → PD7'],['GSPI','SDCLK/SDIN/SDOUT/CS_60']],'deserialiser')+chip(100,270,140,'U6 GS1528',[['SDI','from U2']],[['SDO','OUTPUT1 BNC'],['SDO','OUTPUT2 BNC']],'cable driver')+chip(390,300,150,'U9 ICS662-03',[['1 REF_IN','← FPGA 134'],['4/6/7/8','SEL ← FPGA']],[['5','HDCLK → FPGA 138']],'issue 4 only')+chip(650,380,90,'U4 PLL1705',[['10','← FPGA 159']],[['2','AUDIO_CLOCK']],'→ FPGA 193')},
  {name:'4 · CAT No. 552 header (P5)', note:'P5 pins from pod31iss4.net. The decoder card itself is not in the archive.', svg:()=>chip(330,30,200,'P5 CAT_NO_552_RA',[['3','RESET_552'],['7/8','MAP0/MAP1'],['11/12/13','PRG0/1/2'],['17/18','PDN / ACS'],['31–33','DLM0–2'],['34–36','PLE/PLS/PGP'],['49/50/51','EAD/EAFS/EABC'],['57–59','PB2/PB0/PB1 → FPGA 14/13/12']],[['45/46','DADA/DADB'],['53/54','DADC/DADD'],['52','DADM'],['55/56','DAFS/DABC'],['60','META → U25 ADM3485 → P4'],['70','ERR → FPGA 11 (DOLBY_ERR)'],['2,5,6…','+5V'],['1,4,9…','GNDD']],'72-pin decoder socket')},
  {name:'5 · Outputs and DIP (POD31-2)', note:'POD31-2iss2.net: SW1 DIPSW8RA, T1–T4 PE-65612, TB1–TB4 PHEN3PTOP, U1 (value blank; DS34LV87T per the README). The BNC driver chain is inferred from the BOM (EL5263IS ×2).', svg:()=>{ let s=''; for (let k=0;k<4;k++){ const y=50+k*80; s+=`<text x="30" y="${y+5}" font-size="11" fill="var(--accent2)">FPGA AES${k+1} (pin ${119+k})</text><line x1="190" y1="${y}" x2="280" y2="${y}" stroke="var(--ink)"/><polygon points="280,${y-12} 280,${y+12} 304,${y}" fill="none" stroke="var(--ink)"/><text x="270" y="${y-16}" font-size="9.5" fill="var(--ink2)">EL5263 (inferred)</text><line x1="304" y1="${y}" x2="400" y2="${y}" stroke="var(--ink)"/><circle cx="412" cy="${y}" r="10" fill="none" stroke="var(--ink)"/><text x="430" y="${y+4}" font-size="11" fill="var(--ink)">BNC AES ${k+1}</text>
      <text x="30" y="${y+35}" font-size="11" fill="var(--accent2)">aes110-${k+1} (pin ${[162,163,164,161][k]}) → P6</text><line x1="210" y1="${y+30}" x2="280" y2="${y+30}" stroke="var(--ink)"/><polygon points="280,${y+18} 280,${y+42} 304,${y+30}" fill="none" stroke="var(--ink)"/><text x="262" y="${y+54}" font-size="9.5" fill="var(--ink2)">POD31-2 U1</text><path d="M304 ${y+30} h26 m0 -10 q8 5 0 10 q8 5 0 10 m14 -20 q-8 5 0 10 q-8 5 0 10" fill="none" stroke="var(--ink)"/><text x="330" y="${y+54}" font-size="9.5" fill="var(--ink2)">T${k+1} PE-65612</text><line x1="358" y1="${y+30}" x2="400" y2="${y+30}" stroke="var(--ink)"/><text x="430" y="${y+34}" font-size="11" fill="var(--ink)">TB${k+1} Phoenix (+ − G)</text>`; }
      s+=chip(640,360,90,'SW1 DIPSW8RA',[['1–8','SW1…SW8']],[['P1→P3','FPGA 181–188']],'POD31-2'); return s; }},
];
function viewSchem(m){
  window.__pod31Active=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from pod31iss4.net, POD31-2iss2.net and pod31.qsf (not the original P-CAD sheets)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">The original P-CAD files are <span class="mono">POD31 - #Engineering/PCB/pod31iss4.sch</span> and <span class="mono">POD31-2iss2.sch</span>. Blue labels are net names; pin numbers are as in the netlist.</p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 470" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">POD31 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__pod31Active=true;
  m.innerHTML=`<div class="grid2">${card('ATmega128 main loop — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('OUTPUT_SELECT.vhd — live truth table', `<div id="os"></div>`)}${card('LED logic (REFRESH_LEDS)', `<div id="ledl"></div>`)}</div></div>
    <div class="grid2">${card('MCU ⇄ FPGA link, one pass (ALTERA_write / ALTERA_read)', `<div id="bus"></div>`)}${card('How the switches did things — switch → code → signal', `<div id="btn"></div>`)}</div>
    ${card('FPGA audio path (pod31.bdf blocks)', `<div id="pipe"></div>`)}`;
  const draw=()=>{ const t=SIM.t, st=stepAt(t), w=world(t), d=dipDecode(w), R=route(t), af=audioFormat(t);
    let s=`<svg viewBox="0 0 560 ${STEPS.length*44+80}" style="width:100%"><defs><marker id="p31a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs><rect x="140" y="6" width="280" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="280" y="24" text-anchor="middle" font-size="11.5" fill="var(--ink)">init_devices · ALTERA_RESET(1000) · DOLBY_INITIALIZATION</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, on=st===j; s+=`<line x1="280" y1="${y-12}" x2="280" y2="${y}" stroke="var(--ink2)" marker-end="url(#p31a2)"/><rect x="20" y="${y}" width="500" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="28" y="${y+14}" font-size="10.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0].length>74?p[0].slice(0,72)+'…':p[0]}</text><text x="28" y="${y+27}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
    const yb=44+STEPS.length*44; s+=`<path d="M520 ${yb-28} h22 V40 h-22" fill="none" stroke="var(--ink2)" marker-end="url(#p31a2)"/><text x="20" y="${yb+18}" font-size="10.5" fill="var(--ink2)">WDR() three times per pass; WDTCR = 0x09 (≈28 ms). Pass #${passOf(t)}, ${(LT*1e3).toFixed(2)} ms each (${inf.replace(/<[^>]+>/g,'')}).</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const rows=[['00','2 Group Demux','AES1 = G1 pair 1','AES2 = G1 pair 2','AES3 = G2 pair 1','AES4 = G2 pair 2','de-embedder'],['01','Dolby 6 + 2','DADA L/R','DADB C/LFE','DADC Ls/Rs','PCM partner of CAT pair','SCLK3 (decoder)'],['10','Dolby 8 + 0','DADA','DADB','DADC','DADD (ch 7/8)',D.fpga==='v102'?'<b style="color:var(--bad)">SCLK1/2 — wrong</b>':'SCLK1 OR SCLK3'],['11','Dolby 6 + Lt/Rt','DADA','DADB','DADC','DADM Lt/Rt','SCLK3 (decoder)']];
    m.querySelector('#os').innerHTML=`<table class="kv small"><tr><th>sel1:0</th><th>name</th><th>OUT1_1</th><th>OUT1_2</th><th>OUT2_1</th><th>OUT2_2</th><th>I²S clocks (${D.fpga})</th></tr>${rows.map((r,i)=>`<tr class="${i===R.os?'hl':''}">${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>
      <p class="small">Now: OS = ${bn(R.os,2)}, CAT = ${bn(R.cat,2)} → the decoder hears AES position ${R.cat+1} (${R.decIn.lbl}). For “6 + 2” the PCM partner is ${['G1 pair 2','G1 pair 1','G2 pair 2','G2 pair 1'][R.cat]} (cat 00 → AUD1_2, 01 → AUD1_1, 10 → AUD2_2, 11 → AUD2_1).</p>
      <p class="small muted">Phoenix side: <span class="mono">switch_110</span> with sel = dolby_off_110 (${d.dolby_off_110?1:0}) picks ${d.dolby_off_110?'the raw de-embedded pairs':'the same four streams as the BNCs'}.</p>`;
    const L=ledsAt(t);
    m.querySelector('#ledl').innerHTML=`<table class="kv small"><tr><th>SD / HD / ERR</th><td>CD = 1 → SD_LED_ON always, HD if SD/~HD = 0; CD = 0 → ERR only. Now ${L.sd?'SD ':''}${L.hd?'HD ':''}${L.err?'ERR':''}</td></tr>
      <tr><th>AUDIO GROUPS</th><td>For group_sel1 then group_sel2: solid if AUDIO1|AUDIO2 (or 3|4); else follow <span class="mono">audio_leds_on</span> (NO_LOCK_CHIRP, ${CHIRP_ON} on / ${CHIRP_OFF} off). Now chirp ${chirpOn(t)?'ON':'OFF'}.</td></tr>
      <tr><th>DOLBY 1–4</th><td>aesN_led ≠ PCM → on. Now ${af.leds.map(x=>x==='P'?'·':x).join(' ')}</td></tr>
      <tr><th>E / DD</th><td>${af.E&&af.DD?`Both present → METADATA_CHIRP alternates every ${META_CHIRP+1} passes; showing ${metaAlt(t)==='E'?'E':'DD'} now`:'E if any DOLBY_E, DD if any DOLBY_AC3'}</td></tr></table>`;
    const U=R.U, ai=R.ai, rv0=(R.rv[0].low?0:0x10)|0x0F, rv1=(R.rv[1].low?0:0x10)|0x0F, rd=(rv1<<5)|rv0, gd=d.audio1|(d.audio2<<3)|((d.dolby_off_110?1:0)<<6);
    const bits=(v,names)=>`<span class="mono">${names.map((n,i)=>`<span title="${n}" class="${(v>>(7-i))&1?'hl':''}">${n}=${(v>>(7-i))&1}</span>`).join(' ')}</span>`;
    m.querySelector('#bus').innerHTML=`<table class="kv small"><tr><th colspan="2">Out: 6 bytes MSB first on PC0, clock PC5, then STROBE_WRITE (PC7)</th></tr>
      <tr><th>dolby_upper 0x${hx(U.du)}</th><td>${bits(U.du,['RESET_552','OS1','OS0','CAT1','CAT0','MAP1','MAP0','PRG2'])}</td></tr>
      <tr><th>dolby_lower 0xFF</th><td class="small">never written after DOLBY_INITIALIZATION</td></tr>
      <tr><th>reset_data 0x${hx(rd,4)}</th><td class="small">RESET_VECTOR1 &lt;&lt; 5 | RESET_VECTOR — bit 4 of each = audio path out of reset</td></tr>
      <tr><th>AUDIO_INFORMATION 0x${hx(ai)}</th><td>${bits(ai,['BNC2','BNC1','BNC4','BNC3','PHX2','PHX1','PHX4','PHX3'])}</td></tr>
      <tr><th>group_data 0x${hx(gd)}</th><td class="small">audio1 = ${d.audio1} | audio2 = ${d.audio2} &lt;&lt; 3 | dolby_off_110 &lt;&lt; 6</td></tr>
      <tr><th colspan="2">In: three strobes on PC6, 6 bytes each on PC1, PB3, PB4</th></tr>
      <tr><th>ALTERA1–6</th><td class="small">group 1: bit 7 = audio detect, bits 6–0 = sample count; ALTERA6 high nibble = 0xA0 alignment</td></tr>
      <tr><th>ALTERA7–12</th><td class="small">group 2, same layout (ALTERA12 alignment check is commented out)</td></tr>
      <tr><th>ALTERA13 0x${hx(d.a13)}</th><td class="small">DIP switches (inverted)</td></tr>
      <tr><th>ALTERA14–17</th><td class="small">bit 5/7 compressed + bits 4–0 data type per AES position; ALTERA14 bits 7/6 HD group lock; ALTERA15 bit 6 CATMAP ERR, bit 5 silence; ALTERA16 bit 6 DOLBY_INSTALLED</td></tr></table>
      ${D.literal||!stickyCat(t).seen?`<p class="small">Note: <span class="mono">cat_input1</span> starts at 0. The listing compiles <span class="mono">(cat_input1 − 0x31) &lt;&lt; 3</span> as <span class="mono">subi R24,49 · lsl ×3</span>, giving 0x78, which sets OS1, OS0, CAT1 and CAT0 until the first compressed pair is seen. Bit 7 (RESET_552) is set by DOLBY_INITIALIZATION and never cleared, so <span class="mono">| (reset_552 &lt;&lt; 7)</span> can never pull it low.</p>`:''}`;
    m.querySelector('#btn').innerHTML=`<table class="kv small"><tr><th>Operator does</th><th>Firmware path</th><th>Effect on the wire</th></tr>
      <tr><td>SW1–SW4 (groups)</td><td class="mono">PROCESS_DIP_SWITCHES → audio1/audio2 → group_data</td><td>HD_group_sel picks DIDs; PROCESS_GROUP_COMPARE resets the path only if the MSB changes</td></tr>
      <tr><td>SW7/SW8 (mode)</td><td class="mono">pod31_mode → dolby_upper bits 6–5</td><td>OUTPUT_SELECT sel1:sel0; Dolby status checks start when &gt; 0</td></tr>
      <tr><td>SW5</td><td class="mono">auto_swap → cat_input2 if compressed_set2</td><td>CAT1:CAT0 → CAT552_switch → EAD</td></tr>
      <tr><td>SW6</td><td class="mono">dolby_off_110 → group_data bit 6</td><td>switch_110: Phoenix = raw pairs; AUDIO_INFORMATION Phoenix bits follow AUDIO1–4</td></tr>
      <tr><td>Plug / pull SDI</td><td class="mono">READ_GS1560_STATUS → PROCESS_SDI_LOCK_STATUS → CD</td><td>SD/HD/ERR LEDs; both reset vectors low, +${RVC} passes after re-lock</td></tr>
      <tr><td>SD ↔ HD</td><td class="mono">PROCESS_HD_SD_CONTROL, PROCESS_HD_SD_COMPARE</td><td>PB7 demux select, PG4 10/20-bit; ERROR6 resets both groups</td></tr>
      <tr><td>Remote byte on CONTROL</td><td class="mono">uart0_rx_isr → process_uart</td><td>Replies 0x70/0x30; a group command writes group_sel1, which the next PROCESS_DIP_SWITCHES overwrites</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    const blk=[['GS1560A','Y/Cin, pclk'],[w.fmt.startsWith('sd')?'SDdemux (SD403)':'HD_group_sel (HD)','2 groups → 4 I²S pairs'],['non_audio_detector','Pa/Pb → Pc → ALTERA14–17'],['CAT552_switch','pair CAT → EAD'],['OUTPUT_SELECT','OS → OUT1_x/2_x'],['AES_enable','AUDIO_INFORMATION'],['i2sx4_aes','4 × AES3 + 110 Ω copies']];
    m.querySelector('#pipe').innerHTML=`<svg viewBox="0 0 980 90" style="width:100%">${blk.map((b,i)=>`<rect x="${6+i*139}" y="14" width="128" height="50" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="${70+i*139}" y="34" text-anchor="middle" font-size="10.5" fill="var(--ink)">${b[0]}</text><text x="${70+i*139}" y="52" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${b[1]}</text>${i<blk.length-1?`<line x1="${134+i*139}" y1="39" x2="${145+i*139}" y2="39" stroke="var(--ink2)"/>`:''}`).join('')}<text x="6" y="84" font-size="10.5" fill="var(--ink2)">Detector hold after the last sync: ${(HOLD[D.fpga]*1e3).toFixed(0)} ms (${D.fpga}). The SD demux comes from the SerialBoxx SD403 project; the Dolby-card blocks were brought over from the M6206A (readme.doc, 2008).</text></svg>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod31Active=false;
  const F=[
    ['RESET_552 can never be asserted', '<span class="mono">DOLBY_INITIALIZATION()</span> sets <span class="mono">dolby_upper = 0xFF</span> and clears only bits 6–3. <span class="mono">ALTERA_write()</span> then does <span class="mono">dolby_upper &amp;= ~(BIT6|BIT5|BIT4|BIT3)</span> and <span class="mono">|= reset_552 &lt;&lt; 7</span>. Bit 7 is never cleared, so writing <span class="mono">reset_552 = 0</span> (in TRANSLATE_RESET_VECTOR, RESET_DOLBY and main) has no effect: P5-3 stays high. The opposite bug sits on top of it: nothing in working/ ever sets <span class="mono">reset_552</span> back to 1.'],
    ['Start-up value of cat_input1 sets every OS/CAT bit', '<span class="mono">cat_input1</span> is a zeroed global until <span class="mono">PROCESS_AUDIO_FORMAT()</span> first sees a compressed pair. The listing compiles <span class="mono">(cat_input1 − 0x31) &lt;&lt; 3</span> as <span class="mono">subi R24,49; lsl; lsl; lsl</span> = 0x78, which ORs OS1 = OS0 = 1 and CAT = 11 into <span class="mono">dolby_upper</span> whatever the mode switches say. If the FPGA takes OUTPUT_SELECT\'s sel bits from that byte (as the bit comments say), a PCM-only unit would route the decoder outputs. Shipped units passed PCM tests, so the shipped v101 HEX (not archived) probably differs '+inf+'. Tick “literal dolby_upper” on the Simulator tab to see it.'],
    ['Mode 3 clocks the decoder data with the wrong clock (v102), and v400 ORs two clocks', 'In working/ and v102 <span class="mono">OUTPUT_SELECT.vhd</span> switches MCLK/LRCLK/SCLK to the decoder clocks only when <span class="mono">sel0</span> = 1. Mode 3 is sel = 10, so the decoder\'s data leaves on the de-embedder\'s clocks. The 2012|45 test report: “For some units dolby audio in mode 3 was corrupted (sine wave was reduced to square wave)”. v400 changed the terms to <span class="mono">(MCLK3 and (sel0 or sel1))</span> but kept <span class="mono">(MCLK1 and not sel0)</span>, so in Mode 3 the output clock is MCLK1 <b>OR</b> MCLK3. That only works if the two are in phase '+inf+'; it may explain the “Dolby audio sometimes jumps” units in the same report.'],
    ['Changing group 1↔2 or 3↔4 does not reset anything', '<span class="mono">PROCESS_GROUP_COMPARE1/2()</span> test <span class="mono">(group_sel &amp; (BIT2|BIT1)) &gt;&gt; 1</span>. But <span class="mono">group_sel1 = audio1 &gt;&gt; 1</span> is already 0–3, so the mask keeps only the MSB. A change between groups 1 and 2 (or 3 and 4) never sets ERROR5 / ERROR2_5, and the audio path is not reset. The mask was written for <span class="mono">audio1</span> (0, 2, 4, 6).'],
    ['Group 2 sample-count errors only check one pair', '<span class="mono">TRANSLATE_RESET_VECTOR1(ERROR2_3, ERROR2_3, ERROR2_3, ERROR2_3, ERROR2_5, ERROR2_6)</span> passes ERROR2_3 four times; ERROR2_4 (AES4 pair) is computed by <span class="mono">PROCESS_SAMPLE78_COMPARE</span> and then ignored.'],
    ['The FPGA alignment check does nothing', 'ALTERA6\'s 0xA0 header is checked and debounced (<span class="mono">ALIGNMENT_CHECK, TRANSLATE_ERROR2, PROCESS_ALIGNMENT_CHECK</span>), but every <span class="mono">CONFIGURE_ALTERA()</span> call inside is commented out, and the group-2 check (ALTERA12) is inside a commented block. A misaligned link is never repaired.'],
    ['“SD” is really LOCK', '<span class="mono">PROCESS_SDI_LOCK_STATUS()</span> runs <span class="mono">SD_LED_ON</span> whenever the input is valid, then adds HD_LED for HD. On HD both SD and HD light. The manual says the status LEDs show “LOCK”; the panel prints “SD”.'],
    ['Manual vs code: the group LED does not flash for Dolby', 'The manual: “If Dolby E or AC-3 (DD) is detected in a group the respective group LED will flash along with the type of Dolby signal.” <span class="mono">REFRESH_LEDS()</span> only flashes a group LED when the group has no audio; Dolby lights the DOLBY 1–4 position LED and E/DD solid, and alternates them only when both kinds are present (<span class="mono">METADATA_CHIRP</span>, 301 passes).'],
    ['Three names for two switches', 'Manual: SW5 = “Dolby Auto Detection”, SW6 = “Non Multi-Channel Balanced Output”. Code: ALTERA13 bit 3 = <span class="mono">auto_swap</span> (use the <i>second</i> compressed pair), bit 2 = <span class="mono">dolby_off_110</span>. The AUTO SWAP summary .doc calls them “SW3” and “SW4”: it counts bits from the LSB. The manual\'s “Mode 1 / Mode 0” switches give modes 1–4, the code calls them pod31_mode 0–3.'],
    ['Decoder missing in a Dolby mode = a reset every ≈2 s', 'With SW7/SW8 not both OFF and no CAT552, <span class="mono">DOLBY_DECODER_STATUS()</span> sees DOLBY_INSTALLED low every pass; after DOLBY_ERROR_COUNTER (2000) <span class="mono">RESET_DOLBY()</span> sets <span class="mono">reset_enable</span>, so group 1 is held in reset for 100 passes, then the count starts again. The timeline shows it.'],
    ['Remote control port is half-finished', '<span class="mono">uart0_rx_isr()</span> fills a 10-byte buffer but wraps at <span class="mono">&amp;uart0_rx[sizeof(uart0_rx)+1]</span>, so it writes one byte past the end. Every byte is answered with 0x70 (SD) or 0x30 (HD) — “respond all lock for now…”. A group command writes <span class="mono">group_sel1</span>, which <span class="mono">PROCESS_DIP_SWITCHES()</span> overwrites on the next pass.'],
    ['Metadata decoded, then dropped', '<span class="mono">SPI_translation()</span> and <span class="mono">Metadata_translation()</span> unpack about 40 Dolby fields every pass (dialnorm ×8, mix level, room type, Lt/Rt and Lo/Ro levels, Surround EX, DRC…) for <span class="mono">ProgramNumber = NO1</span> only, which never changes. Nothing reads the results; the metadata leaves the box on the CAT card\'s own META line (U25). <span class="mono">SPI_control()</span> is never called, so after the first frame SPI_translation disables the SPI and only re-enables it at its end.'],
    ['Wired but unused', 'The GS1560A GSPI host port (SDCLK_60, SDIN_60, SDOUT_60, CS_60 on PD3–PD6), N_CONFIG on PE3 and the timer0 interrupt (it only reloads TCNT0). <span class="mono">DATA_initialization()</span> and the <span class="mono">mode</span> variable are never used.'],
    ['Pinout “unchanged” between issues 3 and 4 — not for the FPGA', 'The test report says issue 4 has the same Atmel and FPGA pinouts. The issue-4 netlist (<span class="mono">pod31iss4.net</span>) puts PRG2 on FPGA pin 201 and PDN/ACS on 202/203, and adds ICS662 pins 134–139; the v102 .qsf has PRG2 on 202. Only v400\'s .qsf matches the issue-4 board.'],
    ['Archive mismatches and leftovers', 'The shipped Atmel v101 HEX and FPGA v102 programming file are not here, and per the report the v101 source did not rebuild to the same HEX. The POD31-1 iss4 BOM header still says “POD31iss3” and lists the FPGA as EP1C6-240. The v400 <span class="mono">.cdf</span> points at a v103 .pof and the timing file is <span class="mono">v105.sdc</span>. The .prj output directory is an AMS8E path. FPGA pin names mix <span class="mono">ALTER0</span>, <span class="mono">ALTERA1</span> and <span class="mono">altera8</span>.'],
    ['Two rear-panel drawings with the same issue number', '<span class="mono">#Mechanical #DA #2016</span> holds <span class="mono">POD31-REAR ISS 3 (PANEL).pdf</span> (Oct 2015|48) and <span class="mono">POD31-REAR ISS 3 (PANEL) .pdf</span> (with a space, Jun 2016|49, no sidecar). They differ in one note: insert FH-440-<b>6</b> vs FH-440-<b>5</b>. The newer one was saved with the same issue letter.'],
  ];
  m.innerHTML=card('What the POD31 is up to — findings from the source', `<ol>${F.map(f=>`<li><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`)
   + card('Assumptions in this simulation', `<ul class="small">
      <li>Main-loop pass ≈ ${(LT*1e3).toFixed(2)} ms (${inf}): ${LOOP_CYC} cycles estimated from <span class="mono">pod31_main.lis</span>; flash rates and reset lengths scale with it.</li>
      <li>GS1560A lock time ${T_LOCK*1e3} ms; SMPTE 337 burst lengths and phases; decoder outputs (5.1 + 2 for Dolby E, 3/2L for AC-3); and the CAT552 being silent with PCM on its input are all ${inf}.</li>
      <li>DIP order (SW1 → ALTERA13 bit 7 … SW8 → bit 0) is ${infT('the manual table order and the bit tests in PROCESS_DIP_SWITCHES')}.</li>
      <li>By default the routing follows the DIP mode as the manual describes. The literal <span class="mono">dolby_upper</span> option applies the archived working/ source byte for byte.</li>
      <li>The Atmel source modelled is <span class="mono">atmel/working/</span> (the closest to the unarchived v101). FPGA behaviour switches between v102 and v400 where the archived VHDL differs.</li>
      <li>Tone frequencies on PCM pairs and decoded channels are chosen for the display, not taken from the archive.</li></ul>`)
   + card('Sources', `<ul class="small mono">
      <li>#POD #SERIES/POD31 - #Master/POD31 - #Engineering/software/atmel/working/pod31_main.c, .lis, dolby.c, dolby.h · atmel/v100/pod31_main.c</li>
      <li>…/software/altera/working/ and v400/: OUTPUT_SELECT.vhd, non_audio_detector.vhd, CATMAPERR.vhd, switch_110.vhd, swap.vhd, pod31.qsf · software/readme.doc</li>
      <li>…/PCB/pod31iss4.net, POD31-1iss4.bom, POD31-2iss2.net · MANUAL/POD31 MANUAL.pdf, POD31MAN_ROUGH.doc · POD31 summary of AUTO SWAP and BALANCED OUTPUTS.doc</li>
      <li>POD31 - #TESTREPORT/POD31-V400-13AUG12.pdf · POD31 - #ARTWORK #DA #2016/POD31-FRONT&amp;REAR-SILK (CURVE).pdf → assets/pod31-*.png · POD31 - #Mechanical #DA #2016/POD31-FRONT/REAR ISS 3 (PANEL).pdf · POD31 Front/Rear Edit-1.jpg</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'pod31', name:`POD31 · SD/HD-SDI AES de-embedder with Dolby decoder option (${Y(2005)})`, duration:1,
  product:'POD31', year:2005, family:'POD series', folder:'#POD #SERIES/POD31 - #Master',
  summary:'Half-rack SD/HD-SDI de-embedder: a Cyclone FPGA pulls two DIP-selected audio groups to four AES outputs (BNC and Phoenix), spots Dolby E / AC-3, and can route one pair through a plug-in CAT No. 552 decoder. An ATmega128 bit-bangs the FPGA status every loop pass and runs the 13 status LEDs.',
  highlights:['Real silkscreen panels with a working DIP switch, INPUT and AES jacks','11-step tutorial built on the manual\'s modes and DIP tables','Live OUTPUT_SELECT, dolby_upper and reset-vector bytes','Mode-3 clock bug (v102) and v400\'s fix side by side','AES3 frames including SMPTE 337 Pa/Pb data words'],
  depth:'Full model',
  stepUnits:[
    {label:'1 video frame', period:()=>frameT(VF[world(SIM.t).fmt])},
    {label:'1 MCU loop pass', period:()=>LT},
    {label:'1 AES block (192 frames)', period:()=>192/FS},
    {label:'1 video line', period:()=>lineT(VF[world(SIM.t).fmt])},
    {label:'1 AES frame', period:()=>1/FS},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.1,'100 ms'],[1001/30000,'1 frame (33 ms)'],[0.004,'1 AES block (4 ms)'],[0.0012,'1 loop pass (≈1 ms)'],[0.0002,'200 µs (lines)'],[4/48000,'4 AES frames (83 µs)']],
  defaultZoom:0,
  init(){ WKEY=''; RCACHE=null; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD31', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
