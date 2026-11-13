/* =====================================================================
   Obsolete misc — small PCBs from H:\misc (Ward-Beck Systems, 2005|38–2008|41) — hardware tour
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (folder "MISC/OBSOLETE Misc - #OBSOLETE #Archive"):
   - PCB/CS8412-14/cs8412-14.net, .ECO (P-CAD 2002, 13 Jul 2005)        -> CS8412 DIP-to-SOIC adapter
   - PCB/RS232-422/rs232-422.net (P-CAD 2002 ACCEL ASCII, 14 Jul 2005)   -> RS-232 ↔ RS-422 converter
   - PCB/wbs_io1/WBS-IO1.DSN (OrCAD) + GERBERS                             -> WBS I/O-1 (PIC16C73, ULN2803)
   - PCB/wbs_io2/wbs_io2.bom/.net/.pnp, MM554951-ASSY.pdf                -> WBS_IO2 (ATmega128L, 6 × 75176)
   - PCB/R257MISC*.pcb/.p01, NKK-PB*.pcb, GERBERS/R257.*                 -> R2K R257 turret boards
   - PCB/GERBERS/*.TOP/.BOT/.SLK -> assets/obsolete-misc-*.png (rendered with a small RS-274X script)
   - LOGO.dxf, WBS LOGO.dxf
   Cross-references used (read-only): #CUSTOM 55XXXX Systems/554951/ (554951 Project.doc,
   554951-3/Software/554951-3.c — the ATmega128 firmware for WBS_IO2, 554951-1/Software/554951-1.asm,
   554951-1 Turret.xls), #CONSOLES/RADIO/REN2K/R2KUSPG2.HTM (R257 price-list text).
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__obsMiscActive';

/* ---------------- the folder's items ---------------- */
const ITEMS = {
  io2:{ t:'WBS_IO2 = 554951-3 communication interface', yr:2005, img:'obsolete-misc-wbs-io2.png', dpi:120, size:[3.555,2.697],
    what:'ATmega128L at 4.9152 MHz with six 75176 RS-485 transceivers, a DB25, JTAG, three RXE050 polyfuses and a 78xx regulator. Its assembly drawing MM554951-ASSY.pdf, and the same CPU and crystal in 554951-3.c, tie it to job 554951: the “COMMUNICATION INTERFACE 554951-3” that links console #1, console #2 and the host turret.',
    parts:[['U1 ATmega128L',197,115],['U2 75176',115,21],['U3 75176',115,57],['U4 75176',115,91],['U5 75176',115,127],['U7 75176',115,163],['U6 75176',115,197],['X1 4.9152 MHz',230,169],['JTAG1',184,27],['P8 DB25RM',178,272],['P1',64,21],['P2',64,160],['P4',39,230],['P5',254,33],['P6',390,64]] },
  rs232:{ t:'RS232-422 converter', yr:2005, img:'obsolete-misc-rs232-422.png', dpi:120, size:[2.390,1.525],
    what:'DS14C232 RS-232 transceiver (U1), two 75176 RS-422/485 transceivers (U9, U10) with 75 Ω terminations R41/R42, DE9S connectors J1 and J2, 78L05 regulator and a PJ006 power jack.',
    parts:[['J1 DE9S (RS-232)',225,40],['J2 DE9S (RS-422)',60,150],['U1 DS14C232',181,54],['U9 75176',97,85],['U10 75176',136,127],['PWR1 PJ006',166,35],['REG1 78L05',95,40],['R41/R42 75R',70,160]] },
  cs8412:{ t:'CS8412-14 adapter', yr:2005, img:'obsolete-misc-cs8412-14.png', dpi:200, size:[0.950,1.700],
    what:'A 0.95 × 1.7 in carrier: DIP-28 pins (U1 footprint “CS8412”) on the outside, an SO-28 “CS8412SM” (U2) in the middle, wired pin-for-pin. It lets the surface-mount CS8412 or CS8414 drop into the DIP socket of older WBS AES cards.',
    parts:[] },
  io1:{ t:'WBS I/O-1', yr:2005, img:'obsolete-misc-wbs-io1.png', dpi:120, size:[2.392,2.950],
    what:'PIC16C73 with a ULN2803 eight-way open-collector driver, an LM7805, a fuse and a DB25 (OrCAD WBS-IO1.DSN). Silk “WBS I/O-1”. An earlier general-purpose I/O board.',
    parts:[['U1 PIC16C73',106,236],['U2 ULN2803',150,170],['P3 DB25',234,178],['F2 fuse',165,64],['R1–R12',50,60]] },
  r257:{ t:'R257 R2K turret boards', yr:2005, img:'obsolete-misc-r257.png', dpi:80, size:[8.4,10.65],
    what:'Gerber panel R257.*: the R257-1 main board (“RENAISSANCE SERIES R2K”, toroid T1, headset amplifier, DB25) and two NKK push-button boards (R257-2, R257-3 ISSUE1). R257MISC.pcb and NKK-PB.pcb are the P-CAD sources. R257 = “Standard Control Turret, 8 button monitor control, monitor level control, CH ON, CH OFF, TB controls, headset amplifier, jack and level control” (R2K price list, 1999).',
    parts:[['R257-3 buttons',212,79],['R257-2 buttons',266,212],['T1 toroid',104,536],['R257-1 main board',400,600]] },
  logo:{ t:'WBS logo DXFs', yr:2005, what:'LOGO.dxf and WBS LOGO.dxf (each with a “(1)” copy): 114 entities on one layer — the WBS badge used on every panel in this archive.' },
};
const ORDER = ['io2','rs232','cs8412','io1','r257','logo'];

/* ---------------- state ---------------- */
const D = { item:'io2', baud:9600, text:'WBS\r', dir:'232to422', term:true,
  c1:true, c2:true, tur:true, mod1:true, setup:false, page:0,
  grp:{host:false,g1:false,g2:false,g3:false}, tb:false, addr:[16,1,2,3], out:[0,0,0,0,0,0,0,0], pin:20, log:[] };
function reset(){ Object.assign(D,{item:'io2',baud:9600,text:'WBS\r',dir:'232to422',term:true,c1:true,c2:true,tur:true,mod1:true,setup:false,page:0,grp:{host:false,g1:false,g2:false,g3:false},tb:false,addr:[16,1,2,3],out:[0,0,0,0,0,0,0,0],pin:20}); SK=''; }

/* ---------------- UART timing ---------------- */
const BIT = ()=>1/D.baud, CHAR = ()=>10/D.baud;      // 8N1
function uartBits(byte){ const b=[0]; for(let i=0;i<8;i++) b.push((byte>>i)&1); b.push(1); return b; }
const RS_T0 = 0.1;
function rsLevel(t){ // TTL level of the serial stream (1 = mark/idle)
  const k=Math.floor((t-RS_T0)/CHAR()); if (t<RS_T0 || k>=D.text.length) return 1;
  const bits=uartBits(D.text.charCodeAt(k)), i=Math.floor((t-RS_T0-k*CHAR())/BIT()); return bits[Math.min(9,i)]; }

