/* =====================================================================
   D8207 / D8207V — AES/EBU sample-rate converter (Ward-Beck, 1999|32)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all in "#MF8200 #SERIES/D8207 - #Engineering #MF82/" unless noted):
   - D8207 - #SOFTWARE #PRG_V101/d8207_v1.asm  (V1.01, Nov 15 1999, Slava Lee) — the model runs this code path
   - D8207 - #SOFTWARE #PRG_V100/d8207.asm     (V1.00, Sep 15 1999) + D8207.BKX (Intel HEX of V1.00) + *.$$$ backups
   - D8207 - #SOFTWARE #PRG_V10x/*.PJT, *.ERR  (MPLAB project: /c- case-insensitive, Frequency fields)
   - D8207 - #PCB/D8207.PCB (Tango-PCB ASCII: every component, pad, track and silk text), D8207.DSN (OrCAD), D8207.EXP (part export)
   - D8207 - D8207_D8207V SAMPLE RATE CONVERTER FUNCTIONAL DESCRIPTION.WPD (2000), D8207MAN.WPD (1999), D8207.wpd (2000), d8207.pdf (2002)
   - FIG1/FIG2.cdr, D8207TR1-3.cdr, D8207-75/-110(-015).cdr (terminal options; converted with Inkscape)
   - ../8200 Series Rear Module options graphical Guides…/D8207 - rear module options.cdr/.pdf (2012) → assets/d8207-rear-*.svg (vector, Artwork 2026|59)
   - ../D8200 - #Engineering #MF82/d8200 - #d820x/ (jumpers.txt, pic/d820x.h: the 2000 D820x successor build)
   Board image assets/d8207-pcb.png is rendered from D8207.PCB (copper, pads, silk) at 0.16 px/mil.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const card = (t,b,x)=>`<div class="card"${x?' '+x:''}><h2>${t}</h2>${b}</div>`;
const esc = s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hex = v=>'0x'+((v|0)&255).toString(16).toUpperCase().padStart(2,'0');
const bin = v=>((v|0)&255).toString(2).padStart(8,'0');
const ASSET = 'siumulation-plugins/assets/';
const fk = f=>f? (f/1000).toFixed(f%1000?2:0).replace(/\.?0+$/,'')+' kHz' : '—';

/* ---------------- constants from the source ---------------- */
const XTAL = 4.9152e6;               // X1 "4M9152" (PCB silk) / "4M915" (D8207.EXP) on the PIC
const TCY = 4/XTAL;                  // 0.8138 µs per instruction
// I2C is bit-banged through TRISC (BITOUT/BITIN). Instruction counts per routine, counted from the listing:
const CYB = 330, CYRX = 300, CYS = 14, CYP = 18;          // TX byte (8×37 + ACK), RX byte, BSTART, BSTOP
const C_WR = CYS+3*CYB+CYP+8;                              // WRBYTE_M  (addr, MAP, data)          ≈ 1030 cycles
const C_RD = 2*CYS+3*CYB+CYRX+2*CYP+8;                     // RDBYTE_M  (addr, MAP) + (addr|R, data) ≈ 1362
const C_W1 = CYS+2*CYB+CYP+6;                              // WRBYTE    (addr, data) for the ML6431   ≈ 698
const C_DELAY = 1540;                                      // delay: 256 × (3 nop + decfsz + goto)
const OST = 1024/XTAL;                                     // oscillator start-up timer (PWRT unknown)
const LOCK_T = 0.020;      // CS8420 receiver PLL acquire — inferred
const ML_LOCK_T = 0.120;   // ML6431 genlock acquire — inferred
const FS_LIST = [22050, 32000, 44100, 48000, 88200, 96000];
const ADR = {MN:0x20, REF:0x22, ML:0xB2};                  // MN_SRC_ADR, REF_SRC_ADR, ML6431_ADR
const FL = {OUTOFF:7, TGL:6, MN_DE:5, REF_DE:4, REF_LOCK:3, AUX:2, DEB:1, ERR:0};
const FLN = ['ERR_1','debounce_on','AUX_MODE','REF_LOCK_YES','REF_DE_YES','MN_DE_YES','REF_FLASH_TGL','MN_AES_OUTPUT_OFF'];
const PBN = {7:'LED_ERROR (red)',6:'LED_AUDIO_LOCK (green)',5:'LED_REF_LOCK (yellow)',3:'RST_REF_SRC',2:'RST_MN_SRC'};
const JDOC = {
  ra0:{pin:'RA0',name:'JMP_20_24',silk:'20\\24 BIT',v1:'24 bit (set_main8420_24bit)',v0:'20 bit (set_main8420_20bit)',man:'H1 ON = 24 bit (D8207.wpd)'},
  ra1:{pin:'RA1',name:'JMP_DITHER',silk:'DITHER ON\\OFF',v1:'dither OFF (reg 1 = 0x08)',v0:'dither ON (reg 1 = 0x00)',man:'H2 OFF = dither on (default)'},
  ra2:{pin:'RA2',name:'JMP_SRC',silk:'SRC ON\\OFF',v1:'SRC OFF (rst_aux_mode, ref LED flashes)',v0:'SRC ON (set_aux_mode when ref locks)',man:'H3 ON = SRC on (default)'},
  ra3:{pin:'RA3',name:'JMP_48_44',silk:'48K\\44K1',v1:'44.1 kHz (ML6431 ← 0x81)',v0:'48 kHz (ML6431 ← 0x80)',man:'H5 ON = 48 kHz (video only)'},
  ra4:{pin:'RA4',name:'JMP_H1',silk:'H1',v1:'AES audio reference (set_ref8420_audio)',v0:'video reference (set_ref8420_video)',man:'H4 ON = audio reference'},
};
const fsCode = f=>f===48000?1:f===44100?2:f===32000?3:0;               // AES3 byte 0 bits 6–7 as stored (D1:D0)
const consCode = f=>({44100:0x00,48000:0x40,32000:0xC0,96000:0x50,88200:0x10,22050:0x20}[f]??0x10);  // IEC 60958 bits 24–27 in D7:D4 (inferred for the non-32/44.1/48 rates)
const FSNAME = {0:'not indicated',1:'48 kHz',2:'44.1 kHz',3:'32 kHz'};

/* ---------------- device state ---------------- */
const DEF = ()=>({
  variant:'75', vopt:false, rear:'bnc1', fw:'1.01',
  main:{on:true, fs:44100, pro:true, v:false},
  ref:{on:true, fs:48000, pro:true},
  video:{on:false},
  frame:{driven:false, fs:48000},
  j:{ra0:1, ra1:0, ra2:0, ra3:0, ra4:1},
  aterm:'75', rterm:'75', refsrc:'EXT', refout:false,
  fault:false, live:false, ev:[], log:[], seen:{},
});
let D = DEF();

/* ---------------- input signals (with timed dropouts) ---------------- */
function inDrop(w,t){ for (const e of D.ev) if (e.what===w && t>=e.t0 && t<e.t1) return true; return false; }
function onset(w,t){ let o=0; for (const e of D.ev) if (e.what===w && e.t1<=t && e.t1>o) o=e.t1; return o; }
const mainPresent = t=> D.main.on && !inDrop('main',t);
const refAESon = t=> (D.refsrc==='EXT'? D.ref.on : D.frame.driven) && !inDrop('ref',t);
const refAESfs = ()=> D.refsrc==='EXT'? D.ref.fs : D.frame.fs;
const refAESpro = ()=> D.refsrc==='EXT'? D.ref.pro : true;
const videoOn = t=> D.vopt && D.video.on && !inDrop('video',t);
const termWant = ()=> D.variant==='75'?'75':'110';
const termOK = term=> term===termWant();
function PA(t){                                   // PORTA & 0x1f as the PIC reads it
  const j = Object.assign({}, D.j);
  D.ev.filter(e=>e.kind==='jmp' && e.t<=t).sort((a,b)=>a.t-b.t).forEach(e=>{ j[e.bit]=e.val; });
  if (!D.vopt){ j.ra3=1; j.ra4=1; }               // H1 and 48K\44K1 are DNI on a plain D8207 → pulled up (R4–R8 2k) — inferred
  return j.ra0 | (j.ra1<<1) | (j.ra2<<2) | (j.ra3<<3) | (j.ra4<<4);
}

/* ---------------- chip models ---------------- */
function mkChip(name){ return { name, tl:{}, runs:[], lastInt:0, efPending:null, E:null }; }
function regSet(ch,map,v,t){ (ch.tl[map]=ch.tl[map]||[]).push([t,v&255]); }
function regAt(ch,map,t){ const a=ch.tl[map]; if(!a) return 0; let v=0; for (const p of a){ if (p[0]<=t) v=p[1]; else break; } return v; }
function regSince(ch,map,t){ const a=ch.tl[map]; if(!a) return 0; let s=0, prev=null; for (const p of a){ if (p[0]>t) break; if (p[1]!==prev){ s=p[0]; prev=p[1]; } } return s; }
function runStart(ch,t){ let s=null; for (const r of ch.runs) if (r.on<=t && (r.off==null || t<r.off)) s=r.on; return s; }
function chipReset(ch,t){ ch.runs.forEach(r=>{ if (r.off==null) r.off=t; }); [1,3,4,6,0x12].forEach(m=>regSet(ch,m,0,t)); ch.E=null; ch.efPending=null; ch.lastInt=t; }
function Dbytes(){ const p=D.main.pro; return { b0: p?(0x80|fsCode(D.main.fs)):0x00, b2: p?0x34:0x00 }; }
const Ecur = ch=> ch.E? ch.E : Dbytes();
function refBytes(){ const f=refAESfs(); return refAESpro()? [0x80|fsCode(f),0,0x34,0,0] : [0x00,0,0,consCode(f),0]; }

let R = null;     // the simulated second
function mainLocked(t){ if(!R) return false; const rs=runStart(R.mn,t); if (rs==null || !mainPresent(t)) return false; return t >= Math.max(rs, onset('main',t)) + LOCK_T; }
function mlLockFrom(t){ if (!R || R.ml.cfgAt==null) return Infinity; return Math.max(onset('video',t), R.ml.cfgAt) + ML_LOCK_T; }
function mlLocked(t){ return videoOn(t) && t >= mlLockFrom(t); }
function mlRate(t){ let r=48000; if (R) for (const p of R.ml.rate){ if (p[0]<=t) r=p[1]; else break; } return r; }
function refMode(t){ return (regAt(R.rf,4,t)&3)===1? 'aes' : 'ilrck'; }
function refLocked(t){
  if (!R) return false; const rs=runStart(R.rf,t); if (rs==null) return false;
  const ms=regSince(R.rf,4,t);
  if (refMode(t)==='aes') return refAESon(t) && t >= Math.max(rs, ms, onset('ref',t)) + LOCK_T;
  return mlLocked(t) && t >= Math.max(rs, ms, mlLockFrom(t)) + LOCK_T;
}
const refRate = t=> refMode(t)==='aes'? refAESfs() : mlRate(t);
function errMN(t){ const L=mainLocked(t), P=mainPresent(t); let v=0; if(!L) v|=0x10; if(L&&D.main.v) v|=0x08; if(L&&!termOK(D.aterm)) v|=0x04; if(P&&!L&&runStart(R.mn,t)!=null) v|=0x02; return v; }
function errREF(t){ return refLocked(t)? 0 : 0x10; }
function outAt(t){
  if (!R) return {on:false, why:'—'};
  const ch=R.mn; if (runStart(ch,t)==null) return {on:false, why:'CS8420 (U3) in reset or RUN=0'};
  const r3=regAt(ch,3,t), r4=regAt(ch,4,t);
  if (r3&0x40) return {on:false, why:'TXOFF = 1 (shut_off_AES_output)'};
  const txd=(r3>>3)&3, outc=(r4>>3)&1;
  if (txd===2){ return mainLocked(t)? {on:true, fs:D.main.fs, mode:'bypass', audio:true, why:'bypass: AES receiver → AES transmitter (reclocking DA)'} : {on:true, fs:null, mode:'bypass', audio:false, why:'bypass with the input unlocked: transmitter on a free-running PLL'}; }
  if (txd===0){
    if (outc===1) return {on:true, fs: mainLocked(t)? D.main.fs : null, mode:'src', audio:mainLocked(t), why:'SRC path, output clock = recovered input (OUTC=1)'};
    if (!refLocked(t)) return {on:true, fs:null, mode:'src', audio:false, why:'SRC path, OMCK lost (reference CS8420 unlocked)'};
    const fo=refRate(t), r=fo/D.main.fs, ok=r>=1/3-1e-9 && r<=3+1e-9;
    return {on:true, fs:fo, mode:'src', audio: mainLocked(t)&&ok, ratio:r, why: ok? `SRC: ${fk(D.main.fs)} → ${fk(fo)} (OMCK from the reference CS8420)` : `ratio ${r.toFixed(2)} is outside 1:3…3:1`};
  }
  return {on:true, fs:null, why:'TXD = '+txd};
}
function csAt(t){ let c=[0,0,0]; if (R) for (const p of R.csTL){ if (p[0]<=t) c=p; else break; } return {b0:c[1], b2:c[2]}; }
function pbAt(t){ let v=0; if (R) for (const p of R.pbTL){ if (p[0]<=t) v=p[1]; else break; } return v; }
function ledsAt(t){ const b=pbAt(t); return { aud:!!(b&0x40), ref:!!(b&0x20), err:!!(b&0x80) }; }

