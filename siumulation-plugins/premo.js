/* =====================================================================
   PREmo (RD88-MICpre) — AES67 networked microphone preamp + Pre-Mote PC app
   Ward-Beck Systems R&D, 2016|49 – 2017|50.  Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "#PREmo #Series/RD88-MICpre"):
   - software/working beta versions/PreMo b0-3/Src/main.c          main(), while(1), HAL_GPIO_EXTI_Callback,
                                                                  HAL_TIM_IC_CaptureCallback, HAL_UART_RxCpltCallback
   - .../Src/ARC_controller.c (checkForPremote, ARCinit, UDP_receiveFromCB), PreMo_ARC.c (ARC_send),
     ARC_transport.c (COBS, checksum, ARC_receivePacket), ARC_notifications.c (parseUDPreceiveFrom),
     ARC_commands.c (ARCCMD_UDP_SendTo), Inc/ARC_IDs.h (command / notification IDs)
   - .../Src/THAT5171.c, rotaryEncoder.c, PHANTOM.c, SSD1306.c (font + WBS logo bitmaps, screen layout),
     AKM5572.c, UNET.c, spi.c, tim.c, Inc/mxconstants.h, V010000.ioc (pins, clocks, timers, NVIC)
   - premoteControl/Pre-Mote V2 - Before Studio Demo/SOURCE CODE/.../Form1.vb, Form1.Designer.vb,
     premoControlPanel.vb, premoControlPanel.Designer.vb  (and V1 / V1.1 for comparison)
   - PCB/backup29-final - for real real/MICPRE-ISS1/MICPRE-1-ISS1.pdf (schematics S1–S7, BOM),
     PreMo-ISS1-Assembly.PDF (main board top/bottom), PCB - DISPLAY BOARD/ISS2/PreMo-2-ISS2.PDF + BOM
   - uNetMini settings.txt.docx, unet-Mini-Parameters.xlsx, components/THATCorp/5171 Datasheet
   - PREmo - #Roadmap #Marketing/Premo-A1 ... Fault Log ... .xlsx  (fault: "does not wake up in previous state")
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (title, body, cls)=>`<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
const h2 = v=>(v&255).toString(16).toUpperCase().padStart(2,'0');
const hexs = a=>Array.from(a).map(h2).join(' ');
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const asc = a=>Array.from(a).map(b=> b>=32&&b<127? String.fromCharCode(b) : '\\x'+h2(b)).join('');
const Y = y=>SIM.year(y);

/* ---------------- firmware data copied from SSD1306.c (font table + WBS logo) ---------------- */
const GL = /* SSD1306.c font table, verbatim */{DASH:[8,8,8,0],DOT:[64,0],COMMA:[80,48,0],COLON:[20,0],SPACE:[0,0,0,0,0,0],char0:[62,81,73,69,62,0],char1:[68,66,127,64,64,0],char2:[66,97,81,73,70,0],char3:[33,65,69,75,49,0],char4:[24,20,18,127,16,0],char5:[39,69,69,69,57,0],char6:[60,74,73,73,48,0],char7:[1,113,9,5,3,0],char8:[54,73,73,73,54,0],char9:[6,73,73,41,30,0],charA:[126,9,9,9,126,0],charB:[127,73,73,73,54,0],charC:[62,65,65,65,34,0],charD:[127,65,65,34,28,0],charE:[127,73,73,73,65,0],charF:[127,9,9,9,1,0],charG:[62,65,73,73,58,0],charH:[127,8,8,8,127,0],charI:[65,127,65,0],charJ:[32,64,65,63,1,0],charK:[127,8,20,34,65,0],charL:[127,64,64,64,64,0],charM:[127,2,12,2,127,0],charN:[127,4,8,16,127,0],charO:[62,65,65,65,62,0],charP:[127,9,9,9,6,0],charQ:[62,65,81,33,94,0],charS:[38,73,73,73,50,0],charT:[1,1,127,1,1,0],charU:[63,64,64,64,63,0],charV:[31,32,64,32,31,0],charW:[63,64,56,64,63,0],charX:[99,20,8,20,99,0],charY:[7,8,112,8,7,0],charZ:[97,81,73,69,67,0],chara:[32,84,84,84,56,0],charb:[127,72,72,72,48,0],charc:[56,68,68,68,68,0],chard:[48,72,72,72,63,0],chare:[56,84,84,84,88,0],charf:[8,126,9,2,0],charg:[72,84,84,84,88,0],charh:[127,8,8,8,112,0],chari:[122,0],charj:[32,64,64,58,0],chark:[127,16,56,68,0],charl:[127,0],charm:[124,4,56,4,124,0],charn:[124,8,4,4,120,0],charo:[56,68,68,68,56,0],charp:[124,20,20,20,8,0],charq:[8,20,20,20,124,0],chars:[72,84,84,84,36,0],chart:[4,4,127,4,4,0],charu:[60,64,64,32,124,0],charv:[28,32,64,32,28,0],charw:[60,64,48,64,60,0],charx:[68,40,16,40,68,0],chary:[4,72,48,8,4,0],charz:[68,100,84,76,68,0]};
const LOGO = /* WBSLOGO_0…3, verbatim */[[255,255,255,255,255,127,127,127,127,127,127,127,127,127,127,127,127,127,255,255,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,159,159,159,159,159,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,223,159,159,159,159,159,159,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,191,63,127,127,127,127,127,127,127,127,127,255,255,255,255,255,255],[255,0,0,0,254,255,255,255,255,255,255,255,247,243,227,199,135,15,31,63,127,255,255,255,127,63,31,15,135,199,227,243,243,227,199,135,15,31,63,127,255,255,255,127,63,31,15,135,199,227,227,247,255,255,3,3,3,3,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,19,7,7,79,239,255,255,255,223,143,135,135,179,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,51,115,115,247,255,255,255,255,255,255,254,254,0,0,0,255],[255,224,192,192,223,223,191,191,191,191,191,191,191,63,63,127,127,127,126,124,120,112,113,112,120,124,126,127,127,127,127,127,127,127,127,127,127,126,124,120,112,113,248,252,252,254,255,255,255,255,255,255,255,255,240,240,240,240,243,243,243,243,243,243,243,243,243,243,243,243,243,243,243,243,243,243,243,251,248,248,248,252,254,255,255,127,123,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,115,123,123,120,248,248,188,191,191,191,191,191,191,191,223,192,192,192,255],[255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255]];

/* ---------------- constants from the source ---------------- */
const C = {
  SYSCLK: 48e6,                 // HSE 16 MHz × PLL_MUL3 (V010000.ioc)
  LOOP_T: 0.5e-6,               // one while(1) pass — INFERRED (two compares, Debug build)
  TICK: 1e-3,                   // HAL_SYSTICK_Config(HCLK/1000)
  UB: 10/115200,                // one UART byte, USART1 115200 8N1
  UART_ISR: 3e-6,               // HAL_UART_IRQHandler + callback per byte — INFERRED
  SPI1_FRAME: 16/3e6,           // SPI1 16-bit frames, prescaler 16 → 3 Mbit/s
  SPI2_BYTE: 8/3e6,             // SPI2 8-bit, 3 Mbit/s
  HAL_CALL: 4e-6,               // HAL call + GPIO chip-select overhead — INFERRED
  TRC: 22e6*1e-9,               // THAT5171 zero-crossing timeout: R55 22M × C39 1000p = 22 ms
  PH_DELAY: 0.100,              // setPhantomPower: HAL_Delay(100) (schematic asks ≥ 10 ms)
  UNET_LAT: 0.4e-3,             // uNet Mini: UDP in → ARC notification out — INFERRED
  FS: 48000,                    // AKM CLK_AUTO; uNet SampleRate index 2 — INFERRED 48 kHz
  PKT: 48/48000,                // SamplesPerPacket1xFS = 48 (unet-Mini-Parameters.xlsx) → 1 ms
  PTP: 0.125,                   // PTP Sync interval — INFERRED (AES67 default profile)
  OLED: 1/105,                  // SSD1306 frame rate with D5=F0, D9=F1, MUX 64 — INFERRED
  TIM3_TICK: 65536/48e6,        // TIM3 prescaler 0xFFFF → 1.365 ms per tick
  LONG: 400,                    // uwDiffCapture > 400 ticks → phantom toggles
  PH_UP: 0.3, PH_DN: 0.01,      // +48 V rail charge / discharge time constants — INFERRED
  WIRE: (346+20)*8/100e6,       // one AES67 packet on 100BASE-T (48 × 2 ch × 24 bit + headers)
  I2C_BIT: 1/100e3,             // I2C1 Timing 0x20303E5D @ 48 MHz ≈ 100 kHz — INFERRED
};
const PH_ON = 0x00, PH_OFF = 0x01;                 // PHANTOM.h (note: ON is zero)
const PC_IP = [111,13,5,10];                        // PC address — INFERRED (same /16 as the V2 defaults)
const PC_MAC = [0x02,0x50,0x43,0x00,0x00,0x0A];     // placeholder — INFERRED
const BOOT = [  // [what main() is doing, seconds, what the OLED shows]
  ['HAL_Init · SystemClock_Config · MX_GPIO/DMA/I2C1/SPI1/SPI2/USART1/USB/TIM3/TIM17_Init', 0.003, 'blank'],
  ['phantomInit() → setPhantomPower(PHANTOM_OFF): HAL_Delay(100)', 0.100, 'blank'],
  ['ssd1306Init(): ssd1306Reset (2 × HAL_Delay(200)), registers, ClearScreen, DisplayLogo', 0.410, 'blank'],
  ['HAL_UART_Receive_IT · unetInit() → unetReset(): UM_RESET 200 ms + HAL_Delay(5000)', 5.200, 'logo'],
  ['HAL_Delay(10000)', 10.000, 'logo'],
  ['ARCinit(): 13 ARC queries (20 ms retry loops) + ARCsetUDPconfig(0, ENABLED, ip, 48888)', 0.450, 'logo'],
  ['ssd1306ClearScreen · that5171Init · akm5572Init · ssd1306MenuInit · gain / IP / MAC · checkForPremote()', 0.035, 'menu'],
  ['while(1) first pass: pPhantom starts as PHANTOM_ON ≠ phantom → setPhantomPower(OFF) again', 0.100, 'menu'],
];
const BOOT_TOTAL = BOOT.reduce((a,b)=>a+b[1],0);
const PROG = { voice:{f:180, name:'speech (≈180 Hz fundamental)'}, tone:{f:1000, name:'1 kHz tone'}, rumble:{f:20, name:'20 Hz rumble / handling noise'} };
const SRC = { none:{name:'nothing plugged in', dBu:null}, dyn:{name:'dynamic mic (SM58-type)', dBu:-52}, cond:{name:'condenser mic (needs +48 V)', dBu:-40}, line:{name:'line level on the TRS (+4 dBu)', dBu:4-15} };
function gainDb(code){ if (code===0) return 5.6; if (code>=8 && code<=63) return code+5.6; return null; }

/* ---------------- model time: every action lives at an absolute time = epoch + SIM.t ---------------- */
const M = { epoch:0, lastT:0, lastProcessed:-1 };
const absNow = ()=> M.epoch + SIM.t;
function tick(){ if (SIM.playing && SIM.t < M.lastT - 0.5) M.epoch++; M.lastT = SIM.t; }

/* ---------------- device state ---------------- */
const D = {
  rj45:'poe', dc:false, src:'dyn', prog:'voice', unitIP:[111,13,5,90], dhcp:false,
  mac:[0x02,0x57,0x42,0x53,0x00,0x58],             // the uNet's MAC is not in the archive — placeholder, INFERRED
  powered:true, booted:true, boot:null, bootSpeed:4, uartFreeAt:-1, side:'top', lab:false,
};
const F = { count:0, pCount:0, phantom:PH_OFF, pPhantom:PH_OFF, ic1:0, mainBusyUntil:-1, frameId:0x11, expected:0, countHist:[{t:-1e9,v:0}] };
const THAT = { reg:0, err:false, busyFrom:-1, busyUntil:-1, hist:[{t:-1e9, code:0}] };
const PH = { hist:[{t:-1e9, k1:0, k2:1}] };
const OLED = { fb:new Uint8Array(1024), page:0, col:0, on:true };
let SNAP = [{t:-1e9, fb:new Uint8Array(1024)}];
let EV = [], PKTS = [], LOG = [], TR = null;
const URX = { buf:new Uint8Array(1024), cnt:0 };                 // ARCrxBuff / rxCount (uint8_t!)
const ARX = { len:0, idx:0, code:0, buf:new Uint8Array(1088) };   // ARC internal ctx: rxMessageBuffer, COBS state
let sport = 52817;                                                 // Windows ephemeral ports — INFERRED start

/* ---------------- discrete-event engine ---------------- */
let Q = [], seqN = 0; const X = { t:0 };
function at(t, name, fn){ Q.push({t, name, fn, seq:seqN++}); }
function run(){
  let g=0;
  while (Q.length && g++ < 40000){
    let k=0; for (let i=1;i<Q.length;i++) if (Q[i].t<Q[k].t || (Q[i].t===Q[k].t && Q[i].seq<Q[k].seq)) k=i;
    const e = Q.splice(k,1)[0]; X.t = e.t; e.fn();
    M.lastProcessed = Math.max(M.lastProcessed, X.t); if (TR) TR.tEnd = Math.max(TR.tEnd, X.t);
  }
}
function ev(lane, t, dur, label, o){ const e = Object.assign({lane, t, dur, label}, o||{}); EV.push(e); if (EV.length>8000) EV.splice(0,2000); return e; }
const rel = t=> TR? '+'+SIM.fmtDur(Math.max(0,t-TR.t)).replace(' ',' ') : '';
function fw(s){ if (TR) TR.fw.push(`<span class="muted">${rel(X.t)}</span> ${s}`); }
function vb(s){ if (TR) TR.vb.push(s); }
function hist(arr, t, o){ let i=arr.length; while (i>0 && arr[i-1].t > t) i--; arr.splice(i,0,Object.assign({t},o)); }
function histAt(arr, t){ let r=arr[0]; for (const e of arr){ if (e.t<=t) r=e; else break; } return r; }

/* ---------------- SSD1306 emulation (the firmware's own byte stream) ---------------- */
function oledApply(isData, bytes){
  if (!isData){ for (const b of bytes){
      if (b>=0xB0 && b<=0xB7) OLED.page = b&7;
      else if (b<=0x0F) OLED.col = (OLED.col&0x70) | b;
      else if (b>=0x10 && b<=0x1F) OLED.col = ((b&0x07)<<4) | (OLED.col&0x0F);   // bit 3 of 0x1B / 0x1E ignored — INFERRED
      else if (b===0xAF) OLED.on = true; else if (b===0xAE) OLED.on = false; }
    return; }
  for (const v of bytes){ OLED.fb[OLED.page*128+OLED.col] = v; OLED.col = (OLED.col+1)&127; }
}
function ssdW(isData, bytes, label){
  const d = C.HAL_CALL + bytes.length*C.SPI2_BYTE;
  ev('spi2', X.t, d, label || (isData? 'DATA '+bytes.length+' B' : 'CMD '+hexs(bytes)), {bytes:bytes.slice(0,16), data:isData});
  oledApply(isData, bytes); X.t += d;
}
const snap = ()=> hist(SNAP, X.t, {fb:OLED.fb.slice()});
const ssdPage = p=> ssdW(0,[(p&0xB7)|0xB0]);
const ssdLo = v=> ssdW(0,[v&0x0F]);
const ssdHi = v=> ssdW(0,[(v&0x1F)|0x10]);
const G = n=> GL[n];
function ssdMenuInit(){
  ssdPage(0); ssdLo(0x00); ssdHi(0x10);
  ['charG','chara','chari','charn','COLON'].forEach(n=>ssdW(1,G(n),'“'+n.replace('char','')+'”'));
  ssdLo(0x02); ssdHi(0x12); ['chard','charB'].forEach(n=>ssdW(1,G(n)));
  ssdLo(0x0B); ssdHi(0x1B); ['charP','charh','chara','charn','chart','charo','charm','COLON','SPACE'].forEach(n=>ssdW(1,G(n)));
  ssdPage(1); ssdLo(0x00); ssdHi(0x10); ['charI','charP','COLON'].forEach(n=>ssdW(1,G(n)));
  ssdPage(2); ssdLo(0x00); ssdHi(0x10); ['charM','charA','charC','COLON'].forEach(n=>ssdW(1,G(n)));
  snap();
}
function ssdSetGain(g){
  ssdPage(0); ssdLo(0x06); ssdHi(0x11);
  let tc = g<10? 'SPACE' : g<20? 'char1' : g<30? 'char2' : g<40? 'char3' : g<50? 'char4' : g<60? 'char5' : g<64? 'char6' : null;
  if (tc) ssdW(1, G(tc).slice(0,6), 'tens “'+(tc==='SPACE'?' ':tc.slice(4))+'”');
  else { ev('spi2', X.t, C.HAL_CALL, 'HAL_SPI_Transmit(NULL) → HAL_ERROR', {bad:true}); X.t += C.HAL_CALL; fw(`ssd1306SetGain(${g}): gain ≥ 64 → tempChar stays NULL → HAL_SPI_Transmit returns HAL_ERROR, the old tens digit stays on screen`); }
  ssdW(1, G('char'+(g%10)).slice(0,6), 'ones “'+(g%10)+'”');
  snap();
}
function ssdSetPhantom(p){
  ssdPage(0); ssdLo(0x0D); ssdHi(0x1E);
  if (p===PH_ON){ ssdW(1,G('charO')); ssdW(1,G('charN')); ssdW(1,G('SPACE')); }
  else if (p===PH_OFF){ ssdW(1,G('charO')); ssdW(1,G('charF')); ssdW(1,G('charF')); }
  else fw(`ssd1306SetPhantom(${p}): neither PHANTOM_ON nor PHANTOM_OFF → nothing written`);
  snap();
}
function cat(b, arr){ for (const v of arr){ if (v===0) break; b.push(v); } }   // strcat() stops at the glyph's 0x00
function ipGlyphs(ip){
  const b=[];
  for (let i=0;i<4;i++){
    let temp=ip[i]; const t=[0,0,0];
    if (temp>=200){ t[0]=2; cat(b,G('char2')); b.push(0x20); temp-=200; }
    else if (temp>=100){ t[0]=1; cat(b,G('char1')); b.push(0x20); temp-=100; }
    if (temp>=10){ t[1]=Math.floor(temp/10); t[2]=temp%10; } else t[2]=temp;
    if (t[1]===0){ if (t[0]!==0){ cat(b,G('char0')); b.push(0x20); } } else { cat(b,G('char'+t[1])); b.push(0x20); }
    cat(b,G('char'+t[2]));
    if (i<=2){ b.push(0x20); cat(b,G('DOT')); b.push(0x20); }
  }
  for (let i=0;i<b.length;i++) if (b[i]===0x20) b[i]=0;      // every 0x20 byte becomes a blank column
  return b;
}
function macGlyphs(m){
  const b=[], H='0123456789ABCDEF';
  for (let i=0;i<6;i++){
    cat(b,G('char'+H[m[i]>>4])); b.push(0x20); cat(b,G('char'+H[m[i]&15]));
    if (i<5){ b.push(0x20); cat(b,G('COLON')); b.push(0x20); }
  }
  [5,11,13,19,25,27,33,39,41,47,53,55,61,67,69,75,81,83].forEach(i=>{ if (b[i]===0x20) b[i]=0; });
  return b;
}
function ssdIP(ip){ ssdPage(1); ssdLo(0x0D); ssdHi(0x10); ssdW(1, ipGlyphs(ip), 'IP '+ip.join('.')); snap(); }
function ssdMAC(m){ ssdPage(2); ssdLo(0x05); ssdHi(0x11); ssdW(1, macGlyphs(m), 'MAC'); snap(); }
function ssdClear(){
  const t0=X.t; for (let j=0;j<8;j++){ oledApply(0,[0xB0|j]); for (let i=0;i<128;i++) oledApply(1,[0]); }
  const d = 1032*(C.HAL_CALL+C.SPI2_BYTE); ev('spi2', t0, d, 'ssd1306ClearScreen: 1024 one-byte writes'); X.t += d; snap();
}
function ssdLogo(){ for (let i=0;i<4;i++){ ssdPage(2+i); ssdW(1, Array.from(LOGO[i]), 'logo page '+(2+i)); } snap(); }

