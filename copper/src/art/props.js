// Props: things that stand up out of the ground and sort with characters by y.
// Trees, signposts, lamps, crates, bollards, and indoor furniture. Each prop is a
// painter producing a sprite anchored at the bottom of its tile.
(function (CD) {
  'use strict';
  const { Surface, hex, mix, shade, hash2 } = CD.gfx;
  const P = CD.pal;
  const cache = new Map();

  function sphereBlob(s, cx, cy, r, cols, seed) {
    // one canopy lobe: lit upper-left, rim-darkened, with leaf-cluster noise
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y * 1.08) / r; if (d > 1) continue;
      const n = hash2(cx + x, cy + y, seed) * 0.25;
      const lit = (-x * 0.6 - y * 0.8) / r * 0.55 + (1 - d) * 0.45 + n;
      let c = d > 0.9 ? cols[0] : lit > 0.72 ? cols[4] : lit > 0.5 ? cols[3] : lit > 0.22 ? cols[2] : cols[1];
      s.px(cx + x, cy + y, c);
    }
  }
  function tree(v, kind) {
    // canopies are wider than a tile and hang low so rows of trees read as woodland
    const s = new Surface(20, 28);
    const cols = kind === 'pine' ? ['#1f4a34', '#2b5e3e', '#3a7448', '#4f8a50', '#6aa05a'] : [P.leafDD, P.leafD, P.leaf, P.leafL, P.leafLL];
    s.fill(8, 21, 4, 6, P.trunk); s.vline(8, 21, 6, shade(P.trunk, 0.2)); s.vline(11, 21, 6, P.trunkD);
    s.px(7, 26, P.trunkD); s.px(12, 26, P.trunkD);
    if (kind === 'pine') {
      for (let tier = 0; tier < 3; tier++) {
        const top = 1 + tier * 6, half = 4 + tier * 2;
        for (let y = 0; y < 9; y++) {
          const w = Math.round(half * (y / 8)) + 1;
          for (let x = -w; x <= w; x++) {
            const lit = x < 0 ? 3 : x < w - 1 ? 2 : 1;
            s.px(10 + x, top + y, cols[y === 8 ? 0 : lit + (hash2(x, y + tier * 9, v) < 0.15 ? 1 : 0)]);
          }
        }
      }
    } else {
      sphereBlob(s, 6, 15, 6, cols, 3 + v);
      sphereBlob(s, 14, 15, 6, cols, 5 + v);
      sphereBlob(s, 10, 9, 7, cols, 7 + v);
      sphereBlob(s, 10, 17, 5, cols, 9 + v);
      if (v % 3 === 0) { s.px(6, 12, '#e87858'); s.px(13, 9, '#e87858'); s.px(11, 16, '#e87858'); } // fruit
    }
    return s;
  }
  function sign(kind) {
    const s = new Surface(16, 20);
    s.fill(7, 10, 2, 9, P.woodD); s.vline(7, 10, 9, P.wood);
    const board = kind === 'route' ? '#e8dcc0' : P.wood;
    s.fill(1, 3, 14, 9, P.woodDD); s.fill(2, 4, 12, 7, board); s.hline(2, 4, 12, shade(board, 0.2));
    for (let i = 0; i < 3; i++) s.hline(4, 6 + i * 2, 8 - (i === 2 ? 3 : 0), kind === 'route' ? '#6a5a4a' : P.woodDD);
    return s;
  }
  function lamp() {
    const s = new Surface(16, 32);
    s.fill(7, 8, 2, 23, '#3a3a48'); s.vline(7, 8, 23, '#5a5a6a');
    s.fill(5, 29, 6, 2, '#3a3a48');
    s.fill(4, 2, 8, 7, '#3a3a48'); s.fill(5, 3, 6, 5, '#f8e8a8'); s.hline(5, 3, 6, '#fff8d8');
    s.fill(3, 1, 10, 2, '#2a2a38'); s.px(7, 0, '#2a2a38'); s.px(8, 0, '#2a2a38');
    return s;
  }
  function crate() {
    const s = new Surface(16, 18);
    s.fill(1, 3, 14, 14, P.wood); s.rect(1, 3, 14, 14, P.woodDD);
    s.line(2, 4, 14, 15, P.woodD); s.line(2, 15, 14, 4, P.woodD);
    s.hline(2, 4, 12, P.woodL); s.fill(1, 1, 14, 3, P.woodL); s.rect(1, 1, 14, 3, P.woodDD);
    return s;
  }
  function barrel() {
    const s = new Surface(16, 18);
    for (let y = 2; y < 17; y++) { const w = 5 + Math.round(Math.sin((y - 2) / 14 * Math.PI) * 1.5); for (let x = -w; x <= w; x++) s.px(8 + x, y, x < -w + 2 ? P.woodL : x > w - 2 ? P.woodDD : P.wood); }
    s.hline(3, 5, 10, P.stoneD); s.hline(3, 13, 10, P.stoneD);
    s.ellipse(8, 2.5, 5, 1.6, P.woodD);
    return s;
  }
  function bollard() {
    const s = new Surface(16, 16);
    s.ellipse(8, 13, 5, 2, P.shadow);
    s.fill(5, 5, 6, 9, '#3a3a48'); s.vline(5, 5, 9, '#5a5a6a');
    s.fill(4, 4, 8, 2, '#4a4a5a'); s.fill(3, 11, 10, 3, '#2e2e3a');
    return s;
  }
  function rock() {
    const s = new Surface(16, 16);
    for (let y = -6; y <= 6; y++) for (let x = -7; x <= 7; x++) {
      const d = Math.hypot(x / 7, y / 6); if (d > 1 || y > 5) continue;
      const lit = (-x - y * 1.2) / 10 + (1 - d) * 0.4;
      s.px(8 + x, 9 + y, d > 0.9 ? P.stoneDD : lit > 0.6 ? P.stoneL : lit > 0.1 ? P.stone : P.stoneD);
    }
    s.line(6, 6, 9, 10, P.stoneD);
    return s;
  }
  function signal() {
    // a railway semaphore signal post
    const s = new Surface(16, 36);
    s.fill(7, 4, 2, 31, '#e8e4dc'); s.vline(8, 4, 31, '#a8a4a0');
    s.fill(8, 6, 7, 3, P.red); s.fill(12, 6, 2, 3, P.white);
    s.fill(4, 8, 3, 4, '#2a2a38'); s.px(5, 9, '#e04030'); s.px(5, 10, '#40c060');
    s.fill(5, 33, 6, 2, '#5a5a6a'); s.px(7, 2, P.ink); s.px(8, 2, P.ink); s.px(7, 3, P.ink);
    return s;
  }
  function statue() {
    // the Old Iron memorial: a little steam engine on a plinth
    const s = new Surface(32, 36);
    s.fill(2, 22, 28, 13, P.stoneD); s.fill(3, 22, 26, 3, P.stoneL); s.fill(3, 25, 26, 9, P.stone);
    s.hline(2, 34, 28, P.stoneDD);
    s.fill(9, 27, 14, 5, P.brassD); s.fill(10, 28, 12, 3, P.brass); s.hline(11, 29, 10, P.brassD);
    const b = '#6a6e78', bl = '#9aa0aa', bd = '#454852';
    s.fill(6, 11, 16, 8, b); s.hline(6, 11, 16, bl); s.hline(6, 18, 16, bd);
    s.fill(19, 5, 8, 14, b); s.hline(19, 5, 8, bl); s.fill(21, 8, 4, 4, bd);
    s.fill(9, 5, 4, 6, b); s.fill(8, 4, 6, 2, bl);
    s.ellipse(10, 20, 3, 3, bd); s.ellipse(18, 20, 3, 3, bd); s.ellipse(24, 20, 2.5, 2.5, bd);
    s.px(10, 19, bl); s.px(18, 19, bl);
    s.fill(3, 17, 4, 2, bd);
    return s;
  }
  function mailbox() {
    const s = new Surface(16, 18);
    s.fill(7, 9, 2, 8, P.woodD);
    s.fill(3, 3, 10, 7, P.red); s.hline(3, 3, 10, P.redL); s.hline(3, 9, 10, P.redD);
    s.fill(11, 1, 1, 4, P.ink); s.fill(11, 1, 3, 2, P.redL);
    return s;
  }
  function flowerbox() {
    const s = new Surface(16, 16);
    s.fill(1, 9, 14, 6, P.woodD); s.hline(1, 9, 14, P.woodL);
    for (let i = 0; i < 5; i++) { const x = 2 + i * 3; s.px(x, 7, ['#e87858', '#f4d35e', '#e8a0c8'][i % 3]); s.px(x + 1, 8, P.leafD); s.px(x, 8, P.leaf); s.px(x - 1, 7, P.leafL); }
    return s;
  }
  function anchor() {
    const s = new Surface(16, 20);
    s.vline(8, 3, 14, '#3a3a48'); s.vline(7, 3, 14, '#5a5a6a'); s.hline(4, 6, 8, '#3a3a48');
    s.ellipse(8, 2, 2, 2, '#3a3a48'); s.ellipse(8, 2, 1, 1, '#16121e');
    for (let i = -6; i <= 6; i++) s.px(8 + i, 16 - Math.round(Math.abs(i) * 0.6), '#3a3a48');
    s.px(2, 12, '#3a3a48'); s.px(14, 12, '#3a3a48');
    return s;
  }

  // ---- interior furniture ----
  function bookshelf() {
    const s = new Surface(16, 28);
    s.fill(0, 0, 16, 28, P.woodDD); s.fill(1, 1, 14, 26, P.woodD);
    const bookCols = ['#b8574a', '#4f6ea8', '#58a060', '#d9a93a', '#8a5a9a', '#e8dcc0'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const y0 = 2 + shelf * 8;
      s.hline(1, y0 + 7, 14, P.wood);
      let x = 2;
      while (x < 14) {
        const w = 1 + Math.floor(hash2(x, shelf, 7) * 2), h = 4 + Math.floor(hash2(shelf, x, 8) * 3);
        const c = bookCols[Math.floor(hash2(x, shelf, 9) * bookCols.length)];
        s.fill(x, y0 + 7 - h, w, h, c); s.vline(x, y0 + 7 - h, h, shade(c, 0.2));
        x += w + (hash2(x, shelf, 11) < 0.2 ? 1 : 0);
      }
    }
    return s;
  }
  function bed() {
    const s = new Surface(16, 32);
    s.fill(1, 2, 14, 29, P.woodD); s.fill(1, 1, 14, 5, P.wood); s.hline(1, 1, 14, P.woodL);
    s.fill(2, 6, 12, 24, '#f4f0e8'); s.fill(3, 7, 10, 5, '#ffffff'); s.hline(3, 11, 10, '#d8d4e0');
    s.fill(2, 13, 12, 17, '#5a82c0'); s.hline(2, 13, 12, '#8aaed8');
    for (let y = 16; y < 29; y += 4) s.hline(3, y, 10, '#4a6ea8');
    return s;
  }
  function table() {
    const s = new Surface(16, 16);
    s.fill(1, 3, 14, 7, P.woodL); s.hline(1, 3, 14, '#e8c090'); s.fill(1, 10, 14, 2, P.woodD);
    s.fill(2, 12, 2, 4, P.woodDD); s.fill(12, 12, 2, 4, P.woodDD);
    return s;
  }
  function chair() {
    const s = new Surface(16, 16);
    s.fill(4, 1, 8, 8, P.wood); s.hline(4, 1, 8, P.woodL); s.fill(4, 9, 8, 3, P.woodD);
    s.fill(4, 12, 2, 4, P.woodDD); s.fill(10, 12, 2, 4, P.woodDD);
    return s;
  }
  function plant() {
    const s = new Surface(16, 22);
    s.fill(4, 14, 8, 7, '#b8664e'); s.hline(4, 14, 8, '#d88a6e'); s.hline(5, 20, 6, '#8a4a38');
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; for (let r = 0; r < 9; r++) s.px(8 + Math.round(Math.cos(a) * r), 13 + Math.round(Math.sin(a) * r), r > 6 ? P.leafL : i % 2 ? P.leaf : P.leafD); }
    return s;
  }
  function tv() {
    const s = new Surface(16, 20);
    s.fill(1, 12, 14, 7, P.woodD); s.hline(1, 12, 14, P.wood);
    s.fill(2, 2, 12, 10, '#3a3a48'); s.fill(3, 3, 10, 7, '#6ab0c8'); s.px(4, 4, '#c8f0ff'); s.px(5, 4, '#a8e0f0');
    s.line(6, 1, 4, -1, '#3a3a48'); s.line(10, 1, 12, -1, '#3a3a48');
    return s;
  }
  function pc() {
    const s = new Surface(16, 22);
    s.fill(1, 12, 14, 9, '#8a8a9a'); s.hline(1, 12, 14, '#b8b8c8');
    s.fill(2, 1, 12, 11, '#c8c8d4'); s.fill(3, 2, 10, 8, '#2a4a3a');
    for (let y = 3; y < 9; y += 2) s.hline(4, y, 3 + ((y * 3) % 5), '#6ae08a');
    s.fill(4, 14, 8, 2, '#5a5a6a');
    return s;
  }
  function counter() {
    const s = new Surface(16, 18);
    s.fill(0, 2, 16, 15, '#c4523f'); s.fill(0, 2, 16, 3, '#f3e6cc'); s.hline(0, 2, 16, '#fff8e4'); s.hline(0, 16, 16, '#8a3a30');
    for (let x = 3; x < 16; x += 6) s.vline(x, 6, 10, '#a8443a');
    return s;
  }
  function counterBlue() {
    const s = counter();
    for (let i = 0; i < s.data.length; i++) { if (s.data[i] === hex('#c4523f')) s.data[i] = hex('#3f74b0'); else if (s.data[i] === hex('#a8443a')) s.data[i] = hex('#34507a'); else if (s.data[i] === hex('#8a3a30')) s.data[i] = hex('#24406a'); }
    return s;
  }
  function healer() {
    // the depot's restoration bay: a small turntable with glowing lamps
    const s = new Surface(16, 20);
    s.fill(1, 6, 14, 12, '#6a7280'); s.hline(1, 6, 14, '#9aa4b0');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { s.ellipse(4 + i * 4, 10 + j * 4, 1.5, 1.5, '#f8d888'); }
    s.fill(3, 1, 10, 5, '#4a5460'); s.fill(4, 2, 8, 3, '#a8e8c8');
    return s;
  }
  function shelves() {
    const s = new Surface(16, 26);
    s.fill(0, 0, 16, 26, '#8a8a9a'); s.fill(1, 1, 14, 24, '#e8e4dc');
    const goods = ['#c8513f', '#4f78b8', '#e8c040', '#58a060', '#f0f0f0'];
    for (let r = 0; r < 3; r++) { s.hline(1, 8 + r * 8, 14, '#8a8a9a'); for (let x = 2; x < 14; x += 3) s.fill(x, 3 + r * 8, 2, 5, goods[(x + r * 2) % goods.length]); }
    return s;
  }
  function machine() {
    const s = new Surface(16, 26);
    s.fill(1, 2, 14, 23, '#5a6270'); s.hline(1, 2, 14, '#8a94a4');
    s.fill(3, 5, 10, 6, '#2a3a4a'); s.px(4, 6, '#e04030'); s.px(6, 6, '#40c060'); s.px(8, 6, '#e8c040');
    s.fill(3, 13, 10, 9, '#4a5260'); for (let y = 14; y < 21; y += 2) s.hline(4, y, 8, '#6a7280');
    return s;
  }
  function trainModel() {
    // a model locomotive on a display stand in the lab
    const s = new Surface(16, 16);
    s.fill(0, 11, 16, 4, P.woodD); s.hline(0, 11, 16, P.wood);
    s.fill(2, 5, 9, 5, P.copper); s.hline(2, 5, 9, P.copperL); s.fill(10, 3, 4, 7, P.copperD);
    s.fill(4, 2, 2, 3, '#3a3a48');
    s.ellipse(4.5, 10, 1.8, 1.8, '#3a3a48'); s.ellipse(9, 10, 1.8, 1.8, '#3a3a48');
    return s;
  }
  function eggStand(kind) {
    // the three starter eggs on their cradles; a taken egg leaves an empty cradle
    const s = new Surface(16, 18);
    s.fill(2, 12, 12, 5, '#8a8a9a'); s.hline(2, 12, 12, '#c8c8d4');
    if (kind === 'empty') return s;
    const col = { steam: P.copper, electric: '#c8ccd8', diesel: '#9a6a44' }[kind] || P.copper;
    for (let y = -6; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x / 4.5, y / (y < 0 ? 6.5 : 5)); if (d > 1) continue;   // egg: taller above the waist
      const lit = (-x - y) / 8 + (1 - d) * 0.5;
      s.px(8 + x, 7 + y, lit > 0.6 ? shade(col, 0.4) : lit > 0.1 ? col : shade(col, -0.3));
    }
    const mark = { steam: P.cream, electric: '#e3b53a', diesel: '#3a2a20' }[kind];
    s.hline(5, 7, 7, mark); s.px(6, 6, mark); s.px(10, 8, mark);
    return s;
  }
  function stove() {
    const s = new Surface(16, 20);
    s.fill(1, 4, 14, 15, '#e8e4dc'); s.hline(1, 4, 14, '#fff'); s.fill(2, 10, 12, 7, '#b8b4ac');
    s.ellipse(5, 6, 2, 1, '#3a3a48'); s.ellipse(11, 6, 2, 1, '#3a3a48');
    return s;
  }
  function wheelDisplay() {
    const s = new Surface(16, 20);
    s.fill(6, 14, 4, 5, P.woodD);
    s.ellipse(8, 8, 7, 7, '#3a3a48'); s.ellipse(8, 8, 5.5, 5.5, '#6a6e78');
    for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3; s.line(8, 8, 8 + Math.cos(an) * 5, 8 + Math.sin(an) * 5, '#3a3a48'); }
    s.ellipse(8, 8, 1.5, 1.5, P.brass);
    return s;
  }
  function globe() {
    const s = new Surface(16, 22);
    s.fill(6, 16, 4, 5, P.woodD); s.hline(4, 20, 8, P.woodDD);
    s.ellipse(8, 9, 6, 6, '#4f8fc0'); s.ellipse(6, 7, 2.5, 2, '#6ab060'); s.ellipse(10, 11, 2, 2.5, '#6ab060');
    return s;
  }

  const MAKERS = {
    tree: v => tree(v, 'round'), pine: v => tree(v, 'pine'), sign: () => sign('wood'), routeSign: () => sign('route'),
    lamp, crate, barrel, bollard, rock, signal, statue, mailbox, flowerbox, anchor,
    bookshelf, bed, table, chair, plant, tv, pc, counter, counterBlue, healer, shelves, machine, trainModel,
    eggSteam: () => eggStand('steam'), eggElectric: () => eggStand('electric'), eggDiesel: () => eggStand('diesel'), eggEmpty: () => eggStand('empty'),
    stove, wheelDisplay, globe,
  };
  function get(kind, v) {
    const key = kind + ':' + (v || 0);
    let s = cache.get(key);
    if (!s) { s = (MAKERS[kind] || MAKERS.crate)(v || 0); cache.set(key, s); }
    return s;
  }
  // Draw a prop standing on tile (tx,ty): bottom-aligned, horizontally centred on the tile
  function draw(surf, kind, tx, ty, camX, camY, v) {
    const s = get(kind, v);
    const x = tx * 16 + 8 - (s.w >> 1) - camX, y = ty * 16 + 16 - s.h - camY;
    surf.blit(s, x, y);
  }

  CD.props = { draw, get, MAKERS };
})(window.CD);
