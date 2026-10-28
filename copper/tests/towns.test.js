// Interiors for the towns after Coal Harbor: each of Steamspring Village,
// Diesel Den, Maglev Heights, Ghost Rail Graveyard, Nuclear Station and
// Monorail Mountaintop grows a depot, a mart and a story hub. Every interior
// has collision, a doormat that warps back to the door it was entered from,
// a palette, and placeholder NPCs and props for the dialogue and quests that
// are still to come.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load();
const C = h.CD, W = C.world;

// The three interiors every town on the line carries, and the map each one is.
const CIVIC = {
  SteamspringVillage: { depot: 'SteamspringDepot', mart: 'SteamspringMart', hub: 'SteamspringMuseum' },
  DieselDen: { depot: 'DieselDepot', mart: 'DieselMart', hub: 'DieselModShop' },
  MaglevHeights: { depot: 'MaglevDepot', mart: 'MaglevMart', hub: 'MaglevInstitute' },
  GhostRailGraveyard: { depot: 'GraveyardDepot', mart: 'GraveyardMart', hub: 'GhostSanctuary' },
  NuclearStation: { depot: 'NuclearDepot', mart: 'NuclearMart', hub: 'NuclearLab' },
  MonorailMountaintop: { depot: 'SummitDepot', mart: 'SummitMart', hub: 'SummitStation' },
};
const KINDS = ['depot', 'mart', 'hub'];
const HEX = /^#[0-9a-f]{6}$/;

// The cells a walker can reach, stepping only on cells that are not solid.
function reachable(map, sx, sy) {
  const c = W.compile(map);
  const seen = new Set([sx + ',' + sy]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= c.w || ny >= c.h || seen.has(key)) continue;
      if (c.cells[ny * c.w + nx].solid) continue;
      seen.add(key); queue.push([nx, ny]);
    }
  }
  return seen;
}

// ---------- one interior per town and kind ----------
const layouts = new Set();
for (const town of Object.keys(CIVIC)) {
  const outside = W.get(town);
  for (const kind of KINDS) {
    const id = CIVIC[town][kind];
    const inside = W.get(id);
    const where = town + '/' + kind + ' (' + id + ')';

    // an interior with a palette and a name for the banner
    assert(inside.indoor, where + ' is an interior');
    assert(['wood', 'tile'].includes(inside.floor), where + ' has a floor');
    assert(HEX.test(inside.wallTint), where + ' has a wall tint');
    assert(inside.name, where + ' has a name');
    assert(inside.music, where + ' has a theme');
    layouts.add(inside.rows.join('\n'));

    // the town has a door into it, and the interior warps back to that door
    const door = (outside.warps || []).find(w => w.to === id);
    assert(door, where + ' has a door in ' + town);
    const back = (inside.warps || []).find(w => w.to === town);
    assert(back, where + ' leads back to ' + town);
    assert.deepStrictEqual([back.tx, back.ty], [door.x, door.y], where + ' returns to its own door');

    // the door cell of the town is a walkable door, and the doormat is the
    // cell the player lands on inside
    const doorCell = W.cellAt(outside, door.x, door.y).cell;
    assert(!doorCell.solid, where + ' door is walkable');
    assert(doorCell.door, where + ' door is a door');
    assert.deepStrictEqual([back.x, back.y], [door.tx, door.ty], where + ' leaves from its doormat');
    const mat = W.cellAt(inside, door.tx, door.ty).cell;
    assert(mat.exit, where + ' lands on its doormat');
    const above = W.cellAt(inside, door.tx, door.ty - 1);
    assert(above && !above.cell.solid, where + ' has room to step down onto the doormat');

    // placeholder NPCs, each one standing where the player can walk to
    const npcs = inside.npcs || [];
    assert(npcs.length >= 2, where + ' has placeholder NPCs');
    const reach = reachable(inside, door.tx, door.ty);
    for (const n of npcs) {
      assert(!W.cellAt(inside, n.x, n.y).cell.solid, where + ': ' + n.id + ' stands on open ground');
      assert(reach.has(n.x + ',' + n.y), where + ': ' + n.id + ' can be walked to');
      assert(n.text || n.talk, where + ': ' + n.id + ' has something to say');
    }
    // the depot heals and the mart sells, the way the Coal Harbor ones do
    if (kind === 'depot') assert(npcs.some(n => n.sprite === 'nurse' && n.talk), where + ' has a nurse');
    if (kind === 'mart') assert(npcs.some(n => n.sprite === 'clerk' && n.talk), where + ' has a clerk');
  }
  // every door of the town stands on the town path, so none of them is walled off
  const townReach = reachable(outside, 9, 9);
  for (const w of outside.warps || []) {
    assert(townReach.has(w.x + ',' + w.y), town + ': the door to ' + w.to + ' can be walked to');
  }
}
assert.strictEqual(layouts.size, 18, 'every interior has its own layout');

