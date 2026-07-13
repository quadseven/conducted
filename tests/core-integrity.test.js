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

const report = vm.runInContext(`(() => {
    const species = Object.values(TRAIN_SPECIES);
    const moveNames = new Set(Object.keys(MOVES_DB));
    const missingWarps = [];
    const invalidWarps = [];
    const invalidRosters = [];
    for (const [mapId, map] of Object.entries(WORLD_MAPS)) {
        for (const warp of map.warps || []) {
            const destination = WORLD_MAPS[warp.to.mapId];
            if (!destination) missingWarps.push(mapId + '->' + warp.to.mapId);
            else if (warp.to.x < 0 || warp.to.y < 0 || warp.to.x >= destination.width || warp.to.y >= destination.height) invalidWarps.push(mapId + '->' + warp.to.mapId);
        }
        for (const npc of map.npcs || []) {
            for (const member of npc.party || []) if (!TRAIN_SPECIES[member.speciesId]) invalidRosters.push(npc.id + ':' + member.speciesId);
        }
    }
    return {
        species: species.length,
        normalizedSpecies: Object.keys(TRAIN_DATA).length,
        names: new Set(species.map(train => train.name)).size,
        moves: moveNames.size,
        invalidLearnsets: species.flatMap(train => train.learnset.filter(entry => !moveNames.has(entry.move))),
        types: TRAIN_TYPES.length,
        matchups: Object.values(TYPE_CHART).reduce((sum, row) => sum + Object.keys(row).length, 0),
        stationmasters: NPC_DATA.stationmasters.length,
        elite: NPC_DATA.eliteConductors.length,
        storyEvents: STORY_EVENTS.length,
        specificationMaps: Object.keys(GT_MAPS).length,
        cities: Object.keys(WORLD_MAPS).filter(id => id === 'CoalHarbor' || /^City[2-8]$/.test(id)).length,
        routes: Object.keys(WORLD_MAPS).filter(id => /^Route[1-8]$/.test(id)).length,
        gyms: Object.keys(WORLD_MAPS).filter(id => id === 'CoalHarborGym' || /^Gym[2-8]$/.test(id)).length,
        missingWarps, invalidWarps, invalidRosters
    };
})()`, context);

assert.equal(report.species, 151);
assert.equal(report.normalizedSpecies, 151);
assert.equal(report.names, 151);
assert.equal(report.moves, 50);
assert.equal(report.invalidLearnsets.length, 0);
assert.equal(report.types, 8);
assert.equal(report.matchups, 64);
assert.equal(report.stationmasters, 8);
assert.equal(report.elite, 4);
assert.equal(report.storyEvents, 10);
assert.equal(report.specificationMaps, 25);
assert.equal(report.cities, 8);
assert.equal(report.routes, 8);
assert.equal(report.gyms, 8);
assert.equal(report.missingWarps.length, 0);
assert.equal(report.invalidWarps.length, 0);
assert.equal(report.invalidRosters.length, 0);

global.CONSTANTS = require('../js/constants.js');
global.Utils = require('../js/utils.js');
global.TRAIN_SPECIES = require('../js/train-data.js');
global.MOVES_DB = require('../js/moves.js').MOVES_DB;
const Train = require('../js/train.js');
global.Train = Train;
const Player = require('../js/player.js');
const train = new Train(1, 50);
train.gainStatExp(TRAIN_SPECIES[151]);
const restored = Train.fromJSON(train.toJSON());
assert.equal(restored.evAttack, train.evAttack);
assert.equal(restored.attack, train.attack);
assert.deepEqual(restored.movePP, train.movePP);
const learner = new Train(1, 6, ['Ram', 'Smoke Screen', 'Coal Throw', 'Pressure Blast']);
learner.levelUp();
assert.equal(learner.moves.length, 4);
assert.equal(learner.moves.at(-1), 'Steam Jet');
assert.equal(learner.movePP['Steam Jet'], 20);
const player = new Player();
player.party.push(train);
player.storage.push(new Train(2, 12));
player.registerCaught(1);
player.registerSeen(2);
const restoredPlayer = Player.fromJSON(player.toJSON());
assert.equal(restoredPlayer.storage.length, 1);
assert.equal(restoredPlayer.storage[0].speciesId, 2);
assert.deepEqual(restoredPlayer.caughtSpecies, [1]);
assert.deepEqual(restoredPlayer.seenSpecies, [1, 2]);
assert.equal(Player.fromJSON({ currentMap: 'piston_town' }).currentMap, 'PistonTown');

console.log('Core integrity tests passed', report);
