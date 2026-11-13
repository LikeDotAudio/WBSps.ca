/* =====================================================================
   DEMUX-1 — SDI audio de-embedder daughter board (Ward-Beck Systems, 2001|34)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive; folder #DEMUX #SERIES/XXX - DEMUX1 - #Engineering #OBSOLETE):
   - README.md (hosts POD19, XTM4, AMS4, DMS1; superseded by DEMUX-3 in 2010|43)
   - DEMUX-1 - #Software/DEMUX-1 - #Software #PIC/#v101 … #v106test: demux-1vXXX.asm (MAIN, scanuart,
       scanuart1, rxerror1, rxerror2, settx, txuart, txuart0, txuart1, refreshoutputmux, readgroupselect),
       demux-1.asm (setgroup, s0…s7, group1…group4, leave_sdi, sdi_check, refreshgs9023, readgs9023),
       init43.asm (RAM map rxflags…lock, INIT: TRIS/PORT values, SPBRG = 7, GS9023 defaults addr0/3/4/6),
       *.pjt (MPLAB fuses page: Frequency = 4 MHz, WDTEnable = 0), demux-1v106.err
   - DEMUX-1 - #Software/DEMUX-1 - #Working/ (post-v1.06 debug copy: taddr0…taddr13 read-back, addr4 bit 6)
   - DEMUX-1 - #PCB/DEMUX-1ISS2.net (every net below), DEMUX-1ISS2.sch (P-CAD 2001 binary: pin names of
       GS9023, PIC16F874, CLC011, CLC014, CLC016, CLC007, PLL1700, 75176, LM2596), DEMUX-1ISS2.ECO
       (ISS1 → ISS2 change log, May 2001 … Aug 2002), DEMUX-1ISS2.bom + DEMUX-1ISS2BOM.doc (two BOMs that
       disagree), DEMUX-1ISS2.pcb (P-CAD 2002 binary: RefDes anchor coordinates, used for the board drawing),
       DEMUX3-to-XTM4-WIRING DIAGRAM.dwg (title “DEMUX-1-to-XTM4-1”, 23 Mar 2006: P5/P1/P3 harness)
   - #POD #SERIES/POD19 - #Master/POD19 - #Engineering/Software/v101/POD19_DEMUX.asm (the separate POD19 build
       modelled in pod19.js), POD19 - Demux 1 - Functional Diagram.cdr, WiringDiagrams/pod19-wiring.sch
   - #POD #SERIES/POD PANELS - #Mechanical #DA #2016/…/Silks/POD19/POD19-FRONT&REAR(FINAL CURVE) .cdr
       (26 Jun 2014) → Inkscape (libcdr) plain SVG → assets/demux1-rear.svg (POD19 rear WHITE plate + panel holes in grey,
       200 px/in; the module's 4 BNCs show here; artwork pass 2026|59)
   - SOFTWARE LISTINGS - #Engineering.xls (DEMUX1V106(B), 2003-10-30; “Demux1 obsolete”, 2010-07-05)
   - siumulation-plugins/pod19.js, ams4.js, dms1.js, demux4.js: the hosts and the successor (read only)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';
const POD19_SILK = '#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD19/POD19-FRONT&REAR(FINAL CURVE) .cdr';
const css = n => SIM.css(n);
const hx = (v,n=2) => (v>>>0).toString(16).toUpperCase().padStart(n,'0');
const bn = (v,n=8) => (v>>>0).toString(2).padStart(n,'0');

/* ---------------- constants from the source ---------------- */
const XTAL = 4.9152e6;                 // X1 on DEMUX-1ISS2.bom; SPBRG = 7, BRGH = 0 → 4.9152 MHz / 512 = 9600 Bd exactly
const TCY = 4 / XTAL;                  // 813.8 ns per instruction cycle
const BIT_T = 1/9600, BYTE_T = 10/9600; // 8N1 on the RS-485 pair (P1)
const RCIF_AT = 9.5*BIT_T;             // receive flag after the middle of the stop bit
const BOOT_CYC = 1024*4/4 + 70;        // oscillator start-up (1024 Tosc) + INIT ≈ 70 cycles; PWRT assumed off — inferred
const COMOUT = 75;                     // settx: movlw 75 → comout1 (v1.04+)
const AES_FS = 48000, BLOCK = 192/AES_FS;
const WORD_T = 1/27e6;                 // 270 Mb/s ÷ 10 bits
const STD = {
  '525': {name:'525/59.94 (NTSC)', H:1001/15750000, words:1716, lines:525, field:1001/60000, eav:4, hanc:268, ctlLine:12},
  '625': {name:'625/50 (PAL)',     H:64e-6,         words:1728, lines:625, field:0.02,       eav:4, hanc:280, ctlLine:8},
};
const A3 = {1:0xEF, 2:0xCD, 3:0xAB, 4:0x89};       // group1…group4: DID audio packet ext/group → addr3
const A4 = {1:0x0F, 2:0x0E, 3:0x0D, 4:0x0C};       // DID control packet → addr4
const A3G = {0xEF:1, 0xCD:2, 0xAB:3, 0x89:4};
const AUD_DID=[0,0xFF,0xFD,0xFB,0xF9], EXT_DID=[0,0xFE,0xFC,0xFA,0xF8], CTL_DID=[0,0xEF,0xEE,0xED,0xEC];  // SMPTE 272M (8-bit part)
const TONE_F = [[400,800,1200,1600],[500,1000,1500,2000],[600,1200,1800,2400],[700,1400,2100,2800]];   // test source — inferred
const LEVEL = 0.1;                                 // −20 dBFS test tone — inferred
const POLL = 0.2;                                  // host re-sends its command every 200 ms — inferred (ams4.js: ≈3/s)
const XTM41_DLY = 0.0015;                          // XTM41 answer delay on a shared DMS1 bus (dms1.js, inferred there)

/* ---------------- firmware versions (folder #v101 … #v106test) ---------------- */
const FW = {
  v101:{n:'v1.01', date:'8 Aug 2001', y:2001, order:['scanuart','setgroup','refreshgs9023','readgs9023','settx','txuart'], flag7:false, mux:null, grp:null, reply:'scan', sdiLock:'cd', leave:'nosdi', sdiSel:0, a0:0x81, a6:0x05, chLock:false, rc0out:true, pe:false,
        note:'UART only (XTM4, AMS4, DMS1). The reply is armed in scanuart1 and sent at the end of the same pass.'},
  v102:{n:'v1.02', date:'9 Aug 2001', y:2001, order:['scanuart','refreshoutputmux','setgroup','refreshgs9023','readgroupselect','readgs9023','settx','txuart'], flag7:true, mux:'p102', grp:'p102', reply:'scan', sdiLock:'cd', leave:'nosdi', sdiSel:0, a0:0x81, a6:0x05, chLock:false, rc0out:false, pe:false,
        note:'One image for both hosts: any received byte sets rxflags,7 and the parallel POD19 port is ignored from then on.'},
  v103:{n:'v1.03', date:'7 Sep 2001', y:2001, order:['scanuart','txuart','refreshoutputmux','setgroup','refreshgs9023','readgroupselect','readgs9023','settx'], flag7:true, mux:'p102', grp:'p102', reply:'setgroup', sdiLock:'cd', leave:'nosdi', sdiSel:0, a0:0x81, a6:0x05, chLock:true, rc0out:true, pe:false,
        note:'“Trying to lock on individual channel lock”: reads GS9023 register 1 too and returns 4 channel-lock bits in tx0 bits 5…2.'},
  v104:{n:'v1.04', date:'7 Sep 2001 (header not updated)', y:2001, order:['scanuart','txuart','refreshoutputmux','setgroup','refreshgs9023','readgroupselect','readgs9023','settx'], flag7:true, mux:'p104', grp:'p104', reply:'comout', sdiLock:'gs', leave:'nosdi', sdiSel:1, a0:0x81, a6:0x05, chLock:false, rc0out:false, pe:true,
        note:'New XTM41 board: SDI lock now from the GS9023 (register 0 bit 5) instead of the CLC016 carrier detect; reply delayed by the comout counter; group lines move to RE2/RC0.'},
  v104b:{n:'v1.04b (PAL)', date:'7 Sep 2001', y:2001, pal:true, base:'v104', a0:0x85},
  v105:{n:'v1.05', date:'9 Dec 2002', y:2002, base:'v104', leave:'sdi', note:'“Keeping AES active at all times regardless of what source is being monitored”: leave_sdi now leaves the mux on the GS9023.'},
  v105b:{n:'v1.05b (PAL)', date:'9 Dec 2002', y:2002, pal:true, base:'v104', leave:'sdi', a0:0x85},
  v106:{n:'v1.06', date:'30 Oct 2003', y:2003, base:'v104', leave:'sdi', a6:0x01, note:'Dolby E: GS9023 register 6 bit 2 cleared so the Gennum no longer changes the Dolby E CRC.'},
  v106b:{n:'v1.06b (PAL)', date:'30 Oct 2003 (header still says 1.05, 9 Dec 2002)', y:2003, pal:true, base:'v104', leave:'sdi', a6:0x01, a0:0x85},
  v106test:{n:'v1.06test', date:'30 Oct 2003', y:2003, base:'v104', leave:'sdi', a6:0x01, test:true, note:'Test build: ;call refreshoutputmux and ;call readgroupselect commented out — UART only.'},
};
Object.keys(FW).forEach(k=>{ const f=FW[k]; if (f.base){ const b=FW[f.base]; for (const p in b) if (!(p in f) && p!=='note') f[p]=b[p]; } if (f.test) f.order=f.order.filter(r=>r!=='refreshoutputmux'&&r!=='readgroupselect'); f.id=k; });
const FW_IDS = Object.keys(FW);

/* ---------------- device + world state ---------------- */
const D = {
  fw:'v106', host:'uart', std:'525', emb:[true,true,false,false], shared:false,
  events:[], scenario:'boot', log:[], cmd:0xF2,
};
const SCEN = {
  boot:  {name:'Power-up with an AMS4/XTM4-style host: probe 0xE8, then SDI group 2', host:'uart', emb:[1,1,0,0],
          ev:[{t:0,k:'pwr',on:true},{t:0,k:'sdi',on:true},{t:0.05,k:'cmd',b:0xE8},{t:0.12,k:'cmd',b:0xF2}]},
  steady:{name:'Steady: host polling SDI group 1 every 200 ms', host:'uart', emb:[1,1,0,0], pre:0xF0, ev:[]},
  grp:   {name:'Host steps to group 3 (not embedded) at 0.30 s, back to 2 at 0.62 s', host:'uart', emb:[1,1,0,0], pre:0xF0,
          ev:[{t:0.30,k:'cmd',b:0xF4},{t:0.62,k:'cmd',b:0xF2}]},
  cable: {name:'SDI cable pulled at 0.30 s, back at 0.65 s', host:'uart', emb:[1,1,0,0], pre:0xF0, ev:[{t:0.3,k:'sdi',on:false},{t:0.65,k:'sdi',on:true}]},
  leave: {name:'Host leaves SDI (bit 4 = 0) at 0.30 s: where do the AES BNCs go?', host:'uart', emb:[1,1,0,0], pre:0xF0, ev:[{t:0.3,k:'cmd',b:0xE0}]},
  shared:{name:'DMS1 shared bus: XTM41 frames and replies between DEMUX polls', host:'uart', emb:[1,1,0,0], pre:0xF0, shared:true, ev:[]},
  pod:   {name:'POD19 (parallel port): group lines 00 → 10 at 0.25 s (group 3)', host:'pod', emb:[1,1,1,0], ev:[{t:-0.1,k:'pod',code:0},{t:0.25,k:'pod',code:2}]},
  noise: {name:'POD19: a stray byte on the open RS-485 pair at 0.40 s, group change at 0.60 s is ignored', host:'pod', emb:[1,1,1,0],
          ev:[{t:-0.1,k:'pod',code:0},{t:0.4,k:'noise',b:0x3F},{t:0.6,k:'pod',code:1}]},
};
function loadScenario(id){
  const s = SCEN[id]; D.scenario=id; D.host=s.host; D.emb=s.emb.map(Boolean); D.shared=!!s.shared;
  const ev = [];
  if (!s.ev.some(e=>e.k==='pwr')){ ev.push({t:-0.08,k:'pwr',on:true,pre:true},{t:-0.08,k:'sdi',on:true,pre:true}); if (s.host==='uart'){ ev.push({t:-0.07,k:'cmd',b:0xE8,pre:true},{t:-0.05,k:'cmd',b:s.pre||0xF0,pre:true}); } }
  else ev.push({t:-0.1,k:'pwr',on:false,pre:true},{t:-0.1,k:'sdi',on:false,pre:true});
  s.ev.forEach(e=>ev.push(Object.assign({scn:true}, e)));
  D.events = ev; D.cmd = (s.ev.filter(e=>e.k==='cmd').pop()||{}).b || s.pre || 0xF0; dirty();
}

/* ---------------- event helpers ---------------- */
let EVC=null, EMU=null, EMU_KEY='';
function dirty(){ EVC=null; EMU=null; EMU_KEY=''; }
function evs(k){ if (!EVC){ EVC={}; for (const e of D.events.slice().sort((a,b)=>a.t-b.t)) (EVC[e.k]=EVC[e.k]||[]).push(e); } return EVC[k]||[]; }
function lastOf(k, t, field, dflt){ let v=dflt; for (const e of evs(k)){ if (e.t>t) break; v=e[field]; } return v; }
const powerAt = t => lastOf('pwr', t, 'on', false);
const sdiAt = t => powerAt(t) && lastOf('sdi', t, 'on', false);
function sdiOnSince(t){ let s=null; for (const e of evs('sdi')){ if (e.t>t) break; s = e.on ? e.t : null; } let p=null; for (const e of evs('pwr')){ if (e.t>t) break; p = e.on? e.t : null; } if (s===null||p===null) return null; return Math.max(s,p); }
const podCode = t => D.host==='pod' ? lastOf('pod', t, 'code', 0) : 3;     // UART hosts leave P4 open: 3K3 pull-ups read 1,1
function embedded(g){ return !!D.emb[g-1]; }

/* bytes on the RS-485 pair (everything the DEMUX-1 receiver hears, plus what it sends) */
function hostBytes(){
  const out=[]; const cmds=evs('cmd'); const S=D.shared;
  // the host's own schedule: a frame at each command change, then polls of the current command every POLL
  const pw = evs('pwr').filter(e=>e.on).map(e=>e.t);
  let cur=null, next=Infinity;
  const frames=[];
  const tEnd=1.0;
  const times = cmds.map(c=>c.t);
  let i=0, t = cmds.length? cmds[0].t : Infinity;
  while (t <= tEnd){
    while (i<cmds.length && cmds[i].t<=t+1e-12){ cur=cmds[i].b; i++; }
    if (cur!==null) frames.push({t, b0:cur, b1:0x55});
    const nc = i<cmds.length? cmds[i].t : Infinity;
    t = Math.min(t+POLL, nc);
  }
  for (const f of (D.host==='pod'?[]:frames)){
    out.push({t0:f.t, b:f.b0, who:'host', lbl:'addr/cmd'}, {t0:f.t+BYTE_T, b:f.b1, who:'host', lbl:'level'});
    if (S && f.b0!==0xE8){ const tx=f.t+0.03; out.push({t0:tx, b:0xA0|(f.b0&0x10), who:'xtm-host', lbl:'to XTM41'},{t0:tx+BYTE_T, b:0x30, who:'xtm-host', lbl:'level'},{t0:tx+2*BYTE_T+XTM41_DLY, b:0x00, who:'xtm41', lbl:'XTM41 reply'}); }
  }
  for (const e of evs('noise')) out.push({t0:e.t, b:e.b, who:'noise', ferr:!!e.ferr, lbl:e.ferr?'glitch (framing error)':'glitch byte'});
  out.sort((a,b)=>a.t0-b.t0);
  out.forEach(o=>{ o.t1=o.t0+BYTE_T; o.rcif=o.t0+RCIF_AT; });
  return out;
}

/* ================================================================
   EMULATOR — the DEMUX-1 PIC16F874, pass by pass, from the MPASM source
   ================================================================ */
