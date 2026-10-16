// Tests for white-out defeat and respawn system (issue #165)
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createGameContext(sharedStore = null) {
  const store = sharedStore || new Map();
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
    const canvas = {
      width: 768,
      height: 672
    };
    const ctx2d = {
      canvas,
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
    };
    canvas.getContext = () => ctx2d;
    return canvas;
  }

  const canvas = mockCanvas();
  const game = new ctx.Game(canvas);
  return { ctx, game, store, operations, mockCanvas };
}

// 1. Defeat in wild battle triggers white-out sequence and loses half money
{
  const { ctx, game } = createGameContext();
  const starter = new ctx.Train(1, 10);
  game.player.party = [starter];
  game.player.money = 800;

  const wildTrain = new ctx.Train(10, 15);
  game.startBattle(wildTrain, false);

  // Faint party through combat damage instead of forcing battle state
  starter.takeDamage(starter.maxHP * 2);
  assert.strictEqual(starter.fainted, true, 'Starter train faints from lethal damage');
  assert.strictEqual(game.player.hasAliveTrain(), false, 'All party trains are fainted');

  // Game update detects the fainted party and initiates defeat handling
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

// 2. Screen fades to white, displays message, and progresses through phases
{
  const { ctx, game, operations } = createGameContext();
  game.player.party = [new ctx.Train(1, 10)];
  game.player.money = 1000;

  game.handleDefeat();

  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.WHITEOUT, 'Enters whiteout state');
  assert.strictEqual(game.whiteoutMessage, 'You blacked out!', 'Whiteout message is set');
  assert.strictEqual(game.whiteoutPhase, 'fade_in', 'Whiteout starts in fade_in phase');
  assert.strictEqual(game.whiteoutAlpha, 0, 'Initial alpha is zero');

  // Progress fade_in phase to message phase
  game.updateWhiteout(0.6);
  assert.strictEqual(game.whiteoutPhase, 'message', 'Transitions to message phase after fade_in');
  assert.strictEqual(game.whiteoutAlpha, 1.0, 'Alpha reaches full opacity');

  // Render whiteout screen during message phase
  operations.length = 0;
  game.renderOverworld = () => {};
  game.render(game.ctx);

  const textCalls = operations.filter(op => op.type === 'fillText');
  const hasBlackoutText = textCalls.some(op => String(op.text).includes('You blacked out!'));
  assert.strictEqual(hasBlackoutText, true, 'Renders "You blacked out!" on screen');

  // Confirm key press triggers fade_out
  game.input.keyJustPressed.Enter = true;
  game.updateWhiteout(0.016);
  assert.strictEqual(game.whiteoutPhase, 'fade_out', 'Confirm input advances to fade_out phase');

  // Complete fade_out phase and return to overworld
  game.updateWhiteout(0.6);
  assert.strictEqual(game.whiteoutAlpha, 0, 'Alpha returns to zero after fade_out');
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.OVERWORLD, 'Transitions back to overworld after fade');

  // Also verify timer-based automatic fade progression without keypress
  game.startWhiteout();
  game.updateWhiteout(3.1);
  assert.strictEqual(game.whiteoutPhase, 'fade_out', 'Timer over 3.0s advances to fade_out');
  game.updateWhiteout(0.6);
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.OVERWORLD, 'Timer progression completes to OVERWORLD');
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
  assert.strictEqual(game.battle.isWild, false, 'Battle is marked as trainer battle');
  assert.strictEqual(game.battle.trainerNPC.id, 'route1_youngster_joey', 'Trainer NPC is attached');

  // Take lethal damage to faint party naturally
  starter.takeDamage(starter.maxHP * 2);
  assert.strictEqual(starter.fainted, true, 'Party train fainted from damage');
  assert.strictEqual(game.player.hasAliveTrain(), false, 'Player party is wiped out');

  game.updateBattle(0.016);

  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.WHITEOUT, 'Trainer defeat triggers whiteout');
  assert.strictEqual(game.player.money, 600, 'Trainer defeat halves money');
  assert.strictEqual(game.player.hasAliveTrain(), true, 'Party trains healed after trainer defeat');
  assert.strictEqual(game.player.currentMap, 'CoalDepot', 'Respawned at CoalDepot');
  assert.strictEqual(game.currentMap.id, 'CoalDepot', 'Map object updated to CoalDepot');
  assert.strictEqual(game.battle, null, 'Battle instance is cleared upon defeat');
}

