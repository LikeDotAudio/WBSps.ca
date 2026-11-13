/* =====================================================================
   RD22-MADI — the R&D project that put MADI (AES10) into the AMS8x monitor platform
   and became the 32ME (Ward-Beck Systems, 2012|45 – 2015|48)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in ENGINEERING - 2016 RD FILES/RD22-MADI/ unless noted):
   - Software/01AV0200 firmware package/Altera/V050200 - use 48k_96k_working/   (the release FPGA)
       smux_to_i2s.v, i2s_selector.v, spicontrol.v, shift_in32.vhd, altpll2.vhd, plla.vhd,
       AMS81.bdf (instance + net names), AMS81.sdc, 48k_96k_working.qsf (EP4CE30F23I7, pins)
   - Software/FPGA/PROGRESS/progress.txt.txt (v100 … v213 log) and every PROGRESS/<snapshot>/*.qsf (DEVICE lines)
   - Software/FPGA/PROGRESS/v213/smux1Gen.vhd (test generator), Software/FPGA/v050201/madi_receiver.v
   - Software/FPGA/fpgaResourcesUsedFor32MECompile.bmp, …ForAMS81Compile.bmp (Quartus flow summaries)
   - Software/01AV0200…/Atmel Main Board/v050002/v200w.c, altspi.c, alteraCom.c, AMS8E1Iss3.c, UARTAt128.c
   - Software/01AV0200…/Atmel Front Panel/V010200/Main.c, RotaryEncoder.c/.h
   - Hardware/i64MADI/ClockDescription.txt, i64_MADI_OEM_Pin_Assignment_20120509.pdf,
       i64MADI_OEM_timing.tif, ObservationsClockTable.xlsx, IMG_3721.jpg
   - Hardware/MADIReceiverDesign/11 - MADI - 20 years old and feeling fit.pdf (125 Mb/s NRZI,
       4B/5B, channel word layout, sync coding, 56 ch ±12 % varispeed, coax line network)
   - Hardware/NRZI_Decoder/* , SPECIFICATIONS/NRZI_encodeDecode.txt, Hardware/FPGASpecs/FPGAResourceComparison.xlsx
   - ProjectManagement/RD22-MADI_ProjectGantt.xlsx, RD22TasksList.xlsx · PCB/32ME-5/…/32me5HardwareBugs.txt
   - SILK/OBSOLETE/FEB282013/FrontPanel/32ME-M1 FRONT PANEL_Feb212013.cdr and
       …/RearPanel/32ME-REARPANEL_Feb212013.cdr (assembled views) + …/ChromaFilter/32ME-CHROMATFILTER_Feb192013.cdr
       → assets/rd22-madi-front.svg, -rear.svg, -overlay.svg (Inkscape/libcdr, cut between the crop marks,
       17.24″ × 1.648″ drawn as 3448 × 330; artwork pass 2026|59 — replaces the older -white/-green PNG cuts)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';

/* ---------------- constants from the sources ---------------- */
const K = {
  LINE: 125e6,          // AES10 serial rate, NRZI (MADI paper)
  MCK_PER_FS: 256,      // i64 MCK = 256FS, 8 channels × 32-bit slots per line (ClockDescription.txt)
  PLL_MUL: 2,           // altpll2 clk1 = MCLK_IN_I64 × 2 → net "pllout_i64_12M" (really 24.576 MHz at 48 k)
  PLL_MUL0: 8,          // altpll2 clk0 = × 8 → pllout_i64_98M
  AVR_XTAL: 4.9152e6,   // AMS8E-1 X2 (ams8e plugin, BOM)
  LOOP: 4.0e-3,         // main-board while(1) pass — INFERRED (see Findings)
  SPI_BIT: 2.5e-6,      // alteraRWByte bit time — INFERRED from the 4.9152 MHz AVR
  HOLD:1.0, ROT_TO:3.0, IDLE_TO:10.0,   // ROTENCHOLDTIME / ROTENCROTATETIMEOUT / ROTENCTIMEOUTTIME
};
/* 4B/5B code (FDDI table used by AES10). The paper names "4B/5B encoder"; the table itself is the
   standard one and is not printed in the archive. */
const B4B5 = [0x1E,0x09,0x14,0x15,0x0A,0x0B,0x0E,0x0F,0x12,0x13,0x16,0x17,0x1A,0x1B,0x1C,0x1D];
const JK = [1,1,0,0,0, 1,0,0,0,1];         // J = 11000, K = 10001 (sync symbol pair)
/* LED scale: 22 segments, thresholds in dBFS from ams81_vu_data.dat as decoded in the 32me plugin (index/2 dB below FS) */
const SEG_DB = [-57,-47,-41,-37,-32,-30,-28,-26,-24,-23,-22,-21,-20,-19,-18,-17,-16,-14,-12,-10,-8,-6];
const SEGCOL = i => i<10? '#36d05a' : i<18? '#ffd23a' : '#ff3b2f';
const MENU = {1:' Volume ',2:'Mon Sel ',3:'Grp Sel ',4:' SR Sel ',5:' Source '};       // Main.c strings
const MENU_ID = {1:'ROTARYENCODER_VOLUME_STATE',2:'ROTARYENCODER_PAIRSELECTOR_STATE',3:'ROTARYENCODER_GROUPSELECTOR_STATE',4:'ROTARYENCODER_SAMPLERATESELECTOR_STATE',5:'ROTARYENCODER_SOURCESELECTOR_STATE'};
const SR_TXT = ['30-50kHz','60-100k ','120-200k'];                                       // mainProcessSRSelect()
/* i64 behaviour measured with an RME HDSPe MADI source (ObservationsClockTable.xlsx, 4 Jul 2012) */
const OBS = {32000:{fs:47800, mck:'12.4M', note:'not recognised: holds the previous value (47.8k)'}, 44100:{fs:44100, mck:'11.3M'}, 48000:{fs:48000, mck:'12.4M'}};
const BUILDS = [
  ['v100–v105','May–Jun 2012','EP1C6Q240C7','smux1Gen + syncOneShot + smux1x4_i2sx16','MADI cores; v101 data generator; v103/v104 SCLK one MCK too long fixed'],
  ['vmilestone1','2012','EP1C6Q240C7','smux1x4_i2sx16','all SMUX1 audio mapped to 1–64'],
  ['v200–v203','Jul 2012','EP1C6Q240C7','smux1x4_i2sx16','SMUX2 / SMUX4; v202 data delayed one clock'],
  ['v205','17 Aug 2012','EP4CE40F23C6','+ 16 × AES RX + SRC','first Cyclone IV build; 22 % of a CE40 (compile screenshot)'],
  ['vmilestone2 / v207','Nov 2012','EP1C6Q240C7','+ spicontrol (regs 0x00/0x01)','channel-active to main-board Atmel (v104+)'],
  ['v209–v212','Dec 2012 – Apr 2013','EP4CE40F23C6','AMS8E-1 iss5 pinout','v210 volume in FPGA, v211 SDC, v212 AES out 1'],
  ['v213','5 Apr 2013','EP4CE30F23I7','smux1x4_i2sx16','"This version should be final!"'],
  ['V050200 / v050201','9 Dec 2015','EP4CE30F23I7','smux_to_i2s + i2s_selector','01AV0200 release, "use 48k_96k_working"'],
];

/* ---------------- device + bench state ---------------- */
const D = {
  link: true,           // MADI coax plugged into MADI IN
  fs: 48000,            // MADI source frame rate set on the RME
  ch: 64,               // 64 or 56 channels (i64 jumper Aux 1-2)
  rate: 48,             // source audio rate kHz → SMUX1/2/4 inside a 48 k frame
  frame96: false,       // 96 k MADI frame (Aux 3-4 / auto-detect): 32 ch at 96 k, i64 rearranges to SMUX2
  prog: 'tones',
  mute: new Set(),      // source channels switched off (ON/OFF bit = 0)
  opt: 'i64',           // what is on H4: 'i64' module or 'unet' (32ME-N)
  sr: 0, grp: 0, source: 1, pair: 0, vol: 30, menu: 1, showValue: false,
  line: 0,              // H4 data line shown in the scopes
  meter: 0,             // meter followed on the timeline
  log: [], spiLast: null,
};
const PROGS = {tones:'Tone per channel (RME playlist): ch n at 250·(1+n mod 8) Hz, −10 … −32 dBFS', lineup:'Line-up: 1 kHz at −20 dBFS on every channel', ident:'Channel ident: the 24-bit word holds the channel number (smux1Gen style)'};

/* ---------------- source audio ---------------- */
function factorIn(){ return D.frame96? 2 : D.rate/48; }               // samples per channel per 1FS frame
function nAudio(){ return D.frame96? D.ch/2 : D.ch/(D.rate/48); }      // audio channels carried
function chLevel(a){ if (D.prog==='lineup') return -20; if (D.prog==='ident') return 20*Math.log10((a+1)/8388607); return -10 - 2*(a%12); }
function chFreq(a){ return D.prog==='lineup'? 1000 : 250*(1+(a%8)); }
function chActive(a){ return D.link && a < nAudio() && !D.mute.has(a); }
function sampleOf(a, n){            // 24-bit two's complement, source sample n of audio channel a
  if (!chActive(a)) return 0;
  if (D.prog==='ident') return a+1;
  const R = 48000*factorIn();
  const v = Math.pow(10, chLevel(a)/20)*Math.sin(2*Math.PI*chFreq(a)*n/R);
  return Math.round(v*8388607) & 0xFFFFFF;
}
const csBit = k => [1,0,1,0,0,0,0,1][k%192] || 0;   // channel status byte 0 = 0x85 (pro, 48 k) LSB first — INFERRED
function parity(x){ x^=x>>>16; x^=x>>>8; x^=x>>>4; x&=15; return (0x6996>>x)&1; }
/* the i64's internal slot for line l, slot s, 1FS frame k: MSB…LSB(24), FrameStart, ChannelActive, SubFrameA, BlockStart, V U C P */
function slotWord(l, s, k){
  if (D.opt==='unet'){                          // 32ME-N: uNet SDOUT0/1 on DATA5/6_IN_I64 = MADI slots 33–48
    if (l!==4 && l!==5) return 0;
    const a = (l-4)*8+s; const v = Math.round(Math.pow(10,(-12-2*(a%8))/20)*Math.sin(2*Math.PI*500*(1+a%4)*k/48000)*8388607) & 0xFFFFFF;
    return (v<<8)>>>0;                          // low byte zero — INFERRED (uNet TDM carries audio only)
  }
  const c = 8*l+s, f = factorIn(), a = Math.floor(c/f), j = c%f, n = k*f+j;
  if (!D.link || c >= (D.frame96? 2*D.ch/2 : D.ch)) return 0;
  const act = chActive(a)? 1:0, au = sampleOf(a, n);
  let w = (au<<8) | ((c===0?1:0)<<7) | (act<<6) | ((c%2===0?1:0)<<5) | ((k%192===0?1:0)<<4) | (csBit(k)<<1);
  w |= parity(w & 0xFE);                        // P over the status bits and audio — INFERRED (AES3 even parity)
  return w>>>0;
}
function i64Bit(l, k, b){ return (slotWord(l, b>>5, k)>>>(31-(b&31)))&1; }
/* the same channel as it travels on the coax: AES10 bit order (bit 0 first) */
function linkWord(c, k){
  const f = D.frame96? 1 : factorIn();
  if (!D.link) return 0;
  const a = D.frame96? c : Math.floor(c/f), n = D.frame96? k : k*f + c%f;
  const act = chActive(a)?1:0, au = sampleOf(a, n);
  let w = (c===0?1:0) | (act<<1) | ((c%2===0?1:0)<<2) | ((k%192===0?1:0)<<3) | (au<<4) | (csBit(k)<<30);
  let p=0; for (let i=4;i<31;i++) p ^= (w>>>i)&1; w |= p<<31;
  return w>>>0;
}

/* ---------------- the coax: frames, 4B/5B symbols, JK syncs ---------------- */
function linkGeom(){
  const fsL = D.frame96? 2*D.fs : D.fs, N = D.frame96? D.ch/2 : D.ch;
  const P = K.LINE/(10*fsL);                     // 10-bit symbol pairs per frame
  const need = 4*N + 1;                          // channels (4 pairs each) + at least one JK
  return { fsL, N, P, fits: need <= Math.floor(P), maxFs: K.LINE/(10*need) * (D.frame96?0.5:1), syncPerFrame: Math.floor(P) - 4*N, util: 4*N/P };
}
function frameOfPair(p, G){ let k = Math.floor(p/G.P); while (Math.floor((k+1)*G.P) <= p) k++; while (Math.floor(k*G.P) > p) k--; return k; }
/* what is on the wire at absolute bit index i */
function wireAt(i, G){
  G = G || linkGeom();
  const p = Math.floor(i/10), k = frameOfPair(p, G), o = i - 10*Math.floor(k*G.P);
  if (o < 40*G.N && G.fits){
    const c = Math.floor(o/40), q = o%40, nib = Math.floor(q/5), sb = q%5;
    const w = linkWord(c, k), v = (w>>>(4*nib))&15, code = B4B5[v];
    return { k, c, nib, sb, v, code, bit: (code>>(4-sb))&1, sync:false };
  }
  return { k, c:-1, sync:true, bit: JK[(o-40*G.N)%10], sb:(o-40*G.N)%10 };
}