/* ---------------- THAT5171 (SPI1, 16-bit frames, zero-crossing mode) ---------------- */
const thatBusy = t=> t>=THAT.busyFrom && t<THAT.busyUntil;
function nextZero(t){
  const s = signalOn(t); if (!s) return t + 5e-6;                     // silence sits inside ±5 mV
  const f = PROG[D.prog].f; return Math.ceil(t*2*f + 1e-9)/(2*f);
}
function that5171WriteGain(g, ctx){
  const val = g & 0x3F;
  if (thatBusy(X.t)){
    ev('spi1', X.t, 1e-6, 'write SKIPPED (BUSY high)', {skip:true}); X.t += 1e-6;
    fw(`${ctx||''}that5171WriteGain(${g}): isThat5171Busy() = 1 → <b>the SPI write is skipped</b> (a zero-crossing update is still pending)`); return false;
  }
  const word = 0x1200 | val;
  ev('spi1', X.t, C.HAL_CALL+C.SPI1_FRAME, 'W 0x'+word.toString(16).toUpperCase().padStart(4,'0'), {word});
  X.t += C.HAL_CALL + C.SPI1_FRAME;
  fw(`${ctx||''}that5171WriteGain(${g}): nCS↓ PA15, SPI1 16-bit frame 0x${word.toString(16).toUpperCase()} = WRITE_BIT 0x10 | GAIN_REG 0x02, data ${val} (gain & 0x3F), nCS↑`);
  if (val>=1 && val<=7){ THAT.err=true; fw(`THAT5171: gain code ${val} is illegal (1–7) → ignored, ERR bit 0x20 set; the preamp keeps ${gainDb(histAt(THAT.hist,X.t).code)} dB`); return true; }
  THAT.err=false; THAT.reg=val;
  const t0=X.t, zc=nextZero(t0), tA=Math.min(zc, t0+C.TRC);
  THAT.busyFrom=t0; THAT.busyUntil=tA; hist(THAT.hist, tA, {code:val}); if (TR) TR.tEnd=Math.max(TR.tEnd, tA);
  ev('busy', t0, tA-t0, tA<t0+C.TRC-1e-9? 'BUSY → next zero crossing' : 'BUSY → TRC timeout 22 ms');
  fw(`THAT5171 (CNTRL MODE = zero crossing): BUSY pin PB7 high for ${SIM.fmtDur(tA-t0)}; the resistors switch to ${gainDb(val)} dB ${tA<t0+C.TRC-1e-9?'at the next zero crossing':'when the 22 ms RC timeout expires'}`);
  return true;
}
function that5171ReadGain(){
  if (thatBusy(X.t)){ ev('spi1', X.t, 1e-6, 'read SKIPPED → 0', {skip:true}); X.t += 1e-6; fw('that5171ReadGain(): BUSY high → the read is skipped and readData[0] stays 0 → <b>returns 0</b>'); return 0; }
  ev('spi1', X.t, C.HAL_CALL+C.SPI1_FRAME, 'R 0x0200 → '+THAT.reg, {word:0x0200}); X.t += C.HAL_CALL+C.SPI1_FRAME;
  fw(`that5171ReadGain(): SPI1 frame 0x0200 (READ, GAIN_REG) → ${THAT.reg}`); return THAT.reg;
}

/* ---------------- rotaryEncoder.c ---------------- */
function setGain(g){
  g &= 255;
  fw(`setGain(${g})`);
  that5171WriteGain(g, '');
  ssdSetGain(g); fw(`ssd1306SetGain(${g}) → SPI2: page 0, column 22, two 6-column digits`);
  F.count = g; hist(F.countHist, X.t, {v:g});
}
function incrementGain(){ let c = that5171ReadGain(); const o=c; if (c===0) c=8; else if (c<63) c++; fw(`incrementGain(): count ${o} → ${c} (0 jumps to 8; 1–7 are illegal codes)`); setGain(c); }
function decrementGain(){ let c = that5171ReadGain(); const o=c; if (c>8) c--; else c=0; fw(`decrementGain(): count ${o} → ${c} (from 8 or below it drops to 0)`); setGain(c); }

/* ---------------- relays K1 / K2 (PHANTOM.c) ---------------- */
function relay(k1,k2){ hist(PH.hist, X.t, {k1,k2}); ev('ph', X.t, 0, `K1 ${k1?'ON':'off'} · K2 ${k2?'ON':'off'}`, {k1,k2}); }
function phantomV(t){
  let v=0, last=-1e9, st={k1:0,k2:1};
  for (const e of PH.hist){ if (e.t>t) break; const dt=Math.min(10,e.t-last); if (last>-1e8) v = step(v,st,dt); st=e; last=e.t; }
  return step(v, st, Math.min(10, t-last));
  function step(v,s,dt){ if (dt<=0) return v; if (s.k1 && D.powered) return 48 - (48-v)*Math.exp(-dt/C.PH_UP); if (s.k2 || !D.powered) return v*Math.exp(-dt/C.PH_DN); return v; }
}

/* ---------------- main loop (main.c while(1)) ---------------- */
let mainPending = null;
function scheduleMain(t){
  const tm = Math.max(t, F.mainBusyUntil) + C.LOOP_T;
  if (mainPending!==null && mainPending <= tm) return;
  mainPending = tm; at(tm, 'while(1) pass', mainCheck);
}
function mainCheck(){
  mainPending = null;
  if (!D.powered || !D.booted) return;
  if (X.t < F.mainBusyUntil - 1e-12){ scheduleMain(F.mainBusyUntil); return; }
  if (F.pPhantom !== F.phantom){
    const p = F.phantom, t0=X.t;
    fw(`main loop: <span class="mono">if (pPhantom != phantom)</span> → setPhantomPower(${p===PH_ON?'PHANTOM_ON':'PHANTOM_OFF'})`);
    fw(`PHANTOM.c: ${p===PH_ON?'PHANTOM_OFF_DEASSERT, PHANTOM_ON_DEASSERT':'PHANTOM_ON_DEASSERT, PHANTOM_OFF_DEASSERT'} (PA1, PA0 low) → K1 and K2 both open (break before make)`);
    relay(0,0);
    F.mainBusyUntil = t0 + C.PH_DELAY;
    ev('cpu', t0, C.PH_DELAY, 'main: setPhantomPower → HAL_Delay(100)', {block:true});
    at(t0 + C.PH_DELAY, 'setPhantomPower continues', ()=>{
      if (!D.powered) return;
      if (p===PH_ON){ relay(1,0); fw('HAL_Delay(100) done → PHANTOM_ON_ASSERT (PA0 high) → K1 (CPC1017N) connects +48 V to the PHANTOM net (6K81 feed resistors R37/R38)'); }
      else { relay(0,1); fw('HAL_Delay(100) done → PHANTOM_OFF_ASSERT (PA1 high) → K2 shorts the PHANTOM net to AGND'); }
      const s=X.t; ssdSetPhantom(F.phantom);
      fw(`ssd1306SetPhantom(${F.phantom===PH_ON?'PHANTOM_ON':'PHANTOM_OFF'}) → “${F.phantom===PH_ON?'ON ':'OFF'}” at column 109${F.phantom!==p?' — <b style="color:var(--bad)">but the relays were set for '+(p===PH_ON?'ON':'OFF')+': phantom changed during the 100 ms delay</b>':''}`);
      F.pPhantom = F.phantom; fw(`pPhantom = phantom (${F.phantom===PH_ON?'ON':'OFF'})`);
      gainCheck();
      ev('cpu', s, X.t-s, 'main: ssd1306SetPhantom', {main:true});
      F.mainBusyUntil = X.t; scheduleMain(X.t);
    });
    return;
  }
  gainCheck();
}
function gainCheck(){
  if (F.pCount === F.count) return;
  const s = X.t;
  fw(`main loop: <span class="mono">if (pCount != count)</span> (${F.pCount} ≠ ${F.count}) → that5171WriteGain(count) + ssd1306SetGain(count) <i>again</i>`);
  that5171WriteGain(F.count, 'main: '); ssdSetGain(F.count);
  F.pCount = F.count; F.mainBusyUntil = X.t;
  ev('cpu', s, X.t-s, 'main: write gain again (pCount ≠ count)', {main:true});
}

/* ---------------- interrupts ---------------- */
function isr(name, work){
  const s = X.t; X.t += 1.5e-6; work(); const d = X.t - s;
  ev('cpu', s, d, name, {isr:true}); scheduleMain(X.t);
}
function encTurn(t, dir){   // dir +1 = clockwise
  const d = 0.004;          // one detent ≈ 4 ms of A/B edges — INFERRED
  const first = dir>0? 'A' : 'B', second = dir>0? 'B':'A';
  ev('enc', t, d/2, `${first}↓`, {pin:first}); ev('enc', t+d/4, d/2, `${second}↓`, {pin:second});
  at(t, 'EXTI '+first, ()=> unitLive() && isr(dir>0? 'EXTI4_15_IRQHandler (PB10 ENCODER_A)' : 'EXTI2_3_IRQHandler (PB2 ENCODER_B)', ()=>{
    fw(`HAL_GPIO_EXTI_Callback(${dir>0?'ENCODER_A_Pin':'ENCODER_B_Pin'}): EXTI IRQs disabled; ${dir>0?'ENCODER_B':'ENCODER_A'} reads high → ${dir>0?'incrementGain()':'decrementGain()'}`);
    if (dir>0) incrementGain(); else decrementGain();
  }));
  at(t+d/4, 'EXTI '+second, ()=> unitLive() && isr(dir>0? 'EXTI2_3_IRQHandler (PB2 ENCODER_B)' : 'EXTI4_15_IRQHandler (PB10 ENCODER_A)', ()=>{
    fw(`HAL_GPIO_EXTI_Callback(${dir>0?'ENCODER_B_Pin':'ENCODER_A_Pin'}): the other pin is already low → nothing`);
  }));
}
function encPress(t, hold){
  const cap = tt=> Math.floor((tt+1000)/C.TIM3_TICK) & 0xFFFF;
  ev('enc', t, hold, 'SW low '+SIM.fmtDur(hold), {pin:'SW'});
  at(t, 'TIM3 capture ↓', ()=> unitLive() && isr('TIM3_IRQHandler (PB1 TIM3_CH4, falling)', ()=>{
    F.ic1 = cap(X.t); fw(`HAL_TIM_IC_CaptureCallback: ENCODER_SW reads low → uwIC2Value1 = ${F.ic1} (TIM3 ticks of 1.365 ms)`);
  }));
  at(t+hold, 'TIM3 capture ↑', ()=> unitLive() && isr('TIM3_IRQHandler (PB1 TIM3_CH4, rising)', ()=>{
    const v2 = cap(X.t); let diff = v2>F.ic1? v2-F.ic1 : v2<F.ic1? (0xFFFF-F.ic1)+v2+1 : 0;
    fw(`HAL_TIM_IC_CaptureCallback: ENCODER_SW high → uwIC2Value2 = ${v2}, uwDiffCapture = ${diff} ticks = ${SIM.fmtDur(diff*C.TIM3_TICK)}`);
    if (diff > C.LONG){ const o=F.phantom; F.phantom = F.phantom===0? 1 : 0; fw(`uwDiffCapture > 400 → phantom ${o===PH_ON?'ON':'OFF'} → ${F.phantom===PH_ON?'ON':'OFF'} (the main loop does the switching)`); }
    else fw('uwDiffCapture ≤ 400 (shorter than 0.546 s) → <b>nothing happens</b>: a short press has no function');
  }));
}

/* ---------------- ARC over USART1 (uNet Mini ↔ STM32) ---------------- */
function arcFrame(fid, code, payload){
  const m=[fid, code, (payload.length>>8)&255, payload.length&255, ...payload]; let s=0; for (const v of m) s=(s+v)&255; m.push((~s)&255); return m;
}
function arcAck(fid){ const m=[fid,0xFF]; let s=0; for (const v of m) s=(s+v)&255; m.push((~s)&255); return m; }
function cobs(m){
  const o=[0x00]; let ci=o.length; o.push(0); let code=1;
  for (const b of m){ if (b===0){ o[ci]=code; ci=o.length; o.push(0); code=1; } else { o.push(b); if (++code===0xFF){ o[ci]=code; ci=o.length; o.push(0); code=1; } } }
  o[ci]=code; o.push(0x00); return o;
}
function uartToMcu(t0, bytes, label){
  const start = Math.max(t0, D.uartFreeAt);
  bytes.forEach((b,i)=>{ const tb=start+i*C.UB; ev('urx', tb, C.UB, h2(b), {b, first:i===0, label:i===0?label:''});
    at(tb+C.UB, 'USART1 RX byte', ()=>{ if (!D.powered||!D.booted) return; rxByteISR(b, i===bytes.length-1? label : null); }); });
  D.uartFreeAt = start + bytes.length*C.UB;
  return start;
}
function rxByteISR(b, label){
  const s=X.t; X.t += C.UART_ISR; let work=false;
  // HAL_UART_RxCpltCallback (main.c)
  if (URX.cnt < 7){
    URX.buf[URX.cnt] = b; URX.cnt = (URX.cnt+1)&255;
    if (F.expected === 1 && URX.cnt === 6){ work=true; fw('HAL_UART_RxCpltCallback: rxCount == 6 and expectedCMDRESP == (A || B) == 1 → ARC_receive(6 bytes)'); ARC_receive(URX.buf.slice(0,6)); URX.cnt=0; }
  } else {
    URX.buf[URX.cnt] = b;
    if (b===0){ work=true; const n=URX.cnt+1; fw(`HAL_UART_RxCpltCallback: byte 0x00 after ${n} bytes → ARC_receive(ARCrxBuff, ${n})`); ARC_receive(URX.buf.slice(0,n)); URX.cnt=0; }
    else URX.cnt = (URX.cnt+1)&255;
  }
  if (!work && URX.cnt===6 && b===0) fw('HAL_UART_RxCpltCallback: a 6-byte frame ended inside the “rxCount &lt; 7” branch, which never looks for 0x00 → it stays parked in ARCrxBuff until the next frame arrives');
  ev('cpu', s, X.t-s, work? 'USART1_IRQHandler → ARC_receive' : 'USART1_IRQHandler', {isr:true, small:!work});
  if (work) scheduleMain(X.t);
}
function ARC_receive(data){
  for (const byte of data){
    if (byte===0){ if (ARX.len>0){ ARC_receivePacket(ARX.len); ARX.len=0; } ARX.idx=0; ARX.code=0; }
    else if (ARX.len < ARX.buf.length){
      if (ARX.idx===ARX.code){ if (ARX.idx && ARX.code<0xFF) ARX.buf[ARX.len++]=0; ARX.code=byte; ARX.idx=1; }
      else if (ARX.idx){ ARX.buf[ARX.len++]=byte; ARX.idx++; }
    }
  }
}
function ARC_receivePacket(len){
  const p=ARX.buf; X.t += len*0.4e-6 + 4e-6;
  if (len<3) return;
  let s=0; for (let i=0;i<len;i++) s=(s+p[i])&255;
  if (!(s===0xFF || p[len-1]===0xEE)){ fw(`ARC_receivePacket: checksum 0x${h2(s)} ≠ 0xFF → dropped`); return; }
  const fid=p[0], code=p[1];
  if (code===0xFF){ fw(`ARC_receivePacket: ACK for frame 0x${h2(fid)} → ARC_messageACK_received → commandComplete = 1`); return; }
  const pl=(p[2]<<8)|p[3];
  if (4+pl+1 !== len){ fw('ARC_receivePacket: length mismatch → dropped'); return; }
  if (fid){ fw(`ARC_receivePacket: response to frame 0x${h2(fid)}, error code ${code} → ARC_parseResponse (expectedCMDRESP 0x${h2(F.expected)}) → commandComplete = 1`); return; }
  fw(`ARC_receivePacket: checksum OK, frameID 0 = notification 0x${h2(code)}${code===0xB0?' (ARC_NOTID_UDP_RECEIVEFROM)':''}, payload ${pl} bytes`);
  if (code===0xB0){
    const L = pl & 255;                                         // parseUDPreceiveFrom(…, unsigned char length)
    if (L < 8) return;
    const ip=[p[5],p[6],p[7],p[8]], port=(p[9]<<8)|p[10], n=(p[11]<<8)|p[12];
    fw(`parseUDPreceiveFrom: serverID ${p[4]}, from ${ip.join('.')}:${port}, noOfBytes ${n} → UDP_receiveFromCB()`);
    UDP_receiveFromCB(ip, port, n, 13);
  }
}
const RX = i=> ARX.buf[i] || 0;                                    // payload[] points into rxMessageBuffer
function UDP_receiveFromCB(ip, port, n, o){
  const pay = i=> RX(o+i);
  if (pay(0)===0x90){ const name=[]; for (let i=35;i<35+64 && RX(i);i++) name.push(RX(i));
    fw(`UDP_receiveFromCB: payload[0] == 0x90 → ARCudpSend(sender, 48888, strlen(devConfig.deviceName), devConfig.deviceName) — deviceName points into rxMessageBuffer[35]: “${esc(asc(name))}”`);
    ARCudpSend(ip, 48888, name, 'reply to 0x90 (device name)'); }
  if (pay(0)===0x0E){ fw('UDP_receiveFromCB: payload[0] == 0x0E → ARCudpSend(sender, 48888, 6, &macAd)'); ARCudpSend(ip, 48888, D.mac.slice(), 'reply to 0x0E (MAC)'); }
  if (pay(0)===0x47 && pay(1)===0x61 && pay(2)===0x69 && pay(3)===0x6E){
    if (n===5){ fw(`UDP_receiveFromCB: “Gain” + 1 digit → setGain(payload[4] & 0x0F = ${pay(4)&15})`); setGain(pay(4)&0x0F); }
    else if (n===6){ const v=((pay(4)&15)*10 + (pay(5)&15))&255; fw(`UDP_receiveFromCB: “Gain” + 2 digits → (payload[4] & 0x0F)·10 + (payload[5] & 0x0F) = ${v} → setGain(${v})`); setGain(v); }
    else fw(`UDP_receiveFromCB: “Gain” but noOfBytes = ${n} (only 5 or 6 are handled) → ignored`);
  }
  if (pay(0)===0x50 && pay(1)===0x48 && pay(2)===0x41 && pay(3)===0x4E && pay(4)===0x54 && pay(5)===0x4F && pay(6)===0x4D){
    const b7=pay(7); const note = n<8? ` (noOfBytes ${n}: payload[7] is past the payload — it reads the ARC checksum byte 0x${h2(b7)})` : '';
    if (b7===1){ F.phantom=PH_ON; fw(`UDP_receiveFromCB: “PHANTOM” + 0x01 → phantom = PHANTOM_ON (0x00)${note}. The main loop will switch the relays.`); }
    else if (b7===0){ F.phantom=PH_OFF; fw(`UDP_receiveFromCB: “PHANTOM” + 0x00 → phantom = PHANTOM_OFF (0x01)${note}`); }
    else fw(`UDP_receiveFromCB: “PHANTOM” + 0x${h2(b7)} → neither 0 nor 1 → ignored${note}`);
  }
  fw('commandComplete = 1');
}
function ARCudpSend(ip, port, data, why){
  F.frameId = (F.frameId+1)&255; if (!F.frameId) F.frameId=1;
  const fid=F.frameId;
  const pl=[...ip, port>>8, port&255, (data.length>>8)&255, data.length&255, ...data];
  const frame=arcFrame(fid, 0xB0, pl), enc=cobs(frame);
  F.expected = 0xB0;
  fw(`ARCudpSend → ARCCMD_UDP_SendTo: frame 0x${h2(fid)}, cmd 0xB0, ${enc.length} COBS bytes; HAL_UART_Transmit blocks ${SIM.fmtDur(enc.length*C.UB)}${TR&&X.t-TR.t<0.05?' (inside the interrupt)':''}`);
  const t0=X.t;
  enc.forEach((b,i)=> ev('utx', t0+i*C.UB, C.UB, h2(b), {b, first:i===0, label:i===0?why:''}));
  X.t += enc.length*C.UB;
  const tNet = X.t + C.UNET_LAT;
  const dst = ip.slice(), bcast = dst[3]===255;
  netPacket(tNet, D.unitIP, dst, 48888, 48888, data, 'unit→pc', why, bcast? 'broadcast — Pre-Mote V2 never opens a receive socket, so nobody hears it' : 'Pre-Mote has no socket on UDP 48888 (no UdpClient.Receive anywhere in the VB code) → Windows discards it');
  // the uNet answers with an ACK, then a response (format INFERRED from ARC_receivePacket)
  const ack = cobs(arcAck(fid)), resp = cobs(arcFrame(fid, 0x00, []));
  uartToMcu(tNet, ack.concat(resp), 'ACK + response 0x'+h2(fid));
}

/* ---------------- Ethernet / IP / UDP ---------------- */
function csum(a){ let s=0; for (let i=0;i<a.length;i+=2) s += (a[i]<<8)|(a[i+1]||0); while (s>>>16) s=(s&0xffff)+(s>>>16); return (~s)&0xffff; }
function buildFrame(srcIP, dstIP, sp, dp, payload, srcMac, dstMac){
  const ulen=8+payload.length, u=[sp>>8,sp&255,dp>>8,dp&255,ulen>>8,ulen&255,0,0,...payload];
  let c=csum([...srcIP,...dstIP,0,17,ulen>>8,ulen&255,...u])||0xffff; u[6]=c>>8; u[7]=c&255;
  const tot=20+ulen, id=(sp*7)&0xffff, ip=[0x45,0,tot>>8,tot&255,id>>8,id&255,0,0,128,17,0,0,...srcIP,...dstIP];
  c=csum(ip); ip[10]=c>>8; ip[11]=c&255;
  return {eth:[...dstMac,...srcMac,0x08,0x00], ip, udp:u.slice(0,8), payload};
}
function netPacket(t, src, dst, sp, dp, payload, dir, why, fate){
  const bcast = dst[3]===255;
  const fr = buildFrame(src, dst, sp, dp, payload, dir==='pc→unit'?PC_MAC:D.mac, bcast?[255,255,255,255,255,255]:(dir==='pc→unit'?D.mac:PC_MAC));
  const len = 14+20+8+payload.length+4;
  const pk = {t, dir, src:src.join('.'), dst:dst.join('.'), sp, dp, payload:payload.slice(), fr, why, fate:fate||''};
  PKTS.unshift(pk); if (PKTS.length>60) PKTS.length=60;
  ev('eth', t, Math.max(len,64)*8/100e6+20*8/100e6, (dir==='pc→unit'?'→ ':'← ')+asc(payload).slice(0,14), {pk, dir});
  return pk;
}
const unitIPs = ()=> D.unitIP.join('.');
function pcSend(t, panel, payload, why){
  const dst = panel.premoIP.split('.').map(Number);
  const sp = sport; sport = sport>=65535? 49152 : sport+1;
  const pk = netPacket(t, PC_IP, dst, sp, 48888, payload, 'pc→unit', why);
  if (panel.premoIP !== unitIPs()){ pk.fate = `no PREmo answers at ${panel.premoIP} (the unit is at ${unitIPs()})`; fwNet(pk.fate); return; }
  if (!D.powered){ pk.fate='the unit is off'; fwNet(pk.fate); return; }
  if (D.rj45==='none'){ pk.fate='no Ethernet cable in the unit'; fwNet(pk.fate); return; }
  if (!D.booted){ pk.fate='lost: the unit is still booting — UDP server 0 is only opened by ARCsetUDPconfig() near the end of ARCinit()'; fwNet(pk.fate); return; }
  pk.fate = 'delivered to the uNet Mini → ARC notification on USART1';
  const frame = arcFrame(0x00, 0xB0, [0x00, ...PC_IP, sp>>8, sp&255, payload.length>>8, payload.length&255, ...payload]);
  const enc = cobs(frame);
  pk.arc = frame; pk.cobs = enc;
  const st = uartToMcu(t + C.UNET_LAT, enc, 'UDP_RECEIVEFROM “'+asc(payload).slice(0,10)+'”');
  if (TR) TR.fw.push(`<span class="muted">${rel(st)}</span> uNet Mini: UDP ${PC_IP.join('.')}:${sp} → ${unitIPs()}:48888 (${payload.length} B) → ARC frame <span class="mono">${hexs(frame)}</span> → COBS ${enc.length} bytes at 115 200 baud (${SIM.fmtDur(enc.length*C.UB)})`);
}
function fwNet(s){ if (TR) TR.fw.push(`<span class="muted">network</span> ${s}`); }

