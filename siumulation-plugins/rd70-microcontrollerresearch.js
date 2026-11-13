/* =====================================================================
   RD70 — Microcontroller Research (Ward-Beck Systems R&D, May–June 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What was evaluated: a move from the 8-bit ATmega128 super-loop used across the AMS/POD/openGear lines to a
   32-bit ARM Cortex-M part, with FreeRTOS as the scheduler. The only code that was ever run is the stock
   FreeRTOS V7.4.2 demo "CORTEX_M4F_STM32F407ZG-SK", opened, rebuilt and debugged in IAR EWARM 6.0 on
   2013-05-30 / 2013-05-31. This plugin runs that demo tick by tick and sets it beside the WBS super-loops.

   Sources used (all under ENGINEERING - 2016 RD FILES/RD70-MicroControllerResearch/ unless noted):
   - Research Notes.docx (Arrow meeting, 2013-05-22), ARM Cortex-M Comparison.doc (2013-05-24),
     Info Freescale Micro.xlsx (sheet "Part by Part Comparison" incl. the "Final Decision" Low/Mid/High header),
     Developement IDE/Tools quote.docx (IAR / Keil, 2013-06-04), STMi32/arrowQuote.xls (parts quote 2013-06-27),
     STMi32/Pin Comparison.xlsx (STM32F100VB / F103VB / F407VE pin table), RTOS/Research.doc, AVB/AVB Notes.xlsx,
     Ethernet/NOtes.txt, Ethernet/ethernet.docx, STMi32/Programmer_Debugger/jtag schematic.docx
   - STMi32/STM32F4 Discovery Board User Manual DM00039084.pdf (UM1472: Fig. 3 layout, Fig. 10 mechanical drawing
     66 × 97 mm, LEDs, buttons, CN2/CN3, clock options), STMi32/STM32F407VE/pcb/No Ethernet/MB997.pdf (sheet 6:
     B1/B2 and LD3–LD6 networks), STMi32/STM32F407VE/DM00037051.pdf (PLL limits)
   - RTOS/FREERTOS/FreeRTOSV7.4.2.zip and the extracted tree (third-party, GPL + exception):
       Demo/CORTEX_M4F_STM32F407ZG-SK/main.c (prvOptionallyCreateComprehensveTestApplication, prvCheckTimerCallback,
       prvButtonTestTask, EXTI9_5_IRQHandler, vApplicationTickHook, TIM2/TIM3_IRQHandler), FreeRTOSConfig.h,
       ParTest.c, board/iar_stm32f407zg_sk.h, startup/system_stm32f4xx.c (PLL_M 25, PLL_N 300, SystemCoreClock),
       settings/RTOSDemo.cspy.bat + RTOSDemo.wsdt (changed by WBS), RTOSDemo.dep + EW*.tmp (left by WBS),
       Demo/Common/Minimal/flash.c, PollQ.c, death.c, semtest.c, recmutex.c, GenQTest.c,
       Source/tasks.c, list.c (vListInsertEnd), portable/IAR/ARM_CM4F/port.c (xPortSysTickHandler)
   - Comparisons: pod33.js / ams82.js (ATmega128 super-loops), m6205.js (Ross zeuslib gearos scheduler),
     premo.js (RD88 STM32F070, what came after); #POD #SERIES/POD30 .../RD67 README (STM32 sheets);
     RD71-TouchDisplay README (BeagleBone / AM335x); archive README §II.2 (super-loop)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
const Y = y => SIM.year(y);
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const css = n => SIM.css(n);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const us = d => SIM.fmtDur(d);
const RD = 'RD70-MicroControllerResearch';
const DEMO = 'RTOS/FREERTOS/FreeRTOSV7.4.2/FreeRTOS/Demo/CORTEX_M4F_STM32F407ZG-SK';

/* =====================================================================
   1. ARCHIVE FACTS
   ===================================================================== */
/* Info Freescale Micro.xlsx, sheet "Part by Part Comparison" — one row per column of the sheet.
   price = the sheet's price cell (USD assumed, inferred); q = arrowQuote.xls 2013-06-27 (CAD) unit price / qty / lead time. */
const CANDS = [
  {p:'MK60DX256ZVLL10', d:'K60_100', fam:'Freescale Kinetis', core:'ARM M4', mhz:100, fl:'256KB', ram:'132KB', ee:'4K', pins:100, price:'7.3', eth:'RMII', can:'y', usb:'DCD', fpu:'n'},
  {p:'MK60DN256ZVLL10', d:'K60', fam:'Freescale Kinetis', core:'ARM M4', mhz:100, fl:'256KB', ram:'64kB', ee:'N', pins:100, price:'5.7', eth:'RMII', can:'y', usb:'DCD', fpu:'n', q:'4.20 × 450, 6 wks'},
  {p:'MK20DX128VLH7', d:'K20', fam:'Freescale Kinetis', core:'', mhz:72, fl:'128KB', ram:'32KB', ee:'2KB', pins:64, price:'4.4', eth:'n', can:'1', usb:'DCD', fpu:''},
  {p:'MK20DX128VLL7', d:'K20', fam:'Freescale Kinetis', core:'', mhz:72, fl:'128KB', ram:'32KB', ee:'2KB', pins:100, price:'4.63', eth:'n', can:'2', usb:'DCD', fpu:''},
  {p:'ATMEGA1280V-8AU', d:'atmega', fam:'Atmel AVR (8-bit)', core:'AVR', mhz:16, fl:'128K', ram:'8KB', ee:'4KB', pins:100, price:'10.15', eth:'', can:'', usb:'N', fpu:'', note:'The incumbent family. WBS products use the ATmega128 (not the 1280); “-8AU” is the 8 MHz low-voltage grade although the sheet says 16 MHz.'},
  {p:'ATXMEGA128A3-AU', d:'atxmega', fam:'Atmel AVR XMEGA', core:'AVR XMEGA', mhz:32, mhzInf:true, fl:'128KB', ram:'8KB', ee:'', pins:64, price:'6.01', eth:'', can:'', usb:'', fpu:'', note:'Sheet note: “Poor Support and long lead times.” Clock blank in the sheet (32 MHz from the XMEGA A manual).'},
  {p:'AT91SAM7X128', d:'SAM', fam:'Atmel SAM7', core:'ARM7TDMI', coreInf:true, mhz:55, fl:'128KB', ram:'32KB', ee:'0', pins:100, price:'', eth:'1 (MAC)', can:'1', usb:'Device', fpu:''},
  {p:'STM32F103', d:'STM32', fam:'ST STM32', core:'ARM-M3', mhz:72, fl:'128KB', ram:'20KB', ee:'', pins:100, price:'4.97', eth:'', can:'1?', usb:'FS 1?', fpu:''},
  {p:'STM32F205VCT6', d:'STM32', fam:'ST STM32', core:'ARM-M3', mhz:120, fl:'256KB', ram:'128KB', ee:'', pins:100, price:'5.35', eth:'', can:'2', usb:'OTG 2', fpu:''},
  {p:'STM32F207VCT6', d:'STM32', fam:'ST STM32', core:'ARM-M3', mhz:120, fl:'256KB', ram:'128KB', ee:'', pins:100, price:'5.79', eth:'MII/RMII', can:'2', usb:'OTG 2', fpu:'', note:'Also camera interface.'},
  {p:'STM32F100VBT6B', d:'STM32', fam:'ST STM32', core:'ARM M3', mhz:24, fl:'128KB', ram:'8KB', ee:'None/Emulation', pins:100, price:'$2.502 / 90', eth:'', can:'', usb:'', fpu:'', tier:'Low (Basic)', q:'2.05 × 90, stock'},
  {p:'STM32F103VBT6', d:'STM32', fam:'ST STM32', core:'ARM M3', mhz:72, fl:'128KB', ram:'20KB', ee:'None (Emulation)', pins:100, price:'4.32', eth:'', can:'1', usb:'FS 1', fpu:'', tier:'Mid (CAN, USB)', q:'3.54 × 540, 14 wks'},
  {p:'STM32F407VET6', d:'STM32', fam:'ST STM32', core:'ARM M4F', mhz:168, fl:'512KB', ram:'196KB', ee:'None (emulation)', pins:100, price:'7.35', eth:'(MAC, not filled in)', can:'2', usb:'FS 1', fpu:'y', tier:'High (Ethernet)', q:'6.02 × 90, stock'},
];
/* Other MCU/SoC lines on arrowQuote.xls (2013-06-27, CAD), not in the comparison sheet */
const QUOTE_EXTRA = [
  ['STM32F303VBT6','3.50 × 540','14 wks','ST Cortex-M4F with analog'],
  ['TM4C123GH6PMI','4.99 × 160 (listed twice)','2 / 7 wks','TI Tiva C Cortex-M4F'],
  ['LPC1754FBD80,551','3.67 × 1','stock','NXP Cortex-M3'],
  ['MCIMX6S5DVM10AB','13.42 × 60','stock','Freescale i.MX6 Solo (Cortex-A9), + MMPF0100 PMIC × 4000'],
  ['AM3358BZCZ100','24.86 × 126','10 wks','TI Sitara AM335x (Cortex-A8) — the BeagleBone Black SoC used later in RD71'],
];
/* ARM Cortex-M Comparison.doc (instruction-set table) */
const CORES = [
  {id:'M0', arch:'ARMv6-M', mul:'1 or 32 cycle', div:'No', sat:'No', dsp:'No', fpu:'No', bus:'Von Neumann'},
  {id:'M0+', arch:'ARMv6-M', mul:'1 or 32 cycle', div:'No', sat:'No', dsp:'No', fpu:'No', bus:'Von Neumann'},
  {id:'M3', arch:'ARMv7-M', mul:'1 cycle', div:'Yes (10–12 cycles)', sat:'Yes', dsp:'No', fpu:'No', bus:'Harvard'},
  {id:'M4', arch:'ARMv7E-M', mul:'1 cycle', div:'Yes', sat:'Yes', dsp:'Yes', fpu:'Optional', bus:'Harvard'},
  {id:'M4F', arch:'ARMv7E-M', mul:'1 cycle', div:'Yes', sat:'Yes', dsp:'Yes', fpu:'Yes (single precision)', bus:'Harvard'},
];
/* Developement IDE/Tools quote.docx (Arrow, CAD) */
const TOOLS = {
  IAR: {name:'IAR Embedded Workbench for ARM (EWARM)', lines:['EWARM 6,649.95','EWARM-MB 6,985.00','EWARM-CM (Cortex-M) 4,106.86','EWARM-CM-MB 4,723.66'], note:'Notes: node-lock M0–M4 $3,900; full dongle $5,900; full node-lock $4,700. The Arrow FAE recommended IAR (“E-worm $4,700”). The archived demo settings show EWARM 6.0 was installed and used.'},
  Keil:{name:'Keil MDK-ARM', lines:['MDK-ARM 4,895.00','MDK-ARM-CM 3,200.00'], note:'Notes: Cortex-M licence $3,200; MDK-Professional $4,800. The comparison sheet says “Kyle is the recommended 3rd party IDE tool.”'},
};
const TIMELINE = [
  ['2013-05-22','Research Notes.docx','Meeting with the Arrow FAE: i.MX6, Kinetis (MQX), ST (FreeRTOS, pin-compatible), Sitara AM335x'],
  ['2013-05-24','ARM Cortex-M Comparison.doc','Cortex-M0/M3/M4 instruction-set tables'],
  ['2013-05-30 07:48','FreeRTOSV7.4.2.zip','FreeRTOS downloaded (newest entry 2013-05-01)'],
  ['2013-05-30 13:47','RTOSDemo.dep, EW1509/150A.tmp','IAR builds the CORTEX_M4F_STM32F407ZG-SK demo'],
  ['2013-05-30 13:48','settings/RTOSDemo.cspy.bat','C-SPY session: --device=STM32F407VG, J-Link driver over SWD'],
  ['2013-05-31 06:59','Info Freescale Micro.xlsx','Part-by-part sheet; “Final Decision” Low/Mid/High header over F100VB / F103VB / F407VE'],
  ['2013-05-31 10:50','EW19D9/19DA.tmp','Second IAR session'],
  ['2013-06-04','Tools quote.docx','IAR and Keil licence quote'],
  ['2013-06-27','STMi32/arrowQuote.xls','Parts quote: STM32F100VB, F103VB, F407VE, K60, i.MX6, AM3358, TM4C123, LPC1754 …'],
];

/* FreeRTOSConfig.h + system_stm32f4xx.c (stock) */
const CPU_HZ = 150e6;            // configCPU_CLOCK_HZ = SystemCoreClock, initialised to 150000000 and never updated (no SystemCoreClockUpdate call)
const TICK_HZ = 1000;            // configTICK_RATE_HZ
const RELOAD = CPU_HZ/TICK_HZ - 1; // portNVIC_SYSTICK_LOAD_REG = 149999
/* Kernel costs at 150 MHz — INFERRED (cycle estimates, not measured in the archive) */
const COST = { isr:2.4e-6, ctx:0.6e-6, exti:0.8e-6 };
const BOOT_T = 0.002;            // reset → first task (SystemInit, PLL lock, ~40 xTaskCreate) — INFERRED
const EPOCH = -2.5;              // the simulated second is seconds 2.5–3.5 after vTaskStartScheduler (so the 3 s CheckTimer lands at 0.5 s)

/* WBS super-loops and the Ross scheduler, reused from the sister plugins */
const POD33 = { name:'POD33 v102 · ATmega128 @ 8 MHz', loop:1/600, pick:0.20, disp:0.84, pickName:'SWITCH_ENCODER1', src:'pod33v102.c main() while(1); pass ≈ 1.67 ms (inferred in pod33.js from the 5 s idle timeout)' };
const AMS82 = { name:'AMS8-2 V2120 · ATmega128 @ 4.9152 MHz', loop:1/3000, pick:0.12, disp:0.35, pickName:'PROCESS_PUSHBUTTONS', src:'v200w.c main() while(1); pass ≈ 0.33 ms (inferred in ams82.js from PRESET_DEBOUNCE = 9000 ≈ 3 s)' };
const GEAROS = { name:'M6205 3G v6xx · Ross zeuslib gearos', period:0.040, phase:0.004, len:0.0045, src:'tasklist.c: appTask every APPTASK_INTERVAL = 40 ms, reportStatus every 1000 ms, canReceive on the CAN ISR (task length inferred in m6205.js)' };

/* =====================================================================
   2. DEVICE + BENCH STATE
   ===================================================================== */
const STOCK = { pllM:25, pllN:300, pllP:2, pllQ:7, ledMap:'sk', btnMap:'sk', btnPrio:0 };
const PORTED = { pllM:8, pllN:300, pllP:2, pllQ:7, ledMap:'disc', btnMap:'disc', btnPrio:0 };
const D = {
  board:'disc', usb:true, cn3:true, jp1:true,
  src: Object.assign({}, PORTED),             // what is in the editor
  device:'STM32F407VG', driver:'stlink',
  made:null,                                   // snapshot of src at the last Make
  debug:false,
  img: Object.assign({kind:'rtos'}, PORTED),   // image in the MCU flash
  prevImg: null, resetAt:null, errAt:null,
  presses:[0.2502],
  ideFile:'system_stm32f4xx.c',
  tier:{low:null, mid:null, high:null}, core:null, tool:null,
  log:[], lastTrace:[], tutReset:false,
};
D.made = Object.assign({}, D.src);
function asFound(){
  Object.assign(D, { board:'disc', usb:true, cn3:true, jp1:true, src:Object.assign({},STOCK), device:'STM32F4xxx', driver:'jlink',
    made:null, debug:false, img:{kind:'factory'}, prevImg:null, resetAt:null, errAt:null, presses:[], ideFile:'main.c',
    tier:{low:null,mid:null,high:null}, core:null, tool:null, log:[], lastTrace:[] });
  SKEY='';
}

/* =====================================================================
   3. CLOCK TREE (system_stm32f4xx.c SetSysClock with the board crystal)
   ===================================================================== */
function clockOf(c){
  const hse = D.board==='sk'? 25 : 8;            // SK: 25 MHz (HSE_VALUE default); Discovery: X2 = 8 MHz (UM1472 §4.10)
  const pin = hse/c.pllM, vco = pin*c.pllN, sys = vco/c.pllP, q = vco/c.pllQ;
  const okIn = pin>=0.95 && pin<=2.1, okVco = vco>=192 && vco<=432, okSys = sys<=168;
  const tick = (RELOAD+1)/(sys*1e6);
  return { hse, pin, vco, sys, q, okIn, okVco, okSys, tick, scale:150/sys, usbOk: Math.abs(q-48)<0.25 };
}
function fmtMHz(v){ return (Math.round(v*1000)/1000)+' MHz'; }

/* =====================================================================
   4. THE DEMO'S TASK SET (subset — main.c full demo, mainCREATE_SIMPLE_LED_FLASHER_DEMO_ONLY = 0)
   cost = µs at 150 MHz (INFERRED); period/phase in ticks (from the Common/Minimal sources)
   ===================================================================== */