/* ---------------- FPGA: cycle port of smux_to_i2s.v (V050200) ---------------- */
const MASK256 = (1n<<256n)-1n;
let FCACHE = {key:'', res:null};
function fpgaFrame(k0){
  const sr = D.sr, key = [k0, sr, D.fs, D.ch, D.rate, D.frame96, D.prog, [...D.mute].join(','), D.opt, D.link].join('|');
  if (FCACHE.key === key) return FCACHE.res;
  let s192=0,s96=0,ff48=0,s48=0, r1=0,r2=0, cnt=0, fs0=0, fs1=0, lr=1;
  const smux = new Array(8).fill(0n), buff = new Array(8).fill(0n), i2s = new Array(32).fill(0n);
  const dout = new Array(32).fill(0), chA = new Array(32).fill(0);
  const ev = [], latches = [], sclkInt = ()=> sr===2? s192 : sr===1? s96 : s48;
  let loadAt = -1, copyBuff = null;
  const seg = (B,i)=> (B>>BigInt(224-32*i)) & 0xFFFFFFFFn;
  function load(){
    if (sr===0){ for (let j=0;j<8;j++) for (let q=0;q<4;q++){ const top=(buff[j]>>BigInt(192-64*q))&((1n<<64n)-1n); i2s[4*j+q]=(i2s[4*j+q]&((1n<<192n)-1n))|(top<<192n); } }
    else if (sr===1){ for (let j=0;j<8;j++){ const B=buff[j];
        i2s[2*j]   = (i2s[2*j]&((1n<<128n)-1n))   | (seg(B,0)<<224n)|(seg(B,2)<<192n)|(seg(B,1)<<160n)|(seg(B,3)<<128n);
        i2s[2*j+1] = (i2s[2*j+1]&((1n<<128n)-1n)) | (seg(B,4)<<224n)|(seg(B,6)<<192n)|(seg(B,5)<<160n)|(seg(B,7)<<128n); } }
    else { for (let j=0;j<8;j++){ const B=buff[j]; i2s[j]=(seg(B,0)<<224n)|(seg(B,4)<<192n)|(seg(B,1)<<160n)|(seg(B,5)<<128n)|(seg(B,2)<<96n)|(seg(B,6)<<64n)|(seg(B,3)<<32n)|seg(B,7); } }
  }
  for (let f=k0-2; f<=k0; f++) for (let n=0; n<512; n++){
    const nl = n<256? 0 : 1;
    if (lr===1 && nl===0){ for (let l=0;l<8;l++) buff[l]=smux[l]; if (f===k0) copyBuff = buff.slice(); }   // always @(negedge madi_lrclk_in)
    lr = nl;
    const din = []; for (let l=0;l<8;l++) din.push(i64Bit(l, f, n>>1));   // i64 changes data on rising MCK
    const o192 = s192, oInt = sclkInt();
    if (r1===1 && r2===0){ s192=0; s96=0; ff48=0; s48=0; }                 // posedge madi_mclk_in: divider reset on FSYNC rise
    else { const a=1-s192, b=s192?1-s96:s96, c=s96?1-ff48:ff48, d=ff48?1-s48:s48; s192=a; s96=b; ff48=c; s48=d; }
    if (o192===1 && s192===0) for (let l=0;l<8;l++) smux[l] = ((smux[l]<<1n)|BigInt(din[l])) & MASK256;   // negedge sclk_192k
    const nInt = sclkInt();
    if (oInt===0 && nInt===1){ fs1=fs0; fs0=lr; }                          // posedge sclk_internal: fsync_ff
    if (oInt===1 && nInt===0){                                              // negedge sclk_internal
      const fsync = (!fs0 && fs1)? 1:0, oc = cnt;
      if ((oc&31)===26){ for (let i=0;i<32;i++) chA[i]=dout[i]; if (f>=k0-1) latches.push({f, n, oc, ca:chA.slice()}); }
      if (fsync){ cnt=0; load(); if (f===k0) loadAt=n; }
      else { cnt=(cnt+1)&63; for (let i=0;i<32;i++){ dout[i]=Number((i2s[i]>>255n)&1n); i2s[i]=((i2s[i]<<1n)|(i2s[i]&1n))&MASK256; } }
      if (f>=k0-1) ev.push({f, n, cnt, lrout:(cnt>>5)&1, d:dout.slice(), fsync});
    }
    r2=r1; r1=lr;                                                           // negedge madi_mclk_in
  }
  // decode: words of each I2S line in frame k0, starting at the fsync load (counter c holds bit c-1)
  const per = sr===0? 64 : sr===1? 128 : 256, words = [];
  const i0 = ev.findIndex(e=>e.f===k0 && e.fsync);
  for (let l=0;l<32;l++){ const bits=[]; for (let c=1;c<=per;c++){ const e=ev[i0+c]; bits.push(e && !(e.fsync)? e.d[l] : (e? e.d[l] : 0)); }
    const ws=[]; for (let q=0;q<per/32;q++){ let w=0; for (let b=0;b<32;b++) w = (w*2 + bits[32*q+b]); ws.push(w>>>0); } words.push(ws); }
  const res = { ev, latches, words, per, loadAt, i0, copyBuff, sclkT: (sr===2?2:sr===1?4:8) };
  FCACHE = {key, res};
  return res;
}
/* expected word for I2S line L, word q of frame k (from the source, through the documented mapping) */
function expectedWord(L, q, k){
  const sr = D.sr;
  if (sr===0){ const j=L>>2, w=(L&3)*2+q; return slotWord(j, w, k); }
  if (sr===1){ if (L>15) return null; const j=L>>1, base=(L&1)*4, order=[0,2,1,3]; return slotWord(j, base+order[q], k); }
  if (L>7) return null; const order=[0,4,1,5,2,6,3,7]; return slotWord(L, order[q], k);
}

/* ---------------- what each meter shows (i2s_selector + SMUX mapping) ---------------- */
function meterSlots(m){                          // MADI slots (0..63) feeding meter m, in time order
  const g = (D.sr===0)? D.grp : 0;
  if (D.sr===0){ const L = (m>>1) + 16*g; return [2*L + (m&1)]; }
  if (D.sr===1){ const j=m>>2, side=(m>>1)&1, lr=m&1; const base=8*j+side*4+lr*2; return [base, base+1]; }
  if (m>=16) return [];                          // 192 k: only buff0..7 are loaded
  const j=m>>1, lr=m&1; return [8*j+lr*4, 8*j+lr*4+1, 8*j+lr*4+2, 8*j+lr*4+3];
}
function slotToAudio(c){                          // which source audio channel a slot carries (or null)
  if (D.opt==='unet') return (c>=32 && c<48)? {a:c-32, unet:true} : null;
  const f=factorIn(); if (!D.link || c >= D.ch) return null; return {a:Math.floor(c/f), j:c%f};
}
function meterInfo(m){
  const slots = meterSlots(m); if (!slots.length) return {db:null, note:'not loaded at this SR Sel (buffers 8–31 stay stale)', ok:false};
  const src = slots.map(slotToAudio);
  if (src.some(s=>!s)) return {db:null, note:'slot '+(slots[0]+1)+' carries nothing', ok:false};
  const as = [...new Set(src.map(s=>s.a))];
  const lev = a => src[0].unet? (-12-2*(a%8)) : (chActive(a)? chLevel(a) : null);
  const dbs = as.map(lev).filter(v=>v!==null);
  const db = dbs.length? Math.max(...dbs) - 3 : null;   // VU of a sine ≈ peak − 3 dB — INFERRED ballistics
  const right = src.every((s,i)=> s.unet || (s.j===i % factorIn() && as.length===1)) && factorIn()===slots.length;
  const lbl = src[0].unet? `uNet ${src[0].a+1} (MADI slot ${slots[0]+1})` : as.length===1? `${factorIn()>1?D.rate+'k ':''}ch ${as[0]+1}` : `mix of ch ${as.map(a=>a+1).join(' + ')}`;
  return {db, note: lbl + (right? '' : (src[0].unet? '' : ' — SR Sel does not match the source')), ok:right, as};
}
/* ERR LED: main-loop alteraRead(0x00/0x01) samples channel_active at whatever phase the loop lands on */
function loopStart(p){ let h = Math.sin(p*12.9898)*43758.5453; h -= Math.floor(h); return p*K.LOOP + h*0.0003; }  // pass jitter INFERRED
function latchPhases(){ const r = fpgaFrame(5), per=512; return r.latches.filter(x=>x.f===5).map(x=>({ph:x.n/per, ca:x.ca})); }
function chActiveAt(t){                             // value of channel_active[31:0] in the FPGA at time t
  const ls = latchPhases(); if (!ls.length) return new Array(32).fill(0);
  const ph = (t*D.fs) % 1; let cur = ls[ls.length-1];
  for (const x of ls) if (x.ph <= ph) cur = x;
  // the latch at a given phase carries frame-relative data; content is frame-invariant except for audio bits
  return cur.ca;
}
function readAt(t){ const p = Math.max(0, Math.floor(t/K.LOOP)); let tr = loopStart(p)+0.9*K.LOOP; if (tr>t) tr = loopStart(Math.max(0,p-1))+0.9*K.LOOP; return {t:tr, ca: chActiveAt(tr)}; }
function errLed(pair, t){                           // pair 0..15 on the panel
  if (!(D.opt==='unet' || D.link) || D.source!==1) return D.source===1;
  const g = (D.sr===0)? D.grp : 0, L = pair + 16*g;
  const ca = readAt(t).ca;
  return ca[L]===0;                                  // ~madiChanActive → ALTERA_BUFFER_out[26]/[27] → SHARC ERRORINDICATOR
}
function regs(t){ const ca = readAt(t).ca, g=(D.sr===0)?D.grp:0; let r0=0, r1=0; for (let i=0;i<8;i++){ r0|=ca[16*g+i]<<i; r1|=ca[16*g+8+i]<<i; } return [r0, r1]; }
function statusByte(){ return (D.grp&1) | ((D.sr&3)<<1) | ((D.source&1)<<3); }       // mainAppend32MEAudioStatusByte()

/* ---------------- display ---------------- */
function volTxt(){ const db=D.vol-61; return D.vol===0? '  Mute  ' : ('  '+(db>0?'+':'')+db+' dB      ').slice(0,8); }
function displayText(){
  if (!D.showValue) return MENU[D.menu];
  switch(D.menu){ case 1: return volTxt(); case 2: return MENU[2];
    case 3: return D.grp? 'ch 33-64' : 'ch  1-32'; case 4: return SR_TXT[D.sr]; case 5: return D.source? '  MADI  ' : '  AES3  '; }
  return '        ';
}

/* ---------------- user actions → firmware path ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t, name, trace:tr, disp:displayText()}); if (D.log.length>50) D.log.length=50; SIM.refresh(); }
const grpAllowed = ()=> D.source===1 && D.sr===0;
const send = tr => { const b=statusByte();
  tr(`UARTV2TransmitPacket(currentPairx, currentLevelx, mainAppend32MEAudioStatusByte(…)) → status byte 0x${b.toString(16).padStart(2,'0')} = group ${b&1}, SR ${(b>>1)&3}, source ${(b>>3)&1}`);
  tr(`Main board: UART0_translate → thirtyTwoMEAudioStatus = rx_buffer[5] → ALTERA_SORT puts it in ALTERA_BUFFER_out[79] → ALTERA_read_write bit-bangs 80 bytes → shift_in32 q[7:0] → SR_sel = q[2:1] = 2'b${['00','01','10','11'][D.sr]}, madi_group_select = q[0] = ${D.grp}`); };
const A = {
  turn(dir){ act(`Turn ADJUST ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    tr(`rotEncDownExternalInterrupt_isr (INT5) → rotDirectionx = ${dir>0?'ROTENCUP':'ROTENCDOWN'} → rotEncFunction(…, ${MENU_ID[D.menu]})`);
    switch(D.menu){
      case 1: { const o=D.vol; D.vol=Math.max(0,Math.min(76,D.vol+dir)); tr(`currentLevel ${o} → ${D.vol} (LEVELMINDEFAULT 0 … LEVELMAXDEFAULT 76); PROCESS_VOLUME_INFORMATION → “${volTxt()}”`); tr('v210 and later: the volume is applied in the FPGA (progress log); the meters do not change'); break; }
      case 2: { const o=D.pair; D.pair = dir>0? (D.pair>=30?0:D.pair+2) : (D.pair<=0?30:D.pair-2); tr(`currentPair ${o} → ${D.pair} (CURRENTPAIRMAX 30, step 2) → rx_buffer[1] & 0x7F = pairSelect; bit 7 = thirtyTwoGroupSelect`); break; }
      case 3: { if (D.sr===0 && D.source===1){ const o=D.grp; D.grp^=1; tr(`if((currentSampleRate == 0) && (currentSource = 1)) → rotEncToggleBit(currentGroup, BIT0): ${o} → ${D.grp}`); tr(`i2s_selector: madi_group_select = ${D.grp} → aes_data_out = madi_aes_data[${D.grp?'31:16':'15:0'}] → meters show MADI ch ${D.grp?'33–64':'1–32'}; channel_active[15:0] = madi_channel_active[${D.grp?'31:16':'15:0'}]`); }
        else if (D.sr===0){ D.grp^=1; D.source=1; tr('(currentSource = 1) is an assignment, not a compare: the source is forced to MADI and the group toggles (Findings)'); }
        else { D.grp=0; tr('currentSampleRate ≠ 0 → currentGroup = 0: above 50 kHz only 32 channels exist'); } break; }
      case 4: { if (D.source===1){ const o=D.sr; D.sr = dir>0? (D.sr>=2?0:D.sr+1) : (D.sr<=0?2:D.sr-1); if (D.sr!==0) D.grp=0; tr(`currentSampleRate ${o} → ${D.sr} (“${SR_TXT[D.sr]}”, mainProcessSRSelect)`);
          const fm = factorIn(), fs_ = [1,2,4][D.sr]; if (fm!==fs_) tr(`<b style="color:var(--warn)">The source is SMUX${fm} (${D.frame96?'96 k frame':D.rate+' kHz'}) but SR_sel selects SMUX${fs_}: the meters move but show the wrong slots</b>`); else tr(`SR_sel = SMUX${fs_}: smux_to_i2s now unpacks ${[64,32,16][D.sr]} channels onto ${[32,16,8][D.sr]} I2S lines`); }
        else tr('currentSource ≠ 1: the SR menu does nothing on AES'); break; }
      case 5: { const o=D.source; D.source^=1; tr(`madi_present → rotEncToggleBit(currentSource, BIT0): ${o?'MADI':'AES3'} → ${D.source?'MADI':'AES3'}`); tr('Main board: AMS8CheckSourceSelect → AMS8SOURCESELPORT pin + RESET_SHARC() (“Adam Add - Sept. 10, 2015”)'); break; }
    }
    D.showValue=true; send(tr); tr(`Display “${displayText()}” for ROTENCROTATETIMEOUT, then the title (serviceSelectionTimeOut)`);
  }); },
  press(){ act('Press ADJUST', tr=>{
    tr('INT4 (SWITCH1) → externalInterrupt_isr → debounce (Timer1 COMPB) → released before ROTENCHOLDTIME');
    const o=D.menu;
    if (D.menu===5) D.menu = D.source===1? 4 : 1; else if (D.menu>=3) D.menu=1; else if (D.menu===2 && !grpAllowed()){ D.menu=1; tr('Grp Sel is skipped: SR above 50 kHz or source AES'); } else D.menu++;
    D.showValue=false; tr(`rotaryEncoder_currentstate ${o} → ${D.menu} (${MENU_ID[D.menu]}) → SIEMENS8_lcd_display(“${MENU[D.menu].trim()}”)`);
  }); },
  hold(){ act('Press and hold ADJUST (1 s)', tr=>{ tr('rotEncTimerOverFlow_isr: rotEncCounter == ROTENCHOLDTIME with the switch down → holdServiceFlag = YES');
    if (D.opt==='i64'||D.opt==='unet'){ D.menu=5; tr('madi_present (PINA bit 5) → ROTARYENCODER_SOURCESELECTOR_STATE'); } else D.menu=1; D.showValue=false; tr(`Display “${MENU[D.menu].trim()}”`); }); },
  idle(){ act('Leave the knob for 10 s', tr=>{ D.menu=1; D.showValue=false; tr('rotEncCounter == ROTENCTIMEOUTTIME → SWITCHTIMEOUTYES → ROTARYENCODER_VOLUME_STATE “ Volume ”'); }); },
  plug(on){ act(on?'Connect MADI IN (coax)':'Disconnect MADI IN', tr=>{ D.link=on;
    tr(on? 'i64 (XC3S700AN) recovers the 125 Mbit/s NRZI stream, finds the JK sync symbols and the channel-0 flag (bit 0), and starts FSYNC/MCK on H4 pins 29/33' : 'i64 loses the stream: every slot\'s ON/OFF bit (bit 1, “channel active”) reads 0');
    tr('smux_to_i2s latches the ON/OFF bit at sclk_counter[4:0] == 26 → channel_active[31:0] → i2s_selector → spicontrol regs 0x00/0x01');
    tr(`Next main-loop pass: madiChanActive[0..1] = alteraRead(0x00/0x01) → ALTERA_BUFFER_out[26/27] = ~madiChanActive → SHARC → ERR LEDs ${on?'off where channels are live':'on for every pair'}`); }); },
  setFs(v){ act('RME frame rate → '+(v/1000)+' kHz', tr=>{ D.fs=v; const o=OBS[v]; const G=linkGeom();
    tr(`On the coax: ${G.P.toFixed(2)} symbol pairs per frame, ${G.N} channels need ${4*G.N} → ${G.fits? G.syncPerFrame+' JK sync pairs per frame':'<b style="color:var(--bad)">does not fit: '+G.N+' channels need '+(40*G.N)+' bits, only '+Math.floor(10*G.P)+' available</b>'}`);
    if (o) tr(`i64 measured (ObservationsClockTable.xlsx): fsync ${o.fs/1000} kHz, mclk ${o.mck}${o.note?' — '+o.note:''}`); else tr('i64 1FS follows any MADI frame from 30 to 50 kHz (ClockDescription.txt)'); }); },
  setCh(n){ act(`i64 jumper Aux 1-2 ${n===56?'fitted (56 ch)':'open (64 ch)'}`, tr=>{ D.ch=n; tr(`Frame now carries ${n} channels; ${n===56?'slots 57–64 have ON/OFF = 0 → ERR LEDs on meters 25–32 in “ch 33-64” (task list: “56 chan mode, 8 channels are inactive which is indicated by error LED”)':'all 64 slots active'}`); }); },
  setRate(r){ act(`RME project rate → ${r} kHz`, tr=>{ D.rate=r; D.frame96=false; tr(`The RME sends ${r} kHz audio in a 48 k frame as SMUX${r/48}: ${64/(r/48)} channels, ${r/48} consecutive samples in adjacent slots`); tr('The i64 cannot tell: “It would not be safe enough to rely only on channel status… set the factor manually” (Stephan, DirectOut) → set SR Sel'); }); },
  setFrame96(on){ act(on? 'RME → 96 k MADI frame':'RME → 48 k MADI frame', tr=>{ D.frame96=on; if (on) D.rate=96; tr(on? 'Link frames at 96 kHz with 32 channels (28 in 56 mode). The i64 detects the 96 k frame and rearranges it to SMUX2 at 1FS on H4':'Back to 48 k frames'); }); },
  setProg(p){ act('Source programme → '+p, tr=>{ D.prog=p; tr(PROGS[p]); }); },
  toggleMute(a){ act(`${D.mute.has(a)?'Switch on':'Switch off'} source channel ${a+1}`, tr=>{ if (D.mute.has(a)) D.mute.delete(a); else D.mute.add(a);
    tr(`AES10 bit 1 (ON/OFF) of channel ${a+1} → ${D.mute.has(a)?0:1}; i64 slot bit 25 (“Channel Active”)`);
    tr('smux_to_i2s samples bit 25 of the LEFT word at counter 26 and of the RIGHT word at counter 58 (sclk_counter[4:0] == 5\'b11010 matches both): channel_active alternates within each frame');
    tr('The main loop reads 0x00/0x01 at an arbitrary phase, so a pair with only one channel off makes its ERR LED flicker (scrub the ERR lane)'); }); },
  setOpt(o){ act(o==='unet'?'Fit the uNet2500 on H4 (32ME-N)':'Fit the i64 MADI module on H4', tr=>{ D.opt=o; if (o==='unet'){ D.sr=0; D.grp=1; D.source=1; }
    tr(o==='unet'? 'uNet SDOUT0/1 → H4 pins 26/28 = DATA5_IN_I64 / DATA6_IN_I64 (FPGA H7 / J4); LRCLK/SCLK → pins 29/33 = FSYNC_IN_I64 / MCLK_IN_I64 → smux_data4/5 = MADI slots 33–48 → set Grp Sel “ch 33-64”':'i64 drives all eight DATAn_IN_I64 lines'); }); },
  spiRead(addr){ act(`alteraRead(0x0${addr})`, tr=>{ const r = spiSim(addr, regs(SIM.t)[addr]); D.spiLast={addr, r};
    tr(`alteraReadWrite(0x${(addr|0x80).toString(16)}, 0): ALTERA_CS_HIGH (PC1), 16 × (MOSI PC2, SCLK PC3 high/low, read MISO PG1)`);
    tr(`spicontrol: cnt 0 → rw = 1; cnt 7 → address = 0x0${addr} → shift_out = madiChanActivex[${addr?'15:8':'7:0'}] = 0x${r.val.toString(16).padStart(2,'0')}`);
    tr(`Bits clocked back MSB first → idata = 0x${r.read.toString(16).padStart(2,'0')} ${r.read===r.val?'(matches)':'(MISMATCH)'} → madiChanActive[${addr}]`); }); },
  reset(){ Object.assign(D,{link:true,fs:48000,ch:64,rate:48,frame96:false,prog:'tones',opt:'i64',sr:0,grp:0,source:1,pair:0,vol:30,menu:1,showValue:false,line:0,meter:0,log:[],spiLast:null}); D.mute=new Set(); FCACHE.key=''; SIM.refresh(); },
};
/* port of spicontrol.v for one 16-clock read transaction */
function spiSim(addr, regval){
  const tx = [((addr|0x80)>>7)&1, ...[6,5,4,3,2,1,0].map(b=>((addr|0x80)>>b)&1), 0,0,0,0,0,0,0,0];
  let cnt=0, rw=0, address=0, shiftIn=0, shiftOut=0, fsd=0; const wave=[]; let read=0;
  for (let i=0;i<16;i++){
    const sdin = tx[i];
    if (cnt===0){ rw=sdin; cnt++; }
    else if (cnt===7){ address=((shiftIn&0x3F)<<1)|sdin; cnt++; if (rw===1){ if (address===0||address===1) shiftOut=regval&0xFF; } }
    else if (cnt===15){ cnt=0; if (rw===1) fsd=(shiftOut>>7)&1; }
    else { shiftIn=((shiftIn<<1)|sdin)&0xFF; fsd=(shiftOut>>7)&1; shiftOut=(shiftOut<<1)&0xFF; cnt++; }
    if (i>=8) read = (read<<1)|fsd;               // Atmel samples MISO after the falling edge
    wave.push({sdin, sdout:fsd, cnt});
  }
  return {val:regval&0xFF, read:read&0xFF, wave, address};
}
/* port of smux1Gen.vhd (v101–v213 test generator): line 1 over one frame */
function smux1Gen(frames){
  let cnt=0, tog=0, out=0, fso=1; let d=0; const bits=[], fsv=[];
  const load = v => { d=v; };
  for (let f=0; f<frames; f++) for (let e=0;e<256;e++){
    if (cnt===0xFF){ tog^=1; cnt=0; fso=0; out=tog; }
    else if (cnt===0x7F){ cnt++; fso=1; out=tog; }
    else if (cnt>=0xF7){ cnt++; load(1); out=tog; }
    else if ((cnt&0x1F)>=0x18 && cnt<0xE0){ const v=((cnt>>5)&7)+2; cnt++; load(v); out=tog; }
    else { out=(d>>23)&1; d=(d<<1)&0xFFFFFF; cnt++; }
    bits.push(out); fsv.push(fso);
  }
  return {bits, fsv};
}

