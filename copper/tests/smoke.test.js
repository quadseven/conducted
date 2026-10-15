// Smoke tests for the two loops a session spends all its time in: moving
// through the overworld, and fighting. Every case here plays the game for real
// -- the engine runs headless, buttons are pressed, and the assertions read
// state the way a player would notice it (which map you are standing on, what
// you have in the bag, whether the screen came back to you). They are
// deliberately end-to-end and deliberately few: the point is to catch a
// broken loop in one run, not to re-check the rules that battle.test.js and
// world.test.js already cover in detail.
//
// Loop coverage: entering a building, crossing a map connection, winning a
// battle, losing a battle, and saving then loading.
'use strict';
const assert = require('assert');
const H = require('./harness.js');

// Start a fresh game with one starter train, standing on `map` at (x, y).
function boot(seed, map, x, y, dir) {
  const h = H.load({ seed });
  const CD = h.CD;
  CD.newState();
  CD.state.party.push(CD.train.make(1, 12));
  CD.overworld.enterMap(map, x, y, dir || 'up', { quiet: true });
  CD.engine.push(CD.overworld.scene);
  h.step(2);
  return { h, CD };
}

// Hold a direction until the walk is over, then let any scripted map change finish.
function walkSettled(h, dir, tiles) {
  h.walk(dir, tiles === undefined ? 1 : tiles);
  h.step(60);
}

// Mash A until every running script has finished (dialogue, fades, battles).
function mashOut(h, limit) {
  const frames = limit || 40000;
  let n = 0;
  while ((h.CD.ow.locked || h.CD.engine.top() !== h.CD.overworld.scene) && n < frames) {
    if (n % 5 === 0) h.press('a', 1); else h.step(1);
    n++;
  }
  return n;
}

// ---- entering a building: walk up to the door, step inside, come back out ----
{
  const { h, CD } = boot(11, 'PistonTown', 4, 5);
  assert.strictEqual(CD.state.map, 'PistonTown', 'starts on the street');

  walkSettled(h, 'up');
  assert.strictEqual(CD.state.map, 'PlayerHouse1F', 'walking into the door enters the house');
  assert.deepStrictEqual([CD.ow.player.x, CD.ow.player.y], [3, 7], 'lands inside the house on its entry mat');
  assert.strictEqual(CD.ow.player.dir, 'up', 'keeps facing the way you walked in');
  assert.strictEqual(CD.ow.locked, 0, 'the door script releases the controls');

  walkSettled(h, 'down');
  assert.strictEqual(CD.state.map, 'PistonTown', 'walking back out returns to the street');
  assert.deepStrictEqual([CD.ow.player.x, CD.ow.player.y], [4, 5], 'lands on the doorstep, not inside the wall');
  assert.strictEqual(CD.state.x, 4, 'saved position follows the player back out');
  assert.strictEqual(CD.state.y, 5);
}

// ---- map-to-map transitions: cross a connection edge and cross it back ----
{
  const { h, CD } = boot(12, 'PistonTown', 9, 0);
  assert.strictEqual(CD.state.map, 'PistonTown', 'starts at the north gate');

  walkSettled(h, 'up');
  assert.strictEqual(CD.state.map, 'Route1', 'the north edge leads into Route 1');
  assert.deepStrictEqual([CD.ow.player.x, CD.ow.player.y], [9, 31], 'arrives on the matching tile of Route 1');
  assert.strictEqual(CD.state.x, 9, 'the connection keeps the saved position in step');
  assert.strictEqual(CD.state.y, 31);

  walkSettled(h, 'down');
  assert.strictEqual(CD.state.map, 'PistonTown', 'the south edge leads back into town');
  assert.deepStrictEqual([CD.ow.player.x, CD.ow.player.y], [9, 0], 'the return trip is its own mirror');
}

