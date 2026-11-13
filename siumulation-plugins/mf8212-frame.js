/* =====================================================================
   MF8212 Frame — the 12-slot MF82-12 rack frame as built from its 2013|46 BOMs
   (Ward-Beck Systems 8200 Distribution Series). Plugin for the WBS Device Simulator.

   Sources used (all under #MF8200 #SERIES/):
   - MF8212 Frame - #Master #MF82/MF8212 BOM Costed.xlsx, MF8212 BOM Misys.xls (MI632001, 2013-08-08):
       frame BOM, 34 lines, total 239.5052
   - …/MF8212BP BOM Costed.xlsx (total 65.37), MF8212BP BOM Misys.xls and
       MF8212 Frame - #BOM/MF8212BP BOM QUOTE Misys.xls (total 62.796): backplane BOM
   - …/MF8212 BP.xlsx, MF8212 Frame.xlsx, MF8212 Frame - #BOM/MF8212 BOM.xlsx, MF8212 Frame BOM.xlsx (uncosted copies)
   - D8210 & D8212 - #Master #MF82/D8210 & D8212 - #Mechanical #DA #2016/*.pdf (rotated upright):
       MF8212RM1 ISS 2, 82-002 ISS 4, 82-003 ISS 2, 82-004-1 ISS 7, 82-004-2 ISS 6, 82-072 ISS 4, 8212-020 ISS 3,
       82-077, 82-009-1, 82-011, 82-008-1, 7-03-209, 82-075/076/079, 8205-004, MF8212RM2, SP3X4#4-CUSTOM
       → assets/mf8212-frame-dwg-*.png (rendered and cropped, not redrawn)
   - MFXX (DA FRAME)…/MF8212 - #Engineering/MF8212-3.DSN, MF8212.DSN (frame wiring: PS1, PS2, F1/F2 "1.5/0.75 SB",
       ±22 V, AES REF BUS, VIDEO REFERENCE, CHASSIS / SYSTEM GND binding posts, POS.1…POS.12 CON20), MF82SILK.CDR
   - MFXX…/MF82-4 - #Engineering/14-289.PCB, SA14-289.DWG (frame power supply: LM317T/LM337T, R2 240, R3 3K9,
       R4 120, R5 2K, C1/C4 2200/35, RS605, T1 229C40, F1/F2 0.75 A, P1 EDGE24/156)
   - MFXX…/MF82ES - #Engineering/MANUAL/INSTALLATION AND SETUP.doc (M8245A supplies, 42 V check on extender
       pins 13 and 15, RED/GREEN LEDs), MFXX…/MF82XXMN.CDR, MF82XXDM.CDR (19.00 × 3.50 × 13.75 in)
   - M8209 - #Engineering #MF82/PCB/m8209_iss1.net (card side of the 30-way EDAC: V+ P1-29/30, V− P1-25/26, GND P1-3/27/28)
   - card currents: D8204MAN.WPD, M8202MAN.pdf (as quoted in d8210-d8212.js)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const FLAG = '__mf8212frameActive';
const inf = w => `<span class="tag-inf" title="Not stated in the source${w?'; inferred from '+w:''}">inferred</span>`;
const card = (t,b,x) => `<div class="card" ${x||''}><h2>${t}</h2>${b}</div>`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const f2 = (v,n) => (+v).toFixed(n==null?2:n);
const money = v => '$'+(+v).toFixed(2);

/* ---------------- BOMs (MF8212 BOM Costed.xlsx / MF8212BP BOM Costed.xlsx, Aug 2013) ---------------- */
// [line, part, description, qty, std cost, supplier P/N, group, build step]
const FRAME_BOM = [
 [1,'MF8212BP','MF82-12 BACKPLANE ASSEMBLY',1,62.796,'(sub-assembly)','bp',5],
 [2,'#6SL','RoHS SOLDER LUG #6',3,0.0874,'KEYSTONE 904','hw',7],
 [3,'H20X3/4','HELLERMAN SLEEVE',4,0.0902,'H20X3/4','hw',6],
 [4,'11-0103-001','RoHS BINDING POST JOHNSON BLACK',1,1.716,'JOHNSON 111-0103-001','power',7],
 [5,'11-0104-001','RoHS BINDING POST JOHNSON GREEN',1,2.99,'JOHNSON 111-0104-001','power',7],
 [6,'17251','RoHS AC CORD-DETACHABLE 3C BLK',2,2.65,'17251-10-B1','power',10],
 [7,'370-405','SCREW 8-32x3/8" ALLEN KEYWAY',1,0.322,'BS-08NC-03-S','hw',8],
 [8,'616-220-301','RoHS GUIDE PCB EDAC RACK MTG 6.5"',4,0.528,'EDAC 616-220-301','mech',3],
 [9,'616-220-306','RoHS GUIDE PCB EDAC RACK MTG 9"',28,0.723,'EDAC 616-220-306','mech',3],
 [10,'7-03-209','RoHS DOOR PANEL LATCH *note',1,3,'Ward-Beck','mech',8],
 [11,'82-002-1','RoHS 8212 SUPPORT RAIL UPPER FRONT',1,5.5,'Ward-Beck','mech',2],
 [12,'82-002-2','RoHS 8212 SUPPORT RAIL LOWER FRONT',1,4.75,'Ward-Beck','mech',2],
 [13,'82-003-1','RoHS 8212 SUPPORT RAIL UPPER REAR',1,5.25,'Ward-Beck','mech',2],
 [14,'82-003-2','RoHS 8212 SUPPORT RAIL LOWER REAR',1,5.25,'Ward-Beck','mech',2],
 [15,'82-004-1','RoHS 8210/12 SIDE PLATE LEFT',1,10,'Ward-Beck','mech',1],
 [16,'82-004-2','RoHS 8210/12 SIDE PLATE RIGHT VENTED',1,10,'Ward-Beck','mech',1],
 [17,'82-008-1','RoHS 8210/12 MTG BLOCK PWR SUPPLY',1,1.35,'Ward-Beck','mech',4],
 [18,'82-009-1','RoHS 8210/12 SPRING PLATE',1,3.75,'Ward-Beck','mech',8],
 [19,'82-011-1','RoHS LACING BAR',1,3.1,'Ward-Beck','mech',6],
 [20,'82-011-2','RoHS PILLAR LACING BAR',2,1.5,'Ward-Beck','mech',6],
 [21,'82-072','RoHS POWER SUPPLY BOX',1,10,'Ward-Beck','mech',4],
 [22,'82-077','RoHS POWER SUPPLY BOX DOOR',1,7,'Ward-Beck','mech',9],
 [23,'8212-020','RoHS 8210/12 FRONT DOOR PANEL *NOTE',1,7,'Ward-Beck','mech',8],
 [24,'MF8212RM1','RoHS REAR HOUSING 8212',1,15,'Ward-Beck','mech',6],
 [25,'MF8212RM2','RoHS POWER SOURCE COVER',1,6.9,'Ward-Beck','mech',7],
 [26,'723W-X2/02','RoHS POWER INLET/FUSEHOLDER AC',2,1.0195,'Digi-Key Q204-ND','power',7],
 [27,'218002','FUSE SB 2.000 AMP (5X20MM)',2,0.476,'S506-2-R','power',7],
 [28,'9604','RoHS SPRING CLIP',2,0.83,'Ward-Beck','hw',8],
 [29,'9750','RoHS WASHER FISH PAPER .14IDx.37OD',3,0.08,'Ward-Beck','hw',7],
 [30,'9752','RoHS ALLEN SCREW',1,0.25,'Ward-Beck','hw',8],
 [31,'SE-37-CP','EYELET 3/32 X 7/32',16,0.0204,'Spae-naur E-37','hw',3],
 [32,'SE-38-CP','EYELET 3/32 X 8/32',48,0.0226,'Locator SE-38','hw',3],
 [33,'00PT5','LABOUR/PRODUCTION-TEST',0.5,24,'—','labour',10],
 [34,'00PW4','LABOUR/PRODUCTION-WIRING',1,24,'—','labour',10],
];
const FRAME_TOTAL = 239.5052;
// backplane: [line, part, desc, qty, Misys cost, Costed.xlsx cost, supplier P/N]
const BP_BOM = [
 [1,'MF8212-PCB','MF8212 BACKPLANE PCB ISSUE 5',1,11.08,11.08,'Lazer Tech ISS5'],
 [2,'307-30-20-01','RoHS CONN 30P PCB TABS NO LUGS',12,1.72,1.90,'EDAC 307-030-526-201'],
 [3,'307-24-20-01','RoHS CONN 24S PCB TABS NO LUGS',2,2.275,2.48,'EDAC 307-024-526-301'],
 [4,'65780-020','RoHS CONN 20S SINGLE BERG SOCKET',12,1.25,1.25,'SAMTEC SSW-120-06-GS'],
 [5,'929665-01-10','RoHS CONN 20P 2x10 MALE BERG',1,0.40,0.40,'SAMTEC TSW-110-07-GD'],
 [6,'SSW-102-06-GS','RoHS CONN 2S SINGLE BERG SOCKET',12,0.198,0.198,'SSW-102-06-GS'],
 [7,'00PM3','LABOUR/PRODUCTION-MODULE',0.5,17.5,17.5,'—'],
];
const GROUPS = {bp:['Backplane MF8212BP','#4c8bf5'],mech:['Sheet metal & guides (WBS-made)','#9a7b4f'],power:['AC entry & grounding','#d0623c'],hw:['Hardware','#7f8c8d'],labour:['Labour','#38a169']};

/* ---------------- assembly steps (tutorial) ---------------- */
const STEPS = [
 {k:1,t:'Side plates',p:'82-004-1 LH and 82-004-2 RH (vented). 11-gauge CRS, 12.713 in deep, 3.470 in high, 0.940 in rack flange.',dwg:'82-004-1'},
 {k:2,t:'Guide support rails',p:'82-002-1/-2 front and 82-003-1/-2 rear rails (aluminium extrusion B9901, 17.120 in) between the side plates; 4-40 taps at each end.',dwg:'82-002'},
 {k:3,t:'Card and PSU guides',p:'28 × EDAC 616-220-306 9″ guides and 4 × 616-220-301 6.5″ guides, staked with 16 SE-37 + 48 SE-38 eyelets (64 = 2 per guide × 32 guides — '+'pairing inferred'+'). Card holes are 0.093 in at 11 × 1.000 in pitch.',dwg:'82-002'},
 {k:4,t:'Power-supply box',p:'82-072 enclosure (10.60 × 4.340 × 2.980 in, 60 vents) on the 82-008-1 mounting block. Only stainless hardware.',dwg:'82-072'},
 {k:5,t:'Backplane MF8212BP',p:'ISS5 PCB with 12 EDAC 307-030 card sockets, 2 EDAC 307-024 supply sockets, 12 SSW-120 rear-module strips, 12 SSW-102 and one 2×10 TSW-110 header.',dwg:'MF8212RM1'},
 {k:6,t:'Rear housing and lacing bar',p:'MF8212RM1 (“MF82REF configuration”, 16-ga CRS, 17.090 × 3.425 in, 12 cut-outs 0.750 × 2.700 in at 1.000 in), 82-011 lacing bar on two pillars, 4 Hellerman sleeves.',dwg:'MF8212RM1'},
 {k:7,t:'Power cover and AC entry',p:'MF8212RM2, two 723W-X2/02 IEC inlet/fuse-holders with 2 A 5×20 mm fuses, black (chassis) and green binding posts on fish-paper washers, three #6 solder lugs.',dwg:'MF8212RM2'},
 {k:8,t:'Front door',p:'8212-020 DA door (.063 aluminium, 17.060 in, 17.100 with blocks), 82-009-1 spring plate, 7-03-209 latch, 2 spring clips, allen keyway screw.',dwg:'8212-020'},
 {k:9,t:'Power-supply door',p:'82-077 door over the supply box (13 vents, PS1/PS2 lamps per the d8210-d8212 silk).',dwg:'82-077'},
 {k:10,t:'Cords, wiring and test',p:'Two 17251 AC cords; 1 h wiring and 0.5 h test labour.',dwg:null},
];

