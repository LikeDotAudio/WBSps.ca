/* =====================================================================
   RD21 — Audio Level Logging for the DTS NLC (Ward-Beck Systems R&D, 2011|44–2012|45)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What is modelled: one M6205A-3G+NLC openGear card (slot 10) with the DaySequerra/DTS NLC 5.1
   daughter card, the frame controller, and the Java "WBS LumberJack Logger" on a PC, end to end:
   programme loudness → NLC gain → SPI to the card MCU → WBSLAP over CAN → frame → TCP 5253 → Java
   parser → card10.txt.

   Sources used (all under ENGINEERING - 2016 RD FILES/RD21-AudioLevelLoggingNLC/ unless noted):
   - LogSoftware/atmel/working/v602/M6205/application/
       logtask.c (LogTask), tasklist.c (osTaskList, osTimers: LogTask 1000 ms), apptask.h (APPTASK_INTERVAL 111 with NLC_LOG),
       applogvals.c (16 LogVals, getters), logaddrs.h (addresses 0x01–0x10, reserved bytes), boardtype.h (DTS_NLC, NLC_LOG),
       settings.c (getNlcOutShortAvg… → Get_NLC_*; readNlcLoggingValues; nlcLight/Medium/Aggressive defines; nlcTargetLevel 16),
       dtsserial.c/.h (Build_Master_write_message, Master_Transfer, SLOW_COM, opcodes 0x49, 0x53–0x5E, Get_NLC_Status offsets),
       sigstat.c (getNlcLogLive alive string), dbparams.c (nlcLogLiveParam OID 0x0F60), main.c (monParams), M6205pack.txt (6.02)
   - .../v602/M6205/zeuslib/framework/ logman.c (replyList, sendLoggingResponse), logcomm.c (rxLoggingData, txLoggingData),
       parcomm.c (OID 0x0F61 hook), statmon.c; zeuslib/common/ binio.c (MSB-first floats), candrv.c (8-byte CAN frames, 1 Mbit/s)
   - .../working/immediate response/ (parcomm.c answers at once, no LogTask) and .../PC Simulation for logging/ (logman.c sendLogRequest1)
   - LogSoftware/java/ WBSLibrary (OGPFrame, OGPCard, WBSLAPParser, WBSLAPPackager, NetworkNTPUDP, WBSLAPLogFile, GLOBAL),
       ThreadedLoggingApplication (main, RunnableLoggingRequest, RunnableLoggingDataProcessor)
   - LogSoftware/progress/ october122011java (LoggingApplicationGUI, FrameCardTree, SettingsPanelLogic, LoggingTabPanel), progress.xlsx,
       September282011V2java/ThreadedLoggingApplication/card*.txt;  LogSoftware/javate/ThreadedLoggingApplication/card10.txt
   - LogSoftware/DebugDocs/Sep162011Log.pcap (decoded for this plugin: timing, bytes, second connection at 3561 s)
   - LogSoftware/WBSLumberJackLoggerMain.JPG (the GUI), Protocol_to_communicate_with_application/ WBSLoggingApplicationProtocol.doc,
       protocol.doc;  LoggingSoftwareDescription.doc (2012 redesign);  IconsNeeded.xlsx
   - Daysequerra Docs/ NLC Dashboard Protocol.pdf, nlc_data.txt, nlc5.1st_logging.txt, AudioXpress NLC5 Menu.xls, loudness/tech3341.pdf
   - #OPENGEAR #SERIES/M6205-3G…/M6205A-3G.pdf (NLC parameter meanings); RD22-MADI/Software/32MECommunicationProtocoll.doc (reuse)
   - Card artwork reused from siumulation-plugins/m6205-3g.js (JRTI ISS6 gerbers), saved as assets/rd21-audiolevelloggingnlc-card.png
   Anything not in those files is marked "inferred" on screen.
   PRIVACY: the folder's resumes/ directory is not used.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const Y = y => SIM.year(y);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const inf = '<span class="tag-inf" title="Not stated in the source; inferred — see the note next to it">inferred</span>';
const infT = s => `<span class="tag-inf" title="${esc(s)}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const card = (title, body, cls) => `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
const plink = (id, txt, tab) => `<a href="siumulation.html?plugin=${id}${tab?'#'+tab:''}">${txt}</a>`;
function h32(i, s){ let x = (Math.imul(i|0, 374761393) + Math.imul((s|0)+1, 668265263))|0; x = Math.imul(x ^ (x>>>13), 1274126177); x ^= x>>>16; return (x>>>0)/4294967296; }

/* ---------------- timing constants ---------------- */
const FCPU = 8e6;                       // AT90CAN128 crystal (M6205 schematic "8.000MHz", as used in m6205-3g.js)
const T = {
  SPI_W: 256*760/FCPU,                  // spi_drv_writebytes(spi_data, CMD_BUFFER_SIZE=256), ≈760 cycles/byte bit-banged (m6205-3g.js count)
  SPI_WAIT: 3*5000*8/FCPU,              // SLOW_COM: wait2(5000) ×3 — 8 cycles per count inferred
  SPI_SL: 40*640/FCPU,                  // bytes read until the card returns '/' — inferred
  SPI_R: 255*640/FCPU,                  // spi_drv_readbytes(&spi_data[1], 255)
  REQ0: 0.100,                          // PC RunnableLoggingRequest phase in the shown second (arbitrary origin)
  LAG: 0.336,                           // request → response at the PC: median of 3 797 pairs in Sep162011Log.pcap
  DRIFT: -7.4e-6,                       // card 1000 ms tick vs PC 1 s: response phase fell 26 ms in 3 500 s (pcap)
  JIT: 0.008,                           // PC request jitter (pcap intervals 0.982–1.020 s, most within ±10 ms)
  NTP: 0.0035,                          // NTPUDPClient.getTime round trip on the LAN — inferred
  TCP: 0.0004,                          // PC ↔ frame: the frame's 6-byte reply comes 0.4 ms after each request (pcap)
  FC: 0.0010,                           // frame controller TCP ↔ CAN forwarding — inferred
  ALIVE: 0.0023,                        // alive pulse 2.3 ms after the logging reply (pcap)
  APP: 0.111, APP_RUN: 0.003,           // appTask every 111 ms with NLC_LOG (apptask.h "Ali-Add"); run time inferred
  DT: 0.01, T0: -45,                    // loudness model step and history start
};
T.XFER = T.SPI_W + T.SPI_WAIT + T.SPI_SL + T.SPI_R;      // one Master_Transfer ≈ 62.9 ms
T.SAMPLE = T.SPI_W + T.SPI_WAIT;                          // when the DTS card composes its answer — inferred
T.TICK0 = T.REQ0 + T.LAG - (4*T.XFER + 0.0016);           // LogTask phase that reproduces the pcap lag with 4 floats
const BASE_MS = Date.UTC(2011, 8, 16, 12, 44, 55, 431);   // first request in Sep162011Log.pcap (08:44:55 EDT) minus REQ0
const canT = n => (67 + 8*n)*1.15e-6;                     // one extended CAN frame at 1 Mbit/s incl. ~15 % stuffing — inferred
function canFrames(len){ if (len<=8) return [len]; const f=[8]; let left=len-4; while(left>0){ f.push(Math.min(8,left)); left-=8; } return f; } // candrv.c canSend

/* ---------------- WBSLAP address map (logaddrs.h = GLOBAL.java) ---------------- */
const ADDR = {
  0x01:{n:'NTP',                         k:'void',  f:'timeStampLogVal (getTimeStamp — echoes the PC bytes)', g:null},
  0x02:{n:'Name of Card',                k:'str',   f:'cardNameLogVal (getProductName)', g:null},
  0x03:{n:'Card Identifier',             k:'str',   f:'cardIdLogVal (getCardId)', g:null},
  0x04:{n:'Card Type',                   k:'int8',  f:'cardTypeLogVal (dval 0x01 = 5.1+2 NLC)', g:null},
  0x05:{n:'Output Short Average(5.1)',   k:'float', f:'getNlcOutShortAvg → Get_NLC_OutShortAvg', op:0x55, v:'outS', grp:0},
  0x06:{n:'Output True Peak (5.1)',      k:'float', f:'getNlcOutTruePeak → Get_NLC_OutTruePeak', op:0x56, v:'outP', grp:0},
  0x07:{n:'Output Short Average (Stereo)',k:'float',f:'getNlcAuxOutShortAvg → Get_NLC_AuxOutShortAvg', op:0x5B, v:'outS', grp:1},
  0x08:{n:'Output True Peak (Stereo)',   k:'float', f:'getNlcAuxOutTruePeak → Get_NLC_AuxOutTruePeak', op:0x5C, v:'outP', grp:1},
  0x09:{n:'Input Short Average (5.1)',   k:'float', f:'getNlcInShortAvg → Get_NLC_InShortAvg', op:0x53, v:'inS', grp:0},
  0x0A:{n:'Input True Peak (5.1)',       k:'float', f:'getNlcInTruePeak → Get_NLC_InTruePeak', op:0x54, v:'inP', grp:0},
  0x0B:{n:'Input Short Average (Stereo)',k:'float', f:'getNlcAuxInShortAvg → Get_NLC_AuxInShortAvg', op:0x59, v:'inS', grp:1},
  0x0C:{n:'Input True Peak (Stereo)',    k:'float', f:'getNlcAuxInTruePeak → Get_NLC_AuxInTruePeak', op:0x5A, v:'inP', grp:1},
  0x0D:{n:'Applied Correction (5.1)',    k:'float', f:'getNlcOutCorrection → Get_NLC_OutCorrection', op:0x57, v:'corr', grp:0},
  0x0E:{n:'Applied Compression (5.1)',   k:'float', f:'getNlcOutCompression → Get_NLC_OutCompression', op:0x58, v:'comp', grp:0},
  0x0F:{n:'Applied Correction (Stereo)', k:'float', f:'getNlcAuxOutCorrection → Get_NLC_AuxOutCorrection', op:0x5D, v:'corr', grp:1},
  0x10:{n:'Applied Compression (Stereo)',k:'float', f:'getNlcAuxOutCompression → Get_NLC_AuxOutCompression', op:0x5E, v:'comp', grp:1},
};
const APPS = {
  threaded:{label:'ThreadedLoggingApplication (Sep 2011, console)', addrs:[1,5,6,7,8], buf:1000, gui:false},
  gui:{label:'LoggingApplicationGUI (Oct 2011, LumberJack window)', addrs:[1,2,5,6,7,8], buf:10000, gui:true},
  custom:{label:'GUI + chosen values (2012 "Logging Settings" idea)', addrs:null, buf:10000, gui:true},
};
const PRESETS = [   // AudioXpress NLC5 Menu.xls; settings.c stores ratio×100, dead band×2, cr×100
  {name:'Light',      ratio:0.80, db:6.0, nf:-50, att:50, rel:220, cth:5, cr:0.50, set:'nlcLight…: 80 / 0 / 0 / 12 / 30 / 50 / 220 / 0 / 5 / 50'},
  {name:'Medium',     ratio:0.95, db:4.0, nf:-50, att:30, rel:120, cth:5, cr:0.50, set:'nlcMedium…: 95 / 0 / 0 / 8 / 30 / 30 / 120 / 0 / 5 / 50'},
  {name:'Aggressive', ratio:1.00, db:1.0, nf:-50, att:15, rel:60,  cth:3, cr:0.80, set:'nlcAggressive…: 100 / 0 / 0 / 2 / 30 / 15 / 60 / 0 / 3 / 80'},
];
const PROG = {
  ad:     {label:'Drama at −30 LKFS; a loud commercial (−15 LKFS) starts at 0.400 s'},
  steady: {label:'Programme already near −24 LKFS'},
  tone:   {label:'EBU Tech 3341 test 1: 1 kHz stereo sine at −23 dBFS'},
  silence:{label:'No audio (the DTS card reports its −60 floor)'},
};

/* ---------------- device / world state ---------------- */
const D = {
  prog:'ad', preset:0, target:-24, bypass:false,
  dts:true, build:'v602',
  app:'threaded', custom:{5:1,6:1,7:1,8:1,0x0D:1,0x0E:1},
  running:true, second:false, ntp:'ok', cards:1, sessionH:1,
  ui:{ treeOpen:true, tabOpen:false, viewer:false, about:false, sel:null, menu:null, byteIx:0 },
  log:[], lastTrace:[],
};
function reqAddrs(){ if (D.app!=='custom') return APPS[D.app].addrs.slice(); return [1].concat(Object.keys(D.custom).filter(k=>D.custom[k]).map(Number).sort((a,b)=>a-b)); }

/* =====================================================================
   LOUDNESS MODEL — BS.1770 block energies, 400 ms momentary, 3 s short-term (EBU Tech 3341),
   and the NLC control law described in the M6205A-3G manual. The DTS NLC internals are not in
   the archive: the first-order gain slew is inferred (same choice as m6205-3g.js).
   ===================================================================== */
function progBlock(i, grp){
  const t = T.T0 + i*0.1 + 0.05, s = grp? 7 : 3, r = h32(i, s), off = grp? -1.5 : 0;
  switch (D.prog){
    case 'silence': return {L:-90, c:0};
    case 'tone':    return {L:-23, c:0};        // 1 kHz at −23 dBFS peak in both channels → −23.0 LUFS, −23 dBTP
    case 'steady':  return {L:-24 + 4*(r-.5) + off, c:12};
    default:
      if (t >= 0.4) return {L:-15 + 2*(r-.5) + off, c:8};
      if (h32(i, s+11) < 0.15) return {L:-48, c:10};       // pauses in dialogue
      return {L:-30 + 6*(r-.5) + off, c:14};
  }
}
let NLC = null, NLCK = '';
function nlcRun(){
  const key = [D.prog, D.preset, D.target, D.bypass].join('|');
  if (key === NLCK && NLC) return NLC;
  NLCK = key;
  const NBk = Math.round((1.2 - T.T0)/0.1), NS = Math.round((1.2 - T.T0)/T.DT);
  const P = PRESETS[D.preset], tgt = D.target;
  const res = [];
  for (let g=0; g<2; g++){
    const E = new Float64Array(NBk), PK = new Float64Array(NBk), cs = new Float64Array(NBk+1);
    for (let i=0;i<NBk;i++){ const b=progBlock(i,g); E[i]=Math.pow(10,(b.L+0.691)/10); PK[i]=b.L+b.c; cs[i+1]=cs[i]+E[i]; }
    const meanL = (i, n) => { const a=Math.max(0,i-n+1); const e=(cs[i+1]-cs[a])/(i-a+1); return 10*Math.log10(e+1e-30)-0.691; };
    const maxP = (i, n) => { let m=-200; for (let j=Math.max(0,i-n+1); j<=i; j++) m=Math.max(m,PK[j]); return m; };
    const st = { inM:new Float32Array(NS), inS:new Float32Array(NS), inP:new Float32Array(NS), g:new Float32Array(NS), comp:new Float32Array(NS) };
    let gain = 0;
    for (let j=0;j<NS;j++){
      const t = T.T0 + j*T.DT, bi = Math.max(0, Math.floor((t - T.T0)/0.1) - 1);
      const S = meanL(bi, 30), M = meanL(bi, 4), Pk = maxP(bi, 30);
      let comp = 0;
      if (!D.bypass){
        let want = gain; const e = tgt - S;
        if (S < P.nf) want = gain;                        // below the noise floor: not processed
        else if (Math.abs(e) <= P.db/2) want = gain;     // inside the dead band: allowable
        else want = clamp(e*P.ratio, -20, 20);            // ratio dB of gain per dB of difference
        const tau = (want < gain ? P.att : P.rel)/1000;
        gain += (want - gain)*(1 - Math.exp(-T.DT/tau));
        const over = Pk - (tgt + P.cth); comp = over > 0 ? over*P.cr : 0;
      } else gain = 0;
      st.inM[j]=M; st.inS[j]=S; st.inP[j]=Pk; st.g[j]=gain; st.comp[j]=comp;
    }
    // output blocks: input block energy × (gain − compression) at the block end
    const Eo = new Float64Array(NBk), co = new Float64Array(NBk+1), PKo = new Float64Array(NBk);
    for (let i=0;i<NBk;i++){ const j=Math.min(NS-1, Math.round(((i+1)*0.1)/T.DT)); const d=st.g[j]-st.comp[j]; Eo[i]=E[i]*Math.pow(10,d/10); PKo[i]=Math.min(PK[i]+d, 0); co[i+1]=co[i]+Eo[i]; }
    st.outS = new Float32Array(NS); st.outM = new Float32Array(NS); st.outP = new Float32Array(NS);
    for (let j=0;j<NS;j++){ const t=T.T0+j*T.DT, bi=Math.max(0, Math.floor((t-T.T0)/0.1)-1);
      const mo=(n)=>{ const a=Math.max(0,bi-n+1); return 10*Math.log10((co[bi+1]-co[a])/(bi-a+1)+1e-30)-0.691; };
      st.outS[j]=mo(30); st.outM[j]=mo(4); let m=-200; for (let k=Math.max(0,bi-29);k<=bi;k++) m=Math.max(m,PKo[k]); st.outP[j]=m; }
    st.blockL = i => progBlock(i,g);
    res.push(st);
  }
  NLC = res; return res;
}
function nlcAt(t, grp){
  const N = nlcRun()[grp], j = clamp(Math.round((t - T.T0)/T.DT), 0, N.inS.length-1);
  return { inM:N.inM[j], inS:N.inS[j], inP:N.inP[j], outS:N.outS[j], outM:N.outM[j], outP:N.outP[j], corr:N.g[j], comp:N.comp[j] };
}
/* what Get_NLC_* returns at time t: DTS floors loudness/peaks at −60 (nlc_data.txt); no card → getter returns 0 */
function dtsValue(a, t){
  if (!D.dts) return 0;
  const A = ADDR[a], v = nlcAt(t, A.grp)[A.v];
  if (A.v==='corr' || A.v==='comp') return v;
  return Math.max(-60, v);
}

