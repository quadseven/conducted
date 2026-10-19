const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/map.js', 'js/npcData.js', 'js/world-maps.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
vm.runInContext(fs.readFileSync('js/player.js', 'utf8'), context, { filename: 'js/player.js' });

const result = vm.runInContext(`(() => {
    const player = new Player();
    const gate = WORLD_MAPS.Route5.techniqueObstacles[0];
    const blocked = !WORLD_MAPS.Route5.isWalkable(gate.x, gate.y, player);
    player.learnTechnique(gate.technique);
    const cleared = WORLD_MAPS.Route5.isWalkable(gate.x, gate.y, player);
    const restored = Player.fromJSON(player.toJSON());
    // Read the rewards off every gym leader the world actually defines, so a
    // reward moved to another gym, or a gate nobody teaches, shows up here.
    const gymRewards = Object.entries(WORLD_MAPS).flatMap(([mapId, map]) => (map.npcs || [])
        .filter(npc => npc.type === 'gym_leader' && npc.techniqueReward)
        .map(npc => ({ mapId, technique: npc.techniqueReward })));
    return { blocked, cleared, restored: restored.hasTechnique(gate.technique), gates: Object.values(WORLD_MAPS).flatMap(map => map.techniqueObstacles || []), gymRewards };
})()`, context);

assert.equal(result.blocked, true, 'a technique gate blocks players who have not learned its technique');
assert.equal(result.cleared, true, 'a technique gate allows players who have learned its technique');
assert.equal(result.restored, true, 'learned techniques persist in saves');
assert.ok(result.gates.length >= 3, 'the overworld defines at least three technique gates');
assert.equal(new Set(result.gates.map(gate => gate.technique)).size >= 3, true);
const taught = new Set(result.gymRewards.map(reward => reward.technique));
for (const gate of result.gates) {
    assert.ok(taught.has(gate.technique), `a gym leader teaches ${gate.technique}, which a technique gate needs`);
}
assert.equal(taught.size, result.gymRewards.length, 'each technique is taught by exactly one gym leader');
assert.deepEqual(
    Array.from(result.gymRewards, reward => `${reward.mapId}:${reward.technique}`).sort(),
    ['CoalHarborGym:Track Clear', 'Gym2:River Ferry', 'Gym3:Tunnel Bore']
);
console.log('Track technique tests passed');
