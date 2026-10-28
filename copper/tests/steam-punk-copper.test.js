'use strict';
const assert = require('assert');
const H = require('./harness.js');

const h = H.load({ seed: 29 });
const C = h.CD;
C.newState();
C.state.party.push(C.train.make(1, 20));
C.overworld.enterMap('DieselModShop', 6, 7, 'up', { quiet: true });
C.engine.push(C.overworld.scene);
h.step(3);
let result = 'lose';
let battles = [];
C.battleScene.battle = function* (options) { battles.push(options); return result; };
function interact() {
  C.ow.player.dir = 'up';
  h.press('a', 3);
  assert(h.settle(), 'interaction finishes');
}
interact();
assert.strictEqual(battles.length, 0, 'three badges are required');
for (const missing of ['harbor', 'voltage', 'boiler']) {
  C.state.badges = ['harbor', 'voltage', 'boiler'].filter(b => b !== missing);
  interact();
  assert.strictEqual(battles.length, 0, `missing ${missing} keeps the encounter gated`);
}
C.state.badges = [];
C.state.badges.push('harbor', 'voltage', 'boiler');
interact();
assert.strictEqual(battles.length, 1, 'the encounter starts a battle');
assert.strictEqual(battles[0].trainer.name, 'CINDER AND ASH');
assert(!C.state.flags.steamPunkAct1Complete, 'a loss is not victory');
result = 'win';
interact();
assert.strictEqual(battles.length, 2, 'a loss permits a retry');
assert(C.state.flags.steamPunkAct1Complete, 'victory records progress');
assert(C.save.save().ok);
C.newState();
assert(C.save.load().ok);
assert(C.state.flags.steamPunkAct1Complete, 'victory survives reload');
C.overworld.enterMap('DieselModShop', 6, 7, 'up', { quiet: true });
interact();
assert.strictEqual(battles.length, 2, 'victory prevents a repeat battle');
C.ow.player.x = 7;
interact();
assert.strictEqual(battles.length, 2, 'the other member cannot restart a completed encounter');

// Exercise the real battle scene as well as both controlled outcomes above.
const live = H.load({ seed: 31 });
const game = live.CD;
game.newState();
game.state.badges.push('harbor', 'voltage', 'boiler');
const train = game.train.make(9, 80);
train.moves = [game.train.moveSlot('Torque Punch')];
game.state.party.push(train);
game.overworld.enterMap('DieselModShop', 6, 7, 'up', { quiet: true });
game.engine.push(game.overworld.scene);
live.step(3);
live.press('a', 3);
assert(live.until(() => game.state.flags.steamPunkAct1Complete, 20000, 'a'), 'real battle awards the story flag');
assert.strictEqual(game.lastBattle.trainer.name, 'CINDER AND ASH');
console.log('steam-punk-copper.test: ok');
