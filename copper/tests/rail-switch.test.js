// Rail-switch puzzles: every gym has one between its door and its Station
// Master. With every switch in its starting position the leader cannot be
// reached; the gym's recorded switch order opens a walkable path to the
// leader; the player can never trap themselves; stepping onto a switch in the
// game flips its track tiles; and the switch state survives a save and load.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 33 });
const C = h.CD;
const RS = C.railSwitch;

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const key = (x, y) => x + ',' + y;

assert(RS, 'the rail-switch module is loaded');

// Everything a search needs about one gym's floor.
function floorOf(g) {
  const gym = C.world.get(g.map);
  const c = C.world.compile(gym);
  const mat = gym.warps.find(w => w.to === g.town);
  const npcs = new Set(gym.npcs.map(n => key(n.x, n.y)));
  const goals = new Set();
  for (const [dx, dy] of DIRS) {
    const x = g.leader.x + dx, y = g.leader.y + dy;
    if (x >= 0 && y >= 0 && x < c.w && y < c.h && !c.cells[y * c.w + x].solid) goals.add(key(x, y));
  }
  const solid = (x, y) => x < 0 || y < 0 || x >= c.w || y >= c.h || c.cells[y * c.w + x].solid;
  return { gym, c, mat, npcs, goals, solid };
}

// Plain flood fill from (sx, sy) under a fixed switch list. Switch tiles in
// `avoid` count as walls, so a walk to one switch never throws another.
function reach(g, f, list, sx, sy, opts) {
  opts = opts || {};
  const shut = RS.blockedSet(g.puzzle, list);
  const seen = new Set([key(sx, sy)]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (seen.has(k) || f.solid(nx, ny) || shut.has(k)) continue;
      if (opts.npcs && f.npcs.has(k)) continue;
      if (opts.avoid && opts.avoid.has(k)) continue;
      seen.add(k); queue.push([nx, ny]);
    }
  }
  return seen;
}

// Search over (tile, switch list) the way the game plays: stepping onto a
// switch tile throws it. Crew stand still, so their tiles are walls here.
function stateSearch(g, f, sx, sy, list0, stop) {
  const idx = new Map(g.puzzle.switches.map((sw, i) => [key(sw.x, sw.y), i]));
  const start = [sx, sy, list0.slice()];
  const id = ([x, y, l]) => key(x, y) + '|' + l.map(b => (b ? 1 : 0)).join('');
  const seen = new Map([[id(start), 0]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    const [x, y, l] = cur;
    if (stop && stop(x, y, l)) return { found: cur, seen };
    const shut = RS.blockedSet(g.puzzle, l);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (f.solid(nx, ny) || shut.has(k) || f.npcs.has(k)) continue;
      const nl = l.slice();
      if (idx.has(k)) nl[idx.get(k)] = !nl[idx.get(k)];
      const next = [nx, ny, nl];
      const nid = id(next);
      if (seen.has(nid)) continue;
      seen.set(nid, seen.get(id(cur)) + (idx.has(k) ? 1 : 0));
      queue.push(next);
    }
  }
  return { found: null, seen };
}

// ---------- every gym has a well-formed puzzle ----------
for (const g of C.gyms.LIST) {
  const p = g.puzzle;
  assert(p && Array.isArray(p.tracks) && Array.isArray(p.switches), `${g.map} has a rail-switch puzzle`);
  assert(p.tracks.length > 0 && p.switches.length >= 2, `${g.map} has track tiles and at least two switches`);
  const f = floorOf(g);
  const used = new Set();
  for (const [x, y] of p.tracks.concat(p.switches.map(s => [s.x, s.y]))) {
    const k = key(x, y);
    assert(!used.has(k), `${g.map}: one puzzle piece per tile (${k})`);
    used.add(k);
    assert(!f.solid(x, y), `${g.map}: puzzle tile ${k} stands on open floor`);
    assert(!f.npcs.has(k), `${g.map}: nobody stands on puzzle tile ${k}`);
    assert(k !== key(f.mat.x, f.mat.y), `${g.map}: the doormat is not a puzzle tile`);
  }
  const tracks = new Set(p.tracks.map(([x, y]) => key(x, y)));
  for (const sw of p.switches) {
    assert(sw.flips.length > 0, `${g.map}: switch at ${key(sw.x, sw.y)} flips something`);
    for (const [x, y] of sw.flips) assert(tracks.has(key(x, y)), `${g.map}: switch flips a listed track tile (${key(x, y)})`);
  }
  assert.strictEqual(RS.gymFor(g.map), g, `${g.map} looks up its own puzzle`);
}

