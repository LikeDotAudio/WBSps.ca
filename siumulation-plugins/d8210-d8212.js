/* =====================================================================
   D8210 & D8212 — MF8210 / MF8212 distribution-amplifier frames (Ward-Beck, 2016|49 masters)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (#MF8200 #SERIES/…):
   - D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/8212-020-SILK (CURVE) .cdr (Artwork 2026|59: CorelDRAW → SVG)
       (front door silk, NOV.09/15) → assets/d8210-d8212-door.svg
   - …/MF8212RM2-SILK(CURVE).pdf (JUN.22/16) and MF8212RM2-SILK (CURVE).pdf (NOV.06/15)
       (rear power cover) → assets/d8210-d8212-rm2.svg, d8210-d8212-rm2-2015.svg (.cdr sources)
   - …/PICS/8212-020.jpg, MF8212RM2.jpg, 82-077.jpg  (ink and panel colours, PSU door)
   - D8210 & D8212 - #Mechanical #DA #2016/*.dwg  (part list, finishes, "CUT .063 ALUMINUM PANEL 17.060 LONG",
       "13 PITCHES OF … 0.12 X 1.00 OBLONG", "(MF82REF CONFIGURATION)", "RH SIDE PLATE VENTED")
   - MF8212 Frame - #Master #MF82/MF8212 BOM Costed.xlsx, MF8212BP BOM Costed.xlsx  (frame and backplane BOMs, 2013|46)
   - MFXX (DA FRAME)…/MF8212 - #Engineering/MF8212-3.DSN, mf-ref.DSN  (frame wiring: AES REF BUS, VIDEO REFERENCE,
       BNC REF, 75R 1%, ±22 V; MF-REF: CS8412, EL2099, LM7805, LM7915, CON20)
   - 8200 Series Rear Module options graphical Guides…/*.pdf  (card ↔ rear module, "*MF8210 only")
   - D8204MAN.WPD, M8202MAN.pdf  (card currents: D8204 +20 V 47 mA / −20 V 37 mA; M8202 ±20 V 85 mA)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const ART = '#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- catalogue (rear-module guide + manuals) ---------------- */
const CARDS = {
  D8204:{mods:['BNC1','BNC3'], ip:47, in:37, src:'D8204MAN.WPD', ref:false, kind:'AES DA'},
  D8204A:{mods:['BNC2','BNC4'], ip:60, in:50, ref:false, kind:'AES DA + D/A'},
  D8204C:{mods:['TB8201AP'], ip:60, in:50, ref:false, kind:'110 Ω AES DA + D/A'},
  D8205:{mods:['BNC1','BNC3'], ip:250, in:120, ref:true, kind:'AES level DA / SRC'},
  D8206:{mods:['BNC1','BNC3'], ip:250, in:120, ref:true, kind:'DARS tone generator'},
  D8207:{mods:['BNC1','BNC3'], ip:250, in:120, ref:true, kind:'AES SRC'},
  D8208:{mods:['BNC1','BNC3'], ip:250, in:120, ref:false, kind:'AES gain DA'},
  M8202:{mods:['TB8202'], ip:85, in:85, src:'M8202MAN.pdf', ref:false, kind:'analog DA, remote sens.'},
  M8204:{mods:['TB8204P','TB8204P/600'], ip:90, in:90, ref:false, kind:'dual analog DA'},
  M8205:{mods:['TB8205P'], ip:90, in:90, ref:false, kind:'mono 1×8 analog DA'},
};
const MOD_MF8210_ONLY = ['BNC3','BNC4'];
const FRAMES = { MF8212:{slots:12, pitch:1.0, name:'MF8212 (MF82/12)'}, MF8210:{slots:10, pitch:1.26, name:'MF8210 (MF82/10)'} };
const K = { RAIL:22, PSU_MAX:1.0, MAINS:60, C_PER_W:0.9, AMB:25, REF_FS:48000 };   // ±22 V from MF8212-3.DSN; PSU capacity, thermal coefficient, mains 60 Hz (Canada) inferred

/* ---------------- state ---------------- */
const D = { frame:'MF8212', slots:[], ps:[true,true], door:'closed', ground:true, ref:'aes', refTerm:true, refOut:false, rm2:'2016', psFailAt:null, log:[] };
function initSlots(){ D.slots=Array.from({length:FRAMES[D.frame].slots},()=>({card:null,mod:null})); }
function reset(){ Object.assign(D,{frame:'MF8212',ps:[true,true],door:'closed',ground:true,ref:'aes',refTerm:true,refOut:false,rm2:'2016',psFailAt:null}); initSlots(); D.slots[0]={card:'D8204',mod:'BNC1'}; D.slots[1]={card:'D8206',mod:'BNC1'}; D.slots[2]={card:'M8202',mod:'TB8202'}; }
reset();

/* ---------------- model ---------------- */
function load(){ let ip=0, iN=0, n=0; D.slots.forEach(s=>{ if(s.card){ ip+=CARDS[s.card].ip; iN+=CARDS[s.card].in; n++; } }); return {ip:ip/1000, iN:iN/1000, n}; }
function psOnAt(k,t){ if(!D.ps[k]) return false; if(k===0 && D.psFailAt!==null && t>=D.psFailAt) return false; return true; }
function powerAt(t){ const L=load(); const on=[psOnAt(0,t),psOnAt(1,t)]; const nOn=on.filter(Boolean).length; const per=nOn? Math.max(L.ip,L.iN)/nOn : 0;
  return { L, on, nOn, per, ok:nOn>0 && per<=K.PSU_MAX, watts:K.RAIL*(L.ip+L.iN) }; }
function tempRise(){ const p=powerAt(SIM.t); return p.watts*K.C_PER_W*(D.door==='open'?0.8:1); }
function fitProblem(i){ const s=D.slots[i]; if(!s.card) return s.mod?'rear module with no card':null; if(!s.mod) return 'no rear module: card has no connections';
  if(!CARDS[s.card].mods.includes(s.mod)) return `${s.mod} is not a ${s.card} rear module (guide lists ${CARDS[s.card].mods.join(' / ')})`;
  if(MOD_MF8210_ONLY.includes(s.mod) && D.frame!=='MF8210') return `${s.mod} is “*MF8210 only”`; return null; }
