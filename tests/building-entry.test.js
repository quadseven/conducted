'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CONSTANTS = require('../js/constants.js');
const Game = require('../js/game.js');
const Player = require('../js/player.js');

global.CONSTANTS = CONSTANTS;
const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/types.js', 'js/train-data.js',
    'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/map.js', 'js/world-maps.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const WORLD_MAPS = vm.runInContext('WORLD_MAPS', context);

function gameAt(mapId, x, y) {
    const game = Object.create(Game.prototype);
    game.maps = WORLD_MAPS;
    game.currentMap = WORLD_MAPS[mapId];
    game.player = new Player();
    game.player.currentMap = mapId;
    game.player.x = x;
    game.player.y = y;
    game.player.targetX = x;
    game.player.targetY = y;
    return game;
}

for (const [outside, inside, doorX, doorY, insideX, insideY, returnX, returnY] of [
    ['PistonTown', 'LabInterior', 10, 5, 4, 7, 10, 6],
    ['PistonTown', 'HealingDepot', 16, 6, 3, 6, 16, 7],
    ['PistonTown', 'TrainMart', 4, 12, 3, 6, 4, 13],
    ['CoalHarbor', 'CoalHarborGym', 5, 12, 7, 13, 5, 13]
]) {
    const game = gameAt(outside, doorX, doorY + 1);
    const interior = WORLD_MAPS[inside];
    const exit = interior.warps.find(warp => warp.to.mapId === outside);

    assert.equal(game.currentMap.getTile(doorX, doorY), 12, `${inside} has an exterior door`);
    assert.ok(exit, `${inside} has an exit`);
    assert.equal(interior.getTile(exit.from.x, exit.from.y), 12, `${inside} exit is a door tile`);
    assert.equal(game.tryMovePlayer(CONSTANTS.DIRECTIONS.UP), true, `${inside} entry succeeds`);
    assert.equal(game.currentMap, interior, `${inside} loads immediately`);
    assert.equal(game.player.currentMap, inside);
    assert.deepEqual([game.player.x, game.player.y, game.player.targetX, game.player.targetY],
        [insideX, insideY, insideX, insideY]);
    assert.equal(game.player.isMoving, false);
    assert.equal(game.player.direction, CONSTANTS.DIRECTIONS.UP, `${inside} entry faces inward`);

    game.player.x = exit.from.x;
    game.player.y = exit.from.y - 1;
    game.player.targetX = game.player.x;
    game.player.targetY = game.player.y;
    assert.equal(game.tryMovePlayer(CONSTANTS.DIRECTIONS.DOWN), true, `${inside} exit succeeds`);
    assert.equal(game.currentMap, WORLD_MAPS[outside]);
    assert.equal(game.player.currentMap, outside);
    assert.deepEqual([game.player.x, game.player.y, game.player.targetX, game.player.targetY],
        [returnX, returnY, returnX, returnY]);
    assert.equal(game.player.isMoving, false);
    assert.equal(game.player.direction, CONSTANTS.DIRECTIONS.DOWN, `${inside} exit faces away from door`);
}

const moving = gameAt('PistonTown', 10, 6);
moving.player.isMoving = true;
assert.equal(moving.tryMovePlayer(CONSTANTS.DIRECTIONS.UP), false, 'an active move cannot start a door transition');
assert.equal(moving.currentMap, WORLD_MAPS.PistonTown);

console.log('Building entry tests passed');