/* ---------------- firmware (d8207_v1.asm / d8207.asm), pass by pass ---------------- */
function setPB(S,bit,v){ const n = v? (S.pbv|(1<<bit)) : (S.pbv&~(1<<bit)); if (n!==S.pbv){ S.pbv=n; S.pbTL.push([S.t,n]); } }
const fset=(S,b,v)=>{ S.FLAG = v? (S.FLAG|(1<<b)) : (S.FLAG&~(1<<b)); };
const fget=(S,b)=>!!(S.FLAG&(1<<b));
function chipRead(S,ch,map,t){
  if (map===0x10) return ch===S.mn? errMN(t) : errREF(t);
  if (map===0x07){
    let v=0;
    const L = ch===S.mn? mainLocked(t) : refLocked(t);
    const fin = ch===S.mn? D.main.fs : (refRate(t)||48000);
    if (L){ const b=192/fin; if (Math.floor(t/b) > Math.floor(ch.lastInt/b)) v|=0x04; }        // DETC
    if (ch.efPending!=null){ const b=192/((ch===S.mn? outAt(t).fs:0)||48000); if (Math.floor(t/b) > Math.floor(ch.efPending/b)){ v|=0x02; ch.efPending=null; } }  // EFTC
    ch.lastInt=t; return v;
  }
  if (map>=0x20 && map<=0x24){
    if (ch===S.mn){ const e=Ecur(ch); return map===0x20? e.b0 : map===0x22? e.b2 : 0; }
    return refMode(t)==='aes' && refLocked(t)? refBytes()[map-0x20] : 0;
  }
  return regAt(ch,map,t);
}
function chipWrite(S,ch,map,v,t){
  if (map===4 && (v&0x40) && runStart(ch,t)==null) ch.runs.push({on:t, off:null});
  if (ch===S.mn && map===0x12){ if (v&0x08){ if(!ch.E) ch.E=Object.assign({},Dbytes()); } else ch.E=null; if (!(v&0x04)) ch.efPending=t; }
  if (ch===S.mn && (map===0x20||map===0x22) && ch.E){ if (map===0x20) ch.E.b0=v; else ch.E.b2=v; }
  regSet(ch,map,v,t);
}
function updF(S,t){ const r12=regAt(S.mn,0x12,t); if (!(r12&0x04)){ const e=Ecur(S.mn), l=S.csTL[S.csTL.length-1]; if (!l || l[1]!==e.b0 || l[2]!==e.b2) S.csTL.push([t,e.b0,e.b2]); } }
function mlWrite(S,v,t){ S.ml.tl.push([t,v]); if (!D.vopt) return; if (v===0x70 && S.ml.cfgAt==null) S.ml.cfgAt=t; if (v===0x80) S.ml.rate.push([t,48000]); if (v===0x81) S.ml.rate.push([t,44100]); }
function io(S,kind,dev,map,v,fn,note){
  const t0=S.t; S.t += (kind==='W'?C_WR:kind==='R'?C_RD:C_W1)*TCY; const t=S.t;
  const ch = dev==='MN'? S.mn : dev==='REF'? S.rf : null;
  let val=v, nack=false;
  if (dev==='REF' && D.fault){ nack=true; if (!fget(S,FL.ERR)) S.erc=3; fset(S,FL.ERR,1); if (kind==='R') val=0xFF; }
  else if (kind==='R') val=chipRead(S,ch,map,t);
  else if (kind==='W') chipWrite(S,ch,map,v,t);
  else mlWrite(S,v,t);
  S.tx.push({t0, t1:t, kind, dev, map, v:val&255, fn, nack, note});
  if (ch===S.mn) updF(S,t);
  return val&255;
}
const RD=(S,dev,map,fn,n)=>io(S,'R',dev,map,0,fn,n);
const WR=(S,dev,map,v,fn,n)=>io(S,'W',dev,map,v,fn,n);
const W1=(S,v,fn)=>io(S,'W1','ML',null,v,fn);
function MDF(S,dev,map,v,mask,fn,n){ const r=RD(S,dev,map,fn,n); const o=(r&~mask&255)|(v&mask); WR(S,dev,map,o,fn,n); return {datai:r&~mask&255, datao:o}; }
const v101 = ()=> D.fw==='1.01';
function bypass(S){ const f='set_main8420_bypass';
  if (v101()) MDF(S,'MN',3,0x15,0xBF,f); else WR(S,'MN',3,0x15,f);
  WR(S,'MN',4,0x49,f);
  if (!v101()) WR(S,'MN',0x12,0x00,f);       // V1.01 loads DATAO=0 for reg 0x12 but never calls WRBYTE_M
}
function auxSynh(S){ const f='set_main8420_aux_synh';
  if (v101()) MDF(S,'MN',3,0x01,0xBF,f); else WR(S,'MN',3,0x01,f);
  WR(S,'MN',4,0x41,f); WR(S,'MN',0x12,0x00,f);
}
function setAux(S){ fset(S,FL.AUX,1); auxSynh(S); }
function rstAux(S){ fset(S,FL.AUX,0); bypass(S); }
const setW=(S,b)=>WR(S,'MN',6,b===20?0x90:0x80,'set_main8420_'+b+'bit');
const dith=(S,on)=>WR(S,'MN',1,on?0x00:0x08, on?'set_main8420_dither_on':'set_main8420_dither_off');
function refAudio(S){ WR(S,'REF',3,0x55,'set_ref8420_audio'); WR(S,'REF',4,0x49,'set_ref8420_audio'); }
function refVideo(S){ WR(S,'REF',3,0x4A,'set_ref8420_video'); WR(S,'REF',4,0x48,'set_ref8420_video'); }
function preset(S){ const f='preset_chips';
  W1(S,0x70,f); W1(S,0x80,f); W1(S,0xA2,f);
  ['REF','MN'].forEach(dv=>{ [1,2,5,0x0A,0x0B,0x0C,0x0D,0x0E,0x12,0x13].forEach(m=>WR(S,dv,m,0,f)); WR(S,dv,3,0x01,f); WR(S,dv,4,0x49,f); WR(S,dv,6,0x80,f); WR(S,dv,9,0x06,f); WR(S,dv,0x11,0x1E,f); });
}
function fwInit(S){
  const t0=S.t; S.inits.push(t0);
  S.t += 34*TCY; S.FLAG=0; S.fc=16; S.cnt=0; S.bcount=0; S.bounce=0; S.bref=[0,0,0,0,0];
  setPB(S,2,0); setPB(S,3,0); chipReset(S.mn,S.t); chipReset(S.rf,S.t);
  S.t += 12*TCY; setPB(S,7,1);
  S.t += C_DELAY*TCY;
  setPB(S,2,1); setPB(S,3,1);
  preset(S);
  S.MODE=0;
  const pa=PA(S.t);
  if (pa&1) setW(S,24); else setW(S,20);
  if (pa&8) W1(S,0x81,'set_ML6431_44'); else W1(S,0x80,'set_ML6431_48');
  if (pa&2) dith(S,false); else dith(S,true);
  if (pa&16) refAudio(S); else refVideo(S);
  if (pa&4) rstAux(S); else setAux(S);
  setPB(S,7,0);
  S.steps.push({fn:'init', t0, t1:S.t});
}
function testLock(S){
  const d=RD(S,'REF',0x10,'test_lock_state');
  let rl = !(d&0x10);
  if (!(S.MODE&0x10) && !mlLocked(S.t)) rl=false;       // MODE_H1 = 0 → also needs PORTC,LOCKED
  fset(S,FL.REF_LOCK,rl);
  const m=RD(S,'MN',0x10,'tst_mn_lck');
  let DATAI=m;
  setPB(S,7, (m&0x04)||(m&0x02));
  if (v101()){
    if (m&0x10){ setPB(S,6,0); S.cnt=16; if (!fget(S,FL.OUTOFF)) DATAI=MDF(S,'MN',3,0x40,0x40,'shut_off_AES_output').datai; fset(S,FL.OUTOFF,1); }
    else { setPB(S,6,1); if (fget(S,FL.OUTOFF)){ S.cnt=(S.cnt-1)&255; if (S.cnt===0){ DATAI=MDF(S,'MN',3,0x00,0x40,'shut_on_AES_output').datai; fset(S,FL.OUTOFF,0); } } }
  } else setPB(S,6, !(m&0x10));
  if (fget(S,FL.ERR)) return 'restart';
  const bug = DATAI!==m;
  MDF(S,'MN',1,(DATAI&0x08)?0x40:0x00,0x40,'tls_next (refresh Validity bit)', bug? 'DATAI holds reg 3, not reg 16!' : null);
  if (S.MODE&0x04){                                     // mk_ref_flash
    setPB(S,5,0); if (!rl) return;
    if (fget(S,FL.TGL)){ setPB(S,5,1); S.fc=(S.fc-1)&255; if (!S.fc){ fset(S,FL.TGL,0); S.fc=16; } }
    else { setPB(S,5,0); S.fc=(S.fc-1)&255; if (!S.fc){ fset(S,FL.TGL,1); S.fc=16; } }
    return;
  }
  setPB(S,5,rl);
  if (rl){ if (!fget(S,FL.AUX)) setAux(S); }
  else if (fget(S,FL.AUX)) rstAux(S);
}
function testJmp(S){
  const pa=PA(S.t)&0x1f;
  if (!fget(S,FL.DEB)){ if (pa===S.MODE) return; fset(S,FL.DEB,1); S.bounce=pa; S.bcount=8; return; }
  if (pa!==S.bounce){ fset(S,FL.DEB,0); return; }
  S.bcount=(S.bcount-1)&255; if (S.bcount) return;
  const x=S.bounce^S.MODE; S.MODE=S.bounce;
  if (x&1) setW(S, (S.MODE&1)?24:20);
  if (x&8) W1(S, (S.MODE&8)?0x81:0x80, (S.MODE&8)?'set_ML6431_44':'set_ML6431_48');
  if (x&2) dith(S, !(S.MODE&2));
  if (x&16){ if (S.MODE&16) refAudio(S); else refVideo(S); }
  if (x&4){ if (S.MODE&4) rstAux(S); else setAux(S); }
  fset(S,FL.DEB,0);
}
function refCS(S){
  if (!fget(S,FL.AUX) || fget(S,FL.REF_DE)) return;
  if (S.MODE&0x10){
    const d=RD(S,'REF',7,'REF_channel_status'); if (!(d&0x04)) return;
    for (let k=0;k<5;k++) S.bref[k]=RD(S,'REF',0x20+k,'REF_channel_status');
  }
  fset(S,FL.REF_DE,1);
  RD(S,'MN',7,'REF_end'); WR(S,'MN',0x12,0x04,'REF_end');
}
function mnCS(S){
  if (!fget(S,FL.AUX) || !fget(S,FL.REF_DE)) return;
  if (!fget(S,FL.MN_DE)){
    const d=RD(S,'MN',7,'MN_channel_status'); if (!(d&0x04)) return;
    const b=RD(S,'MN',0x20,'MN_channel_status');
    if (!(b&0x80)){ WR(S,'MN',0x12,0x00,'MN_channel_status (consumer: pass C-bits)'); fset(S,FL.MN_DE,0); fset(S,FL.REF_DE,0); return; }
    fset(S,FL.MN_DE,1); WR(S,'MN',0x12,0x0C,'MN_prof_mode');
    let data;
    const s48=()=>MDF(S,'MN',0x20,1,3,'MN_set_48k').datao, s32=()=>MDF(S,'MN',0x20,3,3,'MN_set_32k').datao;
    if (S.MODE&0x10){
      if (S.bref[0]&0x80) data=S.bref[0];
      else { const v=S.bref[3]&0xF0; data = v===0x00? 2 : v===0x40? s48() : v===0xC0? s32() : 0; }
    } else data = (S.MODE&0x08)? s48() : 2;
    MDF(S,'MN',0x20,data,0x03,'MN_dto (fs bits)');
    MDF(S,'MN',0x22,(S.MODE&1)?0x34:0x30,0xFC,'MN_dto (word length)');
    RD(S,'MN',7,'MN_dto'); WR(S,'MN',0x12,0x08,'MN_dto');
  }
  const e=RD(S,'MN',7,'MN_wt_EF_int'); if (!(e&0x02)) return;
  WR(S,'MN',0x12,0x04,'MN_wt_EF_int'); fset(S,FL.MN_DE,0); fset(S,FL.REF_DE,0);
}
function step(S,name,fn){ const t0=S.t; S.t+=4*TCY; const r=fn(S); S.steps.push({fn:name,t0,t1:S.t}); return r; }
function simulate(){
  const S = R = { t:OST, tx:[], steps:[], passes:[], pbTL:[[0,0]], pbv:0, FLAG:0, MODE:0, cnt:0, fc:16, bounce:0, bcount:0, bref:[0,0,0,0,0],
    mn:mkChip('MN'), rf:mkChip('REF'), ml:{cfgAt:null, rate:[], tl:[]}, csTL:[[0,0,0]], inits:[], erc:0 };
  let guard=0;
  outer: while (S.t<1 && guard<4000){
    fwInit(S);
    while (S.t<1 && guard++<4000){
      const p={i:S.passes.length, t0:S.t, FLAG:S.FLAG, MODE:S.MODE, cnt:S.cnt, fc:S.fc, bcount:S.bcount, pa:PA(S.t)&0x1f, n0:S.tx.length};
      S.passes.push(p);
      S.t += TCY;                                        // clrwdt
      if (step(S,'test_lock_state',testLock)==='restart'){ p.t1=S.t; p.restart=true; p.n1=S.tx.length; continue outer; }
      step(S,'test_jmp_state',testJmp);
      step(S,'REF_channel_status',refCS);
      step(S,'MN_channel_status',mnCS);
      step(S,'delay',s=>{ s.t+=C_DELAY*TCY; });
      S.t += 2*TCY; p.t1=S.t; p.n1=S.tx.length; p.FLAGe=S.FLAG; p.MODEe=S.MODE;
    }
  }
}
function resim(){ simulate(); }
function passAt(t){ if(!R) return null; const P=R.passes; let lo=0, hi=P.length-1, r=null; while(lo<=hi){ const m=(lo+hi)>>1; if (P[m].t0<=t){ r=P[m]; lo=m+1; } else hi=m-1; } return r; }
function stepAt(t){ if(!R) return null; for (const s of R.steps) if (t>=s.t0 && t<s.t1 && s.fn!=='init') return s; for (const s of R.steps) if (t>=s.t0 && t<s.t1) return s; return null; }
function txAt(t){ if(!R) return null; for (const x of R.tx) if (t>=x.t0 && t<x.t1) return x; return null; }
function flagAt(t){ const p=passAt(t); if (!p) return 0; return (p.t1!=null && t>=p.t1-1e-9 && p.FLAGe!=null)? p.FLAGe : p.FLAG; }

