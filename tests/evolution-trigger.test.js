const assert = require('node:assert/strict');
const CONSTANTS = require('../js/constants.js');
global.CONSTANTS = CONSTANTS;
global.Utils = require('../js/utils.js');
const moveData = require('../js/moves.js');
global.MOVES_DB = moveData.MOVES_DB;
global.getTypeEffectiveness = moveData.getTypeEffectiveness;
global.Items = require('../js/items.js').Items;
global.TRAIN_SPECIES = require('../js/train-data.js');
const Train = require('../js/train.js');
const Battle = require('../js/battle.js');

const { MESSAGE, LEARN_MOVE, EVOLUTION, VICTORY } = CONSTANTS.BATTLE_STATES;

// Steamini (1) evolves into Steamore (2) at level 16.
function battleOnTheBrink(level = 15) {
    const hero = new Train(1, level, ['Ram']);
    hero.exp = hero.calculateExpForLevel(level + 1) - 1;
    const foe = new Train(10, 5);
    const caught = [];
    const player = { items: {}, registerSeen() {}, registerCaught: id => caught.push(id) };
    const battle = new Battle({ player }, [hero], [foe]);
    foe.currentHP = 0;
    foe.fainted = true;
    battle.checkBattleEnd();
    return { hero, battle, caught };
}

// Pages through level-up text and declines any move prompt.
function drainMessages(battle) {
    while (battle.state === MESSAGE || battle.state === LEARN_MOVE) {
        battle.handleInput(battle.state === LEARN_MOVE ? 'b' : 'a');
    }
}

// Levelling past the threshold opens the evolution scene before the win.
const evolving = battleOnTheBrink();
assert.equal(evolving.hero.speciesId, 1, 'evolution waits for the scene instead of happening at once');
drainMessages(evolving.battle);
assert.equal(evolving.battle.state, EVOLUTION);
assert.equal(evolving.battle.battleEnded, false, 'victory waits for the evolution');
assert.equal(evolving.battle.getCurrentMessage(), 'What? Steamini is evolving!');

// A starts the animation; it flickers between both forms before finishing.
const { hero, battle, caught } = evolving;
const hpBefore = hero.maxHP;
battle.handleInput('a');
const drawn = new Set();
battle.drawLoco = (ctx, x, y, facing, shown) => drawn.add(shown.speciesId);
const ctx = new Proxy({ canvas: { width: CONSTANTS.CANVAS_WIDTH } }, {
    get: (target, key) => (key in target ? target[key] : () => {}),
    set: () => true,
});
for (let i = 0; i < 30; i++) {
    battle.update(0.1);
    if (battle.state === EVOLUTION) battle.drawEvolution(ctx);
}
assert.deepEqual([...drawn].sort(), [1, 2], 'the placeholder animation shows the old and new forms');
assert.equal(hero.speciesId, 2, 'the train evolves once the animation runs out');
assert.equal(hero.species.name, 'Steamore');
assert.ok(hero.maxHP > hpBefore, 'stats are recalculated for the new form');
assert.equal(battle.getCurrentMessage(), 'Congratulations! Your Steamini evolved into Steamore!');
assert.deepEqual(caught, [2], 'the new form is registered in the Traindex');
drainMessages(battle);
assert.equal(battle.state, VICTORY);
assert.equal(battle.battleEnded, true);

// The evolved form survives a save and load.
const restored = Train.fromJSON(JSON.parse(JSON.stringify(hero.toJSON())));
assert.equal(restored.speciesId, 2);
assert.equal(restored.species.name, 'Steamore');
assert.equal(restored.maxHP, hero.maxHP);

// B during the animation stops the evolution and the battle is still won.
const stopped = battleOnTheBrink();
drainMessages(stopped.battle);
stopped.battle.handleInput('a');
stopped.battle.update(0.5);
stopped.battle.handleInput('b');
assert.equal(stopped.hero.speciesId, 1, 'a cancelled evolution leaves the train as it was');
assert.equal(stopped.battle.getCurrentMessage(), 'Huh? Steamini stopped evolving!');
stopped.battle.update(10);
assert.equal(stopped.hero.speciesId, 1, 'time passing after a cancel does not evolve the train');
drainMessages(stopped.battle);
assert.equal(stopped.battle.state, VICTORY);

// B on the announcement cancels too.
const declined = battleOnTheBrink();
drainMessages(declined.battle);
declined.battle.handleInput('b');
assert.equal(declined.hero.speciesId, 1);
assert.equal(declined.battle.getCurrentMessage(), 'Huh? Steamini stopped evolving!');

// A form that learns a move at this level learns it on evolving.
TRAIN_SPECIES[2].learnset.push({ level: 16, move: 'Mega Steam' });
const learner = battleOnTheBrink();
drainMessages(learner.battle);
learner.battle.handleInput('a');
learner.battle.update(10);
assert.ok(learner.hero.moves.includes('Mega Steam'), 'the new form learns its move for the current level');
assert.ok(learner.battle.messages.includes('Steamore learned Mega Steam!'));
TRAIN_SPECIES[2].learnset.pop();

// A win with no level-up does not trigger evolution, so a cancelled one
// waits for the next level.
const idle = new Train(1, 20, ['Ram']);
idle.exp = idle.calculateExpForLevel(20);
const foe = new Train(10, 2);
const quiet = new Battle({ player: { items: {}, registerSeen() {} } }, [idle], [foe]);
foe.currentHP = 0;
foe.fainted = true;
quiet.checkBattleEnd();
drainMessages(quiet);
assert.equal(idle.level, 20, 'the win did not level the train up');
assert.equal(quiet.state, VICTORY);
assert.equal(idle.speciesId, 1);

console.log('Evolution trigger tests passed');
