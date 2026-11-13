/* =====================================================================
   RD71 — Touch Display (Densitron RipDraw 1RU TFT, BeagleBone Black host), Ward-Beck R&D, 2015|48
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "ENGINEERING - 2016 RD FILES/RD71-TouchDisplay"):
   - README.md, Research.txt, Densitron Display/Software/README.md, ../README.md, ../R&D_List.xls.md (RD62, RD71)
   - Densitron Display/Software/working/areaSpecificTouch/source/main.c, main.h, gettouch.c, dump_buffer.c, Makefile
       main(), touchDetect(), btn1x/btn1y/btn2x/btn2y, touchRadSquared, NUM_LAYERS, bg/l1, write_id_* (15 May 2015)
   - …/working/movingDots/source/main.c, …/working/loadAndDeleteImages/source/main.c (14 May 2015)
   - …/things that compiled/1RU_tutorial_2_touch/source/touch1.c, gettouch.c (Densitron tutorial 2.1T, Mar 2015)
   - …/things that compiled/1RU_tutorial_1/source/1RU_T1.c, ripdraw_portal/1_simple_images.txt
   - …/things that compiled/<flat library folder>/Ripdraw.c (RdInitRequest, RdProcessRequest, RdProcessResponse,
       RdGetEventData, RdImage*), RipdrawTypes.h (RdCommand / RdError ids), ProtoBuffer.c (RdChecksum, RdWriteUWord,
       RdWriteString, RdWriteColor), RipdrawLinuxSerial.c (B115200, VMIN/VTIME), main.c, 1Test1.c (portal export)
   - …/backup1 - first attempt for example fiveb/fivebbbb/fivebbbb.c
   - Densitron Display/Documents/84-0221-000T.pdf (480×110 TFT, pinouts, RipDraw Lite command set),
       83-0022-000.pdf (dev kit: Cortex-M4 GPU, DTS430 PCT touch, 1U bezel), Tutorial_Loading _1U_Splash_Screen.pdf,
       helpful_hints_on_beagle_bone_black_and_tools.pdf
   - Densitron Display/Images/*.jpg and Photoshop Work Folder/*.psd (WBS GUI art; converted to assets/rd71-touchdisplay-*.png)
   - Densitron Display/Tools/*.zip (vendor tutorials five_buttons_7, buttonoff_7 …)
   - Product link: AMS82 - #Master/AMS82 - CharacterDisplayReplacement #RD #RD62/README.md, details.txt;
       AMS81 - #Master/README.md and AMS8-1 - #TESTREPORT/README.md (06VA0002, HDSP2533, May 2016);
       XTM4 - #MASTER/README.md (04AV0001, HDSP-2533, Nov 2015); siumulation-plugins/ams82.js
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/rd71-touchdisplay-';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const RDF = 'ENGINEERING - 2016 RD FILES/RD71-TouchDisplay/';

/* ---------------- constants ---------------- */
const C = {
  W:480, H:110, PITCH:0.198,                 // 84-0221-000T: 480 RGB × 110, 0.198 mm pitch
  OUT_W:133.74, OUT_H:40.03, VA_W:95.24, VA_H:21.85,   // outline and viewing area, mm
  BAUD:115200,                               // RipdrawLinuxSerialInit: speed_t speed = B115200 (ignored by USB CDC-ACM)
  USB_FRAME:0.001,                           // USB full-speed frame (SOF every 1 ms)
  T_HOST:60e-6, T_WAKE:40e-6,                // write() → bulk OUT, read() wake-up — INFERRED
  USLEEP:0.00108,                            // usleep(1000) on the BBB kernel incl. timer slack — INFERRED
  LCD:1/60, LCD_PH:0.004,                    // TFT refresh — INFERRED (not in the datasheet)
  LC:0.035,                                  // datasheet: response time TON+TOFF = 35 ms
  SCAN:0.010, SCAN_PH:0.0037, I2C:0.0005,    // touch controller scan and M4 read-out — INFERRED
  OPEN:0.003,                                // open()+tcsetattr() — INFERRED
  END:1.02,
  R2:529,                                    // main.h touchRadSquared = 529 (= 23²)
  BTN:[[121,56],[361,56]],                   // main.h btn1x,btn1y / btn2x,btn2y
  BW:43,                                     // WBS BUTTON-ON/OFF art is 43 × 43 px
};
// RipdrawTypes.h command ids; the last number is the GPU processing time (INFERRED)
const CMD = {
  reset:[0x3831,'RdReset',0.030], layer:[0x3131,'RdSetLayerEnable',0.0002], back:[0x3133,'RdSetLayerBackColor',0.0015],
  load:[0x3231,'RdImageLoad',0.004], write:[0x3233,'RdImageWrite',0.0006], del:[0x3234,'RdImageDelete',0.0005],
  move:[0x3235,'RdImageMove',0.0006], event:[0x3832,'RdGetEventData',0.00015], info:[0x3631,'RdSystemInfo',0.0003],
};
const ERR = {0x8022:'RdErrorImageInvalidLabel',0x8023:'RdErrorImageInvalidId',0x8027:'RdErrorImageWriteInvalidId',0x8907:'RdErrorPortOpenFailed'};
const FLAG = ['Putdown','Putup*','Contact','UNKNOWN'];
const ART = {
  blank:['Blank.psd (black)', null], logo1:['WBS Metal Logo.jpg','logo1'], logo2:['WBS Metal Logo 2.jpg','logo2'],
  logo3:['WBS Metal Logo 3.jpg','logo3'], elements:['WBS Elements.jpg (ROOT menu mock-up)','elements'], vu:['VU METER.psd (½ scale)','vu'],
};
const IMG = {};
['logo1','logo2','logo3','elements','vu','btn-on','btn-off'].forEach(k=>{ const im=new Image(); im.onload=()=>{ try{ SIM.refresh(); }catch(e){} }; im.src=ASSET+k+'.png'; IMG[k]=im; });

/* ---------------- the programs (what each archived main.c does, step by step) ---------------- */
const INIT_STEPS = [
  ['RdInitialize(rdi, 1, &portname)','RipdrawLinuxSerialInit("/dev/ttyACM0"): open, cfmakeraw, B115200, VMIN 1, VTIME 10'],
  ['RdReset(rdi)','command 0x3831; the display blanks and the splash goes'],
  ['for (i = 0; i < NUM_LAYERS; i++) RdSetLayerEnable(rdi, i+1, RD_TRUE)','layers bg = 1 and l1 = 2'],
  ['RdImageLoad(rdi, "bg" / "btn1" / "btn2", &image_id_…)','labels looked up in the display flash; ret checked'],
  ['RdSetLayerBackColor(rdi, bg / l1, RdCreateColor(0xff,0xff,0xff,0x00))','white at alpha 0 = transparent; ret not checked'],
];
const PROGS = {
  area:{ name:'areaSpecificTouch', file:'working/areaSpecificTouch/source/main.c', date:'15 May 2015', steps: INIT_STEPS.concat([
    ['RdImageWrite(bg, (0,0)); RdImageWrite(l1, btn1, (98,33))','write_id_bg, write_id_btn1'],
    ['touchDetect() until (2·xPos−121)² + (2·yPos−56)² ≤ 529','polls RdGetEventData with no sleep; hit test after every poll'],
    ['for (i=98; i<338; i+=2) { usleep(1000); RdImageMove(rdi, write_id_btn1, (i,33)); }','120 moves of 2 px; ret ignored'],
    ['RdImageDelete(write_id_btn1); RdImageWrite(l1, btn2, (338,33), &write_id_btn2)','swap to the second image'],
    ['touchDetect() until (2·xPos−361)² + (2·yPos−56)² ≤ 529','same loop, second button'],
    ['for (i=338; i>98; i-=2) { usleep(1000); RdImageMove(rdi, write_id_btn1 /*sic*/, (i,33)); }','moves the write id that was deleted'],
    ['RdImageDelete(write_id_btn2); RdImageWrite(l1, btn1, (i,33), &write_id_btn1)','i = 98 after the loop; back to the top of for(;;)'] ]) },
  dots:{ name:'movingDots', file:'working/movingDots/source/main.c', date:'14 May 2015', steps: INIT_STEPS.concat([
    ['RdImageWrite(bg, (0,0)); RdImageWrite(l1, btn1, (122,33))',''],
    ['for (i=122; i<338; i++) { usleep(1000); RdImageMove(rdi, write_id_btn1, (i,33)); }','216 moves of 1 px'],
    ['RdImageDelete(write_id_btn1); RdImageWrite(l1, btn2, (i=338,33))',''],
    ['for (i=338; i>122; i--) { usleep(1000); RdImageMove(rdi, write_id_btn1 /*sic*/, (i,33)); }','the same deleted-id slip'],
    ['RdImageDelete(write_id_btn2); RdImageWrite(l1, btn1, (122,33))','while(1)'] ]) },
  load:{ name:'loadAndDeleteImages', file:'working/loadAndDeleteImages/source/main.c', date:'14 May 2015', steps: INIT_STEPS.concat([
    ['RdImageWrite(bg, (0,0))',''],
    ['RdImageWrite(l1, btn1, (122,33)); usleep(1000000)','shows btn1 for 1 s'],
    ['RdImageDelete(write_id_btn1); RdImageWrite(l1, btn2, (338,33)); usleep(1000000)','shows btn2 for 1 s'],
    ['RdImageDelete(write_id_btn2)','for(;;)'] ]) },
  touch1:{ name:'touch1 (Densitron 1RU_Tutorial_2_touch)', file:'things that compiled/1RU_tutorial_2_touch/source/touch1.c + gettouch.c', date:'14 Mar 2015', steps:[
    INIT_STEPS[0], INIT_STEPS[1],
    ['RdSetLayerEnable(1); RdSetLayerBackColor(1, RdCreateColor(0xff,0x00,0x00,0xff))','solid red layer, no images'],
    ['gettouch(rd_interface): RdGetEventData + printf of every packet','dump_buffer() prints the raw bytes'],
    ['sleep(SLEEPTIME)   /* SLEEPTIME = 1 → one whole second */','events wait in the display until the next poll'] ] },
};

/* ---------------- device + bench state ---------------- */
function defaults(){ return {
  prog:'area', usb:true, splash:true, flashWBS:true, link:'usb', scale:'half', reuse:true, smear:true, zones:true,
  bg:'blank', splashArt:'logo3', hold:0.08,
  touches:[{t:0.16,x:121,y:56,d:0.08},{t:0.62,x:361,y:56,d:0.08}],
  emu:{detected:false, info:false}, cycled:false, bbb:false, log:[], lastTrace:[],
}; }
let D = defaults();
function factory(){ const L=D.log; D=defaults(); D.prog=null; D.splash=false; D.flashWBS=false; D.touches=[]; D.log=L; }

/* ---------------- RipDraw wire format (Ripdraw.c / ProtoBuffer.c) ---------------- */
const u16a = v => [v&255,(v>>8)&255];                       // RdWriteUWord: native little-endian on the ARM
const strBytes = s => u16a(s.length).concat([...s].map(ch=>ch.charCodeAt(0)));   // RdWriteString: u16 length + chars
function frame(cmd, seq, payload){                          // RdInitRequest + RdProcessRequest
  const b = u16a(cmd).concat(u16a(seq), u16a(payload.length), payload);
  let s=0; b.forEach(x=>s+=x); return b.concat(u16a(s&0xFFFF));   // RdChecksum: 16-bit byte sum
}
const hex = (a,n) => a.slice(0,n||a.length).map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ') + (n&&a.length>n?' …':'');
const ascii = id => String.fromCharCode(id>>8)+String.fromCharCode(id&255);
function ptBytes(flag,x,y,id){                              // touch point as gettouch.c decodes it
  let X=x, Y=y; if (flag===1){ X=y; Y=x; }                  // controller firmware swaps x,y on this event (gettouch.c comment)
  return [((flag&3)<<6)|((X>>8)&15), X&255, ((id&15)<<4)|((Y>>8)&15), Y&255];
}

/* ---------------- the touch panel ---------------- */
function touchPackets(){
  const out=[];
  D.touches.forEach((tc,ti)=>{
    const kd=Math.ceil((tc.t-C.SCAN_PH)/C.SCAN-1e-9), ku=Math.max(kd+1, Math.ceil((tc.t+tc.d-C.SCAN_PH)/C.SCAN-1e-9));
    const rx = D.scale==='half'? (tc.x>>1) : tc.x, ry = D.scale==='half'? (tc.y>>1) : tc.y;
    for (let k=kd;k<=ku;k++){ const flag = k===kd? 0 : k===ku? 1 : 2; const ts=C.SCAN_PH+k*C.SCAN;
      out.push({ti, k, flag, ts, ta:ts+C.I2C, x:tc.x, y:tc.y, rx, ry, bytes:ptBytes(flag,rx,ry,0), used:false, readT:null, seq:null}); }
  });
  return out.sort((a,b)=>a.ta-b.ta);
}

/* ---------------- schedule: run the selected main() against the modelled display ---------------- */
let S=null, SKEY='';
function sched(){ const k=JSON.stringify([D.prog,D.usb,D.splash,D.flashWBS,D.link,D.scale,D.reuse,D.touches]); if(k!==SKEY){ SKEY=k; S=build(); } return S; }

