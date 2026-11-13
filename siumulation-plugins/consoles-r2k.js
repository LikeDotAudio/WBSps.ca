/* =====================================================================
   R2K — Ward-Beck "Renaissance" R2K broadcast radio console (1999|32)
   Plugin for the WBS Device Simulator (../siumulation.html) — full model

   Sources (folder "#CONSOLES - #OBSOLETE #Archive"):
   - Console Manuals/R2K ConsoleManual - Text.pdf (2007 text of the R2K manual: R201/R221, R207, R202–R210)
   - Console Manuals/R2K.pdf  (= R2Kfunctional_pg1–3, "R2K FUNCTIONAL", R251.DSN, Nov 1999): slots, RS485 addresses,
     motherboard pins (RS485-1 41, RS485-2 43, +20 45, −20 47, AGND 49, DGND 51, +20V 53, CHASSIS 55)
   - Console Manuals/R2K20 Console Report.doc: a real R2K/20 in service (module list, faults, firmware versions)
   - MODULES/R201/r201v101.asm  "R201\7 LINE INPUT MODULE, iss2,3 pcb, v1.01, released march 18,1999" (PIC16C65A)
     MODULES/R201/code/r201m101/m102/m201/m301/c102.asm (customer mode variants), R221/v302 (PIC16F874)
   - MODULES/R206/r206v103.asm (U2, PIC16F74: scan, turret "pole", SPI master), s206v102.asm (U3, PIC16C63:
     "rs485 bus master", Tim Clarke, Nov 27 2000), v105/r206v105.asm (U16, PIC16F73: timer/clock, Timer2 ISR)
   - MODULES/R203/Software/R203v106, ENCDV102/encdv102.asm (PIC16C54 optical-encoder volume)
   - TURRETS/R257/v101/r257-1v3.asm (R257-1 turret, V101 Feb 11 2000)
   - Artwork: CorelDRAW silks MODULES/R201/SILK/R201SILK.CDR, R207SILK.CDR, R202/R202MOD.cdr, R203/R203SILK.CDR,
     R204/R204SILK.CDR, R205/R205SILK.CDR, R206/R206SILK.CDR, R208/R208SILK.CDR, R209/R209SILK.CDR and
     r2k20silkMeterBridgeCurveREV3.cdr, converted with Inkscape (libcdr). The CDR text is lost in conversion,
     so the labels are re-set by this plugin; drill crosshairs (hairlines) were read out of the same files to
     place every button, LED, pot and the fader.  -> assets/consoles-r2k-*.svg (Artwork 2026|59: vector cuts from the plain-SVG
     conversion, each registered on the earlier 150 dpi PNG frame, 1.44 × 13.93 in; meter bridge 24.39 × 2.29 in; garbled
     live text dropped, curve text such as the R206 LOAD/DOWN/START/STOP legends kept)
   - MODULES/XXX - R257 - #Master #Obsolte/R257 - #Mechanical #Obsolete/R257M8 ISS 1 (ANNOUNCE TURRET BODY).pdf
   - Photos: CustomR2K28.jpg (black panels, green fader wedges, red ON keys)
   Anything not in those files is marked "inferred".
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/consoles-r2k-';
/* Artwork 2026|59: preload the CorelDRAW SVGs once, so panels that are re-rendered every frame never show them half-loaded */
const ART_PRELOAD = ["r201.svg", "r202.svg", "r203.svg", "r204.svg", "r205.svg", "r206.svg", "r207.svg", "r208.svg", "r209.svg", "meterbridge.svg"].map(n=>{ const i=new Image(); i.src=ASSET+n; return i; });
const KEY = '__r2kActive';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b,id)=>`<div class="card"${id?` id="${id}"`:''}><h2>${t}</h2>${b}</div>`;
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');

/* ---------------- timing constants ---------------- */
const FOSC = 4.9152e6;                  // SPBRG=7, BRGH=0 → 9600 Bd; R206 U16 Timer2 → exactly 160 int/s
const TCY = 4/FOSC;                     // 0.8138 µs
const PASS = 405*TCY;                   // R201 main-loop pass ≈ 405 instruction cycles (counted, inferred) ≈ 0.33 ms
const BYTE = 10/9600;                   // 8N1 byte on RS485 / RS422 / timer serial
const T2INT = 32*16*15*TCY;             // U16: PR2=0x1F, prescale 16, postscale 15 → 6.25 ms
const R206PASS = 46*TCY;                // U2 main loop pass (inferred) → tmout 256 passes ≈ 9.6 ms
const TURN = 0.40e-3;                   // turret reply turnaround (inferred)

/* ---------------- panel geometry (inches, from the CDR drill crosshairs) ---------------- */
const PW = 1.44, PH = 13.93;
const P = (dx,y)=>[0.72+dx/72, 0.205+(y-91)/72];            // crosshair (pt from screw centre) → panel inches
const FADER = { x:0.70, top:7.47, mark:8.69, bot:11.57 };     // R201SILK wedge: top, “12 dB in hand” bar, end of travel
const FTAB = [[12,7.47],[6,8.08],[0,8.69],[-10,9.40],[-20,9.98],[-30,10.47],[-40,10.86],[-60,11.36],[-Infinity,11.57]];   // dB scale along the wedge (inferred)
const fy = db=>{ if(db===-Infinity) return FADER.bot; for(let i=0;i<FTAB.length-1;i++){ const [a,ya]=FTAB[i],[b,yb]=FTAB[i+1]; if(db<=a&&db>=b){ if(b===-Infinity) return ya+(yb-ya)*Math.min(1,(-60-db)/20); return ya+(yb-ya)*(a-db)/(a-b);} } return FADER.bot; };
const fdb = y=>{ if(y>=FADER.bot-0.04) return -Infinity; if(y<=FADER.top) return 12; for(let i=0;i<FTAB.length-1;i++){ const [a,ya]=FTAB[i],[b,yb]=FTAB[i+1]; if(y>=ya&&y<=yb){ if(b===-Infinity) return -60; return a+(b-a)*(y-ya)/(yb-ya);} } return -60; };

/* control layouts per panel type: [key, kind, [x,y], label, colour] */
const LAY = {
  R201:[['a','btn',P(-21,175),'A','amb'],['b','btn',P(-21,211),'B','amb'],['mono','btn',P(-21,254),'MONO','amb'],
        ['trimR','trim',P(21,175),'R'],['trimL','trim',P(21,211),'L'],
        ['p1','btn',P(-21,362),'P1','red'],['p2','btn',P(21,362),'P2','red'],['p3','btn',P(-21,398),'P3','red'],['p4','btn',P(21,398),'P4','red'],
        ['m1','btn',P(-21,452),'M1','grn'],['m2','btn',P(21,452),'M2','grn'],['cue','btn',P(-21,506),'CUE','yel'],
        ['fader','fader',[FADER.x,0],''],['onled','led',P(0,960),''],['chon','on',P(0,1012),'ON','red']],
};
LAY.R207 = LAY.R201.concat([['bal','pot',P(20,308),'BAL']]);
LAY.R221 = LAY.R201.concat([['s1','pot',P(-21,335),'M1'],['s2','pot',P(21,335),'M2']]);
const SELIN = ['PGM 1','PGM 2','PGM 3','PGM 4','MONO 1','MONO 2','AIR','EXT'];      // selector inputs IN1–IN8 (wiring inferred)
LAY.R203 = [...SELIN.map((s,i)=>['met'+i,'btn',P(-21,175+36*i),s,'amb']), ...SELIN.map((s,i)=>['mon'+i,'btn',P(-21,499+36*i),s,'grn']),
        ['muteled','led',P(-23,879),'MUTE'],['dimled','led',P(0,960),'DIM'],['enc','enc',P(0,1012),'MONITOR']];
LAY.R204 = [...SELIN.map((s,i)=>['s1'+i,'btn',P(-21,175+36*i),s,'amb']), ...SELIN.map((s,i)=>['s2'+i,'btn',P(-21,499+36*i),s,'grn']),
        ['v1','pot',P(-23,827),'ST 1'],['v2','pot',P(23,827),'ST 2'],['tb1','btn',P(-23,895),'T/B 1','red'],['tb2','btn',P(23,895),'T/B 2','red']];
LAY.R205 = [...SELIN.map((s,i)=>['o1'+i,'btn',P(-21,175+36*i),'IN '+(i+1),'amb']), ...SELIN.map((s,i)=>['o2'+i,'btn',P(-21,499+36*i),'IN '+(i+1),'grn'])];
LAY.R206 = [['bar','bar',P(0,195),''],['autoled','led',P(-21,366),'AUTO'],['muteled','led',P(-21,395),'MUTE'],['cuelvl','pot',P(20,380),'CUE'],
        ['load','btn',P(-21,508),'LOAD','amb'],['down','btn',P(-21,580),'DOWN','amb'],['start','btn',P(-21,652),'START','grn'],['stop','btn',P(-21,724),'STOP','red'],
        ['hplvl','pot',P(25,830),'PHONES'],['jack','jack',P(-20,913),'']];
LAY.R209 = [0,1,2,3,4,5].flatMap(i=>[['cm1'+i,'btn',[0.46,1.05+i*1.62],'M1','grn'],['cm2'+i,'btn',[0.98,1.05+i*1.62],'M2','grn']]);
LAY.R202 = []; LAY.R208 = []; LAY.BLANK = [];
const ART = { R201:'r201', R207:'r207', R221:'r201', R202:'r202', R203:'r203', R204:'r204', R205:'r205', R206:'r206', R208:'r208', R209:'r209' };
const LAMP = { amb:'#f0a020', red:'#ff3b30', grn:'#3ddc63', yel:'#ffe14a' };

/* ---------------- firmware variants (R201 family) ---------------- */
// mode flags per firmware: AO = flag2,5 ch always on · PL = flag2,6 out1 pulsed · EOT = flag2,4 fader-down turns channel off · IO = ext in3/in4 role
const FW = {
  v101:{name:'R201V101 (16C65A, Mar 1999)', modes:[[0,0,0,'AB'],[1,1,0,'AB'],[0,0,0,'CUE'],[1,1,0,'CUE'],[1,1,1,'AB'],[0,0,1,'AB'],[0,0,1,'CUE'],[1,1,1,'CUE']], pulse:255},
  m102:{name:'R201M102 (16F74, Telemedia modes, Jan 2002)', modes:[[0,0,0,'AB'],[1,0,1,'AB'],[0,0,0,'AB'],[0,0,0,'AB'],[1,0,1,'AB'],[0,0,1,'AB'],[0,0,1,'CUE'],[1,0,1,'CUE']], pulse:255},
  m101:{name:'R201M101 (16C65A, Telemedia, Jan 2000)', modes:null, pulse:255},
  m301:{name:'R201M301 (16F74, CBC Windsor, Feb 2002)', modes:[[0,0,0,'AB'],[1,0,1,'AB'],[0,0,0,'AB'],[0,0,1,'AB'],[1,0,1,'AB'],[0,0,1,'AB'],[0,0,1,'CUE'],[1,0,1,'CUE']], pulse:255},
  c102:{name:'R201C102 (16F74, turntable, Oct 2003)', modes:null, pulse:510},
  v302:{name:'R221V3.02 (16F874, R241 code base, 2006)', modes:null, pulse:255},
};
FW.m101.modes = FW.m102.modes; FW.c102.modes = FW.m102.modes; FW.v302.modes = FW.m102.modes;

/* ---------------- console build ---------------- */
// "R2K20 Console Report.doc": R205 ×1, R209 ×1, R221 (new issue) ×1, R201 (old issue) ×10, R202, R203, R204, R206.
// "1 R201 has M101 software (pic16c65) the rest all have M102". Slot order inside the input section is inferred,
// except R205 in one of “the four left hand module slots” (manual) and R202/R203/R204/R206 in positions 21–24 (R2K FUNCTIONAL p.2).
const PRESETS = {
  report:{ label:'R2K/20 from “R2K20 Console Report.doc”', n:20, inputs:['R205','R201','R201','R201','R201','R201','R201','R201','R201','R201','R201','R221','R209','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK'] },
  std20:{ label:'R2K/20 standard (R2KTYPUS.HTM price list)', n:20, inputs:['R205',...Array(16).fill('R201'),'R209','BLANK','BLANK'] },
  r12:{ label:'R2K/12', n:12, inputs:Array(12).fill('R201') },
  r28:{ label:'R2K/28', n:28, inputs:['R205',...Array(20).fill('R201'),'R209',...Array(6).fill('BLANK')] },
};
const SRCNAMES = ['ANNOUNCE MIC','GUEST MIC','CD 1','CD 2','PHONE','SAT RX','NETWORK','CART','TT 1','TT 2','REMOTE','AUX','LINE'];
let D;
function mkInput(pos, addr, type, k){
  return { type, pos, addr, fw: type==='R221'?'v302':(k===1?'m101':'m102'), sel:1, mono:0, p:[0,0,0,0], m:[0,0], cue:0, chon:0, fader:-Infinity,
    mode: 0, ext:[0,0,0,0], muteJ: k===1?'A':(k===2?'B':''), tmrJ: k<=2, trimL:0, trimR:0, bal:0, s1:-10, s2:-10,
    srcA: SRCNAMES[(pos-1)%SRCNAMES.length], srcB: SRCNAMES[(pos+4)%SRCNAMES.length], lvl: 4-((pos*7)%9), ph: pos*1.7,
    tmrpls:0, out1:0, eot:true, fault:{} };
}
function build(preset){
  const pr = PRESETS[preset]; const n = pr.n; const slots=[]; let k=0;
  pr.inputs.forEach((t,i)=>{ const pos=i+1, addr=28-n+i;
    if (t==='R201'||t==='R221'||t==='R207'){ k++; slots.push(mkInput(pos,addr,t,k)); }
    else if (t==='R205') slots.push({type:'R205',pos,addr,o1:0,o2:1});
    else if (t==='R209') slots.push({type:'R209',pos,addr:null,cm:[[1,0],[0,1],[1,0],[0,1],[1,1],[0,0]]});
    else slots.push({type:t,pos}); });
  slots.push({type:'R202',pos:n+1});
  slots.push({type:'R203',pos:n+2,addr:29,met:0,mon:0,level:200,count:0,dim:true,muteA:true,muteB:false});
  slots.push({type:'R204',pos:n+3,addr:30,s1:0,s2:0,v1:-10,v2:-10,tb1:0,tb2:0,muteB:true});
  slots.push({type:'R206',pos:n+4,variant:'R206',cue:-10,hp:-6});
  return slots;
}
function reset(preset){
  preset = preset||'report';
  D = { preset, slots:build(preset), sel:1, log:[], ev:[], faults:false,
        tmr:{ base:0, run:false, t0:0, down:false, load:false, preset:0, clk:false }, clock: 10*3600+57*60,
        tur:[{present:true, ch:2, setup:false, tb:0, mon:0},{present:true, ch:3, setup:false, tb:0, mon:1}],
        uart:[] };
  const s=D.slots; const c1=s.find(x=>x.pos===2), c2=s.find(x=>x.pos===3);
  if (c1){ c1.fader=0; c1.p[0]=1; } if (c2){ c2.fader=-6; c2.p[0]=1; c2.m[0]=1; }
  const c4=s.find(x=>x.pos===4); if(c4){ c4.fader=0; c4.p[0]=1; c4.chon=1; c4.eot=false; }
  const c5=s.find(x=>x.pos===5); if(c5){ c5.fader=-4; c5.p[1]=1; c5.chon=1; c5.eot=false; }
}
reset();
const inputs = ()=>D.slots.filter(s=>s.type==='R201'||s.type==='R221'||s.type==='R207');
const slotOf = t=>D.slots.find(s=>s.type===t);
const byAddr = a=>D.slots.find(s=>s.addr===a && (s.type==='R201'||s.type==='R221'||s.type==='R207'));