/* ---------------- 554951-3 MASTER_CONTROL schedule (from 554951-3.c comments) ---------------- */
const STEPS = [
 ['send','u0','R203 console 1 studio 1','R203_command_byte_studio1 (0x20)'],['read','u0','R203 console 1 studio 1','CONSOLE1_LED'],
 ['send','u1c','R203 console 2 studio 1','R203_command_byte_studio1'],['read','u1c','R203 console 2 studio 1','CONSOLE2_LED'],
 ['send','u0','R203 console 1 studio 2','R203_command_byte_studio2 (0x28)'],['read','u0','R203 console 1 studio 2','CONSOLE1_LED'],
 ['send','u1c','R203 console 2 studio 2','R203_command_byte_studio2'],['read','u1c','R203 console 2 studio 2','CONSOLE2_LED'],
 ['send','u0','R203 console 1 tb 1','R203_command_byte_tb1 (0x33)'],['read','u0','R203 console 1 tb 1','CONSOLE1_LED'],
 ['send','u1c','R203 console 2 tb 1','R203_command_byte_tb1'],['read','u1c','R203 console 2 tb 1','CONSOLE2_LED'],
 ['send','u0','R204 console 1 monitor','MONITOR_COMMAND'],['read','u0','R204 console 1 monitor','CONSOLE1_LED'],
 ['send','u1c','R204 console 2 monitor','MONITOR_COMMAND'],['read','u1c','R204 console 2 monitor','CONSOLE2_LED'],
 ['send','u0','R204 console 1 meter','METER_COMMAND'],['read','u0','R204 console 1 meter','CONSOLE1_LED'],
 ['send','u1c','R204 console 2 meter','METER_COMMAND'],['read','u1c','R204 console 2 meter','CONSOLE2_LED'],
];
for (const ch of [1,2,3,4]){ STEPS.push(['send','u1t',`turret ch${ch}`,'turret_address'],['read','u1t',`turret ch${ch}`,'TURRET_LED'],['send','u0',`console 1 input module ch${ch}`,'R201 CHON/MN/PGM'],['read','u0',`console 1 input module ch${ch}`,'CONSOLE1_LED'],['send','u1c',`console 2 input module ch${ch}`,'R201'],['read','u1c',`console 2 input module ch${ch}`,'CONSOLE2_LED']); }
const PASS = 30e-6;               // main-loop pass ≈ 30 µs at 4.9152 MHz (inferred from loop length)
const TIMEOUT = 300*PASS;         // COMMUNICATION_COUNTER 300 passes
const TURN = 0.5e-3;              // module turnaround before replying (inferred)
let SK='', SCHED=null;
function present(u, tgt){ if(u==='u0') return D.c1 && (tgt.includes('input module')? D.mod1 : true); if(u==='u1c') return D.c2; return D.tur; }
function schedule(){ const key=[D.c1,D.c2,D.tur,D.mod1].join('|'); if (key===SK) return SCHED; SK=key;
  const ev=[]; let t=1.2e-3*0, i=0, led={c1:0,c2:0,tur:0}; const leds=[];
  while (t<1){ const s=STEPS[i%STEPS.length]; const e={t0:t,s,i:i%STEPS.length};
    if (s[0]==='send'){ e.t1=t+2*10/9600+3*PASS; e.bytes=['9E', s[3].includes('0x')? s[3].match(/0x(..)/)[1] : '..']; }
    else { const ok=present(s[1],s[2]); e.ok=ok; e.t1= ok? t+TURN+2*10/9600 : t+TIMEOUT; e.bytes= ok? ['9E','cmd'] : [];
      const k = s[1]==='u0'?'c1': s[1]==='u1c'?'c2':'tur'; led[k]= ok?1:0; leds.push({t:e.t1,led:{...led}}); }
    ev.push(e); t=e.t1+PASS*2; i++; }
  SCHED={ev,leds}; return SCHED; }
function evAt(t){ const S=schedule().ev; let lo=0,hi=S.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(S[m].t0<=t) lo=m; else hi=m-1; } return S[lo]; }
function ledsAt(t){ let l={c1:0,c2:0,tur:0}; for(const x of schedule().leds){ if(x.t<=t) l=x.led; else break; } return l; }

/* ---------------- turret 554951-1 (from 554951-1.asm header and Turret.xls) ---------------- */
const GROUPS=['host','g1','g2','g3'], GNAME={host:'HOST',g1:'GUEST 1',g2:'GUEST 2',g3:'GUEST 3'};
const posOf = a=>a+1;                         // Turret.xls: address n → console position n+1