/* =====================================================================
   WIRE FORMAT — byte-exact builders (checked against Sep162011Log.pcap)
   ===================================================================== */
function ntp8(ms){ const hi=Math.floor(ms/4294967296), lo=ms-hi*4294967296; return [hi>>>24&255,hi>>>16&255,hi>>>8&255,hi&255, lo>>>24&255,lo>>>16&255,lo>>>8&255,lo&255]; }
function f32be(v){ const b=new DataView(new ArrayBuffer(4)); b.setFloat32(0,v,false); return [0,1,2,3].map(i=>b.getUint8(i)); }  // binio.c writeFloat → writeUlong MSB first
function reqBytes(addrs, slot, ms){        // WBSLAPPackager.setRequest + setRequestNTP
  const rest = addrs.filter(a=>a!==1), total = 28 + rest.length*2 + 4;
  const b = [0xBA,0xD2,0xAC,0xE5, 0x00, 0x10+slot, 0x49, 0x00, total-9, 0x00, 0x0F,0x61, total-13, 0xFE,0xB5,0xCA,0xB4, addrs.length, 0x01, 0x08].concat(ntp8(ms));
  rest.forEach(a=>b.push(a,0x00)); b.push(0xFE,0xB5,0xCA,0xB4); return b;
}
function respBody(list, ts, vals){          // logman.c sendLoggingResponse
  const d = [0x00, 0x0F, 0x61, 0, 0xFE,0xB5,0xCA,0xB4, list.length];
  list.forEach(a=>{ const A=ADDR[a]; let v;
    if (A.k==='void') v = ts.slice(0,8);
    else if (A.k==='str'){ const s = a===2 ? 'M6205A-3G+NLC' : ''; v = Array.from(s).map(c=>c.charCodeAt(0)); v.push(0); }   // strlen + 1
    else if (A.k==='int8') v = [0x01];
    else v = f32be(vals[a]);
    d.push(a, v.length, ...v); });
  d[3] = d.length; d.push(0xFE,0xB5,0xCA,0xB4);        // data[LEN_ADDRESS] = index of the closing sync
  return d;
}
function respBytes(slot, body){ const len = body[3] + 4; return [0xBA,0xD2,0xAC,0xE5, 0x10+slot, 0x00, 0xC9, len>>8, len&255].concat(body); }
const ALIVE = slot => [0xBA,0xD2,0xAC,0xE5, 0x10+slot, 0x02, 0x10, 0x00,0x11, 0x00,0x0F,0x60,0x0D, 0xFE,0xB5,0xCA,0xB4, 0x01, 0xE5,0x01,0x01, 0xFE,0xB5,0xCA,0xB4, 0x00];

/* Java formatting: Date.toString() in EDT and Float.toString() */
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function jdate(ms){ const d=new Date(ms - 4*3600e3), p=n=>String(n).padStart(2,'0'); return `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} EDT ${d.getUTCFullYear()}`; }
function jf(v){ const f=Math.fround(v); if (f===0) return '0.0'; for (let p=1;p<10;p++){ const s=f.toPrecision(p); if (Math.fround(+s)===f){ let r=String(+s); if(!/[.e]/.test(r)) r+='.0'; return r; } } return String(f); }
const tsMs = ts => { let v=0; for (let i=0;i<8;i++) v=v*256+ts[i]; return v; };

/* =====================================================================
   EVENT MODEL — PC threads, frame controller, CAN, gearOS on the card, over ~40 s of session
   ===================================================================== */
let B = null, BK = '';
const wall = t => BASE_MS + (Math.round(D.sessionH*3600) + t)*1000;
function build(){
  const key = JSON.stringify([D.prog,D.preset,D.target,D.bypass,D.dts,D.build,D.app,D.custom,D.running,D.second,D.ntp,D.cards,D.sessionH]);
  if (key === BK && B) return B;
  BK = key; nlcRun();
  const N = Math.round(D.sessionH*3600), slot = 10;
  const A1 = reqAddrs(), BUF = APPS[D.app].buf;
  const spans = [], msgs = [], rows = [], canF = [], notes = [];
  const K0 = -30, K1 = 1, HANGK = -3;
  const jit = n => (h32(n,5)-.5)*2*T.JIT + (h32(n,9)<0.03 ? (h32(n,13)-.5)*0.036 : 0);
  const phi = n => { let p = (T.TICK0 + T.DRIFT*n) % 1; return p<0? p+1 : p; };
  const ev = [];
  const inst = D.second ? [1,2] : [1];
  for (let k=K0; k<=K1; k++){
    if (D.running){
      inst.forEach(i=>{
        const r = k + (i===1? T.REQ0 : 0.547) + jit((N+k)*3 + i);   // second copy started at another phase — inferred
        if (D.ntp==='hang' && k > HANGK) return;
        ev.push({t:r, type:'req', inst:i, k, hang: D.ntp==='hang' && k===HANGK});
        ev.push({t:r, type:'proc', inst:i, k});
      });
    }
    ev.push({t:k + phi(N+k), type:'tick', k});
    for (let a=0.03; a<1; a+=T.APP) ev.push({t:k+a, type:'app', k});
  }
  ev.sort((a,b)=>a.t-b.t || (a.type==='proc')-(b.type==='proc'));
  let busy = -1e9, list = [], ts = ntp8(0), lastReqInst = 0;
  const inbox = {1:[], 2:[]};          // TCP bytes waiting at each PC socket
  const toPCs = (t, bytes, kind, extra) => inst.forEach(i=>{ const m = Object.assign({t, inst:i, kind, bytes}, extra||{}); msgs.push(m); inbox[i].push(m); });
  const onCAN = (t, bytes, kind, dir) => { let x=t; canFrames(bytes.length-9).forEach((n,ix)=>{ const d=canT(n); canF.push({t0:x,t1:x+d,n,kind,dir,ix}); x+=d+4e-6; }); return x; };
  function respond(t0, who){
    let t = t0; const vals = {}, samp = {};
    spans.push({lane:'mcu', t0, t1:t0+0.0004, label:`${who}: getCurrentAdd()=${list.length} → sendLoggingResponse()`, col:'--accent'});
    t += 0.0004;
    list.forEach(a=>{
      const A = ADDR[a];
      if (A.k==='float'){
        if (D.dts){
          spans.push({lane:'spi', t0:t, t1:t+T.XFER, label:`Master_Transfer: Get_NLC_${A.f.split('Get_NLC_')[1]} (0x${hx(A.op)})`, col:'--accent2', a});
          samp[a] = t + T.SAMPLE; vals[a] = dtsValue(a, t + T.SAMPLE); t += T.XFER;
        } else { vals[a] = 0; t += 0.00002; samp[a]=t; }
      } else t += 0.0002;
    });
    spans.push({lane:'mcu', t0:t0+0.0004, t1:t, label:`${who}: writeLogValValue × ${list.length} (getters block gearOS)`, col:'--accent'});
    const body = respBody(list, ts, vals), bytes = respBytes(slot, body);
    const canEnd = onCAN(t + 0.0003, bytes, 'resp', 'up');
    spans.push({lane:'mcu', t0:t, t1:t+0.0003, label:'txLoggingData → canSend(src, 0x00, 0xC9)', col:'--accent'});
    toPCs(canEnd + T.FC + T.TCP, bytes, 'resp', {list:list.slice(), vals, samp, ts:ts.slice(), tsInst:lastReqInst, sent:t});
    busy = t + 0.0003; list = [];
    return busy;
  }
  for (const e of ev){
    if (e.type==='req'){
      const ntpEnd = e.t + T.NTP, lane = e.inst===1? 'pc':'pc2';
      if (e.hang){ spans.push({lane, t0:e.t, t1:e.t+50, label:'updateNTPInCardLogDataRequest → NTPUDPClient.getTime() — no reply, waits forever', col:'--bad'}); spans.push({lane:'ntp', t0:e.t, t1:e.t+50, label:'UDP 123 request lost — socket timeout 0', col:'--bad'}); continue; }
      spans.push({lane:'ntp', t0:e.t, t1:ntpEnd, label:'NTP UDP :123 → 192.168.11.60', col:'--ink2'});
      spans.push({lane, t0:e.t, t1:ntpEnd, label:'updateNTPInCardLogDataRequest (getDateTime)', col:'--accent2'});
      const ms = Math.round(wall(ntpEnd)), bytes = reqBytes(A1, slot, ms);
      spans.push({lane, t0:ntpEnd, t1:ntpEnd+0.0002, label:`writeOutputData(${slot}) ${bytes.length} B`, col:'--accent2'});
      msgs.push({t:ntpEnd+T.TCP, inst:e.inst, kind:'req', bytes, dir:'down', ms});
      const ack = {t:ntpEnd+2*T.TCP, inst:e.inst, kind:'ack', bytes:[0,0,0,0,0,0]}; msgs.push(ack); inbox[e.inst].push(ack);
      const arr = onCAN(ntpEnd + T.TCP + T.FC, bytes, 'req', 'down');
      const pt = Math.max(arr, busy);
      spans.push({lane:'mcu', t0:pt, t1:pt+0.0006, label:`canReceive → rxParam: OID 0x0F61 → rxLoggingData (+${A1.length} addr)`, col:'--warn', wait:pt-arr});
      A1.forEach(a=>{ if (!list.includes(a)) list.push(a); });          // addAddressToReplyList, no duplicates
      ts = ntp8(ms); lastReqInst = e.inst;                                 // setLogValValueAbs(0x01) → setTimeStamp
      busy = pt + 0.0006;
      if (D.build==='immediate') respond(busy, 'parcomm (immediate)');
    } else if (e.type==='tick'){
      const st = Math.max(e.t, busy);
      if (D.build==='v602' && list.length) respond(st, 'LogTask');
      else spans.push({lane:'mcu', t0:st, t1:st+0.0001, label: D.build==='v602'? 'LogTask: getCurrentAdd()==0 → nothing' : 'timer', col:'--ink2'});
      const at = Math.max(st, busy) + T.ALIVE, ab = ALIVE(slot);
      spans.push({lane:'mcu', t0:at-0.0004, t1:at, label:'reportStatus → reportParamValue(OID_NLC_LOG_1 0x0F60)', col:'--ink2'});
      const ce = onCAN(at, ab, 'alive', 'up'); toPCs(ce + T.FC + T.TCP, ab, 'alive');
      busy = Math.max(busy, at);
    } else if (e.type==='app'){
      const st = Math.max(e.t, busy); spans.push({lane:'mcu', t0:st, t1:st+T.APP_RUN, label:'appTask (LEDs, signal status, DIPs)', col:'--ink2', late:st-e.t}); busy = Math.max(busy, st+T.APP_RUN);
    }
  }
  // background traffic seen by every client: other cards' OGP reports (≈170 B/s in the pcap) and other NLC cards
  const otherResp = 9 + respBody(A1, ntp8(0), {}).length;
  for (let k=K0; k<=K1; k++){
    for (let j=0;j<6;j++) inst.forEach(i=>inbox[i].push({t:k+h32(k*17+j,21), inst:i, kind:'other', bytes:new Array(j<5?15:27).fill(0)}));
    for (let s=1; s<D.cards; s++){ const ph = h32(s,31); inst.forEach(i=>{ inbox[i].push({t:k+ph+0.26, inst:i, kind:'otherNLC', bytes:new Array(otherResp).fill(0), slot:s}); inbox[i].push({t:k+ph+0.262, inst:i, kind:'other', bytes:new Array(26).fill(0)}); }); }
  }
  // the PC processor thread: one in.read() per second, ≤ BUF bytes, parse restarts at STATE_TCPIPSYNC0
  inst.forEach(i=>{
    const box = inbox[i].sort((a,b)=>a.t-b.t); let ix = 0;
    const lane = i===1? 'proc':'proc2';
    ev.filter(e=>e.type==='proc' && e.inst===i).forEach(e=>{
      if (ix >= box.length) return;
      const rt = Math.max(e.t, box[ix].t);
      if (rt > e.t + 0.95) return;
      spans.push({lane, t0:e.t, t1:rt, label:'readTCPIPInputData: in.read() blocks', col:'--ink2'});
      let bytes = 0, n = 0, wr = rt + 0.0008;
      while (ix < box.length && box[ix].t <= rt){
        const m = box[ix];
        if (bytes + m.bytes.length > BUF){ m.lost = true; m.lostAt = rt; ix++; bytes = BUF; break; }
        bytes += m.bytes.length; ix++;
        if (m.kind==='resp'){ wr += 0.0011; const r = makeRow(m); rows.push({t:wr, inst:i, text:r, m, lagMeas: wr - (m.samp[Object.keys(m.samp)[0]]||m.sent)}); m.loggedAt = wr; }
        n++;
      }
      spans.push({lane, t0:rt, t1:wr+0.0004, label:`parseInputBuffer (${bytes} B, ${n} msg) → setDataTypeBuffers → writeSampleToFile`, col:'--accent2'});
    });
  });
  rows.sort((a,b)=>a.t-b.t);
  B = {spans, msgs:msgs.sort((a,b)=>a.t-b.t), rows, canF, A1, N, phi:phi(N), BUF, notes};
  return B;
}
function makeRow(m){
  const t = jdate(tsMs(m.ts));
  const parts = [t];
  reqAddrs().forEach(a=>{ if (a===1) return; const A=ADDR[a];
    if (!m.list.includes(a)){ parts.push(''); return; }
    if (A.k==='float') parts.push(jf(m.vals[a])); else if (a===2) parts.push('M6205A-3G+NLC\u2400'); else parts.push(A.k==='int8'?'1':''); });
  return parts.join(',') + ',';
}
function header(){ return ['beta','', reqAddrs().map(a=>ADDR[a].n).join(',')+',']; }

