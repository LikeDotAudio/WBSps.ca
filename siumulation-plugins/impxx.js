/* =====================================================================
   IMPxx — IMP impedance-matching transformers and panels
   (Ward-Beck Systems, 1997|30 – 2013|46, obsolete) — hardware model
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (folder "IMPXX - #Engineering #PROBLEM"):
   - MECHANICAL/IMPPNLLT.DWG  "IMPEDANCE MATCHING PANEL LAYOUTS" (1997-07-07): IMP-12M, IMP-12F,
       IMP-12 BNC face, IMP-20 Phoenix face, IMP-20 BNC face, IMP-20A. Converted with QCAD dwg2dwg,
       cropped with ezdxf to true inches -> assets/impxx-imp12m.svg … impxx-imp20a.svg.
       Connector centres below were measured from the CIRCLE entities in that file.
   - MECHANICAL/IMP162013-M1/M2/M3, IMP202013-M1/M2, IMP402013-M1/M2 (2013, D.A.): the 2013 panels,
       drawn here from their hole tables; IMP12013-M1 "IMP-TUBE (MALE/FEMALE)", IMPI-M1, IMP1-M5 tubes.
   - MECHANICAL/IMPM01-1, IMPM04-EM, IMPM16 ISS 2, IMPM20 ISS 4, IMPM06 ISS 3, IMPM23 (panel details).
   - IMP-XFR.DSN (OrCAD, 1999): T1/T5/T16/T20 TRANSFORMER, C1/C5/C16/C20, H/J/TB/XLR (JP3), R1–R3, P12,
       nets BNC-1/5/16/20, MALE, FEMALE; board names IMP-20BNC.PCB, IMP-20TB.PCB, IMP-20XLR.PCB.
   - TNN.DSN (1997): T1 + C1 + BNC-1.   IMP-20.DWG: a Tango-PCB ASCII board file (see Findings).
   - IMP1F.CDR / IMP1M.CDR (1997): label sheets "WARD-BECK SYSTEMS IMPEDANCE TRANSFORMER IMP-1F/IMP-1M 110 75".
   Not in the archive and therefore inferred: transformer ratio, pad values, return-loss figures,
   cable model. Everything inferred is marked on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__impxxActive';

/* ---------------- AES3 timing ---------------- */
const FS = 48000, FRAME = 1/FS, UI = FRAME/128, BLOCK = 192*FRAME;   // 128 half-cells per frame (biphase-mark)
const N_TURNS = Math.sqrt(110/75);                                    // 1.211 : 1 for a 110 → 75 Ω match (inferred)
const VEL = 0.66*3e8;                                                  // coax velocity factor 0.66 (inferred)

/* ---------------- panels: geometry in true inches ---------------- */
const P20=[...Array(20)].map((_,i)=>i), P12=[...Array(12)].map((_,i)=>i), P16=[...Array(16)].map((_,i)=>i);
const VARIANTS = {
  imp1m:{ name:'IMP-1M tube (male XLR ↔ BNC)', year:1997, n:1, tube:'M', src:'IMP1M.CDR label; IMP12013-M1 / IMPI-M1 tube drawings' },
  imp1f:{ name:'IMP-1F tube (female XLR ↔ BNC)', year:1997, n:1, tube:'F', src:'IMP1F.CDR label; IMP1-M5 “FEMALE TUBE”' },
  imp12m:{ name:'IMP-12M rack panel (12 male XLR / 12 BNC)', year:1997, n:12, src:'IMPPNLLT.DWG (IMP-12M), IMPM16 ISS 2, IMPM04-EM',
    faces:[{asset:'impxx-imp12m.svg',W:17.303,H:1.791,label:'XLR face (110 Ω)',side:'bal',c:P12.map(i=>({ch:i+1,x:2.048+1.2*i,y:0.906,r:0.465,k:'xlr'}))},
           {asset:'impxx-imp12bnc.svg',W:17.303,H:1.775,label:'BNC face (75 Ω)',side:'unb',c:P12.map(i=>({ch:12-i,x:4.248+0.8*i,y:0.659,r:0.265,k:'bnc'}))}] },
  imp12f:{ name:'IMP-12F rack panel (12 female XLR / 12 BNC)', year:1997, n:12, src:'IMPPNLLT.DWG (IMP-12F, PUSH latches)',
    faces:[{asset:'impxx-imp12f.svg',W:17.303,H:1.822,label:'XLR face (110 Ω)',side:'bal',c:P12.map(i=>({ch:i+1,x:2.048+1.2*i,y:0.91,r:0.465,k:'xlr'}))},
           {asset:'impxx-imp12bnc.svg',W:17.303,H:1.775,label:'BNC face (75 Ω)',side:'unb',c:P12.map(i=>({ch:12-i,x:4.248+0.8*i,y:0.659,r:0.265,k:'bnc'}))}] },
  imp20:{ name:'IMP-20 rack panel (20 Phoenix / 20 BNC)', year:1997, n:20, src:'IMPPNLLT.DWG (IMP-20), IMPM01-1 “(20 BNC, 20 TB/3)”',
    faces:[{asset:'impxx-imp20tb.svg',W:17.303,H:1.776,label:'Phoenix face “+ − G” (110 Ω)',side:'bal',c:P20.map(i=>({ch:20-i,x:0.982+0.8*i,y:1.0,r:0.24,k:'tb'}))},
           {asset:'impxx-imp20bnc.svg',W:17.303,H:1.776,label:'BNC face (75 Ω)',side:'unb',c:P20.map(i=>({ch:i+1,x:1.048+0.8*i,y:0.659,r:0.265,k:'bnc'}))}] },
  imp20a:{ name:'IMP-20A 2RU panel (BNC + Phoenix on one face)', year:1997, n:20, src:'IMPPNLLT.DWG (IMP-20A), IMPM20 ISS 4',
    faces:[{asset:'impxx-imp20a.svg',W:19.064,H:3.521,label:'Single face: BNC row (75 Ω) over Phoenix row (110 Ω)',side:'both',c:[].concat(P20.map(i=>({ch:i+1,x:1.929+0.8*i,y:1.163,r:0.265,k:'bnc'})),P20.map(i=>({ch:i+1,x:1.929+0.8*i,y:2.62,r:0.24,k:'tb'})))}] },
  imp16_2013:{ name:'IMP-16 (2013): IMP162013 BNC(16) + XLR(16)', year:2013, n:16, src:'IMP162013-M1 / -M2 / -M3 ISS 1',
    faces:[{draw:true,W:17.12,H:1.72,label:'IMP162013-M2 XLR(16) — 16 × .950 dia @ 1.040',side:'bal',c:P16.map(i=>({ch:i+1,x:0.760+1.04*i,y:0.860,r:0.475,k:'xlr'}))},
           {draw:true,W:17.12,H:1.72,label:'IMP162013-M1 BNC(16) — 16 × .562 dia @ 1.040',side:'unb',c:P16.map(i=>({ch:i+1,x:0.760+1.04*i,y:0.893,r:0.281,k:'bnc'}))}] },
  imp20_2013:{ name:'IMP-20 (2013): IMP202013 BNC(20) + PHOENIX(20)', year:2013, n:20, src:'IMP202013-M1 / -M2 ISS 1',
    faces:[{draw:true,W:17.12,H:1.72,label:'IMP202013-M2 PHOENIX(20) — 20 × .332×.528 @ .825',side:'bal',c:P20.map(i=>({ch:i+1,x:0.722+0.825*i,y:0.851,r:0.2,k:'rect'}))},
           {draw:true,W:17.12,H:1.72,label:'IMP202013-M1 BNC(20) — 20 × .562 dia @ .825',side:'unb',c:P20.map(i=>({ch:i+1,x:0.722+0.825*i,y:0.893,r:0.281,k:'bnc'}))}] },
  imp40_2013:{ name:'IMP-40 (2013): IMP402013 BNC to Phoenix', year:2013, n:20, src:'IMP402013-M1 FRONT / -M2 REAR ISS 1',
    faces:[{draw:true,W:17.12,H:1.72,label:'IMP402013-M1 FRONT — BNC row at .465 + Phoenix row',side:'both',c:[].concat(P20.map(i=>({ch:i+1,x:0.722+0.825*i,y:0.465,r:0.278,k:'bnc'})),P20.map(i=>({ch:i+1,x:0.722+0.825*i,y:1.27,r:0.2,k:'rect'})))}] },
};
const TERMS = { '75':{z:75,l:'75 Ω terminated (correct)'}, open:{z:1e9,l:'open (no terminator)'}, '50':{z:50,l:'50 Ω terminator (wrong part)'}, '110':{z:110,l:'110 Ω load (no IMP in the path)'} };

