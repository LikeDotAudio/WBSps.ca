/* =====================================================================
   M6245A — power-supply interface / monitor board (Ward-Beck Systems, 2007|40)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all in this archive):
   - #OPENGEAR #SERIES/M6245A #Engineering #TIM/M6245A.net, .ECO, .ERR, OnlineDRC.ERR.txt, COMPSWAP.LOG
   - .../M6245A #Engineering #TIM/psu temp/MVC-008F/011F/012F.JPG (frame and PSU bay photos)
   - XXX - MF6220 - FRAME .../PCB/MF6220-1/WORKING/ISSUE4/MF6220-1iss4-NEW.net (PSU1/PSU2 EDAC26 pinout)
   - XXX - MF6220 - FRAME .../MF6220 - #Engineering/design notes.doc (PSU plan, −7.5 V limit)
   - XXX - MF6220 - FRAME .../PCB/MF6220-2/MF6220-2iss3.net (same TC670 fan circuit)
   - #OPEN GEAR - #Engineering/.../PSU SERIAL AN126.pdf (1-Wire timing), openGear DevGuide Part I (rails)
   No Gerbers, BOM, drawings or firmware exist for this board; anything else is marked "inferred".
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = why => `<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b) => `<div class="card"><h2>${t}</h2>${b}</div>`;

/* ---------------- constants (netlist values; datasheet behaviour marked) ---------------- */
const K = {
  VBRICK: 12.5,        // net name +12V5 on J2 (the AC/DC brick output) — the brick itself is not in the archive
  VNEG: 7.5,           // net name -7V5; set by R1 9K53 on the PTN78020A adjust pin
  RSH: 0.01,           // R2 ‖ R3, 0R02 each
  GZX: 0.01,           // ZXCT1009: Iout = 10 mA per volt of sense voltage (datasheet)
  R10: 174,            // R10 174R turns Iout into the DS2438 Vsens voltage
  DS_LSB_I: 0.2441e-3, // DS2438 current ADC LSB (datasheet), ±250 mV range
  PTC_HOLD: 0.5, PTC_TRIP: 1.0, PTC_R: 0.7, // RXE050 hold/trip current, typical resistance (datasheet)
  PTC_T25: 4.0,        // RXE050 max time-to-trip 4.0 s at 2.5 A (datasheet); I²t scaling inferred
  EFF: 0.85,           // PTN78020A efficiency in the inverting connection — inferred
  FSW: 650e3,          // PTN78020A switching frequency — inferred
  TH: 5*4750/(22100+4750), // TC670 THRESHOLD from R22 22K1 / R23 4K75 off +5 V
  FAN_PULSES: 4,       // current pulses per revolution seen by TC670 SENSE — inferred (4-pole fan)
  ADC_I_RATE: 36.41,   // DS2438 current conversions per second (datasheet)
  POLL_T0: 0.020,      // when the frame controller polls the board in this second — inferred
};
/* AN126 standard-speed 1-Wire timing (µs): A 6, B 64, C 60, D 10, E 9, F 55, G 0, H 480, I 70, J 410 */
const OW = {A:6e-6,B:64e-6,C:60e-6,D:10e-6,E:9e-6,F:55e-6,H:480e-6,I:70e-6,J:410e-6};

/* ---------------- device state ---------------- */
const D = { ac:true, brick:true, load12:6, load7:1.0, fanRpm:4200, fanOn:true, ambient:25, intended:false, setAt:0, log:[], last:null, sel:'ptn' };

function vf(i){ return i<=0? 0 : 0.30 + 0.025*i; }               // MBR4045PT forward drop — inferred from the part family
function ptcTrip(i, setAt){ if (i <= K.PTC_TRIP) return Infinity; return setAt + K.PTC_T25*Math.pow(2.5/i,2); }
function model(t){
  t = (t===undefined)? SIM.t : t;
  const m = {};
  m.vin = (D.ac && D.brick)? K.VBRICK : 0;
  m.t12 = ptcTrip(D.load12, D.setAt); m.t7 = ptcTrip(D.load7, D.setAt);
  m.trip12 = t >= m.t12; m.trip7 = t >= m.t7;
  const i12 = m.vin && !m.trip12 ? D.load12 : 0, i7 = m.vin && !m.trip7 ? D.load7 : 0;
  m.v12 = m.vin? Math.max(0, m.vin - vf(i12) - i12*K.PTC_R) : 0; if (m.trip12) m.v12 = m.vin? m.vin*0.05 : 0;
  m.vneg = m.vin? -(K.VNEG - vf(i7) - i7*K.PTC_R) : 0; if (m.trip7) m.vneg = m.vin? -0.3 : 0;
  m.i12 = i12; m.i7 = i7;
  m.iPtnIn = m.vin? (K.VNEG*i7)/(K.EFF*m.vin) : 0;
  m.ifan = (D.fanOn && m.vin)? 0.12 : 0;
  m.iBrick = i12 + m.iPtnIn + m.ifan + (m.vin?0.01:0);
  m.vsense = D.intended? m.iBrick*K.RSH : 0;                 // as built the shunt carries no load current
  m.iout = m.vsense*K.GZX; m.vSens = m.iout*K.R10;
  m.curReg = Math.round(m.vSens/K.DS_LSB_I);
  m.diss = vf(i12)*i12 + i12*i12*K.PTC_R + vf(i7)*i7 + i7*i7*K.PTC_R + K.VNEG*i7*(1/K.EFF-1);
  m.temp = D.ambient + 1.2*m.diss;                            // board heating, °C per W — inferred
  m.fanAlarm = !(D.fanOn && m.vin) || D.fanRpm < 1500;        // TC670 alert threshold mapped to ~1500 rpm — inferred
  m.fantach = m.vin? (m.fanAlarm? 0.05 : m.vin*1000/2000) : 0; // R7 1K to +12V5, R8 1K to GND; ALERT pulls low
  m.v5 = m.vin? 5.0 : 0;
  m.fault = !(D.ac && D.brick);
  return m;
}

/* DS2438 page-0 bytes the frame controller reads back */
function crc8(bytes){ let c=0; for (const b0 of bytes){ let b=b0; for (let i=0;i<8;i++){ const mix=(c^b)&1; c>>=1; if(mix) c^=0x8C; b>>=1; } } return c; }
function page0(m){
  const tr = Math.round(m.temp/0.03125)<<3; const vr = Math.round(m.fantach/0.01); const ir = m.curReg & 0x3FF;
  const b=[0x0F, tr&0xFF, (tr>>8)&0xFF, vr&0xFF, (vr>>8)&0x03, ir&0xFF, (ir>>8)&0x03, 0x40];
  b.push(crc8(b)); return b;
}

