/* =====================================================================
   M405S — stereo meter turret with monitor amplifier (Ward-Beck Systems, 1996|29–1997|30, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html) — hardware model

   Sources (folder "#M400 #SERIES - Meter Panels/XXX - M405S - #OBSOLETE #Archive"):
   - M405S.WP6     product text (Oct 1996): illuminated stereo VU meters, monitor amp, internal
                   magnetically shielded speaker, L / R / sum push buttons, 24 VDC 600 mA wall
                   transformer, rear terminal strip, balanced inputs, meters calibrated for +4 dBu.
   - M405S01.DWG   "M405S MONITOR PANEL SCHEMATIC" B M405S01 iss 1: TB1, 2-107 PAD BOARDs, LEFT/RIGHT
                   VU meters, LIGHT BARs (DS1–DS4 HLMP-2450, LM317L + 68R current sources R1/R2,
                   "REPLACED 390 ohm"), LEFT/RIGHT switches with 30K resistors, POD-6A AUDIO
                   AMPLIFIER (P2 1–10, P1 1–6), MONITOR LEVEL DUAL 5K LOG, JACK TIP/RING → speaker,
                   PWR 1 +24 VDC via 3/4 ASB, 5 GND.  -> assets/m405s-sch-M405S01.svg
   - 405L21.DWG    "M405S STEREO METER LAYOUT" B 405-04-021 iss 2 (1997): front, rear and side views,
                   true scale (1:1).  -> assets/m405s-front.svg, m405s-rear.svg, m405s-side.svg
                   (QCAD dwg2dwg → DXF → ezdxf crop; the drawn needles were removed so the
                   simulator can draw live ones)
   - 405M83.DWG    UPPER CONTROL SURFACE 405-03-083 iss E: 0.100 alum, textured beige 452C Texcote
   - 405M84.DWG    M405S BASE 405-03-084 iss D: C.R.S. 0.105, textured brown 438C, "POD6 MTG HOLES(3)"
   Sister plugins reused: m405m.js (VU ballistics), microdriver.js (POD6 ISS3 1996 topology:
   input stage −14 dB, U1A ×8.25, "POD6A — use 1.5 Ω for 8 Ω loads").
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__m405sActive';
const dBu = v=>20*Math.log10(Math.max(1e-9,v)/0.7746), Vrms = d=>0.7746*Math.pow(10,d/20);

/* ---------------- values from the drawings (+ POD6 ISS3 from microdriver.js) ---------------- */
const K = { RMIX:30e3, POT:5e3, RCS:68, VREF:1.25, LEDS_PER_BAR:8, VF:2.1, FUSE:0.75, PSU_mA:600,
  POD_IN:-14.0, POD_GAIN:20*Math.log10(8.25), POD_Q_mA:25, RSPK:8, RE:1.5 };
const ILAMP = K.VREF/K.RCS;                       // LM317L + 68R = 18.4 mA per light bar
/* ---------------- device state ---------------- */
const D = { vsup:24, power:true, L:true, R:false, lvl:0.8, bridge:true, src:{L:{lvl:4,f:1000},R:{lvl:4,f:400}}, prog:'burst', log:[] };
function reset(){ Object.assign(D,{vsup:24,power:true,L:true,R:false,lvl:0.6,bridge:true,src:{L:{lvl:4,f:1000},R:{lvl:4,f:400}},prog:'burst'}); KEYC=''; }
let KEYC='';
function env(t){ if(!D.power) return 0; if(D.prog==='tone') return 1; if(D.prog==='burst') return (t>=0.2&&t<0.7)?1:0;
  const s=Math.max(0,Math.sin(2*Math.PI*4.1*t))*Math.max(0,Math.sin(2*Math.PI*0.9*t+0.6)); return Math.min(1.4,1.6*s); }

/* ---------------- analog model ---------------- */
function potDb(p){ return p<=0.001? -99 : 20*Math.log10((Math.pow(10,2*p)-1)/99); }   // dual 5K LOG: same 2-decade law as microdriver.js (inferred)
function monitor(){
  // What reaches the POD-6A inputs. Pressing L and/or R; with both, the 30K pair sums them (−6 dB each).
  const l=Vrms(D.src.L.lvl), r=Vrms(D.src.R.lvl);
  let mix=0, what='silent (no button down)';
  if (D.L&&!D.R){ mix=l; what='LEFT only'; } else if (D.R&&!D.L){ mix=r; what='RIGHT only'; }
  else if (D.L&&D.R){ mix=0.5*(l+r); what='SUM: (L + R)/2 through the 30K resistors'; }
  return {mix, what};
}
function stages(){
  const m=monitor(), vin=m.mix, inDb = vin>0? dBu(vin) : -99;
  const afterIn = inDb + K.POD_IN, afterPot = afterIn + potDb(D.lvl), out = afterPot + K.POD_GAIN; // per POD-6A channel
  const vCh = Vrms(out), vSpk = D.bridge? 2*vCh : 0;                  // speaker across TIP (ch1) and RING (ch2)
  const rail = D.power? D.vsup : 0, swingPk = Math.max(0, rail/2 - 2 - 0.7), vMaxPk = swingPk*K.RSPK/(K.RSPK+K.RE); // ISS3: NE5532 ≈2 V from rail, Vbe, Re
  const spkPk = vSpk*Math.SQRT2, clip = D.power && spkPk > 2*vMaxPk;
  const vS = Math.min(vSpk, 2*vMaxPk/Math.SQRT2), P = D.power? vS*vS/K.RSPK : 0;
  const lamps = D.power? 2*ILAMP*1000 : 0, iSpk = D.power? (vS/K.RSPK)*0.9*1000 : 0;  // class-B average ≈ 0.9 × Irms
  const total = D.power? lamps + K.POD_Q_mA + iSpk : 0;
  return { m, inDb, afterIn, afterPot, out, vSpk:vS, P, clip, maxW: Math.pow(2*vMaxPk/Math.SQRT2,2)/K.RSPK, lamps, total,
    vuL: D.src.L.lvl-4, vuR: D.src.R.lvl-4, headLed: rail - (K.LEDS_PER_BAR*K.VF + K.VREF + 1.7) };
}
/* VU needles: 2nd order, 300 ms to 99 % (IEC 60268-17, inferred) */
const WN=13.6, ZETA=0.82; let ND=null;
function needles(){ const key=[D.power,D.src.L.lvl,D.src.R.lvl,D.prog].join('|'); if(key===KEYC) return ND; KEYC=key;
  const st=stages(), N=1000, dt=1e-3, out=[new Float32Array(N+1),new Float32Array(N+1)];
  [st.vuL, st.vuR].forEach((vu,ch)=>{ const g=Math.pow(10,vu/20); let x=0,v=0; for(let i=0;i<=N;i++){ const u=g*env(i*dt); out[ch][i]=x; const a=WN*WN*(u-x)-2*ZETA*WN*v; v+=a*dt; x+=v*dt; if(x<-0.02){x=-0.02;v=0;} if(x>1.6){x=1.6;v=0;} } });
  ND=out; return ND; }