function taskSet(img){
  const T=[]; const add=(name,prio,kind,o)=>{ T.push(Object.assign({name,prio,kind,rem:null},o||{})); };
  add('CREATOR',3,'periodic',{period:1000,phase:0,cost:24,src:'death.c vCreateTasks: vTaskDelay(1000 ms) → xTaskCreate SUICID1/SUICID2'});
  add('SUICID1',3,'periodic',{period:1000,phase:200,cost:5,src:'death.c vSuicidalTask: vTaskDelay(200 ms) → vTaskDelete'});
  add('SUICID2',3,'periodic',{period:1000,phase:200,cost:7,src:'death.c vSuicidalTask (holds SUICID1’s handle, deletes it then itself)'});
  add('Tmr Svc',2,'timer',{cost:6,src:'timers.c prvTimerTask → prvCheckTimerCallback (3000 ms, 200 ms after an error)'});
  add('QProdNB',2,'periodic',{period:200,phase:0,cost:3,src:'PollQ.c: pollqPRODUCER_DELAY 200 ms'});
  add('QConsNB',2,'periodic',{period:180,phase:0,cost:3,src:'PollQ.c: pollqCONSUMER_DELAY 180 ms'});
  add('Rec1',2,'periodic',{period:20,phase:1,cost:4,src:'recmutex.c controlling task, recmuSHORT_DELAY 20 ms (pattern inferred)'});
  [166,333,499].forEach((p,i)=>add('LEDx',1,'periodic',{period:p,phase:0,cost:2,led:i,src:`flash.c vLEDFlashTask uxLED ${i}: (333 + 333×${i}) / 2 = ${p} ticks per toggle`}));
  add('BlkSEM1',1,'periodic',{period:1000,phase:3,cost:30,src:'semtest.c blocking pair: count to 0xfff, vTaskDelay(100 × 10) (phase inferred)'});
  add('BlkSEM2',1,'periodic',{period:1000,phase:4,cost:30,src:'semtest.c (phase inferred)'});
  // priority 0: the ready list in creation order (main.c order of vStart… calls), then IDLE
  [['IntMath','busy'],['CNT1','busy'],['CNT2','busy'],['GenQ','yield',6],['Rec3','yield',2],['PolSEM1','yield',3],['PolSEM2','yield',3],
   ['Math1','busy'],['Math2','busy'],['Math3','busy'],['Math4','busy'],['Math5','busy'],['Math6','busy'],['Math7','busy'],['Math8','busy'],
   ['Reg1','busy'],['Reg2','busy']].forEach(([n,k,c])=>add(n,0,k,{cost:c||0}));
  add('BtnTest',img.btnPrio,'event',{cost:1.2,src:'main.c prvButtonTestTask: xSemaphoreTake(portMAX_DELAY); ulButtonPressCounts++'});
  add('IDLE',0,'yield',{cost:1.5,src:'tasks.c prvIdleTask: configIDLE_SHOULD_YIELD 1, vApplicationIdleHook (empty)'});
  return T;
}

/* =====================================================================
   5. SCHEDULER ENGINE — FreeRTOS V7.4.2 semantics, tick by tick
   - SysTick → xPortSysTickHandler → vTaskIncrementTick → PendSV (configUSE_PREEMPTION 1: switch every tick)
   - vTaskSwitchContext → taskSELECT_HIGHEST_PRIORITY_TASK → listGET_OWNER_OF_NEXT_ENTRY (round robin)
   - prvAddTaskToReadyQueue → vListInsertEnd: the woken task becomes pxIndex, i.e. the LAST one picked
   ===================================================================== */
let SIMR=null, SKEY='';
function presentLeds(img){ return D.board==='disc'? img.ledMap==='disc' : img.ledMap==='sk'; }
function buttonWired(img){ return D.board==='disc'? img.btnMap==='disc' : img.btnMap==='sk'; }
function runs(){
  if (!D.usb) return [{off:true, t0:-1, t1:2}];
  if (D.resetAt==null) return [{img:D.img, epoch:EPOCH, t0:-0.005, t1:1.005}];
  return [{img:D.prevImg||{kind:'factory'}, epoch:EPOCH, t0:-0.005, t1:D.resetAt}, {boot:true, t0:D.resetAt, t1:D.resetAt+BOOT_T},
          {img:D.img, epoch:D.resetAt+BOOT_T, t0:D.resetAt+BOOT_T, t1:1.005}];
}
function sim(){
  const key = JSON.stringify([D.board,D.usb,D.img,D.prevImg,D.resetAt,D.errAt,D.presses]);
  if (key===SKEY && SIMR) return SIMR; SKEY=key;
  const out = { runs:[], segs:[], isr:[], ctx:[], led:[], btn:[], cb:[], ticks:0 };
  runs().forEach(r=>{ out.runs.push(r); if (r.img && r.img.kind==='rtos') simRun(r, out); });
  out.segs.sort((a,b)=>a.t0-b.t0);
  SIMR = out; return out;
}
function simRun(r, out){
  const img=r.img, ck=clockOf(img), Tt=ck.tick, sc=ck.scale, E=r.epoch;
  r.ck = ck;
  const ISR=COST.isr*sc, CTX=COST.ctx*sc, EXTI=COST.exti*sc;
  const T = taskSet(img); r.tasks = T;
  const lists=[[],[],[],[],[]], idx=[0,0,0,0,0];
  const k0 = Math.max(0, Math.floor((r.t0-E)/Tt)), k1 = Math.floor((r.t1-E)/Tt);
  // check-timer schedule (prvCheckTimerCallback): 3000-tick period; an error latched before a callback is
  // reported at that callback, which shortens the period to 200 ticks (xTimerChangePeriod).
  const errTick = (D.errAt!=null && D.errAt>=r.t0 && D.errAt<r.t1)? Math.ceil((D.errAt-E)/Tt) : null;
  const timerNext = k=>{ let n = Math.max(3000, Math.ceil(k/3000)*3000);
    if (errTick!=null){ const first = Math.max(3000, Math.ceil((errTick+1)/3000)*3000); if (k>first) n = Math.min(n, first + Math.ceil((k-first)/200)*200); }
    return n; };
  T.forEach(t=>{
    if (t.kind==='busy'||t.kind==='yield') lists[t.prio].push(t);
    else if (t.kind==='periodic'){ t.next = t.phase + Math.max(0, Math.ceil((k0 - t.phase)/t.period))*t.period; if (t.next===0) t.next=t.period; }
    else if (t.kind==='timer') t.next = timerNext(k0);
    else if (t.kind==='event') t.blocked = true;
  });
  idx[0] = (k0 % lists[0].length);
  r.led0 = [0,1,2].map(i=>{ const P=[166,333,499][i]; return Math.floor(Math.max(0,k0-1)/P)%2; });
  r.led0[3] = Math.floor(Math.max(0,k0-1)/3000)%2;
  r.k0=k0; r.k1=k1; r.Tt=Tt;
  const insertEnd = t=>{ const L=lists[t.prio]; if (L.includes(t)) return; if (!L.length){ L.push(t); idx[t.prio]=0; return; } L.splice(idx[t.prio]+1,0,t); idx[t.prio]++; };
  const remove = t=>{ const L=lists[t.prio], i=L.indexOf(t); if (i<0) return; L.splice(i,1); if (i<=idx[t.prio]) idx[t.prio]--; if (idx[t.prio]<0) idx[t.prio]=L.length-1; };
  const select = ()=>{ for (let p=4;p>=0;p--){ const L=lists[p]; if (L.length){ idx[p]=(idx[p]+1)%L.length; return L[idx[p]]; } } return null; };
  const wired = buttonWired(img);
  const presses = D.presses.filter(p=>p>=r.t0 && p<r.t1).sort((a,b)=>a-b);
  presses.forEach(p=>{ if (!wired) out.btn.push({t:p, wired:false, img}); });
  const irqs = wired? presses.slice() : [];
  let pi=0, pendingBtn=null;
  for (let k=k0;k<=k1;k++){
    const ts=E+k*Tt, te=ts+Tt; out.ticks++;
    out.isr.push({t0:ts, t1:ts+ISR, kind:'tick', k});
    T.forEach(t=>{ if ((t.kind==='periodic'||t.kind==='timer') && t.next===k){ t.wokeAt=ts; insertEnd(t);
      if (t.kind==='periodic') t.next += t.period; else t.next = timerNext(k+1); } });
    let c = ts+ISR, need=true, run=null;
    let guard=0;
    while (c < te-1e-12 && guard++<400){
      if (need){ run=select(); if (!run) break; out.ctx.push({t:c,k}); c+=CTX; need=false;
        if (run.kind==='event' && pendingBtn && pendingBtn.start==null){ pendingBtn.start=c; }
        if (c>=te) break; }
      const ir = pi<irqs.length && irqs[pi]<te ? Math.max(irqs[pi], c) : Infinity;
      if (run.kind!=='busy' && run.rem==null) run.rem = (run.cost||1)*1e-6*sc;
      const end = run.kind==='busy'? te : c+run.rem;
      const segEnd = Math.min(end, ir, te);
      if (segEnd>c) out.segs.push({t0:c, t1:segEnd, name:run.name, prio:run.prio, kind:run.kind, k, task:run});
      if (run.kind!=='busy') run.rem -= (segEnd-c);
      c = segEnd;
      if (ir!==Infinity && ir<=c+1e-12){            // EXTI9_5_IRQHandler (or EXTI0 after the port)
        pi++; out.isr.push({t0:c, t1:c+EXTI, kind:'exti'});
        const bt = T.find(t=>t.kind==='event');
        const rec = {t:irqs[pi-1], isr:c, wired:true, img, prio:bt.prio, start:null, done:null};
        out.btn.push(rec);
        if (bt.blocked){ bt.blocked=false; insertEnd(bt); pendingBtn=rec; if (bt.prio>run.prio) need=true; }
        else rec.note='semaphore already given — this press is merged with the previous one';
        c += EXTI; continue;
      }
      if (c>=te-1e-12) break;
      // the task's burst is over
      if (run.kind==='periodic'||run.kind==='timer'||run.kind==='event'){
        run.rem=null; remove(run);
        if (run.led!=null) out.led.push({t:c, led:run.led, run:r});
        if (run.kind==='timer'){ out.led.push({t:c, led:3, run:r}); const err = errTick!=null && k>=Math.max(3000,Math.ceil((errTick+1)/3000)*3000); out.cb.push({t:c, k, err}); }
        if (run.kind==='event'){ run.blocked=true; if (pendingBtn){ pendingBtn.done=c; pendingBtn=null; } }
        need=true;
      } else if (run.kind==='yield'){ run.rem=null; need=true; }
    }
  }
}
/* What the kernel is doing at time t */
function runAt(t){ return sim().runs.find(r=>t>=r.t0 && t<r.t1) || sim().runs[sim().runs.length-1]; }
function segAt(t){ const S=sim().segs; let lo=0,hi=S.length-1,ans=null; while(lo<=hi){ const m=(lo+hi)>>1; if (S[m].t0<=t){ ans=S[m]; lo=m+1; } else hi=m-1; } return ans && t<ans.t1 ? ans : null; }
function isrAt(t){ return sim().isr.find(e=>t>=e.t0 && t<e.t1) || null; }
function readyAt(t){
  // reconstruct the ready lists at t from the segments of the current tick (good enough for display)
  const r=runAt(t); if (!r || !r.tasks) return null;
  const k=Math.floor((t-r.epoch)/r.Tt);
  const blocked=[], ready={0:[],1:[],2:[],3:[],4:[]};
  r.tasks.forEach(tk=>{
    if (tk.kind==='busy'||tk.kind==='yield'){ ready[tk.prio].push(tk.name); return; }
    if (tk.kind==='event'){ const b=sim().btn.find(x=>x.wired && x.img===r.img && x.isr<=t && (x.done==null || x.done>t)); if (b) ready[tk.prio].push(tk.name); else blocked.push(tk.name+' (semaphore)'); return; }
    let nxt = tk.kind==='timer'? null : tk.phase + Math.ceil(Math.max(0,(k+1-tk.phase))/tk.period)*tk.period;
    const s = sim().segs.find(sg=>sg.task===tk && sg.k===k && sg.t1>t);
    if (s) ready[tk.prio].push(tk.name); else blocked.push(tk.name+(nxt!=null?' (tick '+nxt+')':' (timer)'));
  });
  return {k, ready, blocked};
}
function ledsAt(t){
  const r=runAt(t); const off=[0,0,0,0];
  if (!D.usb || !r || r.off || r.boot) return {v:off, why: !D.usb? 'no power' : r && r.boot? 'in reset' : ''};
  if (r.img.kind==='factory'){ const s=Math.floor(((t+10)%0.5)/0.125); const v=[0,0,0,0]; v[[1,2,3,0][s]]=1; return {v, why:'factory ST demo (pattern inferred)', fac:true}; }
  const v=r.led0.slice();
  sim().led.forEach(e=>{ if (e.run===r && e.t<=t) v[e.led]^=1; });
  return {v, why: presentLeds(r.img)? '' : 'ParTest drives '+(r.img.ledMap==='sk'?'PF6–PF9 (not bonded on the LQFP100 STM32F407VG)':'PD12–PD15 (not the SK board’s LED pins)'), dark:!presentLeds(r.img)};
}
/* Physical LED on the Discovery: xLEDs[0..3] → LD4 green PD12, LD3 orange PD13, LD5 red PD14, LD6 blue PD15 (remap inferred) */
const DLED = [ {ld:'LD4',pin:'PD12',col:'#3ddc5a',name:'green'}, {ld:'LD3',pin:'PD13',col:'#ff9f2e',name:'orange'}, {ld:'LD5',pin:'PD14',col:'#ff4a3d',name:'red'}, {ld:'LD6',pin:'PD15',col:'#3d8bff',name:'blue'} ];

/* Super-loop and gearos pick-up of the same press */
function loopPick(L, te){ const n=Math.ceil((te - L.pick*L.loop)/L.loop); const tp=n*L.loop + L.pick*L.loop; return {tp, td: n*L.loop + L.disp*L.loop + (tp>n*L.loop+L.disp*L.loop? L.loop:0), pass:n}; }
function gearPick(te){ const n=Math.ceil((te-GEAROS.phase)/GEAROS.period); return {tp: GEAROS.phase+n*GEAROS.period}; }

