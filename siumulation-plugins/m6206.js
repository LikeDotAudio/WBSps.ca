/* =====================================================================
   M6206A — openGear MD-SDI AES demuxer with Dolby decode and voice-over mixing
   (Ward-Beck Systems for Astral Media, 2007|40–2008|41; CTV demo 2012|45)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/):
   - Software/atmel/v104/  (ICCAVR 7.15, AT90CAN128 @ 8 MHz, SOFTWARE_VERSION 4 → "1.04")
       v100w.c      main(), READ_GPI, DEBOUNCE_GPI2, NO_LOCK_CHIRP, METADATA_CHIRP, REFRESH_LEDS, port_init
       M6206A.c     ALTERA_SORT (80-byte control buffer), ALTERA_TRANSLATE_UART0 (voice-over state machine),
                    DIM_Table, PROCESS_SDI_LOCK_STATUS, PROCESS_DIP_SWITCHES, PROCESS_AUDIO_FORMAT,
                    PROCESS_AUDIO_INFORMATION, TRANSLATE_RESET_VECTOR, PARAMETER_UPDATE, CAN_TX_TIMER,
                    DASHBOARD_RESPONSE_SETUP (every OID), SAVE/RESTORE_INFORMATION_EEPROM, Parameter*_Message
       M6206.h      LED / GPI port macros, STEREO/L_ONLY/R_ONLY/MONO, chirp and debounce constants, refresh list
       M6206A.h     an older header (chirp 100/600, different refresh list) that no file includes
       altera.c/.h  ALTERA_read_write (80 bytes × 2), ALTERA_read (ALTERA1…19), "V201" alignment words
       dolby.c/.h   DOLBY_DECODER_STATUS, RESET_DOLBY, DOLBY_CAT552_AUDIO_ERROR_CHECK, timer3 (33 ms)
       sharc.c/.h   SHARC_RESET, DSP_SYNC_DETECTOR · CAN_mod.c timer0/timer1, CANBT (1 Mbit/s)
       altera.lis   instruction listing of ALTERA_read_write_data (cycle count → main-loop pass time)
   - Software/Sharc/v102/  backgnd.c (main, refresh: altera_data[] → gains), sample.c (SampleIRQ: delays,
       mix matrix, clip, DSP-sync echo), RampAudio.c (RAMP_TC_LEVEL1-3), volume_data.c, dim_data.c,
       configdai.c (DAI pin routing), shell262.dpj (RLM-series project shell, 2005)
   - Software/altera/v102/ pod31.qsf (EP1C12Q240C6 pins, EPCS4), pod31.bdf (cntrl_status[] bus),
       non_audio_detector.vhd (SMPTE 337 Pa/Pb detection), CAT552_switch.vhd, dsp_synch_detector.vhd,
       shifter_out_48bit.vhd (LSB-first status shifter)
   - Software/M6206A SOFTWARE HISTORY.xls (DEMO … v104) · m6206 operational ctl info.doc (register map)
   - M6206A Manual (Preliminary) 22 Aug 07.pdf (modes, LEDs, voice-over, DIP tables, DashBoard)
   - PCB/M6206A.net, .bom, .pnp; PCB/GERBERS/M6206A.TOP/.TSM/.TSS → assets/m6206-card-*.png (120 dpi)
   - Photo/M6206A Iss1.jpg (black mask, CAT552 module position) · M6206-card-edge.cdr (LED order, via Inkscape)
   - M6206A-T6304.pdf / .cdr, M6206A-T6305.cdr (Inkscape), T6304.net (rear pin map)
   - M6206-FUNCTIONAL.pdf, ASTRAL-M6206-FUNCTIONAL-ISS2.pdf, M6206-CONTROL PANELiss2 Model (1).pdf
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = s => `<span class="tag-inf" title="Inferred: ${String(s).replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const bin8 = n => (n&255).toString(2).padStart(8,'0');
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const db = a => a>1e-9 ? 20*Math.log10(a) : -120;

/* ---------------- constants from the source ---------------- */
const C = {
  F_CPU: 8e6,               // v100w.c "Crystal: 8.0000Mhz"; BOM 8MHz XTAL1
  /* ALTERA_read_write_data: ≈19 cycles a bit (altera.lis) → ≈172 cycles a byte with call overhead;
     ALTERA_read_write clocks the 80-byte buffer twice (160 bytes ≈ 3.44 ms), ALTERA_read 19 bytes (≈0.4 ms),
     plus CS8416 SPI, CAN_FUNCTIONS and the rest of the loop. */
  LOOP_T: 4.2e-3,
  T1_IDLE: 0.096,           // timer1: TCNT1 = 0xD120, clk/64 → 12 000 × 8 µs
  T1_FAST: 96e-6,           // 0xFFF4 → 12 × 8 µs (multi-frame replies, "dashboard_initializing")
  REP_IDLE: 3*0.096,        // tx_interrupt_counter > TX_FIVE_SECONDS (= 1): a report every 3rd overflow
  REP_INIT: 10501*96e-6,    // tx_interrupt_counter > TX_ONE_SECOND (10500) at 96 µs
  T0: 1e-3, T3: 4124*8e-6,  // timer0 1 ms; timer3 0xEFE4 → 32.992 ms (dolby.c comment)
  FS: 48000,
  DELAY1: 1584,             // sample.c DELAY_COUNTER_SIZE ("originally 1601")
  DELAY4: 1584*4,           // DELAY_COUNTER_SIZE1 — the v102 "5 frames on AES4"
  RAMP: [1.0, 0.00199999, 0.000199999, 0.000019999],   // RampAudio.c: cut / RAMP_TC_LEVEL1 / 2 / 3
  RAMP_NAMES: ['Cut','Fast','Medium','Slow'],
  VOL64: 64*0.01555106134974599,   // volume_data.c volume[FIXED_OUTPUT_GAIN = 64]
  GPI2_DEB: 50,             // SWITCH2_DEBOUNCE (passes)
  CHIRP_ON: 10, CHIRP_OFF: 70, META_CHIRP: 300,          // M6206.h (M6206A.h says 100/600)
  RESET_VEC: 100,           // RESET_VECTOR_CONSTANT (passes)
  DOLBY_ERR: 2000, CAT_ERR: 1000, ALIGN_ERR: 1000,       // dolby.h / M6206.h ERROR_COUNTER1
  WDT: 0.0163,              // WDTCR = 0x08 → 16K WDT-oscillator cycles (AT90CAN128 data sheet, not archived)
  CAN_BIT: 1e-6, STUFF: 1.1,// CANBT1/2/3 = 0x00/0x04/0x12 → 1 Mbit/s ("CAN bitrate = 1 Mbps")
  DET_HOLD: 8191,           // non_audio_detector: count "001111111111111" LRCLK periods
  BOOT: [                   // main() before while(1); wait(n) ≈ n µs (WDR, decrement, compare, branch) — inferred
    [0.0130, 'initialization(); DATA_INITIALIZATION(); 4 × wait(3000); ALTERA_RESET(1000); DOLBY_INITIALIZATION(); SHARC_RESET(1000)'],
    [0.0280, '4 × wait(3000); init_CS8416(); init_DOLBY() (timer3); 5 × wait(3000); slot ID: AD_CONVERTER_SETUP → ADDRESS_TABLE'],
    [0.0215, '6 × wait(3000); ALTERA_SORT(); ALTERA_read_write() — first 160-byte exchange'],
    [0.0820, '3 × (8 × wait(3000) + ALTERA_read_write()); ALTERA_read(); DOLBY_DECODER_STATUS()'],
    [0.0060, 'pod31_mode = Dolby_card_installed; SW8 ON → RESTORE_INFORMATION_EEPROM(); PROCESS_DIP_SWITCHES(); CANinit(); DATA_SETUP()'],
  ],
  CS_LOCK: 0.012,           // CS8416 lock time on the voice-over input — inferred
  SDI_LOCK: 0.020,          // GS1574A/GS1559 lock time — inferred
  CAT_LAT_FR: 1,            // decoded audio is one frame late (manual, Mode 2)
  REP_PHASE: 0.061, T0_PHASE: 0.25,   // phase of the report timer and the 1 s CAN counter — inferred
};
const VF = {
  SD:{name:'525i 59.94 SD (270 Mb/s)', short:'SD', lines:525, fr:30000/1001, spl:1716, act:1440, hdr:4, clk:27e6, std:1},
  HD:{name:'1080i 59.94 HD (1.4835 Gb/s)', short:'HD', lines:1125, fr:30000/1001, spl:2200, act:1920, hdr:8, clk:74.25e6/1.001, std:2},
};
const FRAME_T = 1001/30000;
const TYPES = {none:'— (no audio)', pcm:'PCM', dolbyE:'Dolby E', ac3:'Dolby AC-3 (DD)', other:'other data (SMPTE 337)'};
const DT = {dolbyE:28, ac3:1, other:7};          // SMPTE 338 data type in Pc → PC_DOLBY_E 28, PC_DOLBY_AC3 1
const PCM=0, COMPRESSED=1, DOLBY_AC3=2, DOLBY_E=3;   // M6206.h
const LED_NAMES = ['SD','HD','ERR','AES 1','AES 2','AES 3','AES 4','DOLBY 1','DOLBY 2','DOLBY 3','DOLBY 4','COM ACTIVITY','VOICE OVER'];
const LED_MACRO = ['SD_LED (PE2)','HD_LED (PE5)','ERROR_LED (PE6)','AES1_LED (PB0)','AES2_LED (PB1)','AES3_LED (PB2)','AES4_LED (PB3)','DOLBY1_LED (PB4)','DOLBY2_LED (PB5)','DOLBY3_LED (PB6)','DOLBY4_LED (PG1)','COM_ACTIVITY_LED (PG0)','VOICEOVER_LED (PB7)'];
/* M6206A.pnp positions (mil, origin 3400/5885) of LED14,13,12,11,4,3,9,8,7,5,2,10,6 */
const LED_PNP = [[-400.3,2390],[-400.3,2290],[-400.3,2190],[-400.3,1990],[-400.3,1885],[-400.3,1785],[-400.3,1685],[124.7,1990],[124.7,1885],[124.7,1785],[124.7,1685],[-250.7,1016.6],[-250.7,914.2]];
const LED_REF = ['LED14','LED13','LED12','LED11','LED4','LED3','LED9','LED8','LED7','LED5','LED2','LED10','LED6'];
const LED_COL = i => i===2? '#ff4a3d' : (i<=1||i>=11)? 'var(--led-g)' : 'var(--led-a)';
const VO_ST = ['Inactive','Active','Override'];
const MODE_NAMES = {0:'Stereo',1:'L Only',2:'R Only',3:'Mono'};
const MIX_NAMES = ['L,R','L,C,R','C'];

/* ---------------- DashBoard object tree (Parameter*_Message, Menu*OID_Message) ---------------- */
const OID = {
  0x0105:{n:'Product', ro:1}, 0x0106:{n:'Name', ro:1}, 0x0102:{n:'Manufacturer', ro:1}, 0x0107:{n:'Board Rev', ro:1}, 0x010B:{n:'Software Rev', ro:1}, 0x0104:{n:'Website', ro:1},
  0x0204:{n:'Signal Status', ro:1, alarm:1}, 0x0201:{n:'SDI Format', ro:1}, 0x020B:{n:'Embedded Audio Group', ro:1},
  0x0202:{n:'Embedded AES Input 1', ro:1}, 0x0203:{n:'Embedded AES Input 2', ro:1}, 0x0205:{n:'Embedded AES4 Input', ro:1},
  0x020A:{n:'Voiceover Audio Input', ro:1}, 0x0206:{n:'Dolby Decoder', ro:1, alarm:1}, 0x0208:{n:'Dialnorm', ro:1}, 0x0207:{n:'Voiceover Status', ro:1}, 0x0209:{n:'Pgm Attenuation', ro:1},
  0x0301:{n:'Pgm Dim Level (dB)', range:[-30,0]}, 0x0303:{n:'Voiceover', ch:['Inactive','Active','Override']}, 0x0304:{n:'Pgm Input Trim (dB)', range:[-15,15]},
  0x0305:{n:'Settings', ch:['Save']}, 0x0306:{n:'Type of Voiceover Input', ch:{0:'Stereo',3:'Mono',1:'L Only',2:'R Only'}},
  0x0307:{n:'Voiceover Mixed to Pgm', ch:['L,R','L,C,R','C']}, 0x0308:{n:'Dialnorm', ch:['Disabled','Enabled']}, 0x030A:{n:'Voiceover Input Ramping', ch:['Cut','Fast','Medium','Slow']},
  0x0309:{n:'2nd Group Selector', ch:['1','2','3','4']}, 0x030B:{n:'Settings', ch:['Disabled']},
};
const PARAM_OIDS = [0x0201,0x0202,0x0203,0x0206,0x0207,0x0105,0x0102,0x010B,0x0303,0x0306,0x0301,0x020A,0x0106,0x0104,0x0307,0x0305,0x0308,0x0304,0x0309,0x030A,0x0204,0x020B];
const MENUS = [
  {set:'Status', name:'Card Info', id:'0.0', oids:[0x0105,0x0106,0x0102,0x0107,0x010B,0x0104]},
  {set:'Status', name:'Card Status', id:'0.1', oids:[0x0204,0x0201,0x020B,0x0202,0x0203,0x0205,0x020A,0x0206,0x0208,0x0207]},
  {set:'Status', name:'Voiceover Status', id:'0.2', oids:[0x0207,0x0209], count:3},
  {set:'Control', name:'Card Settings', id:'1.0', oids:[0x0308,0x0303,0x0306,0x0307,0x0301,0x030A,0x0305], noSave:[0x0308,0x0303,0x0306,0x0307,0x0301,0x030A]},
  {set:'Control', name:'Voiceover Settings', id:'1.1', oids:[0x0304,0x0303,0x0306,0x0307]},
];
const oidTxt = o => ((o>>8)&0xFF)+'.'+(o&0xFF);
/* CAN_TX_TIMER refresh list (M6206.h) */
const PR = ['SDI_FORMAT','AES1_LOCK','AES2_LOCK','POD31_MODE','DOLBY_DECODER','VOICEOVER_STATUS','VOICEOVER_LOCKED','VOICEOVER_STATUS_CAN','GROUP_SEL1','SIGNAL_STATUS'];
const PR_OID = [0x0201,0x0202,0x0203,0x0306,0x0206,0x0207,0x020A,0x0303,0x020B,0x0204];

/* ---------------- rear modules ---------------- */
/* T6304: M6206A-T6304.pdf + T6304.net (BNCn_SIG / AESnP,N → P101 pins); T6305: M6206A-T6305.cdr labels (pins as T6304 — inferred) */
const REARS = {
  T6304:{name:'T6304 — single card, 7 BNC + 3 Phoenix', id:'3K57 / 3K01', src:'M6206A-T6304.pdf · T6304.net',
    pos:[['SDI IN','bnc','sdiin','97'],['SDI OUT','bnc','sdiout','92'],['AES1 OUT','bnc','aes1','75'],['AES2 OUT','bnc','aes2','80'],['AES3 OUT','bnc','aes3','37'],['AES4 OUT','bnc','aes4','34'],
         ['VOICEOVER IN','bnc','voin','17'],['GPI/O 2','tb','gpio2','58/56'],['GPI/O 1','tb','gpio1','51/49'],['METADATA OUTPUT','tb','meta','52/50']]},
  T6305:{name:'T6305 — single card, 8 BNC + 2 Phoenix', id:'3K57 / 2K55', src:'M6206A-T6305.cdr (Inkscape) · T6305 README',
    pos:[['SDI IN','bnc','sdiin','97'],['SDI OUT','bnc','sdiout','92'],['AES1 OUT','bnc','aes1','75'],['AES2 OUT','bnc','aes2','80'],['AES3 OUT','bnc','aes3','37'],['AES4 OUT','bnc','aes4','34'],
         ['VOICEOVER IN','bnc','voin','17'],['NOT USED','bnc','nc','—'],['GPI/O 1','tb','gpio1','51/49'],['METADATA OUTPUT','tb','meta','52/50']]},
};

/* =====================================================================
   WORLD (what the operator plugs in and presses) and FIRMWARE (variables named as in the source)
   ===================================================================== */
function mkWorld(){ return {
  card:true, cat:true, rear:'T6304', sdi:true, fmt:'HD',
  grp:[['pcm','dolbyE'],['pcm','pcm'],['none','none'],['none','none']],   // Astral-style: PGM stereo on AES1, Dolby E 5.1 on AES2 — inferred
  pgm:-20, dec:-20,                     // program tone levels (dBFS) — alignment level inferred
  voIn:true, voLvl:-14, voSrc:'left',   // voice on the left leg only (typical announce mic feed) — inferred
  gpi1:false, gpi2:false,               // contact closures to ground on the rear Phoenix blocks
  dip:[true,true,true,true,true,true,true,true],   // SW1…SW8 ON (manual factory default) — inferred for SW2…SW8
  dspOk:true, alignFault:false, catFault:false,
};}
function mkFw(){ return {
  mode:'run', bootEnd:0,
  CD:1, sdi_format:2, sd_hd:0, previous_sd_hd:0, previous_group_sel1:0, ERROR5:1, ERROR6:1,
  gpi1_active:0, gpi2_active:0, gpi2_pressed:0, gpi2_release:0, gpi2_counter:0, pgpi1_status:1, pgpi2_status:1,
  voiceover:0, voiceover_status:0, voiceover_status_can:0, voiceover_led_on:1, no_lock_counter:C.CHIRP_OFF,
  metadata_counter:C.META_CHIRP, format_alternate:DOLBY_AC3, gpo1:0, gpo2:0, voled:0,
  group_sel1:0, audio1:0, remote_parameter_adjustment:1, parameter_save_enabled:1, pod31_mode:1, os0:1,
  mode_select:3, voiceover_mix:0, ramping_type:2, dim_level1:0xFF, dim_level2:0xEC, DimEnable:0, VoiceoverEnable:0, swap:0,
  dialnorm_enable:0, pdialnorm_enable:0, dialnorm_settings:0xE0, reset_552:0xFF, input_trim:0,
  Dolby_card_installed:1, dolby_counter:0, cat_err:0, cat_ok:0, dolby_error_check_complete:1, dolby_audio_cat_error:0,
  dsp_sync_detected:1, dsp_sync_detector_disable:0, error_checker:0, wdtAt:null,
  reset_enable:0, reset_counter:0, clocks_stable:1,
  AUDIO1:1, AUDIO2:1, aes1_led:PCM, aes2_led:DOLBY_E, aes1_lock:1, aes2_lock:DOLBY_E, Astatus:1, AUDIO_INFORMATION:0xFF,
  parameter_refresh:0, parameter_change:0, parameter_tx_complete:1, signal_status_change:0,
  prev:{aes1:1, aes2:DOLBY_E, vs:0, Ast:1, sdi:2, vsc:0, mode:3, grp:0, dolby:1},
  save_settings:0, ee:{valid:1, mode_select:3, dim1:0xFF, dim2:0xEC, mix:0, dial:0, ramp:2},
  leds:0, com:1, start_parameter_dump:1, init:0, rxCount:0, quiet:3, t0next:C.T0_PHASE,
  vog:0, dimg:1, csAt:-1, sdiAt:-1, voAt:-1,
  nextPass:0.0013, nextRep:C.REP_PHASE,
  cache:null,
};}
const D = { w:mkWorld(), s0:null, ev:[], second:1, log:[], ver:0, R:null, Rver:-1,
  ui:{dashMenu:1, rearSel:null, liftCat:false, block:'avr', sheet:0, follow:true} };
function deep(o){ return JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity? '__inf' : v), (k,v)=> v==='__inf'? Infinity : v); }
function resetAll(tut){
  D.w = mkWorld(); const f = mkFw();
  if (tut){ D.w.sdi=false; D.w.voIn=false; f.CD=0; f.sdi_format=0; f.Astatus=0; f.AUDIO1=0; f.AUDIO2=0; f.aes1_lock=0; f.aes2_lock=0; f.aes1_led=PCM; f.aes2_led=PCM; f.reset_enable=1; f.reset_counter=C.RESET_VEC; f.reset_552=0; f.prev={aes1:0,aes2:0,vs:0,Ast:0,sdi:0,vsc:0,mode:3,grp:0,dolby:1}; }
  f.leds = ledsFrom(f); f.cache = cacheFrom(f, D.w);
  D.s0 = {w:deep(D.w), f}; D.ev=[]; D.second=1; D.log=[]; D.ver++;
  if (!tut){ D.ev.push({kind:'world', label:'demo: automation closes GPI-1', t:0.25, fn:w=>{ w.gpi1=true; }}); D.ev.push({kind:'world', label:'demo: control-panel tap on GPI-2', t:0.62, fn:w=>{ w.gpi2=true; }}); D.ev.push({kind:'world', label:'demo: release', t:0.87, fn:w=>{ w.gpi2=false; }}); }
}

/* ---------------- helpers that read the world ---------------- */
function rearDef(w){ return REARS[w.rear]; }
function hasPos(w, role){ return rearDef(w).pos.some(p=>p[2]===role); }
function dipGroup(w){ return (w.dip[0]?0:2) + (w.dip[1]?0:1); }   // ALTERA13 bit7 = SW1, bit6 = SW2; ON = closed = 0 (pull-up inferred)
function ALTERA13(w){ let v=0; for (let i=0;i<8;i++) if (!w.dip[i]) v |= (0x80>>i); return v; }   // shifter LSB first, read_data2 MSB first
function pairType(w, g, k){ return (w.sdi && w.card) ? w.grp[g][k] : 'none'; }
function lastBurst(type, t){                       // newest SMPTE 337 burst start at or before t
  if (type==='dolbyE') return Math.floor((t-0.0006)/FRAME_T)*FRAME_T+0.0006;   // one burst a video frame, after the switch line — inferred phase
  if (type==='ac3'||type==='other') return Math.floor((t-0.004)/0.032)*0.032+0.004; // 1536 samples = 32 ms — phase inferred
  return -Infinity;
}

/* =====================================================================
   SIMULATION — the main loop, timer1 reports and the CAN ISR over one second.
   ===================================================================== */
