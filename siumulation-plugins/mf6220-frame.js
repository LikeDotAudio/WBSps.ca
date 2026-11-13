/* =====================================================================
   MF6220 — Ward-Beck 20-slot openGear frame (2006|39–2008|41, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all in this archive, folder "XXX - MF6220 - FRAME  #Master #OPENGEAR #OBSOLETE"):
   - MF6220 - #Engineering/design notes.doc (Doug Bascombe, Nov 2006|39 / Jan 2007|40): slot pitch, PSU, grounding, reference
   - PCB/MF6220-1/WORKING/ISSUE4/MF6220-1iss4-NEW.net (midplane: slot ID ladder, PSU1/2, AC1/2, CAN, REF terminations)
   - PCB/MF6220-2/MF6220-2iss3.net (fan/alarm board: 5× TC670, PCA9555, LM86, TMP75, buzzer, LEDs, SW1)
   - PCB/MF6220-3/WORKING/MF6220-3iss5-NEW.net (rear ref/comm board: EL5263, 4 REF BNC, MagJack, RS-232, DS2433, DIP)
   - MECHANICAL/FAN-PCB.dxf (fan board 16.72″ × 2.90″), MF6220-1M1…M5 PDFs (sheet-metal set)
   - #OPEN GEAR - #Engineering/.../OpenGear Frame Address ID.xls (slot / FINC / fan addressing sheets)
   - #OPEN GEAR - #Engineering/.../openGear DevGuide Part I_rev3.pdf (rails, slot pinout, PS-8300)
   - M6245A #Engineering #TIM/psu temp/*.JPG (photos of this frame)
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = why => `<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b) => `<div class="card"><h2>${t}</h2>${b}</div>`;

/* ---------------- frame data ---------------- */
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681]; // R1..R20 on MF6220-1
const PITCH = i => (i%2===1 ? 0.650 : 0.670);     // design notes: alternating 0.650 / 0.670 in (slot 1→2 = 0.650)
const SLOT_X = (()=>{ const a=[0]; for(let i=1;i<20;i++) a.push(a[i-1]+PITCH(i)); a.push(a[19]+0.820); return a; })(); // index 20 = FINC slot 21
const CARDS = { // typical power in watts — none of these figures are in the archive (inferred)
  empty:{n:'empty',w:0}, D6201A:{n:'D6201A 75 Ω AES DA',w:4}, D6202A:{n:'D6202A 110 Ω AES DA',w:4}, AV6201A:{n:'AV6201A video DA',w:5}, AA6201A:{n:'AA6201A audio DA',w:4},
  D6203A:{n:'D6203A A/D',w:5}, D6204A:{n:'D6204A D/A',w:5}, M6202A:{n:'M6202A de-embedder',w:9}, M6203A:{n:'M6203A SDI DA',w:6}, M6204A:{n:'M6204A embedder',w:10}, M6205:{n:'M6205 audio processor',w:12},
};
const CK = Object.keys(CARDS);
const F = {
  slots: Array.from({length:20},(_,i)=> i%2===1 ? ['D6201A','AV6201A','M6202A','D6203A','D6204A','AA6201A','M6205','D6202A','M6203A','M6204A'][(i>>1)%10] : 'empty'),
  psu:[true,true], psuW:150, fans:[true,true,true,true,true], door:'closed', silenced:false, ref:true, ambient:25, sel:2, view:'front', log:[], last:null, insertAt:{},
};
F.slots[3]='empty'; F.slots[13]='empty';

function adcOf(R){ return Math.min(1023, Math.floor(1024*R/(R+1000))); }
function bin(a){ return 32 - Math.floor((a+16)/32); }
function slotId(i){ return 1 + bin(adcOf(SLOT_R[i])); }          // getSlotID() = 1 + getAdcBin(ADC_SLOTID)
function budget(){
  const p = F.slots.reduce((a,k)=>a+CARDS[k].w,0) + 6;            // + FINC ≈ 6 W (inferred)
  const nPsu = F.psu.filter(Boolean).length, cap = nPsu*F.psuW;
  const ineg = p*0.15/7.5;                                        // 15 % of card power on −7.5 V (inferred)
  const fansOk = F.fans.filter(Boolean).length;
  const temp = F.ambient + p*(0.08 + (5-fansOk)*0.05) + (F.door==='open'?4:0); // °C rise model (inferred)
  const overSlot = F.slots.map((k,i)=>CARDS[k].w>12?i+1:null).filter(Boolean);
  return {p, nPsu, cap, ok:p<=cap, ineg, negOk:ineg<=2.5, fansOk, temp, fanAlarm:fansOk<5, alarm:(fansOk<5||!nPsu||p>cap) && !F.silenced, overSlot};
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); F.last={name,tr,t:SIM.t}; F.log.unshift({name,t:SIM.t}); if(F.log.length>40) F.log.length=40; SIM.refresh(); }
const A = {
  slot(i){ act('Select slot '+(i+1), tr=>{ F.sel=i; const R=SLOT_R[i], a=adcOf(R); tr(`Midplane R${i+1} = ${R>=1000?R/1000+' kΩ':R+' Ω'} on AN_SLOT_ID${i+1} (P${i+1}-6) → card 1K00 pull-up → ADC ${a} → bin ${bin(a)} → getSlotID() = ${slotId(i)}`); tr(`Card: ${CARDS[F.slots[i]].n}${CARDS[F.slots[i]].w?' · '+CARDS[F.slots[i]].w+' W '+'(typical, inferred)':''}`); tr(`Rear bay ${Math.floor(i/2)+1} (slots ${Math.floor(i/2)*2+1}–${Math.floor(i/2)*2+2}); a single-card rear module serves the even slot (design notes)`); }); },
  cycle(i){ act('Change card in slot '+(i+1), tr=>{ F.sel=i; const k=CK[(CK.indexOf(F.slots[i])+1)%CK.length]; F.slots[i]=k; F.insertAt[i]=SIM.t; const b=budget(); tr(`Slot ${i+1}: ${CARDS[k].n}`); if(k!=='empty') tr(`On power-up the card reads AN_SLOT_ID → slot ${slotId(i)} and joins CAN as that address`); tr(`Frame load ${b.p.toFixed(0)} W of ${b.cap} W · −7.5 V ≈ ${b.ineg.toFixed(2)} A`); }); },
  psu(n){ act('PSU'+(n+1)+(F.psu[n]?' off':' on'), tr=>{ F.psu[n]=!F.psu[n]; const b=budget(); tr(`PSU${n+1} EDAC26: AC${n+1}_LINE/NEUTRAL → PSU${n+1}-1…4; +12V PSU${n+1}-15…20, −7V5 -21…24; FAULT PSU${n+1}-14 wired-OR with the other PSU → R66 15K / R65 5K → FINC P21-10`); tr(b.nPsu? `${b.nPsu} supply running: ${b.cap} W available for ${b.p.toFixed(0)} W` : 'No supply: frame dark'); }); },
  fan(n){ act('Fan '+(n+1)+(F.fans[n]?' stalls':' restored'), tr=>{ F.fans[n]=!F.fans[n]; tr(`TC670 U${n+4} SENSE loses the fan current pulses → ALERT low → FAN_DETECT_${n} → PCA9555 U1-${[4,5,6,7,8][n]}`); tr('FINC reads the PCA9555 over I²C (SCL P1-16, SDA P1-17 on the EDAC20) and sets ALARM → Q1 → buzzer SDT083A and red LED'); }); },
  silence(){ act('Press ALARM SILENCE', tr=>{ F.silenced=!F.silenced; tr('SW1 TL1105 → ALARM_SILENCE → PCA9555 U1-11 (input) → FINC'); tr(F.silenced?'Buzzer muted; the fault LED stays':'Silence released'); }); },
  ref(){ act('Reference '+(F.ref?'removed':'connected'), tr=>{ F.ref=!F.ref; tr('REF BNC on MF6220-3 → EL5263 U1 buffer → REF1_A / REF2_A → 21 × 150 Ω (RN1–RN10 quad arrays) → H3 → midplane REF1_n / REF2_n → 150 Ω to GNDD at each slot (R23…) → card pin 14 / 10'); }); },
  door(){ act('Door '+(F.door==='open'?'closed':'opened'), tr=>{ F.door=F.door==='open'?'closed':'open'; tr(F.door==='open'?'Fans on the door board no longer push air across the cards (temperature model +4 °C, inferred)':'Door closed: five fans blow front to back'); }); },
  view(v){ F.view=v; SIM.refresh(); },
  reset(){ act('Reset frame', tr=>{ F.psu=[true,true]; F.fans=[true,true,true,true,true]; F.silenced=false; F.ref=true; F.door='closed'; tr('Both PSUs on, all fans running'); }); },
};