/* ---------------- cards (currents from manuals where quoted) ---------------- */
const CARDS = {
 M8202:{ip:85,in:85,src:'M8202MAN.pdf (±20 V, 85 mA)',inf:false,kind:'analog DA'},
 D8204:{ip:47,in:37,src:'D8204MAN.WPD (+20 V 47 mA, −20 V 37 mA)',inf:false,kind:'AES DA'},
 M8204:{ip:90,in:90,src:'not documented',inf:true,kind:'dual analog DA'},
 M8209:{ip:60,in:60,src:'4 × NE5532 + TIP29/TIP30 bias (m8209_ISS1.bom)',inf:true,kind:'2-ch line amp'},
 D8205:{ip:250,in:120,src:'SHARC + PIC + CPLD board (d8200)',inf:true,kind:'AES DSP DA'},
 M8251:{ip:70,in:70,src:'not documented',inf:true,kind:'video DA'},
};

/* ---------------- frame power supply (14-289 values; M8245A identity inferred) ---------------- */
const PSU = {
  VOP: 1.25*(1+3900/240),      // LM317T, R2 240 Ω, R3 3K9  → 21.56 V
  VON: 1.25*(1+2000/120),      // LM337T, R4 120 Ω, R5 2K   → 22.08 V
  VSEC: 20,                    // 229C40 = 40 V CT → 20 V rms per half (inferred from the part number)
  C: 2200e-6, FBR: 0.9, DROP: 2.0, ROUT: 0.25, FUSE: 0.75, KRMS: 1.8, EFF_VA: 1.25,
};
const K = { MAINS_F:60, THETA_CLOSED:0.45, THETA_OPEN:0.30, TAU:900, AMB:25 };

/* ---------------- state ---------------- */
const D = {
  built: {}, slots: [], psuIn:[true,true], mains:[true,true], strap:115, mainsV:115,
  vadj:[0,0], fuseA: 2.0, door:'closed', pick:'M8202', sel:null, blk:'bp', dwg:'MF8212RM1',
  failAt:[null,null], log:[], last:null, ext:false, bpCost:'misys', qty:1,
};
function initSlots(){ D.slots = Array.from({length:12},()=>({card:null,at:0})); }
function resetAll(full){
  initSlots(); D.psuIn=[true,true]; D.mains=[true,true]; D.vadj=[0,0]; D.fuseA=2.0; D.door='open'; D.failAt=[null,null]; D.mainsV=115; D.strap=115; D.ext=false;
  if (full){ D.built={}; STEPS.forEach(s=>D.built[s.k]=true); D.slots[0]={card:'M8202',at:0}; D.slots[1]={card:'D8204',at:0}; D.slots[2]={card:'M8209',at:0}; }
}
resetAll(true);
function frameBuilt(){ return STEPS.every(s=>D.built[s.k]); }