/* ---------------- CS8412 pins deduced from the nets ---------------- */
const PINNOTE = {7:'VD+ (C2 0.1 + C1/C3 10 µF to pin 8)',8:'DGND',20:'FILT → R1 1K → C5 0.047 µF → pin 22',21:'AGND',22:'VA+ (C3 0.1 + 10 µF to pin 21)'};

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  item(k){ act(`Open ${ITEMS[k].t}`, tr=>{ D.item=k; tr(ITEMS[k].what); }); },
  link(k){ act(`${D[k]?'Disconnect':'Connect'} ${k==='c1'?'console #1 (UART0)':k==='c2'?'console #2 (UART1, U4/U5)':k==='tur'?'host turret (UART1, U6/U7)':'console #1 R201 module'}`, tr=>{ D[k]=!D[k];
    tr(`Next read step for it ${D[k]?'gets 0x9E + command back; UART*_TRANSLATE sets synchronize_uart*':'times out: UART*_com_check counts COMMUNICATION_COUNTER = 300 passes, then timeout = YES'}`);
    tr(`MASTER_CONTROL ${k==='tur'?'TURRET_LED':k==='c2'?'CONSOLE2_LED':'CONSOLE1_LED'}_${D[k]?'ON':'OFF'} on PORTA ${k==='c1'||k==='mod1'?'bit 0':k==='c2'?'bit 1':'bit 2'}`);
    if(k==='mod1') tr('Project.doc: a console that talks but has a silent module makes its front LED flash — here the input-module read for console 1 times out while the R203/R204 reads still answer'); }); },
  baud(b){ act(`Baud ${b}`, tr=>{ D.baud=b; tr(`Bit ${SIM.fmtDur(1/b)}, 8N1 character ${SIM.fmtDur(10/b)}; “${D.text.replace('\r','\\r')}” takes ${SIM.fmtDur(D.text.length*10/b)}`); tr(b===9600?'Same rate as 554951-3.c: UBRR0L = UBRR1L = 0x1F at 4.9152 MHz → 4 915 200 / (16 × 32) = 9600':'(554951-3 uses 9600)'); }); },
  text(s){ act(`Send “${s.replace('\r','\\r')}”`, tr=>{ D.text=s||'U'; tr(`Bytes ${[...D.text].map(c=>c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')).join(' ')} at ${RS_T0*1000} ms`); }); },
  dir(){ act(`Direction ${D.dir==='232to422'?'422 → 232':'232 → 422'}`, tr=>{ D.dir=D.dir==='232to422'?'422to232':'232to422'; tr(D.dir==='232to422'?'J1 RS-232 in → U1 DS14C232 receiver → TTL → U9 75176 driver → J2 differential pair':'J2 pair → U10 75176 receiver → TTL → U1 DS14C232 driver → J1 RS-232'); }); },
  term(){ act(`R41/R42 ${D.term?'removed':'fitted'}`, tr=>{ D.term=!D.term; tr(D.term?'75 Ω across the receive pair: lines settle quickly, ≈1.6 V differential '+inf('75176 drive into 75 Ω'):'Unterminated: full ≈3.5 V swing but edges ring on long runs '+inf('')); }); },
  grp(g, on){ act(`Turret ${GNAME[g]} ${on?'ON':'OFF'}`, tr=>{ if(D.setup){ tr('Setup mode: the ON/OFF keys edit the address bits instead'); return; } D.grp[g]=on; const a=D.addr[GROUPS.indexOf(g)];
    tr(`554951-1.asm: ${GNAME[g]} → channel at address ${a} (console position ${posOf(a)}, Turret.xls) turned ${on?'on':'off'}`); tr(`554951-3 copies it to both consoles on the next “send data to console 1/2 input module” steps`); }); },
  tb(down){ act(`T/B ${down?'pressed':'released'}`, tr=>{ if(D.setup){ if(down){ D.page=(D.page+1)%4; tr(`Setup: T/B pages to ${GNAME[GROUPS[D.page]]} (host → guest1 → guest2 → guest3 → host)`);} return; }
    D.tb=down; tr(down? 'Talkback is momentary (“cough/tb mode is momentary”); host stays off during talkback (“host off during turret in talkback mode”)':'Talkback released'); }); },
  setup(){ act(`Setup switch ${D.setup?'in':'out'}`, tr=>{ D.setup=!D.setup; D.page=0; tr(D.setup?'Power-up with the setup switch out enters setup mode: the host address shows in binary on the keys (2⁴ … 2⁰), T/B lit':'Normal operation'); }); },
  abit(b){ act(`Toggle address bit 2^${b}`, tr=>{ const i=D.page; D.addr[i]^=(1<<b); tr(`${GNAME[GROUPS[i]]} address = ${D.addr[i]} (${D.addr[i].toString(2).padStart(5,'0')}) → console position ${posOf(D.addr[i])}; written to EEPROM by EERW.ASM ${inf('routine names')}`); }); },
  out(i){ act(`ULN2803 output ${i+1} ${D.out[i]?'off':'on'}`, tr=>{ D.out[i]^=1; tr(`PIC16C73 port bit → ULN2803 input ${i+1} → open-collector output sinks ${D.out[i]?'≈24 mA (24 V / 1 kΩ relay coil, inferred)':'nothing'} on the DB25 ${inf('pin map')}`); }); },
  pin(p){ act(`CS8412 pin ${p}`, tr=>{ D.pin=p; tr(`Net “${p}”: U1-${p} (DIP) ↔ U2-${p} (SO-28) — straight through`); if(PINNOTE[p]) tr(PINNOTE[p]); }); },
};

/* ---------------- drawings ---------------- */
function boardSVG(k){ const it=ITEMS[k]; if(!it.img) return logoSVG();
  const W=it.size[0]*it.dpi, H=it.size[1]*it.dpi; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:520px;background:#123d22;border-radius:6px"><image href="${ASSET}${it.img}" x="0" y="0" width="${W}" height="${H}"/>`;
  if (k==='cs8412'){ for(let p=1;p<=28;p++){ const left=p<=14, x=left?35:155, y=left? 39+(p-1)*20 : 39+(28-p)*20; const sel=D.pin===p;
      s+=`<g data-pin="${p}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="9" fill="${sel?'var(--accent2)':'transparent'}" fill-opacity=".6" stroke="${sel?'#fff':'transparent'}"/><text x="${left?x+12:x-12}" y="${y+4}" font-size="9" fill="#fff" text-anchor="${left?'start':'end'}">${p}</text></g>`;
      const sy=60+((p<=14?p-1:28-p))*16, sx=p<=14?72:118; if(sel) s+=`<line x1="${x}" y1="${y}" x2="${sx}" y2="${sy}" stroke="var(--accent2)" stroke-width="2"/><circle cx="${sx}" cy="${sy}" r="4" fill="var(--accent2)"/>`; } }
  for (const [n,x,y] of it.parts||[]) s+=`<g><circle cx="${x}" cy="${y}" r="${Math.max(4,W/90)}" fill="var(--warn)" fill-opacity=".8"/><text x="${x+6}" y="${y-5}" font-size="${Math.max(8,W/45)}" fill="#fff" stroke="#000" stroke-width=".3" paint-order="stroke">${n}</text></g>`;
  if (k==='io2'){ const l=ledsAt(SIM.t); [['COM1 console #1',l.c1],['COM2 console #2',l.c2],['COM3 host turret',l.tur]].forEach(([n,on],i)=>{ s+=`<circle cx="${300+i*40}" cy="300" r="9" fill="${on?'#46e36b':'#244'}" stroke="#000"/><text x="${300+i*40}" y="318" font-size="7" fill="#fff" text-anchor="middle">${n.split(' ')[0]}</text>`; }); }
  return s+`</svg><div class="small muted">${it.size[0].toFixed(3)} × ${it.size[1].toFixed(3)} in · rendered from GERBERS/${{io2:'WBS_IO2',rs232:'RS232-422',cs8412:'CS8412-14',io1:'WBS-IO1',r257:'R257'}[k]}.TOP/.BOT/.SLK (gold = top copper, blue = bottom, white = silk)${k==='io2'?' · the three green dots are the front-panel COM LEDs (PORTA 0–2), not on this board '+inf(''):''}</div>`; }
function logoSVG(){ return `<svg viewBox="0 0 300 90" style="width:100%;max-width:420px"><rect x="10" y="15" width="280" height="60" rx="14" fill="none" stroke="var(--ink)" stroke-width="5"/><text x="150" y="62" text-anchor="middle" font-size="42" font-weight="700" letter-spacing="6" fill="var(--ink)">WBS</text></svg><div class="small muted">Schematic stand-in for LOGO.dxf (114 entities, one layer).</div>`; }
function turretSVG(){ const S=56; let s=`<svg viewBox="0 0 ${8*S+20} ${2*S+60}" style="width:100%;max-width:560px;background:#2a2b2d;border-radius:6px">`;
  const top=['','','host','g1','g2','g3','',''], bot=['','','host','g1','g2','g3','tb',''];
  const addr=D.addr[D.page];
  const lit=(row,i,g)=>{ if(D.setup){ const bits=[4,3,2,1,0]; if(row===0&&i===2) return (addr>>4)&1; if(row===1&&i>=2&&i<=5) return (addr>>[3,2,1,0][i-2])&1; if(row===1&&i===6) return D.page===0; return 0; }
    if(!g) return 0; if(g==='tb') return D.tb; return row===0? D.grp[g] : !D.grp[g]; };
  [top,bot].forEach((r,row)=>r.forEach((g,i)=>{ const x=10+i*S, y=10+row*(S+10), on=lit(row,i,g);
    s+=`<g ${g?`data-t="${g}" data-row="${row}" data-i="${i}" style="cursor:pointer"`:''}><rect x="${x}" y="${y}" width="${S-8}" height="${S-8}" rx="6" fill="${on?(g==='tb'?'#ffb43a':row?'#e04a3a':'#46e36b'):g?'#555':'#3a3a3a'}" stroke="#111"/><text x="${x+(S-8)/2}" y="${y+(S-8)/2+4}" font-size="10" text-anchor="middle" fill="${on?'#000':'#ddd'}">${g? (g==='tb'?'T/B':(GNAME[g].replace('GUEST ','G')+(row?' OFF':' ON'))) : 'n/a'}</text></g>`; }));
  return s+`<text x="10" y="${2*S+45}" font-size="11" fill="#ddd">${D.setup?`SETUP — editing ${GNAME[GROUPS[D.page]]}: address ${addr} = ${addr.toString(2).padStart(5,'0')} (2⁴ on HOST ON, 2³…2⁰ on the OFF row)`:'554951-1 key layout from the 554951-1.asm header (8 × 2 NKK keys)'}</text></svg>`; }
