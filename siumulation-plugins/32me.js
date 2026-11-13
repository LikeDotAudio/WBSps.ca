/* =====================================================================
   32ME — 32-meter MADI / AES / network audio monitor (Ward-Beck Systems, 2012|45–2016|49)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The 32ME folders (32ME-N, 32ME-MADI, xxx-OBSOLETE/obsolete 32ME PCB_s) are integration notes for the
   two plug-in audio modules. The product they plug into was developed as RD22 (and RD24); its
   released firmware set and board files are used here for the meters, the menus and the board.
   Sources used (all in this archive):
   - 32ME-MADI/ClockDescription.txt, i64_MADI_OEM_Pin_Assignment_20120509.pdf, i64_MADI_Measures.pdf
   - 32ME-N/unet-standard-Parameters.xlsx, unet-standard-to-ams81-connection.xlsx, unet.jpg, AMS8e-1.jpg
   - 32ME - #Master/obsolete 32ME PCB_s/32ME-5iss1-BOM.xls, HardwareChangesRequired.txt
   - XXX - ENGINEERING - 2016 RD FILES/RD24 - 32 channel audio monitor/PCB/32ME-5iss2/
       Exported 32ME-5iss2.Net (netlist) and 32ME-5iss2.pdf (4-sheet schematic, 01/08/2014)
   - XXX - ENGINEERING - 2016 RD FILES/RD22-MADI/
       Hardware/i64MADI/smux1x4_i2sx32.v, ObservationsClockTable.xlsx
       Software/01AV0200 firmware package/ (notes, SHARC v050000 vumeter.asm, ams81_main.asm,
         ams81_INIT.ASM, ams81_vu_data.dat, ams81_pk_data.dat; Atmel Front Panel V010200
         RotaryEncoder.c, Main.c, AMS8-5.c, common.c, TimerLib.h)
       MECHANICAL/OBSOLETE/PrototypeV1_obsOct182012/32ME-FRONTPANEL FINAL.pdf  (panel artwork)
       SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr (rear legends, text only)
   - AMS8E - #Master/AMS8E-4 - #Master (meter board BOM, Gerbers), AMS8E-1 ISS5 - ALTIUM.csv
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const FS = 48000;

/* ---------------- constants from the source ---------------- */
const K = {
  kVU: 0.000319752,          // vumeter.asm TCONST_VU
  kA: 0.02276277,            // TCONST_PPM_ATTACK
  kD: 0.000031978,           // TCONST_PPM_DECAY
  VU_CORR: -6,               // ams81_main.asm r13 = -6 "3db correction offset" (index units of 0.5 dB)
  CORE: 49.152e6,            // ADSP-21065L core: CLKIN 24.576 MHz (X1) x2; timer0 period 2 = "24 MHz" MCLK confirms it
  TPERIOD1: 12000,           // ams81_INIT.ASM timer 1 "mux rate"
  RAMP: 0.009999,            // RAMPTIMECONST (volume ramp per sample)
  MCK: 256*FS,               // i64 bit clock 256FS (ClockDescription.txt)
  SCLK: 64*FS,               // smux1x4_i2sx32.v: mclk/4
  AVR_XTAL: 4.9152e6,        // 32ME-5 X2 (BOM and netlist)
  PTP_SYNC: 1, PTP_ANN: 2,   // uNet LogSyncInterval 0 → 2^0 s, LogAnnounceInterval 1 → 2^1 s
  RTP_PKT: 48/FS,            // SamplesPerPacket1xFS 48 → 1 ms
  PLAYOUT: 512/FS,           // User_PlayoutDelay 512 samples → 10.67 ms
  HOLD: 1.0, ROT_TO: 3.0, IDLE_TO: 10.0,  // ROTENCHOLDTIME / ROTENCROTATETIMEOUT / ROTENCTIMEOUTTIME (0.5 s ticks)
};
K.MUX = K.TPERIOD1 / K.CORE;                     // 244.14 µs per shifter call
const tFor = k => -4/(FS*Math.log10(1-k));       // vumeter.asm: tconst = 1 - 10^(-40/(10·time·FS))
K.tVU = tFor(K.kVU); K.tA = tFor(K.kA); K.tD = tFor(K.kD);

/* LED segment scale (ams81_vu_data.dat / ams81_pk_data.dat): index = meter value 0..255, dB = -value/2 */
const SEG = [ // [first table index that lights this segment, label] ; 22 segments, bottom → top
  [114,'-36'],[94,'-26'],[82,'-20'],[74,'-16'],[64,'-12'],[60,'-10'],[56,'-8'],[52,'-6'],[48,'-4'],[46,'-3'],[44,'-2'],[42,'-1'],
  [40,'0'],[38,'+1'],[36,'+2'],[34,'+3'],[32,'+4'],[28,'+6'],[24,'+8'],[20,'+10'],[16,'+12'],[12,'+14']];
// colour per segment: 10 green, 8 yellow, 4 red (AMS8E-4 FINAL BOM per-bar counts); order bottom→top inferred
const SEGCOL = i => i<10? '#36d05a' : i<18? '#ffd23a' : '#ff3b2f';
function litSegs(v){ let n=0; for (let i=0;i<22;i++) if (v<=SEG[i][0]) n=i+1; return v>=115? 0 : n; }

const SR_TXT = ['30-50k','60-100k','120-200k'];            // CURRENTSAMPLERATE 0..2 ("30-50" from RotaryEncoder.c; others inferred)
const MENU = {1:' Volume ',2:'Mon Sel ',3:'Grp Sel ',4:' SR Sel ',5:' Source '};   // Main.c title strings
const MENU_ID = {1:'ROTARYENCODER_VOLUME_STATE',2:'ROTARYENCODER_PAIRSELECTOR_STATE',3:'ROTARYENCODER_GROUPSELECTOR_STATE',4:'ROTARYENCODER_SAMPLERATESELECTOR_STATE',5:'ROTARYENCODER_SOURCESELECTOR_STATE'};
const PROGS = {lineup:'Line-up: 1 kHz, −20 dBFS on every channel', stair:'Channel ident: a level staircase across channels',
  burst:'PPM test: 10 ms bursts at −8 dBFS every 250 ms', prog:'Programme-like: speech envelopes (deterministic)'};

/* ---------------- device state ---------------- */
const D = {
  madiCard: true,           // i64 MADI OEM module fitted on H4 (madi_present)
  unet: false,              // 32ME-N: Archwave uNet2500 wired to H4 instead
  madiIn: true,             // MADI coax signal present
  madiRate: 48,             // MADI source audio rate (kHz): 48 / 96 / 192
  aux56: false,             // i64 Aux 1-2 jumper → 56-channel mode
  aux96f: false,            // Aux 3-4 → 96k frame
  source: 1,                // currentSource: 0 AES, 1 MADI
  sr: 0,                    // currentSampleRate 0..2 (SR Sel)
  group: 0,                 // currentGroup: 0 = 1–32, 1 = 33–64
  pair: 0,                  // currentPair 0..30 step 2 (Mon Sel)
  vol: 41,                  // volume_setup_level 0 (Mute) .. 61 (0 dB) .. 76 (+15 dB)
  menu: 1,                  // rotaryEncoder_currentstate
  showValue: false,         // after a rotation the value shows for ROTENCROTATETIMEOUT
  prog: 'lineup', trim: 0,  // test programme and level trim (dB)
  scopeMeter: 0,            // meter shown in the timeline / scope
  phones: true,
  log: [],
};

/* ---------------- routing: which source channel each meter shows ---------------- */
function factorIn(){ return D.madiRate===48?1:D.madiRate===96?2:4; }
function factorSet(){ return [1,2,4][D.sr]; }
function madiActiveCh(){ return D.unet? 16 : D.aux56? 56 : 64; }
function srcChannelFor(m){ // returns {ch (1-based) or null, avg:[...], note}
  if (D.source===0 || (!D.madiCard && !D.unet)) return {ch: m<32? m+1 : null, src:'AES', note:`AES ${(m>>1)+1} ${m%2?'B':'A'}`};
  if (D.unet){ // uNet streams land on two serial lines (SDOUT0/1); slot numbers inferred
    const ch = m<16? 33+m : null;   // H4 pins 26/28 = DATA5/6_IN_I64 (IPC netlist) return {ch, src:'uNet', note: ch? `uNet in ${m+1} → MADI slot ${ch}` : 'no uNet channel'};
  }
  const fi=factorIn(), fs=factorSet();
  if (fi===fs){ const per = 64/fi; const base = fi===1? 32*D.group : 0; const ch = base+m+1; return {ch: ch<=per? ch : null, src:'MADI', note:`MADI ch ${ch}${fi>1?' ('+D.madiRate+'k, SMUX'+fi+')':''}`}; }
  if (fs<fi){ const r=fi/fs, ch = Math.floor((m+32*D.group)/r)+1; return {ch, src:'MADI', dup:r, phase:m%r, note:`sample ${m%r+1} of ch ${Math.floor(ch)} (doubled ×${r})`}; }
  const r=fs/fi, nMet = Math.min(32, 64/r); if (m>=nMet) return {ch:null, src:'MADI', note:'meter not used at this rate'};
  const avg=[]; for (let i=0;i<r;i++) avg.push(m*r+i+1); return {ch:avg[0], avg, src:'MADI', note:`average of ch ${avg[0]}–${avg[avg.length-1]}`};
}
function chActive(ch){ if (ch==null) return false; if (D.source===0 || (!D.madiCard&&!D.unet)) return ch<=32; if (!D.madiIn && !D.unet) return false; return D.unet? ch>=33&&ch<=48 : ch<=madiActiveCh(); }

/* deterministic per-channel programme */
function hash(n){ let x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); }
function chLevelDb(ch){ if (D.prog==='stair') return -44 + ((ch-1)%16)*3.5 + D.trim; return (D.prog==='burst'? -8 : -20) + D.trim; }
function chFreq(ch){ return D.prog==='prog'? 180+hash(ch)*900 : 1000; }
function envelope(ch, t){
  if (D.prog==='burst'){ const ph=(t+0.05)%0.25; return ph<0.010? 1 : 0; }
  if (D.prog==='prog'){ const a=hash(ch*7.1), b=hash(ch*3.3); const s=0.5+0.5*Math.sin(2*Math.PI*(1.7+a*2.5)*t+b*6); const w=0.5+0.5*Math.sin(2*Math.PI*(0.37+b)*t+a*4); return Math.pow(s*w,1.6); }
  return 1;
}
function sampleOf(ch, n){ if (!chActive(ch)) return 0; const t=n/FS; const A=Math.pow(10,chLevelDb(ch)/20); return A*envelope(ch,t)*Math.sin(2*Math.PI*chFreq(ch)*t + ch*0.37); }

/* ---------------- the meters over one second: vumeter.asm run per sample ---------------- */
let MT=null, MKEY='';
function meters(){
  const key=JSON.stringify([D.madiCard,D.unet,D.madiIn,D.madiRate,D.aux56,D.source,D.sr,D.group,D.prog,D.trim]);
  if (key===MKEY) return MT; MKEY=key;
  const N=1000, step=FS/N; const vu=[], pk=[], src=[];
  for (let m=0;m<32;m++){
    const s=srcChannelFor(m); src.push(s);
    const v=new Uint8Array(N), p=new Uint8Array(N); let VU=0, PP=0;
    const chs = (s.avg? s.avg : [s.ch]).filter(c=>chActive(c)), nc=(s.avg? s.avg.length:1);
    const P = chs.map(c=>({c, A:Math.pow(10,chLevelDb(c)/20)/nc, w:2*Math.PI*chFreq(c)/FS, ph:c*0.37}));
    const flat = D.prog==='lineup'||D.prog==='stair';
    for (let n=0;n<FS;n++){
      let x=0; for (const q of P) x += q.A*(flat?1:envelope(q.c,n/FS))*Math.sin(q.w*n+q.ph);
      const x2=x*x;
      VU += (x2-VU)*K.kVU;                               // VU = VU + (in² − VU)·Tvu
      const pa = PP + (x2-PP)*K.kA, pd = PP + (x2-PP)*K.kD; // PPMA / PPMD
      PP = Math.max(pa,pd);                              // PPM = max(PPMA, PPMD)
      if ((n+1)%step===0){ const i=(n+1)/step-1;
        const vdb = VU>1e-13? 10*Math.log10(VU) : -130, pdb = PP>1e-13? 10*Math.log10(PP) : -130;
        v[i] = Math.max(0,Math.min(255, Math.round(-2*vdb) + K.VU_CORR));  // VUMeterGet → 0..255, +3 dB correction
        p[i] = Math.max(0,Math.min(255, Math.round(-2*pdb)));
      }
    }
    vu.push(v); pk.push(p);
  }
  MT={vu,pk,src,N}; return MT;
}
function meterAt(m,t){ const M=meters(); const i=Math.max(0,Math.min(M.N-1,Math.floor(t*M.N))); return {vu:M.vu[m][i], pk:M.pk[m][i]}; }

