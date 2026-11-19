/* =====================================================================
   M8202A — Remote-sensitivity analog audio DA (Ward-Beck, PCB 14-212, 1995–2005|28–38)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (#MF8200 #SERIES/…):
   - M8202A - #Engineering #MF82/M8202MAN.pdf (Issue 6) and M8202BMN.pdf (M8202B, Issue 5): set-up procedure,
       ZERO GAIN / RANGE / OFFSET controls, REM jumper IN/OUT, specs (±15 dB, 30 dB range, +24 dBu, 60 Ω / 600 Ω, ±20 V 85 mA)
   - …/M8202A - #PCB 14-212/14-212.PCB (Tango, ISS7, 10.82 × 2.914 in): positions of INPUT LEVEL, GAIN ZERO, CMRL-R,
       CMRH, OFFSET, RANGE, REM GAIN, U1–U5, Q1–Q4, the 301 1/2 W 1 % resistors and P1 (drawn to scale)
   - …/M8202.DSN, M8202B.DSN (OrCAD; strings: SSM2018T VCA, 5532, LF353, TIP29C/TIP30C, LM317/LM337, REMOTE GAIN
       AMPLIFIER, net labels LEVEL-A, CMRL-A, OFFSET, RANGE, REMOTE, IN, OUT)
   - …/M8202A - 14-212/M8202TR2.pdf (TB8202 screw / ST8202 solder terminal options)
   - TB8202 - #Engineering #MF82 #TERMINATION/TB8202-2.PCB (Tango: PHEN9 ×2, PHEN3 ×2, CONN20 — drawn to scale)
   - M8202RC - #Engineering #MF82/M8202RC1.DWG, M8202RC2.DWG (12-pot remote panel, EDAC 38-pin plug)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- constants ---------------- */
const K = { MAX:24, NOISE_A:-80, NOISE_B:-86, CMRR:75, VCA_MV_DB:-30, CV_TAU:0.01, IN_CLIP:24, RS_A:30, RS_B:300 };
// SSM2018T control constant and CV smoothing are inferred (datasheet-typical); clip +24 dBu from the manual “Maximum I/O level”.

/* ---------------- state ---------------- */
const D = {
  ver:'A',                 // A = M8202 (60 Ω outputs), B = M8202B (600 Ω outputs)
  inDbu:4, freq:1000,
  local:0.5,               // INPUT LEVEL (front pot), 0..1 → −15..+15 dB (manual: local or remote ±15 dB)
  zero:0.4,                // GAIN ZERO trim, error in dB = (zero−0.5)*6
  range:0.6,               // RANGE trim: span of the remote control, 1.0 → 30 dB
  offset:0.3,              // OFFSET trim: error at centre detent
  rem:false,               // REM GAIN jumper (H1X3) IN / OUT
  wiper:0.5,               // remote pot (10 k linear, centre detent)
  load:600, cable:100, cmrTrim:0.5, commonMode:-20,
  steps:{t:[], w:[]},      // remote pot moves (for the timeline)
  log:[], tbView:'art', tsel:null,
};
function reset(){ Object.assign(D,{ver:'A',inDbu:4,freq:1000,local:0.5,zero:0.4,range:0.6,offset:0.3,rem:false,wiper:0.5,load:600,cable:100,cmrTrim:0.5,commonMode:-20,steps:{t:[],w:[]}}); }

