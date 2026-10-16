const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/map.js', 'js/npcData.js', 'js/world-maps.js', 'js/game.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const transitions = vm.runInContext(`(() => {
    const pairs = [
        ['PistonTown', 'LabInterior', 10, 5, 4, 9, 10, 6],
        ['CoalHarbor', 'CoalHarborGym', 5, 12, 7, 14, 5, 13]
    ];
    return pairs.map(([outsideId, insideId, x, y, insideX, insideY, exitX, exitY]) => {
        const outside = WORLD_MAPS[outsideId];
        const inside = WORLD_MAPS[insideId];
        const entrance = outside.warps.find(w => w.from.x === x && w.from.y === y);
        const exit = inside.warps.find(w => w.from.x === insideX && w.from.y === insideY);
        return { entrance, exit, outsideId, exitX, exitY };
    });
})()`, context);

assert.equal(typeof context.addReverseWarp, 'function', 'map.js exposes reverse transition helper');
for (const pair of transitions) {
    assert.ok(pair.entrance, 'outdoor entrance is defined in map metadata');
    assert.ok(pair.exit, 'interior exit is generated from reverse metadata');
    assert.equal(pair.exit.to.mapId, pair.outsideId);
    assert.deepEqual([pair.exit.to.x, pair.exit.to.y], [pair.exitX, pair.exitY]);
}

const game = Object.create(context.Game.prototype);
game.maps = context.WORLD_MAPS;
game.player = { x: 10, y: 5, targetX: 10, targetY: 5, direction: 1, currentMap: 'PistonTown', visitedMaps: ['PistonTown'], isMoving: true, moveProgress: 0.6 };
game.currentMap = context.WORLD_MAPS.PistonTown;
game.checkWarpTransition();
assert.equal(game.currentMap.id, 'LabInterior', 'walking onto the lab door enters its interior');
assert.equal(game.player.currentMap, 'LabInterior');
assert.deepEqual([game.player.x, game.player.y, game.player.targetX, game.player.targetY], [4, 7, 4, 7]);
assert.equal(game.player.direction, 1, 'entry facing follows the interior warp');
assert.equal(game.player.isMoving, false, 'warp cancels movement animation');
assert.ok(game.player.visitedMaps.includes('LabInterior'));
game.player.x = 4;
game.player.y = 9;
game.checkWarpTransition();
assert.equal(game.currentMap.id, 'PistonTown', 'walking through the interior exit returns outside');
assert.deepEqual([game.player.x, game.player.y], [10, 6]);
console.log('Door transition tests passed');
