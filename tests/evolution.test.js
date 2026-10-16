// Acceptance criteria tests for train evolution triggering and animation (issue #209).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createContext() {
    const store = new Map();
    const ctx = {
        console: { log() {}, error() {}, warn() {} },
        Math, Date, JSON, Object, Array, String, Number, Map, Set,
        Uint32Array, Uint8Array, Int16Array, Float32Array, Error, RangeError,
        Promise, setTimeout, clearTimeout, setInterval, clearInterval,
        localStorage: {
            getItem: k => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: k => store.delete(k)
        }
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
        'js/items.js',
        'js/moves.js',
        'js/train.js',
        'js/evolution.js',
        'js/battle.js',
        'js/player.js',
        'js/game.js'
    ];

    for (const rel of scripts) {
        const full = path.join(__dirname, '..', rel);
        if (fs.existsSync(full)) {
            const code = fs.readFileSync(full, 'utf8');
            vm.runInContext(code, ctx, { filename: rel });
        }
    }
    return { ctx, store };
}

// 1. After level-up, check if train meets evolution conditions
function testEvolutionConditionCheck() {
    const { ctx } = createContext();
    const Train = ctx.Train;

    // Steamini evolves at level 16 to Steamore
    const train = new Train(1, 15);
    assert.equal(train.canEvolve(), false, 'Steamini at Lv15 should not meet evolution conditions');

    // Level up to 16
    train.levelUp();
    assert.equal(train.level, 16, 'Train reaches level 16');
    assert.equal(train.canEvolve(), true, 'Steamini at Lv16 meets evolution conditions');
    assert.equal(train.getEvolutionTarget ? train.getEvolutionTarget() : train.species.evolution.evolvesTo, 2, 'Evolves into species 2 (Steamore)');

    // Item-based condition check
    const mockItemSpecies = {
        id: 999,
        name: 'ItemTrain',
        types: ['ELECTRIC'],
        baseStats: { hp: 50, attack: 50, defense: 50, speed: 50, special: 50 },
        learnset: [],
        evolution: { method: 'item', item: 'thunder_stone', evolvesTo: 1000 }
    };
    ctx.TRAIN_SPECIES[999] = mockItemSpecies;
    const itemTrain = new Train(999, 20);
    assert.equal(itemTrain.canEvolve(), false, 'Item evolution requires item');
    assert.equal(itemTrain.canEvolve({ item: 'water_stone' }), false, 'Wrong item fails');
    assert.equal(itemTrain.canEvolve({ item: 'thunder_stone' }), true, 'Correct item meets condition');

    // Trade-based condition check
    const mockTradeSpecies = {
        id: 998,
        name: 'TradeTrain',
        types: ['STEAM'],
        baseStats: { hp: 50, attack: 50, defense: 50, speed: 50, special: 50 },
        learnset: [],
        evolution: { method: 'trade', evolvesTo: 1001 }
    };
    ctx.TRAIN_SPECIES[998] = mockTradeSpecies;
    const tradeTrain = new Train(998, 25);
    assert.equal(tradeTrain.canEvolve(), false, 'Trade evolution requires trade');
    assert.equal(tradeTrain.canEvolve({ trade: true }), true, 'Trade flag meets condition');
}

// 2. Display "What? [TRAIN] is evolving!" dialogue
function testEvolutionDialogue() {
    const { ctx } = createContext();
    const Train = ctx.Train;
    const Evolution = ctx.Evolution;
    assert.ok(Evolution, 'Evolution class should exist');

    const train = new Train(1, 16);
    const evo = new Evolution(train);
    assert.equal(evo.dialogue, 'What? Steamini is evolving!', 'Initial dialogue must announce evolution');
    assert.ok(evo.getCurrentMessage().includes('What? Steamini is evolving!'), 'Current message displays evolution dialogue');
}

// 3. Allow player to cancel evolution with B button
function testCancelEvolutionWithBButton() {
    const { ctx } = createContext();
    const Train = ctx.Train;
    const Evolution = ctx.Evolution;

    const train = new Train(1, 16);
    const hpBefore = train.maxHP;
    const evo = new Evolution(train);

    assert.equal(evo.state, 'evolving');
    // Player presses B
    const cancelled = evo.handleInput('b');
    assert.equal(cancelled, true, 'B button cancels evolution');
    assert.equal(evo.cancelled, true, 'Evolution is marked cancelled');
    assert.equal(evo.state, 'cancelled', 'State updates to cancelled');
    assert.equal(train.speciesId, 1, 'Train speciesId unchanged after cancel');
    assert.equal(train.species.name, 'Steamini', 'Train name unchanged after cancel');
    assert.equal(train.maxHP, hpBefore, 'Train stats unchanged after cancel');
    assert.equal(evo.dialogue, 'Huh? Steamini stopped evolving!', 'Dialogue acknowledges cancellation');
}

// 4. Display evolution animation sequence (placeholder OK initially)
function testEvolutionAnimationSequence() {
    const { ctx } = createContext();
    const Train = ctx.Train;
    const Evolution = ctx.Evolution;

    const train = new Train(1, 16);
    const evo = new Evolution(train, { duration: 1.0 });

    assert.equal(evo.showNew, false, 'Starts on old form');
    let swapped = false;
    // Step animation frames
    for (let i = 0; i < 10; i++) {
        evo.update(0.08);
        if (evo.showNew) swapped = true;
    }
    assert.equal(swapped, true, 'Animation sequence flickers between forms');
}