// ---------- criterion 1: starting position keeps the leader out of reach ----------
// Crew are ignored here, so a gap left only because someone stands in it still fails.
for (const g of C.gyms.LIST) {
  const f = floorOf(g);
  const start = g.puzzle.switches.map(() => false);
  const seen = reach(g, f, start, f.mat.x, f.mat.y);
  for (const goal of f.goals) assert(!seen.has(goal), `${g.map}: ${g.leader.name} is unreachable with every switch unthrown (reached ${goal})`);
  // and the in-game check agrees: every track tile starts blocked
  for (const [x, y] of g.puzzle.tracks) assert(RS.blocked(C.freshState(), g.map, x, y), `${g.map}: track ${key(x, y)} starts blocked`);
}

// ---------- criterion 2: the solved sequence opens a path to the leader ----------
for (const g of C.gyms.LIST) {
  const f = floorOf(g);
  const p = g.puzzle;
  assert(Array.isArray(p.solution) && p.solution.length > 0, `${g.map} records a solution`);
  const list = p.switches.map(() => false);
  let at = [f.mat.x, f.mat.y];
  for (const i of p.solution) {
    const sw = p.switches[i];
    const others = new Set(p.switches.filter(s => s !== sw).map(s => key(s.x, s.y)));
    const seen = reach(g, f, list, at[0], at[1], { npcs: true, avoid: others });
    assert(seen.has(key(sw.x, sw.y)), `${g.map}: switch ${i} at ${key(sw.x, sw.y)} is reachable when its turn comes`);
    list[i] = !list[i];
    at = [sw.x, sw.y];
  }
  const seen = reach(g, f, list, at[0], at[1], { npcs: true });
  assert([...f.goals].some(k => seen.has(k)), `${g.map}: the solution opens a walkable path to ${g.leader.name}`);
  // the doormat reaches the leader too, so walking back out and in again works
  const fromMat = reach(g, f, list, f.mat.x, f.mat.y, { npcs: true });
  assert([...f.goals].some(k => fromMat.has(k)), `${g.map}: once solved, the doormat connects to ${g.leader.name}`);
}

// ---------- it is a puzzle: one switch never does it, and nobody gets stuck ----------
for (const g of C.gyms.LIST) {
  const f = floorOf(g);
  const start = g.puzzle.switches.map(() => false);
  const won = stateSearch(g, f, f.mat.x, f.mat.y, start, (x, y) => f.goals.has(key(x, y)));
  assert(won.found, `${g.map}: the puzzle can be solved from the door`);
  const all = stateSearch(g, f, f.mat.x, f.mat.y, start, null).seen;
  let fewest = Infinity;
  for (const [id, presses] of all) if (f.goals.has(id.split('|')[0])) fewest = Math.min(fewest, presses);
  assert(fewest >= 2, `${g.map}: reaching ${g.leader.name} takes at least two switch throws (took ${fewest})`);
  // from anywhere the player can get to, the way back to the door stays open
  for (const id of all.keys()) {
    const [pos, bits] = id.split('|');
    const [x, y] = pos.split(',').map(Number);
    const back = stateSearch(g, f, x, y, bits.split('').map(b => b === '1'), (bx, by) => bx === f.mat.x && by === f.mat.y);
    assert(back.found, `${g.map}: the player at ${pos} with switches ${bits} can still walk out`);
  }
}