/* LED board multiplex (ams81_main.asm shifter): mux_count2 0..15 → disp_group (board) = bits 3..2, mux_count (pair) = bits 1..0 */
function muxAt(t){ const k=Math.floor(t/K.MUX); const c=k&15; return {k, board:(c>>2)&3, pair:c&3, t0:k*K.MUX}; }
/* madiChanNotActive → ERR LED per pair (one red per pair, written on the left channel's word) */
function pairErr(m){ const s=srcChannelFor(m&~1); return D.source===1 && (D.madiCard||D.unet) && !chActive(s.ch); }

/* the 32-bit shift_data word for one meter (translate_meter_results) */
function shiftWord(m,t){
  const r=meterAt(m,t), nv=litSegs(r.vu); const vuBits = nv? ((0xFFFFFFFF << (32-nv))>>>0) & 0xFFFFFC00 : 0;
  const ps=litSegs(r.pk); const pkBit = ps? (1<<(10+22-ps))>>>0 : 0;
  let w = (vuBits|pkBit)>>>0;
  w |= [2,1,8,4][m%8<4? m%8 : 0]* (m%8<4?1:0);          // sel_1..sel_4 added to channels 8i+0..3
  if (m===D.pair) w |= 0x100;                            // PAIR_SELECTED on shift_data[selected_pair]
  if (m%2===0 && pairErr(m)) w |= 0x200;                  // ERRORINDICATOR
  return w>>>0;
}

/* ---------------- display strings ---------------- */
function volTxt(){ if (D.vol===0) return '  Mute  '; const db=D.vol-61; return ('   '+(db>0?'+':db<0?'-':' ')+Math.abs(db)+' dB').slice(-8); }
function displayText(){
  if (!D.showValue) return MENU[D.menu];
  switch(D.menu){
    case 1: return volTxt();
    case 2: return (' AES '+(D.pair/2+1)+'   ').slice(0,8);
    case 3: return D.group? ' 33-64  ' : '  1-32  ';
    case 4: return (' '+SR_TXT[D.sr]+'      ').slice(0,8);
    case 5: return D.source? '  MADI  ' : '  AES   ';
  }
  return '        ';
}

/* ---------------- user actions → firmware path ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t, name, trace:tr, disp:displayText()}); if (D.log.length>50) D.log.length=50; SIM.refresh(); }
const grpAllowed = ()=> D.source===1 && D.sr===0 && (D.madiCard||D.unet);
const A = {
  turn(dir){ act(`Turn ADJUST ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    tr(`INT5/INT6 (PE5 ENCODER1B, PE6 ENCODER1A; 1 kΩ + 100 nF RC on the 32ME-5) → quadrature decode → rotDirectionx = ${dir>0?'ROTENCUP':'ROTENCDOWN'}`);
    tr(`${MENU_ID[D.menu]}:`);
    switch(D.menu){
      case 1: { const o=D.vol; D.vol=Math.max(0,Math.min(76,D.vol+dir)); tr(`volume_setup_level ${o} → ${D.vol} (Volume_Min 0 = Mute … 61 = 0 dB … Volume_Max 76 = +15 dB)`);
        tr(`PROCESS_VOLUME_INFORMATION → UART → main board → TDM_IN_ctl[10] bits 24..31 → SHARC volume[256] table → output_gain_new; ramp 0.01 per sample (τ ≈ ${(1/(FS*-Math.log(1-K.RAMP))*1e3).toFixed(2)} ms)`); break; }
      case 2: { const o=D.pair; D.pair = dir>0? (D.pair>=30?0:D.pair+2) : (D.pair<=0?30:D.pair-2); tr(`currentPair ${o} → ${D.pair} (CURRENTPAIRMIN 0 … CURRENTPAIRMAX 30, step 2, wraps)`);
        tr(`SHARC: selected_pair = TDM_IN_ctl[9] = ${D.pair}; PAIR_SELECTED (bit 8) moves to meter ${D.pair+1}; sport0_isr copies channels ${D.pair+1}/${D.pair+2} × output_gain to AES1 OUT (monitor + headset)`); break; }
      case 3: { if (D.sr===0){ const o=D.group; D.group^=1; if (D.source!==1){ tr('if((currentSampleRate == 0) && (currentSource = 1))  ← assignment, not a compare: currentSource is forced to 1 (MADI) — see Findings'); D.source=1; }
          tr(`currentGroup ${o} → ${D.group}: meters now show MADI channels ${D.group?'33–64':'1–32'} (FPGA group mux)`); }
        else { D.group=0; tr('currentSampleRate ≠ 0 → currentGroup = 0 (only 1–32 exist above 50 kHz)'); } break; }
      case 4: { if (D.source===1){ const o=D.sr; D.sr = dir>0? (D.sr>=2?0:D.sr+1) : (D.sr<=0?2:D.sr-1); if (D.sr!==0) D.group=0;
          tr(`currentSampleRate ${o} → ${D.sr} (${SR_TXT[D.sr]}) → FPGA smux_sel = 2'b${['00','01','10'][D.sr]} (SMUX${factorSet()})`);
          if (factorSet()!==factorIn()) tr(`<b style="color:var(--warn)">SR Sel (${SR_TXT[D.sr]}) does not match the MADI source (${D.madiRate} kHz): the meters still move but show the wrong thing (01AV0200 notes)</b>`); }
        else tr('currentSource ≠ 1 (AES): sample-rate menu does nothing'); break; }
      case 5: { if (D.madiCard||D.unet){ const o=D.source; D.source^=1; tr(`madi_present → currentSource ${o?'MADI':'AES'} → ${D.source?'MADI':'AES'} (rotEncToggleBit BIT0)`); } else tr('madi_present = 0: no card, source cannot change'); break; }
    }
    D.showValue=true; D.valueAt=SIM.t; tr(`Display: “${displayText()}” for ROTENCROTATETIMEOUT (3 s), then the title again (serviceSelectionTimeOut)`);
  }); },
  press(){ act('Press ADJUST (short)', tr=>{
    tr('INT4 (PE4 SWITCH1) → externalInterrupt_isr → rotEncBeginDebounce; release before ROTENCHOLDTIME → rotEncSwitchSetState(SWITCHHELDNO, SWITCHTIMEOUTNO)');
    const o=D.menu;
    if (D.menu===5) D.menu = D.source===1? 4 : 1;
    else if (D.menu===4 || D.menu===3) D.menu=1;
    else if (D.menu===2 && !grpAllowed()) { D.menu=1; tr('Mon Sel → Volume: Grp Sel is skipped (source AES, no card, or SR above 50 kHz — "added Feb. 14, 2013")'); }
    else D.menu++;
    if (!(D.menu===1 && o===2 && !grpAllowed())) tr(`rotaryEncoder_currentstate ${o} → ${D.menu} (${MENU_ID[D.menu]})`);
    D.showValue=false; tr(`Display title “${MENU[D.menu]}” (SIEMENS8_lcd_display)`);
  }); },
  hold(){ act('Press and hold ADJUST (1 s)', tr=>{
    tr('Timer3 COMPB (rotEncTimerOverFlow_isr) counts 0.5 s ticks; rotEncCounter == ROTENCHOLDTIME (2 ticks = 1 s) with the switch still down');
    tr('holdServiceFlag = YES → rotEncSwitchSetState(SWITCHHELDYES, …)');
    if (D.madiCard||D.unet){ D.menu=5; tr('madi_present → ROTARYENCODER_SOURCESELECTOR_STATE (“Adam Add - Sept. 8, 2015”)'); }
    else { D.menu=1; tr('no MADI card → back to ROTARYENCODER_VOLUME_STATE'); }
    D.showValue=false; tr(`Display “${MENU[D.menu]}”`);
  }); },
  idle(){ act('Leave the knob for 10 s', tr=>{ tr('rotEncCounter == ROTENCTIMEOUTTIME (20 ticks) → rotEncSwitchSetState(SWITCHHELDNO, SWITCHTIMEOUTYES)'); D.menu=1; D.showValue=false; tr('→ ROTARYENCODER_VOLUME_STATE, “ Volume ”'); }); },
  card(on){ act(on?'Fit the i64 MADI module on H4':'Remove the i64 MADI module', tr=>{ D.madiCard=on; if (on) D.unet=false; if (!on && !D.unet){ D.source=0; D.group=0; D.sr=0; }
    tr(`Main-board Atmel card detect → madi_present = ${on?1:0} (“takes about 2 seconds after power-up”, 01AV0200 notes)`);
    tr(on? 'Menus: Volume, Mon Sel, Grp Sel (48k), hold → Source → SR Sel' : 'Menus: Volume and Mon Sel only (the AES-only “smart menu”)'); }); },
  fitUnet(on){ act(on?'Fit the uNet2500 (32ME-N) on H4':'Remove the uNet', tr=>{ D.unet=on; if (on){ D.madiCard=false; D.source=1; D.sr=0; D.group=1; } else { D.source=0; D.group=0; }
    tr('Harness X102 (uNet bottom) → H4 (AMS8E-1 top): 5V, GND, SDIN0/1, SDOUT0/1, SCLK, LRCLK — 8 wires, 26 AWG (unet-standard-to-ams81-connection.xlsx)');
    tr('AvPortFormat I8S, 1 SCK delay, CH1 = LRCLK high; SampleRate 48 kHz; SyncMode PTP domain 0');
    tr('Streams 239.1.236.2 “32ME_AES_IN_1_4” and 239.2.236.2 “32ME_AES_IN_5_8”, 8 ch each, 48 samples (1 ms) per packet, port 5004');
    tr('The sheet’s column sketch puts SDOUT0/1 on H4 pins 28/26 = DATA6_IN_I64 / DATA5_IN_I64 and LRCLK/SCLK on 29/33 = FSYNC_IN_I64 / MCLK_IN_I64 (AMS8E-1 ISS5 IPC netlist): the 16 uNet channels arrive as MADI slots 33–48'); }); },
  madiIn(on){ act(on?'Connect MADI IN':'Disconnect MADI IN', tr=>{ D.madiIn=on; tr(on?'i64 locks; FSYNC 1FS and MCK 256FS run; madiChanActive bits go high':'i64 loses lock; channel-active bits clear → madiChanNotActive → ERR LEDs on every pair'); }); },
  rate(r){ act('MADI source rate → '+r+' kHz', tr=>{ D.madiRate=r; tr(`The i64 always delivers 64 ch / 1FS on 8 lines; ${r===48?'plain audio':r===96?'96k audio arrives as SMUX2 (sample pairs in adjacent channels)':'192k arrives as SMUX4'}`);
    tr('The module cannot tell the meter which factor is in use (“common practice that you set the factor manually”) → the operator must set SR Sel'); }); },
  jumper(j){ act('Toggle i64 jumper '+j, tr=>{ if (j==='Aux 1-2'){ D.aux56=!D.aux56; tr(`Aux 1-2 ${D.aux56?'fitted → 56-channel mode':'open → 64-channel mode'}; channels 57–64 ${D.aux56?'inactive → ERR LEDs on meters for those pairs (group 33–64)':'active'}`); }
    else if (j==='Aux 3-4'){ D.aux96f=!D.aux96f; tr(`Aux 3-4 ${D.aux96f?'fitted → MADI TX in 96k frame':'open → 48k frame'} (affects the module’s output frame only in this model)`); }
    else tr('X602 jumper: transparent subcode / low-latency loop-through (MADI OUT); no effect on the meters'); }); },
  prog(p){ D.prog=p; MKEY=''; SIM.refresh(); },
  reset(){ Object.assign(D,{madiCard:true,unet:false,madiIn:true,madiRate:48,aux56:false,aux96f:false,source:1,sr:0,group:0,pair:0,vol:41,menu:1,showValue:false,prog:'lineup',trim:0,scopeMeter:0,log:[]}); MKEY=''; SIM.refresh(); },
};

/* ================================================================
   PANEL DRAWING
   Front: the real CorelDRAW panel artwork (RD22 …/PrototypeV1_obsOct182012/32ME-FRONTPANEL FINAL.pdf,
   02-Aug-2012|45) cut at 200 dpi into two ink layers: assets/32me-front-green.png and -white.png
   (3449 × 331 px = 17.245″ × 1.655″ as drawn). The black linework is recoloured white for the
   WBS-black panel (colour inferred from the AMS8 family).
   Meter LEDs are placed from the AMS8E-4 Gerbers (AMS8E-4PANEL.TSM, P-CAD 2002, 12-Jun-2008):
   the board's mounting holes (3.37″ × 1.00″ apart) sit exactly on the panel's numbered screw circles.
   ================================================================ */
