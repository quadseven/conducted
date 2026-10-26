// All eight gyms: each leader's party is harder than the last, every leader
// has lines before and after the battle, every town's gym door leads into its
// own interior where the leader can be reached from the doormat, beating a
// leader awards its badge exactly once, and the badges boost the player's
// trains in battle and unlock their field techniques.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 21 });
const C = h.CD;

const ORDER = ['harbor', 'voltage', 'boiler', 'piston', 'levitation', 'specter', 'fusion', 'summit'];
const ASCII = /^[\x20-\x7e\n]*$/;

// ---------- the table ----------
assert(C.gyms && Array.isArray(C.gyms.LIST), 'the gym table is loaded');
assert.deepStrictEqual(Array.from(C.gyms.LIST, g => g.badge), ORDER, 'eight badges in campaign order');
assert.strictEqual(new Set(C.gyms.LIST.map(g => g.town)).size, 8, 'one gym per town');

// ---------- parties: increasing difficulty ----------
let prev = { max: 0, avg: 0, size: 0 };
for (const g of C.gyms.LIST) {
  assert(g.party.length >= 3 && g.party.length <= 6, `${g.leader.name} brings 3 to 6 trains`);
  const levels = g.party.map(p => p[1]);
  const max = Math.max(...levels), avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  assert(max > prev.max, `${g.leader.name}'s ace (L${max}) outlevels the previous leader's (L${prev.max})`);
  assert(avg > prev.avg, `${g.leader.name}'s average level (${avg}) beats the previous leader's (${prev.avg})`);
  assert(g.party.length >= prev.size, `${g.leader.name} brings at least as many trains as the previous leader`);
  assert.strictEqual(levels[levels.length - 1], max, `${g.leader.name} saves the strongest train for last`);
  for (const [id] of g.party) {
    const sp = C.species.get(id);
    assert(sp, `species ${id} exists`);
    assert(sp.types.includes(g.type), `${sp.name} fits ${g.leader.name}'s ${g.type} specialty`);
  }
  prev = { max, avg, size: g.party.length };
}

// ---------- dialogue ----------
for (const g of C.gyms.LIST) {
  const d = g.dialogue;
  assert(d.pre.length >= 2, `${g.leader.name} has pre-battle lines`);
  assert(d.defeat && d.award.length >= 1 && d.effect, `${g.leader.name} has defeat, award and effect lines`);
  assert(d.post.length >= 1, `${g.leader.name} has post-battle lines`);
  for (const line of [...d.pre, d.defeat, ...d.award, d.effect, ...d.post]) {
    assert(typeof line === 'string' && line.length > 0 && ASCII.test(line), `${g.leader.name}: plain ASCII line: ${line}`);
  }
}

// ---------- interiors ----------
const layouts = new Set();
for (const g of C.gyms.LIST) {
  const town = C.world.get(g.town);
  const warp = (town.warps || []).find(w => w.to === g.map);
  assert(warp, `${g.town} has a door into ${g.map}`);
  const gym = C.world.get(g.map);
  assert(gym.indoor, `${g.map} is an interior`);
  assert.strictEqual(gym.music, 'gym', `${g.map} plays the gym theme`);
  layouts.add(gym.rows.join('\n'));
  const back = gym.warps.find(w => w.to === g.town);
  assert(back && back.tx === warp.x && back.ty === warp.y, `${g.map} leads back out to its town's door`);
  assert.strictEqual(warp.tx, back.x, `entering ${g.map} lands on its doormat`);
  const leader = (gym.npcs || []).find(n => n.id === g.leader.id);
  assert(leader, `${g.leader.name} stands in ${g.map}`);
  assert((gym.npcs || []).some(n => n.trainer), `${g.map} has gym trainers`);
  // the doormat reaches the tile in front of the leader without walking through anyone
  const c = C.world.compile(gym);
  const blocked = new Set(gym.npcs.map(n => n.x + ',' + n.y));
  const goal = leader.x + ',' + (leader.y + 1);
  const seen = new Set([back.x + ',' + back.y]);
  const queue = [[back.x, back.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= c.w || ny >= c.h || seen.has(k) || blocked.has(k)) continue;
      if (c.cells[ny * c.w + nx].solid) continue;
      seen.add(k); queue.push([nx, ny]);
    }
  }
  assert(seen.has(goal), `${g.map}: the doormat connects to ${g.leader.name}`);
}
assert.strictEqual(layouts.size, 8, 'every gym has its own interior layout');

// walking up into a town's gym door enters that gym
{
  const g = C.gyms.byBadge('voltage');
  const warp = C.world.get(g.town).warps.find(w => w.to === g.map);
  C.newState();
  C.state.flags.gotStarter = true;
  C.state.party.push(C.train.make(9, 30));
  C.overworld.enterMap(g.town, warp.x, warp.y + 1, 'up', { quiet: true });
  C.engine.push(C.overworld.scene);
  h.step(2);
  h.walk('up', 1);
  h.step(40);
  assert.strictEqual(C.state.map, g.map, 'the door in ' + g.town + ' opens onto ' + g.map);
  while (C.engine.top() && C.engine.top() !== C.overworld.scene) C.engine.remove(C.engine.top());
}

