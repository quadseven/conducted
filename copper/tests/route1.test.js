'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 23 });
const C = h.CD;
C.newState();
C.state.party.push(C.train.make(9, 30));
C.overworld.enterMap('Route1', 4, 3, 'down', { quiet: true });
C.engine.push(C.overworld.scene);
h.step(2);

const route = C.world.get('Route1');
const table = route.encounters && route.encounters.grass;
assert(table, 'Route 1 tall grass has a configured encounter table');
assert.deepStrictEqual(Array.from(table.slots, slot => slot[0]), [10, 58, 13, 28, 22, 132], 'encounters use only configured species');
assert(table.slots.every(slot => slot[1] >= 2 && slot[2] <= 5), 'encounter levels fit the opening route');
for (let i = 0; i < 30; i++) {
  const result = C.encounters.roll(table);
  assert(table.slots.some(slot => slot[0] === result.id && result.level >= slot[1] && result.level <= slot[2]), 'encounter roll stays in configured slots and levels');
}
assert.strictEqual(C.encounters.check(route, { g: 'path' }), false, 'path tiles do not spawn encounters');
assert(!C.world.canStep({ npcs: [] }, route, 1, 0, 'up').ok, 'solid route border blocks walking out of bounds');
assert(!C.world.canStep({ npcs: [] }, route, 8, 0, 'up').ok, 'route edge cannot be jumped beyond the map');

function battleByInteraction(npcId, x, y, dir, expectedPrize) {
  const npc = C.ow.npcs.find(n => n.id === npcId);
  assert(npc && npc.trainer, `${npcId} is a route trainer`);
  assert(npc.talk, `${npcId} is wired for interaction`);
  const money = C.state.money;
  C.ow.player.x = x; C.ow.player.y = y; C.ow.player.dir = dir;
  C.overworld.interact();
  let frames = 0;
  while (C.ow.locked && frames < 20000) {
    if (frames % 5 === 0) h.press('a', 1); else h.step(1);
    frames++;
  }
  assert(!C.ow.locked, `${npcId} interaction battle completes`);
  assert(C.state.trainers[npc.trainer.id], `${npcId} is marked defeated`);
  assert.strictEqual(C.state.money - money, expectedPrize, `${npcId} pays the configured prize`);
}

battleByInteraction('r1youngster', 4, 8, 'right', 64);
battleByInteraction('r1lass', 16, 17, 'left', 90);
console.log('route1.test: ok');
