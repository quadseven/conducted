// Buildings are painted as whole objects rather than tiles: roof, walls, windows,
// door, signs and shadow in one pass, so every building reads as a single form.
// A building occupies exactly its w x h tile footprint.
(function (CD) {
  'use strict';
  const { Surface, hex, mix, shade, hash2 } = CD.gfx;
  const P = CD.pal;
  const UP = 0;
  const cache = new Map();

  const STYLES = {
    house: { roof: '#b8574a', wall: '#f0e2c4', trim: '#7a5236', timber: true, wallRows: 1.5 },
    houseTeal: { roof: '#3f8a86', wall: '#efe4ca', trim: '#6a4a34', timber: true, wallRows: 1.5 },
    houseBrown: { roof: '#8a6048', wall: '#ead8b8', trim: '#5f3f28', timber: true, wallRows: 1.5 },
    houseBlue: { roof: '#4f6ea8', wall: '#f2e8d2', trim: '#5f4a3a', timber: false, wallRows: 1.5 },
    lab: { roof: '#6a88b8', wall: '#f4f2ec', trim: '#8a8a9a', timber: false, wallRows: 2, big: true },
    depot: { roof: '#c4523f', wall: '#f3e6cc', trim: '#8a3a30', brick: true, wallRows: 2, sign: 'DEPOT', emblem: 'wheel' },
    mart: { roof: '#3f74b0', wall: '#f0e8d6', trim: '#34507a', wallRows: 2, sign: 'MART', awning: true },
    gym: { roof: '#4a5a78', wall: '#d8d0c4', trim: '#3a3a4a', stone: true, wallRows: 2.2, sign: 'GYM', emblem: 'anchor' },
    station: { roof: '#6a4a3a', wall: '#e8d4b0', trim: '#4a3226', brick: true, wallRows: 2, sign: 'PISTON', clock: true },
    warehouse: { roof: '#7a8088', wall: '#a86a4a', trim: '#5a3a2a', corrugated: true, wallRows: 2.2 },
  };

  function roof(s, x0, y0, w, h, col, style) {
    // shingled roof seen from the front, darker toward the eaves, lit ridge
    const base = hex(col);
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1);
      const inset = Math.max(0, Math.round((1 - t) * 2));
      const row = Math.floor(y / 3);
      for (let x = inset; x < w - inset; x++) {
        let c = mix(shade(base, 0.12), shade(base, -0.22), t);
        const off = row % 2 ? 2 : 0;
        if (y % 3 === 2) c = shade(c, -0.18);
        else if ((x + off) % 5 === 0) c = shade(c, -0.12);
        else if (hash2(x + (row * 7), row, 3) < 0.06) c = shade(c, 0.1);
        // side falloff gives the roof some volume
        if (x - inset < 2 || w - inset - x <= 2) c = shade(c, -0.12);
        s.px(x0 + x, y0 + y, c);
      }
    }
    // ridge cap
    for (let x = 2; x < w - 2; x++) { s.px(x0 + x, y0, shade(base, 0.35)); s.px(x0 + x, y0 + 1, shade(base, 0.18)); }
    // eave shadow line
    for (let x = 0; x < w; x++) s.px(x0 + x, y0 + h, shade(base, -0.5));
    if (style.big) for (let x = 6; x < w - 6; x += 10) { s.fill(x0 + x, y0 + 3, 6, h - 5, shade(base, 0.22)); s.rect(x0 + x, y0 + 3, 6, h - 5, shade(base, -0.3)); }
  }

  function wallFill(s, x0, y0, w, h, st) {
    const base = hex(st.wall);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = base;
      const n = hash2(x, y, 5);
      if (st.brick) {
        const row = y >> 2, off = row % 2 ? 4 : 0;
        const b = hash2((x + off) >> 3, row, 9);
        c = mix(hex('#b8664e'), hex('#a4553f'), b);
        if (y % 4 === 3 || (x + off) % 8 === 7) c = hex('#e0cbb0');
      } else if (st.stone) {
        const row = Math.floor(y / 5), off = row % 2 ? 6 : 0;
        c = mix(base, shade(base, -0.12), hash2((x + off) >> 3, row, 9));
        if (y % 5 === 4 || (x + off) % 12 === 11) c = shade(base, -0.3);
      } else if (st.corrugated) {
        c = x % 3 === 0 ? shade(base, -0.2) : x % 3 === 1 ? shade(base, 0.08) : base;
      } else if (n < 0.06) c = shade(base, -0.05);
      s.px(x0 + x, y0 + y, c);
    }
    if (st.timber) {
      s.fill(x0, y0, w, 2, st.trim);
      s.fill(x0, y0 + h - 2, w, 2, st.trim);
      s.fill(x0, y0, 2, h, st.trim); s.fill(x0 + w - 2, y0, 2, h, st.trim);
    }
    // foundation course
    s.fill(x0, y0 + h - 2, w, 2, P.stoneD); s.hline(x0, y0 + h - 2, w, P.stone);
  }

  function windowAt(s, x, y, w, h, st, lit) {
    s.fill(x - 1, y - 1, w + 2, h + 2, st.trim);
    const glass = lit ? '#f8d888' : '#8fb8d8';
    s.fill(x, y, w, h, glass);
    // reflection streak
    if (!lit) for (let i = 0; i < Math.min(w, h); i++) { s.px(x + i + 1, y + h - 1 - i, '#cfe6f2'); s.px(x + i + 2, y + h - 1 - i, '#b8d8ea'); }
    else s.fill(x, y + h - 2, w, 2, '#e8b860');
    s.vline(x + (w >> 1), y, h, st.trim); s.hline(x, y + (h >> 1), w, st.trim);
    s.fill(x - 2, y + h + 1, w + 4, 2, shade(st.trim, 0.2));
    s.hline(x - 2, y + h + 2, w + 4, shade(st.trim, -0.2));
  }

  function door(s, x, y, st, kind) {
    if (kind === 'glass') {
      s.fill(x, y, 14, 17, '#4a5460');
      s.fill(x + 1, y + 1, 6, 16, '#9ac4dc'); s.fill(x + 7, y + 1, 6, 16, '#9ac4dc');
      s.vline(x + 7, y + 1, 16, '#4a5460');
      for (let i = 0; i < 5; i++) { s.px(x + 2 + i, y + 10 - i * 2, '#d8eef8'); s.px(x + 8 + i, y + 12 - i * 2, '#d8eef8'); }
      return;
    }
    s.fill(x, y, 12, 17, st.trim);
    s.fill(x + 1, y + 1, 10, 16, '#8a5a3a');
    for (let i = 0; i < 10; i += 3) s.vline(x + 1 + i, y + 1, 16, '#744a30');
    s.fill(x + 2, y + 3, 8, 5, '#6a4028'); s.fill(x + 3, y + 4, 6, 3, '#f0d890');
    s.px(x + 9, y + 10, P.brassL);
  }

  function plate(s, cx, y, text, bg, fg) {
    const w = CD.font.measure(text) + 6;
    const x = Math.round(cx - w / 2);
    s.fill(x, y, w, 11, shade(bg, -0.4));
    s.fill(x + 1, y + 1, w - 2, 9, bg);
    s.hline(x + 1, y + 1, w - 2, shade(bg, 0.25));
    CD.font.draw(s, text, x + 3, y + 2, fg);
  }

  function emblem(s, cx, cy, kind) {
    if (kind === 'wheel') {
      s.ellipse(cx, cy, 7, 7, P.cream); s.ellipse(cx, cy, 6, 6, P.red);
      s.ellipse(cx, cy, 4, 4, P.cream);
      for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; s.line(cx, cy, cx + Math.cos(an) * 5, cy + Math.sin(an) * 5, P.red); }
      s.ellipse(cx, cy, 1.6, 1.6, P.redD);
    } else if (kind === 'anchor') {
      s.ellipse(cx, cy, 8, 8, P.brassD); s.ellipse(cx, cy, 7, 7, P.brass);
      s.vline(cx, cy - 5, 10, P.navy); s.hline(cx - 3, cy - 3, 7, P.navy);
      s.px(cx, cy - 6, P.navy); s.px(cx - 1, cy - 6, P.navy); s.px(cx + 1, cy - 6, P.navy);
      for (let i = -4; i <= 4; i++) s.px(cx + i, cy + 4 - Math.round(Math.abs(i) * 0.5), P.navy);
      s.px(cx - 4, cy + 1, P.navy); s.px(cx + 4, cy + 1, P.navy);
    }
  }

  function render(b) {
    const st = Object.assign({}, STYLES[b.style] || STYLES.house, b.opts || {});
    const W = b.w * 16, H = b.h * 16 + UP;
    const s = new Surface(W, H);
    const wallH = Math.round(st.wallRows * 16);
    const roofH = H - wallH;
    const wy = roofH;
    wallFill(s, 0, wy, W, wallH, st);
    roof(s, -1, 0, W + 2, roofH, st.roof, st);
    // chimney on houses
    if (st.timber || b.style.startsWith('house')) {
      const cxp = W - 14;
      s.fill(cxp, 0, 6, 8, '#8a5a48'); s.fill(cxp - 1, 0, 8, 2, '#6a4438'); s.hline(cxp, 2, 6, '#a06a52');
    }
    const doorX = (b.door === null || b.door === undefined ? Math.floor(b.w / 2) : b.door) * 16 + 2;
    const doorY = H - 17;
    const lit = b.lit;
    // windows: fill the wall either side of the door
    const winY = wy + (wallH > 24 ? 6 : 4);
    const winH = Math.min(9, wallH - 14);
    for (let tx = 0; tx < b.w; tx++) {
      const x = tx * 16 + 4;
      if (Math.abs(x - 2 - doorX) < 14) continue;
      if (st.emblem && st.sign === 'GYM' && tx === 0) continue;
      if (st.awning || st.sign === 'DEPOT' || st.corrugated) continue;
      windowAt(s, x, winY, 8, winH, st, lit);
    }
    if (st.awning) {
      // striped awning over wide shop windows
      const ay = wy + 1;
      for (let x = 0; x < W; x++) for (let y = 0; y < 6; y++) s.px(x, ay + y, (x >> 2) % 2 ? P.white : st.roof);
      for (let x = 0; x < W; x += 4) { s.px(x + 1, ay + 6, st.roof); s.px(x + 2, ay + 6, st.roof); }
      s.fill(4, ay + 9, doorX - 8, 12, '#9ac4dc'); s.fill(doorX + 18, ay + 9, W - doorX - 22, 12, '#9ac4dc');
      for (const [x, w] of [[4, doorX - 8], [doorX + 18, W - doorX - 22]]) {
        s.rect(x - 1, ay + 8, w + 2, 14, st.trim);
        for (let i = 0; i < w; i += 5) { s.fill(x + i + 1, ay + 12, 3, 4, ['#e8c040', '#c8513f', '#58a060'][(i / 5) % 3]); }
      }
    }
    if (st.sign === 'DEPOT') {
      s.fill(4, wy + 8, doorX - 8, 12, '#9ac4dc'); s.fill(doorX + 18, wy + 8, W - doorX - 22, 12, '#9ac4dc');
      s.rect(3, wy + 7, doorX - 6, 14, st.trim); s.rect(doorX + 17, wy + 7, W - doorX - 20, 14, st.trim);
    }
    if (st.corrugated) {
      // big sliding cargo door
      const gx = Math.round(W / 2) - 16;
      s.fill(gx, wy + 6, 32, wallH - 8, '#6a5040');
      for (let x = gx; x < gx + 32; x += 3) s.vline(x, wy + 6, wallH - 8, '#58402f');
      s.hline(gx, wy + 6, 32, '#8a6a52');
    }
    const glassDoor = st.sign === 'DEPOT' || st.sign === 'MART' || b.style === 'lab';
    if (!st.corrugated) {
      door(s, doorX, doorY, st, glassDoor ? 'glass' : 'wood');
      s.fill(doorX - 1, H - 1, glassDoor ? 16 : 14, 1, P.stoneL);
    }
    if (st.sign) plate(s, W / 2, roofH - 7, b.sign || st.sign, st.sign === 'GYM' ? P.brass : st.sign === 'MART' ? '#2f5f9a' : st.sign === 'DEPOT' ? P.red : '#4a3226', st.sign === 'GYM' ? P.ink : P.cream);
    if (st.emblem) emblem(s, st.sign === 'GYM' ? 12 : W - 12, wy + 12, st.emblem);
    if (st.clock) {
      const cx = W / 2, cy = roofH - 12;
      s.ellipse(cx, cy, 6, 6, P.brassD); s.ellipse(cx, cy, 5, 5, P.cream);
      s.vline(cx, cy - 4, 4, P.ink); s.hline(cx, cy, 3, P.ink);
    }
    if (b.style === 'lab') {
      // rooftop mast with a signal lamp
      s.vline(W - 20, 0, 12, P.steelD); s.px(W - 20, 0, P.red); s.px(W - 21, 1, P.redL);
      plate(s, W / 2, roofH - 8, b.sign || 'CYPRESS LAB', '#e8eef4', P.navy);
    }
    return s;
  }

  function get(b) {
    const key = b.style + b.w + 'x' + b.h + ':' + (b.door || '') + (b.sign || '') + (b.lit ? 'L' : '');
    let s = cache.get(key);
    if (!s) { s = render(b); cache.set(key, s); }
    return s;
  }
  // Draw at world tile position with camera offset (in pixels)
  function draw(surf, b, camX, camY) {
    const s = get(b);
    const x = b.x * 16 - camX, y = b.y * 16 - UP - camY;
    // ground shadow to the lower right
    surf.fillA(x + 4, y + s.h, s.w - 2, 3, P.shadow, 0.22);
    surf.fillA(x + s.w, y + UP + 6, 3, s.h - UP - 3, P.shadow, 0.18);
    surf.blit(s, x, y);
  }

  CD.buildings = { draw, get, STYLES, UP };
})(window.CD);
