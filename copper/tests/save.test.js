// Save/load round trip keeps every piece of progress; transient state is not saved.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 3 });
const CD = h.CD;
// compare across VM realms by value
const same = (a, b, msg) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), msg);
// New progression fields survive round trips at early, mid, and late checkpoints.
for (const checkpoint of [
  { name: 'EARLY', badges: [], flags: { gotStarter: true }, techniques: [], pcBoxes: [[]] },
  { name: 'MID', badges: ['harbor'], flags: { gotStarter: true, beatRival1: true }, techniques: ['Track Clear'], pcBoxes: [[CD.train.make(4, 3)], []] },
  { name: 'LATE', badges: ['harbor', 'foundry', 'summit'], flags: { gotStarter: true, beatRival1: true, steamPunkDefeated: true }, techniques: ['Track Clear', 'River Ferry', 'Tunnel Bore'], pcBoxes: [[CD.train.make(4, 30)], [CD.train.make(7, 42)]] },
]) {
  CD.newState();
  Object.assign(CD.state, checkpoint);
  const restored = CD.save.deserialize(CD.save.serialize(CD.state));
  for (const key of ['badges', 'flags', 'techniques', 'pcBoxes']) same(restored[key], checkpoint[key], checkpoint.name + ' ' + key + ' survives');
}
// Version 1 saves have no technique or multi-box schema; migrate without losing legacy depot trains.
{
  const legacy = { v: 1, state: { name: 'LEGACY', party: [], box: [CD.train.make(4, 3)] } };
  const restored = CD.save.deserialize(JSON.stringify(legacy));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(restored.techniques)), []);
  same(restored.pcBoxes, [legacy.state.box], 'legacy depot trains seed the first PC box');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(restored.badges)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(restored.flags)), {});
}
CD.newState();
CD.overworld.enterMap('Route1', 9, 20, 'up', { quiet: true });
const s = CD.state;
s.name = 'RUBY'; s.money = 4321; s.badges = ['harbor']; s.flags.gotStarter = true; s.flags.escorted = true;
s.bag = { trainball: 3, potion: 1 };
s.party.push(CD.train.make(1, 12)); s.party.push(CD.train.make(7, 9));
s.party[0].hp = 7; s.party[0].status = 'brn'; s.party[0].moves[0].pp = 2;
s.box.push(CD.train.make(4, 3));
s.dex.seen[4] = true; s.dex.caught[1] = true; s.trainers.r1lass = true;
const before = JSON.parse(JSON.stringify(s));
const text = CD.save.serialize(s);
assert(!/"stats"/.test(text), 'derived stats are not stored');
const back = CD.save.deserialize(text);
for (const k of ['name', 'money', 'badges', 'flags', 'bag', 'dex', 'trainers', 'map']) same(back[k], before[k], k + ' survives');
assert.strictEqual(back.party.length, 2);
same(back.party[0].stats, before.party[0].stats, 'stats recompute identically');
assert.strictEqual(back.party[0].hp, 7); assert.strictEqual(back.party[0].status, 'brn'); assert.strictEqual(back.party[0].moves[0].pp, 2);
same(back.party[0].iv, before.party[0].iv, 'IVs survive');
assert.strictEqual(back.box[0].id, 4, 'depot storage survives');
// through the storage layer
s.techniques = ['Track Clear', 'River Ferry']; s.pcBoxes = [[CD.train.make(7, 8)], []];
const res = CD.save.save();
assert(res.ok, 'save succeeds');
CD.newState();
assert.strictEqual(CD.state.name, 'ALEX');
assert(CD.save.load().ok, 'load succeeds');
assert.strictEqual(CD.state.name, 'RUBY');
same(CD.state.techniques, ['Track Clear', 'River Ferry'], 'techniques survive storage reload');
same(CD.state.pcBoxes.map(box => box.map(t => t.id)), [[7], []], 'PC boxes survive storage reload');
assert.strictEqual(CD.state.x, 9); assert.strictEqual(CD.state.y, 20);
assert.throws(() => CD.save.deserialize('{"v":999,"state":{}}'), /newer/, 'refuses saves from the future');
assert.throws(() => CD.save.deserialize('nonsense'), 'refuses garbage');
// Saves are validated before storage is replaced and can live in separate slots.
const originalSlot = CD.save.serialize(CD.state);
assert(CD.save.save(2).ok, 'second slot saves');
CD.state.name = 'CHANGED';
assert(CD.save.save(3).ok, 'third slot saves');
assert.deepStrictEqual(CD.save.slots().map(s => s.slot), [1, 2, 3]);
assert(CD.save.load(2).ok);
assert.strictEqual(CD.state.name, 'RUBY');
assert(CD.save.remove(3).ok);
assert(!CD.save.slotExists(3));
assert(CD.save.save(2).ok, 'replacement save succeeds');
h.store.set(CD.save.slotKey(2), '{broken');
assert(CD.save.load(2).ok, 'damaged current save recovers from backup');
assert.strictEqual(CD.state.name, 'RUBY');
const stable = h.store.get(CD.save.slotKey(2));
CD.state.party = null;
assert(!CD.save.save(2).ok, 'invalid state is rejected');
assert.strictEqual(h.store.get(CD.save.slotKey(2)), stable, 'failed save leaves prior data intact');
CD.state = CD.save.deserialize(originalSlot);
// the title screen offers CONTINUE and drops you back where you saved
{
  const g = H.load({ seed: 4 });
  const G = g.CD;
  G.newState(); G.state.name = 'JUNE'; G.state.party.push(G.train.make(1, 7));
  G.overworld.enterMap('CoalHarbor', 12, 20, 'left', { quiet: true });
  assert(G.save.save().ok);
  G.newState();
  G.engine.spawn(G.main.flow(), 'flow');
  g.step(10); g.press('start', 30);
  assert.strictEqual(g.top().constructor.name, 'Choice');
  assert.strictEqual(g.top().items[0], 'CONTINUE');
  g.press('a', 30);                 // CONTINUE
  g.until(() => g.top().constructor.name === 'Choice', 300);
  g.press('a', 60);                 // YES
  assert(g.until(() => g.top() === G.overworld.scene, 600));
  assert.strictEqual(G.state.name, 'JUNE');
  assert.strictEqual(G.state.map, 'CoalHarbor');
  assert.strictEqual(G.ow.player.x, 12); assert.strictEqual(G.ow.player.y, 20);
  assert.strictEqual(G.state.party[0].level, 7);
}
console.log('save.test: ok');
