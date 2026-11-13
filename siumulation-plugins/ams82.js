/* =====================================================================
   AMS8-2 — 8-channel audio monitor, 2 RU (Ward-Beck Systems, firmware V2120, 2009|42)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "AMS82 - #Master"):
   - AMS82 #Engineering/AMS82 #Software/AMS82 #Software #Atmel/AMS82 #Software #Ams8e-5/
       AMS82 #Software #Ams8e-5 #V2120/v200w.c   main(), TRANSLATE_ENCODER1/2, LEFT/RIGHT_ENCODER_UPDATE,
         TRANSLATE_SWITCHES, TRANSLATE_PUSHBUTTONS, UPDATE_DISPLAY, ACTIVITY_MONITOR, COMMUNICATION_MONITOR,
         UART0_setup / UART0_transmit_counter / UART0_translate, UART1_*, PROCESS_* display builders,
         PROCESS_DIALNORM_INFORMATION, PROCESS_INFORMATION_INCREMENT/DECREMENT, RECALL, DATA_initialization
       common.c (PROCESS_SHAFT_ENCODER1/2 state tables, debounce, wait_ms, watchdog_init)
       SIEMENS8-3.c (display bus: PORTC data, PORTG address, CE1/CE2/CE3, WR, RD, RESET, FLASH)
       control.c (PROCESS_SOURCE_INCREMENT), settings.c (Out4 / Dn / Cal), AMS82.c (port_init, UART init), AMS82.h
   - .../AMS82 #Software #Sharc/AMS82 #Software #Sharc #AMS82V205/ams81_main.asm (sport0_isr, main,
       translate_meter_results, shifter, mux_count), vumeter.asm/.h (ballistics), ams81_INIT.ASM (timers,
       SPORTs, flags), ams81_ISR_table.ASM, ams82_vu_data1/2.dat (LED bar tables), ams81_volume_table.dat
   - AMS82 #Engineering/AMS82 #Manual/Complete Manual/AMS82-AAEM Operators Instructions version 2117.pdf
   - AMS82 #Engineering/AMS82 #Software/AMS8 #software COMMUNICATION PROTOCOL.doc
   - AMS82 - #Mechanical #DA #2016/AMS8-2A BOM.pdf (LED board parts and LED colour counts)
   - AMS82 - #ARTWORK #DA #2016/AMS82-FRONT-SILK (CURVE).cdr, AMS82-M2 SILK (CURVE).cdr (converted with
       Inkscape: since 2026|59 the panels are the vector art itself, assets/ams82-front.svg / ams82-rear.svg; the earlier
       tools/silk_extract.py PNG cut is kept on a toggle), AMS8-2A Series Front.jpg, AMS8-2AAM (Demux 4).jpg
   - AMS81 - #Master/AMS8 - #Engineering/AMS8 - #Software/README.md (main-board MCU, FPGA, register map)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants from the source ---------------- */
const C = {
  F_AVR: 4915200,           // UBRR0L = 0x1F at 9600 baud ⇒ 4.9152 MHz (README; the crystal itself is not in the source)
  LOOP_T: 1/3000,           // main-loop pass — INFERRED: manual "hold ≈ 3 s" = PRESET_DEBOUNCE 9000 passes
  PRESET_DEBOUNCE: 9000, NO_ACTIVITY: 10000, COMM_THRESH: 1000, PB_DEBOUNCE: 255, SW_DEBOUNCE: 255,
  TX_COUNTER: 25,           // Transmit_Counter: one UART byte every 26 passes
  COMM1: 16000,             // Communication_Counter1 (UART1 retry)
  BYTE_T: 10/9600,          // 1 start + 8 data + 1 stop at 9600 baud
  FS: 48000,
  CORE: 49.152e6,           // SHARC core clock — INFERRED from TPERIOD0 = 4 → 12.288 MHz = 256 fs MCLK
  TPERIOD1: 76800,          // timer 1 "mux rate" (153600/2)
  TC_VU: 0.000319752, TC_PPMA: 0.02276277, TC_PPMD: 0.000031978, RAMP_TC: 0.019999,
};
C.MUX_T = C.TPERIOD1 / C.CORE;          // 1.5625 ms per meter (inferred clock)
C.SCAN_T = 8 * C.MUX_T;                  // 12.5 ms for all eight meters
C.DSP_MAIN_T = 2 / C.FS;                 // DSP background loop ≈ 2 sample periods — INFERRED
C.ISR_T = 8e-6;                          // sport0_isr length ≈ 400 cycles — INFERRED

/* Real ams82_vu_data1/2.dat → number of lit LEDs for each meter index 0…255 (0 = +20 on the scale) */
const LIT = '^]]\\\\[[ZZYYXXWWVVUUTTSSRRQQPPOONNMMLLKKJJIIHHGGFFEEDDCCBBAA@@??>>==<<;;::999988888877666655444433332222222222222211110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const litOf = idx => LIT.charCodeAt(Math.max(0, Math.min(255, idx|0))) - 48;
/* scale label of segment 1…46 (comments in the .dat tables, matches the photo's lens) */
function segLabel(s){ if (s===1) return 'PR'; if (s>=27) return '+'+(s-26); if (s===26) return '0'; if (s>=10) return String(s-26);
  return ['','PR','-36','-32','-28','-26','-24','-22','-20','-18'][s]; }
function segColour(s){ return s>=36? '#ff3b2e' : s>=24? '#ffc21a' : '#5cff3a'; }   // 23 green / 12 yellow / 11 red — INFERRED from BOM counts

/* Enumerations (AMS82.h) */
const SRC = {ASSIGNS:0, AES75:1, AES110:2, ANALOG:3, SDI12:4, SDI34:5};
const SRC_NAME = ['ASSIGNS','AES75','AES110','ANALOG','SDI12','SDI34'];
const SCR = {INFO:0, SOURCE:1, PRESET:3, VOLUME:10, LEFT_MIX:11, RIGHT_MIX:12, SYSTEM:100, SETUP:101, INPUT:102, ASSIGN:103, VERSION:104, EXIT:105};
const SCR_NAME = {0:'INFORMATION_SCREEN',1:'SOURCE_SCREEN',3:'PRESET_SCREEN',10:'VOLUME_SCREEN',11:'LEFT_MIX_SCREEN',12:'RIGHT_MIX_SCREEN',100:'SYSTEM_SETUP_SCREEN',101:'SETUP_SCREEN',102:'INPUT_SCREEN',103:'ASSIGN_SETUP_SCREEN',104:'VERSION_SCREEN',105:'EXIT_SCREEN'};
const SETUP_LIST = [245,246,247,248,249,250,251,252,253];   // setup_min (EXIT_SYSTEM) … setup_max (SPEAKER)
const SETUP_NAME = {245:'EXIT_SYSTEM_SCREEN',246:'MODE_SCREEN',247:'REFERENCE_SCREEN',248:'OUTPUT4_SCREEN',249:'DIALNORM_SCREEN',250:'VOLUME_SETUP_SCREEN',251:'OUTPUT_SCREEN',252:'CALIBRATION_SCREEN',253:'SPEAKER_SCREEN',254:'MONITOR_SCREEN',255:'DIM_SCREEN'};
const INPUT_LIST = [170,171,172,173,174,175];
const DISP = ['CONFIGURATION','DIALNORM','FRAMERATE','DATARATE','BITDEPTH','SAMPLERATE','DOLBYBITSTREAM','DOLBYSURROUND','CENTERMIX','SURROUNDMIX','RFMODULATION','MIXLEVEL','ROOMTYPE','ORIGINALBITSTREAM','COPYRIGHT'];
const SEL_NAME = {0:'LEFT',1:'RIGHT',2:'LEFT_AND_RIGHT',3:'LEFT_PLUS_RIGHT',255:'LEFT_AND_RIGHT_OFF'};
/* pushbutton bits as read on PINB (inverted) and lamp bits written to PORTA (the "input" byte) */
const BTN = { in1:{pin:0x40,lamp:0x02,label:'1/2',num:1}, in2:{pin:0x20,lamp:0x04,label:'3/4',num:2}, in3:{pin:0x08,lamp:0x10,label:'5/6',num:3}, in4:{pin:0x02,lamp:0x40,label:'7/8',num:4},
              A:{pin:0x80,lamp:0x01,label:'A',num:5}, B:{pin:0x10,lamp:0x08,label:'B',num:6}, C:{pin:0x04,lamp:0x20,label:'C',num:7}, D:{pin:0x01,lamp:0x80,label:'D',num:8} };
const PRESET_KEYS = ['A','B','C','D'];
const IN_KEYS = ['in1','in2','in3','in4'];
const DE_CFG = ['5.1+2','5.1+1+1','4+4','4+2+2','4+2+1+1','4+4x1','4x2','3x2+2x1','2x2+4x1','2+6x1','8x1','5.1','4+2','4+1+1','3x2','2x2+2x1','2+4x1','6x1','4','2+2','2+2x1','4x1'];
const DD_CFG = ['1+1','1/0','2/0','3/0','2/1','3/1','2/2','3/2','3/2L','2/2L','3/1L','2/1L','3/0L'];
const FR_TXT = {1:'23.98',2:'24.00',3:'25.00',4:'29.97',5:'30.00',6:'50.00',7:'59.94',8:'60.00'};
const FR_HZ = {1:24000/1001,2:24,3:25,4:30000/1001,5:30,6:50,7:60000/1001,8:60};
const DR_K = [32,40,48,56,64,80,96,112,128,160,192,224,256,320,384,448,512,576,640];

/* ---------------- the signal world: what is plugged into the rear ---------------- */
const G = {
  tone:(f,db)=>({k:'tone',f,db}), prog:(db,seed)=>({k:'prog',db,seed}), lfe:(db,seed)=>({k:'lfe',db,seed}), off:()=>({k:'off'}), data:(seed)=>({k:'data',seed}),
};
const CONTENT = {
  none:   {name:'No signal', fmt:0},
  tone20: {name:'PCM 1 kHz tone, −20 dBFS', fmt:1, ch:[G.tone(1000,-20),G.tone(1000,-20)]},
  tone18: {name:'PCM 400 Hz tone, −18 dBFS', fmt:1, ch:[G.tone(400,-18),G.tone(400,-18)]},
  prog:   {name:'PCM stereo programme', fmt:1, ch:[G.prog(-22,1),G.prog(-23,2)]},
  de51:   {name:'Dolby E 5.1+2 (29.97)', fmt:3, cfg:0, dn:[27,31], fr:4, bd:0x50, ch:[G.prog(-25,11),G.prog(-26,12),G.prog(-20,13),G.lfe(-30,14),G.prog(-32,15),G.prog(-33,16),G.prog(-24,17),G.prog(-24,18)]},
  de4x2:  {name:'Dolby E 4x2 (25)', fmt:3, cfg:6, dn:[24,27,31,23], fr:3, bd:0x40, ch:[G.prog(-24,21),G.prog(-24,22),G.prog(-21,23),G.prog(-21,24),G.prog(-27,25),G.prog(-27,26),G.prog(-30,27),G.prog(-30,28)]},
  dd51:   {name:'AC-3 3/2L 5.1, 448 kb/s', fmt:2, cfg:8, dn:[27], mx:[105], dr:15, ch:[G.prog(-24,31),G.prog(-25,32),G.prog(-19,33),G.lfe(-28,34),G.prog(-31,35),G.prog(-31,36),G.off(),G.off()]},
  dd20:   {name:'AC-3 2/0, dialnorm −5 (shows the bug)', fmt:2, cfg:2, dn:[5], mx:[0], dr:10, ch:[G.prog(-14,41),G.prog(-15,42),G.off(),G.off(),G.off(),G.off(),G.off(),G.off()]},
};
const CONTENT_KEYS = Object.keys(CONTENT);

/* ---------------- device state (variable names from v200w.c) ---------------- */
const D = {};
let M = null, MKEY = '';
function factory(){
  Object.assign(D, {
    power:true, bootAt:null,
    mode:1, setup_screen_mode:1,
    screen:SCR.INFO, screen_display:SCR.INFO, system_setup:SCR.SETUP, setup:246, input_setup:171, firmware_setup:120, assign:0,
    source:SRC.AES75, input_number:1, bankInput:{0:1,1:1,2:1,3:1,4:1,5:1},
    preset:0, preset_index:0, preset_selector:255,
    volume:30, mute:false, mute_level:30, volume_setup_level:30,
    prologic:true, display:1, dialnorm_pgm:1, mixlevel_pgm:1,
    reference:0, cal_level:41, speaker:1, output:0, output4_settings:0, dialnorm_settings:1,
    en:{1:1,2:1,3:1,4:1,5:1}, inputs_enabled:5,
    assignment:[0,0,0,0],
    analog_available:true, sdi_available:false, HD_SD:1,
    gain_index:0, mix_information_change:false,
    mixCh:[0,1,2,3].map(()=>[new Array(8).fill(0), new Array(8).fill(0)]),
    mixGain:[0,1,2,3].map(()=>[new Array(8).fill(61), new Array(8).fill(61)]),
    held:[], enc:[3,3], encState:[12,12], knobAngle:[0,0],
    bank:{ 1:['de51','tone20','dd51','prog'], 2:['tone18','none','none','none'], 3:['prog','none','none','none'], 4:['de51','prog','none','none'], 5:['none','none','none','none'] },
    refPresent:false, meterCh:0, showMux:false,
    commAt:-1, commKind:0, dispWrites:[],
    log:[], lastTrace:[],
  });
  MKEY='';
}
factory();

/* ---------------- derived: what is being monitored ---------------- */
const ASSIGN_SRC = n => n<4? [SRC.AES75,n+1] : n<8? [SRC.AES110,n-3] : n<12? [SRC.ANALOG,n-7] : [SRC.SDI12, n-11];
function assignTxt(n){ const [s,k]=ASSIGN_SRC(n); return s===SRC.AES75?' 75-'+k : s===SRC.AES110?'110-'+k : s===SRC.ANALOG?'ANL-'+k : 'SDI-'+k; }
function monitored(){        // [source, input 1-4] actually routed, after Assigns
  if (D.source===SRC.ASSIGNS){ return ASSIGN_SRC(D.assignment[D.input_number-1]); }
  return [D.source, D.input_number];
}
function contentOf(src, k){ if (src>=SRC.SDI12){ if(!D.sdi_available) return CONTENT.none; return CONTENT[D.bank[4][Math.min(3,k-1)]]; } return CONTENT[(D.bank[src]||D.bank[1])[k-1]] || CONTENT.none; }
function monContent(){ const [s,k]=monitored(); return contentOf(s,k); }
function format(){ return D.power? monContent().fmt : 0; }           // NO_LOCK 0, PCM 1, DOLBYDIGITAL 2, DOLBYE 3
function programMax(c){ c=c||monContent(); return c.fmt>=2 ? (c.dn||[1]).length : 1; }
function lampByte(){
  let b = 0;
  if (D.screen===SCR.LEFT_MIX || D.screen===SCR.RIGHT_MIX){       // REFRESH_MIX_OUTPUT_LEDSx: lamps show the mix assignment
    const m = D.mixCh[D.preset_index][D.screen===SCR.RIGHT_MIX?1:0]; const order=['in1','in2','in3','in4','A','B','C','D'];
    m.forEach((v,i)=>{ if (v) b |= BTN[order[i]].lamp; }); return b;
  }
  if (D.mode===4 && D.input_number!==4) b |= 0x02|0x04|0x10; else b |= BTN[IN_KEYS[D.input_number-1]].lamp;
  if (D.preset) b |= BTN[D.preset].lamp;
  return b;
}

/* ---------------- display strings: exactly what UPDATE_DISPLAY writes ---------------- */
const pad8 = (s,right) => { s=String(s).slice(0,8); while(s.length<8) s = right? ' '+s : s+' '; return s; };
function volTxt(v){ if (v===0) return '  OFF   '; const d=v-61, a=Math.abs(d); return '  '+(d<0?'-':d>0?'+':' ')+(a<10?' '+a:String(a))+' dB'; }
function srcTag(){ const s=D.source; return s===SRC.AES75?' 75Ω': s===SRC.AES110?'110Ω': s===SRC.ANALOG?'ANLG': (D.HD_SD?' SD ':' HD '); }
function line2(){            // PROCESS_AUDIO_SOURCE
  const s=D.source;
  if (s===SRC.ASSIGNS) return pad8('A'+D.input_number+' '+assignTxt(D.assignment[D.input_number-1]));
  if (s===SRC.ANALOG) return ' Analog ';
  if (s===SRC.AES75) return D.mode===2? '75Ω L/R ' : '75Ω LoRo';
  if (s===SRC.AES110) return D.mode===2? '110Ω L/R' : '110ΩLoRo';
  return (D.HD_SD?'SD ':'HD ')+(s===SRC.SDI12?'1/2':'3/4')+'  ';
}
function presetPair(){ const x = PRESET_KEYS.indexOf(D.preset); return [2*x+1, 2*x+2]; }
function inputSources(){     // PROCESS_INPUT_SOURCES + PROCESS_PRESET_SOURCES (MODE1)
  let tail = (D.source===SRC.SDI34)? '5-8' : '1-4';
  if (D.mode===1 && D.preset){ const [a,b]=presetPair(); tail = D.preset_selector===0? 'Ch'+a : D.preset_selector===1? 'Ch'+b : D.preset_selector===2? a+'/'+b : a+'+'+b; }
  return srcTag()+' '+tail;
}
function presetsTxt(){       // "presets" array on PRESET_SCREEN
  if (D.mode===2) return D.preset? 'Preset '+D.preset : 'NoPreset';
  const head = 'In'+D.input_number;
  if (!D.preset) return head+' LoRo';
  const [a,b]=presetPair(); const s=D.preset_selector;
  return head+(s===0?' Ch'+a+' ': s===1?' Ch'+b+' ': s===2? ' '+a+'/'+b+' ' : ' '+a+'+'+b+' ');
}
function dnTxt(v){ if (v>=1 && v<=9) return '-1 '; if (v>=10 && v<=31) return '-'+v; return 'NAN'; }   // PROCESS_DIALNORM_INFORMATION (cases 1–9 all write "1")
function metaTxt(c){
  const p = D.dialnorm_pgm, d = DISP[D.display];
  switch (d){
    case 'DIALNORM': return 'DN'+p+' '+dnTxt((c.dn||[])[p-1])+' ';
    case 'MIXLEVEL': { const m=(c.mx||[])[D.mixlevel_pgm-1]; return pad8('MX'+D.mixlevel_pgm+' '+(m>=81&&m<=111? ' '+m : ' NAN')); }
    case 'FRAMERATE': return c.fmt===3? 'FR '+FR_TXT[c.fr] : 'FR   NAN';
    case 'DATARATE': return c.fmt===2? pad8('DR'+String(DR_K[c.dr]).padStart(5)+'k') : 'DR   NAN';
    case 'BITDEPTH': return c.fmt===3? 'BD '+({0:32,16:16,32:16,48:16,64:24,80:20,96:16}[c.bd]||'NtInd')+'bit' : 'BD NtInd';
    case 'SAMPLERATE': return 'SR 48kHz';
    case 'DOLBYBITSTREAM': return 'BM  MnCp';
    case 'DOLBYSURROUND': return 'DS  NtId';
    case 'CENTERMIX': return 'C  -3.0 ';
    case 'SURROUNDMIX': return 'S  -3.0 ';
    case 'RFMODULATION': return 'RF Dsbld';
    case 'ROOMTYPE': return 'RM  NtId';
    case 'ORIGINALBITSTREAM': return 'OB   Yes';
    case 'COPYRIGHT': return 'CR    No';
  }
  return '        ';
}
function infoStrings(){      // PROCESS_METADATA_INFORMATION → "information" (display 2) and "information2" (display 3)
  const c = monContent();
  if (c.fmt===0) return [' No Lock','   N/A  '];
  if (c.fmt===1) return ['   PCM  ', D.prologic? ' Stereo ' : 'ProLogic'];
  const cfg = c.fmt===3? pad8('E '+DE_CFG[c.cfg]) : pad8('DD  '+DD_CFG[c.cfg]);
  return [cfg, metaTxt(c)];
}
function setupTxt(){
  switch (D.setup){
    case 245: return '  Exit  ';
    case 246: return ' Mode '+D.setup_screen_mode+' ';
    case 247: return 'Ref '+[' Int',' 75Ω','110Ω'][D.reference];
    case 248: return 'Out4 '+(D.output4_settings? 'Mon':'In4');
    case 249: return 'Dn  '+(D.dialnorm_settings? 'Enbd':'Dsbd');
    case 250: return pad8('Vol'+volTxt(D.volume_setup_level).slice(1,6));
    case 251: return 'O/P  '+(D.output? 'Fix':'Var');
    case 252: return 'Cal  '+(D.cal_level-61);
    case 253: return 'Spkr '+(D.speaker? 'On ':'Off');
  }
  return '        ';
}
function inputDisTxt(){ const n=D.input_setup; if (n===170) return '  Exit  '; const k=n-170; const nm=['75Ω','110Ω','Anlg','SDI12','SDI34'][k-1];
  const map={1:1,2:2,3:3,4:4,5:5}; return pad8(nm.padEnd(7)+(D.en[map[k]]?'Y':'N')); }