/* ---------------- power model ---------------- */
function loadAt(t){ let ip=0,iN=0,n=0; D.slots.forEach(s=>{ if(s.card && t>=s.at){ ip+=CARDS[s.card].ip/1000; iN+=CARDS[s.card].in/1000; n++; } }); if (D.ext){ ip+=0; } return {ip,iN,n}; }
function psuAlive(k,t){ return D.psuIn[k] && D.mains[k] && !(D.failAt[k]!=null && t>=D.failAt[k]) && D.built[7] && D.built[5]; }
function rawPeak(){ const m = D.mainsV/D.strap; return PSU.VSEC*Math.SQRT2*m - PSU.FBR; }
// solve a diode-free OR of two regulators with output resistance ROUT (inferred) sharing one rail
function share(vset, alive, I){
  const live=[0,1].filter(k=>alive[k]); if (!live.length || I<=0) return {vbus: live.length? Math.max(...live.map(k=>vset[k])) : 0, i:[0,0]};
  let lo=0, hi=Math.max(...live.map(k=>vset[k]));
  for (let it=0; it<50; it++){ const v=(lo+hi)/2; const s=live.reduce((a,k)=>a+Math.max(0,(vset[k]-v)/PSU.ROUT),0); if (s>I) lo=v; else hi=v; }
  const v=(lo+hi)/2, i=[0,0]; live.forEach(k=>i[k]=Math.max(0,(vset[k]-v)/PSU.ROUT)); return {vbus:v,i};
}
function power(t){
  const L=loadAt(t); let alive=[psuAlive(0,t),psuAlive(1,t)]; const blown=[false,false];
  const vp=[PSU.VOP+D.vadj[0],PSU.VOP+D.vadj[1]], vn=[PSU.VON+D.vadj[0],PSU.VON+D.vadj[1]];
  let P, N;
  for (let pass=0; pass<3; pass++){
    P=share(vp,alive,L.ip); N=share(vn,alive,L.iN);
    let changed=false;
    [0,1].forEach(k=>{ if (alive[k] && Math.max(P.i[k],N.i[k])*PSU.KRMS>PSU.FUSE){ alive[k]=false; blown[k]=true; changed=true; } });
    if (!changed) break;
  }
  const vpk=rawPeak(), over = D.mainsV/D.strap>1.5;
  const rail=(k,I)=>{ const dv=I/(2*K.MAINS_F*PSU.C); const trough=vpk-dv; const need=(k===0?vp:vn)[0]+PSU.DROP; return {dv, trough, head: trough-((I>0)?need:0)}; };
  const ps=[0,1].map(k=>{ const ip=P.i[k], iN=N.i[k]; const a=rail(0,ip), b=rail(1,iN);
    const vo=(k===0?vp:vp)[k];
    const reg=(vpk-a.dv/2-vp[k])*ip + (vpk-b.dv/2-vn[k])*iN;
    const pout=vp[k]*ip+vn[k]*iN; const pin=(pout+reg+2*PSU.FBR*(ip+iN))*1.15;
    const iac = alive[k]? pin/D.mainsV*1.6 : 0;
    return {alive:alive[k], blown:blown[k], ip, iN, rp:a, rn:b, reg, pin, iac, fuseOK: iac<D.fuseA, drop:a.head<0||b.head<0, vled:alive[k], iled:alive[k]&&(ip>0.02||iN>0.02)};
  });
  const pCards = P.vbus*L.ip + N.vbus*L.iN;
  const pTot = pCards + ps.reduce((a,p)=>a+(p.alive?p.pin-(P.vbus*p.ip+N.vbus*p.iN):0),0);
  const theta = D.door==='open'? K.THETA_OPEN : K.THETA_CLOSED;
  return {L, P, N, ps, pCards, pTot, rise:pTot*theta, over, any: ps.some(p=>p.alive)};
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.last={name,tr,t:SIM.t}; D.log.unshift({t:SIM.t,name}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  slot(i){ act(`Slot ${i+1}: ${D.slots[i].card?'pull '+D.slots[i].card:'insert '+D.pick}`, tr=>{
    if (!frameBuilt()){ tr('The frame is not finished: complete the assembly steps on the Tutorial tab first.'); return; }
    const s=D.slots[i]; D.sel=i;
    if (s.card){ tr(`${s.card} leaves EDAC 307-030 socket J${i+1} on MF8212BP; the ±22 V bus loses ${CARDS[s.card].ip}/${CARDS[s.card].in} mA`); s.card=null; return; }
    s.card=D.pick; s.at=SIM.t; const c=CARDS[D.pick];
    tr(`Slide ${D.pick} along two EDAC 616-220-306 9″ guides into the 30-way 307-030 socket (15 positions × 2 rows)`);
    tr(`Mates: pins 29/30 (position 15) = +22 V, 25/26 (position 13) = −22 V, 3/27/28 = GND (m8209_iss1.net card pin-out)`);
    tr(`Load step at t = ${SIM.fmtT(SIM.t)}: +${c.ip} mA / −${c.in} mA (${c.src}${c.inf?', inferred':''})`);
    const p=power(SIM.t+1e-6); tr(`Bus now +${f2(p.P.vbus)} V / −${f2(p.N.vbus)} V; PS1 ${f2(p.ps[0].ip*1000,0)} mA, PS2 ${f2(p.ps[1].ip*1000,0)} mA on the + rail`);
    if (p.ps.some(q=>q.blown)) tr('⚠ A supply fuse (F1/F2 0.75 A on the 14-289 board) is over its rating: that supply drops out and the other takes the whole load');
  }); },
  pick(c){ D.pick=c; SIM.refresh(); },
  psu(k){ act(`${D.psuIn[k]?'Remove':'Insert'} supply PS${k+1}`, tr=>{ D.psuIn[k]=!D.psuIn[k]; D.failAt[k]=null;
    tr(`PS${k+1} slides on two 616-220-301 6.5″ guides inside the 82-072 box into EDAC 307-024 (24-way) on MF8212BP`);
    tr('The supplies are not on the MF8212 BOM: the M8245A modules are ordered separately (MF82E/S manual) — '+'card = 14-289 layout, inferred');
    const p=power(SIM.t); tr(`${p.ps.filter(q=>q.alive).length} supply(ies) running`); }); },
  mains(k){ act(`${D.mains[k]?'Unplug':'Plug in'} AC cord ${k+1}`, tr=>{ D.mains[k]=!D.mains[k]; D.failAt[k]=null;
    tr(`17251 cord → 723W-X2/02 inlet ${k+1} (5×20 mm fuse ${D.fuseA} A) → PS${k+1} primary`);
    tr('MF82E/S manual: feed the two cords from separate AC circuits, on different phases if possible'); }); },
  fail(k){ act(`PS${k+1} fails at the playhead`, tr=>{ D.failAt[k]=SIM.t; const p=power(SIM.t+1e-6);
    tr(`PS${k+1} output collapses at ${SIM.fmtT(SIM.t)}`); tr(p.any?`PS${2-k} now carries +${f2(p.ps[1-k].ip*1000,0)} mA / −${f2(p.ps[1-k].iN*1000,0)} mA`:'Frame is dead'); if (p.ps[1-k].blown) tr('⚠ …and that is more than its 0.75 A fuse allows: cascade failure'); }); },
  vadj(k,v){ D.vadj[k]=v; const p=power(SIM.t); D.last={name:`V-ADJ PS${k+1} ${v>=0?'+':''}${v.toFixed(2)} V`,t:SIM.t,tr:[`Set point +${f2(PSU.VOP+v)} / −${f2(PSU.VON+v)} V`,`Share on + rail: PS1 ${f2(p.ps[0].ip*1000,0)} mA · PS2 ${f2(p.ps[1].ip*1000,0)} mA (${'output resistance '+PSU.ROUT+' Ω, inferred'})`]}; SIM.refresh(); },
  mainsV(v){ act(`Mains ${v} V`, tr=>{ D.mainsV=v; tr(`Raw DC peak now ${f2(rawPeak(),1)} V with the transformer strapped for ${D.strap} V`); if (D.mainsV/D.strap>1.5) tr('⚠ 230 V into a 115 V strap: the 2200 µF/35 V reservoirs see ~55 V. Exactly what the MF82E/S “Power Supply Setup” check is there to catch.'); }); },
  strap(v){ act(`Supply transformer strapped for ${v} V`, tr=>{ D.strap=v; tr(v===115?'14-289: jumpers J2 and J3 fitted (“For 115 Volt AC, add Jumpers J2 & J3”)':'14-289: jumper J1 fitted (“For 230 Volt AC, add Jumper J1”)'); }); },
  fuse(a){ act(`Frame fuses: ${a} A`, tr=>{ D.fuseA=a; tr(a===2?'2013 BOM line 27: 218002 FUSE SB 2.000 A (5×20 mm)':a===1.5?'MF8212-3.DSN F1/F2 and MF82SILK.CDR: “1.5 / 0.75 A SB” — 1.5 A at 115 V':'“1.5 / 0.75 A SB” — 0.75 A at 230 V; also the MF82E/S manual “0.75 (min.) amp slow blow #3AG”'); }); },
  door(){ act((D.door==='open'?'Close':'Open')+' the front door', tr=>{ D.door=D.door==='open'?'closed':'open'; tr('8212-020 door pivots on the 0.219/0.084 pivot holes; the 82-009-1 spring plate and 7-03-209 latch hold it shut'); tr(`Thermal coefficient now ${D.door==='open'?K.THETA_OPEN:K.THETA_CLOSED} °C/W (${'inferred'})`); }); },
  ext(){ act(`${D.ext?'Remove':'Fit'} the E8200 extender`, tr=>{ D.ext=!D.ext; const p=power(SIM.t);
    tr('MF82E/S manual: “With all distribution amplifiers removed and E8200 Module Extender in place … measure the voltage between connector pins 13 and 15 … approximately 42 V with no load.”');
    tr(`Extender reads ${f2(p.P.vbus+p.N.vbus,1)} V between positions 13 (−22 V, pins 25/26) and 15 (+22 V, pins 29/30)`); }); },
  build(k){ act(`${D.built[k]?'Undo':'Do'} assembly step ${k}: ${STEPS[k-1].t}`, tr=>{
    const need = {2:[1],3:[2],4:[1],5:[3,4],6:[5],7:[6],8:[2],9:[4],10:[7,8,9]}[k]||[];
    if (!D.built[k]){ const miss=need.filter(n=>!D.built[n]); if (miss.length){ tr('Not yet: first do step '+miss.join(', ')+' ('+miss.map(n=>STEPS[n-1].t).join(', ')+')'); return; } }
    D.built[k]=!D.built[k]; D.dwg = STEPS[k-1].dwg||D.dwg; tr(STEPS[k-1].p);
    const cost = FRAME_BOM.filter(l=>l[7]===k).reduce((a,l)=>a+l[3]*l[4],0); tr(`BOM lines ${FRAME_BOM.filter(l=>l[7]===k).map(l=>l[0]).join(', ')} · ${money(cost)} of the ${money(FRAME_TOTAL)} frame cost`);
  }); },
  dismantle(){ act('Strip the frame to parts', tr=>{ D.built={}; initSlots(); tr('Every BOM line back on the shelf'); }); },
  reset(){ act('Start over (built frame, three cards)', tr=>{ resetAll(true); tr('Built MF82-12, both supplies, M8202 / D8204 / M8209 in slots 1–3'); }); },
};
document.addEventListener('keydown', e=>{
  if (!window[FLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (k==='d'){ A.door(); e.preventDefault(); } else if (k==='1'){ A.fail(0); e.preventDefault(); } else if (k==='2'){ A.fail(1); e.preventDefault(); } else if (k==='e'){ A.ext(); e.preventDefault(); }
});

/* ---------------- drawings to scale ---------------- */
const PX = 48;  // px per inch
// FRONT: 19.00 in rack (MF82XXDM), body 17.12 in between side plates (82-002), 3.470 in high (82-004-1)
function frontSVG(t){
  const p=power(t), W=19*PX, H=3.47*PX, ear=0.94*PX, x0=ear+0.119*PX, built=D.built;
  let s=`<svg viewBox="-10 -26 ${W+20} ${H+64}" style="width:100%;display:block" role="img" aria-label="MF8212 front, drawn to scale">
   <defs><filter id="mffg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <text x="${W/2}" y="-12" text-anchor="middle" font-size="11" fill="var(--ink2)">FRONT · 19.00 in rack × 3.470 in (2 RU) · scale ${PX} px/in</text>`;
  if (!built[1]){ return s+`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="var(--line)" stroke-dasharray="6 4"/><text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="14" fill="var(--ink2)">nothing built yet — start the Tutorial</text></svg>`; }
  s+=`<rect x="0" y="0" width="${ear}" height="${H}" fill="#1b1c1e" stroke="#000"/><rect x="${W-ear}" y="0" width="${ear}" height="${H}" fill="#1b1c1e" stroke="#000"/>
   ${[0.235,3.235].map(y=>`<rect x="${0.344*PX}" y="${y*PX-0.125*PX}" width="${0.406*PX}" height="${0.25*PX}" rx="${0.125*PX}" fill="var(--bg)"/><rect x="${W-0.75*PX}" y="${y*PX-0.125*PX}" width="${0.406*PX}" height="${0.25*PX}" rx="${0.125*PX}" fill="var(--bg)"/>`).join('')}
   <rect x="${ear}" y="0" width="${W-2*ear}" height="${H}" fill="#0f1011" stroke="#000"/>`;
  if (D.door==='closed' && built[8]){
    s+=`<g class="mfdoor" style="cursor:pointer"><title>8212-020 DA door (17.060 in, .063 aluminium) — click to open (D)</title><rect x="${(19-17.06)/2*PX}" y="2" width="${17.06*PX}" height="${3.462*PX}" fill="#1d1f21" stroke="#000"/>
      <image href="${ASSET}d8210-d8212-door-green.png" x="${(19-17.06)/2*PX}" y="${H-0.75*PX}" width="${3.25*PX}" height="${0.74*PX}"/>
      <text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="13" fill="#777">door closed — click to open</text></g>`;
  } else {
    if (built[2]) s+=`<rect x="${x0}" y="2" width="${17.12*PX}" height="${0.2*PX}" fill="#8d8f92"/><rect x="${x0}" y="${H-0.2*PX-2}" width="${17.12*PX}" height="${0.2*PX}" fill="#8d8f92"/>`;
    for (let i=0;i<12;i++){
      const cx=x0+(0.5+i)*PX, sl=D.slots[i], on=sl.card && t>=sl.at && p.any;
      s+=`<g class="mfslot" data-i="${i}" style="cursor:pointer"><title>Slot ${i+1}${sl.card?': '+sl.card+' (click to pull)':' — click to insert '+D.pick}</title>
        ${built[3]?`<rect x="${cx-0.06*PX}" y="${0.2*PX}" width="${0.12*PX}" height="${0.18*PX}" fill="#e8e3d0"/><rect x="${cx-0.06*PX}" y="${H-0.38*PX}" width="${0.12*PX}" height="${0.18*PX}" fill="#e8e3d0"/>`:''}
        <rect x="${cx-0.48*PX}" y="${0.4*PX}" width="${0.96*PX}" height="${H-0.8*PX}" fill="${D.sel===i?'rgba(255,211,77,.12)':'transparent'}" stroke="${D.sel===i?'#ffd34d':'transparent'}"/>`;
      if (sl.card){ s+=`<rect x="${cx-0.04*PX}" y="${0.4*PX}" width="${0.08*PX}" height="${H-0.8*PX}" fill="#1f6b3a"/><rect x="${cx-0.22*PX}" y="${H*0.55}" width="${0.44*PX}" height="${0.9*PX}" rx="5" fill="#c9c9c2"/>
        <text x="${cx}" y="${H*0.55+0.45*PX}" font-size="9" text-anchor="middle" fill="#222" transform="rotate(90 ${cx} ${H*0.55+0.45*PX})">${sl.card}</text>
        <circle cx="${cx}" cy="${0.62*PX}" r="4" fill="${on?'#7dff6a':'#233'}" ${on?'filter="url(#mffg)"':''}/>`; }
      s+=`<text x="${cx}" y="${H+14}" text-anchor="middle" font-size="10" fill="var(--ink2)">${i+1}</text></g>`;
    }
    const px0=x0+12.2*PX, pw=17.12*PX-12.2*PX;
    if (built[4]){
      s+=`<rect x="${px0}" y="${0.25*PX}" width="${pw}" height="${2.98*PX}" fill="#26282a" stroke="#555"><title>82-072 power-supply enclosure: 10.60 in deep, 2.980 in high, clear alodine</title></rect>`;
      if (built[9]) s+=`<g><title>82-077 power-supply door (13 vents)</title>${Array.from({length:13},(_,k)=>`<rect x="${px0+0.25*PX+k*(pw-0.5*PX)/13}" y="${1.2*PX}" width="${0.12*PX}" height="${1.0*PX}" rx="2" fill="#000"/>`).join('')}</g>`;
      [0,1].forEach(k=>{ const q=p.ps[k], x=px0+(0.9+k*2.2)*PX;
        s+=`<g class="mfpsu" data-k="${k}" style="cursor:pointer"><title>PS${k+1} — click to insert/remove the supply module</title><rect x="${x-0.55*PX}" y="${0.35*PX}" width="${1.1*PX}" height="${0.75*PX}" fill="${D.psuIn[k]?'#3a3d40':'transparent'}" stroke="#666" stroke-dasharray="${D.psuIn[k]?'':'4 3'}"/>
          <text x="${x}" y="${0.35*PX+12}" font-size="10" text-anchor="middle" fill="#eee">PS${k+1}${D.psuIn[k]?'':' (empty)'}</text>
          <circle cx="${x-0.25*PX}" cy="${0.35*PX+26}" r="4.5" fill="${q.vled?'#7dff6a':'#233'}" ${q.vled?'filter="url(#mffg)"':''}><title>V (green): supply running</title></circle>
          <circle cx="${x+0.25*PX}" cy="${0.35*PX+26}" r="4.5" fill="${q.iled?'#ff4b3a':'#322'}" ${q.iled?'filter="url(#mffg)"':''}><title>I (red): current being drawn</title></circle>
          <text x="${x-0.25*PX}" y="${0.35*PX+42}" font-size="8" text-anchor="middle" fill="#aaa">V</text><text x="${x+0.25*PX}" y="${0.35*PX+42}" font-size="8" text-anchor="middle" fill="#aaa">I</text></g>`; });
    }
    if (built[8]) s+=`<g class="mfdoor" style="cursor:pointer"><title>door folded down — click to close</title><rect x="${(19-17.06)/2*PX}" y="${H+18}" width="${17.06*PX}" height="10" fill="#1d1f21" stroke="#000"/></g>`;
  }
  return s+`</svg>`;
}
// REAR: MF8212RM1 ISS 2 — 17.090 × 3.425 in; 12 cut-outs 0.750 × 2.700 at 1.000 pitch, first centre 5.105 in from the power end
function rearSVG(t){
  const p=power(t), W=17.09*PX, H=3.425*PX;
  let s=`<svg viewBox="-10 -26 ${W+20} ${H+62}" style="width:100%;display:block" role="img" aria-label="MF8212 rear housing drawn from MF8212RM1">
    <text x="${W/2}" y="-12" text-anchor="middle" font-size="11" fill="var(--ink2)">REAR · MF8212RM1 rear housing 17.090 × 3.425 in, seen from behind (power end on the left)</text>`;
  if (!D.built[6]) return s+`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="var(--line)" stroke-dasharray="6 4"/><text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="13" fill="var(--ink2)">rear housing not fitted yet (assembly step 6)</text></svg>`;
  s+=`<rect x="0" y="0" width="${W}" height="${H}" fill="#151617" stroke="#000"/>`;
  [[4.03,1.76],[0.6,0.35],[16.5,0.3],[16.5,3.12]].forEach(([x,y])=>s+=`<circle cx="${x*PX}" cy="${y*PX}" r="${0.084*PX}" fill="var(--bg)"/>`);
  for (let i=0;i<12;i++){ const cx=(5.105+i)*PX, slot=12-i, sl=D.slots[slot-1];
    s+=`<g class="mfslot" data-i="${slot-1}" style="cursor:pointer"><title>Position ${slot}: ${sl.card?sl.card+' rear module on SSW-120 strip':'empty cut-out 0.750 × 2.700 in'}</title><rect x="${cx-0.375*PX}" y="${1.7125*PX-1.35*PX}" width="${0.75*PX}" height="${2.7*PX}" fill="${sl.card?'#2a2d30':'#000'}" stroke="${D.sel===slot-1?'#ffd34d':'#444'}" stroke-width="${D.sel===slot-1?2.5:1}"/>
      <circle cx="${cx}" cy="${(1.7125-1.3)*PX}" r="2.5" fill="#666"/><circle cx="${cx}" cy="${(1.7125+1.3)*PX}" r="2.5" fill="#666"/>
      ${sl.card?Array.from({length:10},(_,k)=>`<rect x="${cx-0.12*PX}" y="${0.55*PX+k*0.23*PX}" width="${0.24*PX}" height="${0.15*PX}" fill="#2b8a3e"/>`).join(''):''}
      <text x="${cx}" y="${H+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${slot}</text></g>`; }
  /* RM1 power-end features (hidden under the RM2 cover once it is fitted) */
  s+=`<g><title>RM1 .437 in hole (ISS 2: “.437 DIA. WAS .218”)</title><circle cx="${1.6*PX}" cy="${1.31*PX}" r="${0.218*PX}" fill="#000" stroke="#444"/></g><rect x="${2.59*PX}" y="${0.52*PX}" width="${0.562*PX}" height="${1.312*PX}" fill="#000" stroke="#444"><title>RM1 Detail A cut-out 0.562 × 1.312 in</title></rect>`;
  if (D.built[7]){
    /* MF8212RM2 power cover, 4.150 × 3.300 in: CorelDRAW silk MF8212RM2-SILK(CURVE).cdr at 1:1 (72 pt/in), white ink on
       WBS black; holes and windows from its cut lines. Placed at the power end, centred vertically (inferred). */
    const ry=(3.425-3.3)/2;
    s+=`<image href="${ASSET}mf8212-frame-rm2.svg" x="0" y="${ry*PX}" width="${4.15*PX}" height="${3.3*PX}"><title>MF8212RM2 power cover — silk from MF8212RM2-SILK(CURVE).cdr</title></image>`;
    [[0.21,ry+0.235],[0.21,ry+1.825]].forEach(([x,y],k)=>{ const q=p.ps[k];
      s+=`<g class="mfmains" data-k="${k}" style="cursor:pointer"><title>723W-X2/02 IEC inlet ${k+1} with ${D.fuseA} A fuse — click to ${D.mains[k]?'unplug':'plug in'} the cord</title><rect x="${x*PX}" y="${y*PX}" width="${1.08*PX}" height="${1.24*PX}" rx="4" fill="#0c0c0c" stroke="#777"/>
        <rect x="${(x+0.2)*PX}" y="${(y+0.15)*PX}" width="${0.68*PX}" height="${0.5*PX}" rx="4" fill="#1d1d1d" stroke="#555"/>
        ${D.mains[k]?`<rect x="${(x+0.12)*PX}" y="${(y+0.08)*PX}" width="${0.84*PX}" height="${0.65*PX}" rx="6" fill="#333" stroke="#000"/><path d="M${(x+0.54)*PX} ${(y+0.1)*PX} C ${(x-0.5)*PX} ${(y-0.2)*PX}, ${(x-0.3)*PX} ${(y+0.9)*PX}, -10 ${(y+1.0)*PX}" stroke="#222" stroke-width="7" fill="none"/>`:''}
        <rect x="${(x+0.25)*PX}" y="${(y+0.82)*PX}" width="${0.58*PX}" height="${0.3*PX}" fill="${q.alive&&!q.fuseOK?'#7a1d12':'#262626'}" stroke="#555"/><text x="${(x+0.54)*PX}" y="${(y+1.02)*PX}" text-anchor="middle" font-size="8" fill="#ccc">${D.fuseA} A</text></g>`; });
    s+=`<g><title>Binding posts on fish-paper washers (Detail B .312 holes, silk earth symbols): black = chassis (111-0103), green = system ground (111-0104)</title><circle cx="${1.59*PX}" cy="${(ry+0.475)*PX}" r="${0.12*PX}" fill="#222" stroke="#999"/><circle cx="${1.59*PX}" cy="${(ry+1.225)*PX}" r="${0.12*PX}" fill="#2fa34a" stroke="#0a3"/></g>
      ${[['REF IN',2.09],['REF OUT',2.845]].map(([n,x])=>`<g><title>${n}: BNC in a Detail C .500 hole (video / AES reference bus)</title><circle cx="${x*PX}" cy="${(ry+2.433)*PX}" r="${0.2*PX}" fill="#c8cbce" stroke="#777"/><circle cx="${x*PX}" cy="${(ry+2.433)*PX}" r="${0.09*PX}" fill="#222"/></g>`).join('')}`;
  } else s+=`<rect x="${0.19*PX}" y="${0.33*PX}" width="${1.08*PX}" height="${1.24*PX}" fill="#000"/><rect x="${0.19*PX}" y="${1.93*PX}" width="${1.08*PX}" height="${1.24*PX}" fill="#000"/><text x="${1.8*PX}" y="${H/2}" font-size="10" fill="#888">RM2 cover not fitted (step 7)</text>`;
  return s+`<line x1="${3.59*PX}" y1="${H+20}" x2="${3.59*PX}" y2="${H+28}" stroke="var(--ink2)"/><text x="${3.59*PX+4}" y="${H+28}" font-size="9" fill="var(--ink2)">3.590 power section | 13.250 card section</text></svg>`;
}
// SIDE: 82-004-1 side plate 12.713 deep + 0.940 flange; 9″ card guides; 82-072 box 10.60 deep
function sideSVG(){
  const W=14.0*PX, H=3.47*PX, f=0.94*PX;
  return `<svg viewBox="-10 -24 ${W+20} ${H+44}" style="width:100%;max-width:720px;display:block">
   <text x="${W/2}" y="-10" text-anchor="middle" font-size="11" fill="var(--ink2)">SIDE (left) · 82-004-1: 12.713 in plate + 0.940 in flange · front on the left</text>
   <rect x="0" y="0" width="${f}" height="${H}" fill="#202224" stroke="#000"/><rect x="${f}" y="${0.158*PX}" width="${12.713*PX}" height="${3.154*PX}" fill="#16181a" stroke="#000"/>
   ${D.built[3]?`<rect x="${f+0.3*PX}" y="${0.35*PX}" width="${9*PX}" height="${0.14*PX}" fill="#e8e3d0"><title>EDAC 616-220-306 9″ card guide</title></rect><rect x="${f+0.3*PX}" y="${H-0.49*PX}" width="${9*PX}" height="${0.14*PX}" fill="#e8e3d0"/>`:''}
   ${D.built[4]?`<rect x="${f+0.2*PX}" y="${0.5*PX}" width="${10.6*PX}" height="${2.47*PX}" fill="none" stroke="#9aa" stroke-dasharray="5 3"><title>82-072 power-supply box (behind, 10.60 in deep)</title></rect>`:''}
   ${D.built[5]?`<rect x="${f+9.4*PX}" y="${0.3*PX}" width="${0.093*PX}" height="${2.9*PX}" fill="#2a7a3e"><title>MF8212BP backplane (position inferred from the 9″ guide length)</title></rect>`:''}
   ${D.built[6]?`<rect x="${f+12.713*PX-0.059*PX}" y="${0.02*PX}" width="${0.059*PX}" height="${3.425*PX}" fill="#888"/><rect x="${f+12.713*PX-1.33*PX}" y="${0.02*PX}" width="${1.33*PX}" height="2" fill="#888"/>`:''}
   ${[1.548,3.548,9.188,11.188].map(x=>`<circle cx="${f+x*PX}" cy="${(0.158+0.12)*PX}" r="3" fill="#555"/><circle cx="${f+x*PX}" cy="${(0.158+3.034)*PX}" r="3" fill="#555"/>`).join('')}
   <text x="${f+6*PX}" y="${H+16}" text-anchor="middle" font-size="10" fill="var(--ink2)">13.75 in overall depth (MF82XXDM.CDR) · 12.713 in side plate</text></svg>`;
}
function bindPanel(m){
  m.querySelectorAll('.mfslot').forEach(g=>g.onclick=()=>A.slot(+g.dataset.i));
  m.querySelectorAll('.mfdoor').forEach(g=>g.onclick=()=>A.door());
  m.querySelectorAll('.mfpsu').forEach(g=>g.onclick=()=>A.psu(+g.dataset.k));
  m.querySelectorAll('.mfmains').forEach(g=>g.onclick=()=>A.mains(+g.dataset.k));
}
function controlsHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px">
   <label>Card to insert <select data-c="pick">${Object.keys(CARDS).map(k=>`<option ${k===D.pick?'selected':''}>${k}</option>`).join('')}</select></label>
   <label>Mains <select data-c="mainsV">${[115,230].map(v=>`<option ${v===D.mainsV?'selected':''}>${v}</option>`).join('')}</select> V</label>
   <label>Strap <select data-c="strap">${[115,230].map(v=>`<option ${v===D.strap?'selected':''}>${v}</option>`).join('')}</select></label>
   <label>Inlet fuses <select data-c="fuse">${[[2,'2 A (2013 BOM)'],[1.5,'1.5 A SB (DSN / silk, 115 V)'],[0.75,'0.75 A SB (230 V / MF82E/S)']].map(([v,l])=>`<option value="${v}" ${v===D.fuseA?'selected':''}>${l}</option>`).join('')}</select></label>
   <button data-c="door">${D.door==='open'?'Close':'Open'} door (D)</button><button data-c="f0">PS1 fails here (1)</button><button data-c="f1">PS2 fails here (2)</button><button data-c="ext">${D.ext?'Remove':'Fit'} E8200 extender (E)</button><button data-c="reset">Start over</button></div>
   <div class="small" style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px">${[0,1].map(k=>`<label>PS${k+1} V-ADJ ${inf('MF82XXMN.CDR shows “V-ADJ” on each supply; range assumed ±0.5 V')} <input type="range" data-vadj="${k}" min="-0.5" max="0.5" step="0.01" value="${D.vadj[k]}"> <span class="mono">${D.vadj[k]>=0?'+':''}${D.vadj[k].toFixed(2)} V</span></label>`).join('')}</div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(el=>{ const k=el.dataset.c;
    if (el.tagName==='SELECT') el.onchange=()=>{ if(k==='pick') A.pick(el.value); if(k==='mainsV') A.mainsV(+el.value); if(k==='strap') A.strap(+el.value); if(k==='fuse') A.fuse(+el.value); };
    else el.onclick=()=>{ if(k==='door') A.door(); if(k==='f0') A.fail(0); if(k==='f1') A.fail(1); if(k==='ext') A.ext(); if(k==='reset') A.reset(); }; });
  m.querySelectorAll('[data-vadj]').forEach(el=>el.oninput=()=>{ el.nextElementSibling.textContent=(+el.value>=0?'+':'')+(+el.value).toFixed(2)+' V'; A.vadj(+el.dataset.vadj,+el.value); });
}
function readoutHTML(t){
  const p=power(t), led=(on,c)=>`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${on?c:'var(--led-off)'};vertical-align:middle"></span>`;
  const row=(k)=>{ const q=p.ps[k]; return `<tr><th>PS${k+1}</th><td>${led(q.vled,'var(--led-g)')} V ${led(q.iled,'#ff4b3a')} I · ${q.alive?`+${f2(q.ip*1000,0)} / −${f2(q.iN*1000,0)} mA · ripple ${f2(q.rp.dv,2)} V · headroom ${f2(q.rp.head,1)} V${q.drop?' <b style="color:var(--bad)">DROPOUT</b>':''} · AC ${f2(q.iac,2)} A vs ${D.fuseA} A fuse${q.fuseOK?'':' <b style="color:var(--bad)">blows</b>'}`:(q.blown?'<b style="color:var(--bad)">0.75 A supply fuse open</b>':D.psuIn[k]?(D.mains[k]?'off':'no AC'):'not fitted')}</td></tr>`; };
  return `<table class="kv"><tr><th>±22 V bus</th><td class="mono">+${f2(p.P.vbus)} V / −${f2(p.N.vbus)} V ${p.over?'<b style="color:var(--bad)">reservoir over-voltage</b>':''}</td></tr>
   <tr><th>Load</th><td>${p.L.n} card(s): +${f2(p.L.ip*1000,0)} mA / −${f2(p.L.iN*1000,0)} mA → ${f2(p.pCards,1)} W in the cards</td></tr>${row(0)}${row(1)}
   <tr><th>Frame heat</th><td>${f2(p.pTot,1)} W total → +${f2(p.rise,1)} °C inside at equilibrium (${D.door} door, ${inf('no thermal data in the archive: 0.45 °C/W closed, 0.30 open')})</td></tr>
   <tr><th>Redundancy</th><td>${redundancy(t)}</td></tr>${D.ext?`<tr><th>E8200 extender</th><td class="mono">${f2(p.P.vbus+p.N.vbus,2)} V between pins 13 and 15 (manual: ≈ 42 V)</td></tr>`:''}</table>`;
}
function redundancy(t){
  const L=loadAt(t), worst=Math.max(L.ip,L.iN)*PSU.KRMS;
  return worst<=PSU.FUSE? `<b style="color:var(--accent)">N+1 holds</b>: one supply alone carries the load (fuse current ${f2(worst,2)} A ≤ 0.75 A)` : `<b style="color:var(--bad)">not redundant</b>: one supply alone would need ${f2(worst,2)} A rms through its 0.75 A fuse — a failure cascades`;
}
function traceHTML(){ return D.last? `<div><b>${esc(D.last.name)}</b> at ${SIM.fmtT(D.last.t)}</div>`+D.last.tr.map(x=>`<div>→ ${esc(x)}</div>`).join('') : '<div class="muted">Click a slot, an inlet or a supply. Each step is listed here.</div>'; }

