'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const saved = new Map();
const context = { console: { log() {}, warn() {}, error() {} }, Math, Date,
  localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) } };
context.window = context;
vm.createContext(context);
for (const file of ['js/constants.js', 'js/utils.js', 'js/types.js', 'js/train-data.js',
  'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/items.js',
  'js/moves.js', 'js/train.js', 'js/battle.js', 'js/player.js', 'js/map.js',
  'js/world-maps.js', 'js/game.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const Game = vm.runInContext('Game', context);
const Player = vm.runInContext('Player', context);
const Train = vm.runInContext('Train', context);
const maps = vm.runInContext('WORLD_MAPS', context);
const directions = context.CONSTANTS.DIRECTIONS;

function gameAt(mapId, npcId, badges = [], flags = {}) {
  const npc = maps[mapId].npcs.find(entry => entry.id === npcId);
  assert.ok(npc, `${npcId} exists on ${mapId}`);
  const game = Object.create(Game.prototype);
  game.maps = maps;
  game.currentMap = maps[mapId];
  game.player = new Player();
  game.player.currentMap = mapId;
  game.player.party = [new Train(1, 50)];
  game.player.badges = badges;
  game.player.storyFlags = flags;
  game.player.x = npc.x;
  game.player.y = npc.y - 1;
  game.player.direction = directions.DOWN;
  game.audio = { playMusic() {} };
  game.dialogueBox = { show(lines, callback) { this.lines = lines; this.callback = callback; } };
  return { game, npc };
}
function interact(game) { game.checkNPCInteraction(); return game.dialogueBox.lines.map(line => line.text).join(' '); }
function finishDialogue(game) { game.dialogueBox.callback(); }

// Act 1 starts only after the third badge and records the grunt victory.
{
  const badges = ['Harbor Badge', 'Circuit Badge', 'Torque Badge'];
  const { game, npc } = gameAt('City3', 'steam_punk_grunts', badges.slice(0, 2));
  assert.match(interact(game), /badge|three/i);
  assert.equal(game.battle, undefined);
  game.player.badges = badges;
  assert.match(interact(game), /Steam Punk/i);
  finishDialogue(game);
  assert.equal(game.state, context.CONSTANTS.STATES.BATTLE);
  game.battle.onVictory();
  assert.equal(game.player.storyFlags.steamPunkAct1Complete, true);
  assert.equal(npc.defeated, true);
}
// Act 2 repels the theft and opens Old Iron only after the battle is won.
{
  const { game } = gameAt('GhostRailGraveyard', 'steam_punk_theft', [], {});
  assert.match(interact(game), /closed|Steam Punk/i);
  assert.equal(game.battle, undefined);
  const lockedIron = gameAt('GhostCrypt', 'old_iron_encounter');
  assert.match(interact(lockedIron.game), /siphon/i);
  assert.equal(lockedIron.game.battle, undefined);
  game.player.storyFlags.steamPunkAct1Complete = true;
  assert.match(interact(game), /Old Iron/i);
  finishDialogue(game);
  assert.equal(game.state, context.CONSTANTS.STATES.BATTLE);
  game.battle.onVictory();
  assert.equal(game.player.storyFlags.steamPunkAct2Complete, true);
  const iron = gameAt('GhostCrypt', 'old_iron_encounter', [], game.player.storyFlags);
  assert.match(interact(iron.game), /Old Iron/i);
  finishDialogue(iron.game);
  assert.equal(iron.game.state, context.CONSTANTS.STATES.BATTLE);
  assert.equal(iron.game.battle.isWild, true);
  assert.equal(iron.game.battle.enemyTrains[0].species.name, 'Old Iron');
}
// Act 3 blocks the League path until the power plant showdown is won.
{
  const flags = { steamPunkAct1Complete: true, steamPunkAct2Complete: true };
  const { game } = gameAt('VictoryRoadPowerPlant', 'boss_grease', ['Crown Badge'], flags);
  const roadExit = { mapId: 'GrandTerminus', x: 6, y: 29 };
  game.currentMap = maps.VictoryRoad;
  assert.equal(game.transitionToMap(roadExit), false);
  assert.equal(game.player.currentMap, 'VictoryRoadPowerPlant');
  game.currentMap = maps.City8;
  assert.equal(game.transitionToMap(roadExit), false);
  game.currentMap = maps.VictoryRoadPowerPlant;
  assert.match(interact(game), /power plant/i);
  finishDialogue(game);
  assert.equal(game.state, context.CONSTANTS.STATES.BATTLE);
  game.battle.onVictory();
  assert.equal(game.player.storyFlags.steamPunkDefeated, true);
  assert.equal(game.save(), true);
  const fresh = gameAt('VictoryRoadPowerPlant', 'boss_grease').game;
  assert.equal(fresh.load(), true);
  assert.equal(fresh.player.storyFlags.steamPunkDefeated, true);
  assert.equal(fresh.player.storyFlags.steamPunkAct1Complete, true);
  assert.equal(fresh.player.storyFlags.steamPunkAct2Complete, true);
  assert.equal(maps.VictoryRoadPowerPlant.npcs.find(n => n.id === 'boss_grease').defeated, true);
  fresh.currentMap = maps.VictoryRoad;
  assert.equal(fresh.transitionToMap(roadExit), true);
  assert.equal(fresh.player.currentMap, 'GrandTerminus');
}
console.log('steam-punk-story.test: ok');