function gainTxt(){ const lr=D.screen===SCR.RIGHT_MIX?1:0, i=D.gain_index; const on=D.mixCh[D.preset_index][lr][i], g=D.mixGain[D.preset_index][lr][i]-61;
  return PRESET_KEYS[D.preset_index]+' '+(lr?'R':'L')+(i+1)+' '+(on? (g<0?'-':g>0?'+':' ')+String(Math.abs(g)).padStart(2) : 'Off'); }
const SYS_NAME = {101:' System ',102:' Inputs ',103:' Assigns',104:'Firmware',105:'  Exit  '};
function inBoot(){ return D.bootAt!==null && performance.now()-D.bootAt < 2500; }
/* returns {d1: lower (above SELECT/VOLUME), d2: upper left, d3: upper right} — SIEMENS8_lcd_display1/2/3 */
function displays(){
  if (!D.power) return {d1:'        ', d2:'        ', d3:'        '};
  if (inBoot()) return {d1:' 2.1.2.0', d2:'  AMS8  ', d3:'WARDBECK'};
  const [i1,i2] = infoStrings();
  let d1 = D.source===SRC.ASSIGNS? line2() : inputSources(), d2=i1, d3=i2;
  const sc=D.screen;
  if (D.screen_display===SCR.VOLUME && [SCR.INFO,SCR.SOURCE,SCR.PRESET].includes(sc)){ d1 = D.mute? '  Mute  ' : volTxt(D.volume); }
  else if (sc===SCR.SOURCE){ d2='  Input '; d3=' Select '; d1=line2(); }
  else if (sc===SCR.PRESET) d1 = presetsTxt();
  else if (sc===SCR.SYSTEM){ d3='  Setup '; d2=SYS_NAME[D.system_setup]; }
  else if (sc===SCR.SETUP){ d2=' System '; d3=setupTxt(); }
  else if (sc===SCR.INPUT){ d2=' Inputs '; d3=inputDisTxt(); }
  else if (sc===SCR.ASSIGN){ d2=' Assigns'; d3 = D.assign===4? '  Exit  ' : pad8('A'+(D.assign+1)+' '+assignTxt(D.assignment[D.assign])); }
  else if (sc===SCR.VERSION){ d2='Firmware'; d3 = D.firmware_setup===120? ' 2.1.2.0' : '  Exit  '; }
  else if (sc===SCR.LEFT_MIX || sc===SCR.RIGHT_MIX){ d1 = gainTxt(); }
  return {d1:pad8(d1), d2:pad8(d2), d3:pad8(d3)};
}

/* ================================================================
   USER ACTIONS — each one runs the firmware path and records a trace
   ================================================================ */