const ASSET='siumulation-plugins/assets/';
const WIN_X=[87,835,1583,2331], WIN_W=600, WIN_Y=10, WIN_H=310;
const BAR_DX=[77,147,217,287,387,457,527,597];     // bar centre offset from the left screw (Gerber X − 5.255″) × 200
const SCREW_X0=50, SCREW_Y=68;
const ledY = i => SCREW_Y + (3.625-(2.55+0.06*i))*200;      // segment i (0 = bottom)
function frontSVG(t, opts){
  opts=opts||{};
  const mx=muxAt(t); let s=`<svg viewBox="0 0 3449 331" role="img" aria-label="32ME front panel" style="width:100%;border-radius:6px;display:block">
   <defs><filter id="g32" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="3449" height="331" rx="8" fill="var(--dev)"/>`;
  for (let w=0;w<4;w++) s+=`<rect x="${WIN_X[w]}" y="${WIN_Y}" width="${WIN_W}" height="${WIN_H}" fill="#050506"/>`;
  s+=`<image href="${ASSET}32me-front-white.png" width="3449" height="331" opacity=".85"/><image href="${ASSET}32me-front-green.png" width="3449" height="331"/>`;
  let lit='';
  for (let w=0;w<4;w++){
    const sx = SCREW_X0 + 748*w;
    for (let b=0;b<8;b++){
      const m=w*8+b, r=meterAt(m,t), n=litSegs(r.vu), pkS=litSegs(r.pk), cx=sx+BAR_DX[b];
      for (let i=0;i<22;i++){ const on = i<n || (pkS && i===pkS-1); const y=ledY(i);
        const r_=`<rect x="${cx-9}" y="${y-4}" width="18" height="8" rx="1.5" fill="${on?SEGCOL(i):'#1a1c1b'}"/>`; if (on) lit+=r_; else s+=r_; }
      if (b%2===0){ const px=sx+(BAR_DX[b]+BAR_DX[b+1])/2; const err=pairErr(m), sel=(m===D.pair);
        s+=`<circle cx="${px}" cy="${SCREW_Y+(3.625-3.27)*200}" r="6" fill="${sel?'#4aa8ff':'#141618'}" ${sel?'filter="url(#g32)"':''}><title>PAIR_SELECTED (blue)</title></circle>
            <circle cx="${px}" cy="${SCREW_Y+(3.625-2.67)*200}" r="6" fill="${err?'#ff3b2f':'#1a1414'}" ${err?'filter="url(#g32)"':''}><title>ERRORINDICATOR: pair not active in the MADI stream</title></circle>
            <circle cx="${px}" cy="${SCREW_Y+(3.625-2.85)*200}" r="5" fill="#1a1414"><title>second red LED per pair: fitted per BOM, not driven by SHARC v050000 (inferred)</title></circle>`; }
      if (D.scopeMeter===m) s+=`<rect x="${cx-13}" y="${WIN_Y+4}" width="26" height="${WIN_H-8}" fill="none" stroke="var(--accent2)" stroke-width="3" stroke-dasharray="6 5"/>`;
      s+=`<rect class="mbar" data-m="${m}" x="${cx-16}" y="${WIN_Y}" width="32" height="${WIN_H}" fill="transparent" style="cursor:pointer"><title>Meter ${m+1}: ${srcChannelFor(m).note}. Click to watch it on the timeline.</title></rect>`;
    }
    if (opts.mux){ const on = mx.board===w; s+=`<rect x="${WIN_X[w]}" y="${WIN_Y}" width="${WIN_W}" height="${WIN_H}" fill="none" stroke="${on?'var(--warn)':'transparent'}" stroke-width="5"/>`; }
  }
  s+= opts.glow===false? lit : `<g filter="url(#g32)">${lit}</g>`;
  // character display (PDSP1884-class, 8 characters) in the drawn window
  s+=`<rect x="3038" y="55" width="372" height="100" fill="#060807"/>`+ `<g filter="url(#g32)">${SIM.dotMatrix(displayText(), 3052, 78, 7.6, '#ff5a3a', 'rgba(255,90,58,.08)')}</g>`;
  // the three small round apertures between ADJUST and HEADSET
  const ind=[[3168,D.group===0&&D.source===1,'#7dff6a','1–32 (inferred)'],[3220,D.group===1,'#7dff6a','33–64 (inferred)'],[3278,(D.madiCard||D.unet)&&D.madiIn&&D.source===1,'#ffb43a','MADI lock (inferred)']];
  ind.forEach(([x,on,c,l])=> s+=`<circle cx="${x}" cy="225" r="13" fill="${on?c:'var(--led-off)'}" ${on?'filter="url(#g32)"':''}><title>${l}</title></circle>`);
  // ADJUST encoder and HEADSET jack
  s+=`<g class="enc" style="cursor:pointer"><circle cx="3085" cy="230" r="62" fill="transparent"/><circle cx="3085" cy="230" r="44" fill="#121314" stroke="#3a3d40" stroke-width="3"/><circle cx="3085" cy="230" r="32" fill="#232527"/><line x1="3085" y1="230" x2="${3085+28*Math.sin(D.vol/76*5.2-2.6)}" y2="${230-28*Math.cos(D.vol/76*5.2-2.6)}" stroke="#ddd" stroke-width="4"/></g>
      <g class="jackh" style="cursor:pointer"><circle cx="3372" cy="230" r="36" fill="#0b0b0c" stroke="#555" stroke-width="3"/><circle cx="3372" cy="230" r="13" fill="#000"/>${D.phones?'<circle cx="3372" cy="230" r="22" fill="#2d2f31" stroke="#777"/>':''}<title>HEADSET: click to plug / unplug headphones</title></g>`;
  if (opts.hot) s+=opts.hot;
  return s+'</svg>';
}
/* Rear: no rear drawing could be rendered (32ME-M2 REAR PANEL.dwg is AutoCAD); legends from
   32ME-REARPANEL_Feb212013.cdr text: MADI IN/OUT, SYNC IN/OUT, AES IN/OUT 1-4, 5-8, 9-12, 13-16,
   ANALOG MONITOR OUTPUT L/R (+ G −), 90-230 VAC 1A S.B. Positions are inferred. */
function rearSVG(){
  /* Geometry from the CorelDRAW rear sheet (RD22 …/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr): its off-page copy
     carries the outline/hole guides and the WHITE legends, 1241.28 × 118.7 pt = the same 3449 × 331 frame (200 px/in) as the front.
     Hole centres in this frame: IEC 74–290 × 43–286; MADI optical cut-out 1212–1416 × 105–190; small holes 1451,154 and 1826,154;
     BNC OUT 1551,137 and IN 1727,137 (Ø101); Phoenix 1992–2208 × 214–281; DB25 shells at x 2379 / 2849, y 40 / 196 (329 × 94). */
  const bnc=(x,lbl,on,cls)=>`<g class="${cls||''}" style="${cls?'cursor:pointer':''}"><title>MADI coax ${lbl} (BNC)${cls?' — click to plug or unplug':''}</title><circle cx="${x}" cy="137" r="47" fill="#a8913f" stroke="#5e4d1c" stroke-width="3"/><circle cx="${x}" cy="137" r="28" fill="#d8c27a"/><circle cx="${x}" cy="137" r="9" fill="#7a5f12"/>${on?`<circle cx="${x}" cy="137" r="40" fill="#2b5f9e" opacity=".9"/><circle cx="${x}" cy="137" r="16" fill="#3a74b8"/>`:''}</g>`;
  const db25=(x,y)=>`<rect x="${x}" y="${y}" width="329" height="94" rx="12" fill="#9aa0a6" stroke="#55595c" stroke-width="3"/><rect x="${x+30}" y="${y+16}" width="269" height="62" rx="12" fill="#1d1f22"/>${Array.from({length:13},(_,k)=>`<circle cx="${x+48+k*19.4}" cy="${y+36}" r="4" fill="#777"/>`).join('')}${Array.from({length:12},(_,k)=>`<circle cx="${x+58+k*19.4}" cy="${y+58}" r="4" fill="#777"/>`).join('')}`;
  const sync=D.madiCard&&D.madiIn;
  let s=`<svg viewBox="0 0 3449 331" role="img" aria-label="32ME rear panel (CorelDRAW rear silk, Feb 21 2013)" style="width:100%;border-radius:6px;display:block"><rect width="3449" height="331" rx="8" fill="var(--dev)"/>
    <rect x="76" y="45" width="212" height="239" rx="10" fill="#0a0b0c" stroke="#333"/><rect x="120" y="105" width="124" height="96" rx="8" fill="#151719"/>${[150,182,214].map(x=>`<rect x="${x-5}" y="135" width="10" height="34" fill="#4a4d50"/>`).join('')}
    ${Array.from({length:9},(_,k)=>`<rect x="${526+k*40}" y="66" width="15" height="198" rx="7" fill="#0a0b0c"/>`).join('')}
    <rect x="1214" y="107" width="200" height="81" rx="6" fill="#151719" stroke="#3a3d40" stroke-width="2"/>${[1262,1382].map(x=>`<rect x="${x-34}" y="122" width="68" height="52" rx="6" fill="#26292c"/><circle cx="${x}" cy="148" r="9" fill="#0a0b0b" stroke="#55595c" stroke-width="2"/>`).join('')}
    ${[1451,1826].map(x=>`<circle cx="${x}" cy="154" r="11" fill="${sync?'var(--led-g)':'var(--led-off)'}" stroke="#0a0b0b" stroke-width="3"/>`).join('')}
    ${bnc(1551,'OUT',false)}${bnc(1727,'IN',D.madiIn,'rmadi')}
    <rect x="1994" y="216" width="212" height="63" rx="4" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>${[0,1,2,3,4,5].map(k=>`<rect x="${2010+k*33}" y="231" width="24" height="34" fill="#0e4d25"/>`).join('')}
    ${db25(2379,40)}${db25(2849,40)}${db25(2379,196)}${db25(2849,196)}
    <image href="${ASSET}32me-rear.svg" width="3449" height="331"/>
    <g opacity=".9"><rect x="3228" y="40" width="200" height="250" rx="8" fill="${D.unet?'#123a6b':'none'}" stroke="#666" stroke-dasharray="8 6"/>
    <text x="3328" y="140" text-anchor="middle" font-size="20" fill="#ddd">${D.unet?'uNet2500 RJ45':'H4 option'}</text><text x="3328" y="168" text-anchor="middle" font-size="16" fill="#aaa">${D.unet?'(no hole on the 2013 art)':D.madiCard?'i64 MADI fitted':'empty'}</text><text x="3328" y="196" text-anchor="middle" font-size="14" fill="#999">not on the silk</text></g></svg>`;
  return s;
}
function bindPanel(root){
  const enc=root.querySelector('.enc'); if (enc){ enc.addEventListener('click',e=>{ const r=enc.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; if (x<0.36) A.turn(-1); else if (x>0.64) A.turn(1); else A.press(); }); enc.addEventListener('wheel',e=>{ e.preventDefault(); A.turn(e.deltaY<0?1:-1); },{passive:false}); enc.addEventListener('contextmenu',e=>{ e.preventDefault(); A.hold(); }); }
  root.querySelectorAll('.mbar').forEach(b=> b.addEventListener('click',()=>{ D.scopeMeter=+b.dataset.m; SIM.refresh(); }));
  const j=root.querySelector('.jackh'); if (j) j.addEventListener('click',()=>{ D.phones=!D.phones; SIM.refresh(); });
  const rm=root.querySelector('.rmadi'); if (rm) rm.addEventListener('click',()=>A.madiIn(!D.madiIn));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
   <span class="small muted">ADJUST</span><button data-a="l">⟲ turn</button><button data-a="p">press</button><button data-a="h">hold 1 s</button><button data-a="r">turn ⟳</button><button data-a="i">idle 10 s</button>
   <span class="small muted" style="margin-left:8px">Keys: J K L · H hold</span></div>
   <div class="small muted" style="margin-top:4px">Click the knob's left or right side to turn it, its centre to press; right-click holds it. Click any meter bar to follow that meter on the timeline.</div>`;
}
function bindControls(root){ const m={l:()=>A.turn(-1),p:()=>A.press(),h:()=>A.hold(),r:()=>A.turn(1),i:()=>A.idle()}; root.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>m[b.dataset.a]()); }
document.addEventListener('keydown',e=>{ if (!window.__32meActive || (e.target.matches&&e.target.matches('input,select,textarea'))) return; const k=e.key.toLowerCase(); const m={j:()=>A.turn(-1),k:()=>A.press(),l:()=>A.turn(1),h:()=>A.hold()}; if (m[k]){ m[k](); e.preventDefault(); } });