function build(){
  const S={cmds:[],steps:[],sleeps:[],snaps:[],pk:touchPackets(),hits:[],console:[],exit:null,tEnd:0};
  const P=PROGS[D.prog];
  const dev={img:{}, nextImg:1, w:{}, nextW:1, layers:{}, back:{}, splash:D.splash&&D.usb};
  const snap=t=>S.snaps.push({t, splash:dev.splash, layers:Object.assign({},dev.layers), back:Object.assign({},dev.back),
    ws:Object.keys(dev.w).map(k=>Object.assign({id:+k},dev.w[k]))});
  snap(0);
  if (!P) return S;
  let t=0, step=0, seqNo=0;
  const stepMark=s=>{ step=s; const last=S.steps[S.steps.length-1]; if(last&&last.s===s) return; if(last) last.t1=t; S.steps.push({s,t0:t,t1:null}); };
  const finish=()=>{ const last=S.steps[S.steps.length-1]; if(last) last.t1=t; S.tEnd=t; };
  const sleep=(d,label)=>{ S.sleeps.push({t0:t,t1:t+d,label}); t+=d; };
  const done=()=> t>C.END || S.cmds.length>6000;
  const cmd=(k,payload,effect)=>{
    const [id,name,proc]=CMD[k]; seqNo=(seqNo%65535)+1; const req=frame(id,seqNo,payload); let rec;
    for (let attempt=0; attempt<2; attempt++){            // RdProcessRequest retries once on any failure
      const t0=t, tr = D.link==='uart'? t0+req.length*10/C.BAUD : t0+C.T_HOST, tp=tr+proc;
      const r = effect? effect(tp,tr) : {st:0};
      const resp=frame(id,seqNo,u16a(r.st).concat(r.ex||[]));
      const t1 = D.link==='uart'? tp+resp.length*10/C.BAUD : Math.ceil(tp/C.USB_FRAME-1e-9)*C.USB_FRAME + C.T_WAKE;
      rec={t0,tr,tp,t1,k,id,name,seq:seqNo,req,resp,st:r.st,attempt,info:r.info||{},step,prog:D.prog};
      S.cmds.push(rec); t=t1;
      if (!r.st) break;
    }
    return rec;
  };
  // effects inside the display's Cortex-M4 (RipDraw Lite) at the moment it processes the command
  const fxReset=tp=>{ dev.img={}; dev.nextImg=1; dev.w={}; dev.nextW=1; dev.layers={}; dev.back={}; dev.splash=false; snap(tp); return {st:0}; };
  const fxLayer=(l,en)=>tp=>{ dev.layers[l]=en; snap(tp); return {st:0}; };
  const fxBack=(l,col)=>tp=>{ dev.back[l]=col; snap(tp); return {st:0}; };
  const fxLoad=label=>()=>{ if(!D.flashWBS) return {st:0x8022}; const id=dev.nextImg++; dev.img[id]=label; return {st:0, ex:u16a(id), info:{id}}; };
  const allocW=()=>{ if(D.reuse){ let i=1; while(dev.w[i]) i++; return i; } return dev.nextW++; };
  const fxWrite=(layer,imgId,x,y)=>tp=>{ if(!dev.img[imgId]) return {st:0x8023}; const id=allocW(); dev.w[id]={img:dev.img[imgId],layer,x,y}; snap(tp); return {st:0, ex:u16a(id), info:{id}}; };
  const fxDel=wid=>tp=>{ if(!dev.w[wid]) return {st:0x8027}; delete dev.w[wid]; snap(tp); return {st:0}; };
  const fxMove=(wid,x,y)=>tp=>{ const w=dev.w[wid]; if(!w) return {st:0x8027}; w.x=x; w.y=y; snap(tp); return {st:0}; };
  const fxEvent=(tp,tr)=>{ const got=S.pk.filter(p=>!p.used && p.ta<=tr); got.forEach(p=>p.used=true);
    let ex=[0,0].concat(u16a(got.length), u16a(0));        // bytes 8–9 (not read by the library), packetCount, hasMoreData
    got.forEach(p=>{ const data=u16a(6).concat([0,1],p.bytes); ex=ex.concat(u16a(1+data.length),[1],data); });
    return {st:0, ex, info:{pk:got}}; };
  const markRead=r=>{ (r.info.pk||[]).forEach(p=>{ p.readT=r.t1; p.seq=r.seq; }); };
  const writeImg=(layer,imgId,x,y)=>{ const r=cmd('write',u16a(layer).concat(u16a(imgId),u16a(x),u16a(y)),fxWrite(layer,imgId,x,y));
    if (r.st){ S.exit={t, code:r.st, why:`RdImageWrite → ${ERR[r.st]}; main() returns ret`}; return 0; } return r.info.id; };
  const move=(wid,x,y)=>cmd('move',u16a(wid).concat(u16a(x),u16a(y)),fxMove(wid,x,y));

  stepMark(0); t+=C.OPEN;
  if (!D.usb){ stepMark(1); S.exit={t, code:0x8907, why:'no /dev/ttyACM0: RdInitialize fails (its return is not checked), then RdReset → _RD_CHECK_INTERFACE → RdErrorPortOpenFailed; main() returns'}; finish(); return S; }
  stepMark(1); cmd('reset',[],fxReset);
  if (D.prog==='touch1'){
    stepMark(2); cmd('layer',u16a(1).concat([1]),fxLayer(1,1)); cmd('back',u16a(1).concat([255,0,0,255]),fxBack(1,[255,0,0,255]));
    S.console.push({t, s:'Ripdraw Tutorial 2 Touch Screen Dump\nRipdraw Screen will remain blank\nPutDown X,Y swap bug correct by software'});
    while(!done()){ stepMark(3); const r=cmd('event',[],fxEvent); markRead(r); if(r.info.pk.length) S.console.push({t, s:dumpTouch(r.info.pk)}); stepMark(4); sleep(1,'sleep(1)'); }
    finish(); return S;
  }
  stepMark(2); for (let l=1;l<=2;l++) cmd('layer',u16a(l).concat([1]),fxLayer(l,1));
  stepMark(3); const ids={};
  for (const lb of ['bg','btn1','btn2']){ const r=cmd('load',strBytes(lb),fxLoad(lb));
    if (r.st){ S.exit={t, code:r.st, why:`RdImageLoad("${lb}") → ${ERR[r.st]} (0x${r.st.toString(16).toUpperCase()}): the label is not in the display flash; main() returns ret`}; finish(); return S; }
    ids[lb]=r.info.id; }
  stepMark(4); cmd('back',u16a(1).concat([255,255,255,0]),fxBack(1,[255,255,255,0])); cmd('back',u16a(2).concat([255,255,255,0]),fxBack(2,[255,255,255,0]));
  stepMark(5); writeImg(1,ids.bg,0,0);
  if (D.prog==='area'){
    let wb1=writeImg(2,ids.btn1,98,33), wb2=0, xPos=0, yPos=0, i;
    const poll=(target,s)=>{ stepMark(s);
      while(!done()){ const r=cmd('event',[],fxEvent); markRead(r); const pk=r.info.pk;
        pk.forEach(p=>{ xPos=p.rx; yPos=p.ry; });            // after the Putup* swap the host always ends with x,y
        const [bx,by]=C.BTN[target]; const td=(2*xPos-bx)*(2*xPos-bx)+(2*yPos-by)*(2*yPos-by), hit=td<=C.R2;
        if (pk.length || hit) S.hits.push({t, target, x:xPos, y:yPos, td, hit, fresh:pk.length>0, ti: pk.length? pk[pk.length-1].ti : -1, seq:r.seq, n:pk.length});
        if (hit) return true; }
      return false; };
    while(!done() && !S.exit){
      if (!poll(0,6)) break;
      stepMark(7); for (i=98;i<338;i+=2){ sleep(C.USLEEP,'usleep(1000)'); move(wb1,i,33); if(done()) break; }
      if (done()) break;
      stepMark(8); cmd('del',u16a(wb1),fxDel(wb1)); wb2=writeImg(2,ids.btn2,338,33); if(S.exit) break;
      if (!poll(1,9)) break;
      stepMark(10); for (i=338;i>98;i-=2){ sleep(C.USLEEP,'usleep(1000)'); move(wb1,i,33); if(done()) break; }
      if (done()) break;
      stepMark(11); cmd('del',u16a(wb2),fxDel(wb2)); wb1=writeImg(2,ids.btn1,i,33);
    }
  } else if (D.prog==='dots'){
    let wb1=writeImg(2,ids.btn1,122,33), wb2=0, i;
    while(!done() && !S.exit){
      stepMark(6); for (i=122;i<338;i++){ sleep(C.USLEEP,'usleep(1000)'); move(wb1,i,33); if(done()) break; }
      if (done()) break;
      stepMark(7); cmd('del',u16a(wb1),fxDel(wb1)); wb2=writeImg(2,ids.btn2,i,33);
      stepMark(8); for (i=338;i>122;i--){ sleep(C.USLEEP,'usleep(1000)'); move(wb1,i,33); if(done()) break; }
      if (done()) break;
      stepMark(9); cmd('del',u16a(wb2),fxDel(wb2)); wb1=writeImg(2,ids.btn1,i,33);
    }
  } else if (D.prog==='load'){
    while(!done() && !S.exit){
      stepMark(6); const a=writeImg(2,ids.btn1,122,33); sleep(1,'usleep(1000000)'); if(done()) break;
      stepMark(7); cmd('del',u16a(a),fxDel(a)); const b=writeImg(2,ids.btn2,338,33); sleep(1,'usleep(1000000)'); if(done()) break;
      stepMark(8); cmd('del',u16a(b),fxDel(b));
    }
  }
  finish(); return S;
}

function dumpTouch(pk){               // what gettouch.c + dump_buffer.c print for one EventMessage
  let s=`**** EventMessage with ${pk.length} Event.data packets ****`;
  pk.forEach((p,i)=>{ const d=[0,1].concat(p.bytes); let db=''; d.forEach((b,c)=>{ db+=b.toString(16).padStart(2,'0').toUpperCase()+' '; if(c%4===3) db+=' '; });
    s+=`\n${i+1}/${pk.length}\tPkData ${db}\tGesture 0\tPoints 1  1 -> X=${p.rx} Y=${p.ry} Evt=${p.flag}  ${['Putdown','Putup* ','Contact','UNKNOWN'][p.flag]}`; });
  return s;
}