/* ---------------- signal model (for meters / scope) ---------------- */
function signalOn(t){
  const s = SRC[D.src]; if (!s.dBu || !D.powered) return false;
  if (D.src==='cond' && phantomV(t) < 40) return false;            // a condenser capsule needs its +48 V — INFERRED threshold
  return true;
}
function sample(t){   // ADC input, full scale = 1 (8.2 dBu at the AK5572 = 0 dBFS, S6 block diagram)
  if (!signalOn(t)) return 0;
  const code = histAt(THAT.hist, t).code, g = gainDb(code)||5.6;
  const dBFS = SRC[D.src].dBu + g - 18.4 - 8.2;
  const a = Math.pow(10, dBFS/20)*Math.SQRT2, f = PROG[D.prog].f;
  let v;
  if (D.prog==='voice'){ const env = 0.55+0.45*Math.sin(2*Math.PI*3.7*t); v = env*(Math.sin(2*Math.PI*f*t)*0.7 + Math.sin(2*Math.PI*2*f*t)*0.35 + Math.sin(2*Math.PI*3*f*t+1)*0.2); }
  else v = Math.sin(2*Math.PI*f*t);
  return Math.max(-1, Math.min(1, a*v));
}
function levelDb(t){ let pk=0; for (let i=0;i<96;i++) pk=Math.max(pk, Math.abs(sample(t - i*0.02/96))); return pk>0? 20*Math.log10(pk) : -120; }

/* ---------------- power / boot ---------------- */
function bootElapsed(){ return D.boot? (performance.now()-D.boot.w0)/1000*D.boot.speed : 0; }
function bootStage(){ const e=bootElapsed(); let a=0; for (let i=0;i<BOOT.length;i++){ a+=BOOT[i][1]; if (e<a) return i; } return BOOT.length; }
function powerChanged(){
  const want = D.rj45==='poe' || D.dc;
  if (want === D.powered) return;
  D.powered = want;
  const t = startAction();
  if (!want){ D.lostCount=F.count; D.cycles=(D.cycles||0)+1; D.booted=false; D.boot=null; X.t=t; relay(0,0); F.phantom=PH_OFF; logAction('Power lost — the unit goes dark', ['Both PoE and the 5 V jack are gone: the STM32, uNet Mini, THAT5171 and OLED lose power.','Nothing is saved anywhere: there is no flash or EEPROM write in the firmware, so the gain and phantom settings are gone.']); return; }
  D.booted=false; D.boot={w0:performance.now(), speed:D.bootSpeed}; X.t=t; relay(0,0); hist(PH.hist, t+0.1, {k1:0,k2:1});
  OLED.fb.fill(0); hist(SNAP, t, {fb:OLED.fb.slice()});
  logAction('Power applied — main() starts', BOOT.map((b,i)=>`${i+1}. ${b[0]} <span class="muted">(${b[1]>=1?b[1].toFixed(1)+' s':SIM.fmtDur(b[1])})</span>`).concat([`Total ≈ ${BOOT_TOTAL.toFixed(1)} s before Pre-Mote can talk to it. The boot runs ${D.bootSpeed===1?'in real time':D.bootSpeed+'× faster than real time'} here (wall clock), outside the one-second timeline.`]));
  if (D.bootSpeed>=1000) finishBoot();
}
function startAction(){ let t=absNow(); if (t < M.lastProcessed - 1e-9){ M.epoch = Math.floor(M.lastProcessed)+1; t=absNow(); } return t; }
function logAction(name, fwLines){ LOG.unshift({name, t:absNow(), vb:[], fw:fwLines, wall:Date.now()}); if (LOG.length>80) LOG.length=80; SIM.refresh(); }
function firmwareInit(t, quiet){
  // state after main() reaches “USER CODE BEGIN 2” … the post-ARCinit part
  F.count=0; F.pCount=0; F.phantom=PH_OFF; F.pPhantom=PH_ON; F.frameId=0x11; F.expected=0; F.mainBusyUntil=-1;
  URX.cnt=0; ARX.len=0; ARX.idx=0; ARX.code=0; ARX.buf.fill(0);
  // getDeviceConfig response left in rxMessageBuffer by ARCinit: the device name sits at offset 35
  const dc=[0x07,0x00,0x00,0x24, D.dhcp?1:0,0, ...D.unitIP, ...D.unitIP, 255,255,0,0, 0,0,0,0, 24, 0,0,0,48, 0,0,0,0xF0, 0,0,0,96, ...Array.from('PreMo').map(c=>c.charCodeAt(0)), 0];
  dc.forEach((v,i)=>ARX.buf[i]=v);
  THAT.reg=0; THAT.err=false; THAT.busyFrom=-1; THAT.busyUntil=-1; hist(THAT.hist, t, {code:0}); hist(F.countHist, t, {v:0});
  hist(PH.hist, t, {k1:0,k2:1});
  OLED.fb.fill(0); for (let i=0;i<4;i++) LOGO[i].forEach((v,c)=>OLED.fb[(2+i)*128+c]=v); hist(SNAP, t, {fb:OLED.fb.slice()});
  X.t=t;
  at(t, 'init', ()=>{
    const s=X.t; ssdClear(); if (!quiet) fw('ssd1306ClearScreen() — the WBS logo goes away');
    ev('spi1', X.t, 0.010, 'that5171Reset(10): nRST low 10 ms'); X.t += 0.010;
    ev('spi1', X.t, C.HAL_CALL+C.SPI1_FRAME, 'W 0x1601 CNTRL: zero-crossing', {word:0x1601}); X.t += C.HAL_CALL+C.SPI1_FRAME;
    if (!quiet) fw('that5171Init(): reset, that5171WriteMode(THAT5171_MODE_ZC) → SPI1 0x1601 (CNTRL_REG 0x06, MODE 01 = gain changes on zero crossings)');
    ev('i2c', X.t, 0.010, 'akm5572Reset(10): PDN low'); X.t += 0.010;
    [['SoftReset(0)',0x01],['ChSum MONO_FIX',0x01],['DIF 24-bit I²S',0x02],['CKS AUTO',0x02],['SoftReset(1)',0x01]].forEach(([n,r])=>{
      const d = 7*9*C.I2C_BIT; ev('i2c', X.t, d, n+': 0x22 W '+h2(r)+' · 0x23 R · 0x22 W '+h2(r)+' v'); X.t += d; });
    if (!quiet) fw('akm5572Init(): five read-modify-write cycles on I2C1 to address 0x22 (mono, 24-bit I²S, automatic clock)');
    ssdMenuInit(); if (!quiet) fw('ssd1306MenuInit(): “Gain:” “dB” “Phantom:” “IP:” “MAC:”');
    ssdSetGain(0); ssdIP(D.unitIP); ssdMAC(D.mac);
    if (!quiet) fw(`ssd1306SetGain(0), ssd1306DisplayIPAddress(${D.unitIP.join('.')}), ssd1306DisplayMACAddress()`);
    ev('cpu', s, X.t-s, 'main(): init after ARCinit', {main:true});
    const bc=[D.unitIP[0], D.unitIP[1], 255, 255];
    if (!quiet) fw(`checkForPremote(): ARCudpSend(${bc.join('.')}, 48888, 9, “WBS PreMo”)`);
    ARCudpSend(bc, 48888, Array.from('WBS PreMo').map(c=>c.charCodeAt(0)), 'discovery broadcast “WBS PreMo”');
    F.mainBusyUntil = X.t; scheduleMain(X.t);
  });
  run();
}
function finishBoot(){
  if (!D.boot) return;
  D.boot=null; D.booted=true;
  const t = startAction();
  TR = {name:'Boot finished: firmware init after ARCinit()', t, tEnd:t, vb:[], fw:[]};
  firmwareInit(t, false);
  LOG.unshift(TR); TR.fw.push(`<b>Result:</b> gain 0 (5.6 dB), phantom OFF — whatever was set before the power cut is gone. Pre-Mote still shows its old slider and radio buttons.`);
  const tEnd = TR.tEnd; TR=null; advance(tEnd);
}
setInterval(()=>{ if (D.boot && bootElapsed()>=BOOT_TOTAL && /plugin=premo/.test(location.search)) finishBoot(); }, 150);
function advance(tEnd){ if (SIM.playing) { SIM.refresh(); return; } let r = tEnd - M.epoch + 2e-6; if (r >= 1){ M.epoch = Math.floor(tEnd); r = tEnd - M.epoch + 2e-6; } SIM.seek(Math.max(r>=SIM.t||tEnd>=M.epoch+SIM.t? r : SIM.t, 0)); }

/* ---------------- user actions ---------------- */
function act(name, fn){
  const t = startAction();
  TR = {name, t, tEnd:t, vb:[], fw:[]};
  if (!D.powered && !/Pre-Mote|lab|RJ45|DC jack|Combo|Race/.test(name)) TR.fw.push('The unit has no power — nothing happens.');
  else fn(t);
  run();
  LOG.unshift(TR); if (LOG.length>80) LOG.length=80;
  const tEnd = TR.tEnd; TR = null; advance(tEnd);
}
const unitLive = ()=> D.powered && D.booted;
const A = {
  turn(dir){ act(`Turn the encoder ${dir>0?'clockwise':'counter-clockwise'}`, t=>{ if (!unitLive()){ TR.fw.push('Still booting: not modelled. The EXTI interrupt is already enabled, but that5171Hspi is still NULL until that5171Init() — a turn now would call HAL_SPI on a NULL handle (undefined behaviour, inferred).'); return; }
      encTurn(t, dir); }); },
  spin(dir, n){ act(`Spin the encoder fast: ${n} detents ${dir>0?'clockwise':'counter-clockwise'} in ${n*12} ms`, t=>{ for (let i=0;i<n;i++) encTurn(t+i*0.012, dir); }); },
  press(hold){ act(hold>0.4? `Hold the encoder button ${hold.toFixed(2)} s` : 'Press the encoder button (short)', t=>{ encPress(t, hold); }); },
  plugMic(src){ const was=D.src; act(`Combo jack: ${SRC[src].name}`, t=>{ D.src=src; X.t=t;
      TR.fw.push(`J1 (Neutrik combo): ${SRC[src].name}. ${src==='line'?'TRS goes through R47/R48 4K75 (the −15 dB pad) into the same 1580_IN nets.':src==='none'?'':'XLR pins 2/3 → C36/C37 47 µF → THAT1580 IN1/IN2.'}`);
      if (src==='cond' && histAt(PH.hist,t).k1) TR.fw.push('<b style="color:var(--bad)">Hot-plugging a condenser with phantom ON:</b> the roadmap fault log (#1) suspects exactly this kills the THAT1580 / 5171. Protection diodes on the SUW1R5 “help but may not solve the problem 100%”.');
      if (src==='cond' && !histAt(PH.hist,t).k1) TR.fw.push('No +48 V on the PHANTOM net yet: the condenser stays silent until phantom is switched on.'); }); if (was===src) return; },
  setProg(p){ D.prog=p; SIM.refresh(); },
  rj45(v){ D.rj45=v; act(`RJ45: ${v==='poe'?'PoE switch port':v==='switch'?'plain (non-PoE) switch port':'cable unplugged'}`, ()=>{ TR.fw.push(v==='poe'?'AG9805M PoE module (PSU1) powers 5 V; the uNet Mini links at 100BASE-T.' : v==='switch'?'Link only — power must come from the 5 V jack (J3).':'Link down: AES67 stream and remote control stop.'); }); powerChanged(); },
  dc(on){ D.dc=on; act(`5 V DC jack: ${on?'plugged in':'unplugged'}`, ()=>{ TR.fw.push(on?'5V_EXT through SSA24 / FMMT717 OR-ing (schematic S5) — backup supply.':'5 V jack removed.'); }); powerChanged(); },
  doublePhantom(){ const a = F.phantom!==PH_ON; act(`Race: Pre-Mote phantom ${a?'On':'Off'}, then ${a?'Off':'On'} 40 ms later`, t=>{
      const p=APP.panels[0]; vb(`Two clicks 40 ms apart: rbPhantom${a?'On':'Off'}, then rbPhantom${a?'Off':'On'}`);
      p.on=a; pcSend(t, p, phPayload(a?1:0), 'PHANTOM '+(a?'on':'off')); p.on=!a; pcSend(t+0.040, p, phPayload(a?0:1), 'PHANTOM '+(a?'off':'on')); }); },
  rapidDrag(){ act('Pre-Mote: drag the slider 0 → 40 in 150 ms', t=>{ const p=APP.panels[0]; for (let v=8, i=0; v<=40; v+=4, i++){ appScroll(p, v, t + i*0.0167, true); } }); },
  lab(bytes){ act('Protocol lab: raw UDP to '+unitIPs()+':48888', t=>{ vb('(not Pre-Mote) a raw UDP datagram, like netcat'); pcSend(t, {premoIP:unitIPs()}, bytes, 'protocol lab'); }); },
  reset(){ EV=[]; PKTS=[]; LOG=[]; Q=[]; mainPending=null; M.epoch=0; M.lastProcessed=-1; D.rj45='poe'; D.dc=false; D.src='dyn'; D.prog='voice'; D.powered=true; D.booted=true; D.boot=null; D.uartFreeAt=-1;
    THAT.hist=[{t:-1e9,code:0}]; PH.hist=[{t:-1e9,k1:0,k2:1}]; SNAP=[{t:-1e9, fb:new Uint8Array(1024)}]; F.countHist=[{t:-1e9,v:0}];
    TR=null; firmwareInit(-0.6, true); EV=EV.filter(e=>e.t>=0); appInit(); SIM.seek(0); },
};

/* ================================================================
   Pre-Mote V2 (VB.NET, WinForms) — model of Form1 + premoControlPanel
   ================================================================ */
const APP = { panels:[], focus:0, ghost:0 };
function appInit(){ APP.panels=[]; APP.ghost=0; addPanelModel(); }
function addPanelModel(){
  const n = APP.panels.length;
  if (n > 7){ APP.ghost++; return null; }       // premoControlPanel_Load: If Form1.premoPanels.Count <= 7
  const p = { n, name:'MIC: '+n, tb:['111','13','5','9'+n], premoIP:'111.13.5.9'+n, value:0, label:'0', on:false,
    x: n<4? n*184 : (n-4)*184, y: n<4? 0 : 189 };
  APP.panels.push(p); return p;
}
function phPayload(v){ return [...Array.from('PHANTOM').map(c=>c.charCodeAt(0)), v]; }
function appScroll(p, v, t, inBatch){
  const req = v;
  if (v < 8) v = 0;
  p.value = v; p.label = v<8? String(v) : '+'+v;
  const s = 'Gain'+v, bytes = Array.from(s).map(c=>c.charCodeAt(0));
  if (!inBatch || req===8 || req>=40) {
    vb(`trbGain_Scroll: trbGain.Value = ${req}${req<8&&req!==0?' → <b>If trbGain.Value &lt; 8 Then trbGain.Value = 0</b>':''}`);
    vb(`Dim udpClient As New UdpClient() <span class="muted">(a new socket, source port ${sport}, never closed)</span>`);
    vb(`s = "Gain" + CStr(trbGain.Value) = "${s}" → Encoding.UTF8.GetBytes → ${hexs(bytes)}`);
    vb(`lblGainVal.Text = "${p.label}" · udpClient.Connect(IPAddress.Parse("${p.premoIP}"), 48888) · udpClient.Send(b, ${bytes.length})`);
  }
  ev('app', t, 0, s, {});
  pcSend(t, p, bytes, s);
}
function appGain(p, v, how){
  v = Math.max(0, Math.min(63, Math.round(v)));
  if (v === p.value) return;
  act(`Pre-Mote ${p.name}: ${how} → ${v}`, t=>{ appScroll(p, v, t); });
}
function appPhantom(p, on){
  if (p.on === on) return;
  act(`Pre-Mote ${p.name}: Phantom ${on?'On':'Off'}`, t=>{
    p.on = on;
    vb(`Click rb${on?'PhantomOn':'PhantomOff'} → RadioButton.Checked = True → PerformAutoUpdates unchecks rb${on?'PhantomOff':'PhantomOn'} first <span class="muted">(.NET order, ${inf})</span>`);
    vb(`rb${on?'PhantomOff':'PhantomOn'}_CheckedChanged: condition false (it is the one being unchecked) → nothing`);
    vb(`rb${on?'PhantomOn':'PhantomOff'}_CheckedChanged: rbPhantom${on?'On':'Off'}.Checked And Not rbPhantom${on?'Off':'On'}.Checked, premoIP set → s = "PHANTOM" + ChrW(&amp;H${on?1:0})`);
    vb(`Encoding.ASCII.GetBytes(s) → ${hexs(phPayload(on?1:0))} · New UdpClient · Connect("${p.premoIP}", 48888) · Send(b, 8)`);
    ev('app', t, 0, 'PHANTOM'+(on?'\\x01':'\\x00'), {});
    pcSend(t, p, phPayload(on?1:0), 'PHANTOM '+(on?'on':'off'));
  });
}
function appAdd(){
  act('Pre-Mote: click “Add Mic”', ()=>{
    vb('btnAddMic_Click: Dim c As New premoControlPanel() · Me.Controls.Add(c)');
    const p = addPanelModel();
    if (p){ vb(`premoControlPanel_Load: Count = ${p.n} ≤ 7 → "MIC: ${p.n}", IP "111" "13" "5" "9${p.n}" → premoIP = "${p.premoIP}"${p.n>=4?' (second row; btnAddMic moves to y = 415)':''}`);
      vb(`The new panel sends nothing until you touch it. ${p.premoIP===unitIPs()?'':'No PREmo lives at '+p.premoIP+' in this simulation.'}`); }
    else vb('premoControlPanel_Load: Count = 8 → the If block is skipped: no name, no IP, Location stays (0,0). Controls.Add put it at the back of the z-order, so it hides behind MIC: 0 — <b>nothing visible happens</b>.');
  });
}

