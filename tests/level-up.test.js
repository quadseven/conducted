const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = require('../js/utils.js');
const moveData = require('../js/moves.js');
global.MOVES_DB = moveData.MOVES_DB;
global.getTypeEffectiveness = moveData.getTypeEffectiveness;
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');

const FULL_MOVES = ['Ram', 'Smoke Screen', 'Coal Throw', 'Pressure Blast'];
const LEARN = CONSTANTS.BATTLE_STATES.LEARN_MOVE;

function makeBattle(playerTrain) {
    const foe = new Train(10, 5);
    const player = { items: {}, registerSeen() {} };
    return { foe, battle: new Battle({ player }, [playerTrain], [foe]) };
}

function knockOut(foe, battle) {
    foe.currentHP = 0;
    foe.fainted = true;
    battle.checkBattleEnd();
}

// The Gen 1 formula: base EXP * defeated level / 7.
const winner = new Train(1, 5);
const duel = makeBattle(winner);
const expBefore = winner.exp;
duel.battle.awardExp(duel.foe);
assert.equal(winner.exp - expBefore, Math.floor(duel.foe.species.expYield * duel.foe.level / 7));

// gainExp reports each level gained along with the stat increases.
const grower = new Train(1, 5);
const records = grower.gainExp(grower.calculateExpForLevel(7) - grower.exp);
assert.deepEqual(records.map(r => r.level), [6, 7]);
for (const stat of ['hp', 'attack', 'defense', 'speed', 'special']) {
    assert.equal(typeof records[0].gains[stat], 'number', `level-up reports ${stat} gain`);
}
assert.ok(records[0].gains.hp >= 0);

// The EXP bar fraction runs from this level's threshold to the next.
const bar = new Train(1, 10);
assert.equal(bar.expProgress(), 0);
bar.exp = (bar.calculateExpForLevel(10) + bar.calculateExpForLevel(11)) / 2;
assert.ok(Math.abs(bar.expProgress() - 0.5) < 0.01);

// A full move list never forgets a move on its own; the player picks.
const full = new Train(1, 6, [...FULL_MOVES]);
const record = full.levelUp();
assert.deepEqual(full.moves, FULL_MOVES);
assert.deepEqual(record.pendingMoves, ['Steam Jet']);
full.learnMove('Steam Jet', 1);
assert.deepEqual(full.moves, ['Ram', 'Steam Jet', 'Coal Throw', 'Pressure Blast']);
assert.equal(full.movePP['Smoke Screen'], undefined, 'forgotten move drops its PP');
assert.equal(full.movePP['Steam Jet'], MOVES_DB['Steam Jet'].pp);

// A short move list learns at once.
const roomy = new Train(1, 6, ['Ram']);
assert.deepEqual(roomy.levelUp().learnedMoves, ['Steam Jet']);
assert.deepEqual(roomy.moves, ['Ram', 'Steam Jet']);

// Battle: the last kill shows the level-up, offers the swap, then wins.
const hero = new Train(1, 6, [...FULL_MOVES]);
hero.exp = hero.calculateExpForLevel(7) - 1;
const fight = makeBattle(hero);
knockOut(fight.foe, fight.battle);
assert.equal(fight.battle.battleEnded, false, 'victory waits for the level-up messages');
assert.equal(fight.battle.state, CONSTANTS.BATTLE_STATES.MESSAGE);
const text = fight.battle.messages.join('\n');
assert.match(text, /grew to Lv7/);
assert.match(text, /HP \+\d+.*ATK \+\d+.*DEF \+\d+.*SPD \+\d+.*SPC \+\d+/, 'stat increases are listed');
while (fight.battle.state === CONSTANTS.BATTLE_STATES.MESSAGE) fight.battle.handleInput('a');
assert.equal(fight.battle.state, LEARN, 'a full move list asks which move to replace');
fight.battle.handleInput('down');
fight.battle.handleInput('a');
assert.equal(hero.moves[1], 'Steam Jet', 'the chosen slot is replaced');
assert.match(fight.battle.messages.at(-1), /forgot Smoke Screen/i);
while (fight.battle.state === CONSTANTS.BATTLE_STATES.MESSAGE) fight.battle.handleInput('a');
assert.equal(fight.battle.state, CONSTANTS.BATTLE_STATES.VICTORY);
assert.equal(fight.battle.playerWon, true);

// B declines the new move and keeps the old set.
const decliner = new Train(1, 6, [...FULL_MOVES]);
decliner.exp = decliner.calculateExpForLevel(7) - 1;
const declined = makeBattle(decliner);
knockOut(declined.foe, declined.battle);
while (declined.battle.state === CONSTANTS.BATTLE_STATES.MESSAGE) declined.battle.handleInput('a');
declined.battle.handleInput('b');
assert.deepEqual(decliner.moves, FULL_MOVES);
assert.match(declined.battle.messages.at(-1), /did not learn Steam Jet/i);

// A win without a level-up still ends at once.
const plain = new Train(1, 20);
const quick = makeBattle(plain);
knockOut(quick.foe, quick.battle);
assert.equal(quick.battle.state, CONSTANTS.BATTLE_STATES.VICTORY);

// EXP survives save and load.
const saved = new Train(1, 9);
saved.exp += 37;
const loaded = Train.fromJSON(JSON.parse(JSON.stringify(saved.toJSON())));
assert.equal(loaded.exp, saved.exp);
assert.equal(loaded.level, 9);
assert.equal(loaded.expProgress(), saved.expProgress());

console.log('Level-up tests passed');
