// Evolution tests in Copper Version: dialogue, B-cancel, animation, and save persistence.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 7 });
const CD = h.CD, T = CD.train;

// 1. Level check
const t15 = T.make(1, 15);
assert.strictEqual(T.evolveTarget(t15), null, 'Lv15 cannot evolve yet');
const t16 = T.make(1, 16);
assert.strictEqual(T.evolveTarget(t16), 2, 'Lv16 Steamini evolves to Steamore');

// 2. Cancellation with B button
{
  const g = H.load({ seed: 8 });
  const C = g.CD;
  C.newState();
  const train = C.train.make(1, 16);
  C.state.party.push(train);

  let finished = false;
  let result = null;
  C.engine.spawn((function* () {
    result = yield* C.evolution.run(train, 2, false);
    finished = true;
  })());

  // Step until evolution begins and B can cancel
  for (let f = 0; f < 300 && !finished; f++) {
    g.press('b', 1);
  }

  assert.strictEqual(result, false, 'Pressing B cancels evolution');
  assert.strictEqual(train.id, 1, 'Train remains Steamini');
}

// 3. Completing evolution updates train data and persists in save
{
  const g = H.load({ seed: 9 });
  const C = g.CD;
  C.newState();
  const train = C.train.make(1, 16);
  const hpBefore = train.stats.hp;
  C.state.party.push(train);

  let finished = false;
  let result = null;
  C.engine.spawn((function* () {
    result = yield* C.evolution.run(train, 2, false);
    finished = true;
  })());

  // Mash A through dialogue and let animation complete without B
  for (let f = 0; f < 2000 && !finished; f++) {
    if (f % 4 === 0) g.press('a', 1);
    else g.step(1);
  }

  assert.strictEqual(result, true, 'Evolution completes successfully');
  assert.strictEqual(train.id, 2, 'Train evolved into Steamore');
  assert.ok(train.stats.hp > hpBefore, 'Stats increased after evolution');
  assert.strictEqual(C.state.dex.seen[2], true, 'Seen in Dex');
  assert.strictEqual(C.state.dex.caught[2], true, 'Caught in Dex');

  // Evolution persists in save data
  assert(C.save.save().ok, 'Game saves with evolved train');
  C.newState();
  assert(C.save.load().ok, 'Game loads');
  assert.strictEqual(C.state.party[0].id, 2, 'Loaded save maintains evolved train');
}

console.log('evolution.test: ok');
