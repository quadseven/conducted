// Towns and progression: the money gate, atomic purchases, depot healing and
// storage, a mart visit, evolution (and cancelling it), and the Traindex.
'use strict';
const assert = require('assert');
const H = require('./harness.js');

function setup(seed, map, x, y, dir) {
  const h = H.load({ seed });
  const C = h.CD;
  C.newState();
  C.overworld.enterMap(map, x, y, dir || 'up', { quiet: true });
  C.engine.push(C.overworld.scene);
  h.step(2);
  return { h, C };
}
const topName = h => h.top() && h.top().constructor.name;

// ---- money and purchases ----
{
  const { C } = setup(1, 'HarborMart', 3, 6);
  C.state.money = 500;
  assert(!C.town.spend(501), 'cannot overspend'); assert.strictEqual(C.state.money, 500);
  assert(!C.town.spend(-5), 'negative spends refused');
  assert(!C.town.buy('potion', 2), 'not enough for two potions');
  assert.strictEqual(C.state.money, 500); assert(!C.state.bag.potion, 'a failed purchase changes nothing');
  assert(C.town.buy('potion', 1)); assert.strictEqual(C.state.money, 200); assert.strictEqual(C.state.bag.potion, 1);
  assert(C.town.sell('potion', 1)); assert.strictEqual(C.state.money, 350); assert(!C.state.bag.potion);
  assert(!C.town.sell('pass', 1), 'key items cannot be sold');
}
// ---- the mart counter: buy two TRAINBALLS ----
{
  const { h, C } = setup(2, 'HarborMart', 2, 3, 'left');
  C.state.money = 1000;
  h.press('a', 4);
  assert(h.until(() => topName(h) === 'Choice', 600, 'a'), 'BUY/SELL/QUIT');
  h.press('a', 4);                                            // BUY
  assert(h.until(() => topName(h) === 'ShopList', 200));
  h.press('a', 4);                                            // TRAINBALL
  assert(h.until(() => topName(h) === 'Qty', 200));
  h.press('up', 2); h.press('a', 4);                          // 2
  assert(h.until(() => topName(h) === 'Choice', 600));
  h.press('a', 4);                                            // OK
  h.until(() => topName(h) === 'ShopList', 600, 'a');
  assert.strictEqual(C.state.bag.trainball, 2); assert.strictEqual(C.state.money, 600);
  h.press('b', 4); h.until(() => topName(h) === 'Choice', 600, 'a'); h.press('down', 2); h.press('down', 2); h.press('a', 4);
  assert(h.settle(), 'left the counter');
}
// ---- depot: heal and set the return point ----
{
  const { h, C } = setup(3, 'HarborDepot', 5, 3);
  const t = C.train.make(1, 10); t.hp = 3; t.status = 'psn'; t.moves[0].pp = 0;
  C.state.party.push(t);
  h.press('a', 4);
  assert(h.until(() => topName(h) === 'Choice', 600, 'a'));
  h.press('a', 4);
  assert(h.settle(6000));
  assert.strictEqual(t.hp, t.stats.hp); assert.strictEqual(t.status, null); assert.strictEqual(t.moves[0].pp, t.moves[0].max);
  assert.strictEqual(C.state.lastHeal.map, 'HarborDepot', 'blackouts now return here');
}
// ---- depot storage: deposit then withdraw ----
{
  const { h, C } = setup(4, 'HarborDepot', 8, 2);
  C.state.party.push(C.train.make(1, 10), C.train.make(58, 4));
  h.press('up', 4); h.press('a', 4);   // face the terminal at (9,1)? it is up-right; walk under it first
  C.overworld.enterMap('HarborDepot', 9, 2, 'up', { quiet: true });
  h.press('a', 4);
  assert(h.until(() => topName(h) === 'Choice', 600, 'a'), 'storage menu');
  h.press('down', 2); h.press('a', 6);                        // DEPOSIT
  assert(h.until(() => topName(h) === 'PartyList', 300));
  h.press('down', 2); h.press('a', 6);                        // the second train
  h.until(() => topName(h) === 'Choice', 600, 'a');
  assert.strictEqual(C.state.party.length, 1); assert.strictEqual(C.state.box.length, 1);
  h.press('a', 6);                                            // WITHDRAW
  assert(h.until(() => topName(h) === 'BoxList', 300));
  h.press('a', 6);
  h.until(() => topName(h) === 'Choice', 600, 'a');
  assert.strictEqual(C.state.party.length, 2); assert.strictEqual(C.state.box.length, 0);
}
// ---- evolution after a battle, and cancelling one with B ----
for (const cancel of [false, true]) {
  const { h, C } = setup(cancel ? 6 : 5, 'Route1', 4, 3, 'down');
  const t = C.train.make(1, 15);
  t.exp = C.train.expAt('mslow', 16) - 5;
  t.moves = [C.train.moveSlot('Steam Jet')];   // mashing A should end the battle quickly
  C.state.party.push(t);
  let done = false;
  C.overworld.script(function* () { yield* C.encounters.wildBattle(10, 5, 'grass'); done = true; }(), 'evo');
  let frames = 0;
  while (!done && frames++ < 30000) {
    const evolving = h.top() && h.top().constructor.name === 'Object' && C.audio.current === 'evolve';
    if (evolving) h.press(cancel ? 'b' : 'a', 1);
    else if (frames % 5 === 0) h.press('a', 1); else h.step(1);
  }
  assert(done, 'battle and evolution finished');
  assert.strictEqual(t.level, 16);
  if (cancel) assert.strictEqual(t.id, 1, 'B stops the evolution');
  else { assert.strictEqual(t.id, 2, 'Steamini became Steamore'); assert(C.state.dex.caught[2], 'new form registered'); }
}
// ---- the Traindex ----
{
  const { h, C } = setup(7, 'PistonTown', 5, 6);
  C.state.flags.gotDex = true; C.state.party.push(C.train.make(1, 5));
  C.state.dex.seen[1] = C.state.dex.seen[10] = true; C.state.dex.caught[1] = true;
  assert.strictEqual(C.dexScreen.counts().seen, 2);
  C.overworld.script(C.dexScreen.open(), 'dex');
  h.step(3);
  assert.strictEqual(topName(h), 'DexList');
  h.draw();
  h.press('a', 4);
  h.draw();
  h.press('a', 4); h.press('down', 2); h.press('down', 2);
  h.press('b', 4); h.press('b', 4);
  assert(h.settle(), 'closed the Traindex');
}
console.log('progress.test: ok');
