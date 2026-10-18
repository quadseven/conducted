// Trainer AI tiers: the per-tier table, the 'ace' tier that gym leaders and the
// rival use (switching out of a lost type matchup, sending in the best-matched
// reserve after a faint), and the plumbing from trainer data to the battle.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 7 });
const CD = h.CD, B = CD.battle, T = CD.train;
const iv = { atk: 8, def: 8, spd: 8, spc: 8 };
const mk = (id, lv, moves) => T.make(id, lv, { iv: Object.assign({}, iv), moves });

// Species used below: 1 STEAMINI (STEAM), 4 SPARKART (ELECTRIC),
// 7 DIESLING (DIESEL), 10 TRACKIE (PASSENGER). ELECTRIC hits STEAM and
// PASSENGER for 2x; DIESEL hits ELECTRIC for 2x and takes 1x from it.
const steam = () => mk(1, 20, ['Coal Throw', 'Ram']);
const passenger = () => mk(10, 20, ['Ram']);
const diesel = () => mk(7, 20, ['Diesel Spray', 'Ram']);
const electric = () => mk(4, 20, ['Spark']);
const battle = (enemy, ai, player) => B.create([player || electric()], enemy, { kind: 'trainer', trainer: { name: 'ACE' }, ai });

// ---- the tiers are one table, and an unknown tier is refused ----
{
  assert.deepStrictEqual(Object.keys(B.AI_TIERS).sort(), ['ace', 'smart', 'wild'], 'three AI tiers');
  assert.strictEqual(B.create([electric()], [steam()]).ai, 'wild', 'wild battles default to the wild tier');
  assert.strictEqual(B.create([electric()], [steam()], { kind: 'trainer', trainer: { name: 'X' } }).ai, 'smart', 'trainers default to the smart tier');
  assert.throws(() => B.create([electric()], [steam()], { kind: 'trainer', ai: 'genius' }), /unknown AI tier/, 'unknown tier throws');
  assert.strictEqual(B.AI_TIERS.smart.switch, false, 'smart trainers never switch');
  assert(B.AI_TIERS.ace.switch && B.AI_TIERS.ace.maxSwitches >= 1, 'ace trainers may switch');
}

// ---- matchup: our best move against them over their best type against us ----
{
  assert.strictEqual(B.matchup(steam(), electric()), 0.5, 'STEAM vs ELECTRIC is a lost matchup');
  assert.strictEqual(B.matchup(diesel(), electric()), 2, 'DIESEL vs ELECTRIC is a won matchup');
  assert.strictEqual(B.matchup(passenger(), electric()), 0.25, 'PASSENGER vs ELECTRIC is badly lost');
}

// ---- an ace switches out of a lost matchup to the best reserve ----
{
  const b = battle([steam(), passenger(), diesel()], 'ace');
  const a = B.aiChoose(b);
  assert.deepStrictEqual({ kind: a.kind, i: a.i }, { kind: 'switch', i: 2 }, 'ace sends in the DIESEL reserve');
  const ev = B.runTurn(b, { kind: 'move', i: 0 }, a);
  assert.strictEqual(b.sides[1].active, 2, 'the reserve is now active');
  assert(ev.some(e => e.t === 'recall' && e.side === 1), 'the lead is recalled');
  assert(ev.some(e => e.t === 'send' && e.side === 1 && e.idx === 2), 'the reserve is sent out');
  assert(ev.some(e => e.t === 'text' && /ACE called back STEAMINI!/.test(e.s)), 'the recall is announced');
  const hits = ev.filter(e => e.t === 'move');
  assert.strictEqual(hits.length, 1, 'only the player attacks on a switch turn');
  assert.strictEqual(hits[0].side, 0, 'the player move lands on the reserve');
  assert(b.sides[1].party[2].hp < b.sides[1].party[2].stats.hp, 'the reserve took the hit');
  assert.strictEqual(b.sides[1].party[0].hp, b.sides[1].party[0].stats.hp, 'the recalled lead took none');
  assert.strictEqual(b.aiSwitches, 1, 'the switch is counted');
  // once in a winning matchup it stays in and attacks
  for (let i = 0; i < 20; i++) assert.strictEqual(B.aiChoose(b).kind, 'move', 'stays in a won matchup');
}

// ---- a smart trainer in the same spot never switches ----
{
  const b = battle([steam(), passenger(), diesel()], 'smart');
  for (let i = 0; i < 40; i++) assert.strictEqual(B.aiChoose(b).kind, 'move', 'smart tier attacks instead');
}

// ---- no switch when the matchup is fine or no reserve is better ----
{
  const fine = battle([steam(), diesel()], 'ace', mk(7, 20, ['Ram']));   // STEAM vs DIESEL: we win
  for (let i = 0; i < 20; i++) assert.strictEqual(B.aiChoose(fine).kind, 'move', 'no switch from a won matchup');
  const noBetter = battle([steam(), passenger(), passenger()], 'ace');
  for (let i = 0; i < 20; i++) assert.strictEqual(B.aiChoose(noBetter).kind, 'move', 'no switch when every reserve is worse');
  const fainted = battle([steam(), diesel()], 'ace');
  fainted.sides[1].party[1].hp = 0;
  assert.strictEqual(B.aiChoose(fainted).kind, 'move', 'a fainted reserve is never sent in');
  const recharging = battle([steam(), diesel()], 'ace');
  recharging.sides[1].vol.recharge = true;
  assert.strictEqual(B.aiChoose(recharging).kind, 'move', 'no switch while recharging');
}

// ---- the switch budget runs out ----
{
  const b = battle([steam(), diesel()], 'ace');
  b.aiSwitches = B.AI_TIERS.ace.maxSwitches;
  for (let i = 0; i < 20; i++) assert.strictEqual(B.aiChoose(b).kind, 'move', 'no switch past the budget');
}

// ---- after a faint an ace sends in the best-matched reserve ----
{
  const ace = battle([steam(), passenger(), diesel()], 'ace');
  ace.sides[1].party[0].hp = 0;
  assert.strictEqual(B.nextEnemy(ace), 2, 'ace picks DIESEL over the next in line');
  const smart = battle([steam(), passenger(), diesel()], 'smart');
  smart.sides[1].party[0].hp = 0;
  assert.strictEqual(B.nextEnemy(smart), 1, 'smart sends the next in line');
}

// ---- the tier reaches the battle from trainer data, and a switch plays through the scene ----
{
  const g = H.load({ seed: 41 });
  const C = g.CD;
  C.newState();
  C.state.party.push(C.train.make(4, 30, { moves: ['Spark'] }));
  C.overworld.enterMap('Route1', 4, 3, 'down', { quiet: true });
  C.engine.push(C.overworld.scene);
  g.step(2);
  let result = null;
  C.overworld.script(function* () {
    result = yield* C.encounters.fightTrainer({ sprite: 'youngster', trainer: { id: 'aceTest', name: 'ACE', cls: '', prize: 1, ai: 'ace', party: [[1, 10], [7, 10]] } });
  }(), 'ace-switch');
  let frames = 0;
  while (C.ow.locked && frames < 30000) { if (frames % 5 === 0) g.press('a', 1); else g.step(1); frames++; }
  assert(!C.ow.locked, 'the ace battle returns to the map');
  assert.strictEqual(C.lastBattle.ai, 'ace', 'trainer data sets the AI tier');
  assert.strictEqual(C.lastBattle.aiSwitches, 1, 'the ace switched once during the battle');
  assert.strictEqual(result, 'win', 'the battle still finishes');
}
console.log('trainer-ai.test: ok');
