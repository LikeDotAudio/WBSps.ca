/* =====================================================================
   M6205 — openGear SD/HD-SDI embedded audio processor (Ward-Beck Systems, 2007|40–2012|45)
   Modelled build: M6205A-C200 release 3.0.0.1 (CTV) = Atmel v201 + SHARC v104 + Altera v102, PCB issue 4
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/):
   - Software/m6205c200/atmel/v201/v100w.c   main(), REFRESH_LEDS, ALTERA_SORT (440-byte buffer parse),
       AUDIO_SYNC_CHECK, SD_CLOCK_PHASE_CHECK, PROCESS_AUDIO_INFORMATION, SHIFT_OUT_LEDS / SHIFT_OUT
     … M6205A.c   READ_GPI, DEBOUNCE_GPI1/2, READ/PROCESS_DIP_SWITCHES, SD_RESET, VOLUME_Table, ALTERA_ALIGNMENT_CHECK
     … altera.c/.h  ALTERA_read_write (CLI, FSYNCH on PF3, SCLK PB4, MOSI PB5, MISO PB6), ALTERA_BUFFER_METADATA 440
     … altera.lis   cycle count of ALTERA_read_write_data (≈20 cycles per bit at 8 MHz)
     … CAN-05.c   timer0_ovf_isr (1 ms), timer1_ovf_isr, STARTUP/REFRESH/HEARTBEAT_TIME, can_rx_isr, CANRX,
                  CANRX_buffer, CANinit (CANBT1..3 = 1 Mbit/s), CAN_FUNCTIONS
     … Dashboard2.c ParamOIDS_Message, Menu0/1/2/4OID_Message, MESSAGE_CREATOR_PARAMETER_71/72 (gain array),
                  the OID 7.1 / 7.3 SET handlers, PARAMETER_UPDATE, all DashBoard strings
     … Dashboard1.h, M6205.h, common.h, gennum.c/.h, sharc.c/.h
   - Software/m6205c200/sharc/v104/sample.c (SampleIRQ: the CTV routing and mix), backgnd.c (main, refresh_meta_data,
       meta_sort, refresh_data, dial_norm_extract, mix LUTs), RampAudio.c, volume_data.c, configdai.c, sample.h
   - Software/m6205c200/altera/v102/m6205c.qsf (EP2C35F484C6 pins), m6205c.bdf, cntrl_tdm_if.vhd (control TDM)
   - Software/m6205c200/M6205c200 switching rules.doc, M6205C200 SOFTWARE HISTORY.xls, README.md
   - CUSTOM/M6205C200/V3.0.0.0/M6205C200v3000 DipSwitchControl.doc; M6205c Dip Switch Settings.pdf; M6205-T6307.pdf
   - PCB/GERBERS/M6205A-ISS4.TOP/.TSM/.TSS (card artwork → assets/m6205-card-*.png, third-party logo blanked)
   - PCB/OBSOLETE/ISSUE4/M6205A-iss4.pnp, .net, .bom (part positions, AT90CAN128 and 74HC4094 nets)
   - MANUAL/M6205A-3G/M6205A-3G.pdf (installation, LEDs); M6205 - #TESTREPORT/M6205-C200-V3001-21MAR11.pdf
   - 3G v6xx builds: Software/M6205-NLC/ATMEL/v602/M6205/application/main.c, tasklist.c, apptask.c/.h, boardtype.h,
       M6205pack.txt, zeuslib/common/gearos.c (Ross OGP-SDK scheduler; described, not copied)
   - Variant table: Software/README.md and each variant README
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const Y = y => SIM.year(y);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const dB = a => a>1e-9 ? 20*Math.log10(a) : -Infinity;
const fdb = v => v===-Infinity||v<-99 ? '−∞' : (v>=0?'+':'−')+Math.abs(v).toFixed(1);
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function kv(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows){ return `<table class="kv"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }

/* ---------------- constants from the source ---------------- */
const F_CPU = 8e6;                         // v100w.c header "Crystal: 8.0000Mhz"; BOM X1 8MHz
const CYC_BIT = 20;                        // altera.lis: ALTERA_read_write_data loop ≈ 20 cycles per bit (branches averaged)
const CYC_BYTE = 8*CYC_BIT + 30;           // + call/ldi/add/std/wdr per byte (altera.lis) ≈ 190 cycles
const XBYTES = 440;                        // ALTERA_BUFFER_METADATA (altera.h); altera_buffer_constant
const XCHG_T = XBYTES*CYC_BYTE/F_CPU;      // ≈ 10.45 ms with CLI() — the whole exchange runs with interrupts off
const BIT_T = CYC_BIT/F_CPU, BYTE_T = CYC_BYTE/F_CPU;
const LOOP_T = 0.4e-3;                     // one main-loop pass without an exchange — INFERRED (size of ALTERA_SORT + REFRESH_LEDS)
const VS_COUNT = 1500;                     // "if (vertical_sync_counter >= 1500)" — exchange anyway without vertical
const WDT_T = 0.0163;                      // WDTCR = 0x08: WDE, 16K WDT-oscillator cycles ≈ 16 ms
const BOOT_T = 1.02;                       // wait(3000)+12×wait(63000) ≈ 759 000 loops × 8 cycles + ADC — INFERRED from the wait() loop
const ERR_LIMIT = 1000;                    // ERROR_COUNTER1 in M6205A.c
const T0_TICK = 1e-3;                      // timer0: clk/64, TCNT0 = 0x83 → 125 counts × 8 µs = 1 ms (comment says 100 µs)
const CAN_BIT = 1e-6;                      // CANBT1/2/3 = 00/04/12 → 8 TQ of 125 ns = 1 Mbit/s
const RAMP_TC = 0.00199999;                // RampAudio.c RAMP_TC_LEVEL1, applied once per sample by refresh_data()
const FS = 48000;
const VFMT = {
  '1080i59': {name:'HD 1080i/59.94', field:1001/60000, lines:1125, hd:true, words:2200, act:1920, code:'lock1080 · lock60_5994'},
  '1080i50': {name:'HD 1080i/50',    field:1/50,       lines:1125, hd:true, words:2640, act:1920, code:'lock1080 · frame_rate_50'},
  '720p59':  {name:'HD 720p/59.94',  field:1001/60000, lines:750,  hd:true, words:1650, act:1280, code:'lock720 · lock60_5994', prog:true},
  '525':     {name:'SD 525',         field:1001/60000, lines:525,  hd:false, words:1716, act:1440, code:'lock525'},
  '625':     {name:'SD 625',         field:1/50,       lines:625,  hd:false, words:1728, act:1440, code:'lock625'},
};
const lineT = f => f.prog ? f.field/f.lines : f.field/(f.lines/2);
const volume = i => i<=0 ? 0 : Math.min(Math.pow(10,(i-61)/20), Math.pow(10,15/20));   // volume_data.c: volume[61] = 1.0, 1 dB steps, clips at +15
const C_LUT = [0.707,0.595,0.500,0.0], S_LUT=[0.707,0.500,0.0,0.0];                 // backgnd.c ac3_Cmix_lut / ac3_Smix_lut
const EXT_LUT = [1.414,1.189,1.0,0.841,0.707,0.595,0.5,0.0];                        // backgnd.c ext_mix_lut
const EXT_DB = ['+3.0','+1.5','0.0','−1.5','−3.0','−4.5','−6.0','−∞'];
const ACMOD = {1:'1/0 (C)',2:'2/0 (L R)',7:'3/2 (L C R Ls Rs)'};

/* input layouts — "M6205c200 switching rules.doc": five expected input distributions (AES1–6) */
const SIG = {
  L:{f:1000,a:-20,t:'L'}, R:{f:500,a:-20,t:'R'}, C:{f:250,a:-20,t:'C'}, LFE:{f:60,a:-20,t:'LFE'},
  Ls:{f:2000,a:-26,t:'Ls'}, Rs:{f:3000,a:-26,t:'Rs'}, DV:{f:300,a:-18,t:'DV',burst:true}, StL:{f:700,a:-20,t:'St L'}, StR:{f:900,a:-20,t:'St R'},
  DE:{f:0,a:0,t:'Dolby E',de:true},
};
const LAYOUTS = [
  {name:'Input 1 — stereo only',            pairs:[['L','R'],null,null,null,null,null]},
  {name:'Input 2 — stereo + DV',             pairs:[['L','R'],null,null,['DV','DV'],null,null]},
  {name:'Input 3 — 5.1 + DV + St + Dolby E', pairs:[['L','R'],['C','LFE'],['Ls','Rs'],['DV','DV'],['StL','StR'],['DE','DE']]},
  {name:'Input 4 — 5.1 + DV + St',           pairs:[['L','R'],['C','LFE'],['Ls','Rs'],['DV','DV'],['StL','StR'],null]},
  {name:'Input 5 — stereo + Dolby E on AES2', pairs:[['L','R'],['DE','DE'],null,null,null,null]},
];
const OUT_TARGET = ['L/R','C/LFE','Ls/Rs','DV / PGM mono','St L/R → Lt/Rt (mixdown)','Dolby E'];

/* firmware variants in the folder (Software/README.md and variant READMEs) */
const VARIANTS = [
  {id:'c200', name:'M6205A-C200 3.0.0.1 (CTV) — modelled', folder:'m6205c200', era:'2008|41–2011|44', cust:'CTV', sched:'loop', fw:'Atmel v201 · SHARC v104 · Altera v102', fn:'DV / voice-over: AES4 = DV or programme mono (GPI1), Lt/Rt or Lo/Ro mixdown to AES5 from VANC metadata, Dolby E pass/mute (SW3), gain sliders', tests:'C200-V3000 (2010|43), C200-V3001 (2011|44)'},
  {id:'c100', name:'M6205C100 v2.0.0.0 (CTV)', folder:'m6205c100', era:'2008|41–2009|42', cust:'CTV', sched:'loop', fw:'Atmel v200 · SHARC v103 · Altera v101 (+FPGA boot loader)', fn:'Metadata-driven Lt/Rt or Lo/Ro downmix to AES1; GPI1 forces downmix, GPI2 forces mono', tests:'C100-V1002, V1003, V2000'},
  {id:'ce300', name:'M6205CE300 3.0.0.8 (Astral)', folder:'m6205c300', era:'2008|41–2011|44', cust:'Astral (also CTV, DaySequerra 4.0.0.0)', sched:'loop', fw:'Atmel v108 · SHARC v103 · Altera v107', fn:'Dolby E / AC-3 decoder daughter board; decoded 5.1 on channels 1–6, St L/R on 7/8; metadata delay on SW2', tests:'CE300-V3006, V3007, V3008'},
  {id:'ce400', name:'M6205CE400 v1.0.0.3', folder:'M6205CE-400', era:'2009|42–2010|43', cust:'—', sched:'loop', fw:'Atmel v103/v200 · Altera v102', fn:'Dolby decoder with DIP-selected input pair AES1–4, dialnorm', tests:'CE400-V1000…V1003'},
  {id:'c500', name:'M6205C500 v1.0.0.0', folder:'M6205C-500', era:'2009|42', cust:'—', sched:'loop', fw:'Atmel v100 · Altera v101', fn:'External AES In1/In2 (CS8416 + AD1895 SRC to 48 kHz) embedded into SDI', tests:'C500-V1000'},
  {id:'c600', name:'M6205C600 v1.0.1', folder:'M6205C600', era:'2009|42–2010|43', cust:'customer build', sched:'loop', fw:'Atmel v101 · Altera v101', fn:'Group enable only; v101 fixed audio checksum errors', tests:'C600-V1000, V101'},
  {id:'c700', name:'M6205C700 v1.0.0 (not released)', folder:'M6205C700', era:'2009|42', cust:'CTV', sched:'loop', fw:'Atmel v100 (not released)', fn:'AES1 right channel inserted into embedded position 4', tests:'none'},
  {id:'cee800', name:'M6205CEE-800 (product string "M6205C500")', folder:'M6205CEE-800', era:'2009|42', cust:'?', sched:'loop', fw:'Atmel v100 = C500 v100; FPGA from an "M6204AEE" project', fn:'Purpose unclear', tests:'none'},
  {id:'lev', name:'M6205A leveler (prototype)', folder:'leveler', era:'2007|40–2008|41', cust:'—', sched:'loop', fw:'Atmel leveler era + Ross Video library copy', fn:'Original SD/HD leveler / AGC / shuffler (cut sheet)', tests:'—'},
  {id:'3gdd', name:'M6205A-3G+DD v6.0.0.2', folder:'M6205-DOLBYDECODER', era:'2011|44', cust:'—', sched:'zeus', fw:'Atmel v602 · Altera v603 · boot v601', fn:'Issue-6 3G board, Dolby decoder daughter card in the 72-pin SIMM', tests:'3G-DD-V6002'},
  {id:'3gmm', name:'M6205A-3G+MM v6.0.0.1', folder:'M6205-DTSMULTIMERGE', era:'2011|44', cust:'DaySequerra', sched:'zeus', fw:'Atmel v60x', fn:'DTS MultiMerge daughter card over AudioXpress serial (dtsserial.c)', tests:'3G-MM-V6001'},
  {id:'3gum', name:'M6205A-3G+UM v6.0.0.1', folder:'M6205-DTSUPMIX', era:'2011|44–2012|45', cust:'DaySequerra', sched:'zeus', fw:'Atmel v60x', fn:'DTS UpMix daughter card', tests:'3G-UM-V1001, V6001'},
  {id:'3gnlc', name:'M6205A-3G+NLC v6.0.0.2', folder:'M6205-NLC', era:'2011|44–2012|45', cust:'DaySequerra', sched:'zeus', fw:'Atmel v602 · Altera v602 · boot v601', fn:'DTS Neural Loudness Control; optional NLC_LOG data logging', tests:'3G-NLC-V6001, V6002'},
  {id:'3g', name:'M6205A-3G (no card) v6.0.0.x', folder:'M6205-No Card', era:'2012|45', cust:'—', sched:'zeus', fw:'Atmel v60x', fn:'Base 3G card without a daughter card', tests:'—'},
];
const VAR = id => VARIANTS.find(v=>v.id===id) || VARIANTS[0];

/* ---------------- device state ---------------- */
function fresh(){ return {
  variant:'c200',
  seated:true, rear:true, slot:5,
  sdi:{on:true, fmt:'1080i59'},
  layout:3,                                  // Input 4 (5.1 + DV + St) by default
  meta:{on:false, acmod:7, dialnorm:24, ext:1, pref:1, clev:1, slev:1, ltc:4, lts:4, loc:4, los:4, line:9},
  gpi1:false, gpi2:false,
  dip:[false,true,false,false,false,false,false,false],   // SW1..SW8 ON? — C200 v3.0.0.0 default: 2 groups (SW1 OFF, SW2 ON)
  bootDip:null,                              // DIP as read by main() at power-up (SW7/SW8 are only read there)
  gain:[0,0,0],                              // DashBoard OID 7.1 array: [Program, DV, MixDown (AES5)] in dB
  ev:{},                                     // delayed-arrival events (key → {tA, tS, from, to})
  fault:null,                                // sim time the SHARC is held in reset (alignment failure)
  dash:{tab:'input', pgm:0},
  log:[], lastTrace:[],
}; }
const D = fresh(); D.bootDip = D.dip.slice();
function dashboardEnabled(){ return !D.bootDip[7]; }                  // main(): (dip & BIT7)==0 → dashboard_enabled, read once
function groupsEnabled(){ return (D.dip[1]?1:0) + (D.dip[0]?2:0); }   // PROCESS_DIP_SWITCHES: bit1 → +1, bit0 → +2 (0 = one group)
function fmt(){ return VFMT[D.sdi.fmt]; }
function locked(){ return D.seated && D.sdi.on; }
function layout(){ return LAYOUTS[D.layout]; }
function groupsPresent(){ const p=layout().pairs; let m=0; for (let g=0;g<4;g++) if (p[2*g]||p[2*g+1]) m|=1<<g; return m; }
function pairPassed(i){ return (i>>1) <= groupsEnabled(); }            // FPGA de-embeds only the enabled groups — INFERRED from Reg 2 bits 31..30
function dolbyEOn(i){ const p=layout().pairs[i]; return !!(p && p[0]==='DE'); }

