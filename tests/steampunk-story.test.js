// Tests for Team Steam Punk story event triggers, cutscenes, battles, and save/load state.
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

// 1. Act 1 encounter triggers after earning first 3 badges (dialogue + battle)
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 20)];

  // With fewer than 3 badges, Act 1 does not trigger
  assert.strictEqual(game.player.badges.length, 0);
  assert.strictEqual(game.checkStoryEvents(), false, 'Act 1 does not trigger with 0 badges');

  game.player.earnBadge('Harbor Badge');
  game.player.earnBadge('Circuit Badge');
  assert.strictEqual(game.checkStoryEvents(), false, 'Act 1 does not trigger with 2 badges');

  // Earn third badge
  game.player.earnBadge('Torque Badge');
  assert.strictEqual(game.player.badges.length, 3, 'Player now holds 3 badges');

  // Act 1 triggers
  const triggered = game.checkStoryEvents();
  assert.strictEqual(triggered, true, 'Act 1 triggers after earning 3 badges');
  assert.strictEqual(game.player.storyFlags.steampunk_act1_triggered, true, 'Act 1 trigger flag recorded');
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Game enters cutscene dialogue state');

  // Dialogue contains Steam Punk Grunt dialogue
  const currentDialogue = game.dialogueBox.getCurrentDialogue();
  assert(currentDialogue, 'Cutscene dialogue exists');
  assert.strictEqual(currentDialogue.speaker, 'Steam Punk Grunt', 'Speaker is Steam Punk Grunt');
  assert(currentDialogue.text.includes('three badges') || currentDialogue.text.includes('Team Steam Punk'), 'Dialogue introduces Team Steam Punk');

  // Advance dialogue to initiate battle
  while (game.dialogueBox.isActive()) {
    game.dialogueBox.advance();
  }
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.BATTLE, 'Dialogue transition leads to battle state');
  assert(game.battle, 'Battle instance created');
  assert.strictEqual(game.battle.trainerNPC.name, 'Steam Punk Grunts', 'Opponent is Steam Punk Grunts');
  assert.strictEqual(game.battle.trainerNPC.party.length >= 2, true, 'Grunts have a multi-train team');

  // Win the battle
  game.battle.onVictory();
  assert.strictEqual(game.player.storyFlags.steampunk_act1_complete, true, 'Act 1 marked complete after victory');
  assert.strictEqual(game.player.storyFlags.steampunk_act1_defeated, true, 'Grunts marked defeated');
}

// 2. Act 2 Ghost Graveyard theft attempt and Old Iron unlock
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 35)];
  game.currentMap = game.maps.GhostGraveyard;

  // Act 2 requires Act 1 complete
  assert.strictEqual(game.checkStoryEvents(), false, 'Act 2 does not trigger before Act 1 complete');

  // Complete Act 1
  game.player.earnBadge('Harbor Badge');
  game.player.earnBadge('Circuit Badge');
  game.player.earnBadge('Torque Badge');
  game.player.storyFlags.steampunk_act1_complete = true;

  // Old Iron is locked before Act 2
  assert.strictEqual(game.triggerOldIronEncounter(), false, 'Old Iron is locked before Act 2');

  // Trigger Act 2 at Ghost Graveyard
  const triggered = game.checkStoryEvents();
  assert.strictEqual(triggered, true, 'Act 2 triggers at Ghost Graveyard');
  assert.strictEqual(game.player.storyFlags.steampunk_act2_theft_attempt, true, 'Theft attempt flag set');
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Enters cutscene dialogue');

  const d = game.dialogueBox.getCurrentDialogue();
  assert(d && (d.speaker === 'Steam Punk Ash' || d.speaker === 'Steam Punk Cinder'), 'Cinder and Ash speak');
  assert(d.text.includes('Old Iron') || d.text.includes('winch'), 'Cutscene details the theft attempt');

  // Advance dialogue to start battle
  while (game.dialogueBox.isActive()) {
    game.dialogueBox.advance();
  }
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.BATTLE, 'Transitions to battle');
  assert.strictEqual(game.battle.trainerNPC.name, 'Steam Punk Thieves', 'Opponent is Steam Punk Thieves');

  // Win battle
  game.battle.onVictory();
  assert.strictEqual(game.player.storyFlags.steampunk_act2_complete, true, 'Act 2 complete');
  assert.strictEqual(game.player.storyFlags.old_iron_unlocked, true, 'Old Iron encounter unlocked');

  // Old Iron encounter can now be triggered
  const oldIronTriggered = game.triggerOldIronEncounter();
  assert.strictEqual(oldIronTriggered, true, 'Old Iron encounter triggers successfully');
  while (game.dialogueBox.isActive()) {
    game.dialogueBox.advance();
  }
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.BATTLE, 'Old Iron battle initiates');
  assert.strictEqual(game.battle.trainerNPC.name, 'Old Iron', 'Battling Old Iron');
  assert.strictEqual(game.battle.trainerNPC.party[0].speciesId, 151, 'Old Iron uses legendary species 151');
}

