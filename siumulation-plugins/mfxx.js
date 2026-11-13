/* =====================================================================
   MFXX (DA FRAME) — the MF82 frame engineering collection (#PROBLEM folder)
   Ward-Beck Systems 8200 Distribution Series. Plugin for the WBS Device Simulator.

   Sources used (all under #MF8200 #SERIES/MFXX (DA FRAME) - #Engineering #PROBLEM #MF82/ unless noted):
   - MF82-4 - #Engineering/14-289.PCB (ISS2, 1995|28) and 14-319.PCB (ISS1): Tango ASCII supply boards →
       assets/mfxx-psu14-289.png, mfxx-psu14-319.png (rendered from the copper, silk and outline layers);
       SA14-289.DWG / SA14-319.DWG notes (J1 230 V, J2+J3 115 V), XSMF82-4.DWG, S14288-1.DWG, SM82-4GS.DWG
       (grounding systems #1 and #2), DA82-4/DA82-4A.DWG, 82REAR.DWG, MM82-033.DWG, MM82-036.DWG
   - MF82 - #Engineering/D8212F/TANGO/MF8212TR.PCB + MF8212TR.NET (ISS1 1996|29 transition backplane) →
       assets/mfxx-mf8212tr.png; D8212E/TANGO/14-312.PCB (SA14-312: 192 × 30 Ω 1 W, 96 links) → mfxx-bp14-312.png;
       14-313.PCB (EDAC 38-way terminal backplane)
   - MF8210 - #Engineering/MF8210.DXF (MF8210 backplane, 1997|30) → mfxx-dxf-mf8210bp.png;
       82M71.DXF (1998|31 rear housing) → mfxx-dxf-82m71.png; MF8210.DSN, MF8210A.DSN; 82-07x drawings
   - MF8212 - #Engineering/mf-ref.DSN (MF-REF: CS8412, EL2099, LM7805, LM7915, CON20, BNC), MF8212-3.DSN,
       MF8212.DSN, MF8212A.DSN, MF82SILK.CDR, COMPSWAP.LOG, MF8212-F&E.dwg
   - MF82ES - #Engineering/MANUAL/INSTALLATION AND SETUP.doc, ASSEMBLY.DOC, TABLE OF CONTENTS.doc, MF82ES-L1…L3,
       S1…S5 (2000|33); MF82ES - #OLDManual (same set)
   - root: MF82XXRR.CDR (1999 rear art, POS.10/POS.12 reference note) → mfxx-rear-art-mf8210.png (Inkscape);
       MF82XXDM.CDR (19.00 / 3.50 / 13.75 in) → mfxx-dims-plan.png; MF82XXMN.CDR; MF100/MF104FRAME.cdr, MF251S1.CDR
   - ../D8210 & D8212 - #Master #MF82/D8210 & D8212 - #Mechanical #DA #2016/MF8210RM1 ISS 2 (REAR HOUSING).pdf
       → mfxx-dwg-mf8210rm1.png (9 pitches of 1.260 in)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const FLAG = '__mfxxActive';
const inf = w => `<span class="tag-inf" title="Not stated in the source${w?'; inferred from '+w:''}">inferred</span>`;
const card = (t,b) => `<div class="card"><h2>${t}</h2>${b}</div>`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const f2 = (v,n) => (+v).toFixed(n==null?2:n);
const yr = y => SIM.year(y);

/* ---------------- frame family (drawings, boards, DSNs, manual art) ---------------- */
const FAM = {
  'MF82-4': {name:'MF82-4 quad DA frame', years:[1994,1996], slots:4, pitch:null, ru:'1 RU '+'(MF82XXMN “1 or 2 rack units”; which frame is 1 RU is inferred)',
    psu:'own supply board 14-289 (ISS2, 115/230 V jumpers) or 14-319 (ISS1, no jumpers)', ref:'none', img:'mfxx-psu14-289.png', imgW:9.9, imgNote:'14-289.PCB supply, rendered from the Tango copper/silk layers at 80 px/in (9.90 × 2.73 in)',
    files:'DA82-4.DWG (1994), DA82-4A.DWG “QUAD DA FRAME”, XSMF82-4.DWG, S14288-1.DWG “MF82-4 BACKPLANE”, SM82-4GS.DWG, 82REAR.DWG, MM82-033/036.DWG, 14-289/14-319.PCB'},
  'MF8210': {name:'MF-82/10 (MF8210)', years:[1997,2013], slots:10, pitch:1.260, ru:'2 RU (3.50 in)', psu:'2 × M8245A, mains entering through the backplane (AC1/AC2 N/L pads on MF8210.DXF)', ref:'REF IN on the backplane; “*POS.10 may be synchronized to the Reference Input BNCs”',
    img:'mfxx-dxf-mf8210bp.png', imgW:15.81, imgNote:'MF8210.DXF backplane (1997|30): 10 × (30-way EDAC + 20-way strip), AC1/AC2, GND, REF IN — 15.81 × 3.035 in',
    files:'MF8210.DSN, MF8210A.DSN, MF8210.DXF, 82M71.DXF, Mf8210rm1.dwg, 82-071…082-081, 82M72–74 VOID'},
  'MF8212': {name:'MF-82/12 (MF8212)', years:[1998,2016], slots:12, pitch:1.000, ru:'2 RU (3.50 in)', psu:'2 × M8245A on EDAC 307-024 sockets', ref:'AES REF BUS / VIDEO REFERENCE (MF8212-3.DSN); “*POS.12 may be synchronized…” (MF82XXRR.CDR)',
    img:'mf8212-frame-dwg-mf8212rm1.png', imgW:null, imgNote:'MF8212RM1 ISS 2 rear housing (master PDF; see the mf8212-frame plugin)', files:'MF8212.DSN, MF8212A.DSN, MF8212-3.DSN, mf-ref.DSN, MF8212RM1/RM2, MF82XRM1/2, M8212M1, 82M70, MF8212LY, MF82SILK.CDR'},
  'MF82ES': {name:'MF82E/S stereo mounting frame', years:[2000,2000], slots:12, pitch:1.000, ru:'2 RU '+'(MF8212 mechanics, inferred)', psu:'2 × M8245A, AC fuses “0.75 (min.) amp slow blow #3AG”', ref:'none documented',
    img:'mfxx-bp14-312.png', imgW:12.8, imgNote:'14-312.PCB (SA14-312 backplane, 1995|28): 12 × CON20, 192 × 30 Ω 1 W build-outs, 96 links — 12.8 × 3.2 in',
    files:'MANUAL/INSTALLATION AND SETUP.doc, ASSEMBLY.DOC, TABLE OF CONTENTS.doc, MF82ES-L1…L3, S1…S5, 8212m16.dwg, 8212-016-2CSS.cdr, 14-312/14-313.PCB'},
  'D8212F': {name:'D8212F frame set (MF8212TR transition)', years:[1996,1996], slots:12, pitch:1.000, ru:'2 RU', psu:'as MF8212', ref:'—',
    img:'mfxx-mf8212tr.png', imgW:12.8, imgNote:'MF8212TR.PCB ISS1 “TRANSITION BACKPLANE ASSEMBLY” (1996|29) — 12.8 × 3.2 in; click a CON20 position',
    files:'D8212F/ACAD/D8212F.DWG, MF8212FS.DWG, MF8212TR.DWG, SM14313F/A.DWG; TANGO/MF8212TR.PCB/.NET, 14-313.PCB/.DXF'},
};
/* MF8212TR.NET: CON20 P17…P28 = positions 1…12; pins 5–20 → 16-way header P1…P12 pin (n − 4); pins 1/2 → P13 (pos 1–5) or P14 (pos 6–12); pins 3/4 → common */
function trMap(pos){
  const con='P'+(16+pos), hdr='P'+pos, m=pos<=5?pos:pos-5, ih=pos<=5?'P13':'P14';
  const rows=[[1,`${ih}-${3*m-1}`,'input (pin 1)'],[2,`${ih}-${3*m-2}`,'input (pin 2)'],[3,'COMMON (NET_0003)','ground'],[4,'COMMON (NET_0003)','ground']];
  for (let p=5;p<=20;p++) rows.push([p,`${hdr}-${p-4}`,`output ${Math.floor((p-5)/2)+1} ${(p%2)?'+':'−'} ${inf('pairing')}`.replace(/<[^>]+>/g,'')]);
  return {con,hdr,ih,rows};
}
const TR_X = {1:863,2:793,3:723,4:654,5:584,6:514,7:444,8:374,9:304,10:234,11:164,12:94};   // CON20 centres in mfxx-mf8212tr.png (70 px/in)

/* ---------------- MF-REF reference model ---------------- */
const REF = { FS:48000, H:1001/60000/262.5, FIELD:1001/60000, LOCK:0.004, PS_IN:170e-12, CS_DLY:163e-9, EL_DLY:4e-9 };
// CS8412 lock time, EL2099 delay, ps per inch of backplane: inferred (data-sheet magnitudes)