// ---------- the doors round-trip through the shared transition system ----------
for (const town of Object.keys(CIVIC)) {
  const outside = W.get(town);
  for (const kind of KINDS) {
    const id = CIVIC[town][kind];
    const door = outside.warps.find(w => w.to === id);
    while (C.engine.top() && C.engine.top() !== C.overworld.scene) C.engine.remove(C.engine.top());
    C.newState();
    C.state.flags.gotStarter = true;
    C.overworld.enterMap(town, door.x, door.y + 1, 'up', { quiet: true });
    if (C.engine.top() !== C.overworld.scene) C.engine.push(C.overworld.scene);
    h.step(2);
    h.walk('up', 1);
    h.step(40);
    assert.strictEqual(C.state.map, id, town + ' door opens onto ' + id);
    h.hold('down', 8);
    h.step(40);
    assert.strictEqual(C.state.map, town, id + ' leads back to ' + town);
    assert.strictEqual(C.state.x, door.x, id + ' brings the player back to the door');
    assert.strictEqual(C.state.y, door.y + 1, id + ' steps the player off the door');
  }
}

// Steamspring's story-home lots are reserved map space, not authored story scenes.
const STORY_HOMES = [
  { id: 'SteamspringHomeA', label: 'WEST HOUSE', sign: 'WEST HOUSE' },
  { id: 'SteamspringHomeB', label: 'EAST HOUSE', sign: 'EAST HOUSE' },
];
const steamspring = W.get('SteamspringVillage');
const steamspringReach = reachable(steamspring, 9, 9);
for (const home of STORY_HOMES) {
  const building = steamspring.buildings.find(b => b.label === home.label);
  assert(building, home.label + ' has a labeled footprint');
  assert(building.style === 'house' || building.style.startsWith('house'), home.label + ' renders as a home');
  assert.strictEqual(building.sign, home.sign, home.label + ' has a visible building sign');
  assert.strictEqual(building.w, 3, home.label + ' uses the reserved lot width');
  assert.strictEqual(building.h, 3, home.label + ' uses the reserved lot height');
  assert(Number.isInteger(building.door), home.label + ' has a door position');
  assert(steamspring.signs.some(s => s.text.startsWith(home.label)), home.label + ' has a labeled outdoor sign');
  const warp = steamspring.warps.find(w => w.to === home.id);
  assert(warp, home.label + ' has an interior entrance');
  assert(steamspringReach.has(warp.x + ',' + warp.y), home.label + ' entrance is walkable from the town path');
  const interior = W.get(home.id);
  assert(interior.indoor, home.label + ' opens onto a reserved interior');
  assert.strictEqual((interior.npcs || []).length, 0, home.label + ' has no NPCs');
  assert.strictEqual(interior.interact, undefined, home.label + ' has no story event handler');
  const back = (interior.warps || []).find(w => w.to === 'SteamspringVillage');
  assert(back, home.label + ' exits back to the village');
  assert.strictEqual(back.tx, warp.x, home.label + ' exits at its own door');
  assert.strictEqual(back.ty, warp.y, home.label + ' exits at its own door row');

  while (C.engine.top() && C.engine.top() !== C.overworld.scene) C.engine.remove(C.engine.top());
  C.newState();
  C.state.flags.gotStarter = true;
  C.overworld.enterMap('SteamspringVillage', warp.x, warp.y + 1, 'up', { quiet: true });
  if (C.engine.top() !== C.overworld.scene) C.engine.push(C.overworld.scene);
  h.step(2);
  h.walk('up', 1);
  h.step(40);
  assert.strictEqual(C.state.map, home.id, home.label + ' door opens');
  h.hold('down', 8);
  h.step(40);
  assert.strictEqual(C.state.map, 'SteamspringVillage', home.label + ' returns outside');
  assert.strictEqual(C.state.x, warp.x, home.label + ' returns to its door');
}

console.log('towns.test: ok');