/* ---------------- user actions → real code path ---------------- */
function txLine(x){
  const dev = x.dev==='ML'? 'ML6431' : x.dev==='MN'? 'MN8420 (U3)' : 'REF8420 (U2)';
  const op = x.kind==='R'? `RD ${dev} [${hex(x.map)}] → ${hex(x.v)}` : x.kind==='W'? `WR ${dev} [${hex(x.map)}] ← ${hex(x.v)}` : `WRBYTE ${dev} ← ${hex(x.v)}`;
  return `<span class="muted">${(x.t0*1e3).toFixed(2)} ms</span> <b>${esc(x.fn)}</b> ${op}${x.nack?' <span style="color:var(--bad)">NACK → ERR_1</span>':''}${x.note?' <span style="color:var(--bad)">'+esc(x.note)+'</span>':''}`;
}
function traceFrom(t, n, skipPoll){
  if (!R) return []; const out=[];
  for (const x of R.tx){ if (x.t0<t) continue; if (skipPoll && x.kind==='R' && (x.map===0x10||x.map===0x07)) continue; if (skipPoll && x.fn.startsWith('tls_next')) continue; out.push(txLine(x)); if (out.length>=n) break; }
  return out;
}
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); resim(); D.log.unshift({t:SIM.t, name, tr, at:D._at!=null?D._at:null}); D._at=null; if (D.log.length>40) D.log.length=40; SIM.refresh(); }
function jName(k){ return JDOC[k].silk; }
const A = {
  jumper(k){
    if (!D.vopt && (k==='ra3'||k==='ra4')) return act(`${jName(k)} is DNI on a plain D8207`, tr=>{ tr('PCB assembly note 3: "D8207/V - R10 & R12 = 3M3; H1 & 48K\\44K1 = IN". On the D8207 these headers are not fitted, so the pin reads its pull-up (1) '+inf+'.'); tr('Tick “D8207V (video option)” to fit them.'); });
    if (D.live){
      const cur = (PA(SIM.t)>>(+k[2]))&1;
      D.ev.push({kind:'jmp', t:SIM.t, bit:k, val:cur^1}); D._at=SIM.t;
      return act(`Move ${jName(k)} at ${SIM.fmtT(SIM.t)} (live)`, tr=>{ const J=JDOC[k];
        tr(`PORTA,${J.pin} (${J.name}) → ${cur^1}: ${cur^1?J.v1:J.v0}`);
        tr('test_jmp_state: first pass sees PORTA&0x1F ≠ MODE → debounce_on, bounce_reg, bcount = BCOUNT_NUM (8)');
        tr('processing: 8 more passes with the same PORTA, then MODE = bounce_reg and only the changed bits call their set_ routine');
        tr('<b>I2C after the change:</b>'); });
    }
    D.j[k]^=1;
    act(`${jName(k)} → ${D.j[k]} (${D.j[k]?JDOC[k].v1:JDOC[k].v0}), power-on`, tr=>{ const J=JDOC[k];
      tr(`PORTA,${J.pin} (${J.name}) = ${D.j[k]}. Manual: ${J.man}.`);
      tr('init reads PORTA directly and calls the matching set_ routine; MODE is cleared, so test_jmp_state then debounces all five bits again for 9 passes');
      if (k==='ra3') tr('48K\\44K1 drives the ML6431 (0x80/0x81) <b>and</b>, in MN_prof_mode, the channel-status fs code — with opposite polarity (see Findings)');
      if (k==='ra2') tr(D.j.ra2? 'SRC off: test_lock_state → mk_ref_flash every pass; REF LOCK flashes 16 passes on / 16 off while the reference is locked' : 'SRC on: set_aux_mode → set_main8420_aux_synh (reg 3 = 0x01, reg 4 = 0x41) once the reference locks');
    });
  },
  term(which,v){ act(`${which==='a'?'AUDIO':'REF'} TERM → ${v}`, tr=>{ if (which==='a') D.aterm=v; else D.rterm=v;
    tr(`Berg jumper selects ${v==='HiZ'?'high impedance (loop-through)':v+' Ω'} across the input transformer (${which==='a'?'T7':'T1'}) ${inf}.`);
    if (which==='a') tr(termOK(v)? 'Matches the cable: clean eye, CS8420 reg 16 CONF = 0' : `Mismatch on a /${D.variant} card: reflections → marginal eye → CONF (reg 16 bit 2) → tst_mn_lck sets LED_ERROR ${inf}`);
    else tr('The code never reads the reference chip\'s CONF bit — only UNLOCK (reg 16 bit 4). A badly terminated reference does not light the red LED (see Findings).'); }); },
  refHdr(row){ act(row==='OUT'? `REF header OUT → ${!D.refout}` : `REF header → ${row}`, tr=>{
    if (row==='OUT'){ D.refout=!D.refout; tr(D.refout? 'This card now drives the MF82 frame reference bus with the reference at its input (D8207MAN: “With the OUT jumper set, the D8207 will drive the backplane”)' : 'Card no longer drives the frame reference bus'); }
    else { D.refsrc=row; tr(row==='LCL'? 'Reference taken from the frame backplane bus (another D8207 with OUT set, or a frame BNC)' : 'Reference taken from this card\'s rear termination (AES REF INPUT)'); }
  }); },
  plug(w){ act(`${{main:'AES audio input',ref:'AES reference',video:'Video reference'}[w]} ${w==='main'?(D.main.on?'unplugged':'plugged in'):w==='ref'?(D.ref.on?'unplugged':'plugged in'):(D.video.on?'unplugged':'plugged in')}`, tr=>{
    if (w==='main'){ D.main.on=!D.main.on; tr(D.main.on? 'U3 PLL acquires ('+LOCK_T*1e3+' ms '+inf+'); reg 16 UNLOCK clears; LED_AUDIO_LOCK on' : 'U3 reg 16 bit 4 UNLOCK = 1 → tls_no_mn_lck: LED_AUDIO_LOCK off'+(v101()?', shut_off_AES_output (TXOFF=1)':' (V1.00 keeps transmitting)')); }
    if (w==='ref'){ if (D.refsrc==='LCL'){ D.frame.driven=!D.frame.driven; tr('LCL selected: this toggles the frame bus feed from another card'); } else D.ref.on=!D.ref.on; tr('test_lock_state reads REF8420 reg 16: UNLOCK → REF_LOCK_YES; locked + SRC on → set_aux_mode; unlocked → rst_aux_mode (bypass, reclocking DA)'); }
    if (w==='video'){ if (!D.vopt){ tr('Plain D8207: no ML6431/video input fitted. Tick D8207V first.'); return; } D.video.on=!D.video.on; tr('ML6431 genlocks to NTSC (X2 3.58 MHz) and outputs an audio-rate clock on pin 16 (preset 0x70) → REF8420 ILRCK; LOCKED → PORTC,2'); }
  }); },
  drop(w){ const t0=SIM.t, t1=Math.min(1,t0+0.3); D.ev.push({what:w, t0, t1}); D._at=t0; act(`Drop ${w==='main'?'the AES input':w==='ref'?'the AES reference':'the video reference'} for 300 ms at ${SIM.fmtT(t0)}`, tr=>{
    if (w==='main'){ tr('Next test_lock_state: MN reg 16 UNLOCK → LED_AUDIO_LOCK off'); tr(v101()? 'V1.01: shut_off_AES_output (reg 3 TXOFF=1), MN_AES_OUTPUT_OFF; on return the output stays off for AES_OUTPUT_CNT_NUM = 16 locked passes, then shut_on_AES_output' : 'V1.00: no output control — the transmitter keeps running'); }
    else tr('REF_LOCK_YES = 0 → rst_aux_mode → set_main8420_bypass: the output follows the input rate until the reference returns, then set_aux_mode again');
    tr('<b>I2C after the event (polling reads hidden):</b>'); }); },
  setFs(w,v){ act(`${w==='main'?'Input':'Reference'} fs → ${fk(v)}`, tr=>{ if (w==='main') D.main.fs=v; else if (D.refsrc==='LCL') D.frame.fs=v; else D.ref.fs=v; tr('Functional description: 22–96 kHz, ratio up to 1:3 or 3:1.'); }); },
  variant(v){ act(`Card variant D8207/${v}`, tr=>{ D.variant=v; D.aterm=v; D.rterm=v; D.rear = v==='110'? 'tb8205p' : 'bnc1';
    tr(v==='110'? 'Assembly note 2: “D8207/110 - R21 TO R25 = 110R; T2,T4,T5 & T6 = PE65612”. Rear module TB8205P.' : 'Assembly note 1: “D8207/75 - AS IS. OPTIONAL PARTS = OUT.” Rear module BNC1 (or BNC3 in an MF8210).'); tr('AUDIO TERM and REF TERM set to '+v+' to match.'); }); },
  vopt(){ act(D.vopt?'Remove the video option (D8207)':'Fit the video option (D8207V)', tr=>{ D.vopt=!D.vopt; if (!D.vopt) D.video.on=false; tr('Assembly note 3: “D8207/V - R10 & R12 = 3M3; H1 & 48K\\44K1 = IN”. The ML6431 (U5) and X2 3.58 MHz are the OPTIONAL block '+inf+'.'); }); },
  fw(v){ act('Firmware '+v, tr=>{ D.fw=v; tr(v==='1.01'? 'V1.01 (Nov 15 1999): “When main audio source is plug off, the output of MN8420 is off” — shut_off/shut_on_AES_output, AES_OUTPUT_CNT_NUM = 0x10; bypass/aux now use MDFBYTE_M to keep TXOFF' : 'V1.00 (Sep 15 1999): LED only; transmitter never switched off; bypass writes reg 0x12 = 0'); }); },
  fault(){ act(D.fault?'Clear the I2C fault':'Fault: REF8420 does not ACK', tr=>{ D.fault=!D.fault; tr('TX checks ACK (BITIN) → ERR → ERCODE = 3, FLAG,ERR_1'); tr('test_lock_state: btfsc FLAG,ERR_1 → goto start → init again (LED_ERROR on during init) — every pass'); }); },
  reset(){ act('Factory defaults', tr=>{ D=Object.assign(DEF(),{log:D.log, seen:D.seen}); tr('D8207/75, SRC on, dither on, 24 bit, AES reference; input 44.1 kHz, reference 48 kHz.'); }); },
  clearEv(){ act('Clear timed events', tr=>{ D.ev=[]; tr('All dropouts and live jumper moves removed.'); }); },
};

/* ---------------- drawings ---------------- */
const PX = x=>(x-1795)*0.16, PY = y=>(5335-y)*0.16;      // D8207.PCB mils → board image px
function ledG(cx,cy,on,col,r){ return `<circle cx="${cx}" cy="${cy}" r="${r+1.6}" fill="#0b0c0c"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${on?col:'#2c332c'}" ${on?'filter="url(#d7glow)"':''}/>`; }
const GLOW = `<defs><filter id="d7glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
function frontSVG(t){
  const L=ledsAt(t), Yf=y=>16+(5335-y)*0.1, o=outAt(t);
  const leds=[[4850,'AUDIO LOCK','#7dff6a',L.aud,'L1 GRN · RB6 LED_AUDIO_LOCK'],[4750,'REF LOCK','#ffd23a',L.ref,'L2 YEL · RB5 LED_REF_LOCK'],[4650,'ERROR','#ff4a3a',L.err,'L4 RED · RB7 LED_ERROR']];
  let s=`<svg viewBox="0 0 290 300" style="width:100%;max-width:290px">${GLOW}
   <rect x="22" y="16" width="62" height="274" rx="3" fill="#2a2d30" stroke="#111"/>
   <text x="53" y="12" font-size="9" text-anchor="middle" fill="var(--ink2)">front edge, 2.74 in</text>`;
  leds.forEach(([y,l,c,on,tip],i)=>{ const ly=Yf(y)+(i-1)*15; s+=`<g><title>${tip}</title>${ledG(53,Yf(y),on,c,4.2)}<polyline points="60,${Yf(y)} 84,${Yf(y)} 98,${ly}" fill="none" stroke="var(--ink2)" stroke-width=".6"/><text x="104" y="${ly+4}" font-size="11" fill="var(--ink)">${l}</text></g>`; });
  s+=`<rect x="30" y="${Yf(4450)}" width="46" height="${(4450-3500)*0.1}" rx="5" fill="#c9c9c2" stroke="#888"/><text x="53" y="${Yf(3975)}" font-size="11" font-weight="700" text-anchor="middle" fill="#222" transform="rotate(90 53 ${Yf(3975)})">D8207${D.vopt?'V':''}</text>
   <text x="104" y="${Yf(3975)+4}" font-size="10" fill="var(--ink2)">handle (position ${'inferred'})</text>
   <g class="d7jack" style="cursor:pointer"><title>DIGITAL MONITOR (TRS, 110 Ω, via T8) — click for what it carries</title><circle cx="53" cy="${Yf(3100)}" r="11" fill="#111" stroke="#888"/><circle cx="53" cy="${Yf(3100)}" r="4.5" fill="#000"/><circle cx="53" cy="${Yf(3100)}" r="2" fill="${o.on&&o.fs?'var(--led-g)':'#444'}"/>
   <text x="104" y="${Yf(3100)+4}" font-size="11" fill="var(--ink)">MONITOR (¼″ TRS)</text></g>
   <text x="4" y="296" font-size="9" fill="var(--ink2)">LED and jack heights from D8207.PCB (y = 4850/4750/4650, 3100 mil).</text></svg>`;
  return s;
}
const REAR_SRC = '#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8207 - rear module options';
const REARS = {
  bnc1:{img:'d8207-rear-bnc1.svg', w:486, h:540, title:'BNC1 (75 Ω)', pts:{ref:[220,66],o1:[284,133],o2:[220,201],o3:[284,268],o4:[219,335],main:[284,405],video:[219,473]}, r:28},
  bnc3:{img:'d8207-rear-bnc3.svg', w:483, h:540, title:'BNC3 (75 Ω, MF8210 only)', pts:{ref:[216,62],loop:[308,62],o1:[216,164],o2:[308,164],o3:[216,266],o4:[308,266],main:[216,370],video:[308,370]}, r:28},
  tb8205p:{img:'d8207-rear-tb8205p.svg', w:486, h:600, title:'TB8205P (110 Ω pluggable screw)', pts:{ref:[160,142],loop:[247,142],o1:[160,257],o2:[160,305],o3:[160,353],o4:[160,401],main:[247,257]}, r:20, box:true},
};
function rearSVG(t){
  const RQ=REARS[D.rear]||REARS.bnc1, o=outAt(t), outOn=o.on&&!!o.fs;
  const live={ main:mainPresent(t), ref:refAESon(t)&&D.refsrc==='EXT', video:videoOn(t) };
  let s=`<svg viewBox="0 0 ${RQ.w} ${RQ.h+26}" style="width:100%;max-width:340px">${GLOW}<rect x="0" y="0" width="${RQ.w}" height="${RQ.h}" fill="#ecebe5"/><image href="${ASSET+RQ.img}" x="0" y="0" width="${RQ.w}" height="${RQ.h}"/>`;
  for (const k in RQ.pts){ const [x,y]=RQ.pts[k]; const isOut=k[0]==='o';
    const clickable = k==='main'||k==='ref'||(k==='video'&&D.vopt);
    const on = isOut? outOn : k==='loop'? live.ref : live[k];
    const col = isOut? 'var(--led-g)' : k==='video'? '#ffb43a' : 'var(--accent2)';
    const tip = isOut? `DIGITAL OUT ${k[1]} — ${outOn? 'AES '+fk(o.fs):'no output: '+o.why}` : k==='loop'? 'passive input loop' : `${{main:'AES AUDIO INPUT',ref:'AES REF INPUT',video:'VIDEO REF INPUT (D8207V)'}[k]} — click to plug/unplug`;
    s+= RQ.box? `<g class="${clickable?'d7rp':''}" data-k="${k}" style="cursor:${clickable?'pointer':'default'}"><title>${tip}</title><rect x="${x-RQ.r}" y="${y-13}" width="${RQ.r*2}" height="${isOut?48:26}" rx="4" fill="${on?col:'transparent'}" opacity="${on?.35:1}" stroke="${on?col:'#999'}" stroke-dasharray="${clickable?'':'3 2'}"/></g>`
      : `<g class="${clickable?'d7rp':''}" data-k="${k}" style="cursor:${clickable?'pointer':'default'}"><title>${tip}</title><circle cx="${x}" cy="${y}" r="${RQ.r}" fill="transparent" stroke="${on?col:'transparent'}" stroke-width="5" ${on?'filter="url(#d7glow)"':''}/>${on&&!isOut&&clickable?`<rect x="${x-9}" y="${y-RQ.r-22}" width="18" height="22" fill="#333"/>`:''}<circle cx="${x}" cy="${y}" r="5" fill="${on?col:'#777'}"/></g>`;
  }
  return s+`<text x="4" y="${RQ.h+18}" font-size="15" fill="var(--ink2)">${RQ.title}</text></svg><div class="small muted">CorelDRAW art (vector): ${SIM.src(REAR_SRC+'.cdr','D8207 - rear module options.cdr')} (2012|45), as CorelDRAW printed it to ${SIM.src(REAR_SRC+'.pdf','.pdf')}</div>`;
}
const JPOS = { ra3:[4300,3800], ra2:[4300,3900], ra1:[4300,4000], ra0:[4300,4100], ra4:[3350,4875] };
const COMPS = [
  ['U1','PIC16C73A (silk: PIC16C63) — controller, I2C master',3605,4470,5105,4927,'pic'],
  ['U2','CS8420 #2 — reference receiver (REF_SRC_ADR 0x22)',6450,4325,7163,4902,'ref'],
  ['U3','CS8420 #1 — main SRC/transceiver (MN_SRC_ADR 0x20)',7345,4325,8105,4902,'mn'],
  ['U4','EL2099 — output line driver',8246,4271,9150,4754,'drv'],
  ['U5','ML6431 — video genlock (D8207V, OPTIONAL)',11021,3012,11620,3583,'ml'],
  ['X1','4.9152 MHz PIC crystal',4321,4196,4895,4404,'pic'],
  ['X2','3.58 MHz (NTSC subcarrier) for the ML6431',10921,3521,11329,3802,'ml'],
  ['REG1','LM2825 +5 V DC/DC (DIP24)',3895,2915,5245,3677,'pwr'],
  ['REG2','79L05 −5 V',8821,3871,9279,4100,'pwr'],
  ['P1','Edge connector to the MF82 frame (30-way, 0.156″)',12021,2820,12575,5096,'pwr'],
];
function boardSVG(t){
  const L=ledsAt(t), pa=PA(t);
  let s=`<svg viewBox="0 0 1839 470" style="width:100%">${GLOW}<image href="${ASSET}d8207-pcb.png" x="0" y="0" width="1839" height="439"/>`;
  COMPS.forEach(c=>{ s+=`<rect class="d7comp" data-b="${c[6]}" x="${PX(c[2])}" y="${PY(c[5])}" width="${PX(c[4])-PX(c[2])}" height="${PY(c[3])-PY(c[5])}" fill="transparent" stroke="transparent" stroke-width="3" style="cursor:help"><title>${c[0]}: ${c[1]}</title></rect>`; });
  [[4850,'#7dff6a',L.aud],[4750,'#ffd23a',L.ref],[4650,'#ff4a3a',L.err]].forEach(([y,c,on])=>{ s+=ledG(PX(1900),PY(y),on,c,6); });
  for (const k in JPOS){ const [x,y]=JPOS[k], dni=!D.vopt&&(k==='ra3'||k==='ra4'), b=(pa>>(+k[2]))&1;
    const xs = b? x : x+100;                      // shunt on pins 1–2 = 1, 2–3 = 0 (orientation inferred)
    s+=`<g class="d7j" data-k="${k}" style="cursor:pointer"><title>${JDOC[k].silk} (${JDOC[k].pin} ${JDOC[k].name}) = ${b}: ${b?JDOC[k].v1:JDOC[k].v0}${dni?' — DNI on D8207':''}. Click to move.</title><rect x="${PX(x)-12}" y="${PY(y)-12}" width="${0.16*200+24}" height="24" fill="transparent"/>${dni?`<rect x="${PX(x)-7}" y="${PY(y)-7}" width="46" height="14" fill="none" stroke="#ff8" stroke-dasharray="3 2"/>`:`<rect x="${PX(xs)-6}" y="${PY(y)-7}" width="${0.16*100+12}" height="14" rx="2" fill="#111" stroke="#ff5" stroke-width="2.5"/>`}<rect x="${PX(x)-12}" y="${PY(y)-12}" width="${0.16*200+24}" height="24" rx="3" fill="none" stroke="rgba(255,255,90,.6)" stroke-width="1.5"/></g>`; }
  const termCols=(x0,yA,yB,cur,k)=>{ let q=''; ['75','110','HiZ'].forEach((v,i)=>{ const x=x0+100*i; q+=`<g class="d7t" data-k="${k}" data-v="${v}" style="cursor:pointer"><title>${k==='a'?'AUDIO':'REF'} TERM ${v}</title><rect x="${PX(x)-9}" y="${PY(yB)-9}" width="18" height="${PY(yA)-PY(yB)+18}" fill="${cur===v?'#111':'transparent'}" stroke="${cur===v?'#ff5':'rgba(255,255,120,.25)'}" stroke-width="1.5" rx="2"/></g>`; }); return q; };
  s+=termCols(9825,3750,3850,D.aterm,'a')+termCols(10950,5000,5100,D.rterm,'r');
  [['OUT',4800,D.refout],['LCL',4900,D.refsrc==='LCL'],['EXT',5000,D.refsrc==='EXT']].forEach(([n,y,on])=>{ s+=`<g class="d7h" data-k="${n}" style="cursor:pointer"><title>REF header: ${n}</title><rect x="${PX(11750)-9}" y="${PY(y)-9}" width="${PX(11850)-PX(11750)+18}" height="18" rx="2" fill="${on?'#111':'transparent'}" stroke="${on?'#ff5':'rgba(255,255,120,.25)'}" stroke-width="1.5"/></g>`; });
  return s+`<text x="4" y="462" font-size="15" fill="var(--ink2)">D8207.PCB (Tango-PCB PLUS, 1999-09-22) rendered to scale, 11.49 × 2.74 in. Yellow = jumpers (click). Hover the chips. Front edge on the left, edge connector P1 on the right.</text></svg>`;
}
function bindPanel(m){
  m.querySelectorAll('.d7j').forEach(g=>g.onclick=()=>A.jumper(g.dataset.k));
  m.querySelectorAll('.d7t').forEach(g=>g.onclick=()=>A.term(g.dataset.k,g.dataset.v));
  m.querySelectorAll('.d7h').forEach(g=>g.onclick=()=>A.refHdr(g.dataset.k));
  m.querySelectorAll('.d7rp').forEach(g=>g.onclick=()=>A.plug(g.dataset.k));
  m.querySelectorAll('.d7jack').forEach(g=>g.onclick=()=>act('Plug a WBS Audio Bit Buddy into the monitor jack', tr=>{ const o=outAt(SIM.t); tr('1999 board: the jack hangs off T8 on the output side (110 Ω), so it carries the converted output '+inf+'.'); tr('D8207.wpd (2000) adds H14 “Main Audio Input / Main Reference Input” — not on this PCB (later D820x board).'); tr('Now: '+(o.on&&o.fs? 'AES '+fk(o.fs) : 'nothing — '+o.why)); }));
  m.querySelectorAll('.d7comp').forEach(r=>{ r.onmouseenter=()=>r.setAttribute('stroke','#5aa9e6'); r.onmouseleave=()=>r.setAttribute('stroke','transparent'); });
}
function jumperHTML(){
  const pa=PA(SIM.t);
  return `<table class="kv"><tr><th>Silk</th><th>Pin</th><th>Bit</th><th>Code meaning (d8207_v1.asm)</th><th>Manual</th></tr>${Object.keys(JDOC).map(k=>{ const J=JDOC[k], b=(pa>>(+k[2]))&1, dni=!D.vopt&&(k==='ra3'||k==='ra4'); return `<tr><td><button class="d7jb ${b?'on':''}" data-k="${k}" style="font-size:11.5px">${J.silk}</button></td><td class="mono">${J.pin}</td><td class="mono">${b}${dni?' (DNI)':''}</td><td>${b?J.v1:J.v0}</td><td class="small muted">${J.man}</td></tr>`; }).join('')}</table>
  <div class="small" style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">AUDIO TERM ${['75','110','HiZ'].map(v=>`<button class="d7tb ${D.aterm===v?'on':''}" data-k="a" data-v="${v}">${v}</button>`).join('')} REF TERM ${['75','110','HiZ'].map(v=>`<button class="d7tb ${D.rterm===v?'on':''}" data-k="r" data-v="${v}">${v}</button>`).join('')} REF ${['EXT','LCL'].map(v=>`<button class="d7hb ${D.refsrc===v?'on':''}" data-k="${v}">${v}</button>`).join('')}<button class="d7hb ${D.refout?'on':''}" data-k="OUT">OUT</button>
  <label title="When ticked, a jumper click moves it at the playhead instead of changing the power-on setting"><input type="checkbox" id="d7live" ${D.live?'checked':''}> move jumpers live at the playhead</label></div>`;
}
function bindJumpers(m){
  m.querySelectorAll('.d7jb').forEach(b=>b.onclick=()=>A.jumper(b.dataset.k));
  m.querySelectorAll('.d7tb').forEach(b=>b.onclick=()=>A.term(b.dataset.k,b.dataset.v));
  m.querySelectorAll('.d7hb').forEach(b=>b.onclick=()=>A.refHdr(b.dataset.k));
  const lv=m.querySelector('#d7live'); if (lv) lv.onchange=e=>{ D.live=e.target.checked; };
}
function controlsHTML(){
  const opt=(list,cur)=>list.map(f=>`<option value="${f}" ${f===cur?'selected':''}>${fk(f)}</option>`).join('');
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
   <b>Input</b><button id="c_mi" class="${D.main.on?'on':''}">AES in</button><select id="c_mf">${opt(FS_LIST,D.main.fs)}</select>
   <label><input type="checkbox" id="c_mp" ${D.main.pro?'checked':''}> professional C-bits</label><label><input type="checkbox" id="c_mv" ${D.main.v?'checked':''}> V flag set</label>
   <button id="c_md">Drop input 300 ms here</button></div>
   <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px">
   <b>Reference</b><button id="c_ri" class="${(D.refsrc==='EXT'?D.ref.on:D.frame.driven)?'on':''}">AES ref ${D.refsrc==='LCL'?'(frame bus)':''}</button><select id="c_rf">${opt(FS_LIST,refAESfs())}</select>
   <label><input type="checkbox" id="c_rp" ${D.ref.pro?'checked':''}> professional</label>
   <button id="c_vi" class="${D.video.on&&D.vopt?'on':''}" ${D.vopt?'':'disabled'}>Video ref (NTSC)</button><button id="c_rd">Drop reference 300 ms here</button></div>
   <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px">
   <b>Card</b><select id="c_var"><option value="75" ${D.variant==='75'?'selected':''}>D8207/75</option><option value="110" ${D.variant==='110'?'selected':''}>D8207/110</option></select>
   <label><input type="checkbox" id="c_vo" ${D.vopt?'checked':''}> D8207V (video option)</label>
   ${D.variant==='75'?`<select id="c_rear"><option value="bnc1" ${D.rear==='bnc1'?'selected':''}>BNC1</option><option value="bnc3" ${D.rear==='bnc3'?'selected':''}>BNC3 (MF8210)</option></select>`:''}
   <select id="c_fw"><option value="1.01" ${D.fw==='1.01'?'selected':''}>firmware V1.01</option><option value="1.00" ${D.fw==='1.00'?'selected':''}>firmware V1.00</option></select>
   <button id="c_ft" class="${D.fault?'on':''}">I2C fault: REF8420 no ACK</button><button id="c_ce">Clear events</button><button id="c_rs">Defaults</button></div>`;
}
function bindControls(m){ const q=s=>m.querySelector(s); if (!q('#c_mi')) return;
  q('#c_mi').onclick=()=>A.plug('main'); q('#c_mf').onchange=e=>A.setFs('main',+e.target.value);
  q('#c_mp').onchange=e=>act('Input C-bits: '+(e.target.checked?'professional':'consumer'),tr=>{ D.main.pro=e.target.checked; tr('MN_channel_status reads MN8420 byte 0 bit 7: consumer → write reg 0x12 = 0, leave the C-bits alone (no fs rewrite)'); });
  q('#c_mv').onchange=e=>act('Input V flag '+(e.target.checked?'set':'clear'),tr=>{ D.main.v=e.target.checked; tr('tls_next: MN reg 16 bit 3 (V) → MDFBYTE_M reg 1 bit 6 (VSET): the output V bit follows the input'); });
  q('#c_md').onclick=()=>A.drop('main'); q('#c_ri').onclick=()=>A.plug('ref'); q('#c_rf').onchange=e=>A.setFs('ref',+e.target.value);
  q('#c_rp').onchange=e=>act('Reference C-bits: '+(e.target.checked?'professional':'consumer'),tr=>{ D.ref.pro=e.target.checked; tr('MN_aud: pro reference → copy b0_ref fs bits; consumer → decode b3_ref & 0xF0 (0x00 44.1k, 0x40 48k, 0xC0 32k)'); });
  q('#c_vi').onclick=()=>A.plug('video'); q('#c_rd').onclick=()=>A.drop(D.j.ra4||!D.vopt?'ref':'video');
  q('#c_var').onchange=e=>A.variant(e.target.value); q('#c_vo').onchange=()=>A.vopt();
  if (q('#c_rear')) q('#c_rear').onchange=e=>{ D.rear=e.target.value; SIM.refresh(); };
  q('#c_fw').onchange=e=>A.fw(e.target.value); q('#c_ft').onclick=()=>A.fault(); q('#c_ce').onclick=()=>A.clearEv(); q('#c_rs').onclick=()=>A.reset();
}