/* ---------------- timeline lanes ---------------- */
function wave(c,X,a,b,y,h,fn,lo,hi,col){ const pw=X(b)-X(a), n=Math.max(60,Math.min(2400,Math.round(pw*2))); c.strokeStyle=col; c.lineWidth=1.3; c.beginPath(); for(let i=0;i<=n;i++){ const t=a+(b-a)*i/n, v=fn(t), yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); }
function rawAt(k,t,rail){ // reservoir voltage: charges to the peak each half cycle, discharges at I/C
  const p=power(t), q=p.ps[k]; if (!q.alive) return 0; const vpk=rawPeak(), I= rail==='p'? q.ip : q.iN, T=1/(2*K.MAINS_F);
  const ph=((t*2*K.MAINS_F)%1+1)%1, vs=vpk*Math.abs(Math.sin(Math.PI*ph)); const dis=vpk-I/PSU.C*((ph+0.5)%1)*T; return Math.max(vs,dis); }
function lanes(){
  const css=SIM.css, ls=[];
  ls.push({label:'AC inlet 1 (60 Hz mains)', h:34, draw(c,X,a,b,y,h){ if(!D.mains[0]){ c.fillStyle=css('--ink2'); c.fillText('unplugged',X(a)+6,y+h/2+4); return; } wave(c,X,a,b,y,h,t=>Math.sin(2*Math.PI*60*t),-1.1,1.1,css('--accent2')); }});
  ls.push({label:'PS1 RS605 charge pulses', h:24, draw(c,X,a,b,y,h){ const p=power((a+b)/2), q=p.ps[0]; if(!q.alive) return; const vpk=rawPeak(), dv=q.rp.dv, tc=Math.acos(Math.max(-1,1-dv/vpk))/(2*Math.PI*60); SIM.pulses(c,X,a,b,y,h,1/120,1/240-tc,tc,css('--warn'),'pulses'); }});
  [0,1].forEach(k=>ls.push({label:`PS${k+1} + reservoir ${k?'':'C1 '}(zoomed on the ripple)`, h:44, draw(c,X,a,b,y,h){ const q=power((a+b)/2).ps[k], vpk=rawPeak(), dv=Math.max(0.2,q.rp.dv); if(!q.alive){ c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText('supply off',X(a)+6,y+h/2+4); return; } wave(c,X,a,b,y,h,t=>rawAt(k,t,'p'),vpk-1.4*dv,vpk+0.1*dv,css('--warn')); c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(`${f2(vpk,1)} V peak · ${f2(q.rp.dv*1000,0)} mV ripple · LM317 out ${f2(PSU.VOP+D.vadj[k])} V, headroom ${f2(q.rp.head,1)} V`,X(a)+6,y+11); }}));
  ls.push({label:'+22 V bus at the slots', h:34, draw(c,X,a,b,y,h){ wave(c,X,a,b,y,h,t=>power(t).P.vbus,20.5,22.5,css('--accent')); c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText('20.5 … 22.5 V scale',X(a)+6,y+11); }});
  ls.push({label:'Supply share (+ rail)', h:30, draw(c,X,a,b,y,h){ const n=60; for(let i=0;i<n;i++){ const t=a+(b-a)*(i+0.5)/n, p=power(t), tot=p.ps[0].ip+p.ps[1].ip||1; const x=X(a+(b-a)*i/n), w=X(a+(b-a)*(i+1)/n)-x; c.fillStyle=css('--accent'); c.fillRect(x,y+4,w,(h-8)*p.ps[0].ip/tot); c.fillStyle=css('--accent2'); c.fillRect(x,y+4+(h-8)*p.ps[0].ip/tot,w,(h-8)*p.ps[1].ip/tot); } c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText('PS1 green · PS2 blue',X(a)+4,y+h/2+4); }});
  ls.push({label:'Card insertions / supply failures', h:24, draw(c,X,a,b,y,h){ c.font='10px '+css('--sans'); D.slots.forEach((s,i)=>{ if(s.card && s.at>0){ c.fillStyle=css('--warn'); c.fillRect(X(s.at)-1,y+3,3,h-6); c.fillText(s.card+' → '+(i+1),X(s.at)+4,y+h/2+4); } }); D.failAt.forEach((f,k)=>{ if(f!=null){ c.fillStyle=css('--bad'); c.fillRect(X(f)-1,y+3,3,h-6); c.fillText('PS'+(k+1)+' fails',X(f)+4,y+h-4); } }); }});
  return ls;
}
function drawScope(cv,t){
  const {c,w,h}=SIM.canvas(cv,190), css=SIM.css, T0=t-1/60, T1=t+1/60, X=tt=>40+(tt-T0)/(T1-T0)*(w-50), lo=-30, hi=30, Y=v=>10+(hi-v)/(hi-lo)*160;
  c.strokeStyle=css('--grid'); for(let v=-30;v<=30;v+=10){ c.beginPath(); c.moveTo(40,Y(v)); c.lineTo(w-10,Y(v)); c.stroke(); c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(v+' V',2,Y(v)+4); }
  const tr=(fn,col)=>{ c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); for(let i=0;i<=500;i++){ const tt=T0+(T1-T0)*i/500, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); };
  const vpk=rawPeak();
  tr(tt=>vpk*Math.sin(2*Math.PI*60*tt)*(D.mains[0]?1:0),css('--accent2'));
  tr(tt=>rawAt(0,tt,'p'),css('--warn')); tr(tt=>-rawAt(0,tt,'n'),css('--warn'));
  const p=power(t); tr(()=>p.P.vbus,css('--accent')); tr(()=>-p.N.vbus,css('--accent'));
  c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(X(t),10); c.lineTo(X(t),170); c.stroke();
  c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText('2 mains cycles around the playhead · blue: secondary (per half) · orange: C1 / C4 reservoirs · green: ±22 V bus',40,186);
}