// 4. Last depot location persists in save data across serialize/deserialize and save/load
{
  const { ctx, game, store, mockCanvas } = createGameContext();
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

  // Test full save to storage
  assert.strictEqual(game.save(), true, 'Game saves successfully');

  // Verify stored payload in storage holds CoalDepot
  const rawSaved = ctx.localStorage.getItem(game.SAVE_KEY);
  assert.ok(rawSaved, 'Save data exists in localStorage');
  const parsedSave = JSON.parse(rawSaved);
  assert.ok(parsedSave.player.lastDepot, 'Payload includes lastDepot');
  assert.strictEqual(parsedSave.player.lastDepot.map, 'CoalDepot', 'Payload stores CoalDepot');

  // Build a fresh game sharing the same storage store
  const freshCanvas = mockCanvas();
  const freshGame = new ctx.Game(freshCanvas);
  assert.strictEqual(freshGame.player.lastDepot.map, 'HealingDepot', 'Fresh game starts with default HealingDepot');
  assert.strictEqual(freshGame.load(), true, 'Game loads successfully from saved data');
  assert.ok(freshGame.player.lastDepot, 'Loaded player has lastDepot');
  assert.strictEqual(freshGame.player.lastDepot.map, 'CoalDepot', 'Loaded player retains CoalDepot as last depot');
  assert.strictEqual(freshGame.player.lastDepot.x, 4, 'Loaded player retains depot x');
  assert.strictEqual(freshGame.player.lastDepot.y, 5, 'Loaded player retains depot y');
}

// 5. Visiting a depot updates lastDepot and speaking to healer heals party
{
  const { ctx, game } = createGameContext();
  assert.strictEqual(game.player.lastDepot.map, 'HealingDepot', 'Initial depot is HealingDepot');

  // Warp into CoalDepot
  game.currentMap = game.maps.CoalHarbor;
  game.player.x = 16;
  game.player.y = 5;
  game.checkWarpTransition();

  assert.strictEqual(game.player.lastDepot.map, 'CoalDepot', 'Warping into CoalDepot updates lastDepot');

  // Talking to healer NPC updates lastDepot and triggers spoken service dialogue
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

  const damagedTrain = new ctx.Train(1, 10);
  damagedTrain.takeDamage(15);
  game.player.party = [damagedTrain];
  assert.strictEqual(damagedTrain.currentHP < damagedTrain.maxHP, true, 'Train is damaged before healing');

  game.maps.CoalDepot.npcs = [{ ...healerNPC, type: 'npc', dialogue: [{ speaker: 'Depot Attendant', text: 'Welcome.' }] }];
  game.player.lastDepot = { map: 'HealingDepot', mapId: 'HealingDepot', x: 3, y: 6 };
  game.checkNPCInteraction();
  assert.strictEqual(game.player.lastDepot.map, 'HealingDepot', 'Ordinary NPC does not update last depot');
  assert.ok(damagedTrain.currentHP < damagedTrain.maxHP, 'Ordinary NPC does not heal the party');

  game.maps.CoalDepot.npcs = [healerNPC];
  game.checkNPCInteraction();

  assert.strictEqual(game.player.lastDepot.map, 'CoalDepot', 'Talking to healer updates lastDepot');
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Healer interaction opens dialogue state');
  assert.strictEqual(game.dialogueBox.isActive(), true, 'Dialogue box is active');
  assert.strictEqual(damagedTrain.currentHP, damagedTrain.maxHP, 'Healer restored train HP to full');
  assert.strictEqual(damagedTrain.fainted, false, 'Train is healthy');

  const dialogue = game.dialogueBox.getCurrentDialogue();
  assert.ok(dialogue, 'Dialogue line is present');
  assert.strictEqual(dialogue.speaker, 'Depot Attendant', 'Speaker matches healer NPC');
  assert.ok(dialogue.text.includes('Train Depot') || dialogue.text.includes('service'), 'Healer dialogue is displayed');
}

// 6. Resilient respawn against undefined, null, or malformed lastDepot
{
  const { ctx, game } = createGameContext();

  // Test missing lastDepot
  game.player.lastDepot = null;
  game.handleDefeat();
  assert.strictEqual(game.player.currentMap, 'HealingDepot', 'Null depot falls back to HealingDepot');
  assert.ok(game.currentMap.isWalkable(game.player.x, game.player.y), 'Player spawns on a walkable tile');

  // Test malformed/corrupted lastDepot with unknown map and invalid coordinates
  game.player.lastDepot = { map: 'UnknownCorruptedMap', x: -50, y: 999 };
  game.handleDefeat();
  assert.ok(game.player.currentMap === 'HealingDepot' || game.player.currentMap === 'PistonTown', 'Invalid map falls back to valid town');
  assert.ok(game.currentMap.isWalkable(game.player.x, game.player.y), 'Player placed on a valid walkable tile');
}

console.log('whiteout-defeat.test: ok');
