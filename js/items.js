/**
 * Items registry - single source of truth for item metadata and effects.
 *
 * Every consumer (shop catalog, field bag, battle item menu) reads from this
 * table instead of hardcoding prices/heal amounts/behaviour. To add an item,
 * add one entry here.
 *
 * Fields:
 *   id            - inventory key (matches Player.items keys)
 *   name          - display name
 *   price         - shop buy price (0 = not sold)
 *   description   - short blurb for shop/bag UI
 *   kind          - 'heal' | 'pp' | 'capture' | 'key'
 *   amount        - for kind 'heal': HP restored
 *   usableInField - can be used from the pause-menu bag
 *   usableInBattle- can be used from the battle item menu
 *   sold          - appears in the shop
 */
const ITEMS = {
    potion: {
        id: 'potion', name: 'Potion', price: 300,
        description: 'Heals 20 HP', kind: 'heal', amount: 20,
        usableInField: true, usableInBattle: true, sold: true
    },
    super_potion: {
        id: 'super_potion', name: 'Super Potion', price: 700,
        description: 'Heals 50 HP', kind: 'heal', amount: 50,
        usableInField: true, usableInBattle: true, sold: true
    },
    ether: {
        id: 'ether', name: 'Ether', price: 800,
        description: 'Restores 10 PP to each move', kind: 'pp', amount: 10,
        usableInField: true, usableInBattle: true, sold: true
    },
    boxcar: {
        id: 'boxcar', name: 'Boxcar', price: 200,
        description: 'Catches wild trains', kind: 'capture',
        catchMultiplier: 1,
        usableInField: false, usableInBattle: true, sold: true
    },
    train_ticket: {
        id: 'train_ticket', name: 'Train Ticket', price: 0,
        description: 'A ticket for the rails', kind: 'key',
        usableInField: false, usableInBattle: false, sold: false
    }
};

const Items = {
    get(id) {
        return ITEMS[id] || null;
    },

    // Items for sale in the mart, in stable display order.
    shopInventory() {
        return Object.values(ITEMS).filter(item => item.sold);
    },

    // Bag entries the player currently holds that can be used in the field.
    fieldUsable(player) {
        return Object.keys(player.items)
            .filter(id => player.items[id] > 0 && ITEMS[id] && ITEMS[id].usableInField)
            .map(id => ({ ...ITEMS[id], quantity: player.items[id] }));
    },

    // Bag entries usable inside battle (potions + capture).
    battleUsable(player) {
        return Object.keys(player.items)
            .filter(id => player.items[id] > 0 && ITEMS[id] && ITEMS[id].usableInBattle)
            .map(id => ({ ...ITEMS[id], quantity: player.items[id] }));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ITEMS, Items };
}