function ledsFrom(f){
  let L=0; const on=(i)=>{ L|=(1<<i); };
  if (f.mode!=='run') return 0;
  if (f.CD){ on(0); if (f.sdi_format===2) on(1); } else on(2);
  if (f.AUDIO1){ on(3); if (f.aes1_led>=DOLBY_AC3) on(7); }
  if (f.AUDIO2){ on(4); if (f.aes2_led>=DOLBY_AC3) on(8); }
  if (f.com) on(11);
  if (f.voled) on(12);
  return L;
}
function sigStatus(f){ if (f.sdi_format===0) return 2; if (!f.aes1_lock) return 4; if (!f.aes2_lock) return 8; if (!f.Astatus) return 16; return 1; }
function oidValue(f, w, o){
  switch(o){
    case 0x0201: return f.sdi_format;
    case 0x0202: return f.aes1_lock;
    case 0x0203: return f.aes2_lock;
    case 0x0204: return sigStatus(f);
    case 0x0205: return f.Astatus;                    // GET 2.5 answers with Astatus (voice-over lock)
    case 0x020A: return f.Astatus;
    case 0x0206: return f.Dolby_card_installed? 1 : 2;
    case 0x0207: return f.voiceover_status;
    case 0x0208: case 0x0209: return 0;               // voiceover_override — never written
    case 0x020B: return f.group_sel1;
    case 0x0301: return ((f.dim_level1<<8)|f.dim_level2)<<16>>16;
    case 0x0303: return f.voiceover_status_can;
    case 0x0304: return f.input_trim<<24>>24;
    case 0x0305: return 0;
    case 0x0306: return f.mode_select;
    case 0x0307: return f.voiceover_mix;
    case 0x0308: return f.dialnorm_enable;
    case 0x030A: return f.ramping_type;
    case 0x0105: return 'M6206A'; case 0x0106: return 'MD-SDI Audio Demultiplexer with Voiceover Mixing';
    case 0x0102: return 'Ward-Beck Systems'; case 0x0107: return 'Iss.1'; case 0x010B: return '1.04'; case 0x0104: return 'www.ward-beck.com';
  }
  return null;
}
function cacheFrom(f,w){ const c={}; Object.keys(OID).forEach(k=>{ const o=+k; const v=oidValue(f,w,o); if (v!==null) c[o]=v; }); return c; }
function valTxt(o, v){
  if (v===null || v===undefined) return '—';
  switch(o){
    case 0x0201: return ['Unlocked','SD','HD'][v]||v;
    case 0x0202: case 0x0203: return ['Unlocked','Locked-PCM','Locked-Dolby AC3','Locked-Dolby E'][v]||v;
    case 0x0205: return ['Unlocked','Locked-PCM','Locked-Dolby AC3','Locked-Dolby E'][v]||v;
    case 0x0204: return {1:'OK',2:'No SDI Input',4:'AES1 Unlocked',8:'AES2 Unlocked',16:'Voiceover Unlocked'}[v]||('0x'+hx(v));
    case 0x020A: return v? 'Locked':'Unlocked';
    case 0x0206: return v===1? 'OK':'Error';
    case 0x0207: return VO_ST[v]||v; case 0x0303: return VO_ST[v]||v;
    case 0x0208: return v? 'Enabled':'Disabled'; case 0x0209: return v? 'Yes':'No';
    case 0x020B: return 'Group '+(v+1);
    case 0x0301: case 0x0304: return (v>0?'+':'')+v+' dB';
    case 0x0306: return MODE_NAMES[v]||v; case 0x0307: return MIX_NAMES[v]||v;
    case 0x0308: return v? 'Enabled':'Disabled'; case 0x030A: return C.RAMP_NAMES[v]||v;
    case 0x0305: return 'Save';
  }
  return String(v);
}
function frameTime(n){ return (67 + 8*n) * C.CAN_BIT * C.STUFF; }

function simulate(){
  const S = deep(D.s0); const w=S.w, f=S.f;
  const ev = D.ev.slice().sort((a,b)=>a.t-b.t);
  const R = {snaps:[], can:[], notes:[], segs:[], worlds:[{t:0, w:deep(w)}], passes:0, cache0:deep(f.cache), cacheEv:[], gpiEv:[], end:null};
  let busy=0; const note=(t,s)=>R.notes.push({t,s});
  const tx = (t, type, oid, val, desc, len) => { const st=Math.max(t,busy), d=frameTime(len||6); busy=st+d; R.can.push({t:st, dur:d, dir:'tx', type, oid, val, desc}); f.com=1;
    if (oid!==undefined && oid!==null && val!==undefined){ f.cache[oid]=val; R.cacheEv.push({t:st+d, oid, v:val}); } return st+d; };
  const rx = (t, type, oid, val, desc) => { const st=Math.max(t,busy), d=frameTime(type===0x4A?6:3); busy=st+d; R.can.push({t:st, dur:d, dir:'rx', type, oid, val, desc}); f.com=0; f.rxCount++; return st+d; };
  const snap = t => { f.leds = ledsFrom(f); R.snaps.push({t, mode:f.mode, leds:f.leds, vo:f.voiceover, st:f.voiceover_status, stc:f.voiceover_status_can,
      g1:f.gpi1_active, g2:f.gpi2_active, gpo1:f.gpo1, gpo2:f.gpo2, vog:f.vog, dimg:f.dimg, vogT:vogTarget(f), dimT:dimTarget(f), ramp:f.ramping_type,
      rst:f.reset_enable, rc:f.reset_counter, r552:f.reset_552, grp:f.group_sel1, CD:f.CD, fmt:f.sdi_format, a1:f.aes1_lock, a2:f.aes2_lock, Ast:f.Astatus,
      dolby:f.Dolby_card_installed, pr:f.parameter_refresh, ai:f.AUDIO_INFORMATION, DimEnable:f.DimEnable, ms:f.mode_select, mix:f.voiceover_mix,
      dial:f.dialnorm_enable, rpa:f.remote_parameter_adjustment, pse:f.parameter_save_enabled, ec:f.error_checker, chirp:f.voiceover_led_on }); };

  /* ---- SHARC gains: RampAudioCalc once per SampleIRQ (48 kHz), closed form between passes ---- */
  function vogTarget(f){ return f.mode==='run' && f.voiceover? C.VOL64 : 0; }       // VoiceoverEnable = output1 (64) → volume[64]
  function dimTarget(f){ return f.mode==='run' && f.voiceover? Math.pow(10, -clamp(f.DimEnable,0,40)/20) : 1; }   // dim[DimEnable]
  let lastG = 0;
  function rampTo(t){ const n=(t-lastG)*C.FS; lastG=t; if (n<=0) return; const a=C.RAMP[f.ramping_type]??C.RAMP[2]; const k=Math.pow(1-a, n);
    const vt=vogTarget(f), dt=dimTarget(f); f.vog = vt + (f.vog-vt)*k; f.dimg = dt + (f.dimg-dt)*k; }

  /* ---- world-dependent hardware status ---- */
  function hwUpdate(t){
    const sdiOk = w.card && w.sdi && f.sdiAt>=0 && t>=f.sdiAt;
    f.CD = sdiOk? 1:0; f.sd_hd = (w.fmt==='SD')? 0x80 : 0;
    f.Astatus = (w.card && w.voIn && f.csAt>=0 && t>=f.csAt)? 1:0;
  }
  function typeStart(g,k,t){ // when the current content of group g pair k began (world changes so far)
    const ws=R.worlds; const cur=pairType(ws[ws.length-1].w,g,k); let st=-Infinity;
    for (let i=ws.length-1;i>=1;i--){ if (ws[i].t>t) continue; if (pairType(ws[i-1].w,g,k)!==cur){ st=ws[i].t; break; } }
    return st; }
  /* ---- one pass of while(1) in main() (v100w.c) ---- */
  function pass(t){
    rampTo(t);
    if (f.mode==='off'){ snap(t); return; }
    if (f.mode==='boot'){ if (t>=f.bootEnd) bootDone(t); else { snap(t); return; } }
    if (f.mode==='wdt'){ if (t>=f.wdtAt){ note(t,'watchdog reset (WDTCR = 0x08) — the AVR restarts main()'); startBoot(t); } snap(t); return; }
    R.passes++;
    hwUpdate(t);
    // DOLBY_CAT552_AUDIO_ERROR_CHECK
    if (!f.dolby_error_check_complete){
      if (w.catFault && w.cat){ f.cat_ok=0; if (f.cat_err<=C.CAT_ERR) f.cat_err++; else { f.dolby_audio_cat_error=1; f.cat_err=0; f.dolby_error_check_complete=1; note(t,'DOLBY_CAT552_AUDIO_ERROR_CHECK: 1001 passes of ALTERA18 bit 6 → dolby_audio_cat_error'); } }
      else { f.cat_err=0; if (f.cat_ok<=C.CAT_ERR) f.cat_ok++; else { f.dolby_audio_cat_error=0; f.cat_ok=0; f.dolby_error_check_complete=1; } }
    }
    if (f.dolby_audio_cat_error){ f.dolby_audio_cat_error=0; f.reset_enable=1; f.reset_counter=C.RESET_VEC; f.clocks_stable=0; f.reset_552=0; note(t,'dolby_audio_cat_error → reset_552 = 0, reset_counter = 100'); }
    if (f.CD && !f.reset_enable){
      // DOLBY_DECODER_STATUS → RESET_DOLBY
      if (w.cat){ f.Dolby_card_installed=1; f.dolby_counter=0; }
      else { if (f.dolby_counter<=C.DOLBY_ERR) f.dolby_counter++; else { f.Dolby_card_installed=0; f.dolby_counter=0; f.reset_enable=1; f.reset_counter=C.RESET_VEC; f.clocks_stable=0; f.reset_552=0; note(t,'RESET_DOLBY: 2001 passes without ALTERA18 bit 7 → Dolby_card_installed = NO, decoder reset'); } }
      // DSP_SYNC_DETECTOR
      if (f.dolby_error_check_complete && !f.dsp_sync_detected){
        if (w.dspOk){ f.dsp_sync_detected=1; f.dsp_sync_detector_disable=0; }
        else { f.reset_enable=1; f.reset_counter=C.RESET_VEC; f.clocks_stable=0; f.reset_552=0; note(t,'DSP_SYNC_DETECTOR: no AAAAAA/BBBBBB echo → SHARC_RESET(1000) on PC0 (no net on ISS1)'); }
      }
    }
    // READ_GS1560_STATUS, PROCESS_SDI_LOCK_STATUS
    f.sdi_format = f.CD? (f.sd_hd? 1 : 2) : 0;
    // PROCESS_AUDIO_INFORMATION
    const grpT = [pairType(w, f.group_sel1, 0), pairType(w, f.group_sel1, 1)];
    f.AUDIO1 = (f.CD && grpT[0]!=='none')?1:0; f.AUDIO2 = (f.CD && grpT[1]!=='none')?1:0;
    let AI=0xFF; const dolbyHere = f.aes1_led>=DOLBY_AC3 || f.aes2_led>=DOLBY_AC3;
    if (!dolbyHere){ if (!f.AUDIO2) AI&=~0x80; if (!f.AUDIO1) AI&=~0x40; AI&=~0x20; AI&=~0x10; AI&=~0x0F; if (f.AUDIO2) AI|=0x08; if (f.AUDIO1) AI|=0x04; }
    if (f.reset_552===0) AI=0; f.AUDIO_INFORMATION=AI;
    // READ_GPI
    const p1 = (w.card && w.gpi1 && hasPos(w,'gpio1'))? 0 : 1, p2 = (w.card && w.gpi2 && hasPos(w,'gpio2'))? 0 : 1;
    if (p1!==f.pgpi1_status){ f.pgpi1_status=p1; f.gpi1_active = p1? 0:1; if (f.gpi2_active){ f.gpi2_active=0; R.gpiEv.push({t, s:'GPI-1 edge clears gpi2_active'}); } R.gpiEv.push({t, s:'gpi1_active = '+(p1?'NO':'YES')}); }
    if (p2!==f.pgpi2_status){ f.pgpi2_status=p2;
      if (!p2){ if (!f.gpi2_pressed){ f.gpi2_active = f.gpi2_active? 0:1; R.gpiEv.push({t, s:'GPI-2 closure toggles gpi2_active → '+(f.gpi2_active?'YES':'NO')}); } f.gpi2_pressed=1; }
      else if (f.gpi2_pressed) f.gpi2_release=1; }
    // DEBOUNCE_GPI2
    if (f.gpi2_release){ if (f.gpi2_counter<C.GPI2_DEB) f.gpi2_counter++; else { f.gpi2_counter=0; f.gpi2_release=0; f.gpi2_pressed=0; } }
    // ALTERA_TRANSLATE_UART0
    if (f.pod31_mode){
      if (f.gpi1_active && f.gpi2_active){ f.gpo1=1; f.voiceover=0; f.voiceover_status=2; f.voiceover_status_can=0; f.gpo2=f.voiceover_led_on; f.voled=f.voiceover_led_on; }
      else if (f.gpi1_active){ f.gpo1=1; f.gpo2=1; f.voiceover=1; f.voled=1; f.voiceover_status=1; f.voiceover_status_can=1; }
      else if (f.gpi2_active){ f.gpo2=1; f.gpo1=0; f.voiceover=1; f.voled=1; f.voiceover_status=2; f.voiceover_status_can=1; }
      else { f.gpo1=0; f.gpo2=0; f.voiceover=0; f.voled=0; f.gpi2_active=0; f.voiceover_status=0; f.voiceover_status_can=0; }
    } else { f.gpo1=0; f.gpo2=0; f.voiceover=0; f.voled=0; f.gpi2_active=0; f.voiceover_status=0; f.voiceover_status_can=0; }
    if (f.voiceover){ f.VoiceoverEnable=64; f.swap=0x80; f.DimEnable = DIM_Table(f.dim_level1, f.dim_level2); }
    else { f.VoiceoverEnable=0; f.swap=0; f.DimEnable=0; }
    if (!f.reset_enable){
      if (f.dialnorm_enable!==f.pdialnorm_enable){ f.pdialnorm_enable=f.dialnorm_enable; f.reset_552=0; f.dialnorm_settings = f.dialnorm_enable? 0x10 : 0xE0; note(t,'dialnorm_enable changed → reset_552 = 0 for one pass (CAT552 RESET_552 pulse)'); }
      else f.reset_552=0xFF;
    }
    // ALTERA_read → PROCESS_DIP_SWITCHES
    const a13 = ALTERA13(w);
    f.os0 = f.pod31_mode?1:0; f.pod31_mode=1;
    f.audio1 = ((a13&0x80)?4:0) + ((a13&0x40)?2:0); f.group_sel1 = f.audio1>>1;
    f.remote_parameter_adjustment = (a13&0x02)?0:1; f.parameter_save_enabled = (a13&0x01)?0:1;
    // PROCESS_AUDIO_FORMAT — non_audio_detector flags in ALTERA14/15
    const fmtOf = (k) => { const ty=pairType(w,f.group_sel1,k); if (ty==='none'||ty==='pcm') return PCM; const lb=lastBurst(ty,t);
      if (t-lb > C.DET_HOLD/C.FS || lb < typeStart(f.group_sel1,k,t)) return PCM;
      return ty==='dolbyE'? DOLBY_E : ty==='ac3'? DOLBY_AC3 : COMPRESSED; };
    f.aes1_led = fmtOf(0); f.aes2_led = fmtOf(1);
    // ALTERA_SORT / ALTERA_read_write / ALTERA_ALIGNMENT_CHECK
    if (w.alignFault){ if (f.error_checker<=C.ALIGN_ERR) f.error_checker++; else { f.error_checker=0; f.mode='wdt'; f.wdtAt=t+C.WDT; f.leds=0; note(t,'ALTERA_ALIGNMENT_CHECK: 1001 bad "V201" echoes → while (error0 == YES) NOP(); no WDR'); snap(t); return; } }
    else f.error_checker=0;
    // AUDIO1/2 → aes locks (REFRESH_LEDS sets aes*_lock)
    f.aes1_lock = f.AUDIO1? (f.aes1_led>=DOLBY_AC3? f.aes1_led : 1) : 0;
    f.aes2_lock = f.AUDIO2? (f.aes2_led>=DOLBY_AC3? f.aes2_led : 1) : 0;
    // PROCESS_GROUP_COMPARE1, PROCESS_HD_SD_COMPARE, TRANSLATE_RESET_VECTOR
    f.ERROR5 = (f.group_sel1!==f.previous_group_sel1)?0:1; f.previous_group_sel1=f.group_sel1;
    f.ERROR6 = (f.sd_hd!==f.previous_sd_hd)?0:1; f.previous_sd_hd=f.sd_hd;
    if (!f.ERROR5 || !f.ERROR6 || !f.CD){
      if (!f.reset_enable && f.CD) note(t, 'TRANSLATE_RESET_VECTOR: '+(!f.ERROR5?'group changed':'SD/HD changed')+' → reset_enable, CAT552 held in reset, outputs muted for 100 passes');
      f.reset_enable=1; f.reset_counter=C.RESET_VEC; f.clocks_stable=0; f.reset_552=0;
    } else if (f.reset_enable && f.reset_counter){ f.reset_counter--; }
    else { if (f.reset_enable){ f.cat_err=0; f.cat_ok=0; f.dolby_error_check_complete=0; f.dolby_audio_cat_error=0; f.dsp_sync_detected=0; f.dsp_sync_detector_disable=1; }
      f.clocks_stable=1; f.reset_enable=0; f.reset_552=0xFF; }
    // NO_LOCK_CHIRP, METADATA_CHIRP
    if (!f.no_lock_counter){ f.voiceover_led_on = f.voiceover_led_on?0:1; f.no_lock_counter = f.voiceover_led_on? C.CHIRP_ON : C.CHIRP_OFF; } else f.no_lock_counter--;
    if (!f.metadata_counter){ f.metadata_counter=C.META_CHIRP; f.format_alternate = f.format_alternate===DOLBY_AC3? DOLBY_E : DOLBY_AC3; } else f.metadata_counter--;
    // CAN_FUNCTIONS → PARAMETER_UPDATE
    parameterUpdate();
    if (f.save_settings){ f.save_settings=0; f.ee={valid:1, mode_select:f.mode_select, dim1:f.dim_level1, dim2:f.dim_level2, mix:f.voiceover_mix, dial:f.dialnorm_enable, ramp:f.ramping_type};
      note(t,'SAVE_INFORMATION_EEPROM: bytes 10 = 0xAA, 13 mode_select, 14/15 dim_level, 16 voiceover_mix, 17 dialnorm_enable, 18 ramping_type'); }
    snap(t);
  }
  function DIM_Table(m,l){ const d=(m<<8)|l; if (!d) return 0; return ((l^0xFF)+1)&0xFF; }
  function parameterUpdate(){
    if (f.parameter_change) return; const p=f.prev;
    const ch=(k, cur, ref, sig)=>{ if (cur!==p[k]){ p[k]=cur; f.parameter_refresh=ref; f.parameter_change=1; if (sig) f.signal_status_change=1; return true; } return false; };
    if (ch('aes1', f.aes1_lock, 1, 1)) return; if (ch('aes2', f.aes2_lock, 2, 1)) return; if (ch('vs', f.voiceover_status, 5)) return;
    if (ch('Ast', f.Astatus, 6, 1)) return; if (ch('sdi', f.sdi_format, 0, 1)) return; if (ch('vsc', f.voiceover_status_can, 7)) return;
    if (ch('mode', f.mode_select, 3)) return; if (ch('grp', f.group_sel1, 8)) return; if (ch('dolby', f.Dolby_card_installed, 4)) return;
    if (f.signal_status_change){ f.parameter_refresh=9; f.parameter_change=1; f.signal_status_change=0; return; }
    if (f.parameter_tx_complete){ f.parameter_refresh = f.parameter_refresh>=9? 0 : f.parameter_refresh+1; }
  }
  /* CAN_TX_TIMER from timer1_ovf_isr */
  function canTxTimer(t){
    if (f.mode!=='run') return;
    if (!f.start_parameter_dump){ const e=tx(t, 0x11, null, undefined, 'TRAP CANTRAP_RESTART → CANADDR_TRAP (start_parameter_dump = NO)', 1);
      const r=rx(e+0.002, 0x45, null, undefined, 'frame controller re-reads the card: GET_NUMPARAMS (reaction to the trap — inferred)'); tx(r+0.00015, 0xC5, null, undefined, 'NUMPARAMS = 22 → start_parameter_dump = YES', 3); f.start_parameter_dump=1; return; }
    const pr=f.parameter_refresh, o=PR_OID[pr], v=oidValue(f,w,o);
    tx(t, 0x10, o, v, `REPORT_PARAM ${PR[pr]} → ${oidTxt(o)} ${OID[o].n} = ${valTxt(o,v)}`);
    f.parameter_tx_complete=1; f.parameter_change=0;
  }
  /* DASHBOARD_RESPONSE_SETUP for SET_PARAM / GET_PARAM (from can_rx_isr) */
  function setParam(t, o, v){
    const end = rx(t, 0x4A, o, v, `SET_PARAM ${oidTxt(o)} ${OID[o].n} ← ${valTxt(o,v)}`);
    const rpa = f.remote_parameter_adjustment; let echo=v, d='';
    switch(o){
      case 0x0301: if (rpa){ const u=v&0xFFFF; f.dim_level1=u>>8; f.dim_level2=u&0xFF; d=`dim_level1/2 = 0x${hx(f.dim_level1)}${hx(f.dim_level2)}`; } else { echo=oidValue(f,w,o); d='refused (remote_parameter_adjustment = NO): echoes '+echo; } break;
      case 0x0303: if (rpa){ if (v===2){ f.voiceover_status_can=2; f.gpi2_active=1; d='voiceover_status_can = OVERRIDE, gpi2_active = YES'; } else if (v===1){ f.voiceover_status_can=1; f.gpi1_active=1; f.gpi2_active=0; d='voiceover_status_can = ACTIVE, gpi1_active = YES, gpi2_active = NO'; } else { f.voiceover_status_can=0; f.gpi1_active=0; f.gpi2_active=0; d='voiceover_status_can = INACTIVE, gpi1_active = gpi2_active = NO'; } }
        else { echo = f.gpi2_active? 2 : (f.gpi1_active? 1 : 0); d='refused: echoes the GPI state '+VO_ST[echo]; } break;
      case 0x0304: if (rpa){ f.input_trim=v&0xFF; d='input_trim = '+v+' (stored, never used)'; } else { echo=oidValue(f,w,o); d='refused'; } break;
      case 0x0305: f.save_settings = (v^0xFF)&0xFF; d=`save_settings = INVERT_DATA(${v}) = 0x${hx(f.save_settings)}`; break;
      case 0x0306: if (rpa){ f.mode_select=v; d='mode_select = '+v+' ('+MODE_NAMES[v]+')'; } else { echo=f.mode_select; d='refused'; } break;
      case 0x0307: if (rpa){ f.voiceover_mix=v; d='voiceover_mix = '+v; } else { echo=f.voiceover_mix; d='refused'; } break;
      case 0x0308: if (rpa){ f.dialnorm_enable = f.pod31_mode? v : 0; echo=f.dialnorm_enable; d='dialnorm_enable = '+echo; } else { echo=f.dialnorm_enable; d='refused'; } break;
      case 0x030A: if (rpa){ f.ramping_type=v; d='ramping_type = '+v+' ('+C.RAMP_NAMES[v]+')'; } else { echo=f.ramping_type; d='refused'; } break;
      case 0x020B: if (rpa){ let g=v; if (g>3) g=f.previous_group_sel1; f.group_sel1=g; f.audio1=g<<1; d='group_sel1 = '+g+' (PROCESS_DIP_SWITCHES writes it back from SW1/SW2 next pass)'; } else { echo=f.group_sel1; d='refused'; } break;
      default: d='no handler → length 1 (CANRESP_UNSUPPORTED)'; echo=null;
    }
    tx(end+0.00015, 0xCA, echo===null? null : o, echo===null? undefined : echo, `SET_PARAM resp ${oidTxt(o)} = ${echo===null?'—':valTxt(o,echo)} · ${d}`);
    return d;
  }
  function getParam(t, o){ const end=rx(t, 0x49, o, undefined, `GET_PARAM ${oidTxt(o)}`); const v=oidValue(f,w,o); const s = typeof v==='string';
    tx(end+0.00015, 0xC9, o, v, `GET_PARAM resp ${oidTxt(o)} ${OID[o]?OID[o].n:''} = ${s? '"'+v+'" (multi-frame)': valTxt(o,v)}`, s? 8 : 6); }
  function startBoot(t){ f.mode='boot'; f.bootEnd=t+C.BOOT.reduce((a,b)=>a+b[0],0); let a=t; C.BOOT.forEach(([d,l])=>{ R.segs.push({t0:a, t1:a+d, label:l}); a+=d; });
    f.leds=0; f.start_parameter_dump=0; f.vog=0; f.dimg=1; f.voiceover=0; f.gpi1_active=0; f.gpi2_active=0; f.gpi2_pressed=0; f.gpo1=0; f.gpo2=0; f.voled=0;
    f.pgpi1_status=1; f.pgpi2_status=1; f.com=0; f.error_checker=0; f.dsp_sync_detected=0; f.dolby_error_check_complete=0; f.prev={}; f.parameter_refresh=0; f.parameter_change=0; }
  function bootDone(t){
    f.mode='run'; f.Dolby_card_installed = w.cat?1:0; f.pod31_mode = f.Dolby_card_installed;
    f.mode_select=3; f.dim_level1=0xFF; f.dim_level2=0xEC; f.voiceover_mix=0; f.dialnorm_enable=0; f.ramping_type=2; f.input_trim=0;
    const a13=ALTERA13(w);
    if (!(a13&1) && f.ee.valid){ f.mode_select=f.ee.mode_select; f.dim_level1=f.ee.dim1; f.dim_level2=f.ee.dim2; f.voiceover_mix=f.ee.mix; f.dialnorm_enable=f.ee.dial; f.ramping_type=f.ee.ramp; note(t,'RESTORE_INFORMATION_EEPROM: byte 10 = 0xAA → settings restored (SW8 ON)'); }
    f.pdialnorm_enable=0xFF; f.reset_enable=1; f.reset_counter=C.RESET_VEC; f.reset_552=0;
    f.previous_group_sel1=dipGroup(w); f.group_sel1=dipGroup(w); f.previous_sd_hd=(w.fmt==='SD')?0x80:0;
    f.sdiAt = (w.card&&w.sdi)? t : -1; f.csAt = (w.card&&w.voIn)? t : -1;
    note(t,'main(): CANinit(); DATA_SETUP(); clocks_stable = YES — entering while(1)');
  }
  /* ---- events ---- */
  function applyEvent(e){
    const t=e.t;
    if (e.kind==='world'){ const before=deep(w); e.fn(w);
      if (!before.sdi && w.sdi || before.fmt!==w.fmt) f.sdiAt = t + C.SDI_LOCK; if (!w.sdi) f.sdiAt=-1;
      if (!before.voIn && w.voIn) f.csAt = t + C.CS_LOCK; if (!w.voIn) f.csAt=-1;
      if (before.card && !w.card){ f.mode='off'; f.leds=0; f.com=0; f.vog=0; f.dimg=1; }
      if (!before.card && w.card) { startBoot(t); f.sdiAt=-1; }
      R.worlds.push({t, w:deep(w)}); }
    else if (e.kind==='reboot'){ rx(t, 0x43, null, undefined, 'REBOOT → reboot_device = YES (watchdog restart)'); startBoot(t+0.02); }
    else if (e.kind==='set'){ if (f.mode!=='run'){ note(t,'card not running — SET_PARAM unanswered'); return; } e.res = setParam(t, e.oid, e.val); f.start_parameter_dump=1; }
    else if (e.kind==='open'){ if (f.mode!=='run'){ note(t,'card not running — DashBoard waits'); return; }
      let tt=t; const r1=rx(tt,0x45,null,undefined,'GET_NUMPARAMS'); tx(r1+0.00015, 0xC5, null, undefined, 'NUMPARAMS = 22 → start_parameter_dump = YES', 3); f.start_parameter_dump=1; tt=busy+0.0004;
      const m=MENUS[e.menu]; (m.noSave && !f.parameter_save_enabled ? m.noSave : m.oids).forEach(o=>{ getParam(tt,o); tt=busy+0.0004; }); }
    snap(t);
  }

  /* ---- run the second ---- */
  if (f.cache===null) f.cache = cacheFrom(f,w);
  let ei=0, tp=f.nextPass, tr=f.nextRep, t0=f.t0next;
  if (f.mode==='run' && w.sdi && f.sdiAt<0) f.sdiAt=0; if (f.mode==='run' && w.voIn && f.csAt<0) f.csAt=0;
  hwUpdate(0); snap(0);
  for (let guard=0; guard<100000; guard++){
    const te = ei<ev.length? ev[ei].t : Infinity;
    const tn = Math.min(tp, tr, t0, te);
    if (tn>=1) break;
    if (te===tn){ applyEvent(ev[ei]); ei++; continue; }
    if (t0===tn){ // timer0 1-second CAN message count (dashboard_initializing)
      if (f.rxCount < 10){ f.quiet++; if (f.quiet>=3 && f.init){ f.init=0; note(t0,'timer0: < 10 CAN messages for 3 s → dashboard_initializing = NO'); } } else { if (!f.init) note(t0,'timer0: '+f.rxCount+' CAN messages this second → dashboard_initializing = YES (reports slow to ≈1 s)'); f.init=1; f.quiet=0; }
      f.rxCount=0; t0+=1; continue; }
    if (tr===tn){ canTxTimer(tr); tr += f.init? C.REP_INIT : C.REP_IDLE; continue; }
    pass(tp); tp += C.LOOP_T;
  }
  rampTo(1);
  f.nextPass=tp-1; f.nextRep=tr-1; f.t0next=t0-1;
  R.end={w:deep(w), f:deep(f)};
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R=simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0, hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
function cacheAt(t){ const R=sim(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.oid]=e.v; } return c; }
/* gains at any instant (closed form from the last pass) */
function gainsAt(t){ const sn=snapAt(Math.max(0,t)); const n=Math.max(0,(t-sn.t)*C.FS); const k=Math.pow(1-(C.RAMP[sn.ramp]??C.RAMP[2]), n);
  return {vog: sn.vogT + (sn.vog-sn.vogT)*k, dimg: sn.dimT + (sn.dimg-sn.dimT)*k, sn}; }