/* ---------------- state ---------------- */
let EK='', EYE=null;
const D = { v:'imp20a', sel:1, conn:{}, dir:'b2u', vpp:4, pad:true, term:'75', len:100, bypass:false, log:[] };
function reset(){ Object.assign(D,{v:'imp12m',sel:1,conn:{},dir:'b2u',vpp:4,pad:true,term:'75',len:100,bypass:false}); D.conn={1:{bal:true,unb:true}}; EK=''; }
reset();
const V = ()=>VARIANTS[D.v];
const cs = ch=>D.conn[ch]||(D.conn[ch]={bal:false,unb:false});

/* ---------------- the transmission model ---------------- */
function path(){
  const c=cs(D.sel), live=c.bal&&c.unb;
  const padDb = D.pad? -10.4 : 0;                                       // R1–R3 network brings 4 Vpp to ≈1 Vpp (inferred values)
  const tDb = D.bypass? 0 : (D.dir==='b2u'? -20*Math.log10(N_TURNS) : 20*Math.log10(N_TURNS));
  const zSrcSeen = D.bypass? 110 : 75*(1+0.03);                         // transformer output impedance ≈ 75 Ω (RL ≈ 30 dB, inferred)
  const ZL = TERMS[D.term].z, Z0 = 75;
  const gL = (ZL-Z0)/(ZL+Z0), gS = (zSrcSeen-Z0)/(zSrcSeen+Z0);
  const rl = -20*Math.log10(Math.max(1e-4,Math.abs(gL)));
  const tau = D.len/VEL;
  const lossDb = 2.2*D.len/100;                                         // ≈2.2 dB/100 m at 6 MHz on RG-59-class coax (inferred)
  const fc = 6e6*Math.pow(10, -lossDb/20)*1.6 + 2e5;                   // single-pole stand-in for cable HF loss (inferred)
  const vOut = D.dir==='b2u'? D.vpp*Math.pow(10,(tDb+(D.bypass?0:padDb))/20) : D.vpp*Math.pow(10,tDb/20);
  const vRx = live? vOut*Math.pow(10,-lossDb/20)*(1+gL) : 0;           // at the far end (open → doubles)
  return { live, padDb, tDb, gL, gS, rl, tau, lossDb, fc, vOut, vRx, echo: gL*gS*Math.pow(10,-2*lossDb/20),
    ok: D.dir==='b2u'? (vRx>=0.32 && vRx<=1.6) : vRx>=0.2, spec: D.dir==='b2u'?'AES3id: 1.0 V ±20 % sent, ≥ 320 mV received':'AES3: ≥ 200 mV received' };
}

/* ---------------- AES3 bit stream (biphase-mark), deterministic ---------------- */
const PRE = { X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0] };
function rnd(n){ n=(n^61)^(n>>>16); n=(n+(n<<3))|0; n=n^(n>>>4); n=Math.imul(n,0x27d4eb2d); n=n^(n>>>15); return (n>>>0); }
function halfCells(fr, sub){   // 64 half-cells for one subframe
  const pre = sub? PRE.Y : (fr%192===0? PRE.Z : PRE.X);
  const out = pre.slice(); let lvl = pre[7];
  const word = rnd(fr*2+sub);
  for (let b=4;b<32;b++){ const bit = b<28? (word>>(b-4))&1 : 0; lvl^=1; out.push(lvl); if(bit) lvl^=1; out.push(lvl); }
  return out;
}
function levelAt(t){ // ±1 at time t (seconds) for channel stream
  if (t<0) return 1; const fr=Math.floor(t/FRAME), k=Math.floor((t-fr*FRAME)/UI); const sub=k>=64?1:0;
  const hc=halfCells(fr,sub); return hc[k-sub*64]? 1 : -1;
}
/* received waveform: single-pole low-pass of (direct + echo) */
function rxWave(t0, t1, n){
  const p=path(), out=new Float32Array(n+1), dt=(t1-t0)/n, a=1-Math.exp(-2*Math.PI*p.fc*dt);
  let y=0; const warm=Math.max(20,Math.round(4/(2*Math.PI*p.fc)/dt));
  for (let i=-warm;i<=n;i++){ const t=t0+i*dt; const x=levelAt(t-p.tau)+(p.echo? p.echo*levelAt(t-3*p.tau):0); y+=a*(x-y); if(i>=0) out[i]=y; }
  return out;
}
function eye(){ const p=path(), key=[D.len,D.term,D.bypass,D.pad,D.vpp,D.dir,p.live].join('|'); if(key===EK) return EYE; EK=key;
  const t0=0.01, n=128*6, span=n*UI, w=rxWave(t0, t0+span, n*16); EYE={w,per:16}; return EYE; }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; EK=''; SIM.refresh(); }