/* ---------------- timeline lanes ---------------- */
function stateBar(c,X,t0,t1,y,h,f,cols,labs){
  const N=500; let prev=null, xs=X(t0);
  const flush=(xe,v)=>{ c.fillStyle=cols[v]||'#888'; c.globalAlpha=.6; c.fillRect(xs,y+4,Math.max(1,xe-xs),h-8); c.globalAlpha=1; if (xe-xs>60 && labs[v]){ c.fillStyle=SIM.css('--ink'); c.font='10.5px sans-serif'; c.fillText(labs[v],xs+4,y+h/2+4); } };
  for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=String(f(t)); if (prev===null){ prev=v; continue; } if (v!==prev || i===N){ const xe=X(t); flush(xe,prev); xs=xe; prev=v; } }
}
const RCOL = {init:'#8a5cc2', test_lock_state:'#1f7a4d', test_jmp_state:'#b5651d', REF_channel_status:'#0d5c8c', MN_channel_status:'#2a8fbd', delay:'#9aa0a6'};
const DCOL = {MN:'#2a8fbd', REF:'#1f7a4d', ML:'#b5651d'};
function laneSteps(c,X,t0,t1,y,h){
  const pxp = X(t0+0.006)-X(t0);
  for (const s of R.steps){ if (s.t1<t0 || s.t0>t1) continue; c.fillStyle=RCOL[s.fn]||'#888'; c.globalAlpha=.8; const xa=X(s.t0), xb=X(s.t1); c.fillRect(xa,y+3,Math.max(1,xb-xa-(pxp>6?.6:0)),h-6); c.globalAlpha=1; if (xb-xa>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s.fn,xa+3,y+h/2+3); } }
}
function laneI2C(c,X,t0,t1,y,h){
  for (const x of R.tx){ if (x.t1<t0 || x.t0>t1) continue; const xa=X(x.t0), xb=X(x.t1); c.fillStyle=x.nack?SIM.css('--bad'):DCOL[x.dev]; c.globalAlpha=x.kind==='R'?.45:.85; c.fillRect(xa,y+3,Math.max(1,xb-xa-.5),h-6); c.globalAlpha=1;
    if (xb-xa>70){ c.fillStyle=SIM.css('--ink'); c.font='10px monospace'; c.fillText(`${x.kind==='W1'?'W':x.kind} ${x.dev}${x.map!=null?' '+hex(x.map):''}${x.kind!=='R'?'←':'→'}${hex(x.v)}`,xa+3,y+h/2+3); }
    const bitW = X(x.t0+37*TCY)-X(x.t0);
    if (bitW>3){ c.strokeStyle=SIM.css('--ink'); c.lineWidth=1; c.beginPath(); for (let tt=x.t0+CYS*TCY; tt<x.t1-CYP*TCY; tt+=37*TCY){ const xx=X(tt+18*TCY); c.moveTo(xx,y+h-5); c.lineTo(xx,y+h-11); } c.stroke(); } }
}
function lanes(full){
  const css=SIM.css, L=[];
  L.push({label:`AES in · ${fk(D.main.fs)}`, h:24, draw(c,X,t0,t1,y,h){ D.ev.filter(e=>e.what==='main').forEach(e=>{ c.fillStyle=css('--bad'); c.globalAlpha=.2; c.fillRect(X(e.t0),y,X(e.t1)-X(e.t0),h); c.globalAlpha=1; }); if (!D.main.on){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('unplugged',X(t0)+6,y+h/2+4); return; } SIM.pulses(c,X,t0,t1,y,h,1/D.main.fs,0,0.5/D.main.fs,css('--accent2'),'frames'); SIM.pulses(c,X,t0,t1,y,h*0.4,192/D.main.fs,0,1/D.main.fs,css('--warn'),'C blocks'); }});
  L.push({label: D.j.ra4||!D.vopt? `AES ref · ${fk(refAESfs())} (${D.refsrc})` : 'Video ref (NTSC fields/lines)', h:24, draw(c,X,t0,t1,y,h){
    if (D.vopt && D.video.on){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,1001/60000*0.075,css('--warn'),'fields'); SIM.pulses(c,X,t0,t1,y+h*0.55,h*0.45,1001/(60000*262.5),0,4.7e-6,css('--ink2'),'H lines'); }
    if (refAESon((t0+t1)/2)) SIM.pulses(c,X,t0,t1,y,h*0.5,1/refAESfs(),0,0.5/refAESfs(),css('--accent'),'ref frames'); }});
  if (D.vopt) L.push({label:'ML6431 LOCKED → RC2', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>mlLocked(t)?1:0,{1:css('--accent'),0:css('--ink2')},{1:'LOCKED',0:'searching / no video'}); }});
  L.push({label:'CS8420 U3 (main) lock', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>runStart(R.mn,t)==null?2:mainLocked(t)?1:0,{1:css('--accent'),0:css('--bad'),2:css('--ink2')},{1:'locked',0:'UNLOCK',2:'reset'}); }});
  L.push({label:'CS8420 U2 (ref) lock', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>runStart(R.rf,t)==null?2:refLocked(t)?1:0,{1:css('--accent'),0:css('--bad'),2:css('--ink2')},{1:'locked ('+(D.j.ra4||!D.vopt?'AES':'ILRCK')+')',0:'UNLOCK',2:'reset'}); }});
  L.push({label:'PIC main loop (routine)', h:30, draw:laneSteps});
  L.push({label:'I2C RC3/RC4 (bit-banged)', h:26, draw:laneI2C});
  L.push({label:'FLAG,AUX_MODE', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>(flagAt(t)>>FL.AUX)&1,{1:css('--accent2'),0:css('--warn')},{1:'AUX (SRC to reference)',0:'bypass (reclocking DA)'}); }});
  L.push({label:'AES out (U3 → EL2099)', h:24, draw(c,X,t0,t1,y,h){ const mid=outAt((t0+t1)/2); stateBar(c,X,t0,t1,y,h,t=>{ const o=outAt(t); return !o.on?'off':!o.fs?'bad':o.audio?'ok':'mute'; },{off:css('--ink2'),bad:css('--bad'),ok:css('--accent'),mute:css('--warn')},{off:'no output (TXOFF/reset)',bad:'no valid clock',ok:'',mute:'clocked, audio invalid'}); if (mid.on&&mid.fs) SIM.pulses(c,X,t0,t1,y+h*0.3,h*0.5,1/mid.fs,0,0.5/mid.fs,css('--ink'),'out frames @ '+fk(mid.fs)); }});
  L.push({label:'Out C-bits byte 0 fs', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>{ const b=csAt(t).b0; return (b&0x80)? 'p'+(b&3) : 'c'; },{p1:css('--accent'),p2:css('--accent2'),p3:css('--warn'),p0:css('--ink2'),c:css('--ink2')},{p1:'pro · 48 kHz',p2:'pro · 44.1 kHz',p3:'pro · 32 kHz',p0:'pro · not indicated',c:'consumer / none'}); }});
  [['AUDIO LOCK (green)',0x40,'#3cbf4a'],['REF LOCK (yellow)',0x20,'#d9a400'],['ERROR (red)',0x80,'#e0402e']].forEach(([l,m,col])=>L.push({label:l, h:16, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>(pbAt(t)&m)?1:0,{1:col,0:'transparent'},{1:'on',0:''}); }}));
  return L;
}

