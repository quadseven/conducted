const assert = require('node:assert/strict');
const Utils = require('../js/utils.js');

assert.equal(Utils.calculateCatchValue({ maxHP: 100, currentHP: 100, catchRate: 100 }), 33);
assert.equal(Utils.calculateCatchValue({ maxHP: 100, currentHP: 10, catchRate: 100, status: 'par' }), 140);
assert.equal(Utils.calculateCatchValue({ maxHP: 10, currentHP: 10, catchRate: 255 }, 2), 170);
assert.equal(Utils.calculateCatchValue({ maxHP: 10, currentHP: 0, catchRate: 255 }, 2), 255);

const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = Utils;
global.MOVES_DB = require('../js/moves.js').MOVES_DB;
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');
function battle(isWild, quantity = 1) {
  const player = { items: { boxcar: quantity }, party: [], storage: [], registerSeen() {}, addTrain(train) { this.party.push(train); return true; } };
  const game = { player };
  const foe = new Train(10, 5);
  const b = new Battle(game, [new Train(1, 5)], [foe], isWild);
  b.state = CONSTANTS.BATTLE_STATES.ITEM;
  return { b, player };
}
const trainer = battle(false);
trainer.b.useBoxcar();
assert.equal(trainer.player.items.boxcar, 0, 'blocked capture consumes the ball');
assert.match(trainer.b.messages.at(-1), /blocked/i);

const wild = battle(true);
const originalRandomInt = Utils.randomInt;
Utils.randomInt = () => 0;
wild.b.useBoxcar();
assert.equal(wild.player.items.boxcar, 0);
for (let i = 0; i < 10 && wild.b.animationQueue.length; i++) { wild.b.animationTimer = 1; wild.b.updateAnimation(1); }
assert.equal(wild.b.caughtTrain, wild.b.enemyActive, 'successful capture records the wild train');
assert.equal(wild.b.state, CONSTANTS.BATTLE_STATES.VICTORY);
Utils.randomInt = originalRandomInt;
console.log('Battle capture tests passed');