/* ---------------- state ---------------- */
const D = {
  fam:'MF8210', ref:'aes', refAt:-1, term:true, loop:false, loopTerm:true, slot:10, allSlots:false,
  board:'14-289', J:{1:false,2:true,3:true}, mainsV:115,
  chassis:'separate', join:'station', trPos:1, links:'factory',
  es:{unpacked:false,dasOut:false,mounted:false,circuits:null,ps1:false,ps2:false,both:false,dasIn:false,fuse:null,groundsJoined:null,shield:null},
  log:[], last:null, blk:'in',
};
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.last={name,tr,t:SIM.t}; D.log.unshift({name,t:SIM.t}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }

/* reference level at REF IN and at a slot */
function refLevel(){
  if (D.ref==='none') return {v:0,txt:'nothing on REF IN'};
  const nT = (D.term?1:0) + (D.loop&&D.loopTerm?1:0);
  const k = nT===0? 2 : nT===1? 1 : 0.5;     // 75 Ω source into 75 Ω (k=1), open (2), double (0.5)
  const v = (D.ref==='aes'?1.0:1.0)*k;
  return {v, nT, txt: nT===1?'correctly terminated once':nT===0?'unterminated — the level doubles and the line reflects':'double-terminated — the level halves'};
}
function locked(t){ const L=refLevel(); if (D.ref!=='aes') return false; return L.v>=0.2 && t>=D.refAt+REF.LOCK; }
function slotFed(n){ if (D.fam==='MF8210') return n===10; if (D.fam==='MF8212') return D.allSlots? true : n===12; return false; }
function delayTo(n){ const inches = (FAM[D.fam].slots - n + 1)*(FAM[D.fam].pitch||1); return (D.ref==='aes'?REF.CS_DLY:0) + REF.EL_DLY + inches*REF.PS_IN; }

/* MF82-4 supply strap */
function strap(){
  const J=D.J, b=D.board;
  if (b==='14-319') return {ok:D.mainsV===115, sec: 20*D.mainsV/115, txt: D.mainsV===115? '14-319 has no strap jumpers: 115 V only '+'(inferred from the missing J1–J3 note)':'14-319 on 230 V: no way to series the primaries → secondary doubles', short:false};
  const par = J[2]&&J[3]&&!J[1], ser = J[1]&&!J[2]&&!J[3];
  if (J[1] && (J[2]||J[3])) return {ok:false, sec:0, short:true, txt:'J1 with J2/J3 shorts a primary winding: the fuse opens at switch-on'};
  if (!J[1]&&!J[2]&&!J[3]) return {ok:false, sec:0, txt:'no jumpers: the primary is open, no output'};
  const vp = par? D.mainsV : ser? D.mainsV/2 : D.mainsV;   // one primary of two when only J2 or J3
  return {ok: Math.abs(vp-115)<20, sec:20*vp/115, short:false, txt: par?`J2 + J3: primaries in parallel for ${D.mainsV} V`: ser?`J1: primaries in series for ${D.mainsV} V`:'only one of J2/J3: one primary carries everything (half rating) '+'(inferred)'};
}
function psuOut(){
  const s=strap(); if (!s.sec) return {vpk:0,vp:0,vn:0,s,fault:s.txt};
  const vpk=s.sec*Math.SQRT2-0.9, vp=Math.min(1.25*(1+3900/240), vpk-2), vn=Math.min(1.25*(1+2000/120), vpk-2);
  const fault = vpk>35? `raw ${f2(vpk,1)} V on 35 V reservoirs (C1/C4 2200/35) and over the LM317's 40 V in-out limit`: null;
  return {vpk,vp:Math.max(0,vp),vn:Math.max(0,vn),s,fault};
}

