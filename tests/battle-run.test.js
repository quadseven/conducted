const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
const Utils = require('../js/utils.js');
global.CONSTANTS = CONSTANTS;
global.Utils = Utils;
const moves = require('../js/moves.js');
global.MOVES_DB = moves.MOVES_DB;
Object.assign(global, { getTypeEffectiveness: moves.getTypeEffectiveness, calculateDamage: moves.calculateDamage, getEffectivenessText: moves.getEffectivenessText });
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');

function battle(isWild, playerSpeed, enemySpeed) {
  const player = { items: {}, party: [], storage: [], registerSeen() {}, addTrain() { return true; } };
  const mine = new Train(1, 5);
  const foe = new Train(10, 5);
  mine.speed = playerSpeed;
  foe.speed = enemySpeed;
  return new Battle({ player }, [mine], [foe], isWild);
}

function pressRun(b) {
  b.state = CONSTANTS.BATTLE_STATES.MENU;
  b.menuSelection = 3;
  b.handleMenuInput('a');
}

const originalRandomInt = Utils.randomInt;
const rollOf = (value) => { Utils.randomInt = (min, max) => (max === 255 ? value : originalRandomInt(min, max)); };

// Formula: (player speed / enemy speed) * 128 > random(256). 100/50*128 = 256.
rollOf(255);
let b = battle(true, 100, 50);
pressRun(b);
assert.equal(b.battleEnded, true, 'flee succeeds when the roll is below the odds');
assert.equal(b.playerWon, false, 'fleeing grants no victory');
assert.equal(b.enemyActive.fainted, false);

// 50/100*128 = 64: a roll of 64 fails (strict >), 63 succeeds.
rollOf(64);
b = battle(true, 50, 100);
let enemyTurns = 0;
const realFreeTurn = b.enemyFreeTurn.bind(b);
b.enemyFreeTurn = () => { enemyTurns++; realFreeTurn(); };
pressRun(b);
assert.equal(b.battleEnded, false, 'failed flee does not end the battle');
assert.equal(b.state, CONSTANTS.BATTLE_STATES.ANIMATION, 'failed flee wastes the turn');
assert.match(b.messages.join('|'), /Can't escape/);
for (let i = 0; i < 40 && b.animationQueue.length; i++) { b.animationTimer = 1; b.updateAnimation(1); }
assert.equal(enemyTurns, 1, 'enemy acts after a failed flee');

rollOf(63);
b = battle(true, 50, 100);
pressRun(b);
assert.equal(b.battleEnded, true);

// Trainer battles never allow running, whatever the roll.
rollOf(0);
b = battle(false, 100, 1);
pressRun(b);
assert.equal(b.battleEnded, false);
assert.match(b.messages.at(-1), /Can't run from a trainer battle/);

Utils.randomInt = originalRandomInt;
assert.match(Battle.toString(), /'RUN'/, 'RUN is in the action menu');
console.log('Battle run tests passed');
