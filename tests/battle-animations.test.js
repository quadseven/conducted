const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = require('../js/utils.js');
global.MOVES_DB = require('../js/moves.js').MOVES_DB;
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');

const player = { items: { boxcar: 1 }, registerSeen() {} };
const battle = new Battle({ player }, [new Train(1, 5)], [new Train(10, 5)]);
battle.state = CONSTANTS.BATTLE_STATES.ITEM;
const originalRandomInt = Utils.randomInt;
Utils.randomInt = () => 0;
battle.useBoxcar();
assert.ok(battle.animationQueue.length, 'capture has timed shake stages');
battle.handleInput('a');
assert.equal(battle.animationQueue.length, 0, 'confirm fast-forwards queued animation stages');
assert.ok(battle.messages.some(message => /caught|broke free|almost|shook/i.test(message)), 'capture result follows fast-forward');
Utils.randomInt = originalRandomInt;

battle.playerActive.currentHP = Math.floor(battle.playerActive.maxHP / 2);
battle.update(0.1);
assert.ok(battle.hpDisplay, 'battle tracks a smoothed HP display value');
console.log('Battle animation tests passed');