const A = {
  variant(v){ act(`Pick ${VARIANTS[v].name}`, tr=>{ D.v=v; D.sel=1; D.conn={1:{bal:true,unb:true}}; tr(`${VARIANTS[v].n} channel${VARIANTS[v].n>1?'s':''}, one AESXFMR + DC-blocking cap each (IMP-XFR.DSN pattern T/C per channel)`); tr(`Drawing source: ${VARIANTS[v].src}`); }); },
  plug(ch, side){ act(`${cs(ch)[side]?'Unplug':'Plug'} ch ${ch} ${side==='bal'?'110 Ω (XLR/Phoenix)':'75 Ω BNC'}`, tr=>{ D.sel=ch; const c=cs(ch); c[side]=!c[side];
    tr(side==='bal'? `${c.bal?'Cable on':'Cable off'} the balanced side: XLR/TB pin 2 (+) / 3 (−) → C${ch} → T${ch} primary ${inf('pin use')}` : `${c.unb?'Coax on':'Coax off'} BNC-${ch}: T${ch} secondary → BNC centre / shell`);
    const p=path(); tr(p.live? `Channel ${ch} passes AES3: ${p.vOut.toFixed(2)} Vpp leaves the IMP, ${p.vRx.toFixed(2)} Vpp at the far end` : `Channel ${ch} is not complete — nothing passes`); }); },
  select(ch){ act(`Select channel ${ch}`, tr=>{ D.sel=ch; const c=cs(ch); tr(`Ch ${ch}: balanced ${c.bal?'plugged':'empty'}, BNC ${c.unb?'plugged':'empty'}`); }); },
  term(k){ act(`Far-end load: ${TERMS[k].l}`, tr=>{ D.term=k; const p=path(); tr(`Γ_load = (${k==='open'?'∞':TERMS[k].z} − 75)/(${k==='open'?'∞':TERMS[k].z} + 75) = ${p.gL.toFixed(3)} → return loss ${p.rl>=79?'∞':p.rl.toFixed(1)+' dB'}`); tr(`Reflection reaches the IMP after 2τ = ${SIM.fmtDur(2*p.tau)}${D.bypass?' and bounces again off the 110 Ω driver (Γ_src '+p.gS.toFixed(2)+')':'; the transformer presents ≈75 Ω so most of it is absorbed'+' '+inf('transformer RL')}`); }); },
  len(m){ act(`Coax length ${m} m`, tr=>{ D.len=m; const p=path(); tr(`τ = ${SIM.fmtDur(p.tau)} one way · loss ≈ ${p.lossDb.toFixed(1)} dB at 6 MHz ${inf('RG-59 data')}`); tr(`Received ${p.vRx.toFixed(3)} Vpp — ${p.ok?'inside':'outside'} ${p.spec}`); }); },
  pad(){ act(`JP3 pad ${D.pad?'out':'in'}`, tr=>{ D.pad=!D.pad; tr(`JP3 (H/J jumper on IMP-XFR.DSN) ${D.pad?'routes the secondary through R1–R3':'shorts past R1–R3'} ${inf('JP3 role')}`); const p=path(); tr(`Sent level ${p.vOut.toFixed(2)} Vpp (AES3id wants 1.0 V ±20 %)`); }); },
  dir(){ act(`Direction ${D.dir==='b2u'?'75 → 110 Ω':'110 → 75 Ω'}`, tr=>{ D.dir=D.dir==='b2u'?'u2b':'b2u'; tr(D.dir==='b2u'?'AES3 driver on XLR/Phoenix → BNC: step down 1.211:1 (+ pad)':'AES3id driver on BNC → XLR/Phoenix: step up 1:1.211 into a 110 Ω AES3 input'); tr('The IMP is passive: the same part works both ways; only the pad matters'); }); },
  vpp(v){ act(`Source ${v} Vpp`, tr=>{ D.vpp=v; const p=path(); tr(`${D.dir==='b2u'?'AES3 (2–7 Vpp into 110 Ω)':'AES3id (1 Vpp into 75 Ω)'}: ${v} Vpp → ${p.vOut.toFixed(2)} Vpp out of the IMP`); }); },
  bypass(){ act(D.bypass?'Put the IMP back':'Bypass the IMP (110 Ω driver straight onto coax)', tr=>{ D.bypass=!D.bypass; const p=path(); tr(D.bypass? `No transformer: the 110 Ω driver sees 75 Ω coax (Γ_src ${p.gS.toFixed(2)}); reflections bounce back and forth` : 'Transformer back: 110 Ω balanced ↔ 75 Ω unbalanced, isolated'); }); },
};