function bindBoard(root){ root.querySelectorAll('[data-pin]').forEach(g=>g.onclick=()=>A.pin(+g.dataset.pin));
  root.querySelectorAll('[data-t]').forEach(g=>{ const t=g.dataset.t, row=+g.dataset.row, i=+g.dataset.i;
    g.onclick=()=>{ if(D.setup){ if(t==='tb') A.tb(true); else A.abit(row===0?4:[3,2,1,0][i-2]); return; } if(t==='tb') A.tb(!D.tb); else A.grp(t,row===0); }; }); }

/* ---------------- controls per item ---------------- */
function itemControls(){ const k=D.item;
  if (k==='io2') return `<div class="small" style="display:flex;gap:6px;flex-wrap:wrap">${[['c1','Console #1'],['c2','Console #2'],['tur','Host turret'],['mod1','Console 1 R201 module']].map(([x,l])=>`<button data-link="${x}" class="${D[x]?'on':''}">${l}: ${D[x]?'connected':'missing'}</button>`).join('')}</div>`;
  if (k==='rs232') return `<div class="small" style="display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center"><label>Baud <select id="bd">${[1200,2400,9600,19200,38400,115200].map(b=>`<option ${b===D.baud?'selected':''}>${b}</option>`).join('')}</select></label><label>Text <input id="tx" value="${D.text.replace('\r','')}" size="8"></label><button id="dr">${D.dir==='232to422'?'232 → 422':'422 → 232'}</button><button id="tm">R41/R42 ${D.term?'fitted':'removed'}</button></div>`;
  if (k==='io1') return `<div class="small" style="display:flex;gap:6px;flex-wrap:wrap">${D.out.map((o,i)=>`<button data-out="${i}" class="${o?'on':''}">OUT ${i+1}</button>`).join('')}</div>`;
  if (k==='r257') return `<div style="margin-top:8px">${turretSVG()}</div><div class="small" style="display:flex;gap:6px;margin-top:6px"><button id="su">Setup switch: ${D.setup?'OUT (setup)':'IN (run)'}</button></div>`;
  if (k==='cs8412') return `<p class="small">Click a DIP pin to follow its net to the SO-28. Pin ${D.pin}: ${PINNOTE[D.pin]||'signal pin, straight through'}.</p>`;
  return ''; }
function bindItem(m){ const q=s=>m.querySelector(s);
  m.querySelectorAll('[data-link]').forEach(b=>b.onclick=()=>A.link(b.dataset.link));
  m.querySelectorAll('[data-out]').forEach(b=>b.onclick=()=>A.out(+b.dataset.out));
  if(q('#bd')) q('#bd').onchange=e=>A.baud(+e.target.value);
  if(q('#tx')) q('#tx').onchange=e=>A.text(e.target.value+'\r');
  if(q('#dr')) q('#dr').onclick=()=>A.dir(); if(q('#tm')) q('#tm').onclick=()=>A.term(); if(q('#su')) q('#su').onclick=()=>A.setup();
  bindBoard(m); }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Pick an item, then use its controls or click the board.</div>'; }

/* ---------------- lanes ---------------- */
function lanesIO2(){ const css=SIM.css, S=schedule().ev;
  const evLane=(u,col)=>({label:u==='u0'?'UART0 → console #1':u==='u1c'?'UART1 → console #2 (U4/U5)':'UART1 → turret (U6/U7)',h:26,draw(c,X,t0,t1,y,h){ for(const e of S){ if(e.s[1]!==u||e.t1<t0||e.t0>t1) continue; c.fillStyle= e.s[0]==='send'? col : (e.ok? css('--accent'):css('--bad')); c.globalAlpha=e.s[0]==='send'?.9:.45; c.fillRect(X(e.t0),y+4,Math.max(1,X(e.t1)-X(e.t0)),h-8); c.globalAlpha=1; if(X(e.t1)-X(e.t0)>60){ c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(e.s[0]==='send'?'TX '+e.bytes.join(' '):(e.ok?'RX 9E cmd':'timeout'),X(e.t0)+3,y+h/2+4);} } }});
  return [ {label:'event_schedule step', h:24, draw(c,X,t0,t1,y,h){ for(const e of S){ if(e.t1<t0||e.t0>t1) continue; c.fillStyle= e.i%2? css('--grid'):css('--lane'); c.fillRect(X(e.t0),y+3,X(e.t1)-X(e.t0),h-6); c.strokeStyle=css('--ink2'); c.beginPath(); c.moveTo(X(e.t0),y+3); c.lineTo(X(e.t0),y+h-3); c.stroke(); if(X(e.t1)-X(e.t0)>26){ c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(String(e.i),X(e.t0)+2,y+h/2+4);} } }},
    evLane('u0',css('--accent2')), evLane('u1c',css('--accent2')), evLane('u1t',css('--warn')),
    {label:'COM LEDs (PORTA 0/1/2)', h:30, draw(c,X,t0,t1,y,h){ const L=schedule().leds; ['c1','c2','tur'].forEach((k,j)=>{ let prev={c1:0,c2:0,tur:0},pt=0; const seg=(a,b,on)=>{ if(on){ c.fillStyle='#3cc35e'; c.fillRect(X(Math.max(a,t0)),y+3+j*9,Math.max(0,X(Math.min(b,t1))-X(Math.max(a,t0))),7);} };
      for(const x of L){ seg(pt,x.t,prev[k]); prev=x.led; pt=x.t; } seg(pt,1,prev[k]); }); }},
  ]; }