/* ---------------- 1-Wire poll by the frame controller ---------------- */
let POLL=null;
function owSchedule(){
  const ev=[]; let t=K.POLL_T0;
  const reset=lbl=>{ ev.push({t, d:OW.H, k:'reset', lbl}); t+=OW.H; ev.push({t, d:OW.I+OW.J, k:'presence', lbl:'presence pulse'}); t+=OW.I+OW.J; };
  const wbyte=(v,lbl)=>{ for(let i=0;i<8;i++){ const bit=(v>>i)&1; ev.push({t, d: bit?OW.A:OW.C, k:'w'+bit, slot: bit?OW.A+OW.B:OW.C+OW.D, lbl:lbl+' bit'+i+'='+bit}); t+= bit? OW.A+OW.B : OW.C+OW.D; } };
  const rbyte=(v,lbl)=>{ for(let i=0;i<8;i++){ const bit=(v>>i)&1; ev.push({t, d: bit?OW.A:OW.A+OW.E+30e-6, k:'r'+bit, slot:OW.A+OW.E+OW.F, lbl:lbl+' bit'+i+'='+bit}); t+=OW.A+OW.E+OW.F; } };
  const blocks=[];
  const blk=(name,fn)=>{ const a=t; fn(); blocks.push({name,a,b:t}); };
  blk('Reset · Skip ROM 0xCC · Convert T 0x44',()=>{ reset('reset'); wbyte(0xCC,'CC'); wbyte(0x44,'44'); });
  blocks.push({name:'DS2438 converts temperature (≤10 ms)', a:t, b:t+0.010, conv:true}); t+=0.012;
  blk('Reset · CC · Convert V 0xB4 (VAD = FANTACH)',()=>{ reset('reset'); wbyte(0xCC,'CC'); wbyte(0xB4,'B4'); });
  blocks.push({name:'DS2438 converts VAD (≤10 ms)', a:t, b:t+0.010, conv:true}); t+=0.012;
  blk('Reset · CC · Recall Memory 0xB8 00',()=>{ reset('reset'); wbyte(0xCC,'CC'); wbyte(0xB8,'B8'); wbyte(0x00,'00'); });
  const pg=page0(model(t));
  blk('Reset · CC · Read Scratchpad 0xBE 00 · 9 bytes',()=>{ reset('reset'); wbyte(0xCC,'CC'); wbyte(0xBE,'BE'); wbyte(0x00,'00'); pg.forEach((v,i)=>rbyte(v,'byte'+i)); });
  return {ev, blocks, pg, end:t};
}
function poll(){ POLL = owSchedule(); return POLL; }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.last={name,tr,t:SIM.t}; D.log.unshift({name,t:SIM.t}); if(D.log.length>40) D.log.length=40; POLL=null; SIM.refresh(); }
const A = {
  ac(v){ act(v?'AC mains on':'AC mains off', tr=>{ D.ac=v; tr(v?'LINE/NEUTRAL arrive on P1-3/4 and P1-1/2 from the midplane AC inlet → F1 → J1-3/J1-1 → brick':'No AC on P1-1…4: brick output collapses, +12V5 → 0'); tr('Brick FAULT on P2-1 → P1-14 → midplane FAULT (wired-OR with the other PSU, R66 15K / R65 5K) → FINC P21-10'); }); },
  brick(v){ act(v?'Brick restored':'Brick fails', tr=>{ D.brick=v; tr(v?'+12V5 back on J2-1…3':'+12V5 on J2 drops to 0: D3/D4 block the other PSU from back-feeding through this board'); }); },
  load12(a){ act('+12 V load = '+a.toFixed(1)+' A', tr=>{ D.load12=a; D.setAt=SIM.t; const m=model(); tr(`+12V5 → D3/D4 (MBR4045PT, ${vf(a).toFixed(2)} V) → F2 RXE050 PTC (${(a*K.PTC_R).toFixed(2)} V) → P1-15…20 = ${m.v12.toFixed(2)} V`); if (a>K.PTC_TRIP) tr(`Above the 1.0 A trip current: F2 trips about ${(m.t12-SIM.t).toFixed(3)} s from now (I²t estimate)`); else if (a>K.PTC_HOLD) tr('Between hold (0.5 A) and trip (1.0 A): F2 may or may not trip'); }); },
  load7(a){ act('−7.5 V load = '+a.toFixed(1)+' A', tr=>{ D.load7=a; D.setAt=SIM.t; const m=model(); tr(`PTN78020A inverting: module GND pins 1/7 = −Vout (NET00020) → FB2 → D1 (MBR4045PT) → F3 RXE050SMT → P1-21…24 = ${m.vneg.toFixed(2)} V`); tr(`Input current from +12V5 ≈ ${m.iPtnIn.toFixed(2)} A (η ${K.EFF} ${'inferred'})`); }); },
  fan(on,rpm){ act(on? 'Fan at '+rpm+' rpm':'Fan stalled', tr=>{ D.fanOn=on; if(rpm) D.fanRpm=rpm; const m=model(); tr('Fan current pulses across R20‖R21 (10 Ω) → C14 → TC670 SENSE (U6-6)'); tr(m.fanAlarm? 'TC670 ALERT (U6-5) pulls FANTACH low → DS2438 VAD reads ≈0 V' : `FANTACH idles at ${m.fantach.toFixed(2)} V (R7/R8 divider from +12V5) → DS2438 VAD`); tr('FAN_CLR (U6-3) has no other node: the alert can only be cleared by power-cycling the board'); }); },
  intended(v){ act(v?'Rewire shunt in series (as intended)':'Shunt as built', tr=>{ D.intended=v; const m=model(); tr(v? `Brick current ${m.iBrick.toFixed(2)} A × 0.01 Ω = ${(m.vsense*1000).toFixed(1)} mV → ZXCT1009 ${(m.iout*1e3).toFixed(3)} mA → R10 174R = ${(m.vSens*1000).toFixed(1)} mV → DS2438 current register ${m.curReg}` : 'As built, R2/R3 join +12V5 to NET00008, which only reaches the ZXCT1009 S− pin and C10: no load current flows through them, so the current reading stays at 0.'); }); },
  ambient(c){ act('Ambient '+c+' °C', tr=>{ D.ambient=c; tr('DS2438 internal sensor: board temperature '+model().temp.toFixed(1)+' °C'); }); },
  poll(){ act('Frame controller polls the DS2438', tr=>{ const p=poll(); tr('PSU_SERIAL (P1-13, DS2438 DQ, R5 20K pull-up to +5 V) ← midplane PSU_SERIAL1 → FINC P21-26'); p.blocks.forEach(b=>tr(`${(b.a*1e3).toFixed(2)} ms: ${b.name}`)); tr('Page 0: '+p.pg.map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ')+' (last byte = CRC8)'); }); },
  reset(){ act('Reset bench', tr=>{ Object.assign(D,{ac:true,brick:true,load12:6,load7:1.0,fanRpm:4200,fanOn:true,ambient:25,intended:false,setAt:0}); tr('Defaults'); }); },
};

/* ---------------- board drawing (functional layout from the netlist; no artwork exists) ---------------- */
const PARTS = {
  p1:  {x:20, y:40, w:60, h:330, t:'P1', s:'EDAC 26/156 edge', d:'26-way EDAC card edge that plugs into the MF6220 midplane PSU1/PSU2 connector (737-030-525-904). 1–2 NEUTRAL, 3–4 LINE, 5–12 GND, 13 PSU_SERIAL, 14 FAULT, 15–20 +12V, 21–24 −7V5, 25–26 GND — identical to the midplane PSU1 pinout in MF6220-1iss4-NEW.net.'},
  f1:  {x:110,y:40, w:90, h:50, t:'F1', s:'mains fuse {Value}', d:'Four-pin fuse holder between the edge LINE pins (P1-3/4) and J1-3. Its value is “{Value}” in the netlist.'},
  j1:  {x:230,y:40, w:80, h:50, t:'J1', s:'PAN356 AC out', d:'AC to the brick: J1-1 NEUTRAL, J1-3 fused LINE. The brick (a 12.5 V AC/DC supply, the design notes suggest a 200 W PPS-200) is off-board.'},
  j2:  {x:340,y:40, w:90, h:60, t:'J2', s:'PAN656 +12V5 in', d:'DC back from the brick: J2-1…3 +12V5, J2-4…6 GND.'},
  sh:  {x:340,y:130,w:90, h:50, t:'R2‖R3', s:'0R02 ‖ 0R02', d:'Intended current shunt (0.01 Ω). In the netlist both resistors run from +12V5 to NET00008, which reaches only the ZXCT1009 S− pin and C10: they are not in series with anything.'},
  zx:  {x:460,y:130,w:90, h:50, t:'U2', s:'ZXCT1009', d:'High-side current monitor: Iout (pin 1) = 10 mA/V × sense voltage, into R10 174R → DS2438 Vsens+.'},
  ds:  {x:580,y:130,w:110,h:80, t:'U1', s:'DS2438 1-Wire', d:'Battery monitor used as a PSU monitor: temperature (internal), current (Vsens± from U2/R10), voltage (VAD ← FANTACH via R6 10K). DQ = PSU_SERIAL with R5 20K pull-up to +5 V, out on P1-13.'},
  d34: {x:110,y:220,w:110,h:60, t:'D3, D4', s:'MBR4045PT OR-ing', d:'Two dual 40 A Schottky diodes from +12V5 to NET00007, so two supplies can share the midplane +12 V without back-feeding each other.'},
  f2:  {x:110,y:310,w:110,h:50, t:'F2', s:'RXE050 PTC', d:'Polyfuse on the whole +12 V output: 0.5 A hold, 1.0 A trip (datasheet). A full frame draws up to 2 A per slot.'},
  reg2:{x:250,y:220,w:90, h:60, t:'REG2', s:'LM1117-5.0', d:'+5 V for the DS2438, TC670 and pull-ups, from NET00007 (after the OR diodes).'},
  ptn: {x:370,y:230,w:140,h:90, t:'REG1', s:'PTN78020A', d:'TI wide-input switching module wired as a positive-to-negative converter: its Vout pin 6 is tied to GNDD and its GND pins 1 and 7 become the −7.5 V node (NET00020). R1 9K53 from the adjust pin 4 sets the output. Input from +12V5 through FB1.'},
  d1:  {x:540,y:250,w:90, h:50, t:'D1', s:'MBR4045PT', d:'OR-ing diode for the negative rail: anodes on F3 (output side), cathode on the converter side.'},
  f3:  {x:540,y:320,w:90, h:45, t:'F3', s:'RXE050SMT', d:'Polyfuse on −7V5 (P1-21…24).'},
  tc:  {x:720,y:130,w:100,h:70, t:'U6', s:'TC670 fan fail', d:'Fan-fail detector: SENSE (pin 6) via C14 from the fan return R20‖R21 (10 Ω); THRESHOLD pin 1 at 0.885 V (R22 22K1 / R23 4K75); ALERT pin 5 = FANTACH; CLEAR pin 3 = FAN_CLR, connected to nothing else.'},
  p3:  {x:720,y:250,w:100,h:50, t:'P3', s:'fan PAN300', d:'Fan: P3-2 +12V5, P3-1 return through R20‖R21 20 Ω ‖ 20 Ω, P3-3 GND.'},
  p2:  {x:720,y:320,w:100,h:45, t:'P2', s:'FAULT PAN300', d:'Brick status in: P2-1 FAULT → P1-14, P2-2/3 GND.'},
};
function boardSVG(){
  const m=model();
  const on=(k)=>({j2:m.vin>0,sh:D.intended&&m.vin>0,d34:m.i12>0,f2:!m.trip12&&m.vin>0,ptn:m.vin>0&&!m.trip7,d1:m.i7>0,f3:!m.trip7&&m.vin>0,tc:m.fanAlarm,j1:D.ac,f1:D.ac,reg2:m.vin>0,ds:true,zx:m.vin>0,p3:D.fanOn&&m.vin>0,p2:m.fault,p1:true})[k];
  let s=`<svg viewBox="0 0 860 400" style="width:100%;display:block;border-radius:8px" role="img" aria-label="M6245A functional board layout">
   <rect x="5" y="5" width="850" height="390" rx="8" fill="#14532d" stroke="#0b2e19"/>
   <text x="840" y="388" text-anchor="end" font-size="11" fill="#cfe9d6">M6245A · functional layout from M6245A.net — not to scale (no Gerbers or drawings exist)</text>`;
  const wire=(pts,c,w)=>`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w||3}" opacity=".85"/>`;
  s+=wire('80,65 110,65', D.ac?'#e0b04a':'#5b6b5f')+wire('200,65 230,65', D.ac?'#e0b04a':'#5b6b5f');
  s+=wire('385,100 385,130', m.vin?'#e66':'#5b6b5f')+wire('430,155 460,155','#9cc')+wire('550,155 580,155','#9cc');
  s+=wire('385,180 385,200 165,200 165,220', m.vin?'#e66':'#5b6b5f')+wire('165,280 165,310', m.i12?'#e66':'#5b6b5f')+wire('110,335 80,335', m.v12>1?'#e66':'#5b6b5f');
  s+=wire('385,200 440,200 440,230', m.vin?'#e66':'#5b6b5f')+wire('510,275 540,275', m.i7?'#6af':'#5b6b5f')+wire('585,300 585,320', m.i7?'#6af':'#5b6b5f')+wire('540,345 520,345 520,380 80,380 80,360', m.vneg<-1?'#6af':'#5b6b5f');
  s+=wire('220,250 250,250', m.vin?'#e66':'#5b6b5f')+wire('690,170 720,170','#9cc')+wire('770,200 770,250','#9cc')+wire('635,210 635,230 80,230', '#9cc',2);
  for (const k in PARTS){ const p=PARTS[k], lit=on(k), sel=D.sel===k;
    s+=`<g class="pt" data-k="${k}" style="cursor:pointer"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="5" fill="${k==='tc'&&lit?'#7a1d12':'#1d2023'}" stroke="${sel?'#ffd34d':lit?'#7dff6a':'#59605c'}" stroke-width="${sel?3:1.5}"/>
      <text x="${p.x+p.w/2}" y="${p.y+p.h/2-3}" text-anchor="middle" font-size="12" font-weight="700" fill="#eef">${p.t}</text>
      <text x="${p.x+p.w/2}" y="${p.y+p.h/2+12}" text-anchor="middle" font-size="9.5" fill="#bcc">${p.s}</text></g>`; }
  s+=`<text x="30" y="30" font-size="11" fill="#cfe9d6">← to MF6220 midplane PSU slot</text>`;
  return s+'</svg>';
}
function bindBoard(root){ root.querySelectorAll('.pt').forEach(g=>g.onclick=()=>{ D.sel=g.dataset.k; SIM.refresh(); }); }
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px" class="small">
   <label><input type="checkbox" data-c="ac" ${D.ac?'checked':''}> AC mains</label>
   <label><input type="checkbox" data-c="brick" ${D.brick?'checked':''}> brick healthy</label>
   <label>+12 V load <input type="range" data-c="l12" min="0" max="20" step="0.5" value="${D.load12}"> <b>${D.load12.toFixed(1)} A</b></label>
   <label>−7.5 V load <input type="range" data-c="l7" min="0" max="4" step="0.1" value="${D.load7}"> <b>${D.load7.toFixed(1)} A</b></label>
   <label>Fan <input type="range" data-c="fan" min="0" max="6000" step="100" value="${D.fanOn?D.fanRpm:0}"> <b>${D.fanOn?D.fanRpm+' rpm':'stalled'}</b></label>
   <label>Ambient <input type="range" data-c="amb" min="0" max="50" value="${D.ambient}"> ${D.ambient} °C</label>
   <label><input type="checkbox" data-c="int" ${D.intended?'checked':''}> shunt in series (as intended)</label>
   <button data-c="poll">Frame controller polls DS2438</button><button data-c="reset">Reset</button></div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{ const k=el.dataset.c;
    if (k==='ac') el.onchange=()=>A.ac(el.checked); if (k==='brick') el.onchange=()=>A.brick(el.checked);
    if (k==='l12') el.onchange=()=>A.load12(+el.value); if (k==='l7') el.onchange=()=>A.load7(+el.value);
    if (k==='fan') el.onchange=()=>A.fan(+el.value>0, +el.value||D.fanRpm); if (k==='amb') el.onchange=()=>A.ambient(+el.value);
    if (k==='int') el.onchange=()=>A.intended(el.checked); if (k==='poll') el.onclick=()=>A.poll(); if (k==='reset') el.onclick=()=>A.reset(); });
}
function readoutHTML(t){
  const m=model(t);
  const row=(a,b,ok)=>`<tr><th>${a}</th><td class="mono" style="${ok===false?'color:var(--bad)':''}">${b}</td></tr>`;
  return `<table class="kv">
   ${row('+12V5 from brick (J2)', m.vin.toFixed(2)+' V', m.vin>0)}
   ${row('+12 V to midplane (P1-15…20)', m.v12.toFixed(2)+' V · '+m.i12.toFixed(2)+' A'+(m.trip12?' · F2 TRIPPED':m.t12<Infinity?' · F2 trips at '+SIM.fmtT(m.t12):''), !m.trip12 && m.v12>10.8)}
   ${row('−7.5 V to midplane (P1-21…24)', m.vneg.toFixed(2)+' V · '+m.i7.toFixed(2)+' A'+(m.trip7?' · F3 TRIPPED':m.t7<Infinity?' · F3 trips at '+SIM.fmtT(m.t7):''), !m.trip7 && m.vneg<-6.4)}
   ${row('DevGuide limits', '+12 V: 10.8–13.2 V · −7.5 V: −8.6 to −6.4 V')}
   ${row('Brick current (true)', m.iBrick.toFixed(2)+' A')}
   ${row('DS2438 current register', m.curReg+' LSB = '+(m.curReg*K.DS_LSB_I*1000).toFixed(1)+' mV'+(D.intended?'':' (shunt not in the load path)'), D.intended?undefined:false)}
   ${row('DS2438 temperature', m.temp.toFixed(2)+' °C')}
   ${row('DS2438 VAD = FANTACH', m.fantach.toFixed(2)+' V → '+(m.fanAlarm?'FAN ALARM':'fan OK'), !m.fanAlarm)}
   ${row('FAULT (P1-14)', m.fault?'asserted':'clear', !m.fault)}
  </table>`;
}

/* ---------------- timeline ---------------- */
function lanes(){
  const m=model(), css=SIM.css, p=POLL||poll();
  const L=[];
  L.push({label:'AC mains 60 Hz (LINE)', h:34, draw(c,X,a,b,y,h){ if(!D.ac){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('off',X(a)+6,y+h/2+4); return; } const span=b-a, pw=X(b)-X(a); c.strokeStyle=css('--warn'); if(span*60>pw/3){ c.globalAlpha=.3; c.fillStyle=css('--warn'); c.fillRect(X(a),y+6,pw,h-12); c.globalAlpha=1; return; } c.beginPath(); for(let i=0;i<=400;i++){ const t=a+span*i/400, v=Math.sin(2*Math.PI*60*t); i?c.lineTo(X(t),y+h/2-v*(h/2-4)):c.moveTo(X(t),y+h/2-v*(h/2-4)); } c.stroke(); }});
  L.push({label:'PTN78020A switching ('+(K.FSW/1e3)+' kHz, inferred)', h:22, draw(c,X,a,b,y,h){ if(m.vin&&!m.trip7) SIM.pulses(c,X,a,b,y,h,1/K.FSW,0,0.4/K.FSW,css('--accent2'),'cycles'); }});
  L.push({label:'Fan current pulses → TC670 SENSE', h:22, draw(c,X,a,b,y,h){ if(D.fanOn&&m.vin){ const f=D.fanRpm/60*K.FAN_PULSES; SIM.pulses(c,X,a,b,y,h,1/f,0,0.25/f,css('--accent'),'pulses'); } }});
  L.push({label:'DS2438 current ADC (36.41 /s)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,1/K.ADC_I_RATE,0,0.5/K.ADC_I_RATE,css('--ink2'),'conversions'); }});
  L.push({label:'1-Wire PSU_SERIAL (DQ low = dark)', h:30, draw(c,X,a,b,y,h){
    p.blocks.forEach(bk=>{ if(bk.b<a||bk.a>b) return; c.fillStyle=bk.conv?css('--grid'):css('--warn'); c.globalAlpha=bk.conv?1:.35; c.fillRect(X(bk.a),y+3,Math.max(1,X(bk.b)-X(bk.a)),h-6); c.globalAlpha=1; });
    const pxs=(X(b)-X(a))/(b-a); if (pxs*6e-6 > 0.6){ c.fillStyle=css('--ink'); p.ev.forEach(e=>{ if(e.t+e.d<a||e.t>b||e.k==='presence') return; c.fillRect(X(e.t),y+8,Math.max(1,X(e.t+e.d)-X(e.t)),h-16); }); p.ev.filter(e=>e.k==='presence').forEach(e=>{ if(e.t>b||e.t+e.d<a) return; c.fillStyle=css('--accent'); c.fillRect(X(e.t+15e-6),y+8,Math.max(1,X(e.t+135e-6)-X(e.t+15e-6)),h-16); }); }
    else { c.fillStyle=css('--ink'); c.font='10px sans-serif'; p.blocks.forEach(bk=>{ if(X(bk.b)-X(bk.a)>60 && bk.a<b && bk.b>a) c.fillText(bk.name.slice(0,Math.floor((X(bk.b)-X(bk.a))/6)),Math.max(X(a),X(bk.a))+3,y+h/2+4); }); }
  }});
  L.push({label:'F2 / F3 polyfuse state', h:22, draw(c,X,a,b,y,h){ [[m.t12,'F2 +12 V',css('--bad')],[m.t7,'F3 −7.5 V',css('--warn')]].forEach(([tt,l,col],i)=>{ if(tt<Infinity&&tt<=b){ c.fillStyle=col; c.fillRect(X(Math.max(a,tt)),y+4+i*8,X(b)-X(Math.max(a,tt)),7); c.fillStyle=css('--ink'); c.font='10px sans-serif'; if(tt>=a) c.fillText(l+' trips',X(tt)+3,y+11+i*8); } }); }});
  return L;
}
function drawScope(cv,t){
  const {c,w}=SIM.canvas(cv,150), p=POLL||poll(), css=SIM.css;
  const span=400e-6, a=t-span/2;
  c.strokeStyle=css('--grid'); for(let i=0;i<=8;i++){ c.beginPath(); c.moveTo(10+i*(w-20)/8,10); c.lineTo(10+i*(w-20)/8,120); c.stroke(); }
  c.strokeStyle=css('--accent'); c.lineWidth=1.6; c.beginPath();
  for (let i=0;i<=800;i++){ const tt=a+span*i/800; let low=false; for(const e of p.ev){ if(e.k==='presence'){ if(tt>=e.t+15e-6&&tt<e.t+135e-6) low=true; } else if(tt>=e.t&&tt<e.t+e.d) low=true; } const y=low?110:25, x=10+i*(w-20)/800; i?c.lineTo(x,y):c.moveTo(x,y); }
  c.stroke(); c.lineWidth=1;
  const e=p.ev.find(e=>t>=e.t&&t<e.t+(e.slot||e.d)); c.fillStyle=css('--ink'); c.font='11px '+css('--mono');
  c.fillText(`DQ (PSU_SERIAL) ±200 µs around the playhead · 5 V / 0 V · ${e? e.lbl : (t<K.POLL_T0? 'idle — poll starts at '+(K.POLL_T0*1e3)+' ms' : 'idle')}`,10,140);
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('M6245A board — click a part', `<div id="bd"></div><div class="ctlbox"></div>`)}${card('Selected part', `<div id="pd"></div>`)}</div>
   <div>${card('What the frame controller can read (at the playhead)', `<div id="ro"></div>`)}${card('What happened (last action)', `<div id="tr" class="log"></div>`)}</div></div>
   ${card('Timeline — one second (zoom in on the 1-Wire block from 20 ms)', `<canvas id="tl"></canvas><p class="small muted">The poll sequence and its timing follow AN126 standard speed (the app note filed in the openGear engineering folder). When and how often the FINC polls is not documented: one poll per second starting at 20 ms is ${inf()}.</p>`)}
   ${card('Scope: the 1-Wire line at the playhead', `<canvas id="sc"></canvas>`)}`;
  let ctlSig='';
  SIM.on('time', ()=>{
    { const sig=JSON.stringify([D.ac,D.brick,D.load12,D.load7,D.fanOn,D.fanRpm,D.ambient,D.intended]); if(sig!==ctlSig){ ctlSig=sig; const cb=m.querySelector('.ctlbox'); cb.innerHTML=controlsHTML(); bindControls(cb); } }
    const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(); bindBoard(m.querySelector('#bd'));
    m.querySelector('#pd').innerHTML=`<b>${PARTS[D.sel].t}</b> · ${PARTS[D.sel].s}<p class="small">${PARTS[D.sel].d}</p>`;
    m.querySelector('#ro').innerHTML=readoutHTML(t);
    m.querySelector('#tr').innerHTML=D.last? `<div><b>${D.last.name}</b> at ${SIM.fmtT(D.last.t)}</div>`+D.last.tr.map(x=>`<div>→ ${x}</div>`).join('') : '<div class="muted">Change a load, stall the fan or poll the board.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#sc'), t);
  });
}
let lesson=0;
const LESSONS=[
  {t:'What the M6245A is', b:`<p>No document in the archive names this board. Its netlist answers the question: a 26-pin EDAC edge with exactly the pinout of the PSU1/PSU2 connectors on the MF6220 midplane (AC in, +12 V and −7.5 V out, FAULT, PSU_SERIAL). So the M6245A sits in the frame's power-supply bay, between the AC inlet, a 12.5 V brick and the midplane, and reports to the frame controller over 1-Wire.</p>`, ok:()=>true, auto:true},
  {t:'1 · Power it up', b:`<p>Make sure <b>AC mains</b> and <b>brick healthy</b> are ticked. +12V5 appears on J2, and the board makes +12 V (through the OR diodes) and −7.5 V (with the PTN78020A).</p>`, ok:()=>D.ac&&D.brick, hint:'Tick both boxes.'},
  {t:'2 · Load the +12 V rail like a frame', b:`<p>A 20-slot frame can draw 2 A per slot. Set the <b>+12 V load to 10 A</b> and scrub the timeline: F2 is a 0.5 A-hold RXE050 polyfuse, so it trips within a fraction of a second.</p>`, ok:()=>D.load12>=10, hint:'Move the +12 V load slider to 10 A or more.'},
  {t:'3 · Bring it back to a safe load', b:`<p>Set the +12 V load to <b>0.4 A</b> (below the 0.5 A hold current). In the model F2 resets; the real part needs the load removed and some time to cool.</p>`, ok:()=>D.load12<=0.5, hint:'Slide it down to 0.4 A.'},
  {t:'4 · Stall the fan', b:`<p>Drag the fan slider to 0. The TC670 stops seeing current pulses on SENSE and pulls FANTACH low; the DS2438 reads it on VAD. Note that FAN_CLR goes nowhere, so nothing can clear the alert except power.</p>`, ok:()=>!D.fanOn||D.fanRpm<1500, hint:'Fan slider to 0.'},
  {t:'5 · Poll the board', b:`<p>Press <b>Frame controller polls DS2438</b>, then set the zoom to 1 ms and step through 20–60 ms. You will see each 1-Wire reset, presence pulse and bit slot with AN126 timing.</p>`, ok:()=>!!(D.last&&D.last.name.startsWith('Frame controller')), hint:'Press the poll button.'},
  {t:'6 · Look for the current', b:`<p>Raise the +12 V load and read the DS2438 current register: it stays 0. The shunt is not in the load path. Tick <b>shunt in series (as intended)</b> to see what the monitor would have read.</p>`, ok:()=>D.intended, hint:'Tick the shunt box.'},
  {t:'Done', b:`<p>The <b>Schematics</b> tab redraws every net, <b>Software</b> shows the 1-Wire transaction and the DS2438 page the frame controller decodes, and <b>Findings</b> lists the netlist problems.</p>`, ok:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — bench-testing the M6245A', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="ln"></div></div><div>${card('Bench', `<div id="bd"></div><div class="ctlbox"></div>`)}${card('Readings', `<div id="ro"></div>`)}</div></div>`;
  let ctlSig='';
  SIM.on('time', ()=>{
    { const sig=JSON.stringify([D.ac,D.brick,D.load12,D.load7,D.fanOn,D.fanRpm,D.ambient,D.intended]); if(sig!==ctlSig){ ctlSig=sig; const cb=m.querySelector('.ctlbox'); cb.innerHTML=controlsHTML(); bindControls(cb); } }
    m.querySelector('#bd').innerHTML=boardSVG(); bindBoard(m.querySelector('#bd'));
    m.querySelector('#ro').innerHTML=readoutHTML(SIM.t);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.t}${!l.auto&&l.ok()?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=LESSONS[lesson], ok=L.ok();
    m.querySelector('#ln').innerHTML=`<h2>${L.t}</h2>${L.b}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson--;SIM.refresh();}; m.querySelector('#nx').onclick=()=>{lesson++;SIM.refresh();}; m.querySelector('#rs').onclick=()=>{A.reset();lesson=0;};
  });
}
function viewSecond(m){
  m.innerHTML=`${card('One second in the power bay, slow to fast', `<div id="lad"></div>`)}<div class="grid2">${card('Timeline', `<canvas id="tl"></canvas>`)}${card('At the playhead', `<div id="now"></div><canvas id="sc"></canvas>`)}</div>`;
  SIM.on('time', ()=>{
    const fanP=D.fanOn? 60/(D.fanRpm*K.FAN_PULSES):0;
    const rows=[['1 s','one poll cycle of the frame controller ('+inf().replace(/<[^>]+>/g,'')+')',1],['27.5 ms','one DS2438 current conversion',1/K.ADC_I_RATE],['16.7 ms','one AC mains cycle (60 Hz)',1/60],['10 ms','DS2438 temperature or VAD conversion',0.01],...(fanP?[[ (fanP*1e3).toFixed(1)+' ms','one fan current pulse at '+D.fanRpm+' rpm',fanP]]:[]),['960 µs','1-Wire reset + presence',OW.H+OW.I+OW.J],['560 µs','one 1-Wire byte (8 slots)',8*70e-6],['70 µs','one 1-Wire bit slot',70e-6],['6 µs','write-1 low pulse',6e-6],['1.5 µs','one PTN78020A switching cycle ('+inf().replace(/<[^>]+>/g,'')+')',1/K.FSW]];
    m.querySelector('#lad').innerHTML=`<svg viewBox="0 0 900 ${rows.length*24+10}" style="width:100%">${rows.map((r,i)=>{ const w=Math.max(2,(Math.log10(r[2])+7)/7*420); return `<rect x="200" y="${6+i*24}" width="${w}" height="16" rx="3" fill="var(--accent)" opacity=".75"/><text x="190" y="${18+i*24}" text-anchor="end" font-size="12" font-family="var(--mono)" fill="var(--ink)">${r[0]}</text><text x="${208+w}" y="${18+i*24}" font-size="11.5" fill="var(--ink2)">${r[1]}</text>`; }).join('')}</svg>`;
    const p=POLL||poll(), t=SIM.t, e=p.ev.find(e=>t>=e.t&&t<e.t+(e.slot||e.d)), bk=p.blocks.find(b=>t>=b.a&&t<b.b);
    m.querySelector('#now').innerHTML=`<table class="kv"><tr><th>AC phase</th><td class="mono">${D.ac?((t*60%1)*360).toFixed(0)+'°':'off'}</td></tr><tr><th>1-Wire</th><td class="mono">${bk?bk.name:'idle'}${e?' · '+e.lbl:''}</td></tr><tr><th>Fan</th><td class="mono">${D.fanOn?'rev '+Math.floor(t*D.fanRpm/60):'stalled'}</td></tr></table>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); drawScope(m.querySelector('#sc'), t);
  });
}
function viewBlock(m){
  const B=[['ac','AC inlet (midplane)',20,40],['p1','P1 EDAC edge',20,150],['f1','F1 fuse',200,40],['j1','J1 → brick',380,40],['brick','12.5 V brick (off-board)',560,40],['j2','J2 +12V5',740,40],['d34','D3/D4 OR',560,150],['f2','F2 PTC',380,150],['ptn','PTN78020A −V',740,150],['d1','D1 OR',740,250],['f3','F3 PTC',560,250],['sh','R2‖R3 shunt',380,250],['zx','ZXCT1009',200,250],['ds','DS2438',20,250],['tc','TC670 + fan',200,340],['p2','FAULT P2',560,340]];
  const desc={ac:'Each MF6220 midplane has two AC inlets (AC1, AC2, ACMODULE2 with integral fuse), one per PSU slot: AC1_LINE/NEUTRAL → PSU1-1…4.',brick:'The 12.5 V AC/DC supply. The MF6220 design notes (Jan 2007|40) plan a WBS supply built on a 200 W PPS-200. Not in the archive.',...Object.fromEntries(Object.entries(PARTS).map(([k,p])=>[k,p.d]))};
  const draw=()=>{
    m.innerHTML=card('Block diagram — click a block', `<svg viewBox="0 0 900 400" style="width:100%"><defs><marker id="m6ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>
      ${[['ac','f1'],['f1','j1'],['j1','brick'],['brick','j2'],['j2','d34'],['d34','f2'],['f2','p1'],['j2','ptn'],['ptn','d1'],['d1','f3'],['f3','p1'],['j2','sh'],['sh','zx'],['zx','ds'],['ds','p1'],['tc','ds'],['p2','p1'],['ac','p1']].map(([a,b])=>{ const A_=B.find(x=>x[0]===a), B_=B.find(x=>x[0]===b); return `<line x1="${A_[2]+70}" y1="${A_[3]+30}" x2="${B_[2]+70}" y2="${B_[3]+30}" stroke="var(--ink2)" stroke-width="1.6" marker-end="url(#m6ar)"/>`; }).join('')}
      ${B.map(([k,t,x,y])=>`<g class="blk" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="140" height="60" rx="8" fill="${D.sel===k?'color-mix(in srgb,var(--accent) 25%,var(--panel2))':'var(--panel2)'}" stroke="${D.sel===k?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+70}" y="${y+35}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${t}</text></g>`).join('')}</svg>`)+
      card(B.find(b=>b[0]===D.sel)?B.find(b=>b[0]===D.sel)[1]:'', `<p>${desc[D.sel]||''}</p>`)+
      card('Power path, stage by stage (at the current loads)', stageTable());
    m.querySelectorAll('.blk').forEach(g=>g.onclick=()=>{ D.sel=g.dataset.k; draw(); });
  };
  draw();
}
function stageTable(){
  const mm=model(0);
  return `<table class="kv"><tr><th>Stage</th><th>Part (netlist)</th><th>In</th><th>Out</th><th>Loss</th></tr>
   <tr><td>Brick</td><td>J2 PAN656</td><td>AC</td><td class="mono">${mm.vin.toFixed(2)} V</td><td>—</td></tr>
   <tr><td>OR diodes</td><td>D3, D4 MBR4045PT</td><td class="mono">${mm.vin.toFixed(2)} V</td><td class="mono">${(mm.vin-vf(mm.i12)).toFixed(2)} V</td><td class="mono">${(vf(mm.i12)*mm.i12).toFixed(2)} W ${inf('a 0.30 V + 25 mΩ diode model')}</td></tr>
   <tr><td>+12 V polyfuse</td><td>F2 RXE050</td><td></td><td class="mono">${mm.v12.toFixed(2)} V</td><td class="mono">${(mm.i12*mm.i12*K.PTC_R).toFixed(2)} W</td></tr>
   <tr><td>Inverting converter</td><td>REG1 PTN78020A, R1 9K53</td><td class="mono">${mm.vin.toFixed(2)} V, ${mm.iPtnIn.toFixed(2)} A</td><td class="mono">−${K.VNEG} V</td><td class="mono">${(K.VNEG*mm.i7*(1/K.EFF-1)).toFixed(2)} W ${inf()}</td></tr>
   <tr><td>−V OR diode, polyfuse</td><td>D1, F3 RXE050SMT</td><td></td><td class="mono">${mm.vneg.toFixed(2)} V</td><td class="mono">${(vf(mm.i7)*mm.i7+mm.i7*mm.i7*K.PTC_R).toFixed(2)} W</td></tr>
   <tr><td>+5 V housekeeping</td><td>REG2 LM1117-5.0</td><td>NET00007</td><td class="mono">5.0 V</td><td>—</td></tr></table>`;
}
function chip(x,y,w,name,sub,left,right){
  const h=Math.max(left.length,right.length)*18+44; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text><text x="${x+w/2}" y="${y+h-6}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${sub}</text>`;
  left.forEach((p,i)=>{ const yy=y+32+i*18; s+=`<line x1="${x-60}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[0]} ${p[1]}</text><text x="${x-62}" y="${yy-3}" text-anchor="end" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[2]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+32+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+60}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${p[1]} ${p[0]}</text><text x="${x+w+62}" y="${yy-3}" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[2]}</text>`; });
  return s;
}
function viewSchem(m){
  const s1=`<svg viewBox="0 0 1060 675" style="width:100%;min-width:820px">
   <text x="10" y="18" font-size="12" fill="var(--warn)">REDRAWN from M6245A.net (P-CAD, 11 May 2007|40) — not the original schematic. Pin names marked * are ${'inferred'} from the part datasheets.</text>
   ${chip(170,40,150,'P1 EDAC 26','edge to midplane PSU slot',[['1-2','NEUTRAL','J1-1'],['3-4','LINE','F1-1/2'],['5-12','GND','GNDD'],['13','PSU_SERIAL','U1-8'],['14','FAULT','P2-1']],[['15-20','+12V','F2-B'],['21-24','-7V5','F3-2'],['25-26','GND','GNDD']])}
   ${chip(720,40,150,'REG1 PTN78020A','inverting: Vout pin to GND',[['2','Vin*','FB1 · C1+ · C6'],['4','Vo adj*','R1 9K53 → NET00020'],['3','Inhibit*','n.c.']],[['6','Vout*','GNDD'],['1,7','GND*','NET00020 (−V)'],['5','—','n.c.']])}
   ${chip(170,215,150,'U1 DS2438','SO8 1-Wire monitor',[['2','Vsens+*','U2-1 · R10 174R'],['3','Vsens−*','R9 100K · C9'],['4','VAD*','R6 10K → FANTACH']],[['8','DQ*','PSU_SERIAL'],['5','VDD*','+5V'],['1','GND*','GNDD']])}
   ${chip(720,215,150,'U2 ZXCT1009','SOT-23 current monitor',[['3','S+*','+12V5'],['2','S−*','NET00008 (R2,R3,C10)']],[['1','Iout*','NET00003 → U1-2']])}
   ${chip(170,390,150,'U6 TC670','fan-fail detector',[['6','SENSE*','C14 ← fan return'],['1','THRESH*','R22 22K1 / R23 4K75'],['3','CLEAR*','FAN_CLR (only node)']],[['5','ALERT*','FANTACH (R7 1K↑, R8 1K↓)'],['4','VDD*','+5V'],['2','GND*','GNDD']])}
   ${chip(720,390,150,'REG2 LM1117-5.0','SOT-223',[['3','Vin','NET00007 (after D3/D4)']],[['2,4','Vout','+5V'],['1','GND','GNDD']])}
   <text x="20" y="560" font-size="10.5" fill="var(--ink2)">Power: J2-1..3 +12V5 → D3, D4 MBR4045PT (A1,A3 = +12V5, K = NET00007) → F2 RXE050 → +12V</text><text x="20" y="575" font-size="10.5" fill="var(--ink2)">+12V5 → FB1 BLM41P → REG1 Vin</text><text x="20" y="590" font-size="10.5" fill="var(--ink2)">REG1 GND → FB2 → D1 (K = NET00022, A1,A3 = NET00013) → F3 RXE050SMT → −7V5</text><text x="20" y="605" font-size="10.5" fill="var(--ink2)">AC: J1-1 NEUTRAL = P1-1,2</text><text x="20" y="620" font-size="10.5" fill="var(--ink2)">J1-3 LINE → F1-3,4 → F1-1,2 → P1-3,4</text><text x="20" y="635" font-size="10.5" fill="var(--ink2)">Fan: P3-2 +12V5, P3-1 → R20 ‖ R21 20R → GNDD, C14 → U6-6</text><text x="20" y="650" font-size="10.5" fill="var(--ink2)">P2-1 FAULT → P1-14</text></svg>`;
  m.innerHTML=card('Schematic — M6245A', `<div class="scroll">${s1}</div>`)+card('Every net (from M6245A.net)', netTable())+card('Parts', '<p class="small">C1, C2 100 µ/25 V (radial), C3 1 µ, C4 1 µF, C5 value “sot”, C6 18.8 µ, C9/C13/C14/C57/C58 0.1 µ 0805, C10 0.1 µ 1206, C11 1 µF; D1, D3, D4 MBR4045PT; F1 fuse {Value}, F2 RXE050, F3 RXE050SMT; FB1, FB2 BLM41P; J1 PAN356, J2 PAN656, P2, P3 PAN300; P1 EDAC26/156 edge; R1 9K53, R2, R3 0R02 (0830), R5 20K, R6 10K, R7, R8 1K, R9 100K, R10 174R, R20, R21 20R, R22 22K1, R23 4K75; REG1 PTN78020A, REG2 LM1117-5.0; U1 DS2438, U2 ZXCT1009FTA, U6 TC670.</p>');
}
const NETS=[['-7V5','F3-2 P1-21 P1-22 P1-23 P1-24'],['+12V','F2-B C11-1 P1-15…20'],['+12V5','U2-3 R2-2 R3-2 FB1-2 C4-1 R7-1 D3-1 D3-3 D4-1 D4-3 C10-2 J2-1 J2-2 J2-3 P3-2'],['+5V','U6-4 U1-5 REG2-2 REG2-4 R5-1 C58-1 C13-1 R22-1'],['NET00007','REG2-3 F2-A D3-2 D4-2 C57-1'],['NET00008','U2-2 R2-1 R3-1 C10-1  ← shunt ends here'],['NET00003','U1-2 U2-1 R10-2 C9-2'],['NET00004','U1-3 R9-1 C9-1'],['NET00005','U1-4 R6-1'],['FANTACH','U6-5 R8-1 R6-2 R7-2'],['FAN_CLR','U6-3 (single node — P-CAD warning in M6245A.ERR)'],['NET00010','C14-1 R20-1 R21-1 P3-1'],['NET00011','U6-6 C14-2'],['NET00012','U6-1 R22-2 R23-1'],['NET00019','R1-1 REG1-4'],['NET00020','R1-2 REG1-1 REG1-7 FB2-2 C2-NEG'],['NET00021','REG1-2 FB1-1 C6-1 C1-POS'],['NET00022','FB2-1 C5-1 D1-2 C3-1'],['NET00013','F3-1 D1-1 D1-3'],['PSU_SERIAL','U1-8 R5-2 P1-13'],['FAULT','P2-1 P1-14'],['LINE','J1-3 F1-3 F1-4'],['NET00017','F1-1 F1-2 P1-3 P1-4'],['NEUTRAL','J1-1 P1-1 P1-2'],['GNDD','REG1-6 U6-2 U1-1 REG2-1 R8-2 R9-2 R10-1 R20-2 R21-2 R23-2 C2-POS C1-NEG … J2-4…6 P2-2 P2-3 P3-3 P1-5…12 P1-25 P1-26']];
function netTable(){ return `<table class="kv">${NETS.map(n=>`<tr><th class="mono">${n[0]}</th><td class="mono small">${n[1]}</td></tr>`).join('')}</table>`; }
function viewSoft(m){
  m.innerHTML=`${card('The board has no processor — this is the frame controller\'s 1-Wire conversation with U1 DS2438', `<div id="fl"></div><p class="small muted">Command bytes are the DS2438's own (Skip ROM 0xCC, Convert T 0x44, Convert V 0xB4, Recall Memory 0xB8, Read Scratchpad 0xBE). The FINC firmware that sends them is not in the archive, so this order is ${inf('the DS2438 datasheet and AN126')}.</p>`)}
   <div class="grid2">${card('DS2438 page 0 as read back', `<div id="pg"></div>`)}${card('Bit slots at the playhead', `<canvas id="sc"></canvas>`)}</div>`;
  SIM.on('time', ()=>{
    const p=POLL||poll(), t=SIM.t, k=p.blocks.findIndex(b=>t>=b.a&&t<b.b);
    m.querySelector('#fl').innerHTML=`<svg viewBox="0 0 980 110" style="width:100%">${p.blocks.map((b,i)=>`<rect x="${6+i*162}" y="10" width="154" height="84" rx="7" fill="${i===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${12+i*162}" y="28" font-size="10" font-family="var(--mono)" fill="${i===k?'#fff':'var(--ink)'}">${(b.a*1e3).toFixed(2)} ms</text>${b.name.split(' · ').map((l,j)=>`<text x="${12+i*162}" y="${46+j*13}" font-size="10" fill="${i===k?'#fff':'var(--ink2)'}">${l}</text>`).join('')}`).join('')}</svg>`;
    const pg=p.pg, mm=model(K.POLL_T0);
    const names=['Status/Config (IAD, CA, EE, AD)','Temperature LSB','Temperature MSB','Voltage LSB (VAD)','Voltage MSB','Current LSB','Current MSB','Threshold','CRC8'];
    m.querySelector('#pg').innerHTML=`<table class="kv">${pg.map((b,i)=>`<tr><th>${i}</th><td class="mono">0x${b.toString(16).padStart(2,'0').toUpperCase()}</td><td class="small">${names[i]}</td></tr>`).join('')}
      <tr><th></th><td colspan="2" class="small">Temperature ${mm.temp.toFixed(2)} °C · VAD ${mm.fantach.toFixed(2)} V (FANTACH) · current ${mm.curReg} LSB ${D.intended?'':'(always ~0 as built)'}</td></tr></table>`;
    drawScope(m.querySelector('#sc'), t);
  });
}
function viewFind(m){
  const F=[
    '<b>The board is a PSU-slot interface for the MF6220 frame.</b> Its P1 EDAC-26 pinout (1–2 NEUTRAL, 3–4 LINE, 13 PSU_SERIAL, 14 FAULT, 15–20 +12V, 21–24 −7V5) is identical to the PSU1/PSU2 connectors (EDAC 737-030-525-904) in <span class="mono">MF6220-1iss4-NEW.net</span>. The README\'s “redundant openGear/frame power module” guess is right; the photos in <span class="mono">psu temp/</span> show the MF6220 prototype with two supplies in its bay and the five-fan door board.',
    '<b>The current shunt is not in the current path.</b> R2 and R3 (0R02) run from +12V5 to NET00008, and NET00008 reaches only the ZXCT1009 S− pin and C10. No load current passes through them, so the DS2438 current channel always reads about zero. Tick “shunt in series” on the Simulator tab to see the intended reading.',
    '<b>The outputs are fused at 0.5 A.</b> F2 (RXE050, 0.5 A hold / 1.0 A trip) carries the whole +12 V output and F3 (RXE050SMT) the whole −7.5 V. The DevGuide allows 2 A per slot on +12 V and 1 A on −7.5 V, and the design notes ask for up to 2.5 A on −7.5 V. As drawn, the board can only power a few cards.',
    '<b>FAN_CLR goes nowhere.</b> The TC670 CLEAR pin is a one-node net (P-CAD warns in <span class="mono">M6245A.ERR</span>). A latched fan alarm can only be cleared by removing power. The MF6220-2 fan board, which uses the same TC670 circuit (22K1/4K75 threshold, two 20 Ω sense resistors), drives FAN_CLR from its PCA9555.',
    '<b>FANTACH idles above the TC670 supply.</b> R7 (1K to +12V5) and R8 (1K to ground) hold the ALERT pin at about 6.25 V while the TC670 runs from +5 V. An open-drain output is normally limited to its supply plus a few tenths of a volt ' + inf('the TC670 absolute-maximum ratings') + '.',
    '<b>Negative rail by an inverting trick.</b> REG1 pin 6 (Vout) is on GNDD and pins 1/7 (GND) on NET00020 with C2 reversed (C2-POS on ground): the PTN78020A is used as a positive-to-negative converter. The design notes\' remark that “the regulator used for the −7.5 V rail can only supply 2.5 A” fits this connection.',
    '<b>Odd values.</b> C5 has the value “sot”, F1 “{Value}”, and the ECO log shows R1 swapped from an R400 footprint to 1206 with value 9K53 on 11 May 2007|40.',
    '<b>Monitoring the design notes wanted to drop.</b> The Jan 2007|40 notes say “design WBS supply using 200 watt PPS-200 and remove serial power information. FINC card must recognize this.” The M6245A, dated May 2007, still carries the DS2438 on PSU_SERIAL.',
    '<b>Two copies.</b> A later <span class="mono">M6245A.pcb</span> (2009|42) sits in the M6206A folder; it is not compared here.',
  ];
  m.innerHTML=card('Findings — M6245A', `<ol>${F.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}</ol>`)+
   card('Photo from the board folder', `<img src="${ASSET}m6245a-psu-bay.jpg" alt="MF6220 prototype frame with two power supplies in the bay" style="max-width:100%;border-radius:8px"><p class="small muted"><span class="mono">psu temp/MVC-011F.JPG</span>: the frame's power-supply bay with two supplies fitted, next to the card guides.</p>`);
}

SIM.register({
  id:'m6245a', product:'M6245A', name:'M6245A · frame PSU interface and monitor board (2007|40)', year:2007, family:'openGear',
  folder:'#OPENGEAR #SERIES/M6245A #Engineering #TIM',
  summary:'Power-bay board for the MF6220 openGear frame: passes AC to a 12.5 V brick, ORs its output onto +12 V, makes −7.5 V with a PTN78020A wired as an inverter, and reports temperature, fan and current to the frame controller over 1-Wire (DS2438).',
  highlights:['Netlist-matched to the MF6220 PSU connector','Polyfuse trips at frame loads','1-Wire poll at AN126 bit timing','Current shunt not in the load path','TC670 fan alarm with no clear line'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'1-Wire bit slot (70 µs)',period:()=>70e-6},{label:'AC cycle (16.7 ms)',period:()=>1/60},{label:'DS2438 current conversion',period:()=>1/K.ADC_I_RATE},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.05,'50 ms (poll)'],[1/60,'1 AC cycle'],[0.003,'3 ms (one command)'],[0.0006,'600 µs (one byte)'],[0.0001,'100 µs (bit slots)'],[5e-6,'5 µs (switching)']],
  defaultZoom:2,
  init(){ POLL=null; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: bench-testing the M6245A',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'1-Wire protocol',render:viewSoft},
    {id:'findings',label:'Findings',render:viewFind},
  ],
});
})();