// ---------- badge effects in battle ----------
{
  assert.strictEqual(C.gyms.boosts([]).atk, 1, 'no badge, no boost');
  assert(C.gyms.boosts(['harbor']).atk > 1, 'the Harbor Badge boosts ATTACK');
  assert(C.gyms.boosts(['voltage']).spd > 1, 'the Voltage Badge boosts SPEED');
  assert(C.gyms.boosts(['boiler']).def > 1, 'the Boiler Badge boosts DEFENSE');
  assert(C.gyms.boosts(['piston']).spc > 1, 'the Piston Badge boosts SPECIAL');
  // the same two trains in every battle, so only the badges differ
  const mine = C.train.make(9, 40), theirs = C.train.make(13, 40);
  const mk = () => [mine];
  const foe = () => [theirs];
  const punch = C.moves.get('Torque Punch');
  const roll = { crit: false, roll: 255 };
  const plain = C.battle.create(mk(), foe(), { kind: 'trainer' });
  const harbor = C.battle.create(mk(), foe(), { kind: 'trainer', badges: ['harbor'] });
  const boiler = C.battle.create(mk(), foe(), { kind: 'trainer', badges: ['boiler'] });
  const voltage = C.battle.create(mk(), foe(), { kind: 'trainer', badges: ['voltage'] });
  assert(C.battle.damage(harbor, 0, punch, roll).dmg > C.battle.damage(plain, 0, punch, roll).dmg, 'Harbor Badge: the player hits harder');
  assert.strictEqual(C.battle.damage(harbor, 1, punch, roll).dmg, C.battle.damage(plain, 1, punch, roll).dmg, 'the foe gets no badge boost');
  assert(C.battle.damage(boiler, 1, punch, roll).dmg < C.battle.damage(plain, 1, punch, roll).dmg, 'Boiler Badge: the player takes less damage');
  assert(C.battle.effSpeed(voltage.sides[0]) > C.battle.effSpeed(plain.sides[0]), 'Voltage Badge: the player is faster');
  assert.strictEqual(C.battle.effSpeed(voltage.sides[1]), C.battle.effSpeed(plain.sides[1]), 'the foe is no faster');
  // crits ignore the boost the same way they ignore stat stages
  const crit = { crit: true, roll: 255 };
  assert.strictEqual(C.battle.damage(harbor, 0, punch, crit).dmg, C.battle.damage(plain, 0, punch, crit).dmg, 'a critical hit ignores badge boosts');
}

// ---------- beat every leader ----------
const strong = C.train.make(9, 100);                    // DIESEL/FREIGHT, far above every gym
strong.moves = [C.train.moveSlot('Torque Punch'), C.train.moveSlot('Piston Drive')];
C.newState();
C.state.flags.gotStarter = true;
C.state.party = [strong];
for (const g of C.gyms.LIST) {
  const gym = C.world.get(g.map);
  const leader = gym.npcs.find(n => n.id === g.leader.id);
  C.train.heal(strong);
  for (const m of strong.moves) m.pp = 99;
  C.state.puzzles[g.badge] = { switches: [...g.puzzle.solution], solved: true };
  const badgesBefore = C.state.badges.length;
  const bag = C.state.bag[g.gift.item] || 0;
  C.overworld.enterMap(g.map, leader.x, leader.y + 1, 'up', { quiet: true });
  if (C.engine.top() !== C.overworld.scene) C.engine.push(C.overworld.scene);
  h.step(2);
  let guard = 0;
  while (!C.state.badges.includes(g.badge) && guard++ < 4000) {
    if (C.ow.locked || h.top() !== C.overworld.scene) { h.press('a', 2); continue; }
    C.ow.player.dir = 'up';
    h.press('a', 4);
  }
  assert(C.state.badges.includes(g.badge), `beat ${g.leader.name} for the ${g.badgeName}`);
  assert(C.state.trainers[g.leader.id], `${g.leader.name} is marked as beaten`);
  assert.strictEqual(C.lastBattle.trainer.name, g.leader.name, `the last battle was against ${g.leader.name}`);
  assert.strictEqual(C.lastBattle.ai, 'ace', `${g.leader.name} battles on the ace AI tier`);
  h.settle();
  assert.strictEqual(C.state.badges.length, badgesBefore + 1, 'exactly one badge awarded');
  assert(C.state.techniques.includes(g.effect.technique), `${g.badgeName} unlocks ${g.effect.technique}`);
  assert.strictEqual(C.state.bag[g.gift.item], bag + g.gift.count, `${g.leader.name} hands over the gift`);
  // a second talk gives the post-badge lines and no rematch
  const last = C.lastBattle;
  C.ow.player.dir = 'up';
  h.press('a', 10);
  h.settle();
  assert.strictEqual(C.lastBattle, last, `${g.leader.name} does not battle again`);
  assert.strictEqual(C.state.badges.filter(b => b === g.badge).length, 1, `${g.badgeName} is not awarded twice`);
}
assert.deepStrictEqual(Array.from(C.state.badges), ORDER, 'all eight badges, in order');

// the badges and techniques survive a save and reload, and the pass draws all eight
assert(C.save.save().ok);
C.newState();
assert(C.save.load().ok);
assert.deepStrictEqual(Array.from(C.state.badges), ORDER, 'badges saved');
assert.strictEqual(C.state.techniques.length, 8, 'techniques saved');
for (const id of ORDER) assert(C.badges.BADGES[id], `${id} has badge art`);
C.overworld.script(C.menu.card(), 'card'); h.step(3); h.draw(); h.press('a', 4);
console.log('gyms.test: ok');
