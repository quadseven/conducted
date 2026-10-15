'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/types.js', 'js/train-data.js', 'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/map.js', 'js/world-maps.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const result = vm.runInContext(`(() => {
  const road = WORLD_MAPS.VictoryRoad;
  const league = WORLD_MAPS.GrandTerminus;
  const elite = NPC_DATA.eliteConductors.map((entry, i) => league.npcs.find(npc => npc.id === entry.id));
  return {
    roadExists: !!road,
    roadExit: road && road.warps.some(warp => warp.to.mapId === 'GrandTerminus'),
    encounters: road && road.encounterTable,
    trainers: road && road.npcs.filter(npc => npc.type === 'trainer').length,
    healer: league.npcs.some(npc => npc.type === 'healer'),
    order: elite.map((npc, i) => npc.requires.includes(i ? 'defeated_' + NPC_DATA.eliteConductors[i - 1].id : 'defeated_rival_blake_4')),
    champion: league.npcs.find(npc => npc.id === 'champion_cypress'),
    credits: STORY_EVENTS.some(event => event.id === 'credits' && event.requires.includes('gameComplete')),
    postgame: STORY_EVENTS.some(event => event.id === 'postgame' && event.requires.includes('epilogueSeen'))
  };
})()`, context);
assert.equal(result.roadExists, true, 'Victory Road map exists');
assert.equal(result.roadExit, true, 'Victory Road connects to Grand Terminus');
assert.ok(result.encounters && result.encounters.length > 0, 'Victory Road has tuned encounters');
assert.ok(result.trainers >= 3, 'Victory Road has a trainer gauntlet');
assert.equal(result.healer, true, 'Elite Four hub provides a healing room');
assert.deepEqual(Array.from(result.order), [true, true, true, true], 'Elite battles require the prior victory');
assert.equal(result.champion.requires.includes('defeated_radia'), true, 'Champion requires all Elite victories');
assert.equal(result.credits, true, 'credits follow the Champion victory');
assert.equal(result.postgame, true, 'post-game content unlocks after credits');
console.log('Victory Road tests passed');