/* ---------------- analog chain ---------------- */
const localDb = ()=> -15 + 30*D.local;
const zeroErr = ()=> (D.zero-0.5)*6;
const offErr = ()=> (D.offset-0.5)*10;
function wiperAt(t){ let w=D.wiper; const s=D.steps; if (s.t.length){ w=s.w0; for (let i=0;i<s.t.length;i++){ if (t>=s.t[i]){ const k=1-Math.exp(-(t-s.t[i])/K.CV_TAU); w = w + (s.w[i]-w)*k; } } } return w; }
function chain(t){
  const w = wiperAt(t===undefined?SIM.t:t);
  const stage1 = D.inDbu + localDb();                                  // input amp with INPUT LEVEL (before the VCA)
  const vcaDb = D.rem ? (w-0.5)*30*D.range + offErr() : zeroErr();     // remote: span set by RANGE, centre set by OFFSET
  const cv = vcaDb*K.VCA_MV_DB/1000;                                   // SSM2018 control voltage
  const out = stage1 + vcaDb;
  const rs = 2*(D.ver==='A'?K.RS_A:K.RS_B), atLoad = out + 20*Math.log10(D.load/(D.load+rs));
  const clip1 = stage1>K.IN_CLIP, clip2 = out>K.MAX;
  const noise = D.ver==='A'?K.NOISE_A:K.NOISE_B;
  const cmrr = K.CMRR + 20*(0.5-Math.abs(D.cmrTrim-0.5))*2;            // CMRL-R / CMRH trims peak the rejection
  return { w, stage1, vcaDb, cv, out, atLoad, rs, clip1, clip2, noise, cmrr, hum: D.commonMode-cmrr, total: localDb()+vcaDb };
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  set(k,v,label){ D[k]=v; SIM.refresh(); },
  log(k){ const c=chain(); act({local:'INPUT LEVEL (front edge)',zero:'GAIN ZERO trim',range:'RANGE trim',offset:'OFFSET trim',wiper:'Remote sensitivity pot',cmrTrim:'CMRL-R / CMRH trims'}[k]+' adjusted', tr=>{
    if (k==='local') tr(`INPUT LEVEL (POT1) sets the input-stage gain: ${localDb().toFixed(1)} dB → stage 1 at ${c.stage1.toFixed(1)} dBu${c.clip1?' — CLIPPING before the VCA (the manual\'s caution)':''}`);
    if (k==='zero') tr(`GAIN ZERO sets the SSM2018 for unity with REM = OUT: VCA ${zeroErr().toFixed(2)} dB`);
    if (k==='range') tr(`RANGE sets how far the remote pot swings the VCA: ±${(15*D.range).toFixed(1)} dB (manual: set for 30 dB)`);
    if (k==='offset') tr(`OFFSET: with the remote at centre detent the VCA is at ${offErr().toFixed(2)} dB (manual: adjust for unity)`);
    if (k==='wiper') tr(`REM IN wiper ${(D.wiper*100).toFixed(0)} % → SSM2018 control ≈ ${(c.cv*1000).toFixed(0)} mV (${K.VCA_MV_DB} mV/dB ${'inferred'}) → ${c.vcaDb.toFixed(1)} dB${D.rem?'':' — but REM jumper is OUT, so ignored'}`);
    if (k==='cmrTrim') tr(`CMRR now ≈ ${c.cmrr.toFixed(0)} dB (spec > 75 dB)`);
    tr(`Overall ${c.total.toFixed(1)} dB · out ${c.out.toFixed(1)} dBu · ${c.atLoad.toFixed(1)} dBu across ${D.load} Ω through ${c.rs} Ω`); }); },
  term(i){ const p=TB_PTS[i], c=chain(); act(`TB8202 terminal “${p[2]}”`, tr=>{ D.tsel=i;
    tr(`M8202TR2 sheet legend “${p[2]}” → screw ${p[3]} → ${p[4]} → card contact ${p[5]}`);
    if (p[6]==='IN') tr(p[7]==='SH'?'Input cable shield → contact L (card ground at the input)':`Balanced input ${p[7]} → input stage, ${D.inDbu} dBu applied`);
    else if (p[6]==='REM') { tr(`Copper says this screw is REM ${p[7]}; the M8202 sheet prints “${p[2]}”${p[7]!==p[2]?' — the sheet and the board disagree here':''}`); tr(D.rem?`Remote pot wiper at ${(D.wiper*100).toFixed(0)} % → VCA ${c.vcaDb.toFixed(1)} dB`:'REM GAIN jumper is OUT: the remote terminals are ignored'); }
    else if (p[6]==='G') tr('Output ground column → contact 2');
    else tr(`${p[6]} ${p[7]} through ${c.rs/2} Ω build-out (per leg) → ${c.atLoad.toFixed(1)} dBu across ${D.load} Ω`); }); },
  tbView(v){ act(v==='art'?'TB8202 view: CorelDRAW sheet':'TB8202 view: drawn from the PCB', tr=>{ D.tbView=v; tr(v==='art'?'M8202TR2.CDR “M8202 TERMINAL OPTIONS” (2005-01-20)':'Block positions from the 14-212 PCB coordinates'); }); },
  rem(){ act('REM GAIN jumper → '+(D.rem?'OUT':'IN'), tr=>{ D.rem=!D.rem; tr(D.rem?'Remote pot on TB8202 REM IN (LOW / WIPER / HIGH) now drives the SSM2018 control port':'VCA held at the GAIN ZERO setting; the manual: “must be in the OUT position if the remote control is not used”'); }); },
  turn(v){ D.steps.w0 = D.steps.t.length? D.steps.w0 : D.wiper; D.steps.t.push(SIM.t); D.steps.w.push(v); D.wiper=v; A.log('wiper'); },
  ver(v){ act('Version '+(v==='A'?'M8202 (60 Ω)':'M8202B (600 Ω)'), tr=>{ D.ver=v; tr(v==='A'?'Outputs 1–8: 60 Ω balanced (2 × 30 Ω build-out)':'Outputs 1–8: 600 Ω balanced, for 600 Ω installations (M8202BMN Issue 5)'); tr(`Into ${D.load} Ω: ${chain().atLoad.toFixed(1)} dBu`); }); },
  load(v){ act('Load '+v+' Ω', tr=>{ D.load=v; tr(`${chain().atLoad.toFixed(2)} dBu at the load`); }); },
  setup(){ act('Run the manual set-up (steps 1–3)', tr=>{ D.rem=false; D.local=0.5; D.zero=0.5; tr('1. REM jumper OUT, local level at centre detent, adjust ZERO GAIN for unity'); D.rem=true; D.range=1.0; tr('2. 10 k linear pot on REM IN, jumper IN, RANGE for a 30 dB span'); D.wiper=0.5; D.offset=0.5; D.steps={t:[],w:[]}; tr('3. Remote at centre, OFFSET for unity → ±15 dB from the centre detent'); }); },
  reset(){ act('Start over', tr=>{ reset(); tr('Trims as found (not yet set up)'); }); },
};

