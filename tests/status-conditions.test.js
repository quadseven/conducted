const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = require('../js/utils.js');
const moveData = require('../js/moves.js');
global.MOVES_DB = moveData.MOVES_DB;
global.getTypeEffectiveness = moveData.getTypeEffectiveness;
global.calculateDamage = moveData.calculateDamage;
global.getEffectivenessText = moveData.getEffectivenessText;
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');

function makeBattle() {
    const playerTrain = new Train(1, 5, ['Third Rail', 'Signal Jam']);
    const foe = new Train(10, 5, ['Ram']);
    const player = { items: {}, registerSeen() {} };
    return { playerTrain, foe, battle: new Battle({ player }, [playerTrain], [foe]) };
}

const randomInt = Utils.randomInt;
const random = Math.random;
try {
    const { playerTrain, foe, battle } = makeBattle();
    Utils.randomInt = (min, max) => max === 100 ? 1 : min;
    battle.applyMoveEffect({ side: 'player', defender: foe }, { effect: { status: 'paralyzed', chance: 100 } });
    assert.equal(foe.status, 'paralyze', 'status move applies paralysis');
    assert.match(battle.messages.join(' '), /paralyzed/i, 'status application reports feedback');

    foe.status = 'poison';
    foe.currentHP = foe.maxHP;
    battle.endOfTurn();
    assert.equal(foe.currentHP, foe.maxHP - Math.max(1, Math.floor(foe.maxHP / 16)), 'Gen 1 poison removes one sixteenth max HP');

    foe.status = 'sleep';
    foe.statusTurns = 2;
    battle.turnActions = [{ side: 'enemy', attacker: foe, defender: playerTrain, move: 'Ram' }];
    battle.messages = [];
    battle.processNextAction();
    assert.equal(foe.movePP.Ram, MOVES_DB.Ram.pp, 'sleep prevents a move without spending PP');
    assert.match(battle.messages.join(' '), /asleep/i, 'sleep reports immobility');

    foe.status = 'freeze';
    battle.messages = [];
    battle.turnActions = [{ side: 'enemy', attacker: foe, defender: playerTrain, move: 'Ram' }];
    battle.processNextAction();
    assert.equal(foe.movePP.Ram, MOVES_DB.Ram.pp, 'freeze prevents a move without spending PP');

    playerTrain.status = 'freeze';
    assert.equal(Train.fromJSON(playerTrain.toJSON()).status, 'freeze', 'status persists through save/load');
    playerTrain.status = 'sleep';
    playerTrain.statusTurns = 3;
    const restored = Train.fromJSON(playerTrain.toJSON());
    assert.equal(restored.status, 'sleep', 'overworld sleep status persists through save/load');
    assert.equal(restored.statusTurns, 3, 'remaining sleep duration persists through save/load');
    assert.ok(battle.getStatusLabel, 'battle exposes status labels for the UI');
} finally {
    Utils.randomInt = randomInt;
    Math.random = random;
}
console.log('Status condition tests passed');
