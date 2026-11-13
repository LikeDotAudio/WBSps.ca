/* =====================================================================
   M8209 — 2-channel balanced analog DA / line driver, MF8200 series (Ward-Beck, 2005|38)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #MF8200 #SERIES/M8209 - #Engineering #MF82/):
   - PCB/m8209_iss1.net (P-CAD netlist: every net below — IN1±, IN2±, AOUT±, BOUT±, SWAIN, SWBIN, +VA, −VA, V+, V−,
       P1 pins "A","1","D","4","J","8","L","M","11"), PCB/m8209_ISS1.bom (values; header still "D8205"),
       PCB/m8209_ISS1.cpl (part positions in mil), PCB/m8209_iss1.ECO (pin deletions 22–24 Feb 2005),
       PCB/m8209_iss1.sch(.md) ("M8200 DISTRIBUTION AMP", ISS.6)
   - PCB/GERBERS/M8209_ISS1.TOP, .BOT, .TSM, .SLK (board art, incl. the "MODE JUMPERS STEREO J1 J4 / MONO J1 J3 /
       MIX J2 J3" silk legend)
   - M8209_TR3.cdr/.pdf ("M8209A TERMINAL OPTIONS", ST8201A SOLDER TERMINAL), M8209_MAN.cdr (manual cover art)
   Assets: assets/m8209-board.png (rendered from the Gerbers, 100 dpi), assets/m8209-st8201a.png (cut from M8209_TR3.cdr).
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (w)=>`<span class="tag-inf" title="Not stated in the source${w?'; inferred from '+w:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const dBu = v=> v<=1e-9 ? -120 : 20*Math.log10(v/0.7746);       // v = rms volts
const fromdBu = d=> 0.7746*Math.pow(10,d/20);
const par = (a,b)=> 1/(1/a+1/b);

/* ---------------- circuit constants (netlist + BOM) ---------------- */
const R = { Rin:10e3, R6:43.1e3, R7:1e3, LVL:5e3, R49:20e3, R53:20e3, R52:20e3, R15:10e3, R55:2e3, R50:10e3, R51:10e3, R41:10e3, R56:2e3, Rb:30, Rs:2.2, Rterm:620 };
const RAIL_IN = 21;                // frame rail (M8251 manual: ±21 V; MF8212-3.DSN ±22 V)
const VA = RAIL_IN - 0.7;          // after D1/D2 1N4003 series diodes → +VA / −VA
const HEAD = 2.5;                  // NE5532 + Vbe of TIP29/TIP30 + 4.7R‖4.7R drop — inferred
const ZOUT = 2*R.Rb + 2*R.Rs;      // 30R + 30R (R54/R62) + 2R2 + 2R2 (R83/R84) = 64.4 Ω
const FUSE_HOLD = 0.5, FUSE_TRIP = 1.0;   // RXE050 PolySwitch (part number → 0.5 A hold, 1.0 A trip, datasheet)

/* ---------------- state ---------------- */
const D0 = { srcA:true, srcB:true, lvlIn:4, freq:1000, toneB:'same', cm:0, potA:0.551, potB:0.551, cmrA:0.5, cmrB:0.5,
  j:{H2:'J1', H1:'J4'}, term:{A:false,B:false}, pb:{A:false,B:false}, load:{A:'600',B:'600'}, rail:21, sel:'A', part:'LVLA', last:null, log:[] };
const D = JSON.parse(JSON.stringify(D0));
const LOADZ = {'600':600,'10k':10e3,'150':150,'open':1e9,'60':60};
function mode(){ const a=D.j.H2, b=D.j.H1; if(a==='J1'&&b==='J4') return 'STEREO'; if(a==='J1'&&b==='J3') return 'MONO'; if(a==='J2'&&b==='J3') return 'MIX'; return 'non-standard ('+(a||'—')+' + '+(b||'—')+')'; }

/* stage-1 feedback: LVL 5K from U1-7 (ccw) to GNDD (cw), wiper → R7 1K → U1-6, R6 43K1 across */
function rfOf(p){ const rth=p*(1-p)*R.LVL; const fb = (1-p)<1e-6? 1e12 : (R.R7+rth)/(1-p); return par(R.R6, fb); }
function g1(p){ return rfOf(p)/R.Rin; }                         // |U1-7 / (IN+ − IN−)|
function cmrr(t){ const e=Math.abs(t-0.5)*0.04+0.00025; return -20*Math.log10(e); }   // CMR trim (2K, with R4/R70 137R) — model inferred
/* stage 2 (U3A / U4A): sum into SWAIN / SWBIN */
function model(){
  const M={}; M.va=D.rail-0.7; M.vmax=(M.va-HEAD);              // per-leg peak swing
  const vs = fromdBu(D.lvlIn);
  const srcZ = 50;                                               // generator source impedance — inferred
  const zin = (t)=> t ? par(20e3, R.Rterm) : 20e3;               // balanced input: 2 × 10K0 to virtual earth; H3/H4 add 620R across P1 pair
  const vin = (on,t)=> on ? vs*zin(t)/(zin(t)+srcZ) : 0;
  M.inA = vin(D.srcA,D.term.A); M.inB = vin(D.srcB,D.term.B) * (D.toneB==='off'?0:1);
  M.u1 = M.inA*g1(D.potA); M.u2 = M.inB*g1(D.potB);              // rms at U1-7 / U2-7
  const phaseB = D.toneB==='other' ? 1 : 0;                       // 'other' = B carries a different tone (adds in power, not in phase)
  // channel A stage 2 (SWAIN): R49 always from U1-7; H2 J1 → R53 from U1-7; H2 J2 → R52 from U2-7. Feedback R15 (‖ R55 when PB1 closed)
  const rfA = D.pb.A ? par(R.R15,R.R55) : R.R15;
  let ga = rfA/R.R49 + (D.j.H2==='J1'? rfA/R.R53 : 0), gb_in_a = D.j.H2==='J2'? rfA/R.R52 : 0;
  M.gA2 = ga; M.gBA = gb_in_a;
  const sumA = (a,b)=> phaseB? Math.sqrt(a*a+b*b) : a+b;
  M.aLeg = sumA(M.u1*ga, M.u2*gb_in_a);                          // AOUT+ rms
  // channel B stage 2 (SWBIN): no default input; H1 J4 → R51 from U2-7; H1 J3 → R50 from AOUT−. Feedback R41 (‖ R56 when PB2 closed)
  const rfB = D.pb.B ? par(R.R41,R.R56) : R.R41;
  M.bLeg = D.j.H1==='J4' ? M.u2*rfB/R.R51 : D.j.H1==='J3' ? M.aLeg*rfB/R.R50 : 0;
  M.cmA = D.cm/1000*Math.pow(10,-cmrr(D.cmrA)/20)*g1(D.potA)*ga*2; M.cmB = D.cm/1000*Math.pow(10,-cmrr(D.cmrB)/20)*g1(D.potB)*(rfB/R.R51)*2;
  ['A','B'].forEach(ch=>{
    const leg = ch==='A'? M.aLeg : M.bLeg, zl=LOADZ[D.load[ch]];
    const clip = leg*1.4142 > M.vmax;
    const legC = clip ? M.vmax/1.4142*0.95 : leg;                  // crude: clipped sine ≈ limited rms
    const vdiff = 2*legC, vl = vdiff*zl/(zl+ZOUT);
    const ipk = vdiff*1.4142/(zl+ZOUT);
    M[ch] = {leg, clip, vdiff, vl, ipk, zl, dbu:dBu(vl), head: 20*Math.log10(M.vmax/Math.max(1e-9,leg*1.4142))};
  });
  M.gain = M.inA>0? dBu(M.A.vl)-dBu(M.inA) : 0;
  M.iq = 4*0.008 + 4*0.012;                                       // 4 × NE5532 (8 mA) + 4 class-AB stages (≈12 mA bias, inferred)
  M.isup = M.iq + (M.A.ipk+M.B.ipk)/Math.PI*2;                     // average of full-wave load current per rail
  M.fuse = M.isup>FUSE_TRIP ? 'tripped' : M.isup>FUSE_HOLD ? 'warming' : 'cold';
  M.maxOut = dBu(2*M.vmax/1.4142);
  M.mode = mode(); M.leds={A:D.pb.A, B:D.pb.B};
  return M;
}
function unityPot(){ // LVL setting that gives 0 dB overall in STEREO into 600 Ω
  let lo=0, hi=0.999; for(let i=0;i<40;i++){ const p=(lo+hi)/2; const g=g1(p)*1*2*600/(600+ZOUT); if(g<1) lo=p; else hi=p; } return (lo+hi)/2; }

