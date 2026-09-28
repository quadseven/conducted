// Battle rules: damage, types, stages, statuses, turn order, fainting, EXP,
// catching, running and the trainer AI; then a whole wild battle through the scene.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 5 });
const CD = h.CD, B = CD.battle, T = CD.train;
const iv = { atk: 8, def: 8, spd: 8, spc: 8 };
const mk = (id, lv, moves) => T.make(id, lv, { iv: Object.assign({}, iv), moves });

// ---- damage formula, worked by hand ----
{
  const a = mk(1, 10, ['Ram']), d = mk(58, 10, ['Ram']);
  const b = B.create([a], [d]);
  const ram = CD.moves.get('Ram');
  const r = B.damage(b, 0, ram, { crit: false, roll: 255 });
  const L = Math.floor(2 * 10 / 5 + 2), expect = Math.floor(Math.floor(L * 40 * a.stats.atk / d.stats.def) / 50) + 2;
  assert.strictEqual(r.dmg, expect, 'no STAB, neutral, max roll');
  const r2 = B.damage(b, 0, ram, { crit: false, roll: 217 });
  assert.strictEqual(r2.dmg, Math.floor(expect * 217 / 255), 'minimum roll');
  const rc = B.damage(b, 0, ram, { crit: true, roll: 255 });
  assert(rc.dmg > r.dmg, 'critical hits hit harder');
  // STAB: Steam Jet from a steam train gets 1.5x
  const sj = CD.moves.get('Steam Jet');
  const rs = B.damage(b, 0, sj, { crit: false, roll: 255 });
  const base = Math.floor(Math.floor(L * 65 * a.stats.spc / d.stats.spc) / 50) + 2;
  assert.strictEqual(rs.dmg, Math.floor(base * 1.5), 'same-type bonus applied');
}
// ---- type chart ----
{
  assert.strictEqual(CD.types.effectiveness('STEAM', ['DIESEL']), 2);
  assert.strictEqual(CD.types.effectiveness('ELECTRIC', ['STEAM']), 2);
  assert.strictEqual(CD.types.effectiveness('DIESEL', ['ELECTRIC']), 2);
  assert.strictEqual(CD.types.effectiveness('STEAM', ['STEAM', 'MAGLEV']), 0.25, 'dual types multiply');
  for (const a of CD.types.TYPES) for (const d of CD.types.TYPES) assert([0.5, 1, 2].includes(CD.types.CHART[a][d]), `${a}->${d} in chart`);
  const a = mk(1, 10, ['Steam Jet']), d = mk(7, 10, ['Ram']);
  const b = B.create([a], [d]);
  assert.strictEqual(B.damage(b, 0, CD.moves.get('Steam Jet'), { roll: 255, crit: false }).eff, 2, 'steam beats diesel');
}
// ---- stages ----
assert.strictEqual(B.stageMult(2), 2); assert.strictEqual(B.stageMult(-2), 0.5); assert.strictEqual(B.stageMult(6), 4);
// ---- turn order: speed, then priority; paralysis quarters speed ----
{
  const fast = mk(4, 20, ['Spark']), slow = mk(43, 20, ['Ram']);
  const b = B.create([slow], [fast]);
  const ev = B.runTurn(b, { kind: 'move', i: 0 }, { kind: 'move', i: 0 });
  const users = ev.filter(e => e.t === 'move').map(e => e.side);
  assert.strictEqual(users.slice(0, 2).join(','), '1,0', 'faster side moves first');
  const b2 = B.create([mk(43, 20, ['Express Shunt'])], [mk(4, 20, ['Spark'])]);
  const ev2 = B.runTurn(b2, { kind: 'move', i: 0 }, { kind: 'move', i: 0 });
  assert.strictEqual(ev2.find(e => e.t === 'move').side, 0, 'priority beats speed');
  const b3 = B.create([mk(43, 20, ['Ram'])], [mk(4, 20, ['Spark'])]);
  b3.sides[1].party[0].status = 'par';
  assert(B.effSpeed(b3.sides[1]) < B.effSpeed(b3.sides[0]), 'paralysis quarters speed');
}
// ---- status immunities and effects ----
{
  const b = B.create([mk(1, 10, ['Ram'])], [mk(4, 10, ['Third Rail'])]);
  const ev = B.runTurn(b, { kind: 'move', i: 0 }, { kind: 'move', i: 0 });
  assert.strictEqual(b.sides[0].party[0].status, 'par', 'Third Rail shorts out a steam train');
  const b2 = B.create([mk(4, 10, ['Spark'])], [mk(4, 10, ['Third Rail'])]);
  B.runTurn(b2, { kind: 'move', i: 0 }, { kind: 'move', i: 0 });
  assert.notStrictEqual(b2.sides[0].party[0].status, 'par', 'electric trains cannot be shorted out');
  const burned = mk(58, 20, ['Ram']); burned.status = 'brn';
  const b3 = B.create([burned], [mk(58, 20, ['Ram'])]);
  const hp0 = burned.hp;
  B.runTurn(b3, { kind: 'move', i: 0 }, { kind: 'move', i: 0 });
  assert(burned.hp <= hp0 - Math.floor(burned.stats.hp / 16), 'burn chips HP at end of turn');
}
// ---- fainting, EXP once, battle end ----
{
  const me = mk(1, 30, ['Pressure Blast']), foe = mk(10, 3, ['Ram']);
  const b = B.create([me], [foe]);
  const exp0 = me.exp;
  let ev = [];
  for (let i = 0; i < 6 && !b.over; i++) ev = ev.concat(B.runTurn(b, { kind: 'move', i: 0 }, { kind: 'move', i: 0 }));
  assert.strictEqual(b.outcome, 'win');
  assert.strictEqual(ev.filter(e => e.t === 'exp').length, 1, 'EXP awarded exactly once');
  const sp = CD.species.get(10);
  assert.strictEqual(me.exp - exp0, Math.floor(sp.exp * 3 / 7), 'wild EXP = yield x level / 7');
  assert.strictEqual(foe.hp, 0);
  assert(!ev.some((e, i) => e.t === 'move' && e.side === 1 && i > ev.findIndex(x => x.t === 'faint')), 'a faint stops the turn');
}
// trainer battles pay 1.5x EXP and forbid running and catching
{
  const me = mk(1, 30, ['Pressure Blast']), foe = mk(10, 3, ['Ram']);
  const b = B.create([me], [foe], { kind: 'trainer', trainer: { name: 'X' } });
  const exp0 = me.exp;
  while (!b.over) B.runTurn(b, { kind: 'move', i: 0 });
  assert.strictEqual(me.exp - exp0, Math.floor(Math.floor(CD.species.get(10).exp * 3 / 7) * 1.5));
  assert(!b.canRun && b.noCatch);
}
// ---- catching ----
{
  const b = B.create([mk(1, 10, ['Ram'])], [mk(58, 5, ['Ram'])]);
  const t = b.sides[1].party[0];
  t.hp = 1;
  const easy = B.catchRoll(b, 2);
  assert(easy.caught, 'a nearly stalled common train is caught with a strong ball');
  const hard = B.create([mk(1, 10, ['Ram'])], [mk(150, 60, ['Ram'])]);
  let caught = 0;
  for (let i = 0; i < 200; i++) if (B.catchRoll(hard, 1).caught) caught++;
  assert(caught < 10, 'legendaries at full HP almost never couple on');
  // sleeping helps
  const b2 = B.create([mk(1, 10, ['Ram'])], [mk(58, 20, ['Ram'])]);
  const f = b2.sides[1].party[0]; const a1 = B.catchRoll(b2, 1).a; f.status = 'slp'; const a2 = B.catchRoll(b2, 1).a;
  assert(a2 >= a1 * 2 - 1 && a2 <= a1 * 2 + 1, 'sleep doubles the catch value');
}
// ---- running ----
{
  const b = B.create([mk(4, 30, ['Spark'])], [mk(43, 3, ['Ram'])]);
  const ev = B.runTurn(b, { kind: 'run' });
  assert.strictEqual(b.outcome, 'run', 'a faster train always escapes');
  assert(ev.some(e => e.t === 'run'));
}
// ---- AI prefers the super-effective move ----
{
  const me = mk(7, 20, ['Ram']);
  const foe = mk(4, 20, ['Spark', 'Horn Honk', 'Ram', 'Charge Beam']);
  const b = B.create([me], [foe], { kind: 'trainer', trainer: { name: 'X' } });
  // Diesel resists nothing here; the AI should favour damage over Horn Honk
  const picks = {};
  for (let i = 0; i < 40; i++) { const a = B.aiChoose(b); picks[a.i] = (picks[a.i] || 0) + 1; }
  assert(!picks[1] || picks[1] < 10, 'rarely wastes turns on a stat drop');
  const f2 = mk(4, 20, ['Ram', 'Spark']);
  const b3 = B.create([mk(1, 20, ['Ram'])], [f2], { kind: 'trainer', trainer: { name: 'X' } });
  let spark = 0; for (let i = 0; i < 40; i++) if (B.aiChoose(b3).i === 1) spark++;
  assert(spark > 30, 'picks the super effective ELECTRIC move against STEAM');
}
// ---- PP and Struggle ----
{
  const me = mk(1, 20, ['Ram']); me.moves[0].pp = 0;
  const { move } = B.moveFor(me, 0);
  assert.strictEqual(move.name, 'Struggle');
}

