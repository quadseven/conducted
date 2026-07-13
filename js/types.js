const TRAIN_TYPES = Object.freeze([
    "STEAM", "ELECTRIC", "DIESEL", "MAGLEV",
    "FREIGHT", "PASSENGER", "NUCLEAR", "MONORAIL"
]);

// Rows are attacking types; columns are defending types.
const TYPE_CHART = Object.freeze({
    STEAM: Object.freeze({ STEAM: 0.5, ELECTRIC: 1, DIESEL: 2, MAGLEV: 0.5, FREIGHT: 1, PASSENGER: 1, NUCLEAR: 0.5, MONORAIL: 2 }),
    ELECTRIC: Object.freeze({ STEAM: 2, ELECTRIC: 0.5, DIESEL: 1, MAGLEV: 0.5, FREIGHT: 1, PASSENGER: 2, NUCLEAR: 0.5, MONORAIL: 2 }),
    DIESEL: Object.freeze({ STEAM: 0.5, ELECTRIC: 2, DIESEL: 0.5, MAGLEV: 1, FREIGHT: 2, PASSENGER: 1, NUCLEAR: 1, MONORAIL: 1 }),
    MAGLEV: Object.freeze({ STEAM: 2, ELECTRIC: 2, DIESEL: 1, MAGLEV: 0.5, FREIGHT: 0.5, PASSENGER: 1, NUCLEAR: 1, MONORAIL: 2 }),
    FREIGHT: Object.freeze({ STEAM: 1, ELECTRIC: 1, DIESEL: 0.5, MAGLEV: 2, FREIGHT: 0.5, PASSENGER: 2, NUCLEAR: 1, MONORAIL: 2 }),
    PASSENGER: Object.freeze({ STEAM: 1, ELECTRIC: 0.5, DIESEL: 1, MAGLEV: 2, FREIGHT: 0.5, PASSENGER: 1, NUCLEAR: 2, MONORAIL: 1 }),
    NUCLEAR: Object.freeze({ STEAM: 2, ELECTRIC: 2, DIESEL: 2, MAGLEV: 1, FREIGHT: 1, PASSENGER: 0.5, NUCLEAR: 0.5, MONORAIL: 1 }),
    MONORAIL: Object.freeze({ STEAM: 0.5, ELECTRIC: 0.5, DIESEL: 2, MAGLEV: 0.5, FREIGHT: 2, PASSENGER: 1, NUCLEAR: 2, MONORAIL: 0.5 })
});

function getTypeMultiplier(attackType, defenderTypes) {
    if (!TYPE_CHART[attackType]) throw new RangeError(`Unknown attack type: ${attackType}`);
    const types = Array.isArray(defenderTypes) ? defenderTypes : [defenderTypes];
    return types.filter(Boolean).reduce((total, type) => {
        if (!(type in TYPE_CHART[attackType])) throw new RangeError(`Unknown defense type: ${type}`);
        return total * TYPE_CHART[attackType][type];
    }, 1);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { TRAIN_TYPES, TYPE_CHART, getTypeMultiplier };
}