function act(name, fn){
  D.lastTrace = [];
  const tr = s => D.lastTrace.push(s);
  if (!D.power) tr('Unit is off — nothing happens.'); else fn(tr);
  D.log.unshift({ t:SIM.t, name, trace:D.lastTrace.slice(), disp:displays() });
  if (D.log.length>60) D.log.length=60;
  D.dispWrites.push(SIM.t); if (D.dispWrites.length>40) D.dispWrites.shift();
  MKEY=''; SIM.refresh();
}
function comm(kind){ D.commAt = SIM.t; D.commKind = kind; }     // communication_mode → uart_byte0_next for 1000 passes
function selectInput(n, tr, how){
  const b = BTN[IN_KEYS[n-1]];
  tr(`data & 0x${b.pin.toString(16).padStart(2,'0')} (${b.label}) → preset = 0; input &= ~0xA9 (clear preset lamps); preset_tally = 0`);
  D.preset = 0; D.preset_selector = 255;
  if (D.input_number!==n){ D.input_number=n; D.bankInput[D.source]=n; tr(`input |= 0x${b.lamp.toString(16).padStart(2,'0')}; input_number = NO${n}`); }
  else tr(`input ${n} already lit — no change`);
  if (how) tr(how);
  tr('SAVE_INPUT_SOURCE_INFORMATION() → '+SRC_NAME[D.source].toLowerCase()+'_input_source = '+n+'; PROCESS_AUDIO_SOURCE(source); PORTA = OUTPUT_LEDS(input, 0xFF)');
}
const A = {
  pressSelect(){ act('Press SELECT', tr=>{
    tr('SWITCH_ENCODER1 → READ_ENCODER1 = PINE; bit 2 low → TRANSLATE_ENCODER1: switch1 = 1, activity_counter = 0, refresh = YES');
    const combo = D.held.length===2 && D.held.includes('in1') && D.held.includes('in4');
    if (combo && D.screen!==SCR.SYSTEM){
      tr('pushbuttons == SETUP_SEQUENCE_COUNTER (0x42 = 1/2 + 7/8 held) → screen = SYSTEM_SETUP_SCREEN, system_setup = SETUP_SCREEN');
      tr('PROCESS_SYSTEM_SETUP_SOURCES(); SIEMENS8_lcd_display2(SysSetup) → “ System ”');
      D.screen=SCR.SYSTEM; D.screen_display=SCR.SYSTEM; D.system_setup=SCR.SETUP; comm(0); return;
    }
    if (D.held.length) tr(`pushbuttons = 0x${D.held.reduce((a,k)=>a|BTN[k].pin,0).toString(16).padStart(2,'0')} ≠ 0x42, so no System Setup`);
    const sc=D.screen;
    if (sc===SCR.INFO || sc===SCR.PRESET){
      D.screen=SCR.SOURCE; D.screen_display=SCR.SOURCE; comm(0);
      tr('screen INFORMATION/PRESET → SOURCE_SCREEN; SIEMENS8_lcd_display1(line2) → “'+line2()+'”');
      if (D.mode===1){ D.preset=0; D.preset_selector=255; tr('MODE1: preset = 0; input &= ~0xA9 (presets cleared); PROCESS_AUDIO_SOURCE(source)'); }
      tr('Now turn SELECT to change the source bank. Upper displays: “  Input ” “ Select ”');
    } else if (sc===SCR.SOURCE){
      D.screen=SCR.INFO; D.screen_display=SCR.INFO; D.display=1; D.dialnorm_pgm=1; comm(0);
      tr('SOURCE_SCREEN → INFORMATION_SCREEN; SIEMENS8_lcd_display1(information); display = display_min (DIALNORM)');
    } else if (sc===SCR.SETUP && D.setup===245){
      if (D.setup_screen_mode!==D.mode){ tr(`setup_screen_mode (${D.setup_screen_mode}) ≠ mode (${D.mode}) → mode = setup_screen_mode; DATA_re_initialization()`); D.mode=D.setup_screen_mode; D.preset=0; D.preset_selector=255; D.prologic=true; D.display=1; D.dialnorm_pgm=1; }
      tr('SAVE_MODE_IN_EEPROM(): mode, output, dim, speaker, out4, reference, cal, dialnorm, volume setup → EEPROM 214…229 (key 0xAA @ 230)');
      D.screen=SCR.SYSTEM; D.screen_display=SCR.SYSTEM; D.system_setup=SCR.SETUP; comm(0);
      tr('screen = SYSTEM_SETUP_SCREEN (display “ System ”)');
    } else if (sc===SCR.VERSION && D.firmware_setup===121){
      D.screen=SCR.SYSTEM; D.screen_display=SCR.SYSTEM; D.system_setup=SCR.VERSION; tr('VERSION_SCREEN on Exit → SYSTEM_SETUP_SCREEN (“Firmware”)');
    } else if (sc===SCR.INPUT && D.input_setup===170){
      D.screen=SCR.SYSTEM; D.screen_display=SCR.SYSTEM; D.system_setup=SCR.INPUT;
      tr('INPUT_SCREEN on Exit → SAVE_DATA(ANALOG/AES75/AES110/SDI12/SDI34_ENABLED_ADDRESS …) six EEPROM writes, each waiting with WDR()');
      tr('RETURN_FROM_INPUT_SCREEN() (control.c) moves source off a disabled bank');
      if (!D.en[D.source] && D.source) { D.source = [1,2,3,4,5].find(s=>D.en[s]) || 1; tr('source → '+SRC_NAME[D.source]); }
    } else if (sc===SCR.ASSIGN && D.assign===4){
      D.screen=SCR.SYSTEM; D.screen_display=SCR.SYSTEM; D.system_setup=SCR.ASSIGN;
      tr('ASSIGN_SETUP_SCREEN on Exit → SAVE_ASSIGN_IN_EEPROM() (addresses 196–199); PROCESS_AUDIO_SOURCE(source)');
    } else if (sc===SCR.SYSTEM){
      const s=D.system_setup;
      if (s===SCR.SETUP){ D.screen=SCR.SETUP; D.setup=246; tr('system_setup = SETUP_SCREEN → screen = SETUP_SCREEN, setup = MODE_SCREEN; SIEMENS8_lcd_display3(mode_setup) → “'+setupTxt()+'”'); }
      else if (s===SCR.INPUT){ D.screen=SCR.INPUT; D.input_setup=171; tr('→ INPUT_SCREEN, input_setup = AES75_DISPLAY_SCREEN → “'+inputDisTxt()+'”'); }
      else if (s===SCR.ASSIGN){ D.screen=SCR.ASSIGN; D.assign=0; tr('→ ASSIGN_SETUP_SCREEN, assign = ASSIGN1_SCREEN; PROCESS_ASSIGNMENT_SOURCES()'); }
      else if (s===SCR.VERSION){ D.screen=SCR.VERSION; D.firmware_setup=120; tr('→ VERSION_SCREEN; SIEMENS8_lcd_display3(VersionDis) → “ 2.1.2.0” (REVISION1…4 = NO2 NO1 NO2 NO0)'); }
      else if (s===SCR.EXIT){ D.screen=SCR.INFO; D.screen_display=SCR.INFO; D.display=1; D.dialnorm_pgm=1; tr('system_setup = EXIT_SCREEN → INFORMATION_SCREEN; display = display_min'); }
      D.screen_display = D.screen; comm(5);
    } else if (sc===SCR.LEFT_MIX){
      D.screen=SCR.RIGHT_MIX; D.gain_index=0; tr('LEFT_MIX_SCREEN → RIGHT_MIX_SCREEN; preset_left_or_right = RIGHT; gain_index = CHANNEL1; PROCESS_MIX_SOURCES()'); comm(4);
    } else if (sc===SCR.RIGHT_MIX){
      if (D.mix_information_change){ tr('mix_information_change == YES → SAVE_MIX_IN_EEPROM(); SIEMENS8_lcd_display1(save) “  SAVED ”; wait_ms(500) — the whole front panel stops for half a second'); D.mix_information_change=false; }
      D.screen=SCR.INFO; D.screen_display=SCR.INFO; D.display=1; tr('→ INFORMATION_SCREEN'); comm(0);
    } else tr('No branch of TRANSLATE_ENCODER1 matches this screen ('+SCR_NAME[sc]+(sc===SCR.SETUP?' / '+SETUP_NAME[D.setup]:'')+'): the press only resets activity_counter. Turn SELECT to “Exit” first.');
  });},
  pressVolume(){ act('Press VOLUME', tr=>{
    tr('SWITCH_ENCODER2 → PINE bit 3 low → TRANSLATE_ENCODER2: switch2 = 1');
    const busy=[SCR.SETUP,SCR.SYSTEM,SCR.ASSIGN,SCR.VERSION,SCR.LEFT_MIX,SCR.RIGHT_MIX];
    if (busy.includes(D.screen_display)){ tr('screen_display is a setup/mix screen → the press is ignored'); return; }
    D.screen_display=SCR.VOLUME; comm(1);
    if (!D.mute){ D.mute=true; if (D.volume<=76) D.mute_level=D.volume; tr('mute = YES; mute_level = volume ('+D.mute_level+'); volume = 255; SIEMENS8_lcd_display1(mute_temp) → “  Mute  ”');
      tr('UART0 VOLUME_COM frame now sends “F F F” in place of the three volume digits'); }
    else { D.mute=false; D.volume=D.mute_level; tr('mute = NO; volume = mute_level; PROCESS_VOLUME_INFORMATION(volume) → “'+volTxt(D.volume)+'”'); }
  });},
  turnSelect(dir){ act(`Turn SELECT ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    encStep(0,dir,tr);
    tr('LEFT_ENCODER_UPDATE: encoder_action1 = '+(dir>0?'UP':'DOWN')+'; refresh = information_refresh = communication_refresh = YES');
    const sc=D.screen;
    if (sc===SCR.INFO){
      const c=monContent();
      if (D.mode!==2 && D.mode!==4 && c.fmt===1){ D.prologic=!D.prologic; tr('format == PCM → prologic = '+(D.prologic?'YES (Stereo)':'NO (ProLogic)')+'; sent as the P byte of the GENERAL_COM frame'); return; }
      if (c.fmt<2){ tr('format = '+(c.fmt?'PCM':'NO_LOCK')+' in mode '+D.mode+': PROCESS_INFORMATION_'+(dir>0?'IN':'DE')+'CREMENT runs but the display shows '+(c.fmt?'PCM':'No Lock')); }
      const o=DISP[D.display]+(D.display===1?' pgm '+D.dialnorm_pgm:'');
      infoStep(dir, c);
      tr('PROCESS_INFORMATION_'+(dir>0?'INCREMENT':'DECREMENT')+': display '+o+' → '+DISP[D.display]+(D.display===1?' pgm '+D.dialnorm_pgm:'')+'; command3 = 0x3'+D.dialnorm_pgm+' (programme asked for in the next C byte)');
      if (dir>0 && DISP[D.display]==='BITDEPTH') tr('Note: INCREMENT has no branch for BITDEPTH — turning clockwise again does nothing (see Findings)');
      tr('display 3 → “'+infoStrings()[1]+'”');
      return;
    }
    if (sc===SCR.SYSTEM){ const L=[101,102,103,104,105]; let i=L.indexOf(D.system_setup); i=(i+(dir>0?1:4))%5; D.system_setup=L[i]; tr('system_setup → '+SCR_NAME[D.system_setup]+' (wraps SETUP ↔ EXIT) → “'+SYS_NAME[D.system_setup]+'”'); return; }
    if (sc===SCR.VERSION){ D.firmware_setup = D.firmware_setup===120?121:120; tr('firmware_setup → '+(D.firmware_setup===120?'VERSION_DISPLAY_SCREEN':'EXIT_VERSION_SCREEN')); return; }
    if (sc===SCR.INPUT){ let i=INPUT_LIST.indexOf(D.input_setup); i=(i+(dir>0?1:5))%6; D.input_setup=INPUT_LIST[i]; tr('input_setup → '+D.input_setup+' (input_min = EXIT_INPUT_SCREEN … input_max = SDI34_DISPLAY_SCREEN) → “'+inputDisTxt()+'”'); return; }
    if (sc===SCR.SETUP){ let i=SETUP_LIST.indexOf(D.setup); i=(i+(dir>0?1:8))%9; D.setup=SETUP_LIST[i]; tr('setup → '+SETUP_NAME[D.setup]+' (setup_min = EXIT_SYSTEM_SCREEN 245 … setup_max = SPEAKER_SCREEN 253) → “'+setupTxt()+'”'); return; }
    if (sc===SCR.ASSIGN){ D.assign=(D.assign+(dir>0?1:4))%5; tr('assign → '+(D.assign===4?'EXIT_ASSIGN_SCREEN':'ASSIGN'+(D.assign+1)+'_SCREEN')); return; }
    if (sc===SCR.LEFT_MIX || sc===SCR.RIGHT_MIX){ D.gain_index=(D.gain_index+(dir>0?1:7))%8; D.mix_information_change=true; tr('gain_index → CHANNEL'+(D.gain_index+1)+'; mix_information_change = YES → “'+gainTxt()+'”'); return; }
    if (sc===SCR.SOURCE){
      D.screen_display=SCR.SOURCE; if (D.mode===1){ D.preset=0; D.preset_selector=255; }
      const o=D.source; sourceStep(dir);
      D.input_number = D.bankInput[D.source] || 1;
      tr((dir>0?'PROCESS_SOURCE_INCREMENT':'PROCESS_SOURCE_DECREMENT')+' (control.c): source '+SRC_NAME[o]+' → '+SRC_NAME[D.source]+' (skips banks that are disabled or not fitted)');
      tr('UPDATE_DISPLAY → PROCESS_AUDIO_SOURCE → “'+line2()+'”; SAVE_DATA(SOURCE_ADDRESS, source) when source ≠ psource');
      return;
    }
    tr('screen '+SCR_NAME[sc]+': no SELECT action');
  });},
  turnVolume(dir){ act(`Turn VOLUME ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    encStep(1,dir,tr);
    tr('RIGHT_ENCODER_UPDATE: encoder_action2 = '+(dir>0?'UP':'DOWN'));
    const sc=D.screen;
    if (sc===SCR.LEFT_MIX || sc===SCR.RIGHT_MIX){ const lr=sc===SCR.RIGHT_MIX?1:0; const g=D.mixGain[D.preset_index][lr]; const i=D.gain_index;
      g[i]=Math.max(46,Math.min(76,g[i]+(dir>0?1:-1))); D.mix_information_change=true; comm(lr?4:3);
      tr('PROCESS_MIX_GAIN_VALUES'+(lr?'_R':'')+': mix_gain'+PRESET_KEYS[D.preset_index]+(lr?'_R':'')+'['+i+'] = '+g[i]+' (GAIN_MIN_TRIM 46 … GAIN_MAX_TRIM 76, 61 = 0 dB) → “'+gainTxt()+'”'); return; }
    if (sc===SCR.SYSTEM || sc===SCR.VERSION){ tr('SYSTEM/VERSION screen: refresh = NO — nothing changes'); return; }
    if (sc===SCR.SETUP){
      const s=D.setup;
      if (s===246){ const o=D.setup_screen_mode; if (dir>0) D.setup_screen_mode = o===4?1 : o===2?4 : o+1; else D.setup_screen_mode = o===1?4 : o===4?2 : o-1;
        tr('MODE_SCREEN: setup_screen_mode '+o+' → '+D.setup_screen_mode+' (MODE_MAX = MODE4; the code jumps 2 ↔ 4, so Mode 3 is never offered)'); }
      else if (s===247){ D.reference=(D.reference+(dir>0?1:2))%3; tr('REFERENCE_SCREEN: reference → '+['INTERNAL','AES75','AES110'][D.reference]+'; sent as I byte of SETUP_COM (reference + 0x30)'); }
      else if (s===248){ D.output4_settings^=1; tr('OUTPUT4_SCREEN: output4_settings → '+(D.output4_settings?'MON':'IN4')+'; SETUP_COM Z byte → SHARC TDM_IN_ctl+17 decides OUT 4 = input 4 or monitor mix'); }
      else if (s===249){ D.dialnorm_settings^=1; tr('DIALNORM_SCREEN: dialnorm_settings → '+(D.dialnorm_settings?'YES (Enbd)':'NO (Dsbd)')+'; SETUP_COM Q byte'); }
      else if (s===250){ D.volume_setup_level=Math.max(0,Math.min(76,D.volume_setup_level+(dir>0?1:-1))); tr('VOLUME_SETUP_SCREEN: volume_setup_level = '+D.volume_setup_level+' → “'+setupTxt()+'” (start-up volume after power-on)'); }
      else if (s===251){ D.output^=1; tr('OUTPUT_SCREEN: output → '+(D.output?'FIXED':'VARIABLE')+'; SETUP_COM O byte'); }
      else if (s===252){ D.cal_level=Math.max(39,Math.min(51,D.cal_level+(dir>0?2:-2))); MKEY=''; tr('CALIBRATION_SCREEN: cal_level ±2 → '+D.cal_level+' (CAL_MIN 39 … CAL_MAX 51) = reference '+(D.cal_level-61)+' dBFS. Sent as Y cal_tens cal_ones → main board → SHARC meter_cal = cal_data[] '+inf); }
      else if (s===253){ D.speaker^=1; tr('SPEAKER_SCREEN: speaker → '+(D.speaker?'ON':'OFF')+'; SETUP_COM S byte'); }
      else tr('EXIT_SYSTEM_SCREEN: VOLUME does nothing here');
      tr('display 3 → “'+setupTxt()+'”'); comm(5); return;
    }
    if (sc===SCR.INPUT){ const k=D.input_setup-170; if (k<1){ tr('Exit: nothing to toggle'); return; }
      if (D.en[k] && D.inputs_enabled===1){ tr('Only one input left enabled (inputs_enabled == 1) — refused'); return; }
      D.en[k]^=1; D.inputs_enabled += D.en[k]?1:-1; tr(['','aes75','aes110','analog','sdi12','sdi34'][k]+'_enabled → '+(D.en[k]?'YES':'NO')+'; inputs_enabled = '+D.inputs_enabled); return; }
    if (sc===SCR.ASSIGN){ if (D.assign===4){ tr('Exit: nothing to assign'); return; } const a=D.assignment; a[D.assign]=(a[D.assign]+(dir>0?1:19))%20;
      tr('assignment'+(D.assign+1)+' → '+a[D.assign]+' = “'+assignTxt(a[D.assign])+'” (assign_min AES75_1 … assign_max SDI_8; SDI is offered even with no DEMUX board)'); return; }
    // otherwise: volume
    D.screen_display=SCR.VOLUME; comm(1);
    if (D.mute){ D.mute=false; D.volume=D.mute_level; tr('mute was YES → mute = NO; volume = mute_level'); }
    const o=D.volume; D.volume=Math.max(0,Math.min(76,D.volume+(dir>0?1:-1)));
    tr('LARGE_change is never set anywhere, so the 3-step branch is dead: volume '+(dir>0?'++':'--')+' → '+o+' → '+D.volume+' (Volume_Min 0 = OFF, 61 = 0 dB, Volume_Max 76 = +15 dB)');
    tr('screen_display = VOLUME_SCREEN; PROCESS_VOLUME_INFORMATION → “'+volTxt(D.volume)+'”; next UART0 frame is VOLUME_COM “#F h t o E src in $”');
    tr('SHARC: output_gain ramps toward ams81_volume_table[volume] with RAMP_TC = 0.02 per main-loop pass (no zipper noise)');
  });},
  button(key){ act(`Press ${BTN[key].label} (${key.startsWith('in')?'INPUTS':'PRESETS'})`, tr=>{ pressButton(key, tr); }); },
  hold(key){
    const i=D.held.indexOf(key);
    if (i>=0){ act('Release '+BTN[key].label, tr=>{ D.held.splice(i,1); tr('TRANSLATE_SWITCHES: '+(D.held.length?'other buttons still down — pb stays YES':'(data & PUSHBUTTON_MASK) == 0 → pb_release = YES; DEBOUNCE_PUSHBUTTONS counts 255 passes (≈85 ms '+inf+') before the next press is accepted')); }); return; }
    act('Hold '+BTN[key].label+' down', tr=>{
      if (D.held.length){ D.held.push(key); tr('PROCESS_PUSHBUTTONS: pushbuttons = 0x'+D.held.reduce((a,k)=>a|BTN[k].pin,0).toString(16).padStart(2,'0')+'; pb is already YES from the first button, so TRANSLATE_PUSHBUTTONS does not run again for this one'); return; }
      D.held.push(key); pressButton(key, tr, true);
    });
  },
  holdPreset(key){ act(`Hold ${key} for ≈3 s`, tr=>{
    tr('TRANSLATE_SWITCHES: button still down, pb == YES → preset_counter++ every pass');
    if (D.mode!==2){ tr('mode = '+D.mode+': the press-and-hold branch exists only for MODE2 (presets) and MODE4 (1/2 button) → nothing more happens'); pressButton(key, tr); return; }
    D.preset_index = PRESET_KEYS.indexOf(key); D.preset=key; D.screen=SCR.LEFT_MIX; D.screen_display=SCR.LEFT_MIX; D.gain_index=0; comm(3);
    tr('preset_counter reaches PRESET_DEBOUNCE (9000 passes ≈ 3 s '+inf+') → screen = LEFT_MIX_SCREEN; preset_index = PRESET'+key+'; gain_index = CHANNEL1');
    tr('PROCESS_MIX_SOURCES(); SIEMENS8_lcd_display1(gain) → “'+gainTxt()+'”; lamps now show which of channels 1–8 (green numbers) feed the left mix');
  });},
  systemCombo(){ D.held=['in1']; act('Hold 1/2 + 7/8, press SELECT', tr=>{ tr('(1/2 pressed first: TRANSLATE_PUSHBUTTONS selects input 1; 7/8 then adds 0x02 to pushbuttons while pb == YES, so it is not acted on)'); }); D.held=['in1','in4']; if (D.input_number!==1 && D.screen!==SCR.SYSTEM){ D.input_number=1; D.bankInput[D.source]=1; } A.pressSelect(); D.held=[]; SIM.refresh(); },
  timeout(){ act('Leave it alone for 3.4 s', tr=>{
    tr('ACTIVITY_MONITOR: activity_counter++ each pass while screen_display is VOLUME/SOURCE/PRESET; at NO_ACTIVITY_THRESHOLD (10000 passes ≈ 3.3 s '+inf+') → INFORMATION_SCREEN');
    if ([SCR.VOLUME,SCR.SOURCE,SCR.PRESET].includes(D.screen_display) || [SCR.SOURCE,SCR.PRESET].includes(D.screen)){ D.screen=SCR.INFO; D.screen_display=SCR.INFO; tr('→ back to the information screen'); }
    else tr('Setup, mix and information screens have no timeout — nothing changes');
    tr('COMMUNICATION_MONITOR: after CHANGE_COMMUNICATION_THRESHOLD (1000 passes) the UART frame type goes back to GENERAL_COM');
  });},
  setContent(bank,k,key){ act(`Rear ${bank===1?'75 Ω BNC':bank===2?'110 Ω Phoenix':bank===3?'analog':'SDI'} IN ${k}: ${CONTENT[key].name}`, tr=>{
    D.bank[bank][k-1]=key; const c=CONTENT[key];
    tr(c.fmt===0? 'CS8416/FPGA lose lock on this input' : c.fmt===1? 'Linear PCM: the FPGA non_audio_detector sees no 0xF872/0x4E1F burst' : 'FPGA non_audio_detector finds the SMPTE 337M sync words → DD LED for this input; the Dolby card decodes it');
    const [s,n]=monitored(); if (s===bank && n===k) tr('This is the input being monitored: the main board’s next “#A…$” reply carries format '+c.fmt+(c.fmt>=2?', configuration '+c.cfg:'')+' → UART0_translate sets refresh = YES → displays update');
  }); },
  sdiBoard(on){ act(on?'Fit DEMUX 4 (SDI) board':'Remove DEMUX board', tr=>{ D.sdi_available=on; tr(on? 'UART1_translate at power-up gets a reply with (data & 0xE0) ≠ 0 → sdi_check = 1, audio_source_max = SDI34, sdi_available = YES' : 'No UART1 reply: after 10 polls (each waits Communication_Counter1 = 16000 passes) sdi_check = 1, audio_source_max = ANALOG');
    if (!on && D.source>=SRC.SDI12){ D.source=SRC.AES75; tr('source > audio_source_max → source = AES75'); } }); },
  power(){ const on=!D.power; act(on?'Power on':'Power off', tr=>{
    if (!on){ tr('Mains off'); return; }
  }); D.power=on; if (on){ D.bootAt=performance.now(); D.screen=SCR.INFO; D.screen_display=SCR.INFO; D.mute=false; D.volume=D.volume_setup_level; D.preset=0; D.preset_selector=255; D.held=[];
    D.log[0].trace=['main(): initialization() — CLI, port_init, watchdog_init (WDTCR = 0x08), uart0_init (UCSR0B = 0x98, RX interrupt), uart1_init, SEI','SIEMENS8_lcd_initialization; display2 “  AMS8  ”, display3 “WARDBECK”, display1 “ 2.1.2.0”','wait_ms(1500) — the loop of 100 × WDR() is meant to be 1 ms '+inf,'RECALL_MODE_FROM_EEPROM (key 0xAA @ 230): mode, output, dim, speaker, out4, reference, cal, dialnorm, volume = volume_setup_level','RECALL_ASSIGN_FROM_EEPROM; while (sdi_check == 0) poll the DEMUX board on UART1','DATA_initialization(); RECALL_MIX_FROM_EEPROM(); PROCESS_VOLUME_INFORMATION(volume); enter while(1)']; D.log[0].disp=displays(); }
    MKEY=''; SIM.refresh(); setTimeout(()=>SIM.refresh(), 2600); },
  reset(){ factory(); SIM.refresh(); },
};
function encStep(k, dir, tr){
  // PROCESS_SHAFT_ENCODERx state machine, fed one detent (detent rests at 11 — inferred)
  const seq = dir>0? [1,0,2,3] : [2,0,1,3]; const path=[]; let st=D.encState[k];
  for (const s of seq){ const c=st+s; path.push(`${st}+${s}=case ${c}`+(c===2?' (UP)':c===17?' (DOWN)':'')); st = ENC_NEXT[c]; }
  D.encState[k]=st; D.knobAngle[k]+=dir*15;
  tr((k?'SHAFT_ENCODER2 (PIND 0–1, TRANSLATE_SHAFT_ENCODER2 swaps 1↔2)':'SHAFT_ENCODER1 (PINF 0–1)')+': '+path.join(' → '));
}
const ENC_NEXT = [0,20,8,0, 0,4,4,28, 16,8,8,12, 12,4,24,12, 16,20,8,16, 0,20,20,28, 16,24,24,12, 28,4,24,28];
function infoStep(dir, c){
  const max = programMax(c); const d=DISP[D.display];
  if (dir>0){
    if (d==='CONFIGURATION'){ D.display=1; D.dialnorm_pgm=1; }
    else if (d==='DIALNORM'){ if (D.dialnorm_pgm>=max) D.display=2; else D.dialnorm_pgm++; }
    else if (d==='FRAMERATE') D.display=3; else if (d==='DATARATE') D.display=4;
    else if (d==='BITDEPTH'){ /* no branch in PROCESS_INFORMATION_INCREMENT */ }
    else if (d==='SAMPLERATE') D.display=6; else if (d==='DOLBYBITSTREAM') D.display=7; else if (d==='DOLBYSURROUND') D.display=8;
    else if (d==='CENTERMIX') D.display=9; else if (d==='SURROUNDMIX') D.display=10; else if (d==='RFMODULATION'){ D.display=11; D.mixlevel_pgm=1; }
    else if (d==='MIXLEVEL'){ if (D.mixlevel_pgm>=max) D.display=12; else D.mixlevel_pgm++; }
    else if (d==='ROOMTYPE') D.display=13; else if (d==='ORIGINALBITSTREAM') D.display=14; else if (d==='COPYRIGHT'){ D.display=1; D.dialnorm_pgm=1; }
  } else {
    if (d==='CONFIGURATION'||d==='DIALNORM'){ if (d==='DIALNORM' && D.dialnorm_pgm>1) D.dialnorm_pgm--; else D.display=14; }
    else if (d==='COPYRIGHT') D.display=13; else if (d==='ORIGINALBITSTREAM') D.display=12; else if (d==='ROOMTYPE'){ D.display=11; D.mixlevel_pgm=max; }
    else if (d==='MIXLEVEL'){ if (D.mixlevel_pgm>1) D.mixlevel_pgm--; else D.display=10; }
    else if (d==='RFMODULATION') D.display=9; else if (d==='SURROUNDMIX') D.display=8; else if (d==='CENTERMIX') D.display=7;
    else if (d==='DOLBYSURROUND') D.display=6; else if (d==='DOLBYBITSTREAM') D.display=5; else if (d==='SAMPLERATE') D.display=4;
    else if (d==='BITDEPTH') D.display=3; else if (d==='DATARATE') D.display=2; else if (d==='FRAMERATE'){ D.display=1; D.dialnorm_pgm=max; }
  }
}
function sourceStep(dir){
  // PROCESS_SOURCE_INCREMENT order: ANALOG - AES75 - AES110 - SDI1/2 - SDI3/4 - ASSIGNS - ANALOG
  const order=[SRC.ANALOG,SRC.AES75,SRC.AES110,SRC.SDI12,SRC.SDI34,SRC.ASSIGNS];
  const ok = s => s===SRC.ASSIGNS? D.mode===1 : s>=SRC.SDI12? (D.en[s] && D.sdi_available) : s===SRC.ANALOG? (D.en[3] && D.analog_available) : D.en[s];
  let i=order.indexOf(D.source);
  for (let n=0;n<6;n++){ i=(i+(dir>0?1:5))%6; if (ok(order[i])){ D.source=order[i]; return; } }
}
function pressButton(key, tr, holding){
  const b=BTN[key], isPreset=!key.startsWith('in');
  tr(`PROCESS_PUSHBUTTONS: READ_SWITCHES(PINB) = INVERT_DATA → pushbuttons = 0x${b.pin.toString(16).padStart(2,'0')}; TRANSLATE_SWITCHES: pb = YES, input_refresh = YES`);
  tr('TRANSLATE_PUSHBUTTONS(pushbuttons): mode = MODE'+D.mode+', screen = '+SCR_NAME[D.screen]);
  const sc=D.screen;
  if ([SCR.SETUP,SCR.SYSTEM,SCR.ASSIGN,SCR.VERSION,SCR.INPUT].includes(sc)){ tr('case '+SCR_NAME[sc]+': “the pushbuttons will do nothing”'); return; }
  if (sc===SCR.LEFT_MIX || sc===SCR.RIGHT_MIX){
    const lr=sc===SCR.RIGHT_MIX?1:0; const ch=b.num-1; const m=D.mixCh[D.preset_index][lr]; m[ch]^=1; D.mix_information_change=true; comm(lr?4:3);
    tr(`STORE_MIX_CHANNELS_VALUES${PRESET_KEYS[D.preset_index]}_${lr?'R':'L'}: channel ${ch+1} (green number) → ${m[ch]?'in':'out of'} the ${lr?'right':'left'} mix; REFRESH_MIX_OUTPUT_LEDS lights its lamp`);
    tr(`command${lr?2:1} = mix_channels…data → ${lr?'H':'J'} frame (#${lr?'H':'J'} preset ch-bits g1…g8 $) to the main board → SHARC output_gain[]`); return;
  }
  if (D.mode===2){
    if (isPreset){ const was = D.preset===key; D.preset = was? 0 : key; D.preset_index=PRESET_KEYS.indexOf(key); D.screen=SCR.PRESET; D.screen_display=SCR.PRESET; comm(2);
      tr('MODE2: preset '+key+(was?' off':' on')+' → screen = PRESET_SCREEN “'+presetsTxt()+'”; the SHARC mixes channels 1–8 into the speakers with mix_gain'+key+' '+inf+' (toggle-off behaviour simplified)');
      if (!holding) tr('Hold it ≈3 s instead to edit the mix (press-and-hold branch in TRANSLATE_SWITCHES)'); return; }
    selectInput(b.num, tr, 'MODE2: all four inputs stay on the meters (CH1/2 … CH7/8); the button picks the pair sent to the speakers '+inf); return;
  }
  if (isPreset){
    if (sc===SCR.PRESET){
      if (D.preset===key){ const o=D.preset_selector; D.preset_selector = o===0?1 : o===1?2 : o===2?3 : 255; if (D.preset_selector===255) D.preset=0;
        tr(`case PRESET_SCREEN: preset ${key} lit and preset_selector == ${SEL_NAME[o]} → ${SEL_NAME[D.preset_selector]}`+(D.preset_selector===255?'; input &= ~0x'+b.lamp.toString(16)+' (preset off, back to LoRo)':'')); }
      else { D.preset=key; D.preset_selector=0; tr(`case PRESET_SCREEN: preset ${key} was off → input |= 0x${b.lamp.toString(16).padStart(2,'0')}; other presets off; preset_selector = LEFT`); }
    } else {
      D.screen=SCR.PRESET; D.screen_display=SCR.PRESET;
      if (D.preset!==key){ D.preset=key; D.preset_selector=0; tr(`case ${sc===SCR.SOURCE?'SOURCE_SCREEN':'default'}: preset ${key} not lit → input |= 0x${b.lamp.toString(16).padStart(2,'0')}; preset = ch${key}; preset_selector = LEFT; screen = PRESET_SCREEN`); }
      else tr(`case default: preset ${key} already lit → screen = PRESET_SCREEN only (the cycling code here is commented out); press again to step`);
    }
    comm(2);
    tr('PROCESS_PRESET_SOURCES → display 1 “'+presetsTxt()+'”; GENERAL_COM G byte = preset, preset_selector → main board → SHARC solo/pair/sum routing to the speakers');
    tr('SAVE_INPUT_SOURCE_INFORMATION(); PROCESS_AUDIO_SOURCE(source); PORTA = OUTPUT_LEDS(input, 0xFF)');
    return;
  }
  if (D.mode===4){ D.input_number = b.num===4? 4 : 1; D.preset=0; tr('MODE4: 1/2, 3/4 and 5/6 light together (inputs 1–3 PCM on CH1–6); 7/8 selects the multichannel input 4'); comm(0); return; }
  selectInput(b.num, tr, sc===SCR.SOURCE? 'case SOURCE_SCREEN' : 'case default: activity_counter = NO_ACTIVITY_THRESHOLD − 1 so any secondary screen closes on the next pass');
  if (sc!==SCR.SOURCE){ D.screen=SCR.INFO; D.screen_display=SCR.INFO; }
  comm(0);
}

/* ================================================================
   SIGNAL + METER ENGINE (the SHARC side)
   Runs the real VUMeterCalc recursion for every sample of the second, for all eight meter channels.
   ================================================================ */
