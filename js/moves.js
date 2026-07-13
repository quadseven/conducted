const MOVES_DB = Object.freeze({
    "Ram": { type: "PASSENGER", category: "physical", power: 40, accuracy: 100, pp: 35, effect: null },
    "Express Shunt": { type: "PASSENGER", category: "physical", power: 40, accuracy: 100, pp: 30, effect: { priority: 1 } },
    "Full Throttle": { type: "PASSENGER", category: "physical", power: 85, accuracy: 100, pp: 15, effect: { paralyzeChance: 30 } },
    "Emergency Brake": { type: "PASSENGER", category: "status", power: 0, accuracy: 100, pp: 30, effect: { stat: "defense", stages: 1, target: "self" } },
    "Whistle Blast": { type: "PASSENGER", category: "status", power: 0, accuracy: 100, pp: 30, effect: { stat: "defense", stages: -1, target: "enemy" } },
    "Wheel Grind": { type: "PASSENGER", category: "status", power: 0, accuracy: 100, pp: 30, effect: { stat: "speed", stages: -1, target: "enemy" } },
    "Horn Honk": { type: "PASSENGER", category: "status", power: 0, accuracy: 100, pp: 40, effect: { stat: "attack", stages: -1, target: "enemy" } },
    "Track Grease": { type: "PASSENGER", category: "status", power: 0, accuracy: 95, pp: 40, effect: { stat: "accuracy", stages: -1, target: "enemy" } },
    "High Beams": { type: "PASSENGER", category: "status", power: 0, accuracy: 100, pp: 20, effect: { status: "paralyzed", chance: 100 } },
    "Multi-Track Drift": { type: "PASSENGER", category: "physical", power: 15, accuracy: 85, pp: 20, effect: { hits: [2, 5] } },
    "Coupler Crush": { type: "PASSENGER", category: "physical", power: 80, accuracy: 90, pp: 15, effect: { flinchChance: 20 } },
    "Derailment": { type: "PASSENGER", category: "physical", power: 1, accuracy: 90, pp: 10, effect: { fixedDamage: "halfCurrentHp" } },
    "Iron Bumper": { type: "PASSENGER", category: "physical", power: 60, accuracy: 100, pp: 25, effect: { flinchChance: 30 } },
    "Coal Throw": { type: "STEAM", category: "physical", power: 50, accuracy: 95, pp: 25, effect: { burnChance: 10 } },
    "Steam Jet": { type: "STEAM", category: "special", power: 65, accuracy: 100, pp: 20, effect: { burnChance: 20 } },
    "Boiler Burst": { type: "STEAM", category: "special", power: 90, accuracy: 85, pp: 15, effect: { burnChance: 30 } },
    "Pressure Blast": { type: "STEAM", category: "special", power: 110, accuracy: 80, pp: 10, effect: null },
    "Mega Steam": { type: "STEAM", category: "special", power: 150, accuracy: 90, pp: 5, effect: { recoilPercent: 50 } },
    "Smoke Screen": { type: "STEAM", category: "status", power: 0, accuracy: 100, pp: 20, effect: { stat: "accuracy", stages: -1, target: "enemy" } },
    "Spark": { type: "ELECTRIC", category: "physical", power: 40, accuracy: 100, pp: 30, effect: { paralyzeChance: 10 } },
    "Pantograph Spark": { type: "ELECTRIC", category: "special", power: 40, accuracy: 100, pp: 30, effect: { paralyzeChance: 10 } },
    "Charge Beam": { type: "ELECTRIC", category: "special", power: 65, accuracy: 100, pp: 20, effect: { stat: "special", stages: 1, target: "self", chance: 70 } },
    "Third Rail": { type: "ELECTRIC", category: "status", power: 0, accuracy: 100, pp: 20, effect: { status: "paralyzed", chance: 100 } },
    "Rail Gun": { type: "ELECTRIC", category: "special", power: 90, accuracy: 100, pp: 15, effect: null },
    "Lightning Express": { type: "ELECTRIC", category: "special", power: 110, accuracy: 85, pp: 10, effect: null },
    "EMP Blast": { type: "ELECTRIC", category: "special", power: 120, accuracy: 70, pp: 5, effect: { stat: "special", stages: -1, target: "enemy", chance: 100 } },
    "Overload": { type: "ELECTRIC", category: "special", power: 120, accuracy: 70, pp: 10, effect: { paralyzeChance: 30 } },
    "Diesel Spray": { type: "DIESEL", category: "special", power: 55, accuracy: 95, pp: 25, effect: null },
    "Engine Rev": { type: "DIESEL", category: "status", power: 0, accuracy: 100, pp: 30, effect: { stat: "attack", stages: 1, target: "self" } },
    "Fuel Blast": { type: "DIESEL", category: "special", power: 80, accuracy: 100, pp: 15, effect: null },
    "Turbo Charge": { type: "DIESEL", category: "physical", power: 100, accuracy: 95, pp: 10, effect: { recoilPercent: 25 } },
    "Exhaust Fumes": { type: "DIESEL", category: "special", power: 15, accuracy: 100, pp: 35, effect: { poisonChance: 30 } },
    "Cargo Toss": { type: "FREIGHT", category: "physical", power: 50, accuracy: 100, pp: 25, effect: null },
    "Boxcar Bash": { type: "FREIGHT", category: "physical", power: 70, accuracy: 95, pp: 20, effect: null },
    "Container Crush": { type: "FREIGHT", category: "physical", power: 85, accuracy: 100, pp: 15, effect: { flinchChance: 10 } },
    "Freight Frenzy": { type: "FREIGHT", category: "physical", power: 120, accuracy: 100, pp: 10, effect: { rechargeTurns: 1 } },
    "Heavy Haul": { type: "FREIGHT", category: "physical", power: 100, accuracy: 90, pp: 10, effect: { stat: "speed", stages: -1, target: "self", chance: 100 } },
    "Maglev Rush": { type: "MAGLEV", category: "physical", power: 80, accuracy: 100, pp: 15, effect: null },
    "Magnetic Pulse": { type: "MAGLEV", category: "special", power: 90, accuracy: 95, pp: 10, effect: { confuseChance: 20 } },
    "Levitation": { type: "MAGLEV", category: "status", power: 0, accuracy: 100, pp: 30, effect: { stat: "speed", stages: 2, target: "self" } },
    "Sonic Boom": { type: "MAGLEV", category: "special", power: 1, accuracy: 90, pp: 20, effect: { fixedDamage: 20 } },
    "Signal Jam": { type: "MAGLEV", category: "status", power: 0, accuracy: 100, pp: 20, effect: { confuseChance: 100 } },
    "Passenger Rush": { type: "PASSENGER", category: "physical", power: 75, accuracy: 100, pp: 20, effect: null },
    "Express Service": { type: "PASSENGER", category: "physical", power: 60, accuracy: 100, pp: 20, effect: { priority: 1 } },
    "Mono-Strike": { type: "MONORAIL", category: "physical", power: 35, accuracy: 100, pp: 35, effect: { criticalRate: 8 } },
    "Beam Balance": { type: "MONORAIL", category: "status", power: 0, accuracy: 100, pp: 20, effect: { stat: "defense", stages: 2, target: "self" } },
    "Radiation Leak": { type: "NUCLEAR", category: "special", power: 65, accuracy: 100, pp: 20, effect: { poisonChance: 30 } },
    "Reactor Meltdown": { type: "NUCLEAR", category: "special", power: 120, accuracy: 90, pp: 5, effect: { recoilPercent: 33 } },
    "Atomic Flash": { type: "NUCLEAR", category: "special", power: 95, accuracy: 100, pp: 10, effect: { stat: "special", stages: -1, target: "enemy", chance: 30 } },
    "Containment Field": { type: "NUCLEAR", category: "status", power: 0, accuracy: 100, pp: 20, effect: { stat: "special", stages: 2, target: "self" } }
});