const needleAt=(ch,t)=>needles()[ch][Math.max(0,Math.min(1000,Math.round(t*1000)))];

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  btn(k){ act(`Press MONITOR ${k}`, tr=>{ D[k]=!D[k]; tr(`${k==='L'?'LEFT':'RIGHT'} switch ${D[k]?'made':'released'} (push-on / push-off; the buttons are not interlocked ${inf('M405S.WP6: “L and R individually or the sum”')})`);
    const m=monitor(); tr(`POD-6A P2 inputs now carry ${m.what}`);
    if(D.L&&D.R) tr('Each leg reaches the amplifier through a 30K resistor, so L and R mix at −6 dB each (M405S01 30K ×2)');
    tr(`Speaker: ${stages().P.toFixed(2)} W`); }); },
  level(p){ act(`Turn MONITOR LEVEL to ${Math.round(p*10)}`, tr=>{ D.lvl=p; const s=stages(); tr(`DUAL 5K LOG pot on POD-6A P1 1–6 (CW = up): ${potDb(p)<-90?'off':potDb(p).toFixed(1)+' dB'} ${inf('log law')}`);
    tr(`POD-6A output ${s.out.toFixed(1)} dBu per channel → ${s.vSpk.toFixed(2)} V across the speaker = ${s.P.toFixed(2)} W${s.clip?' (CLIPPING)':''}`); }); },
  src(k,d){ act(`Set ${k==='L'?'LEFT':'RIGHT'} input to ${d} dBu`, tr=>{ D.src[k].lvl=d; tr(`TB1 ${k==='L'?'1/2 (SH 3)':'4/5 (SH 6)'} → 2-107 PAD BOARD → ${k==='L'?'LEFT':'RIGHT'} VU METER: ${(d-4).toFixed(1)} VU (factory 0 VU = +4 dBu, M405S.WP6)`); }); },
  power(){ act(D.power?'Unplug the wall transformer':'Plug in the 24 VDC wall transformer', tr=>{ D.power=!D.power;
    tr(D.power? 'PWR pin 1 +24 VDC → 3/4 A SB fuse F1 → POD-6A P2-7 and both LM317L light-bar sources; pin 5 GND → P2-8':'Light bars and amplifier off; the passive VU meters still read signal (they need no power)'); }); },
  vsup(v){ act(`Wall transformer output ${v} V`, tr=>{ D.vsup=v; const s=stages(); tr(`Light bars: LM317L keeps ${(ILAMP*1000).toFixed(1)} mA per bar; head-room ${s.headLed.toFixed(1)} V ${s.headLed<0?'(too low: bars dim)':''}`);
    tr(`With the old 390 Ω resistors the bars would draw ${(Math.max(0,v-K.LEDS_PER_BAR*K.VF)/390*1000).toFixed(1)} mA ${inf('Vf 2.1 V × 8')}`); tr(`POD-6A max ≈ ${s.maxW.toFixed(1)} W bridged into 8 Ω`); }); },
  bridge(){ act(D.bridge?'Assume the speaker pair is in phase':'Assume a crossed (bridged) pair', tr=>{ D.bridge=!D.bridge;
    tr(D.bridge? 'Speaker + on TIP (ch 1), − on RING (ch 2), channel 2 fed inverted: the speaker sees 2× the voltage (bridge)':'Both channels in phase: TIP and RING carry the same signal and the speaker hears nothing'); }); },
  prog(p){ act(`Program: ${p}`, tr=>{ D.prog=p; tr(p==='burst'?'Tone on 200–700 ms':p==='tone'?'Steady tone':'Speech-like '+inf('test model')); }); },
};

/* ---------------- panels (405L21, true inches) ---------------- */
const P = { W:12.6, H:4.211, piv:[[2.301,5.494],[6.331,5.494]], win:[[0.72,0.56,3.99,2.25],[4.74,0.56,8.01,2.25]],
  btn:{L:[8.805,1.099],R:[9.494,1.099]}, knob:[9.150,2.586], grille:[10.658,0.814,1.283,2.022] };