/* ---------------- main-loop schedule (v100w.c main while(1)) ---------------- */
let SCHED=null, SKEY='';
function sched(){
  const key=[D.sdi.on,D.sdi.fmt,D.seated,D.fault,D.variant].join('|');
  if (key===SKEY && SCHED) return SCHED; SKEY=key;
  const f=fmt(), passes=[], xchg=[], lost=[]; let boot=null;
  const lock = locked(); const V0 = 0.0012;                 // first vertical edge in the window — arbitrary phase
  let t=0, nextV=V0, vcount=0, idx=0, errc = 0, spin=null;
  if (!D.seated){ SCHED={passes:[{i:-1,t0:0,t1:1.0001,kind:'off'}],xchg,lost,boot:null,spin:null}; return SCHED; }
  while (t < 1.0001){
    let x=false;
    if (lock){ if (t >= nextV){ x=true; while (nextV<=t) nextV+=f.field; vcount=0; } else vcount++; }
    else { if (vcount >= VS_COUNT){ x=true; vcount=0; } else vcount++; }
    const p={i:idx++, t0:t, x};
    if (x){
      const a=t+LOOP_T*0.30, b=a+XCHG_T; p.xa=a; p.xb=b;
      const bad = D.fault!==null && a>=D.fault;
      if (bad) errc = (errc||990) + 1;                       // fault injection starts error_checker at 990 so the second shows the reboot
      xchg.push({t0:a,t1:b,bad,errc});
      if (bad && errc > ERR_LIMIT){                          // ALTERA_ALIGNMENT_CHECK → error0 = 1 → while(error0) CLI();
        p.kind='spin'; p.t1=b+0.0002; passes.push(p);
        spin={t0:p.t1, t1:p.t1+WDT_T}; passes.push({i:-1,t0:spin.t0,t1:spin.t1,kind:'spin2'});
        boot={t0:spin.t1, t1:spin.t1+BOOT_T}; passes.push({i:-1,t0:boot.t0,t1:boot.t1,kind:'boot'});
        break;
      }
      p.t1 = t + LOOP_T + XCHG_T;
    } else p.t1 = t + LOOP_T;
    p.kind='loop'; passes.push(p); t=p.t1;
  }
  // timer0 ticks lost while interrupts are off (one pending overflow survives each CLI window)
  xchg.forEach(e=>{ const n=Math.floor(e.t1/T0_TICK)-Math.ceil(e.t0/T0_TICK)+1; if (n>1) lost.push({t0:e.t0,t1:e.t1,n:n-1}); });
  SCHED={passes,xchg,lost,boot,spin}; return SCHED;
}
function passAt(t){ const ps=sched().passes; let lo=0,hi=ps.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(ps[m].t0<=t) lo=m; else hi=m-1; } return ps[lo]; }
const STEPS = [
  ['WDR · READ_DIP_SWITCHES · PROCESS_DIP_SWITCHES', .14, 'PINA → dip_switches (inverted): groups, SW4 HD audio clock, SW5 PCM delay, SW6 dialnorm'],
  ['ALTERA_SORT', .30, 'Pack 12 control bytes (“SYNC”, Reg 2, Reg 3) into ALTERA_BUFFER_out and unpack last exchange: Reg 7–10 status, 8 metadata programs'],
  ['if PINC.0 (vertical) → ALTERA_read_write()', 0, 'CLI; FSYNCH pulse; 440 bytes bit-banged both ways (≈10.45 ms); SEI; ALTERA_ALIGNMENT_CHECK'],
  ['READ_GS1559_STATUS · PROCESS_SDI_LOCK_STATUS', .08, 'smpte = PINB.7 (GS1559 lock); sdi_format from Reg 7 sd/hd bits'],
  ['READ_GPI · DEBOUNCE_GPI1 · DEBOUNCE_GPI2', .08, 'gpi from Reg 8 bits 25/24 (echoed back by the SHARC)'],
  ['PROCESS_AUDIO_INFORMATION', .04, 'aes_lock1/2 from Astatus (never refreshed: EXTERNAL_AES_INPUTS is not defined)'],
  ['REFRESH_LEDS · SHIFT_OUT_LEDS', .22, 'LED byte “input” → 74HC4094 on PE5/PE6/PE7; SD on PD0, META DATA on PG3'],
  ['CAN_FUNCTIONS', .14, 'Re-enable after error passive; if MOB_error → CANinit(); if reboot_device → while(1) CLI()'],
];
function stepAt(t){
  const p=passAt(t); if (p.kind!=='loop' && p.kind!=='spin') return {pass:p, step:-1};
  if (p.x && t>=p.xa && t<p.xb) return {pass:p, step:2, xbyte:Math.floor((t-p.xa)/BYTE_T)};
  if (p.kind==='spin' && t>=p.xb) return {pass:p, step:2, spinning:true};
  let rel=(t-p.t0); if (p.x && t>=p.xb) rel-=XCHG_T; const f=rel/LOOP_T; let k=0, a=0;
  for (let j=0;j<STEPS.length;j++){ if (f>=a) k=j; a+=STEPS[j][1]; }
  if (k===2) k=3; return {pass:p, step:k};
}
function exchangeAfter(t){ return sched().xchg.find(e=>e.t0>=t); }
function inBoot(t){ const s=sched(); return (s.boot && t>=s.boot.t0) || (s.spin && t>=s.spin.t0 && t<s.spin.t1); }
function cliAt(t){ return sched().xchg.some(e=>t>=e.t0&&t<e.t1); }

/* ---------------- delayed arrival of control changes at the SHARC ----------------
   The SHARC's control SPORT is clocked by the Atmel's bit-bang (cntrl_tdm_if.vhd: sclkout <= sclkin),
   so every control change (gain, GPI, metadata flag) reaches sample.c only at the end of an exchange. */
function sharcTime(tA){
  let tRx=tA; const e0=sched().xchg.find(e=>tA>=e.t0&&tA<e.t1); if (e0) tRx=e0.t1;   // CAN ISR blocked by CLI
  const e=exchangeAfter(tRx+LOOP_T*0.5); return e? e.t1 : Infinity;
}
function setEv(key, to){ const tA=SIM.t; const from=valAt(key,tA); D.ev[key]={tA, tS:sharcTime(tA), from, to}; return D.ev[key]; }
function baseVal(key){ return key==='gpi1'?false: key==='meta'?false : key.startsWith('g')?0 : 0; }
function valAt(key,t){ const e=D.ev[key]; if (!e) return cur(key); return t>=e.tS? e.to : e.from; }
function cur(key){ if (key==='gpi1') return D.gpi1; if (key==='meta') return D.meta.on; if (key==='g0') return D.gain[0]; if (key==='g1') return D.gain[1]; if (key==='g2') return D.gain[2]; return 0; }
function gainAt(i,t){                                              // refresh_data → RampAudioCalc once per sample
  const e=D.ev['g'+i]; const lin=v=>volume(61+v);
  if (!e || t<e.tS) return lin(e? e.from : D.gain[i]);
  const n=(t-e.tS)*FS; const a=lin(e.from), b=lin(e.to); return b+(a-b)*Math.pow(1-RAMP_TC,n);
}

/* ---------------- the audio (sample.c SampleIRQ, C200 build) ---------------- */
function srcSample(ch, n){                       // ch 0..11 = AES1 L … AES6 R; n = sample index
  const pr=layout().pairs[ch>>1]; if (!pr || !locked() || !pairPassed(ch>>1)) return 0;
  const s=SIG[pr[ch&1]];
  if (s.de){ let h=(n*2654435761 + ch*97)>>>0; h^=h>>>13; h=Math.imul(h,0x5bd1e995)>>>0; return ((h&0xFFFFF)/0x7FFFF-1)*0.98; }  // non-PCM words
  let a=Math.pow(10,s.a/20); if (s.burst) a*= (Math.floor(n/9600)%3===2)?0:1;          // DV: voice-like bursts — illustrative
  return a*Math.sin(2*Math.PI*s.f*n/FS + ch*0.3);
}
function metaParams(){ const m=D.meta; return {ac_mode:m.acmod, ext_bsi:m.ext, preferred:m.pref,
  ac3C:C_LUT[m.clev], ac3S:S_LUT[m.slev], ltC:EXT_LUT[m.ltc], ltS:EXT_LUT[m.lts], loC:EXT_LUT[m.loc], loS:EXT_LUT[m.los],
  dn: m.dialnorm? volume(m.dialnorm+30) : 1.0}; }        // dial_norm_extract: dn_gain = volume[dn_value+30]
function sampleIRQ(n, t){
  const a=[]; for (let k=0;k<12;k++) a.push(srcSample(k,n));
  const out=new Array(12).fill(0);
  const s=sched(); if (!D.seated || inBoot(t) || (D.fault!==null && t>=D.fault)) return {out, a, mono:0, why:'SHARC in reset'};
  const pg=gainAt(0,t), dv=gainAt(1,t), md=gainAt(2,t);
  for (let i=0;i<6;i++) a[i]*=pg;                                        // program_gain on AES1–3 inputs
  out[0]=a[0]; out[1]=a[1]; let mono=(a[0]+a[1])/2;                     // AES1 always passed; DV mono from AES1
  const meta=valAt('meta',t), gpi=valAt('gpi1',t);
  let why;
  if (!meta){ out[8]=a[0]; out[9]=a[1]; out[2]=out[3]=out[4]=out[5]=0; why='no metadata: AES2/AES3 muted, AES5 = AES1'; }
  else {
    const M=metaParams(); let L,R;
    if (M.ext_bsi===0){ L=a[0]+M.ac3C*a[2]-M.ac3S*a[4]-M.ac3S*a[5]; R=a[1]+M.ac3C*a[2]+M.ac3S*a[4]+M.ac3S*a[5]; why='Lt/Rt from ac3 mix levels (extended bitstream off)'; }
    else if (M.preferred===2){ L=a[0]+M.loC*a[2]+M.loS*a[4]; R=a[1]+M.loC*a[2]+M.loS*a[5]; why='Lo/Ro (preferred downmix = 2)'; }
    else { L=a[0]+M.ltC*a[2]-M.ltS*a[4]-M.ltS*a[5]; R=a[1]+M.ltC*a[2]+M.ltS*a[4]+M.ltS*a[5]; why='Lt/Rt from extended-bitstream levels'; }
    if (M.ac_mode===1){ mono=a[2]*M.dn; out[8]=a[2]; out[9]=a[2]; why='acmod 1/0: centre to AES5 and mono'; }
    else { mono=(L+R)*md*M.dn; out[8]=L; out[9]=R; }
    out[2]=a[2]; out[3]=a[3]; out[4]=a[4]; out[5]=a[5];
    out[8]*=md*M.dn; out[9]*=md*M.dn;
  }
  out[6]=a[6]*dv; out[7]=mono;
  if (gpi) out[6]=mono;                                                  // (altera_data_in[7] & 0x02000000)==0 → create DV
  for (let k=0;k<10;k++){ if (out[k]>0.999999) out[k]=0.9999999; if (out[k]<=-1) out[k]=-1; }
  out[10]=srcSample(10,n); out[11]=srcSample(11,n);                      // TDM_out[11],[12] = TDM_in[11],[12]: AES6 echoed untouched
  return {out, a, mono, why};
}
function outSample(k, t){ const n=Math.floor(t*FS); return sampleIRQ(n, t).out[k]; }
function peakDb(k, t, win){ win=win||0.01; let p=0; const n1=Math.max(Math.floor(t*FS), Math.floor(win*FS)), n0=Math.max(0,n1-Math.floor(win*FS)); const st=Math.max(1,Math.floor((n1-n0)/120));
  for (let n=n0;n<=n1;n+=st){ const v=Math.abs(sampleIRQ(n,n/FS).out[k]); if (v>p) p=v; } return dB(p); }
function inPeakDb(k, t){ let p=0; const n1=Math.floor(t*FS); for (let n=n1-480;n<=n1;n+=2){ const v=Math.abs(srcSample(k,Math.max(0,n))); if (v>p) p=v; } return dB(p); }

/* ---------------- what the Atmel sees and shows ---------------- */
function aesLock(i){ if (!locked()) return 0; const p=layout().pairs[i]; if (!p) return 0; return dolbyEOn(i)? 3 : 1; }  // PCM=1, DOLBY_E=3 (M6205.h)
function ledsAt(t){
  const o={sd:0,hd:0,err:0,a1:0,a2:0,a3:0,a4:0,x1:0,x2:0,meta:0};
  if (!D.seated) return o;
  if (inBoot(t) || cliSpin(t)){ o.err=1; return o; }                    // DATA_INITIALIZATION: all off, ERROR on
  const L = locked(); const f=fmt();
  if (L){ if (f.hd){ o.hd=1; o.sd=1; } else o.sd=1; } else o.err=1;
  if (L){ const gm=groupsPresent(); o.a1=gm&1?1:0; o.a2=gm&2?1:0; o.a3=gm&4?1:0; o.a4=gm&8?1:0; }
  o.meta = (L && valAt('meta',t))?1:0;
  return o;                                                               // x1/x2 (AES 1/2) stay dark: Astatus never read
}
function cliSpin(t){ const s=sched(); return s.spin && t>=s.passes.find(p=>p.kind==='spin').xb && t<s.spin.t0; }
function ledByte(L){ return (L.hd?1:0)|(L.err?2:0)|(L.a1?4:0)|(L.a2?8:0)|(L.a3?16:0)|(L.a4?32:0)|(L.x1?64:0)|(L.x2?128:0); }

/* register block exchanged with FPGA/SHARC: ALTERA_BUFFER_out[0..11] and the status words Reg 7–10 */
function regsOut(){
  const b=new Array(12).fill(0); b[0]=0x53;b[1]=0x59;b[2]=0x4E;b[3]=0x43;
  const dipInv = D.dip.reduce((a,on,i)=>a|(on?1<<i:0),0);
  b[4]=groupsEnabled()<<6; b[5]=((D.dip[3]?1:0)<<3)|((D.dip[4]?1:0)<<2)|((D.dip[5]?1:0));
  const VT=v=> 61+v;                                     // VOLUME_Table: UNITY_GAIN 61 + signed value
  b[6]=VT(D.gain[0]); b[7]=VT(D.gain[2]); b[8]=VT(D.gain[1]); b[11]=dipInv;
  return b;
}
function regsStatus(t){
  const L=locked(), f=fmt(); const r7 = L? ((1<<31)|((f.hd?0:1)<<30)|((f.hd?1:0)<<29)|((f.field===1/50?1:0)<<28)|((f.field!==1/50?1:0)<<27)
     |((f.lines===1125?1:0)<<26)|((f.lines===750?1:0)<<25)|((f.lines===525?1:0)<<24)|((f.lines===625?1:0)<<23)|((f.field!==1/50?1:0)<<22)
     |((valAt('meta',t)?1:0)<<15)|(valAt('meta',t)?D.meta.line:0)) >>>0 : 0;
  const gm=groupsPresent();
  const r8 = (((1<<31)|(1<<30)|(1<<27)|((valAt('gpi1',t)?0:1)<<25)|((D.gpi2?0:1)<<24)|((dolbyEOn(1)?0x82:0)<<16)|((dolbyEOn(0)?0x82:0)<<8)|(0xA<<4)|(L?gm&0xF:0))>>>0);
  const r10 = ((dolbyEOn(1)?0xA:0)<<4)|(dolbyEOn(0)?0xA:0)|((dolbyEOn(5)?0xA:0)<<20);
  return {r7, r8, r9: L&&!f.hd? ((0xA0<<16)|0x00FF)>>>0 : 0xA00000, r10};
}

