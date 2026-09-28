// World model: turns authored map text into cells with ground labels, props,
// buildings and collision; resolves edge connections between outdoor maps; and
// answers movement questions (can I step here? is this a ledge? a warp?).
(function (CD) {
  'use strict';

  // Character legend shared by every outdoor map.
  const OUTDOOR = {
    '.': { g: 'grass' }, 'f': { g: 'flowers' }, '"': { g: 'tall', grass: true }, '=': { g: 'path' },
    ':': { g: 'cobble' }, '+': { g: 'plaza' }, 's': { g: 'sand' }, '~': { g: 'water', solid: true, water: true },
    'L': { g: 'ledge', ledge: 'down' }, 'F': { g: 'fence', solid: true }, 'h': { g: 'hedge', solid: true },
    '#': { g: 'rail', solid: true, rail: true }, 'g': { g: 'railgrass', solid: true, rail: true },
    'X': { g: 'crossing', rail: true }, 'Y': { g: 'buffer', solid: true, rail: true },
    '%': { g: 'yard', grass: true }, 'D': { g: 'dock' }, 'Q': { g: 'quay', solid: true },
    'B': { g: 'grass', solid: true, building: true },
    'T': { prop: 'tree', solid: true }, 'P': { prop: 'pine', solid: true }, 'R': { prop: 'rock', solid: true },
    'I': { prop: 'sign', solid: true, sign: true }, 'i': { prop: 'routeSign', solid: true, sign: true },
    'l': { prop: 'lamp', solid: true }, 'C': { prop: 'crate', solid: true }, 'O': { prop: 'barrel', solid: true },
    'o': { prop: 'bollard', solid: true }, 'm': { prop: 'mailbox', solid: true, sign: true }, 'x': { prop: 'flowerbox', solid: true },
    'S': { prop: 'signal', solid: true }, 'A': { prop: 'statue', solid: true, sign: true }, 'a': { solid: true, sign: true },
    'n': { prop: 'anchor', solid: true, sign: true },
  };
  // Interior legend. Ground comes from the map's floor unless the char names one.
  const INDOOR = {
    '.': {}, '_': { g: 'tile' }, 'c': { g: 'carpet' }, 'W': { g: 'wall', solid: true }, ' ': { g: 'void', solid: true },
    'U': { g: 'stairsUp' }, 'V': { g: 'stairsDown' }, 'M': { g: 'doormat', exit: true },
    'K': { prop: 'bookshelf', solid: true, sign: true }, 'B': { prop: 'bed', solid: true }, 'b': { solid: true },
    't': { prop: 'table', solid: true }, 'h': { prop: 'chair' }, 'p': { prop: 'plant', solid: true },
    'v': { prop: 'tv', solid: true, sign: true }, 'Q': { prop: 'pc', solid: true, sign: true },
    'N': { prop: 'counter', solid: true, counter: true }, 'n': { prop: 'counterBlue', solid: true, counter: true },
    'H': { prop: 'healer', solid: true }, 'E': { prop: 'shelves', solid: true, sign: true }, 'Z': { prop: 'machine', solid: true, sign: true },
    'e': { prop: 'trainModel', solid: true, sign: true }, 'k': { prop: 'stove', solid: true, sign: true },
    'w': { prop: 'wheelDisplay', solid: true, sign: true }, 'G': { prop: 'globe', solid: true, sign: true },
    '1': { prop: 'eggSteam', solid: true, egg: 1 }, '2': { prop: 'eggElectric', solid: true, egg: 4 }, '3': { prop: 'eggDiesel', solid: true, egg: 7 },
    'r': { prop: 'crate', solid: true }, 'O': { prop: 'barrel', solid: true },
  };

  const maps = {};
  function define(id, def) { def.id = id; maps[id] = def; def.compiled = null; }

  function compile(m) {
    if (m.compiled) return m.compiled;
    const legend = m.indoor ? INDOOR : OUTDOOR;
    const h = m.rows.length, w = m.rows[0].length;
    const cells = new Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = m.rows[y];
      if (row.length !== w) throw new Error(`map ${m.id} row ${y} has width ${row.length}, expected ${w}`);
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        const L = legend[ch];
        if (!L) throw new Error(`map ${m.id} has unknown char '${ch}' at ${x},${y}`);
        cells[y * w + x] = Object.assign({ ch }, L, { g: L.g || (m.indoor ? (m.floor || 'wood') : null) });
      }
    }
    // Props stand on whatever ground surrounds them
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = cells[y * w + x];
      if (c.g) continue;
      const counts = {};
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const n = cells[(y + dy) * w + (x + dx)];
        if (x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h || !n || !n.g || n.solid) continue;
        counts[n.g] = (counts[n.g] || 0) + 1;
      }
      let best = m.base || 'grass', bc = 0;
      for (const k in counts) if (counts[k] > bc && k !== 'tall' && k !== 'water') { best = k; bc = counts[k]; }
      c.g = best;
    }
    // Buildings: footprint must be written as 'B'; the door cell becomes walkable
    for (const b of m.buildings || []) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        const c = cells[y * w + x];
        if (!c || c.ch !== 'B') throw new Error(`map ${m.id} building ${b.style} at ${b.x},${b.y} footprint cell ${x},${y} is '${c && c.ch}', expected 'B'`);
        c.building = b;
        c.g = m.base || 'grass';
      }
      if (b.door === null) continue;
      const dx = b.x + (b.door !== undefined ? b.door : Math.floor(b.w / 2)), dy = b.y + b.h - 1;
      const dc = cells[dy * w + dx];
      dc.solid = false; dc.door = true;
    }
    m.compiled = { w, h, cells };
    return m.compiled;
  }

  function get(id) { const m = maps[id]; if (!m) throw new Error('no map ' + id); compile(m); return m; }
  function size(m) { const c = compile(m); return { w: c.w, h: c.h }; }

  // Look up a cell, following edge connections into neighbouring maps.
  // Returns { cell, map, x, y } or null outside everything.
  function cellAt(m, x, y, depth) {
    const c = compile(m);
    if (x >= 0 && y >= 0 && x < c.w && y < c.h) return { cell: c.cells[y * c.w + x], map: m, x, y };
    if ((depth || 0) > 0) return null;
    const con = m.connections || {};
    let link = null, nx = 0, ny = 0;
    if (y < 0 && con.north) { link = con.north; const n = get(link.map); const s = size(n); nx = x - (link.offset || 0); ny = s.h + y; }
    else if (y >= c.h && con.south) { link = con.south; nx = x - (link.offset || 0); ny = y - c.h; }
    else if (x < 0 && con.west) { link = con.west; const n = get(link.map); const s = size(n); nx = s.w + x; ny = y - (link.offset || 0); }
    else if (x >= c.w && con.east) { link = con.east; nx = x - c.w; ny = y - (link.offset || 0); }
    if (!link) return null;
    const r = cellAt(get(link.map), nx, ny, 1);
    return r;
  }
  // Ground label for rendering (outside everything: the map's border filler)
  function labelAt(m, x, y) {
    const r = cellAt(m, x, y);
    if (!r) return m.indoor ? 'void' : 'grass';
    return r.cell.g;
  }

  function npcAt(state, m, x, y) {
    const list = state && state.npcs ? state.npcs : [];
    return list.find(n => n.map === m.id && !n.hidden && ((n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)));
  }

  // Can a walker move from (x,y) one step in dir? Returns {ok, ledge, warp, edge}
  const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function canStep(state, m, x, y, dir, who) {
    const [dx, dy] = DV[dir];
    const tx = x + dx, ty = y + dy;
    const r = cellAt(m, tx, ty);
    if (!r) return { ok: false };
    const c = r.cell;
    if (c.ledge) {
      if (dir !== 'down') return { ok: false };
      // jump over the ledge to the cell beyond
      const r2 = cellAt(m, tx, ty + 1);
      if (!r2 || r2.cell.solid || r2.cell.ledge || npcAt(state, r2.map, r2.x, r2.y)) return { ok: false };
      return { ok: true, ledge: true, tx, ty: ty + 1 };
    }
    if (c.solid) return { ok: false, cell: c };
    if (state && state.blocked && state.blocked(r.map, r.x, r.y)) return { ok: false };
    if (npcAt(state, r.map, r.x, r.y)) return { ok: false, npc: true };
    if (who !== 'player' && (c.door || c.exit || (r.map === m && warpAt(m, tx, ty)))) return { ok: false };
    if (who !== 'player' && r.map !== m) return { ok: false };
    if (state && state.player && who !== 'player' && state.player.map === r.map.id && ((state.player.x === r.x && state.player.y === r.y) || (state.player.tx === r.x && state.player.ty === r.y))) return { ok: false };
    return { ok: true, tx, ty, crossMap: r.map !== m ? r : null };
  }

  function warpAt(m, x, y) { return (m.warps || []).find(w => w.x === x && w.y === y); }
  function signAt(m, x, y) { return (m.signs || []).find(s => s.x === x && s.y === y); }

  CD.world = { OUTDOOR, INDOOR, maps, define, get, compile, size, cellAt, labelAt, canStep, warpAt, signAt, npcAt, DV };
})(window.CD);