// ---- winning a battle: fight it out, collect the reward, keep playing ----
{
  const { h, CD } = boot(21, 'Route1', 4, 3, 'down');
  const starter = CD.state.party[0];
  const expBefore = starter.exp;
  let result = null;
  CD.overworld.script(function* () {
    result = yield* CD.encounters.wildBattle(10, 3, 'grass');
  }(), 'smoke-win');
  mashOut(h);
  assert.strictEqual(result, 'win', 'the battle ends in a win');
  assert.strictEqual(CD.state.map, 'Route1', 'a won battle puts you back on the route');
  assert.strictEqual(CD.ow.locked, 0, 'the controls come back after winning');
  assert(starter.exp > expBefore, 'the winning train earns EXP');
  assert.strictEqual(CD.state.dex.seen[10], true, 'the defeated train is registered as seen');
  assert(starter.hp > 0, 'the winner is still standing');
}

// ---- losing a battle: black out, wake up at the last depot, trains healed ----
{
  const { h, CD } = boot(22, 'Route1', 4, 3, 'down');
  const starter = CD.state.party[0];
  CD.state.money = 800;
  const heal = CD.state.lastHeal;
  let result = null;
  // Species 150 at level 60 against a level 12 starter: the loss is not in doubt.
  CD.overworld.script(function* () {
    result = yield* CD.encounters.wildBattle(150, 60, 'grass');
  }(), 'smoke-lose');
  mashOut(h);
  assert.strictEqual(result, 'lose', 'the battle ends in a loss');
  assert.strictEqual(CD.state.map, heal.map, 'blacking out returns you to the last place you healed');
  assert.deepStrictEqual([CD.state.x, CD.state.y], [heal.x, heal.y], 'and puts you back at its exact tile');
  assert.strictEqual(CD.state.money, 400, 'the panic costs you half your money');
  assert.strictEqual(starter.hp, starter.stats.hp, 'your trains are looked after while you are out');
  assert.strictEqual(CD.ow.locked, 0, 'the controls come back after waking up');
  assert(CD.state.money >= 0, 'a blackout can never leave you in debt');
}

// ---- saving and loading: play, save, lose it all, load, carry on playing ----
{
  const { h, CD } = boot(23, 'PistonTown', 7, 9, 'left');
  const starter = CD.state.party[0];
  starter.hp = 9;                       // hurt on purpose, so the load has something to prove
  CD.state.money = 1234;
  CD.state.bag = { potion: 3 };
  CD.state.dex.caught[1] = true;
  const parked = [CD.ow.player.x, CD.ow.player.y];
  assert(CD.save.save().ok, 'the game writes a save slot');

  // A page reload keeps the browser's storage but throws away the running game.
  const reloaded = H.load({ seed: 23 });
  const RC = reloaded.CD;
  for (const [k, v] of h.store) reloaded.store.set(k, v);
  RC.newState();
  assert.strictEqual(RC.state.party.length, 0, 'a new game really did replace the old one');
  assert(RC.save.load().ok, 'the save slot reads back');
  RC.overworld.enterMap(RC.state.map, RC.state.x, RC.state.y, RC.state.dir, { quiet: true });
  RC.engine.push(RC.overworld.scene);
  reloaded.step(2);

  assert.strictEqual(RC.state.money, 1234, 'money comes back');
  assert.strictEqual(RC.state.bag.potion, 3, 'the bag comes back');
  assert.strictEqual(RC.state.dex.caught[1], true, 'the Traindex comes back');
  assert.strictEqual(RC.state.party.length, 1, 'the party comes back');
  assert.strictEqual(RC.state.party[0].hp, 9, 'injuries come back exactly as they were saved');
  assert.strictEqual(RC.state.party[0].id, starter.id, 'the party is the same trains');
  assert.strictEqual(RC.state.map, 'PistonTown', 'you resume on the map you left');
  assert.deepStrictEqual([RC.ow.player.x, RC.ow.player.y], parked, 'you resume on the exact tile you left');

  // A loaded save has to be playable, not merely equal.
  reloaded.walk('up', 1);
  reloaded.step(40);
  assert.notDeepStrictEqual([RC.ow.player.x, RC.ow.player.y], parked, 'a loaded save still moves when you walk');
  assert.strictEqual(RC.state.y, parked[1] - 1, 'and the map you return to is the one you saved on');
}

console.log('smoke.test: ok');