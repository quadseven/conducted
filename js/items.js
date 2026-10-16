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
 *   kind          - 'heal' | 'pp' | 'capture' | 'status' | 'key'
 *   amount        - for kind 'heal': HP restored
 *   cures         - for kind 'status': the train.status value it clears
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
    antidote: {
        id: 'antidote', name: 'Antidote', price: 100,
        description: 'Cures poison', kind: 'status', cures: 'poison',
        usableInField: false, usableInBattle: true, sold: true
    },
    paralyze_heal: {
        id: 'paralyze_heal', name: 'Paralyze Heal', price: 100,
        description: 'Cures paralysis', kind: 'status', cures: 'paralyze',
        usableInField: false, usableInBattle: true, sold: true
    },
    burn_heal: {
        id: 'burn_heal', name: 'Burn Heal', price: 100,
        description: 'Cures a burn', kind: 'status', cures: 'burn',
        usableInField: false, usableInBattle: true, sold: true
    },
    train_ticket: {
        id: 'train_ticket', name: 'Train Ticket', price: 0,
        description: 'A ticket for the rails', kind: 'key',
        usableInField: false, usableInBattle: false, sold: false
    }
};

// Battle bag pockets, in display order. Kinds not listed here never show in battle.
const BATTLE_POCKETS = { capture: 'BALLS', heal: 'HEALING', pp: 'HEALING', status: 'STATUS' };
const POCKET_ORDER = ['BALLS', 'HEALING', 'STATUS'];

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

    // Bag entries usable inside battle, grouped balls -> healing -> status.
    // Registry order breaks ties inside a pocket.
    battleUsable(player) {
        const rank = (item) => POCKET_ORDER.indexOf(BATTLE_POCKETS[item.kind]);
        return Object.keys(ITEMS)
            .filter(id => player.items[id] > 0 && ITEMS[id].usableInBattle)
            .map(id => ({ ...ITEMS[id], quantity: player.items[id], pocket: BATTLE_POCKETS[ITEMS[id].kind] }))
            .sort((a, b) => rank(a) - rank(b));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ITEMS, Items };
}