/* ---------------- audio model ---------------- */
const dbsum = arr=>{ let p=0; arr.forEach(d=>{ if(d>-200) p+=Math.pow(10,d/10); }); return p>0? 10*Math.log10(p) : -Infinity; };
function srcLevel(ch, t){ // program-like envelope around the nominal level (inferred), mono sum = −6 dB L+R (manual) → same level for correlated stereo
  const e = 4*Math.sin(2*Math.PI*(1.3+ch.pos*0.11)*t+ch.ph) + 2.5*Math.sin(2*Math.PI*(4.7+ch.pos*0.3)*t+ch.ph*2) - 1.5;
  return ch.lvl + e; }
function chOut(ch, t){ // [L,R] dBu post fader (and the pre-fader cue feed)
  const s = srcLevel(ch,t) + (ch.sel? 0 : -1.5);
  let L = s+ch.trimL, R = s+ch.trimR;
  if (ch.mono){ const m=dbsum([L,R])-6+3; L=R=m; }
  const pre=[L,R];
  if (ch.type==='R207' && ch.bal){ L-=Math.max(0,ch.bal)*1.5; R-=Math.max(0,-ch.bal)*1.5; }
  const f = ch.fader;
  return { pre, post: f===-Infinity? [-Infinity,-Infinity] : [L+f, R+f], on: ch.chon && f>-Infinity };
}
function buses(t){
  const b={p:[[],[],[],[]], m:[[],[]], cue:[]};
  for (const ch of inputs()){ const o=chOut(ch,t);
    if (ch.cue) b.cue.push(dbsum(o.pre));
    if (!o.on) continue;
    for (let i=0;i<4;i++) if (ch.p[i] && !(D.faults && ch.fault.p24 && (i===1||i===3))) b.p[i].push(o.post);
    for (let i=0;i<2;i++) if (ch.m[i]) b.m[i].push(dbsum(o.post)-3 + (ch.type==='R221'? (i?ch.s2:ch.s1)+10 : 0)); }
  const st = arr=>[dbsum(arr.map(x=>x[0])), dbsum(arr.map(x=>x[1]))];
  const P=b.p.map(st), M=b.m.map(a=>dbsum(a));
  const IN=[P[0],P[1],P[2],P[3],[M[0],M[0]],[M[1],M[1]],[srcAir(t),srcAir(t)],[-Infinity,-Infinity]];
  return { P, M, cue:dbsum(b.cue), IN };
}
const srcAir = t=>2+3*Math.sin(2*Math.PI*0.9*t);       // off-air receiver on IN7 (inferred)
function mutes(){ const m={A:0,B:0,C:0}; for(const ch of inputs()) if(ch.chon && ch.muteJ) m[ch.muteJ]=1; return m; }
function monitor(t){ const r3=slotOf('R203'), b=buses(t), mu=mutes();
  const sel = mu.C? 0 : r3.mon;                                   // “When mute C is active it switches monitor selector to 1”
  const cueOn = inputs().some(c=>c.cue);
  const g = -(255-r3.level)*0.25 + (r3.dim && cueOn? -12 : 0);   // encdv102: LEVEL 0–255; “REDUCE THE LEVEL BY -12 dB” (step size inferred)
  const muted = (r3.muteA && mu.A) || (r3.muteB && mu.B);
  return { sel, muted, cueOn, gain:g, lvl: muted? [-Infinity,-Infinity] : b.IN[sel].map(x=>x+g), meter: b.IN[r3.met] }; }

/* PPM-like LED ballistics (rise 10 ms, fall 20 dB / 1.5 s — inferred) */
function meterAt(fn, t){ let best=-Infinity; for (let k=0;k<=60;k++){ const tt=t-k*0.01; if(tt<0) break; const v=fn(tt) - (20/1.5)*(k*0.01); if(v>best) best=v; } return best; }
const MARKS = [-36,-28,-24,-20,-16,-14,-12,-10,-8,-6,-4,-2,0,2,4,6,8,10,12,14,16];   // meter-bridge silk “36 28 … 14 PK”
const REF = 4;   // 0 on the scale = +4 dBu (inferred)

/* ---------------- event log / firmware traces ---------------- */
function addEv(e){ e.t = e.t==null? SIM.t : e.t; D.ev.push(e); if (D.ev.length>400) D.ev.shift(); }
function act(label, fn){ const tr=[]; const say=s=>tr.push(s); fn(say); D.log.unshift({t:SIM.t, label, tr}); if (D.log.length>60) D.log.pop(); SIM.refresh(); }
const modeFlags = ch=>{ const f=(FW[ch.fw]||FW.v101).modes[ch.mode]; return {AO:!!f[0], PL:!!f[1], EOT:!!f[2], IO:f[3]}; };
const deb = ()=>`debounce: scan0/1 = pscan0/1 for 16 passes (bounce,4) ≈ ${(16*PASS*1e3).toFixed(1)} ms → bsf flag0,0 (pb take), bsf flag0,1 (wait for release)`;

/* chonproc(): the R201 channel-on state machine (r201v101.asm) */
function chonproc(ch, src, say){
  const f=modeFlags(ch), was=ch.chon;
  if (src==='pb'){
    if (f.AO){ ch.chon=1; say('chonproc: btfss flag2,0 → front pb; btfss flag2,5 → mode says “ch always on” → bsf status1,0 · bsf flag0,2 (timer pulse)'); pulseOn(ch,f,say,true); return; }
    if (was){ ch.chon=0; say('chonproc pbp0: status1,0 was set → bcf status1,0 (channel off) · bcf porte,2 (OUT1 off)'); }
    else { ch.chon=1; say('chonproc pbp1: bsf status1,0 (channel on) · bsf flag0,2 (timer pulse) · bsf porte,2 (OUT1)'); pulseOn(ch,f,say,true); }
  } else if (src==='on'){
    if (!was) say('chon0: flag2,1 (ext IN1 or uart chonu) and status1,0 clear → bsf flag0,2 (timer pulse)'); else say('chon0: already on → no timer pulse (“if already on do not generate timer pulse”)');
    ch.chon=1; pulseOn(ch,f,say,!was);
  } else if (src==='off'){ ch.chon=0; say('choff0: flag2,2 (ext IN2, OFF pb or uart) → bcf status1,0 · bcf porte,2'); }
  else if (src==='eot'){ ch.chon=0; say('eot0: flag2,4 (EOT-off mode) & flag2,3 (fader went down) → bcf status1,0 · bcf porte,2'); }
  if (was!==ch.chon) addEv({k:'chon', a:ch.addr, v:ch.chon});
  say(`refresh: ${ch.chon?'BSF':'BCF'} PORTB,CHON (audio enable) · ${ch.chon?'BCF':'BSF'} PORTA,CHLED · ${ch.chon?'BCF':'BSF'} PORTE,0 (OUT2 = off tally)`);
  if (ch.chon && ch.muteJ) say(`mute jumper → MUTE ${ch.muteJ} bus active (${ch.muteJ==='C'?'R203 monitor forced to IN1':'R203/R204 mute per their jumpers'})`);
  if (ch.chon) say(`refresh: a/b mute: ${ch.sel?'bsf portd,2 (A mute bus line follows input A)':'bsf portb,4 (B mute bus line follows input B)'}`);
}
function pulseOn(ch,f,say,tmr){
  if (tmr){ const n=(FW[ch.fw]||FW.v101).pulse; ch.tmrpls=SIM.t; addEv({k:'tmr', a:ch.addr, d:n*PASS});
    say(`chout: movlw 0xff → tmrpls; pulse: BSF PORTB,5 for ${n} passes ≈ ${(n*PASS*1e3).toFixed(0)} ms (TIMER RESET bus)${ch.tmrJ?'':' — module timer-reset jumper OFF, R206 ignores it'}`);
    if (ch.tmrJ) timerReset(say); }
  if (f.PL){ addEv({k:'out1', a:ch.addr, d:255*PASS}); say(`mode sets flag2,6 → bsf flag0,3 → out1pls = 0xff: OUT1 (porte,2) is an event pulse ≈ ${(255*PASS*1e3).toFixed(0)} ms`); }
  else say('flag2,6 clear → OUT1 (porte,2) is a maintained CH ON tally');
}
function r201(ch, key){
  const n=`${ch.type} pos ${ch.pos} (addr ${ch.addr})`;
  if (D.faults && ch.fault.p24 && (key==='p2'||key==='p4')) return act(`${n}: ${key.toUpperCase()} pressed — nothing happens`, say=>say('Service report: “On one R201 module the P2 and P4 switches do not work” — the 74HC165 never sees the closure, scan0 stays 0.'));
  act(`${n}: ${key.toUpperCase()} pressed`, say=>{
    const bit={m1:'scan0,1',p3:'scan0,3',a:'scan1,4',mono:'scan1,2',cue:'scan1,1',b:'scan1,3',p1:'scan0,5',m2:'scan0,0',p2:'scan0,4',p4:'scan0,2',chon:'scan1,0'}[key];
    say(`scan: bcf/bsf portC,5 (load 74HC165s), shift order M1 P3 A MONO CUE B P1 M2 P2 on portD,3 with clk2 (portC,4); P4 on portB,7, CHON on portA,1 → bsf ${bit}`);
    say(deb()); addEv({k:'deb', a:ch.addr, d:16*PASS});
    const tog=(nm,get,set,stbit)=>{ const v=!get(); set(v?1:0); say(`process → ${nm}take: btfss ${stbit} → ${v?'bsf':'bcf'} ${stbit}`); };
    if (key==='a'||key==='b'){ ch.sel = key==='a'?1:0; say(`process → ${key}take: ${key==='a'?'bsf':'bcf'} status1,3 (A/B are interlocked: one bit)`); say(`refresh: ${ch.sel?'BSF':'BCF'} PORTC,AB`); }
    else if (key==='mono') tog('mono',()=>ch.mono,v=>ch.mono=v,'status1,2');
    else if (key==='cue') { tog('cue',()=>ch.cue,v=>ch.cue=v,'status1,1'); if(ch.cue) say('CUE bus: pre-fader, pre-CHANNEL ON → cue speaker (R206) and auto cue in the right headset channel; R203 dims −12 dB if its jumper is set'); }
    else if (/^p[1-4]$/.test(key)){ const i=+key[1]-1; tog(key,()=>ch.p[i],v=>ch.p[i]=v,'status0,'+(5-i)); say(`refresh: BTFSC STATUS0,${5-i} → ${key.toUpperCase()} assign relay/LED ${ch.p[i]?'on':'off'} (post fader, channel-on dependent)`); }
    else if (key==='m1'||key==='m2'){ const i=+key[1]-1; tog(key,()=>ch.m[i],v=>ch.m[i]=v,'status0,'+(1-i)); }
    else if (key==='chon'){ say('process → chontake: bsf flag2,0 (front panel pb, first priority in chonproc)'); chonproc(ch,'pb',say); }
    if (D.faults && ch.fault.led && key==='chon') say('Service report: “On the R221 module the Ch On led inside the switch is not working” — audio switches, lamp stays dark.');
  });
}
function faderMove(ch, db){
  const wasEot = ch.fader===-Infinity, nowEot = db===-Infinity;
  ch.fader = db;
  if (wasEot===nowEot){ SIM.refresh(); return; }
  if (D.faults && ch.fault.eot){ act(`${ch.type} pos ${ch.pos}: fader ${nowEot?'to the bottom':'up'} — EOT switch wire missing`, say=>say('Service report: “One R201 module has one wire for the EOT switch removed” — portD,1 never goes low, cue and EOT-off do not react.')); return; }
  act(`${ch.type} pos ${ch.pos}: fader ${nowEot?'down to end of travel':'up off the end stop'}`, say=>{
    say(`scan: ${nowEot?'btfss portd,1 → bsf flag0,7 (EOT active)':'portd,1 high → flag0,7 stays clear'}`);
    say(`eot: flag0,7 ≠ flag0,6 (previous) → ${nowEot?'bsf flag0,6 · bsf flag2,3 (fader went down)':'bcf flag0,6'} · bcf status1,1 (turn cue off)`);
    if (ch.cue){ ch.cue=0; say('CUE cancelled. Note: the code clears cue on BOTH edges, so lifting the fader also cancels a cue.'); }
    addEv({k:'eot', a:ch.addr, v:nowEot?1:0});
    const f=modeFlags(ch);
    if (nowEot && f.EOT && ch.chon) chonproc(ch,'eot',say);
    else if (nowEot) say(`chonproc: mode ${ch.mode} ${f.EOT?'(EOT-off) but channel already off':'has no EOT-off (flag2,4 clear) → channel stays '+(ch.chon?'ON':'off')}`);
  });
}
function extIn(ch, i){
  act(`${ch.type} pos ${ch.pos}: control IN${i+1} closure`, say=>{
    const f=modeFlags(ch); const port=['portd,7','portd,6','portd,4','portd,5'][i];
    say(`scan: btfss ${port} → bsf scan2,${i}; exbounce: ex${i+1}bnc counts 16 passes → bsf scan2,${i+4} (take), flag1,${i} waits 128 passes for release`);
    addEv({k:'ext', a:ch.addr, i, d:16*PASS});
    say(`modeproc: mode ${ch.mode} (${ch.fw.toUpperCase()}) → ${f.IO==='AB'?'IN3 = A SEL, IN4 = B SEL':'IN3 = CUE ON, IN4 = CUE OFF'}`);
    if (i===0) chonproc(ch,'on',say);
    else if (i===1) chonproc(ch,'off',say);
    else if (f.IO==='AB'){ ch.sel = i===2?1:0; say(`${i===2?'bsf':'bcf'} status1,3 → input ${i===2?'A':'B'}`); }
    else { ch.cue = i===2?1:0; say(`${i===2?'bsf':'bcf'} status1,1 → cue ${i===2?'on':'off'}`); }
  });
}
/* RS485 command to an input module: address byte (bit 7 = 1) + command byte; low nibble indexes the uartproc jump table */
const CMD = ['abu','monou','p1u','p2u','p3u','p4u','m1u','m2u','cueu','chonu','spr0u','spr1u','spr2u','spr2u','spr2u'];
function stat(ch, which){ const s0 = 0x40 | (ch.m[0]<<4)|(ch.p[3]<<3)|(ch.p[2]<<2)|(ch.p[1]<<1)|ch.p[0];
  const s1 = 0x60 | (ch.m[1]<<4)|(ch.mono<<3)|(ch.sel<<2)|(ch.cue<<1)|ch.chon; return which? s1 : s0; }