/* ---------------- actions: what the controls do in the code ---------------- */
function act(name, fn){
  D.lastTrace = []; const tr = s => D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({ t:SIM.t, name, trace:D.lastTrace.slice() }); if (D.log.length>40) D.log.length=40;
  SIM.refresh();
}
const A = {
  prog(k){ act('Programme: '+PROG[k].label, tr=>{ D.prog=k; tr('The SDI programme changes; the M6205 FPGA routes embedded pairs 1–3 into J4 (dboardIn defaults), the DTS card measures it.'); tr(`K-weighted 100 ms blocks → momentary (400 ms) and short-term (3 s) loudness ${inf}; the logger only sees what LogTask reads once per second.`); }); },
  preset(i){ act('NLC preset: '+PRESETS[i].name, tr=>{ D.preset=i; tr(`DashBoard → setDtsNlcPreset(${i}) → Set_NLC_Preset(0x05, ${i}) [opcode 0x4A] → Set_NLC_TargetLevel [0x4C] (settings.c)`); tr(`${PRESETS[i].set} (settings.c #defines) = ratio ${PRESETS[i].ratio}, dead band ${PRESETS[i].db} dB, attack ${PRESETS[i].att} ms, release ${PRESETS[i].rel} ms (NLC5 Menu.xls)`); tr('Each command is one ≈63 ms Master_Transfer inside canReceive; logging replies wait behind it.'); }); },
  target(v){ act(`Target level ${v} LKFS`, tr=>{ D.target=v; const n=v+40; tr(`setNlcTargetLevel(${n}) → Set_NLC_TargetLevel(0x05, preset, ${n}) sends ${n}−40 = ${v} as a signed 32-bit value (nlcTargetLevel default 16 = −24)`); tr('The logger cannot read the target: 0x01–0x10 have no target address, although the DaySequerra record (nlc5.1st_logging.txt) starts with "5.1 Target".'); }); },
  bypass(b){ act(b?'Output Mode: Bypass':'Output Mode: In-Line', tr=>{ D.bypass=b; tr(`setNlcOutputMode(${b?1:0}) → Set_NLC_OutMode(0x05, ${b?1:0}) [opcode 0x4F]`); tr('In bypass the card still measures: Applied Correction reads 0.0 and output = input.'); }); },
  dts(b){ act(b?'Fit the DTS NLC daughter card in J4':'Pull the DTS NLC daughter card out of J4', tr=>{ D.dts=b; if(!b){ tr('isDtsInitialized() = FALSE → every getNlc…() getter skips Get_NLC_*() and returns 0 (settings.c)'); tr('LogTask still answers: every float is 0.0 — exactly the October 2011 card4/card12/card18.txt logs.'); tr('No Master_Transfer → the reply leaves ≈250 ms earlier.'); } else tr('chkDboardCompatible(): Get_ModelNumber() = 0x2605 (DTS_NLC) → initDts = YES → getters talk to the card again'); }); },
  build(v){ act(v==='v602'?'Card firmware: v602 (timed LogTask)':'Card firmware: "immediate response"', tr=>{ D.build=v;
    if (v==='v602'){ tr('tasklist.c: osTaskList[0] = { initLogTask, LogTask } (highest priority); osTimers: { LogTask, 0, 1000 }'); tr('parcomm.c: OID 0x0F61 → rxLoggingData() only (adds addresses, stores the timestamp)'); tr('Every 1000 ms LogTask: if (getCurrentAdd()) sendLoggingResponse();'); }
    else { tr('"immediate response"/tasklist.c: LogTask commented out of osTaskList and osTimers'); tr('parcomm.c: rxLoggingData(data); if (getCurrentAdd()) sendLoggingResponse(); — inside canReceive'); tr('Reply follows each request by the SPI time only; the 1 s clock beat goes away.'); } }); },
  app(v){ act('Logger build: '+APPS[v].label, tr=>{ D.app=v; const a=reqAddrs(); tr(`initLogRequestAddress(): ${a.map(x=>'0x'+hx(x)).join(', ')}, 0x00 (end of array)`); tr(`OGPFrameArray.initAllLoggingRequests → OGPCard.initCardLoggingDataRequest → WBSLAPPackager.setRequest → ${reqBytes(a,10,0).length}-byte request`); tr(`GLOBAL.TCPIPINPUTBUFFERLENGTH = ${APPS[v].buf}`); if (v!=='threaded') tr('LoggingApplicationGUI: FrameCardTree (JTree + Observer), SettingsPanelLogic, LoggingTabPanel'); }); },
  addr(a){ act(`${D.custom[a]?'Stop':'Start'} logging 0x${hx(a)} ${ADDR[a].n}`, tr=>{ D.custom[a]=D.custom[a]?0:1; if (D.app!=='custom'){ D.app='custom'; tr('Switched to the custom request list.'); } const n=reqAddrs().filter(x=>ADDR[x].k==='float').length; tr(`Request now asks for ${reqAddrs().length} addresses; ${n} are floats → ${n} × Master_Transfer ≈ ${(n*T.XFER*1000).toFixed(0)} ms inside LogTask`); }); },
  running(b){ act(b?'Start the logger (java -jar …)':'File → Exit', tr=>{ D.running=b; if (b){ tr('LocateOGPFrameUsingSLP.locateFrame: findServices("service:broadcast-equipment") → 8320-R&D Frame2 - 20 slot, 192.168.11.42:5253'); tr('OGPFrameArray.connectToAllFrames → new Socket(ip, 5253)'); tr('OGPFrameArray.initAllLoggingRequests; stpe.scheduleAtFixedRate(RunnableLoggingRequest, 0, 1 s); scheduleAtFixedRate(RunnableLoggingDataProcessor, 0, 1 s)'); tr('Cards appear once their alive pulse (OID 0x0F60) arrives — RunnableLoggingRequest only writes to cards with getCardOnlineStatus() true.'); } else { tr('System.exit — sockets close; the card keeps sending alive pulses to nobody.'); D.ui.tabOpen=false; D.ui.viewer=false; } }); },
  second(b){ act(b?'Start a second copy of the logger on the same PC':'Close the second copy', tr=>{ D.second=b; if (b){ tr('Second JVM: new Socket(192.168.11.42, 5253) — Sep162011Log.pcap shows exactly this at 3 561 s (client port 4947)'); tr('The frame controller sends every reply addressed to 0x00 to every TCP client.'); tr('The card merges both requests in replyList (addAddressToReplyList, no duplicates) and keeps only the last timestamp.'); tr('Both copies write "card10.txt" into the same working directory (new WBSLAPLogFile("", "card"+slot+".txt")) → every row twice.'); } else tr('One socket again.'); }); },
  ntp(v){ act(v==='hang'?'NTP server stops answering':'NTP server answers', tr=>{ D.ntp=v; if (v==='hang'){ tr('RunnableLoggingRequest → updateNTPInCardLogDataRequest → NetworkNTPUDP.getDateTime → NTPUDPClient.getTime()'); tr(`commons-net default socket timeout is 0 = wait forever ${inf}: the request thread never returns, scheduleAtFixedRate never runs it again`); tr('No requests → replyList stays empty → LogTask sends nothing. Alive pulses still arrive, so the GUI still says "Online:". (progress.xlsx, 11 Oct 2011: "Requests will stop unexpectedly. don\'t know why yet")'); } else tr('getTime() returns; TimeInfo.getReturnTime() = the PC clock when the reply came back.'); }); },
  cards(n){ act(`${n} NLC card${n>1?'s':''} in the frame`, tr=>{ D.cards=n; tr(`Each card adds a ${9+respBody(reqAddrs(),ntp8(0),{}).length}-byte reply and a 26-byte alive pulse per second to the one TCP stream.`); tr(`OGPFrame.readTCPIPInputData reads at most ${APPS[D.app].buf} bytes once per second; a message cut by the buffer end is lost (parseInputBuffer starts again at STATE_TCPIPSYNC0).`); }); },
  session(h){ act(`Session running for ${h} h`, tr=>{ D.sessionH=h; tr(`Card LogTask phase ${(build().phi*1000).toFixed(1)} ms vs PC request at ≈${(T.REQ0*1000+T.NTP*1000+1.6).toFixed(0)} ms after the second starts.`); tr('The two 1-second clocks are free-running: the card\'s is 7.4 ppm short (pcap), so the reply slides 26.6 ms per hour.'); }); },
  tree(){ D.ui.treeOpen=!D.ui.treeOpen; act('FrameCardTree: double-click frame', tr=>{ tr('FrameCardTree.FrameCardTreedoubleClick: frame element → expand/collapse (JTree)'); }); },
  openTab(){ act('Double-click "M6205A-3G+NLC" in the tree', tr=>{ D.ui.tabOpen=true; tr('FrameCardTree: OGPCard element → find frame index → open the card setup tab'); tr('SettingsPanelLogic.getCardOnlineStatus(): card[10].getCardOnlineStatus() ? "Online:" : "Offline:"'); tr('Location = framepath + "\\\\" + "slot10" + "\\\\" (SettingsPanelLogic)'); }); },
  openLogs(){ act('Open Logs', tr=>{ D.ui.viewer=true; tr('LoggingTabPanel.openLogsPressed → JFileChooser.showDialog(null, "Open Log File") → FileViewer'); tr('The file actually written is card10.txt in the working directory, not the "Location:" path shown.'); }); },
  about(){ D.ui.about=!D.ui.about; act('Help → About', tr=>tr('LoggingApplicationGUIAboutBox: version GLOBAL.VERSION = "beta"')); },
  reset(){ Object.assign(D, {prog:'ad', preset:0, target:-24, bypass:false, dts:true, build:'v602', app:'threaded', custom:{5:1,6:1,7:1,8:1,0x0D:1,0x0E:1}, running:true, second:false, ntp:'ok', cards:1, sessionH:1}); D.ui={treeOpen:true, tabOpen:false, viewer:false, about:false, sel:null, menu:null, byteIx:0}; act('Reset', tr=>tr('Defaults: v602 card, Sep 2011 threaded logger, Light preset, −24 LKFS, 1 h into the session.')); },
};

/* ---------------- shared CSS (device-like rendering of the Swing window) ---------------- */
function ensureCSS(){
  if (document.getElementById('rd21css')) return;
  const s = document.createElement('style'); s.id='rd21css';
  s.textContent = `
  .rd21-win{border:1px solid #2a4f9e;border-radius:6px 6px 2px 2px;background:#ece9d8;color:#111;font:12px Tahoma,Verdana,sans-serif;overflow:hidden}
  .rd21-tb{background:linear-gradient(#2f6fe0,#1b4fc4);color:#fff;font-weight:700;padding:4px 8px;display:flex;align-items:center;gap:6px}
  .rd21-tb .x{margin-left:auto;display:flex;gap:3px}.rd21-tb .x span{display:inline-block;width:16px;height:14px;border-radius:3px;background:#5a8ef0;border:1px solid #fff8}.rd21-tb .x span:last-child{background:#d8532f}
  .rd21-mb{display:flex;gap:2px;padding:2px 4px;border-bottom:1px solid #c9c5b2;position:relative}
  .rd21-mb span{padding:1px 6px;cursor:pointer}.rd21-mb span:hover{background:#316ac5;color:#fff}
  .rd21-menu{position:absolute;top:20px;background:#fff;border:1px solid #888;box-shadow:2px 2px 4px #0004;z-index:5;min-width:150px}
  .rd21-menu div{padding:3px 14px;cursor:pointer}.rd21-menu div:hover{background:#316ac5;color:#fff}.rd21-menu .dis{color:#999;cursor:default}.rd21-menu .dis:hover{background:none;color:#999}
  .rd21-body{display:grid;grid-template-columns:minmax(120px,30%) 1fr;gap:4px;padding:4px;min-height:250px}
  .rd21-tree{background:#fff;border:1px solid #7f9db9;padding:4px;font-size:11.5px;user-select:none}
  .rd21-tree div{white-space:nowrap;cursor:pointer;padding:1px 2px}.rd21-tree .sel{background:#316ac5;color:#fff}
  .rd21-right{border:1px solid #c9c5b2;padding:4px;display:flex;flex-direction:column;gap:3px;min-width:0}
  .rd21-right .big{font-size:14px}.rd21-tabs{display:flex;gap:2px;margin-top:4px}
  .rd21-tabs span{border:1px solid #919b9c;border-bottom:none;padding:2px 8px;background:#f5f4ea;border-radius:3px 3px 0 0;font-size:11px}
  .rd21-tabs .on{background:#fcfcfe;border-top:2px solid #e68b2c}.rd21-tabs .spec{color:#999;font-style:italic}
  .rd21-pane{border:1px solid #919b9c;background:#fcfcfe;flex:1;padding:6px;display:flex;flex-direction:column;justify-content:center;gap:6px;min-height:150px}
  .rd21-loc{display:flex;gap:4px;align-items:center}.rd21-loc input{flex:1;min-width:0;font:11px Tahoma,sans-serif;border:1px solid #7f9db9;padding:2px;background:#fff;color:#111}
  .rd21-loc button,.rd21-win button{font:11px Tahoma,sans-serif;background:linear-gradient(#fff,#e3e1d6);border:1px solid #003c74;border-radius:3px;padding:2px 8px;color:#111}
  .rd21-sb{border-top:1px solid #c9c5b2;padding:2px 6px;font-size:11px;color:#444;display:flex;justify-content:space-between}
  .rd21-con{background:#000;color:#c0c0c0;font:11.5px/1.4 Consolas,monospace;padding:6px 8px;min-height:180px;max-height:240px;overflow:auto;white-space:pre-wrap}
  .rd21-file{font:11px/1.35 var(--mono);background:var(--lane);border:1px solid var(--line);border-radius:6px;padding:6px 8px;max-height:280px;overflow:auto;white-space:pre}
  .rd21-file .new{background:color-mix(in srgb,var(--accent) 22%,transparent)}.rd21-file .dup{color:var(--warn)}
  .rd21-ctl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;font-size:12.5px}
  .rd21-ctl label{display:flex;flex-direction:column;gap:2px}.rd21-ctl select,.rd21-ctl input[type=range]{width:100%}
  .rd21-ctl .ck{flex-direction:row;align-items:center;gap:6px}
  .rd21-bytes{display:flex;flex-wrap:wrap;gap:3px;font:11.5px var(--mono)}
  .rd21-bytes span{padding:1px 4px;border-radius:4px;border:1px solid var(--line);background:var(--chip);cursor:default}
  .rd21-bytes .f-tcp{background:color-mix(in srgb,var(--ink2) 18%,transparent)}.rd21-bytes .f-ogp{background:color-mix(in srgb,var(--accent2) 22%,transparent)}
  .rd21-bytes .f-sync{background:color-mix(in srgb,var(--warn) 25%,transparent)}.rd21-bytes .f-addr{background:color-mix(in srgb,var(--accent) 30%,transparent);font-weight:700}
  .rd21-bytes .f-data{background:color-mix(in srgb,var(--accent) 12%,transparent)}.rd21-bytes .cur{outline:2px solid var(--play)}
  .rd21-hot{cursor:pointer}.rd21-hot:hover rect,.rd21-hot:hover path{stroke:#ffd36a;stroke-width:3}
  .rd21-st{display:inline-block;padding:3px 7px;margin:2px;border-radius:6px;border:1px solid var(--line);font:11.5px var(--mono);background:var(--chip)}
  .rd21-st.on{background:var(--accent);color:#fff;border-color:var(--accent)}
  `;
  document.head.appendChild(s);
}