/* ---------------- inspector ---------------- */
function dec3(v){ const t=['SRC out','serial in','AES rx','?'][(v>>3)&3]; return `TXOFF=${(v>>6)&1} AESBP=${(v>>5)&1} TXD=${t} SPD=${['SRC out','serial in','AES rx','?'][(v>>1)&3]} SRCD=${v&1?'AES rx':'serial in'}`; }
function dec4(v){ return `RUN=${(v>>6)&1} OUTC=${(v>>3)&1?'recovered input':'OMCK pin'} RXD=${['ILRCK','AES input','?','?'][v&3]}`; }
function inspector(t){
  const o=outAt(t), L=ledsAt(t), p=passAt(t), st=stepAt(t), x=txAt(t), cs=csAt(t), r1=regAt(R.mn,1,t), r6=regAt(R.mn,6,t);
  return `<table class="kv">
   <tr><th>Input</th><td class="mono">${mainPresent(t)?fk(D.main.fs):'none'} · U3 ${mainLocked(t)?'locked':'UNLOCK'}${!termOK(D.aterm)?' · CONF (term mismatch)':''}</td></tr>
   <tr><th>Reference</th><td class="mono">${runStart(R.rf,t)==null?'U2 in reset (RUN=0) — ':''}${refMode(t)==='aes'?'AES '+(refAESon(t)?fk(refAESfs()):'none'):'video → ML6431 '+(mlLocked(t)?'LOCKED '+fk(mlRate(t)):'unlocked')} · U2 ${refLocked(t)?'locked':'UNLOCK'}</td></tr>
   <tr><th>Output</th><td class="mono">${o.on? (o.fs? 'AES '+fk(o.fs) : 'no valid clock') : 'OFF'} — ${esc(o.why)}${o.ratio?` · ratio ${o.ratio.toFixed(3)}`:''}</td></tr>
   <tr><th>Out format</th><td class="mono">${r6&0x10?20:24} bit · dither ${r1&0x08?'off':'on'} · V=${(r1>>6)&1} · C byte0 ${hex(cs.b0)} (${cs.b0&0x80?FSNAME[cs.b0&3]:'consumer'}) · byte2 ${hex(cs.b2)}</td></tr>
   <tr><th>PIC</th><td class="mono">${p?'pass #'+p.i:'reset'} · ${st?st.fn:'—'} · MODE=${bin(p?p.MODE:0).slice(3)} · PORTA=${bin(PA(t)).slice(3)}</td></tr>
   <tr><th>I2C now</th><td class="mono small">${x? txLine(x) : 'idle'}</td></tr>
   <tr><th>LEDs</th><td class="mono">AUDIO ${L.aud?'●':'○'} · REF ${L.ref?'●':'○'} · ERROR ${L.err?'●':'○'}</td></tr></table>`;
}
function traceHTML(){
  const e=D.log[0];
  if (!e) return '<div class="muted">Click a connector on the rear module, a jumper on the board, or use the controls. Each action re-runs the firmware for the whole second and lists the real routine and register traffic.</div>';
  let h=`<div><b>${e.name}</b></div>`+e.tr.map(s=>`<div>→ ${s}</div>`).join('');
  const at = e.at!=null? e.at : 0;
  const lines = traceFrom(at, e.at!=null? 10 : 14, e.at!=null);
  return h+`<div class="muted" style="margin-top:4px">${e.at!=null?'Firmware after the event:':'Firmware from power-on (init, preset_chips, set_ routines):'}</div>`+lines.map(s=>`<div>${s}</div>`).join('');
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML=`${card('D8207 board (from D8207.PCB) — jumpers are live', `<div id="bd"></div>`)}
   <div class="grid2"><div>${card('Front edge and rear module', `<div style="display:flex;gap:12px;flex-wrap:wrap"><div id="fp" style="flex:0 0 260px"></div><div id="rp" style="flex:1;min-width:220px;max-width:340px"></div></div>`)}${card('Signals, variant, firmware', `<div id="ct"></div>`)}${card('Jumpers (PORTA RA0–RA4) and berg headers', `<div id="jp"></div>`)}</div>
   <div>${card('What the firmware did', `<div id="tr" class="log" style="max-height:380px"></div>`)}${card('State at the playhead', `<div id="in"></div>`)}</div></div>
   ${card('Timeline — the first second after power-on', `<canvas id="tl"></canvas><p class="small muted">PIC16C73A on X1 = 4.9152 MHz (${(TCY*1e6).toFixed(4)} µs/instruction). Every I2C byte is bit-banged through TRISC: ≈37 instructions per bit, ${CYB} per byte, so RDBYTE_M ≈ ${SIM.fmtDur(C_RD*TCY)}, WRBYTE_M ≈ ${SIM.fmtDur(C_WR*TCY)}, MDFBYTE_M ≈ ${SIM.fmtDur((C_RD+C_WR)*TCY)}. A main-loop pass is ≈ ${SIM.fmtDur(avgPass())}. Instruction counts are from the listing; lock times ${inf}.</p>`)}
   ${card('Action log', `<div id="lg" class="log"></div>`)}`;
  const ct=m.querySelector('#ct');
  SIM.on('time',()=>{ const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(t); m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t);
    if (ct.dataset.k!==ctlKey()){ ct.innerHTML=controlsHTML(); ct.dataset.k=ctlKey(); bindControls(m); }
    const jp=m.querySelector('#jp'); if (jp.dataset.k!==jKey()){ jp.innerHTML=jumperHTML(); jp.dataset.k=jKey(); bindJumpers(m); }
    bindPanel(m);
    const tr=m.querySelector('#tr'); if (tr.dataset.k!==String(D.log.length)+D.log[0]?.name){ tr.innerHTML=traceHTML(); tr.dataset.k=String(D.log.length)+D.log[0]?.name; }
    m.querySelector('#in').innerHTML=inspector(t);
    m.querySelector('#lg').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:170}); });
}
const ctlKey=()=>JSON.stringify([D.main,D.ref,D.video,D.frame,D.variant,D.vopt,D.rear,D.fw,D.fault,D.refsrc]);
const jKey=()=>JSON.stringify([D.j,D.aterm,D.rterm,D.refsrc,D.refout,D.live,D.vopt,D.ev.length,Math.round(SIM.t*200)]);
function avgPass(){ if (!R || R.passes.length<3) return 0.006; const P=R.passes.filter(p=>p.t1&&!p.restart).slice(12); if (!P.length) return 0.006; return P.reduce((a,p)=>a+(p.t1-p.t0),0)/P.length; }