function busCmd(addr, idx, take, val, say, t){
  const ch=byAddr(addr); const a=0x80|addr, c=(take?0x20:0)|(val?0x10:0)|idx;
  say(`U2 → SPI → U3 (s206 “rs485 bus master”): spirx gets 0x${a.toString(16).toUpperCase()} (address, bit 7) then 0x${c.toString(16).toUpperCase().padStart(2,'0')} (command); txuart drives the 75176 and sends both at 9600 Bd`);
  addEv({k:'485', t, bytes:[a,c], d:2*BYTE});
  if (!ch){ say(`no module answers address ${addr}: U3 times out (uart3/uart4 counters) and drops the frame`); return; }
  say(`${ch.type} pos ${ch.pos}: scanu: address byte bit 7 set → bcf uart1,7 · subwf address → match → bsf uart2,0; next byte → uart0 with bsf uart0,7`);
  say(`uartproc: andlw 0x0F → ${idx} → addwf pcl → goto ${CMD[idx]} · bit 5 (${take?'take':'query only'}) · bit 4 (${val?'on':'off'})`);
  if (take){
    if (idx===9){ chonproc(ch, val?'on':'off', say); }
    else if (idx===0) ch.sel=val?1:0; else if (idx===1) ch.mono=val; else if (idx>=2&&idx<=5) ch.p[idx-2]=val; else if (idx===6||idx===7) ch.m[idx-6]=val; else if (idx===8) ch.cue=val;
  }
  const which = (idx===0||idx===1||idx>=7)?1:0; const s=stat(ch,which);
  say(`restat: tx0 = address|0x80 = 0x${(0x80|addr).toString(16).toUpperCase()}, tx1 = stat${which} = 0x${s.toString(16).toUpperCase()} (${which?'0,1,1,m2,mono,a/b,cue,chon':'0,1,0,m1,p4,p3,p2,p1'}); txuart: bsf porta,4 (75176 DE) → 2 bytes → bcf porta,4`);
  addEv({k:'485r', t:(t||SIM.t)+2*BYTE+PASS*2, bytes:[0x80|addr,s], d:2*BYTE});
}
/* R206 timer (U16, r206v105.asm) */
function timerNow(t){ const T=D.tmr; let v=T.base; if (T.run){ const el=Math.floor(Math.max(0,t-T.t0)); v = T.down? Math.max(0,T.base-el) : T.base+el; } return v; }
function timerReset(say){ const T=D.tmr; const was=T.run;
  T.base = T.down? T.preset : 0; T.run = true; T.t0 = SIM.t; addEv({k:'treset'});
  say(`R206 U16 chck_rst: PORTA,tmr_rst low for 7 passes (rst_cnt) → rst_loop: reset_count${T.down?' + set_pre (DOWN active: reload preset)':''} → strt_flag → timer_set: TMR_GO (v1.02: “TIMER must reset and GO”)${was?'':' — was stopped, now running'}`); }
function timerKey(k){
  const T=D.tmr, r6=slotOf('R206');
  if (D.faults && !T['_'+k]){ T['_'+k]=1; return act(`R206 ${k.toUpperCase()} — no response`, say=>say('Service report: “On the R206 module the timer controls buttons (all four) are intermittent”. Press again.')); }
  T['_'+k]=0;
  act(`R206 timer ${k.toUpperCase()}`, say=>{
    say(`U16 input: movf PORTB,w · iorlw 0xF0 → input_reg; debounce: bcount_num = 7 proofs (key_st_proceed)`);
    const v=timerNow(SIM.t);
    if (k==='load'){ if (T.run){ say('LOAD ignored: “The LOAD button can only be activated if the timer is stopped” (display_led checks strt_led)'); return; }
      T.load=!T.load; say(T.load?'load_on: STOP/START/DOWN become SEC / MIN / HR preset keys; display flashes (flush_TIMER every 16 interrupts = 100 ms)':'load_off: preset stored (update_pre → pre_hour/pre_min/pre_sec)'); if(!T.load){ T.preset=T.base; } return; }
    if (T.load){ const add={stop:1,start:60,down:3600}[k]; T.base=(T.base+add)%(100*3600); say(`${k==='stop'?'inc_sec':k==='start'?'inc_min':'inc_hour'} → preset ${fmtHMS(T.base)} (v1.04 auto-increment while held)`); return; }
    if (k==='start'){ if (r6.variant==='R206A' && T.run){ T.base=v; T.run=false; say('R206A START/STOP: second press stops the count'); }
      else { T.base=v; T.run=true; T.t0=SIM.t; say(`timer_set: bsf strt_flag → LEE_int_on: PR2=0x1F, T2CON=0x77 → 160 interrupts/s; int_num 0xA0 = 160 → 1 s → tmr_cntrl ${T.down?'dec_rout':'inc_rout'}`); } addEv({k:'tkey'}); }
    if (k==='stop'){ if (T.run){ T.base=v; T.run=false; say('timer_off: bcf TMR_GO; STOP/RESET LED lit'); } else { T.base=T.down?T.preset:0; say(`STOP/RESET while stopped → reset_count → ${fmtHMS(T.base)}`); } addEv({k:'tkey'}); }
    if (k==='down'){ if (T.run){ say('DOWN ignored while running (“can only be activated while the timer is stopped”)'); return; } T.down=!T.down; say(`down_led ${T.down?'on: next START counts down from '+fmtHMS(T.base):'off: counts up'}`); }
  });
}
const fmtHMS = s=>{ s=Math.max(0,Math.round(s)); const h=Math.floor(s/3600), m=Math.floor(s/60)%60, x=s%60; return `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`; };

/* R257 turret keys → R206 U2 “pole” → U3 RS485 */
function turretKey(i, k){
  const tu=D.tur[i]; const name=`R257 turret, studio ${i+1}`;
  if (!tu.present) return;
  if (k==='setup'){ tu.setup=!tu.setup; return act(`${name}: SETUP switch ${tu.setup?'out':'in'}`, say=>say(tu.setup?'setup0,0 set: CH ON / CH OFF step the input-channel address (chpole0), saved to EEPROM (eew); LEDs show the address bits':'run mode: polling resumes, tmout counters re-armed')); }
  if (tu.setup && (k==='on'||k==='off')){ const ins=inputs(); const idx=ins.findIndex(c=>c.pos===tu.ch); const nx=ins[(idx+(k==='on'?1:ins.length-1))%ins.length]; tu.ch=nx.pos;
    return act(`${name}: setup → channel position ${tu.ch} (address ${nx.addr})`, say=>say(`chpole0 = ${nx.addr} (5-bit motherboard address of position ${tu.ch}); spole0 stays 30 (“studio address, always 30”, the R204)`)); }
  const tnext = nextPoll(i, SIM.t);
  act(`${name}: ${k==='on'?'CH ON':k==='off'?'CH OFF':'TALKBACK'}`, say=>{
    say(`r257-1v3: scan → debounce → process sets chpole1 command; reply waits for R206's next poll of studio ${i+1} at ${SIM.fmtT(tnext)}`);
    say(`R206 U2 pole: ${i?'bsf pole20,6 (studio 2)':'bcf pole10,6 (studio 1)'} → txuart sends 2 bytes on RS422 → scanu: address byte (bit 7) then command → spitx to U3`);
    const ch=D.slots.find(s=>s.pos===tu.ch);
    if (k==='tb'){ tu.tb=tu.tb?0:1; const r4=slotOf('R204'); r4['tb'+(i+1)]=tu.tb; say(`R204 studio ${i+1} talkback ${tu.tb?'on':'off'} (address 30): right monitor −20 dB, T/B audio inserted at full level`); busCmd(30, 0, 1, tu.tb, say, tnext+2*BYTE+TURN+2*BYTE); return; }
    if (!ch || !ch.addr && ch.addr!==0){ say('no input module at that position'); return; }
    busCmd(ch.addr, 9, 1, k==='on'?1:0, say, tnext+2*BYTE+TURN+2*BYTE);
  });
}
/* the RS422 polling schedule within the simulated second */
function pollSched(){
  const out=[]; let t=0.0007, i=0;
  while (t<1){ const tu=D.tur[i]; const tx0=t, tx1=t+2*BYTE;
    if (tu.present){ const rx0=tx1+TURN, rx1=rx0+2*BYTE; out.push({i,tx0,tx1,rx0,rx1,ok:true}); t=rx1+R206PASS*12; }
    else { const to=tx1+256*R206PASS; out.push({i,tx0,tx1,rx0:tx1,rx1:to,ok:false}); t=to+R206PASS*12; }
    i^=1; }
  return out; }
function nextPoll(i, t){ const s=pollSched().find(p=>p.i===i && p.tx0>=t); return s? s.tx0 : t; }

/* ---------------- drawing: one module panel ---------------- */
function lampOn(s, key){
  if (s.type==='R201'||s.type==='R221'||s.type==='R207'){
    if (key==='a') return s.sel===1; if (key==='b') return s.sel===0; if (key==='mono') return s.mono; if (key==='cue') return s.cue;
    if (/^p[1-4]$/.test(key)) return s.p[+key[1]-1]; if (key==='m1') return s.m[0]; if (key==='m2') return s.m[1];
    if (key==='chon'||key==='onled') return s.chon && !(D.faults && s.fault.led); }
  if (s.type==='R203'){ const mo=monitor(SIM.t); if (key.startsWith('met')) return +key.slice(3)===s.met; if (key.startsWith('mon')) return +key.slice(3)===mo.sel; if (key==='muteled') return mo.muted; if (key==='dimled') return s.dim&&mo.cueOn; }
  if (s.type==='R204'){ if (key.startsWith('s1')&&key.length===3) return +key[2]===s.s1; if (key.startsWith('s2')&&key.length===3) return +key[2]===s.s2; if (key==='tb1') return s.tb1; if (key==='tb2') return s.tb2; }
  if (s.type==='R205'){ if (key.startsWith('o1')) return +key[2]===s.o1; if (key.startsWith('o2')) return +key[2]===s.o2; }
  if (s.type==='R206'){ const T=D.tmr, mu=mutes(); if (key==='start') return T.run; if (key==='stop') return !T.run; if (key==='down') return T.down; if (key==='load') return T.load && (Math.floor(SIM.t*5)%2===0); if (key==='autoled') return inputs().some(c=>c.cue); if (key==='muteled') return mu.A||mu.B||mu.C; }
  if (s.type==='R209'){ const m=key.match(/^cm([12])(\d)$/); if (m) return s.cm[+m[2]][+m[1]-1]; }
  return false; }
function modSVG(s, idx, ox, oy, k, big){
  const lay = LAY[s.type]||[]; const art=ART[s.type];
  const sel = D.sel===idx;
  let g = `<g data-slot="${idx}"><rect x="${ox}" y="${oy}" width="${PW*k}" height="${PH*k}" fill="#17181b" stroke="${sel?'var(--accent)':'#000'}" stroke-width="${sel?2:0.6}"/>`;
  if (art) g += `<image href="${ASSET+art}.svg" x="${ox}" y="${oy}" width="${PW*k}" height="${PH*k}" preserveAspectRatio="none"/>`;
  else if (s.type==='BLANK') g += `<text x="${ox+PW*k/2}" y="${oy+PH*k/2}" fill="#555" font-size="${k*0.16}" text-anchor="middle" transform="rotate(-90 ${ox+PW*k/2} ${oy+PH*k/2})">BLANK PANEL</text>`;
  const fs = k*0.105;
  g += `<text x="${ox+PW*k/2}" y="${oy+0.62*k}" fill="#eee" font-size="${k*0.13}" font-weight="700" text-anchor="middle">${s.type==='BLANK'?'':s.type}</text>`;
  const t=SIM.t;
  for (const [key,kind,[x,y],lab,col] of lay){
    const X=ox+x*k, Y=oy+y*k, on=lampOn(s,key), da=`data-k="${key}" style="cursor:pointer"`;
    if (kind==='btn'){ const w=0.34*k, h=0.27*k, c=LAMP[col]||'#ddd';
      g+=`<g ${da}><rect x="${X-w/2}" y="${Y-h/2}" width="${w}" height="${h}" rx="${k*0.03}" fill="${on?c:'#2b2c30'}" stroke="${on?'#fff8':c}" stroke-width="${big?1.2:0.6}" opacity="${on?1:0.9}"/>`;
      if (k>=30) g+=`<text x="${X}" y="${Y+fs*0.36}" font-size="${lab.length>4?fs*0.72:fs}" text-anchor="middle" fill="${on?'#111':'#ddd'}" font-weight="600">${lab}</text>`;
      g+=`</g>`; }
    else if (kind==='on'){ const w=0.62*k, h=0.46*k; g+=`<g ${da}><rect x="${X-w/2}" y="${Y-h/2}" width="${w}" height="${h}" rx="${k*0.05}" fill="${on?'#ff3b30':'#4a1412'}" stroke="#000"/>${k>=30?`<text x="${X}" y="${Y+fs*0.4}" font-size="${fs*1.15}" text-anchor="middle" fill="#fff" font-weight="700">ON</text>`:''}</g>`; }
    else if (kind==='led'){ g+=`<circle cx="${X}" cy="${Y}" r="${0.05*k}" fill="${on?(key==='muteled'?'#ff3b30':'#3ddc63'):'#333'}" stroke="#000" stroke-width="0.4"/>${k>=30&&lab?`<text x="${X+0.1*k}" y="${Y+fs*0.35}" font-size="${fs*0.8}" fill="#ccc">${lab}</text>`:''}`; }
    else if (kind==='trim'){ g+=`<g ${da}><circle cx="${X}" cy="${Y}" r="${0.07*k}" fill="#888" stroke="#222"/><line x1="${X-0.06*k}" y1="${Y}" x2="${X+0.06*k}" y2="${Y}" stroke="#222" stroke-width="${k*0.015}" transform="rotate(${(s[key]||0)*12} ${X} ${Y})"/>${k>=30?`<text x="${X+0.11*k}" y="${Y+fs*0.35}" font-size="${fs*0.8}" fill="#ccc">${lab}</text>`:''}</g>`; }
    else if (kind==='pot'||kind==='enc'){ const v = kind==='enc'? (s.level/255) : ((s[key==='cuelvl'?'cue':key==='hplvl'?'hp':key]||0)+30)/42; const a=-135+270*Math.max(0,Math.min(1,v)); const r=(kind==='enc'?0.26:0.17)*k;
      g+=`<g ${da}><circle cx="${X}" cy="${Y}" r="${r}" fill="#26272b" stroke="#999" stroke-width="${k*0.012}"/><line x1="${X}" y1="${Y}" x2="${X}" y2="${Y-r*0.85}" stroke="#eee" stroke-width="${k*0.025}" transform="rotate(${a} ${X} ${Y})"/>${k>=30&&lab?`<text x="${X}" y="${Y+r+fs*1.05}" font-size="${fs*0.8}" fill="#ccc" text-anchor="middle">${lab}</text>`:''}</g>`; }
    else if (kind==='jack'){ g+=`<circle cx="${X}" cy="${Y}" r="${0.12*k}" fill="#000" stroke="#aaa"/>`; }
    else if (kind==='bar'){ const b=buses(t); const lv=[0,1].map(c=>meterAt(tt=>buses(tt).P[0][c]-REF,t));
      for (let c=0;c<2;c++) for (let r=0;r<10;r++){ const th=6-r*4; const lit=lv[c]>=th; const col=r<2?'#ff3b30':r<4?'#ffe14a':'#3ddc63';
        g+=`<rect x="${X+(c?0.04:-0.16)*k}" y="${Y+r*0.16*k}" width="${0.12*k}" height="${0.1*k}" fill="${lit?col:'#222'}"/>`; } }
    else if (kind==='fader'){ const fyv=fy(s.fader); const fx=ox+FADER.x*k;
      g+=`<rect data-fader="1" x="${fx-0.2*k}" y="${oy+(FADER.top-0.2)*k}" width="${0.4*k}" height="${(FADER.bot-FADER.top+0.4)*k}" fill="transparent" style="cursor:ns-resize"/>`;
      g+=`<line x1="${fx}" y1="${oy+FADER.top*k}" x2="${fx}" y2="${oy+FADER.bot*k}" stroke="#000" stroke-width="${0.06*k}" pointer-events="none"/>`;
      g+=`<rect x="${fx-0.22*k}" y="${oy+fyv*k-0.16*k}" width="${0.44*k}" height="${0.32*k}" rx="${0.04*k}" fill="#c9c9c9" stroke="#111" pointer-events="none"/><line x1="${fx-0.22*k}" y1="${oy+fyv*k}" x2="${fx+0.22*k}" y2="${oy+fyv*k}" stroke="#111" stroke-width="${0.03*k}" pointer-events="none"/>`;
      if (k>=30) g+=`<text x="${fx+0.3*k}" y="${oy+FADER.mark*k+fs*0.3}" font-size="${fs*0.8}" fill="#ccc">0</text><text x="${fx+0.3*k}" y="${oy+FADER.top*k+fs*0.3}" font-size="${fs*0.8}" fill="#ccc">+12</text>`; }
  }
  if (s.type==='R209' && k>=30) for (let i=0;i<6;i++) g+=`<text x="${ox+0.2*k}" y="${oy+(1.5+i*1.62)*k}" font-size="${fs*0.8}" fill="#ccc">${i+1}</text>`;
  if (s.addr!=null && k>=30) g+=`<text x="${ox+PW*k/2}" y="${oy+(PH-0.1)*k}" font-size="${fs*0.75}" fill="#888" text-anchor="middle">pos ${s.pos} · addr ${s.addr}</text>`;
  else g+=`<text x="${ox+PW*k/2}" y="${oy+(PH-0.12)*k}" font-size="${Math.max(6,fs*0.75)}" fill="#888" text-anchor="middle">${s.pos}</text>`;
  return g+'</g>';
}
/* the meter bridge (r2k20silkMeterBridgeCurveREV3.cdr: 24.39 × 2.29 in, four LED meters) + R254 timer and clock */
const MB_W=24.39, MB_H=2.29;
function bridgeSVG(ox, oy, k){
  const t=SIM.t, b=buses(t), mo=monitor(t);
  let g=`<rect x="${ox}" y="${oy}" width="${MB_W*k}" height="${MB_H*k}" fill="#141518"/><image href="${ASSET}meterbridge.svg" x="${ox}" y="${oy}" width="${MB_W*k}" height="${MB_H*k}" preserveAspectRatio="none"/>`;
  const srcs=[tt=>buses(tt).P[0], tt=>buses(tt).P[1], tt=>buses(tt).P[2], tt=>monitor(tt).meter];
  for (let mI=0;mI<4;mI++){ const x0=ox+(mI*452.7+73)/75*k, dx=15/75*k;
    for (let c=0;c<2;c++){ const v=meterAt(tt=>srcs[mI](tt)[c]-REF, t); const y=oy+((c?97:75)/75)*k - 0.17*k;
      MARKS.forEach((mk,j)=>{ const lit=v>=mk; const col=mk>=14?'#ff3b30':mk>=0?'#ffe14a':'#3ddc63'; g+=`<rect x="${x0+j*dx-0.05*k}" y="${y}" width="${0.1*k}" height="${0.07*k}" fill="${lit?col:'#262626'}"/>`; }); } }
  return g; }
