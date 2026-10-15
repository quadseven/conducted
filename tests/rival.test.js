// Test rival Blake encounters across the campaign in Grand Transit.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createGameContext() {
  const store = new Map();
  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Map, Set,
    Uint32Array, Uint8Array, Int16Array, Float32Array, Error, RangeError,
    Promise, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    Image: function () { this.onload = null; this.onerror = null; this.src = ''; },
    Audio: function () { this.play = () => Promise.resolve(); this.pause = () => {}; }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const scripts = [
    'js/constants.js',
    'js/utils.js',
    'js/types.js',
    'js/train-data.js',
    'js/trainData.js',
    'js/npcData.js',
    'js/maps.js',
    'js/story.js',
    'js/items.js',
    'js/moves.js',
    'js/train.js',
    'js/battle.js',
    'js/player.js',
    'js/map.js',
    'js/ui.js',
    'js/intro.js',
    'js/world-maps.js',
    'js/professors_lab.js',
    'js/input.js',
    'js/graphics.js',
    'js/audio.js',
    'js/game.js'
  ];

  for (const rel of scripts) {
    const full = path.join(__dirname, '..', rel);
    const code = fs.readFileSync(full, 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  }

  function mockCanvas() {
    return {
      width: 768,
      height: 672,
      getContext: () => ({
        imageSmoothingEnabled: false,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        measureText: text => ({ width: (text || '').length * 8 }),
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        arcTo: () => {},
        ellipse: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        drawImage: () => {}
      })
    };
  }

  const canvas = mockCanvas();
  const game = new ctx.Game(canvas);
  return { ctx, game, store };
}

// 1. NPC placement and existence at four milestones
{
  const { ctx } = createGameContext();
  const maps = ctx.WORLD_MAPS;

  const blake1 = maps.PistonTown.npcs.find(n => n.id === 'rival_blake_1');
  assert(blake1, 'Blake encounter 1 exists in Piston Town (post-starter)');
  assert.strictEqual(blake1.name, 'Blake');
  assert.strictEqual(blake1.isRival, true);

  const blake2 = maps.Route1.npcs.find(n => n.id === 'rival_blake_2');
  assert(blake2, 'Blake encounter 2 exists in Route 1 (before first badge)');
  assert.strictEqual(blake2.name, 'Blake');
  assert.strictEqual(blake2.isRival, true);

  const blake3 = maps.CoalHarbor.npcs.find(n => n.id === 'rival_blake_3');
  assert(blake3, 'Blake encounter 3 exists in Coal Harbor (S.S. analog)');
  assert.strictEqual(blake3.name, 'Blake');
  assert.strictEqual(blake3.isRival, true);

  const blake4 = maps.GrandTerminus.npcs.find(n => n.id === 'rival_blake_4');
  assert(blake4, 'Blake encounter 4 exists in Grand Terminus (pre-Elite Four)');
  assert.strictEqual(blake4.name, 'Blake');
  assert.strictEqual(blake4.isRival, true);
}

// 2. Scaling parties across encounters and adaptive starter selection
{
  const { ctx, game } = createGameContext();
  const maps = ctx.WORLD_MAPS;
  const blake1 = maps.PistonTown.npcs.find(n => n.id === 'rival_blake_1');
  const blake2 = maps.Route1.npcs.find(n => n.id === 'rival_blake_2');
  const blake3 = maps.CoalHarbor.npcs.find(n => n.id === 'rival_blake_3');
  const blake4 = maps.GrandTerminus.npcs.find(n => n.id === 'rival_blake_4');

  // Party size scaling
  assert.strictEqual(blake1.party.length, 1, 'Stage 1 has 1 train');
  assert.strictEqual(blake2.party.length, 2, 'Stage 2 has 2 trains');
  assert.strictEqual(blake3.party.length, 3, 'Stage 3 has 3 trains');
  assert.strictEqual(blake4.party.length, 5, 'Stage 4 has 5 trains');

  // Level scaling: maximum level increases monotonically
  const maxLvl = npc => Math.max(...npc.party.map(t => t.level));
  assert(maxLvl(blake1) < maxLvl(blake2), 'Level scales from stage 1 to 2');
  assert(maxLvl(blake2) < maxLvl(blake3), 'Level scales from stage 2 to 3');
  assert(maxLvl(blake3) < maxLvl(blake4), 'Level scales from stage 3 to 4');
  assert.strictEqual(maxLvl(blake1), 5, 'Stage 1 max level is 5');
  assert(maxLvl(blake4) >= 50, 'Stage 4 max level is pre-Elite Four caliber (50+)');

  // Adaptive starter selection
  // Player picks Steamini (1) -> Blake picks Electric starter Sparkart (4)
  game.player.party = [new ctx.Train(1, 5)];
  const p1Steam = typeof blake1.getParty === 'function' ? blake1.getParty(game.player) : blake1.party;
  assert.strictEqual(p1Steam[0].speciesId, 4, 'Blake picks Sparkart when player picks Steamini');

  // Player picks Sparkart (4) -> Blake picks Diesel starter Diesling (7)
  game.player.party = [new ctx.Train(4, 5)];
  const p1Elec = typeof blake1.getParty === 'function' ? blake1.getParty(game.player) : blake1.party;
  assert.strictEqual(p1Elec[0].speciesId, 7, 'Blake picks Diesling when player picks Sparkart');

  // Player picks Diesling (7) -> Blake picks Steam starter Steamini (1)
  game.player.party = [new ctx.Train(7, 5)];
  const p1Diesel = typeof blake1.getParty === 'function' ? blake1.getParty(game.player) : blake1.party;
  assert.strictEqual(p1Diesel[0].speciesId, 1, 'Blake picks Steamini when player picks Diesling');
}