/* ---------------- views ---------------- */
function viewSim(m){
  window[FLAG]=true;
  m.innerHTML = card('MF82-12 frame — front and rear to scale', `<div id="mfF"></div><div id="mfR" style="margin-top:6px"></div><div id="mfC"></div>
    <div class="small muted">Front: rack ears and slot pitch from 82-004-1 and 82-002 (12 guide holes at 1.000 in from 0.500 in). Rear: MF8212RM1 ISS 2 dimensions; the RM2 power cover is the CorelDRAW silk ${SIM.src('#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK(CURVE).cdr','MF8212RM2-SILK(CURVE).cdr')} (2016-06-22) at 1:1, white ink on black. The supply modules and their V/I lamps follow the MF82XXMN.CDR manual art; card faces are schematic. Click a slot to insert the chosen card, an IEC inlet to plug its cord, a supply to pull it.</div>`)
   + `<div class="grid2">${card('Live readings','<div id="mfRo"></div>')}${card('What just happened','<div id="mfTr" class="log small mono"></div>')}</div>`
   + card('Timeline (zoom with the transport)', '<canvas id="mfTl"></canvas>');
  SIM.on('time', t=>{
    m.querySelector('#mfF').innerHTML=frontSVG(t); m.querySelector('#mfR').innerHTML=rearSVG(t);
    if (!m.querySelector('#mfC').dataset.v || m.querySelector('#mfC').dataset.v!==JSON.stringify([D.pick,D.mainsV,D.strap,D.fuseA,D.door,D.ext])){ m.querySelector('#mfC').innerHTML=controlsHTML(); m.querySelector('#mfC').dataset.v=JSON.stringify([D.pick,D.mainsV,D.strap,D.fuseA,D.door,D.ext]); bindControls(m.querySelector('#mfC')); }
    m.querySelector('#mfRo').innerHTML=readoutHTML(t); m.querySelector('#mfTr').innerHTML=traceHTML();
    bindPanel(m); SIM.drawLanes(m.querySelector('#mfTl'), lanes(), {labelW:190});
  });
}
const GOALS = [
  ['Build the side plates, rails and guides (steps 1–3)', ()=>D.built[1]&&D.built[2]&&D.built[3], 'Click steps 1, 2 and 3 below in order.'],
  ['Fit the supply box and the MF8212BP backplane (4–5)', ()=>D.built[4]&&D.built[5], 'The backplane needs the guides and the supply box first.'],
  ['Close in the rear: RM1, lacing bar, RM2 power cover (6–7)', ()=>D.built[6]&&D.built[7], 'The AC inlets and binding posts live on MF8212RM2.'],
  ['Hang both doors and finish wiring and test (8–10)', ()=>frameBuilt(), 'Step 10 needs 7, 8 and 9.'],
  ['Strap the supplies for your mains and check the fuse', ()=>D.strap===D.mainsV && power(SIM.t).ps.every(q=>!q.alive||q.fuseOK), 'Use the Strap and Mains selectors on the Simulator tab; 230 V into a 115 V strap overloads the 35 V reservoirs.'],
  ['With no cards, fit the E8200 extender and read ≈ 42 V', ()=>D.ext && loadAt(SIM.t).n===0 && power(SIM.t).any, 'Pull every card (click its slot) and press E.'],
  ['Check each supply alone: pull PS2, read, then pull PS1 instead', ()=>tutSeen.alone0 && tutSeen.alone1, 'Open the door (D) so the supply box shows, then click a supply to remove it; the extender reading must stay near 42 V.'],
  ['Load at least six cards and keep N+1 redundancy', ()=>loadAt(SIM.t).n>=6 && Math.max(loadAt(SIM.t).ip,loadAt(SIM.t).iN)*PSU.KRMS<=PSU.FUSE && power(SIM.t).ps.every(q=>q.alive), 'D8205s draw 250 mA each: mix in M8202 / D8204 cards.'],
  ['Fail a supply at the playhead and watch the other take over', ()=>D.failAt.some(f=>f!=null) && power(SIM.duration).any, 'Press 1 or 2 on the Simulator tab.'],
];
const tutSeen={alone0:false,alone1:false};
function tutWatch(){ const p=power(SIM.t); if (D.ext && loadAt(SIM.t).n===0){ if (p.ps[0].alive && !p.ps[1].alive) tutSeen.alone0=true; if (p.ps[1].alive && !p.ps[0].alive) tutSeen.alone1=true; } }
function viewTut(m){
  window[FLAG]=true;
  m.innerHTML = card('Assembling and commissioning an MF82-12 frame', `<p class="small">Follow the 2013|46 BOM and the 2016|49 mechanical set, then the commissioning check from the MF82E/S “Installation and Setup” manual (the only frame manual text in the archive). The order of the steps is ${inf('the BOM has no routing; the order follows what fastens to what in the drawings')}.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button id="mfStrip">Strip to parts</button><button id="mfAll">Start over (built)</button><button id="mfTd">Open / close door (D)</button><button id="mfTe">E8200 extender (E)</button></div><div id="mfSteps"></div>`)
   + `<div class="grid2">${card('Goals (checked live)','<ol id="mfGoals" class="small"></ol>')}${card('Frame now','<div id="mfMini"></div><div id="mfTr2" class="log small mono"></div>')}</div>`;
  m.querySelector('#mfStrip').onclick=()=>A.dismantle(); m.querySelector('#mfTd').onclick=()=>A.door(); m.querySelector('#mfTe').onclick=()=>A.ext(); m.querySelector('#mfAll').onclick=()=>A.reset();
  SIM.on('time', t=>{
    tutWatch();
    m.querySelector('#mfSteps').innerHTML = `<table class="kv">${STEPS.map(s=>`<tr><th><button data-b="${s.k}" style="min-width:150px;${D.built[s.k]?'background:var(--accent);color:#fff':''}">${D.built[s.k]?'✓ ':''}${s.k}. ${s.t}</button></th><td class="small">${s.p} <span class="muted">· BOM ${FRAME_BOM.filter(l=>l[7]===s.k).map(l=>l[1]+(l[3]!==1?' ×'+l[3]:'')).join(', ')}</span></td></tr>`).join('')}</table>`;
    m.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>A.build(+b.dataset.b));
    let first=true; m.querySelector('#mfGoals').innerHTML=GOALS.map(([g,ok,hint])=>{ const d=ok(); const h=!d&&first; if(!d) first=false; return `<li style="${d?'color:var(--accent)':''}">${d?'✓':'○'} ${g}${h?`<div class="muted">Hint: ${hint}</div>`:''}</li>`; }).join('');
    m.querySelector('#mfMini').innerHTML=frontSVG(t)+readoutHTML(t); bindPanel(m); m.querySelector('#mfTr2').innerHTML=traceHTML();
  });
}
function viewSecond(m){
  window[FLAG]=false;
  m.innerHTML = card('One second of the frame’s power, as the supplies see it', `<p class="small">60 Hz mains → RS605 bridge → 2200 µF/35 V reservoirs (C1 +, C4 −) → LM317T / LM337T → the ±22 V bus on MF8212BP → every card. A reservoir is recharged only near each mains peak, 120 times a second; between peaks it sags by I / (120 Hz × 2200 µF). The regulator needs about 2 V of headroom (${inf('LM317 data-sheet dropout')}); if the trough falls below set point + 2 V the bus dips at 120 Hz. Insert cards or fail a supply at the playhead on the Simulator tab and they appear here at that time.</p><canvas id="mfTl2"></canvas>`)
   + card('Two mains cycles at the playhead', '<canvas id="mfSc"></canvas>')
   + card('Numbers behind it', `<table class="kv small">
     <tr><th>Set points</th><td>+V = 1.25 V × (1 + 3K9 / 240) = <b>${f2(PSU.VOP)} V</b>; −V = 1.25 V × (1 + 2K / 120) = <b>${f2(PSU.VON)} V</b> (14-289 / 14-319 resistor values). Sum ${f2(PSU.VOP+PSU.VON,1)} V — the manual’s “approximately 42 V”.</td></tr>
     <tr><th>Raw DC</th><td>${PSU.VSEC} V rms per half × √2 − ${PSU.FBR} V bridge = ${f2(rawPeak(),1)} V peak ${inf('229C40 read as a 40 V CT transformer')}</td></tr>
     <tr><th>Ripple</th><td>ΔV = I / (2 × 60 × 2200 µF) = ${f2(1/(120*PSU.C),2)} V per amp</td></tr>
     <tr><th>Charge pulse</th><td>conducts for acos(1 − ΔV/Vpk) / (2π·60) each half cycle — about ${f2(Math.acos(1-0.3/rawPeak())/(2*Math.PI*60)*1000,2)} ms at 80 mA</td></tr>
     <tr><th>Fuse current</th><td>rms ≈ ${PSU.KRMS} × Idc for a capacitor-input rectifier ${inf('typical form factor')} against F1/F2 0.75 A on the supply card</td></tr></table>`);
  SIM.on('time', t=>{ SIM.drawLanes(m.querySelector('#mfTl2'), lanes(), {labelW:190}); drawScope(m.querySelector('#mfSc'),t); });
}
const BLK = {
  ac:['AC entry (MF8212RM2)','Two 17251 cords into two 723W-X2/02 IEC inlet/fuse-holders, 2 A slow-blow 5×20 mm (BOM line 26–27). The 1999 silk and MF8212-3.DSN say “1.5 / 0.75 A SB” (115 / 230 V).'],
  psu:['Supplies PS1 / PS2 (M8245A)','Not on the frame BOM. Two 24-way edge cards in the 82-072 box on 6.5″ guides. Circuit from the MF82-4 supply 14-289: 229C40 transformer, RS605 bridge, 2 × 2200 µF/35 V, LM317T / LM337T, F1/F2 0.75 A, DS1 LED, R1 10K 3.75 W bleeder. M8245A = this circuit is '+'inferred'+'.'],
  bp:['MF8212BP backplane ISS5','12 × EDAC 307-030 card sockets, 2 × EDAC 307-024 supply sockets, 12 × SSW-120 20-way rear-module strips, 12 × SSW-102 2-way sockets, 1 × TSW-110 2×10 header. Costs $62.80 (Misys) or $65.37 (re-priced xlsx).'],
  slot:['Card slots 1–12','30-way EDAC (15 positions × 2 rows). From the M8209 netlist: pins 29/30 (+22 V), 25/26 (−22 V), 3/27/28 (GND). EDAC 616-220-306 guides top and bottom.'],
  rm:['Rear modules','Each card’s TB82xx / BNCx module plugs onto the SSW-120 strip through a 0.750 × 2.700 in cut-out in MF8212RM1.'],
  ref:['Reference option (MF82REF)','RM1 is drawn in the “MF82REF configuration”. The 2×10 TSW-110 header and the 12 SSW-102 sockets are where the reference bus would reach the slots ('+'inferred'+'); see the mfxx plugin for the MF-REF board.'],
  gnd:['Grounds','Black binding post = chassis, green = system ground, both on fish-paper washers (BOM 9750 ×3) so they stay isolated in the frame (MF82E/S manual: join them only at the station ground).'],
  mech:['Sheet metal','Side plates 82-004-1/-2 (11-ga CRS), rails 82-002/003 (aluminium B9901), box 82-072 (.064 Al), door 8212-020 (.063 Al), rear housing RM1 (16-ga CRS). 16 WBS-made sheet-metal lines (7-03-209 … MF8212RM2) = $99.85 of the $239.51.'],
};
function viewBlock(m){
  window[FLAG]=false;
  const b=(k,x,y,w,h)=>`<g class="mfb" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${D.blk===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="12" fill="${D.blk===k?'#fff':'var(--ink)'}">${BLK[k][0].split(' (')[0]}</text></g>`;
  const ar=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#mfar)"/>${l?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" text-anchor="middle" font-size="10" fill="var(--ink2)">${l}</text>`:''}`;
  m.innerHTML = card('Block diagram — click a block', `<svg viewBox="0 0 980 330" style="width:100%"><defs><marker id="mfar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>
    ${b('ac',10,40,150,50)}${b('psu',230,40,170,50)}${b('bp',470,120,170,60)}${b('slot',720,40,120,50)}${b('rm',720,200,120,50)}${b('ref',470,250,170,50)}${b('gnd',10,200,150,50)}${b('mech',230,250,170,50)}
    ${ar(160,65,230,65,'115/230 V')}${ar(400,65,470,140,'±22 V via 307-024')}${ar(640,140,720,65,'307-030 ×12')}${ar(640,160,720,225,'SSW-120 ×12')}${ar(555,250,555,180,'2×10 header')}${ar(160,225,470,165,'SYSTEM GND')}${ar(780,90,780,200,'card ↔ module')}</svg><div id="mfBd" class="small"></div>`);
  const upd=()=>{ m.querySelector('#mfBd').innerHTML=`<b>${BLK[D.blk][0]}</b> — ${BLK[D.blk][1]}`; m.querySelectorAll('.mfb rect').forEach(r=>{ const k=r.parentNode.dataset.k; r.setAttribute('fill',k===D.blk?'var(--accent)':'var(--panel2)'); r.nextElementSibling.setAttribute('fill',k===D.blk?'#fff':'var(--ink)'); }); };
  m.querySelectorAll('.mfb').forEach(g=>g.onclick=()=>{ D.blk=g.dataset.k; upd(); }); upd();
}
function viewSchem(m){
  window[FLAG]=false;
  const T=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" ${o&&o.a?`text-anchor="${o.a}"`:''} fill="${(o&&o.c)||'var(--ink)'}" font-family="var(--mono)">${s}</text>`;
  const L=(x1,y1,x2,y2,c)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c||'var(--ink)'}" stroke-width="1.4"/>`;
  const R=(x,y,w,h,lab)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>${lab?T(x+w/2,y+h/2+4,lab,{a:'middle'}):''}`;
  // sheet 1: frame wiring (MF8212-3.DSN)
  let s1=`<svg viewBox="0 0 980 300" style="width:100%;min-width:760px">${T(10,18,'REDRAWN from MF8212-3.DSN / MF8212.DSN (OrCAD, 2000|33) — “MF-82/12 DISTRIBUTION FRAME, M8200 Series”',{c:'var(--ink2)'})}
   ${R(20,50,90,40,'AC1')}${R(20,170,90,40,'AC2')}${L(110,70,150,70)}${L(110,190,150,190)}${R(150,55,60,30,'F1')}${R(150,175,60,30,'F2')}${T(180,110,'1.5/0.75 SB',{a:'middle',fs:10,c:'var(--warn)'})}
   ${L(210,70,250,70)}${L(210,190,250,190)}${R(250,45,110,50,'PS1')}${R(250,165,110,50,'PS2')}
   ${L(360,60,420,60)}${L(360,180,420,180)}${L(420,60,420,180)}${L(360,80,440,80)}${L(360,200,440,200)}${L(440,80,440,200)}
   ${T(425,130,'+22 V',{c:'var(--accent)'})}${T(445,150,'−22 V',{c:'var(--accent2)'})}
   ${L(420,120,520,120,'var(--accent)')}${L(440,140,520,140,'var(--accent2)')}${L(380,240,520,240)}${T(330,244,'COMMON',{fs:10})}
   ${L(380,270,520,270,'var(--warn)')}${T(300,274,'AES REF BUS / VIDEO REF',{fs:10})}
   ${[0,1,2,3].map(i=>{ const x=540+i*105; return R(x,100,90,180,'')+T(x+45,118,i===3?'POS.12':i===2?'POS.3…11':'POS.'+(i+1),{a:'middle',fs:10})+T(x+45,134,'CON20',{a:'middle',fs:9,c:'var(--ink2)'})+L(520,120,x,120,'var(--accent)')+L(520,140,x,140,'var(--accent2)')+L(520,240,x,240)+L(520,270,x,270,'var(--warn)')+T(x+45,200,'card +',{a:'middle',fs:9})+T(x+45,214,'termination',{a:'middle',fs:9}); }).join('')}
   ${R(20,250,120,34,'')}${T(80,264,'BINDING POSTS',{a:'middle',fs:9})}${T(80,278,'CHASSIS · SYSTEM GND',{a:'middle',fs:9})}</svg>`;
  // sheet 2: supply (14-289)
  let s2=`<svg viewBox="0 0 980 260" style="width:100%;min-width:760px">${T(10,18,'REDRAWN from 14-289.PCB / SA14-289.DWG (Tango, 1995|28): the frame supply; M8245A identity inferred',{c:'var(--ink2)'})}
   ${R(20,90,80,70,'T1')}${T(60,180,'229C40',{a:'middle',fs:10})}${T(60,196,'J2+J3 115 V · J1 230 V',{a:'middle',fs:9,c:'var(--ink2)'})}
   ${L(100,105,140,105)}${L(100,145,140,145)}${R(140,95,70,60,'CR1')}${T(175,172,'RS605',{a:'middle',fs:10})}
   ${L(210,105,280,60)}${L(210,145,280,200)}${R(280,45,60,30,'F1 .75A')}${R(280,185,60,30,'F2 .75A')}
   ${L(340,60,400,60)}${L(340,200,400,200)}${R(380,70,40,50,'C1')}${T(400,135,'2200/35',{a:'middle',fs:9})}${R(380,140,40,50,'C4')}
   ${R(450,40,110,40,'U1 LM317T')}${R(450,180,110,40,'U2 LM337T')}${L(420,60,450,60)}${L(420,200,450,200)}
   ${T(505,100,'R2 240 / R3 3K9',{a:'middle',fs:10})}${T(505,170,'R4 120 / R5 2K',{a:'middle',fs:10})}
   ${L(560,60,640,60,'var(--accent)')}${L(560,200,640,200,'var(--accent2)')}${T(600,52,'+21.56 V',{a:'middle',fs:10,c:'var(--accent)'})}${T(600,222,'−22.08 V',{a:'middle',fs:10,c:'var(--accent2)'})}
   ${R(640,40,70,180,'')}${T(675,58,'P1',{a:'middle'})}${T(675,74,'EDGE24/156',{a:'middle',fs:8})}${T(675,130,'→ 307-024',{a:'middle',fs:9})}${T(675,146,'on MF8212BP',{a:'middle',fs:9})}
   ${R(740,100,90,30,'R1 10K 3.75W')}${R(740,150,90,30,'DS1 LED')}${T(860,120,'CR2–CR5 1N4003',{fs:10})}${T(860,136,'(regulator protection,',{fs:9,c:'var(--ink2)'})}${T(860,150,'inferred)',{fs:9,c:'var(--ink2)'})}</svg>`;
  // sheet 3: slot pinout
  const pins=[]; for(let p=1;p<=30;p++){ const v= (p===29||p===30)?'+22 V':(p===25||p===26)?'−22 V':(p===3||p===27||p===28)?'GND':'card signal'; pins.push([p,v]); }
  let s3=`<svg viewBox="0 0 980 120" style="width:100%;min-width:760px">${T(10,18,'REDRAWN: EDAC 307-030 slot socket — power pins from m8209_iss1.net (card side); 15 positions × 2 rows',{c:'var(--ink2)'})}
   ${pins.map(([p,v],i)=>{ const x=20+Math.floor(i/2)*62, y=i%2?78:40; const c=v.startsWith('+')?'var(--accent)':v.startsWith('−')?'var(--accent2)':v==='GND'?'var(--ink)':'var(--ink2)'; return `<rect x="${x}" y="${y}" width="56" height="30" rx="3" fill="${v==='card signal'?'transparent':c}" fill-opacity=".25" stroke="${c}"/>${T(x+28,y+13,'pin '+p,{a:'middle',fs:9})}${T(x+28,y+25,v,{a:'middle',fs:9,c})}`; }).join('')}</svg>`;
  m.innerHTML = card('Frame wiring', `<div class="scroll">${s1}</div><p class="small muted">The DSN names the fuses “1.5/0.75 SB”, PS1/PS2, the ±22 V rails, COMMON, CHASSIS and SYSTEM GND binding posts, the AES REF BUS and VIDEO REFERENCE lines and CON20 at POS.1 … POS.12. Wire routes are redrawn; the original is a single OrCAD page.</p>`)
   + card('Supply card (as in the MF82-4 frame)', `<div class="scroll">${s2}</div>`)
   + card('Slot socket', `<div class="scroll">${s3}</div><p class="small">The MF82E/S manual tells you to read ≈ 42 V between “connector pins 13 and 15” of the E8200 extender. On a 15-position, two-row EDAC those are positions 13 (pins 25/26, −22 V) and 15 (pins 29/30, +22 V): the manual counts positions, the netlists count pins.</p>`);
}
function viewSoft(m){
  window[FLAG]=false;
  m.innerHTML = card('Power path, stage by stage (no firmware in this product)', `<label class="small">Supply <select id="mfK"><option value="0">PS1</option><option value="1">PS2</option></select></label><div id="mfSt"></div>`)
   + card('Supply lamp state machine (MF82E/S manual: “the RED LED indicates that there is current being drawn … the GREEN LED indicates that the power supply is in operation”)', '<div id="mfSm"></div>')
   + card('Commissioning sequence (manual “Power Supply Setup”)', `<ol class="small"><li>Both AC plugs out; insert both supplies, secure the access panel.</li><li>All DAs out; E8200 extender in a slot.</li><li>Power PS1 only → ≈ 42 V between extender pins 13 and 15.</li><li>PS2 only → ≈ 42 V again.</li><li>Both → “little if any change”.</li><li>Insert the DAs.</li></ol>`);
  const sel=m.querySelector('#mfK');
  SIM.on('time', t=>{
    const k=+sel.value, p=power(t), q=p.ps[k], vpk=rawPeak();
    const st=[
      ['AC inlet '+(k+1), D.mains[k]?`${D.mainsV} V, ${f2(q.iac,2)} A drawn`:'unplugged', `723W-X2/02, fuse ${D.fuseA} A`, q.fuseOK],
      ['Transformer T1 229C40', `${f2(PSU.VSEC*D.mainsV/D.strap,1)} V rms per half`, `strap ${D.strap} V ${inf('ratio')}`, D.mainsV===D.strap],
      ['Bridge CR1 RS605', `${f2(vpk,1)} V peak`, `${PSU.FBR} V drop`, true],
      ['Fuses F1/F2 0.75 A', `${f2(Math.max(q.ip,q.iN)*PSU.KRMS,2)} A rms`, 'on the supply card', !q.blown],
      ['C1 / C4 2200 µF/35 V', `ripple ${f2(q.rp.dv,2)} / ${f2(q.rn.dv,2)} V`, `${vpk>35?'<b style="color:var(--bad)">over 35 V</b>':'within 35 V'}`, vpk<=35],
      ['U1 LM317T / U2 LM337T', `${f2(PSU.VOP+D.vadj[k])} / −${f2(PSU.VON+D.vadj[k])} V`, `headroom ${f2(Math.min(q.rp.head,q.rn.head),1)} V, ${f2(q.reg,1)} W heat`, !q.drop],
      ['Edge P1 → 307-024', `+${f2(q.ip*1000,0)} / −${f2(q.iN*1000,0)} mA`, `share of ${f2(p.L.ip*1000,0)} mA`, q.alive],
      ['MF8212BP bus', `+${f2(p.P.vbus)} / −${f2(p.N.vbus)} V`, `${p.L.n} cards`, p.any],
      ['Slot pins 29/30, 25/26', `${f2(p.pCards,1)} W to the cards`, '30-way EDAC 307-030', p.any],
    ];
    m.querySelector('#mfSt').innerHTML=`<svg viewBox="0 0 980 ${st.length*36+10}" style="width:100%">${st.map((r,i)=>`<rect x="6" y="${6+i*36}" width="968" height="30" rx="6" fill="${r[3]?'var(--panel2)':'rgba(220,60,40,.18)'}" stroke="var(--line)"/><text x="16" y="${26+i*36}" font-size="12" font-family="var(--mono)" fill="var(--ink)">${i+1}. ${r[0]}</text><text x="330" y="${26+i*36}" font-size="12" fill="var(--accent)">${r[1]}</text><text x="600" y="${26+i*36}" font-size="11" fill="var(--ink2)">${r[2].replace(/<[^>]+>/g,'')}</text>${i<st.length-1?`<line x1="20" y1="${36+i*36}" x2="20" y2="${42+i*36}" stroke="var(--ink2)"/>`:''}`).join('')}</svg>`;
    const states=[['OFF','no AC or fuse open',!q.alive],['RUNNING','green on, red off (no load)',q.alive&&!q.iled],['SUPPLYING','green and red on',q.alive&&q.iled]];
    m.querySelector('#mfSm').innerHTML=`<svg viewBox="0 0 980 90" style="width:100%">${states.map((s,i)=>`<rect x="${20+i*320}" y="15" width="260" height="56" rx="28" fill="${s[2]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${150+i*320}" y="40" text-anchor="middle" font-size="13" font-weight="700" fill="${s[2]?'#fff':'var(--ink)'}">${s[0]}</text><text x="${150+i*320}" y="58" text-anchor="middle" font-size="10.5" fill="${s[2]?'#fff':'var(--ink2)'}">${s[1]}</text>${i<2?`<line x1="${282+i*320}" y1="43" x2="${338+i*320}" y2="43" stroke="var(--ink2)" marker-end="url(#mfar2)"/>`:''}`).join('')}<defs><marker id="mfar2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs></svg><div class="small muted">Red-lamp threshold ${inf('20 mA')}.</div>`;
  });
  sel.onchange=()=>SIM.refresh();
}
function viewBom(m){
  window[FLAG]=false;
  m.innerHTML = card('MF82-12 frame BOM (Misys MI632001, 8 Aug 2013) — cost roll-up', `<div class="small" style="display:flex;gap:14px;flex-wrap:wrap;align-items:center"><label>Backplane cost <select id="mfBc"><option value="misys">Misys roll-up $62.796 (used in the frame total)</option><option value="xlsx">Re-priced BP xlsx $65.37</option></select></label><label>Build quantity <input id="mfQ" type="number" min="1" max="500" value="${D.qty}" style="width:70px"></label></div><div id="mfBom"></div>`)
   + card('MF8212BP backplane BOM', '<div id="mfBp"></div>')
   + card('Not on the BOM', `<ul class="small"><li>The two power supplies (M8245A per the MF82E/S manual) — the frame BOM has the box, door and sockets but no supply.</li><li>Cards, rear modules and the E8200 extender.</li><li>The MF82REF reference board (RM1 is drawn in the “MF82REF configuration”).</li><li>Paint, silkscreen and the 8212-020-SILK / MF8212RM2-SILK artwork (in the WBS-made part prices).</li></ul>`);
  const upd=()=>{
    D.bpCost=m.querySelector('#mfBc').value; D.qty=Math.max(1,+m.querySelector('#mfQ').value||1);
    const bpUnit = D.bpCost==='misys'? 62.796 : 65.37;
    const rows=FRAME_BOM.map(l=>({l, unit:l[1]==='MF8212BP'?bpUnit:l[4]}));
    const tot=rows.reduce((a,r)=>a+r.l[3]*r.unit,0), by={}; rows.forEach(r=>by[r.l[6]]=(by[r.l[6]]||0)+r.l[3]*r.unit);
    let x=0; const bar=Object.keys(GROUPS).map(g=>{ const w=(by[g]||0)/tot*960; const s=`<rect x="${10+x}" y="10" width="${w}" height="26" fill="${GROUPS[g][1]}"><title>${GROUPS[g][0]}: ${money(by[g]||0)}</title></rect>${w>70?`<text x="${14+x}" y="28" font-size="11" fill="#fff">${GROUPS[g][0].split(' ')[0]} ${Math.round((by[g]||0)/tot*100)}%</text>`:''}`; x+=w; return s; }).join('');
    m.querySelector('#mfBom').innerHTML=`<svg viewBox="0 0 980 44" style="width:100%">${bar}</svg>
     <p class="small">Unit cost <b>${money(tot)}</b> (sheet total ${money(FRAME_TOTAL)}${Math.abs(tot-FRAME_TOTAL)>0.01?`; +${money(tot-FRAME_TOTAL)} with the re-priced backplane`:' — matches'}) · × ${D.qty} = <b>${money(tot*D.qty)}</b>${D.qty>1?` · ${f2(64*D.qty,0)} eyelets, ${32*D.qty} card guides, ${12*D.qty} EDAC 307-030 sockets`:''}</p>
     <div class="scroll"><table class="kv small"><tr><th>Line</th><th>Part</th><th>Description</th><th>Qty</th><th>Std cost</th><th>Extension</th><th>Supplier P/N</th><th>Step</th></tr>${rows.map(r=>`<tr><td>${r.l[0]}</td><td class="mono">${r.l[1]}</td><td>${esc(r.l[2])}</td><td>${r.l[3]}</td><td>${r.unit.toFixed(4)}</td><td>${(r.l[3]*r.unit).toFixed(4)}</td><td class="small">${esc(r.l[5])}</td><td><span style="color:${GROUPS[r.l[6]][1]}">■</span> ${r.l[7]}</td></tr>`).join('')}</table></div>`;
    const bm=BP_BOM.reduce((a,l)=>a+l[3]*l[4],0), bx=BP_BOM.reduce((a,l)=>a+l[3]*l[5],0);
    m.querySelector('#mfBp').innerHTML=`<table class="kv small"><tr><th>Line</th><th>Part</th><th>Description</th><th>Qty</th><th>Misys / QUOTE</th><th>Costed xlsx</th><th>Supplier P/N</th></tr>${BP_BOM.map(l=>`<tr><td>${l[0]}</td><td class="mono">${l[1]}</td><td>${l[2]}</td><td>${l[3]}</td><td>${l[4].toFixed(3)}</td><td ${l[4]!==l[5]?'style="color:var(--warn)"':''}>${l[5].toFixed(3)}</td><td>${l[6]}</td></tr>`).join('')}<tr><th colspan="4">Total</th><td><b>${bm.toFixed(3)}</b></td><td><b>${bx.toFixed(3)}</b></td><td></td></tr></table><p class="small muted">Only the two EDAC socket prices differ (1.72 → 1.90 and 2.275 → 2.48).</p>`;
  };
  m.querySelector('#mfBc').value=D.bpCost; m.querySelector('#mfBc').onchange=upd; m.querySelector('#mfQ').oninput=upd; upd();
}
const DWG = {
  'MF8212RM1':['MF8212 rear housing (MF82REF configuration) ISS 2','.059 (16 ga) CRS, 17.090 × 3.425 in, 1.330 in flanges; 12 cut-outs 0.750 × 2.700 in at 11 × 1.000 in, first 5.105 in from the power end; Detail B 2 × 1.080 × 1.240 in; ISS 2 “.437 DIA. WAS .218 DIA.” (13/01/06) though the drawn date reads 09/12/10. FILE:FOLDER MFXX/8212.'],
  'MF8212RM2':['Power cover ISS 1','Carries the IEC inlets, binding posts and REF BNCs (silk modelled in d8210-d8212.js).'],
  '82-002':['P.C. guide support bar, upper/lower front ISS 4','Aluminium extrusion B9901, 17.120 in, 12 × .093 in holes at 11 × 1.000 in from 0.500 in; clear alodine (18/10/05, was yellow). Title “D8212”, folder MFXX/MF82/ACAD.'],
  '82-003':['P.C. guide support bar, upper/lower rear ISS 2','Rear partner of 82-002.'],
  '82-004-1':['Side plate, left hand ISS 7','.119 (11 ga) CRS (ISS 6 23/02/05: was .125 aluminium), 12.713 × 3.470 in with 0.940 in rack flange, .250 × .406 oblong rack slots 3.000 in apart; ISS 7 28/01/13 “changed holes for door spring”. Folder MFXX\\MF82\\D8212E\\ACAD.'],
  '82-004-2':['Side plate, right hand (vented) ISS 6','Vented partner of 82-004-1.'],
  '82-072':['MF8210/MF8212 power-supply enclosure ISS 4','.064 aluminium, 10.60 × 4.340 × 2.980 in, 60 vents .125 × 1.000 in (3 rows, 19 × .250 pitch), clear alodine, stainless hardware only; drawn DEC97.'],
  '82-077':['Power-supply door ISS 2','13 vents .12 × 1.00 oblong (MF8210 folder copy, 2012|45).'],
  '8212-020':['New DA door ISS 3','.063 aluminium 17.060 in (17.100 with the two 8212-020-2 blocks), 3.462 in high, silkscreen to 8212-020-SILK, 19/10/05.'],
  '82-008-1':['Mounting block, power supply ISS 1',''], '82-009-1':['Spring plate ISS 5',''], '82-011':['Lacing bar and pillar ISS 2',''], '7-03-209':['Door latch ISS 4',''],
  '82-075':['Termination bracket ISS 4',''], '82-076':['BNC termination bracket ISS 4','Electroless nickel (MF8210 folder copy text).'], '82-079':['Termination bracket ISS 2',''], '8205-004':['Card handle ISS 2',''], 'SP3X4#4-CUSTOM':['Modified SOS-632-6 standoff ISS 1',''],
};
function viewDwg(m){
  window[FLAG]=false;
  const keys=Object.keys(DWG);
  m.innerHTML = card('2016|49 mechanical set (rendered from the PDFs, not redrawn)', `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${keys.map(k=>`<button data-d="${k}">${k}</button>`).join('')}</div><div id="mfDw"></div>`) + card('Side view to scale','<div>'+sideSVG()+'</div>');
  const upd=()=>{ const k=D.dwg, d=DWG[k]; m.querySelectorAll('[data-d]').forEach(b=>b.style.background=b.dataset.d===k?'var(--accent)':''); const f='mf8212-frame-dwg-'+k.replace('#','').toLowerCase()+'.png';
    m.querySelector('#mfDw').innerHTML=`<p><b>${k}</b> — ${d[0]}. <span class="small">${d[1]||'Read the drawing for dimensions.'}</span></p><div style="background:#fff;border-radius:6px;padding:6px"><img src="${ASSET}${f}" style="width:100%;display:block" alt="${k} drawing"></div><p class="small muted">D8210 & D8212 - #Mechanical #DA #2016/${k} … .pdf</p>`; };
  m.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{ D.dwg=b.dataset.d; upd(); }); if(!DWG[D.dwg]) D.dwg='MF8212RM1'; upd();
}
function viewFind(m){
  window[FLAG]=false;
  const F=[
   ['Artwork 2026|59: the rear power cover now comes from '+SIM.src('#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK(CURVE).cdr','MF8212RM2-SILK(CURVE).cdr')+' (2016-06-22).','The silk is converted from CorelDRAW and placed at 1:1 on the to-scale rear; it matches the MF8212RM2 ISS 1 drawing (4.150 × 3.300 in, notch 3.342 in, posts .475/.750 apart at 1.590 in, BNCs .750 apart at 2.433 in). It shows what the earlier drawing missed: <b>two</b> BNCs, REF IN and REF OUT, and the posts stacked vertically under chassis and earth symbols. The November 2015 issue '+SIM.src('#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK (CURVE).cdr','MF8212RM2-SILK (CURVE).cdr')+' has the same art with the BNC legends the other way round (REF OUT left, REF IN right). The 2016 silk carries no fuse rating; the 1999 MF82SILK.CDR did (“1.5 / 0.75 A SB”).'],
   ['The frame BOM has no power supplies.','<span class="mono">MF8212 BOM Costed.xlsx</span> lists the supply box (82-072), its door (82-077), the mounting block and two EDAC 307-024 supply sockets on MF8212BP, but no supply module. The supplies (M8245A, per the MF82E/S manual) are a separate order: a $239.51 frame is not a working frame.'],
   ['Three different fuse ratings for the same inlet.','BOM line 27 fits <b>2 A</b> 5×20 mm (218002 / S506-2-R) in the 723W-X2/02 inlet. <span class="mono">MF8212-3.DSN</span> F1/F2 and <span class="mono">MF82SILK.CDR</span> say <b>1.5 / 0.75 A SB</b>. The MF82E/S manual says <b>0.75 A (min.) slow blow #3AG</b> — a ¼ × 1¼ in fuse that does not fit a 5×20 mm holder. Try the fuse selector: with a full frame the 0.75 A fuse is marginal at 115 V.'],
   ['Two prices for the same backplane.','The frame roll-up uses MF8212BP at <b>$62.796</b> (Misys, identical to <span class="mono">MF8212BP BOM QUOTE Misys.xls</span>, which is byte-for-byte the same file as <span class="mono">MF8212BP BOM Misys.xls</span>). <span class="mono">MF8212BP BOM Costed.xlsx</span> re-prices the EDAC sockets (1.72→1.90, 2.275→2.48) to <b>$65.37</b>, so the frame should cost $242.08.'],
   ['A file named “MF8212 BOM.xlsx” is the backplane BOM.','<span class="mono">MF8212 Frame - #BOM/MF8212 BOM.xlsx</span> holds the MF8212BP lines, not the frame; the frame list is in <span class="mono">MF8212 Frame BOM.xlsx</span>. The top-level and #BOM folders otherwise duplicate each other (same content, re-saved 12 Aug 2013).'],
   ['Eyelets count the guides.','16 SE-37 + 48 SE-38 eyelets = 64 = 2 × (28 nine-inch + 4 six-and-a-half-inch guides). 24 of the 28 9″ guides serve the 12 card slots (top and bottom); the other four are unexplained '+inf('perhaps the supply modules outside the 82-072 box')+'.'],
   ['Manual pins vs netlist pins.','The manual’s “pins 13 and 15” are connector <i>positions</i>; the card netlists (m8209_iss1.net) put −22 V on pins 25/26 and +22 V on pins 29/30 of the same 30-way EDAC.'],
   ['Set points are not symmetric.','The 14-289/14-319 supply sets +21.56 V (240/3K9) and −22.08 V (120/2K). The DSN calls both rails ±22 V and the d8200/D8204 manuals quote ±20 V at the card — the extra drop is the card’s own polyfuse and reverse diode (M8209: RXE050 + 1N4003).'],
   ['Redundancy is only N+1 up to ≈ 0.42 A.','With 0.75 A fuses on each supply card and a capacitor-input rectifier (rms ≈ 1.8 × DC '+inf('form factor')+'), one supply alone carries about 420 mA per rail. Twelve M8202s (1.02 A) are fine with both supplies but a single failure takes the other one out with it.'],
   ['The masters still point into MFXX.','Title blocks of the 2016|49 master PDFs read “FOLDER: MFXX/MF82/ACAD” (82-002), “MFXX\\MF82\\D8212E\\ACAD” (82-004-1, 8212-020), “MFXX/MF8212” (82-072) and “MFXX/8212” (MF8212RM1): the “superseded” engineering folder was the drafting home of the masters.'],
   ['Revision date before drawn date.','MF8212RM1 ISS 2 records the revision “.437 DIA. WAS .218” on 13/01/06 but the title block date is 09/12/10 — the title block was copied from MF8210RM1 (drawn 16/12/04, same revision line).'],
   ['Front and rear slot origins differ.','The front rails (82-002) put guide 1 at 0.500 in from the end; the rear housing puts cut-out 1 at 0.985 in from its card end (17.090 − 5.105 − 11.000). The 0.5 in offset is taken up by the side-plate and housing geometry '+inf('not dimensioned as an assembly anywhere')+'.'],
  ];
  m.innerHTML = card('Findings', `<ol>${F.map(f=>`<li><b>${f[0]}</b> ${f[1]}</li>`).join('')}</ol>`)
   + card('Sources', `<p class="small mono">MF8212 Frame - #Master #MF82/*.xlsx, *.xls (and #BOM copies) · D8210 & D8212 - #Mechanical #DA #2016/*.pdf · MFXX (DA FRAME)…/MF8212 - #Engineering/MF8212-3.DSN, MF8212.DSN, MF82SILK.CDR · MFXX…/MF82-4 - #Engineering/14-289.PCB, 14-319.PCB, SA14-289.DWG · MFXX…/MF82ES - #Engineering/MANUAL/INSTALLATION AND SETUP.doc · MFXX…/MF82XXMN.CDR, MF82XXDM.CDR · M8209 - #Engineering #MF82/PCB/m8209_iss1.net</p>`);
}

