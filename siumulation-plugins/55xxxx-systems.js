/* =====================================================================
   Custom 55xxxx systems — Ward-Beck Systems customer job archive (1999|32 – 2011|44)
   Plugin for the WBS Device Simulator (../siumulation.html)

   One plugin, ~100 customer jobs. A job selector shows a summary card for every
   job. The most complete job, 557572 (Rogers Kitchener / CHYM, March 2008|41),
   is modelled in full: two R2K consoles, a 554951-3 communication hub (ATmega128),
   a custom R257-1 host turret (PIC16F73), the R203 volume-encoder custom, the
   554951-2 volume level controller (PIC16F73) and R221 Mode 7 cough logic.

   Sources (all read-only, in #CUSTOM #SYSTEMS/#CUSTOM 55XXXX Systems - #OBSOLETE #Archive/):
   - 557572/554951-3/Software/554951-3.c (25 Mar 2008) + 20 dated snapshot folders, 554951-3._c
       MASTER_CONTROL event_schedule, UART0/1_transmit_counter, CONSOLE_TURRET_TRANSMISSION_CONTROL,
       UART*_com_check, SYNCHRONIZE_DATA_BETWEEN_UARTS, port_init, uart*_init, main()
   - 557572/557572-1/Software/554951-1.asm, init.asm, setup.asm, EERW.ASM (turret, 93LC66B EEPROM)
   - 557572/554951-2/Software/554951-2.asm (volume level controller), Product Assembly.txt
   - 557572/R221v1/r201v301.asm + r201m102.asm (Mode 7 cough), R203/encdc100.asm, R203/Readme.txt
   - 557572/557572 Manual Appendix.pdf, temp files/557572 Project.pdf, FUNCTIONAL-557572 Model.pdf,
     557572 ( on off + tb + mon sel + dump & next event ctrls ).pdf, R203CUSTOM*.pdf, 555529 R221 Mode 7.pdf
   - 557572/557572-1/SILK.cdr, 554951-3/554951-3SLKcurve.cdr, 554951-2/554951-2m2curve.cdr
     (converted with Inkscape → assets/55xxxx-systems-*.png)
   - every job folder's files and their archive sidecars (*.md) for the job cards
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ID = '55xxxx-systems';
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="${why||''}">inferred</span>`;
const card = (t, b, extra)=>`<div class="card"${extra||''}><h2>${t}</h2>${b}</div>`;
const hx = v => '0x'+(v&255).toString(16).toUpperCase().padStart(2,'0');
const bin8 = v => (v&255).toString(2).padStart(8,'0');
const Y = y => SIM.year(y);

/* ---------------- every job in the folder ----------------
   [job, year, customer (organisation only, '' = not named), kind, what, code]
   year = the job's own files (copied-in older files ignored). */
const JOBS = [
 ['550028-1',2000,'','Panel + PCB','Impedance matching panel with an extended-range meter; ACCEL PCB 550028-1-1 with a 74HC165/4094 pushbutton board, OMRON lit buttons and DB25s.','none'],
 ['550045',2001,'','Metalwork','Custom turret (M1) and a connector/relay panel (M2), AutoCAD only.','none'],
 ['550208-1',2000,'','Intercom','“550208-1 Custom Intercom”: ACCEL PCB (74HC4053, NE5532, XLRs), speaker panel with a Lexan cover. Readme.txt (Jul 2000): “a connection between R25 and R88 that shouldn’t be there” on the Iss.1 PCB.','PIC (550208-1.asm)'],
 ['550208-2',2000,'CBC Montreal','Guest turret','Guest turret in a POD1/POD2-style box: checks whether it is chained to other guest turrets so audio passes through the XLRs; 75176 RS-485, PIC16C73 then 16F874 (v101). A 2010|43 software-list note names CBC Montreal.','PIC (550208.asm)'],
 ['550208-3',2000,'','Host turret','Host turret for the 550208 intercom chain: reads the guest chain status and a BNC CTLR IN enable; 5-page OrCAD schematic with headphone amps.','PIC16C73 (550208-3.asm)'],
 ['550245-1',2000,'CBC Windsor','R257-1 turret','Custom R257-1 turret: 5 groups CH ON/OFF, 1 T/B, 1 ALL ON/OFF (Aug 25 2000, based on 550512-1). A later build combines it for the CBC Windsor French network. Ancestor of 554951-1.','PIC16C73 (550245-1.asm)'],
 ['550245-2',2000,'','Guest turret','Custom guest turret metalwork and POD-6 wiring diagram (DB25, headset, CTL/TALLY); 550245-1.wpd explains EEPROM address setup.','none'],
 ['550245-3',2000,'','Silk only','One OrCAD page and a silk-screen (550245-3SLK.CDR).','none'],
 ['550315',2000,'','Turret set','R257-series turret, guest turret and a relay panel (4PDT relays, DB25/DB15/DB9, XLR) — drawings and wiring.','none'],
 ['550415',2000,'CKCU Ottawa','R257-1 turret','R257-1 turret software “3 groups chon choff and one t/b(cue)”; spreadsheet “3 groups on off and tb”.','PIC16C73 (550415-1.asm)'],
 ['550435-1',2000,'','Turret','Turret with relay pulse outputs (DELAY2 = 15 → 5 ms relay pulse); 5-page schematic.','PIC16C73'],
 ['550471-1',2000,'CJBK London','R257-1 turret','“2 groups chon choff t/b(cue) and dcs control”; header lists known bugs (“no way to set studio number”).','PIC16C73 (550471-1.asm)'],
 ['550497-1',2000,'Rogers','R257-1 turret','“2 groups chon choff, with t/b(cue) and M2”, 8 studio monitor-select buttons; spreadsheet “Rogers with 2 groups on off tb m2 also mon sel”.','PIC16C73 (550497-1.asm v100/v101)'],
 ['550500-1',2000,'','Panel','Impedance-matching style front panel and a fused power distribution (CON15 + four fuses).','none'],
 ['550512',2000,'CFAC Rogers Calgary','R257-1 turret','“3 group on off” turret spreadsheet, programming instructions (MIC 3 OFF = LSB … MIC 1 ON = MSB), wirings.','PIC'],
 ['550512-1',2000,'CFAC Rogers Calgary','R257-1 turret','The original address-setup turret code (“JULY12/2000/DSB address setup”), 3 groups; 550512-2 is a 1-group version. Most later turrets say “based on 550512-1”.','PIC16C73 (550512-1.asm, 550512-2.asm)'],
 ['550512-2',2000,'CFAC Rogers Calgary','Turret','Second turret of the 550512 job: metalwork and wiring only.','none'],
 ['550623',2000,'','Turret wiring','Wiring (DB25, 10×2 header, BNC) and setup instructions for an EEPROM-addressed turret.','none'],
 ['550670-2',2000,'','Audio level controller','POD16-based “Audio Level Controller”: one speaker volume driven by UP/DOWN pulses from four consoles; both = mute. Re-done for PIC16F73 in 2002|35; becomes 554951-2 in 2005|38.','PIC16F73 (550670-2.asm, 670-2v1, 6702v3)'],
 ['550756-2',2000,'Pippin Technical Services','Turret','Custom turret “based on the code from 550512-1”, CHOFF button = studio select in setup.','PIC16C73A (550756-2.asm)'],
 ['550774',2000,'Torpey','Meter panel','Meter panel and the connector for a slave-clock input (Molex 9-pin) — Torpey clock work.','none'],
 ['550875-1',2000,'','Turret','Custom turret; rear panel “the same as 99053M06”.','none'],
 ['550892',2000,'','Panel','Impedance matching panel drawing (copy of 550500-1 front).','none'],
 ['550892-1',2000,'','Power supply','Small power supply wiring (TB3, CON5) for the 550892 panel.','none'],
 ['551359',2001,'','Turrets','“TURRETS-PROJECT#551359-1+2+3” silk and an ACCEL wiring (ON/OFF lit buttons, +21 V, pots).','none'],
 ['551407-1',2001,'','Clean-feed system','ACCEL schematic “Clean Feed System” (~160 parts, 20k/30R/10k networks) and PCB.','none'],
 ['551518',2001,'CBC Windsor','Custom console','“CBC Windsor Custom Console” (2 PDF pages), functional (ON/TB/OFF/COMBINED/FLICK/MONITOR/HEADSET), console DB25 wiring for R2K/20 and R2K/12, turret 551518-1 and a WBS I/O board 551518-4.','PIC (551518-1.asm, 551518-4)'],
 ['551521',2001,'CHUM','R257-1 turret','Turret “2 groups chon choff, with t/b(cue)”, 2 × DB25; programming chart and custom-software doc.','PIC16C73 (551521-1.asm)'],
 ['551681',2001,'','Guest turret','Custom guest turret, cough-control wiring (HOST/GUEST 1–3 COUGH, CR B GUEST MIC OFF CTL).','none'],
 ['551752',2002,'','Meter panel','Rack meter panels for Sifam meters; “551752 Modifications” (bracket and rear panel changes).','none'],
 ['551823',2002,'Torpey','Speaker wiring','4-page wiring: terminal blocks, Jones plugs, speaker.','none'],
 ['551845',2002,'','Display panel','Display panel and wiring (DB9, red/green lamps, 150 Ω/750 Ω 3 W).','none'],
 ['551850',2002,'','Display panel','Display panel drawings (sister of 551845).','none'],
 ['551862',2002,'Torpey','Clock/turret panel','Panels around a Torpey clock (CDS-8 top view, DB9s), guest wiring with POD headset amp.','none'],
 ['551890',2002,'CHED Radio Edmonton','Meter bridge','Custom meter bridge drawings.','none'],
 ['551900',2002,'Torpey','Turret','Turret with a Torpey clock: P-CAD wiring (DB25, DB9, ON/OFF/TB).','none'],
 ['552025',2002,'','Volume control','Turret display + PIC volume control for “four consoles … one set of speakers” (UP/DOWN/mute), ULN2803 outputs.','PIC16F73 (552025.asm)'],
 ['552123',2002,'CJED (BSE)','R257-1 turret','“552123-1 BSE for CJED” turret programming chart; code based on 550512-1.','PIC (552123-1v1.asm)'],
 ['552347',2002,'','Cough wiring','One drawing of the host/guest cough-control wiring.','none'],
 ['552421',2002,'Torpey','Turret','Turret wiring (MIC 1/2 ON/OFF) and a POD6 jack-clearance drawing; Torpey clock assembly.','none'],
 ['552458',2002,'Torpey','Turret + clock','Turret metalwork M1–M6 with a Torpey clock assembly and DB25 bracket; 552458-2 turret wiring.','none'],
 ['552493',2002,'','Guest turret','Guest turret wiring (DB25, lit button, pot).','none'],
 ['552561',2003,'','AES level box','Prototype panel with AES input, LEVEL and BALANCE controls, 7805 supply.','none'],
 ['552568',2002,'','Guest turret','Custom guest turret “designed from the” earlier guest turret.','none'],
 ['552607',2003,'','POD17 custom','POD17 custom front/rear (DB9) and a switch assembly.','none'],
 ['552646',2002,'CFRB','VU meter panel','“Custom VU meter panel for CFRB” and a modified armrest.','none'],
 ['552690',2002,'','R257-1 turret','Turret “2 groups chon choff, with t/b(cue)”, programming chart.','PIC (v100.asm)'],
 ['552728',2003,'CBC','8 × SLM meter','“Custom 8 SLM meter” panel (SLM4-2), Plexiglas lens.','none'],
 ['552989',2003,'','Host/guest turrets','Host turret, guest turrets and an interface box (MIC inputs for HOST/G1/G3/PROD); “4 groups chon choff, 2 t/b”; an R206 build.','PIC (552989-1.asm, r206v103.asm)'],
 ['553017',2003,'Torpey','Clock turret','Turret with a Torpey clock assembly and POD6 jack clearances.','none'],
 ['553215',2003,'CBC','Custom POD','Custom POD rear panel “CBC-JURE” with a terminal block and AC plug; power wiring.','none'],
 ['553228',2003,'Corus Entertainment','Volume/balance','Custom volume/balance front panel for a “Bit Buddy” enclosure.','none'],
 ['553229',2003,'CBC Edmonton','POD16 custom','POD16 rear panel with AC plug and a custom bottom holding two PCBs; MIC 1A/2A/1B/2B wiring.','none'],
 ['553259',2003,'CFRB','Turret system','The biggest drawing set after the console jobs: turret with MONITOR, TIME CODE, SHAFT ENCODER, headset; R257-1 product assembly; volume I/O code; A/D averaging.','PIC (553259-1.asm, 553259io.asm, ad.asm)'],
 ['553340',2003,'ABC (New York)','POD21 + POD2 custom','Custom product 013: POD21 input 6 sacrificed as an NTSC genlock reference, switching on line 10; POD2 reads external pushbutton panels; VB control software.','PIC (pd21-013.asm, pod2-013.asm, video_sw.asm)'],
 ['553368',2004,'','Control panel','DB9 pushbutton panel and a red/green lamp wiring.','none'],
 ['553408',2003,'CFRB','Custom turret','Turret with display lens, speaker and mic input; the only job with photos (5 JPG).','none'],
 ['553433',2004,'CBC Toronto','Modified PODs','Rear panels for a modified POD11, POD24 and POD3.','none'],
 ['553580',2004,'CTV','Relay interface','CTV relay pin-outs (DB25 relay closures) and an RS-485 (75176) interface wiring.','none'],
 ['553594',2004,'CIKR FM Kingston','R257-1 turret','Turret chart for CIKR FM Kingston — but the code header still says “cfac rogers calgary, 550512-1”.','PIC (553594-1.asm)'],
 ['553653',2004,'','Turret','One custom turret drawing.','none'],
 ['553730',2004,'CKQB Radio Ottawa','Turret rear','Turret rear panel drawings.','none'],
 ['554099',2003,'','POD21/POD2R','POD21 6×1 SDI switcher custom (press SLAVE to make 12×1) and POD2R remote.','PIC16F874/16F73 (21vCUSTOM.asm, 21r101.asm)'],
 ['554164',2004,'CTV','NAB 2004 turret','Extended custom turret “for NAB 2004” with dual meters: a modified POD23A (encoders, UART) plus an AMS4E-1 ATmega128 build; “554164 COMMUNICATION PROTOCOL.doc”.','PIC + ATmega128 (pod23.asm, ams4e.c)'],
 ['554174',2004,'','Host turret','Custom host turret modified from the NKK-JB10 PCB; turret wiring.','none'],
 ['554254',2004,'CKQB Ottawa','Guest turret','Custom guest turret with a 25-pin connector.','none'],
 ['554265',2004,'','POD23 custom','Silk and a POD23-to-22 DB9 wiring.','none'],
 ['554294',2004,'CBC Prince George','Turret + POD2S','Turret wiring functional, programming chart and a custom POD2S switcher.','PIC16F73 (pod2v103.asm)'],
 ['554489',2005,'CBC Prince George','Input module','Input-module metalwork.','none'],
 ['554558',2005,'','Cable','POD10-to-POD21 DB9 wiring.','none'],
 ['554585-1',2005,'CBC','RGP8 panel','RGP8 remote-gain rear panel and POD mounting brackets.','none'],
 ['554704',2005,'CFAC','Custom turret','Custom turret face plate.','none'],
 ['554743',2005,'CBC Vancouver','Custom turret','“Custom turret for 554743-1 CBC Vancouver” (Jun 13 2005), paged address setup.','PIC16F73 (554743-2.asm)'],
 ['554798',2005,'','Turret code','Turret software v100 and “custom software for 554798.doc” (setup by MIC OFF LEDs).','PIC (v100.asm)'],
 ['554906',2005,'CFAC Rogers Calgary','Turrets','Two turrets (554906-1 “3 groups chon choff”, 554906-2); 554906-1M1 = 554704-1M1 except the silk.','PIC16F73'],
 ['554916',2005,'CTV','Console wings','Modified left and right console wings with display lens.','none'],
 ['554951',2005,'Rogers','R2K console system','The first R2K system: 554951-1 host turret (HOST + 3 GUEST + T/B), 554951-2 volume level controller, 554951-3 communication interface (ATmega128, 06/04/2005), R203/R204/R206 builds; Halifax audio functional. Its 2005 hub firmware runs in the obsolete-misc plugin.','PIC16F73 + ATmega128'],
 ['554993-1',2005,'','RLM24 DSP','SHARC code for an RLM24-type audio meter: VU, phase meter, silence sensor, tallies (rlm24_proc.c, SSensor.asm).','ADSP-21262 (VisualDSP++)'],
 ['554998',2005,'Loyalist College','Turret','“Rogers with 2 groups x 4 (cough)” chart; custom turret for Loyalist College, one DB25 replaced by a DB37.','PIC'],
 ['555334',2005,'CFUN','Host turret','Custom host turret (NKK-JB10 based) and a POD6 with XLR.','none'],
 ['555367',2005,'CKCU Ottawa','R257-1 turret','“2 groups chon choff with t/b(cue)”, paged setup (MIC2 ON selects which mic address).','PIC (v100.asm)'],
 ['555432',2005,'Telemedia Vancouver','R201 Mode 7','R201 input-module mode custom (r201m102) and the e-mail that first describes Cough A/B (Mode 7).','PIC16F74 (r201m102.asm)'],
 ['555529',2007,'Rogers Calgary','R2K serial hubs','Rogers Calgary “serial hubs”: MASTER/SLAVE communication interfaces, R221 Mode 7, R203/R204/R206 builds, an ATmega hub build (555529-3).','PIC + ATmega128'],
 ['555842',2006,'','POD2R','POD2 audio switcher remote software.','PIC16F73 (pod2r101.asm)'],
 ['556119-1',2006,'','Wiring','D8204C to QCP wiring with a two-foot umbilical between MF-82/12 frames.','none'],
 ['556413',2006,'','Cable','POD10-21 and POD10-21-9 DB9 wirings.','none'],
 ['556977',2007,'','R241/R201 modes','Modified R241 modes (“MODIFIED R241MODES.doc”) and R201 v201 “Custom for EAS004”; guest turret base.','PIC (r241m*.asm, r201v201.asm)'],
 ['556986-1',2007,'','PB control panel','“Push button control panel”: 10-button PCB used mainly in turrets, DB15/DB25 material list.','none'],
 ['557175-1',2007,'','AES panel','Custom front/rear panel with L/R AES and a Digi-Key terminal block.','none'],
 ['557347',2007,'','POD25/POD2','One P-CAD sheet naming POD25 and POD2.','none'],
 ['557511',2008,'RVA','POD2R/POD20','Custom POD2R + POD20 left/right units.','none'],
 ['557572',2008,'Rogers Kitchener (CHYM)','R2K two-console system','THE MAIN SIMULATION: two R2K consoles, one or two 554951-3 hubs, custom turret (8 monitor selects, ON/OFF, T/B, DUMP, NEXT EVENT), 554951-2 volume controller, R203 volume encoder custom, R221 Mode 7. Manual appendix 27 Mar 2008.','ATmega128 + PIC16F73 + PIC16F874'],
 ['557954',2008,'CBC Windsor / Torpey','R257-1 turret','“4 groups on off all on all off + tb” turret (557957-1.asm) with a Torpey clock panel; a copy of the CBC Windsor 5-group chart.','PIC16F73'],
 ['557962-1',2008,'Torpey','Clock assembly','Torpey clock assembly panels and a guest-turret wiring.','none'],
 ['558169-1',2009,'','POD21/POD2/POD9','POD21 digital video switcher (21r101, Mar 2005) and POD2/POD9 custom builds.','PIC16F874/16F73'],
 ['SMS',1999,'','SMS4 meter','Not a job: a copy of the SMS4 four-channel stereo LED meter (manual, schematic, PCB, AMS4 v100 code).','PIC16C73A (SMS4V100.ASM)'],
];
const SKELETONS = ['554164 #TIM','554951 #TIM','555529 #TIM','557572 #TIM','558169-1 #PETER'];

