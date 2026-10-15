// Tests for white-out defeat and respawn system (issue #165)
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createGameContext() {
  const store = new Map();
  const operations = [];
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
    Audio: function () { this.play = () => Promise.resolve(); this.pause = () => {}; },
    addEventListener: () => {},
    removeEventListener: () => {}
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

  ctx.Train = ctx.Train || vm.runInContext('typeof Train !== "undefined" ? Train : undefined', ctx);
  ctx.Player = ctx.Player || vm.runInContext('typeof Player !== "undefined" ? Player : undefined', ctx);
  ctx.Battle = ctx.Battle || vm.runInContext('typeof Battle !== "undefined" ? Battle : undefined', ctx);

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
        fillRect: (x, y, w, h) => operations.push({ type: 'fillRect', x, y, w, h }),
        strokeRect: () => {},
        fillText: (text, x, y) => operations.push({ type: 'fillText', text, x, y }),
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
  return { ctx, game, store, operations };
}

// 1. Defeat in wild battle triggers white-out sequence and loses half money
{
  const { ctx, game } = createGameContext();
  const starter = new ctx.Train(1, 10);
  game.player.party = [starter];
  game.player.money = 800;

  const wildTrain = new ctx.Train(10, 15);
  game.startBattle(wildTrain, false);

  // Faint player party
  starter.currentHP = 0;
  starter.fainted = true;
  game.battle.state = ctx.CONSTANTS.BATTLE_STATES.DEFEAT;
  game.battle.battleEnded = true;

  game.updateBattle(0.016);

  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.WHITEOUT, 'State enters whiteout sequence');
  assert.strictEqual(game.player.money, 400, 'Player loses half their money');
  assert.strictEqual(game.player.hasAliveTrain(), true, 'Party trains are healed');
  assert.strictEqual(starter.currentHP, starter.maxHP, 'Train HP restored to full');
  assert.strictEqual(starter.fainted, false, 'Train is no longer fainted');

  // Verify respawn at default depot (HealingDepot)
  const depot = game.player.lastDepot;
  assert.ok(depot, 'Player has lastDepot recorded');
  const depotMap = depot.map || depot.mapId;
  assert.strictEqual(depotMap, 'HealingDepot', 'Default depot is HealingDepot');
  assert.strictEqual(game.player.currentMap, 'HealingDepot', 'Player currentMap is set to last depot');
  assert.strictEqual(game.currentMap.id, 'HealingDepot', 'Game currentMap object is set to depot map');
}

// 2. Screen fades to white and displays "You blacked out!" message
{
  const { ctx, game, operations } = createGameContext();
  game.player.party = [new ctx.Train(1, 10)];
  game.player.money = 1000;

  game.handleDefeat();

  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.WHITEOUT, 'Enters whiteout state');
  assert.strictEqual(game.whiteoutMessage, 'You blacked out!', 'Whiteout message is set');

  // Render whiteout screen
  operations.length = 0;
  game.render(game.ctx);

  const textCalls = operations.filter(op => op.type === 'fillText');
  const hasBlackoutText = textCalls.some(op => String(op.text).includes('You blacked out!'));
  assert.strictEqual(hasBlackoutText, true, 'Renders "You blacked out!" on screen');

  // Progress fade to overworld
  game.input.pressKey = () => {};
  game.updateWhiteout(4.0);
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.OVERWORLD, 'Transitions back to overworld after fade');
}

// 3. Defeat in trainer battle triggers white-out sequence and respawns at last visited depot
{
  const { ctx, game } = createGameContext();
  const starter = new ctx.Train(1, 12);
  game.player.party = [starter];
  game.player.money = 1200;

  // Set last visited depot to CoalDepot
  game.player.setLastDepot('CoalDepot', 3, 6, ctx.CONSTANTS.DIRECTIONS.UP);

  const trainerNPC = {
    id: 'route1_youngster_joey',
    name: 'Youngster Joey',
    type: 'trainer',
    party: [{ speciesId: 1, level: 5 }]
  };
  game.startTrainerBattle(trainerNPC);

  starter.currentHP = 0;
  starter.fainted = true;
  game.battle.state = ctx.CONSTANTS.BATTLE_STATES.DEFEAT;
  game.battle.battleEnded = true;

  game.updateBattle(0.016);

  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.WHITEOUT, 'Trainer defeat triggers whiteout');
  assert.strictEqual(game.player.money, 600, 'Trainer defeat halves money');
  assert.strictEqual(game.player.hasAliveTrain(), true, 'Party trains healed after trainer defeat');
  assert.strictEqual(game.player.currentMap, 'CoalDepot', 'Respawned at CoalDepot');
  assert.strictEqual(game.currentMap.id, 'CoalDepot', 'Map object updated to CoalDepot');
}

// 4. Last depot location persists in save data across serialize/deserialize and save/load
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 15)];
  game.player.money = 500;

  // Update last depot
  game.player.setLastDepot('CoalDepot', 4, 5, ctx.CONSTANTS.DIRECTIONS.DOWN);

  const json = game.player.toJSON();
  assert.ok(json.lastDepot, 'lastDepot present in serialized JSON');
  assert.strictEqual(json.lastDepot.map, 'CoalDepot', 'Correct map serialized');
  assert.strictEqual(json.lastDepot.x, 4, 'Correct x serialized');
  assert.strictEqual(json.lastDepot.y, 5, 'Correct y serialized');

  const restoredPlayer = ctx.Player.fromJSON(json);
  assert.ok(restoredPlayer.lastDepot, 'lastDepot restored from JSON');
  assert.strictEqual(restoredPlayer.lastDepot.map, 'CoalDepot', 'Correct map deserialized');
  assert.strictEqual(restoredPlayer.lastDepot.x, 4, 'Correct x deserialized');
  assert.strictEqual(restoredPlayer.lastDepot.y, 5, 'Correct y deserialized');

  // Test full save and load
  assert.strictEqual(game.save(), true, 'Game saves successfully');

  const fresh = createGameContext().game;
  assert.strictEqual(fresh.load(), true, 'Game loads successfully');
  assert.ok(fresh.player.lastDepot, 'Loaded player has lastDepot');
  assert.strictEqual(fresh.player.lastDepot.map, 'CoalDepot', 'Loaded player retains CoalDepot as last depot');
}

// 5. Visiting a depot updates lastDepot
{
  const { ctx, game } = createGameContext();
  assert.strictEqual(game.player.lastDepot.map, 'HealingDepot', 'Initial depot is HealingDepot');

  // Warp into CoalDepot
  game.currentMap = game.maps.CoalHarbor;
  game.player.x = 16;
  game.player.y = 5;
  game.player.isMoving = true;
  game.player.update(0.5); // finish move to trigger justStopped
  game.checkWarpTransition();

  assert.strictEqual(game.player.lastDepot.map, 'CoalDepot', 'Warping into CoalDepot updates lastDepot');

  // Talking to healer NPC updates lastDepot
  const healerNPC = {
    id: 'test_healer',
    name: 'Depot Attendant',
    x: 4,
    y: 2,
    type: 'healer'
  };
  game.maps.CoalDepot.npcs = [healerNPC];
  game.currentMap = game.maps.CoalDepot;
  game.player.currentMap = 'CoalDepot';
  game.player.x = 4;
  game.player.y = 3;
  game.player.direction = ctx.CONSTANTS.DIRECTIONS.UP;
  game.checkNPCInteraction();
  assert.strictEqual(game.player.lastDepot.map, 'CoalDepot', 'Talking to healer updates lastDepot');
}

console.log('whiteout-defeat.test: ok');
