const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Mock localStorage for headless Node environment
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

// Create VM context with all browser globals stubbed
const canvasMock = {
    width: 768,
    height: 672,
    getContext: () => ({
        imageSmoothingEnabled: false,
        fillStyle: '#000',
        strokeStyle: '#000',
        lineWidth: 1,
        font: '16px monospace',
        textAlign: 'left',
        fillRect() {},
        strokeRect() {},
        fillText() {},
        measureText: (text) => ({ width: String(text).length * 8 }),
        beginPath() {},
        arc() {},
        stroke() {},
        fill() {},
        moveTo() {},
        lineTo() {},
        arcTo() {},
        closePath() {},
        save() {},
        restore() {}
    })
};

const sandbox = {
    console,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Set,
    Map,
    JSON,
    localStorage: localStorageMock,
    window: {
        addEventListener() {},
        removeEventListener() {},
        innerWidth: 1024,
        innerHeight: 768
    },
    document: {
        getElementById: () => null,
        querySelectorAll: () => []
    },
    navigator: { userAgent: 'Node' },
    Image: class { constructor() { this.src = ''; } },
    module: { exports: {} }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

// Load game scripts in dependency order
const scriptFiles = [
    'js/constants.js',
    'js/utils.js',
    'js/types.js',
    'js/train-data.js',
    'js/trainData.js',
    'js/npcData.js',
    'js/maps.js',
    'js/story.js',
    'js/items.js',
    'js/moves.js',
    'js/train.js',
    'js/battle.js',
    'js/player.js',
    'js/map.js',
    'js/ui.js',
    'js/world-maps.js',
    'js/input.js',
    'js/audio.js',
    'js/game.js'
];

for (const file of scriptFiles) {
    const filePath = path.join(__dirname, '..', file);
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
}

const Game = sandbox.Game || vm.runInContext('Game', sandbox) || sandbox.module.exports;
const CONSTANTS = sandbox.CONSTANTS || vm.runInContext('CONSTANTS', sandbox);
const Train = sandbox.Train || vm.runInContext('Train', sandbox);
const UI = sandbox.UI || vm.runInContext('UI', sandbox);
const TRAIN_SPECIES = sandbox.TRAIN_SPECIES || vm.runInContext('TRAIN_SPECIES', sandbox);

sandbox.Game = Game;
sandbox.CONSTANTS = CONSTANTS;
sandbox.Train = Train;
sandbox.UI = UI;

function createTestGame() {
    localStorageMock.clear();
    const game = new Game(canvasMock);
    game.state = CONSTANTS.STATES.OVERWORLD;
    game.player.currentMap = 'PistonTown';
    game.player.party = [new Train(1, 10)]; // Steamini
    return game;
}

// Release before pressing so a held virtual key registers as a fresh press
function pressKey(game, key) {
    game.input.simulateKeyRelease(key);
    game.input.simulateKeyPress(key);
}

// Test 1: TRAINDEX is one of the pause menu options
function testTraindexMenuOption() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    assert.deepEqual([...game.menuOptions],
        ['BAG', 'TRAINS', 'SAVE', 'OPTIONS', 'TRAINDEX'],
        'menu options include TRAINDEX');
}

// Test 2: Selecting TRAINDEX opens the Traindex overlay
function testTraindexOpens() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    game.menuSelection = game.menuOptions.indexOf('TRAINDEX');
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'TRAINDEX', 'TRAINDEX overlay opens');
    assert.equal(game.traindexSelection, 0, 'traindex selection starts at 0');
}

// Test 3: Traindex lists every species, marking caught ones
function testTraindexList() {
    const game = createTestGame();
    game.player.registerCaught(1); // Steamini
    const list = game.getTraindexList();
    const speciesCount = Object.keys(TRAIN_SPECIES).length;
    assert.equal(list.length, speciesCount, 'one entry per species');
    assert.deepEqual(list.map(e => e.id), list.map(e => e.id).sort((a, b) => a - b),
        'entries sorted by species id');

    const caught = list.find(e => e.id === 1);
    assert.ok(caught.caught, 'registered species is marked caught');
    assert.equal(caught.name, 'Steamini', 'caught entry carries the species name');
    assert.deepEqual([...caught.types], ['STEAM'], 'caught entry carries types');

    const unseen = list.find(e => !e.caught);
    assert.ok(unseen, 'an unseen entry exists');
    assert.equal(unseen.name, null, 'unseen entry hides the name');
}

// Test 4: Traindex navigation clamps and dismisses back to the menu
function testTraindexNavigation() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    game.menuSelection = game.menuOptions.indexOf('TRAINDEX');
    pressKey(game, 'a');
    game.updateMenu();

    const max = game.getTraindexList().length - 1;

    pressKey(game, 'down');
    game.updateMenu();
    assert.equal(game.traindexSelection, 1, 'down moves selection down');

    pressKey(game, 'up');
    game.updateMenu();
    assert.equal(game.traindexSelection, 0, 'up moves selection up');

    pressKey(game, 'up');
    game.updateMenu();
    assert.equal(game.traindexSelection, 0, 'selection does not go negative');

    game.traindexSelection = max;
    pressKey(game, 'down');
    game.updateMenu();
    assert.equal(game.traindexSelection, max, 'selection does not pass the last entry');

    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.menuOverlay, null, 'TRAINDEX dismisses back to main menu');
    assert.equal(game.state, CONSTANTS.STATES.MENU, 'still in menu state after dismiss');
}

// Test 5: UI.drawTraindex renders caught and unseen entries without throwing
function testDrawTraindex() {
    const game = createTestGame();
    game.player.registerCaught(1);
    const list = game.getTraindexList();
    const ctx = canvasMock.getContext();
    assert.equal(typeof UI.drawTraindex, 'function', 'UI.drawTraindex exists');
    assert.doesNotThrow(() => UI.drawTraindex(ctx, game.player, list, 0),
        'draws with a caught selection');
    assert.doesNotThrow(() => UI.drawTraindex(ctx, game.player, list, list.length - 1),
        'draws with an unseen selection');
}

testTraindexMenuOption();
testTraindexOpens();
testTraindexList();
testTraindexNavigation();
testDrawTraindex();

console.log('All traindex tests passed!');
