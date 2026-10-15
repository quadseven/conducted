// Normalized data-layer view of the complete runtime TrainDex.
// train-data.js owns species identity; this file exposes the Phase 1 schema.
const TRAIN_DATA = Object.freeze(Object.fromEntries(
    Object.values(TRAIN_SPECIES).map(species => [species.id, Object.freeze({
        id: species.id,
        name: species.name,
        type1: species.types[0],
        type2: species.types[1] || null,
        baseStats: Object.freeze({
            hp: species.baseStats.hp,
            atk: species.baseStats.attack,
            def: species.baseStats.defense,
            spd: species.baseStats.speed,
            spc: species.baseStats.special
        }),
        evolutionLevel: species.evolution && species.evolution.method === "level" ? species.evolution.level : null,
        evolutionMethod: species.evolution ? species.evolution.method : null,
        evolutionTarget: species.evolution ? species.evolution.evolvesTo : null,
        evolutionChoices: species.evolution && species.evolution.choices ? Object.freeze(species.evolution.choices.map(choice => Object.freeze({ ...choice }))) : Object.freeze([]),
        evolutionForms: species.evolution && species.evolution.forms ? Object.freeze(species.evolution.forms.map(form => Object.freeze({ ...form }))) : Object.freeze([]),
        spritePlaceholder: species.spritePlaceholder || null,
        evolutionItem: species.evolution && species.evolution.method === "item" ? species.evolution.item : null,
        learnset: Object.freeze(species.learnset.map(entry => Object.freeze({ ...entry })))
    })])
));

function getTrainSpecies(id) {
    return TRAIN_DATA[id] || null;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { TRAIN_DATA, getTrainSpecies };
}