/* ---------------- constants from the source ---------------- */
const C = {
  XTAL: 4.9152e6,              // UBRR 0x1F → 9600 “actual 9600 (0.0%)”; header says “4.951 Mhz”
  BAUD: 9600,                  // UBRR0L = UBRR1L = 0x1F, UCSRnC = 0x06 (8N1)
  LOOP: 40e-6,                 // hub main-loop pass — INFERRED (≈200 cycles of the 4.9152 MHz ATmega128)
  TX0: 100,                    // TRANSMIT_COUNTER (Transmit_Counter0 for UART0, fixed)
  TXT: 3,                      // TRANSMIT_COUNTER_TURRET
  COMM: 1000,                  // COMMUNICATION_COUNTER (._c copy and 20 mar build: 500)
  WAITN: 25,                   // CONSTANT (passes PINC5 must stay high)
  REPLY: 1e-3,                 // module answers 1 ms after the hub turns round — INFERRED
  TLOOP: 250e-6,               // turret PIC main loop — INFERRED
};
C.BYTE = 10/C.BAUD;
const STUDIO1=0, STUDIO2=1, RESET=255;

/* ---------------- device state ---------------- */
const D = {
  job:'557572',
  pres:{ c1:true, c2:true, tur:true, hub2:false },
  mod:{ c1r203:true, c2r203:true, c1r204:true, c2r204:true, c1r201:true, c2r201:true },
  /* console modules (what each R2K console shows) */
  con:[ {s1:0, s2:8, tb:false, meter:8, on:false, cue:false}, {s1:0, s2:8, tb:false, meter:8, on:false, cue:false} ],
  /* hub (554951-3) variables, names as in 554951-3.c */
  hub:{ R203_command_byte_studio1:0x40, R203_command_byte_studio2:0x48, console1_tb1:0x33, console2_tb1:0x33,
        R204_command_byte_meter:0x28, R201_command_byte_ch1:0x29, turret_address_ch1:0xFF, address_set:false,
        turret_studio:RESET, send_studio1_info:true },
  /* turret (557572-1 = 554951-1.asm), names as in the source */
  tur:{ power:true, setupSw:false, setup0:false, page:1 /*ch_set_flags 1 = mic, 2 = studio*/,
        ch1_set:0, ch5_set:0, chpole10:0x80, studio:0x9E, on:false, tb:false, mon:0, talk1:0, holding:false },
  vlc:{ table_count1:0, table_count2:0, mute:false },
  r221:{ chA:true, inputA:true, chon:true, cue:false, tim_flag:0, held:null },
  lastAct:-1,            // sim time of the last action (marks the take bits in the next cycle)
  log:[],
};
const TB_STATES = ['idle','send_CHOFF','send_CUEON','(T/B held — cue on)','send_CUEOFF','send_CHST'];

/* derived: turret mic address, R203/R201 bytes */
const turAddr = ()=> D.tur.chpole10 & 0x1F;
const turStudio = ()=> (D.tur.studio & 0x40) ? STUDIO2 : STUDIO1;

function act(name, fn){
  const tr=[]; const t = s=>tr.push(s);
  fn(t);
  D.lastAct = SIM.t;
  D.log.unshift({t:SIM.t, name, trace:tr}); if(D.log.length>60) D.log.length=60;
  SCHED_KEY=''; SIM.refresh();
}

/* =====================================================================
   MASTER_CONTROL over one second (554951-3.c, 25 Mar 2008)
   Each step = one value of event_schedule. Timing from the pass counters:
   UART0 sends pace every byte by Transmit_Counter0 = 100 passes; UART1 uses
   Transmit_counter1 (3 or 100, set per step) and drops to 3 for the 2nd byte;
   a missing reply ends after COMMUNICATION_COUNTER passes.
   ===================================================================== */
const STEPNAME = {
  0:'send R203 console 1 studio 1',1:'read R203 console 1 studio 1',2:'send R203 console 2 studio 1',3:'read R203 console 2 studio 1',4:'(spare)',
  5:'send R203 console 1 studio 2',6:'read R203 console 1 studio 2',7:'send R203 console 2 studio 2',8:'read R203 console 2 studio 2',9:'(spare)',
  10:'send R203 console 1 tb 1',11:'read R203 console 1 tb 1',12:'send R203 console 2 tb 1',13:'read R203 console 2 tb 1',18:'BYPASS_MONITOR_CHANNEL (14–17 commented out)',
  19:'send R204 meter console 1',20:'read R204 meter console 1',21:'send R204 meter console 2',22:'read R204 meter console 2',
  23:'poll turret (R201 ch1 address)',24:'read turret',45:'CH1_PROCESSING',46:'send R201 ch1 → console 1',47:'read R201 ch1 console 1',48:'merge console 1 vs 2',
  49:'send R201 ch1 → console 2',50:'read R201 ch1 console 2 · CONSOLE1_NOT_COMM',51:'decide turret command',25:'send studio to turret (TURRET_STUDIO_SCHEDULE)',26:'read turret monitor select',
  255:'default: WAIT_SCHEDULE — wait for PINC5 (CHECK_CONSOLE1_COMM)'};
const TC1 = {2:C.TXT,7:C.TX0,12:C.TXT,21:C.TXT,49:C.TXT,23:C.TXT,25:C.TXT};   // Transmit_counter1 each step sets
function stepList(){
  const P=D.pres, M=D.mod, a=turAddr();
  const c1=P.c1, c2=P.c2;
  const s1=(D.hub.R203_command_byte_studio1&0x0F), s2=(D.hub.R203_command_byte_studio2&0x0F);
  const r201 = (k)=> 0x40 | (D.con[k].on?1:0) | (D.con[k].cue?2:0);
  const L=[];
  const tx0=(cs,a1,c,who)=>L.push({cs,kind:'tx0',bytes:[a1,c],who});
  const tx1=(cs,a1,c,who,flag)=>L.push({cs,kind:flag===2?'tx1t':'tx1c',bytes:[a1,c],who,flag});
  const rx=(cs,uart,ok,rep,who)=>L.push({cs,kind:'rx'+uart,ok,bytes:ok?rep:null,who});
  const ps=cs=>L.push({cs,kind:'pass'});
  tx0(0,0x9E,0x40|s1,'C1 R203'); rx(1,0,c1&&M.c1r203,[0x9E,0x40|D.con[0].s1],'C1 R203');
  tx1(2,0x9E,0x40|s1,'C2 R203',0); rx(3,1,c2&&M.c2r203,[0x9E,0x40|D.con[1].s1],'C2 R203'); ps(4);
  tx0(5,0x9E,0x40|s2,'C1 R203'); rx(6,0,c1&&M.c1r203,[0x9E,0x40|D.con[0].s2],'C1 R203');
  tx1(7,0x9E,0x40|s2,'C2 R203',0); rx(8,1,c2&&M.c2r203,[0x9E,0x40|D.con[1].s2],'C2 R203'); ps(9);
  tx0(10,0x9E,D.hub.console2_tb1&0x7F,'C1 R203'); rx(11,0,c1&&M.c1r203,[0x9E,0x40|(D.con[0].tb?0x10:0)|0x03],'C1 R203');
  tx1(12,0x9E,D.hub.console1_tb1&0x7F,'C2 R203',0); rx(13,1,c2&&M.c2r203,[0x9E,0x40|(D.con[1].tb?0x10:0)|0x03],'C2 R203');
  ps(18);
  tx0(19,0x9D,D.hub.R204_command_byte_meter&0x7F,'C1 R204'); rx(20,0,c1&&M.c1r204,[0x9D,0x40|D.con[0].meter],'C1 R204');
  tx1(21,0x9D,D.hub.R204_command_byte_meter&0x7F,'C2 R204',0); rx(22,1,c2&&M.c2r204,[0x9D,0x40|D.con[1].meter],'C2 R204');
  const noCon = !(c1&&M.c1r201) && !(c2&&M.c2r201);
  tx1(23,(0x80|a)|0x20|(noCon?0x40:0),D.hub.R201_command_byte_ch1&0x7F,'turret',2);
  const turOk = P.tur && D.tur.power && !D.tur.setup0;
  rx(24,1,turOk,[0x80|a, turretCmd()],'turret');
  if (turOk){
    ps(45);
    tx0(46,0x80|a,D.hub.R201_command_byte_ch1&0x7F,'C1 R201'); rx(47,0,c1&&M.c1r201,[0x80|a,r201(0)],'C1 R201'); ps(48);
    tx1(49,0x80|a,D.hub.R201_command_byte_ch1&0x7F,'C2 R201',0); rx(50,1,c2&&M.c2r201,[0x80|a,r201(1)],'C2 R201'); ps(51);
    const st=turStudio();
    tx1(25,(0x9E|0x20|(st?0x40:0)),(st?D.hub.R203_command_byte_studio2:D.hub.R203_command_byte_studio1)&0x7F,'turret',2);
    rx(26,1,true,[st?0xDE:0x9E, 0x40|0x20|(D.tur.mon&7)|(st?8:0)],'turret');
  }
  return L;
}
function turretCmd(){ return D.tur.on ? 0x39 : 0x29; }

let SCHED=null, SCHED_KEY='';
function schedule(){
  const key = JSON.stringify([D.pres,D.mod,D.tur.chpole10,D.tur.studio,D.tur.on,D.tur.mon,D.tur.setup0,D.tur.power,D.con,D.hub]);
  if (key===SCHED_KEY) return SCHED; SCHED_KEY=key;
  const pass=C.LOOP, steps=[], bytes=[], leds={c1:[],c2:[],tur:[]}, tok=[];
  let t=0, cyc=0;
  const led=(k,on,tt)=>{ const a=leds[k]; if(!a.length||a[a.length-1][1]!==on) a.push([tt,on]); };
  led('c1',false,0); led('c2',false,0); led('tur',false,0);
  const runCycle=(hub)=>{
    let lastTxEnd=0;
    for (const s of stepList()){
      const t0=t; let e={...s, t0, hub, cyc};
      if (s.kind==='pass'){ t+=pass; }
      else if (s.kind==='tx0'){
        const b1=t+101*pass, b2=b1+101*pass; bytes.push({bus:'u0',dir:'tx',t:b1,v:s.bytes[0],who:s.who,hub},{bus:'u0',dir:'tx',t:b2,v:s.bytes[1],who:s.who,hub});
        lastTxEnd=b2+C.BYTE; t=b2+101*pass; e.de=[b1,t];
      } else if (s.kind==='tx1c'||s.kind==='tx1t'){
        const N=TC1[s.cs]||C.TXT, b1=t+(N+1)*pass, b2=Math.max(b1+4*pass, b1+C.BYTE);
        bytes.push({bus:s.kind==='tx1t'?'u1t':'u1c',dir:'tx',t:b1,v:s.bytes[0],who:s.who,hub},{bus:s.kind==='tx1t'?'u1t':'u1c',dir:'tx',t:b2,v:s.bytes[1],who:s.who,hub});
        lastTxEnd=b2+C.BYTE; t=b1+4*pass+(s.kind==='tx1t'?4:101)*pass; e.de=[b1,t];
      } else { // rx
        const bus = s.kind==='rx0'?'u0':(s.who==='turret'?'u1t':'u1c');
        const ledk = s.who==='turret'?'tur':(s.kind==='rx0'?'c1':'c2');
        if (s.ok){
          const r=Math.max(t,lastTxEnd)+C.REPLY;
          bytes.push({bus,dir:'rx',t:r,v:s.bytes[0],who:s.who,hub},{bus,dir:'rx',t:r+C.BYTE,v:s.bytes[1],who:s.who,hub});
          t=r+2*C.BYTE+pass; if(hub===1) led(ledk,true,t);
        } else { t=t+(C.COMM+1)*pass; e.timeout=true; if(hub===1) led(ledk,false,t); }
      }
      e.t1=t; steps.push(e);
      if (s.cs===50 || (s.cs===24 && !s.ok)) tok.push([t,hub,'NOT_COMM']);
      if (t>1.05) return;
    }
  };
  while (t<1.05){
    // default: WAIT_SCHEDULE. Single hub: PINC5 assumed high (link looped) → 26 passes.
    const w0=t; t += (C.WAITN+1)*pass; steps.push({cs:255,kind:'wait',t0:w0,t1:t,hub:1,cyc});
    runCycle(1); cyc++;
    if (D.pres.hub2 && t<1.05){ const w=t; t+=(C.WAITN+1)*pass; steps.push({cs:255,kind:'wait',t0:w,t1:t,hub:2,cyc}); runCycle(2); }
  }
  SCHED={steps,bytes,leds,tok,cycles:cyc};
  return SCHED;
}
function stepAt(t){ const s=schedule().steps; let lo=0,hi=s.length-1; while(lo<hi){const m=(lo+hi+1)>>1; if(s[m].t0<=t) lo=m; else hi=m-1;} return s[lo]; }
function ledAt(k,t){ const a=schedule().leds[k]; let v=false; for(const [tt,on] of a){ if(tt<=t) v=on; else break; } return v; }
function cycleLen(){ const s=schedule().steps.filter(x=>x.hub===1&&x.cs===255); return s.length>1? s[1].t0-s[0].t0 : 1; }