function lanesRS(){ const css=SIM.css, T=t=>rsLevel(t), tx= D.dir==='232to422';
  const line=(f,col)=>(c,X,t0,t1,y,h)=>{ const n=Math.min(1600,Math.ceil(X(t1)-X(t0))); c.strokeStyle=col; c.beginPath(); for(let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n, v=f(t); i?c.lineTo(X(t),y+h/2-v*h*0.42):c.moveTo(X(t),y+h/2-v*h*0.42);} c.stroke(); };
  const diff = D.term? 1.6 : 3.5;
  return [ {label:`Characters (${D.baud} 8N1)`, h:22, draw(c,X,t0,t1,y,h){ for(let k=0;k<D.text.length;k++){ const a=RS_T0+k*CHAR(), b=a+CHAR(); if(b<t0||a>t1) continue; c.fillStyle=css('--accent2'); c.globalAlpha=.5; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)-1),h-8); c.globalAlpha=1; if(X(b)-X(a)>18){ c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(D.text[k]==='\r'?'\\r':D.text[k],X(a)+3,y+h/2+4);} } }},
    {label:`RS-232 on J1 (±7.5 V ${tx?'in':'out'})`, h:40, draw:line(t=>T(t)?-0.9:0.9, css('--warn'))},
    {label:'TTL between U1 and the 75176', h:30, draw:line(t=>T(t)?0.9:-0.9, css('--ink2'))},
    {label:`RS-422 A−B on J2 (±${diff.toFixed(1)} V)`, h:40, draw:line(t=>(T(t)?1:-1)*diff/3.5*0.9, css('--accent'))},
  ]; }
function lanesFor(){ return D.item==='rs232'? lanesRS() : lanesIO2(); }

