const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of [
    'js/constants.js', 'js/utils.js', 'js/types.js', 'js/moves.js',
    'js/train-data.js', 'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/map.js', 'js/world-maps.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const result = vm.runInContext(`(() => {
    const exterior = WORLD_MAPS.CoalHarbor;
    const destinations = ['CoalDepot', 'CoalMart', 'CoalHarborGym'];
    return { destinations: destinations.map(id => {
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
    }), depots: ['HealingDepot', 'CoalDepot'].map(id => ({ id, interior: WORLD_MAPS[id] })) };
})()`, context);

assert.deepEqual(Array.from(result.destinations, item => item.id), ['CoalDepot', 'CoalMart', 'CoalHarborGym']);
for (const item of result.destinations) {
    assert.ok(item.interior, `${item.id} must be registered`);
    assert.ok(item.entry, `${item.id} must have an exterior entrance`);
    assert.ok(item.npc, `${item.id} must place its key NPC`);
    assert.equal(item.exit.to.mapId, 'CoalHarbor');
    assert.equal(item.exit.to.x, item.entry.from.x);
    assert.equal(item.exit.to.y, item.entry.from.y + 1);
    assert.equal(item.doorWalkable, true);
    assert.equal(item.leaderApproachWalkable, true);
}
assert.notDeepEqual(result.destinations[0].interior.tiles, result.destinations[1].interior.tiles, 'depot and mart need distinct layouts');
assert.equal(result.destinations[2].npc.id, 'gym_leader_marina');
assert.equal(result.destinations[2].npc.x, 7);
assert.equal(result.destinations[2].npc.y, 2);
for (const { id, interior: depot } of result.depots) {
    assert.equal(depot.npcs.filter(npc => npc.type === 'healer').length, 1, `${id} has one healing clerk`);
    assert.ok(depot.npcs.find(npc => npc.type === 'healer').dialogue.length, `${id} clerk has dialogue`);
}

console.log('Coal Harbor interior tests passed');