/* ---------------- user actions: what the buttons do in code ---------------- */
const A = {
  monSel(n){ act(`Turret: press monitor select ${n+1}`, tr=>{
    const T=D.tur;
    if(!T.power){ tr('Turret is off.'); return; }
    if(T.setup0){ setupPress(n,tr); return; }
    tr(`scan: 74HC165 chain → scan0 bit ${n} (“INPUT ORDER 7,5,4,3,1,2,6,8”); debounce: 16 equal scans (bounce,4) → flag0,0`);
    const cmd = 0x20|n|(T.studio&0x40?0x08:0);
    tr(`process → mtr${n+1}take: movlw b'${bin8(0x20|n)}' → chpole51 = ${hx(cmd)}${T.studio&0x40?' (btfsc studio,6 → bsf chpole51,3: studio 2)':''}`);
    tr(`hub case 25 polls the turret on the studio address ${hx(T.studio|0x20)}; set5 answers ${hx(T.studio)} + ${hx(cmd|0x40)} (bsf tx1,6)`);
    tr(`hub case 26: BIT5 set → R203_command_byte_studio${T.studio&0x40?2:1} = ${hx(cmd|0x40)}, turret_studio_take = YES, event_schedule = WAIT_SCHEDULE`);
    if (T.studio&0x40) D.hub.R203_command_byte_studio2 = 0x40|0x20|(8+n); else D.hub.R203_command_byte_studio1 = 0x40|0x20|n;
    const ok1=D.pres.c1&&D.mod.c1r203, ok2=D.pres.c2&&D.mod.c2r203;
    D.con.forEach((c,k)=>{ if((k?ok2:ok1)){ if(T.studio&0x40) c.s2=8+n; else c.s1=n; } });
    tr(`next cycle: case ${T.studio&0x40?'5/7':'0/2'} send 0x9E + ${hx((T.studio&0x40?0x28:0x20)|n|0x40)} with the take bit to ${[ok1&&'console 1',ok2&&'console 2'].filter(Boolean).join(' and ')||'no console (none answering)'}: both R203s switch the control-room monitor to source ${n+1}${T.studio&0x40?' (studio 2 bank 8–15)':''}`);
    T.mon=n; tr(`case 25 echoes the R203 state back; channel5 → sin${n+1}: clrf status0, bsf status0,${n} → 4094 refresh lights button ${n+1}`);
  }); },
  hostOn(on){ act(`Turret: press ${on?'ON':'OFF'}`, tr=>{
    const T=D.tur; if(!T.power){tr('Turret is off.');return;}
    if(T.setup0){ tr('Setup mode: process returns at once (btfsC setup0,0 / return) — ON and OFF do nothing.'); return; }
    tr(`scan1,${on?2:3} (sw${on?11:12}) → ${on?'mr1take: movlw b\'00111001\' (HOST ON)':'mr2take: movlw b\'00101001\' (HOST OFF)'} → chpole11 = ${on?'0x39':'0x29'}`);
    tr(`hub case 23 polls ${hx(0x80|turAddr()|0x20)}; norm1 answers ${hx(D.tur.chpole10)} ${on?'0x39':'0x29'}; case 24 → CH1_PROCESSING (45) stores R201_command_byte_ch1`);
    D.hub.R201_command_byte_ch1 = on?0x39:0x29; T.on=on;
    D.con.forEach((c,k)=>{ if(D.pres['c'+(k+1)]&&D.mod['c'+(k+1)+'r201']) c.on=on; });
    tr(`case 46 → console 1 R201 at ${hx(0x80|turAddr())} (${posTxt(turAddr())}); case 49 → console 2 R201: both input modules turn the mic channel ${on?'ON':'OFF'}`);
    tr(`cases 47/50 read the modules back (R201_consoleN_ch1 = cmd & 0x03); case 51 → next case 23 carries the state to the turret; channel1 → ${on?'on_take1 (status1,2)':'off_take1 (status1,3)'} lights ${on?'ON':'OFF'}`);
  }); },
  tb(down){ act(`Turret: T/B ${down?'pressed':'released'}`, tr=>{
    const T=D.tur; if(!T.power){tr('Turret is off.');return;}
    if(T.setup0){ if(down){ T.page = T.page===1?2:1; tr(`setup: scan1,5 → ch_set_flags = ${T.page} → page ${T.page===1?'MIC ADDRESS (T/B lit)':'STUDIO (T/B dark)'}`);} return; }
    if(down){
      T.wasOn=T.on; T.holding=true;
      tr('scan2,0 → talkback: talk1 = b\'10000010\' (talkback mode, remember CH1 state in talk1,1), bsf portb,7');
      tr('set1 → send_CHOFF: chpole11 = 0x29 (channel OFF), status1,3'); tr('next poll → send_CUEON: chpole11 = 0x38 (cue ON), status1,5 lights T/B');
      T.on=false; T.tb=true; D.hub.R201_command_byte_ch1=0x38;
      D.con.forEach((c,k)=>{ if(D.pres['c'+(k+1)]&&D.mod['c'+(k+1)+'r201']){ c.on=false; c.cue=true; } });
      tr('hub cases 46/49 pass both to console 1 and 2: mic OFF, CUE ON (talkback to the host through cue)');
    } else {
      T.holding=false; T.tb=false;
      tr('button released → talk1,4; send_CUEOFF: chpole11 = 0x28 (cue OFF)');
      tr(`send_CHST: talk1,1 says the channel was ${T.wasOn?'ON → on1: 0x39':'OFF → 0x29'}; bcf talk1,7 leaves talkback mode`);
      T.on=!!T.wasOn; D.hub.R201_command_byte_ch1=T.on?0x39:0x29;
      D.con.forEach((c,k)=>{ if(D.pres['c'+(k+1)]&&D.mod['c'+(k+1)+'r201']){ c.cue=false; c.on=T.on; } });
    }
  }); },
  dump(){ act('Turret: DUMP / NEXT EVENT', tr=>{
    tr('Nothing in 554951-1.asm reads these two buttons: scan only clocks sw1–8, sw11, sw12 and sw14 (sw9, sw10, sw13, sw15, sw16 are commented out).');
    tr('557572-1 Turret.txt: “a standard with the addition of a DB25M (J1)” → they are hard-wired contact closures to J1 for the automation system '+'(inferred)');
  }); },
  setupSw(){ act(`Turret rear: SETUP switch ${D.tur.setupSw?'IN':'OUT'}`, tr=>{
    const T=D.tur; T.setupSw=!T.setupSw;
    if(T.setupSw){ tr('PORTC,0 now high. INIT only tests it at power-up (BTFSC PORTC,0 → BSF SETUP0,0): cycle the turret power to enter setup.'); }
    else if (T.setup0){
      tr('setup: BTFSs PORTC,0 → exit_setup: write_enable, eew × 5 into the 93LC66B (EERW.ASM): ch1..ch4 and ch5 (studio)');
      tr(`EEPROM 0: chpole10 = ${hx(T.chpole10)} (mic address ${turAddr()}), 4: chpole50 = studio = ${hx(T.studio)} (studio ${turStudio()+1})`);
      T.setup0=false; tr('BcF SETUP0,0 → normal polling resumes; the hub sees a new address and re-learns it (case 24)');
      D.hub.turret_address_ch1=0x80|turAddr();
    } else tr('Switch back in; nothing else happens.');
  }); },
  turPower(){ act(`Turret power ${D.tur.power?'OFF':'ON'}`, tr=>{
    const T=D.tur; T.power=!T.power;
    if(!T.power){ tr('Turret silent: the hub’s case 24 times out (COMMUNICATION_COUNTER), turns COM3 off, clears turret_address_ch1…4 and goes to WAIT_SCHEDULE.'); return; }
    tr('INIT: power-up delay (incfsz scan0/1/2 ≈ '+SIM.fmtDur(0x20000*3*4/C.XTAL)+' '+'), ports, SPBRG = 7 (9600 at 4.9152 MHz), eer × 5 from the 93LC66B');
    if (T.setupSw){ T.setup0=true; T.page=1; tr('BTFSC PORTC,0 → BSF SETUP0,0: SETUP MODE. Page 1 (T/B lit) shows the mic address in binary on buttons 1–5 (2⁴…2⁰).'); }
    else tr('Setup switch in → normal mode.');
  }); },
  plug(k){ act(`${{c1:'Console #1',c2:'Console #2',tur:'Host turret',hub2:'Second hub + turret'}[k]} ${D.pres[k]?'disconnected':'connected'}`, tr=>{
    D.pres[k]=!D.pres[k];
    if(k==='hub2') tr(D.pres.hub2?'Two-hub system: hub #1 PC7 (CONSOLE1_NOT_COMM) → link DB9 → hub #2 PINC5; the hubs take turns on the console buses.':'Single hub again.');
    else tr(D.pres[k]?'Replies come back; the COM LED lights on the next good read.':`Its reads now end by timeout (${C.COMM+1} passes ≈ ${SIM.fmtDur((C.COMM+1)*C.LOOP)} ${'— pass time inferred'}); the COM LED goes out; the hub keeps polling the others.`);
  }); },
  module(k){ act(`${k.slice(0,2)==='c1'?'Console 1':'Console 2'} ${k.slice(2).toUpperCase()} ${D.mod[k]?'pulled':'re-seated'}`, tr=>{
    D.mod[k]=!D.mod[k];
    tr('Manual appendix: “If a console is communicating, but a module in the console is not communicating the communication interface will flash the console’s respective front panel led”.');
    tr('In the code there is no flash routine: each good read does CONSOLEn_LED_ON and each timeout CONSOLEn_LED_OFF, so a silent module makes the LED blink once per cycle. More silent modules → more dark steps.');
  }); },
  conMon(k,n){ act(`Console ${k+1} R203: monitor source ${n+1}`, tr=>{
    if(!(D.pres['c'+(k+1)]&&D.mod['c'+(k+1)+'r203'])){ tr('That R203 is not answering.'); return; }
    D.con[k].s1=n; const h=D.hub;
    tr(`case ${k?3:1}: uart${k}_command_byte ${hx(0x40|n)} ≠ console${k+1}_studio1_command → R203_command_byte_studio1 = ${hx(n|0x60)} (BIT5 | BIT6)${k?'':', console1_studio1_take = YES'}`);
    h.R203_command_byte_studio1=0x60|n;
    const o=1-k; if(D.pres['c'+(o+1)]&&D.mod['c'+(o+1)+'r203']){ D.con[o].s1=n; tr(`case ${k?0:2} (next cycle for console ${o+1}) sends it with the take bit → console ${o+1}’s R203 follows`); }
    if(turStudio()===STUDIO1){ D.tur.mon=n; tr('case 25 sends it to the turret (studio 1) → its monitor-select LED moves to '+(n+1)); }
  }); },
  conOn(k){ act(`Console ${k+1} R201 (turret mic channel): CH ${D.con[k].on?'OFF':'ON'}`, tr=>{
    if(!(D.pres['c'+(k+1)]&&D.mod['c'+(k+1)+'r201'])){ tr('That R201 is not answering.'); return; }
    const on=!D.con[k].on; D.con[k].on=on;
    tr(`case ${k?50:47}: R201_console${k+1}_ch1 = ${hx(on?1:0)} (cmd & 0x03)`);
    tr(`case ${k?51:48}: consoles disagree on BIT0 → R201_command_byte_ch1 = ${on?'0x39':'0x29'} → sent to the other console${k?' (case 51 uses turret_command_ch1 / console 2 value)':''}`);
    const o=1-k; if(D.pres['c'+(o+1)]&&D.mod['c'+(o+1)+'r201']) D.con[o].on=on;
    D.tur.on=on; D.hub.R201_command_byte_ch1=on?0x39:0x29; tr(`turret ON/OFF LEDs follow on the next case 23 (channel1 → ${on?'on_take1':'off_take1'})`);
  }); },
  vol(k,dir){ act(`Console ${k+1} R203 encoder: volume ${dir>0?'UP':dir<0?'DOWN':'UP+DOWN (mute)'}`, tr=>{
    const V=D.vlc;
    tr(`R203 custom (encdc100.asm, PIC16C54, Tim Clarke 25 Sep 2000): ${dir>0?'PORTB,5 UP pulse':dir<0?'PORTB,4 DOWN pulse':'both UP and DOWN = mute'} → R203 termination 8A (${dir>0?'−':'+'})`);
    tr(`554951-2 input: PORTC ${dir>0?'UP':'DOWN'}${k+1} → input_reg → chk_vol sets action_flag,${dir>0?1:2} (any of the four consoles counts the same)`);
    if(dir===0){ if(!V.mute){ V.table_count2=V.table_count1; V.table_count1=0xFF; V.mute=true; tr('chk_mute: both bits of a pair high → vol_mute: table_count2 = table_count1, table_count1 = 0xFF, PORTB,7 MUTE LED'); } else { V.table_count1=V.table_count2; V.mute=false; tr('return_mute: released → table_count1 = table_count2 (mute is momentary)'); } }
    else if(V.mute){ tr('In mute: debounce returns at once — nothing changes until the mute is released.'); }
    else {
      const tc=V.table_count1; let n=tc;
      if(dir>0){ if(tc===0) tr('vol_inc: table_count1 already 0 = maximum → no change'); else { n = tc>=100? tc-5 : tc-1; tr(`vol_inc: table_count1 ${tc} → ${n} (${tc>=100?'≥ 100 → dec_5':'decf'})`);} }
      else { if(tc===0xFF) tr('vol_dec: 0xFF = minimum'); else { n = tc>=100? tc+5 : tc+1; tr(`vol_dec: table_count1 ${tc} → ${n} (${tc>=100?'≥ 100 → inc_5':'incf'})`);} }
      V.table_count1=n&255;
    }
    const dac=vlcDac(V.table_count1); tr(`refresh_vol: ${V.table_count1<187?'db_table['+V.table_count1+']':'linear'} = ${dac} → dac1_reg = dac2_reg = ${dac} → output_DtoA (LT1451) → SSM2018 VCAs, both inputs together`);
  }); },
  cough(which,down){ act(`R221 Mode 7: Control in ${which==='A'?3:4} (Cough ${which}) ${down?'pulled low':'released'}`, tr=>{
    const R=D.r221;
    if(down){
      const selA=R.inputA;
      if((which==='A')!==selA){ tr(`mode7: ${which==='A'?'btfsc status1,3 … goto in72':'btfss status1,3 … goto in71'} — input ${which} is not the selected input; the cue-only branch (${which==='A'?'cue_a':'cue_b'}) is unreachable because its goto is commented out → nothing happens`); tr('The manual says this should turn CUE on while held.'); R.held=null; return; }
      R.held=which; R.wasOn=R.chon; R.cue=true; R.chon=false;
      tr(`cough_${which.toLowerCase()}_input_${which.toLowerCase()}: bsf tim_flag,6, bsf status1,1 (CUE on), tim_flag,${which==='A'?1:0}; tim_flag,7 = channel was ${R.wasOn?'ON':'OFF'}; bcf status1,0 (channel OFF)`);
      tr(`control_outputs: Control out ${which==='A'?3:4} = CUE ON + IN${which} tally (portE,${which==='A'?1:''}${which==='A'?'':'porta,5'})`);
    } else {
      if(!R.held){ tr('Nothing was held.'); return; }
      R.cue=false; if(R.wasOn) R.chon=true; R.held=null;
      tr(`shut_off: bcf tim_flag,6/5, bcf status1,1 (CUE off); tim_flag,7 ${R.wasOn?'set → bsf status1,0: channel back ON':'clear → channel stays OFF'}`);
    }
  }); },
  r221sel(){ act('R221: input select A/B', tr=>{ D.r221.inputA=!D.r221.inputA; tr(`status1,3 → input ${D.r221.inputA?'A':'B'} selected`); }); },
  r221on(){ act('R221: CH ON (alternate action)', tr=>{ D.r221.chon=!D.r221.chon; tr(`Control in 1 / CH ON pushbutton → status1,0 = ${D.r221.chon?1:0}; Control out ${D.r221.inputA?1:2} = CH ON + IN${D.r221.inputA?'A':'B'} tally`); }); },
  reset(){ D.pres={c1:true,c2:true,tur:true,hub2:false}; Object.keys(D.mod).forEach(k=>D.mod[k]=true);
    D.con=[{s1:0,s2:8,tb:false,meter:8,on:false,cue:false},{s1:0,s2:8,tb:false,meter:8,on:false,cue:false}];
    Object.assign(D.hub,{R203_command_byte_studio1:0x40,R203_command_byte_studio2:0x48,R201_command_byte_ch1:0x29});
    Object.assign(D.tur,{power:true,setupSw:false,setup0:false,page:1,chpole10:0x80,studio:0x9E,on:false,tb:false,mon:0,holding:false});
    Object.assign(D.vlc,{table_count1:0,table_count2:0,mute:false}); Object.assign(D.r221,{inputA:true,chon:true,cue:false,held:null});
    D.log=[]; D.lastAct=-1; SCHED_KEY=''; SIM.refresh(); },
};
function setupPress(n,tr){
  const T=D.tur;
  if(T.page===1){
    if(n>4){ tr(`proc_setup: button ${n+1} has no meaning on the mic-address page`); return; }
    const bit=[16,8,4,2,1][n]; const a=turAddr()^bit; T.chpole10=0x80|a;
    tr(`proc_setup: scan0,${n} → xorwf status0 with ${[1,2,4,8,16][n]}; setupch1 translates ch1_set bit ${n} → chpole10 bit ${4-n} (2^${4-n})`);
    tr(`mic address = ${a} (${bin8(a).slice(3)}b) → ${posTxt(a)}`);
  } else {
    if(n!==7){ tr('studio page: only button 8 (scan0,7 → xorwf 128) matters'); return; }
    T.studio ^= 0x40; tr(`proc_setup: scan0,7 → ch5_set bit 7 → setupch5: chpole50 = b'10011110' ${T.studio&0x40?'| bit 6 = 0xDE (STUDIO 2, LED on)':'= 0x9E (STUDIO 1, LED off)'}`);
  }
}
function posTxt(a){ const s=[`R2K-28 position ${a+1}`]; if(a>=8) s.push(`R2K-20 position ${a-7}`); if(a>=16) s.push(`R2K-12 position ${a-15}`); return s.join(' · '); }
const DBT = [0,0,2,4,5,7,9,11,12,14,16,17,19,21,22,24,26,27,29,31,32,34,36,37,39,40,42,43,45,46,48,50,51,53,54,56,57,58,60,61,63,64,66,67,69,70,71,73,74,75,77,78,79,81,82,83,85,86,87,89,90,91,92,94,95,96,97,98,100,101,102,103,104,105,107,108,109,110,111,112,113,114,115,116,118,119,120,121,122,123,124,125,126,127,128,129,129,130,131,132,133,134,135,136,137,138,138,139,140,141,142,143,143,144,145,146,147,147,148,149,149,150,151,152,152,153,154,154,155,156,156,157,158,158,159,159,160,161,161,162,162,163,163,164,164,165,165,166,166,167,167,168,168,169,169,170,170,170,171,171,172,172,172,173,173,173,174,174,174,175,175,175,175,176,176,176,176,177,177,177,177,177,178,178,178,178,178,178];
function vlcDac(tc){ return tc<187 ? DBT[tc] : tc; }
function vlcGainDb(tc){ if(tc>=255) return -Infinity; return 24 - vlcDac(tc)*(100/255); }   // dB per DAC step INFERRED