const RT = ['scanuart','txuart','refreshoutputmux','setgroup','refreshgs9023','readgroupselect','readgs9023','settx'];
function emulate(){
  if (EMU && EMU_KEY==='ok') return EMU;
  EMU_KEY='ok'; EVC=null;
  const F = FW[D.fw], S = STD[D.std];
  const CAP = 16000;
  const P = { n:0, t0:new Float64Array(CAP), cyc:new Uint16Array(CAP), rx:new Uint8Array(CAP), uf:new Uint8Array(CAP), u0:new Uint8Array(CAP), pu0:new Uint8Array(CAP),
    tx0:new Uint8Array(CAP), tx2:new Uint8Array(CAP), c1:new Uint8Array(CAP), a3:new Uint8Array(CAP), lk:new Uint8Array(CAP), io:new Uint8Array(CAP), code:new Uint8Array(CAP),
    rcyc:new Uint8Array(CAP*8) };
  const bus = hostBytes().map(b=>Object.assign({}, b));
  const tx = [];        // bytes the DEMUX-1 sends {t0,t1,b,who:'dmx'}
  const de = [];        // RC1 driver-enable windows [t0,t1]
  const did = [];       // GS9023 addr3 as the chip holds it {t, a3}
  const marks = [];     // notable moments {t,k,v}
  const boots = [];     // [t0,t1] PIC in reset / INIT
  // power segments
  const pev = evs('pwr'); const segs=[]; let on=false, st=-0.2;
  for (const e of pev){ if (e.on===on) continue; if (on) segs.push([st,e.t]); on=e.on; st=e.t; }
  if (on) segs.push([st, 1.0001]);
  const gsVideoAt = t => { const s=sdiOnSince(t); return s!==null && t >= s + 2*S.H; };   // GS9023 video lock 2 lines after carrier — inferred
  const gsA3 = t => { let a=null; for (let i=did.length-1;i>=0;i--) if (did[i].t<=t){ a=did[i]; break; } return a; };
  const gsAudioAt = t => {
    if (!gsVideoAt(t)) return false; const a=gsA3(t); if (!a || a.a3===null) return false; const g=A3G[a.a3]; if (!g || !embedded(g)) return false;
    const vt = sdiOnSince(t) + 2*S.H; const start=Math.max(a.t, vt);
    return t >= Math.ceil((start + S.H)/BLOCK)*BLOCK;                                        // next AES block — inferred (as pod19.js)
  };
  for (const [s0, s1] of segs){
    // ---- INIT (init43.asm) ----
    const R = { rxflags:0, uartflags:0, uart0:0, uart2:0, preuart0:0, tx0:0, tx2:0, comout0:1, comout1:1, addr0:F.a0, addr3:0xEF, addr4:0x0F, addr6:F.a6, group:1, lock:0,
      rc1:0, rc3:0, rc4:1, re0:1, re1:1, rb5:1, fifo:[], oerr:false, tsrBusy:-1, txPend:null };
    let t = s0 + BOOT_CYC*TCY; boots.push([s0, t]); did.push({t:s0, a3:null}); marks.push({t:s0, k:'boot'});
    let bi = bus.findIndex(b=>b.rcif>=t); if (bi<0) bi=bus.length;
    while (t < s1 && t <= 1.0 && P.n < CAP){
      const i = P.n++; P.t0[i]=t; let cyc = 1;                       // clrwdt
      const now = () => t + cyc*TCY;
      const feed = () => { const tn=now(); while (bi<bus.length && bus[bi].rcif<=tn){ const b=bus[bi++]; if (b.t0 < s0) continue; if (R.fifo.length>=2){ R.oerr=true; b.lost=true; } else R.fifo.push(b); } };
      const rc = new Array(8).fill(0);
      for (const name of F.order){
        const c0 = cyc; cyc += 2;                                      // call
        feed();
        switch(name){
        case 'scanuart': {
          if (R.oerr){ R.fifo=[]; R.oerr=false; R.rxflags=0; R.uartflags&=~1; cyc+=16; marks.push({t:now(),k:'oerr'}); break; }           // rxerror1
          const b = R.fifo[0];
          if (b && b.ferr){ R.fifo.shift(); R.uartflags&=~1; cyc+=7; b.read=now(); b.how='rxerror2 (FERR): byte dropped, uartflags,0 cleared'; break; }  // rxerror2
          if (!b){ cyc+=7; break; }
          R.fifo.shift(); b.read=now();
          if (F.flag7){ if (!(R.rxflags&0x80)) marks.push({t:now(),k:'flag7',v:b.b}); R.rxflags|=0x80; }
          R.uart2=b.b;
          if (b.b & 0x80){
            if ((b.b&0x40) && (b.b&0x20)){ R.uart0=b.b; R.uartflags|=1; cyc+=21; b.how='address byte for the DEMUX (bits 6,5 = 11) → uart0, uartflags,0 = 1'; }
            else { cyc+=15; b.how='address byte for another board (bits 6,5 ≠ 11): ignored'; }
          } else {
            const had = R.uartflags&1; if (had) R.rxflags|=1; R.uartflags&=~1; cyc+=12+(had?2:2)+1;
            if (R.rxflags&1){
              if (F.reply==='scan'){ R.tx2|=0xE0; cyc+=7; }
              else if (F.reply==='comout'){ R.tx2|=0xC1; cyc+=7; }
              else cyc+=2;
              b.how = 'second byte after our address → rxflags,0 = 1 (command received)'; marks.push({t:now(),k:'cmd',v:R.uart0});
            } else { cyc+=3; b.how='byte with bit 7 = 0 but no address before it: ignored'; }
          }
          break; }
        case 'txuart': {
          if (!(R.tx2&0x20)){ cyc+=3; break; }
          if (R.tx2&0x80){
            R.rc1=1; const t0=Math.max(now()+6*TCY, R.tsrBusy); R.tsrBusy = t0 + BYTE_T; tx.push({t0, t1:t0+BYTE_T, b:R.tx0, who:'dmx', lbl:'reply tx0'}); R.tx2&=~0x80; cyc+=10;
            de.push([t0-4*TCY, null]); marks.push({t:t0,k:'tx',v:R.tx0});
          } else {
            if (now() >= R.tsrBusy){ R.rc1=0; R.tx2=0; cyc+=15; const d=de[de.length-1]; if (d && d[1]===null) d[1]=now(); }
            else cyc+=14;
          }
          break; }
        case 'refreshoutputmux': {
          if (R.rxflags&0x80){ cyc+=3; break; }
          if (F.mux==='p102'){ R.rc3=0; R.rc4=0; cyc+=8; }                         // tests PORTE,2: its own output latch (1)
          else { if (R.re1){ R.rc3=1; R.rc4=0; cyc+=8; } else { R.rc3=0; R.rc4=1; cyc+=9; } }
          break; }
        case 'setgroup': {
          if (!(R.rxflags&1)){ cyc+=3; break; }
          R.rxflags&=~1; if (F.reply==='setgroup'){ R.tx2|=0xE0; cyc+=3; }
          if (R.uart0===R.preuart0){ cyc+=7; break; }
          R.preuart0=R.uart0;
          if (R.uart0&8){ R.tx0=0xE0; cyc+=14; marks.push({t:now(),k:'sdicheck'}); break; }
          if (!(R.uart0&0x10)){ if (F.leave==='sdi'){ R.rc3=1; R.rc4=0; } else { R.rc3=0; R.rc4=1; } cyc+=16; marks.push({t:now(),k:'leave'}); break; }
          const s=R.uart0&7, g=(s>>1)+1;
          if (F.sdiSel===1){ R.rc3=1; R.rc4=0; } else { R.rc3=0; R.rc4=0; }
          R.addr3=A3[g]; R.addr4=A4[g]; cyc+=31; marks.push({t:now(),k:'group',v:g});
          break; }
        case 'refreshgs9023': {
          const tw = t + (cyc+13)*TCY; const last = did[did.length-1];
          if (!last || last.a3!==R.addr3) did.push({t:tw, a3:R.addr3});
          cyc+=45; break; }
        case 'readgroupselect': {
          if (R.rxflags&0x80){ cyc+=3; break; }
          const code = podCode(now());
          if (F.grp==='p102'){ const msb = F.rc0out ? 0 : (code>>1)&1, lsb = code&1; R.group=[1,2,4,8][msb*2+lsb]; cyc+=11; }
          else { const g=code+1; R.addr3=A3[g]; R.addr4=A4[g]; if (g<=2) R.group=g; cyc+= [18,19,15,14][code]; }
          break; }
        case 'readgs9023': {
          const tr = now() + 4*TCY; const vid=gsVideoAt(tr), aud=gsAudioAt(tr);
          R.lock = (vid?0x20:0) | (aud?0x08:0);
          if (aud) R.tx0&=~1; else R.tx0|=1;
          cyc+=13;
          if (F.pe){ R.re0 = aud?1:0; cyc+=4; }
          if (F.chLock){ const m = aud?0:1; R.tx0 = (R.tx0 & ~0x3C) | (m?0x3C:0); cyc+=30; }
          cyc+=2; break; }
        case 'settx': {
          const lk = F.sdiLock==='gs' ? !!(R.lock&0x20) : sdiAt(now());
          if (lk) R.tx0&=~2; else R.tx0|=2;
          if (F.pe){ R.re1 = lk?1:0; }
          R.rb5 = lk?0:1;
          cyc+=12;
          if (F.reply==='comout'){
            if (!(R.tx2&1)) cyc+=3;
            else { R.comout1=(R.comout1-1)&255; if (R.comout1){ cyc+=5; } else { R.comout0=(R.comout0-1)&255; if (R.comout0) cyc+=7; else { R.comout0=1; R.comout1=COMOUT; R.tx2|=0x20; cyc+=13; marks.push({t:now(),k:'arm'}); } } }
          } else cyc-=4;
          break; }
        }
        rc[RT.indexOf(name)] = cyc - c0;
      }
      cyc += 2;                                                         // goto main
      P.cyc[i]=cyc; P.rx[i]=R.rxflags; P.uf[i]=R.uartflags; P.u0[i]=R.uart0; P.pu0[i]=R.preuart0; P.tx0[i]=R.tx0; P.tx2[i]=R.tx2; P.c1[i]=R.comout1; P.a3[i]=R.addr3; P.lk[i]=R.lock;
      P.io[i] = R.rc1 | (R.rc3<<1) | (R.rc4<<2) | (R.re0<<3) | (R.re1<<4) | (R.rb5<<5); P.code[i]=podCode(t);
      for (let k=0;k<8;k++) P.rcyc[i*8+k]=Math.min(255, rc[k]);
      t += cyc*TCY;
    }
    const d=de[de.length-1]; if (d && d[1]===null) d[1]=Math.min(s1,1.0);
    did.push({t:s1, a3:null, off:true});
  }
  EMU = { P, bus, tx, de, did, marks, boots, gsVideoAt, gsAudioAt, gsA3 };
  return EMU;
}
function bs(arr, n, t){ if (n===0 || arr[0]>t) return -1; let lo=0, hi=n-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (arr[m]<=t) lo=m; else hi=m-1; } return lo; }
function passAt(t){
  const E=emulate(), P=E.P; if (!powerAt(t)) return null; const i=bs(P.t0,P.n,t); if (i<0) return null;
  if (t - P.t0[i] > P.cyc[i]*TCY*1.01) return null;           // between a power-on and the first pass
  const rc=[]; for (let k=0;k<8;k++) rc.push(P.rcyc[i*8+k]);
  return {i, t0:P.t0[i], cyc:P.cyc[i], rxflags:P.rx[i], uartflags:P.uf[i], uart0:P.u0[i], preuart0:P.pu0[i], tx0:P.tx0[i], tx2:P.tx2[i], comout1:P.c1[i], addr3:P.a3[i], lock:P.lk[i],
    rc1:P.io[i]&1, rc3:(P.io[i]>>1)&1, rc4:(P.io[i]>>2)&1, re0:(P.io[i]>>3)&1, re1:(P.io[i]>>4)&1, rb5:(P.io[i]>>5)&1, code:P.code[i], rc};
}
function stepAt(t){
  const p=passAt(t); if (!p) return {p:null, step:-1};
  const c=(t-p.t0)/TCY; let a=1; const ord=FW[D.fw].order;
  for (const name of ord){ const k=RT.indexOf(name); a+=p.rc[k]; if (c<a) return {p, step:k, name}; }
  return {p, step:-2, name:'goto main'};
}
function inBoot(t){ const E=emulate(); return E.boots.some(b=>t>=b[0]&&t<b[1]); }
function gsGroupAt(t){ if (!powerAt(t)) return 0; const a=emulate().gsA3(t); return a && a.a3!==null ? (A3G[a.a3]||0) : 0; }
const gsVideo = t => powerAt(t) && emulate().gsVideoAt(t);
const gsAudio = t => powerAt(t) && emulate().gsAudioAt(t);
/* 74HC153: A = OUTSEL0 = RC3, B = OUTSEL1 = RC4. 1Y → U9 → T2 → AESOUT1, 2Y → U10 → T3 → AESOUT2.
   1C0 = U7-55 AOUTA, 1C1 = U7-54 AOUTB, 1C2 = U12 (P2 AES in, DNI), 1C3 = AOUTA; 2C0 = AOUTB, 2C1 = AOUTA, 2C2 = AOUTB, 2C3 = U12 */
const MUX = [['A','B'],['B','A'],['P2','B'],['A','P2']];
function muxAt(t){ const p=passAt(t); if (!p) return null; const sel=(p.rc4<<1)|p.rc3; return {sel, o:MUX[sel]}; }
const SRC_TXT = {A:'GS9023 AOUTA (U7-55) — ch 1/2', B:'GS9023 AOUTB (U7-54) — ch 3/4', P2:'P2 external AES input (U12/T1 — not fitted: silence)'};
function aoutSample(src, side, t){
  if (src==='P2' || !gsAudio(t)) return 0; const g=gsGroupAt(t); if (!g) return 0;
  const ch = (src==='A'?0:2) + side; return LEVEL*Math.sin(2*Math.PI*TONE_F[g-1][ch]*Math.floor(t*AES_FS)/AES_FS);
}
function aesOutSample(k, side, t){ const m=muxAt(t); if (!m) return 0; return aoutSample(m.o[k], side, t); }
function busAt(t){ const E=emulate(); for (const b of E.bus) if (t>=b.t0 && t<b.t1) return b; for (const b of E.tx) if (t>=b.t0 && t<b.t1) return b; return null; }

