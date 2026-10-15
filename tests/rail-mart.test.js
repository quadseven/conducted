const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {}, warn() {} }, module: undefined };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/items.js', 'js/player.js', 'js/game.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const result = vm.runInContext(`(() => {
    const player = { x: 4, y: 3, direction: CONSTANTS.DIRECTIONS.UP, money: 1000,
        items: { potion: 0, boxcar: 0 },
        spendMoney(amount) { if (this.money < amount) return false; this.money -= amount; return true; },
        addMoney(amount) { this.money += amount; } };
    let game = { player, currentMap: { theme: 'mart', npcs: [{ x: 4, y: 2, type: 'shopkeeper', name: 'Clerk' }] },
        menuOptions: ['SHOP'], menuSelection: 0, shopMode: null, shopSelection: 0,
        shopCategories: ['Trainballs', 'Healing Items', 'Sell Items'],
        shopCapacity: 99,
        state: 'overworld', setState(state) { this.state = state; },
        dialogueBox: { show() {} }, input: { isKeyJustPressed() { return false; }, isVirtualKeyJustPressed() { return false; } } };
    Object.setPrototypeOf(game, Game.prototype);
    Game.prototype.checkNPCInteraction.call(game);
    const opened = { state: game.state, mode: game.shopMode, categories: game.shopCategories };
    game.shopMode = 'buy'; game.shopCategory = 'Trainballs'; game.shopSelection = 0;
    game.input = { isKeyJustPressed(key) { return key === 'Enter'; }, isVirtualKeyJustPressed() { return false; } };
    game.shopItems = Items.shopInventory().map(item => ({ name: item.id, displayName: item.name, price: item.price, category: item.kind === 'capture' ? 'Trainballs' : 'Healing Items' }));
    Game.prototype.updateMenu.call(game);
    const bought = { money: player.money, count: player.items.boxcar, message: player.menuMessage };
    player.items.boxcar = 99;
    game.shopMode = 'buy'; game.shopSelection = 0;
    Game.prototype.updateMenu.call(game);
    const full = player.menuMessage;
    player.items.boxcar = 0;
    player.money = 0;
    game.selectShopEntry(game.shopItems[0]);
    const poor = game.shopMessage;
    player.items.potion = 2;
    player.money = 0;
    game.shopMode = 'sell';
    game.shopSelection = 0;
    game.input = { isKeyJustPressed() { return false; }, isVirtualKeyJustPressed(key) { return key === 'a'; } };
    Game.prototype.updateMenu.call(game);
    return { opened, bought, full, poor, soldCount: player.items.potion, soldMoney: player.money,
        soldMessage: game.shopMessage, categories: game.shopCategories };
})()`, context);

assert.equal(result.opened.state, 'menu', 'interacting with the mart clerk opens the shop');
assert.ok(result.opened.categories.includes('Trainballs'), 'shop offers Trainballs');
assert.ok(result.opened.categories.includes('Healing Items'), 'shop offers healing items');
assert.equal(result.bought.count, 1, 'purchase adds an item');
assert.equal(result.bought.money, 800, 'purchase deducts money');
assert.match(result.full, /full/i, 'full inventory reports feedback');
assert.match(result.poor, /not enough money/i, 'insufficient funds reports feedback');
assert.equal(result.soldCount, 1, 'sale removes one item');
assert.equal(result.soldMoney, 150, 'sale credits half the purchase price');
assert.match(result.soldMessage, /sold potion/i, 'sale reports feedback');
console.log('Rail Mart tests passed');