/* ---------------- lookups at the playhead ---------------- */
function bs(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(arr[m][key]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function stateAt(t){ const s=sched(); const i=bs(s.snaps,t,'t'); return s.snaps[Math.max(0,i)]; }
function cmdAt(t){ const s=sched(); const i=bs(s.cmds,t,'t0'); const c=s.cmds[i]; return c && t<c.t1? c : null; }
function lastCmd(t){ const s=sched(); const i=bs(s.cmds,t,'t0'); return i>=0? s.cmds[i] : null; }
function stepAt(t){ const s=sched(); const i=bs(s.steps,t,'t0'); return i>=0? s.steps[i] : null; }
function sleepAt(t){ const s=sched(); const i=bs(s.sleeps,t,'t0'); const z=s.sleeps[i]; return z && t<z.t1? z : null; }
function vsyncBefore(t){ const k=Math.floor((t-C.LCD_PH)/C.LCD); return k<0? 0 : C.LCD_PH+k*C.LCD; }
function fingerAt(t){ return D.touches.find(tc=>t>=tc.t && t<tc.t+tc.d); }
function phaseOf(c,t){ if(!c) return ''; if(t<c.tr) return 'tx'; if(t<c.tp) return 'proc'; return 'rx'; }

/* ---------------- the LCD ---------------- */
function artImg(key){ const a=ART[key]; return a && a[1]? IMG[a[1]] : null; }
function drawW(c,w,alpha){
  const im = w.img==='bg'? artImg(D.bg) : IMG[w.img==='btn1'?'btn-off':'btn-on'];
  c.globalAlpha=alpha;
  if (w.img==='bg'){ if(im && im.complete && im.naturalWidth) c.drawImage(im,w.x,w.y,C.W,C.H); }
  else if (im && im.complete && im.naturalWidth) c.drawImage(im,w.x,w.y,C.BW,C.BW);
  else { c.fillStyle='#ffe600'; c.fillRect(w.x,w.y,C.BW,C.BW); }
  c.globalAlpha=1;
}
function paint(c, st){
  c.fillStyle='#000'; c.fillRect(0,0,C.W,C.H);
  if (st.splash){ const im=artImg(D.splashArt); if(im&&im.complete&&im.naturalWidth) c.drawImage(im,0,0,C.W,C.H); return; }
  for (let l=1;l<=7;l++){ if(!st.layers[l]) continue; const b=st.back[l]; if(b && b[3]>0){ c.fillStyle=`rgba(${b[0]},${b[1]},${b[2]},${b[3]/255})`; c.fillRect(0,0,C.W,C.H); }
    st.ws.filter(w=>w.layer===l).forEach(w=>drawW(c,w,1)); }
}
function drawLCD(cv, t, o){
  o=o||{}; const sc=o.scale||2; if (cv.width!==C.W*sc){ cv.width=C.W*sc; cv.height=C.H*sc; }
  const c=cv.getContext('2d'); c.setTransform(sc,0,0,sc,0,0); c.imageSmoothingEnabled=true;
  if (!D.usb){ c.fillStyle='#030303'; c.fillRect(0,0,C.W,C.H); c.fillStyle='#333'; c.font='12px sans-serif'; c.fillText('no power: the module is USB-powered and the cable is out',90,58); return; }
  const tv = o.exact? t : vsyncBefore(t), st=stateAt(tv);
  paint(c, st);
  if (D.smear && !o.noSmear && !st.splash){          // liquid-crystal response (35 ms) leaves a fading trail
    [[1,0.42],[2,0.18]].forEach(([j,a])=>{ const tj=tv-j*C.LCD; if(tj<0) return; const sj=stateAt(tj);
      sj.ws.filter(w=>w.img!=='bg' && !st.ws.find(v=>v.img===w.img&&v.x===w.x)).forEach(w=>drawW(c,w,a)); }); }
  if (o.zones && D.zones && (D.prog==='area')){
    c.lineWidth=1; c.setLineDash([3,2]);
    C.BTN.forEach(([bx,by],k)=>{ c.strokeStyle=k? '#ff6ad5' : '#5ad1ff';
      if (D.scale==='half'){ c.beginPath(); c.arc(bx,by,23,0,7); c.stroke(); }
      else { c.beginPath(); c.arc(bx/2,by/2,11.5,0,7); c.stroke(); c.fillStyle=c.strokeStyle; c.font='9px sans-serif'; c.fillText('hit zone '+(k+1)+' (native scale)', bx/2+13, by/2+3); } });
    c.setLineDash([]);
  }
  const f=fingerAt(t); if (f && o.finger!==false){ c.strokeStyle='#fff'; c.fillStyle='rgba(255,255,255,.25)'; c.lineWidth=1.5; c.beginPath(); c.arc(f.x,f.y,9,0,7); c.fill(); c.stroke(); }
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({t:SIM.t, name, trace:D.lastTrace.slice()}); if(D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function traceTouch(tr, ti){
  const s=sched(), tc=D.touches[ti], pk=s.pk.filter(p=>p.ti===ti);
  if (!D.usb){ tr('The module has no power: nothing scans the panel.'); return; }
  const p0=pk[0];
  tr(`Touch panel scan at ${SIM.fmtT(p0.ts)}: Putdown at screen (${tc.x}, ${tc.y}) → controller reports (${p0.rx}, ${p0.ry})${D.scale==='half'?' — half-resolution touch grid ('+'inferred'+')':''}`);
  tr(`Point bytes in the event packet: ${hex(p0.bytes)} (flag ${p0.flag} in bits 7–6, X 12 bits, Y 12 bits); then ${pk.length-2} Contact packet(s) and a Putup* with x,y swapped by the controller firmware`);
  if (!D.prog){ tr('No program is running on the BeagleBone: the packets sit in the display queue.'); return; }
  if (p0.readT==null){ tr(s.exit? `The program has already exited (${s.exit.why}).` : 'Not read before the end of this second.'); return; }
  tr(`RdGetEventData (seq ${p0.seq}) returns it at ${SIM.fmtT(p0.readT)} — ${SIM.fmtDur(p0.readT-p0.ts)} after the scan`);
  if (D.prog==='touch1'){ tr('gettouch() prints the packet (Console below). It then sleep(1)s, so a tap waits up to a whole second.'); return; }
  if (D.prog!=='area'){ tr(`${PROGS[D.prog].name} never reads touch events; this program only animates.`); return; }
  const h=s.hits.find(x=>x.ti===ti && x.fresh);
  if (!h){ tr('touchDetect() did not see it while polling (the program was animating).'); return; }
  const [bx,by]=C.BTN[h.target];
  tr(`touchDetect(): eventFlag = ${p0.flag}, xPos = ${h.x}, yPos = ${h.y} (last point of ${h.n} packet${h.n>1?'s':''})`);
  tr(`touchData = (2·${h.x} − ${bx})² + (2·${h.y} − ${by})² = ${h.td} ${h.hit?'≤':'>'} touchRadSquared 529 → ${h.hit? 'break; the slide starts' : 'no hit, keep polling'}`);
  const hit2=s.hits.find(x=>x.ti===ti && x.hit);
  if (!h.hit && hit2) tr(`A later packet of the same touch hit at ${SIM.fmtT(hit2.t)}.`);
  if (h.hit || hit2){ const fails=s.cmds.filter(c=>c.k==='move'&&c.st); if(fails.length) tr(`Return-trip RdImageMove calls fail with 0x8027 ${ERR[0x8027]}: ${fails.length} (each sent twice by RdProcessRequest). ret is ignored.`); }
}
const A = {
  touch(x,y,why){ act(`Touch (${x}, ${y}) at ${SIM.fmtT(SIM.t)}`, tr=>{
    D.touches=D.touches.filter(tc=>Math.abs(tc.t-SIM.t)>0.012).concat([{t:SIM.t,x,y,d:D.hold}]).sort((a,b)=>a.t-b.t);
    const ti=D.touches.findIndex(tc=>tc.t===SIM.t); if(why) tr(why); traceTouch(tr, ti); }); },
  clear(){ act('Clear all touches', tr=>{ D.touches=[]; tr('D.touches = [] — the panel is left alone for the whole second.'); }); },
  prog(p){ act(`Run ${p? PROGS[p].name : 'nothing'}`, tr=>{ D.prog=p||null;
    if (!p){ tr('BBB idle at the shell prompt; the display keeps what it shows at power-up.'); return; }
    tr(`root@beaglebone:~/Executables# ./${p==='touch1'?'touch1':'main'}   (${PROGS[p].file}, ${PROGS[p].date})`);
    const s=sched(); tr(`${s.cmds.length} RipDraw commands in the first second; ${s.exit? 'EXITS: '+s.exit.why : 'still running at 1 s'}`); }); },
  usb(){ act(D.usb?'Unplug the USB cable':'Plug the USB cable in', tr=>{ D.usb=!D.usb;
    tr(D.usb? 'The module powers from USB (84-0221-000T §5.2: external 5 V unused with a powered host). /dev/ttyACM0 appears.' : 'The module loses power; /dev/ttyACM0 disappears.');
    if (D.usb && D.splash) tr('splash.bmp is in flash, so it comes up on power-up (splash tutorial "More Stuff").'); D.cycled = D.usb && D.splash ? true : D.cycled; }); },
  cycle(){ act('Power-cycle the display (unplug, replug)', tr=>{ D.cycled=true; tr('USB unplugged and replugged.'); tr(D.splash? 'splash.bmp is a reserved name: the GPU shows it at power-up, with no host command.' : 'No splash.bmp in flash: the screen stays black until a host draws on it.'); }); },
  emuDetect(){ act('Emulator V1.2.10: Detect, then Get', tr=>{ if(!D.usb){ tr('Detect: no COM port. Plug the display in first.'); return; }
    D.emu.detected=true; D.emu.info=true; const rq=frame(0x3631,1,u16a(0));
    tr('Windows enumerates the module as a USB CDC-ACM COM port (win-driver/linux-cdc-acm.inf in the emulator zip).');
    tr(`Get → RdSystemInfo(RdSystemInfoTypeVersionDevApp): request ${hex(rq)} ("${ascii(0x3631)}" on the wire is ${hex(u16a(0x3631))})`);
    tr('The emulator shows the COM port and the system version: the PC is talking to the GPU.'); }); },
  emuSplash(){ act('Emulator: Browse → "1U Splash Tutorial" → Download All → Run All', tr=>{ if(!D.emu.detected){ tr('Detect the COM port first.'); return; }
    D.splash=true; D.cycled=false; tr('RdFlashWriteEnable → RdFlashImage("splash.bmp") → RdFlashData chunks → RdFlashData(End). Splash art here: WBS Metal Logo 3 ('+'inferred'+').'); tr('Run All plays the script; power-cycle to see the splash come up on its own.'); }); },
  emuWBS(){ act('Emulator: Download All (WBS images bg, btn1, btn2)', tr=>{ if(!D.emu.detected){ tr('Detect the COM port first.'); return; }
    D.flashWBS=true; tr('Flash now holds the labels "bg", "btn1", "btn2" that the working/* programs load with RdImageLoad.'); tr('These bitmaps are not in the archive; WBS BUTTON-OFF/ON (43 × 43) and the chosen background stand in ('+'inferred'+').'); }); },
  emuErase(){ act('Emulator: RdFlashDeleteAll', tr=>{ D.flashWBS=false; D.splash=false; tr('Flash erased: no splash.bmp, no bg/btn1/btn2. RdImageLoad will now return 0x8022 RdErrorImageInvalidLabel.'); }); },
  bbb(){ act('PuTTY → root@192.168.7.2: ls /dev/tty*', tr=>{ D.bbb=true; tr('BBB on the PC over its mini-USB (192.168.7.2, SSH port 22, root with no password — BBB hints p.3).');
    tr(D.usb? '/dev/ttyACM0 is listed: the display is on the BBB host port (hard-coded portname in every main.c).' : 'No /dev/ttyACM0: the display is unplugged or unpowered.'); }); },
  reset(){ act('Start over (unboxed display, nothing in flash)', tr=>{ factory(); tr('Display flash empty, no program running, no touches.'); }); },
  bench(){ act('Bench as left in May 2015', tr=>{ const L=D.log; D=defaults(); D.log=L; D.emu={detected:true,info:true}; D.bbb=true; tr('Splash and WBS images in flash; areaSpecificTouch running; two taps scripted.'); }); },
};

/* ---------------- panels (drawn to scale from the datasheets) ---------------- */
// Front: a 1U strip (44.45 mm) of the dev-kit's flat black bezel, the 95.24 × 21.85 mm viewing area centred ('inferred' position)
const FR = { W:180, H:44.45 }; FR.vx=(FR.W-C.VA_W)/2; FR.vy=(FR.H-C.VA_H)/2; FR.ax=FR.vx+(C.VA_W-C.W*C.PITCH)/2; FR.ay=FR.vy+(C.VA_H-C.H*C.PITCH)/2;
function frontHTML(id){
  const pct=(v,tot)=>(v/tot*100).toFixed(3)+'%';
  return `<div style="position:relative;max-width:980px">
  <svg viewBox="0 0 ${FR.W} ${FR.H}" style="width:100%;display:block;border-radius:4px">
    <rect x="0" y="0" width="${FR.W}" height="${FR.H}" fill="#151618"/>
    <rect x="0.4" y="0.4" width="${FR.W-0.8}" height="${FR.H-0.8}" fill="none" stroke="#2c2f33" stroke-width="0.5"/>
    <rect x="${(FR.W-C.OUT_W)/2}" y="${(FR.H-C.OUT_H)/2}" width="${C.OUT_W}" height="${C.OUT_H}" fill="none" stroke="#3a3f45" stroke-width="0.25" stroke-dasharray="1 0.8"><title>84-0221-000T module outline behind the bezel: 133.74 × 40.03 mm</title></rect>
    <rect x="${FR.vx-0.6}" y="${FR.vy-0.6}" width="${C.VA_W+1.2}" height="${C.VA_H+1.2}" rx="0.6" fill="#050505" stroke="#2a2d31" stroke-width="0.4"/>
    <text x="4" y="5.5" font-size="2.6" fill="#7d838a">1U development bezel (83-0022-000 kit) · flat black anodised, milled for the touch lens</text>
    <text x="4" y="${FR.H-3}" font-size="2.4" fill="#7d838a">viewing area 95.24 × 21.85 mm · 480 × 110 px @ 0.198 mm · PCT touch (DTS430-0385-1FX-000)</text>
    <text x="${FR.W-4}" y="${FR.H-3}" text-anchor="end" font-size="2.4" fill="#7d838a">tap the screen ▸</text>
  </svg>
  <canvas id="${id}" style="position:absolute;left:${pct(FR.ax,FR.W)};top:${pct(FR.ay,FR.H)};width:${pct(C.W*C.PITCH,FR.W)};height:${pct(C.H*C.PITCH,FR.H)};cursor:crosshair;image-rendering:auto" title="Click to touch the panel at the playhead"></canvas></div>`;
}
function rearSVG(){
  const on=D.usb;
  return `<svg viewBox="0 0 270 78" style="width:100%;max-width:980px">
   <g>
    <rect x="6" y="10" width="${C.OUT_W}" height="${C.OUT_H}" rx="1.2" fill="#1d5a3a" stroke="#0f2e1f"/>
    <text x="10" y="17" font-size="3.2" fill="#d8efe1">84-0221-000T rear (RipDraw Lite GPU, ARM Cortex-M4)</text>
    <rect x="40" y="22" width="22" height="14" fill="#222" stroke="#555"/><text x="51" y="30" font-size="2.6" text-anchor="middle" fill="#bbb">MCU / flash</text>
    <g data-a="usb" style="cursor:pointer"><rect x="${6+C.OUT_W-14}" y="22" width="12" height="7" rx="0.8" fill="${on?'#cfd3d6':'#777'}" stroke="#333"/><text x="${6+C.OUT_W-8}" y="34" font-size="2.6" text-anchor="middle" fill="#e7f2ea">USB mini</text>
      <title>USB connector: 1 VCC +5 V · 2 D− · 3 D+ · 4 N/C · 5 GND (click to ${on?'unplug':'plug in'})</title></g>
    <g><rect x="${6+C.OUT_W-14}" y="38" width="8" height="4" fill="#eee" stroke="#333"/><text x="${6+C.OUT_W-16}" y="41.5" font-size="2.4" text-anchor="end" fill="#e7f2ea">EXT 5V</text><title>External 5 V: 1 VCC, 2 GND (unused when USB-powered)</title></g>
    <g>${[0,1,2,3,4].map(i=>`<rect x="${14+i*3.2}" y="40" width="2.2" height="2.2" fill="#d4b04a"/>`).join('')}<text x="14" y="38.5" font-size="2.4" fill="#e7f2ea">SPI: CS CK SO SI 0V</text><title>SPI connector: 1 CS (active low) · 2 CK · 3 SO (MISO) · 4 SI (MOSI) · 5 0V</title></g>
    <text x="10" y="47" font-size="2.3" fill="#a9cdb7">connector positions ${'inferred'}: the datasheet's mechanical drawing is an image</text>
   </g>
   <path d="M ${6+C.OUT_W-2} 25.5 C 165 25, 170 60, ${on?186:176} 60" fill="none" stroke="${on?'#9aa3ab':'#555'}" stroke-width="1.6" stroke-dasharray="${on?'':'2 1.5'}"/>
   <g data-a="usb" style="cursor:pointer"><rect x="160" y="2" width="104" height="6" fill="transparent"/></g>
   <g>
    <rect x="176" y="20" width="86.36" height="54.61" rx="2.5" fill="#1e2a33" stroke="#0e151b"/>
    <text x="180" y="27" font-size="3.2" fill="#dfe8ee">BeagleBone Black (AM335x, ARMv7 hard-float Linux)</text>
    <rect x="${on?186:186}" y="56" width="13" height="7" fill="#c8c8c8" stroke="#333"/><text x="192.5" y="68" font-size="2.4" text-anchor="middle" fill="#dfe8ee">USB host → /dev/ttyACM0</text>
    <rect x="236" y="56" width="16" height="14" fill="#bdbdbd" stroke="#333"/><text x="244" y="54" font-size="2.4" text-anchor="middle" fill="#dfe8ee">RJ45</text>
    <rect x="214" y="68" width="8" height="4" fill="#c8c8c8" stroke="#333"/><text x="218" y="66" font-size="2.4" text-anchor="middle" fill="#dfe8ee">mini-USB → PC</text>
    <g data-a="bbb" style="cursor:pointer"><circle cx="252" cy="32" r="2" fill="#333" stroke="#aaa"/><text x="249" y="38.5" font-size="2.3" text-anchor="end" fill="#dfe8ee">SSH: ls /dev/tty*</text><title>Click: log in over PuTTY and list the tty devices</title></g>
    <text x="180" y="33" font-size="2.4" fill="#9fb3c2">86.36 × 54.61 mm board (size ${'inferred'}: BeagleBoard spec, not in this folder)</text>
   </g>
   <text x="6" y="6" font-size="3" fill="var(--ink2)">Rear: display module and host, to scale (mm). Click the USB plug to unplug or plug in.</text>
  </svg>`;
}
function bindPanel(root){ root.querySelectorAll('[data-a]').forEach(g=>g.onclick=()=>{ const a=g.dataset.a; if(a==='usb') A.usb(); if(a==='bbb') A.bbb(); }); }
function bindLCD(cv){ cv.onclick=e=>{ const r=cv.getBoundingClientRect(); const x=Math.max(0,Math.min(C.W-1,Math.round((e.clientX-r.left)/r.width*C.W))), y=Math.max(0,Math.min(C.H-1,Math.round((e.clientY-r.top)/r.height*C.H))); A.touch(x,y); }; }

function controlsHTML(){
  const opt=(o,v)=>Object.keys(o).map(k=>`<option value="${k}" ${k===v?'selected':''}>${o[k]}</option>`).join('');
  return `<div style="display:flex;gap:6px 10px;flex-wrap:wrap;margin-top:8px;align-items:center" class="small">
    <label>Program on the BBB <select data-c="prog">${opt({'':'(none — shell prompt)',area:'areaSpecificTouch (WBS)',dots:'movingDots (WBS)',load:'loadAndDeleteImages (WBS)',touch1:'touch1 (Densitron tutorial)'},D.prog||'')}</select></label>
    <button data-b="t1">Tap button 1 at playhead</button><button data-b="t2">Tap button 2 at playhead</button><button data-b="clr">Clear touches</button>
    <label>Hold <select data-c="hold">${opt({'0.03':'30 ms','0.08':'80 ms','0.2':'200 ms','0.5':'500 ms'},String(D.hold))}</select></label>
  </div>
  <div style="display:flex;gap:6px 10px;flex-wrap:wrap;margin-top:6px;align-items:center" class="small">
    <label>Touch report grid <select data-c="scale">${opt({half:'240 × 55 (what 2·xPos implies)',native:'480 × 110 (native)'},D.scale)}</select></label>
    <label title="Does the GPU hand out the lowest free write id after RdImageDelete?"><input type="checkbox" data-k="reuse" ${D.reuse?'checked':''}> GPU reuses freed write ids</label>
    <label>Link <select data-c="link">${opt({usb:'USB CDC-ACM (1 ms frames)',uart:'115 200-baud UART (what termios says)'},D.link)}</select></label>
    <label>bg image <select data-c="bg">${opt(Object.fromEntries(Object.keys(ART).map(k=>[k,ART[k][0]])),D.bg)}</select></label>
    <label><input type="checkbox" data-k="smear" ${D.smear?'checked':''}> LC response trail</label>
    <label><input type="checkbox" data-k="zones" ${D.zones?'checked':''}> show hit zones</label>
  </div>`;
}
function benchHTML(){ return `<div style="display:flex;gap:6px;flex-wrap:wrap" class="small">
  <button data-b="emuDetect">Emulator: Detect + Get</button><button data-b="emuSplash">Emulator: load splash project</button><button data-b="emuWBS">Emulator: load WBS bg/btn1/btn2</button><button data-b="emuErase">Erase flash</button>
  <button data-b="cycle">Power-cycle display</button><button data-b="usb">${D.usb?'Unplug USB':'Plug USB in'}</button><button data-b="bbb">BBB: ls /dev/tty*</button></div>`; }
function bindControls(root){
  root.querySelectorAll('[data-c]').forEach(s=>s.onchange=()=>{ const k=s.dataset.c, v=s.value;
    if(k==='prog') A.prog(v||null);
    else act(`Set ${k} = ${v}`, tr=>{ D[k]= k==='hold'? +v : v;
      if(k==='scale') tr(v==='half'? 'Controller coordinates are half the pixel grid; 2·xPos puts them back on pixels, so the hit circle sits on the button.' : 'Controller coordinates are pixels; 2·xPos doubles them, so the hit circle lands at (60.5, 28) with a radius of 11.5 px — on the background, not on the button.');
      if(k==='link') tr(v==='usb'? 'ttyACM: the B115200 setting is ignored; responses come back on the next 1 ms USB frame ('+'inferred'+').' : 'If the same frames went over a 115 200-baud UART (8N1): 86.8 µs per byte, 14 + 10 bytes per RdImageMove ≈ 2.1 ms on the wire.'); }); });
  root.querySelectorAll('[data-k]').forEach(cb=>cb.onchange=()=>act(`${cb.checked?'Enable':'Disable'} ${cb.dataset.k}`, tr=>{ D[cb.dataset.k]=cb.checked;
    if(cb.dataset.k==='reuse') tr(cb.checked? 'RdImageWrite(btn2) gets the id btn1 just freed, so the buggy return-trip RdImageMove(write_id_btn1) moves btn2 — the bug is hidden.' : 'Fresh ids: RdImageMove(write_id_btn1) on the return trip hits a deleted id → 0x8027, retried once each, ret ignored; btn2 stays put, then jumps.'); }));
  root.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{ const k=b.dataset.b;
    if(k==='t1') A.touch(121,56,'Finger on button 1 centre (btn1x, btn1y).'); else if(k==='t2') A.touch(361,56,'Finger on button 2 centre (btn2x, btn2y).');
    else if(k==='clr') A.clear(); else if(A[k]) A[k](); });
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const s=sched(), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad');
  const boxes=(c,X,t0,t1,y,h,list,f)=>{ list.forEach(e=>{ const a=f.a(e), b=f.b(e); if(b<t0||a>t1) return; const xa=X(a), xb=Math.max(xa+1,X(b)); c.fillStyle=f.col(e); c.fillRect(xa,y+4,xb-xa,h-8);
    if(xb-xa>34 && f.lab){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); c.fillText(f.lab(e), xa+3, y+h/2+3.5); c.restore(); } }); };
  const P=PROGS[D.prog];
  return [
    {label:'BBB: main() step', h:28, draw(c,X,t0,t1,y,h){ const cols=[ink2,warn,a2,acc,a2,acc,warn,acc,a2,warn,acc,a2];
      boxes(c,X,t0,t1,y,h,s.steps,{a:e=>e.t0,b:e=>e.t1==null?s.tEnd:e.t1,col:e=>cols[e.s%cols.length],lab:e=>P? P.steps[e.s][0] : ''});
      if (s.exit){ const x=X(s.exit.t); c.fillStyle=bad; c.fillRect(x,y+2,3,h-4); c.font='11px sans-serif'; c.fillText('exit '+(ERR[s.exit.code]||s.exit.code), x+5, y+h/2+4); } }},
    {label:'BBB: usleep() / sleep()', h:20, draw(c,X,t0,t1,y,h){ boxes(c,X,t0,t1,y,h,s.sleeps,{a:e=>e.t0,b:e=>e.t1,col:()=>ink2,lab:e=>e.label}); }},
    {label:'USB OUT: request frame', h:24, draw(c,X,t0,t1,y,h){ boxes(c,X,t0,t1,y,h,s.cmds,{a:e=>e.t0,b:e=>e.tr,col:e=>e.attempt?warn:a2,lab:e=>e.name.slice(2)}); }},
    {label:'GPU (Cortex-M4): process', h:24, draw(c,X,t0,t1,y,h){ boxes(c,X,t0,t1,y,h,s.cmds,{a:e=>e.tr,b:e=>e.tp,col:e=>e.st?bad:acc,lab:e=>e.st?'0x'+e.st.toString(16):e.name.slice(2)}); }},
    {label:'USB IN: response', h:24, draw(c,X,t0,t1,y,h){ boxes(c,X,t0,t1,y,h,s.cmds,{a:e=>e.tp,b:e=>e.t1,col:e=>e.st?bad:'#7a8a99',lab:e=>'seq '+e.seq}); }},
    {label:'USB SOF (1 ms frames)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.USB_FRAME,0,4e-6,ink2,'SOF'); }},
    {label:'Touch scan 100 Hz (inferred)', h:22, draw(c,X,t0,t1,y,h){ D.touches.forEach(tc=>{ if(tc.t+tc.d<t0||tc.t>t1) return; c.fillStyle=warn; c.globalAlpha=.25; c.fillRect(X(tc.t),y+2,Math.max(1,X(tc.t+tc.d)-X(tc.t)),h-4); c.globalAlpha=1; });
      SIM.pulses(c,X,t0,t1,y,h,C.SCAN,C.SCAN_PH,0.0002,ink2,'scans'); }},
    {label:'Touch packets: queued → read', h:24, draw(c,X,t0,t1,y,h){ s.pk.forEach(p=>{ const ta=p.ta, tb=p.readT==null? Math.min(t1,C.END):p.readT; if(tb<t0||ta>t1) return;
      c.strokeStyle=p.flag===0?acc:p.flag===1?bad:warn; c.lineWidth=2; c.beginPath(); c.moveTo(X(ta),y+h/2); c.lineTo(X(tb),y+h/2); c.stroke(); c.fillStyle=c.strokeStyle; c.fillRect(X(ta)-1,y+5,3,h-10);
      if (p.flag===0 && X(tb)-X(ta)>60){ c.font='10px sans-serif'; c.fillText(FLAG[p.flag]+' ('+p.rx+','+p.ry+')', X(ta)+4, y+9); } }); }},
    {label:'LCD refresh 60 Hz (inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.LCD,C.LCD_PH,0.0003,a2,'frames'); }},
    {label:'LC response 35 ms', h:20, draw(c,X,t0,t1,y,h){ let prev=null; for(let k=0;;k++){ const tv=C.LCD_PH+k*C.LCD; if(tv>t1) break; const st=stateAt(tv); const sig=JSON.stringify(st.ws.map(w=>[w.img,w.x]))+st.splash;
        if (prev!==null && sig!==prev && tv+C.LC>t0){ c.fillStyle=warn; c.globalAlpha=.35; c.fillRect(X(tv),y+4,X(tv+C.LC)-X(tv),h-8); c.globalAlpha=1; } prev=sig; } }},
    {label:'Button x on screen (px)', h:40, draw(c,X,t0,t1,y,h){ c.strokeStyle=acc; c.lineWidth=1.5; c.beginPath(); let first=true;
      const sn=s.snaps; const i0=Math.max(0,bs(sn,t0,'t')); for(let i=i0;i<sn.length;i++){ const e=sn[i]; if(e.t>t1) break; const b=e.ws.find(w=>w.img!=='bg'); if(!b) continue;
        const yy=y+h-4-(b.x-90)/260*(h-8); if(first){ c.moveTo(X(Math.max(t0,e.t)),yy); first=false; } else c.lineTo(X(e.t),yy); }
      c.stroke(); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('98 … 338', X(t0)+4, y+h-4); }},
  ];
}

/* ---------------- views ---------------- */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">@ ${SIM.fmtT(D.log[0].t)}</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s.replace(/\(inferred\)/g,'('+inf+')')}</div>`).join('') : '<div class="muted">Tap the screen or use the controls. Each step the code takes is listed here.</div>'; }
function frameTable(c){
  if (!c) return '<p class="muted small">No command on the link at the playhead.</p>';
  const r=c.req, p=c.resp, f=(a,i,n)=>hex(a.slice(i,i+n));
  return `<table class="kv"><tr><th></th><th>request (BBB → GPU)</th><th>response (GPU → BBB)</th></tr>
   <tr><th>cmd id</th><td class="mono">${f(r,0,2)} <span class="muted">= 0x${c.id.toString(16).toUpperCase()} "${ascii(c.id)}", sent LE as "${ascii(c.id).split('').reverse().join('')}"</span></td><td class="mono">${f(p,0,2)}</td></tr>
   <tr><th>seqNo</th><td class="mono">${f(r,2,2)} (${c.seq})</td><td class="mono">${f(p,2,2)}</td></tr>
   <tr><th>payload length</th><td class="mono">${f(r,4,2)} (${r.length-8})</td><td class="mono">${f(p,4,2)} (${p.length-8})</td></tr>
   <tr><th>payload</th><td class="mono">${hex(r.slice(6,r.length-2),24)||'—'}</td><td class="mono">${hex(p.slice(6,p.length-2),24)} <span class="muted">(status ${c.st? '0x'+c.st.toString(16).toUpperCase()+' '+ERR[c.st] : '0 = RdErrorSuccess'})</span></td></tr>
   <tr><th>checksum</th><td class="mono">${f(r,r.length-2,2)}</td><td class="mono">${f(p,p.length-2,2)}</td></tr></table>
   <p class="small muted">${c.name}${c.attempt?' (RdProcessRequest retry)':''} · ${r.length} + ${p.length} bytes · request ${SIM.fmtT(c.t0)} → reply read ${SIM.fmtT(c.t1)} (${SIM.fmtDur(c.t1-c.t0)})</p>`;
}

function viewSim(m){
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front: the 1RU touch display at the playhead (tap it)', `${frontHTML('lcd')}${controlsHTML()}`)}
      ${card('Rear: module and BeagleBone Black', `<div id="rp"></div>`)}
    </div>
    <div>
      ${card('What the code did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
     <p class="small muted">Command timing is ${inf}: a request reaches the GPU about 60 µs after <span class="mono">write()</span>, the GPU works on it, and the reply comes back on the next 1 ms USB frame. That is why <span class="mono">touchDetect()</span> polls about once per millisecond, and why each 2-pixel step of the slide costs <span class="mono">usleep(1000)</span> plus one round trip (≈ 3 ms per step in this model). Touch scan (100 Hz) and LCD refresh (60 Hz) are ${inf}. The 35 ms liquid-crystal response is from the datasheet.</p>`)}
  <div class="grid2">
    ${card('Bytes on the link at the playhead', `<div id="frm"></div>`)}
    ${card('BBB console', `<div id="con" class="log" style="white-space:pre"></div>`)}
  </div>
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const cv=m.querySelector('#lcd'); bindLCD(cv); bindControls(m);
  const draw=()=>{
    const t=SIM.t, s=sched();
    drawLCD(cv,t,{zones:true});
    const rp=m.querySelector('#rp'); rp.innerHTML=rearSVG(); bindPanel(rp);
    m.querySelector('#trace').innerHTML=traceHTML();
    const st=stepAt(t), c=cmdAt(t)||lastCmd(t), z=sleepAt(t), stt=stateAt(vsyncBefore(t)), P=PROGS[D.prog];
    const btn=stt.ws.filter(w=>w.img!=='bg');
    const hit=[...s.hits].reverse().find(h=>h.t<=t);
    m.querySelector('#insp').innerHTML = `<table class="kv">
      <tr><th>Program</th><td class="mono">${P? P.name+' <span class="muted">('+P.date+')</span>' : '—'}</td></tr>
      <tr><th>main() step</th><td class="mono small">${st&&P? st.s+': '+P.steps[st.s][0] : '—'}${z?' <b>· '+z.label+'</b>':''}${s.exit&&t>=s.exit.t?` <b style="color:var(--bad)">exited: ${ERR[s.exit.code]||''}</b>`:''}</td></tr>
      <tr><th>Link</th><td class="mono small">${c? c.name+' seq '+c.seq+(cmdAt(t)? ' — '+({tx:'request on the wire',proc:'GPU processing',rx:'waiting for / reading the reply'})[phaseOf(c,t)] : '') : '—'}${c&&!cmdAt(t)?' <span class="muted">(last)</span>':''}</td></tr>
      <tr><th>LCD frame</th><td class="mono">#${Math.max(0,Math.floor((t-C.LCD_PH)/C.LCD))} latched ${SIM.fmtT(vsyncBefore(t))} · ${stt.splash?'splash.bmp':btn.length? btn.map(w=>`${w.img} id ${w.id} @ (${w.x},${w.y})`).join(', ') : (Object.keys(stt.layers).length?'layers on, no buttons':'blank')}</td></tr>
      <tr><th>Write ids in the GPU</th><td class="mono small">${stt.ws.map(w=>w.id+'='+w.img).join(' · ')||'—'}</td></tr>
      <tr><th>Last hit test</th><td class="mono small">${hit? `(2·${hit.x}−${C.BTN[hit.target][0]})²+(2·${hit.y}−${C.BTN[hit.target][1]})² = ${hit.td} → ${hit.hit?'<b>HIT</b>':'miss'}` : '—'}</td></tr>
      <tr><th>Finger</th><td class="mono">${(f=>f? `down at (${f.x}, ${f.y})` : 'off the glass')(fingerAt(t))} · ${D.touches.length} tap(s) scripted</td></tr>
      <tr><th>This second</th><td class="mono small">${s.cmds.length} commands · ${s.cmds.filter(x=>x.k==='event').length} polls · ${s.cmds.filter(x=>x.k==='move').length} moves (${s.cmds.filter(x=>x.k==='move'&&x.st).length} failed)</td></tr>
    </table>`;
    m.querySelector('#frm').innerHTML=frameTable(cmdAt(t)||lastCmd(t));
    const con=s.console.filter(x=>x.t<=t); m.querySelector('#con').textContent = con.length? con.map(x=>x.s).join('\n\n') : (D.prog==='touch1'? '(waiting for the first poll)' : D.prog? '(this program prints nothing)' : 'root@beaglebone:~/Executables#');
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial: the evaluation as the engineer ran it ---------------- */
const LESSONS = [
  { title:'The question', body:`<p>R&D register line <b>RD71 · Touch Screen Display</b>, priority A, no owner listed. Next to it is <b>RD62 · AMS82 front LCD replacement, possibly with LCD video display</b> (Kevin/Peter). The AMS8-2's three Siemens/Osram PDSP1884 8-character displays were going end-of-life.</p>
     <p>In spring 2015|48 the bench had a Densitron <b>83-0022-000 USB GPU development kit</b>: a 480 × 110 TFT made to fit 1U, with projected-capacitive touch and an ARM Cortex-M4 "RipDraw Lite" GPU behind a USB port. A <b>BeagleBone Black</b> served as the host.</p>
     <p>This tutorial runs the evaluation in the order the archive's files suggest. Click <b>Start over</b> to unbox it, then work through the steps.</p>`, check:()=>true, auto:true },
  { title:'1 · Talk to it from the PC', body:`<p>Plug the module into a Windows PC. It enumerates as a USB CDC-ACM COM port and draws its power from USB. Run the <b>RipDraw Emulator V1.2.10</b>: click <b>Detect</b>, then <b>Get</b> (system version).</p><p><b>Goal:</b> the emulator reports the version.</p>`, check:()=>D.emu.info, hint:'Click “Emulator: Detect + Get”. If it fails, plug the USB in.' },
  { title:'2 · Splash screen', body:`<p>Follow Densitron's <i>Loading a Splash Screen to the 1RU</i> tutorial: in the emulator, Browse to the exported portal project, click <b>Download All</b>, then <b>Run All</b>. <span class="mono">splash.bmp</span> is a reserved name: the GPU puts it up at power-on, with no host.</p><p><b>Goal:</b> splash in flash, then power-cycle the display and see it come up on its own.</p>`, check:()=>D.splash&&D.cycled, hint:'“Emulator: load splash project”, then “Power-cycle display”.' },
  { title:'3 · Bring up the BeagleBone', body:`<p>Per <i>Helpful Hints on Beagle Bone Black</i>: SSH to <span class="mono">192.168.7.2</span> as root, plug the display into the BBB's USB host port, and run <span class="mono">ls /dev/tty*</span>. Every main.c hard-codes <span class="mono">"/dev/ttyACM0"</span>.</p><p><b>Goal:</b> see ttyACM0.</p>`, check:()=>D.bbb&&D.usb, hint:'Click “BBB: ls /dev/tty*” (or the SSH dot on the rear view) with USB plugged in.' },
  { title:'4 · Read raw touches', body:`<p>Run Densitron's <b>touch1</b> (1RU_Tutorial_2_touch). It turns the screen red and dumps every touch packet. Then <b>tap the screen</b> near the start of the second and watch the Console.</p>
     <p>Look at two things. The program <span class="mono">sleep(1)</span>s between polls, so your tap is printed up to a second late. And the comment says the controller swaps x and y on <i>Putdown</i>, but the patch is applied to flag 1, which it prints as <span class="mono">Putup*</span>.</p><p><b>Goal:</b> at least one touch packet printed.</p>`, check:()=>D.prog==='touch1'&&sched().console.length>1, hint:'Choose touch1, put the playhead near 0.02 s, and tap the screen. The dump appears at the next poll (≈ 1 s).' },
  { title:'5 · Load the WBS art', body:`<p>The WBS programs load three labels from the display's flash: <span class="mono">"bg"</span>, <span class="mono">"btn1"</span> and <span class="mono">"btn2"</span>. Without them, <span class="mono">RdImageLoad</span> returns <span class="mono">0x8022 RdErrorImageInvalidLabel</span> and main() quits. Try running areaSpecificTouch first to see the exit on the timeline, then load the images.</p><p class="muted">These bitmaps aren't in the archive. The 43 × 43 WBS BUTTON-OFF/ON art (made 21 May 2015) stands in for btn1/btn2 (${inf}).</p><p><b>Goal:</b> images in flash.</p>`, check:()=>D.flashWBS, hint:'“Emulator: load WBS bg/btn1/btn2”.' },
  { title:'6 · Show and delete (loadAndDeleteImages)', body:`<p>The first WBS test (14 May 2015). It writes btn1 at (122, 33), waits <span class="mono">usleep(1000000)</span>, deletes it and writes btn2 at (338, 33). Nothing calls <span class="mono">RdComposeLayersToPage</span>: each write shows up by itself.</p><p><b>Goal:</b> run it and find the moment btn1 appears on the timeline.</p>`, check:()=>D.prog==='load', hint:'Choose loadAndDeleteImages in “Program on the BBB”.' },
  { title:'7 · Animation and refresh (movingDots)', body:`<p>movingDots moves btn1 one pixel at a time, with <span class="mono">usleep(1000)</span> before each <span class="mono">RdImageMove</span>. Set the zoom to <b>50 ms</b> and step through: about six moves land in each 16.7 ms LCD frame, so the eye sees jumps of about 6 px, smeared by the 35 ms liquid-crystal response.</p><p><b>Goal:</b> run movingDots and put the playhead in the middle of the slide.</p>`, check:()=>D.prog==='dots'&&stepAt(SIM.t)&&stepAt(SIM.t).s===6, hint:'Choose movingDots, then scrub to about 0.2 s.' },
  { title:'8 · Touch a button (areaSpecificTouch)', body:`<p>The furthest-developed test (15 May 2015). It polls <span class="mono">touchDetect()</span> with no sleep, about 1000 times a second, and hit-tests a circle: <span class="mono">(2·xPos − 121)² + (2·yPos − 56)² ≤ 529</span>. On a hit, the button slides to x = 338 in 2-pixel steps and changes to btn2.</p><p><b>Goal:</b> clear the scripted taps, then tap button 1 yourself and get a hit.</p>`, check:()=>D.prog==='area'&&sched().hits.some(h=>h.hit&&h.target===0), hint:'Choose areaSpecificTouch, put the playhead after 0.06 s and click on the yellow button (or “Tap button 1 at playhead”).' },
  { title:'9 · And back', body:`<p>Tap button 2 once it has arrived. The return loop calls <span class="mono">RdImageMove(rdi, write_id_btn1, …)</span>, but write_id_btn1 was deleted. It only works if the GPU gave btn2 the same id back.</p><p>Untick <b>GPU reuses freed write ids</b>. Each move now fails with <span class="mono">0x8027</span>, the library sends it a second time, and <span class="mono">ret</span> is ignored. btn2 stays put for about half a second, then jumps.</p><p><b>Goal:</b> a return trip with failing moves on the timeline.</p>`, check:()=>D.prog==='area'&&!D.reuse&&sched().cmds.some(c=>c.k==='move'&&c.st), hint:'Tap button 2 after the first slide ends (≈ 0.45 s), then untick “GPU reuses freed write ids”.' },
  { title:'10 · Why 2·xPos?', body:`<p>The hit test doubles the touch coordinates. That only lands on the button if the controller reports on a 240 × 55 grid (${inf}). Switch <b>Touch report grid</b> to native 480 × 110 and tap the button again: the hit zone moves to (60.5, 28), up and to the left of the button.</p><p><b>Goal:</b> native grid, and a tap on button 1 that misses.</p>`, check:()=>D.scale==='native'&&sched().hits.some(h=>h.fresh&&!h.hit&&Math.abs(D.touches[h.ti]?D.touches[h.ti].x-121:99)<20), hint:'Set the grid to native and tap button 1. Set it back to 240 × 55 afterwards.' },
  { title:'11 · Would it fit an AMS8-2?', body:`<p>Open the <b>Findings</b> tab and compare the TFT with the AMS8-2's three 8-character displays. To drive the module, the AMS8-2's front-panel ATmega128 would have needed either a USB host or the module's SPI port. It would also have needed the artwork preloaded into the display flash, and new screens written for every SIEMENS8 string.</p>`, check:()=>true, auto:true },
  { title:'What became of it', body:`<p>The archived work stops at these demos (15 May 2015, art 21 May 2015). Six months later the XTM4 front panel moved to the <b>HDSP-2533</b> 8-character display (04AV0001, 21 Nov 2015|48). The AMS8-1 followed with 06VA0002 (May 2016|49), which still runs the old PDSP1884 too.</p><p>The obsolete part was replaced with a near drop-in dot-matrix display and small firmware changes. No touch TFT went into a product (${inf}: there is no later RD71 file and the register still shows priority A, not Z).</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function viewTutorial(m){
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — evaluating the touch display', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div></div>
    <div>${card('The bench', `${frontHTML('lcd')}<div style="margin-top:8px">${benchHTML()}</div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}
      ${card('What the code did', `<div id="trace" class="log"></div>`)}
      ${card('BBB console', `<div id="con" class="log" style="white-space:pre;max-height:180px"></div>`)}</div></div>`;
  const cv=m.querySelector('#lcd'); bindLCD(cv); bindControls(m);
  const draw=()=>{
    drawLCD(cv,SIM.t,{zones:true});
    const rp=m.querySelector('#rp'); rp.innerHTML=rearSVG(); bindPanel(rp);
    m.querySelector('#trace').innerHTML=traceHTML();
    const s=sched(); const con=s.console.filter(x=>x.t<=SIM.t+1); m.querySelector('#con').textContent=con.length? con.map(x=>x.s).join('\n\n') : '—';
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${(i<lessonIdx||(!l.auto&&l.check()))?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (unboxed)</button><button id="bn">Skip to the May 2015 bench</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=Math.min(lessonIdx,1)||1; SIM.seek(0); };
    m.querySelector('#bn').onclick=()=>{ A.bench(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  m.innerHTML = `
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the display (LCD frame latched at the last refresh)', `${frontHTML('lcd')}<h3>The last eight LCD frames</h3><div id="strip" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px"></div>
      <p class="small muted">Each thumbnail is one 16.7 ms refresh (${inf}). During a slide the button jumps several pixels per refresh, and the 35 ms liquid-crystal response blurs each jump (the faint trail).</p>`)}
    ${card('As seen by the BeagleBone and the GPU', `<div id="dev"></div>`)}
  </div>
  ${card('Zoomed timeline at the playhead', `<canvas id="tl"></canvas>`)}`;
  const cv=m.querySelector('#lcd'); bindLCD(cv);
  const strip=m.querySelector('#strip'); strip.innerHTML=Array.from({length:8},(_,i)=>`<div><canvas data-f="${i}" style="width:100%;border:1px solid var(--line)"></canvas><div class="small mono muted" data-l="${i}"></div></div>`).join('');
  const draw=()=>{
    const t=SIM.t, s=sched();
    const n=(f)=>s.cmds.filter(f).length, bytesOut=s.cmds.reduce((a,c)=>a+c.req.length,0), bytesIn=s.cmds.reduce((a,c)=>a+c.resp.length,0);
    const moves=s.cmds.filter(c=>c.k==='move'), mv=moves.filter(c=>!c.st);
    const slideT = mv.length>1? (mv[mv.length-1].tp - mv[0].tp)/(mv.length-1) : 0;
    const rows=[
      ['USB full-speed frames (SOF)','1,000','1 ms','Host controller; the reply to each command waits for a frame ('+'inferred'+')'],
      ['RipDraw commands', n(()=>true).toLocaleString(), s.cmds.length? SIM.fmtDur(1/s.cmds.length)+' avg':'', `${bytesOut.toLocaleString()} bytes out, ${bytesIn.toLocaleString()} bytes back; 8 bytes of framing each way per command`],
      ['RdGetEventData polls', n(c=>c.k==='event').toLocaleString(), '', D.prog==='touch1'? 'touch1: once, then sleep(1)' : 'touchDetect() in a tight loop: no sleep between polls'],
      ['RdImageMove', moves.length.toLocaleString(), slideT? SIM.fmtDur(slideT)+' per step':'', `usleep(1000) ≈ ${SIM.fmtDur(C.USLEEP)} (${inf}) + one round trip; ${moves.length-mv.length} failed (retried)`],
      ['LCD refreshes', '60', SIM.fmtDur(C.LCD), inf+' · the datasheet gives no frame rate'],
      ['Button pixels per refresh in a slide', slideT? (C.LCD/slideT*(D.prog==='dots'?1:2)).toFixed(1)+' px' : '—', '', '2 px per move (areaSpecificTouch) or 1 px (movingDots)'],
      ['Liquid-crystal response', '—', '35 ms', '84-0221-000T §7: TON + TOFF; about two refreshes'],
      ['Touch-panel scans', '100', SIM.fmtDur(C.SCAN), inf+' · each held finger gives one packet per scan'],
      ['Touch packets', s.pk.length.toString(), '', `${s.pk.filter(p=>p.readT!=null).length} read; worst wait ${SIM.fmtDur(Math.max(0,...s.pk.filter(p=>p.readT!=null).map(p=>p.readT-p.ta)))}`],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>in this second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Program ${D.prog? PROGS[D.prog].name : 'none'} · link ${D.link==='usb'?'USB CDC-ACM':'115 200 baud'} · use <b>Step</b> on the transport to move one RipDraw command, one LCD frame or one touch scan at a time.</p>`;
    drawLCD(cv,t,{zones:false});
    const tv=vsyncBefore(t);
    for (let i=0;i<8;i++){ const tf=tv-(7-i)*C.LCD; const c2=strip.querySelector(`[data-f="${i}"]`); const lb=strip.querySelector(`[data-l="${i}"]`);
      if (tf<0){ c2.getContext('2d').clearRect(0,0,c2.width,c2.height); lb.textContent='—'; continue; }
      drawLCD(c2,tf,{scale:1,finger:false,exact:true}); const b=stateAt(tf).ws.find(w=>w.img!=='bg'); lb.textContent=`#${Math.round((tf-C.LCD_PH)/C.LCD)} ${b? b.img+' x='+b.x : ''}`; }
    const st=stepAt(t), c=cmdAt(t), z=sleepAt(t), P=PROGS[D.prog];
    m.querySelector('#dev').innerHTML=`<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>BBB (ARM Linux)</th><td class="mono small">${P&&st? P.steps[st.s][0] : 'shell prompt'}${z? '<br><b>'+z.label+'</b> until '+SIM.fmtT(z.t1) : c&&phaseOf(c,t)!=='tx'? '<br>blocked in read() (VMIN = 1) inside RdProcessResponse' : ''}</td></tr>
      <tr><th>USB</th><td class="mono small">frame ${Math.floor(t/C.USB_FRAME)} · ${c? (phaseOf(c,t)==='tx'?'bulk OUT: ':phaseOf(c,t)==='proc'?'idle (GPU busy): ':'bulk IN: ')+c.name : 'idle'}</td></tr>
      <tr><th>GPU (Cortex-M4)</th><td class="mono small">${c&&phaseOf(c,t)==='proc'? 'executing '+c.name+' (0x'+c.id.toString(16).toUpperCase()+')' : 'waiting for a command; scanning touch, refreshing the TFT'}</td></tr>
      <tr><th>Touch controller</th><td class="mono small">scan ${Math.max(0,Math.floor((t-C.SCAN_PH)/C.SCAN))} · ${(f=>f?'finger at ('+f.x+','+f.y+')':'no finger')(fingerAt(t))} · queue ${s.pk.filter(p=>p.ta<=t&&(p.readT==null||p.readT>t)).length} packet(s)</td></tr>
      <tr><th>TFT</th><td class="mono small">frame latched ${SIM.fmtT(tv)} (${SIM.fmtDur(t-tv)} ago)</td></tr></table>
      <h3>Bytes</h3>${frameTable(c||lastCmd(t))}`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  pc:{x:10,y:20,w:180,h:92,t:'Windows PC',s:['Eclipse CDT Luna + Linaro GCC 4.8','RipDraw Emulator V1.2.10','RipDraw web portal export'],d:'Cross-compiles each main.c (Makefile: CC = C:\\gcc-linaro\\bin\\arm-linux-gnueabihf-gcc.exe, SHELL = cmd, -O0 -g -marm). The emulator talks to the module over its COM port and downloads the portal\'s images and fonts into display flash (“Download All”). Both installers are zipped in Tools/.'},
  bbb:{x:10,y:150,w:180,h:110,t:'BeagleBone Black',s:['AM335x, ARMv7 hard-float Linux','main / touch1 ELF in /root/Executables','RipDraw C library 3.00 (third party)'],d:'Runs the test programs over SSH (192.168.7.2). The RipDraw library frames each call (RdInitRequest), writes it to /dev/ttyACM0, then blocks in read() for the reply (RdProcessResponse: command id, seqNo, length, status, 16-bit byte-sum checksum).'},
  usb:{x:240,y:180,w:150,h:60,t:'USB 2.0 (CDC-ACM)',s:['/dev/ttyACM0 · 1 ms frames','powers the module'],d:'The module is a USB device. termios sets B115200, but CDC-ACM ignores the baud rate. The module is powered from the host (84-0221-000T §5.2).'},
  gpu:{x:440,y:150,w:200,h:110,t:'RipDraw Lite GPU',s:['ARM Cortex-M4 (83-0022-000)','command parser, 7 layers × 2 pages','image/font flash, splash.bmp'],d:'Executes RdImageLoad/Write/Move/Delete, layer and text commands. The images are referenced by label from flash, so artwork has to be downloaded with the emulator first. It shows splash.bmp at power-up. Moves and writes appear without RdComposeLayersToPage in the WBS tests (auto-compose, inferred from behaviour).'},
  tft:{x:690,y:130,w:180,h:80,t:'TFT 480 × 110',s:['3.85" MVA, normally black','10 LED backlight, 35 ms response'],d:'84-0221-000T: 95.24 × 21.85 mm viewing area, 0.198 mm pitch, 16 M colours, contrast 500, 370 cd/m². Refresh rate not given (60 Hz inferred).'},
  touch:{x:690,y:240,w:180,h:80,t:'PCT touch',s:['DTS430-0385-1FX-000 glass','controller → event packets'],d:'Projected-capacitive glass. Event packets carry, per point, a 2-bit flag (Putdown/Contact/Putup) and 12-bit X and Y. The controller swaps X and Y on one event type; gettouch.c patches it in software. Coordinates are on a 240 × 55 grid if the WBS 2·xPos test is right (inferred).'},
  spi:{x:440,y:300,w:200,h:56,t:'SPI connector (unused)',s:['CS · CK · SO · SI · 0V'],d:'The alternative host interface (84-0221-000T §5.3). It is the only way a micro without a USB host, such as the AMS8-2\'s ATmega128, could drive the module (inferred).'},
  ams:{x:10,y:300,w:380,h:56,t:'Intended product (inferred): AMS8-2 front panel (RD62)',s:['ATmega128 SIEMENS8 driver → 3 × 8-char PDSP1884'],d:'RD62 asked for a replacement for the AMS8-2\'s character displays. No file links RD71 to RD62 explicitly. The 480 × 110 1U form factor and the WBS menu/VU-meter mock-ups make it the likely target. In the end the HDSP-2533 dot-matrix display replaced the PDSP1884 instead.'},
};
const WIRES=[['pc','bbb','SSH / scp ELF'],['pc','usb','emulator (COM)'],['bbb','usb','RipDraw frames'],['usb','gpu',''],['gpu','tft','layers'],['touch','gpu','events'],['ams','spi','SPI (never built)'],['spi','gpu','']];
function viewBlock(m){
  let sel='gpu';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one sentence', `<p>The <b>BeagleBone</b> sends small binary command frames over <b>USB</b>. The display's own <b>Cortex-M4 GPU</b> draws images it already holds in flash onto layers of the <b>TFT</b>, and queues <b>touch</b> packets until the host asks for them.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 880 370" style="width:100%"><defs><marker id="rdar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b, dash=a==='ams'||b==='gpu'&&a==='spi';
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" ${dash?'stroke-dasharray="5 4"':''} marker-end="url(#rdar)"/>`;
      if(l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}" ${k==='ams'||k==='spi'?'stroke-dasharray="6 4"':''}/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d.replace(/\(inferred[^)]*\)/g,m0=>m0.replace('inferred',inf))}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from datasheet pin tables and the code) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
function viewSchem(m){
  m.innerHTML=`${card('Sheet 1 — module interfaces (redrawn from 84-0221-000T §5, not the original CAD)', `<svg viewBox="0 0 900 300" style="width:100%">
      ${chip(330,40,240,'84-0221-000T',[['1 VCC','+5V_USB'],['2 D−','USB_DM'],['3 D+','USB_DP'],['4 N/C',''],['5 GND','GND']],[['1 CS','SPI_nCS'],['2 CK','SPI_SCK'],['3 SO','SPI_MISO'],['4 SI','SPI_MOSI'],['5 0V','GND']],'RipDraw Lite GPU · 480×110 TFT · PCT')}
      <text x="230" y="30" font-size="11" fill="var(--ink2)">USB connector</text><text x="610" y="30" font-size="11" fill="var(--ink2)">SPI connector</text>
      ${chip(330,190,240,'',[['1 VCC','+5V_EXT'],['2 GND','GND']],[],'')}
      <text x="230" y="182" font-size="11" fill="var(--ink2)">External 5 V</text>
      <text x="20" y="270" font-size="11" fill="var(--ink2)">Supply 4.9–5.15 V (abs. max 5.15 V). External 5 V is unused when a powered USB host supplies the module. SPI: CS active low, all lines driven by the master.</text>
      <text x="20" y="288" font-size="11" fill="var(--ink2)">The touch glass DTS430-0385-1FX-000 connects inside the module; its controller part is not named (FocalTech-style packet layout, ${'inferred'}).</text></svg>`)}
   ${card('Sheet 2 — the RD71 bench as wired in 2015|48', `<svg viewBox="0 0 900 230" style="width:100%">
      ${chip(80,50,200,'BeagleBone Black',[],[['USB host A',''],['mini-USB client','to PC, 192.168.7.2'],['Ethernet',''] ],'AM335x · /dev/ttyACM0')}
      ${chip(560,50,200,'84-0221-000T',[['USB 1–5',''],['EXT 5V','open'],['SPI','open']],[],'enumerates as CDC-ACM')}
      <line x1="314" y1="72" x2="526" y2="72" stroke="var(--accent)" stroke-width="2.5"/><text x="420" y="62" text-anchor="middle" font-size="11" fill="var(--accent)">USB A → mini-B cable (dev kit)</text>
      <text x="20" y="200" font-size="11" fill="var(--ink2)">Power order from the BBB hints: power the BBB from the PC first, then plug in the display. The BBB only lists ttyACM0 while the display is powered.</text></svg>`)}
   ${card('Sheet 3 — how an AMS8-2 front panel could have driven it (never built, '+inf+')', `<svg viewBox="0 0 900 250" style="width:100%">
      ${chip(80,50,220,'ATmega128 (AMS8-2 front panel)',[],[['PB0 SS','SPI_nCS'],['PB1 SCK','SPI_SCK'],['PB2 MOSI','SPI_MOSI'],['PB3 MISO','SPI_MISO'],['PORTC/PORTG','was SIEMENS8 bus']],'SIEMENS8-3.c drives 3 × PDSP1884 today')}
      ${chip(580,50,200,'84-0221-000T',[['1 CS',''],['2 CK',''],['4 SI',''],['3 SO',''],['5 0V','GND']],[],'SPI connector')}
      ${[0,1,2,3].map(i=>`<line x1="410" y1="${72+i*18}" x2="546" y2="${72+i*18}" stroke="var(--accent)" stroke-dasharray="5 4"/>`).join('')}
      <text x="20" y="198" font-size="11" fill="var(--ink2)">ATmega128 hardware-SPI pin names come from the AVR's own data, not this folder.</text>
      <text x="20" y="215" font-size="11" fill="var(--ink2)">The library would also need an SPI back end (RD_INTERFACE_TYPE_SPI is defined in RipdrawTypes.h; RdInitInterface has an SPI branch).</text>
      <text x="20" y="232" font-size="11" fill="var(--ink2)">Every 8-character string from UPDATE_DISPLAY would become RdStringWrite/RdStringReplace calls against fonts held in display flash.</text></svg>`)}
   ${card('Sheet 4 — RipDraw frame and touch-point layout (from Ripdraw.c / gettouch.c)', `<svg viewBox="0 0 900 200" style="width:100%">
      ${[['cmd id',2],['seqNo',2],['payload len',2],['payload …',6],['checksum',2]].reduce((a,[n,w],i)=>{ const x=a.x; a.s+=`<rect x="${x}" y="30" width="${w*48}" height="34" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w*24}" y="51" text-anchor="middle" font-size="11" fill="var(--ink)">${n}</text><text x="${x+w*24}" y="78" text-anchor="middle" font-size="10" fill="var(--ink2)">${n==='payload …'?'u16 LE fields':w+' B LE'}</text>`; a.x+=w*48; return a; },{x:20,s:''}).s}
      <text x="20" y="20" font-size="11" fill="var(--ink)">Request and response share the frame. The response payload starts with the u16 status; the checksum is the 16-bit sum of every byte before it.</text>
      ${['flag[7:6] · X[11:8]','X[7:0]','id[7:4] · Y[11:8]','Y[7:0]'].map((n,i)=>`<rect x="${20+i*150}" y="120" width="150" height="34" fill="var(--panel2)" stroke="var(--ink)"/><text x="${95+i*150}" y="141" text-anchor="middle" font-size="11" fill="var(--ink)">${n}</text>`).join('')}
      <text x="20" y="112" font-size="11" fill="var(--ink)">Touch point (4 bytes; after gesture id and point count). flag 00 Putdown · 10 Contact · 01 Putup (X and Y swapped by the controller).</text>
      <text x="20" y="176" font-size="10.5" fill="var(--ink2)">Touch-id nibble position ${'inferred'}: gettouch.c masks the high nibble of byte 2 away and never reads it.</text></svg>`)}`;
}

/* ---------------- software ---------------- */
function viewSoft(m){
  m.innerHTML=`<div class="grid2">
    ${card('main() of the running program — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('RdProcessRequest / RdProcessResponse (Ripdraw.c)', `<div id="rr"></div>`)}${card('Touch events (gettouch.c / touchDetect)', `<div id="te"></div>`)}</div></div>
  <div class="grid2">
    ${card('How a tap did things — finger → code → screen', `<div id="btn"></div>`)}
    ${card('Command map (RipdrawTypes.h), live counts for this second', `<div id="cmap"></div>`)}
  </div>
  ${card('The frame on the link at the playhead', `<div id="frm"></div>`)}`;
  const draw=()=>{
    const s=sched(), t=SIM.t, P=PROGS[D.prog], st=stepAt(t);
    if (!P){ m.querySelector('#flow').innerHTML='<p class="muted">No program running. Choose one on the Simulator tab.</p>'; }
    else {
      let g=`<svg viewBox="0 0 560 ${P.steps.length*44+70}" style="width:100%"><defs><marker id="rda2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
        <text x="10" y="18" font-size="11.5" font-weight="700" fill="var(--ink)">${P.name} · ${P.file}</text>`;
      P.steps.forEach((p,j)=>{ const y=30+j*44, on=st&&st.s===j, ex=s.exit&&t>=s.exit.t&&st&&st.s===j;
        g+=`<rect x="10" y="${y}" width="520" height="34" rx="6" fill="${ex?'var(--bad)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
          <text x="18" y="${y+14}" font-size="10.5" font-family="var(--mono)" fill="${on||ex?'#fff':'var(--ink)'}">${(p[0].length>84?p[0].slice(0,82)+'…':p[0]).replace(/</g,'&lt;')}</text><text x="18" y="${y+28}" font-size="10" fill="${on||ex?'#eef':'var(--ink2)'}">${p[1]}</text>
          ${j<P.steps.length-1?`<line x1="270" y1="${y+34}" x2="270" y2="${y+44}" stroke="var(--ink2)" marker-end="url(#rda2)"/>`:''}`; });
      const loopFrom = D.prog==='touch1'? 3 : D.prog==='area'? 6 : D.prog==='dots'? 6 : 6, yb=30+(P.steps.length-1)*44+17, ya=30+loopFrom*44+17;
      g+=`<path d="M530 ${yb} h20 V${ya} h-20" fill="none" stroke="var(--ink2)" marker-end="url(#rda2)"/><text x="555" y="${(ya+yb)/2}" font-size="10" fill="var(--ink2)" transform="rotate(90 555 ${(ya+yb)/2})">for(;;)</text>
        <text x="10" y="${P.steps.length*44+50}" font-size="11" fill="var(--ink2)">${s.exit? 'Exit: '+s.exit.why : 'Never reaches RdClose(rdi): the loop has no exit.'}</text></svg>`;
      m.querySelector('#flow').innerHTML=g;
    }
    // request/response FSM
    const c=cmdAt(t), ph=phaseOf(c,t);
    const nodes=[['RdInitRequest','cmd · seqNo++ · len 0',null],['RdProcessRequest','len, checksum, write()','tx'],['GPU','parse + execute','proc'],['read 2 B','cmd == lastCmdId?','rx'],['read 4 + len + 2','seq, checksum, status','rx']];
    let r=`<svg viewBox="0 0 560 170" style="width:100%">`;
    nodes.forEach((n,i)=>{ const x=8+i*110, on=c&&n[2]===ph&&(i!==4||t>c.t1-C.T_WAKE); r+=`<rect x="${x}" y="20" width="100" height="48" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+50}" y="40" text-anchor="middle" font-size="10.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${n[0]}</text><text x="${x+50}" y="56" text-anchor="middle" font-size="9" fill="${on?'#eef':'var(--ink2)'}">${n[1]}</text>${i<4?`<line x1="${x+100}" y1="44" x2="${x+110}" y2="44" stroke="var(--ink2)"/>`:''}`; });
    r+=`<path d="M388 68 q0 34 -40 34 h-30 q-20 0 -20 -30" fill="none" stroke="var(--warn)"/><text x="300" y="118" font-size="9.5" fill="var(--warn)">mismatch: drop 1 byte, sleep 1 ms, read 1 more (≤ 200 tries → 0x8905 timeout)</text>
      <text x="8" y="140" font-size="10" fill="var(--ink2)">status ≠ 0 or bad seq/checksum → RdProcessRequest sends the same frame once more, then returns the error.</text>
      <text x="8" y="158" font-size="10" fill="var(--ink)">${c? `${c.name} seq ${c.seq}: ${ph==='tx'?'on the wire':ph==='proc'?'GPU executing':'host waiting in read()'}` : 'link idle'}</text></svg>`;
    m.querySelector('#rr').innerHTML=r;
    // touch FSM
    const f=fingerAt(t), lastP=[...s.pk].reverse().find(p=>p.ts<=t);
    const tn=(x,lbl,sub,on)=>`<g><circle cx="${x}" cy="60" r="34" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="72" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const cur = lastP && t-lastP.ts<C.SCAN? lastP.flag : -1;
    m.querySelector('#te').innerHTML=`<svg viewBox="0 0 520 130" style="width:100%">${tn(70,'Putdown','flag 00',cur===0)}${tn(260,'Contact','flag 10, every scan',cur===2)}${tn(450,'Putup*','flag 01, x↔y',cur===1)}
      <line x1="104" y1="60" x2="226" y2="60" stroke="var(--ink2)"/><line x1="294" y1="60" x2="416" y2="60" stroke="var(--ink2)"/>
      <text x="10" y="116" font-size="10.5" fill="var(--ink)">${f? `finger at (${f.x},${f.y}) → reported (${D.scale==='half'?f.x>>1:f.x}, ${D.scale==='half'?f.y>>1:f.y})` : 'no finger'} · touchDetect keeps only the last point: xPos, yPos stay set between polls</text></svg>`;
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator / engineer does</th><th>Code path</th><th>What changes</th></tr>
      <tr><td>Tap the glass</td><td class="mono small">controller scan → GPU event queue → RdGetEventData (0x3832) → touchDetect()</td><td class="small">eventFlag, xPos, yPos; the hit test runs after every poll</td></tr>
      <tr><td>Tap inside the circle</td><td class="mono small">touchData ≤ touchRadSquared → break</td><td class="small">120 × (usleep(1000); RdImageMove 0x3235): 14-byte request, 10-byte reply each</td></tr>
      <tr><td>Slide ends</td><td class="mono small">RdImageDelete(write_id_btn1); RdImageWrite(btn2)</td><td class="small">the GPU hands out a write id: reused or fresh (checkbox)</td></tr>
      <tr><td>Tap button 2</td><td class="mono small">same loop, btn2x = 361</td><td class="small">return moves on write_id_btn1 (deleted)</td></tr>
      <tr><td>Emulator Download All</td><td class="mono small">RdFlashWriteEnable, RdFlashImage, RdFlashData×n (0x4031–0x4033)</td><td class="small">labels in flash; splash.bmp shows at power-up</td></tr>
      <tr><td>Unplug USB</td><td class="mono small">open() fails; RdInitialize return ignored → RdReset → _RD_CHECK_INTERFACE</td><td class="small">0x8907 RdErrorPortOpenFailed; main returns</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    const used=k=>s.cmds.filter(x=>x.k===k).length;
    const map=[['0x3131','RdSetLayerEnable','layer u16, flag u8','layer'],['0x3133','RdSetLayerBackColor','layer u16, R G B A','back'],['0x3138','RdComposeLayersToPage','page u16 — never called by the WBS tests',null],['0x3231','RdImageLoad','label (u16 len + chars) → image id','load'],['0x3233','RdImageWrite','layer, image id, x, y → write id','write'],['0x3234','RdImageDelete','write id','del'],['0x3235','RdImageMove','write id, x, y','move'],['0x3532','RdTouchMapCircle','pos, radii, label — used only by the portal export 1Test1.c',null],['0x3631','RdSystemInfo','type u16 → string','info'],['0x3831','RdReset','—','reset'],['0x3832','RdGetEventData','— → count, packets','event'],['0x4031–35','RdFlash…','emulator downloads',null]];
    m.querySelector('#cmap').innerHTML=`<table class="kv"><tr><th>id</th><th>ASCII</th><th>function</th><th>payload</th><th>this second</th></tr>${map.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[0].length===6?'"'+ascii(parseInt(r[0],16))+'"':''}</td><td class="mono small">${r[1]}</td><td class="small">${r[2]}</td><td class="mono">${r[3]?used(r[3]):'—'}</td></tr>`).join('')}</table>
      <p class="small muted">Command ids are pairs of ASCII digits (group, command). RdWriteUWord stores them little-endian, so 0x3235 RdImageMove goes out as the bytes 35 32 ("52").</p>`;
    m.querySelector('#frm').innerHTML=frameTable(c||lastCmd(t));
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  const dm=(txt)=>`<svg viewBox="0 0 ${txt.length*13.7+8} 22" style="width:100%;max-width:300px;display:block;background:#0a0c0a;border-radius:4px">${SIM.dotMatrix(txt,5,4,2.2,'#ff4a3a','#2a1210')}</svg>`;
  m.innerHTML = card('What was decided, and what became of it', `
  <div class="grid2"><div>
  <ol>
    <li><b>The question (RD71, RD62).</b> The R&D register has <span class="mono">A | RD | 62 | AMS82 front LCD replacement. Possibly with LCD video display. | Kevin/ Peter</span> and <span class="mono">A | RD | 71 | Touch Screen Display</span>. RD62's folder has only <span class="mono">details.txt</span> (Jan 2013|46): "Company that Census probably used for their displays is Nortitake" [sic, Noritake]. No file names RD71's target. The AMS8-2 is the likely one (${inf}): it is the RD62 product, the module is a 1U-format 480 × 110 strip, and the WBS mock-ups are a <i>ROOT / Menu 1</i> button screen and a pair of VU-meter faces.</li>
    <li><b>The evaluation (May 2015|48).</b> First port of the vendor example 8 May, a flat-library build 11 May, then the three <span class="mono">working/</span> tests 13–15 May, and the GUI art on 21 May. It got as far as images, moves and a single touch button. Fonts, text and menus were never used, and there was no link to any WBS firmware.</li>
    <li><b>The decision (${inf} from what followed).</b> No touch TFT. The end-of-life PDSP1884 was replaced with the near drop-in <b>HDSP-2533</b> 8-character display: XTM4 V040001 "04AV0001", tested 21 Nov 2015|48; AMS8-1 06VA0002, May 2016|49, "also works with old PDSP1884". The R&D register (2016|49 copy) still lists RD71 at priority A, so it was parked, not closed.</li>
    <li><b>Why it probably stopped (${inf}).</b> The module wants a USB host (or SPI) and artwork preloaded into its own flash. The AMS8-2 front panel is an ATmega128 that writes ASCII strings to three parallel displays. Using the TFT meant a new host interface, a new SIEMENS8 layer, an image pipeline and a new front panel. The HDSP-2533 needed only a reset-sequence change.</li>
  </ol></div>
  <div><h3>Same information, two displays</h3>
    <p class="small">AMS8-2 today: three 8-character dot-matrix displays (SIEMENS8_lcd_display1/2/3). Example strings from the ams82 plugin.</p>
    ${dm('  Input ')}<div style="height:4px"></div>${dm(' Select ')}<div style="height:4px"></div>${dm(' 2.1.2.0')}
    <p class="small">The RD71 module (480 × 110, 95 × 22 mm): the WBS mock-ups from <span class="mono">Images/</span>.</p>
    <img src="${ASSET}elements.png" alt="WBS Elements mock-up: ROOT, WBS logo, four Menu 1 buttons" style="width:100%;border-radius:4px;display:block;margin-bottom:4px">
    <img src="${ASSET}vu.png" alt="WBS VU METER mock-up: two VU faces" style="width:100%;border-radius:4px;display:block">
    <p class="small muted">The "WBS Elements" art has four yellow buttons with LED-style inserts and a WBS badge. Read with RD62's "possibly with LCD video display", it is a menu front end for a monitor (${inf}).</p></div></div>`)
  + card('What the code is up to — findings from the source', `
  <ol>
    <li><b>The return trip moves a deleted image.</b> In <span class="mono">working/areaSpecificTouch/source/main.c</span> and <span class="mono">working/movingDots/source/main.c</span>, after <span class="mono">RdImageDelete(rdi, write_id_btn1)</span> and <span class="mono">RdImageWrite(…btn2…, &amp;write_id_btn2)</span>, the backward loop still calls <span class="mono">RdImageMove(rdi, write_id_btn1, …)</span>. It only animates if the GPU hands the freed id straight back (${inf}). If not, every move returns 0x8027, <span class="mono">RdProcessRequest</span> sends it a second time, and <span class="mono">ret</span> is never checked. Untick "GPU reuses freed write ids" to watch it.</li>
    <li><b>The hit test doubles the touch coordinates.</b> <span class="mono">touchData = (2*xPos − btn1x)² + (2*yPos − btn1y)²</span>, compared with <span class="mono">touchRadSquared = 529</span> (23²), with btn1x = 121 = 98 + 23. That puts the circle on the button only if the controller reports on a 240 × 55 grid (${inf}). The archived 43 × 43 button art would centre at 119.5, so the bitmaps the code used were probably 46 px (${inf}).</li>
    <li><b>The comment and the patch disagree.</b> <span class="mono">gettouch.c</span> (Densitron 2.2T) and <span class="mono">touchDetect()</span> say "firmware bug in controller reverses x,y position in <i>Putdown</i> event". The code swaps on <span class="mono">eventFlag == 01</span>, which it prints as <span class="mono">"Putup*"</span>. Putdown is 00.</li>
    <li><b>Stale coordinates.</b> <span class="mono">touchDetect()</span> keeps the last point in the globals <span class="mono">xPos/yPos</span>, and <span class="mono">main()</span> hit-tests after every poll, even when <span class="mono">count == 0</span>. A finger lifted inside the next target would fire it on the first empty poll.</li>
    <li><b>Double free.</b> <span class="mono">free(free_pointsData)</span> sits outside the <span class="mono">if (eventType == 1)</span> block in both <span class="mono">gettouch.c</span> and <span class="mono">touchDetect()</span>. A non-touch event frees the previous buffer a second time.</li>
    <li><b>Busy polling vs. a one-second nap.</b> The WBS loop polls with no sleep: about 1000 <span class="mono">RdGetEventData</span> round trips a second, so the BBB never idles. Densitron's <span class="mono">touch1.c</span> uses <span class="mono">sleep(SLEEPTIME)</span> with <span class="mono">SLEEPTIME 1</span>: a whole second between polls.</li>
    <li><b>Device-side touch maps were dropped.</b> The portal export <span class="mono">1Test1.c</span> (11 May) defines <span class="mono">RdTouchMapCircle(…(91,31), 44…"btn1touch")</span> and <span class="mono">(334,35), 45…"btn2touch"</span>, then composes and shows page 1. Four days later the WBS tests do their own circle test on the host and never call <span class="mono">RdComposeLayersToPage/RdPageToScreen</span>.</li>
    <li><b>Unchecked start-up.</b> <span class="mono">rdi = malloc(sizeof(RdInterface))</span> is not zeroed, so <span class="mono">isOpen</span> is garbage. The return value of <span class="mono">RdInitialize</span> is ignored, and the <span class="mono">if (rdi == NULL)</span> after it can never be true. The flat-library <span class="mono">main.c</span> does <span class="mono">memset(&amp;rdi,0,…)</span>.</li>
    <li><b>Library slips (third party).</b> In the tutorial copies, <span class="mono">RdClose</span> sets <span class="mono">ptr = NULL</span> before <span class="mono">free(ptr)</span>, which leaks (the 3.00 flat copy frees first). The big-endian branch of <span class="mono">RdWriteUWord</span> stores a pointer, not a value. <span class="mono">RipdrawCommon.c</span> carries "WC bug patch" defines that force the serial back end and take the port from <span class="mono">argv[0]</span>, which is why <span class="mono">RdInitialize(rdi, 1, &amp;portname)</span> works.</li>
    <li><b>115 200 baud that isn't.</b> <span class="mono">RipdrawLinuxSerialInit</span> sets B115200, 8N1, raw, VMIN 1. On a CDC-ACM <span class="mono">/dev/ttyACM0</span> the rate is ignored and USB framing sets the pace. Switch the Link control to compare.</li>
    <li><b>ASCII command ids.</b> <span class="mono">RdCommandImageMove = 0x3235</span> is "25" (group 2, command 5). The little-endian <span class="mono">RdWriteUWord</span> puts "52" on the wire.</li>
    <li><b>The 7-inch examples.</b> <span class="mono">five_buttons_7</span>, <span class="mono">buttonoff_7</span>, <span class="mono">tag_7</span> and <span class="mono">medwaves_7</span> are laid out for a larger panel (positions such as (879,454) and touch areas up to x = 1024). The first port <span class="mono">fivebbbb.c</span> drew four of its five buttons off the 480 × 110 screen.</li>
    <li><b>Mislabelled art.</b> <span class="mono">WBS Elements.jpg</span> and <span class="mono">WBS BUTTON-OFF.jpg</span> are Photoshop PSDs with a .jpg name. The work PSDs are 960 × 220 (2× the panel). The <span class="mono">bg/btn1/btn2</span> bitmaps the code loads are not archived.</li>
    <li><b>Build leftovers.</b> The Makefile is Windows-only (<span class="mono">SHELL = cmd</span>, <span class="mono">C:\\gcc-linaro\\…</span>) and points at <span class="mono">../../Densitron/ripdraw_core</span>, which isn't archived. <span class="mono">source/include/</span> holds copies of GCC's own headers (arm_neon.h, stdint.h…). <span class="mono">gettouch.c</span> and <span class="mono">dump_buffer.c</span> are linked into areaSpecificTouch but never called. <span class="mono">dump_buffer</span> has <span class="mono">#include &lt;stdio.h&gt;</span> inside the function and prints <span class="mono">(int)buffer[c]</span> of a <span class="mono">char*</span>. That is fine on ARM (unsigned char), but Contact bytes (0x80+) would print as FFFFFF80 on x86.</li>
    <li><b>Folder names tell the story:</b> <span class="mono">backup1 - first attempt for example fiveb</span> → <span class="mono">things that compiled/</span> (including a flat-library folder with an exasperated name) → <span class="mono">working/</span>.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>USB timing (60 µs to the GPU; reply on the next 1 ms frame), GPU processing times per command, <span class="mono">usleep(1000)</span> = 1.08 ms: ${inf}. Nothing in the archive measures them.</li>
    <li>LCD refresh 60 Hz and touch scan 100 Hz with one packet per scan: ${inf}. The 35 ms liquid-crystal response is from the datasheet.</li>
    <li>The touch grid is 240 × 55 by default, because that is what the working code needs (${inf}). Write-id reuse is on by default, because the program sat in <span class="mono">working/</span> (${inf}).</li>
    <li>Response bytes 8–9 of an event message (skipped by <span class="mono">RdGetEventData</span>) are shown as 00 00, and the touch-id nibble as 0 (${inf}). Splash art and the bg/btn1/btn2 bitmaps are stand-ins taken from the WBS art in <span class="mono">Images/</span>.</li>
    <li>Front bezel layout and rear connector positions: ${inf}. Only the outline, the viewing area, the pixel pitch and the pin tables come from 84-0221-000T.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>${RDF}README.md · Research.txt · ../R&amp;D_List.xls.md (RD62, RD71)</li>
    <li>${RDF}Densitron Display/Software/working/{areaSpecificTouch,movingDots,loadAndDeleteImages}/source/*</li>
    <li>${RDF}Densitron Display/Software/things that compiled/{1RU_tutorial_1,1RU_tutorial_2_touch,flat library}/…</li>
    <li>${RDF}Densitron Display/Documents/84-0221-000T.pdf · 83-0022-000.pdf · Tutorial_Loading _1U_Splash_Screen.pdf · helpful_hints_on_beagle_bone_black_and_tools.pdf</li>
    <li>${RDF}Densitron Display/Images/* (assets rd71-touchdisplay-*.png) · Tools/*.zip</li>
    <li>AMS82 - #Master/AMS82 - CharacterDisplayReplacement #RD #RD62/ · AMS81 - #Master/README.md · XTM4 - #MASTER/README.md</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'rd71-touchdisplay', name:'RD71 Touch Display · Densitron RipDraw 1U touch TFT evaluation (2015|48)', duration:1,
  product:'RD71 Touch Display', year:2015, family:'R&D register',
  folder:'ENGINEERING - 2016 RD FILES/RD71-TouchDisplay',
  summary:'A 2015|48 bench evaluation of a Densitron 480 × 110 1U touch TFT with its own Cortex-M4 "RipDraw" GPU, driven over USB from a BeagleBone Black. The likely target was a replacement for the AMS8-2 8-character displays (RD62). The simulation runs the archived C test programs, byte for byte, against a model of the display.',
  highlights:['Tap the 480 × 110 screen and follow the touch packet through RdGetEventData to the hit test','Every RipDraw frame decoded: cmd id, seqNo, length, payload, checksum','LCD refresh, the 35 ms LC response and USB frame timing on one zoomable second','The deleted-write-id bug and the 2·xPos touch scaling, with switches to expose them','What was decided: HDSP-2533 dot-matrix displays instead (2015|48–2016|49)'],
  depth:'Full model',
  stepUnits:[
    {label:'1 USB frame (1 ms)', period:()=>C.USB_FRAME},
    {label:'1 LCD refresh (16.7 ms)', period:()=>C.LCD, phase:()=>C.LCD_PH},
    {label:'1 touch scan (10 ms)', period:()=>C.SCAN, phase:()=>C.SCAN_PH},
    {label:'100 µs', period:()=>0.0001},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (one slide)'],[0.05,'50 ms (3 LCD frames)'],[C.LCD,'16.7 ms (1 LCD frame)'],[0.005,'5 ms (2 moves)'],[0.0015,'1.5 ms (1 command)']],
  defaultZoom:0,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the evaluation', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