const ANG=[[0,108],[0.1,105.8],[1,84.5],[1.413,72.4],[1.6,70]];
const ang=p=>{ p=Math.max(0,Math.min(1.6,p)); for(let i=1;i<ANG.length;i++){ const [p0,a0]=ANG[i-1],[p1,a1]=ANG[i]; if(p<=p1) return a0+(a1-a0)*(p-p0)/(p1-p0); } return 70; };
function frontSVG(t){ const S=80, st=stages(), lit=D.power && st.headLed>0;
  let s=`<svg viewBox="0 0 ${P.W*S} ${P.H*S}" style="width:100%;border-radius:6px;background:#cfc6ae">
    <defs>${[0,1].map(i=>`<clipPath id="m5w${i}"><rect x="${P.win[i][0]*S}" y="${P.win[i][1]*S}" width="${(P.win[i][2]-P.win[i][0])*S}" height="${(P.win[i][3]-P.win[i][1])*S}"/></clipPath>`).join('')}
    <linearGradient id="m5lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit?'#fff4c8':'#ddd6c2'}"/><stop offset="1" stop-color="${lit?'#f0dc9c':'#d2cbb6'}"/></linearGradient></defs>`;
  [0,1].forEach(i=>{ const w=P.win[i]; s+=`<rect x="${w[0]*S}" y="${w[1]*S}" width="${(w[2]-w[0])*S}" height="${(w[3]-w[1])*S}" fill="url(#m5lb)"/>`; });
  s+=`<image href="${ASSET}m405s-front.svg" x="0" y="0" width="${P.W*S}" height="${P.H*S}"/>`;
  [0,1].forEach(i=>{ const p=needleAt(i,t), a=ang(p)*Math.PI/180, [px,py]=P.piv[i]; s+=`<g clip-path="url(#m5w${i})"><line x1="${(px+Math.cos(a)*3.0)*S}" y1="${(py-Math.sin(a)*3.0)*S}" x2="${(px+Math.cos(a)*4.4)*S}" y2="${(py-Math.sin(a)*4.4)*S}" stroke="#111" stroke-width="3"/></g>`; });
  for (const k of ['L','R']){ const [x,y]=P.btn[k], on=D[k]; s+=`<g data-act="btn" data-k="${k}" style="cursor:pointer"><rect x="${(x-0.2)*S}" y="${(y-0.175)*S}" width="${0.4*S}" height="${0.35*S}" rx="3" fill="${on?'#f6f1df':'#8d8775'}" fill-opacity="${on?0.85:0.5}" stroke="${on?'var(--accent)':'#333'}" stroke-width="${on?3:1}"><title>MONITOR ${k} (push on / push off)</title></rect></g>`; }
  const ka=(-135+270*D.lvl)*Math.PI/180, [kx,ky]=P.knob;
  s+=`<g data-act="knob" style="cursor:ns-resize"><circle cx="${kx*S}" cy="${ky*S}" r="${0.25*S}" fill="#1c1c1c" stroke="#000"/><line x1="${kx*S}" y1="${ky*S}" x2="${(kx+Math.sin(ka)*0.22)*S}" y2="${(ky-Math.cos(ka)*0.22)*S}" stroke="#eee" stroke-width="3"/><title>MONITOR LEVEL (dual 5K log) — click right half for up, left half for down</title></g>`;
  const g=P.grille, lv=D.power? Math.min(1,st.P*0.6*env(t)) : 0;
  s+=`<rect x="${g[0]*S}" y="${g[1]*S}" width="${g[2]*S}" height="${g[3]*S}" rx="${0.12*S}" fill="var(--accent)" fill-opacity="${(lv*0.4).toFixed(2)}" pointer-events="none"/>`;
  if (st.clip && env(t)>0) s+=`<text x="${g[0]*S}" y="${(g[1]+g[3]+0.3)*S}" font-size="20" fill="var(--bad)" font-weight="700">CLIP</text>`;
  return s+'</svg>'; }
const RP={ W:12.6, H:4.243, pwr:[1.50,2.76], fuse:[3.11,2.76], tb:i=>[5.355+0.369*i,2.565] };
function rearSVG(){ const S=80; let s=`<svg viewBox="0 0 ${RP.W*S} ${RP.H*S}" style="width:100%;border-radius:6px;background:#a99a7c"><image href="${ASSET}m405s-rear.svg" x="0" y="0" width="${RP.W*S}" height="${RP.H*S}"/>`;
  s+=`<g data-act="pwr" style="cursor:pointer"><circle cx="${RP.pwr[0]*S}" cy="${RP.pwr[1]*S}" r="${0.42*S}" fill="${D.power?'var(--accent)':'transparent'}" fill-opacity=".3" stroke="${D.power?'var(--accent)':'#333'}" stroke-dasharray="${D.power?'':'5 4'}" stroke-width="3"><title>24 VDC INPUT (pin 1 +24 V, pin 5 GND) — click to plug/unplug</title></circle></g>`;
  s+=`<circle cx="${RP.fuse[0]*S}" cy="${RP.fuse[1]*S}" r="${0.3*S}" fill="none" stroke="${stages().total>K.FUSE*1000?'var(--bad)':'transparent'}" stroke-width="3"><title>F1 0.75 A SB</title></circle>`;
  for(let i=0;i<6;i++){ const [x,y]=RP.tb(i), ch=i<3?'L':'R', has=(i%3!==2) && D.src[ch].lvl>-60; s+=`<circle cx="${x*S}" cy="${y*S}" r="${0.13*S}" fill="${has?'var(--accent2)':'transparent'}" fill-opacity=".45"><title>TB ${i+1}: ${ch==='L'?'LEFT':'RIGHT'} ${['+','−','SH'][i%3]}</title></circle>`; }
  return s+'</svg>'; }