function displaysSVG(ox, oy, k){
  const tv=timerNow(SIM.t), T=D.tmr; const clk=D.clock+Math.floor(SIM.t);
  const blank = T.load && Math.floor(SIM.t*5)%2;
  return `<rect x="${ox}" y="${oy}" width="${5.2*k}" height="${MB_H*k}" fill="#141518" stroke="#000"/>
   <text x="${ox+0.2*k}" y="${oy+0.35*k}" fill="#bbb" font-size="${0.22*k}">CLOCK</text>${SIM.dotMatrix(fmtHMS(clk%86400).padStart(8,' '), ox+0.2*k, oy+0.5*k, 0.075*k, '#ff4130', '#2a1210')}
   <text x="${ox+0.2*k}" y="${oy+1.35*k}" fill="#bbb" font-size="${0.22*k}">TIMER (R254)</text>${SIM.dotMatrix(blank?'        ':((T.down?'-':' ')+fmtHMS(tv)).padStart(8,' '), ox+0.2*k, oy+1.5*k, 0.075*k, '#3ddc63', '#0f2414')}`; }
function consoleSVG(k){
  const n=D.slots.length, W=Math.max(n*PW*k, MB_W*k+5.4*k), top=MB_H*k+8;
  let s=`<svg viewBox="0 0 ${W+2} ${top+PH*k+2}" style="width:100%;background:#0c0d0f;border-radius:6px;touch-action:none" id="cons">`;
  const bx = Math.max(0,(D.slots.length-4)*PW*k/2 - MB_W*k/2);
  s+=bridgeSVG(bx,2,k/1.0)+displaysSVG(W-5.2*k-2,2,k);
  D.slots.forEach((sl,i)=>{ s+=modSVG(sl,i,1+i*PW*k,top,k,false); });
  return s+'</svg>'; }
function detailSVG(k){ const s=D.slots[D.sel]; return `<svg viewBox="0 0 ${PW*k+4} ${PH*k+4}" style="width:${PW*k+4}px;max-width:100%;background:#0c0d0f;border-radius:6px;touch-action:none" id="det">${modSVG(s,D.sel,2,2,k,true)}</svg>`; }

/* turret top, to scale from R257M8 ISS 1 (8.600 wide body; G = .950 square-cap key holes, H = pots, B = jack) */
function turretSVG(i){ const tu=D.tur[i], k=46; const W=8.6*k, H=3.0*k;
  const key=(x,y,lab,id,on)=>`<g data-tk="${i}:${id}" style="cursor:pointer"><rect x="${x*k-0.33*k}" y="${y*k-0.33*k}" width="${0.66*k}" height="${0.66*k}" rx="4" fill="${on?'#ff3b30':'#3a3b40'}" stroke="#999"/><text x="${x*k}" y="${y*k+4}" font-size="10" text-anchor="middle" fill="#fff">${lab}</text></g>`;
  const ch=D.slots.find(s=>s.pos===tu.ch); const on = tu.present && ch && ch.chon;
  return `<svg viewBox="0 0 ${W} ${H+18}" style="width:100%;max-width:420px;background:#1a1b1e;border-radius:6px">
    <rect x="1" y="1" width="${W-2}" height="${H-2}" fill="${tu.present?'#202125':'#2a2020'}" stroke="#666"/>
    ${key(5.05,1.85,'ON','on',on)}${key(6.55,0.72,'OFF','off',tu.present&&ch&&!ch.chon)}${key(6.55,1.85,'T/B','tb',tu.tb)}
    <circle cx="${1.814*k}" cy="${1.28*k}" r="${0.2*k}" fill="#26272b" stroke="#999"/><text x="${1.814*k}" y="${1.28*k+0.42*k}" font-size="9" fill="#ccc" text-anchor="middle">MONITOR</text>
    <circle cx="${3.55*k}" cy="${1.28*k}" r="${0.2*k}" fill="#26272b" stroke="#999"/><text x="${3.55*k}" y="${1.28*k+0.42*k}" font-size="9" fill="#ccc" text-anchor="middle">HEADSET</text>
    <g data-tk="${i}:setup" style="cursor:pointer"><rect x="${0.5*k}" y="${2.3*k}" width="${0.9*k}" height="${0.35*k}" fill="${tu.setup?'#f0a020':'#333'}" stroke="#999"/><text x="${0.95*k}" y="${2.3*k+12}" font-size="9" text-anchor="middle" fill="#fff">SETUP</text></g>
    <text x="${W/2}" y="${H+13}" font-size="10" fill="var(--ink2)" text-anchor="middle">R257 studio ${i+1} · controls channel pos ${tu.ch}${tu.present?'':' · UNPLUGGED'}</text></svg>`; }

/* ---------------- interaction ---------------- */
function click(idx, key){
  const s=D.slots[idx];
  if (s.type==='R201'||s.type==='R221'||s.type==='R207'){
    if (['a','b','mono','cue','p1','p2','p3','p4','m1','m2','chon'].includes(key)) return r201(s,key);
    if (key==='trimL'||key==='trimR'){ s[key]=s[key]>=6?-6:s[key]+2; return act(`${s.type} pos ${s.pos}: ${key==='trimL'?'left (lower)':'right (upper)'} trim ${s[key]>0?'+':''}${s[key]} dB`, say=>say('Front-panel screwdriver trim, post input select (analog, no firmware)')); }
    if (key==='bal'){ s.bal = s.bal>=4?-4:s.bal+2; return act(`R207 pos ${s.pos}: balance ${s.bal}`, say=>say('“In the R207 module, the BALANCE control follows the FADER in circuit.”')); }
    if (key==='s1'||key==='s2'){ s[key] = s[key]>=10?-30:s[key]+10; return act(`R221 pos ${s.pos}: MONO MIX ${key==='s1'?1:2} send ${s[key]} dB`, say=>say('“Send levels to the MONO MIX 1 and 2 buses may be adjusted via front panel potentiometers on the R221 only.”')); }
  }
  if (s.type==='R203'){
    if (/^met\d$/.test(key)){ s.met=+key.slice(3); return act(`R203: METER → ${SELIN[s.met]}`, say=>{ say('R203v106 scan (74HC165) → debounce → process: meter bank is interlocked (one of 8)'); say('8×2 stereo switcher OUT1 → AUX/SWR LED meter in the meter bridge'); }); }
    if (/^mon\d$/.test(key)){ s.mon=+key.slice(3); return act(`R203: MONITOR → ${SELIN[s.mon]}`, say=>{ say('process: monitor bank interlocked; refresh drives the switcher OUT2 → CR MONITOR VCA'); if (mutes().C) say('mutec: MUTE C active → selector held on MONITOR 1 (v104/v105: returns to the previous choice when mute C releases, unless the panel changed)'); }); }
    if (key==='enc'){ s.level = s.level>=255? 120 : Math.min(255, s.level+15); return act(`R203: volume encoder → LEVEL ${s.level}`, say=>say(`ENCDV102 (PIC16C54): quadrature state table → INCF LEVEL (capped at 255) → clocks LEVEL to the VCA over CS/DATAA/CLK. Gain ≈ ${(-(255-s.level)*0.25).toFixed(1)} dB ${'(step size inferred)'}`)); }
  }
  if (s.type==='R204'){
    let m=key.match(/^s([12])(\d)$/); if (m){ s['s'+m[1]]=+m[2]; return act(`R204: STUDIO ${m[1]} → ${SELIN[+m[2]]}`, say=>say('R204v104 scan → process: bank interlocked → switcher OUT'+m[1])); }
    if (key==='tb1'||key==='tb2'){ s[key]=s[key]?0:1; return act(`R204: ${key.toUpperCase()} ${s[key]?'on':'off'}`, say=>{ say('“When talkback is enabled, the right monitor output is diminished by 20dB and the talkback audio is inserted at full level.”'); if(D.faults) say('Service report: “On the R204 module the T/B 1 and 2 buttons are intermittent”.'); }); }
    if (key==='v1'||key==='v2'){ s[key]=s[key]>=0?-30:s[key]+6; return act(`R204: studio ${key[1]} volume ${s[key]} dB`, say=>say('Front-panel volume pot (analog)')); }
  }
  if (s.type==='R205'){ const m=key.match(/^o([12])(\d)$/); if (m){ s['o'+m[1]]=+m[2]; return act(`R205: OUTPUT ${m[1]} → IN ${+m[2]+1}`, say=>say('8 × 2 stereo line selector; R205C100 custom build exists (customsoft/r205c100.asm)')); } }
  if (s.type==='R206'){
    if (['load','down','start','stop'].includes(key)) return timerKey(key);
    if (key==='cuelvl'||key==='hplvl'){ const f=key==='cuelvl'?'cue':'hp'; s[f]=s[f]>=6?-30:s[f]+6; return act(`R206: ${f==='cue'?'cue speaker':'headphone'} level ${s[f]} dB`, say=>say('Analog level control (drive amplifiers on the R206)')); }
  }
  if (s.type==='R209'){ const m=key.match(/^cm([12])(\d)$/); if (m){ const c=+m[2], j=+m[1]-1; s.cm[c][j]^=1; return act(`R209: send ${c+1} ${m[1]==='1'?'M1':'M2'} ${s.cm[c][j]?'on':'off'}`, say=>say('“Front panel pushbuttons allow assignment of Mono Mix 1, Mono Mix 2 or both to any of the six send outputs.”')); } }
}
function bindPanel(root){
  root.querySelectorAll('[data-slot]').forEach(g=>{
    const idx=+g.dataset.slot;
    g.addEventListener('click', e=>{ const kEl=e.target.closest('[data-k]'); if (D.sel!==idx){ D.sel=idx; if(!kEl){ SIM.refresh(); return; } } if (kEl) click(idx, kEl.dataset.k); });
    const fr=g.querySelector('[data-fader]'); if (fr){ const svg=g.ownerSVGElement;
      const move=e=>{ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(svg.getScreenCTM().inverse()); const r=fr.getBBox(); const k=(r.height)/(FADER.bot-FADER.top+0.4); const oy=r.y-(FADER.top-0.2)*k; const yin=(p.y-oy)/k; D.sel=idx; faderMove(D.slots[idx], Math.round(fdb(yin)*2)/2); };
      fr.addEventListener('pointerdown', e=>{ e.preventDefault(); e.stopPropagation(); fr.setPointerCapture(e.pointerId); move(e); const mv=ev=>move(ev); const up=()=>{ fr.removeEventListener('pointermove',mv); fr.removeEventListener('pointerup',up); }; fr.addEventListener('pointermove',mv); fr.addEventListener('pointerup',up); }); }
  });
  root.querySelectorAll('[data-tk]').forEach(g=>g.addEventListener('click',()=>{ const [i,k]=g.dataset.tk.split(':'); turretKey(+i,k); }));
}

