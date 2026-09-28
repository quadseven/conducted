// Ground painters. A map cell carries a semantic label ("grass", "tall", "path",
// "rail"...). Each label has a painter that draws a 16x16 cell from noise and
// shape rules, aware of its neighbours so edges blend (paths fray into grass,
// water foams against the shore, track pieces join into straights and curves).
// Painted cells are cached by label + variant + neighbour mask + animation frame.
(function (CD) {
  'use strict';
  const { Surface, hex, mix, shade, hash2, bayer } = CD.gfx;
  const P = CD.pal;
  const TS = 16;
  const cache = new Map();

  // Neighbour mask helper: bit per direction where pred(label) holds.
  // Order: N E S W NE SE SW NW
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
  function mask(nb, pred) { let m = 0; for (let i = 0; i < 8; i++) if (pred(nb(DIRS[i][0], DIRS[i][1]))) m |= 1 << i; return m; }

  const PATHY = new Set(['path', 'cobble', 'sand', 'plaza']);
  const WATERY = new Set(['water']);

  // ---------- individual painters (s: 16x16 Surface, c: context) ----------
  function grassBase(s, v) {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x, y, 11 + v);
      let col = P.grass;
      if (n < 0.07) col = P.grassD; else if (n > 0.95) col = P.grassL;
      s.px(x, y, col);
    }
    // blade tufts
    const tufts = 2 + (v % 2);
    for (let i = 0; i < tufts; i++) {
      const tx = 2 + Math.floor(hash2(i, v, 3) * 12), ty = 3 + Math.floor(hash2(v, i, 5) * 11);
      s.px(tx, ty, P.grassDD); s.px(tx - 1, ty - 1, P.grassD); s.px(tx + 1, ty - 1, P.grassD);
      s.px(tx, ty - 1, P.grassD); s.px(tx - 1, ty - 2, P.grassL); s.px(tx + 1, ty - 2, P.grassLL);
    }
    if (v === 3) { // a light patch of clover
      const cx = 4 + Math.floor(hash2(v, 9, 1) * 8), cy = 5 + Math.floor(hash2(9, v, 1) * 6);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 1], [1, 1]]) s.px(cx + dx, cy + dy, P.grassLL);
    }
  }

  function flowers(s, c) {
    grassBase(s, c.v & 1);
    const cols = [[P.redL, P.red], ['#f4d35e', '#d9a93a'], [P.white, '#d8d0e0'], ['#e8a0c8', '#c070a0']];
    const pick = cols[c.v % cols.length];
    const spots = [[4, 5], [11, 4], [7, 11], [13, 12]];
    spots.forEach(([x, y], i) => {
      if (i === 3 && c.v % 2) return;
      const sway = ((c.frame + i) % 4 < 2) ? 0 : 1;
      s.px(x + sway, y - 1, pick[0]); s.px(x - 1 + sway, y, pick[0]); s.px(x + 1 + sway, y, pick[0]); s.px(x + sway, y + 1, pick[1]);
      s.px(x + sway, y, '#f8e080');
      s.px(x, y + 2, P.grassDD); s.px(x, y + 3, P.grassD);
    });
  }

  function tall(s, c) {
    // dense blades over a dark base; tips sway on alternate frames
    s.fill(0, 0, TS, TS, P.tallD);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (hash2(x, y, 41) < 0.18) s.px(x, y, P.tallDD);
    const sway = c.frame % 2;
    const clumps = [[3, 7], [8, 5], [13, 8], [5, 14], [11, 15], [0, 13], [15, 15]];
    for (const [cx, cy] of clumps) blades(s, cx, cy, sway);
  }
  function blades(s, cx, cy, sway) {
    for (let k = -2; k <= 2; k++) {
      const h = 6 - Math.abs(k);
      const lean = k < 0 ? -1 : k > 0 ? 1 : 0;
      for (let i = 0; i < h; i++) {
        const x = cx + k + Math.round(lean * i * 0.35) + (i > h - 3 ? sway : 0), y = cy - i;
        s.px(x, y, i > h - 2 ? P.tallLL : i > h - 4 ? P.tallL : P.tall);
      }
    }
    s.px(cx, cy + 1, P.tallDD);
  }
  // Front part of tall grass drawn over a character standing in it (legs hidden)
  function tallFront(frame) {
    const key = 'tallFront' + (frame % 2);
    let s = cache.get(key);
    if (s) return s;
    s = new Surface(TS, 8);
    const sway = frame % 2;
    for (const cx of [2, 7, 12]) for (let k = -2; k <= 2; k++) {
      const h = 7 - Math.abs(k) * 1.2;
      for (let i = 0; i < h; i++) {
        const x = cx + k + Math.round((k < 0 ? -1 : k > 0 ? 1 : 0) * i * 0.3) + (i > h - 3 ? sway : 0), y = 7 - i;
        s.px(x, y, i > h - 2 ? P.tallLL : i > h - 4 ? P.tallL : P.tall);
      }
    }
    cache.set(key, s);
    return s;
  }

  function fray(s, c, pred, inner, rim) {
    // Draw grass over the cell edges where the neighbour is not path-like. The boundary
    // is noisy so paths look worn rather than cut with a ruler.
    const m = mask(c.nb, l => pred(l));
    const open = i => (m >> i) & 1;
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x + c.x * 16, y + c.y * 16, 7);
      const depth = 1.5 + n * 2.2;
      let grassy = false;
      if (!open(0) && y < depth) grassy = true;
      if (!open(2) && TS - 1 - y < depth) grassy = true;
      if (!open(3) && x < depth) grassy = true;
      if (!open(1) && TS - 1 - x < depth) grassy = true;
      // concave corners: neighbours on both sides are path but the diagonal is not
      const cr = 2.2 + n * 1.5;
      if (open(0) && open(1) && !open(4) && Math.hypot(TS - x, y + 1) < cr + 1) grassy = true;
      if (open(2) && open(1) && !open(5) && Math.hypot(TS - x, TS - y) < cr + 1) grassy = true;
      if (open(2) && open(3) && !open(6) && Math.hypot(x + 1, TS - y) < cr + 1) grassy = true;
      if (open(0) && open(3) && !open(7) && Math.hypot(x + 1, y + 1) < cr + 1) grassy = true;
      if (grassy) {
        const g = hash2(x, y, 11 + (c.v & 3));
        s.px(x, y, g < 0.07 ? P.grassD : g > 0.95 ? P.grassL : P.grass);
      }
    }
    // rim: a darker line on the path side of each boundary
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      if (s.get(x, y) === hex(P.grass) || s.get(x, y) === hex(P.grassD) || s.get(x, y) === hex(P.grassL)) continue;
      const g = (dx, dy) => { const q = s.get(x + dx, y + dy); return q === hex(P.grass) || q === hex(P.grassD) || q === hex(P.grassL); };
      if (g(0, -1) || g(-1, 0)) s.px(x, y, rim);
      else if (g(0, 1) || g(1, 0)) s.px(x, y, inner);
    }
  }

  function path(s, c) {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x, y, 21 + c.v);
      s.px(x, y, n < 0.1 ? P.pathD : n > 0.93 ? P.pathL : P.path);
    }
    // pebbles
    for (let i = 0; i < 3; i++) {
      const px = 1 + Math.floor(hash2(i, c.v, 22) * 13), py = 1 + Math.floor(hash2(c.v, i, 23) * 13);
      s.px(px, py, P.pathDD); s.px(px + 1, py, P.pathD); s.px(px, py - 1, P.pathL);
    }
    fray(s, c, l => PATHY.has(l) || l === 'door' || l === 'crossing' || l === 'mat' || l === 'plaza', P.pathL, P.pathDD);
  }

  function cobble(s, c) {
    s.fill(0, 0, TS, TS, P.cobbleD);
    // two rows of rounded setts, offset per row
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 4;
      for (let col = -1; col < 4; col++) {
        const x0 = col * 8 + off / 2 + (row % 2 ? 2 : 0), y0 = row * 4;
        const tone = hash2(col + c.x * 4, row + c.y * 4, 31);
        const base = tone < 0.3 ? mix(P.cobble, P.cobbleD, 0.3) : tone > 0.8 ? mix(P.cobble, P.cobbleL, 0.4) : P.cobble;
        for (let y = 0; y < 3; y++) for (let x = 0; x < 7; x++) {
          if ((x === 0 || x === 6) && (y === 0 || y === 2)) continue;
          s.px(x0 + x, y0 + y, y === 0 ? shade(base, 0.15) : base);
        }
      }
    }
  }

  function plaza(s, c) {
    // large square paving slabs used in town squares and station forecourts
    s.fill(0, 0, TS, TS, '#d8ccb4');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x + c.x * 16, y + c.y * 16, 33);
      if (n < 0.08) s.px(x, y, '#cbbda3');
      if (n > 0.96) s.px(x, y, '#e8dfcc');
    }
    s.hline(0, 0, TS, '#b8a98e'); s.vline(0, 0, TS, '#b8a98e');
    s.hline(1, 1, TS - 1, '#e6dcc8');
  }

  function sand(s, c) {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x + c.x * 16, y + c.y * 16, 51);
      s.px(x, y, n < 0.12 ? P.sandD : n > 0.9 ? P.sandL : P.sand);
    }
    if (c.v === 2) { s.px(5, 9, '#f0e8f0'); s.px(6, 9, '#e0a8a0'); s.px(5, 10, '#c88878'); } // a shell
  }

  function water(s, c) {
    const f = c.frame;
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const w1 = Math.sin((x / TS) * Math.PI * 2 + (y / TS) * Math.PI * 4 + f * Math.PI / 2);
      const w2 = Math.sin((x / TS) * Math.PI * 4 - (y / TS) * Math.PI * 2 - f * Math.PI / 2);
      const v = w1 * 0.6 + w2 * 0.4;
      let col = P.water;
      if (v > 0.78) col = P.waterL; else if (v < -0.7) col = P.waterD;
      s.px(x, y, col);
    }
    // sparkle
    if ((c.v + f) % 4 === 0) { s.px(4 + c.v * 2, 6, P.foam); s.px(5 + c.v * 2, 6, P.waterL); }
    // shore: foam and wet sand where the neighbour is land
    const land = l => !WATERY.has(l) && l !== undefined && l !== 'bridge';
    const m = mask(c.nb, land);
    const edge = i => (m >> i) & 1;
    const foamPhase = (f % 2);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let d = 99;
      if (edge(0)) d = Math.min(d, y);
      if (edge(2)) d = Math.min(d, TS - 1 - y);
      if (edge(3)) d = Math.min(d, x);
      if (edge(1)) d = Math.min(d, TS - 1 - x);
      if (edge(4) && !edge(0) && !edge(1)) d = Math.min(d, Math.hypot(TS - 1 - x, y) - 0.5);
      if (edge(5) && !edge(2) && !edge(1)) d = Math.min(d, Math.hypot(TS - 1 - x, TS - 1 - y) - 0.5);
      if (edge(6) && !edge(2) && !edge(3)) d = Math.min(d, Math.hypot(x, TS - 1 - y) - 0.5);
      if (edge(7) && !edge(0) && !edge(3)) d = Math.min(d, Math.hypot(x, y) - 0.5);
      if (d < 1) s.px(x, y, P.waterDD);
      else if (d < 2 + foamPhase) s.px(x, y, P.foam);
      else if (d < 3.5) s.px(x, y, P.waterL);
    }
  }

  function ballast(s, c, seed) {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x + c.x * 16, y + c.y * 16, seed || 61);
      s.px(x, y, n < 0.22 ? P.ballastD : n > 0.8 ? P.ballastL : P.ballast);
    }
  }
  // Track shapes: 'h', 'v', or curve keys 'ne','nw','se','sw' naming the two open sides
  function railShape(c) {
    const r = l => l === 'rail' || l === 'crossing' || l === 'buffer' || l === 'railgrass';
    const n = r(c.nb(0, -1)), e = r(c.nb(1, 0)), s = r(c.nb(0, 1)), w = r(c.nb(-1, 0));
    if ((e || w) && !(n || s)) return 'h';
    if ((n || s) && !(e || w)) return 'v';
    if (n && e && !s && !w) return 'ne';
    if (n && w && !s && !e) return 'nw';
    if (s && e && !n && !w) return 'se';
    if (s && w && !n && !e) return 'sw';
    if (e && w) return 'h';
    return 'v';
  }
  function rail(s, c, overgrown) {
    const shape = railShape(c);
    if (overgrown) grassBase(s, c.v & 3); else ballast(s, c);
    const sleeper = (x, y, w, h) => { s.fill(x, y, w, h, P.sleeper); s.hline(x, y + h - 1, w, P.sleeperD); s.hline(x, y, w, shade(P.sleeper, 0.15)); };
    const railLine = (pts) => { for (const [x, y, hi] of pts) s.px(x, y, hi ? P.steelL : P.steel); };
    if (shape === 'h' || shape === 'v') {
      for (let i = 0; i < 4; i++) {
        const o = i * 4 + 1;
        if (shape === 'h') sleeper(o, 2, 3, 12); else sleeper(2, o, 12, 3);
      }
      for (let i = 0; i < TS; i++) {
        if (shape === 'h') { s.px(i, 4, P.steelL); s.px(i, 5, P.steelD); s.px(i, 11, P.steelL); s.px(i, 12, P.steelD); }
        else { s.px(4, i, P.steelL); s.px(5, i, P.steelD); s.px(11, i, P.steelL); s.px(12, i, P.steelD); }
      }
      if (overgrown) for (let i = 0; i < 6; i++) { const x = Math.floor(hash2(i, c.v, 5) * 16), y = Math.floor(hash2(c.v, i, 6) * 16); s.px(x, y, P.grassDD); s.px(x, y - 1, P.grassL); }
    } else {
      // curve around the corner shared by the two open sides
      const cx = shape.includes('e') ? TS : 0, cy = shape.includes('s') ? TS : 0;
      const ang0 = Math.atan2(8 - cy, 8 - cx);
      for (let k = -1; k <= 1; k++) {
        const a = ang0 + k * 0.5;
        for (let rr = 2; rr <= 14; rr += 0.5) {
          const x = Math.round(cx + Math.cos(a) * rr - 0.5), y = Math.round(cy + Math.sin(a) * rr - 0.5);
          for (let t = -1; t <= 1; t++) s.px(x + Math.round(-Math.sin(a) * t), y + Math.round(Math.cos(a) * t), P.sleeper);
        }
      }
      for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (Math.abs(d - 4.5) < 0.6 || Math.abs(d - 11.5) < 0.6) s.px(x, y, P.steelL);
        else if (Math.abs(d - 5.4) < 0.45 || Math.abs(d - 12.4) < 0.45) s.px(x, y, P.steelD);
      }
    }
  }
  function crossing(s, c) {
    const shape = railShape(c);
    // timber level-crossing boards between and beside the rails
    s.fill(0, 0, TS, TS, '#8c7a66');
    for (let i = 0; i < TS; i += 3) {
      if (shape === 'h') { s.vline(i, 0, TS, '#766451'); } else { s.hline(0, i, TS, '#766451'); }
    }
    for (let i = 0; i < TS; i++) {
      if (shape === 'h') { s.px(i, 4, P.steelL); s.px(i, 5, P.steelD); s.px(i, 11, P.steelL); s.px(i, 12, P.steelD); }
      else { s.px(4, i, P.steelL); s.px(5, i, P.steelD); s.px(11, i, P.steelL); s.px(12, i, P.steelD); }
    }
  }
  function buffer(s, c) {
    rail(s, c);
    // buffer stop: red-and-white beam on two posts
    const shape = railShape(c);
    if (shape === 'v' || shape === 'h') {
      s.fill(2, 3, 12, 4, P.red); for (let x = 3; x < 13; x += 4) s.fill(x, 3, 2, 4, P.white);
      s.hline(2, 7, 12, P.redD); s.fill(3, 7, 2, 5, P.woodD); s.fill(11, 7, 2, 5, P.woodD);
    }
  }
  function yard(s, c) {
    // weedy yard ballast: wild trains lurk in these sidings
    ballast(s, c, 63);
    const sway = c.frame % 2;
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(hash2(i, c.v, 64) * 14), y = 5 + Math.floor(hash2(c.v, i, 65) * 10);
      for (let k = -1; k <= 1; k++) for (let h = 0; h < 4 - Math.abs(k) * 2; h++) s.px(x + k + (h > 1 ? sway * k : 0), y - h, h > 1 ? P.tallL : P.tall);
      s.px(x, y - 4, '#d8c050');
    }
  }

  function dock(s, c) {
    for (let y = 0; y < TS; y++) {
      const plank = y >> 2;
      const tone = hash2(plank + c.y * 4, c.x, 71);
      const base = tone < 0.3 ? P.woodD : tone > 0.8 ? P.woodL : P.wood;
      for (let x = 0; x < TS; x++) {
        let col = base;
        if ((y & 3) === 3) col = P.woodDD;
        else if ((y & 3) === 0) col = shade(base, 0.12);
        else if (hash2(x + c.x * 16, y, 72) < 0.06) col = shade(base, -0.15);
        s.px(x, y, col);
      }
      if ((y & 3) === 1) { const nx = ((plank * 5 + c.x * 3) % 12) + 2; s.px(nx, y, P.stoneD); }
    }
  }
  function quay(s, c) {
    // stone harbour wall face with mortar courses; the top course is a light coping
    s.fill(0, 0, TS, TS, P.stoneD);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let col = -1; col < 3; col++) {
        const x0 = col * 8 + off, y0 = row * 4;
        const tone = hash2(col + c.x * 3, row + c.y * 4, 81);
        const base = tone < 0.4 ? P.stone : mix(P.stone, P.stoneL, 0.3);
        s.fill(x0 + 1, y0 + 1, 7, 3, base);
        s.hline(x0 + 1, y0 + 1, 7, shade(base, 0.15));
      }
    }
    const up = c.nb(0, -1);
    if (up !== 'quay') { s.fill(0, 0, TS, 3, P.stoneL); s.hline(0, 3, TS, P.stoneDD); }
  }
  function ledge(s, c) {
    // a low earth bank: lit lip, shaded face, a line of shadow on the grass below
    grassBase(s, c.v & 3);
    const l = c.nb(-1, 0) === 'ledge', r = c.nb(1, 0) === 'ledge';
    for (let x = 0; x < TS; x++) {
      if (!l && x < 1) continue; if (!r && x > 14) continue;
      const bump = Math.round(Math.sin((x + c.x * 16) * 0.55) * 0.7);
      const y0 = 7 + bump;
      s.px(x, y0, P.grassLL); s.px(x, y0 + 1, P.grassL);
      s.px(x, y0 + 2, '#8a9a58'); s.px(x, y0 + 3, '#7a8448'); s.px(x, y0 + 4, '#6a7040'); s.px(x, y0 + 5, '#5a5c38');
      s.px(x, y0 + 6, P.grassDD); if ((x + c.x) % 3) s.px(x, y0 + 7, P.grassD);
      if (hash2(x, c.x, 3) < 0.2) s.px(x, y0 + 3, '#9aa468');
    }
    if (!l) for (let y = 7; y < 14; y++) s.px(1, y, P.grassDD);
    if (!r) for (let y = 7; y < 14; y++) s.px(14, y, P.grassDD);
  }
  function fence(s, c) {
    grassBase(s, c.v & 3);
    const f = l => l === 'fence';
    const l = f(c.nb(-1, 0)), r = f(c.nb(1, 0)), u = f(c.nb(0, -1)), d = f(c.nb(0, 1));
    const vertical = (u || d) && !(l || r);
    if (vertical) {
      s.fill(6, 0, 4, 16, P.wood);
      s.vline(6, 0, 16, P.woodL); s.vline(9, 0, 16, P.woodDD);
      for (let y = 2; y < 16; y += 7) { s.fill(5, y, 6, 3, P.woodD); s.hline(5, y, 6, P.woodL); }
    } else {
      // shadow
      for (let x = l ? 0 : 5; x < (r ? 16 : 11); x++) s.px(x, 13, P.grassDD);
      for (const y of [5, 9]) { s.fill(l ? 0 : 6, y, (r ? 16 : 10) - (l ? 0 : 6), 2, P.wood); s.hline(l ? 0 : 6, y, (r ? 16 : 10) - (l ? 0 : 6), P.woodL); }
      s.fill(6, 3, 4, 10, P.woodD); s.vline(6, 3, 10, P.woodL); s.hline(6, 3, 4, P.woodL); s.vline(9, 4, 9, P.woodDD);
    }
  }
  function hedge(s, c) {
    grassBase(s, c.v & 3);
    // overlapping round bush lobes, lit from the upper left
    const lobes = [[4, 6, 5], [11, 5, 5], [8, 10, 6], [2, 12, 4], [14, 12, 4]];
    for (const [cx, cy, r] of lobes) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r; if (d > 1) continue;
      const lit = (-x - y) / (r * 1.4) + (1 - d) * 0.5;
      const col = d > 0.88 ? P.leafDD : lit > 0.55 ? P.leafL : lit > 0.05 ? P.leaf : P.leafD;
      s.px(cx + x, cy + y, col);
    }
    for (let i = 0; i < 5; i++) { const x = Math.floor(hash2(i, c.v, 91) * 14) + 1, y = Math.floor(hash2(c.v, i, 92) * 10) + 3; s.px(x, y, P.leafLL); }
    s.hline(1, 15, 14, P.grassDD);
  }
  function mat(s, c) { grassBase(s, 0); }

  // ---- interior floors and walls ----
  function wood(s, c) {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const board = (x + (y >> 3) * 3 + c.x * 16) >> 2;
      const tone = hash2(board, (y >> 3) + c.y * 2, 101);
      const base = tone < 0.33 ? '#c89464' : tone < 0.66 ? '#d4a070' : '#bc8a5c';
      let col = base;
      if (((x + c.x * 16) & 3) === 3) col = '#9a6a44';
      else if (hash2(x + c.x * 16, y + c.y * 16, 102) < 0.05) col = shade(base, -0.1);
      s.px(x, y, col);
    }
    for (let x = 0; x < TS; x++) if ((((x + c.x * 16) >> 2) + c.y) % 4 === 0) s.px(x, 7, '#a87650');
  }
  function tileFloor(s, c) {
    // clean laboratory tiles
    const a = '#e8e6ee', b = '#d6d4e0';
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) s.px(x, y, ((x >> 3) + (y >> 3)) % 2 ? a : b);
    s.hline(0, 0, TS, '#c4c2d0'); s.vline(0, 0, TS, '#c4c2d0'); s.hline(0, 8, TS, '#c8c6d4'); s.vline(8, 0, TS, '#c8c6d4');
  }
  function carpet(s, c) {
    const base = c.tint || '#b85a50';
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = hash2(x + c.x * 16, y + c.y * 16, 111);
      s.px(x, y, n < 0.15 ? shade(base, -0.12) : base);
    }
    const m = mask(c.nb, l => l === 'carpet');
    const e = i => (m >> i) & 1;
    if (!e(0)) { s.hline(0, 0, TS, shade(base, -0.35)); s.hline(0, 1, TS, P.brassL); }
    if (!e(2)) { s.hline(0, 15, TS, shade(base, -0.35)); s.hline(0, 14, TS, P.brassL); }
    if (!e(3)) { s.vline(0, 0, TS, shade(base, -0.35)); s.vline(1, 0, TS, P.brassL); }
    if (!e(1)) { s.vline(15, 0, TS, shade(base, -0.35)); s.vline(14, 0, TS, P.brassL); }
  }
  function wall(s, c) {
    // papered back wall with wainscot; the style tint varies per building
    const paper = c.tint || '#e8d8b4';
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let col = paper;
      if (((x + c.x * 16) % 8) === 0) col = shade(paper, -0.08);
      if (y >= 10) col = y === 10 ? '#8a5e3a' : y === 15 ? '#5f3f28' : (x + c.x * 16) % 6 === 0 ? '#9a6a44' : '#b5824f';
      s.px(x, y, col);
    }
    s.hline(0, 0, TS, shade(paper, -0.25));
  }
  function voidT(s) { s.fill(0, 0, TS, TS, '#16121e'); }
  function stairsDown(s, c) {
    wood(s, c);
    for (let i = 0; i < 4; i++) { s.fill(2, 2 + i * 3, 12, 3, shade('#6a5a70', -i * 0.12)); s.hline(2, 2 + i * 3, 12, '#9a8aa0'); }
  }
  function stairsUp(s, c) {
    wood(s, c);
    for (let i = 0; i < 4; i++) { s.fill(2, 2 + i * 3, 12, 3, shade('#c89464', -0.2 + i * 0.1)); s.hline(2, 2 + i * 3, 12, '#e8c090'); s.hline(2, 4 + i * 3, 12, '#8a5e3a'); }
    s.vline(1, 0, 16, '#5f3f28'); s.vline(14, 0, 16, '#5f3f28');
  }
  function doormat(s, c) {
    (c.floor === 'tile' ? tileFloor : wood)(s, c);
    s.fill(1, 4, 14, 10, '#8a4a3e'); s.rect(1, 4, 14, 10, '#6a3430');
    for (let x = 3; x < 13; x += 2) s.vline(x, 6, 6, '#a0604e');
  }

  const PAINT = {
    grass: (s, c) => grassBase(s, c.v & 3), flowers, tall, path, cobble, plaza, sand, water, rail,
    railgrass: (s, c) => rail(s, c, true), crossing, buffer, yard, dock, quay, ledge, fence, hedge,
    wood, tile: tileFloor, carpet, wall, void: voidT, stairsDown, stairsUp, doormat, mat,
  };
  const ANIM = { water: 4, tall: 2, flowers: 4, yard: 2 };
  const NEEDS_NB = { path: 1, water: 1, rail: 1, railgrass: 1, crossing: 1, buffer: 1, ledge: 1, fence: 1, carpet: 1, quay: 1 };

  // Draw ground cell (label at world x,y) to surf at screen sx,sy.
  // nb(dx,dy) returns the neighbouring label; opts carries interior tints.
  function drawCell(surf, label, x, y, sx, sy, nb, frame, opts) {
    const painter = PAINT[label] || PAINT.grass;
    const v = Math.floor(hash2(x, y, 1) * 4);
    const fr = ANIM[label] ? Math.floor(frame / (label === 'water' ? 16 : 24)) % ANIM[label] : 0;
    let key = label + v + ':' + fr;
    let m = '';
    if (NEEDS_NB[label]) { for (const [dx, dy] of DIRS) m += (nb(dx, dy) || '_')[0] + (nb(dx, dy) || '_').length; key += m; }
    // wood and wall textures depend on absolute column (board offsets); key by x parity
    if (label === 'wood' || label === 'wall' || label === 'carpet' || label === 'stairsDown' || label === 'stairsUp' || label === 'doormat') key += ':' + (x & 3) + (y & 1) + (opts && opts.tint || '') + (opts && opts.floor || '');
    if (label === 'path' || label === 'cobble' || label === 'plaza' || label === 'sand' || label === 'ballast' || label === 'rail' || label === 'yard' || label === 'dock' || label === 'quay') key += ':' + (x & 7) + ',' + (y & 7);
    let s = cache.get(key);
    if (!s) {
      s = new Surface(TS, TS);
      painter(s, { x, y, v, frame: fr, nb, tint: opts && opts.tint, floor: opts && opts.floor });
      cache.set(key, s);
    }
    surf.blit(s, sx, sy);
  }

  CD.tiles = { TS, drawCell, tallFront, PAINT, clearCache: () => cache.clear(), railShape };
})(window.CD);
