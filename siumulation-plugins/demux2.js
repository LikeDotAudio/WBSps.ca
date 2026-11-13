/* =====================================================================
   DEMUX-2 — SD-SDI audio de-embedder with composite video output (Ward-Beck Systems, 2001|34–2009|42)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "#DEMUX #SERIES/XXX - DEMUX2 - #Master #OBSOLETE"):
   - DEMUX2 - #Engineering/DEMUX-2 - #Software/#v105/2v105.asm (MAIN, scanuart, settx, txuart, I2Csetup, data0…data13,
       I2Ccommunications, WRBYTE, BSTART, BSTOP, TX, BITOUT, BITIN, ERR, ERR0…ERR3, I2Cacknowledgment, RDBYTE, eewrite)
     … demux-2.asm (setgroup1, setgroup2, group1…group4, sdi_check, refreshgs9023, readgs9023, SDI_SIGNAL_CHECK,
       ADV7171_RESET, DELAY), init43.asm (RAM map, INIT, TRIS/ADCON1, USART SPBRG = 7, GS9023 defaults addr0/3/4/6), eerw.asm
     … every other version folder: #v100, #v101, #v102, #v102b, #v103, #v103b, #v104, #v104b, #v105b, #old/v105 (diffed)
     … .pjt / .mcp / .ERR files (MPASM /c- /rDEC, Message[305] in v100)
   - DEMUX2 - #Engineering/DEMUX-2 - #PCB/DEMUX-2ISS2.net (Tango netlist: every pin name used below), DEMUX-2ISS2.bom,
       DEMUX-2ISS2.ECO, OBSOLETE/DEMUX-2ISS1.net, WORKING/DEMUX-2ISS2PNP.pnp (SMT centroids), DEMUX-2ISS2.pcb (P-CAD binary:
       board outline corners, BNC outlines and RefDes text positions recovered from its coordinate records)
   - DEMUX2 - #Engineering/DEMUX-2 - #GERBERS/DEMUX-2ISS2.STN (top paste Gerber) → assets/demux2-paste-top.png
   - SOFTWARE LISTINGS - #Engineering.xls (DEMUX2V103 2003-10-30, DEMUX2V104B 2004-08-03, DEMUX2V105(B) 2007-12-18)
   - for comparison only: #DEMUX #SERIES/XXX - DEMUX1 …/DEMUX-1ISS2.bom + .net + demux-1v106.asm, and the DEMUX3 README
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const hex = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');
const Y = y => SIM.year(y);

/* ---------------- constants from the source ---------------- */
const XTAL = 4.9152e6;                  // X1 4.9152 (DEMUX-2ISS2.bom); SPBRG = 7, BRGH = 0 → XTAL/512 = 9600 baud ("9600 baud" in init43)
const TCY = 4/XTAL;                     // 813.8 ns per instruction
const UART_BYTE = 10/9600;              // 8N1
const DELAY_CYC = 125*(255*4+3+3)+4;    // DELAY: MOVLW 125 · DEC1 loop (CLRWDT, DECFSZ, GOTO) × 256 per outer pass
const I2C_BIT = 43;                     // TXLOOP + BITOUT, counted
const I2C_BYTE = 8*I2C_BIT + 36;        // + BITIN (ACK) + call overhead
const I2C_START = 30;                   // WRBYTE entry + BSTART
const WR_CYC = I2C_START + 3*I2C_BYTE + 30;   // address byte 0x54, subaddress, data, BSTOP
const PWRT = 0.072;                     // power-up timer — config bits are not in the source: inferred
const INIT_CYC = 140;                   // INIT, counted roughly
const CLC_T = 0.0003;                   // CLC016 rate-detect settling after a carrier appears — inferred
const PRE = -0.5;                       // the model starts half a second before the shown second (power-on at PRE)
const AES_FS = 48000, BLOCK = 192/AES_FS, WORD_T = 1/27e6;
const STD = {
  '525': {name:'525/59.94 (NTSC)', H:1001/15750000, words:1716, lines:525, field:1001/60000, frame:1001/30000, hanc:268, ctl:12, sw:[10,273], fsc:315e6/88},
  '625': {name:'625/50 (PAL)',     H:64e-6,         words:1728, lines:625, field:0.02,       frame:0.04,       hanc:280, ctl:8,  sw:[6,319],  fsc:4433618.75},
};
const A3 = {1:0xEF, 2:0xCD, 3:0xAB, 4:0x89};      // group1…group4 in demux-2.asm: DID audio packet ext/group
const A4 = {1:0x0F, 2:0x0E, 3:0x0D, 4:0x0C};      // DID control packet
const A3G = {0xEF:1, 0xCD:2, 0xAB:3, 0x89:4};
const AUD_DID = [0,0xFF,0xFD,0xFB,0xF9], EXT_DID = [0,0xFE,0xFC,0xFA,0xF8], CTL_DID = [0,0xEF,0xEE,0xED,0xEC];
const GCOL = ['--accent','--accent2','--warn','--bad'];
/* I2Csetup: address → data routine → ADV7171 subaddress (SLAVE) */
const I2C_ORDER = [[0,0],[1,1],[2,2],[3,3],[4,4],[5,9],[6,10],[7,11],[8,12],[9,7],[10,8],[11,13]];
const ADV_NTSC = {0:0x00,1:0x00,2:0x08,3:0x10,4:0x30,7:0x00,8:0x00,9:0x16,10:0x7C,11:0xF0,12:0x21,13:0x00};
const ADV_PAL  = {0:0x05,1:0x00,2:0x00,3:0x00,4:0x00,7:0x00,8:0x00,9:0xCB,10:0x8A,11:0x09,12:0x2A,13:0x00};
const ADV_NAME = {0:'Mode Register 0',1:'Mode Register 1',2:'Mode Register 2',3:'Mode Register 3',4:'Mode Register 4',7:'Timing Register 0',8:'Timing Register 1',9:'Subcarrier Freq 0',10:'Subcarrier Freq 1',11:'Subcarrier Freq 2',12:'Subcarrier Freq 3',13:'Subcarrier Phase'};

/* ---------------- firmware builds (each one diffed against the next) ---------------- */
const BUILDS = {
  v101: {label:'v1.01 · Feb 12 2002', folder:'#v101/2v101.asm', year:2002, pins:'old', i2c:'once', mode:'rxflags', reply:'comout', pod:true, sigBit:5, palOk:false},
  v102: {label:'v1.02 · May 8 2002', folder:'#v102/2v102.asm', year:2002, pins:'new', i2c:'once', mode:'rxflags', reply:'now', pod:true, sigBit:5, palOk:true, palFile:'#v102b/2v102b.asm (1.02B, Aug 7 2002)'},
  v103: {label:'v1.03 · Dolby E fix (2003)', folder:'#v103/2v103.asm', year:2003, pins:'new', i2c:'once', mode:'rxflags', reply:'now', pod:true, sigBit:5, palOk:true, palFile:'#v103b/2v103b.asm (1.03B, Oct 30 2003)'},
  v104: {label:'v1.04 · Aug 3 2004 (video DAC)', folder:'#v104/2v104.asm', year:2004, pins:'new', i2c:'loop', mode:'rxflags', reply:'now', pod:true, sigBit:5, palOk:true, palFile:'#v104b/2v104b.asm'},
  v105o:{label:'v1.05 · Dec 17 2007 (#old, XTM4)', folder:'#old/v105/2v105.asm', year:2007, pins:'new', i2c:'once', mode:'uartonly', reply:'now', pod:false, sigBit:3, palOk:false},
  v105: {label:'v1.05 · Jul 17 2009 (uart_mode)', folder:'#v105/2v105.asm', year:2009, pins:'new', i2c:'loop', mode:'sticky', reply:'now', pod:true, sigBit:5, palOk:true, palFile:'#v105b/2v105b.asm'},
};
function build(){
  const b = Object.assign({id:D.fw}, BUILDS[D.fw]); const pal = D.pal && b.palOk;
  b.pal = pal;
  b.addr0 = pal ? 0x85 : 0x81;
  b.addr6 = (D.fw==='v101'||D.fw==='v102') ? 0x05 : (pal ? 0x05 : 0x01);       // v1.03 cleared bit 2 in NTSC init43 only
  b.adv = (pal && (D.fw==='v104'||D.fw==='v105')) ? ADV_PAL : ADV_NTSC;          // 1.02B/1.03B still send the NTSC values
  b.name = b.label + (pal ? ' — PAL "B" build' : '');
  return b;
}

/* ---------------- world + scenario state ---------------- */
const D = {
  fw:'v105', pal:false, std:'525', emb:[true,true,false,false], dolby:0,
  host:'pod', hostPer:0.05, hostPhase:0.0137,
  init:{power:true, cable:true, pod:1, sel:0xF2},
  events:[], scn:'pod', log:[], selPart:'U14', selBlock:'pic', sheet:0, scope:'p5',
};
const SCEN = {
  pod:    {name:'POD19: running on group 1, then the PODXX steps to group 2 at 0.30 s', set:{host:'pod', fw:'v105', pal:false, std:'525', emb:[1,1,0,0]}, init:{pod:1}, ev:[{t:0.30,k:'pod',v:2}]},
  xtm4:   {name:'XTM4 host (RS-485): polling 0xF2 = group 2; host changes to 0xF6 (group 4) at 0.40 s', set:{host:'uart', fw:'v105', pal:false, std:'525', emb:[1,1,0,1]}, init:{sel:0xF2}, ev:[{t:0.40,k:'sel',v:0xF6}]},
  replug: {name:'SDI cable pulled at 0.10 s and plugged back at 0.30 s (watch the 104 ms DELAY)', set:{host:'pod', fw:'v105', pal:false, std:'525', emb:[1,1,0,0]}, init:{pod:2}, ev:[{t:0.10,k:'cable',v:false},{t:0.30,k:'cable',v:true}]},
  trap:   {name:'v1.04 in an XTM4: replug during host polling → overrun → stuck on group 4', set:{host:'uart', fw:'v104', pal:false, std:'525', emb:[1,1,1,1]}, init:{sel:0xF0}, ev:[{t:0.10,k:'cable',v:false},{t:0.25,k:'cable',v:true}]},
  fixed:  {name:'Same replug with v1.05 (2009): uart_mode stays set, group 1 survives', set:{host:'uart', fw:'v105', pal:false, std:'525', emb:[1,1,1,1]}, init:{sel:0xF0}, ev:[{t:0.10,k:'cable',v:false},{t:0.25,k:'cable',v:true}]},
  boot:   {name:'Power-up at 0.05 s with SDI present (PWRT, INIT, ADV7171 programming)', set:{host:'pod', fw:'v103', pal:false, std:'525', emb:[1,1,0,0]}, init:{power:false, pod:1}, ev:[{t:0.05,k:'power',v:true}]},
  pal:    {name:'625/50 source into a 1.03B PAL build: GS9023 told PAL, ADV7171 still coded NTSC', set:{host:'pod', fw:'v103', pal:true, std:'625', emb:[1,1,0,0]}, init:{pod:1}, ev:[]},
};
function loadScenario(id){
  const s = SCEN[id]; D.scn = id;
  Object.assign(D, JSON.parse(JSON.stringify(s.set))); D.emb = s.set.emb.map(Boolean);
  D.init = Object.assign({power:true, cable:true, pod:1, sel:0xF2}, s.init);
  D.events = s.ev.map(e=>Object.assign({scn:true}, e)); D.dolby = 0;
  dirty();
}
let EMU = null, EVC = null;
function dirty(){ EMU = null; EVC = null; }
function evs(k){ if (!EVC){ EVC = {}; for (const kk of ['power','cable','pod','sel']) EVC[kk] = D.events.filter(e=>e.k===kk).sort((a,b)=>a.t-b.t); } return EVC[k]; }
function valAt(k, t){ let v = D.init[k]; for (const e of evs(k)){ if (e.t > t) break; v = e.v; } return v; }
const powerAt = t => valAt('power', t), cableIn = t => valAt('cable', t);
function cableSince(t){ if (!cableIn(t)) return null; let s = PRE-1; for (const e of evs('cable')){ if (e.t > t) break; if (e.v) s = e.t; } return s; }
function powerSince(t){ if (!powerAt(t)) return null; let s = D.init.power ? PRE : null; for (const e of evs('power')){ if (e.t > t) break; if (e.v) s = e.t; } return s; }
const cdAt = t => powerAt(t) && cableIn(t);                                   // CLC016 CD (pins 19/28) → RC2
const clcLock = t => { const s = cableSince(t); return cdAt(t) && s!==null && t - s >= CLC_T; };   // RD1:RD0 = 0:1 on RB0/RB1
/* P4 lines as the PIC sees them. 3K3 pull-ups (R5/R7/R9/R11/R28) + 1K series: an undriven line reads 1.
   The PODXX drives P4-3 = group code MSB, P4-2 = LSB (the v1.02 assignment) — inferred */
function p4At(t){
  if (D.host !== 'pod') return {p1:1, p2:1, p3:1};
  const c = valAt('pod', t) - 1; return {p1:1, p2:c & 1, p3:(c >> 1) & 1};
}
function hostBytes(){
  if (D.host !== 'uart') return [];
  const out = []; for (let t = PRE + D.hostPhase; t < 1.0; t += D.hostPer){ const s = valAt('sel', t);
    out.push({t0:t, t1:t+UART_BYTE, b:s, k:'addr'}, {t0:t+UART_BYTE, t1:t+2*UART_BYTE, b:0x00, k:'data'}); }
  return out;
}

/* ================================================================
   EMULATOR — PIC16F874 main loop, pass by pass, with the GS9023, ADV7171,
   USART and the host around it. Runs from PRE to 1 s.
   ================================================================ */
const RT = ['MAIN clrwdt','scanuart','SDI_SIGNAL_CHECK','ADV7171_RESET','setgroup1','setgroup2','refreshgs9023','readgroupselect','readgs9023','settx','txuart','I2Csetup','I2Ccommunications','I2Cacknowledgment','goto main'];
const NR = RT.length;
function initState(){ return { group:1, pgroup:0, a0:0x81, a3:0xEF, a4:0x0F, a6:0x01, rxflags:0, um:0, uart0:0, preuart0:0, uflag:0, tx0:0, tx2:0,
  I2C:0x0E, address:0, slave:0, idata:0, lock:0, signal:0, pe:0x07, rb5:1, rc5:0, rc1:0, com0:1, com1:1, pf:0, oerr:0, txEnd:0 }; }