/* ---------------- side controls (the things behind the panel) ---------------- */
function inspHTML(){
  const s=D.slots[D.sel];
  if (s.type==='R201'||s.type==='R221'||s.type==='R207'){ const f=modeFlags(s);
    return `<table class="kv small"><tr><th>Module</th><td>${s.type} · position ${s.pos} · RS485 address ${s.addr} (motherboard A0–A4)</td></tr>
     <tr><th>Firmware</th><td><select id="fw">${Object.keys(FW).filter(k=>s.type==='R221'?k==='v302':k!=='v302').map(k=>`<option value="${k}" ${k===s.fw?'selected':''}>${FW[k].name}</option>`).join('')}</select></td></tr>
     <tr><th>Mode (${s.type==='R221'?'DIP SW2 1–3':'mode jumpers 0–2'})</th><td><select id="mode">${[0,1,2,3,4,5,6,7].map(i=>`<option ${i===s.mode?'selected':''}>${i}</option>`).join('')}</select> <span class="mono small">${f.AO?'always-on ':''}${f.PL?'OUT1-pulse ':''}${f.EOT?'EOT-off ':''}· IN3/4 = ${f.IO==='AB'?'A/B select':'cue on/off'}</span></td></tr>
     <tr><th>Mute jumper</th><td>${['','A','B','C'].map(m=>`<button data-mj="${m}" class="${s.muteJ===m?'on':''}">${m||'none'}</button>`).join(' ')} · timer reset <button id="tj" class="${s.tmrJ?'on':''}">${s.tmrJ?'on':'off'}</button></td></tr>
     <tr><th>Control inputs</th><td>${[0,1,2,3].map(i=>`<button data-ex="${i}">IN${i+1}</button>`).join(' ')}</td></tr>
     <tr><th>Control outputs</th><td class="mono">${outs(s).map((o,i)=>`OUT${i+1} ${o?'■':'□'}`).join(' · ')}</td></tr>
     <tr><th>Sources</th><td>A = ${esc(s.srcA)} · B = ${esc(s.srcB)} · nominal ${s.lvl>0?'+':''}${s.lvl} dBu ${inf('program envelope')}</td></tr>
     <tr><th>Fader</th><td class="mono">${s.fader===-Infinity?'end of travel (EOT switch closed)':(s.fader>0?'+':'')+s.fader.toFixed(1)+' dB'} <button id="f0">to 0 (12 dB in hand)</button> <button id="fd">down</button></td></tr>
     <tr><th>Registers</th><td class="mono">status0 ${bits(st0(s),6)} · status1 ${bits(((s.sel<<3)|(s.mono<<2)|(s.cue<<1)|s.chon),4)} · mode ${s.mode} · address ${s.addr}</td></tr></table>`; }
  if (s.type==='R203'){ const mo=monitor(SIM.t); return `<table class="kv small"><tr><th>R203</th><td>address 29 · meter ${SELIN[s.met]} · monitor ${SELIN[mo.sel]}${mo.sel!==s.mon?' (forced by MUTE C)':''} · LEVEL ${s.level}</td></tr><tr><th>Jumpers</th><td><button id="mA" class="${s.muteA?'on':''}">mute A</button> <button id="mB" class="${s.muteB?'on':''}">mute B</button> <button id="dm" class="${s.dim?'on':''}">dim on auto cue</button></td></tr><tr><th>CR monitor</th><td class="mono">${mo.muted?'MUTED':mo.lvl.map(x=>x===-Infinity?'—':x.toFixed(1)+' dBu').join(' / ')}</td></tr></table>`; }
  if (s.type==='R206'){ return `<table class="kv small"><tr><th>R206</th><td>three PICs: U2 16F74 (scan, turret polling, SPI master) · U3 16C63 (“rs485 bus master”) · U16 16F73 (timer/clock)</td></tr><tr><th>Variant</th><td>${['R206','R206A'].map(v=>`<button data-var="${v}" class="${s.variant===v?'on':''}">${v}</button>`).join(' ')}</td></tr><tr><th>Timer</th><td class="mono">${fmtHMS(timerNow(SIM.t))} ${D.tmr.run?'running':'stopped'}${D.tmr.down?' · DOWN':''}${D.tmr.load?' · LOAD':''} · preset ${fmtHMS(D.tmr.preset)}</td></tr></table>`; }
  return `<table class="kv small"><tr><th>${s.type}</th><td>${({R202:'Summing and output amplifiers for PGM 1–4 and MONO 1–2. “must be installed in slot 13 of the R2K/12, slot 21 of the R2K/20 or slot 29 of the R2K/28”. PGM 1 has three splits, the others two.',R204:'Studio monitor: two 8×2 banks, volume and T/B per studio. Address 30.',R205:'8 × 2 stereo line selector; only the four left slots carry its full connector set.',R208:'Four stereo 3-band EQs (±15 dB), wired into an input insert by motherboard jumpers.',R209:'Clean feed: mix-minus sends to six hybrids, M1/M2 per send.',BLANK:'Blank panel.'})[s.type]||''}</td></tr></table>`; }
const bits=(v,n)=>v.toString(2).padStart(n,'0');
const st0=ch=>(ch.p[0]<<5)|(ch.p[1]<<4)|(ch.p[2]<<3)|(ch.p[3]<<2)|(ch.m[0]<<1)|ch.m[1];   // status0: x,x,p1,p2,p3,p4,m1,m2
function outs(s){ const f=modeFlags(s), now=SIM.t; const pulse = D.ev.some(e=>e.k==='out1'&&e.a===s.addr&&now>=e.t&&now<e.t+e.d);
  const o1 = f.PL? pulse : !!s.chon; const o2=!s.chon; const o3 = f.IO==='AB'? s.sel===1 : !!s.cue, o4 = f.IO==='AB'? s.sel===0 : !s.cue; return [o1,o2,o3,o4]; }