/* ---------------- controls panel ---------------- */
function controlsHTML(){
  const o = (v, l, cur) => `<option value="${v}" ${String(cur)===String(v)?'selected':''}>${l}</option>`;
  const floats = [5,6,7,8,9,10,11,12,13,14,15,16];
  return `<div class="rd21-ctl">
   <label>Programme on the SDI input<select data-c="prog">${Object.keys(PROG).map(k=>o(k,PROG[k].label,D.prog)).join('')}</select></label>
   <label>NLC preset (DashBoard)<select data-c="preset">${PRESETS.map((p,i)=>o(i,p.name,D.preset)).join('')}</select></label>
   <label>Target level: <b>${D.target} LKFS</b><input type="range" min="-40" max="0" step="1" value="${D.target}" data-c="target"></label>
   <label class="ck"><input type="checkbox" data-c="bypass" ${D.bypass?'checked':''}> Output Mode = Bypass</label>
   <label>Card firmware<select data-c="build">${o('v602','v602 — LogTask every 1000 ms',D.build)}${o('immediate','"immediate response" — reply in parcomm',D.build)}</select></label>
   <label class="ck"><input type="checkbox" data-c="dts" ${D.dts?'checked':''}> DTS NLC daughter card fitted in J4</label>
   <label>Logger build<select data-c="app">${Object.keys(APPS).map(k=>o(k,APPS[k].label,D.app)).join('')}</select></label>
   <label>NLC cards logged in the frame<select data-c="cards">${[1,4,10,20].map(n=>o(n,n+(n===1?' (slot 10 only)':''),D.cards)).join('')}</select></label>
   <label class="ck"><input type="checkbox" data-c="second" ${D.second?'checked':''}> Second copy of the logger running</label>
   <label class="ck"><input type="checkbox" data-c="ntp" ${D.ntp==='hang'?'checked':''}> NTP server stops answering</label>
   <label>Session running for <b>${D.sessionH} h</b><input type="range" min="0" max="6" step="0.25" value="${D.sessionH}" data-c="session"></label>
   <label class="ck"><button data-c="running">${D.running?'File → Exit (stop logger)':'Start the logger'}</button><button data-c="reset">Reset</button></label>
  </div>
  <div class="small" style="margin-top:6px"><b>Values requested</b> (0x01 NTP is always first): ${floats.map(a=>`<label style="display:inline-flex;gap:3px;margin-right:8px"><input type="checkbox" data-addr="${a}" ${reqAddrs().includes(a)?'checked':''}> <span class="mono">0x${hx(a)}</span> ${ADDR[a].n.replace(' (','·').replace('(','·').replace(')','')}</label>`).join('')}</div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{
    const c = el.dataset.c;
    const fire = ()=>{
      if (c==='prog') A.prog(el.value); else if (c==='preset') A.preset(+el.value); else if (c==='target') A.target(+el.value);
      else if (c==='bypass') A.bypass(el.checked); else if (c==='build') A.build(el.value); else if (c==='dts') A.dts(el.checked);
      else if (c==='app') A.app(el.value); else if (c==='cards') A.cards(+el.value); else if (c==='second') A.second(el.checked);
      else if (c==='ntp') A.ntp(el.checked?'hang':'ok'); else if (c==='session') A.session(+el.value);
      else if (c==='running') A.running(!D.running); else if (c==='reset') A.reset();
    };
    if (el.tagName==='BUTTON') el.onclick = fire; else el.onchange = fire;
  });
  m.querySelectorAll('[data-addr]').forEach(el=> el.onchange = ()=>{
    const a = +el.dataset.addr;
    if (D.app!=='custom'){ D.custom = {}; reqAddrs; APPS[D.app].addrs.forEach(x=>{ if (ADDR[x].k==='float') D.custom[x]=1; }); }
    A.addr(a);
  });
}

/* ---------------- the PC application window (redrawn from WBSLumberJackLoggerMain.JPG) ---------------- */
function rowsUpTo(t){ return build().rows.filter(r=>r.t<=t); }
function appHTML(t){
  const S = build();
  if (!D.running) return `<div class="rd21-win"><div class="rd21-tb">☕ Ward-Beck Systems LumberJack Logger</div><div style="padding:30px;text-align:center">Not running. <button data-a="start">java -jar ThreadedLoggingApplication.jar</button></div></div>`;
  if (!APPS[D.app].gui){
    const lines = ['C:\\…\\ThreadedLoggingApplication> java -jar dist\\ThreadedLoggingApplication.jar'];
    lines.push('(no output while logging works: the program only prints on exceptions)');
    if (S.msgs.some(m=>m.lost && m.t<=t)) lines.push('error','error','RunnableLoggingDataProcessor getCurrentDataTypePacketAndLog: exception occured');
    if (D.ntp==='hang') lines.push('… (RunnableLoggingRequest is stuck inside NTPUDPClient.getTime — nothing is printed)');
    const rs = rowsUpTo(t); lines.push('', '> type card10.txt  (last rows)'); rs.slice(-6).forEach(r=>lines.push(r.text));
    return `<div class="rd21-win"><div class="rd21-tb">C:\\WINDOWS\\system32\\cmd.exe — ThreadedLoggingApplication (beta)<span class="x"><span></span><span></span><span></span></span></div><div class="rd21-con">${lines.map(esc).join('\n')}</div><div class="rd21-sb"><span>Sep 2011 build: console only, no window</span><button data-a="exit">Ctrl+C</button></div></div>`;
  }
  const seen = S.msgs.some(m=>m.inst===1 && m.t<=t && (m.kind==='alive'||m.kind==='resp')) || true;
  const nameKnown = reqAddrs().includes(2);
  const cname = nameKnown? 'M6205A-3G+NLC\u25a1' : '(slot 10)';
  const cardsList = [10].concat(Array.from({length:D.cards-1},(_, i)=>i<9? i+1 : i+2)).sort((a,b)=>a-b);
  const m = D.ui.menu;
  const spec = D.app==='custom';
  const rs = rowsUpTo(t);
  return `<div class="rd21-win">
   <div class="rd21-tb">☕ Ward-Beck Systems LumberJack Logger<span class="x"><span></span><span></span><span></span></span></div>
   <div class="rd21-mb"><span data-a="mFile">File</span>${spec?'<span data-a="mSet">Settings</span>':''}<span data-a="mHelp">Help</span>
     ${m==='file'?`<div class="rd21-menu" style="left:4px"><div data-a="exit">Exit</div></div>`:''}
     ${m==='set'?`<div class="rd21-menu" style="left:40px"><div class="dis">Backup Settings… (2012 spec)</div><div class="dis">Logging Settings… → use "Values requested"</div><div class="dis">License… (per frame, ≤10 cards)</div></div>`:''}
     ${m==='help'?`<div class="rd21-menu" style="left:${spec?96:40}px"><div data-a="about">About</div></div>`:''}
   </div>
   <div class="rd21-body">
    <div class="rd21-tree">
      <div data-a="tree">${D.ui.treeOpen?'⊟':'⊞'} 📁 8320-R&amp;D Frame2 - 20 slot</div>
      ${D.ui.treeOpen? cardsList.map(s=>`<div data-a="${s===10?'card':'other'}" class="${s===10&&D.ui.tabOpen?'sel':''}" style="padding-left:22px" title="slot ${s} — double-click opens the card tab">● ${nameKnown?'M6205A-3G+NLC\u25a1':'slot'+s}</div>`).join('') : ''}
    </div>
    <div class="rd21-right">
     ${D.ui.tabOpen? `<div><span class="small">${seen?'Online:':'Offline:'}</span> <span class="big">${esc(cname)}:</span></div>
      <div><span class="small">Online:</span> <span class="big">8320-R&amp;D Frame2 - 20 slot</span></div>
      <div class="rd21-tabs"><span class="on">Logging</span>${spec?'<span class="spec" title="LoggingSoftwareDescription.doc, July 2012 — never built">Histogram</span><span class="spec" title="2012 spec — never built">Errors</span>':''}</div>
      <div class="rd21-pane">
        ${D.ui.viewer? `<div class="small"><b>FileViewer — card10.txt</b> (${rs.length} rows this session window)</div><div class="rd21-file" style="max-height:150px;background:#fff;color:#111">${[...header(), ...rs.slice(-8).map(r=>r.text)].map(esc).join('\n')}</div>`:''}
        <div class="rd21-loc"><span>Location:</span><input readonly value="8320-R&amp;D Frame2 - 20 slot\\slot10\\"><button data-a="logs">Open Logs</button></div>
      </div>` : `<div class="muted" style="margin:auto;color:#666">Double-click a card in the tree.</div>`}
    </div>
   </div>
   <div class="rd21-sb"><span>${D.ui.about?'LumberJack Logger · version beta (GLOBAL.VERSION) · Ward-Beck Systems':'SLP: service:broadcast-equipment · TCP 192.168.11.42:5253'}</span><span>${D.second?'2 copies running':'◯'}</span></div>
  </div>`;
}
function bindApp(el){
  el.onclick = e => {
    const a = e.target.closest('[data-a]'); if (!a) { if (D.ui.menu){ D.ui.menu=null; SIM.refresh(); } return; }
    const k = a.dataset.a;
    if (k==='mFile'){ D.ui.menu = D.ui.menu==='file'?null:'file'; SIM.refresh(); }
    else if (k==='mHelp'){ D.ui.menu = D.ui.menu==='help'?null:'help'; SIM.refresh(); }
    else if (k==='mSet'){ D.ui.menu = D.ui.menu==='set'?null:'set'; SIM.refresh(); }
    else if (k==='exit'){ D.ui.menu=null; A.running(false); }
    else if (k==='start'){ A.running(true); }
    else if (k==='about'){ D.ui.menu=null; A.about(); }
    else if (k==='logs'){ A.openLogs(); }
  };
  el.ondblclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a==='tree') A.tree(); else if (a.dataset.a==='card') A.openTab(); else if (a.dataset.a==='other') act('Double-click another card', tr=>tr('Opens that card\'s tab; this model follows slot 10 only.')); };
}

/* ---------------- the card (artwork reused from the m6205-3g plugin's gerber extraction) ---------------- */
function mcuAt(t){ const S=build(); let best=null; for (const s of S.spans) if (s.lane==='mcu' && t>=s.t0 && t<s.t1) best=s; return best; }
function spiAt(t){ return build().spans.find(s=>s.lane==='spi' && t>=s.t0 && t<s.t1); }
function canAt(t){ return build().canF.find(f=>t>=f.t0 && t<f.t1); }
function cardSVG(t){
  const mcu = mcuAt(t), spi = spiAt(t), can = canAt(t);
  let s = `<svg viewBox="0 0 1542 370" role="img" aria-label="M6205A-3G card with the NLC daughter card" style="width:100%;display:block;border-radius:6px">
   <rect width="1542" height="370" fill="var(--panel2)"/>
   <path d="M4 4 H1452 L1470 22 V52 H1530 V320 H1490 V362 H120 L4 248 Z" fill="#17402a" stroke="#2b5a3e"/>
   <image href="${ASSET}rd21-audiolevelloggingnlc-card.png" width="1542" height="370"/>`;
  if (D.dts) s += `<g class="rd21-hot" data-k="dts"><rect x="447" y="48" width="540" height="226" rx="4" fill="#1f5a36" stroke="${spi?'#7dff6a':'#9ccfaa'}" stroke-width="${spi?4:1.5}" opacity=".93"/>
     <rect x="520" y="110" width="110" height="110" fill="#222" stroke="#555"/><rect x="760" y="110" width="90" height="90" fill="#2a2a2a" stroke="#555"/>
     <text x="717" y="78" text-anchor="middle" font-size="17" fill="#e8f2ea" font-weight="700">DaySequerra AudioXpress card · DTS NLC 5.1</text>
     <text x="717" y="98" text-anchor="middle" font-size="13" fill="#cfe3d5">J4 72-pin SIMM · click to pull it out</text>
     <text x="575" y="168" text-anchor="middle" font-size="11" fill="#bbb">DSP</text><text x="805" y="158" text-anchor="middle" font-size="11" fill="#bbb">FPGA</text>
     <text x="717" y="252" text-anchor="middle" font-size="13" fill="${spi?'#7dff6a':'#9ccfaa'}">${spi? esc(spi.label.replace('Master_Transfer: ','SPI ')) : 'SPI idle'}</text></g>`;
  else s += `<g class="rd21-hot" data-k="dts"><rect x="447" y="280" width="450" height="40" fill="transparent" stroke="#ffd36a" stroke-dasharray="6 4"/><text x="672" y="304" text-anchor="middle" font-size="13" fill="#ffd36a">J4 empty — click to fit the NLC card</text></g>`;
  s += `<g class="rd21-hot" data-k="mcu"><rect x="904" y="146" width="76" height="76" fill="${mcu&&mcu.label.startsWith('LogTask')?'#2c6e49':'#1d1f22'}" stroke="${mcu?'#ffd36a':'#666'}" stroke-width="${mcu?3:1}"/><text x="942" y="180" text-anchor="middle" font-size="11" fill="#eee">U3</text><text x="942" y="194" text-anchor="middle" font-size="9" fill="#bbb">AT90CAN128</text></g>
   <rect x="890" y="232" width="380" height="26" rx="4" fill="#000a"/><text x="898" y="250" font-size="13" fill="#ffd36a" font-family="monospace">${esc(mcu? mcu.label.slice(0,52) : 'gearOS idle')}</text>
   <g class="rd21-hot" data-k="can"><rect x="1393" y="321" width="26" height="20" fill="${can?'#ffd36a':'#333'}" stroke="#888"/><text x="1406" y="357" text-anchor="middle" font-size="11" fill="#ddd">U4 CAN</text></g>
   <text x="1300" y="300" text-anchor="end" font-size="12" fill="${can?'#ffd36a':'#9ccfaa'}">${can? `CAN ${can.dir==='up'?'card → frame':'frame → card'}: ${can.kind} frame ${can.ix+1} (${can.n} B)`:'CAN idle'}</text>
   <text x="30" y="30" font-size="15" fill="#e8f2ea" font-weight="700">M6205A-3G+NLC · slot 10 · firmware 6.02 (M6205pack.txt)</text>
  </svg>`;
  return s;
}
function bindCard(el){ el.onclick = e => { const g = e.target.closest('[data-k]'); if (!g) return; const k=g.dataset.k;
  if (k==='dts') A.dts(!D.dts);
  else if (k==='mcu') act('Look at U3 (AT90CAN128)', tr=>{ tr('gearOS task list (tasklist.c), highest priority first: LogTask, canReceive, appTask, reportStatus'); tr('Timers: LogTask 1000 ms, reportStatus 1000 ms (MONITOR_INTERVAL), appTask 111 ms'); tr('Cooperative: while LogTask is inside Master_Transfer nothing else runs — CAN messages queue in the controller.'); });
  else if (k==='can') act('Look at U4 (CAN transceiver)', tr=>{ tr('candrv.c canSend: messages ≤ 8 bytes go in one frame; longer ones: first frame = length(2) + CRC(2) + 4 data bytes, then 8 bytes per frame'); tr(`A ${build().A1.length}-address request (${reqBytes(reqAddrs(),10,0).length-9} B body) = ${canFrames(reqBytes(reqAddrs(),10,0).length-9).length} frames; the reply = ${canFrames(respBody(reqAddrs(),ntp8(0),{}).length).length} frames; 1 Mbit/s`); }); }; }

/* ---------------- timeline lanes ---------------- */
const LANES = {spi:'J4 SPI · Master_Transfer', mcu:'U3 gearOS (card MCU)', ntp:'NTP UDP :123', pc:'PC · RunnableLoggingRequest', proc:'PC · RunnableLoggingDataProcessor', pc2:'2nd copy · request', proc2:'2nd copy · processor'};
function spanLane(lane, h){
  return { label: LANES[lane], h: h||24, draw(c,X,t0,t1,y,hh){
    const mono = SIM.css('--mono');
    for (const s of build().spans){ if (s.lane!==lane || s.t1<t0 || s.t0>t1) continue;
      const xa = X(Math.max(s.t0,t0)), xb = Math.max(xa+1.5, X(Math.min(s.t1,t1)));
      c.fillStyle = SIM.css(s.col)||'#888'; c.globalAlpha = s.col==='--ink2'? .55 : .9; c.fillRect(xa, y+4, xb-xa, hh-8); c.globalAlpha=1;
      if (xb-xa > 50){ c.save(); c.beginPath(); c.rect(xa, y, xb-xa, hh); c.clip(); c.fillStyle='#fff'; c.font='10px '+mono; c.fillText(s.label, xa+3, y+hh/2+3); c.restore(); }
    } } };
}
function lanesFor(full){
  const S = build();
  const L = [];
  L.push({label:'NLC 5.1 loudness (LKFS)', h:64, draw(c,X,t0,t1,y,h){
    const yv = v => y+h-3-clamp((v+60)/60,0,1)*(h-6), n = Math.min(400, Math.ceil(X(t1)-X(t0))), sp=(t1-t0)/n;
    c.strokeStyle=SIM.css('--grid'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(X(t0),yv(D.target)); c.lineTo(X(t1),yv(D.target)); c.stroke(); c.setLineDash([]);
    [['inM','--ink2'],['inS','--accent2'],['outS','--accent']].forEach(([k,col])=>{ c.strokeStyle=SIM.css(col); c.lineWidth=1.4; c.beginPath(); for(let i=0;i<=n;i++){ const t=t0+i*sp, v=nlcAt(t,0)[k]; i? c.lineTo(X(t),yv(v)) : c.moveTo(X(t),yv(v)); } c.stroke(); });
    const v=nlcAt(SIM.t,0); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`M ${v.inM.toFixed(1)} · S in ${v.inS.toFixed(1)} · S out ${v.outS.toFixed(1)} · target ${D.target} (grey M, blue S in, green S out)`, X(t0)+4, y+11); }});
  L.push({label:'NLC applied correction (dB)', h:34, draw(c,X,t0,t1,y,h){
    const yv = v => y+h/2-clamp(v/20,-1,1)*(h/2-3), n=Math.min(300, Math.ceil(X(t1)-X(t0))), sp=(t1-t0)/n;
    c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),yv(0)); c.lineTo(X(t1),yv(0)); c.stroke();
    c.strokeStyle=SIM.css('--warn'); c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=n;i++){ const t=t0+i*sp, g=nlcAt(t,0).corr; i? c.lineTo(X(t),yv(g)) : c.moveTo(X(t),yv(g)); } c.stroke();
    c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`${nlcAt(SIM.t,0).corr.toFixed(2)} dB`, X(t0)+4, y+11); }});
  if (full){
    L.push({label:'NLC 100 ms loudness blocks', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,0.1,0,0.003,SIM.css('--accent2'),'K-weighted blocks'); }});
    L.push({label:'48 kHz audio samples', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,4e-6,SIM.css('--ink2'),'samples'); }});
  }
  L.push(spanLane('spi'));
  L.push(spanLane('mcu', 26));
  L.push({label:'CAN bus 1 Mbit/s', h:24, draw(c,X,t0,t1,y,h){ for (const f of S.canF){ if (f.t1<t0||f.t0>t1) continue; const xa=X(f.t0), xb=Math.max(xa+1.5,X(f.t1)); c.fillStyle=SIM.css(f.kind==='req'?'--accent2':f.kind==='resp'?'--accent':'--ink2'); c.fillRect(xa,y+(f.dir==='up'?4:12),xb-xa,8); if (xb-xa>46){ c.fillStyle=SIM.css('--ink'); c.font='9px '+SIM.css('--mono'); c.fillText(`${f.kind} #${f.ix+1} ${f.n}B`, xa+2, y+h-2); } } }});
  L.push({label:'Ethernet TCP :5253', h:24, draw(c,X,t0,t1,y,h){ for (const m of S.msgs){ if (m.inst!==1 && m.kind!=='req' && m.kind!=='ack') continue; if (m.t<t0-0.001||m.t>t1) continue; const xa=X(m.t), w=Math.max(2, X(m.t+m.bytes.length*8/100e6+4e-5)-xa); c.fillStyle=SIM.css(m.kind==='req'?'--accent2':m.kind==='resp'?'--accent':'--ink2'); c.fillRect(xa,y+5,w,h-10); if (m.lost){ c.fillStyle=SIM.css('--bad'); c.fillRect(xa,y+2,w,3); } c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`${m.kind} ${m.bytes.length}B`, xa+w+2, y+h/2+3); } }});
  L.push(spanLane('ntp', 18));
  L.push(spanLane('pc'));
  L.push(spanLane('proc'));
  if (D.second){ L.push(spanLane('pc2')); L.push(spanLane('proc2')); }
  L.push({label:'card10.txt rows written', h:20, draw(c,X,t0,t1,y,h){ for (const r of S.rows){ if (r.t<t0||r.t>t1) continue; c.fillStyle=SIM.css(r.inst===1?'--accent':'--warn'); c.fillRect(X(r.t)-1.5,y+3,3,h-6); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(r.text.slice(0,30)+'…', X(r.t)+4, y+h/2+3); } }});
  return L;
}