/* ---------------- drawings (to scale, 40 px per inch) ---------------- */
const S = 40;
function frontSVG(){
  const b=budget(), W=19*S, H=3.5*S;
  let s=`<svg viewBox="0 0 ${W+20} ${H+60}" style="width:100%;display:block" role="img" aria-label="MF6220 front">
   <rect x="10" y="10" width="${W}" height="${H}" rx="4" fill="#1b1d20" stroke="#000"/>
   <rect x="10" y="10" width="${0.75*S}" height="${H}" fill="#26292d"/><rect x="${10+W-0.75*S}" y="10" width="${0.75*S}" height="${H}" fill="#26292d"/>`;
  if (F.door==='closed'){
    const fx=10+(19-16.72)/2*S, fy=10+(3.5-2.9)/2*S;
    s+=`<rect x="${fx}" y="${fy}" width="${16.72*S}" height="${2.9*S}" rx="3" fill="#121314" stroke="#333"/>`;
    for(let k=0;k<5;k++){ const cx=fx+(1.67+k*3.35)*S, cy=fy+1.45*S, ok=F.fans[k];
      s+=`<g class="fan" data-n="${k}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="${1.18*S}" fill="#0b0c0d" stroke="${ok?'#3a3d40':'#b3261e'}" stroke-width="3"/>
        <g ${ok?`transform="rotate(${(SIM.t*4200/60*360)%360} ${cx} ${cy})"`:''}>${[0,72,144,216,288].map(a=>`<path d="M${cx},${cy} q${18*Math.cos((a+30)*Math.PI/180)},${18*Math.sin((a+30)*Math.PI/180)} ${40*Math.cos(a*Math.PI/180)},${40*Math.sin(a*Math.PI/180)}" stroke="${ok?'#5e6366':'#7a1d12'}" stroke-width="9" fill="none" stroke-linecap="round"/>`).join('')}</g>
        <circle cx="${cx}" cy="${cy}" r="9" fill="#2a2d30"/><text x="${cx}" y="${cy+1.18*S+14}" text-anchor="middle" font-size="10" fill="var(--ink2)">JF${k+1} ${ok?'':'STALLED'}</text></g>`; }
    s+=`<circle cx="${10+W-0.4*S}" cy="${10+0.6*S}" r="6" fill="${b.alarm?'#ff3b2f':'#3a1010'}"/><circle cx="${10+W-0.4*S}" cy="${10+1.0*S}" r="6" fill="${b.nPsu<2?'#ffb43a':'#3a2a10'}"/><circle cx="${10+W-0.4*S}" cy="${10+1.4*S}" r="6" fill="${b.nPsu?'#7dff6a':'#163016'}"/>
      <g class="sil" style="cursor:pointer"><rect x="${10+W-0.6*S}" y="${10+2.0*S}" width="${0.4*S}" height="${0.4*S}" rx="3" fill="#444" stroke="#888"/><title>ALARM SILENCE (SW1)</title></g>
      <text x="${10+W/2}" y="${H+40}" text-anchor="middle" font-size="10" fill="var(--ink2)">Door closed: fan board 16.72″ × 2.90″ (FAN-PCB.dxf), five fans (photo MVC-012F); red/yellow/green LEDs and SW1</text><text x="${10+W/2}" y="${H+54}" text-anchor="middle" font-size="10" fill="var(--ink2)">from MF6220-2iss3.net — LED and button positions inferred</text>`;
  } else {
    SLOT_X.forEach((x,i)=>{ const X=10+(0.9+x)*S, k=i<20?F.slots[i]:'FINC', sel=F.sel===i;
      const fill = i===20? '#2d4f7c' : k==='empty'? '#25282b' : CARDS[k].w>12? '#7a1d12' : '#1f6b3f';
      s+=`<g class="slot" data-n="${i}" style="cursor:pointer"><rect x="${X}" y="${18}" width="${0.12*S}" height="${H-16}" fill="${fill}" stroke="${sel?'#ffd34d':'#000'}" stroke-width="${sel?2:0.5}"/>
        <rect x="${X-0.2*S}" y="18" width="${0.5*S}" height="${H-16}" fill="transparent"/>
        <text x="${X+0.06*S}" y="${H+24}" text-anchor="middle" font-size="9" fill="${sel?'var(--warn)':'var(--ink2)'}">${i+1}</text></g>`; });
    const px=10+15.0*S;
    [0,1].forEach(n=>{ const x=px+n*1.9*S; s+=`<g class="psu" data-n="${n}" style="cursor:pointer"><rect x="${x}" y="18" width="${1.8*S}" height="${H-16}" rx="4" fill="#4a4d52" stroke="#222"/><circle cx="${x+0.9*S}" cy="${H-30}" r="${0.5*S}" fill="#2a2c2f" stroke="#666"/><circle cx="${x+0.25*S}" cy="34" r="5" fill="${F.psu[n]?'#7dff6a':'#552222'}"/><text x="${x+0.9*S}" y="44" text-anchor="middle" font-size="10" fill="#ddd">PSU${n+1}</text></g>`; });
    s+=`<text x="${10+W/2}" y="${H+40}" text-anchor="middle" font-size="10" fill="var(--ink2)">Door open, to scale: 20 slots at 0.650/0.670″ alternating pitch, FINC slot 21 at +0.820″ (design notes).</text><text x="${10+W/2}" y="${H+54}" text-anchor="middle" font-size="10" fill="var(--ink2)">PSU bay from photo MVC-011F, sizes inferred. Click a slot to select; double-click to change its card.</text>`;
  }
  return s+'</svg>';
}
function rearSVG(){
  const W=19*S, H=3.5*S;
  let s=`<svg viewBox="0 0 ${W+20} ${H+50}" style="width:100%;display:block" role="img" aria-label="MF6220 rear">
   <rect x="10" y="10" width="${W}" height="${H}" rx="4" fill="#1b1d20" stroke="#000"/>`;
  for(let k=0;k<10;k++){ const x=10+(0.9+k*1.32)*S, a=F.slots[2*k], c=F.slots[2*k+1], used=a!=='empty'||c!=='empty';
    s+=`<g class="bay" data-n="${2*k+1}" style="cursor:pointer"><rect x="${x}" y="16" width="${1.3*S}" height="${3.16*S}" fill="${used?'#111':'#202326'}" stroke="${(F.sel>>1)===k?'#ffd34d':'#3a3d40'}"/>`;
    if (used) for(let r=0;r<5;r++) for(let q=0;q<2;q++) s+=`<circle cx="${x+(0.38+q*0.675)*S*0.98}" cy="${16+(0.31+r*0.625)*S}" r="${0.2*S}" fill="#b8a052" stroke="#6b5a23"/>`;
    s+=`<text x="${x+0.65*S}" y="${H+26}" text-anchor="middle" font-size="9" fill="var(--ink2)">bay ${k+1}</text></g>`; }
  const cx=10+14.3*S;
  s+=`<rect x="${cx}" y="16" width="${2.0*S}" height="${3.16*S}" fill="#262a2e" stroke="#444"/>
    ${[0,1,2,3].map(i=>`<g class="refb" style="cursor:pointer"><circle cx="${cx+(0.5+(i%2)*1.0)*S}" cy="${16+(0.4+Math.floor(i/2)*0.6)*S}" r="${0.2*S}" fill="#b8a052" stroke="#6b5a23"/>${i===0&&F.ref?`<circle cx="${cx+0.5*S}" cy="${16+0.4*S}" r="${0.16*S}" fill="#2d63a6"/>`:''}<text x="${cx+(0.5+(i%2)*1.0)*S}" y="${16+(0.4+Math.floor(i/2)*0.6)*S+0.36*S}" text-anchor="middle" font-size="8" fill="#ccc">REF${i+1}</text></g>`).join('')}
    <rect x="${cx+0.2*S}" y="${16+1.75*S}" width="${0.6*S}" height="${0.5*S}" fill="#888"/><text x="${cx+0.5*S}" y="${16+2.45*S}" text-anchor="middle" font-size="8" fill="#ccc">ETH</text>
    <rect x="${cx+1.1*S}" y="${16+1.75*S}" width="${0.6*S}" height="${0.5*S}" fill="#777"/><text x="${cx+1.4*S}" y="${16+2.45*S}" text-anchor="middle" font-size="8" fill="#ccc">RS-232 ×2</text>
    <rect x="${cx+0.4*S}" y="${16+2.65*S}" width="${1.2*S}" height="${0.3*S}" fill="#c33"/><text x="${cx+1.0*S}" y="${16+2.86*S}" text-anchor="middle" font-size="8" fill="#fff">DIP 1–4</text>`;
  [0,1].forEach(n=>{ const x=10+16.6*S+n*1.1*S; s+=`<g class="psu" data-n="${n}" style="cursor:pointer"><rect x="${x}" y="${16+0.8*S}" width="${0.9*S}" height="${1.3*S}" rx="3" fill="#0d0d0e" stroke="#555"/><rect x="${x+0.15*S}" y="${16+1.0*S}" width="${0.6*S}" height="${0.45*S}" fill="#2b2b2b"/><text x="${x+0.45*S}" y="${16+2.4*S}" text-anchor="middle" font-size="9" fill="#ccc">AC${n+1}</text></g>`; });
  return s+`<text x="${10+W/2}" y="${H+34}" text-anchor="middle" font-size="10" fill="var(--ink2)">Rear, to scale: ten 1.32″ rear-module bays (two slots each); MF6220-3 ref/comm panel (4 REF BNC, MagJack, 2 RJ RS-232, DIP);</text><text x="${10+W/2}" y="${H+47}" text-anchor="middle" font-size="10" fill="var(--ink2)">AC1/AC2 inlets with fuse (ACMODULE2). Panel positions inferred from the netlists.</text></svg>`;
}
function bindFrame(root){
  root.querySelectorAll('.slot').forEach(g=>{ const i=+g.dataset.n; g.onclick=()=>{ if(i<20) A.slot(i); else act('Select FINC slot 21', tr=>{ F.sel=20; tr('FINC (Ross MFC-8310) in slot 21 on P21 (MEC1). It reads AN_FRAME_ID = R24 2K21 → ADC 704 → bin 10 → frame type 11 = “WBS – MF6220-1” in the FINC addressing sheet.'); }); }; g.ondblclick=()=>{ if(i<20) A.cycle(i); }; });
  root.querySelectorAll('.bay').forEach(g=> g.onclick=()=>A.slot(+g.dataset.n));
  root.querySelectorAll('.fan').forEach(g=> g.onclick=()=>A.fan(+g.dataset.n));
  root.querySelectorAll('.psu').forEach(g=> g.onclick=()=>A.psu(+g.dataset.n));
  root.querySelectorAll('.refb').forEach(g=> g.onclick=()=>A.ref());
  const sl=root.querySelector('.sil'); if(sl) sl.onclick=()=>A.silence();
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px" class="small">
   <button data-c="door">${F.door==='open'?'Close door':'Open door'}</button><button data-c="front">Front</button><button data-c="rear">Rear</button>
   <label>Slot <select data-c="sl">${F.slots.map((k,i)=>`<option value="${i}" ${i===F.sel?'selected':''}>${i+1}</option>`).join('')}</select></label>
   <label>card <select data-c="card">${CK.map(k=>`<option value="${k}" ${F.sel<20&&F.slots[F.sel]===k?'selected':''}>${CARDS[k].n}</option>`).join('')}</select></label>
   <button data-c="p1">PSU1 ${F.psu[0]?'on':'off'}</button><button data-c="p2">PSU2 ${F.psu[1]?'on':'off'}</button>
   <label>PSU rating <select data-c="pw"><option value="150" ${F.psuW===150?'selected':''}>150 W (Ross PS-8300)</option><option value="200" ${F.psuW===200?'selected':''}>200 W (PPS-200 plan)</option></select></label>
   <button data-c="sil">ALARM SILENCE</button><button data-c="ref">REF ${F.ref?'in':'out'}</button>
   <label>Ambient <input type="range" data-c="amb" min="10" max="45" value="${F.ambient}"> ${F.ambient} °C</label><button data-c="reset">Reset</button></div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{ const k=el.dataset.c;
    const on={door:()=>A.door(),front:()=>A.view('front'),rear:()=>A.view('rear'),p1:()=>A.psu(0),p2:()=>A.psu(1),sil:()=>A.silence(),ref:()=>A.ref(),reset:()=>A.reset()};
    if (on[k]) el.onclick=on[k];
    if (k==='sl') el.onchange=()=>A.slot(+el.value);
    if (k==='card') el.onchange=()=>{ if(F.sel<20) act('Fit '+el.value+' in slot '+(F.sel+1), tr=>{ F.slots[F.sel]=el.value; F.insertAt[F.sel]=SIM.t; tr(CARDS[el.value].n+' → reads slot ID '+slotId(F.sel)); }); };
    if (k==='pw') el.onchange=()=>{ F.psuW=+el.value; SIM.refresh(); };
    if (k==='amb') el.onchange=()=>{ F.ambient=+el.value; SIM.refresh(); };
  });
}
function statusHTML(){
  const b=budget(), i=F.sel;
  const row=(a,v,ok)=>`<tr><th>${a}</th><td class="mono" style="${ok===false?'color:var(--bad)':''}">${v}</td></tr>`;
  return `<table class="kv">
   ${row('Power drawn', b.p.toFixed(0)+' W (cards '+inf('typical card figures')+' + FINC)', b.ok)}
   ${row('Supplies', b.nPsu+' × '+F.psuW+' W = '+b.cap+' W'+(b.nPsu===1?' · no redundancy':''), b.nPsu>0&&b.ok)}
   ${row('−7.5 V rail', b.ineg.toFixed(2)+' A of 2.5 A (design notes limit)', b.negOk)}
   ${row('Slots over 12 W', b.overSlot.length? b.overSlot.join(', ') : 'none', !b.overSlot.length)}
   ${row('Fans', b.fansOk+'/5 running', !b.fanAlarm)}
   ${row('Frame temperature (TMP75/LM86)', b.temp.toFixed(1)+' °C '+'(model)', b.temp<50)}
   ${row('Alarm', b.alarm? 'ALARM — buzzer on' : (F.silenced? 'silenced':'clear'), !b.alarm)}
   ${row('Reference', F.ref? '1.0 V p-p at every slot (buffer ×2 into 150 Ω + 150 Ω)':'none', F.ref)}
   ${i<20? row('Selected slot '+(i+1), `${CARDS[F.slots[i]].n} · AN_SLOT_ID R${i+1} = ${SLOT_R[i]>=1000?SLOT_R[i]/1000+'K':SLOT_R[i]+'R'} → ADC ${adcOf(SLOT_R[i])} → slot ${slotId(i)}`) : row('Selected','FINC slot 21 · AN_FRAME_ID 2K21 → type 11')}
  </table>`;
}