function bindInsp(root){
  const s=D.slots[D.sel]; const q=x=>root.querySelector(x);
  if (q('#fw')) q('#fw').onchange=e=>{ s.fw=e.target.value; act(`pos ${s.pos}: firmware ${FW[s.fw].name}`, say=>say('OTP 16C65A parts need a new chip; 16F74/16F874 reflash over ICSP')); };
  if (q('#mode')) q('#mode').onchange=e=>{ s.mode=+e.target.value; act(`pos ${s.pos}: mode ${s.mode}`, say=>{ say('scan: mode bits shift in from the mother-board chain on portD,0 with clk1 (order a1,a3,mode0,mode2,mode1,a4,a2,a0,choff)'); say('modeproc: btfsc mode,2 / mode,1 / mode,0 → goto mode'+s.mode); }); };
  root.querySelectorAll('[data-mj]').forEach(b=>b.onclick=()=>{ s.muteJ=b.dataset.mj; SIM.refresh(); });
  if (q('#tj')) q('#tj').onclick=()=>{ s.tmrJ=!s.tmrJ; SIM.refresh(); };
  root.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>extIn(s,+b.dataset.ex));
  if (q('#f0')) q('#f0').onclick=()=>faderMove(s,0); if (q('#fd')) q('#fd').onclick=()=>faderMove(s,-Infinity);
  if (q('#mA')) q('#mA').onclick=()=>{ s.muteA=!s.muteA; SIM.refresh(); }; if (q('#mB')) q('#mB').onclick=()=>{ s.muteB=!s.muteB; SIM.refresh(); }; if (q('#dm')) q('#dm').onclick=()=>{ s.dim=!s.dim; SIM.refresh(); };
  root.querySelectorAll('[data-var]').forEach(b=>b.onclick=()=>{ s.variant=b.dataset.var; act(`utility module → ${s.variant}`, say=>say(s.variant==='R206A'?'R206A: START/STOP on one key, four system-settings RECALL keys instead of the LED level meter':'R206: separate START and STOP/RESET, stereo 10-segment LED level indicator')); });
}
function logHTML(){ return D.log.map(l=>`<div><b>${SIM.fmtT(l.t)}</b> ${esc(l.label)}${l.tr.map(x=>`<div class="muted" style="padding-left:12px;border:0">› ${esc(x)}</div>`).join('')}</div>`).join('')||'<div class="muted">Click a button, the fader, a turret key or the timer.</div>'; }
function topBar(){ return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px">
  <select id="preset">${Object.keys(PRESETS).map(k=>`<option value="${k}" ${k===D.preset?'selected':''}>${PRESETS[k].label}</option>`).join('')}</select>
  <button id="flt" class="${D.faults?'on':''}">Faults from the service report: ${D.faults?'ON':'off'}</button>
  <button id="t2">Turret 2: ${D.tur[1].present?'plugged in':'unplugged'}</button><button id="rst">Reset</button></div>`; }
function bindTop(root){ const q=x=>root.querySelector(x);
  q('#preset').onchange=e=>{ reset(e.target.value); SIM.refresh(); };
  q('#flt').onclick=()=>{ D.faults=!D.faults; const ins=inputs(); if (ins[3]) ins[3].fault.p24=true; if (ins[6]) ins[6].fault.eot=true; const r221=ins.find(c=>c.type==='R221'); if (r221) r221.fault.led=true; act(`Service-report faults ${D.faults?'applied':'cleared'}`, say=>say('R2K20 Console Report.doc: noisy faders (8 of 10 R201), P2/P4 dead on one R201, R221 CH ON lamp out, R206 timer keys intermittent, one EOT wire removed.')); };
  q('#t2').onclick=()=>{ D.tur[1].present=!D.tur[1].present; act(`R257 studio 2 turret ${D.tur[1].present?'connected':'unplugged'}`, say=>say(D.tur[1].present?'Poll replies return':'R206 U2 scanu: incfsz tmout for 256 passes → timeout: uart3 = 0xFF, bsf pole12,5 (“no turret, bypass data transfer”), re-init the UART; the turret itself would flash CH ON/CH OFF after its own UART timeout (r257-1v3 V101)')); };
  q('#rst').onclick=()=>{ reset(D.preset); SIM.refresh(); };
}

/* ---------------- views ---------------- */
function viewSim(m){ window[KEY]=false;
  m.innerHTML = card('R2K/20 console — click any module, button, fader or turret key', `<div id="tb"></div><div id="cs"></div><div class="small muted">Panels are the real CorelDRAW silks as vector (${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R201/SILK/R201SILK.CDR','R201SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R201/SILK/R207SILK.CDR','R207SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R202/R202MOD.cdr','R202MOD')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R203/R203SILK.CDR','R203SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R204/R204SILK.CDR','R204SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R205/R205SILK.CDR','R205SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R206/R206SILK.CDR','R206SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R208/R208SILK.CDR','R208SILK')}, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R209/R209SILK.CDR','R209SILK')}; live text is garbled by libcdr, so labels are re-set) with every control placed on the drill crosshairs of the same files; meter bridge = ${SIM.src('#CONSOLES - #OBSOLETE #Archive/r2k20silkMeterBridgeCurveREV3.cdr','r2k20silkMeterBridgeCurveREV3.cdr')}. Lamp colours follow CustomR2K28.jpg ${inf('photo')}. Module order inside the input section ${inf('service report lists quantities only')}.</div>`)
   + `<div class="grid2"><div>${card('Selected module (larger)', `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start"><div id="dt"></div><div style="flex:1;min-width:260px" id="ins"></div></div>`)}</div>
      <div>${card('R257 studio turrets (RS422 to the R206)', `<div id="tu0"></div><div id="tu1" style="margin-top:6px"></div>`)}${card('Firmware trace', `<div class="log" id="lg" style="max-height:420px"></div>`)}</div></div>`;
  const draw=()=>{ const tb=m.querySelector('#tb'); tb.innerHTML=topBar(); bindTop(tb);
    m.querySelector('#cs').innerHTML=consoleSVG(40); bindPanel(m.querySelector('#cs'));
    m.querySelector('#dt').innerHTML=detailSVG(62); bindPanel(m.querySelector('#dt'));
    m.querySelector('#ins').innerHTML=inspHTML(); bindInsp(m.querySelector('#ins'));
    [0,1].forEach(i=>{ const e=m.querySelector('#tu'+i); e.innerHTML=turretSVG(i); bindPanel(e); });
    m.querySelector('#lg').innerHTML=logHTML(); };
  SIM.on('time', draw); }

/* ---------------- one second ---------------- */
function lanes(){
  const ch = D.slots[D.sel].addr!=null && byAddr(D.slots[D.sel].addr) ? D.slots[D.sel] : inputs()[0];
  const ac=SIM.css('--accent'), a2=SIM.css('--accent2'), wr=SIM.css('--warn'), bad=SIM.css('--bad'), ink=SIM.css('--ink');
  const evs=(k,a)=>D.ev.filter(e=>e.k===k && (a==null || e.a===a));
  const bar=(c,X,t0,t1,y,h,list,col,lab)=>{ for(const e of list){ if(e.t+e.d<t0||e.t>t1) continue; c.fillStyle=col; c.fillRect(X(e.t),y+5,Math.max(2,X(e.t+e.d)-X(e.t)),h-10); if(X(e.t+e.d)-X(e.t)>50){ c.fillStyle=ink; c.font='10px monospace'; c.fillText(typeof lab==='function'?lab(e):lab, X(e.t)+3, y+h/2+4); } } };
  const curve=(c,X,t0,t1,y,h,fn,col,lo,hi)=>{ c.strokeStyle=col; c.lineWidth=1.4; c.beginPath(); const N=300; for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; let v=fn(t); if(!isFinite(v)) v=lo; v=Math.max(lo,Math.min(hi,v)); const yy=y+h-4-(v-lo)/(hi-lo)*(h-8); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); };
  const polls=pollSched();
  return [
    {label:`${ch.type} pos ${ch.pos}: main-loop passes`, h:24, draw:(c,X,t0,t1,y,h)=>SIM.pulses(c,X,t0,t1,y,h,PASS,0,PASS*0.15,ac,'MAIN passes')},
    {label:'debounce / control-in proofs', h:24, draw:(c,X,t0,t1,y,h)=>{ bar(c,X,t0,t1,y,h,evs('deb',ch.addr),a2,'16 passes'); bar(c,X,t0,t1,y,h,evs('ext',ch.addr),wr,e=>'IN'+(e.i+1)+' 16 passes'); }},
    {label:'status1,0 CHANNEL ON', h:22, draw:(c,X,t0,t1,y,h)=>{ const ev=evs('chon',ch.addr).filter(e=>e.t<=t1); let v = ch.chon; const later=ev.filter(e=>e.t>t0); if (later.length) v = later[0].v?0:1; let t=t0; c.fillStyle=ac; for(const e of later){ if(v) c.fillRect(X(t),y+6,X(e.t)-X(t),h-12); v=e.v; t=e.t; } if(v) c.fillRect(X(t),y+6,X(t1)-X(t),h-12); }},
    {label:'PORTB,5 timer-reset pulse · OUT1', h:24, draw:(c,X,t0,t1,y,h)=>{ bar(c,X,t0,t1,y,h,evs('tmr',ch.addr),bad,e=>'TIMER RESET '+SIM.fmtDur(e.d)); bar(c,X,t0,t1,y,h,evs('out1',ch.addr),wr,'OUT1 pulse'); }},
    {label:'fader EOT (portd,1)', h:20, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,evs('eot',ch.addr).map(e=>({t:e.t,d:0.002,v:e.v})),wr,e=>e.v?'EOT':'off stop')},
    {label:'RS422 turret poll (R206 U2)', h:28, draw:(c,X,t0,t1,y,h)=>{ for(const p of polls){ if(p.rx1<t0||p.tx0>t1) continue; c.fillStyle=p.i?a2:ac; c.fillRect(X(p.tx0),y+4,Math.max(1,X(p.tx1)-X(p.tx0)),h/2-4); c.fillStyle=p.ok?ink:bad; c.globalAlpha=.55; c.fillRect(X(p.rx0),y+h/2,Math.max(1,X(p.rx1)-X(p.rx0)),h/2-4); c.globalAlpha=1;
        if (X(p.rx1)-X(p.tx0)>70){ c.fillStyle=ink; c.font='10px monospace'; c.fillText(`S${p.i+1} ${p.ok?'TX 2 · RX 2':'TX · timeout 256 passes'}`, X(p.tx0)+2, y+h/2+1); } } }},
    {label:'SPI U2→U3, RS485 bus', h:26, draw:(c,X,t0,t1,y,h)=>{ bar(c,X,t0,t1,y,h,evs('485'),bad,e=>'cmd '+e.bytes.map(b=>b.toString(16).toUpperCase().padStart(2,'0')).join(' ')); bar(c,X,t0,t1,y,h,evs('485r'),ac,e=>'reply '+e.bytes.map(b=>b.toString(16).toUpperCase().padStart(2,'0')).join(' ')); }},
    {label:'R206 U16 Timer2 interrupt', h:22, draw:(c,X,t0,t1,y,h)=>SIM.pulses(c,X,t0,t1,y,h,T2INT,0,T2INT*0.04,wr,'TMR2IF (6.25 ms)')},
    {label:'U16 timer/clock serial → R254', h:24, draw:(c,X,t0,t1,y,h)=>{ const L=[]; for(let t=0.02;t<1;t+=0.1) L.push({t,d:8*BYTE,k:'T'}); for(let t=0.07;t<1;t+=0.2) L.push({t,d:11*BYTE,k:'C'}); bar(c,X,t0,t1,y,h,L,a2,e=>e.k==='T'?'TIMER FF FF 02 F0 msg h m s':'CLOCK FF FF 02 49 41 h h m m s s'); }},
    {label:'1-second tick (int_num 160)', h:20, draw:(c,X,t0,t1,y,h)=>SIM.pulses(c,X,t0,t1,y,h,1,0.0,0.004,bad,'1 s')},
    {label:'PGM 1 bus (L) dBu', h:46, draw:(c,X,t0,t1,y,h)=>{ curve(c,X,t0,t1,y,h,t=>buses(t).P[0][0],ac,-30,20); curve(c,X,t0,t1,y,h,t=>meterAt(tt=>buses(tt).P[0][0],t),wr,-30,20); c.fillStyle=ink; c.font='10px monospace'; c.fillText('green = bus · orange = PROGRAM meter (PPM-like) '+'inferred ballistics',X(t0)+4,y+12); }},
    {label:'CR monitor out (L) dBu', h:40, draw:(c,X,t0,t1,y,h)=>curve(c,X,t0,t1,y,h,t=>monitor(t).lvl[0],a2,-40,20)},
  ]; }
function viewSecond(m){ window[KEY]=false;
  m.innerHTML = card('One second in slow motion — what the modules, the buses and the displays see', `<div class="small muted" style="margin-bottom:6px">Channel shown: the selected input module (click one on the Simulator tab). Act on the Simulator tab, then come back and zoom to 50 ms or 5 ms around the playhead.</div><canvas id="tl"></canvas>`)
   + `<div class="grid2">${card('Where the numbers come from', `<table class="kv small">
     <tr><th>Crystal</th><td>4.9152 MHz: every PIC sets SPBRG = 7 with BRGH = 0 for “9600 baud” (F/64/8), and R206 U16's Timer2 (PR2 0x1F, prescale 16, postscale 15) gives exactly 160 interrupts per second, with int_num = 0xA0 = 160 per second. Instruction cycle ${SIM.fmtDur(TCY)}.</td></tr>
     <tr><th>R201 pass</th><td>MAIN runs 15 routines through goto/return labels (scan … init2). About 405 cycles ${inf('instruction count')} → ${SIM.fmtDur(PASS)}. 16-pass debounce ≈ ${SIM.fmtDur(16*PASS)}; tmrpls/out1pls 255 passes ≈ ${SIM.fmtDur(255*PASS)}.</td></tr>
     <tr><th>Serial</th><td>8N1 at 9600 Bd = ${SIM.fmtDur(BYTE)} per byte. RS485 frames are 2 bytes: address (bit 7 = 1) + command; replies are address + stat byte.</td></tr>
     <tr><th>Turret polls</th><td>R206 U2 alternates studio 1 / studio 2 (pole12,7). Missing turret: tmout counts 256 U2 passes ≈ ${SIM.fmtDur(256*R206PASS)} ${inf('U2 pass length')}.</td></tr>
     <tr><th>Displays</th><td>U16 flags flush_TIMER every 16 interrupts (100 ms) and flush_CLOCK every 32 (200 ms); packets FF FF 02 F0 … (timer) and FF FF 02 49 41 … (clock).</td></tr></table>`)}
     ${card('State at the playhead', `<div id="st"></div>`)}</div>`;
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    const t=SIM.t, b=buses(t), mo=monitor(t), f=v=>v===-Infinity?'—':v.toFixed(1);
    m.querySelector('#st').innerHTML=`<table class="kv small"><tr><th>PGM 1–4 (L/R dBu)</th><td class="mono">${b.P.map(p=>f(p[0])+'/'+f(p[1])).join(' · ')}</td></tr><tr><th>MONO 1/2</th><td class="mono">${f(b.M[0])} · ${f(b.M[1])}</td></tr><tr><th>CUE bus</th><td class="mono">${f(b.cue)}</td></tr><tr><th>CR monitor</th><td class="mono">${SELIN[mo.sel]} · gain ${mo.gain.toFixed(1)} dB · ${mo.muted?'MUTED':f(mo.lvl[0])}</td></tr><tr><th>Mute buses</th><td class="mono">${Object.entries(mutes()).map(([k,v])=>k+(v?'■':'□')).join(' ')}</td></tr><tr><th>Timer / clock</th><td class="mono">${fmtHMS(timerNow(t))} · ${fmtHMS((D.clock+Math.floor(t))%86400)}</td></tr></table>`; }); }

/* ---------------- tutorial ---------------- */
let li=0;
const ch2 = ()=>D.slots.find(s=>s.pos===2);
const LESSONS = [
  {title:'1 · Find your way around', body:`<p>This is an R2K/20: twenty input positions, then the R202 output module (position 21), R203 control-room monitor (22), R204 studio monitor (23) and the R206 utility module (24, “the most right hand module slot”). Above sits the meter bridge: PROGRAM, AUDITION, UTILITY and AUX/SWR, plus clock and timer.</p><p>Click the R201 in <b>position 2</b> to select it.</p>`, check:()=>D.slots[D.sel]&&D.slots[D.sel].pos===2, hint:'Click the second module from the left.'},
  {title:'2 · Pick the source', body:`<p>“Source pushbuttons A and B are electronically interlocked and select between stereo inputs A and B.” Press <b>B</b>, then <b>A</b> again. The trace shows one status bit (status1,3) doing both.</p>`, check:()=>D.log.some(l=>/pos 2 .*: B pressed/.test(l.label)) && ch2().sel===1, hint:'Press B, then A, on position 2.'},
  {title:'3 · Assign and set the level', body:`<p>Press <b>P1</b> so the channel feeds PROGRAM 1 (already lit), and press <b>P2</b> to also feed AUDITION. Drag the fader to the bar across the green wedge: the “reference indicating mark at the 12 dB in-hand position”. That is 0 dB here; the top is +12 dB.</p>`, check:()=>ch2().p[0]&&ch2().p[1]&&Math.abs(ch2().fader)<=1.5, hint:'P1 and P2 lit; fader between −1.5 and +1.5 dB (use “to 0” in the side panel if dragging is fiddly).'},
  {title:'4 · Go on air', body:`<p>Press the big red <b>ON</b>. The channel feeds the buses; because this is the announce mic its mute jumper is set to MUTE A, so the control-room monitor mutes. Its timer-reset jumper is on, so the R206 timer resets and runs (“Pressing the channel ON button generates a timer reset and mute control”).</p>`, check:()=>ch2().chon&&D.tmr.run, hint:'Press ON on position 2.'},
  {title:'5 · Cue another channel', body:`<p>Select position 3 and press <b>CUE</b>: “pre FADER, pre CHANNEL ON”. The R206 AUTO lamp lights and the R203 dims −12 dB (encoder code). Now drag that fader all the way <b>down</b>: “The end of travel switch on the fader will turn the CUE off.”</p>`, check:()=>{ const c=D.slots.find(s=>s.pos===3); return c && !c.cue && c.fader===-Infinity && D.log.some(l=>/pos 3.*CUE pressed/.test(l.label)); }, hint:'Position 3: CUE, then fader to the bottom.'},
  {title:'6 · Monitoring and metering', body:`<p>On the R203 press METER <b>PGM 2</b> (the AUX/SWR meter follows it) and MONITOR <b>PGM 1</b>. Turn the volume encoder a few clicks.</p>`, check:()=>{ const r=slotOf('R203'); return r.met===1 && r.mon===0 && r.level!==200; }, hint:'R203 top bank button 2, lower bank button 1, then click the big knob.'},
  {title:'7 · The timer', body:`<p>On the R206 press <b>STOP</b> (stops), then <b>LOAD</b>; now STOP/START/DOWN are SEC/MIN/HR keys: press START twice for 2 minutes, LOAD again to store, then <b>DOWN</b> and <b>START</b> to count down.</p>`, check:()=>D.tmr.run&&D.tmr.down&&D.tmr.preset>=60, hint:'STOP · LOAD · START · START · LOAD · DOWN · START.'},
  {title:'8 · Change the channel mode', body:`<p>Select position 2 and set <b>Mode 4</b> in the side panel (mode jumpers/DIP). Mode 4: the ON button keeps the channel on and makes an event pulse, and “when bringing fader down, the end of travel turns the channel off”. Press ON, then pull the fader down.</p>`, check:()=>ch2().mode===4 && !ch2().chon && D.log.some(l=>/pos 2: fader down/.test(l.label)), hint:'Mode 4, ON, fader to the bottom.'},
  {title:'9 · Control from the studio', body:`<p>The R257 turret in studio 1 is set to channel position 2. Press its <b>ON</b>. The R206 polls the turret on RS422, forwards the command over SPI to its RS485 bus-master PIC, which addresses the R201 (address byte with bit 7 set, then command 0x39 = take, on, chonu).</p>`, check:()=>ch2().chon && D.ev.some(e=>e.k==='485'), hint:'Click ON on the studio 1 turret.'},
  {title:'10 · Unplug a turret', body:`<p>Unplug turret 2 (top bar) and look at the RS422 lane on the One-second tab: its polls now end in a 256-pass timeout, and the R206 keeps serving studio 1.</p>`, check:()=>!D.tur[1].present, hint:'Top bar: “Turret 2: plugged in”.'},
];
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — operating the R2K (from the R2K manual)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('Firmware trace', `<div class="log" id="lg" style="max-height:260px"></div>`)}</div>
    <div>${card('Console', `<div id="tb"></div><div id="cs"></div>`)}${card('Selected module', `<div style="display:flex;gap:10px;flex-wrap:wrap"><div id="dt"></div><div style="flex:1;min-width:220px"><div id="ins"></div><div id="tu0" style="margin-top:8px"></div><div id="tu1" style="margin-top:6px"></div></div></div>`)}</div></div>`;
  const draw=()=>{ const tb=m.querySelector('#tb'); tb.innerHTML=topBar(); bindTop(tb);
    m.querySelector('#cs').innerHTML=consoleSVG(40); bindPanel(m.querySelector('#cs'));
    m.querySelector('#dt').innerHTML=detailSVG(48); bindPanel(m.querySelector('#dt'));
    m.querySelector('#ins').innerHTML=inspHTML(); bindInsp(m.querySelector('#ins'));
    [0,1].forEach(i=>{ const e=m.querySelector('#tu'+i); e.innerHTML=turretSVG(i); bindPanel(e); });
    m.querySelector('#lg').innerHTML=logHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{li=+x.dataset.i;draw();});
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'Hint: '+L.hint}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="so">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#so').onclick=()=>{ reset('report'); li=0; SIM.refresh(); }; };
  SIM.on('time', draw); }

/* ---------------- block diagram ---------------- */
let bsel='r201';
const BLOCKS={
  src:{x:10,y:20,w:120,h:60,t:'Sources A / B',s:['stereo, balanced','screw terminals'],d:'Each input module takes two balanced stereo inputs A and B on the motherboard terminations (R201term.pdf).'},
  r201:{x:160,y:10,w:170,h:90,t:'R201 / R207 / R221 ×20',s:['PIC16C65A → 16F74 / 16F874','fader + EOT, CH ON, 4 ctl in/out'],d:'Input module. Trims, MONO (−6 dB L+R), insert, FADER (+12 top, 0 at the bar), CHANNEL ON, P1–P4 and M1/M2 assigns, CUE pre-fader. Logic: one PIC scanning a 74HC165 chain; firmware r201v101.asm (and customer variants M101/M102/M201/M301/C102/M401), R221 uses the Cool Grey R241 code base (v3.02, PIC16F874).'},
  bus:{x:370,y:10,w:150,h:90,t:'Mix buses (R251/R252)',s:['PGM 1–4 st · MONO 1–2','CUE · MUTE A/B/C · TMR RST','RS485-1/2 pins 41/43'],d:'Motherboards R251 (16 position) and R252-1/-2. Carry audio buses, mute A/B/C, timer reset, auto cue and the internal RS485 pair (edge pins 41 and 43), +20 V 45/53, −20 V 47, AGND 49, DGND 51, CHASSIS 55.'},
  r202:{x:560,y:10,w:140,h:70,t:'R202 output',s:['summing + output amps','PGM1 ×3 splits, others ×2'],d:'Slot 21 on the R2K/20. Balanced, low-impedance outputs for bridging loads; 8200-series DAs can sit in the MF251 ancillary slots for more splits.'},
  mb:{x:740,y:10,w:140,h:70,t:'Meter bridge',s:['PROGRAM AUDITION','UTILITY AUX/SWR'],d:'r2k20silkMeterBridgeCurveREV3.cdr: four stereo LED meters, scale 36 … 0 … 14 PK. AUX is fed from the R203 meter selector.'},
  r203:{x:560,y:110,w:140,h:70,t:'R203 CR monitor',s:['8×2 switcher, VCA','16C73/16F73 + 16C54 encoder'],d:'Address 29. Two banks of 8 (METER, MONITOR). Optical encoder → PIC16C54 (encdv102) → VCA; dims −12 dB on auto cue; muted by mute A/B jumpers; mute C forces MONITOR 1 (v104, May 2004).'},
  r204:{x:560,y:200,w:140,h:70,t:'R204 studio monitor',s:['2 studios × 8, T/B','address 30'],d:'Studio 1 and 2 selectors, volumes, T/B buttons; T/B dims the right monitor −20 dB and inserts talkback audio from the R206.'},
  r206:{x:330,y:180,w:190,h:110,t:'R206 utility (3 PICs)',s:['U2 16F74: scan, turret poll, SPI','U3 16C63: RS485 bus master','U16 16F73: timer, clock'],d:'Rightmost slot. Headset and cue speaker amps, timer controls, LED level meter, RS422 to the turrets and the internal RS485 bus. R206A adds four settings-recall keys; R248 (ATmega128 ICCAVR) replaced the R206A later.'},
  tur:{x:10,y:200,w:140,h:80,t:'R257 turrets',s:['studio 1, studio 2','RS422, polled'],d:'R257-1 turret (PIC16F73, r257-1v3.asm): CH ON, CH OFF, T/B, monitor keys, headset amp; setup mode stores the controlled channel address in EEPROM. Polled by the R206 U2 alternately.'},
  disp:{x:740,y:110,w:140,h:80,t:'R254 timer + clock',s:['serial from U16','FF FF 02 …'],d:'R254 timer display (PIC16C73A, R254V101) and a studio clock display on the U16 serial output. U16 can embed time of day for clocks “that do not have time code available”.'},
  psu:{x:740,y:210,w:140,h:70,t:'M8246 PSU ×1–2',s:['MF250/MF251 frame','±21 V'],d:'See the M8246 and MF250 plugins: diode-OR redundant ±21 V supplies feeding R250SA1 power entry.'},
  stio:{x:170,y:200,w:130,h:80,t:'R250SA2 studio I/O',s:['studio feeds, T/B','turret wiring'],d:'Studio I/O assembly (R2K FUNCTIONAL p.3) between the R204/R206 and the studios.'},
};
const WIRES=[['src','r201'],['r201','bus'],['bus','r202'],['bus','r203'],['bus','r204'],['bus','r206'],['r202','mb'],['r203','mb'],['r206','tur'],['r206','disp'],['psu','r202'],['r204','stio'],['stio','tur'],['bus','mb']];
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 890 300" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.1}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((x,i)=>`<text x="${b.x+8}" y="${b.y+34+i*13}" font-size="10" fill="var(--ink2)">${x}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p><p class="small muted">Live: ${bsel==='bus'?'mute A/B/C '+Object.values(mutes()).join('/'):bsel==='r206'?'timer '+fmtHMS(timerNow(SIM.t)):bsel==='r203'?'monitor '+SELIN[monitor(SIM.t).sel]:bsel==='tur'?D.tur.map(t=>t.present?'present':'missing').join(' / '):''}</p>`; };
  SIM.on('time', draw); }