function emulate(){
  if (EMU) return EMU;
  const B = build(), S0 = STD[D.std];
  const CAP = 40000;
  const P = { n:0, t0:new Float64Array(CAP), cyc:new Uint32Array(CAP), rc:new Uint32Array(CAP*NR), work:new Uint16Array(CAP),
    grp:new Uint8Array(CAP), a3:new Uint8Array(CAP), rxf:new Uint8Array(CAP), um:new Uint8Array(CAP), tx0:new Uint8Array(CAP), i2c:new Uint8Array(CAP),
    adr:new Uint8Array(CAP), lock:new Uint8Array(CAP), sig:new Uint8Array(CAP), pe:new Uint8Array(CAP), rb5:new Uint8Array(CAP), rc5:new Uint8Array(CAP), fifo:new Uint8Array(CAP) };
  const i2c = [], rx = [], tx = [], delays = [], marks = [], boots = [];
  const gsRst = [[PRE-1, true]], gsDid = [[PRE-1, null]];
  const hist = {rb5:[], pe:[], rc5:[], rc1:[], mode:[]};
  const push = (h, t, v) => { const a = hist[h]; if (!a.length || a[a.length-1][1] !== v) a.push([t, v]); };
  const hb = hostBytes(); let hi = 0; let fifo = [];
  let adv = {}, advOn = false;
  /* GS9023 model (lock timing inferred): reset = RC5 low (net RESET also reaches U7-18) */
  const lastOf = (arr, t) => { let r = arr[0]; for (let i = arr.length-1; i >= 0; i--) if (arr[i][0] <= t){ r = arr[i]; break; } return r; };
  const vlockT = t => { const r = lastOf(gsRst, t); if (r[1]) return null; const cs = cableSince(t); if (cs===null || !powerAt(t)) return null;
    const st = Math.max(r[0], cs); return Math.ceil(st / S0.field) * S0.field + S0.H; };
  const stdMatch = ((B.addr0 >> 2) & 1) === (D.std==='625' ? 1 : 0);
  const gsVideo = t => { const v = vlockT(t); return v!==null && t >= v && stdMatch; };
  const gsAudio = t => { const v = vlockT(t); if (v===null || t < v) return false; const d = lastOf(gsDid, t); const g = A3G[d[1]]; if (!g || !D.emb[g-1]) return false;
    return t >= Math.ceil(Math.max(v, d[0]) / BLOCK) * BLOCK; };
  const uartMode = S => B.mode==='sticky' ? S.um : (S.rxflags & 0x80 ? 1 : 0);
  // power segments
  const pev = evs('power'); const segs = []; let pw = D.init.power, st = PRE;
  for (const e of pev){ if (e.v === pw) continue; if (pw) segs.push([st, e.t]); pw = e.v; st = e.t; }
  if (pw) segs.push([st, 1.0001]);
  for (const [s0, s1] of segs){
    let t = s0 + PWRT + INIT_CYC*TCY; boots.push([s0, t]);
    const S = initState(); S.a0 = B.addr0; S.a6 = B.addr6; fifo = []; adv = {}; advOn = false;
    gsRst.push([s0, true]); gsDid.push([s0, null]); push('rc5', s0, 0); push('rb5', s0, 1); push('pe', s0, 7); push('rc1', s0, 0);
    while (t < s1 && t < 1.0){
      const rc = new Array(NR).fill(0); let work = 0, cum = 0;
      const at = c => t + (cum + c)*TCY;
      rc[0] = 1; cum = 1;
      /* scanuart */
      const ts = at(2);
      while (hi < hb.length && hb[hi].t1 <= ts){ const h = hb[hi++]; const r = {t0:h.t0, t1:h.t1, b:h.b, k:h.k, lost:false};
        if (h.t1 < s0 + PWRT || !powerAt(h.t1)) r.lost = 'off'; else if (S.oerr) r.lost = 'OERR'; else if (fifo.length >= 2){ S.oerr = 1; r.lost = 'overrun'; marks.push({t:h.t1, k:'oerr'}); } else fifo.push(h.b);
        rx.push(r); }
      if (S.oerr){ fifo = []; S.oerr = 0; S.rxflags = 0; S.uflag = 0; rc[1] = 17; work |= 2; marks.push({t:ts, k:'rxerror1', um:S.um}); }
      else if (fifo.length){ const b = fifo.shift(); if (B.mode==='sticky') S.um = 1; S.rxflags |= 0x80; work |= 2;
        if (b & 0x80){ if ((b & 0x60) === 0x60){ S.uart0 = b; S.uflag = 1; } rc[1] = 19; }
        else { if (S.uflag) S.rxflags |= 1; S.uflag = 0; if (S.rxflags & 1) S.tx2 |= 0xC1; rc[1] = 21; } }
      else rc[1] = 9;
      cum += rc[1];
      /* SDI_SIGNAL_CHECK */
      const tc = at(3); S.lock = 0; const cd = cdAt(tc);
      if (cd) S.lock |= 1; else S.signal |= 2;
      if (cd && clcLock(tc)) S.lock |= 0x80;
      rc[2] = cd ? (S.lock & 0x80 ? 16 : 15) : 11; cum += rc[2];
      /* ADV7171_RESET */
      const tr = at(3), r5 = S.lock & 0x80 ? 1 : 0;
      if (r5 !== S.rc5){ S.rc5 = r5; gsRst.push([tr, !r5]); if (!r5){ gsDid.push([tr, null]); adv = {}; advOn = false; } else advOn = true; push('rc5', tr, r5); }
      if (B.pins==='old') S.pe = (S.pe & ~4) | (r5 << 2); else S.pe = (S.pe & ~2) | ((S.signal & 1) << 1);
      push('pe', tr, S.pe);
      rc[3] = 13;
      if ((S.signal & 2) && (S.lock & 0x80)){
        const d0 = at(10); delays.push([d0, d0 + DELAY_CYC*TCY]); rc[3] += DELAY_CYC; work |= 8;
        S.I2C &= ~0x81; S.address = 0; S.signal &= ~2; marks.push({t:d0, k:'delay'});
      }
      cum += rc[3];
      /* setgroup1 */
      if (S.rxflags & 1){ S.rxflags &= ~1; work |= 16;
        if (S.uart0 !== S.preuart0){ S.pf |= 4; S.preuart0 = S.uart0;
          if (S.uart0 & 8){ S.tx0 = 0xE0; marks.push({t:at(10), k:'query'}); }
          else if (S.uart0 & 0x10){ const g = ((S.uart0 >> 1) & 3) + 1; S.a3 = A3[g]; S.a4 = A4[g]; marks.push({t:at(20), k:'sel', g}); }
          else marks.push({t:at(10), k:'leave'});
          rc[4] = 26; } else rc[4] = 14; }
      else rc[4] = 5;
      cum += rc[4];
      /* setgroup2 */
      if (B.mode !== 'uartonly'){ if (uartMode(S)) rc[5] = 4; else { if (S.group !== S.pgroup) S.pf |= 4; S.pgroup = S.group;
          const g = S.group & 8 ? 4 : S.group & 4 ? 3 : S.group & 2 ? 2 : 1; S.a3 = A3[g]; S.a4 = A4[g]; rc[5] = 24; } }
      cum += rc[5];
      /* refreshgs9023: addr0, addr3, addr4, addr6 on PORTD/PORTA with ~CS = RB2, ~WE = RA5 */
      const tw = at(18); if (S.rc5){ const cur = gsDid[gsDid.length-1][1]; if (cur !== S.a3) gsDid.push([tw, S.a3]); }
      rc[6] = 47; cum += rc[6];
      /* readgroupselect */
      if (B.mode !== 'uartonly'){ if (uartMode(S)) rc[7] = 4; else { const p = p4At(at(3)); const code = B.pins==='new' ? (p.p3 << 1 | p.p2) : (p.p2 << 1 | p.p1); S.group = [1,2,4,8][code]; rc[7] = 13; } }
      cum += rc[7];
      /* readgs9023: addr0 bit 3 = audio lock, bit 5 = video standard lock (read twice) */
      const tg = at(8); const al = S.rc5 && gsAudio(tg), vl = S.rc5 && gsVideo(tg);
      if (al) S.tx0 &= ~1; else S.tx0 |= 1;
      if (B.pins==='old') S.pe = (S.pe & ~2) | ((al?1:0) << 1); else S.pe = (S.pe & ~1) | (al?1:0);
      S.signal = (S.signal & ~1) | ((B.sigBit===3 ? al : vl) ? 1 : 0);
      rc[8] = 37; cum += rc[8]; push('pe', tg, S.pe);
      /* settx */
      if (S.signal & 1) S.tx0 &= ~2; else S.tx0 |= 2;
      S.rb5 = (S.tx0 >> 1) & 1; push('rb5', at(5), S.rb5);
      rc[9] = 11;
      if (S.tx2 & 1){ rc[9] += 3;
        if (B.reply==='comout'){ S.com1 = (S.com1 - 1) & 255; if (!S.com1){ S.com0 = (S.com0 - 1) & 255; if (!S.com0){ S.com0 = 1; S.com1 = 10; S.tx2 |= 0x20; } } }
        else S.tx2 |= 0x20; }
      cum += rc[9];
      /* txuart */
      if (S.tx2 & 0x20){
        if (S.tx2 & 0x80){ const t0 = at(6); S.rc1 = 1; S.tx2 &= ~0x80; S.txEnd = t0 + UART_BYTE; tx.push({t0, t1:S.txEnd, b:S.tx0, off:null}); push('rc1', t0, 1); rc[10] = 12; work |= 1024; }
        else { const tn = at(4); if (tn >= S.txEnd){ S.rc1 = 0; S.tx2 = 0; if (tx.length) tx[tx.length-1].off = tn; push('rc1', tn, 0); rc[10] = 12; } else rc[10] = 9; } }
      else rc[10] = 5;
      cum += rc[10];
      /* I2Csetup */
      if (!(S.I2C & 1)){ S.I2C |= 1; work |= 2048;
        for (const [k, sub] of I2C_ORDER){ if (S.address === k){ S.slave = sub; S.idata = B.adv[sub];
            if (sub === 12 && B.i2c === 'loop') S.address = 0;
            if (sub === 13){ S.address = 0; S.I2C |= 0x80; } } }
        if (S.address !== 11) S.address = (S.address + 1) & 255;
        S.I2C &= ~2; rc[11] = 72; }
      else rc[11] = 7;
      cum += rc[11];
      /* I2Ccommunications → WRBYTE */
      if (!(S.I2C & 2)){ const t0 = at(9); S.I2C &= ~8; const ack = !!S.rc5;
        if (ack){ adv[S.slave] = S.idata; }
        i2c.push({t0, t1:t0 + WR_CYC*TCY, sub:S.slave, val:S.idata, ack, adr:S.address});
        S.I2C |= 2; S.I2C &= ~4; rc[12] = 9 + WR_CYC; work |= 4096; }
      else rc[12] = 7;
      cum += rc[12];
      /* I2Cacknowledgment */
      if (!(S.I2C & 4)){ S.I2C |= 4; S.I2C |= 1; if (!(S.I2C & 0x80)) S.I2C &= ~1; rc[13] = 9; } else rc[13] = 5;
      cum += rc[13];
      rc[14] = 2; cum += 2;
      push('mode', t, uartMode(S));
      const i = P.n; if (i < CAP){ P.n++; P.t0[i] = t; P.cyc[i] = cum; for (let k = 0; k < NR; k++) P.rc[i*NR+k] = rc[k]; P.work[i] = work;
        P.grp[i] = S.group; P.a3[i] = S.a3; P.rxf[i] = S.rxflags; P.um[i] = uartMode(S); P.tx0[i] = S.tx0; P.i2c[i] = S.I2C; P.adr[i] = S.address;
        P.lock[i] = S.lock; P.sig[i] = S.signal; P.pe[i] = S.pe; P.rb5[i] = S.rb5; P.rc5[i] = S.rc5; P.fifo[i] = fifo.length; }
      t += cum*TCY;
    }
    if (s1 < 1.0){ gsRst.push([s1, true]); gsDid.push([s1, null]); push('rc5', s1, 0); push('rb5', s1, 1); push('pe', s1, 0); push('rc1', s1, 0); }
  }
  while (hi < hb.length){ const h = hb[hi++]; rx.push({t0:h.t0, t1:h.t1, b:h.b, k:h.k, lost: powerAt(h.t1) ? 'pending' : 'off'}); }
  EMU = {B, P, i2c, rx, tx, delays, marks, boots, gsRst, gsDid, hist, gsVideo, gsAudio, vlockT, stdMatch, lastOf};
  return EMU;
}
function bs(arr, n, t){ if (!n || arr[0] > t) return -1; let lo = 0, hi = n-1; while (lo < hi){ const m = (lo+hi+1) >> 1; if (arr[m] <= t) lo = m; else hi = m-1; } return lo; }
function passAt(t){ const E = emulate(), P = E.P; if (!powerAt(t)) return null; const i = bs(P.t0, P.n, t); if (i < 0) return null; if (t > P.t0[i] + P.cyc[i]*TCY + 1e-9) return null;
  const rc = []; for (let k = 0; k < NR; k++) rc.push(P.rc[i*NR+k]);
  return {i, t0:P.t0[i], cyc:P.cyc[i], rc, work:P.work[i], grp:P.grp[i], a3:P.a3[i], rxf:P.rxf[i], um:P.um[i], tx0:P.tx0[i], i2c:P.i2c[i], adr:P.adr[i], lock:P.lock[i], sig:P.sig[i], pe:P.pe[i], rb5:P.rb5[i], rc5:P.rc5[i], fifo:P.fifo[i]}; }
function stepOf(p, t){ let c = (t - p.t0)/TCY, a = 0; for (let k = 0; k < NR; k++){ a += p.rc[k]; if (c < a) return k; } return NR-1; }
function histAt(h, t, dflt){ const a = emulate().hist[h]; let v = dflt; for (const [tt, vv] of a){ if (tt > t) break; v = vv; } return v; }
function inBoot(t){ return emulate().boots.find(b => t >= b[0] && t < b[1]); }
function inDelay(t){ return emulate().delays.find(d => t >= d[0] && t < d[1]); }
function i2cAt(t){ return emulate().i2c.find(x => t >= x.t0 && t < x.t1); }
function gsDidAt(t){ const E = emulate(); if (!powerAt(t)) return null; return E.lastOf(E.gsDid, t)[1]; }
function gsGroup(t){ const d = gsDidAt(t); return d===null ? 0 : (A3G[d] || 0); }
function gsReset(t){ const E = emulate(); return !powerAt(t) || E.lastOf(E.gsRst, t)[1]; }
function videoLock(t){ return powerAt(t) && !gsReset(t) && emulate().gsVideo(t); }
function audioLock(t){ return powerAt(t) && !gsReset(t) && emulate().gsAudio(t); }
function advRegsAt(t){ const E = emulate(); const r = {}; if (gsReset(t)) return null;
  const rel = E.lastOf(E.gsRst, t)[0]; for (const x of E.i2c){ if (x.t1 > t) break; if (x.t0 >= rel && x.ack) r[x.sub] = x.val; } return r; }
function encoderAt(t){
  if (!powerAt(t)) return {state:'off', txt:'unit off'};
  const r = advRegsAt(t); if (!r) return {state:'reset', txt:'ADV7171 held in reset (RC5 low): no CLC016 lock'};
  const std = (r[0] || 0) & 3, fsc = ((r[12]||0) << 24 | (r[11]||0) << 16 | (r[10]||0) << 8 | (r[9]||0)) >>> 0;
  const f = fsc / 4294967296 * 27e6, src = D.std;
  const stdName = std === 0 ? 'NTSC' : std === 1 ? 'PAL' : 'PAL-M/other';
  const want = src === '525' ? 'NTSC' : 'PAL';
  if (!videoLock(t) && !cableIn(t)) return {state:'nosig', txt:'no SDI'};
  if (stdName !== want) return {state:'wrong', std:stdName, f, txt:`${stdName} coding of a ${src}-line source: picture does not lock on a ${want} monitor (${inf})`};
  if (Math.abs(f - STD[src].fsc) > 50) return {state:'mono', std:stdName, f, txt:`${stdName} timing but subcarrier ${f? (f/1e6).toFixed(5)+' MHz':'not written'} → no colour lock (${inf})`};
  return {state:'ok', std:stdName, f, txt:`${stdName} composite, Fsc = ${(f/1e6).toFixed(6)} MHz (from registers 9–12)`};
}
function hostReplyAt(t){ const E = emulate(); let r = null; for (const x of E.tx){ if (x.t1 > t) break; r = x; } return r; }

/* ---------------- SDI words, HANC packets, AES ---------------- */
function par9(v){ let p = 0; for (let i = 0; i < 8; i++) p ^= (v >> i) & 1; return p; }
function anc(v8){ const b8 = par9(v8); return v8 | (b8 << 8) | ((b8 ^ 1) << 9); }
const TONE = [[400,1000,400,1000],[500,1500,500,1500],[600,2000,600,2000],[700,3000,700,3000]];   // test source — inferred
const toneVal = (g, ch, n) => 0.1 * Math.sin(2*Math.PI*TONE[g-1][ch]*n/AES_FS);
function samplesOnLine(n){ const R = AES_FS*STD[D.std].H; return Math.floor((n+1)*R) - Math.floor(n*R); }
function lineInfo(t){ const S = STD[D.std]; const n = Math.floor(t/S.H); const w = Math.floor((t - n*S.H)/WORD_T); return {n, ln:((n % S.lines) + S.lines) % S.lines + 1, w}; }
function hancLayout(n){
  const S = STD[D.std], out = []; let at = 4; const ln = ((n % S.lines) + S.lines) % S.lines + 1;
  if (S.sw.includes(ln-1)) return out;                         // no audio packets on the line after the switching point (simplified)
  for (let g = 1; g <= 4; g++){ if (!D.emb[g-1]) continue; const len = 7 + 12*samplesOnLine(n); out.push({g, a:at, b:at+len, kind:'audio'}); at += len; }
  const half = D.std==='525' ? 263 : 312;
  if (ln === S.ctl || ln === S.ctl + half) for (let g = 1; g <= 4; g++){ if (!D.emb[g-1]) continue; out.push({g, a:at, b:at+18, kind:'control'}); at += 18; }
  return out;
}
function audioPacket(g, n){
  const ns = samplesOnLine(n), s0 = Math.floor(n*AES_FS*STD[D.std].H);
  const w = [0x000, 0x3FF, 0x3FF, anc(AUD_DID[g]), anc((((n % 255)+255) % 255) + 1), anc(12*ns)], lbl = ['ADF','ADF','ADF','DID','DBN','DC'];
  for (let k = 0; k < ns; k++) for (let ch = 0; ch < 4; ch++){
    const sn = s0 + k; let v = Math.round(toneVal(g, ch, sn) * 524287); if (v < 0) v += 1 << 20;
    const z = (sn % 192) === 0 ? 1 : 0; const x0 = z | (ch << 1) | ((v & 0x3F) << 3); const x1 = (v >> 6) & 0x1FF; let x2 = (v >> 15) & 0x1F;
    let p = 0; for (let b = 0; b < 9; b++) p ^= (x0 >> b) & 1; for (let b = 0; b < 9; b++) p ^= (x1 >> b) & 1; for (let b = 0; b < 8; b++) p ^= (x2 >> b) & 1; x2 |= p << 8;
    const nb = x => x | ((((x >> 8) & 1) ^ 1) << 9);
    w.push(nb(x0), nb(x1), nb(x2)); lbl.push(`s${k} ch${ch+1} X`, `s${k} ch${ch+1} X+1`, `s${k} ch${ch+1} X+2`); }
  let cs = 0; for (let i = 3; i < w.length; i++) cs = (cs + (w[i] & 0x1FF)) & 0x1FF; w.push(cs | ((((cs >> 8) & 1) ^ 1) << 9)); lbl.push('CS');
  return {w, lbl, ns};
}
function p5Stream(t){ if (!audioLock(t)) return null; return gsGroup(t); }

/* ---------------- user actions (each logs the firmware path) ---------------- */
function act(name, fn){ const tr = []; fn(s => tr.push(s)); D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length > 60) D.log.length = 60; SIM.refresh(); }
const clampT = () => Math.min(Math.max(SIM.t, 0), 0.95);
function mark(k, t0){ return emulate().marks.find(m => m.k === k && m.t >= t0); }
function firstPassAfter(t, pred){ const P = emulate().P; for (let i = Math.max(0, bs(P.t0, P.n, t)); i < P.n; i++) if (P.t0[i] >= t && pred(P, i)) return i; return -1; }
const A = {
  cable(){ const t = clampT(), on = !cableIn(t); D.events.push({t, k:'cable', v:on, user:true}); dirty(); const E = emulate(), B = E.B;
    act(on ? 'Plug SDI into INPUT1' : 'Unplug SDI from INPUT1', tr => {
      if (!powerAt(t)){ tr('The board is unpowered: nothing reacts.'); return; }
      if (!on){
        tr('CLC014 loses the carrier; CLC016 CD (U2-19/28) → RC2 low.');
        tr('Next pass, SDI_SIGNAL_CHECK: clrf lock · btfsc portc,2 fails → bsf signal,1 ("carrier did not detect a signal").');
        tr('ADV7171_RESET: lock,7 = 0 → bcf portc,5 → the RESET net drops: ADV7171 (U10-22) and GS9023 (U7-18) held in reset.');
        tr('readgs9023 now reads nothing locked: tx0 bits 0 and 1 set, '+(B.pins==='old'?'RE1/RE2':'RE0/RE1')+' tallies low, settx → bsf portb,5 → CD1 LED off.');
        tr('Composite OUT1/OUT2: the encoder is in reset, so the EL2280 outputs flat black.');
        return; }
      tr(`Carrier back: CLC014 equalises, CLC016 locks to 270 Mb/s (RD1:RD0 = 0:1 on RB0/RB1) after about ${SIM.fmtDur(CLC_T)} (${inf}).`);
      const d = E.delays.find(x => x[0] >= t);
      tr('SDI_SIGNAL_CHECK: lock,0 (CD) and lock,7 (CLC016) set. ADV7171_RESET: bsf portc,5 releases both chips from reset.');
      if (d){ tr(`signal,1 is still set from the loss, so ADV7171_RESET calls DELAY: 125 × 256 CLRWDT/DECFSZ loops = ${SIM.fmtDur(d[1]-d[0])} from ${SIM.fmtT(d[0])}. Nothing else runs: no UART, no GS9023 refresh, no LEDs.`);
        tr('Then: bcf I2C,0 · bcf I2C,7 · clrf address · bcf signal,1 → I2Csetup starts the ADV7171 register sequence again (data0, data1 …).'); }
      const vl = E.vlockT(t + 0.001); if (vl!==null) tr(`GS9023 video-standard lock (addr0 bit 5) at about ${SIM.fmtT(vl)} — next field + 1 line (${inf}); audio lock (bit 3) at the next AES block after that (${inf}).`);
    }); SIM.seek(Math.min(1, t + 0.004)); },
  power(){ const t = clampT(), on = !powerAt(t); D.events.push({t, k:'power', v:on, user:true}); dirty();
    act(on ? 'Power on (P3)' : 'Power off (P3)', tr => {
      if (!on){ tr('Rails fall; the PIC stops; RC5 drops so both video chips reset. RAM is lost: nothing is kept in EEPROM (eewrite is commented out of MAIN since v1.01).'); return; }
      tr(`P3 AC → D1–D4 bridge → LM2596 (+5 V), LM1117-3.3 (3 V for the GS9023 and PLL1700E), 79L05 (−5 V for the EL2280).`);
      tr(`PIC16F874 reset; power-up timer ≈ ${SIM.fmtDur(PWRT)} (${inf}: __CONFIG is not in the source). INIT: TRIS, ADCON1 digital, USART 9600, GS9023 shadows addr0 = 0x${hex(build().addr0)}, addr3 = 0xEF (group 1), addr6 = 0x${hex(build().addr6)}.`);
      tr('INIT then does goto nomatch — the EEPROM restore that follows (eer at 21, "first time detect 0xAA") is skipped, so the board always starts on group 1.');
      tr('clrf I2C · bsf I2C,1/2/3: I2C,0 = 0, so the very first MAIN pass starts writing the ADV7171 (data0 → subaddress 0).');
    }); SIM.seek(Math.min(1, t + PWRT + 0.002)); },
  pod(g){ const t = clampT(); if (D.host !== 'pod'){ D.host = 'pod'; } D.events.push({t, k:'pod', v:g, user:true}); dirty(); const E = emulate(), B = E.B;
    act(`PODXX selects group ${g} on P4`, tr => {
      const c = g-1; tr(`The PODXX drives P4-3 = ${c>>1}, P4-2 = ${c&1} (${inf}: group code wiring); 1 kΩ (R6/R8) into RE2 and RC0.`);
      if (B.mode === 'uartonly'){ tr('This build (#old/v105, Dec 2007) has ;call setgroup2 and ;call readgroupselect commented out of MAIN: P4 is never read. Nothing happens.'); return; }
      const i = firstPassAfter(t, (P, k) => P.grp[k] !== P.grp[Math.max(0,k-1)] || P.um[k]);
      if (E.P.um[Math.max(0, bs(E.P.t0, E.P.n, t))]){ tr('UART mode is active ('+(B.mode==='sticky'?'uart_mode,0':'rxflags,7')+' set): readgroupselect returns at once. P4 is ignored.'); return; }
      if (B.pins === 'old') tr('v1.01 readgroupselect reads RC0 (P4-2) as the high bit and RB7 (P4-1, pulled up) as the low bit — the DEMUX-1 wiring. The PODXX code is decoded wrongly (fixed in v1.02).');
      else tr('readgroupselect: btfss porte,2 / btfss portc,0 → group = 1, 2, 4 or 8.');
      if (i >= 0){ const k = E.P.grp[i]; const gg = k & 8 ? 4 : k & 4 ? 3 : k & 2 ? 2 : 1;
        tr(`At ${SIM.fmtT(E.P.t0[i])}: group = ${k} → on the next pass setgroup2 → group${gg}: addr3 = 0x${hex(A3[gg])}, addr4 = 0x${hex(A4[gg])}; press_flag,2 set (never used: eewrite is not called).`);
        tr(`refreshgs9023 writes addr0, addr3, addr4, addr6 every pass (~${SIM.fmtDur(202*TCY)} apart): ~CS = RB2 low, address on RA3..RA0, data on RD7..RD0, ~WE pulse on RA5.`);
        tr(D.emb[gg-1] ? `The GS9023 finds DID 0x${hex(anc(AUD_DID[gg]),3)} packets and sets addr0 bit 3 at the next AES block (${inf}) → readgs9023 → ${B.pins==='old'?'RE1':'RE0'} (P4-5 AES tally) high.` : `Group ${gg} is not in this SDI: no DID 0x${hex(anc(AUD_DID[gg]),3)} packets → addr0 bit 3 stays 0 → AES tally low, P5 silent.`); }
    }); SIM.seek(Math.min(1, t + 0.004)); },
  sel(b){ const t = clampT(); D.host = 'uart'; D.events.push({t, k:'sel', v:b, user:true}); dirty(); const E = emulate();
    act(`Host sends 0x${hex(b)} on RS-485`, tr => {
      tr(`The host repeats [0x${hex(b)}, 0x00] every ${SIM.fmtDur(D.hostPer)} (${inf}); the 75176 (U4) passes it to RC7/RX at 9600 8N1 (${SIM.fmtDur(UART_BYTE)} per byte).`);
      if ((b & 0xE0) !== 0xE0) tr(`scanuart: bit 7 set but bits 6:5 ≠ 11 → "btfss uart2,6 / btfss uart2,5 return": ignored. Only 0xE0–0xFF are accepted (the header comment calls 11 "spare").`);
      else if (b & 8) tr('setgroup1: bit 3 set → sdi_check: movlw 0xE0 → tx0. The reply becomes 0xE0 | lock bits: the "is a demux fitted?" answer.');
      else if (!(b & 0x10)) tr('setgroup1: bit 4 clear → leave_sdi: (its port writes are commented out) — nothing changes.');
      else { const g = ((b >> 1) & 3) + 1; tr(`setgroup1 (only if uart0 ≠ preuart0): s2,s1,s0 = ${(b&7).toString(2).padStart(3,'0')} → s${b&7} → group${g}: addr3 = 0x${hex(A3[g])}. Bit 0 does not matter (s0/s1 both → group 1 …).`); }
      tr('The data byte (bit 7 = 0) sets rxflags,0 → tx2 bits 7, 6, 0 → settx sets tx2,5 → txuart: bsf PORTC,1 (75176 DE), TXREG = tx0; next passes wait for TRMT then bcf PORTC,1.');
      const r = E.tx.find(x => x.t0 >= t); if (r) tr(`First reply after this: 0x${hex(r.b)} at ${SIM.fmtT(r.t0)} (bit 0 = no audio lock, bit 1 = no video lock).`);
    }); SIM.seek(Math.min(1, t + D.hostPer + 0.004)); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['Events replaced; the PIC is re-emulated from power-on at '+PRE+' s to 1 s.']}); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e => !e.user); dirty(); D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events.']}); SIM.refresh(); },
};