function moduleCtl(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
   <label class="small">Option on H4 <select id="opt"><option value="madi" ${D.madiCard?'selected':''}>i64 MADI module (32ME-MADI)</option><option value="unet" ${D.unet?'selected':''}>uNet2500 (32ME-N)</option><option value="none" ${!D.madiCard&&!D.unet?'selected':''}>none (AES only)</option></select></label>
   <label class="small">MADI source rate <select id="mr">${[48,96,192].map(r=>`<option ${r===D.madiRate?'selected':''}>${r}</option>`).join('')}</select> kHz</label>
   <label class="small">Test programme <select id="pg">${Object.keys(PROGS).map(k=>`<option value="${k}" ${k===D.prog?'selected':''}>${PROGS[k]}</option>`).join('')}</select></label>
   <label class="small">Trim <input type="range" id="tr" min="-20" max="14" value="${D.trim}"> <span class="mono" id="trv">${D.trim} dB</span></label>
   <span class="small muted">i64 jumpers:</span>${['Aux 1-2','Aux 3-4','X602 1-2'].map(j=>`<button data-j="${j}" class="${(j==='Aux 1-2'&&D.aux56)||(j==='Aux 3-4'&&D.aux96f)?'on':''}">${j}</button>`).join('')}
   <button id="rst">Defaults</button></div>`;
}
function bindModuleCtl(m){
  const q=s=>m.querySelector(s);
  q('#opt').onchange=e=>{ const v=e.target.value; if (v==='madi') A.card(true); else if (v==='unet') A.fitUnet(true); else { D.unet=false; A.card(false); } };
  q('#mr').onchange=e=>A.rate(+e.target.value);
  q('#pg').onchange=e=>A.prog(e.target.value);
  q('#tr').oninput=e=>{ D.trim=+e.target.value; q('#trv').textContent=D.trim+' dB'; MKEY=''; SIM.refresh(); };
  m.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>A.jumper(b.dataset.j));
  q('#rst').onclick=()=>A.reset();
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css=SIM.css, sm=D.scopeMeter, src=srcChannelFor(sm), L=[];
  const madiOn = D.madiCard && D.madiIn && D.source===1;
  L.push({label:'i64 FSYNC 1FS / MCK 256FS', h:30, draw(c,X,t0,t1,y,h){ if (!madiOn && !D.unet){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(D.unet?'':'no MADI card / no signal', X(t0)+6,y+h/2+4); return; }
    const span=t1-t0; if (span<300/K.MCK) SIM.pulses(c,X,t0,t1,y+h*0.5,h*0.5,1/K.MCK,0,0.5/K.MCK,css('--ink2'),'MCK');
    SIM.pulses(c,X,t0,t1,y,h*(span<300/K.MCK?0.5:1),1/FS,0,1/K.MCK,css('--accent2'),'FSYNC frames'); }});
  L.push({label:'i64 data line 0 (ch 1–8, 32-bit slots)', h:26, draw(c,X,t0,t1,y,h){ if (!madiOn) return; const span=t1-t0, slot=32/K.MCK;
    if (span>2000*slot){ SIM.pulses(c,X,t0,t1,y,h,1/FS,0,1/FS,css('--accent'),'frames of 8 × 32 bits'); return; }
    const n0=Math.floor(t0/slot), n1=Math.ceil(t1/slot); for (let n=n0;n<=n1;n++){ const k=((n%8)+8)%8; c.fillStyle= k%2? css('--accent'):css('--accent2'); c.globalAlpha=.55; c.fillRect(X(n*slot),y+4,X((n+1)*slot)-X(n*slot)-1,h-8); c.globalAlpha=1; if (X((n+1)*slot)-X(n*slot)>34){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('ch '+(k+1+(D.group?32:0)),X(n*slot)+3,y+h/2+4);} } }});
  L.push({label:'FPGA smux1x4_i2sx32: frame latch', h:24, draw(c,X,t0,t1,y,h){ if (!madiOn && !D.unet) return; SIM.pulses(c,X,t0,t1,y,h,1/FS,2/K.MCK,1/K.MCK,css('--warn'),'fsync1clk → inregN → inregNbuffer'); }});
  L.push({label:'FPGA I2S out: LRCLK 48k, SCLK 3.072 MHz', h:24, draw(c,X,t0,t1,y,h){ const span=t1-t0; if (span<200/K.SCLK) SIM.pulses(c,X,t0,t1,y+h/2,h/2,1/K.SCLK,0,0.5/K.SCLK,css('--ink2'),'SCLK'); SIM.pulses(c,X,t0,t1,y,span<200/K.SCLK?h/2:h,1/FS,0,0.5/FS,css('--accent'),'LRCLK'); }});
  L.push({label:'SHARC sport0_isr (32-ch TDM)', h:24, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/FS,1/K.MCK*4,6e-6,css('--accent2'),'sport0_isr: 32 samples → float, volume ramp, VUMeterCalc'); }});
  L.push({label:'SHARC shifter: LED mux (timer 1)', h:30, draw(c,X,t0,t1,y,h){ const span=t1-t0; const n0=Math.floor(t0/K.MUX), n1=Math.ceil(t1/K.MUX);
    if (n1-n0>400){ SIM.pulses(c,X,t0,t1,y,h,K.MUX,0,K.MUX*0.2,css('--warn'),'shifter calls (TPERIOD1 12000 / 49.152 MHz)'); return; }
    const cols=['#e0a020','#3aa0e0','#3fbf5f','#c04ad0']; for (let n=n0;n<=n1;n++){ const mm=muxAt(n*K.MUX+1e-9); c.fillStyle=cols[mm.board]; c.globalAlpha=.25+.15*mm.pair; c.fillRect(X(n*K.MUX),y+3,X((n+1)*K.MUX)-X(n*K.MUX)-1,h-6); c.globalAlpha=1;
      if (X((n+1)*K.MUX)-X(n*K.MUX)>60){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`board ${mm.board+1} pair ${mm.pair+1}: 64 bits`, X(n*K.MUX)+3, y+h/2+4); } } }});
  L.push({label:`Meter ${sm+1} input (${src.note})`, h:40, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0), span=t1-t0; c.strokeStyle=css('--accent'); const chs=src.avg||[src.ch];
    const N=Math.min(1200,Math.max(200,pw)); if (span*1000>pw/3){ c.fillStyle=css('--accent'); c.globalAlpha=.35; for (let i=0;i<N;i++){ const tt=t0+span*i/N; let a=0; for (const ch of chs) a+= chActive(ch)? Math.pow(10,chLevelDb(ch)/20)*envelope(ch,tt):0; a/=chs.length; c.fillRect(X(tt),y+h/2-a*(h/2-2),pw/N+.5,2*a*(h/2-2)); } c.globalAlpha=1; return; }
    c.beginPath(); for (let i=0;i<=N;i++){ const tt=t0+span*i/N, n=Math.floor(tt*FS); let v=0; for (const ch of chs) v+=sampleOf(ch,n); v/=chs.length; const yy=y+h/2-v*(h/2-2); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }});
  L.push({label:`Meter ${sm+1}: VU bar / PPM dot (dB)`, h:56, draw(c,X,t0,t1,y,h){ const M=meters(); const toY=v=>y+2+(Math.min(120,v)/120)*(h-4);
    c.strokeStyle=css('--grid'); [40,80].forEach(v=>{ c.beginPath(); c.moveTo(X(t0),toY(v)); c.lineTo(X(t1),toY(v)); c.stroke(); });
    [['vu',css('--accent')],['pk',css('--bad')]].forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); const a=Math.max(0,Math.floor(t0*M.N)), b=Math.min(M.N-1,Math.ceil(t1*M.N)); for (let i=a;i<=b;i++){ const yy=toY(M[k][sm][i]); i===a?c.moveTo(X(i/M.N),yy):c.lineTo(X(i/M.N),yy); } c.stroke(); c.lineWidth=1; });
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('−20 dBFS', X(t0)+3, toY(40)-2); c.fillText('−40', X(t0)+3, toY(80)-2); }});
  L.push({label:'ATmega128L front panel (4.9152 MHz)', h:24, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); SIM.pulses(c,X,t0,t1,y,h,0.5,0,0.004,css('--ink2'),'Timer3 COMPB 0.5 s ticks');
    D.log.forEach(e=>{ if (e.t>=t0&&e.t<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(e.t)-1,y+2,3,h-4); } }); }});
  if (D.unet){
    L.push({label:'uNet: RTP packets (1 ms) / PTP', h:28, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y+h/2,h/2,K.RTP_PKT,0,0.08e-3,css('--accent2'),'RTP, 48 samples × 8 ch, 2 streams');
      SIM.pulses(c,X,t0,t1,y,h/2,K.PTP_SYNC,0.137,0.004,css('--warn'),'PTP Sync (logSyncInterval 0)'); }});
    L.push({label:'uNet playout delay 512 samples', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent'); c.globalAlpha=.3; const p=K.PLAYOUT; for (let n=Math.floor(t0/0.1);n<=t1/0.1;n++){ const a=n*0.1; c.fillRect(X(a),y+4,X(a+p)-X(a),h-8);} c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText('a packet sent at the bar start plays out 10.67 ms later', X(t0)+4, y+h/2+4); }});
  }
  return L;
}

/* ================================================================ VIEWS ================================================================ */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const inf='<span class="tag-inf">inferred</span>';

function inspector(t){
  const mx=muxAt(t), sm=D.scopeMeter, r=meterAt(sm,t), w=shiftWord(sm,t), src=srcChannelFor(sm);
  return `<table class="kv">
   <tr><th>Source / option</th><td class="mono">${D.source?'MADI':'AES'} · ${D.madiCard?'i64 MADI':D.unet?'uNet2500 (32ME-N)':'no option'} · MADI ${D.madiIn?D.madiRate+' kHz':'absent'}${D.aux56?' · 56 ch':''}</td></tr>
   <tr><th>SR Sel / smux_sel</th><td class="mono">${SR_TXT[D.sr]} → 2'b${['00','01','10'][D.sr]} (SMUX${factorSet()}) ${factorSet()!==factorIn()&&D.source===1&&D.madiCard?'<b style="color:var(--warn)">≠ source ×'+factorIn()+'</b>':''}</td></tr>
   <tr><th>Group / pair / volume</th><td class="mono">${D.group?'33–64':'1–32'} · pair ${D.pair/2+1} (ch ${D.pair+1}/${D.pair+2}) · ${volTxt().trim()}</td></tr>
   <tr><th>Menu</th><td class="mono">${MENU_ID[D.menu]} · display “${displayText()}”</td></tr>
   <tr><th>LED multiplex</th><td class="mono">shifter call #${mx.k} · mux_count2=${(mx.k&15)} → board ${mx.board+1}, pair ${mx.pair+1} lit (1/16 duty)</td></tr>
   <tr><th>Meter ${sm+1}</th><td class="mono">${src.note}<br>VU value ${r.vu} (${(-r.vu/2).toFixed(1)} dB on the table) → ${litSegs(r.vu)} segments · PPM ${r.pk} → dot ${litSegs(r.pk)}</td></tr>
   <tr><th>shift_data[${sm}]</th><td class="mono small">${w.toString(2).padStart(32,'0').replace(/(.{4})/g,'$1 ')}</td></tr></table>`;
}
function viewSim(m){
  window.__32meActive=true;
  m.innerHTML = card('Front panel at the playhead (real 2012|45 panel artwork; meters placed from the AMS8E-4 Gerbers)', `<div id="fp"></div>${controlsHTML()}`)
   + card('Rear panel and option module', `<div id="rp"></div><div class="small muted" style="margin-top:4px">Rear artwork: ${SIM.src('ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr','32ME-REARPANEL_Feb212013.cdr')} (2013-02-21|46), WHITE legends and the sheet's hole guides (grey). Two live-text lines that libcdr set at 14 pt on top of other text (MADE IN CANADA, PLEASE REFER TO MANUAL) are re-set at 6 pt ${inf}. The front stays on the 2012|45 FINAL panel art.</div><div style="margin-top:8px">${moduleCtl()}</div>`)
   + `<div class="grid2">${card('What the firmware did (last action)', '<div id="trace" class="log"></div>')}${card('State at the playhead', '<div id="insp"></div>')}</div>`
   + card('Timeline: one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">The meters are vumeter.asm run on every sample: VU integrates the squared input with Tvu (40 dB in ${K.tVU.toFixed(3)} s), PPM attacks 40 dB in ${(K.tA*1e3).toFixed(2)} ms and falls 40 dB in ${K.tD.toFixed(2)} s. The LED mux, i64 and FPGA clocks come from the code and the module documents. The uNet lanes appear when the 32ME-N option is fitted.</p>`)
   + card('Action log', '<div id="log" class="log"></div>');
  bindControls(m); bindModuleCtl(m);
  SIM.on('time', ()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML=inspector(t);
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn or press ADJUST. Each step the front-panel and SHARC code takes is listed here.</div>';
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230});
  });
}