function refAt(t){ if(D.ref==='none') return null; const lvl = D.refTerm && D.refOut ? 0.5 : D.refTerm||D.refOut ? 1 : 2; return {kind:D.ref, lvl}; }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>50) D.log.length=50; SIM.refresh(); }
let pick='D8204';
const A = {
  slot(i){ act(`Slot ${i+1}: ${D.slots[i].card?'remove '+D.slots[i].card:'insert '+pick}`, tr=>{ const s=D.slots[i];
    if (s.card){ tr(`Pull ${s.card} by its handle (8205-004); the 30-way EDAC 307-030 edge socket on the MF8212BP backplane opens`); s.card=null; s.mod=null; return; }
    s.card=pick; s.mod=CARDS[pick].mods.find(m=>!MOD_MF8210_ONLY.includes(m)||D.frame==='MF8210')||CARDS[pick].mods[0];
    tr(`Slide ${pick} into the EDAC 616-220-306 9″ guides, pins 1 and A at the top, handle text reading top to bottom (manual)`);
    tr(`Fit ${s.mod} on the rear housing directly behind it; its 20-way CON20 socket mates with the backplane SSW-120 strip`);
    const P=powerAt(SIM.t); tr(`Frame load now +${(P.L.ip*1000).toFixed(0)} mA / −${(P.L.iN*1000).toFixed(0)} mA on ±${K.RAIL} V; ${P.nOn} PSU(s) share it`);
    const f=fitProblem(i); if(f) tr('⚠ '+f); }); },
  mod(i){ act(`Slot ${i+1}: change rear module`, tr=>{ const s=D.slots[i]; if(!s.card){ tr('No card in this slot'); return; } const opts=CARDS[s.card].mods; s.mod=opts[(opts.indexOf(s.mod)+1)%opts.length]; tr(`${s.card} now on ${s.mod}`); const f=fitProblem(i); tr(f?'⚠ '+f:'Fits'); }); },
  frame(v){ act('Frame: '+FRAMES[v].name, tr=>{ const old=D.slots; D.frame=v; initSlots(); old.forEach((s,i)=>{ if(i<D.slots.length) D.slots[i]=s; }); tr(`${FRAMES[v].slots} slots. Rear housing ${v}RM1 ${'(MF82REF configuration)'}`); if(old.length>D.slots.length) tr('Cards in slots 11–12 dropped (MF8210 has 10)'); }); },
  ps(k){ act(`${D.ps[k]?'Unplug':'Plug in'} AC cord PS${k+1}`, tr=>{ D.ps[k]=!D.ps[k]; D.psFailAt=null; tr(`IEC inlet/fuseholder 723W-X2/02 with 2 A 5×20 mm fuse (BOM) → PS${k+1}`); const P=powerAt(SIM.t); tr(P.nOn? `${P.nOn} supply running; each carries ${(P.per*1000).toFixed(0)} mA of the ±22 V load`:'Frame is dead: both supplies off'); tr('PS1/PS2 lamps on the 82-077 power-supply door follow each supply'); }); },
  fail(){ act('PS1 fails at the playhead', tr=>{ D.ps=[true,true]; D.psFailAt=SIM.t; tr('PS1 output collapses; the redundant PS2 takes the whole load (“redundant power supplies”, manual cover)'); tr(`PS2 now ${(powerAt(1).per*1000).toFixed(0)} mA per rail — ${powerAt(1).ok?'within':'OVER'} the ${K.PSU_MAX} A ${'(inferred)'} rating`); }); },
  door(){ act((D.door==='open'?'Close':'Open')+' the front door', tr=>{ D.door=D.door==='open'?'closed':'open'; tr('8212-020 door pivots on its bottom hinge holes and latches with the 7-03-209 nylon latch (spring plate 82-009-1)'); }); },
  ref(v){ act('Frame reference: '+v, tr=>{ D.ref=v; tr(v==='none'?'Nothing on REF IN':`REF IN BNC (rear power cover) → ${v==='aes'?'AES REF BUS':'VIDEO REFERENCE'} to every slot (MF8212-3.DSN)`); }); },
  refTerm(){ act('REF termination '+(D.refTerm?'off':'on'), tr=>{ D.refTerm=!D.refTerm; tr('75R 1% termination on the frame reference line (MF8212-3.DSN)'); tr(D.refTerm&&D.refOut?'Double-terminated: loop goes to a terminated device AND this frame terminates — level halves':'OK'); }); },
  refOut(){ act((D.refOut?'Remove':'Connect')+' REF OUT loop cable', tr=>{ D.refOut=!D.refOut; tr('REF OUT loops the reference to the next frame; terminate only at the last one'); }); },
  rm2(){ act('Show rear cover artwork '+(D.rm2==='2016'?'NOV.06/15':'JUN.22/16'), tr=>{ D.rm2=D.rm2==='2016'?'2015':'2016'; tr(D.rm2==='2016'?'2016 artwork: REF IN left, REF OUT right; cut-outs drawn':'2015 artwork (matches the photo): REF OUT left, REF IN right'); }); },
  reset(){ act('Start over', tr=>{ reset(); tr('MF8212, both supplies on, three example cards'); }); },
};