/* ---------------- DashBoard values (Dashboard2.c strings) ---------------- */
function oidVal(oid, t){
  const L=locked(), f=fmt(), meta=valAt('meta',t);
  switch(oid){
    case '1.5': return 'M6205A-C200';
    case '1.7': return 'MD-SDI Embedded Audio Processor w/ VANC Detection';
    case '1.2': return 'Ward-Beck Systems';
    case '1.11': return '3.01';
    case '1.4': return 'www.ward-beck.com';
    case '2.4': return L? f.name : 'Unlocked';
    case '2.15': return [0,1,2,3].map(i=>{ const l=aesLock(i); return `AES ${i+1}: `+(l===0?'Unlocked':l===3?'Locked-Dolby E':'Locked-PCM'); }).join(' · ');
    case '5.7': return meta? 'Line '+D.meta.line : 'N/A';
    case '2.13': return meta? 'Detected - Line '+D.meta.line : 'Not Detected';
    case '7.15': return valAt('gpi1',t)? 'Enabled' : 'Disabled';
  }
  return '';
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s);
  try{ fn(tr); }catch(e){ tr('error: '+e.message); console.error(e); }
  D.log.unshift({t:SIM.t, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const fmtS = t => t===Infinity? 'never in this second' : SIM.fmtT(t);
function arrival(tr, e, what){
  const s=sched(); const inCli=s.xchg.find(x=>e.tA>=x.t0&&e.tA<x.t1);
  if (inCli) tr(`The playhead is inside an exchange (CLI): the CAN interrupt waits until SEI at ${SIM.fmtT(inCli.t1)} (+${SIM.fmtDur(inCli.t1-e.tA)})`);
  tr(`${what} rides in the next control-TDM exchange; the SHARC has it at ${fmtS(e.tS)} (${e.tS===Infinity?'':'+'+SIM.fmtDur(e.tS-e.tA)} after the click)`);
}
const A = {
  gain(i, v){ v=clamp(Math.round(v),-15,15); const nm=['Program','DV','MixDown (AES5)'][i];
    act(`DashBoard: ${nm} gain → ${v>0?'+':''}${v} dB`, tr=>{
      if (!dashboardEnabled()){ tr('SW8 was ON at power-up → dashboard_enabled = NO: the card answers but ignores SET_PARAM (status only)'); return; }
      tr('DashBoard sends SET_PARAM for OID 7.1 (INT16 array, 3 entries) as a multi-frame CAN message, 1 Mbit/s');
      tr('can_rx_isr → CANRX_buffer (MOb1/2) → buffer_MOb[] → DASHBOARD_RESPONSE_SETUP → MultiFrameMessageReception(Receive71)');
      tr('getMessageCrc1() == Receive71.CRC → volume_upper/lower[1] = bytes 4–5 (Program), [2] = 6–7 (DV), [0] = 8–9 (MixDown); echo Response71');
      D.gain[i]=v; const e=setEv('g'+i, v);
      const b=['ALTERA_BUFFER_out[6] (Reg 2 bits 15..8)','ALTERA_BUFFER_out[8] (Reg 3 bits 31..24)','ALTERA_BUFFER_out[7] (Reg 2 bits 7..0)'][i];
      tr(`Next pass: ALTERA_SORT → VOLUME_Table() = UNITY_GAIN 61 ${v<0?'−':'+'} ${Math.abs(v)} = ${61+v} (0x${hx(61+v)}) → ${b}`);
      arrival(tr,e,'The byte');
      tr(`SHARC refresh_data(): ${['program_gain','dv_gain','mixdown_gain'][i]}_target = volume[${61+v}] = ${volume(61+v).toFixed(4)}; RampAudioCalc(…, 1) moves 0.2 % per sample → τ ≈ 500 samples ≈ 10.4 ms`);
    }); },
  unity(i){ A.gain(i,0); },
  gpi1(on){ act(on?'GPI/O1: contact closed':'GPI/O1: contact open', tr=>{
    D.gpi1=on; const e=setEv('gpi1', on);
    tr(`FPGA pin K18 (GPI1) → Reg 8 bit 25 = ${on?0:1} (active low, wired straight from the pin in m6205c.bdf)`);
    tr('cntrl_tdm_if latches Reg 7–10 into the 128-bit shifter on FSYNCH and shifts them to the SHARC after bit 192');
    arrival(tr,e,'Reg 8');
    tr(on? 'sample.c: (altera_data_in[7] & 0x02000000)==0 → audio_out_float[6] = mono → AES4 left = programme mono (“create DV”)' : 'sample.c: AES4 left = DV input × dv_gain again');
    tr('The Atmel only learns of it one exchange later, from the SHARC echo: ALTERA_SORT → gpi = ALTERA_BUFFER_in[28] & 3 → READ_GPI (gpo1_active)');
  }); },
  gpi2(on){ act(on?'GPI/O2: contact closed':'GPI/O2: contact open', tr=>{ D.gpi2=on; tr('Reg 8 bit 24 = '+(on?0:1)+'. READ_GPI/DEBOUNCE_GPI2 track it, but sample.c (C200) never reads bit 24: no audible effect. The SHARC copies bits 24/25 to Reg 110 as GPO2/GPO1 (refresh_meta_data).'); }); },
  meta(on){ act(on?'Metadata source: VANC (SMPTE 2020) present':'Metadata removed', tr=>{
    D.meta.on=on; const e=setEv('meta', on);
    tr(`FPGA meta_data_detector → Reg 7 bit 15 (Vanc Detected) = ${on?1:0}, bits 10..0 = line ${on?D.meta.line:0}; bytes queue in the FIFO read from bit 320 of each control frame`);
    arrival(tr,e,'Reg 7');
    if (on){ const M=metaParams(); tr('SHARC refresh_meta_data(): meta_data_bytes → find 0xCF 0xFC → meta_bytes_indexing → meta_sort per segment → Reg 11–110');
      tr(`ac_mode = ${D.meta.acmod} (${ACMOD[D.meta.acmod]}), ext_bsi = ${D.meta.ext}, preferred = ${D.meta.pref}; dial_norm_extract: dialnorm ${D.meta.dialnorm} → dn_gain = volume[${D.meta.dialnorm+30}] = ${M.dn.toFixed(3)} (${fdb(dB(M.dn))} dB)`);
      tr('sample.c “Yes meta data present”: AES2/AES3 passed, AES5 = mixdown × mixdown_gain × dn_gain, AES4 right = (Lmix+Rmix) × mixdown_gain × dn_gain'); }
    else tr('sample.c “No meta data”: AES2 and AES3 outputs are set to 0, AES5 = AES1, AES4 right = (L+R)/2');
    tr('Atmel: ALTERA_SORT reads vanc_detected from the echo → REFRESH_LEDS → METADATA_LED (PG3); DashBoard “Audio Metadata (VANC)”');
  }); },
  metaSet(k, v){ act(`Metadata: ${k} = ${v}`, tr=>{ D.meta[k]=v; tr('A new RDD 6 payload in VANC; meta_sort() repacks it into Reg 13–16 on the next exchange; sample.c picks the coefficients up from ac3_Cmix … loro_Smix.'); if (k==='dialnorm') tr(`dial_norm_extract: dn_gain = volume[${v}+30] = ${volume(v+30).toFixed(3)}`); if (k==='pref' && v===1) tr('Note: backgnd.c comments “ltrt=0 loro=1” but sample.c tests preferred == 2 for Lo/Ro (the RDD 6 code). Value 1 gives Lt/Rt.'); }); },
  layout(i){ act('Source: '+LAYOUTS[i].name, tr=>{ D.layout=i; const gm=groupsPresent();
    tr(`Embedded groups present: ${[0,1,2,3].filter(g=>gm>>g&1).map(g=>'G'+(g+1)).join(' ')||'none'}; groups enabled by SW1/SW2: ${groupsEnabled()+1}`);
    tr(fmt().hd? 'HD: hd_active_groups → Reg 8 bits 3..0 (audio_group_detect) → AUDIO 1–4 LEDs' : 'SD: SD CHACT → Reg 9 bits 15..0 (Emb_Astatus) → AUDIO 1–4 LEDs per nibble');
    if (i===4||i===2) tr('non_audio_detector2 flags the Dolby E pair (Reg 8 bits 23..8, Reg 10 nibble = 0xA: bit 3 compressed, 2 = Dolby E) → aesN_lock = DOLBY_E → DashBoard “Locked-Dolby E”');
  }); },
  sdi(on){ act(on?'Plug SDI IN':'Unplug SDI IN', tr=>{ D.sdi.on=on;
    tr(`GS1574A equaliser → GS1559 deserializer ${on?'locks':'loses lock'} → PINB.7 (smpte) = ${on?1:0}`);
    if (on) tr('Main loop: an exchange runs on every vertical edge from the FPGA (PINC.0) — about one per field');
    else tr(`smpte == NO_LOCK: vertical_sync_counter counts passes and only runs an exchange every ${VS_COUNT} passes (≈${(VS_COUNT*LOOP_T+XCHG_T).toFixed(2)} s, ${inf}); ALTERA_SORT zeroes every status and holds SD_RESET_ACTIVE`);
    tr(on? 'REFRESH_LEDS: '+(fmt().hd?'HD and SD LEDs on (HD_FORMAT lights both)':'SD LED on') : 'REFRESH_LEDS: HD/SD off, ERR on');
  }); },
  fmt(k){ act('SDI format → '+VFMT[k].name, tr=>{ D.sdi.fmt=k; tr(`FPGA ${VFMT[k].hd?'hd274_296_decoder':'sd656_decoder'} → Reg 7: ${VFMT[k].code}`); tr(`Exchanges now follow the ${(1/VFMT[k].field).toFixed(2)} Hz vertical rate`); }); },
  dip(i){ act(`SW1-${i+1} → ${D.dip[i]?'OFF':'ON'}`, tr=>{ D.dip[i]=!D.dip[i];
    const roles=['Group enable MSB','Group enable LSB','Dolby E on/off (doc) · Reg 3 bit 2 → Reg 110 bit 17','HD audio clock (Reg 2 bit 19)','PCM delay (Reg 2 bit 18)','Dialnorm (Reg 2 bit 16)','Defaults: DIP / NVRAM','DashBoard disable'];
    tr(`PINA bit ${i} ${D.dip[i]?'pulled low':'floats high'} (switch position → PA${i}: ${inf}) → READ_DIP_SWITCHES / INVERT_DATA every pass: ${roles[i]}`);
    if (i<2) tr(`audio_groups_enabled = ${groupsEnabled()} → ${groupsEnabled()+1} group(s); ALTERA_BUFFER_out[4] = 0x${hx(groupsEnabled()<<6)}`);
    if (i===5) tr('Reg 2 bit 16 reaches the SHARC, which only forwards it into Reg 110; dial_norm_extract() applies dn_gain whether SW6 is on or not');
    if (i===6) tr('SW7 is read once in main() into dip_switch_enabled, but RESTORE_INFORMATION_EEPROM() is commented out: settings always start from the DIP switches and unity gains');
    if (i===7) tr('SW8 is read only in main() before while(1): it takes effect after the next power-up (use “Reboot card”)');
  }); },
  reboot(){ act('Reboot card (pull and re-seat)', tr=>{ D.bootDip=D.dip.slice(); D.fault=null; D.ev={}; D.gain=[0,0,0];
    tr('main(): initialization → DATA_INITIALIZATION (ERR on) → wait() ≈0.25 s → slot ID by ADC (ADDRESS_TABLE) → wait → ALTERA_RESET(1000) → wait ≈0.5 s → SHARC_RESET(1000)');
    tr(`READ_DIP_SWITCHES: dip_switch_enabled = ${D.dip[6]?'NO':'YES'}, dashboard_enabled = ${D.dip[7]?'NO':'YES'} (read only here)`);
    tr('DATA_SETUP · CANinit (1 Mbit/s, timer0/timer1 started) · CAN_TX (PD7 low: transceiver out of loopback) · while(1)');
    tr('Gains return to unity: the EEPROM restore is commented out');
  }); },
  seat(on){ act(on?'Insert card':'Pull card', tr=>{ D.seated=on; if (on){ D.bootDip=D.dip.slice(); } tr(on?'Card powers up from the frame; boot ≈1 s ('+inf+') before the main loop':'Card out: no LEDs, slot empty in DashBoard'); }); },
  fault(){ act('Inject: SHARC held in reset', tr=>{ D.fault=SIM.t;
    tr('The SHARC stops echoing the control TDM; ALTERA_BUFFER_in[0..3] no longer reads “SYNC”');
    tr(`ALTERA_ALIGNMENT_CHECK: error_checker++ per exchange up to ERROR_COUNTER1 (${ERR_LIMIT}) ≈ ${(ERR_LIMIT*fmt().field).toFixed(1)} s of fields; the model starts it at 990 so the second shows the end`);
    tr('Then error0 = 1 → while(error0){ CLI(); } with no WDR → watchdog (WDTCR 0x08, ≈16 ms) → reset → main() → boot');
    tr('While the SHARC is held all outputs are silent; the ERR LED lights during the reboot');
  }); },
  clearFault(){ D.fault=null; SKEY=''; SIM.refresh(); },
  variant(id){ act('Firmware variant → '+VAR(id).name, tr=>{ D.variant=id; const v=VAR(id);
    tr(`${v.folder}: ${v.fn}`);
    tr(v.sched==='zeus'? 'v6xx (3G) build: Ross zeuslib/gearos co-operative scheduler — canReceive, appTask every 40 ms, reportStatus every 1000 ms (tasklist.c). No SHARC on the issue-6 board.' : 'Pre-3G build: one ICCAVR super-loop in main() plus timer0/timer1/CAN interrupts, like most WBS openGear cards.');
    if (id!=='c200') tr('The live audio model stays the C200 SHARC code; the timeline and Software tab switch to this variant\'s scheduler.');
  }); },
  reset(){ const v=D.variant; Object.assign(D, fresh()); D.variant=v; D.bootDip=D.dip.slice(); SKEY=''; SIM.refresh(); },
};

/* =====================================================================
   DRAWING — card (ISS4 gerbers), card edge, T6307 rear, DashBoard-style window
   ===================================================================== */
/* Card art: PCB/GERBERS/M6205A-ISS4.TOP + TSM (copper, pads) and TSS (silk), rendered at 120 dpi over
   x 2.45…15.35 in, y 5.55…8.75 in (1547 × 384 px). Solder mask green, silk white (TSS note table, item 5).
   Part positions: M6205A-iss4.pnp (report origin 3495, 5885 mil). */
const PX = (x,y)=>[(1.045 + x/1000)*120, (2.865 - y/1000)*120];
const LEDS = [ // [refdes, x, y, label, key, colour] — pnp + silk legend
  ['LED11',-495.3,2390,'SD','sd','var(--led-g)'], ['LED8',-495.3,2290,'HD','hd','var(--led-g)'], ['LED9',-495.3,2190,'ERR','err','#ff5a4a'],
  ['LED2',-495.3,1950,'AUDIO 1','a1','var(--led-a)'], ['LED3',-495.3,1850,'AUDIO 2','a2','var(--led-a)'], ['LED4',-495.3,1750,'AUDIO 3','a3','var(--led-a)'], ['LED5',-495.3,1650,'AUDIO 4','a4','var(--led-a)'],
  ['LED6',-495.3,1410,'AES 1','x1','var(--led-g)'], ['LED10',-495.3,1315,'AES 2','x2','var(--led-g)'], ['LED15',-345.3,965,'META DATA','meta','var(--led-g)'],
];
const CHIPS = [['U11',4446.2,1487.1,'AT90CAN128'],['U3',8383,1528.4,'EP2C35'],['U6',6690.5,1108.2,'ADSP-21262'],['U7',9737.3,2264.6,'GS1559'],
  ['U13',9713.7,709.5,'GS1531'],['U1',11002.2,2263.4,'GS1574A'],['U16',10678,595.1,'GS1528'],['U4',8832.6,478.9,'PLL1705'],['U21',8284.3,2363.3,'ICS662'],
  ['U18',5937.8,2367.4,'CS8416'],['U19',5937.8,1903.8,'CS8416'],['U22',4145,765,'74HC4094'],['U10',10989,51.8,'CAN'],['U5',5773.6,1154.9,'AT25F512A']];
function cardSVG(t, opts){
  opts=opts||{}; const L=ledsAt(t);
  let s=`<svg viewBox="0 0 1547 384" role="img" aria-label="M6205A issue 4 card, top side (from the gerbers)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="m65Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1547" height="384" fill="var(--panel2)"/>
   <path d="M10 10 H1510 V40 H1528 V300 H1505 V318 H1528 V376 H1505 V374 H62 L10 330 Z" fill="#1d4d2e" stroke="#123821"/>
   <image href="${ASSET}m6205-card-copper.png" width="1547" height="384"/>
   <image href="${ASSET}m6205-card-silk.png" width="1547" height="384" opacity=".9"/>
   <text x="${PX(-30,250)[0]}" y="${PX(-30,250)[1]-30}" font-size="13" fill="#e8e8e8" font-family="sans-serif">openGear (logo omitted)</text>`;
  LEDS.forEach(([rd,x,y,nm,k,col])=>{ const [px,py]=PX(x,y); const on=L[k];
    s+=`<rect x="${px-10}" y="${py-5}" width="20" height="10" rx="2" fill="${on?col:'#25302a'}" ${on?'filter="url(#m65Glow)"':''}><title>${rd} ${nm}${on?' — on':''}</title></rect>`; });
  // DIP: SW1 (219-8MS, 8-way) at pnp 3744.1,2410 — clickable; SW2 (4-way) not read by C200
  const [dx,dy]=PX(3744.1,2410);
  for (let i=0;i<8;i++){ const x=dx-43+i*12.3, on=D.dip[i];
    s+=`<g class="m65-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-5}" y="${dy-15}" width="10" height="30" rx="1.5" fill="#c63434" stroke="#5a1010"/><rect x="${x-3.5}" y="${on?dy-13:dy+1}" width="7" height="12" fill="#f2f2f2"/><rect x="${x-7}" y="${dy-22}" width="14" height="44" fill="transparent"><title>SW1-${i+1}: ${['Group MSB','Group LSB','Dolby E pass/mute','HD audio clock','PCM delay','Dialnorm','Defaults (read at boot)','DashBoard disable (read at boot)'][i]} — ${on?'ON':'OFF'} (click)</title></rect></g>`; }
  s+=`<text x="${dx-50}" y="${dy+32}" font-size="11" fill="#ffd36a" font-family="sans-serif">1</text><text x="${dx+42}" y="${dy+32}" font-size="11" fill="#ffd36a" font-family="sans-serif">8 · ON ↑ ${'(orientation inferred)'}</text>`;
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" font-family="sans-serif">${txt}</text>`;
    CHIPS.forEach(([rd,x,y,n])=>{ const [px,py]=PX(x,y); s+=lab(px-28, py+(rd==='U3'?46:rd==='U11'?-38:rd==='U6'?52:-14), n); });
    s+=lab(560,350,'P3 · Dolby decoder header')+lab(1478,26,'P1')+lab(1478,372,'P2');
  }
  if (!D.seated) s+=`<rect width="1547" height="384" fill="var(--panel2)" opacity=".78"/><text x="773" y="200" text-anchor="middle" font-size="38" fill="var(--ink)">card pulled from the frame</text>`;
  else if (inBoot(t)) s+=`<text x="200" y="120" font-size="22" fill="#ffd36a" font-family="sans-serif">rebooting — main() init, waits, ALTERA_RESET, SHARC_RESET</text>`;
  if (opts.hot) s+=opts.hot;
  return s+'</svg>';
}
/* ---- Artwork 2026|59: card edge and T6307 rear module are the archive's CorelDRAW drawings (assets/m6205-*.svg);
   LEDs and jacks sit on the lens / BNC centres read from those SVGs. */
const ART_DIR='#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/';
const EDGE_ART={href:ASSET+'m6205-edge.svg', vb:[58,168,204,418], x:243.8, ys:[189.2,217.4,248.3,295.3,319.2,343.4,367.2,401.4,425.1,468.3],
  src:()=>SIM.src(ART_DIR+'M6205-card-edge-v10.cdr','M6205-card-edge-v10.cdr')+' (2008-10-30)'};
const REAR_ART={
  m6205:{href:ASSET+'m6205-rear-t6307.svg', vb:[262,328,274,348], cols:[359.86,419.86], ys:[400.5,460.5,520.5,580.5,639.7], r:18.7,
    src:()=>SIM.src(ART_DIR+'PCB/OBSOLETE/ISSUE4/M6205-T6307.cdr','PCB/OBSOLETE/ISSUE4/M6205-T6307.cdr')+' (2008-11-17)'},
  c200:{href:ASSET+'m6205-rear-t6307-c200.svg', vb:[262,328,274,348], cols:[359.86,419.86], ys:[400.5,460.5,520.5,580.5,639.7], r:18.7,
    src:()=>SIM.src(ART_DIR+'CUSTOM/M6205C200/V3.0.0.0/M6205-T6307.cdr','CUSTOM/M6205C200/V3.0.0.0/M6205-T6307.cdr')+' (2010-07-13)'} };
let rearArt='m6205';
[EDGE_ART.href, ...Object.values(REAR_ART).map(a=>a.href)].forEach(u=>{ const im=new Image(); im.src=u; });   // warm the image cache: panels are redrawn every tick
function edgeSVG(t){
  const L=ledsAt(t), E=EDGE_ART, v=E.vb;
  let s=`<svg viewBox="${v.join(' ')}" style="width:100%;max-width:200px;display:block;border-radius:6px" role="img" aria-label="M6205 card edge (M6205-card-edge-v10.cdr)">
   <defs><filter id="m65Glow2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <image href="${E.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  LEDS.forEach(([rd,x,y,nm,k,col],i)=>{ const on=L[k];
    s+=`<circle cx="${E.x}" cy="${E.ys[i]}" r="4.2" fill="${on?col:'#2c332c'}" fill-opacity="${on?1:.55}" ${on?'filter="url(#m65Glow2)"':''}><title>${nm} (${rd})${on?' — on':' — off'}</title></circle>`; });
  return s+`<text transform="translate(238.5 554.5) rotate(-90)" text-anchor="middle" font-size="9" font-weight="700" fill="#111">M6205A</text></svg><div class="small muted" style="margin-top:2px">Card edge: ${E.src()}</div>`;
}
/* T6307 rear: positions and labels from M6205-T6307.pdf (2 columns × 5 rows, “+ − G” on 2, 6 and 8). Panel size from the
   openGear rear-module grid used for T6302 (1.31 × 3.34 in) — inferred for T6307. */
const T6307 = [['SDI IN','bnc','sdi'],['GPI/O1','phx','gpi1'],['AES OUT1 (L, R)','bnc','o1'],['BNC4 (C, LFE)','bnc','o2'],['AES OUT2 (Ls, Rs)','bnc','o3'],['META DATA','phx','meta'],['AES IN1','bnc','ain'],['GPI/O2','phx','gpi2'],['SDI OUT1','bnc','so'],['SDI OUT2','bnc','so']];
function rearSVGDrawn(t){
  const colX=[46,105], rowY=[52,114,176,238,300];
  let s=`<svg viewBox="0 0 151 354" role="img" aria-label="T6307 rear module" style="width:100%;max-width:220px;display:block">
    <rect x="10" y="10" width="131" height="334" rx="3" fill="#c9ccd0" stroke="#7a7f85"/>`;
  T6307.forEach(([lab,kind,role],i)=>{
    const cx=colX[i%2], cy=rowY[i>>1];
    let conn=false, live=false;
    if (role==='sdi') conn=D.sdi.on; if (role==='gpi1') conn=D.gpi1; if (role==='gpi2') conn=D.gpi2; if (role==='meta') conn=false;
    if (role==='o1') live=peakDb(0,t,0.002)>-90; if (role==='o2') live=peakDb(2,t,0.002)>-90; if (role==='o3') live=peakDb(4,t,0.002)>-90; if (role==='so') live=locked()&&!inBoot(t);
    const click = (role==='sdi'||role==='gpi1'||role==='gpi2');
    if (kind==='bnc') s+=`<g ${click?`class="m65-jack" data-j="${role}" style="cursor:pointer"`:''}><circle cx="${cx}" cy="${cy}" r="19" fill="#b9a160" stroke="#6b5a25"/><circle cx="${cx}" cy="${cy}" r="12" fill="#e2d39b"/><circle cx="${cx}" cy="${cy}" r="4" fill="#6b5a25"/>
        ${conn?`<circle cx="${cx}" cy="${cy}" r="15" fill="#2b5f9e" opacity=".85"/><rect x="${cx-5}" y="${cy}" width="10" height="22" fill="#2b5f9e"/>`:''}
        ${(role[0]==='o'||role==='so')?`<circle cx="${cx+16}" cy="${cy-16}" r="3.4" fill="${live?'var(--accent)':'#888'}"/>`:''}
        <rect x="${cx-22}" y="${cy-22}" width="44" height="44" fill="transparent"><title>${i+1} ${lab}${click?' — click to '+(conn?'unplug':'plug in'):''}${role==='ain'?' — not read by the C200 firmware':''}</title></rect></g>`;
    else { const pins=['+','−','G'].map((p,k)=>`<rect x="${cx-7}" y="${cy-21+k*14.8}" width="14" height="11" fill="#1d7a40" stroke="#0b4b26"/><circle cx="${cx}" cy="${cy-15.5+k*14.8}" r="3" fill="#0b2b16"/><text x="${cx-16}" y="${cy-12+k*14.8}" font-size="7" fill="#333">${p}</text>`).join('');
      s+=`<g ${click?`class="m65-jack" data-j="${role}" style="cursor:pointer"`:''}><rect x="${cx-11}" y="${cy-24}" width="22" height="48" fill="#24944d" stroke="#0b4b26"/>${pins}
        ${conn?`<path d="M${cx+11} ${cy-15} h10 M${cx+11} ${cy} h10" stroke="#2b5f9e" stroke-width="4"/>`:''}
        <rect x="${cx-24}" y="${cy-26}" width="48" height="52" fill="transparent"><title>${i+1} ${lab}${click?' — click to '+(conn?'open':'close')+' the contact':''}</title></rect></g>`; }
    s+=`<text x="${i%2? cx+24 : cx-26}" y="${cy+31}" font-size="7" text-anchor="${i%2?'end':'start'}" fill="#1b1d20" font-weight="700">${i+1} ${lab}</text>`;
  });
  return s+`<text x="75" y="352" font-size="7" text-anchor="middle" fill="#55595f">T6307 · single-card termination</text></svg>`;
}
function rearSVG(t){
  const R=REAR_ART[rearArt], v=R.vb, r=R.r;
  let s=`<svg viewBox="${v.join(' ')}" role="img" aria-label="T6307 rear module (archive drawing)" style="width:100%;max-width:240px;display:block;border-radius:6px">
    <image href="${R.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  T6307.forEach(([lab,kind,role],i)=>{
    const cx=R.cols[i%2], cy=R.ys[i>>1];
    let conn=false, live=false;
    if (role==='sdi') conn=D.sdi.on; if (role==='gpi1') conn=D.gpi1; if (role==='gpi2') conn=D.gpi2;
    if (role==='o1') live=peakDb(0,t,0.002)>-90; if (role==='o2') live=peakDb(2,t,0.002)>-90; if (role==='o3') live=peakDb(4,t,0.002)>-90; if (role==='so') live=locked()&&!inBoot(t);
    const click = (role==='sdi'||role==='gpi1'||role==='gpi2'), outp=(role[0]==='o'||role==='so');
    s+=`<g ${click?`class="m65-jack" data-j="${role}" style="cursor:pointer"`:''}>`;
    if (kind==='bnc') s+= conn?`<rect x="${cx-r*.28}" y="${cy}" width="${r*.56}" height="${r*1.9}" fill="#2b5f9e"/><circle cx="${cx}" cy="${cy}" r="${r*.78}" fill="#2b5f9e" opacity=".85"/>`:'';
    else s+= conn?`<path d="M${cx+r*.55} ${cy-r*.75} h${r*1.1} M${cx+r*.55} ${cy} h${r*1.1}" stroke="#2b5f9e" stroke-width="${r*.3}"/>`:'';
    if (outp) s+=`<circle cx="${cx+r*.95}" cy="${cy+r*.95}" r="${r*.2}" fill="${live?'var(--accent)':'#888'}" stroke="#222" stroke-width=".6"/>`;
    s+=`<rect x="${cx-r*1.15}" y="${cy-r*1.2}" width="${r*2.3}" height="${r*2.4}" fill="transparent"><title>${i+1} ${lab}${click?' — click to '+(kind==='bnc'?(conn?'unplug':'plug in'):(conn?'open':'close')+' the contact'):''}${role==='ain'?' — not read by the C200 firmware':''}</title></rect></g>`;
  });
  return s+`</svg><div class="small muted" style="margin-top:2px">T6307: ${R.src()} · <a href="javascript:void 0" class="m65-art">${rearArt==='m6205'?'show the C200 drawing':'show the M6205 drawing'}</a></div>`;
}
function bindHW(root){
  root.querySelectorAll('.m65-art').forEach(e=>e.onclick=()=>{ rearArt = rearArt==='m6205'?'c200':'m6205'; SIM.refresh(); });
  root.querySelectorAll('.m65-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.m65-jack').forEach(g=>g.onclick=()=>{ const j=g.dataset.j; if (j==='sdi') A.sdi(!D.sdi.on); else if (j==='gpi1') A.gpi1(!D.gpi1); else if (j==='gpi2') A.gpi2(!D.gpi2); });
}