function appHTML(){
  const P = APP.panels, n=P.length;
  const W = Math.max(13+56, ...P.map(p=>p.x+184)) + 3, btnY = n>4? 415 : 226, H = Math.max(btnY+23, ...P.map(p=>p.y+189)) + 3;
  const tb = (p)=>{
    const top=13, bot=132-13, y = top + (63-p.value)/63*(bot-top);
    let ticks=''; for (let i=0;i<=63;i++){ const yy = top+(63-i)/63*(bot-top); ticks += `<div style="position:absolute;left:31px;top:${yy.toFixed(1)}px;width:${i%8===0?5:3}px;height:1px;background:#777"></div>`; }
    return `<div class="pm-tb" data-p="${p.n}" tabindex="0" title="trbGain (TrackBar, Maximum 63, vertical). Drag, click the channel (±5), wheel or arrow keys" style="position:absolute;left:7px;top:19px;width:45px;height:132px;outline:none;cursor:pointer">
      <div style="position:absolute;left:13px;top:${top-2}px;width:4px;height:${bot-top+4}px;background:#e6e6e6;border:1px solid #a0a0a0;border-radius:2px"></div>${ticks}
      <div class="pm-thumb" style="position:absolute;left:5px;top:${(y-5).toFixed(1)}px;width:21px;height:10px;background:linear-gradient(#f6f6f6,#d8d8d8);border:1px solid #707070;border-radius:2px 6px 6px 2px;box-shadow:0 1px 1px rgba(0,0,0,.2)"></div></div>`;
  };
  const radio = (p,on)=>`<label class="pm-rb" data-p="${p.n}" data-on="${on?1:0}" style="position:absolute;left:${on?75:129}px;top:32px;display:flex;align-items:center;gap:3px;cursor:pointer"><span style="width:12px;height:12px;border-radius:50%;border:1px solid #707070;background:#fff;display:inline-flex;align-items:center;justify-content:center">${p.on===on?'<span style="width:6px;height:6px;border-radius:50%;background:#1a1a1a"></span>':''}</span>${on?'On':'Off'}</label>`;
  const panel = p=>`<div class="pm-panel" style="position:absolute;left:${p.x}px;top:${p.y}px;width:184px;height:189px">
      <fieldset style="position:absolute;left:4px;top:3px;width:177px;height:183px;margin:0;padding:0;border:1px solid #d0d0d0;border-radius:3px;box-sizing:border-box"><legend style="margin-left:6px;padding:0 2px;font-size:11px">${p.name}</legend></fieldset>
      <div style="position:absolute;left:4px;top:3px;width:177px;height:183px">
        <div style="position:absolute;left:54px;top:23px;width:115px;height:30px;border:1px solid #000"></div>
        <div style="position:absolute;left:54px;top:87px;width:114px;height:49px;border:1px solid #000"></div>
        <div style="position:absolute;left:72px;top:16px;background:#f0f0f0;padding:0 1px">Phantom</div>
        ${radio(p,true)}${radio(p,false)}
        <div style="position:absolute;left:72px;top:80px;background:#f0f0f0;padding:0 1px">Gain</div>
        <div class="pm-lbl" data-p="${p.n}" style="position:absolute;left:56px;top:93px;width:78px;height:37px;font-size:32px;line-height:37px;text-align:right">${p.label}</div>
        <div style="position:absolute;left:131px;top:101px;font-size:21px;line-height:26px">dB</div>
        ${tb(p)}
        ${p.tb.map((v,i)=>`<input class="pm-ip" data-p="${p.n}" data-i="${i}" value="${v}" maxlength="3" title="TextBox${i+1} — editable, but premoIP was fixed in premoControlPanel_Load (V2 has no Connect button)" style="position:absolute;left:${9+41*i}px;top:157px;width:36px;height:20px;box-sizing:border-box;font:11px Tahoma,Arial,sans-serif;padding:1px 3px;border:1px solid #abadb3;background:#fff;color:#000;border-radius:0">`).join('')}
      </div></div>`;
  return `<div class="pm-win" style="display:inline-block;max-width:100%;overflow:auto;border:1px solid #6d8fb3;border-radius:7px 7px 2px 2px;box-shadow:0 4px 18px rgba(0,0,0,.25);background:#c4d7ec;font:11px Tahoma,'Microsoft Sans Serif',Arial,sans-serif;color:#000">
    <div style="display:flex;align-items:center;gap:6px;padding:5px 6px 5px 8px;background:linear-gradient(#dbe8f6,#c4d7ec);border-radius:7px 7px 0 0">
      <span style="width:14px;height:14px;background:linear-gradient(135deg,#7aa7d9,#2c5d93);border-radius:2px;display:inline-block"></span>
      <span style="flex:1;font-size:12px;color:#1e395b">PreMote Control beta0.2</span>
      <span style="width:24px;height:16px;border:1px solid #8aa6c6;border-radius:3px;text-align:center;line-height:13px;background:#e7eff8">–</span><span style="width:24px;height:16px;border:1px solid #8aa6c6;border-radius:3px;text-align:center;line-height:13px;background:#e7eff8">□</span><span style="width:40px;height:16px;border:1px solid #a33;border-radius:3px;text-align:center;line-height:14px;background:linear-gradient(#e08a7c,#c4442f);color:#fff">✕</span></div>
    <div style="margin:0 6px 6px;position:relative;width:${W}px;height:${H}px;background:#f0f0f0;border:1px solid #8aa6c6">
      ${P.map(panel).join('')}
      <button class="pm-add" style="position:absolute;left:13px;top:${btnY}px;width:56px;height:23px;padding:0;font:11px Tahoma,Arial,sans-serif;color:#000;background:linear-gradient(#f2f2f2,#dcdcdc);border:1px solid #707070;border-radius:3px">Add Mic</button>
    </div></div>
    <div class="small muted" style="margin-top:6px">Replica of <span class="mono">Form1.Designer.vb</span> + <span class="mono">premoControlPanel.Designer.vb</span> (Pre-Mote V2, “PreMote Control beta0.2”), drawn 1:1 in pixels. Window chrome is Windows-7 style ${inf}. ${APP.ghost?`<b>${APP.ghost} invisible panel(s)</b> hidden behind MIC: 0 (9th+ “Add Mic”). `:''}</div>`;
}
function refreshApp(a){
  if (!a || APP.dragging) return;
  const ae=document.activeElement;
  if (ae && a.contains(ae) && ae.tagName==='INPUT') return;
  const fp = ae && ae.classList && ae.classList.contains('pm-tb') && a.contains(ae) ? ae.dataset.p : null;
  a.innerHTML=appHTML(); bindApp(a);
  if (fp!==null){ const n=a.querySelector(`.pm-tb[data-p="${fp}"]`); if (n) n.focus({preventScroll:true}); }
}
function bindApp(root){
  root.querySelectorAll('.pm-tb').forEach(el=>{
    const p = APP.panels[+el.dataset.p];
    const valAt = y=>{ const r=el.getBoundingClientRect(), yy=(y-r.top)*132/r.height; return Math.round(63 - (yy-13)/(132-26)*63); };
    el.addEventListener('mousedown', e=>{
      e.preventDefault(); el.focus(); APP.focus=p.n;
      const r=el.getBoundingClientRect(), top=13+(63-p.value)/63*106, yy=(e.clientY-r.top)*132/r.height;
      if (Math.abs(yy-top) > 7){ appGain(p, p.value + (yy<top? 5 : -5), 'click on the channel (LargeChange 5)'); return; }
      let batch = null, wFirst = 0; APP.dragging = true;
      const mv = ev2=>{ const v=Math.max(0,Math.min(63,valAt(ev2.clientY))); if (v===p.value) return;
        if (!batch){ const t=startAction(); TR = {name:`Pre-Mote ${p.name}: drag the slider`, t, tEnd:t, vb:[], fw:[]}; batch=TR; wFirst=performance.now(); }
        TR = batch; appScroll(p, v, batch.t + (performance.now()-wFirst)/1000, true); run(); TR=null;
        const th=el.querySelector('.pm-thumb'); if (th) th.style.top=(13+(63-p.value)/63*106-5).toFixed(1)+'px';
        const lb=root.querySelector(`.pm-lbl[data-p="${p.n}"]`); if (lb) lb.textContent=p.label;
        SIM.refresh(); };
      const up = ()=>{ window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); APP.dragging=false;
        if (batch){ batch.name += ` → ${p.value}`; LOG.unshift(batch); advance(batch.tEnd); } else SIM.refresh(); };
      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    el.addEventListener('wheel', e=>{ e.preventDefault(); appGain(p, p.value + (e.deltaY<0?1:-1), 'mouse wheel'); }, {passive:false});
    el.addEventListener('keydown', e=>{
      const m = {ArrowUp:1, ArrowRight:1, ArrowDown:-1, ArrowLeft:-1, PageUp:5, PageDown:-5}[e.key];
      if (m!==undefined){ e.preventDefault(); e.stopPropagation(); appGain(p, p.value+m, 'key '+e.key); }
      if (e.key==='Home'){ e.preventDefault(); appGain(p, 0, 'key Home'); } if (e.key==='End'){ e.preventDefault(); appGain(p, 63, 'key End'); }
    });
  });
  root.querySelectorAll('.pm-rb').forEach(el=> el.addEventListener('click', e=>{ e.preventDefault(); appPhantom(APP.panels[+el.dataset.p], el.dataset.on==='1'); }));
  root.querySelectorAll('.pm-ip').forEach(el=>{ el.addEventListener('change', ()=>{ const p=APP.panels[+el.dataset.p]; p.tb[+el.dataset.i]=el.value;
      act(`Pre-Mote ${p.name}: edit IP box ${+el.dataset.i+1} → “${el.value}”`, ()=>{ vb(`TextBox${+el.dataset.i+1}.Text = "${esc(el.value)}" — no handler: btnConnect_Click is commented out in V2`); vb(`premoIP is still "${p.premoIP}" (set once in premoControlPanel_Load) → packets keep going there`); }); });
    el.addEventListener('keydown', e=>e.stopPropagation()); });
  const add = root.querySelector('.pm-add'); if (add) add.onclick = appAdd;
}

/* ================================================================
   DRAWING: OLED, display board (front), main board (top / bottom)
   ================================================================ */
function bootFb(){
  const fb = new Uint8Array(1024); if (!D.powered) return fb;
  const st = bootStage(); if (BOOT[st] && BOOT[st][2]==='logo') for (let i=0;i<4;i++) LOGO[i].forEach((v,c)=>fb[(2+i)*128+c]=v);
  return fb;
}
function fbAt(t){ if (!D.powered) return new Uint8Array(1024); if (D.boot) return bootFb(); return histAt(SNAP, t).fb; }
function oledPath(fb, x0, y0, px){
  let d='';
  for (let pg=0;pg<8;pg++) for (let c=0;c<128;c++){ const v=fb[pg*128+c]; if (!v) continue;
    for (let b=0;b<8;b++) if ((v>>b)&1){ const x=x0+c*px, y=y0+(pg*8+b)*px; d+=`M${x.toFixed(1)} ${y.toFixed(1)}h${(px*0.86).toFixed(2)}v${(px*0.86).toFixed(2)}h-${(px*0.86).toFixed(2)}z`; } }
  return d;
}
function oledSVG(fb, w){
  return `<svg viewBox="0 0 548 280" style="width:${w||'100%'};max-width:560px;background:#030404;border-radius:6px;display:block" role="img" aria-label="SSD1306 128 × 64 OLED"><path d="${oledPath(fb,2,4,4.27)}" fill="#f4f6ff"/></svg>`;
}
function frontSVG(t){
  const fb = fbAt(t), px=4.3, ox=351, oy=543;
  const knobAng = (histAt(F.countHist,t).v*17)%360;
  const lit = D.powered;
  return `<svg viewBox="0 0 1666 1200" role="img" aria-label="PreMo-2 ISS2 display board (real Altium assembly drawing)" style="width:100%;max-width:820px;display:block;border-radius:10px">
    <defs><radialGradient id="pmKnob" cx="40%" cy="35%"><stop offset="0" stop-color="#5b5f63"/><stop offset="1" stop-color="#16181a"/></radialGradient>
      <filter id="pmGlow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="8" y="8" width="1650" height="1184" rx="18" fill="#1d4a34"/>
    ${[[144,117],[1523,117],[144,1048],[1523,1048]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="44" fill="#c9b37a"/><circle cx="${x}" cy="${y}" r="27" fill="var(--bg)"/>`).join('')}
    <rect x="272" y="368" width="708" height="720" rx="8" fill="#14161a"/>
    <rect x="337" y="530" width="578" height="296" rx="6" fill="#050606"/>
    <g ${lit?'filter="url(#pmGlow)"':''}><path d="${oledPath(fb, ox, oy, px)}" fill="#f2f5ff"/></g>
    <rect x="1098" y="442" width="317" height="472" rx="10" fill="#b8bcc0"/><rect x="1120" y="470" width="273" height="416" rx="8" fill="#8d9296"/>
    <image href="${ASSET}premo-display-top.png" width="1666" height="1200"/>
    <g class="pm-knob" style="cursor:pointer">
      <circle cx="1256" cy="678" r="230" fill="transparent"/>
      <circle cx="1256" cy="678" r="158" fill="url(#pmKnob)" stroke="#0b0c0d" stroke-width="6"/>
      <g transform="rotate(${knobAng} 1256 678)">${Array.from({length:20},(_,i)=>`<line x1="1256" y1="530" x2="1256" y2="552" stroke="#2b2e31" stroke-width="7" transform="rotate(${i*18} 1256 678)"/>`).join('')}<line x1="1256" y1="560" x2="1256" y2="610" stroke="#e8e8e0" stroke-width="10" stroke-linecap="round"/></g>
      <text x="1110" y="690" font-size="46" fill="#e8e8e0" opacity=".7" text-anchor="middle">⟲</text><text x="1402" y="690" font-size="46" fill="#e8e8e0" opacity=".7" text-anchor="middle">⟳</text>
    </g>
  </svg>`;
}
/* Main-board artwork coordinates are pixels of the 150 dpi cut of PreMo-ISS1-Assembly.PDF */
function mainSVG(t){
  const top = D.side==='top', relays = histAt(PH.hist, t), busy = EV.some(e=>e.lane==='busy' && t>=e.t && t<e.t+e.dur);
  const urx = EV.some(e=>(e.lane==='urx'||e.lane==='utx') && t>=e.t && t<e.t+e.dur);
  const hl = (x,y,w,h,col,on,tip)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${on?col:'transparent'}" fill-opacity="${on?.45:0}" stroke="${on?col:'transparent'}" stroke-width="5"><title>${tip}</title></rect>`;
  if (!top){
    return `<svg viewBox="0 0 1509 971" role="img" aria-label="Main board bottom (assembly drawing)" style="width:100%;display:block;border-radius:8px">
      <rect width="1509" height="971" rx="14" fill="#1d4a34"/>
      ${hl(100,60,90,90,'#7dff6a',relays.k1&&D.powered,'K1 CPC1017N: +48 V → PHANTOM (PA0 PHANTOM_ON)')}${hl(14,60,90,90,'#ffb43a',relays.k2&&D.powered,'K2 CPC1017N: PHANTOM → AGND (PA1 PHANTOM_OFF)')}
      ${hl(600,410,430,165,'#5aa9e6',urx,'P1 mini-PCIe: Archwave uNet Mini (UART traffic now)')}
      ${hl(410,640,90,70,'#ffb43a',busy,'U2 THAT5171: BUSY = zero-crossing update pending')}
      ${hl(400,745,80,60,'#7dff6a',D.powered&&signalOn(t),'U1 THAT1580 preamp: signal present')}
      ${hl(760,690,110,60,'#7dff6a',D.powered&&D.booted,'U3 AK5572 ADC running (I²S to the uNet)')}
      <image href="${ASSET}premo-main-bottom.png" width="1509" height="971"/>
      <text x="20" y="955" font-size="30" fill="#e8e8e0" opacity=".8">BOTTOM (seen from below) · K1 ${relays.k1?'ON':'off'} · K2 ${relays.k2?'ON':'off'} · +48 V rail ${phantomV(t).toFixed(1)} V</text></svg>`;
  }
  const mic = D.src, eth = D.rj45;
  return `<svg viewBox="0 0 1584 1008" role="img" aria-label="Main board top (assembly drawing)" style="width:100%;display:block;border-radius:8px">
    <rect width="1584" height="1008" rx="14" fill="#1d4a34"/>
    ${hl(720,215,92,90,'#5aa9e6',D.powered&&D.booted&&EV.some(e=>e.lane==='cpu'&&t>=e.t&&t<e.t+e.dur),'U6 STM32F070CBT6 — in an interrupt / main-loop task right now')}
    <image href="${ASSET}premo-main-top.png" width="1584" height="1008"/>
    <g class="pm-j1" style="cursor:pointer"><rect x="1262" y="398" width="322" height="324" fill="transparent" stroke="${mic==='none'?'#e8e8e0':'#7dff6a'}" stroke-dasharray="${mic==='none'?'14 10':'0'}" stroke-width="5" rx="12"><title>J1 Neutrik combo (XLR + TRS) — click to change what is plugged in</title></rect>
      ${mic!=='none'?`<rect x="1470" y="520" width="114" height="80" rx="16" fill="${mic==='line'?'#3a6fb5':'#222'}" stroke="#999" stroke-width="3"/><text x="1420" y="760" font-size="34" fill="#7dff6a" text-anchor="middle">${mic==='dyn'?'dynamic mic':mic==='cond'?'condenser mic':'line (TRS)'}</text>`:'<text x="1420" y="760" font-size="32" fill="#e8e8e0" text-anchor="middle" opacity=".8">empty — click</text>'}</g>
    <g class="pm-j2" style="cursor:pointer"><rect x="16" y="788" width="190" height="214" fill="transparent" stroke="${eth==='none'?'#e8e8e0':'#7dff6a'}" stroke-dasharray="${eth==='none'?'14 10':'0'}" stroke-width="5" rx="10"><title>J2 RJ45 — click: PoE switch → plain switch → unplugged</title></rect>
      ${eth!=='none'?`<rect x="40" y="930" width="120" height="78" fill="#2b5f9e"/><circle cx="190" cy="808" r="12" fill="${D.powered&&D.booted?'#7dff6a':'#444'}"/>`:''}
      <text x="230" y="985" font-size="32" fill="${eth==='none'?'#e8e8e0':'#7dff6a'}">${eth==='poe'?'PoE switch':eth==='switch'?'switch (no PoE)':'RJ45 empty'}</text></g>
    <g class="pm-j3" style="cursor:pointer"><rect x="10" y="70" width="130" height="150" fill="transparent" stroke="${D.dc?'#7dff6a':'#e8e8e0'}" stroke-dasharray="${D.dc?'0':'14 10'}" stroke-width="5" rx="10"><title>J3 5 V DC jack (PJ-047AH) — click to plug / unplug</title></rect>
      ${D.dc?'<rect x="0" y="118" width="40" height="56" fill="#333"/>':''}<text x="20" y="250" font-size="30" fill="${D.dc?'#7dff6a':'#e8e8e0'}">${D.dc?'5 V in':'5 V jack'}</text></g>
    <text x="560" y="990" font-size="30" fill="#e8e8e0" opacity=".85">${D.powered? (D.booted? 'running' : 'booting… '+bootElapsed().toFixed(1)+' s / '+BOOT_TOTAL.toFixed(1)+' s') : 'no power'} · ${D.rj45==='poe'?'PoE (AG9805M)':D.dc?'5 V jack':'—'}</text>
  </svg>`;
}
function bindUnit(root){
  const k = root.querySelector('.pm-knob');
  if (k){
    let w0=0, zone=0;
    k.addEventListener('mousedown', e=>{ const r=k.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; zone = x<0.36? -1 : x>0.64? 1 : 0; w0=performance.now(); e.preventDefault(); });
    k.addEventListener('mouseup', ()=>{ if (!w0) return; const held=(performance.now()-w0)/1000; w0=0; if (zone) A.turn(zone); else A.press(held>0.3? held : 0.12); });
    k.addEventListener('wheel', e=>{ e.preventDefault(); A.turn(e.deltaY<0? 1 : -1); }, {passive:false});
  }
  const j1=root.querySelector('.pm-j1'); if (j1) j1.onclick=()=>{ const o=['none','dyn','cond','line']; A.plugMic(o[(o.indexOf(D.src)+1)%4]); };
  const j2=root.querySelector('.pm-j2'); if (j2) j2.onclick=()=>{ const o=['poe','switch','none']; A.rj45(o[(o.indexOf(D.rj45)+1)%3]); };
  const j3=root.querySelector('.pm-j3'); if (j3) j3.onclick=()=> A.dc(!D.dc);
}
function unitControls(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">Encoder</span><button data-u="l">⟲ turn</button><button data-u="p">press</button><button data-u="h">hold 0.6 s</button><button data-u="r">turn ⟳</button>
    <button data-u="sf" title="5 detents 12 ms apart">spin fast ⟳⟳</button>
    <span class="small muted" style="margin-left:6px">Keys: Q E · W (press) · L (hold)</span></div>
    <div class="small muted" style="margin-top:4px">Click the knob's left or right side to turn it, its centre to press it (hold the mouse button over 0.55 s for a long press). The wheel turns it too.</div>`;
}
function bindUnitControls(root){
  const m = {l:()=>A.turn(-1), r:()=>A.turn(1), p:()=>A.press(0.12), h:()=>A.press(0.6), sf:()=>A.spin(1,5)};
  root.querySelectorAll('[data-u]').forEach(b=> b.onclick=()=>m[b.dataset.u]());
}
document.addEventListener('keydown', e=>{
  if (!window.__premoActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('pm-tb')) return;
  const m = {q:()=>A.turn(-1), e:()=>A.turn(1), w:()=>A.press(0.12), l:()=>A.press(0.6)}[e.key.toLowerCase()];
  if (m){ m(); e.preventDefault(); }
});
function unitCard(t, opts){
  opts = opts||{};
  return `<div id="pmFront">${frontSVG(t)}</div>${unitControls()}
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px">
      <label class="small">Combo jack <select id="pmSrc">${Object.keys(SRC).map(k=>`<option value="${k}" ${k===D.src?'selected':''}>${SRC[k].name}</option>`).join('')}</select></label>
      <label class="small">Programme <select id="pmProg">${Object.keys(PROG).map(k=>`<option value="${k}" ${k===D.prog?'selected':''}>${PROG[k].name}</option>`).join('')}</select></label>
      <label class="small">Boot speed <select id="pmBoot">${[[1,'real time (16 s)'],[4,'4× (4 s)'],[16,'16×'],[1000,'instant']].map(([v,l])=>`<option value="${v}" ${+v===D.bootSpeed?'selected':''}>${l}</option>`).join('')}</select></label>
    </div>
    <div style="margin-top:10px;display:flex;gap:6px;align-items:center"><b class="small">Main board</b><button data-side="top" class="${D.side==='top'?'on':''}">top: connectors</button><button data-side="bottom" class="${D.side==='bottom'?'on':''}">bottom: uNet, THAT, relays</button></div>
    <div id="pmMain" style="margin-top:6px">${mainSVG(t)}</div>
    <p class="small muted">Artwork: the Altium assembly drawings <span class="mono">PCB - DISPLAY BOARD/ISS2/PreMo-2-ISS2.PDF</span> (front: OLED U101 + encoder E101) and <span class="mono">PCB/backup29…/PreMo-ISS1-Assembly.PDF</span> (main board), cut at 150 dpi. Solder-mask colour, knob cap and the OLED module's black frame are ${inf}; the enclosure is not in the archive. OLED pixels sit on the 21.7 × 10.9 mm window of the ER-OLEDM0.96-1W.</p>`;
}
function bindUnitCard(m){
  bindUnit(m); bindUnitControls(m);
  const s=m.querySelector('#pmSrc'); if (s) s.onchange=e=>A.plugMic(e.target.value);
  const p=m.querySelector('#pmProg'); if (p) p.onchange=e=>A.setProg(e.target.value);
  const b=m.querySelector('#pmBoot'); if (b) b.onchange=e=>{ D.bootSpeed=+e.target.value; if (D.boot){ const el=bootElapsed(); D.boot.speed=D.bootSpeed; D.boot.w0=performance.now()-el*1000/D.bootSpeed; } };
  m.querySelectorAll('[data-side]').forEach(x=> x.onclick=()=>{ D.side=x.dataset.side; SIM.refresh(); });
}
function redrawUnit(m, t){
  const f=m.querySelector('#pmFront'); if (f){ f.innerHTML=frontSVG(t); bindUnit(f); }
  const mm=m.querySelector('#pmMain'); if (mm){ mm.innerHTML=mainSVG(t); bindUnit(mm); }
  m.querySelectorAll('[data-side]').forEach(x=>x.classList.toggle('on', x.dataset.side===D.side));
}
function bootTicker(m, redraw){
  let last=-1, lastW=0;
  SIM.on('frame', ()=>{
    if (!D.boot) return;
    const now=performance.now(); if (now-lastW < 120) return; lastW=now;
    const st=bootStage(); redraw(st!==last); last=st;
  });
}