/* =====================================================================
   6. ACTIONS (each logs the real code path)
   ===================================================================== */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({t:SIM.t, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SKEY=''; SIM.refresh();
}
function srcEq(a,b){ return a && b && ['pllM','pllN','pllP','pllQ','ledMap','btnMap','btnPrio'].every(k=>a[k]===b[k]); }
const A = {
  pressB1(){ act('Press B1 USER (PA0)', tr=>{
    if (!D.usb){ tr('The board has no power (CN1 unplugged).'); return; }
    const t=SIM.t; if (!D.presses.some(x=>Math.abs(x-t)<1e-9)) D.presses.push(t); D.presses.sort((a,b)=>a-b); SKEY='';
    tr(`B1 closes: VDD → R38 (100 Ω) → switch → R35 (330 Ω) → SB20 → PA0 goes high (R39 220 kΩ pull-down) at ${SIM.fmtT(t)}`);
    const r=runAt(t); if (!r || r.boot){ tr('The MCU is in reset; nothing reads PA0.'); return; }
    if (r.img.kind==='factory'){ tr('Factory demo: B1 switches the ST demo to the LIS302DL tilt mode (UM1472 §2.2). Not modelled.'); return; }
    if (!buttonWired(r.img)){
      tr(D.board==='disc'? 'The demo configured STM_EVAL_PBInit(BUTTON_USER, BUTTON_MODE_EXTI) for PG6 / EXTI_Line6 (iar_stm32f407zg_sk.h). PA0 / EXTI0 is not enabled → no interrupt, BtnTest stays blocked, ulButtonPressCounts does not change.'
        : 'The image expects the button on PA0/EXTI0; the SK board’s USER button is PG6 → nothing.');
      return; }
    const b=sim().btn.find(x=>x.t===t && x.wired);
    tr(`${D.board==='disc'?'EXTI0_IRQHandler (remapped)':'EXTI9_5_IRQHandler'} → EXTI_ClearITPendingBit → xSemaphoreGiveFromISR(xTestSemaphore, &lHigherPriorityTaskWoken)`);
    if (!b) return;
    if (b.note){ tr(b.note); return; }
    tr(`BtnTest has priority ${b.prio}${b.prio===0?' (tskIDLE_PRIORITY, the same as the running task)':''} → lHigherPriorityTaskWoken = ${b.prio>0?'pdTRUE → portEND_SWITCHING_ISR → PendSV':'pdFALSE → no switch; vListInsertEnd puts BtnTest at the END of pxReadyTasksLists['+b.prio+']'}`);
    if (b.start!=null) tr(`BtnTest runs at ${SIM.fmtT(b.start)}: latency ${us(b.start-b.t)} → xSemaphoreTake returns, ulButtonPressCounts++`);
    else tr('BtnTest has not run before the end of the simulated second.');
    const p=loopPick(POD33,t), a=loopPick(AMS82,t), g=gearPick(t);
    tr(`Same press on the WBS super-loops: POD33 sees it in ${POD33.pickName} after ${us(p.tp-t)}; AMS8-2 in ${AMS82.pickName} after ${us(a.tp-t)}. Ross gearos appTask: after ${us(g.tp-t)}.`);
  }); },
  reset(){ act('Press B2 RESET (NRST)', tr=>{
    if (!D.usb){ tr('No power.'); return; }
    D.prevImg = D.img; D.resetAt = SIM.t; D.errAt=null;
    tr('NRST low (R37 100 kΩ pull-up, C37 100 nF) → Reset_Handler (startup_stm32f4xx.s) → SystemInit()');
    if (D.img.kind==='factory'){ tr('The factory ST demo restarts.'); return; }
    const ck=clockOf(D.img);
    tr(`SetSysClock: HSE ${ck.hse} MHz / PLL_M ${D.img.pllM} = ${fmtMHz(ck.pin)} → × PLL_N ${D.img.pllN} = VCO ${fmtMHz(ck.vco)} → / PLL_P ${D.img.pllP} = SYSCLK ${fmtMHz(ck.sys)}`);
    tr('main(): prvSetupHardware → vStartLEDFlashTasks → prvOptionallyCreateComprehensveTestApplication → vTaskStartScheduler (IDLE + Tmr Svc created) → vPortStartFirstTask');
    tr(`SysTick LOAD = configCPU_CLOCK_HZ / configTICK_RATE_HZ − 1 = ${RELOAD} → one tick = ${us(ck.tick)}`);
  }); },
  usb(){ act(D.usb?'Unplug CN1 (USB mini-B)':'Plug in CN1 (USB mini-B)', tr=>{ D.usb=!D.usb;
    tr(D.usb? 'LD2 PWR lights; the ST-LINK/V2 (STM32F103) enumerates; the target starts from reset.' : 'Board unpowered: LD1, LD2 and every user LED go dark.');
    if (D.usb){ D.prevImg=D.img; D.resetAt=SIM.t; D.debug=false; } }); },
  cn3(){ act(D.cn3?'Remove both CN3 jumpers':'Fit both CN3 jumpers', tr=>{ D.cn3=!D.cn3;
    tr(D.cn3? 'CN3 ON = “DISCOVERY”: the on-board ST-LINK/V2 programs the STM32F407VGT6 (UM1472 Table 2).' : 'CN3 OFF = “ST-LINK”: the ST-LINK/V2 drives the external SWD connector CN2 only. The on-board MCU can no longer be programmed.'); }); },
  jp1(){ act(D.jp1?'Remove JP1 (Idd)':'Fit JP1 (Idd)', tr=>{ D.jp1=!D.jp1; tr(D.jp1? 'JP1 fitted: VDD of the STM32F407 is connected.' : 'JP1 removed: put an ammeter across JP1 to measure the MCU current (UM1472 §4.9). Without it the MCU has no supply.'); if (!D.jp1){ D.prevImg=D.img; } }); },
  setSrc(k,v){ act(`Edit ${k==='btnPrio'?'main.c':k.startsWith('pll')?'system_stm32f4xx.c':'iar_stm32f407zg_sk.h / ParTest.c'}: ${k} = ${v}`, tr=>{
    if (k.startsWith('pll')||k==='btnPrio') v=+v;
    const lim={pllM:[2,63],pllN:[50,432],pllQ:[2,15]}; if (lim[k]) v=Math.max(lim[k][0],Math.min(lim[k][1],Math.round(v))); if (k==='pllP' && ![2,4,6,8].includes(v)) v=2;
    if (k==='btnPrio') v=Math.max(0,Math.min(4,v));
    D.src[k]=v;
    const names={pllM:'#define PLL_M',pllN:'#define PLL_N',pllP:'#define PLL_P',pllQ:'#define PLL_Q',ledMap:'LED1..4_PIN / _GPIO_PORT',btnMap:'USER_BUTTON_PIN / EXTI line',btnPrio:'xTaskCreate( prvButtonTestTask, "BtnTest", …, priority'};
    tr(`${names[k]} → ${k==='ledMap'?(v==='disc'?'PD12–PD15 (GPIOD)':'PF6–PF9 (GPIOF)'):k==='btnMap'?(v==='disc'?'PA0 / EXTI_Line0 / EXTI0_IRQn':'PG6 / EXTI_Line6 / EXTI9_5_IRQn'):v}`);
    if (k.startsWith('pll')){ const ck=clockOf(D.src); tr(`With the ${ck.hse} MHz crystal: PLL input ${fmtMHz(ck.pin)} ${ck.okIn?'(in 0.95–2.10 MHz)':'— OUT OF RANGE (datasheet 0.95–2.10 MHz)'}, VCO ${fmtMHz(ck.vco)} ${ck.okVco?'(in 192–432)':'— OUT OF RANGE (192–432 MHz)'}, SYSCLK ${fmtMHz(ck.sys)}${ck.okSys?'':' — above 168 MHz'}, PLL48CK ${fmtMHz(ck.q)}${ck.usbOk?'':' (USB OTG needs 48 MHz)'}`); }
    tr('The board keeps running the old image until you Make and Download.'); }); },
  device(v){ act('Project › Options › General › Device = '+v, tr=>{ D.device=v; tr(v==='STM32F407VG'? 'C-SPY gets --device=STM32F407VG and adds --macro Trace_STM32F4xx.dmac (as in the archived RTOSDemo.cspy.bat).' : 'Stock setting from the FreeRTOS download: --device=STM32F4xxx.'); }); },
  driver(v){ act('Options › Debugger › Driver = '+(v==='jlink'?'J-Link/J-Trace':'ST-LINK'), tr=>{ D.driver=v; tr(v==='jlink'? 'cspybat … armjlink.dll … --jlink_interface=SWD (the archived setting)' : 'cspybat … armstlink.dll — talks to the Discovery’s on-board ST-LINK/V2 '+infW('driver DLL name from IAR 6.x conventions; the archived file only shows armjlink.dll')); }); },
  make(){ act('Project › Make (F7)', tr=>{
    tr('iccarm: main.c, ParTest.c, port.c, portasm.s, list.c, queue.c, tasks.c, timers.c, heap_2.c, Common/Minimal: BlockQ, blocktim, countsem, death, dynamic, flash, GenQTest, integer, PollQ, recmutex, semtest, sp_flop …, StdPeriph: misc, rcc, gpio, exti, syscfg, board/iar_stm32f407zg_sk.c, startup_stm32f4xx.s, system_stm32f4xx.c (the RTOSDemo.dep list)');
    tr('ilinkarm → Flash Debug/Exe/RTOSDemo.out · 0 errors '+infW('the archive keeps the .dep but not the .out'));
    D.made=Object.assign({}, D.src);
    if (D.src.btnMap==='disc') tr('board header now routes BUTTON_USER to PA0 / EXTI0: EXTI0_IRQHandler replaces EXTI9_5_IRQHandler '+inf);
  }); },
  download(){ act('Project › Download and Debug (Ctrl+D)', tr=>{
    if (!D.made){ tr('Nothing built yet — IAR runs Make first.'); A_make_silent(); }
    else if (!srcEq(D.made, D.src)){ tr('Sources changed since the last Make — IAR rebuilds first.'); A_make_silent(); }
    tr(`cspybat … ${D.driver==='jlink'?'armjlink.dll':'armstlink.dll'} --flash_loader FlashSTM32F4xxx.board --device=${D.device} --drv_verify_download --semihosting`);
    if (!D.usb){ tr('Fatal error: no target power / probe not found.'); return; }
    if (D.board==='disc' && D.driver==='jlink'){ tr('Fatal error: “Failed to connect to J-Link”: the Discovery carries an ST-LINK/V2, not a J-Link '+infW('the archived session used the J-Link driver; whether a J-Link was on the bench is not recorded')); return; }
    if (D.board==='disc' && !D.cn3){ tr('ST-LINK found, but CN3 is open: the probe is switched to the external CN2 connector → “Target not responding”.'); return; }
    if (!D.jp1){ tr('Target VDD missing (JP1 removed) → “Could not connect to target”.'); return; }
    D.prevImg=D.img; D.img=Object.assign({kind:'rtos'}, D.made); D.resetAt=SIM.t; D.debug=true; D.errAt=null;
    const ck=clockOf(D.img);
    tr(`Flash loader programs 0x08000000, verify OK → reset → run to main. SYSCLK ${fmtMHz(ck.sys)} · tick ${us(ck.tick)}${Math.abs(ck.tick-1e-3)>2e-5?' (configTICK_RATE_HZ says 1 ms)':''}`);
    if (!ck.okIn||!ck.okVco) tr(`Warning: PLL input ${fmtMHz(ck.pin)} / VCO ${fmtMHz(ck.vco)} are outside the datasheet range; the model assumes the PLL still locks at that ratio ${inf}.`);
    if (!presentLeds(D.img)) tr('The LED tasks toggle '+(D.img.ledMap==='sk'?'GPIOF pins 6–9':'GPIOD pins 12–15')+', which '+(D.board==='disc'?'do not reach any LED on this board':'are not the SK LEDs')+'.');
  }); },
  stop(){ act('Debug › Stop Debugging', tr=>{ D.debug=false; tr('C-SPY detaches; the target keeps running from flash.'); }); },
  fault(){ act('Inject: a standard demo task latches an error', tr=>{
    if (D.img.kind!=='rtos'){ tr('Load the FreeRTOS demo first.'); return; }
    D.errAt=SIM.t;
    tr('e.g. BlockQ consumer sees an out-of-sequence value → its error flag stays set, so xAreBlockingQueuesStillRunning() returns pdFALSE');
    tr('prvCheckTimerCallback (Tmr Svc, every 3000 ms) → lErrorFound = pdTRUE → vParTestToggleLED(mainCHECK_LED) → xTimerChangePeriod(xTimer, 200 ms, 0)');
    tr(SIM.t<0.5? 'The next callback in this window is at ≈0.5 s; after it the check LED (LD6 blue after the remap) toggles every 200 ms.' : 'The next callback is after this simulated second (3000 ms period). Inject before 0.5 s to see it here.');
    tr('Note: a Reg1/Reg2 failure (ulRegTest1LoopCounter stops) needs TWO callbacks to show: the first compares against a value taken before the failure.');
  }); },
  clearPresses(){ D.presses=[]; D.errAt=null; SKEY=''; SIM.refresh(); },
  board(v){ act('Bench board: '+(v==='disc'?'STM32F4DISCOVERY (MB997)':'IAR STM32F407ZG-SK'), tr=>{ D.board=v; D.prevImg=D.img; D.resetAt=SIM.t;
    tr(v==='disc'? '8 MHz X2 crystal, LEDs on PD12–PD15, B1 on PA0, on-board ST-LINK/V2 (UM1472).' : 'The board the demo was written for: 25 MHz HSE, LEDs on PF6–PF9, USER button on PG6, J-Link over SWD. Not in the archive, so it is not drawn.'); }); },
  tier(level,p){ act(`Comparison sheet: ${level} tier = ${p}`, tr=>{ D.tier[level]=p; const c=CANDS.find(x=>x.p===p); tr(`${p}: ${c.core||'?'} · ${c.mhz} MHz · ${c.fl} flash · ${c.ram} SRAM · ${c.pins} pins · price cell “${c.price||'—'}”${c.q?' · quote '+c.q:''}`); }); },
  core(v){ act('Core choice: Cortex-'+v, tr=>{ D.core=v; const c=CORES.find(x=>x.id===v); tr(`${c.arch}: multiply ${c.mul}, divide ${c.div}, saturating ${c.sat}, DSP ${c.dsp}, FPU ${c.fpu}`); }); },
  tool(v){ act('Toolchain: '+TOOLS[v].name, tr=>{ D.tool=v; TOOLS[v].lines.forEach(l=>tr('Arrow quote line: '+l+' CAD')); tr(TOOLS[v].note); }); },
  ideFile(f){ D.ideFile=f; SIM.refresh(); },
};
function A_make_silent(){ D.made=Object.assign({}, D.src); D.lastTrace.push('Make: 0 errors, RTOSDemo.out linked '+inf); }

/* =====================================================================
   7. DRAWING — STM32F4DISCOVERY (MB997) to scale from UM1472 Fig. 10 (66 × 97 mm)
   Part positions measured from Fig. 10 / Fig. 3 at 4.2 px/mm (±1 mm). PCB colour not recorded in the archive.
   ===================================================================== */
function boardSVG(t){
  if (D.board==='sk') return skPanel(t);
  const L = ledsAt(t), r=runAt(t), on=D.usb;
  const pinRow=(x,label)=>{ let s=''; for (let i=0;i<25;i++){ const y=33.82+i*2.54; s+=`<circle cx="${x}" cy="${y}" r="0.62" fill="#c9b37a"/><circle cx="${x+2.54}" cy="${y}" r="0.62" fill="#c9b37a"/>`; } return s+`<rect x="${x-1.3}" y="32.5" width="5.1" height="63.6" fill="none" stroke="#000" stroke-opacity=".45" stroke-width=".3"/><text x="${x+1.27}" y="31.6" font-size="1.9" text-anchor="middle" fill="#e8ece9">${label}</text>`; };
  const led=(x,y,on,col,id,tip)=>`<g><title>${tip}</title><rect x="${x-0.8}" y="${y-0.5}" width="1.6" height="1" fill="${on?col:'#d8d8d0'}" stroke="#555" stroke-width=".12"/>${on?`<circle cx="${x}" cy="${y}" r="2.1" fill="${col}" opacity=".35"/>`:''}<text x="${x}" y="${y-1.1}" font-size="1.35" text-anchor="middle" fill="#e8ece9">${id}</text></g>`;
  const busy = r && r.img && r.img.kind==='rtos' && on;
  const sg = segAt(t), is=isrAt(t);
  const pv = L.v;
  const ledOn = i=> on && !L.dark && pv[i];
  let s = `<svg viewBox="-3 -4 72 104" role="img" aria-label="STM32F4DISCOVERY MB997 drawn to scale" style="width:100%;max-width:380px;display:block;margin:auto">
  <rect x="0" y="0" width="66" height="97" rx="1.2" fill="#24423a" stroke="#8a6fb0" stroke-width=".4"/>
  <rect x="11" y="0.3" width="44" height="28.5" fill="none" stroke="#e8ece9" stroke-opacity=".5" stroke-dasharray="1 .8" stroke-width=".25"/>
  <text x="12" y="27.6" font-size="1.7" fill="#e8ece9" opacity=".8">ST-LINK/V2</text>
  <text x="50" y="14" font-size="2" fill="#e8ece9">MB997B</text>
  <circle cx="6.33" cy="3.34" r="1" fill="#111"/><circle cx="59.67" cy="3.34" r="1" fill="#111"/>
  ${pinRow(6.33,'P1')}${pinRow(57.13,'P2')}
  <!-- CN1 mini-USB (ST-LINK + power) -->
  <g data-a="usb" style="cursor:pointer"><title>CN1 USB mini-B: power + ST-LINK/V2. Click to ${on?'unplug':'plug in'}.</title><rect x="28" y="-2.4" width="9.4" height="6" rx=".6" fill="#b9bcbf" stroke="#555" stroke-width=".2"/>${on?`<rect x="29.8" y="-4" width="5.8" height="2.2" fill="#333"/>`:''}<text x="32.7" y="5.6" font-size="1.6" text-anchor="middle" fill="#e8ece9">CN1</text></g>
  <!-- ST-LINK MCU (STM32F103) + X1 -->
  <rect x="26.7" y="15.5" width="7" height="7" fill="#222" stroke="#666" stroke-width=".2"/><text x="30.2" y="19.4" font-size="1.3" text-anchor="middle" fill="#bbb">F103</text>
  <rect x="21.5" y="17" width="2.6" height="5" rx="1.2" fill="#c8c8c8"/>
  ${led(14.8,7.1, on, D.debug?'#3ddc5a':'#ff4a3d','LD1','LD1 COM: red = idle, green = PC ↔ ST-LINK communication')}
  ${led(39,11.7, on, '#ff4a3d','LD2','LD2 PWR: 3.3 V present')}
  <!-- CN2 SWD -->
  <g><title>CN2 SWD: 1 VDD_TARGET, 2 SWCLK, 3 GND, 4 SWDIO, 5 NRST, 6 SWO</title><rect x="5.1" y="9.8" width="2.6" height="15.6" fill="#111"/>${[0,1,2,3,4,5].map(i=>`<circle cx="6.4" cy="${11.1+i*2.54}" r=".55" fill="#c9b37a"/>`).join('')}<text x="3.2" y="18" font-size="1.7" fill="#e8ece9" transform="rotate(-90 3.2 18)">SWD</text></g>
  <!-- CN3 jumpers -->
  <g data-a="cn3" style="cursor:pointer"><title>CN3 ST-LINK / DISCOVERY selector — click to ${D.cn3?'remove':'fit'} both jumpers</title><rect x="45.4" y="14.6" width="4.6" height="7.6" fill="#111"/>${[0,1].map(i=>`<circle cx="${46.6+i*2.54}" cy="15.9" r=".5" fill="#c9b37a"/><circle cx="${46.6+i*2.54}" cy="20.9" r=".5" fill="#c9b37a"/>${D.cn3?`<rect x="${45.8+i*2.54}" y="15" width="1.7" height="6.8" rx=".3" fill="#2a64d6"/>`:''}`).join('')}<text x="51" y="19" font-size="1.6" fill="#e8ece9">CN3</text><text x="44" y="24.4" font-size="1.25" fill="#e8ece9">${D.cn3?'DISCOVERY':'ST-LINK (ext.)'}</text></g>
  <!-- X2 8 MHz -->
  <g><title>X2 8 MHz crystal → PH0/PH1 (OSC_IN/OSC_OUT). The SK demo assumes 25 MHz.</title><rect x="27.3" y="30.7" width="6" height="2.8" rx="1.4" fill="#d0d0d0" stroke="#777" stroke-width=".15"/><text x="30.3" y="32.6" font-size="1.2" text-anchor="middle" fill="#333">8MHz</text><text x="34.4" y="32.6" font-size="1.3" fill="#e8ece9">X2</text></g>
  <!-- JP1 Idd -->
  <g data-a="jp1" style="cursor:pointer"><title>JP1 Idd: remove to measure MCU current — click to toggle</title><rect x="15.8" y="38.5" width="2.6" height="5" fill="#111"/><circle cx="17.1" cy="39.6" r=".5" fill="#c9b37a"/><circle cx="17.1" cy="42.2" r=".5" fill="#c9b37a"/>${D.jp1?'<rect x="16.3" y="38.9" width="1.6" height="4.2" rx=".3" fill="#2a64d6"/>':''}<text x="15.6" y="45.6" font-size="1.4" fill="#e8ece9">Idd</text></g>
  <!-- U1 STM32F407VGT6 LQFP100 -->
  <g><title>STM32F407VGT6 (LQFP100, 1 MB flash, 192 KB RAM). ${busy? 'Now: '+(is? (is.kind==='tick'?'SysTick ISR (+ tick hook → TIM2 → TIM3)':'EXTI ISR') : sg? sg.name+' (priority '+sg.prio+')':'—') : 'not running the FreeRTOS demo'}</title>
   <rect x="24.6" y="38" width="16" height="16" fill="#333" stroke="#777" stroke-width=".2"/><rect x="25.6" y="39" width="14" height="14" fill="#1b1b1b"/>
   <text x="32.6" y="45" font-size="1.35" text-anchor="middle" fill="#ccc">STM32F407</text><text x="32.6" y="46.8" font-size="1.35" text-anchor="middle" fill="#ccc">VGT6</text>
   ${busy?`<text x="32.6" y="49.6" font-size="1.25" text-anchor="middle" fill="${is?'#ffb43a':'#7dff6a'}">${esc(is? (is.kind==='tick'?'SysTick':'EXTI') : sg? sg.name:'')}</text>`:''}</g>
  <!-- LIS302DL + user LEDs (compass) -->
  <rect x="31.6" y="61.9" width="2" height="2" fill="#222"/><title>LIS302DL accelerometer (SPI1)</title>
  ${led(32.6,59.6, ledOn(1), DLED[1].col,'LD3','LD3 orange — PD13')}
  ${led(29.4,62.9, ledOn(0), DLED[0].col,'LD4','LD4 green — PD12 (R40 510 Ω)')}
  ${led(35.8,62.9, ledOn(2), DLED[2].col,'LD5','LD5 red — PD14')}
  ${led(32.6,66.3, ledOn(3), DLED[3].col,'LD6','LD6 blue — PD15')}
  <!-- B1 / B2 -->
  <g data-a="b1" style="cursor:pointer"><title>B1 USER (PA0, active high). Click or press B.</title><rect x="18" y="60.2" width="5.4" height="5.4" rx=".4" fill="#c0c0c0" stroke="#666" stroke-width=".2"/><circle cx="20.7" cy="62.9" r="1.6" fill="#2a2a2a"/><text x="20.7" y="68" font-size="1.6" text-anchor="middle" fill="#e8ece9">User</text></g>
  <g data-a="b2" style="cursor:pointer"><title>B2 RESET (NRST). Click or press R.</title><rect x="40.6" y="60.2" width="5.4" height="5.4" rx=".4" fill="#c0c0c0" stroke="#666" stroke-width=".2"/><circle cx="43.3" cy="62.9" r="1.6" fill="#2a2a2a"/><text x="43.3" y="68" font-size="1.6" text-anchor="middle" fill="#e8ece9">Reset</text></g>
  <!-- audio + USB OTG -->
  <rect x="24.3" y="72.6" width="5" height="5" fill="#1e1e1e"/><title>CS43L22 audio DAC (I2C1 + I2S3)</title><text x="26.8" y="79.6" font-size="1.2" text-anchor="middle" fill="#e8ece9">CS43L22</text>
  <rect x="41.2" y="80.2" width="2" height="2" fill="#666"/><text x="42.2" y="84" font-size="1.2" text-anchor="middle" fill="#e8ece9">MP45DT02</text>
  <rect x="16.2" y="80" width="5.6" height="15" fill="#2c2c2c" stroke="#555" stroke-width=".2"/><text x="19" y="93" font-size="1.2" text-anchor="middle" fill="#bbb">audio</text>
  <rect x="33.4" y="91.5" width="6" height="4.3" fill="#b9bcbf"/><text x="36.4" y="90.6" font-size="1.3" text-anchor="middle" fill="#e8ece9">CN5 OTG</text>
  ${!on?'<rect x="0" y="0" width="66" height="97" fill="#000" opacity=".35"/><text x="33" y="50" font-size="3.4" text-anchor="middle" fill="#fff">no power — click CN1</text>':''}
  <text x="33" y="99.6" font-size="1.6" text-anchor="middle" fill="var(--ink2)">66 × 97 mm · drawn to scale from UM1472 Fig. 10</text>
  </svg>`;
  return s;
}
function skPanel(t){
  const L=ledsAt(t), on=D.usb;
  return `<div class="small" style="border:1px dashed var(--line);border-radius:8px;padding:10px">
    <b>IAR STM32F407ZG-SK</b> — the board the demo was written for. It is not in the archive (no drawing, no photo), so it is shown as a list. <span class="muted">Source: board/iar_stm32f407zg_sk.h.</span>
    <div style="display:flex;gap:10px;margin:8px 0">${[0,1,2,3].map(i=>`<div style="text-align:center"><div style="width:18px;height:18px;border-radius:50%;margin:auto;background:${on&&!L.dark&&L.v[i]?'#ffb43a':'var(--led-off)'}"></div><span class="mono">LED${i+1}<br>PF${6+i}</span></div>`).join('')}</div>
    <button data-a="b1">USER button (PG6)</button> <button data-a="b2">RESET</button> <span class="muted">HSE 25 MHz · J-Link over SWD</span></div>`;
}
/* ---------- IAR Embedded Workbench window (reconstructed from RTOSDemo.wsdt / .cspy.bat / .dep) ---------- */
function ideHTML(){
  const s=D.src, ck=clockOf(s), dirty = !D.made || !srcEq(D.made, s);
  const f=D.ideFile;
  const files=['main.c','system_stm32f4xx.c','iar_stm32f407zg_sk.h','FreeRTOSConfig.h'];
  const sel=(k,opts)=>`<select data-src="${k}">${opts.map(([v,l])=>`<option value="${v}" ${String(s[k])===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
  const num=(k,w)=>`<input type="number" data-src="${k}" value="${s[k]}" style="width:${w||58}px">`;
  let ed='';
  if (f==='system_stm32f4xx.c') ed = `<div class="muted">/* PLL_VCO = (HSE_VALUE or HSI_VALUE / PLL_M) * PLL_N */</div>
    <div>#define PLL_M &nbsp;${num('pllM')} <span class="muted">stock 25</span></div><div>#define PLL_N &nbsp;${num('pllN')} <span class="muted">stock 300</span></div>
    <div>#define PLL_P &nbsp;${sel('pllP',[[2,'2'],[4,'4'],[6,'6'],[8,'8']])}</div><div>#define PLL_Q &nbsp;${num('pllQ')}</div>
    <div>uint32_t SystemCoreClock = 150000000; <span class="muted">// never updated → configCPU_CLOCK_HZ</span></div>
    <div class="muted" style="margin-top:4px">With the ${ck.hse} MHz crystal on this bench: PLL in ${fmtMHz(ck.pin)}${ck.okIn?'':' ⚠'} · VCO ${fmtMHz(ck.vco)}${ck.okVco?'':' ⚠'} · SYSCLK <b>${fmtMHz(ck.sys)}</b>${ck.okSys?'':' ⚠'} · USB ${fmtMHz(ck.q)}${ck.usbOk?'':' ⚠'} · tick ${us(ck.tick)}</div>`;
  else if (f==='iar_stm32f407zg_sk.h') ed = `<div class="muted">/* board header + ParTest.c xLEDs[] */</div>
    <div>LED1..LED4 pins: ${sel('ledMap',[['sk','GPIOF 6,7,8,9 (stock SK)'],['disc','GPIOD 12,13,14,15 (Discovery LD4,LD3,LD5,LD6)']])}</div>
    <div>BUTTON_USER: ${sel('btnMap',[['sk','PG6 · EXTI_Line6 · EXTI9_5_IRQn (stock)'],['disc','PA0 · EXTI_Line0 · EXTI0_IRQn (Discovery B1)']])}</div>
    <div class="muted" style="margin-top:4px">Discovery remap ${inf}: no edited copy is archived.</div>`;
  else if (f==='main.c') ed = `<div>#define mainCREATE_SIMPLE_LED_FLASHER_DEMO_ONLY 0</div><div>#define mainCHECK_TIMER_PERIOD_MS ( 3000UL / portTICK_RATE_MS )</div>
    <div>xTaskCreate( prvButtonTestTask, "BtnTest", configMINIMAL_STACK_SIZE, NULL, ${sel('btnPrio',[[0,'tskIDLE_PRIORITY'],[1,'tskIDLE_PRIORITY + 1'],[2,'tskIDLE_PRIORITY + 2'],[3,'tskIDLE_PRIORITY + 3'],[4,'tskIDLE_PRIORITY + 4']])}, NULL );</div>
    <div class="muted" style="margin-top:4px">The archived workspace had main.c open with the cursor in prvButtonTestTask (“…block again.”, SelStart 18183).</div>`;
  else ed = `<div>configUSE_PREEMPTION 1 · configTICK_RATE_HZ 1000 · configMAX_PRIORITIES 5</div><div>configCPU_CLOCK_HZ ( SystemCoreClock ) · configTOTAL_HEAP_SIZE 75 × 1024 · heap_2.c</div><div>configUSE_TIMERS 1 · configTIMER_TASK_PRIORITY 2 · configCHECK_FOR_STACK_OVERFLOW 2</div><div>configKERNEL_INTERRUPT_PRIORITY 0xF0 · configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50</div><div class="muted">(read-only here)</div>`;
  return `<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden;font-size:12px">
    <div style="background:var(--chip);padding:4px 8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b>IAR Embedded Workbench IDE 6.0 — RTOSDemo</b>
      <span class="muted">Flash Debug</span><span style="flex:1"></span>
      <button data-a="make">Make${dirty?' •':''}</button><button data-a="download">Download &amp; Debug</button><button data-a="stop" ${D.debug?'':'disabled'}>Stop</button></div>
    <div style="display:grid;grid-template-columns:150px minmax(0,1fr);min-height:160px">
      <div style="border-right:1px solid var(--line);padding:6px;background:var(--panel2)" class="mono small">RTOSDemo<br>├ Common Demo Source<br>├ FreeRTOS_Source<br>├ STM32F4xx_StdPeriph_Driver<br>├ modules<br>${files.map(x=>`├ <a href="#" data-file="${x}" style="color:${x===f?'var(--accent)':'inherit'}">${x}</a>`).join('<br>')}
        <div style="margin-top:8px" class="small">Device:<br><select data-dev><option ${D.device==='STM32F4xxx'?'selected':''}>STM32F4xxx</option><option ${D.device==='STM32F407VG'?'selected':''}>STM32F407VG</option></select>
        Driver:<br><select data-drv><option value="jlink" ${D.driver==='jlink'?'selected':''}>J-Link/J-Trace</option><option value="stlink" ${D.driver==='stlink'?'selected':''}>ST-LINK</option></select></div></div>
      <div style="padding:6px 8px" class="mono small"><div class="muted" style="margin-bottom:4px">${f}${dirty?' — modified since last Make':''}</div>${ed}</div>
    </div>
    <div style="border-top:1px solid var(--line);padding:4px 8px" class="small">Bench: <select data-board><option value="disc" ${D.board==='disc'?'selected':''}>STM32F4DISCOVERY (MB997)</option><option value="sk" ${D.board==='sk'?'selected':''}>IAR STM32F407ZG-SK (demo’s own board)</option></select>
      · image in flash: <b>${D.img.kind==='factory'?'ST factory demo':'RTOSDemo (PLL_M '+D.img.pllM+', LEDs '+(D.img.ledMap==='disc'?'PD':'PF')+', BtnTest prio '+D.img.btnPrio+')'}</b> · C-SPY ${D.debug?'<b style="color:var(--accent)">running</b>':'idle'}</div></div>`;
}
function bindAll(root){
  const map={b1:()=>A.pressB1(), b2:()=>A.reset(), usb:()=>A.usb(), cn3:()=>A.cn3(), jp1:()=>A.jp1(), make:()=>A.make(), download:()=>A.download(), stop:()=>A.stop(), fault:()=>A.fault(), clr:()=>A.clearPresses()};
  root.querySelectorAll('[data-a]').forEach(el=>{ el.onclick=e=>{ e.preventDefault(); const k=el.dataset.a; if (map[k]) map[k](); else if (A[k]) A[k](el.dataset.v, el.dataset.w); }; });
  root.querySelectorAll('[data-src]').forEach(el=>{ el.onchange=()=>A.setSrc(el.dataset.src, el.value); });
  root.querySelectorAll('[data-file]').forEach(el=>{ el.onclick=e=>{ e.preventDefault(); A.ideFile(el.dataset.file); }; });
  root.querySelectorAll('[data-dev]').forEach(el=>{ el.onchange=()=>A.device(el.value); });
  root.querySelectorAll('[data-drv]').forEach(el=>{ el.onchange=()=>A.driver(el.value); });
  root.querySelectorAll('[data-board]').forEach(el=>{ el.onchange=()=>A.board(el.value); });
}
document.addEventListener('keydown', e=>{
  if (!window.__rd70Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(); if (k==='b'){ A.pressB1(); e.preventDefault(); } else if (k==='r'){ A.reset(); e.preventDefault(); }
});

/* =====================================================================
   8. TIMELINE LANES
   ===================================================================== */
function txt(c,s,x,y){ c.font='10.5px '+css('--mono'); c.fillText(s,x,y); }
function prioCol(p){ return css(['--accent','--accent2','--warn','--bad','--play'][p]); }
function lanes(){
  const S=sim(), L=[];
  const fill=(c,X,a,b,y,h,col,al)=>{ c.globalAlpha=al==null?1:al; c.fillStyle=col; c.fillRect(X(a),y,Math.max(0.7,X(b)-X(a)),h); c.globalAlpha=1; };
  L.push({label:'SysTick (tick ISR)', h:24, draw(c,X,t0,t1,y,h){
    S.runs.forEach(r=>{ if (r.boot){ fill(c,X,r.t0,r.t1,y+3,h-6,css('--warn'),.5); return; } if (!r.img || r.img.kind!=='rtos'){ if (r.t1>t0 && r.t0<t1){ c.fillStyle=css('--ink2'); txt(c, r.off?'no power':'ST factory demo image — not FreeRTOS', Math.max(X(r.t0),X(t0))+6, y+h/2+4); } return; }
      const a=Math.max(t0,r.t0), b=Math.min(t1,r.t1); if (b<=a) return;
      SIM.pulses(c,X,a,b,y,h,r.Tt,r.epoch,COST.isr*r.ck.scale,css('--ink2'),'SysTick @ '+us(r.Tt)); });
  }});
  L.push({label:'ISRs: tick hook TIM2→TIM3 · EXTI', h:22, draw(c,X,t0,t1,y,h){
    const span=t1-t0; S.isr.forEach(e=>{ if (e.t1<t0||e.t0>t1) return; if (e.kind==='tick' && span>0.02) return; fill(c,X,e.t0,e.t1,y+3,h-6, e.kind==='exti'?css('--play'):css('--warn')); if (e.kind==='tick' && X(e.t1)-X(e.t0)>60){ c.fillStyle=css('--ink'); txt(c,'SysTick→vApplicationTickHook→TIM2→TIM3',X(e.t0)+2,y+h-6); } });
    if (span>0.02){ S.isr.filter(e=>e.kind==='exti'&&e.t0>=t0&&e.t0<=t1).forEach(e=>{ c.fillStyle=css('--play'); c.fillRect(X(e.t0)-1,y+2,3,h-4); c.fillStyle=css('--ink'); txt(c,'EXTI',X(e.t0)+4,y+h-6); }); c.fillStyle=css('--ink2'); txt(c,'zoom to ≤ 20 ms to see the per-tick ISRs', X(t0)+50, y+h/2+4); }
  }});
  [3,2,1,0].forEach(p=>L.push({label:`Tasks at priority ${p}${p===0?' (idle level)':''}`, h:p===0?32:26, draw(c,X,t0,t1,y,h){
    let lastX=-99; S.segs.forEach(s=>{ if (s.prio!==p || s.t1<t0 || s.t0>t1) return; const xa=X(s.t0), xb=X(s.t1);
      const hue = s.name==='BtnTest'? css('--play') : s.name==='IDLE'? css('--ink2') : prioCol(p);
      c.globalAlpha = (s.k%2)? .6 : .95; c.fillStyle=hue; c.fillRect(xa,y+3,Math.max(0.8,xb-xa),h-6); c.globalAlpha=1;
      if (xb-xa>34 && xa>lastX+4){ c.fillStyle='#fff'; txt(c,s.name,xa+2,y+h/2+4); lastX=xa+c.measureText(s.name).width; } });
  }}));
  L.push({label:'User LEDs (board pins)', h:30, draw(c,X,t0,t1,y,h){
    const N=Math.min(600, Math.max(60, Math.round(X(t1)-X(t0)))); const rh=(h-4)/4;
    for (let i=0;i<4;i++){ let prev=null, xa=X(t0);
      for (let j=0;j<=N;j++){ const tt=t0+(t1-t0)*j/N; const Lv=ledsAt(tt); const v=!Lv.dark && Lv.v[i] && D.usb; if (prev===null) prev=v;
        if (v!==prev || j===N){ const xb=X(tt); if (prev){ c.fillStyle=D.board==='disc'?DLED[i].col:'#ffb43a'; c.fillRect(xa,y+2+i*rh,xb-xa,rh-1); } xa=xb; prev=v; } } }
    const Lv=ledsAt(SIM.t); if (Lv.dark){ c.fillStyle=css('--ink2'); txt(c,'dark: '+Lv.why, X(t0)+6, y+h/2+4); }
  }});
  L.push({label:'B1 press → BtnTest runs', h:30, draw(c,X,t0,t1,y,h){
    S.btn.forEach(b=>{ if (b.t<t0-0.05||b.t>t1) return; c.fillStyle=css('--play'); c.fillRect(X(b.t)-1,y+2,3,h-4);
      if (!b.wired){ c.fillStyle=css('--ink'); txt(c,'press: no EXTI on this pin',X(b.t)+4,y+12); return; }
      if (b.start!=null){ c.strokeStyle=css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(X(b.t),y+h-8); c.lineTo(X(b.start),y+h-8); c.stroke(); c.lineWidth=1; c.fillStyle=css('--ink'); txt(c,`${us(b.start-b.t)} (prio ${b.prio})`,X(b.t)+4,y+12); }
      else { c.fillStyle=css('--ink'); txt(c, b.note? 'merged' : 'not served in window', X(b.t)+4, y+12); } });
    if (!S.btn.length){ c.fillStyle=css('--ink2'); txt(c,'click B1 (or press B) at the playhead',X(t0)+6,y+h/2+4); }
  }});
  const loopLane=(Lm,label)=>({label, h:28, draw(c,X,t0,t1,y,h){
    const pw=X(t0+Lm.loop)-X(t0);
    if (pw<3){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); txt(c,`${Math.round((t1-t0)/Lm.loop).toLocaleString()} passes of while(1) (${us(Lm.loop)} each, inferred)`, X(t0)+6, y+h/2+4); }
    else for (let n=Math.floor(t0/Lm.loop); n*Lm.loop<=t1; n++){ const a=n*Lm.loop; c.fillStyle=css('--accent'); c.globalAlpha=n%2?.45:.75; c.fillRect(X(a),y+4,Math.max(1,pw-1),h-8); c.globalAlpha=1;
      c.fillStyle=css('--accent2'); c.fillRect(X(a+Lm.pick*Lm.loop),y+4,Math.max(1,pw*0.06),h-8); if (pw>70){ c.fillStyle='#fff'; txt(c,'pass '+n, X(a)+3, y+h/2+4); } }
    S.btn.concat(D.presses.filter(p=>!S.btn.find(b=>b.t===p)).map(p=>({t:p}))).forEach(b=>{ if (b.t<t0-0.05||b.t>t1) return; const p=loopPick(Lm,b.t); c.fillStyle=css('--play'); c.fillRect(X(b.t)-1,y+2,3,h-4); c.strokeStyle=css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(X(b.t),y+h-5); c.lineTo(X(p.tp),y+h-5); c.stroke(); c.lineWidth=1; c.fillStyle=css('--ink'); txt(c,us(p.tp-b.t)+' → '+Lm.pickName, X(b.t)+4, y+11); });
  }});
  L.push(loopLane(POD33,'WBS super-loop: POD33 (ATmega128 8 MHz)'));
  L.push(loopLane(AMS82,'WBS super-loop: AMS8-2 front panel'));
  L.push({label:'Ross gearos (M6205 3G)', h:28, draw(c,X,t0,t1,y,h){
    for (let n=Math.max(0,Math.floor((t0-GEAROS.phase)/GEAROS.period)); GEAROS.phase+n*GEAROS.period<=t1; n++){ const a=GEAROS.phase+n*GEAROS.period; fill(c,X,a,a+GEAROS.len,y+4,h-8,css('--accent2'),.85); if (X(a+GEAROS.len)-X(a)>50){ c.fillStyle='#fff'; txt(c,'appTask',X(a)+2,y+h/2+4); } }
    if (0.3207>=t0&&0.3207<=t1) fill(c,X,0.3207,0.3247,y+4,h-8,css('--warn'));
    S.btn.concat(D.presses.filter(p=>!S.btn.find(b=>b.t===p)).map(p=>({t:p}))).forEach(b=>{ if (b.t<t0-0.05||b.t>t1) return; const g=gearPick(b.t); c.fillStyle=css('--play'); c.fillRect(X(b.t)-1,y+2,3,h-4); c.strokeStyle=css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(X(b.t),y+h-5); c.lineTo(X(g.tp),y+h-5); c.stroke(); c.lineWidth=1; c.fillStyle=css('--ink'); txt(c,us(g.tp-b.t)+' → next appTask', X(b.t)+4, y+11); });
  }});
  return L;
}

/* =====================================================================
   9. VIEWS
   ===================================================================== */
function inspectorHTML(t){
  const r=runAt(t), S=sim();
  if (!D.usb) return '<p class="muted">The board is unpowered.</p>';
  if (r.boot) return `<p>In reset → SystemInit → main() (boot ${us(BOOT_T)}, ${inf}).</p>`;
  if (!r.img || r.img.kind!=='rtos') return `<p>Running the ST factory demo (the image the Discovery ships with, UM1472 §2.2). Use <b>Download &amp; Debug</b> to load the FreeRTOS demo.</p>`;
  const ck=r.ck, k=Math.floor((t-r.epoch)/r.Tt), ts=r.epoch+k*r.Tt, val=Math.max(0,Math.round(RELOAD-(t-ts)/r.Tt*(RELOAD+1)));
  const sg=segAt(t), is=isrAt(t), R=readyAt(t), Lv=ledsAt(t);
  const cnt=S.btn.filter(b=>b.wired && b.img===r.img && b.start!=null && b.start<=t).length;
  return `<table class="kv">
    <tr><th>xTickCount</th><td class="mono">${k.toLocaleString()} <span class="muted">(${r.epoch<0?'seconds 2.5–3.5 after start':'since the reset'})</span></td></tr>
    <tr><th>SysTick</th><td class="mono">LOAD ${RELOAD} · VAL ${val} · period ${us(r.Tt)} @ SYSCLK ${fmtMHz(ck.sys)}</td></tr>
    <tr><th>CPU is in</th><td class="mono">${is? (is.kind==='tick'?'<b style="color:var(--warn)">xPortSysTickHandler</b> → vTaskIncrementTick → tick hook → TIM2 → TIM3':'<b style="color:var(--play)">EXTI ISR</b> → xSemaphoreGiveFromISR') : sg? `<b>${esc(sg.name)}</b> (priority ${sg.prio}${sg.kind==='busy'?', always ready':sg.kind==='yield'?', yields':''})` : 'PendSV / context switch'}</td></tr>
    <tr><th>pxReadyTasksLists</th><td class="mono small">${R? [4,3,2,1,0].map(p=>`[${p}] ${R.ready[p].length? R.ready[p].map(esc).join(' · '):'—'}`).join('<br>'):''}</td></tr>
    <tr><th>Blocked</th><td class="mono small">${R? R.blocked.map(esc).join(' · '):''}</td></tr>
    <tr><th>User LEDs</th><td class="mono">${D.board==='disc'? DLED.map((d,i)=>`${d.ld} ${Lv.v[i]&&!Lv.dark?'●':'○'}`).join(' '):[0,1,2,3].map(i=>`LED${i+1} ${Lv.v[i]&&!Lv.dark?'●':'○'}`).join(' ')}${Lv.dark?` <span class="muted">(${Lv.why})</span>`:''}</td></tr>
    <tr><th>ulButtonPressCounts</th><td class="mono">${cnt} <span class="muted">(this window)</span></td></tr>
    <tr><th>ulMaxFPUInterruptNesting</th><td class="mono">3 (tick hook → TIM2 → TIM3, every tick)</td></tr>
  </table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${esc(D.log[0].name)}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click B1/B2, CN1, CN3, JP1 on the board, or Make / Download in the IDE. Each step the firmware and tools take is listed here.</div>'; }
function pressTable(){
  const S=sim(); const rows=D.presses.map(p=>{ const b=S.btn.find(x=>x.t===p); const P=loopPick(POD33,p), Am=loopPick(AMS82,p), G=gearPick(p);
    const rt = !b? 'board off / in reset' : !b.wired? 'no interrupt (pin not wired in this image)' : b.start!=null? us(b.start-b.t)+' (prio '+b.prio+')' : (b.note?'merged':'after this second');
    return `<tr><td class="mono">${SIM.fmtT(p)}</td><td class="mono">${rt}</td><td class="mono">${us(P.tp-p)}</td><td class="mono">${us(Am.tp-p)}</td><td class="mono">${us(G.tp-p)}</td></tr>`; }).join('');
  return `<table class="kv"><tr><th>B1 at</th><th>FreeRTOS BtnTest</th><th>POD33 loop</th><th>AMS8-2 loop</th><th>gearos</th></tr>${rows||'<tr><td colspan="5" class="muted">No presses yet.</td></tr>'}</table>
  <p class="small muted">Latency = from the press to the code that reads it. Super-loop and gearos pass times are ${inf} in the sister plugins (pod33.js, ams82.js, m6205.js); kernel costs are ${inf} cycle estimates.</p>`;
}
function viewSim(m){
  window.__rd70Active=true;
  m.innerHTML = `<div class="grid2">
   <div>${card('STM32F4DISCOVERY (MB997) on the bench — click B1, B2, CN1, CN3, JP1', `<div id="bd"></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button data-a="b1">B1 USER (B)</button><button data-a="b2">B2 RESET (R)</button><button data-a="fault">Inject demo-task error</button><button data-a="clr">Clear presses</button></div>`)}
        ${card('IAR Embedded Workbench — CORTEX_M4F_STM32F407ZG-SK/RTOSDemo.eww', `<div id="ide"></div>`)}</div>
   <div>${card('At the playhead (as the kernel sees it)', `<div id="insp"></div>`)}${card('What the firmware and tools did', `<div id="trace" class="log"></div>`)}${card('The same button press, four ways', `<div id="pt"></div>`)}</div></div>
   ${card('Timeline — FreeRTOS V7.4.2 demo tick by tick, beside the WBS super-loops', `<canvas id="tl"></canvas><p class="small muted">Click the timeline to move the playhead. Use the zoom menu (1 tick = 1 ms when the clock is right) and <b>Step</b> by one tick. Task bursts and kernel costs are ${inf}; priorities, periods and list order come from the demo source.</p>`)}`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(t); m.querySelector('#ide').innerHTML=ideHTML();
    m.querySelector('#insp').innerHTML=inspectorHTML(t); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#pt').innerHTML=pressTable();
    bindAll(m.querySelector('#bd')); bindAll(m.querySelector('#ide'));
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  bindAll(m.querySelector('.grid2'));
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
function candPick(level){ const opts={low:['STM32F100VBT6B','MK20DX128VLH7','ATXMEGA128A3-AU'], mid:['STM32F103VBT6','MK20DX128VLL7','STM32F205VCT6'], high:['STM32F407VET6','MK60DN256ZVLL10','STM32F207VCT6']}[level];
  return opts.map(p=>`<button data-a="tier" data-v="${level}" data-w="${p}" class="${D.tier[level]===p?'on':''}">${p}</button>`).join(' '); }
const LESSONS = [
  {title:'RD70 · New Micro-Controller', body:()=>`<p>The R&amp;D register lists <b>RD70 “New Micro-Controller”</b>, priority <b>A</b>, person <b>“All”</b>, never marked complete. Every WBS front panel and card controller of the time was an <b>ATmega128</b> running one big <span class="mono">while(1)</span> loop (see the POD33 and AMS8-2 plugins). The aim in May ${Y(2013)} was a 32-bit ARM part with room for Ethernet and AVB.</p><p>You are the engineer. Over the next steps you will narrow the parts, pick a core and a toolchain, then bring up FreeRTOS on a dev board, which is exactly what the files show was done.</p><p class="muted">“Start over” puts the bench back as the archive suggests it was: Discovery board with its factory demo, stock FreeRTOS download, IAR settings from the download.</p>`, check:()=>true, auto:true},
  {title:'1 · Fill the three tiers', body:()=>`<p>After the 22 May meeting with the Arrow FAE (Research Notes.docx), the part-by-part sheet compares 14 parts. Its last three columns sit under a header <b>“Final Decision: Low (Basic) · Mid (CAN, USB) · High (Ethernet)”</b>.</p><p>Low: ${candPick('low')}</p><p>Mid: ${candPick('mid')}</p><p>High: ${candPick('high')}</p><p><b>Goal:</b> pick the three parts the sheet actually put under that header (one pin-compatible LQFP-100 family).</p>`, check:()=>D.tier.low==='STM32F100VBT6B'&&D.tier.mid==='STM32F103VBT6'&&D.tier.high==='STM32F407VET6', hint:'The notes say “ST: pin compatible b/w families”. All three are STM32 VBT6/VET6 parts in LQFP-100.'},
  {title:'2 · Which core?', body:()=>`<p>ARM Cortex-M Comparison.doc tabulates the cores. The AVRs had no hardware divide and no floating point; WBS metering, loudness and ballistics code does a lot of both on the SHARC.</p><p>${CORES.map(c=>`<button data-a="core" data-v="${c.id}" class="${D.core===c.id?'on':''}">Cortex-${c.id}</button>`).join(' ')}</p><p><b>Goal:</b> choose the core of the High tier part (DSP instructions <i>and</i> an FPU).</p>`, check:()=>D.core==='M4F', hint:'STM32F407 = Cortex-M4 with FPU.'},
  {title:'3 · Choose a toolchain', body:()=>`<p>Arrow quoted both (Tools quote.docx, 4 June ${Y(2013)}): ${['IAR','Keil'].map(k=>`<button data-a="tool" data-v="${k}" class="${D.tool===k?'on':''}">${TOOLS[k].name}</button>`).join(' ')}</p><p>The FAE recommended IAR. The archive shows which one was really installed: the FreeRTOS demo’s settings were rewritten by <span class="mono">C:\\Program Files\\IAR Systems\\Embedded Workbench 6.0</span>.</p><p><b>Goal:</b> pick the toolchain that was used.</p>`, check:()=>D.tool==='IAR', hint:'IAR EWARM.'},
  {title:'4 · Open the FreeRTOS demo', body:()=>`<p>FreeRTOS V7.4.2 was downloaded on 30 May ${Y(2013)} at 07:48. Its STM32F4 demo is <span class="mono">CORTEX_M4F_STM32F407ZG-SK</span>, written for IAR’s own STM32F407ZG-SK board, not for the Discovery on the bench.</p><p>In the IDE (right), set <b>Device</b> to the Discovery’s chip, as the archived <span class="mono">RTOSDemo.cspy.bat</span> shows was done (<span class="mono">--device=STM32F407VG</span>).</p><p><b>Goal:</b> Device = STM32F407VG.</p>`, check:()=>D.device==='STM32F407VG', hint:'Use the Device menu in the IDE’s left column.'},
  {title:'5 · Make', body:()=>`<p>Press <b>Make</b>. IAR compiles about 40 files: the kernel (tasks.c, queue.c, list.c, timers.c, port.c), the “Common Demo Source” test tasks, the ST standard peripheral library and the SK board file. The archived <span class="mono">RTOSDemo.dep</span> (13:47, 30 May) is the trace of this build.</p><p><b>Goal:</b> a successful build.</p>`, check:()=>!!D.made, hint:'Click Make in the IDE toolbar.'},
  {title:'6 · Download and debug', body:()=>`<p>Press <b>Download &amp; Debug</b>. The archived session used the <b>J-Link</b> driver over SWD. The Discovery has an <b>ST-LINK/V2</b> on board (and CN3 must be fitted for it to reach the on-board MCU).</p><p><b>Goal:</b> the FreeRTOS demo is in the Discovery’s flash.</p>`, check:()=>D.img.kind==='rtos', hint:'Try it with J-Link first and read the log, then set Driver = ST-LINK and download again.'},
  {title:'7 · Nothing blinks', body:()=>`<p>The demo runs, but no LED lights. Look at the timeline at 10 ms zoom: the SysTick comes every <b>${us(clockOf(STOCK).tick)}</b>, not 1 ms.</p><ul><li><b>Clock:</b> system_stm32f4xx.c assumes a 25 MHz crystal (PLL_M 25 → 150 MHz). The Discovery has 8 MHz: 8/25 = 0.32 MHz PLL input and a 96 MHz VCO, both below the datasheet limits; SYSCLK becomes 48 MHz, while FreeRTOS still loads SysTick for 150 MHz.</li><li><b>Pins:</b> ParTest.c drives PF6–PF9 and the button is PG6. Ports F and G are not bonded out on the 100-pin STM32F407VG.</li></ul><p><b>Goal:</b> set the zoom to 10 ms or less and look at the tick spacing.</p>`, check:()=>SIM.win<=0.0101, hint:'Use the zoom menu in the transport bar.'},
  {title:'8 · Fix the clock', body:()=>`<p>Open <span class="mono">system_stm32f4xx.c</span> in the IDE and change <b>PLL_M</b> so that 8 MHz / PLL_M = 1 MHz. With PLL_N 300 and PLL_P 2 that gives 150 MHz, which matches <span class="mono">SystemCoreClock</span>. Make, then Download.</p><p class="muted">(PLL_N 336 gives the full 168 MHz and a clean 48 MHz USB clock, but then FreeRTOS, still told 150 MHz, ticks every 0.89 ms.)</p><p><b>Goal:</b> the running image ticks at exactly 1 ms.</p>`, check:()=>D.img.kind==='rtos' && Math.abs(clockOf(D.img).tick-1e-3)<1e-6, hint:'PLL_M = 8, then Make and Download & Debug.'},
  {title:'9 · Point the LEDs and button at the Discovery', body:()=>`<p>Open <span class="mono">iar_stm32f407zg_sk.h</span>: move the LEDs to GPIOD 12–15 (LD4 green, LD3 orange, LD5 red, LD6 blue) and the user button to PA0 / EXTI0 (B1). ${inf}: the archive keeps no edited copy, so this step is how the port <i>would</i> have gone.</p><p><b>Goal:</b> the running image uses the Discovery’s LEDs and button. Watch three LEDs flash at 166, 333 and 499 ms (flash.c).</p>`, check:()=>D.img.kind==='rtos'&&D.img.ledMap==='disc'&&D.img.btnMap==='disc', hint:'Change both menus, Make, Download.'},
  {title:'10 · Press B1 — and wait', body:()=>`<p>Move the playhead somewhere, then press <b>B1</b>. The EXTI handler gives <span class="mono">xTestSemaphore</span>; <span class="mono">prvButtonTestTask</span> takes it and counts the press.</p><p>BtnTest has <b>priority 0</b>, the same as Reg1, Reg2, IntMath and Math1–8, which never block. <span class="mono">vListInsertEnd</span> puts the woken task at the <i>end</i> of the round robin, so it waits for every busy idle-priority task to get its 1 ms slice. Read the latency in the table.</p><p><b>Goal:</b> one press served with BtnTest at priority 0.</p>`, check:()=>sim().btn.some(b=>b.wired&&b.prio===0&&b.start!=null), hint:'Press B (or click B1) while the playhead is before 0.98 s.'},
  {title:'11 · Give the button a priority', body:()=>`<p>In <span class="mono">main.c</span>, create BtnTest at <b>tskIDLE_PRIORITY + 3</b>. Make, Download, press B1 again. Now <span class="mono">lHigherPriorityTaskWoken</span> is pdTRUE, <span class="mono">portEND_SWITCHING_ISR</span> pends PendSV, and the task runs straight after the ISR.</p><p>This is what an RTOS buys over a super-loop: response set by <b>priority</b>, not by where the loop happens to be.</p><p><b>Goal:</b> a press served in under 50 µs.</p>`, check:()=>sim().btn.some(b=>b.wired&&b.start!=null&&b.start-b.t<50e-6), hint:'main.c → BtnTest priority +3, Make, Download, press B.'},
  {title:'12 · Compare with what WBS shipped', body:()=>`<p>Look at the last three timeline lanes. The same press on the <b>POD33</b> ATmega128 loop waits up to one 1.67 ms pass (longer when LMH1981_VIDEO_DETECT stalls on vertical sync); on the <b>AMS8-2</b> panel up to 0.33 ms; on the Ross <b>gearos</b> co-operative scheduler of the 3G M6205 up to 40 ms, because inputs are read in appTask.</p><p>The super-loop is predictable and tiny; its cost is that every added job lengthens every pass. The archive README calls this “fragility under change”.</p>`, check:()=>true, auto:true},
  {title:'13 · Watch the self-check', body:()=>`<p>The demo checks itself: <span class="mono">prvCheckTimerCallback</span> runs every 3 s in the timer service task and toggles the check LED. If any test task reports an error, it shortens its own period to 200 ms, so the LED flashes fast.</p><p>Put the playhead before 0.5 s and press <b>Inject demo-task error</b> (Simulator tab or here). After the callback at 0.5 s, LD6 (blue) toggles every 200 ms.</p><p><b>Goal:</b> an error reported by the check timer.</p>`, check:()=>sim().cb.some(c=>c.err), hint:'Seek to 0.2 s, click Inject.', extra:'<button data-a="fault">Inject demo-task error</button>'},
  {title:'What came after', body:()=>`<p>No RD70 product firmware exists. What the evaluation fed into:</p><ul><li><b>RD67 POD30 3G</b>: the Altium project carries <span class="mono">Sheet9/10-STM32Micro.SchDoc</span> next to an Atmel sheet. The choice is not recorded.</li><li><b>RD71 Touch display</b>: a BeagleBone Black, i.e. the TI AM3358 that Arrow quoted in June ${Y(2013)}.</li><li><b>RD79 AVB</b>: went to XMOS, not to an ARM MCU.</li><li><b>RD88 PREmo</b> (${Y(2016)}–${Y(2017)}): the first WBS product firmware on STM32, an <b>STM32F070</b> (Cortex-M0, 48 MHz) with STM32CubeMX HAL and System Workbench — free tools, a super-loop with HAL interrupt callbacks, and <b>no RTOS</b>. See the PREmo plugin.</li></ul><p>So the STM32 family won; IAR and FreeRTOS did not.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__rd70Active=true;
  if (!D.tutReset){ asFound(); D.tutReset=true; lessonIdx=0; }
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — the RD70 evaluation, step by step', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware and tools did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The bench', `<div id="bd"></div><div style="display:flex;gap:6px;margin-top:6px"><button data-a="b1">B1 USER (B)</button><button data-a="b2">B2 RESET (R)</button></div>`)}${card('IAR Embedded Workbench', `<div id="ide"></div>`)}${card('Latencies', `<div id="pt"></div>`)}</div></div>
    ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(t); m.querySelector('#ide').innerHTML=ideHTML(); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#pt').innerHTML=pressTable();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${(!l.auto&&l.check())?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body()}${L.extra||''}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (as found in the archive)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ asFound(); lessonIdx=0; SIM.refresh(); };
    bindAll(m.querySelector('#lesson')); bindAll(m.querySelector('#bd')); bindAll(m.querySelector('#ide'));
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  bindAll(m.querySelector('.grid2'));
  SIM.on('time', draw);
}