/* ---------------- drawings ---------------- */
// Board top view to scale from 14-212.PCB (BOARD 995,1321 – 11815,4235 mil)
const PARTS = [['U1',3275,2125],['U2',4550,2225],['U3',5325,2125],['U4 SSM2018T',4375,3475],['U5',7075,3475],['Q1',6575,2550],['Q2',7175,2550],['Q3',8225,2550],['Q4',8825,2550],['REG1',3200,3300],['REG2',3200,3850],['REG3',8225,3300]];
const OUTR = [[6350,2680],[7050,2680],[7925,2680],[8625,2680],[10500,3025],[10500,3200],[10500,3475],[10500,3650],[10125,2425]];
const TRIMS = [['local','INPUT LEVEL',1400,1800],['zero','GAIN ZERO',3625,1725],['cmrTrim','CMRL-R / CMRH',3875,2650],['offset','OFFSET',6425,3125],['range','RANGE',6425,3600]];
function boardSVG(){
  const S=0.075, X=v=>10+(v-995)*S, Y=v=>10+(4235-v)*S, W=(11815-995)*S, H=(4235-1321)*S, c=chain();
  let s=`<svg viewBox="0 0 ${W+20} ${H+20}" style="width:100%"><rect x="10" y="10" width="${W}" height="${H}" fill="#1f6b3a" stroke="#0d3a1f"/><rect x="${X(11525)-10}" y="${Y(3950)}" width="30" height="${2300*S}" fill="#d4af37"/><text x="${X(11525)-8}" y="${Y(3950)-4}" font-size="10" fill="#fff">P1</text>`;
  PARTS.forEach(([n,x,y])=>s+=`<rect x="${X(x)-22}" y="${Y(y)-14}" width="44" height="28" fill="#222"/><text x="${X(x)}" y="${Y(y)+4}" font-size="9" text-anchor="middle" fill="#fff">${n}</text>`);
  OUTR.forEach(([x,y])=>s+=`<rect x="${X(x)-18}" y="${Y(y)-4}" width="36" height="8" fill="#c8a24a"/>`);
  TRIMS.forEach(([k,n,x,y])=>{ const a=-135+270*D[k]; s+=`<g class="mtrim" data-k="${k}" style="cursor:pointer"><title>${n}: click to step, scroll to fine-tune</title><rect x="${X(x)-16}" y="${Y(y)-16}" width="32" height="32" rx="3" fill="#2a4fa0" stroke="#9cf"/><circle cx="${X(x)}" cy="${Y(y)}" r="10" fill="#dfe3ea"/><line x1="${X(x)}" y1="${Y(y)}" x2="${X(x)+9*Math.cos((a-90)*Math.PI/180)}" y2="${Y(y)+9*Math.sin((a-90)*Math.PI/180)}" stroke="#000" stroke-width="2.5"/><text x="${X(x)+(k==='range'||k==='offset'?60:0)}" y="${Y(y)+(k==='range'||k==='offset'?4:28)}" font-size="9.5" text-anchor="middle" fill="#fff">${n}</text></g>`; });
  s+=`<g class="mrem" style="cursor:pointer"><title>REM GAIN jumper (H1X3) — click</title><rect x="${X(5250)-22}" y="${Y(3950)-8}" width="44" height="16" fill="${D.rem?'#ffd84a':'#555'}" stroke="#000"/><text x="${X(5250)}" y="${Y(3950)+4}" font-size="9.5" text-anchor="middle" fill="#000">REM ${D.rem?'IN':'OUT'}</text></g>`;
  s+=`<rect x="${X(4375)-30}" y="${Y(3475)-22}" width="60" height="44" fill="none" stroke="${c.clip2?'var(--bad)':'#7dff6a'}" stroke-width="2" opacity=".8"/>`;
  return s+`</svg><div class="small muted">14-212 ISS7 top view to scale from <span class="mono">14-212.PCB</span>: front edge left (INPUT LEVEL), P1 right. Gold bars = the 301 1/2 W 1 % output resistors. Click a trim to step it, scroll to fine-tune; click REM to move the jumper.</div>`;
}
// TB8202 terminal (TB8202-2.PCB: 0.91 × 2.91 in, PHEN9 J52/J53, PHEN3 J54 (IN) / J55 (REM IN), CONN20 P1)
/* ---------------- TB8202 artwork (CorelDRAW) ----------------
   assets/m8202a-terminal-options.svg is the whole “M8202 TERMINAL OPTIONS” sheet, M8202TR2.CDR (2005-01-20),
   taken from CorelDRAW 10's own PDF of it (M8202TR2.pdf) so the fonts are right; the Symbol “W” is set as Ω.
   TB_PTS: [x, y, sheet legend, Tango screw, CON20 pin, card contact, port, copper leg] — the screw under
   each symbol is matched top-to-bottom against TB8202-2.PCB (see the tb8202 plugin). */
