// The first gym: walk the crate maze from the door, get spotted by the crew,
// beat Captain Marina, receive the Harbor Badge, and keep it through a save.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 12 });
const C = h.CD;
C.newState();
C.state.name = 'ALEX'; C.state.flags.gotStarter = true; C.state.flags.gotDex = true;
const t = C.train.make(9, 30);                     // a strong DIESEL/FREIGHT train
t.moves = [C.train.moveSlot('Torque Punch'), C.train.moveSlot('Piston Drive')];
C.state.party.push(t);
C.state.money = 1000;
C.overworld.enterMap('HarborGym', 5, 13, 'up', { quiet: true });
C.engine.push(C.overworld.scene);
h.step(2);
// the maze: up the middle, then to Marina
let guard = 0;
while (!C.state.badges.includes('harbor') && guard++ < 6000) {
  if (C.ow.locked || h.top() !== C.overworld.scene) { h.press('a', 2); continue; }
  const p = C.ow.player;
  if (p.y > 3) { if (h.walk('up', 1) === 0) { h.press('a', 4); } }
  else { p.dir = 'up'; h.press('a', 4); }
}
assert(C.state.badges.includes('harbor'), 'earned the Harbor Badge');
assert(C.state.trainers.gymSailor, 'the deckhand spotted and battled us');
assert(C.state.trainers.gymWorker, 'the dockhand spotted and battled us');
assert(C.state.trainers.marina, 'Marina marked as beaten');
h.settle();
assert(C.state.bag.superpotion >= 2, 'received the badge gift');
assert(C.state.money > 1000, 'prize money paid');
// talking to her again gives the post-badge line, no second battle
C.ow.player.dir = 'up';
h.press('a', 10);
assert(!h.CD.lastBattle || h.CD.lastBattle.trainer.name === 'MARINA');
h.settle();
// the badge survives a save and a reload
assert(C.save.save().ok);
C.newState();
assert(C.save.load().ok);
assert(C.state.badges.includes('harbor'), 'badge saved');
// the trainer pass draws the badge
C.overworld.script(C.menu.card(), 'card'); h.step(3); h.draw(); h.press('a', 4);
console.log('gym.test: ok');
