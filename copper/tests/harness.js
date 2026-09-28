// Runs the whole game in Node: loads every script listed in copper/index.html
// into one VM context (no DOM, no audio), then lets a test press buttons, step
// frames, and read state or the framebuffer. frame PNGs help when a test fails.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

function scripts() {
  // our own page: collect the src attribute of each <script> tag with a plain scan
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  let i = 0;
  while ((i = html.indexOf('<script', i)) >= 0) {
    const end = html.indexOf('>', i);
    const tag = html.slice(i, end);
    const at = tag.indexOf('src="');
    if (at >= 0) out.push(tag.slice(at + 5, tag.indexOf('"', at + 5)));
    i = end;
  }
  return out;
}

function load(opts) {
  opts = opts || {};
  const store = new Map();
  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Map, Set, Uint32Array, Uint8Array, Int16Array, Float32Array, Error, RangeError,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const src of scripts()) {
    const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
    vm.runInContext(code, ctx, { filename: src });
  }
  const CD = ctx.CD;
  CD.clock.fixed = opts.hour === undefined ? 12 : opts.hour;   // tests run at noon unless asked
  if (opts.seed !== undefined) {
    let a = opts.seed >>> 0;
    CD.rng = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    ctx.Math = Object.create(Math); ctx.Math.random = CD.rng;
  }
  const errors = [];
  CD.onError = (e, name) => { errors.push(name + ': ' + (e && e.stack || e)); };
  const h = {
    CD, ctx, errors, store,
    step(n) { for (let i = 0; i < (n || 1); i++) CD.engine.step(); if (errors.length) throw new Error(errors.join('\n')); },
    // press a button for one frame then release it and let `after` frames pass
    press(btn, after) { CD.input.script(btn, true); h.step(1); CD.input.script(btn, false); h.step(after === undefined ? 6 : after); },
    hold(btn, frames) { CD.input.script(btn, true); h.step(frames); CD.input.script(btn, false); h.step(1); },
    draw() { CD.engine.draw(CD.gfx.screen); return CD.gfx.screen; },
    png(file) { h.draw(); writePNG(file, CD.gfx.screen); },
    // advance until pred() or give up
    until(pred, max, btn) { for (let i = 0; i < (max || 3000); i++) { if (pred()) return true; if (btn && i % 8 === 0) h.press(btn, 1); else h.step(1); } return pred(); },
    // mash A through dialogue until no text box is open and scripts are idle
    settle(max) {
      for (let i = 0; i < (max || 4000); i++) {
        const top = CD.engine.top();
        const busy = top && top !== CD.overworld.scene;
        if (!busy && !CD.ow.locked && !CD.ow.player.moving) { h.step(2); if (!CD.ow.locked && CD.engine.top() === CD.overworld.scene) return true; }
        if (i % 6 === 0) h.press('a', 1); else h.step(1);
      }
      return false;
    },
    // walk n tiles in a direction by holding the d-pad; stops early if blocked or a script takes over
    walk(dir, n) {
      const p = CD.ow.player;
      for (let i = 0; i < n; i++) {
        const sx = p.x, sy = p.y, sm = CD.state.map;
        CD.input.script(dir, true);
        let moved = false;
        for (let f = 0; f < 40; f++) { h.step(1); if (p.moving) { moved = true; break; } if (CD.ow.locked) break; }
        CD.input.script(dir, false);
        if (!moved) { h.step(1); return i; }
        h.until(() => !p.moving, 60);
        if (CD.ow.locked || CD.state.map !== sm && !(p.x !== sx || p.y !== sy)) return i + 1;
      }
      return n;
    },
    route(steps) { for (const st of steps.split(' ')) { const d = { u: 'up', d: 'down', l: 'left', r: 'right' }[st[0]]; h.walk(d, +st.slice(1) || 1); } },
    top() { return CD.engine.top(); },
    topText() { const t = CD.engine.top(); return t && t.lines ? t.lines.join(' ') : null; },
  };
  return h;
}

// Minimal PNG encoder for RGBA framebuffers
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, surf, scale) {
  scale = scale || 3;
  const W = surf.w * scale, H = surf.h * scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const c = surf.data[Math.floor(y / scale) * surf.w + Math.floor(x / scale)];
      const o = y * (W * 4 + 1) + 1 + x * 4;
      raw[o] = c & 255; raw[o + 1] = (c >>> 8) & 255; raw[o + 2] = (c >>> 16) & 255; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, png);
}

module.exports = { load, writePNG, scripts };