/* ================================================================
   PANELS — vector artwork from the 21 Feb 2013 CorelDRAW sheets (RD22 SILK/OBSOLETE/FEB282013),
   converted with Inkscape/libcdr and cut between the crop marks: 17.24″ × 1.648″ = 3448 × 330 here (200 px/in).
   Front and rear use the sheet's assembled view (cut-outs + both ink plates); the chromatic filter's print
   (32ME-CHROMATFILTER_Feb192013.cdr) is registered on the 16 panel holes. Every control below sits on those coordinates.
   ================================================================ */
const ART = {
  FRONT: 'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/32ME-M1 FRONT PANEL_Feb212013.cdr',
  REAR:  'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr',
  FILTER:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/ChromaFilter/32ME-CHROMATFILTER_Feb192013.cdr',
  CONCEPT:'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/ConceptFrontAll.cdr',
  PROTO: 'ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/ChromaFilter/OBSOLETE/PROTOTYPE_V1/32ME-CHROMATFILTER-FINALCURVE.cdr',
};
const WIN0 = [87, 835, 1583, 2331], WIN_W = 600;               // the four filter windows (front sheet)
const COL = [133, 200, 273, 340, 443, 509, 583, 650];          // meter columns in window 1: either side of each pair's SEL/ERR legend
const PAIRX = [166, 306, 476, 616];                            // SEL/ERR legend centres (filter print)
const meterX = m => (WIN0[m>>3]-87) + COL[m&7];
const pairX = p => (WIN0[p>>2]-87) + PAIRX[p&3];
const segY = i => 281.7 - i*12.01;                             // centre of the dB-scale figure i (−34 … +14) on the filter
const HOLES = [50,724,798,1472,1546,2220,2294,2968];          // 16 holes at y 64.8 / 264.8 beside the channel-number legends
function artSrc(which){
  return which==='rear' ? `Rear artwork: ${SIM.src(ART.REAR,'32ME-REARPANEL_Feb212013.cdr')} (21 Feb 2013|46), assembled view, converted to SVG. The caution text and “MADE IN CANADA” are re-set (libcdr lost their alignment).`
    : `Front artwork: ${SIM.src(ART.FRONT,'32ME-M1 FRONT PANEL_Feb212013.cdr')} (21 Feb 2013|46) with the filter print from ${SIM.src(ART.FILTER,'32ME-CHROMATFILTER_Feb192013.cdr')} (19 Feb 2013|46), converted to SVG and registered on the 16 holes. Live Arial text in the source (no curve version of this issue).`;
}
function frontSVG(t, opts){
  opts = opts||{};
  let s = `<svg viewBox="0 0 3448 330" role="img" aria-label="32ME front panel (RD22 CorelDRAW artwork, 21 Feb 2013)" style="width:100%;border-radius:6px;display:block">
   <defs><filter id="rdg" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="3448" height="330" rx="8" fill="var(--dev)"/>
   ${WIN0.map(x=>`<rect x="${x}" y="10" width="${WIN_W}" height="310" fill="#0a0a0c"/>`).join('')}`;
  let lit = '';
  for (let m=0; m<32; m++){
    const x = meterX(m), mi = meterInfo(m), n = (D.source===1 && mi.db!==null)? SEG_DB.filter(v=>mi.db>=v).length : 0;
    for (let i=0;i<22;i++){ const on = i<n; const r=`<rect x="${x-11}" y="${(segY(i)-4.5).toFixed(1)}" width="22" height="9" rx="1.5" fill="${on?SEGCOL(i):'#19191b'}"/>`; if (on) lit+=r; else s+=r; }
    if (D.meter===m) s += `<rect x="${x-16}" y="22" width="32" height="272" fill="none" stroke="var(--accent2)" stroke-width="3" stroke-dasharray="6 5"/>`;
  }
  s += `<g filter="url(#rdg)">${lit}</g>`;
  for (let p=0; p<16; p++){ const px = pairX(p), err = errLed(p, t), sel = D.pair===2*p;
    if (sel) s += `<rect x="${px-17}" y="228" width="34" height="13" rx="3" fill="#4aa8ff" opacity=".85" filter="url(#rdg)"/>`;
    if (err) s += `<rect x="${px-17}" y="263" width="34" height="13" rx="3" fill="#ff3b2f" opacity=".9" filter="url(#rdg)"/>`;
    s += `<rect x="${px-18}" y="226" width="36" height="52" fill="transparent"><title>Pair ${p+1}: SEL ${sel?'lit':'off'}, ERR ${err?'lit':'off'} — backlit legends on the filter (LED behind each word ${'inferred'})</title></rect>`; }
  s += `<image href="${ASSET}rd22-madi-front.svg" width="3448" height="330" preserveAspectRatio="none"/>`;
  s += `<image href="${ASSET}rd22-madi-overlay.svg" width="3448" height="330" preserveAspectRatio="none" opacity=".9"/>`;
  for (let m=0; m<32; m++){ const x=meterX(m), mi=meterInfo(m); s += `<rect class="mbar" data-m="${m}" x="${x-16}" y="20" width="32" height="272" fill="transparent" style="cursor:pointer"><title>Meter ${m+1}: ${mi.note}. Click to follow it on the timeline.</title></rect>`; }
  HOLES.forEach(x=>[64.8,264.8].forEach(y=>{ s += `<circle cx="${x}" cy="${y}" r="12" fill="transparent"><title>Ø0.117″ hole in a 0.183″ ring beside a channel-number legend — no LED in the firmware; probably a fixing for the meter board behind the filter (inferred)</title></circle>`; }));
  s += `<rect x="3039" y="55" width="371" height="101" rx="2" fill="#060807" stroke="#222"/><g filter="url(#rdg)">${SIM.dotMatrix(displayText(), 3048, 80, 7.4, '#ff5a3a', 'rgba(255,90,58,.08)')}</g>`;
  s += `<g class="enc" style="cursor:pointer"><circle cx="3084" cy="225" r="64" fill="transparent"/><circle cx="3084" cy="225" r="44" fill="#121314" stroke="#3a3d40" stroke-width="3"/><circle cx="3084" cy="225" r="31" fill="#232527"/>
      <line x1="3084" y1="225" x2="${3084+28*Math.sin(D.vol/76*5)}" y2="${225-28*Math.cos(D.vol/76*5)}" stroke="#ddd" stroke-width="4"/><title>ADJUST (PUSH): left third = turn CCW, centre = press, right third = turn CW; wheel turns</title></g>
    <circle cx="3373.5" cy="234.5" r="36" fill="#0b0b0c" stroke="#555" stroke-width="3"/><circle cx="3373.5" cy="234.5" r="12" fill="#000"><title>HEADSET jack (Ø0.38″ hole on the sheet)</title></circle>
    <circle cx="3224" cy="184.7" r="12" fill="transparent"><title>Unlegended hole between ADJUST and HEADSET (same size as the 16 meter-side holes)</title></circle>`;
  if (opts.hot) s += opts.hot;
  return s + '</svg>';
}
function rearSVG(){
  const bnc = (x, on, cls, tip)=>`<g class="${cls||''}" style="${cls?'cursor:pointer':''}"><circle cx="${x}" cy="137" r="44" fill="#a8913f" stroke="#5e4d1c" stroke-width="3"/><circle cx="${x}" cy="137" r="26" fill="#d8c27a"/><circle cx="${x}" cy="137" r="8" fill="#6b5410"/>
     ${on?`<rect x="${x-18}" y="175" width="36" height="60" fill="#2b5f9e"/><rect x="${x-30}" y="155" width="60" height="32" rx="7" fill="#3a74b8"/>`:''}<title>${tip}</title></g>`;
  const db25 = (x,y)=>`<rect x="${x-164}" y="${y-47}" width="328" height="94" rx="14" fill="#9aa0a6" stroke="#55595c" stroke-width="3"/><path d="M${x-140} ${y-30} h280 l-15 60 h-250 z" fill="#1d1f22"/>`;
  const led = (x,y,on,tip)=>`<circle cx="${x}" cy="${y}" r="10" fill="${on?'#36d05a':'#1c2a1f'}" ${on?'filter="url(#rdg2)"':''}><title>${tip}</title></circle>`;
  return `<svg viewBox="0 0 3448 330" role="img" aria-label="32ME rear panel (RD22 CorelDRAW artwork, 21 Feb 2013)" style="width:100%;border-radius:6px;display:block">
   <defs><filter id="rdg2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="3448" height="330" rx="8" fill="var(--dev)"/>
   <image href="${ASSET}rd22-madi-rear.svg" width="3448" height="330" preserveAspectRatio="none"/>
   <rect x="96" y="70" width="172" height="120" rx="8" fill="#0a0b0c" stroke="#333"><title>IEC inlet + fuse module (216 × 244 px cut-out on the sheet, “90-230 VAC, 1A S.B.”)</title></rect><rect x="132" y="96" width="100" height="66" rx="6" fill="#16181a"/><rect x="132" y="206" width="100" height="56" rx="4" fill="#202326"/>
   <g><rect x="1222" y="113" width="184" height="70" rx="6" fill="#16181a" stroke="#444"/><rect x="1240" y="126" width="62" height="44" rx="4" fill="${D.link?'#2a2f33':'#0c0d0e'}"/><rect x="1326" y="126" width="62" height="44" rx="4" fill="#0c0d0e"/><title>MADI optical OUT / IN (204 × 85 px cut-out under the MADI bracket). Not modelled: this bench uses the coax input.</title></g>
   ${led(1452,154,D.link,'SYNC (beside the optical port) — lock LED on the i64 (inferred from the legend)')}${led(1826,154,D.link,'SYNC (beside the coax IN) — lock LED (inferred from the legend)')}
   ${bnc(1550,false,'','MADI OUT (Ø0.50″ hole, drill crosshair on the sheet) — i64 loop-through')}${bnc(1726,D.link,'rmadi','MADI IN (Ø0.50″ hole) — click to plug or unplug the coax')}
   <rect x="1992" y="214" width="216" height="67" rx="5" fill="#1f8a45" stroke="#0e4d25" stroke-width="3"><title>ANALOG MONITOR OUTPUT terminal block: R (+ − G) L (+ − G)</title></rect>${[0,1,2,3,4,5].map(i=>`<circle cx="${2010+i*36}" cy="247" r="11" fill="#0d3a1c"/>`).join('')}
   ${db25(2543,86)}${db25(3013,86)}${db25(2543,243)}${db25(3013,243)}
   ${D.opt==='unet'?`<rect x="940" y="100" width="140" height="110" rx="6" fill="#123a6b" stroke="#5aa9e6" stroke-width="3"><title>uNet2500 RJ45 (32ME-N) — not on this sheet; position inferred</title></rect><rect x="970" y="125" width="80" height="60" fill="#0a0b0c"/>`:''}
  </svg>`;
}
function bindPanel(root){
  const enc = root.querySelector('.enc');
  if (enc){ enc.addEventListener('click', e=>{ const r=enc.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; if (x<0.36) A.turn(-1); else if (x>0.64) A.turn(1); else A.press(); });
    enc.addEventListener('wheel', e=>{ e.preventDefault(); A.turn(e.deltaY<0?1:-1); }, {passive:false}); }
  root.querySelectorAll('.mbar').forEach(b=> b.addEventListener('click', ()=>{ D.meter=+b.dataset.m; SIM.refresh(); }));
  const rm = root.querySelector('.rmadi'); if (rm) rm.addEventListener('click', ()=>A.plug(!D.link));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">ADJUST</span><button data-a="l">⟲ turn</button><button data-a="p">press</button><button data-a="r">turn ⟳</button><button data-a="h">hold 1 s</button><button data-a="i">idle 10 s</button>
    <span class="small muted" style="margin-left:6px">Keys: J K L · H hold</span></div>`;
}
function benchHTML(){
  const sel=(id,opts,v)=>`<select id="${id}">${opts.map(([k,l])=>`<option value="${k}" ${String(k)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center" class="small">
    <label>Frame rate ${sel('bfs',[[48000,'48 kHz'],[44100,'44.1 kHz'],[32000,'32 kHz (RME)'],[50000,'50 kHz (i64 limit)'],[54000,'54 kHz (+12.5 %)']],D.fs)}</label>
    <label>Audio ${sel('brate',[[48,'48 k (SMUX1)'],[96,'96 k (SMUX2)'],[192,'192 k (SMUX4)']],D.rate)}</label>
    <label><input type="checkbox" id="bf96" ${D.frame96?'checked':''}> 96 k frame</label>
    <label>Channels ${sel('bch',[[64,'64 (Aux 1-2 open)'],[56,'56 (Aux 1-2 fitted)']],D.ch)}</label>
    <label>Programme ${sel('bprog',Object.keys(PROGS).map(k=>[k,k]),D.prog)}</label>
    <label>H4 option ${sel('bopt',[['i64','i64 MADI (32ME-MADI)'],['unet','uNet2500 (32ME-N)']],D.opt)}</label>
    <label>Switch off source ch <input type="number" id="bmute" min="1" max="64" value="5" style="width:58px"></label><button id="bmb">toggle</button>
    <button id="bplug">${D.link?'Unplug':'Plug'} MADI IN</button><button id="brst">Reset bench</button></div>`;
}
function bindBench(m){
  const q=s=>m.querySelector(s); if (!q('#bfs')) return;
  q('#bfs').onchange=e=>A.setFs(+e.target.value); q('#brate').onchange=e=>A.setRate(+e.target.value); q('#bf96').onchange=e=>A.setFrame96(e.target.checked);
  q('#bch').onchange=e=>A.setCh(+e.target.value); q('#bprog').onchange=e=>A.setProg(e.target.value); q('#bopt').onchange=e=>A.setOpt(e.target.value);
  q('#bmb').onclick=()=>A.toggleMute(Math.max(0,Math.min(63,(+q('#bmute').value||1)-1))); q('#bplug').onclick=()=>A.plug(!D.link); q('#brst').onclick=()=>A.reset();
}
function bindControls(m){ const map={l:()=>A.turn(-1),p:()=>A.press(),r:()=>A.turn(1),h:()=>A.hold(),i:()=>A.idle()}; m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>map[b.dataset.a]()); }
document.addEventListener('keydown', e=>{
  if (!window.__rd22madiActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), mp={j:()=>A.turn(-1),k:()=>A.press(),l:()=>A.turn(1),h:()=>A.hold()};
  if (mp[k]){ mp[k](); e.preventDefault(); }
});

/* ================================================================
   TIMELINE
   ================================================================ */
function drawNRZI(c, X, t0, t1, y, h, col){
  const G = linkGeom(), i0 = Math.floor(t0*K.LINE), i1 = Math.ceil(t1*K.LINE);
  let lv = 0; c.strokeStyle=col; c.lineWidth=1.4; c.beginPath();
  const yy = v=> y + (v? 5 : h-5);
  c.moveTo(X(i0/K.LINE), yy(lv));
  const lbl=[];
  for (let i=i0;i<=i1;i++){ const w=wireAt(i,G); if (w.bit) lv^=1; const xa=X(i/K.LINE), xb=X((i+1)/K.LINE); c.lineTo(xa,yy(lv)); c.lineTo(xb,yy(lv));
    if ((w.sync? w.sb===0||w.sb===5 : w.sb===0) && xb-xa>5) lbl.push([xa, w]); }
  c.stroke();
  c.font='10px '+SIM.css('--mono');
  lbl.forEach(([x,w])=>{ c.fillStyle = w.sync? SIM.css('--warn') : SIM.css('--ink2'); c.fillRect(x, y, 1, h); if (X(t0+5/K.LINE)-X(t0) > 60) c.fillText(w.sync? (w.sb===0?'J':'K') : `${w.v.toString(16).toUpperCase()}→${w.code.toString(2).padStart(5,'0')}`, x+2, y+h/2+3); });
}
function drawFrameMap(c, X, t0, t1, y, h){
  const G = linkGeom(), css=SIM.css, bitT=1/K.LINE;
  const p0 = Math.floor(t0*K.LINE/10), k0 = frameOfPair(p0,G), k1 = frameOfPair(Math.ceil(t1*K.LINE/10),G);
  if (k1-k0 > 400){ SIM.pulses(c,X,t0,t1,y,h,1/G.fsL,0,40*G.N*bitT,css('--accent'),'frames'); return; }
  c.font='10px sans-serif';
  for (let k=k0;k<=k1;k++){ const s=10*Math.floor(k*G.P)*bitT, e=10*Math.floor((k+1)*G.P)*bitT;
    if (!G.fits){ c.fillStyle=css('--bad'); c.globalAlpha=.4; c.fillRect(X(s),y+3,X(e)-X(s),h-6); c.globalAlpha=1; continue; }
    for (let ch=0; ch<G.N; ch++){ const a=s+40*ch*bitT, b=a+40*bitT; if (b<t0||a>t1) continue; const act = (linkWord(ch,k)>>>1)&1;
      c.fillStyle = act? (ch%2? css('--accent2'):css('--accent')) : css('--grid'); c.fillRect(X(a), y+3, Math.max(0.6,X(b)-X(a)-0.4), h-6);
      if (X(b)-X(a) > 24){ c.fillStyle='#fff'; c.fillText(String(ch+1), X(a)+2, y+h/2+3); } }
    const ss = s+40*G.N*bitT; c.fillStyle=css('--warn'); c.fillRect(X(ss), y+3, Math.max(1,X(e)-X(ss)), h-6);
    if (X(e)-X(ss) > 40){ c.fillStyle='#000'; c.fillText(`${G.syncPerFrame}× JK`, X(ss)+3, y+h/2+3); }
  }
}
function lanes(){
  const css=SIM.css, G=linkGeom(), fs=D.fs, ls=[];
  const mclk = K.MCK_PER_FS*fs;
  ls.push({label:'MADI coax: 125 Mbit/s NRZI', h:34, draw(c,X,t0,t1,y,h){
    if (!D.link){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no cable', X(t0)+6, y+h/2+4); return; }
    if ((t1-t0) < 3e-6) drawNRZI(c,X,t0,t1,y,h,css('--ink'));
    else { c.fillStyle=css('--ink2'); c.globalAlpha=.25; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${Math.round((t1-t0)*K.LINE).toLocaleString()} bit cells (8 ns each) — zoom below 3 µs to see the NRZI levels`, X(t0)+6, y+h/2+4); } }});
  ls.push({label:`AES10 frames: ${G.N} ch + JK (orange)`, h:28, draw(c,X,t0,t1,y,h){ if (!D.link) return; drawFrameMap(c,X,t0,t1,y,h); }});
  ls.push({label:'i64 FSYNC 1FS (H4 pin 29)', h:22, draw(c,X,t0,t1,y,h){ if (!D.link && D.opt==='i64') return; SIM.pulses(c,X,t0,t1,y,h,1/fs,1/fs/2,1/fs/2,css('--accent2'),'FSYNC high halves (falling edge = frame start)'); }});
  ls.push({label:`i64 DATA${D.line+1} (pin ${18+2*D.line}): ch ${8*D.line+1}–${8*D.line+8}`, h:28, draw(c,X,t0,t1,y,h){
    if (!D.link && D.opt==='i64') return; const slotT=32/mclk, k0=Math.floor(t0*fs), k1=Math.floor(t1*fs);
    if (k1-k0>300){ SIM.pulses(c,X,t0,t1,y,h,1/fs,0,8*slotT,css('--accent'),'8 slots per frame'); return; }
    c.font='10px sans-serif';
    for (let k=k0;k<=k1;k++) for (let s=0;s<8;s++){ const a=k/fs+s*slotT, b=a+slotT; if (b<t0||a>t1) continue; const w=slotWord(D.line,s,k), ca=(w>>>6)&1;
      if (X(b)-X(a) > 260){ for (let bit=0;bit<32;bit++){ const ba=a+bit/mclk, bb=ba+1/mclk; const v=(w>>>(31-bit))&1; c.fillStyle = bit<24? css('--accent') : bit===25? css('--warn') : css('--ink2'); c.globalAlpha = v? .9 : .18; c.fillRect(X(ba), y+3, X(bb)-X(ba)-0.5, h-6); c.globalAlpha=1; } }
      else { c.fillStyle = ca? css('--accent') : css('--grid'); c.fillRect(X(a), y+3, Math.max(0.6,X(b)-X(a)-0.5), h-6); if (X(b)-X(a)>26){ c.fillStyle='#fff'; c.fillText('ch'+(8*D.line+s+1), X(a)+2, y+h/2+3); } } } }});
  ls.push({label:'FPGA capture: negedge sclk_192k', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/mclk,0.5/mclk/2*3,0.15/mclk,css('--ink2'),'captures (pllout_i64_12M ÷ 2)'); }});
  const sclkF = [64,128,256][D.sr]*fs;
  ls.push({label:`FPGA I2S lrclk_out (SR_sel ${['00','01','10'][D.sr]})`, h:22, draw(c,X,t0,t1,y,h){ const per=64/sclkF; SIM.pulses(c,X,t0,t1,y,h,per,per/2,per/2,css('--accent2'),'I2S frames'); }});
  ls.push({label:'channel_active latch (cnt[4:0]==26)', h:22, draw(c,X,t0,t1,y,h){
    const ls_=latchPhases(); if ((t1-t0)*fs > 200){ SIM.pulses(c,X,t0,t1,y,h,1/fs,ls_[0]?ls_[0].ph/fs:0,0.3e-6,css('--warn'),`${ls_.length} latches per frame`); return; }
    for (let k=Math.floor(t0*fs);k<=Math.ceil(t1*fs);k++) ls_.forEach((x,i)=>{ const tt=(k+x.ph)/fs; c.fillStyle= i%2? css('--bad'):css('--warn'); c.fillRect(X(tt)-1,y+3,2.5,h-6); if (X(t0+1/fs)-X(t0)>120){ c.font='10px sans-serif'; c.fillStyle=css('--ink'); c.fillText(i%2?'R':'L', X(tt)+3, y+h/2+3); } }); }});
  ls.push({label:'Main ATmega128: pass + alteraRead', h:24, draw(c,X,t0,t1,y,h){
    const p0=Math.max(0,Math.floor(t0/K.LOOP)-1), p1=Math.ceil(t1/K.LOOP)+1;
    if (p1-p0 > 600){ SIM.pulses(c,X,t0,t1,y,h,K.LOOP,0.9*K.LOOP,40e-6,css('--accent'),'alteraRead(0x00/0x01) per pass ('+inf.replace(/<[^>]+>/g,'')+')'); return; }
    for (let p=p0;p<=p1;p++){ const a=loopStart(p), r=a+0.9*K.LOOP; c.fillStyle=p%2?css('--accent'):css('--accent2'); c.globalAlpha=.35; c.fillRect(X(a),y+4,X(a+0.89*K.LOOP)-X(a),h-8); c.globalAlpha=1; c.fillStyle=css('--warn'); c.fillRect(X(r),y+2,Math.max(2,X(r+32*K.SPI_BIT)-X(r)),h-4); } }});
  ls.push({label:`ERR LED pair ${(D.meter>>1)+1}`, h:22, draw(c,X,t0,t1,y,h){
    const N=Math.min(800, Math.max(80,(X(t1)-X(t0))/2)), sp=t1-t0; c.fillStyle=css('--bad');
    for (let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; if (errLed(D.meter>>1, tt)) c.fillRect(X(t0+sp*i/N), y+5, (X(t1)-X(t0))/N+0.5, h-10); } }});
  ls.push({label:`Meter ${D.meter+1}: ${meterInfo(D.meter).note}`, h:34, draw(c,X,t0,t1,y,h){
    const sl=meterSlots(D.meter), src=sl.map(slotToAudio); if (!sl.length || src.some(s=>!s)) return;
    const span=t1-t0, f=factorIn(), R=48000*f; const pw=X(t1)-X(t0);
    const a=src[0].a; if (src[0].unet) return;
    if (span*chFreq(a) > pw/3){ const amp=chActive(a)? Math.pow(10,chLevel(a)/20):0; c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0), y+h/2-amp*(h/2-3), pw, 2*amp*(h/2-3)); c.globalAlpha=1; return; }
    c.strokeStyle=css('--accent'); c.beginPath(); const N=Math.min(1200,pw);
    for (let i=0;i<=N;i++){ const tt=t0+span*i/N, k=Math.floor(tt*fs); const c0=sl[Math.min(sl.length-1, Math.floor((tt*fs-k)*sl.length))]; const s=slotToAudio(c0); let v=sampleOf(s.a, k*f+s.j); if (v&0x800000) v-=0x1000000; const yy=y+h/2-v/8388607*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }});
  return ls;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Use the knob, the rear MADI IN or the bench controls. Each firmware and FPGA step is listed here.</div>'; }

function viewSim(m){
  window.__rd22madiActive = true;
  m.innerHTML = `
  ${card('32ME front panel at the playhead (meters fed from the MADI stream through the FPGA)', `<div id="fp"></div><p class="small muted">${artSrc('front')}</p>${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Bench: RME HDSPe MADI source → coax → i64 → AMS8E-1 iss5', benchHTML())}
      ${card('Rear panel — click MADI IN to plug or unplug', `<div id="rp"></div><p class="small muted">${artSrc('rear')}</p>`)}</div>
    <div>${card('What the firmware and FPGA did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek). Zoom to “1 frame” and below to see slots, then bits, then NRZI cells', `<canvas id="tl"></canvas>
    <p class="small muted">Click a meter on the panel to follow it here. The main-loop pass length (≈${K.LOOP*1e3} ms with a little jitter) is ${inf}: it is worked out from the 4.9152 MHz ATmega128L and the 640-bit bit-banged ALTERA_read_write in every pass. The FPGA lanes come from a cycle-by-cycle run of smux_to_i2s.v (Software tab).</p>`)}
  ${card('FPGA logic analyser at the playhead — smux_to_i2s.v run cycle by cycle on this frame', `<div class="small" style="margin-bottom:6px">H4 line <select id="lsel">${[0,1,2,3,4,5,6,7].map(l=>`<option value="${l}" ${l===D.line?'selected':''}>DATA${l+1}_IN_I64 (ch ${8*l+1}–${8*l+8})</option>`).join('')}</select></div><canvas id="la"></canvas><div id="lad" class="small mono"></div>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t=SIM.t, G=linkGeom(), k=Math.floor(t*D.fs), r=regs(t), sb=statusByte();
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    const bi = Math.floor(t*K.LINE), w = D.link? wireAt(bi,G) : null;
    m.querySelector('#insp').innerHTML = `<table class="kv">
      <tr><th>MADI frame</th><td class="mono">#${k.toLocaleString()} at ${D.fs/1000} kHz${D.frame96?' (96 k frames)':''} · ${G.N} ch · ${G.fits? G.syncPerFrame+' JK pairs/frame':'<b style="color:var(--bad)">overfull</b>'} · link ${(G.util*100).toFixed(1)} % used</td></tr>
      <tr><th>On the wire now</th><td class="mono">${!w?'no cable': w.sync? 'JK sync symbol' : `ch ${w.c+1}, nibble ${w.nib} = 0x${w.v.toString(16).toUpperCase()} → 4B5B ${w.code.toString(2).padStart(5,'0')}, cell ${w.sb}`}</td></tr>
      <tr><th>Front panel</th><td class="mono">${MENU_ID[D.menu]} · “${displayText()}” · SR Sel ${SR_TXT[D.sr].trim()} · ${D.grp?'ch 33-64':'ch 1-32'} · ${D.source?'MADI':'AES3'}</td></tr>
      <tr><th>Status byte → FPGA</th><td class="mono">0x${sb.toString(16).padStart(2,'0')} → SR_sel ${['00','01','10'][D.sr]}, madi_group_select ${D.grp}</td></tr>
      <tr><th>SPI regs (last read)</th><td class="mono">0x00 = ${r[0].toString(2).padStart(8,'0')} · 0x01 = ${r[1].toString(2).padStart(8,'0')} (1 = active; per I2S line = per pair)</td></tr>
      <tr><th>H4 option</th><td class="mono">${D.opt==='unet'?'uNet2500 on DATA5/6 (32ME-N)':'i64 MADI OEM (XC3S700AN)'}</td></tr></table>`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawLA(m.querySelector('#la'), m.querySelector('#lad'), t);
  };
  bindControls(m); bindBench(m);
  m.querySelector('#lsel').onchange = e=>{ D.line=+e.target.value; SIM.refresh(); };
  SIM.on('time', draw);
}
function drawLA(cv, info, t){
  const k = Math.max(5, Math.floor(t*D.fs)), r = fpgaFrame(k);
  const {c,w} = SIM.canvas(cv, 210); const css=SIM.css, x0=150, pw=w-x0-8, Xn = n=> x0 + n/512*pw;
  const L = D.line, rows = [];
  c.font='11px '+css('--sans');
  const row=(i,lbl)=>{ const y=8+i*24; c.fillStyle=css('--ink'); c.fillText(lbl, 4, y+14); return y; };
  // lrclk in
  let y=row(0,'madi_lrclk_in (FSYNC)'); c.strokeStyle=css('--accent2'); c.beginPath(); c.moveTo(Xn(0),y+18); c.lineTo(Xn(256),y+18); c.lineTo(Xn(256),y+4); c.lineTo(Xn(512),y+4); c.stroke();
  y=row(1,`smux_data_in[${L}] (bits)`); for (let b=0;b<256;b++){ const v=i64Bit(L,k,b); if (v){ c.fillStyle=(b&31)<24? css('--accent') : (b&31)===25? css('--warn') : css('--ink2'); c.fillRect(Xn(2*b),y+4,Math.max(0.5,Xn(2*b+2)-Xn(2*b)-0.3),14); } }
  for (let s=0;s<8;s++){ c.fillStyle=css('--ink2'); c.fillRect(Xn(64*s),y+2,1,18); }
  y=row(2,'sclk_out (I2S)'); c.fillStyle=css('--ink2'); const perE = r.ev.filter(e=>e.f===k); perE.forEach(e=>c.fillRect(Xn(e.n),y+4,1,14));
  y=row(3,'lrclk_out = cnt[5]'); c.strokeStyle=css('--accent2'); c.beginPath(); perE.forEach((e,i)=>{ const yy=e.lrout? y+4:y+18; i? c.lineTo(Xn(e.n),yy) : c.moveTo(Xn(e.n),yy); c.lineTo(Xn(e.n)+0.1,yy); }); c.stroke();
  const lines = D.sr===0? [2*L, 2*L+1].map(x=>x) : [L];
  y=row(4,`i2s_data_out[${2*L}]`); perE.forEach((e,i)=>{ if (e.d[2*L]){ const nx = perE[i+1]? perE[i+1].n : 512; c.fillStyle=css('--accent'); c.fillRect(Xn(e.n),y+4,Math.max(0.5,Xn(nx)-Xn(e.n)),14); } });
  y=row(5,'fsync / cnt==26 latch'); perE.forEach(e=>{ if (e.fsync){ c.fillStyle=css('--bad'); c.fillRect(Xn(e.n)-1,y+2,3,18); } }); r.latches.filter(x=>x.f===k).forEach(x=>{ c.fillStyle=css('--warn'); c.fillRect(Xn(x.n)-1,y+2,3,18); });
  y=row(6,'frame (512 × 24.576 MHz)'); c.fillStyle=css('--ink2'); for (let n=0;n<=512;n+=64){ c.fillRect(Xn(n),y+4,1,8); c.fillText(String(n/2),Xn(n)+2,y+20); }
  const tp = (t*D.fs - Math.floor(t*D.fs))*512; c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(Xn(tp),4); c.lineTo(Xn(tp),190); c.stroke();
  // decode check
  const ws = r.words[2*L] || [], exp = ws.map((_,q)=>expectedWord(2*L,q,k-1));
  const okW = ws.map((v,q)=> exp[q]===null? null : ((v>>>1) === (exp[q]>>>1)));
  info.innerHTML = `I2S line ${2*L} in frame ${k} (data latched from frame ${k-1}), ${r.per} SCLK per frame: `+ws.map((v,q)=>`<span style="color:${okW[q]===null?'var(--ink2)':okW[q]?'var(--accent)':'var(--bad)'}">${v.toString(16).padStart(8,'0')}</span>`).join(' ')+
    `<br><span class="muted">Colour = matches the slot the documented SMUX mapping predicts (bit 0, the right-hand parity, is never shifted out: the fsync edge loads instead of shifting — Findings). Blue edge = FSYNC rises (divider reset), red = fsync load, orange = channel_active latches at counter 26/58.</span>`;
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  { title:'The RD22 bench', body:`<p>In 2012|45 Peter Lo had to add a <b>MADI</b> input (AES10: up to 64 audio channels on one 75 Ω coax) to Ward-Beck's AMS8x monitor platform. The bench he built is the one on the Simulator tab:</p>
    <ul><li>an <b>RME HDSPe MADI</b> card playing test audio (MADIGenerator notes; the progress log mentions “the RME unit”),</li><li>a DirectOut <b>i64 MADI OEM</b> module that turns the 125 Mbit/s coax into 8 serial lines of 8 channels,</li><li>the FPGA on the AMS8E-1 iss5 board, the SHARC metering DSP and the 32ME front panel with 32 meters.</li></ul>
    <p class="muted">Each step below has a goal that is checked live. Use the Simulator tab or the panel on the right.</p>`, check:()=>true, auto:true },
  { title:'1 · Get a lock', body:`<p>Plug the coax into <b>MADI IN</b> on the rear panel (click the BNC on the right of the MADI pair). The i64 locks, FSYNC and MCK start on the 34-pin header H4, and the meters come up.</p><p><b>Goal:</b> MADI IN connected.</p>`, check:()=>D.link, hint:'Click MADI IN on the rear panel.' },
  { title:'2 · Look at the wire', body:`<p>Set the transport's zoom window to <b>2 frames</b> or less. On the timeline, the “AES10 frames” lane shows 64 channel slots of 40 bits each (32 data bits in eight 4B/5B symbols) and, in orange, the <b>JK sync symbols</b> that fill the rest of the 2604 bit cells in a 48 kHz frame.</p><p>Zoom to <b>100 ns</b> and the top lane shows the NRZI levels: every 1 is a transition.</p><p><b>Goal:</b> zoom window ≤ 50 µs.</p>`, check:()=>SIM.win<=5e-5, hint:'Zoom window → “2 frames (41.7 µs)” or smaller.' },
  { title:'3 · 56-channel mode', body:`<p>Many consoles send 56 channels so they can run ±12.5 % varispeed. The i64 has a jumper (<b>Aux 1-2</b>) for that. Set <b>Channels → 56</b>. Slots 57–64 now carry ON/OFF = 0.</p><p>Then open <b>Grp Sel</b> (press the knob twice) and turn it to <span class="mono">ch 33-64</span>: the ERR LEDs on the last four pairs light. That is the product decision in the task list: “56 chan mode, 8 channels are inactive which is indicated by error LED”.</p><p><b>Goal:</b> 56 channels and group 33–64.</p>`, check:()=>D.ch===56 && D.grp===1, hint:'Bench: Channels 56. Panel: press, press (Grp Sel), turn.' },
  { title:'4 · 96 kHz in a 48 k frame', body:`<p>Set the bench back to 64 channels and the RME audio to <b>96 k (SMUX2)</b>. The i64 still delivers 64 slots at 1FS; each 96 kHz channel now uses two adjacent slots. Look at the meters: pairs show the same level twice — the FPGA is still unpacking SMUX1.</p><p>Hold the knob (Source), press once (SR Sel) and turn to <span class="mono">60-100k</span>. smux_to_i2s now reorders the slots (0,2,1,3) and 32 meters show 32 real channels.</p><p><b>Goal:</b> 96 k source with SR Sel 60-100k.</p>`, check:()=>D.rate===96 && D.sr===1 && D.ch===64, hint:'Hold 1 s → Source; press → SR Sel; turn once.' },
  { title:'5 · 192 kHz', body:`<p>Set the RME to <b>192 k (SMUX4)</b> and SR Sel to <span class="mono">120-200k</span>. Only <span class="mono">i2s_buff0…7</span> are loaded at this rate, so meters 17–32 go dark: 16 channels is all a 48 k MADI frame can carry at 192 k.</p><p><b>Goal:</b> 192 k source with SR Sel 120-200k.</p>`, check:()=>D.rate===192 && D.sr===2, hint:'Bench Audio 192 k; SR Sel → turn until “120-200k”.' },
  { title:'6 · Try a 32 kHz session', body:`<p>Set the bench back to 48 k audio and SR Sel to 30-50kHz, then set the frame rate to <b>32 kHz</b>. Peter logged what the i64 did with each RME rate on 4 Jul 2012 (ObservationsClockTable.xlsx): at 32 k it was “not recognised” and kept putting out about 47.8 kHz. The trace lists the measurement.</p><p><b>Goal:</b> 32 kHz frame rate selected.</p>`, check:()=>D.fs===32000, hint:'Bench: Frame rate → 32 kHz.' },
  { title:'7 · The overfull frame', body:`<p>Now try <b>54 kHz</b> (+12.5 %). With 64 channels the frame no longer fits: 64 × 40 = 2560 bits, but a 54 kHz frame has only 2314 cells. The timeline shows the frame in red. Switch to 56 channels and it fits again (2240 bits). This is why AES10 promises varispeed only for 56 channels.</p><p><b>Goal:</b> a frame rate above 48.8 kHz that fits (56 ch).</p>`, check:()=>D.fs>48828 && D.ch===56, hint:'Frame rate 54 kHz, Channels 56.' },
  { title:'8 · Find a dead channel', body:`<p>Reset the bench (48 kHz, 64 ch, SR Sel 30-50kHz, group 1–32). Switch off source channel <b>5</b> on the bench. Its pair is meters 5–6, ERR pair 3.</p><p>Scrub the <b>ERR LED</b> lane after clicking meter 5: the LED <b>flickers</b>. smux_to_i2s latches the ON/OFF bit at <span class="mono">sclk_counter[4:0] == 26</span>, which matches counter 26 (left word) <i>and</i> 58 (right word), and the main loop reads it at whatever moment it gets there.</p><p><b>Goal:</b> channel 5 off and meter 5 followed.</p>`, check:()=>D.mute.has(4) && D.meter===4 && D.ch===64 && D.sr===0, hint:'Bench: switch off ch 5 (toggle). Click meter 5 on the panel.' },
  { title:'9 · Read the registers', body:`<p>The main-board ATmega128 asks the FPGA for those flags with <span class="mono">alteraRead(0x00)</span> and <span class="mono">alteraRead(0x01)</span> in every pass. Open the <b>Software</b> tab and press <b>Run alteraRead(0x00)</b>: the spicontrol.v port shows the 16 SPI clocks and the byte that comes back.</p><p><b>Goal:</b> one SPI read done.</p>`, check:()=>!!D.spiLast, hint:'Software tab → “Run alteraRead(0x00)”.' },
  { title:'10 · The network version', body:`<p>The same FPGA also served the <b>32ME-N</b>: an Archwave uNet2500 wired to H4 in place of the i64. Its two data outputs land on DATA5/DATA6, which are MADI slots <b>33–48</b>. Set <b>H4 option → uNet2500</b> and look at meters 1–16 in group 33–64.</p><p class="muted">Whether the uNet sets the “channel active” bit in its slots is not documented; if it sends zeros there (as modelled, ${inf}), every ERR LED stays lit.</p><p><b>Goal:</b> uNet fitted and group 33–64.</p>`, check:()=>D.opt==='unet' && D.grp===1, hint:'Bench: H4 option → uNet2500.' },
  { title:'Done', body:`<p>That is the RD22 workflow: get the i64 to lock, check the slots and syncs on the wire, prove the SMUX modes, then wire the channel-active flags to the ERR LEDs. The <b>Findings</b> tab says what was decided and what became of it; the <b>Software</b> tab runs the FPGA and SPI logic.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__rd22madiActive = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — how the RD22 engineer used the bench', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('Bench', benchHTML())}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div><p class="small muted">${artSrc('front')} ${artSrc('rear')}</p>`)}`;
  bindControls(m); bindBench(m);
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Reset bench</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__rd22madiActive = false;
  m.innerHTML = `${card('One second of MADI, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('Zoom ladder at the playhead: 1 s → 1 frame → 2 channels → 1 symbol', `<canvas id="zl"></canvas>`)}
    ${card('One channel word at the playhead, four ways', `<label class="small">Channel <input type="number" id="cw" min="1" max="64" value="${(D.meter|0)+1}" style="width:60px"></label><div id="cwd" class="small mono" style="margin-top:6px"></div><canvas id="cwc"></canvas>`)}</div>
  ${card('As the operator sees it', `<div id="fp"></div>`)}`;
  let chSel = D.meter;
  m.querySelector('#cw').onchange = e=>{ chSel = Math.max(0,Math.min(63,(+e.target.value||1)-1)); SIM.refresh(); };
  const draw = ()=>{
    const t=SIM.t, G=linkGeom(), fs=D.fs, k=Math.floor(t*fs);
    const rows = [
      ['NRZI bit cells on the coax', '125,000,000', '8 ns', 'i64: Spartan-3AN at 250 MHz (2× oversampling, 4 ns jitter on its outputs)'],
      ['4B/5B symbols', '25,000,000', '40 ns', 'each carries one nibble of a channel word, or half of a JK sync'],
      ['Channel words (32 bits → 40 cells)', (G.N*G.fsL).toLocaleString(), '320 ns', `${G.N} per frame: bit 0 frame start, 1 ON/OFF, 2 A/B, 3 block start, 4–27 audio, 28–31 V U C P`],
      ['JK sync pairs', G.fits? (G.syncPerFrame*G.fsL).toLocaleString()+' (≈)' : '—', '80 ns', `${G.fits?G.syncPerFrame:0} per frame fill the ${(100-G.util*100).toFixed(1)} % left over`],
      ['MADI frames', G.fsL.toLocaleString(), SIM.fmtDur(1/G.fsL), D.frame96? '96 k frame: the i64 turns two into one SMUX2 frame at 1FS':'= i64 FSYNC (1FS, falling edge = frame start)'],
      ['i64 MCK on H4 (256FS)', (256*fs).toLocaleString(), SIM.fmtDur(1/(256*fs)), '8 data lines × 8 slots × 32 bits, MSB first'],
      ['FPGA pllout_i64_12M (×2)', (512*fs).toLocaleString(), SIM.fmtDur(1/(512*fs)), 'altpll2 c1: smux_to_i2s madi_mclk_in (named 12M, runs at 24.576 MHz)'],
      ['FPGA pllout_i64_98M (×8)', (2048*fs).toLocaleString(), SIM.fmtDur(1/(2048*fs)), 'altpll2 c0'],
      ['I2S SCLK out (SR_sel)', ([64,128,256][D.sr]*fs).toLocaleString(), SIM.fmtDur(1/([64,128,256][D.sr]*fs)), `${[32,16,8][D.sr]} I2S lines × 2 ch → i2s_selector (16 lines) → i2sx16_tdm → SHARC`],
      ['channel_active latches', ([2,4,8][D.sr]*fs).toLocaleString(), '', 'sclk_counter[4:0] == 26: twice per 64-bit I2S frame'],
      ['Main-loop passes / alteraRead pairs', '≈ '+Math.round(1/K.LOOP)+' '+inf, SIM.fmtDur(K.LOOP), 'ALTERA_read_write (80 bytes) + alteraRead(0x00) + alteraRead(0x01)'],
      ['ERR LED updates', '≈ '+Math.round(1/K.LOOP), '', '~madiChanActive → ALTERA_BUFFER_out[26/27] → SHARC ERRORINDICATOR'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Link budget at ${D.fs/1000} kHz: ${Math.floor(10*G.P)} cells per frame, ${40*G.N} used by channels. 64 channels fit up to ${(K.LINE/(10*(4*64+1))/1000).toFixed(2)} kHz; 56 channels up to ${(K.LINE/(10*(4*56+1))/1000).toFixed(2)} kHz (the paper's “56 channels at 48 kHz, including ±12 % varispeed”). The 4B/5B table and the symbol bit order are the standard AES10/FDDI ones (${inf}: the archive's paper names 4B/5B but does not print the table).</p>`;
    drawZoomLadder(m.querySelector('#zl'), t);
    drawWord(m.querySelector('#cwc'), m.querySelector('#cwd'), chSel, k);
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
  };
  SIM.on('time', draw);
}
function drawZoomLadder(cv, t){
  const G=linkGeom(), bit=1/K.LINE, fr=1/G.fsL;
  const levels=[['1 second',1],['1 MADI frame',fr],['2 channel words',80*bit],['1 symbol (5 cells)',5*bit*2]];
  const H=levels.length*52+8, {c,w}=SIM.canvas(cv,H), css=SIM.css, x0=150, pw=w-x0-10;
  levels.forEach(([nm,span],i)=>{ const y=6+i*52, t0=Math.max(0,Math.min(1-span, t-span/2)), X=tt=>x0+(tt-t0)/span*pw;
    c.fillStyle=css('--ink'); c.font='12px sans-serif'; c.fillText(nm, 6, y+16); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+30);
    c.strokeStyle=css('--grid'); c.strokeRect(x0,y+2,pw,40);
    c.save(); c.beginPath(); c.rect(x0,y+2,pw,40); c.clip();
    if (!D.link){ c.restore(); return; }
    if (i===0) SIM.pulses(c,X,t0,t0+span,y+2,40,fr,0,fr*G.util,css('--accent'),'frames');
    else if (i===1) drawFrameMap(c,X,t0,t0+span,y+2,40);
    else drawNRZI(c,X,t0,t0+span,y+2,40,css('--ink'));
    c.restore();
    const px=X(t); c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+44); c.stroke();
  });
}
function drawWord(cv, info, ch, k){
  const lw = linkWord(ch, D.frame96? 2*k : k), l = ch>>3, s = ch&7, sw = slotWord(l, s, k);
  const {c,w} = SIM.canvas(cv, 150), css=SIM.css, x0=10, cw=(w-20)/40;
  // 4B/5B NRZI of the 8 nibbles
  let lv=0; c.strokeStyle=css('--ink'); c.lineWidth=1.5; c.beginPath(); c.moveTo(x0, 60);
  for (let n=0;n<8;n++){ const v=(lw>>>(4*n))&15, code=B4B5[v];
    for (let b=0;b<5;b++){ const bit=(code>>(4-b))&1; if (bit) lv^=1; const xa=x0+(5*n+b)*cw, yy=lv?40:72; c.lineTo(xa,yy); c.lineTo(xa+cw,yy); }
    c.fillStyle= n===0? css('--warn') : n<7? css('--accent') : css('--ink2'); c.globalAlpha=.12; c.fillRect(x0+5*n*cw, 30, 5*cw, 50); c.globalAlpha=1;
    c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`${v.toString(16).toUpperCase()}:${code.toString(2).padStart(5,'0')}`, x0+5*n*cw+2, 26); }
  c.stroke(); c.fillStyle=css('--ink2'); c.font='10px sans-serif';
  c.fillText('nibble 0 = bits 0–3 (frame start, ON/OFF, A/B, block start) · nibbles 1–6 = audio LSB→MSB · nibble 7 = audio MSB nibble + V U C P (bit order in each nibble and symbol inferred)', x0, 96);
  let au = (lw>>>4)&0xFFFFFF; const sgn = au&0x800000? au-0x1000000 : au;
  info.innerHTML = `Frame ${k}, MADI channel ${ch+1}${D.frame96?' (96 k frame '+(2*k)+')':''}<br>
    AES10 word (bit 31…0): ${lw.toString(2).padStart(32,'0').replace(/(.{4})/g,'$1 ')}<br>
    → frame-start ${lw&1}, ON/OFF ${(lw>>>1)&1}, A/B ${(lw>>>2)&1}, block ${(lw>>>3)&1}, audio 0x${au.toString(16).padStart(6,'0')} (${(sgn/8388608).toFixed(5)} FS), V ${(lw>>>28)&1} U ${(lw>>>29)&1} C ${(lw>>>30)&1} P ${(lw>>>31)&1}<br>
    i64 slot on H4 DATA${l+1} (pin ${18+2*l}) slot ${s}, MSB first: ${sw.toString(2).padStart(32,'0').replace(/(.{8})/g,'$1 ')}<br>
    <span class="muted">MSB…LSB, Frame Start, Channel Active, SubFrame A, Block Start, V U C P (i64MADI_OEM_timing.tif). smux_to_i2s reads Channel Active as bit 25.</span>`;
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  coax:{x:10,y:20,w:150,h:84,t:'MADI IN (75 Ω coax)',s:['AES10, 125 Mbit/s NRZI','4B/5B, JK sync','64 ch @ 48 k'],d:'Rear BNC (artwork 21 Feb 2013: MADI OUT / IN, SYNC OUT / IN). Point-to-point coax or fibre. The task list says that with BNC and fibre both fed, the first input to lock wins.'},
  i64:{x:200,y:20,w:180,h:110,t:'DirectOut i64 MADI OEM',s:['Xilinx XC3S700AN @ 250 MHz','Aux 1-2 56 ch · 3-4 96 k frame','X602 subcode / loop-through','X603 JTAG → PROM'],d:'Bought in instead of building a receiver (Hardware/NRZI_Decoder holds the Ethernet-PHY datasheets that were looked at). Outputs 8 lines × 8 channels, 32-bit slots MSB first, FSYNC 1FS, MCK 256FS, with 4 ns jitter from its 250 MHz clock. Firmware zips 2012-05-19 … 2013-01-14 in Software/i64.'},
  h4:{x:200,y:160,w:180,h:64,t:'H4 34-pin ribbon',s:['DATA1–8_IN_I64 = pins 18…32','FSYNC 29 · MCK 33'],d:'i64_MADI_OEM_Pin_Assignment_20120509.pdf. Task list: 10 cm 26 AWG ribbon, 47 Ω series resistors for LVCMOS. The 32ME-N puts the uNet2500 here instead (SDOUT0/1 on pins 26/28).'},
  fpga:{x:420,y:20,w:220,h:204,t:'Cyclone IV EP4CE30F23I7',s:['altpll2: MCK × 2 / × 8','smux_to_i2s: 8 lines → 32 I2S','i2s_selector: group 1–32 / 33–64','spicontrol: regs 0x00/0x01','shift_in32: status byte','AES RX + SRC, i2sx16_tdm'],d:'AMS81.bdf, top entity AMS81. The release (V050200, Dec 2015) uses smux_to_i2s.v; v100–v213 used smux1x4_i2sx16 with smux1Gen + syncOneShot. Device went EP1C6 → EP4CE40 → EP4CE30 (Findings).'},
  sharc:{x:680,y:20,w:180,h:90,t:'ADSP-21065L SHARC',s:['32 ch TDM in (SPORT0)','VU / peak, volume ramp','ERR + pair LEDs'],d:'ams81 DSP code: meters on 32 channels and the LED shift data for four AMS8E-4 boards. It gets the inverted channel-active bytes through the FPGA (ALTERA_BUFFER_out[26/27]).'},
  meters:{x:680,y:140,w:180,h:84,t:'32 meters (4 × AMS8E-4)',s:['22 segments each','ERR + select LED per pair'],d:'The front panel. Feb 2013 artwork labels the bars 1…32 above and 33…64 below for the two groups.'},
  avr:{x:420,y:260,w:220,h:84,t:'Main ATmega128L (ams8-1)',s:['alteraRead(0x00/0x01) each pass','ALTERA_read_write 80 bytes','UART0 ↔ front panel'],d:'v200w.c main(): CONFIGURE_ALTERA, init_CS8416, RESET_SHARC, then while(1). 4.9152 MHz crystal (AMS8E-1 BOM).'},
  front:{x:680,y:260,w:180,h:84,t:'Front ATmega128 (ams8-5)',s:['ADJUST knob menus','8-char display','EEPROM settings'],d:'Main.c / RotaryEncoder.c: Volume, Mon Sel, Grp Sel, SR Sel, Source (2015). Sends mainAppend32MEAudioStatusByte: bit 0 group, bits 1–2 SR, bit 3 source.'},
};
const WIRES = [['coax','i64','125 Mb/s'],['i64','h4','8 × 256FS'],['h4','fpga','smux_data_in[7:0]'],['fpga','sharc','TDM 32 ch'],['sharc','meters','LED data'],['avr','fpga','SPI + 80-byte block'],['front','avr','UART status byte'],['fpga','avr','']];
function viewBlock(m){
  window.__rd22madiActive = false; let sel='fpga';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdi"></div>`)}${card('Signal flow in one sentence', `<p>The <b>i64</b> turns the coax into eight 256FS serial lines; the <b>FPGA</b> unpacks them (SMUX1/2/4) into 16 I2S lines for the chosen group and hands them to the <b>SHARC</b> meters; the <b>main Atmel</b> reads the channel-active flags back over SPI and passes them, inverted, to the SHARC for the ERR LEDs; the <b>front Atmel</b> decides group, SR and source.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 870 360" style="width:100%"><defs><marker id="rda" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9, k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#rda)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
      <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([p,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · H4 / i64 header', note:'Pin functions from i64_MADI_OEM_Pin_Assignment_20120509.pdf; FPGA balls from 48k_96k_working.qsf (V050200). Odd pins 1–15 are GND/+5 V on the i64 side.', svg:()=>
    chip(330,30,190,'H4 2×17 (i64 OEM)',
      [['18','DATA1_IN_I64 · H1'],['20','DATA2_IN_I64 · H2'],['22','DATA3_IN_I64 · J1'],['24','DATA4_IN_I64 · J2'],['26','DATA5_IN_I64 · H7'],['28','DATA6_IN_I64 · J4'],['30','DATA7_IN_I64 · J7'],['32','DATA8_IN_I64 · K7'],['29','FSYNC_IN_I64 · T1'],['33','MCLK_IN_I64 · T2']],
      [['2','DATA1_OUT_I64 · B2'],['4','DATA2_OUT_I64 · B1'],['6','DATA3_OUT_I64 · C2'],['8','DATA4_OUT_I64 · C1'],['10','DATA5_OUT_I64 · D2'],['12','DATA6_OUT_I64 · E1'],['14','DATA7_OUT_I64 · F1'],['16','DATA8_OUT_I64 · F2'],['31','FSYNC_OUT_I64 · J5'],['34','MCLK_OUT_I64 · P7']],'from module ← | → to module (MADI OUT)')
    + `<text x="30" y="300" font-size="11.5" fill="var(--ink2)">i64 Aux 1×5: 1-2 = 56 ch · 3-4 = 96 k frame · 4-5 = follow MADI RX.  X602: 1-2 transparent subcode, 3-4 active loop-through.</text>
       <text x="30" y="318" font-size="11.5" fill="var(--ink2)">X603 JTAG (PROM): 1 VCC · 2 TMS · 3 TCK · 4 TDO · 5 TDI · 6 GND — Xilinx Platform Cable USB II, “select the PROM, not the FPGA”.</text>
       <text x="30" y="336" font-size="11.5" fill="var(--ink2)">32ME-N: uNet SDOUT0/1 → pins 26/28; LRCLK/SCLK → 29/33 (unet-standard-to-ams81-connection.xlsx, via the 32me plugin).</text>` },
  { name:'2 · FPGA MADI path', note:'Instances and nets from AMS81.bdf (V050200); PLL settings from altpll2.vhd. Redrawn as a block schematic — not the Quartus BDF.', svg:()=>{
    let s = chip(40,60,150,'altpll2 (inst6)',[['inclk0','MCLK_IN_I64 12.288 MHz']],[['c0 ×8','pllout_i64_98M'],['c1 ×2','pllout_i64_12M (24.576)'],['locked','pll_locked']],'Cyclone IV PLL');
    s += chip(330,60,170,'smux_to_i2s (inst3)',[['SR_sel[1:0]','status[2:1]'],['madi_mclk_in','pllout_i64_12M'],['madi_lrclk_in','fsync_I64'],['smux_data_in[7:0]','smux1_data'],['pll_locked','']],[['sclk_out','madi_i2s_sclk'],['lrclk_out','madi_i2s_lrclk'],['i2s_data_out[31:0]','madi_i2s'],['channel_active[31:0]','']],'');
    s += chip(640,60,150,'i2s_selector (inst)',[['input_select','source_sel'],['madi_group_select','status[0]'],['madi_aes_data[31:0]',''],['madi_channel_active','']],[['aes_data_out[15:0]','→ i2sx16_tdm'],['channel_active[15:0]','→ spicontrol']],'');
    s += chip(330,300,170,'spicontrol (inst2)',[['sclk','sclk_regcntrl'],['sdin','sdin_regcntrl'],['cs','cs_regcntrl'],['madiChanActive[15:0]','']],[['sdout','sdout_regcntrl'],['address_out[7:0]','']],'CPOL 1, CPHA 1');
    s += chip(640,300,150,'shift_in32 (inst1)',[['data_in','ALTERA_WRITE'],['clock','ALTERA_CLOCK'],['strobe','ALTERA_FSYNCH']],[['q[31:0]','thirtyTwoMEAudioStatus'],['serial_out','DATA_READ']],'80-byte block tail');
    return s; } },
  { name:'3 · Main Atmel ↔ FPGA', note:'Port bits from altspi.h (regcntrl SPI) and common.h (ALTERA_* bit-bang); ATmega128L at 4.9152 MHz (AMS8E-1 BOM via the ams8e plugin).', svg:()=>
    chip(330,50,200,'ATmega128L (ams8-1)',[['PC1','ALTERA_CS (regcntrl)'],['PC3','ALTERA_SCLK'],['PC2','ALTERA_MOSI'],['PG1','ALTERA_MISO'],['PA5','madi_present']],[['PC7','ALTERA_FSYNCH'],['PC6','ALTERA_CLOCK'],['PC5','ALTERA_WRITE'],['PC4','DATA_READ'],['PB7','ALTERA RESET'],['UART0','front panel']],'v200w.c · ICCAVR 7.12')
    + `<text x="40" y="300" font-size="11.5" fill="var(--ink2)">alteraRead(addr): CS high, 8 bits addr|0x80 then 8 dummy bits, MSB first, MISO sampled after each falling edge.</text>
       <text x="40" y="318" font-size="11.5" fill="var(--ink2)">ALTERA_read_write(): 80 bytes, FSYNCH high for the first bit; byte 79 = thirtyTwoMEAudioStatus; bytes 26/27 = ~madiChanActive[1]/[0].</text>` },
  { name:'4 · AES10 coax interface (paper)', note:'The “MADI physical” transmitter drawn in “MADI – 20 years old and feeling fit” (Hardware/MADIReceiverDesign). It is the AES10 reference circuit, not a Ward-Beck schematic — the 32ME used the i64 module for this.', svg:()=>{
    let s=`<text x="40" y="40" font-size="12" fill="var(--ink)">+5 V</text><line x1="60" y1="50" x2="60" y2="90" stroke="var(--ink)"/>`;
    const r=(x,y,l)=>`<rect x="${x-8}" y="${y}" width="16" height="40" fill="none" stroke="var(--ink)"/><text x="${x+12}" y="${y+24}" font-size="11" fill="var(--ink)">${l}</text>`;
    s+= r(60,90,'120R')+r(60,150,'100R')+`<line x1="60" y1="130" x2="60" y2="150" stroke="var(--ink)"/><line x1="60" y1="190" x2="60" y2="230" stroke="var(--ink)"/><text x="48" y="246" font-size="11" fill="var(--ink)">0 V</text>`;
    s+=`<line x1="60" y1="140" x2="200" y2="140" stroke="var(--ink)"/><line x1="200" y1="128" x2="200" y2="152" stroke="var(--ink)"/><line x1="208" y1="128" x2="208" y2="152" stroke="var(--ink)"/><text x="190" y="120" font-size="11" fill="var(--ink)">150n</text><line x1="208" y1="140" x2="300" y2="140" stroke="var(--ink)"/>`;
    s+= `<line x1="300" y1="140" x2="300" y2="200" stroke="var(--ink)"/>`+r(300,200,'10K')+`<path d="M330 140 l14 -10 v20 z M344 130 v20" fill="none" stroke="var(--ink)"/><text x="330" y="175" font-size="10" fill="var(--ink2)">1N4148 ×2 clamp</text>`;
    s+= `<line x1="344" y1="140" x2="420" y2="140" stroke="var(--ink)"/><rect x="420" y="132" width="40" height="16" fill="none" stroke="var(--ink)"/><text x="425" y="125" font-size="11" fill="var(--ink)">68R</text><line x1="460" y1="140" x2="540" y2="140" stroke="var(--ink)"/><circle cx="552" cy="140" r="12" fill="none" stroke="var(--ink)"/><text x="572" y="144" font-size="12" fill="var(--ink)">Output (75 Ω coax)</text>`;
    s+= `<text x="40" y="300" font-size="11.5" fill="var(--ink2)">Paper: second output identical; “Modern Ethernet PHY chips routinely out-perform the older TAXI chips” — the route RD22 looked at in Hardware/NRZI_Decoder.</text>
         <text x="40" y="318" font-size="11.5" fill="var(--ink2)">NRZI_encodeDecode.txt: decoder = D flip-flop + XOR of the input with Q̄; encoder = J-K flip-flop fed with inverted NRZ.</text>`;
    return s; } },
];
function viewSchem(m){
  window.__rd22madiActive = false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from pin lists, the BDF and the source — not the Altium/Quartus drawings)', `<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>
    <p class="small muted">The AMS8E-1 iss5 and 32ME-5 Altium projects are in RD22-MADI/PCB (Irina Zaslaver's layouts). These sheets follow the net names used in the FPGA project and the firmware, so the connections are only as reliable as those names. Blue labels are nets; “· H1” etc. are FPGA balls.</p>`);
  const draw=()=>{
    m.querySelector('#t2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 360" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="348" fill="none" stroke="var(--line)"/><text x="884" y="348" text-anchor="end" font-size="10" fill="var(--ink2)">RD22-MADI · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#sn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
const LOOP_STEPS = [['WDR · CS8416_READ_LOCK_ALL · RESET_CS8416_REF',.12],['ALTERA_TRANSLATE_UART0 · ALTERA_SORT',.08],['ALTERA_read_write (80 bytes bit-banged)',.45],['ALIGNMENT_CHECK (spin commented out)',.02],['SPI_translation',.05],['UART0_translate · UART0_setup · UART0_transmit_counter',.12],['SPI_control',.06],['madiChanActive[0..1] = alteraRead(0x00 / 0x01)',.10]];
function viewSoft(m){
  window.__rd22madiActive = false;
  m.innerHTML = `<div class="grid2">${card('smux_to_i2s: slot → I2S mapping for the current SR Sel (from the Verilog case statements)', `<div id="map"></div>`)}
    ${card('Main-board while(1) — the step running at the playhead', `<div id="loop"></div>`)}</div>
  <div class="grid2">${card('spicontrol.v run for one read', `<div style="display:flex;gap:6px;margin-bottom:6px"><button id="sp0">Run alteraRead(0x00)</button><button id="sp1">Run alteraRead(0x01)</button></div><canvas id="spi"></canvas><div id="spid" class="small mono"></div>`)}
    ${card('Register and status map, live', `<div id="regs"></div>`)}</div>
  <div class="grid2">${card('smux1Gen.vhd (v101–v213 test generator) — line 1, one frame, run edge by edge', `<canvas id="gen"></canvas><div id="gend" class="small mono"></div>`)}
    ${card('Front-panel menu state machine (RotaryEncoder.c / Main.c)', `<div id="fsm"></div>`)}</div>
  ${card('FPGA builds — what changed (progress.txt.txt and the DEVICE line of each snapshot)', `<div id="builds"></div>`)}`;
  m.querySelector('#sp0').onclick=()=>A.spiRead(0); m.querySelector('#sp1').onclick=()=>A.spiRead(1);
  const draw=()=>{
    const t=SIM.t, css=SIM.css;
    // mapping table
    const nL=[32,16,8][D.sr]; let rows='';
    for (let L=0; L<Math.min(nL,8); L++){ const q=[2,4,8][D.sr]; const ws=[]; for (let i=0;i<q;i++){ const e=(D.sr===0)? [(L>>2), (L&3)*2+i] : D.sr===1? [L>>1, (L&1)*4+[0,2,1,3][i]] : [L, [0,4,1,5,2,6,3,7][i]]; ws.push(`${i%2?'R':'L'}=slot ${8*e[0]+e[1]+1}`); } rows+=`<tr><th>i2s_buff${L}</th><td class="mono small">${ws.join(' · ')}</td></tr>`; }
    m.querySelector('#map').innerHTML = `<table class="kv">${rows}<tr><td colspan="2" class="small muted">${nL>8?`… ${nL} lines in all; `:''}SR_sel ${['00 (48 k: 2 slots per line, i2s_buff0…31)','01 (96 k SMUX2: slots 0,2 | 1,3 interleaved, i2s_buff0…15)','10 (192 k SMUX4: L = slots 0–3, R = slots 4–7, i2s_buff0…7)'][D.sr]}. i2s_selector then takes lines 0–15 or 16–31 (group).</td></tr></table>`;
    // loop
    const p=Math.floor(t/K.LOOP), ph=(t-loopStart(p))/K.LOOP; let acc=0, cur=0; LOOP_STEPS.forEach((s,i)=>{ if (ph>=acc) cur=i; acc+=s[1]; });
    let s=`<svg viewBox="0 0 520 ${LOOP_STEPS.length*36+60}" style="width:100%"><rect x="140" y="4" width="240" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="20" text-anchor="middle" font-size="11" fill="var(--ink)">main(): CONFIGURE_ALTERA, init_CS8416, RESET_SHARC</text>`;
    LOOP_STEPS.forEach((st,i)=>{ const y=40+i*36, on=i===cur; s+=`<rect x="20" y="${y}" width="480" height="28" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${y+18}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${st[0]}</text>`; });
    s+=`<text x="20" y="${LOOP_STEPS.length*36+56}" font-size="10.5" fill="var(--ink2)">Pass #${p} · step lengths ${inf.replace(/<[^>]+>/g,'')} (share of a ≈${K.LOOP*1e3} ms pass)</text></svg>`;
    m.querySelector('#loop').innerHTML=s;
    // SPI
    const sp = D.spiLast || {addr:0, r: spiSim(0, regs(t)[0])};
    { const {c,w}=SIM.canvas(m.querySelector('#spi'),120), x0=60, cw=(w-x0-10)/16; c.font='11px sans-serif';
      [['SCLK',0],['MOSI',1],['MISO',2]].forEach(([n,r])=>{ const y=10+r*34; c.fillStyle=css('--ink'); c.fillText(n,4,y+16); c.strokeStyle=r===2?css('--accent'):css('--accent2'); c.beginPath();
        for (let i=0;i<16;i++){ const xa=x0+i*cw; if (r===0){ c.moveTo(xa,y+22); c.lineTo(xa+cw*0.4,y+22); c.lineTo(xa+cw*0.4,y+4); c.lineTo(xa+cw*0.8,y+4); c.lineTo(xa+cw*0.8,y+22); c.lineTo(xa+cw,y+22); }
          else { const v= r===1? sp.r.wave[i].sdin : sp.r.wave[i].sdout; const yy=v?y+4:y+22; if(i===0) c.moveTo(xa,yy); c.lineTo(xa,yy); c.lineTo(xa+cw,yy); } } c.stroke(); });
      c.fillStyle=css('--ink2'); for (let i=0;i<16;i++) c.fillText(String(sp.r.wave[i].cnt), x0+i*cw+2, 116); }
    m.querySelector('#spid').innerHTML = `addr 0x0${sp.addr} → spicontrol address ${sp.r.address} · register 0x${sp.r.val.toString(16).padStart(2,'0')} · Atmel reads 0x${sp.r.read.toString(16).padStart(2,'0')} ${sp.r.read===sp.r.val?'✓':'✗'} · bottom numbers = cnt before each rising edge`;
    // regs
    const r=regs(t), sb=statusByte();
    m.querySelector('#regs').innerHTML = `<table class="kv">
      <tr><th>FPGA reg 0x00</th><td class="mono">${r[0].toString(2).padStart(8,'0')} = channel_active lines ${16*((D.sr===0)?D.grp:0)}–${16*((D.sr===0)?D.grp:0)+7}</td></tr>
      <tr><th>FPGA reg 0x01</th><td class="mono">${r[1].toString(2).padStart(8,'0')} = lines ${16*((D.sr===0)?D.grp:0)+8}–${16*((D.sr===0)?D.grp:0)+15}</td></tr>
      <tr><th>ALTERA_BUFFER_out[26] / [27]</th><td class="mono">0x${((~r[1])&255).toString(16).padStart(2,'0')} / 0x${((~r[0])&255).toString(16).padStart(2,'0')} (madiChanNotActive → SHARC)</td></tr>
      <tr><th>ALTERA_BUFFER_out[79]</th><td class="mono">0x${sb.toString(16).padStart(2,'0')} = thirtyTwoMEAudioStatus (bit0 group, bits 2:1 SR, bit3 source)</td></tr>
      <tr><th>AES10 word bits 0–3</th><td class="mono">frame start · ON/OFF · A/B · block start (paper)</td></tr>
      <tr><th>i64 slot bits (MSB first)</th><td class="mono">0–23 audio · 24 frame start · 25 ch active · 26 subframe A · 27 block start · 28–31 V U C P</td></tr></table>`;
    // smux1Gen
    { const g=smux1Gen(2), bits=g.bits.slice(256), fsv=g.fsv.slice(256); const {c,w}=SIM.canvas(m.querySelector('#gen'),70), x0=10, cw=(w-20)/256;
      c.fillStyle=css('--accent2'); for (let i=0;i<256;i++) if (fsv[i]) c.fillRect(x0+i*cw, 6, cw+0.2, 8);
      for (let i=0;i<256;i++){ c.fillStyle = (i&31)<24? css('--accent') : css('--ink2'); if (bits[i]) c.fillRect(x0+i*cw, 22, Math.max(0.6,cw-0.2), 20); }
      for (let s=0;s<8;s++){ c.fillStyle=css('--ink2'); c.fillRect(x0+32*s*cw, 20, 1, 30); c.font='10px sans-serif'; c.fillText('slot '+s, x0+32*s*cw+2, 62); }
      // decode slots using data_counter alignment: slot s data = counters 32s .. 32s+23, output appears one edge later
      const dec=[]; for (let s=0;s<8;s++){ let v=0; for (let b=0;b<24;b++) v=v*2+bits[32*s+b]; dec.push(v); }
      const g3=smux1Gen(3), b3=g3.bits.slice(512); let v8b=0; for (let b=0;b<24;b++) v8b=v8b*2+b3[32*7+b];
      m.querySelector('#gend').innerHTML = `24-bit words per slot: ${dec.join(', ')} · slot 7 next frame: ${v8b}<br><span class="muted">The generator loads 1…8 (line 1) but its last window starts at X"F7" instead of X"F8", so slot 7's LSB is toggle_sig: the ID alternates ${dec[7]} / ${v8b}. FSYNC (blue) falls one MCK before the MSB, which is why v202 “needed to delay the data by one clock cycle”.</span>`; }
    // FSM
    const box=(x,y,id,lbl)=>`<rect x="${x}" y="${y}" width="96" height="30" rx="6" fill="${D.menu===id?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+48}" y="${y+19}" text-anchor="middle" font-size="11" fill="${D.menu===id?'#fff':'var(--ink)'}">${lbl}</text>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 500 170" style="width:100%">${box(10,20,1,'Volume')}${box(140,20,2,'Mon Sel')}${box(270,20,3,'Grp Sel')}${box(270,100,4,'SR Sel')}${box(400,100,5,'Source')}
      <text x="110" y="14" font-size="10" fill="var(--ink2)">press</text><text x="240" y="14" font-size="10" fill="var(--ink2)">press (SR = 30-50k)</text><text x="380" y="92" font-size="10" fill="var(--ink2)">press</text><text x="10" y="80" font-size="10" fill="var(--ink2)">hold 1 s → Source · idle 10 s → Volume</text>
      <text x="10" y="150" font-size="10.5" fill="var(--ink)">Now: ${MENU_ID[D.menu]} · status byte 0x${statusByte().toString(16).padStart(2,'0')}</text></svg>`;
    m.querySelector('#builds').innerHTML = `<table class="kv"><tr><th>Build</th><th>Date</th><th>Device</th><th>MADI core</th><th>Note</th></tr>${BUILDS.map(b=>`<tr><td class="mono">${b[0]}</td><td>${b[1]}</td><td class="mono">${b[2]}</td><td class="small">${b[3]}</td><td class="small">${b[4]}</td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__rd22madiActive = false;
  m.innerHTML = card('What was decided', `<ol>
    <li><b>Buy the MADI receiver, don't build it.</b> Hardware/NRZI_Decoder holds Ethernet-PHY and cable-EQ datasheets (KSZ8001/8051, DP83846A, CS8952, GS9074A) and a two-gate NRZI note: the do-it-yourself route the MADI paper suggests. RD22 bought the DirectOut <b>i64 MADI OEM</b> instead (Dec 2011 HHB price list, i64Quote.pdf) and had DirectOut add 56/64-channel, 96 k frame and loop-through jumpers to its firmware (ClockDescription.txt, May 2012|45).</li>
    <li><b>Set the SMUX factor by hand.</b> DirectOut's advice was that channel status is not safe enough to detect 2FS/4FS, so the 32ME got an <span class="mono">SR Sel</span> menu (30-50kHz / 60-100k / 120-200k) rather than auto-detection. The 96 k frame <i>is</i> detected by the i64.</li>
    <li><b>Show dead channels with the ERR LED.</b> The task list's final feature list: “Error LED on meter on when no audio data” and “56 chan mode, 8 channels are inactive which is indicated by error LED”. That became v206/v207: the MADI cores output channel-active, and spicontrol serves it on registers 0x00/0x01 to main-board Atmel v104+.</li>
    <li><b>Things deferred by Eugene</b> (RD22TasksList.xlsx): a generator that alters data bits to test transparency, the No-Lock LED, the digital monitor output and the DB25 board. The DB25 boards (32ME-2) followed in Jan 2014|47.</li>
    <li><b>The FPGA part changed twice.</b> The DEVICE line of every snapshot: EP1C6Q240C7 for v100–v204 (the AMS81 board), EP4CE40F23C6 for v205 and v209–v212 and vNAB2013, then <b>EP4CE30F23I7</b> for v213 (5 Apr 2013) and the 01AV0200 release. The Feb 2013 compile screenshot shows the 32ME using 8,749 of 39,600 LEs (22 %) on the CE40, which fits the CE30's 28,848; FPGAResourceComparison.xlsx sizes the 16-AES SRC IP at 18,600 LEs and 497.7 kbit against the CE30's 594 kbit. The AMS8E-1 iss5 BOM still fits an EP4CE40F23C6N (see the <b>AMS8E</b> plugin), and Adam's 2015 <span class="mono">current/</span> project targets the CE40 again. A .sof for one will not configure the other.</li>
  </ol>`) + card('What became of it', `<ul>
    <li>RD22 is still status <b>C</b> (a priority class, not Z = completed) in R&D_List.xls, yet it produced the <b>32ME</b>: 32ME-MADI with the i64, and 32ME-N with an Archwave uNet on the same header (see the <b>32ME</b> plugin, where uNet channels arrive as MADI slots 33–48 — DATA5/DATA6 here).</li>
    <li>The Gantt chart planned the MADI module from 30 Apr to 28 Jun 2012|45. The log's “This version should be final!” is v213 on 5 Apr 2013|46, and the frozen 01AV0200 package's FPGA was created on 9 Dec 2015|48 (48k_96k_working_description.txt) with a new MADI core.</li>
    <li>Later RD items reuse the idea: RD57 MADI distribution amplifier, RD69 MADI Buddy, RD85 Archwave RAVENNA monitor (whose FPGA folders carry “32ME on and off ramp” backups).</li>
  </ul>`) + card('What the code is up to', `<ol>
    <li><b>The released MADI core is not the one in the progress log.</b> v100–v213 all instantiate <span class="mono">smux1Gen + syncOneShot + smux1x4_i2sx16</span>. <span class="mono">madi_receiver.v</span> appears only in Adam's 2015 backups (“96k 1 pair aes out working”, “192k initial”). <span class="mono">smux_to_i2s.v + i2s_selector.v</span> appear only in V050200 / v050201 — the 01AV0200 release.</li>
    <li><b>channel_active is latched twice per I2S frame.</b> In smux_to_i2s, <span class="mono">if (sclk_counter[4:0] == 5'b11010)</span> ignores bit 5, so it fires at 26 (left word, bit 25 = Channel Active) and at 58 (right word). The register holds the left channel's flag for half the frame and the right channel's for the other half; the main loop reads it whenever it gets there. A pair with one dead channel flickers its ERR LED (Tutorial step 8) — the very symptom the task list warned about (“will flicker if not mapped correctly”).</li>
    <li><b>Only per-pair, only 16 bits.</b> spicontrol takes <span class="mono">madiChanActive[15:0]</span>: one bit per I2S line (= per pair) of the selected group. Registers 0x00/0x01 cannot say which channel of a pair is off, nor anything about the other group.</li>
    <li><b>The last bit of every I2S frame is lost.</b> On the fsync edge the negedge block loads <span class="mono">i2s_buff</span> instead of shifting, so a 48 k frame has 63 shifted bits for 64: the right word's P bit never leaves. Harmless (24-bit audio is MSB-first), and visible in the logic analyser.</li>
    <li><b>The PLL constraints don't match the PLL.</b> altpll2 makes c0 = ×8 (98.304 MHz) and c1 = ×2 (24.576 MHz, on a net called <span class="mono">pllout_i64_12M</span>) and leaves c2 unused. AMS81.sdc declares PLLOUT_I64_98M on clk[0] with no multiplier, PLLOUT_I64_49M on clk[1] ×8 and PLLOUT_I64_12M on clk[2] ×4. The timing constraints added in v211 analyse the wrong frequencies.</li>
    <li><b>madi_receiver.v copy-paste slips.</b> The 48 k one-shot clears on <span class="mono">sr_del2_96k</span>; the 192 k path drives all four I2S outputs from <span class="mono">buff192k0_i2s</span> (“need to add 6 more”); the 96 k path repeats lines 0/1 on 2/3.</li>
    <li><b>smux1Gen's channel IDs.</b> The generator loads the channel number into each slot, but its last window starts at <span class="mono">X"F7"</span>, so slot 7's LSB is the frame toggle: IDs 8, 16, … alternate with 9, 17, …. Its FSYNC also falls one MCK before the MSB, hence syncOneShot's one-clock data delay (v202).</li>
    <li><b>64 channels have no varispeed.</b> 64 × 40 = 2560 of 2604 bit cells at 48 kHz: 64-channel MADI tops out at 48.6 kHz (with one JK pair per frame). The i64 says its 1FS follows 30–50 kHz, so above about 48.6 kHz only 56-channel mode works — what the paper means by “56 channels … ±12 % varispeed”.</li>
    <li><b>The i64 does not follow every rate.</b> ObservationsClockTable.xlsx: RME at 32 k, 64 k and 128 k (48 k frame) left the i64 on ≈47.8 / 47.6 / 47.4 kHz, “dependent on previous value”.</li>
    <li><b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART.FRONT,'32ME-M1 FRONT PANEL_Feb212013.cdr')} and ${SIM.src(ART.REAR,'32ME-REARPANEL_Feb212013.cdr')} (21 Feb 2013|46), with the filter print from ${SIM.src(ART.FILTER,'32ME-CHROMATFILTER_Feb192013.cdr')} (19 Feb 2013|46).</b> Each sheet has an assembled view above its WHITE and GREEN plates; that view is used, so cut-outs and both inks register exactly. What it shows: (a) the meters sit behind four 600 × 310 px chromatic-filter windows, eight columns each, as four stereo pairs with one <b>SEL</b> and one <b>ERR</b> legend per pair and a shared −34 … +14 dB scale between pairs — 16 ERR legends for 32 meters, matching spicontrol's 16 channel-active bits; (b) the numbers 1, 8, 9, 16 … 32 (top) and 33, 40 … 64 (bottom) are channel-range legends for the two groups, next to 16 small holes (Ø0.117″ in 0.183″ rings) with no LED named for them in the code modelled here, so they are probably fixings ${inf}; an earlier ${SIM.src(ART.PROTO,'PROTOTYPE_V1 filter')} also printed CH1–CH8 under every window, dropped on 19 Feb; (c) the earlier ${SIM.src('ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/Obsolete/32ME-FRONTPANEL-FINALCURVE.cdr','32ME-FRONTPANEL-FINALCURVE.cdr')} had “1-32 / 33-64” group LEDs at the right and no display; the Feb 21 issue replaced them with the dot-matrix window, ADJUST (PUSH) and HEADSET, which is what Main.c drives (“ch 1-32 / ch 33-64” on the display); (d) the rear has a MADI <i>optical</i> OUT/IN cut-out as well as the two coax BNCs, each with a “SYNC” hole beside it, and no SYNC BNCs — the old drawing's SYNC OUT/IN connectors were wrong; (e) one unlegended hole sits between ADJUST and HEADSET; (f) ${SIM.src(ART.CONCEPT,'ConceptFrontAll.cdr')} (same date) holds nine alternative layouts that move the logo and 32ME badge between windows. The source has live Arial text, not curves; the rear caution block and “MADE IN CANADA” are re-set by hand (libcdr lost their alignment and line breaks) ${inf}.</li>
    <li><b>Front panel.</b> <span class="mono">if((currentSampleRate == 0) && (currentSource = 1))</span> in RotaryEncoder.c is an assignment (Grp Sel forces the source to MADI). The SR strings are all in Main.c's <span class="mono">mainProcessSRSelect</span>: “30-50kHz”, “60-100k”, “120-200k”. The version string is <span class="mono">01AV0200</span>.</li>
    <li><b>Two paths for the group bit.</b> The group reaches the FPGA in byte 79 of the 80-byte block (shift_in32 → madi_group_select), and <span class="mono">AMS8Check32Or64Select</span> also drives a dedicated port pin; <span class="mono">alteraWriteParallelControlData</span> is commented out. <span class="mono">madiPresentCheck</span> reads PINA bit 5 but its write into status BIT4 is commented out (Dec 2015).</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass ≈ ${K.LOOP*1e3} ms with ±0.15 ms jitter, SPI bit ≈ 2.5 µs: ${inf} from the 4.9152 MHz AVR and the bit-banged transfers.</li>
    <li>JK syncs are placed at the end of each frame; AES10 allows them between any channels (the paper's diagram shows both). 4B/5B table and bit order: standard AES10/FDDI, ${inf}.</li>
    <li>Channel status (byte 0 = 0x85), parity and block-start placement in the source words: ${inf}.</li>
    <li>uNet slots carry audio with a zero low byte, so Channel Active = 0: ${inf} — not documented in the archive.</li>
    <li>Meter level = tone peak − 3 dB on the AMS8E-4 22-segment scale; no ballistics (the 32ME plugin runs vumeter.asm properly). Panel LED, display and jack positions are ${inf} from the 2013 legends; the panel black is from the AMS8 family.</li>
    <li>The front and rear artwork came from CorelDRAW through libcdr. The rear caution text and “MADE IN CANADA” were re-anchored by hand (libcdr flattened the multi-line block).</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>RD22-MADI/Software/01AV0200 firmware package/Altera/V050200 - use 48k_96k_working/ smux_to_i2s.v, i2s_selector.v, spicontrol.v, shift_in32.vhd, altpll2.vhd, AMS81.bdf, AMS81.sdc, 48k_96k_working.qsf</li>
    <li>RD22-MADI/Software/FPGA/PROGRESS/progress.txt.txt, */ *.qsf, v213/smux1Gen.vhd · Software/FPGA/v050201/madi_receiver.v · fpgaResourcesUsedFor*.bmp</li>
    <li>…/Atmel Main Board/v050002/v200w.c, altspi.c/.h, alteraCom.c, AMS8E1Iss3.c, UARTAt128.c · …/Atmel Front Panel/V010200/Main.c, RotaryEncoder.c/.h</li>
    <li>RD22-MADI/Hardware/i64MADI/* · Hardware/MADIReceiverDesign/11 - MADI - 20 years old and feeling fit.pdf · Hardware/NRZI_Decoder · Hardware/FPGASpecs/FPGAResourceComparison.xlsx</li>
    <li>RD22-MADI/ProjectManagement/*.xlsx · PCB/32ME-5/…/32me5HardwareBugs.txt · SILK/OBSOLETE/FEB282013/*/32ME-*_Feb212013.cdr · R&D_List.xls</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'rd22-madi', name:'RD22 MADI · AES10 input for the 32ME monitor (2012|45)', duration:1,
  product:'RD22 MADI', year:2012, family:'R&D register', folder:'ENGINEERING - 2016 RD FILES/RD22-MADI',
  summary:'The R&D project that brought MADI (AES10, 64 channels on one coax) into the AMS8x monitor platform and became the 32ME. A DirectOut i64 module decodes the 125 Mbit/s link; a Cyclone IV unpacks SMUX1/2/4 into I2S for the SHARC meters and reports dead channels to the ATmega128 over SPI.',
  highlights:['MADI down to 4B/5B symbols, JK syncs and NRZI cells','smux_to_i2s.v and spicontrol.v run cycle by cycle','Real Feb 2013 32ME panel artwork','ERR-LED flicker traced to a 5-bit counter compare','FPGA part history EP1C6 → EP4CE40 → EP4CE30'],
  footnotes: [
    {"text": "Front and rear panels are drawn from the assembled views on the 21 Feb 2013 CorelDRAW sheets (each sheet also holds separate WHITE and GREEN plates); there is no text-as-curves version of this issue.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/32ME-M1 FRONT PANEL_Feb212013.cdr"},
    {"text": "The meters sit behind four chromatic-filter windows; the filter print gives each window four stereo pairs with one SEL and one ERR legend per pair and a shared −34 … +14 dB scale — 16 ERR legends for 32 meters.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/ChromaFilter/32ME-CHROMATFILTER_Feb192013.cdr"},
    {"text": "The front has 16 small holes (Ø0.117″ in 0.183″ rings) beside the channel legends 1, 8, 9 … 32 and 33, 40 … 64; no LED is named for them in the code, so they are probably fixings (inferred).", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/32ME-M1 FRONT PANEL_Feb212013.cdr"},
    {"text": "One unlegended hole sits between ADJUST and HEADSET on the front.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/32ME-M1 FRONT PANEL_Feb212013.cdr"},
    {"text": "The prototype filter printed CH1–CH8 under every window; the 19 Feb 2013 filter drops them.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/ChromaFilter/OBSOLETE/PROTOTYPE_V1/32ME-CHROMATFILTER-FINALCURVE.cdr"},
    {"text": "An earlier front had “1-32 / 33-64” group LEDs at the right and no display; the Feb 21 issue replaced them with the dot-matrix window, ADJUST (PUSH) and HEADSET.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/Obsolete/32ME-FRONTPANEL-FINALCURVE.cdr"},
    {"text": "The rear has a MADI optical OUT/IN cut-out next to the coax BNCs, each with a “SYNC” hole beside it, and no SYNC BNCs.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr"},
    {"text": "libcdr lost the alignment and line breaks of the rear's “MADE IN CANADA”, caution block and “PLEASE REFER TO MANUAL”; they are re-set by hand here.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/RearPanel/32ME-REARPANEL_Feb212013.cdr"},
    {"text": "ConceptFrontAll.cdr (same date) holds nine alternative front layouts that move the logo and 32ME badge between windows.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/ConceptFrontAll.cdr"},
    {"text": "The SILK/OBSOLETE folder keeps many Backup_of_ copies and three earlier front saves (FINAL, FINALCURVE, new) beside the dated sheets.", "src": "ENGINEERING - 2016 RD FILES/RD22-MADI/SILK/OBSOLETE/FEB282013/FrontPanel/Obsolete/32ME-FRONTPANEL FINAL.cdr"}
  ],
  depth:'Full model',
  stepUnits:[
    {label:'1 MADI frame', period:()=>1/(D.frame96?2*D.fs:D.fs)},
    {label:'1 channel word (320 ns)', period:()=>320e-9},
    {label:'1 4B/5B symbol (40 ns)', period:()=>40e-9},
    {label:'1 NRZI cell (8 ns)', period:()=>8e-9},
    {label:'1 i64 MCK (256FS)', period:()=>1/(256*D.fs)},
    {label:'1 main-loop pass', period:()=>K.LOOP},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[2/48000,'2 frames (41.7 µs)'],[1/48000,'1 frame (20.8 µs)'],[2.6e-6,'8 channel words (2.6 µs)'],[640e-9,'2 channel words (640 ns)'],[1e-7,'100 ns (NRZI cells)']],
  defaultZoom:1,
  init(){ FCACHE.key=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the RD22 bench', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
