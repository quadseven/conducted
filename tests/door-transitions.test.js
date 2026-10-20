const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/map.js', 'js/npcData.js', 'js/world-maps.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const transitions = vm.runInContext(`(() => {
    const pairs = [
        ['PistonTown', 'LabInterior', 10, 5, 4, 9, 10, 6],
        ['PistonTown', 'PlayerHouse', 4, 5, 4, 7, 4, 6],
        ['PistonTown', 'HealingDepot', 16, 6, 4, 7, 16, 7],
        ['PistonTown', 'TrainMart', 4, 12, 4, 7, 4, 13],
        ['PistonTown', 'RivalHouse', 15, 3, 4, 7, 15, 4],
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
    assert.ok(pair.entrance, `outdoor entrance is defined in map metadata for ${pair.outsideId}`);
    assert.ok(pair.exit, `interior exit is generated from reverse metadata for ${pair.outsideId}`);
    assert.equal(pair.exit.to.mapId, pair.outsideId);
    assert.deepEqual([pair.exit.to.x, pair.exit.to.y], [pair.exitX, pair.exitY]);
}
console.log('Door transition tests passed');