/* ---------------- byte chips for a message ---------------- */
function fieldsResp(bytes){
  const f = []; const tag=(i,cls,t)=>f[i]={cls,t};
  for (let i=0;i<4;i++) tag(i,'f-tcp','TCP/IP sync BA D2 AC E5');
  tag(4,'f-tcp','source 0x10 + slot'); tag(5,'f-tcp','destination'); tag(6,'f-tcp','message type'); tag(7,'f-tcp','length MSB'); tag(8,'f-tcp','length LSB = data[3] + 4');
  if (bytes.length<13) return f;
  tag(9,'f-ogp','return code'); tag(10,'f-ogp','OID MSB (0x0F = OIDCLASS_DTS)'); tag(11,'f-ogp','OID LSB'); tag(12,'f-ogp','"dlen" = index of the closing sync (LEN_ADDRESS)');
  let i=13; for (let k=0;k<4;k++,i++) tag(i,'f-sync','WBSLAP sync FE B5 CA B4');
  const n = bytes[i]; tag(i,'f-ogp',`alen = ${n} addresses`); i++;
  for (let a=0;a<n && i<bytes.length-4;a++){ const ad=bytes[i]; tag(i,'f-addr',`address 0x${hx(ad)} ${ADDR[ad]?ADDR[ad].n:'(reserved: 0xE5 is the TCP sync byte)'}`); const L=bytes[i+1]; tag(i+1,'f-ogp',`adlen ${L}`); for (let j=0;j<L;j++) tag(i+2+j,'f-data',`data of 0x${hx(ad)}`); i += 2+L; }
  for (let k=0;k<4 && i<bytes.length;k++,i++) tag(i,'f-sync','closing WBSLAP sync');
  while (i<bytes.length){ tag(i,'f-tcp','string terminator'); i++; }
  return f;
}
function chips(bytes, cur){ const f=fieldsResp(bytes); return `<div class="rd21-bytes">${bytes.map((b,i)=>`<span class="${(f[i]||{}).cls||''} ${i===cur?'cur':''}" title="[${i}] ${esc((f[i]||{}).t||'')}">${hx(b)}</span>`).join('')}</div>`; }
function decodeResp(m){
  const rows = m.list.map(a=>{ const A=ADDR[a]; let v='';
    if (a===1) v = `${m.ts.map(b=>hx(b)).join(' ')} → new Date(${tsMs(m.ts)}) = ${jdate(tsMs(m.ts))}`;
    else if (A.k==='float') v = `${f32be(m.vals[a]).map(b=>hx(b)).join(' ')} → ${jf(m.vals[a])} <span class="muted">(sampled ${SIM.fmtDur(Math.abs(m.samp[a]-m.sent))} before send)</span>`;
    else if (a===2) v = '"M6205A-3G+NLC" + 0x00 (strlen + 1)'; else v='0x01';
    return `<tr><td class="mono">0x${hx(a)}</td><td>${A.n}</td><td class="mono small">${v}</td></tr>`; }).join('');
  return `<table class="kv"><tr><th>addr</th><th>name</th><th>bytes → value</th></tr>${rows}</table>`;
}

/* =====================================================================
   TABS
   ===================================================================== */