/* ---------------- SDI words: lines, HANC audio packets (SMPTE 272M) ---------------- */
function par9(v){ let p=0; for(let i=0;i<8;i++) p^=(v>>i)&1; return p; }
function anc(v8){ const b8=par9(v8); return v8 | (b8<<8) | ((b8^1)<<9); }
const hex3 = v => v.toString(16).toUpperCase().padStart(3,'0');
function samplesOnLine(n){ const R = AES_FS*STD[D.std].H; return Math.floor((n+1)*R) - Math.floor(n*R); }
function lineInfo(t){ const S=STD[D.std]; const n=Math.floor(t/S.H); const w=Math.floor((t-n*S.H)/WORD_T); return {n, ln:(n%S.lines)+1, w, ns:samplesOnLine(n)}; }
function toneVal(g, ch, n){ return LEVEL*Math.sin(2*Math.PI*TONE_F[g-1][ch]*n/AES_FS); }
function audioPacket(g, n){
  const ns=samplesOnLine(n), s0=Math.floor(n*AES_FS*STD[D.std].H);
  const w=[0x000,0x3FF,0x3FF, anc(AUD_DID[g]), anc((n%255)+1), anc(12*ns)], lbl=['ADF','ADF','ADF','DID','DBN','DC'];
  for (let k=0;k<ns;k++) for (let ch=0;ch<4;ch++){
    const sn=s0+k; let v=Math.round(toneVal(g,ch,sn)*524287); if (v<0) v+=1<<20; const z=(sn%192)===0?1:0;
    const x0=z|(ch<<1)|((v&0x3F)<<3), x1=(v>>6)&0x1FF; let x2=((v>>15)&0x1F);
    let p=0; for (let b=0;b<9;b++) p^=(x0>>b)&1; for (let b=0;b<9;b++) p^=(x1>>b)&1; for (let b=0;b<8;b++) p^=(x2>>b)&1; x2|=p<<8;
    const nb=x=>x|((((x>>8)&1)^1)<<9); w.push(nb(x0),nb(x1),nb(x2)); lbl.push(`s${k} ch${ch+1} X`,`s${k} ch${ch+1} X+1`,`s${k} ch${ch+1} X+2`); }
  let cs=0; for (let i=3;i<w.length;i++) cs=(cs+(w[i]&0x1FF))&0x1FF; w.push(cs|((((cs>>8)&1)^1)<<9)); lbl.push('CS');
  return {w,lbl,ns};
}
function hancLayout(n){   // packet order in HANC: embedded groups in order, control packets on the control line — order inferred
  const S=STD[D.std], out=[]; let at=S.eav;
  for (let g=1;g<=4;g++){ if (!embedded(g)) continue; const len=7+12*samplesOnLine(n); out.push({g,a:at,b:at+len,kind:'audio'}); at+=len; }
  const ln=(n%S.lines)+1; if (ln===S.ctlLine || ln===S.ctlLine+(D.std==='525'?263:312)) for (let g=1;g<=4;g++){ if (!embedded(g)) continue; if (at+18>S.eav+S.hanc) break; out.push({g,a:at,b:at+18,kind:'control'}); at+=18; }
  return out;
}
function aesFrameBits(t, k){
  const n=Math.floor(t*AES_FS), fr=n%192, out=[];
  for (const side of [0,1]){
    const v=aesOutSample(k, side, n/AES_FS); let s=Math.round(v*8388607); if (s<0) s+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    bits[28]= gsAudio(t)?0:1;  const cs0=0x85; bits[30]= fr<8 ? (cs0>>fr)&1 : 0;              // V and channel status — inferred
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, sample:v});
  }
  return {n, fr, sub:out};
}
function biphase(pre, bits, startLevel){
  const P={X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv=[]; const inv=startLevel?0:1; P.forEach(b=>lv.push(inv?1-b:b)); let cur=lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}

/* ---------------- user actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>60) D.log.length=60; SIM.refresh(); }
const clampT = () => Math.min(Math.max(SIM.t, 0), 0.9);
function nextAfter(list, t, pred){ return list.find(x=>x.t0>=t && (!pred||pred(x))); }
function cmdText(b){
  if (b===0xE8) return '0xE8 = probe (bit 3 = 1 → sdi_check)';
  if ((b&0xE0)!==0xE0) return `0x${hx(b)} (address ${(b>>5)&3} — not the DEMUX)`;
  if (b&8) return `0x${hx(b)} (bit 3 → sdi_check)`;
  if (!(b&0x10)) return `0x${hx(b)} = leave SDI (bit 4 = 0)`;
  return `0x${hx(b)} = SDI on, source s${b&7} → group ${((b&7)>>1)+1}`;
}
const A = {
  sendCmd(b){
    const t=clampT(); D.events.push({t, k:'cmd', b, user:true}); D.cmd=b; dirty();
    const E=emulate(), F=FW[D.fw];
    act(`Host sends ${cmdText(b)} + 0x55`, tr=>{
      if (D.host!=='uart'){ tr('Host is a POD19 (parallel port): there is no RS-485 master. The byte still reaches the receiver if something drives the pair — see the stray-byte test.'); }
      if (!powerAt(t)){ tr('The board is unpowered.'); return; }
      const b0=E.bus.find(x=>x.who==='host' && Math.abs(x.t0-t)<1e-9);
      tr(`RS-485 (U4 75176, P1): byte 0x${hx(b)} on the wire ${SIM.fmtT(t)} … ${SIM.fmtT(t+BYTE_T)}, then 0x55 (9600 8N1, ${SIM.fmtDur(BYTE_T)} each)`);
      if (b0 && b0.read) tr(`scanuart reads it at ${SIM.fmtT(b0.read)}: ${b0.how}`);
      const b1=E.bus.find(x=>x.who==='host' && Math.abs(x.t0-t-BYTE_T)<1e-9);
      if (b1 && b1.read) tr(`scanuart reads 0x55 at ${SIM.fmtT(b1.read)}: ${b1.how}`);
      if (F.reply==='comout') tr('scanuart1: bsf tx2,7 / bsf tx2,6 / bsf tx2,0 → settx starts counting comout1 down once per pass');
      const m=E.marks.find(x=>x.t>=t && (x.k==='group'||x.k==='sdicheck'||x.k==='leave'));
      if (m && m.t < t+0.01){ if (m.k==='group') tr(`setgroup: uart0 ≠ preuart0 → s${b&7} → group${m.v}: addr3 ← 0x${hx(A3[m.v])}, addr4 ← 0x${hx(A4[m.v])}, ${F.sdiSel?'bsf portc,3 / bcf portc,4 (mux 01)':'bcf portc,3 / bcf portc,4 (mux 00)'}`);
        else if (m.k==='sdicheck') tr('setgroup → sdi_check: movlw b\'11100000\' → tx0 (the reply will start 111…)');
        else tr(`setgroup → leave_sdi: ${F.leave==='sdi'?'bsf portc,3 / bcf portc,4 — the AES BNCs stay on the GS9023 (v1.05+)':'bcf portc,3 / bsf portc,4 — AESOUT1 switches to P2, the unfitted AES input (silent)'}`); }
      else if (b!==0xE8 && (b&0xE0)===0xE0) tr('setgroup: uart0 = preuart0 (same command as before) → return: nothing changes, but a reply is still sent');
      const r=nextAfter(E.tx, t);
      if (r && r.t0<t+0.05) tr(`Reply tx0 = 0x${hx(r.b)} = b'${bn(r.b)}' at ${SIM.fmtT(r.t0)} (${SIM.fmtDur(r.t0-(t+2*BYTE_T))} after the last stop bit): bit 1 = ${(r.b>>1)&1} (${(r.b&2)?'no SDI lock':'SDI locked'}), bit 0 = ${r.b&1} (${(r.b&1)?'no audio lock':'audio locked'})`);
      const did=E.did.find(d=>d.t>=t && d.a3!==null); if (did && did.t<t+0.01) tr(`refreshgs9023 writes addr3 = 0x${hx(did.a3)} to GS9023 register 3 at ${SIM.fmtT(did.t)} (RA3:0 = 0011, ~CS on RB2, ~WE on RA5)`);
    });
    const r=nextAfter(emulate().tx, t); SIM.seek(r && r.t1<1 ? r.t1 : Math.min(1, t+0.01));
  },
  sdi(on){
    const t=clampT(); D.events.push({t, k:'sdi', on, user:true}); dirty();
    act(on?'Plug SDI into INPUT1':'Pull the SDI cable from INPUT1', tr=>{
      tr(on? 'CLC014 equaliser and CLC016 re-clocker find a carrier: CD (U2-19) → RC2 high, ~MUTE released; CLC007 drives the re-clocked SDIOUT1':'CD falls; the CLC016 mutes; the CLC011 stops producing TRS-aligned words');
      const F=FW[D.fw];
      if (F.sdiLock==='gs') tr(`settx reads GS9023 register 0 bit 5 (video lock, ${on?'set ≈2 lines later':'clear'} — ${'inferred'}) → tx0,1 = ${on?0:1}, RE1 = ${on?1:0}, RB5 = ${on?0:1} (CD1 LED ${on?'on':'off'})`);
      else tr(`settx (v1.01–v1.03) reads the CLC016 carrier detect on RC2 → tx0,1 = ${on?0:1}, RB5 → CD1 LED ${on?'on':'off'}`);
      tr(on? 'readgs9023: register 0 bit 3 sets when the chosen group’s packets are found (next AES block, inferred) → tx0,0 = 0':'readgs9023: bit 3 clears → tx0,0 = 1; AOUTA/AOUTB go silent (inferred)');
    });
    SIM.seek(Math.min(1, t+0.006));
  },
  pod(code){
    const t=clampT(); D.events.push({t, k:'pod', code, user:true}); dirty();
    const F=FW[D.fw];
    act(`POD19 group lines → ${code>>1}${code&1} (group ${code+1})`, tr=>{
      if (D.host!=='pod') tr('Note: host is set to RS-485; the P4 lines are only read while rxflags,7 = 0.');
      if (F.test || !F.grp){ tr(`${F.n}: readgroupselect is not called — the parallel port is ignored.`); return; }
      const p=passAt(t); if (p && (p.rxflags&0x80)){ tr('rxflags,7 = 1 (a byte was received since power-up) → readgroupselect returns at once: the lines are ignored until power-off.'); return; }
      if (F.grp==='p102'){ tr(`${F.n} readgroupselect: RC0 = MSB${F.rc0out?' (but TRISC makes RC0 an output in v1.03: it reads its own latch, 0)':''}, RB7 = LSB → group = ${[1,2,4,8][(F.rc0out?0:(code>>1))*2+(code&1)]}`); tr('…and nothing ever reads “group”: setgroup only acts on UART commands. The GS9023 stays on group 1 (see Findings).'); return; }
      tr(`readgroupselect (v1.04+): RE2 (P4-3) = ${code>>1}, RC0 (P4-2) = ${code&1} → goto group${code+1}: addr3 ← 0x${hx(A3[code+1])}, addr4 ← 0x${hx(A4[code+1])}`);
      tr('refreshgs9023 writes it on the next pass (readgroupselect runs after refreshgs9023)');
      tr(embedded(code+1)? `Group ${code+1} is embedded → GS9023 register 0 bit 3 sets at the next AES block (inferred) → RE0 high (AES tally)`:`Group ${code+1} is not in this SDI → bit 3 stays 0 → RE0 low; tx0,0 = 1`);
    });
    SIM.seek(Math.min(1, t+0.006));
  },
  noise(ferr){
    const t=clampT(); D.events.push({t, k:'noise', b:ferr?0x00:0x3F, ferr, user:true}); dirty();
    const F=FW[D.fw];
    act(ferr?'Stray byte with a framing error on RX':'Stray byte 0x3F on RX', tr=>{
      tr('Something drives the RS-485 pair (P1) — e.g. noise on an unterminated, unused pair in a POD19 (inferred) — and U4 delivers a byte to RC7/RX');
      if (ferr){ tr('scanuart: btfsc rcsta,2 → FERR → rxerror2: movf rcreg,w; bcf uartflags,0 — the byte is dropped and rxflags is untouched'); return; }
      tr(F.flag7? 'scanuart: PIR1,5 (RCIF) set → bsf rxflags,7 “uart is valid, demux is in xtm4, ams4 or dms1”':'v1.01 does not set rxflags,7 (it has no parallel mode)');
      tr('bit 7 = 0 and no address before it → scanuart1 finds uartflags,0 clear → nothing else happens');
      if (F.flag7) tr('But rxflags,7 now stays set: refreshoutputmux and readgroupselect return at once on every pass. Only rxerror1 (overrun) or a power cycle clears it.');
    });
    SIM.seek(Math.min(1, t+0.004));
  },
  power(){
    const t=clampT(); const on=!powerAt(t); D.events.push({t, k:'pwr', on, user:true}); dirty();
    act(on?'Power on (P3)':'Power off (P3)', tr=>{
      if (!on){ tr('LM2596 output collapses; the GS9023 loses its registers'); return; }
      tr(`PIC16F874: oscillator start-up ≈ 1024 × 203 ns, then INIT (init43.asm) ≈ 70 cycles — about ${SIM.fmtDur(BOOT_CYC*TCY)} (PWRT assumed off, inferred)`);
      tr('INIT: TRISA = 0, TRISB = 11011011b, TRISC = 10000101b, TRISD = 0, TRISE = 11100100b; SPBRG = 7 (9600 Bd); RS-485 in receive (RC1 = 0)');
      tr(`GS9023 shadows: addr0 = 0x${hx(FW[D.fw].a0)}, addr3 = 0xEF / addr4 = 0x0F (group 1), addr6 = 0x${hx(FW[D.fw].a6)}; comout0 = comout1 = 1 (so the first reply is not delayed)`);
      tr('PORTC = 11110100b → RC4:RC3 = 10: the AES mux starts on P2 (AESOUT1 silent) until a command or a POD pass sets it');
    });
    SIM.seek(Math.min(1, t+0.002));
  },
  setFw(v){ D.fw=v; dirty(); act(`Firmware → ${FW[v].n}`, tr=>{ tr(FW[v].note||''); tr(`MAIN: ${FW[v].order.join(' → ')} → goto main`); }); },
  setHost(h){ D.host=h; dirty(); act(`Host → ${h==='pod'?'POD19 parallel port (P4)':'RS-485 master (XTM4 / AMS4 / DMS1 on P1)'}`, tr=>{ tr(h==='pod'?'P4: RB7/RC0/RE2 in, RE1/RE0 out (v1.04+). No bytes arrive, so rxflags,7 stays 0 and readgroupselect runs.':'Commands arrive on P1; the first byte sets rxflags,7 and the P4 lines are ignored from then on.'); }); },
  setStd(s){ D.std=s; dirty(); SIM.refresh(); },
  toggleEmb(g){ D.emb[g-1]=!D.emb[g-1]; dirty(); SIM.refresh(); },
  scenario(id){ loadScenario(id); D.log=[]; act('Scenario: '+SCEN[id].name, tr=>tr('Events reset; the board is emulated from its last power-up.')); },
};

SCEN.tut = {name:'Tutorial bench: board powered at 0 s, no cable, host quiet', host:'uart', emb:[1,1,0,0], ev:[{t:0,k:'pwr',on:true}]};

/* ================================================================
   DRAWING HELPERS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function txt(c, s, x, y, col, font){ c.fillStyle=col||css('--ink'); c.font=font||('11px '+css('--mono')); c.fillText(s, x, y); }
function sample(c, X, t0, t1, y, h, fn, col){
  const x0=X(t0), x1=X(t1), N=Math.max(2, Math.min(900, Math.round(x1-x0))); c.fillStyle=col;
  let run=-1; for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v = i<N && fn(tt); if (v && run<0) run=i; if (!v && run>=0){ c.fillRect(x0+(x1-x0)*run/N, y, Math.max(1,(x1-x0)*(i-run)/N), h); run=-1; } }
}
function segs(c, X, t0, t1, y, h, fn, colFn, lblFn){
  const x0=X(t0), x1=X(t1), N=Math.max(2, Math.min(900, Math.round(x1-x0)));
  let cur, st=0; const flush=(i)=>{ if (cur===undefined || cur===null){ return; } const xa=x0+(x1-x0)*st/N, xb=x0+(x1-x0)*i/N; c.fillStyle=colFn(cur); c.globalAlpha=.8; c.fillRect(xa, y+3, Math.max(1,xb-xa-0.5), h-6); c.globalAlpha=1;
    c.font='10px '+css('--mono'); const l=lblFn(cur); if (l && xb-xa>c.measureText(l).width+6){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(l, xa+3, y+h/2+3.5); } };
  for (let i=0;i<=N;i++){ const v = i<N ? fn(t0+(t1-t0)*(i+.5)/N) : '__end'; const key = v===null||v===undefined ? null : JSON.stringify(v); const ck = cur===null||cur===undefined? null : JSON.stringify(cur); if (i===0){ cur=v; st=0; continue; } if (key!==ck){ flush(i); cur=v; st=i; } }
}
const GC = () => [css('--accent'), css('--accent2'), css('--warn'), css('--bad')];

/* ================================================================
   THE BOARD — drawn to scale from the RefDes anchors in DEMUX-1ISS2.pcb
   ================================================================ */
/* mm, recovered from the P-CAD 2002 binary (RefDes text anchor, offset to the left-most/lowest anchor) */
const PLACE = {"AESOUT1":[91.44,25.6],"AESOUT2":[91.44,6.55],"C1":[88.09,81.53],"C10":[39.37,2.11],"C11":[7.54,63.83],"C12":[55.24,84.66],"C13":[41.66,77.67],"C14":[62.23,77.67],"C15":[48.01,86.69],"C16":[62.26,67.41],"C17":[35.89,15.9],"C18":[73.03,68.15],"C19":[17.65,35.86],"C2":[72.9,86.69],"C20":[62.87,62.43],"C21":[54.23,51.51],"C22":[25.65,8.74],"C23":[31.11,8.76],"C24":[42.55,61.8],"C25":[6.78,26.34],"C26":[39.37,57.99],"C27":[74.68,55.58],"C28":[65.41,57.99],"C29":[82.93,66.55],"C3":[63.5,22.43],"C30":[31.11,57.99],"C31":[27.94,47.19],"C32":[18.41,63.07],"C33":[13.34,40.21],"C34":[26.67,51.0],"C35":[10.16,62.43],"C36":[4.45,58.62],"C37":[4.45,44.65],"C38":[0.0,40.21],"C39":[44.45,25.6],"C4":[63.25,86.18],"C40":[35.05,77.06],"C41":[37.47,77.67],"C42":[87.63,46.56],"C43":[76.83,52.27],"C44":[52.7,43.38],"C45":[35.56,60.53],"C46":[83.82,43.38],"C47":[69.65,40.89],"C48":[37.47,59.26],"C49":[23.5,71.96],"C5":[77.47,68.78],"C50":[16.51,78.31],"C51":[83.26,80.64],"C6":[70.48,73.36],"C7":[67.94,77.04],"C8":[10.16,78.0],"C9":[83.19,68.78],"CD1":[3.56,32.84],"D1":[47.62,23.06],"D2":[44.45,16.08],"D3":[59.69,22.73],"D4":[59.69,16.46],"D5":[66.67,0.84],"D7":[19.81,0.76],"H4":[30.61,4.78],"INPUT1":[91.44,64.34],"L1":[47.62,0.84],"L2":[34.29,1.47],"L3":[93.5,81.33],"P1":[4.22,30.61],"P2":[46.99,37.03],"P3":[70.48,22.43],"P4":[4.6,18.75],"P5":[65.79,53.67],"R1":[89.41,88.6],"R10":[1.5,0.51],"R11":[17.75,8.69],"R12":[5.46,8.84],"R13":[64.77,80.85],"R14":[59.05,75.77],"R15":[51.82,86.69],"R16":[62.23,72.59],"R17":[38.73,61.8],"R18":[40.01,66.88],"R19":[37.97,70.18],"R2":[83.69,88.6],"R20":[39.5,75.39],"R21":[13.23,14.02],"R22":[73.03,66.24],"R23":[65.41,59.89],"R24":[13.59,29.03],"R25":[48.26,50.37],"R26":[13.69,26.09],"R27":[20.27,16.92],"R28":[18.21,11.38],"R29":[4.83,36.4],"R3":[83.69,81.61],"R30":[4.8,13.46],"R31":[85.72,56.72],"R32":[65.1,44.02],"R33":[83.82,39.57],"R34":[77.34,39.24],"R35":[53.98,57.35],"R36":[53.98,59.89],"R37":[78.49,55.07],"R4":[72.9,83.52],"R5":[17.37,6.55],"R6":[6.48,6.05],"R7":[17.35,4.8],"R8":[2.46,3.25],"R9":[17.32,0.89],"REG1":[76.61,0.0],"REG2":[0.0,75.77],"SDIOUT1":[91.44,45.29],"T1":[55.88,25.6],"T2":[87.0,25.6],"T3":[65.41,25.6],"U1":[70.99,80.09],"U10":[69.22,53.54],"U11":[24.13,64.34],"U12":[52.7,38.3],"U13":[13.34,64.34],"U14":[34.9,32.97],"U2":[59.49,62.05],"U4":[13.74,23.29],"U5":[45.09,40.21],"U6":[77.47,66.24],"U7":[2.54,52.27],"U8":[53.98,45.92],"U9":[82.55,53.54],"X1":[21.59,16.0]};
const PKG = {U1:['SO14',8.7,6],U2:['PLCC28',12.5,12.5],U4:['SO8',5,6],U5:['PLCC28',12.5,12.5],U6:['SO8',5,6],U7:['TQFP100',16,16],U8:['SO16',10,6],U9:['SO8',5,6],U10:['SO8',5,6],U11:['SSOP20',7.2,7.8],U12:['SO8',5,6],U13:['SO14',8.7,6],U14:['QFP44',12,12],
  T1:['PE65612',10,9],T2:['PE65612',10,9],T3:['PE65612',10,9],X1:['HC49',11,4.6],H4:['H2X3',7.6,5.1],CD1:['LED',4,6],P1:['PAN300',7.6,3],P2:['PAN300',7.6,3],P3:['PAN300',7.6,3],P4:['PAN600',15.2,3],P5:['PAN300',7.6,3],
  REG1:['TO263',10,15],REG2:['SOT223',6.5,7],L1:['PE-53823',13,13],L2:['AL05',9,2.5],L3:['0603',1.6,0.8],D1:['D400',9,3],D2:['D400',9,3],D3:['D400',9,3],D4:['D400',9,3],D5:['SK33',7,6],D7:['SOT23',3,2.5],
  C3:['C150R',8,8],C10:['C150R',8,8],C6:['A-case',3.5,2],C17:['A-case',3.5,2],C21:['A-case',3.5,2],C27:['A-case',3.5,2],C41:['A-case',3.5,2],C48:['A-case',3.5,2]};
const DNI = {T1:1,P2:1,D1:1,D2:1,D4:1};
const VAL = {U1:'CLC014 cable equaliser',U2:'CLC016 data re-timing PLL',U4:'75176 RS-485 (P1 link)',U5:'CLC011 serial decoder / deserialiser',U6:'CLC007 cable driver',U7:'GS9023 embedded-audio codec',U8:'74HC153 dual 4:1 mux',U9:'75176 AES driver → T2',U10:'75176 AES driver → T3',U11:'PLL1700E clock generator',U12:'75176 AES receiver (from T1)',U13:'74HC74 ÷2',U14:'PIC16F874',
  T1:'PE-65612 (DNI)',T2:'PE65612',T3:'PE65612',X1:'4.9152 MHz',H4:'ICSP header',CD1:'red LED',P1:'PAN300 RS-485',P2:'PAN300 AES in (DNI)',P3:'PAN300 power',P4:'PAN600 parallel',P5:'PAN300 AES TTL',REG1:'LM2596 buck',REG2:'LM1117-3.3',L1:'PE-53823',L2:'AL05-1.0-K',L3:'18 nH',D3:'0R link',D5:'SK33',D7:'4148'};
function boardInfo(id, t){
  const p=passAt(t), on=powerAt(t), m=muxAt(t), g=gsGroupAt(t);
  const map = {
    INPUT1:`INPUT1 — SDI in, 75 Ω (R1 75R, L3 18 nH, C1 1 µF) → CLC014. ${sdiAt(t)?'Cable in: 270 Mb/s, '+STD[D.std].name:'No cable'}. Click to ${sdiAt(t)?'pull':'plug'} (D).`,
    SDIOUT1:`SDIOUT1 — re-clocked SDI loop-through: CLC016 SDO → CLC007 → C29/R31 68R. ${sdiAt(t)?'Active':'Silent'}.`,
    AESOUT1:`AESOUT1 — 74HC153 1Y → U9 75176 → T2 → BNC. Now: ${m?SRC_TXT[m.o[0]]:'off'}.`,
    AESOUT2:`AESOUT2 — 74HC153 2Y → U10 75176 → T3 → BNC. Now: ${m?SRC_TXT[m.o[1]]:'off'}.`,
    U7:`GS9023 (U7) — DEMUX-/MUX pin 5 high (de-embed), VM2:0 = 001, AM2:0 = 100 (strapped). Holds addr3 = ${g?'0x'+hx(A3[g])+' → group '+g:'—'}; register 0: video ${gsVideo(t)?'locked':'—'}, audio ${gsAudio(t)?'locked':'—'}.`,
    U14:`PIC16F874 (U14) at 4.9152 MHz. ${p?`Pass #${p.i} (${p.cyc} cycles): ${stepAt(t).name}`:'not running'}. Click a routine in the Software tab to read it.`,
    U8:`74HC153 (U8) — select B:A = RC4:RC3 = ${p?`${p.rc4}${p.rc3}`:'—'} → AESOUT1 ← ${m?m.o[0]:'—'}, AESOUT2 ← ${m?m.o[1]:'—'}.`,
    P1:`P1 — RS-485 to the host (A on pin 1, B on pin 2, GND pin 3). Click to send the probe 0xE8 + 0x55 (P).`,
    P4:`P4 — PAN600 parallel port (POD19): 1 RB7, 2 RC0, 3 RE2, 4 RE1, 5 RE0 (each 1K series + 3K3 pull-up), 6 GND. Group code now ${podCode(t)>>1}${podCode(t)&1}. Click to step the POD19 group lines.`,
    P5:'P5 — AES TTL straight from the GS9023: pin 1 AOUTA (U7-55), pin 2 AOUTB (U7-54), pin 3 GND. XTM4-1 P5 takes pins 1 and 2 (2006 wiring diagram).',
    P3:`P3 — power in: pin 3 + (via D3 0R; D1, D2, D4 not fitted), pin 1 GND → LM2596 → +5 V → LM1117 → 3.3 V. ${on?'On':'Off'}: click to toggle (O).`,
    CD1:`CD1 — red LED from +5 V through R29 330R to RB5. Lit when RB5 = 0 = SDI locked (settx). ${p&&on?(p.rb5?'Off':'On'):'Off'}.`,
    H4:'H4 — 2×3 ICSP header: 1 +5V, 2 RB7/PGD, 3 MCLR (D7), 4 RB6/PGC, 5 GND, 6 RB3/PGM.',
    U2:'CLC016 (U2) — re-clocker; R17–R20 (2550, 3480, 5490, 6810 Ω) set the four data-rate VCO ranges; CD (pin 19) → RC2 and ~MUTE.',
    U5:'CLC011 (U5) — NRZI decode + descramble + framing (pins 9–11 tied high via R25) → 10-bit PD0–PD9 + PCLK 27 MHz → GS9023 DIN0–9.',
    U11:'PLL1700E (U11) — XT1 ← PCLK 27 MHz; SCKO2 (pin 14) → U13 74HC74 ÷2 → GS9023 ACLK (pin 99). FS pins low = 48 kHz.',
    U13:'74HC74 (U13) — second flip-flop wired ~Q→D: divides SCKO2 by 2 for ACLK.',
    U1:'CLC014 (U1) — adaptive cable equaliser; CD tied to ~MUTE.', U6:'CLC007 (U6) — SDI cable driver for SDIOUT1.',
    U4:`75176 (U4) — RS-485 transceiver; DE and ~RE both on RC1 (${p&&p.rc1?'transmitting':'receiving'}).`,
    REG1:'LM2596 (REG1) — buck regulator, L1 PE-53823, D5 SK33 catch diode → +5 V.', REG2:'LM1117-3.3 (REG2) — 3.3 V for the GS9023 core (VDDINT).',
    X1:'X1 4.9152 MHz — 1.2288 MIPS; 9600 Bd exactly with SPBRG = 7.', U9:'75176 (U9) — AES driver for AESOUT1 (always enabled).', U10:'75176 (U10) — AES driver for AESOUT2.', U12:'75176 (U12) — AES input receiver, fed from T1/P2 — both not fitted on ISS2.',
    T1:'T1 — not fitted (DNI on DEMUX-1ISS2BOM.doc).', T2:'T2 PE65612 — AESOUT1 transformer.', T3:'T3 PE65612 — AESOUT2 transformer.', P2:'P2 — AES input header, not fitted.'
  };
  return map[id] || `${id} ${VAL[id]||''}`;
}
let boardSel = 'U14';
function boardSVG(t, opts){
  opts=opts||{};
  const on=powerAt(t), p=passAt(t), sdi=sdiAt(t), m=muxAt(t);
  const fx=x=>x, fy=y=>90-y;
  let s=`<svg viewBox="-8 -6 120 112" role="img" aria-label="DEMUX-1 ISS2 board, top view, drawn from the P-CAD layout" style="width:100%;max-width:${opts.max||760}px;display:block">
    <rect x="-6" y="-4" width="98" height="98" rx="2" fill="#0f4a2b" stroke="#08301b" stroke-width=".6"/>
    <text x="-4" y="-1" font-size="2.4" fill="#d9e7dc">DEMUX-1 ISS.2 · WARD-BECK SYSTEMS LTD.</text>`;
  [[-3,-1],[89,-1],[-3,91],[89,91]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="1.4" fill="#c9b36a" stroke="#6d5d22" stroke-width=".3"/>`);
  const hot = id => `class="dm1b" data-b="${id}" style="cursor:pointer"`;
  for (const id in PLACE){
    const [x,y]=PLACE[id]; const k=PKG[id]; const cx=fx(x), cy=fy(y);
    if (/^(INPUT1|SDIOUT1|AESOUT1|AESOUT2)$/.test(id)){
      const live = id==='INPUT1'? sdi : id==='SDIOUT1'? sdi : (m && m.o[id==='AESOUT1'?0:1]!=='P2' && gsAudio(t));
      s+=`<g ${hot(id)}><title>${boardInfo(id,t)}</title><rect x="${cx-6}" y="${cy-7.5}" width="16" height="15" fill="#c5c8cc" stroke="#6f7377" stroke-width=".4"/><rect x="${cx+10}" y="${cy-5}" width="6" height="10" fill="#b2b5b9"/><circle cx="${cx+16}" cy="${cy}" r="3" fill="#d6c27c"/>
        <text x="${cx-5}" y="${cy+1}" font-size="2.3" fill="#222">${id}</text><circle cx="${cx-4}" cy="${cy-5}" r="1.2" fill="${on&&live?'#6dff7a':'#333'}"/>
        ${id==='INPUT1'&&sdi?`<rect x="${cx+16}" y="${cy-3}" width="10" height="6" rx="1" fill="#3a74b8"/>`:''}</g>`;
      continue;
    }
    if (!k){ s+=`<rect x="${cx-1.6}" y="${cy-.8}" width="3.2" height="1.6" fill="#b88a50" opacity=".85"><title>${id}</title></rect>`; continue; }
    const [pk,w,h]=k; const dni=DNI[id];
    const col = /^U/.test(id)? '#1d1f22' : /^T/.test(id)? '#2b2f33' : /^P|H4/.test(id)? '#e9e4d6' : /^C3|C10/.test(id)? '#2a3550' : /^REG|D5/.test(id)? '#303235' : /^X1/.test(id)? '#c9ccd0' : /^L1/.test(id)? '#5a4632' : '#444';
    const sel = boardSel===id ? `stroke="var(--warn)" stroke-width=".8"` : `stroke="#000" stroke-width=".25"`;
    let body;
    if (pk==='C150R'||pk==='PE-53823') body=`<circle cx="${cx}" cy="${cy}" r="${w/2}" fill="${col}" ${sel}/>`;
    else body=`<rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="${pk==='PLCC28'?1.2:.4}" fill="${dni?'none':col}" ${dni?'stroke="#d9e7dc" stroke-dasharray="1 .8" stroke-width=".35"':sel}/>`;
    if (pk==='TQFP100'||pk==='QFP44'){ const n=pk==='TQFP100'?25:11; for (let i=0;i<n;i++){ const o=-w/2+1+(w-2)*i/(n-1); s+=`<line x1="${cx+o}" y1="${cy-h/2-1}" x2="${cx+o}" y2="${cy-h/2}" stroke="#bbb" stroke-width=".2"/><line x1="${cx+o}" y1="${cy+h/2}" x2="${cx+o}" y2="${cy+h/2+1}" stroke="#bbb" stroke-width=".2"/><line x1="${cx-w/2-1}" y1="${cy+o}" x2="${cx-w/2}" y2="${cy+o}" stroke="#bbb" stroke-width=".2"/><line x1="${cx+w/2}" y1="${cy+o}" x2="${cx+w/2+1}" y2="${cy+o}" stroke="#bbb" stroke-width=".2"/>`; } }
    let extra='';
    if (id==='CD1') extra=`<circle cx="${cx}" cy="${cy}" r="1.6" fill="${on&&p&&!p.rb5?'#ff3b30':'#4a1512'}"/>`;
    if (id==='U14' && p) extra=`<text x="${cx}" y="${cy+3.6}" font-size="1.7" fill="#9fe2b4" text-anchor="middle">${stepAt(t).name||''}</text>`;
    if (id==='U7') extra=`<text x="${cx}" y="${cy+3.6}" font-size="1.8" fill="#9fe2b4" text-anchor="middle">${gsGroupAt(t)?'G'+gsGroupAt(t)+(gsAudio(t)?' lock':''):''}</text>`;
    if (id==='U8' && m) extra=`<text x="${cx}" y="${cy+4.8}" font-size="1.7" fill="#d9e7dc" text-anchor="middle">sel ${m.sel>>1}${m.sel&1}</text>`;
    s+=`<g ${hot(id)}><title>${boardInfo(id,t)}</title>${body}<text x="${cx}" y="${cy+.8}" font-size="${w>9?2.4:1.8}" fill="${/^P|H4|X1/.test(id)?'#222':'#e8eee9'}" text-anchor="middle">${id}</text>${extra}</g>`;
  }
  s+=`<text x="-4" y="101.5" font-size="1.9" fill="var(--ink2)">Parts sit on their RefDes anchors from DEMUX-1ISS2.pcb (mm, to scale); bodies are package-size outlines;</text><text x="-4" y="104" font-size="1.9" fill="var(--ink2)">dashed = not fitted (DNI); the board edge is inferred.</text></svg>`;
  return s;
}
function bindBoard(root, onSel){
  root.querySelectorAll('.dm1b').forEach(g=>g.onclick=()=>{ const id=g.dataset.b; boardSel=id;
    if (id==='INPUT1') A.sdi(!sdiAt(clampT()));
    else if (id==='P1') A.sendCmd(0xE8);
    else if (id==='P4') A.pod((podCode(clampT())+1)&3);
    else if (id==='P3') A.power();
    else { if (onSel) onSel(id); SIM.refresh(); } });
}
/* POD19 rear: the module's four BNCs through the panel (real silk, cropped) */
function rearSVG(t){
  const on=powerAt(t), sdi=sdiAt(t), m=muxAt(t), au=gsAudio(t);
  const lab = k => !on? 'unit off' : !m? '—' : `${SRC_TXT[m.o[k]]}${m.o[k]!=='P2' && au ? ', group '+gsGroupAt(t):' (silent)'}`;
  const bnc=(x,id,tip,plug,live)=>`<g ${id?`class="dm1b" data-b="${id}" style="cursor:pointer"`:''}><title>${tip}</title><circle cx="${x}" cy="162.4" r="48" fill="#1a1b1c"/><circle cx="${x}" cy="162.4" r="38" fill="#b9bcc0" stroke="#6d7175" stroke-width="3"/><circle cx="${x}" cy="162.4" r="25" fill="#d6c27c"/><circle cx="${x}" cy="162.4" r="8" fill="#7a5f12"/>
    ${plug?`<rect x="${x-24}" y="133" width="48" height="58" rx="8" fill="#3a74b8"/><rect x="${x-16}" y="186" width="32" height="135" fill="#2b5f9e"/>`:''}<circle cx="${x+52}" cy="112" r="8" fill="${live?'var(--accent)':'#555'}"/></g>`;
  return `<svg viewBox="0 0 800 321" role="img" aria-label="POD19 rear panel, DEMUX-1 section (real silkscreen)" style="width:100%;max-width:640px;border-radius:8px;display:block">
    <rect width="800" height="321" rx="8" fill="#141517"/>
    ${bnc(253.1,'AESOUT1','OUTPUT 1 = DEMUX-1 AESOUT1 — '+lab(0),false,on&&m&&m.o[0]!=='P2'&&au)}
    ${bnc(403.1,'AESOUT2','OUTPUT 2 = DEMUX-1 AESOUT2 — '+lab(1),false,on&&m&&m.o[1]!=='P2'&&au)}
    ${bnc(553.1,'SDIOUT1','SDI OUTPUT = SDIOUT1, re-clocked loop-through',false,on&&sdi)}
    ${bnc(703.1,'INPUT1',`SDI INPUT = INPUT1 — ${sdi?'click to unplug':'click to plug in'} (D)`,lastOf('sdi',t,'on',false),on&&sdi)}
    <circle cx="50.3" cy="160.5" r="11" fill="#8f9295" stroke="#55585b" stroke-width="2"/>
    <image href="${ASSET}demux1-rear.svg" width="1713" height="321"/>
    <rect x="770" y="0" width="30" height="321" fill="url(#dm1fade)"/><defs><linearGradient id="dm1fade"><stop offset="0" stop-color="#141517" stop-opacity="0"/><stop offset="1" stop-color="#141517"/></linearGradient></defs>
  </svg>`;
}
/* DEMUX-1-to-XTM4-1 wiring diagram (redrawn from DEMUX3-to-XTM4-WIRING DIAGRAM.dwg, 23 Mar 2006) */
function wiringSVG(){
  const W = (y, a, b, col, lab, up) => `<line x1="140" y1="${y}" x2="440" y2="${y}" stroke="${col}" stroke-width="3"/><text x="290" y="${up?y-6:y+15}" font-size="11" fill="var(--ink)" text-anchor="middle">${lab}</text><text x="134" y="${y+4}" font-size="10" fill="var(--ink2)" text-anchor="end">${a}</text><text x="430" y="${y+4}" font-size="10" fill="var(--ink2)">${b}</text>`;
  return `<svg viewBox="0 0 560 230" style="width:100%;max-width:560px" role="img" aria-label="DEMUX-1 to XTM4-1 harness">
    <rect x="10" y="10" width="130" height="200" fill="none" stroke="var(--ink2)"/><text x="20" y="30" font-size="13" fill="var(--ink)">XTM4-1 ISS 5</text>
    <rect x="440" y="10" width="110" height="200" fill="none" stroke="var(--ink2)"/><text x="450" y="30" font-size="13" fill="var(--ink)">DEMUX-1 ISS 2</text>
    <text x="20" y="62" font-size="11" fill="var(--ink)">P5</text><text x="520" y="62" font-size="11" fill="var(--ink)">P5</text>
    ${W(70,'pin 2','pin 2 AOUTB','#d8d8d8','WHITE',true)}${W(90,'pin 3','pin 1 AOUTA','#d33','RED')}
    <text x="20" y="122" font-size="11" fill="var(--ink)">P10</text><text x="520" y="122" font-size="11" fill="var(--ink)">P1</text>
    ${W(130,'pin 2','pin 2 B (U4-7)','#222','BLACK',true)}${W(150,'pin 1','pin 1 A (U4-6)','#d33','RED')}
    <text x="20" y="182" font-size="11" fill="var(--ink)">P12</text><text x="520" y="182" font-size="11" fill="var(--ink)">P3</text>
    ${W(185,'pin 3 +','pin 3 + (D3 0R)','#d33','RED',true)}${W(203,'pin 1 GND','pin 1 GND','#222','BLACK')}
  </svg>`;
}

/* ================================================================
   CONTROLS
   ================================================================ */
function controlsHTML(){
  const F=FW[D.fw];
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0">
    <label>Firmware <select class="dm1fw">${FW_IDS.map(k=>`<option value="${k}" ${k===D.fw?'selected':''}>${FW[k].n}</option>`).join('')}</select></label>
    <label>Host <select class="dm1host"><option value="uart" ${D.host==='uart'?'selected':''}>RS-485 master (XTM4 / AMS4 / DMS1)</option><option value="pod" ${D.host==='pod'?'selected':''}>POD19 parallel port</option></select></label>
    <label>SDI <select class="dm1std">${Object.keys(STD).map(k=>`<option value="${k}" ${k===D.std?'selected':''}>${STD[k].name}</option>`).join('')}</select></label>
    <span>Groups in the SDI: ${[1,2,3,4].map(g=>`<label><input type="checkbox" class="dm1emb" data-g="${g}" ${D.emb[g-1]?'checked':''}>${g}</label>`).join(' ')}</span></div>
   <div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0">
    <button class="dm1a" data-a="sdi">SDI cable (D)</button>
    <button class="dm1a" data-a="probe">Probe 0xE8 (P)</button>
    ${[1,2,3,4].map(g=>`<button class="dm1a" data-a="g${g}" title="Host command 0x${hx(0xF0|((g-1)<<1))}: SDI on, source s${(g-1)*2}">SDI group ${g} (${g})</button>`).join('')}
    <button class="dm1a" data-a="leave" title="Host command 0xE0: bit 4 = 0">Leave SDI (L)</button>
    <span style="margin-left:6px">POD19 lines:</span>${[0,1,2,3].map(c=>`<button class="dm1a" data-a="pod${c}">${c>>1}${c&1}</button>`).join('')}
    <button class="dm1a" data-a="noise" title="A byte that is not a framing error">Stray byte (N)</button>
    <button class="dm1a" data-a="ferr">Framing-error byte</button>
    <button class="dm1a" data-a="pwr">Power (O)</button></div>
   <div class="small" style="margin:4px 0"><label>Scenario <select class="dm1scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label>
    <span class="muted"> · ${F.n}, ${F.date}. Actions happen at the playhead (≤ 0.9 s).</span></div>`;
}
function doAction(a){
  if (a==='sdi') A.sdi(!sdiAt(clampT()));
  else if (a==='probe') A.sendCmd(0xE8);
  else if (/^g[1-4]$/.test(a)) A.sendCmd(0xF0|((+a[1]-1)<<1));
  else if (a==='leave') A.sendCmd(0xE0);
  else if (/^pod[0-3]$/.test(a)) A.pod(+a[3]);
  else if (a==='noise') A.noise(false);
  else if (a==='ferr') A.noise(true);
  else if (a==='pwr') A.power();
}
function bindControls(root){
  root.querySelectorAll('.dm1a').forEach(b=>b.onclick=()=>doAction(b.dataset.a));
  const q=s=>root.querySelector(s);
  if (q('.dm1fw')) q('.dm1fw').onchange=e=>{ A.setFw(e.target.value); SIM.openTab(curTab); };
  if (q('.dm1host')) q('.dm1host').onchange=e=>{ A.setHost(e.target.value); SIM.openTab(curTab); };
  if (q('.dm1std')) q('.dm1std').onchange=e=>A.setStd(e.target.value);
  if (q('.dm1scn')) q('.dm1scn').onchange=e=>{ A.scenario(e.target.value); SIM.seek(0); SIM.openTab(curTab); };
  root.querySelectorAll('.dm1emb').forEach(c=>c.onchange=()=>A.toggleEmb(+c.dataset.g));
}
let curTab='sim';
document.addEventListener('keydown', e=>{
  if (!window.__demux1Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (k==='d') doAction('sdi'); else if (k==='p') doAction('probe'); else if (k==='l') doAction('leave'); else if (k==='n') doAction('noise'); else if (k==='o') doAction('pwr');
  else if (/^[1-4]$/.test(k)) doAction(D.host==='pod' ? 'pod'+(+k-1) : 'g'+k);
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
const RCOL = { scanuart:'--accent', txuart:'--bad', refreshoutputmux:'--ink2', setgroup:'--warn', refreshgs9023:'--accent2', readgroupselect:'--ink2', readgs9023:'--accent', settx:'--warn' };
function lanes(full){
  const E=emulate(), P=E.P, S=STD[D.std], ls=[];
  ls.push({label:'SDI at INPUT1 (CLC016 CD)', h:16, draw(c,X,t0,t1,y,h){ sample(c,X,t0,t1,y+3,h-6,tt=>sdiAt(tt),css('--accent2')); }});
  ls.push({label:'SDI lines: EAV · HANC packets · SAV', h:28, draw(c,X,t0,t1,y,h,pw){
    const n0=Math.floor(t0/S.H), n1=Math.floor(t1/S.H);
    if (n1-n0 > pw/30){ sample(c,X,t0,t1,y+6,h-12,tt=>sdiAt(tt),css('--grid')); txt(c, `${(n1-n0+1).toLocaleString()} lines in view (${SIM.fmtDur(S.H)} each, ${S.words} words)`, X(t0)+6, y+h/2+4); return; }
    for (let n=n0;n<=n1;n++){ const tl=n*S.H; if (!sdiAt(tl)) continue;
      c.fillStyle=css('--ink2'); c.fillRect(X(tl), y+3, Math.max(1,X(tl+S.eav*WORD_T)-X(tl)), h-6);
      for (const p of hancLayout(n)){ const sel = p.g===gsGroupAt(tl); c.fillStyle= sel? css('--accent') : css('--accent2'); c.globalAlpha=p.kind==='control'?.45:.8; const xa=X(tl+p.a*WORD_T), xb=X(tl+p.b*WORD_T); c.fillRect(xa, y+3, Math.max(1,xb-xa), h-6); c.globalAlpha=1;
        if (xb-xa>40){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(`G${p.g} ${p.kind==='control'?'ctl':samplesOnLine(n)+' smp'}`, xa+2, y+h/2+3); } }
      const sav=tl+(S.eav+S.hanc)*WORD_T; c.fillStyle=css('--ink2'); c.fillRect(X(sav), y+3, Math.max(1,X(sav+4*WORD_T)-X(sav)), h-6);
      c.globalAlpha=.12; c.fillRect(X(sav+4*WORD_T), y+3, X(tl+S.H)-X(sav+4*WORD_T), h-6); c.globalAlpha=1; } }});
  ls.push({label:'RS-485 pair (P1): host / DEMUX-1', h:30, draw(c,X,t0,t1,y,h){
    for (const d of E.de){ if (d[1]<t0||d[0]>t1) continue; c.fillStyle=css('--bad'); c.globalAlpha=.25; c.fillRect(X(d[0]), y+h-5, Math.max(1,X(d[1])-X(d[0])), 4); c.globalAlpha=1; }
    const all = E.bus.concat(E.tx); let any=false;
    for (const b of all){ if (b.t1<t0||b.t0>t1) continue; any=true; const xa=X(b.t0), xb=X(b.t1);
      c.fillStyle = b.who==='dmx'? css('--bad') : b.who==='noise'? css('--warn') : /xtm/.test(b.who)? css('--ink2') : css('--accent2'); c.fillRect(xa, y+3, Math.max(1.5,xb-xa), h-10);
      if (xb-xa>34){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText('0x'+hx(b.b), xa+3, y+h/2+1); }
      if (xb-xa>300){ const bits=[0]; for (let k=0;k<8;k++) bits.push((b.b>>k)&1); bits.push(1); c.strokeStyle='#fff'; c.lineWidth=1; c.beginPath(); bits.forEach((v,k)=>{ const xx=xa+(xb-xa)*k/10, yy=y+4+(v?2:h-14); k?c.lineTo(xx,yy):c.moveTo(xx,yy); c.lineTo(xa+(xb-xa)*(k+1)/10, yy); }); c.stroke(); } }
    if (!any) txt(c, D.host==='pod'?'(POD19: nothing drives the pair)':'(no bytes in this window)', X(t0)+6, y+h/2+3, css('--ink2')); }});
  ls.push({label:'PIC16F874 main loop', h:30, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,bs(P.t0,P.n,t0)), i1=Math.max(0,bs(P.t0,P.n,t1)); const avg = P.n? P.cyc[i0]*TCY : 1e-4;
    if (X(t0+avg)-X(t0) > 60){ const ord=FW[D.fw].order;
      for (let i=i0;i<=i1 && i<P.n;i++){ let tt=P.t0[i]+TCY; for (const name of ord){ const k=RT.indexOf(name), d=P.rcyc[i*8+k]*TCY; c.fillStyle=css(RCOL[name]); c.globalAlpha=.85; c.fillRect(X(tt), y+3, Math.max(1,X(tt+d)-X(tt)-.5), h-6); c.globalAlpha=1;
        if (X(tt+d)-X(tt)>c.measureText(name).width+8){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(name, X(tt)+3, y+h/2+3); } tt+=d; } } }
    else { sample(c,X,t0,t1,y+5,h-10,tt=>!!passAt(tt),css('--accent')); txt(c, `${(i1-i0).toLocaleString()} passes in view (≈${P.n?P.cyc[Math.min(i1,P.n-1)]:0} cycles ≈ ${SIM.fmtDur((P.n?P.cyc[Math.min(i1,P.n-1)]:0)*TCY)} each)`, X(t0)+6, y+h/2+4, '#fff'); }
    for (const b of E.boots){ if (b[1]<t0||b[0]>t1) continue; c.fillStyle=css('--warn'); c.fillRect(X(b[0]), y+3, Math.max(2,X(b[1])-X(b[0])), h-6); txt(c,'INIT',X(b[0])+2,y+12,'#fff'); } }});
  ls.push({label:'rxflags,7 · uartflags,0 · rxflags,0', h:24, draw(c,X,t0,t1,y,h){
    sample(c,X,t0,t1,y+2,5,tt=>{ const p=passAt(tt); return p && (p.rxflags&0x80); },css('--warn'));
    sample(c,X,t0,t1,y+9,5,tt=>{ const p=passAt(tt); return p && (p.uartflags&1); },css('--accent2'));
    sample(c,X,t0,t1,y+16,5,tt=>{ const p=passAt(tt); return p && (p.rxflags&1); },css('--accent')); }});
  if (FW[D.fw].reply==='comout') ls.push({label:'settx: comout1 countdown (tx2,0)', h:22, draw(c,X,t0,t1,y,h){
    segs(c,X,t0,t1,y,h,tt=>{ const p=passAt(tt); return p && (p.tx2&1) ? p.comout1 : null; }, v=>css('--warn'), v=>String(v)); }});
  ls.push({label:'tx2: ,7 load ,5 send (reply pending)', h:18, draw(c,X,t0,t1,y,h){
    sample(c,X,t0,t1,y+2,6,tt=>{ const p=passAt(tt); return p && (p.tx2&0x80); },css('--bad'));
    sample(c,X,t0,t1,y+10,6,tt=>{ const p=passAt(tt); return p && (p.tx2&0x20); },css('--accent2')); }});
  ls.push({label:'GS9023 addr3 (group DID)', h:22, draw(c,X,t0,t1,y,h){
    segs(c,X,t0,t1,y,h,tt=>{ const g=gsGroupAt(tt); return g||null; }, g=>GC()[g-1], g=>`0x${hx(A3[g])} → DID ${hex3(anc(AUD_DID[g]))} (G${g})`); }});
  ls.push({label:'GS9023 reg 0: bit 5 video · bit 3 audio', h:18, draw(c,X,t0,t1,y,h){
    sample(c,X,t0,t1,y+2,6,tt=>gsVideo(tt),css('--accent2')); sample(c,X,t0,t1,y+10,6,tt=>gsAudio(tt),css('--accent')); }});
  ls.push({label:'74HC153 RC4:RC3 → AESOUT1/2', h:22, draw(c,X,t0,t1,y,h){
    segs(c,X,t0,t1,y,h,tt=>{ const m=muxAt(tt); return m? m.sel : null; }, v=>[css('--accent2'),css('--accent'),css('--bad'),css('--warn')][v], v=>`${v>>1}${v&1}: OUT1 ← ${MUX[v][0]}, OUT2 ← ${MUX[v][1]}`); }});
  if (full || D.host==='pod') ls.push({label:'P4: group code in · RE0 AES · RE1 SDI', h:30, draw(c,X,t0,t1,y,h){
    segs(c,X,t0,t1,y,14,tt=>powerAt(tt)? podCode(tt) : null, v=>GC()[v], v=>`${v>>1}${v&1}`);
    sample(c,X,t0,t1,y+16,5,tt=>{ const p=passAt(tt); return p && p.re0; },css('--accent'));
    sample(c,X,t0,t1,y+23,5,tt=>{ const p=passAt(tt); return p && p.re1; },css('--accent2')); }});
  ls.push({label:'CD1 LED (RB5 low)', h:14, draw(c,X,t0,t1,y,h){ sample(c,X,t0,t1,y+3,h-6,tt=>{ const p=passAt(tt); return p && !p.rb5; },'#e3453a'); }});
  for (let k=0;k<2;k++) ls.push({label:`AESOUT${k+1}`, h:30, draw(c,X,t0,t1,y,h,pw){
    const span=t1-t0, cols=[css('--accent'),css('--bad')];
    [0,1].forEach(sd=>{ if (span*2800 > pw/3){ c.fillStyle=cols[sd]; c.globalAlpha=.3; const N=Math.min(700,pw); for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; const m=muxAt(tt); if (m && m.o[k]!=='P2' && gsAudio(tt)) c.fillRect(X(t0)+pw*i/N, y+h/2-LEVEL*10*(h/2-3), pw/N+.5, 2*LEVEL*10*(h/2-3)); } c.globalAlpha=1; return; }
      c.strokeStyle=cols[sd]; c.lineWidth=1; c.beginPath(); const N=Math.min(1400,Math.max(200,pw*2)); for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=aesOutSample(k,sd,tt)*10; const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    if (span*48000 < pw/6) SIM.pulses(c,X,t0,t1,y+h-4,4,1/AES_FS,0,0.15/AES_FS,css('--ink2'),'frames'); }});
  ls.push({label:'AES blocks (Z preamble)', h:14, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,BLOCK,0,1/AES_FS,css('--warn'),'blocks'); }});
  return ls;
}

/* ================================================================
   VIEWS
   ================================================================ */
function traceHTML(){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Plug the SDI cable, send a host command, step the POD19 lines or inject a stray byte. The firmware path is listed here with emulated times.</div>'; }
function lastReply(t){ const E=emulate(); let r=null; for (const b of E.tx){ if (b.t0<=t) r=b; else break; } return r; }
function replyDecode(b){ if (b===null || b===undefined) return '—'; return `0x${hx(b)} = b'${bn(b)}' → ${(b&0xE0)===0xE0?'111 (sdi_check seen) · ':((b&0xC0)===0xC0?'11… · ':'')}${FW[D.fw].chLock?`ch-lock bits 5…2 = ${bn((b>>2)&15,4)} · `:''}bit 1 ${(b&2)?'no SDI lock':'SDI lock'} · bit 0 ${(b&1)?'no audio lock':'audio lock'}`; }
function inspectorHTML(t){
  const st=stepAt(t), p=st.p, li=lineInfo(t), m=muxAt(t), g=gsGroupAt(t), r=lastReply(t), b=busAt(t);
  return `<table class="kv">
    <tr><th>Power · SDI</th><td class="mono">${powerAt(t)?'on':'off'}${inBoot(t)?' (INIT)':''} · ${sdiAt(t)?`${STD[D.std].name}, line ${li.ln}, word ${li.w}`:'no cable'}</td></tr>
    <tr><th>PIC pass</th><td class="mono">${p?`#${p.i.toLocaleString()} · ${p.cyc} cycles · now in <b>${st.name}</b>`:'—'}</td></tr>
    <tr><th>rxflags · uartflags</th><td class="mono">${p?`${bn(p.rxflags)} (,7 = ${p.rxflags>>7&1} ${p.rxflags&0x80?'UART host':'parallel host'}) · ${bn(p.uartflags)}`:'—'}</td></tr>
    <tr><th>uart0 · preuart0</th><td class="mono">${p?`0x${hx(p.uart0)} · 0x${hx(p.preuart0)} — ${cmdText(p.uart0)}`:'—'}</td></tr>
    <tr><th>tx0 · tx2 · comout1</th><td class="mono">${p?`0x${hx(p.tx0)} · ${bn(p.tx2)} · ${p.comout1}`:'—'}</td></tr>
    <tr><th>GS9023</th><td class="mono">${g?`addr3 0x${hx(A3[g])} → DID ${hex3(anc(AUD_DID[g]))} (group ${g}) · reg0 = ${p?bn(p.lock):'—'} (video ${gsVideo(t)?'✓':'✗'}, audio ${gsAudio(t)?'✓':'✗'})`:'not written yet'}</td></tr>
    <tr><th>Mux RC4:RC3</th><td class="mono">${m?`${m.sel>>1}${m.sel&1} → AESOUT1 ← ${m.o[0]}, AESOUT2 ← ${m.o[1]}`:'—'}</td></tr>
    <tr><th>P4 lines</th><td class="mono">${p?`in: code ${p.code>>1}${p.code&1}${D.host==='pod'?'':' (open, pulled up)'} · out: RE0 ${p.re0} RE1 ${p.re1} · RB5 ${p.rb5} (CD1 ${p.rb5?'off':'on'})`:'—'}</td></tr>
    <tr><th>RS-485 now</th><td class="mono">${b?`${b.who==='dmx'?'DEMUX-1 →':b.who==='host'?'host →':b.who} 0x${hx(b.b)} (${b.lbl})`:'idle'} · last reply ${r?replyDecode(r.b):'—'}</td></tr>
    <tr><th>AES frame</th><td class="mono">${Math.floor(t*AES_FS).toLocaleString()} · ${Math.floor(t*AES_FS)%192}/191 of the block</td></tr></table>`;
}
function viewSim(m){
  window.__demux1Active=true; curTab='sim';
  m.innerHTML = `${card('DEMUX-1 — controls', controlsHTML())}
  <div class="grid2"><div>${card('The board (top view, ISS2 layout)', `<div id="bd"></div><div id="bsel" class="small" style="margin-top:6px"></div>`)}
    ${card('In a POD19: the module\'s four BNCs on the rear panel', `<div id="rp"></div><p class="small muted">Artwork: ${SIM.src(POD19_SILK,'POD19-FRONT&REAR(FINAL CURVE) .cdr')} (CorelDRAW, “Jun.25/14”): the REAR WHITE plate with the panel holes in grey, cropped to the DEMUX-1 section. In XTM4, AMS4 and DMS1 the board is wired with the harness below.</p>${wiringSVG()}`)}</div>
   <div>${card('At the playhead', `<div id="insp"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>
  ${card('One second — zoomable timeline (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Pass lengths are hand-counted instruction cycles from the MPASM source at 4.9152 MHz (813.8 ns per cycle): ≈ 117 cycles (95 µs) on an idle UART pass. GS9023 lock times, the HANC packet order and the test tones are ${inf}.</p>`)}`;
  bindControls(m);
  const sel = id=>{ m.querySelector('#bsel').innerHTML = `<b>${id}</b> — ${boardInfo(id, SIM.t)}`; };
  SIM.on('time', ()=>{ const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(t); bindBoard(m.querySelector('#bd'), sel); sel(boardSel);
    m.querySelector('#rp').innerHTML=rearSVG(t); bindBoard(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML=inspectorHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(false), {labelW:210}); });
}

/* ---------------- tutorial ---------------- */
function repliesUpTo(t){ return emulate().tx.filter(b=>b.t1<=t); }
const LESSONS = [
  {title:'Meet the DEMUX-1', body:`<p>The DEMUX-1 is a small board, not a box. It went inside four Ward-Beck products from ${Y(2001)}: the <b>POD19</b> SDI-to-AES de-embedder and the <b>XTM4</b>, <b>AMS4</b> and <b>DMS1</b> monitors. It takes a serial digital video signal (SDI, 270 Mb/s), finds the audio hidden in the gaps between the video lines, and gives out two AES digital audio pairs.</p>
    <p>There is no operator manual for the board itself. Its “user” is the host: either a POD19 front panel wired to the parallel port <b>P4</b>, or a monitor that sends commands over the <b>RS-485</b> link on <b>P1</b>. This tutorial follows the PIC source (<span class="mono">demux-1v106.asm</span>) step by step.</p><p class="muted">Hover over the parts on the board. Click Next.</p>`, check:()=>true, auto:true, setup:()=>{ loadScenario('tut'); D.fw='v106'; dirty(); SIM.seek(0.02); }},
  {title:'1 · Plug in the SDI', body:`<p>Click the <b>INPUT1</b> BNC (or press D). The equaliser and re-clocker find the signal; a couple of lines later the GS9023 reports video lock in register 0 bit 5. On every pass, <span class="mono">settx</span> copies that bit to RB5, and the red <b>CD1</b> LED lights.</p><p><b>Goal:</b> CD1 lit.</p>`, check:()=>{ const p=passAt(SIM.t); return p && !p.rb5; }, hint:'Click INPUT1 on the board or press D. If the LED is still dark, step the playhead forward a few ms.'},
  {title:'2 · Answer the probe', body:`<p>A host first checks that a DEMUX is fitted. It sends <span class="mono">0xE8</span> then <span class="mono">0x55</span>. Bits 6 and 5 of 0xE8 are both 1: that is the DEMUX's address on the shared bus. Bit 3 makes <span class="mono">setgroup</span> jump to <span class="mono">sdi_check</span>, which loads <span class="mono">tx0 = 1110 0000</span>.</p><p>After power-up, comout0 and comout1 are both 1, so this first reply leaves on the next pass.</p><p><b>Goal:</b> a reply starting with 111 has been sent.</p>`, check:()=>repliesUpTo(SIM.t).some(b=>(b.b&0xE0)===0xE0), hint:'Click “Probe 0xE8” (P) or click P1 on the board.'},
  {title:'3 · Select group 2', body:`<p>SDI carries up to four audio groups of four channels. The host asks for one with a command byte <span class="mono">111 1 0 ss p</span>: bit 4 = 1 means SDI, and source s2 or s3 means group 2. <span class="mono">setgroup</span> loads <span class="mono">addr3 = 0xCD</span>, and <span class="mono">refreshgs9023</span> writes it into the GS9023 on every pass.</p><p>The GS9023 then looks for packets with DID 1FD and locks at the next AES block (${inf}).</p><p><b>Goal:</b> group 2 locked.</p>`, check:()=>{ const p=passAt(SIM.t); return p && p.addr3===0xCD && gsAudio(SIM.t); }, hint:'Click “SDI group 2” (or press 2), then step forward ~5 ms.'},
  {title:'4 · The 75-pass reply delay', body:`<p>From the second command on, the reply does not leave at once. <span class="mono">scanuart1</span> sets tx2,0, and <span class="mono">settx</span> counts <span class="mono">comout1</span> down from 75, once per main-loop pass. 75 passes of about 119 cycles at 4.9152 MHz would be 7.3 ms, but the counter also runs while the previous reply is still draining (about 10 passes), so with steady polling the reply comes ≈ 65 passes ≈ <b>6.3 ms</b> after the command. Watch the “comout1 countdown” lane, then the red reply byte on the RS-485 lane.</p><p><b>Goal:</b> put the playhead past a reply that arrived more than 5 ms after its command.</p>`, check:()=>{ const E=emulate(); return E.tx.some(r=>{ if (r.t1>SIM.t) return false; const h=E.bus.filter(b=>b.who==='host' && b.t1<=r.t0).pop(); return h && r.t0-h.t1>0.005; }); }, hint:'Send any group command twice (e.g. 2, then 2 again), then use the 10 ms zoom and play forward.'},
  {title:'5 · An empty group', body:`<p>Ask for group 3. This SDI only carries groups 1 and 2 (see “Groups in the SDI”). The GS9023 never finds DID 1FB, so register 0 bit 3 stays clear. <span class="mono">readgs9023</span> sets tx0 bit 0 = 1 (“no audio lock”), and the AES outputs go quiet (${inf}).</p><p><b>Goal:</b> addr3 = 0xAB and the last reply has bit 0 = 1.</p>`, check:()=>{ const p=passAt(SIM.t), r=lastReply(SIM.t); return p && p.addr3===0xAB && r && (r.b&1) && r.t0>emulate().marks.filter(x=>x.k==='group'&&x.v===3).map(x=>x.t)[0]; }, hint:'Press 3, then wait for the reply (≈ 7 ms; scrub forward).'},
  {title:'6 · Pull the cable', body:`<p>Unplug INPUT1. The GS9023 loses video lock, <span class="mono">settx</span> sets tx0 bit 1, CD1 goes dark, and the next reply reads <span class="mono">…11</span>.</p><p class="muted">Before v1.04 the SDI lock came from the CLC016 carrier-detect pin (RC2), not from the GS9023: “changed the sdi lock from the CLC016 to the GENNUM”.</p><p><b>Goal:</b> no cable, and a reply with bit 1 = 1.</p>`, check:()=>{ const r=lastReply(SIM.t); return !sdiAt(SIM.t) && r && (r.b&2); }, hint:'Press D to pull the cable, then send any command (e.g. 2) and wait for the reply.'},
  {title:'7 · Leave SDI: v1.04 against v1.05', body:`<p>Plug the cable back in and pick group 1. Then switch the firmware to <b>v1.04</b> and send <b>Leave SDI</b> (command 0xE0: bit 4 = 0). In v1.04, <span class="mono">leave_sdi</span> sets RC4:RC3 = 10. That points AESOUT1 at P2, an AES input that is not fitted, so it goes silent.</p><p>v1.05 changed it to “keep AES active at all times”: the mux stays on the GS9023.</p><p><b>Goal:</b> firmware v1.04 with the mux on 10.</p>`, check:()=>{ const mm=muxAt(SIM.t); return D.fw==='v104' && mm && mm.sel===2; }, hint:'Choose Firmware v1.04 above, press D if needed, press 1, then L.'},
  {title:'8 · POD19 mode', body:`<p>Switch the host to <b>POD19 parallel port</b>. Nothing arrives on RS-485, so rxflags,7 stays 0. On every pass, <span class="mono">readgroupselect</span> reads the group code: RE2 (P4-3) is the high bit and RC0 (P4-2) the low bit. In v1.04 and later the tallies come back on RE0 (AES lock) and RE1 (SDI lock).</p><p><b>Goal:</b> firmware v1.06, POD19 host, group 3 selected by the lines (10).</p>`, check:()=>{ const p=passAt(SIM.t); return D.fw==='v106' && D.host==='pod' && p && p.addr3===0xAB; }, hint:'Firmware v1.06, Host = POD19, then click POD19 lines “10” (or press 3).'},
  {title:'9 · One stray byte', body:`<p>In a POD19 nothing is wired to P1 (${inf} from pod19-wiring.sch, which lists only P3, P4 and P5). Click <b>Stray byte</b>. <span class="mono">scanuart</span> sees RCIF and runs <span class="mono">bsf rxflags,7</span> before it even looks at the byte. From then on <span class="mono">refreshoutputmux</span> and <span class="mono">readgroupselect</span> return at once: the group lines are dead until power-off.</p><p class="muted">The 2010|43 listing for DEMUX-3 in POD19: “Hardware modifications to remove RS485 transceiver to eliminate UART communication from Demux3 to POD19.”</p><p><b>Goal:</b> POD19 host with rxflags,7 set.</p>`, check:()=>{ const p=passAt(SIM.t); return D.host==='pod' && p && (p.rxflags&0x80); }, hint:'Click “Stray byte” (N). Then try the POD19 line buttons: addr3 no longer follows them.'},
  {title:'10 · Why POD19 kept its own build', body:`<p>Choose <b>v1.02</b> (POD19 host, power-cycle if rxflags,7 is still set). v1.02 was the first image “for both applications”. Its <span class="mono">readgroupselect</span> stores the lines in <span class="mono">group</span>, but nothing ever reads <span class="mono">group</span>: <span class="mono">setgroup</span> only acts on UART commands. The GS9023 stays on group 1 whatever the lines say. POD19 shipped its own <span class="mono">POD19_DEMUX.asm</span> (see the POD19 plugin), and v1.04 fixed the merged image.</p><p><b>Goal:</b> v1.02, POD19 host, lines ≠ 00, GS9023 still on group 1.</p>`, check:()=>{ const p=passAt(SIM.t); return D.fw==='v102' && D.host==='pod' && p && !(p.rxflags&0x80) && podCode(SIM.t)!==0 && p.addr3===0xEF; }, hint:'Firmware v1.02, Host POD19, Power (O) twice if needed, then click a POD19 line button other than 00.'},
  {title:'Done', body:`<p>You've driven the DEMUX-1 the way its four hosts did. <b>One second</b> breaks the SDI down to lines and HANC packets, <b>Software</b> shows each routine and register, and <b>Findings</b> lists what the code and the board files are up to.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0, tutReady=false;
function viewTutorial(m){
  window.__demux1Active=true; curTab='tutorial';
  if (!tutReady){ tutReady=true; LESSONS[0].setup(); }
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — driving a DEMUX-1 as its hosts did', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The board', `${controlsHTML()}<div id="bd"></div>`)}${card('At the playhead', `<div id="insp"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{
    m.querySelector('#bd').innerHTML=boardSVG(SIM.t,{max:620}); bindBoard(m.querySelector('#bd'));
    m.querySelector('#insp').innerHTML=inspectorHTML(SIM.t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=L.check(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ lessonIdx=0; LESSONS[0].setup(); D.log=[]; SIM.openTab('tutorial'); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__demux1Active=true; curTab='second';
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="disp"></div>`)}</div>
   ${card('Zoom ladder at the playhead: 1 s → 1 field → 1 line → the HANC gap', `<canvas id="z1"></canvas><canvas id="z2" style="margin-top:6px"></canvas><canvas id="z3" style="margin-top:6px"></canvas><canvas id="z4" style="margin-top:6px"></canvas>`)}
   <div class="grid2">${card('The HANC packet under the playhead (10-bit words)', `<div id="pkt" class="scroll" style="max-height:340px"></div>`)}
    ${card('AESOUT1 at the bit level (one AES frame, biphase-mark)', `<canvas id="scope"></canvas><div id="aesb" class="small mono" style="margin-top:6px"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, S=STD[D.std], E=emulate(), P=E.P;
    const i0=Math.max(0,bs(P.t0,P.n,0)), avg=P.n? (P.t0[P.n-1]-P.t0[i0])/Math.max(1,P.n-1-i0) : 1e-4;
    const nb=E.bus.filter(b=>b.t0>=0&&b.t0<1).length, nt=E.tx.filter(b=>b.t0>=0&&b.t0<1).length;
    const rows=[
      ['SDI words (10-bit)', '27,000,000', SIM.fmtDur(WORD_T), 'CLC011 → GS9023 DIN0–9 on PCLK'],
      ['SDI serial bits', '270,000,000', '3.7 ns', 'CLC014 equaliser → CLC016 re-clocker (CD → RC2)'],
      ['Video lines', Math.round(1/S.H).toLocaleString(), SIM.fmtDur(S.H), `${S.words} words: EAV 4 · HANC ${S.hanc} · SAV 4 · active 1440`],
      ['Video fields', (1/S.field).toFixed(2), SIM.fmtDur(S.field), `${S.lines} lines per frame; audio control packets on line ${S.ctlLine}`],
      ['HANC audio packets of the chosen group', Math.round(1/S.H).toLocaleString(), '1 per line', 'ADF · DID · DBN · DC · 3 words per sample per channel · CS'],
      ['Audio samples per channel', '48,000', SIM.fmtDur(1/AES_FS), `≈ ${(AES_FS*S.H).toFixed(2)} per line (3 or 4)`],
      ['PIC main-loop passes', '≈ '+Math.round(1/avg).toLocaleString(), SIM.fmtDur(avg), 'no delay loop in v1.01–v1.06 (POD19_DEMUX.asm has a 1024-cycle rdelay1)'],
      ['PIC instructions', '1,228,800', '813.8 ns', '4.9152 MHz ÷ 4'],
      ['GS9023 register writes', '≈ '+Math.round(4/avg).toLocaleString(), '', 'addr0, addr3, addr4, addr6 rewritten on every pass'],
      ['GS9023 register reads', '≈ '+Math.round((FW[D.fw].chLock?2:1)/avg).toLocaleString(), '', 'register 0 (lock); v1.03 also reads register 1'],
      ['RS-485 bytes heard / sent', `${nb} / ${nt}`, SIM.fmtDur(BYTE_T), '9600 8N1 on P1; host polls every 200 ms ('+inf+')'],
      ['AES3 frames per output', '48,000', SIM.fmtDur(1/AES_FS), '192-frame blocks = 250 per second'],
      ['AES3 bit cells per output', '6,144,000', SIM.fmtDur(1/AES_FS/128), 'two outputs, via 74HC153 → 75176 → PE65612'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>where</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Use the transport's <b>Step</b> to move one line, one PIC pass, one RS-485 byte or one AES frame at a time.</p>`;
    m.querySelector('#dev').innerHTML=inspectorHTML(t);
    const p=passAt(t), r=lastReply(t), L=p&&!p.rb5;
    m.querySelector('#disp').innerHTML=`<svg viewBox="0 0 360 70" style="width:100%;max-width:360px"><circle cx="30" cy="35" r="14" fill="${L?'#ff3b30':'#4a1512'}"/><text x="52" y="40" font-size="13" fill="var(--ink)">CD1 (the board's only light)</text></svg>
      <table class="kv"><tr><th>What an RS-485 host reads</th><td class="mono">${r?replyDecode(r.b):'no reply yet'}</td></tr>
      <tr><th>AMS4 / XTM4 / DMS1 shows</th><td>${r? ((r.b&2)?'SDI missing (no video)':(r.b&1)?'SDI present, chosen group absent':'SDI audio OK') : '—'} <span class="small muted">(how each host words it is in its own plugin)</span></td></tr>
      <tr><th>POD19 tallies (P4)</th><td class="mono">${p?`RE1 SDI = ${p.re1} · RE0 AES = ${p.re0}${FW[D.fw].pe?'':' (v1.01–v1.03: latches stay at INIT’s 1)'}`:'—'}</td></tr>
      <tr><th>On the AES BNCs</th><td class="mono">${(()=>{ const mm=muxAt(t); return mm? `OUT1 ${mm.o[0]} · OUT2 ${mm.o[1]}${gsAudio(t)?` · group ${gsGroupAt(t)} tones`:' · silent'}`:'—'; })()}</td></tr></table>`;
    const zs=[[1,'1 s'],[S.field,'1 field'],[S.H*1.2,'1 line'],[(S.eav+S.hanc+8)*WORD_T,'HANC']];
    zs.forEach(([w,lab],k)=>{ let a=Math.max(0,Math.min(1-w,t-w/2)); if (k===0) a=0; if (k===3){ const n=Math.floor(t/S.H); a=n*S.H; } SIM.drawLanes(m.querySelector('#z'+(k+1)), lanes(false).filter(l=>/SDI lines|RS-485|main loop|addr3|reg 0|AESOUT1|blocks/.test(l.label)), {labelW:210, range:[a, a+w]}); });
    // HANC packet table
    const li=lineInfo(t); let html='';
    if (!sdiAt(t)) html='<p class="muted">No SDI.</p>';
    else { const lay=hancLayout(li.n); const pk=lay.find(q=>li.w>=q.a && li.w<q.b) || lay[0];
      if (!pk) html='<p class="muted">No embedded audio on this line.</p>';
      else { const g=gsGroupAt(t); const ap=audioPacket(pk.g, li.n);
        html=`<p class="small">Line ${li.ln} · packet for <b>group ${pk.g}</b> ${pk.kind==='control'?'(control packet DID '+hex3(anc(CTL_DID[pk.g]))+')':''} at words ${pk.a}–${pk.b-1} of the HANC. GS9023 addr3 = ${g?'0x'+hx(A3[g]):'—'}: low nibble ${g?hx(A3[g]&15,1):'—'} = DID low nibble (${hex3(anc(AUD_DID[pk.g]))} → ${hx(AUD_DID[pk.g]&15,1)}), high nibble = extended-data DID (${hx(EXT_DID[pk.g]&15,1)}) — so this packet is ${g===pk.g?'<b style="color:var(--accent)">taken</b>':'skipped'} (nibble mapping ${inf}).</p>
        <table class="kv mono"><tr><th>#</th><th>word</th><th>bits 9…0</th><th>meaning</th></tr>${ap.w.slice(0,6+12*Math.min(ap.ns,2)).map((w,i)=>`<tr ${li.w-pk.a===i?'class="hl"':''}><td>${i}</td><td>${hex3(w)}</td><td>${bn(w,10)}</td><td>${ap.lbl[i]}</td></tr>`).join('')}<tr><td>…</td><td colspan="3">${ap.w.length} words in all, ending in CS ${hex3(ap.w[ap.w.length-1])}</td></tr></table>`; } }
    m.querySelector('#pkt').innerHTML=html;
    // scope
    const F=aesFrameBits(t,0); const lvA=biphase(F.sub[0].pre,F.sub[0].bits,0), lvB=biphase(F.sub[1].pre,F.sub[1].bits,lvA[lvA.length-1]); const lv=lvA.concat(lvB);
    const {c,w}=SIM.canvas(m.querySelector('#scope'),110); const x0=10, pw=w-20, dx=pw/lv.length; c.strokeStyle=css('--accent'); c.lineWidth=2; c.beginPath(); lv.forEach((v,i)=>{ const yy=v?25:70; i?c.lineTo(x0+i*dx,yy):c.moveTo(x0,yy); c.lineTo(x0+(i+1)*dx,yy); }); c.stroke();
    c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); ['pre','aux','audio 4–27 (LSB first)','VUCP'].forEach((s,k)=>{ const at=[0,8,16,56][k]; c.fillText(s, x0+at*dx+2, 95); c.fillText(s, x0+(64+at)*dx+2, 95); });
    c.fillText(`subframe A (${F.sub[0].pre})`, x0, 12); c.fillText(`subframe B (${F.sub[1].pre})`, x0+64*dx, 12);
    m.querySelector('#aesb').innerHTML=`frame ${F.fr}/191 · A = ${F.sub[0].sample.toFixed(4)} · B = ${F.sub[1].sample.toFixed(4)} · source ${(muxAt(t)||{o:['—']}).o[0]} · V = ${F.sub[0].bits[28]} (${inf})`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLK = {
  bnc:{x:10,y:40,w:110,h:60,t:'INPUT1 BNC',s:['75 Ω, L3 18 nH','SDI 270 Mb/s'],d:'Rear BNC (POD19 “SDI INPUT”). R1 75R termination, C1 1 µF coupling.'},
  eq:{x:150,y:40,w:130,h:60,t:'U1 CLC014',s:['adaptive equaliser','CD → ~MUTE'],d:'National CLC014 cable equaliser (SO14). Its carrier detect is tied to its own ~MUTE.'},
  pll:{x:310,y:40,w:140,h:60,t:'U2 CLC016',s:['data re-timing PLL','CD → RC2'],d:'Re-clocks the SDI. R17–R20 set the four rate ranges. CD (pin 19) goes to the PIC RC2 and to ~MUTE (pin 28). Until v1.03 the firmware used CD as “SDI lock”.'},
  drv:{x:480,y:5,w:130,h:50,t:'U6 CLC007',s:['cable driver'],d:'Drives the re-clocked SDI out of SDIOUT1 through C29 1 µF and R31 68R.'},
  sdiout:{x:640,y:5,w:110,h:50,t:'SDIOUT1 BNC',s:['loop-through'],d:'“SDI OUTPUT” on a POD19; “RECLOCKED SDI OUTPUT 1” on the functional diagram.'},
  des:{x:480,y:75,w:130,h:60,t:'U5 CLC011',s:['NRZI + descramble','10-bit + PCLK'],d:'Serial decoder: PD0–PD9 and PCLK (27 MHz) to the GS9023 and the PLL1700.'},
  gs:{x:480,y:165,w:150,h:90,t:'U7 GS9023',s:['de-embed (DEMUX-/MUX = 1)','DID match: addr3/addr4','AOUTA pin 55 · AOUTB pin 54'],d:'Gennum embedded-audio codec. The PIC writes its registers over an 8-bit bus (D0–7 = RD0–7, A0–3 = RA0–3, ~CS RB2, ~RE RA4, ~WE RA5). Register 0 bits 5 and 3 are read back as video lock and audio lock.'},
  clk:{x:310,y:165,w:140,h:60,t:'U11 PLL1700 + U13 ÷2',s:['27 MHz → SCKO2 ÷ 2','→ ACLK (pin 99)'],d:'PLL1700E multi-clock generator, FS pins low (48 kHz); 74HC74 halves SCKO2 for the GS9023 audio clock (frequency '+inf+').'},
  pic:{x:150,y:165,w:140,h:90,t:'U14 PIC16F874',s:['4.9152 MHz','≈ 95 µs main loop','v1.01 … v1.06'],d:'Polled main loop: scanuart, txuart, refreshoutputmux, setgroup, refreshgs9023, readgroupselect, readgs9023, settx. No interrupts (ORG 4: RETFIE).'},
  rs:{x:10,y:150,w:110,h:50,t:'U4 75176 · P1',s:['RS-485, 9600 8N1'],d:'Half-duplex: DE and ~RE both on RC1. The XTM4, AMS4 and DMS1 talk to the board here.'},
  par:{x:10,y:215,w:110,h:60,t:'P4 parallel',s:['RB7 RC0 RE2 in','RE1 RE0 out'],d:'POD19 port. 1K series + 3K3 pull-up on every line. v1.04+: RE2:RC0 = group, RE0 = AES lock, RE1 = SDI lock.'},
  mux:{x:660,y:165,w:120,h:60,t:'U8 74HC153',s:['B:A = RC4:RC3'],d:'Dual 4:1 mux in front of the AES BNCs; input 2 of side 1 and input 3 of side 2 come from the unfitted P2 AES input.'},
  out:{x:660,y:245,w:120,h:60,t:'U9/U10 → T2/T3',s:['AESOUT1 · AESOUT2'],d:'75176 drivers, PE65612 transformers, BNCs. On a POD19 they are OUTPUT 1 and OUTPUT 2.'},
  p5:{x:480,y:275,w:150,h:40,t:'P5 AES TTL',s:['AOUTA, AOUTB → host'],d:'Straight from the GS9023 to the host (XTM4-1 P5, AMS4 P1, PODXX).'},
  led:{x:150,y:275,w:140,h:40,t:'CD1 LED',s:['RB5 low = SDI lock'],d:'The only indicator on the board.'},
};
const BLK_E = [['bnc','eq'],['eq','pll'],['pll','drv'],['drv','sdiout'],['pll','des'],['des','gs'],['des','clk'],['clk','gs'],['pic','gs'],['rs','pic'],['par','pic'],['gs','mux'],['mux','out'],['gs','p5'],['pic','led'],['pll','pic'],['pic','mux']];
let blkSel='gs';
function viewBlock(m){
  window.__demux1Active=false; curTab='block';
  m.innerHTML = `<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div><p class="small muted">Redrawn from DEMUX-1ISS2.net and from “POD19 - Demux 1 - Functional Diagram.cdr” (2004|37: high-speed receiver → data re-timing PLL → DSP. → demuxer → AES xmtr; micro-controller). Live values follow the playhead.</p>`)}
    <div>${card('Block', `<div id="bi"></div>`)}${card('POD19 functional diagram, as drawn in 2004|37', `<p class="small">SDI INPUT → <b>HIGH SPEED RECEIVER</b> → <b>DATA RETIMING PLL</b> → RECLOCKED SDI OUTPUT 1 and → <b>DSP.</b> → <b>DEMUXER</b> ↔ <b>MICRO CONTROLLER</b> → <b>AES XTMR</b> → AES 1 / AES 2 BNC (75 Ω) and, through the PODXX, AES 1 / AES 2 XLR (110 Ω); PODXX MICRO CONTROLLER: GROUP SELECT, GROUP 1–4 LEDs, TALLIES SDI / AES / ERROR.</p><p class="small muted">The drawing's “DSP.” block is the CLC011 decoder: there is no DSP on the ISS2 netlist.</p>`)}</div></div>`;
  const draw=()=>{ const t=SIM.t, p=passAt(t), m2=muxAt(t);
    const live = { pll: sdiAt(t), eq: sdiAt(t), bnc:sdiAt(t), drv:sdiAt(t), sdiout:sdiAt(t), des:sdiAt(t), gs:gsAudio(t), pic:!!p, rs: !!busAt(t), par: D.host==='pod', mux:!!m2, out: !!(m2 && gsAudio(t)), p5:gsAudio(t), led: p && !p.rb5, clk: sdiAt(t) };
    let s=`<svg viewBox="0 0 790 330" style="width:100%"><defs><marker id="dm1ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    const ctr=b=>[b.x+b.w/2, b.y+b.h/2];
    for (const [a,b] of BLK_E){ const A1=BLK[a], B1=BLK[b]; const [ax,ay]=ctr(A1), [bx,by]=ctr(B1); let x1=ax, y1=ay, x2=bx, y2=by;
      if (Math.abs(bx-ax) > Math.abs(by-ay)){ x1 = ax + Math.sign(bx-ax)*A1.w/2; x2 = bx - Math.sign(bx-ax)*B1.w/2; } else { y1 = ay + Math.sign(by-ay)*A1.h/2; y2 = by - Math.sign(by-ay)*B1.h/2; }
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.3" marker-end="url(#dm1ar)"/>`; }
    for (const k in BLK){ const b=BLK[k]; s+=`<g class="dm1k" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" fill="${blkSel===k?'color-mix(in srgb,var(--accent) 22%,var(--panel))':'var(--panel2)'}" stroke="${live[k]?'var(--accent)':'var(--line)'}" stroke-width="${live[k]?2.2:1.2}"/><text x="${b.x+8}" y="${b.y+17}" font-size="12.5" font-weight="600" fill="var(--ink)">${b.t}</text>${b.s.map((q,i)=>`<text x="${b.x+8}" y="${b.y+32+i*13}" font-size="10.5" fill="var(--ink2)">${q}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('.dm1k').forEach(g=>g.onclick=()=>{ blkSel=g.dataset.k; draw(); });
    const b=BLK[blkSel]; const extra = { gs:`<p class="mono small">addr3 = ${gsGroupAt(t)?'0x'+hx(A3[gsGroupAt(t)]):'—'} · reg0 = ${p?bn(p.lock):'—'} · AOUTA/B ${gsAudio(t)?'carrying group '+gsGroupAt(t):'silent'}</p>`,
      pic:`<p class="mono small">${p?`pass #${p.i} · ${stepAt(t).name} · uart0 0x${hx(p.uart0)} · tx0 0x${hx(p.tx0)}`:'off'}</p>`, mux:`<p class="mono small">${m2?`sel ${m2.sel>>1}${m2.sel&1}: OUT1 ← ${SRC_TXT[m2.o[0]]}; OUT2 ← ${SRC_TXT[m2.o[1]]}`:'—'}</p>`,
      rs:`<p class="mono small">${(()=>{ const bb=busAt(t); return bb?`on the wire: 0x${hx(bb.b)} (${bb.who})`:'idle'; })()}</p>`, par:`<p class="mono small">code ${podCode(t)>>1}${podCode(t)&1}${D.host==='pod'?'':' (open: pull-ups)'} · RE0 ${p?p.re0:'—'} · RE1 ${p?p.re1:'—'}</p>` }[blkSel]||'';
    m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>${extra}`; };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x, y, w, title, L, R, sub){
  const h=Math.max(L.length,R.length)*16+42;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="var(--panel2)" stroke="var(--ink2)"/><text x="${x+w/2}" y="${y+15}" font-size="11.5" font-weight="600" text-anchor="middle" fill="var(--ink)">${title}</text>${sub?`<text x="${x+w/2}" y="${y+h-6}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${sub}</text>`:''}`;
  L.forEach(([pin,name,net],i)=>{ const yy=y+30+i*16; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+3.5}" font-size="9.5" fill="var(--ink)">${name}</text><text x="${x-3}" y="${yy-3}" font-size="8.5" text-anchor="end" fill="var(--ink2)">${pin}</text>${net?`<text x="${x-38}" y="${yy+3.5}" font-size="9.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  R.forEach(([pin,name,net],i)=>{ const yy=y+30+i*16; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+3.5}" font-size="9.5" text-anchor="end" fill="var(--ink)">${name}</text><text x="${x+w+3}" y="${yy-3}" font-size="8.5" fill="var(--ink2)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+3.5}" font-size="9.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  {name:'1 · SDI front end', note:'INPUT1 → L3/R1/C1 → R3/R4 110R → U1 CLC014 → U2 CLC016 (R13/R14 75R pull-ups) → U5 CLC011 and U6 CLC007 → SDIOUT1. Pin names from DEMUX-1ISS2.sch, nets from DEMUX-1ISS2.net.', svg:()=>
    chip(150,20,130,'U1 CLC014',[['8','DI','R3 ← C1 ← INPUT1'],['9','~DI','R4 ← C2'],['3','oem',''],['10/11','Vee','GND']],[['13','DO','→ U2-5'],['14','~DO','→ U2-6'],['5','CD','= ~MUTE (12)'],['6/7','aec±','C9 100p']],'adaptive cable equaliser')
   +chip(640,20,150,'U2 CLC016',[['5','DDI','U1-13 (R13 75R)'],['6','~DDI','U1-14 (R14 75R)'],['13','R0','R20 6810'],['14','R1','R19 5490'],['15','R2','R18 3480'],['17','R3','R17 2550'],['18','RTN','R17–R20 common']],[['24/25','SDO/~SDO','→ U5-5/6, U6-7/6'],['22/23','~SCO/SCO','→ U5-8/7'],['19','CD','→ RC2 (U14-36)'],['28','~MUTE','= CD'],['9/10/12','~VC FD VC','R15 511R, C13/C15 loop']],'data re-timing PLL')
   +chip(150,230,130,'U6 CLC007',[['7','Vin+','U2-24'],['6','Vin-','U2-25']],[['1','Q0','C29 1µF → R31 68R → SDIOUT1'],['1','','R37 150R to GND']],'cable driver')
   +chip(640,230,150,'U5 CLC011',[['5/6','SD±','U2 SDO'],['7/8','SC±','U2 SCO'],['9/10/11','NRZ1 DESC FE','R25 1K to +5V']],[['17,19–25,27,28','PD0–PD9','→ U7 DIN0–9'],['16','PCLK','→ U7-24, U11-6'],['15','TRS','n.c.'],['1','EAV','n.c.']],'serial decoder / deserialiser')},
  {name:'2 · GS9023 and the PIC bus', note:'GS9023 strapping from the netlist: pin 5 DEMUX-/MUX = +5 V (de-embed), VM2:VM0 (2,3,4) = 0,0,1, AM2:AM0 (95,96,97) = 1,0,0, ANCI/TRS/EDH_INS/MUTE (91–94) = GND; LOCK (68), BUFERR (70), WCOUT (53), PKT0–8 and DOUT0–9 are not connected: the firmware reads lock through register 0 instead.', svg:()=>
    chip(390,20,190,'U7 GS9023 (TQFP100)',[['16…6','DIN0–DIN9','U5 PD0–PD9'],['24','PCLK','27 MHz'],['99','ACLK','U13 2Q (÷2)'],['18','/RESET','RC5 (U14-43), held high'],['5','DEMUX-/MUX','+5V'],['2,3,4','VM2..VM0','0 0 1'],['95,96,97','AM2..AM0','1 0 0']],
     [['72,73,74,77–81','DATA0–7','RD0–RD7'],['89…86','ADDR0–3','RA0–RA3'],['85','/CS','RB2'],['83','/RE','RA4 (R27 1K pull-up)'],['84','/WE','RA5'],['55','AOUTA','U8 1C0/1C3/2C1, P5-1'],['54','AOUTB','U8 1C1/2C0/2C2, P5-2'],['68','LOCK','n.c.']],'embedded audio codec · 3.3 V core, 5 V I/O')
   +`<text x="20" y="320" font-size="11" fill="var(--ink)">Write cycle (refreshgs9023): PORTD ← data, PORTA ← 1111 aaaa, bcf portb,2 (~CS), bcf porta,5 (~WE, 1 cycle = 814 ns), bsf porta,5, bsf portb,2.</text><text x="20" y="338" font-size="11" fill="var(--ink)">Read cycle (readgs9023): PORTA ← 1111 0000, ~CS low, ~RE low (RA4 is open-drain: R27 pulls it up), nop, movf portd,w → lock.</text>`},
  {name:'3 · PIC16F874 (U14, QFP44)', note:'Every pin from DEMUX-1ISS2.net with the pin names of the ISS2 symbol. Comments in init43.asm name some pins differently (see Findings).', svg:()=>
    chip(400,10,160,'U14 PIC16F874',[['19–22','RA0–RA3','GS9023 ADDR0–3'],['23','RA4','~RE'],['24','RA5','~WE'],['8/9','RB0/RB1','n.c.'],['10','RB2','~CS'],['11','RB3/PGM','H4-6'],['14','RB4','n.c.'],['15','RB5','R29 330R → CD1'],['16','RB6/PGC','H4-4'],['17','RB7/PGD','I/O1 → P4-1, H4-2'],['18','~MCLR','D7 → H4-3'],['30/31','OSC','X1 4.9152 MHz']],
     [['38–41,2–5','RD0–RD7','GS9023 DATA0–7'],['32','RC0','I/O2 → P4-2'],['35','RC1','U4 DE + ~RE'],['36','RC2','CD (CLC016)'],['37','RC3','OUTSEL0 (U8 A)'],['42','RC4','OUTSEL1 (U8 B)'],['43','RC5','GS9023 /RESET'],['44','RC6/TX','U4-4 D'],['1','RC7/RX','U4-1 R (R21 10K)'],['25','RE0','I/O5 → P4-5'],['26','RE1','I/O4 → P4-4'],['27','RE2','I/O3 → P4-3']],'4.9152 MHz · ICSP on H4')},
  {name:'4 · AES outputs and the mux', note:'U8 74HC153 from the netlist. Select: A (pin 14) = OUTSEL0 = RC3, B (pin 2) = OUTSEL1 = RC4. U12, T1 and P2 form an AES input path that DEMUX-1ISS2BOM.doc marks DNI.', svg:()=>
    chip(390,20,170,'U8 74HC153',[['6','1C0','AOUTA'],['5','1C1','AOUTB'],['4','1C2','U12 RX (P2 in)'],['3','1C3','AOUTA'],['10','2C0','AOUTB'],['11','2C1','AOUTA'],['12','2C2','AOUTB'],['13','2C3','U12 RX (P2 in)'],['14','A','RC3'],['2','B','RC4']],[['7','1Y','→ U9-4 → T2 → AESOUT1'],['9','2Y','→ U10-4 → T3 → AESOUT2'],['1/15','~G','GND']],'dual 4:1 mux')
   +`<g font-size="11" fill="var(--ink)"><text x="20" y="245">B A  AESOUT1  AESOUT2   used by</text>${MUX.map((o,i)=>`<text x="20" y="${263+i*16}" class="mono">${i>>1} ${i&1}  ${o[0].padEnd(8)} ${o[1].padEnd(8)}  ${['v1.02/v1.03 SDI and POD','v1.04+ SDI (and v1.05+ leave_sdi)','INIT, nosdi, v1.01–v1.04 leave_sdi','never'][i]}</text>`).join('')}</g>`},
  {name:'5 · Clocks, power, connectors', note:'Power from P3 pin 3 through D3 (a 0R link: the bridge D1, D2, D4 is not fitted) into the LM2596 buck → +5 V; LM1117-3.3 → 3 V for the GS9023 core. Connectors from the netlist and the 2006 XTM4 harness drawing.', svg:()=>
    chip(130,20,150,'U11 PLL1700E',[['6','XT1','PCLK 27 MHz'],['2','MODE','+5V'],['19/20','FS0/FS1','GND (48 kHz)'],['18','RST','+5V']],[['14','SCKO2','→ U13-11'],['12,13,17','SCKO1/4/3','n.c.'],['10/11','MCKO','n.c.']],'multi-clock generator')
   +chip(640,20,120,'U13 74HC74',[['11','2CLK','SCKO2'],['12','2D','= 2~Q (8)']],[['9','2Q','→ GS9023 ACLK'],['1–4','1st FF','GND']],'÷ 2')
   +chip(130,190,130,'P1 / P3 / P5',[['P1-1','A','U4-6'],['P1-2','B','U4-7'],['P3-3','+ in','D3 → LM2596'],['P3-1','GND',''],['P5-1','AOUTA',''],['P5-2','AOUTB','']],[],'PAN300 headers')
   +chip(640,190,130,'P4 PAN600',[['1','RB7','R10/R9'],['2','RC0','R8/R7'],['3','RE2','R6/R5'],['4','RE1','R12/R11'],['5','RE0','R30/R28'],['6','GND','']],[],'1K series · 3K3 pull-up')},
];
let sheetIdx=0;
function viewSchem(m){
  window.__demux1Active=false; curTab='schematic';
  m.innerHTML = card('Schematics — redrawn, not the original CAD', `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${SHEETS.map((s,i)=>`<button class="dm1s ${i===sheetIdx?'on':''}" data-i="${i}">${s.name}</button>`).join('')}</div><div id="sh"></div><p class="small muted" id="shn"></p>
    <p class="small muted">Redrawn from DEMUX-1ISS2.net (all 104 nets) and the pin names embedded in DEMUX-1ISS2.sch (P-CAD 2001 binary, ISS.2). Component values follow DEMUX-1ISS2BOM.doc (2004|37); the older CSV DEMUX-1ISS2.bom differs (see Findings).</p>`);
  const draw=()=>{ const S=SHEETS[sheetIdx]; m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 1000 380" style="width:100%;max-width:1200px">${S.svg()}</svg>`; m.querySelector('#shn').textContent=S.note;
    m.querySelectorAll('.dm1s').forEach(b=>b.onclick=()=>{ sheetIdx=+b.dataset.i; m.querySelectorAll('.dm1s').forEach(x=>x.classList.toggle('on', +x.dataset.i===sheetIdx)); draw(); }); };
  draw();
}

/* ---------------- software ---------------- */
const SRC = {
  scanuart:`scanuart  btfsc rcsta,2   ;was there a framing error
          goto rxerror2
          btfsc rcsta,1   ;was there an overrun error
          goto rxerror1
          BTFSS PIR1,5    ;IS RX BUFFER FULL
          return
          bsf rxflags,7   ;uart is valid, demux is in xtm4,ams4 or dms1
          MOVF RCREG,W
          movwf uart2
          btfss uart2,7   ;was it an address byte
          goto scanuart1
          btfss uart2,6
          return
          btfss uart2,5
          return
          movwf uart0
          bsf uartflags,0 ;address receive flag
          return
scanuart1 btfsc uartflags,0
          bsf rxflags,0   ;only refresh if command received
          bcf uartflags,0
          btfss rxflags,0 ;return lock status
          return
          bsf tx2,7
          bsf tx2,6
          bsf tx2,0
          return`,
  txuart:`txuart    btfss tx2,5
          return          ;no data to send
          btfss tx2,7     ;has address been sent
          goto txuart1
          bsf PORTc,1     ;enable transmiter
          movf tx0,w
          movwf txreg
          bcf tx2,7
          return
txuart1   bank1
          btfss txsta,1   ;is tsr empty
          goto txuart2
          bank0
          bcf PORTc,1     ;turn transmitter off
          clrf tx2
          return`,
  refreshoutputmux:`refreshoutputmux
          btfsc rxflags,7 ;not using uart
          return
          btfss porte,1
          goto nosdi
          bsf portc,3
          bcf portc,4
          return
nosdi     bcf portc,3
          bsf portc,4
          return`,
  setgroup:`setgroup  btfss rxflags,0  ;only refresh if command received
          return
          bcf rxflags,0
          movf preuart0,w
          subwf uart0,w
          btfsc status,z
          return          ;only update if new source
          movf uart0,w
          movwf preuart0
          btfsc uart0,3
          goto sdi_check
          btfss uart0,4   ;sdi source on/off
          goto leave_sdi
          ... s0…s7 → group1…group4
group2    movlw B'11001101'
          movwf addr3     ;DID audio packet ext/group
          movlw B'00001110'
          movwf addr4     ;DID control packet
          return
leave_sdi bsf portc,3     ;v1.05+: was bcf portc,3 / bsf portc,4
          bcf portc,4
          return
sdi_check movlw b'11100000'
          movwf tx0
          return`,
  refreshgs9023:`refreshgs9023
          bank1
          clrf trisd
          bank0
          movf addr0,w
          movwf portd     ;data
          movlw b'11110000'
          movwf porta     ;address
          bcf portb,2     ;cs low
          bcf porta,5     ;writepulse
          bsf porta,5
          bsf portb,2     ;cs high
          ... same for addr3 (0011), addr4 (0100), addr6 (0110)
          bank1
          movlw 255
          movwf trisd
          bank0
          return`,
  readgroupselect:`readgroupselect
          btfsc rxflags,7 ;not using uart
          return
          btfss porte,2
          goto gsel1
          btfss portc,0
          goto gsel2
          goto group4
gsel1     movlw 2
          btfss portc,0
          movlw 1
          movwf group
          btfsc group,0
          goto group1
          goto group2
gsel2     goto group3`,
  readgs9023:`readgs9023
          movlw b'11110000'
          movwf porta     ;address0
          bcf portb,2     ;cs low
          bcf porta,4     ;readpulse low
          nop
          movf portd,w    ;read data
          movwf lock
          bsf porta,4
          bsf portb,2
          btfss lock,3
          bsf tx0,0       ;indicate no lock
          btfsc lock,3
          bcf tx0,0       ;indicate aes lock
          btfsc tx0,0
          bcf porte,0
          btfss tx0,0
          bsf porte,0
          return`,
  settx:`settx     btfss lock,5
          bsf tx0,1       ;indicate no lock
          btfsc lock,5
          bcf tx0,1       ;indicate SDI lock
          ... tx0,1 → porte,1 (inverted), portb,5
          btfss tx2,0
          return
          decfsz comout1,f
          return
          decfsz comout0,f
          return
          movlw 1
          movwf comout0
          movlw 75
          movwf comout1
          bsf tx2,5
          return`,
};
let swSel=null;
function viewSoft(m){
  window.__demux1Active=false; curTab='software';
  m.innerHTML = `${card('Firmware', `<div class="small">${controlsHTML()}</div>`)}
   <div class="grid2">${card('Main loop (live: the routine under the playhead is lit; click one to read it)', `<div id="ml"></div>`)}${card('Source', `<pre id="src" class="log" style="white-space:pre;max-height:420px"></pre>`)}</div>
   <div class="grid2">${card('RS-485 protocol (scanuart / settx)', `<div id="proto"></div>`)}${card('Receive state machine', `<div id="sm"></div>`)}</div>
   <div class="grid2">${card('GS9023 register shadows (init43.asm)', `<div id="regs"></div>`)}${card('PIC ports at the playhead', `<div id="ports"></div>`)}</div>
   ${card('Version history (folders #v101 … #v106test)', `<div id="ver"></div>`)}`;
  bindControls(m);
  const draw=()=>{
    const t=SIM.t, st=stepAt(t), p=st.p, F=FW[D.fw];
    const ord=F.order; const bw=Math.min(118, 760/(ord.length+1));
    let s=`<svg viewBox="0 0 ${(ord.length)*(bw+8)+90} 150" style="width:100%"><text x="6" y="70" font-size="12" fill="var(--ink)">MAIN</text><text x="6" y="84" font-size="9.5" fill="var(--ink2)">clrwdt</text>`;
    ord.forEach((r,i)=>{ const x=60+i*(bw+8), on=st.name===r, k=RT.indexOf(r); s+=`<g class="dm1r" data-r="${r}" style="cursor:pointer"><rect x="${x}" y="40" width="${bw}" height="56" rx="7" fill="${on?css(RCOL[r]):'var(--panel2)'}" stroke="${swSel===r?'var(--warn)':'var(--line)'}" stroke-width="${swSel===r?2.5:1}"/><text x="${x+bw/2}" y="62" font-size="${bw<100?9:10.5}" text-anchor="middle" fill="${on?'#fff':'var(--ink)'}">${r}</text><text x="${x+bw/2}" y="80" font-size="10" text-anchor="middle" fill="${on?'#fff':'var(--ink2)'}">${p?p.rc[k]+' cyc':''}</text></g>`; if (i<ord.length-1) s+=`<line x1="${x+bw}" y1="68" x2="${x+bw+8}" y2="68" stroke="var(--ink2)"/>`; });
    const xe=60+ord.length*(bw+8); s+=`<path d="M${xe-8} 96 v26 H40 V68 h18" fill="none" stroke="var(--ink2)"/><text x="${xe/2}" y="138" font-size="10.5" text-anchor="middle" fill="var(--ink2)">goto main · ${p?`pass #${p.i}: ${p.cyc} cycles = ${SIM.fmtDur(p.cyc*TCY)}`:'not running'}</text></svg>`;
    m.querySelector('#ml').innerHTML=s;
    m.querySelectorAll('.dm1r').forEach(g=>g.onclick=()=>{ swSel=g.dataset.r; draw(); });
    const shown = swSel || (SRC[st.name]? st.name : 'scanuart'); const code=SRC[shown] || '(goto main)';
    m.querySelector('#src').textContent = `; ${shown} — demux-1v106.asm / demux-1.asm (v1.06; excerpt)\n` + code + (F.id!=='v106'&&FW[D.fw].note?`\n\n; ${F.n}: ${F.note}`:'');
    const r=lastReply(t);
    m.querySelector('#proto').innerHTML=`<table class="kv"><tr><th>byte</th><th>7</th><th>6 5</th><th>4</th><th>3</th><th>2 1 0</th></tr>
      <tr><td>host 1st (uart0)</td><td>1 = address</td><td>11 = DEMUX</td><td>1 = SDI on</td><td>1 = sdi_check</td><td>s2..s0 → group (s≫1)+1</td></tr>
      <tr><td>host 2nd</td><td>0</td><td colspan="4">“level” (0x55 from AMS4, ams4.js) — ignored by the DEMUX-1</td></tr>
      <tr><td>reply tx0</td><td colspan="2">111 after sdi_check, else 000</td><td colspan="2">${F.chLock?'v1.03: bits 5…2 = channel no-lock':'0'}</td><td>bit 1 no SDI lock · bit 0 no audio lock</td></tr></table>
      <p class="small mono">uart0 = ${p?'0x'+hx(p.uart0)+' → '+cmdText(p.uart0):'—'}<br>last reply = ${r?replyDecode(r.b)+' at '+SIM.fmtT(r.t0):'—'}</p>
      <p class="small muted">The header comment describes the XTM4's own frame (“a1,a0 = 00 analog, 01 aes, 10 sdi, 11 spare”); on the shared DMS1/XTM4 bus a1,a0 is the board address and 11 is the DEMUX (dms1.js: “address 11”). ${F.reply==='comout'?`Reply delay: comout1 reloads to ${COMOUT} but keeps counting while the last reply drains, so ≈65 passes (≈6.3 ms) after each command; the first one after power-up goes on the next pass.`:'Reply: '+(F.reply==='scan'?'same pass':'next pass')+' (no comout counter before v1.04).'}</p>`;
    const nodes=[['idle','RCIF = 0'],['address','uartflags,0 = 1'],['command','rxflags,0 = 1'],['armed',F.reply==='comout'?'tx2 = 1100 0001, comout1 counts':'tx2 = 1110 0000'],['send','tx2,5: TXREG ← tx0, RC1 = 1'],['drain','txuart1 waits for TRMT, RC1 = 0, clrf tx2']];
    const cur = !p? -1 : (p.tx2&0x20)&&!(p.tx2&0x80) ? 5 : (p.tx2&0x20) ? 4 : (p.tx2&1)||(p.tx2&0x80) ? 3 : (p.rxflags&1) ? 2 : (p.uartflags&1) ? 1 : 0;
    m.querySelector('#sm').innerHTML=`<svg viewBox="0 0 560 150" style="width:100%">${nodes.map((n,i)=>{ const x=10+(i%3)*185, y=10+Math.floor(i/3)*72; return `<rect x="${x}" y="${y}" width="170" height="52" rx="8" fill="${i===cur?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+20}" font-size="12" font-weight="600" fill="${i===cur?'#fff':'var(--ink)'}">${n[0]}</text><text x="${x+8}" y="${y+38}" font-size="9.5" fill="${i===cur?'#fff':'var(--ink2)'}">${n[1]}</text>`; }).join('')}</svg>
      <p class="small muted">rxflags,7 (“UART host”) is set by any received byte and only cleared by rxerror1 (overrun) or power-up. rxerror2 (framing error) only drops the byte.</p>`;
    const R=[['0','addr0',F.a0,'0x81 NTSC / 0x85 PAL (bit 2) — “PAL BIT 2=1, NTSC BIT 2=0”; read back as status: bit 5 video lock, bit 3 audio lock (from the code comments)'],['3','addr3',p?p.addr3:0xEF,'DID audio packet ext/group: high nibble = extended-data DID, low nibble = audio DID (0xEF/0xCD/0xAB/0x89)'],['4','addr4',p?A4[A3G[p.addr3]]:0x0F,'DID control packet (0x0F…0x0C)'],['6','addr6',F.a6,'0x05 until v1.05; v1.06 clears bit 2 so the GS9023 leaves the Dolby E CRC alone'],['1','(read, v1.03)',null,'channel lock bits 3…0 → tx0 bits 5…2'],['7–15','addr7…addr15',0,'“read only”: cleared in INIT, never written']];
    m.querySelector('#regs').innerHTML=`<table class="kv"><tr><th>reg</th><th>shadow</th><th>value</th><th>meaning</th></tr>${R.map(x=>`<tr><td class="mono">${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]===null?'—':'0x'+hx(x[2])+' '+bn(x[2])}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const pins = p? [['RC1 RS-485 DE',p.rc1],['RC3 OUTSEL0',p.rc3],['RC4 OUTSEL1',p.rc4],['RC2 CD (in)',sdiAt(t)?1:0],['RE2 / RC0 group (in)',`${p.code>>1} / ${p.code&1}`],['RE0 AES tally',p.re0],['RE1 SDI tally',p.re1],['RB5 CD1 LED (0 = lit)',p.rb5],['RB2 ~CS',st.name==='refreshgs9023'||st.name==='readgs9023'?'pulsing':1],['RC5 GS9023 /RESET',1]] : [];
    m.querySelector('#ports').innerHTML = p? `<table class="kv">${pins.map(x=>`<tr><th>${x[0]}</th><td class="mono">${x[1]}</td></tr>`).join('')}</table>` : '<p class="muted">Not running.</p>';
    m.querySelector('#ver').innerHTML=`<table class="kv"><tr><th>version</th><th>header date</th><th>what changed (from the diffs)</th></tr>${FW_IDS.map(k=>`<tr ${k===D.fw?'class="hl"':''}><td class="mono">${FW[k].n}</td><td>${FW[k].date}</td><td class="small">${FW[k].note||(FW[k].pal?`PAL build of ${FW[k].n.split(' ')[0].replace('b','')}: addr0 = 0x85 (“PAL BIT 2=1”)`:'')}</td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__demux1Active=false; curTab='findings';
  const F=(h,b)=>`<li style="margin-bottom:9px"><b>${h}</b><br><span class="small">${b}</span></li>`;
  m.innerHTML = card('What the DEMUX-1 and its files are up to', `<ol>
   <li><b>Artwork 2026|59: the POD19 rear now comes from ${SIM.src(POD19_SILK,'POD19-FRONT&REAR(FINAL CURVE) .cdr')} (26 Jun 2014|47).</b> The sheet holds three plates (FRONT GREEN, FRONT WHITE, REAR WHITE); only the rear is used here because that is where the DEMUX-1's four BNCs come through. The OUTPUT 1 and SDI INPUT holes carry a printed cross while OUTPUT 2 and SDI OUTPUT do not; the silk does not say why ${inf}. The sheet is a 2014|47 redraw, twelve years after the module's ISS2, so it shows the panel as last built rather than the 2001|34 original (${SIM.src('#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD19/POD19SLKv3.cdr','POD19SLKv3.cdr')}, Nov 2001, is the older art).</li>
    ${F('One stray byte locks a POD19 out of its own group switch.', '<span class="mono">scanuart</span> runs <span class="mono">bsf rxflags,7</span> on any byte with RCIF set, before it checks the address. After that, <span class="mono">refreshoutputmux</span> and <span class="mono">readgroupselect</span> return at once, until <span class="mono">rxerror1</span> (overrun) or a power cycle. In a POD19 the RS-485 pair on P1 is not wired (pod19-wiring.sch lists only P3, P4 and P5), so a floating receiver could do it ('+inf+'). The 2010|43 listing fixed the same problem for DEMUX-3 in hardware: “remove RS485 transceiver to eliminate UART communication from Demux3 to POD19”.')}
    ${F('v1.02 and v1.03 cannot select a group from the POD19 lines.', '<span class="mono">readgroupselect</span> stores 1/2/4/8 in <span class="mono">group</span>, but no routine reads <span class="mono">group</span>: <span class="mono">setgroup</span> starts with <span class="mono">btfss rxflags,0 / return</span> (UART only). The GS9023 stays on INIT’s addr3 = 0xEF (group 1). POD19 therefore ran its own POD19_DEMUX.asm (pod19.js). v1.04 fixed it by jumping straight to group1…group4.')}
    ${F('v1.04 moved the parallel port by one pin.', 'v1.02 reads RC0 (P4-2) as MSB and RB7 (P4-1) as LSB, like POD19_DEMUX.asm. v1.04+ reads RE2 (P4-3) as MSB and RC0 (P4-2) as LSB, and drives RE0 (P4-5) = AES lock and RE1 (P4-4) = SDI lock. POD19_DEMUX.asm drives its AES tally on PORTE,1 (P4-4). A POD19 harness built for one image needs rewiring for the other. The archive’s harness drawing does not keep its pin numbers, so the actual wiring is not recoverable.')}
    ${F('v1.03 makes RC0 an output, then reads it.', 'init43.asm v1.03 sets TRISC = 1000 0100 (RC0 output) while readgroupselect still tests portc,0. It reads its own latch (0). v1.02 and v1.04 use 1000 0101.')}
    ${F('With nothing on P4, the board starts on group 4.', 'Every P4 line has a 3K3 pull-up (R5, R7, R9, R11, R28). Until the first byte arrives, an XTM4/AMS4/DMS1 board runs readgroupselect with RE2 = RC0 = 1 → <span class="mono">goto group4</span> → addr3 = 0x89. The probe 0xE8 does not change the group (sdi_check only loads tx0), so group 4 stays until the first SDI command with bit 4 = 1.')}
    ${F('The AES mux starts on an unfitted input.', 'INIT writes PORTC = 1111 0100: RC4:RC3 = 10, so 74HC153 side 1 selects 1C2 = U12, the AES input receiver fed by T1/P2, which DEMUX-1ISS2BOM.doc lists as DNI. AESOUT1 is silent until a command or a POD pass sets the mux. In v1.01–v1.04, <span class="mono">leave_sdi</span> also goes back to 10. v1.05 “keeps AES active at all times”.')}
    ${F('v1.04+ swaps the two pairs on the BNCs.', 'v1.02/v1.03 select 00 for SDI (AESOUT1 ← AOUTA, AESOUT2 ← AOUTB). v1.04 changed the s0…s7 branches to bsf portc,3 → 01, so AESOUT1 ← AOUTB (U7-54) and AESOUT2 ← AOUTA (U7-55). P5, which XTM4-1 uses, is wired straight to the GS9023 and does not change. Whether AOUTA is channels 1/2 is '+inf+' (the GS9023 datasheet is not in the archive).')}
    ${F('The reply has a 75-pass delay, except the first one.', 'v1.04 added the comout0/comout1 counter in settx: reload 75 passes ≈ 7.3 ms at ≈119 cycles per pass. tx2,0 stays set until txuart1 clears tx2 after the byte has drained, so settx keeps counting during those ≈10 passes; steady-state replies come ≈65 passes ≈ 6.3 ms after the command. INIT sets both counters to 1, so the first reply after power-up goes on the next pass. ams4.js assumes 1 ms and dms1.js 2 ms for DEMUX-1 replies; the source gives ≈6–7 ms. If a new command arrives while tx2,5 is still set (during the 1 ms send), scanuart1 sets tx2,7 again and txuart sends straight away, skipping the delay.')}
    ${F('The reply format, from the code.', 'tx0 = 0 after INIT; sdi_check (any new command with bit 3 = 1, e.g. the 0xE8 probe) loads 1110 0000. On every pass readgs9023 rewrites bit 0 (1 = no audio lock) and settx bit 1 (1 = no SDI lock). So a probed board answers 0xE0–0xE3, and an unprobed one 0x00–0x03. ams4.js infers 0xC0 for the probe and 0x02 | 0x3D otherwise: the top bits match (0xC0 mask), the low bits do not.')}
    ${F('tx1 is never sent.', 'txuart0/empty (which would send tx1) cannot be reached: txuart jumps from the address byte straight to txuart1. The comment says so: “only returning one byte in this version”.')}
    ${F('Dead code and leftovers.', 'The interrupt vector is just RETFIE. clrwdt runs every pass, but the .pjt fuses have WDTEnable = 0. The comments in init43.asm name pins that do not match the ISS2 netlist (“E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED”, “pllres”: RC5 drives the GS9023 /RESET since the Jun 2001 ECO split RESET1700). RC5 is set high at INIT and never pulsed. The Working folder holds a later debug build (taddr0, 1, 4, 7, 13 read-back; addr4 bit 6 set: “bit 6 originally 0”).')}
    ${F('The project files say 4 MHz; the board has 4.9152 MHz.', 'demux-106.pjt: Frequency = 4000000 (MPLAB simulator setting). The BOM has X1 4.9152, and only 4.9152 MHz gives the “9600 baud” the comment claims with SPBRG = 7 (4 MHz would give 7812 Bd).')}
    ${F('Version labels drift.', 'The #v105 and #v105b folders hold demux-1v104.asm. v1.04’s header still says “SEPTEMBER 7, 2001”, the same as v1.03. v1.06b’s header says “VERSION 1.05, DECEMBER 9, 2002” over a “V1.06b” note. demux-1v106.err in #v106 logs MPASM Error[173] (“source file path exceeds 62 characters”, H:\\ENGINEERING\\WBSPRODUCTS\\DEMUX\\…).')}
    ${F('Two BOMs for one board.', 'DEMUX-1ISS2BOM.doc (2004|37, matches the schematic) lists T1, D1, D2, D4, P2 as DNI, D3 as 0R, R2 75R, R15 511R. The CSV DEMUX-1ISS2.bom (dated 2004 too) still has 1N4004 ×4, PE-65612 T1, R2 37R5, R15 500R: values the Aug 2001 and Aug 2002 ECO entries had already changed.')}
    ${F('A DEMUX-1 drawing filed as DEMUX-3.', '“DEMUX3-to-XTM4-WIRING DIAGRAM.dwg” is titled “DEMUX-1-to-XTM4-1 WIRING DIAGRAM” (drawn 23 Mar 2006): P5 ↔ XTM4 P5 (AES), P1 ↔ P10 (RS-485), P3 ↔ P12 (power). The GND pins of P1 and P5 are not wired.')}
    ${F('The GS9023 lock pins are unused.', 'LOCK (68), BUFERR (70), WCOUT (53) and the PKT/DOUT ports are not connected. All status comes through register 0, read on every pass.')}
    ${F('The functional diagram’s “DSP.” is not a DSP.', 'POD19 - Demux 1 - Functional Diagram.cdr shows HIGH SPEED RECEIVER → DATA RETIMING PLL → DSP. → DEMUXER. On the netlist that is CLC014 → CLC016 → CLC011 → GS9023. No DSP is fitted.')}
    ${F('ISS1 had a 28-pin PIC and XLR outputs.', 'DEMUX-1 - #OBSOLETE/Demux-1.eco (Jan 2001): U3 PIC16C63 (“PIC63C63”), XLR1/XLR2 deleted. The May–Jun 2001 ECO moved to U14 PIC16F874 (QFP44), added P4 (PAN600), P5 and the H4 ICSP header, and removed H1–H3.')}
  </ol>`)
  + card('Assumptions in this simulation', `<ul class="small">
    <li>Pass lengths are hand-counted from the MPASM source (1 cycle per instruction, 2 for taken branches, call, return, goto). They are within a few cycles: ≈117 idle, ≈119 counting, ≈132–138 in POD mode.</li>
    <li>GS9023 behaviour (${inf}): video lock 2 lines after the carrier; audio lock at the next AES block after the DID is written; audio muted when not locked; AOUTA = channels 1/2, AOUTB = 3/4.</li>
    <li>Host traffic (${inf}): frames of two back-to-back bytes, repeated every 200 ms; XTM41 reply delay on the shared bus from dms1.js.</li>
    <li>Power-up: oscillator start-up + INIT ≈ ${SIM.fmtDur(BOOT_CYC*TCY)}, power-up timer assumed off (no __CONFIG in the source) — ${inf}.</li>
    <li>The board drawing places each part on its RefDes text anchor recovered from DEMUX-1ISS2.pcb; package outlines are standard sizes; the board edge is ${inf}.</li>
    <li>Test tones (400 Hz … 2.8 kHz at −20 dBFS, different for every group and channel) are ${inf}.</li></ul>`);
}

/* ---------------- register ---------------- */
loadScenario('boot');
SIM.register({
  id:'demux1', name:'DEMUX-1 · SDI audio de-embedder board (2001|34)', duration:1,
  product:'DEMUX-1', year:2001, family:'Obsolete products',
  folder:'#DEMUX #SERIES/XXX - DEMUX1 - #Engineering #OBSOLETE',
  summary:'Ward-Beck’s first SDI de-embedder: a daughter board (CLC014/CLC016/CLC011 receiver, Gennum GS9023, PIC16F874) inside the POD19, XTM4, AMS4 and DMS1. One PIC image serves a parallel POD19 port or a 9600 Bd RS-485 host, selects one of four embedded groups and returns SDI and audio lock. The model runs the MPASM source v1.01–v1.06 pass by pass against SDI lines, HANC packets and RS-485 bytes.',
  highlights:['PIC emulated pass by pass from 10 source versions','SDI lines → HANC audio packets → GS9023 DID match → AES bits','RS-485 probe, group commands and the 75-pass reply delay','Board drawn from the ISS2 P-CAD layout; POD19 rear on the real silk','10-step tutorial with live goals','18 findings: rxflags,7 lock-out, v1.02 POD bug, pin moves, BOM mismatch'],
  depth:'Full model',
  stepUnits:[
    {label:'1 SDI line', period:()=>STD[D.std].H},
    {label:'1 PIC pass (≈95 µs)', period:()=>{ const P=emulate().P; return P.n? P.cyc[Math.max(0,bs(P.t0,P.n,SIM.t))]*TCY : 117*TCY; }},
    {label:'1 RS-485 byte', period:()=>BYTE_T},
    {label:'1 AES frame (1 sample)', period:()=>1/AES_FS},
    {label:'1 AES block (4 ms)', period:()=>BLOCK},
    {label:'1 field', period:()=>STD[D.std].field},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (a reply delay)'],[0.004,'4 ms (AES block, 4 bytes)'],[0.0012,'1.2 ms (one byte, 12 passes)'],[0.0003,'300 µs (5 lines, 3 passes)'],[0.00007,'70 µs (one line)'],[0.000012,'12 µs (HANC packets)']],
  defaultZoom:1,
  init(){ dirty(); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: driving the DEMUX-1', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