/* ---------------- one second, tick by tick ---------------- */
function viewSecond(m){
  window.__rd70Active=true;
  m.innerHTML=`${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As the kernel sees it', `<div id="insp"></div>`)}${card('As the board shows it', `<div id="bd"></div>`)}</div>
   ${card('Zoom ladder at the playhead — who has the CPU', `<canvas id="zl"></canvas>`)}
   ${card('CPU budget per candidate (cycles available)', `<div id="bud"></div>`)}`;
  const draw=()=>{ const t=SIM.t, S=sim(), r=runAt(t);
    const rt = r && r.img && r.img.kind==='rtos' ? r : S.runs.find(x=>x.img&&x.img.kind==='rtos');
    const segs=S.segs.filter(s=>s.t0>=0&&s.t0<1);
    const byP=[0,1,2,3].map(p=>segs.filter(s=>s.prio===p).reduce((a,s)=>a+(s.t1-s.t0),0));
    const isrT=S.isr.filter(e=>e.t0>=0&&e.t0<1).reduce((a,e)=>a+(e.t1-e.t0),0);
    const runsOf=n=>{ let c=0,last=null; segs.forEach(s=>{ if (s.name===n && s!==last){ c++; } }); return c; };
    const rows = rt? [
      ['SysTick interrupts', Math.round(1/rt.Tt).toLocaleString(), us(rt.Tt), 'xPortSysTickHandler → vTaskIncrementTick; PendSV every tick (preemption on)'],
      ['Tick-hook nested ISRs (TIM2, TIM3)', (2*Math.round(1/rt.Tt)).toLocaleString(), us(rt.Tt), 'vApplicationTickHook fills the FPU registers, pends TIM2, which pends TIM3: tests lazy FPU stacking'],
      ['Context switches (PendSV)', S.ctx.filter(c=>c.t>=0&&c.t<1).length.toLocaleString(), '', 'vTaskSwitchContext → taskSELECT_HIGHEST_PRIORITY_TASK'],
      ['Priority 3 / 2 / 1 CPU time', byP.slice(1).reverse().map(us).join(' / '), '', 'CREATOR+SUICIDx / Tmr Svc, PollQ, Rec1 / LEDx, BlkSEM'],
      ['Priority 0 CPU time', us(byP[0]), '', '13 busy test tasks + yielders + IDLE share it round robin'],
      ['ISR time', us(isrT), '', 'SysTick + tick hook + EXTI ('+inf+' costs)'],
      ['LED toggles (3 flash tasks)', S.led.filter(e=>e.t>=0&&e.t<1&&e.led<3).length, '166 / 333 / 499 ticks', 'flash.c vTaskDelayUntil'],
      ['Check-timer callbacks', S.cb.filter(e=>e.t>=0&&e.t<1).length, '3000 ticks (200 on error)', 'prvCheckTimerCallback in Tmr Svc'],
      ['POD33 loop passes', '≈ 600 '+inf, us(POD33.loop), 'WBS super-loop, no timer interrupts (TIMSK = 0)'],
      ['AMS8-2 front-panel passes', '≈ 3,000 '+inf, us(AMS82.loop), 'WBS super-loop; UART0 RX is the only interrupt'],
      ['gearos appTask runs (M6205 3G)', '25', '40 ms', 'Ross zeuslib co-operative scheduler'],
    ] : [];
    m.querySelector('#ladder').innerHTML = rt? `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table><p class="small muted">SYSCLK ${fmtMHz(rt.ck.sys)} · tick ${us(rt.Tt)}. Use <b>Step</b> → “1 tick” to walk the kernel one SysTick at a time.</p>` : '<p class="muted">Load the FreeRTOS demo (Simulator or Tutorial) to see the kernel second.</p>';
    m.querySelector('#insp').innerHTML=inspectorHTML(t); m.querySelector('#bd').innerHTML=boardSVG(t); bindAll(m.querySelector('#bd'));
    // zoom ladder
    const lv=[['1 second',1],['100 ms',0.1],['1 tick',rt?rt.Tt:1e-3],['20 µs',20e-6]];
    const H=lv.length*40+8, {c,w}=SIM.canvas(m.querySelector('#zl'),H);
    lv.forEach(([nm,span],i)=>{ const y=6+i*40, x0=120, pw=w-x0-8, a=Math.max(0,Math.min(1-span,t-span/2));
      c.fillStyle=css('--ink'); c.font='12px sans-serif'; c.fillText(nm,6,y+18); c.strokeStyle=css('--grid'); c.strokeRect(x0,y,pw,30);
      S.segs.forEach(s=>{ if (s.t1<a||s.t0>a+span) return; const xa=x0+(Math.max(s.t0,a)-a)/span*pw, xb=x0+(Math.min(s.t1,a+span)-a)/span*pw; c.fillStyle=s.name==='BtnTest'?css('--play'):prioCol(s.prio); c.globalAlpha=s.k%2?.55:.9; c.fillRect(xa,y+2+(3-s.prio)*6.5,Math.max(.6,xb-xa),6); c.globalAlpha=1; if (xb-xa>40){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(s.name,xa+2,y+29); } });
      S.isr.forEach(e=>{ if (e.t1<a||e.t0>a+span) return; const xa=x0+(e.t0-a)/span*pw; c.fillStyle=e.kind==='exti'?css('--play'):css('--warn'); c.fillRect(xa,y,Math.max(1,(e.t1-e.t0)/span*pw),3); });
      const px=x0+(t-a)/span*pw; c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(px,y-2); c.lineTo(px,y+32); c.stroke(); });
    // budget
    m.querySelector('#bud').innerHTML=`<table class="kv"><tr><th>Part (sheet)</th><th>MHz</th><th>cycles per 1 ms tick</th><th>cycles per POD33 pass (1.67 ms)</th><th>tier</th></tr>${CANDS.map(x=>`<tr><td class="mono">${x.p}</td><td class="mono">${x.mhz}${x.mhzInf?' '+inf:''}</td><td class="mono">${(x.mhz*1000).toLocaleString()}</td><td class="mono">${Math.round(x.mhz*1e6*POD33.loop).toLocaleString()}</td><td>${x.tier||''}</td></tr>`).join('')}</table><p class="small muted">The ATmega128 in the POD33 has 13,333 cycles per pass at 8 MHz. Cortex-M parts do more per cycle (32-bit ALU, single-cycle multiply), so the real gap is larger than the clock ratio ${inf}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  stlink:{x:20,y:20,w:180,h:70,t:'ST-LINK/V2 (STM32F103)',s:['USB CN1 ↔ SWD','CN3: on-board / CN2'],d:'The Discovery’s built-in programmer/debugger. With both CN3 jumpers fitted it drives the STM32F407’s SWD pins (PA13 SWDIO, PA14 SWCLK) and NRST; with them removed it drives the 6-pin CN2 for an external board (UM1472 Table 2/3). The archived IAR session was set to the J-Link driver instead.'},
  mcu:{x:250,y:20,w:220,h:150,t:'STM32F407VGT6',s:['Cortex-M4F 168 MHz max','1 MB flash · 192 KB RAM','SysTick → FreeRTOS tick','NVIC: 4 priority bits','EXTI0 ← PA0'],d:'The High-tier family member (the sheet lists the VET6: 512 KB / 196 KB). FreeRTOS uses SysTick for the tick and PendSV for context switches, both at the lowest priority (configKERNEL_INTERRUPT_PRIORITY 0xF0). ISRs above configMAX_SYSCALL_INTERRUPT_PRIORITY (0x50) — the demo’s TIM2/TIM3 — must not call the API.'},
  clk:{x:20,y:120,w:180,h:70,t:'X2 8 MHz → PLL',s:['HSE / M × N / P','demo assumes 25 MHz'],d:'system_stm32f4xx.c from the SK demo: PLL_M 25, PLL_N 300, PLL_P 2, PLL_Q 7 for a 25 MHz crystal → 150 MHz. On the 8 MHz Discovery that is 48 MHz with the PLL outside its datasheet ranges.'},
  leds:{x:520,y:20,w:170,h:80,t:'User LEDs LD3–LD6',s:['PD13 PD12 PD14 PD15','active high, 510/680 Ω'],d:'MB997 sheet 6: PD12 → R40 510 Ω → LD4 green; PD13 → R36 680 Ω → LD3 orange; PD14 → R41 → LD5 red; PD15 → R42 → LD6 blue. The SK demo drives PF6–PF9.'},
  btn:{x:520,y:120,w:170,h:70,t:'B1 USER / B2 RESET',s:['PA0 (220 kΩ pull-down)','NRST (100 kΩ / 100 nF)'],d:'B1 pulls PA0 high through R38 100 Ω and R35 330 Ω. The demo listens on PG6 / EXTI9_5, which does not exist on this package.'},
  mems:{x:250,y:200,w:220,h:60,t:'LIS302DL · MP45DT02 · CS43L22',s:['SPI1 · PDM mic · I2C1 + I2S3 DAC'],d:'The Discovery’s audio parts (accelerometer on SPI1 PA5/6/7 with CS PE3; PDM microphone; audio DAC with class-D driver). Unused by the FreeRTOS demo; relevant to a WBS audio product as an I2S proof of concept.'},
  wbs:{x:20,y:300,w:200,h:90,t:'Today: ATmega128 super-loop',s:['POD33, AMS8-2, M6205 …','ICCAVR, no OS','timing = loop counts'],d:'The baseline RD70 set out to replace. One polled while(1) loop per product; timeouts and debounces are counted in passes; FPGA registers are bit-banged.'},
  rtos:{x:260,y:300,w:200,h:90,t:'Evaluated: FreeRTOS V7.4.2',s:['preemptive, 5 priorities','1 ms tick, timers task','IAR EWARM 6.0'],d:'Stock download (third party). The CORTEX_M4F_STM32F407ZG-SK demo was built and debugged on 30–31 May 2013|46. No WBS task code was written.'},
  after:{x:500,y:300,w:190,h:90,t:'After: STM32F070 (PREmo)',s:['Cortex-M0 48 MHz','CubeMX HAL, no RTOS','System Workbench (free)'],d:'RD88 PREmo, 2016|49–2017|50: the first STM32 firmware in a WBS product. HAL interrupt callbacks + while(1). See premo.js.'},
};
const WIRES = [['stlink','mcu','SWD (PA13/PA14) + NRST'],['clk','mcu','HSE → PLL'],['mcu','leds','GPIOD'],['btn','mcu','PA0 / NRST'],['mcu','mems','SPI1 / I2C1 / I2S'],['wbs','rtos','RD70 2013'],['rtos','after','2016']];
function viewBlock(m){
  window.__rd70Active=false; let sel='mcu';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram — the evaluation bench and where it led (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('Candidates (Info Freescale Micro.xlsx)', `<div id="ct" class="scroll"></div>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 710 410" style="width:100%"><defs><marker id="rd70ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <text x="20" y="285" font-size="11" fill="var(--ink2)">Lineage</text><line x1="10" y1="275" x2="700" y2="275" stroke="var(--grid)"/>`;
    WIRES.forEach(([a,b,l])=>{ const P=BLOCKS[a],Q=BLOCKS[b]; let [x1,y1]=ctr(P),[x2,y2]=ctr(Q);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(P,x1,y1,x2,y2); [x2,y2]=clip(Q,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#rd70ar)"/>${Math.hypot(x2-x1,y2-y1)>70?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:`<title>${l}</title>`}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BLOCKS[sel].t}</h3><p>${BLOCKS[sel].d}</p>`;
    m.querySelector('#ct').innerHTML=`<table class="kv small"><tr><th>Part</th><th>core</th><th>MHz</th><th>flash/RAM</th><th>Eth</th><th>CAN</th><th>price</th><th>“Final Decision”</th></tr>${CANDS.map(x=>`<tr title="${esc(x.note||'')}"><td class="mono">${x.p}</td><td>${x.core}${x.coreInf?' '+inf:''}</td><td class="mono">${x.mhz}</td><td class="mono">${x.fl} / ${x.ram}</td><td>${x.eth}</td><td>${x.can}</td><td class="mono">${x.price}${x.q?'<br><span class="muted">quote '+x.q+'</span>':''}</td><td>${x.tier||''}</td></tr>`).join('')}</table>
      <h3>Also on the 27 June quote</h3><table class="kv small">${QUOTE_EXTRA.map(q=>`<tr><td class="mono">${q[0]}</td><td class="mono">${q[1]}</td><td>${q[2]}</td><td>${q[3]}</td></tr>`).join('')}</table>`;
  };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function viewSchem(m){
  window.__rd70Active=false;
  const ck=clockOf(D.img.kind==='rtos'?D.img:D.src);
  const pins=[['6','VBA (sic)','VBAT','VBAT'],['12','OSC_INC (sic)','OSC_IN','PH0'],['13','OSC_OUT','OSC_OUT','PH1'],['19','VSSA','VSSA','VDD'],['20','VREF-','VREF-','VSSA'],['49','VSS_1','VSS_1','VCAP_1 “?”'],['73','NC','NC','VCAP_2'],['10/27/74/99','VSS_n','VSS_n','VSS'],['7–9','PC13-TAMPER-RTC, PC14/15-OSC32','same','PC13, PC14, PC15'],['23','PA0-WKUP','PA0-WKUP','PA0']];
  m.innerHTML=`${card('Sheet 1 — STM32F407VGT6 on the Discovery: clock, debug, B1, B2, user LEDs (redrawn from UM1472 and MB997 sheet 6, not the original CAD)', `<div id="s1"></div>`)}
   <div class="grid2">${card('Sheet 2 — clock tree as built (live)', `<div id="s2"></div>`)}${card('Pin Comparison.xlsx — where the LQFP-100 family is <i>not</i> pin compatible', `<table class="kv small"><tr><th>Pin</th><th>STM32F100VB</th><th>STM32F103VB (“STMF103VB”)</th><th>STM32F407VE</th></tr>${pins.map(p=>`<tr><td class="mono">${p[0]}</td><td class="mono">${p[1]}</td><td class="mono">${p[2]}</td><td class="mono"><b>${p[3]}</b></td></tr>`).join('')}</table><p class="small">All 80 GPIO positions match. The supply pins do not: on the F407, pin 19 is <b>VDD</b> where the F1 parts have VSSA, and pins 49/73 need VCAP capacitors where the F1 has VSS_1 and NC. A board laid out for the F100/F103 would short VDD to the analog ground on pin 19 if an F407 were fitted. The sheet’s own “?” on pin 49 shows this was still open.</p>`)}</div>`;
  const W=900,H=420; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;font-family:var(--mono)"><style>.w{stroke:var(--ink);stroke-width:1.4;fill:none}.t{font-size:11px;fill:var(--ink)}.n{font-size:10px;fill:var(--accent2)}.c{fill:var(--panel2);stroke:var(--ink);stroke-width:1.4}</style>`;
  s+=`<rect class="c" x="340" y="60" width="200" height="300"/><text class="t" x="440" y="52" text-anchor="middle" font-weight="700">U? STM32F407VGT6 (LQFP100)</text>`;
  const L=[['PH0-OSC_IN',12,90],['PH1-OSC_OUT',13,120],['NRST',14,170],['PA0-WKUP',23,220],['PA13 SWDIO',72,290],['PA14 SWCLK',76,320]];
  const R=[['PD12',59,120],['PD13',60,170],['PD14',61,220],['PD15',62,270],['BOOT0',94,320]];
  L.forEach(([n,p,y])=>{ s+=`<line class="w" x1="300" y1="${y}" x2="340" y2="${y}"/><text class="t" x="346" y="${y+4}">${n}</text><text class="n" x="320" y="${y-3}" text-anchor="middle">${p}</text>`; });
  R.forEach(([n,p,y])=>{ s+=`<line class="w" x1="540" y1="${y}" x2="580" y2="${y}"/><text class="t" x="534" y="${y+4}" text-anchor="end">${n}</text><text class="n" x="560" y="${y-3}" text-anchor="middle">${p}</text>`; });
  // crystal
  s+=`<path class="w" d="M300 90 H250 V100 M300 120 H250 V110"/><rect class="c" x="240" y="100" width="20" height="10"/><text class="t" x="232" y="108" text-anchor="end">X2 8 MHz</text><text class="n" x="150" y="125">(SK demo: 25 MHz)</text>`;
  // NRST / B2
  s+=`<path class="w" d="M300 170 H200"/><text class="t" x="60" y="160">B2 RESET → GND</text><path class="w" d="M200 170 V150 M200 170 V190"/><text class="t" x="206" y="148">R37 100k → VDD</text><text class="t" x="206" y="200">C37 100n → GND · SB1</text>`;
  // PA0 / B1
  s+=`<path class="w" d="M300 220 H180"/><text class="t" x="40" y="214">B1 USER ← VDD via R38 100Ω</text><text class="t" x="40" y="232">R35 330Ω · SB20 · R39 220k ↓GND</text><text class="n" x="186" y="246">demo listens on PG6 (EXTI9_5)</text>`;
  // SWD
  s+=`<path class="w" d="M300 290 H160 M300 320 H160"/><text class="t" x="30" y="294">ST-LINK SWDIO</text><text class="t" x="30" y="324">ST-LINK SWCLK</text><text class="n" x="30" y="345">CN3 fitted = on-board; CN2: 1 VDD 2 SWCLK 3 GND 4 SWDIO 5 NRST 6 SWO</text>`;
  // LEDs
  [['R40 510Ω','LD4 green',120],['R36 680Ω','LD3 orange',170],['R41 680Ω','LD5 red',220],['R42 680Ω','LD6 blue',270]].forEach(([rn,ln,y],i)=>{
    s+=`<path class="w" d="M580 ${y} H620"/><rect class="c" x="620" y="${y-5}" width="34" height="10"/><text class="t" x="637" y="${y-9}" text-anchor="middle">${rn}</text><path class="w" d="M654 ${y} H690"/><path d="M690 ${y-8} L706 ${y} L690 ${y+8}Z" fill="${DLED[i].col}" stroke="var(--ink)"/><line class="w" x1="706" y1="${y-8}" x2="706" y2="${y+8}"/><path class="w" d="M706 ${y} H780 V360"/><text class="t" x="716" y="${y-10}">${ln}</text>`; });
  s+=`<text class="t" x="770" y="378">GND</text><text class="n" x="590" y="300">SK demo: PF6–PF9 (absent on LQFP100)</text>`;
  s+=`<path class="w" d="M580 320 H620"/><text class="t" x="626" y="324">R? → GND (boot from flash)</text>`;
  s+=`<text class="n" x="20" y="405">Redrawn from UM1472 (Fig. 3, Tables 3–5, §4.4–4.10) and MB997 rev B.2 sheet 6. Pin numbers from Pin Comparison.xlsx / the LQFP100 pinout. BOOT0 resistor designator not read ${'(inferred)'}.</text></svg>`;
  m.querySelector('#s1').innerHTML=s;
  const bad=(ok)=>ok?'var(--accent)':'var(--bad)';
  m.querySelector('#s2').innerHTML=`<svg viewBox="0 0 490 170" style="width:100%;font-family:var(--mono)">
    ${[['HSE',ck.hse+' MHz',5,true],['÷ M',(D.img.pllM||D.src.pllM)+'',101,true],['PLL in',fmtMHz(ck.pin),197,ck.okIn],['× N → VCO',fmtMHz(ck.vco),293,ck.okVco],['÷ P → SYSCLK',fmtMHz(ck.sys),389,ck.okSys]].map(([a,b,x,ok])=>`<rect x="${x}" y="30" width="86" height="46" rx="6" fill="var(--panel2)" stroke="${bad(ok)}" stroke-width="2"/><text x="${x+43}" y="48" font-size="11" text-anchor="middle" fill="var(--ink)">${a}</text><text x="${x+43}" y="66" font-size="11" text-anchor="middle" fill="${bad(ok)}">${b}</text>`).join('')}
    <text x="10" y="105" font-size="11" fill="var(--ink)">÷ Q → PLL48CK ${fmtMHz(ck.q)} ${ck.usbOk?'(USB OK)':'(USB needs 48)'}</text>
    <text x="10" y="125" font-size="11" fill="var(--ink)">SysTick LOAD ${RELOAD} (from SystemCoreClock = 150 MHz) → tick ${us(ck.tick)}</text>
    <text x="10" y="145" font-size="10" fill="var(--ink2)">Limits (DM00037051 Table 34): PLL in 0.95–2.10 MHz, VCO 192–432 MHz, SYSCLK ≤ 168 MHz.</text>
    <text x="10" y="162" font-size="10" fill="var(--ink2)">Shows the image in flash (or the editor if none). Red = outside the datasheet.</text></svg>`;
}

/* ---------------- software ---------------- */
const KPATH = [
  ['SysTick_Handler = xPortSysTickHandler','port.c: portNVIC_INT_CTRL_REG = PENDSVSET; portSET_INTERRUPT_MASK_FROM_ISR'],
  ['vTaskIncrementTick','tasks.c: ++xTickCount; prvCheckDelayedTasks moves woken tasks → prvAddTaskToReadyQueue (vListInsertEnd)'],
  ['vApplicationTickHook','main.c: FPU regs := 0; NVIC_SetPendingIRQ(TIM2_IRQn) → TIM2 (regs := 1) → TIM3 (regs := 99); ulMaxFPUInterruptNesting'],
  ['xPortPendSVHandler','portasm.s: push r4–r11 (+s16–s31 if the task used the FPU), save PSP'],
  ['vTaskSwitchContext','tasks.c: taskSELECT_HIGHEST_PRIORITY_TASK → listGET_OWNER_OF_NEXT_ENTRY (pxIndex = pxIndex→pxNext)'],
  ['task code','the selected task runs until the next tick, a block (vTaskDelayUntil, xSemaphoreTake …) or taskYIELD'],
];
const POD33_STEPS = ['WDR · CS8416_READ_LOCK_ALL','CS8416_STATUS_CHECK','LMH1981_VIDEO_DETECT','SWITCH_ENCODER1 · …ENCODER1_UPDATE','SWITCH_ENCODER2 · …ENCODER2_UPDATE','ALTERA_TRANSLATE · ALTERA_SORT','ALTERA_read_write (40 bytes)','ALIGNMENT_CHECK','ACTIVITY_MONITOR · EEPROM_TIMER','UPDATE_DISPLAY','CHIRP · REFRESH_LEDS'];
const POD33_FR = [.10,.04,.06,.07,.07,.05,.40,.02,.03,.12,.04];
function viewSoft(m){
  window.__rd70Active=true; let selTask='BtnTest';
  m.innerHTML=`<div class="grid2">${card('Kernel path at the playhead (FreeRTOS V7.4.2, ARM_CM4F port)', `<div id="kp"></div>`)}${card('Task state machine', `<div id="sm"></div>`)}</div>
   <div class="grid2">${card('pxReadyTasksLists — round robin with pxIndex', `<div id="rl"></div>`)}${card('The WBS super-loop it would replace (POD33 v102) and Ross gearos', `<div id="sl"></div>`)}</div>
   ${card('Which code is whose', `<div id="own"></div>`)}`;
  const draw=()=>{ const t=SIM.t, is=isrAt(t), sg=segAt(t), r=runAt(t);
    const phase = !r||!r.img||r.img.kind!=='rtos'? -1 : is? (is.kind==='tick'? (t-is.t0<(is.t1-is.t0)*.45?0:t-is.t0<(is.t1-is.t0)*.7?1:2) : -2) : sg? 5 : 3;
    m.querySelector('#kp').innerHTML=`<svg viewBox="0 0 520 ${KPATH.length*44+30}" style="width:100%">${KPATH.map((p,i)=>{ const on=phase===i||(phase===3&&i===4); return `<rect x="10" y="${10+i*44}" width="500" height="36" rx="7" fill="${on?'color-mix(in srgb,var(--accent) 25%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/><text x="20" y="${26+i*44}" font-size="12.5" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${p[0]}</text><text x="20" y="${40+i*44}" font-size="9" fill="var(--ink2)">${esc(p[1])}</text>`; }).join('')}
      <text x="10" y="${KPATH.length*44+24}" font-size="11" fill="var(--ink2)">${phase===-2?'EXTI ISR: xSemaphoreGiveFromISR → portEND_SWITCHING_ISR':phase<0?'FreeRTOS not running':is?'in the tick interrupt':sg?'running: '+esc(sg.name):''}</text></svg>`;
    // state machine
    const tasks = r&&r.tasks? r.tasks : taskSet(D.src);
    const tk = tasks.find(x=>x.name===selTask) || tasks[0];
    const R=readyAt(t); let st='Blocked';
    if (sg && sg.name===tk.name) st='Running'; else if (R && R.ready[tk.prio] && R.ready[tk.prio].includes(tk.name)) st='Ready';
    if (tk.kind==='busy'||tk.kind==='yield') st = sg&&sg.name===tk.name?'Running':'Ready';
    const nodes={Running:[260,40],Ready:[90,130],Blocked:[430,130],Suspended:[260,210]};
    m.querySelector('#sm').innerHTML=`<select id="tsel">${tasks.map(x=>`<option ${x.name===tk.name?'selected':''}>${x.name}</option>`).join('')}</select> <span class="small muted">priority ${tk.prio} · ${tk.src||tk.kind}</span>
      <svg viewBox="0 0 520 250" style="width:100%"><defs><marker id="rd70sm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${[['Ready','Running','scheduled (tick / yield / unblock)'],['Running','Ready','preempted · tick slice'],['Running','Blocked','vTaskDelay · xSemaphoreTake'],['Blocked','Ready','tick wakes · ISR gives'],['Running','Suspended','vTaskSuspend'],['Suspended','Ready','vTaskResume']].map(([a,b,l],i)=>{ const [x1,y1]=nodes[a],[x2,y2]=nodes[b]; const o=(i%2?8:-8); return `<line x1="${x1+o}" y1="${y1+o}" x2="${x2+o}" y2="${y2+o}" stroke="var(--ink2)" marker-end="url(#rd70sm)"/><text x="${(x1+x2)/2+o*2}" y="${(y1+y2)/2+o*1.4}" font-size="9.5" fill="var(--ink2)" text-anchor="middle">${l}</text>`; }).join('')}
      ${Object.entries(nodes).map(([n,[x,y]])=>`<ellipse cx="${x}" cy="${y}" rx="62" ry="22" fill="${n===st?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${n===st?'var(--accent)':'var(--line)'}" stroke-width="${n===st?3:1}"/><text x="${x}" y="${y+4}" font-size="12" text-anchor="middle" fill="var(--ink)" font-weight="${n===st?700:400}">${n}</text>`).join('')}</svg>`;
    m.querySelector('#tsel').onchange=e=>{ selTask=e.target.value; draw(); };
    // ready lists
    m.querySelector('#rl').innerHTML = R? [4,3,2,1,0].map(p=>`<div class="small" style="margin:3px 0"><span class="mono">[${p}]</span> ${R.ready[p].length? R.ready[p].map(n=>`<span class="chip" style="${sg&&sg.name===n?'background:var(--accent);color:#fff':''}">${esc(n)}</span>`).join(''):'<span class="muted">empty</span>'}</div>`).join('')+`<p class="small muted">Tick ${R.k.toLocaleString()}. A task woken by a tick or an ISR is inserted with <span class="mono">vListInsertEnd</span>, which makes it the list’s <i>pxIndex</i>: it is picked only after every other ready task at that priority has had a turn. That is why BtnTest at priority 0 waits ≈13 ticks.</p>` : '<p class="muted">FreeRTOS not running at the playhead.</p>';
    // super-loop
    const fr=(t%POD33.loop)/POD33.loop; let a=0,cur=0; POD33_FR.forEach((f,i)=>{ if (fr>=a) cur=i; a+=f; });
    const gn=Math.floor((t-GEAROS.phase)/GEAROS.period), inApp = t>=GEAROS.phase && (t-GEAROS.phase)-gn*GEAROS.period < GEAROS.len;
    m.querySelector('#sl').innerHTML=`<svg viewBox="0 0 520 ${POD33_STEPS.length*24+70}" style="width:100%">${POD33_STEPS.map((p,i)=>`<rect x="10" y="${8+i*24}" width="330" height="20" rx="4" fill="${i===cur?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${i===cur?'var(--accent)':'var(--line)'}"/><text x="16" y="${22+i*24}" font-size="10.5" fill="var(--ink)" font-family="var(--mono)">${p}</text>`).join('')}
      <path d="M340 ${POD33_STEPS.length*24} h14 V18 h-14" fill="none" stroke="var(--ink2)"/>
      <text x="10" y="${POD33_STEPS.length*24+26}" font-size="11" fill="var(--ink2)">POD33 pass #${Math.floor(t/POD33.loop)} — no OS, no timer interrupts, order fixed at compile time.</text>
      <rect x="370" y="20" width="140" height="40" rx="6" fill="${inApp?'color-mix(in srgb,var(--accent2) 35%,var(--panel2))':'var(--panel2)'}" stroke="var(--accent2)"/><text x="440" y="44" font-size="11" text-anchor="middle" fill="var(--ink)">gearos: ${inApp?'appTask':'osIdleTask (WDR)'}</text>
      <text x="370" y="80" font-size="10" fill="var(--ink2)">osRun: first signalled task</text><text x="370" y="94" font-size="10" fill="var(--ink2)">wins; tasks never preempt</text><text x="370" y="108" font-size="10" fill="var(--ink2)">each other (co-operative).</text></svg>`;
    m.querySelector('#own').innerHTML=`<table class="kv small"><tr><th>Item</th><th>Files</th><th>Whose</th></tr>
      <tr><td class="mono">RTOS/FREERTOS/FreeRTOSV7.4.2/</td><td class="mono">7,133 (Source 260 · Demo 6,289 in 128 ports · FreeRTOS-Plus 580 · licence + readme)</td><td>Third party (Real Time Engineers Ltd, GPL + exception). Identical to the zip except below.</td></tr>
      <tr><td class="mono">…/CORTEX_M4F_STM32F407ZG-SK/settings/RTOSDemo.cspy.bat, RTOSDemo.wsdt</td><td class="mono">2 changed</td><td><b>WBS IDE activity</b> (30 May 2013|46): path, device STM32F407VG, Trace macro; open editors and Find-in-Files.</td></tr>
      <tr><td class="mono">…/RTOSDemo.dep, EW1509.tmp, EW150A.tmp(.c), EW19D9.tmp, EW19DA.tmp(.c)</td><td class="mono">6 added</td><td><b>WBS build leftovers</b> (empty temp files, dependency list). No object or .out files.</td></tr>
      <tr><td class="mono">FreeRTOSV7.4.2.zip</td><td class="mono">7,467 entries</td><td>Third party. 342 entries are absent from the extracted tree (297 under hidden “.” folders, 45 binaries/build files).</td></tr>
      <tr><td class="mono">STMi32/, microcontroller Comparison Research/, ARM_Architecture_Overview.pdf, 802.3 PDF</td><td class="mono">datasheets, app notes, eval-board Altium/Gerber</td><td>Vendor (ST, Atmel, Freescale, ARM, IEEE).</td></tr>
      <tr><td class="mono">Research Notes.docx, Info Freescale Micro.xlsx, Pin Comparison.xlsx, Tools quote.docx (notes), RTOS/Research.doc, jtag schematic.docx</td><td class="mono">6</td><td><b>WBS-written</b> notes and comparisons — the only WBS-authored content. No WBS source code exists in RD70.</td></tr>
      <tr><td class="mono">ARM Cortex-M Comparison.doc, AVB Notes.xlsx, Ethernet/NOtes.txt, ethernet.docx</td><td class="mono">4</td><td>WBS files whose text is pasted from public references (Wikipedia “[ edit ]” and “[6] [7]” markers, a vendor Ethernet tutorial ${inf}).</td></tr>
      <tr><td class="mono">Developement IDE/Tools quote.docx, STMi32/arrowQuote.xls</td><td class="mono">2</td><td>Distributor quotes to WBS.</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__rd70Active=false;
  const F=[
    ['The “Final Decision” is in the sheet', 'The RD70 README says the chosen MCU is not recorded. <span class="mono">Info Freescale Micro.xlsx</span> (Part by Part Comparison, 31 May 2013|46) has a header “Final Decision: Low(Basic) · Mid(CAN,USB) · High(Ethernet)” over its last three columns: <b>STM32F100VBT6B · STM32F103VBT6 · STM32F407VET6</b>. The same three parts are the folders under <span class="mono">STMi32/</span>, the columns of <span class="mono">Pin Comparison.xlsx</span>, and lines 16–18 of the 27 June Arrow quote.'],
    ['The only code that ran is the stock SK demo, on the wrong board', 'Eight files were added and two changed in <span class="mono">Demo/CORTEX_M4F_STM32F407ZG-SK</span> on 30–31 May 2013|46 (IAR EWARM 6.0 temp files, <span class="mono">RTOSDemo.dep</span>, <span class="mono">settings/RTOSDemo.cspy.bat</span>: <span class="mono">--device=STM32F407VG</span>). The STM32F407VG is the Discovery’s chip; the demo targets IAR’s STM32F407ZG-SK. No source file was edited.'],
    ['On a Discovery the demo would tick at 3.125 ms and light nothing', '<span class="mono">system_stm32f4xx.c</span> keeps <span class="mono">PLL_M 25</span> for a 25 MHz crystal. With the Discovery’s 8 MHz X2 the PLL input is 0.32 MHz and the VCO 96 MHz, both below DM00037051 Table 34 (0.95–2.10 / 192–432 MHz). SYSCLK would be 48 MHz while <span class="mono">SystemCoreClock</span> stays 150 000 000, so SysTick (LOAD 149 999) fires every 3.125 ms. <span class="mono">ParTest.c</span> drives PF6–PF9 and the button is PG6: ports F and G are not bonded out on the LQFP100. '+infW('that the image actually ran on the Discovery; the archive shows the device setting and the Discovery manual, not a result')],
    ['The session was set up for a J-Link', 'The archived <span class="mono">RTOSDemo.cspy.bat</span> still loads <span class="mono">armjlink.dll</span> with <span class="mono">--jlink_interface=SWD</span>. The Discovery’s on-board probe is an ST-LINK/V2 (CN3 jumpers). <span class="mono">jtag schematic.docx</span> collects notes on using a Discovery’s ST-LINK as a programmer, which suggests the probe question came up.'],
    ['What the engineer was reading', '<span class="mono">RTOSDemo.wsdt</span> records three open editors: <span class="mono">main.c</span> with the cursor in <span class="mono">prvButtonTestTask</span> (“…block again”, offset 18183), <span class="mono">startup_stm32f4xx.s</span>, and <span class="mono">system_stm32f4xx.c</span> at <span class="mono">SystemInit</span> (the active tab), plus a new Find-in-Files pane. Consistent with chasing the clock and the button above.'],
    ['BtnTest at idle priority waits a full round robin', 'In the demo <span class="mono">prvButtonTestTask</span> is created at <span class="mono">tskIDLE_PRIORITY</span>, alongside 13 tasks that never block (Reg1, Reg2, IntMath, CNT1/2, Math1–8). <span class="mono">xSemaphoreGiveFromISR</span> cannot request a switch (equal priority), and <span class="mono">vListInsertEnd</span> (list.c) makes the woken task the list’s pxIndex, so it is picked last. The model gives ≈13 ms; at priority 3 it is about 4 µs (EXTI ISR + PendSV switch). The demo comment calls this “an example of how to synchronise a task with an interrupt”.'],
    ['Three tasks all called “LEDx”', '<span class="mono">flash.c</span> creates the three LED flashers with the same name “LEDx”, so a kernel-aware debugger or trace cannot tell them apart. They toggle every 166, 333 and 499 ticks (integer division of (333 + 333·n)/2).'],
    ['A Reg-test failure needs two check periods to show', '<span class="mono">prvCheckTimerCallback</span> compares <span class="mono">ulRegTest1LoopCounter</span> with the value saved at the previous callback. If the register test dies between callbacks, the first callback still sees a change; only the second (up to 6 s later) reports it. Error flags latched by the queue/semaphore tests show at the next callback.'],
    ['The pin table hides a supply clash', '<span class="mono">Pin Comparison.xlsx</span> shows pin 19 = VSSA on STM32F100/F103 but VDD on the F407, and pins 49/73 VSS_1/NC vs VCAP_1/VCAP_2 (with a “?” in the sheet). “Pin compatible between families” (the notes) holds for the GPIOs, not the supplies. The sheet also has typos: “VBA”, “OSC_INC”, “STMF103VB”.'],
    ['The incumbent column is the wrong AVR', 'The sheet’s AVR column is <span class="mono">ATMEGA1280V-8AU</span> at 16 MHz and $10.15. WBS products use the ATmega128; the “V-8” grade is the 8 MHz low-voltage part.'],
    ['Pasted reference text', '<span class="mono">ARM Cortex-M Comparison.doc</span> keeps Wikipedia’s “[ edit ]” links and “[6] [7]” citation marks; <span class="mono">AVB Notes.xlsx</span> keeps “[1] [2]”; <span class="mono">Ethernet/NOtes.txt</span> is a “See also” list. <span class="mono">Research Notes.docx</span> also writes “256 – 500MB program flash” where kB is meant '+infW('no Cortex-M part of the period has 256 MB of flash')+'.'],
    ['The parts quote covers more than MCUs', 'Arrow’s 27 June quote (attn. Kevin) mixes the MCU candidates with an i.MX6 PMIC (MMPF0100 × 4000), Bourns TBU protectors, an APDS-9900 proximity sensor, SFP/SFP+ fibre transceivers (ABCU-5730RZ, AFCT-701SDZ) and a 10 MHz oscillator — other projects’ parts on one request '+inf+'. The quote also moved to a different WBS address than the 4 June IDE quote.'],
    ['README counts disagree', 'The archive README (§II.2) says FreeRTOS is “820 files under RTOS/FREERTOS”; the extracted tree has 7,133 files (plus a 7,467-entry zip). The RD70 README’s “about 7,100” is right.'],
    ['RD70 never closed', 'In <span class="mono">R&amp;D_List.xls</span> RD70 is priority A, person “All”, with no completion date. No later WBS product used FreeRTOS or IAR: the first STM32 product firmware (RD88 PREmo, STM32F070, 2016|49) uses STM32CubeMX HAL, free System Workbench, and a plain super-loop.'],
  ];
  m.innerHTML=card('Findings — what RD70 is up to', `<ol>${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`)+
    card('Timeline of the evaluation (from file dates)', `<table class="kv small">${TIMELINE.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`)+
    card('Assumptions in this model', `<ul class="small"><li>Kernel costs (SysTick + tick hook ${us(COST.isr)}, PendSV ${us(COST.ctx)}, EXTI ${us(COST.exti)} at 150 MHz) and task burst lengths are ${inf} cycle estimates; they scale with SYSCLK.</li><li>22 of the demo’s ≈40 tasks are modelled; the rest are blocked most of the time. Phases of BlkSEM and Rec1 are ${inf}.</li><li>The simulated second is seconds 2.5–3.5 after <span class="mono">vTaskStartScheduler</span>, so the 3 s check timer lands at 0.5 s.</li><li>The out-of-spec PLL is modelled as locking at the nominal ratio ${inf}.</li><li>The Discovery LED/button remap and the ST-LINK driver name are ${inf}: no edited copy is archived.</li><li>Super-loop and gearos pass times come from the sister plugins, where they are themselves ${inf}.</li></ul>`);
}

/* =====================================================================
   10. REGISTER
   ===================================================================== */
SIM.register({
  id:'rd70-microcontrollerresearch',
  name:`RD70 · Microcontroller research: Cortex-M + FreeRTOS evaluation (${Y(2013)})`,
  product:'RD70 Microcontroller Research', year:2013,
  folder:'ENGINEERING - 2016 RD FILES/RD70-MicroControllerResearch', family:'R&D register',
  summary:'The 2013|46 search for a 32-bit successor to the ATmega128: Kinetis, XMEGA, SAM7 and STM32 parts compared, an STM32F100/F103/F407 family picked as Low/Mid/High, and the stock FreeRTOS V7.4.2 STM32F4 demo built in IAR and run on a Discovery board. The plugin runs that demo tick by tick and sets it beside the WBS super-loops and the Ross gearos scheduler.',
  highlights:['FreeRTOS V7.4.2 scheduler, tick by tick, with real priorities and round-robin order','STM32F4DISCOVERY drawn to scale; B1, B2, CN1, CN3, JP1 drive the model','IAR window: PLL, pin map and priority edits, Make, Download & Debug','Same button press on FreeRTOS, POD33, AMS8-2 and gearos','Why the archived demo would not blink on the Discovery','Candidate sheet, quotes and the “Final Decision” tiers'],
  depth:'Full model',
  duration:1,
  stepUnits:[
    {label:'1 tick (SysTick)', period:()=>{ const r=sim().runs.find(x=>x.img&&x.img.kind==='rtos'); return r? r.Tt : 1e-3; }, phase:()=>{ const r=sim().runs.find(x=>x.img&&x.img.kind==='rtos'); return r? ((r.epoch%r.Tt)+r.Tt)%r.Tt + 1e-6 : 0; }},
    {label:'10 µs', period:()=>1e-5},
    {label:'1 POD33 loop pass', period:()=>POD33.loop},
    {label:'1 gearos appTask (40 ms)', period:()=>GEAROS.period},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (about 20 ticks)'],[0.01,'10 ms'],[0.002,'2 ms (2 ticks)'],[0.0003,'300 µs'],[0.00003,'30 µs (ISR detail)']],
  defaultZoom:2,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the evaluation', render:viewTutorial},
    {id:'second', label:'One second, tick by tick', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
