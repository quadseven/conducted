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
  const ids = ['GhostRailGraveyard', 'NuclearStation', 'MonorailMountaintop', 'VictoryRoad'];
  return ids.map(id => {
    const map = WORLD_MAPS[id];
    return { id, map, hasCollision: map && typeof map.isWalkable === 'function',
      hasEncounters: map && (map.encounterTable || map.encounterRange),
      hasNPCs: map && Array.isArray(map.npcs),
      hasInterior: map && map.warps.some(warp => warp.to.mapId !== 'Route6' && warp.to.mapId !== 'Route7' && warp.to.mapId !== 'Route8' && warp.to.mapId !== 'VictoryRoad' && warp.to.mapId !== 'GrandTerminus' && warp.to.mapId !== 'GhostRailGraveyard' && warp.to.mapId !== 'NuclearStation' && warp.to.mapId !== 'MonorailMountaintop'),
      linksForward: map && map.warps.some(warp => ['Route7', 'Route8', 'VictoryRoad', 'GrandTerminus'].includes(warp.to.mapId)) };
  });
})()`, context);

for (const area of result) {
  assert.ok(area.map, `${area.id} exists`);
  assert.equal(area.hasCollision, true, `${area.id} defines collision`);
  assert.ok(area.hasEncounters, `${area.id} has encounter placeholders`);
  assert.equal(area.hasNPCs, true, `${area.id} has NPC spawn metadata`);
}
assert.ok(result[0].map.warps.some(warp => warp.to.mapId === 'GhostCrypt'), 'graveyard connects to its crypt');
assert.ok(result[1].map.warps.some(warp => warp.to.mapId === 'NuclearResearchLab'), 'station connects to its lab');
assert.ok(result[1].map.warps.some(warp => warp.to.mapId === 'RadioactiveCaves'), 'station connects to its caverns');
assert.ok(result[2].map.warps.some(warp => warp.to.mapId === 'MonorailSummit'), 'mountaintop connects to the summit platform');
assert.ok(result[3].map.warps.some(warp => warp.to.mapId === 'GrandTerminus'), 'Victory Road connects to the Elite Four hub');
assert.ok(context.WORLD_MAPS.GhostCrypt && context.WORLD_MAPS.NuclearResearchLab && context.WORLD_MAPS.RadioactiveCaves && context.WORLD_MAPS.MonorailSummit, 'multi-room interiors exist');
assert.ok(context.WORLD_MAPS.GhostCrypt.npcs.some(npc => npc.type === 'encounter_marker' && npc.id === 'old_iron_encounter'), 'Old Iron encounter point is marked for future scripting');
console.log('Late-game area tests passed');