/* output level model (dBFS) — tone levels in, SHARC SampleIRQ mix matrix out */
function outLevels(t){
  const w=worldAt(t), dl1=C.DELAY1/C.FS, dl4=C.DELAY4/C.FS;
  const lvl = (tt, k) => { // k: 0 AES1 L, 1 AES1 R, 2 AES2 C, 6 AES4 A, 7 AES4 B
    const g = gainsAt(Math.max(0,tt)); const sn=g.sn; if (sn.mode!=='run' || !sn.ai) return null;
    const ww = worldAt(Math.max(0,tt-(k>=6?dl1:FRAME_T)));
    const vo = (ww.voIn && sn.Ast)? Math.pow(10, ww.voLvl/20) : 0;
    const vl = vo, vr = ww.voSrc==='left'? 0 : vo;
    let voc=0; const ms=sn.ms, mix=sn.mix;
    const voFor = ch => { if (ms===3) return (vl+vr)/2; if (ms===1) return vl; if (ms===2) return vr; return ch===1||ch===7? vr : ch===2? (vl+vr)/2 : vl; };
    const inMix = (k===6||k===7) || (k<=1 && mix!==2) || (k===2 && mix>=1);
    if (inMix) voc = voFor(k) * g.vog;
    let pg=0;
    if (k>=6){ const ty=pairType(ww, sn.grp, 0); if (ty==='pcm') pg=Math.pow(10, ww.pgm/20); }
    else { const ty=pairType(ww, sn.grp, 1); const decoding = sn.dolby && sn.r552 && (ty==='dolbyE'||ty==='ac3'); if (decoding) pg=Math.pow(10, ww.dec/20); }
    const a = Math.sqrt(Math.pow(pg*g.dimg,2) + voc*voc);
    return a<=0? -120 : Math.min(0, db(a));
  };
  return { aes1L: lvl(t,0), aes1R: lvl(t,1), aes2C: lvl(t,2), aes4A: lvl(t-dl4,6), aes4B: lvl(t-dl4,7) };
}

/* =====================================================================
   USER ACTIONS — each one becomes an event at the playhead and logs the code path it takes
   ===================================================================== */
function addEvent(e){ let t=SIM.t; if (t>0.94){ rollSecond(); t=0.02; } e.t=Math.max(0.0005,t); D.ev.push(e); D.ver++; return e.t; }
function rollSecond(){ const R=sim(); D.s0={w:deep(R.end.w), f:deep(R.end.f)}; D.ev=[]; D.second++; D.ver++; SIM.seek(0); }
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, sec:D.second, name, trace:tr}); if (D.log.length>60) D.log.length=60;
  if (!SIM.playing && D.ui.follow){ const last=D.ev.length? D.ev[D.ev.length-1].t : SIM.t; SIM.seek(Math.min(0.999, Math.max(SIM.t, last)+0.03)); } else SIM.refresh();
}
const worldEv = (label, fn) => addEvent({kind:'world', label, fn});
const fwAt = t => snapAt(t);
const A = {
  dip(i){ const w=worldAt(SIM.t); const on=!w.dip[i]; act(`SW${i+1} → ${on?'ON':'OFF'}`, tr=>{
    worldEv('dip', w2=>{ w2.dip[i]=on; });
    const w2=Object.assign({}, w, {dip:w.dip.map((d,k)=>k===i?on:d)}); const a13=ALTERA13(w2);
    tr(`SW1 position ${i+1} ${on?'closes to GNDD':'opens (pulled up)'} → FPGA pin ${181+i} dip${i+1} → cntrl_status[${i}] → shifter_out_48bit (LSB first) → read_data2() → ALTERA13 bit ${7-i}. ALTERA13 = 0x${hx(a13)} (${bin8(a13)})`);
    if (i<=1) tr(`PROCESS_DIP_SWITCHES(): audio1 = (ALTERA13&BIT7?4:0)+(ALTERA13&BIT6?2:0) = ${((a13&0x80)?4:0)+((a13&0x40)?2:0)} → group_sel1 = ${dipGroup(w2)} (Group ${dipGroup(w2)+1}); audio2 = audio1. Next pass PROCESS_GROUP_COMPARE1() sees the change → ERROR5 = 0 → TRANSLATE_RESET_VECTOR(): reset_enable, reset_552 = 0, reset_counter = 100 → outputs muted ≈ ${SIM.fmtDur(C.RESET_VEC*C.LOOP_T)}.`);
    else if (i===6) tr(`ALTERA13 bit 1 = ${(a13>>1)&1} → remote_parameter_adjustment = ${(a13&2)?'NO — every DashBoard SET is answered with the old value':'YES — DashBoard may change settings'}. (The manual calls SW1 the “Dip Switch Override”; this firmware reads SW7.)`);
    else if (i===7) tr(`ALTERA13 bit 0 = ${a13&1} → parameter_save_enabled = ${(a13&1)?'NO (Card Settings shows Menu5OID: no Save)':'YES (Menu2OID with Settings: Save)'}; at power-up main() calls RESTORE_INFORMATION_EEPROM() only when this bit is 0.`);
    else tr(`ALTERA13 bit ${7-i} is not read by v1.04: PROCESS_DIP_SWITCHES() only looks at bits 7, 6, 1, 0. The manual's Group Selector 2 (SW4/SW5) and Voiceover Input Mix (SW7/SW8) tables are not implemented.`);
  }); },
  cat(){ const w=worldAt(SIM.t); act(w.cat? 'Remove the CAT552 decoder module' : 'Fit the CAT552 decoder module', tr=>{
    worldEv('cat', w2=>{ w2.cat=!w.cat; });
    if (w.cat) tr(`ALTERA18 bit 7 (DOLBY_INSTALLED, dolby.h) goes low. While CD = 1 each pass DOLBY_DECODER_STATUS() → RESET_DOLBY() counts dolby_counter to DOLBY_ERROR_COUNTER (2000 passes ≈ ${SIM.fmtDur(2001*C.LOOP_T)}) before Dolby_card_installed = NO and a decoder reset. Until then DashBoard still says “Dolby Decoder OK”.`);
    else tr('ALTERA18 bit 7 high → next pass RESET_DOLBY(): Dolby_card_installed = YES, dolby_counter = 0. (Hot-plugging the module is not a documented operation — inferred.)');
    tr('pod31_mode stays YES either way: main() sets it from Dolby_card_installed, but PROCESS_DIP_SWITCHES() forces pod31_mode = YES on every pass.');
  }); },
  card(){ const w=worldAt(SIM.t); act(w.card? 'Pull the card from the frame' : 'Insert the card', tr=>{
    worldEv('card', w2=>{ w2.card=!w.card; });
    if (w.card) tr('Power gone: LEDs, GPO tallies, CAN and the SHARC stop. The relays/AES outputs go silent.');
    else { tr('Power-up: the EP1C12 loads from its serial flash (U7) while the AVR runs main():'); C.BOOT.forEach(([d,l])=>tr(`  ${SIM.fmtDur(d)} — ${l}`)); tr('Then while(1) starts: reset_enable holds the CAT552 in reset for 100 passes; the first timer1 report is a TRAP CANTRAP_RESTART.'); }
  }); },
  reboot(){ act('DashBoard: Reboot', tr=>{ addEvent({kind:'reboot'}); tr('CANMSG_REBOOT → DASHBOARD_RESPONSE_SETUP: reboot_device = YES → CAN_FUNCTIONS stops WDR → watchdog reset ≈16 ms → main() from the top.'); }); },
  sdi(){ const w=worldAt(SIM.t); act(w.sdi? 'Unplug SDI IN' : 'Plug SDI IN', tr=>{
    worldEv('sdi', w2=>{ w2.sdi=!w.sdi; });
    if (w.sdi) tr('GS1559 loses lock: ~RC_BYP / LOCK_60 / SMPTE low → READ_GS1560_STATUS(); PROCESS_SDI_LOCK_STATUS(): ERROR_LED_ON, SD/HD off, CD = 0, sdi_format = NO_LOCK → TRANSLATE_RESET_VECTOR() holds the decoder in reset; Signal Status → “No SDI Input”.');
    else tr(`GS1574A equaliser + GS1559 lock (≈${SIM.fmtDur(C.SDI_LOCK)} ${inf}) → CD = 1, SD_LED_ON${w.fmt==='HD'?', HD_LED_ON':''}; reset_counter counts 100 passes before reset_552 = 0xFF and the outputs open.`);
  }); },
  fmt(){ const w=worldAt(SIM.t); const nf=w.fmt==='HD'?'SD':'HD'; act(`SDI source → ${VF[nf].name}`, tr=>{
    worldEv('fmt', w2=>{ w2.fmt=nf; });
    tr(`sd_hd (PIND bit 7 from GS1559 SD/~HD) changes → PROCESS_HD_SD_CONTROL() switches PG4 (20/10-bit) → PROCESS_HD_SD_COMPARE(): ERROR6 = 0 → decoder reset and ≈${SIM.fmtDur(C.RESET_VEC*C.LOOP_T)} mute.`);
  }); },
  content(g,k,ty){ act(`Group ${g+1} AES${k+1} content → ${TYPES[ty]}`, tr=>{
    worldEv('content', w2=>{ w2.grp[g][k]=ty; });
    const sel=fwAt(SIM.t).grp;
    if (g!==sel) tr(`Group ${g+1} is not the selected group (Group ${sel+1}); the FPGA ignores it.`);
    else if (ty==='dolbyE'||ty==='ac3'||ty==='other') tr(`non_audio_detector.vhd waits for 4 zero words then Pa/Pb (F872/4E1F, 6F872/54E1F or 96F872/A54E1F) and latches Pc bits 14..8 → ALTERA${14+k} bit ${k?7:5} (compressed) + data type ${DT[ty]}. PROCESS_AUDIO_FORMAT(): ${ty==='dolbyE'?'28 = PC_DOLBY_E':ty==='ac3'?'1 = PC_DOLBY_AC3':'neither → COMPRESSED (no DOLBY LED)'}${k? '. This pair feeds the CAT552 (cat_input1 is forced to NO2−NO1 = 1).':'. Pair 1 is not routed to the CAT552 in v1.04, so it plays out of AES4 as data.'}`);
    else tr(`The detector's flag holds for 8191 LRCLK periods (${SIM.fmtDur(C.DET_HOLD/C.FS)}) after the last burst, then PROCESS_AUDIO_FORMAT() sees PCM.${ty==='none'? ' AUDIO'+(k+1)+' = NO_LOCK → AES'+(k+1)+' LED off, Signal Status “AES'+(k+1)+' Unlocked”.':''}`);
  }); },
  voIn(){ const w=worldAt(SIM.t); act(w.voIn? 'Unplug VOICEOVER IN' : 'Plug VOICEOVER IN', tr=>{
    worldEv('voIn', w2=>{ w2.voIn=!w.voIn; });
    tr(`BNC7 → H3 → FPGA → CS8416 (U18) RXP0 → I2S → AD1895 SRC (U17, to 48 kHz) → FPGA SRCDATA1 → SHARC TDM slots 8/9. Each pass: Astatus = INVERT_DATA(CS8416_READ_LOCK_ALL()) & INPUT1_MASK = ${w.voIn?0:1} → PARAMETER_UPDATE reports VOICEOVER_LOCKED (OID 2.10) and Signal Status.`);
    if (w.voIn) tr('The voice-over state machine does not look at Astatus: a GPI still dims the programme even with no voice-over audio.');
  }); },
  gpi1(){ const w=worldAt(SIM.t); act(w.gpi1? 'GPI-1 contact opens' : 'GPI-1 contact closes (automation)', tr=>{
    if (!hasPos(w,'gpio1')){ tr('No GPI/O 1 block on this rear module.'); return; }
    worldEv('gpi1', w2=>{ w2.gpi1=!w.gpi1; });
    tr(`TB position 9 (+ = P1-51 AES4P) → R130 → PC2 (GPIO1_P, pin 37). READ_GPI(): gpi1_status changes → gpi1_active = ${w.gpi1?'NO':'YES'}; and because GPI-1 moved, gpi2_active = NO (override cleared).`);
    tr(`ALTERA_TRANSLATE_UART0(): ${w.gpi1? 'gpi1 = gpi2 = NO → voiceover = NO, GPO tallies off, VOICEOVER_LED_OFF, DimEnable = UNITY_DIM_GAIN' : 'gpi1 = YES, gpi2 = NO → voiceover = YES, GPI1_TALLEY_ON (PC1 → Q2 → P1-49), GPI2_TALLEY_ON, VOICEOVER_LED_ON; VoiceoverEnable = output1 (64), DimEnable = DIM_Table(dim_level1, dim_level2)'} → ALTERA_SORT() bytes 54/55 → SHARC altera_data[13] → RampAudioCalc() ramps voiceover_gain and dim_gain (${C.RAMP_NAMES[fwAt(SIM.t).ramp]}).`);
  }); },
  gpi2(){ const w=worldAt(SIM.t); act('GPI-2 tap (control panel button)', tr=>{
    if (!hasPos(w,'gpio2')){ tr('This rear module has no GPI/O 2 block (T6305 position 8 is “NOT USED”): the override input cannot be reached.'); return; }
    const t1=addEvent({kind:'world', label:'gpi2 down', fn:w2=>{ w2.gpi2=true; }}); D.ev.push({kind:'world', label:'gpi2 up', t:Math.min(0.999,t1+0.25), fn:w2=>{ w2.gpi2=false; }}); D.ver++;
    const f=fwAt(SIM.t);
    tr('TB position 8 (+ = P1-58 AES7P) → R27 → PE1 (GPIO2_P, pin 3). READ_GPI(): closure with gpi2_pressed = NO → gpi2_active toggles; gpi2_pressed = YES. On release DEBOUNCE_GPI2() waits SWITCH2_DEBOUNCE = 50 passes (≈'+SIM.fmtDur(50*C.LOOP_T)+') before a new press counts.');
    const g2=!f.g2;
    if (f.g1 && g2) tr('gpi1 = gpi2 = YES → voiceover = NO, voiceover_status = OVERRIDE: the programme comes back up, GPO-1 stays on, GPO-2 and the VOICE OVER LED chirp (NO_LOCK_CHIRP: 10 passes on, 70 off).');
    else if (f.g1 && !g2) tr('gpi2_active = NO with GPI-1 held → voice-over ACTIVE again.');
    else if (!f.g1 && g2) tr('gpi1 = NO, gpi2 = YES → voiceover = YES and voiceover_status = OVERRIDE (reported on OID 2.7), voiceover_status_can = ACTIVE (OID 3.3). The “override” input alone switches the voice-over ON.');
    else tr('gpi2_active = NO and GPI-1 open → INACTIVE.');
  }); },
  set(o, v){ const cur=cacheAt(SIM.t)[o]; act(`DashBoard: ${OID[o].n} = ${valTxt(o,v)}`, tr=>{
    const f=fwAt(SIM.t); if (f.mode!=='run'){ tr('The card is not running; DashBoard gets no answer.'); }
    const e={kind:'set', oid:o, val:v}; addEvent(e);
    tr(`DashBoard → frame controller (Ethernet) → CAN SET_PARAM 0x4A, data [00 ${hx(o>>8)} ${hx(o&0xFF)} 02 ${hx((v>>8)&0xFF)} ${hx(v&0xFF)}] → can_rx_isr() → DASHBOARD_RESPONSE_SETUP().`);
    if (!f.rpa && o!==0x0305) tr('remote_parameter_adjustment = NO (SW7 OFF): the reply echoes the old value '+valTxt(o,cur)+' and nothing changes.');
    const d={0x0301:'dim_level1 = data[4], dim_level2 = data[5] → next pass DIM_Table() → DimEnable = −dB → ALTERA_SORT byte 55 → SHARC dim[DimEnable] (dim_data.c, 41 steps of 1 dB) — used only while voiceover = YES.',
      0x0303:'Override → gpi2_active = YES; Active → gpi1_active = YES, gpi2_active = NO; Inactive → both NO. The GPI pins are only read on an edge, so this “virtual GPI” stays until a real GPI changes.',
      0x0304:'input_trim is stored and echoed but no code uses it: not in ALTERA_SORT, not saved to EEPROM.',
      0x0305:'save_settings = INVERT_DATA(value) → next pass SAVE_INFORMATION_EEPROM() (7 bytes at addresses 10, 13–18).',
      0x0306:'mode_select → ALTERA_SORT byte 7 → SHARC altera_data[1] bits 7..0 → “mode” in SampleIRQ: 3 mono ((L+R)/2), 0 stereo, 1 left only, 2 right only.',
      0x0307:'voiceover_mix → byte 4 → SHARC voiceover_mix: 0 into L and R, 1 into L, C and R, 2 into C. AES4 (slots 6/7) always gets the voice-over.',
      0x0308:'dialnorm_enable (only if pod31_mode) → next pass ALTERA_TRANSLATE_UART0(): dialnorm_settings 0x10/0xE0 and a one-pass reset_552 = 0 (CAT552 RESET_552, P5-3).',
      0x030A:'ramping_type → ALTERA_SORT byte 11 → altera_data[2] → RampAudioCalc(type): α = 1 / 0.002 / 0.0002 / 0.00002 per sample.'}[o];
    if (d) tr(d);
  }); },
  open(menu){ act(`DashBoard: open “${MENUS[menu].name}”`, tr=>{ D.ui.dashMenu=menu; addEvent({kind:'open', menu});
    tr(`Frame controller reads the card: GET_NUMPARAMS (→ start_parameter_dump = YES), then GET_PARAM for each OID of ${MENUS[menu].set} ▸ ${MENUS[menu].name} (Menu OIDs ${MENUS[menu].oids.map(oidTxt).join(', ')}). Each reply comes from DASHBOARD_RESPONSE_SETUP() inside the CAN interrupt — the main loop is not involved.`);
    tr('More than 10 messages in a timer0 second sets dashboard_initializing = YES: unsolicited reports slow from every 288 ms to ≈1 s until 3 quiet seconds pass.'); }); },
  rear(r){ act(`Rear module → ${r}`, tr=>{ worldEv('rear', w2=>{ w2.rear=r; }); tr(REARS[r].name+' — ID resistors AN_BMID/AN_BMID2 '+REARS[r].id+' go to PF1/PF2 (pins 60/59) but v1.04 never reads them.'); }); },
  world(label, fn, why){ act(label, tr=>{ worldEv(label, fn); if (why) tr(why); }); },
};