/* ---------------- panel drawing ---------------- */
function faceSVG(f, S){
  let s=`<svg viewBox="0 0 ${f.W*S} ${f.H*S}" style="width:100%;border-radius:4px;background:#2a2b2d">`;
  if (f.asset) s+=`<rect width="${f.W*S}" height="${f.H*S}" fill="#d9d8d3"/><image href="${ASSET}${f.asset}" x="0" y="0" width="${f.W*S}" height="${f.H*S}"/>`;
  else { s+=`<rect width="${f.W*S}" height="${f.H*S}" fill="#1d1e20" stroke="#000"/>`;
    for (const c of f.c){ if(c.k==='rect') s+=`<rect x="${(c.x-0.166)*S}" y="${(c.y-0.264)*S}" width="${0.332*S}" height="${0.528*S}" fill="#000" stroke="#555"/>`; else s+=`<circle cx="${c.x*S}" cy="${c.y*S}" r="${c.r*S}" fill="#050505" stroke="#666"/>`;
      s+=`<text x="${c.x*S}" y="${(c.k==='rect'&&f.side==='both'?c.y+0.42:c.y-c.r-0.05)*S}" font-size="${0.12*S}" fill="#ddd" text-anchor="middle">${c.ch}</text>`; } }
  for (const c of f.c){ const side = c.k==='bnc'?'unb':'bal', on=cs(c.ch)[side], sel=c.ch===D.sel, live=cs(c.ch).bal&&cs(c.ch).unb;
    const col = live? 'var(--accent)' : on? 'var(--warn)' : 'transparent';
    const shape = (c.k==='rect'||c.k==='tb')? `<rect x="${(c.x-c.r)*S}" y="${(c.y-c.r)*S}" width="${2*c.r*S}" height="${2*c.r*S}" rx="4"` : `<circle cx="${c.x*S}" cy="${c.y*S}" r="${c.r*S}"`;
    s+=`<g data-ch="${c.ch}" data-side="${side}" style="cursor:pointer">${shape} fill="${col}" fill-opacity="${on?0.45:0}" stroke="${sel?'var(--accent2)':'transparent'}" stroke-width="${sel?4:0}"/><title>Ch ${c.ch} ${side==='bal'?'110 Ω balanced':'75 Ω BNC'} — click to plug / unplug</title></g>`;
    if (on && c.k==='bnc' && side==='unb') s+=`<circle cx="${c.x*S}" cy="${c.y*S}" r="${c.r*0.45*S}" fill="#c7c9cc" pointer-events="none"/>`; }
  return s+'</svg>';
}
function tubeSVG(){
  const t=V().tube, S=110, c=cs(1), live=c.bal&&c.unb;
  return `<svg viewBox="0 0 ${5.2*S} ${1.3*S}" style="width:100%;max-width:640px;background:var(--lane);border-radius:6px">
    <g data-ch="1" data-side="bal" style="cursor:pointer"><rect x="${0.2*S}" y="${0.3*S}" width="${1.3*S}" height="${0.75*S}" rx="10" fill="${c.bal?'#555':'#2b2b2b'}" stroke="${c.bal?'var(--accent)':'#000'}" stroke-width="3"/><text x="${0.85*S}" y="${0.72*S}" fill="#ddd" font-size="14" text-anchor="middle">${t==='M'?'XLR male':'XLR female (NC3FX)'}</text><title>110 Ω side — click to plug a cable</title></g>
    <rect x="${1.5*S}" y="${0.3*S}" width="${2.125*S}" height="${0.75*S}" fill="#151515" stroke="#000"/><text x="${2.56*S}" y="${0.6*S}" fill="#eee" font-size="13" text-anchor="middle">WARD-BECK SYSTEMS · IMPEDANCE TRANSFORMER</text><text x="${2.56*S}" y="${0.86*S}" fill="#eee" font-size="15" font-weight="700" text-anchor="middle">IMP-1${t}   110 ↔ 75</text>
    <g data-ch="1" data-side="unb" style="cursor:pointer"><rect x="${3.625*S}" y="${0.45*S}" width="${0.55*S}" height="${0.45*S}" fill="#b9bcbf"/><rect x="${4.175*S}" y="${0.5*S}" width="${0.6*S}" height="${0.35*S}" fill="${c.unb?'var(--accent)':'#8b8e91'}"/><text x="${4.48*S}" y="${0.45*S}" font-size="12" fill="var(--ink2)" text-anchor="middle">BNC</text><title>75 Ω side — click to plug coax</title></g>
    <text x="${0.2*S}" y="${1.25*S}" font-size="12" fill="var(--ink2)">2.125″ black-anodised 6061 tube (IMP12013-M1), M17×1 thread for the NC3FX, BNC 112740-13 · ${live?'passing AES':'idle'}</text></svg>`;
}
function panelHTML(){ const v=V(); if (v.tube) return tubeSVG();
  return v.faces.map((f,i)=>`<div class="small muted" style="margin:6px 0 2px">${f.label} · ${f.W.toFixed(3)} × ${f.H.toFixed(3)} in ${f.asset?'(IMPPNLLT.DWG)':'(drawn from '+v.src.split(' ')[0]+')'}</div>${faceSVG(f, 70)}`).join(''); }
function bindPanel(root){ root.querySelectorAll('[data-ch]').forEach(g=>g.onclick=()=>A.plug(+g.dataset.ch, g.dataset.side)); }