function getMove(moveName) {
    return MOVES_DB[moveName] || null;
}

function getTypeEffectiveness(moveType, defenderTypes) {
    if (typeof getTypeMultiplier === "function") return getTypeMultiplier(moveType, defenderTypes);
    const chart = typeof TYPE_CHART !== "undefined" ? TYPE_CHART : CONSTANTS.TYPE_CHART;
    return defenderTypes.reduce((total, type) => total * chart[moveType][type], 1);
}

function calculateDamage(attacker, defender, moveName, options = {}) {
    const move = getMove(moveName);
    if (!move) throw new RangeError(`Unknown move: ${moveName}`);
    if (move.category === "status") return { damage: 0, critical: false, effectiveness: 1, hit: true };
    if (!options.skipAccuracy && Utils.randomInt(1, 100) > move.accuracy) return { damage: 0, critical: false, effectiveness: 1, hit: false };

    const effectiveness = getTypeEffectiveness(move.type, defender.types);
    if (effectiveness === 0) return { damage: 0, critical: false, effectiveness, hit: true };
    if (move.effect && move.effect.fixedDamage === "halfCurrentHp") {
        return { damage: Math.max(1, Math.floor(defender.currentHP / 2)), critical: false, effectiveness, hit: true };
    }
    if (move.effect && Number.isInteger(move.effect.fixedDamage)) {
        return { damage: move.effect.fixedDamage, critical: false, effectiveness, hit: true };
    }

    const physical = move.category === "physical";
    const attack = options.attackStat ?? (physical ? attacker.attack : attacker.special);
    const defense = Math.max(1, options.defenseStat ?? (physical ? defender.defense : defender.special));
    const criticalChance = move.effect && move.effect.criticalRate === 8 ? 50 : 6.25;
    const critical = Math.random() * 100 < criticalChance;
    let damage = Math.floor((Math.floor((2 * attacker.level) / 5 + 2) * move.power * attack / defense) / 50) + 2;
    if (critical) damage *= 2;
    if (attacker.types.includes(move.type)) damage = Math.floor(damage * 1.5);
    damage = Math.floor(damage * effectiveness);
    damage = Math.floor(damage * Utils.randomInt(217, 255) / 255);
    return { damage: Math.max(1, damage), critical, effectiveness, hit: true };
}

function getEffectivenessText(effectiveness) {
    if (effectiveness > 1) return "It's super effective!";
    if (effectiveness === 0) return "It had no effect!";
    if (effectiveness < 1) return "It's not very effective...";
    return "";
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { MOVES_DB, getMove, calculateDamage, getTypeEffectiveness, getEffectivenessText };
}
