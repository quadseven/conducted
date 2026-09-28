// Train creature sprites, built from locomotive anatomy.
//
// A species' `art` spec names a body plan (steam, diesel, electric, maglev, coach,
// boxcar, hopper, tank, reactor, mono, tram) plus proportions, colours and
// features (stack, dome, bell, tender, pantograph, spikes, horn, wings, face).
// The builder turns that into shape ops; the rasterizer shades each op by its
// form (cylinders lit along their length, boxes by face, discs as spheres),
// outlines the silhouette, inks the seams between parts, and finally paints the
// face: every train here is a creature, and it looks at you.
//
// Sprites face left (toward the player's side). The player's own train is the
// same sprite mirrored and enlarged.
(function (CD) {
  'use strict';
  const { Surface, hex, mix, shade, bayer } = CD.gfx;
  const P = CD.pal;
  const SZ = 64, GROUND = 59;
  const cache = new Map();

  // ---------- rasterizer ----------
  class Canvas {
    constructor() {
      this.col = new Uint32Array(SZ * SZ);
      this.tone = new Float32Array(SZ * SZ).fill(-1);
      this.grp = new Int16Array(SZ * SZ).fill(-1);
      this.flat = new Uint8Array(SZ * SZ);
      this.g = 0;
    }
    put(x, y, c, t, flat) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= SZ || y >= SZ) return;
      const i = y * SZ + x;
      this.col[i] = hex(c); this.tone[i] = t; this.grp[i] = this.g; this.flat[i] = flat ? 1 : 0;
    }
    group() { return ++this.g; }
  }
  // tone: 0 (deep shadow) .. 1 (highlight); quantized into a 5-step ramp at compose time
  function cyl(cv, x0, x1, yc, r, c, opts) {
    opts = opts || {};
    cv.group();
    for (let y = Math.floor(yc - r); y <= Math.ceil(yc + r); y++) {
      const v = (y + 0.5 - yc) / r; if (Math.abs(v) > 1) continue;
      // light from above-front: brightest a third of the way down from the top
      const t = 0.92 - Math.abs(v + 0.45) * 0.62 - (v > 0.6 ? 0.18 : 0);
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        let tt = t;
        if (opts.round) { const e = Math.min(x - x0, x1 - x) / r; if (e < 1 && Math.hypot(1 - e, v) > 1) continue; }
        if (x - x0 < 1.5) tt -= 0.08;
        cv.put(x, y, c, tt);
      }
    }
  }
  function box(cv, x, y, w, h, c, opts) {
    opts = opts || {};
    cv.group();
    const r = opts.r || 0;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      if (r) {
        const cx = xx < r ? r - xx - 0.5 : xx >= w - r ? xx - (w - r) + 0.5 : 0;
        const cy = yy < r ? r - yy - 0.5 : yy >= h - r ? yy - (h - r) + 0.5 : 0;
        if ((opts.rTop !== false || yy >= h - r) && (opts.rBot !== false || yy < r) && Math.hypot(cx, cy) > r) continue;
      }
      let t = 0.62 - (yy / h) * 0.28;
      if (yy < 2 && !opts.noTop) t = 0.88;
      if (xx < 1) t += 0.08;
      if (xx >= w - 1) t -= 0.12;
      if (yy >= h - 1) t -= 0.18;
      cv.put(x + xx, y + yy, c, t, opts.flat);
    }
  }
  function disc(cv, cx, cy, rx, ry, c, opts) {
    opts = opts || {};
    cv.group();
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny; if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      const t = opts.flat ? 0.6 : Math.max(0.05, Math.min(1, 0.25 + (-nx * 0.45 - ny * 0.6 + nz * 0.55) * 0.75));
      cv.put(x, y, c, t, opts.flat);
    }
  }
  function poly(cv, pts, c, opts) {
    opts = opts || {};
    cv.group();
    let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9;
    for (let i = 0; i < pts.length; i += 2) { minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]); minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      let inside = false;
      const px = x + 0.5, py = y + 0.5;
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if (!inside) continue;
      const t = opts.tone !== undefined ? opts.tone : 0.75 - (y - minY) / Math.max(1, maxY - minY) * 0.4;
      cv.put(x, y, c, t, opts.flat);
    }
  }
  function wheel(cv, cx, cy, r, c, spokes) {
    cv.group();
    const iron = hex(c || '#3a3a48');
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      let t = 0.35;
      if (d > r - 1.2) t = (y < cy ? 0.8 : 0.3);            // tyre
      else if (d < r * 0.28) t = 0.95;                        // hub
      else if (spokes && r > 3.5) {
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
        const k = ((a / (Math.PI * 2)) * spokes + 8) % 1;
        t = (k < 0.22) ? 0.62 : 0.22;
      }
      cv.put(x, y, d < r * 0.28 ? P.brass : iron, t);
    }
  }
  function line(cv, x0, y0, x1, y1, c, t) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) cv.put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c, t === undefined ? 0.6 : t, true);
  }

  // Quantize tones into a 5-step ramp of each pixel's own colour, dithering band edges
  function compose(cv, outlineCol) {
    const s = new Surface(SZ, SZ);
    const rampCache = new Map();
    for (let i = 0; i < SZ * SZ; i++) {
      const t = cv.tone[i]; if (t < 0) continue;
      const c = cv.col[i];
      let R = rampCache.get(c);
      if (!R) { R = [shade(c, -0.55), shade(c, -0.3), c, shade(c, 0.22), shade(c, 0.45)]; rampCache.set(c, R); }
      const x = i % SZ, y = (i / SZ) | 0;
      const f = Math.max(0, Math.min(0.999, t)) * 5;
      let k = Math.floor(f);
      if (!cv.flat[i] && (f - k) > 0.82 && bayer(x, y) < 0.25) k = Math.min(4, k + 1);
      s.data[i] = R[k];
    }
    // seams: where two groups meet, darken the pixel of the rear (lower id) group
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
      const i = y * SZ + x, g = cv.grp[i]; if (g < 0) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= SZ || yy >= SZ) continue;
        const g2 = cv.grp[yy * SZ + xx];
        if (g2 >= 0 && g2 > g) { s.data[i] = mix(s.data[i], hex(outlineCol), 0.55); break; }
      }
    }
    return CD.gfx.outline(s, outlineCol);
  }

  // ---------- faces ----------
  function eye(s, x, y, opts) {
    const iris = hex(opts.iris || '#3a5a8a');
    const w = opts.w || 4, h = opts.h || 5;
    // sclera
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      if ((xx === 0 || xx === w - 1) && (yy === 0 || yy === h - 1)) continue;
      s.px(x + xx, y + yy, '#fbf8f0');
    }
    // iris looks toward the viewer's left (the direction of travel)
    s.fill(x, y + 1, w - 1, h - 1, iris);
    s.fill(x, y + 2, Math.max(1, w - 2), h - 3, P.ink);
    s.px(x + 1, y + 1, '#ffffff');
    if (opts.style === 'fierce') { for (let i = 0; i < w + 1; i++) s.px(x - 1 + i, y - 1 + Math.floor(i * 0.6), P.ink); s.hline(x, y, w, P.ink); }
    else if (opts.style === 'sleepy') { s.fill(x, y, w, 2, opts.lid || '#8a8a9a'); s.hline(x, y + 2, w, P.ink); }
    else if (opts.style === 'bold') { s.hline(x - 1, y - 2, w + 1, P.ink); }
    // outline
    for (let yy = -1; yy <= h; yy++) for (let xx = -1; xx <= w; xx++) {
      const inside = xx >= 0 && yy >= 0 && xx < w && yy < h && !((xx === 0 || xx === w - 1) && (yy === 0 || yy === h - 1));
      if (inside) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const a = xx + dx, b = yy + dy; return a >= 0 && b >= 0 && a < w && b < h && !((a === 0 || a === w - 1) && (b === 0 || b === h - 1)); });
      if (near && s.get(x + xx, y + yy) >>> 24) s.px(x + xx, y + yy, P.ink);
    }
  }
  function face(s, cx, cy, spec, scale) {
    const f = spec.face || 'cute';
    const ew = Math.max(3, Math.min(6, Math.round(2.6 + 1.9 * scale))), eh = ew + 1;
    const gap = ew + Math.max(1, Math.round(scale * 1.5));
    const ey = Math.round(cy - eh * 0.75);
    eye(s, Math.round(cx - gap + 1), ey, { iris: spec.eye, style: f, w: ew, h: eh });
    eye(s, Math.round(cx + 1), ey, { iris: spec.eye, style: f, w: ew, h: eh });
    const my = Math.round(cy + eh * 0.5 + 1);
    const mw = Math.max(3, Math.round(3 + 2 * scale));
    const m = spec.mouth || (f === 'fierce' ? 'grin' : 'smile');
    const mx = Math.round(cx - mw / 2);
    if (m === 'smile') { s.px(mx, my, P.ink); for (let i = 1; i < mw; i++) s.px(mx + i, my + 1, P.ink); s.px(mx + mw, my, P.ink); }
    else if (m === 'grin') { s.fill(mx, my, mw + 1, 3, P.ink); s.hline(mx + 1, my, mw - 1, '#fbf8f0'); s.px(mx + 1, my + 1, '#c85050'); s.px(mx + 2, my + 2, '#c85050'); }
    else if (m === 'fang') { s.hline(mx, my, mw + 1, P.ink); s.px(mx + 1, my + 1, '#fbf8f0'); s.px(mx + mw - 1, my + 1, '#fbf8f0'); }
    else if (m === 'o') { s.fill(mx + 1, my, 2, 3, P.ink); s.px(mx + 1, my + 1, '#c85050'); }
    else if (m === 'line') s.hline(mx, my + 1, mw, P.ink);
    else if (m === 'grille') { for (let i = 0; i < mw + 2; i += 2) s.vline(mx - 1 + i, my, 3, P.ink); }
    // cheeks
    if (f === 'cute' || f === 'sleepy') { s.px(Math.round(cx - gap - 1), my - 1, '#e89080'); s.px(Math.round(cx + gap + 1), my - 1, '#e89080'); }
  }

  // ---------- body plans ----------
  // Each builder paints into cv and returns {fx, fy, fs}: face centre and scale
  function darkOf(spec) { return spec.dark || '#3a3440'; }
  function bogie(cv, x, y, r, spec) {
    box(cv, x - r - 2, y - r - 1, r * 4 + 4, 3, darkOf(spec));
    wheel(cv, x, y, r, spec.wheel, 0); wheel(cv, x + r * 2 + 1, y, r, spec.wheel, 0);
  }
  const PLANS = {
    steam(cv, s, k) {
      const len = s.len * k, h = s.h * k;
      const fx = 32 - len / 2, wr = (s.wheelR || 6) * k;
      const chassisY = GROUND - wr * 1.6;
      const r = h / 2, yc = chassisY - r;
      if (s.tender) { box(cv, fx + len * 0.86, chassisY - h * 0.95, len * 0.3, h * 0.95, s.col2 || s.col, { r: 2 }); for (let i = 0; i < 5; i++) disc(cv, fx + len * 0.9 + i * 3 * k, chassisY - h * 0.95 - 1, 2.2 * k, 1.6 * k, '#2a2430'); }
      // cab
      const cabX = fx + len * 0.6, cabW = len * 0.3, cabTop = yc - r - h * 0.35;
      box(cv, cabX, cabTop, cabW, chassisY - cabTop, s.col2 || s.col, {});
      box(cv, cabX - 2, cabTop - 3 * k, cabW + 4, 3.5 * k, s.roof || darkOf(s), { r: 1 });
      box(cv, cabX + cabW * 0.25, cabTop + 3 * k, cabW * 0.5, h * 0.45, s.window || '#f8d888', { flat: true, noTop: true });
      // boiler
      cyl(cv, fx + 3, cabX + 1, yc, r, s.col);
      if (s.bands !== false) for (let i = 1; i <= 2; i++) box(cv, fx + 3 + (cabX - fx) * i / 3, yc - r, 2, h, s.trim || P.brass, { noTop: true });
      // stack
      const sx = fx + len * 0.16, stackH = (s.stack === 'tall' ? 12 : s.stack === 'short' ? 5 : 8) * k, sw = (s.stack === 'short' ? 7 : 5) * k;
      if (s.stack !== 'none') {
        box(cv, sx, yc - r - stackH, sw, stackH + 2, s.stackCol || darkOf(s), {});
        box(cv, sx - 1.5 * k, yc - r - stackH - 2 * k, sw + 3 * k, 3 * k, s.stackCol || darkOf(s), { r: 1 });
      }
      if (s.dome !== false) disc(cv, fx + len * 0.38, yc - r, 3.5 * k, 3 * k, s.trim || P.brass);
      if (s.bell) { disc(cv, fx + len * 0.28, yc - r - 1, 2 * k, 2.4 * k, P.brass); }
      // chassis, wheels, rods
      box(cv, fx, chassisY - 1, len * (s.tender ? 1.15 : 0.95), 4 * k, darkOf(s), {});
      const n = s.wheels || 2;
      const span = len * 0.62;
      const wx = [];
      for (let i = 0; i < n; i++) { const x = fx + len * 0.2 + (n === 1 ? span / 2 : span * i / (n - 1)); wx.push(x); wheel(cv, x, GROUND - wr, wr, s.wheel, 6); }
      if (n > 1) { cv.group(); line(cv, wx[0], GROUND - wr, wx[n - 1], GROUND - wr, s.rod || '#b8bcc8', 0.8); }
      if (s.tender) { wheel(cv, fx + len * 1.0, GROUND - wr * 0.7, wr * 0.7, s.wheel, 0); }
      if (s.cow !== false) poly(cv, [fx - 3 * k, GROUND - 1, fx + 3, chassisY - 1, fx + 3, GROUND - 1], s.cowCol || P.red);
      // face plate: the smokebox door, seen three-quarters
      const fr = r * 1.08;
      disc(cv, fx + 1.5 * k, yc, fr * 0.78, fr, s.faceCol || '#c8c4c0');
      if (s.lamp !== false) { disc(cv, fx + 2 * k, yc - fr - 1.5 * k, 2.2 * k, 2 * k, '#f8e8a0', { flat: true }); }
      return { fx: fx + 1.5 * k, fy: yc + 0.5, fs: fr / 8 };
    },
    diesel(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 4) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 2;
      const top = deck - h;
      // long hood behind the cab
      box(cv, fx + len * 0.35, top + h * 0.28, len * 0.65, h * 0.72, s.col, { r: 2 * k });
      for (let i = 0; i < 4; i++) box(cv, fx + len * (0.45 + i * 0.12), top + h * 0.4, len * 0.07, h * 0.4, shade(s.col, -0.2), { flat: true, noTop: true });
      // cab
      box(cv, fx + len * 0.12, top, len * 0.3, h, s.col2 || s.col, { r: 2 * k });
      box(cv, fx + len * 0.2, top + 3 * k, len * 0.18, h * 0.3, s.window || '#9ac4dc', { flat: true, noTop: true });
      // nose (short hood) with the face on its front
      box(cv, fx, top + h * 0.3, len * 0.16, h * 0.7, s.col, { r: 3 * k });
      if (s.stripe) box(cv, fx, deck - h * 0.28, len, 3 * k, s.stripe, { flat: true, noTop: true });
      box(cv, fx - 1, deck - 1, len + 2, 3 * k, darkOf(s));
      bogie(cv, fx + len * 0.2, GROUND - wr, wr, s); bogie(cv, fx + len * 0.7, GROUND - wr, wr, s);
      if (s.exhaust) box(cv, fx + len * 0.7, top + h * 0.28 - 4 * k, 4 * k, 4 * k, darkOf(s));
      disc(cv, fx + len * 0.04, top + h * 0.62, h * 0.3, h * 0.36, s.faceCol || shade(s.col, 0.15));
      if (s.lamp !== false) disc(cv, fx + len * 0.2, top - 1.5 * k, 1.8 * k, 1.6 * k, '#f8e8a0', { flat: true });
      return { fx: fx + len * 0.04, fy: top + h * 0.62, fs: h / 15 };
    },
    electric(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 3.5) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 1, top = deck - h;
      box(cv, fx + len * 0.18, top, len * 0.82, h, s.col, { r: 3 * k });
      poly(cv, [fx, deck, fx + len * 0.05, top + h * 0.45, fx + len * 0.22, top, fx + len * 0.26, top, fx + len * 0.26, deck], s.col2 || s.col);
      box(cv, fx + len * 0.12, top + h * 0.25, len * 0.12, h * 0.25, s.window || '#9ac4dc', { flat: true, noTop: true });
      for (let i = 0; i < (s.windows || 3); i++) box(cv, fx + len * (0.34 + i * 0.18), top + h * 0.25, len * 0.1, h * 0.28, s.window || '#9ac4dc', { flat: true, noTop: true });
      if (s.stripe) poly(cv, [fx + len * 0.03, deck - h * 0.3, fx + len, deck - h * 0.3, fx + len, deck - h * 0.12, fx + len * 0.01, deck - h * 0.12], s.stripe, { tone: 0.6 });
      if (s.panto !== false) { cv.group(); const px = fx + len * 0.55; line(cv, px, top, px + 6 * k, top - 7 * k, '#3a3a48'); line(cv, px + 6 * k, top - 7 * k, px + 1 * k, top - 10 * k, '#3a3a48'); line(cv, px - 3 * k, top - 10 * k, px + 6 * k, top - 10 * k, '#3a3a48'); }
      box(cv, fx + 2, deck - 1, len - 2, 2.5 * k, darkOf(s));
      bogie(cv, fx + len * 0.25, GROUND - wr, wr, s); bogie(cv, fx + len * 0.72, GROUND - wr, wr, s);
      if (s.spark) for (let i = 0; i < 3; i++) { cv.group(); const x = fx + len * (0.3 + i * 0.25), y = top - 2; line(cv, x, y, x + 2, y - 3, s.spark, 1); line(cv, x + 2, y - 3, x, y - 5, s.spark, 1); }
      return { fx: fx + len * 0.15, fy: top + h * 0.64, fs: h / 14 };
    },
    maglev(cv, s, k) {
      const len = s.len * k, h = s.h * k;
      const fx = 32 - len / 2, hover = s.hover !== undefined ? s.hover : 6;
      const bottom = GROUND - 4 - hover, top = bottom - h;
      // guideway and glow
      box(cv, fx - 2, GROUND - 4, len + 4, 4, '#6a6e80');
      cv.group(); for (let x = fx; x < fx + len; x++) for (let y = bottom + 1; y < GROUND - 4; y++) if ((x + y) % 3 === 0) cv.put(x, y, s.glow || '#a8e8ff', 0.9, true);
      box(cv, fx + len * 0.25, top, len * 0.75, h, s.col, { r: 4 * k });
      poly(cv, [fx, bottom, fx + len * 0.08, top + h * 0.5, fx + len * 0.3, top, fx + len * 0.3, bottom], s.col2 || s.col);
      box(cv, fx + len * 0.14, top + h * 0.3, len * 0.12, h * 0.22, s.window || '#6a5a9a', { flat: true, noTop: true });
      for (let i = 0; i < (s.windows || 2); i++) box(cv, fx + len * (0.4 + i * 0.2), top + h * 0.28, len * 0.12, h * 0.24, s.window || '#6a5a9a', { flat: true, noTop: true });
      if (s.stripe) box(cv, fx + len * 0.06, bottom - h * 0.32, len * 0.94, 2 * k, s.stripe, { flat: true, noTop: true });
      if (s.fins) poly(cv, [fx + len * 0.8, top, fx + len * 0.95, top - 8 * k, fx + len, top], s.col2 || s.col);
      return { fx: fx + len * 0.16, fy: top + h * 0.64, fs: h / 14 };
    },
    coach(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 3.5) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 1, top = deck - h;
      box(cv, fx, top, len, h, s.col, { r: 3 * k });
      box(cv, fx - 1, top - 2 * k, len + 2, 3.5 * k, s.roof || shade(s.col, -0.3), { r: 2 });
      const n = s.windows || 4;
      for (let i = 0; i < n; i++) box(cv, fx + len * 0.18 + (len * 0.76) * i / n, top + h * 0.2, len * 0.62 / n, h * 0.32, s.window || '#f8e0a0', { flat: true, noTop: true });
      if (s.stripe) box(cv, fx, top + h * 0.62, len, 2.5 * k, s.stripe, { flat: true, noTop: true });
      box(cv, fx + 1, deck - 1, len - 2, 2.5 * k, darkOf(s));
      bogie(cv, fx + len * 0.18, GROUND - wr, wr, s); bogie(cv, fx + len * 0.7, GROUND - wr, wr, s);
      if (s.lamp !== false) disc(cv, fx + 3 * k, top + h * 0.2, 1.6 * k, 1.6 * k, '#f8e8a0', { flat: true });
      return { fx: fx + len * 0.09, fy: top + h * 0.62, fs: h / 18 };
    },
    boxcar(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 3.5) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 1, top = deck - h;
      box(cv, fx, top, len, h, s.col, { r: 1 });
      cv.group(); for (let x = fx + 3; x < fx + len - 2; x += 4 * k) for (let y = top + 2; y < deck - 1; y++) cv.put(x, y, shade(s.col, -0.2), 0.45, true);
      box(cv, fx + len * 0.4, top + 3, len * 0.28, h - 5, s.col2 || shade(s.col, -0.12), {});
      box(cv, fx - 1, top - 2, len + 2, 3, s.roof || shade(s.col, -0.35), {});
      box(cv, fx + 1, deck - 1, len - 2, 2.5 * k, darkOf(s));
      bogie(cv, fx + len * 0.16, GROUND - wr, wr, s); bogie(cv, fx + len * 0.7, GROUND - wr, wr, s);
      box(cv, fx - 4 * k, deck - 3 * k, 4 * k, 2.5 * k, darkOf(s));
      return { fx: fx + len * 0.14, fy: top + h * 0.5, fs: h / 18 };
    },
    hopper(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 3.5) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 1, top = deck - h;
      poly(cv, [fx, top, fx + len, top, fx + len * 0.88, deck, fx + len * 0.6, deck + 2, fx + len * 0.4, deck + 2, fx + len * 0.12, deck], s.col);
      cv.group(); for (let i = 1; i < 4; i++) { const x = fx + len * i / 4; line(cv, x, top + 1, x, deck - 1, shade(s.col, -0.25), 0.4); }
      if (s.load) for (let i = 0; i < 6; i++) disc(cv, fx + 4 * k + i * (len - 8 * k) / 5, top, 3 * k, 2 * k, s.load);
      box(cv, fx + 1, deck - 1, len - 2, 2.5 * k, darkOf(s));
      bogie(cv, fx + len * 0.14, GROUND - wr, wr, s); bogie(cv, fx + len * 0.72, GROUND - wr, wr, s);
      return { fx: fx + len * 0.12, fy: top + h * 0.45, fs: h / 18 };
    },
    tank(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 3.5) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 1;
      const r = h / 2, yc = deck - r;
      cyl(cv, fx, fx + len, yc, r, s.col, { round: true });
      disc(cv, fx + len * 0.5, yc - r, 4 * k, 2.5 * k, s.col2 || shade(s.col, 0.1));
      if (s.stripe) box(cv, fx + 2, yc - 1, len - 4, 2 * k, s.stripe, { flat: true, noTop: true });
      if (s.hazard) { cv.group(); for (let x = fx + 4; x < fx + len - 4; x++) for (let y = yc + r * 0.35; y < yc + r * 0.35 + 3 * k; y++) cv.put(x, y, ((x + y) >> 1) % 2 ? '#e8c040' : '#2a2430', 0.6, true); }
      if (s.rings) for (let i = 1; i < 4; i++) box(cv, fx + len * i / 4 - 1, yc - r, 2.5 * k, h, s.glow || '#8af06a', { flat: true, noTop: true });
      box(cv, fx + 1, deck - 1, len - 2, 2.5 * k, darkOf(s));
      bogie(cv, fx + len * 0.14, GROUND - wr, wr, s); bogie(cv, fx + len * 0.72, GROUND - wr, wr, s);
      disc(cv, fx + r * 0.35, yc, r * 0.45, r * 0.95, s.faceCol || shade(s.col, 0.2));
      return { fx: fx + r * 0.38, fy: yc + 0.5, fs: r / 9 };
    },
    mono(cv, s, k) {
      const len = s.len * k, h = s.h * k;
      const fx = 32 - len / 2;
      // the beam it rides
      box(cv, 4, GROUND - 7, 56, 7, '#b8b4ac');
      box(cv, fx + len * 0.2, GROUND - 10, len * 0.2, 4, darkOf(s)); box(cv, fx + len * 0.62, GROUND - 10, len * 0.2, 4, darkOf(s));
      const bottom = GROUND - 8, top = bottom - h;
      box(cv, fx, top, len, h, s.col, { r: Math.min(h / 2, 8 * k) });
      box(cv, fx + len * 0.08, top + h * 0.2, len * 0.84, h * 0.3, s.window || '#9ae0e8', { flat: true, noTop: true, r: 2 });
      if (s.stripe) box(cv, fx + 2, top + h * 0.62, len - 4, 2.5 * k, s.stripe, { flat: true, noTop: true });
      return { fx: fx + len * 0.12, fy: top + h * 0.66, fs: h / 16 };
    },
    tram(cv, s, k) {
      const len = s.len * k, h = s.h * k, wr = (s.wheelR || 3) * k;
      const fx = 32 - len / 2, deck = GROUND - wr * 2 - 1, top = deck - h;
      box(cv, fx, top, len, h, s.col, { r: 4 * k });
      box(cv, fx + 2, top + h * 0.15, len - 4, h * 0.38, s.window || '#f8e8b0', { flat: true, noTop: true, r: 2 });
      cv.group(); for (let i = 1; i < 4; i++) line(cv, fx + len * i / 4, top + h * 0.15, fx + len * i / 4, top + h * 0.52, shade(s.col, -0.3), 0.4);
      if (s.stripe) box(cv, fx, top + h * 0.68, len, 2.5 * k, s.stripe, { flat: true, noTop: true });
      if (s.panto !== false) { cv.group(); const px = fx + len / 2; line(cv, px - 4, top, px + 3, top - 7 * k, '#3a3a48'); line(cv, px + 3, top - 7 * k, px - 5, top - 9 * k, '#3a3a48'); }
      bogie(cv, fx + len * 0.2, GROUND - wr, wr, s); bogie(cv, fx + len * 0.62, GROUND - wr, wr, s);
      return { fx: fx + len * 0.1, fy: top + h * 0.72, fs: h / 18 };
    },
  };

  // Extras shared by all plans: spikes, horns, wings, crest, sparks
  function extras(cv, s, k, fc) {
    if (s.horn) poly(cv, [fc.fx - 2, fc.fy - 6 * k, fc.fx - 12 * k, fc.fy - 12 * k, fc.fx + 2, fc.fy - 10 * k], s.hornCol || '#e8e4dc');
    if (s.spikes) {
      // each spike sits on the body's top edge at its column
      const top = x => { x = Math.round(x); for (let y = 0; y < SZ; y++) if (cv.tone[y * SZ + x] >= 0) return y; return 30; };
      for (let i = 0; i < s.spikes; i++) {
        const x = 32 - (s.len * k) / 2 + (s.len * k) * (0.3 + i * 0.5 / s.spikes);
        const y = top(x + 3 * k) + 2;
        poly(cv, [x, y + 1, x + 3 * k, y - 6 * k, x + 6 * k, y + 1], s.spikeCol || shade(s.col, -0.2));
      }
    }
    if (s.wings) { poly(cv, [36, 30, 58, 14, 60, 22, 52, 32, 40, 36], s.wingCol || '#e8e4f0'); poly(cv, [40, 34, 62, 28, 56, 38, 42, 40], shade(s.wingCol || '#e8e4f0', -0.1)); }
    if (s.crest) poly(cv, [fc.fx + 4, fc.fy - 10 * k, fc.fx + 10 * k, fc.fy - 20 * k, fc.fx + 14 * k, fc.fy - 10 * k], s.crest);
  }

  function bounds(cv) {
    let x0 = SZ, x1 = -1, y0 = SZ;
    for (let i = 0; i < SZ * SZ; i++) if (cv.tone[i] >= 0) { const x = i % SZ, y = (i / SZ) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
    return { x0, x1, y0 };
  }
  // Build at the design scale, shrinking until the whole train fits the frame,
  // then centre it horizontally.
  function build(art) {
    const plan = PLANS[art.body] || PLANS.steam;
    let k = (art.scale || 1) * 1.14, cv, fc, b;
    for (let tries = 0; tries < 10; tries++) {
      cv = new Canvas();
      fc = plan(cv, art, k);
      extras(cv, art, k, fc);
      b = bounds(cv);
      if (b.x0 >= 2 && b.x1 <= SZ - 3 && b.y0 >= 2) break;
      k *= 0.94;
    }
    if (b.x1 < 0) throw new Error('train art "' + art.body + '" painted nothing');
    const s = compose(cv, art.outline || P.ink);
    if (art.faceless !== true) face(s, Math.round(fc.fx), Math.round(fc.fy), art, Math.max(0.7, Math.min(1.4, fc.fs)));
    const dx = Math.round((SZ - 1 - b.x1 - b.x0) / 2);
    if (!dx) return s;
    const out = new Surface(SZ, SZ);
    out.blit(s, dx, 0);
    return out;
  }

  function sprite(id, view) {
    const key = id + ':' + (view || 'front');
    let s = cache.get(key);
    if (s) return s;
    const sp = CD.species && CD.species.get(id);
    const art = (sp && sp.art) || { body: 'steam', len: 40, h: 16, col: '#c07a4a' };
    const base = cache.get(id + ':front') || build(art);
    cache.set(id + ':front', base);
    if (view === 'back') {
      // the player's side: mirrored so the train faces the opponent
      s = new Surface(SZ, SZ);
      for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) s.data[y * SZ + x] = base.data[y * SZ + (SZ - 1 - x)];
      cache.set(key, s);
      return s;
    }
    if (view === 'icon') {
      // 24x24 party icon: downsample by majority of opaque pixels
      s = new Surface(24, 24);
      const f = SZ / 24;
      for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
        const c = base.data[Math.min(SZ - 1, Math.round((y + 0.5) * f)) * SZ + Math.min(SZ - 1, Math.round((x + 0.5) * f))];
        s.data[y * 24 + x] = c;
      }
      s = CD.gfx.outline(s, P.ink);
      cache.set(key, s);
      return s;
    }
    return base;
  }
  // Direct build from an art spec (title screen, previews)
  function fromArt(art) { return build(art); }

  // Small engine for the ambient overworld trains (32x24)
  let locoCache = {};
  function overworldLoco(dir) {
    if (locoCache[dir]) return locoCache[dir];
    const s = new Surface(32, 24);
    const col = '#3a4a6a';
    s.fill(4, 8, 22, 9, col); s.hline(4, 8, 22, '#6a7a9a'); s.hline(4, 16, 22, '#2a3048');
    s.fill(18, 3, 9, 14, '#4a5a7a'); s.fill(20, 5, 5, 4, '#f8d888'); s.fill(17, 2, 11, 2, '#2a2230');
    s.fill(8, 3, 4, 5, '#2a2230'); s.fill(7, 2, 6, 2, '#2a2230');
    s.fill(2, 17, 28, 2, '#2a2230');
    for (const x of [7, 14, 21]) { s.ellipse(x, 20, 3, 3, '#2a2230'); s.px(x, 20, P.brass); }
    s.fill(1, 12, 3, 5, P.red); s.px(3, 10, '#f8e8a0');
    const o = CD.gfx.outline(s, P.ink);
    if (dir < 0) { locoCache[dir] = o; return o; }
    const m = new Surface(32, 24);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) m.data[y * 32 + x] = o.data[y * 32 + (31 - x)];
    locoCache[dir] = m;
    return m;
  }

  CD.trainArt = { sprite, fromArt, overworldLoco, SZ, GROUND, PLANS };
})(window.CD);