/* ---------------- actions with the real net names ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.last={name,tr,t:SIM.t}; D.log.unshift({name,t:SIM.t}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  jumper(h, pos){ act(`Move ${h} to ${pos||'open'}`, tr=>{ D.j[h]=pos; const M=model();
    if (h==='H2') tr(pos==='J1'?'H2 J1: R53 20K0 joins R49 20K0 from U1-7 into SWAIN → channel A stage 2 gain −R15/(R49‖R53) = −1':pos==='J2'?'H2 J2: R52 20K0 brings U2-7 (channel B) into SWAIN beside R49 → A = −(A + B)/2':'H2 open: only R49 → A stage 2 gain −0.5 (−6 dB)');
    else tr(pos==='J4'?'H1 J4: R51 10K0 from U2-7 into SWBIN → channel B independent':pos==='J3'?'H1 J3: R50 10K0 from AOUT− into SWBIN → B = −(AOUT−) = AOUT+: B copies A':'H1 open: SWBIN has no input — channel B is silent');
    tr(`Silk legend: STEREO J1 J4 · MONO J1 J3 · MIX J2 J3 → now ${M.mode}`); }); },
  term(ch){ act(`${ch==='A'?'H3':'H4'} 600 Ω termination ${D.term[ch]?'off':'on'}`, tr=>{ D.term[ch]=!D.term[ch]; tr(`${ch==='A'?'H3 pins 2–3 put R75':'H4 pins 2–3 put R81'} 620R across P1 ${ch==='A'?'“A”/“1”':'“M”/“11”'} (input ${ch==='A'?'1':'2'})`); tr(D.term[ch]?'Input now ≈ 600 Ω (620R ‖ 20 kΩ = 601 Ω)':'Bridging input, ≈ 20 kΩ balanced'); }); },
  pb(ch){ act(`Press ${ch==='A'?'PB1':'PB2'}`, tr=>{ D.pb[ch]=!D.pb[ch]; const M=model();
    tr(`${ch==='A'?'PB1':'PB2'} (PHA2UEE) pins 1–3: ${ch==='A'?'R55 2K from AOUT+ to SWAIN':'R56 2K from BOUT+ to SWBIN'} ${D.pb[ch]?'in parallel with':'removed from'} ${ch==='A'?'R15':'R41'} 10K0`);
    tr(`Pins 4–6: +VA → ${ch==='A'?'LED1':'LED2'} 551-0305 ${D.pb[ch]?'ON':'off'} (no series resistor on the board)`);
    tr(`Channel ${ch} stage-2 gain ${D.pb[ch]?'drops by 15.6 dB':'restored'}: output ${M[ch].dbu.toFixed(1)} dBu`); }); },
  pot(ch, d){ act(`Turn LVL${ch} ${d>0?'clockwise':'anticlockwise'}`, tr=>{ const k='pot'+ch; D[k]=Math.max(0.0,Math.min(0.995,+(D[k]+d).toFixed(3))); const p=D[k]; const M=model();
    tr(`LVL${ch} 5K wiper at ${(p*100).toFixed(0)} % → R7 1K → U${ch==='A'?1:2}-6; Rf = R6 43K1 ‖ ${(((R.R7+p*(1-p)*R.LVL)/(1-p))/1000).toFixed(2)} k = ${(rfOf(p)/1000).toFixed(2)} k`);
    tr(`Stage 1 gain ${(20*Math.log10(g1(p))).toFixed(1)} dB · output ${M[ch].dbu.toFixed(1)} dBu into ${D.load[ch]}`); }); },
  cmr(ch, d){ act(`Trim CMR${ch}`, tr=>{ const k='cmr'+ch; D[k]=Math.max(0,Math.min(1,+(D[k]+d).toFixed(3))); tr(`CMR${ch} 2K trim (with R4/R70 137R, R71 10K0) balances U${ch==='A'?1:2}A's inverting gain against the + leg → CMRR ${cmrr(D[k]).toFixed(0)} dB ${inf('a ±2 % trim range')}`); }); },
  load(ch){ act(`Output ${ch==='A'?1:2} load`, tr=>{ const c=['600','10k','150','60','open']; D.load[ch]=c[(c.indexOf(D.load[ch])+1)%c.length]; const M=model(), o=M[ch];
    tr(`${ch}OUT± → 30R (R${ch==='A'?'62/R54':'66/R58'}) → 108H (${ch==='A'?'T3':'T4'}) → 47µ → 2R2 (R${ch==='A'?'83/R84':'86/R87'}) → P1 ${ch==='A'?'“4”/“D”':'“8”/“J”'} → ST8201A OUTPUT ${ch==='A'?1:2}`);
    tr(`Load ${D.load[ch]==='open'?'open':D.load[ch]+' Ω'} on a 64.4 Ω source → ${o.dbu.toFixed(1)} dBu, ${(o.ipk*1000).toFixed(0)} mA peak`); if(D.load[ch]==='150') tr('150 Ω = four 600 Ω inputs bridged on one output'); }); },
  src(ch){ act(`Input ${ch==='A'?1:2} source ${D['src'+ch]?'off':'on'}`, tr=>{ D['src'+ch]=!D['src'+ch]; tr(`IN ${ch==='A'?1:2} ± → P1 ${ch==='A'?'“A”/“1” → C22/C21 47µ/63 → T1 108H → IN1±':'“M”/“11” → C23/C24 47µ/63 → T2 108H → IN2±'} → 10K0 → U${ch==='A'?1:2}`); }); },
  part(p){ act('Select '+p, tr=>{ D.part=p; const P=PARTS.find(x=>x.ref===p); if(P){ tr(`${P.ref} · ${P.val} at (${P.x}, ${P.y}) mil (m8209_ISS1.cpl)`); tr(P.what); } }); },
  set(k,v){ act(`Set ${k} = ${v}`, tr=>{ D[k]=v; const M=model(); tr(`OUT 1 ${M.A.dbu.toFixed(1)} dBu, OUT 2 ${M.B.dbu.toFixed(1)} dBu${M.A.clip||M.B.clip?' — CLIPPING':''}`); }); },
  reset(){ act('Reset the bench', tr=>{ const lg=D.log; Object.assign(D, JSON.parse(JSON.stringify(D0))); D.log=lg; tr('STEREO (J1 + J4), +4 dBu tone on both inputs, 600 Ω loads, LVL at unity'); }); },
};
D0.potA=D0.potB=D.potA=D.potB=+unityPot().toFixed(3);
window.__m8209Active=false;
document.addEventListener('keydown', e=>{
  if (!window.__m8209Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (k==='a'){ A.pb('A'); e.preventDefault(); } else if (k==='b'){ A.pb('B'); e.preventDefault(); }
  else if (k==='s'){ A.jumper('H2','J1'); A.jumper('H1','J4'); } else if (k==='m'){ A.jumper('H2','J1'); A.jumper('H1','J3'); } else if (k==='x'){ A.jumper('H2','J2'); A.jumper('H1','J3'); }
  else if (k==='+'||k==='='){ A.pot(D.sel,0.01); } else if (k==='-'){ A.pot(D.sel,-0.01); }
});

/* ---------------- board (Gerber render) ---------------- */
const BW=1065, BH=291, bx=x=>(x-4100)/10, by=y=>(7660-y)/10;
const PARTS = [
  {ref:'LVLA',val:'5K multiturn',x:4575,y:7250,w:60,h:22,what:'Channel A level (front edge). Rheostat-divider in U1B feedback: about −20 to +12.7 dB of stage-1 gain.'},
  {ref:'LVLB',val:'5K multiturn',x:4575,y:5225,w:60,h:22,what:'Channel B level (front edge), same circuit round U2B.'},
  {ref:'PB1',val:'PHA2UEE',x:4800,y:7000,w:56,h:26,what:'Front push-button A: contacts 1–3 put R55 2K across R15 (−15.6 dB on channel A); contacts 4–6 light LED1.'},
  {ref:'PB2',val:'PHA-2UEE',x:4775,y:5650,w:56,h:26,what:'Front push-button B: R56 2K across R41; lights LED2. (BOM spells this one “PHA-2UEE”.)'},
  {ref:'LED1',val:'551-0305',x:5025,y:6600,w:26,h:18,what:'Indicator for PB1, fed straight from +VA through the switch.'},
  {ref:'LED2',val:'551-0305',x:5000,y:5850,w:26,h:18,what:'Indicator for PB2.'},
  {ref:'CMRA',val:'2K trim',x:5725,y:7275,w:28,h:30,what:'Common-mode rejection trim, channel A (balances U1A, R3/R4/R70).'},
  {ref:'CMRB',val:'2K trim',x:5725,y:5550,w:28,h:30,what:'Common-mode rejection trim, channel B.'},
  {ref:'T1',val:'108H',x:5475,y:6050,w:110,h:60,what:'Input wound part, channel A: P1 “A”/“1” → C22/C21 47µ/63 → T1-3/T1-1; T1-4/T1-6 = IN1±. DC-blocking caps on both sides suggest a common-mode choke rather than an isolating transformer.'},
  {ref:'T2',val:'108H',x:7825,y:6550,w:110,h:60,what:'Input wound part, channel B (IN2±).'},
  {ref:'H3',val:'jumper',x:6725,y:6675,w:34,h:14,what:'Input 1 termination (silk J7/J8): pins 2–3 put R75 620R across the input. Click to toggle.'},
  {ref:'H4',val:'jumper',x:8475,y:6675,w:34,h:14,what:'Input 2 termination: R81 620R. Click to toggle.'},
  {ref:'H2',val:'MODE J1/J2',x:8200,y:7375,w:34,h:14,what:'Channel A mode link. J1 = R53 (own input, unity); J2 = R52 (mix B into A). Click to move.'},
  {ref:'H1',val:'MODE J3/J4',x:8355,y:5725,w:34,h:14,what:'Channel B mode link. J4 = R51 (own input); J3 = R50 (copy A). Click to move.'},
  {ref:'U1',val:'NE5532',x:6600,y:7075,w:34,h:40,what:'Channel A input: U1A inverts IN1− (CMR trim), U1B sums IN1+ and it with the LVLA feedback.'},
  {ref:'U2',val:'NE5532',x:6600,y:5350,w:34,h:40,what:'Channel B input, as U1.'},
  {ref:'U3',val:'NE5532',x:9125,y:7075,w:40,h:34,what:'Channel A drivers: U3A makes AOUT+ (SWAIN node), U3B inverts it into AOUT−; each drives a TIP29/TIP30 pair.'},
  {ref:'U4',val:'NE5532',x:9125,y:5725,w:40,h:34,what:'Channel B drivers (SWBIN, BOUT±).'},
  {ref:'Q1',val:'TIP29 / TIP30',x:10900,y:7200,w:150,h:40,what:'AOUT+ output pair Q1 TIP29 / Q2 TIP30, Q3 2N4401 bias, 4 × 4.7R ½ W emitter resistors. Q4/Q5/Q6 do the same for AOUT−.'},
  {ref:'Q8',val:'TIP29 / TIP30',x:10900,y:5850,w:150,h:40,what:'BOUT+ pair Q8/Q9 with Q7; BOUT− is Q11/Q12 with Q10.'},
  {ref:'T3',val:'108H',x:12850,y:7300,w:100,h:50,what:'Output wound part A: AOUT± via R62/R54 30R ½ W; secondary → C26/C25 47µ → R84/R83 2R2 → P1 “D”/“4”.'},
  {ref:'T4',val:'108H',x:12850,y:6200,w:100,h:50,what:'Output wound part B → P1 “J”/“8”.'},
  {ref:'F1',val:'RXE050',x:13925,y:5525,w:40,h:16,what:'PolySwitch on V− (P1-25/26) before D2 1N4003.'},
  {ref:'F2',val:'RXE050',x:13925,y:5175,w:40,h:16,what:'PolySwitch on V+ (P1-29/30) before D1 1N4003.'},
  {ref:'LK3',val:'0R',x:13950,y:6350,w:20,h:30,what:'0R link from P1 pin 19 (“L”) to GNDD.'},
  {ref:'P1',val:'EDAC30\\156',x:14610,y:6200,w:24,h:270,what:'30-way 0.156″ edge connector. Used: 1/2 IN1, 7/8 OUT1, 15/16 OUT2, 21/22 IN2, 19 (LK3), 3/27/28 GNDD, 25/26 V−, 29/30 V+.'},
];
function boardSVG(){
  const M=model();
  let s=`<svg viewBox="-4 -4 ${BW+8} ${BH+44}" style="width:100%;border-radius:6px" role="img" aria-label="M8209 ISS1 board rendered from the Gerbers">
   <defs><filter id="m8209g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>
   <rect x="${bx(4122)}" y="${by(7625)}" width="${(14680-4122)/10}" height="${(7625-4789)/10}" rx="3" fill="#124a2c"/>
   <image href="${ASSET}m8209-board.png" x="0" y="0" width="${BW}" height="${BH}"/>`;
  PARTS.forEach(p=>{ const x=bx(p.x), y=by(p.y), sel=D.part===p.ref;
    s+=`<g class="mp" data-p="${p.ref}" style="cursor:pointer"><title>${esc(p.ref+' · '+p.val+' — '+p.what)}</title><rect x="${x-p.w/2}" y="${y-p.h/2}" width="${p.w}" height="${p.h}" rx="3" fill="${sel?'rgba(255,211,77,.22)':'rgba(255,255,255,.03)'}" stroke="${sel?'#ffd34d':'rgba(255,255,255,.35)'}" stroke-dasharray="${sel?'':'3 2'}" stroke-width="${sel?2:1}"/></g>`; });
  // LEDs
  [['LED1','A'],['LED2','B']].forEach(([r,ch])=>{ const p=PARTS.find(q=>q.ref===r); const on=M.leds[ch]; s+=`<circle cx="${bx(p.x)-16}" cy="${by(p.y)}" r="${on?9:6}" fill="${on?'#ff4d3a':'#3a1a16'}" ${on?'filter="url(#m8209g)"':''}/><circle cx="${bx(p.x)-16}" cy="${by(p.y)}" r="5" fill="${on?'#ff8a70':'#4a2520'}"/>`; });
  // jumpers
  const jm=(ref,lab,pos)=>{ const p=PARTS.find(q=>q.ref===ref); const x=bx(p.x), y=by(p.y); const off = pos===lab[0]? -9 : pos===lab[1]? 9 : null;
    return `<g class="mj" data-h="${ref}" style="cursor:pointer"><title>${ref}: ${lab[0]} / ${lab[1]} — click to move</title>${off!==null?`<rect x="${x+off-11}" y="${y-6}" width="22" height="12" rx="2" fill="#111" stroke="#ffd34d" stroke-width="1.5"/>`:''}<text x="${x}" y="${y-11}" text-anchor="middle" font-size="10" font-weight="700" fill="#ffd34d" paint-order="stroke" stroke="#0b2a18" stroke-width="3">${pos||'open'}</text></g>`; };
  s+=jm('H2',['J1','J2'],D.j.H2)+jm('H1',['J4','J3'],D.j.H1);
  [['H3','A'],['H4','B']].forEach(([r,ch])=>{ const p=PARTS.find(q=>q.ref===r); s+=`<g class="mt" data-c="${ch}" style="cursor:pointer"><rect x="${bx(p.x)+(D.term[ch]?3:-19)}" y="${by(p.y)-6}" width="16" height="12" rx="2" fill="#111" stroke="#9cc3ff"/><text x="${bx(p.x)}" y="${by(p.y)+18}" text-anchor="middle" font-size="9.5" fill="#9cc3ff" paint-order="stroke" stroke="#0b2a18" stroke-width="3">${D.term[ch]?'600 Ω':'bridging'}</text></g>`; });
  // pots: wiper angle
  [['LVLA','A'],['LVLB','B']].forEach(([r,ch])=>{ const p=PARTS.find(q=>q.ref===r); s+=`<text x="${bx(p.x)}" y="${by(p.y)+(ch==='A'?-14:22)}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" paint-order="stroke" stroke="#0b2a18" stroke-width="3">${r} ${(D['pot'+ch]*100).toFixed(0)}%</text>`; });
  ['A','B'].forEach(ch=>{ if (M[ch].clip){ const y=ch==='A'?by(7000):by(5600); s+=`<text x="${bx(11000)}" y="${y}" text-anchor="middle" font-size="13" font-weight="800" fill="#ff5a4a" paint-order="stroke" stroke="#000" stroke-width="3">CLIP ${ch}</text>`; } });
  s+=`<text x="2" y="${BH+16}" font-size="11" fill="var(--ink2)">M8209, ISS.1 — top copper, pads and silk from M8209_ISS1.TOP/.TSM/.SLK (Gerber, 2 Mar 2005); part boxes from m8209_ISS1.cpl. Front edge left, P1 right.</text>
   <text x="2" y="${BH+32}" font-size="10.5" fill="var(--ink2)">Click a part to inspect it; click H1/H2 (MODE), H3/H4 (termination) to move the links; click PB1/PB2 to press. Board 10.56″ × 2.84″.</text></svg>`;
  return s;
}
/* ST8201A solder terminal (M8209_TR3.cdr) — 471 × 865 px art */
const TERM = [['IN1',[183,191],[292,191],'A','in'],['OUT1',[183,296],[292,296],'A','out'],['OUT2',[183,508],[292,508],'B','out'],['IN2',[183,696],[292,696],'B','in']];
function termSVG(){
  const M=model();
  let s=`<svg viewBox="0 0 471 865" style="width:100%;max-width:260px;display:block;margin:auto" role="img" aria-label="ST8201A solder terminal from M8209_TR3.cdr"><rect width="471" height="865" fill="#e9e7e0"/><image href="${ASSET}m8209-st8201a.png" width="471" height="865"/>
   <text x="235" y="70" text-anchor="middle" font-size="26" font-weight="700" fill="#222">ST8201A</text><text x="235" y="100" text-anchor="middle" font-size="18" fill="#444">SOLDER TERMINAL · + │ −</text>`;
  TERM.forEach(([n,a,b,ch,dir])=>{ const live = dir==='in'? D['src'+ch] : D.load[ch]!=='open'; const o=M[ch];
    const col = dir==='in' ? '#2d63a6' : (o.clip?'#d33a2c':'#1f8a45');
    s+=`<g class="mterm" data-n="${n}" style="cursor:pointer"><rect x="${a[0]-30}" y="${a[1]-22}" width="${b[0]-a[0]+60}" height="44" rx="8" fill="${live?col:'transparent'}" fill-opacity=".25" stroke="${live?col:'#999'}" stroke-width="2"/>
      ${live?`<path d="M${a[0]},${a[1]} C ${a[0]-60},${a[1]+30} ${b[0]+60},${b[1]+30} ${b[0]},${b[1]}" fill="none" stroke="${col}" stroke-width="5" opacity=".7"/>`:''}
      <text x="${(a[0]+b[0])/2}" y="${a[1]+38}" text-anchor="middle" font-size="17" font-weight="700" fill="#0d3a6a">${dir==='in'?(live?'source '+D.lvlIn+' dBu':'—'):(D.load[ch]==='open'?'open':D.load[ch]+' Ω · '+o.dbu.toFixed(1)+' dBu')}</text></g>`; });
  return s+`</svg><div class="small muted" style="text-align:center">Terminal art: <span class="mono">M8209_TR3.cdr</span> (“M8209A TERMINAL OPTIONS”). Click a pair: inputs toggle the source, outputs cycle the load (600 → 10k → 150 → 60 → open).</div>`;
}
function bindBoard(m){
  m.querySelectorAll('.mp').forEach(g=>g.onclick=()=>{ const p=g.dataset.p;
    if (p==='PB1') A.pb('A'); else if (p==='PB2') A.pb('B'); else if (p==='H3') A.term('A'); else if (p==='H4') A.term('B');
    else if (p==='H2') A.jumper('H2', D.j.H2==='J1'?'J2':D.j.H2==='J2'?null:'J1'); else if (p==='H1') A.jumper('H1', D.j.H1==='J4'?'J3':D.j.H1==='J3'?null:'J4'); else A.part(p); });
  m.querySelectorAll('.mj').forEach(g=>g.onclick=()=>{ const h=g.dataset.h; if(h==='H2') A.jumper('H2', D.j.H2==='J1'?'J2':D.j.H2==='J2'?null:'J1'); else A.jumper('H1', D.j.H1==='J4'?'J3':D.j.H1==='J3'?null:'J4'); });
  m.querySelectorAll('.mt').forEach(g=>g.onclick=()=>A.term(g.dataset.c));
  m.querySelectorAll('.mterm').forEach(g=>g.onclick=()=>{ const n=g.dataset.n; if(n==='IN1') A.src('A'); else if(n==='IN2') A.src('B'); else A.load(n==='OUT1'?'A':'B'); });
  m.querySelectorAll('[data-pt]').forEach(b=>b.onclick=()=>{ const [k,ch,d]=b.dataset.pt.split(':'); if(k==='pot') A.pot(ch,+d); else A.cmr(ch,+d); });
}
function controlsHTML(){
  const o=(v,l,c)=>`<option value="${v}" ${String(v)===String(c)?'selected':''}>${l}</option>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:6px 0">
   <label>Mode <select data-c="mode">${o('STEREO','STEREO (J1 J4)',mode())}${o('MONO','MONO (J1 J3)',mode())}${o('MIX','MIX (J2 J3)',mode())}${['STEREO','MONO','MIX'].includes(mode())?'':o(mode(),mode(),mode())}</select></label>
   <label>Input level <input type="range" data-r="lvlIn" min="-20" max="34" step="1" value="${D.lvlIn}"> ${D.lvlIn>=0?'+':''}${D.lvlIn} dBu</label>
   <label>Input 2 <select data-c="toneB">${o('same','same tone as input 1',D.toneB)}${o('other','a different programme',D.toneB)}${o('off','silent',D.toneB)}</select></label>
   <label>Common-mode hum <input type="range" data-r="cm" min="0" max="1000" step="50" value="${D.cm}"> ${D.cm} mV</label>
   <label>Frame rail <select data-c="rail">${o(21,'±21 V (M8251 manual)',D.rail)}${o(22,'±22 V (MF8212-3.DSN)',D.rail)}${o(15,'±15 V (sagging)',D.rail)}</select></label>
   <label>Inspect <select data-c="sel">${o('A','channel A',D.sel)}${o('B','channel B',D.sel)}</select></label>
   <button data-c="unity">LVL to unity</button><button data-c="reset">Reset</button></div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{ const k=el.dataset.c;
    if (el.tagName==='SELECT') el.onchange=()=>{ const v=el.value;
      if (k==='mode'){ const t={STEREO:['J1','J4'],MONO:['J1','J3'],MIX:['J2','J3']}[v]; if(t){ act('Set the MODE jumpers to '+v, tr=>{ D.j.H2=t[0]; D.j.H1=t[1]; tr(`H2 → ${t[0]}, H1 → ${t[1]} (silk legend “MODE JUMPERS”)`); const M=model(); tr(`OUT 1 ${M.A.dbu.toFixed(1)} dBu · OUT 2 ${M.B.dbu.toFixed(1)} dBu`); }); } }
      else if (k==='rail') A.set('rail',+v); else if (k==='sel'){ D.sel=v; SIM.refresh(); } else A.set(k,v); };
    else el.onclick=()=>{ if(k==='reset') A.reset(); if(k==='unity') act('LVL A and B to unity', tr=>{ D.potA=D.potB=+unityPot().toFixed(3); tr(`Wiper ${(D.potA*100).toFixed(1)} % → stage 1 −5.1 dB; ×(−1) stage 2; +6.0 dB balanced; −0.9 dB in 64.4 Ω → 600 Ω = 0.0 dB`); }); };
  });
  m.querySelectorAll('[data-r]').forEach(el=>el.onchange=()=>A.set(el.dataset.r,+el.value));
}
function partHTML(){
  const P=PARTS.find(x=>x.ref===D.part)||PARTS[0]; let ex='';
  if (P.ref==='LVLA'||P.ref==='LVLB'){ const ch=P.ref.slice(3); ex=`<div style="margin-top:6px"><button data-pt="pot:${ch}:-0.02">◀ anticlockwise</button> <button data-pt="pot:${ch}:0.02">clockwise ▶</button> stage 1 ${(20*Math.log10(g1(D['pot'+ch]))).toFixed(1)} dB</div>`; }
  if (P.ref==='CMRA'||P.ref==='CMRB'){ const ch=P.ref.slice(3); ex=`<div style="margin-top:6px"><button data-pt="cmr:${ch}:-0.05">◀</button> <button data-pt="cmr:${ch}:0.05">▶</button> CMRR ${cmrr(D['cmr'+ch]).toFixed(0)} dB</div>`; }
  return `<table class="kv"><tr><th>Part</th><td><b>${P.ref}</b> · ${esc(P.val)}</td></tr><tr><th>Position</th><td class="mono">X ${P.x} · Y ${P.y} mil</td></tr><tr><th>Job</th><td>${P.what}</td></tr></table>${ex}`;
}
function levelsHTML(){
  const M=model(), row=(a,b,c)=>`<tr><th>${a}</th><td class="mono">${b}</td><td class="mono">${c}</td></tr>`, f=v=>dBu(v).toFixed(1)+' dBu';
  return `<table class="kv"><tr><th>Stage</th><th>A</th><th>B</th></tr>`+
    row('Input at the card',f(M.inA),f(M.inB))+row('U1-7 / U2-7 (after LVL)',f(M.u1),f(M.u2))+row('AOUT+ / BOUT+ (one leg)',f(M.aLeg),f(M.bLeg))+
    row('Balanced drive',f(M.A.vdiff),f(M.B.vdiff))+row('At the load',`${M.A.dbu.toFixed(1)} dBu ${M.A.clip?'<b style="color:var(--bad)">CLIP</b>':''}`,`${M.B.dbu.toFixed(1)} dBu ${M.B.clip?'<b style="color:var(--bad)">CLIP</b>':''}`)+
    row('Headroom (leg peak vs ±'+M.vmax.toFixed(1)+' V)',M.A.head.toFixed(1)+' dB',M.B.head.toFixed(1)+' dB')+row('Hum from common mode',(M.cmA*1000).toFixed(2)+' mV',(M.cmB*1000).toFixed(2)+' mV')+
    `</table><div class="small">Mode <b>${M.mode}</b> · overall gain A ${M.gain.toFixed(1)} dB · max output ${M.maxOut.toFixed(1)} dBu unloaded · supply ≈ ${(M.isup*1000).toFixed(0)} mA per rail, RXE050 ${M.fuse} ${inf('NE5532 and class-AB bias currents from typical data')}</div>`;
}
function traceHTML(){ return D.last? `<div><b>${esc(D.last.name)}</b> at ${SIM.fmtT(D.last.t)}</div>`+D.last.tr.map(x=>`<div>→ ${x}</div>`).join('') : '<div class="muted">Click a part, a link or a terminal. Each step names the real parts and nets.</div>'; }

/* ---------------- timing lanes ---------------- */
function wave(ch, where){ // instantaneous volts at time t
  const M=model(), w=2*Math.PI*D.freq;
  return t=>{
    const a = Math.sin(w*t), b = D.toneB==='other'? Math.sin(2*Math.PI*D.freq*1.5*t) : a;
    const inA=M.inA*1.4142*a, inB=M.inB*1.4142*b;
    const u1=-inA*g1(D.potA), u2=-inB*g1(D.potB);
    const rfA = D.pb.A? par(R.R15,R.R55):R.R15, rfB=D.pb.B? par(R.R41,R.R56):R.R41;
    let aP = -(u1*rfA/R.R49 + (D.j.H2==='J1'? u1*rfA/R.R53:0) + (D.j.H2==='J2'? u2*rfA/R.R52:0));
    aP=Math.max(-M.vmax,Math.min(M.vmax,aP));
    let bP = D.j.H1==='J4'? -(u2*rfB/R.R51) : D.j.H1==='J3'? aP*rfB/R.R50 : 0;
    bP=Math.max(-M.vmax,Math.min(M.vmax,bP));
    const leg = ch==='A'? aP : bP, o=M[ch];
    if (where==='in') return ch==='A'? inA : inB;
    if (where==='u1') return ch==='A'? u1 : u2;
    if (where==='leg') return leg;
    return 2*leg*o.zl/(o.zl+ZOUT);
  };
}
function waveLane(label, ch, where){ return {label, h:46, draw(c,X,a,b,y,h,pw){ const f=wave(ch,where), M=model(), css=SIM.css, mid=y+h/2; let pk0=0; for(let i=0;i<64;i++) pk0=Math.max(pk0,Math.abs(f(i/(64*D.freq)))); const sc=(h/2-5)/Math.max(0.05,pk0);
  c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(a),mid); c.lineTo(X(b),mid); c.stroke();
  const per=1/D.freq, n=Math.min(1500,pw|0);
  c.strokeStyle= where==='out'? (M[ch].clip?css('--bad'):css('--accent')) : css('--accent2');
  if ((b-a)/per > n/4){ let pk=0; for(let i=0;i<64;i++) pk=Math.max(pk,Math.abs(f(i*per/64))); c.fillStyle=c.strokeStyle; c.globalAlpha=.4; c.fillRect(X(a),mid-pk*sc,X(b)-X(a),2*pk*sc); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`${Math.round((b-a)*D.freq)} cycles · ±${pk.toFixed(2)} V`,X(a)+6,y+11); return; }
  c.lineWidth=1.4; c.beginPath(); for(let i=0;i<=n;i++){ const t=a+(b-a)*i/n, v=f(t); const yy=mid-v*sc; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke();
  c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(`${where} ${ch} · ±${pk0.toFixed(2)} V peak (auto-scaled)`,X(a)+4,y+11); }}; }
function lanes(){
  const css=SIM.css, M=model(), ch=D.sel, L=[];
  L.push({label:`1 kHz cycles (${D.freq} Hz test tone)`, h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,1/D.freq,0,0.5/D.freq,css('--accent2'),'cycles'); }});
  L.push(waveLane(`Input ${ch==='A'?1:2} at the card`, ch, 'in'));
  L.push(waveLane(`U${ch==='A'?1:2}-7 after LVL${ch}`, ch, 'u1'));
  L.push(waveLane(`${ch}OUT+ leg (TIP29/30)`, ch, 'leg'));
  L.push(waveLane(`OUTPUT ${ch==='A'?1:2} at the load`, ch, 'out'));
  L.push({label:'Slew needed vs NE5532 9 V/µs', h:22, draw(c,X,a,b,y,h){ const sr=2*Math.PI*D.freq*Math.max(M.aLeg,M.bLeg)*1.4142/1e6; c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(`${sr.toFixed(3)} V/µs needed at ${D.freq} Hz — ${(9/sr).toFixed(0)}× margin (NE5532 datasheet ${'(inferred)'})`, X(a)+6, y+h/2+4); }});
  L.push({label:`LED${ch==='A'?1:2} (PB${ch==='A'?1:2})`, h:22, draw(c,X,a,b,y,h){ c.fillStyle=D.pb[ch]?'#ff4d3a':css('--grid'); c.fillRect(X(a),y+6,X(b)-X(a),h-12); c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(D.pb[ch]?'lit: +VA through PB contacts 4–6 — gain −15.6 dB':'off', X(a)+6, y+h/2+4); }});
  L.push({label:'Rail current / RXE050', h:22, draw(c,X,a,b,y,h){ const fr=Math.min(1,M.isup/FUSE_TRIP); c.fillStyle=M.fuse==='cold'?css('--accent'):css('--bad'); c.fillRect(X(a),y+6,(X(b)-X(a))*fr,h-12); c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(`${(M.isup*1000).toFixed(0)} mA of 500 mA hold`, X(a)+6, y+h/2+4); }});
  return L;
}

/* ---------------- tutorial (no manual text survives: built from the silk legend, terminal art and netlist) ---------------- */
const LESSONS = [
  {t:'Wire the terminal', b:'The M8209A uses the ST8201A solder terminal: IN 1 ±, OUTPUT 1 ±, OUTPUT 2 ±, IN 2 ±, with SHIELD and GND (M8209_TR3). Feed both inputs with the +4 dBu tone and load both outputs with 600 Ω.', h:'Click IN1 / IN2 on the terminal to connect sources; outputs to 600 Ω.', c:M=>D.srcA&&D.srcB&&D.load.A==='600'&&D.load.B==='600'},
  {t:'STEREO: two independent channels', b:'Set the MODE links as the silk legend says for STEREO: J1 and J4. H2 J1 gives channel A unity in stage 2; H1 J4 gives channel B its own input.', h:'Mode selector → STEREO, or click H2/H1 on the board.', c:()=>mode()==='STEREO'},
  {t:'Set unity gain', b:'With +4 dBu in, trim LVLA so OUTPUT 1 reads +4.0 dBu into 600 Ω (±0.2 dB). Stage 1 must sit at −5.1 dB, because the balanced driver adds +6 dB and the 64.4 Ω build-out loses 0.9 dB.', h:'Select LVLA and turn it, or press “LVL to unity”.', c:M=>Math.abs(M.A.dbu-D.lvlIn)<0.2&&mode()!=='MIX'},
  {t:'Null the common-mode hum', b:'Raise the common-mode hum to 500 mV, then trim CMRA until less than 0.5 mV reaches the output.', h:'Common-mode slider 500 mV; select CMRA and step it toward the middle.', c:M=>D.cm>=500&&M.cmA<0.0005},
  {t:'MONO: one source, both outputs', b:'MONO (J1 + J3) feeds channel B from AOUT− through R50, so OUTPUT 2 copies OUTPUT 1 whatever is on IN 2.', h:'Mode → MONO, then silence input 2.', c:M=>mode()==='MONO'&&D.toneB==='off'&&Math.abs(M.B.dbu-M.A.dbu)<0.1},
  {t:'MIX: sum the two inputs', b:'MIX (J2 + J3) adds U2-7 into SWAIN through R52 and drops R53, so A = −(A + B)/2 and B copies it. With two different programmes on the inputs each contributes at −6 dB.', h:'Mode → MIX, input 2 → “a different programme”.', c:()=>mode()==='MIX'&&D.toneB==='other'},
  {t:'Press PB1', b:'Back to STEREO. Press PB1 on the front edge: LED1 lights and R55 2K across R15 drops channel A by 15.6 dB.', h:'Click PB1 on the board or press A.', c:M=>D.pb.A&&mode()==='STEREO'},
  {t:'Find the headroom', b:'Release PB1 and raise the input until OUTPUT 1 clips. On ±21 V rails the output stage swings about ±17.8 V per leg, so clipping starts near +30 dBu unloaded (+29 dBu into 600 Ω).', h:'Input level slider up past +30 dBu.', c:M=>!D.pb.A&&M.A.clip},
];
let lesson=0;

/* ---------------- views ---------------- */
function viewSim(m){
  window.__m8209Active=true;
  m.innerHTML=`${card('M8209 ISS1 board (Gerber render)', `<div id="bd"></div><div id="ct"></div>`)}<div class="grid2"><div>${card('ST8201A terminal', `<div id="tm"></div>`)}</div><div>${card('Levels, stage by stage', `<div id="lv"></div>`)}${card('Selected part', `<div id="pt"></div>`)}${card('What happened (real nets)', `<div id="tr" class="log"></div>`)}</div></div>${card('Timeline around the playhead', `<canvas id="tl"></canvas>`)}`;
  let key='';
  const draw=()=>{ m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#tm').innerHTML=termSVG(); m.querySelector('#lv').innerHTML=levelsHTML(); m.querySelector('#pt').innerHTML=partHTML(); m.querySelector('#tr').innerHTML=traceHTML();
    const k=JSON.stringify([D.j,D.lvlIn,D.toneB,D.cm,D.rail,D.sel]); if(k!==key){ key=k; m.querySelector('#ct').innerHTML=controlsHTML(); bindControls(m); }
    bindBoard(m); SIM.drawLanes(m.querySelector('#tl'), lanes().slice(0,5), {labelW:190}); };
  SIM.on('time', draw);
}
function viewTut(m){
  window.__m8209Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — set up an M8209A', `<p class="small muted">No operating manual survives (M8209_MAN.cdr holds only the cover and frame art), so the steps follow the board's silk legend, the ST8201A terminal art and the netlist.</p><ol id="ls" class="small" style="padding-left:18px;margin:0"></ol>`)}<div class="card" id="lz"></div></div><div>${card('Levels', `<div id="lv"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>${card('Board and terminal', `<div id="bd"></div><div id="ct"></div><div style="max-width:300px;margin:auto" id="tm"></div>`)}`;
  const draw=()=>{ const M=model();
    m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#tm').innerHTML=termSVG(); m.querySelector('#lv').innerHTML=levelsHTML()+partHTML(); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#ct').innerHTML=controlsHTML(); bindControls(m); bindBoard(m);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.t}${l.c(M)?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=LESSONS[lesson], ok=L.c(M);
    m.querySelector('#lz').innerHTML=`<h2>Step ${lesson+1} of ${LESSONS.length}: ${L.t}</h2><p>${L.b}</p><div style="padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'◻ Not yet. <span class="muted">Hint: '+L.h+'</span>'}</div><div style="display:flex;gap:6px;margin-top:8px"><button id="pv">◀ Back</button><button id="nx">Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); SIM.refresh(); }; m.querySelector('#nx').onclick=()=>{ lesson=Math.min(LESSONS.length-1,lesson+1); SIM.refresh(); };
    m.querySelector('#r0').onclick=()=>{ A.reset(); D.srcA=D.srcB=false; D.load={A:'open',B:'open'}; D.j={H2:null,H1:null}; D.potA=D.potB=0.3; lesson=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){
  window.__m8209Active=false;
  const M=model();
  m.innerHTML=`<div class="grid3">${card('In one second', `<table class="kv"><tr><th>Tone cycles</th><td class="mono">${D.freq}</td></tr><tr><th>Zero crossings</th><td class="mono">${2*D.freq}</td></tr><tr><th>Energy into ${D.load.A} Ω (OUT 1)</th><td class="mono">${(M.A.vl*M.A.vl/LOADZ[D.load.A]*1000).toFixed(2)} mJ</td></tr></table>`)}${card('No clock on this card', `<p class="small">The M8209 is all analog: no oscillator, no processor. The only “timing” is the signal itself, the op-amp slew rate and how fast a PolySwitch heats. Zoom to 1 ms to see one cycle pass through each stage; drive it into clipping on the Simulator tab to see the tops flatten at ±${M.vmax.toFixed(1)} V.</p>`)}${card('Channel', `<label class="small">Show <select id="chs"><option value="A" ${D.sel==='A'?'selected':''}>channel A</option><option value="B" ${D.sel==='B'?'selected':''}>channel B</option></select></label>`)}</div>${card('One second, slowed down', `<canvas id="tl"></canvas>`)}`;
  m.querySelector('#chs').onchange=e=>{ D.sel=e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}));
}
const BLK=[
  {k:'in',x:10,y:30,w:150,h:90,t:'Input A',s:['P1 A/1 → C22/C21 47µ','T1 108H, H3 620R','IN1± → 10K0 ×2'],d:'Balanced input through DC-blocking capacitors and the 108H wound part; H3 adds 620R for a 600 Ω input.',live:M=>dBu(M.inA).toFixed(1)+' dBu'},
  {k:'u1',x:200,y:30,w:150,h:90,t:'U1 NE5532 + LVLA',s:['U1A: IN1− inverter, CMRA','U1B: sum, LVLA in feedback'],d:'Differential to single-ended with a gain of about −20 to +12.7 dB set by LVLA.',live:M=>dBu(M.u1).toFixed(1)+' dBu'},
  {k:'mode',x:390,y:90,w:150,h:90,t:'MODE links H1/H2',s:['STEREO J1 J4','MONO J1 J3','MIX J2 J3'],d:'Two 3-pin links route the inputs into the driver summing nodes SWAIN and SWBIN (R49–R53).',live:M=>M.mode},
  {k:'drvA',x:580,y:30,w:160,h:90,t:'U3 + Q1–Q6',s:['AOUT+ / AOUT− push-pull','TIP29/TIP30, 4 × 4.7R'],d:'U3A makes AOUT+ with R15 10K0 feedback (PB1 adds R55 2K); U3B inverts it for AOUT−; each leg is a class-AB TIP29/TIP30 pair inside the loop.',live:M=>dBu(M.A.vdiff).toFixed(1)+' dBu bal.'},
  {k:'outA',x:780,y:30,w:180,h:90,t:'Output 1',s:['30R ×2 → T3 108H','47µ ×2 → 2R2 ×2 → P1 4/D'],d:'64.4 Ω balanced source, DC-blocked, through the 108H wound part to OUTPUT 1 on the ST8201A.',live:M=>M.A.dbu.toFixed(1)+' dBu'},
  {k:'inB',x:10,y:160,w:150,h:90,t:'Input B',s:['P1 M/11 → C23/C24','T2 108H, H4 620R'],d:'As input A.',live:M=>dBu(M.inB).toFixed(1)+' dBu'},
  {k:'u2',x:200,y:160,w:150,h:90,t:'U2 NE5532 + LVLB',s:['CMRB, LVLB'],d:'As U1.',live:M=>dBu(M.u2).toFixed(1)+' dBu'},
  {k:'drvB',x:580,y:160,w:160,h:90,t:'U4 + Q7–Q12',s:['BOUT± push-pull','PB2 / R56'],d:'As channel A; SWBIN has no input of its own — it depends on H1.',live:M=>dBu(M.B.vdiff).toFixed(1)+' dBu bal.'},
  {k:'outB',x:780,y:160,w:180,h:90,t:'Output 2',s:['30R ×2 → T4','→ P1 8/J'],d:'As output 1.',live:M=>M.B.dbu.toFixed(1)+' dBu'},
  {k:'pwr',x:390,y:220,w:150,h:70,t:'Power',s:['P1 29/30 V+, 25/26 V−','RXE050 + 1N4003 → ±VA'],d:'Each rail: PolySwitch, series 1N4003 (reverse protection) → ±VA ≈ ±20.3 V for the op-amps and output stages.',live:M=>(M.isup*1000).toFixed(0)+' mA'},
];
const BW_=[['in','u1'],['u1','mode'],['u2','mode'],['mode','drvA'],['mode','drvB'],['drvA','outA'],['drvB','outB'],['inB','u2'],['drvA','mode']];
function viewBlock(m){
  window.__m8209Active=false; let sel='mode';
  const draw=()=>{ const M=model();
    let s=`<svg viewBox="0 0 980 300" style="width:100%"><defs><marker id="m8209ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    BW_.forEach(([a,b])=>{ const A_=BLK.find(x=>x.k===a), B_=BLK.find(x=>x.k===b); let x1=A_.x+A_.w, y1=A_.y+A_.h/2, x2=B_.x, y2=B_.y+B_.h/2; if(a==='drvA'&&b==='mode'){ x1=A_.x+20; y1=A_.y+A_.h; x2=B_.x+B_.w; y2=B_.y+20; } const hot=sel===a||sel===b;
      s+=`<path d="M${x1},${y1} C${x1+25},${y1} ${x2-25},${y2} ${x2},${y2}" fill="none" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.2:1.2}" marker-end="url(#m8209ar)"/>`; });
    BLK.forEach(b=>{ s+=`<g data-b="${b.k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===b.k?'var(--accent)':'var(--line)'}" stroke-width="${sel===b.k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+17}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+32+i*13}" font-size="10" fill="var(--ink2)">${l}</text>`).join('')}<text x="${b.x+8}" y="${b.y+b.h-6}" font-size="10.5" font-family="var(--mono)" fill="var(--accent)">${b.live(M)}</text></g>`; });
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLK.find(x=>x.k===sel); m.querySelector('#bi').innerHTML=`<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p>`; };
  m.innerHTML=card('Block diagram — click a block (live values from the Simulator bench)', `<div id="bd"></div>`)+card('Block', `<div id="bi"></div>`);
  SIM.on('time', draw);
}
/* redrawn schematic sheets (net names exactly as in m8209_iss1.net) */
function chip(x,y,w,name,sub,L,Rr){ const n=Math.max(L.length,Rr.length), h=24+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${name}</text><text x="${x+w/2}" y="${y-4}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`;
  L.forEach(([p,n_],i)=>{ const yy=y+20+i*18; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text><text x="${x-33}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${n_}</text>`; });
  Rr.forEach(([p,n_],i)=>{ const yy=y+20+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text><text x="${x+w+33}" y="${yy+4}" font-size="10" fill="var(--accent2)">${n_}</text>`; }); return s; }
const SHEETS=[
  {n:'1 · Input A (U1, T1, LVLA)', svg:()=>chip(120,50,110,'T1 108H','XFRMR108',[['3','C22− ← P1-1 “A”'],['1','C21− ← P1-2 “1”']],[['4','IN1+'],['6','IN1−']])+chip(430,50,150,'U1A NE5532','pins 1–3',[['2 −IN','NET00001: R3, C1 (IN1− via R1 10K0)'],['3 +IN','GNDD']],[['1 OUT','NET00015 → R70/R4 137R, CMRA']])+chip(430,190,150,'U1B NE5532','pins 5–7',[['6 −IN','NET00011: R2 (IN1+), R5, R6, R7'],['5 +IN','GNDD']],[['7 OUT','NET00000 → LVLA ccw, R49, R53']])+`<text x="120" y="320" font-size="10.5" fill="var(--ink2)">LVLA 5K: ccw = U1-7, cw = GNDD, wiper → R7 1K → U1-6; R6 43K1 U1-7 → U1-6. D3–D6 1N4148 clamp each leg; R76/R77 100K bleed IN1± to GNDD; H3: R75 620R across P1 “A”/“1”.</text>`},
  {n:'2 · Mode links and drivers', svg:()=>chip(120,40,150,'H2 (J1/J2)','MODE A',[['1 J1','R53 20K0 ← U1-7'],['3 J2','R52 20K0 ← U2-7']],[['2','SWAIN']])+chip(120,180,150,'H1 (J3/J4)','MODE B',[['1 J3','R50 10K0 ← AOUT−'],['3 J4','R51 10K0 ← U2-7']],[['2','SWBIN']])+chip(520,40,160,'U3A NE5532','AOUT+ driver',[['2 −IN','SWAIN: R49 20K0 ← U1-7, R15 10K0 ← AOUT+, C11 22p, PB1-3']],[['1 OUT','→ Q1 TIP29 / Q2 TIP30 (Q3 bias)']])+chip(520,150,160,'U3B NE5532','AOUT− inverter',[['6 −IN','R31 ← AOUT+, R27 ← AOUT−']],[['7 OUT','→ Q4 TIP29 / Q5 TIP30']])+`<text x="120" y="300" font-size="10.5" fill="var(--ink2)">PB1: pin 1 → R55 2K → AOUT+, pin 3 → SWAIN (gain switch); pin 4 = +VA, pin 6 → LED1 → GNDD. Silk: “MODE JUMPERS STEREO J1 J4 · MONO J1 J3 · MIX J2 J3”.</text><text x="120" y="318" font-size="10.5" fill="var(--ink2)">Emitter resistors: R16–R19 (AOUT+), R24/R28–R30 (AOUT−), R36/R42–R44 (BOUT+), R45–R48 (BOUT−), all 4.7R ½ W.</text>`},
  {n:'3 · Outputs and power', svg:()=>chip(140,50,140,'T3 108H','output A',[['1','R62 30R ← AOUT+'],['3','R54 30R ← AOUT−']],[['4','C26 → R84 2R2 → P1-7 “D”'],['6','C25 → R83 2R2 → P1-8 “4”']])+chip(140,170,140,'T4 108H','output B',[['1','R66 30R ← BOUT+'],['3','R58 30R ← BOUT−']],[['4','C28/C27 → R87/R86 → P1-16 “8”'],['6','→ P1-15 “J”']])+chip(640,50,150,'Power','per rail',[['V+','P1-29/30 → F2 RXE050'],['V−','P1-25/26 → F1 RXE050']],[['+VA','D1 1N4003 →'],['−VA','D2 1N4003 →']])+`<text x="140" y="300" font-size="10.5" fill="var(--ink2)">R82/R85 100K across the output capacitors; C19/C20 47/63 and C100–C107 0.1 decouple ±VA; P1-3/27/28 and P1-19 (via LK3 0R) = GNDD.</text>`},
];
function viewSchem(m){
  window.__m8209Active=false; let k=0;
  const draw=()=>{ m.querySelector('#sl').innerHTML=SHEETS.map((s,i)=>`<button data-i="${i}" class="${i===k?'on':''}">${s.n}</button>`).join(' '); m.querySelector('#sv').innerHTML=`<svg viewBox="0 0 980 330" style="width:100%;min-width:760px" font-family="var(--mono)">${SHEETS[k].svg()}</svg>`; m.querySelectorAll('#sl button').forEach(b=>b.onclick=()=>{ k=+b.dataset.i; draw(); }); };
  m.innerHTML=card('Schematics — redrawn from m8209_iss1.net and the BOM, not the original CAD', `<div id="sl" style="margin-bottom:8px"></div><div id="sv" style="overflow-x:auto"></div><p class="small muted">Every net name (IN1+, SWAIN, AOUT−, NET000xx, P1 pin letters) is copied from the P-CAD netlist; values from m8209_ISS1.bom. The 108H parts are drawn as generic 4-pin wound parts because their type is not documented.</p>`);
  draw();
}
function viewSoft(m){
  window.__m8209Active=false;
  m.innerHTML=card('No firmware — the signal path, stage by stage', `<p class="small">Each row is a real node in the netlist. Gains are worked out from the resistor values; change the bench on the Simulator tab and this table follows.</p><div id="st"></div>`)+`<div class="grid2">${card('Level through each stage (dBu)', `<canvas id="bar"></canvas>`)}${card('MODE link truth table', `<div id="mt"></div>`)}</div>`;
  SIM.on('time', ()=>{ const M=model(), ch=D.sel;
    const rows=[['P1 input',ch==='A'?M.inA:M.inB,`${D.term[ch]?'620R ‖ ':''}20 kΩ balanced`],[`U${ch==='A'?1:2}-7`,ch==='A'?M.u1:M.u2,`× ${g1(D['pot'+ch]).toFixed(3)} (Rf ${(rfOf(D['pot'+ch])/1000).toFixed(2)} k / 10K0)`],[`${ch}OUT+`,ch==='A'?M.aLeg:M.bLeg,ch==='A'?`× ${M.gA2.toFixed(3)} (R15${D.pb.A?'‖R55':''} / R49${D.j.H2==='J1'?'‖R53':''})`:`via H1 ${D.j.H1||'open'}`],['balanced (± legs)',M[ch].vdiff,'× 2 (U'+(ch==='A'?3:4)+'B inverts)'],['at the load',M[ch].vl,`÷ (1 + 64.4 / ${D.load[ch]})`]];
    m.querySelector('#st').innerHTML=`<table class="kv"><tr><th>Node</th><th>V rms</th><th>dBu</th><th>How</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1].toFixed(3)}</td><td class="mono">${dBu(r[1]).toFixed(1)}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>`;
    const {c,w,h}=SIM.canvas(m.querySelector('#bar'),210), bw=(w-20)/rows.length, Y=d=>190-(d+20)/55*170;
    c.strokeStyle=SIM.css('--bad'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(10,Y(M.maxOut)); c.lineTo(w-10,Y(M.maxOut)); c.stroke(); c.setLineDash([]); c.fillStyle=SIM.css('--bad'); c.font='10px '+SIM.css('--sans'); c.fillText(`clip ${M.maxOut.toFixed(1)} dBu`, w-90, Y(M.maxOut)-3);
    rows.forEach((r,i)=>{ const d=dBu(r[1]); c.fillStyle=i===rows.length-1?(M[ch].clip?SIM.css('--bad'):SIM.css('--accent')):SIM.css('--accent2'); c.fillRect(10+i*bw+8,Y(d),bw-16,190-Y(d)); c.fillStyle=SIM.css('--ink'); c.fillText(r[0],10+i*bw+8,204); c.fillText(d.toFixed(1),10+i*bw+8,Y(d)-3); });
    const tt=[['STEREO','J1','J4','A','B'],['MONO','J1','J3','A','A'],['MIX','J2','J3','(A+B)/2','(A+B)/2'],['H2 open','—','J4','A − 6 dB','B'],['H1 open','J1','—','A','silent']];
    m.querySelector('#mt').innerHTML=`<table class="kv"><tr><th>Mode</th><th>H2</th><th>H1</th><th>OUT 1</th><th>OUT 2</th></tr>${tt.map(r=>`<tr style="${M.mode===r[0]?'font-weight:700;color:var(--accent)':''}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</table><p class="small muted">First three rows are the silk legend; the last two are what the netlist does with a link missing.</p>`; });
}
function viewFind(m){
  window.__m8209Active=false;
  const F=[
    '<b>The mode jumpers are documented only on the copper.</b> No manual text survives (<span class="mono">M8209_MAN.cdr</span> is the cover and the frame power-supply art), but the top silk carries “MODE JUMPERS — STEREO J1 J4 · MONO J1 J3 · MIX J2 J3”. Tracing the netlist confirms it: H2 J1 = R53 (A unity), J2 = R52 (B summed into SWAIN); H1 J4 = R51 (B own), J3 = R50 (B from AOUT−).',
    '<b>Leave out H2 and channel A drops 6 dB; leave out H1 and channel B goes silent.</b> SWAIN always has R49 20K0 from U1-7, so with no H2 link the stage gain is −0.5. SWBIN has no default resistor at all: channel B depends entirely on H1.',
    '<b>A two-channel card built on an eight-output template.</b> The BOM header still reads “D8205” (an 8-output AES DA), and the ECO log of 22–24 Feb 2005 deletes nets 5/E, 6/F, 7/H, 9/K and 10 from P1 pins 9–14, 17, 18 and 20 — the extra output pins of the template. The ST8201A art keeps the ghosts: 13 of its 23 terminals say NOT USED.',
    '<b>The front push-buttons cut, they do not mute.</b> PB1 contacts 1–3 put R55 2K across R15 10K0 in the driver feedback: −15.6 dB on that channel, with the LED lit from contacts 4–6. The function is not named anywhere; it behaves like a “dim”/talkback-duck switch ' + inf('the netlist only') + '.',
    '<b>LEDs with no series resistor.</b> LED1/LED2 (551-0305) run from +VA (≈ 20 V) through the switch to GNDD with nothing in series. That only works if the 551-0305 has a built-in current limiter ' + inf('the Dialight 551 series includes resistor/constant-current types') + '.',
    '<b>The “108H” parts are probably common-mode chokes.</b> T1–T4 use the XFRMR108 footprint, but every one has 47 µF/63 V capacitors in series on both sides and 100K bleeders across them. An isolating transformer would not need DC blocking on its secondary; a choke would. The model treats them as 1:1 for differential signals ' + inf('capacitor placement') + '.',
    '<b>A line driver with real muscle.</b> Each leg is an NE5532 driving a TIP29/TIP30 pair with 2 × 4.7R ½ W emitter resistors, inside the op-amp loop. On ±21 V frame rails (±20.3 V after D1/D2) the card can reach about +30 dBu unloaded and still has 64.4 Ω of build-out (30R ½ W + 2R2 per leg): enough to drive 150 Ω (four 600 Ω inputs) at +24 dBu.',
    '<b>Unity gain needs the level trims well into their travel.</b> Stage 1 runs from −20.2 dB (LVL fully at the U1-7 end) to +12.7 dB; with STEREO links, 0 dB overall into 600 Ω needs stage 1 at −5.1 dB (the balanced driver adds +6 dB and the build-out loses 0.9 dB), about two-thirds of the way round the pot.',
    '<b>Two spellings of one switch.</b> The BOM lists PB1 as “PHA2UEE” and PB2 as “PHA-2UEE” — two line items for the same part.',
    '<b>Revision labels disagree.</b> The schematic file is “ISS.6” of drawing “M8200 DISTRIBUTION AMP”; the board, Gerbers and all file names say ISS1.',
  ];
  m.innerHTML=card('Findings — what the M8209 files are up to', `<ol>${F.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}</ol>`)+card('Sources', `<ul class="small mono"><li>PCB/m8209_iss1.net · m8209_ISS1.bom · m8209_ISS1.cpl · m8209_iss1.ECO · m8209_iss1.sch(.md)</li><li>PCB/GERBERS/M8209_ISS1.TOP, .BOT, .TSM, .BSM, .SLK (P-CAD 2002, 2 Mar 2005)</li><li>M8209_TR3.cdr / .pdf (terminal options), M8209_MAN.cdr (manual cover)</li></ul><p class="small muted">Rail voltage ±21 V is from the sister M8251 manual; ±22 V appears on MF8212-3.DSN. Output-stage headroom (2.5 V) and supply currents are typical-part estimates, marked inferred.</p>`);
}

SIM.register({
  id:'m8209', name:'M8209 · 2-channel balanced analog DA (2005|38)', product:'M8209', year:2005,
  family:'8200 Distribution Series', folder:'#MF8200 #SERIES/M8209 - #Engineering #MF82',
  summary:'A two-channel balanced line amplifier for the 8200 frames: NE5532 inputs with level and CMR trims, TIP29/TIP30 push-pull drivers and a 64.4 Ω build-out on each output. Silk-screened MODE links make it stereo, mono (one input to both outputs) or a mix of the two.',
  highlights:['Board drawn from the real ISS1 Gerbers, parts placed from the .cpl','STEREO / MONO / MIX links worked out from the netlist and silk','Level, headroom and clipping through every node','ST8201A terminal art you can wire','Findings: D8205 template leftovers, resistor-less LEDs, −15.6 dB push-buttons'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 cycle (1 kHz)',period:()=>1/D.freq},{label:'1 ms',period:()=>0.001},{label:'10 µs',period:()=>1e-5}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms (2 cycles)'],[0.001,'1 ms (1 cycle)'],[0.0001,'100 µs']],
  defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewFind}],
});
})();