/* ================================================================
   THE BOARD — drawn on the real top paste layer (DEMUX-2ISS2.STN)
   ================================================================ */
/* SVG units are mils in the P-CAD frame: x = X − 11100, y = 7650 − Y. The paste PNG covers 11100–15400 × 3950–7650 mil.
   Board outline 11200–15025 × 4025–7525 mil and the four BNC outlines (x 15000/15050) are the repeated corner points in
   DEMUX-2ISS2.pcb. SMT bodies sit on the WORKING/DEMUX-2ISS2PNP.pnp centroids (origin = fiducial 1 at 14947, 4343).
   Through-hole parts (connectors, X1, H4, D1–D4, L1, L2, big capacitors) are not in the paste layer: they are placed next to
   their RefDes text positions from the .pcb binary — positions inferred. */
const bx = X => X - 11100, by = Yv => 7650 - Yv;
const CHIPS = [
  ['U7','GS9023',11957.9,6036.2,550,550,'Gennum embedded-audio demultiplexer (TQFP100). 10-bit video in on D0–D9 with PCLK 27 MHz; ACLK from the 74HC74; host bus C0–C7 = RD0–RD7, A0–A3 = RA0–RA3, ~RE RA4, ~WE RA5, ~CS RB2; RESET net from RC5; two AES outputs on pins 55/54 → P5.'],
  ['U14','PIC16F874',12392.5,5130,394,394,'PIC16F874 (QFP44) at 4.9152 MHz: runs MAIN (2v105.asm). PORTD/PORTA = GS9023 bus, RC3/RC4 = bit-banged I2C to the ADV7171, RC6/RC7 = USART to the 75176, RC5 = RESET, RB0/RB1/RC2 = CLC016 status, RB5 = CD1 LED, RE0–RE2/RC0/RB7 = P4.'],
  ['U10','ADV7171',13669,5538,394,394,'Analog Devices digital video encoder (44-pin MQFP). Pixel port P0–P7 = D2–D9 of the deserialised 10-bit stream (through R32/R33 100 Ω arrays), CLKIN = PCLK via R70. I2C address 0x54 (ADV7171_WRITE in init43), RESET = RC5. DAC → LC filter → EL2280.'],
  ['U5','CLC011',12810,5920,450,450,'Serial digital decoder: descrambles and deserialises the 270 Mb/s stream into 10-bit parallel D0–D9 plus PCLK 27 MHz.'],
  ['U2','CLC016',13380,6765,450,450,'Data-retiming PLL: four data rates set by R17–R20 (2550/3480/5490/6810 Ω); CD (pins 19, 28) → RC2, rate-detect outputs (pins 20, 21) → RB1, RB0. Feeds the CLC011 and the CLC007.'],
  ['U1','CLC014',14395,7095,340,155,'Adaptive cable equaliser. Differential input from the INPUT1 centre (C1/R3) and its isolated shell (C2/R4).'],
  ['U6','CLC007',14300,6530,195,155,'Cable driver for the re-clocked loop-through SDIOUT1 (R37, C29, L8, R31).'],
  ['U11','PLL1700E',12415,6815,290,210,'Burr-Brown multi-clock generator. XT1 = PCLK 27 MHz; output pin 14 → 74HC74 → ACLK.'],
  ['U13','74HC74',11975,6790,340,155,'One flip-flop wired as ÷2 (D = /Q, pins 12/8): PLL1700E clock → ACLK (GS9023 pin 99).'],
  ['U4','75176',11720,4870,195,155,'RS-485 transceiver for P1: RO → RC7/RX, DI ← RC6/TX, DE + /RE ← RC1 (txuart: bsf PORTC,1 to talk).'],
  ['U8','EL2280',14475,5275,195,155,'Dual video amplifier: A = gain 2 (R39/R56 750 Ω) from the reconstruction filter → R34 75 Ω → OUT1; B = unity follower of A → R53 75 Ω → OUT2.'],
  ['REG1','LM2596',14365,4270,400,370,'Switching regulator, +5 V, with L1 (PE-53823) and D5 (SK33). Fed from the D1–D4 bridge on P3.'],
  ['REG2','LM1117-3.3',11440,6835,260,140,'3.3 V for the GS9023 core (net 3V) and the PLL1700E.'],
  ['R32','100R ×4',13271.5,5523.1,130,65,'Series resistor array D2–D5 → ADV7171 (ECO of Nov 26 2003 re-ordered D2–D5 on R32).'],
  ['R33','100R ×4',13271.5,5288.1,130,65,'Series resistor array D6–D9 → ADV7171.'],
  ['D7','4148',12101.5,4187,110,80,'Keeps the ICSP programming voltage on MCLR (H4-3) away from +5 V.'],
];
const TH = [   // through-hole parts, placed from RefDes text positions — inferred
  ['INPUT1','BNC', 14860,7000, 'bnc','SDI input. Centre → L3 18 nH, R1 75 Ω termination; the shell is NOT ground (C51 1 µF to ground, R2/C2 to the CLC014 − input): an isolated, balanced input. Click to plug/unplug the SDI cable.'],
  ['SDIOUT1','BNC',14860,6250, 'bnc','Re-clocked SDI loop-through from the CLC007.'],
  ['OUT1','BNC',   14860,5500, 'bnc','Composite video out 1: ADV7171 → LC filter → EL2280 A (×2) → R34 75 Ω.'],
  ['OUT2','BNC',   14860,4750, 'bnc','Composite video out 2: EL2280 B follower → R53 75 Ω.'],
  ['P4','PAN600',  11300,4310, 'hdr6','PODXX parallel port (POD19). P4-1 I/O1 RB7 (also ICSP PGD), P4-2 I/O2 RC0, P4-3 I/O3 RE2, P4-4 I/O4 RE1, P4-5 I/O5 RE0, P4-6 GND. Each line: 3K3 pull-up to +5 V and 1K series. Click: connect a PODXX.'],
  ['P1','PAN300',  11300,5030, 'hdr3','RS-485 to a host (XTM4, AMS4, DMS1): P1-1 A, P1-2 B (U4 pins 6/7), P1-3 GND. Click: connect an RS-485 host.'],
  ['P5','PAN300',  11300,6600, 'hdr3','Audio out to the host: P5-1 = GS9023 pin 55, P5-2 = pin 54 (the two AES streams of the selected group; on DEMUX-1 the same pins also fed the AES BNCs), P5-3 GND.'],
  ['P3','PAN300',  14420,4650, 'hdr3h','Power in: P3-2/P3-3 → bridge D1–D4, P3-1 GND (centre tap, '+'inferred'+') → LM2596 +5 V and 79L05 −5 V. Click: power on/off.'],
  ['H4','H2X3',    12560,4230, 'hdr23','ICSP: H4-1 +5 V, H4-2 RB7/PGD, H4-3 MCLR/VPP, H4-4 RB6/PGC, H4-5 GND, H4-6 RB3/PGM.'],
  ['X1','4.9152',  12470,4640, 'xtal','4.9152 MHz crystal on OSC1/OSC2 with C22/C23 27 pF → 9600 baud from SPBRG = 7.'],
  ['CD1','RED LED',11290,5330, 'led','Red LED from +5 V through R29 330 Ω to RB5: lit while RB5 is low = GS9023 video-standard lock (settx).'],
  ['D1','1N4003',  13200,4900, 'diode',''],['D2','1N4003',13075,4630,'diode',''],['D3','1N4003',13675,4880,'diode',''],['D4','1N4003',13675,4640,'diode','Bridge D1–D4 on P3; the negative side feeds the 79L05.'],
  ['C3','220/35',  13860,4380, 'cap',''],['C10','220/35',12860,4420,'cap',''],['L1','PE-53823',13150,4300,'ind','LM2596 inductor.'],['REG3','79L05',14200,4960,'to92','−5 V for the EL2280.'],
];
function boardSVG(t, opts){
  opts = opts || {};
  const on = powerAt(t), cab = cableIn(t), led = on && histAt('rb5', t, 1) === 0, pe = on ? histAt('pe', t, 0) : 0, B = build();
  const enc = encoderAt(t), a5 = p5Stream(t);
  let s = `<svg viewBox="0 0 4300 3700" role="img" aria-label="DEMUX-2 Issue 2 board, top side" style="width:100%;max-width:${opts.max||820}px;display:block;border-radius:8px">
    <defs><filter id="d2glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="30" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="0" y="0" width="4300" height="3700" fill="var(--lane)"/>
    <rect x="${bx(11200)}" y="${by(7525)}" width="3825" height="3500" rx="25" fill="#1d5a39" stroke="#0f3a24" stroke-width="12"/>
    <image href="${ASSET}demux2-paste-top.png" x="0" y="0" width="4300" height="3700" opacity=".92"/>`;
  for (const c of [[11333,7187],[14947,4343]]) s += `<circle cx="${bx(c[0])}" cy="${by(c[1])}" r="30" fill="none" stroke="#e8e2c8" stroke-width="6"/>`;
  for (const [ref, val, X, Yc, w0, h0, d] of CHIPS){
    const pn = PNP_ROT[ref] || 0; const sw = (pn === 90 || pn === 270); const w = sw ? h0 : w0, h = sw ? w0 : h0;
    const sel = D.selPart === ref; const big = w0 >= 300;
    s += `<g class="d2part" data-p="${ref}" style="cursor:pointer"><title>${ref} ${val}</title><rect x="${bx(X)-w/2}" y="${by(Yc)-h/2}" width="${w}" height="${h}" rx="${big?14:6}" fill="#1b1c1e" stroke="${sel?'#ffd23a':'#3a3d40'}" stroke-width="${sel?16:5}"/>
      ${big?`<text x="${bx(X)}" y="${by(Yc)-8}" text-anchor="middle" font-size="${w0>=500?70:54}" fill="#d9d9d9" font-weight="700">${ref}</text><text x="${bx(X)}" y="${by(Yc)+58}" text-anchor="middle" font-size="${w0>=500?52:40}" fill="#9a9a9a">${val}</text>`:
        `<text x="${bx(X)}" y="${by(Yc)+14}" text-anchor="middle" font-size="40" fill="#cfcfcf">${ref}</text>`}</g>`;
  }
  for (const [ref, val, X, Yc, kind, d] of TH){
    const x = bx(X), y = by(Yc), sel = D.selPart === ref ? '#ffd23a' : null;
    let g = '';
    if (kind === 'bnc'){ g = `<rect x="${x}" y="${y-250}" width="200" height="500" fill="#2b2d30" stroke="${sel||'#555'}" stroke-width="${sel?16:6}"/><rect x="${x+200}" y="${y-170}" width="340" height="340" rx="20" fill="#b9bcc0" stroke="#6d7175" stroke-width="8"/><circle cx="${x+370}" cy="${y}" r="110" fill="#d6c27c"/><circle cx="${x+370}" cy="${y}" r="36" fill="#7a5f12"/>
        <text x="${x-30}" y="${y+18}" text-anchor="end" font-size="64" fill="#eee" font-weight="700">${ref}</text>`;
      if (ref === 'INPUT1' && cab) g += `<rect x="${x+300}" y="${y-140}" width="140" height="280" rx="24" fill="#3a74b8"/><rect x="${x+440}" y="${y-60}" width="300" height="120" fill="#2b5f9e"/>`;
      if (ref === 'INPUT1') g += `<circle cx="${x+370}" cy="${y-230}" r="26" fill="${cab?'var(--accent)':'#555'}"/>`;
      if (ref === 'OUT1' || ref === 'OUT2'){ const c = enc.state === 'ok' ? 'var(--accent)' : enc.state === 'reset' || enc.state === 'off' || enc.state === 'nosig' ? '#555' : 'var(--warn)'; g += `<circle cx="${x+370}" cy="${y-230}" r="26" fill="${c}"/>`; }
      if (ref === 'SDIOUT1') g += `<circle cx="${x+370}" cy="${y-230}" r="26" fill="${on&&clcLock(t)?'var(--accent)':'#555'}"/>`; }
    else if (kind.startsWith('hdr')){ const n = kind==='hdr6'?6:kind==='hdr23'?6:3; const hor = kind==='hdr3h'; const two = kind==='hdr23';
      const W = hor ? n*100+40 : two ? 340 : 140, H = hor ? 140 : two ? 240 : n*100+40;
      g = `<rect x="${x-W/2}" y="${y-H/2}" width="${W}" height="${H}" fill="#f2efe6" stroke="${sel||'#888'}" stroke-width="${sel?16:6}"/>`;
      for (let k = 0; k < n; k++){ const px = hor ? x - W/2 + 70 + k*100 : two ? x - 100 + (k%3)*100 : x, py = hor ? y : two ? y - 50 + Math.floor(k/3)*100 : y - H/2 + 70 + k*100; g += `<rect x="${px-22}" y="${py-22}" width="44" height="44" fill="#c8a640"/>`; }
      g += `<text x="${hor?x:x+(two?0:110)}" y="${hor?y-100:y+(two?170:20)}" text-anchor="${hor||two?'middle':'start'}" font-size="60" fill="#eee" font-weight="700">${ref}</text>`;
      if (ref === 'P4' && D.host === 'pod') g += `<path d="M${x-70} ${y-H/2} h-80 v${H} h80" fill="#7a7f87" opacity=".85"/><text x="${x-190}" y="${y}" font-size="46" fill="#eee" transform="rotate(-90 ${x-190} ${y})" text-anchor="middle">PODXX</text>`;
      if (ref === 'P1' && D.host === 'uart') g += `<path d="M${x-70} ${y-H/2} h-80 v${H} h80" fill="#5a7fa8" opacity=".9"/><text x="${x-190}" y="${y}" font-size="46" fill="#eee" transform="rotate(-90 ${x-190} ${y})" text-anchor="middle">HOST</text>`;
      if (ref === 'P3' && on) g += `<rect x="${x-W/2}" y="${y+70}" width="${W}" height="70" fill="#a33" opacity=".85"/>`;
      if (ref === 'P4' && on){ const b = (n, v, col) => `<circle cx="${x+120}" cy="${y - H/2 + 70 + (n-1)*100}" r="24" fill="${v?col:'#444'}"/>`;
        g += B.pins==='old' ? b(4, pe & 2, '#7dff6a') + b(3, pe & 4, '#7dff6a') : b(5, pe & 1, '#7dff6a') + b(4, pe & 2, '#7dff6a'); }
      if (ref === 'P5' && a5) g += `<circle cx="${x+120}" cy="${y-80}" r="24" fill="var(--accent)"/><circle cx="${x+120}" cy="${y+20}" r="24" fill="var(--accent)"/>`; }
    else if (kind === 'xtal') g = `<rect x="${x-200}" y="${y-80}" width="400" height="160" rx="80" fill="#c9ccd0" stroke="${sel||'#777'}" stroke-width="${sel?16:6}"/><text x="${x}" y="${y+18}" text-anchor="middle" font-size="54" fill="#333">X1 4.9152</text>`;
    else if (kind === 'led') g = `<circle cx="${x}" cy="${y}" r="70" fill="${led?'#ff3b2f':'#3a1715'}" stroke="${sel||'#222'}" stroke-width="${sel?16:6}" ${led?'filter="url(#d2glow)"':''}/><text x="${x+100}" y="${y+20}" font-size="56" fill="#eee" font-weight="700">CD1</text>`;
    else if (kind === 'diode') g = `<rect x="${x-140}" y="${y-35}" width="280" height="70" rx="20" fill="#222" stroke="${sel||'#555'}" stroke-width="5"/><rect x="${x+90}" y="${y-35}" width="22" height="70" fill="#ccc"/><text x="${x}" y="${y-50}" text-anchor="middle" font-size="40" fill="#ddd">${ref}</text>`;
    else if (kind === 'cap') g = `<circle cx="${x}" cy="${y}" r="140" fill="#1e3c7a" stroke="${sel||'#99a'}" stroke-width="6"/><text x="${x}" y="${y+14}" text-anchor="middle" font-size="44" fill="#eee">${ref}</text>`;
    else if (kind === 'ind') g = `<rect x="${x-180}" y="${y-180}" width="360" height="360" rx="40" fill="#2a2a2a" stroke="${sel||'#666'}" stroke-width="6"/><circle cx="${x}" cy="${y}" r="120" fill="#7a5f12"/><text x="${x}" y="${y+14}" text-anchor="middle" font-size="44" fill="#eee">${ref}</text>`;
    else if (kind === 'to92') g = `<path d="M${x-90} ${y+40} h180 a90 90 0 0 0 -180 0z" fill="#222" stroke="${sel||'#666'}" stroke-width="5"/><text x="${x}" y="${y+100}" text-anchor="middle" font-size="40" fill="#ddd">${ref}</text>`;
    s += `<g class="d2part" data-p="${ref}" style="cursor:pointer"><title>${ref} ${val}</title>${g}</g>`;
  }
  s += `<text x="${bx(11260)}" y="${by(7450)}" font-size="60" fill="#e8e2c8" font-weight="700">DEMUX-2 ISS2</text><text x="${bx(11260)}" y="${by(7380)}" font-size="40" fill="#cfc9b0">top paste layer (DEMUX-2ISS2.STN) · 3.825 × 3.500 in</text>`;
  if (!on) s += `<rect x="${bx(11200)}" y="${by(7525)}" width="3825" height="3500" fill="#000" opacity=".35"/><text x="${bx(13100)}" y="${by(5700)}" text-anchor="middle" font-size="120" fill="#fff">UNPOWERED</text>`;
  return s + (opts.hot || '') + '</svg>';
}
const PNP_ROT = {U7:180, U14:270, U10:90, U5:90, U2:180, U1:90, U6:180, U11:180, U13:0, U4:90, U8:270, REG1:180, REG2:90, R32:0, R33:0, D7:90};
function partInfo(ref){
  const c = CHIPS.find(x => x[0] === ref); if (c) return `<b>${c[0]} · ${c[1]}</b> — ${c[6]} <span class="muted small">(centroid ${c[2].toFixed(0)}, ${c[3].toFixed(0)} mil, PNP)</span>`;
  const h = TH.find(x => x[0] === ref); if (h) return `<b>${h[0]} · ${h[1]}</b> — ${h[5] || 'Through-hole part.'} <span class="muted small">(position ${inf} from its RefDes text in DEMUX-2ISS2.pcb)</span>`;
  return '<span class="muted">Click a part.</span>';
}
function bindBoard(root){
  root.querySelectorAll('.d2part').forEach(g => g.onclick = () => {
    const p = g.dataset.p; D.selPart = p;
    if (p === 'INPUT1') return A.cable();
    if (p === 'P3') return A.power();
    if (p === 'P4' && D.host !== 'pod'){ D.host = 'pod'; dirty(); D.log.unshift({t:SIM.t, name:'PODXX ribbon on P4', trace:['The PODXX now drives P4-2/P4-3 with its group code; the RS-485 host is disconnected (P1 idle).']}); }
    else if (p === 'P1' && D.host !== 'uart'){ D.host = 'uart'; dirty(); D.log.unshift({t:SIM.t, name:'RS-485 host on P1', trace:['The host starts polling with 0x'+hex(D.init.sel)+' 0x00 frames; P4 is left open (the 3K3 pull-ups make every line read 1).']}); }
    else if (p === 'OUT1' || p === 'OUT2' || p === 'P5') D.scope = p === 'P5' ? 'p5' : 'cvbs';
    SIM.refresh();
  });
}

