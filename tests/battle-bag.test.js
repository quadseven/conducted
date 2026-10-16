const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = require('../js/utils.js');
const moveData = require('../js/moves.js');
Object.assign(global, moveData); // MOVES_DB and the damage helpers battle.js calls
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');
const S = CONSTANTS.BATTLE_STATES;

function battle(items, isWild = true) {
  const player = { items, party: [], storage: [], registerSeen() {}, addTrain() { return true; } };
  const b = new Battle({ player }, [new Train(1, 50)], [new Train(10, 2)], isWild);
  b.state = S.MENU;
  return { b, player };
}
// Confirm through animations and messages until the battle hands back control.
function settle(b) {
  for (let i = 0; i < 50 && b.state !== S.MENU && !b.battleEnded; i++) b.handleInput('a');
}
function openBag(b) {
  b.menuSelection = 1;
  b.handleInput('a');
}

// BAG lists owned items with counts, grouped balls -> healing -> status.
const grouped = battle({ antidote: 2, potion: 3, train_ticket: 1, boxcar: 5, super_potion: 1, ether: 0 });
openBag(grouped.b);
assert.equal(grouped.b.state, S.ITEM, 'BAG opens the item submenu');
const list = grouped.b.getUsableItems();
assert.deepEqual(list.map(it => it.name), ['boxcar', 'potion', 'super_potion', 'antidote']);
assert.deepEqual(list.map(it => it.pocket), ['BALLS', 'HEALING', 'HEALING', 'STATUS']);
assert.deepEqual(list.map(it => it.quantity), [5, 3, 1, 2]);

// Navigation follows the 2x2 grid and pages past the first four entries.
grouped.player.items.burn_heal = 1;
grouped.b.handleInput('right');
assert.equal(grouped.b.itemSelection, 1);
grouped.b.handleInput('down');
assert.equal(grouped.b.itemSelection, 3);
grouped.b.handleInput('down');
assert.equal(grouped.b.itemSelection, 4, 'down reaches the second page');
assert.deepEqual(grouped.b.visibleItems().map(it => it.name), ['burn_heal']);
grouped.b.handleInput('down');
assert.equal(grouped.b.itemSelection, 4, 'no wrap past the last item');
grouped.b.handleInput('b');
assert.equal(grouped.b.state, S.MENU, 'B returns to the main battle menu');

// Empty bag reports and returns to the menu.
const empty = battle({ train_ticket: 1 });
openBag(empty.b);
assert.equal(empty.b.state, S.MESSAGE);
settle(empty.b);
assert.equal(empty.b.state, S.MENU);

// Potion heals, is consumed, and the turn resolves back to the menu (wild + trainer).
for (const isWild of [true, false]) {
  const healed = battle({ potion: 2 }, isWild);
  const train = healed.b.playerActive;
  train.currentHP = train.maxHP - 30;
  openBag(healed.b);
  healed.b.handleInput('a');
  assert.equal(train.currentHP, train.maxHP - 10, 'Potion heals 20 HP');
  assert.equal(healed.player.items.potion, 1, 'Potion is consumed');
  settle(healed.b);
  assert.equal(healed.b.state, S.MENU, `returns to menu after use (wild=${isWild})`);
}

// Full HP is a failure: no item spent.
const full = battle({ potion: 1 });
openBag(full.b);
full.b.handleInput('a');
assert.equal(full.player.items.potion, 1);
assert.match(full.b.messages.at(-1), /already full/i);

// Status items cure only their matching condition.
const cured = battle({ antidote: 1, paralyze_heal: 1 });
cured.b.playerActive.status = 'poison';
openBag(cured.b);
cured.b.handleInput('right');
cured.b.handleInput('a');
assert.equal(cured.player.items.paralyze_heal, 1, 'wrong cure is not spent');
assert.equal(cured.b.playerActive.status, 'poison');
assert.match(cured.b.messages.at(-1), /won't have any effect/i);
settle(cured.b);
openBag(cured.b);
cured.b.handleInput('a');
assert.equal(cured.b.playerActive.status, null, 'Antidote cures poison');
assert.equal(cured.player.items.antidote, 0);
console.log('Battle bag tests passed');