function viewSim(m){
  ensureCSS();
  m.innerHTML = `<div class="grid2">
   <div>${card('The PC: WBS LumberJack Logger (redrawn from WBSLumberJackLoggerMain.JPG)', `<div id="app"></div><details class="small" style="margin-top:6px"><summary>Original screenshot from the archive</summary><img src="${ASSET}rd21-audiolevelloggingnlc-lumberjack.jpg" style="width:100%;margin-top:4px" alt="LumberJack Logger main window, October 2011"></details>`)}
     ${card('The card in slot 10 (M6205A-3G, JRTI ISS6 artwork via the M6205-3G plugin)', `<div id="cardp"></div><p class="small muted" style="margin:6px 0 0">Click the daughter card, U3 or U4. The card's own DashBoard, routing and NLC menus are modelled in ${plink('m6205-3g','the M6205-3G plugin','sim')}.</p>`)}
     ${card('Controls', controlsHTML())}</div>
   <div>${card('One second on the wire, the card and the PC', `<canvas id="tl"></canvas><p class="small muted" style="margin:4px 0 0">Click to move the playhead. Zoom to 10 ms around a reply to see the CAN frames and SPI transfers. Times are from Sep162011Log.pcap where marked; SPI and CAN times are worked out from the code ${inf}.</p>`)}
     ${card('card10.txt on disk at the playhead', `<div id="file" class="rd21-file"></div>`)}
     ${card('Last logging reply on the wire', `<div id="wire"></div>`)}
     ${card('What the code did', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const appEl = m.querySelector('#app'), cardEl = m.querySelector('#cardp');
  bindApp(appEl); bindCard(cardEl);
  SIM.on('time', ()=>{
    const t = SIM.t, S = build();
    appEl.innerHTML = appHTML(t); cardEl.innerHTML = cardSVG(t);
    SIM.drawLanes(m.querySelector('#tl'), lanesFor(true), {labelW:170});
    const rs = S.rows.filter(r=>r.t<=t);
    const prev = rs.slice(-14);
    m.querySelector('#file').innerHTML = [...header().map(esc), ...prev.map((r,i)=>{ const dup = i && prev[i-1].text===r.text; return `<span class="${r.t>=0?'new':''} ${dup?'dup':''}" title="written at ${SIM.fmtT(r.t)} by copy ${r.inst}; measured ≈${r.lagMeas.toFixed(3)} s earlier">${esc(r.text)}</span>`; })].join('\n') + (D.running? '' : '\n<span class="muted">(logger stopped)</span>');
    const last = S.msgs.filter(x=>x.kind==='resp' && x.inst===1 && x.t<=t).pop();
    m.querySelector('#wire').innerHTML = last? `<p class="small" style="margin:0 0 4px">Arrived at the PC ${SIM.fmtT(last.t)} · ${last.bytes.length} bytes · ${last.lost?'<b style="color:var(--bad)">lost: cut by the 1 s read</b>':last.loggedAt!=null?'logged at '+SIM.fmtT(last.loggedAt):'waiting in the socket for the next in.read()'}</p>${chips(last.bytes)}${decodeResp(last)}` : `<p class="small muted">No reply in this window${D.running?'':' — the logger is stopped'}${D.ntp==='hang'?' — the request thread is stuck in NTP':''}.</p>`;
    const tr = m.querySelector('#trace'); tr.innerHTML = D.log.length? D.log.slice(0,6).map(l=>`<div><b>${esc(l.name)}</b></div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('')).join('') : '<div class="muted">Change a control, double-click the tree or click the card.</div>';
  });
}

/* ---------------- tutorial ---------------- */
const tRespIn = ()=>{ const r = build().msgs.find(x=>x.kind==='resp' && x.inst===1 && x.t>=0 && x.t<1); return r? (SIM.t>=r.t-0.012 && SIM.t<=r.t+0.004 && SIM.win<=0.02) : false; };
const LESSONS = [
  {title:'1 · What RD21 is for', body:`<p>From ${Y(2011)} the CALM Act (FCC 11-84, filed in this R&D folder) and Canadian rules were coming: stations had to <i>prove</i> their loudness. The M6205A-3G+NLC card already corrected loudness with a DTS Neural Loudness Control daughter card. RD21 ("Audio level logging Software for DTS NLC", R&amp;D list) adds a way to record what the card measured, once a second, on a PC.</p><p>The pieces: the NLC card measures; the card's AVR answers <span class="mono">OGP_GET_PARAM</span> requests on OID 0x0F61; the openGear frame bridges CAN to TCP port 5253; a Java program polls, time-stamps and writes a file.</p><p>Goal: the NLC daughter card is fitted and the logger is running.</p>`, hint:'Tick "DTS NLC daughter card fitted" and use "Start the logger".', check:()=>D.dts && D.running},
  {title:'2 · Start-up as the engineer saw it', body:`<p>The ${Y(2011)} program was started from NetBeans or with <span class="mono">java -jar</span>. It finds frames with SLP ("service:broadcast-equipment"), connects, and starts two 1-second threads. The September build has no window: it prints only when something goes wrong.</p><p>Goal: switch to the October 2011 <b>LoggingApplicationGUI</b> build, which has the LumberJack window.</p>`, hint:'Controls → Logger build → LoggingApplicationGUI (Oct 2011).', check:()=>APPS[D.app].gui},
  {title:'3 · Open the card', body:`<p>The left tree lists frames and the NLC cards in them (FrameCardTree, filled by an Observer when the card's name arrives). Double-click a card to open its tab: "Online:" lines for card and frame, and a Logging tab with the log location.</p><p>Goal: double-click <b>M6205A-3G+NLC</b> and press <b>Open Logs</b>.</p>`, hint:'Double-click the card line in the white tree, then the Open Logs button.', check:()=>D.ui.tabOpen && D.ui.viewer},
  {title:'4 · Read a row', body:`<p>Each row is: the time stamp, the card name (Oct build), then the values as Java prints floats, each followed by a comma (the last one too). Note the □ after the name: the card sends the string's 0x00 and Java keeps it — it is in the real screenshot.</p><p>Hover a row in "card10.txt on disk" to see when it was written and how old the measurement was.</p><p>Goal: let the clock run past 0.2 s so this second's row is written.</p>`, hint:'Press Play or drag the transport.', check:()=>build().rows.some(r=>r.t>=0 && r.t<=SIM.t)},
  {title:'5 · One request, one reply', body:`<p>At ≈0.10 s the PC asks NTP for the time, then writes a 40-byte request (TCP lane). The frame turns it into CAN frames. The card's <span class="mono">rxLoggingData()</span> notes the addresses and keeps the 8 time bytes. The reply is not sent now: <span class="mono">LogTask</span> runs on its own 1000 ms timer and answers ≈0.33 s later — the same gap as in the ${Y(2011)} capture.</p><p>Goal: set the zoom to 10 ms and put the playhead on the reply's arrival at the PC.</p>`, hint:'Zoom window → 10 ms; then click the green "resp" mark in the TCP lane (≈0.436 s).', check:tRespIn},
  {title:'6 · Why the reply takes 250 ms', body:`<p>Watch the SPI lane: for each float, the getter (e.g. <span class="mono">getNlcOutShortAvg</span>) calls <span class="mono">Get_NLC_OutShortAvg</span>, one full 256-byte <span class="mono">Master_Transfer</span> to the DTS card, ≈63 ms. Four values = four transfers, so the four numbers in one row come from four different moments.</p><p>Goal: also log Applied Correction (5.1) <b>0x0D</b> and Input Short Average (5.1) <b>0x09</b>, and see the reply move later.</p>`, hint:'Tick 0x0D and 0x09 under "Values requested".', check:()=>reqAddrs().includes(0x0D) && reqAddrs().includes(0x09)},
  {title:'7 · Watch the NLC work', body:`<p>With the commercial starting at 0.400 s, the input short-term loudness (blue) climbs over 3 s while the NLC pulls the gain down (correction lane). The next rows show Input Short Average rising and Applied Correction going negative.</p><p>Goal: choose the <b>Medium</b> preset and a target of <b>−23 LKFS</b> (EBU R 128 style).</p>`, hint:'NLC preset → Medium; target slider → −23.', check:()=>D.preset===1 && D.target===-23},
  {title:'8 · Pull the daughter card', body:`<p>With J4 empty, <span class="mono">isDtsInitialized()</span> is false and every getter returns 0. The card still answers, so the PC logs rows of 0.0 — the October 2011 logs card4, card12 and card18 look exactly like this. Nothing in the row says the card is missing.</p><p>Goal: pull the NLC card (click it on the card drawing), look at the rows, then fit it again.</p>`, hint:'Click the daughter card twice, or untick then tick the box.', check:()=>D.dts && D.log.some(l=>/Pull the DTS/.test(l.name))},
  {title:'9 · Two copies of the logger', body:`<p>On ${Y(2011)}-09-16 a second program connected to the frame (pcap, 3 561 s). The frame sends every reply to both; both append to <span class="mono">card10.txt</span> in the same folder. The result is the pattern in <span class="mono">javate/…/card10.txt</span>: every row twice. The ${Y(2012)} spec says "Only one copy of the Logging software can be run".</p><p>Goal: start a second copy and find a doubled row in card10.txt (shown in orange).</p>`, hint:'Tick "Second copy of the logger running" and press Play.', check:()=>D.second && build().rows.some((r,i,a)=>i && a[i-1].text===r.text && r.t<=SIM.t)},
  {title:'10 · Leave it running for hours', body:`<p>The card's 1000 ms timer and the PC's 1 s scheduler are not locked. In the capture the reply slid 26 ms per hour. After about three hours LogTask fires just <i>before</i> the request arrives: the reply now carries the previous second's time stamp, and with jitter some seconds are missed or merged.</p><p>Goal: close the second copy and set the session to <b>3 h</b> or more; compare the row times with their measurement age.</p>`, hint:'Untick the second copy; move "Session running for" to 3 h.', check:()=>!D.second && D.sessionH>=3},
  {title:'11 · When NTP goes quiet', body:`<p>Before every request the PC asks the NTP server (192.168.11.60) for the time, with no time-out set. If one reply is lost, the request thread waits forever: no more requests, no more rows, but the card's alive pulse still says "Online". This matches the 11 Oct 2011 note "Requests will stop unexpectedly".</p><p>Goal: make the NTP server stop answering, see the log stop, then restore it.</p>`, hint:'Tick "NTP server stops answering", watch, then untick it.', check:()=>D.ntp==='ok' && D.log.some(l=>/stops answering/.test(l.name))},
  {title:'12 · What became of it', body:`<p>In July ${Y(2012)} the design was rethought (LoggingSoftwareDescription.doc): a headless server (even a Raspberry Pi) running the Java poller, PostgreSQL storage, MD5-protected archives for regulators, a browser UI, histograms drawn on the server, licences per frame. None of that is in the folder. The WBSLAP framing lived on in the RD22 32ME/AMS8 protocol. Read the Findings tab.</p>`, auto:true, check:()=>true},
];
let lessonIdx = 0;
function viewTutorial(m){
  ensureCSS();
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — logging an NLC card the way the R&D team did', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div>
      ${card('Controls', controlsHTML())}</div>
    <div>${card('The logger', `<div id="app"></div>`)}${card('The card', `<div id="cardp"></div>`)}
      ${card('Timeline', `<canvas id="tl"></canvas>`)}
      ${card('card10.txt', `<div id="file" class="rd21-file"></div>`)}
      ${card('What the code did', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const appEl=m.querySelector('#app'), cardEl=m.querySelector('#cardp'); bindApp(appEl); bindCard(cardEl);
  const draw = ()=>{
    const t=SIM.t, S=build();
    appEl.innerHTML = appHTML(t); cardEl.innerHTML = cardSVG(t);
    SIM.drawLanes(m.querySelector('#tl'), lanesFor(false), {labelW:150});
    const rs = S.rows.filter(r=>r.t<=t).slice(-10);
    m.querySelector('#file').innerHTML = [...header().map(esc), ...rs.map((r,i)=>`<span class="${r.t>=0?'new':''} ${i&&rs[i-1].text===r.text?'dup':''}" title="measured ≈${r.lagMeas.toFixed(3)} s before it was written">${esc(r.text)}</span>`)].join('\n');
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${esc(D.log[0].name)}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${l.check()&&i!==lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function kweightCoef(){ return [ {b:[1.53512485958697,-2.69169618940638,1.19839281085285], a:[1,-1.69065929318241,0.73248077421585]}, {b:[1,-2,1], a:[1,-1.99004745483398,0.99007225036621]} ]; } // ITU-R BS.1770 at 48 kHz
function synth(t, n){   // audio around t at 48 kHz for the 5.1 L channel: tone or noise shaped by the block loudness — inferred waveform
  const out = new Float32Array(n), nb = nlcRun()[0], i0 = Math.floor((t - T.T0)/0.1);
  const b = nb.blockL(Math.max(0,i0)), amp = Math.pow(10,(b.L+3)/20);
  for (let k=0;k<n;k++){ const tt=t+k/48000; out[k] = D.prog==='tone'? Math.pow(10,-23/20)*Math.sin(2*Math.PI*1000*tt) : D.prog==='silence'? 0 : amp*(Math.sin(2*Math.PI*180*tt)*0.6 + (h32(Math.floor(tt*48000),77)-.5)*1.2 + Math.sin(2*Math.PI*2400*tt)*0.3); }
  return out;
}
function kfilt(x){ const y=new Float32Array(x.length); let s=x; kweightCoef().forEach(q=>{ let x1=0,x2=0,y1=0,y2=0; for (let i=0;i<s.length;i++){ const v=q.b[0]*s[i]+q.b[1]*x1+q.b[2]*x2-q.a[1]*y1-q.a[2]*y2; x2=x1;x1=s[i];y2=y1;y1=v; y[i]=v; } s=Float32Array.from(y); }); return s; }
function meterBar(label, v, lo, hi, col, note){ const p = clamp((v-lo)/(hi-lo),0,1)*100; return `<div style="margin:3px 0"><div class="small" style="display:flex;justify-content:space-between"><span>${label}</span><span class="mono">${note!=null?note:v.toFixed(1)}</span></div><div style="height:10px;background:var(--chip);border-radius:5px;overflow:hidden"><div style="width:${p}%;height:100%;background:${col}"></div></div></div>`; }
function viewSecond(m){
  ensureCSS();
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid3">${card('As the NLC card sees it (live)', `<div id="nlc"></div>`)}${card('As the logger sees it (last row on disk)', `<div id="lg"></div>`)}${card('As a meter in the rack sees it', `<div id="mt"></div>`)}</div>
   <div class="grid2">${card('At the playhead', `<div id="dev"></div>`)}${card('20 ms of audio at the playhead: raw (grey) and K-weighted (blue)', `<canvas id="scope"></canvas><p class="small muted" style="margin:4px 0 0">K-weighting biquads at 48 kHz from ITU-R BS.1770 (the meter standard behind EBU Tech 3341 in Daysequerra Docs/loudness). The waveform itself is synthetic ${inf}.</p>`)}</div>
   ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time', ()=>{
    const t = SIM.t, S = build();
    const f = reqAddrs().filter(a=>ADDR[a].k==='float').length;
    const rows = [
      ['48 kHz samples per channel (5.1 + 2.0 = 8 channels)', '48 000', SIM.fmtDur(1/48000), 'FPGA → J4 serial streams → DTS DSP'],
      ['K-weighted loudness blocks', '10', '100 ms', `400 ms momentary = 4 blocks, 3 s short-term = 30 blocks ${inf}`],
      ['NLC gain updates', '≥10', '', `attack ${PRESETS[D.preset].att} ms / release ${PRESETS[D.preset].rel} ms (${PRESETS[D.preset].name})`],
      ['gearOS 1 ms ticks', '1 000', '1 ms', 'timer0 CTC, OCR0 = 124 (clock.c)'],
      ['appTask passes', '9', '111 ms', 'APPTASK_INTERVAL 111 with NLC_LOG (40 without)'],
      ['PC logging requests', D.running&&D.ntp==='ok'? (D.second?'2':'1') : '0', '1 s', 'RunnableLoggingRequest (ScheduledThreadPoolExecutor)'],
      ['NTP queries', D.running&&D.ntp==='ok'? String(D.cards*(D.second?2:1)) : '0', '', 'one per card per request: NetworkNTPUDP.getDateTime'],
      ['CAN frames for one request / reply', `${canFrames(reqBytes(reqAddrs(),10,0).length-9).length} / ${canFrames(respBody(reqAddrs(),ntp8(0),{}).length).length}`, SIM.fmtDur(canT(8)), 'candrv.c canSend at 1 Mbit/s'],
      ['LogTask passes', D.build==='v602'?'1':'0', '1000 ms', 'tasklist.c osTimers'],
      ['Master_Transfer calls in a reply', String(D.dts? f : 0), SIM.fmtDur(T.XFER), `256 bytes out, wait, '/' hunt, 255 in (SLOW_COM) ${inf}`],
      ['Alive pulses (OID 0x0F60)', '1', '1 s', 'reportStatus → nlcloglive (sigstat.c getNlcLogLive)'],
      ['Rows written to card10.txt', String(S.rows.filter(r=>r.t>=0&&r.t<1).length), '', 'RunnableLoggingDataProcessor → WBSLAPLogFile.writeSampleToFile'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const v = nlcAt(t,0), va = nlcAt(t,1), col=SIM.css('--accent'), col2=SIM.css('--accent2'), w=SIM.css('--warn');
    m.querySelector('#nlc').innerHTML = meterBar('5.1 input momentary', v.inM, -60, 0, SIM.css('--ink2')) + meterBar('5.1 input short-term', v.inS, -60, 0, col2) + meterBar('5.1 input true peak (3 s max)', v.inP, -60, 0, col2) + meterBar('5.1 output short-term', v.outS, -60, 0, col) + meterBar('Applied correction', v.corr, -20, 20, w, v.corr.toFixed(2)+' dB') + meterBar('Stereo output short-term', va.outS, -60, 0, col) + `<p class="small muted">Target ${D.target} LKFS · ${D.bypass?'Bypass':PRESETS[D.preset].name}${D.dts?'':' · <b>no NLC card: nothing measured</b>'}</p>`;
    const r = S.rows.filter(x=>x.t<=t && x.inst===1).pop();
    m.querySelector('#lg').innerHTML = r? (()=>{ const mm=r.m; return reqAddrs().filter(a=>ADDR[a].k==='float').map(a=> mm.list.includes(a)? meterBar(ADDR[a].n, mm.vals[a], ADDR[a].v==='corr'||ADDR[a].v==='comp'? -20:-60, ADDR[a].v==='corr'||ADDR[a].v==='comp'?20:0, col, jf(mm.vals[a])) : '').join('') + `<p class="small muted">Row written ${SIM.fmtT(r.t)}; stamped ${jdate(tsMs(mm.ts))}; values ${(t - (mm.samp[Object.keys(mm.samp)[0]]||mm.sent)).toFixed(3)} s old now.</p>`; })() : '<p class="muted small">No row yet.</p>';
    const vu = v.outM + 20 - 4;   // VU on the AES output: −20 dBFS = 0 VU house alignment; LKFS ≈ dBFS RMS − 0.7 for programme ${'inferred'}
    m.querySelector('#mt').innerHTML = meterBar('SLM-1D VU on AES out (≈)', vu, -20, 3, col, vu.toFixed(1)+' VU') + meterBar('SLM-1D PPM (≈ true peak)', v.outP, -40, 0, w, v.outP.toFixed(1)+' dBFS') + `<p class="small muted">A VU/PPM meter such as the ${plink('slm','SLM-1D','sim')} shows level, not LKFS; the conversion here is rough ${inf}. The NLC itself is in ${plink('m6205-3g','the M6205-3G model','sim')}.</p>`;
    const mc = mcuAt(t), sp = spiAt(t), cf = canAt(t);
    const pcs = S.spans.filter(s=>(s.lane==='pc'||s.lane==='proc') && t>=s.t0 && t<s.t1).map(s=>s.label).join(' · ') || 'threads sleeping in ScheduledThreadPoolExecutor';
    const wm = S.msgs.filter(x=>x.inst===1 && Math.abs(x.t - t) < 0.0006);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · PC clock ${jdate(wall(t))}</td></tr>
      <tr><th>Audio</th><td class="mono">sample ${Math.floor(t*48000)} · block ${Math.floor(t*10)} (100 ms)</td></tr>
      <tr><th>DTS SPI</th><td class="mono">${sp? esc(sp.label)+` · byte ${Math.min(255,Math.floor((t-sp.t0)/ (760/FCPU)))} of the 256-byte write`:'idle'}</td></tr>
      <tr><th>U3 gearOS</th><td class="mono">${mc? esc(mc.label) : 'idle (osRun loop)'}</td></tr>
      <tr><th>CAN</th><td class="mono">${cf? `${cf.kind} frame ${cf.ix+1} (${cf.n} data bytes, ${cf.dir==='up'?'card → frame':'frame → card'})`:'idle'}</td></tr>
      <tr><th>TCP</th><td class="mono">${wm.length? wm.map(x=>`${x.kind} ${x.bytes.length} B`).join(', ') : '—'}</td></tr>
      <tr><th>PC</th><td class="mono small">${esc(pcs)}</td></tr></table>`;
    const sc = m.querySelector('#scope'); const {c, w:W, h:H} = SIM.canvas(sc, 150); const n=960, x=synth(t, n), k=kfilt(synth(t-0.02, 2*n)).slice(n);
    let mx=1e-6; for (let i=0;i<n;i++) mx=Math.max(mx,Math.abs(x[i]),Math.abs(k[i]));
    [[x,'--ink2'],[k,'--accent2']].forEach(([a,col])=>{ c.strokeStyle=SIM.css(col); c.lineWidth=1.2; c.beginPath(); for (let i=0;i<n;i++){ const X=i/n*W, Yv=H/2 - a[i]/mx*(H/2-6); i? c.lineTo(X,Yv) : c.moveTo(X,Yv); } c.stroke(); });
    c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${SIM.fmtT(t)} … +20 ms · peak ${(20*Math.log10(mx)).toFixed(1)} dBFS`, 6, 14);
    SIM.drawLanes(m.querySelector('#tl'), lanesFor(true), {labelW:170});
  });
}

/* ---------------- block diagram ---------------- */
const BLK = {
  sdi:{x:20,y:40,w:150,h:60,t:'SDI programme in', d:'3G/HD/SD-SDI with up to 16 embedded channels. The M6205 FPGA de-embeds and routes pairs 1–3 (5.1) and pair 4 (stereo) to the daughter card (updateMuxAudioRouting defaults).'},
  fpga:{x:200,y:40,w:150,h:60,t:'M6205 FPGA (EP2C35)', d:'De-embedder, router, serial streams to J4, re-embedder. Not changed by RD21.'},
  nlc:{x:380,y:20,w:190,h:100,t:'J4 · DTS NLC 5.1 (DaySequerra AudioXpress)', d:'Measures input loudness (K-weighted, short-term ≈3 s per EBU Tech 3341, inferred), applies correction (ratio, dead band, attack/release) and compression, final limiter. Keeps In/Out short average, true peak, correction and compression for 5.1 and the AUX pair — the 12 floats Get_NLC_Status returns at spi_data[20…64].'},
  mcu:{x:380,y:170,w:190,h:90,t:'U3 AT90CAN128 · gearOS', d:'LogTask (1000 ms, highest priority), canReceive, appTask (111 ms), reportStatus (1000 ms). logman.c keeps replyList (≤20 addresses) and answers with sendLoggingResponse; logcomm.c parses requests (rxLoggingData) and sends (txLoggingData). Getters in settings.c call Get_NLC_* over the bit-banged SPI (PB0/PB1/PB2).'},
  can:{x:620,y:180,w:150,h:70,t:'Frame CAN bus 1 Mbit/s', d:'openGear backplane. candrv.c splits messages into 8-byte frames (first frame: length, CRC, 4 bytes). Request = 5 frames, 4-value reply = 7 frames, alive = 3 frames.'},
  fc:{x:820,y:180,w:170,h:70,t:'Frame controller · 192.168.11.42', d:'Bridges CAN to TCP port 5253 (openGear default). Sends each reply addressed to 0x00 to every connected client (pcap: duplicates once a second connection opened). Answers each request with 6 zero bytes (pcap; meaning not documented). Announces itself by SLP as service:broadcast-equipment.'},
  pc:{x:820,y:20,w:170,h:110,t:'PC · Java (JDK 1.6)', d:'RunnableLoggingRequest: NTP → WBSLAPPackager.setRequest → writeOutputData. RunnableLoggingDataProcessor: readTCPIPInputData (one read per second, ≤1000/10000 B) → OGPFrame.parseInputBuffer → WBSLAPParser.setDataTypeBuffers → processDataTypeData → WBSLAPLogFile.writeSampleToFile.'},
  ntp:{x:1020,y:20,w:130,h:50,t:'NTP server 192.168.11.60', d:'Asked once per card per second by NetworkNTPUDP (commons-net NTPUDPClient). The returned value is getReturnTime(): the PC\'s own clock when the reply arrived.'},
  file:{x:1020,y:90,w:130,h:50,t:'card10.txt', d:'"beta", blank line, column names, then one comma-separated row per reply. Written to the working directory, named only by slot.'},
  gui:{x:1020,y:160,w:130,h:60,t:'LumberJack window', d:'Oct 2011 GUI: frame/card JTree, card tab with "Online:" lines and the log location, Open Logs → FileViewer.'},
};
const BLK_LINKS = [['sdi','fpga'],['fpga','nlc'],['nlc','mcu','SPI 256 B'],['mcu','can'],['can','fc'],['fc','pc','TCP 5253'],['pc','ntp','UDP 123'],['pc','file'],['pc','gui']];
function viewBlock(m){
  ensureCSS();
  m.innerHTML = `${card('Block diagram — click a block', `<div id="bd"></div>`)}${card('Details', `<div id="bdi" class="small">Click a block.</div>`)}
    ${card('Messages that cross the boundaries', `<table class="kv small"><tr><th>message</th><th>OGP type / OID</th><th>from → to</th><th>when</th><th>source</th></tr>
      <tr><td>Logging Data Request</td><td class="mono">0x49 OGP_GET_PARAM · 0x0F61</td><td>PC 0x00 → card 0x10+slot</td><td>every 1 s</td><td>WBSLAPPackager.setRequest</td></tr>
      <tr><td>Logging Data Response</td><td class="mono">0xC9 · 0x0F61</td><td>card → 0x00</td><td>next LogTask tick (v602) or at once (immediate build)</td><td>logman.c sendLoggingResponse</td></tr>
      <tr><td>Alive pulse</td><td class="mono">0x10 REPORT · 0x0F60</td><td>card → 0x02</td><td>every 1 s</td><td>main.c monParams, sigstat.c getNlcLogLive</td></tr>
      <tr><td>Restart trap</td><td class="mono">0x11</td><td>card → frame</td><td>after boot</td><td>main.c ogpSendRestartTrap — ignored by the Java parser</td></tr>
      <tr><td>DTS status/getters</td><td class="mono">'/' F0 05 op … sum CR</td><td>U3 ↔ J4</td><td>once per float per reply</td><td>dtsserial.c Build_Master_write_message</td></tr></table>`)}`;
  const draw = ()=>{
    let s = `<svg viewBox="0 0 1170 290" style="width:100%" role="img" aria-label="RD21 block diagram"><defs><marker id="rd21ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>`;
    const cx = b=>BLK[b].x+BLK[b].w/2, cy=b=>BLK[b].y+BLK[b].h/2;
    BLK_LINKS.forEach(([a,b,l])=>{ s+=`<line x1="${cx(a)}" y1="${cy(a)}" x2="${cx(b)}" y2="${cy(b)}" stroke="var(--ink2)" stroke-width="1.5" marker-end="url(#rd21ar)"/>`; if(l) s+=`<text x="${(cx(a)+cx(b))/2+4}" y="${(cy(a)+cy(b))/2-4}" font-size="11" fill="var(--ink2)">${l}</text>`; });
    Object.keys(BLK).forEach(k=>{ const b=BLK[k], on=D.ui.sel===k, dead=(k==='nlc'&&!D.dts)||((k==='pc'||k==='gui')&&!D.running);
      s+=`<g class="rd21-hot" data-b="${k}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${on?'color-mix(in srgb,var(--accent) 25%,var(--panel))':'var(--panel2)'}" stroke="${dead?'var(--bad)':'var(--line)'}" stroke-width="${on?2.5:1.5}" ${dead?'stroke-dasharray="5 4"':''}/>
        <foreignObject x="${b.x+4}" y="${b.y+4}" width="${b.w-8}" height="${b.h-8}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:13px var(--sans);color:var(--ink);text-align:center">${b.t}</div></foreignObject></g>`; });
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ D.ui.sel=g.dataset.b; draw(); });
    const b = BLK[D.ui.sel]; m.querySelector('#bdi').innerHTML = b? `<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p>` : 'Click a block.';
  };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function viewSchem(m){
  ensureCSS();
  const pin = (x,y,n,net,side) => side==='r'? `<line x1="${x}" y1="${y}" x2="${x+60}" y2="${y}" stroke="var(--ink)"/><text x="${x-4}" y="${y+4}" text-anchor="end" font-size="11" fill="var(--ink)">${n}</text><text x="${x+64}" y="${y+4}" font-size="11" fill="var(--accent2)" font-family="var(--mono)">${net}</text>` : `<line x1="${x-60}" y1="${y}" x2="${x}" y2="${y}" stroke="var(--ink)"/><text x="${x+4}" y="${y+4}" font-size="11" fill="var(--ink)">${n}</text><text x="${x-64}" y="${y+4}" text-anchor="end" font-size="11" fill="var(--accent2)" font-family="var(--mono)">${net}</text>`;
  const s1 = `<svg viewBox="0 0 1100 330" style="width:100%" role="img" aria-label="Card-side logging path, redrawn">
    <text x="10" y="18" font-size="13" font-weight="700" fill="var(--ink)">Sheet 1 — card side of the logging path (REDRAWN, not the original CAD)</text>
    <rect x="420" y="50" width="200" height="230" fill="none" stroke="var(--ink)" stroke-width="1.5"/><text x="520" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">U3 AT90CAN128</text><text x="520" y="86" text-anchor="middle" font-size="10" fill="var(--ink2)">8 MHz · gearOS · fw 6.02</text>
    ${pin(420,110,'PB0','DOLBY_MSFS (DTS SPI)','l')}${pin(420,135,'PB1','DOLBY_MSBC (DTS clock)','l')}${pin(420,160,'PB2','DOLBY_MSD (DTS data)','l')}${pin(420,185,'PB3','DSP_RESET','l')}
    ${pin(620,110,'PD5 TXCAN','CAN_TX','r')}${pin(620,135,'PD6 RXCAN','CAN_RX','r')}${pin(620,185,'PA0…7','SW1 DIP','r')}${pin(620,210,'PE5/6/7, PD0','ALTERA SPI','r')}
    <rect x="10" y="95" width="150" height="110" fill="none" stroke="var(--ink)" stroke-dasharray="5 3"/><text x="85" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">J4 72-pin SIMM</text><text x="85" y="136" text-anchor="middle" font-size="10" fill="var(--ink2)">DTS NLC 5.1 card</text><text x="85" y="160" text-anchor="middle" font-size="10" fill="var(--ink2)">'/' F0 05 op data… sum CR</text><text x="85" y="176" text-anchor="middle" font-size="10" fill="var(--ink2)">256-byte frames, bit-banged</text>
    <line x1="160" y1="135" x2="200" y2="135" stroke="var(--ink)" stroke-dasharray="3 3"/>
    <rect x="820" y="95" width="110" height="70" fill="none" stroke="var(--ink)"/><text x="875" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">U4</text><text x="875" y="134" text-anchor="middle" font-size="10" fill="var(--ink2)">SN65HVD233</text><text x="875" y="150" text-anchor="middle" font-size="10" fill="var(--ink2)">CAN transceiver</text>
    <line x1="930" y1="115" x2="1000" y2="115" stroke="var(--ink)"/><line x1="930" y1="145" x2="1000" y2="145" stroke="var(--ink)"/><text x="1004" y="119" font-size="11" fill="var(--accent2)" font-family="var(--mono)">CANH</text><text x="1004" y="149" font-size="11" fill="var(--accent2)" font-family="var(--mono)">CANL</text><text x="1004" y="175" font-size="10" fill="var(--ink2)">→ frame backplane</text>
    <text x="10" y="300" font-size="10.5" fill="var(--ink2)">Redrawn from: dtsserial.c (spi_write/spi_read on PORTB bits 0–2), main.c initPorts (PB3 DSP_RESET), candrv.c (1 Mbit/s),</text><text x="10" y="316" font-size="10.5" fill="var(--ink2)">the M6205-3G plugin's reading of the ISS6 IPC netlist (J4 DOLBY_* nets, U4). TXCAN/RXCAN pins from the AT90CAN128 data sheet ${'(inferred)'}.</text>
  </svg>`;
  const s2 = `<svg viewBox="0 0 1100 250" style="width:100%" role="img" aria-label="Network, redrawn">
    <text x="10" y="18" font-size="13" font-weight="700" fill="var(--ink)">Sheet 2 — the R&amp;D network of ${Y(2011)}-09-16 (REDRAWN from Sep162011Log.pcap and the Java source)</text>
    ${[['PC (NetBeans / java)','192.168.11.69',60],['8320-R&D Frame2 · frame controller','192.168.11.42 : 5253',420],['NTP server','192.168.11.60 : 123',800]].map(([a,b,x])=>`<rect x="${x}" y="60" width="240" height="60" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+120}" y="84" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${a}</text><text x="${x+120}" y="104" text-anchor="middle" font-size="11" fill="var(--accent2)" font-family="var(--mono)">${b}</text>`).join('')}
    <line x1="180" y1="120" x2="180" y2="170" stroke="var(--ink)"/><line x1="540" y1="120" x2="540" y2="170" stroke="var(--ink)"/><line x1="920" y1="120" x2="920" y2="170" stroke="var(--ink)"/><line x1="180" y1="170" x2="920" y2="170" stroke="var(--ink)" stroke-width="3"/>
    <text x="550" y="190" text-anchor="middle" font-size="11" fill="var(--ink2)">Ethernet LAN 192.168.11.0/24 · SLP multicast 239.255.255.253:427 (RFC 2608, in the folder) for frame discovery</text>
    <text x="10" y="225" font-size="10.5" fill="var(--ink2)">Client ports in the capture: 1244 (first logger), 4946 (opened and closed), 4947 (second logger from 3 561 s). The NTP address is hard-coded in initUDPNTPIPAddress (C0 A8 0B 3C).</text>
  </svg>`;
  const s3 = `<svg viewBox="0 0 1100 200" style="width:100%" role="img" aria-label="Message layout">
    <text x="10" y="18" font-size="13" font-weight="700" fill="var(--ink)">Sheet 3 — one logging reply, field by field (WBSLoggingApplicationProtocol.doc + logman.c)</text>
    ${[['TCP sync','BA D2 AC E5',4],['src','0x1A',1],['dst','0x00',1],['type','C9',1],['len','00 2F',2],['rc','00',1],['OID','0F 61',2],['"dlen"','2B',1],['WBSLAP sync','FE B5 CA B4',4],['alen','05',1],['0x01 · 8 · time','…',10],['0x05 · 4 · float','…',6],['0x06…','…',6],['0x07…','…',6],['0x08…','…',6],['sync','FE B5 CA B4',4]].reduce((acc,[n,v,w])=>{ const x=acc.x, W=Math.max(36,w*15); acc.s+=`<rect x="${x}" y="50" width="${W}" height="50" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+W/2}" y="70" text-anchor="middle" font-size="10" fill="var(--ink)">${n}</text><text x="${x+W/2}" y="88" text-anchor="middle" font-size="10" fill="var(--accent2)" font-family="var(--mono)">${v}</text>`; acc.x+=W; return acc; },{x:10,s:''}).s}
    <text x="10" y="130" font-size="11" fill="var(--ink2)">Bytes 0–8 are added by the frame controller; the card's canSend body starts at "rc". "dlen" is the index of the closing sync inside that body (data[LEN_ADDRESS] = indexAdd), and the OGP length is that + 4.</text>
    <text x="10" y="150" font-size="11" fill="var(--ink2)">Floats are IEEE-754 MSB first (binio.c writeFloat → writeUlong), which is what Java's ByteBuffer.getFloat expects.</text>
  </svg>`;
  m.innerHTML = card('Schematics (redrawn — the logging path has no schematic of its own; nets and pins from the code and the M6205 netlist)', s1 + s2 + s3);
}

/* ---------------- software ---------------- */
const JSTATES = ['TCPIPSYNC0','TCPIPSYNC1','TCPIPSYNC2','TCPIPSYNC3','SOURCEADDR','DESTADDR','MESSAGETYPE','LENGTH0','LENGTH1','RC','OID0','OID1','DLEN','LOGSYNC0','LOGSYNC1','LOGSYNC2','LOGSYNC3','ALEN','ADDR','ADLEN','ADATA','ENDLOGSYNC0','ENDLOGSYNC1','ENDLOGSYNC2','ENDLOGSYNC3','INVALIDDATA'];
function parseTrace(bytes){   // port of OGPFrame.parseInputBuffer (Sep 2011): state before each byte
  const st=[]; let s=0, alen=0, adlen=0;
  for (let i=0;i<bytes.length;i++){ const d=bytes[i]; st.push(s);
    switch(s){
      case 0: s = d===0xBA?1:0; break; case 1: s=d===0xD2?2:0; break; case 2: s=d===0xAC?3:0; break; case 3: s=d===0xE5?4:0; break;
      case 4: s = (d-16>=0 && d-16<=20)?5:0; break; case 5: s=6; break; case 6: s=(d===0xC9||d===0x10)?7:0; break;
      case 7: s=8; break; case 8: s=9; break; case 9: s=10; break; case 10: s=11; break; case 11: s=12; break; case 12: s=13; break;
      case 13: s=d===0xFE?14:25; break; case 14: s=d===0xB5?15:25; break; case 15: s=d===0xCA?16:25; break; case 16: s=d===0xB4?17:25; break;
      case 17: alen=d; s = d===0?21:18; break; case 18: alen--; s=19; break; case 19: adlen=d; s=20; break;
      case 20: adlen--; s = adlen>0?20 : alen>0?18:21; break;
      case 21: s=22; break; case 22: s=23; break; case 23: s=24; break; case 24: s=0; break; default: s=0;
    } }
  return st;
}
function viewSoft(m){
  ensureCSS();
  m.innerHTML = `<div class="grid2">
   <div>${card('Card: gearOS task list (tasklist.c) — running task at the playhead', `<div id="tasks"></div>`)}
     ${card('Card: what one reply costs (logman.c → settings.c → dtsserial.c)', `<div id="cost"></div>`)}
     ${card('PC: the two Java threads at the playhead', `<div id="thr"></div>`)}
     ${card('K-weighting filter (BS.1770, 48 kHz) used for the loudness measurement', `<canvas id="kw"></canvas>`)}</div>
   <div>${card('PC: OGPFrame.parseInputBuffer state machine — step through the last reply', `<div id="sm"></div>`)}
     ${card('Address map: logaddrs.h ⇄ GLOBAL.java ⇄ WBSLAP doc ⇄ DTS opcode', `<div id="amap"></div>`)}
     ${card('DTS bulk status (Get_NLC_Status, opcode 0x49) — written but not called', `<table class="kv small"><tr><th>spi_data offset</th><th>value</th><th>setter</th></tr>${[[20,'5.1 Input Short Avg','setNlcInShortAvg'],[24,'5.1 Input True Peak','setNlcInTruePeak'],[28,'5.1 Output Short Avg','setNlcOutShortAvg'],[32,'5.1 Output True Peak','setNlcOutTruePeak'],[36,'5.1 Correction','setNlcOutCorrection'],[40,'5.1 Compression','setNlcOutCompression'],[44,'2.0 Input Short Avg','setNlcAuxInShortAvg'],[48,'2.0 Input True Peak','setNlcAuxInTruePeak'],[52,'2.0 Output Short Avg','setNlcAuxOutShortAvg'],[56,'2.0 Output True Peak','setNlcAuxOutTruePeak'],[60,'2.0 Correction','setNlcAuxOutCorrection'],[64,'2.0 Compression','setNlcAuxOutCompression']].map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table><p class="small muted">One transfer for all twelve values, instead of one per value. readNlcLoggingValues() wraps it, but every call to it in LogTask and parcomm.c is commented out.</p>`)}</div></div>`;
  const kw = m.querySelector('#kw');
  SIM.on('time', ()=>{
    const t = SIM.t, S = build(), mc = mcuAt(t);
    const tasks = [['LogTask','1000 ms timer, priority 0',D.build==='v602'],['canReceive','on CAN rx',true],['appTask','111 ms',true],['reportStatus','1000 ms (alive pulse)',true]];
    m.querySelector('#tasks').innerHTML = tasks.map(([n,d,on])=>{ const run = mc && (mc.label.startsWith(n) || (n==='canReceive'&&mc.label.startsWith('canReceive')) || (n==='LogTask'&&/LogTask|txLogging/.test(mc.label)&&D.build==='v602') || (n==='canReceive'&&/parcomm/.test(mc.label))); return `<span class="rd21-st ${run?'on':''}" style="${on?'':'opacity:.4;text-decoration:line-through'}" title="${d}">${n}</span>`; }).join(' ') + `<p class="small mono" style="margin:6px 0 0">${mc? esc(mc.label) : 'osRun(): idle'}</p><p class="small muted">gearOS is cooperative: a task runs to the end. While LogTask waits on the DTS card, canReceive cannot run; a request that arrives then is processed late (${S.spans.filter(s=>s.lane==='mcu'&&s.wait>0.001).length} late in this window).</p>`;
    const fl = reqAddrs().filter(a=>ADDR[a].k==='float');
    m.querySelector('#cost').innerHTML = `<table class="kv small"><tr><th>step</th><th>time</th></tr>
      <tr><td>Build_Master_write_message → spi_drv_writebytes(256)</td><td class="mono">${SIM.fmtDur(T.SPI_W)}</td></tr>
      <tr><td>SLOW_COM: wait2(5000) × 3 ${inf}</td><td class="mono">${SIM.fmtDur(T.SPI_WAIT)}</td></tr>
      <tr><td>hunt for '/' (≈40 bytes) ${inf}</td><td class="mono">${SIM.fmtDur(T.SPI_SL)}</td></tr>
      <tr><td>spi_drv_readbytes(255)</td><td class="mono">${SIM.fmtDur(T.SPI_R)}</td></tr>
      <tr><th>one Master_Transfer</th><th class="mono">${SIM.fmtDur(T.XFER)}</th></tr>
      <tr><th>${fl.length} floats requested → LogTask busy</th><th class="mono">${SIM.fmtDur(fl.length*T.XFER)}</th></tr></table>
      <p class="small muted">Byte times use the m6205-3g plugin's cycle counts (≈760 cycles per written byte, ≈640 per read byte at 8 MHz). With all 12 floats LogTask would hold the card for ≈${(12*T.XFER).toFixed(2)} s of every second.</p>`;
    const th = ['pc','proc'].map(l=>{ const s=S.spans.find(x=>x.lane===l && t>=x.t0 && t<x.t1); return `<tr><th>${l==='pc'?'RunnableLoggingRequest':'RunnableLoggingDataProcessor'}</th><td class="mono small">${s? esc(s.label) : (D.running?'waiting for the next scheduleAtFixedRate tick':'not running')}</td></tr>`; }).join('');
    m.querySelector('#thr').innerHTML = `<table class="kv">${th}</table><p class="small muted">Both are single-thread ScheduledThreadPoolExecutors started at the same instant with a 1 s period. The processor does one blocking <span class="mono">in.read()</span> per run, so a reply that arrives after the read waits ≈${(1-T.LAG).toFixed(2)} s in the socket.</p>`;
    // state machine stepper
    const last = S.msgs.filter(x=>x.kind==='resp' && x.inst===1 && x.t<=t).pop() || S.msgs.find(x=>x.kind==='resp');
    if (last){
      const st = parseTrace(last.bytes); const ix = clamp(D.ui.byteIx, 0, last.bytes.length-1); const cur = st[ix];
      m.querySelector('#sm').innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><button id="b0">⏮</button><button id="bm">◀ byte</button><button id="bp">byte ▶</button><span class="mono small">byte ${ix}: 0x${hx(last.bytes[ix])} in STATE_${JSTATES[cur]} (${cur})</span></div>${chips(last.bytes, ix)}
        <div style="margin-top:8px">${JSTATES.map((n,i)=>`<span class="rd21-st ${i===cur?'on':''}">${i} ${n}</span>`).join('')}</div>
        <p class="small muted">States 0–12 are OGPFrame (OGP framing, slot from the source address); 13–24 are the WBSLAP part, mirrored by WBSLAPParser.setDataTypeBuffers on the per-card FIFO. A packet cut by the end of a read leaves the machine mid-way; the next read starts again at STATE_TCPIPSYNC0.</p>`;
      const go = d=>{ D.ui.byteIx = d===0? 0 : clamp(ix+d, 0, last.bytes.length-1); SIM.refresh(); };
      m.querySelector('#b0').onclick=()=>go(0); m.querySelector('#bm').onclick=()=>go(-1); m.querySelector('#bp').onclick=()=>go(1);
    } else m.querySelector('#sm').innerHTML = '<p class="muted small">No reply in this window.</p>';
    m.querySelector('#amap').innerHTML = `<table class="kv small"><tr><th>addr</th><th>logaddrs.h / GLOBAL.java name</th><th>card source</th><th>DTS op</th><th>asked for?</th></tr>${Object.keys(ADDR).map(Number).map(a=>`<tr><td class="mono">0x${hx(a)}</td><td>${ADDR[a].n}</td><td class="mono" style="font-size:11px">${ADDR[a].f}</td><td class="mono">${ADDR[a].op?'0x'+hx(ADDR[a].op):''}</td><td>${reqAddrs().includes(a)?'<b>yes</b>':''}</td></tr>`).join('')}<tr><td class="mono">0xE5</td><td>alive pulse "address" (sigstat.c)</td><td colspan="3">reserved in logaddrs.h (RESERVED_LOG_ADDR_9)</td></tr></table>`;
    const {c, w, h} = SIM.canvas(kw, 160); const q = kweightCoef();
    const resp = f=>{ const wv=2*Math.PI*f/48000; let mag=1; q.forEach(({b,a})=>{ const re=(k,arr)=>arr[0]+arr[1]*Math.cos(-wv)+arr[2]*Math.cos(-2*wv), im=(arr)=>arr[1]*Math.sin(-wv)+arr[2]*Math.sin(-2*wv); const nr=re(0,b), ni=im(b), dr=re(0,a), di=im(a); mag*=Math.hypot(nr,ni)/Math.hypot(dr,di); }); return 20*Math.log10(mag); };
    const X = f=>40+(Math.log10(f)-1)/(Math.log10(24000)-1)*(w-50), Yd = d=>h-20-(d+20)/28*(h-30);
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono');
    [20,100,1000,10000].forEach(f=>{ c.beginPath(); c.moveTo(X(f),10); c.lineTo(X(f),h-20); c.stroke(); c.fillText(f>=1000?f/1000+'k':f, X(f)+2, h-6); });
    [-20,-10,0,4].forEach(d=>{ c.beginPath(); c.moveTo(40,Yd(d)); c.lineTo(w-10,Yd(d)); c.stroke(); c.fillText(d+' dB', 2, Yd(d)+3); });
    c.strokeStyle=SIM.css('--accent2'); c.lineWidth=2; c.beginPath(); for (let i=0;i<=300;i++){ const f=10*Math.pow(2400,i/300); const d=resp(f); i? c.lineTo(X(f),Yd(d)) : c.moveTo(X(f),Yd(d)); } c.stroke();
    c.fillStyle=SIM.css('--ink'); c.fillText('high-pass ≈38 Hz (RLB) + high shelf +4 dB above ≈1.5 kHz', 46, 20);
  });
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  ensureCSS();
  const F = [
    ['What was decided', `The ${Y(2011)} plan (protocol.doc, WBSLoggingApplicationProtocol.doc): the card answers <span class="mono">OGP_GET_PARAM</span> on OID 0x0F61 with "WBSLAP" records (sync FE B5 CA B4, alen, addr/adlen/data…, sync), the PC polls once a second, time comes from NTP, a card is offline after 5 s of silence. The July ${Y(2012)} rethink (LoggingSoftwareDescription.doc, notes from an outside consultant): run the Java poller on a headless server (a Raspberry Pi is named), store in PostgreSQL, zip and MD5-protect data "when presenting to CRTC for validation", browser UI over JSON, histograms drawn on the server, licence per frame for up to 10 cards, logs kept 3 months, alarms on screen, by e-mail or audible. Open question left in the spec: how to tell a real fault from a programme switch.`],
    ['What became of it', `Nothing in the archive shows the logger shipping: the R&amp;D list gives RD21 status "?", the M6205A-3G manual (issue 1, Sep ${Y(2011)}) has no logging section, and the newest code is the 12 Oct ${Y(2011)} snapshot with only the Logging tab working. The framing did live on: RD22-MADI/Software/32MECommunicationProtocoll.doc (Nov ${Y(2012)}) copies the WBSLAP message tables, and the AMS8 firmware trees carry <span class="mono">WBSLAPPackager</span> renamed <span class="mono">PaliComProtocolPackager._c</span>.`],
    ['The four numbers in a row are not from one moment', `In v602 every float getter (settings.c <span class="mono">getNlcOutShortAvg</span> etc.) calls its own <span class="mono">Get_NLC_*</span> → <span class="mono">Master_Transfer()</span>: 256 bytes out, SLOW_COM waits, 255 bytes in — ≈63 ms each ${inf}. A 4-value row spans ≈190 ms; all 12 floats would keep LogTask busy ≈0.75 s per second, with canReceive starved (gearOS is cooperative). <span class="mono">Get_NLC_Status</span> (opcode 0x49) returns all twelve in one transfer (offsets 20–64), but <span class="mono">readNlcLoggingValues()</span> is commented out in logtask.c and in the immediate build's parcomm.c.`],
    ['"NTP time" is the PC clock, echoed', `<span class="mono">NetworkNTPUDP.getDateTime</span> returns <span class="mono">TimeInfo.getReturnTime()</span> — the PC's own millisecond clock when the NTP reply arrived, not the server's time or an offset. The card stores the 8 bytes (<span class="mono">setTimeStamp</span>, applogvals.c) and sends them back. A row's time is therefore the time of the <i>request</i>; in the capture the measurement was taken ≈0.25–0.34 s later and the row written ≈1 s after that. The PC-simulation card (below) put its own tick count there instead.`],
    ['Two free-running 1-second clocks', `LogTask runs on a 1000-tick gearOS timer (tasklist.c); the PC uses <span class="mono">scheduleAtFixedRate(…, 1, SECONDS)</span>. Decoding Sep162011Log.pcap (3 797 requests, 4 030 replies over 3 930 s) shows the reply 0.31–0.34 s after the request, sliding 26 ms per hour (card period ≈7.4 ppm short). After ≈3 h the tick passes the request: replies then carry the previous request's stamp, and with the ±10–20 ms request jitter some ticks get two requests (one stamp lost) or none (a missing second). Use the Session slider.`],
    ['Duplicate rows = two loggers', `At 3 561 s in the capture a second client connects (port 4947) and both send requests. The frame controller copies every reply to both sockets: 232 back-to-back duplicate replies. Both programs open <span class="mono">new WBSLAPLogFile("", "card"+slot+".txt")</span> in the working directory, so a shared folder gets each row twice — the pattern of javate/ThreadedLoggingApplication/card10.txt (148 doubled seconds, 18–20 Sep ${Y(2011)}). The ${Y(2012)} spec's first rule is "Only one copy of the Logging software can be run".`],
    ['The logged values were not live', `All 4 030 replies in the capture carry the same floats C1 83 1E B8 / C1 E3 70 A4 / C2 37 F5 C3 / C2 55 CC CD = −16.39, −28.43, −45.99, −53.45 for over an hour, and card10.txt repeats them; the "true peak" is below the "short average", which a real measurement cannot do. The October logs show 0.0 (getter fails → <span class="mono">return 0</span>) and −60.0 (the DTS floor also seen in nlc_data.txt). No row in the archive is a real programme measurement ${infT('read from the decoded capture and the log files; why the values froze is not recorded')}.`],
    ['"PC Simulation for logging" simulates the PC, not the audio', `README infers a build that fakes values. In fact its zeuslib/framework/logman.c has <span class="mono">LogTask → sendLogRequest1()</span>: a card that sends WBSLAP requests over CAN to slot 10 (dest 0x1A, type 0x49) every second, putting its tick count and the tick delta into the time-stamp field. It is a card-to-card test rig for request timing, from 17–19 Aug ${Y(2011)}, with only the four output values in applogvals.c.`],
    ['"immediate response" build', `tasklist.c drops LogTask; parcomm.c calls <span class="mono">rxLoggingData(); if (getCurrentAdd()) sendLoggingResponse();</span> inside canReceive. The reply follows the request by the SPI time only and the clock beat disappears — but the 4 × 63 ms of SPI now sit inside the CAN receive path.`],
    ['Card name logged with its terminator', `<span class="mono">writeStringLogValValue</span> returns <span class="mono">strlen(buffer) + 1</span>, so adlen includes the 0x00. Java turns all bytes into characters: the screenshot shows "M6205A-3G+NLC□" and the October logs "M6205A-3G+NLC ,".`],
    ['Alive pulse uses a reserved byte', `sigstat.c <span class="mono">getNlcLogLive</span> builds FE B5 CA B4 01 <b>E5</b> 01 01 FE B5 CA B4 00 — address 0xE5 is RESERVED_LOG_ADDR_9 in logaddrs.h (the last TCP sync byte). The Java parser only needs the OID 0x0F60 to mark the card online.`],
    ['A card never goes offline', `protocol.doc: "If data is not received … within a 5 second period, then card/frame is indicated as offline." The code has no timeout: <span class="mono">setCardOnlineStatus(true)</span> on any good packet, false only on a parse error (removeTCPIPDataFromCard). The GUI keeps "Online:" for a pulled card until a malformed packet arrives ${inf}.`],
    ['Restart trap ignored', `The WBSLAP doc says the logger must re-request identification after a card restart (message 0x11). <span class="mono">OGPFrame.parseInputBuffer</span> accepts only types 0xC9 and 0x10; 0x11 goes back to STATE_TCPIPSYNC0.`],
    ['NTP with no time-out stops the requests', `One NTP query per card per second, made inside RunnableLoggingRequest with commons-net's default socket time-out (0 = forever) ${inf}. One lost UDP reply blocks the thread for good — the requests stop while the processor thread and alive pulses carry on. progress.xlsx, 11 Oct ${Y(2011)}: "Requests will stop unexpectedly. don't know why yet."`],
    ['One read per second, packets cut', `RunnableLoggingDataProcessor does one <span class="mono">in.read(tcpipinputbuffer)</span> per second (1 000 bytes in Sep, 10 000 in Oct). <span class="mono">parseInputBuffer</span> restarts at STATE_TCPIPSYNC0 every time, so a message split between two reads is dropped, and a partly copied WBSLAP record stays in the card FIFO (progress notes 23 Aug and 19 Sep: "error", "0x00 constantly precedes 0xfe"). With 20 NLC cards a 1 000-byte read cannot hold one second of traffic. Try "NLC cards logged = 20" with the Sep build.`],
    ['Small code slips', `WBSLAPLogFile.writeSampleToFile: <span class="mono">if (i &lt;= (alen-1))</span> is always true → trailing comma on every line; <span class="mono">fileVersionMatch()</span> builds <span class="mono">new Scanner(pathname+filename)</span>, which scans the path text, not the file. OGPFrame.writeOutputData: <span class="mono">(slotnumber &gt;= 0) || slotnumber &lt;= 20</span> is always true. dtsserial.c <span class="mono">Get_NLC_AuxOutMode</span> sends SET_NLC_AUX_OUT_MODE_OPCODE (0x51). settings.c's test block prints "2.0 Compression" from <span class="mono">Get_NLC_OutCompression</span>. datalog.c (<span class="mono">LogVal * const logList[] { };</span>) cannot compile and datalogging.c is empty — not part of the build ${inf}.`],
    ['Files collide; the GUI path is not the file', `Logs are named only by slot, in the working directory, for up to five frames (GLOBAL.MAXFRAMES): slot 10 of two frames would share card10.txt. The GUI's "Location: 8320-R&amp;D Frame2 - 20 slot\\slot10\\" (SettingsPanelLogic) is not where WBSLAPLogFile writes. The ${Y(2012)} spec moves to LOGS\\FRAME_NAME\\CARD_DESCRIPTION\\201207_slot3_Studio1.log.`],
    ['Requested less than the card offers', `The card answers 16 addresses; the threaded app asks for 0x05–0x08 only, the GUI adds 0x02. Input loudness, correction and compression (0x09–0x10, the "Ali-Add" block in GLOBAL.java and WBSLAPParser) are parsed but never requested. There is no target-level or fault address, although both the DaySequerra record (nlc5.1st_logging.txt: target, In/Out short and peak, correction, compression, fault:index) and the ${Y(2012)} spec list them.`],
    ['Protocol document versus code', `The doc's own summary "needs to be updated". Its "Dlen" is in the code the index of the closing sync inside the OGP body (logman.c LEN_ADDRESS), not a length. Alive pulses go to destination 0x02, not 0x10 as tabled. The doc reserves 0x00, FE B5 CA B4, BA D2 AC E5 as addresses; the card uses E5 anyway (above).`],
    ['Folder notes', `java/ and javate/ are near-copies (javate adds card10.txt and rar files). progress/ holds 30 dated snapshots, 18 Jul – 12 Oct ${Y(2011)}. VB_TCPIP_Sample is a downloaded VB6 example, not WBS code. The DaySequerra iLM8-Rem software and documents are third-party reference. The personal files in resumes/ were not opened for this model.`],
  ];
  m.innerHTML = card('Findings — what RD21 decided, what the code really does, and what became of it', `<ol style="padding-left:20px">${F.map(([h,b])=>`<li style="margin-bottom:9px"><b>${h}.</b> <span class="small">${b}</span></li>`).join('')}</ol>`)
   + card('Assumptions in this model', `<ul class="small">
      <li>SPI byte times and the SLOW_COM wait (≈63 ms per Master_Transfer) are worked out from the code, not measured ${inf}.</li>
      <li>The DTS loudness algorithm is not in the archive. The model uses BS.1770 block energies (100 ms blocks, 400 ms momentary, 3 s short-term per EBU Tech 3341) and a first-order gain law built from the manual's parameter meanings and the NLC5 Menu.xls preset values ${inf}. Input true peak is the 3 s maximum ${inf}.</li>
      <li>Programme material is synthetic. The AUX pair runs 1.5 dB below the 5.1 programme ${inf}.</li>
      <li>Request phase, reply lag (0.336 s), clock drift (−7.4 ppm), the 6-byte frame reply and the 2.3 ms alive spacing come from the decoded Sep162011Log.pcap; NTP round trip, frame forwarding and CAN bit stuffing are ${inf}.</li>
      <li>The second logger's request phase (0.547 s) and that both copies share one working folder are ${inf}.</li>
      <li>Card drawing: the M6205 ISS6 artwork extracted by the M6205-3G plugin; the NLC daughter card is drawn plainly (no artwork exists).</li></ul>`)
   + card('Related models', `<p class="small">${plink('m6205-3g','M6205-3G','sim')} — the card, its DashBoard menus, DTS daughter-card protocol and NLC presets. ${plink('slm','SLM-1D','sim')} — Ward-Beck's own VU/PPM loudness meter of the same era. ${plink('rd45-dolbyd-ac3','RD45')} and ${plink('rd39-mpeg-heaac','RD39')} — other audio R&amp;D of the same register.</p>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'rd21-audiolevelloggingnlc',
  product:'RD21 NLC loudness logger', year:2011,
  name:`RD21 NLC loudness logger · DTS NLC card + Java "LumberJack" logger (${Y(2011)})`,
  family:'R&D register', folder:'ENGINEERING - 2016 RD FILES/RD21-AudioLevelLoggingNLC',
  summary:'R&D from 2011: log what the DTS Neural Loudness Control on an M6205A-3G openGear card measures, once a second, on a PC. The model runs the card firmware (LogTask, logman/logcomm, DTS getters over SPI), CAN and the frame bridge, and the Java logger (NTP, WBSLAP request, parser, card10.txt) with timing taken from the 2011 network capture.',
  highlights:['Byte-exact WBSLAP request and reply, matched to the 2011 Wireshark capture','Redrawn LumberJack window with tree, card tab and log viewer','Loudness → NLC gain → SPI getters → row, in slow motion','Why rows were duplicated, stale or late: two loggers, two clocks, NTP','12-step tutorial and 20 findings, including what became of it'],
  depth:'Full model',
  duration:1,
  stepUnits:[ {label:'1 ms (gearOS tick)', period:()=>0.001}, {label:'10 ms', period:()=>0.01}, {label:'1 Master_Transfer (≈63 ms)', period:()=>T.XFER}, {label:'100 ms loudness block', period:()=>0.1}, {label:'1 CAN frame', period:()=>canT(8)}, {label:'1 audio sample', period:()=>1/48000} ],
  zooms:[[1,'1 s (whole)'],[0.3,'300 ms (one reply)'],[0.1,'100 ms'],[0.01,'10 ms (CAN frames)'],[0.001,'1 ms'],[1e-4,'100 µs']],
  defaultZoom:0,
  init(){ build(); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: logging an NLC card', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics (redrawn)', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