/* ---------------- controls ---------------- */
function controlsHTML(){
  const B = build();
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
    <label>Scenario <select id="d2scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scn?'selected':''}>${SCEN[k].name}</option>`).join('')}${D.scn==='custom'?'<option selected>custom</option>':''}</select></label>
    <label>Firmware <select id="d2fw">${Object.keys(BUILDS).map(k=>`<option value="${k}" ${k===D.fw?'selected':''}>${BUILDS[k].label}</option>`).join('')}</select></label>
    <label title="The b folders"><input type="checkbox" id="d2pal" ${D.pal?'checked':''} ${B.palOk?'':'disabled'}> PAL "B" build</label>
    <label>SDI source <select id="d2std"><option value="525" ${D.std==='525'?'selected':''}>525/59.94</option><option value="625" ${D.std==='625'?'selected':''}>625/50</option></select></label>
    <span>Groups embedded ${[1,2,3,4].map(g=>`<label><input type="checkbox" data-g="${g}" ${D.emb[g-1]?'checked':''}>G${g}</label>`).join(' ')}</span>
    <label>Dolby E in <select id="d2dol"><option value="0">no group</option>${[1,2,3,4].map(g=>`<option value="${g}" ${D.dolby===g?'selected':''}>group ${g}</option>`).join('')}</select></label>
  </div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:6px">
    <label>Host <select id="d2host"><option value="pod" ${D.host==='pod'?'selected':''}>POD19 / PODXX on P4</option><option value="uart" ${D.host==='uart'?'selected':''}>XTM4 · AMS4 · DMS1 on P1 (RS-485)</option><option value="none" ${D.host==='none'?'selected':''}>nothing connected</option></select></label>
    <span>PODXX group ${[1,2,3,4].map(g=>`<button data-pg="${g}" class="${D.host==='pod'&&valAt('pod',SIM.t)===g?'on':''}">${g}</button>`).join('')}</span>
    <label>Host byte <select id="d2sel">${[0xE8,0xF0,0xF1,0xF2,0xF3,0xF4,0xF5,0xF6,0xF7,0xE0,0xC2].map(b=>`<option value="${b}" ${valAt('sel',SIM.t)===b?'selected':''}>0x${hex(b)} ${b===0xE8?'query':b===0xE0?'source off':b===0xC2?'(bits 6:5 = 10)':'group '+(((b>>1)&3)+1)}</option>`).join('')}</select></label>
    <label>poll every <select id="d2per">${[0.02,0.05,0.1,0.25].map(p=>`<option value="${p}" ${D.hostPer===p?'selected':''}>${p*1000} ms</option>`).join('')}</select></label>
    <button id="d2cab">${cableIn(SIM.t)?'Unplug':'Plug'} SDI (C)</button><button id="d2pwr">Power ${powerAt(SIM.t)?'off':'on'} (P)</button><button id="d2clr">Clear my actions</button>
  </div>`;
}
function bindControls(m){
  const q = s => m.querySelector(s);
  const custom = () => { D.scn = 'custom'; dirty(); SIM.refresh(); };
  q('#d2scn').onchange = e => { if (SCEN[e.target.value]) A.scenario(e.target.value); };
  q('#d2fw').onchange = e => { D.fw = e.target.value; if (!BUILDS[D.fw].palOk) D.pal = false; D.log.unshift({t:SIM.t, name:'Firmware → '+BUILDS[D.fw].label, trace:['Source: DEMUX-2 - #Software/'+BUILDS[D.fw].folder+'. The whole second is re-emulated from power-on.']}); custom(); };
  q('#d2pal').onchange = e => { D.pal = e.target.checked; custom(); };
  q('#d2std').onchange = e => { D.std = e.target.value; custom(); };
  m.querySelectorAll('[data-g]').forEach(c => c.onchange = () => { D.emb[+c.dataset.g-1] = c.checked; custom(); });
  q('#d2dol').onchange = e => { D.dolby = +e.target.value; custom(); };
  q('#d2host').onchange = e => { D.host = e.target.value; custom(); };
  m.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => A.pod(+b.dataset.pg));
  q('#d2sel').onchange = e => A.sel(+e.target.value);
  q('#d2per').onchange = e => { D.hostPer = +e.target.value; custom(); };
  q('#d2cab').onclick = () => A.cable(); q('#d2pwr').onclick = () => A.power(); q('#d2clr').onclick = () => A.clear();
}
document.addEventListener('keydown', e => {
  if (!window.__demux2Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  if (k === 'c') A.cable(); else if (k === 'p') A.power(); else if ('1234'.includes(k) && k.length === 1) A.pod(+k);
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
const ROUT_COL = ['--ink2','--accent2','--accent','--bad','--warn','--warn','--accent','--warn','--accent','--ink2','--accent2','--bad','--bad','--bad','--ink2'];
function txtFit(c, s, x, y, maxW){ if (maxW < 16) return; let t = s; while (t.length > 2 && c.measureText(t).width > maxW-4) t = t.slice(0,-1); if (t.length < s.length) t = t.slice(0,-1)+'…'; c.fillText(t, x, y); }
function levelLane(c, X, t0, t1, y, h, fn, col, lbl){
  const x0 = X(t0), x1 = X(t1), N = Math.max(2, Math.min(1400, Math.round(x1 - x0)));
  c.fillStyle = col; let run = null;
  for (let k = 0; k <= N; k++){ const tt = t0 + (t1 - t0)*k/N; const v = fn(tt);
    if (v && run === null) run = X(tt); if ((!v || k === N) && run !== null){ c.globalAlpha = .75; c.fillRect(run, y+5, Math.max(1, X(tt) - run), h-10); c.globalAlpha = 1; run = null; } }
  if (lbl){ c.fillStyle = SIM.css('--ink'); c.font = '10.5px '+SIM.css('--mono'); c.fillText(lbl, x0 + 4, y + h - 4); }
}
function lanes(){
  const E = emulate(), S0 = STD[D.std], col = n => SIM.css(n), ink = col('--ink'), mono = '10.5px '+col('--mono');
  return [
    {label:'SDI INPUT1 (fields)', h:26, draw(c,X,t0,t1,y,h){
      levelLane(c, X, t0, t1, y, h, cableIn, col('--accent2'));
      SIM.pulses(c, X, t0, t1, y, h, S0.field, 0, S0.field*0.01, col('--ink2'), 'fields');
      c.fillStyle = ink; c.font = mono; txtFit(c, `${S0.name} · 270 Mb/s`, X(t0)+4, y+h-5, 300); }},
    {label:'SDI lines → HANC · active', h:28, draw(c,X,t0,t1,y,h){
      const span = t1 - t0;
      if (span > 40*S0.H){ SIM.pulses(c, X, t0, t1, y, h, S0.H, 0, 4*WORD_T, col('--ink2'), 'lines (EAV)'); return; }
      const n0 = Math.floor(t0/S0.H), n1 = Math.floor(t1/S0.H);
      for (let n = n0; n <= n1; n++){ const L0 = n*S0.H; const W = w => L0 + w*WORD_T;
        if (!cableIn(L0)) continue;
        c.fillStyle = col('--bad'); c.fillRect(X(W(0)), y+3, Math.max(1, X(W(4))-X(W(0))), h-6);
        c.fillStyle = col('--grid'); c.fillRect(X(W(4)), y+8, X(W(4+S0.hanc))-X(W(4)), h-16);
        c.fillStyle = col('--bad'); c.fillRect(X(W(4+S0.hanc)), y+3, Math.max(1, X(W(8+S0.hanc))-X(W(4+S0.hanc))), h-6);
        c.fillStyle = col('--accent2'); c.globalAlpha = .25; c.fillRect(X(W(8+S0.hanc)), y+3, X(W(S0.words))-X(W(8+S0.hanc)), h-6); c.globalAlpha = 1;
        c.fillStyle = ink; c.font = mono; txtFit(c, `line ${((n%S0.lines)+S0.lines)%S0.lines+1}: EAV · HANC · SAV · 1440 active words`, X(W(8+S0.hanc))+3, y+h/2+4, X(W(S0.words))-X(W(8+S0.hanc))); } }},
    {label:'HANC audio packets', h:28, draw(c,X,t0,t1,y,h){
      const span = t1 - t0, g = gsGroup((t0+t1)/2);
      if (span > 40*S0.H){ const per = D.emb.filter(Boolean).length; c.fillStyle = col('--accent'); c.globalAlpha = .3; c.fillRect(X(t0), y+6, X(t1)-X(t0), h-12); c.globalAlpha = 1;
        c.fillStyle = ink; c.font = mono; c.fillText(`${per} audio data packet${per!==1?'s':''} per line (groups ${[1,2,3,4].filter(k=>D.emb[k-1]).join(', ')||'none'}) · selected DID group ${g||'—'}`, X(t0)+4, y+h/2+4); return; }
      const n0 = Math.floor(t0/S0.H), n1 = Math.floor(t1/S0.H);
      for (let n = n0; n <= n1; n++){ if (!cableIn(n*S0.H)) continue; for (const p of hancLayout(n)){ const a = n*S0.H + p.a*WORD_T, b = n*S0.H + p.b*WORD_T;
        c.fillStyle = col(GCOL[p.g-1]); c.globalAlpha = p.kind === 'control' ? .45 : .85; c.fillRect(X(a), y+4, Math.max(1, X(b)-X(a)), h-8); c.globalAlpha = 1;
        if (p.g === g && p.kind === 'audio'){ c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(X(a), y+3, Math.max(1, X(b)-X(a)), h-6); }
        c.fillStyle = '#fff'; c.font = mono; txtFit(c, `${p.kind==='control'?'CTL':'G'+p.g} DID ${hex(anc(p.kind==='control'?CTL_DID[p.g]:AUD_DID[p.g]),3)}${span<6e-5?' · '+samplesOnLine(n)+' samples':''}`, X(a)+2, y+h/2+4, X(b)-X(a)); } } }},
    {label:'CD (RC2) · CLC016 RD (RB1:RB0)', h:22, draw(c,X,t0,t1,y,h){ levelLane(c, X, t0, t1, y, h, cdAt, col('--accent2')); levelLane(c, X, t0, t1, y+5, h-10, clcLock, col('--accent'), 'lock,0 · lock,7'); }},
    {label:'RESET net RC5 (ADV7171 + GS9023)', h:22, draw(c,X,t0,t1,y,h){ levelLane(c, X, t0, t1, y, h, t => powerAt(t) && histAt('rc5', t, 0), col('--accent'), 'high = released'); }},
    {label:'GS9023 addr0 b5 video · b3 audio', h:26, draw(c,X,t0,t1,y,h){ levelLane(c, X, t0, t1, y, h/2+2, videoLock, col('--accent2')); levelLane(c, X, t0, t1, y+h/2-2, h/2+2, audioLock, col('--accent'));
      c.fillStyle = ink; c.font = mono; c.fillText(`DID group ${gsGroup((t0+t1)/2)||'—'}${E.stdMatch?'':' · addr0 b2 ≠ source standard'}`, X(t0)+4, y+h-4); }},
    {label:'GS9023 bus (~WE ×4, ~RE ×2 / pass)', h:22, draw(c,X,t0,t1,y,h){
      const P = E.P; const i0 = Math.max(0, bs(P.t0, P.n, t0)); const pxp = (X(t1)-X(t0))/Math.max(1, (t1-t0)/(202*TCY));
      if (pxp < 3){ c.fillStyle = col('--accent2'); c.globalAlpha = .3; c.fillRect(X(t0), y+5, X(t1)-X(t0), h-10); c.globalAlpha = 1; c.fillStyle = ink; c.font = mono; c.fillText('refreshgs9023 writes addr0/3/4/6 on every pass · readgs9023 reads addr0 twice', X(t0)+4, y+h/2+4); return; }
      for (let i = i0; i < P.n && P.t0[i] < t1; i++){ let cum = 0; for (let k = 0; k < 6; k++) cum += P.rc[i*NR+k];
        for (let w = 0; w < 4; w++){ const tw = P.t0[i] + (cum + 5 + w*8 + 5)*TCY; c.fillStyle = col('--accent2'); c.fillRect(X(tw), y+3, Math.max(1.5, X(tw+2*TCY)-X(tw)), h-6); if (X(tw+8*TCY)-X(tw) > 40){ c.fillStyle = ink; c.font = mono; c.fillText(['a0','a3','a4','a6'][w]+'=0x'+hex([E.B.addr0, P.a3[i], A4[A3G[P.a3[i]]||1], E.B.addr6][w]), X(tw)+3, y+h/2+4); } }
        cum += P.rc[i*NR+6] + P.rc[i*NR+7]; for (let r = 0; r < 2; r++){ const tr = P.t0[i] + (cum + 4 + r*12)*TCY; c.fillStyle = col('--warn'); c.fillRect(X(tr), y+3, Math.max(1.5, X(tr+2*TCY)-X(tr)), h-6); } } }},
    {label:'PIC main loop passes', h:30, draw(c,X,t0,t1,y,h){
      const P = E.P; const i0 = Math.max(0, bs(P.t0, P.n, t0));
      for (const b of E.boots){ if (b[1] < t0 || b[0] > t1) continue; c.fillStyle = col('--ink2'); c.globalAlpha = .3; c.fillRect(X(b[0]), y+3, X(b[1])-X(b[0]), h-6); c.globalAlpha = 1; c.fillStyle = ink; c.font = mono; txtFit(c, 'PWRT + INIT', X(Math.max(b[0],t0))+3, y+h/2+4, X(b[1])-X(Math.max(b[0],t0))); }
      let cnt = 0; for (let i = i0; i < P.n && P.t0[i] < t1; i++) cnt++;
      const pxPer = (X(t1)-X(t0))/Math.max(1, cnt);
      if (pxPer < 3){ for (let i = i0; i < P.n && P.t0[i] < t1; i++){ const d = P.cyc[i]*TCY; const hot = P.work[i] & 4096; c.fillStyle = col(hot?'--bad':'--accent'); c.globalAlpha = hot ? .7 : .35; c.fillRect(X(P.t0[i]), y+6, Math.max(.6, X(P.t0[i]+d)-X(P.t0[i])), h-12); } c.globalAlpha = 1;
        c.fillStyle = ink; c.font = mono; c.fillText(`${cnt.toLocaleString()} passes in view · red = passes that write the ADV7171`, X(t0)+4, y+h-4); return; }
      for (let i = i0; i < P.n && P.t0[i] < t1; i++){ let tt = P.t0[i];
        for (let k = 0; k < NR; k++){ const d = P.rc[i*NR+k]*TCY; if (!d) continue; const xa = X(tt), xb = X(tt+d);
          c.fillStyle = col(ROUT_COL[k]); c.globalAlpha = (k===3 && P.rc[i*NR+3] > 100) ? .9 : .55; c.fillRect(xa, y+4, Math.max(.8, xb-xa-0.5), h-8); c.globalAlpha = 1;
          if (xb - xa > 52){ c.fillStyle = ink; c.font = '10px '+col('--mono'); txtFit(c, k===3 && P.rc[i*NR+3] > 100 ? 'ADV7171_RESET → DELAY' : RT[k], xa+2, y+h/2+4, xb-xa); }
          tt += d; } } }},
    {label:'DELAY (104 ms, in MAIN)', h:20, draw(c,X,t0,t1,y,h){ for (const d of E.delays){ if (d[1] < t0 || d[0] > t1) continue; c.fillStyle = col('--bad'); c.globalAlpha = .65; c.fillRect(X(d[0]), y+4, X(d[1])-X(d[0]), h-8); c.globalAlpha = 1; c.fillStyle = ink; c.font = mono; txtFit(c, 'DELAY: 125 × 256 × CLRWDT/DECFSZ/GOTO', X(Math.max(d[0],t0))+3, y+h/2+4, X(Math.min(d[1],t1))-X(Math.max(d[0],t0))); } }},
    {label:'I2C → ADV7171 (RC3 SCL, RC4 SDA)', h:28, draw(c,X,t0,t1,y,h){
      for (const x of E.i2c){ if (x.t1 < t0 || x.t0 > t1) continue; const xa = X(x.t0), xb = X(x.t1);
        c.fillStyle = col(x.ack ? '--accent2' : '--warn'); c.globalAlpha = .75; c.fillRect(xa, y+4, Math.max(1, xb-xa), h-8); c.globalAlpha = 1;
        if (xb - xa > 260){ for (let k = 0; k < 3; k++){ const b0 = x.t0 + (I2C_START + k*I2C_BYTE)*TCY; const v = [0x54, x.sub, x.val][k];
            for (let bit = 0; bit < 9; bit++){ const tb = b0 + bit*I2C_BIT*TCY, xx = X(tb), xw = X(tb + I2C_BIT*TCY) - xx; const one = bit < 8 ? (v >> (7-bit)) & 1 : (x.ack ? 0 : 1);
              c.fillStyle = '#fff'; c.fillRect(xx+1, one ? y+6 : y+h-10, Math.max(1, xw-2), 3); if (xw > 14){ c.fillStyle = ink; c.font = '9px '+col('--mono'); c.fillText(bit < 8 ? one : (x.ack?'A':'N'), xx+2, y+h/2+3); } } } }
        else if (xb - xa > 34){ c.fillStyle = '#fff'; c.font = mono; txtFit(c, `[0x54] reg ${x.sub} ← 0x${hex(x.val)}${x.ack?'':' NACK'}`, xa+2, y+h/2+4, xb-xa); } } }},
    {label:'RS-485 RX host → RC7', h:24, draw(c,X,t0,t1,y,h){
      if (D.host !== 'uart'){ c.fillStyle = col('--ink2'); c.font = mono; c.fillText('no RS-485 host on P1', X(t0)+4, y+h/2+4); return; }
      for (const r of E.rx){ if (r.t1 < t0 || r.t0 > t1) continue; const xa = X(r.t0), xb = X(r.t1); c.fillStyle = col(r.lost ? '--bad' : '--accent2'); c.globalAlpha = .75; c.fillRect(xa, y+4, Math.max(1, xb-xa), h-8); c.globalAlpha = 1;
        if (xb - xa > 30){ c.fillStyle = '#fff'; c.font = mono; txtFit(c, `0x${hex(r.b)}${r.lost?' '+r.lost:''}`, xa+2, y+h/2+4, xb-xa); } }
      for (const mk of E.marks){ if (mk.k !== 'rxerror1' || mk.t < t0 || mk.t > t1) continue; c.fillStyle = col('--bad'); c.fillRect(X(mk.t)-1, y, 3, h); c.font = mono; c.fillText('rxerror1: clrf rxflags', X(mk.t)+4, y+10); } }},
    {label:'RS-485 TX RC6 → host (DE = RC1)', h:24, draw(c,X,t0,t1,y,h){
      for (const r of E.tx){ const off = r.off || r.t1; if (off < t0 || r.t0 > t1) continue; c.fillStyle = col('--warn'); c.globalAlpha = .3; c.fillRect(X(r.t0), y+3, X(off)-X(r.t0), h-6); c.globalAlpha = .85; c.fillRect(X(r.t0), y+6, Math.max(1, X(r.t1)-X(r.t0)), h-12); c.globalAlpha = 1;
        if (X(r.t1)-X(r.t0) > 30){ c.fillStyle = '#fff'; c.font = mono; c.fillText(`0x${hex(r.b)}`, X(r.t0)+2, y+h/2+4); } } }},
    {label:'P4 tallies AES · SDI', h:22, draw(c,X,t0,t1,y,h){ const B = E.B; const aes = t => powerAt(t) && (histAt('pe', t, 0) & (B.pins==='old'?2:1)), sdi = t => powerAt(t) && (histAt('pe', t, 0) & (B.pins==='old'?4:2));
      levelLane(c, X, t0, t1, y, h/2+2, aes, col('--accent')); levelLane(c, X, t0, t1, y+h/2-2, h/2+2, sdi, col('--accent2'), B.pins==='old'?'RE1 · RE2':'RE0 (P4-5) · RE1 (P4-4)'); }},
    {label:'CD1 LED (RB5 low)', h:20, draw(c,X,t0,t1,y,h){ levelLane(c, X, t0, t1, y, h, t => powerAt(t) && !histAt('rb5', t, 1), '#e3453a'); }},
    {label:'AES on P5 (GS9023 pins 55/54)', h:24, draw(c,X,t0,t1,y,h){ levelLane(c, X, t0, t1, y, h, t => !!p5Stream(t), col('--accent'));
      if (t1 - t0 < 0.05) SIM.pulses(c, X, t0, t1, y, h, BLOCK, 0, 2/AES_FS, col('--ink'), 'AES blocks (Z)');
      c.fillStyle = ink; c.font = mono; const g = p5Stream((t0+t1)/2); c.fillText(g ? `group ${g}: ch1/2 + ch3/4 · 48 kHz${D.dolby===g?(E.B.addr6&4?' · Dolby E, CRC altered':' · Dolby E intact'):''}` : 'silent', X(t0)+4, y+h-5); }},
    {label:'Composite OUT1/OUT2', h:24, draw(c,X,t0,t1,y,h){ const st = t => { const e = encoderAt(t); return e.state === 'ok' ? 1 : (e.state === 'wrong' || e.state === 'mono') ? 2 : 0; };
      levelLane(c, X, t0, t1, y, h, t => st(t) === 1, col('--accent')); levelLane(c, X, t0, t1, y, h, t => st(t) === 2, col('--warn'));
      if (t1 - t0 < 40*S0.H) SIM.pulses(c, X, t0, t1, y, h, S0.H, 0, 4.7e-6, col('--ink'), 'H sync');
      c.fillStyle = ink; c.font = mono; txtFit(c, encoderAt((t0+t1)/2).txt.replace(/<[^>]+>/g,''), X(t0)+4, y+h-5, X(t1)-X(t0)); }},
  ];
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body){ return `<div class="card"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const e = D.log[0]; return e ? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>` + e.trace.map(s => `<div>→ ${s}</div>`).join('') : '<div class="muted">Click INPUT1, P3, P4 or P1 on the board, or use the controls. Each step the firmware takes is listed here with its real labels and registers.</div>'; }
function stateTable(t){
  const p = passAt(t), B = build(), E = emulate();
  if (!powerAt(t)) return '<p class="muted">Unpowered.</p>';
  if (inBoot(t)) return '<p class="muted">Power-up timer / INIT: MAIN has not started.</p>';
  const d = inDelay(t), x = i2cAt(t);
  if (!p) return '<p class="muted">—</p>';
  const k = stepOf(p, t), gnum = g => g & 8 ? 4 : g & 4 ? 3 : g & 2 ? 2 : 1;
  const row = (a, b) => `<tr><th>${a}</th><td class="mono small">${b}</td></tr>`;
  return `<table class="kv">${row('Pass', `#${p.i} at ${SIM.fmtT(p.t0)} · ${p.cyc.toLocaleString()} cycles = ${SIM.fmtDur(p.cyc*TCY)}`)}
    ${row('Running', d ? '<b>DELAY</b> (inside ADV7171_RESET) — '+SIM.fmtDur(d[1]-t)+' left' : RT[k])}
    ${row('group / addr3 / addr4', `${p.grp} (group ${gnum(p.grp)}) / 0x${hex(p.a3)} (DID G${A3G[p.a3]}) / 0x${hex(A4[A3G[p.a3]])}`)}
    ${row('addr0 / addr6 written', `0x${hex(B.addr0)} (${B.addr0&4?'PAL':'NTSC'}) / 0x${hex(B.addr6)} (bit 2 = ${(B.addr6>>2)&1})`)}
    ${row('lock / signal', `0b${bin(p.lock)} (CD ${p.lock&1}, CLC016 ${p.lock>>7}) / 0b${bin(p.sig,2)}`)}
    ${row('rxflags / uart_mode', `0b${bin(p.rxf)} / ${B.mode==='sticky'?p.um:'(none: rxflags,7)'} → ${p.um?'UART mode':'PODXX mode'}`)}
    ${row('tx0 / FIFO', `0x${hex(p.tx0)} / ${p.fifo} byte(s)`)}
    ${row('I2C / address', `0b${bin(p.i2c)} / ${p.adr}${p.i2c&0x80?' (I2C,7: done)':''}`)}
    ${row('I2C wire', x ? `${x.ack?'':'NACK · '}[0x54] sub ${x.sub} (${ADV_NAME[x.sub]}) ← 0x${hex(x.val)}, bit ${Math.max(0, Math.floor(((t-x.t0)/TCY - I2C_START) % I2C_BYTE / I2C_BIT))} of byte ${Math.min(2, Math.max(0, Math.floor(((t-x.t0)/TCY - I2C_START)/I2C_BYTE)))}` : 'idle (SCL/SDA released, 10 kΩ pull-ups R80/R81)')}
    ${row('PORTE / RB5 / RC5', `0b${bin(p.pe,3)} / ${p.rb5} (CD1 ${p.rb5?'off':'on'}) / ${p.rc5}`)}</table>`;
}
function viewSim(m){
  window.__demux2Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('DEMUX-2 Issue 2 board — click the parts', `<div id="bd"></div><div id="pi" class="small" style="margin-top:6px"></div><div id="ctl"></div>`)}</div>
    <div>${card('PIC16F874 at the playhead', `<div id="st"></div>`)}${card('What the software did', `<div id="tr" class="log"></div>`)}</div></div>
    ${card('One second of the DEMUX-2 (zoom with the transport; click to seek)', `<canvas id="tl"></canvas><p class="small muted">Keys: <b>C</b> cable, <b>P</b> power, <b>1–4</b> PODXX group. The model starts at power-on ${-PRE} s before this second, so counters and modes are what a running board would have.</p>`)}`;
  let lastKey = '';
  const draw = () => {
    const t = SIM.t; const key = D.scn+D.fw+D.pal+D.host+D.std+D.emb+D.hostPer+D.dolby+D.events.length+(cableIn(t)?1:0)+(powerAt(t)?1:0)+valAt('pod',t)+valAt('sel',t);
    if (key !== lastKey){ lastKey = key; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m); }
    const bd = m.querySelector('#bd'); bd.innerHTML = boardSVG(t); bindBoard(bd);
    m.querySelector('#pi').innerHTML = partInfo(D.selPart);
    m.querySelector('#st').innerHTML = stateTable(t);
    m.querySelector('#tr').innerHTML = traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const nowP = () => passAt(SIM.t);
const LESSONS = [
  {title:'Meet the DEMUX-2', auto:true, body:`<p>The DEMUX-2 is a 3.8 × 3.5 inch board that sits <b>inside</b> another Ward-Beck product — POD19, XTM4, AMS4 or DMS1 — and has no panel of its own. It takes a <b>525 or 625-line SD-SDI</b> signal on <b>INPUT1</b>, pulls out one embedded <b>audio group</b> (four channels) with a Gennum GS9023, and hands it to the host as two AES streams on <b>P5</b>. New on the DEMUX-2: an <b>ADV7171</b> encoder turns the same SDI into <b>composite video</b> on <b>OUT1/OUT2</b>.</p>
    <p>A PIC16F874 runs the show. It talks to a POD19 over parallel lines on <b>P4</b>, or to the bigger units over RS-485 on <b>P1</b>. The only light on the board is <b>CD1</b>.</p><p>There is no DEMUX-2 manual in the archive; this tutorial follows what the firmware does for each host.</p>`, check:()=>true},
  {title:'1 · Feed it SDI', body:`<p>Choose the scenario <b>POD19</b>. Click <b>INPUT1</b> to pull the cable, then click it again to plug it back.</p><p>Watch the lanes: CD and the CLC016 rate detect → <span class="mono">SDI_SIGNAL_CHECK</span> sets <span class="mono">lock,7</span> → <span class="mono">ADV7171_RESET</span> raises RC5 → then the firmware stops for <b>104 ms</b> in <span class="mono">DELAY</span> before it re-programs the ADV7171.</p><p><b>Goal:</b> SDI plugged, CD1 lit at the playhead.</p>`,
    check:()=> cableIn(SIM.t) && powerAt(SIM.t) && histAt('rb5', SIM.t, 1) === 0 && D.events.some(e=>e.k==='cable'), hint:'Click INPUT1 twice (out, then in) and play or scrub forward ~0.15 s: CD1 lights when the GS9023 reports video-standard lock (addr0 bit 5).'},
  {title:'2 · POD19: choose a group', body:`<p>In a POD19 the PODXX front-panel SELECT button drives P4-2/P4-3 with a 2-bit code. <span class="mono">readgroupselect</span> reads RE2 and RC0, <span class="mono">setgroup2</span> turns the number into the GS9023 DID registers, and <span class="mono">refreshgs9023</span> writes them on every pass.</p><p><b>Goal:</b> group 2 selected and the AES tally (P4-5, RE0) on.</p>`,
    check:()=>{ const p = nowP(); return D.host==='pod' && p && A3G[p.a3]===2 && audioLock(SIM.t); }, hint:'Press PODXX group 2 (or key 2). Make sure G2 is ticked in "Groups embedded".'},
  {title:'3 · An empty group', body:`<p>Select a group the source does not carry. The GS9023 never finds packets with that DID, so <b>addr0 bit 3</b> stays clear: the AES tally goes off and P5 is silent. CD1 stays lit — it shows video lock, not audio.</p><p><b>Goal:</b> PODXX on a group that is not embedded; AES tally off, CD1 on.</p>`,
    check:()=>{ const p = nowP(); return D.host==='pod' && p && !D.emb[A3G[p.a3]-1] && !audioLock(SIM.t) && histAt('rb5',SIM.t,1)===0; }, hint:'Press PODXX 3 with only G1 and G2 ticked.'},
  {title:'4 · RS-485 host', body:`<p>Click <b>P1</b> (or Host → XTM4). The host sends two-byte frames; the first byte must be <span class="mono">111xxxxx</span>. Bit 4 = select, bits 2:1 = group, bit 3 = query. The board answers one byte: bit 0 = no audio lock, bit 1 = no video lock.</p><p>Once a byte arrives, <span class="mono">rxflags,7</span> (and in v1.05 <span class="mono">uart_mode</span>) switch the P4 reading off.</p><p><b>Goal:</b> host byte 0xF4 (group 3), G3 embedded, reply 0x00.</p>`,
    check:()=>{ const r = hostReplyAt(SIM.t); const p = nowP(); return D.host==='uart' && p && A3G[p.a3]===3 && r && r.b===0x00; }, hint:'Host byte → 0xF4, tick G3, then play for ~0.1 s so a reply follows.'},
  {title:'5 · The "is a demux fitted?" query', body:`<p>Send <b>0xE8</b>. <span class="mono">setgroup1</span> sees bit 3 and jumps to <span class="mono">sdi_check</span>: <span class="mono">movlw 0xE0 · movwf tx0</span>. Nothing ever clears those top bits again, so every later reply also starts with 111.</p><p><b>Goal:</b> a reply of 0xE0–0xE3 on the TX lane.</p>`,
    check:()=>{ const r = hostReplyAt(SIM.t); return D.host==='uart' && r && (r.b & 0xE0)===0xE0; }, hint:'Host byte → 0xE8, then play forward one poll period.'},
  {title:'6 · Composite out and PAL', body:`<p>OUT1/OUT2 carry the picture re-coded by the ADV7171. The firmware writes 12 registers over a bit-banged I2C bus (RC3/RC4): mode registers 0–4, subcarrier frequency 9–12 and 7, 8, 13.</p><p>Load scenario <b>625/50 into a 1.03B PAL build</b>: the GS9023 is told PAL (addr0 bit 2) but the ADV7171 is still sent the NTSC values — PAL encoder values only arrived with <b>v1.04B</b> ("VIDEO DAC CHANGE TO ADV7171").</p><p><b>Goal:</b> with a 625 source, a firmware whose composite output is correct PAL.</p>`,
    check:()=> D.std==='625' && encoderAt(SIM.t).state==='ok', hint:'Firmware → v1.04 or v1.05 (2009), tick "PAL B build". Encoder state is in the Composite lane.'},
  {title:'7 · The overrun trap (v1.04 in an XTM4)', body:`<p>Load scenario <b>v1.04 in an XTM4</b>. When the cable comes back, MAIN sits in the 104 ms DELAY. The host keeps polling; the USART FIFO holds only two bytes, so the third sets <b>OERR</b>. <span class="mono">rxerror1</span> then does <span class="mono">clrf rxflags</span> — wiping bit 7, the "UART mode" flag.</p><p>For one pass the board is in PODXX mode: P4 is open, the pull-ups read 11 → group 4 → <span class="mono">setgroup2</span> writes the group-4 DID. When the host's next frame arrives, <span class="mono">setgroup1</span> sees the same byte as before and returns early. <b>The board stays on group 4.</b></p><p><b>Goal:</b> find the moment the DID changes to group 4.</p>`,
    check:()=> D.fw==='v104' && D.host==='uart' && gsGroup(SIM.t)===4 && valAt('sel',SIM.t)!==0xF6 && valAt('sel',SIM.t)!==0xF7, hint:'Scenario → "v1.04 in an XTM4", then move the playhead past ~0.36 s.'},
  {title:'8 · The fix: v1.05', body:`<p>"v1.05" exists twice. The Dec 2007 build in <span class="mono">#old/v105</span> (the one in the software listing, "FIXED COMMUNICATION ISSUE") simply comments out <span class="mono">setgroup2</span> and <span class="mono">readgroupselect</span>. The Jul 2009 build adds a sticky <span class="mono">uart_mode</span> flag, so POD19 still works.</p><p><b>Goal:</b> the same replug with v1.05 (2009) and the DID still on group 1.</p>`,
    check:()=> D.fw==='v105' && D.host==='uart' && D.events.some(e=>e.k==='cable') && SIM.t > 0.4 && gsGroup(SIM.t)===1, hint:'Scenario → "Same replug with v1.05", playhead after 0.4 s.'},
  {title:'9 · Dolby E', body:`<p>v1.03: "For disembedding DOLBY E had to change bit #2 for register 6 in GS9023 to low." Tick <b>Dolby E in group 1</b> and compare v1.02 with v1.03 on the P5 lane.</p><p>Then try a PAL B build: <b>every</b> B build keeps <span class="mono">addr6 = 0x05</span> — the fix never reached PAL.</p><p><b>Goal:</b> Dolby E passing intact on P5.</p>`,
    check:()=> D.dolby && p5Stream(SIM.t)===D.dolby && !(build().addr6 & 4), hint:'Dolby E in → group 1, firmware v1.03 or later, PAL box unticked, group 1 selected.'},
  {title:'Done', auto:true, body:`<p>You have used every control of the DEMUX-2. <b>One second</b> breaks the second down to SDI lines, HANC packets and PIC instruction cycles; <b>Software</b> shows MAIN, the I2C state machine and the register maps live; <b>Findings</b> lists what the firmware is really up to.</p>`, check:()=>true},
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__demux2Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — the DEMUX-2 inside its hosts', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the software did', `<div id="tr" class="log"></div>`)}</div>
    <div>${card('The board', `<div id="bd"></div><div id="pi" class="small"></div><div id="ctl"></div>`)}${card('Timeline (whole second)', `<canvas id="tl"></canvas>`)}</div></div>`;
  let lastKey = '';
  const draw = () => {
    const t = SIM.t; const key = D.scn+D.fw+D.pal+D.host+D.std+D.emb+D.hostPer+D.dolby+D.events.length+valAt('pod',t)+valAt('sel',t);
    if (key !== lastKey){ lastKey = key; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m); }
    const bd = m.querySelector('#bd'); bd.innerHTML = boardSVG(t, {max:640}); bindBoard(bd); m.querySelector('#pi').innerHTML = partInfo(D.selPart);
    m.querySelector('#tr').innerHTML = traceHTML();
    m.querySelector('#ls').innerHTML = LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}">${l.title}${!l.auto&&l.check()?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li => li.onclick = () => { lessonIdx = +li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="pv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="so">Start over</button></div>`;
    m.querySelector('#pv').onclick = () => { lessonIdx = Math.max(0, lessonIdx-1); draw(); };
    m.querySelector('#nx').onclick = () => { lessonIdx = Math.min(LESSONS.length-1, lessonIdx+1); draw(); };
    m.querySelector('#so').onclick = () => { lessonIdx = 0; A.scenario('pod'); };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter(l => /INPUT1|RESET|addr0|main loop|DELAY|I2C|RS-485|tallies|CD1|P5|Composite/.test(l.label)), {labelW:190, range:[0,1]});
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__demux2Active = false;
  m.innerHTML = `${card('One second, broken down', `<div id="lad"></div>`)}
    <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}${card('As seen by the displays and the host', `<div id="disp"></div><canvas id="cv"></canvas><p class="small muted">Composite line under the playhead as the EL2280 drives it into 75 Ω (assumed 75 % colour-bar source, ${inf}).</p>`)}</div>
    ${card('Zoom ladder at the playhead: second → field → line → HANC → packet → PIC pass', `<canvas id="zl"></canvas>`)}
    ${card('The line under the playhead (10-bit words from the CLC011)', `<canvas id="ln"></canvas><div id="lni" class="small"></div>`)}`;
  const draw = () => {
    const t = SIM.t, E = emulate(), S0 = STD[D.std], P = E.P, B = E.B;
    let passes = 0, cyc = 0, i2cN = 0, rxN = 0, txN = 0, dl = 0;
    for (let i = 0; i < P.n; i++) if (P.t0[i] >= 0 && P.t0[i] < 1){ passes++; cyc += P.cyc[i]; }
    for (const x of E.i2c) if (x.t0 >= 0 && x.t0 < 1) i2cN++;
    for (const x of E.rx) if (x.t0 >= 0 && x.t0 < 1) rxN++;
    for (const x of E.tx) if (x.t0 >= 0 && x.t0 < 1) txN++;
    for (const d of E.delays) dl += Math.max(0, Math.min(1, d[1]) - Math.max(0, d[0]));
    const lps = 1/S0.H, emb = D.emb.filter(Boolean).length;
    const rows = [
      ['SDI frames / fields', `${(1/S0.frame).toFixed(3)} / ${(1/S0.field).toFixed(3)}`, SIM.fmtDur(S0.field), S0.name],
      ['SDI lines', lps.toFixed(1), SIM.fmtDur(S0.H), `${S0.lines} per frame: EAV, ${S0.hanc} HANC words, SAV, 1440 active words`],
      ['SDI words (10-bit, CLC011 PCLK)', '27,000,000', SIM.fmtDur(WORD_T), '270 Mb/s ÷ 10'],
      ['HANC audio data packets', `≈${Math.round(lps*emb*(1-S0.sw.length/S0.lines)).toLocaleString()}`, '', `one per embedded group per line (${emb} group${emb!==1?'s':''}), ${(AES_FS*S0.H).toFixed(3)} samples per line on average`],
      ['Audio samples per channel', '48,000', SIM.fmtDur(1/AES_FS), 'GS9023 ACLK = PLL1700E ÷ 2 (74HC74)'],
      ['AES blocks on P5', '250', '4 ms', '192 frames, Z preamble'],
      ['PIC instruction cycles', XTAL/4 + '', SIM.fmtDur(TCY), '4.9152 MHz ÷ 4'],
      ['MAIN passes (this second)', passes.toLocaleString(), passes? SIM.fmtDur(cyc*TCY/passes) : '', `${(cyc/Math.max(1,passes)).toFixed(0)} cycles average; ≈202 when idle`],
      ['GS9023 register writes / reads', `${(passes*4).toLocaleString()} / ${(passes*2).toLocaleString()}`, '', 'refreshgs9023 addr0/3/4/6 · readgs9023 addr0 twice — every pass'],
      ['I2C writes to the ADV7171', `${i2cN} (${(i2cN*27).toLocaleString()} bits)`, SIM.fmtDur(WR_CYC*TCY), `${SIM.fmtDur(I2C_BIT*TCY)} per bit ≈ ${(1/(I2C_BIT*TCY)/1000).toFixed(1)} kHz SCL · ${B.i2c==='loop'?'endless loop (v1.04+)':'12 writes then I2C,7 stops it'}`],
      ['Time inside DELAY', SIM.fmtDur(dl), SIM.fmtDur(DELAY_CYC*TCY), 'after every SDI re-lock'],
      ['RS-485 bytes in / out', `${rxN} / ${txN}`, SIM.fmtDur(UART_BYTE), 'USART 9600 8N1, SPBRG = 7'],
      ['Composite lines / colour subcarrier', `${lps.toFixed(1)} / ${(STD[D.std].fsc/1e6).toFixed(6)} MHz`, '', 'ADV7171 Fsc register = Fsc/27 MHz × 2³²'],
    ];
    m.querySelector('#lad').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Step units in the transport: field, line, MAIN pass, I2C write, I2C bit, UART byte, AES block, sample, SDI word.</p>`;
    const li = lineInfo(t), pk = hancLayout(li.n), here = pk.find(q => li.w >= q.a && li.w < q.b);
    const p = passAt(t), x = i2cAt(t), enc = encoderAt(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>SDI</th><td class="mono small">${cableIn(t)?`line ${li.ln} · word ${li.w} ${li.w<4?'· <b>EAV</b>':li.w<4+S0.hanc?'· HANC':li.w<8+S0.hanc?'· <b>SAV</b>':'· active video'}${here?` · inside the ${here.kind} packet of group ${here.g}`:''}`:'no cable'}</td></tr>
      <tr><th>GS9023</th><td class="mono small">${gsReset(t)?'in reset (RC5 low)':`DID group ${gsGroup(t)||'—'} · addr0 bit5 ${videoLock(t)?1:0} · bit3 ${audioLock(t)?1:0}`}</td></tr>
      <tr><th>PIC</th><td class="mono small">${!powerAt(t)?'off':inBoot(t)?'PWRT / INIT':inDelay(t)?'DELAY loop':p?RT[stepOf(p,t)]+' (pass #'+p.i+', cycle '+Math.floor((t-p.t0)/TCY)+')':'—'}</td></tr>
      <tr><th>I2C</th><td class="mono small">${x?`[0x54] subaddress ${x.sub} ← 0x${hex(x.val)} ${x.ack?'ACK':'NACK (encoder in reset)'}`:'idle'}</td></tr>
      <tr><th>ADV7171</th><td class="small">${enc.txt}</td></tr></table>`;
    const pe = powerAt(t) ? histAt('pe', t, 0) : 0, r = hostReplyAt(t), lamp = (on, c, l) => `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 10px 2px 0"><span style="width:16px;height:16px;border-radius:50%;background:${on?c:'var(--led-off)'};box-shadow:${on?'0 0 8px '+c:'none'}"></span>${l}</span>`;
    m.querySelector('#disp').innerHTML = `<div>${lamp(powerAt(t)&&!histAt('rb5',t,1),'#ff3b2f','CD1 (board)')}${D.host==='pod'?lamp(pe&(B.pins==='old'?2:1),'#4dff5a','POD19 AES tally (P4-5)')+lamp(pe&(B.pins==='old'?4:2),'#4dff5a','POD19 SDI tally (P4-4)'):''}</div>
      ${D.host==='uart'?`<p class="small">Host's last reply: ${r?`<b class="mono">0x${hex(r.b)}</b> at ${SIM.fmtT(r.t0)} — ${r.b&1?'no audio lock':'audio locked'}, ${r.b&2?'no video lock':'video locked'}${(r.b&0xE0)===0xE0?', 111 = "demux fitted" bits from sdi_check':''}`:'none yet'}</p>`:''}
      <p class="small">P5: ${p5Stream(t)?`group ${p5Stream(t)} AES (ch1/2 and ch3/4)`:'silent'} · OUT1/OUT2: ${enc.state}</p>`;
    drawCvbs(m.querySelector('#cv'), t);
    drawLadder(m.querySelector('#zl'), t);
    drawLine(m.querySelector('#ln'), m.querySelector('#lni'), t);
  };
  SIM.on('time', draw);
}
function drawCvbs(cv, t){
  const {c, w} = SIM.canvas(cv, 150), S0 = STD[D.std], enc = encoderAt(t);
  c.fillStyle = SIM.css('--lane'); c.fillRect(0, 0, w, 150);
  const IRE = v => 120 - (v + 40) * 0.75, x = u => 10 + u/S0.H * (w-20);
  c.strokeStyle = SIM.css('--grid'); [0, 100].forEach(v => { c.beginPath(); c.moveTo(10, IRE(v)); c.lineTo(w-10, IRE(v)); c.stroke(); });
  c.strokeStyle = enc.state==='ok' ? SIM.css('--accent') : SIM.css('--warn'); c.lineWidth = 1.2; c.beginPath();
  const bars = [75,67,53,44,31,22,9,7.5], act0 = 10.7e-6, act1 = S0.H - 1.5e-6;
  for (let k = 0; k <= 900; k++){ const u = k/900*S0.H; let v = 0;
    if (enc.state==='reset' || enc.state==='off' || enc.state==='nosig') v = 0;
    else if (u < 4.7e-6) v = -40;
    else if (u > 5.3e-6 && u < 7.8e-6 && enc.state==='ok') v = 20*Math.sin(2*Math.PI*S0.fsc*u);
    else if (u > act0 && u < act1){ const b = Math.min(7, Math.floor((u-act0)/(act1-act0)*8)); v = bars[b] + (enc.state==='ok' && b < 7 ? 25*Math.sin(2*Math.PI*S0.fsc*u + b) : 0); }
    const X = x(u); if (!k) c.moveTo(X, IRE(v)); else c.lineTo(X, IRE(v)); }
  c.stroke(); c.fillStyle = SIM.css('--ink'); c.font = '11px '+SIM.css('--mono');
  c.fillText(`${enc.state==='ok'?enc.std+' line':enc.state} · 0 / 100 IRE grid`, 12, 14);
}
function drawLadder(cv, t){
  const S0 = STD[D.std], li = lineInfo(t), p = passAt(t);
  const pk = hancLayout(li.n), first = pk[0];
  const levels = [['1 second', 0, 1], ['1 field', Math.floor(t/S0.field)*S0.field, S0.field], ['1 line', li.n*S0.H, S0.H], ['HANC', li.n*S0.H, (4+S0.hanc)*WORD_T]];
  if (first) levels.push([`G${first.g} audio packet`, li.n*S0.H + first.a*WORD_T, (first.b-first.a)*WORD_T]);
  if (p) levels.push(['MAIN pass', p.t0, p.cyc*TCY]);
  const H = levels.length*40 + 10, {c, w} = SIM.canvas(cv, H), x0 = 150, pw = w - x0 - 10, ink = SIM.css('--ink');
  levels.forEach(([nm, a, span], k) => {
    const y = 8 + k*40; c.fillStyle = ink; c.font = '12px sans-serif'; c.fillText(nm, 6, y+14); c.fillStyle = SIM.css('--ink2'); c.font = '10px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+28);
    c.fillStyle = SIM.css('--lane'); c.fillRect(x0, y, pw, 30); const X = tt => x0 + (tt - a)/span*pw;
    if (k === 2 || k === 3){ const L0 = li.n*S0.H; const seg = (w0, w1, col) => { c.fillStyle = col; c.fillRect(X(L0+w0*WORD_T), y+3, Math.max(1, X(L0+w1*WORD_T)-X(L0+w0*WORD_T)), 24); };
      seg(0, 4, SIM.css('--bad')); seg(4+S0.hanc, 8+S0.hanc, SIM.css('--bad')); if (k === 2){ c.globalAlpha = .25; seg(8+S0.hanc, S0.words, SIM.css('--accent2')); c.globalAlpha = 1; }
      for (const q of pk){ c.globalAlpha = .85; seg(q.a, q.b, SIM.css(GCOL[q.g-1])); c.globalAlpha = 1; } }
    else if (k === 4 && first){ const n = first.b - first.a; for (let j = 0; j < n; j++){ c.fillStyle = SIM.css(j < 6 ? '--ink2' : j === n-1 ? '--bad' : GCOL[first.g-1]); c.fillRect(x0 + j/n*pw, y+3, Math.max(1, pw/n-1), 24); } }
    else if (k === 5 && p){ let tt = p.t0; for (let r = 0; r < NR; r++){ const d = p.rc[r]*TCY; if (!d) continue; c.fillStyle = SIM.css(ROUT_COL[r]); c.globalAlpha = .6; c.fillRect(X(tt), y+3, Math.max(1, X(tt+d)-X(tt)-1), 24); c.globalAlpha = 1; if (X(tt+d)-X(tt) > 50){ c.fillStyle = ink; c.font = '10px sans-serif'; txtFit(c, RT[r], X(tt)+2, y+19, X(tt+d)-X(tt)); } tt += d; } }
    else { c.fillStyle = SIM.css('--accent2'); c.globalAlpha = .3; c.fillRect(x0, y+3, pw, 24); c.globalAlpha = 1; }
    const px = Math.max(x0, Math.min(x0+pw, X(t))); c.strokeStyle = SIM.css('--play'); c.lineWidth = 2; c.beginPath(); c.moveTo(px, y-2); c.lineTo(px, y+32); c.stroke();
  });
}
function drawLine(cv, el, t){
  const S0 = STD[D.std], li = lineInfo(t), pk = hancLayout(li.n), g = gsGroup(t);
  const {c, w} = SIM.canvas(cv, 70), pw = w - 20, X = wd => 10 + wd/S0.words*pw;
  c.fillStyle = SIM.css('--lane'); c.fillRect(0, 0, w, 70);
  const seg = (a, b, col, l) => { c.fillStyle = col; c.fillRect(X(a), 14, Math.max(1, X(b)-X(a)), 30); if (l && X(b)-X(a) > 24){ c.fillStyle = '#fff'; c.font = '10px sans-serif'; txtFit(c, l, X(a)+2, 33, X(b)-X(a)); } };
  seg(0, 4, SIM.css('--bad'), 'EAV'); for (const q of pk) seg(q.a, q.b, SIM.css(GCOL[q.g-1]), (q.kind==='control'?'C':'G')+q.g);
  seg(4+S0.hanc, 8+S0.hanc, SIM.css('--bad'), 'SAV'); c.globalAlpha = .3; seg(8+S0.hanc, S0.words, SIM.css('--accent2')); c.globalAlpha = 1;
  c.fillStyle = SIM.css('--ink'); c.font = '11px sans-serif'; c.fillText(`line ${li.ln} — ${S0.words} words · active picture 1440 words (luma + chroma), its D2–D9 also go to the ADV7171`, 10 + X(8+S0.hanc) - 10, 60);
  c.strokeStyle = SIM.css('--play'); c.lineWidth = 2; c.beginPath(); c.moveTo(X(li.w), 8); c.lineTo(X(li.w), 50); c.stroke();
  const q = pk.find(p => p.g === g && p.kind === 'audio') || pk.find(p => p.kind === 'audio');
  if (!q || !cableIn(t)){ el.innerHTML = '<span class="muted">No audio packets on this line.</span>'; return; }
  const ap = audioPacket(q.g, li.n);
  el.innerHTML = `<p>Group ${q.g} audio data packet on this line (SMPTE 272M, ${ap.ns} samples × 4 channels, ${ap.w.length} words${q.g===g?', the one the GS9023 is extracting':''}):</p>
    <div class="mono" style="display:flex;flex-wrap:wrap;gap:3px">${ap.w.slice(0, 6+12*Math.min(2, ap.ns)).map((v,i)=>`<span class="chip" title="${ap.lbl[i]}">${ap.lbl[i]} ${hex(v,3)}</span>`).join('')}<span class="chip">…</span><span class="chip">CS ${hex(ap.w[ap.w.length-1],3)}</span></div>
    <p class="muted">DID ${hex(anc(AUD_DID[q.g]),3)} = 0x${hex(AUD_DID[q.g])} + even parity + /b8. The GS9023 matches the low nibble written in addr3 (0x${hex(A3[q.g])}); test tones ${TONE[q.g-1].join('/')} Hz at −20 dBFS are ${inf}.</p>`;
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  inp:{x:10,y:40,w:120,h:80,t:'INPUT1',s:['isolated BNC','75 Ω, L3'],d:'Shell not grounded: C51 1 µF to ground and R2/C2 into the CLC014 negative input.'},
  eq:{x:160,y:40,w:120,h:80,t:'CLC014',s:['cable EQ','U1'],d:'Adaptive equaliser for 270 Mb/s.'},
  rt:{x:310,y:40,w:140,h:80,t:'CLC016',s:['retimer · 4 rates','CD → RC2, RD → RB1/RB0'],d:'Re-clocks the stream; R17–R20 set the four rates. Its CD and rate-detect outputs are what SDI_SIGNAL_CHECK reads.'},
  drv:{x:310,y:150,w:140,h:60,t:'CLC007 → SDIOUT1',s:['re-clocked loop'],d:'Cable driver for the SDI loop-through.'},
  des:{x:480,y:40,w:140,h:80,t:'CLC011',s:['descramble · deserialise','D0–D9 · PCLK 27 MHz'],d:'10-bit parallel video to the GS9023 (all 10 bits) and to the ADV7171 (D2–D9).'},
  gs:{x:660,y:20,w:170,h:120,t:'GS9023',s:['audio demux','DID from addr3/addr4','lock bits in addr0','RESET = RC5'],d:'Finds the audio packets whose DID matches addr3 and outputs the four channels as two AES streams (pins 55/54) to P5.'},
  clk:{x:660,y:170,w:170,h:60,t:'PLL1700E + 74HC74',s:['PCLK → ÷2 → ACLK'],d:'Audio clock for the GS9023 derived from the 27 MHz video clock.'},
  p5:{x:870,y:40,w:110,h:70,t:'P5',s:['2 × AES to host'],d:'GS9023 pin 55 → P5-1, pin 54 → P5-2.'},
  enc:{x:480,y:260,w:150,h:80,t:'ADV7171',s:['video encoder','I2C 0x54 · RESET RC5'],d:'Re-codes the 8 MSBs of the 4:2:2 stream as NTSC or PAL composite. Programmed by the PIC over bit-banged I2C.'},
  amp:{x:660,y:260,w:170,h:80,t:'LC filter + EL2280',s:['×2 → OUT1','follower → OUT2'],d:'L5/L6/L7 + C71/C72/C74 reconstruction filter, R74 75 Ω, then the EL2280 dual amp with 75 Ω back-termination.'},
  pic:{x:160,y:250,w:270,h:120,t:'PIC16F874 @ 4.9152 MHz',s:['MAIN ≈ 202 cycles (165 µs)','GS9023 bus on PORTD/PORTA','I2C on RC3/RC4','USART 9600 on RC6/RC7'],d:'Reads CD/CLC016, writes the GS9023 on every pass, reads its lock bits, programs the ADV7171, talks to the host.'},
  host:{x:10,y:250,w:120,h:120,t:'Host',s:['P4: PODXX lines','P1: RS-485 (75176)','CD1 LED'],d:'POD19 reads the group code and tallies on P4; XTM4/AMS4/DMS1 talk 9600-baud RS-485 on P1.'},
  pwr:{x:10,y:400,w:420,h:50,t:'Power',s:['P3 → bridge → LM2596 +5 V · LM1117 3.3 V · 79L05 −5 V'],d:'Centre-tapped AC input (inferred) gives both rails.'},
};
const WIRES = [['inp','eq','SDI'],['eq','rt',''],['rt','des',''],['rt','drv',''],['des','gs','D0–D9'],['des','enc','D2–D9 + PCLK'],['des','clk','PCLK'],['clk','gs','ACLK'],['gs','p5','AES ×2'],['enc','amp','DAC'],['pic','gs','bus'],['pic','enc','I2C'],['rt','pic','CD/RD'],['host','pic','P4 / P1']];
function viewBlock(m){
  window.__demux2Active = false;
  m.innerHTML = `${card('Block diagram (click a block; dots show activity at the playhead)', `<div id="bdg" class="scroll"></div>`)}<div class="grid2">${card('Block', `<div id="bi"></div>`)}${card('Signal flow', `<p>SDI → equaliser → retimer → deserialiser. The 10-bit words go two ways: into the <b>GS9023</b>, which pulls out one audio group for the host, and (8 bits) into the <b>ADV7171</b>, which makes composite video. The PIC never touches the audio or the video — it only sets the GS9023 DID registers, reads two lock bits, and programs the encoder.</p>`)}</div>`;
  const draw = () => {
    const t = SIM.t, p = passAt(t);
    const live = {inp:cableIn(t), eq:cdAt(t), rt:clcLock(t), drv:clcLock(t), des:clcLock(t), gs:audioLock(t), clk:clcLock(t), p5:!!p5Stream(t), enc:encoderAt(t).state==='ok', amp:encoderAt(t).state==='ok', pic:powerAt(t)&&!inBoot(t), host:D.host!=='none', pwr:powerAt(t)};
    const ctr = b => [b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 1000 470" style="width:100%;min-width:720px"><defs><marker id="d2ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a, b, l]) => { const A_ = BLOCKS[a], B_ = BLOCKS[b]; let [x1, y1] = ctr(A_), [x2, y2] = ctr(B_);
      const clip = (bb, x, y, tx, ty) => { const dx = tx-x, dy = ty-y; const sx = dx ? (bb.w/2)/Math.abs(dx) : 1e9, sy = dy ? (bb.h/2)/Math.abs(dy) : 1e9; const k = Math.min(sx, sy); return [x+dx*k, y+dy*k]; };
      [x1, y1] = clip(A_, x1, y1, x2, y2); [x2, y2] = clip(B_, x2, y2, x1, y1); const hot = D.selBlock === a || D.selBlock === b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#d2ar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b = BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${D.selBlock===k?'var(--accent)':'var(--line)'}" stroke-width="${D.selBlock===k?2.5:1.2}"/>
        <circle cx="${b.x+b.w-11}" cy="${b.y+11}" r="5" fill="${live[k]?'var(--accent)':'var(--grid)'}"/><text x="${b.x+8}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>'; m.querySelector('#bdg').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g => g.onclick = () => { D.selBlock = g.dataset.b; draw(); });
    const b = BLOCKS[D.selBlock]; m.querySelector('#bi').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p><p class="small muted">${live[D.selBlock]?'Active':'Idle'} at the playhead${D.selBlock==='pic'&&p?' — running '+RT[stepOf(p,t)]:''}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from DEMUX-2ISS2.net) ---------------- */
function chip(x, y, w, name, left, right, sub){
  const n = Math.max(left.length, right.length), h = 26 + n*17;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p, i) => { const yy = y+21+i*17; s += `<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p, i) => { const yy = y+21+i*17; s += `<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const txt = (x, y, s, o) => `<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="${(o&&o.c)||'var(--ink)'}" ${o&&o.a?`text-anchor="${o.a}"`:''}>${s}</text>`;
const SHEETS = [
  {name:'1 · SDI front end', note:'Nets from DEMUX-2ISS2.net: NET00079 (INPUT1-3, L3), NET00001 (L3, R1, C1), NET00078 (shell: R1, R2, C51), NET00048/NET00009 (R3/R4 → U1-8/9), NET00016/17 (U1-14/13 → U2-6/5), CD (U2-19, U2-28 → U14-36), NET00118/119 (U2-21/20 → U14-8/9), NET00036/37/68/69 (U2-22…25 → U5, U6), NET00053/39/11 (U6-1 → R37, C29, L8, R31 → SDIOUT1-3).',
    svg:()=> chip(250,80,120,'U1 CLC014',[['IN+ 8','C1 · R3'],['IN− 9','R4 · C2']],[['OUT 14','→ U2-6'],['OUT 13','→ U2-5'],['AEC 6/7','C9 100p']],'cable equaliser')
      + chip(500,80,140,'U2 CLC016',[['IN 6',''],['IN 5',''],['R 13–18','']],[['CD 19/28','→ RC2'],['RD 20','→ RB1'],['RD 21','→ RB0'],['SDO 22–25','→ U5, U6']],'retimer, 4 rates')
      + chip(500,280,130,'U5 CLC011',[['SDI 5–8','U2']],[['D0–D9','→ U7, R32/R33'],['PCLK 16','→ U7, U11, R70']],'decoder / deserialiser')
      + chip(250,300,120,'U6 CLC007',[['IN 6/7','U2']],[['OUT 1','R37·C29·L8·R31']],'cable driver')
      + txt(20,250,'INPUT1-3 → L3 18 nH → C1 / R1 75R') + txt(20,268,'R1 other end = shell (NET00078)') + txt(20,286,'shell → C51 1 µF → GND; R2 → C2 → R4') + txt(250,390,'U6 OUT → SDIOUT1 BNC',{c:'var(--ink2)'}) + txt(20,440,'R17 2550R · R18 3480R · R19 5490R · R20 6810R from U2-13…17 to NET00022 (U2-18): the four rate settings.',{c:'var(--ink2)'})},
  {name:'2 · GS9023 and the PIC bus', note:'C0–C7 = U7-72…81 ↔ U14-38,39,40,41,2,3,4,5 (RD0–RD7); A0–A3 = U7-89…86 ↔ U14-19…22 (RA0–RA3); ~RE U7-83 ↔ U14-23 (RA4, R27 pull-up); ~WE U7-84 ↔ U14-24 (RA5); ~CS U7-85 ↔ U14-10 (RB2); RESET U7-18 + U10-22 ↔ U14-43 (RC5); ACLK U7-99 ← U13-9; PCLK U7-24; NET00047/52 U7-55/54 → P5-1/2.',
    svg:()=> chip(330,40,210,'U7 GS9023',[['D0–D9 16…6','CLC011'],['PCLK 24','27 MHz'],['ACLK 99','74HC74 Q2'],['RESET 18','RC5'],['A0–A3 89…86','RA0–RA3'],['~RE 83','RA4'],['~WE 84','RA5'],['~CS 85','RB2']],[['C0–C7 72…81','RD0–RD7'],['AES 55','P5-1'],['AES 54','P5-2']],'audio demultiplexer')
      + chip(330,300,210,'U11 PLL1700E + U13 74HC74',[['XT1 6','PCLK']],[['out 14 → CLK 11',''],['Q2 9','ACLK'],['/Q2 8 → D2 12','÷2']],'audio clock')
      + txt(20,450,'Register shadows in init43: addr0 = 0x81 / 0x85 (PAL bit 2) · addr3 = DID audio ext/group · addr4 = DID control · addr6 = 0x01 / 0x05 (bit 2 = Dolby E CRC).',{c:'var(--ink2)'})},
  {name:'3 · PIC16F874 I/O', note:'U14 pin → net from DEMUX-2ISS2.net, PIC16F874 44-pin TQFP pin-out. P4 lines: I/O1–I/O5 each have a 1K series resistor (R10, R8, R6, R12, R30) and a 3K3 pull-up (R9, R7, R5, R11, R28) at the connector. U4 75176: RO → RC7, DI ← RC6, DE+/RE ← RC1, A/B → P1-1/P1-2.',
    svg:()=> chip(360,30,190,'U14 PIC16F874',[['RB0 8','CLC016 RD (U2-21)'],['RB1 9','CLC016 RD (U2-20)'],['RB2 10','GS9023 ~CS'],['RB3 11','H4-6 PGM'],['RB5 15','R29 330R → CD1'],['RB6 16','H4-4 PGC'],['RB7 17','I/O1: P4-1, H4-2'],['MCLR 18','H4-3 (D7)'],['RC0 32','I/O2: P4-2'],['RE2 27','I/O3: P4-3'],['RE1 26','I/O4: P4-4'],['RE0 25','I/O5: P4-5']],[['RC1 35','75176 DE/~RE'],['RC2 36','CD'],['RC3 37','SCL (R81 10K, R41)'],['RC4 42','SDA (R80 10K, R40)'],['RC5 43','RESET'],['RC6 44','TX → 75176 DI'],['RC7 1','RX ← 75176 RO'],['OSC 30/31','X1 4.9152'],['RA0–RA5','GS9023 A0–A3, ~RE, ~WE'],['RD0–RD7','GS9023 C0–C7']],'4.9152 MHz')},
  {name:'4 · Video encoder and outputs', note:'U10 ADV7171: CLKIN 44 ← R70 ← PCLK; pixel inputs via R32 (D2–D5) and R33 (D6–D9); SCLOCK 23 ← R41 ← SCL; SDATA 24 ← R40 ← SDA; RESET 22. DAC 31 → L5 1µH → (C72 470p) → L6 2.7µH → (C71 330p, C73 DNI) → L7 0.68µH → (C74 56p, R74 75R) → R55 750R → U8-3. U8 EL2280: A gain 2 (R39/R56 750R), OUT A → R34 75R → OUT1; B follower (R52) → R53 75R → OUT2. R73 75R on U10-31, R77 150R on U10-34.',
    svg:()=> chip(160,40,180,'U10 ADV7171',[['P0–P7','D2–D9 (R32/R33)'],['CLKIN 44','PCLK (R70)'],['SCLOCK 23','SCL (R41)'],['SDATA 24','SDA (R40)'],['RESET 22','RC5']],[['DAC 31','L5 · R73'],['34','R77 150R'],['VREF 25','C69'],['COMP 33','C70']],'I2C write address 0x54')
      + chip(600,60,170,'U8 EL2280',[['+IN A 3','R55 ← filter'],['−IN A 2','R39 / R56'],['+IN B 5','= OUT A'],['−IN B 6','R52 ← OUT B']],[['OUT A 1','R34 75R → OUT1'],['OUT B 7','R53 75R → OUT2']],'dual video amp, ±5 V')
      + txt(160,300,'L5 1µH ─┬─ L6 2.7µH ─┬─ L7 0.68µH ─┬─ R55 750R → U8-3') + txt(160,318,'          C72 470p        C71 330p · C73 DNI     C74 56p · R74 75R',{c:'var(--ink2)'})
      + txt(160,360,'Gain: EL2280 A = 1 + 750/750 = 2 into a 75 Ω back-terminated line = unity at the far end.',{c:'var(--ink2)'})},
  {name:'5 · Power', note:'P3-2 → NET00020 (D1-A, D2-K); P3-3 → NET00019 (D3-A, D4-K); P3-1 GND. Positive: NET00000 (D1-K, D3-K, C3, REG1-1) → LM2596 → L1 → +5 V (D5 SK33). Negative: NET00116 (D2-A, D4-A, C39, C42) → REG3 79L05 → −5 V (U8-4). +5 V → REG2 LM1117-3.3 → 3V (GS9023, PLL1700E); +5 V → L4 1µH → VAA (ADV7171 analog).',
    svg:()=> txt(40,70,'P3-2 ─┬─ D1 → +raw ─ C3 220µ/35 ─ U REG1 LM2596 ─ L1 PE-53823 ─┬─ +5V (C10 220µ/35, D5 SK33)')
      + txt(40,100,'       └─ D2 ← −raw') + txt(40,130,'P3-3 ─┬─ D3 → +raw') + txt(40,160,'       └─ D4 ← −raw ─ C42 10/35 ─ REG3 79L05 ─ −5V → EL2280 V−')
      + txt(40,190,'P3-1 ─ GND (centre tap — '+'inferred'+')') + txt(40,240,'+5V ─ REG2 LM1117-3.3 ─ 3V → GS9023 (pins 1, 17, 26, 90), PLL1700E (16)')
      + txt(40,270,'+5V ─ L4 1.0µH ─ VAA → ADV7171 analog pins, EL2280 V+') + txt(40,320,'D7 4148 between +5 V and MCLR so ICSP VPP on H4-3 does not back-feed the rail.',{c:'var(--ink2)'})},
];
function viewSchem(m){
  window.__demux2Active = false;
  m.innerHTML = card('Schematic set — REDRAWN from DEMUX-2ISS2.net pin and net names (not the original P-CAD sheets)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small"></p>
    <p class="small muted">The original P-CAD 2002 schematic is <span class="mono">DEMUX-2 - #PCB/DEMUX-2ISS2.sch</span> (binary, Jul 29 2004). Its netlist (Nov 26 2003) and the ECO (D2–D5 swapped on R32) are what these sheets follow. Blue labels are net names or the other end of the net.</p>`);
  const draw = () => {
    m.querySelector('#st').innerHTML = SHEETS.map((s, k) => `<button class="${k===D.sheet?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#st button').forEach(b => b.onclick = () => { D.sheet = +b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 480" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="468" fill="none" stroke="var(--line)"/><text x="884" y="468" text-anchor="end" font-size="10" fill="var(--ink2)">DEMUX-2 ISS2 · redrawn · sheet ${D.sheet+1}/${SHEETS.length}</text>${SHEETS[D.sheet].svg()}</svg>`;
    m.querySelector('#sn').textContent = SHEETS[D.sheet].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__demux2Active = false;
  m.innerHTML = `<div class="grid2">${card('MAIN (2v105.asm) — the running call is highlighted', `<div id="mn"></div>`)}${card('I2C state machine (flags in RAM byte I2C)', `<div id="sm"></div>`)}</div>
    <div class="grid2">${card('ADV7171 register sequence (I2Csetup → dataN)', `<div id="adv"></div>`)}${card('GS9023 registers and the RS-485 protocol', `<div id="gs"></div>`)}</div>
    ${card('What changed from version to version (diffs of every folder)', `<div id="vt"></div>`)}`;
  const draw = () => {
    const t = SIM.t, p = passAt(t), B = build(), k = p ? stepOf(p, t) : -1, d = inDelay(t);
    m.querySelector('#mn').innerHTML = `<table class="kv">${RT.map((r, i) => { const off = (B.mode==='uartonly' && (i===5||i===7)); return `<tr class="${i===k?'hl':''}"><td class="mono">${off?';call ':i&&i<14?'call ':''}${r}${i===3&&d?' → <b>DELAY</b>':''}</td><td class="small">${p?p.rc[i]+' cyc':''}</td><td class="small muted">${[
      'kick the watchdog','one RCREG byte per pass; OERR → rxerror1 (clrf rxflags)','CD on RC2 → lock,0; CLC016 RB1=0, RB0=1 → lock,7; no CD → signal,1','RC5 = lock,7; tally RE1 = signal,0; after a loss: DELAY + restart I2C','UART command → addr3/addr4 (only if uart0 ≠ preuart0)','PODXX mode: group → addr3/addr4','4 writes: addr0, addr3, addr4, addr6','PODXX mode: RE2/RC0 → group','addr0 bit 3 → tx0,0 + RE0; bit 5 → signal,0','tx0,1 and RB5 (CD1); tx2,0 → tx2,5','RC1 on, TXREG = tx0; TRMT → RC1 off','next dataN when I2C,0 = 0','WRBYTE: START, 0x54, subaddress, data, STOP','I2C,7 clear → I2C,0 cleared = send the next','' ][i]}</td></tr>`; }).join('')}</table>
      <p class="small muted">Commented out of MAIN: <span class="mono">;call refreshoutputmux</span> (DEMUX-1's 74HC153 select — RC3/RC4 are now the I2C bus) and <span class="mono">;call eewrite</span>. ${B.mode==='uartonly'?'This #old/v105 build also comments out setgroup2 and readgroupselect.':''}</p>`;
    const i2 = p ? p.i2c : 0, bit = (n, l) => `<span class="chip" style="${(i2>>n)&1?'background:var(--accent);color:#fff':''}">I2C,${n} ${l}</span>`;
    m.querySelector('#sm').innerHTML = `<div>${bit(0,'refresh written')}${bit(1,'data ready / sent')}${bit(2,'ack handled')}${bit(3,'TX allow (BSTART)')}${bit(7,'no more')}</div>
      <svg viewBox="0 0 520 170" style="width:100%">${[['I2Csetup',20,'I2C,0 = 0 → dataN, address++'],['I2Ccommunications',190,'I2C,1 = 0 → WRBYTE (≈'+WR_CYC+' cyc)'],['I2Cacknowledgment',360,'I2C,2 = 0 → next unless I2C,7']].map(([n,x,l],i)=>`<rect x="${x}" y="20" width="150" height="54" rx="8" fill="${p&&k===11+i?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+75}" y="42" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${n}</text><text x="${x+75}" y="60" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${l}</text>`).join('')}
        <path d="M170 47h18M340 47h18" stroke="var(--ink2)" marker-end="url(#d2ar2)"/><path d="M435 74 v40 h-340 v-40" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="260" y="130" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${B.i2c==='loop'?'v1.04+: data12 does clrf address and I2C,7 is never set → this loop never ends':'data13 sets I2C,7 → the sequence stops after 12 writes'}</text>
        <text x="260" y="150" text-anchor="middle" font-size="10.5" fill="var(--ink2)">address now ${p?p.adr:'—'} · NACK is never checked (BITIN sets ADV7171,DI; nothing reads it)</text>
        <defs><marker id="d2ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs></svg>`;
    const regs = advRegsAt(t) || {}, x = i2cAt(t);
    m.querySelector('#adv').innerHTML = `<table class="kv"><tr><th>address</th><th>routine</th><th>sub</th><th>register (${inf} names)</th><th>value sent</th><th>in chip now</th></tr>${I2C_ORDER.map(([a, sub]) => { const never = B.i2c==='loop' && (sub===7||sub===8||sub===13);
      return `<tr class="${x&&x.sub===sub?'hl':''}"><td>${a}</td><td class="mono">data${sub}</td><td>${sub}</td><td class="small">${ADV_NAME[sub]}</td><td class="mono">0x${hex(B.adv[sub])}${never?' <span class="muted">never sent</span>':''}</td><td class="mono">${regs[sub]!==undefined?'0x'+hex(regs[sub]):'—'}</td></tr>`; }).join('')}</table>
      <p class="small">Subcarrier words: NTSC 0x21F07C16 → 0x21F07C16/2³² × 27 MHz = 3.579545 MHz · PAL 0x2A098ACB → 4.433619 MHz. Mode register 0 = 0x00 (NTSC) / 0x05 (PAL, bits 1:0 = 01). ${B.pal&&B.adv===ADV_NTSC?'<b>This PAL build still sends the NTSC values.</b>':''}</p>`;
    const a3 = p ? p.a3 : 0xEF;
    m.querySelector('#gs').innerHTML = `<table class="kv"><tr><th>GS9023</th><th>value</th><th>meaning (from the comments)</th></tr>
      <tr><td>addr0 (A=0000)</td><td class="mono">0x${hex(B.addr0)}</td><td class="small">bit 2: "Pal (bit 2=1), NTSC (bit 2=0)" · read: bit 3 audio lock, bit 5 video standard lock</td></tr>
      <tr><td>addr3 (0011)</td><td class="mono">0x${hex(a3)}</td><td class="small">"DID audio packet ext/group": group1 0xEF · group2 0xCD · group3 0xAB · group4 0x89</td></tr>
      <tr><td>addr4 (0100)</td><td class="mono">0x${hex(A4[A3G[a3]||1])}</td><td class="small">"DID control packet": 0x0F · 0x0E · 0x0D · 0x0C</td></tr>
      <tr><td>addr6 (0110)</td><td class="mono">0x${hex(B.addr6)}</td><td class="small">bit 2 low "disallows the gennum from changing the DOLBY E CRC" (v1.03)</td></tr>
      <tr><td>addr1</td><td class="mono">—</td><td class="small">per-channel lock → tx0 bits 2–5: code after <span class="mono">return</span> in readgs9023, never runs</td></tr></table>
      <h3>RS-485 (P1, 9600 8N1)</h3><table class="kv"><tr><th>byte</th><th>bits</th></tr>
      <tr><td>1 (address)</td><td class="mono small">1 1 1 · b4 select · b3 query · b2:b1 group−1 · b0 ignored</td></tr><tr><td>2 (data)</td><td class="mono small">0 x x x x x x x — only its arrival matters (sets rxflags,0)</td></tr>
      <tr><td>reply tx0</td><td class="mono small">111 after a query · b1 no video lock · b0 no audio lock</td></tr></table>`;
    m.querySelector('#vt').innerHTML = `<table class="kv"><tr><th>Build</th><th>Date</th><th>What the diff shows</th></tr>
      <tr><td>v1.00</td><td>Nov 21 2001</td><td class="small">eewrite called in MAIN and the EEPROM restore active in INIT; <span class="mono">incf address</span> without ,f → MPASM Message[305] in DEMUX-~1.ERR.</td></tr>
      <tr><td>v1.01</td><td>Feb 12 2002</td><td class="small">eewrite and the restore switched off (<span class="mono">goto nomatch</span>); reply delayed by comout0/comout1 (10 passes) "because the AMS-4 … needs time to shut off the transmitter". Group read from RC0/RB7 (DEMUX-1 wiring); tallies on RE1 (AES) and RE2 (lock,7).</td></tr>
      <tr><td>v1.02 / 1.02B</td><td>May 8 / Aug 7 2002</td><td class="small">"Fixed … to work properly with the PODXX": group read from RE2/RC0, tallies RE0 (AES), RE1 (video lock); TRISE 0xE4; comout delay commented out. B: addr0 bit 2 = PAL — but the ADV7171 data stays NTSC.</td></tr>
      <tr><td>v1.03 / 1.03B</td><td>(2003-10-30) / Oct 30 2003</td><td class="small">NTSC init43: addr6 0x05 → 0x01 (Dolby E). The B init43 keeps 0x05.</td></tr>
      <tr><td>v1.04 / 1.04B</td><td>Aug 3 2004</td><td class="small">"The video DAC software has to be changed": PAL ADV7171 values in B; <span class="mono">clrf address</span> in data12 → endless re-programming loop.</td></tr>
      <tr><td>#old/v105</td><td>Dec 17 2007</td><td class="small">Built from v1.03 (header has no 1.04/1.05 entries): setgroup2 and readgroupselect commented out of MAIN; readgs9023 drives signal,0 from bit 3 (audio) instead of bit 5. NTSC values although the listing calls DEMUX2V105(B) a PAL build for XTM4.</td></tr>
      <tr><td>v1.05 / 1.05B</td><td>Jul 17 2009</td><td class="small">"more strict on when to use the uart data": <span class="mono">uart_mode</span> set by scanuart, never cleared; setgroup2/readgroupselect test it instead of rxflags,7; bsf press_flag,2 re-enabled (still unused).</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__demux2Active = false;
  const F = [
    ['Two different programs are both "v1.05"', '<span class="mono">#old/v105/2v105.asm</span> (Dec 17 2007) matches the software listing "DEMUX2V105(B) … FIXED COMMUNICATION ISSUE 2007-12-18": it is v1.03 with <span class="mono">;call setgroup2</span> and <span class="mono">;call readgroupselect</span> commented out. <span class="mono">#v105/2v105.asm</span> (Jul 17 2009) is v1.04 plus a <span class="mono">uart_mode</span> flag. Its header says "JULY 17, 2009" while the listing has no 2009 entry.'],
    ['The communication bug v1.05 fixed (reconstructed)', 'In v1.01–v1.04 UART mode is just <span class="mono">rxflags,7</span>, and <span class="mono">rxerror1</span> (overrun) does <span class="mono">clrf rxflags</span>. For one pass the board reads P4; in an XTM4 nothing drives P4, so the 3K3 pull-ups give RE2 = RC0 = 1 → group = 8 → <span class="mono">setgroup2</span> writes the group-4 DID. The next host byte restores UART mode, but <span class="mono">setgroup1</span> returns early because uart0 = preuart0. The board stays on group 4 until the host picks a different source. The usual trigger is the 104 ms DELAY after an SDI re-lock: the 2-byte USART FIFO overflows whenever the host sends 3+ bytes in that time. (The host polling rate is '+inf+'.)'],
    ['v1.04 turned the ADV7171 set-up into an endless loop', 'v1.04 added <span class="mono">clrf address</span> to <span class="mono">data12</span>. I2Csetup then never reaches address 9–11 (data7, data8, data13), so <span class="mono">bsf I2C,7</span> in data13 never runs and <span class="mono">I2Cacknowledgment</span> keeps clearing I2C,0: registers 1–4 and 9–12 are rewritten forever, one per pass. Every MAIN pass becomes ≈'+(202+WR_CYC)+' cycles (≈1.2 ms) instead of ≈202 (165 µs). Registers 7, 8 and 13 keep their reset values. A likely reason ('+inf+'): the encoder recovers by itself after a reset that the firmware missed.'],
    ['I2C "no acknowledge" is never detected', '<span class="mono">BITIN</span> sets <span class="mono">ADV7171,DI</span> when SDA stays high on the 9th clock, but nothing tests DI, and error code 3 ("No acknowledgment from device") is never produced. While RC5 holds the ADV7171 in reset, the sequence "completes" into a deaf chip. That is why <span class="mono">ADV7171_RESET</span> restarts the sequence after each signal loss.'],
    ['I2C errors are reported on the UART TX pin', '<span class="mono">ERR0</span>…<span class="mono">ERR3</span> do <span class="mono">bsf PORTC,6</span>. RC6 is the USART TX pin (SPEN = 1), so the latch write has no visible effect. The older <span class="mono">;bsf PORTE,n</span> LED lines are commented out. ERCODE 4 ("SDA bus not released") has no handler.'],
    ['DELAY stops everything for 104 ms', '<span class="mono">ADV7171_RESET</span> calls <span class="mono">DELAY</span> (125 × 256 × 4 cycles ≈ '+SIM.fmtDur(DELAY_CYC*TCY)+') inside MAIN after every re-lock. No UART service (the USART can buffer only 2 bytes), no GS9023 refresh, no tallies. The watchdog is kicked inside the loop.'],
    ['A UART host gets group 4 until its first byte', 'From power-up until the first RS-485 byte, every version except #old/v105 runs readgroupselect on open P4 lines (pull-ups = 11) → group 4. The host\'s first selection overrides it.'],
    ['The Dolby E fix never reached the PAL builds', 'v1.03 cleared addr6 bit 2 ("disallows the gennum from changing the DOLBY E CRC") in the NTSC <span class="mono">init43.asm</span> only. Every B build (1.02B, 1.03B, 1.04B, 1.05B) still writes <span class="mono">addr6 = 0x05</span>.'],
    ['1.02B and 1.03B are only half PAL', 'They set GS9023 addr0 bit 2 = PAL, but data0…data13 still send the NTSC ADV7171 values (Mode 0 = 0x00, Fsc = 0x21F07C16 = 3.579545 MHz). The PAL values (0x05; 0x2A098ACB = 4.433619 MHz) first appear in 1.04B — the listing\'s "VIDEO DAC CHANGE TO ADV7171".'],
    ['The 2007 XTM4 build is NTSC although the listing says PAL', 'The listing row is "DEMUX-2 (B - PAL VERSION) FOR XTM4 · DEMUX2V105(B)". The archived <span class="mono">#old/v105</span> has addr0 = 0x81 and the NTSC encoder values, so the PAL 2007 build is not in the archive. It also drives signal,0 (CD1, tx0 bit 1) from addr0 bit 3 (audio) instead of bit 5 (video standard).'],
    ['The EEPROM is never used after v1.00', 'INIT jumps <span class="mono">goto nomatch</span> over the EEPROM restore ("first time detect" 0xAA at address 21); <span class="mono">;call eewrite</span> is commented out of MAIN. Yet setgroup1/setgroup2 still set <span class="mono">press_flag,2</span> ("store data to eeprom"), and v1.05 even re-enabled it in setgroup1. The board always starts on group 1 (then P4 or the host decides).'],
    ['Header comment and code disagree on the protocol', 'The scanuart comment says a1,a0 = 10 for SDI mode, 11 = spare. The code only accepts address bytes with bits 6 and 5 both set (0xE0–0xFF), i.e. the "spare" code. Bit 0 (s0) is ignored: s0/s1 → group 1, s2/s3 → group 2 … The comment block was copied from the AMS-4 analog/AES protocol (hp, term, level).'],
    ['The query reply bits are sticky', '<span class="mono">sdi_check</span> loads tx0 = 0xE0. Only bits 0 and 1 are ever changed afterwards, so once a host has asked, every later reply carries 111 in bits 7–5. A repeated query does nothing (uart0 = preuart0).'],
    ['readgs9023 reads the same register twice; per-channel lock is dead code', 'It reads GS9023 address 0 for bit 3, then reads address 0 again for bit 5. The block that reads address 1 into <span class="mono">lock</span> and maps bits 0–3 to tx0 bits 2–5 sits after <span class="mono">return</span>.'],
    ['DEMUX-1 leftovers', '<span class="mono">refreshoutputmux</span> (74HC153 OUTSEL on RC3/RC4 on DEMUX-1) is still in the source but commented out of MAIN: on DEMUX-2 RC3/RC4 are SCL/SDA, and it tests <span class="mono">porte,2</span>, now an input. <span class="mono">demux-2.asm</span> still starts with "; demux-1"; every main file still says "DEMUX-2 VERSION 1.00".'],
    ['Unused code', '<span class="mono">RDBYTE</span>/<span class="mono">RX</span> (I2C read) are never called; <span class="mono">txuart0</span> is unreachable ("tx1 not used"); comout0/comout1 are initialised but unused since v1.02. <span class="mono">demux2v2.asm</span> in the v1.02–v1.05 folders is not included by any main file: it is an alternative demux-2.asm with the v1.01 tally pins and the "only update if new source" return commented out.'],
    ['Read-modify-write is handled correctly', 'ADV7171_RESET does bsf/bcf PORTC,5 on every pass, which reloads the RC3/RC4 latches with the pulled-up pin levels. WRBYTE therefore starts with <span class="mono">movlw 11100111 · andwf PORTC,f</span> so that switching TRIS later drives SCL/SDA low, not high.'],
    ['RC5 resets the GS9023 too', 'The comment says "the reset pin of ADV7171", but net RESET also goes to U7-18 on the GS9023 ('+inf+': pin 18 is the GS9023 reset). Without CLC016 lock both chips are held in reset, so the GS9023 DID registers written while it is held are lost and rewritten by refreshgs9023 on the next passes.'],
    ['The v1.02 "change in board design"', 'v1.02 says the board change moved the PODXX pins. But DEMUX-2ISS1.net (Nov 2001) and ISS2 have identical P4 nets (I/O1–I/O5 on RB7, RC0, RE2, RE1, RE0). v1.01 read RC0/RB7 — the DEMUX-1 POD19 firmware\'s pins — so the change is probably between the DEMUX-1 and DEMUX-2 wiring, not between DEMUX-2 issues ('+inf+').'],
    ['Only 8 of 10 video bits reach the encoder', 'R32/R33 connect D2–D9 to the ADV7171 pixel port; D0/D1 go only to the GS9023. The Nov 26 2003 ECO re-ordered D2–D5 on R32.'],
    ['Isolated input shell', 'INPUT1\'s shell is not ground: R1 75 Ω terminates centre to shell, C51 1 µF AC-couples the shell to ground, and R2/C2/R4 feed the shell into the CLC014\'s negative input. The input is balanced against ground loops.'],
    ['Build details', 'Projects use MPASM <span class="mono">/c- /rDEC</span>: case-insensitive, which the code needs (MAIN/main, DELAY/delay, I2C/I2c, ADDRESS/address). No <span class="mono">__CONFIG</span> in any version: oscillator, watchdog and PWRT settings are not in the archive ('+inf+' here: HS, PWRT on). The .pjt "Fuses" section (4 MHz, WDT off) is a simulator setting.'],
  ];
  m.innerHTML = card('Findings — what the DEMUX-2 and its firmware are up to', `<ol>${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`)
    + card('How the DEMUX-2 differs from DEMUX-1 and DEMUX-3', `<table class="kv"><tr><th></th><th>DEMUX-1 (ISS2)</th><th>DEMUX-2 (ISS1 2001, ISS2 2003)</th><th>DEMUX-3</th></tr>
      <tr><td>Video front end</td><td>CLC014 · CLC016 · CLC011 · CLC007, SD only</td><td>same chain, SD only</td><td>SD/HD, Altera Cyclone EP1C6/EP1C12 does the demux</td></tr>
      <tr><td>Audio de-embedder</td><td>GS9023</td><td>GS9023</td><td>FPGA (VHDL), error flags for sample-count mismatch</td></tr>
      <tr><td>Controller</td><td>PIC16F874, 4.9152 MHz, MAIN with a 256 × 4-cycle rdelay1 wait</td><td>PIC16F874, 4.9152 MHz, no wait in MAIN (≈165 µs pass) except the 104 ms DELAY</td><td>ATmega128, C (ICCAVR), 4.9152 MHz</td></tr>
      <tr><td>Audio outputs</td><td>2 AES BNCs (75176 drivers + PE65612 transformers T2/T3), 74HC153 output mux on RC3/RC4 (OUTSEL0/1), AES input via T1/P2, P5 header</td><td><b>No AES BNCs</b>: only P5 to the host. RC3/RC4 reused as I2C</td><td>AES to the host</td></tr>
      <tr><td>Video output</td><td>none</td><td><b>ADV7171 composite encoder + EL2280 → OUT1/OUT2</b>, ±5 V from a bridge (79L05)</td><td>none (DEMUX-4 adds SDI out)</td></tr>
      <tr><td>Host link</td><td>P4 parallel (POD19) or RS-485, same I/O1–I/O5 pins</td><td>same pins and protocol, plus uart_mode in v1.05</td><td>RS-485 9600 baud, 0xE8/0xE0 style frames carried on into DEMUX-4</td></tr>
      <tr><td>PAL</td><td>B builds (addr0 bit 2)</td><td>B builds; encoder PAL only from 1.04B</td><td>auto</td></tr></table>
      <p class="small muted">DEMUX-1 facts from <span class="mono">DEMUX-1 - #PCB/DEMUX-1ISS2.bom</span>/<span class="mono">.net</span> and <span class="mono">demux-1v106.asm</span>; DEMUX-3 from its README (the DEMUX-1 and DEMUX-3 plugins are separate).</p>`)
    + card('Sources', `<p class="small">All in <span class="mono">#DEMUX #SERIES/XXX - DEMUX2 - #Master #OBSOLETE/</span>: software folders #v100…#v105b and #old/v105; DEMUX-2ISS2.net/.bom/.ECO/.pnp, OBSOLETE/DEMUX-2ISS1.net, WORKING/DEMUX-2ISS2PNP.pnp, DEMUX-2ISS2.pcb (binary, coordinates only); DEMUX-2 - #GERBERS/DEMUX-2ISS2.STN (rendered as <span class="mono">assets/demux2-paste-top.png</span>); software listing rows for DEMUX2V103/V104B/V105(B). There is no silkscreen artwork, no mechanical drawing and no photo of the DEMUX-2 in the archive; the board is drawn from the paste Gerber and placement data.</p>`);
}

/* ---------------- register ---------------- */
loadScenario('pod');
SIM.register({
  id:'demux2', name:'DEMUX-2 · SDI audio de-embedder with composite video out ('+Y(2001)+')', duration:1,
  product:'DEMUX-2', year:2001, family:'Obsolete products', folder:'#DEMUX #SERIES/XXX - DEMUX2 - #Master #OBSOLETE',
  summary:'Internal SD-SDI de-embedder board for POD19, XTM4, AMS4 and DMS1: a Gennum GS9023 pulls one audio group out of the HANC and hands it to the host on P5, while an ADV7171 re-codes the same SDI as composite video. A PIC16F874 sets the GS9023 DID registers, programs the encoder over bit-banged I2C and talks to the host over P4 lines or RS-485.',
  highlights:['Board drawn on the real ISS2 paste Gerber; INPUT1, P1, P3, P4 clickable','PIC main loop emulated pass by pass with counted cycles, I2C bits and USART FIFO','SDI fields → lines → HANC audio packets → words','Six firmware builds plus PAL B builds, diffed','The v1.04 overrun trap that v1.05 fixed, reproduced','22 findings incl. two different v1.05s and the half-PAL 1.03B'],
  depth:'Full model',
  stepUnits:[
    {label:'1 field', period:()=>STD[D.std].field},
    {label:'1 SDI line', period:()=>STD[D.std].H},
    {label:'1 MAIN pass (idle, 202 cyc)', period:()=>202*TCY},
    {label:'1 I2C write', period:()=>WR_CYC*TCY},
    {label:'1 I2C bit', period:()=>I2C_BIT*TCY},
    {label:'1 UART byte', period:()=>UART_BYTE},
    {label:'1 AES block', period:()=>BLOCK},
    {label:'1 audio sample', period:()=>1/AES_FS},
    {label:'1 SDI word', period:()=>WORD_T},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms (DELAY)'],[0.05,'50 ms'],[0.02,'20 ms (a field)'],[0.004,'4 ms (AES block)'],[0.0015,'1.5 ms (one I2C write)'],[0.0003,'300 µs (MAIN passes)'],[0.000064,'64 µs (one line)'],[0.000012,'12 µs (HANC)'],[0.000002,'2 µs (packet words)']],
  defaultZoom:0,
  init(){ dirty(); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: DEMUX-2 in its hosts', render:viewTutorial},
    {id:'second', label:'One second, line by line', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