/* ---------------- tutorial ---------------- */
const LESSONS=[
  {title:'Meet the 32ME', body:`<p>The 32ME is a 1RU, 32-meter audio monitor. Its four windows each hold one AMS8E-4 LED board with eight 22-segment bars. The numbers beside each window show which channels the bars carry: <b>1–32</b> normally, <b>33–64</b> when a 64-channel MADI stream is shown in its second group.</p><p>All control is on one push-and-turn knob, <b>ADJUST</b>. The 8-character display shows which menu you are in. The headset jack plays the selected pair.</p><p>Inputs: 16 AES pairs on four DB25s, and an option slot (header H4) for a <b>DirectOut i64 MADI</b> module (32ME-MADI) or an <b>Archwave uNet</b> network module (32ME-N).</p>`, check:()=>true, auto:true},
  {title:'1 · Line up the meters', body:`<p>Choose the test programme <b>Line-up: 1 kHz, −20 dBFS</b> and trim 0 dB. Every bar rises to the <b>0</b> mark: the SHARC adds a 3 dB correction to the RMS value, so a −20 dBFS sine reads 0 (SMPTE-style alignment).</p><p><b>Goal:</b> line-up programme at 0 dB trim.</p>`, check:()=>D.prog==='lineup'&&D.trim===0, hint:'Use the Test programme menu under the rear panel.'},
  {title:'2 · Set the monitor volume', body:`<p>The display reads <span class="mono">Volume</span>. <b>Turn ADJUST</b>: each click is 1 dB. The display shows the value (for example <span class="mono">-20 dB</span>) for 3 s, then the title again.</p><p><b>Goal:</b> set the volume to −10 dB.</p>`, check:()=>D.vol===51, hint:'Clockwise is louder. 61 steps = 0 dB; you need 51.'},
  {title:'3 · Pick the pair you hear', body:`<p><b>Press ADJUST</b> once: <span class="mono">Mon Sel</span>. Turn the knob: the <b>blue</b> pair LED moves along the bars, and the headset plays that pair.</p><p><b>Goal:</b> monitor pair 4 (meters 7 and 8).</p>`, check:()=>D.pair===6, hint:'Press once to reach Mon Sel, then turn three clicks clockwise.'},
  {title:'4 · Show channels 33–64', body:`<p>With a MADI module at 48 kHz, the next press gives <span class="mono">Grp Sel</span>. Turn the knob to swap the bars between MADI 1–32 and 33–64.</p><p><b>Goal:</b> group 33–64 on MADI.</p>`, check:()=>D.group===1&&D.source===1&&D.madiCard, hint:'Option = i64 MADI, source rate 48 kHz. Press until Grp Sel, then turn.'},
  {title:'5 · Choose the source', body:`<p><b>Hold ADJUST for one second</b> (right-click the knob, or the <i>hold 1 s</i> button). The display reads <span class="mono">Source</span>. Turning toggles AES ⇄ MADI.</p><p><b>Goal:</b> source = AES, then back to MADI.</p>`, check:()=>D.log.some(e=>/Turn/.test(e.name)&&e.trace.some(s=>/currentSource MADI → AES/.test(s)))&&D.source===1, hint:'Hold, turn once (AES), turn again (MADI).'},
  {title:'6 · Match the sample rate', body:`<p>Set the MADI source rate to <b>96 kHz</b>. The i64 always delivers 64 slots at 48k, so 96k audio arrives as <b>SMUX2</b>. The module cannot report the factor, so you set it yourself: hold → Source → press → <span class="mono">SR Sel</span>, turn to <b>60-100k</b>.</p><p><b>Goal:</b> source 96 kHz and SR Sel 60-100k.</p>`, check:()=>D.madiRate===96&&D.sr===1&&D.source===1, hint:'Hold, press once more to reach SR Sel, then turn.'},
  {title:'7 · See a mismatch', body:`<p>Now set SR Sel back to <b>30-50k</b> while the source stays at 96 kHz. The 01AV0200 release notes say what happens: meters 1 and 2 show samples 1 and 2 of channel 1, so every channel appears <b>twice</b>. Use the staircase programme to see it.</p><p><b>Goal:</b> staircase programme, 96 kHz source, SR 30-50k.</p>`, check:()=>D.prog==='stair'&&D.madiRate===96&&D.sr===0, hint:'Programme menu → Channel ident; SR Sel → 30-50k.'},
  {title:'8 · 56-channel MADI', body:`<p>Some MADI sources send 56 channels. On the i64 that is the <b>Aux 1-2</b> jumper. Set the source to 48 kHz, fit Aux 1-2 and choose group 33–64: pairs 57–64 lose their channel-active flag and their <b>red ERR</b> LEDs light.</p><p><b>Goal:</b> 56-channel mode with group 33–64 shown.</p>`, check:()=>D.aux56&&D.group===1&&D.madiRate===48, hint:'Click the Aux 1-2 button, then Grp Sel → 33–64.'},
  {title:'9 · The network option (32ME-N)', body:`<p>In June 2016|49 an Archwave <b>uNet2500</b> was wired to the same H4 header as the MADI module. Its configuration names the model “32ME-N” and sends two RAVENNA streams, <span class="mono">32ME_AES_IN_1_4</span> and <span class="mono">32ME_AES_IN_5_8</span>.</p><p>Choose the uNet option: the timeline gains RTP packet and PTP lanes.</p><p><b>Goal:</b> uNet fitted.</p>`, check:()=>D.unet, hint:'Option on H4 → uNet2500.'},
  {title:'Done', body:`<p>You have used every menu on the 32ME. The <b>One second</b> tab follows a sample from the MADI wire to an LED. <b>Software</b> shows the menu state machine and the LED word, and <b>Findings</b> lists the bugs and leftovers in the code.</p>`, check:()=>true, auto:true},
];
let LI=0;
function viewTut(m){
  window.__32meActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial: operating the 32ME (from the 01AV0200 release notes and front-panel code; no operator manual is archived)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The unit', `<div id="fp"></div>${controlsHTML()}<div style="margin-top:8px">${moduleCtl()}</div>`)}${card('What the firmware did', '<div id="trace" class="log"></div>')}</div></div>`;
  bindControls(m); bindModuleCtl(m);
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===LI?'font-weight:700;color:var(--accent)':''}">${l.title}${i<LI?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ LI=+li.dataset.i; draw(); });
    const L=LESSONS[LI], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${LI?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${LI<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{ LI=Math.max(0,LI-1); draw(); }; m.querySelector('#nx').onclick=()=>{ LI=Math.min(LESSONS.length-1,LI+1); draw(); }; m.querySelector('#rs').onclick=()=>{ A.reset(); LI=0; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__32meActive=false;
  m.innerHTML = card('One second, broken down', '<div id="lad"></div>') + `<div class="grid2">${card('As seen by the device at the playhead', '<div id="dev"></div>')}${card('As seen on the panel: one shifter call lights one pair on one board', '<div id="fp"></div><p class="small muted">Orange frame = the board the SHARC is driving right now. Your eye integrates 16 calls (3.9 ms) into a steady display.</p>')}</div>`
    + card('Ballistics of the selected meter, from vumeter.asm', '<canvas id="bal"></canvas><div id="balt" class="small"></div>');
  SIM.on('time', ()=>{ const t=SIM.t, mx=muxAt(t);
    const rows=[
      ['MADI frames (i64 FSYNC falling edges)', '48,000', SIM.fmtDur(1/FS), 'ClockDescription.txt: 1FS, any frame 30–50 kHz'],
      ['i64 bit clock MCK', (K.MCK/1e6).toFixed(3)+' M', SIM.fmtDur(1/K.MCK), '256FS: 8 channels × 32-bit slots per line, 8 lines'],
      ['FPGA I2S SCLK out', (K.SCLK/1e6).toFixed(3)+' M', SIM.fmtDur(1/K.SCLK), 'mclk_counter[1]: 32 stereo I2S lines (64 ch) to the DSP side'],
      ['SHARC sport0_isr', '48,000', SIM.fmtDur(1/FS), '32 TDM slots → float → volume ramp → VUMeterCalc'],
      ['SHARC shifter calls (LED mux)', Math.round(1/K.MUX).toLocaleString(), SIM.fmtDur(K.MUX), 'timer 1: TPERIOD1 12000 at 49.152 MHz'],
      ['Full LED refresh (4 boards × 4 pairs)', (1/(16*K.MUX)).toFixed(1), SIM.fmtDur(16*K.MUX), 'each pair lit 1/16 of the time'],
      ['Main-board meter results (VUMeterGet ×32)', '≈ '+Math.round(1/K.MUX)+' '+inf, '', 'main_loop runs between interrupts; it polls the mux flag'],
      ['Front-panel Timer3 ticks', '2', '500 ms', 'ROTENCHOLDTIME = 2 ticks, ROTATE 6, TIMEOUT 20'],
      ...(D.unet?[['uNet RTP packets per stream','1,000','1 ms','48 samples × 8 ch'],['PTP Sync messages','1','1 s','LogSyncInterval 0'],['PTP Announce','0.5','2 s','LogAnnounceInterval 1']]:[]),
    ];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>where</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const n=Math.floor(t*FS), slotT=(t*K.MCK)%256, sm=D.scopeMeter, src=srcChannelFor(sm);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
     <tr><th>MADI frame</th><td class="mono">#${n.toLocaleString()} · MCK ${Math.floor(slotT)}/256 → slot ${Math.floor(slotT/32)+1} bit ${31-Math.floor(slotT%32)} on each of the 8 lines</td></tr>
     <tr><th>FPGA</th><td class="mono">shifting frame ${n} into inreg0..7; frame ${n-1} sits in inregNbuffer and goes out as I2S (≈ 1 frame + 2 MCK latency)</td></tr>
     <tr><th>SHARC</th><td class="mono">sample ${n}: sport0_isr → VUMeterCalc ×32; shifter call ${mx.k}: board ${mx.board+1}, pair ${mx.pair+1}</td></tr>
     <tr><th>Meter ${sm+1}</th><td class="mono">${src.note}; VU ${meterAt(sm,t).vu}, PPM ${meterAt(sm,t).pk}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t,{mux:true,glow:false}); bindPanel(m.querySelector('#fp'));
    // ballistic step response
    const {c,w}=SIM.canvas(m.querySelector('#bal'),180); const ink=SIM.css('--ink2'); c.strokeStyle=SIM.css('--grid'); c.strokeRect(40,10,w-50,150);
    const T=1.0, step=n=>n<0.3*FS?1:0; let VU=0,PP=0; const pv=[],pp=[];
    for (let i=0;i<T*FS;i++){ const x=step(i)*Math.sin(2*Math.PI*1000*i/FS); const x2=x*x; VU+=(x2-VU)*K.kVU; PP=Math.max(PP+(x2-PP)*K.kA, PP+(x2-PP)*K.kD); if (i%48===0){ pv.push(VU); pp.push(PP);} }
    const toY=p=>{ const db=p>1e-10?10*Math.log10(p):-100; return 10+Math.min(150,(-db)/40*150); };
    [[pv,SIM.css('--accent')],[pp,SIM.css('--bad')]].forEach(([a,col])=>{ c.strokeStyle=col; c.beginPath(); a.forEach((p,i)=>{ const x=40+(w-50)*i/a.length; i?c.lineTo(x,toY(p)):c.moveTo(x,toY(p)); }); c.stroke(); });
    c.fillStyle=ink; c.font='11px sans-serif'; c.fillText('0 dB',4,14); c.fillText('−20',4,89); c.fillText('−40',4,160); c.fillText('300 ms tone on → off (full-scale 1 kHz); green VU (mean square), red PPM', 46,175);
    m.querySelector('#balt').innerHTML=`<p><b>How the time constants were derived.</b> vumeter.asm gives each one as <span class="mono">tconst = 1 − 10^(−40/(10·time·FS))</span> at FS = 48 kHz, so <span class="mono">time = −4 / (FS · log10(1 − tconst))</span>. That is the time for the squared signal to move 40 dB:</p>
      <table class="kv"><tr><th>Constant</th><th>value</th><th>40 dB in</th><th>meaning</th></tr>
      <tr><td class="mono">TCONST_VU</td><td class="mono">${K.kVU}</td><td class="mono">${K.tVU.toFixed(3)} s</td><td>one-pole mean-square average, τ = ${(1/(FS*-Math.log(1-K.kVU))*1e3).toFixed(0)} ms (rise and fall alike; a classic VU needle is 300 ms to 99 %)</td></tr>
      <tr><td class="mono">TCONST_PPM_ATTACK</td><td class="mono">${K.kA}</td><td class="mono">${(K.tA*1e3).toFixed(2)} ms</td><td>τ = ${(1/(FS*-Math.log(1-K.kA))*1e3).toFixed(2)} ms on the squared signal</td></tr>
      <tr><td class="mono">TCONST_PPM_DECAY</td><td class="mono">${K.kD}</td><td class="mono">${K.tD.toFixed(2)} s</td><td>falls 24 dB in ${(K.tD*24/40).toFixed(2)} s (a BBC Type IIa PPM falls 24 dB in 2.8 s)</td></tr></table>
      <p class="small muted">The commented-out older values in the same line (0.0003836906, 0.000639402 for VU; 0.009548227, 0.000719299 for attack; 0.000191863 for decay) show the constants were tuned by hand: they give ${tFor(0.0003836906).toFixed(2)} s / ${tFor(0.000639402).toFixed(2)} s, ${(tFor(0.009548227)*1e3).toFixed(1)} ms / ${(tFor(0.000719299)*1e3).toFixed(0)} ms and ${tFor(0.000191863).toFixed(2)} s.</p>`;
  });
}

/* ---------------- block diagram ---------------- */
const BLK={
  madi:{x:10,y:20,w:170,h:90,t:'MADI IN / OUT',s:['coax BNC (rear)','i64 OEM module','XC3S700AN inside'],d:'DirectOut i64 MADI OEM board. It delivers 64 channels on 8 serial lines, MSB first, 32-bit slots, FSYNC 1FS (falling edge = frame start), MCK 256FS (~12.3 MHz), with about 4 ns jitter because it runs on a 250 MHz internal clock. Jumpers: Aux 1-2 = 56 ch, Aux 3-4 = 96k frame, Aux 4-5 = follow MADI RX; X602 = transparent subcode / loop-through.'},
  unet:{x:10,y:130,w:170,h:90,t:'uNet2500 (32ME-N)',s:['Ethernet, RAVENNA','PTP domain 0','I8S, 1 SCK delay'],d:'Archwave uNet module configured as “32ME-N” (ModelName column of unet-standard-Parameters.xlsx). Eight wires to H4: 5V, GND, SDIN0/1, SDOUT0/1, SCLK, LRCLK. SPI, UART, GPIO and MCLK are listed in the sheet but have no wire colour, so they were not connected.'},
  aes:{x:10,y:240,w:170,h:90,t:'16 AES in (DB25 ×4)',s:['32ME-2 boards','AES 1-4 … 13-16'],d:'Four DB25 connectors, AES IN/OUT 1-4, 5-8, 9-12, 13-16 (rear silk). The 01AV0200 notes: in AES mode all 16 pairs fit on the 32 meters, so Grp Sel and SR Sel are hidden.'},
  h4:{x:220,y:70,w:150,h:110,t:'H4 2×17 header',s:['PROLEX PG21342V100','on AMS8E-1 ISS5'],d:'The AMS8E-1 ISS5 BOM lists H4 as “CONN POL H2X17”. The i64 pin-out sheet calls it a “2 x 34” header but numbers only 34 pins, so it is 2 rows × 17. Odd pins 1–15 GND/+5 V; data to module on 2–16, from module on 18–32; FSYNC from module 29, to module 31; MCK from module 33, to module 34.'},
  fpga:{x:410,y:20,w:190,h:150,t:'Cyclone IV FPGA',s:['smux1x4_i2sx32','group / SMUX mux','AES RX + ASRC, tone','LED brightness'],d:'smux1x4_i2sx32.v clocks the 8 lines into 256-bit registers on the falling edge of MCK, latches a whole frame on fsync1clk, and sends it out as 32 I2S lines (LRCLK = MCK/256, SCLK = MCK/4). smux_sel 00/01/10 = SMUX1/2/4. madiChanActive[k] = OR of bit 6 of two adjacent slots (the channel-active flag).'},
  dsp:{x:410,y:200,w:190,h:130,t:'ADSP-21065L SHARC',s:['sport0_isr: VUMeterCalc','shifter: LED mux','volume ramp → AES1 OUT'],d:'v050000: 32 channels in over SPORT0 TDM. VU and PPM per channel, a lookup table maps each 0–255 result to 22 LED bits, then the 64-bit words are shifted out on FLG0 (data) / FLG1 (clock) with four latch enables (FLG6, 5, 2, 4) and an output enable (FLG3). The selected pair, times the volume gain, is copied to AES1 OUT for the monitor.'},
  avr1:{x:640,y:200,w:170,h:80,t:'ATmega128 main board',s:['card detect','SPI to FPGA (altspi)'],d:'v050002 on AMS8E-1 (X2 4.9152 MHz). It detects the MADI card (about 2 s after power-up), relays menu choices to the FPGA and SHARC (TDM_IN_ctl[6], [9], [10]) and talks to the front board over RS-485.'},
  fp:{x:640,y:20,w:170,h:150,t:'32ME-5 front board',s:['ATmega128L @ 4.9152 MHz','ADJUST encoder E1','8-char display','RS-485 ×4, DS26LS32 ×2'],d:'Netlist 32ME-5iss2: encoder on PE4/5/6 (INT4–6) with 1 kΩ/100 nF RC; display data PC0–7, address PG0–4, WR PF1, CE PF0, RD PE7, RST PD6, FL PD7; UART0 → two 75176 on P4 (U16 receives, U15 transmit-only); UART1 → U22/U23 on P7 (4-wire full duplex). It also buffers the LED shift lines: H10 → two DS26LS32 → H3/H4/H5/H7 (DR_LE1–4) and H6.'},
  led:{x:850,y:20,w:150,h:150,t:'4× AMS8E-4 LED boards',s:['8 bars × 22 LEDs','4× TLC5926 (was A6276)','365 Ω → ≈ 50 mA'],d:'Each board: 4 × 16-bit constant-current sinks (64 bits per latch), 4 P-FETs (FDC634P) with 2N4401/2N4403 drivers select which pair is on. 188 LEDs: 80 green, 64 yellow, 40 red, 4 blue (FINAL BOM). R_EXT 365 Ω gives about 18.6 V / 365 Ω ≈ 50 mA per segment (TLC5926 formula ' + '1.24 V × 15 / R_EXT, from the datasheet, which is not in the archive: inferred).'},
  hp:{x:850,y:200,w:150,h:130,t:'Headset / monitor out',s:['CS4334 DAC + NE5532','32ME-5: NE5532 diff amp','68R1 build-out'],d:'AES1 OUT (the selected pair × volume) goes to a CS4334 DAC on AMS8E-1 and arrives at the 32ME-5 P5 balanced. U1 (NE5532) is a differential receiver: 20 kΩ in, 22.1 kΩ feedback with 220 pF → gain 1.105 (+0.87 dB), pole 32.7 kHz; 68.1 Ω build-out to P8 (headset). ±15 V on P6.'},
};
const WIRES=[['madi','h4','8 data + FSYNC + MCK'],['unet','h4','SDOUT0/1, SCLK, LRCLK'],['h4','fpga',''],['aes','fpga','AES RX'],['fpga','dsp','TDM 32 ch'],['dsp','fp','LED shift (H10, differential)'],['fp','led','DR_CLK/DATA/OE/LE1–4'],['avr1','fp','RS-485'],['avr1','fpga','SPI'],['dsp','hp','AES1 OUT'],['fp','hp','']];
function viewBlock(m){
  window.__32meActive=false; let sel='fpga';
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)','<div id="bd"></div>')}${card('Block','<div id="bi"></div>')}</div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1010 345" style="width:100%"><defs><marker id="a32" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#a32)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length), h=24+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.3"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text><text x="${x-33}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${n}</text>`; });
  right.forEach(([p,n],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text><text x="${x+w+33}" y="${yy+4}" font-size="10" fill="var(--accent2)">${n}</text>`; }); return s; }
const res=(x,y,lbl,v,vert)=> vert? `<rect x="${x-5}" y="${y}" width="10" height="30" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${y+12}" font-size="10" fill="var(--ink)">${lbl}</text><text x="${x+9}" y="${y+24}" font-size="10" fill="var(--ink2)">${v}</text>` : `<rect x="${x}" y="${y-5}" width="30" height="10" fill="none" stroke="var(--ink)"/><text x="${x}" y="${y-8}" font-size="10" fill="var(--ink)">${lbl} ${v}</text>`;
const SHEETS=[
  {name:'1 · 32ME-5 control (U14)', note:'From Exported 32ME-5iss2.Net and sheet 1 “CONTROL” of 32ME-5iss2.pdf (drawn P.L., 01/08/2014). Port names follow the ATmega128 TQFP-64 pin-out.', svg:()=>chip(330,50,200,'U14 ATmega128L',[
      ['6 PE4/INT4','SWITCH1'],['7 PE5/INT5','ENCODER1B'],['8 PE6/INT6','ENCODER1A'],['2 PE0/RXD0','CPU_RX'],['3 PE1/TXD0','CPU_TX'],['59 PF2','U16 RE/DE'],['58 PF3','U15 RE/DE'],['27 PD2/RXD1','U23 RO (R64)'],['28 PD3/TXD1','U22 DI'],['30 PD5','U22 RE/DE'],['23/24 XTAL','X2 4.9152 MHz, 27 pF'],['20 RESET','NSRST (R32 10k, C60)'],['54–57 PF7–4','JTAG2 TDI/TDO/TMS/TCK']],[
      ['35–42 PC0–7','DIS_D0–D7'],['33 PG0','DIS_A0'],['34 PG1','DIS_A1'],['43 PG2','DIS_A2'],['18 PG3','DIS_A3'],['19 PG4','DIS_A4'],['60 PF1','WR'],['61 PF0','CE'],['9 PE7','RD'],['31 PD6','RST'],['32 PD7','FL'],['5 PE3 / 29 PD4','DIS_CS2 / DIS_CS3 (no load)'],['48–45 PA3–6','LED_1–4 → H1'],['51/50/49 PA0–2','CLK/DATA/STRB → H1'],['10–17 PB0–7','PB_1–8 via 110 Ω → H1']],'TQFP-64 · 32ME-5 iss2')
    + `<text x="40" y="420" font-size="11" fill="var(--ink2)">E1 encoder: A/B/switch each pulled up by 1 kΩ (R22, R9, R24) and filtered 1 kΩ + 100 nF (R16–R18, C11/C12/C15):</text><text x="40" y="436" font-size="11" fill="var(--ink2)">τ ≈ 100 µs closing, 200 µs opening. H1 (20-pin, DNI) is a spare button/LED port.</text>` },
  {name:'2 · LED shift fan-out', note:'H10 brings the SHARC shift lines differentially from AMS8E-1; two DS26LS32 quad receivers rebuild them and drive five 14-pin meter headers. VLED = VLEDIN (P1) minus three 1N4003 drops.', svg:()=>{
    let s=chip(140,60,170,'U7 DS26LS32',[['2/1','H10-14/13'],['6/7','H10-18/17'],['10/9','H10-20/19'],['14/15','H10-16/15']],[['3','DR_LE → H6-8'],['5','DATA_IN → H3/4/5/6/7-7'],['11','DR_OE → H*-6'],['13','DR_CLK → H*-5']],'')
      + chip(140,250,170,'U6 DS26LS32',[['2/1','H10-2/1'],['6/7','H10-6/5'],['10/9','H10-8/7'],['14/15','H10-4/3']],[['3','DR_LE1 → H3-8'],['13','DR_LE2 → H4-8'],['5','DR_LE3 → H5-8'],['11','DR_LE4 → H7-8']],'');
    ['H3','H4','H5','H7','H6'].forEach((h,i)=>{ const x=600, y=40+i*78; s+=`<rect x="${x}" y="${y}" width="200" height="62" fill="none" stroke="var(--ink)"/><text x="${x+8}" y="${y+16}" font-size="12" font-weight="700" fill="var(--ink)">${h} → AMS8E-4 ${i<4?'#'+(i+1):'(spare)'}</text><text x="${x+8}" y="${y+32}" font-size="10" fill="var(--ink2)">1,2 GND · 3,4 +5V · 5 CLK · 6 OE</text><text x="${x+8}" y="${y+46}" font-size="10" fill="var(--ink2)">7 DATA_IN · 8 ${i<4?'DR_LE'+(i+1):'DR_LE'} · 13,14 VLED</text>`; });
    return s+`<text x="40" y="440" font-size="11" fill="var(--warn)">Issue 1 (HardwareChangesRequired.txt): H3/H4/H5/H7 were mirrored and H5 pins 2/4/6/8 open; fixed by swapping data_in and LE on the meter board.</text>`; } },
  {name:'3 · RS-485 links', note:'Four 75176 transceivers. UART0 is half-duplex on P4 (U16 receive+transmit, U15 transmit-only, its RO pin unconnected); UART1 is full-duplex on P7 (U23 always receiving, RE/DE grounded). 2 kΩ bias resistors on every pair.', svg:()=>
    chip(120,60,160,'U16 75176',[['1 RO','CPU_RX (R63)'],['4 DI','CPU_TX'],['2,3 RE/DE','PF2']],[['6 A','P4-1'],['7 B','P4-2']],'UART0') + chip(120,220,160,'U15 75176',[['1 RO','(open)'],['4 DI','CPU_TX'],['2,3 RE/DE','PF3']],[['6 A','P4-3'],['7 B','P4-4']],'UART0, transmit only')
    + chip(560,60,160,'U22 75176',[['4 DI','PD3 TXD1'],['2,3 RE/DE','PD5']],[['6 A','P7-3'],['7 B','P7-4']],'UART1 out') + chip(560,220,160,'U23 75176',[['1 RO','PD2 RXD1 (R64)'],['2,3 RE/DE','GND']],[['6 A','P7-1'],['7 B','P7-2']],'UART1 in') },
  {name:'4 · Headset receiver (sheet 4)', note:'Sheet 4 “ANALOG AUDIO”. R5/C5 and R13/C10 (output Zobel) are DNI, as are C1/C6. R1/R8 are 0 Ω. The sheet note asks for 470 µF supply caps; the BOM fits 47 µF / 63 V (C8, C9).', svg:()=>{
    let s=''; [0,1].forEach(k=>{ const y=70+k*190, L=k?'RIGHT':'LEFT', rp=k?['R14','R15','R11','R10','R12']:['R6','R7','R3','R2','R4'];
      s+=`<text x="30" y="${y-5}" font-size="11" fill="var(--accent2)">${L}_N (P5-${k?4:2})</text><text x="30" y="${y+45}" font-size="11" fill="var(--accent2)">${L}_P (P5-${k?3:1})</text>`+res(150,y,rp[2],'20K')+res(150,y+40,rp[0],'20K')+res(230,y+55,rp[1],'22K1',true)
      +`<line x1="120" y1="${y}" x2="150" y2="${y}" stroke="var(--ink)"/><line x1="180" y1="${y}" x2="330" y2="${y}" stroke="var(--ink)"/><line x1="120" y1="${y+40}" x2="150" y2="${y+40}" stroke="var(--ink)"/><line x1="180" y1="${y+40}" x2="330" y2="${y+40}" stroke="var(--ink)"/>
        <polygon points="330,${y-20} 330,${y+60} 410,${y+20}" fill="var(--panel2)" stroke="var(--ink)"/><text x="345" y="${y+4}" font-size="11" fill="var(--ink)">−</text><text x="345" y="${y+44}" font-size="11" fill="var(--ink)">+</text><text x="352" y="${y+24}" font-size="10" fill="var(--ink2)">U1${k?'B':'A'} NE5532</text>
        <line x1="300" y1="${y}" x2="300" y2="${y-50}" stroke="var(--ink)"/><line x1="300" y1="${y-50}" x2="430" y2="${y-50}" stroke="var(--ink)"/>${res(335,y-50,rp[3],'22K1')}<text x="335" y="${y-60}" font-size="10" fill="var(--ink2)">∥ ${k?'C7':'C2'} 220p</text><line x1="430" y1="${y-50}" x2="430" y2="${y+20}" stroke="var(--ink)"/>
        <line x1="410" y1="${y+20}" x2="470" y2="${y+20}" stroke="var(--ink)"/>${res(470,y+20,rp[4],'68R1')}<line x1="500" y1="${y+20}" x2="560" y2="${y+20}" stroke="var(--ink)"/><text x="565" y="${y+24}" font-size="11" fill="var(--accent2)">${L} → P8-${k+1} (headset)</text>`; });
    return s+`<text x="30" y="440" font-size="11" fill="var(--ink2)">Gain = 22.1k / 20k = 1.105 (+0.87 dB) differential; the + leg divider 22.1/(20+22.1) keeps it balanced. Feedback pole 1/(2π·22.1k·220p) = 32.7 kHz. Supplies ±15 V from P6.</text>`; } },
  {name:'5 · Option header H4', note:'i64 pin-out from i64_MADI_OEM_Pin_Assignment_20120509.pdf; uNet wiring from unet-standard-to-ams81-connection.xlsx (X102 on the uNet bottom → H4 on AMS8E-1 top). Net names are from the AMS8E-1 ISS5 IPC netlist (Ams8e-1iss5-net.ipc); the H4 pin for each uNet wire is read from the sheet’s column sketch.', svg:()=>{
    const pins=[[1,'GNDD'],[2,'DATA1_OUT (to 00..07)'],[3,'GNDD'],[4,'DATA2_OUT'],[5,'GNDD'],[6,'DATA3_OUT'],[7,'GNDD'],[8,'DATA4_OUT'],[9,'+5V'],[10,'DATA5_OUT'],[11,'+5V'],[12,'DATA6_OUT'],[13,'+5V'],[14,'DATA7_OUT'],[15,'+5V'],[16,'DATA8_OUT (to 56..63)'],[17,'DATA1_RESERVED'],[18,'DATA1_IN (from 00..07)'],[19,'DATA2_RESERVED'],[20,'DATA2_IN'],[21,'DATA3_RESERVED'],[22,'DATA3_IN'],[23,'DATA4_RESERVED'],[24,'DATA4_IN'],[25,'DATA5_RESERVED'],[26,'DATA5_IN (32..39)'],[27,'DATA6_RESERVED'],[28,'DATA6_IN (40..47)'],[29,'FSYNC_IN (1FS from module)'],[30,'DATA7_IN'],[31,'FSYNC_OUT'],[32,'DATA8_IN (56..63)'],[33,'MCLK_IN (256FS from module)'],[34,'MCLK_OUT']];
    const un={14:'SDIN1 (yellow)',16:'SDIN0 (orange)',26:'SDOUT1 (brown)',28:'SDOUT0 (black)',29:'LRCLK (blue)',33:'SCLK (green)',1:'GND (white)',9:'5V (red)'};
    let s=`<text x="40" y="30" font-size="12" font-weight="700" fill="var(--ink)">H4 — i64 MADI signal</text><text x="560" y="30" font-size="12" font-weight="700" fill="var(--ink)">uNet wire ${inf}</text>`;
    for (let i=0;i<17;i++){ const y=50+i*22; [0,1].forEach(c=>{ const p=pins[i*2+c]; const x=c?470:330; s+=`<rect x="${x-8}" y="${y-8}" width="16" height="16" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x}" y="${y+4}" font-size="9" text-anchor="middle" fill="var(--ink)">${p[0]}</text>`; s+= c? `<text x="${x+14}" y="${y+4}" font-size="10" fill="var(--ink2)">${p[1]}</text>${un[p[0]]?`<text x="640" y="${y+4}" font-size="10" fill="var(--accent2)">${un[p[0]]}</text>`:''}` : `<text x="${x-14}" y="${y+4}" font-size="10" text-anchor="end" fill="var(--ink2)">${p[1]}</text>${un[p[0]]?`<text x="40" y="${y+4}" font-size="10" fill="var(--accent2)">${un[p[0]]}</text>`:''}`; }); }
    return s; } },
];
function viewSchem(m){
  window.__32meActive=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from the netlist, BOM and module sheets; not the Altium drawings)', `<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">Original: RD24 … PCB/32ME-5iss2/32ME-5iss2.pdf (4 sheets, title block “AES OUTPUT PCB · SLM SERIES · 32ME-5”) and the Altium .SchDoc files.</p>`);
  const draw=()=>{ m.querySelector('#t2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 460" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[i].svg()}<text x="850" y="452" text-anchor="end" font-size="10" fill="var(--ink2)">32ME · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
const MAIN_STEPS=[['main_loop: VUMeterGet ×32','VU +3 dB correction (r13 = −6), clip 0..255'],['translate_meter_results','vu_data[] | pk_data[] → 22 LED bits; add sel_1..4'],['… add PAIR_SELECTED, ERRORINDICATOR','selected_pair from TDM_IN_ctl[9]; madiChanNotActive from [6]'],['shifter (if timer-1 flag set)','one pair of one board: shift 64 bits, latch, OE'],['read TDM_IN_ctl[9], [10], [6]','pair, volume → output_gain_new, channel-active bits']];
function viewSoft(m){
  window.__32meActive=true;
  m.innerHTML=`<div class="grid2">${card('SHARC main loop + interrupts (lit = running at the playhead)','<div id="fl"></div>')}${card('Front-panel menu state machine (RotaryEncoder.c)','<div id="fsm"></div>')}</div>
   <div class="grid2">${card('The LED word for the followed meter (shift_data, 32 bits)','<div id="word"></div>')}${card('FPGA smux1x4_i2sx32: how a frame is unpacked','<div id="smux"></div>')}</div>
   ${card('How the knob does things','<div id="btn"></div>')}`;
  SIM.on('time',()=>{ const t=SIM.t, mx=muxAt(t);
    const inIsr = ((t*FS)%1) < 6e-6*FS, inShift = (t-mx.t0) < 30e-6, k = inIsr? -1 : inShift? 3 : Math.floor(((t*7919)%1)*3);
    let s=`<svg viewBox="0 0 520 330" style="width:100%">`;
    MAIN_STEPS.forEach((p,j)=>{ const y=10+j*52, on=(j===k); s+=`<rect x="20" y="${y}" width="330" height="42" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${y+17}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="30" y="${y+33}" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${p[1]}</text>`; });
    s+=`<rect x="370" y="20" width="140" height="70" rx="6" fill="${inIsr?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="380" y="40" font-size="11" font-family="var(--mono)" fill="${inIsr?'#fff':'var(--ink)'}">sport0_isr</text><text x="380" y="58" font-size="10" fill="${inIsr?'#fff':'var(--ink2)'}">every 20.83 µs</text><text x="380" y="74" font-size="10" fill="${inIsr?'#fff':'var(--ink2)'}">VUMeterCalc ×32</text>
      <rect x="370" y="110" width="140" height="70" rx="6" fill="${inShift?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="380" y="130" font-size="11" font-family="var(--mono)" fill="${inShift?'#fff':'var(--ink)'}">tmzl_svc</text><text x="380" y="148" font-size="10" fill="${inShift?'#fff':'var(--ink2)'}">every ${SIM.fmtDur(K.MUX)}</text><text x="380" y="164" font-size="10" fill="${inShift?'#fff':'var(--ink2)'}">sets ustat2 bit 0</text>
      <text x="20" y="290" font-size="10.5" fill="var(--ink2)">Board ${mx.board+1}, pair ${mx.pair+1} (mux_count2 = ${mx.k&15}).</text><text x="20" y="306" font-size="10.5" fill="var(--warn)">Main-loop step lengths are not measured; the highlight between interrupts is illustrative (inferred).</text></svg>`;
    m.querySelector('#fl').innerHTML=s;
    const st=(id,x,y,l)=>`<g><rect x="${x}" y="${y}" width="96" height="34" rx="17" fill="${D.menu===id?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+48}" y="${y+21}" text-anchor="middle" font-size="11" fill="${D.menu===id?'#fff':'var(--ink)'}">${l}</text></g>`;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 470 230" style="width:100%">${st(1,20,20,'Volume')}${st(2,180,20,'Mon Sel')}${st(3,340,20,'Grp Sel')}${st(5,100,150,'Source')}${st(4,280,150,'SR Sel')}
      <text x="120" y="32" font-size="10" fill="var(--ink2)">press →</text><text x="280" y="32" font-size="10" fill="var(--ink2)">press →</text><text x="250" y="80" font-size="10" fill="var(--ink2)">press (Grp Sel skipped if SR≠0 / AES) → Volume</text>
      <text x="20" y="130" font-size="10" fill="var(--ink2)">hold 1 s (madi_present) →</text><text x="205" y="172" font-size="10" fill="var(--ink2)">press (MADI) →</text><text x="20" y="215" font-size="10" fill="var(--ink2)">10 s idle (ROTENCTIMEOUTTIME) → Volume · rotation shows the value for 3 s</text></svg>`;
    const sm=D.scopeMeter, w=shiftWord(sm,t); const bits=w.toString(2).padStart(32,'0').split('');
    const nm=i=>{ const b=31-i; if (b>=10) return 'segment '+(32-b)+' ('+SEG[31-b][1]+')'; return {9:'ERR',8:'PAIR SEL',3:'sel_3',2:'sel_4',1:'sel_1',0:'sel_2'}[b]||'—'; };
    m.querySelector('#word').innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:2px">${bits.map((b,i)=>`<span class="mono small" title="bit ${31-i}: ${nm(i)}" style="display:inline-block;width:22px;text-align:center;border:1px solid var(--line);border-radius:3px;background:${b==='1'?(31-i>=10?'color-mix(in srgb,var(--accent) 40%,transparent)':'color-mix(in srgb,var(--warn) 40%,transparent)'):'transparent'}">${b}</span>`).join('')}</div>
      <p class="small">Meter ${sm+1}: bits 31…10 = the 22 segments (VU fills from bit 31 down; the PPM is a single dot), bit 9 ERRORINDICATOR, bit 8 PAIR_SELECTED, bits 3…0 the row selects sel_1…sel_4 that the code ORs into channels 8i+0…3. Two 32-bit words (one pair) are shifted per call, then the board's latch enable pulses.</p>`;
    m.querySelector('#smux').innerHTML=`<table class="kv"><tr><th>smux_sel</th><th>lines used</th><th>channels out</th><th>how</th></tr>
      <tr class="${D.sr===0?'hl':''}"><td class="mono">2'b00 SMUX1</td><td>8</td><td>64 at 48k</td><td>each line shifts into its own 256-bit inregN</td></tr>
      <tr class="${D.sr===1?'hl':''}"><td class="mono">2'b01 SMUX2</td><td>4</td><td>32 at 96k</td><td>line pairs fill bits 255..128 and 127..0 of one register, 32 MCK each half</td></tr>
      <tr class="${D.sr===2?'hl':''}"><td class="mono">2'b10 SMUX4</td><td>2</td><td>16 at 192k</td><td>four 64-bit quarters per register</td></tr></table>
      <p class="small">madiChanActive[k] = inreg0[230] | inreg0[198] … bit 6 of two adjacent 32-bit slots (MADI’s channel-active flag position in the i64 slot, ${inf}).</p>`;
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator</th><th>Firmware path</th><th>Effect</th></tr>
      <tr><td>Turn (Volume)</td><td class="mono small">INT5/6 → RotaryEncoder → volume_setup_level → PROCESS_VOLUME_INFORMATION</td><td class="small">TDM_IN_ctl[10] → volume[256] → output_gain ramp (0.01/sample)</td></tr>
      <tr><td>Turn (Mon Sel)</td><td class="mono small">currentPair ±2 (0…30)</td><td class="small">selected_pair → blue LED; that pair to AES1 OUT and the headset</td></tr>
      <tr><td>Turn (Grp Sel)</td><td class="mono small">currentGroup ^= 1 (only if currentSampleRate == 0)</td><td class="small">FPGA group mux: MADI 1–32 ⇄ 33–64</td></tr>
      <tr><td>Turn (SR Sel)</td><td class="mono small">currentSampleRate 0…2</td><td class="small">FPGA smux_sel; group forced to 0 above 50 kHz</td></tr>
      <tr><td>Turn (Source)</td><td class="mono small">rotEncToggleBit(currentSource) if madi_present</td><td class="small">AES ⇄ MADI input selector</td></tr>
      <tr><td>Press</td><td class="mono small">INT4 → debounce → rotEncSwitchSetState → state++</td><td class="small">next menu title</td></tr>
      <tr><td>Hold 1 s</td><td class="mono small">Timer3 rotEncCounter == ROTENCHOLDTIME</td><td class="small">Source menu (MADI card present)</td></tr></table>`;
  });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__32meActive=false;
  m.innerHTML=card('What the 32ME is up to: findings', `<ol>
   <li><b>Artwork 2026|59: rear panel now from ${SIM.src('ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr','32ME-REARPANEL_Feb212013.cdr')} (2013-02-21|46).</b> The sheet keeps a full off-page copy of the rear with its hole guides, so the layout is no longer inferred (assets/32me-rear.svg): IEC inlet and nine vent slots on the left, MADI as an optical duplex cut-out (OUT, IN) plus two BNCs (OUT, IN), two small holes both labelled SYNC, a 6-way Phoenix ANALOG MONITOR OUTPUT and four DB25s (AES 1-4, 5-8 over 9-12, 13-16). The earlier drawing showed four BNCs (MADI IN/OUT, SYNC IN/OUT); the art has no SYNC BNCs, and the two SYNC holes are read here as lock LEDs ${inf}. The monitor legend reads R on the left and L on the right, each “+ − G”. There is no RJ45 or option opening, so the 32ME-N network port had no place on the 2013 rear. The rear legend says “90-230 VAC, 1A S.B.”; nine other rear CDRs (2012–2013, with backups) sit in the same OBSOLETE tree.</li>
   <li><b>The 32ME-N link is confirmed, not just inferred.</b> The README calls the uNet/AMS8E-1 link a guess from the folder name. But <span class="mono">unet-standard-Parameters.xlsx</span> has a WBS column next to the defaults: <span class="mono">ModelName uNet2500 → 32ME-N</span>, <span class="mono">ManufacturerName Archwave → Ward-Beck Systems</span>, and the two analog streams renamed <span class="mono">32ME_AES_IN_1_4</span> / <span class="mono">32ME_AES_IN_5_8</span>.</li>
   <li><b>The uNet was wired as a stand-in MADI module.</b> The harness goes to <span class="mono">H4</span>, which the AMS8E-1 ISS5 BOM lists as the 2×17 PROLEX header used for the i64. Only 8 wires have colours (5V, GND, SDIN0/1, SDOUT0/1, SCLK, LRCLK). MCLK, SPI, UART and GPIO are listed but not wired, so the uNet must run on its own PTP clock and the 32ME slaves to its LRCLK. The sketch lands LRCLK and SCLK on H4 29/33 (FSYNC_IN_I64, MCLK_IN_I64 in the AMS8E-1 IPC netlist) and SDOUT0/1 on 28/26 (DATA6/5_IN_I64). The uNet’s I8S format (8 slots per line at 256FS) is the i64’s format, so its 16 inputs appear as MADI channels 33–48. The odd pins 17–27, blank on DirectOut’s sheet, are DATAn_RESERVED on the WBS board.</li>
   <li><b>“2 x 34 pin header” is 34 pins.</b> The i64 pin-out sheet and README say 2×34, but the pins stop at 34 and DirectOut’s email calls it a “2x17 pinheader”. The BOM agrees (H2X17).</li>
   <li><b>An assignment instead of a compare.</b> RotaryEncoder.c, Grp Sel: <span class="mono">if((currentSampleRate == 0) &amp;&amp; (currentSource = 1))</span>. Turning the knob in Grp Sel forces the source to MADI. It is hidden in practice because the menu is skipped in AES mode.</li>
   <li><b>A toggle whose result is thrown away.</b> AMS8-5.c, Grp Sel: <span class="mono">thirtyTwoMEAudioStatus = 0; ams8ToggleBit(thirtyTwoMEAudioStatus, GROUPSELREGBIT);</span>. The return value is never stored. RotaryEncoder.c later does the work properly with <span class="mono">currentGroup = rotEncToggleBit(…)</span>.</li>
   <li><b>Pair-select down uses the wrong variable.</b> AMS8-5.c checks <span class="mono">encoder_action2 == DOWN</span> while every other test uses the parameter <span class="mono">encoderActionx</span>.</li>
   <li><b>Selector LEDs on the display bus.</b> AMS8-5.h drives the 1–32 / 33–64 LEDs on PC0 and PC1. On the 32ME-5 board those pins are DIS_D0 and DIS_D1 (netlist), the display data bus. That is a leftover from the AMS8-5 board this code came from.</li>
   <li><b>The comment says SR Select, the code says Source.</b> The header comment says holding the knob enters the Sample Rate menu. Since “Adam Add - Sept. 8, 2015” it enters Source first, and SR Sel only follows when the source is MADI.</li>
   <li><b>The sample-rate factor is the operator’s job.</b> DirectOut: the i64 always outputs 64 ch at 1FS and you cannot trust channel status for the factor. The 01AV0200 notes then explain the wrong-setting cases (doubled or averaged meters). This plugin reproduces both. The RME test table (ObservationsClockTable) also shows 32k, 64k and 128k sources “not recognized”.</li>
   <li><b>A copy slip in SMUX2.</b> smux1x4_i2sx32.v, SMUX2 branch: <span class="mono">inreg4[127:1] &lt;= inreg0[126:0]</span> and <span class="mono">inreg5..7[255:129] &lt;= inreg4[254:128]</span>. The unused registers 4–7 are fed from registers 0 and 4 instead of themselves, so at 96k the “empty” upper channels carry copies of channels 1–8 rather than silence.</li>
   <li><b>The meter constants were tuned by hand.</b> vumeter.asm keeps the old values in comments. The shipped VU integrates 40 dB in 0.60 s (τ ≈ 65 ms on the squared signal). That is a mean-square average, not a 300 ms VU needle. The PPM attack is 40 dB in 8.3 ms, and the decay is 24 dB in 3.6 s, slower than the BBC’s 2.8 s.</li>
   <li><b>The display multiplex is 1/16.</b> Timer 1 (12000 cycles at 49.152 MHz = 244 µs) steps through 4 boards × 4 pairs. Each LED is on 6.25 % of the time at about 50 mA (365 Ω R_EXT), so about 3 mA average.</li>
   <li><b>The 32ME-5 is labelled as something else.</b> Its title block reads “AES OUTPUT PCB · SLM SERIES” and the issue-1 BOM header “SLM SERIES”. The template was copied from the SLM project. Sheet 1 notes “Encoder 2 and its connections removed”.</li>
   <li><b>The capacitor note was not followed.</b> Sheet 4 asks for 470 µF supply caps. The BOM has 47 µF / 63 V (C8, C9).</li>
   <li><b>The AMS8E-4 notes and BOM disagree on the selector LEDs.</b> The production notes say the four selector LEDs are yellow L178, L181, L188, L137, left DNI. The FINAL BOM fits them as <b>blue</b> L178, L181, L185, L188, and L137 is a green bar segment. The older P-CAD BOM also shows auto-incremented values “1K6 … 1K16”; the FINAL BOM has twelve 1K5 resistors.</li>
   <li><b>The 32ME-5 issue-1 faults</b> (HardwareChangesRequired.txt): mirrored meter headers, X2 touching C60, standoffs near tracks, H5 even pins open, and the board too long for the lid. The issue-2 netlist has H5-2/4/6/8 connected.</li>
   <li><b>Privacy.</b> ClockDescription.txt contains third-party email signatures. This plugin quotes only the technical content.</li></ol>`)
  + card('Assumptions in this simulation', `<ul class="small">
   <li>Panel colour WBS black, white ink, LED bar order (10 green, 8 yellow, 4 red from the bottom), and which extra LED is blue or red: ${inf}.</li>
   <li>The H4 pins of the uNet wires (read from the spreadsheet’s column sketch; the net names behind them are from the IPC netlist), and the function of the three small round apertures: ${inf}.</li>
   <li>SHARC CLKIN 24.576 MHz (X1 on AMS8E-1); the timer-0 comment “generates 24 MHz” with period 2 supports it.</li>
   <li>The meter model is the exact vumeter.asm recursion on the sampled test signal. MADI SMUX artefacts are modelled at the level of the release-note examples, not bit by bit.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>32ME-MADI/ClockDescription.txt, i64_MADI_OEM_Pin_Assignment_20120509.pdf · 32ME-N/unet-standard-*.xlsx</li><li>RD24 … PCB/32ME-5iss2/Exported 32ME-5iss2.Net, 32ME-5iss2.pdf · obsolete 32ME PCB_s/32ME-5iss1-BOM.xls, HardwareChangesRequired.txt</li>
   <li>RD22-MADI/Hardware/i64MADI/smux1x4_i2sx32.v, ObservationsClockTable.xlsx · Software/01AV0200 firmware package/(notes, SHARC v050000, Atmel Front Panel V010200)</li><li>RD22-MADI/MECHANICAL/OBSOLETE/PrototypeV1_obsOct182012/32ME-FRONTPANEL FINAL.pdf · SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr</li>
   <li>AMS8E - #Master/AMS8E-4 - #Master/AMS8E-4 FINAL BOM.xlsx, AMS8E-4-PCAD.csv, Production Notes.docx, AMS8E-4PANEL.TSM · AMS8E-1 ISS5 - ALTIUM.csv</li></ul>`);
}

SIM.register({
  footnotes:[
    {text:'The 2013 rear silk has MADI on an optical duplex cut-out and two BNCs, and no SYNC BNCs; two small holes are both labelled SYNC.', src:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr'},
    {text:'The ANALOG MONITOR OUTPUT legend puts R on the left and L on the right, each as + − G, on a single 6-way Phoenix cut-out.', src:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr'},
    {text:'The 2013 rear art has no RJ45 or option-card opening, so the uNet2500 of the 32ME-N had no rear port on this panel.', src:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr'},
    {text:'The rear sheet holds the panel twice: a copy with hole guides placed off the page and the WHITE plate on the page.', src:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr'},
    {text:'Rear mains legend: “90-230 VAC, 1A S.B. CAUTION: DISCONNECT POWER BEFORE SERVICING OR REPLACING THE FUSE” plus “PLEASE REFER TO MANUAL” beside a warning triangle.', src:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr'},
    {text:'The SILK tree holds about 26 CorelDRAW files for the 32ME panels and chroma filter (2012–2013), many as Backup_of_ copies, all under OBSOLETE except ConceptFrontAll.cdr.', src:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE'}],
  id:'32me', name:'32ME · MADI / network 32-meter audio monitor (2013|46)', duration:1,
  product:'32ME', year:2013, family:'Monitors, meters & tools', folder:'32ME-N',
  summary:'A 1RU, 32-meter audio monitor for 16 AES pairs, a 64-channel MADI stream (DirectOut i64 module, 32ME-MADI) or a RAVENNA network feed (Archwave uNet, 32ME-N). One knob drives the menus. A SHARC runs the VU and PPM ballistics and multiplexes four AMS8E-4 LED boards.',
  highlights:['Real 2012|45 panel artwork with 704 live LEDs','vumeter.asm ballistics run per sample','MADI SMUX mismatch shown the way the release notes describe','i64 and uNet header wiring','Five firmware bugs and leftovers'],
  depth:'Hardware model',
  stepUnits:[{label:'1 MADI frame (20.8 µs)',period:()=>1/FS},{label:'1 LED mux step (244 µs)',period:()=>K.MUX},{label:'1 full LED refresh (3.9 ms)',period:()=>16*K.MUX},{label:'1 ms (meter sample)',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (one burst cycle)'],[0.02,'20 ms'],[16*K.MUX,'one LED refresh (3.9 ms)'],[0.001,'1 ms (one RTP packet)'],[1/FS*2,'2 MADI frames (42 µs)'],[64/K.MCK,'two 32-bit slots (5.2 µs)']],
  defaultZoom:1,
  init(){ MKEY=''; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: using the 32ME',render:viewTut},
    {id:'second',label:'One second, frame by frame',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Software',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