const ASSET = 'siumulation-plugins/assets/';
const TR2 = '#MF8200 #SERIES/M8202A - #Engineering #MF82/M8202A - 14-212/M8202TR2.CDR';
const TB_PTS = [[331.9,269.4,"INPUT +","J54AB-3","CON20-16","9","IN","+"],[331.9,286.6,"INPUT -","J54AB-2","CON20-15","K","IN","-"],[331.9,303.9,"INPUT SH","J54AB-1","CON20-17","L","IN","SH"],[332.1,336.8,"OUT 1 +","J52AB-9","CON20-6","4","OUT1","+"],[332.1,354.1,"OUT 2 +","J52AB-8","CON20-6","4","OUT2","+"],[332.1,371.3,"OUT 3 +","J52AB-7","CON20-6","4","OUT3","+"],[332.1,388.6,"OUT 4 +","J52AB-6","CON20-8","5","OUT4","+"],[332.1,405.9,"OUT 5 +","J52AB-5","CON20-6","4","OUT5","+"],[332.1,423.1,"OUT 6 +","J52AB-4","CON20-6","4","OUT6","+"],[332.1,440.4,"OUT 7 +","J52AB-3","CON20-6","4","OUT7","+"],[332.1,457.7,"OUT 8 +","J52AB-2","CON20-6","4","OUT8","+"],[332.1,474.9,"GND","J52AB-1","CON20-18","10","G","G"],[331.9,505.9,"LOW","J55B-3","CON20-20","11","REM","HIGH"],[331.9,523.2,"WIPER","J55B-2","CON20-19","M","REM","WIPER"],[331.9,540.4,"HIGH","J55B-1","CON20-18","10","REM","LOW"],[394.6,336.8,"OUT 1 -","J53AB-9","CON20-5","D","OUT1","-"],[394.6,354.1,"OUT 2 -","J53AB-8","CON20-5","D","OUT2","-"],[394.6,371.3,"OUT 3 -","J53AB-7","CON20-5","D","OUT3","-"],[394.6,388.6,"OUT 4 -","J53AB-6","CON20-7","E","OUT4","-"],[394.6,405.9,"OUT 5 -","J53AB-5","CON20-5","D","OUT5","-"],[394.6,423.1,"OUT 6 -","J53AB-4","CON20-5","D","OUT6","-"],[394.6,440.4,"OUT 7 -","J53AB-3","CON20-5","D","OUT7","-"],[394.6,457.7,"OUT 8 -","J53AB-2","CON20-5","D","OUT8","-"],[394.6,474.9,"GND","J53AB-1","CON20-18","10","G","G"]];
function tbArtSVG(){ const c=chain();
  let s=`<svg viewBox="233 68 593 610" style="width:100%;max-width:560px;display:block;margin:auto;border-radius:4px" role="img" aria-label="M8202 TERMINAL OPTIONS sheet, M8202TR2.CDR"><rect x="233" y="68" width="593" height="610" fill="#fff"/><image href="${ASSET}m8202a-terminal-options.svg" x="233" y="68" width="593" height="610"/>`;
  TB_PTS.forEach((p,i)=>{ const live = p[6]==='IN'? p[7]!=='SH' : /^OUT/.test(p[6])? (p[7]!=='G') : p[6]==='REM'? D.rem : false, on=D.tsel===i;
    s+=`<g class="mtb" data-i="${i}" style="cursor:pointer"><title>Sheet legend “${p[2]}” · ${p[3]} (copper: ${p[6]} ${p[7]}) → ${p[4]} → card contact ${p[5]} — click to trace</title><circle cx="${p[0]}" cy="${p[1]}" r="8.5" fill="transparent"/>${live?`<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${p[6]==='REM'?'#e08a00':'#18b84a'}"/>`:''}${on?`<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="none" stroke="#e0a800" stroke-width="2"/>`:''}</g>`; });
  return s+`</svg>`; }
function tbSVG(){
  if (D.tbView!=='drawn') return tbArtSVG();
  const c=chain(), S=0.11, X=v=>10+(v-3495)*S, Y=v=>10+(18280-v)*S;
  let s=`<svg viewBox="0 0 330 ${(18280-15370)*S+30}" style="width:100%;max-width:330px"><rect x="10" y="10" width="${(4405-3495)*S}" height="${(18280-15370)*S}" fill="#26292c"/>`;
  const blk=(x,y,n,labels,cls)=>{ let r=''; labels.forEach((l,i)=>{ r+=`<rect x="${X(x)-11}" y="${Y(y)+i*14-6}" width="22" height="12" fill="#2b8a3e" stroke="#0b3"/><circle cx="${X(x)}" cy="${Y(y)+i*14}" r="3.5" fill="#ccc"/>`; }); return r; };
  s+=blk(3725,17775,3,['','',''])+blk(3725,16275,9,new Array(9).fill(''))+blk(4225,16275,9,new Array(9).fill(''))+blk(3725,15875,3,['','','']);
  s+=`<text x="${X(4405)+14}" y="${Y(17775)+4}" font-size="10.5" fill="var(--ink)">INPUT + − SH (J54)</text><text x="${X(4405)+14}" y="${Y(16275)+4}" font-size="10.5" fill="var(--ink)">OUT 1–8 + / − , G (J52, J53)</text><text x="${X(4405)+14}" y="${Y(16275)+20}" font-size="10.5" fill="var(--accent2)">each ${c.atLoad.toFixed(1)} dBu @ ${D.load} Ω</text>`;
  s+=`<g class="mrc" style="cursor:pointer"><title>REM IN (J55): LOW · WIPER · HIGH — remote pot</title><text x="${X(4405)+14}" y="${Y(15875)+4}" font-size="10.5" fill="var(--ink)">REM IN LOW/WIPER/HIGH (J55)</text></g>`;
  return s+`</svg>`;
}
function remoteSVG(){
  const a=-150+300*D.wiper; return `<svg viewBox="0 0 260 150" style="width:100%;max-width:260px"><rect x="10" y="10" width="240" height="130" rx="6" fill="#1d1f21"/><text x="20" y="30" font-size="11" fill="#ddd">M8202RC remote panel — pot 1 of 12</text>
   <g class="mknob" style="cursor:grab"><title>Remote sensitivity pot (10 k linear, centre detent): drag left/right, scroll, or click the side</title><circle cx="130" cy="85" r="38" fill="#2e3134" stroke="#555"/><circle cx="130" cy="85" r="28" fill="#4a4d50"/><line x1="130" y1="85" x2="${130+26*Math.cos((a-90)*Math.PI/180)}" y2="${85+26*Math.sin((a-90)*Math.PI/180)}" stroke="#fff" stroke-width="4"/></g>
   <circle cx="130" cy="40" r="2.5" fill="#fff"/><text x="70" y="132" font-size="10" fill="#aaa">−15 dB</text><text x="170" y="132" font-size="10" fill="#aaa">+15 dB</text><text x="122" y="132" font-size="10" fill="#aaa">0</text></svg>`;
}
function bindPanel(m){
  m.querySelectorAll('.mtrim').forEach(g=>{ const k=g.dataset.k; g.onclick=()=>{ D[k]=Math.round(((D[k]+0.1)%1.0001)*100)/100; A.log(k); }; g.onwheel=e=>{ e.preventDefault(); D[k]=Math.max(0,Math.min(1,D[k]+(e.deltaY<0?0.01:-0.01))); SIM.refresh(); }; });
  m.querySelectorAll('.mrem').forEach(g=>g.onclick=()=>A.rem());
  m.querySelectorAll('.mtb').forEach(g=>g.onclick=()=>A.term(+g.dataset.i)); const tv=m.querySelector('#mtv'); if (tv) tv.onchange=()=>A.tbView(tv.value);
  m.querySelectorAll('.mknob').forEach(g=>{ g.onclick=e=>{ const r=g.getBoundingClientRect(); const v=Math.max(0,Math.min(1,D.wiper+((!e||e.clientX===undefined||(e.clientX-r.left)>r.width/2)?0.1:-0.1))); A.turn(Math.round(v*100)/100); }; g.onwheel=e=>{ e.preventDefault(); A.turn(Math.max(0,Math.min(1,Math.round((D.wiper+(e.deltaY<0?0.02:-0.02))*100)/100))); }; });
}
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Input <input type="range" id="mi" min="-20" max="24" value="${D.inDbu}"> <span id="miv" class="mono"></span></label>
  <label>Remote pot <input type="range" id="mw" min="0" max="100" value="${Math.round(D.wiper*100)}"></label>
  <label>Load <select id="ml">${[600,10000,100000].map(v=>`<option value="${v}" ${v===D.load?'selected':''}>${v>=1000?v/1000+' k':v} Ω</option>`).join('')}</select></label>
  <label>Version <select id="mv"><option value="A" ${D.ver==='A'?'selected':''}>M8202 / M8202A (60 Ω)</option><option value="B" ${D.ver==='B'?'selected':''}>M8202B (600 Ω)</option></select></label>
  <button id="ms">Run the manual set-up</button><button id="mr">Start over</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#mi')) return; const u=()=>q('#miv').textContent=D.inDbu+' dBu'; u();
  q('#mi').oninput=e=>{D.inDbu=+e.target.value; u(); SIM.refresh();}; q('#mw').onchange=e=>A.turn(+e.target.value/100); q('#ml').onchange=e=>A.load(+e.target.value); q('#mv').onchange=e=>A.ver(e.target.value); q('#ms').onclick=()=>A.setup(); q('#mr').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function lanes(){ const css=SIM.css; const sig=(dbu,clip)=>(t)=>{ const a=Math.pow(10,(dbu-K.MAX)/40); let v=a*Math.sin(2*Math.PI*D.freq*t); if(clip) v=Math.max(-1,Math.min(1,v)); return v; };
  const wave=(c,X,t0,t1,y,h,f,col)=>{ const span=t1-t0, pw=X(t1)-X(t0); c.strokeStyle=col; if(span*D.freq>pw/3){ c.fillStyle=col; c.globalAlpha=.25; for(let i=0;i<200;i++){ const ta=t0+span*i/200, a=Math.min(1.05,Math.abs(f(ta+0.25/D.freq))+0.0); const cc=chain(ta); const amp=Math.min(1,Math.pow(10,((cc.out)-K.MAX)/40)); c.fillRect(X(ta),y+h/2-amp*h*0.45,pw/200+1,2*amp*h*0.45);} c.globalAlpha=1; return; } c.beginPath(); for(let i=0;i<=600;i++){ const ta=t0+span*i/600, yy=y+h/2-Math.max(-1.05,Math.min(1.05,f(ta)))*h*0.45; i?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy);} c.stroke(); };
  return [
  {label:`Input (${D.inDbu} dBu, 1 kHz)`, h:44, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,sig(D.inDbu,false),css('--ink2')); }},
  {label:'After INPUT LEVEL (stage 1)', h:44, draw(c,X,t0,t1,y,h){ const s=chain(); wave(c,X,t0,t1,y,h,sig(s.stage1,true),s.clip1?css('--bad'):css('--accent2')); }},
  {label:'SSM2018 control (dB)', h:40, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--warn'); c.beginPath(); for(let i=0;i<=300;i++){ const ta=t0+(t1-t0)*i/300, v=chain(ta).vcaDb; const yy=y+h/2-v/30*h*0.9; i?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy);} c.stroke(); c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(chain((t0+t1)/2).vcaDb.toFixed(1)+' dB',X(t0)+4,y+12); }},
  {label:'Output 1 (at load)', h:44, draw(c,X,t0,t1,y,h){ const span=t1-t0; c.strokeStyle=css('--accent'); c.beginPath(); for(let i=0;i<=600;i++){ const ta=t0+span*i/600, cc=chain(ta); let v=Math.pow(10,(cc.out-K.MAX)/40)*Math.sin(2*Math.PI*D.freq*ta); v=Math.max(-1,Math.min(1,v)); if(span*D.freq>X(t1)-X(t0)) v=Math.abs(Math.pow(10,(cc.out-K.MAX)/40))*(i%2?1:-1); const yy=y+h/2-v*h*0.45; i?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy);} c.stroke(); }},
];}