// 3. Pre/post dialogue and context-specific revisit dialogue
{
  const { ctx, game } = createGameContext();
  const maps = ctx.WORLD_MAPS;
  const rivals = [
    maps.PistonTown.npcs.find(n => n.id === 'rival_blake_1'),
    maps.Route1.npcs.find(n => n.id === 'rival_blake_2'),
    maps.CoalHarbor.npcs.find(n => n.id === 'rival_blake_3'),
    maps.GrandTerminus.npcs.find(n => n.id === 'rival_blake_4')
  ];

  for (let i = 0; i < rivals.length; i++) {
    const r = rivals[i];
    assert(r.dialogue && r.dialogue.length > 0, `Stage ${i + 1} has pre-battle dialogue`);
    assert(r.defeatDialogue && r.defeatDialogue.length > 0, `Stage ${i + 1} has defeat dialogue`);
    assert(r.lossDialogue && r.lossDialogue.length > 0, `Stage ${i + 1} has loss dialogue`);
    assert(r.revisitDialogue, `Stage ${i + 1} has revisit dialogue definition`);

    const revisit1 = typeof r.revisitDialogue === 'function' ? r.revisitDialogue(game.player) : r.revisitDialogue;
    assert(Array.isArray(revisit1) && revisit1.length > 0, `Stage ${i + 1} produces revisit dialogue`);
  }

  // Revisit dialogue is context-specific based on player milestones
  const blake1 = rivals[0];
  const beforeBadge = blake1.revisitDialogue(game.player);
  game.player.earnBadge('Harbor Badge');
  const afterBadge = blake1.revisitDialogue(game.player);
  assert.notStrictEqual(beforeBadge[0].text, afterBadge[0].text, 'Blake 1 dialogue changes after Harbor Badge');
}

// 4. Fail state handling: losing to Blake causes heal + retry without soft-locking
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 5)];
  game.player.money = 1200;
  const blake1 = ctx.WORLD_MAPS.PistonTown.npcs.find(n => n.id === 'rival_blake_1');

  // Start battle with Blake
  game.startTrainerBattle(blake1);
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.BATTLE);

  // Simulate player defeat
  for (const t of game.player.party) {
    t.currentHP = 0;
    t.fainted = true;
  }
  game.battle.state = ctx.CONSTANTS.BATTLE_STATES.DEFEAT;
  game.battle.battleEnded = true;

  // Run battle update to trigger defeat handler
  game.updateBattle(0.016);

  // Check fail state: party healed, blake NOT defeated, money kept, dialogue shown
  assert.strictEqual(game.player.hasAliveTrain(), true, 'Party is fully healed after rival loss');
  assert.strictEqual(game.player.party[0].currentHP, game.player.party[0].maxHP, 'Starter HP restored');
  assert.strictEqual(blake1.defeated, false, 'Blake remains undefeated to allow retry');
  assert.strictEqual(game.player.money, 1200, 'Money is not halved on rival trial defeat');
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Loss dialogue displays encouraging message');

  // Advance dialogue to return to overworld
  while (game.dialogueBox.isActive()) {
    game.dialogueBox.advance();
  }
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.OVERWORLD, 'Returned to overworld ready to retry');

  // Blake pre-battle dialogue acknowledges retry
  game.player.x = 10;
  game.player.y = 12;
  game.player.direction = ctx.CONSTANTS.DIRECTIONS.DOWN;
  game.checkNPCInteraction();
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Player can talk to Blake to retry');
}

// 5. Save data persistence and progression gating
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 15)];
  const blake1 = ctx.WORLD_MAPS.PistonTown.npcs.find(n => n.id === 'rival_blake_1');

  // Beat Blake 1
  game.startTrainerBattle(blake1);
  game.battle.onVictory();
  assert.strictEqual(blake1.defeated, true, 'Blake 1 defeated');
  assert.strictEqual(game.player.storyFlags.defeated_rival_blake_1, true, 'Story flag recorded');

  // Save game
  assert.strictEqual(game.save(), true, 'Save succeeds');

  // Create a fresh game and load
  const fresh = createGameContext().game;
  assert.strictEqual(fresh.load(), true, 'Load succeeds');
  assert.strictEqual(fresh.player.storyFlags.defeated_rival_blake_1, true, 'Story flag restored');

  // Rehydrate verification on maps
  const loadedBlake1 = fresh.maps.PistonTown.npcs.find(n => n.id === 'rival_blake_1');
  assert.strictEqual(loadedBlake1.defeated, true, 'Blake 1 defeated status restored from save');

  // Revisit dialogue is returned on interaction with defeated Blake
  fresh.player.x = 10;
  fresh.player.y = 12;
  fresh.player.direction = ctx.CONSTANTS.DIRECTIONS.DOWN;
  fresh.checkNPCInteraction();
  assert.strictEqual(fresh.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Revisit dialogue initiates');
  const d = fresh.dialogueBox.getCurrentDialogue();
  assert(d && d.speaker === 'Blake', 'Blake speaks on revisit');
}

console.log('rival.test: ok');
