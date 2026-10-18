/**
 * wbs_panel.js — a Ward-Beck module's front panel, drawn as a CAD line drawing, live in the page.
 *
 * The layouts are the simulator's own (TPL and tplFor, copied in from simulator_template.html when the pages are built),
 * so the panel here, on the index and in the simulator always agree: faceplate, screws, badge, then each control in
 * order down the strip (knobs, switches, buttons, fader, meter).
 *
 *   wbsPanel(svg, {m: code, n: name, cat: category})   draws into an <svg>
 *   <svg class="wbs-panel" data-m="M450B" data-n="Program Summing Amplifier" data-cat="SUMMING">   drawn by itself on load
 */
(() => {
  const TPL = {
  input: { what: 'Input module: mic/line gain stage, 3-band EQ with high-pass, channel ON and fader.',
    controls: [['sw','mic','MIC/LINE',1], ['knob','gain','GAIN',30,0,70,'dB'], ['sw','pad','PAD -20',0], ['knob','hf','HF',0,-15,15,'dB'],
      ['knob','mf','MID',0,-15,15,'dB'], ['knob','mff','MID FREQ',1000,300,5000,'Hz'], ['knob','lf','LF',0,-15,15,'dB'],
      ['sw','hpf','HPF 80',0], ['btn','on','ON',1], ['fader','fader','FADER',0,-60,10,'dB']] },
  eq: { what: 'Equalizer: high / mid / low bands, high-pass and low-pass filters, IN/OUT.',
    controls: [['knob','hf','HF 10k',0,-15,15,'dB'], ['knob','mf','MID',0,-15,15,'dB'], ['knob','mff','FREQ',1000,200,8000,'Hz'],
      ['knob','lf','LF 100',0,-15,15,'dB'], ['sw','hpf','HP 80',0], ['sw','lpf','LP 10k',0], ['btn','in','EQ IN',1]] },
  comp: { what: 'Compressor / limiter: threshold, ratio, attack, release, make-up gain, gain-reduction meter.',
    controls: [['meter','gr','GAIN RED.'], ['knob','thr','THRESH',-20,-50,0,'dB'], ['knob','ratio','RATIO',4,1,20,':1'],
      ['knob','att','ATTACK',10,1,100,'ms'], ['knob','rel','RELEASE',250,50,2000,'ms'], ['knob','mk','OUTPUT',0,-10,20,'dB'], ['btn','in','IN',1]] },
  sum: { what: 'Summing / master: four sources (100 Hz, 440 Hz, 1 kHz, 5 kHz) mixed to one output with a master fader.',
    controls: [['knob','c1','INPUT 1',-10,-60,10,'dB'], ['knob','c2','INPUT 2',-10,-60,10,'dB'], ['knob','c3','INPUT 3',-10,-60,10,'dB'],
      ['knob','c4','INPUT 4',-10,-60,10,'dB'], ['btn','on','ON',1], ['fader','fader','MASTER',0,-60,10,'dB']] },
  select: { what: 'Switcher / selector: eight inputs (each a different frequency, 100 Hz – 800 Hz) to one output.',
    controls: [['rot','sel','INPUT',1,1,8], ['knob','gain','LEVEL',0,-20,10,'dB'], ['btn','on','ON',1]] },
  monitor: { what: 'Monitor module: program A/B select, volume, dim and cut to the speaker output.',
    controls: [['rot','sel','SOURCE',1,1,2], ['knob','vol','VOLUME',-10,-60,10,'dB'], ['btn','dim','DIM -20',0], ['btn','cut','CUT',0], ['meter','vu','VU']] },
  meter: { what: 'Meter: VU (300 ms ballistics) or PPM (10 ms attack, slow fall) on the input signal.',
    controls: [['meter','vu','LEVEL'], ['knob','trim','TRIM',0,-20,20,'dB'], ['sw','ppm','VU/PPM',0]] },
  da: { what: 'Distribution amplifier: one input split to four isolated outputs, each with its own trim.',
    controls: [['knob','gain','INPUT',0,-20,20,'dB'], ['knob','o1','OUT 1',0,-10,10,'dB'], ['knob','o2','OUT 2',0,-10,10,'dB'],
      ['knob','o3','OUT 3',0,-10,10,'dB'], ['knob','o4','OUT 4',0,-10,10,'dB']], outputs: 4 },
  amp: { what: 'Amplifier: gain stage driving the output; for power amplifiers the output power into 8 Ω is shown.',
    controls: [['knob','gain','GAIN',0,-20,30,'dB'], ['btn','on','ON',1], ['meter','vu','OUTPUT']] },
  osc: { what: 'Oscillator: its own tone generator (frequency, level, waveform). The test signal panel is not used.',
    controls: [['rot','fsel','FREQ',2,1,4], ['knob','lvl','LEVEL',4,-40,24,'dBu'], ['sw','sq','SINE/SQ',0], ['btn','on','ON',1]], self: true },
  psu: { what: 'Power supply: rail voltages under load (no audio path). Sag and ripple rise with load.',
    controls: [['knob','load','LOAD',30,0,100,'%'], ['btn','on','POWER',1]], noaudio: true },
  logic: { what: 'Logic / relay card: latching buttons drive relays; relay 1 switches the audio through.',
    controls: [['btn','k1','RELAY 1',1], ['btn','k2','RELAY 2',0], ['btn','k3','RELAY 3',0], ['btn','k4','RELAY 4',0]] },
  intercom: { what: 'Intercom / talkback: TALK keys the microphone (the test signal) onto the line; crosspoints route it.',
    controls: [['btn','talk','TALK',0], ['knob','tb','TALK LEVEL',0,-30,10,'dB'], ['btn','x1','XPT 1',1], ['btn','x2','XPT 2',0],
      ['knob','vol','LISTEN',-10,-60,10,'dB']] },
};
function tplFor(m) {
  const n = (m.name || '').toLowerCase(), c = m.category;
  if (/oscillat/.test(n)) return 'osc';
  if (/meter|vu\b|ppm/.test(n) || c === 'METER' || c === 'METERING') return 'meter';
  if (/compress|limit|gate|dynamic/.test(n) || c === 'DYNAMICS') return 'comp';
  if (/equali|filter|\beq\b/.test(n) || c === 'FILTERS') return 'eq';
  if (/distribution|\bda\b/.test(n)) return 'da';
  if (/power supply|psu/.test(n) || c === 'POWER') return 'psu';
  if (/monitor/.test(n) || c === 'MONITORING') return 'monitor';
  if (/talkback|intercom|crosspoint/.test(n) || c === 'COMMUNICATION') return 'intercom';
  if (/switch|selector|interface|router/.test(n) || c === 'ROUTING') return 'select';
  if (/summ|master|submaster|mix/.test(n) || c === 'SUMMING') return 'sum';
  if (/input|pre-?amp|mic/.test(n) || c === 'INPUT-PRE-AMPS') return 'input';
  if (c === 'LOGIC' || c === 'COMPUTERS' || /relay|latch|logic/.test(n)) return 'logic';
  if (c === 'AMPLIFIERS' || c === 'OPENGEAR' || c === '8200 SERIES') return /amplifier/.test(n) && !/distribution/.test(n) ? 'amp' : 'da';
  return 'amp';
}

// ---------------------------------------------------------------- audio engine
let ctx = null, mod = null, tpl = null, P = {}, graph = null, listen = false;
const dbToLin = d => Math.pow(10, d / 20);
const toDbu = rms => rms > 1e-9 ? 20 * Math.log10(rms * Math.SQRT2) + 24 : -Infinity;   // 0 dBFS sine = +24 dBu
  window.WBS_TPL = TPL; window.wbsTplFor = tplFor;   // the layouts, for the live panel too (wbs_live_panel.js)
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, p) => { const x = document.createElementNS(NS, t); for (const k in a) x.setAttribute(k, a[k]); p.appendChild(x); return x; };
  const rowH = { knob: 84, sw: 50, btn: 52, fader: 190, rot: 92, meter: 96 };
  const draw = (svg, m) => {
    const tpl = TPL[tplFor({ name: m.n, category: m.cat })] || TPL.amp, W = 120;
    const H = 90 + tpl.controls.reduce((a, c) => a + rowH[c[0]], 0) + 30;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `-2 -2 ${W + 4} ${H + 4}`);
    const lab = (t, x, y, size) => { const e = el('text', { x, y, 'font-size': size }, svg); e.textContent = t; };
    el('rect', { x: 0, y: 0, width: W, height: H, rx: 3, class: 'ln' }, svg);
    el('rect', { x: 4, y: 4, width: W - 8, height: H - 8, rx: 2, class: 'ln', 'stroke-dasharray': '3 2' }, svg);
    [10, H - 10].forEach(y => { el('circle', { cx: W / 2, cy: y, r: 3, class: 'ln' }, svg); el('line', { x1: W / 2 - 2, y1: y, x2: W / 2 + 2, y2: y, class: 'ln' }, svg); });
    el('rect', { x: 14, y: 20, width: W - 28, height: 18, rx: 6, class: 'ln' }, svg);
    lab('WBS', W / 2, 33, 11); lab(m.m, W / 2, 56, 12);
    let y = 86;
    tpl.controls.forEach(c => {
      const [type, , label] = c, cx = W / 2;
      lab(label, cx, y + 8, 7);
      if (type === 'knob' || type === 'rot') {
        const cy = y + 38;
        el('circle', { cx, cy, r: 17, class: 'ln' }, svg); el('circle', { cx, cy, r: 11, class: 'ln' }, svg);
        el('line', { x1: cx, y1: cy - 11, x2: cx, y2: cy - 3, class: 'ln' }, svg);
        for (let i = 0; i <= 10; i++) { const a = (-135 + i * 27) * Math.PI / 180;
          el('line', { x1: cx + Math.sin(a) * 20, y1: cy - Math.cos(a) * 20, x2: cx + Math.sin(a) * 24, y2: cy - Math.cos(a) * 24, class: 'ln' }, svg); }
      } else if (type === 'sw') {
        el('rect', { x: cx - 9, y: y + 16, width: 18, height: 26, rx: 2, class: 'ln' }, svg); el('circle', { cx, cy: y + 23, r: 3.5, class: 'fi' }, svg);
      } else if (type === 'btn') {
        el('rect', { x: cx - 16, y: y + 16, width: 32, height: 24, rx: 3, class: 'ln' }, svg); el('rect', { x: cx - 11, y: y + 20, width: 22, height: 16, rx: 2, class: 'ln' }, svg);
      } else if (type === 'fader') {
        const top = y + 22, len = 150;
        el('rect', { x: cx - 2, y: top, width: 4, height: len, class: 'ln' }, svg);
        for (let k = 0; k <= 7; k++) el('line', { x1: cx + 8, y1: top + k * len / 7, x2: cx + 14, y2: top + k * len / 7, class: 'ln' }, svg);
        el('rect', { x: cx - 13, y: top + len * .3, width: 26, height: 14, rx: 2, class: 'ln' }, svg);
        el('line', { x1: cx - 10, y1: top + len * .3 + 7, x2: cx + 10, y2: top + len * .3 + 7, class: 'ln' }, svg);
      } else if (type === 'meter') {
        el('rect', { x: 12, y: y + 13, width: W - 24, height: 72, rx: 3, class: 'ln' }, svg);
        el('path', { d: `M${cx - 40},${y + 50} Q${cx},${y + 28} ${cx + 40},${y + 50}`, class: 'ln' }, svg);
        el('line', { x1: cx, y1: y + 80, x2: cx + 14, y2: y + 36, class: 'ln' }, svg);
      }
      y += rowH[type];
    });
  };
  window.wbsPanel = draw;
  const css = document.createElement('style');
  css.textContent = '.wbs-panel .ln,.fp .ln{fill:none;stroke:var(--type,#1f1e1c);stroke-width:1.1}.wbs-panel .fi,.fp .fi{fill:var(--type,#1f1e1c)}' +
    '.wbs-panel text,.fp text{fill:var(--type,#1f1e1c);font-family:Arial,sans-serif;font-weight:700;text-anchor:middle}';
  document.head.appendChild(css);
  const all = () => document.querySelectorAll('svg.wbs-panel[data-m]').forEach(svg => draw(svg, svg.dataset));
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', all) : all();
})();