// 3. Act 3 Victory Road power plant showdown and Elite Four stage
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 55)];
  game.currentMap = game.maps.VictoryRoad;

  // Act 3 requires Act 2 complete
  assert.strictEqual(game.checkStoryEvents(), false, 'Act 3 does not trigger before Act 2 complete');

  // Mark Act 1 and Act 2 complete
  game.player.storyFlags.steampunk_act1_complete = true;
  game.player.storyFlags.steampunk_act2_complete = true;

  // Trigger Act 3 in Victory Road
  const triggered = game.checkStoryEvents();
  assert.strictEqual(triggered, true, 'Act 3 showdown triggers in Victory Road');
  assert.strictEqual(game.player.storyFlags.steampunk_act3_triggered, true, 'Act 3 triggered flag set');
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.DIALOGUE, 'Cutscene initiates');

  const d = game.dialogueBox.getCurrentDialogue();
  assert.strictEqual(d.speaker, 'Boss Grease', 'Boss Grease confronts player');
  assert(d.text.includes('power plant') || d.text.includes('generators'), 'Cutscene describes power plant plot');

  // Advance dialogue to start battle
  while (game.dialogueBox.isActive()) {
    game.dialogueBox.advance();
  }
  assert.strictEqual(game.state, ctx.CONSTANTS.STATES.BATTLE, 'Enters boss showdown battle');
  assert.strictEqual(game.battle.trainerNPC.name, 'Boss Grease', 'Opponent is Boss Grease');
  assert.strictEqual(game.battle.trainerNPC.party.length, 3, 'Boss Grease commands full lineup');

  // Win showdown battle
  game.battle.onVictory();
  assert.strictEqual(game.player.storyFlags.steampunk_act3_complete, true, 'Act 3 complete');
  assert.strictEqual(game.player.storyFlags.steampunk_arc_complete, true, 'Team Steam Punk arc concluded');
  assert.strictEqual(game.player.storyFlags.steampunk_defeated, true, 'Team Steam Punk defeated');
  assert.strictEqual(game.player.storyFlags.elite_four_unlocked, true, 'Sets stage for Elite Four');
  assert.strictEqual(game.player.storyFlags.derailDefeated, true, 'Elite Four gate condition satisfied');
}

// 4. Story progression survives save/load cycles
{
  const { ctx, game } = createGameContext();
  game.player.party = [new ctx.Train(1, 50)];
  game.player.earnBadge('Harbor Badge');
  game.player.earnBadge('Circuit Badge');
  game.player.earnBadge('Torque Badge');

  // Complete Act 1, Act 2, and Act 3
  game.player.storyFlags.steampunk_act1_complete = true;
  game.player.storyFlags.steampunk_act2_complete = true;
  game.player.storyFlags.old_iron_unlocked = true;
  game.player.storyFlags.steampunk_act3_complete = true;
  game.player.storyFlags.steampunk_arc_complete = true;
  game.player.storyFlags.elite_four_unlocked = true;

  // Save game
  assert.strictEqual(game.save(), true, 'Save succeeds');

  // Create fresh game and load
  const fresh = createGameContext().game;
  assert.strictEqual(fresh.load(), true, 'Load succeeds');

  // Check persistent flags
  assert.strictEqual(fresh.player.storyFlags.steampunk_act1_complete, true, 'Act 1 flag preserved after load');
  assert.strictEqual(fresh.player.storyFlags.steampunk_act2_complete, true, 'Act 2 flag preserved after load');
  assert.strictEqual(fresh.player.storyFlags.old_iron_unlocked, true, 'Old Iron unlocked flag preserved after load');
  assert.strictEqual(fresh.player.storyFlags.steampunk_act3_complete, true, 'Act 3 flag preserved after load');
  assert.strictEqual(fresh.player.storyFlags.steampunk_arc_complete, true, 'Arc complete flag preserved after load');
  assert.strictEqual(fresh.player.storyFlags.elite_four_unlocked, true, 'Elite four flag preserved after load');

  // Verify Old Iron encounter remains unlocked and usable in fresh game
  const oldIronTriggered = fresh.triggerOldIronEncounter();
  assert.strictEqual(oldIronTriggered, true, 'Old Iron encounter still playable from loaded state');
}

console.log('steampunk-story.test: ok');