/* ---------------- actions ---------------- */
const A = {
  fam(f){ act('Frame family: '+FAM[f].name, tr=>{ D.fam=f; const F=FAM[f]; tr(`${F.slots} positions${F.pitch?' at '+F.pitch.toFixed(3)+' in':''}, ${yr(F.years[0])}${F.years[1]!==F.years[0]?'–'+yr(F.years[1]):''}`); tr('Supply: '+F.psu.replace(/<[^>]+>/g,'')); tr('Files: '+F.files); if (D.slot>F.slots) D.slot=F.slots; }); },
  ref(v){ act('REF IN: '+v, tr=>{ D.ref=v; D.refAt=SIM.t; const L=refLevel();
    if (v==='none'){ tr('REF IN BNC empty: CS8412 loses lock, EL2099 idles'); return; }
    tr(`${v==='aes'?'AES-3id 1 V p-p, 75 Ω':'black burst 1 V p-p (0.3 V sync), 75 Ω'} at REF IN — ${L.txt} (${f2(L.v,2)} V p-p)`);
    tr(v==='aes'?`mf-ref.DSN U3 CS8412: PLL locks ≈ ${REF.LOCK*1000} ms ${'(inferred)'} after t = ${SIM.fmtT(SIM.t)}, then FSYNC = 48 kHz`:'mf-ref.DSN U7 EL2099 video line driver buffers the burst onto VIDEO REFERENCE');
    tr(`J? CON20 → frame bus → ${D.fam==='MF8210'?'POS.10':D.allSlots?'POS.1…12 (MF8212-3.DSN “AES REF BUS”)':'POS.12 only (MF82XXRR.CDR note)'}`); }); },
  term(){ act(`75 Ω termination ${D.term?'off':'on'}`, tr=>{ D.term=!D.term; tr(refLevel().txt); }); },
  loop(){ act(`${D.loop?'Remove':'Connect'} REF OUT loop`, tr=>{ D.loop=!D.loop; tr(D.loop?'The second (looped) BNC feeds the next frame; terminate only at the last one':'Loop removed'); tr(refLevel().txt); }); },
  allSlots(){ act(`Reference to ${D.allSlots?'POS.12 only':'every position'}`, tr=>{ D.allSlots=!D.allSlots; tr(D.allSlots?'MF8212-3.DSN draws an AES REF BUS / VIDEO REFERENCE line along all positions':'MF82XXRR.CDR (1999): “*POS.12 This position may be synchronized to the Reference Input BNCs”'); }); },
  slot(n){ act('Look at position '+n, tr=>{ D.slot=n; tr(slotFed(n)?`Reference arrives ${f2(delayTo(n)*1e9,1)} ns after REF IN (${inf('board and part delays').replace(/<[^>]+>/g,'')})`:'This position gets no frame reference'); }); },
  board(b){ act('Supply board '+b, tr=>{ D.board=b; tr(b==='14-289'?'ISS2: “*For 115 Volt AC, add Jumpers J2 & J3. *For 230 Volt AC, add Jumper J1.”':'ISS1: same LM317T/LM337T circuit, shorter board, no strap note (SA14-319: last designators C6, CR5, DS1, F2, R5, U2 — no T1 on the PCB)'); }); },
  jump(j){ act(`${D.J[j]?'Remove':'Fit'} jumper J${j}`, tr=>{ D.J[j]=!D.J[j]; const s=strap(), o=psuOut(); tr(s.txt); if (o.vpk) tr(`Raw ${f2(o.vpk,1)} V peak → +${f2(o.vp)} / −${f2(o.vn)} V${o.fault?' — ⚠ '+o.fault:''}`); }); },
  mains(v){ act(`Mains ${v} V`, tr=>{ D.mainsV=v; const o=psuOut(); tr(o.s.txt); if (o.fault) tr('⚠ '+o.fault); }); },
  ground(k,v){ act(`Ground: ${k} = ${v}`, tr=>{ D[k]=v; const g=groundState(); tr(g.txt); }); },
  links(v){ act(`14-312 links: ${v}`, tr=>{ D.links=v; tr(v==='es'?'ASSEMBLY.DOC “FOR THE MF82E/S CUSTOM FRAME … On the 14-312 PCB CUT LINKS: 1-24, CONNECT LINKS: 25-48”':'As built for the standard frame: LK1–LK24 in, LK25–LK48 open '+'(inferred: the inverse of the MF82E/S instruction)'); }); },
  trPos(n){ act('MF8212TR position '+n, tr=>{ D.trPos=n; const m=trMap(n); tr(`${m.con} (CON20, Berg 65645-120) pins 1/2 → ${m.ih}; pins 3/4 → COMMON; pins 5–20 → ${m.hdr} (16-way 3916-0000T) pins 1–16`); }); },
  es(k,v){ act('MF82E/S: '+k, tr=>{ D.es[k]= v===undefined? !D.es[k] : v; tr(ES_TXT[k]||''); if (k==='ps1'||k==='ps2'||k==='both'){ const o=psuOut(); tr(`E8200 extender pins 13–15: ${f2(o.vp+o.vn,1)} V (manual: ≈ 42 V no load)`); } }); },
  reset(){ act('Start over', tr=>{ Object.assign(D,{fam:'MF8210',ref:'aes',refAt:-1,term:true,loop:false,allSlots:false,slot:12,board:'14-289',J:{1:false,2:true,3:true},mainsV:115,chassis:'separate',join:'station',links:'factory'}); D.es={unpacked:false,dasOut:false,mounted:false,circuits:null,ps1:false,ps2:false,both:false,dasIn:false,fuse:null,groundsJoined:null,shield:null}; tr('Defaults'); }); },
};
const ES_TXT = {
  unpacked:'“Remove equipment from packing carton and examine for any damage … Check that all items ordered are as per packing slip.”',
  dasOut:'“it is recommended that all distribution amplifiers be removed and stored in a safe location.”',
  mounted:'“Do not mount above other heat generating equipment without due consideration for proper ventilation.”',
  circuits:'“two separate AC circuits should be utilized all the way back to the main distribution breakers connected to different primary AC power phases if at all possible.”',
  fuse:'“At the rear of the MF82E/S frame are AC fuses of 0.75 (min.) amp slow blow #3AG.”',
  groundsJoined:'“These two points are isolated from each other within the MF82E/S mounting frame. These two points should eventually connect together at the audio system station ground point (see drawing MF82E/S-S1).”',
  shield:'“It is normal audio system practice that cable shields be connected at one end to the audio system ground. This is usually at the receiving signal end.”',
  ps1:'“With all distribution amplifiers removed and E8200 Module Extender in place, apply power to supply #1. Measure the voltage between connector pins 13 and 15 of the Extender; it should be approximately 42 V with no load.”',
  ps2:'“Remove primary power from power supply #1 and apply to power supply #2 only. Confirm again that the no load DC voltage is approximately 42 V.”',
  both:'“Apply power to both power supplies noting that there is little if any change in the output no load DC voltage.”',
  dasIn:'“Insert the required number of distribution amplifiers into the system.” — RED LED: current drawn; GREEN LED: supply in operation.',
};
function groundState(){
  const loop = D.join==='frame' && D.chassis==='U-ground';
  return {loop, txt: loop? 'System ground tied to chassis at the frame while the chassis also returns through the AC “U” ground: a ground loop through the mains earth (SM82-4GS forbids this: “DO NOT USE ‘U’ GROUND ON RECEPTACLE IN THIS APPLICATION”).'
    : D.join==='station'? `Chassis ${D.chassis==='U-ground'?'via the AC receptacle “U” ground (grounding system #1)':'by a separate conductor to the technical ground (grounding system #2)'}; system ground joined only at the station ground point — no loop.`
    : 'System ground left floating: hum and RF pick-up are uncontrolled.'};
}
document.addEventListener('keydown', e=>{
  if (!window[FLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (k==='t'){ A.term(); e.preventDefault(); } else if (k==='l'){ A.loop(); e.preventDefault(); } else if (k==='r'){ A.ref(D.ref==='aes'?'video':D.ref==='video'?'none':'aes'); e.preventDefault(); }
});

/* ---------------- drawings ---------------- */
function famHTML(){
  const F=FAM[D.fam];
  let over='';
  if (D.fam==='D8212F'){
    over=`<svg viewBox="0 0 905 233" style="position:absolute;left:0;top:0;width:100%;height:100%">${Object.keys(TR_X).map(n=>`<g class="mxtr" data-n="${n}" style="cursor:pointer"><title>Position ${n}: P${16+ +n} CON20 → P${n} ribbon</title><rect x="${TR_X[n]-14}" y="36" width="28" height="154" fill="${+n===D.trPos?'rgba(255,211,77,.35)':'rgba(255,255,255,.02)'}" stroke="${+n===D.trPos?'#ffd34d':'transparent'}" stroke-width="2"/><text x="${TR_X[n]}" y="226" text-anchor="middle" font-size="12" fill="#fff">${n}</text></g>`).join('')}</svg>`;
  }
  if (D.fam==='MF82-4') over=`<svg viewBox="0 0 802 229" style="position:absolute;left:0;top:0;width:100%;height:100%">${[['T1',458,22,233,199,'229C40 transformer'],['U1',156,141,70,50,'LM317T + positive'],['U2',156,38,70,49,'LM337T − negative'],['C1',398,29,53,142,'2200 µF/35 V'],['C4',256,29,53,142,'2200 µF/35 V'],['CR1',308,171,99,23,'RS605 bridge'],['F1',350,32,40,124,'0.75 A'],['F2',316,32,39,124,'0.75 A'],['P1',756,42,50,145,'EDGE24/156 to the frame'],['R1',78,51,17,103,'10K 3.75 W'],['DS1',0,107,39,15,'LED']].map(c=>`<g><title>${c[0]} — ${c[5]}</title><rect x="${c[1]}" y="${c[2]}" width="${c[3]}" height="${c[4]}" fill="transparent" stroke="rgba(255,211,77,.6)" stroke-dasharray="3 3"/></g>`).join('')}</svg>`;
  const scale = F.imgW? `${F.imgW} in wide · ` : '';
  return `<div style="position:relative;background:#0d0f10;border-radius:6px;overflow:hidden"><img src="${ASSET}${F.img}" style="width:100%;max-height:380px;object-fit:contain;display:block;${/dwg/.test(F.img)?'background:#fff':''}" alt="${esc(F.name)}">${over}</div><div class="small muted">${scale}${F.imgNote}</div>`;
}
function refPanelSVG(t){
  const F=FAM[D.fam], n=F.slots, W=980, L=refLevel(), lk=locked(t);
  const x0=200, pw=(W-x0-20)/n;
  let s=`<svg viewBox="0 0 ${W} 170" style="width:100%"><defs><filter id="mxg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <g class="mxref" style="cursor:pointer"><title>REF IN BNC — click (or R) to cycle AES / video / none</title><circle cx="40" cy="60" r="22" fill="#c8cbce" stroke="#777"/><circle cx="40" cy="60" r="10" fill="#222"/><circle cx="40" cy="60" r="4" fill="${D.ref!=='none'?'var(--accent2)':'#555'}"/><text x="40" y="100" text-anchor="middle" font-size="11" fill="var(--ink)">REF IN · ${D.ref}</text></g>
   <g class="mxloop" style="cursor:pointer"><title>Looped BNC — click (or L) to connect a loop cable</title><circle cx="100" cy="60" r="22" fill="#c8cbce" stroke="#777"/><circle cx="100" cy="60" r="10" fill="#222"/>${D.loop?'<rect x="92" y="10" width="16" height="30" fill="#333"/>':''}<text x="100" y="100" text-anchor="middle" font-size="11" fill="var(--ink)">loop</text></g>
   <g class="mxterm" style="cursor:pointer"><title>75 Ω termination — click (or T)</title><rect x="20" y="114" width="100" height="22" rx="4" fill="${D.term?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="70" y="129" text-anchor="middle" font-size="11" fill="${D.term?'#fff':'var(--ink)'}">75 Ω ${D.term?'ON':'off'}</text></g>
   <rect x="140" y="40" width="50" height="60" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="165" y="64" text-anchor="middle" font-size="10" fill="var(--ink)">${D.ref==='aes'?'CS8412':'EL2099'}</text><text x="165" y="80" text-anchor="middle" font-size="9" fill="${lk||D.ref==='video'?'var(--accent)':'var(--ink2)'}">${D.ref==='aes'?(lk?'LOCK':'no lock'):D.ref==='video'?'buffer':'idle'}</text>
   <line x1="122" y1="60" x2="140" y2="60" stroke="var(--ink2)"/><line x1="190" y1="70" x2="${W-10}" y2="70" stroke="var(--warn)" stroke-width="2"/><text x="${x0}" y="62" font-size="10" fill="var(--warn)">${D.allSlots?'AES REF BUS / VIDEO REFERENCE':'reference line'}</text>`;
  if (!F.pitch || D.fam==='MF82-4' || D.fam==='MF82ES' || D.fam==='D8212F'){ s+=`<text x="${x0+20}" y="120" font-size="12" fill="var(--ink2)">${F.name}: no frame reference documented — pick MF8210 or MF8212</text></svg>`; return s; }
  for (let i=1;i<=n;i++){ const x=x0+(i-0.5)*pw, fed=slotFed(i), on=fed && (D.ref==='video' || lk) && L.v>=0.2;
    s+=`<g class="mxslot" data-n="${i}" style="cursor:pointer"><title>POS.${i}${fed?' — reference fed':''}</title><rect x="${x-pw/2+3}" y="80" width="${pw-6}" height="64" rx="4" fill="${D.slot===i?'rgba(255,211,77,.15)':'var(--panel2)'}" stroke="${D.slot===i?'#ffd34d':'var(--line)'}"/>${fed?`<line x1="${x}" y1="70" x2="${x}" y2="80" stroke="var(--warn)" stroke-width="2"/>`:''}
      <circle cx="${x}" cy="100" r="5" fill="${on?'var(--led-g)':'var(--led-off)'}" ${on?'filter="url(#mxg)"':''}/><text x="${x}" y="124" text-anchor="middle" font-size="10" fill="var(--ink)">POS.${i}${fed&&!D.allSlots?'*':''}</text>${fed?`<text x="${x}" y="138" text-anchor="middle" font-size="9" fill="var(--ink2)">${f2(delayTo(i)*1e9,0)} ns</text>`:''}</g>`; }
  return s+`<text x="20" y="162" font-size="10" fill="var(--ink2)">REF IN level ${f2(L.v,2)} V p-p — ${L.txt}. Delays: CS8412 ≈ ${REF.CS_DLY*1e9} ns, EL2099 ≈ ${REF.EL_DLY*1e9} ns, ${REF.PS_IN*1e12} ps/in of backplane (${'inferred'}).</text></svg>`;
}
function bindAll(m){
  m.querySelectorAll('.mxtr').forEach(g=>g.onclick=()=>A.trPos(+g.dataset.n));
  m.querySelectorAll('.mxslot').forEach(g=>g.onclick=()=>A.slot(+g.dataset.n));
  m.querySelectorAll('.mxref').forEach(g=>g.onclick=()=>A.ref(D.ref==='aes'?'video':D.ref==='video'?'none':'aes'));
  m.querySelectorAll('.mxloop').forEach(g=>g.onclick=()=>A.loop());
  m.querySelectorAll('.mxterm').forEach(g=>g.onclick=()=>A.term());
  m.querySelectorAll('[data-fam]').forEach(b=>b.onclick=()=>A.fam(b.dataset.fam));
  m.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>A.jump(+b.dataset.j));
  m.querySelectorAll('[data-mains]').forEach(b=>b.onclick=()=>A.mains(+b.dataset.mains));
  m.querySelectorAll('[data-board]').forEach(b=>b.onclick=()=>A.board(b.dataset.board));
  m.querySelectorAll('[data-gk]').forEach(s=>s.onchange=()=>A.ground(s.dataset.gk,s.value));
  m.querySelectorAll('[data-links]').forEach(b=>b.onclick=()=>A.links(b.dataset.links));
  m.querySelectorAll('[data-all]').forEach(b=>b.onclick=()=>A.allSlots());
  m.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>A.reset());
}
function traceHTML(){ return D.last? `<div><b>${esc(D.last.name)}</b> at ${SIM.fmtT(D.last.t)}</div>`+D.last.tr.map(x=>`<div>→ ${esc(String(x).replace(/<[^>]+>/g,''))}</div>`).join('') : '<div class="muted">Pick a frame, click the reference BNCs or a board. Each step is listed here.</div>'; }
function compareHTML(){
  return `<table class="kv small"><tr><th>Frame</th><th>Years</th><th>Positions</th><th>Pitch</th><th>Height</th><th>Supplies</th><th>Reference</th></tr>${Object.keys(FAM).map(k=>{ const F=FAM[k]; return `<tr style="${k===D.fam?'background:var(--hl,rgba(255,211,77,.12))':''}"><td><button data-fam="${k}">${k}</button></td><td>${yr(F.years[0])}${F.years[1]!==F.years[0]?'–'+yr(F.years[1]):''}</td><td>${F.slots}</td><td>${F.pitch?F.pitch.toFixed(3)+' in':'—'}</td><td>${F.ru.replace('(MF82XXMN','<br>'+inf('MF82XXMN “occupies 1 or 2 rack units”')+' (MF82XXMN')}</td><td>${F.psu.replace('(inferred from','('+inf('')+' from')}</td><td>${F.ref}</td></tr>`; }).join('')}</table>
  <p class="small muted">Pitch: MF8210RM1 “9 PITCHES OF 1.260 = 11.340”; MF8212RM1 “11 PITCHES @ 1.000”; both housings 17.090 × 3.425 in. Frame envelope from MF82XXDM.CDR: 19.00 in (482 mm) × 3.50 in (89 mm) × 13.75 in (336 mm, sic — 13.75 in is 349 mm).</p>`;
}
function psuHTML(){
  const o=psuOut();
  return `<div class="small" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">Board ${['14-289','14-319'].map(b=>`<button data-board="${b}" style="${D.board===b?'background:var(--accent);color:#fff':''}">${b}</button>`).join('')} · Jumpers ${[1,2,3].map(j=>`<button data-j="${j}" ${D.board==='14-319'?'disabled':''} style="${D.J[j]&&D.board==='14-289'?'background:var(--accent);color:#fff':''}">J${j}</button>`).join('')} · Mains ${[115,230].map(v=>`<button data-mains="${v}" style="${D.mainsV===v?'background:var(--accent);color:#fff':''}">${v} V</button>`).join('')}</div>
   <table class="kv small"><tr><th>Strap</th><td>${o.s.txt}</td></tr><tr><th>Secondary / raw</th><td>${o.s.sec?f2(o.s.sec,1)+' V rms per half → '+f2(o.vpk,1)+' V peak':'—'} ${inf('229C40 read as 2 × 115 V primaries, 40 V CT secondary')}</td></tr>
   <tr><th>Outputs</th><td class="mono">+${f2(o.vp)} V / −${f2(o.vn)} V ${o.fault?'<b style="color:var(--bad)">'+o.fault+'</b>':''}</td></tr><tr><th>DS1</th><td>${o.vp>5&&!o.fault?'lit':'dark'}</td></tr></table>`;
}
function groundHTML(){
  const g=groundState();
  return `<div class="small" style="display:flex;gap:14px;flex-wrap:wrap">
    <label>Chassis returns via <select data-gk="chassis"><option value="U-ground" ${D.chassis==='U-ground'?'selected':''}>AC receptacle “U” ground (system #1)</option><option value="separate" ${D.chassis==='separate'?'selected':''}>separate conductor (system #2)</option></select></label>
    <label>System ground joined <select data-gk="join"><option value="station" ${D.join==='station'?'selected':''}>at the station ground only</option><option value="frame" ${D.join==='frame'?'selected':''}>to chassis at the frame</option><option value="none" ${D.join==='none'?'selected':''}>nowhere</option></select></label></div>
    <svg viewBox="0 0 980 120" style="width:100%"><rect x="20" y="20" width="200" height="70" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="120" y="45" text-anchor="middle" font-size="12" fill="var(--ink)">MF82-4 frame</text><text x="120" y="65" text-anchor="middle" font-size="10" fill="var(--ink2)">CHASSIS ⏚ · SYSTEM GND</text>
     <rect x="380" y="10" width="200" height="40" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="480" y="35" text-anchor="middle" font-size="11" fill="var(--ink)">CHASSIS GROUND BAR</text>
     <rect x="380" y="70" width="200" height="40" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="480" y="95" text-anchor="middle" font-size="11" fill="var(--ink)">SYSTEM GROUND BAR</text>
     <rect x="740" y="40" width="220" height="40" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="850" y="65" text-anchor="middle" font-size="11" fill="var(--ink)">STATION / TECHNICAL GROUND</text>
     <line x1="220" y1="40" x2="380" y2="30" stroke="${D.chassis==='U-ground'?'var(--warn)':'var(--accent)'}" stroke-width="2"/><text x="300" y="25" text-anchor="middle" font-size="9" fill="var(--ink2)">${D.chassis==='U-ground'?'via AC “U” ground':'separate conductor'}</text>
     ${D.join!=='none'?`<line x1="220" y1="75" x2="380" y2="90" stroke="var(--accent)" stroke-width="2"/>`:''}${D.join==='frame'?`<line x1="200" y1="45" x2="200" y2="75" stroke="var(--bad)" stroke-width="3"/>`:''}
     <line x1="580" y1="30" x2="740" y2="55" stroke="var(--ink2)"/>${D.join==='station'?`<line x1="580" y1="90" x2="740" y2="65" stroke="var(--accent)" stroke-width="2"/>`:''}
     ${g.loop?`<text x="490" y="62" text-anchor="middle" font-size="12" font-weight="700" fill="var(--bad)">GROUND LOOP</text>`:''}</svg><p class="small">${g.txt}</p>`;
}
function trHTML(){
  const m=trMap(D.trPos);
  return `<p class="small">Position <b>${D.trPos}</b>: ${m.con} → ${m.hdr} / ${m.ih} (from MF8212TR.NET). Pick the D8212F frame above and click a CON20 to change position.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:3px">${m.rows.map(r=>`<div class="small mono" style="border:1px solid var(--line);border-radius:3px;padding:1px 4px">pin ${r[0]} → ${r[1]}</div>`).join('')}</div><p class="small muted">Pins 5–20 carry the outputs; which pin is + or − is ${inf('the netlist has no names')}.</p>`;
}

