const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of [
    'js/constants.js', 'js/utils.js', 'js/types.js', 'js/moves.js',
    'js/train-data.js', 'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/world-maps.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const result = vm.runInContext(`(() => {
    const exterior = WORLD_MAPS.CoalHarbor;
    const destinations = ['CoalDepot', 'CoalMart', 'CoalHarborGym'];
    return destinations.map(id => {
        const entry = exterior.warps.find(warp => warp.to.mapId === id);
        const interior = WORLD_MAPS[id];
        const exit = interior.warps[0];
        return {
            id,
            entry,
            interior,
            exit,
            npc: interior.npcs.find(npc => npc.type === 'gym_leader' || npc.type === 'healer' || npc.type === 'npc'),
            doorWalkable: interior.isWalkable(exit.from.x, exit.from.y),
            leaderApproachWalkable: id !== 'CoalHarborGym' || interior.isWalkable(7, 3)
        };
    });
})()`, context);

assert.deepEqual(Array.from(result, item => item.id), ['CoalDepot', 'CoalMart', 'CoalHarborGym']);
for (const item of result) {
    assert.ok(item.interior, `${item.id} must be registered`);
    assert.ok(item.entry, `${item.id} must have an exterior entrance`);
    assert.ok(item.npc, `${item.id} must place its key NPC`);
    assert.equal(item.exit.to.mapId, 'CoalHarbor');
    assert.equal(item.exit.to.x, item.entry.from.x);
    assert.equal(item.exit.to.y, item.entry.from.y + 1);
    assert.equal(item.doorWalkable, true);
    assert.equal(item.leaderApproachWalkable, true);
}
assert.notDeepEqual(result[0].interior.tiles, result[1].interior.tiles, 'depot and mart need distinct layouts');
assert.equal(result[2].npc.id, 'gym_leader_marina');
assert.equal(result[2].npc.x, 7);
assert.equal(result[2].npc.y, 2);

console.log('Coal Harbor interior tests passed');
