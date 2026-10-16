'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/types.js', 'js/train-data.js', 'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/map.js', 'js/world-maps.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const maps = vm.runInContext('WORLD_MAPS', context);
for (const id of ['PistonTown', 'CoalHarbor', 'City2', 'City3', 'City4', 'DieselDen', 'MaglevHeights', 'City7', 'City8']) {
  const townsfolk = maps[id].npcs.filter(npc => npc.type === 'npc' || npc.type === 'trainer');
  assert.ok(townsfolk.length >= 3, `${id} should have at least three town NPCs`);
}
const guide = maps.City2.npcs.find(npc => npc.id === 'city2_guide');
assert.ok(typeof guide.dialogue === 'function');
assert.ok(guide.dialogue({ badges: [], storyFlags: {} }).length >= 2);
// steamPunkDefeated (Team Steam Punk) drives the 'stopped' line; derailDefeated is the separate Team Derail arc and must not.
assert.match(guide.dialogue({ badges: ['Harbor Badge'], storyFlags: { steamPunkDefeated: true, rival_blake_stage: 2 } }).map(line => line.text).join(' '), /1 badge.*Team Steam Punk stopped.*rival/i);
assert.doesNotMatch(guide.dialogue({ badges: [], storyFlags: { derailDefeated: true } }).map(line => line.text).join(' '), /Steam Punk stopped/i);

global.CONSTANTS = require('../js/constants.js');
global.NPC_DATA = vm.runInContext('NPC_DATA', context);
const Game = require('../js/game.js');
function interact(mapId, npcId, player) {
  const npc = maps[mapId].npcs.find(entry => entry.id === npcId);
  const game = Object.create(Game.prototype);
  game.currentMap = maps[mapId];
  game.player = { ...player, x: npc.x, y: npc.y - 1, direction: CONSTANTS.DIRECTIONS.DOWN };
  game.state = CONSTANTS.STATES.OVERWORLD;
  game.dialogueBox = { show(lines, callback) { this.lines = lines; this.callback = callback; } };
  game.save = () => {};
  game.checkNPCInteraction();
  return { game, npc };
}
let { game } = interact('PistonTown', 'piston_courier', { items: { potion: 0 }, badges: [], storyFlags: {} });
assert.equal(game.player.storyFlags.piston_potion_delivery_started, true);
({ game } = interact('PistonTown', 'piston_courier', { items: { potion: 1 }, badges: [], storyFlags: { piston_potion_delivery_started: true } }));
assert.equal(game.player.items.potion, 0);
assert.equal(game.player.items.ether, 1);
assert.equal(game.player.storyFlags.piston_potion_delivery_complete, true);
({ game } = interact('City2', 'copper_signal_keeper', { items: {}, badges: [], storyFlags: {} }));
assert.equal(game.player.storyFlags.copper_signal_challenge_started, true);
({ game } = interact('City2', 'copper_signal_keeper', { items: {}, badges: ['a', 'b', 'c'], storyFlags: { copper_signal_challenge_started: true } }));
assert.equal(game.player.items.super_potion, 1);
assert.equal(game.player.storyFlags.copper_signal_challenge_complete, true);