// 5. Update train\'s data (stats, sprite, moves) after evolution
function testUpdateTrainDataAfterEvolution() {
    const { ctx } = createContext();
    const Train = ctx.Train;
    const Evolution = ctx.Evolution;

    const train = new Train(1, 16);
    const hpBefore = train.maxHP;
    const attackBefore = train.attack;
    const defenseBefore = train.defense;
    const speedBefore = train.speed;
    const specialBefore = train.special;

    const evo = new Evolution(train);
    // Complete evolution
    const completed = evo.complete();
    assert.equal(completed, true, 'Evolution completes successfully');
    assert.equal(train.speciesId, 2, 'Species ID updated to 2');
    assert.equal(train.species.name, 'Steamore', 'Species updated to Steamore');
    assert.equal(train.nickname, 'Steamore', 'Nickname updated for non-custom nickname');

    // Stats updated (higher stats)
    assert.ok(train.maxHP >= hpBefore, 'HP updated after evolution');
    assert.ok(train.attack > attackBefore, 'Attack increased after evolution');
    assert.ok(train.defense > defenseBefore, 'Defense increased after evolution');
    assert.ok(train.speed > speedBefore, 'Speed increased after evolution');
    assert.ok(train.special > specialBefore, 'Special increased after evolution');

    // Sprite updated
    assert.ok('sprite' in train, 'Train has sprite property');

    // Congratulatory dialogue
    assert.ok(evo.dialogue.includes('Steamore'), 'Dialogue announces evolved form');

    // Custom nickname preserved
    const nicknamedTrain = new Train(1, 16);
    nicknamedTrain.nickname = 'ChooChoo';
    const nicknamedEvo = new Evolution(nicknamedTrain);
    nicknamedEvo.complete();
    assert.equal(nicknamedTrain.speciesId, 2);
    assert.equal(nicknamedTrain.nickname, 'ChooChoo', 'Custom nickname preserved after evolution');
}

// 6. Evolution in Battle workflow (level-up -> trigger -> cancel or complete)
function testBattleEvolutionIntegration() {
    const { ctx } = createContext();
    const Train = ctx.Train;
    const Battle = ctx.Battle;

    // Test Battle triggering evolution after level-up
    const playerTrain = new Train(1, 15);
    const enemyTrain = new Train(4, 50); // High level for lots of EXP
    const battle = new Battle(null, [playerTrain], [enemyTrain], true);

    battle.awardExp(enemyTrain);
    assert.equal(playerTrain.level >= 16, true, 'Player train reached level 16+');
    assert.ok(battle.messages.some(m => m.includes('is evolving!')), 'Battle messages include evolution announcement');

    // Test starting evolution in battle and cancelling with B
    const trainToCancel = new Train(1, 16);
    const cancelBattle = new Battle(null, [trainToCancel], [new Train(4, 5)], true);
    cancelBattle.startEvolution(trainToCancel);
    assert.equal(cancelBattle.state, ctx.CONSTANTS.BATTLE_STATES.EVOLUTION, 'Battle enters EVOLUTION state');
    cancelBattle.handleInput('b');
    assert.equal(trainToCancel.speciesId, 1, 'Cancelled evolution keeps original species');
    assert.equal(cancelBattle.evolution.cancelled, true, 'Evolution was cancelled');

    // Test starting evolution in battle and completing
    const trainToEvolve = new Train(1, 16);
    const evolveBattle = new Battle(null, [trainToEvolve], [new Train(4, 5)], true);
    evolveBattle.startEvolution(trainToEvolve);
    evolveBattle.handleInput('a'); // Confirm/complete
    assert.equal(trainToEvolve.speciesId, 2, 'Completed evolution transforms species');
}

// 7. Evolution persists in save data
function testEvolutionPersistsInSaveData() {
    const { ctx } = createContext();
    const Train = ctx.Train;
    const Player = ctx.Player;
    const Evolution = ctx.Evolution;

    const player = new Player();
    const train = new Train(1, 16);
    player.party.push(train);

    const evo = new Evolution(train);
    evo.complete();
    assert.equal(train.speciesId, 2);

    // Save
    const serialized = player.toJSON();
    assert.equal(serialized.party[0].speciesId, 2, 'Serialized save stores evolved speciesId');

    // Load
    const loadedPlayer = Player.fromJSON(serialized);
    const loadedTrain = loadedPlayer.party[0];
    assert.equal(loadedTrain.speciesId, 2, 'Loaded save restores evolved speciesId');
    assert.equal(loadedTrain.species.name, 'Steamore', 'Loaded save restores evolved species metadata');
    assert.ok(loadedTrain.attack > 0, 'Loaded train has calculated stats');
}

testEvolutionConditionCheck();
testEvolutionDialogue();
testCancelEvolutionWithBButton();
testEvolutionAnimationSequence();
testUpdateTrainDataAfterEvolution();
testBattleEvolutionIntegration();
testEvolutionPersistsInSaveData();

console.log('Evolution tests passed');
