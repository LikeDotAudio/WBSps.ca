/**
 * wbs_live_panel.js — a Ward-Beck module's front panel, live, built from OPEN-AIR's controls (libControl: WBS-ELMA
 * knobs, LTP fader, wink and trapezoid buttons, needle VU meter) and laid out by the simulator's panel templates
 * (TPL / tplFor, the same ones wbs_panel.js draws as a CAD line drawing).
 *
 *   <div class="wbs-live" data-m="M450B" data-n="Program Summing Amplifier" data-cat="SUMMING"></div>
 *   wbsLivePanel(div, {m, n, cat})        draws into the div; every control turns, slides and lights
 *
 * Needs, loaded before it: _catalog/libcontrol/react.js, react-dom.js, libcontrol.js (+ libcontrol.css) and
 * _catalog/wbs_panel.js (for the layouts). Presets: _catalog/libcontrol/wbs_presets.json (from the OPEN-AIR samples).
 * The intercom / microCOM family gets trapezoid buttons, everything else wink buttons.
 */
(() => {
  const me = document.currentScript ? document.currentScript.src : '';
  const base = me.replace(/wbs_live_panel\.js(\?.*)?$/, '') + 'libcontrol/';
  const h = (...a) => React.createElement(...a);
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  const named = (o, text) => {   // a preset with this control's own legend
    const c = clone(o);
    if (c.label && c.label.active) c.label.active.text = { En: text };
    else c.label = { ...(c.label || {}), En: text, show_label: true };
    return c;
  };
  let presets = null;
  const loadPresets = () => presets = presets || fetch(base + 'wbs_presets.json').then(r => r.json()).catch(() => ({}));

  function Control({ c, P, comm }) {
    const [type, , label, def, min, max] = c;
    const [v, setV] = React.useState(type === 'knob' || type === 'rot' ? ((def - min) / ((max - min) || 1)) * 100 : type === 'fader' ? 70 : !!def);
    const lab = h('div', { className: 'wl-lab' }, label);
    if (type === 'knob' || type === 'rot') {
      const cfg = named(P.knob, label);
      cfg.geometry = { width: 62, height: 62 };
      return h('div', { className: 'wl-row' }, lab, h(window.Knob, { value: v, onChange: setV, config: cfg, size: 62 }));
    }
    if (type === 'fader') {
      const cfg = named(P.fader, label);
      return h('div', { className: 'wl-row wl-fader' }, h(window.LTPFader, { value: v, onChange: setV, config: cfg }));
    }
    if (type === 'meter') {
      const cfg = named(P.meter, label);
      cfg.geometry = { width: 96, height: 96 };
      return h('div', { className: 'wl-row' }, h(Meter, { cfg }));
    }
    const Btn = comm ? window.OcaTrapezoidButton : window.OcaWinkButton;   // intercom / microCOM: trapezoid keys
    const cfg = named(comm ? P.trapezoid : P.wink, label);
    cfg.width = comm ? 58 : 40; cfg.height = comm ? 36 : 40; cfg.latching = true;
    if ('text_inside' in cfg) cfg.text_inside = label;   // the key's own legend, lit inside it
    return h('div', { className: 'wl-row' }, h(Btn, { label, value: v, onChange: x => setV(typeof x === 'boolean' ? x : !v), config: cfg }));
  }
  function Meter({ cfg }) {   // a needle that lives: programme-like movement around -6 VU
    const [v, setV] = React.useState(-20);
    React.useEffect(() => {
      let t = 0;
      const id = setInterval(() => { t += .25; setV(-7 + 4 * Math.sin(t) + 3 * Math.sin(t * 2.7) + (Math.random() - .5) * 2); }, 120);
      return () => clearInterval(id);
    }, []);
    return h(window.NeedleMeter, { value: v, config: cfg });
  }
  function Panel({ m, P }) {
    const tpl = (window.WBS_TPL || {})[window.wbsTplFor ? window.wbsTplFor({ name: m.n, category: m.cat }) : 'amp'] || { controls: [] };
    const comm = /COMMUNICATION|MICRO SERIES|INTERCOM/.test(m.cat || '') || /intercom|talkback|micro ?com|crosspoint/i.test(m.n || '');
    return h('div', { className: 'wl-face' },
      h('div', { className: 'wl-screw' }),
      h('div', { className: 'wl-badge' }, 'WBS'),
      h('div', { className: 'wl-code' }, m.m),
      h('div', { className: 'wl-name' }, (m.n || '').toUpperCase().slice(0, 26)),
      ...tpl.controls.map((c, i) => h(Control, { key: i, c, P, comm })),
      h('div', { className: 'wl-screw' }));
  }
  const css = `.wbs-live{display:inline-block}.wl-face{width:132px;padding:8px 8px 10px;background:linear-gradient(90deg,#3b3e42,#4a4e53 40%,#3b3e42);
border-radius:4px;box-shadow:inset 0 0 0 1px #1d1f21,0 8px 18px #0006;display:flex;flex-direction:column;align-items:center;gap:6px;color:#e8e4d8;
font:700 9px/1.2 Arial,sans-serif;letter-spacing:.06em}.wl-screw{width:10px;height:10px;border-radius:50%;background:radial-gradient(#bbb,#666);box-shadow:0 0 0 1px #222}
.wl-badge{border:1.4px solid #e8e4d8;border-radius:7px;padding:1px 14px;font-size:12px}.wl-code{font-size:12px}.wl-name{font-size:7px;color:#cfcabb;text-align:center;min-height:9px}
.wl-row{display:flex;flex-direction:column;align-items:center;gap:2px}.wl-lab{font-size:8px;text-align:center}.wl-fader{height:230px;overflow:hidden}`;

  window.wbsLivePanel = (el, m) => {
    if (!window.React || !window.Knob) { el.textContent = ''; return; }
    if (!document.getElementById('wl-css')) document.head.insertAdjacentHTML('beforeend', `<style id="wl-css">${css}</style>`);
    loadPresets().then(P => ReactDOM.createRoot(el).render(h(Panel, { m, P })));
    const cad = el.nextElementSibling && el.nextElementSibling.matches('svg.wbs-panel') ? el.nextElementSibling : null;
    if (cad) {   // live ⇄ the CAD line drawing
      const b = Object.assign(document.createElement('button'), { className: 'flip', type: 'button', textContent: 'as a drawing' });
      cad.after(b);
      b.onclick = () => { const live = el.style.display !== 'none'; el.style.display = live ? 'none' : ''; cad.style.display = live ? 'block' : 'none';
                          b.textContent = live ? 'live' : 'as a drawing'; };
    }
  };
  const all = () => document.querySelectorAll('.wbs-live[data-m]').forEach(el => window.wbsLivePanel(el, el.dataset));
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', all) : all();
})();