/* ---------------- views ---------------- */
function tourHTML(){ return ORDER.map(k=>`<button data-item="${k}" class="${D.item===k?'on':''}" style="margin:2px">${ITEMS[k].t}</button>`).join(''); }
function inspHTML(t){ const k=D.item;
  if(k==='io2'){ const e=evAt(t), l=ledsAt(t); return `<table class="kv"><tr><th>event_schedule</th><td class="mono">${e.i} · ${e.s[0]} ${e.s[2]}</td></tr><tr><th>Bytes</th><td class="mono">${e.s[0]==='send'?'0x9E (address, bit 7 set) + '+e.s[3]:e.ok?'reply 0x9E + command (UART_TRANSLATE)':'none → timeout after 300 passes'}</td></tr><tr><th>console_turret_flag</th><td class="mono">${e.s[1]==='u1c'?(e.s[0]==='send'?'0 CONSOLE2 TX':'1 CONSOLE2 RX'):e.s[1]==='u1t'?(e.s[0]==='send'?'2 TURRET TX':'3 TURRET RX'):'— (UART0 is console 1 only)'}</td></tr><tr><th>LEDs</th><td class="mono">COM1 ${l.c1?'ON':'off'} · COM2 ${l.c2?'ON':'off'} · COM3 ${l.tur?'ON':'off'}</td></tr><tr><th>Cycle</th><td class="mono">${STEPS.length} steps · ${schedule().ev.filter(x=>x.i===0).length} full cycles this second</td></tr></table>`; }
  if(k==='rs232'){ const ci=Math.floor((t-RS_T0)/CHAR()); return `<table class="kv"><tr><th>Line at playhead</th><td class="mono">${rsLevel(t)?'MARK (idle/1)':'SPACE (0)'}</td></tr><tr><th>Character</th><td class="mono">${ci>=0&&ci<D.text.length?'#'+ci+' “'+(D.text[ci]==='\r'?'\\r':D.text[ci])+'” bit '+Math.floor((t-RS_T0-ci*CHAR())/BIT()):'idle'}</td></tr><tr><th>Bit time</th><td class="mono">${SIM.fmtDur(BIT())}</td></tr><tr><th>Path</th><td>${D.dir==='232to422'?'J1 → U1 → U9 → J2':'J2 → U10 → U1 → J1'}</td></tr></table>`; }
  if(k==='r257') return `<table class="kv"><tr><th>Groups</th><td class="mono">${GROUPS.map((g,i)=>`${GNAME[g]} ${D.grp[g]?'ON':'off'} @addr ${D.addr[i]} (pos ${posOf(D.addr[i])})`).join('<br>')}</td></tr><tr><th>T/B</th><td class="mono">${D.tb?'TALK':'—'}</td></tr></table>`;
  if(k==='io1') return `<table class="kv"><tr><th>ULN2803 outputs</th><td class="mono">${D.out.map((o,i)=>`${i+1}:${o?'ON':'·'}`).join(' ')}</td></tr></table>`;
  if(k==='cs8412') return `<table class="kv"><tr><th>Pin</th><td class="mono">U1-${D.pin} ↔ U2-${D.pin}</td></tr><tr><th>Function</th><td>${PINNOTE[D.pin]||'signal (name per CS8412 data sheet, not in archive)'}</td></tr></table>`;
  return '<p class="small muted">Nothing to simulate: a drawing file.</p>'; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML = card('Folder tour — pick an item', `<div id="tour"></div><p id="what" class="small"></p>`)
   + `<div class="grid2"><div>${card('The board (from its Gerbers)', `<div id="bv"></div><div id="ctl" style="margin-top:8px"></div>`)}</div>
      <div>${card('State at the playhead', `<div id="insp"></div>`)}${card('What changed (last action)', `<div id="trace" class="log"></div>`)}</div></div>`
   + card('Timeline — one second', `<canvas id="tl"></canvas><p class="small muted" id="tln"></p>`);
  SIM.on('time', ()=>{ const t=SIM.t;
    m.querySelector('#tour').innerHTML=tourHTML(); m.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>A.item(b.dataset.item));
    m.querySelector('#what').textContent=ITEMS[D.item].what+` (${SIM.year(ITEMS[D.item].yr)})`;
    m.querySelector('#bv').innerHTML=boardSVG(D.item); m.querySelector('#ctl').innerHTML=itemControls(); bindItem(m);
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanesFor(), {labelW:200});
    m.querySelector('#tln').innerHTML = D.item==='rs232'? 'RS-232 and RS-422 levels are typical for the DS14C232 / 75176 '+inf('data sheets not in archive')+'.' : '554951-3 polling: 9600 baud 8N1 (UBRR = 0x1F), two bytes per message, COMMUNICATION_COUNTER = 300 passes. Pass length ≈ 30 µs and module turnaround 0.5 ms are '+inf('')+'. Shown for every item except the RS-232 converter.'; });
}
const LESSONS = [
  { title:'1 · Open the communication interface', body:`<p>The biggest board here, WBS_IO2, is the 554951-3 “communication interface”: the master of a two-console radio system with one host turret. Open it from the tour.</p>`, check:()=>D.item==='io2', hint:'Click “WBS_IO2 = 554951-3 communication interface”.' },
  { title:'2 · Watch it poll', body:`<p>Zoom to <b>20 ms</b> and step through. MASTER_CONTROL walks ${STEPS.length} steps: send two bytes (0x9E + command) to a module, then read the reply. Console #1 is on UART0; console #2 and the turret share UART1 and take turns through the 75176 direction pins (CONSOLE_TURRET_TRANSMISSION_CONTROL).</p>`, check:()=>SIM.win<=0.02, hint:'Zoom window → 20 ms.' },
  { title:'3 · Unplug console #2', body:`<p>Disconnect console #2. Its reads time out (300 loop passes) and the COM2 LED goes out. The interface keeps serving console #1 and the turret, “while still checking if the missing product(s) have been re-connected” (Project.doc).</p>`, check:()=>!D.c2, hint:'Click “Console #2: connected”.' },
  { title:'4 · Use the host turret', body:`<p>Open <b>R257 R2K turret boards</b>. The custom 554951-1 turret has HOST and three GUEST groups with ON and OFF keys, plus T/B. Press <b>HOST ON</b>.</p>`, check:()=>D.item==='r257'&&D.grp.host, hint:'Open the R257 item, click HOST ON.' },
  { title:'5 · Re-address a guest', body:`<p>Flip the <b>setup switch</b>, press <b>T/B</b> to page to GUEST 1, and set its address bits. The address picks the console input position (Turret.xls: address n → position n + 1).</p>`, check:()=>D.setup&&D.page===1, hint:'Setup switch, then T/B once.' },
  { title:'6 · Send RS-232 over RS-422', body:`<p>Open the <b>RS232-422 converter</b> and set 9600 baud. Zoom to 1 ms and scrub across 100 ms: every RS-232 bit (inverted, ±V) becomes a differential pair bit on J2.</p>`, check:()=>D.item==='rs232'&&D.baud===9600&&SIM.win<=0.002, hint:'Open RS232-422, baud 9600, zoom 1 ms (pick “1 ms”).' },
  { title:'7 · Follow a CS8412 pin', body:`<p>Open the <b>CS8412-14 adapter</b> and click DIP pin <b>20</b>. FILT has its own loop filter on the carrier: R1 1K and C5 47 nF to pin 22.</p>`, check:()=>D.item==='cs8412'&&D.pin===20, hint:'Open CS8412-14, click pin 20 (right column).' },
  { title:'Done', body:`<p>That is the whole folder. The Findings tab lists the duplicates, the trial-licence P-CAD file and how WBS_IO2 was identified.</p>`, check:()=>true, auto:true },
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — touring the misc boards', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The item', `<div id="tour"></div><div id="bv"></div><div id="ctl" style="margin-top:8px"></div><div id="insp"></div>`)}${card('What changed', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw=()=>{ m.querySelector('#tour').innerHTML=tourHTML(); m.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>A.item(b.dataset.item));
    m.querySelector('#bv').innerHTML=boardSVG(D.item); m.querySelector('#ctl').innerHTML=itemControls(); bindItem(m); m.querySelector('#insp').innerHTML=inspHTML(SIM.t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{ li=+x.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.item='rs232'; D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){ window[KEY]=false;
  m.innerHTML = card('One second in slow motion — the 554951-3 polling cycle', `<canvas id="t1"></canvas>`) + card('…and the RS232-422 converter sending its text', `<canvas id="t2"></canvas>`)
   + card('Time scales', `<table class="kv small"><tr><th>9600 baud bit</th><td>${SIM.fmtDur(1/9600)} · character ${SIM.fmtDur(10/9600)} · message (2 bytes) ${SIM.fmtDur(20/9600)}</td></tr><tr><th>Read timeout</th><td>300 passes × ≈30 µs = ${SIM.fmtDur(TIMEOUT)} ${inf('pass length')}</td></tr><tr><th>Poll cycle</th><td>${STEPS.length} steps ≈ ${SIM.fmtDur(schedule().ev.find((e,i)=>i>0&&e.i===0)?.t0||1)} with everything connected</td></tr><tr><th>Watchdog</th><td>WDTCR = 0x08: ≈ 14 ms at 5 V (16K WDT cycles); WDR() called three times per pass</td></tr></table>`);
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#t1'), lanesIO2(), {labelW:200}); SIM.drawLanes(m.querySelector('#t2'), lanesRS(), {labelW:200}); });
}
const BLOCKS = {
  c1:{x:10,y:20,w:150,h:60,t:'Console #1',s:['R2K: R201 / R203 / R204','RS-485 bus'],d:'First R2K console of the 554951 system. UART0 of the interface talks to it on its own pair (U2/U3).'},
  c2:{x:10,y:110,w:150,h:60,t:'Console #2',s:['R2K: R201 / R203 / R204'],d:'Second console. Shares UART1 with the turret; U4/U5 direction pins (PORTE6/7, PORTF0/1) switch it in.'},
  if:{x:240,y:60,w:190,h:90,t:'554951-3 = WBS_IO2',s:['ATmega128L 4.9152 MHz','U2–U7 75176 ×6','COM1/2/3 LEDs (PORTA)'],d:'The master. Polls R203 (studio 1/2, TB), R204 (monitor, meter) and the R201 input modules on both consoles and mirrors the four turret channels. 554951-3.c, ICCAVR, 06/04/2005.'},
  tur:{x:500,y:20,w:170,h:60,t:'554951-1 host turret',s:['custom R257-1, PIC16F73','HOST + 3 GUEST, T/B'],d:'R257-1 turret with custom firmware 554951-1.asm (based on 550245-1 / 550512-1). Keys: HOST, GUEST 1–3 ON/OFF and T/B; setup mode edits each group’s console address.'},
  vol:{x:500,y:110,w:170,h:60,t:'554951-2 volume controller',s:['R203 VOLUME CONTROL'],d:'Named on FUNCTIONAL-554951.dwg (“VOLUME LEVEL CONTROLLER (554951-2)”). Not part of this folder.'},
  rs:{x:720,y:20,w:130,h:60,t:'RS232-422',s:['DS14C232 + 2 × 75176'],d:'Stand-alone converter from the same week (14 Jul 2005). Its role in a system is not documented.'},
  cs:{x:720,y:100,w:130,h:50,t:'CS8412-14',s:['DIP-28 ↔ SO-28'],d:'Spare-parts adapter for CS8412/CS8414 sockets.'},
  io1:{x:720,y:165,w:130,h:50,t:'WBS I/O-1',s:['PIC16C73 + ULN2803'],d:'Older GPIO board.'},
};
const WIRES=[['c1','if'],['c2','if'],['if','tur'],['tur','vol']];
let bsel='if';
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram — job 554951 and the other boards (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 230" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length), h=26+n*16; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y-12}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-1}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,nn],i)=>{ const yy=y+20+i*16; s+=`<line x1="${x-28}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text>${nn?`<text x="${x-31}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${nn}</text>`:''}`; });
  right.forEach(([p,nn],i)=>{ const yy=y+20+i*16; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+28}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text>${nn?`<text x="${x+w+31}" y="${yy+4}" font-size="10" fill="var(--accent2)">${nn}</text>`:''}`; }); return s; }
const T_=(x,y,t,s)=>`<text x="${x}" y="${y}" font-size="${s||11}" fill="var(--ink)">${t}</text>`;
const SHEETS=[
  {name:'1 · WBS_IO2 / 554951-3', note:'Port use from 554951-3.c (#defines and port_init); parts from wbs_io2.bom. Which 75176 pins go to which DB25 pins is not traced.', svg:()=>
    chip(320,40,190,'U1 ATmega128L',[['PE0/PE1','RXD0/TXD0'],['PF3','U2/U3 DE (UART0_TX_CONSOLE1)'],['PF2','U2/U3 /RE'],['PD2/PD3','RXD1/TXD1'],['PE6 / PF1','U4 DE / /RE'],['PE7 / PF0','U5 DE / /RE'],['PD6 / PD7','U6 DE / /RE'],['PD4 / PD5','U7 DE / /RE']],[['PA0','CONSOLE1_LED'],['PA1','CONSOLE2_LED'],['PA2','TURRET_LED'],['XTAL','X1 4.9152 MHz'],['JTAG','JTAG1'],['WDT','WDTCR 0x08']],'ICCAVR · 9600 8N1 on both UARTs')
    + T_(40,290,'U2–U7: 75176 (SO-8) ×6 · P8 DB25RM · P1/P2/P4 PAN500 · P5/P6 PAN900 · P3 PAN300 · F1–F3 RXE050 · REG1 78XXUP · RN1 1K SIP10 · 32 × 1K, 10K, 27p ×2')
    + T_(40,310,'console 1 = one full-duplex pair (U2/U3); console 2 (U4/U5) and turret (U6/U7) share UART1, switched by CONSOLE_TURRET_TRANSMISSION_CONTROL') },
  {name:'2 · RS232-422', note:'Part list from rs232-422.net (ACCEL ASCII). Net names are generic (NET000xx), so the pin wiring is the standard DS14C232/75176 hookup (inferred).', svg:()=>
    chip(120,60,160,'U1 DS14C232',[['R1IN','J1 TXD'],['T1OUT','J1 RXD'],['C1±/C2±','C43–C46 1.0']],[['R1OUT','→ U9 DI'],['T1IN','← U10 RO'],['VCC','+5 (REG1 78L05)']],'RS-232 driver/receiver')
    + chip(520,40,140,'U9 75176',[['DI','from U1'],['DE','+5 (always tx)']],[['A/B','J2 TX pair'],['','R41 75R']],'driver') + chip(520,170,140,'U10 75176',[['RO','to U1'],['/RE','GND']],[['A/B','J2 RX pair'],['','R42 75R']],'receiver')
    + T_(40,330,'J1, J2 DE9S · PWR1 PJ006 · C41/C42/C47/C48 0.1 · net names GNDD, +5') },
  {name:'3 · CS8412-14', note:'Exactly as cs8412-14.net plus the ECO file (after the ECO: C1, C3 deleted; C5→C1, C2→C3, C4→C2).', svg:()=>
    chip(140,30,150,'U1 DIP28 “CS8412”',[...Array(14)].map((_,i)=>[String(i+1),String(i+1)]),[...Array(14)].map((_,i)=>[String(28-i),String(28-i)]))
    + chip(560,30,150,'U2 SO28 “CS8412SM”',[...Array(14)].map((_,i)=>[String(i+1),String(i+1)]),[...Array(14)].map((_,i)=>[String(28-i),String(28-i)]))
    + T_(330,80,'every net n joins U1-n and U2-n')+T_(330,110,'7–8: C4 0.1 + C3 10/10 (VD+)')+T_(330,128,'21–22: C2 0.1 + C1 10/10 (VA+)')+T_(330,146,'20 → R1 1K → C5 0.047 → 22 (FILT)')+T_(330,175,'ECO: C1, C3 removed (tantalums)')+T_(330,193,'C5→C1, C2→C3, C4→C2') },
  {name:'4 · WBS I/O-1', note:'Part list from WBS-IO1.DSN (OrCAD). Connections are not readable from the binary DSN; the ULN2803 role is inferred.', svg:()=>
    chip(200,60,150,'PIC16C73',[['RB0–7','→ ULN2803 1–8'],['RC6/RC7','serial (inferred)'],['OSC','XTAL']],[['VDD','LM7805'],['MCLR','R'],['RA','R1–R13']],'')+chip(520,60,140,'ULN2803',[['1B–8B','from PIC']],[['1C–8C','P3 CON25'],['COM','+V via F2']],'8 Darlington sinks')+T_(60,300,'Page text: “PHASE3”, “RS81S”.') },
];
let si=0;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn from netlists, BOMs and firmware (not the original P-CAD/OrCAD)', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ si=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 360" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="352" text-anchor="end" font-size="10" fill="var(--ink2)">Obsolete misc · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
const LOOP=[['WDR(); SYNCHRONIZE_DATA_BETWEEN_UARTS()','synchronize_uart0/1 → update_master_control'],['MASTER_CONTROL()','event_schedule step: send or read'],['UART0_transmit_counter / _receive','console #1 bytes'],['UART0_TRANSLATE / _com_check','address (bit7) then command; timeout'],['UART1_transmit_counter / _receive','console #2 or turret'],['UART1_TRANSLATE / _com_check','same, plus UART1_TIMEOUT']];
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('554951-3 main() loop — box lit = what runs at the playhead', `<div id="lp"></div>`)}${card('CONSOLE_TURRET_TRANSMISSION_CONTROL (75176 direction pins)', `<div id="ct"></div>`)}</div>`
   + `<div class="grid2">${card('MASTER_CONTROL event_schedule (from the case comments)', `<div id="es" class="log" style="max-height:340px"></div>`)}${card('Message format', `<table class="kv small"><tr><th>Address byte</th><td class="mono">bit 7 = 1 · 0x9E for R203/R204 (uart*_address_byte)</td></tr><tr><th>Command byte</th><td class="mono">bit 7 = 0 · R203 studio1 0x20, studio2 0x28, tb 0x33; BIT5 = changed, BIT6 = valid</td></tr><tr><th>UART</th><td class="mono">UCSRnC 0x06 (8N1), UBRRn 0x1F → 9600 at 4.9152 MHz</td></tr><tr><th>Timeout</th><td class="mono">COMMUNICATION_COUNTER 300 (earlier tries 55000, 5000, 1000, 500, 200, 100 left commented out)</td></tr><tr><th>Transmit pacing</th><td class="mono">TRANSMIT_COUNTER 3 (75 commented out)</td></tr><tr><th>Turret (554951-1)</th><td>PIC16F73 MPASM (“;LIST P=16C73” commented out); setup mode, EERW.ASM EEPROM</td></tr></table>`)}</div>`;
  SIM.on('time', ()=>{ const e=evAt(SIM.t), k=e.s[0]==='send'? (e.s[1]==='u0'?2:4) : (e.s[1]==='u0'?3:5);
    m.querySelector('#lp').innerHTML=`<svg viewBox="0 0 520 ${LOOP.length*44+10}" style="width:100%">${LOOP.map((l,i)=>`<rect x="10" y="${8+i*44}" width="500" height="36" rx="6" fill="${i===k||i===1&&k>=2?'var(--accent)':'var(--panel2)'}" fill-opacity="${i===1&&k>=2?0.35:1}" stroke="var(--line)"/><text x="20" y="${24+i*44}" font-size="12" font-family="var(--mono)" fill="${i===k?'#fff':'var(--ink)'}">${l[0]}</text><text x="20" y="${38+i*44}" font-size="10" fill="${i===k?'#fff':'var(--ink2)'}">${l[1]}</text>`).join('')}</svg>`;
    const flag= e.s[1]==='u1c'? (e.s[0]==='send'?0:1) : e.s[1]==='u1t'? (e.s[0]==='send'?2:3) : -1;
    const rows=[['0 CONSOLE2 TX','U4 TX','U5 RX','U6 RX','U7 TX'],['1 CONSOLE2 RX','U4 TX','U5 RX','U6 TX','U7 TX'],['2 TURRET TX','U4 RX','U5 TX','U6 RX','U7 TX'],['3 TURRET RX','U4 TX','U5 TX','U6 RX','U7 TX']];
    m.querySelector('#ct').innerHTML=`<table class="kv small"><tr><th>flag</th><th>U4</th><th>U5</th><th>U6</th><th>U7</th></tr>${rows.map((r,i)=>`<tr class="${i===flag?'hl':''}">${r.map(c=>`<td class="mono">${c}</td>`).join('')}</tr>`).join('')}</table><p class="small muted">From the macros written in each case of the switch. Case 1 “CONSOLE2 RX” leaves U4 in TX — see Findings.</p>`;
    m.querySelector('#es').innerHTML=STEPS.map((s,i)=>`<div class="${i===e.i?'hl':''}"><b>${i}</b> ${s[0]} ${s[2]} <span class="muted">(${s[3]})</span></div>`).join(''); });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what this folder is up to', `<ol>
   <li><b>Everything is here twice.</b> Every file has a byte-identical “(1)” twin: <span class="mono">LOGO.dxf / LOGO(1).dxf</span>, <span class="mono">gerbers.zip / gerbers(1).zip</span>, all Gerbers, nets and PCBs. The (1) copies are safe to drop.</li>
   <li><b>WBS_IO2 is the 554951-3 communication interface.</b> The board has no name beyond “WBS_IO2”, but its folder holds MM554951-ASSY.pdf (also in 554951-3/ and the parent folder), and 554951-3.c targets an ATmega128 at 4.9152 MHz driving six RS-485 direction pins — the same CPU, crystal and six 75176s as wbs_io2.bom.</li>
   <li><b>A crystal typo.</b> 554951-3.c's header says “Crystal: 4.951 Mhz”; the BOM part is 4.9152 MHz, and the UBRR value 0x1F only gives exactly 9600 baud (“actual 9600 (0.0%)”) at 4.9152 MHz.</li>
   <li><b>A direction-pin oddity.</b> In CONSOLE_TURRET_TRANSMISSION_CONTROL, case 1 (“CONSOLE 2 RX”) writes UART1_TX_CONSOLE2_U4 and UART1_NOT_RX_CONSOLE2_U4 exactly as case 0 (“CONSOLE 2 TX”). Console 2's receive is therefore set the same as its transmit, and only the turret pins change. It worked because console 2's reply comes back through U5 ${inf('pairing of U4/U5')}.</li>
   <li><b>Tuned by trial.</b> COMMUNICATION_COUNTER has seven values commented out (55000 → 100) before settling on 300, and TRANSMIT_COUNTER 75 → 3: the timeout was found on the bench.</li>
   <li><b>A trial-licence file.</b> NKK-PB-2002.pcb's header reads “P-CAD 2004 TRIAL VERSION - 13 days left”. It has 140 components and 0 nets: a re-save, not a usable design. NKK-PB.pcb (P-CAD 2004 binary) is the real 13-key board.</li>
   <li><b>Two different WBS-IO1 Gerber sets.</b> GERBERS/WBS-IO1.TOP and wbs_io1/GERBERS/WBS-IO1.TOP differ (MD5 d6e7… vs 2663…). Nothing records which one was built.</li>
   <li><b>The CS8412 carrier was trimmed by ECO.</b> cs8412-14.ECO deletes the two 10 µF tantalums (C1, C3) and renumbers the rest, leaving 0.1 µF decoupling on each supply and the R1/C5 FILT network.</li>
   <li><b>RS-422 with 75 Ω.</b> R41/R42 on the RS232-422 board are 75 Ω, not the usual 100–120 Ω for twisted pair. It suggests the pair ran on 75 Ω cable or was simply over-terminated ${inf('')}.</li>
   <li><b>The turret code has history.</b> 554951-1.asm says it is based on 550245-1 (2000, “5 groups chon choff, 1 t/b, 1 all on/off”), which was itself based on 550512-1: the R257-1 custom turret was re-used job after job.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>Main-loop pass ≈ 30 µs and module turnaround 0.5 ms ${inf('loop length')}.</li><li>RS-232 ±7.5 V, RS-422 ±1.6 V terminated / ±3.5 V open ${inf('data-sheet typicals')}.</li><li>WBS I/O-1 outputs drive 24 V relay coils ${inf('')}.</li><li>Turret key layout from the 554951-1.asm header comment; the Gerber key boards (R257-2 row of 9, R257-3 3 × 3) are not mapped key by key ${inf('')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>OBSOLETE Misc - #OBSOLETE #Archive/PCB/: CS8412-14/*, RS232-422/*, wbs_io1/*, wbs_io2/*, R257MISC*, NKK-PB*, GERBERS/*</li><li>#CUSTOM 55XXXX Systems/554951/: 554951 Project.doc, 554951-3/Software/554951-3.c, 554951-1/Software/554951-1.asm, 554951-1 Turret.xls, FUNCTIONAL-554951.dwg</li><li>#CONSOLES/RADIO/REN2K/R2KUSPG2.HTM</li><li>assets: obsolete-misc-wbs-io2.png, -rs232-422.png, -cs8412-14.png, -wbs-io1.png, -r257.png</li></ul>`);
}

SIM.register({
  id:'obsolete-misc', product:'Obsolete misc', name:'Obsolete misc · small PCBs from H:\\misc (2005|38)', year:2005,
  family:'Obsolete products', folder:'MISC/OBSOLETE Misc - #OBSOLETE #Archive',
  summary:'A tour of the folder’s small 2005 boards, drawn from their Gerbers. The largest, WBS_IO2, turns out to be the 554951-3 communication interface that links two R2K consoles and a custom R257 turret; its real firmware drives the simulation. Also an RS-232/RS-422 converter, a CS8412 DIP-to-SOIC carrier, the WBS I/O-1 board and the R257 turret boards.',
  highlights:['Five boards rendered from Gerbers','554951-3 polling cycle from the real firmware','Custom turret with setup mode','RS-232 to RS-422 bit timing','CS8412 adapter pin tracer'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 bit @ 9600',period:()=>1/9600},{label:'1 character',period:()=>10/D.baud},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms'],[0.005,'5 ms'],[0.001,'1 ms']],
  defaultZoom:1,
  init(){ SK=''; },
  tabs:[
    {id:'sim',label:'Simulator (folder tour)',render:viewSim},
    {id:'tutorial',label:'Tutorial',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Software (554951-3)',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