/* DashBoard-style window — a generic parameter editor in period style, not Ross's design */
const M65_CSS = `<style>
.m65-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.m65-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.m65-dwrap{display:grid;grid-template-columns:140px 1fr;min-height:230px}
.m65-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.m65-tree .sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.m65-ptabs{display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px 0}
.m65-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.m65-pbody{padding:8px;border-top:1px solid var(--line)}
.m65-dt{border-collapse:collapse;width:100%}.m65-dt td{padding:3px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.m65-dl{color:var(--ink2);width:40%}
.m65-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.m65-note{margin-top:6px;font-size:11.5px;color:var(--ink2)}
.m65-sl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.m65-sl input[type=range]{writing-mode:vertical-lr;direction:rtl;height:120px;width:24px}
.m65-meter{display:grid;grid-template-columns:90px 1fr 60px;gap:6px;align-items:center;font-size:12px;margin:2px 0}
.m65-bar{height:10px;border-radius:5px;background:var(--grid);overflow:hidden}.m65-bar i{display:block;height:100%;background:var(--accent)}
.m65-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}
@media (max-width:700px){.m65-dwrap{grid-template-columns:1fr}.m65-tree{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;
function dashHTML(t){
  const tab=D.dash.tab, de=dashboardEnabled(), alive=D.seated && !inBoot(t);
  const row=(l,v)=>`<tr><td class="m65-dl">${l}</td><td>${v}</td></tr>`, ro=v=>`<input readonly value="${String(v).replace(/"/g,'&quot;')}">`;
  let body='';
  if (!alive) body='<div class="m65-note">Slot '+D.slot+': no card answering.</div>';
  else if (tab==='info') body=`<table class="m65-dt">${[['Product','1.5'],['Name','1.7'],['Supplier','1.2'],['Software Rev','1.11'],['Website','1.4']].map(([n,o])=>row(n+` <span class="muted small">${o}</span>`, ro(oidVal(o,t)))).join('')}</table><div class="m65-note">Menu0OID_Message “Card Info”: OIDs 1.5, 1.7, 1.2, 1.11, 1.4.</div>`;
  else if (tab==='input') body=`<table class="m65-dt">${row('SDI <span class="muted small">2.4</span>', ro(oidVal('2.4',t)))}${row('Embedded Audio <span class="muted small">2.15</span>', oidVal('2.15',t).split(' · ').map(x=>`<div class="mono small">${x}</div>`).join(''))}${row('Line <span class="muted small">5.7</span>', ro(oidVal('5.7',t)))}${row('Audio Metadata (VANC) <span class="muted small">2.13</span>', ro(oidVal('2.13',t)))}${row('Manual DV (GPI1) <span class="muted small">7.15</span>', ro(oidVal('7.15',t)))}</table><div class="m65-note">Menu1OID_Message “Input Signal”. Values follow the Atmel's copy, which is one exchange behind the SHARC.</div>`;
  else if (tab==='meta'){ const on=valAt('meta',t), m=D.meta;
    const v=x=> on? x : 'N/A';
    body=`<table class="m65-dt">${row('Dolby E: Configuration / Frame Rate', ro(on?'Not Indicated':'N/A'))}${row('PGM', `<select id="m65pgm">${[1,2,3,4].map(i=>`<option ${i===1?'selected':''}>PGM ${i}</option>`).join('')}</select> <span class="muted small">max_programs = 4</span>`)}
      ${row('ac3_acmod', ro(v(ACMOD[m.acmod])))}${row('ac3_lfeon', ro(v(m.acmod===7?'On':'Off')))}${row('ac3_center_mixlevel (dB)', ro(v(['-3.0','-4.5','-6.0','Reserved'][m.clev])))}${row('ac3_surround mixlevel (dB)', ro(v(['-3.0','-6.0','-inf','Reserved'][m.slev])))}
      ${row('ac3_dialnorm (dB)', ro(v('-'+m.dialnorm)))}${row('Preferred Downmix', ro(v(['Not Indicated','Lt/Rt','Lo/Ro','Reserved'][m.pref])))}${row('Lt/Rt Center / Surround (dB)', ro(v(EXT_DB[m.ltc]+' / '+EXT_DB[m.lts])))}${row('Lo/Ro Center / Surround (dB)', ro(v(EXT_DB[m.loc]+' / '+EXT_DB[m.los])))}</table>
      <div class="m65-note">Menu2OID_Message “Metadata” (OIDs 5.6, 2.16, 2.20, 5.2, 6.0–6.27). Read-only.</div>`; }
  else { body=`<div class="m65-sl">${['Program','DV','MixDown (AES5)'].map((n,i)=>`<div><div class="small">${n}</div><input type="range" min="-15" max="15" step="1" value="${D.gain[i]}" data-g="${i}" ${de?'':'disabled'}><div class="mono">${D.gain[i]>0?'+':''}${D.gain[i]} dB</div><button data-u="${i}" ${de?'':'disabled'}>Unity</button></div>`).join('')}</div>
      <div class="m65-row"><button data-ua="1" ${de?'':'disabled'}>Unity All</button><span class="muted small">OID 7.1 INT16 array −15…+15, 7.3 unity buttons, 8.15 Unity All</span></div>
      ${de?'':'<div class="m65-note" style="color:var(--warn)">SW8 was ON at power-up: status only, sliders locked.</div>'}`; }
  return `<div class="m65-dash"><div class="m65-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="m65-dwrap"><div class="m65-tree"><div>▾ openGear frame</div><div style="padding-left:10px">▸ Frame controller</div><div style="padding-left:10px" class="sel">${alive?'●':'○'} Slot ${D.slot}: ${alive?'M6205A-C200':''}</div></div>
   <div><div class="m65-ptabs">${[['info','Card Info'],['input','Input Signal'],['meta','Metadata'],['gain','Gain Processing']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
   <div class="m65-pbody">${body}</div></div></div></div>`;
}
function bindDash(root){
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.dash.tab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('input[data-g]').forEach(r=>r.onchange=()=>A.gain(+r.dataset.g, +r.value));
  root.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>A.unity(+b.dataset.u));
  const ua=root.querySelector('[data-ua]'); if (ua) ua.onclick=()=>{ [0,1,2].forEach(i=>{ D.gain[i]=0; setEv('g'+i,0); }); act('DashBoard: Unity All (OID 8.15)', tr=>{ tr('Receive73-style handler sets unity_gain[0..2] = 1 and volume_upper/lower[0..2] = 0 → VOLUME_Table = 61 for all three'); }); };
}
function controlsHTML(){
  return `<div class="m65-row">
    <label class="small">Variant <select id="m65var">${VARIANTS.map(v=>`<option value="${v.id}" ${v.id===D.variant?'selected':''}>${v.name}</option>`).join('')}</select></label></div>
   <div class="m65-row">
    <label class="small">SDI <select id="m65fmt">${Object.keys(VFMT).map(k=>`<option value="${k}" ${k===D.sdi.fmt?'selected':''}>${VFMT[k].name}</option>`).join('')}</select></label>
    <button id="m65sdi">${D.sdi.on?'Unplug':'Plug'} SDI IN</button>
    <label class="small">Source <select id="m65lay">${LAYOUTS.map((l,i)=>`<option value="${i}" ${i===D.layout?'selected':''}>${l.name}</option>`).join('')}</select></label></div>
   <div class="m65-row">
    <button id="m65meta" class="${D.meta.on?'on':''}">VANC metadata ${D.meta.on?'ON':'OFF'}</button>
    <label class="small">acmod <select id="m65ac">${[1,2,7].map(k=>`<option value="${k}" ${k===D.meta.acmod?'selected':''}>${ACMOD[k]}</option>`).join('')}</select></label>
    <label class="small">dialnorm −<input id="m65dn" type="number" min="1" max="31" value="${D.meta.dialnorm}" style="width:46px"></label>
    <label class="small">ext. bitstream <select id="m65ext"><option value="0" ${D.meta.ext===0?'selected':''}>no</option><option value="1" ${D.meta.ext===1?'selected':''}>yes</option></select></label>
    <label class="small">preferred <select id="m65pref">${['Not indicated (0)','Lt/Rt (1)','Lo/Ro (2)'].map((n,i)=>`<option value="${i}" ${D.meta.pref===i?'selected':''}>${n}</option>`).join('')}</select></label></div>
   <div class="m65-row">
    <button id="m65g1" class="${D.gpi1?'on':''}">GPI/O1 ${D.gpi1?'closed':'open'}</button><button id="m65g2" class="${D.gpi2?'on':''}">GPI/O2 ${D.gpi2?'closed':'open'}</button>
    <button id="m65rb">Reboot card</button><button id="m65seat">${D.seated?'Pull card':'Insert card'}</button>
    <button id="m65flt">Inject: SHARC held in reset</button><button id="m65clr">Clear fault</button><button id="m65rst">Factory state</button></div>
   <div class="small muted" style="margin-top:4px">Click the red DIP switch SW1 on the card, the rear SDI IN BNC and the GPI/O terminals. Keys: G = GPI1, M = metadata, S = SDI.</div>`;
}
function bindControls(root){
  const q=s=>root.querySelector(s); if (!q('#m65sdi')) return;
  q('#m65var').onchange=e=>A.variant(e.target.value);
  q('#m65fmt').onchange=e=>A.fmt(e.target.value);
  q('#m65sdi').onclick=()=>A.sdi(!D.sdi.on);
  q('#m65lay').onchange=e=>A.layout(+e.target.value);
  q('#m65meta').onclick=()=>A.meta(!D.meta.on);
  q('#m65ac').onchange=e=>A.metaSet('acmod',+e.target.value);
  q('#m65dn').onchange=e=>A.metaSet('dialnorm',clamp(+e.target.value||0,1,31));
  q('#m65ext').onchange=e=>A.metaSet('ext',+e.target.value);
  q('#m65pref').onchange=e=>A.metaSet('pref',+e.target.value);
  q('#m65g1').onclick=()=>A.gpi1(!D.gpi1); q('#m65g2').onclick=()=>A.gpi2(!D.gpi2);
  q('#m65rb').onclick=()=>A.reboot(); q('#m65seat').onclick=()=>A.seat(!D.seated);
  q('#m65flt').onclick=()=>A.fault(); q('#m65clr').onclick=()=>A.clearFault(); q('#m65rst').onclick=()=>A.reset();
}
document.addEventListener('keydown', e=>{
  if (!window.__m6205Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(); const m={g:()=>A.gpi1(!D.gpi1), m:()=>A.meta(!D.meta.on), s:()=>A.sdi(!D.sdi.on)};
  if (m[k]){ m[k](); e.preventDefault(); }
});
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Use the card, rear module, DashBoard or the controls. Each step the firmware takes is listed here.</div>'; }
function meterHTML(t){
  const names=['AES1 L','AES1 R','AES2 L (C)','AES2 R (LFE)','AES3 L (Ls)','AES3 R (Rs)','AES4 L (DV)','AES4 R (mono)','AES5 L (Lt)','AES5 R (Rt)','AES6 L','AES6 R'];
  return names.map((n,k)=>{ const v=peakDb(k,t); const w=v===-Infinity?0:clamp((v+60)/60*100,0,100);
    return `<div class="m65-meter"><span>${n}</span><div class="m65-bar"><i style="width:${w}%;${k>=10?'background:var(--accent2)':''}"></i></div><span class="mono">${fdb(v)}</span></div>`; }).join('') +
    `<div class="small muted">Peak over the last 10 ms at the playhead, dBFS, computed from sample.c per sample. AES6 is the raw TDM echo (Dolby E stays bit-exact).</div>`;
}

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
const css = n=>SIM.css(n);
function txt(c,s,x,y,maxW){ c.font='10px '+css('--mono'); if (maxW && c.measureText(s).width>maxW) return; c.fillText(s,x,y); }
function zeusSched(){
  // tasklist.c: canReceive (signalled by the CAN ISR), appTask every APPTASK_INTERVAL = 40 ms, reportStatus every MONITOR_INTERVAL = 1000 ms
  const ev=[]; for (let t=0.004;t<1;t+=0.040) ev.push({t0:t,t1:t+0.0045,k:'appTask'});
  ev.push({t0:0.3207,t1:0.3247,k:'reportStatus'});
  D.log.filter(e=>/DashBoard/.test(e.name)).forEach(e=>ev.push({t0:e.t,t1:e.t+0.0012,k:'canReceive'}));
  return ev.sort((a,b)=>a.t0-b.t0);
}
function lanes(){
  const f=fmt(), V=VAR(D.variant), ls=[];
  ls.push({label:'SDI in: fields / lines', h:28, draw(c,X,t0,t1,y,h){
    if (!locked()){ c.fillStyle=css('--ink2'); txt(c,'no SDI input', X(t0)+6, y+h/2+4); return; }
    const Tl=lineT(f), span=t1-t0;
    if (span < 60*Tl) SIM.pulses(c,X,t0,t1,y+h*0.45,h*0.55,Tl,0.0012,Tl*(f.words-f.act)/f.words,css('--ink2'),'EAV+HANC');
    SIM.pulses(c,X,t0,t1,y,h*(span<60*Tl?0.45:1),f.field,0.0012,Tl*(f.hd?20:19),css('--accent2'),f.prog?'frames':'fields');
  }});
  ls.push({label:'HANC audio packets (G1–G4)', h:26, draw(c,X,t0,t1,y,h){
    if (!locked()){ return; } const gm=groupsPresent(), Tl=lineT(f), span=t1-t0;
    const gs=[0,1,2,3].filter(g=>gm>>g&1);
    if (span > 40*Tl){ c.globalAlpha=.3; gs.forEach((g,k)=>{ c.fillStyle=css(['--accent','--accent2','--warn','--bad'][g]); c.fillRect(X(t0), y+3+k*(h-6)/gs.length, X(t1)-X(t0), (h-6)/gs.length-1); }); c.globalAlpha=1;
      c.fillStyle=css('--ink'); txt(c, `${f.hd?'SMPTE 299: one packet per group per sample (48 000/s)':'SMPTE 272: one packet per group per line'} · groups ${gs.map(g=>g+1).join(',')} · demuxed: ${groupsEnabled()+1}`, X(t0)+6, y+h/2+4); return; }
    const n0=Math.floor((t0-0.0012)/Tl), n1=Math.ceil((t1-0.0012)/Tl), wt=Tl/f.words;
    for (let n=n0;n<=n1;n++){ const ta=0.0012+n*Tl; let w=f.hd?12:4; const per=f.hd? Math.round(FS*Tl*10)/10 : 1;
      gs.forEach(g=>{ const len=f.hd?31:(7+12*Math.round(FS*Tl)); const reps=f.hd?Math.max(1,Math.round(FS*Tl)):1;
        for (let r=0;r<reps;r++){ c.fillStyle=css(['--accent','--accent2','--warn','--bad'][g]); c.fillRect(X(ta+w*wt), y+4+g*(h-8)/4, Math.max(1,X(ta+(w+len)*wt)-X(ta+w*wt)), (h-8)/4-0.5); w+=len; } }); }
  }});
  if (V.sched==='zeus'){
    ls.push({label:'gearos tasks (zeuslib, v6xx)', h:34, draw(c,X,t0,t1,y,h){
      c.fillStyle=css('--grid'); c.fillRect(X(t0),y+h-8,X(t1)-X(t0),4);
      const col={appTask:'--accent',reportStatus:'--warn',canReceive:'--accent2'};
      zeusSched().forEach(e=>{ if (e.t1<t0||e.t0>t1) return; c.fillStyle=css(col[e.k]); c.fillRect(X(e.t0),y+4,Math.max(1.5,X(e.t1)-X(e.t0)),h-14); if (X(e.t1)-X(e.t0)>60){ c.fillStyle='#fff'; txt(c,e.k,X(e.t0)+3,y+16); } });
      c.fillStyle=css('--ink2'); if (t1-t0>0.2) txt(c,'osRun: first signalled task wins; otherwise osIdleTask → WDR (task lengths '+'inferred'+')', X(t0)+6, y+h-10);
    }});
    ls.push({label:'altspi / GS2970 reads in appTask', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,0.040,0.004,0.0045,css('--accent2'),'appTask: gs2970ReadVidInfo · alteraRead · updateLeds'); }});
    ls.push({label:'Daughter card (DTS / Dolby)', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); txt(c,'TI C6713 on the 72-pin SIMM — firmware is third-party and not in the archive; no SHARC on issue 6', X(t0)+6, y+h/2+4); }});
    ls.push({label:'Watchdog', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); txt(c,'wdgEnable(WDT_1000MS) in main(); kicked in osIdleTask', X(t0)+6, y+h/2+4); }});
    return ls;
  }
  ls.push({label:'FPGA vertical → PC0', h:20, draw(c,X,t0,t1,y,h){ if (!locked()) return; SIM.pulses(c,X,t0,t1,y,h,f.field,0.0012,0.00008,css('--warn'),'vertical edges'); }});
  ls.push({label:'AT90CAN128 main loop', h:34, draw(c,X,t0,t1,y,h){
    const S=sched(); const pxPass=X(t0+LOOP_T)-X(t0); let shown=0;
    for (const p of S.passes){ if (p.t1<t0||p.t0>t1) continue; shown++;
      if (p.kind==='boot'){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(p.t0),y+3,X(p.t1)-X(p.t0),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); txt(c,'watchdog RESET → main() boot ≈1 s (inferred)', Math.max(X(p.t0),X(t0))+4, y+h/2+4); continue; }
      if (p.kind==='spin2'){ c.fillStyle=css('--bad'); c.fillRect(X(p.t0),y+3,X(p.t1)-X(p.t0),h-6); continue; }
      if (p.x){ c.fillStyle=css(sched().xchg.find(e=>e.t0===p.xa&&e.bad)?'--bad':'--accent2'); c.globalAlpha=.85; c.fillRect(X(p.xa),y+3,Math.max(1,X(p.xb)-X(p.xa)),h-6); c.globalAlpha=1;
        if (X(p.xb)-X(p.xa)>110){ c.fillStyle='#fff'; txt(c,'ALTERA_read_write · CLI · 440 B', X(p.xa)+4, y+h/2+4); } }
      c.fillStyle=css('--accent'); c.globalAlpha= p.i%2? .45:.75;
      if (pxPass>70){ let tt=p.t0; STEPS.forEach((s,j)=>{ if (j===2){ if (p.x) tt=p.xb; return; } const d=s[1]*LOOP_T; c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-1),h-6); if (X(tt+d)-X(tt)>80){ c.globalAlpha=1; c.fillStyle='#fff'; txt(c,s[0].split(' · ')[0].slice(0,22),X(tt)+3,y+h/2+4); c.fillStyle=css('--accent'); c.globalAlpha=p.i%2?.45:.75; } tt+=d; }); }
      else { c.fillRect(X(p.t0),y+3,Math.max(0.6,X(p.x?p.xa:p.t1)-X(p.t0)-0.4),h-6); if (p.x) c.fillRect(X(p.xb),y+3,Math.max(0.6,X(p.t1)-X(p.xb)),h-6); }
      c.globalAlpha=1;
    }
    if (pxPass<3){ c.fillStyle=css('--ink'); txt(c, `${shown} passes in view (≈0.4 ms each, inferred); purple = 10.45 ms exchange with interrupts off`, X(t0)+6, y+11); }
  }});
  ls.push({label:'Control TDM bits (SCLK = Atmel bit-bang)', h:26, draw(c,X,t0,t1,y,h){
    for (const e of sched().xchg){ if (e.t1<t0||e.t0>t1) continue;
      const seg=[[0,24,'--accent','Atmel Reg 1–6 → SHARC'],[24,40,'--warn','FPGA Reg 7–10'],[40,440,'--accent2','metadata FIFO bytes']];
      seg.forEach(([a,b,col,l])=>{ const xa=X(e.t0+a*BYTE_T), xb=X(e.t0+b*BYTE_T); c.fillStyle=css(col); c.globalAlpha=.8; c.fillRect(xa,y+4,Math.max(1,xb-xa),h-8); c.globalAlpha=1; if (xb-xa>120){ c.fillStyle='#fff'; txt(c,l,xa+3,y+h/2+4); } });
      if (X(e.t0+BYTE_T)-X(e.t0)>40){ for (let b=Math.max(0,Math.floor((t0-e.t0)/BYTE_T));b<440 && e.t0+b*BYTE_T<t1;b++){ const xa=X(e.t0+b*BYTE_T); c.fillStyle=css('--ink'); c.fillRect(xa,y+2,1,h-4); if (X(e.t0+(b+1)*BYTE_T)-xa>40) txt(c,'byte '+b,xa+3,y+11); if (X(e.t0+b*BYTE_T+BIT_T)-xa>6) for (let k=1;k<8;k++){ c.fillStyle=css('--ink2'); c.fillRect(X(e.t0+b*BYTE_T+k*BIT_T),y+h-8,1,6); } } }
    }
  }});
  ls.push({label:'timer0 1 ms tick (lost under CLI)', h:22, draw(c,X,t0,t1,y,h){
    if (!D.seated) return; SIM.pulses(c,X,t0,t1,y,h,T0_TICK,0,0.00004,css('--accent'),'timer0_ovf_isr → SD_RESET()');
    for (const l of sched().lost){ if (l.t1<t0||l.t0>t1) continue; c.fillStyle=css('--bad'); c.globalAlpha=.35; c.fillRect(X(l.t0),y+2,X(l.t1)-X(l.t0),h-4); c.globalAlpha=1; if (X(l.t1)-X(l.t0)>90){ c.fillStyle=css('--ink'); txt(c,`${l.n} ticks lost`,X(l.t0)+3,y+h/2+4); } }
  }});
  ls.push({label:'CAN (1 Mbit/s) · DashBoard', h:22, draw(c,X,t0,t1,y,h){
    c.fillStyle=css('--ink2'); SIM.pulses(c,X,t0,t1,y+h*0.55,h*0.45,0.0579,0.011,0.00013,css('--ink2'),'timer1 HEARTBEAT_TIME 57.9 ms');
    D.log.forEach(e=>{ if (!/DashBoard/.test(e.name)) return; const tA=e.t; let tR=tA; const x=sched().xchg.find(q=>tA>=q.t0&&tA<q.t1); if (x) tR=x.t1;
      c.fillStyle=css('--warn'); c.fillRect(X(tA),y+2,Math.max(2,X(tA+0.00025)-X(tA)),h*0.5); c.fillStyle=css('--accent'); c.fillRect(X(tR),y+2,Math.max(2,X(tR+0.0002)-X(tR)),h*0.5); if (tR>tA){ c.strokeStyle=css('--bad'); c.beginPath(); c.moveTo(X(tA),y+6); c.lineTo(X(tR),y+6); c.stroke(); } });
  }});
  ls.push({label:'SHARC SampleIRQ 48 kHz', h:20, draw(c,X,t0,t1,y,h){ if (!D.seated) return; SIM.pulses(c,X,t0,t1,y,h,1/FS,0,1/FS*0.25,css('--accent'),'SampleIRQ (TDM 20 ch in/out)'); }});
  ls.push({label:'SHARC gains: program · DV · mixdown', h:34, draw(c,X,t0,t1,y,h){
    const N=Math.min(600,Math.max(80,(X(t1)-X(t0))/2)); const cols=[css('--accent'),css('--warn'),css('--accent2')];
    [0,1,2].forEach(i=>{ c.strokeStyle=cols[i]; c.lineWidth=1.5; c.beginPath(); for (let j=0;j<=N;j++){ const tt=t0+(t1-t0)*j/N; const g=dB(gainAt(i,tt)); const yy=y+h/2-clamp(g,-15,15)/15*(h/2-3); j?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    c.fillStyle=css('--ink2'); txt(c,'±15 dB', X(t1)-50, y+10);
  }});
  [[0,'AES1 out (L/R)'],[6,'AES4 out (DV / PGM mono)'],[8,'AES5 out (Lt/Rt or AES1)']].forEach(([k,lbl])=>{
    ls.push({label:lbl, h:36, draw(c,X,t0,t1,y,h){
      const pw=X(t1)-X(t0), span=t1-t0, cols=[css('--accent'),css('--bad')];
      if (span*FS > pw*1.5){ const M=Math.min(200,Math.ceil(pw/2)); c.globalAlpha=.45;
        for (let j=0;j<M;j++){ const ta=t0+span*j/M, tb=ta+span/M; let p0=0,p1=0; for (let q=0;q<16;q++){ const n=Math.floor((ta+(tb-ta)*q/16)*FS); const o=sampleIRQ(n,n/FS).out; p0=Math.max(p0,Math.abs(o[k])); p1=Math.max(p1,Math.abs(o[k+1])); }
          c.fillStyle=cols[0]; c.fillRect(X(ta), y+h/2-p0*(h/2-3), pw/M+0.6, p0*(h/2-3)); c.fillStyle=cols[1]; c.fillRect(X(ta), y+h/2, pw/M+0.6, p1*(h/2-3)); }
        c.globalAlpha=1; }
      else [k,k+1].forEach((kk,sd)=>{ c.strokeStyle=cols[sd]; c.lineWidth=1;
        c.beginPath(); const n0=Math.floor(t0*FS), n1=Math.ceil(t1*FS); for (let n=n0;n<=n1;n++){ const v=sampleIRQ(n,n/FS).out[kk]; const yy=y+h/2-v*(h/2-3)*4; n===n0?c.moveTo(X(n/FS),yy):c.lineTo(X(n/FS),yy); c.lineTo(X((n+1)/FS),yy); } c.stroke(); });
      if (span*FS <= pw*1.5){ c.fillStyle=css('--ink2'); txt(c,'×4 vertical', X(t1)-70, y+10); }
    }});
  });
  ls.push({label:'Card-edge LEDs: SD HD ERR A1–4 META', h:30, draw(c,X,t0,t1,y,h){
    const N=Math.min(400,Math.max(60,(X(t1)-X(t0))/3)); const span=t1-t0; const ks=['sd','hd','err','a1','a2','a3','a4','meta'];
    for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, L=ledsAt(tt); ks.forEach((k,r)=>{ if (L[k]){ c.fillStyle=css(k==='err'?'--bad':k[0]==='a'?'--warn':'--accent'); c.fillRect(X(t0+span*i/N), y+2+r*3.4, (X(t1)-X(t0))/N+0.5, 2.8); } }); }
  }});
  return ls;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function stateHTML(t){
  const st=stepAt(t), p=st.pass, R=regsOut(), S=regsStatus(t), x=sched().xchg.filter(e=>e.t1<=t).length;
  const sm=sampleIRQ(Math.floor(t*FS),t);
  return kv([
    ['Variant', VAR(D.variant).name],
    ['Main-loop pass', p.kind==='boot'?'— rebooting (main() init)': p.kind==='spin2'?'<b style="color:var(--bad)">spinning in while(error0) CLI() — watchdog running out</b>' : `#${p.i} · ${st.step>=0?STEPS[st.step][0]:''}${st.xbyte!=null?` · byte ${st.xbyte}/440 (${st.xbyte<24?'Reg 1–6 to SHARC':st.xbyte<40?'Reg 7–10 status':'metadata'})`:''}${st.spinning?' <b style="color:var(--bad)">SPIN</b>':''}`],
    ['Interrupts', cliAt(t)? '<b style="color:var(--warn)">off (CLI) — timer0 and CAN wait</b>' : 'on'],
    ['Exchanges so far', `${x} in this second${D.fault!==null?' · error_checker '+(sched().xchg.filter(e=>e.t1<=t&&e.bad).slice(-1)[0]||{errc:'990'}).errc+'/'+ERR_LIMIT:''}`],
    ['ALTERA_BUFFER_out[0..11]', R.map((b,i)=>`<span class="${i<4?'hl':''}" title="byte ${i}">${hx(b)}</span>`).join(' '), 1],
    ['Reg 7 · 8 · 9 · 10', `${hx(S.r7,8)} · ${hx(S.r8,8)} · ${hx(S.r9,8)} · ${hx(S.r10,8)}`, 1],
    ['Groups', `present ${[0,1,2,3].filter(g=>groupsPresent()>>g&1).map(g=>g+1).join(',')||'—'} · enabled (SW1/SW2) ${groupsEnabled()+1}`],
    ['SHARC sees', `meta ${valAt('meta',t)?'yes':'no'} · GPI1 ${valAt('gpi1',t)?'closed':'open'} · gains ${[0,1,2].map(i=>fdb(dB(gainAt(i,t)))).join(' / ')} dB`],
    ['sample.c branch', sm.why||'—'],
    ['LED shift byte', '0x'+hx(ledByte(ledsAt(t)))+' → 74HC4094 Q1…Q8 = HD ERR A1 A2 A3 A4 AES1 AES2'],
  ]);
}
function viewSim(m){
  window.__m6205Active=true;
  m.innerHTML = M65_CSS + `
  ${card('Card, rear module and DashBoard at the playhead', `<div id="cardv"></div>${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Card edge and T6307 rear', `<div style="display:flex;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:150px" id="edgev"></div><div style="flex:1;min-width:150px" id="rearv"></div></div>`)}
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('DashBoard', `<div id="dashv"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Main-loop pass length (0.4 ms) is ${inf}. The exchange length is counted from altera.lis (≈20 cycles per bit, 440 bytes, 8 MHz ≈ 10.45 ms). The vertical-edge phase in the window is arbitrary.</p>`)}
  <div class="grid2">${card('Output meters (from sample.c)', `<div id="mtr"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#cardv').innerHTML=cardSVG(t); bindHW(m.querySelector('#cardv'));
    m.querySelector('#edgev').innerHTML=edgeSVG(t);
    m.querySelector('#rearv').innerHTML=rearSVG(t); bindHW(m.querySelector('#rearv'));
    m.querySelector('#dashv').innerHTML=dashHTML(t); bindDash(m.querySelector('#dashv'));
    m.querySelector('#insp').innerHTML=stateHTML(t);
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#mtr').innerHTML=meterHTML(t);
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (manual install steps + C200 DIP/GPI sheet + switching rules) ---------------- */
const LESSONS = [
  {title:'Meet the M6205', body:`<p>The M6205 is an <b>openGear</b> card. It takes an SDI video signal, pulls out (<b>de-embeds</b>) the audio carried inside it, processes the audio, and puts it back (<b>re-embeds</b>) into two SDI outputs.</p><p>This is the CTV <b>C200</b> build. It makes a described-video (<b>DV</b>) feed on AES4 and a stereo <b>mixdown</b> on AES5. Three processors share the work: an AT90CAN128 for control, an EP2C35 FPGA for video and audio, and an ADSP-21262 SHARC for the audio maths.</p><p class="muted">The card has no front panel. You see its LEDs through the frame door and set it up with DIP switch SW1 and DashBoard.</p>`, check:()=>true, auto:true},
  {title:'1 · Install the card', body:`<p>The manual's order is: fit the rear module (a <b>T6307</b> for C200) in the back of the frame, then slide the card into the matching front slot.</p><p><b>Goal:</b> the card is seated in the frame.</p>`, check:()=>D.seated, hint:'Click “Insert card”.'},
  {title:'2 · Feed it SDI', body:`<p>Connect an HD source to <b>SDI IN</b> (rear position 1). The <b>HD</b> and <b>SD</b> LEDs light together: in HD the firmware turns both on. <b>ERR</b> goes out.</p><p><b>Goal:</b> SDI connected, format HD 1080i/59.94.</p>`, check:()=>D.sdi.on && D.sdi.fmt==='1080i59', hint:'Click the SDI IN BNC on the rear module and pick HD 1080i/59.94.'},
  {title:'3 · Choose how many audio groups', body:`<p>SW1-1 and SW1-2 set how many embedded groups are processed (1 to 4). The C200 sheet makes <b>2 groups</b> the default: SW1-1 OFF, SW1-2 ON. The <b>AUDIO 1–4</b> LEDs show which groups are present in the incoming signal.</p><p><b>Goal:</b> 3 groups enabled, so the stereo pair on AES5 is de-embedded too.</p>`, check:()=>groupsEnabled()===2, hint:'Turn SW1-1 ON and SW1-2 OFF (click the red switches on the card).'},
  {title:'4 · Read the card in DashBoard', body:`<p>In DashBoard, open the card and look at <b>Card Info</b> (product M6205A-C200, software 3.01) and <b>Input Signal</b> (SDI format, the lock state of each embedded AES pair, and the metadata line).</p><p><b>Goal:</b> open the Input Signal page.</p>`, check:()=>D.dash.tab==='input', hint:'Click “Input Signal” in the DashBoard window.'},
  {title:'5 · No metadata: what passes', body:`<p>With a 5.1 source and <b>no VANC metadata</b>, look at the meters. The switching-rules document says every output passes. The shipped SHARC code does something else: <b>AES2 and AES3 are muted</b> and AES5 copies AES1.</p><p><b>Goal:</b> source Input 4 (5.1 + DV + stereo), metadata off.</p>`, check:()=>D.layout===3 && !D.meta.on, hint:'Choose “Input 4” as the source and switch metadata OFF.'},
  {title:'6 · Make a DV feed with GPI1', body:`<p>When the station has no described video, a contact closure on <b>GPI/O1</b> tells the card to put a <b>mono</b> mix of the programme on AES4 left. AES4 right always carries the programme mono.</p><p>The change reaches the SHARC only at the end of the next control exchange, about one video field later. The timeline shows it.</p><p><b>Goal:</b> GPI/O1 closed.</p>`, check:()=>D.gpi1, hint:'Click the GPI/O1 terminal on the rear (or press G).'},
  {title:'7 · Feed metadata', body:`<p>Turn on Dolby metadata in VANC (SMPTE 2020): a 3/2 programme with a dialnorm of −24. The <b>META DATA</b> LED lights. AES2 and AES3 now pass, and AES5 becomes an <b>Lt/Rt mixdown</b> scaled by the dialnorm gain (−7 dB).</p><p><b>Goal:</b> metadata ON with acmod 3/2.</p>`, check:()=>D.meta.on && D.meta.acmod===7, hint:'Click “VANC metadata OFF” to turn it on; keep acmod 3/2.'},
  {title:'8 · Trim the mixdown', body:`<p>Open <b>Gain Processing</b>. Three sliders (Program, DV, MixDown) run from −15 to +15 dB. The SHARC ramps to each new gain with a time constant of about 10 ms, so the change makes no click. Zoom the timeline to 100 ms to see the curve.</p><p><b>Goal:</b> MixDown at −3 dB.</p>`, check:()=>D.gain[2]===-3, hint:'Gain Processing → MixDown slider to −3.'},
  {title:'9 · Dolby E on AES2', body:`<p>Input 5 carries <b>Dolby E</b> on AES2. The FPGA flags it as non-PCM, and DashBoard shows “Locked-Dolby E”. The C200 sheet says SW1-3 chooses whether Dolby E passes or is muted.</p><p><b>Goal:</b> source Input 5 and SW1-3 ON (pass).</p>`, check:()=>D.layout===4 && D.dip[2], hint:'Pick “Input 5” and switch SW1-3 ON.'},
  {title:'10 · Lock DashBoard', body:`<p><b>SW1-8 ON</b> makes the card status-only in DashBoard. The firmware reads SW8 <b>only at power-up</b>, so nothing changes until you reboot the card.</p><p><b>Goal:</b> SW1-8 ON and the card rebooted (sliders greyed out).</p>`, check:()=>D.dip[7] && !dashboardEnabled(), hint:'Switch SW1-8 ON, then click “Reboot card”.'},
  {title:'Done', body:`<p>You've used every control on the C200. <b>Software</b> traces the path from a DashBoard slider to a SHARC multiply. <b>One second</b> shows why each control change waits for a 10 ms bit-banged exchange. <b>Findings</b> lists where the code and the documents disagree.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__m6205Active=true;
  m.innerHTML = M65_CSS + `<div class="grid2"><div>${card('Tutorial — setting up an M6205A-C200', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
   <div>${card('The card', `<div id="cardv"></div>${controlsHTML()}`)}<div class="grid2">${card('Rear', `<div id="rearv"></div>`)}${card('Edge', `<div id="edgev"></div>`)}</div>${card('DashBoard', `<div id="dashv"></div>`)}${card('Meters', `<div id="mtr"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#cardv').innerHTML=cardSVG(t,{labels:false}); bindHW(m.querySelector('#cardv'));
    m.querySelector('#rearv').innerHTML=rearSVG(t); bindHW(m.querySelector('#rearv'));
    m.querySelector('#edgev').innerHTML=edgeSVG(t);
    m.querySelector('#dashv').innerHTML=dashHTML(t); bindDash(m.querySelector('#dashv'));
    m.querySelector('#mtr').innerHTML=meterHTML(t);
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.seated=false; lessonIdx=0; SIM.refresh(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, broken down ---------------- */
function viewSecond(m){
  window.__m6205Active=true;
  const f=fmt(), Tl=lineT(f), nx=sched().xchg.length, lostT=sched().lost.reduce((a,l)=>a+l.n,0);
  m.innerHTML = M65_CSS + `${card('Zoom ladder at the playhead: second → field → exchange → byte → bit, and second → sample', `<canvas id="zl"></canvas>`)}
  <div class="grid2">${card('One second in numbers ('+f.name+')', tbl(['What','Per second','Each','Source'],[
     ['Video '+(f.prog?'frames':'fields'), (1/f.field).toFixed(3), SIM.fmtDur(f.field), 'format'],
     ['SDI lines', Math.round(1/Tl).toLocaleString(), SIM.fmtDur(Tl), f.lines+' lines per frame'],
     ['HANC audio packets per group', f.hd?'48 000':Math.round(1/Tl).toLocaleString(), f.hd?'1 sample':'≈'+(FS*Tl).toFixed(2)+' samples', f.hd?'SMPTE 299M':'SMPTE 272M'],
     ['SHARC SampleIRQ', '48 000', SIM.fmtDur(1/FS), 'sample.c (TDM frame sync on DAI pin 8)'],
     ['Control exchanges (Atmel ↔ FPGA ↔ SHARC)', locked()? nx : nx+' (no vertical: every 1500 passes)', SIM.fmtDur(XCHG_T)+' each', 'altera.c + altera.lis'],
     ['…of which interrupts off', (nx*XCHG_T*100).toFixed(1)+' % of the second', '', 'CLI() … SEI() in ALTERA_read_write'],
     ['Control bits per exchange', '3 520', SIM.fmtDur(BIT_T)+' per bit', '440 × 8, 0–191 Atmel, 192–319 status, 320+ metadata'],
     ['timer0 ticks lost', lostT, '1 ms nominal', 'one pending overflow survives each CLI window'],
     ['CAN bit', '1 000 000', '1 µs', 'CANBT1/2/3 = 0x00/0x04/0x12'],
     ['Gain ramp time constant', '', '≈'+SIM.fmtDur(1/RAMP_TC/FS), 'RAMP_TC_LEVEL1 = 0.002 per sample'],
  ]))}${card('As the operator and the plant see it', `<div id="edgev"></div><div id="mtr"></div>`)}</div>
  ${card('This exchange, byte by byte (control TDM frame map from cntrl_tdm_if.vhd)', `<canvas id="xm"></canvas><div id="xinfo" class="small mono"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#edgev').innerHTML=edgeSVG(t); m.querySelector('#mtr').innerHTML=meterHTML(t);
    drawLadder(m.querySelector('#zl'), t); drawXmap(m.querySelector('#xm'), m.querySelector('#xinfo'), t); };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const {c,w}=SIM.canvas(cv,230); const f=fmt(); const ink=css('--ink'), ink2=css('--ink2');
  const x=sched().xchg.find(e=>t<e.t1) || sched().xchg.slice(-1)[0] || {t0:0,t1:XCHG_T};
  const fi=Math.max(0,Math.floor((t-0.0012)/f.field)); const fa=0.0012+fi*f.field;
  const by=clamp(Math.floor((t-x.t0)/BYTE_T),0,439), ba=x.t0+by*BYTE_T;
  const rows=[['1 second',0,1,'#'],[`field ${fi+1}`,fa,fa+f.field],[`exchange ${SIM.fmtDur(XCHG_T)}`,x.t0,x.t1],[`byte ${by}`,ba,ba+BYTE_T],['bit',ba+Math.floor(clamp((t-ba)/BIT_T,0,7))*BIT_T,ba+Math.floor(clamp((t-ba)/BIT_T,0,7))*BIT_T+BIT_T],['audio sample',Math.floor(t*FS)/FS,(Math.floor(t*FS)+1)/FS]];
  rows.forEach(([nm,a,b],i)=>{ const y=10+i*36; c.fillStyle=css('--lane'); c.fillRect(150,y,w-160,24); c.fillStyle=ink; c.font='12px '+css('--sans'); c.fillText(nm,6,y+16);
    const X=v=>150+(v-a)/(b-a)*(w-160); c.fillStyle=css(i===2||i===3||i===4?'--accent2':i===5?'--accent':'--warn'); c.globalAlpha=.3; c.fillRect(150,y,w-160,24); c.globalAlpha=1;
    if (i===0){ sched().xchg.forEach(e=>{ c.fillStyle=css('--accent2'); c.fillRect(X(e.t0),y+3,Math.max(1,X(e.t1)-X(e.t0)),18); }); }
    if (i===1 && x.t0>=a-1e-9 && x.t0<b){ c.fillStyle=css('--accent2'); c.fillRect(X(x.t0),y+3,X(Math.min(b,x.t1))-X(x.t0),18); }
    if (i===2){ [[0,24,'--accent'],[24,40,'--warn'],[40,440,'--accent2']].forEach(([p,q,col])=>{ c.fillStyle=css(col); c.fillRect(X(x.t0+p*BYTE_T),y+3,X(x.t0+q*BYTE_T)-X(x.t0+p*BYTE_T),18); }); }
    c.fillStyle=css('--play'); const px=X(t); if (px>=150&&px<=w-10) c.fillRect(px-1,y-2,2,28);
    c.fillStyle=ink2; c.font='11px '+css('--mono'); c.fillText(SIM.fmtDur(b-a), w-80, y+16); });
}
function drawXmap(cv, info, t){
  const {c,w}=SIM.canvas(cv,90); const R=regsOut(), S=regsStatus(t);
  const bytes=[]; for (let i=0;i<12;i++) bytes.push(R[i]); for (let i=12;i<24;i++) bytes.push(i%8<4? [0x53,0x59,0x4E,0x43][i%4] : 0);
  [S.r7,S.r8,S.r9,S.r10].forEach(r=>{ bytes.push(r>>>24&255, r>>>16&255, r>>>8&255, r&255); });
  const cw=(w-20)/40;
  for (let i=0;i<40;i++){ c.fillStyle=css(i<4?'--warn':i<24?'--accent':'--accent2'); c.globalAlpha=.3; c.fillRect(10+i*cw,10,cw-1,40); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(hx(bytes[i]),12+i*cw,34); }
  c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText('bytes 0–23: Atmel ALTERA_BUFFER_out → passed straight to the SHARC (counter < 192)', 10, 66); c.fillText('bytes 24–39: FPGA Reg 7–10 shifted in by cntrl_tdm_if (192 ≤ counter ≤ 319) · bytes 40–439: metadata FIFO (counter > 319)', 10, 82);
  info.innerHTML = `The SHARC sees this frame on SPORT5 and sends its echo on SPORT4 (altera_data_out[0..9] = altera_data_in[0..9], then parsed metadata in Reg 11–110). The Atmel reads that echo during the <i>next</i> exchange, so the Atmel's view of status is always one exchange late.`;
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  sdi:{x:10,y:40,w:120,h:60,t:'SDI IN (T6307 #1)',d:'75 Ω BNC. SMPTE 259M / 292M. Rear module T6307 (M6205-T6307.pdf).'},
  eq:{x:150,y:40,w:120,h:60,t:'GS1574A EQ',d:'U1 adaptive cable equaliser (pnp). Feeds the deserializer.'},
  des:{x:290,y:40,w:130,h:60,t:'GS1559 deser.',d:'U7. 20-bit Y/C parallel into the FPGA (Yin/Cin, qsf). Lock → PINB.7 (smpte).'},
  fpga:{x:440,y:30,w:200,h:200,t:'EP2C35 FPGA',d:'U3 Cyclone II EP2C35F484C6. sd656_decoder / hd274_296_decoder, SD and HD demux (PugMedia vc_272m/vc_299m cores), audio_group_detector, non_audio_detector (Dolby), meta_data_detector (VANC), TDM to and from the SHARC, cntrl_tdm_if, HD/SD mux back into the video.'},
  sharc:{x:440,y:270,w:200,h:90,t:'ADSP-21262 SHARC',d:'U6. SampleIRQ at 48 kHz over 20-slot TDM (SPORT0–3), control frame on SPORT4/5. sample.c does the C200 routing, DV mono and Lt/Rt / Lo/Ro mixdown; backgnd.c parses metadata and ramps gains. Boots from U5 AT25F512A.'},
  avr:{x:150,y:270,w:180,h:90,t:'AT90CAN128',d:'U11, 8 MHz. Super-loop in v100w.c. Bit-bangs the 440-byte control exchange (PF3 FSYNCH, PB4 SCLK, PB5 out, PB6 in), reads DIP SW1 on PINA, drives LEDs through U22 74HC4094, talks CAN to the frame.'},
  can:{x:10,y:270,w:120,h:90,t:'CAN · frame',d:'U10 SN65HVD233 transceiver, 1 Mbit/s. DashBoard via the openGear frame controller. PD7 = LBK (loopback during boot).'},
  ser:{x:670,y:40,w:120,h:60,t:'GS1531 ser.',d:'U13 serializer with U14/U9 GO1525 VCOs, then U16 GS1528 cable driver.'},
  sdo:{x:810,y:40,w:110,h:60,t:'SDI OUT 1/2',d:'Rear positions 9 and 10: SDI with the processed audio re-embedded.'},
  aes:{x:670,y:150,w:250,h:60,t:'AES outputs',d:'FPGA aes1_bnc3…aes4_bnc6, aes_out1/2. On the T6307 only AES OUT1 (L/R), BNC4 (C/LFE) and AES OUT2 (Ls/Rs) exist; AES4 (DV) and AES5 (mixdown) leave only embedded in the SDI.'},
  ain:{x:670,y:270,w:250,h:60,t:'AES IN · CS8416 ×2 + AD1895 SRC',d:'U18/U19 receivers, U17/U20 sample-rate converters. In the C200 build EXTERNAL_AES_INPUTS is not defined: the receivers are held in reset (CS8416_RS1/RS2_LOW) and AES IN1 does nothing.'},
  clk:{x:670,y:350,w:250,h:50,t:'Clocks: ICS662 + PLL1705',d:'U21 ICS662-03 makes audio clocks from 27 MHz video clock; U4 PLL1705. SW1-4 picks HD audio clock (Reg 2 bit 19).'},
  dec:{x:150,y:390,w:490,h:50,t:'P3 Dolby decoder header (DABC, DAFS, DADA… CAT552)',d:'Long header for the Dolby decoder daughter board (CE300/CE400 builds). Not fitted for C200; Reg 110 bit 17 would swap its outputs into TDM 9–16.'},
};
const BWIRES=[['sdi','eq'],['eq','des'],['des','fpga'],['fpga','ser'],['ser','sdo'],['fpga','aes'],['ain','fpga'],['fpga','sharc'],['avr','fpga'],['can','avr'],['clk','fpga'],['dec','fpga']];
function viewBlock(m){
  window.__m6205Active=false; let sel='fpga';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('In one sentence', `<p>SDI comes in, the FPGA lifts the embedded audio onto a 20-slot TDM bus, the SHARC re-routes and mixes it at 48 kHz, and the FPGA puts it back into two SDI outputs. The Atmel only sets things up and reports, once per video field.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 930 450" style="width:100%;display:block">`;
    BWIRES.forEach(([a,b])=>{ const [x1,y1]=ctr(BLOCKS[a]), [x2,y2]=ctr(BLOCKS[b]); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="2"/>`; });
    Object.entries(BLOCKS).forEach(([k,b])=>{ s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${k===sel?'color-mix(in srgb,var(--accent) 35%,var(--panel))':'var(--panel)'}" stroke="var(--line)" stroke-width="2"/><text x="${b.x+b.w/2}" y="${b.y+b.h/2+4}" text-anchor="middle" font-size="12" fill="var(--ink)">${b.t}</text></g>`; });
    s+=`<text x="540" y="258" text-anchor="middle" font-size="10" fill="var(--ink2)">TDM 20 ch ⇅ · control frame ⇅</text><text x="380" y="262" font-size="10" fill="var(--ink2)">440 B bit-bang</text></svg>`;
    m.querySelector('#bd').innerHTML=s; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BLOCKS[sel].t}</h3><p>${BLOCKS[sel].d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
const AVR_PINS = [ // [pin, port, net (M6205A-iss4.net), firmware name]
  [2,'PE0','NCE','EPCS / FPGA config (AVR can program U12)'],[3,'PE1','NCS',''],[4,'PE2','DCLK',''],[5,'PE3','CNF_DATA',''],[6,'PE4','ASDI',''],
  [7,'PE5','CLK_4094','SHIFT_CLOCK'],[8,'PE6','DATA_4094','SHIFT_DATA'],[9,'PE7','ST_4094','SHIFT_STROBE'],
  [10,'PB0','MSFS','metadata serial (P3 / FPGA)'],[11,'PB1','MSBC',''],[12,'PB2','MSD',''],[13,'PB3','SHARC_RESET','sharc_reset'],
  [14,'PB4','ALTERA9','ALTERA_CLOCK (control SCLK)'],[15,'PB5','ALTERA10','ALTERA_WRITE (to FPGA)'],[16,'PB6','ALTERA11','ALTERA_DATA_READ'],[17,'PB7','ALTERA12','smpte (GS1559 lock)'],
  [18,'PG3','LED10','METADATA_LED'],[19,'PG4','CONF_DONE',''],[25,'PD0','LED9','SD_LED'],[26,'PD1','CS8416_RESET',''],[27,'PD2','CS8416_IN',''],[28,'PD3','CS8416_CLK',''],[29,'PD4','CS8416_OUT',''],
  [30,'PD5','CAND','TXCAN'],[31,'PD6','CANR','RXCAN'],[32,'PD7','LBK','CAN_TX / CAN_RX (loopback)'],[33,'PG0','CS8416_SEL2',''],[34,'PG1','CS8416_SEL1',''],
  [35,'PC0','ALTERA0','vertical (PINC & BIT0)'],[36,'PC1','ALTERA1',''],[37,'PC2','ALTERA2',''],[38,'PC3','ALTERA3','SD_RESET'],[39,'PC4','SW1_4','(4-way DIP, unused by C200)'],[42,'PC7','SW1_1',''],
  [43,'PG2','ALTERA_RESET','altera_reset'],[44,'PA7','SW2_8','dip bit 7 — DashBoard disable'],[51,'PA0','SW2_1','dip bit 0 — group MSB'],[58,'PF3','ALTERA8','ALTERA_FSYNCH'],[61,'PF0','AN_SLOTID','ADC slot ID (ADDRESS_TABLE)'],
];
const SHEETS = [
  {name:'1 · AT90CAN128 (U11) pin map', note:'Nets from PCB/OBSOLETE/ISSUE4/M6205A-iss4.net; names on the right are the firmware macros (altera.h, M6205.h, sharc.h, gennum.h). Redrawn, not the original CAD.', svg:()=>{
    let s=`<svg viewBox="0 0 900 ${40+AVR_PINS.length*17}" style="width:100%;display:block"><rect x="330" y="10" width="120" height="${AVR_PINS.length*17+10}" fill="var(--panel)" stroke="var(--ink)"/><text x="390" y="30" text-anchor="middle" font-size="13" fill="var(--ink)">U11</text><text x="390" y="46" text-anchor="middle" font-size="11" fill="var(--ink2)">AT90CAN128</text>`;
    AVR_PINS.forEach(([p,port,net,fw],i)=>{ const y=60+i*17-26; s+=`<line x1="450" y1="${y}" x2="520" y2="${y}" stroke="var(--ink2)"/><text x="445" y="${y+4}" text-anchor="end" font-size="10" fill="var(--ink)">${port}</text><text x="345" y="${y+4}" font-size="9" fill="var(--ink2)">${p}</text><text x="525" y="${y+4}" font-size="10.5" fill="var(--accent)" font-family="monospace">${net}</text><text x="650" y="${y+4}" font-size="10" fill="var(--ink2)">${fw}</text>`; });
    return s+'</svg>'; }},
  {name:'2 · LEDs: 74HC4094 (U22) and direct ports', note:'U22 outputs and resistor nets from the netlist; legends from the TSS silk. The firmware bit order in “input” matches Q1…Q8.', svg:()=>{
    const q=[['Q1 (4)','LED1','R129','HD','bit0 HD_LED'],['Q2 (5)','LED2','R130','ERR','bit1 ERROR_LED'],['Q3 (6)','LED3','R135','AUDIO 1','bit2 AES1_LED'],['Q4 (7)','LED4','R40','AUDIO 2','bit3'],['Q5 (14)','LED5','R39','AUDIO 3','bit4'],['Q6 (13)','LED6','R131','AUDIO 4','bit5'],['Q7 (12)','LED7','R134','AES 1','bit6 AES_LED1'],['Q8 (11)','LED8','R133','AES 2','bit7 AES_LED2']];
    let s=`<svg viewBox="0 0 900 260" style="width:100%;display:block"><rect x="200" y="20" width="110" height="200" fill="var(--panel)" stroke="var(--ink)"/><text x="255" y="40" text-anchor="middle" font-size="12" fill="var(--ink)">U22 74HC4094</text>
      ${[['CLK (3)','PE5'],['D (2)','PE6'],['STR (1)','PE7']].map(([a,b],i)=>`<line x1="120" y1="${70+i*30}" x2="200" y2="${70+i*30}" stroke="var(--ink2)"/><text x="205" y="${74+i*30}" font-size="10" fill="var(--ink)">${a}</text><text x="20" y="${74+i*30}" font-size="10.5" fill="var(--accent)">U11 ${b}</text>`).join('')}`;
    q.forEach(([o,net,r,l,b],i)=>{ const y=50+i*22; s+=`<line x1="310" y1="${y}" x2="420" y2="${y}" stroke="var(--ink2)"/><text x="306" y="${y+4}" text-anchor="end" font-size="9" fill="var(--ink)">${o}</text><rect x="420" y="${y-5}" width="30" height="10" fill="none" stroke="var(--ink)"/><text x="455" y="${y+4}" font-size="9" fill="var(--ink2)">${r}</text><path d="M500 ${y-5} l10 5 l-10 5 z" fill="var(--warn)"/><text x="520" y="${y+4}" font-size="11" fill="var(--ink)">${l}</text><text x="620" y="${y+4}" font-size="10" fill="var(--accent)" font-family="monospace">${b}</text>`; });
    return s+`<text x="20" y="245" font-size="11" fill="var(--ink2)">Direct: SD LED ← PD0 (net LED9, R127) · META DATA LED ← PG3 (net LED10) · SHIFT_OUT() sends “input” MSB first.</text></svg>`; }},
  {name:'3 · EP2C35 (U3) key pins', note:'From altera/v102/m6205c.qsf. Redrawn.', svg:()=>{
    const P=[['Yin[9..0]','D21…A18','GS1559 luma'],['Cin[9..0]','B17…A13','GS1559 chroma'],['Yout/Cout','AB19…/U22…','GS1531'],['altera8','A4','Atmel FSYNCH'],['altera9','B4','Atmel SCLK'],['altera10','A3','Atmel data in'],['altera11','B3','data to Atmel'],['altera12','C1','SDI lock'],['cntrl_tdm_FS/sclk/din/dout','Y2/Y1/W2/W1','SHARC SPORT4/5 (DAI 1–4)'],['DAI_P8_FSYNCH / P9_SCLK','U1 / P4','SHARC TDM frame sync / clock'],['DAI_P10/P11_SDATA','P3 / J3','TDM to SHARC (ch 1–10, 11–20)'],['DAI_P17/P18_DATA_IN','E4 / E3','TDM from SHARC'],['aes1_bnc3…aes4_bnc6','G22 H22 G21 H21','AES outputs'],['aes_in1/2','J21 / J20','CS8416 path'],['GPI1 / GPI2','K18 / J18','→ Reg 8 bits 25/24'],['GPO1 / GPO2','K17 / J19','Reg 110 bits 25/24'],['META_FS/BC/SUB, meta_in','AB4 AA5 AA4 AB5','metadata serial'],['DA*/EA*/PRG*/MAP*','AB3…W4','Dolby decoder header P3'],['clock662_27, sel662_0..3','B5, A7…B6','ICS662 audio clock'],['pll1705_27 / mclk','AA17 / AB17','PLL1705']];
    let s=`<svg viewBox="0 0 900 ${40+P.length*19}" style="width:100%;display:block"><rect x="330" y="10" width="140" height="${P.length*19+16}" fill="var(--panel)" stroke="var(--ink)"/><text x="400" y="30" text-anchor="middle" font-size="12" fill="var(--ink)">U3 EP2C35F484C6</text>`;
    P.forEach(([n,pin,to],i)=>{ const y=50+i*19; s+=`<line x1="470" y1="${y}" x2="540" y2="${y}" stroke="var(--ink2)"/><text x="465" y="${y+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${pin}</text><text x="545" y="${y+4}" font-size="10.5" fill="var(--accent)" font-family="monospace">${n}</text><text x="760" y="${y+4}" font-size="10" fill="var(--ink2)">${to}</text>`; });
    return s+'</svg>'; }},
  {name:'4 · Control path Atmel → FPGA → SHARC → Atmel', note:'cntrl_tdm_if.vhd (fsout/sclkout/dataout to the SHARC, dataout2 back to the Atmel) and configdai.c (SPORT4/5 on DAI pins 1–4). Redrawn.', svg:()=>`<svg viewBox="0 0 900 220" style="width:100%;display:block">
    <rect x="20" y="60" width="160" height="90" fill="var(--panel)" stroke="var(--ink)"/><text x="100" y="85" text-anchor="middle" font-size="12" fill="var(--ink)">AT90CAN128</text><text x="100" y="105" text-anchor="middle" font-size="10" fill="var(--ink2)">ALTERA_read_write()</text><text x="100" y="122" text-anchor="middle" font-size="10" fill="var(--ink2)">CLI · 440 × 8 bits</text>
    <rect x="330" y="30" width="240" height="160" fill="var(--panel)" stroke="var(--ink)"/><text x="450" y="52" text-anchor="middle" font-size="12" fill="var(--ink)">cntrl_tdm_if (FPGA)</text>
    <text x="345" y="80" font-size="10" fill="var(--ink2)">counter &lt; 192: dataout ← datain (Atmel)</text><text x="345" y="100" font-size="10" fill="var(--ink2)">192…319: dataout ← p1..p4 (Reg 7–10)</text><text x="345" y="120" font-size="10" fill="var(--ink2)">&gt; 319: dataout ← metadata FIFO byte</text><text x="345" y="140" font-size="10" fill="var(--ink2)">sclkout ← sclkin · dataout2 ← datain2</text><text x="345" y="160" font-size="10" fill="var(--ink2)">fifo_read_en after bit 319</text>
    <rect x="720" y="60" width="160" height="90" fill="var(--panel)" stroke="var(--ink)"/><text x="800" y="85" text-anchor="middle" font-size="12" fill="var(--ink)">ADSP-21262</text><text x="800" y="105" text-anchor="middle" font-size="10" fill="var(--ink2)">SPORT5 rx · SPORT4 tx</text><text x="800" y="122" text-anchor="middle" font-size="10" fill="var(--ink2)">NCH109: 110 × 32 bit</text>
    ${[['PF3 FSYNCH → altera8 → fsin',75],['PB4 SCLK → altera9 → sclkin',95],['PB5 → altera10 → datain',115]].map(([l,y])=>`<line x1="180" y1="${y}" x2="330" y2="${y}" stroke="var(--accent)" stroke-width="2"/><text x="185" y="${y-3}" font-size="9" fill="var(--ink)">${l}</text>`).join('')}
    <line x1="180" y1="140" x2="330" y2="140" stroke="var(--accent2)" stroke-width="2"/><text x="185" y="137" font-size="9" fill="var(--ink)">PB6 ← altera11 ← dataout2</text>
    ${[['fsout → DAI pin 1 (SPORT4/5 FS)',75],['sclkout → DAI pin 2 (CLK)',95],['dataout → DAI pin 3 (SPORT5 DA)',115]].map(([l,y])=>`<line x1="570" y1="${y}" x2="720" y2="${y}" stroke="var(--accent)" stroke-width="2"/><text x="575" y="${y-3}" font-size="9" fill="var(--ink)">${l}</text>`).join('')}
    <line x1="570" y1="140" x2="720" y2="140" stroke="var(--accent2)" stroke-width="2"/><text x="575" y="137" font-size="9" fill="var(--ink)">datain2 ← DAI pin 4 (SPORT4 DA)</text>
    <text x="20" y="210" font-size="11" fill="var(--ink2)">The SHARC's control port has no clock of its own: it runs only while the Atmel bit-bangs, about once per video field.</text></svg>`},
  {name:'5 · T6307 rear module pinout', note:'From M6205-T6307.pdf (“EMBEDDED AUDIO PROCESSOR · SINGLE CARD TERMINATION · MF6220 FRAME”). Redrawn.', svg:()=>`<svg viewBox="0 0 900 360" style="width:100%;display:block"><g transform="translate(330,0)">${rearSVGDrawn(SIM.t).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g></svg>`},
];
function viewSchem(m){
  window.__m6205Active=false; let k=0;
  m.innerHTML=card('Schematic set (redrawn from netlists, .qsf, VHDL and drawings — not the original CAD)', `<div id="sb" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px"></div><div id="sv" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">The original issue-4 schematic is in PCB/SCH/M6205A-iss4P1–P12.pdf and the P-CAD .sch; issue-6 (3G) drawings are 8399AR-500-02-SCH-DR1.</p>`);
  const draw=()=>{ m.querySelector('#sb').innerHTML=SHEETS.map((s,i)=>`<button data-k="${i}" class="${i===k?'on':''}">${s.name}</button>`).join(''); m.querySelectorAll('#sb button').forEach(b=>b.onclick=()=>{ k=+b.dataset.k; draw(); });
    m.querySelector('#sv').innerHTML=SHEETS[k].svg(); m.querySelector('#sn').textContent=SHEETS[k].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__m6205Active=false;
  m.innerHTML = M65_CSS + `<div class="grid2">
   <div>${card('Scheduler of the selected variant', `<div class="m65-row"><label class="small">Variant <select id="m65var2">${VARIANTS.map(v=>`<option value="${v.id}" ${v.id===D.variant?'selected':''}>${v.name}</option>`).join('')}</select></label></div><div id="loop"></div>`)}
     ${card('Boot sequence (main(), v100w.c)', tbl(['Step','Time','Code'],[
       ['Ports, watchdog (WDTCR 0x08), ADC','0','initialization() · DATA_INITIALIZATION (ERR LED on) · CAN_RX (PD7 high: CAN transceiver in loopback)'],
       ['Wait','≈0.25 s '+inf,'wait(3000) + 4 × wait(63000), WDR in every loop'],
       ['Slot address ×2','—','AD_CONVERTER_SETUP → ADDRESS_TABLE(ad_result) → moduleAddress (once, wait, again)'],
       ['FPGA reset, wait','≈0.5 s '+inf,'ALTERA_RESET(1000) then 8 × wait(63000)'],
       ['SHARC reset','—','CS8416_RS1/RS2_LOW (no external AES), SHARC_RESET(1000)'],
       ['DIP once','—','dip_switch_enabled (SW7), dashboard_enabled (SW8), groups, dialnorm, PCM delay, HD audio clock'],
       ['CAN','—','DATA_SETUP · CANinit (1 Mbit/s, timer0_init, timer1_init) · CAN_TX (PD7 low)'],
       ['while(1)','≈1.0 s '+inf,'the super-loop on the left'],
     ]))}</div>
   <div>${card('Register map (live, “M6205c200 switching rules.doc”)', `<div id="regs"></div>`)}
     ${card('sample.c routing (live)', `<div id="route"></div>`)}</div></div>
   ${card('Key numbers in the code', tbl(['Item','Value','Where'],[
     ['Exchange size','440 bytes (ALTERA_BUFFER_METADATA)','altera.h; SHARC NCH109 = 110 words'],
     ['No-vertical exchange rate','every 1500 passes','v100w.c main()'],
     ['Alignment failures before lock-up','ERROR_COUNTER1 = 1000','M6205A.c'],
     ['timer0','1 ms (comment says 100 µs)','CAN-05.c timer0_init / timer0_ovf_isr'],
     ['timer1 refresh slot 1 / 20','480 µs / 80 µs','REFRESH_TIME (slots 11–15 all 224 µs)'],
     ['timer1 heartbeat','57.9 ms (0x1DC4 reload; per-slot cases commented out)','HEARTBEAT_TIME'],
     ['Gain range','−15…+15 dB, UNITY_GAIN 61','MESSAGE_CREATOR_PARAMETER_71, VOLUME_Table, volume_data.c'],
     ['Ramp','0.2 % per sample (≈10.4 ms)','RampAudio.c RAMP_TC_LEVEL1'],
     ['Dialnorm gain','volume[dialnorm + 30] (−31 → 0 dB, −24 → −7 dB)','backgnd.c dial_norm_extract'],
   ]))}`;
  m.querySelector('#m65var2').onchange=e=>A.variant(e.target.value);
  const draw=()=>{ const t=SIM.t, V=VAR(D.variant);
    if (V.sched==='loop'){ const st=stepAt(t);
      m.querySelector('#loop').innerHTML=`<p class="small">Pre-3G builds (${V.folder}): one ICCAVR super-loop. Interrupts: timer0 (1 ms: SD_RESET, DashBoard watchdog counters), timer1 (CAN transmit pacing per slot), CAN (can_rx_isr). The running step at the playhead is highlighted.</p>
        <ol class="small">${STEPS.map((s,j)=>`<li style="padding:3px 6px;border-radius:5px;${j===st.step?'background:color-mix(in srgb,var(--accent) 25%,transparent);font-weight:700':''}"><span class="mono">${s[0]}</span><br><span class="muted">${s[2]}</span></li>`).join('')}</ol>
        <p class="small">After the exchange: <span class="mono">while(error0){ CLI(); }</span> — an alignment failure stops the loop with interrupts off until the watchdog resets the AVR.</p>`;
    } else {
      const ev=zeusSched(); const cur=ev.find(e=>t>=e.t0&&t<e.t1);
      m.querySelector('#loop').innerHTML=`<p class="small"><b>v6xx (3G) builds use the Ross zeuslib scheduler</b> (OGP-SDK-AVR for the ZTC-8399, copied into each tree as <span class="mono">zeuslib/</span>). WBS's other openGear cards use a hand-written super-loop. ${V.name}: ${V.fn}.</p>
        <ol class="small">${[['osRun()','for(;;) { task = osGetTask(); task(); updateClock(); }'],['canReceive','signalled by the CAN interrupt — OGP messages, DashBoard parameters (dbparams.c, dbmenus.c)'],['appTask','signalled every APPTASK_INTERVAL = 40 ms (111 ms if NLC_LOG): gs2970ReadVidInfo, resetIfNewLock, alteraWrite(AUDIO_GROUPS), readEmbAudGrp/Fmt, setDtsStatus or setDolbyStatus, updateLeds, set1001Flag, set3gFlag, sdiFormatSelector, initDtsBoard'],['reportStatus','every MONITOR_INTERVAL = 1000 ms: OID_SDI_STATUS and OID_DTS_STATUS / OID_DOLBY_STATUS'],['eeSaveTask','commented out (“for now, we will manage EE storage manually”)'],['osIdleTask','nothing ready → WDR (watchdog 1 s, wdgEnable(WDT_1000MS))']].map(([n,d])=>`<li style="padding:3px 6px;border-radius:5px;${cur&&cur.k===n?'background:color-mix(in srgb,var(--accent) 25%,transparent);font-weight:700':''}"><span class="mono">${n}</span> — <span class="muted">${d}</span></li>`).join('')}</ol>
        <p class="small">Priority is the order of <span class="mono">osTaskList[]</span> in tasklist.c: osGetTask() returns the first task whose signal is set. Tasks run to completion (no pre-emption). Board type is a compile-time choice in boardtype.h (DOLBY_DECODER / DTS_UPMIX / DTS_MULTIMERGE / DTS_NLC / M6205A) plus the matching <span class="mono">/p</span> line in M6205pack.txt (zeuspack, version /v 6.02).</p>`;
    }
    const R=regsOut(), S=regsStatus(t), w=a=>(a[0]<<24|a[1]<<16|a[2]<<8|a[3])>>>0;
    m.querySelector('#regs').innerHTML=tbl(['Reg','Value','Meaning'],[
      ['1','0x'+hx(w(R.slice(0,4)),8),'SYNC header “SYNC”'],
      ['2','0x'+hx(w(R.slice(4,8)),8),`31..30 groups ${groupsEnabled()} · 19 HD clk ${D.dip[3]?1:0} · 18 PCM delay ${D.dip[4]?1:0} · 16 dialnorm ${D.dip[5]?1:0} · 15..8 program ${R[6]} · 7..0 mixdown ${R[7]}`],
      ['3','0x'+hx(w(R.slice(8,12)),8),`31..24 DV gain ${R[8]} · 7..0 DIP switches`],
      ['7','0x'+hx(S.r7,8),'31 SMPTE lock · 30 SD · 29 HD · 28/27 50/60 Hz · 26..23 1080/720/525/625 · 15 VANC detected · 10..0 metadata line'],
      ['8','0x'+hx(S.r8,8),'31/30 TDM sync · 27 group-1 mux ok · 25 GPI1 · 24 GPI2 · 23..8 Dolby detect AES2/AES1 · 7..4 0xA · 3..0 HD groups'],
      ['9','0x'+hx(S.r9,8),'SD demux status: EQ, constant 0xA0, SD CHACT 16..1'],
      ['10','0x'+hx(S.r10,8),'compressed-audio nibble per AES (bit 3 compressed; 1 = AC-3, 2 = Dolby E)'],
      ['11–110','—','metadata from the FPGA; the SHARC returns it parsed (Reg 13–16 per programme)'],
    ]);
    const sm=sampleIRQ(Math.floor(t*FS),t), meta=valAt('meta',t);
    m.querySelector('#route').innerHTML=tbl(['Output','Formula now','Peak'],[
      ['AES1','in1 × program_gain', fdb(peakDb(0,t))],
      ['AES2','' + (meta?'in2 × program_gain':'0 (muted: no metadata)'), fdb(peakDb(2,t))],
      ['AES3','' + (meta?'in3 × program_gain':'0 (muted: no metadata)'), fdb(peakDb(4,t))],
      ['AES4 L',valAt('gpi1',t)?'mono (GPI1 closed)':'in4 L × dv_gain', fdb(peakDb(6,t))],
      ['AES4 R',meta?(D.meta.acmod===1?'C × dn_gain':'(Lmix + Rmix) × mixdown × dn_gain'):'(L + R) / 2', fdb(peakDb(7,t))],
      ['AES5',meta?'mixdown × mixdown_gain × dn_gain':'AES1', fdb(peakDb(8,t))],
      ['AES6','TDM slots 11/12 copied unchanged', fdb(peakDb(10,t))],
    ])+`<p class="small muted">${sm.why||''}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__m6205Active=false;
  const F=[
    ['Artwork 2026|59: card edge and rear module now from the CorelDRAW files', `Card edge: ${EDGE_ART.src()}; T6307: ${REAR_ART.m6205.src()}, with the C200 issue ${REAR_ART.c200.src()} on a toggle under the panel. The C200 drawing marks BNC4, BNC5, BNC7 and terminal blocks 6 and 8 “N/A”, leaving only AES OUT1 in use — yet the C200 SHARC code (sample.c) still drives C/LFE on BNC4 and Ls/Rs on BNC5, as the generic 2008 drawing labels them, and META DATA on block 6 is the GPI the code reads. The first edge drawing (${SIM.src(ART_DIR+'M6205-card-edge.cdr','M6205-card-edge.cdr')}, 2008-05-08) labels the bottom LED “COM Activity”; v10 renamed it “META DATA”, which is what LED15 shows in this firmware. Neither drawing has a power LED.`],
    ['The control link runs with interrupts off for ≈63 % of every second', `ALTERA_read_write() (altera.c) brackets the whole 440-byte bit-bang with CLI()/SEI(). At about 20 cycles per bit (altera.lis) that is ≈10.45 ms out of each 16.7 ms field. timer0 loses ≈9 of every 16 ticks, so its “ONE_SECOND” DashBoard counter (CAN-05.c) runs about 2.3× slow, and CAN interrupts wait up to 10 ms. The 2011|44 test report notes the card “is still slow showing up on dashboard” after the 3.0.0.1 fix. ${infW('cycle count averaged over branches; lost-tick ratio follows from it')}`],
    ['The SHARC is clocked by the Atmel', 'cntrl_tdm_if.vhd passes the Atmel’s bit-bang clock straight to the SHARC’s SPORT4/5 (sclkout <= sclkin). Gains, GPI1 and the metadata flag reach sample.c only at the end of an exchange. With no SDI lock the Atmel exchanges only every 1500 passes, so GPI and gain changes take about 0.6 s instead of one field.'],
    ['Code and switching-rules document disagree with no metadata', '“M6205c200 switching rules.doc” says that with no metadata, no GPI1 and no Dolby E all six pairs pass. sample.c v104 always zeroes AES2 (C/LFE) and AES3 (Ls/Rs) when Reg 7 bit 15 is clear, and copies AES1 to AES5. The CTV test report says “with no meta data could not check all the functions”.'],
    ['GPI1 sense is reversed against the v3.0.0.0 sheet', 'M6205C200v3000 DipSwitchControl.doc: GPI/O1 “Terminated → AES4 Left = DV, AES4 Right = AES1 mono; Not terminated → both mono”. GPI1 is wired straight to Reg 8 bit 25 (m6205c.bdf), and sample.c makes AES4 left = mono when that bit is 0, which is a closed contact. AES4 right is always mono. '+infW('assumes “terminated” means a closed contact pulling the pin low')],
    ['Mixdown mono is 6 dB hot', 'sample.c first computes mono = (Lmix + Rmix) × 0.5, then overwrites it with (Lmix + Rmix) × mixdown_gain × dn_gain, with no 0.5. Without metadata the mono is (L + R)/2, so AES4 right jumps by about 6 dB when metadata arrives.'],
    ['Program gain also hits the Dolby E pair', 'sample.c multiplies inputs 0–5 (AES1–3) by program_gain before routing, and clips at ±0.999999. A Dolby E stream on AES2 (Input 5) is therefore altered on the AES2 output (and muted there without metadata). Only AES6, copied word for word (TDM_out[11],[12]), stays bit-exact. The “echo dolby e” block that moved AES2 to AES6 is commented out.'],
    ['AES IN1 and the AES 1/2 LEDs are dead in C200', 'EXTERNAL_AES_INPUTS is never defined (common.h), so main() holds both CS8416s with RS low and the loop never reads Astatus. The AES 1 and AES 2 card-edge LEDs never light, even though the T6307 has an AES IN1 BNC.'],
    ['SW6 dialnorm does not switch dialnorm', 'Reg 2 bit 16 travels to the SHARC, but backgnd.c only copies it into Reg 110. dial_norm_extract() applies dn_gain = volume[dialnorm+30] whenever metadata carries a non-zero dialnorm.'],
    ['SW7 and SW8 are read once; settings are never restored', 'dashboard_enabled and dip_switch_enabled are set in main() before while(1). PROCESS_DIP_SWITCHES in the loop does not touch them. RESTORE_INFORMATION_EEPROM() is commented out, so gains come back at unity after every power cycle whatever SW7 says. The C200 v3.0.0.0 sheet calls SW4–SW8 “Reserved”, but the code still sends SW4/5/6 to the FPGA and SW8 still locks DashBoard.'],
    ['Watchdog reboot loop if the SHARC stops', 'If the echo loses “SYNC”, ALTERA_ALIGNMENT_CHECK counts to ERROR_COUNTER1 = 1000 exchanges (≈17 s), then main() spins in while(error0){ CLI(); } with no WDR until the ≈16 ms watchdog resets the AVR. The reboot takes about 1 s of wait() loops.'],
    ['Off-by-one buffer writes in the CAN driver', 'CANRX_buffer: “if (index_mob < MOB_COUNTER_MAX) index_mob++” lets index_mob reach 10 and write buffer_MOb[10] (size 10). The same pattern appears for dashboard_counter_buffer[10] and message_test_buffer[20]. These are candidates for the “card going offline” fixed in 2.0.0.4 and 3.0.0.1. '+infW('the effect depends on the linker’s memory layout')],
    ['Any non-receive CAN interrupt re-initialises CAN', 'can_rx_isr sets MOB_error = YES on entry and clears it only for a good receive. CAN_FUNCTIONS() then calls CANinit() on the next pass, which also restarts timer0 and timer1. Transmit-complete and error interrupts all take this path.'],
    ['Stale SDI format', 'PROCESS_SDI_LOCK_STATUS (gennum.c) has its “else sdi_format = NO_LOCK” commented out. If the GS1559 is locked but Reg 7 reports neither SD nor HD, the previous format and LEDs stay.'],
    ['HD lights SD too; leftovers from POD/M6204 code', 'REFRESH_LEDS turns on both HD and SD for HD_FORMAT. SHIFT_OUT_LEDS builds a remapped mod_input (“preset A”, “input 1”…) and then sends the unmapped “input”. M6205.h is guarded by __M6204_H and keeps MODE1–MODE6. gennum.h puts GS1559_CS on PB4, the same pin as ALTERA_CLOCK; that code is commented out.'],
    ['Rotated gain indices that still work', 'The OID 7.1 handler stores Program in volume[1], DV in volume[2] and MixDown in volume[0]. ALTERA_SORT then writes [1] to Reg 2 bits 15..8 (SHARC program_gain), [0] to bits 7..0 (mixdown) and [2] to Reg 3 bits 31..24 (dv_gain), so each slider lands on the right gain.'],
    ['Comments that disagree with the code', 'timer0 “reload counter value for 100us” is 1 ms. backgnd.c “preferred: ltrt=0 loro=1” while sample.c tests 2 for Lo/Ro, which matches the RDD 6 value. The switching-rules document is titled “AMS81” in its properties.'],
    ['T6307 says MF6220 frame and has no AES4/AES5', 'M6205-T6307.pdf is titled “Embedded audio processor · single card termination · MF6220 frame” (WBS’s own frame), while the manuals name openGear DFR-8310/8320. It brings out only AES OUT1, BNC4 and AES OUT2, so the DV/PGM mono (AES4) and the mixdown (AES5) reach the plant only embedded in SDI OUT1/2.'],
    ['Variants and the v6xx scheduler', 'The 3G (issue-6) Atmel code is a different program: Ross zeuslib gearos tasks (canReceive, appTask every 40 ms, reportStatus every 1 s; eeSaveTask commented out), SPI to the FPGA, GS2970/GS2962, and no SHARC. Firmware version 1.x was renumbered 6.x on 2011|44-08-30 to match board issue 6. In M6205-NLC v602, boardtype.h has NLC_LOG commented out, so the shipped NLC build has no data logging. M6205CEE-800 identifies itself as “M6205C500”. M6205C700 was never released.'],
  ];
  m.innerHTML = card('What the M6205 (C200) firmware is “up to”', `<ol>${F.map(([h,b])=>`<li style="margin-bottom:8px"><b>${h}.</b> ${b}</li>`).join('')}</ol>`) +
    card('Variants in the folder (selector on the Simulator and Software tabs)', tbl(['Variant','Folder','Era','Customer','Firmware','Function','Scheduler','Test reports'], VARIANTS.map(v=>[v.name, `<span class="mono small">${v.folder}</span>`, v.era, v.cust, v.fw, v.fn, v.sched==='zeus'?'zeuslib gearos':'super-loop', v.tests]))) +
    card('Duplicates, leftovers and missing pieces', `<ul>
      <li>Each Atmel folder keeps <span class="mono">._c/._h</span> twins of the sources and unused older files (Dashboard.c, Dashboard1._c, Dashboard3._c, CAN_mod.c). The build uses Dashboard2.c and CAN-05.c (v100w.mak).</li>
      <li><span class="mono">M6205  #Engineering #PCB #GERBER #TIM </span> (trailing space) is an empty folder skeleton.</li>
      <li>The pre-3G projects include <span class="mono">H:\\ICCAVRLibrary</span>, which is not in the archive. The DTS and Dolby daughter-card firmware is not in the archive either.</li>
      <li>The OID tables in the history workbooks are copy-pasted between variants. The prototype sheet lists voice-over dim and input trim OIDs that Dashboard2.c (C200) does not have.</li>
      <li>The card silk carries a third-party frame logo; it is blanked in this plugin's artwork.</li></ul>`) +
    card('Sources', `<ul class="small"><li>Software/m6205c200/atmel/v201: v100w.c, M6205A.c, altera.c/.h/.lis, CAN-05.c, Dashboard2.c, Dashboard1.h, M6205.h, common.h, gennum.c/.h, sharc.c/.h</li><li>Software/m6205c200/sharc/v104: sample.c, backgnd.c, RampAudio.c, volume_data.c, configdai.c, sample.h</li><li>Software/m6205c200/altera/v102: m6205c.qsf, m6205c.bdf, cntrl_tdm_if.vhd</li><li>Software/m6205c200: switching rules.doc, SOFTWARE HISTORY.xls; CUSTOM/M6205C200/V3.0.0.0 DipSwitchControl.doc; M6205c Dip Switch Settings.pdf; M6205-T6307.pdf; M6205-IO.pdf</li><li>PCB/GERBERS/M6205A-ISS4.TOP, .TSM, .TSS → assets/m6205-card-copper.png, m6205-card-silk.png; PCB/OBSOLETE/ISSUE4/M6205A-iss4.pnp, .net, .bom</li><li>M6205 - #TESTREPORT/M6205-C200-V3001-21MAR11.pdf; MANUAL/M6205A-3G/M6205A-3G.pdf</li><li>Software/M6205-NLC/ATMEL/v602/M6205: main.c, tasklist.c, apptask.c/.h, boardtype.h, M6205pack.txt, zeuslib/common/gearos.c</li></ul>`);
}

SIM.register({
  id:'m6205', product:'M6205', year:2008,
  name:'M6205 · openGear SDI embedded audio processor (2008|41)',
  family:'openGear', folder:'#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR',
  summary:'openGear card that de-embeds the audio from SD/HD-SDI, processes it and re-embeds it. Three processors share the work: an AT90CAN128, an EP2C35 FPGA and an ADSP-21262 SHARC. Modelled on the CTV M6205A-C200 3.0.0.1 build (DV / programme-mono and metadata-driven mixdown); the many customer variants, including the 3G v6xx builds on the Ross zeuslib scheduler, are on a selector.',
  highlights:['Card drawn from the issue-4 gerbers, with live LEDs and DIP switch','DashBoard-style window that drives the real SHARC mix code sample by sample','10 ms bit-banged control exchange with interrupts off, traced byte by byte','11-step operator tutorial','Super-loop vs zeuslib gearos across 14 firmware variants'],
  depth:'Full model', duration:1,
  stepUnits:[
    {label:'1 field', period:()=>fmt().field, phase:()=>0.0012},
    {label:'1 control exchange slot (≈10.45 ms)', period:()=>XCHG_T},
    {label:'1 main-loop pass (0.4 ms)', period:()=>LOOP_T},
    {label:'1 ms (timer0)', period:()=>0.001},
    {label:'1 control byte (≈24 µs)', period:()=>BYTE_T},
    {label:'1 audio sample (20.8 µs)', period:()=>1/FS},
    {label:'1 SDI line', period:()=>lineT(fmt())},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms (gain ramps)'],[1001/60000,'1 field (16.7 ms)'],[0.012,'1 exchange (12 ms)'],[0.002,'2 ms (passes, ticks)'],[0.0003,'300 µs (bytes, lines)'],[0.00006,'60 µs (bits, samples)']],
  defaultZoom:2,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: setting up the C200', render:viewTutorial},
    {id:'second', label:'One second, field by field', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