/* ---------------- timeline lanes ---------------- */
function laneEvents(lane, a, b){ const o=[]; for (const e of EV){ if (e.lane===lane && e.t+(e.dur||0) >= a && e.t <= b) o.push(e); } return o; }
function lanes(){
  const css=n=>SIM.css(n), E=M.epoch, live = D.powered && D.booted, net = live && D.rj45!=='none';
  const txt = (c,s,x,y,col)=>{ c.fillStyle=col||css('--ink'); c.font='10.5px '+css('--sans'); c.fillText(s,x,y); };
  const boxes = (lane, col, opt)=>(c,X,t0,t1,y,h)=>{
    const es = laneEvents(lane, E+t0, E+t1);
    for (const e of es){ const xa=X(e.t-E), xb=Math.max(xa+1.5, X(e.t-E+(e.dur||0)));
      c.fillStyle = e.skip||e.bad? css('--bad') : e.block? css('--ink2') : (opt&&opt.color? opt.color(e) : col);
      c.globalAlpha = e.block? .3 : e.small? .45 : .85; c.fillRect(xa, y+4, xb-xa, h-8); c.globalAlpha=1;
      if (opt && opt.bits && xb-xa > 150 && e.word!==undefined) bitsSPI(c, xa, xb, y, h, e.word);
      else if (opt && opt.bits && xb-xa > 110 && e.b!==undefined) bitsUART(c, xa, xb, y, h, e.b);
      else if (xb-xa > 34){ c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); txt(c, e.label||'', xa+3, y+h/2+4, e.block? css('--ink') : '#fff'); c.restore(); }
      else if (e.first && e.label && X(e.t-E) > -50) txt(c, e.label, xa+2, y+10, css('--ink2'));
    }
  };
  function bitsUART(c, xa, xb, y, h, b){
    const bits=[0]; for (let i=0;i<8;i++) bits.push((b>>i)&1); bits.push(1);
    const w=(xb-xa)/10; c.fillStyle=SIM.css('--lane'); c.fillRect(xa,y+3,xb-xa,h-6); c.strokeStyle=SIM.css('--accent2'); c.lineWidth=1.6; c.beginPath();
    bits.forEach((v,i)=>{ const yy = v? y+6 : y+h-6; if (i===0) c.moveTo(xa, y+6); c.lineTo(xa+i*w, yy); c.lineTo(xa+(i+1)*w, yy); }); c.stroke();
    c.fillStyle=SIM.css('--ink'); c.font='9px '+SIM.css('--mono'); bits.forEach((v,i)=>c.fillText(i===0?'S':i===9?'P':String(v), xa+i*w+2, y+h/2+3)); c.fillText('0x'+h2(b), xb-30, y+11);
  }
  function bitsSPI(c, xa, xb, y, h, word){
    const w=(xb-xa)/16; c.fillStyle=SIM.css('--lane'); c.fillRect(xa,y+3,xb-xa,h-6); c.fillStyle=SIM.css('--ink'); c.font='9px '+SIM.css('--mono');
    for (let i=0;i<16;i++){ const v=(word>>(15-i))&1; c.fillStyle= i<8? SIM.css('--warn') : SIM.css('--accent'); c.globalAlpha=v? .9:.15; c.fillRect(xa+i*w+1, y+5, w-2, h-10); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.fillText(String(v), xa+i*w+w/2-3, y+h/2+3); }
  }
  const L = [];
  L.push({label:'Pre-Mote (PC, VB.NET)', h:22, draw(c,X,t0,t1,y,h){ for (const e of laneEvents('app',E+t0,E+t1)){ const x=X(e.t-E); c.fillStyle=css('--warn'); c.beginPath(); c.moveTo(x,y+4); c.lineTo(x+5,y+11); c.lineTo(x,y+18); c.lineTo(x-5,y+11); c.fill(); txt(c, e.label, x+7, y+15); } }});
  L.push({label:'Ethernet: AES67 · PTP · UDP 48888', h:30, draw(c,X,t0,t1,y,h){
    if (net){ SIM.pulses(c,X,t0,t1,y+h*0.5,h*0.5,C.PKT,0.00013,C.WIRE,css('--accent'),'AES67 RTP packets “MIC OUT” '+inf.replace(/<[^>]+>/g,''));
      SIM.pulses(c,X,t0,t1,y,h*0.5,C.PTP,0.031,8e-6,css('--ink2'),'PTP Sync'); }
    else txt(c, D.rj45==='none'? 'no cable' : 'no stream (unit off or booting)', X(t0)+6, y+h/2+4, css('--ink2'));
    for (const e of laneEvents('eth',E+t0,E+t1)){ const xa=X(e.t-E), xb=Math.max(xa+2, X(e.t-E+e.dur)); c.fillStyle= e.dir==='pc→unit'? css('--warn') : css('--accent2'); c.fillRect(xa,y+2,xb-xa,h-4); txt(c, e.label, xa+4, y+11); }
  }});
  L.push({label:'USART1 RX ← uNet (ARC)', h:26, draw: boxes('urx', css('--accent2'), {bits:true})});
  L.push({label:'USART1 TX → uNet (ARC)', h:26, draw: boxes('utx', css('--warn'), {bits:true})});
  L.push({label:'STM32F070 CPU (ISR / main)', h:30, draw(c,X,t0,t1,y,h){
    if (!live){ txt(c, D.powered? 'booting (see the power-up card)' : 'off', X(t0)+6, y+h/2+4, css('--ink2')); return; }
    SIM.pulses(c,X,t0,t1,y+h-9,8,C.TICK,0,1.2e-6,css('--ink2'),'SysTick');
    const span=t1-t0; if (span < 40e-6) SIM.pulses(c,X,t0,t1,y+2,8,C.LOOP_T,0,C.LOOP_T*0.45,css('--grid'),'while(1)');
    else { c.fillStyle=css('--grid'); c.fillRect(X(t0), y+3, X(t1)-X(t0), 6); }
    boxes('cpu', css('--accent'), {color:e=> e.isr? css('--bad') : css('--accent')})(c,X,t0,t1,y+4,h-8);
  }});
  L.push({label:'SPI1 → THAT5171 (16-bit)', h:26, draw: boxes('spi1', css('--warn'), {bits:true})});
  L.push({label:'THAT5171 BUSY (PB7)', h:20, draw: boxes('busy', css('--warn'))});
  L.push({label:'Preamp gain (dB) / OLED says', h:40, draw(c,X,t0,t1,y,h){
    const yv = db=> y+h-4 - (Math.max(0,db)/70)*(h-8);
    c.strokeStyle=css('--accent'); c.lineWidth=2; c.beginPath(); let first=true;
    const pts = [t0]; THAT.hist.forEach(e=>{ const r=e.t-E; if (r>t0 && r<t1) pts.push(r); }); pts.push(t1);
    pts.forEach((tt,i)=>{ const db=gainDb(histAt(THAT.hist,E+tt-1e-12).code)||5.6, db2=gainDb(histAt(THAT.hist,E+tt).code)||5.6; const x=X(tt); if (first){ c.moveTo(x,yv(db2)); first=false; } else { c.lineTo(x,yv(db)); c.lineTo(x,yv(db2)); } });
    c.stroke();
    c.setLineDash([4,3]); c.strokeStyle=css('--warn'); c.beginPath(); first=true; const pc=[t0]; F.countHist.forEach(e=>{ const r=e.t-E; if (r>t0&&r<t1) pc.push(r); }); pc.push(t1);
    pc.forEach(tt=>{ const v=histAt(F.countHist,E+tt-1e-12).v, v2=histAt(F.countHist,E+tt).v; const x=X(tt); if (first){ c.moveTo(x,yv(v2)); first=false; } else { c.lineTo(x,yv(v)); c.lineTo(x,yv(v2)); } }); c.stroke(); c.setLineDash([]);
    const cur=histAt(THAT.hist,E+SIM.t).code; txt(c, `${gainDb(cur)} dB (code ${cur}) · OLED “${histAt(F.countHist,E+SIM.t).v}”`, X(t0)+4, y+11);
  }});
  L.push({label:'SPI2 → SSD1306 OLED', h:24, draw: boxes('spi2', css('--accent2'))});
  L.push({label:'OLED panel refresh', h:18, draw(c,X,t0,t1,y,h){ if (D.powered) SIM.pulses(c,X,t0,t1,y,h,C.OLED,0.002,0.0004,css('--ink2'),'frames '+'(inferred rate)'); }});
  L.push({label:'Phantom: K1 / K2 · +48 V rail', h:34, draw(c,X,t0,t1,y,h){
    const N=200; c.strokeStyle=css('--bad'); c.lineWidth=1.8; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=phantomV(E+tt), yy=y+h-4-(v/50)*(h-8); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke();
    for (const e of laneEvents('ph',E+t0,E+t1)){ const x=X(e.t-E); c.strokeStyle=css('--ink'); c.beginPath(); c.moveTo(x,y+2); c.lineTo(x,y+h-2); c.stroke(); txt(c, e.label, x+3, y+11); }
    txt(c, phantomV(E+SIM.t).toFixed(1)+' V', X(t1)-48, y+h-6, css('--bad'));
  }});
  L.push({label:'Encoder A / B / SW', h:22, draw: boxes('enc', css('--ink2'))});
  L.push({label:'I²S LRCK 48 kHz → uNet', h:18, draw(c,X,t0,t1,y,h){ if (live) SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,0.5/C.FS,css('--accent'),'LRCK periods (48 kHz '+'inferred)'); }});
  L.push({label:'I²C1 → AK5572', h:20, draw: boxes('i2c', css('--accent'))});
  return L;
}

/* ---------------- state at the playhead ---------------- */
function cpuAt(t){
  if (!D.powered) return {s:'off'}; if (D.boot) return {s:'boot', step:bootStage()};
  let best=null; for (const e of EV) if (e.lane==='cpu' && t>=e.t && t<e.t+e.dur && (!best || e.isr)) best=e;
  if (best) return {s: best.isr? 'isr':'main', e:best};
  const ph = ((t % C.LOOP_T)+C.LOOP_T)%C.LOOP_T < C.LOOP_T/2 ? 0 : 1; return {s:'loop', ph};
}
function inspectHTML(t){
  const cpu=cpuAt(t), code=histAt(THAT.hist,t).code, ph=histAt(PH.hist,t), busy=EV.find(e=>e.lane==='busy'&&t>=e.t&&t<e.t+e.dur), ub=EV.find(e=>e.lane==='urx'&&t>=e.t&&t<e.t+e.dur);
  const cpuTxt = cpu.s==='off'? 'no power' : cpu.s==='boot'? 'booting: '+BOOT[Math.min(cpu.step,BOOT.length-1)][0] : cpu.s==='isr'||cpu.s==='main'? cpu.e.label : `while(1) polling: ${cpu.ph? 'if (pCount != count)' : 'if (pPhantom != phantom)'}`;
  return `<table class="kv">
    <tr><th>CPU</th><td class="mono small">${esc(cpuTxt)}</td></tr>
    <tr><th>count / pCount</th><td class="mono">${F.count} / ${F.pCount} <span class="muted">(latest)</span> · OLED shows “${histAt(F.countHist,t).v}”</td></tr>
    <tr><th>THAT5171 gain</th><td class="mono">code ${code} = <b>${gainDb(code)} dB</b> applied${busy?' · <span style="color:var(--warn)">BUSY (update pending)</span>':''}${THAT.err?' · ERR':''}</td></tr>
    <tr><th>phantom / pPhantom</th><td class="mono">${F.phantom===PH_ON?'ON':'OFF'} / ${F.pPhantom===PH_ON?'ON':'OFF'} · K1 ${ph.k1?'ON':'off'} K2 ${ph.k2?'ON':'off'} · rail ${phantomV(t).toFixed(1)} V</td></tr>
    <tr><th>USART1 RX</th><td class="mono small">${ub? 'byte 0x'+h2(ub.b)+' on the wire' : 'idle'} · rxCount ${URX.cnt}</td></tr>
    <tr><th>Audio</th><td class="mono small">${D.powered&&D.booted? `I²S frame ${Math.floor((t-M.epoch)*C.FS).toLocaleString()} · AES67 packet ${Math.floor((t-M.epoch)/C.PKT)} · level ${levelDb(t).toFixed(1)} dBFS` : '—'}</td></tr>
    <tr><th>Network</th><td class="mono small">${unitIPs()}:48888 · link ${D.rj45==='none'?'down':'up'} · ${D.powered? (D.booted?'UDP server 0 open':'not yet listening') : 'off'}</td></tr>
  </table>`;
}
function traceHTML(e){
  if (!e) return '<div class="muted">Turn the knob, or use Pre-Mote. Each step the VB.NET app and the STM32 firmware take is listed here.</div>';
  return `<div><b>${esc(e.name)}</b> <span class="muted">at ${SIM.fmtT(((e.t-M.epoch)%1+1)%1)}</span></div>
    <div class="grid2" style="gap:8px;margin-top:4px"><div><div class="small muted">Pre-Mote (VB.NET)</div><div class="log" style="max-height:260px">${(e.vb.length?e.vb:['—']).map(s=>`<div>${s}</div>`).join('')}</div></div>
    <div><div class="small muted">Network + STM32 firmware</div><div class="log" style="max-height:260px">${(e.fw.length?e.fw:['—']).map(s=>`<div>→ ${s}</div>`).join('')}</div></div></div>`;
}
function packetHTML(pk){
  if (!pk) return '<div class="muted">No UDP traffic yet.</div>';
  const seg=(bytes,col,lbl)=>`<span title="${lbl}" style="background:color-mix(in srgb, ${col} 22%, transparent);border-radius:3px;padding:0 2px;margin-right:3px">${hexs(bytes)}</span>`;
  const f=pk.fr;
  return `<div class="small"><b>${pk.dir}</b> ${pk.src}:${pk.sp} → ${pk.dst}:${pk.dp} · ${pk.payload.length} B “${esc(asc(pk.payload))}” — <i>${esc(pk.fate)}</i></div>
    <div class="mono small" style="line-height:1.9;word-break:break-all;margin-top:4px">${seg(f.eth,'var(--ink2)','Ethernet II: dst MAC, src MAC, type 0x0800')}${seg(f.ip,'var(--accent2)','IPv4 header: 45, length, ID, TTL 128, proto 17 UDP, checksum, src, dst')}${seg(f.udp,'var(--warn)','UDP header: src port, dst port 48888 (0xBEF8), length, checksum')}${seg(f.payload,'var(--accent)','payload')}</div>
    <div class="small muted">Ethernet · IPv4 · UDP (dst port 0xBEF8 = 48888) · <b>payload</b>. MAC addresses and the PC's address are placeholders ${inf}.</div>
    ${pk.arc? `<div class="small" style="margin-top:6px"><b>uNet → STM32, ARC notification</b> (frameID 0x00, 0xB0 UDP_RECEIVEFROM, length, serverID, source IP, port, count, payload, checksum = ~sum):</div>
      <div class="mono small" style="word-break:break-all">${seg(pk.arc.slice(0,2),'var(--ink2)','frameID 0 (notification), code 0xB0')}${seg(pk.arc.slice(2,4),'var(--ink2)','payload length')}${seg(pk.arc.slice(4,5),'var(--accent2)','serverID')}${seg(pk.arc.slice(5,9),'var(--accent2)','source IP')}${seg(pk.arc.slice(9,11),'var(--accent2)','source port')}${seg(pk.arc.slice(11,13),'var(--accent2)','noOfBytes')}${seg(pk.arc.slice(13,-1),'var(--accent)','payload')}${seg(pk.arc.slice(-1),'var(--bad)','checksum')}</div>
      <div class="small" style="margin-top:4px">COBS-encoded on USART1 (0x00 = frame delimiter): <span class="mono">${hexs(pk.cobs)}</span></div>` : ''}`;
}
function bootCard(){
  if (!D.boot) return '';
  const e=bootElapsed(), st=bootStage(); let a=0;
  return card(`Power-up sequence — ${e.toFixed(1)} s of ${BOOT_TOTAL.toFixed(1)} s`, `<div class="log" style="max-height:none">${BOOT.map((b,i)=>{ const s=a; a+=b[1]; return `<div style="${i===st?'font-weight:700;color:var(--accent)':i<st?'opacity:.6':''}">${i<st?'✓':i===st?'▶':'·'} ${s.toFixed(2)} s · ${esc(b[0])}</div>`; }).join('')}</div>
    <div style="height:8px;background:var(--chip);border-radius:4px;margin-top:6px"><div style="height:8px;width:${(100*e/BOOT_TOTAL).toFixed(1)}%;background:var(--accent);border-radius:4px"></div></div>
    <p class="small muted">main.c runs these in order. The OLED shows the WBS logo (WBSLOGO_0…3 in SSD1306.c) for about 15 s. Pre-Mote messages sent now are lost: the uNet's UDP server 0 isn't configured until <span class="mono">ARCsetUDPconfig()</span>. ARCinit's retry loops have no timeout — without a uNet the unit sits on the logo forever.</p>`);
}

/* ================================================================
   TABS
   ================================================================ */
