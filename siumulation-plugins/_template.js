/* =====================================================================
   TEMPLATE — copy this file to add a product to the WBS Device Simulator.
   1. Copy to e.g. ams82.js, change id/name.
   2. Add 'ams82.js' to SIM_PLUGIN_FILES in plugins.js.
   3. Open ../siumulation.html; the product appears in the "Product plugin" menu.

   The core (siumulation.html) gives you:
     SIM.t                current simulation time in seconds (0 … duration)
     SIM.seek(t)          move the playhead;  SIM.refresh() redraw the current tab
     SIM.on('time', fn)   called whenever the playhead moves or anything changes
                          (register inside each tab's render(); listeners are cleared on tab change)
     SIM.on('frame', fn)  called every animation frame
     SIM.window()         [t0, t1] of the current zoom window
     SIM.drawLanes(canvas, lanes, {labelW})   timing diagram with ruler + playhead
     SIM.pulses(c, X, t0, t1, y, h, period, phase, width, color, label)
     SIM.dotMatrix(text, x, y, pitch, onColor, offColor)  5×7 LED/VFD text as SVG circles
     SIM.canvas(cv, h)    HiDPI canvas setup → {c, w, h}
     SIM.fmtT(t), SIM.fmtDur(d), SIM.year(1993) → "1993|26", SIM.css('--accent')
   Card markup: <div class="card"><h2>…</h2>…</div>; grids: .grid2 .grid3; tables: table.kv
   Mark anything not from the archive with <span class="tag-inf">inferred</span>.
   PANELS: use the product's real artwork. Most products have a 2016|49 drafting set
   ("<product> - #ARTWORK #DA #2016/...SILK (CURVE).pdf") with each ink separation between
   crop marks. tools/silk_extract.py cuts them into transparent PNGs in assets/; stack them
   over the panel colour in an SVG and put LEDs, displays and knobs on the drill crosshairs
   (see frontSVG/rearSVG in pod33.js). With no silk, draw to scale from the #Mechanical
   paint/panel drawings (see towersSVG in bigvu.js) and the product photos.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const state = { level: -20 };

SIM.register({
  id: 'template',
  name: 'Template product (yyyy|n)',
  duration: 1,                                   // seconds simulated
  stepUnits: [ {label:'1 ms', period:()=>0.001}, {label:'1 sample @ 48k', period:()=>1/48000} ],
  zooms: [[1,'1 s'], [0.01,'10 ms'], [0.001,'1 ms']],
  defaultZoom: 0,
  tabs: [
    { id:'sim', label:'Simulator', render(m){
        m.innerHTML = `<div class="card"><h2>Timeline</h2><canvas id="tl"></canvas></div>`;
        SIM.on('time', ()=>{
          SIM.drawLanes(m.querySelector('#tl'), [
            { label:'48 kHz sample clock', h:24, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,5e-6,SIM.css('--accent'),'samples'); } },
          ]);
        });
    }},
    { id:'tutorial', label:'Tutorial', render(m){ m.innerHTML = `<div class="card"><h2>How to use it</h2><ol><li>…</li></ol></div>`; } },
  ],
});
})();