function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>Product <select id="vv">${Object.keys(VARIANTS).map(k=>`<option value="${k}" ${D.v===k?'selected':''}>${VARIANTS[k].name}</option>`).join('')}</select></label>
  <label>Channel <select id="ch">${[...Array(V().n)].map((_,i)=>`<option ${D.sel===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label>
  <label>Far-end load <select id="tm">${Object.keys(TERMS).map(k=>`<option value="${k}" ${D.term===k?'selected':''}>${TERMS[k].l}</option>`).join('')}</select></label>
  <label>Coax <input id="ln" type="range" min="0" max="1000" step="10" value="${D.len}"> <span id="lnv" class="mono"></span></label>
  <label>Source <input id="vp" type="range" min="0.5" max="7" step="0.5" value="${D.vpp}"> <span id="vpv" class="mono"></span></label>
  <button id="pd">JP3 pad ${D.pad?'IN':'OUT'}</button><button id="dr">${D.dir==='b2u'?'110 → 75':'75 → 110'}</button><button id="bp">${D.bypass?'IMP bypassed':'IMP in circuit'}</button><button id="rs">Reset</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#vv')) return;
  const u=()=>{ q('#lnv').textContent=D.len+' m'; q('#vpv').textContent=D.vpp+' Vpp'; }; u();
  q('#vv').onchange=e=>A.variant(e.target.value); q('#ch').onchange=e=>A.select(+e.target.value); q('#tm').onchange=e=>A.term(e.target.value);
  q('#ln').oninput=e=>{D.len=+e.target.value;u();EK='';}; q('#ln').onchange=e=>A.len(+e.target.value);
  q('#vp').oninput=e=>{D.vpp=+e.target.value;u();}; q('#vp').onchange=e=>A.vpp(+e.target.value);
  q('#pd').onclick=()=>A.pad(); q('#dr').onclick=()=>A.dir(); q('#bp').onclick=()=>A.bypass(); q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); }; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a connector on the panel to plug or unplug it, or change the load and cable.</div>'; }

/* ---------------- lanes ---------------- */
function lanes(){ const p=path(), css=SIM.css;
  const wave=(c,X,t0,t1,y,h,f,col)=>{ const pw=X(t1)-X(t0); if((t1-t0)/UI > pw/1.5){ c.fillStyle=col; c.globalAlpha=.3; c.fillRect(X(t0),y+4,pw,h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(`${Math.round((t1-t0)/UI).toLocaleString()} half-cells — zoom to 50 µs`,X(t0)+4,y+h/2+4); return; }
    c.strokeStyle=col; c.beginPath(); const n=Math.min(2000,Math.ceil(pw)); for(let i=0;i<=n;i++){ const tt=t0+(t1-t0)*i/n, v=f(tt); i?c.lineTo(X(tt),y+h/2-v*h*0.4):c.moveTo(X(tt),y+h/2-v*h*0.4);} c.stroke(); };
  return [
    {label:'AES3 blocks (Z preamble, 4 ms)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,BLOCK,0,FRAME,css('--warn'),'blocks'); }},
    {label:'Frames (48 kHz)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,FRAME,0,FRAME/16,css('--accent2'),'frames'); }},
    {label:`Sent, ${D.dir==='b2u'?'110 Ω side':'BNC side'} (${D.vpp} Vpp)`, h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t=>p.live?levelAt(t):0,css('--accent2')); }},
    {label:`IMP output (${p.vOut.toFixed(2)} Vpp)`, h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t=>p.live?levelAt(t)*Math.min(1,p.vOut/D.vpp):0,css('--accent')); }},
    {label:`Far end after ${D.len} m (${p.vRx.toFixed(2)} Vpp)`, h:44, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0); if((t1-t0)/UI>pw/1.5){ wave(c,X,t0,t1,y,h,()=>0,p.ok?css('--accent'):css('--bad')); return; } const n=Math.min(1500,Math.ceil(pw)), w=rxWave(t0,t1,n), sc=p.live? p.vRx/2/0.8 : 0; c.strokeStyle=p.ok?css('--accent'):css('--bad'); c.beginPath(); for(let i=0;i<=n;i++){ const v=Math.max(-1.2,Math.min(1.2,w[i]*sc)); const xx=X(t0+(t1-t0)*i/n); i?c.lineTo(xx,y+h/2-v*h*0.4):c.moveTo(xx,y+h/2-v*h*0.4);} c.stroke(); }},
    {label:`Reflection back at the IMP (Γ ${p.gL.toFixed(2)})`, h:30, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t=>p.live?p.gL*levelAt(t-2*p.tau):0,css('--warn')); }},
  ]; }
function eyeDraw(cv){ const {c,w,h}=SIM.canvas(cv,170), p=path(), E=eye(), css=SIM.css; c.fillStyle=css('--lane'); c.fillRect(0,0,w,h);
  c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(0,h/2); c.lineTo(w,h/2); c.stroke();
  const per=E.per, amp = p.live? p.vRx/2 : 0; c.strokeStyle=p.ok?css('--accent'):css('--bad'); c.globalAlpha=.35;
  for (let s=0; s+per*2<E.w.length; s+=per){ c.beginPath(); for(let i=0;i<=per*2;i++){ const v=E.w[s+i]*amp; const x=i/(per*2)*w, y=h/2-Math.max(-1.1,Math.min(1.1,v/0.8))*h*0.42; i?c.lineTo(x,y):c.moveTo(x,y);} c.stroke(); }
  c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px monospace'; c.fillText(`2 half-cells (${SIM.fmtDur(2*UI)}) · ${p.vRx.toFixed(2)} Vpp · ${p.ok?'opens':'too small / too big'}`,6,14); }

/* ---------------- views ---------------- */
function inspHTML(){ const p=path(), c=cs(D.sel); return `<table class="kv">
  <tr><th>Product</th><td>${V().name} (${SIM.year(V().year)})</td></tr>
  <tr><th>Channel ${D.sel}</th><td class="mono">110 Ω side ${c.bal?'plugged':'empty'} · BNC ${c.unb?'plugged':'empty'} · ${p.live?'<b style="color:var(--accent)">passing</b>':'idle'}</td></tr>
  <tr><th>Transformer</th><td class="mono">${D.bypass?'bypassed':(D.dir==='b2u'?'step down':'step up')+' 1.211:1 ('+p.tDb.toFixed(2)+' dB)'} ${inf('√(110/75)')}</td></tr>
  <tr><th>Pad (JP3)</th><td class="mono">${D.pad?p.padDb.toFixed(1)+' dB':'out'} ${inf('R1–R3 values')}</td></tr>
  <tr><th>Level sent / received</th><td class="mono">${p.vOut.toFixed(2)} Vpp / ${p.vRx.toFixed(3)} Vpp — ${p.ok?'OK':'<b style="color:var(--bad)">out of spec</b>'} (${p.spec})</td></tr>
  <tr><th>Load / return loss</th><td class="mono">${TERMS[D.term].l} · Γ ${p.gL.toFixed(3)} · RL ${p.rl>=79?'∞':p.rl.toFixed(1)+' dB'}</td></tr>
  <tr><th>Coax</th><td class="mono">${D.len} m · τ ${SIM.fmtDur(p.tau)} · ${p.lossDb.toFixed(1)} dB @ 6 MHz</td></tr></table>`; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML = card('The panel — click any connector to plug or unplug a cable (green = channel passes AES)', `<div id="fp"></div>${controlsHTML()}`)
   + `<div class="grid2"><div>${card('State of the selected channel', `<div id="insp"></div>`)}${card('Eye at the far end (biphase-mark, 6.144 MHz half-cells)', `<canvas id="eye"></canvas>`)}</div>
     <div>${card('What changed in the circuit (last action)', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div></div>`
   + card('Timeline — one second of AES3 at 48 kHz (zoom to 50 µs to see the bit cells)', `<canvas id="tl"></canvas>`);
  bindControls(m);
  SIM.on('time', ()=>{ m.querySelector('#fp').innerHTML=panelHTML(); bindPanel(m.querySelector('#fp'));
    m.querySelector('#insp').innerHTML=inspHTML(); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    eyeDraw(m.querySelector('#eye')); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); });
}
const LESSONS = [
  { title:'1 · Pick the panel', body:`<p>WBS made the IMP as a single in-line tube (IMP-1M / IMP-1F) and as rack panels: IMP-12M/F (XLR ↔ BNC), IMP-20 (Phoenix ↔ BNC, two faces), IMP-20A (both on one 2RU face) and the 2013 IMP-16/20/40 redraws. Choose <b>IMP-20A</b>.</p>`, check:()=>D.v==='imp20a', hint:'Product → IMP-20A.' },
  { title:'2 · Patch channel 3', body:`<p>On the IMP-20A the BNCs are on top, the Phoenix “+ − G” blocks below. Click the <b>Phoenix block 3</b> (your AES3 feed) and <b>BNC 3</b> (the coax). The channel turns green when both ends are plugged.</p>`, check:()=>D.v==='imp20a'&&cs(3).bal&&cs(3).unb, hint:'Click the third Phoenix block and the third BNC.' },
  { title:'3 · Get 1 V on the coax', body:`<p>AES3id expects <b>1.0 V ±20 %</b> into 75 Ω. With a 4 Vpp AES3 source, the 1.211:1 transformer alone gives 3.3 V: too hot. Make sure the <b>JP3 pad is IN</b>, source at 4 Vpp, and read “Level sent”.</p>`, check:()=>D.sel===3&&D.pad&&D.vpp===4&&Math.abs(path().vOut-1)<0.2, hint:'Select channel 3, JP3 pad IN, Source 4 Vpp.' },
  { title:'4 · Forget the terminator', body:`<p>Set the far-end load to <b>open</b>. The level at the far end doubles and the whole edge comes back to the IMP after 2τ (look at the Reflection lane). Return loss is 0 dB.</p>`, check:()=>D.term==='open', hint:'Far-end load → open.' },
  { title:'5 · Terminate and go long', body:`<p>Put the <b>75 Ω</b> terminator back and run the coax to <b>1000 m</b>. AES3id is good for about 1 km: the eye shrinks but should stay above 320 mV.</p>`, check:()=>D.term==='75'&&D.len>=1000, hint:'Load → 75 Ω, Coax slider to 1000 m.' },
  { title:'6 · Why the transformer matters', body:`<p>Press <b>IMP in circuit</b> to bypass it: a 110 Ω driver straight onto 75 Ω coax. Now any mismatch at the far end bounces twice, and there is no ground isolation. Set the load to 50 Ω to see the echo in the eye.</p>`, check:()=>D.bypass&&D.term==='50', hint:'Click “IMP in circuit” to bypass, then Load → 50 Ω.' },
  { title:'7 · The other direction', body:`<p>Restore the IMP and press <b>110 → 75</b> to reverse: an AES3id BNC source feeding a 110 Ω XLR input (what the ABB-1 manual recommends the <b>IMP-1M</b> for). Pick the IMP-1M tube.</p>`, check:()=>!D.bypass&&D.dir==='u2b'&&D.v==='imp1m', hint:'Click “IMP bypassed” to restore, click the direction button, Product → IMP-1M.' },
  { title:'Done', body:`<p>That covers every IMP variant in the folder. The <b>Findings</b> tab explains why this folder was tagged #PROBLEM: a PCB file disguised as a drawing, missing sub-folders and three panel generations.</p>`, check:()=>true, auto:true },
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — using an IMP (from the drawings; no manual survives)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="insp" style="margin-top:8px"></div>`)}${card('What changed', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=panelHTML(); bindPanel(m.querySelector('#fp')); m.querySelector('#insp').innerHTML=inspHTML(); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{ li=+x.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.v='imp12m'; D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){ window[KEY]=false;
  m.innerHTML = card('One second in slow motion — AES3 through one IMP channel', `<canvas id="tl"></canvas>`)
   + `<div class="grid2">${card('Eye at the far end', `<canvas id="eye"></canvas>`)}${card('Time scales', `<table class="kv small">
     <tr><th>Block</th><td>192 frames = ${SIM.fmtDur(BLOCK)} (Z preamble) — 250 per second</td></tr>
     <tr><th>Frame</th><td>${SIM.fmtDur(FRAME)} = 2 subframes × 32 bits</td></tr>
     <tr><th>Bit cell / half-cell</th><td>${SIM.fmtDur(2*UI)} / ${SIM.fmtDur(UI)} (3.072 Mb/s, 6.144 MHz transitions)</td></tr>
     <tr><th>Coax delay</th><td>${SIM.fmtDur(path().tau)} each way for ${D.len} m at 0.66 c ${inf('velocity factor')}</td></tr>
     <tr><th>Transformer</th><td>Passive: no clock, no logic. Bandwidth must pass 6 MHz without ringing.</td></tr></table>`)}</div>`;
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); eyeDraw(m.querySelector('#eye')); });
}
const BLOCKS = {
  bal:{x:10,y:60,w:150,h:70,t:'XLR / Phoenix',s:['110 Ω balanced','pins 2 / 3 (+ − G)'],d:'AES3 side. IMP-12M/F use XLR (male or female, NC3FX-type with PUSH latch), IMP-20/20A use 3-pole Phoenix blocks marked “+ − G”, the 2013 IMP202013-M2 a .332 × .528 rectangular cut-out per channel.'},
  c:{x:200,y:60,w:110,h:70,t:'C1…C20',s:['CAP100 / “C”','DC block'],d:'One capacitor per channel (IMP-XFR.DSN: C1, C5, C16, C20; IMP-20.DWG: 100 × CAP100). Keeps DC off the transformer winding (role inferred).'},
  t:{x:350,y:40,w:150,h:110,t:'T1…T20 AESXFMR',s:['110 ↔ 75 Ω','≈1.211 : 1 (inferred)','galvanic isolation'],d:'The AES transformer (Tango pattern “AESXFMR”, OrCAD part “TRANSFORMER”). It converts the balanced 110 Ω line to unbalanced 75 Ω coax and isolates the two grounds. The turns ratio is not in the archive: √(110/75) = 1.211 is the ratio that matches impedances (inferred).'},
  jp:{x:540,y:40,w:130,h:60,t:'JP3 H / J',s:['3-pin jumper','R1–R3 pad'],d:'IMP-XFR.DSN has H- and J-numbered JP3 headers per channel plus R1–R3. The simulator treats them as the pad in/out selection (inferred; values not given).'},
  unb:{x:540,y:120,w:130,h:60,t:'BNC-1…BNC-20',s:['75 Ω unbalanced','AES3id'],d:'Coax side: .562 or .531 dia holes (double-D .450 × .512 on IMPM16/IMPM04-EM).'},
  mech:{x:710,y:60,w:140,h:90,t:'Mechanics',s:['.059 CRS, WBS black','ident extrusion A9917','reversible rack wings'],d:'IMPPNLLT: “RACK WINGS ARE REVERSEABLE FOR SELECTING ORIENTATION”. IMPM06 ident extrusion + clear copolyester cover; finish changed from 361C green to textured black.'},
};
const WIRES=[['bal','c'],['c','t'],['t','jp'],['jp','unb'],['unb','mech']];
let bsel='t';
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram — one channel (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 200" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
const W_=d=>`<path d="${d}" fill="none" stroke="var(--ink)"/>`, N=(x,y,t,a)=>`<text x="${x}" y="${y}" font-size="10.5" fill="var(--accent2)" ${a?'text-anchor="'+a+'"':''}>${t}</text>`, T_=(x,y,t,s,c)=>`<text x="${x}" y="${y}" font-size="${s||11}" fill="${c||'var(--ink)'}">${t}</text>`;
function xfr(x,y,k){ return `${N(x-10,y+4,'XLR'+k+' / TB'+k,'end')}${W_(`M${x} ${y} h30 M${x} ${y+30} h30`)}<line x1="${x+30}" y1="${y-6}" x2="${x+30}" y2="${y+6}" stroke="var(--ink)"/><line x1="${x+34}" y1="${y-6}" x2="${x+34}" y2="${y+6}" stroke="var(--ink)"/>${T_(x+18,y-10,'C'+k,10)}
  ${W_(`M${x+34} ${y} h26`)}<path d="M${x+60} ${y-4} q8 5 0 10 q8 5 0 10 q8 5 0 10 q8 5 0 10" fill="none" stroke="var(--ink)"/><path d="M${x+84} ${y-4} q-8 5 0 10 q-8 5 0 10 q-8 5 0 10 q-8 5 0 10" fill="none" stroke="var(--ink)"/><line x1="${x+71}" y1="${y-6}" x2="${x+71}" y2="${y+38}" stroke="var(--ink)"/><line x1="${x+73}" y1="${y-6}" x2="${x+73}" y2="${y+38}" stroke="var(--ink)"/>${T_(x+58,y-10,'T'+k,10)}
  ${W_(`M${x+30} ${y+30} h30 v6 M${x+84} ${y} h40 M${x+84} ${y+36} h40`)}<rect x="${x+124}" y="${y-8}" width="26" height="50" fill="none" stroke="var(--ink)" stroke-dasharray="3 2"/>${T_(x+122,y+56,'H'+k+'/J'+k+' JP3',9.5)}${W_(`M${x+150} ${y} h40`)}<circle cx="${x+200}" cy="${y}" r="10" fill="none" stroke="var(--ink)"/>${N(x+214,y+4,'BNC-'+k)}${W_(`M${x+150} ${y+36} h50 v-26`)}`; }
const SHEETS=[
  {name:'1 · IMP-XFR.DSN (channels 1, 5, 16, 20)', note:'Redrawn from the part list and net labels of IMP-XFR.DSN (OrCAD Capture, 1999). The DSN only names parts and nets; the winding polarity, cap position and JP3 wiring are drawn the usual way and are inferred.', svg:()=>
    xfr(150,50,1)+xfr(150,130,5)+xfr(150,210,16)+xfr(150,290,20)+T_(470,60,'One page, four example channels; the board names in the file')+T_(470,76,'(IMP-20BNC.PCB, IMP-20TB.PCB, IMP-20XLR.PCB, IMP20B.DSN)')+T_(470,92,'show the same page drove three IMP-20 board variants.')+T_(470,124,'Also on the page: R1, R2, R3, P12, XLR1, XLR12 (JP3),')+T_(470,140,'nets MALE / FEMALE (XLR gender), IMP-20.')+T_(470,190,'TNN.DSN (1997): T1 + C1 + BNC-1 only —')+T_(470,206,'the single-channel IMP-1 tube circuit.') },
  {name:'2 · IMP-20.DWG board (Tango)', note:'IMP-20.DWG is a Tango-PCB PLUS V2.02 ASCII board file. Part counts are from its COMP records.', svg:()=>{ let s=T_(30,30,'Board outline 16.21 × 13.585 in (995,995 – 17205,14580 mils): a panel of IMP-20 boards',12);
    [['AESXFMR',100],['BNC',100],['CAP100',100],['JP3',72],['WECO3X138',80],['R400',48],['XLR3M',12]].forEach(([n,c],i)=>{ s+=`<rect x="40" y="${50+i*36}" width="${c*4}" height="24" fill="color-mix(in srgb,var(--accent) 35%,transparent)" stroke="var(--line)"/>${T_(50+c*4,67+i*36,n+' × '+c)}`; });
    return s+T_(40,320,'100 transformer/BNC/cap sets = 5 × 20 channels; 80 WECO3X138 3-pole blocks = 4 × 20 (TB variants); 12 XLR3M = one XLR row.')+T_(40,340,'Texts MALE / FEM / + / G (24 each) and “WARD-BECK SYSTEMS IMP-20” ×3.'); } },
];
let si=0;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn from IMP-XFR.DSN / IMP-20.DWG part lists (not the original CAD)', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ si=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 360" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="352" text-anchor="end" font-size="10" fill="var(--ink2)">IMPxx · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">The IMP is passive — no software. This tab follows the signal stage by stage, live, for the selected channel.</p><div class="grid2">${card('Signal path, stage by stage', `<div id="sp"></div>`)}${card('Impedance and reflections', `<div id="rf"></div>`)}</div>`
   + card('Every load at the current cable length', `<div id="tbl"></div>`);
  SIM.on('time', ()=>{ const p=path(); const st= D.dir==='b2u'? [['AES3 driver','110 Ω balanced',D.vpp.toFixed(2)+' Vpp'],['C'+D.sel+' DC block','(inferred)',D.vpp.toFixed(2)+' Vpp'],['T'+D.sel+' 1.211 : 1',D.bypass?'bypassed':p.tDb.toFixed(2)+' dB',(D.vpp*Math.pow(10,p.tDb/20)).toFixed(2)+' Vpp'],['JP3 / R1–R3 pad',D.pad&&!D.bypass?p.padDb.toFixed(1)+' dB':'out',p.vOut.toFixed(2)+' Vpp'],['BNC-'+D.sel+' + '+D.len+' m coax','−'+p.lossDb.toFixed(1)+' dB',(p.vOut*Math.pow(10,-p.lossDb/20)).toFixed(2)+' Vpp'],['Far-end load',TERMS[D.term].l,p.vRx.toFixed(3)+' Vpp']]
      : [['AES3id driver','75 Ω coax',D.vpp.toFixed(2)+' Vpp'],['T'+D.sel+' 1 : 1.211','+'+p.tDb.toFixed(2)+' dB',p.vOut.toFixed(2)+' Vpp'],['XLR/Phoenix + '+D.len+' m pair','−'+p.lossDb.toFixed(1)+' dB',(p.vOut*Math.pow(10,-p.lossDb/20)).toFixed(2)+' Vpp'],['AES3 input','110 Ω',p.vRx.toFixed(3)+' Vpp']];
    let y=10, s=`<svg viewBox="0 0 520 ${st.length*46+10}" style="width:100%">`; st.forEach(r=>{ s+=`<rect x="10" y="${y}" width="500" height="36" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="20" y="${y+16}" font-size="12" font-weight="700" fill="var(--ink)">${r[0]}</text><text x="20" y="${y+30}" font-size="10.5" fill="var(--ink2)">${r[1]}</text><text x="500" y="${y+23}" text-anchor="end" font-size="13" font-family="var(--mono)" fill="var(--ink)">${r[2]}</text>`; y+=46; });
    m.querySelector('#sp').innerHTML=s+'</svg>';
    m.querySelector('#rf').innerHTML=`<table class="kv small"><tr><th>Z₀ coax</th><td class="mono">75 Ω</td></tr><tr><th>Γ at far end</th><td class="mono">${p.gL.toFixed(3)} (RL ${p.rl>=79?'∞':p.rl.toFixed(1)+' dB'})</td></tr><tr><th>Γ looking back into the IMP</th><td class="mono">${p.gS.toFixed(3)} ${D.bypass?'(bare 110 Ω driver)':inf('≈30 dB RL')}</td></tr><tr><th>Echo at receiver</th><td class="mono">${(p.echo*100).toFixed(1)} % after ${SIM.fmtDur(2*p.tau)}</td></tr><tr><th>Round trip in half-cells</th><td class="mono">${(2*p.tau/UI).toFixed(1)} UI</td></tr></table>`;
    m.querySelector('#tbl').innerHTML=`<table class="kv"><tr><th>Load</th><th>Γ</th><th>Return loss</th><th>Received</th><th>Verdict</th></tr>${Object.keys(TERMS).map(k=>{ const s0=D.term; D.term=k; const z=path(); D.term=s0; return `<tr><td>${TERMS[k].l}</td><td class="mono">${z.gL.toFixed(3)}</td><td class="mono">${z.rl>=79?'∞':z.rl.toFixed(1)+' dB'}</td><td class="mono">${z.vRx.toFixed(3)} Vpp</td><td>${z.ok?'OK':'out of spec'}</td></tr>`; }).join('')}</table>`; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — why this folder is tagged #PROBLEM', `<ol>
   <li><b>IMP-20.DWG is not a drawing.</b> Both <span class="mono">IMP-20.DWG</span> and the byte-identical <span class="mono">IMP-20/IMP-20.DWG</span> start “;Tango-PCB PLUS V2.02 Series II”. They are an ASCII PCB file (16.21 × 13.585 in, 512 parts) renamed .DWG, so AutoCAD and the sidecar tools treat them as broken drawings. That alone explains much of the “#PROBLEM” tag.</li>
   <li><b>One schematic page for three boards.</b> IMP-XFR.DSN names IMP-20BNC.PCB, IMP-20TB.PCB and IMP-20XLR.PCB and draws only channels 1, 5, 16 and 20. The 512-part Tango file is the panelised result: 100 transformers, 100 BNCs, 80 WECO 3-pole blocks and 12 XLRs.</li>
   <li><b>Missing sub-folders.</b> The README lists <span class="mono">NEW-BNC MOUNT/</span>, <span class="mono">SILK/</span> and <span class="mono">IMP-12/</span>; none exist now. “Impxx/NEW BNC MOUNT” survives only as FOLDER: text in the IMPM20 and IMPM23 title blocks. The 2013 drawings call for silkscreens IMP12013-M1-SILK, IMP162013-SILK, IMP202013-SILK and #IMPA03 that are not in the archive.</li>
   <li><b>Three generations of panels.</b> 1997 IMPPNLLT layouts (IMP-12M/F, IMP-20, IMP-20A), 2000–2012 revisions (IMPM01-1 “WAS .312X.500 APR.26/2000”, “WAS .450X.500”, IMPM20 “DIMENSION WAS 2.367”, “.150 DIA. HOLE WAS .130”), and a 2013 redraw set by D.A. (IMP162013, IMP202013, IMP402013, IMP12013 tube). BNC pitch went from 0.800 (IMP-20) to 0.825 (2013), XLR pitch from 1.200 / 1.350 to 1.040.</li>
   <li><b>Green to black.</b> IMPM06 ISS 3 notes “FINISH WAS 361C GREEN” for the ident extrusion, changed to textured WBS black.</li>
   <li><b>Label sheets, not artwork.</b> IMP1F.CDR and IMP1M.CDR repeat the same label (“IMPEDANCE TRANSFORMER IMP-1F/IMP-1M, 110, 75”) 18 times: a sticker sheet for the tubes. IMP1.CDR, IMP1A.CDR and ABB1.CDR are CorelDRAW 3 files whose only readable text is filler (“4444@LXdp”, “ddd”). ABB1.CDR belongs to the ABB-1 product, which recommends the IMP-1M.</li>
   <li><b>Files misfiled elsewhere.</b> The AMS8E plugin found IMP-16A / IMP202013 Altium files in an AMS8E-1 folder, so the 2013 board design is outside this folder.</li>
   <li><b>No electrical values.</b> No transformer part number, turns ratio, pad resistor values or test report survives. The level and return-loss figures in this model are therefore ${inf('')}: √(110/75) turns ratio, −10.4 dB pad, ≈30 dB transformer return loss, RG-59-class coax.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>JP3 per channel = pad in/out ${inf('IMP-XFR part names only')}.</li><li>Coax: 0.66 c, 2.2 dB/100 m at 6 MHz, single-pole HF roll-off ${inf('typical RG-59')}.</li><li>AES3 data are pseudo-random; preambles X/Y/Z follow AES3 ${inf('AES3 standard, not in archive')}.</li><li>IMP-40 Phoenix row position ${inf('IMP402013-M1 hole table')}; IMP-20 Phoenix block centres estimated from their mounting holes.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>IMPXX - #Engineering #PROBLEM/: README.md, IMP-XFR.DSN, TNN.DSN, IMP-20.DWG, IMP-20/IMP-20.DWG, IMP1F.CDR, IMP1M.CDR, Backup_of_Imp20b.cdr, Backup_of_imp12ss.cdr</li><li>…/MECHANICAL/: IMPPNLLT.DWG, IMP12013-M1, IMP162013-M1/M2/M3, IMP202013-M1/M2, IMP402013-M1/M2, IMPM01-1, IMPM04-EM, IMPM06, IMPM16, IMPM20, IMPM23, IMPI-M1, IMP1-M5</li><li>assets: impxx-imp12m.svg, impxx-imp12f.svg, impxx-imp12bnc.svg, impxx-imp20tb.svg, impxx-imp20bnc.svg, impxx-imp20a.svg</li></ul>`);
}

SIM.register({
  id:'impxx', product:'IMPXX', name:'IMPxx · IMP impedance-matching transformers and panels (1997|30)', year:1997,
  family:'Obsolete products', folder:'IMPXX - #Engineering #PROBLEM',
  summary:'Passive AES3 impedance-matching transformers: one transformer per channel converts 110 Ω balanced (XLR or Phoenix) to 75 Ω unbalanced BNC (AES3id). Made as the IMP-1M/1F in-line tube and as 12- and 20-channel rack panels, redrawn in 2013.',
  highlights:['Eight panel variants drawn from IMPPNLLT and the 2013 drawings','Plug and unplug each channel','AES3 bit cells, reflections and eye over cable length','Return loss for every load','Why the folder is #PROBLEM'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 half-cell (163 ns)',period:()=>UI},{label:'1 AES frame (20.8 µs)',period:()=>FRAME},{label:'1 block (4 ms)',period:()=>BLOCK},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (whole second)'],[0.01,'10 ms'],[BLOCK,'1 block (4 ms)'],[FRAME*4,'4 frames'],[FRAME,'1 frame (20.8 µs)'],[UI*24,'24 half-cells (bits)']],
  defaultZoom:0,
  init(){ EK=''; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: patching an IMP',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Signal path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