/* ---------------- drawing helpers ---------------- */
function led(x,y,on,col,r){ return `<circle cx="${x}" cy="${y}" r="${r||7}" fill="${on?col:'#2b302b'}" stroke="#000" stroke-width="1"/>${on?`<circle cx="${x}" cy="${y}" r="${(r||7)*2}" fill="${col}" opacity=".18"/>`:''}`; }
function pbtn(x,y,w,h,label,lit,col,act,tip){ return `<g class="hot" data-act="${act}" style="cursor:pointer"><title>${tip||label}</title><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="5" fill="${lit?col:'#3a3e42'}" stroke="#111" stroke-width="2"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="${h>40?13:11}" fill="${lit?'#111':'#ddd'}" font-weight="600">${label}</text></g>`; }
/* turret top: silk = 557572-1/SILK.cdr (text stripped; labels re-anchored), 2 px per pt, crop origin (30,250) pt */
function turretSVG(t){
  const T=D.tur, P=(x,y)=>[(x-30)*2,(y-250)*2];
  const on=T.power, setup=T.setup0;
  let s=`<svg viewBox="0 0 1120 990" style="width:100%;max-width:560px;background:#1c1e20;border-radius:10px"><image href="${ASSET}55xxxx-systems-turret-front.png" x="0" y="0" width="1120" height="990"/>`;
  // big lit buttons inside the rings (ring centres from the silk)
  const rings=[['ON',111,297,'hostOn1'],['DUMP',219,297,'dump'],['OFF',111,378,'hostOn0'],['T/B',219,378,'tb'],['NEXT EVENT',328,378,'dump']];
  const flashOn = Math.floor(t/0.5)%2===0;   // flash routine ≈ 0.5 s toggle INFERRED
  rings.forEach(([l,x,y,a])=>{ const [X,Y]=P(x,y);
    let lit=false;
    if(on&&!setup){ if(l==='ON') lit=T.on; if(l==='OFF') lit=!T.on; if(l==='T/B') lit=T.tb; }
    if(on&&setup&&l==='T/B') lit=T.page===1;
    s+=`<g class="hot" data-act="${a}" style="cursor:pointer"><title>${l}${a==='dump'?' — not read by the PIC (J1 contact closure, inferred)':''}</title><circle cx="${X}" cy="${Y}" r="50" fill="${lit?(l==='OFF'?'#ff6a4a':'#ffd23a'):'#34383c'}" stroke="#111" stroke-width="3"/><text x="${X}" y="${Y+5}" text-anchor="middle" font-size="${l.length>4?13:17}" font-weight="700" fill="${lit?'#111':'#e8e8e4'}">${l}</text></g>`;
    s+=`<text x="${X}" y="${Y+86}" text-anchor="middle" font-size="15" fill="#efefe9">${l}</text>`;
  });
  // monitor selectors 1–8 on the drill crosshairs
  [84,138,192,246,300,354,408,462].forEach((x,i)=>{ const [X,Y]=P(x,498);
    let lit=false;
    if(on&&!setup) lit=T.mon===i;
    if(on&&setup){ if(T.page===1&&i<5) lit=!!((turAddr()>>(4-i))&1); if(T.page===2&&i===7) lit=!!(T.studio&0x40); }
    s+=`<g class="hot" data-act="mon${i}" style="cursor:pointer"><title>Monitor selector ${i+1}${setup?' — setup: '+(T.page===1?(i<5?'address bit 2^'+(4-i):'unused'):(i===7?'studio 1/2':'unused')):''}</title><rect x="${X-34}" y="${Y-34}" width="68" height="68" rx="6" fill="${lit?'#7dff6a':'#34383c'}" stroke="#111" stroke-width="3"/><text x="${X}" y="${Y+7}" text-anchor="middle" font-size="22" font-weight="700" fill="${lit?'#111':'#eee'}">${i+1}</text></g><text x="${X}" y="${Y+60}" text-anchor="middle" font-size="15" fill="#efefe9">${i+1}</text>`; });
  const [hx1,hy1]=P(530,708); s+=`<circle cx="${hx1}" cy="${hy1}" r="16" fill="#111" stroke="#999" stroke-width="3"><title>HEADSET jack</title></circle><text x="${hx1-30}" y="${hy1+50}" font-size="15" fill="#efefe9">HEADSET</text>`;
  const [kx,ky]=P(533,420); s+=`<circle cx="${kx}" cy="${ky}" r="22" fill="#2a2a2a" stroke="#888" stroke-width="3"><title>Small control on the arc (headset level) — function not labelled in the silk, inferred</title></circle>`;
  s+=`<text x="20" y="975" font-size="14" fill="#9aa">${on?(setup?`SETUP — page ${T.page===1?'MIC ADDRESS ('+turAddr()+')':'STUDIO ('+(turStudio()+1)+')'}`:`mic ${turAddr()} · studio ${turStudio()+1} · ${T.on?'ON':'OFF'}${T.tb?' · T/B':''}`):'POWER OFF'}</text></svg>`;
  return s;
}
function turretRearSVG(){
  const T=D.tur, P=(x,y)=>[(x-10)*2,(y-55)*2];
  let s=`<svg viewBox="0 0 1184 270" style="width:100%;max-width:560px;background:#1c1e20;border-radius:10px"><image href="${ASSET}55xxxx-systems-turret-rear.png" x="0" y="0" width="1184" height="270"/>`;
  const db=(cx,cy,l,tip)=>{const [X,Y]=P(cx,cy); return `<g><title>${tip}</title><path d="M${X-95},${Y-22} h190 l-12,44 h-166 z" fill="#c9c9c2" stroke="#222" stroke-width="2"/><text x="${X}" y="${Y+5}" text-anchor="middle" font-size="13" fill="#222">${l}</text></g>`;};
  s+=db(319,113,'DB25M J1','J1: added DB25M (557572-1 Turret.txt) — DUMP / NEXT EVENT closures (inferred)')+db(319,175,'R2K I/O','R2K I/O: RS-485 to the hub TURRET port (TX 21/22, RX 10/11, FUNCTIONAL-557572)');
  const [X,Y]=P(445,178); s+=`<g class="hot" data-act="setupsw" style="cursor:pointer"><title>SETUP switch (PORTC,0), read only at power-up</title><rect x="${X-22}" y="${Y-22}" width="44" height="44" rx="4" fill="${T.setupSw?'#ffb43a':'#555'}" stroke="#111" stroke-width="2"/><text x="${X}" y="${Y+5}" text-anchor="middle" font-size="12" fill="#111">${T.setupSw?'OUT':'IN'}</text></g>`;
  const [px,py]=P(522,143); s+=`<g class="hot" data-act="turpwr" style="cursor:pointer"><title>Power (115 VAC) — click to cycle turret power</title><rect x="${px-34}" y="${py-26}" width="68" height="52" rx="4" fill="#111" stroke="#888" stroke-width="2"/><text x="${px}" y="${py+5}" text-anchor="middle" font-size="13" fill="${T.power?'#7dff6a':'#888'}">${T.power?'PWR':'off'}</text></g>`;
  return s+'</svg>';
}
/* hub front/rear: silk = 554951-3/554951-3SLKcurve.cdr, crop origins (70,430) and (70,214) pt */
function hubSVG(t, n){
  const P=(x,y)=>[(x-70)*2,(y-430)*2]; const tt = n===2 ? null : t;
  let s=`<svg viewBox="0 0 1250 240" style="width:100%;background:#1a1b1c;border-radius:8px"><image href="${ASSET}55xxxx-systems-hub-front.png" x="0" y="0" width="1250" height="240"/>`;
  [['c1',307],['c2',410],['tur',513]].forEach(([k,x])=>{ const [X,Y]=P(x,490); s+=`<g><title>${{c1:'COM1 = console #1 (PORTA bit 0)',c2:'COM2 = console #2 (PORTA bit 1)',tur:'COM3 = host turret (PORTA bit 2)'}[k]}</title>${led(X,Y,tt!==null&&ledAt(k,tt),'#7dff6a',11)}</g>`; });
  const [px,py]=P(90,490); s+=`<circle cx="${px}" cy="${py}" r="10" fill="${'#ff4b3a'}"><title>power LED (554951-3 WIRING: POWER LED)</title></circle>`;
  return s+`<text x="1230" y="232" text-anchor="end" font-size="16" fill="#9aa">${n===2?'hub #2 (state not modelled)':'hub #1 · event_schedule = '+stepAt(t).cs}</text></svg>`;
}
function hubRearSVG(){
  const P=(x,y)=>[(x-70)*2,(y-214)*2];
  let s=`<svg viewBox="0 0 1250 240" style="width:100%;background:#1a1b1c;border-radius:8px"><image href="${ASSET}55xxxx-systems-hub-rear.png" x="0" y="0" width="1250" height="240"/>`;
  const db=(cx,cy,l,k)=>{const [X,Y]=P(cx,cy); return `<g class="hot" data-act="plug_${k}" style="cursor:pointer"><title>${l}: click to plug / unplug</title><path d="M${X-95},${Y-22} h190 l-12,44 h-166 z" fill="${D.pres[k]?'#c9c9c2':'#555'}" stroke="#222" stroke-width="2"/><text x="${X}" y="${Y+5}" text-anchor="middle" font-size="13" fill="#222">${D.pres[k]?'DB25F connected':'unplugged'}</text></g>`;};
  s+=db(308,248,'TURRET','tur')+db(191,287,'R2K-1','c1')+db(425,287,'R2K-2','c2');
  s+=`<g class="hot" data-act="plug_hub2" style="cursor:pointer"><title>LINK DB9F — on FUNCTIONAL-557572 but not on the 2005 silk (position inferred)</title><path d="M1060,40 h90 l-8,32 h-74 z" fill="${D.pres.hub2?'#c9c9c2':'#555'}" stroke="#222" stroke-width="2"/><text x="1105" y="62" text-anchor="middle" font-size="12" fill="#222">LINK</text><text x="1105" y="92" text-anchor="middle" font-size="12" fill="#ffb43a">inferred</text></g>`;
  return s+'</svg>';
}
function vlcSVG(){
  const P=(x,y)=>[(x)*2,(y-494)*2], V=D.vlc;
  let s=`<svg viewBox="0 0 1240 236" style="width:100%;background:#1a1b1c;border-radius:8px"><image href="${ASSET}55xxxx-systems-vlc-rear.png" x="0" y="0" width="1240" height="236"/>`;
  [[94,'IN 1'],[154,'IN 2'],[246,'OUT']].forEach(([x,l])=>{ const [X,Y]=P(x,560); s+=`<rect x="${X-34}" y="${Y-14}" width="68" height="24" rx="2" fill="#2f7a3a" stroke="#111"><title>${l} terminal block (+ − G)</title></rect>`; });
  const [cx,cy]=P(381,552); s+=`<path d="M${cx-60},${cy-16} h120 l-10,32 h-100 z" fill="#c9c9c2" stroke="#222"><title>CONTROL DB25F: UP/DOWN from each R203 (pins 16/14 console 1, 15/17 console 2 — FUNCTIONAL-557572)</title></path>`;
  const g=vlcGainDb(V.table_count1);
  s+=`<text x="640" y="40" font-size="16" fill="#e8e8e4">table_count1 = ${V.table_count1}  ·  DAC = ${vlcDac(V.table_count1)}  ·  ${V.mute?'MUTE':(isFinite(g)?'gain ≈ '+g.toFixed(1)+' dB':'off')}</text>${led(620,34,V.mute,'#ff4b3a',8)}`;
  return s+'</svg>';
}
/* R2K console strip — no R2K silk in this folder: drawn as a schematic strip, not to scale */
function consoleSVG(k){
  const c=D.con[k], ok=m=>D.pres['c'+(k+1)]&&D.mod['c'+(k+1)+m];
  let s=`<svg viewBox="0 0 560 150" style="width:100%;background:#202326;border-radius:8px"><text x="8" y="16" font-size="12" fill="#ccc">CONSOLE #${k+1} (R2K) — schematic strip, not to scale</text>`;
  // R201 input (turret mic)
  s+=`<rect x="8" y="24" width="120" height="118" rx="5" fill="${ok('r201')?'#2c3135':'#402020'}" stroke="#555"/><text x="68" y="40" text-anchor="middle" font-size="11" fill="#ddd">R201 mic ${turAddr()}</text>`;
  s+=pbtn(68,70,90,28,'CH ON',c.on,'#ffd23a',`con${k}on`,'R201 CH ON/OFF (alternate action)')+`<text x="68" y="110" text-anchor="middle" font-size="11" fill="${c.cue?'#ffb43a':'#888'}">CUE ${c.cue?'ON':'off'}</text>`;
  s+=`<g class="hot" data-act="mod_c${k+1}r201" style="cursor:pointer"><text x="68" y="134" text-anchor="middle" font-size="10" fill="#9ab" text-decoration="underline">${ok('r201')?'pull module':'re-seat'}</text></g>`;
  // R203 monitor
  s+=`<rect x="136" y="24" width="300" height="118" rx="5" fill="${ok('r203')?'#2c3135':'#402020'}" stroke="#555"/><text x="286" y="40" text-anchor="middle" font-size="11" fill="#ddd">R203 control-room monitor (studio 1 bank)</text>`;
  for(let i=0;i<8;i++) s+=pbtn(160+i*35,66,30,24,String(i+1),c.s1===i,'#7dff6a',`con${k}mon${i}`,'R203 source '+(i+1));
  s+=pbtn(190,104,56,26,'VOL ▲',false,'#fff',`vol${k}u`,'Brass optical encoder clockwise → UP pulse')+pbtn(254,104,56,26,'VOL ▼',false,'#fff',`vol${k}d`,'counter-clockwise → DOWN pulse')+pbtn(330,104,80,26,'UP+DN',D.vlc.mute,'#ff6a4a',`vol${k}m`,'both lines together = mute (momentary, press again to release)');
  s+=`<text x="400" y="134" font-size="10" fill="#9ab">studio 2: ${c.s2+1}</text>`;
  s+=`<g class="hot" data-act="mod_c${k+1}r203" style="cursor:pointer"><text x="150" y="134" font-size="10" fill="#9ab" text-decoration="underline">${ok('r203')?'pull R203':'re-seat R203'}</text></g>`;
  // R204
  s+=`<rect x="444" y="24" width="108" height="118" rx="5" fill="${ok('r204')?'#2c3135':'#402020'}" stroke="#555"/><text x="498" y="40" text-anchor="middle" font-size="11" fill="#ddd">R204 meter</text><text x="498" y="80" text-anchor="middle" font-size="20" fill="#7dff6a">${c.meter+1}</text>`;
  s+=`<g class="hot" data-act="mod_c${k+1}r204" style="cursor:pointer"><text x="498" y="134" text-anchor="middle" font-size="10" fill="#9ab" text-decoration="underline">${ok('r204')?'pull module':'re-seat'}</text></g>`;
  return s+'</svg>';
}
function bindPanel(root){
  root.querySelectorAll('[data-act]').forEach(g=> g.addEventListener('click', ev=>{ ev.stopPropagation(); doAct(g.dataset.act); }));
}
function doAct(a){
  let m;
  if(a==='hostOn1') return A.hostOn(true); if(a==='hostOn0') return A.hostOn(false);
  if(a==='tb'){ if(D.tur.setup0) return A.tb(true); return A.tb(!D.tur.holding); }
  if(a==='dump') return A.dump(); if(a==='setupsw') return A.setupSw(); if(a==='turpwr') return A.turPower();
  if((m=a.match(/^mon(\d)$/))) return A.monSel(+m[1]);
  if((m=a.match(/^plug_(\w+)$/))) return A.plug(m[1]);
  if((m=a.match(/^mod_(\w+)$/))) return A.module(m[1]);
  if((m=a.match(/^con(\d)on$/))) return A.conOn(+m[1]);
  if((m=a.match(/^con(\d)mon(\d)$/))) return A.conMon(+m[1],+m[2]);
  if((m=a.match(/^vol(\d)([udm])$/))) return A.vol(+m[1], m[2]==='u'?1:m[2]==='d'?-1:0);
  if(a==='coughA1') return A.cough('A',true); if(a==='coughA0') return A.cough('A',false);
  if(a==='coughB1') return A.cough('B',true); if(a==='coughB0') return A.cough('B',false);
  if(a==='r221sel') return A.r221sel(); if(a==='r221on') return A.r221on();
}