/* =====================================================================
   DRAWING
   ===================================================================== */
const PX = (x,y)=>[(x/1000+3.4-2.45)*120, (8.70-(y/1000+5.885))*120];   // M6206A.pnp (mil) → card artwork px
const PARTS = {U11:['AT90CAN128',4687,1840], U3:['EP1C12 FPGA',7797.4,1575], U12:['ADSP-21262 SHARC',9532,669.5], U2:['GS1559',9848,2276.4], U1:['GS1574A EQ',11097.2,2263.4],
  U6:['GS1528',10934.5,1745], U18:['CS8416',5340.2,1700.2], U17:['AD1895 SRC',5777.9,1724], U4:['PLL1705',8225,397], U9:['CAN xcvr',11135,45], U25:['ADM3485',9910,1410], U7:['M25P40 (FPGA cfg)',8780,1680], U10:['AT25F512A',8850,340], U5:['GO1525',9926.5,1815.7]};
function cardSVG(t, opts){
  opts=opts||{}; const sn=snapAt(t), w=worldAt(t), L=sn.leds;
  let s=`<svg viewBox="0 0 1546 372" role="img" aria-label="M6206A ISS1 card, top side (gerber artwork)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="m6Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1546" height="372" fill="var(--panel2)"/>
   <path d="M6 18 H1500 L1512 30 V40 H1540 V330 H1514 V345 H1540 V368 H40 L6 335 Z" fill="#0f1210" stroke="#2a2f2c"/>
   <image href="${ASSET}m6206-card-copper.png" width="1546" height="372"/>
   <image href="${ASSET}m6206-card-silk.png" width="1546" height="372" opacity=".9"/>`;
  LED_PNP.forEach(([x,y],i)=>{ const [px,py]=PX(x,y); const on=(L>>i)&1; s+=`<rect x="${px-8}" y="${py-5}" width="16" height="10" rx="2" fill="${on?LED_COL(i):'#2b2f2c'}" ${on?'filter="url(#m6Glow)"':''}><title>${LED_REF[i]} ${LED_NAMES[i]} — ${LED_MACRO[i]}: ${on?'ON':'off'}</title></rect>`; });
  // SW1 DIPSW8SMT at pnp (1720, 2049.5) — eight slides, position 1 at the left (inferred)
  const [dx,dy]=PX(1720,2049.5);
  for (let i=0;i<8;i++){ const x=dx-42+i*12, on=w.dip[i];
    s+=`<g class="m6-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-5}" y="${dy-14}" width="10" height="28" rx="1.5" fill="#2d63b8" stroke="#183a72"/><rect x="${x-3.5}" y="${on?dy-12:dy+1}" width="7" height="11" fill="#f2f2f2"/><rect x="${x-6}" y="${dy-22}" width="12" height="44" fill="transparent"><title>SW1-${i+1} ${on?'ON':'OFF'} — click to toggle</title></rect></g>`; }
  s+=`<text x="${dx-50}" y="${dy+28}" font-size="10" fill="#9fd3ff">1</text><text x="${dx+44}" y="${dy+28}" font-size="10" fill="#9fd3ff">8</text><text x="${dx-48}" y="${dy-18}" font-size="9" fill="#9fd3ff">ON ↑ (${'inferred'})</text>`;
  // CAT552 module (Photo/M6206A Iss1.jpg: right-angle SIMM board over the left-centre of the card, on P5)
  if (w.cat){
    if (D.ui.liftCat) s+=`<rect class="m6-cat" x="418" y="40" width="572" height="280" fill="rgba(40,140,60,.12)" stroke="#5fd17a" stroke-dasharray="8 5" style="cursor:pointer"><title>CAT552 module (lifted view) — click to remove it</title></rect>`;
    else s+=`<g class="m6-cat" style="cursor:pointer"><rect x="418" y="40" width="572" height="280" rx="4" fill="#2f6b31" stroke="#173d18"/>
      <rect x="520" y="70" width="120" height="120" fill="#1b1d1c"/><text x="580" y="134" text-anchor="middle" font-size="12" fill="#bbb">decoder DSP</text>
      ${[0,1,2,3,4,5,6,7].map(k=>`<rect x="${660+k*28}" y="200" width="18" height="44" fill="#191b1a"/>`).join('')}
      <rect x="820" y="110" width="60" height="60" fill="#1b1d1c"/><rect x="520" y="262" width="150" height="22" fill="#e8b23a"/><text x="526" y="278" font-size="13" fill="#3a2a00">CAT552 decoder</text>
      <text x="704" y="96" font-size="14" fill="#d7ead8">Dolby E / AC-3 decoder module (plain label)</text>
      <title>CAT_NO_552_RA on P5 — click to remove (ALTERA18 bit 7 → Dolby_card_installed)</title></g>`;
  } else s+=`<g class="m6-cat" style="cursor:pointer"><rect x="418" y="40" width="572" height="280" fill="transparent"/><text x="704" y="190" text-anchor="middle" font-size="16" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">P5 empty — click to fit the CAT552 module</text></g>`;
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`;
    Object.entries(PARTS).forEach(([k,[n,x,y]])=>{ if (w.cat && !D.ui.liftCat && ['U11','U18','U17'].includes(k)) return; const [px,py]=PX(x,y); s+=lab(px-34, py+4, n); });
    s+=lab(1500,200,'P1')+lab(1500,360,'P2')+lab(430,338,'P5');
  }
  if (!w.card) s+=`<rect width="1546" height="372" fill="var(--panel2)" opacity=".75"/><text x="773" y="196" text-anchor="middle" font-size="38" fill="var(--ink)">card removed from the frame</text>`;
  else if (sn.mode==='boot') s+=`<text x="120" y="350" font-size="20" fill="#ffd36a">main() start-up — LEDs dark (DATA_INITIALIZATION)</text>`;
  else if (sn.mode==='wdt') s+=`<text x="120" y="350" font-size="20" fill="#ff8a7a">stuck in while (error0 == YES) — watchdog about to bite</text>`;
  return s+'</svg>';
}
/* ---- Artwork 2026|59: card edge and rear modules are the archive's CorelDRAW drawings (assets/m6206-*.svg, from the
   CorelDRAW PDF export / LibreOffice rendering of the .cdr). LEDs and jacks sit on the lens / BNC centres read from those SVGs. */
const ART_DIR='#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/';
const EDGE_ART={href:ASSET+'m6206-edge.svg', vb:[86,168,324,418], x:243.8, xd:255.75, ys:{0:189.2,1:217.4,2:248.3,3:295.3,4:319.2,5:343.4,6:367.2,7:295.3,8:319.2,9:343.4,10:367.2,11:442.2,12:468.3},
  src:()=>SIM.src(ART_DIR+'M6206-card-edge.cdr','M6206-card-edge.cdr')+' (2008-05-08)'};
const REAR_ART={
  T6304:{href:ASSET+'m6206-rear-t6304.svg', vb:[262,326,274,350], src:()=>SIM.src(ART_DIR+'M6206A-T6304.cdr','M6206A-T6304.cdr')+' (2007-08-21; CorelDRAW’s own PDF of it)'},
  T6305:{href:ASSET+'m6206-rear-t6305.svg', vb:[262,328,274,348], src:()=>SIM.src(ART_DIR+'M6206A-T6305.cdr','M6206A-T6305.cdr')+' (2007-08-21)'} };
const RCOLS=[359.86,419.86], RROWS=[400.5,460.5,520.5,580.5,640.5], RR=18.7;
[EDGE_ART.href, ...Object.values(REAR_ART).map(a=>a.href)].forEach(u=>{ const im=new Image(); im.src=u; });   // warm the image cache: panels are redrawn every tick
function edgeSVG(t){
  const L=snapAt(t).leds, E=EDGE_ART, v=E.vb;
  let s=`<svg viewBox="${v.join(' ')}" style="width:100%;max-width:260px;display:block;border-radius:6px" role="img" aria-label="M6206A card edge (M6206-card-edge.cdr)">
   <defs><filter id="m6Glow2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <image href="${E.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  LED_NAMES.forEach((n,i)=>{ const on=(L>>i)&1, x=(i>=7&&i<=10)? E.xd : E.x;
    s+=`<circle cx="${x}" cy="${E.ys[i]}" r="${i>=7&&i<=10?3.6:4.2}" fill="${on?LED_COL(i):'#2c332c'}" fill-opacity="${on?1:.55}" ${on?'filter="url(#m6Glow2)"':''}><title>${n}${on?' — on':' — off'}</title></circle>`; });
  return s+`<text transform="translate(238.5 554.5) rotate(-90)" text-anchor="middle" font-size="9" font-weight="700" fill="#111">M6206A</text></svg><div class="small muted" style="margin-top:2px">Card edge: ${E.src()}</div>`;
}
function rearSVG(t){
  const w=worldAt(t), sn=snapAt(t), RM=rearDef(w), o=outLevels(t), R=REAR_ART[w.rear], v=R.vb, r=RR;
  let s=`<svg viewBox="${v.join(' ')}" role="img" aria-label="${RM.name}" style="width:100%;max-width:240px;display:block;border-radius:6px">
   <image href="${R.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  RM.pos.forEach((p,i)=>{
    const cx=RCOLS[i%2], cy=RROWS[i>>1]; const [lab,kind,role]=p;
    const key={sdiin:'sdi',voin:'voIn',gpio1:'gpi1',gpio2:'gpi2'}[role];
    let conn = role==='sdiin'? w.sdi : role==='voin'? w.voIn : role==='gpio1'? w.gpi1 : role==='gpio2'? w.gpi2 : false;
    const out = {aes1:o.aes1L, aes2:o.aes2C, aes3:null, aes4:o.aes4A}[role];
    const live = role==='sdiout'? sn.CD : role==='meta'? (sn.dolby&&sn.a2>=2) : role.startsWith('aes')? (sn.mode==='run' && sn.ai && (out!==null && out>-100 || role==='aes3' && sn.a2>=2)) : role==='gpio1'? sn.gpo1 : role==='gpio2'? sn.gpo2 : false;
    s+=`<g ${key?`class="m6-jack" data-j="${key}" style="cursor:pointer"`:''}>`;
    if (kind==='bnc') s+= conn?`<rect x="${cx-r*.28}" y="${cy}" width="${r*.56}" height="${r*1.9}" fill="#2b5f9e"/><circle cx="${cx}" cy="${cy}" r="${r*.78}" fill="#2b5f9e" opacity=".85"/>`:'';
    else s+= conn?`<path d="M${cx+r*.55} ${cy-r*.6} h${r*1.1} M${cx+r*.55} ${cy+r*.6} h${r*1.1}" stroke="#2b5f9e" stroke-width="${r*.3}"/>`:'';
    if (role!=='nc' && !(key && kind==='bnc')) s+=`<circle cx="${cx+r*.95}" cy="${cy+r*.95}" r="${r*.2}" fill="${live?'var(--accent)':'#888'}" stroke="#222" stroke-width=".6"/>`;
    s+=`<rect x="${cx-r*1.15}" y="${cy-r*1.2}" width="${r*2.3}" height="${r*2.4}" fill="transparent"><title>${i+1} ${lab} (P1-${p[3]})${key==='gpi1'?' — click: close/open the contact':key==='gpi2'?' — click: tap the contact (250 ms)':key?' — click to '+(conn?'unplug':'plug in'):''}</title></rect></g>`;
  });
  return s+`</svg><div class="small muted" style="margin-top:2px">${w.rear}: ${R.src()} · ${RM.src} · ID ${RM.id}</div>`;
}
/* Voice-over control panel (M6206-CONTROL PANELiss2 Model (1).pdf): 1RU, ten buttons, GPI/O 1-5 and 6-10 on DB25s */
function panelSVG(t){
  const sn=snapAt(t), w=worldAt(t);
  let s=`<svg viewBox="0 0 640 150" style="width:100%;display:block" role="img" aria-label="Voiceover control panel"><rect x="4" y="6" width="632" height="62" rx="4" fill="#d8dadc" stroke="#888"/>
   <circle cx="20" cy="22" r="5" fill="#fff" stroke="#777"/><circle cx="620" cy="22" r="5" fill="#fff" stroke="#777"/><circle cx="20" cy="52" r="5" fill="#fff" stroke="#777"/><circle cx="620" cy="52" r="5" fill="#fff" stroke="#777"/>
   <text x="44" y="24" font-size="9" fill="#222" font-weight="700">WARD-BECK SYSTEMS</text><text x="44" y="56" font-size="8" fill="#222">VOICEOVER CONTROL PANEL</text>`;
  for (let i=0;i<10;i++){ const x=200+i*40, me=i===0, lit=me && sn.gpo2;
    s+=`<g ${me?'class="m6-pbtn" style="cursor:pointer"':''}><rect x="${x}" y="20" width="22" height="22" rx="3" fill="${lit?'#ffd36a':me?'#f2f2f2':'#e2e2e2'}" stroke="#333" ${lit?'filter="url(#m6Glow3)"':''}/><text x="${x+11}" y="56" font-size="9" text-anchor="middle" fill="#222">${i+1}</text>${me?`<title>Button 1 → GPI-2 of this M6206A (tap); lamp = GPO-2 tally — wiring inferred</title>`:''}</g>`; }
  s+=`<defs><filter id="m6Glow3"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <g class="m6-auto" style="cursor:pointer"><rect x="20" y="88" width="170" height="44" rx="6" fill="${w.gpi1?'#2b5f9e':'var(--chip)'}" stroke="var(--line)"/><text x="105" y="106" font-size="11" text-anchor="middle" fill="${w.gpi1?'#fff':'var(--ink)'}">AUTOMATION relay</text><text x="105" y="122" font-size="10" text-anchor="middle" fill="${w.gpi1?'#fff':'var(--ink2)'}">${w.gpi1?'closed → VOICE OVER ENABLE':'open'}</text><title>Automation relay → GPI-1 (sustained closure). Click.</title></g>
   <path d="M190 110 H260" stroke="var(--ink2)" marker-end="url(#m6a)"/><path d="M211 42 V80 H300" stroke="var(--ink2)" fill="none"/>
   <defs><marker id="m6a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--ink2)"/></marker></defs>
   <rect x="300" y="78" width="150" height="62" rx="6" fill="var(--panel)" stroke="var(--line)"/><text x="375" y="95" font-size="11" text-anchor="middle" fill="var(--ink)">M6206A rear</text>
   <text x="310" y="112" font-size="10" fill="var(--ink2)">GPI-1 ${sn.g1?'active':'—'} · GPO-1 ${sn.gpo1?'ON':'off'}</text><text x="310" y="128" font-size="10" fill="var(--ink2)">GPI-2 ${sn.g2?'active':'—'} · GPO-2 ${sn.gpo2?'ON':'off'}</text>
   <text x="470" y="100" font-size="10" fill="var(--ink2)">ON/OFF CONTROL → GPI-2</text><text x="470" y="116" font-size="10" fill="var(--ink2)">VOICE OVER TALLY ← GPO-2</text><text x="470" y="132" font-size="10" fill="var(--ink2)">VOICE OVER ENABLE → GPI-1</text></svg>`;
  return s;
}

/* DashBoard-style parameter window (generic period editor, not Ross's design) */
function dashHTML(t){
  const sn=snapAt(t), c=cacheAt(t), mi=D.ui.dashMenu, m=MENUS[mi];
  const oids = (m.noSave && !sn.pse)? m.noSave : m.oids;
  const alive = sn.mode==='run';
  let h=`<div class="m6dash"><div class="m6tree">${['Status','Control'].map(set=>`<div class="m6set">${set}</div>`+MENUS.map((x,i)=>x.set===set?`<div class="m6menu ${i===mi?'on':''}" data-m="${i}">${x.name}</div>`:'').join('')).join('')}
    <button class="m6open" style="margin-top:8px;width:100%">Open / rescan</button><button class="m6reboot" style="margin-top:4px;width:100%">Reboot</button></div><div class="m6pane"><div class="m6title">M6206A · slot 4 ${inf} · ${m.set} ▸ ${m.name}${alive?'':' — <b style="color:var(--bad)">no response</b>'}</div><table class="kv">`;
  oids.forEach(o=>{ const d=OID[o], v=c[o];
    let ctl=`<span class="mono">${valTxt(o,v)}</span>`;
    if (d.alarm) ctl=`<span class="m6alarm" style="background:${v===1?'#2f9e4f':v===undefined?'#777':'#d0453a'}"></span> `+ctl;
    if (!d.ro){
      if (d.range) ctl=`<input type="range" class="m6rng" data-o="${o}" min="${d.range[0]}" max="${d.range[1]}" step="1" value="${v||0}" style="width:150px;vertical-align:middle"> <span class="mono">${valTxt(o,v)}</span>`;
      else if (o===0x0305) ctl=`<button class="m6btn" data-o="${o}" data-v="0">Save</button>`;
      else { const ch=d.ch; const keys=Array.isArray(ch)? ch.map((_,i)=>i) : Object.keys(ch).map(Number);
        ctl=`<select class="m6sel" data-o="${o}">${keys.map(k=>`<option value="${k}" ${k===v?'selected':''}>${Array.isArray(ch)?ch[k]:ch[k]}</option>`).join('')}</select>`; }
    }
    h+=`<tr><td class="small">${d.n} <span class="muted">(${oidTxt(o)})</span></td><td>${ctl}</td></tr>`; });
  h+=`</table><div class="small muted" style="margin-top:6px">Values are what DashBoard last heard: a REPORT_PARAM (one parameter every ${SIM.fmtDur(C.REP_IDLE)}, rotating, changes first) or the reply to a SET/GET.${m.count&&m.count!==m.oids.length?` Menu “${m.name}”: GET_MENU_OIDS says ${m.count} OIDs but sends ${m.oids.length}.`:''}</div></div></div>`;
  return h;
}
const DASH_CSS = `<style>
.m6dash{display:grid;grid-template-columns:150px minmax(0,1fr);gap:8px;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--panel)}
.m6tree{border-right:1px solid var(--line);padding-right:6px}.m6set{font-weight:700;font-size:12px;margin-top:4px;color:var(--ink2)}
.m6menu{font-size:12.5px;padding:3px 6px;border-radius:5px;cursor:pointer}.m6menu.on{background:var(--accent);color:#fff}
.m6title{font-weight:600;font-size:12.5px;margin-bottom:4px}.m6alarm{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle}
.m6dash select,.m6dash button{font-size:12px}
</style>`;
function bindAll(root){
  root.querySelectorAll('.m6-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.m6-cat').forEach(g=>g.onclick=()=>A.cat());
  root.querySelectorAll('.m6-jack').forEach(g=>g.onclick=()=>{ const j=g.dataset.j; if (j==='sdi') A.sdi(); else if (j==='voIn') A.voIn(); else if (j==='gpi1') A.gpi1(); else if (j==='gpi2') A.gpi2(); });
  root.querySelectorAll('.m6-pbtn').forEach(g=>g.onclick=()=>A.gpi2());
  root.querySelectorAll('.m6-auto').forEach(g=>g.onclick=()=>A.gpi1());
  root.querySelectorAll('.m6menu').forEach(e=>e.onclick=()=>{ D.ui.dashMenu=+e.dataset.m; SIM.refresh(); });
  root.querySelectorAll('.m6open').forEach(e=>e.onclick=()=>A.open(D.ui.dashMenu));
  root.querySelectorAll('.m6reboot').forEach(e=>e.onclick=()=>A.reboot());
  root.querySelectorAll('.m6sel').forEach(e=>e.onchange=()=>A.set(+e.dataset.o, +e.value));
  root.querySelectorAll('.m6rng').forEach(e=>e.onchange=()=>A.set(+e.dataset.o, (+e.value)&0xFFFF));
  root.querySelectorAll('.m6btn').forEach(e=>e.onclick=()=>A.set(+e.dataset.o, +e.dataset.v));
}
function worldControlsHTML(){
  const w=worldAt(SIM.t);
  const sel=(id,opts,v)=>`<select id="${id}">${opts.map(([k,l])=>`<option value="${k}" ${k===v?'selected':''}>${l}</option>`).join('')}</select>`;
  const typeOpts=Object.entries(TYPES);
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px">
    <button id="m6card">${w.card?'Pull card':'Insert card'}</button><button id="m6sdi">${w.sdi?'Unplug SDI':'Plug SDI'}</button><button id="m6fmt">Source: ${w.fmt}</button>
    <button id="m6vo">${w.voIn?'Unplug voice-over':'Plug voice-over'}</button><button id="m6g1" class="${w.gpi1?'on':''}">GPI-1 ${w.gpi1?'closed':'open'}</button><button id="m6g2">GPI-2 tap</button>
    <label>Rear ${sel('m6rear',[['T6304','T6304'],['T6305','T6305']],w.rear)}</label>
    <label>Voice-over source ${sel('m6vsrc',[['left','voice on left leg only'],['both','same on both legs']],w.voSrc)}</label>
    <label>VO level <input id="m6vl" type="range" min="-40" max="0" value="${w.voLvl}" style="width:80px;vertical-align:middle"> ${w.voLvl} dBFS</label>
    <span>Selected-group content:</span>${[0,1].map(k=>`<label>G${dipGroup(w)+1} AES${k+1} ${sel('m6c'+k,typeOpts,w.grp[dipGroup(w)][k])}</label>`).join('')}
    <label><input type="checkbox" id="m6flt" ${w.alignFault?'checked':''}> FPGA link fault</label><label><input type="checkbox" id="m6dsp" ${w.dspOk?'':'checked'}> SHARC not echoing</label>
    <label><input type="checkbox" id="m6lift" ${D.ui.liftCat?'checked':''}> show board under the CAT552</label></div>`;
}
function bindWorld(root){
  const q=id=>root.querySelector('#'+id); if (!q('m6card')) return;
  q('m6card').onclick=()=>A.card(); q('m6sdi').onclick=()=>A.sdi(); q('m6fmt').onclick=()=>A.fmt(); q('m6vo').onclick=()=>A.voIn(); q('m6g1').onclick=()=>A.gpi1(); q('m6g2').onclick=()=>A.gpi2();
  q('m6rear').onchange=e=>A.rear(e.target.value);
  q('m6vsrc').onchange=e=>{ const v=e.target.value; A.world('Voice-over source → '+v, w=>{ w.voSrc=v; }, 'Changes what arrives on SHARC slots 8 (L) and 9 (R); “Type of Voiceover Input” decides how they are summed.'); };
  q('m6vl').onchange=e=>{ const v=+e.target.value; A.world('Voice-over level → '+v+' dBFS', w=>{ w.voLvl=v; }); };
  [0,1].forEach(k=>q('m6c'+k).onchange=e=>{ const w=worldAt(SIM.t); A.content(dipGroup(w),k,e.target.value); });
  q('m6flt').onchange=e=>{ const v=e.target.checked; A.world(v?'Break the AVR↔FPGA link':'Repair the AVR↔FPGA link', w=>{ w.alignFault=v; }, v? 'ALTERA_BUFFER_in[0..3] no longer echo "V201" → ALTERA_ALIGNMENT_CHECK() counts error_checker to ERROR_COUNTER1 (1000 passes ≈ '+SIM.fmtDur(1001*C.LOOP_T)+') then returns 1 → while (error0 == YES) NOP(); with no WDR → watchdog reset. The counter carries across seconds.':''); };
  q('m6dsp').onchange=e=>{ const v=!e.target.checked; A.world(v?'SHARC echoes the DSP sync words':'SHARC stops echoing', w=>{ w.dspOk=v; }, 'dsp_synch_detector.vhd looks for AAAAAA/BBBBBB on TDM slots 8/9 (SampleIRQ answers 000000/FFFFFF with them). Checked by DSP_SYNC_DETECTOR() once after each decoder reset.'); };
  q('m6lift').onchange=e=>{ D.ui.liftCat=e.target.checked; SIM.refresh(); };
}

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
const css = n => SIM.css(n);
function txtFit(c, s, x, y, maxW){ if (maxW<14) return; let t=s; while (t.length>2 && c.measureText(t).width>maxW) t=t.slice(0,-1); c.fillText(t, x, y); }
function band(c, X, t0, t1, y, h, fnState, colorOf, labelOf){ // piecewise from snapshots
  const R=sim(); const sn=R.snaps; let i=0; while (i<sn.length-1 && sn[i+1].t<=t0) i++;
  for (; i<sn.length; i++){ const a=Math.max(t0, sn[i].t), b=Math.min(t1, i+1<sn.length? sn[i+1].t : 1); if (b<=a) { if (sn[i].t>t1) break; continue; }
    const v=fnState(sn[i]); const col=colorOf(v); if (col){ c.fillStyle=col; c.fillRect(X(a), y+4, Math.max(1,X(b)-X(a)), h-8); }
    if (labelOf && X(b)-X(a)>50){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); txtFit(c, labelOf(v), X(a)+3, y+h/2+4, X(b)-X(a)-4); } }
}
function curve(c, X, t0, t1, y, h, f, lo, hi, color, fill){
  const N=Math.max(60, Math.min(900, Math.round(X(t1)-X(t0)))); c.strokeStyle=color; c.lineWidth=1.6; c.beginPath(); let started=false;
  for (let k=0;k<=N;k++){ const tt=t0+(t1-t0)*k/N; const v=f(tt); if (v===null||v===undefined||!isFinite(v)){ started=false; continue; } const yy=y+h-3-(clamp(v,lo,hi)-lo)/(hi-lo)*(h-6);
    if (!started){ c.moveTo(X(tt),yy); started=true; } else c.lineTo(X(tt),yy); }
  c.stroke(); c.lineWidth=1;
}
function lanes(){
  const ls=[]; const mono='10px '+css('--mono');
  ls.push({label:'SDI in: frames · fields (29.97)', h:26, draw(c,X,t0,t1,y,h){ const w=worldAt((t0+t1)/2); if (!w.sdi){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no SDI', X(t0)+6, y+h/2+4); return; }
    const n0=Math.floor(t0/FRAME_T), n1=Math.ceil(t1/FRAME_T); if (n1-n0>400) return SIM.pulses(c,X,t0,t1,y,h,FRAME_T,0,FRAME_T*0.02,css('--accent2'),'frames');
    c.font=mono; for (let n=n0;n<=n1;n++){ const ta=n*FRAME_T, x=X(ta); c.fillStyle=css('--accent2'); c.fillRect(x,y+3,2,h-6); c.globalAlpha=.5; c.fillRect(X(ta+FRAME_T/2),y+8,1.5,h-16); c.globalAlpha=1;
      if (X(ta+FRAME_T)-x>70){ c.fillStyle=css('--ink'); c.fillText(`frame ${n} F1`, x+4, y+12); c.fillStyle=css('--ink2'); if (X(ta+FRAME_T)-x>140) c.fillText('F2', X(ta+FRAME_T/2)+4, y+12); } } }});
  ls.push({label:'SDI lines: EAV · HANC (audio) · active', h:26, draw(c,X,t0,t1,y,h){ const w=worldAt((t0+t1)/2); if (!w.sdi) return; const f=VF[w.fmt], Tl=1/(f.fr*f.lines), wt=1/f.clk;
    const px=X(t0+Tl)-X(t0); if (px<3) return SIM.pulses(c,X,t0,t1,y,h,Tl,0,Tl*0.14,css('--ink2'),`${f.short} lines (${f.lines}/frame, ${f.spl} words)`);
    for (let n=Math.floor(t0/Tl); n<=Math.ceil(t1/Tl); n++){ const ta=n*Tl; const xe=X(ta), xh=X(ta+f.hdr*wt), xs=X(ta+(f.spl-f.act-4)*wt), xa=X(ta+(f.spl-f.act)*wt), xend=X(ta+Tl);
      c.fillStyle=css('--bad'); c.fillRect(xe,y+4,Math.max(1,xh-xe),h-8); c.fillStyle=css('--chip'); c.fillRect(xh,y+4,xs-xh,h-8); c.fillStyle='#d9a23a'; c.fillRect(xh+1,y+7,Math.max(1,(xs-xh)*(f.std===1?0.18:0.45)),h-14);
      c.fillStyle=css('--grid'); c.fillRect(xa,y+4,xend-xa,h-8); if (px>200){ c.fillStyle=css('--ink'); c.font=mono; txtFit(c,`line ${(n%f.lines)+1} · HANC: G1–G4 audio packets (${f.std===1?'SMPTE 272':'SMPTE 299'})`, xa+4, y+h/2+4, xend-xa-6); } } }});
  ls.push({label:'Selected group AES2 → CAT552: SMPTE 337 bursts', h:26, draw(c,X,t0,t1,y,h){ const sn=snapAt((t0+t1)/2), w=worldAt((t0+t1)/2); const ty=pairType(w,sn.grp,1);
    if (ty==='none'||ty==='pcm'){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(ty==='pcm'?'PCM — no Pa/Pb preamble':'no audio in this pair', X(t0)+6, y+h/2+4); return; }
    const per = ty==='dolbyE'? FRAME_T : 0.032, len = ty==='dolbyE'? FRAME_T*0.9 : 0.032*0.55; let tb=lastBurst(ty,t0); if (!isFinite(tb)) return;
    if ((X(t0+per)-X(t0))<3) return SIM.pulses(c,X,t0,t1,y,h,per,tb%per,len,'#c8892f',ty==='dolbyE'?'Dolby E frames (1 per video frame)':'AC-3 bursts (1536 samples)');
    for (let tt=tb; tt<t1; tt+=per){ c.fillStyle='#c8892f'; c.fillRect(X(tt),y+5,Math.max(1,X(tt+len)-X(tt)),h-10); c.fillStyle=css('--bad'); c.fillRect(X(tt),y+3,2,h-6);
      if (X(tt+len)-X(tt)>110){ c.fillStyle='#fff'; c.font=mono; txtFit(c, `Pa F872 · Pb 4E1F · Pc ${DT[ty]} (${ty==='dolbyE'?'Dolby E':'AC-3'})`, X(tt)+4, y+h/2+4, X(tt+len)-X(tt)-6); } } }});
  ls.push({label:'non_audio_detector flag → ALTERA15 · DOLBY LED', h:22, draw(c,X,t0,t1,y,h){ band(c,X,t0,t1,y,h, s=>s.a2, v=> v>=2? '#c8892f' : v===1? css('--accent2') : null, v=> v===3?'Dolby E (Pc 28)':v===2?'AC-3 (Pc 1)':'PCM'); }});
  ls.push({label:'CAT552: RESET_552 · decoding (1 frame late)', h:24, draw(c,X,t0,t1,y,h){ band(c,X,t0,t1,y,h, s=> s.mode!=='run'? 0 : !s.dolby? 1 : !s.r552? 2 : s.a2>=2? 3 : 4, v=>[css('--grid'), css('--bad'), '#7a4fd0', '#3fa35a', css('--chip')][v], v=>['card off','no module (Dolby_card_installed = NO)','RESET_552 low (reset_enable)','decoding → AES1 L/R · AES2 C/LFE · AES3 Ls/Rs','idle (no Dolby on AES2)'][v]); }});
  ls.push({label:'AT90CAN128 main loop (≈4.2 ms passes)', h:26, draw(c,X,t0,t1,y,h){ const R=sim();
    R.segs.forEach(g=>{ if (g.t1<t0||g.t0>t1) return; c.fillStyle='#7a4fd0'; c.fillRect(X(g.t0),y+4,Math.max(1,X(g.t1)-X(g.t0)),h-8); if (X(g.t1)-X(g.t0)>60){ c.fillStyle='#fff'; c.font=mono; txtFit(c,g.label,X(g.t0)+3,y+h/2+4,X(g.t1)-X(g.t0)-4); } });
    const sn=R.snaps.filter(s=>s.t>=t0&&s.t<=t1&&s.mode==='run'); if (sn.length>(X(t1)-X(t0))/3){ c.globalAlpha=.35; c.fillStyle=css('--accent'); c.fillRect(X(t0),y+h*0.3,X(t1)-X(t0),h*0.4); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font=mono; c.fillText(`${sn.length} passes in view (while(1) in main())`, X(t0)+6, y+h/2+4); return; }
    sn.forEach(s=>{ const x=X(s.t), xe=X(s.t+C.LOOP_T); c.fillStyle=css('--accent'); c.fillRect(x,y+4,2,h-8); let a=0; STEPS.forEach((st,k)=>{ const xa=X(s.t+a*C.LOOP_T), xb=X(s.t+(a+st[1])*C.LOOP_T); a+=st[1]; c.fillStyle=k%2?'rgba(120,160,255,.25)':'rgba(120,160,255,.12)'; c.fillRect(xa,y+6,xb-xa,h-12); if (xb-xa>80){ c.fillStyle=css('--ink'); c.font=mono; txtFit(c,st[0],xa+2,y+h/2+4,xb-xa-3); } }); }); }});
  ls.push({label:'GPI-1 contact / gpi1_active', h:22, draw(c,X,t0,t1,y,h){ const R=sim(); band(c,X,t0,t1,y,h, s=>s.g1, v=> v? '#2b5f9e' : null, v=> 'gpi1_active = YES');
    R.worlds.forEach((x,i)=>{ if (i && x.t>=t0 && x.t<=t1 && R.worlds[i-1].w.gpi1!==x.w.gpi1){ c.fillStyle=css('--warn'); c.fillRect(X(x.t)-1,y+1,3,h-2); } }); }});
  ls.push({label:'GPI-2 contact / gpi2_active (toggle)', h:22, draw(c,X,t0,t1,y,h){ const R=sim(); band(c,X,t0,t1,y,h, s=>s.g2, v=> v? '#8a4fd0' : null, v=> 'gpi2_active = YES');
    R.worlds.forEach((x,i)=>{ if (i && x.t>=t0 && x.t<=t1 && R.worlds[i-1].w.gpi2!==x.w.gpi2){ c.fillStyle=x.w.gpi2? css('--warn') : css('--ink2'); c.fillRect(X(x.t)-1,y+1,3,h-2); } }); }});
  ls.push({label:'voiceover_status (ALTERA_TRANSLATE_UART0)', h:24, draw(c,X,t0,t1,y,h){ band(c,X,t0,t1,y,h, s=> s.mode!=='run'?-1 : s.st*2+(s.vo?1:0), v=> v<0? css('--grid') : [null,null,null,'#2f9e4f',css('--warn'),'#d07a2f'][v], v=> ({3:'ACTIVE · voiceover = YES',4:'OVERRIDE · voiceover = NO',5:'“OVERRIDE” · voiceover = YES (GPI-2 alone)'})[v]||''); }});
  ls.push({label:'GPO-1 · GPO-2 · VOICE OVER LED', h:24, draw(c,X,t0,t1,y,h){ const h3=(h-6)/3; [['gpo1','#2b5f9e'],['gpo2','#8a4fd0'],['led','#3fbf5f']].forEach(([k,col],i)=>{ band(c,X,t0,t1,y+i*h3-3,h3+6, s=> k==='led'? ((s.leds>>12)&1) : s[k], v=> v? col : null, null); }); }});
  ls.push({label:'SHARC voiceover_gain (RampAudioCalc)', h:34, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--grid'); c.strokeRect(X(t0),y+3,X(t1)-X(t0),h-6); curve(c,X,t0,t1,y,h, t=>gainsAt(t).vog, 0, 1, '#2f9e4f'); c.fillStyle=css('--ink2'); c.font=mono; c.fillText('0 … volume[64] = 0.995', X(t0)+4, y+12); }});
  ls.push({label:'SHARC dim_gain (dB) — programme dip', h:34, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--grid'); c.strokeRect(X(t0),y+3,X(t1)-X(t0),h-6); curve(c,X,t0,t1,y,h, t=>db(gainsAt(t).dimg), -40, 0, '#d07a2f'); c.fillStyle=css('--ink2'); c.font=mono; c.fillText('0 dB … −40 dB (dim[41])', X(t0)+4, y+12); }});
  ls.push({label:'AES1 OUT L (decoded L + voice-over), dBFS', h:34, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--grid'); c.strokeRect(X(t0),y+3,X(t1)-X(t0),h-6); curve(c,X,t0,t1,y,h, t=>{ const v=outLevels(t).aes1L; return v===null? null : v; }, -60, 0, css('--accent')); c.fillStyle=css('--ink2'); c.font=mono; c.fillText('−60 … 0 dBFS', X(t0)+4, y+12); }});
  ls.push({label:'AES4 OUT A (pair 1 PCM, +1584+6336 samples), dBFS', h:34, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--grid'); c.strokeRect(X(t0),y+3,X(t1)-X(t0),h-6); curve(c,X,t0,t1,y,h, t=>{ const v=outLevels(t).aes4A; return v===null? null : v; }, -60, 0, '#2b8fd0'); c.fillStyle=css('--ink2'); c.font=mono; c.fillText(`AES4 = ${SIM.fmtDur((C.DELAY1+C.DELAY4)/C.FS)} late (≈5 frames)`, X(t0)+4, y+12); }});
  ls.push({label:'SHARC SampleIRQ 48 kHz · TDM 10 × 32 bit', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,1/C.FS*0.3,css('--accent'),'SampleIRQ (refresh → RampAudioCalc)'); }});
  ls.push({label:'AVR ↔ FPGA: ALTERA_read_write (2 × 80 bytes)', h:22, draw(c,X,t0,t1,y,h){ const sn=sim().snaps.filter(s=>s.t>=t0-C.LOOP_T&&s.t<=t1&&s.mode==='run');
    if (sn.length>(X(t1)-X(t0))/3) return SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,sn.length?sn[0].t:0,3.44e-3,'#6f8fbf','160-byte exchanges ("V201" + 76 control bytes, twice)');
    sn.forEach(s=>{ const a=s.t+STEPS.slice(0,4).reduce((p,q)=>p+q[1],0)*C.LOOP_T; c.fillStyle='#6f8fbf'; c.fillRect(X(a),y+5,Math.max(1,X(a+3.44e-3)-X(a)),h-10); if (X(a+3.44e-3)-X(a)>140){ c.fillStyle='#fff'; c.font=mono; txtFit(c,'ALTERA_BUFFER_out[0..79] ×2, FSYNCH between',X(a)+3,y+h/2+4,X(a+3.44e-3)-X(a)-4); } }); }});
  ls.push({label:'CAN 1 Mbit/s (▲ card · ▼ frame controller)', h:28, draw(c,X,t0,t1,y,h){ const R=sim(); R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; const xa=X(fr.t), xb=Math.max(xa+2,X(fr.t+fr.dur)); c.fillStyle=fr.dir==='tx'? css('--accent') : '#c8892f'; c.fillRect(xa,y+(fr.dir==='tx'?4:h/2),xb-xa,h/2-4);
      if (xb-xa>90){ c.fillStyle='#fff'; c.font=mono; txtFit(c,fr.desc,xa+2,y+(fr.dir==='tx'?14:h-6),xb-xa-3); } else if (t1-t0>0.05 && fr.dir==='tx' && fr.type===0x10){ c.fillStyle=css('--ink'); c.font=mono; txtFit(c, PR[PR_OID.indexOf(fr.oid)]||'', xa+3, y+12, 120); } }); }});
  ls.push({label:'timer1 96 ms · timer3 33 ms (dolby.c)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h/2,C.T1_IDLE,(C.REP_PHASE)%C.T1_IDLE,0.0012,css('--accent2'),'timer1 overflows'); SIM.pulses(c,X,t0,t1,y+h/2,h/2,C.T3,0.011,0.0008,css('--ink2'),'timer3 overflows'); }});
  ls.push({label:'Card-edge LEDs', h:30, draw(c,X,t0,t1,y,h){ const idx=[0,1,2,3,4,7,8,11,12]; const hh=(h-4)/idx.length;
    idx.forEach((li,k)=>band(c,X,t0,t1,y+2+k*hh-4,hh+8, s=>(s.leds>>li)&1, v=> v? (li===2?'#ff4a3d':(li<=1||li>=11)?'#3fbf5f':'#e8b23a') : null, null)); }});
  return ls;
}
const STEPS = [
  ['DOLBY_CAT552_AUDIO_ERROR_CHECK · DOLBY_DECODER_STATUS · DSP_SYNC_DETECTOR', .03, 'ALTERA18 bits 7/6/4 (from the last read) → Dolby_card_installed, CAT552 error, SHARC alive'],
  ['CS8416_READ_LOCK_ALL → Astatus', .05, 'bit-banged read of CS8416 register 0x0C on PC3–PC6: is the voice-over input locked?'],
  ['READ_GS1560_STATUS · PROCESS_SDI_LOCK_STATUS · PROCESS_HD_SD_CONTROL', .02, '~RC_BYP (PE7), LOCK_60 (PD2), SMPTE (PG3), SD/~HD (PD7) → CD, SD/HD/ERR LEDs, 10/20-bit on PG4'],
  ['PROCESS_AUDIO_INFORMATION · READ_GPI · DEBOUNCE_GPI2 · ALTERA_TRANSLATE_UART0', .04, 'AES on/off bits; GPI edges on PC2/PE1; the voice-over state machine; dim and voice-over gains; dialnorm → reset_552'],
  ['ALTERA_read → PROCESS_DIP_SWITCHES · PROCESS_AUDIO_FORMAT · ALTERA_SORT', .10, '19 status bytes on PA6/PA4/PA3; DIP (ALTERA13), SMPTE 337 flags (ALTERA14–17); 80-byte control buffer filled'],
  ['ALTERA_read_write (80 bytes, FSYNCH, 80 bytes)', .70, '1280 clock pulses on PA2, data out on PA7, in on PA5 — "V201" then the control words; SHARC copies them in refresh()'],
  ['ALTERA_ALIGNMENT_CHECK · Audio1/2_Detect · ALIGNMENT/SAMPLE compares', .03, 'echo of "V201" checked (1000 misses → stall → watchdog); AUDIO1/AUDIO2; error debouncers'],
  ['PROCESS_GROUP_COMPARE1 · PROCESS_HD_SD_COMPARE · TRANSLATE_RESET_VECTOR', .01, 'group or SD/HD change or no SDI → reset_enable, reset_552 = 0 for 100 passes'],
  ['NO_LOCK_CHIRP · METADATA_CHIRP · REFRESH_LEDS', .01, 'VO LED chirp in override (10 on / 70 off); DOLBY LEDs'],
  ['CAN_FUNCTIONS → PARAMETER_UPDATE · SAVE_INFORMATION_EEPROM?', .01, 'pick the next REPORT_PARAM (changes first); EEPROM only after Settings = Save'],
];

/* =====================================================================
   VIEWS
   ===================================================================== */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l? `<div><b>${l.name}</b> <span class="muted">at ${SIM.fmtT(l.t)} (second ${l.sec})</span></div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the card (DIP switch, CAT552 module), the rear module (SDI IN, VOICEOVER IN, GPI/O blocks), the control panel or a DashBoard control. Each step the firmware takes is listed here with the names from the source.</div>'; }
function levelsHTML(t){ const o=outLevels(t); const row=(n,v)=>{ const pc=v===null?0:clamp((v+60)/60,0,1); return `<tr><td>${n}</td><td style="width:55%"><div style="height:10px;border-radius:3px;background:var(--grid);overflow:hidden"><div style="width:${(pc*100).toFixed(1)}%;height:100%;background:${v!==null&&v>-3?'var(--bad)':v!==null&&v>-12?'var(--warn)':'var(--accent)'}"></div></div></td><td class="mono">${v===null?'muted':v<-100?'silence':v.toFixed(1)+' dBFS'}</td></tr>`; };
  return `<table class="kv">${row('AES1 OUT L (decoded L)',o.aes1L)}${row('AES1 OUT R (decoded R)',o.aes1R)}${row('AES2 OUT C (decoded C)',o.aes2C)}${row('AES4 OUT A (pair 1 + VO, 5 frames late)',o.aes4A)}${row('AES4 OUT B',o.aes4B)}</table><p class="small muted">Tone levels in: programme ${worldAt(t).pgm} dBFS, decoded ${worldAt(t).dec} dBFS, voice-over ${worldAt(t).voLvl} dBFS ${inf}; uncorrelated sources add in power. Gains are the SHARC’s, sample-exact between passes.</p>`; }
function inspHTML(t){ const sn=snapAt(t), g=gainsAt(t), w=worldAt(t);
  return `<table class="kv">
  <tr><th>Mode</th><td class="mono">${sn.mode==='run'?'while(1)':sn.mode} · pass ${sim().snaps.filter(s=>s.t<=t&&s.mode==='run').length} of this second</td></tr>
  <tr><th>SDI</th><td class="mono">CD = ${sn.CD} · sdi_format = ${['NO_LOCK','SD_FORMAT','HD_FORMAT'][sn.fmt]} · group_sel1 = ${sn.grp} (Group ${sn.grp+1})</td></tr>
  <tr><th>Embedded pairs</th><td class="mono">aes1_lock = ${['NO_LOCK','LOCK','DOLBY_AC3','DOLBY_E'][sn.a1]} · aes2_lock = ${['NO_LOCK','LOCK','DOLBY_AC3','DOLBY_E'][sn.a2]}</td></tr>
  <tr><th>Decoder</th><td class="mono">Dolby_card_installed = ${sn.dolby?'YES':'NO'} · reset_552 = 0x${hx(sn.r552)} · reset_enable = ${sn.rst?'YES ('+sn.rc+')':'NO'} · AUDIO_INFORMATION = 0x${hx(sn.ai)}</td></tr>
  <tr><th>GPI</th><td class="mono">gpi1_active = ${sn.g1?'YES':'NO'} · gpi2_active = ${sn.g2?'YES':'NO'} · GPO1 ${sn.gpo1?'ON':'off'} · GPO2 ${sn.gpo2?'ON':'off'}</td></tr>
  <tr><th>Voice-over</th><td class="mono">voiceover = ${sn.vo?'YES':'NO'} · status ${VO_ST[sn.st]} · status_can ${VO_ST[sn.stc]} · Astatus = ${sn.Ast}</td></tr>
  <tr><th>Mix</th><td class="mono">mode_select = ${sn.ms} (${MODE_NAMES[sn.ms]}) · voiceover_mix = ${sn.mix} (${MIX_NAMES[sn.mix]}) · ramping_type = ${sn.ramp} (${C.RAMP_NAMES[sn.ramp]})</td></tr>
  <tr><th>SHARC gains</th><td class="mono">voiceover_gain ${g.vog.toFixed(4)} · dim_gain ${g.dimg.toFixed(4)} (${db(g.dimg).toFixed(1)} dB) · DimEnable = ${sn.DimEnable}</td></tr>
  <tr><th>DIP / DashBoard</th><td class="mono">ALTERA13 = ${bin8(ALTERA13(w))} · remote_parameter_adjustment = ${sn.rpa?'YES':'NO'} · parameter_save_enabled = ${sn.pse?'YES':'NO'}</td></tr>
  <tr><th>Next report</th><td class="mono">parameter_refresh = ${sn.pr} (${PR[sn.pr]})${sn.ec?` · error_checker = ${sn.ec}`:''}</td></tr></table>`; }
function canLogHTML(t){ const R=sim(); const fr=R.can.filter(f=>f.t<=t).slice(-40).reverse(); return fr.length? fr.map(f=>`<div>${SIM.fmtT(f.t)} ${f.dir==='tx'?'▲':'▼'} ${f.desc}</div>`).join('') : '<div class="muted">No CAN traffic yet in this second.</div>'; }
function notesHTML(t){ const R=sim(); const n=R.notes.filter(x=>x.t<=t).slice(-8).reverse(); return n.length? n.map(x=>`<div>${SIM.fmtT(x.t)} ${x.s}</div>`).join('') : '<div class="muted">No firmware events yet in this second.</div>'; }

function viewSim(m){
  window.__m6206Active = true;
  m.innerHTML = DASH_CSS + `
  <div class="grid2">
    <div>${card('Card and card edge at the playhead', `<div style="display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:10px;align-items:start"><div id="crd"></div><div id="edge"></div></div>
      <div class="small muted" style="margin-top:4px">Card = M6206A ISS1 top side from the gerbers (TOP + TSM + TSS at 120 dpi; the openGear logo blanked); the CAT552 decoder module drawn where the photo shows it. Click DIP switches SW1-1…8 and the module. Keys: 1 GPI-1 · 2 GPI-2 tap · V voice-over cable · S SDI cable · N next second.</div><div id="wc"></div>`)}
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('DashBoard-style parameter window (generic)', `<div id="dash"></div>`)}
      ${card('Voice-over control panel and automation', `<div id="pnl"></div><p class="small muted">Panel and its wiring sketch: M6206-CONTROL PANELiss2. Which GPI the button and the automation relay use is ${inf} from the firmware (GPI-1 sustained, GPI-2 toggle).</p>`)}</div>
  </div>
  <div class="grid2">
    <div>${card('Rear module — click SDI IN, VOICEOVER IN and the GPI/O blocks', `<div style="display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px"><div id="rear"></div><div id="rinfo" class="small"></div></div>`)}</div>
    <div>${card('State at the playhead', `<div id="insp"></div>`)}${card('Output levels at the playhead', `<div id="lv"></div>`)}</div>
  </div>
  ${card('Timeline — one second as the card sees it (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Pass time ≈4.2 ms is ${infT('cycle count of ALTERA_read_write_data in altera.lis × 160 bytes plus the rest of the loop')}. Timer periods come from the register values (8 MHz, clk/64). Lock times, burst phases and the report-timer phase are ${inf}. Changes you make are events at the playhead; “Next second” (N) carries the end state forward.</p>`)}
  <div class="grid2">${card('CAN frames (newest first)', `<div id="canlog" class="log"></div>`)}${card('Firmware notes this second', `<div id="notes" class="log"></div>`)}</div>`;
  let wcVer=-1;
  const draw=()=>{ const t=SIM.t;
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#dash').innerHTML=dashHTML(t);
    m.querySelector('#pnl').innerHTML=panelSVG(t); m.querySelector('#rear').innerHTML=rearSVG(t);
    const w=worldAt(t), RM=rearDef(w);
    m.querySelector('#rinfo').innerHTML=`<b>${RM.name}</b><table class="kv" style="margin-top:4px">${RM.pos.map((p,i)=>`<tr><td>${i+1}</td><td>${p[0]}</td><td class="mono">P1-${p[3]}</td></tr>`).join('')}</table><div class="muted">Source: ${RM.src}. AN_BMID/AN_BMID2 = ${RM.id}; v1.04 does not read them.</div>`;
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#lv').innerHTML=levelsHTML(t);
    m.querySelector('#canlog').innerHTML=canLogHTML(t); m.querySelector('#notes').innerHTML=notesHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); bindAll(m);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from the 22 Aug 07 preliminary manual) ---------------- */
function endState(){ const R=sim(); return {f:R.end.f, w:R.end.w}; }
const LESSONS = [
  {title:'Meet the M6206A', body:`<p>The M6206A is an openGear card built for <b>Astral Media</b>: it takes one SD/HD-SDI signal, pulls an embedded audio group out of it, decodes the <b>Dolby E / AC-3</b> stream with a plug-in CAT552 decoder, and lets an announcer’s <b>voice-over</b> be mixed into the programme while the programme dips.</p>
    <p>Three processors share the work: an <b>AT90CAN128</b> runs the controls, GPIs, LEDs and DashBoard; an <b>EP1C12 FPGA</b> de-embeds, detects SMPTE 337 data bursts and routes audio; an <b>ADSP-21262 SHARC</b> does the mixing, the ramps and the delays.</p><p class="muted">Sources: M6206A Manual (Preliminary) 22 Aug 07 and the v1.04 firmware.</p>`, check:()=>true, auto:true},
  {title:'1 · Rear module and cables', body:`<p>The T6304 rear module (manual p. 8) carries SDI IN (1) and a re-clocked SDI OUT (2), four 75 Ω AES outputs (3–6), the <b>VOICEOVER IN</b> BNC (7, AES/EBU 0.2–7 V p-p, 32–96 kHz) and three Phoenix blocks: GPI/O 2 (8), GPI/O 1 (9) and the Dolby METADATA output (10).</p><p><b>Goal:</b> T6304 fitted, SDI and voice-over plugged in.</p>`, check:()=>{ const e=endState(); return e.w.rear==='T6304' && e.w.sdi && e.w.voIn && e.f.CD && e.f.Astatus; }, hint:'Click SDI IN and VOICEOVER IN on the rear module; keep T6304.'},
  {title:'2 · DIP switches', body:`<p>The manual’s table: SW1 DIP override, SW2/SW3 group selector 1, SW4/SW5 group selector 2, SW7/SW8 voice-over input mix (and “not implemented as of 22 August 2007”).</p><p>What v1.04 actually reads (through the FPGA into ALTERA13): <b>SW1 and SW2 pick the group</b> (both ON = Group 1), <b>SW7 ON lets DashBoard change settings</b>, <b>SW8 ON enables Save and the power-up restore</b>. SW3–SW6 do nothing.</p><p><b>Goal:</b> Group 1 (SW1, SW2 ON), SW7 ON, SW8 ON.</p>`, check:()=>{ const e=endState(); return e.f.group_sel1===0 && e.f.remote_parameter_adjustment && e.f.parameter_save_enabled; }, hint:'Click the DIP switch on the card drawing.'},
  {title:'3 · Read the status LEDs', body:`<p>Card edge (M6206-card-edge.cdr): <b>SD</b> lights for any locked input and <b>HD</b> joins it for HD; <b>ERR</b> (red) means no valid SDI. <b>AES 1/2</b> light when the selected group carries audio on that pair, and the <b>DOLBY</b> LED beside it when that pair is Dolby E or AC-3. AES 3/4 and DOLBY 3/4 stay dark in v1.04 (their code is commented out).</p><p><b>Goal:</b> an HD source locked, with Dolby E found on AES2.</p>`, check:()=>{ const e=endState(); return e.f.sdi_format===2 && e.f.aes2_lock===DOLBY_E; }, hint:'Source button → HD; set “G1 AES2” to Dolby E. The detector needs a burst and the 100-pass reset after any change.'},
  {title:'4 · Dolby decoder', body:`<p>Mode 2 needs the CAT552 decoder fitted. Its outputs go to AES1 (L/R), AES2 (C/LFE) and AES3 (Ls/Rs), one frame behind the video; AES4 carries the other pair of the group.</p><p>Pull the module and watch: the firmware needs 2000 passes (≈8.4 s, across several seconds — press N) before DashBoard’s “Dolby Decoder” turns to <b>Error</b>. Put it back.</p><p><b>Goal:</b> module fitted and Dolby_card_installed = YES.</p>`, check:()=>{ const e=endState(); return e.w.cat && e.f.Dolby_card_installed; }, hint:'Click the green module on the card.'},
  {title:'5 · Start a voice-over (GPI-1)', body:`<p>“A sustained contact closure to ground on GPI-1 will activate the voice-over.” The programme dips to the preset level (factory −20 dB), the voice-over is mixed into AES1 and AES4, GPO-1 goes low as a tally and the VOICE OVER LED lights.</p><p>Watch the dim and voice-over gain lanes: the SHARC ramps them with <span class="mono">RampAudioCalc()</span>, here the Medium constant (τ ≈ 104 ms).</p><p><b>Goal:</b> voice-over ACTIVE.</p>`, check:()=>{ const e=endState(); return e.f.voiceover && e.f.voiceover_status===1; }, hint:'Click the GPI/O 1 block, the automation relay, or press 1.'},
  {title:'6 · Override it (GPI-2)', body:`<p>“If the voice-over function has been activated, triggering GPI-2 will override or cancel voice-over. Triggering GPI-2 again will enable voice-over.” GPI-2 is a toggle; the control panel’s button drives it.</p><p>In override the programme comes back up and the VOICE OVER LED and GPO-2 <b>chirp</b> (10 passes on, 70 off).</p><p><b>Goal:</b> GPI-1 held and voice-over in OVERRIDE.</p>`, check:()=>{ const e=endState(); return e.f.gpi1_active && e.f.voiceover_status===2 && !e.f.voiceover; }, hint:'With GPI-1 closed, tap GPI-2 (panel button 1 or key 2). Wait 0.2 s between taps.'},
  {title:'7 · Release GPI-1 while overridden', body:`<p>“If GPI-1 goes inactive while in override, the override state will be cleared.” In the code any GPI-1 edge sets <span class="mono">gpi2_active = NO</span>.</p><p>Then try GPI-2 on its own: the firmware puts the voice-over <b>on</b> (status “Override”). The manual does not describe this.</p><p><b>Goal:</b> GPI-1 open, voice-over inactive.</p>`, check:()=>{ const e=endState(); return !e.w.gpi1 && !e.f.voiceover && e.f.voiceover_status===0; }, hint:'Open GPI-1 (click it again).'},
  {title:'8 · Shape the mix in DashBoard', body:`<p><b>Control ▸ Card Settings</b>: <i>Type of Voiceover Input</i> (Stereo, Mono, L Only, R Only), <i>Voiceover Mixed to Pgm</i> (L,R · L,C,R · C), <i>Pgm Dim Level</i>, <i>Voiceover Input Ramping</i> (Cut, Fast, Medium, Slow).</p><p>With the voice on the left leg only, “Stereo” puts it only on the left outputs; “Mono” sums it to both at −6 dB.</p><p><b>Goal:</b> Mono, L,C,R, −12 dB, Slow.</p>`, check:()=>{ const e=endState(); return e.f.mode_select===3 && e.f.voiceover_mix===1 && e.f.dim_level2===0xF4 && e.f.ramping_type===3; }, hint:'Pick “Card Settings” in the parameter window and change the four controls.'},
  {title:'9 · Save', body:`<p>“Save: when pressed the current settings are saved. The saved settings will be re-loaded upon card reboot.” The firmware writes EEPROM bytes 10 (0xAA marker), 13–18. The Save control only appears when SW8 is ON.</p><p><b>Goal:</b> settings saved with Mono / L,C,R / −12 dB / Slow.</p>`, check:()=>{ const e=endState(); const x=e.f.ee; return x.valid && x.mode_select===3 && x.mix===1 && x.dim2===0xF4 && x.ramp===3; }, hint:'Card Settings ▸ Settings: Save.'},
  {title:'10 · Dialnorm', body:`<p>“Dialnorm Enabled allows the Dolby decoder to apply the dialnorm level from the metadata.” Each change makes the AVR pulse the CAT552’s RESET_552 for one pass — expect a short dropout on AES1–3.</p><p><b>Goal:</b> dialnorm enabled.</p>`, check:()=>endState().f.dialnorm_enable===1, hint:'Card Settings ▸ Dialnorm: Enabled.'},
  {title:'Done', body:`<p>The other tabs show the same operations from the inside: <b>One second</b> breaks the timing down, <b>Software</b> traces the loop, the voice-over state machine and the AVR→FPGA→SHARC control words, and <b>Findings</b> lists where the code and the manual part ways.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
let tutInit=false;
function viewTutorial(m){
  window.__m6206Active = true;
  if (!tutInit){ tutInit=true; resetAll(true); SIM.t=0; }
  m.innerHTML = DASH_CSS + `<div class="grid2"><div>${card('Tutorial — operating an M6206A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Card and rear module', `<div id="crd"></div><div style="display:grid;grid-template-columns:130px 120px minmax(0,1fr);gap:8px;margin-top:6px"><div id="rear"></div><div id="edge"></div><div id="lv"></div></div><div id="wc"></div>`)}${card('Control panel', `<div id="pnl"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}</div></div>`;
  let wcVer=-1;
  const draw=()=>{ const t=SIM.t;
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#lv').innerHTML=levelsHTML(t);
    m.querySelector('#pnl').innerHTML=panelSVG(t); m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=!!L.check(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked against the state at the end of the simulated second, so a change made at the playhead counts once the passes after it have run.</p>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(true); lessonIdx=0; SIM.seek(0); };
    bindAll(m);
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__m6206Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen by the displays', `<div style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px"><div id="edge"></div><div id="dview"></div></div><h3>Downstream meters on the AES outputs</h3><div id="lv"></div>`)}</div>
   ${card('Where each output sample comes from (delay lines in sample.c)', `<div id="dly"></div>`)}
   ${card('Zoom ladder at the playhead — programme dip (dim_gain) and voice-over gain', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t, sn=snapAt(t), R=sim(), w=worldAt(t), f=VF[w.fmt];
    const tx=R.can.filter(x=>x.dir==='tx').length, rx=R.can.filter(x=>x.dir==='rx').length;
    const rows=[
      ['Video frames (fields)', (f.fr).toFixed(3)+' ('+(2*f.fr).toFixed(2)+')', SIM.fmtDur(FRAME_T), `${f.name}; Dolby E frames are locked to these`],
      ['SDI lines', Math.round(f.fr*f.lines).toLocaleString(), SIM.fmtDur(1/(f.fr*f.lines)), `${f.lines} per frame, ${f.spl} words; audio packets ride in HANC (GS1559 → EP1C12 Yin/Cin)`],
      ['Dolby E / AC-3 bursts on AES2', w.grp[sn.grp][1]==='dolbyE'? f.fr.toFixed(3) : w.grp[sn.grp][1]==='ac3'? '31.25' : '—', w.grp[sn.grp][1]==='ac3'? '32 ms' : SIM.fmtDur(FRAME_T), 'non_audio_detector: 4 zero words + Pa/Pb, Pc latched; flag held 8191 LRCLK ('+SIM.fmtDur(C.DET_HOLD/C.FS)+')'],
      ['AES3 frames = SHARC SampleIRQ', '48,000', SIM.fmtDur(1/C.FS), 'SPORT1 in / SPORT0 out, TDM 10 slots × 32 bit (MR1CS0/MT0CS0 = 0x3FF); RampAudioCalc once per sample in refresh() '+infT('interrupt_flag handshake between SampleIRQ and the background loop')],
      ['FPGA → SHARC control words', '48,000 × 20 words', SIM.fmtDur(1/C.FS), 'SPORT2/3 TCB of 20 longs (altera_data_in[]); refresh() acts only when word 0 = 0x56323031 “V201”'],
      ['AVR main-loop passes', R.passes.toLocaleString(), SIM.fmtDur(C.LOOP_T), 'two 80-byte ALTERA_read_write bursts dominate '+inf],
      ['Timer0 interrupts', '1,000', '1 ms', 'counts CAN messages each second → dashboard_initializing'],
      ['Timer1 interrupts', sn.mode==='run'?'≈10.4 (idle)':'—', '96 ms (96 µs while busy)', 'CANTX_BUFFER_CHECK, CAN_TX_TIMER'],
      ['Unsolicited REPORT_PARAM', (1/C.REP_IDLE).toFixed(2), SIM.fmtDur(C.REP_IDLE), 'every 3rd timer1 overflow; ≈1 s while DashBoard is busy'],
      ['Timer3 interrupts (dolby.c)', (1/C.T3).toFixed(1), SIM.fmtDur(C.T3), 'dolby_changed after 2 ticks — overwritten every pass, so it does nothing'],
      ['CAN frames this second', `${rx} rx · ${tx} tx`, SIM.fmtDur(frameTime(6)), '1 Mbit/s (CANBT 0x00/0x04/0x12); a 6-byte reply ≈ '+SIM.fmtDur(frameTime(6))+' '+inf],
      ['VOICE OVER LED chirp (override)', (1/((C.CHIRP_ON+C.CHIRP_OFF+2)*C.LOOP_T)).toFixed(2), SIM.fmtDur((C.CHIRP_ON+C.CHIRP_OFF+2)*C.LOOP_T), '11 passes on, 71 off (NO_LOCK_CHIRP)'],
      ['Group / format change mute', '—', SIM.fmtDur(C.RESET_VEC*C.LOOP_T), 'RESET_VECTOR_CONSTANT = 100 passes with reset_552 = 0 and AUDIO_INFORMATION = 0'],
      ['Ramp time constants', '—', C.RAMP.map((a,i)=>C.RAMP_NAMES[i]+' '+(i?SIM.fmtDur(1/a/C.FS):'0')).join(' · '), 'τ = 1/(α·48 000); the cut is one sample'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Use the transport’s step units (pass, sample, line, frame, report) to walk through it.</p>`;
    const k=Math.floor(t*C.FS), fr=Math.floor(t/FRAME_T), ln=Math.floor((t%FRAME_T)*f.fr*f.lines)+1; const st=STEPS[stepIdx(t)]; const cf=R.can.find(x=>x.t<=t&&x.t+x.dur>=t); const g=gainsAt(t);
    m.querySelector('#dev').innerHTML=`<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SDI</th><td class="mono">${w.sdi? `frame ${fr} · line ${ln} of ${f.lines}` : 'no input'}</td></tr>
      <tr><th>EP1C12</th><td class="mono">sample ${k.toLocaleString()} · AES2 flag ${sn.a2>=2?'compressed, Pc '+(sn.a2===3?28:1):'PCM'} · CAT552 ${sn.r552?'running':'in reset'}</td></tr>
      <tr><th>ADSP-21262</th><td class="mono">SampleIRQ #${k.toLocaleString()} · voiceover_gain ${g.vog.toFixed(4)} · dim_gain ${g.dimg.toFixed(4)}</td></tr>
      <tr><th>AT90CAN128</th><td class="mono">${sn.mode!=='run'? sn.mode : st[0]}<br><span class="muted">${sn.mode==='run'? st[2] : ''}</span></td></tr>
      <tr><th>CAN bus</th><td class="mono">${cf? (cf.dir==='rx'?'▼ ':'▲ ')+cf.desc : 'idle'}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t);
    const c=cacheAt(t); m.querySelector('#dview').innerHTML=`<table class="kv"><tr><th>DashBoard shows</th><td></td></tr>${[0x0204,0x0201,0x0202,0x0203,0x020A,0x0206,0x0207,0x0303].map(o=>`<tr><td>${OID[o].n}</td><td class="mono">${valTxt(o,c[o])}</td></tr>`).join('')}</table><p class="small muted">LEDs follow the next main-loop pass (≈4 ms); DashBoard waits for a report or a reply.</p>`;
    m.querySelector('#lv').innerHTML=levelsHTML(t);
    const d1=C.DELAY1/C.FS, d4=C.DELAY4/C.FS;
    m.querySelector('#dly').innerHTML=`<svg viewBox="0 0 1100 170" style="width:100%;display:block">${[
      ['AES1–3 (decoded 5.1)', [['CAT552 decode', FRAME_T, '#7a4fd0']], 'one video frame (manual) — CAT552 internal latency'],
      ['Voice-over (slots 8/9)', [['delay_ch1/2', d1, '#2f9e4f']], 'aligned with the decoded audio: 1584 samples = 33.0 ms (“originally 1601”)'],
      ['AES4 (pair 1, slots 6/7)', [['delay_ch3/4', d1, '#2b8fd0'], ['delay_ch5/6 (v102)', d4, '#1f6aa0']], `${SIM.fmtDur(d1+d4)} = 7920 samples ≈ 4.95 frames — manual: “no delay”`],
    ].map((r,i)=>{ const y=20+i*50; let x=180, sc=470/0.2; let s=`<text x="0" y="${y+16}" font-size="11" fill="var(--ink)">${r[0]}</text>`; r[1].forEach(([n,dd,col])=>{ const ww=dd*sc; s+=`<rect x="${x}" y="${y}" width="${ww}" height="24" fill="${col}"/><text x="${x+4}" y="${y+16}" font-size="10" fill="#fff">${n} ${SIM.fmtDur(dd)}</text>`; x+=ww; }); return s+`<text x="${x+6}" y="${y+16}" font-size="10" fill="var(--ink2)">${r[2]}</text>`; }).join('')}
      <text x="180" y="166" font-size="10" fill="var(--ink2)">0</text><text x="650" y="166" font-size="10" text-anchor="end" fill="var(--ink2)">200 ms</text></svg>
      <p class="small">At the playhead AES4 is playing programme that entered the card at ${SIM.fmtT(Math.max(0,t-d1-d4))} — while the video leaving SDI OUT is ${Math.round((d1+d4)/FRAME_T*100)/100} frames newer.</p>`;
    const levels=[['1 second',1],['100 ms',0.1],['1 frame (33.4 ms)',FRAME_T],['1 main-loop pass',C.LOOP_T],['1 ms (48 samples)',0.001]];
    const H=levels.length*46+10; const {c:z,w:zw}=SIM.canvas(m.querySelector('#zl'),H);
    levels.forEach(([nm,span],i)=>{ const y=8+i*46, t0=Math.max(0,Math.min(1-span,t-span/2)); z.fillStyle=SIM.css('--ink'); z.font='12px sans-serif'; z.fillText(nm,6,y+16);
      const x0=170, pw=zw-x0-10; z.strokeStyle=SIM.css('--grid'); z.strokeRect(x0,y+2,pw,34); const N=Math.min(600,pw);
      [['dimg','#d07a2f'],['vog','#2f9e4f']].forEach(([k,col])=>{ z.strokeStyle=col; z.beginPath(); for (let j=0;j<=N;j++){ const tt=t0+span*j/N; const gv=gainsAt(tt)[k]; const yy=y+34-gv*30; j?z.lineTo(x0+pw*j/N,yy):z.moveTo(x0,yy); } z.stroke(); });
      const px=x0+(t-t0)/span*pw; z.strokeStyle=SIM.css('--play'); z.beginPath(); z.moveTo(px,y); z.lineTo(px,y+38); z.stroke(); });
  };
  SIM.on('time', draw);
}
function stepIdx(t){ const sn=snapAt(t); const ph=(t-sn.t)/C.LOOP_T; let a=0, k=0; for (let j=0;j<STEPS.length;j++){ if (ph>=a) k=j; a+=STEPS[j][1]; } return k; }

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:150,w:120,h:150,t:'T6304 rear',s:['SDI IN/OUT','AES1–4 OUT','VO IN · GPI/O · META'],d:'Passive rear module (T6304.net): BNC1→P1-97 SDI IN, BNC2→P1-92 SDI OUT, BNC3–6→P1-75/80/37/34 AES1–4, BNC7→P1-17 voice-over, TB1→P1-51/49 GPI/O 1, TB3→P1-58/56 GPI/O 2, TB2→P1-52/50 metadata. ID resistors 3K57/3K01.'},
  eq:{x:160,y:20,w:120,h:56,t:'GS1574A EQ',s:['cable equaliser, CD1'],d:'Adaptive cable equaliser on SDI IN; its carrier detect CD1 goes to the FPGA (pin 82).'},
  des:{x:310,y:20,w:140,h:56,t:'GS1559 + GO1525',s:['deserialiser, re-clocker'],d:'HD/SD deserialiser with the GO1525 VCO. 20-bit Yin/Cin to the FPGA; LOCK_60, ~RC_BYP, SMPTE and SD/~HD to the AVR. Its re-clocked serial output feeds the GS1528 cable driver (SDI OUT).'},
  drv:{x:480,y:20,w:110,h:56,t:'GS1528',s:['SDI OUT driver'],d:'Cable driver for the re-clocked SDI loop output (BNC2). Slew selected by SD/~HD.'},
  fpga:{x:310,y:120,w:200,h:150,t:'EP1C12 FPGA (pod31)',s:['SD/HD demux (HANC)','non_audio_detector','CAT552_switch · router','AES out ×4, shifters'],d:'Quartus II 5.1 project “pod31” (shared with POD31/M6202A), EP1C12Q240C6 from an M25P40 used as EPCS4. De-embeds two pairs of the selected group, finds SMPTE 337 bursts, sends the chosen pair to the CAT552, exchanges TDM audio and 20 control words with the SHARC, shifts status to the AVR (ALTERA1–19) and control in (80 bytes).'},
  cat:{x:560,y:110,w:150,h:70,t:'CAT552 module (P5)',s:['Dolby E / AC-3 decoder','5.1 out, metadata'],d:'Optional decoder module on P5 (CAT_NO_552_RA). Control pins MAP0/1, PRG0–2, DLM0–2 (dialnorm), PLE/PLS/PGP, RESET_552, PDN from the FPGA; decoded I2S (DADA–DADD), ERR and META_IN back.'},
  dsp:{x:560,y:210,w:150,h:80,t:'ADSP-21262 SHARC',s:['SampleIRQ mix, ramps','delay lines, clip'],d:'VisualDSP++ project shell262 (from the RLM meter series). SPORT0/1: 10-slot TDM audio; SPORT2/3: 20 control words a sample. Mixes voice-over into L/R/C and AES4, dims the programme, ramps both gains, delays the voice-over 1 frame and AES4 another 4 frames, clips at ±1. Boots from the AT25F512A (inferred).'},
  vo:{x:160,y:200,w:120,h:70,t:'CS8416 + AD1895',s:['VO receiver','SRC → 48 kHz'],d:'Voice-over AES (32–96 kHz) enters the CS8416 through the FPGA, then the AD1895 sample-rate converter locks it to the card’s 48 kHz (SRCDATA1 → FPGA → SHARC slots 8/9). The AVR reads the CS8416 lock bit (Astatus).'},
  avr:{x:310,y:310,w:200,h:80,t:'AT90CAN128 (8 MHz)',s:['main loop, GPI/O, LEDs','DIP via FPGA, EEPROM'],d:'ICCAVR v1.04. Polls the Gennum status pins, reads the voice-over lock, runs the GPI state machine, fills the 80-byte control buffer and bit-bangs it to the FPGA every pass, drives the LEDs and talks DashBoard over CAN.'},
  can:{x:560,y:320,w:150,h:56,t:'SN65HVD233 → midplane',s:['CAN 1 Mbit/s'],d:'CAN transceiver to the frame midplane (P2) and the frame controller; DashBoard on a PC beyond it.'},
  out:{x:160,y:310,w:120,h:56,t:'EL5263 drivers',s:['AES 75 Ω ×4'],d:'Three EL5263 triple op-amps drive the four 75 Ω unbalanced AES outputs (manual: 1 V p-p terminated).'},
  meta:{x:740,y:150,w:120,h:56,t:'ADM3485',s:['metadata RS-485'],d:'CAT552 metadata → FPGA META → ADM3485 → TB2 (P1-52/50): the “proprietary Dolby metadata serial stream”.'},
};
const WIRES=[['rear','eq','SDI'],['eq','des',''],['des','drv',''],['drv','rear','SDI OUT'],['des','fpga','20-bit video'],['fpga','cat','AES2 pair'],['cat','fpga','5.1 I2S'],['fpga','dsp','TDM 10 ch + 20 words'],['dsp','fpga','mixed audio'],['rear','vo','VO IN'],['vo','fpga','SRCDATA1'],['avr','fpga','80 bytes / 19 bytes'],['avr','can','CAN'],['fpga','out','AES1–4'],['out','rear','AES OUT'],['cat','meta','META'],['meta','rear',''],['rear','avr','GPI/O']];
function viewBlock(m){
  window.__m6206Active = false;
  m.innerHTML = `<div class="grid2">${card('Block diagram (click a block; colours follow the playhead)', `<div id="bdg"></div><p class="small muted">Redrawn from M6206-FUNCTIONAL.pdf (and the Astral plant drawing), the netlist and the firmware.</p>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Astral plant (ASTRAL-M6206-FUNCTIONAL ISS2)', `<p class="small">Programme SDI (from an ADM-6800-C de-embed path) → <b>M6206</b>; AES1 L/R, AES2 C/LFE, AES3 Ls/Rs and AES4 PCM → an <b>AC-3 encoder</b> (DIG IN 1/2, 3/4, 5/6, 7/8) with the METADATA line; video through a delay frame synchroniser and audio through a delay → <b>MXA-6800 embedder</b>. Voice-over audio and two GPI/O lines (main and override) come in; DashBoard reaches the card through a DFR-8320 frame.</p>`)}</div></div>`;
  const draw=()=>{ const sn=snapAt(SIM.t); const active={eq:sn.CD,des:sn.CD,drv:sn.CD,fpga:sn.mode==='run',cat:sn.dolby&&sn.r552,dsp:sn.mode==='run',vo:sn.Ast,avr:sn.mode==='run',can:sn.mode==='run',out:sn.ai,meta:sn.dolby&&sn.a2>=2,rear:1};
    let s=`<svg viewBox="0 0 880 400" style="width:100%;display:block"><defs><marker id="m6ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--ink2)"/></marker></defs>`;
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; const [x1,y1]=ctr(A_), [x2,y2]=ctr(B_); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-opacity=".55" marker-end="url(#m6ar)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="9.5" fill="var(--ink2)">${l}</text>`:''}`; });
    Object.entries(BLOCKS).forEach(([k,b])=>{ s+=`<g class="m6blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${active[k]?'color-mix(in srgb,var(--accent) 18%,var(--panel))':'var(--panel)'}" stroke="${D.ui.block===k?'var(--accent)':'var(--line)'}" stroke-width="${D.ui.block===k?2.5:1}"/><text x="${b.x+8}" y="${b.y+17}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((x,i)=>`<text x="${b.x+8}" y="${b.y+33+i*14}" font-size="10.5" fill="var(--ink2)">${x}</text>`).join('')}</g>`; });
    m.querySelector('#bdg').innerHTML=s+'</svg>';
    const B=BLOCKS[D.ui.block]; m.querySelector('#bi').innerHTML=`<h3>${B.t}</h3><p class="small">${B.d}</p><p class="small muted">State now: ${active[D.ui.block]?'active':'idle / off'}.</p>`;
    m.querySelectorAll('.m6blk').forEach(g=>g.onclick=()=>{ D.ui.block=g.dataset.k; draw(); });
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from M6206A.net, pod31.qsf, configdai.c, T6304.net) ---------------- */
function chip(x,y,w,name,left,right,sub){ const h=Math.max(left.length,right.length)*16+30;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y+h+16}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+34+i*16; s+=`<line x1="${x-40}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x-42}" y="${yy-2}" font-size="9" text-anchor="end" fill="var(--accent)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+34+i*16; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+40}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x+w+42}" y="${yy-2}" font-size="9" fill="var(--accent)">${p[1]}</text>`; });
  return s; }
const SHEETS=[
  {name:'1 · AT90CAN128 (U11)', note:'Pin → net from M6206A.net; port use from v100w.c/M6206.h/altera.h. Pin 35 (PC0) has no net, yet sharc.h drives SHARC_RESET on PORTC bit 0.', svg:()=>`<svg viewBox="0 0 760 560" style="width:100%">${chip(250,20,260,'U11 AT90CAN128',
    [['2 PE0','GPIO2_N → GPO-2'],['3 PE1','GPIO2_P ← GPI-2'],['4 PE2','LED14 SD'],['5 PE3','N_CONFIG (FPGA)'],['7 PE5','LED13 HD'],['8 PE6','LED12 ERR'],['9 PE7','~RC_BYP'],['10–16 PB0–6','LED11,4,3,9,8,7,5'],['17 PB7','LED6 VOICE OVER'],['18 PG3','SMPTE'],['19 PG4','20/10-bit'],['26 PD1','CS_60'],['27 PD2','LOCK_60'],['30 PD5','CAND (TXCAN)'],['31 PD6','CANR (RXCAN)'],['32 PD7','SD/~HD'],['33 PG0','LED10 COM'],['34 PG1','LED2 DOLBY4']],
    [['35 PC0','(no net) “SHARC_RESET”'],['36 PC1','GPIO1_N → GPO-1'],['37 PC2','GPIO1_P ← GPI-1'],['38–41 PC3–6','CS8416 IN/CLK/OUT/SEL1'],['42 PC7','CS8416_RESET'],['43 PG2','ALTERA_RESET'],['44 PA7','ALTERA0 data out'],['45 PA6','ALTERA1 DATA_READ'],['46 PA5','ALTERA2 rw data in'],['47 PA4','ALTERA3 DATA_READ1'],['48 PA3','ALTERA4 DATA_READ2'],['49 PA2','ALTERA5 clock'],['50 PA1','ALTERA6 strobe read'],['51 PA0','ALTERA7 FSYNCH'],['59 PF2','AN_BMID2'],['60 PF1','AN_BMID'],['61 PF0','AN_SLOTID'],['23/24','8 MHz crystal']],'redrawn — not the original P-CAD sheet')}</svg>`},
  {name:'2 · EP1C12 pins (pod31.qsf)', note:'Location assignments from pod31.qsf (115 pins). DIP switches enter the FPGA, not the AVR.', svg:()=>`<svg viewBox="0 0 760 520" style="width:100%">${chip(250,20,260,'U3 EP1C12Q240C6',
    [['41–63','Yin[9:0] · Cin[9:0] (GS1559)'],['28','pclk'],['82','CD1 (GS1574A)'],['114','FLAG_20b_10b'],['16–21','AES1–AES6'],['181–188','dip1…dip8 (SW1)'],['133,132,128–123','ALTER0…7 (AVR PA7…PA0)'],['137','AES_8416_1 → CS8416'],['138–143','RMCK1, SCLK_IN1, LRCLK_IN1, SDATA_IN1'],['134–136','SRCDATA1, LRCLK1, SCLK1 (AD1895)'],['144','DSP_CLK_OUT'],['156','GPO1 (CS8416)']],
    [['1–15','DAI_P8…P20 (SHARC)'],['194','RESET_552'],['195,196','MAP0, MAP1'],['197,200,201','PRG0–2'],['206–208','DLM0–2 (dialnorm)'],['213–215','PLE, PLS, PGP'],['216–227','DADA…DADD, DAFS, DABC, DADM'],['218,219,222','EAD, EAFS, EABC'],['236','META_IN'],['237','ERR'],['238–240','META_BC/FS/SUB'],['23','META → ADM3485'],['202,203','PDN, ACS']],'redrawn from the .qsf')}</svg>`},
  {name:'3 · SHARC DAI (configdai.c)', note:'SRU routing written by InitDAI(); pins named as on the netlist (U12 DAI_P1…P20).', svg:()=>`<svg viewBox="0 0 760 420" style="width:100%">${chip(250,20,260,'U12 ADSP-21262 DAI',
    [['DAI_P1–P4','FLAG10–13 “DIP SWITCH 1–4” (in)'],['DAI_P8','SPORT1_CLK_I'],['DAI_P9','SPORT1_FS_I'],['DAI_P10','SPORT1_DA_I (TDM in)'],['DAI_P11','SPORT3_DA_I (control in)'],['DAI_P12','SPORT3_CLK_I'],['DAI_P15','SPORT2/3_FS_I']],
    [['DAI_P14','LOW: “CS8416 reset” (held)'],['DAI_P13','SPORT2_DA_O (control out)'],['DAI_P16','SPORT2_FS_O'],['DAI_P17','SPORT0_DA_O (TDM out)'],['DAI_P18','SPORT1_CLK_O → SPORT0'],['DAI_P19','SPORT1_FS_O → SPORT0'],['DAI_P20','SPORT2_CLK_O']],'TDM: MR1CS0 = MT0CS0 = 0x3FF (10 slots) · control: MR3CS0 = MT2CS0 = 0xFFFFF (20)')}</svg>`},
  {name:'4 · GPI/O and metadata', note:'GPI inputs pulled up to 3V (R131, R21) and fed through R130/R27; tallies are open collectors Q2/Q3 (2N4401) on the − pins; metadata via U25 ADM3485. Values from the BOM are not tied to refs here.', svg:()=>`<svg viewBox="0 0 760 300" style="width:100%" font-size="11" fill="var(--ink)">
     <text x="10" y="20" font-weight="700">GPI/O 1 — TB1 (rear pos. 9)</text><path d="M20 60 H120 M120 60 H200" stroke="var(--ink)"/><text x="20" y="54">+ P1-51 AES4P</text><rect x="200" y="52" width="40" height="16" fill="none" stroke="var(--ink)"/><text x="204" y="64">R130</text><path d="M240 60 H330" stroke="var(--ink)"/><text x="335" y="64">PC2 GPIO1_P (pin 37)</text>
     <path d="M150 60 V30 H190" stroke="var(--ink)"/><rect x="190" y="22" width="40" height="16" fill="none" stroke="var(--ink)"/><text x="194" y="34">R131</text><text x="236" y="34">3V</text>
     <path d="M20 110 H200" stroke="var(--ink)"/><text x="20" y="104">− P1-49 AES4N</text><rect x="200" y="102" width="40" height="16" fill="none" stroke="var(--ink)"/><text x="204" y="114">R136</text><path d="M240 110 H280" stroke="var(--ink)"/><circle cx="300" cy="110" r="18" fill="none" stroke="var(--ink)"/><text x="292" y="114">Q2</text><text x="325" y="114">base ← PC1 GPIO1_N (GPI1_TALLEY)</text><text x="20" y="140">G GNDD</text>
     <text x="10" y="180" font-weight="700">GPI/O 2 — TB3 (rear pos. 8): same circuit with R27/R21/R36/Q3 on P1-58/56 → PE1 / PE0</text>
     <text x="10" y="220" font-weight="700">METADATA — TB2 (rear pos. 10)</text><text x="20" y="244">CAT552 META_IN → FPGA (236) → META (23) → U25 ADM3485 DI (pin 4) → A/B (6/7) → AES8P/N → P1-52/50</text>
     <text x="10" y="284" fill="var(--ink2)">redrawn from M6206A.net — not the original sheet</text></svg>`},
  {name:'5 · Rear T6304 ↔ card P1', note:'From T6304.net (rear) and M6206A.net (card). The net names (BNC4_SIG, AES7P…) are the generic openGear edge-connector names.', svg:()=>`<svg viewBox="0 0 760 330" style="width:100%" font-size="11">${REARS.T6304.pos.map((p,i)=>{ const y=24+i*28; const card={sdiin:'R1/L1 → GS1574A',sdiout:'C38 ← GS1528',aes1:'R59 ← EL5263',aes2:'R114 ← EL5263',aes3:'R64 ← EL5263',aes4:'R108 ← EL5263',voin:'H3 jumper → FPGA',gpio2:'R27/R36 (GPI/O 2)',gpio1:'R130/R136 (GPI/O 1)',meta:'U25 ADM3485'}[p[2]];
      return `<text x="10" y="${y}" fill="var(--ink)">${i+1} ${p[0]}</text><line x1="170" y1="${y-4}" x2="330" y2="${y-4}" stroke="var(--ink2)"/><text x="250" y="${y-8}" text-anchor="middle" fill="var(--accent)">P1-${p[3]}</text><text x="340" y="${y}" fill="var(--ink)">${card}</text>`; }).join('')}<text x="10" y="320" fill="var(--ink2)">AN_BMID P1-2 (3K57) → PF1 · AN_BMID2 P1-1 (3K01) → PF2 — redrawn</text></svg>`},
  {name:'6 · CAT552 connector P5', note:'P5 pins with nets from M6206A.net. The module itself is third-party; only the connector is Ward-Beck’s.', svg:()=>`<svg viewBox="0 0 760 300" style="width:100%">${chip(250,20,260,'P5 CAT_NO_552_RA',
    [['3','RESET_552 ← FPGA 194'],['7,8','MAP0, MAP1'],['11–13','PRG0–2'],['17','PDN'],['18','ACS'],['31–33','DLM0–2'],['34–36','PLE, PLS, PGP']],
    [['45,46,53,54','DADA, DADB, DADC, DADD'],['52,55,56','DADM, DAFS, DABC'],['49–51','EAD, EAFS, EABC'],['57–59','PB2, PB0, PB1'],['60','META_IN → FPGA 236'],['70','ERR → FPGA 237'],['2,5,6,10…','+5V']],'redrawn')}</svg>`},
];
function viewSchem(m){
  window.__m6206Active = false;
  m.innerHTML = `${card('Schematic set — redrawn from the netlist, the .qsf and the source (not the original CAD)', `<div id="tabs" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="nt" class="small muted"></p>`)}`;
  const draw=()=>{ m.querySelector('#tabs').innerHTML=SHEETS.map((s,i)=>`<button class="${i===D.ui.sheet?'on':''}" data-i="${i}">${s.name}</button>`).join(''); m.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ D.ui.sheet=+b.dataset.i; draw(); });
    const S=SHEETS[D.ui.sheet]; m.querySelector('#sh').innerHTML=S.svg(); m.querySelector('#nt').textContent=S.note; };
  draw();
}

/* ---------------- software ---------------- */
function bufferOut(sn, w){ const b=new Array(80).fill(0); b[0]=0x56; b[1]=0x32; b[2]=0x30; b[3]=0x31; b[4]=sn.mix; b[5]=0; b[6]=sn.vo; b[7]=sn.ms; b[11]=sn.ramp; b[40]=b[41]=b[42]=b[43]=64; for (let i=44;i<54;i++) b[i]=64; for (let i=56;i<66;i++) b[i]=64; b[54]=sn.vo?64:0; b[55]=sn.DimEnable;
  b[72]=(sn.Ast<<7)|((sn.rst?0:1)<<6)|(1<<5)|(sn.g2<<4)|(1<<2); b[74]=sn.ai; b[75]=(1<<6)|(sn.grp<<4)|(sn.grp<<1); b[76]=((sn.dial?0x10:0xE0)&0xE0)|(sn.r552&0x10)|((w.fmt==='SD'?0x80:0)>>4)|1; b[77]=0x80|(0<<6)|0x20|2; b[78]=0x40|(3<<1); b[79]=(2<<6)|(1<<3); return b; }
const BUF_NOTE = {0:'"V"',1:'"2"',2:'"0"',3:'"1"',4:'voiceover_mix',5:'pcm_mode (forced NO)',6:'voiceover',7:'mode_select',11:'ramping_type',40:'output1–4 (64)',44:'volume1L–10L',54:'VoiceoverEnable',55:'DimEnable',56:'volume1R–10R',67:'mode2volume',72:'Astatus|clocks_stable|dolby_changed|gpi2|os1|os0|RV1',73:'RESET_VECTOR',74:'AUDIO_INFORMATION',75:'cat_input1|audio2|audio1',76:'dialnorm|reset_552|sd_hd|ref',77:'dsp_sync_disable|bypass|audio_input',78:'swap|aes4/aes3 input',79:'aes3/2/1 input'};
function viewSoft(m){
  window.__m6206Active = false;
  m.innerHTML = `<div class="grid2">${card('AVR main loop — running step highlighted', `<div id="loop"></div>`)}${card('Voice-over state machine — ALTERA_TRANSLATE_UART0()', `<div id="fsm"></div>`)}</div>
   ${card('Control path: AVR ALTERA_BUFFER_out[80] → FPGA → SHARC altera_data[20] (live)', `<div id="buf" class="scroll"></div>`)}
   <div class="grid2">${card('SHARC SampleIRQ pipeline (sample.c) — live gains', `<div id="dsp"></div>`)}${card('Status path: FPGA → AVR (ALTERA13–18)', `<div id="rd"></div>`)}</div>
   <div class="grid2">${card('PARAMETER_UPDATE → CAN_TX_TIMER report queue', `<div id="pq"></div>`)}${card('Toolchain and images', `<div id="tc"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, sn=snapAt(t), w=worldAt(t), k=stepIdx(t), g=gainsAt(t);
    m.querySelector('#loop').innerHTML=`<table class="kv">${STEPS.map((s,i)=>`<tr style="${i===k&&sn.mode==='run'?'background:color-mix(in srgb,var(--accent) 20%,transparent)':''}"><td class="mono small">${s[0]}</td><td class="small">${s[2]}</td><td class="mono small">${SIM.fmtDur(s[1]*C.LOOP_T)}</td></tr>`).join('')}</table><p class="small muted">Step shares of the ≈4.2 ms pass are ${inf}; only the bit-bang share is cycle-counted. Mode now: ${sn.mode}.</p>`;
    const cur = sn.mode!=='run'? -1 : (sn.g1?2:0)+(sn.g2?1:0);
    const st=[['gpi1 = NO · gpi2 = NO','INACTIVE · voiceover = NO','tallies off, LED off, gpi2_active forced NO'],['gpi1 = NO · gpi2 = YES','OVERRIDE (2.7) / ACTIVE (3.3) · voiceover = YES','GPO-2 on, LED on — not in the manual'],['gpi1 = YES · gpi2 = NO','ACTIVE · voiceover = YES','GPO-1 + GPO-2 on, LED on, programme dimmed'],['gpi1 = YES · gpi2 = YES','OVERRIDE · voiceover = NO','GPO-1 on; GPO-2 and LED chirp 10/70 passes']];
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 560 250" style="width:100%" font-family="sans-serif">${st.map((s,i)=>{ const x=10+(i%2)*260, y=10+Math.floor(i/2)*120; const on=i===cur; return `<rect x="${x}" y="${y}" width="245" height="100" rx="8" fill="${on?'color-mix(in srgb,var(--accent) 22%,var(--panel))':'var(--panel)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/><text x="${x+10}" y="${y+22}" font-size="12" font-weight="700" fill="var(--ink)">${s[0]}</text><text x="${x+10}" y="${y+44}" font-size="10" fill="var(--ink)">${s[1]}</text><text x="${x+10}" y="${y+64}" font-size="9.5" fill="var(--ink2)">${s[2]}</text>`; }).join('')}
      <text x="10" y="246" font-size="9" fill="var(--ink2)">GPI-1 edge → gpi1_active = level, gpi2_active = NO · GPI-2 closure → toggle gpi2_active (debounce 50 passes) · DashBoard 3.3 writes the same flags</text></svg>`;
    const b=bufferOut(sn,w); let h='<table class="kv"><tr><th>byte</th><th>value</th><th>meaning (M6206A.c ALTERA_SORT)</th><th>SHARC word</th></tr>';
    for (let i=0;i<80;i++){ if (b[i]===0 && !BUF_NOTE[i]) continue; if ([41,42,43].includes(i) || (i>44&&i<54) || (i>56&&i<66)) continue; h+=`<tr><td class="mono">${i}</td><td class="mono">0x${hx(b[i])}</td><td class="small">${BUF_NOTE[i]||''}</td><td class="mono small">altera_data[${i>>2}] bits ${31-8*(i&3)}..${24-8*(i&3)}</td></tr>`; }
    m.querySelector('#buf').innerHTML=h+`</table><p class="small muted">The AVR clocks these 80 bytes out twice a pass (MSB first, PA7 data, PA2 clock, PA0 FSYNCH). The SHARC reads 20 words per sample and only acts when word 0 is 0x56323031 (“V201”) — the same four bytes ALTERA_ALIGNMENT_CHECK() expects echoed back. Bytes 72–79 go to the FPGA router (register map: “m6206 operational ctl info.doc”, Reg 19/20); their packing here is ${inf} where the code’s shifts overlap.</p>`;
    const ms=sn.ms, mix=sn.mix; m.querySelector('#dsp').innerHTML=`<svg viewBox="0 0 720 250" style="width:100%" font-size="11" fill="var(--ink)">
      <text x="6" y="18">TDM in 0–5: CAT552 L R C LFE Ls Rs</text><text x="6" y="38">TDM in 6/7: pair 1 PCM → delay_ch3/4 (1584)</text><text x="6" y="58">TDM in 8/9: voice-over → delay_ch1/2 (1584)</text>
      <rect x="400" y="6" width="310" height="56" rx="6" fill="var(--panel)" stroke="var(--line)"/><text x="410" y="24">out[k] = in[k] × dim_gain × output_gain[k/2]</text><text x="410" y="42">dim_gain = ${g.dimg.toFixed(4)} (${db(g.dimg).toFixed(1)} dB)</text><text x="410" y="58">output_gain = volume[64] = 0.9953</text>
      <rect x="6" y="80" width="704" height="70" rx="6" fill="var(--panel)" stroke="var(--line)"/><text x="16" y="98">mode = ${ms} (${MODE_NAMES[ms]}): ${ms===3?'temp = (in8 + in9)/2 × voiceover_gain':ms===0?'L = in8, R = in9, C = (in8+in9)/2, each × voiceover_gain':ms===1?'temp = in8 × voiceover_gain':'temp = in9 × voiceover_gain'}</text>
      <text x="16" y="116">voiceover_mix = ${mix} (${MIX_NAMES[mix]}): added to ${mix===0?'out 0, 1':mix===1?'out 0, 1, 2':'out 2'} and always to out 6, 7 (AES4)</text><text x="16" y="134">voiceover_gain = ${g.vog.toFixed(4)} · RampAudioCalc(type ${sn.ramp} = ${C.RAMP_NAMES[sn.ramp]}): g += (target − g) × ${C.RAMP[sn.ramp]}</text>
      <text x="6" y="172">pcm_mode == YES → out0/1 = out6/7, out2–5 = 0 (never: ALTERA_TRANSLATE_UART0 forces pcm_mode = NO)</text>
      <text x="6" y="190">out 6/7 → delay_ch5/6 (6336) → AES4 · clip to ±0.9999999 / −1.0 · fix by 23</text>
      <text x="6" y="208">TDM out 8/9 = AAAAAA/BBBBBB if in8 = 000000 and in9 = FFFFFF, else 000000/FFFFFF (DSP sync echo)</text>
      <text x="6" y="232" fill="var(--ink2)">TDM out 0–7 → FPGA → AES1 (L/R) · AES2 (C/LFE) · AES3 (Ls/Rs) · AES4 (A/B)</text></svg>`;
    const a13=ALTERA13(w);
    m.querySelector('#rd').innerHTML=`<table class="kv"><tr><th>byte</th><th>bits</th><th>value now</th></tr>
      <tr><td>ALTERA1–4, 7–10</td><td class="small">bit 7 lock, 6..0 sample count (two groups)</td><td class="mono">AUDIO1 ${sn.a1?1:0} · AUDIO2 ${sn.a2?1:0}</td></tr>
      <tr><td>ALTERA6, 12</td><td class="small">alignment check (0xA0 in the top nibble)</td><td class="mono">${w.alignFault?'bad':'0xA_'}</td></tr>
      <tr><td>ALTERA13</td><td class="small">dip1…dip8 (bit 7 = SW1); firmware uses 7,6 group, 1 DashBoard, 0 save</td><td class="mono">${bin8(a13)}</td></tr>
      <tr><td>ALTERA14</td><td class="small">7 HD1 en · 6 HD2 en · 5 compressed (AES1) · 4..0 Pc type</td><td class="mono">${sn.a1>=2?'compressed '+(sn.a1===3?28:1):'PCM'}</td></tr>
      <tr><td>ALTERA15</td><td class="small">7 compressed (AES2) · 4..0 Pc type</td><td class="mono">${sn.a2>=2?'1 · '+(sn.a2===3?28:1):'0'}</td></tr>
      <tr><td>ALTERA16/17</td><td class="small">AES3/AES4 flags (second group = first group in v1.04)</td><td class="mono">—</td></tr>
      <tr><td>ALTERA18</td><td class="small">7 DOLBY_INSTALLED · 6 CAT552 audio error · 5 silence · 4 DSP sync · 3 sync in normal operation</td><td class="mono">${w.cat?1:0}${w.catFault?1:0}0${w.dspOk?1:0}…</td></tr></table>
      <p class="small muted">The FPGA's shifter_out_48bit sends cntrl_status LSB first; read_data2() assembles MSB first, so cntrl_status[0] (dip1) lands in ALTERA13 bit 7. Bit order derived from the two sources.</p>`;
    m.querySelector('#pq').innerHTML=`<table class="kv"><tr><th>#</th><th>parameter_refresh</th><th>OID</th><th>value now</th></tr>${PR.map((p,i)=>`<tr style="${i===sn.pr?'background:color-mix(in srgb,var(--accent) 18%,transparent)':''}"><td>${i}</td><td class="mono small">${p}</td><td class="mono">${oidTxt(PR_OID[i])}</td><td class="mono small">${valTxt(PR_OID[i], oidValue(fwLike(sn), w, PR_OID[i]))}</td></tr>`).join('')}</table><p class="small muted">PARAMETER_UPDATE() checks for changes in this order: AES1, AES2, voice-over status, voice-over lock, SDI format, status_can, mode, group, Dolby; then Signal Status; otherwise it steps to the next entry once the last report went out. AES3_LOCK/AES4_LOCK/AUTO_SWAP/GROUP_SEL2 in M6206.h share numbers with other entries.</p>`;
    m.querySelector('#tc').innerHTML=`<table class="kv"><tr><th>AVR</th><td class="small">ICCAVR 7.15 (<span class="mono">V100W.mak</span> -DAT90CAN128 -MLongJump), 8 MHz, app below 0x1E000; zeuspack → <span class="mono">m6206a_v1_05.bin</span> (v105 only); no hex/bin archived</td></tr>
      <tr><th>SHARC</th><td class="small">VisualDSP++ <span class="mono">shell262.dpj</span> (schema 16, created Feb 2005 for the RLM series) → DSP loader file; ADSP-21262, PLLM16 ${infT('crystal 24.578 MHz on the BOM')}; boot flash AT25F512A ${inf}</td></tr>
      <tr><th>FPGA</th><td class="small">Quartus II 5.1 SP0.15, <span class="mono">pod31.qpf</span>, EP1C12Q240C6, config device EPCS4 (board: M25P40)</td></tr>
      <tr><th>Releases</th><td class="small">DEMO 2007|40-08-13 · PROTOTYPE 08-22 · PROTOTYPE2 10-30 · DEMO2 11-20 · V100 12-06 · v101 12-20 · v102 2008|41-04-08 (AES4 5-frame delay) · v104 2008|41-11-18 (“do not use”, HD group-1 fix) · v105 not released</td></tr></table>`;
  };
  SIM.on('time', draw);
}
function fwLike(sn){ return {sdi_format:sn.fmt, aes1_lock:sn.a1, aes2_lock:sn.a2, Astatus:sn.Ast, Dolby_card_installed:sn.dolby, voiceover_status:sn.st, voiceover_status_can:sn.stc, group_sel1:sn.grp, mode_select:sn.ms, dim_level1:0xFF, dim_level2:0xEC, input_trim:0, voiceover_mix:sn.mix, dialnorm_enable:sn.dial, ramping_type:sn.ramp}; }

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__m6206Active = false;
  const F=[
    ['Artwork 2026|59: card edge and rear modules now from the CorelDRAW files', `Card edge: ${EDGE_ART.src()}; T6304: ${REAR_ART.T6304.src()}; T6305: ${REAR_ART.T6305.src()}. Inkscape’s CDR import drops the BNC drawings of these 2007 files, so the panels use CorelDRAW’s own PDF (T6304) and the archive’s LibreOffice rendering (T6305) of the same .cdr. The edge drawing puts the four Dolby LEDs beside AES1–4 (as LED pairs), COM Activity and Voice OVER at the bottom. The two modules differ only at 8: T6304 has a GPI/O 2 terminal block there, T6305 an unused BNC — so a T6305 card cannot take the GPI2 (tap) input.`],
    ['The manual’s DIP table is not what the code reads', 'Manual p. 4: SW1 override, SW2/3 group 1, SW4/5 group 2, SW7/8 voice-over mix. <span class="mono">PROCESS_DIP_SWITCHES()</span> (M6206A.c) uses ALTERA13 bits 7/6 = <b>SW1/SW2 for the group</b>, bit 1 = <b>SW7 “Allow Parameter Adjustment”</b>, bit 0 = <b>SW8 “Save Parameter Default”</b>; the Altera bit order follows from shifter_out_48bit.vhd (LSB first) and read_data2() (MSB first).'],
    ['Mode 1 does not exist in v1.04', '<span class="mono">PROCESS_DIP_SWITCHES()</span> sets <span class="mono">pod31_mode = YES</span>, <span class="mono">auto_swap = YES</span> and <span class="mono">audio2 = audio1</span> every pass, so the card is always in “Mode 2” with both group selectors on the same group, even without a CAT552 (main() sets pod31_mode from Dolby_card_installed, then it is overwritten).'],
    ['The CAT552 always gets the second pair', '<span class="mono">ALTERA_TRANSLATE_UART0()</span> hard-codes <span class="mono">cat_input1 = NO2 − NO1</span> (= 1) and <span class="mono">pcm_mode = NO</span>; the “AES1 first, then AES2” search and the PCM fall-back rules 3 and 4 of the manual sit in a commented-out block. Which embedded pair “1” selects is '+infT('CAT552_switch.vhd truth table: sel1 = 0, sel0 = 1 → AUD1_2')+'.'],
    ['AES4 is five frames late, not “no delay”', 'Manual: connector 6 has no delay. sample.c delays slots 6/7 by DELAY_COUNTER_SIZE (1584) on input and DELAY_COUNTER_SIZE1 (1584 × 4) on output: 7920 samples = 165 ms ≈ 4.95 frames — the v102 change “ADDED 5 FRAMES OF DELAY FOR AES4”. The voice-over (slots 8/9) gets the single 1584-sample delay.'],
    ['GPI-2 on its own turns the voice-over ON', 'In ALTERA_TRANSLATE_UART0() the case gpi1 = NO, gpi2 = YES sets <span class="mono">voiceover = YES</span>, VOICEOVER_LED_ON and <span class="mono">voiceover_status = OVERRIDE</span> while <span class="mono">voiceover_status_can = ACTIVE</span>. The manual only describes GPI-2 as override/cancel. With the control panel (button → GPI-2, '+inf+') the button alone starts a voice-over, and DashBoard shows “Override” on 2.7 and “Active” on 3.3 at the same time. Choosing “Override” in DashBoard with no GPI-1 does the same.'],
    ['Pgm Dim range is −30 dB, the manual says −40', 'Parameter31_Message RANGE_CONSTRAINT 0xFFE2…0x0000 (−30…0 dB), while dim_data.c has 41 steps (0…−40 dB) and the manual says “0 dB to −40 dB”. DIM_Table() simply negates the low byte.'],
    ['Pgm Input Trim does nothing', '<span class="mono">input_trim</span> (OID 3.4, −15…+15 dB) is set and echoed in DASHBOARD_RESPONSE_SETUP() but never copied to ALTERA_SORT() nor saved by SAVE_INFORMATION_EEPROM().'],
    ['A DashBoard group change is undone by the DIP switch', 'SET 2.11 writes group_sel1 (although Parameter2B is read-only); the next pass PROCESS_DIP_SWITCHES() reloads it from SW1/SW2. Each change also trips PROCESS_GROUP_COMPARE1() → a 100-pass mute.'],
    ['SHARC_RESET() drives a pin with no net', 'sharc.h: SHARC_RESET_PORT = PORTC, bit 0. On M6206A.net, AT90CAN128 pin 35 (PC0) is not connected; the SHARC’s RESET (U12-121) is only on net SHARC_RESET with U10-3. DSP_SYNC_DETECTOR()’s recovery therefore cannot reset the DSP on ISS1 (it does still reset the CAT552).'],
    ['A broken FPGA link ends in a watchdog reset', 'main(): <span class="mono">error0 = ALTERA_ALIGNMENT_CHECK(); while (error0 == YES) NOP();</span> — after 1000 bad “V201” echoes the loop spins with no WDR, so the 16 ms watchdog (WDTCR = 0x08) reboots the card. Deliberate or not, it is the only recovery.'],
    ['AES3/AES4 and DOLBY 3/4 LEDs never light', 'REFRESH_LEDS() has the AES3/AES4 blocks commented out; DATA_INITIALIZATION() turns them off at boot. The manual describes AUDIO GROUPS 1–4 LEDs.'],
    ['METADATA_CHIRP has no visible effect', 'format_alternate toggles every 300 passes, but REFRESH_LEDS() turns the DOLBY LED on in both branches (the alternating code is commented out) — a leftover from the M6202A.'],
    ['Two headers disagree', 'M6206A.h (chirp 100/600, refresh list with POD31_MODE = 5, SOFTWARE_VERSION 0) is included by no file; M6206.h (chirp 10/70, SOFTWARE_VERSION 4) is the live one. In M6206.h, AES3_LOCK = POD31_MODE = 3, AES4_LOCK = DOLBY_DECODER = 4, AUTO_SWAP = VOICEOVER_LOCKED = 6, GROUP_SEL1 = GROUP_SEL2 = 8. DOLBY_INSTALLED is PINA bit 5 in M6206A.h but ALTERA18 bit 7 in dolby.h.'],
    ['OIDs that DashBoard is told about but cannot fully read', 'ParamOIDS_Message lists 22 OIDs; the menus also use 1.7, 2.5, 2.8 and 2.9. GET 2.5 (“Embedded AES4 Input”) returns the voice-over lock; 2.8 (Dialnorm) and 2.9 (Pgm Attenuation) return <span class="mono">voiceover_override</span>, which nothing writes. Menu3OID_Message says 3 OIDs and sends 2.'],
    ['Dialnorm toggles reset the decoder', 'Every change of dialnorm_enable makes ALTERA_TRANSLATE_UART0() drop reset_552 for one pass; the next pass PROCESS_AUDIO_INFORMATION() sees reset_552 = 0 and zeroes AUDIO_INFORMATION — a short gap on AES1–3 '+inf+' for the decoder’s re-sync time.'],
    ['Removing the decoder takes 8 seconds to notice', 'RESET_DOLBY() needs DOLBY_ERROR_COUNTER = 2000 consecutive passes (≈8.4 s at '+SIM.fmtDur(C.LOOP_T)+' a pass) before Dolby_card_installed = NO; the CAT552 audio-error check (1000 passes) runs only once after each reset (dolby_error_check_complete).'],
    ['Reports every 288 ms, not 5 seconds', 'TX_FIVE_SECONDS is defined as 1; timer1 reports when tx_interrupt_counter > 1, i.e. every third 96 ms overflow. COM ACTIVITY turns on at each transmit and only goes off when a message is received (can_rx_isr / DASHBOARD_RESPONSE_SETUP), so it stays lit when DashBoard is idle.'],
    ['Code family and leftovers', 'The SHARC project is the RLM meter shell (shell262.dpj path “…\\rlm series\\software\\sharc\\”, rlm24_vu_data.c, slm1-1.mak, vumeter.asm still in the folder). The FPGA project is “pod31”. Manual text says “M6202A” in the mode section. The v104 makefile still points at …\\atmel\\v101\\ sources. The history sheet lists OID “2.1” twice (2.10 lost its zero in Excel).'],
    ['Release status', 'v104 (2008|41-11-18) was a site fix for Dolby E/AC-3 in group 1 on HD-SDI and is marked “do not use”; v105 (zeuspack/bootloader set-up) was never released. The last clean set is atmel v102 / SHARC v102 / Altera v101.'],
  ];
  m.innerHTML = `${card('Findings — what the M6206A firmware is really doing', `<ol class="small">${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`)}
   ${card('Model assumptions', `<ul class="small"><li>Main-loop pass ≈4.2 ms from the bit-bang cycle count ${inf}; step shares within a pass ${inf}.</li><li>DIP ON = closed = 0 with pull-ups on the FPGA inputs; switch 1 at the left of SW1 ${inf}.</li><li>Group 1 carries PCM stereo on AES1 and Dolby E on AES2; tone levels −20 dBFS; voice on the left leg ${inf} (Astral functional drawing shows the PCM pair on AES4).</li><li>Burst phases, lock times (SDI ${SIM.fmtDur(C.SDI_LOCK)}, CS8416 ${SIM.fmtDur(C.CS_LOCK)}), report-timer phase and the frame controller re-reading the card after a RESTART trap ${inf}.</li><li>The CAT552 decodes only the pair the FPGA sends it, one frame late (manual); its internals are not modelled.</li><li>Control-panel wiring to GPI-1/GPI-2 ${inf} from the firmware; the drawing only names “ON/OFF CONTROL”, “VOICE OVER TALLY” and “VOICE OVER ENABLE”.</li><li>T6305 pin use copied from T6304 ${inf}; its CDR shows position 8 “NOT USED”.</li></ul>`)}
   ${card('Sources', `<ul class="small"><li>#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/Software/atmel/v104/ v100w.c, M6206A.c, M6206.h, M6206A.h, altera.c/.h/.lis, dolby.c/.h, sharc.c/.h, CAN_mod.c, cs84xx.c, ADC.c, V100W.mak</li><li>…/Software/Sharc/v102/ backgnd.c, sample.c, RampAudio.c/.asm, volume_data.c, dim_data.c, configdai.c, get_parms.c, shell262.dpj</li><li>…/Software/altera/v102/ pod31.qsf, pod31.bdf, non_audio_detector.vhd, CAT552_switch.vhd, dsp_synch_detector.vhd, shifter_out_48bit.vhd</li><li>…/Software/M6206A SOFTWARE HISTORY.xls · m6206 operational ctl info.doc · M6206A Manual (Preliminary) 22 Aug 07.pdf</li><li>…/PCB/M6206A.net, .bom, .pnp; GERBERS/M6206A.TOP, .TSM, .TSS → assets/m6206-card-copper.png, m6206-card-silk.png · Photo/M6206A Iss1.jpg</li><li>M6206-card-edge.cdr, M6206A-T6304.cdr/.pdf, M6206A-T6305.cdr (Inkscape) · T6304 - #Master/…/T6304.net · M6206-FUNCTIONAL.pdf · ASTRAL-M6206-FUNCTIONAL-ISS2.pdf · M6206-CONTROL PANELiss2 Model (1).pdf</li></ul>`)}`;
}

/* ---------------- keyboard ---------------- */
if (!window.__m6206KeysBound){ window.__m6206KeysBound=true;
  document.addEventListener('keydown', e=>{ if (!window.__m6206Active) return; if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k=e.key.toLowerCase(); if (k==='1') A.gpi1(); else if (k==='2') A.gpi2(); else if (k==='v') A.voIn(); else if (k==='s') A.sdi(); else if (k==='n') rollSecond(); else return; e.preventDefault(); }); }

/* ---------------- register ---------------- */
resetAll();
const FOOTNOTES = [
 {
  "text": "Card-edge and rear artwork (2026|59): M6206-card-edge.cdr (2008-05-08), M6206A-T6304.cdr and M6206A-T6305.cdr (both 2007-08-21).",
  "src": "#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/M6206-card-edge.cdr"
 },
 {
  "text": "The card-edge drawing pairs a Dolby LED (“1–4 LED”, bracketed “Dolby”) beside each of AES1–4.",
  "src": "#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/M6206-card-edge.cdr"
 },
 {
  "text": "T6304 and T6305 differ only at position 8: a GPI/O 2 terminal block on the T6304, an unused BNC on the T6305.",
  "src": "#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/M6206A-T6305.cdr"
 },
 {
  "text": "Backup_of_ copies of the T6304, T6305 and card-edge drawings sit beside the originals; the T6304/T6305 backups (2007-06-27) are older than the main files.",
  "src": "#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/Backup_of_M6206A-T6304.cdr"
 },
 {
  "text": "Only the T6304 has CorelDRAW’s own PDF (2007-08-22); Inkscape’s CDR import drops the BNC drawings, so that PDF is what the T6304 panel uses.",
  "src": "#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/M6206A-T6304.pdf"
 },
 {
  "text": "The M6206A master folder holds an “M6245A - #Engineering” subfolder, another product’s name.",
  "src": "#OPENGEAR #SERIES/M6206A - #Master #OPENGEAR/M6245A - #Engineering"
 }
];
SIM.register({footnotes:FOOTNOTES, 
  id:'m6206', name:'M6206A · SDI de-embedder with Dolby decode and voice-over mixing ('+SIM.year(2007)+')', duration:1,
  product:'M6206A', year:2007, family:'openGear', folder:'#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR',
  summary:'openGear card made for Astral Media: an EP1C12 FPGA de-embeds one SDI audio group and feeds the Dolby E/AC-3 pair to a CAT552 decoder, an ADSP-21262 SHARC mixes an announcer’s voice-over into the decoded L/R(/C) and the PCM pair while ramping the programme down, and an AT90CAN128 runs the GPI state machine, LEDs and DashBoard. Modelled pass by pass from the v1.04 AVR code, the SHARC sample interrupt and the FPGA detectors, on the real ISS1 gerber artwork.',
  highlights:['ISS1 card from the gerbers with live LEDs, DIP switch and a removable CAT552 module','GPI-1/GPI-2 voice-over state machine with tallies, LED chirp and the 1RU control panel','SHARC RampAudioCalc ramps, dim table, mix matrix and the 1- and 5-frame delay lines','DashBoard-style window fed by REPORT_PARAM every 288 ms and SET/GET replies','AVR → FPGA → SHARC 80-byte control path with the “V201” handshake','19 findings: DIP table vs code, no Mode 1, GPI-2 starts voice-over, unconnected SHARC reset'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (≈4.2 ms)', period:()=>C.LOOP_T},
    {label:'1 sample (48 kHz)', period:()=>1/C.FS},
    {label:'1 SDI line', period:()=>{ const f=VF[worldAt(SIM.t).fmt]; return 1/(f.fr*f.lines); }},
    {label:'1 video frame', period:()=>FRAME_T},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
    {label:'1 report (288 ms)', period:()=>C.REP_IDLE},
  ],
  zooms:[[1,'1 s (whole second)'],[0.3,'300 ms (a report)'],[0.1,'100 ms (a ramp)'],[FRAME_T,'1 frame (33.4 ms)'],[0.01,'10 ms'],[C.LOOP_T*1.2,'1 pass (4.2 ms)'],[0.0005,'500 µs'],[0.0001,'100 µs (a few lines)'],[2e-5,'20 µs (1 sample, 1 line)']],
  defaultZoom:0,
  init(){ D.ver++; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: voice-over operation', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