/* ---------------- timeline ---------------- */
function lanes(){
  const css=SIM.css, ls=[];
  ls.push({label:`REF IN (${D.ref})`, h:24, draw(c,X,a,b,y,h){ if(D.ref==='none') return; if(D.ref==='aes') SIM.pulses(c,X,a,b,y,h,1/REF.FS,0,0.5/REF.FS,css('--accent2'),'frames'); else SIM.pulses(c,X,a,b,y,h,REF.H,0,4.7e-6,css('--accent2'),'H sync'); c.fillStyle=css('--warn'); if(D.refAt>a&&D.refAt<b) c.fillRect(X(D.refAt)-1,y,3,h); }});
  if (D.ref==='aes'){
    ls.push({label:'AES block start (Z preamble, every 192 frames)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,192/REF.FS,0,1/REF.FS,css('--warn'),'Z'); }});
    ls.push({label:'CS8412 lock (U3, mf-ref.DSN)', h:22, draw(c,X,a,b,y,h){ const L=refLevel(); const t0=Math.max(a,D.refAt+REF.LOCK); c.fillStyle=css('--grid'); c.fillRect(X(a),y+5,X(b)-X(a),h-10); if(L.v>=0.2 && t0<b){ c.fillStyle=css('--accent'); c.fillRect(X(t0),y+5,X(b)-X(t0),h-10); } c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(L.v>=0.2?'locks '+REF.LOCK*1000+' ms after the signal appears (inferred)':'level too low to lock',X(a)+4,y+h/2+4); }});
    ls.push({label:'FSYNC 48 kHz out of the CS8412', h:22, draw(c,X,a,b,y,h){ const t0=D.refAt+REF.LOCK; if(refLevel().v<0.2) return; c.save(); c.beginPath(); c.rect(X(Math.max(a,t0)),y,Math.max(0,X(b)-X(Math.max(a,t0))),h); c.clip(); SIM.pulses(c,X,a,b,y,h,1/REF.FS,REF.CS_DLY,0.5/REF.FS,css('--accent'),'FSYNC'); c.restore(); }});
  } else if (D.ref==='video'){
    ls.push({label:'Fields (59.94 Hz)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,REF.FIELD,0,9*REF.H,css('--warn'),'fields'); }});
    ls.push({label:'EL2099 output (U7)', h:22, draw(c,X,a,b,y,h){ SIM.pulses(c,X,a,b,y,h,REF.H,REF.EL_DLY,4.7e-6,css('--accent'),'H sync'); }});
  }
  ls.push({label:`At POS.${D.slot} (${slotFed(D.slot)?f2(delayTo(D.slot)*1e9,0)+' ns later':'not fed'})`, h:24, draw(c,X,a,b,y,h){ if(!slotFed(D.slot)||D.ref==='none'||refLevel().v<0.2){ c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText('no reference at this position',X(a)+4,y+h/2+4); return; } const per=D.ref==='aes'?1/REF.FS:REF.H, w=D.ref==='aes'?0.5/REF.FS:4.7e-6; const t0=D.ref==='aes'?D.refAt+REF.LOCK:0; c.save(); c.beginPath(); c.rect(X(Math.max(a,t0)),y,Math.max(0,X(b)-X(Math.max(a,t0))),h); c.clip(); SIM.pulses(c,X,a,b,y,h,per,delayTo(D.slot)+(D.ref==='aes'?REF.CS_DLY:0),w,css('--accent'),'edges'); c.restore(); }});
  ls.push({label:'MF82-4 supply: 120 Hz recharge', h:22, draw(c,X,a,b,y,h){ const o=psuOut(); if(!o.vpk){ c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText('no output ('+o.s.txt.slice(0,60)+')',X(a)+4,y+h/2+4); return; } SIM.pulses(c,X,a,b,y,h,1/120,1/240-0.0004,0.0004,o.fault?css('--bad'):css('--warn'),'recharges'); }});
  return ls;
}
function drawScope(cv,t){
  const {c,w,h}=SIM.canvas(cv,180), css=SIM.css; const L=refLevel(); const amp=L.v/2;
  c.strokeStyle=css('--grid'); for(let i=0;i<=10;i++){ c.beginPath(); c.moveTo(10+i*(w-20)/10,10); c.lineTo(10+i*(w-20)/10,150); c.stroke(); } c.beginPath(); c.moveTo(10,80); c.lineTo(w-10,80); c.stroke();
  c.fillStyle=css('--ink'); c.font='11px '+css('--mono');
  if (D.ref==='none'){ c.fillText('REF IN empty',20,84); return; }
  const tr=(f,col,off)=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=600;i++){ const x=10+i*(w-20)/600, v=f(i/600), yy=80+(off||0)-v*55; i?c.lineTo(x,yy):c.moveTo(x,yy); } c.stroke(); };
  if (D.ref==='aes'){
    const frame=Math.floor(t*REF.FS), pre=(frame%192===0)?[1,1,1,0,1,0,0,0]:[1,1,1,0,0,0,1,0], cells=pre.slice(); let lv=pre[7], seed=(frame*2654435761)>>>0;
    for(let i=0;i<28;i++){ seed=(seed*1103515245+12345)>>>0; lv^=1; cells.push(lv); if((seed>>16)&1) lv^=1; cells.push(lv); }
    tr(u=>cells[Math.min(63,Math.floor(u*64))]?amp:-amp,css('--accent2'));
    c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(`one subframe at frame ${frame} (${frame%192===0?'Z':'X'} preamble), 64 cells of 81.4 ns · ${f2(L.v,2)} V p-p at REF IN`,10,172);
  } else {
    const k=L.v; tr(u=>{ const us=u*63.556; if(us<4.7) return -0.3*k; if(us>5.3&&us<7.9) return 0.2*k*Math.sin(2*Math.PI*3.579545*us); return 0; },css('--accent2'),20);
    c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(`one line of black burst (63.56 µs) · sync ${f2(0.3*k,2)} V · ${f2(L.v,2)} V p-p`,10,172);
  }
}

/* ---------------- views ---------------- */
function viewSim(m){
  window[FLAG]=true;
  m.innerHTML = card('Frame family in the MFXX collection — pick one', `<div id="mxCmp"></div><div id="mxFam" style="margin-top:8px"></div>`)
   + card('Frame reference (MF-REF board, mf-ref.DSN) — click the BNCs, the termination or a position', `<div class="small" style="margin-bottom:6px"><button data-all>${D.allSlots?'Feed POS.12 only (1999 rear art)':'Feed every position (MF8212-3.DSN bus)'}</button> <button data-reset>Start over</button> <span class="muted">Keys: R cycles the reference, T termination, L loop.</span></div><div id="mxRef"></div>`)
   + `<div class="grid2">${card('MF82-4 supply strap (14-289 / 14-319)','<div id="mxPsu"></div>')}${card('What just happened','<div id="mxTr" class="log small mono"></div>')}</div>`
   + `<div class="grid2">${card('Grounding (SM82-4GS “QUAD DA FRAME GROUNDING DIAGRAM”)','<div id="mxGnd"></div>')}${card('D8212F transition backplane (MF8212TR.NET)','<div id="mxTrm"></div>')}</div>`
   + card('Timeline', '<canvas id="mxTl"></canvas>');
  let famKey='';
  SIM.on('time', t=>{
    m.querySelector('#mxCmp').innerHTML=compareHTML();
    if (famKey!==D.fam+D.trPos){ famKey=D.fam+D.trPos; m.querySelector('#mxFam').innerHTML=famHTML(); }
    m.querySelector('#mxRef').innerHTML=refPanelSVG(t); m.querySelector('#mxPsu').innerHTML=psuHTML(); m.querySelector('#mxGnd').innerHTML=groundHTML(); m.querySelector('#mxTrm').innerHTML=trHTML(); m.querySelector('#mxTr').innerHTML=traceHTML();
    m.querySelector('[data-all]').textContent=D.allSlots?'Feed POS.12 only (1999 rear art)':'Feed every position (MF8212-3.DSN bus)';
    bindAll(m); SIM.drawLanes(m.querySelector('#mxTl'), lanes(), {labelW:200});
  });
}
const ES_STEPS = [
  ['unpacked','Unpack and check against the packing slip'],['dasOut','Remove all distribution amplifiers'],['mounted','Mount the frame, away from heat sources'],
  ['circuits','Feed the two cords from separate AC circuits / phases'],['fuse','Check the AC fuses: 0.75 A slow-blow #3AG'],
  ['groundsJoined','Join chassis and system ground only at the station ground'],['shield','Ground each cable shield at the receiving end'],
  ['ps1','Extender in, PS1 only: ≈ 42 V across pins 13–15'],['ps2','PS2 only: ≈ 42 V again'],['both','Both supplies: little change'],['dasIn','Insert the DAs; watch the red/green LEDs'],
];
function viewTut(m){
  window[FLAG]=true;
  m.innerHTML = card('MF82E/S stereo mounting frame — installation and setup', `<p class="small">From <span class="mono">MF82ES - #Engineering/MANUAL/INSTALLATION AND SETUP.doc</span> (2000|33), the only frame manual text in the archive. The table of contents also lists drawings L2 (input connector, EDAC 38-pin), L3 (output connector), S1 system, S2 typical DA, S3 SA14-312 backplane, S4 ribbon (“P15 AND P16 ARE HAND WIRED”), S5 SA14-313 backplane. Click each step; some ask you to choose.</p><div id="mxEs"></div>`)
   + `<div class="grid2">${card('Goals (checked live)','<ol id="mxGoals" class="small"></ol>')}${card('Bench','<div id="mxBench"></div><div id="mxTr2" class="log small mono"></div>')}</div>`;
  SIM.on('time', t=>{
    const es=D.es, o=psuOut();
    m.querySelector('#mxEs').innerHTML=`<table class="kv">${ES_STEPS.map(([k,l],i)=>{ let ctl;
      if (k==='circuits') ctl=`<select data-es="circuits"><option value="">choose…</option><option value="same" ${es.circuits==='same'?'selected':''}>both cords on one outlet strip</option><option value="separate" ${es.circuits==='separate'?'selected':''}>two circuits, different phases</option></select>`;
      else if (k==='fuse') ctl=`<select data-es="fuse"><option value="">choose…</option><option value="2" ${es.fuse==='2'?'selected':''}>2 A 5×20 mm (2013 MF8212 BOM)</option><option value="0.75" ${es.fuse==='0.75'?'selected':''}>0.75 A slow-blow #3AG</option></select>`;
      else if (k==='groundsJoined') ctl=`<select data-es="groundsJoined"><option value="">choose…</option><option value="frame" ${es.groundsJoined==='frame'?'selected':''}>strap the two posts together</option><option value="station" ${es.groundsJoined==='station'?'selected':''}>join at the station ground point</option></select>`;
      else if (k==='shield') ctl=`<select data-es="shield"><option value="">choose…</option><option value="both" ${es.shield==='both'?'selected':''}>both ends</option><option value="receive" ${es.shield==='receive'?'selected':''}>receiving end</option></select>`;
      else ctl=`<button data-es="${k}" style="${es[k]?'background:var(--accent);color:#fff':''}">${es[k]?'✓ done':'do it'}</button>`;
      return `<tr><th>${i+1}. ${l}</th><td>${ctl}</td><td class="small muted">${ES_TXT[k]}</td></tr>`; }).join('')}</table>`;
    m.querySelectorAll('[data-es]').forEach(el=>{ const k=el.dataset.es; if (el.tagName==='SELECT') el.onchange=()=>A.es(k, el.value||null); else el.onclick=()=>A.es(k); });
    const G=[
      ['Frame unpacked, emptied and mounted',()=>es.unpacked&&es.dasOut&&es.mounted,'Steps 1–3.'],
      ['Two independent AC feeds',()=>es.circuits==='separate','Pick “two circuits, different phases”.'],
      ['Right fuse in the holders',()=>es.fuse==='0.75','The MF82E/S manual asks for 0.75 A slow-blow #3AG, not the 2013 MF8212 BOM part.'],
      ['Grounds and shields as the manual says',()=>es.groundsJoined==='station'&&es.shield==='receive','Join chassis and system ground only at the station ground; shields at the receiving end.'],
      ['Each supply proves ≈ 42 V on its own',()=>es.ps1&&es.ps2&&Math.abs(o.vp+o.vn-42)<3,'Do steps 8 and 9 with the DAs still out. If the reading is wrong, check the MF82-4 strap on the Simulator tab.'],
      ['Both supplies, then DAs in',()=>es.both&&es.dasIn&&es.dasOut,'Steps 10 and 11.'],
    ];
    let first=true; m.querySelector('#mxGoals').innerHTML=G.map(([g,ok,h])=>{ const d=ok(); const s=!d&&first; if(!d) first=false; return `<li style="${d?'color:var(--accent)':''}">${d?'✓':'○'} ${g}${s?`<div class="muted">Hint: ${h}</div>`:''}</li>`; }).join('');
    m.querySelector('#mxBench').innerHTML=`<table class="kv small"><tr><th>Extender pins 13–15</th><td class="mono">${(es.ps1||es.ps2||es.both)?f2(o.vp+o.vn,1)+' V':'—'}</td></tr><tr><th>Supply LEDs</th><td>${es.dasIn?'GREEN on, RED on (current drawn)':(es.ps1||es.ps2||es.both)?'GREEN on, RED off (no load)':'off'}</td></tr><tr><th>Grounds</th><td>${es.groundsJoined==='frame'?'<b style="color:var(--bad)">joined at the frame — defeats the isolated posts</b>':es.groundsJoined==='station'?'isolated in the frame, joined at the station':'—'}</td></tr></table>`;
    m.querySelector('#mxTr2').innerHTML=traceHTML();
  });
}
function viewSecond(m){
  window[FLAG]=true;
  m.innerHTML = card('One second of the frame reference, as the slots see it', `<p class="small">REF IN carries either AES-3id (48 kHz frames, a Z preamble every 192 frames = 4 ms) or black burst (63.56 µs lines, 59.94 Hz fields). On the MF-REF board the CS8412 (U3) recovers FSYNC from AES and the EL2099 (U7) drives the video line; the reference reaches the slot a few hundred nanoseconds later. Change the reference on the Simulator tab (or press R): it reappears here from the playhead, and the CS8412 needs ${REF.LOCK*1000} ms ${inf('CS8412 PLL lock time')} before FSYNC appears.</p><canvas id="mxTl2"></canvas>`)
   + card('Scope at REF IN, at the playhead', '<canvas id="mxSc"></canvas>')
   + card('Timing numbers', `<table class="kv small"><tr><th>AES frame</th><td>1/48 000 = 20.83 µs; 64 bit cells of 325.5 ns, 128 biphase half-cells of 162.8 ns</td></tr><tr><th>AES block</th><td>192 frames = 4.000 ms (Z preamble)</td></tr><tr><th>Video</th><td>line 63.556 µs, field 16.683 ms, frame 33.367 ms</td></tr><tr><th>Backplane</th><td>${REF.PS_IN*1e12} ps per inch ${inf('FR-4 stripline')} × slot pitch (1.000 / 1.260 in) → under 2 ns end to end: far below one AES half-cell</td></tr></table>`);
  SIM.on('time', t=>{ SIM.drawLanes(m.querySelector('#mxTl2'), lanes(), {labelW:200}); drawScope(m.querySelector('#mxSc'),t); });
}
const BLK = {
  in:['REF IN / loop BNCs','Two BNCs side by side on the rear (82M71.DXF “REFERENCE INPUT”; MF82XXRR.CDR draws them joined by a loop). 75 Ω termination on the frame ('+'value per the d8210-d8212 reading of MF8212-3.DSN'+').'],
  cs:['U3 CS8412','Crystal CS8412 AES/EBU receiver on mf-ref.DSN: locks to the AES reference and outputs FSYNC/word clock '+'(pins used not recoverable from the DSN)'+'.'],
  el:['U7 EL2099','Elantec EL2099 high-current video amplifier: drives the VIDEO REFERENCE line along the backplane.'],
  reg:['LM7805 / LM7915','Local +5 V and −15 V regulators fed from the frame ±22 V.'],
  con:['J? CON20','20-way connector to the frame backplane (MF8212BP TSW-110 2×10 header in the 2013 BOM — '+'pairing inferred'+').'],
  bus:['AES REF BUS / VIDEO REFERENCE','MF8212-3.DSN runs both lines past POS.1 … POS.12; the 1999 rear art says only POS.12 (POS.10 on MF8210) “may be synchronized to the Reference Input BNCs”.'],
  slot:['Card','D8205/D8206/D8207 use the reference (“MF82REF option” in their manuals, per the README).'],
};
function viewBlock(m){
  window[FLAG]=false;
  const b=(k,x,y,w,h)=>`<g class="mxb" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="12" fill="var(--ink)">${BLK[k][0]}</text></g>`;
  const ar=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#mxar)"/>${l?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" text-anchor="middle" font-size="10" fill="var(--ink2)">${l}</text>`:''}`;
  m.innerHTML = card('MF-REF frame reference — click a block', `<svg viewBox="0 0 980 260" style="width:100%"><defs><marker id="mxar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>
   ${b('in',10,100,150,50)}${b('cs',230,40,140,50)}${b('el',230,160,140,50)}${b('reg',230,220,140,34)}${b('con',440,100,120,50)}${b('bus',620,100,200,50)}${b('slot',860,100,110,50)}
   ${ar(160,115,230,65,'AES')}${ar(160,135,230,185,'video')}${ar(370,65,440,115,'FSYNC')}${ar(370,185,440,135,'')}${ar(560,125,620,125,'')}${ar(820,125,860,125,'')}${ar(300,220,300,210,'')}</svg><div id="mxBd" class="small"></div>`)
   + card('MF82-4 supply (14-289) — power path', `<svg viewBox="0 0 980 90" style="width:100%">${['AC 115/230','J1 or J2+J3','T1 229C40','CR1 RS605','F1/F2 0.75 A','C1/C4 2200/35','LM317T/LM337T','P1 EDGE24/156'].map((s,i)=>`<rect x="${6+i*121}" y="20" width="112" height="44" rx="7" fill="var(--panel2)" stroke="var(--line)"/><text x="${62+i*121}" y="47" text-anchor="middle" font-size="11" fill="var(--ink)">${s}</text>${i<7?`<line x1="${118+i*121}" y1="42" x2="${127+i*121}" y2="42" stroke="var(--ink2)"/>`:''}`).join('')}</svg>`);
  const upd=()=>{ m.querySelector('#mxBd').innerHTML=`<b>${BLK[D.blk][0]}</b> — ${BLK[D.blk][1]}`; m.querySelectorAll('.mxb rect').forEach(r=>{ const on=r.parentNode.dataset.k===D.blk; r.setAttribute('fill',on?'var(--accent)':'var(--panel2)'); r.nextElementSibling.setAttribute('fill',on?'#fff':'var(--ink)'); }); };
  m.querySelectorAll('.mxb').forEach(g=>g.onclick=()=>{ D.blk=g.dataset.k; upd(); }); upd();
}
function viewSchem(m){
  window[FLAG]=false;
  const parts=['C6 C','C8 CAP POL','J? CON20','R17','R19','R20','R21','R22','R27','R51','R52','R53','R54','R56','R57','R58','R59','U3 CS8412','U7 EL2099','U? LM7805','U? LM7915'];
  m.innerHTML = card('MF-REF (mf-ref.DSN, OrCAD 2000|33) — parts placed, REDRAWN as a list', `<p class="small">The DSN keeps 21 placed parts and a BNC symbol; nets are not recoverable from the binary, so this is the part list, not a wiring diagram.</p><div style="display:flex;flex-wrap:wrap;gap:6px">${parts.map(p=>`<span class="mono small" style="border:1px solid var(--line);border-radius:4px;padding:2px 6px">${p}</span>`).join('')}</div>`)
   + card('MF8212TR transition backplane — REDRAWN from MF8212TR.NET (click a position on the Simulator tab)', `<div class="scroll"><svg viewBox="0 0 980 300" style="width:100%;min-width:760px" font-family="var(--mono)">${Array.from({length:12},(_,i)=>{ const n=i+1, x=20+i*80, m2=trMap(n); return `<rect x="${x}" y="20" width="60" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+30}" y="36" text-anchor="middle" font-size="10" fill="var(--ink)">P${16+n}</text><text x="${x+30}" y="50" text-anchor="middle" font-size="9" fill="var(--ink2)">CON20</text><text x="${x+30}" y="66" text-anchor="middle" font-size="9" fill="var(--accent2)">1,2 → ${m2.ih}</text><text x="${x+30}" y="80" text-anchor="middle" font-size="9" fill="var(--ink2)">3,4 → COM</text><text x="${x+30}" y="94" text-anchor="middle" font-size="9" fill="var(--accent)">5–20 →</text><line x1="${x+30}" y1="140" x2="${x+30}" y2="180" stroke="var(--accent)"/><rect x="${x+5}" y="180" width="50" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+30}" y="204" text-anchor="middle" font-size="10" fill="var(--ink)">P${n}</text><text x="${x+30}" y="234" text-anchor="middle" font-size="9" fill="var(--ink2)">16-way</text>`; }).join('')}
     <rect x="20" y="255" width="380" height="30" fill="none" stroke="var(--accent2)"/><text x="210" y="274" text-anchor="middle" font-size="10" fill="var(--accent2)">P13 (16-way): inputs of positions 1–5 + 6 grounds</text>
     <rect x="420" y="255" width="540" height="30" fill="none" stroke="var(--accent2)"/><text x="690" y="274" text-anchor="middle" font-size="10" fill="var(--accent2)">P14 (26-way 609-2653): inputs of 6–12 + 10 grounds; pins 25/26 → mounting screws X1/X2</text></svg></div>`)
   + card('MF82-4 supply 14-289 — REDRAWN from the Tango part list', `<table class="kv small"><tr><th>Input</th><td>T1 229C40 (pattern 229C56); J1 230 V, J2+J3 115 V (board text)</td></tr><tr><th>Rectifier</th><td>CR1 RS605 bridge; F1, F2 0.75 A (AGC.750)</td></tr><tr><th>Reservoirs</th><td>C1, C4 2200/35 (C35E-2200); C2, C5 0.1/100V; C3, C6 1/35</td></tr><tr><th>Regulators</th><td>U1 LM317T with R2 240 / R3 3K9 → +21.56 V; U2 LM337T with R4 120 / R5 2K → −22.08 V; on heat sink XX2 (HSINK4)</td></tr><tr><th>Protection</th><td>CR2–CR5 1N4003</td></tr><tr><th>Other</th><td>R1 10K 3.75 W, DS1 right-angle LED, P1 24-way 0.156 in edge, Y1–Y4 lugs (transformer leads ${inf('position next to T1')})</td></tr></table>`)
   + card('14-312 (SA14-312) backplane for the MF82E/S', `<div style="background:#0d0f10;border-radius:6px"><img src="${ASSET}mfxx-bp14-312.png" style="width:100%;display:block" alt="14-312 board"></div><p class="small">12 × CON20 (P17–P28), 13 × CONN16 + 3 × CONN26 ribbons, 192 × “30 1W” resistors (16 per position: a 30 Ω build-out on each leg of 8 outputs ${inf('16 = 8 pairs')}), 96 links. ASSEMBLY.DOC: “CUT LINKS: 1-24, CONNECT LINKS: 25-48” for the MF82E/S. <button data-links="factory">standard</button> <button data-links="es">MF82E/S</button> <span class="mono" id="mxLk"></span></p>`);
  const L=m.querySelector('#mxLk'); const upd=()=>{ L.textContent = D.links==='es'? 'LK1–24 cut, LK25–48 fitted' : 'LK1–24 fitted, LK25–48 open'; };
  m.querySelectorAll('[data-links]').forEach(b=>b.onclick=()=>{ A.links(b.dataset.links); }); SIM.on('time',upd); upd();
}
function viewSoft(m){
  window[FLAG]=false;
  m.innerHTML = card('Reference signal path, stage by stage (no firmware)', '<div id="mxSt"></div>') + card('Supply path for the selected strap', '<div id="mxPs"></div>');
  SIM.on('time', t=>{
    const L=refLevel(), lk=locked(t), n=D.slot;
    const st=[
      ['REF IN BNC', D.ref==='none'?'empty':`${D.ref==='aes'?'AES-3id':'black burst'} ${f2(L.v,2)} V p-p`, L.txt, D.ref!=='none'&&L.nT===1],
      ['75 Ω termination', D.term?'fitted':'off', D.loop?'loop cable to next frame'+(D.loopTerm?' (terminated there)':''):'no loop', L.nT===1],
      [D.ref==='aes'?'U3 CS8412 receiver':'U7 EL2099 driver', D.ref==='aes'?(lk?'locked, FSYNC 48 kHz':'not locked'):D.ref==='video'?'buffering':'idle', D.ref==='aes'?`lock ${REF.LOCK*1000} ms, delay ${REF.CS_DLY*1e9} ns (inferred)`:`delay ${REF.EL_DLY*1e9} ns (inferred)`, D.ref==='video'||lk],
      ['J? CON20 → backplane', 'reference line', 'MF82REF configuration', true],
      [`Position ${n}`, slotFed(n)?`+${f2(delayTo(n)*1e9,1)} ns`:'not connected', D.allSlots?'bus to all positions (MF8212-3.DSN)':'POS.12 / POS.10 only (MF82XXRR.CDR)', slotFed(n)],
    ];
    const o=psuOut();
    const ps=[['Mains',`${D.mainsV} V`,D.board],[`Strap`,o.s.txt.replace(/<[^>]+>/g,'').slice(0,70),''],['T1 secondary',o.s.sec?f2(o.s.sec,1)+' V rms':'—',''],['Raw DC',o.vpk?f2(o.vpk,1)+' V peak':'—',o.fault||''],['Outputs',`+${f2(o.vp)} / −${f2(o.vn)} V`,'LM317T / LM337T']];
    const rows=(a,ok)=>`<svg viewBox="0 0 980 ${a.length*36+10}" style="width:100%">${a.map((r,i)=>`<rect x="6" y="${6+i*36}" width="968" height="30" rx="6" fill="${(ok?r[3]:!r[2]||!/raw|over/i.test(r[2]))?'var(--panel2)':'rgba(220,60,40,.18)'}" stroke="var(--line)"/><text x="16" y="${26+i*36}" font-size="12" font-family="var(--mono)" fill="var(--ink)">${i+1}. ${r[0]}</text><text x="300" y="${26+i*36}" font-size="12" fill="var(--accent)">${esc(r[1])}</text><text x="620" y="${26+i*36}" font-size="11" fill="var(--ink2)">${esc(r[2])}</text>`).join('')}</svg>`;
    m.querySelector('#mxSt').innerHTML=rows(st,true); m.querySelector('#mxPs').innerHTML=rows(ps,false);
  });
}
function viewFind(m){
  window[FLAG]=false;
  const F=[
   ['Superseded set that the masters still point to.','The README counts 18 drawing numbers present both here and in <span class="mono">D8210 & D8212 - #Master</span>. Only two files are byte-identical across the two trees: <span class="mono">MF8212 - #Engineering/MF82SILK.CDR</span> = <span class="mono">…#Mechanical #DA #2016/OLDER ISSUES/MF82SILK.CDR</span>, and <span class="mono">D8212E/ACAD/82-008-1.dwg</span> = the master <span class="mono">82-008-1 ISS1 (MTG. BLOCK).dwg</span>. Yet the master PDFs’ title blocks still say “FOLDER: MFXX/…”.'],
   ['The reference reaches one slot, or all of them.','<span class="mono">MF82XXRR.CDR</span> (1999 rear art): “*POS.12 This position may be synchronized to the Reference Input BNCs” (and *POS.10 on the MF-82/10). <span class="mono">MF8212-3.DSN</span> and <span class="mono">MF8210.DSN</span> draw an AES REF BUS and VIDEO REFERENCE along the frame. Toggle both on the Simulator tab.'],
   ['MF8210 pitch is 1.260 in, not 1.2.','<span class="mono">MF8210RM1 ISS 2</span>: “9 PITCHES OF 1.260 = 11.340”, in the same 17.090 in housing as the MF8212 (11 × 1.000). The d8210-d8212 plugin uses 1.2 in as an inferred value.'],
   ['On the MF8210, mains runs through the backplane.','<span class="mono">MF8210.DXF</span> (1997|30) has AC1 and AC2 pads labelled N and L next to the two 24-way supply sockets, plus GND and REF IN — the supply edge connector carries line voltage.'],
   ['MF8212TR splits the inputs 5 / 7.','In <span class="mono">MF8212TR.NET</span> the input pairs of positions 1–5 go to P13 (16-way) and positions 6–12 to P14 (26-way); P14 pins 25/26 are tied to the mounting screws X1/X2, so the ribbon’s last conductors bond to chassis. Output pins 5–20 of each CON20 go straight to its own 16-way header (pin n → n − 4).'],
   ['14-319 lost the dual-voltage strap.','14-289 ISS2 carries “*For 115 Volt AC, add Jumpers J2 & J3. *For 230 Volt AC, add Jumper J1.” The later, shorter 14-319 (SA14-319 lists no T1, and MM82-036 is “SHORTENED FOR TOROID LOCATION”) has no strap note: the transformer moved off the board ('+inf('toroid on the chassis')+').'],
   ['Set points: +21.56 V / −22.08 V.','LM317T with 240/3K9 and LM337T with 120/2K. Sum 43.6 V — the MF82E/S manual’s “approximately 42 V” check.'],
   ['Fuse ratings disagree across the frame family.','82M71.DXF and MF82SILK.CDR print “1.5/0.75 A SB, 115/230 V”; the MF82E/S manual asks for “0.75 (min.) amp slow blow #3AG”; the 2013 MF8212 BOM fits 2 A 5×20 mm; the supply cards carry their own 0.75 A fuses.'],
   ['The MF-REF schematic carries another project’s library.','<span class="mono">mf-ref.DSN</span> places 21 parts but its cache lists PIC16C54A, CS4329, OPA650, LF353, 75176, DS2631, LM2825, LM317/337 and switches from other designs (library paths C:\\PROJ\\ORC2-W\\DA_RECVM.OLB, C:\\PROJ\\PHASE3\\RS81S, C:\\PROJ\\S103AV): it was started from a copy of another schematic.'],
   ['Grounding diagram forbids the normal mains earth.','SM82-4GS: “DO NOT USE ‘U’ GROUND ON RECEPTACLE IN THIS APPLICATION … TO BE RUN IN CONDUIT … ISOLATED GND”. The MF82E/S manual allows either the binding post or the green wire. Two binding posts (chassis, system ground) are isolated inside the frame in both.'],
   ['Non-MF82 items in the folder.','MF85 (M8512, M8575 / 14-269), MF100 and MF104 SerialBoxx frames (2004|37: “90V to 230V, 50 or 60 Hz”, 96-pin card connectors), MF251 console power (1999|32) and an M8245A photo (2008|41).'],
   ['Small leftovers.','<span class="mono">COMPSWAP.LOG</span> (2004|37) refers to “symbol PWR2 on sheet Sheet4” though every frame DSN here is one page; <span class="mono">82M72–74 VOID.DWG</span>; <span class="mono">MF8212-F&E.dwg</span> modifies RM1/RM2 with SO-440-8 hardware; MF82XXDM.CDR gives 13.75 in as “336 mm” (it is 349 mm).'],
  ];
  m.innerHTML = card('Findings', `<ol>${F.map(f=>`<li><b>${f[0]}</b> ${f[1]}</li>`).join('')}</ol>`)
   + card('Drawings used', `<div class="grid2"><div><img src="${ASSET}mfxx-dims-plan.png" style="width:100%;background:#fff;border-radius:6px" alt="MF82XX dimensions plan"><div class="small muted">MF82XXDM.CDR (1998|31) via Inkscape — 19.00 × 13.75 in plan (text lost in conversion)</div></div><div><img src="${ASSET}mfxx-rear-art-mf8210.png" style="width:100%;background:#fff;border-radius:6px" alt="MF-82/10 rear art"><div class="small muted">MF82XXRR.CDR (1999|32) MF-82/10 rear: binding posts, two cords, looped REF BNCs, 10 positions</div><img src="${ASSET}mfxx-dxf-82m71.png" style="width:100%;margin-top:8px;border-radius:6px" alt="82M71 rear housing"><div class="small muted">82M71.DXF (1998|31) MF8210 rear housing, 17.09 × 3.425 in: “1.5/0.75 A SB 115/230 V”, PS1, PS2, REFERENCE INPUT</div><img src="${ASSET}mfxx-dwg-mf8210rm1.png" style="width:100%;margin-top:8px;background:#fff;border-radius:6px" alt="MF8210RM1"><div class="small muted">MF8210RM1 ISS 2 (master PDF)</div></div></div>`);
}

SIM.register({
  id:'mfxx', product:'MFXX DA frame', year:2000, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/MFXX (DA FRAME) - #Engineering #PROBLEM #MF82',
  name:'MFXX DA frame · MF82 frame engineering collection (1994|27–2013|46)',
  summary:'The working engineering set behind every MF82 frame: the 4-slot MF82-4 with its own LM317/LM337 supply, the MF8210 and MF8212, the MF82E/S stereo frame and its manual, the D8212F transition backplane and the MF-REF frame-reference board. Compare the frames, strap the supply, route a position through MF8212TR and send an AES or video reference down the frame.',
  highlights:['Real Tango boards (14-289, 14-319, 14-312, MF8212TR) and DXF rear/backplane drawn to scale','MF-REF reference: AES lock, FSYNC and per-slot delay','MF82E/S installation tutorial from the 2000|33 manual','115/230 V strap and grounding-scheme checks','Findings: one-slot vs bus reference, 1.260 in MF8210 pitch, mains on the MF8210 backplane'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 AES frame',period:()=>1/48000},{label:'1 video line',period:()=>1001/60000/262.5},{label:'1 AES block (4 ms)',period:()=>0.004}],
  zooms:[[1,'1 s (whole)'],[0.02,'20 ms'],[0.004,'1 AES block'],[0.0002,'200 µs'],[4/48000,'4 AES frames']],
  defaultZoom:1,
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: MF82E/S setup',render:viewTut},
    {id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics (redrawn)',render:viewSchem},
    {id:'software',label:'Signal & power path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewFind},
  ],
});
})();