SIM.register({
  footnotes:[
    {text:'MF8212RM2-SILK swaps its BNC legends between issues: NOV.06/15 reads REF OUT (left) / REF IN (right); JUN.22/16 reads REF IN / REF OUT.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK (CURVE).cdr'},
    {text:'The RM2 silk is stored three times: “MF8212RM2-SILK (CURVE).cdr” (2015-11-09), “MF8212RM2-SILK(CURVE).cdr” and the live-text “MF8212RM2-SILK.cdr” (both 2016-06-22); the two CURVE names differ only by a space.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK.cdr'},
    {text:'MF8212RM2-SILK(CURVE).cdr holds hidden leftover objects under the CAUTION block: two small circles joined by a line and the letters “ENCE” with no colour set; they are not printed.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK(CURVE).cdr'},
    {text:'The RM2 silk has no fuse rating, although the inlets take 2 A fuses per the 2013 BOM and the 1999 silk MF82SILK.CDR printed “1.5 / 0.75 A SB”.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #ARTWORK #DA #2016/MF8212RM2-SILK(CURVE).cdr'},
    {text:'The MF8212RM2 drawing (ISS 1, 05/08/10) is drawn 1:1 with the silk: 4.150 × 3.300 in, chassis and ground posts .750 apart, REF BNCs .750 apart.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #Mechanical #DA #2016/MF8212RM2 ISS 1 (POWER COVER).pdf'},
    {text:'RM2 is titled “DA REAR POWER SOURCE COVER” with “FOLDER: MFXX/MF8212/” in its title block, although it now lives in the D8210 & D8212 mechanical folder.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #Mechanical #DA #2016/MF8212RM2 ISS 1 (POWER COVER).pdf'},
    {text:'MF8212RM1 ISS 2 records “.437 DIA. WAS .218” on 13/01/06 but its title block is dated 09/12/10.', src:'#MF8200 #SERIES/D8210 & D8212 - #Master #MF82/D8210 & D8212 - #Mechanical #DA #2016/MF8212RM1 ISS 2 (REAR HOUSING).pdf'} ],
  id:'mf8212-frame', product:'MF8212 Frame', year:2013, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/MF8212 Frame - #Master #MF82',
  name:'MF8212 Frame · 12-slot MF82-12 rack frame built from its BOM (2013|46)',
  summary:'The 2-RU, 12-slot MF82-12 frame as its 2013|46 Misys BOMs and the 2016|49 mechanical drawings define it: assemble it part by part, cost it, load it with cards and watch two ±22 V supplies share the load mains cycle by mains cycle. Front, rear and side are drawn to scale from the MF8212RM1, 82-002, 82-004 and 82-072 drawings.',
  highlights:['Assemble the frame from its 34-line BOM','To-scale front, rear and side from the mechanical PDFs','Two supplies sharing ±22 V, 120 Hz ripple and dropout','N+1 redundancy check against the 0.75 A supply fuses','Findings: no supplies on the BOM, three fuse ratings, two backplane prices'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 mains cycle',period:()=>1/60},{label:'1 ripple cycle',period:()=>1/120},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[1/30,'2 mains cycles'],[1/120,'1 ripple cycle'],[0.001,'1 ms']],
  defaultZoom:2,
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: build & commission',render:viewTut},
    {id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics (redrawn)',render:viewSchem},
    {id:'software',label:'Power path',render:viewSoft},
    {id:'bom',label:'BOM & cost',render:viewBom},
    {id:'drawings',label:'Drawing set',render:viewDwg},
    {id:'findings',label:'Findings',render:viewFind},
  ],
});
})();