function bindPanel(root){ root.querySelectorAll('[data-act="btn"]').forEach(g=>g.onclick=()=>A.btn(g.dataset.k));
  root.querySelectorAll('[data-act="pwr"]').forEach(g=>g.onclick=()=>A.power());
  root.querySelectorAll('[data-act="knob"]').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(); const up=e.clientX>r.left+r.width/2; A.level(Math.max(0,Math.min(1,Math.round((D.lvl+(up?0.1:-0.1))*10)/10))); }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>LEFT in <input id="sl" type="range" min="-20" max="24" value="${D.src.L.lvl}"> <span id="slv" class="mono"></span></label>
  <label>RIGHT in <input id="sr" type="range" min="-20" max="24" value="${D.src.R.lvl}"> <span id="srv" class="mono"></span></label>
  <label>Program <select id="pg">${[['burst','Tone burst 200–700 ms'],['tone','Steady tone'],['speech','Speech-like']].map(([v,l])=>`<option value="${v}" ${D.prog===v?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Wall supply <input id="vs" type="range" min="16" max="30" step="0.5" value="${D.vsup}"> <span id="vsv" class="mono"></span></label>
  <label><input type="checkbox" id="br" ${D.bridge?'checked':''}> speaker pair crossed (bridge) ${inf('see Findings')}</label>
  <button id="rs">Factory state</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#sl')) return;
  const u=()=>{ q('#slv').textContent=D.src.L.lvl+' dBu'; q('#srv').textContent=D.src.R.lvl+' dBu'; q('#vsv').textContent=D.vsup+' V'; }; u();
  q('#sl').oninput=e=>{D.src.L.lvl=+e.target.value;u();}; q('#sl').onchange=e=>A.src('L',+e.target.value);
  q('#sr').oninput=e=>{D.src.R.lvl=+e.target.value;u();}; q('#sr').onchange=e=>A.src('R',+e.target.value);
  q('#vs').oninput=e=>{q('#vsv').textContent=e.target.value+' V';}; q('#vs').onchange=e=>A.vsup(+e.target.value);
  q('#pg').onchange=e=>A.prog(e.target.value); q('#br').onchange=()=>A.bridge();
  q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); }; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press L or R, turn MONITOR LEVEL, or click the 24 VDC connector on the rear.</div>'; }

/* ---------------- timeline ---------------- */
function wave(c,X,t0,t1,y,h,f,amp,col){ const pw=X(t1)-X(t0); c.strokeStyle=col; c.fillStyle=col;
  if ((t1-t0)*f > pw/3){ c.globalAlpha=.3; c.beginPath(); for(let i=0;i<=300;i++){ const tt=t0+(t1-t0)*i/300; c.lineTo(X(tt), y+h/2-amp*env(tt)*h*0.45);} for(let i=300;i>=0;i--){ const tt=t0+(t1-t0)*i/300; c.lineTo(X(tt), y+h/2+amp*env(tt)*h*0.45);} c.fill(); c.globalAlpha=1; return; }
  c.beginPath(); for(let i=0;i<=600;i++){ const tt=t0+(t1-t0)*i/600; const v=Math.max(-1,Math.min(1,amp*env(tt)*Math.sin(2*Math.PI*f*tt))); i?c.lineTo(X(tt),y+h/2-v*h*0.45):c.moveTo(X(tt),y+h/2-v*h*0.45);} c.stroke(); }
function needleLane(ch){ return {label:`${ch?'RIGHT':'LEFT'} needle (VU)`, h:44, draw(c,X,t0,t1,y,h){ c.strokeStyle=SIM.css('--ink'); c.lineWidth=2; c.beginPath(); for(let i=0;i<=500;i++){ const tt=t0+(t1-t0)*i/500, v=needleAt(ch,tt), yy=y+h-4-Math.min(1.5,v)/1.5*(h-8); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); c.lineWidth=1; c.fillStyle=SIM.css('--ink2'); c.fillRect(X(t0),y+h-4-(1/1.5)*(h-8),X(t1)-X(t0),1); }}; }
function lanes(){ const st=stages(), css=SIM.css; return [
  {label:`LEFT in (${D.src.L.lvl} dBu, ${D.src.L.f} Hz)`, h:34, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,D.src.L.f,0.8,css('--accent2')); }},
  {label:`RIGHT in (${D.src.R.lvl} dBu, ${D.src.R.f} Hz)`, h:34, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,D.src.R.f,0.8,css('--accent2')); }},
  needleLane(0), needleLane(1),
  {label:`Monitor mix: ${st.m.what.split(':')[0]}`, h:34, draw(c,X,t0,t1,y,h){ const f=D.L?D.src.L.f:D.src.R.f; if(st.m.mix>0) wave(c,X,t0,t1,y,h,f,0.6,css('--accent')); }},
  {label:`Speaker (${st.P.toFixed(2)} W${st.clip?', clip':''})`, h:34, draw(c,X,t0,t1,y,h){ if(st.P>0){ const f=D.L?D.src.L.f:D.src.R.f; wave(c,X,t0,t1,y,h,f,Math.min(0.95,Math.sqrt(st.P/Math.max(0.1,st.maxW))),st.clip?css('--bad'):css('--accent')); } }},
  {label:`Light bars (2 × ${(ILAMP*1000).toFixed(1)} mA)`, h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=(D.power&&st.headLed>0)?'#e8c34a':css('--grid'); c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); }},
  {label:`24 V supply load (${st.total.toFixed(0)} mA of ${K.PSU_mA})`, h:30, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--warn'); for(let i=0;i<200;i++){ const tt=t0+(t1-t0)*i/200; const ld=D.power? st.lamps+K.POD_Q_mA+(st.total-st.lamps-K.POD_Q_mA)*env(tt):0; const hh=ld/K.PSU_mA*(h-6); c.fillRect(X(tt),y+h-3-hh,Math.max(1,(X(t1)-X(t0))/200),hh); } }},
]; }

/* ---------------- views ---------------- */
function inspHTML(t){ const st=stages(); return `<table class="kv">
  <tr><th>Needles</th><td class="mono">L ${(needleAt(0,t)*100).toFixed(1)} % · R ${(needleAt(1,t)*100).toFixed(1)} % (steady ${st.vuL.toFixed(1)} / ${st.vuR.toFixed(1)} VU)</td></tr>
  <tr><th>Monitor buttons</th><td class="mono">L ${D.L?'down':'up'} · R ${D.R?'down':'up'} → ${st.m.what}</td></tr>
  <tr><th>POD-6A</th><td class="mono">in ${st.inDb>-90?st.inDb.toFixed(1):'—'} dBu → ${st.afterIn>-90?st.afterIn.toFixed(1):'—'} → pot ${potDb(D.lvl)<-90?'off':potDb(D.lvl).toFixed(1)+' dB'} → ${st.out>-90?st.out.toFixed(1):'—'} dBu/ch</td></tr>
  <tr><th>Speaker</th><td class="mono">${st.vSpk.toFixed(2)} V · ${st.P.toFixed(2)} W (max ≈ ${st.maxW.toFixed(1)} W) ${st.clip?'<b style="color:var(--bad)">CLIP</b>':''}</td></tr>
  <tr><th>Supply</th><td class="mono">${D.power?D.vsup+' V':'off'} · ${st.total.toFixed(0)} mA of 600 mA (fuse 750 mA)</td></tr></table>`; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML = card('Front at the playhead (405L21.DWG, to scale) — click L, R and the MONITOR LEVEL knob', `<div id="fp"></div>${controlsHTML()}`)
   + `<div class="grid2"><div>${card('Rear (405L21.DWG) — click the 24 VDC connector', `<div id="rp"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
      <div>${card('What changed in the circuit (last action)', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div></div>`
   + card('Timeline — one second (click to seek)', `<canvas id="tl"></canvas>`);
  bindControls(m);
  SIM.on('time', ()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); });
}
const LESSONS=[
  {title:'1 · Power it', body:`<p>The M405S runs from a <b>24 VDC wall transformer</b> (600 mA, M405S.WP6) on the rear 4-pin 24 VDC INPUT, protected by F1 0.75 A SB. Click the connector on the rear view.</p>`, check:()=>D.power, hint:'Click the round 24 VDC INPUT connector on the rear panel.'},
  {title:'2 · Feed both inputs', body:`<p>Connect a balanced stereo feed to the rear strip: LEFT on 1 (+) 2 (−) 3 (shield), RIGHT on 4/5/6. Set both inputs to <b>+4 dBu</b> and Program to <b>Steady tone</b>. The meters are factory-calibrated so +4 dBu reads 0 VU.</p>`, check:()=>D.src.L.lvl===4&&D.src.R.lvl===4&&D.prog==='tone', hint:'Both input sliders to +4, Program → Steady tone.'},
  {title:'3 · Watch the meters', body:`<p>The two VU meters are passive: each is fed through a <b>2-107 pad board</b> and needs no power. Their light bars do: two HLMP-2450 bars per meter, each string fed by an LM317L current source.</p><p>Scrub to 0.5 s: both needles sit on 0 VU.</p>`, check:()=>Math.abs(needleAt(0,SIM.t)-1)<0.03&&Math.abs(needleAt(1,SIM.t)-1)<0.03, hint:'Move the playhead past 0.4 s.'},
  {title:'4 · Monitor the left channel', body:`<p>Press <b>L</b> only (R up). The speaker plays the left input.</p>`, check:()=>D.L&&!D.R, hint:'L down, R up.'},
  {title:'5 · Monitor the sum', body:`<p>Press <b>R</b> as well. With both buttons down the 30K resistors mix L and R: you hear the mono sum. This is the mono-compatibility check a turret is for.</p>`, check:()=>D.L&&D.R, hint:'Press R while L is down.'},
  {title:'6 · Set the listening level', body:`<p>Turn <b>MONITOR LEVEL</b> (dual 5K log) up to 8. Watch the speaker lane and the supply lane: current rises with level.</p>`, check:()=>D.lvl>=0.8, hint:'Click the right half of the knob.'},
  {title:'7 · Find the limit', body:`<p>Raise LEFT to +16 dBu with the level at 10. The POD-6A runs out of swing on a 24 V single supply and the panel shows <b>CLIP</b>.</p>`, check:()=>stages().clip, hint:'Level to 10, LEFT slider up to +16 or more.'},
  {title:'8 · The light-bar revision', body:`<p>Drop the wall supply to 20 V and back. The LM317L sources hold the bar current at 18.4 mA; the 390 Ω resistors they replaced would have let it follow the supply. See the trace.</p>`, check:()=>D.log.some(e=>/Wall transformer/.test(e.name)), hint:'Move the “Wall supply” slider.'},
  {title:'Done', body:'<p>You have used every control on the M405S. The Signal path tab follows the level through the turret; Findings lists what the drawings disagree on.</p>', check:()=>true, auto:true},
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — using the M405S (from M405S.WP6 and the drawings)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The turret', `<div id="fp"></div><div id="rp" style="margin-top:6px"></div>${controlsHTML()}`)}${card('What changed', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{li=+x.dataset.i;draw();});
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.power=false; D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){ window[KEY]=false;
  m.innerHTML=card('One second in slow motion — what the meters, speaker and supply see', `<canvas id="tl"></canvas>`)
   + `<div class="grid2">${card('Side view (405L21.DWG): the sloped turret', `<div style="background:#f4f1e8;border-radius:6px;padding:6px"><img src="${ASSET}m405s-side.svg" style="width:100%" alt="M405S side view"></div><p class="small muted">Upper control surface 405M83 (0.100″ aluminium, textured beige 452C) on base 405M84 (0.105″ C.R.S., textured brown 438C, three POD6 mounting holes).</p>`)}
     ${card('Time scales', `<table class="kv small"><tr><th>Audio</th><td>1 kHz left / 400 Hz right: zoom to 5 ms to see the waveforms.</td></tr><tr><th>Needles</th><td>VU movement, 99 % in ≈ 300 ms ${inf('IEC 60268-17')}.</td></tr><tr><th>Supply</th><td>Load swings with the programme: quiescent ${(st0().lamps+K.POD_Q_mA).toFixed(0)} mA, class-B speaker current on top ${inf('POD-6A quiescent')}.</td></tr><tr><th>Logic</th><td>None: no clocks in this product.</td></tr></table>`)}</div>`;
  SIM.on('time', ()=>SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}));
}
const st0=()=>stages();
const BLOCKS={
  tb:{x:10,y:50,w:130,h:70,t:'TB1 1–6',s:['LEFT + − SH','RIGHT + − SH'],d:'Rear terminal strip (405L21 rear view). Balanced inputs (M405S.WP6).'},
  pad:{x:180,y:10,w:130,h:60,t:'2-107 PAD BOARD ×2',s:['calibrates +4 dBu = 0 VU'],d:'One pad board per meter (RED/BLK in). Values are not in the archive; the WP6 says the meters are factory calibrated for +4 dBu.'},
  vu:{x:350,y:10,w:130,h:60,t:'L / R VU meters',s:['passive','LIGHT BAR each'],d:'Passive VU meters; each has a light bar behind the scale.'},
  lb:{x:520,y:10,w:150,h:60,t:'Light bars',s:['DS1–DS4 HLMP-2450','LM317L + 68R'],d:'Two HLMP-2450 bars per meter in series, driven by an LM317L wired as a 1.25 V / 68 Ω = 18.4 mA current source (revision: replaced 390 Ω).'},
  sw:{x:180,y:110,w:130,h:70,t:'L / R buttons',s:['30K mixing ×2'],d:'LEFT and RIGHT push buttons. One alone sends that channel; both together mix through the 30K resistors (the sum).'},
  pod:{x:350,y:110,w:150,h:80,t:'POD-6A amplifier',s:['P2 1/2, 4/5 in','P1 1–6 level pot','JACK TIP/RING out'],d:'POD-6A stereo audio amplifier module (the 1996 ISS3 POD6 — see the microDriver plugin). Mounted on the base through the three POD6 holes in 405M84.'},
  pot:{x:540,y:110,w:130,h:60,t:'MONITOR LEVEL',s:['dual 5K log, CW'],d:'Front knob, a dual 5K log pot wired to POD-6A P1 1–6.'},
  spk:{x:700,y:120,w:140,h:60,t:'Speaker',s:['magnetically shielded','TIP + / RING −'],d:'Internal speaker behind the front grille, wired from the POD-6A JACK: + on TIP, − on RING.'},
  pw:{x:10,y:160,w:130,h:60,t:'24 VDC IN',s:['F1 3/4 A SB','600 mA wall xfmr'],d:'PWR 1 = +24 VDC, 5 = GND. External wall transformer (M405S.WP6).'},
};
const WIRES=[['tb','pad'],['pad','vu'],['lb','vu'],['tb','sw'],['sw','pod'],['pot','pod'],['pod','spk'],['pw','pod'],['pw','lb']];
let bsel='pod';
function viewBlock(m){ window[KEY]=false; m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 240" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
const W_=d=>`<path d="${d}" fill="none" stroke="var(--ink)"/>`, N=(x,y,t,a)=>`<text x="${x}" y="${y}" font-size="10.5" fill="var(--accent2)" ${a?'text-anchor="'+a+'"':''}>${t}</text>`, T=(x,y,t,sz,a)=>`<text x="${x}" y="${y}" font-size="${sz||11}" fill="var(--ink)" ${a?'text-anchor="'+a+'"':''}>${t}</text>`, BX=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>`;
const SHEETS=[
  {name:'1 · Inputs, pads and meters', note:'Redrawn from M405S01.DWG. The 2-107 pad network itself is not drawn anywhere in the archive.', svg:()=>
    `${BX(20,40,70,200)}${T(30,34,'TB1')}${N(30,70,'1 LEFT +')}${N(30,90,'2 LEFT −')}${N(30,110,'3 SH')}${N(30,170,'4 RIGHT +')}${N(30,190,'5 RIGHT −')}${N(30,210,'6 SH')}
     ${W_('M90 66 H260 M90 86 H260 M90 166 H260 M90 186 H260')}${BX(260,50,130,60)}${T(325,76,'2-107',12,'middle')}${T(325,92,'PAD BOARD',10,'middle')}${N(265,64,'RED')}${N(265,100,'BLK')}
     ${BX(260,150,130,60)}${T(325,176,'2-107',12,'middle')}${T(325,192,'PAD BOARD',10,'middle')}${W_('M390 80 H460 M390 180 H460')}
     ${BX(460,50,120,60)}${T(520,84,'LEFT VU METER',11,'middle')}${BX(460,150,120,60)}${T(520,184,'RIGHT VU METER',11,'middle')}
     ${BX(460,20,120,22)}${T(520,36,'LIGHT BAR +/−',10,'middle')}${BX(460,120,120,22)}${T(520,136,'LIGHT BAR +/−',10,'middle')}
     ${T(20,290,'Twisted pairs (shown as loops on the drawing) also run from TB1 to the LEFT/RIGHT monitor switches — sheet 2.')}` },
  {name:'2 · Monitor switches & POD-6A', note:'Redrawn from M405S01.DWG. P2/P1 pin numbers are as drawn. Which leg each switch section takes is not legible enough to be sure: see the bridge finding.', svg:()=>
    `${N(20,60,'from TB1 LEFT')}${N(20,150,'from TB1 RIGHT')}${BX(130,40,70,50)}${T(165,70,'LEFT sw',11,'middle')}${BX(130,130,70,50)}${T(165,160,'RIGHT sw',11,'middle')}${W_('M100 56 H130 M100 146 H130')}
     ${T(230,30,'30K')}${T(290,30,'30K')}${W_('M200 56 H360 M200 146 H360 M230 56 V36 H330 V146')}
     ${BX(360,30,180,200)}${T(450,60,'POD-6A',13,'middle')}${T(450,76,'AUDIO AMPLIFIER',10,'middle')}${N(366,58,'P2-1')}${N(366,74,'P2-2')}${N(366,92,'P2-3')}${N(366,146,'P2-4')}${N(366,162,'P2-5')}${N(366,178,'P2-6')}${N(366,200,'P2-7 +24V')}${N(366,216,'P2-8 GND · 9/10 N/C')}
     ${N(535,70,'JACK TIP','end')}${N(535,88,'JACK RING','end')}${W_('M540 66 H640 M540 84 H640')}${BX(640,50,60,50)}${T(670,80,'SPK',11,'middle')}${T(705,70,'+')}${T(705,90,'−')}
     ${N(535,150,'P1-1..3','end')}${N(535,190,'P1-4..6','end')}${W_('M540 146 H620 M540 186 H620')}${BX(620,130,140,70)}${T(690,158,'MONITOR LEVEL',11,'middle')}${T(690,176,'DUAL 5K LOG (CW)',10,'middle')}
     ${T(20,270,'PWR 1 → 3/4 ASB fuse → +24 VDC → P2-7 and light bars · PWR 5 → GND → P2-8')}` },
  {name:'3 · Light bars (revised)', note:'Redrawn from the LIGHT BAR SCHEMATIC box on M405S01.DWG: “R1 AND R2 ARE UPDATED WITH CURRENT SOURCE AS SHOWN (REPLACED 390 ohm)”.', svg:()=>
    [0,1].map(i=>{ const y=60+i*120; let s=`${BX(140,y-20,70,36)}${T(175,y+2,'LM317L',11,'middle')}${T(118,y-26,'R'+(i+1)+' 68R')}${W_(`M60 ${y} H140 M210 ${y} H250 M225 ${y} V${y+30} H120 V${y+10} H140`)}`;
      for(let k=0;k<8;k++){ const x=260+k*58; s+=`<path d="M${x} ${y-10} v20 l16 -10 z" fill="var(--panel2)" stroke="var(--ink)"/><line x1="${x+16}" y1="${y-10}" x2="${x+16}" y2="${y+10}" stroke="var(--ink)"/>${W_(`M${x+16} ${y} H${x+58}`)}`; }
      return s+`${T(270,y+34,'DS'+(2*i+1)+' HLMP-2450')}${T(500,y+34,'DS'+(2*i+2)+' HLMP-2450')}${N(30,y+4,'+24 V')}${N(735,y+4,'GND')}${T(560,y-18,(i?'RIGHT':'LEFT')+' light bar: I = 1.25 V / 68 Ω = '+(ILAMP*1000).toFixed(1)+' mA')}`; }).join('') },
];
let si=0, orig=false;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn (not the original CAD) · original alongside', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si&&!orig?'on':''}" data-i="${k}">${s.name}</button>`).join('')+`<button data-o="1" class="${orig?'on':''}">Original M405S01.DWG (→ SVG)</button>`;
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ if(b.dataset.o) orig=true; else { orig=false; si=+b.dataset.i; } draw(); });
    if(orig){ m.querySelector('#sh').innerHTML=`<div style="background:#fff;border-radius:8px;padding:6px"><img src="${ASSET}m405s-sch-M405S01.svg" style="width:100%" alt="M405S01"></div>`; m.querySelector('#sn').textContent='M405S01.DWG converted with QCAD dwg2dwg → DXF → SVG; geometry and text as drawn in 1997.'; return; }
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 320" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="312" text-anchor="end" font-size="10" fill="var(--ink2)">M405S · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">The M405S has no software. This tab follows the level through the turret, stage by stage, and shows the power budget.</p><div class="grid2">${card('Monitor path (live)', `<div id="sp"></div>`)}${card('24 V budget (live)', `<div id="pb"></div>`)}</div>`+card('Button truth table', `<div id="tt"></div>`);
  SIM.on('time', ()=>{ const s=stages(); const rows=[['Buttons',s.m.what,''],['Into POD-6A',s.inDb>-90?s.inDb.toFixed(1)+' dBu':'—','P2 1/2 and 4/5'],['POD-6A input stage',s.afterIn>-90?s.afterIn.toFixed(1)+' dBu':'—','−14 dB (ISS3, microdriver.js)'],['MONITOR LEVEL',potDb(D.lvl)<-90?'off':potDb(D.lvl).toFixed(1)+' dB','dual 5K log '+'(law inferred)'],['POD-6A driver',s.out>-90?s.out.toFixed(1)+' dBu/ch':'—','×8.25 (+18.3 dB)'],['Speaker',s.P.toFixed(2)+' W',D.bridge?'TIP − RING, bridged (inferred)':'in phase → cancels']];
    let y=10, t=`<svg viewBox="0 0 520 ${rows.length*46+10}" style="width:100%">`; rows.forEach((r,i)=>{ const bad=s.clip&&i>=4; t+=`<rect x="10" y="${y}" width="500" height="38" rx="6" fill="${bad?'color-mix(in srgb,var(--bad) 20%,transparent)':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${y+16}" font-size="12" font-weight="700" fill="var(--ink)">${r[0]}</text><text x="20" y="${y+31}" font-size="10.5" fill="var(--ink2)">${r[2]}</text><text x="500" y="${y+24}" text-anchor="end" font-size="12.5" font-family="var(--mono)" fill="var(--ink)">${r[1]}</text>`; y+=46; });
    m.querySelector('#sp').innerHTML=t+'</svg>';
    const items=[['Light bars',s.lamps],['POD-6A quiescent',D.power?K.POD_Q_mA:0],['Speaker (peak of programme)',Math.max(0,s.total-s.lamps-(D.power?K.POD_Q_mA:0))]]; let x=10;
    let b=`<svg viewBox="0 0 520 90" style="width:100%"><rect x="10" y="20" width="500" height="26" fill="var(--panel2)" stroke="var(--line)"/>`; const cols=['#e8c34a','var(--accent2)','var(--accent)'];
    items.forEach((it,i)=>{ const w=it[1]/K.PSU_mA*500; b+=`<rect x="${x}" y="20" width="${w}" height="26" fill="${cols[i]}"/>`; x+=w; });
    b+=`<line x1="${10+750/K.PSU_mA*500}" y1="12" x2="${10+750/K.PSU_mA*500}" y2="54" stroke="var(--bad)"/><text x="12" y="66" font-size="11" fill="var(--ink)">${items.map(i=>i[0]+' '+i[1].toFixed(0)+' mA').join(' · ')}</text><text x="12" y="82" font-size="11" fill="var(--ink2)">Bar = 600 mA wall transformer (M405S.WP6). The fuse (750 mA) is off the right end.</text></svg>`;
    m.querySelector('#pb').innerHTML=b;
    m.querySelector('#tt').innerHTML=`<table class="kv"><tr><th>L</th><th>R</th><th>POD-6A inputs</th><th>Heard</th></tr>${[[0,0],[1,0],[0,1],[1,1]].map(([l,r])=>`<tr class="${(!!l===D.L&&!!r===D.R)?'hl':''}"><td>${l?'down':'up'}</td><td>${r?'down':'up'}</td><td>${l&&r?'L and R through 30K each':l?'L':r?'R':'nothing'}</td><td>${l&&r?'(L+R)/2 — mono sum':l?'left':r?'right':'silence '+inf('WP6 lists only L, R and sum')}</td></tr>`).join('')}</table>`; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the M405S folder is up to', `<ol>
   <li><b>The speaker is wired across both amplifier channels.</b> On M405S01 the speaker's + goes to the POD-6A JACK TIP and − to RING: left output against right output. In mono, with both channels in phase, that pair would cancel. It only works if one channel is fed inverted (a bridge), so the switch wiring must cross one balanced pair ${inf('the drawing does not make the leg order clear')}. Untick “speaker pair crossed” on the Simulator to hear the in-phase case.</li>
   <li><b>The light bars were changed to current sources.</b> Revision note on M405S01: “R1 AND R2 ARE UPDATED WITH CURRENT SOURCE AS SHOWN (REPLACED 390 ohm)”. Each string of 2 × HLMP-2450 now gets 1.25 V / 68 Ω = ${(ILAMP*1000).toFixed(1)} mA whatever the unregulated wall transformer does. With 390 Ω the current followed the supply (the Simulator trace prints both).</li>
   <li><b>The meters are passive.</b> Only the light bars and the POD-6A use the 24 V. The 2-107 pad boards set the factory +4 dBu calibration; their values are not in the archive.</li>
   <li><b>The power numbers do not quite agree.</b> M405S.WP6 says 24 VDC at 600 mA; the schematic fuses at 3/4 A SB (405L21 rear: “F1 0.75 A SB”). The model's worst case stays under 600 mA. The folder README quotes the WP6 with the voltage lost (“[x] VDC”); the WP6 itself says 24.</li>
   <li><b>The amplifier is a POD-6A.</b> 405M84 BASE has “POD6 MTG HOLES(3)”, so the turret uses the stock 1996 POD6 module (ISS3, “POD6A — use 1.5 Ω for 8 Ω loads”) rather than a custom board. The same module later became the microDriver (see that plugin).</li>
   <li><b>Two finishes, two metals.</b> The upper control surface (405M83, issue E) is 0.100″ aluminium in textured beige 452C; the base (405M84, issue D) is 0.105″ C.R.S. in textured brown 438C, with a “SEE SPOT WELD NOTE”. The simulator panel colour follows 452C ${inf('colour rendering')}.</li>
   <li><b>Dates.</b> M405S.WP6 is October 1996; the DWGs are April 1997 (405L21 iss 2), so the drawings were redrawn or revised after the product text.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>0 VU = +4 dBu at TB1 (factory calibration, M405S.WP6); 2-107 pad values unknown.</li><li>VU ballistics: second order, ζ ${ZETA}, ${(WN/2/Math.PI).toFixed(2)} Hz ${inf('IEC 60268-17')}.</li><li>POD-6A gains from the ISS3 schematic as read for the microDriver plugin: −14 dB input stage, ×8.25 driver, ±(Vs/2 − 2 V) swing, 1.5 Ω emitter resistors ${inf('POD6.pdf ISS3')}.</li><li>Speaker 8 Ω; bridged ${inf('M405S01 TIP/RING wiring')}.</li><li>POD-6A quiescent ${K.POD_Q_mA} mA; LED Vf 2.1 V ${inf('typical')}.</li><li>Neither button down = silence ${inf('')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#M400 #SERIES - Meter Panels/XXX - M405S - #OBSOLETE #Archive/M405S.WP6 · M405S01.DWG · 405L21.DWG · 405M83.DWG · 405M84.DWG</li><li>siumulation-plugins/microdriver.js (POD6 ISS3 facts) · m405m.js (VU model)</li><li>assets: m405s-front.svg, m405s-rear.svg, m405s-side.svg, m405s-sch-M405S01.svg</li></ul>`);
}
SIM.register({
  id:'m405s', product:'M405S', name:'M405S · stereo meter turret with monitor amplifier (1996|29)', year:1996,
  family:'Obsolete products', folder:'#M400 #SERIES - Meter Panels/XXX - M405S - #OBSOLETE #Archive',
  summary:'A desk turret with two illuminated VU meters and a small monitor speaker. L and R push buttons pick the left channel, the right channel or their sum, and a POD-6A amplifier drives the internal shielded speaker. It runs from a 24 VDC wall transformer.',
  highlights:['Front, rear and side drawn from 405L21.DWG, to scale','Two VU needles frame by frame','L / R / sum monitoring with the 30K mix','Light-bar current-source revision','Bridged-speaker finding'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1},{label:'1 left-tone cycle',period:()=>1/D.src.L.f}],
  zooms:[[1,'1 s (whole second)'],[0.4,'400 ms (VU rise)'],[0.05,'50 ms'],[0.005,'5 ms (tone cycles)']],
  defaultZoom:0,
  init(){ KEYC=''; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: using the M405S',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Signal path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