// ---- a whole wild battle through the scene, driven by buttons ----
{
  const g = H.load({ seed: 21 });
  const C = g.CD;
  C.newState();
  const star = C.train.make(1, 12);
  C.state.party.push(star);
  C.overworld.enterMap('Route1', 4, 3, 'down', { quiet: true });
  C.engine.push(C.overworld.scene);
  g.step(2);
  C.overworld.script(C.encounters.wildBattle(10, 3, 'grass'), 'test');
  // mash A: FIGHT, first move, until the battle ends and the map is back
  let frames = 0;
  while (C.ow.locked && frames < 20000) { if (frames % 5 === 0) g.press('a', 1); else g.step(1); frames++; }
  assert(!C.ow.locked, 'battle finished and returned to the map');
  assert(star.exp > C.train.expAt('mslow', 12), 'the starter earned EXP');
  assert.strictEqual(C.state.dex.seen[10], true, 'wild train registered as seen');
  assert.strictEqual(C.audio.current, 'route1', 'route music resumes');
}
// ---- catching through the scene: BAG -> TRAINBALL -> caught -> no nickname ----
{
  const g = H.load({ seed: 9 });
  const C = g.CD;
  C.newState();
  C.state.party.push(C.train.make(1, 12));
  C.state.bag = { trainball: 2 };
  C.overworld.enterMap('Route1', 4, 3, 'down', { quiet: true });
  C.engine.push(C.overworld.scene);
  g.step(2);
  const foe = C.train.make(58, 4); foe.hp = 1; foe.status = 'slp';   // guaranteed catch
  let result = null;
  C.overworld.script(function* () { result = yield* C.battleScene.battle({ kind: 'wild', enemy: [foe] }); yield* C.encounters.afterBattle(result); }(), 'catch');
  const top = () => g.top() && g.top().constructor.name;
  assert(g.until(() => top() === 'ActionMenu', 4000, 'a'), 'action menu shown');
  g.press('down', 2); g.press('a', 10);                       // BAG
  assert(g.until(() => top() === 'BagList', 200), 'bag open');
  g.press('a', 10);                                           // TRAINBALL
  assert(g.until(() => top() === 'Choice', 3000, 'a'), 'nickname question');
  g.press('b', 10);                                           // NO
  assert(g.until(() => !C.ow.locked, 3000, 'a'));
  assert.strictEqual(result, 'caught');
  assert.strictEqual(C.state.party.length, 2, 'caught train joined the party');
  assert.strictEqual(C.state.party[1], foe);
  assert(C.state.dex.caught[58], 'registered as caught');
  assert.strictEqual(C.state.bag.trainball, 1, 'one ball used');
}
console.log('battle.test: ok');