/* =====================================================================
   Timeline lanes
   ===================================================================== */
const COL = { u0:'#3b82c4', u1c:'#8a5cc4', u1t:'#c47a2c', rx:'#2f9a5a' };
function drawBytes(c,X,t0,t1,y,h,bus){
  const B=schedule().bytes;
  for(const b of B){ if(b.bus!==bus || b.t+C.BYTE<t0 || b.t>t1) continue;
    const xa=X(b.t), xb=X(b.t+C.BYTE), w=xb-xa;
    const col = b.dir==='rx'?COL.rx:COL[bus];
    if (w>90){ // bit level: start, 8 data LSB first, stop
      c.strokeStyle=col; c.lineWidth=1.6; c.beginPath();
      const bits=[0]; for(let i=0;i<8;i++) bits.push((b.v>>i)&1); bits.push(1);
      let px=X(b.t-C.BYTE*0.1), lv=1; c.moveTo(px, y+4);
      bits.forEach((bit,i)=>{ const x=X(b.t+i/C.BAUD); const yy= bit? y+4 : y+h-4; c.lineTo(x, lv? y+4:y+h-4); c.lineTo(x,yy); lv=bit;
        if (X(b.t+(i+1)/C.BAUD)-x>22){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(i===0?'S':i===9?'P':String(bit), x+3, y+h/2+3); } });
      c.lineTo(X(b.t+C.BYTE), y+4); c.lineTo(X(b.t+C.BYTE*1.1), y+4); c.stroke();
      c.fillStyle=col; c.font='bold 11px '+SIM.css('--mono'); c.fillText(hx(b.v)+' '+b.who+(b.hub===2?' (hub 2)':''), xa+2, y+11);
    } else {
      c.fillStyle=col; c.globalAlpha=b.hub===2?0.45:1; c.fillRect(xa, y+4, Math.max(1.5,w), h-8); c.globalAlpha=1;
      if (w>26){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(hx(b.v).slice(2), xa+2, y+h/2+4); }
    }
  }
}
function lanes(){
  const ink=SIM.css('--ink'), acc=SIM.css('--accent'), warn=SIM.css('--warn');
  const L=[
    {label:'Hub main loop (≈40 µs pass, inferred)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.LOOP,0,C.LOOP*0.3,SIM.css('--ink2'),'main() passes'); }},
    {label:'MASTER_CONTROL event_schedule', h:30, draw(c,X,t0,t1,y,h){
      for(const s of schedule().steps){ if(s.t1<t0||s.t0>t1) continue; const xa=X(s.t0), xb=X(s.t1);
        c.fillStyle = s.cs===255? (s.hub===2?'#999':SIM.css('--grid')) : s.timeout? SIM.css('--bad') : s.kind==='pass'? '#aaa' : (s.kind==='tx0'||s.kind==='rx0')? COL.u0 : s.who==='turret'? COL.u1t : COL.u1c;
        c.globalAlpha = s.hub===2?0.4:0.85; c.fillRect(xa,y+3,Math.max(1,xb-xa-0.5),h-6); c.globalAlpha=1;
        if(xb-xa>16){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText((s.hub===2?'h2:':'')+(s.cs===255?'wait':s.cs), xa+2, y+h/2+4); } } }},
    {label:'UART0 ↔ console #1 (U2/U3)', h:30, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,'u0'); }},
    {label:'UART1 ↔ console #2 (U4/U5)', h:30, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,'u1c'); }},
    {label:'UART1 ↔ turret (U6/U7)', h:30, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,'u1t'); }},
    {label:'75176 driver enable (PF3 / PE6 / PD4)', h:22, draw(c,X,t0,t1,y,h){
      for(const s of schedule().steps){ if(!s.de||s.de[1]<t0||s.de[0]>t1) continue; c.fillStyle=s.kind==='tx0'?COL.u0:s.kind==='tx1t'?COL.u1t:COL.u1c; c.globalAlpha=s.hub===2?.35:.7; c.fillRect(X(s.de[0]),y+5,Math.max(1,X(s.de[1])-X(s.de[0])),h-10); c.globalAlpha=1; } }},
    ...['c1','c2','tur'].map((k,i)=>({label:`COM${i+1} LED (PORTA ${i})`, h:18, draw(c,X,t0,t1,y,h){
      const a=schedule().leds[k]; for(let j=0;j<a.length;j++){ const [ta,on]=a[j], tb=j+1<a.length?a[j+1][0]:1.1; if(!on||tb<t0||ta>t1) continue; c.fillStyle='#3fbf4a'; c.fillRect(X(ta),y+4,Math.max(1,X(tb)-X(ta)),h-8); } }})),
  ];
  if (D.pres.hub2) L.push({label:'Link: PC7 → other hub PINC5', h:20, draw(c,X,t0,t1,y,h){
    for(const s of schedule().steps){ if(s.cs!==255||s.t1<t0||s.t0>t1) continue; c.fillStyle=s.hub===1?warn:'#999'; c.fillRect(X(s.t0),y+4,Math.max(1,X(s.t1)-X(s.t0)),h-8); }
    c.fillStyle=ink; c.font='10px '+SIM.css('--sans'); c.fillText('orange = hub #1 waiting for the token, grey = hub #2 waiting', X(t0)+4, y+h-5); }});
  L.push({label:'Turret PIC loop (≈250 µs, inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.TLOOP,0,C.TLOOP*0.3,COL.u1t,'turret passes (scan, debounce, refresh 4094, scanu…)'); }});
  return L;
}

/* =====================================================================
   Tabs
   ===================================================================== */
function jobCard(j, big){
  const [id,yr,cu,kind,what,code]=j;
  return `<div class="card" style="${big?'':'margin:0'}${id===D.job?';outline:2px solid var(--accent)':''}"><h2 style="font-size:${big?15:13.5}px">${id} · ${kind} <span class="muted small">(${Y(yr)})</span></h2>
    <div class="small">${cu?`<span class="chip">${cu}</span>`:'<span class="chip">customer not named</span>'}<span class="chip mono">${code}</span>${id==='557572'?'<span class="chip" style="background:var(--accent);color:#fff">main simulation</span>':''}</div>
    <p class="small" style="margin:6px 0 0">${what}</p></div>`;
}
function jobSelect(){
  return `<label class="small">Job <select id="jobSel">${JOBS.map(j=>`<option value="${j[0]}" ${j[0]===D.job?'selected':''}>${j[0]} — ${j[3]}${j[2]?' · '+j[2]:''}</option>`).join('')}</select></label>`;
}
function bindJobSel(m){ const s=m.querySelector('#jobSel'); if(s) s.onchange=()=>{ D.job=s.value; SIM.refresh(); m.querySelector('#jobCard') && (m.querySelector('#jobCard').innerHTML=jobInfo()); }; }
function jobInfo(){
  const j=JOBS.find(x=>x[0]===D.job);
  const fam = ['554951','555529','557572'].includes(D.job);
  return jobCard(j,true).replace('</div>\n','</div>') + (D.job==='557572'?'':`<p class="small muted" style="margin:-8px 0 12px">${fam?'This job is part of the same R2K hub/turret family: the simulator below runs the 557572 build, the most complete one (2008|41 code, manual appendix, functional diagram).':'This job has no running model of its own (drawings, wiring or small code). The simulator below stays on 557572, the most complete job.'}</p>`);
}

function viewSim(m){
  window.__55xxxxActive=false;
  m.innerHTML = `<div class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><b>Customer job</b>${jobSelect()}<span class="small muted">${JOBS.length} jobs + ${SKELETONS.length} empty folder skeletons — every one has a card on the Jobs tab</span></div>
  <div id="jobCard">${jobInfo()}</div>
  <div class="grid2"><div>
    ${card('557572 host turret — top (557572-1/SILK.cdr) and rear', `<div id="tur"></div><div id="turR" style="margin-top:6px"></div><p class="small muted">Labels re-anchored: libcdr put ON/OFF/DUMP/T/B/NEXT EVENT 264 pt below their rings; they keep the ring grid, so they belong under the rings ${inf('alignment')}. Click buttons; T/B toggles held/released; the rear SETUP switch is read only at power-up.</p>`)}
    ${card('554951-3 communication hub — front and rear (554951-3SLKcurve.cdr)', `<div id="hub"></div><div id="hubR" style="margin-top:6px"></div><p class="small muted">Click a rear connector to unplug it. COM LEDs follow the real poll results at the playhead.</p>`)}
    ${card('The two R2K consoles', `<div id="con0"></div><div id="con1" style="margin-top:6px"></div>`)}
    ${card('554951-2 volume level controller — rear (554951-2m2curve.cdr)', `<div id="vlc"></div>`)}
    ${card('R221 input module, Mode 7 (cough)', `<div id="r221"></div>`)}
  </div><div>
    ${card('What the firmware did', `<div id="trace" class="log" style="max-height:340px"></div>`)}
    ${card('Now (at the playhead)', `<div id="now"></div>`)}
    ${card('Plug / pull', `<div style="display:flex;flex-wrap:wrap;gap:6px">${['c1','c2','tur','hub2'].map(k=>`<button data-plug="${k}">${{c1:'Console #1',c2:'Console #2',tur:'Turret',hub2:'2nd hub + turret'}[k]}</button>`).join('')}<button id="rst">Reset system</button></div>`)}
  </div></div>
  ${card('One second — the hub’s polling cycle (zoom in to see bytes, then bits)', `<canvas id="tl"></canvas><p class="small muted">Blue = UART0 (console 1), purple = UART1 console 2, orange = UART1 turret, green = replies, red step = timeout. Bytes are 8N1 at 9600 baud (${SIM.fmtDur(C.BYTE)} each).</p>`)}`;
  bindJobSel(m);
  m.querySelectorAll('[data-plug]').forEach(b=>b.onclick=()=>A.plug(b.dataset.plug)); m.querySelector('#rst').onclick=A.reset;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#tur').innerHTML=turretSVG(t); m.querySelector('#turR').innerHTML=turretRearSVG();
    m.querySelector('#hub').innerHTML=hubSVG(t,1)+(D.pres.hub2?hubSVG(t,2):''); m.querySelector('#hubR').innerHTML=hubRearSVG();
    m.querySelector('#con0').innerHTML=consoleSVG(0); m.querySelector('#con1').innerHTML=consoleSVG(1);
    m.querySelector('#vlc').innerHTML=vlcSVG(); m.querySelector('#r221').innerHTML=r221SVG();
    ['#tur','#turR','#hubR','#con0','#con1','#r221'].forEach(q=>bindPanel(m.querySelector(q)));
    m.querySelector('#trace').innerHTML = D.log.length? D.log.slice(0,8).map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('')).join('') : '<div class="muted">Press something on the turret, a console or the hub.</div>';
    const s=stepAt(t);
    m.querySelector('#now').innerHTML = `<table class="kv"><tr><th>event_schedule</th><td class="mono">${s.cs} — ${STEPNAME[s.cs]||''}${s.hub===2?' (hub #2 owns the console buses)':''}</td></tr>
      <tr><th>Step result</th><td>${s.kind==='wait'?'waiting':s.timeout?'<b style="color:var(--bad)">timeout</b> — COMMUNICATION_COUNTER ran out':s.bytes?'bytes '+s.bytes.map(hx).join(' '):'—'}</td></tr>
      <tr><th>Cycle</th><td>${SIM.fmtDur(cycleLen())} per MASTER_CONTROL round · ${schedule().cycles} rounds in this second</td></tr>
      <tr><th>Turret</th><td class="mono">chpole10 ${hx(D.tur.chpole10)} · studio ${hx(D.tur.studio)} · chpole11 ${hx(turretCmd())}</td></tr>
      <tr><th>Hub bytes</th><td class="mono">studio1 ${hx(D.hub.R203_command_byte_studio1)} · studio2 ${hx(D.hub.R203_command_byte_studio2)} · R201 ${hx(D.hub.R201_command_byte_ch1)}</td></tr></table>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  SIM.on('time', draw);
}
function r221SVG(){
  const R=D.r221;
  let s=`<svg viewBox="0 0 560 104" style="width:100%;background:#202326;border-radius:8px"><text x="8" y="16" font-size="12" fill="#ccc">R221 (r201v301.asm Mode 7, “added mode 7 cough A and B for Rogers”, 28 Feb 2006)</text>`;
  s+=pbtn(60,50,90,30,'IN '+(R.inputA?'A':'B'),true,'#9ad',`r221sel`,'input select A/B (status1,3)')+pbtn(160,50,90,30,'CH ON',R.chon,'#ffd23a','r221on','channel on (alternate action)');
  s+=`<text x="215" y="56" font-size="12" fill="${R.cue?'#ffb43a':'#888'}">CUE ${R.cue?'ON':'off'}</text>`;
  s+=pbtn(320,40,120,24,R.held==='A'?'release in 3':'hold in 3 (Cough A)',R.held==='A','#ff6a4a',R.held==='A'?'coughA0':'coughA1','Control in 3 pulled low')+pbtn(460,40,120,24,R.held==='B'?'release in 4':'hold in 4 (Cough B)',R.held==='B','#ff6a4a',R.held==='B'?'coughB0':'coughB1','Control in 4 pulled low');
  s+=`<text x="8" y="94" font-size="11" fill="#bbb">out1 CH ON+INA ${R.chon&&R.inputA?'●':'○'}  out2 CH ON+INB ${R.chon&&!R.inputA?'●':'○'}  out3 CUE+INA ${R.held==='A'?'●':'○'}  out4 CUE+INB ${R.held==='B'?'●':'○'}</text>`;
  return s+'</svg>';
}

/* ---------------- tutorial (557572 Manual Appendix + turret programming chart) ---------------- */
let lessonIdx=0;
const hasLog = re => D.log.some(e=>re.test(e.name));
const LESSONS = [
  {title:'1 · The system', body:`<p>Rogers Kitchener (job 557572, March 2008|41) has two R2K consoles and a host turret. The manual appendix says the <b>554951-3 communication interface</b> “acts as the master control”: COM1 = console #1, COM2 = console #2, COM3 = host turret. Press <b>Play</b> and watch the three COM LEDs and the polling lanes.</p>`, check:()=>SIM.t>0.05, hint:'Press ▶ Play or drag the time slider.'},
  {title:'2 · Enter turret setup', body:`<p>“1: Remove the power cord … 2: Place the set-up switch at the back of the turret to the out position … 3: Reapply power.” Click the rear <b>SETUP</b> switch, then click <b>PWR</b> twice (off, on).</p>`, check:()=>D.tur.setup0, hint:'SETUP → OUT, then cycle PWR.'},
  {title:'3 · Program the mic address', body:`<p>Use the chart: the mic on <b>R2K-28 position 5</b> is address <b>4</b> → monitor selectors SW1–SW5 = OFF OFF ON OFF OFF (LED on = ON). Press button <b>3</b>; clear any others.</p><p class="small muted">Address ${turAddr()} now → ${posTxt(turAddr())}</p>`, check:()=>D.tur.setup0&&turAddr()===4, hint:'Only button 3 lit on the address page.'},
  {title:'4 · Studio page', body:`<p>“Press the T/B button to cycle … to the Studio setup” (T/B LED goes dark). Monitor selector 8: LED off = studio 1, on = studio 2. <b>Each turret must be set to a different studio.</b> Leave it on studio 1.</p>`, check:()=>D.tur.setup0&&D.tur.page===2, hint:'Press T/B once.'},
  {title:'5 · Exit setup', body:`<p>“Push the set-up switch to the in position to exit.” The turret writes its five setup words into the 93LC66B EEPROM (exit_setup → eew).</p>`, check:()=>!D.tur.setup0&&!D.tur.setupSw&&turAddr()===4, hint:'Click SETUP again (IN).'},
  {title:'6 · Mic on from the turret', body:`<p>Press <b>ON</b>. The turret sends 0x39; the hub passes it to the R201 for that mic on <i>both</i> consoles.</p>`, check:()=>D.con[0].on&&D.con[1].on, hint:'Press ON on the turret (both consoles must be connected).'},
  {title:'7 · Monitor select', body:`<p>Press monitor selector <b>3</b>. Both consoles’ R203 control-room monitors switch to source 3.</p>`, check:()=>D.con[0].s1===2&&D.con[1].s1===2, hint:'Button 3 on the turret top.'},
  {title:'8 · Talkback', body:`<p>Press <b>T/B</b> (held): mic OFF and CUE ON. Press again to release: cue off and the mic comes back on.</p>`, check:()=>hasLog(/T\/B released/)&&D.con[0].on, hint:'Click T/B twice.'},
  {title:'9 · Speaker volume', body:`<p>Turning the R203 brass optical encoder sends UP/DOWN to the 554951-2. Press <b>VOL ▼</b> on console 1 three times, then hold <b>UP+DN</b> for mute.</p>`, check:()=>D.vlc.table_count1>=3||D.vlc.mute, hint:'VOL ▼ on console 1.'},
  {title:'10 · Troubleshooting: a silent module', body:`<p>Pull console 2’s <b>R201</b>. The console still talks, so COM2 does not go out: it blinks once per polling round (the read of that module times out). The manual calls this flashing.</p>`, check:()=>!D.mod.c2r201, hint:'“pull module” under console 2’s R201.'},
  {title:'11 · Troubleshooting: a cable', body:`<p>Unplug <b>R2K-1</b> on the hub rear. COM1 goes out and stays out; the hub keeps serving console 2 and the turret.</p>`, check:()=>!D.pres.c1, hint:'Click R2K-1 on the hub rear.'},
  {title:'12 · Two-turret system', body:`<p>Connect the <b>LINK</b> (interface #1 DB9 2→7, 3→8, 7→2, 8→3, 5→5). The hubs now take turns on the console buses.</p>`, check:()=>D.pres.hub2, hint:'Click LINK on the hub rear or “2nd hub + turret”.'},
  {title:'13 · R221 Mode 7 cough', body:`<p>With input A selected and CH ON, <b>hold Control in 3</b>: channel OFF and cue ON while held; release and it comes back.</p>`, check:()=>hasLog(/Cough A\) released/)&&D.r221.chon, hint:'Hold then release Control in 3.'},
  {title:'Done', body:`<p>That is the whole appendix. The Findings tab has what the code does differently.</p>`, check:()=>true, auto:true},
];
function viewTutorial(m){
  window.__55xxxxActive=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — operating the 557572 system (Manual Appendix + programming chart)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
    ${card('What the software did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Turret', `<div id="tur"></div><div id="turR" style="margin-top:6px"></div>`)}${card('Hub', `<div id="hub"></div><div id="hubR"></div>`)}${card('Consoles', `<div id="con0"></div><div id="con1"></div>`)}${card('R221', `<div id="r221"></div>`)}</div></div>`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#tur').innerHTML=turretSVG(t); m.querySelector('#turR').innerHTML=turretRearSVG();
    m.querySelector('#hub').innerHTML=hubSVG(t,1); m.querySelector('#hubR').innerHTML=hubRearSVG();
    m.querySelector('#con0').innerHTML=consoleSVG(0); m.querySelector('#con1').innerHTML=consoleSVG(1); m.querySelector('#r221').innerHTML=r221SVG();
    ['#tur','#turR','#hubR','#con0','#con1','#r221'].forEach(q=>bindPanel(m.querySelector(q)));
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{lessonIdx=Math.max(0,lessonIdx-1);draw();};
    m.querySelector('#nxt').onclick=()=>{lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1);draw();};
    m.querySelector('#rs').onclick=()=>{A.reset(); lessonIdx=0; draw();};
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__55xxxxActive=false;
  m.innerHTML=`${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the hub (all lanes)', `<canvas id="tl"></canvas>`)}${card('As seen by the front panels', `<div id="fp"></div><h3>COM LEDs over the whole second</h3><canvas id="ledc"></canvas><p class="small muted">The appendix’s “flashing” is this pattern: dark stretches are reads that timed out.</p>`)}</div>
  ${card('The byte under the playhead, bit by bit (8N1, LSB first)', `<canvas id="scope"></canvas><div id="bdesc" class="small"></div>`)}`;
  const draw=()=>{
    const S=schedule(), t=SIM.t, n=k=>S.bytes.filter(b=>b.bus===k).length;
    const rows=[
      ['Hub main-loop passes','≈ '+Math.round(1/C.LOOP).toLocaleString()+' '+inf('pass time'),SIM.fmtDur(C.LOOP),'WDR, SYNCHRONIZE_DATA_BETWEEN_UARTS, MASTER_CONTROL, UART0 ×4 routines, UART1 ×4 routines'],
      ['MASTER_CONTROL rounds',S.cycles,SIM.fmtDur(cycleLen()),'0 → 13, 18 → 22, 23/24, 45 → 51, 25/26, then the 255 wait'],
      ['UART0 pacing gap','—',SIM.fmtDur(101*C.LOOP),'Transmit_Counter0 = TRANSMIT_COUNTER = 100 passes before each byte and before turning round'],
      ['Read timeout','—',SIM.fmtDur((C.COMM+1)*C.LOOP),'COMMUNICATION_COUNTER = 1000 passes (500 in 554951-3._c)'],
      ['Bytes on UART0 / UART1-console / UART1-turret',`${n('u0')} / ${n('u1c')} / ${n('u1t')}`,SIM.fmtDur(C.BYTE),'9600 8N1: UBRR = 0x1F → 4 915 200 / (16 × 32) = 9600'],
      ['Bits','—',SIM.fmtDur(1/C.BAUD),'start + 8 data + stop'],
      ['Turret PIC loop','≈ '+Math.round(1/C.TLOOP)+' '+inf(''),SIM.fmtDur(C.TLOOP),'scan → talkback → debounce (16 equal scans) → process → refresh (4094) → setup → scanu → uartproc → channel1…6 → pole → txuart → flash'],
      ['554951-2 volume steps','per press','—','table_count1 ±1 below 100, ±5 from 100; 0 = loudest, 0xFF = mute'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>What</th><th>Per second</th><th>Each</th><th>Source</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
    m.querySelector('#fp').innerHTML=hubSVG(t,1)+turretSVG(t).replace('max-width:560px','max-width:300px');
    SIM.drawLanes(m.querySelector('#ledc'), lanes().filter(l=>/COM/.test(l.label)), {labelW:130, range:[0,1]});
    // scope: nearest byte
    const B=S.bytes; let b=B[0]; for(const x of B){ if(x.t<=t) b=x; else break; }
    const sc=m.querySelector('#scope'); const {c,w}=SIM.canvas(sc,110);
    if(b){ const bits=[0]; for(let i=0;i<8;i++) bits.push((b.v>>i)&1); bits.push(1);
      const x0=40, bw=(w-80)/10; c.strokeStyle=b.dir==='rx'?COL.rx:COL[b.bus]; c.lineWidth=2; c.beginPath(); c.moveTo(10,20);
      let ly=20; bits.forEach((v,i)=>{ const x=x0+i*bw, y=v?20:80; c.lineTo(x,ly); c.lineTo(x,y); c.lineTo(x+bw,y); ly=y; });
      c.lineTo(x0+10*bw,20); c.lineTo(w-10,20); c.stroke();
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); bits.forEach((v,i)=>c.fillText(i===0?'start':i===9?'stop':'D'+(i-1)+'='+v, x0+i*bw+4, 100));
      const tin = t>=b.t && t<b.t+C.BYTE ? Math.floor((t-b.t)*C.BAUD) : -1; if(tin>=0){ c.fillStyle=SIM.css('--play'); c.globalAlpha=.2; c.fillRect(x0+tin*bw,10,bw,80); c.globalAlpha=1; }
      m.querySelector('#bdesc').innerHTML=`<span class="mono">${hx(b.v)} = ${bin8(b.v)}b</span> · ${b.dir==='tx'?'hub → '+b.who:b.who+' → hub'} on ${({u0:'UART0',u1c:'UART1 (console 2)',u1t:'UART1 (turret)'})[b.bus]} at ${SIM.fmtT(b.t)} · bit 7 = ${b.v&0x80?'1 → address byte':'0 → command byte'}${tin>=0?' · the playhead is inside bit '+tin:''}`;
    }
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram (FUNCTIONAL-557572) ---------------- */
const BLK = {
  c1:{x:10,y:20,w:170,h:70,t:'Console #1 (R2K)',s:['R201/R221 · R203 · R204','DB25F TX 21/22 · RX 10/11'],d:'R2K console. Its module bus goes to R2K-1 on hub #1 (and R2K-1 of hub #2 in a two-turret system). The hub polls the R203 (0x9E), R204 (0x9D) and the R201 at the turret’s mic address.'},
  c2:{x:10,y:120,w:170,h:70,t:'Console #2 (R2K)',s:['same modules','on UART1 with the turret'],d:'Second console, on hub R2K-2 = UART1 shared with the turret through the U4/U5 vs U6/U7 75176 enables.'},
  h1:{x:260,y:40,w:190,h:110,t:'Communications hub #1',s:['554951-3 (drawn as 557572-3)','ATmega128 4.9152 MHz','6 × 75176 · COM1–3 LEDs'],d:'MASTER_CONTROL polls everything, mirrors any change from one console to the other and to the turret.'},
  h2:{x:260,y:190,w:190,h:60,t:'Communications hub #2',s:['same firmware','LINK DB9F to hub #1'],d:'Two-turret system: PC7 (CONSOLE1_NOT_COMM) of one hub drives PINC5 (CHECK_CONSOLE1_COMM) of the other, so they take turns.'},
  t1:{x:520,y:20,w:170,h:70,t:'Turret #1',s:['557572-1 = 554951-1.asm','PIC16F73 · 93LC66B'],d:'8 monitor selectors, ON/OFF, T/B, DUMP, NEXT EVENT, HEADSET. Mic address and studio set in setup mode.'},
  t2:{x:520,y:190,w:170,h:60,t:'Turret #2',s:['set to the other studio'],d:'“Make sure that each turret is set to a different studio.”'},
  v:{x:520,y:290,w:170,h:70,t:'554951-2 Volume controller',s:['POD16 · PIC16F73 · SSM2018','2 inputs mixed, +24 dBu max'],d:'Takes the monitor outputs of both consoles and the UP/DOWN lines from both R203s.'},
  enc:{x:260,y:300,w:190,h:60,t:'R203 custom (encdc100.asm)',s:['PIC16C54 · brass optical encoder','UP 8A− / DOWN 8A+'],d:'R203 control-room monitor modified to pulse UP or DOWN to the volume controller.'},
  spk:{x:10,y:300,w:170,h:60,t:'Control-room speakers',s:['from 554951-2 OUTPUT'],d:'One set of speakers for both consoles.'},
};
const WIRES=[['c1','h1','RS-485'],['c2','h1','RS-485'],['h1','t1','RS-485'],['h1','h2','LINK'],['h2','t2','RS-485'],['c1','enc','R203'],['enc','v','UP/DN'],['v','spk','audio'],['c2','v','monitor out']];
let blkSel='h1';
function viewBlock(m){
  window.__55xxxxActive=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram — 557572 (redrawn from FUNCTIONAL-557572 Model.pdf; click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{
    let s=`<svg viewBox="0 0 700 380" style="width:100%">`;
    const cc=k=>{const b=BLK[k]; return [b.x+b.w/2,b.y+b.h/2];};
    WIRES.forEach(([a,b,l])=>{ const [x1,y1]=cc(a),[x2,y2]=cc(b); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.5"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-3}" font-size="9" fill="var(--ink2)">${l}</text>`; });
    for(const k in BLK){ const b=BLK[k]; const dim=(k==='h2'||k==='t2')&&!D.pres.hub2;
      s+=`<g data-b="${k}" style="cursor:pointer;opacity:${dim?.45:1}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${blkSel===k?'color-mix(in srgb,var(--accent) 20%,var(--panel))':'var(--panel2)'}" stroke="${blkSel===k?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${b.x+8}" y="${b.y+17}" font-size="12" font-weight="600" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+33+i*13}" font-size="10" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{blkSel=g.dataset.b; draw();});
    const b=BLK[blkSel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>${blkSel==='h1'?hubSVG(SIM.t,1):blkSel==='t1'?turretSVG(SIM.t):blkSel==='v'?vlcSVG():blkSel==='c1'?consoleSVG(0):blkSel==='c2'?consoleSVG(1):''}`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
function pinBox(x,y,title,pins,w){ w=w||220; let s=`<rect x="${x}" y="${y}" width="${w}" height="${pins.length*16+26}" rx="4" fill="var(--panel2)" stroke="var(--ink2)"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)">${title}</text>`;
  pins.forEach((p,i)=>{ s+=`<text x="${x+6}" y="${y+34+i*16}" font-size="10.5" font-family="var(--mono)" fill="var(--ink)">${p[0]}</text><text x="${x+w-6}" y="${y+34+i*16}" text-anchor="end" font-size="10.5" fill="var(--ink2)">${p[1]}</text>`; }); return s; }
const SCH=[
  {name:'1 · 554951-3 hub — ATmega128 port use', note:'From the #defines, port_init and MASTER_CONTROL_INIT in 554951-3.c. DB25 pin numbers from FUNCTIONAL-557572 (TX 21/22, RX 10/11 per port). Which 75176 drives which pin pair is not traced in this folder.', svg:()=>`<svg viewBox="0 0 760 420" style="width:100%">${pinBox(250,10,'ATmega128 (U1) 4.9152 MHz',[['PA0','CONSOLE1_LED (COM1)'],['PA1','CONSOLE2_LED (COM2)'],['PA2','TURRET_LED (COM3)'],['PF3','U2 DE: UART0_TX_CONSOLE1_TX'],['PF2','U3 /RE: UART0_RX_CONSOLE1 (low)'],['PE6 / PF1','U4 DE / /RE (console 2)'],['PE7 / PF0','U5 DE / /RE (console 2)'],['PD6 / PD7','U6 DE / /RE (turret)'],['PD4 / PD5','U7 DE / /RE (turret)'],['PE0/PE1','RXD0/TXD0 → U2/U3'],['PD2/PD3','RXD1/TXD1 → U4–U7'],['PC7 out','CONSOLE1_NOT_COMM → LINK'],['PC6 out','C2_NOT_COMM = TURRET_NOT_COMM'],['PC5 in','CHECK_CONSOLE1_COMM ← LINK'],['PC4 in','CHECK_CONSOLE2_COMM ← LINK'],['WDTCR 0x08','watchdog ≈ 14 ms (16K cycles)']],260)}
      ${pinBox(10,40,'R2K-1 DB25F (console 1)',[['21/22','hub TX → console RX'],['10/11','console TX → hub RX']],190)}${pinBox(10,140,'R2K-2 DB25F (console 2)',[['21/22','hub TX'],['10/11','hub RX']],190)}
      ${pinBox(560,40,'TURRET DB25F',[['21/22','turret TX → hub RX'],['10/11','hub TX → turret RX']],190)}${pinBox(560,150,'LINK DB9F',[['2','OUTPUT'],['3','OUTPUT'],['7','INPUT'],['8','INPUT'],['5','GND']],190)}
      <path d="M200,60 H250 M200,160 H250 M510,60 H560 M510,170 H560" stroke="var(--accent)" stroke-width="2"/></svg>`},
  {name:'2 · 557572-1 turret — PIC16F73', note:'From 554951-1.asm, init.asm (TRISA 0xF0, TRISC 0x83, SPBRG 7, txsta 0x20 → BRGH 0 → 4.9152 MHz / (64 × 8) = 9600), EERW.ASM (93LC66B) and setup.asm.', svg:()=>`<svg viewBox="0 0 760 330" style="width:100%">${pinBox(260,10,'PIC16F73 (turret)',[['RA0','74HC165 clock / 4094 clock (pbclk)'],['RA3','74HC165 load'],['RA5','74HC165 serial in (buttons)'],['RA1','4094 data (LEDs)'],['RA2','4094 strobe'],['RC0','SETUP switch (read at INIT)'],['RC2/RC3/RC4','93LC66B CS / CLK / DI'],['RC5','RS-485 transmit enable'],['RC6/RC7','TX / RX 9600 8N1'],['RB3–RB7','debug/marker outputs'],['RB pull-ups','OPTION_REG,7 = 0']],260)}
      ${pinBox(10,30,'Buttons via 74HC165 ×2',[['sw1–sw8','monitor select 1–8'],['sw11 / sw12','HOST ON / OFF'],['sw14','T/B (setup: page)'],['sw9,10,13,15,16','commented out']],240)}
      ${pinBox(540,30,'J1 DB25M (added)',[['DUMP','closure (inferred)'],['NEXT EVENT','closure (inferred)']],210)}${pinBox(540,130,'93LC66B',[['word 0','ch1_set | chpole10'],['word 1–3','ch2–4 (unused)'],['word 4','ch5_set | chpole50 (studio)']],210)}</svg>`},
  {name:'3 · 554951-2 volume level controller (POD16)', note:'From 554951-2.asm (PORTC constants UP1…DOWN4, output_DtoA) and Product Assembly.txt (550670-2 BOM): LT1451 DAC, SSM2018TP VCAs U10/U12, 5532 U6/U7, OP275 U8, transformers T1/T2, LM7805/LM317/LM337.', svg:()=>`<svg viewBox="0 0 760 260" style="width:100%">${pinBox(10,20,'PIC16F73',[['RC0/RC1','UP1 / DOWN1 (console 1)'],['RC2/RC3','UP2 / DOWN2 (console 2)'],['RC4–RC7','UP3/DOWN3, UP4/DOWN4'],['RB3','external MUTE in'],['RB7','MUTE LED'],['RA2 / RB4 / RA5','DAC clk / data / CS-LD']],230)}
      <rect x="290" y="60" width="110" height="60" rx="5" fill="var(--panel2)" stroke="var(--ink2)"/><text x="345" y="85" text-anchor="middle" font-size="12" fill="var(--ink)">LT1451 DAC</text><text x="345" y="102" text-anchor="middle" font-size="10" fill="var(--ink2)">dac1 = dac2</text>
      <rect x="450" y="20" width="130" height="50" rx="5" fill="var(--panel2)" stroke="var(--ink2)"/><text x="515" y="50" text-anchor="middle" font-size="11" fill="var(--ink)">SSM2018 U10 (L)</text>
      <rect x="450" y="110" width="130" height="50" rx="5" fill="var(--panel2)" stroke="var(--ink2)"/><text x="515" y="140" text-anchor="middle" font-size="11" fill="var(--ink)">SSM2018 U12 (R)</text>
      <rect x="620" y="60" width="120" height="60" rx="5" fill="var(--panel2)" stroke="var(--ink2)"/><text x="680" y="85" text-anchor="middle" font-size="11" fill="var(--ink)">5532 / OP275</text><text x="680" y="102" text-anchor="middle" font-size="10" fill="var(--ink2)">T1/T2 → OUTPUT</text>
      <path d="M240,90 H290 M400,90 H430 V45 H450 M430,90 V135 H450 M580,45 H600 V90 H620 M580,135 H600 V90" stroke="var(--accent)" fill="none" stroke-width="2"/>
      <text x="250" y="200" font-size="10.5" fill="var(--ink2)">INPUT 1 (console 1 monitor) + INPUT 2 (console 2) → mixed → VCA → OUTPUT (+24 dBu max)</text></svg>`},
  {name:'4 · R203 termination (custom) and R221 Mode 7 I/O', note:'From R203CUSTOM.pdf / R203CUSTOM_TERMINATION.pdf and the Mode 7 page. The two termination PDFs disagree on blocks 9 and 10 (see Findings).', svg:()=>`<svg viewBox="0 0 760 240" style="width:100%">${pinBox(10,10,'R203 termination block 8',[['8A +','VOLUME DOWN'],['8A −','VOLUME UP'],['8A G','GND'],['8B +/−/G','MONO INPUT (was input 8 R)']],240)}${pinBox(10,120,'Blocks 9 / 10',[['R203CUSTOM.pdf','9 = AUX METER, 10 = CR MONITOR'],['…_TERMINATION.pdf','9 = CR MONITOR, 10 = AUX METER']],330)}
      ${pinBox(400,10,'R221 Mode 7',[['Control in 1','CH ON'],['Control in 2','CH OFF'],['Control in 3','Cough A'],['Control in 4','Cough B'],['Control out 1','CH ON + INA tally (portE,2)'],['Control out 2','CH ON + INB tally (portE,0)'],['Control out 3','CUE ON + INA (portE,1)'],['Control out 4','CUE ON + INB (porta,5)']],340)}</svg>`},
];
function viewSchem(m){
  window.__55xxxxActive=false;
  m.innerHTML=SCH.map(s=>card(s.name+' <span class="small muted">(redrawn, not the original CAD)</span>', s.svg()+`<p class="small muted">${s.note}</p>`)).join('');
}

/* ---------------- software ---------------- */
const MAINLOOP=['WDR','SYNCHRONIZE_DATA_BETWEEN_UARTS','MASTER_CONTROL','WDR','UART0_transmit_counter','UART0_receive','UART0_TRANSLATE','UART0_com_check','WDR','UART1_transmit_counter','UART1_receive','UART1_TRANSLATE','UART1_com_check'];
const SNAPS=[['mar 11 08','11 Mar 16:26',300,''],['12 mar 08 st1 not working turret','12 Mar 12:01',300,'studio 1 not working with the turret'],['12 MAR 08 PM','12 Mar 14:50',300,''],['13 mar 08 am','13 Mar 10:51',300,''],['13 mar 08 1hub 1turret 2 consoles','13 Mar 16:19',1000,'first working single-hub build'],['14 mar 08 2hubs 2 turrets 2consoles studio2 not working','14 Mar 15:13',2000,'two-hub link added, studio 2 broken'],['17 mar 08 (working)','17 Mar 13:32',2000,'working'],['17 mar 08 pm','17 Mar 17:50',2000,''],['18 mar 08','18 Mar 10:43',2000,''],['18 mar 08 pm','18 Mar 15:44',2000,''],['19 MAR 08','—','—','empty folder'],['19 MAR 08 PM','19 Mar 14:05',3000,''],['19 mar pm','19 Mar 16:46',1000,''],['20 mar 08 (working)','20 Mar 17:46',500,'working'],['23 mar 08','20 Mar 17:56',1000,'dated the 23rd, file from the 20th'],['23 MAR 08 PM','23 Mar 12:58',1000,''],['24 mar 08','24 Mar 14:42',1000,''],['25 mar 08','24 Mar 14:42',1000,'identical to 24 mar 08'],['25 MAR 08 AM','25 Mar 10:19',1000,'tries console1_tb1_status NONE/BOTH/TB_STUDIO1/2'],['25 mar pm','25 Mar 11:16',1000,'same TB-status scheme'],['554951-3._c','25 Mar 14:18',500,'compiler copy'],['554951-3.c (top)','25 Mar 15:44',1000,'final: TB scheme dropped; .lis built 4 s later']];
function viewSoft(m){
  window.__55xxxxActive=false;
  m.innerHTML=`<div class="grid2">${card('554951-3 main() — every pass runs all of these', `<div id="ml"></div>`)}${card('MASTER_CONTROL state machine — lit = event_schedule at the playhead', `<div id="sm"></div>`)}</div>
   <div class="grid2">${card('CONSOLE_TURRET_TRANSMISSION_CONTROL (console_turret_flag → 75176 pins)', `<div id="ct"></div>`)}${card('Message format', `<div id="mf"></div>`)}</div>
   <div class="grid2">${card('Turret talkback sequence (set1 / talk1 bits)', `<div id="tb"></div>`)}${card('Turret main loop (554951-1.asm)', `<div class="small mono">main: scan → talkback → debounce → process → refresh → setup → (setup? goto main) → scanu → uartproc → channel1 … channel6 → pole → txuart → flash → com_timeout</div><p class="small">The turret never starts a conversation: it answers each hub poll whose address byte has BIT5 set (scanu: <span class="mono">btfss uart1,5 / return</span>). channel1 handles the mic address, channel5/6 the studio address 0x9E/0xDE.</p>`)}</div>
   ${card('Firmware history: 22 copies of 554951-3.c in March 2008|41', `<div id="hist"></div>`)}`;
  const draw=()=>{
    const s=stepAt(SIM.t);
    m.querySelector('#ml').innerHTML=`<svg viewBox="0 0 420 ${MAINLOOP.length*24+10}" style="width:100%">${MAINLOOP.map((f,i)=>`<rect x="10" y="${5+i*24}" width="400" height="20" rx="4" fill="${f==='MASTER_CONTROL'?'color-mix(in srgb,var(--accent) 25%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${19+i*24}" font-size="11" font-family="var(--mono)" fill="var(--ink)">${f}</text>`).join('')}</svg><p class="small muted">MASTER_CONTROL only does work when <span class="mono">update_master_control</span> is YES (set by a reply, a timeout or the step itself); the transmit counters and com checks tick every pass. Pass ≈ 40 µs ${inf('')}.</p>`;
    const order=[255,0,1,2,3,4,5,6,7,8,9,10,11,12,13,18,19,20,21,22,23,24,45,46,47,48,49,50,51,25,26];
    m.querySelector('#sm').innerHTML=`<svg viewBox="0 0 520 350" style="width:100%">${order.map((cs,i)=>{ const x=10+(i%6)*85, y=10+Math.floor(i/6)*56; const on=s.cs===cs&&s.hub===1; return `<rect x="${x}" y="${y}" width="78" height="46" rx="5" fill="${on?(s.timeout?'var(--bad)':'var(--accent)'):'var(--panel2)'}" stroke="var(--line)"/><text x="${x+39}" y="${y+18}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${cs===255?'255 wait':cs}</text><text x="${x+39}" y="${y+33}" text-anchor="middle" font-size="7.5" fill="${on?'#fff':'var(--ink2)'}">${(STEPNAME[cs]||'').slice(0,22)}</text>`; }).join('')}</svg><p class="small">Now: <b>${s.cs}</b> ${STEPNAME[s.cs]||''}${s.timeout?' — <b style="color:var(--bad)">timeout</b>':''}. With no turret, 24 resets every turret variable and jumps to 255; 14–17 (R204 monitor) are inside <span class="mono">/* */</span>.</p>`;
    const fl=s.cs===255?5:({2:0,7:0,12:0,21:0,49:0,3:1,8:1,13:1,22:1,50:1,23:2,25:2,24:3,26:3})[s.cs];
    const rows=[['0','CONSOLE 2 TX','U4 TX, U5 RX, U6 RX, U7 RX'],['1','CONSOLE 2 RX','U4 RX, U5 RX, U6 TX, U7 TX'],['2','TURRET TX','U6 RX, U7 TX, U4 RX, U5 RX'],['3','TURRET RX','U6 RX, U7 TX, U4 TX, U5 TX'],['5 (default)','all receive','U4–U7 RX']];
    m.querySelector('#ct').innerHTML=`<table class="kv"><tr><th>flag</th><th>comment</th><th>pins</th></tr>${rows.map(r=>`<tr class="${String(fl)===r[0][0]?'hl':''}"><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono small">${r[2]}</td></tr>`).join('')}</table><p class="small">“TURRET TX” and “TURRET RX” set the turret pair identically, and flag 1 (“CONSOLE 2 RX”) turns the turret drivers on: the comments describe the intent, the pins say the turret link is really 4-wire and always transmitting through U7.</p>`;
    m.querySelector('#mf').innerHTML=`<table class="kv small"><tr><th>Address byte</th><td class="mono">bit 7 = 1. 0x9E R203, 0x9D R204, 0x80 + n R201 at mic address n (0–27). To the turret: + BIT5 (0x20); + BIT6 = no console has the mic; studio 2 = 0xDE</td></tr><tr><th>Command byte</th><td class="mono">bit 7 = 0. BIT6 = valid, BIT5 = take (changed). R203 low nibble = source 0–7 studio 1, 8–15 studio 2; TB 0x33. R201: 0x39 ON, 0x29 OFF, 0x38 CUE ON, 0x28 CUE OFF; replies bit 0 = ON, bit 1 = CUE</td></tr><tr><th>Turret replies</th><td class="mono">chpole10 + chpole11 (mic); 0x9E/0xDE + chpole51 = 0x20 | source | studio-2 bit 3 | BIT6</td></tr><tr><th>Module reply bytes</th><td>R203/R204 reply contents are shown as 0x40 | state ${inf('the R2K module code is not in this folder')}</td></tr></table>`;
    const T=D.tur;
    m.querySelector('#tb').innerHTML=`<svg viewBox="0 0 520 70" style="width:100%">${[['press','talk1=82h'],['send_CHOFF','0x29'],['send_CUEON','0x38'],['(held)','cue on'],['release','send_CUEOFF 0x28'],['send_CHST','0x39 / 0x29']].map((l,i)=>{const on=(T.holding&&(i>=1&&i<=3))||(!T.holding&&hasLog(/T\/B released/)&&i>=4&&D.log[0]&&/T\/B released/.test(D.log[0].name)); return `<rect x="${5+i*86}" y="10" width="82" height="46" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${46+i*86}" y="30" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink)'}">${l[0]}</text><text x="${46+i*86}" y="45" text-anchor="middle" font-size="9" fill="${on?'#fff':'var(--ink2)'}">${l[1]}</text>`;}).join('')}</svg><p class="small">The same idea as R221 Mode 7 cough: channel off + cue on while held, then restore. Here the turret does it in four messages instead of a module input.</p>`;
    m.querySelector('#hist').innerHTML=`<table class="kv small"><tr><th>Folder</th><th>File time</th><th>COMMUNICATION_COUNTER</th><th>Note</th></tr>${SNAPS.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table><p class="small muted">Also in the code, commented out: 55000, 5000 (in 554951), 3000, 2000, 500, 300, 200, 100. The turret has six dated copies (10–25 Mar 08); the 25 MAR 08 one is the top-level file.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__55xxxxActive=false;
  m.innerHTML = card('What the 557572 system is up to — findings from the source', `<ol>
    <li><b>Every “if” in the polling schedule is always true.</b> Cases 0, 2, 5, 7, 10, 12, 19 and 21 test <span class="mono">(turret_studio == STUDIO1) || (send_studio1_info = YES)</span> — an assignment, not a comparison. The default case carefully works out <span class="mono">send_studio1_info</span>/<span class="mono">send_studio2_info</span> from PINC4, and the next case overwrites it with YES. Both studios are always sent to both consoles; the “+2 skip” branches never run. (8 occurrences in 554951-3.c.)</li>
    <li><b>The front-panel “flashing” is not a flash routine.</b> The appendix says the COM LED flashes faster for worse problems. In 554951-3.c each good read does <span class="mono">CONSOLEn_LED_ON</span> and each timeout <span class="mono">CONSOLEn_LED_OFF</span>; a silent module just leaves the LED dark for one step per round. More silent modules = more dark steps. Try it on the Simulator tab.</li>
    <li><b>Two hubs share the console buses by passing a token over the LINK.</b> <span class="mono">CONSOLE1_NOT_COMM</span> (PC7) of one hub is the other’s <span class="mono">CHECK_CONSOLE1_COMM</span> (PINC5): the waiting hub needs it high for more than <span class="mono">CONSTANT</span> = 25 passes. A hub hands the bus over at case 50, before it talks to its own turret (cases 51, 25, 26) — a deliberate overlap. The folder “14 mar 08 2hubs 2 turrets 2consoles studio2 not working” is the first build with this.</li>
    <li><b>Both hubs start talking at power-up.</b> <span class="mono">port_init</span> sets <span class="mono">PORTC = 0xC0</span>, so both NOT_COMM lines start high and each hub sees the other as idle. PC4/PC5 are inputs with their pull-ups off, so a single hub with no link reads a floating pin ${inf('the model assumes a single hub sees it high')}.</li>
    <li><b>Duplicate pin.</b> <span class="mono">CONSOLE2_NOT_COMM</span> and <span class="mono">TURRET_NOT_COMM</span> are both <span class="mono">PORTC |= BIT6</span>; <span class="mono">CHECK_CONSOLE2_COMM</span> (PC4) is used only for the dead send_studio flags.</li>
    <li><b>The hub can’t hear an early reply.</b> On UART0 every byte waits <span class="mono">Transmit_Counter0</span> = 100 passes and the hub only sets <span class="mono">receive_data0</span> after a third 100-pass wait; bytes that arrive before that are read and dropped. The R2K modules must answer late (≈ 12 ms here) ${inf('pass time')}. <span class="mono">Transmit_counter1 = TRANSMIT_COUNTER_TURRET</span> written in the UART0 cases has no effect on UART0.</li>
    <li><b>Talkback is cross-wired on purpose.</b> Case 10 sends <span class="mono">console2_tb1</span> to console 1 and case 12 sends <span class="mono">console1_tb1</span> to console 2. On 25 Mar 2008 two builds tried a <span class="mono">console1_tb1_status</span> NONE/BOTH/TB_STUDIO1/TB_STUDIO2 scheme; the final 15:44 file dropped it.</li>
    <li><b>The pin-direction comments don’t match the pins.</b> In <span class="mono">CONSOLE_TURRET_TRANSMISSION_CONTROL</span>, flags 2 (“TURRET TX”) and 3 (“TURRET RX”) set the turret pair identically, and flag 1 (“CONSOLE 2 RX”) turns the turret drivers on. The turret link only works because it is 4-wire (TX 21/22, RX 10/11 on FUNCTIONAL-557572).</li>
    <li><b>DUMP and NEXT EVENT are not in the firmware.</b> The silk and the spreadsheet title (“on off + tb + mon sel + dump & next event ctrls”) have them, but <span class="mono">scan</span> only reads sw1–8, sw11, sw12 and sw14. With “557572-1 Turret.txt: a standard with the addition of a DB25M (J1)”, they are hard-wired closures to automation ${inf('')}.</li>
    <li><b>The turret is still “554951-1”.</b> 557572-1/Software holds <span class="mono">554951-1.asm</span>, whose header says 550245-1 (Aug 2000) “based on 550512-1”, then 554951-1 (Aug 2005): “1 Host, 3 guests and a talkback”. The 2008 code is one mic, eight monitor selectors and T/B; HOST/GUEST names survive in comments, and <span class="mono">channel2/3/4</span> still run but nothing sets their addresses.</li>
    <li><b>Mode 7 cough doesn’t do the “OFF” half.</b> The appendix: “When channel A is OFF, pulling Control in 3 low turns cue function ON.” In <span class="mono">r201m102.asm mode7</span> the branch to <span class="mono">cue_a</span>/<span class="mono">cue_b</span> is commented out (<span class="mono">;goto cue_a</span>), and the test is on the input select (status1,3), not on whether the channel is on. Cough on the input that isn’t selected does nothing.</li>
    <li><b>“Two independent level controls” are one.</b> The appendix says the 554951-2 has two independent level controls. <span class="mono">refresh_vol</span> writes the same <span class="mono">table_count1</span> value to <span class="mono">dac1_reg</span> and <span class="mono">dac2_reg</span>, and any console’s UP/DOWN moves it. Its header says it was changed in July 2005 “for two inputs mixed to a single output”. It powers up at full volume (<span class="mono">clrf table_count1</span>).</li>
    <li><b>The two R203 termination drawings disagree.</b> R203CUSTOM.pdf has block 9 = AUX METER and 10 = CR MONITOR; R203CUSTOM_TERMINATION.pdf (the one in the manual appendix) swaps them.</li>
    <li><b>Small slips.</b> “Crystal: 4.951 Mhz” in the header; the build needs 4.9152 MHz for UBRR 0x1F = 9600. The functional diagram calls the hub “557572-3” but the code and folder are 554951-3. 554951-3M3.dwg in this job is a 554164 drawing (“CUSTOM MODIFIED POD 23A”). The 554951-3 silk has no LINK connector: it was drawn for the 2005 single-hub system. setup.asm comments call bit 4 “2**1”.</li>
    <li><b>Folder-wide.</b> 553594-1.asm (CIKR FM Kingston) still has the header “cfac rogers calgary, 550512-1”. 554993-1 is ADSP-21262 code (<span class="mono">shell262.dpj</span>, <span class="mono">def21262.h</span>), not the ADSP-21065L the folder README assumes; its project is still called slm1-1. Five folders (“554164 #TIM”, “554951 #TIM”, “555529 #TIM”, “557572 #TIM”, “558169-1 #PETER”) are empty skeletons. 557572/temp files holds copies of 554951 Project.doc and 555529 R221 Mode 7.doc.</li>
  </ol>`)
  + card('Assumptions in this model', `<ul class="small">
    <li>Hub main-loop pass ≈ 40 µs, turret loop ≈ 250 µs, module reply 1 ms after the hub turns round ${inf('no timing in the archive')}.</li>
    <li>R203/R204/R201 reply contents (0x40 | state) ${inf('R2K module code not in this job')}.</li>
    <li>A single hub sees PINC5 high (looped link); hub #2 runs the same schedule length ${inf('')}.</li>
    <li>554951-2 gain ≈ +24 dB − DAC × 100/255 dB ${inf('SSM2018 law not in the archive')}; turret flash ≈ 0.5 s ${inf('')}.</li>
    <li>Turret labels re-anchored under the rings; LINK DB9 position on the hub rear ${inf('')}.</li></ul>`)
  + card(`All ${JOBS.length} jobs in the folder`, `<table class="kv small"><tr><th>Job</th><th>Year</th><th>Customer</th><th>What</th><th>Code</th></tr>${JOBS.map(j=>`<tr${j[0]==='557572'?' class="hl"':''}><td class="mono">${j[0]}</td><td>${Y(j[1])}</td><td>${j[2]||'—'}</td><td>${j[3]}</td><td class="mono">${j[5]}</td></tr>`).join('')}<tr><td colspan="5" class="muted">Empty skeletons: ${SKELETONS.join(', ')}</td></tr></table>`)
  + card('Sources', `<ul class="small mono"><li>557572/554951-3/Software/554951-3.c, 554951-3._c, 554951-3.lis and 21 dated folders</li><li>557572/557572-1/Software/554951-1.asm, init.asm, setup.asm, EERW.ASM; 557572-1/SILK.cdr; 557572-1 Turret.txt</li><li>557572/554951-2/Software/554951-2.asm, Product Assembly.txt, 554951-2m2curve.cdr</li><li>557572/554951-3/554951-3SLKcurve.cdr; R203/encdc100.asm, Readme.txt; R221v1/r201v301.asm, r201m102.asm</li><li>557572/557572 Manual Appendix.pdf; temp files/557572 Project.pdf, FUNCTIONAL-557572 Model.pdf, R203CUSTOM.pdf, R203CUSTOM_TERMINATION.pdf, 557572 ( on off + tb + mon sel + dump &amp; next event ctrls ).pdf</li><li>every job folder and its *.md sidecars (job cards)</li><li>assets: 55xxxx-systems-turret-front.png, -turret-rear.png, -hub-front.png, -hub-rear.png, -vlc-rear.png</li></ul>`);
}
function viewJobs(m){
  window.__55xxxxActive=false;
  m.innerHTML=`<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>Every job</b><input id="flt" placeholder="filter: customer, turret, PIC…" style="font:inherit;padding:5px 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel2);color:var(--ink);min-width:240px"><span class="small muted">Click a card to make it the selected job.</span></div><div id="jg" class="grid3"></div>`;
  const draw=()=>{ const f=(m.querySelector('#flt').value||'').toLowerCase();
    m.querySelector('#jg').innerHTML=JOBS.filter(j=>!f||j.join(' ').toLowerCase().includes(f)).map(j=>`<div data-j="${j[0]}" style="cursor:pointer">${jobCard(j)}</div>`).join('');
    m.querySelectorAll('[data-j]').forEach(d=>d.onclick=()=>{ D.job=d.dataset.j; draw(); }); };
  m.querySelector('#flt').oninput=draw; draw();
}

/* ---------------- register ---------------- */
SIM.register({
  id: ID,
  name: 'Custom 55xxxx systems · customer jobs, R2K hub/turret system (2008|41)',
  product: 'Custom 55xxxx systems', year: 2008,
  folder: '#CUSTOM #SYSTEMS/#CUSTOM 55XXXX Systems - #OBSOLETE #Archive',
  family: 'Obsolete products',
  summary: 'About 100 Ward-Beck custom jobs from 1999|32 to 2011|44, each with a summary card and a job selector. The most complete, 557572 for Rogers Kitchener, runs in full: an ATmega128 hub polling two R2K consoles and a custom PIC turret, with its volume controller and Mode 7 cough logic.',
  highlights: ['Job selector + a card for every job','554951-3 hub polling cycle from the 2008 firmware','Real turret, hub and controller silks (converted .cdr)','Turret setup per the programming chart','Two-hub token passing over the LINK','Bugs: an assignment in every if, no real LED flash'],
  depth: 'Full model',
  duration: 1,
  stepUnits: [
    {label:'1 MASTER_CONTROL round', period:()=>cycleLen()},
    {label:'10 ms', period:()=>0.01},
    {label:'1 byte @ 9600', period:()=>C.BYTE},
    {label:'1 bit', period:()=>1/C.BAUD},
    {label:'1 hub pass (40 µs)', period:()=>C.LOOP},
  ],
  zooms: [[1,'1 s (whole second)'],[0.2,'200 ms (≈ 1–2 rounds)'],[0.05,'50 ms'],[0.012,'12 ms (one UART0 send)'],[0.003,'3 ms (two bytes)'],[0.0012,'1.2 ms (one byte, bits)']],
  defaultZoom: 1,
  init(){ SCHED_KEY=''; },
  tabs: [
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the 557572 system', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'jobs', label:'Jobs', render:viewJobs},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