function viewSim(m){
  window.__premoActive = true;
  m.innerHTML = `
  <div class="grid2">
    <div>${card('The unit — front board (OLED + encoder) and main board', unitCard(absNow()))}</div>
    <div>
      <div id="pmBootCard"></div>
      ${card('Pre-Mote — the PC app', `<div id="pmApp"></div>`)}
      ${card('What the software did (last action)', `<div id="trace"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek). Events land at the playhead; when paused, the playhead jumps to the end of what the action caused.', `<canvas id="tl"></canvas>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button id="pmRace">Race: phantom toggled twice within 40 ms</button><button id="pmDrag">Pre-Mote drag 0→40 in 150 ms</button><button id="pmSpin">Encoder: 5 fast clicks</button><button id="pmClr">Clear timeline</button><button id="pmRst">Factory reset (simulation)</button></div>
    <p class="small muted">Orange = PC → unit, blue = unit → PC / uNet → MCU. Red CPU blocks are interrupts, green blocks are main-loop work, grey is <span class="mono">HAL_Delay(100)</span>. Zoom to 200 µs to see UART bits (start, 8 data bits LSB first, stop), or to 20 µs to see the 16-bit SPI frame to the THAT5171. The AES67 packet timing, PTP rate and the main-loop pass length are ${inf}.</p>`)}
  <div class="grid2">
    ${card('Packet inspector (latest UDP)', `<div id="pkt"></div><div id="pktList" class="log" style="margin-top:6px;max-height:150px"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  let pkSel = 0;
  const draw = ()=>{
    tick(); const t=absNow();
    redrawUnit(m, t);
    m.querySelector('#pmBootCard').innerHTML = bootCard();
    refreshApp(m.querySelector('#pmApp'));
    m.querySelector('#trace').innerHTML = traceHTML(LOG[0]);
    m.querySelector('#insp').innerHTML = inspectHTML(t);
    m.querySelector('#pkt').innerHTML = packetHTML(PKTS[pkSel]);
    m.querySelector('#pktList').innerHTML = PKTS.map((p,i)=>`<div data-k="${i}" style="cursor:pointer;${i===pkSel?'font-weight:700':''}">${p.dir==='pc→unit'?'→':'←'} ${p.src}:${p.sp} → ${p.dst}:${p.dp} “${esc(asc(p.payload).slice(0,24))}” <span class="muted">${esc(p.fate.slice(0,60))}</span></div>`).join('') || '<div class="muted">—</div>';
    m.querySelectorAll('#pktList [data-k]').forEach(d=> d.onclick=()=>{ pkSel=+d.dataset.k; draw(); });
    m.querySelector('#log').innerHTML = LOG.map(e=>`<div><b>${esc(e.name)}</b></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  bindUnitCard(m);
  m.querySelector('#pmRace').onclick = ()=>A.doublePhantom();
  m.querySelector('#pmDrag').onclick = ()=>A.rapidDrag();
  m.querySelector('#pmSpin').onclick = ()=>A.spin(1,5);
  m.querySelector('#pmClr').onclick = ()=>{ EV=[]; PKTS=[]; SIM.refresh(); };
  m.querySelector('#pmRst').onclick = ()=>A.reset();
  SIM.on('time', ()=>{ pkSel = Math.min(pkSel, Math.max(0,PKTS.length-1)); draw(); });
  bootTicker(m, ()=>draw());
}

/* ---------------- tutorial ---------------- */
const TUT = { i:0, seen:{}, base:0 };
const LESSONS = [
  { title:'Meet the PREmo', body:()=>`<p>The PREmo (R&amp;D project RD88, ${Y(2016)}–${Y(2017)}) is a one-channel <b>microphone preamp that sends its audio over Ethernet</b> as an AES67 / Ravenna stream. Plug a mic into the combo jack, plug a network cable into the RJ45, and the audio appears on the network.</p>
     <p>On the unit: a small white <b>OLED</b> (128 × 64 pixels) and one <b>push-and-turn knob</b>. On the PC: <b>Pre-Mote</b>, a small Windows app with a gain slider and phantom On/Off for each mic.</p>
     <p class="muted">There is no manual in the archive. These steps follow what the firmware and the VB.NET code actually do.</p>`, check:()=>true, auto:true },
  { title:'1 · Power it up', body:()=>`<p>The unit runs from <b>PoE</b> (Power over Ethernet) or a <b>5 V adapter</b>. Unplug the RJ45 (click it twice on the main-board picture: PoE → plain switch → unplugged), then plug it back into the PoE switch.</p><p>Watch the screen: blank, then the <b>WBS logo for about 15 s</b> while the firmware waits for the uNet Mini network module, then the menu. Set <i>Boot speed</i> to “instant” if you're in a hurry.</p><p><b>Goal:</b> power-cycle the unit and let it finish booting.</p>`, check:()=>(D.cycles||0)>TUT.base && D.booted, hint:'Click the RJ45 on the main board until it says “RJ45 empty”, then click once more (PoE switch).' },
  { title:'2 · Read the screen', body:()=>`<p>The OLED shows four things: <span class="mono">Gain: 0dB</span>, <span class="mono">Phantom: OFF</span>, the unit's <span class="mono">IP:</span> address and its <span class="mono">MAC:</span> address.</p><p>Two catches. The “dB” number is really the THAT5171 <b>gain step</b>: step 0 is 5.6 dB, and steps 8–63 are 13.6–68.6 dB. And after every power-up it is back to 0 and OFF — the firmware never saves anything.</p><p>Note the IP: <b>${unitIPs()}</b>. Pre-Mote has to aim at it.</p>`, check:()=>true, auto:true },
  { title:'3 · Find the unit with Pre-Mote', body:()=>`<p>At the end of its boot the unit broadcasts <span class="mono">“WBS PreMo”</span> to UDP port 48888 (<span class="mono">checkForPremote()</span>). You'd expect Pre-Mote to listen for that. <b>It doesn't</b>: V2 has no receive code at all.</p><p>Instead each panel gets a fixed address: <span class="mono">MIC: 0</span> → 111.13.5.90, <span class="mono">MIC: 1</span> → .91 and so on (the “Limited IP range” installer). The four IP boxes can be edited, but nothing reads them after the panel loads.</p><p>Check the packet inspector on the Simulator tab: the broadcast is there, with nobody listening.</p>`, check:()=>true, auto:true },
  { title:'4 · Set the gain from the PC', body:()=>`<p>Drag the <b>MIC: 0</b> slider up. Each step of the drag fires <span class="mono">trbGain_Scroll</span>, which opens a new UDP socket and sends <span class="mono">“Gain40”</span> (6 ASCII bytes) to port 48888. The uNet Mini wraps it in an ARC frame and sends it to the STM32 over the serial port, about 2 ms per message.</p><p><b>Goal:</b> gain step 40 on the unit (45.6 dB).</p>`, check:()=>F.count===40 && THAT.reg===40, hint:'Drag the thumb of the MIC: 0 slider until it shows +40. Arrow keys won\'t work from 0: see the next step.' },
  { title:'5 · The keyboard trap', body:()=>`<p>Drag the slider back to <b>0</b>, click it, and press <b>↑</b>. The value goes to 1, and the handler immediately does <span class="mono">If trbGain.Value &lt; 8 Then trbGain.Value = 0</span>. The unit gets <span class="mono">“Gain0”</span>, and the slider can never leave 0 by keyboard, mouse wheel or Page Up (+5). Only a drag past 8 works.</p><p><b>Goal:</b> send any gain from 0 with the keyboard or wheel, then drag back up to 8 or more.</p>`, check:()=>LOG.some(e=>/key|wheel/.test(e.name)) && APP.panels[0].value>=8, hint:'Click the slider, press ↑ (nothing happens), then drag it up to 8 or more.' },
  { title:'6 · Use the knob', body:()=>`<p>Turn the <b>encoder</b> (click the right side of the knob, or press E). Each detent fires an EXTI interrupt; <span class="mono">incrementGain()</span> reads the gain back from the THAT5171, adds 1 and writes it again. From 0 it jumps straight to 8.</p><p><b>Goal:</b> gain step 45 set with the knob.</p>`, check:()=>F.count===45 && LOG.some(e=>/encoder/.test(e.name)), hint:'Turn clockwise (E key) or counter-clockwise (Q key) until the OLED says 45.' },
  { title:'7 · Phantom power for a condenser mic', body:()=>`<p>Condenser mics need <b>+48 V phantom</b>. Good practice: plug the mic in with phantom <b>off</b>, then switch it on. (The fault log suspects that hot-plugging with phantom on killed THAT chips.)</p><p>Choose “condenser mic” for the combo jack, then click <b>On</b> in Pre-Mote. The firmware opens both relays, <b>waits 100 ms</b> (break-before-make), then closes K1. The OLED says <span class="mono">ON</span> only after that delay.</p><p><b>Goal:</b> condenser plugged in, phantom on, audio present.</p>`, check:()=>D.src==='cond' && histAt(PH.hist,1e9).k1===1 && F.phantom===PH_ON, hint:'Combo jack → condenser mic, then Pre-Mote MIC: 0 → Phantom On.' },
  { title:'8 · Phantom from the knob (long press)', body:()=>`<p>The knob's push switch has one job: a <b>long press (over 0.55 s)</b> toggles phantom when you let go. A short press does nothing. Timer TIM3 counts 1.365 ms ticks between press and release and needs more than 400 of them.</p><p><b>Goal:</b> switch phantom off with a long press. Notice that Pre-Mote still shows <b>On</b>: it never learns.</p>`, check:()=>F.phantom===PH_OFF && LOG.some(e=>/Hold the encoder/.test(e.name)), hint:'Press L, or click “hold 0.6 s”, or hold the mouse on the knob centre for a second.' },
  { title:'9 · Power cycle: what comes back?', body:()=>`<p>Set a gain you'll recognise (say 30), then cut the power (RJ45 → unplugged, no 5 V) and plug it back in.</p><p>After the boot the unit says <span class="mono">Gain: 0</span> and <span class="mono">Phantom: OFF</span>. Pre-Mote still shows your old slider position. This is fault #1 in the roadmap sheet: <i>“Current software does not revert to previous state when powered on. If installed remotely this could be a huge problem.”</i></p><p><b>Goal:</b> power-cycle after setting a gain ≥ 8, and see it come back as 0.</p>`, check:()=>(D.cycles||0)>TUT.base && D.lostCount>=8 && D.booted && F.count===0, hint:'Gain ≥ 8 first, then click the RJ45 until “RJ45 empty” and once more.' },
  { title:'10 · Put it back', body:()=>`<p>Pre-Mote has no “refresh” button and the unit doesn't report its state. The only way to restore the gain is to <b>move the slider again</b> (Pre-Mote only sends on a change).</p><p><b>Goal:</b> unit gain equals the MIC: 0 slider again, and ≥ 8.</p>`, check:()=>D.booted && F.count===APP.panels[0].value && F.count>=8, hint:'Drag the MIC: 0 slider a little and back.' },
  { title:'11 · Talk to it directly', body:()=>`<p>Open the <b>Software</b> tab's protocol lab and send <span class="mono">0x90</span> (“what's your name?”). The unit answers <span class="mono">“PreMo”</span> to port 48888, but Pre-Mote can't hear it. Try <span class="mono">Gain7</span> (an illegal step: the chip ignores it, the OLED shows 7) and <span class="mono">Gain99</span>.</p><p><b>Goal:</b> send a 0x90 query.</p>`, check:()=>PKTS.some(p=>p.dir==='pc→unit' && p.payload[0]===0x90), hint:'Software tab → Protocol lab → “0x90 name?”.' },
  { title:'Done', body:()=>`<p>You've used both controls, both phantom paths, the power cycle and the raw protocol. The <b>Software</b> tab shows the code paths, the <b>One second</b> tab shows a gain change landing on a zero crossing, and <b>Findings</b> lists what the code is really up to.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){
  window.__premoActive = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — using a PREmo with Pre-Mote', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div><div id="pmBootCard"></div>
      ${card('What the software did', `<div id="trace"></div>`)}</div>
    <div>${card('The unit', unitCard(absNow()))}${card('Pre-Mote', `<div id="pmApp"></div>`)}</div></div>`;
  const draw = ()=>{
    tick(); const t=absNow();
    redrawUnit(m, t);
    m.querySelector('#pmBootCard').innerHTML = bootCard();
    refreshApp(m.querySelector('#pmApp'));
    m.querySelector('#trace').innerHTML = traceHTML(LOG[0]);
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===TUT.i?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${TUT.seen[i]?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ TUT.i=+li.dataset.i; TUT.base=D.cycles||0; draw(); });
    const L=LESSONS[TUT.i], ok=L.check(); if (ok) TUT.seen[TUT.i]=true;
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body()}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${TUT.i?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${TUT.i<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ TUT.i=Math.max(0,TUT.i-1); TUT.base=D.cycles||0; draw(); };
    m.querySelector('#nxt').onclick=()=>{ TUT.i=Math.min(LESSONS.length-1,TUT.i+1); TUT.base=D.cycles||0; draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); TUT.i=0; TUT.seen={}; TUT.base=0; D.cycles=0; draw(); };
  };
  bindUnitCard(m);
  SIM.on('time', draw);
  bootTicker(m, ()=>draw());
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__premoActive = true;
  m.innerHTML = `${card('One second of a PREmo, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="disp"></div>`)}
  </div>
  ${card('Zoom ladder at the playhead — preamp output into the ADC (AES67 channel), scaled to full height', `<canvas id="zl"></canvas><p class="small muted">Turn the knob or move the Pre-Mote slider, then step through: in zero-crossing mode the THAT5171 switches its resistors only when the signal passes through zero (or after the 22 ms RC timeout), so the level jumps without a click. The waveform is a synthetic stand-in for the programme ${inf}; gains and the −18.4 dB / 8.2 dBu figures are from schematic sheet S6.</p>`)}`;
  const draw=()=>{
    tick(); const t=absNow(), E=M.epoch;
    const rows = [
      ['I²S frames: AK5572 → uNet', C.FS.toLocaleString(), SIM.fmtDur(1/C.FS), `24-bit I²S, mono (MONO_FIX); rate ${inf}`],
      ['AES67 RTP packets “MIC OUT”', String(1/C.PKT), SIM.fmtDur(C.PKT), '48 samples per packet (SamplesPerPacket1xFS = 48, unet-Mini-Parameters.xlsx)'],
      ['PTP Sync messages', '≈ '+(1/C.PTP)+' '+inf, SIM.fmtDur(C.PTP), 'uNet Mini, Priority1/2 = 255 (never grandmaster)'],
      ['SysTick interrupts', '1,000', '1 ms', 'HAL_IncTick: the only time base (HAL_Delay)'],
      ['main-loop passes', '≈ '+Math.round(1/C.LOOP_T).toLocaleString()+' '+inf, SIM.fmtDur(C.LOOP_T), 'two compares: pPhantom ≠ phantom, pCount ≠ count'],
      ['UART bytes possible (115 200 baud)', '11,520', SIM.fmtDur(C.UB), 'one “GainNN” notification = 25 bytes ≈ 2.2 ms'],
      ['Gain commands per second, max', '≈ 450', '2.2 ms', 'UART-limited; Pre-Mote sends one per Scroll event (mouse move)'],
      ['THAT5171 zero-crossing timeout', '—', '22 ms', 'R55 22 MΩ × C39 1000 pF on TRC (S1)'],
      ['TIM3 ticks (encoder switch)', '732', SIM.fmtDur(C.TIM3_TICK), 'prescaler 0xFFFF; long press > 400 ticks = 0.546 s'],
      ['Phantom changes, max', '≤ 10', '100 ms', 'HAL_Delay(100) in setPhantomPower blocks the main loop'],
      ['OLED refresh frames', '≈ 105 '+inf, SIM.fmtDur(C.OLED), 'SSD1306 scans its RAM; firmware only writes on change'],
      ['Power-up', '—', BOOT_TOTAL.toFixed(1)+' s', 'reset → menu: unetReset 5.2 s + HAL_Delay(10000) + ARCinit'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who / why</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const cpu=cpuAt(t);
    m.querySelector('#dev').innerHTML = inspectHTML(t) + `<p class="small muted">Main loop at the playhead: ${cpu.s==='loop'?'polling':cpu.s}. The firmware has no periodic task at all: between interrupts it just compares four bytes, over and over.</p>`;
    const p=APP.panels[0], lv=levelDb(t), segs=40, lit=Math.max(0,Math.min(segs,Math.round((lv+60)/60*segs)));
    m.querySelector('#disp').innerHTML = `<h3 style="margin-top:0">OLED at the playhead</h3>${oledSVG(fbAt(t))}
      <h3>Pre-Mote MIC: 0</h3><div class="mono">slider ${p.value} · label “${p.label} dB” · Phantom ${p.on?'On':'Off'}</div>
      <h3>Downstream: what an AES67 receiver hears</h3><div style="display:flex;gap:2px">${Array.from({length:segs},(_,i)=>`<span style="flex:1;height:16px;border-radius:2px;background:${i<lit?(i>=segs-3?'#e3453a':i>=segs-9?'#e8b23a':'#3fbf5f'):'var(--grid)'}"></span>`).join('')}</div>
      <div class="small mono">${lv>-119? lv.toFixed(1)+' dBFS peak (20 ms)' : 'silence'} · ${SRC[D.src].name}${D.src==='cond'&&!signalOn(t)?' — no phantom, no signal':''}</div>`;
    drawLadder(m.querySelector('#zl'), t-E);
  };
  SIM.on('time', draw);
  bootTicker(m, ()=>draw());
}
function drawLadder(cv, t){
  const E=M.epoch, levels=[['1 second',1],['100 ms',0.1],['22 ms (ZC timeout)',0.022],['1 ms (one AES67 packet)',C.PKT],['8 samples',8/C.FS]];
  const H=levels.length*46+10, {c,w}=SIM.canvas(cv,H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid'), warn=SIM.css('--warn');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*46, t0=Math.max(0,Math.min(1-span,t-span/2)), x0=170, pw=w-x0-10;
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm, 6, y+16); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+30);
    c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,34);
    THAT.hist.forEach(e=>{ const r=e.t-E; if (r>=t0 && r<=t0+span){ const x=x0+(r-t0)/span*pw; c.strokeStyle=warn; c.beginPath(); c.moveTo(x,y+2); c.lineTo(x,y+36); c.stroke(); } });
    let pk=1e-6; const N=Math.min(900,Math.floor(pw)); const vals=[];
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=sample(E+tt); vals.push(v); pk=Math.max(pk,Math.abs(v)); }
    c.strokeStyle=acc; c.beginPath(); vals.forEach((v,k)=>{ const x=x0+pw*k/N, yy=y+19-v/pk*15; k?c.lineTo(x,yy):c.moveTo(x,yy); }); c.stroke();
    if (span<1e-3){ for (let s=Math.ceil(t0*C.FS); s/C.FS<=t0+span; s++){ const tt=s/C.FS, x=x0+(tt-t0)/span*pw, v=sample(E+tt); c.fillStyle=acc; c.beginPath(); c.arc(x, y+19-v/pk*15, 3, 0, 7); c.fill(); } }
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+38); c.stroke();
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  jack:{x:10,y:40,w:150,h:84,t:'J1 combo jack',s:['XLR mic (21 dBu max)','TRS line (36 dBu max)','line via −15 dB pad'],d:'Neutrik NCJ6-style XLR/TRS combo (S1 Preamp). The XLR feeds the preamp through C36/C37 (47 µF/63 V) and MSE1PD clamp diodes; R37/R38 6K81 bring in phantom. The TRS line input joins the same 1580_IN nets through R47/R48 4K75 (the −15 dB pad). A mic/line switch and a −20 dB pad are drawn as “For Future, Insert Here”.'},
  ph:{x:10,y:150,w:150,h:84,t:'Phantom K1 / K2',s:['2 × CPC1017N opto-MOS','K1: +48 V → PHANTOM','K2: PHANTOM → AGND'],d:'Two solid-state relays driven from PA0 (PHANTOM_ON) and PA1 (PHANTOM_OFF) through 470 Ω. The schematic note says “CPU Must make sure that it Breaks Before Makes, 10 mS Minimum Delay”; PHANTOM.c opens both, waits HAL_Delay(100), then closes one. Not a latching relay: the chosen side stays driven.'},
  pre:{x:200,y:40,w:170,h:96,t:'THAT1580 + THAT5171',s:['5.6 dB, 13.6–68.6 dB','SPI1 (PA15 nCS, PB3/4/5)','BUSY PB7, nRST PB6'],d:'THAT1580 low-noise differential preamp; the THAT5171 is a digitally switched resistor network that sets its gain. Firmware: THAT5171.c — 16-bit SPI frames, GAIN_REG 0x02 (6 bits), CNTRL_REG 0x06 with zero-crossing mode. TRC timeout 22 ms (R55/C39). GPO0–3 pulled down by 47 K → SPI address 000.'},
  amp:{x:200,y:160,w:170,h:60,t:'NE5532 (U4)',s:['−18.4 dB, diff. driver'],d:'Scales the 26.6 dBu maximum preamp output down to the 8.2 dBu the ADC accepts (S2 ADC, S6 block diagram).'},
  adc:{x:410,y:40,w:150,h:96,t:'AK5572 ADC (U3)',s:['32-bit, 2 ch, used mono','I²C1 0x22 (PB8/PB9)','PDN PC13, OVF PC14'],d:'AKM AK5572. akm5572Init(): reset, channel-sum MONO_FIX, 24-bit I²S, automatic clock detection. Its clocks (MCLK/BICK/LRCK) come from the uNet Mini (UM_I2S_*). The overflow pin OVF is wired to PC14, but isAkm5572Ovf() is never called.'},
  unet:{x:600,y:40,w:170,h:110,t:'uNet Mini (P1)',s:['Archwave, mini-PCIe slot','Ravenna / AES67, PTP','ARC over UART 115200'],d:'Archwave uNet Mini module in a mini-PCIe socket (S4 Ethernet). Configured through its shell (uNetMini settings.txt.docx): ModelName “PreMo”, stream “MIC OUT”, PTP priority 255, ARC on UART 0. It turns UDP packets on port 48888 into ARC notifications for the STM32, and sends the STM32’s UDP replies.'},
  rj:{x:820,y:40,w:120,h:110,t:'RJ45 + PoE',s:['S558-5500-25-F magnetics','MB4S bridges','AG9805M PoE → 5 V'],d:'100BASE-T through the S558 transformer. The PoE centre taps feed two MB4S bridges and the Silvertel AG9805M module (5 V, 1.8 A). A 5 V jack (J3) is the backup supply.'},
  mcu:{x:410,y:190,w:200,h:110,t:'STM32F070CBT6 (U6)',s:['48 MHz (16 MHz HSE × 3)','main.c: while(1) + ISRs','USB, TIM17 set up, unused'],d:'Cortex-M0, 128 KB flash. Everything happens in interrupts: USART1 RX (ARC), EXTI (encoder), TIM3 capture (push switch). The main loop only notices that gain or phantom changed and writes them again.'},
  disp:{x:640,y:200,w:170,h:100,t:'PreMo-2 display board',s:['ER-OLEDM0.96-1W SSD1306','ACZ11 encoder + switch','header H101 ↔ H2'],d:'Daughter board (PCB - DISPLAY BOARD/ISS2). OLED on SPI2 (PB13 SCLK, PB15 SDAT, PB12 nCS, PB14 nCMD, PB11 nRST). Encoder A PB10, B PB2 (EXTI), switch PB1 (TIM3_CH4 input capture).'},
  pwr:{x:820,y:190,w:120,h:110,t:'Power rails',s:['TPS61170 → +48 V','SUW1R5 → ±15 V','LM1117 → 3.3 V'],d:'From the 5 V bus (S5 Power): TPS61170 boost for phantom (fault log #2: two of them failed and bricked the phantom circuit), SUW1R5 isolated ±15 V for the analog section, LM1117 3.3 V for logic.'},
  pc:{x:820,y:330,w:120,h:70,t:'PC: Pre-Mote',s:['VB.NET, UDP 48888'],d:'Pre-Mote V2: one panel per mic, fixed IPs 111.13.5.90+, sends “GainNN” and “PHANTOM”+0/1. Never receives anything.'},
};
const WIRES = [['jack','pre','balanced mic'],['ph','jack','+48 V via 6K81'],['pre','amp',''],['amp','adc','BAL 8.2 dBu'],['adc','unet','I²S'],['unet','rj','Ravenna'],['rj','pwr','PoE 5 V'],['mcu','pre','SPI1'],['mcu','adc','I²C1'],['mcu','unet','UART ARC'],['mcu','ph','PA0/PA1'],['disp','mcu','SPI2 + encoder'],['pc','rj','UDP 48888']];
function viewBlock(m){
  window.__premoActive = false;
  let sel='mcu';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — click a block (after schematic sheet S6 “Block Diagram”, expanded from the other sheets)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The mic signal goes <b>combo jack → THAT1580 (gain set by the THAT5171) → NE5532 → AK5572 ADC → I²S → uNet Mini → Ethernet</b>. The STM32 never touches the audio: it only sets the gain, switches phantom, draws the OLED and relays UDP commands from Pre-Mote.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 950 420" style="width:100%"><defs><marker id="pmar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#pmar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+=`<rect x="10" y="330" width="560" height="70" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="5 4"/><text x="20" y="352" font-size="11" fill="var(--ink2)">MICPre-1 main board (MICPRE-1-ISS1): everything except the display board and the PC.</text><text x="20" y="372" font-size="11" fill="var(--ink2)">MICPre-2 display board (PreMo-2-ISS2): OLED + encoder on a 2 × 7 ribbon to header H2.</text><text x="20" y="392" font-size="11" fill="var(--ink2)">Gain figures from S6: 5171+1580 5.6 dB / 13.6–68.6 dB, NE5532 −18.4 dB, ADC full scale 8.2 dBu.</text></svg>`;
    m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from pin / net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const box=(x,y,w,h,t1,t2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2-(t2?3:-4)}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${t1}</text>${t2?`<text x="${x+w/2}" y="${y+h/2+12}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${t2}</text>`:''}`;
