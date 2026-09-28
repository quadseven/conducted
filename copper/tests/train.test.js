// Train progression: growth curves, stats, levelling, move learning, evolution.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 11 });
const CD = h.CD, T = CD.train;

for (const g of ['fast', 'medium', 'mslow', 'slow']) {
  let prev = -1;
  for (let n = 1; n <= 100; n++) { const e = T.expAt(g, n); assert(e > prev || (n === 1 && e === 0), `${g} curve rises at ${n}`); prev = e; }
  for (const n of [2, 5, 16, 50, 100]) assert.strictEqual(T.levelFor(g, T.expAt(g, n)), n, `${g} levelFor inverts expAt at ${n}`);
}
assert.strictEqual(T.expAt('medium', 10), 1000);
assert.strictEqual(T.expAt('mslow', 5), 135);

const t = T.make(1, 5, { iv: { atk: 15, def: 15, spd: 15, spc: 15 } });
assert.strictEqual(t.iv.hp, 15, 'HP IV derives from the others');
const sp = CD.species.get(1);
assert.strictEqual(t.stats.hp, Math.floor(((sp.base.hp + 15) * 2) * 5 / 100) + 5 + 10);
assert.strictEqual(t.stats.atk, Math.floor(((sp.base.atk + 15) * 2) * 5 / 100) + 5);
assert.strictEqual(t.hp, t.stats.hp, 'starts at full HP');
assert(t.moves.length >= 1 && t.moves.length <= 4, 'knows 1-4 moves');

// levelling from 5 to 16 learns moves and makes it eligible to evolve
const need = T.expAt('mslow', 16) - t.exp;
t.hp -= 3;
const ev = T.gainExp(t, need);
assert.strictEqual(t.level, 16);
assert(ev.filter(e => e.kind === 'level').length === 11, 'one level event per level');
assert(ev.some(e => e.kind === 'learn' && e.move === 'Coal Throw'), 'learned Coal Throw at 7');
assert(t.hp < t.stats.hp && t.hp > 0, 'damage carries through level ups');
assert.strictEqual(T.evolveTarget(t), 2, 'level 16 Steamini can evolve');
const t15 = T.make(1, 15); assert.strictEqual(T.evolveTarget(t15), null, 'not before its level');
const hpBefore = t.stats.hp;
T.evolve(t, 2);
assert.strictEqual(t.id, 2); assert(t.stats.hp > hpBefore, 'evolving raises stats');
// the species template is never mutated through an instance
t.moves.push({ name: 'Ram', pp: 1, max: 1 });
assert(!CD.species.get(2).learnset.some(l => l.move === undefined), 'template intact');
// a full move list asks before learning
const full = T.make(1, 30);
while (full.moves.length < 4) full.moves.push(T.moveSlot('Ram'));
const ev2 = T.gainExp(full, T.expAt('mslow', 33) - full.exp);
assert(ev2.some(e => e.kind === 'full' && e.move === 'Pressure Blast'), 'a fifth move needs a replace prompt');
T.heal(full); assert.strictEqual(full.hp, full.stats.hp);
console.log('train.test: ok');
