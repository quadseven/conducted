const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
const Utils = require('../js/utils.js');
const TRAIN_SPECIES = require('../js/train-data.js');
const MOVES_DB = require('../js/moves.js').MOVES_DB;
global.CONSTANTS = CONSTANTS;
global.Utils = Utils;
global.TRAIN_SPECIES = TRAIN_SPECIES;
global.MOVES_DB = MOVES_DB;
const Train = require('../js/train.js');

assert.ok(TRAIN_SPECIES[20].evolution.choices.length >= 2, 'species 20 has branching evolutions');
const branchTrain = new Train(20, 30);
assert.equal(branchTrain.canEvolve(), false, 'branch choice must be explicit');
assert.equal(branchTrain.canEvolve({ choice: 152 }), true);
assert.equal(branchTrain.evolve({ choice: 152 }), true);
assert.equal(branchTrain.speciesId, 152);

assert.equal(new Train(24, 30).canEvolve(), false, 'trade evolution requires a trade trigger');
const tradeTrain = new Train(24, 30);
assert.equal(tradeTrain.canEvolve({ trade: true }), true);
assert.equal(tradeTrain.evolve({ trade: true }), true);
assert.equal(tradeTrain.speciesId, 154);
const freightTrain = new Train(18, 30);
assert.equal(freightTrain.evolve({ form: 'freight' }), true);
assert.equal(freightTrain.speciesId, 155);
const passengerTrain = new Train(18, 30);
assert.equal(passengerTrain.evolve({ form: 'passenger' }), true);
assert.equal(passengerTrain.speciesId, 156);

const newSpecies = Object.values(TRAIN_SPECIES).filter(species => species.id >= 152);
assert.ok(newSpecies.length >= 10);
assert.ok(newSpecies.every(species => species.spritePlaceholder && species.learnset.length && species.baseStats));
assert.ok(newSpecies.every(species => species.learnset.every(entry => MOVES_DB[entry.move])));
console.log('Branching evolution tests passed');