function hash(n, s){ let x = (n*374761393 + s*668265263)|0; x = (x^(x>>>13))*1274126177|0; x ^= x>>>16; return (x>>>0)/4294967296*2-1; }
function makeGen(g){
  if (!g || g.k==='off') return ()=>0;
  if (g.k==='tone'){ const a=Math.pow(10,g.db/20), w=2*Math.PI*g.f/C.FS; return n=>a*Math.sin(w*n); }
  if (g.k==='data'){ return n=>0.5*hash(n,g.seed); }                       // Dolby bitstream read as PCM — inferred look
  let lp=0, lp2=0; const a=Math.pow(10,g.db/20)*4.2, s=g.seed;
  if (g.k==='lfe') return n=>{ lp += (hash(n,s)-lp)*0.004; lp2 += (lp-lp2)*0.004; const env=0.6+0.4*Math.sin(2*Math.PI*1.3*n/C.FS+s); return a*6*lp2*env; };
  return n=>{ const t=n/C.FS; lp += (hash(n,s)-lp)*0.35;
    const syl = Math.max(0, Math.sin(2*Math.PI*(3.1+0.4*Math.sin(s))*t + s)) , phrase = 0.55+0.45*Math.sin(2*Math.PI*0.45*t + s*1.7);
    return a*lp*(0.3+0.7*Math.sqrt(syl))*phrase; };
}
/* which signal each of the eight meters shows (manual pages 12–17) */
function meterSources(){
  const silent = new Array(8).fill(null);
  if (!D.power) return silent;
  const gens = silent.slice();
  if (D.mode===2){
    const bank = D.source===SRC.ASSIGNS? SRC.AES75 : D.source;
    for (let k=1;k<=4;k++){ const c=contentOf(bank,k); if (c.fmt===1){ gens[2*k-2]=c.ch[0]; gens[2*k-1]=c.ch[1]; } else if (c.fmt>=2){ gens[2*k-2]=G.data(k*7); gens[2*k-1]=G.data(k*7+1); } }
    return gens;
  }
  if (D.mode===4 && D.input_number!==4){
    for (let k=1;k<=3;k++){ const c=contentOf(D.source||1,k); if (c.fmt===1){ gens[2*k-2]=c.ch[0]; gens[2*k-1]=c.ch[1]; } } return gens;
  }
  const c = monContent();
  if (c.fmt===1){ gens[0]=c.ch[0]; gens[1]=c.ch[1]; if (!D.prologic){ gens[2]={k:'mix',a:[0.707,0.707],src:c.ch}; gens[4]={k:'mix',a:[0.5,-0.5],src:c.ch}; gens[5]={k:'mix',a:[-0.5,0.5],src:c.ch}; } }
  else if (c.fmt>=2) for (let i=0;i<8;i++) gens[i]=c.ch[i];
  return gens;
}
function meterKey(){ return JSON.stringify([D.power, D.mode, D.source, D.input_number, D.assignment, D.prologic, D.bank, D.cal_level, D.sdi_available]); }
function engine(){
  const key = meterKey(); if (key===MKEY && M) return M; MKEY = key;
  const N = C.FS, PRE = 24000, srcs = meterSources();
  const x = [], vu = [], pk = [];
  for (let ch=0; ch<8; ch++){
    const g = srcs[ch]; const X=new Float32Array(N), V=new Float32Array(N), P=new Float32Array(N); x.push(X); vu.push(V); pk.push(P);
    if (!g){ continue; }
    let f; if (g.k==='mix'){ const fa=makeGen(g.src[0]), fb=makeGen(g.src[1]); f = n=>g.a[0]*fa(n)+g.a[1]*fb(n); } else f = makeGen(g);
    let v=0, p=0;
    for (let n=-PRE; n<N; n++){
      const s = f(n), sq = s*s;                                   // VUMeterCalc: F8 = in²
      const d = sq - p; const pa = p + d*C.TC_PPMA, pd = p + d*C.TC_PPMD;
      v = v + (sq - v)*C.TC_VU; p = Math.max(pa, pd);
      if (n>=0){ X[n]=s; V[n]=v; P[n]=p; }
    }
  }
  M = {x, vu, pk, srcs};
  return M;
}
const meterCal = () => 2*(D.cal_level-41);                         // cal_data[k], k = (cal_level−39)/2 — mapping through the main board inferred
function pval(ms){ return ms>0? Math.min(255, -20*Math.log10(ms)) : 255; }   // VUMeterGet: −2·10·log10(val)
function meterAt(ch, t){
  const m=engine(), n=Math.max(0,Math.min(C.FS-1, Math.floor(t*C.FS)));
  if (!m.srcs[ch]) return {vuIdx:255, pkIdx:255, bar:0, dot:0, vuDb:-128, pkDb:-128, x:0};
  const pv = pval(m.vu[ch][n]), pp = pval(m.pk[ch][n]), cal = meterCal();
  const vuIdx = Math.max(0, Math.min(255, Math.round(pv + cal - 6))), pkIdx = Math.max(0, Math.min(255, Math.round(pp + cal)));
  return { vuIdx, pkIdx, bar: litOf(vuIdx), dot: litOf(pkIdx), vuDb: -pv/2, pkDb: -pp/2, x: m.x[ch][n], pv, pp };
}
function barWords(bar, dot){       // translate_meter_results: lower 32 LEDs (bit 31 = PR … bit 0 = +6), upper bits 15 … 2 (+7 … +20)
  let lo=0, up=0;
  const set = s => { if (s<=0) return; if (s<=32) lo |= (1<<(32-s)); else up |= (1<<(15-(s-33))); };
  for (let s=1;s<=bar;s++) set(s); set(dot);
  return [lo>>>0, up>>>0];
}
/* monitor (speaker) feed: preset routing in MODE1, volume from ams81_volume_table */
function speakerAt(n){
  const m=engine(); const c=monContent(); const X=m.x;
  const g = (D.mute||D.volume===0||!D.speaker)? 0 : Math.pow(10,(D.volume-61)/20);
  let L=0,R=0;
  if (D.mode===1 && D.preset){ const [a,b]=presetPair().map(v=>v-1); const s=D.preset_selector;
    if (s===0) L=R=X[a][n]; else if (s===1) L=R=X[b][n]; else if (s===2){ L=X[a][n]; R=X[b][n]; } else L=R=0.5*(X[a][n]+X[b][n]); }
  else if (c.fmt>=2){ L = X[0][n]+0.707*X[2][n]+0.707*X[4][n]; R = X[1][n]+0.707*X[2][n]+0.707*X[5][n]; }   // Lo/Ro downmix — inferred
  else { L=X[0][n]; R=X[1][n]; }
  return [L*g, R*g];
}

/* ================================================================
   TIMING MODEL — the second as seen by the two processors
   ================================================================ */
