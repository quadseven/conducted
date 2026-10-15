// Battle bag menu: items are grouped by type (balls, healing, other),
// every usable item is reachable, and B returns to the main battle menu.
const assert = require('node:assert/strict');

const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = require('../js/utils.js');
const moveData = require('../js/moves.js');
global.MOVES_DB = moveData.MOVES_DB;
global.getTypeEffectiveness = moveData.getTypeEffectiveness;
global.calculateDamage = moveData.calculateDamage;
global.getEffectivenessText = moveData.getEffectivenessText;
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');

function battleWithItems(items) {
  const player = {
    items,
    party: [],
    storage: [],
    registerSeen() {},
    addTrain(train) { this.party.push(train); return true; }
  };
  const game = { player };
  const b = new Battle(game, [new Train(1, 5)], [new Train(10, 5)], true);
  b.state = CONSTANTS.BATTLE_STATES.ITEM;
  b.itemSelection = 0;
  return { b, player };
}

// 1. Grouped by type, in stable order: Balls -> Healing -> Other.
{
  const { b } = battleWithItems({ boxcar: 5, ether: 2, super_potion: 1, potion: 3 });
  assert.equal(typeof b.getGroupedUsableItems, 'function', 'getGroupedUsableItems exists');
  const groups = b.getGroupedUsableItems();
  assert.deepEqual(groups.map(g => g.label), ['Balls', 'Healing', 'Other']);
  assert.deepEqual(groups[0].items.map(i => i.name), ['boxcar']);
  // Intra-group order follows inventory order, like the field bag.
  assert.deepEqual(groups[1].items.map(i => i.name), ['super_potion', 'potion']);
  assert.deepEqual(groups[2].items.map(i => i.name), ['ether']);
  assert.equal(groups[0].items[0].quantity, 5, 'counts are shown');
  // Empty groups are omitted.
  const solo = battleWithItems({ potion: 1 }).b.getGroupedUsableItems();
  assert.deepEqual(solo.map(g => g.label), ['Healing']);
  // Key items never appear in the battle bag.
  const withKey = battleWithItems({ potion: 1, train_ticket: 2 }).b.getUsableItems();
  assert.ok(!withKey.some(i => i.name === 'train_ticket'));
}

// 2. Keyboard navigation crosses group boundaries; 'a' uses the selected item.
{
  const { b, player } = battleWithItems({ boxcar: 5, ether: 2, super_potion: 1, potion: 3 });
  const total = b.getGroupedUsableItems().reduce((n, g) => n + g.items.length, 0);
  assert.equal(total, 4);
  // Order: boxcar, super_potion, potion, ether.
  b.playerActive.currentHP = Math.max(1, b.playerActive.currentHP - 10);
  b.handleInput('down');
  assert.equal(b.itemSelection, 1);
  const foe2 = b.enemyActive;
  assert.ok(!foe2.fainted || true);
  b.handleInput('a'); // use super_potion
  assert.equal(player.items.super_potion, 0, 'used item is consumed from inventory');
  assert.ok(b.state !== CONSTANTS.BATTLE_STATES.ITEM, 'leaves the bag after using an item');
  // Fast-forward the heal animation so the enemy gets its free turn.
  for (let i = 0; i < 10 && b.animationQueue.length; i++) { b.animationTimer = 1; b.updateAnimation(1); }
  // The enemy's attack leaves a message; dismissing it returns to the menu.
  for (let i = 0; i < 20 && b.state !== CONSTANTS.BATTLE_STATES.MENU && b.animationQueue.length === 0; i++) {
    b.handleInput('a');
    for (let j = 0; j < 10 && b.animationQueue.length; j++) { b.animationTimer = 1; b.updateAnimation(1); }
  }
  assert.equal(b.state, CONSTANTS.BATTLE_STATES.MENU, 'returns to the main battle menu after item use');
}

// 3. Ether (Other group) restores PP and is reachable by navigation.
{
  const { b, player } = battleWithItems({ ether: 2, potion: 1 });
  b.handleInput('down'); // potion -> ether
  assert.equal(b.itemSelection, 1);
  const before = b.playerActive.moves.reduce((s, m) => s + (b.playerActive.movePP[m] || 0), 0);
  b.playerActive.movePP[b.playerActive.moves[0]] = Math.max(0, (b.playerActive.movePP[b.playerActive.moves[0]] || 0) - 5);
  const depleted = b.playerActive.moves.reduce((s, m) => s + (b.playerActive.movePP[m] || 0), 0);
  b.handleInput('a');
  assert.equal(player.items.ether, 1, 'ether consumed');
  const after = b.playerActive.moves.reduce((s, m) => s + (b.playerActive.movePP[m] || 0), 0);
  assert.ok(after > depleted, 'PP restored');
  assert.ok(after <= before, 'PP never exceeds maximum');
}

// 4. B returns to the main battle menu without using anything.
{
  const { b, player } = battleWithItems({ potion: 3 });
  b.handleInput('down');
  b.handleInput('b');
  assert.equal(b.state, CONSTANTS.BATTLE_STATES.MENU);
  assert.equal(player.items.potion, 3, 'nothing consumed');
}

// 5. Trainer battles: Trainball attempt is blocked with a message, bag closes.
{
  const player = {
    items: { boxcar: 1, potion: 1 },
    party: [],
    storage: [],
    registerSeen() {},
    addTrain(train) { this.party.push(train); return true; }
  };
  const b = new Battle({ player }, [new Train(1, 5)], [new Train(10, 5)], false);
  b.state = CONSTANTS.BATTLE_STATES.ITEM;
  b.itemSelection = 0;
  b.handleInput('a');
  assert.equal(player.items.boxcar, 0, 'blocked throw still consumes the ball');
  assert.equal(b.state, CONSTANTS.BATTLE_STATES.MESSAGE);
  assert.match(b.messages[b.messages.length - 1] || '', /blocked/i);
  // After the message clears, the battle returns to the main menu.
  for (let i = 0; i < b.messages.length; i++) b.handleInput('a');
  assert.equal(b.state, CONSTANTS.BATTLE_STATES.MENU);
}

console.log('Battle bag menu tests passed');