/* ---------------- schematics (redrawn) ---------------- */
const T=(x,y,s,c,a,fs,w)=>`<text x="${x}" y="${y}" font-size="${fs||10.5}" fill="${c||'var(--ink)'}" ${a?'text-anchor="'+a+'"':''} ${w?'font-weight="700"':''}>${s}</text>`;
const BX=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>${T(x+w/2,y+16,t,'var(--ink)','middle',12,1)}${sub?T(x+w/2,y+31,sub,'var(--ink2)','middle',10):''}`;
const LN=(x1,y1,x2,y2,c)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c||'var(--ink)'}"/>`;
function chip(x,y,w,title,L,R,foot){ const h=Math.max(L.length,R.length)*18+40; let s=BX(x,y,w,h,title,foot);
  L.forEach(([p,n],i)=>{ const yy=y+44+i*18; s+=LN(x-30,yy,x,yy)+T(x+4,yy+4,p,'var(--ink2)',null,9.5)+T(x-34,yy+4,n,'var(--ink)','end',10); });
  R.forEach(([p,n],i)=>{ const yy=y+44+i*18; s+=LN(x+w,yy,x+w+30,yy)+T(x+w-4,yy+4,p,'var(--ink2)','end',9.5)+T(x+w+34,yy+4,n,'var(--ink)',null,10); }); return s; }
const SHEETS=[
  {name:'1 · R201 controller (PIC16C65A)', note:'Redrawn from the EQUs, TRIS settings and comments in r201v101.asm. Pin names are the PIC port bits; net names are the source comments.', svg:()=>chip(250,20,230,'U? PIC16C65A (R201 iss 2/3)',
    [['RA0','CHLED (ON lamp, active low)'],['RA1','CHON switch in'],['RA2','P3 lamp'],['RA3','P2 lamp'],['RA4','75176 DE (RS485 tx)'],['RA5','OUT4 tally'],['RB0','M2 assign'],['RB1','M1 assign'],['RB2','P4 assign'],['RB3','P1 assign'],['RB4','B mute bus'],['RB5','TIMER RESET pulse'],['RB6','CHON audio enable'],['RB7','P4 switch in (pull-up)']],
    [['RC0','clk1: address/mode chain'],['RC1','AB select relay'],['RC2','CUE'],['RC3','MONO'],['RC4','clk2: button chain'],['RC5','load 74HC165s'],['RC6/RC7','TX/RX 9600 8N1'],['RD0','address/mode data'],['RD1','fader EOT'],['RD2','A mute bus'],['RD3','button data'],['RD4/5','ctl IN3 / IN4'],['RD6/7','ctl IN2 / IN1'],['RE0/1/2','OUT2 / OUT3 / OUT1']],'4.9152 MHz · WDT on')
    + T(20,330,'Button chain (74HC165, shift order): M1 · P3 · A · MONO · CUE · B · P1 · M2 · P2   —   address/mode chain: A1 · A3 · MODE0 · MODE2 · MODE1 · A4 · A2 · A0 · CH OFF','var(--ink2)',null,10) },
  {name:'2 · R201 audio path', note:'Redrawn from the R2K manual text and R201-FUNCTIONAL.pdf block labels; gains are the manual\'s (“−6 dB” mono, “12 dB in hand”). Op-amp details are not in the archive.', svg:()=>{ let s=''; const st=[['IN A / IN B','balanced stereo'],['A/B relay','RC1, interlocked'],['TRIM L / R','front, screwdriver'],['MONO','(L+R) −6 dB'],['INSERT','send/return, bypass jumpers'],['FADER','+12 … 0 … −∞, EOT'],['CH ON','RB6 enable'],['ASSIGN','P1–P4, M1/M2, DIRECT']];
    st.forEach(([a,b],i)=>{ const x=10+i*110; s+=BX(x,60,100,50,a,b); if(i) s+=LN(x-10,85,x,85); }); s+=LN(470,110,470,170)+BX(420,170,110,46,'CUE','pre-fader, pre-ON')+T(20,250,'CUE → cue speaker (R206) and auto cue (right headset); P1–P4 post fader, channel-on dependent; M1/M2 pre/post by jumper (R221: DIP SW4–SW7).','var(--ink2)',null,10); return s; } },
  {name:'3 · Motherboard edge and RS485', note:'Pin numbers from R2K FUNCTIONAL p.2 (R251.DSN, Nov 1999): every module position carries the same rail and RS485 pins; A0–A4 and SEL are hard-wired per position (address 8–27 on the R2K/20).', svg:()=>{ let s=''; const pins=[['41','RS485-1'],['43','RS485-2'],['45','+20 V'],['47','−20 V'],['49','AGND'],['51','DGND'],['53','+20 V'],['55','CHASSIS'],['32–40','A0–A4'],['42','SEL']];
    s+=BX(30,20,160,pins.length*20+30,'module edge','(EDGE56)'); pins.forEach(([p,n],i)=>{ const y=60+i*20; s+=LN(190,y,240,y)+T(186,y+4,p,'var(--ink2)','end',10)+T(246,y+4,n,'var(--ink)',null,10.5); });
    s+=BX(400,30,150,60,'75176 ×n','one per module')+BX(600,30,170,60,'R206 U3 16C63','RS485 bus master')+LN(550,60,600,60)+LN(320,60,400,60)+T(330,52,'RS485-1/2','var(--ink2)',null,10);
    s+=BX(600,130,170,60,'R206 U2 16F74','SPI master, RS422')+LN(685,90,685,130)+T(690,115,'SPI (sspbuf)','var(--ink2)',null,10)+BX(600,230,170,50,'R257 turrets','RS422, studio 1/2')+LN(685,190,685,230); return s; } },
  {name:'4 · R206: three controllers', note:'From the R206 sources: U2 r206v103.asm (16F74), U3 s206v102.asm (16C63, “rs485 bus master”, Tim Clarke Nov 27 2000), U16 r206v105.asm (16F73, timer). U-numbers from R2K20 Console Report.doc.', svg:()=>chip(60,20,190,'U2 PIC16F74',[['RA4','local cue mute'],['RD0','MUTE B local in'],['RE0','MUTE C local in'],['RE1','AUTO CUE in'],['RE2','CUE MUTE']],[['TX/RX','RS422 turrets'],['SCK/SDO/SDI','SPI → U3'],['pole10/20','studio 1/2 polls']],'scan · pole · txuart · scanu · spitx')
     + chip(380,20,170,'U3 PIC16C63',[['SDI/SDO','SPI slave of U2'],['SSPCON','0x25']],[['TX/RX','RS485 bus'],['DE','75176']],'spirx · procspi · txuart · scanu')
     + chip(380,170,190,'U16 PIC16F73',[['RB0–RB3','STOP START DOWN LOAD'],['RB4–RB7','their LEDs'],['RA5','tmr_rst (TIMER RESET bus)'],['RC4','ext_rst (clock to xx:56:00)']],[['TX','R254 / clock serial'],['RC5','tmr_tlly']],'Timer2 160 Hz ISR') },
];
let sh=0;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematic set — redrawn from source code and the R2K functional drawings, not the original CAD', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sv"></div><p class="small muted" id="sn"></p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((x,i)=>`<button data-s="${i}" class="${i===sh?'on':''}">${x.name}</button>`).join('');
    m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{sh=+b.dataset.s;draw();});
    m.querySelector('#sv').innerHTML=`<svg viewBox="0 0 900 380" style="width:100%;background:var(--panel)">${SHEETS[sh].svg()}</svg>`; m.querySelector('#sn').textContent='Redrawn. '+SHEETS[sh].note; };
  draw(); }

/* ---------------- software ---------------- */
const LOOP=[['scan',60],['debounce',18],['exbounce',40],['scanu',8],['process',14],['eot',10],['modeproc',30],['uartproc',4],['chonproc',16],['pulse',12],['refresh',70],['restat',6],['txuart',8],['init2',16],['(gotos)',93]];
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('R201 MAIN — the box lit is what runs at the playhead', `<div id="lp"></div>`)}${card('Selected channel: registers live', `<div id="rg"></div>`)}</div>
   <div class="grid2">${card('Mode table: what each firmware does (modeproc / chonproc flags)', `<div id="mt"></div>`)}${card('RS485 message format (r201v101.asm)', `<table class="kv small">
     <tr><th>Address byte</th><td class="mono">1 · a4 a3 a2 a1 a0 (bit 7 set) — scanu: btfss uart1,7 → compare with address</td></tr>
     <tr><th>Command byte</th><td class="mono">0 · x · take · value · n3 n2 n1 n0 — n indexes the uartproc table: ${CMD.slice(0,10).map((c,i)=>i+'='+c).join(', ')}</td></tr>
     <tr><th>Reply</th><td class="mono">address|0x80, then stat0 = 0 1 0 m1 p4 p3 p2 p1 or stat1 = 0 1 1 m2 mono a/b cue chon</td></tr>
     <tr><th>Example</th><td class="mono">turret CH ON for position 2 (address 9): 89 39 → reply 89 6x</td></tr>
     <tr><th>Bus master</th><td>R206 U3 (16C63) — modules only talk when addressed; there is no free polling of the 20 inputs. U2 relays turret commands to U3 over SPI.</td></tr></table>`)}</div>
   <div class="grid2">${card('R206 U16 timer (r206v105.asm)', `<table class="kv small"><tr><th>main</th><td class="mono">error_check · re_init · input · debounce · auto · display_led · timer_set · timer_off · trans_setup · reset_uart · transmit_uart · chck_rst · delay</td></tr>
     <tr><th>ISR</th><td class="mono">TMR2IF every 6.25 ms → tmr_update (16 → flush_TIMER), clk_update (32 → flush_CLOCK); int_cnt 160 → clk_cntrl; int_cnt_tmr 160 → tmr_cntrl</td></tr>
     <tr><th>Timer packet</th><td class="mono">FF FF 02 F0 &lt;message&gt; &lt;hours&gt; &lt;min BCD&gt; &lt;sec BCD&gt; (trans_byte11–18)</td></tr>
     <tr><th>Clock packet</th><td class="mono">FF FF 02 49 41 h h m m s s (trans_byte0–10)</td></tr>
     <tr><th>Live</th><td class="mono" id="tl2"></td></tr></table>`)}
     ${card('R203 volume encoder (ENCDV102, PIC16C54)', `<table class="kv small"><tr><th>Input</th><td>Optical encoder quadrature into a state table (“STATE 4 … STATE 28”, RETLW INC/DEC)</td></tr><tr><th>LEVEL</th><td>0–255, INCF capped at 255; below 179 a second table (COUNT, “COUNT &lt; 187”) gives finer steps at low level</td></tr><tr><th>Dim</th><td>“THIS SOFTWARE WILL REDUCE THE LEVEL BY −12 dB ONCE A LOW IS DETECTED ON INPUT PORTB,7” (auto cue)</td></tr><tr><th>Out</th><td>CS / DATAA / CLK serial to the VCA</td></tr><tr><th>Live</th><td class="mono" id="en"></td></tr></table>`)}</div>`;
  const tot=LOOP.reduce((a,x)=>a+x[1],0);
  SIM.on('time', ()=>{ const ph=(SIM.t%PASS)/PASS*tot; let acc=0, cur=0; LOOP.forEach(([n,c],i)=>{ if(ph>=acc) cur=i; acc+=c; });
    let s='<svg viewBox="0 0 560 170" style="width:100%">'; LOOP.forEach(([n,c],i)=>{ const x=10+(i%5)*110, y=10+Math.floor(i/5)*52; s+=`<rect x="${x}" y="${y}" width="100" height="40" rx="6" fill="${i===cur?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>${T(x+50,y+18,n,i===cur?'#fff':'var(--ink)','middle',11,1)}${T(x+50,y+32,'≈'+c+' cy',i===cur?'#fff':'var(--ink2)','middle',9)}`; });
    m.querySelector('#lp').innerHTML=s+`</svg><div class="small muted">Pass ≈ ${SIM.fmtDur(PASS)} ${inf('cycle counts per routine')} · playhead is ${((SIM.t%PASS)/PASS*100).toFixed(0)} % into pass ${Math.floor(SIM.t/PASS)}.</div>`;
    const ch=D.slots[D.sel].addr!=null&&byAddr(D.slots[D.sel].addr)?D.slots[D.sel]:inputs()[0], f=modeFlags(ch);
    const s0=st0(ch), s1=(ch.sel<<3)|(ch.mono<<2)|(ch.cue<<1)|ch.chon;
    const row=(nm,v,labels)=>`<tr><th class="mono">${nm}</th>${labels.map((l,i)=>{ const b=(v>>(labels.length-1-i))&1; return `<td class="mono" style="text-align:center;${b?'background:color-mix(in srgb,var(--accent) 30%,transparent)':''}">${l}<br>${b}</td>`; }).join('')}</tr>`;
    m.querySelector('#rg').innerHTML=`<div class="small">${ch.type} position ${ch.pos}, address ${ch.addr}, ${FW[ch.fw].name}, mode ${ch.mode}</div><table class="kv small">${row('status0',s0,['p1','p2','p3','p4','m1','m2'])}${row('status1',s1,['ab','mono','cue','chon'])}${row('flag2',(f.PL<<6)|(f.AO<<5)|(f.EOT<<4),['pl','ao','eot','down','off','on','pb'].slice(0,7))}${row('flag0 7–6',ch.fader===-Infinity?3:0,['eot','prev'])}</table>`;
    m.querySelector('#mt').innerHTML=`<table class="kv small"><tr><th>mode</th>${['v101','m102','m301'].map(k=>`<th>${k.toUpperCase()}</th>`).join('')}<th>Manual (R201/R221 DIP table)</th></tr>${[0,1,2,3,4,5,6,7].map(i=>`<tr${i===ch.mode?' style="background:color-mix(in srgb,var(--accent) 14%,transparent)"':''}><td>${i}</td>${['v101','m102','m301'].map(k=>{ const q=FW[k].modes[i]; return `<td class="mono">${q[0]?'AO ':''}${q[1]?'PL ':''}${q[2]?'EOT ':''}${q[3]}</td>`; }).join('')}<td class="small">${['alternate · A/B','always on, event pulse · A/B','alternate · CH OFF+IN tallies','alternate (!) · event pulses','EOT off, always on, pulse','EOT off, alternate','EOT off, alternate · CUE','EOT off, always on, pulse · CUE'][i]}</td></tr>`).join('')}</table><div class="small muted">AO = flag2,5 always on · PL = flag2,6 OUT1 pulsed · EOT = flag2,4 fader-down off · AB/CUE = role of control IN3/IN4.</div>`;
    m.querySelector('#tl2').textContent=`${fmtHMS(timerNow(SIM.t))} ${D.tmr.run?'TMR_GO':'stopped'} · interrupt ${Math.floor(SIM.t/T2INT)%160} of 160`;
    const r3=slotOf('R203'), mo=monitor(SIM.t); m.querySelector('#en').textContent=`LEVEL ${r3.level} · gain ${mo.gain.toFixed(1)} dB${mo.cueOn&&r3.dim?' (−12 dim)':''}`; }); }