/* ---------------- views ---------------- */
function meter(dbu){ const w=Math.max(0,Math.min(1,(dbu+20)/50)); return `<span style="display:inline-block;width:150px;height:10px;background:var(--chip);border:1px solid var(--line);vertical-align:middle"><span style="display:block;height:100%;width:${(w*100).toFixed(1)}%;background:${dbu>K.MAX?'var(--bad)':dbu>18?'var(--warn)':'var(--accent)'}"></span></span> <span class="mono">${dbu.toFixed(1)} dBu</span>`; }
function inspector(){ const c=chain(); return `<table class="kv"><tr><th>Input</th><td>${meter(D.inDbu)}</td></tr><tr><th>Stage 1 (INPUT LEVEL ${localDb().toFixed(1)} dB)</th><td>${meter(c.stage1)}${c.clip1?' <b style="color:var(--bad)">CLIP</b>':''}</td></tr>
  <tr><th>VCA (${D.rem?'remote':'GAIN ZERO'})</th><td class="mono">${c.vcaDb.toFixed(2)} dB · control ${(c.cv*1000).toFixed(0)} mV ${inf}</td></tr>
  <tr><th>Output 1–8</th><td>${meter(c.out)}${c.clip2?' <b style="color:var(--bad)">CLIP (+24 dBu max)</b>':''}</td></tr>
  <tr><th>At the load</th><td class="mono">${c.atLoad.toFixed(2)} dBu (${c.rs} Ω source → ${D.load} Ω)</td></tr>
  <tr><th>Headroom</th><td class="mono">${(K.MAX-Math.max(c.stage1,c.out)).toFixed(1)} dB · noise ${c.noise} dBu → S/N ${(c.out-c.noise).toFixed(0)} dB</td></tr>
  <tr><th>CMRR</th><td class="mono">${c.cmrr.toFixed(0)} dB (common-mode ${D.commonMode} dBu → ${c.hum.toFixed(0)} dBu)</td></tr>
  <tr><th>Remote range</th><td class="mono">${D.rem?`±${(15*D.range).toFixed(1)} dB about ${offErr().toFixed(1)} dB`:'jumper OUT'}</td></tr></table>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the trims on the board, the REM jumper, or turn the remote pot.</div>'; }
function viewSim(m){
  m.innerHTML=`${card('M8202A card (14-212) at the playhead', `<div id="bd"></div>${controlsHTML()}`)}
   <div class="grid2"><div>${card('TB8202 termination and the remote panel', `<div style="display:flex;gap:10px;flex-wrap:wrap"><div id="tb" style="flex:1;min-width:220px"></div><div id="rc" style="flex:0 0 240px"></div></div><div class="small muted" style="margin-top:4px">${D.tbView!=='drawn'?`CorelDRAW artwork: ${SIM.src(TR2,'M8202TR2.CDR')} (2005-01-20), from CorelDRAW 10’s own print ${SIM.src(TR2.replace('.CDR','.pdf'),'M8202TR2.pdf')}. Click a TB8202 terminal to trace it; green = signal, orange = remote pot live.`:'Drawn from the 14-212 PCB block positions.'} <label>View <select id="mtv"><option value="art" ${D.tbView!=='drawn'?'selected':''}>CorelDRAW sheet</option><option value="drawn" ${D.tbView==='drawn'?'selected':''}>drawn from the PCB</option></select></label></div>`)}${card('Action log', `<div id="lg" class="log"></div>`)}</div><div>${card('What happened', `<div id="tr" class="log"></div>`)}${card('Level through each stage', `<div id="in"></div>`)}</div></div>
   ${card('Timeline — one second (turn the remote pot while playing to see the gain ramp)', `<canvas id="tl"></canvas><p class="small muted">Zoom to 5 ms to see the waveform and clipping. Waveform height is drawn on a compressed scale (half-dB) so +4 dBu is visible next to the +24 dBu clip level. The VCA control is smoothed with a ${K.CV_TAU*1000} ms time constant ${inf}.</p>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#tb').innerHTML=tbSVG(); m.querySelector('#rc').innerHTML=remoteSVG(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector(); m.querySelector('#lg').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>'; SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:180}); });
}
let lesson=0;
const LESSONS=[
  {title:'Meet the M8202', body:`<p>A 1-in, 8-out balanced analog DA whose <b>sensitivity</b> can be varied over <b>30 dB</b> by a local control or a <b>remote pot</b> up to 300 m away. The M8202B is the 600 Ω version. It uses the TB8202 screw terminal module, which has REM IN terminals for the pot.</p>`, check:()=>true, auto:true},
  {title:'1 · Unity gain with the remote off', body:`<p>Manual step 1: REM jumper <b>OUT</b>, local level at the <b>centre detent</b>, feed nominal level and adjust <b>ZERO GAIN</b> for unity.</p><p><b>Goal:</b> jumper OUT, overall gain 0 ±0.3 dB.</p>`, check:()=>!D.rem&&Math.abs(chain().total)<=0.3, hint:'Click INPUT LEVEL until it is centred (0.5), then step GAIN ZERO to 0.5.'},
  {title:'2 · Bring in the remote', body:`<p>Step 2: connect a 10 k linear pot to REM IN, move the jumper <b>IN</b>, and set <b>RANGE</b> so the pot covers 30 dB.</p><p><b>Goal:</b> REM IN and RANGE at full (±15 dB).</p>`, check:()=>D.rem&&D.range>=0.99, hint:'Click REM, then step RANGE to 1.0.'},
  {title:'3 · Centre the remote', body:`<p>Step 3: put the remote at its centre detent and adjust <b>OFFSET</b> for unity.</p><p><b>Goal:</b> remote at 50 %, gain 0 ±0.3 dB.</p>`, check:()=>D.rem&&Math.abs(D.wiper-0.5)<0.01&&Math.abs(chain().total)<=0.3, hint:'Set the remote slider to 50, step OFFSET to 0.5.'},
  {title:'4 · Respect the caution', body:`<p>The manual warns: don't use the local gain to set the operating range — it can clip before the output. Raise the input to <b>+20 dBu</b> and turn INPUT LEVEL up: stage 1 clips while the VCA could still turn it down.</p><p><b>Goal:</b> see stage-1 clipping.</p>`, check:()=>chain().clip1, hint:'Input slider to +20, then click INPUT LEVEL a few times.'},
  {title:'Done', body:`<p><b>Findings</b> covers the two manuals' differences and the ST8202's missing outputs.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — the manual set-up (M8202MAN Issue 6)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('Levels', `<div id="in"></div>`)}</div><div>${card('Remote', `<div id="rc"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>${card('Card', `<div id="bd"></div>${controlsHTML()}`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#rc').innerHTML=remoteSVG(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){ const c=chain();
  m.innerHTML=`<div class="grid3">${card('Signal', `<table class="kv"><tr><th>Cycles of 1 kHz</th><td class="mono">1000</td></tr><tr><th>Outputs</th><td class="mono">8 identical, ${c.atLoad.toFixed(1)} dBu at the load</td></tr><tr><th>Energy into 8 × ${D.load} Ω</th><td class="mono">${(8*Math.pow(0.775*Math.pow(10,c.atLoad/20),2)/D.load*1000).toFixed(2)} mJ</td></tr></table>`)}${card('Control', `<table class="kv"><tr><th>Remote cable</th><td class="mono">up to 300 m (manual)</td></tr><tr><th>VCA control</th><td class="mono">${(c.cv*1000).toFixed(0)} mV ${inf}</td></tr><tr><th>Settling</th><td class="mono">≈ ${(5*K.CV_TAU*1000).toFixed(0)} ms to 99 % ${inf}</td></tr></table>`)}${card('Power', `<table class="kv"><tr><th>Supply</th><td class="mono">±20 V DC, 85 mA (manual)</td></tr><tr><th>Energy</th><td class="mono">${(40*0.085).toFixed(2)} J</td></tr><tr><th>Local regs</th><td class="mono">LM317 / LM337 (DSN), ±18 V ${inf}</td></tr></table>`)}</div>${card('Zoom: one cycle at the playhead', `<canvas id="z"></canvas>`)}`;
  SIM.on('time',()=>SIM.drawLanes(m.querySelector('#z'),lanes(),{labelW:180,range:[SIM.t,SIM.t+1/D.freq]})); }
const BLOCKS={ in:{x:10,y:80,w:130,h:66,t:'Balanced input',s:['U1 5532, >15 kΩ','CMRL-R / CMRH trims'],d:'Input stage with common-mode trims (CMRR > 75 dB).'}, lv:{x:170,y:80,w:130,h:66,t:'INPUT LEVEL',s:['POT1, front edge','U2'],d:'Local gain, before the VCA — the manual cautions against using it for range.'}, vca:{x:330,y:80,w:140,h:66,t:'U4 SSM2018T',s:['VCA','control from U3/U5'],d:'Analog Devices SSM2018T voltage-controlled amplifier (DSN part list).'}, cv:{x:330,y:200,w:140,h:70,t:'Control (U3, U5)',s:['REM GAIN jumper','RANGE, OFFSET, GAIN ZERO'],d:'“REMOTE GAIN AMPLIFIER”: turns the remote pot wiper (REM IN) into the VCA control voltage.'}, out:{x:500,y:80,w:150,h:66,t:'Output drivers',s:['Q1–Q4 TIP29C/TIP30C','30 Ω / 300 Ω build-outs'],d:'Buffered balanced outputs, eight splits on the TB8202.'}, tb:{x:680,y:80,w:110,h:66,t:'TB8202',s:['OUT 1–8 ±','REM IN'],d:'Screw terminals; ST8202 solder version has only four outputs.'}, rc:{x:680,y:200,w:110,h:70,t:'M8202RC',s:['12 pots','EDAC 38-pin'],d:'Remote sensitivity panel: 12 identical pots wired to an EDAC 38-pin plug, 1 ft cable to the frame.'} };
const WIRES=[['in','lv',''],['lv','vca',''],['vca','out',''],['out','tb','×8'],['rc','tb','pot'],['tb','cv','REM IN'],['cv','vca','CV']];
function viewBlock(m){ let sel='vca'; const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 800 290" style="width:100%"><defs><marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#ma)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); m.querySelector('#bi').innerHTML=`<h3>${BLOCKS[sel].t}</h3><p>${BLOCKS[sel].d}</p>`; };
  m.innerHTML=`<div class="grid2">${card('Block diagram — click a block', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`; draw(); }
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length),h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n_],i)=>{const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${n_?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${n_}</text>`:''}`;});
  right.forEach(([p,n_],i)=>{const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${n_?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${n_}</text>`:''}`;}); return s; }
const SHEETS=[
  {name:'1 · Input and level', note:'Net labels from M8202.DSN / M8202B.DSN (CMRL-A, LEVEL-A, A-LEVEL, IN). Op-amps U1/U2 (5532). Pin numbers not recovered.', svg:()=>chip(330,60,170,'U1, U2 (5532)',[['+IN','INPUT+ (P1)'],['−IN','INPUT− (P1)'],['trim','CMRL-R, CMRH'],['pot','LEVEL-A (INPUT LEVEL)']],[['OUT','→ U4 SSM2018 in']],'balanced input + local level')},
  {name:'2 · VCA and remote control', note:'SSM2018T (strings SSM2018T/SSM2018TP); U3 LF353 “REMOTE GAIN AMPLIFIER”; LK2/LK3 jumpers; R31/R35/R38/R49/R64 pots = trims; CR1–CR4 zeners.', svg:()=>chip(180,60,160,'U3 LF353',[['wiper','REMOTE (REM IN)'],['RANGE','span trim'],['OFFSET','centre trim']],[['CV','→ U4 control'],['','']],'REMOTE GAIN AMPLIFIER')+chip(560,60,160,'U4 SSM2018T',[['IN','stage 1'],['CTL','CV / GAIN ZERO']],[['OUT','→ drivers']],'VCA')+`<text x="180" y="300" font-size="11" fill="var(--ink)">REM GAIN H1X3: OUT = VCA from GAIN ZERO only; IN = VCA from the remote pot</text>`},
  {name:'3 · Outputs and power', note:'14-212.PCB: Q1–Q4 on REG2 footprints (TIP29C/TIP30C per DSN), nine “301 1/2W 1%” resistors; regulators LM317/LM337 (DSN), REG1–REG3 TO-92 on the PCB.', svg:()=>chip(300,60,170,'Q1–Q4 TIP29C/30C',[['in','U5 drive']],[['OUT+','30R / 300R → OUT n+'],['OUT−','30R / 300R → OUT n−']],'output stage')+`<text x="80" y="260" font-size="11" fill="var(--ink)">±20 V from P1 → LM317 / LM337 → local rails (strings +18/−18, +16/−16, +15)</text>`},
];
function viewSchem(m){ let i=0; m.innerHTML=card('Schematic set (redrawn from DSN strings and the PCB — not the OrCAD sheets)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">Originals: <span class="mono">M8202A - #PCB 14-212/M8202.DSN</span>, <span class="mono">M8202A - 14-212/SM8202A.DWG</span> (AutoCAD schematic).</p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();}); m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 360" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="840" y="350" text-anchor="end" font-size="10" fill="var(--ink2)">M8202A · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; }; draw(); }
function viewSoft(m){ m.innerHTML=`<div class="grid2">${card('Signal path, stage by stage (no software on this card)', `<div id="sp"></div>`)}${card('Gain law', `<canvas id="gl"></canvas><p class="small muted">Overall gain vs remote pot position for the current RANGE and OFFSET trims (local level and GAIN ZERO included).</p>`)}</div>`;
  SIM.on('time',()=>{ const c=chain(); const st=[['Input',D.inDbu],['Stage 1',c.stage1],['VCA',c.out],['At the load',c.atLoad]];
    m.querySelector('#sp').innerHTML=`<svg viewBox="0 0 520 ${st.length*50+10}" style="width:100%">${st.map((s,j)=>`<rect x="20" y="${8+j*50}" width="480" height="40" rx="6" fill="${s[1]>K.MAX?'color-mix(in srgb,var(--bad) 25%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${33+j*50}" font-size="12.5" font-weight="700" fill="var(--ink)">${s[0]}</text><rect x="180" y="${20+j*50}" width="${Math.max(0,Math.min(300,(s[1]+20)/50*300))}" height="16" fill="${s[1]>K.MAX?'var(--bad)':'var(--accent)'}"/><text x="${190}" y="${33+j*50}" font-size="11" font-family="var(--mono)" fill="#fff">${s[1].toFixed(1)} dBu</text>`).join('')}</svg>`;
    const cv=m.querySelector('#gl'), {c:g,w,h}=SIM.canvas(cv,180); g.strokeStyle=SIM.css('--line'); g.strokeRect(40,10,w-50,h-30); const Y=d=>10+(20-d)/40*(h-30);
    g.fillStyle=SIM.css('--ink2'); g.font='10px monospace'; [15,0,-15].forEach(d=>{ g.fillText((d>0?'+':'')+d,4,Y(d)+3); g.strokeStyle=SIM.css('--grid'); g.beginPath(); g.moveTo(40,Y(d)); g.lineTo(w-10,Y(d)); g.stroke(); });
    g.strokeStyle=SIM.css('--accent'); g.beginPath(); for(let i=0;i<=100;i++){ const wv=i/100, v=localDb()+(D.rem?(wv-0.5)*30*D.range+offErr():zeroErr()); const x=40+wv*(w-50); i?g.lineTo(x,Y(v)):g.moveTo(x,Y(v)); } g.stroke(); const x=40+D.wiper*(w-50); g.strokeStyle=SIM.css('--play'); g.beginPath(); g.moveTo(x,10); g.lineTo(x,h-20); g.stroke(); });
}
function viewNotes(m){ m.innerHTML=card('What the M8202 is up to — findings', `<ol>
   <li><b>Two manuals, two set-ups.</b> Issue 6 (M8202) step 1 says “turn the local level control to the centre detent … adjust the ZERO GAIN control”; the M8202B Issue 5 step 1 has no ZERO GAIN and says “adjust the local level control for unity gain”. The B board evidently lacked the GAIN ZERO trim the 14-212 ISS7 PCB carries.</li>
   <li><b>Specs in different units.</b> M8202: noise “−80 dBu”, max “+24 dBu”, outputs “60 Ω”; M8202B: “−86 dBm”, “+24 dBm”, “600 Ω”. The Issue 6 spec page is marked PRELIMINARY.</li>
   <li><b>ST8202 has half the outputs.</b> <span class="mono">M8202TR2.pdf</span>: the TB8202 screw terminal brings out OUT 1–8; the ST8202 solder terminal only OUT 1–4 (the rest “NOT USED”).</li>
   <li><b>Artwork ${SIM.year(2026)}: the TB8202 rear module now comes from ${SIM.src(TR2,'M8202TR2.CDR')} (2005-01-20).</b> That is the whole “M8202 TERMINAL OPTIONS” sheet, with the TB8202 screw module and the ST8202 solder module side by side, cut from CorelDRAW 10’s own print ${SIM.src(TR2.replace('.CDR','.pdf'),'M8202TR2.pdf')}. The PCB-position drawing is still on the View selector. The 1998 sheets ${SIM.src('#MF8200 #SERIES/M8202A - #Engineering #MF82/M8202A - 14-212/M8202TR1.CDR','M8202TR1.CDR')}, ${SIM.src('#MF8200 #SERIES/M8202A - #Engineering #MF82/M8202A - 14-212/M8202TRM.CDR','M8202TRM.CDR')} and the M8202B pair are CorelDRAW 5 files: libcdr keeps their outlines but scrambles every legend, so they are not used.</li>
   <li><b>The sheet’s REM IN order is upside down against the board.</b> The sheet labels the three REM IN screws LOW, WIPER, HIGH from the top. On TB8202-2.PCB the top screw (J55B-3) carries HIGH. Click the top REM terminal to see the mismatch in the trace. The M8208’s page in the 2011 master prints HIGH, WIPER, LOW.</li>
   <li><b>Pot value.</b> The sheet draws a “10 kΩ LINEAR” remote pot. The M8208’s page for the same TB8202 draws 5 kΩ.</li>
   <li><b>The ST8202 even moves the input.</b> On the solder module, INPUT ± and SHIELD sit below OUT 1–4, and HIGH / WIPER / LOW are split across both columns; the TB8202 keeps the input on top.</li>
   <li><b>Gain is an analog VCA.</b> The DSN names an SSM2018T and an LF353 “REMOTE GAIN AMPLIFIER”: the remote pot is a DC control, so the audio never travels to the remote panel — which is why 300 m of cable is fine.</li>
   <li><b>The remote panel is a 12-way product.</b> M8202RC: “12 POTS ARE HOUSED ON EACH PANEL … WIRED IDENTICALLY”, EDAC 38-pin plug, 1 ft cable to the frame — one pot per M8202 in a 12-slot frame.</li>
   <li><b>Output resistors.</b> 14-212.PCB carries nine “301 1/2W 1%” resistors and the DSN also holds “30R 1W” and “300R 1W” values — 30 Ω per leg (60 Ω, M8202) and 300 Ω per leg (600 Ω, M8202B) ${inf}.</li>
   <li><b>Many copies.</b> <span class="mono">M8202MAN.WPD</span> exists in three folders and <span class="mono">M8202.DSN</span> in three; the PCB folder has an <span class="mono">OBSOLETE</span> set and a <span class="mono">TMP.PCB</span>.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>SSM2018 control constant ${K.VCA_MV_DB} mV/dB and CV smoothing ${K.CV_TAU*1000} ms ${inf}.</li><li>Trim ranges (GAIN ZERO ±3 dB, OFFSET ±5 dB, RANGE 0–30 dB span) ${inf}.</li><li>Input-stage clip at +24 dBu and the CMRR trim curve ${inf}.</li></ul>`)+card('Sources', `<ul class="small mono"><li>M8202A - #Engineering #MF82/M8202MAN.pdf, M8202BMN.pdf, m8202.PDF</li><li>…/M8202A - #PCB 14-212/14-212.PCB, M8202.DSN, M8202B.DSN</li><li>…/M8202A - 14-212/M8202TR2.pdf</li><li>TB8202 - #Engineering/TB8202-2.PCB · M8202RC - #Engineering/M8202RC1.DWG, M8202RC2.DWG</li></ul>`); }
SIM.register({
  id:'m8202a', name:'M8202A · Remote-sensitivity analog DA (1998|31)', duration:1,
  product:'M8202A', year:1998, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/M8202A - #Engineering #MF82',
  summary:'A balanced 1-in, 8-out analog audio DA whose gain can be swung over 30 dB by a remote pot up to 300 m away, through an SSM2018 VCA. Set it up exactly as the manual describes with the real trims on the 14-212 board, and watch headroom and clipping through each stage.',
  highlights:['TB8202 from the CorelDRAW “M8202 TERMINAL OPTIONS” sheet','Board drawn to scale with live trims','Manual set-up procedure as a tutorial','Remote pot → VCA ramp on the timeline','60 Ω vs 600 Ω (M8202B) outputs','Stage-1 clipping caution'],
  footnotes:[
    {text:'The M8202 sheet labels the REM IN screws LOW, WIPER, HIGH from the top; the TB8202 copper has HIGH on the top screw (J55B-3).', src:TR2},
    {text:'The remote pot is “10 kΩ LINEAR” on the M8202 sheet but 5 kΩ on the M8208’s page for the same TB8202.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/8200 Series - Rear module drawing Master.cdr'},
    {text:'The ST8202 solder module brings out only OUT 1–4; OUT 5–8 positions are marked NOT USED.', src:TR2},
    {text:'On the ST8202 the input sits below the outputs, and HIGH and WIPER/LOW are on opposite columns.', src:TR2},
    {text:'The Ω in “10 kΩ” is a Symbol-font W in the CorelDRAW print; viewed without the Symbol font it reads “10 kW”.', src:TR2.replace('.CDR','.pdf')},
    {text:'M8202MAN.CDR is the manual cover: a 3 RU MF82 frame with its door dropped open. Its 1998 CorelDRAW 5 text does not survive conversion.', src:'#MF8200 #SERIES/M8202A - #Engineering #MF82/M8202A - 14-212/M8202MAN.CDR'},
  ],
  depth:'Hardware model',
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'1 cycle (1 kHz)',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms (CV ramp)'],[0.005,'5 ms (waveform)'],[0.001,'1 cycle']],
  defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
