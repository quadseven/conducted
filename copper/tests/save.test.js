// Save/load round trip keeps every piece of progress; transient state is not saved.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 3 });
const CD = h.CD;
// compare across VM realms by value
const same = (a, b, msg) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), msg);
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
const res = CD.save.save();
assert(res.ok, 'save succeeds');
CD.newState();
assert.strictEqual(CD.state.name, 'ALEX');
assert(CD.save.load().ok, 'load succeeds');
assert.strictEqual(CD.state.name, 'RUBY');
assert.strictEqual(CD.state.x, 9); assert.strictEqual(CD.state.y, 20);
assert.throws(() => CD.save.deserialize('{"v":999,"state":{}}'), /newer/, 'refuses saves from the future');
assert.throws(() => CD.save.deserialize('nonsense'), 'refuses garbage');
console.log('save.test: ok');