/* ---------------- drawings ---------------- */
// Front at 200 px/in (silk scale). Door 8212-020: 17.060″ × ≈3.42″ (photo aspect 3929:788) → 3412 × 684 px.
function frontSVG(t){
  const P=powerAt(t), W=3412, H=684, F=FRAMES[D.frame];
  let s=`<svg viewBox="-260 -40 ${W+520} ${H+80}" style="width:100%;border-radius:6px"><defs><filter id="fg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect x="-250" y="-30" width="${W+500}" height="${H+60}" rx="10" fill="#141516" stroke="#000"/>
   <rect x="-230" y="40" width="60" height="110" rx="30" fill="#000"/><rect x="${W+170}" y="40" width="60" height="110" rx="30" fill="#000"/><rect x="-230" y="${H-150}" width="60" height="110" rx="30" fill="#000"/><rect x="${W+170}" y="${H-150}" width="60" height="110" rx="30" fill="#000"/>`;
  if (D.door==='open'){
    const pw=F.pitch*200, x0=60;
    s+=`<rect x="0" y="0" width="${W}" height="${H-150}" fill="#0c0d0e"/>`;
    D.slots.forEach((sl,i)=>{ const x=x0+i*pw, prob=fitProblem(i); s+=`<g class="fslot" data-i="${i}" style="cursor:pointer"><title>Slot ${i+1}: ${sl.card?sl.card+' on '+sl.mod+(prob?' — '+prob:''):'empty — click to insert '+pick}</title><rect x="${x+4}" y="10" width="${pw-8}" height="${H-170}" fill="${sl.card?(prob?'#5a2a24':'#1b5e33'):'#1a1c1e'}" stroke="#333"/>`;
      if (sl.card){ const on=P.ok; s+=`<circle cx="${x+pw/2}" cy="70" r="14" fill="${on?'#7dff6a':'#223'}" ${on?'filter="url(#fg)"':''}/><rect x="${x+pw*0.22}" y="${H-330}" width="${pw*0.56}" height="140" rx="12" fill="#c9c9c2"/><text x="${x+pw/2}" y="${H-260}" font-size="34" text-anchor="middle" fill="#222" transform="rotate(90 ${x+pw/2} ${H-260})">${sl.card}</text>`; }
      s+=`<text x="${x+pw/2}" y="${H-120}" font-size="34" text-anchor="middle" fill="#888">${i+1}</text></g>`; });
    const px=x0+F.slots*F.pitch*200+40;
    { const cw=W-px-20, ch=H-170, k=Math.min(cw/438, ch/274), iw=438*k, ih=274*k, ix=px+(cw-iw)/2, iy=10+(ch-ih)/2, lamp=(fx,n)=>{ const on=psOnAt(n,t); return `<circle cx="${ix+fx*iw}" cy="${iy+0.266*ih}" r="${Math.max(9,0.02*iw)}" fill="${on?'#ffe48a':'#333'}" ${on?'filter="url(#fg)"':''}/>`; };
    s+=`<g><title>Power-supply compartment: door 82-077 (real silk 82-077-SILK (DOOR CURVE).cdr, JUN.21/16 — 14 vent slots, PS1/PS2 lamps)</title><rect x="${px}" y="10" width="${cw}" height="${ch}" fill="#141516" stroke="#333"/><image href="${ASSET}d8210-d8212-psdoor.svg" x="${ix}" y="${iy}" width="${iw}" height="${ih}"/>${lamp(0.1575,0)}${lamp(0.590,1)}</g>`; }
    s+=`<g class="fdoor" style="cursor:pointer"><title>Front door, folded down — click to close</title><rect x="0" y="${H-150}" width="${W}" height="150" fill="#1d1f21" stroke="#000"/><image href="${ASSET}d8210-d8212-door.svg" x="0" y="${H-150}" width="652" height="149"/></g>`;
  } else {
    s+=`<g class="fdoor" style="cursor:pointer"><title>8212-020 DA door — click to open</title><rect x="0" y="0" width="${W}" height="${H}" fill="#1d1f21" stroke="#000"/><rect x="0" y="${H-150}" width="${W}" height="6" fill="#2b2d30"/>
      <image href="${ASSET}d8210-d8212-door.svg" x="0" y="${H-149}" width="652" height="149"/><text x="${W/2}" y="${H/2-30}" font-size="40" text-anchor="middle" fill="#666">click to open the door</text></g>`;
  }
  return s+`</svg><div class="small muted">Front: CorelDRAW door silk ${SIM.src(ART+'8212-020-SILK (CURVE) .cdr','8212-020-SILK (CURVE) .cdr')} (NOV.09/15, vector; green ink per ${SIM.src(ART+'PICS/8212-020.jpg','PICS/8212-020.jpg')}); PSU door ${SIM.src(ART+'82-077-SILK (DOOR CURVE).cdr','82-077-SILK (DOOR CURVE).cdr')} (JUN.21/16, white ink on black per ${SIM.src(ART+'PICS/82-077.jpg','PICS/82-077.jpg')}) on a 17.060″ door. Slot pitch ${F.pitch.toFixed(3)}″ (MF8210: 82-074/82-071 “9 PITCHES OF 1.260 = 11.340”; MF8212: MF8212RM1 ISS.2 in MF8210RM1 LAYOUT “11 PITCHES @ 1.000 TYP.”). The slot/PSU layout behind the door is ${'inferred'} from the BOM (12 card guides pairs, 82-072 PSU box) and the manual photo.</div>`;
}
// Rear power cover MF8212RM2 at 200 dpi: 831 × 662 px. Drill points read off the artwork.
function rearSVG(t){
  const img = D.rm2==='2016'? 'd8210-d8212-rm2.svg' : 'd8210-d8212-rm2-2015.svg';
  const refInX = D.rm2==='2016'? 420 : 570, refOutX = D.rm2==='2016'? 570 : 420;
  const bnc=(x,cls,lbl,on)=>`<g class="${cls}" style="cursor:pointer"><title>${lbl}</title><circle cx="${x}" cy="487" r="44" fill="#c8cbce" stroke="#777" stroke-width="3"/><circle cx="${x}" cy="487" r="24" fill="#222"/><circle cx="${x}" cy="487" r="8" fill="${on?'var(--accent2)':'#555'}"/>${on?`<rect x="${x-16}" y="400" width="32" height="40" fill="#333"/>`:''}</g>`;
  const iec=(y,k)=>`<g class="fps" data-k="${k}" style="cursor:pointer"><title>PS${k+1} AC inlet with fuse — click to plug/unplug</title><rect x="43" y="${y}" width="216" height="248" rx="8" fill="#111" stroke="#666"/><rect x="83" y="${y+30}" width="136" height="100" rx="10" fill="#1d1d1d" stroke="#555"/><rect x="113" y="${y+60}" width="14" height="36" fill="#999"/><rect x="175" y="${y+60}" width="14" height="36" fill="#999"/><rect x="144" y="${y+45}" width="14" height="30" fill="#999"/>${D.ps[k]?`<rect x="70" y="${y+20}" width="162" height="120" rx="14" fill="#2a2a2a" stroke="#000" opacity=".95"/><text x="151" y="${y+90}" text-anchor="middle" font-size="26" fill="#aaa">cord</text>`:''}<rect x="93" y="${y+160}" width="116" height="60" fill="#262626" stroke="#555"/><text x="151" y="${y+197}" text-anchor="middle" font-size="20" fill="#888">2 A</text></g>`;
  return `<svg viewBox="0 0 831 662" style="width:100%;max-width:520px;border-radius:6px"><rect width="831" height="662" fill="#141516"/><rect x="669" y="567" width="162" height="95" fill="var(--panel)"/>
    ${iec(47,0)}${iec(365,1)}
    <g><title>Binding posts: green (functional earth) and black (chassis) — Johnson 111-0104 / 111-0103 (BOM)</title><circle cx="318" cy="95" r="26" fill="#2fa34a" stroke="#0a3"/><circle cx="318" cy="245" r="26" fill="#222" stroke="#666"/></g>
    <image href="${ASSET}${img}" width="831" height="662"/>
    ${bnc(refInX,'fref','REF IN — click to cycle AES / video / none',D.ref!=='none')}${bnc(refOutX,'frefo','REF OUT — click to loop to the next frame',D.refOut)}
  </svg><div class="small muted">Rear power cover: CorelDRAW silk ${D.rm2==='2016'?SIM.src(ART+'MF8212RM2-SILK(CURVE).cdr','MF8212RM2-SILK(CURVE).cdr'):SIM.src(ART+'MF8212RM2-SILK (CURVE).cdr','MF8212RM2-SILK (CURVE).cdr')} (${D.rm2==='2016'?'JUN.22/16':'NOV.06/15'}, vector), white ink per ${SIM.src(ART+'PICS/MF8212RM2.jpg','PICS/MF8212RM2.jpg')}; the drawing's black mechanical outline (cut-outs, holes) is kept as dark lines. <a href="#" class="frm2">Swap to the ${D.rm2==='2016'?'NOV.06/15':'JUN.22/16'} artwork</a> — the two issues swap REF IN and REF OUT.</div>`;
}
function rearModsSVG(){
  const F=FRAMES[D.frame], pw=F.pitch*40; let s=`<svg viewBox="0 0 ${F.slots*pw+20} 150" style="width:100%">`;
  D.slots.forEach((sl,i)=>{ const x=10+i*pw, prob=fitProblem(i); s+=`<g class="fmod" data-i="${i}" style="cursor:pointer"><title>Rear position ${i+1}: ${sl.mod||'blank'}${prob?' — '+prob:''} (click to change module)</title><rect x="${x+2}" y="10" width="${pw-4}" height="110" fill="${!sl.mod?'#1a1c1e':prob?'#6b2a22':'#2a2d30'}" stroke="#555"/>`;
    if (sl.mod){ const bn=sl.mod.startsWith('BNC'); const n= sl.mod==='BNC3'?10:sl.mod==='BNC1'?7:sl.mod==='BNC2'||sl.mod==='BNC4'?5:0; for(let k=0;k<n;k++) s+=`<circle cx="${x+pw/2+(k%2?6:-6)}" cy="${20+k*9.5}" r="4" fill="#bbb"/>`; if(!bn) for(let k=0;k<12;k++) s+=`<rect x="${x+pw/2-6}" y="${16+k*8}" width="12" height="6" fill="#2b8a3e"/>`; s+=`<text x="${x+pw/2}" y="136" font-size="9" text-anchor="middle" fill="var(--ink)">${sl.mod}</text>`; }
    s+=`<text x="${x+pw/2}" y="148" font-size="8" text-anchor="middle" fill="var(--ink2)">${i+1}</text></g>`; });
  return s+`</svg><div class="small muted">Rear housing ${D.frame}RM1 (“MF82REF configuration”), seen from behind (slot 1 is on the right in reality ${'inferred'}). Red = the module doesn't fit this card or frame.</div>`;
}
function bindPanel(m){
  m.querySelectorAll('.fslot').forEach(g=>g.onclick=()=>A.slot(+g.dataset.i));
  m.querySelectorAll('.fmod').forEach(g=>g.onclick=()=>A.mod(+g.dataset.i));
  m.querySelectorAll('.fdoor').forEach(g=>g.onclick=()=>A.door());
  m.querySelectorAll('.fps').forEach(g=>g.onclick=()=>A.ps(+g.dataset.k));
  m.querySelectorAll('.fref').forEach(g=>g.onclick=()=>A.ref(D.ref==='aes'?'video':D.ref==='video'?'none':'aes'));
  m.querySelectorAll('.frefo').forEach(g=>g.onclick=()=>A.refOut());
  m.querySelectorAll('.frm2').forEach(a=>a.onclick=e=>{ e.preventDefault(); A.rm2(); });
}
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Frame <select id="ff">${Object.keys(FRAMES).map(k=>`<option value="${k}" ${k===D.frame?'selected':''}>${FRAMES[k].name}</option>`).join('')}</select></label>
  <label>Card to insert <select id="fc">${Object.keys(CARDS).map(k=>`<option ${k===pick?'selected':''}>${k}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="ft" ${D.refTerm?'checked':''}> REF 75 Ω termination</label>
  <button id="fd">${D.door==='open'?'Close':'Open'} door</button><button id="fx">PS1 fails here</button><button id="fr">Start over</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#ff')) return; q('#ff').onchange=e=>A.frame(e.target.value); q('#fc').onchange=e=>{pick=e.target.value;}; q('#ft').onchange=()=>A.refTerm(); q('#fd').onclick=()=>A.door(); q('#fx').onclick=()=>A.fail(); q('#fr').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function stateBar(c,X,t0,t1,y,h,f,onC,offC,onL,offL){ const N=300; let prev=null,xs=X(t0); for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=f(t); if(prev===null){prev=v;continue;} if(v!==prev||i===N){ const xe=X(t); c.fillStyle=prev?onC:offC; c.globalAlpha=.55; c.fillRect(xs,y+4,xe-xs,h-8); c.globalAlpha=1; if(xe-xs>70){c.fillStyle=SIM.css('--ink');c.font='10px sans-serif';c.fillText(prev?onL:offL,xs+4,y+h/2+3);} xs=xe; prev=v; } } }
function lanes(){ const css=SIM.css; return [
  {label:'AC mains (60 Hz)',h:40,draw(c,X,t0,t1,y,h){ [0,1].forEach(k=>{ c.strokeStyle=k?css('--accent2'):css('--accent'); c.beginPath(); for(let i=0;i<=400;i++){ const t=t0+(t1-t0)*i/400; const v=psOnAt(k,t)?Math.sin(2*Math.PI*K.MAINS*t):0; const yy=y+h/2-v*h*0.4+(k?2:-2); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }); }},
  {label:'Rectifier charge pulses (120 Hz)',h:22,draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/(2*K.MAINS),0.25/K.MAINS-0.0012,0.0024,css('--warn'),'charging peaks'); }},
  {label:'PS1 / PS2 running',h:22,draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>psOnAt(0,t)&&psOnAt(1,t),css('--accent'),css('--warn'),'both share the load','one supply carries it'); }},
  {label:'±22 V bus OK',h:22,draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>powerAt(t).ok,css('--accent'),css('--bad'),'cards powered','OVERLOAD / dead'); }},
  {label:'Reference bus',h:22,draw(c,X,t0,t1,y,h){ const r=refAt(0); if(!r){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no reference on REF IN',X(t0)+6,y+h/2+4); return; } if(r.kind==='aes') SIM.pulses(c,X,t0,t1,y,h,1/K.REF_FS,0,0.5/K.REF_FS,css('--accent2'),'AES ref frames (48 kHz)'); else SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,0.0006,css('--accent2'),'video fields (59.94)'); }},
];}

/* ---------------- views ---------------- */
function inspector(t){ const P=powerAt(t), r=refAt(t), n=D.slots.filter(s=>s.card).length, probs=D.slots.map((s,i)=>fitProblem(i)?`slot ${i+1}: ${fitProblem(i)}`:null).filter(Boolean);
  return `<table class="kv"><tr><th>Frame</th><td class="mono">${FRAMES[D.frame].name} · ${n}/${D.slots.length} slots used · door ${D.door}</td></tr>
   <tr><th>Load</th><td class="mono">+${(P.L.ip*1000).toFixed(0)} mA / −${(P.L.iN*1000).toFixed(0)} mA at ±${K.RAIL} V = ${P.watts.toFixed(1)} W</td></tr>
   <tr><th>Supplies</th><td class="mono">PS1 ${P.on[0]?'on':'off'} · PS2 ${P.on[1]?'on':'off'} · ${(P.per*1000).toFixed(0)} mA per rail per supply of ${K.PSU_MAX*1000} ${inf} ${P.ok?'':'<b style="color:var(--bad)">NOT OK</b>'}</td></tr>
   <tr><th>Heat</th><td class="mono">≈ +${tempRise().toFixed(1)} °C over ${K.AMB} °C ambient ${inf}; vents: RH side plate, 14-slot PSU door (“13 PITCHES”)</td></tr>
   <tr><th>Reference</th><td class="mono">${r?(r.kind==='aes'?'AES REF BUS':'VIDEO REFERENCE')+' · level ×'+r.lvl+(r.lvl!==1?' <b style="color:var(--warn)">mis-terminated</b>':''):'none'} · used by ${D.slots.filter(s=>s.card&&CARDS[s.card].ref).map(s=>s.card).join(', ')||'no card fitted'}</td></tr>
   <tr><th>Fit check</th><td class="small">${probs.length?probs.join('<br>'):'all cards on the right rear modules'}</td></tr></table>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Open the door and click a slot to insert or pull a card; click a rear position to change its module; click the AC inlets and REF BNCs.</div>'; }
function viewSim(m){
  m.innerHTML=`${card('Front of the frame at the playhead', `<div id="fp"></div>${controlsHTML()}`)}
   <div class="grid2"><div>${card('Rear: power cover MF8212RM2 (real silkscreen)', `<div id="rp"></div>`)}${card('Rear: termination modules', `<div id="rm"></div>`)}</div><div>${card('What happened', `<div id="tr" class="log"></div>`)}${card('State at the playhead', `<div id="in"></div>`)}</div></div>
   ${card('Timeline — one second of the frame', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="lg" class="log"></div>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#rm').innerHTML=rearModsSVG(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector(t); m.querySelector('#lg').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>'; SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:190}); });
}
let lesson=0;
const LESSONS=[
  {title:'The MF82 frames', body:`<p>Every 8200-series card lives in an MF82 frame: <b>MF8212</b> (MF82/12, 12 slots) or <b>MF8210</b> (MF82/10, 10 slots with deeper rear modules such as BNC3/BNC4). Two redundant supplies, a hinged front door with the WBS logo, and a rear housing that takes one termination module per slot.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and ground', body:`<p>Connect <b>both</b> AC cords (PS1 and PS2 inlets, each with a 2 A fuse) and the green/black binding posts. The caution label on the rear says to disconnect both before servicing.</p><p><b>Goal:</b> both supplies running.</p>`, check:()=>D.ps[0]&&D.ps[1]&&D.psFailAt===null, hint:'Click each IEC inlet on the rear cover until both show a cord.'},
  {title:'2 · Open the door', body:`<p>The 8212-020 door pivots down on its bottom hinge and is held by the 7-03-209 nylon latch.</p><p><b>Goal:</b> door open.</p>`, check:()=>D.door==='open', hint:'Click the door.'},
  {title:'3 · Fit a card and its rear module', body:`<p>Choose <b>D8204</b> in “Card to insert” and click an empty slot. Pins 1 and A go at the top. Then make sure the rear module behind it is a <b>BNC1</b> (MF8212).</p><p><b>Goal:</b> a D8204 in slot 4 with a fitting module.</p>`, check:()=>D.slots[3]&&D.slots[3].card==='D8204'&&!fitProblem(3), hint:'Pick D8204, click slot 4.'},
  {title:'4 · Eight outputs need an MF8210', body:`<p>Change slot 4's module to <b>BNC3</b>. It turns red: BNC3 is “*MF8210 only”. Switch the frame to MF8210 to make it fit.</p><p><b>Goal:</b> D8204 on BNC3 in an MF8210.</p>`, check:()=>D.frame==='MF8210'&&D.slots.some(s=>s.card==='D8204'&&s.mod==='BNC3'), hint:'Click rear position 4, then Frame → MF8210.'},
  {title:'5 · Reference loop', body:`<p>Reference-locked cards (D8205/D8206/D8207) take the frame reference from REF IN. Loop REF OUT to the next frame and terminate only at the end of the chain.</p><p><b>Goal:</b> REF OUT connected and this frame's termination off.</p>`, check:()=>D.refOut&&!D.refTerm, hint:'Click the REF OUT BNC, untick “REF 75 Ω termination”.'},
  {title:'6 · Lose a supply', body:`<p>Press “PS1 fails here”: PS2 takes the whole load without a break. Scrub the timeline to see the mains and charge pulses of PS1 stop.</p><p><b>Goal:</b> survive a PS1 failure.</p>`, check:()=>D.psFailAt!==null&&powerAt(1).ok, hint:'Use the button.'},
  {title:'Done', body:`<p>Close the door. <b>Findings</b> lists the drawing mix-ups in the frame masters.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — installing an MF82 frame', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div></div><div>${card('Rear', `<div id="rp"></div><div id="rm"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>${card('Front', `<div id="fp"></div>${controlsHTML()}`)}`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#rm').innerHTML=rearModsSVG(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){
  const P=powerAt(0);
  m.innerHTML=`<div class="grid3">${card('Power', `<table class="kv"><tr><th>Mains cycles</th><td class="mono">60 per inlet ${inf}</td></tr><tr><th>Charge pulses</th><td class="mono">120 per supply</td></tr><tr><th>Energy to cards</th><td class="mono">${P.watts.toFixed(1)} J</td></tr><tr><th>Charge on +22 V</th><td class="mono">${(P.L.ip*1000).toFixed(0)} mC</td></tr></table>`)}
   ${card('Reference bus', `<table class="kv"><tr><th>AES ref</th><td class="mono">48 000 frames, 250 blocks</td></tr><tr><th>Video ref</th><td class="mono">59.94 fields</td></tr><tr><th>Taps</th><td class="mono">one per slot (12 × SSW-102 2-pin sockets on the backplane ${inf})</td></tr></table>`)}
   ${card('Cards', `<table class="kv">${D.slots.map((s,i)=>s.card?`<tr><th>Slot ${i+1}</th><td class="mono">${s.card} +${CARDS[s.card].ip}/−${CARDS[s.card].in} mA${CARDS[s.card].src?'':' '+'(inferred)'}</td></tr>`:'').join('')||'<tr><td>empty frame</td></tr>'}</table>`)}</div>
   ${card('Zoom in: one mains cycle', `<canvas id="z"></canvas>`)}`;
  SIM.on('time',()=>SIM.drawLanes(m.querySelector('#z'),lanes(),{labelW:190,range:[Math.max(0,SIM.t-1/120),Math.max(0,SIM.t-1/120)+1/60]}));
}
const BLOCKS={
  ac1:{x:10,y:20,w:120,h:56,t:'AC inlet PS1',s:['723W-X2/02, 2 A'],d:'IEC inlet with fuseholder; detachable cord 17251 (BOM).'},
  ac2:{x:10,y:110,w:120,h:56,t:'AC inlet PS2',s:['723W-X2/02, 2 A'],d:'Second, independent inlet — redundant supply.'},
  ps:{x:170,y:50,w:140,h:90,t:'82-072 PSU box',s:['PS1 + PS2','±22 V (MF8212-3.DSN)','door 82-077'],d:'Power-supply enclosure (clear alodine, stainless hardware) behind the 13-vent door with PS1/PS2 lamps. Supplies plug into two 24-way EDAC 307-024 sockets on the backplane.'},
  bp:{x:350,y:50,w:150,h:90,t:'MF8212BP backplane',s:['ISS5 PCB','12 × EDAC 30-way','12 × 20-way SSW-120'],d:'Card edge sockets (EDAC 307-030), rear-module sockets (SAMTEC SSW-120), 12 × 2-pin taps and a 2×10 header (MF82REF) — BOM 2013|46.'},
  cards:{x:540,y:20,w:130,h:56,t:'Cards 1–12',s:['D82xx / M82xx'],d:'Any 8200-series card in any slot (manuals).'},
  mods:{x:540,y:110,w:130,h:56,t:'Rear modules',s:['BNCn, TB82xx'],d:'Mounted on MF8212RM1 / MF8210RM1 rear housing directly behind each card.'},
  ref:{x:350,y:180,w:150,h:60,t:'REF IN / OUT',s:['BNC on MF8212RM2','75R 1% term'],d:'Frame reference distributed as AES REF BUS or VIDEO REFERENCE; optional MF-REF board (CS8412 receiver, EL2099 driver, LM7805/LM7915) on the CON20 header.'},
};
const WIRES=[['ac1','ps','AC'],['ac2','ps','AC'],['ps','bp','±22 V'],['bp','cards',''],['bp','mods',''],['ref','bp','ref bus']];
function blockSVG(sel){ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 690 250" style="width:100%"><defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#fa)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; } return s+'</svg>'; }
function viewBlock(m){ let sel='bp'; m.innerHTML=`<div class="grid2">${card('Frame block diagram — click a block', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Mechanical parts (2016|49 masters)', `<table class="kv small">${[['7-03-209 ISS4','door latch, .125 black nylon'],['82-002 / 82-003','PC guide support bars, alum. extrusion B9901, clear alodine'],['82-004-1 ISS7 / -2 ISS6','LH / RH (vented) side plates, extra-fine textured WBS black'],['82-008-1','mounting block, PSU door'],['82-009-1 ISS5','spring plate, tempered spring steel'],['82-011 ISS2','lacing bar & pillar'],['8205-004 ISS2','8200 custom PCB handle'],['82-072 ISS4','power-supply enclosure, clear alodine'],['82-075 / 076 / 079','BNC termination brackets, electroless nickel'],['82-077 ISS2','PSU door, 13 × 0.12×1.00 oblong vents, silk'],['8212-020 ISS3','DA door, .063 alum, 17.060″'],['MF8210RM1 / MF8212RM1 ISS2','rear housings (MF82REF configuration)'],['MF8212RM2 ISS1','power cover (“DA REAR POWER SOURCE”)']].map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`)}</div></div>`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=blockSVG(sel); m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; }; draw(); }
const SHEETS=[
  {name:'1 · Frame wiring (MF8212-3.DSN)', note:'Redrawn from strings recovered from MFXX…/MF8212-3.DSN (OrCAD, JAN27 2000|33): PS1/PS2, FUSE, BNC, CON20, 75R 1%, +22 V/−22 V, AES REF BUS, VIDEO REFERENCE, POS.1…POS.12, edge pairs “1,A … 15 & S”. Connectivity between them is inferred.', svg:()=>{ let s=`<rect x="40" y="40" width="120" height="70" fill="none" stroke="var(--ink)"/><text x="100" y="70" text-anchor="middle" font-size="12" fill="var(--ink)">PS1</text><text x="100" y="90" text-anchor="middle" font-size="10" fill="var(--accent2)">+22 V / −22 V</text><rect x="40" y="140" width="120" height="70" fill="none" stroke="var(--ink)"/><text x="100" y="170" text-anchor="middle" font-size="12" fill="var(--ink)">PS2</text><text x="100" y="190" text-anchor="middle" font-size="10" fill="var(--accent2)">+22 V / −22 V</text>`;
    s+=`<line x1="160" y1="75" x2="220" y2="75" stroke="var(--ink)"/><line x1="160" y1="175" x2="220" y2="175" stroke="var(--ink)"/><line x1="220" y1="60" x2="220" y2="320" stroke="var(--ink)" stroke-width="2"/><text x="226" y="58" font-size="10" fill="var(--accent2)">±22 V, COMMON, CHASSIS</text>`;
    for(let i=0;i<6;i++){ const x=260+i*95; s+=`<rect x="${x}" y="90" width="70" height="160" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+35}" y="110" text-anchor="middle" font-size="10.5" fill="var(--ink)">${i<5?'POS.'+(i+1):'POS.12'}</text><text x="${x+35}" y="128" text-anchor="middle" font-size="9" fill="var(--ink2)">30-way edge</text><text x="${x+35}" y="146" text-anchor="middle" font-size="9" fill="var(--ink2)">1,A … 15,S</text><text x="${x+35}" y="236" text-anchor="middle" font-size="9" fill="var(--ink2)">CON20 → term.</text><line x1="220" y1="${200}" x2="${x}" y2="200" stroke="var(--ink2)" stroke-dasharray="3 3"/>`; }
    s+=`<line x1="220" y1="300" x2="830" y2="300" stroke="var(--accent2)" stroke-width="2"/><text x="600" y="294" font-size="11" fill="var(--accent2)">AES REF BUS / VIDEO REFERENCE</text><circle cx="250" cy="360" r="14" fill="none" stroke="var(--ink)"/><text x="272" y="364" font-size="11" fill="var(--ink)">BNC REF (rear)</text><line x1="250" y1="346" x2="250" y2="300" stroke="var(--ink)"/><rect x="380" y="340" width="70" height="20" fill="none" stroke="var(--ink)"/><text x="415" y="355" text-anchor="middle" font-size="10" fill="var(--ink)">75R 1%</text><line x1="415" y1="340" x2="415" y2="300" stroke="var(--ink)"/>`; return s; }},
  {name:'2 · MF-REF option (mf-ref.DSN)', note:'Parts recovered from mf-ref.DSN (2000|33, ISS1.PCB): CS8412 receiver, EL2099 video/line driver, LM7805 and LM7915 regulators, CON20, net labels FRAME REFERANCE, REF INPUT, REF OUTPUT, FSYNC. Redrawn; pin-level wiring not recovered.', svg:()=>`<rect x="60" y="120" width="120" height="60" fill="none" stroke="var(--ink)"/><text x="120" y="155" text-anchor="middle" font-size="12" fill="var(--ink)">REF INPUT</text><line x1="180" y1="150" x2="250" y2="150" stroke="var(--ink)"/><rect x="250" y="100" width="150" height="100" fill="var(--panel2)" stroke="var(--ink)"/><text x="325" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">CS8412</text><text x="325" y="160" text-anchor="middle" font-size="10" fill="var(--ink2)">AES receiver → FSYNC</text><line x1="400" y1="150" x2="470" y2="150" stroke="var(--ink)"/><rect x="470" y="100" width="150" height="100" fill="var(--panel2)" stroke="var(--ink)"/><text x="545" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">EL2099</text><text x="545" y="160" text-anchor="middle" font-size="10" fill="var(--ink2)">bus driver</text><line x1="620" y1="150" x2="690" y2="150" stroke="var(--ink)"/><text x="700" y="146" font-size="11" fill="var(--accent2)">FRAME REFERANCE</text><text x="700" y="162" font-size="11" fill="var(--accent2)">REF OUTPUT · CON20</text><text x="250" y="260" font-size="11" fill="var(--ink)">LM7805 (+5 V), LM7915 (−15 V) from the frame rails</text>`},
  {name:'3 · Backplane BOM (MF8212BP)', note:'MF8212BP BOM Costed.xlsx (2013|46).', svg:()=>[['MF8212-PCB','backplane PCB ISSUE 5','1'],['307-30-20-01','EDAC 30-pin card socket','12'],['307-24-20-01','EDAC 24-pin socket (PSUs)','2'],['65780-020','SAMTEC SSW-120 20-pin socket (rear modules)','12'],['929665-01-10','SAMTEC 2×10 male header (MF82REF)','1'],['SSW-102-06-GS','2-pin socket','12']].map((r,i)=>`<text x="60" y="${60+i*36}" font-size="12" font-family="var(--mono)" fill="var(--accent2)">${r[0]}</text><text x="230" y="${60+i*36}" font-size="12" fill="var(--ink)">${r[1]}</text><text x="700" y="${60+i*36}" font-size="12" fill="var(--ink)">× ${r[2]}</text>`).join('')},
];
function viewSchem(m){ let i=0; m.innerHTML=card('Schematic set (redrawn from recovered net names and BOMs — not the OrCAD drawings)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();}); m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 400" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="840" y="390" text-anchor="end" font-size="10" fill="var(--ink2)">MF8210/MF8212 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; }; draw(); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('Power path, stage by stage (no software in a frame)', `<div id="pp"></div>`)}${card('Card ↔ rear module rules (rear-module guide 2011|44–2012|45)', `<table class="kv small"><tr><th>Card</th><th>Modules</th></tr>${Object.keys(CARDS).map(k=>`<tr><td class="mono">${k}</td><td>${CARDS[k].mods.map(x=>x+(MOD_MF8210_ONLY.includes(x)?' (*MF8210 only)':'')).join(', ')}</td></tr>`).join('')}</table>`)}</div>
   ${card('Reference distribution', `<div id="rf"></div>`)}`;
  SIM.on('time',()=>{ const P=powerAt(SIM.t), r=refAt(SIM.t);
    const st=[['AC in',P.on.map((o,k)=>`PS${k+1} ${o?'120 V':'off'}`).join(' · ')],['Fuse',`2 A slow-blow each ${'(BOM “SB 2.000 AMP”)'}`],['Supplies',`${P.nOn} running`],['Bus',`±22 V, ${(P.per*1000).toFixed(0)} mA per supply`],['Cards',`${P.L.n} cards, ${P.watts.toFixed(1)} W`],['Heat',`+${tempRise().toFixed(1)} °C ${'(inferred)'}`]];
    m.querySelector('#pp').innerHTML=`<svg viewBox="0 0 520 ${st.length*46+10}" style="width:100%">${st.map((s,j)=>`<rect x="20" y="${8+j*46}" width="480" height="36" rx="6" fill="${P.ok?'var(--panel2)':'color-mix(in srgb,var(--bad) 20%,var(--panel2))'}" stroke="var(--line)"/><text x="30" y="${30+j*46}" font-size="12.5" font-weight="700" fill="var(--ink)">${s[0]}</text><text x="140" y="${30+j*46}" font-size="12" font-family="var(--mono)" fill="var(--ink)">${s[1]}</text>`).join('')}</svg>`;
    m.querySelector('#rf').innerHTML=`<p class="small">REF IN → ${r?(r.kind==='aes'?'AES REF BUS':'VIDEO REFERENCE'):'nothing'} → every slot. Termination: frame ${D.refTerm?'75R on':'off'}, REF OUT ${D.refOut?'looped to a terminated frame':'open'} → level ×${r?r.lvl:0} ${r&&r.lvl!==1?'(<b>fix the termination</b>)':''}. Cards that use it: ${D.slots.filter(s=>s.card&&CARDS[s.card].ref).map(s=>s.card).join(', ')||'none fitted'}.</p>`; });
}
function viewNotes(m){
  m.innerHTML=card('What the frame masters are up to — findings', `<ol>
   <li><b>Artwork ${SIM.year(2026)}: front and rear panels now from the CorelDRAW silks.</b> Door ${SIM.src(ART+'8212-020-SILK (CURVE) .cdr','8212-020-SILK (CURVE) .cdr')} (NOV.09/15), PSU door ${SIM.src(ART+'82-077-SILK (DOOR CURVE).cdr','82-077-SILK (DOOR CURVE).cdr')} (JUN.21/16) and rear cover ${SIM.src(ART+'MF8212RM2-SILK(CURVE).cdr','MF8212RM2-SILK(CURVE).cdr')} (JUN.22/16) / ${SIM.src(ART+'MF8212RM2-SILK (CURVE).cdr','MF8212RM2-SILK (CURVE).cdr')} (NOV.06/15), converted to vector SVG. Each sheet has two inks: the silk in CorelDRAW “rich black” (#1B1918) and the mechanical outline in pure black (#000000); the silk is recoloured to its real ink, the outline kept as dark lines. The PSU door shows <b>14</b> vent slots (the photo agrees; the mechanical drawing’s “13 PITCHES OF … OBLONG” means 14 slots, which the earlier model read as 13), and its PS1/PS2 lamp holes are not symmetric: PS2 sits at 59 % of the width, not at the right edge. The door silk carries only the WBS mark and two screw targets; the card slots are not legended.</li>
   <li><b>“D8210 & D8212” are frames, not cards.</b> The folder holds MF8210/MF8212 mechanicals and silk (2011–2016|44–49); the D- prefix normally means a digital card.</li>
   <li><b>The two rear-cover silks swap REF IN and REF OUT.</b> <span class="mono">MF8212RM2-SILK (CURVE).pdf</span> (NOV.06/15, matches <span class="mono">PICS/MF8212RM2.jpg</span>) reads REF OUT, REF IN left to right; <span class="mono">MF8212RM2-SILK(CURVE).pdf</span> (JUN.22/16, same date as the ISS 1 power-cover drawing) reads REF IN, REF OUT and adds outlines for the IEC inlets and posts. Either the BNCs were re-wired or one label set is wrong. Swap them on the Simulator tab.</li>
   <li><b>Drawings cloned from other drawings.</b> The 8212-020 DA DOOR drawing still contains “SIDE PLATE, LEFT HAND”, “P.C. GUIDE SUPPORT BAR” and the 82-002 alodine notes; 82-011 LACING BAR also carries “SIDE PLATE, LEFT HAND”. The 8205-004 HANDLE says “WITH TOGGLE SWITCH” and sits in folder ERWIN/ODD DRAWINGS.</li>
   <li><b>Finish changes recorded in the revision text.</b> Guide bars and the PSU box went from yellow to clear alodine; termination brackets from nickel to electroless nickel; the PSU box once was painted, then “CHANGED FROM PAINT TO YELLOW ALODINE”.</li>
   <li><b>BOM counts tell the layout.</b> 28 × 9″ and 4 × 6.5″ EDAC card guides; 12 card sockets plus 2 × 24-way for the two supplies; 12 rear-module sockets and 12 two-pin taps; one 2×10 header for the MF82REF option.</li>
   <li><b>Rails are ±22 V.</b> The 2000|33 frame schematic labels +22 V/−22 V (and +21/−21); card manuals quote ±20 V — the drop is across the cards' input polyfuses and diodes.</li>
   <li><b>Corrected 2026|59:</b> the MF8210 slot pitch is 1.260 in, not the inferred 1.2 in: the MF8210 rear-housing drawings (<span class="mono">MF8210 - #Engineering/82-074.pdf</span>, <span class="mono">82-071.pdf</span>; mfxx.js reads the same from MF8210RM1 ISS 2) give “9 PITCHES OF 1.260 = 11.340”. The MF8212's 1.000 in is from MF8212RM1 (“11 PITCHES @ 1.000”). (see mfxx.js)</li>
   <li><b>Superseded twin.</b> The same 18 drawing numbers exist in <span class="mono">MFXX (DA FRAME) #PROBLEM</span> as older un-numbered issues; only <span class="mono">MF82SILK.CDR</span> and one other file are byte-identical. Treat this folder as master.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>Slot/PSU layout behind the door, PSU rating ${K.PSU_MAX} A per rail, mains 60 Hz and the thermal coefficient are ${inf}.</li><li>Card currents other than D8204 and M8202 are ${inf}.</li><li>The 82-077 PSU door is drawn from its photo; its silk exists only as CorelDRAW (no PDF).</li></ul>`)
  +card('Sources', `<ul class="small mono"><li>D8210 & D8212 - #ARTWORK #DA #2016/*.pdf, PICS/*.jpg</li><li>D8210 & D8212 - #Mechanical #DA #2016/*.dwg (.md text)</li><li>MF8212 Frame - #Master/MF8212 BOM Costed.xlsx, MF8212BP BOM Costed.xlsx</li><li>MFXX (DA FRAME)…/MF8212 - #Engineering/MF8212-3.DSN, mf-ref.DSN</li><li>8200 Series Rear Module options…/*.pdf</li></ul>`);
}
SIM.register({
  footnotes:[{text:"Each silk sheet holds two inks: the legend in CorelDRAW rich black (#1B1918) and the mechanical outline in pure black (#000000).",src:"#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK(CURVE).cdr"},{text:"The two rear-cover silks swap REF IN and REF OUT: NOV.06/15 reads REF OUT, REF IN; JUN.22/16 reads REF IN, REF OUT.",src:"#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK (CURVE).cdr"},{text:"The PSU door has 14 vent slots (“13 PITCHES” on the drawing), and its PS2 lamp hole sits at 59 % of the width, not mirrored to PS1.",src:"#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/82-077-SILK (DOOR CURVE).cdr"},{text:"The DA door silk carries only the WBS mark and two screw targets; the card slots have no legends.",src:"#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/8212-020-SILK (CURVE) .cdr"},{text:"Each silk exists twice, as live text and as a (CURVE) copy; the MF8212RM2 curve version is stored under two spellings, “SILK(CURVE)” (JUN.22/16) and “SILK (CURVE)” (NOV.06/15), which are different issues.",src:"#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016"},{text:"The same drawing numbers exist as older issues in MFXX (DA FRAME) #PROBLEM; only MF82SILK.CDR and one other file are byte-identical.",src:"#MF8200 #SERIES/MFXX (DA FRAME) - #Engineering #PROBLEM #MF82"}],
  id:'d8210-d8212', name:'MF8210 / MF8212 · DA frames (2016|49)', duration:1,
  product:'D8210 & D8212', year:2016, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82',
  summary:'The 2-RU rack frames that hold every 8200-series card: 12 slots (MF8212) or 10 deeper slots (MF8210), redundant ±22 V supplies, a frame reference bus and a rear housing for termination modules. Built from the 2016|49 drafting masters and real door and power-cover silkscreens.',
  highlights:['Real door and power-cover silk','Insert cards, match rear modules','Redundant supply failover','Reference loop and termination','REF IN/OUT labels swapped between issues'],
  depth:'Hardware model',
  stepUnits:[{label:'1 mains cycle',period:()=>1/60},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[1/60,'1 mains cycle'],[0.001,'1 ms'],[4/48000,'4 ref frames']],
  defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Power & signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
