// Framebuffer graphics. Every pixel the game shows is written into a Uint32Array
// here; the browser runner copies the finished frame to a canvas once per frame.
// Pixel format is little-endian RGBA packed as 0xAABBGGRR, which matches the byte
// order of ImageData so the copy is a single typed-array set.
(function (CD) {
  'use strict';

  const W = 240, H = 160;

  function rgb(r, g, b, a) {
    if (a === undefined) a = 255;
    return ((a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255)) >>> 0;
  }
  const hexCache = new Map();
  function hex(s) {
    if (typeof s === 'number') return s;
    let v = hexCache.get(s);
    if (v === undefined) {
      let h = s.replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      v = rgb(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
      hexCache.set(s, v);
    }
    return v;
  }
  const R = c => c & 255, Gc = c => (c >>> 8) & 255, B = c => (c >>> 16) & 255, A = c => c >>> 24;
  function mix(c1, c2, t) {
    c1 = hex(c1); c2 = hex(c2);
    return rgb(R(c1) + (R(c2) - R(c1)) * t, Gc(c1) + (Gc(c2) - Gc(c1)) * t, B(c1) + (B(c2) - B(c1)) * t, 255);
  }
  // Lighten (k > 0) toward a warm white or darken (k < 0) toward a cool deep shadow.
  // Shifting hue with value, rather than scaling toward black, keeps shading painterly.
  function shade(c, k) {
    c = hex(c);
    if (k >= 0) return mix(c, rgb(255, 250, 232), Math.min(1, k));
    return mix(c, rgb(22, 16, 38), Math.min(1, -k));
  }
  // 4x4 ordered dither threshold in [0,1)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return BAYER[(y & 3) * 4 + (x & 3)] / 16; }

  // Integer hash noise: stable per coordinate, used by every procedural painter.
  function hash2(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + (seed | 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  class Surface {
    constructor(w, h) { this.w = w; this.h = h; this.data = new Uint32Array(w * h); this.clipR = null; }
    clear(c) { this.data.fill(c === undefined ? 0 : hex(c)); return this; }
    px(x, y, c) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.data[y * this.w + x] = hex(c);
    }
    get(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.data[y * this.w + x]; }
    // Alpha blend a colour over the existing pixel, a in [0,1]
    blend(x, y, c, a) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
      const i = y * this.w + x;
      if (a >= 1) { this.data[i] = hex(c); return; }
      this.data[i] = mix(this.data[i], c, a);
    }
    fill(x, y, w, h, c) {
      c = hex(c);
      let x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
      const x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
      for (let yy = y0; yy < y1; yy++) this.data.fill(c, yy * this.w + x0, yy * this.w + x1);
    }
    fillA(x, y, w, h, c, a) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.blend(xx, yy, c, a);
    }
    rect(x, y, w, h, c) {
      this.fill(x, y, w, 1, c); this.fill(x, y + h - 1, w, 1, c);
      this.fill(x, y, 1, h, c); this.fill(x + w - 1, y, 1, h, c);
    }
    hline(x, y, w, c) { this.fill(x, y, w, 1, c); }
    vline(x, y, h, c) { this.fill(x, y, 1, h, c); }
    line(x0, y0, x1, y1, c) {
      x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
          if (nx * nx + ny * ny <= 1) this.px(x, y, c);
        }
      }
    }
    ellipseA(cx, cy, rx, ry, c, a) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
          if (nx * nx + ny * ny <= 1) this.blend(x, y, c, a);
        }
      }
    }
    // Copy src onto this surface. Transparent source pixels (alpha 0) are skipped.
    // opts: flip (mirror x), sx, sy, sw, sh (source rect), alpha (0..1), tint (colour), tintA, silhouette (colour)
    blit(src, dx, dy, opts) {
      opts = opts || {};
      const sx0 = opts.sx | 0, sy0 = opts.sy | 0;
      const sw = opts.sw === undefined ? src.w - sx0 : opts.sw, sh = opts.sh === undefined ? src.h - sy0 : opts.sh;
      dx = Math.round(dx); dy = Math.round(dy);
      const alpha = opts.alpha === undefined ? 1 : opts.alpha;
      const tint = opts.tint !== undefined ? hex(opts.tint) : 0, tintA = opts.tintA || 0;
      const sil = opts.silhouette !== undefined ? hex(opts.silhouette) : 0;
      for (let y = 0; y < sh; y++) {
        const ty = dy + y; if (ty < 0 || ty >= this.h) continue;
        if (opts.clipY !== undefined && ty >= opts.clipY) continue;
        for (let x = 0; x < sw; x++) {
          const tx = dx + x; if (tx < 0 || tx >= this.w) continue;
          const sxx = opts.flip ? sx0 + sw - 1 - x : sx0 + x;
          let c = src.data[(sy0 + y) * src.w + sxx];
          if ((c >>> 24) === 0) continue;
          if (sil) c = sil;
          else if (tintA) c = mix(c, tint, tintA);
          const i = ty * this.w + tx;
          this.data[i] = alpha >= 1 ? c : mix(this.data[i], c, alpha);
        }
      }
    }
    // Nearest-neighbour scaled blit (used by battle intros, evolution and the title logo)
    blitScaled(src, dx, dy, scale, opts) {
      opts = opts || {};
      const w = Math.round(src.w * scale), h = Math.round(src.h * scale);
      for (let y = 0; y < h; y++) {
        const ty = Math.round(dy) + y; if (ty < 0 || ty >= this.h) continue;
        const sy = Math.min(src.h - 1, (y / scale) | 0);
        for (let x = 0; x < w; x++) {
          const tx = Math.round(dx) + x; if (tx < 0 || tx >= this.w) continue;
          let sx = Math.min(src.w - 1, (x / scale) | 0);
          if (opts.flip) sx = src.w - 1 - sx;
          let c = src.data[sy * src.w + sx];
          if ((c >>> 24) === 0) continue;
          if (opts.silhouette !== undefined) c = hex(opts.silhouette);
          else if (opts.tintA) c = mix(c, opts.tint, opts.tintA);
          this.data[ty * this.w + tx] = c;
        }
      }
    }
    copy() { const s = new Surface(this.w, this.h); s.data.set(this.data); return s; }
  }

  // Outline every opaque region of a sprite with colour c (1px, 4-connected)
  function outline(s, c) {
    c = hex(c);
    const out = s.copy();
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (s.data[y * s.w + x] >>> 24) continue;
      if ((s.get(x + 1, y) >>> 24) || (s.get(x - 1, y) >>> 24) || (s.get(x, y + 1) >>> 24) || (s.get(x, y - 1) >>> 24)) out.data[y * s.w + x] = c;
    }
    return out;
  }

  // A soft, flattened drop shadow ellipse (for characters and props)
  function shadow(surf, cx, cy, rx, ry, a) {
    surf.ellipseA(cx, cy, rx, ry, '#1a1430', a === undefined ? 0.28 : a);
  }

  CD.gfx = { W, H, rgb, hex, mix, shade, bayer, hash2, Surface, outline, shadow, R, G: Gc, B, A };
  CD.gfx.screen = new Surface(W, H);
})(typeof window !== 'undefined' ? (window.CD = window.CD || {}) : (globalThis.CD = globalThis.CD || {}));
