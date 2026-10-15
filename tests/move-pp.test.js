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

function makeBattle(items = {}) {
    const playerTrain = new Train(1, 5, ['Ram', 'Steam Jet']);
    const foe = new Train(10, 5);
    const player = { items, registerSeen() {} };
    return { playerTrain, battle: new Battle({ player }, [playerTrain], [foe]), player };
}

const { playerTrain, battle } = makeBattle();

const startingPP = playerTrain.movePP[playerTrain.moves[0]];
battle.turnActions = [{ side: 'player', attacker: playerTrain, defender: battle.enemyActive, move: playerTrain.moves[0] }];
battle.processNextAction();
assert.equal(playerTrain.movePP[playerTrain.moves[0]], startingPP - 1, 'using a move spends one PP');

const depleted = makeBattle();
depleted.playerTrain.movePP[depleted.playerTrain.moves[0]] = 0;
depleted.playerTrain.movePP[depleted.playerTrain.moves[1]] = 1;
depleted.battle.state = CONSTANTS.BATTLE_STATES.FIGHT;
depleted.battle.handleFightInput('a');
assert.match(depleted.battle.messages.at(-1), /no pp left/i, 'depleted move reports an error');
assert.equal(depleted.playerTrain.movePP[depleted.playerTrain.moves[0]], 0, 'depleted move does not gain PP');
depleted.battle.handleFightInput('right');
assert.equal(depleted.battle.moveSelection, 1, 'move navigation skips a depleted move');

const exhausted = makeBattle();
for (const move of exhausted.playerTrain.moves) exhausted.playerTrain.movePP[move] = 0;
exhausted.battle.state = CONSTANTS.BATTLE_STATES.FIGHT;
let fallbackMove;
exhausted.battle.executeTurn = move => { fallbackMove = move; };
exhausted.battle.handleFightInput('a');
assert.equal(fallbackMove, 'Struggle', 'all-depleted fallback uses Struggle');
assert.equal(exhausted.playerTrain.movePP.Ram, 0, 'fallback does not mutate a move PP value');

const { playerTrain: etherTrain, battle: etherBattle, player: etherPlayer } = makeBattle({ ether: 2 });
etherTrain.movePP[etherTrain.moves[0]] = 0;
etherBattle.useItem({ name: 'ether' });
assert.equal(etherTrain.movePP[etherTrain.moves[0]], 10, 'Ether restores PP');
etherTrain.movePP[etherTrain.moves[0]] = MOVES_DB[etherTrain.moves[0]].pp - 2;
etherBattle.useItem({ name: 'ether' });
assert.equal(etherTrain.movePP[etherTrain.moves[0]], MOVES_DB[etherTrain.moves[0]].pp, 'Ether cannot exceed maximum PP');
assert.equal(etherPlayer.items.ether, 0, 'Ether is consumed after restoring PP');

console.log('Move PP tests passed');