const SHEETS = [
  { name:'1 · STM32F070 controller', note:'Port pins and net names from V010000.ioc / Inc/mxconstants.h (CubeMX 4.16.1) and sheet S3 Controller. Crystal X1 16.000 MHz, SWD header H3, UART test header H1, MIC803 supervisor U5 on nRST.', svg:()=>
    chip(330,50,200,'U6 STM32F070CBT6',[
      ['PA0','PHANTOM_ON'],['PA1','PHANTOM_OFF'],['PA5…PA7','CONTROL_GPIO4…2'],['PB0','CONTROL_GPIO1'],['PB1 TIM3_CH4','ENCODER_SW'],['PB2 EXTI2','ENCODER_B'],['PB10 EXTI10','ENCODER_A'],['PB11','SSD1306_nRST'],['PB12','SSD1306_nCS'],['PB13 SPI2_SCK','SSD1306_SCLK'],['PB14','SSD1306_nCMD'],['PB15 SPI2_MOSI','SSD1306_SDAT'],['PC13','AKM5572_PDN'],['PC14','AKM5572_OVF'],
    ],[
      ['PA8','UM_RESET_IN'],['PA9 USART1_TX','UM_RXD0_F070_TX'],['PA10 USART1_RX','UM_TXD0_F070_RX'],['PA11/PA12','F070_USB_DM/DP'],['PA13/PA14','SWDIO / SWCLK'],['PA15','THAT5171_nCS'],['PB3 SPI1_SCK','THAT5171_SCLK'],['PB4 SPI1_MISO','THAT5171_MISO'],['PB5 SPI1_MOSI','THAT5171_MOSI'],['PB6','THAT5171_nRST'],['PB7','THAT5171_BUSY'],['PB8 I2C1_SCL','AKM5572_SCL'],['PB9 I2C1_SDA','AKM5572_SDA'],['PF0/PF1','X1 16.000 MHz'],
    ],'LQFP48 · 48 MHz · SW4STM32 · V010000') },
  { name:'2 · Preamp + phantom (S1)', note:'From MICPRE-1-ISS1.pdf sheet S1 Preamp. THAT5171 pin numbers are printed on that sheet. Clamp diodes D3–D6 MSE1PD, input caps C36/C37 47U/63V, R41/R42 10R; DNP pads R39/R40/R43–R46 are the “For Future −20 dB pad” and mic/line switch sites.', svg:()=>
    chip(560,60,170,'U2 THAT5171',[['15 RST','THAT5171_nRST'],['16 CS','THAT5171_nCS'],['17 SCLK','THAT5171_SCLK'],['18 DIN','THAT5171_MOSI'],['19 DOUT','THAT5171_MISO'],['22 BSY','THAT5171_BUSY'],['14 TRC','R55 22M / C39 1n'],['23–26 GPO0–3','47K → AGND (addr 0)']],
      [['3 RG1','1580_RG1'],['6 RG2','1580_RG2'],['4 IN1','1580_OUT1'],['5 IN2','1580_OUT2'],['31/32 SOUT','servo → 1580'],['29/30 SCAP','C7/C8 10U NP']],'digital gain controller')
    + chip(200,250,150,'U1 THAT1580',[['IN1','1580_IN1'],['IN2','1580_IN2']],[['OUT1','1580_OUT1'],['OUT2','1580_OUT2'],['RG1/RG2','to U2']],'±15 V')
    + box(20,60,120,60,'J1 XLR','2 + / 3 − / 1 G') + box(20,140,120,50,'J1 TRS','T / R / S')
    + `<text x="150" y="80" font-size="10.5" fill="var(--accent2)">MIC_IN± → C36/C37 → 1580_IN1/2</text><text x="150" y="168" font-size="10.5" fill="var(--accent2)">Line_IN± → R47/R48 4K75 → 1580_IN1/2</text>`
    + box(20,330,150,60,'K1 CPC1017N','48V → PHANTOM') + box(200,330,150,60,'K2 CPC1017N','PHANTOM → AGND')
    + `<text x="20" y="410" font-size="10.5" fill="var(--accent2)">PHANTOM_ON → R64 470R → K1 LED · PHANTOM_OFF → R65 470R → K2 LED · PHANTOM → R37/R38 6K81 → MIC_IN±</text><text x="20" y="428" font-size="10.5" fill="var(--warn)">“CPU Must make sure that it Breaks Before Makes — 10 mS Minimum Delay”</text>` },
  { name:'3 · ADC (S2)', note:'From sheet S2 ADC. AK5572 control pins double as I²C (CKS0/SDA, CKS2/SCL, CAD0/CAD1 strapping). Clocks come from the uNet Mini.', svg:()=>
    chip(360,60,190,'U3 AK5572',[['AIN1P/N','5572_AIN1P/N'],['AIN2P/N','5572_AIN2P/N'],['PDN','AKM5572_PDN'],['CKS2/SCL','AKM5572_SCL'],['CKS0/SDA','AKM5572_SDA'],['OVF','AKM5572_OVF']],[['MCLK','UM_I2S_MCLK'],['BICK','UM_I2S_SCLK'],['LRCK','UM_I2S_LRCLK'],['SDTO1','UM_I2S_SDIN'],['I2C','= 1 (control mode)'],['LDOE/VDD18','C17 4U7']],'32-bit ΔΣ ADC · addr 0x22 (8-bit)')
    + chip(80,80,130,'U4 NE5532',[['IN','1580_OUT1/2']],[['OUT','5572_AIN']],'R15/R17 240R, R19 91R, C23/C24 2n2') },
  { name:'4 · uNet Mini + Ethernet (S4)', note:'From sheet S4 Ethernet: a mini-PCIe socket carries UART, I²S, Ethernet pairs, USB and reset for the Archwave module.', svg:()=>
    chip(330,50,200,'P1 mini-PCIe (uNet Mini)',[['CPU UART RX','UM_RXD0_F070_TX'],['CPU UART TX','UM_TXD0_F070_RX'],['RESET','UM_RESET_IN'],['UART2','UM_UART2_RXD/TXD'],['USB','UM_USB_DP/DM/VBUS']],[['I2S','UM_I2S_LRCLK/SCLK'],['','UM_I2S_MCLK/SDIN'],['ETH','UM_ETH_TD_P/N'],['','UM_ETH_RD_P/N'],['LED','UM_ETH_LED_LINK']],'Archwave · Ravenna/AES67')
    + box(640,90,170,60,'T1 S558-5500-25-F','10/100 PoE magnetics') + box(640,200,170,60,'J2 RJ45','ETH_RXCT / ETH_TXCT → PoE') + `<text x="640" y="300" font-size="10.5" fill="var(--ink2)">C42/C43 10N/100V, R60/R61 75R, C44 1N/2KV (Bob Smith termination)</text>` },
  { name:'5 · Power (S5)', note:'From sheet S5 Power. Both the SUW1R5 and the SUW3 footprints are on the board (“Make these parts interchangeable”).', svg:()=>
    box(30,60,160,70,'PoE: MB4S D11/D12','SMAJ58 D13') + box(240,60,160,70,'PSU1 AG9805M','PoE PD → 5 V') + box(30,170,160,70,'J3 5 V jack','5V_EXT → SSA24 / FMMT717')
    + box(470,30,170,60,'REG1 TPS61170','+48 V (R33 383K)') + box(470,110,170,60,'PSU2 SUW1R5','±15 V isolated') + box(470,190,170,60,'REG2 LM1117','3V3')
    + `<line x1="400" y1="95" x2="470" y2="60" stroke="var(--ink)"/><line x1="400" y1="95" x2="470" y2="140" stroke="var(--ink)"/><line x1="400" y1="95" x2="470" y2="220" stroke="var(--ink)"/><line x1="190" y1="95" x2="240" y2="95" stroke="var(--ink)"/><line x1="190" y1="205" x2="320" y2="205" stroke="var(--ink)"/><line x1="320" y1="205" x2="320" y2="130" stroke="var(--ink)"/>
      <text x="660" y="64" font-size="10.5" fill="var(--accent2)">48V → K1</text><text x="660" y="144" font-size="10.5" fill="var(--accent2)">+15V / −15V → U1, U2, U4</text><text x="660" y="224" font-size="10.5" fill="var(--accent2)">3V3 → U6, U3, OLED</text>` },
  { name:'6 · Display board (PreMo-2 ISS2)', note:'From Premo-2-ISS2-MasterBom (U101 ER-OLEDM0.96-1W, E101 ACZ11BR2E-25SD1-20CZ, H101 2×7 header, R101–R106 1K, C101–C103 100n) and the S3 header H2 net list. The exact header pin order is not traced.', svg:()=>
    chip(360,60,190,'H101 / H2 ribbon',[['SSD1306_SDAT','PB15'],['SSD1306_SCLK','PB13'],['SSD1306_nCS','PB12'],['SSD1306_nCMD','PB14'],['SSD1306_nRST','PB11'],['3V3 / DGND','']],[['ENCODER_A','PB10'],['ENCODER_B','PB2'],['ENCODER_SW','PB1'],['CONTROL_GPIO1…4','PB0, PA7–PA5 (unused)']],'2 × 7 to 2 × 8 (H2X8POL)')
    + box(40,300,200,60,'U101 ER-OLEDM0.96-1W','SSD1306 128 × 64, SPI') + box(600,300,200,60,'E101 ACZ11 encoder','A/B + push, 1K series R101–R106') },
];
function viewSchem(m){
  window.__premoActive = false;
  let i=0;
  m.innerHTML = card('Schematic set — redrawn from the source pin / net names (not the original Altium drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original Altium schematics are <span class="mono">PCB/backup29-final - for real real/MICPRE-ISS1/MICPRE-1-ISS1.pdf</span> (sheets S1–S7, ${Y(2016)}-06-23) and <span class="mono">PCB - DISPLAY BOARD/ISS2/MICPRE-2-ISS2-S1-Daughter Board.SchDoc</span>. These sheets are a readable guide; blue labels are net names exactly as written there and in <span class="mono">mxconstants.h</span>.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="880" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">PREmo RD88 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software tab ---------------- */
const VB_SCROLL = ['Private Sub trbGain_Scroll(sender, e) Handles trbGain.Scroll','    If trbGain.Value < 8 Then trbGain.Value = 0','    Dim udpClient As New UdpClient()','    Dim s As String = "Gain" + CStr(trbGain.Value)','    Dim b As Byte() = Encoding.UTF8.GetBytes(s)','    If Me.trbGain.Value < 8 Then','        Me.lblGainVal.Text = CStr(Me.trbGain.Value)','    Else','        Me.lblGainVal.Text = "+" + CStr(Me.trbGain.Value)','    End If','    udpClient.Connect(IPAddress.Parse(Me.premoIP), 48888)','    udpClient.Send(b, b.Length)','End Sub'];
const VB_PH = ['Private Sub rbPhantomOn_CheckedChanged(...) Handles rbPhantomOn.CheckedChanged','    If Me.rbPhantomOn.Checked = True And Me.rbPhantomOff.Checked = False Then','        If Not Me.premoIP Is Nothing Then','            Dim udpClient As New UdpClient()','            Dim s As String = "PHANTOM" + ChrW(&H1)','            Dim b As Byte() = Encoding.ASCII.GetBytes(s)','            udpClient.Connect(IPAddress.Parse(Me.premoIP), 48888)','            udpClient.Send(b, b.Length)','        End If','    End If','End Sub'];
const FW_UDP = ['void UDP_receiveFromCB(serverID, srcIPAddress, srcPort, noOfBytes, payload)','{','  /* srcIPAddress → ipTemp[4] */','  if(payload[0] == 0x90)  ARCudpSend(ipTemp, 48888, strlen(devConfig.deviceName), devConfig.deviceName);','  if(payload[0] == 0x0E)  ARCudpSend(ipTemp, 48888, 6, &macAd);','  if(payload[0..3] == "Gain") {','    if(noOfBytes == 5)       setGain(payload[4] & 0x0F);','    else if(noOfBytes == 6)  setGain((payload[4] & 0x0F)*10 + (payload[5] & 0x0F));','  }','  if(payload[0..6] == "PHANTOM") {','    if(payload[7] == 1)      phantom = PHANTOM_ON;','    else if(payload[7] == 0) phantom = PHANTOM_OFF;','  }','  commandComplete = 1;','}'];
function viewSoft(m){
  window.__premoActive = true;
  m.innerHTML = `<div class="grid2">
    ${card('Firmware: main() and its interrupts — lit = running at the playhead', `<div id="flow"></div>`)}
    <div>${card('State machines (live)', `<div id="fsm"></div>`)}</div></div>
  <div class="grid2">
    ${card('UDP packet → ARC frame, live (latest packet from the PC)', `<div id="pkt"></div>`)}
    ${card('Protocol lab — send raw UDP to the unit (what Pre-Mote can\'t do)', `<div style="display:flex;flex-wrap:wrap;gap:6px">${[['Gain45','Gain45'],['Gain7','Gain7 (illegal step)'],['Gain99','Gain99 (> 63)'],['Gain123','Gain123 (7 bytes)'],['PHANTOM\\x01','PHANTOM + 01'],['PHANTOM','PHANTOM (no 8th byte)'],['\\x90','0x90 name?'],['\\x0E','0x0E MAC?'],['LONG','long 40-byte string, then 0x90']].map(([v,l])=>`<button data-lab="${esc(v)}">${l}</button>`).join('')}</div>
      <div style="display:flex;gap:6px;margin-top:6px"><input id="labIn" style="flex:1;font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)" placeholder='payload, e.g. Gain12 or \\x90'><button id="labGo">Send</button></div>
      <div id="labOut" class="log" style="margin-top:6px;max-height:220px"></div>`)}
  </div>
  <div class="grid2">
    ${card('Pre-Mote (VB.NET) — the handler that ran last', `<div id="vbsrc"></div>`)}
    ${card('STM32 — UDP_receiveFromCB() (ARC_controller.c)', `<div id="fwsrc"></div>`)}
  </div>
  ${card('How the buttons did things — control → code → wire → hardware', `<div id="btn"></div>`)}`;
  const parseLab = s=>{ if (s==='LONG') return null; const o=[]; for (let i=0;i<s.length;i++){ if (s[i]==='\\' && s[i+1]==='x'){ o.push(parseInt(s.substr(i+2,2),16)||0); i+=3; } else o.push(s.charCodeAt(i)&255); } return o; };
  const send = s=>{ if (s==='LONG'){ A.lab(Array.from('this payload is forty bytes long........').map(c=>c.charCodeAt(0))); A.lab([0x90]); } else A.lab(parseLab(s)); };
  m.querySelectorAll('[data-lab]').forEach(b=> b.onclick=()=>send(b.dataset.lab));
  m.querySelector('#labGo').onclick=()=>{ const v=m.querySelector('#labIn').value; if (v) send(v); };
  m.querySelector('#labIn').addEventListener('keydown', e=>{ e.stopPropagation(); if (e.key==='Enter') m.querySelector('#labGo').click(); });
  const draw=()=>{
    tick(); const t=absNow(), cpu=cpuAt(t);
    // flow chart
    const bootSt = cpu.s==='boot'? cpu.step : -1;
    let s=`<svg viewBox="0 0 640 ${70+BOOT.length*30+190}" style="width:100%"><defs><marker id="pma2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <text x="10" y="18" font-size="12" font-weight="700" fill="var(--ink)">main.c — main()</text>`;
    BOOT.slice(0,7).forEach((b,i)=>{ const y=28+i*30, on=bootSt===i; s+=`<rect x="10" y="${y}" width="380" height="24" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${y+16}" font-size="9.6" fill="${on?'#fff':'var(--ink)'}">${esc(b[0].length>66?b[0].slice(0,64)+'…':b[0])}</text>`; });
    const yl = 28+7*30+10, loopOn = cpu.s==='loop'||cpu.s==='main';
    s+=`<rect x="10" y="${yl}" width="380" height="150" rx="8" fill="none" stroke="${loopOn?'var(--accent)':'var(--line)'}" stroke-width="${loopOn?2:1}"/><text x="18" y="${yl+16}" font-size="11" font-weight="700" fill="var(--ink)">while (1)</text>`;
    const blk=(y,on,a,b)=>`<rect x="24" y="${y}" width="352" height="50" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="32" y="${y+18}" font-size="10.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${a}</text><text x="32" y="${y+36}" font-size="9.8" fill="${on?'#eef':'var(--ink2)'}">${b}</text>`;
    const mainLbl = cpu.s==='main'? cpu.e.label : '';
    s+=blk(yl+24, (cpu.s==='loop'&&cpu.ph===0)||/Phantom|HAL_Delay/.test(mainLbl), 'if (pPhantom != phantom)', 'setPhantomPower(phantom) [HAL_Delay(100)] · ssd1306SetPhantom');
    s+=blk(yl+84, (cpu.s==='loop'&&cpu.ph===1)||/gain/.test(mainLbl), 'if (pCount != count)', 'that5171WriteGain(count) · ssd1306SetGain(count)');
    const isrs=[['USART1_IRQHandler','HAL_UART_RxCpltCallback → ARC_receive → ARC_receivePacket → parseUDPreceiveFrom → UDP_receiveFromCB',/USART1/],['EXTI4_15 / EXTI2_3_IRQHandler','HAL_GPIO_EXTI_Callback → incrementGain / decrementGain → setGain',/EXTI/],['TIM3_IRQHandler','HAL_TIM_IC_CaptureCallback → long press toggles phantom',/TIM3/],['SysTick_Handler','HAL_IncTick (1 ms)',/SysTick/]];
    s+=`<text x="410" y="18" font-size="12" font-weight="700" fill="var(--ink)">Interrupts (do the real work)</text>`;
    isrs.forEach(([a,b,re],i)=>{ const y=28+i*78, on=cpu.s==='isr'&&re.test(cpu.e.label); s+=`<rect x="410" y="${y}" width="222" height="68" rx="6" fill="${on?'var(--bad)':'var(--panel2)'}" stroke="var(--line)"/><text x="418" y="${y+16}" font-size="10.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${a}</text>`+wrapSvg(b, 418, y+32, 36, 9.6, on?'#fff':'var(--ink2)'); });
    s+=`<text x="410" y="${28+4*78+8}" font-size="10" fill="var(--ink2)">At the playhead: ${esc(cpu.s==='isr'||cpu.s==='main'?cpu.e.label:cpu.s==='loop'?'main loop polling':cpu.s)}</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    // state machines
    const code=histAt(THAT.hist,t).code, busy=EV.some(e=>e.lane==='busy'&&t>=e.t&&t<e.t+e.dur), ph=histAt(PH.hist,t), between=!ph.k1&&!ph.k2;
    const node=(x,y,l,on,sub,col)=>`<g><rect x="${x-52}" y="${y-20}" width="104" height="40" rx="18" fill="${on?(col||'var(--accent)'):'var(--panel2)'}" stroke="var(--line)"/><text x="${x}" y="${y-3}" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const arr=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#pma3)"/>${l?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${l}</text>`:''}`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 460 470" style="width:100%"><defs><marker id="pma3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <text x="6" y="14" font-size="11" font-weight="700" fill="var(--ink)">THAT5171 gain update (CNTRL MODE = zero crossing)</text>
      ${node(70,50,'IDLE',!busy,'BUSY low')}${node(230,50,'PENDING',busy,'BUSY high','var(--warn)')}${node(390,50,'APPLIED',!busy,`${gainDb(code)} dB`)}
      ${arr(122,50,178,50,'SPI write')}${arr(282,50,338,50,'ZC or 22 ms')}<text x="6" y="92" font-size="9.8" fill="var(--warn)">While PENDING, isThat5171Busy() makes the firmware skip writes, and reads return 0.</text>
      <text x="6" y="122" font-size="11" font-weight="700" fill="var(--ink)">Phantom relays (setPhantomPower)</text>
      ${node(70,160,'OFF',ph.k2&&!ph.k1,'K2 shorts to AGND')}${node(230,160,'BREAK',between,'both open 100 ms','var(--warn)')}${node(390,160,'ON',ph.k1&&!ph.k2,'K1: +48 V')}
      ${arr(122,155,178,155,'')}${arr(282,155,338,155,'')}${arr(338,168,282,168,'')}${arr(178,168,122,168,'')}
      <text x="6" y="198" font-size="9.8" fill="var(--ink2)">phantom = ${F.phantom===PH_ON?'PHANTOM_ON (0x00)':'PHANTOM_OFF (0x01)'} · pPhantom = ${F.pPhantom===PH_ON?'ON':'OFF'} · rail ${phantomV(t).toFixed(1)} V</text>
      <text x="6" y="228" font-size="11" font-weight="700" fill="var(--ink)">Gain steps (rotaryEncoder.c / Pre-Mote)</text>
      ${[0,8,9,'…',62,63].map((v,i)=>`<rect x="${10+i*74}" y="240" width="62" height="26" rx="5" fill="${(v===F.count)||(v==='…'&&F.count>9&&F.count<62)?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${41+i*74}" y="257" text-anchor="middle" font-size="11" fill="var(--ink)">${v}</text>`).join('')}
      <text x="6" y="284" font-size="9.8" fill="var(--ink2)">Up from 0 → 8 (codes 1–7 are illegal for the 5171); down from 8 → 0.</text><text x="6" y="298" font-size="9.8" fill="var(--ink2)">Pre-Mote clamps &lt; 8 to 0 too. Now: count ${F.count} (${gainDb(F.count&63)??'illegal code'} dB)</text>
      <text x="6" y="314" font-size="11" font-weight="700" fill="var(--ink)">Encoder push switch (TIM3 input capture, both edges)</text>
      ${node(70,350,'RELEASED',true,'SW high')}${node(230,350,'PRESSED',false,'uwIC2Value1 = CCR4')}${node(390,350,'RELEASE',false,'diff > 400 ticks?')}
      ${arr(122,350,178,350,'falling')}${arr(282,350,338,350,'rising')}<text x="300" y="400" font-size="9.8" fill="var(--ink2)">yes (&gt; 0.546 s): phantom ^= 1</text><text x="300" y="414" font-size="9.8" fill="var(--ink2)">no: nothing</text>
      <text x="6" y="446" font-size="9.8" fill="var(--ink2)">No debounce (ICFilter = 0) — contact bounce would add extra captures ${'(not modelled)'}.</text></svg>`;
    // packet
    const pk = PKTS.find(p=>p.dir==='pc→unit');
    m.querySelector('#pkt').innerHTML = packetHTML(pk);
    // lab output
    m.querySelector('#labOut').innerHTML = PKTS.filter(p=>p.why==='protocol lab' || p.dir==='unit→pc').slice(0,16).map(p=>`<div>${p.dir==='pc→unit'?'→':'←'} <span class="mono">${esc(asc(p.payload))}</span> <span class="muted">${esc(p.fate)}</span></div>`).join('') || '<div class="muted">Replies show up here. Pre-Mote itself never sees them.</div>';
    // VB / FW source with highlight
    const last = LOG.find(e=>/Pre-Mote/.test(e.name));
    const isPh = last && /Phantom/.test(last.name), src = isPh? VB_PH : VB_SCROLL;
    const hiVB = (line,i)=>{ if (!last) return false; if (isPh) return i>=1 && i<=7; const clamp = last.vb.some(s=>/Then trbGain.Value = 0/.test(s)); return i===0 || (i===1&&clamp) || (i>=2&&i<=4) || (i===8&&!clamp) || (i===6&&clamp) || i>=10; };
    m.querySelector('#vbsrc').innerHTML = `<pre class="mono small" style="margin:0;white-space:pre-wrap">${src.map((l,i)=>`<span class="${hiVB(l,i)?'hl':''}">${esc(l)}</span>`).join('\n')}</pre><p class="small muted">${last? 'Last: '+esc(last.name) : 'Use Pre-Mote to light up the lines that run.'} (premoControlPanel.vb, V2)</p>`;
    const lp = PKTS.find(p=>p.dir==='pc→unit' && p.fate.startsWith('delivered')); const pl = lp? lp.payload : [];
    const isG = pl[0]===0x47&&pl[1]===0x61, isP = pl[0]===0x50&&pl[1]===0x48;
    const hiFW = i=> lp && (i===0 || (i===3&&pl[0]===0x90) || (i===4&&pl[0]===0x0E) || (isG&&(i===5||(i===6&&pl.length===5)||(i===7&&pl.length===6))) || (isP&&(i===9||(i===10&&pl[7]===1)||(i===11&&pl[7]===0))) || i===13);
    m.querySelector('#fwsrc').innerHTML = `<pre class="mono small" style="margin:0;white-space:pre-wrap">${FW_UDP.map((l,i)=>`<span class="${hiFW(i)?'hl':''}">${esc(l)}</span>`).join('\n')}</pre><p class="small muted">Shortened: the real code compares each byte (0x47 0x61 0x69 0x6E …). Called from inside the USART1 interrupt. ${lp?'Last delivered payload: <span class="mono">'+esc(asc(pl))+'</span>':''}</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>You do</th><th>Pre-Mote (VB.NET)</th><th>On the wire</th><th>STM32 firmware</th><th>Hardware</th></tr>
      <tr><td>Drag the gain slider</td><td class="mono small">trbGain_Scroll → New UdpClient → Send</td><td class="mono small">UDP → :48888 “Gain40” 47 61 69 6E 34 30 → ARC 0xB0 over USART1 (COBS)</td><td class="mono small">USART1 ISR → ARC_receive → UDP_receiveFromCB → setGain → that5171WriteGain + ssd1306SetGain; main loop writes it again</td><td class="small">SPI1 0x12nn → THAT5171 switches at the next zero crossing; OLED digits</td></tr>
      <tr><td>Phantom On / Off</td><td class="mono small">rbPhantomOn/Off_CheckedChanged</td><td class="mono small">“PHANTOM” + 01 / 00 (8 bytes)</td><td class="mono small">UDP_receiveFromCB sets <i>phantom</i>; main loop → setPhantomPower (HAL_Delay 100) → ssd1306SetPhantom</td><td class="small">PA0/PA1 → K1 / K2 CPC1017N, +48 V via 6K81</td></tr>
      <tr><td>Turn the knob</td><td class="small">—</td><td class="small">encoder A/B</td><td class="mono small">EXTI → HAL_GPIO_EXTI_Callback → increment/decrementGain (read, ±1, write)</td><td class="small">same as above; Pre-Mote is not told</td></tr>
      <tr><td>Hold the knob &gt; 0.55 s</td><td class="small">—</td><td class="small">push switch PB1</td><td class="mono small">TIM3 capture both edges → diff &gt; 400 → phantom ^= 1</td><td class="small">relays as above</td></tr>
      <tr><td>Short press</td><td class="small">—</td><td class="small">PB1</td><td class="mono small">diff ≤ 400 → nothing</td><td class="small">—</td></tr>
      <tr><td>Power cycle</td><td class="small">keeps its old slider</td><td class="mono small">“WBS PreMo” broadcast (nobody listens)</td><td class="mono small">phantomInit (OFF), count = 0, no restore</td><td class="small">5.6 dB, phantom off</td></tr>
      <tr><td>Add Mic</td><td class="mono small">btnAddMic_Click → premoControlPanel_Load (IP .9N)</td><td class="small">nothing until touched</td><td class="small">—</td><td class="small">—</td></tr></table>`;
  };
  SIM.on('time', draw);
  bootTicker(m, ()=>draw());
}
function wrapSvg(text, x, y, n, fs, col){ const words=text.split(' '); const lines=['']; words.forEach(w=>{ if ((lines[lines.length-1]+' '+w).length>n) lines.push(w); else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim(); }); return lines.map((l,i)=>`<text x="${x}" y="${y+i*(fs+3)}" font-size="${fs}" fill="${col}">${esc(l)}</text>`).join(''); }

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__premoActive = false;
  m.innerHTML = card('What the PREmo code is up to — findings from the source', `
  <ol>
    <li><b>Nothing survives a power cut.</b> There is no flash or EEPROM write anywhere in <span class="mono">PreMo b0-3</span>. At boot <span class="mono">phantomInit()</span> forces phantom OFF, <span class="mono">that5171Init()</span> resets the gain chip to step 0 (5.6 dB), and <span class="mono">count</span> starts at 0. This is fault #1 in the roadmap sheet (“does not revert to previous state when powered on”). Pre-Mote makes it worse: it never reads anything back, so after a reboot the PC still shows the old slider while the unit is at 0.</li>
    <li><b>The “dB” on the OLED and in Pre-Mote is not dB.</b> Both show the THAT5171 gain register (0, 8–63). The real preamp gain is 5.6 dB at step 0 and step + 5.6 dB above that (13.6–68.6 dB; schematic S6 and the 5171 datasheet). So “Gain: 40dB” is really 45.6 dB.</li>
    <li><b>Zero-crossing mode fights the busy check.</b> <span class="mono">that5171Init()</span> selects <span class="mono">THAT5171_MODE_ZC</span>, so after each write BUSY (PB7) stays high until the next zero crossing or the 22 ms RC timeout (R55 22 MΩ, C39 1 nF). <span class="mono">that5171WriteGain()</span> and <span class="mono">that5171ReadGain()</span> silently do nothing while BUSY is high. Two results:
      <ul><li>Fast Pre-Mote drags: later values are dropped by the chip, but <span class="mono">setGain()</span> still updates <span class="mono">count</span> and the OLED. The screen and the real gain disagree until the next change.</li>
      <li>Fast knob turns: <span class="mono">incrementGain()</span> starts with <span class="mono">count = that5171ReadGain()</span>, which returns 0 when busy. 0 becomes 8, so the gain <b>drops to step 8</b> (and turning down drops to 0). Try “spin fast” with the 20 Hz rumble programme.</li></ul></li>
    <li><b>The gain command isn't checked.</b> <span class="mono">UDP_receiveFromCB()</span> takes one or two ASCII digits with <span class="mono">&amp; 0x0F</span>. “Gain7” writes an illegal code (the 5171 ignores it and sets its ERR bit) while the OLED shows 7. “Gain99” sends 99 &amp; 0x3F = 35 to the chip, and <span class="mono">ssd1306SetGain()</span> finds no tens glyph for ≥ 64, so it calls <span class="mono">HAL_SPI_Transmit(NULL)</span> and leaves the old tens digit on screen. “Gain123” (7 bytes) is ignored.</li>
    <li><b>Pre-Mote V2 doesn't discover anything.</b> The firmware broadcasts “WBS PreMo” to x.x.255.255:48888 (<span class="mono">checkForPremote</span>, assuming a /16 network) and answers 0x90 (name) and 0x0E (MAC) queries to port 48888. No Pre-Mote version has a receive socket. V2 hard-codes 111.13.5.90 + panel number; the IP text boxes are editable but <span class="mono">btnConnect_Click</span> is commented out, so edits are ignored.</li>
    <li><b>The name reply points into a receive buffer.</b> <span class="mono">parseGetDeviceConfig()</span> passes <span class="mono">deviceNameUTF8 = payload</span>, a pointer into <span class="mono">rxMessageBuffer</span> (offset 35), and <span class="mono">getDeviceConfigCB</span> stores the pointer, not a copy. Any later ARC message longer than 35 bytes overwrites it, and the 0x90 reply then sends that message's bytes instead. Try “long 40-byte string, then 0x90” in the protocol lab.</li>
    <li><b>The opcodes are borrowed.</b> 0x90 and 0x0E are the ARC command IDs <span class="mono">ARC_CMDID_N_GETDEVICECONFIG</span> and <span class="mono">ARC_CMDID_M_GETMACADDR</span> (ARC_IDs.h), reused as UDP opcodes.</li>
    <li><b>Almost everything runs inside interrupts.</b> COBS decoding, the checksum, <span class="mono">UDP_receiveFromCB()</span>, the SPI write to the THAT5171 and about 15 SPI writes to the OLED all run inside the USART1 or EXTI interrupt. The 0x90/0x0E replies even use blocking <span class="mono">HAL_UART_Transmit</span> (100 ms timeout) from inside the USART1 receive interrupt, before reception is re-armed. Then the main loop sees <span class="mono">pCount != count</span> and does the THAT write and the OLED update a <b>second time</b>. An encoder interrupt can also land between <span class="mono">ssd1306SetPhantom</span>'s column command and its data, writing to the wrong place ${inf}.</li>
    <li><b>A logic slip in the UART callback.</b> <span class="mono">expectedCMDRESP == (ARC_CMDID_UDP_SETCONFIGURATION || ARC_CMDID_UDP_SENDTO)</span> compares with 1 (the result of <span class="mono">||</span>), which happens to be <span class="mono">ARC_CMDID_M_GETFIRMREV</span>. Frames shorter than 7 bytes (ARC ACKs are 6) are therefore parked in <span class="mono">ARCrxBuff</span> until the next frame arrives. <span class="mono">rxCount</span> is a <span class="mono">uint8_t</span> indexing a 1024-byte buffer. The simulator replays this exactly: watch the ACK after a 0x90 reply.</li>
    <li><b>Copy-paste in ARCinit.</b> The retry loops for GetSystemState and GetAudioMode resend <span class="mono">ARCgetFirmwareRevision()</span>. The GetDeviceConfig loop resends <span class="mono">ARCgetSystemState()</span>, and its test <span class="mono">devConfig.currentIPaddress == 0</span> compares an array's address (always false). None of the loops has a timeout, so with no uNet answer the unit stays on the logo forever. In the unused <span class="mono">ARCsetDeviceConfig()</span> the gateway uses <span class="mono">=</span> instead of <span class="mono">+=</span>.</li>
    <li><b>16 seconds to boot.</b> <span class="mono">unetReset()</span> holds reset 200 ms and then waits 5 s, main() adds <span class="mono">HAL_Delay(10000)</span>, then ARCinit runs. UDP commands sent during that time are lost.</li>
    <li><b>Phantom is two opto-MOS relays, not a latching relay.</b> The software README guessed a latching relay. Sheet S1 shows K1 (CPC1017N) switching +48 V onto the PHANTOM net and K2 shorting it to AGND, with the note “Breaks Before Makes, 10 mS Minimum Delay”. The firmware waits 100 ms and keeps the chosen side driven. Two more details:
      <ul><li><span class="mono">PHANTOM_ON</span> is 0x00 and <span class="mono">PHANTOM_OFF</span> is 0x01, the opposite of the UDP byte. <span class="mono">pPhantom</span> starts as PHANTOM_ON, so the first loop pass runs <span class="mono">setPhantomPower(OFF)</span> again. That is the only thing that ever draws “OFF” on the screen at boot.</li>
      <li>If phantom changes twice inside the 100 ms delay, the relays follow the first value but the OLED and <span class="mono">pPhantom</span> take the second, and nothing corrects it. Use “Race: phantom toggled twice within 40 ms”.</li></ul></li>
    <li><b>The knob's push switch only has a long press.</b> TIM3 runs at 48 MHz / 65 536 (1.365 ms per tick). <span class="mono">HAL_TIM_IC_CaptureCallback</span> toggles phantom only if the press lasted more than 400 ticks (0.546 s). There is no on-screen hint, and no debounce (ICFilter = 0).</li>
    <li><b>Pre-Mote's slider can't leave 0 by keyboard.</b> <span class="mono">If trbGain.Value &lt; 8 Then trbGain.Value = 0</span> runs on every Scroll event, so arrow keys, the wheel and Page Up (+5) all snap back to 0. Each Scroll event also creates a new <span class="mono">UdpClient</span> that is never closed. In V1, moving the slider before pressing Connect calls <span class="mono">IPAddress.Parse(Nothing)</span> and crashes. In V2, a 9th “Add Mic” makes a panel with no IP that hides behind MIC: 0.</li>
    <li><b>Leftovers.</b> TIM17 is configured but never started. The USB device peripheral is initialised with no USB stack. CONTROL_GPIO1–4 go to the display header and are never used. DMA is set up for USART1 RX, but reception is one interrupt per byte. <span class="mono">isAkm5572Ovf()</span> exists but nothing reads the overload pin. The SSD1306 font has no capital R, and its <span class="mono">chart</span> glyph is a “T”. AKM read-modify-writes only OR bits in. The ARC library accepts any packet whose last byte is 0xEE as if the checksum were good. The ToolChainLocation still points at “backup3 - starting autodiscovery”.</li>
    <li><b>Undocumented OLED column commands.</b> “Phantom:” and its value are placed with upper-column commands 0x1B and 0x1E. The SSD1306 defines only 0x10–0x17. If the chip ignores bit 3 ${inf}, they land at columns 59 and 109, and “OFF” ends exactly at column 127. The simulator assumes that.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass 0.5 µs, HAL call overhead 4 µs, UART ISR 3 µs, uNet UDP→ARC latency 0.4 ms ${inf}. SPI, UART and timer rates come from the .ioc.</li>
    <li>AES67 1 ms packets of 48 samples come from the uNet parameter sheet (its Bridge-mode example). The 48 kHz rate, PTP Sync rate, stream channel count and OLED frame rate are ${inf}.</li>
    <li>The unit's IP (111.13.5.90) is ${inf} from Pre-Mote V2's defaults. The MAC addresses and the PC's IP are placeholders. The uNet's ACK/response frame format is ${inf} from <span class="mono">ARC_receivePacket</span>.</li>
    <li>THAT5171 SPI read-back in one 16-bit frame, the encoder phase order, relay switching times, phantom-rail time constants and mic levels are ${inf}. Condenser output needs the rail above 40 V ${inf}.</li>
    <li>Actions are processed as a discrete-event simulation from the playhead. Acting at a time earlier than previous events starts a new second, with the device state carried over. The 16 s boot runs on the wall clock, not on the one-second timeline.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#PREmo #Series/RD88-MICpre/software/working beta versions/PreMo b0-3/Src/main.c, ARC_controller.c, PreMo_ARC.c, ARC_transport.c, ARC_notifications.c, ARC_responses.c, ARC_commands.c, THAT5171.c, rotaryEncoder.c, PHANTOM.c, SSD1306.c, AKM5572.c, UNET.c, spi.c, tim.c · Inc/mxconstants.h, ARC_IDs.h, PHANTOM.h · V010000.ioc</li>
    <li>…/premoteControl/Pre-Mote V2 - Before Studio Demo/SOURCE CODE/…/premoControlPanel.vb, premoControlPanel.Designer.vb, Form1.vb, Form1.Designer.vb · Pre-Mote V1 - ADAM, V1.1 - APK</li>
    <li>…/PCB/backup29-final - for real real/MICPRE-ISS1/MICPRE-1-ISS1.pdf, PreMo-ISS1-Assembly.PDF · …/PCB - DISPLAY BOARD/ISS2/PreMo-2-ISS2.PDF, Premo-2-ISS2-MasterBom.xls.xlsx</li>
    <li>…/uNetMini settings.txt.docx · unet-Mini-Parameters.xlsx · components/THATCorp/5171 Datasheet 600133 r07.pdf · PREmo - #Roadmap #Marketing/Premo-A1 … Fault Log … .xlsx</li>
    <li>XXX - ENGINEERING - 2016 RD FILES/RD88-MICpre: earlier schematic backups and the same component library (no extra firmware).</li></ul>`);
}

/* ---------------- register plugin ---------------- */
appInit();
SIM.register({
  id:'premo', name:'PREmo RD88 · AES67 mic preamp + Pre-Mote ('+Y(2016)+')', duration:1,
  product:'PREmo (RD88-MICpre)', year:2016, family:'#PREmo #Series', folder:'#PREmo #Series',
  summary:'One-channel AES67/Ravenna microphone preamp: THAT1580 + THAT5171 digital gain, AK5572 ADC, Archwave uNet Mini, PoE. An STM32F070 drives an SSD1306 OLED and a push-turn encoder, and takes UDP commands from the VB.NET Pre-Mote app over the uNet\'s ARC serial link.',
  highlights:['Display and main boards from the real Altium assembly drawings','Working Pre-Mote V2 window that sends the real “Gain40” / “PHANTOM” bytes','Firmware replayed byte by byte: COBS/ARC frames, SPI to the THAT5171, OLED pixels from the firmware font','12-step tutorial including the power cycle that forgets everything','Zero-crossing gain race, phantom relay race and other bugs you can trigger'],
  depth:'Full model',
  stepUnits:[
    {label:'1 UART byte (86.8 µs)', period:()=>C.UB},
    {label:'1 AES67 packet (1 ms)', period:()=>C.PKT},
    {label:'1 SysTick (1 ms)', period:()=>C.TICK},
    {label:'1 I²S sample (48 kHz)', period:()=>1/C.FS},
    {label:'1 SPI1 frame (5.33 µs)', period:()=>C.SPI1_FRAME},
    {label:'1 OLED frame', period:()=>C.OLED},
    {label:'10 ms', period:()=>0.01},
    {label:'22 ms (ZC timeout)', period:()=>C.TRC},
    {label:'100 ms (phantom delay)', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.15,'150 ms (phantom switch)'],[0.03,'30 ms (ZC timeout)'],[0.01,'10 ms'],[0.003,'3 ms (one UDP command)'],[0.0004,'400 µs (UART bytes)'],[0.00003,'30 µs (SPI bits)'],[0.000004,'4 µs (main-loop passes)']],
  defaultZoom:4,
  init(){ if (!SNAP.length || SNAP.length===1){ TR=null; firmwareInit(-0.6, true); EV=EV.filter(e=>e.t>=0); } },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: PREmo + Pre-Mote', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
