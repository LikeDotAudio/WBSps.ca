"use strict";
var WbsCam = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/camDraw.ts
  var camDraw_exports = {};
  __export(camDraw_exports, {
    LAYER_COLOURS: () => LAYER_COLOURS,
    apertures: () => apertures,
    boardSvg: () => boardSvg,
    excellon: () => excellon,
    gerber: () => gerber,
    hpgl: () => hpgl,
    plotSvg: () => plotSvg
  });
  var grow = (b, x, y, r = 0) => {
    if (x - r < b[0]) b[0] = x - r;
    if (y - r < b[1]) b[1] = y - r;
    if (x + r > b[2]) b[2] = x + r;
    if (y + r > b[3]) b[3] = y + r;
  };
  var empty = () => [Infinity, Infinity, -Infinity, -Infinity];
  function apertures(text) {
    const out = /* @__PURE__ */ new Map();
    for (const line of text.split(/\r?\n/)) {
      let m = line.match(/^\s*D(\d+)\s+(Ellipse|Round|Circle|Sq Rect|Square|Rect(?:angle)?|Oval|Obround|Target|Thermal)\s+(\d+)\s+(\d+)/i);
      if (m) {
        const s = m[2].toLowerCase(), w = +m[3] / 1e3, h = +m[4] / 1e3;
        out.set(+m[1], { shape: /sq|square/.test(s) ? "square" : /rect/.test(s) ? "rect" : /oval|obround/.test(s) || /ellipse/.test(s) && w !== h ? "oval" : "round", w, h });
        continue;
      }
      m = line.match(/^\s*(\d+)\s+(\d+)\s+[A-Z]\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\d+(?:\.\d+)?))?/);
      if (m && +m[1] >= 10) {
        const shape = +m[2], size = +m[3] / 1e3, len = m[5] ? +m[5] / 1e3 : size;
        out.set(+m[1], shape === 2 ? { shape: "square", w: size, h: size } : shape === 3 || shape === 4 ? { shape: "rect", w: Math.max(size, len), h: Math.min(size, len) || size } : shape === 5 ? { shape: "oval", w: Math.max(size, len), h: size } : { shape: "round", w: size, h: size });
      }
    }
    for (const m of text.matchAll(/%ADD(\d+)([CROP]),([\d.]+)(?:X([\d.]+))?/g)) {
      const w = +m[3], h = m[4] ? +m[4] : w;
      out.set(+m[1], { shape: m[2] === "C" ? "round" : m[2] === "R" ? w === h ? "square" : "rect" : "oval", w, h });
    }
    return out;
  }
  function gerber(text, ap, unit = 1e-4) {
    const fs = text.match(/%FS[LT][AI]X(\d)(\d)Y\d\d\*%/);
    if (fs) unit = Math.pow(10, -+fs[2]);
    const mm = /%MOMM\*%|G71\*/.test(text);
    const k = unit * (mm ? 1 / 25.4 : 1);
    const L = { strokes: /* @__PURE__ */ new Map(), flashes: [], box: empty() };
    let x = 0, y = 0, d = 0, cur = 10, moved = true;
    const apOf = (n) => ap.get(n) || { shape: "round", w: 8e-3, h: 8e-3 };
    const r2 = (v) => +v.toFixed(5);
    for (const raw of text.split("*")) {
      const s = raw.replace(/[\r\n%\s]/g, "");
      if (!s || /^(FS|MO|IP|SF|AD|AM|LP|LN|OF|IN|G04)/.test(s)) continue;
      const sel = s.match(/^(?:G54)?D(\d+)$/);
      if (sel && +sel[1] >= 10) {
        cur = +sel[1];
        moved = true;
        continue;
      }
      const mx = s.match(/X([+-]?\d+)/), my = s.match(/Y([+-]?\d+)/), md = s.match(/D0?([123])(?!\d)/);
      if (!mx && !my && !md) continue;
      const nx = mx ? +mx[1] * k : x, ny = my ? +my[1] * k : y;
      if (md) d = +md[1];
      const a = apOf(cur);
      if (d === 1) {
        const key = String(cur);
        if (!L.strokes.has(key)) L.strokes.set(key, { width: a.w, d: [] });
        const st = L.strokes.get(key);
        st.d.push((moved ? `M${r2(x)} ${r2(y)}` : "") + `L${r2(nx)} ${r2(ny)}`);
        grow(L.box, x, y, a.w / 2);
        grow(L.box, nx, ny, a.w / 2);
        moved = false;
      } else if (d === 3) {
        L.flashes.push({ x: nx, y: ny, ap: a });
        grow(L.box, nx, ny, Math.max(a.w, a.h) / 2);
        moved = true;
      } else moved = true;
      x = nx;
      y = ny;
    }
    return L;
  }
  function excellon(text) {
    const tools = /* @__PURE__ */ new Map(), out = { holes: [], box: empty() };
    for (const m of text.matchAll(/T(\d+)(?:F\d+)?(?:S\d+)?C([\d.]+)/g)) tools.set(+m[1], +m[2]);
    const metric = /METRIC/.test(text);
    const num = (s) => {
      if (s.includes(".")) return +s;
      const neg = s.startsWith("-"), digits = s.replace(/^[+-]/, "");
      const v = +digits / Math.pow(10, Math.max(0, digits.length - (metric ? 3 : 2)));
      return neg ? -v : v;
    };
    let t = 1, x = 0, y = 0, body = !/M48/.test(text);
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (s === "%" || s === "M95") {
        body = true;
        continue;
      }
      const tm = s.match(/^T(\d+)$/);
      if (tm) {
        t = +tm[1];
        body = true;
        continue;
      }
      if (!body) continue;
      const mx = s.match(/X([+-]?[\d.]+)/), my = s.match(/Y([+-]?[\d.]+)/);
      if (!mx && !my) continue;
      if (mx) x = num(mx[1]);
      if (my) y = num(my[1]);
      const dia = tools.get(t) || 0.03 + t * 4e-3;
      out.holes.push([x, y, dia]);
      grow(out.box, x, y, dia / 2);
    }
    return out;
  }
  function hpgl(text) {
    const P = { pens: /* @__PURE__ */ new Map(), labels: [], box: empty() };
    const U = 1 / 1016;
    let x = 0, y = 0, down = false, pen = 1, abs = true, size = 0.1;
    let line = [];
    const flush = () => {
      if (line.length > 1) {
        if (!P.pens.has(pen)) P.pens.set(pen, []);
        P.pens.get(pen).push("M" + line.join("L"));
      }
      line = [];
    };
    const at = () => `${+(x * U).toFixed(4)} ${+(-y * U).toFixed(4)}`;
    const clean = text.replace(/\x1b\.[^:;]*[:;]?/g, "");
    const cmds = clean.split(/;|\n/);
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i].trim();
      if (!c) continue;
      const op = c.slice(0, 2).toUpperCase(), args = c.slice(2);
      if (op === "LB") {
        let t = args;
        while (!t.includes("") && i + 1 < cmds.length) t += ";" + cmds[++i];
        P.labels.push({ x: x * U, y: -y * U, size, text: t.split("")[0] });
        continue;
      }
      const nums = (args.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (op === "SP") {
        flush();
        pen = nums[0] || 0;
      } else if (op === "PA") abs = true;
      else if (op === "PR") abs = false;
      else if (op === "SI") size = (nums[1] || 0.3) / 2.54;
      else if (op === "IN") {
        flush();
        x = y = 0;
        down = false;
        abs = true;
      }
      if (op === "PU" || op === "PD") {
        if (op === "PU") flush();
        down = op === "PD";
        if (down && !line.length) line.push(at());
      }
      if (["PU", "PD", "PA", "PR"].includes(op)) {
        for (let j = 0; j + 1 < nums.length; j += 2) {
          x = abs ? nums[j] : x + nums[j];
          y = abs ? nums[j + 1] : y + nums[j + 1];
          grow(P.box, x * U, -y * U);
          if (down) line.push(at());
          else {
            flush();
          }
        }
      }
      if (op === "CI" && nums[0]) {
        const r = nums[0] * U, cx = x * U, cy = -y * U;
        if (!P.pens.has(pen)) P.pens.set(pen, []);
        P.pens.get(pen).push(`M${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}`);
        grow(P.box, cx, cy, r);
      }
    }
    flush();
    return P;
  }
  var PEN = ["#1f1e1c", "#1f1e1c", "#c8102e", "#1f6f3f", "#1f3f8b", "#8b5a1f", "#6d2a8b", "#1f7f7f", "#6d6a63"];
  var LAYER_COLOURS = {
    "copper top": "#c8102e",
    "copper bottom": "#1f5f9f",
    "solder mask": "#2f8f4f",
    "component mask": "#6f9f2f",
    silkscreen: "#e8e4d8",
    "drill drawing": "#c89a10",
    drill: "#1f1e1c"
  };
  function boardSvg(layers) {
    const b = empty();
    for (const l of layers) {
      const bb = l.layer ? l.layer.box : l.holes ? l.holes.box : null;
      if (bb && isFinite(bb[0])) {
        grow(b, bb[0], bb[1]);
        grow(b, bb[2], bb[3]);
      }
    }
    if (!isFinite(b[0])) return '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const pad = 0.1, W = b[2] - b[0] + 2 * pad, H = b[3] - b[1] + 2 * pad;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(b[0] - pad).toFixed(3)} ${(-b[3] - pad).toFixed(3)} ${W.toFixed(3)} ${H.toFixed(3)}" data-w-in="${W.toFixed(3)}" data-h-in="${H.toFixed(3)}">`;
    s += `<rect x="${(b[0] - pad).toFixed(3)}" y="${(-b[3] - pad).toFixed(3)}" width="${W.toFixed(3)}" height="${H.toFixed(3)}" fill="#14301f"/>`;
    for (const l of layers) {
      const col = LAYER_COLOURS[l.role] || "#aaa";
      s += `<g class="layer" data-role="${l.role}" transform="scale(1,-1)" fill="${col}" stroke="${col}" opacity="${l.role === "solder mask" || l.role === "component mask" ? 0.45 : 0.85}">`;
      if (l.layer) {
        for (const [, st] of l.layer.strokes) s += `<path d="${st.d.join("")}" fill="none" stroke-width="${st.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
        for (const f of l.layer.flashes) {
          const a = f.ap;
          s += a.shape === "round" ? `<circle cx="${+f.x.toFixed(4)}" cy="${+f.y.toFixed(4)}" r="${a.w / 2}" stroke="none"/>` : `<rect x="${+(f.x - a.w / 2).toFixed(4)}" y="${+(f.y - a.h / 2).toFixed(4)}" width="${a.w}" height="${a.h}" rx="${a.shape === "oval" ? Math.min(a.w, a.h) / 2 : 0}" stroke="none"/>`;
        }
      }
      if (l.holes) for (const [x, y, dia] of l.holes.holes) s += `<circle cx="${+x.toFixed(4)}" cy="${+y.toFixed(4)}" r="${dia / 2}" fill="#0a0a0a" stroke="#d8d4c6" stroke-width=".004"/>`;
      s += "</g>";
    }
    return s + "</svg>";
  }
  function plotSvg(p) {
    const b = p.box;
    if (!isFinite(b[0])) return '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const pad = 0.2, W = b[2] - b[0] + 2 * pad, H = b[3] - b[1] + 2 * pad;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(b[0] - pad).toFixed(3)} ${(b[1] - pad).toFixed(3)} ${W.toFixed(3)} ${H.toFixed(3)}" data-w-in="${W.toFixed(3)}" data-h-in="${H.toFixed(3)}">`;
    s += `<rect x="${(b[0] - pad).toFixed(3)}" y="${(b[1] - pad).toFixed(3)}" width="${W.toFixed(3)}" height="${H.toFixed(3)}" fill="#fbfaf4"/>`;
    for (const [pen, ds] of p.pens) s += `<path class="pen${pen}" d="${ds.join("")}" fill="none" stroke="${PEN[pen % PEN.length]}" stroke-width=".012" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (const l of p.labels) s += `<text x="${l.x.toFixed(3)}" y="${l.y.toFixed(3)}" font-size="${(l.size * 1.4).toFixed(3)}" font-family="Arial, sans-serif" fill="#1f1e1c">${l.text.replace(/[<&]/g, (c) => c === "<" ? "&lt;" : "&amp;")}</text>`;
    return s + "</svg>";
  }
  return __toCommonJS(camDraw_exports);
})();