/* ---------------- timeline ---------------- */
const FIELD=1001/60000, HL=FIELD/262.5;
function lanes(){
  const css=SIM.css, b=budget();
  const L=[];
  L.push({label:'AC mains 60 Hz (AC1/AC2)', h:24, draw(c,X,a,bb,y,h){ if(b.nPsu) SIM.pulses(c,X,a,bb,y,h,1/60,0,1/120,css('--warn'),'cycles'); }});
  L.push({label:'Reference fields (REF1 → 21 slots)', h:24, draw(c,X,a,bb,y,h){ if(F.ref) SIM.pulses(c,X,a,bb,y,h,FIELD,0,9*HL,css('--accent2'),'fields'); }});
  L.push({label:'Reference H sync (63.56 µs)', h:20, draw(c,X,a,bb,y,h){ if(F.ref) SIM.pulses(c,X,a,bb,y,h,HL,0,4.7e-6,css('--accent2'),'lines'); }});
  L.push({label:'CAN: FINC polls each card (inferred 100 ms round)', h:26, draw(c,X,a,bb,y,h){ const cards=F.slots.map((k,i)=>[k,i]).filter(x=>x[0]!=='empty'); c.font='9px '+css('--mono'); cards.forEach(([k,i],n)=>{ for(let r=0;r<10;r++){ const t=r*0.1+n*0.1/cards.length; if(t+0.0003<a||t>bb) continue; c.fillStyle=css('--accent'); c.fillRect(X(t),y+4,Math.max(1.5,X(t+0.00026)-X(t)),h-8); if(X(t+0.1/cards.length)-X(t)>22){ c.fillStyle=css('--ink'); c.fillText('s'+(i+1),X(t)+2,y+h/2+3); } } }); }});
  L.push({label:'I²C: FINC reads PCA9555 (inferred 250 ms)', h:22, draw(c,X,a,bb,y,h){ SIM.pulses(c,X,a,bb,y,h,0.25,0.05,0.0004,css('--warn'),'reads'); }});
  for (let k=0;k<5;k++) L.push({label:'Fan JF'+(k+1)+' current pulses', h:16, draw(c,X,a,bb,y,h){ if(F.fans[k]&&b.nPsu&&F.door==='closed'||F.fans[k]&&b.nPsu) SIM.pulses(c,X,a,bb,y,h,60/(4200*4),k*0.0007,0.0008,F.fans[k]?css('--ink2'):css('--bad'),'pulses'); }});
  L.push({label:'Slot-ID ADC reads (card insert)', h:22, draw(c,X,a,bb,y,h){ for(const i in F.insertAt){ const t=F.insertAt[i]; if(t>=a&&t<=bb){ c.fillStyle=css('--warn'); c.fillRect(X(t),y+3,Math.max(2,X(t+200e-6)-X(t)),h-6); c.fillStyle=css('--ink'); c.font='9px sans-serif'; c.fillText('slot '+(+i+1)+' → ID '+slotId(+i),X(t)+4,y+h/2+3); } } }});
  return L;
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML=`${card('MF6220 — '+(F.view==='front'?'front':'rear')+' (click parts; double-click a slot to change its card)', `<div id="fr"></div><div class="ctlbox"></div>`)}
   <div class="grid2">${card('Frame status at the playhead', `<div id="st"></div>`)}${card('What happened (last action)', `<div id="tr" class="log"></div>`)}</div>
   ${card('Timeline — one second in the frame', `<canvas id="tl"></canvas>`)}
   ${card('Slot map: ID ladder and power', `<canvas id="sm"></canvas>`)}`;
  let ctlSig='';
  SIM.on('time', ()=>{
    { const sig=JSON.stringify([F.door,F.sel,F.slots[F.sel],F.psu,F.psuW,F.ref,F.ambient,F.silenced]); if(sig!==ctlSig){ ctlSig=sig; const cb=m.querySelector('.ctlbox'); cb.innerHTML=controlsHTML(); bindControls(cb); } }
    m.querySelector('#fr').innerHTML=F.view==='front'?frontSVG():rearSVG(); bindFrame(m.querySelector('#fr'));
    m.querySelector('#st').innerHTML=statusHTML();
    m.querySelector('#tr').innerHTML=F.last? `<div><b>${F.last.name}</b> at ${SIM.fmtT(F.last.t)}</div>`+F.last.tr.map(x=>`<div>→ ${x}</div>`).join('') : '<div class="muted">Open the door, click a slot, stall a fan or switch a PSU off.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:240});
    drawSlotMap(m.querySelector('#sm'));
  });
}
function drawSlotMap(cv){
  const {c,w}=SIM.canvas(cv,180), css=SIM.css, cw=(w-20)/20;
  for(let i=0;i<20;i++){ const x=10+i*cw, a=adcOf(SLOT_R[i]), k=F.slots[i], pw=CARDS[k].w;
    c.fillStyle=i===F.sel?css('--warn'):css('--accent2'); c.fillRect(x+2,90-a/1023*70,cw-4,a/1023*70);
    c.fillStyle=pw>12?css('--bad'):css('--accent'); c.fillRect(x+2,150-pw*4,cw-4,pw*4);
    c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(String(i+1),x+cw/2-6,172); }
  c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText('blue: ADC code of the slot-ID resistor (1013 at slot 1 … 414 at slot 20) · green: card power, 4 px per W '+'(typical, inferred) · red > 12 W per slot',10,12);
}
let lesson=0;
const LESSONS=[
  {t:'The MF6220', b:`<p>Ward-Beck's own 2RU, 20-slot openGear frame (2006|39–2008|41), designed beside Ross's DFR-8310. Cards plug in from the front, rear modules from the back, and a Ross FINC frame controller sits in slot 21. Three WBS boards make it work: the midplane (MF6220-1), the fan/alarm door board (MF6220-2) and the rear reference/comms board (MF6220-3).</p>`, ok:()=>true, auto:true},
  {t:'1 · Open the door', b:`<p>Press <b>Open door</b>. You see the 20 card slots at the alternating 0.650″/0.670″ pitch from the design notes, the wider gap to the FINC in slot 21, and the two power supplies.</p>`, ok:()=>F.door==='open', hint:'Open door button.'},
  {t:'2 · Find a card\'s address', b:`<p>Click <b>slot 12</b>. Each slot has its own resistor on the midplane (100K for slot 1 down to 681R for slot 20); the card reads it through a 1K00 pull-up and its ADC, and <span class="mono">getSlotID()</span> returns 1 + the bin.</p>`, ok:()=>F.sel===11, hint:'Click the slot labelled 12, or pick it in the Slot list.'},
  {t:'3 · Overload a slot', b:`<p>Fit an <b>M6205</b> in slot 12 (card list). Its typical draw ${inf()} is over the 12 W per slot the design notes allow, and the slot turns red.</p>`, ok:()=>F.slots[11]==='M6205', hint:'Use the card list with slot 12 selected.'},
  {t:'4 · Lose a supply', b:`<p>Switch <b>PSU2</b> off. One supply still runs the frame, but redundancy is gone. Then pick the 150 W rating and see whether the load still fits.</p>`, ok:()=>!F.psu[1], hint:'PSU2 button.'},
  {t:'5 · Stall a fan', b:`<p>Close the door and click a fan. Its TC670 raises FAN_DETECT, the FINC reads the PCA9555 over I²C and sounds the buzzer. Press <b>ALARM SILENCE</b> (SW1).</p>`, ok:()=>F.fans.some(f=>!f)&&F.silenced, hint:'Close the door, click a fan, then ALARM SILENCE.'},
  {t:'6 · Look at the back', b:`<p>Press <b>Rear</b>. Ten 1.32″ bays, each spanning two slots: a single-card module (T63xx) serves one card in the even slot, a dual module (T64xx) serves both. Click the REF1 BNC to remove the reference.</p>`, ok:()=>F.view==='rear'&&!F.ref, hint:'Rear button, then click REF1.'},
  {t:'Done', b:`<p>The <b>Schematics</b> tab redraws the slot connector and the ID ladder, <b>Software</b> shows the addressing as the cards and FINC compute it, and <b>Findings</b> lists what the notes and netlists show.</p>`, ok:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — commissioning an MF6220', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="ln"></div></div><div>${card('Frame', `<div id="fr"></div><div class="ctlbox"></div>`)}${card('Status', `<div id="st"></div>`)}</div></div>`;
  let ctlSig='';
  SIM.on('time', ()=>{
    { const sig=JSON.stringify([F.door,F.sel,F.slots[F.sel],F.psu,F.psuW,F.ref,F.ambient,F.silenced]); if(sig!==ctlSig){ ctlSig=sig; const cb=m.querySelector('.ctlbox'); cb.innerHTML=controlsHTML(); bindControls(cb); } }
    m.querySelector('#fr').innerHTML=F.view==='front'?frontSVG():rearSVG(); bindFrame(m.querySelector('#fr'));
    m.querySelector('#st').innerHTML=statusHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.t}${!l.auto&&l.ok()?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=LESSONS[lesson], ok=L.ok();
    m.querySelector('#ln').innerHTML=`<h2>${L.t}</h2>${L.b}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson--;SIM.refresh();}; m.querySelector('#nx').onclick=()=>{lesson++;SIM.refresh();}; m.querySelector('#rs').onclick=()=>{A.reset();lesson=0;};
  });
}
function viewSecond(m){
  m.innerHTML=`${card('One second in the frame, slow to fast', `<div id="lad"></div>`)}${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time', ()=>{
    const n=F.slots.filter(k=>k!=='empty').length;
    const rows=[['1 s','the simulated second',1],['250 ms','FINC reads the fan board PCA9555 ('+inf().replace(/<[^>]+>/g,'')+')',0.25],['100 ms','FINC CAN round over '+n+' cards ('+inf().replace(/<[^>]+>/g,'')+')',0.1],['16.7 ms','one AC cycle · one reference field',1/60],[(60/(4200*4)*1e3).toFixed(1)+' ms','one fan current pulse (4200 rpm, 4 per rev, '+inf().replace(/<[^>]+>/g,'')+')',60/(4200*4)],['200 µs','a card\'s first ADC read of its slot ID',200e-6],['63.6 µs','one reference line',HL],['4.7 µs','reference H-sync pulse',4.7e-6],['2 µs','one CAN bit at 500 kb/s ('+inf().replace(/<[^>]+>/g,'')+')',2e-6]];
    m.querySelector('#lad').innerHTML=`<svg viewBox="0 0 900 ${rows.length*24+10}" style="width:100%">${rows.map((r,i)=>{ const w=Math.max(2,(Math.log10(r[2])+6)/6*400); return `<rect x="200" y="${6+i*24}" width="${w}" height="16" rx="3" fill="var(--accent)" opacity=".75"/><text x="190" y="${18+i*24}" text-anchor="end" font-size="12" font-family="var(--mono)" fill="var(--ink)">${r[0]}</text><text x="${208+w}" y="${18+i*24}" font-size="11.5" fill="var(--ink2)">${r[1]}</text>`; }).join('')}</svg>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:240});
  });
}
const BLK={
  mid:['MF6220-1 midplane','20 HSEC8-110 slot connectors plus P21 (MEC1) for the FINC. Per slot: POS (+12 V) on pins 1/3/5, NEG (−7.5 V) on 2, AN_SlotID on 6, CAN on 11/13, REF2 on 10, REF1 on 14. The ladder R1–R20 (100K … 681R) gives each slot its address; R24 2K21 gives the frame type to the FINC. 150 Ω from every REF line to GNDD terminates the buffered reference at the slot; R21 121R terminates CAN. Two EDAC-26 PSU connectors and two AC inlet modules.'],
  psu:['PSU1 / PSU2','Hot-swap supplies on EDAC-26 (737-030-525-904): AC in on pins 1–4, +12 V on 15–20, −7.5 V on 21–24, FAULT on 14, PSU_SERIAL (1-Wire) on 13. The Ross PS-8300 is 150 W (DevGuide); the design notes plan a WBS supply on a 200 W PPS-200. The M6245A board fits this connector.'],
  finc:['FINC (Ross MFC-8310), slot 21','Frame controller: CAN to every card, Ethernet and RS-232 out through MF6220-3, I²C to the fan board, 1-Wire to the PSUs (PSU_SERIAL1/2) and to the DS2433 on MF6220-3 (FRM_1WIRE), FAULT input, DIP1–4.'],
  fan:['MF6220-2 fan/alarm board','On the door: five fans (JF1–JF5) each watched by a TC670 (22K1/4K75 threshold, 2 × 20 Ω sense), a PCA9555 I²C expander collecting FAN_DETECT_0–4 and driving FAN_CLR, ALARM, LEDs; buzzer SDT083A through Q1; ALARM SILENCE button SW1; LM86 and TMP75 temperature sensors; EDAC-20 to the midplane. “Our FAN board has only one speed” (design notes).'],
  ref:['MF6220-3 rear ref/comms','Four REF BNCs (two inputs with loop-throughs '+'(inferred)'+'), EL5263 dual buffer, 10 quad 150 Ω arrays feeding REF1_n / REF2_n to all 21 slots, LM1117-5.0 (+5 V) and 79M05 (−5 V from −7.5 V), MagJack Ethernet, two RJHS3381 for RS-232, DIP switch, DS2433S 1-Wire EEPROM.'],
  cards:['Cards and rear modules','20 openGear cards, each with a MEC1 rear connector to a rear module in one of ten 1.32″ bays.'],
};
let blkSel='mid';
function viewBlock(m){
  const pos={psu:[20,40],mid:[300,140],finc:[600,40],fan:[20,250],ref:[600,250],cards:[300,300]};
  const draw=()=>{
    m.innerHTML=card('Block diagram — click a block', `<svg viewBox="0 0 860 380" style="width:100%"><defs><marker id="mfar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>
      ${[['psu','mid','+12 V, −7.5 V, FAULT, 1-Wire'],['finc','mid','CAN, slot 21'],['fan','mid','EDAC-20: I²C, +12 V, ALARM'],['ref','mid','H3/H4/H5: REF, Ethernet, RS-232'],['mid','cards','HSEC8 ×20: power, ID, CAN, REF']].map(([a,b,l])=>{ const A_=pos[a],B_=pos[b]; return `<line x1="${A_[0]+120}" y1="${A_[1]+35}" x2="${B_[0]+120}" y2="${B_[1]+35}" stroke="var(--ink2)" stroke-width="2" marker-end="url(#mfar)"/><text x="${(A_[0]+B_[0])/2+120}" y="${(A_[1]+B_[1])/2+30}" text-anchor="middle" font-size="10" fill="var(--ink2)">${l}</text>`; }).join('')}
      ${Object.entries(pos).map(([k,[x,y]])=>`<g class="blk" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="240" height="70" rx="8" fill="${blkSel===k?'color-mix(in srgb,var(--accent) 25%,var(--panel2))':'var(--panel2)'}" stroke="${blkSel===k?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+120}" y="${y+40}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${BLK[k][0]}</text></g>`).join('')}</svg>`)+card(BLK[blkSel][0], `<p>${BLK[blkSel][1]}</p>`)+
      card('Reference distribution, stage by stage', `<table class="kv"><tr><th>Stage</th><th>Part</th><th>Level</th></tr><tr><td>REF BNC in</td><td>MF6220-3 REF1</td><td class="mono">1.0 V p-p black burst</td></tr><tr><td>Buffer</td><td>EL5263 (gain 2 ${inf('the 150 Ω + 150 Ω divider that follows')})</td><td class="mono">2.0 V p-p</td></tr><tr><td>Back-termination</td><td>21 × 150 Ω (RN1–RN5 quad arrays)</td><td class="mono">load per output 21 × 300 Ω = 14.3 Ω</td></tr><tr><td>Slot termination</td><td>150 Ω to GNDD on the midplane (R23, R25 …)</td><td class="mono">1.0 V p-p at the card pin 14</td></tr></table>`);
    m.querySelectorAll('.blk').forEach(g=>g.onclick=()=>{ blkSel=g.dataset.k; draw(); });
  };
  draw();
}
function viewSchem(m){
  const pins=[[1,'POS +12V',2,'NEG −7V5'],[3,'POS +12V',4,'PSB_BUS_IN1'],[5,'POS +12V',6,'AN_SlotID'],[7,'PSB_BUS_IN2',8,'GND'],[9,'GND',10,'REF2'],[11,'CAN−',12,'GND'],[13,'CAN+',14,'REF1'],[15,'GND',16,'GND'],[17,'RX_N_from_MFC',18,'TX_N_to_MFC'],[19,'RX_P_from_MFC',20,'TX_P_to_MFC']];
  let s=`<svg viewBox="0 0 980 560" style="width:100%;min-width:780px"><text x="10" y="18" font-size="12" fill="var(--warn)">REDRAWN from MF6220-1iss4-NEW.net, MF6220-2iss3.net and MF6220-3iss5-NEW.net — not the original CAD schematics</text>
   <text x="20" y="44" font-size="12" font-weight="700" fill="var(--ink)">Slot connector Pn (HSEC8-110), pins 1–20</text>`;
  pins.forEach((p,i)=>{ const y=60+i*18; s+=`<text x="30" y="${y}" font-size="10.5" font-family="var(--mono)" fill="var(--ink)">${p[0]}</text><text x="55" y="${y}" font-size="10.5" fill="var(--ink2)">${p[1]}</text><rect x="170" y="${y-11}" width="14" height="14" fill="var(--panel2)" stroke="var(--ink2)"/><rect x="186" y="${y-11}" width="14" height="14" fill="var(--panel2)" stroke="var(--ink2)"/><text x="210" y="${y}" font-size="10.5" fill="var(--ink2)">${p[3]}</text><text x="320" y="${y}" font-size="10.5" font-family="var(--mono)" fill="var(--ink)">${p[2]}</text>`; });
  s+=`<text x="420" y="44" font-size="12" font-weight="700" fill="var(--ink)">Slot-ID ladder (one resistor per slot, Pn-6 → GNDD)</text>`;
  SLOT_R.forEach((R,i)=>{ const x=430+(i%10)*54, y=70+Math.floor(i/10)*90; s+=`<line x1="${x+10}" y1="${y}" x2="${x+10}" y2="${y+12}" stroke="var(--ink)"/><path d="M${x+10},${y+12} l-5,4 l10,6 l-10,6 l10,6 l-10,6 l5,4" fill="none" stroke="${i===F.sel?'var(--warn)':'var(--ink)'}"/><line x1="${x+10}" y1="${y+44}" x2="${x+10}" y2="${y+54}" stroke="var(--ink)"/><line x1="${x+3}" y1="${y+54}" x2="${x+17}" y2="${y+54}" stroke="var(--ink)"/><text x="${x+10}" y="${y-4}" text-anchor="middle" font-size="9" fill="var(--ink2)">P${i+1}-6</text><text x="${x+10}" y="${y+68}" text-anchor="middle" font-size="9.5" fill="${i===F.sel?'var(--warn)':'var(--ink)'}">${R>=1000?R/1000+'K':R+'R'}</text>`; });
  s+=`<text x="20" y="290" font-size="12" font-weight="700" fill="var(--ink)">PSU1 / PSU2 (EDAC-26 737-030-525-904)</text>
   ${[['1–2','AC_NEUTRAL'],['3–4','AC_LINE'],['5–12','GND'],['13','PSU_SERIAL1/2 → P21-26 / P21-20'],['14','FAULT (wired-OR) → R66 15K to +12V, R65 5K to GND → P21-10'],['15–20','+12V'],['21–24','−7V5'],['25–26','GND']].map((r,i)=>`<text x="30" y="${310+i*16}" font-size="10.5" font-family="var(--mono)" fill="var(--ink)">${r[0]}</text><text x="90" y="${310+i*16}" font-size="10.5" fill="var(--ink2)">${r[1]}</text>`).join('')}
   <text x="500" y="290" font-size="12" font-weight="700" fill="var(--ink)">Fan board (MF6220-2) per fan k = 0…4</text>
   <text x="510" y="312" font-size="10.5" fill="var(--ink2)">+12FAN → JFk → fan → 2 × 20R → GNDD; C 0.1µ → TC670 SENSE</text>
   <text x="510" y="328" font-size="10.5" fill="var(--ink2)">TC670 THRESHOLD = 22K1 / 4K75 divider · ALERT → FAN_DETECT_k (4K75 pull-up)</text>
   <text x="510" y="344" font-size="10.5" fill="var(--ink2)">FAN_DETECT_0…4 → PCA9555 U1-4…8 · FAN_CLR ← U1-18 · ALARM_SILENCE (SW1) → U1-11</text>
   <text x="510" y="360" font-size="10.5" fill="var(--ink2)">SCL/SDA ← EDAC-20 P1-16/17 (also LM86, TMP75) · ALARM P1-15 · AN_FAN_ID P1-19</text>
   <text x="20" y="460" font-size="12" font-weight="700" fill="var(--ink)">Other midplane nets</text>
   <text x="30" y="480" font-size="10.5" fill="var(--ink2)">CANP/CANN bussed to all 20 slots and P21-23/21, one 121R (R21) across them · AN_FRAME_ID P21-18 → R24 2K21 · REF1_n / REF2_n → 150R to GNDD at each slot (42 resistors)</text>
   <text x="30" y="496" font-size="10.5" fill="var(--ink2)">PSB_INP/INN/OUTP/OUTN 01…10 per slot pair · Ethernet, RS-232 ×2, DIP1–4, FRM_1WIRE between P21 (FINC) and the MF6220-3 header H5</text></svg>`;
  m.innerHTML=card('Schematics — MF6220 boards', `<div class="scroll">${s}</div>`)+card('Midplane parts (MF6220-1 ISS4)', '<p class="small">20 × HSEC8-110-01-S-DV-A, 1 × MEC1-150-02-L-D-A (P21, FINC), 2 × EDAC26 (PSU1/2), 2 × ACMODULE2 (AC1/2), 2 × SAMT-CLP-125 (H4, H5 to MF6220-3), 68 × 0805 resistors (ID ladder, 150 Ω REF terminations, 121R CAN, FAULT divider), 45 × 0805 capacitors, 15 mounting holes.</p>');
}
function viewSoft(m){
  m.innerHTML=`${card('No code in the frame — this is how the cards and the FINC read it', `<div class="grid2"><div><h3>Card side: getSlotID()</h3><pre class="small mono" style="white-space:pre-wrap">unsigned char getSlotID(void)
{
   return 1 + getAdcBin(ADC_SLOTID);   // adclib.c, OGP-SDK-AVR
}
getAdcBin(ch) = 32 - (getAdcValue(ch) + 16) / 32</pre></div><div><h3>Live: slot ${F.sel<20?F.sel+1:'—'}</h3><div id="lv"></div></div></div>`)}
   ${card('All 20 slots and the FINC address (sheet “Midplane Card Addressing” / “Midplane FINC Addressing”)', `<div id="tb"></div>`)}
   ${card('Fan board register view (PCA9555, inferred bit order)', `<div id="pc"></div>`)}`;
  SIM.on('time', ()=>{
    const i=Math.min(F.sel,19), R=SLOT_R[i], a=adcOf(R);
    m.querySelector('#lv').innerHTML=`<table class="kv"><tr><th>Resistor</th><td class="mono">R${i+1} ${R>=1000?R/1000+' kΩ':R+' Ω'}</td></tr><tr><th>Voltage</th><td class="mono">3.3 × R/(R+1000) = ${(3.3*R/(R+1000)).toFixed(3)} V</td></tr><tr><th>ADC</th><td class="mono">${a}</td></tr><tr><th>bin</th><td class="mono">32 − (${a}+16)/32 = ${bin(a)}</td></tr><tr><th>getSlotID()</th><td class="mono">${slotId(i)}</td></tr></table>`;
    m.querySelector('#tb').innerHTML=`<div class="scroll"><table class="kv"><tr><th>Slot</th>${SLOT_R.map((_,k)=>`<td>${k+1}</td>`).join('')}<td>FINC</td></tr><tr><th>R</th>${SLOT_R.map(R=>`<td class="mono small">${R>=1000?R/1000+'K':R}</td>`).join('')}<td class="mono small">2K21</td></tr><tr><th>ADC</th>${SLOT_R.map(R=>`<td class="mono small">${adcOf(R)}</td>`).join('')}<td class="mono small">${adcOf(2210)}</td></tr><tr><th>ID</th>${SLOT_R.map((R,k)=>`<td class="mono small" style="${k===F.sel?'color:var(--warn);font-weight:700':''}">${slotId(k)}</td>`).join('')}<td class="mono small">${1+bin(adcOf(2210))}</td></tr></table></div><p class="small muted">Every slot decodes to its own number with 1 % resistors and a 3.28–3.31 V rail (the sheet's worst-case columns). The FINC sees AN_FRAME_ID = 2K21 as type 11, “WBS – MF6220-1”.</p>`;
    const b=budget(); const bits=[0,0,0,0,...F.fans.map(f=>f?0:1),0,0,F.silenced?1:0,0,0,0,0,0,b.alarm?1:0,0];
    m.querySelector('#pc').innerHTML=`<p class="small">Pins from MF6220-2iss3.net: FAN_DETECT_0…4 on U1-4…8, ALARM_SILENCE on U1-11, FAN_CLR on U1-18, NET00022/23/24/25 (LED and buzzer drivers) on U1-13…16. Register bit numbering below follows the PCA9555 pin order ${inf('the PCA9555 datasheet; the FINC firmware is not in the archive')}.</p><div class="mono small">${['U1-4 FAN_DETECT_0','U1-5 FAN_DETECT_1','U1-6 FAN_DETECT_2','U1-7 FAN_DETECT_3','U1-8 FAN_DETECT_4','U1-11 ALARM_SILENCE','U1-18 FAN_CLR','ALARM (buzzer, red LED)'].map((n,k)=>{ const v=[...F.fans.map(f=>!f),F.silenced,false,b.alarm][k]; return `<span class="chip" style="${v?'background:var(--bad);color:#fff':''}">${n} = ${v?1:0}</span>`; }).join('')}</div>`;
  });
}
function viewFind(m){
  const Fd=[
    '<b>Slot pitch alternates, and slot 20 is cramped.</b> The design notes give 0.650″/0.670″ alternating pitch and 0.820″ between slot 20 and the FINC, leaving about 0.600″ of component height at position 20. They also note the Ross DFR-8310 already breaks the 0.800″ height spec at its position 10.',
    '<b>Only one CAN terminator on the midplane.</b> CANP/CANN run to all 20 slots and the FINC with a single 121 Ω (R21). The DevGuide says the bus “is terminated on the midplane”; a CAN bus normally needs a terminator at each end, so the other one would have to be on the FINC ' + inf('ISO 11898 practice') + '.',
    '<b>The reference plan was built as written.</b> The notes propose buffering the reference and driving every slot from a back-terminated line, “maybe 150 Ω to conserve power”. MF6220-3 ISS5 does exactly that: an EL5263 drives 21 × 150 Ω arrays, and the midplane terminates every REF line with 150 Ω at the slot. Each buffer output sees 21 × 300 Ω ≈ 14 Ω.',
    '<b>Every slot is already terminated.</b> The notes say cards “will therefore need to terminate the reference inputs … jumper settable”. With the 150 Ω midplane terminations in ISS4, a card that also terminates halves the reference level at its slot.',
    '<b>The −7.5 V rail is the weak point.</b> The notes ask the spec to limit −7.5 V to 200 mA per double slot because the regulator gives only 2.5 A; the DevGuide allows 1 A per slot. The M6245A board in this series makes −7.5 V with a PTN78020A wired as an inverter and fuses it with a 0.5 A polyfuse.',
    '<b>Same TC670 circuit twice.</b> The fan board\'s per-fan detector (22K1/4K75 threshold, two 20 Ω sense resistors) is copied onto the M6245A, but only the fan board wires FAN_CLR.',
    '<b>The FINC knows the frame.</b> AN_FRAME_ID R24 = 2K21 decodes to address 11, the “WBS – MF6220-1” row of the FINC addressing sheet; addresses 12–14 are reserved for WBS.',
    '<b>Slot IDs match the sheet.</b> R1–R20 in the ISS4 netlist (100K, 30K9 … 681R) are exactly the “Selected R” column of “Midplane Card Addressing”; the ladder reaches 32 entries, but the MF6220 uses 20 and the DFR-8310 10.',
    '<b>“One speed” fans.</b> The notes say the fan board has one speed and the FINC must recognise that for auto mode; MF6220-2 has no PWM controller: a 3-pin header H1 feeds +12FAN either straight from +12 V or through the NDC652 switch Q9 (driven by Q2 from the PCA9555), so the fans are on or off.',
    '<b>An empty twin.</b> <span class="mono">MF6220 #Engineering #TIM/</span> repeats the engineering tree with no files; the folder is tagged OBSOLETE and the frame was presumably replaced by Ross-built frames ' + inf() + '.',
  ];
  m.innerHTML=card('Findings — MF6220', `<ol>${Fd.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}</ol>`)+
    card('Photos of the prototype (from the M6245A folder)', `<div class="grid2"><div><img src="${ASSET}mf6220-midplane.jpg" alt="MF6220 midplane with slot connectors" style="max-width:100%;border-radius:8px"><p class="small muted">MVC-008F: midplane, slot connectors and the PSU EDAC connectors.</p></div><div><img src="${ASSET}mf6220-fan-door.jpg" alt="MF6220 door fan board with five fans" style="max-width:100%;border-radius:8px"><p class="small muted">MVC-012F: the five-fan door board (MF6220-2) in front of the card cage and the two supplies.</p></div></div>`);
}

SIM.register({
  id:'mf6220-frame', product:'MF6220 - FRAME', name:'MF6220 · Ward-Beck 20-slot openGear frame (2006|39)', year:2006, family:'openGear',
  folder:'#OPENGEAR #SERIES/XXX - MF6220 - FRAME  #Master #OPENGEAR #OBSOLETE',
  summary:'Ward-Beck\'s own 2RU, 20-slot openGear frame: a midplane with a slot-ID resistor ladder and buffered 150 Ω reference to every slot, a five-fan alarm door and a rear reference/comms board. Two hot-swap supplies, a Ross FINC in slot 21. Obsolete.',
  highlights:['Front and rear drawn to scale from the design notes','Slot-ID ladder decoded per slot','Power, −7.5 V and fan alarms','Reference distribution to 21 slots','CAN, I²C and fan timing over one second'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 reference field',period:()=>FIELD},{label:'1 ms',period:()=>0.001},{label:'1 reference line',period:()=>HL},{label:'100 ms (CAN round)',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.1,'100 ms (CAN round)'],[FIELD,'1 field'],[0.004,'4 ms'],[HL*3,'3 lines']],
  defaultZoom:0,
  init(){},
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: commissioning the frame',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Addressing code',render:viewSoft},
    {id:'findings',label:'Findings',render:viewFind},
  ],
});
})();
