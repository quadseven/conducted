// Map integrity: every map compiles, warps land on real walkable cells and pair up,
// connections are mutual, NPCs stand on open ground, and collision rules hold.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load();
const CD = h.CD, W = CD.world;

const ids = Object.keys(W.maps);
assert(ids.length >= 11, 'maps are defined');
for (const id of ids) {
  const m = W.get(id);
  const { w, h: hh } = W.size(m);
  for (const wp of m.warps || []) {
    assert(W.maps[wp.to], `${id} warp to unknown map ${wp.to}`);
    const dest = W.get(wp.to);
    const r = W.cellAt(dest, wp.tx, wp.ty);
    assert(r && r.map === dest, `${id} warp lands inside ${wp.to}`);
    assert(!r.cell.solid, `${id} -> ${wp.to} ${wp.tx},${wp.ty} is not a wall`);
    const src = W.cellAt(m, wp.x, wp.y).cell;
    assert(!src.solid, `${id} warp cell ${wp.x},${wp.y} is walkable`);
    // reciprocal: the destination has a warp back to this map
    const back = (dest.warps || []).find(b => b.to === id);
    assert(back, `${wp.to} has a warp back to ${id}`);
    // arriving must not immediately re-trigger: the landing cell's own warp leads back only when stepped onto again
    if (back.x === wp.tx && back.y === wp.ty) {
      const land = W.cellAt(dest, wp.tx, wp.ty).cell;
      // a door landing is safe because arrival steps the player off the door
      assert(land.exit || back.any || land.door, `${wp.to} landing ${wp.tx},${wp.ty} cannot bounce the player straight back`);
      if (land.door) assert(!W.cellAt(dest, wp.tx, wp.ty + 1).cell.solid, `${wp.to} door ${wp.tx},${wp.ty} has room to step out`);
    }
  }
  // doors on buildings have a warp
  for (const b of m.buildings || []) {
    if (b.door === null) continue;
    const dx = b.x + (b.door !== undefined ? b.door : Math.floor(b.w / 2)), dy = b.y + b.h - 1;
    assert(W.warpAt(m, dx, dy), `${id} ${b.style} door at ${dx},${dy} has a warp`);
  }
  for (const n of m.npcs || []) {
    const c = W.cellAt(m, n.x, n.y);
    assert(c && !c.cell.solid, `${id} npc ${n.id} stands on open ground at ${n.x},${n.y}`);
  }
  for (const t of m.triggers || []) assert(!W.cellAt(m, t.x, t.y).cell.solid, `${id} trigger ${t.x},${t.y} is reachable`);
  for (const s of m.signs || []) {
    const c = W.cellAt(m, s.x, s.y).cell;
    assert(c.solid, `${id} sign at ${s.x},${s.y} is on a solid cell (it is read by facing it)`);
  }
  const con = m.connections || {};
  const opp = { north: 'south', south: 'north', east: 'west', west: 'east' };
  for (const side in con) {
    const other = W.get(con[side].map);
    const back = (other.connections || {})[opp[side]];
    assert(back && back.map === id, `${id} ${side} -> ${con[side].map} is mutual`);
    assert.strictEqual((back.offset || 0) + (con[side].offset || 0), 0, `${id} ${side} offsets mirror`);
  }
}

// collision and ledges
const st = { npcs: [] };
const r1 = W.get('Route1');
assert(!W.canStep(st, r1, 2, 7, 'left').ok, 'trees block');
assert(!W.canStep(st, r1, 3, 5, 'down').ok || W.canStep(st, r1, 3, 5, 'down').ledge, 'ledge below');
const led = W.canStep(st, r1, 3, 5, 'down');
assert(led.ok && led.ledge && led.ty === 7, 'jumping a ledge lands two rows down');
assert(!W.canStep(st, r1, 3, 7, 'up').ok, 'ledges cannot be climbed');
assert(!W.canStep(st, r1, 3, 12, 'down').ok, 'plain rail blocks');
assert(W.canStep(st, r1, 9, 12, 'down').ok, 'level crossing is walkable');
const pt = W.get('PistonTown');
const cross = W.canStep(st, pt, 9, 0, 'up', 'player');
assert(cross.ok && cross.crossMap && cross.crossMap.map.id === 'Route1', 'town edge connects into Route 1');
assert.strictEqual(cross.crossMap.y, W.size(r1).h - 1, 'arrives on the bottom row of Route 1');
assert(!W.canStep(st, pt, 3, 5, 'up').ok, 'house walls block');
assert(W.canStep(st, pt, 4, 5, 'up', 'player').ok, 'house door is walkable');
// NPCs never walk through doors or off their map
assert(!W.canStep(st, pt, 4, 5, 'up', 'npc').ok, 'npcs do not enter doors');
console.log('world.test: ok (' + ids.length + ' maps)');
// the site's main page runs the same scripts as copper/index.html, in the same order
{
  const fs = require('fs'), path = require('path');
  const root = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const own = H.scripts().map(s => 'copper/' + s);
  const main = [];
  let i = 0;
  while ((i = root.indexOf('<script', i)) >= 0) { const e = root.indexOf('>', i), tag = root.slice(i, e), a = tag.indexOf('src="'); if (a >= 0) main.push(tag.slice(a + 5, tag.indexOf('"', a + 5))); i = e; }
  assert.strictEqual(main.join('\n'), own.join('\n'), 'index.html and copper/index.html load the same scripts');
}