/* ---------------- findings ---------------- */
function viewFind(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the R2K and its firmware are up to', `<ol class="small">
   <li><b>Artwork 2026|59: module panels and meter bridge now vector from the CorelDRAW silks</b> (${SIM.src('#CONSOLES - #OBSOLETE #Archive/MODULES/R201/SILK/R201SILK.CDR','R201SILK.CDR')} 24 Feb 1999, R207SILK 19 Jan 1999, R202MOD 20 Oct 1999, R203/R204/R205/R206SILK Nov–Dec 1998, R208/R209SILK 24 Feb 1999, ${SIM.src('#CONSOLES - #OBSOLETE #Archive/r2k20silkMeterBridgeCurveREV3.cdr','meter bridge REV3')} 9 Jun 2004), replacing the PNG renders. Only the meter bridge and the R206 timer legends (LOAD, DOWN HR, START MIN, STOP/RESET SEC) are in curves; every other module's legend is live text whose encoding libcdr cannot read, so the labels stay re-set by the plugin. R201SILK.CDR and R209SILK.CDR each carry a second, drill-only copy of the panel (crosshairs, no ink) beside the art, and R202MOD.cdr is a white-filled outline with WBS / R202 and four holes rather than a silk. ${SIM.src('#CONSOLES - #OBSOLETE #Archive/NAB R2k Revised Curve.cdr','NAB R2k Revised Curve.cdr')} (Jun 2004) is a different, show-floor bridge: “r2k | cool grey”, one long meter window, the WBS mark over a blank display and CLOCK (AM/PM) and TIMER (UP/DN) windows signed WARD-BECK SYSTEMS, with no PROGRAM/AUDITION/UTILITY/AUX labels ${inf('file name and layout')}.</li>
   <li><b>One manual page describes a different firmware.</b> The R201/R221 page lists Modes 2/3 as A/B select with “CH OFF + INA/INB” tallies and Mode 1 with event pulses. r201v101.asm (Mar 1999) implements Modes 2/3 as <i>CUE ON/CUE OFF</i> inputs, which is the R207 table, and sets flag2,6 (pulse) in modes 1, 3, 4, 7. The A/B behaviour arrives with R201M101 “CHANGED MODES FOR TELEMEDIA JAN 25, 2000 … SEE MODES #1 IN MANUAL”, which also drops every pulse flag. The text was written against the customer build.</li>
   <li><b>Mode 3 says “alternate action” but v101 makes it always-on.</b> modeproc for mode3 does bsf flag2,5 and bsf flag2,6, so the ON key cannot turn the channel off. R201M301 (Feb 15 2002, CBC Windsor) redefines mode 3 again (“added fader down-choff to mode 3”).</li>
   <li><b>The fader cancels cue on both edges.</b> The eot routine clears status1,1 when flag0,7 differs from flag0,6 in either direction, so lifting a fader off its end stop also cancels a cue. The manual only mentions the end-of-travel switch turning cue off.</li>
   <li><b>An RS485 overrun would deafen an R201.</b> In scanu the framing/overrun tests and the rxerror path are commented out, and nothing else clears CREN. If an OERR ever happens, the PIC stops receiving bus commands until reset. The watchdog does not help, because clrwdt runs every pass. The s206 bus master did get “revised communication filtering … preventing lock up”.</li>
   <li><b>The uartproc comments count from 1, the code from 0.</b> The jump table is reached by addwf pcl with the low nibble, so command 0 = A/B (commented “;1”) and 9 = CH ON (“;10”). Index 15 falls through the 15-entry table into abu.</li>
   <li><b>When both stat flags are set, one reply is lost.</b> restat loads tx1 from stat0, then overwrites it with stat1, and only one status byte is sent. The bsf tx2,7/6 lines are also repeated unconditionally after the conditional ones.</li>
   <li><b>R201 v1.00 → v1.01 → v1.03 are mostly chip ports.</b> v103 is v101 with “P16f74.INC” and ADCON1 digital-I/O setup. M102's header says why: “HAD TO INITIALIZE PORTS FOR DIGITAL I/O BECAUSE OF HARDWARE CHANGE TO PIC16F74 JAN 8, 2002”. The OTP 16C65A was gone.</li>
   <li><b>The R257 turret is built on R201 code.</b> r257-1v3.asm still carries the R201 EQUs (AB, M1, P1 … CHON, MONO) between “;-------------DELETE” markers. The file is named v3 but its header says V101 (Feb 11 2000). Its studio poll address is hard-coded: “spole0 … studio address, always 30” (the R204).</li>
   <li><b>Released timer code still toggles a test pin.</b> r206v105.asm's interrupt does “movlw 0x01 · xorwf PORTA,f ;TEST TEST TEST” and init clears TRISA,0/1 as outputs (“TEST”). error_check jumps to reset with goto, not call, from inside main, which works only because reset re-runs init. v1.05 is marked “CUSTOM” (faster auto-increment), yet it sits in the main R206 folder next to v101–v104.</li>
   <li><b>The R206 is three computers.</b> U2 (16C65A → 16F74) scans and polls the turrets, U3 (16C63) is the RS485 bus master reached over SPI, and U16 (16C73A → 16F73) runs timer and clock. The console report gives their versions: “U2 is V102 current is V103 … U3 … U16 is V103 current is V104”. The timer reset from a channel ON is a hardware bus line (PORTB,5 → U16 RA5), not a serial message.</li>
   <li><b>The 4.9152 MHz crystal is never named in the code.</b> It follows from SPBRG = 7 at 9600 Bd and from U16's 160 Hz Timer2 with int_num = 160 per second. The delay-routine comment “1/1.53MHZ” in every R201 file is a stale leftover.</li>
   <li><b>A real console in service.</b> R2K20 Console Report.doc: 8 of 10 R201 faders noisy, P2/P4 dead on one module, R221 CH ON lamp out, R203/R204 buttons needing double hits, T/B intermittent, all four R206 timer keys intermittent, an EOT wire removed, loose headset wires, “1 R201 has M101 software (pic16c65) the rest all have M102”. The fault switch in the simulator reproduces the logic-visible ones.</li>
   <li><b>Many customer variants.</b> R201: M101/M102 (Telemedia), M201 (CBC Sudbury, “CHON\\off+A & CHON\\off+B”), M301 (CBC Windsor), C102 (turntable, longer pulse), M401/M402 (Corus), Chum, Score/Score2. R203: Rogers and R203C100 encoder builds. R204: C100–C102. R221: “mono force”, custom cough, Score2. R221 and R201 C050000 build from the Cool Grey R241 sources (r241m102/m201/m301 include files).</li>
   <li><b>Misfiled and duplicated material.</b> Console Manuals/one.pdf is a third-party telephone-hybrid data sheet. MODULES/MODULES is an older nested copy. Console Manuals #BOB and CONSOLES # Erwin are empty skeletons. There is no 68HC11 code anywhere in the console archive: the logic is PIC (MPASM) plus one ATmega128 (R248).</li>
   <li><b>The artwork lost its text.</b> The CorelDRAW 5 silks convert with their drill crosshairs and brackets intact, but the text comes out as byte-swapped UTF-16 fragments (“㉒㘰” = “R206”). That is why the labels here are re-set.</li></ol>`)
   + `<div class="grid2">${card('Module and firmware variants in the archive', `<table class="kv small"><tr><th>Module</th><th>Role</th><th>Firmware files</th></tr>
     <tr><td>R201 / R207</td><td>stereo input (R207 = jumper modes, balance)</td><td class="mono">R201V100, r201v101–v103, R201V200, M101/M102/M10x/M201/M301/M401/M402, C102, Chum, Score, C050000 (r201v301)</td></tr>
     <tr><td>R221</td><td>input with RS485, DIP modes, M1/M2 sends</td><td class="mono">v300, v301, v302, custom, mono force, Score2 (PIC16F874)</td></tr>
     <tr><td>R202</td><td>output/summing</td><td>— (analog)</td></tr>
     <tr><td>R203</td><td>CR monitor</td><td class="mono">R203V100–v106; encoder ENCDV100/101/102; R203DISP, RAVV100; customsoft Rogers, R203c100</td></tr>
     <tr><td>R204</td><td>studio monitor</td><td class="mono">R204V100–v104, R204c100–c102, custom204</td></tr>
     <tr><td>R205</td><td>8×2 line selector</td><td class="mono">r205c100 (custom)</td></tr>
     <tr><td>R206 / R206A</td><td>utility, timer, bus master</td><td class="mono">U2 R206V100–v103, U3 S206V100–v103 / R206URT1, U16 R206TMR1, R206V101–v105</td></tr>
     <tr><td>R208</td><td>4 × stereo 3-band EQ</td><td>—</td></tr>
     <tr><td>R209 / R209A</td><td>clean feed (6 mix-minus)</td><td class="mono">r209v100–v102 (PIC16F874)</td></tr>
     <tr><td>R210</td><td>6-location studio monitor/TB</td><td class="mono">r210v100, v101, R210C100, c101</td></tr>
     <tr><td>R248</td><td>R206A replacement</td><td class="mono">R248.c v100–v103 (ATmega128 ICCAVR, 4.9152 MHz), TerryKelly, TheScore</td></tr>
     <tr><td>R254</td><td>timer display</td><td class="mono">R254V100, V101</td></tr>
     <tr><td>R257</td><td>studio turret</td><td class="mono">r257-1, R257-1X, v101 (V1–V3); R257-2; jobs 550001, 550142-1, 550166-1, 990116</td></tr></table>`)}
     ${card('Assumptions in this model', `<ul class="small"><li>Module order inside positions 1–20 ${inf('report lists quantities only')}; which R201 holds M101 and which have faults ${inf('')}.</li><li>Pass lengths: R201 ≈ 405 cycles, R206 U2 ≈ 46 cycles, turret turnaround 0.4 ms ${inf('instruction counts')}.</li><li>Audio: sources at about +4 dBu with a moving program envelope; meter 0 = +4 dBu; PPM-like ballistics; encoder 0.25 dB/step ${inf('')}.</li><li>Selector inputs IN1–IN8 wired PGM1–4, MONO1–2, AIR, EXT ${inf('functional drawings label them IN1–IN8 only')}.</li><li>Lamp colours from CustomR2K28.jpg ${inf('photo')}; turret top keys mapped ON / OFF / T/B onto the three G holes of R257M8 ${inf('')}.</li><li>R209 key layout on its six boxes ${inf('R209SILK has the boxes, not the text')}.</li></ul>`)}</div>
   ${card('Related plugins', `<p class="small">M8246 (R2K console PSU) and MF250 (its frame) cover power; “obsolete-misc” covers the R257 turret boards and the 554951 two-console interface; M8245 is the ±22 V card inside the PSU.</p>`)}`; }

SIM.register({
  footnotes: [{"text": "Most R2K module silks are live text in an encoding libcdr cannot read, so the simulator re-sets every module label itself.", "src": "#CONSOLES - #OBSOLETE #Archive/MODULES/R201/SILK/R201SILK.CDR"}, {"text": "Only the R206 timer legends (LOAD, DOWN HR, START MIN, STOP/RESET SEC) and the meter bridge are converted to curves.", "src": "#CONSOLES - #OBSOLETE #Archive/MODULES/R206/R206SILK.CDR"}, {"text": "R201SILK.CDR carries a second, drill-only copy of the panel (crosshairs, no ink) beside the artwork.", "src": "#CONSOLES - #OBSOLETE #Archive/MODULES/R201/SILK/R201SILK.CDR"}, {"text": "R209SILK.CDR likewise holds a drill-only copy beside the art.", "src": "#CONSOLES - #OBSOLETE #Archive/MODULES/R209/R209SILK.CDR"}, {"text": "R202MOD.cdr is not a silk: it is a white-filled outline with WBS / R202 and four holes.", "src": "#CONSOLES - #OBSOLETE #Archive/MODULES/R202/R202MOD.cdr"}, {"text": "The R201 and R207 silks print the fader wedge as one solid shape (green on the console), with the 12-dB-in-hand bar across it.", "src": "#CONSOLES - #OBSOLETE #Archive/MODULES/R201/SILK/R207SILK.CDR"}, {"text": "The NAB R2k bridge is a different, show-floor design: “r2k | cool grey”, one long meter window, the WBS mark, CLOCK (AM/PM) and TIMER (UP/DN) windows.", "src": "#CONSOLES - #OBSOLETE #Archive/NAB R2k Revised Curve.cdr"}, {"text": "The meter bridge REV3 (2004) labels its four meters PROGRAM, AUDITION, UTILITY and AUX/SWR, with a 36 … 0 … 14 PK scale.", "src": "#CONSOLES - #OBSOLETE #Archive/r2k20silkMeterBridgeCurveREV3.cdr"}],
  id:'consoles-r2k', product:'R2K consoles', name:'R2K · broadcast radio console (1999|32)', year:1999,
  family:'Obsolete products', folder:'#CONSOLES - #OBSOLETE #Archive',
  summary:'The Ward-Beck R2K modular radio console: twenty input modules, output, control-room and studio monitor modules, and a three-processor utility module that runs the timer, polls the studio turrets and masters an RS485 bus. Every input is a PIC that scans its own buttons and fader end-stop. This model runs the real R201 and R206 firmware logic on the real panel silks.',
  highlights:['R2K/20 laid out from the CorelDRAW silks, with every control on its drill crosshair','R201 firmware: debounce, 8 modes, CH ON state machine, EOT, timer-reset pulse','Turret → R206 RS422 poll → SPI → RS485 → R201 command in slow motion','R206 U16 timer: 160 Hz Timer2, LOAD/DOWN, display packets','Customer firmware variants and a real service report’s faults','Manual-versus-code mismatches in the mode tables'],
  depth:'Full model', duration:1,
  stepUnits:[{label:'1 R201 pass',period:()=>PASS},{label:'1 serial byte',period:()=>BYTE},{label:'1 Timer2 interrupt',period:()=>T2INT},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.05,'50 ms (a turret poll pair)'],[0.01,'10 ms'],[0.002,'2 ms (R201 passes)']],
  defaultZoom:0,
  init(){ window[KEY]=false; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: operating the R2K',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Software',render:viewSoft},
    {id:'findings',label:'Findings',render:viewFind},
  ],
});
})();