/* ---------- One second, frame by frame ---------- */
function drawAES(cv,t){
  const {c,w,h}=SIM.canvas(cv,150), o=outAt(t), css=SIM.css;
  c.fillStyle=css('--ink'); c.font='12px '+css('--mono');
  if (!o.on || !o.fs){ c.fillText('No AES output at the playhead: '+o.why, 8, 20); return; }
  const fs=o.fs, n=Math.floor(t*fs), k=n%192, cs=csAt(t), r1=regAt(R.mn,1,t), word=(regAt(R.mn,6,t)&0x10)?20:24;
  let s = o.audio? Math.round(Math.sin(2*Math.PI*1000*n/fs)*0.1*8388607) : 0;      // 1 kHz −20 dBFS test tone (inferred source)
  if (word===20) s = s & ~0xF;
  const bits=[]; for (let i=0;i<24;i++) bits.push((s>>i)&1);
  const cbyte = k===0||k<8? cs.b0 : (k>=16&&k<24)? cs.b2 : 0; const cbit = (cbyte>>(7-(k&7)))&1;
  const V=(r1>>6)&1, U=0; let P=(bits.reduce((a,b)=>a+b,0)+V+U+cbit)&1;
  const all=[...bits,V,U,cbit,P];
  const pre = k===0? [1,1,1,0,1,0,0,0] : [1,1,1,0,0,0,1,0];      // Z (block start) or X
  const half=[...pre]; let lv=pre[7];
  all.forEach(b=>{ lv^=1; half.push(lv); if (b) lv^=1; half.push(lv); });
  const x0=10, cw=(w-20)/64, yH=40, yL=80;
  c.strokeStyle=css('--accent'); c.lineWidth=2; c.beginPath();
  half.forEach((v,i)=>{ const x=x0+i*cw, y=v?yH:yL; if (i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.font='10px '+css('--mono'); c.fillStyle=css('--ink2');
  const lbl=[[0,8,k===0?'Z preamble':'X preamble'],[8,16,'aux 0–3 (LSBs)'],[16,56,`audio ${word===20?'20 bit (aux LSBs = 0)':'24 bit'}`],[56,58,'V='+V],[58,60,'U'],[60,62,'C='+cbit],[62,64,'P']];
  lbl.forEach(([a,b,l])=>{ c.fillText(l, x0+a*cw+2, 104); c.fillRect(x0+a*cw,92,1,8); });
  c.fillStyle=css('--ink'); c.fillText(`frame ${n} · block frame ${k} · subframe A · ${fk(fs)} · bit cell ${SIM.fmtDur(1/(fs*64))} · C byte ${k>>3} = ${hex(cbyte)}`, 8, 18);
  c.fillText(`sample = ${s} (${o.audio?'1 kHz −20 dBFS tone '+'(inferred source)':'muted'})`, 8, 130);
}
function drawI2C(cv,t){
  const {c,w}=SIM.canvas(cv,130), css=SIM.css, x=txAt(t);
  c.font='12px '+css('--mono'); c.fillStyle=css('--ink');
  if (!x){ c.fillText('I2C idle at the playhead (SCL and SDA released high). Step with “1 I2C byte” or zoom to 1 ms.',8,20); return; }
  const a=ADR[x.dev]; const bytes = x.kind==='W'? [[a,'addr W'],[x.map,'MAP'],[x.v,'data']] : x.kind==='W1'? [[a,'addr W'],[x.v,'data']] : [[a,'addr W'],[x.map,'MAP'],null,[a|1,'addr R'],[x.v,'data (RX)']];
  const dur=x.t1-x.t0, X=tt=>8+(tt-x.t0)/dur*(w-16);
  let tt=x.t0+CYS*TCY; c.strokeStyle=css('--ink2'); c.lineWidth=1;
  const segs=[];
  bytes.forEach(b=>{ if (!b){ tt+=(CYP+CYS)*TCY; return; } const bd=(b[1]==='data (RX)'?CYRX:CYB)*TCY; segs.push([tt,tt+bd,b]); tt+=bd; });
  c.fillText(txLine(x).replace(/<[^>]+>/g,''),8,16);
  segs.forEach(([s0,s1,b])=>{ const bw=(s1-s0)/9; c.fillStyle=css('--chip'); c.fillRect(X(s0),26,X(s1)-X(s0)-2,18); c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${b[1]} ${hex(b[0])}`,X(s0)+3,39);
    for (let i=0;i<9;i++){ const bit = i<8? (b[0]>>(7-i))&1 : (b[1]==='data (RX)'?1:(x.nack?1:0)); const xa=X(s0+i*bw), xb=X(s0+(i+1)*bw);
      c.strokeStyle=css('--accent2'); c.beginPath(); c.moveTo(xa,100); c.lineTo(xa+(xb-xa)*0.35,100); c.lineTo(xa+(xb-xa)*0.35,82); c.lineTo(xa+(xb-xa)*0.75,82); c.lineTo(xa+(xb-xa)*0.75,100); c.lineTo(xb,100); c.stroke();
      c.strokeStyle=css('--accent'); c.beginPath(); c.moveTo(xa,bit?52:70); c.lineTo(xb,bit?52:70); c.stroke(); c.fillStyle=css('--ink2'); c.font='9px '+css('--mono'); if (xb-xa>9) c.fillText(i<8?bit:'A',xa+2,64); } });
  c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('SDA (RC4)',8,49); c.fillText('SCL (RC3)',8,114);
  const px=X(t); c.strokeStyle=css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(px,22); c.lineTo(px,108); c.stroke();
}
function viewSecond(m){
  m.innerHTML=`${card('One second in slow motion', `<p class="small">t = 0 is power-on. The PIC runs <span class="mono">init</span> (≈${SIM.fmtDur(initDur())}: reset pulse, <span class="mono">preset_chips</span> writes ${R?R.tx.filter(x=>x.fn==='preset_chips').length:0} registers over bit-banged I2C), then the main loop forever. Use <b>Zoom window</b> and the step units (pass, I2C byte, AES frame) to slow down further.</p><canvas id="tl"></canvas>`)}
   <div class="grid2"><div>${card('AES3 output subframe at the playhead (biphase-mark)', `<canvas id="aes"></canvas>`)}</div><div>${card('I2C transaction at the playhead (SDA/SCL)', `<canvas id="i2c"></canvas>`)}</div></div>
   ${card('Main-loop passes in the zoom window', `<div id="pt" class="scroll" style="max-height:360px"></div>`)}`;
  SIM.on('time',()=>{ const t=SIM.t; SIM.drawLanes(m.querySelector('#tl'),lanes(true),{labelW:170}); drawAES(m.querySelector('#aes'),t); drawI2C(m.querySelector('#i2c'),t);
    const [a,b]=SIM.window(); const P=R.passes.filter(p=>p.t1>=a && p.t0<=b).slice(0,40);
    m.querySelector('#pt').innerHTML=`<table class="kv"><tr><th>#</th><th>start</th><th>length</th><th>I2C</th><th>FLAG at start</th><th>what happened</th></tr>${P.map(p=>{ const xs=R.tx.slice(p.n0,p.n1); const ws=xs.filter(x=>x.kind!=='R'&&!x.fn.startsWith('tls_next')).map(x=>x.fn); const u=[...new Set(ws)];
      return `<tr class="${t>=p.t0&&t<p.t1?'hl':''}"><td class="mono">${p.i}</td><td class="mono">${(p.t0*1e3).toFixed(2)} ms</td><td class="mono">${SIM.fmtDur(p.t1-p.t0)}</td><td class="mono">${xs.length}</td><td class="mono small">${FLN.filter((n,i)=>p.FLAG&(1<<i)).join(' ')||'—'}</td><td class="small">${p.restart?'<b style="color:var(--bad)">ERR_1 → goto start</b> ':''}${u.join(', ')||'polling only'}</td></tr>`; }).join('')}</table>`; });
}
function initDur(){ if(!R) return 0; const s=R.steps.find(s=>s.fn==='init'); return s? s.t1-s.t0 : 0; }

/* ---------- Block diagram ---------- */
const BLK = [
  {id:'ain', x:10, y:40, w:120, h:46, t:'AES AUDIO IN', s:'rear: BNC “5” / TB 1–2', info:'Input 2 in the functional description. 0.2–7 V p-p, 22–96 kHz. AUDIO TERM berg: 75 / 110 / HiZ.'},
  {id:'aterm', x:150, y:40, w:110, h:46, t:'AUDIO TERM + T7', s:'75 · 110 · HiZ', info:'Jumper JMP2X3 “AUDIO TERM” (PCB x 9825–10025) across the input transformer T7 (DA_TR) '+inf+'. A mismatch gives reflections → CS8420 CONF error → red LED (model).'},
  {id:'mn', x:290, y:30, w:150, h:70, t:'U3 CS8420 “MN8420”', s:'I2C 0x20 · SRC / transceiver', info:'Main sample-rate converter. Reg 3 (Data Flow) chooses SRC (0x01) or bypass (0x15); reg 4 (Clock Source) 0x41 = output from OMCK (reference), 0x49 = from recovered input. Reg 1 dither + VSET, reg 6 word length, reg 0x12 C-buffer control, C-data bytes 0x20/0x22.'},
  {id:'drv', x:470, y:30, w:110, h:70, t:'U4 EL2099 + R21–R25', s:'75R (/75) · 110R (/110)', info:'Output driver into T2, T4, T5, T6 (PE65612 on the /110) and the rear module. D8207.EXP lists OUT 1–4 and *OUT 5, *OUT 6 (optional).'},
  {id:'outs', x:610, y:30, w:110, h:70, t:'DIGITAL OUT 1–4', s:'+ monitor (T8 → TRS)', info:'Four AES outputs on BNC1/BNC3/TB8205P, plus the ¼″ DIGITAL MONITOR jack on the front edge (110 Ω).'},
  {id:'rin', x:10, y:150, w:120, h:46, t:'AES REF IN', s:'EXT (rear) or LCL (frame bus)', info:'Input 1. REF header (2×4 berg): EXT / LCL / OUT. OUT drives the MF82 frame reference bus for the other cards (D8207MAN).'},
  {id:'rterm', x:150, y:150, w:110, h:46, t:'REF TERM + T1', s:'75 · 110 · HiZ', info:'Jumper JMP2X3 “REF TERM” (PCB x 10950–11150). The firmware only reads the reference UNLOCK bit, never its CONF bit.'},
  {id:'ref', x:290, y:140, w:150, h:70, t:'U2 CS8420 “REF8420”', s:'I2C 0x22 · reference receiver', info:'Audio mode: reg 3 = 0x55 (TXOFF, AES rx), reg 4 = 0x49 (PLL on AES input). Video mode: reg 3 = 0x4A, reg 4 = 0x48 (PLL on ILRCK from the ML6431). Its recovered master clock clocks the main chip\'s OMCK '+inf+' (from the register settings; the net is not in the extracted DSN text).'},
  {id:'vin', x:10, y:250, w:120, h:46, t:'VIDEO REF IN', s:'BNC “6” / frame BNC', info:'D8207V only. NTSC, 1 V p-p, 75 Ω. In 110 Ω installs the card must be in the right-hand slot and use the frame reference BNC (D8207MAN).'},
  {id:'ml', x:150, y:250, w:150, h:56, t:'U5 ML6431 + X2 3.58 MHz', s:'I2C 0xB2 · genlock', info:'preset: 0x70 “Enable Audio on pin 16”, 0x80 48K, 0xA2 “NTSC 601 Standard”. JMP_48_44 → 0x80/0x81. LOCKED → PORTC,2; NO_SIGNAL → PORTC,1 (never read). Writes use TX_WA, which ignores the ACK — so a plain D8207 without U5 does not trip ERR_1.'},
  {id:'pic', x:470, y:150, w:150, h:80, t:'U1 PIC16C73A', s:'X1 4.9152 MHz · d8207_v1.asm', info:'Bit-banged I2C master on RC3/RC4. Reads 5 jumpers on RA0–RA4, drives the 3 LEDs on RB5–RB7 and the two CS8420 resets on RB2/RB3. No interrupts (vector = retfie).'},
  {id:'jmp', x:640, y:150, w:90, h:80, t:'Jumpers', s:'RA0–RA4', info:'H1X3 headers on RA0–RA4. H1 and 48K\\44K1 are fitted only on the D8207V (assembly note 3).'},
  {id:'led', x:640, y:250, w:90, h:56, t:'LEDs', s:'GRN · YEL · RED', info:'L1 AUDIO LOCK (RB6), L2 REF LOCK (RB5, flashes when SRC is off), L4 ERROR (RB7 = CONF | BIP).'},
  {id:'pwr', x:470, y:260, w:150, h:46, t:'Power', s:'±21 V → LM2825 +5 · 79L05 −5', info:'Power requirements +21 V 100 mA, −21 V 75 mA (spec). REG1 LM2825 DIP24 DC/DC, REG2 79L05 (DSN symbol says LH0070).'},
];
const BWIRE = [['ain','aterm'],['aterm','mn'],['mn','drv'],['drv','outs'],['rin','rterm'],['rterm','ref'],['ref','mn','OMCK'],['vin','ml'],['ml','ref','ILRCK'],['pic','mn','I2C'],['pic','ref','I2C'],['pic','ml','I2C'],['jmp','pic'],['pic','led']];
function blockState(id,t){
  const o=outAt(t);
  switch(id){ case 'ain': return mainPresent(t); case 'mn': return mainLocked(t); case 'outs': case 'drv': return o.on&&!!o.fs; case 'rin': return refAESon(t);
    case 'ref': return refLocked(t); case 'vin': return D.vopt? videoOn(t) : null; case 'ml': return D.vopt? mlLocked(t) : null; case 'pic': return true; case 'led': return ledsAt(t).aud; case 'pwr': return true;
    case 'aterm': return termOK(D.aterm); case 'rterm': return termOK(D.rterm); default: return null; }
}
let blkSel='mn';
function blockSVG(t){
  const B=Object.fromEntries(BLK.map(b=>[b.id,b]));
  let s=`<svg viewBox="0 0 740 320" style="width:100%"><defs><marker id="d7ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>`;
  BWIRE.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; const x1=A_.x+A_.w, y1=A_.y+A_.h/2, x2=B_.x, y2=B_.y+B_.h/2;
    let d; if (a==='pic'){ const xa=A_.x+A_.w/2; d=`M${xa},${A_.y} L${xa},${B_.y+B_.h+8} L${B_.x+B_.w/2},${B_.y+B_.h+8} L${B_.x+B_.w/2},${B_.y+B_.h}`; }
    else if (a==='ref'&&b==='mn') d=`M${A_.x+A_.w/2},${A_.y} L${B_.x+B_.w/2},${B_.y+B_.h}`;
    else if (a==='ml'&&b==='ref') d=`M${A_.x+A_.w/2+40},${A_.y} L${A_.x+A_.w/2+40},${B_.y+B_.h/2+20} L${B_.x},${B_.y+B_.h/2+20}`;
    else if (a==='jmp') d=`M${A_.x},${A_.y+A_.h/2} L${B_.x+B_.w},${B_.y+B_.h/2}`;
    else if (a==='pic'&&b==='led') d='';
    else d=`M${x1},${y1} L${x2},${y2}`;
    if (a==='pic'&&b==='led') d=`M${A_.x+A_.w},${A_.y+A_.h-10} L${B_.x},${B_.y+B_.h/2}`;
    s+=`<path d="${d}" fill="none" stroke="var(--ink2)" stroke-width="1.3" marker-end="url(#d7ar)"/>${l?`<text font-size="9.5" fill="var(--ink2)" x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}">${l}</text>`:''}`; });
  BLK.forEach(b=>{ const st=blockState(b.id,t); const col = st===true?'var(--accent)':st===false?'var(--bad)':'var(--line)';
    s+=`<g class="d7blk" data-id="${b.id}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" fill="var(--panel2)" stroke="${b.id===blkSel?'var(--accent2)':col}" stroke-width="${b.id===blkSel?3:2}"/><text x="${b.x+b.w/2}" y="${b.y+18}" font-size="11.5" font-weight="700" text-anchor="middle" fill="var(--ink)">${b.t}</text><text x="${b.x+b.w/2}" y="${b.y+34}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${b.s}</text></g>`; });
  return s+'</svg>';
}
function viewBlock(m){
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block) — green = active/locked, red = not', `<div id="bk"></div>`)}</div><div>${card('Block detail', `<div id="bi"></div>`)}${card('Signal path at the playhead', `<div id="sp"></div>`)}</div></div>${card('Controls', `<div id="ct"></div>`)}`;
  const ct=m.querySelector('#ct'); ct.innerHTML=controlsHTML(); bindControls(m);
  SIM.on('time',()=>{ const t=SIM.t, o=outAt(t);
    m.querySelector('#bk').innerHTML=blockSVG(t);
    m.querySelectorAll('.d7blk').forEach(g=>g.onclick=()=>{ blkSel=g.dataset.id; SIM.refresh(); });
    const b=BLK.find(x=>x.id===blkSel); m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p class="small">${b.info}</p><p class="small mono">state: ${blockState(b.id,t)===true?'active':blockState(b.id,t)===false?'inactive':'—'}</p>`;
    const ctl=ct.dataset.k; if (ctl!==ctlKey()){ ct.innerHTML=controlsHTML(); ct.dataset.k=ctlKey(); bindControls(m); }
    m.querySelector('#sp').innerHTML=`<ol class="small">
      <li>Input ${mainPresent(t)?fk(D.main.fs):'absent'} through AUDIO TERM ${D.aterm} (${termOK(D.aterm)?'matched':'MISMATCH → CONF'})</li>
      <li>U3 receiver ${mainLocked(t)?'locked':'unlocked'}; data flow reg 3 = ${hex(regAt(R.mn,3,t))} (${dec3(regAt(R.mn,3,t))})</li>
      <li>Clock source reg 4 = ${hex(regAt(R.mn,4,t))} (${dec4(regAt(R.mn,4,t))})</li>
      <li>Reference: ${refMode(t)==='aes'?'AES via '+D.refsrc:'ML6431 ILRCK'} → U2 ${refLocked(t)?'locked at '+fk(refRate(t)):'unlocked'}</li>
      <li>Output: ${o.on?(o.fs?fk(o.fs):'invalid clock'):'off'} — ${esc(o.why)}</li></ol>`; });
}

/* ---------- Schematics (redrawn) ---------- */
function ic(x,y,w,ref,name,L,Rr,rowH){ rowH=rowH||16; const n=Math.max(L.length,Rr.length), h=n*rowH+28;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.3"/><text x="${x+w/2}" y="${y+14}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--ink)">${ref} ${name}</text>`;
  L.forEach((p,i)=>{ const yy=y+28+i*rowH; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[1]}</text><text x="${x-4}" y="${yy-3}" font-size="8.5" text-anchor="end" fill="var(--ink2)">${p[0]}</text>${p[2]?`<text x="${x-34}" y="${yy+4}" font-size="9.5" text-anchor="end" fill="var(--accent2)">${p[2]}</text>`:''}`; });
  Rr.forEach((p,i)=>{ const yy=y+28+i*rowH; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="9.5" text-anchor="end" fill="var(--ink)">${p[1]}</text><text x="${x+w+4}" y="${yy-3}" font-size="8.5" fill="var(--ink2)">${p[0]}</text>${p[2]?`<text x="${x+w+34}" y="${yy+4}" font-size="9.5" fill="var(--accent2)">${p[2]}</text>`:''}`; });
  return s; }
function sheet(title, body, h){ return `<svg viewBox="0 0 900 ${h}" style="width:100%"><rect x="1" y="1" width="898" height="${h-2}" fill="none" stroke="var(--line)"/><text x="10" y="18" font-size="12" font-weight="700" fill="var(--ink)">${title}</text><text x="890" y="${h-8}" font-size="9" text-anchor="end" fill="var(--ink2)">REDRAWN for the simulator — not the original OrCAD D8207.DSN</text>${body}</svg>`; }
function viewSchem(m){
  const t=SIM.t;
  const s1 = sheet('Sheet 1 — Controller (DSN PAGE3): U1, X1, LEDs, jumpers',
    ic(250,40,170,'U1','PIC16C73A',[[2,'RA0','20\\24 BIT'],[3,'RA1','DITHER ON\\OFF'],[4,'RA2','SRC ON\\OFF'],[5,'RA3','48K\\44K1 (V)'],[6,'RA4','H1 AES/VIDEO (V)'],[7,'RA5','ERR_REF_SRC (unused)'],[9,'OSC1','X1 4M9152 + C1 22p'],[10,'OSC2','C2 22p'],[1,'MCLR','+5VD'],[20,'VDD','+5VD'],['8,19','VSS','GND']],
      [[28,'RB7','LED_ERROR → L4 RED'],[27,'RB6','LED_AUDIO_LOCK → L1 GRN'],[26,'RB5','LED_REF_LOCK → L2 YEL'],[25,'RB4','ERR_MN_SRC (input, unused)'],[24,'RB3','RST_REF_SRC → U2 RST'],[23,'RB2','RST_MN_SRC → U3 RST'],[15,'RC4','SDA/CDOUT (I2C)'],[14,'RC3','SCL (I2C)'],[13,'RC2','LOCKED ← U5'],[12,'RC1','NOSIG ← U5 (unused)']],18)
    +`<text x="20" y="300" font-size="10" fill="var(--ink2)">R1, R2, R3 = 330R LED resistors; R4–R8 = 2k jumper pull-ups ${'(role inferred)'}; R35 2k; R33/R34 2K and R36/R37 4K7 near the I2C lines ${'(role inferred)'}.</text>
      <text x="20" y="316" font-size="10" fill="var(--ink2)">Pin numbers: standard PIC16C7x 28-pin pinout ${'(inferred, datasheet not in the archive)'}; port bits from the EQUs in d8207_v1.asm. Socket silk reads PIC16C63.</text>`, 350);
  const s2 = sheet('Sheet 2 — Main AES path (DSN PAGE1): input, U3, driver, outputs, monitor',
    ic(230,40,190,'U3','CS8420 (MN8420, AD 0x20)',[['','RXP/RXN','← T7 ← AUDIO TERM ← AES IN'],['','OMCK','← U2 RMCK (inferred)'],['','SDA/CDOUT','RC4'],['','SCL/CCLK','RC3'],['','RST','RB2'],['','AD0/AD1','address 0x20']],
      [['','TXP/TXN','→ U4 EL2099'],['','INT/ERR','RB4 (unused)'],['','SDOUT/OLRCK','serial port, reg 6']],18)
    +`<g font-size="10" fill="var(--ink)"><text x="560" y="80">U4 EL2099 → R21–R25 (75R; 110R on /110)</text><text x="560" y="96">→ T2, T4, T5, T6 (DA_TR; PE65612 on /110)</text><text x="560" y="112">→ OUT 1–4, *OUT 5, *OUT 6 (EXP, optional)</text><text x="560" y="136">T8 → DIGITAL MONITOR (HDST jack, T/R/S)</text>
      <text x="20" y="184">AUDIO TERM (2×3 berg): 75 → 75R · 110 → 110R · HiZ → none (resistor refs inferred).</text><text x="20" y="200">Values on PAGE1: R16 510R, R18/R19 620R, R17 47R, R15/R34 2K, R20/R29 110R, R11 1K78, R12 3M (3M3 on /V), C6 0.47, C7 8200pF.</text>
      <text x="20" y="216" fill="var(--ink2)">Connections between named parts are inferred from the PCB placement (T7 beside AUDIO TERM, T8 beside the jack) and from the register settings; the binary DSN gave part lists, not nets.</text></g>`, 240);
  const s3 = sheet('Sheet 3 — Reference and video (DSN PAGE2): U2, U5, X2, REF header',
    ic(220,40,190,'U2','CS8420 (REF8420, AD 0x22)',[['','RXP/RXN','← T1 ← REF TERM ← REF hdr'],['','ILRCK','← U5 pin 16 audio clock'],['','SDA/SCL','RC4/RC3'],['','RST','RB3']],[['','RMCK','→ U3 OMCK*'],['','TX','off (TXOFF=1)'],['','INT/ERR','RA5 unused']],18)
    +ic(690,60,120,'U5','ML6431 (V)',[['','VIDEO IN','VIDEO TERM/FRAME'],['','XTAL','X2 3M58'],['','SDA/SCL','I2C 0xB2']],[['16','AUDIO CLK','→ U2 ILRCK'],['','LOCKED','→ RC2'],['','NOSIG','→ RC1']],18)
    +`<g font-size="10" fill="var(--ink)"><text x="20" y="200">REF header (2×4 berg, “BERG”): row OUT (drive frame bus, REF_OUT via T3 inferred) · LCL (frame bus) · EXT (rear termination).</text><text x="20" y="216">REF TERM (2×3): 75 / 110 / HiZ. * = inferred from the register settings. Loop filter parts near U5: R9 1K78, R10 3M (3M3 on /V), C3 0.47, C4 8200pF, R13/R31 2R2.</text></g>`, 240);
  const s4 = sheet('Sheet 4 — Power (DSN PAGE3)', `<g font-size="10.5" fill="var(--ink)"><text x="20" y="50">P1 (EDGE30/156) +21 V → L1 1µH → C12 220µ/35 → REG1 LM2825 (DIP24 DC/DC) → +5VD (C13 10µ/35)</text><text x="20" y="70">P1 −21 V → R32 22R → REG2 79L05 → −5 V for the EL2099 (inferred) · DSN symbol for REG2 says LH0070, EXP says MC79L05, silk says 79L05</text><text x="20" y="90">Spec: +21 V 100 mA max, −21 V 75 mA max (functional description).</text></g>`, 110);
  m.innerHTML = card('Schematic set — redrawn from D8207.EXP, D8207.DSN part lists, D8207.PCB and the asm port map', `<p class="small muted">These are redrawn sheets. Part references and values are from the archive; nets the binary OrCAD file did not yield are marked inferred.</p>${s1}${s2}${s3}${s4}`)
    + card('Part list (D8207.EXP, Aug 31 1999)', `<table class="kv small"><tr><th>Page</th><th>Parts</th></tr><tr><td>1</td><td>U3 CS8420, U4 EL2099, T2 T4–T8 DA_TR, R21–R25 75R, R16 510R, R18/R19 620R, R17 47R, R20/R29 110R, R15/R34 2K, R11 1K78, R12 3M, R14 2R2, R37 4K7, C6 0.47, C7 8200pF, DIGITAL MONITOR (HDST)</td></tr><tr><td>2</td><td>U2 CS8420, U5 ML6431, X2 3.58, T1 T3 DA_TR, R9 1K78, R10 3M, R13/R31 2R2, R26 110R, R27/R28 75R, R33 2K, R36 4K7, C3 0.47, C4 8200pF, REF header 4×2</td></tr><tr><td>3</td><td>U1 PIC16C63, X1 4M915, REG1 LM2825, REG2 MC79L05, L1 1µH, C12 220/35, C13 10/35, R1–R3 330R, R4–R8 2k, R32 22R, R35 2k, C1/C2 22p, LEDs AUDIO LOCK / REF LOCK / ERROR, H1, 3× HDJMP2x4</td></tr><tr><td>“1” (2nd)</td><td>AES3 AUDIO IN, AES3 REFERENCE, OUT 1–4, *OUT 5, *OUT 6, VIDEO REFERENCE FRAME/TERM INPUT, AES MONITOR, 2 transformers, CON3 ×2 — and seven “R7 20K0” + AMP-FUNC3 symbols (a copied page)</td></tr></table>`);
}

/* ---------- Software ---------- */
const LOOP = [['init','init: reset chips, preset_chips, set_ by PORTA'],['test_lock_state','RD REF 0x10 · RD MN 0x10 · LEDs · TXOFF · V bit · AUX/bypass'],['test_jmp_state','PORTA & 0x1F vs MODE, 8-pass debounce'],['REF_channel_status','AUX: read ref C-bytes 0x20–0x24 on DETC'],['MN_channel_status','AUX + pro input: rewrite fs and word length'],['delay','256 × 6 cycles ≈ '+SIM.fmtDur(C_DELAY*TCY)]];
function loopSVG(t){
  const st=stepAt(t), cur=st?st.fn:'';
  let s='<svg viewBox="0 0 760 120" style="width:100%">'; LOOP.forEach(([n,d],i)=>{ const x=8+i*125; const on=n===cur;
    s+=`<rect x="${x}" y="20" width="115" height="60" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+57}" y="40" font-size="10.5" font-weight="700" text-anchor="middle" fill="${on?'#fff':'var(--ink)'}">${n}</text><foreignObject x="${x+3}" y="44" width="109" height="36"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:8.5px;line-height:1.15;text-align:center;color:${on?'#fff':'var(--ink2)'}">${d}</div></foreignObject>${i<LOOP.length-1?`<path d="M${x+115},50 L${x+125},50" stroke="var(--ink2)"/>`:''}`; });
  return s+`<path d="M${8+5*125+57},80 L${8+5*125+57},105 L${8+125+57},105 L${8+125+57},80" fill="none" stroke="var(--ink2)" marker-end="url(#d7ar2)"/><defs><marker id="d7ar2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs><text x="380" y="116" font-size="9.5" text-anchor="middle" fill="var(--ink2)">goto main (clrwdt) · ERR_1 in test_lock_state → goto start</text></svg>`;
}
function bitsRow(v,names,cur){ return `<table class="kv mono small"><tr>${[7,6,5,4,3,2,1,0].map(i=>`<th>${names[i]||'b'+i}</th>`).join('')}</tr><tr>${[7,6,5,4,3,2,1,0].map(i=>`<td style="${(v>>i)&1?'background:color-mix(in srgb,var(--accent) 30%,transparent)':''}">${(v>>i)&1}</td>`).join('')}</tr></table>`; }
function smSVG(states, cur, title){ let s=`<svg viewBox="0 0 460 70" style="width:100%;max-width:620px">`; states.forEach(([id,l],i)=>{ const x=6+i*150, on=id===cur; s+=`<rect x="${x}" y="14" width="135" height="40" rx="18" fill="${on?'var(--accent2)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+67}" y="38" text-anchor="middle" font-size="9" fill="${on?'#fff':'var(--ink)'}" textLength="${Math.min(125,l.length*5.2)}">${l}</text>${i<states.length-1?`<path d="M${x+135},34 L${x+150},34" stroke="var(--ink2)"/>`:''}`; }); return s+`<text x="4" y="66" font-size="9" fill="var(--ink2)">${title}</text></svg>`; }
function regTable(ch,t,maps){ return `<table class="kv mono small"><tr><th>reg</th><th>name ${'(CS8420 datasheet, inferred)'}</th><th>value</th><th>decoded</th></tr>${maps.map(([mp,n,f])=>{ const v= mp===0x20? (ch===R.mn? csAt(t).b0 : 0) : mp===0x22? (ch===R.mn? csAt(t).b2:0) : regAt(ch,mp,t); return `<tr><td>${hex(mp)}</td><td>${n}</td><td>${hex(v)} <span class="muted">${bin(v)}</span></td><td>${f?f(v):''}</td></tr>`; }).join('')}</table>`; }
function viewSoft(m){
  m.innerHTML=`${card('Main loop (d8207_v1.asm, ORG 0x100) — highlighted at the playhead', `<div id="lp"></div><p class="small">No interrupts (the vector at 0x004 is a bare <span class="mono">retfie</span>). One pass = two status reads + one read-modify-write (≈ ${SIM.fmtDur((2*C_RD+C_RD+C_WR)*TCY)}) + <span class="mono">delay</span> + whatever the channel-status handshake needs, ≈ ${SIM.fmtDur(avgPass())} on average. The SSP is set up (SSPCON = 0x3B) but every I2C bit is bit-banged by toggling TRISC.</p>`)}
   <div class="grid2"><div>${card('FLAG register (0x20) at the playhead', `<div id="fl"></div>`)}${card('MODE register and PORTA', `<div id="md"></div>`)}${card('State machines', `<div id="sm"></div>`)}</div>
   <div>${card('MN8420 (U3) registers at the playhead', `<div id="rm"></div>`)}${card('REF8420 (U2) and ML6431', `<div id="rr"></div>`)}</div></div>
   ${card('I2C cost per routine (instruction counts from the listing)', `<table class="kv small"><tr><th>Routine</th><th>Bytes</th><th>Cycles</th><th>Time @ 4.9152 MHz</th></tr>
     <tr><td class="mono">BSTART / BSTOP</td><td>—</td><td>${CYS} / ${CYP}</td><td>${SIM.fmtDur(CYS*TCY)} / ${SIM.fmtDur(CYP*TCY)}</td></tr>
     <tr><td class="mono">TX (8 bits + ACK via BITOUT/BITIN)</td><td>1</td><td>≈${CYB}</td><td>${SIM.fmtDur(CYB*TCY)} (SCL ≈ ${(1/(37*TCY)/1000).toFixed(1)} kHz)</td></tr>
     <tr><td class="mono">WRBYTE_M</td><td>3</td><td>≈${C_WR}</td><td>${SIM.fmtDur(C_WR*TCY)}</td></tr><tr><td class="mono">RDBYTE_M</td><td>2 + 2</td><td>≈${C_RD}</td><td>${SIM.fmtDur(C_RD*TCY)}</td></tr>
     <tr><td class="mono">MDFBYTE_M</td><td>RD + WR</td><td>≈${C_RD+C_WR}</td><td>${SIM.fmtDur((C_RD+C_WR)*TCY)}</td></tr><tr><td class="mono">WRBYTE (ML6431, TX_WA, no ACK check)</td><td>2</td><td>≈${C_W1}</td><td>${SIM.fmtDur(C_W1*TCY)}</td></tr>
     <tr><td class="mono">init (this run)</td><td>${R.tx.filter(x=>x.t0<initDur()+OST).length} transactions</td><td></td><td>${SIM.fmtDur(initDur())}</td></tr></table><p class="small muted">The BSTART comment “Timing adjustment, 1.5uS @2MHz” and the “Device address (1010xxx0)” / keypad variables show this I2C layer was lifted from a Microchip 24LCxx EEPROM application note ${inf}.</p>`)}
   ${card('V1.00 → V1.01 (diff of the two .asm files and the .$$$ backups)', `<table class="kv small"><tr><th>Where</th><th>V1.00 (Sep 15 1999)</th><th>V1.01 (Nov 15 1999)</th></tr>
     <tr><td class="mono">tst_mn_lck</td><td>LED_AUDIO_LOCK = !UNLOCK, nothing else</td><td>UNLOCK → shut_off_AES_output once, reload shut_off_AES_cnt = 16; locked → count down, then shut_on_AES_output</td></tr>
     <tr><td class="mono">set_main8420_bypass / aux_synh</td><td>WRBYTE_M reg 3</td><td>MDFBYTE_M reg 3, MASK 0xBF (keep TXOFF)</td></tr>
     <tr><td class="mono">set_main8420_bypass</td><td>writes reg 0x12 = 0 (C-data passes through)</td><td>loads DATAO = 0 but the <span class="mono">CALL WRBYTE_M</span> is gone</td></tr>
     <tr><td class="mono">D8207_V1.$$$</td><td colspan="2">the backup still has <span class="mono">btfsc FLAG,MN_AES_OUTPUT_OFF / return</span> before the AUX/bypass switch and the bypass 0x12 write; D8207.$$$ (V1.00) has debug lines <span class="mono">bsf/bcf PORTB,1 ; *** test ***</span> in mk_ref_flash</td></tr></table>`)}
   ${card('Successor: the 2000 D820x platform build (#define D8207)', `<table class="kv small"><tr><th></th><th>1999 D8207 board (this model)</th><th>D820x platform (d8200 - #d820x/pic, jumpers.txt CS=3776)</th></tr>
     <tr><td>Bus</td><td>bit-banged I2C, 2 × CS8420 + ML6431</td><td>SPI to CS8420s + EPM7128S CPLD; REAL_MODE_a/b/c</td></tr>
     <tr><td>LEDs</td><td>3: AUDIO LOCK, REF LOCK, ERROR</td><td>4: LED_0 lock to second input, LED_1 SRC to audio, LED_2 SRC to video, LED_3 errors</td></tr>
     <tr><td>20/24</td><td>RA0: 1 = 24 bit</td><td>JMP_1: 0 = 24 bit / 1 = 20 bit (inverted)</td></tr>
     <tr><td>Dither</td><td>RA1: 1 = dither off</td><td>JMP_2: 0 = dither off / 1 = dither on (inverted)</td></tr>
     <tr><td>SRC</td><td>RA2: 1 = SRC off</td><td>JMP_3: 0 = SRC off / 1 = SRC on (inverted)</td></tr>
     <tr><td>Reference</td><td>RA4 (H1): 1 = audio</td><td>JMP_4: 0 = audio / 1 = video (inverted)</td></tr>
     <tr><td>48/44.1</td><td>RA3: 0 = 48 kHz</td><td>JMP_5: 0 = 48 kHz (same)</td></tr></table><p class="small">The 2000 manual D8207.wpd (four tallies, “YELLOW LED NOT USED!”, H14 monitor select) describes this later board, not the 1999 PCB.</p>`)}`;
  SIM.on('time',()=>{ const t=SIM.t, p=passAt(t), F=flagAt(t);
    m.querySelector('#lp').innerHTML=loopSVG(t);
    m.querySelector('#fl').innerHTML=bitsRow(F,FLN)+`<p class="small mono">shut_off_AES_cnt=${p?p.cnt:0} · REFLED_flash_cnt=${p?p.fc:0} · bcount=${p?p.bcount:0}</p>`;
    const MD=p?p.MODE:0;
    m.querySelector('#md').innerHTML=bitsRow(MD,['MODE_20_24','MODE_DITHER','MODE_SRC','MODE_48_44','MODE_H1','','',''])+bitsRow(PA(t),['RA0 20/24','RA1 DITHER','RA2 SRC','RA3 48/44','RA4 H1','','',''])+`<p class="small">MODE is cleared by init and only catches up with PORTA after the debounce (9 passes). Until then the code treats every jumper as 0 — e.g. MODE_H1 = 0 means “video” in test_lock_state.</p>`;
    const aux=(F>>FL.AUX)&1, refde=(F>>FL.REF_DE)&1, mnde=(F>>FL.MN_DE)&1, off=(F>>FL.OUTOFF)&1;
    m.querySelector('#sm').innerHTML = smSVG([['byp','bypass (reg 3 = 0x15)'],['aux','AUX (reg 3 = 0x01, reg 4 = 0x41)']], aux?'aux':'byp','AUX_MODE: set_aux_mode when REF_LOCK_YES and MODE_SRC = 0; rst_aux_mode when the reference unlocks')
      + smSVG([['idle','wait ref DETC'],['ref','REF_DE: wait main DETC'],['mn','MN_DE: wait EFTC']], !aux?'':mnde?'mn':refde?'ref':'idle','C-status handshake: REF_channel_status → MN_channel_status (reg 0x12: 0x04 → 0x0C → 0x08 → 0x04)')
      + (v101()? smSVG([['on','TX on'],['off','TXOFF (unlocked)'],['cnt','locked, counting 16 passes']], off? (mainLocked(t)?'cnt':'off') : 'on','V1.01 output control: MN_AES_OUTPUT_OFF + shut_off_AES_cnt') : '<p class="small muted">V1.00: no output control state machine.</p>');
    m.querySelector('#rm').innerHTML = regTable(R.mn,t,[[1,'Misc Control 1',v=>`VSET=${(v>>6)&1} dither ${v&8?'off':'on'}`],[3,'Data Flow Control',dec3],[4,'Clock Source Control',dec4],[6,'Serial Output Format',v=>`master=${v>>7} ${v&0x10?'20':'24'} bit`],[0x12,'C-data Buffer Control',v=>`DETCI=${(v>>3)&1} EFTCI=${(v>>2)&1}`],[0x20,'C-data byte 0 (out)',v=>v&0x80?'pro · '+FSNAME[v&3]:'consumer'],[0x22,'C-data byte 2 (out)',v=>({0x34:'max 24, 24 bit',0x30:'max 24, 20 bit'})[v]||'']]);
    m.querySelector('#rr').innerHTML = regTable(R.rf,t,[[3,'Data Flow Control',dec3],[4,'Clock Source Control',dec4],[6,'Serial Output Format',v=>`master=${v>>7}`]])
      + `<p class="small mono">b0_REF..b4_REF = ${(p?R.passes[p.i]:null)? '' : ''}${R.tx.filter(x=>x.dev==='REF'&&x.map>=0x20&&x.map<=0x24&&x.t1<=t).slice(-5).map(x=>hex(x.v)).join(' ')||'—'}<br>ML6431: ${D.vopt? (R.ml.tl.filter(x=>x[0]<=t).map(x=>hex(x[1])).slice(-4).join(' → ')||'—') + ' · ' + (mlLocked(t)?'LOCKED':'not locked') : 'not fitted (writes go unacknowledged and unchecked)'}</p>`; });
}

/* ---------- Findings ---------- */
const FINDINGS = [
  ['Artwork '+SIM.year(2026)+': rear modules now from the CorelDRAW guide', 'BNC1, BNC3 and TB8205P are now vector art from '+SIM.src(REAR_SRC+'.cdr','D8207 - rear module options.cdr')+' (2012|45; its Corel PDF export supplies the text, which libcdr renders as giant glyphs). The guide shows only BNC1/BNC3 for the D8207/75 and TB8205P, TB8205P/75 for the D8207/110; the older '+SIM.src('#MF8200 #SERIES/D8207 - #Engineering #MF82/D8207TR3.cdr','D8207TR3.cdr')+' (1999|32) and '+SIM.src('#MF8200 #SERIES/D8207 - #Engineering #MF82/D8207TR1.cdr','D8207TR1.cdr')+' also list TB8205 and TB8205/75 screw, ST8200 solder and QC8200 QCP panels that the 2012 guide dropped. BNC3 is marked “MF8210 only” and its rows 7/8 are NOT CONNECTED; the TB8205P “AUDIO IN” side has six NOT CONNECTED terminals.'],
  ['The 48K\\44K1 jumper has opposite meanings in one file', 'd8207_v1.asm: init and test_jmp_state call <span class="mono">set_ML6431_44</span> when <span class="mono">JMP_48_44</span> = 1 (comment “0=48k , 1=44k”), but <span class="mono">MN_prof_mode</span> does <span class="mono">btfss MODE,MODE_48_44 → MN_set_44k</span>, i.e. 1 = 48k (and the EQU comment says “1=48k\\0=44k1”). With a video reference the converter runs at one rate and stamps the other rate into the output channel status. Try it in the tutorial (lesson 6).'],
  ['V1.01 lost the C-buffer write in set_main8420_bypass', 'V1.00 and the V1.01 backup D8207_V1.$$$ end <span class="mono">set_main8420_bypass</span> with <span class="mono">CALL WRBYTE_M</span> for reg 0x12 = 0; the released d8207_v1.asm loads DATAO but never calls it. Reg 0x12 stays at 0x04 (E→F inhibited) from the last handshake, so after the reference is lost the bypassed output keeps the frozen, rewritten channel status instead of the input\'s '+inf+' (CS8420 behaviour from the datasheet).'],
  ['V-bit refresh reads the wrong register on TXOFF passes', 'In V1.01 <span class="mono">shut_off_AES_output</span> / <span class="mono">shut_on_AES_output</span> run MDFBYTE_M, which overwrites DATAI with reg 3. The following <span class="mono">btfss DATAI,3</span> (“refresh Validity bit”) then tests reg 3 bit 3 (TXD0) instead of the receiver V bit. One pass per transition; shown in the I2C trace as “DATAI holds reg 3”.'],
  ['The red LED does not mean “lost lock”', 'tst_mn_lck sets LED_ERROR only from reg 16 bit 2 (CONF) and bit 1 (BIP). UNLOCK (bit 4) only clears the green LED. Both manuals say red = “lost audio lock or confidence error”. The reference chip\'s error bits are never checked, though D8207MAN says reference eye errors light it too. (Model: an unplugged input gives UNLOCK only '+inf+'.)'],
  ['Three manuals, three LED stories', 'D8207MAN.WPD (1999): three LEDs, green audio, yellow reference (solid/flashing), red error — matches the code and the PCB (GRN/YEL/RED silk). The functional description (2000) says four tallies. D8207.wpd (2000) says GREEN LED1 reference lock, GREEN LED2 audio lock, “YELLOW LED NOT USED!” — that is the D820x platform build.'],
  ['Jumper names and polarities disagree everywhere', 'D8207MAN calls the AES/VIDEO jumper H1 (as the PCB and the code do); D8207.wpd calls it H4 and uses H1 for 20/24 bit. The EQU comments contradict the code for MODE_SRC (“1=SRC on”, code: 1 = off) and MODE_DITHER (“1=DITHER on”, code: 1 = off). jumpers.txt for the 2000 D820x build inverts 20/24, dither, SRC and the reference select.'],
  ['Power-on treats every jumper as 0 for 9 passes', 'init programs the chips from PORTA but then <span class="mono">clrf MODE</span>. test_lock_state uses MODE, so until test_jmp_state finishes its 8-pass debounce the card believes MODE_H1 = 0 (video: needs PORTC,LOCKED) and MODE_SRC = 0. With an AES reference the REF LED and SRC wait about '+'9 passes; then the chips are reprogrammed again.'],
  ['Turning SRC on forces AUX mode with no reference', 'test_jmp_state calls <span class="mono">set_aux_mode</span> when the SRC jumper becomes 0, without checking REF_LOCK_YES; the next test_lock_state undoes it (rst_aux_mode) if no reference is locked. One pass with the output clocked from a dead OMCK.'],
  ['Consumer-format sources keep their channel status', 'MN_channel_status only rewrites the fs code and word length when the main input is professional (byte 0 bit 7). A consumer input passes through the SRC with its original sample-rate code.'],
  ['The 20/24-bit jumper programs the serial port', '<span class="mono">set_main8420_20bit/24bit</span> write reg 6 (Serial Output Format, 0x90/0x80) — the serial port is not used in either data-flow setting. Whether the CS8420 also truncates the AES3 transmitter data is not shown by the archive '+inf+'. The C-bits byte 2 does change (0x30/0x34). Copy-paste comment: the 24-bit routine says “20 bit”.'],
  ['CS8420.HTM is empty', 'The saved datasheet page is 0 bytes (Aug 27 1999), so all register names in this model come from the code comments and general CS8420 knowledge '+inf+'.'],
  ['Clock source contradictions', 'The commented __CONFIG asks for <span class="mono">_RC_OSC</span>, but the PCB has X1 4.9152 MHz with 22 pF caps (a crystal needs XT/HS). D8207.PJT says Frequency = 4 MHz; d8207_v1.pjt says 140 000 000 (140 MHz). The delay comment “1.54mS” fits 4 MHz; on the real 4.9152 MHz it is '+SIM.fmtDur(C_DELAY*TCY)+'.'],
  ['PIC part number', 'PCB silk and D8207.EXP: PIC16C63. D8207.DSN: PIC16C73. Code: <span class="mono">list p=16c73a</span>, with ADCON1 writes to disable the A/D the 16C63 does not have. The .ERR files warn “Processor superceded by command line”.'],
  ['Case-insensitive build hides a label mismatch', 'Variables are declared <span class="mono">b0_REF</span> … <span class="mono">b4_REF</span> but MN_aud reads <span class="mono">b0_ref</span> and <span class="mono">b3_ref</span>. It assembles only because the project options include <span class="mono">/c-</span> (case-insensitive).'],
  ['Unused hardware and leftovers', 'RA5 ERR_REF_SRC, RB4 ERR_MN_SRC (TRISB bit 4 is an input) and RC1 NO_SIGNAL are wired but never read. ROW, NEW_KEY, OLD_KEY, DISPVAL, TEMP_W, TEMP_STAT, TEST_RESULT are keypad/ISR variables from the application-note template. The ERR_MN_SRC/ERR_REF_SRC comments are swapped, and ML6431_ADR is commented “main Sample rate converter”.'],
  ['ERR_1 restart leaks the stack', 'On an I2C error test_lock_state does <span class="mono">goto start</span> from inside a CALL, so each restart leaves one return address on the 8-level stack (harmless only because the PIC stack wraps). With a dead chip the card re-runs init every pass and the red LED stays mostly lit — try the fault button.'],
  ['ML6431 writes deliberately ignore the ACK', 'WRBYTE uses TX_WA, whose ACK check is commented out. A plain D8207 (no U5 fitted, assembly note 3) can therefore run the same code without tripping ERR_1 '+inf+' (intent).'],
  ['A V1.00 binary exists after all', 'D8207.BKX in PRG_V100 is an Intel HEX image (starts <span class="mono">:0400000005200029AE</span> = CALL 0x005, GOTO 0x100), dated Sep 22 1999. The README\'s “no prebuilt binaries” is not quite true for this card.'],
  ['D8207.EXP carries a foreign page', 'A second “PAGE 1” lists the connector symbols (AES3 AUDIO IN, OUT 1–4, *OUT 5/6, VIDEO REFERENCE) together with seven “R7 20K0” resistors and an AMP-FUNC3 op-amp — copied from an analog card.'],
  ['Spec drift', 'Functional description and D8207MAN: input 22–96 kHz; D8207.wpd (2000): 32–96 kHz. d8207.pdf (2002) has a substitution-cipher font; decoded it is the D8207MAN text (three tallies).'],
];
function viewNotes(m){ m.innerHTML = card('What the D8207 and its firmware are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> <span class="small">${f[1]}</span></li>`).join('')}</ol>`)
  + card('Sources and how they were used', `<table class="kv small"><tr><th>File</th><th>Used for</th></tr>
  <tr><td class="mono">PRG_V101/d8207_v1.asm</td><td>the executable model (every routine, register value and branch)</td></tr><tr><td class="mono">PRG_V100/d8207.asm, *.$$$, D8207.BKX, *.PJT, *.ERR</td><td>V1.00 mode, diffs, build settings</td></tr>
  <tr><td class="mono">D8207 - #PCB/D8207.PCB</td><td>board image (assets/d8207-pcb.png), LED/jumper/jack positions, assembly notes, silk</td></tr><tr><td class="mono">D8207.EXP, D8207.DSN</td><td>part references and values for the redrawn schematics</td></tr>
  <tr><td class="mono">D8207MAN.WPD, D8207.wpd, functional description, d8207.pdf</td><td>tutorial, specs, LED and jumper descriptions</td></tr><tr><td>${SIM.src(REAR_SRC+'.cdr','D8207 - rear module options.cdr')} / ${SIM.src(REAR_SRC+'.pdf','.pdf')} (2012)</td><td>assets/d8207-rear-bnc1/bnc3/tb8205p.svg — vector panels cut from CorelDRAW's own PDF of the drawing (libcdr garbles the TB8205P text, so the Corel print is used for the curves)</td></tr>
  <tr><td class="mono">FIG1/FIG2.cdr, D8207TR1–3.cdr, D8207-75/110.cdr</td><td>converted with Inkscape; libcdr scrambles the text, so only used to confirm the terminal options (ST8200, QC8200, TB8205)</td></tr>
  <tr><td class="mono">d8200 - #d820x/jumpers.txt, pic/d820x.h</td><td>successor comparison</td></tr></table>`); }

/* ---------- Tutorial ---------- */
let lesson=0;
const at9 = f=>f(0.9);
const LESSONS = [
  {title:'Meet the D8207', body:`<p>The D8207 is a 24-bit AES sample-rate converter for the MF82 frame (D8207MAN, 1999). It locks its <b>output</b> rate to a reference: an AES signal on input 1, or (D8207V) a video signal with jumpers choosing 44.1 or 48 kHz. With no reference it is “an ordinary digital distribution amplifier”.</p><p>The simulator starts at power-on: the PIC runs <span class="mono">init</span>, then its main loop. Press <b>Play</b> or drag the time slider and watch the three LEDs on the front edge.</p>`, check:()=>true, auto:true},
  {title:'1 · Plain reclocking DA', body:`<p>Pull the reference: with no reference locked, <span class="mono">test_lock_state</span> calls <span class="mono">rst_aux_mode</span> and the main CS8420 bypasses its converter.</p><p><b>Goal:</b> no reference connected; at 0.9 s the output runs at the input rate and AUDIO LOCK is lit.</p>`, check:()=>!refAESon(0.9) && at9(t=>outAt(t).fs===D.main.fs && ledsAt(t).aud), hint:'Click the AES REF INPUT connector on the rear module (or the “AES ref” button).'},
  {title:'2 · Lock to an AES reference', body:`<p>Plug the reference back in at 48 kHz with the input at 44.1 kHz. When U2 locks, <span class="mono">set_aux_mode</span> writes reg 3 = 0x01 and reg 4 = 0x41: the output is now clocked by the reference.</p><p><b>Goal:</b> output 48 kHz from a 44.1 kHz input, REF LOCK steady.</p>`, check:()=>D.main.fs===44100 && at9(t=>outAt(t).fs===48000 && outAt(t).mode==='src' && ledsAt(t).ref), hint:'Reference button on, reference fs 48 kHz, input 44.1 kHz.'},
  {title:'3 · SRC off: the flashing yellow', body:`<p>“YELLOW LED (Flashing) — a reference signal is available but the SRC has been set to OFF” (D8207MAN). In the code: <span class="mono">mk_ref_flash</span>, 16 passes on, 16 off.</p><p><b>Goal:</b> set SRC ON\\OFF to off with the reference connected, then find the flashing on the REF LOCK lane.</p>`, check:()=>D.j.ra2===1 && refAESon(0.9) && R.pbTL.filter(p=>p[0]>0.3).some((p,i,a)=>i>0 && ((p[1]^a[i-1][1])&0x20)), hint:'Click the “SRC ON\\OFF” jumper (third yellow box on the board, or the jumper table).'},
  {title:'4 · Terminate the input', body:`<p>“Ensure that the input is properly terminated to minimize reflections.” A /75 card on coax wants 75 Ω. Put AUDIO TERM on HiZ and watch ERROR (CONF from reg 16) — then fix it.</p><p><b>Goal:</b> having tried a wrong termination, end with the correct one and no red LED.</p>`, check:()=>{ if (!termOK(D.aterm)) D.seen.badTerm=true; return !!D.seen.badTerm && termOK(D.aterm) && !ledsAt(0.9).err; }, hint:'AUDIO TERM is the 2×3 berg near the transformers (or use the buttons under the jumper table).'},
  {title:'5 · 20 bit and dither', body:`<p>Set 20 bit. <span class="mono">set_main8420_20bit</span> writes reg 6 = 0x90 and, on the next channel-status handshake, <span class="mono">MN_dto</span> writes byte 2 = 0x30 (“20 bit”).</p><p><b>Goal:</b> output channel-status byte 2 = 0x30 at 0.9 s, with dither on.</p>`, check:()=>csAt(0.9).b2===0x30 && !(regAt(R.mn,1,0.9)&8), hint:'20\\24 BIT jumper to 0; SRC on with a professional 48 kHz reference so the handshake runs.'},
  {title:'6 · Video reference (D8207V) and the 48/44.1 bug', body:`<p>Fit the video option, set H1 to video, plug in NTSC. The ML6431 genlocks (X2 3.58 MHz) and clocks U2 through ILRCK. Now set 48K\\44K1 to 1: the ML6431 runs at 44.1 kHz, but <span class="mono">MN_prof_mode</span> writes “48 kHz” into the channel status.</p><p><b>Goal:</b> output at 44.1 kHz while byte 0 says 48 kHz.</p>`, check:()=>at9(t=>outAt(t).fs===44100 && (csAt(t).b0&3)===1), hint:'Tick D8207V, click H1 (to 0 = video), turn on Video ref, click 48K\\44K1 (to 1).'},
  {title:'7 · Losing the input (V1.01)', body:`<p>V1.01 added: “When main audio source is plug off, the output of MN8420 is off”. Drop the input for 300 ms and watch the AES out lane: TXOFF at the next pass, and 16 locked passes before <span class="mono">shut_on_AES_output</span>.</p><p><b>Goal:</b> a dropout on firmware V1.01; then switch to V1.00 and compare.</p>`, check:()=>D.ev.some(e=>e.what==='main') && D.fw==='1.01' && R.tx.some(x=>x.fn==='shut_on_AES_output'), hint:'Move the playhead to ~0.3 s and click “Drop input 300 ms here”.'},
  {title:'8 · A chip stops answering', body:`<p>Press the I2C fault button. <span class="mono">TX</span> sees no ACK, sets ERR_1, and <span class="mono">test_lock_state</span> jumps to <span class="mono">start</span> every pass.</p><p><b>Goal:</b> see more than 10 restarts in the second (Software tab, One second tab), then clear the fault.</p>`, check:()=>{ if (R.inits.length>10) D.seen.fault=true; return !!D.seen.fault && !D.fault; }, hint:'Card row: “I2C fault: REF8420 no ACK”, look at the main-loop lane, then press it again.'},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial', `<div id="ls"></div>`)}${card('Your D8207', `<div style="display:flex;gap:12px;flex-wrap:wrap"><div id="fp" style="flex:0 0 240px"></div><div id="rp" style="flex:1;min-width:200px;max-width:300px"></div></div><div id="ct"></div>`)}</div><div>${card('Lessons', `<div id="li"></div>`)}${card('Board jumpers', `<div id="bd"></div><div id="jp"></div>`)}${card('What the firmware did', `<div id="tr" class="log"></div>`)}</div></div>${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const ct=m.querySelector('#ct');
  SIM.on('time',()=>{ const t=SIM.t, L=LESSONS[lesson], ok=L.check();
    m.querySelector('#ls').innerHTML=`<h3>${L.title}</h3>${L.body}<p style="font-weight:600;color:${ok?'var(--accent)':'var(--warn)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'Goal not reached yet.'}</p>${L.hint&&!ok?`<details class="small"><summary>Hint</summary>${L.hint}</details>`:''}<div style="display:flex;gap:8px;margin-top:8px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Reset the card</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); SIM.refresh(); }; m.querySelector('#nx').onclick=()=>{ lesson=Math.min(LESSONS.length-1,lesson+1); SIM.refresh(); }; m.querySelector('#rs').onclick=()=>A.reset();
    m.querySelector('#li').innerHTML=`<ul class="small" style="list-style:none;padding-left:4px">${LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lesson?'font-weight:700':''}" data-i="${i}">${l.title} ${l.check()&&!l.auto?'✓':''}</li>`).join('')}</ul>`;
    m.querySelectorAll('#li li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#bd').innerHTML=boardSVG(t);
    const jp=m.querySelector('#jp'); if (jp.dataset.k!==jKey()){ jp.innerHTML=jumperHTML(); jp.dataset.k=jKey(); bindJumpers(m); }
    if (ct.dataset.k!==ctlKey()){ ct.innerHTML=controlsHTML(); ct.dataset.k=ctlKey(); bindControls(m); }
    bindPanel(m);
    m.querySelector('#tr').innerHTML=traceHTML();
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:170}); });
}

resim();
SIM.register({
  id:'d8207', name:'D8207 · AES sample-rate converter (1999|32)', duration:1,
  product:'D8207', year:1999, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8207 - #Engineering #MF82',
  summary:'A 24-bit AES/EBU sample-rate converter card for the MF82 frame: two CS8420s (main converter and reference receiver), an optional ML6431 video genlock (D8207V) and a PIC16C73A that bit-bangs I2C to all three. With no reference it is a reclocking distribution amplifier. The model runs the V1.01 firmware routine by routine from power-on.',
  highlights:['Board drawn from the Tango PCB file, jumpers live','Every I2C transaction of the first second, timed from the listing','V1.00 vs V1.01 output shut-off','48K\\44K1 jumper means 44.1 to the genlock and 48 to the C-bits','AES3 subframe and I2C bit scopes'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass', period:()=>avgPass()},
    {label:'1 I2C byte', period:()=>CYB*TCY},
    {label:'1 AES block (192 frames)', period:()=>192/(outAt(SIM.t).fs||48000)},
    {label:'1 AES frame', period:()=>1/(outAt(SIM.t).fs||48000)},
    {label:'1 NTSC field', period:()=>1001/60000},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.05,'50 ms (≈8 passes)'],[0.008,'8 ms (≈1 pass)'],[0.002,'2 ms (I2C transactions)'],[0.0003,'300 µs (I2C bits)'],[4/48000,'4 AES frames']],
  defaultZoom:1,
  init(){ resim(); window.__d8207Active=false; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTut},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