const STEPS = [
  ['WDR · SWITCH_ENCODER1 · SWITCH_ENCODER2', .06, 'PINE bits 2/3: the knob push switches → TRANSLATE_ENCODER1/2, DEBOUNCE_ENCODER1/2'],
  ['SHAFT_ENCODER1 · SHAFT_ENCODER2', .06, 'PINF / PIND bits 0–1 → PROCESS_SHAFT_ENCODERx state table → encoder_action'],
  ['WDR · PROCESS_PUSHBUTTONS · TRANSLATE_PUSHBUTTONS', .12, 'PINB inverted; TRANSLATE_SWITCHES + DEBOUNCE; act on a press; PORTA = button lamps'],
  ['WDR · LEFT_ENCODER_UPDATE · RIGHT_ENCODER_UPDATE', .08, 'Apply SELECT / VOLUME steps to the current screen'],
  ['ACTIVITY_MONITOR', .03, 'Idle counter for VOLUME/SOURCE/PRESET screens (10000 passes)'],
  ['UPDATE_DISPLAY', .30, 'PROCESS_METADATA_INFORMATION, PROCESS_INPUT_SOURCES; if refresh → SIEMENS8_lcd_display1/2/3'],
  ['COMMUNICATION_MONITOR', .03, 'After 1000 passes the UART frame type falls back to GENERAL_COM'],
  ['WDR · UART0_setup · UART0_transmit_counter · UART0_translate', .20, 'Every 26th pass one byte → UDR0; parse a complete “#…$” reply'],
  ['WDR · UART1_transmit_counter · UART1_receive · UART1_translate · UART1_com_check', .12, 'DEMUX board link: SDI carrier / audio lock, HD/SD'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
function stepAt(t){ const p=Math.floor(t/C.LOOP_T); const f=(t/C.LOOP_T)-p; let k=0; for (let j=0;j<STEPS.length;j++) if (f>=STEP_FRAC[j]) k=j; return {pass:p, step:k, frac:f}; }
/* UART0 frames (UART0_transmit_counter) */
const KIND_NAME = ['GENERAL_COM','VOLUME_COM','FAVOURITE_COM','LEFT_MIX_COM','RIGHT_MIX_COM','SETUP_COM'];
function kindAt(t){ if (D.commAt>=0 && t>=D.commAt && t < D.commAt + C.COMM_THRESH*C.LOOP_T) return D.commKind===2? 0 : D.commKind; return 0; }
const raw = v => ({raw:v});
function frameBytes(kind){
  const v=D.volume, h=Math.floor(v/100), te=Math.floor(v/10)%10, o=v%10, [ms,mi]=monitored();
  const vol = D.mute? ['F','F','F'] : [raw(h),raw(te),raw(o)];
  if (kind===1) return ['#','F',...vol,'E',raw(D.source===SRC.ASSIGNS?ms:D.source),raw(D.source===SRC.ASSIGNS?mi:D.input_number),'$'];
  if (kind===5) return ['#','L',raw(0),raw(4),raw(1),'M',raw(D.setup_screen_mode),'O',raw(D.output),'I',String(D.reference),'S',raw(D.speaker),'N',raw(1),'Y',raw(Math.floor(D.cal_level/10)%10),raw(D.cal_level%10),'Q',raw(D.dialnorm_settings),'Z',raw(D.output4_settings),'$'];
  if (kind===3 || kind===4){ const lr=kind===4?1:0; const bits=D.mixCh[D.preset_index][lr].reduce((a,b,i)=>a|(b<<i),0); return ['#',lr?'H':'J',raw(D.preset_index),raw(bits),...D.mixGain[D.preset_index][lr].map(raw),'$']; }
  const sel = D.preset_selector, pre = D.preset? D.preset : raw(0);
  return ['#','A','B','C',String(D.dialnorm_pgm),'E',raw(D.source===SRC.ASSIGNS?ms:D.source),raw(D.source===SRC.ASSIGNS?mi:D.input_number),'F',...vol,'G',pre,raw(sel),'P',raw(format()===1? (D.prologic?1:0) : 1),'V',raw(0),'X',raw(255),'$'];
}
const bstr = b => typeof b==='string'? b : '\\'+b.raw;
let TXS=null, TXKEY='';
function txSchedule(){
  const key = JSON.stringify([D.commAt, D.commKind, D.volume, D.mute, D.source, D.input_number, D.preset, D.preset_selector, D.dialnorm_pgm, D.prologic, D.setup_screen_mode, D.reference, D.cal_level]);
  if (key===TXKEY && TXS) return TXS; TXKEY=key;
  const bytes=[], frames=[]; let slot=0;
  while (true){
    const t0 = (25 + 26*slot)*C.LOOP_T; if (t0>1.05) break;
    const kind=kindAt(t0), fb=frameBytes(kind); const fr={kind, t0, bytes:fb, slots:[]};
    for (let i=0;i<=fb.length;i++){ const ts=(25+26*slot)*C.LOOP_T; slot++; if (i<fb.length){ bytes.push({t:ts, b:fb[i], i, frame:frames.length}); fr.slots.push(ts); } else fr.t1 = ts; }
    frames.push(fr);
  }
  TXS = {bytes, frames}; return TXS;
}
function rxFrames(){                    // main board reply after each TX frame — cadence INFERRED
  const c=monContent(), out=[], tx=txSchedule();
  tx.frames.forEach(f=>{ if (f.kind!==0) return; const t0=f.t1+0.002; const dn=(c.dn||[0])[D.dialnorm_pgm-1]||0;
    out.push({t0, t1:t0+20*C.BYTE_T, bytes:['#','A',raw(format()),'B',raw(c.cfg||0),'C',String(D.dialnorm_pgm),raw(dn),'D',raw((c.mx||[0])[0]||0),'R',raw(c.fr||0),'T',raw(c.dr||0),'X',raw(255),raw(0),'?',raw(D.mode),'$']}); });
  return out;
}
function dolbyFrames(){ const c=monContent(); if (c.fmt===3) return {period:1/FR_HZ[c.fr], name:'Dolby E frame ('+FR_TXT[c.fr]+' fps video frame)'}; if (c.fmt===2) return {period:1536/C.FS, name:'AC-3 sync frame (1536 samples)'}; return null; }

/* ================================================================
   DRAWING: front and rear panels on the real silkscreen
   ================================================================ */
/* Panels are built on AMS82-FRONT-SILK (CURVE).cdr and AMS82-M2 SILK (CURVE).cdr (2016|49 drafting set, artwork
   dated OCT.20/15 and MAY 07/15). Converted with Inkscape and cut by tools/silk_extract.py at 200 dpi: 3447 × 679 px = the
   panel face between the crop marks. Front: GREEN and WHITE separations minus the geometry common to both (that geometry
   is ams82-front-cut.png: panel outline, hex vents, button and display cut-outs, drill crosshairs). Rear: the WHITE
   separation split into printed text (ams82-rear-white.png) and connector outlines (ams82-rear-cut.png).
   Buttons, knobs, displays and the jack sit on the cut-outs and crosshairs. The meter window contents (bars, lens scale)
   are measured from AMS8-2A Series Front.jpg. */
const FW=3447, FH=679;
/* Artwork 2026|59: the default face is now the CorelDRAW vector art itself, assets/ams82-front.svg and ams82-rear.svg, cut
   from the same two CURVE .cdr files by Inkscape (plain SVG, pt units). Each asset's viewBox is the panel outline drawn in
   the .cdr (front 72.4,93.3 → 1241.3 × 244.6 pt; rear 63.8,185.0), which is the same frame as the 200 dpi PNGs to within
   ~1 px, so every control above stays on its hole. Front: the GREEN plate in POD green, the WHITE plate (moved up 322.1 pt
   onto the green one) in white, the mechanical #000000 lines (outline, vents, cut-outs) in grey. Drill crosshairs and
   duplicated hole rings (0.5/1.0 pt guide strokes) are left out. Rear: the third-party logo box is replaced by plain text.
   The old PNG separations stay behind the "PNG silk" toggle. */
const ART = { png:false,
  FRONT:'AMS82 - #Master/AMS82 - #ARTWORK #DA #2016/AMS82-FRONT-SILK (CURVE).cdr',
  REAR:'AMS82 - #Master/AMS82 - #ARTWORK #DA #2016/AMS82-M2 SILK (CURVE).cdr' };
function artNote(which){
  const f = which==='rear'? SIM.src(ART.REAR,'AMS82-M2 SILK (CURVE).cdr')+' (MAY 07/15)' : SIM.src(ART.FRONT,'AMS82-FRONT-SILK (CURVE).cdr')+' (OCT.20/15, GREEN + WHITE plates)';
  return `<div class="small muted" style="margin-top:4px">Artwork: ${f}, CorelDRAW vector art. <label><input type="checkbox" class="artpng" ${ART.png?'checked':''}> show the earlier PNG silk (tools/silk_extract.py cut of the same .cdr)</label></div>`;
}
function bindArt(m){ m.querySelectorAll('.artpng').forEach(c=> c.onchange=e=>{ ART.png=e.target.checked; m.querySelectorAll('.artpng').forEach(o=>o.checked=ART.png); SIM.refresh(); }); }
const DM_EXT = { 'Ω':[14,17,17,17,10,10,27], 'j':[2,0,6,2,2,18,12], 'q':[0,0,13,19,15,1,1], '?':[14,17,1,2,4,0,4] };
function dm(text, x, y, p, on, off){
  let s=''; const r=(p*0.40).toFixed(2);
  for (let i=0;i<text.length;i++){ const ch=text[i], cx=x+i*p*6.2;
    if (DM_EXT[ch]){ const g=DM_EXT[ch]; for (let row=0;row<7;row++) for (let col=0;col<5;col++){ const o=(g[row]>>(4-col))&1; s+=`<circle cx="${(cx+col*p).toFixed(1)}" cy="${(y+row*p).toFixed(1)}" r="${r}" fill="${o?on:off}"/>`; } }
    else s += SIM.dotMatrix(ch, cx, y, p, on, off);
  }
  return s;
}
const PAIR_X = p => 927 + 155*p;
const SEG_Y = s => 46 + (46-s)*12;
function meterSVG(t){
  let s = `<rect x="887" y="9" width="598" height="661" fill="#050605"/>`;
  const vis = D.showMux? Math.floor(t/C.MUX_T)%8 : -1;
  for (let ch=0; ch<8; ch++){
    const p=ch>>1, x = ch%2? PAIR_X(p)+70 : PAIR_X(p);
    const m = meterAt(ch, t); const lit = D.power && (vis<0 || vis===ch);
    for (let sg=1; sg<=46; sg++){
      const on = lit && (sg<=m.bar || sg===m.dot), col=segColour(sg);
      s += `<rect x="${x-8}" y="${SEG_Y(sg)-4.5}" width="16" height="9" rx="1.5" fill="${col}" opacity="${on?1:0.10}"${on?' filter="url(#mg)"':''}/>`;
    }
    s += `<rect class="mtr" data-ch="${ch}" x="${x-14}" y="30" width="28" height="575" fill="transparent" style="cursor:pointer"><title>Meter CH${ch+1}: click to follow it on the timeline</title></rect>`;
    if (D.meterCh===ch) s += `<rect x="${x-12}" y="30" width="24" height="572" fill="none" stroke="#6fb7ff" stroke-width="2" stroke-dasharray="6 5" opacity=".7"/>`;
  }
  for (let p=0;p<4;p++){
    const cx = PAIR_X(p)+35, c = contentOf(D.mode===2? (D.source||1) : monitored()[0], p+1);
    s += `<circle cx="${cx}" cy="${SEG_Y(26)}" r="7" fill="#ff2a1c" opacity="${D.power?1:.15}" ${D.power?'filter="url(#mg)"':''}><title>Reference LED at 0 (always lit)</title></circle>`;
    const dd = D.power && c.fmt>=2;
    s += `<rect x="${cx-7}" y="500" width="14" height="8" rx="2" fill="#5cff3a" opacity="${dd?1:.12}"/><text x="${cx}" y="526" text-anchor="middle" font-size="11" font-weight="700" fill="#e8e8e2">DD</text>`;
    s += `<rect x="${cx-7}" y="537" width="14" height="8" rx="2" fill="#ff2a1c" opacity=".12"/><text x="${cx}" y="563" text-anchor="middle" font-size="11" font-weight="700" fill="#e8e8e2">ERR</text>`;
    if (p<3){ const sx=PAIR_X(p)+104; for (let sg=1;sg<=46;sg++){ const L=segLabel(sg); if (sg>=2 && sg<=9 && sg%2) continue; if (sg>=11 && sg<=15 && sg%2) continue;
      s += `<text x="${sx}" y="${SEG_Y(sg)+3.6}" text-anchor="middle" font-size="10" font-weight="700" fill="#ecece6">${L.replace('-','').replace('+','')}</text>`; } }
  }
  return s;
}
function frontSVG(t, opts){
  opts=opts||{};
  const dsp = displays(), lamps = D.power? lampByte() : 0;
  const ON='#d8f23c', OFF='rgba(210,240,70,.07)';
  const p1=7.4, p2=7.0;
  let dms = dm(dsp.d2, 1652, 82, p1, ON, OFF) + dm(dsp.d3, 2052, 82, p1, ON, OFF) + dm(dsp.d1, 2071, 222, p2, ON, OFF);
  const btn = (key, x, y) => { const b=BTN[key], on=(lamps & b.lamp)!==0, pre=!key.startsWith('in'), held=D.held.includes(key);
    return `<g class="pb" data-k="${key}" style="cursor:pointer"><rect x="${x-31}" y="${y-31}" width="62" height="62" rx="5" fill="${pre?'#e2cc2a':'#151617'}" stroke="${held?'#6fb7ff':'#000'}" stroke-width="${held?5:2}"/>
      <rect x="${x-17}" y="${y-11}" width="34" height="22" rx="3" fill="${on? (pre?'#fffbe0':'#ff4a5a') : (pre?'#f2e9b0':'#b9bab6')}" ${on?'filter="url(#glow)"':''}/>
      <title>${b.label} — click to press, Shift+click to hold</title></g>`; };
  const knob = (k, x, y) => { const a=D.knobAngle[k]*Math.PI/180;
    return `<g class="knob" data-k="${k?'vol':'sel'}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="62" fill="transparent"/>
      <circle cx="${x}" cy="${y}" r="47" fill="#0b0b0c" stroke="#2c2e30" stroke-width="3"/>${Array.from({length:24},(_,i)=>{const b=i*Math.PI/12; return `<line x1="${x+44*Math.cos(b)}" y1="${y+44*Math.sin(b)}" x2="${x+48*Math.cos(b)}" y2="${y+48*Math.sin(b)}" stroke="#333" stroke-width="3"/>`;}).join('')}
      <circle cx="${x}" cy="${y}" r="34" fill="#1b1c1e"/><circle cx="${x-9}" cy="${y-10}" r="14" fill="#3a3c40" opacity=".55"/>
      <line x1="${x+12*Math.sin(a)}" y1="${y-12*Math.cos(a)}" x2="${x+32*Math.sin(a)}" y2="${y-32*Math.cos(a)}" stroke="#d9d9d4" stroke-width="4" stroke-linecap="round"/></g>`; };
  const screw = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r||15}" fill="#6b6d70" stroke="#2a2b2c" stroke-width="2"/><path d="M${x-9} ${y}h18M${x} ${y-9}v18" stroke="#2a2b2c" stroke-width="3"/>`;
  return `<svg viewBox="0 0 ${FW} ${FH}" role="img" aria-label="AMS8-2 front panel on the real silkscreen" style="width:100%;display:block;border-radius:6px">
    <defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="mg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${FW}" height="${FH}" fill="#1e1f1c"/>
    ${meterSVG(t)}
    <rect x="1638" y="55" width="787" height="97" fill="#070806"/><rect x="2058" y="195" width="367" height="97" fill="#070806"/>
    ${ART.png? `<image href="${ASSET}ams82-front-cut.png" width="${FW}" height="${FH}" opacity=".9"/>
    <image href="${ASSET}ams82-front-green.png" width="${FW}" height="${FH}"/>
    <image href="${ASSET}ams82-front-white.png" width="${FW}" height="${FH}"/>` : `<image href="${ASSET}ams82-front.svg" width="${FW}" height="${FH}" preserveAspectRatio="none"/>`}
    <g filter="url(#glow)">${dms}</g>
    ${IN_KEYS.map((k,i)=>btn(k,1710+90*i,244)).join('')}${PRESET_KEYS.map((k,i)=>btn(k,1710+90*i,364)).join('')}
    ${knob(0,2102,364)}${knob(1,2382,364)}
    <g><circle cx="2533" cy="541" r="38" fill="#9a9c9f" stroke="#444" stroke-width="3"/><circle cx="2533" cy="541" r="17" fill="#050505"/><title>Headphone jack (speaker feed)</title></g>
    ${[[848,62],[848,616],[1522,64],[1522,614],[1626,304],[2477,304]].map(([x,y])=>screw(x,y)).join('')}${[2186,2242,2298].map(x=>screw(x,364,12)).join('')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(){
  const RW=3448;
  const bnc = (x,y,id,lbl,on) => `<g ${id?`class="jack" data-j="${id}" style="cursor:pointer"`:''}><circle cx="${x}" cy="${y}" r="46" fill="#a98c3c" stroke="#5e4d1c" stroke-width="3"/><circle cx="${x}" cy="${y}" r="29" fill="#e2cd86"/><circle cx="${x}" cy="${y}" r="9" fill="#6c540f"/>
      ${on?`<circle cx="${x+40}" cy="${y-40}" r="11" fill="var(--accent)"/>`:''}${lbl?`<title>${lbl}</title>`:''}</g>`;
  const phx = (x,y,n,id,lbl,on) => { let s=`<g ${id?`class="jack" data-j="${id}" style="cursor:pointer"`:''}>`; for (let i=0;i<n;i++){ const x0=x+i*109; s+=`<rect x="${x0}" y="${y}" width="104" height="66" rx="4" fill="#23a35a" stroke="#0e4d25" stroke-width="2"/>${[0,1,2].map(j=>`<rect x="${x0+12+j*29}" y="${y+14}" width="22" height="22" rx="3" fill="#0d3a1c"/>`).join('')}`; }
    return s + (on?`<circle cx="${x+n*109-12}" cy="${y-12}" r="10" fill="var(--accent)"/>`:'') + (lbl?`<title>${lbl}</title>`:'') + '</g>'; };
  const dsub = (x,y,w,h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#b9bcbf" stroke="#555" stroke-width="3"/><rect x="${x+16}" y="${y+16}" width="${w-32}" height="${h-32}" rx="10" fill="#202224"/>`;
  const has = (b,k) => CONTENT[D.bank[b][k-1]].fmt>0;
  let s = `<svg viewBox="0 0 ${RW} ${FH}" role="img" aria-label="AMS8-2 rear panel on the real silkscreen" style="width:100%;display:block;border-radius:6px">
    <rect width="${RW}" height="${FH}" fill="#1e1f1c"/>
    ${ART.png? `<image href="${ASSET}ams82-rear-cut.png" width="${RW}" height="${FH}" opacity=".9"/>` : ''}
    <rect x="75" y="394" width="214" height="242" rx="10" fill="#111" stroke="#444" stroke-width="3"/><rect x="110" y="430" width="144" height="100" rx="8" fill="#050505"/><title>IEC mains inlet + fuse</title>
    ${[0,1,2,3,4,5,6,7,8].map(i=>`<rect x="${526+40*i}" y="416" width="16" height="198" rx="8" fill="#050605"/>`).join('')}
    ${dsub(903,437,94,155)}${dsub(1036,437,94,155)}${dsub(1470,132,330,95)}${dsub(1470,545,330,95)}
    <rect x="1161" y="385" width="815" height="138" rx="6" fill="${D.sdi_available?'#141516':'#26282a'}" stroke="#555" stroke-width="2"/>
    ${D.sdi_available? [1230,1390,1550,1710,1870].map((x,i)=>bnc(x,454,i<2?'sdi'+(i+1):null,['SDI IN 1','SDI IN 2','SDI OUT','AES OUT 1','AES OUT 2'][i],false)).join('') : `<text x="1568" y="460" text-anchor="middle" font-size="26" fill="#888">option plate (DEMUX 4 adaptor not fitted)</text>`}
    ${[1998,2148,2298,2448,2598,2748,2898].map(x=>`<circle cx="${x}" cy="180" r="46" fill="#050505"/>`).join('')}
    ${bnc(2113,443,'ref','REF IN (75 Ω) — click to connect / disconnect',D.refPresent)}
    ${[1,2,3,4].map(k=>bnc(2138+125*k,443,'b75-'+k,'IN '+k+' (75 Ω): '+CONTENT[D.bank[1][k-1]].name+' — click to change',has(1,k))).join('')}
    ${[0,1,2,3].map(k=>bnc(2823+125*k,443,null,'OUT '+(k+1),false)).join('')}
    ${phx(1994,565,2,null,'MONITOR OUTPUT')}${phx(2254,565,1,null,'REF IN 110 Ω')}
    ${[1,2,3,4].map(k=>phx(2404+109*(k-1),565,1,'b110-'+k,'IN '+k+' (110 Ω): '+CONTENT[D.bank[2][k-1]].name+' — click to change',has(2,k))).join('')}
    ${phx(2884,565,4,null,'OUT 1–4 (110 Ω)')}
    <image href="${ASSET}${ART.png? 'ams82-rear-white.png' : 'ams82-rear.svg'}" width="${RW}" height="${FH}" preserveAspectRatio="none"/>
  </svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.knob').forEach(g=>{
    const k=g.dataset.k;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width;
      if (x<0.36) (k==='sel'?A.turnSelect:A.turnVolume)(-1); else if (x>0.64) (k==='sel'?A.turnSelect:A.turnVolume)(1); else (k==='sel'?A.pressSelect:A.pressVolume)(); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); (k==='sel'?A.turnSelect:A.turnVolume)(e.deltaY<0?1:-1); }, {passive:false});
  });
  root.querySelectorAll('.pb').forEach(g=> g.addEventListener('click', e=>{ if (e.shiftKey) A.hold(g.dataset.k); else A.button(g.dataset.k); }));
  root.querySelectorAll('.mtr').forEach(g=> g.addEventListener('click', ()=>{ D.meterCh=+g.dataset.ch; SIM.refresh(); }));
  root.querySelectorAll('.jack').forEach(g=> g.addEventListener('click', ()=>{
    const j=g.dataset.j;
    if (j==='ref'){ D.refPresent=!D.refPresent; act(D.refPresent?'Connect REF IN':'Disconnect REF IN', tr=>{ tr('Reference lock is reported by the main board in the “#A f B c I r $” reply (reference_lock = rx_buffer[5] − 0x30). With Ref = Int the unit ignores it.'); }); return; }
    if (j.startsWith('sdi')){ const k=+j.slice(3); const cur=D.bank[4][k-1]; A.setContent(4, k, CONTENT_KEYS[(CONTENT_KEYS.indexOf(cur)+1)%CONTENT_KEYS.length]); return; }
    const [b,k]=j.replace('b','').split('-'); const bank = b==='75'?1:2; const cur=D.bank[bank][k-1]; const nx = CONTENT_KEYS[(CONTENT_KEYS.indexOf(cur)+1)%CONTENT_KEYS.length];
    A.setContent(bank, +k, nx);
  }));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">SELECT</span><button data-a="sl">⟲</button><button data-a="sp">push</button><button data-a="sr">⟳</button>
    <span class="small muted" style="margin-left:8px">VOLUME</span><button data-a="vl">⟲</button><button data-a="vp">push</button><button data-a="vr">⟳</button>
    <button data-a="sys" style="margin-left:8px" title="Hold INPUTS 1/2 and 7/8, then press SELECT">1/2 + 7/8 + SELECT</button>
    <button data-a="hold" title="Press and hold PRESET A for ≈3 s">hold A 3 s</button><button data-a="to" title="ACTIVITY_MONITOR timeout">wait 3.4 s</button></div>
    <div class="small muted" style="margin-top:4px">Click a knob’s left side to turn it counter-clockwise, its centre to push it, its right side to turn clockwise (the wheel works too). Click a button to press it; Shift+click holds it down. Keys: Q W E (SELECT) · I O P (VOLUME) · 1–4 inputs · A–D presets · S = system-setup combo.</div>`;
}
function bindControls(root){
  const map={sl:()=>A.turnSelect(-1),sp:()=>A.pressSelect(),sr:()=>A.turnSelect(1),vl:()=>A.turnVolume(-1),vp:()=>A.pressVolume(),vr:()=>A.turnVolume(1),sys:()=>A.systemCombo(),hold:()=>A.holdPreset('A'),to:()=>A.timeout()};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
}
document.addEventListener('keydown', e=>{
  if (!window.__ams82Active || e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  const m={q:()=>A.turnSelect(-1),w:()=>A.pressSelect(),e:()=>A.turnSelect(1),i:()=>A.turnVolume(-1),o:()=>A.pressVolume(),p:()=>A.turnVolume(1),
    '1':()=>A.button('in1'),'2':()=>A.button('in2'),'3':()=>A.button('in3'),'4':()=>A.button('in4'),a:()=>A.button('A'),b:()=>A.button('B'),c:()=>A.button('C'),d:()=>A.button('D'),s:()=>A.systemCombo()};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function laneText(c, s, x, y){ c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--sans'); c.fillText(s, x, y); }
function lanes(){
  const css=n=>SIM.css(n), ch=D.meterCh;
  const L = [];
  L.push({label:'ATmega128 main loop (front panel)', h:34, draw(c,X,t0,t1,y,h){
    const pw = X(t0+C.LOOP_T)-X(t0);
    if (pw < 2.5){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono');
      c.fillText(`${Math.round((t1-t0)/C.LOOP_T).toLocaleString()} passes of while(1) (≈${(C.LOOP_T*1e3).toFixed(3)} ms each, inferred)`, X(t0)+6, y+h/2+4); return; }
    for (let p=Math.floor(t0/C.LOOP_T); p*C.LOOP_T<=t1; p++){ const a=p*C.LOOP_T;
      if (pw>90){ STEPS.forEach((s,j)=>{ const xa=X(a+STEP_FRAC[j]*C.LOOP_T), xb=X(a+(STEP_FRAC[j]+s[1])*C.LOOP_T); c.fillStyle = j===5? css('--accent2') : j===7? css('--warn') : css('--accent'); c.globalAlpha=j%2?.55:.85; c.fillRect(xa,y+3,Math.max(1,xb-xa-1),h-6); c.globalAlpha=1;
          if (xb-xa>64){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].replace('WDR · ','').split(' · ')[0].slice(0,22), xa+3, y+h/2+3); } }); }
      else { c.fillStyle = p%2? css('--accent2') : css('--accent'); c.globalAlpha=.75; c.fillRect(X(a),y+3,Math.max(1,pw-.5),h-6); c.globalAlpha=1; }
    }
  }});
  L.push({label:'UART0 TX → main board (9600)', h:30, draw(c,X,t0,t1,y,h){
    const tx=txSchedule(); const span=t1-t0;
    tx.frames.forEach(f=>{ if (f.t1<t0 || f.t0>t1) return; c.fillStyle=css('--warn'); c.globalAlpha=.12; c.fillRect(X(f.t0),y+2,X(f.t1)-X(f.t0),h-4); c.globalAlpha=1;
      if (X(f.t1)-X(f.t0)>90){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(KIND_NAME[f.kind], Math.max(X(t0),X(f.t0))+3, y+10); } });
    tx.bytes.forEach(b=>{ if (b.t+C.BYTE_T<t0 || b.t>t1) return; const xa=X(b.t), xb=X(b.t+C.BYTE_T); c.fillStyle=css('--warn'); c.fillRect(xa,y+13,Math.max(1,xb-xa),h-16);
      if (xb-xa>14){ c.fillStyle='#000'; c.font='bold 10px '+css('--mono'); c.fillText(bstr(b.b).slice(0,4), xa+2, y+h-6); } });
    if (span>0.3) laneText(c, `one byte every 26 passes (${(26*C.LOOP_T*1e3).toFixed(2)} ms); “#ABC…$” = ${frameBytes(0).length} bytes`, X(t0)+6, y+h-4);
  }});
  L.push({label:'UART0 RX ← main board', h:24, draw(c,X,t0,t1,y,h){
    rxFrames().forEach(f=>{ if (f.t1<t0||f.t0>t1) return; c.fillStyle=css('--accent2'); c.globalAlpha=.85;
      f.bytes.forEach((b,i)=>{ const a=f.t0+i*C.BYTE_T, xa=X(a), xb=X(a+C.BYTE_T); c.fillRect(xa,y+5,Math.max(1,xb-xa-0.5),h-10); if (xb-xa>14){ c.fillStyle='#fff'; c.font='bold 10px '+css('--mono'); c.fillText(bstr(b).slice(0,4), xa+2, y+h-8); c.fillStyle=css('--accent2'); } }); c.globalAlpha=1; });
    if (t1-t0>0.3) laneText(c, 'reply “#A f B c C p dn D mx R fr T dr X r v ? m $” after each GENERAL frame (timing inferred)', X(t0)+6, y+h-6);
  }});
  L.push({label:'UART1 ↔ DEMUX board', h:20, draw(c,X,t0,t1,y,h){
    if (!D.sdi_available){ const tp=0.62; if (tp>=t0&&tp<=t1){ c.fillStyle=css('--ink2'); c.fillRect(X(tp),y+4,Math.max(2,X(tp+2*C.BYTE_T)-X(tp)),h-8); } laneText(c,'no board: a 2-byte poll every 16000+ passes (≈5.3 s; phase inferred)', X(t0)+6, y+h-6); return; }
    SIM.pulses(c,X,t0,t1,y,h,52*C.LOOP_T,25*C.LOOP_T,2*C.BYTE_T,css('--ink2'),'SDI status polls');
  }});
  L.push({label:'Display bus writes (24 chars)', h:20, draw(c,X,t0,t1,y,h){
    c.fillStyle=css('--accent2'); D.dispWrites.forEach(tw=>{ const a=tw+STEP_FRAC[5]*C.LOOP_T; if (a<t0||a>t1) return; c.fillRect(X(a),y+3,Math.max(2,X(a+24*4e-6)-X(a)),h-6); });
    if (!D.dispWrites.length) laneText(c,'only when refresh = YES (after an action or a metadata change)', X(t0)+6, y+h-6);
  }});
  L.push({label:'SHARC sport0_isr @ 48 kHz', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,C.ISR_T,css('--accent'),'VUMeterCalc + mix + translate_meter_results'); }});
  L.push({label:'SHARC main loop (VUMeterGet ×16, idle)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.DSP_MAIN_T,C.ISR_T,C.DSP_MAIN_T*0.75,css('--accent2'),'passes (≈2 samples each, inferred)'); }});
  L.push({label:'Timer 1 → shifter (mux_count)', h:30, draw(c,X,t0,t1,y,h){
    const pw=X(t0+C.MUX_T)-X(t0);
    if (pw<6){ SIM.pulses(c,X,t0,t1,y,h,C.MUX_T,0,C.MUX_T/8,css('--warn'),'meter strobes (640 Hz, 80 Hz per meter)'); return; }
    for (let k=Math.floor(t0/C.MUX_T); k*C.MUX_T<=t1; k++){ const a=k*C.MUX_T, m=k%8; c.fillStyle = m===D.meterCh? css('--play') : (m%2? css('--warn'):css('--accent'));
      c.globalAlpha=.25; c.fillRect(X(a),y+3,pw-1,h-6); c.globalAlpha=1; c.fillRect(X(a),y+3,Math.max(1,X(a+22e-6)-X(a)),h-6);
      if (pw>34){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText('CH'+(m+1), X(a)+4, y+h/2+4); } }
  }});
  const df = dolbyFrames();
  L.push({label: df? df.name : 'Dolby frames (input is not Dolby)', h:20, draw(c,X,t0,t1,y,h){ if (!df){ laneText(c,'—', X(t0)+6, y+h-6); return; } SIM.pulses(c,X,t0,t1,y,h,df.period,0,df.period*0.04,css('--ink2'),'frames'); }});
  L.push({label:`CH${ch+1} signal · VU (green) · PPM (orange)`, h:70, draw(c,X,t0,t1,y,h){
    const m=engine(); if (!m.srcs[ch]){ laneText(c,'no signal on this meter in the current mode/input', X(t0)+6, y+h/2); return; }
    const N=Math.min(900, Math.max(100, (X(t1)-X(t0)))), span=t1-t0;
    const yDb = db => y+4 + (Math.min(0,Math.max(-60,db))/-60)*(h-8);
    c.strokeStyle=css('--grid'); [-20,-40].forEach(d=>{ c.beginPath(); c.moveTo(X(t0),yDb(d)); c.lineTo(X(t1),yDb(d)); c.stroke(); });
    c.strokeStyle=css('--ink2'); c.globalAlpha=.35; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const v=Math.abs(m.x[ch][n]); const yy=yDb(v>0?20*Math.log10(v):-99); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.globalAlpha=1;
    [['vu','#3fbf5f'],['pk','#e8a23a']].forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const db=10*Math.log10(Math.max(1e-13,m[k][ch][n])); const yy=yDb(db); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.lineWidth=1; });
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('0 dBFS',X(t0)+2,y+12); c.fillText('−60',X(t0)+2,y+h-4);
  }});
  L.push({label:`CH${ch+1} LEDs lit (bar + peak dot)`, h:40, draw(c,X,t0,t1,y,h){
    const N=Math.min(700, Math.max(80,(X(t1)-X(t0))/1.5)), span=t1-t0, w=(X(t1)-X(t0))/N;
    for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; const mm=meterAt(ch,tt); const yb=y+h-3-(mm.bar/46)*(h-6), yd=y+h-3-(mm.dot/46)*(h-6);
      c.fillStyle=segColour(mm.bar); c.globalAlpha=.7; c.fillRect(X(t0)+i*w, yb, w+.5, y+h-3-yb); c.globalAlpha=1; if (mm.dot>mm.bar){ c.fillStyle=segColour(mm.dot); c.fillRect(X(t0)+i*w, yd-1.5, w+.5, 3); } }
  }});
  L.push({label:'Speaker feed L / R', h:40, draw(c,X,t0,t1,y,h){
    const span=t1-t0, N=Math.min(1200, Math.max(200,(X(t1)-X(t0))*2));
    [['#3fbf5f',0],['#e0553a',1]].forEach(([col,s])=>{ c.strokeStyle=col; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const v=speakerAt(n)[s]; const yy=y+h/2-Math.max(-1,Math.min(1,v*12))*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    if (D.mute) laneText(c,'muted (volume = 255)', X(t0)+6, y+12);
  }});
  return L;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn or push a knob, or press a button. Each step the firmware takes is listed here.</div>'; }
function contentSelectors(){
  const sel=(b,k)=>`<select data-bank="${b}" data-k="${k}">${CONTENT_KEYS.map(key=>`<option value="${key}" ${D.bank[b][k-1]===key?'selected':''}>${CONTENT[key].name}</option>`).join('')}</select>`;
  return `<table class="kv"><tr><th></th><th>75 Ω BNC</th><th>110 Ω Phoenix</th></tr>${[1,2,3,4].map(k=>`<tr><td>IN ${k}</td><td>${sel(1,k)}</td><td>${sel(2,k)}</td></tr>`).join('')}</table>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center"><label class="small"><input type="checkbox" id="sdi" ${D.sdi_available?'checked':''}> DEMUX 4 SDI board fitted</label>
    <label class="small"><input type="checkbox" id="mux" ${D.showMux?'checked':''}> Show multiplexing (only the strobed meter is lit)</label>
    <button id="pwr">Power ${D.power?'off':'on'}</button><button id="rst">Factory defaults</button></div>`;
}
function bindContent(m){
  m.querySelectorAll('select[data-bank]').forEach(s=> s.onchange=()=>A.setContent(+s.dataset.bank, +s.dataset.k, s.value));
  const q=id=>m.querySelector(id);
  if (q('#sdi')) q('#sdi').onchange=e=>A.sdiBoard(e.target.checked);
  if (q('#mux')) q('#mux').onchange=e=>{ D.showMux=e.target.checked; SIM.refresh(); };
  if (q('#pwr')) q('#pwr').onclick=()=>A.power();
  if (q('#rst')) q('#rst').onclick=()=>A.reset();
}
function inspector(t){
  const st=stepAt(t), mm=meterAt(D.meterCh,t), [lo,up]=barWords(mm.bar,mm.dot), c=monContent(), [s,n]=monitored(), tx=txSchedule();
  const cur = tx.bytes.filter(b=>b.t<=t).pop();
  return `<table class="kv">
    <tr><th>Main-loop pass</th><td class="mono">#${st.pass.toLocaleString()} · ${STEPS[st.step][0]}</td></tr>
    <tr><th>mode / screen</th><td class="mono">MODE${D.mode} · ${SCR_NAME[D.screen]}${D.screen_display!==D.screen?' (screen_display '+SCR_NAME[D.screen_display]+')':''}${D.screen===SCR.SETUP?' · '+SETUP_NAME[D.setup]:''}</td></tr>
    <tr><th>source / input</th><td class="mono">${SRC_NAME[D.source]} · input_number ${D.input_number}${D.source===SRC.ASSIGNS?' → '+assignTxt(D.assignment[D.input_number-1]):''} · monitoring ${SRC_NAME[s]} ${n}</td></tr>
    <tr><th>format (from main board)</th><td class="mono">${['NO_LOCK','PCM','DOLBYDIGITAL','DOLBYE'][c.fmt]} — ${c.name}${c.fmt>=2?' · configuration '+c.cfg:''}</td></tr>
    <tr><th>display / pgm</th><td class="mono">${DISP[D.display]} · dialnorm_pgm ${D.dialnorm_pgm}</td></tr>
    <tr><th>preset</th><td class="mono">${D.preset? D.preset+' · '+SEL_NAME[D.preset_selector] : 'none (LoRo)'} · PORTA = 0x${lampByte().toString(16).padStart(2,'0')}</td></tr>
    <tr><th>volume</th><td class="mono">${D.volume} (${volTxt(D.volume).trim()})${D.mute?' MUTED':''} · cal_level ${D.cal_level} (ref ${D.cal_level-61} dBFS)</td></tr>
    <tr><th>UART0 last byte</th><td class="mono">${cur? `“${bstr(cur.b)}” byte ${cur.i} of ${KIND_NAME[tx.frames[cur.frame].kind]} at ${SIM.fmtT(cur.t)}` : '—'}</td></tr>
    <tr><th>CH${D.meterCh+1} meter</th><td class="mono">VU ${mm.vuDb.toFixed(1)} dB → index ${mm.vuIdx} → ${mm.bar} LEDs · PPM ${mm.pkDb.toFixed(1)} dB → index ${mm.pkIdx} → dot ${mm.dot} (${mm.dot?segLabel(mm.dot):'—'})</td></tr>
    <tr><th>shift words</th><td class="mono">lower 0x${lo.toString(16).padStart(8,'0')} · upper 0x${up.toString(16).padStart(4,'0')} · mux slot CH${Math.floor(t/C.MUX_T)%8+1}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__ams82Active = true;
  m.innerHTML = `
  ${card('Front panel at the playhead — the real 2015 CorelDRAW artwork', `<div id="fp"></div>${artNote('front')}${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Rear panel — click an input BNC or Phoenix to change what is plugged in', `<div id="rp"></div>${artNote('rear')}<div id="cs" style="margin-top:8px"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
    <div>${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('Action log', `<div id="log" class="log"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; the transport is at the top)', `<canvas id="tl"></canvas>
     <p class="small muted">The front-panel loop time is ${inf}: the manual says a PRESET must be held “approximately three seconds” and the code counts PRESET_DEBOUNCE = 9000 passes, so one pass ≈ 0.33 ms. The SHARC clock is ${inf} (49.152 MHz): with it, timer 0 (TPERIOD0 = 4) gives exactly the 12.288 MHz master clock and timer 1 (76800) strobes one meter every 1.5625 ms. Click a meter on the panel to follow it here.</p>`)}`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = inspector(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp.d2}” “${e.disp.d3}” / “${e.disp.d1}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  m.querySelector('#cs').innerHTML = contentSelectors(); bindContent(m);
  bindControls(m); bindArt(m);
  SIM.on('time', ()=>{ draw(); const cs=m.querySelector('#cs'); if (cs && !cs.contains(document.activeElement)){ cs.innerHTML=contentSelectors(); bindContent(m); } });
}

/* ---------------- tutorial (manual v2117, Jun 05 2008) ---------------- */
const LESSONS = [
  { title:'Meet the AMS8-2', body:`<p>The AMS8-2 is a 2 RU <b>audio monitor</b>. It shows eight audio channels on eight <b>46-LED bargraphs</b> and plays them through its own speakers. With the optional Dolby decoder it can show and play Dolby E and AC-3 programmes.</p>
     <p>The panel has eight bargraphs with a <b>red reference LED</b> at 0, three 8-character displays, four black <b>INPUTS</b> buttons, four yellow <b>PRESETS</b> buttons, and two push-and-turn knobs: <b>SELECT</b> and <b>VOLUME</b>. White labels are the main functions. Green labels are the second functions used in setup (manual p. 3).</p>
     <p class="muted">The simulated rear has a Dolby E 5.1+2 programme on IN 1, a −20 dBFS tone on IN 2, AC-3 5.1 on IN 3 and stereo programme on IN 4 (75 Ω). Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Read a meter', body:`<p>Each bar shows <b>VU</b> (the solid bar) and <b>PPM</b> (one LED above it) at the same time. The SHARC computes both from the same squared signal with two different time constants. The 0 mark is the calibration level: −20 dBFS out of the box.</p><p><b>Goal:</b> click the CH3 meter (Centre). The timeline will follow it.</p>`, check:()=>D.meterCh===2, hint:'Click the third bar from the left in the meter window.' },
  { title:'2 · Choose an input', body:`<p>In Mode 1 the four INPUTS buttons pick which of the four inputs is decoded and shown. The lamp shows your choice. The lower display shows the bank (75 Ω) and “1-4”, but <i>not</i> the input number (see Findings).</p><p><b>Goal:</b> press <b>3/4</b> to monitor the PCM tone on input 2.</p>`, check:()=>D.mode===1&&D.input_number===2, hint:'Press the 3/4 button (or key 2).' },
  { title:'3 · Read the format', body:`<p>The upper displays show what the main board found: <span class="mono">PCM</span> and <span class="mono">Stereo</span>. For PCM, turning SELECT switches between Stereo and <b>ProLogic</b> decoding (CH1, 2, 3, 5 and 6 light up).</p><p><b>Goal:</b> turn SELECT once so the display reads <span class="mono">ProLogic</span>.</p>`, check:()=>format()===1&&!D.prologic, hint:'Turn SELECT either way (Q or E).' },
  { title:'4 · Dolby metadata', body:`<p>Press <b>1/2</b> for the Dolby E input. The display now shows <span class="mono">E 5.1+2</span> and <span class="mono">DN1 -27</span>: the dialogue normalisation of programme 1. Turn SELECT clockwise to step through <span class="mono">DN2</span>, frame rate and data rate.</p><p><b>Goal:</b> show <span class="mono">DN2 -31</span>.</p>`, check:()=>format()===3&&D.display===1&&D.dialnorm_pgm===2, hint:'Press 1/2, then turn SELECT clockwise once.' },
  { title:'5 · Set the listening level', body:`<p>Turn VOLUME. The lower display shows the gain: <span class="mono">OFF</span>, then −60 dB to +15 dB in 1 dB steps. It starts at the stored set-up level (−31 dB).</p><p><b>Goal:</b> set the volume to <b>−25 dB</b>.</p>`, check:()=>D.volume===36&&!D.mute, hint:'Turn VOLUME clockwise six clicks (P key, or the right side of the knob).' },
  { title:'6 · Mute', body:`<p>Push VOLUME to mute the speakers: the display reads <span class="mono">Mute</span>. Push again, or turn VOLUME, to unmute.</p><p><b>Goal:</b> mute.</p>`, check:()=>D.mute, hint:'Push VOLUME (O key).' },
  { title:'7 · Listen to one channel', body:`<p>Unmute first. In Mode 1 the PRESETS solo channel pairs: A = 1/2, B = 3/4, C = 5/6, D = 7/8. Pressing a preset repeatedly cycles <span class="mono">Ch1 → Ch2 → 1/2 → 1+2 → LoRo</span> (manual p. 14). <b>1+2</b> sums the pair, which is useful for checking phase.</p><p><b>Goal:</b> show <span class="mono">In1 1+2</span> on preset A.</p>`, check:()=>!D.mute&&D.preset==='A'&&D.preset_selector===3, hint:'Press A four times. The first press from the normal screen only selects Ch1.' },
  { title:'8 · Switch bank', body:`<p>Push SELECT to open the source screen (<span class="mono">Input / Select</span>). Then turn SELECT to step through the banks: 75 Ω → 110 Ω → Assigns → Analog. Push SELECT again to go back. (The manual says “push and simultaneously turn”. The code works as push, then turn.)</p><p><b>Goal:</b> select the 110 Ω bank and return to the normal screen.</p>`, check:()=>D.source===SRC.AES110&&D.screen===SCR.INFO, hint:'Push SELECT (W), turn clockwise (E), push SELECT again.' },
  { title:'9 · Open System Setup', body:`<p>Hold <b>1/2</b> and <b>7/8</b> together and push SELECT. The upper left reads <span class="mono">System</span>. The firmware checks that the pushbutton byte equals <span class="mono">0x42</span> (SETUP_SEQUENCE_COUNTER).</p><p><b>Goal:</b> be in System Setup.</p>`, check:()=>D.screen===SCR.SYSTEM||D.screen===SCR.SETUP, hint:'Click “1/2 + 7/8 + SELECT” (or key S), or Shift+click 1/2 and 7/8, then push SELECT.' },
  { title:'10 · Set the meter calibration', body:`<p>Push SELECT on <span class="mono">System</span> to open the settings: <span class="mono">Mode → Ref → Out4 → Dn → Vol → O/P → Cal → Spkr → Exit</span>. Turn SELECT to <span class="mono">Cal</span>. Turn VOLUME to move the 0 mark in 2 dB steps from −22 to −10 dBFS.</p><p><b>Goal:</b> calibrate to <b>−18 dBFS</b> (EBU alignment). Watch the bars: the tone on 110 Ω IN 1 is at −18 dBFS, so it now reaches 0.</p>`, check:()=>D.cal_level===43, hint:'Push SELECT, turn SELECT clockwise six steps to Cal, turn VOLUME clockwise once.' },
  { title:'11 · Save and leave', body:`<p>Turn SELECT to <span class="mono">Exit</span> and push it. This runs SAVE_MODE_IN_EEPROM. You are back on <span class="mono">System</span>. Turn SELECT counter-clockwise to <span class="mono">Exit</span> and push again.</p><p><b>Goal:</b> back to the normal display.</p>`, check:()=>D.screen===SCR.INFO&&D.cal_level===43, hint:'Turn SELECT to “Exit”, push; turn SELECT counter-clockwise once, push.' },
  { title:'12 · Check the firmware', body:`<p>Open System Setup again, turn SELECT to <span class="mono">Firmware</span> and push. The display shows <span class="mono">2.1.2.0</span>: the four REVISION constants at the top of v200w.c.</p><p><b>Goal:</b> read the firmware version.</p>`, check:()=>D.screen===SCR.VERSION&&D.firmware_setup===120, hint:'S, then turn SELECT clockwise three times (System → Inputs → Assigns → Firmware), push SELECT.' },
  { title:'Done', body:`<p>You have used every control on the AMS8-2. The other tabs show the same operations from the inside: <b>Software</b> follows each action through the code, <b>One second</b> breaks the meters down to single samples and multiplex strobes, and <b>Findings</b> lists what the firmware does that the manual does not say.</p><p class="muted">Also try: set System → Mode 2, exit, and hold preset A for 3 s to edit a mix (“A L1 Off”). Click the green-numbered buttons to add channels to the mix and turn VOLUME to set each one’s gain.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__ams82Active = true;
  m.innerHTML = `${card('The unit', `<div id="fp"></div>${controlsHTML()}`)}
    <div class="grid2"><div><div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Tutorial — operating the AMS8-2 (from the v2117 operator manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}</div></div>`;
  const hot = `<g><rect x="887" y="9" width="598" height="661" fill="transparent"><title>Eight 46-segment bargraphs: VU bar + PPM dot, red reference LED at 0, DD and ERR lamps</title></rect>
    <rect x="1638" y="55" width="787" height="97" fill="transparent"><title>Displays 2 and 3: format / configuration and metadata</title></rect>
    <rect x="2058" y="195" width="367" height="97" fill="transparent"><title>Display 1: source, preset, volume</title></rect></g>`;
  const draw=()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;padding:2px 0;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory defaults)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  bindControls(m);
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__ams82Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><label class="small"><input type="checkbox" id="mux" ${D.showMux?'checked':''}> show only the meter that is being strobed at this instant</label><div id="pipe" style="margin-top:8px"></div>`)}</div>
  ${card('Zoom ladder at the playhead — CH'+(D.meterCh+1)+' signal with VU (green) and PPM (orange)', `<canvas id="zl"></canvas>`)}`;
  m.querySelector('#mux').onchange=e=>{ D.showMux=e.target.checked; SIM.refresh(); };
  const draw=()=>{
    const t=SIM.t, df=dolbyFrames(), tx=txSchedule();
    const rows = [
      ['Audio samples per channel', C.FS.toLocaleString(), SIM.fmtDur(1/C.FS), 'FPGA → SHARC SPORT0 TDM, 10 slots; sport0_isr runs VUMeterCalc on all 8'],
      ['SHARC background passes', '≈ '+Math.round(1/C.DSP_MAIN_T).toLocaleString()+' '+inf, SIM.fmtDur(C.DSP_MAIN_T), '16 × VUMeterGet (10·log10 via MathLn) then idle'],
      ['Meter strobes (timer 1)', Math.round(1/C.MUX_T).toLocaleString(), SIM.fmtDur(C.MUX_T), 'shifter: 64 data bits + 64 blanking bits on FLAG0/FLAG1, latch on FLAG2, OE on FLAG3'],
      ['Full meter refreshes', Math.round(1/C.SCAN_T), SIM.fmtDur(C.SCAN_T), 'each of the 8 bars is lit 1/8 of the time'],
      ['Front-panel loop passes', '≈ '+Math.round(1/C.LOOP_T).toLocaleString()+' '+inf, SIM.fmtDur(C.LOOP_T), 'buttons, knobs, display, two UARTs'],
      ['UART0 bytes to the main board', tx.bytes.filter(b=>b.t<1).length, SIM.fmtDur(26*C.LOOP_T), 'one per 26 passes; 9600 baud = '+SIM.fmtDur(C.BYTE_T)+' on the wire'],
      ['UART0 frames', tx.frames.filter(f=>f.t0<1).length, SIM.fmtDur(tx.frames[1]? tx.frames[1].t0-tx.frames[0].t0 : 0), KIND_NAME[kindAt(t)]+' at the playhead'],
      ['Main-board replies', rxFrames().filter(f=>f.t0<1).length+' '+inf, '20 bytes = '+SIM.fmtDur(20*C.BYTE_T), 'format, configuration, dialnorm, mix level, frame/data rate'],
      ['Dolby frames', df? (1/df.period).toFixed(2) : '—', df? SIM.fmtDur(df.period) : '', df? df.name : 'monitored input is not Dolby'],
      ['VU / PPM time constants', '', '', `VU: 40 dB in ${(4/(C.FS*-Math.log10(1-C.TC_VU))).toFixed(2)} s · PPM attack: 40 dB in ${(4e3/(C.FS*-Math.log10(1-C.TC_PPMA))).toFixed(1)} ms · PPM decay: 40 dB in ${(4/(C.FS*-Math.log10(1-C.TC_PPMD))).toFixed(1)} s (vumeter.asm formula)`],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one sample, one front-panel loop pass, one meter strobe or one UART byte at a time.</p>`;
    const st=stepAt(t), n=Math.floor(t*C.FS), slot=Math.floor(t/C.MUX_T)%8, cur=tx.bytes.filter(b=>b.t<=t).pop();
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>ATmega128 (front)</th><td class="mono">pass #${st.pass.toLocaleString()}: ${STEPS[st.step][0]}<br><span class="muted">${STEPS[st.step][2]}</span></td></tr>
      <tr><th>UART0</th><td class="mono">${cur && t-cur.t < C.BYTE_T ? 'shifting “'+bstr(cur.b)+'” out of TXD0 (bit '+Math.floor((t-cur.t)/C.BYTE_T*10)+' of 10)' : 'line idle; transmit_counter0 = '+((st.pass-25)%26+26)%26}</td></tr>
      <tr><th>SHARC</th><td class="mono">sample ${n.toLocaleString()} · ${(t*C.FS%1)<C.ISR_T*C.FS?'in sport0_isr':'background loop'} · mux_count → CH${slot+1} strobed</td></tr>
      <tr><th>CH${D.meterCh+1} sample</th><td class="mono">${meterAt(D.meterCh,t).x.toFixed(5)} FS</td></tr>
      <tr><th>LED board</th><td class="mono">A6276 latches hold CH${slot+1}’s 46 segments; its P-MOSFET high-side switch is on</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const mm=meterAt(D.meterCh,t), [lo,up]=barWords(mm.bar,mm.dot);
    m.querySelector('#pipe').innerHTML = `<table class="kv small"><tr><th colspan="2">CH${D.meterCh+1}: sample → LEDs (vumeter.asm → translate_meter_results → shifter)</th></tr>
      <tr><td>in² smoothed</td><td class="mono">VU ${engine().vu[D.meterCh][Math.min(C.FS-1,n)].toExponential(3)} · PPM ${engine().pk[D.meterCh][Math.min(C.FS-1,n)].toExponential(3)}</td></tr>
      <tr><td>VUMeterGet = −2·10·log10</td><td class="mono">${mm.pv!==undefined?mm.pv.toFixed(1)+' / '+mm.pp.toFixed(1):'255'}</td></tr>
      <tr><td>+ meter_cal (${meterCal()}) [−6 for VU]</td><td class="mono">index ${mm.vuIdx} / ${mm.pkIdx}</td></tr>
      <tr><td>vu_data / vu_data2 lookup</td><td class="mono">bar ${mm.bar} LEDs (to ${mm.bar?segLabel(mm.bar):'—'}) · dot ${mm.dot?segLabel(mm.dot):'—'}</td></tr>
      <tr><td>shift_data words</td><td class="mono">0x${lo.toString(16).padStart(8,'0')} 0x${up.toString(16).padStart(4,'0')}</td></tr></table>`;
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const levels=[['1 second',1],['100 ms',0.1],['1 meter scan (12.5 ms)',C.SCAN_T],['1 front-panel pass',C.LOOP_T],['8 samples',8/C.FS]];
  const H=levels.length*46+10, {c,w}=SIM.canvas(cv,H), m=engine(), ch=D.meterCh;
  const ink=SIM.css('--ink'), grid=SIM.css('--grid'), play=SIM.css('--play'), ink2=SIM.css('--ink2');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*46, t0=Math.max(0,Math.min(1-span,t-span/2)), x0=180, pw=w-x0-10;
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm, 6, y+16); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+30);
    c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,34);
    if (!m.srcs[ch]){ c.fillStyle=ink2; c.fillText('no signal', x0+6, y+22); return; }
    const N=Math.min(900,pw); let peak=1e-6; for (let k=0;k<=N;k++){ const n=Math.min(C.FS-1,Math.floor((t0+span*k/N)*C.FS)); peak=Math.max(peak,Math.abs(m.x[ch][n])); }
    c.strokeStyle=SIM.css('--accent2'); c.beginPath();
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N, n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const yy=y+19-m.x[ch][n]/peak*15; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy); } c.stroke();
    [['vu','#3fbf5f'],['pk','#e8a23a']].forEach(([k2,col])=>{ c.strokeStyle=col; c.beginPath(); for (let k=0;k<=N;k++){ const tt=t0+span*k/N, n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const v=Math.sqrt(m[k2][ch][n])/peak; const yy=y+19-Math.min(1.1,v)*15; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy); } c.stroke(); });
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+38); c.stroke();
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  fp:{x:20,y:20,w:200,h:120,t:'Front panel board (AMS8E-5)',s:['ATmega128 @ 4.9152 MHz','8 lit buttons · 2 encoders','3× 8-char dot-matrix'],d:'v200w.c and friends (ICCAVR 7.15). One polled while(1) loop with no timers. The only interrupt is the UART0 receiver (uart0_rx_isr, vector 19). It reads the buttons on PINB and the encoders on PINE/PINF/PIND, writes button lamps on PORTA, and drives the three displays on PORTC/PORTG. It sends the operator’s choices to the main board over UART0.'},
  disp:{x:12,y:210,w:132,h:70,t:'3× PDSP1884',s:['PORTC data, PORTG','CE1–3 WR RD RST FL'],d:'SIEMENS8-3.c. Display 1 sits above the knobs (source, volume, preset). Displays 2 and 3 are the upper pair (format and metadata). The 2016|49 firmware moved to the HDSP2533 (README, RD62).'},
  mb:{x:290,y:20,w:210,h:120,t:'Main board MCU (AMS8E-1)',s:['ATmega128L (Ams8e-1 firmware)','CS8416 / AD1895, Dolby card link','serial port, GPI'],d:'Separate firmware in the AMS81 tree. It parses the front panel’s “#ABC…$” frames, programs the FPGA and the Dolby decoder, and replies with format, configuration and metadata. The reply layout here is taken from UART0_translate on the front-panel side.'},
  fpga:{x:290,y:200,w:210,h:110,t:'Altera Cyclone FPGA',s:['input routing · non_audio_detector','TDM to/from SHARC','AES outputs'],d:'EP1C6 (Issue 4) / EP4CE40 (Issue 5) per the AMS81 README. It routes the 75 Ω / 110 Ω / analog / SDI inputs, detects Dolby bursts (DD lamps) and frames the audio as 10-slot TDM for SPORT0 and 20 control words for SPORT1. The AMS82 tree has no FPGA design of its own.'},
  dsp:{x:570,y:200,w:200,h:110,t:'ADSP-21065L SHARC',s:['VU + PPM × 8 (vumeter.asm)','monitor mix, volume ramp','meter shifter on FLAG0–3'],d:'ams81_main.asm V205. sport0_isr runs on every sample: float conversion, VUMeterCalc, the output mixes for modes 2, 3 and 4, and translate_meter_results. The background loop reads the meters and ramps the gains. When timer 1 has set ustat2 bit 0, it shifts one meter’s 64 bits out to the LED board.'},
  led:{x:570,y:20,w:200,h:120,t:'LED meter board (AMS8E-10)',s:['5× A6276 16-bit LED sinks','8× FDC634P high-side select','188 G · 99 Y · 108 R LEDs'],d:'From the AMS8-2A BOM. The SHARC’s FLAG0 = data, FLAG1 = clock, FLAG2 = latch, FLAG3 = output enable match the A6276 SDI/CLK/LE/OE pins. sel_1…sel_8 (bits 8–15 of the third word) switch one bar’s high side at a time.'},
  dolby:{x:290,y:350,w:210,h:60,t:'Dolby decoder card (option)',s:['Dolby E / AC-3 → 8 PCM ch','metadata → main board'],d:'“DESIGNED FOR Dolby E” on the rear silk. It decodes the selected input to L R C LFE Ls Rs + 2 aux (manual p. 14) and supplies the metadata shown on displays 2 and 3.'},
  demux:{x:152,y:330,w:132,h:70,t:'DEMUX 4 (option)',s:['UART1 ↔ front panel','SDI groups → AES'],d:'The front panel itself polls this board on UART1 (sdi_check, SDI_BOARD_AVAILABLE 0x08). Reply bits give carrier lock, audio lock and HD/SD.'},
  rear:{x:570,y:350,w:200,h:60,t:'Rear I/O',s:['4 in + 4 out, 75 Ω and 110 Ω','REF, monitor out, AUX 1/2, DB9s'],d:'From AMS82-M2 SILK and the AMS8-AAEM connector layout in the manual. Transformers PE-65612 ×9 on the balanced termination board.'},
};
const WIRES = [['fp','disp','PORTC/PORTG bus'],['fp','mb','UART0 9600 “#…$”'],['mb','fp',''],['demux','fp','UART1'],['mb','fpga','registers'],['fpga','dsp','SPORT0/1 TDM'],['dsp','fpga',''],['dsp','led','FLAG0–3'],['dolby','fpga','PCM'],['mb','dolby',''],['rear','fpga','AES / analog']];
function viewBlock(m){
  window.__ams82Active = false; let sel='dsp';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>Audio enters at the rear and goes through the <b>FPGA</b> (and the Dolby card if fitted) into the <b>SHARC</b> as 10-slot TDM. The SHARC meters every sample and mixes the speaker feed. It also clocks the LED meters itself, one bar at a time. The <b>front-panel ATmega128</b> never sees audio. It turns knob and button actions into ASCII frames for the <b>main-board MCU</b>, and shows the format and metadata the main board sends back.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let labels='', s=`<svg viewBox="0 0 790 430" style="width:100%"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar)"/>`;
      if (l) labels+=`<text x="${(x1+x2)/2}" y="${(y1+y2)/2+(Math.abs(y2-y1)<4?-6:4)}" text-anchor="middle" font-size="10.5" fill="var(--ink2)" stroke="var(--panel)" stroke-width="4" paint-order="stroke">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+labels+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (net-label style, redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · Front-panel MCU', note:'ATmega128 port use from AMS82.c port_init (DDRx/PORTx), SIEMENS8-3.c, common.c and the button masks in v200w.c. Pin-to-connector numbering is not in the source.', svg:()=>
    chip(330,50,200,'ATmega128 (AMS8E-5)',[
      ['PB6','SW 1/2 (0x40)'],['PB5','SW 3/4 (0x20)'],['PB3','SW 5/6 (0x08)'],['PB1','SW 7/8 (0x02)'],['PB7','SW A (0x80)'],['PB4','SW B (0x10)'],['PB2','SW C (0x04)'],['PB0','SW D (0x01)'],
      ['PE2','SELECT push'],['PE3','VOLUME push'],['PF0/PF1','SELECT A/B'],['PD0/PD1','VOLUME A/B'],['PE0/PE1','RXD0/TXD0 ↔ main board'],['PD2/PD3','RXD1/TXD1 ↔ DEMUX'],['PF2/PF3','U16 RX en / U15 TX en'],
    ],[
      ['PA1','lamp 1/2'],['PA2','lamp 3/4'],['PA4','lamp 5/6'],['PA6','lamp 7/8'],['PA0','lamp A'],['PA3','lamp B'],['PA5','lamp C'],['PA7','lamp D'],
      ['PC0…7','DISP D0…D7'],['PG0…2','DISP A0…A2'],['PG3/PG4','DISP A3/A4'],['PE6 / PE7','DISP WR / RD'],['PE5/PE4/PD4','CE1 / CE2 / CE3'],['PD6 / PD7','DISP RST / FL'],['XTAL','4.9152 MHz'],
    ],'ICCAVR 7.15 · v200w.c V2120 · JTAG/ISP') + `<text x="20" y="440" font-size="11" fill="var(--ink2)">Buttons pull PINB low (PORTB = 0xFF pull-ups, READ_SWITCHES inverts). PORTA = OUTPUT_LEDS(input, 0xFF): lamp bits are not the same as switch bits.</text>` },
  { name:'2 · Display bus', note:'Three parallel 8-character displays share data and address; each has its own chip enable. The polarity naming in SIEMENS8-3.c is inverted (SIEMENS_CHIPENABLE sets the pin high with the comment “CE is low”).', svg:()=>{
    let s=''; [['Display 2 (upper left)','CE2 = PE4',60],['Display 3 (upper right)','CE3 = PD4',320],['Display 1 (above knobs)','CE1 = PE5',580]].forEach(([n,ce,x])=>{ s+=chip(x,90,170,'PDSP1884',[['D0…D7','PORTC'],['A0…A2','PG0…2 (char)'],['A3, A4','PG3, PG4'],['WR','PE6'],['RD','PE7'],['CE',ce],['RST','PD6'],['FL','PD7']],[],n); });
    return s+`<text x="60" y="330" font-size="11" fill="var(--ink2)">SIEMENS8_lcd_write_data: PORTG = address | 0xF8; PORTC = char; WR low; NOP; WR high — about 10 cycles per character, no busy wait.</text>
      <text x="60" y="350" font-size="11" fill="var(--ink2)">Control word 0x00 at A4 = 1, A3 = 0 during SIEMENS8_lcd_initialization. Ω is character code 0x12 (OMEGA) in the display ROM.</text>`; } },
  { name:'3 · SHARC and LED meters', note:'Flags, timers and SPORTs from ams81_INIT.ASM. LED board parts from the AMS8-2A BOM. How sel bits reach the MOSFET gates (via 2N4401/2N4403) is inferred.', svg:()=>
    chip(70,60,200,'ADSP-21065L',[['SPORT0 RX/TX','TDM 10 audio slots'],['SPORT1 RX/TX','20 control words'],['TIMER0 PWM','MCLK (TPERIOD0 = 4)'],['TIMER1','mux tick → ustat2 bit 0'],['BMS','AM29LV040B boot (ISS5 BOM)']],
      [['FLAG0','SDI (data)'],['FLAG1','CLK'],['FLAG2','LE (strobe)'],['FLAG3','OE (blank)']],'V205 · VisualDSP++ 3.5')
    + chip(520,60,190,'5× A6276 (chained)',[['SDI','FLAG0'],['CLK','FLAG1'],['LE','FLAG2'],['OE','FLAG3']],[['OUT 0…31','bar LEDs PR…+6'],['OUT 32…45','bar LEDs +7…+20'],['OUT 48…55','sel_1…sel_8']],'LED sink drivers, 80 bits')
    + `<rect x="520" y="300" width="190" height="60" fill="none" stroke="var(--ink)"/><text x="615" y="325" text-anchor="middle" font-size="12" fill="var(--ink)">8× FDC634P high side</text><text x="615" y="343" text-anchor="middle" font-size="10.5" fill="var(--ink2)">2N4401 + 2N4403 drivers ${''}(inferred wiring)</text>
       <text x="70" y="330" font-size="11" fill="var(--ink2)">shifter: 16 bits (bars 32–45) + 32 bits (0–31) + 16 bits (sel) per strobe,</text><text x="70" y="346" font-size="11" fill="var(--ink2)">then 64 zero bits for blanking. One bar every 1.5625 ms (inferred clock).</text>` },
  { name:'4 · Rear connectors', note:'From AMS82-M2 SILK (MAY 07/15) and the AMS8-AAEM connector layout in the v2117 manual. Internal routing beyond the manual’s output table is not traced.', svg:()=>{
    let s=''; const cols=[['REF IN','75 Ω BNC + 110 Ω Phoenix','reference (Int / 75 Ω / 110 Ω)'],['IN 1–4','75 Ω BNC + 110 Ω Phoenix (+ − G)','monitored programme inputs'],['OUT 1–4','75 Ω BNC + 110 Ω Phoenix','PCM: copies of inputs · Dolby: L/R, C/LFE, Ls/Rs, aux'],['MONITOR OUTPUT','2× Phoenix','speaker feed, Var/Fix (O/P setting)'],['AUX 1 / AUX 2','DB25','analog outputs (AMS8E-11 board)'],['DOLBY E METADATA','DB9','RS-485 metadata out (TXA/TXB)'],['SERIAL COMM','DB9','RS-232 “#…$” protocol + GPI 1–4'],['SDI IN 1/2, SDI OUT','BNC (DEMUX option)','embedded audio groups 1–4']];
    cols.forEach((c,i)=>{ const y=40+i*48; s+=`<rect x="40" y="${y}" width="190" height="34" rx="5" fill="var(--panel2)" stroke="var(--ink)"/><text x="50" y="${y+21}" font-size="12" font-weight="700" fill="var(--ink)">${c[0]}</text><line x1="230" y1="${y+17}" x2="300" y2="${y+17}" stroke="var(--ink)"/><text x="306" y="${y+15}" font-size="11" fill="var(--accent2)">${c[1]}</text><text x="306" y="${y+29}" font-size="10.5" fill="var(--ink2)">${c[2]}</text>`; });
    return s; } },
];
function viewSchem(m){
  window.__ams82Active = false; let i=0;
  m.innerHTML = card('Schematic set — redrawn from source pin and net names (not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">No AMS8-2 schematic drawings are in this folder. These sheets are a readable guide built from the firmware’s port assignments, the BOM and the rear silk, so they are only as reliable as those names. Blue labels are nets or signals.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">AMS8-2 · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__ams82Active = true;
  m.innerHTML = `<div class="grid2">${card('Front-panel main loop (main() in v200w.c) — the step running at the playhead is lit', `<div id="flow"></div>`)}
    <div>${card('Screen state machine (screen / screen_display)', `<div id="fsm"></div>`)}${card('Preset selector (MODE1, PRESET_SCREEN)', `<div id="psel"></div>`)}</div></div>
  <div class="grid2">${card('UART0 frame being sent at the playhead (UART0_transmit_counter)', `<div id="frame"></div>`)}${card('How the buttons did things — control → code → wire', `<div id="btn"></div>`)}</div>
  <div class="grid2">${card('SHARC: from sample to LED (ams81_main.asm)', `<div id="dsp"></div>`)}${card('Encoder decoder (PROCESS_SHAFT_ENCODER1, common.c)', `<div id="enc"></div>`)}</div>
  ${card('SHARC control words used (TDM_IN_ctl from the main board)', `<table class="kv small"><tr><th>Word</th><th>Use in ams81_main.asm</th></tr>
    <tr><td class="mono">ctl[0]</td><td>operating mode (compared with 2, 3, 4: mode-2 copies, mode-3 voice-over mono of input 4, mode-4 solo outputs)</td></tr>
    <tr><td class="mono">ctl[10…16]</td><td>7 words × 4 gain bytes → output_gain[0…27] via ams81_volume_table, ramped with RAMP_TC = 0.02 (≈1 ms)</td></tr>
    <tr><td class="mono">ctl[17]</td><td>bits 24–26 → cal_data[] index → meter_cal; low byte ≠ 0 → OUT 4 carries the monitor mix (mode 2)</td></tr>
    <tr><td class="mono">ctl[18]</td><td>mode 4: bit 3 = input 4 selected, bits 0–1 = solo mode; looped back to TDM_OUT_ctl[18]</td></tr>
    <tr><td class="mono">ctl[19]</td><td>looped back unchanged to TDM_OUT_ctl[19] (“control register one loop through from atmel”)</td></tr>
    <tr><td class="mono">out[0]</td><td>0x56323031 = “V201” — the version word the DSP reports (the folder says V205)</td></tr></table>`)}`;
  const draw=()=>{
    const st=stepAt(SIM.t);
    let s=`<svg viewBox="0 0 560 ${STEPS.length*46+92}" style="width:100%"><defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="120" y="4" width="320" height="34" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="280" y="18" text-anchor="middle" font-size="11" fill="var(--ink)">initialization · displays · wait_ms(1500) · RECALL…</text><text x="280" y="32" text-anchor="middle" font-size="10.5" fill="var(--ink2)">while (sdi_check == 0) poll UART1 · DATA_initialization</text>`;
    STEPS.forEach((p,j)=>{ const y=50+j*46, on=st.step===j;
      s+=`<line x1="280" y1="${y-12}" x2="280" y2="${y}" stroke="var(--ink2)" marker-end="url(#a2)"/><rect x="30" y="${y}" width="490" height="34" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="40" y="${y+14}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0].length>66?p[0].slice(0,64)+'…':p[0]}</text><text x="40" y="${y+28}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
    const yb=50+STEPS.length*46; s+=`<path d="M520 ${yb-29} h22 V46 h-22" fill="none" stroke="var(--ink2)" marker-end="url(#a2)"/><text x="40" y="${yb+18}" font-size="11" fill="var(--ink2)">Pass #${st.pass.toLocaleString()} · WDR() 5× per pass keeps the 16K-cycle watchdog (WDTCR = 0x08) fed.</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    // FSM
    const cur = D.screen_display===SCR.VOLUME && D.screen===SCR.INFO ? 'VOLUME' : ({0:'INFO',1:'SOURCE',3:'PRESET',11:'LMIX',12:'RMIX',100:'SYSTEM',101:'SETUP',102:'INPUT',103:'ASSIGN',104:'VERSION'})[D.screen];
    const node=(id,x,y,l,sub)=>{ const on=cur===id; return `<g><rect x="${x-52}" y="${y-18}" width="104" height="36" rx="9" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="1.5"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`; };
    const edge=(x1,y1,x2,y2,l,dy)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#a3)"/><text x="${(x1+x2)/2+3}" y="${(y1+y2)/2+(dy||-3)}" font-size="9.5" fill="var(--ink2)">${l}</text>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 520 300" style="width:100%"><defs><marker id="a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${edge(212,40,148,40,'push SELECT')}${edge(148,52,212,52,'push SELECT',12)}${edge(260,58,260,92,'turn/push VOL')}${edge(320,40,390,40,'PRESET')}${edge(200,58,110,92,'')}
      ${edge(260,128,260,168,'1/2+7/8+SELECT')}${edge(320,190,388,190,'push')}${edge(200,190,138,190,'push')}${edge(260,208,260,238,'push')}${edge(150,265,205,265,'')}
      ${node('SOURCE',100,46,'SOURCE','turn: bank')}${node('INFO',260,46,'INFORMATION','turn: metadata')}${node('PRESET',440,46,'PRESET','A–D cycle')}
      ${node('VOLUME',260,110,'VOLUME','screen_display')}${node('LMIX',90,110,'L/R MIX','MODE2 hold 3 s')}
      ${node('SYSTEM',260,190,'SYSTEM SETUP','System…Exit')}${node('SETUP',440,190,'SETUP','Mode…Spkr')}${node('INPUT',85,190,'INPUTS','Y/N')}
      ${node('ASSIGN',260,256,'ASSIGNS','A1…A4')}${node('VERSION',100,256,'FIRMWARE','2.1.2.0')}
      <text x="10" y="294" font-size="10" fill="var(--ink2)">Now: ${SCR_NAME[D.screen]}${D.screen===SCR.SETUP?' / '+SETUP_NAME[D.setup]:''} · VOLUME/SOURCE/PRESET time out after 10000 passes</text></svg>`;
    const sels=[[0,'Ch 1'],[1,'Ch 2'],[2,'1 / 2'],[3,'1 + 2'],[255,'LoRo (off)']];
    m.querySelector('#psel').innerHTML = `<svg viewBox="0 0 520 70" style="width:100%">${sels.map(([v,l],i)=>{ const on = (D.preset? D.preset_selector===v : v===255); const x=10+i*102;
      return `<rect x="${x}" y="10" width="88" height="34" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+44}" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x+44}" y="39" text-anchor="middle" font-size="8.5" fill="${on?'#eef':'var(--ink2)'}">${v===255?'…_OFF':SEL_NAME[v]}</text>${i<4?`<text x="${x+93}" y="31" font-size="12" fill="var(--ink2)">›</text>`:''}`; }).join('')}
      <text x="10" y="62" font-size="10" fill="var(--ink2)">Each press of the lit preset moves one box right; from LoRo the next press starts again at Ch (the “else” branch). Preset ${D.preset||'—'}.</text></svg>`;
    // frame
    const tx=txSchedule(), t=SIM.t, curB=tx.bytes.filter(b=>b.t<=t).pop(), fr = curB? tx.frames[curB.frame] : tx.frames[0];
    m.querySelector('#frame').innerHTML = `<div class="mono small" style="display:flex;flex-wrap:wrap;gap:3px">${fr.bytes.map((b,i)=>`<span class="chip" style="${curB&&curB.frame===tx.frames.indexOf(fr)&&curB.i===i?'background:var(--warn);color:#000':''}" title="byte ${i}">${bstr(b)}</span>`).join('')}</div>
      <p class="small muted">${KIND_NAME[fr.kind]}. Letters are ASCII; <span class="mono">\\n</span> marks a raw binary byte (volume digits are sent as 0–9, not '0'–'9'). GENERAL_COM: A/B/C request lock, configuration and the dialnorm of programme <span class="mono">${D.dialnorm_pgm}</span>; E source + input; F volume (“FFF” when muted); G preset + selector; P ProLogic; V voice-over; X extended-metadata request. The 2004|37 protocol document lists J as “speaker mute” and Z as “bootloader”; this firmware sends J for the left mix and uses Z inside SETUP_COM for the Out 4 setting.</p>
      <p class="small muted">Reply frames are parsed by UART0_translate only when they start “A f B c C”. A frame whose 7th byte (programme) does not match command3 leaves the dialnorm unchanged.</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv small"><tr><th>Operator</th><th>Firmware path</th><th>What goes out</th></tr>
      <tr><td>INPUTS 1/2…7/8</td><td class="mono">PROCESS_PUSHBUTTONS → TRANSLATE_PUSHBUTTONS → SOURCE_CHANGE</td><td>E src in · PORTA lamp</td></tr>
      <tr><td>PRESETS A–D</td><td class="mono">TRANSLATE_PUSHBUTTONS → preset_selector → PROCESS_PRESET_SOURCES</td><td>G preset selector → SHARC speaker routing</td></tr>
      <tr><td>Turn SELECT</td><td class="mono">PROCESS_SHAFT_ENCODER1 → LEFT_ENCODER_UPDATE → PROCESS_INFORMATION_INCREMENT</td><td>C programme (command3), X request</td></tr>
      <tr><td>Push SELECT</td><td class="mono">SWITCH_ENCODER1 → TRANSLATE_ENCODER1</td><td>screen change; EEPROM on Exit</td></tr>
      <tr><td>Turn VOLUME</td><td class="mono">PROCESS_SHAFT_ENCODER2 → RIGHT_ENCODER_UPDATE → PROCESS_VOLUME_INFORMATION</td><td>VOLUME_COM “#F h t o E s i $”</td></tr>
      <tr><td>Push VOLUME</td><td class="mono">SWITCH_ENCODER2 → TRANSLATE_ENCODER2 (mute, mute_level)</td><td>F “FFF”</td></tr>
      <tr><td>1/2+7/8+SELECT</td><td class="mono">TRANSLATE_ENCODER1: pushbuttons == 0x42</td><td>—</td></tr>
      <tr><td>Hold preset 3 s (MODE2)</td><td class="mono">TRANSLATE_SWITCHES: preset_counter → PRESET_DEBOUNCE</td><td>J / H mix frames</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    const mm=meterAt(D.meterCh,SIM.t);
    const box=(x,y,w,t1,t2,on)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w/2}" y="${y+17}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${t1}</text><text x="${x+w/2}" y="${y+31}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${t2}</text>`;
    const inIsr = (SIM.t*C.FS%1) < C.ISR_T*C.FS;
    m.querySelector('#dsp').innerHTML = `<svg viewBox="0 0 520 172" style="width:100%">
      <text x="6" y="14" font-size="11" font-weight="700" fill="var(--ink)">sport0_isr — every sample (${SIM.fmtDur(1/C.FS)})</text>
      ${box(6,22,120,'TDM in → float','×2⁻²³, 10 slots',inIsr)}${box(134,22,120,'VUMeterCalc','in², VU, PPM ×8',inIsr)}${box(262,22,120,'mixes','AES outs, speakers',inIsr)}${box(390,22,124,'translate_meter_','results → shift_data',inIsr)}
      <text x="6" y="88" font-size="11" font-weight="700" fill="var(--ink)">main — background</text>
      ${box(6,96,120,'VUMeterGet ×16','−2·10·log10 + cal',!inIsr)}${box(134,96,120,'idle','wait for an IRQ',false)}${box(262,96,120,'shifter','if ustat2 bit 0',Math.floor(SIM.t/C.MUX_T)!==Math.floor((SIM.t-30e-6)/C.MUX_T))}${box(390,96,124,'gain ramp + ctl','RAMP_TC 0.02',!inIsr)}
      <text x="6" y="164" font-size="11" fill="var(--ink2)">CH${D.meterCh+1} now: VU ${mm.vuDb.toFixed(1)} dBFS (index ${mm.vuIdx}) → ${mm.bar} LEDs · PPM ${mm.pkDb.toFixed(1)} dBFS (index ${mm.pkIdx}) → dot at ${mm.dot?segLabel(mm.dot):'—'}</text>
</svg><ul class="small muted" style="margin:4px 0 0;padding-left:18px"><li>Peak dot = vu_data[pk] XOR (vu_data[pk] &lt;&lt; 1): only the top edge of the peak bar is kept, then ORed onto the VU bar.</li><li>PhaseMeterGet reads the phase meter, but PhaseMeterCalc is commented out and the result is never shown.</li><li>The timer 1 ISR only sets ustat2 bit 0. The shift itself happens in the main loop, up to one background pass later (jitter ${inf}).</li><li>sin2400table, trim and halfdb are loaded at boot and never used: leftovers from the AMS8-1 build.</li></ul>`;
    const rows=[0,4,8,12,16,20,24,28];
    m.querySelector('#enc').innerHTML = `<table class="kv small mono"><tr><th>state</th><th>pins 00</th><th>01</th><th>10</th><th>11</th></tr>${rows.map(r=>`<tr style="${D.encState[0]===r?'background:color-mix(in srgb,var(--accent) 22%,transparent)':''}"><td>${r}</td>${[0,1,2,3].map(p=>{ const c=r+p, n=c<31?ENC_NEXT[c]:28; return `<td>${n}${c===2?' <b>UP</b>':c===17?' <b>DOWN</b>':''}</td>`; }).join('')}</tr>`).join('')}</table>
      <p class="small muted">switch (encoder_state1 + shaft) — the state is a multiple of 4, so state + pins indexes one case. UP fires on case 2, DOWN on case 17. SELECT is now in state ${D.encState[0]}, VOLUME in state ${D.encState[1]}. With the detent resting at 11 (PORTF pull-ups ${inf}), both directions count every detent. If it rested at 00, the first detent after a reversal would be lost.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__ams82Active = false;
  m.innerHTML = card('What the AMS8-2 firmware is up to — findings from the source', `
  <ol>
    <li><b>Artwork ${SIM.year(2026)}: front and rear panels now from ${SIM.src(ART.FRONT,'AMS82-FRONT-SILK (CURVE).cdr')} (OCT.20/15) and ${SIM.src(ART.REAR,'AMS82-M2 SILK (CURVE).cdr')} (MAY 07/15).</b> The vector art shows things the photos do not: (a) the 2015 front has <i>hexagonal</i> vent holes either side and below the buttons, while ${SIM.src('AMS82 - #Master/AMS82 - #ARTWORK #DA #2016/AMS8-2A Series Front.jpg','AMS8-2A Series Front.jpg')} shows the earlier slotted vents, so the photo is an older issue; (b) the 1–8 preset numbers under the buttons are on the GREEN plate and the INPUTS / PRESETS / SELECT / VOLUME words on the WHITE plate, exactly as the photo; (c) the rear top row is legended SDI IN 1 / 2, SDI OUT, COMP, G/Y, B/Pr, R/Pb, but those seven holes are empty in ${SIM.src('AMS82 - #Master/AMS82 - #ARTWORK #DA #2016/AMS8-2AAM (Demux 4).jpg','AMS8-2AAM (Demux 4).jpg')}: the SDI board that was built sits on the centre plate instead (SDI IN 1/2, SDI OUT, AES OUT 1/2). The top row is an unbuilt SDI + component-video variant, and nothing in V2120 handles component video; (d) the .cdr has drill crosshairs on every screw and on the IN 1, OUT 4 and SDI IN 1 / R/Pb holes, and two ⚠ marks (mains and the AUX 1 “PLEASE REFER TO MANUAL”). An older 2014 sheet, ${SIM.src('AMS82 - #Master/AMS82 #Engineering/AMS82 #SILK/AMS82-1M1-CURVE.cdr','AMS82-1M1-CURVE.cdr')}, also exists.</li>
    <li><b>Dialnorm −1 to −9 all read “−1”.</b> In <span class="mono">PROCESS_DIALNORM_INFORMATION</span> (v200w.c), <span class="mono">case 1:</span> to <span class="mono">case 9:</span> all write <span class="mono">NO1</span> into the digit position, a copy-paste slip. Every Ams8e-5 version in the archive, from v1009 to V040001 and the c104/c106 customs, has the same code. Real programmes rarely carry a dialnorm above −10, which may be why nobody noticed. Set 75 Ω IN 4 to “AC-3 2/0, dialnorm −5” to see it.</li>
    <li><b>The metadata menu stops at Bit Depth when turning clockwise.</b> <span class="mono">PROCESS_INFORMATION_INCREMENT</span> goes DIALNORM → FRAMERATE → DATARATE → BITDEPTH, but it has no <span class="mono">display == BITDEPTH</span> branch. The knob then does nothing. Sample rate, bitstream mode, centre/surround mix, RF, mix level, room type, original bitstream and copyright can only be reached by turning counter-clockwise from Dialnorm. The manual (p. 17) describes Dn, Mx, Fr and Dr in clockwise order.</li>
    <li><b>Mode 3 cannot be chosen.</b> The manual says “Mode X, where X is 1, 2, 3 or 4”. <span class="mono">RIGHT_ENCODER_UPDATE</span> on MODE_SCREEN jumps from MODE2 straight to MODE4 and back (<span class="mono">MODE_MAX = MODE4</span>), so Mode 3 never appears. Mode 5 exists in <span class="mono">mode5.c</span> but is unreachable too.</li>
    <li><b>Dim and Monitor screens are built but hidden.</b> <span class="mono">setup_max = SPEAKER_SCREEN</span> (253), so MONITOR_SCREEN (254) and DIM_SCREEN (255) are never reached. Their handlers, strings (“Mon  Spk”, “Dm … dB”) and the dim value in SETUP_COM are still there. DIM_SCREEN and FAVOURITE_SCREEN even share the value 255.</li>
    <li><b>Volume acceleration is dead code.</b> <span class="mono">RIGHT_ENCODER_UPDATE</span> has a <span class="mono">LARGE_change == YES</span> branch that jumps 3 dB per click (LARGE_INCREMENT). <span class="mono">LARGE_change</span> is declared in common.c and never set, together with FINE_counter and encoder_state2_large. Volume always moves 1 dB per click.</li>
    <li><b>The info screen does not show the input number.</b> <span class="mono">PROCESS_INPUT_SOURCES</span> has the “In1…In4” code commented out, so the lower display reads “ 75Ω 1-4” whichever input is selected. Only the button lamp shows it. The manual’s “75Ω LoRo means input #1” describes the source screen string (line2), which is a fixed text.</li>
    <li><b>“Push and simultaneously turn SELECT”.</b> The manual says this changes the bank. The code works as two separate steps: a push opens SOURCE_SCREEN (TRANSLATE_ENCODER1), then turning steps the bank (PROCESS_SOURCE_INCREMENT). Turning SELECT on the normal screen changes the metadata view instead.</li>
    <li><b>Leaving a preset mix is a plain push, not “push and hold”.</b> Manual p. 11 says “To exit the PRESET mode, push and hold the SELECT knob”. On RIGHT_MIX_SCREEN, TRANSLATE_ENCODER1 exits on the first push. If anything changed it first calls SAVE_MIX_IN_EEPROM, shows “SAVED” and runs <span class="mono">wait_ms(500)</span>, which freezes buttons, knobs and both UARTs for half a second.</li>
    <li><b>System Setup is a hidden chord.</b> Holding 1/2 and 7/8 makes <span class="mono">pushbuttons == SETUP_SEQUENCE_COUNTER (0x42)</span> at the moment SELECT is pushed. The first of the two buttons is still acted on as a normal press, so entering setup always selects input 1 (or 4) as a side effect.</li>
    <li><b>A broken helper that is never called.</b> <span class="mono">RECALL(offset)</span> reads <span class="mono">EEPROMread(offset+index)</span> with <span class="mono">index</span> starting at <span class="mono">offset</span> (it reads 2×offset…), and returns <span class="mono">data1[CHANNELS]</span>, one past the end of an 8-byte local array. Nothing calls it. <span class="mono">RECALL_MIX_FROM_EEPROM</span> does the real work.</li>
    <li><b>The UART0 “No Com” watchdog is never run.</b> <span class="mono">UART0_com_check()</span> would show “ No Com ” if the main board went silent, but <span class="mono">main()</span> only calls <span class="mono">UART1_com_check()</span>. If the main board stops answering, the front panel keeps showing the last format. <span class="mono">UART0_receive</span> and <span class="mono">UART0_receive_buffer</span> are also unused, because the RX interrupt (uart0_rx_isr) fills the ring buffer.</li>
    <li><b>A receive error freezes the panel.</b> A framing or overrun error makes <span class="mono">UART1_RX_RESET</span> run <span class="mono">wait_ms(500)</span>, a busy wait with WDR() inside, so the watchdog does not reset it. During that time the front panel ignores the knobs. UART0_RX_RESET does the same but is unused.</li>
    <li><b>Booting without a DEMUX board takes a while.</b> <span class="mono">main()</span> spins in <span class="mono">while (sdi_check == 0)</span>. With no board, each of the 10 polls waits for <span class="mono">UART1_com_check</span> to count 16000 passes of that small loop before it retries. Only then does <span class="mono">DATA_initialization</span> run.</li>
    <li><b>Protocol drift.</b> The 2004|37 protocol document lists G = mix channel, H = mix gain, J = speaker mute and Z = bootloader. V2120 sends J/H as whole left/right mix frames, puts the preset in G, and uses Z inside SETUP_COM for the Out 4 setting. Volume digits go out as raw bytes 0–9, not ASCII. It also adds P, V, X, L, M, O, N, Y, Q, none of which are documented.</li>
    <li><b>Stale version marks.</b> The DSP writes <span class="mono">0x56323031 = “V201”</span> to TDM_OUT_ctl[0] and has <span class="mono">#define version 'V101'</span>, but the folder is V205. The V205 change is the April 24, 2009|42 <span class="mono">mux_count</span> mask. The SHARC header still reads “AM#82 … DSB March 7,2002”. On the Atmel side, <span class="mono">InputDis[]</span> is initialised to the version string and then overwritten. SIEMENS8-3.c calls the display “the OPTREX LCD”, and <span class="mono">meter_cal = −6 // −6 = −20dBFS</span> disagrees with <span class="mono">cal_data[]</span>, where 0 is −20 dBFS.</li>
    <li><b>Peak dot logic.</b> <span class="mono">translate_meter_results</span> computes the dot as <span class="mono">x XOR (x &lt;&lt; 1)</span> on the bar pattern. Only the top edge of the PPM bar is kept and ORed onto the VU bar, which gives one bar plus a floating dot from one table pair. The lower-word dot is skipped when the peak index is 26 or less, because the dot is then in the upper 14 LEDs.</li>
    <li><b>Phase meter, sine and trim tables are idle.</b> <span class="mono">PhaseMeterGet</span> runs on the even channels every pass, but <span class="mono">PhaseMeterCalc</span> is commented out (“no phase in ams81”). <span class="mono">sin_table[2400]</span>, <span class="mono">trim[]</span> and <span class="mono">halfdb_data[]</span> are loaded and never read.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Front-panel loop ≈ 0.333 ms per pass ${inf}: the manual’s “approximately three seconds” hold = PRESET_DEBOUNCE 9000 passes. This sets the UART byte spacing (26 passes), the debounce (≈85 ms) and the 3.3 s screen timeout.</li>
    <li>SHARC core 49.152 MHz ${inf} (timer 0 period 4 → 12.288 MHz = 256 × 48 kHz). The sysdef.h template says 60 MHz. With 60 MHz the meter scan would be 10.2 ms instead of 12.5 ms.</li>
    <li>The main board’s reply cadence and layout come from UART0_translate on the receiving side ${inf}. The main board’s own firmware (AMS81 tree) was not simulated.</li>
    <li>Calibration path: cal_level (front) → Y bytes → main board → TDM_IN_ctl[17] → cal_data[(cal_level−39)/2] ${inf}. The values agree: each 2 dB step is 4 meter indices.</li>
    <li>LED colours 23 green / 12 yellow / 11 red per bar ${inf} from the BOM totals (188 G, 99 Y, 108 R). The DD/ERR lamp drive is not in the AMS82 source.</li>
    <li>Signals (tones, “programme” noise with a speech-like envelope, Dolby metadata values) are invented test material. The meter maths applied to them is the real recursion and the real tables.</li>
    <li>Extended metadata strings beyond Dialnorm, Frame rate, Data rate, Bit depth, Sample rate, Bitstream mode and Room type are shown with the manual’s abbreviations.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>AMS82 - #Master/AMS82 #Engineering/AMS82 #Software/AMS82 #Software #Atmel/AMS82 #Software #Ams8e-5/AMS82 #Software #Ams8e-5 #V2120/: v200w.c, common.c, control.c, settings.c, SIEMENS8-3.c, AMS82.c, AMS82.h</li>
    <li>…/AMS82 #Software #Sharc/AMS82 #Software #Sharc #AMS82V205/: ams81_main.asm, vumeter.asm, vumeter.h, ams81_INIT.ASM, ams81_ISR_table.ASM, ams82_vu_data1.dat, ams82_vu_data2.dat, ams81_volume_table.dat</li>
    <li>…/AMS82 #Manual/Complete Manual/AMS82-AAEM Operators Instructions version 2117.pdf · …/AMS8 #software COMMUNICATION PROTOCOL.doc</li>
    <li>AMS82 - #Mechanical #DA #2016/AMS8-2A BOM.pdf · ${SIM.src(ART.FRONT,'AMS82-FRONT-SILK (CURVE).cdr')}, ${SIM.src(ART.REAR,'AMS82-M2 SILK (CURVE).cdr')} (panel artwork, assets/ams82-front.svg, ams82-rear.svg), AMS8-2A Series Front.jpg, AMS8-2AAM (Demux 4).jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'ams82', name:'AMS8-2 · 8-channel audio monitor (2009|42)', duration:1,
  product:'AMS8-2', year:2009, family:'AMS8 audio monitors', folder:'AMS82 - #Master',
  summary:'2 RU eight-channel audio monitor: eight 46-LED VU/PPM bargraphs, three 8-character displays, Dolby E / AC-3 metadata, speaker presets. A front-panel ATmega128 runs the menus and an ASCII UART link. An ADSP-21065L SHARC meters every sample and strobes the LED bars itself.',
  highlights:['Front and rear panels on the real 2015 silkscreen','12-step operator tutorial from the v2117 manual','Real VU/PPM recursion and LED tables, down to the shift-register word','UART0 frames byte by byte','Dialnorm −1…−9 display bug in every firmware version'],
  depth:'Full model',
  stepUnits:[
    {label:'1 audio sample (48 kHz)', period:()=>1/C.FS},
    {label:'1 front-panel loop pass', period:()=>C.LOOP_T},
    {label:'1 meter strobe (1.5625 ms)', period:()=>C.MUX_T},
    {label:'1 UART byte slot (26 passes)', period:()=>26*C.LOOP_T, phase:()=>25*C.LOOP_T},
    {label:'1 meter scan (12.5 ms)', period:()=>C.SCAN_T},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (UART frames)'],[0.05,'50 ms'],[C.SCAN_T,'12.5 ms (meter scan)'],[C.MUX_T*2,'3.1 ms (strobes)'],[0.001,'1 ms (loop passes)'],[0.0002,'200 µs (samples)']],
  defaultZoom:1,
  init(){ MKEY=''; TXKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the AMS8-2', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