// ---------- in the game: a switch flips its tracks and the tracks block movement ----------
{
  const g = C.gyms.byBadge('harbor');
  const p = g.puzzle;
  C.newState();
  C.state.flags.gotStarter = true;
  C.state.party.push(C.train.make(9, 60));
  // stand just below the lower gate's middle tile, which is blocked
  C.overworld.enterMap(g.map, 5, 10, 'up', { quiet: true });
  C.engine.push(C.overworld.scene);
  h.step(2);
  assert(RS.blocked(C.state, g.map, 5, 9), 'the lower gate starts blocked');
  assert.strictEqual(h.walk('up', 1), 0, 'a blocked track tile stops the player');
  assert.strictEqual(C.ow.player.y, 10, 'the player stays put');
  // walk onto switch 0 at (3, 11): left 2, down 1
  h.walk('left', 2); h.walk('down', 1);
  h.settle();
  assert.deepStrictEqual([C.ow.player.x, C.ow.player.y], [p.switches[0].x, p.switches[0].y], 'the player stands on switch 0');
  assert.deepStrictEqual(Array.from(C.state.puzzles[g.badge]), [true, false, false], 'stepping on switch 0 throws it');
  assert(!RS.blocked(C.state, g.map, 5, 9), 'switch 0 opens the lower gate');
  // back to (5, 10) and through the gate
  h.walk('up', 1); h.walk('right', 2);
  assert.strictEqual(h.walk('up', 1), 1, 'an open track tile lets the player through');
  assert.strictEqual(C.ow.player.y, 9, 'the player stands on the open track');
  // stepping off and back on switch 0 unthrows it
  C.overworld.enterMap(g.map, 3, 12, 'up', { quiet: true });
  h.step(2);
  h.walk('up', 1);
  h.settle();
  assert.strictEqual(C.state.puzzles[g.badge][0], false, 'stepping on a thrown switch unthrows it');
  assert(RS.blocked(C.state, g.map, 5, 9), 'and the lower gate shuts again');
  h.draw();
  while (C.engine.top() && C.engine.top() !== C.overworld.scene) C.engine.remove(C.engine.top());
}

// ---------- criterion 3: switch state survives a save and load ----------
{
  C.newState();
  C.state.party.push(C.train.make(9, 20));
  C.state.map = 'HarborGym';
  C.ow.player.x = 5; C.ow.player.y = 12; C.ow.player.dir = 'up';
  RS.press(C.state, 'HarborGym', 0);
  RS.press(C.state, 'HarborGym', 1);
  RS.press(C.state, 'VoltageGym', 2);
  const before = JSON.parse(JSON.stringify(C.state.puzzles));
  assert.deepStrictEqual(before.harbor, [true, true, false]);
  assert(!RS.blocked(C.state, 'HarborGym', 5, 3), 'the solved harbor gym has its upper gate open');
  const res = C.save.save(2);
  assert(res.ok, 'saved: ' + res.error);
  C.newState();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.state.puzzles)), {}, 'a new game has no thrown switches');
  assert(RS.blocked(C.state, 'HarborGym', 5, 3), 'and the harbor gate is shut');
  const back = C.save.load(2);
  assert(back.ok, 'loaded: ' + back.error);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.state.puzzles)), before, 'every gym keeps its switch state through save and load');
  assert(!RS.blocked(C.state, 'HarborGym', 5, 3), 'the solved harbor gym is still solved after loading');
  assert(!RS.blocked(C.state, 'HarborGym', 5, 9), 'and its lower gate is still open');
  assert(RS.blocked(C.state, 'VoltageGym', 3, 7) && !RS.blocked(C.state, 'VoltageGym', 7, 7), 'a part-solved gym keeps its part');

  // a save from before puzzles existed loads with every switch unthrown
  const old = JSON.parse(C.save.serialize(C.state));
  delete old.state.puzzles;
  const loaded = C.save.deserialize(JSON.stringify(old));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(loaded.puzzles)), {}, 'an older save starts every puzzle fresh');
  // a damaged puzzles field does not break loading either
  old.state.puzzles = [1, 2, 3];
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.save.deserialize(JSON.stringify(old)).puzzles)), {}, 'a malformed puzzles field is reset');
}

console.log('rail-switch.test: ok');
