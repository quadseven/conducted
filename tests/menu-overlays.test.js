const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

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

const path = require('node:path');

for (const file of scriptFiles) {
    const filePath = path.join(__dirname, '..', file);
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
}

const Game = sandbox.Game || vm.runInContext('Game', sandbox) || sandbox.module.exports;
const CONSTANTS = sandbox.CONSTANTS || vm.runInContext('CONSTANTS', sandbox);
const Train = sandbox.Train || vm.runInContext('Train', sandbox);
const UI = sandbox.UI || vm.runInContext('UI', sandbox);

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

// Test 1: Start button and mobile menu button open 4-core options menu
function testMenuOpen() {
    const game = createTestGame();
    assert.equal(game.state, CONSTANTS.STATES.OVERWORLD);

    // Simulate pressing start on mobile
    pressKey(game, 'start');
    game.updateOverworld(0.016);
    assert.equal(game.state, CONSTANTS.STATES.MENU, 'start button opens menu');
    assert.deepEqual([...game.menuOptions], ['BAG', 'TRAINS', 'SAVE', 'OPTIONS', 'TRAINDEX'], 'five menu options');
    assert.equal(game.menuOverlay, null, 'no overlay open initially');

    // Dismiss menu
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.state, CONSTANTS.STATES.OVERWORLD, 'B button dismisses menu');

    // Simulate pressing menu on mobile
    pressKey(game, 'menu');
    game.updateOverworld(0.016);
    assert.equal(game.state, CONSTANTS.STATES.MENU, 'menu button opens menu');

    // Dismiss with Escape
    game.input.keyJustPressed['Escape'] = true;
    game.updateMenu();
    assert.equal(game.state, CONSTANTS.STATES.OVERWORLD, 'Escape dismisses menu');

    // Start pressed again dismisses the menu
    pressKey(game, 'start');
    game.updateOverworld(0.016);
    assert.equal(game.state, CONSTANTS.STATES.MENU, 'start reopens menu');
    pressKey(game, 'start');
    game.updateMenu();
    assert.equal(game.state, CONSTANTS.STATES.OVERWORLD, 'start again dismisses menu');
    assert.equal(game.menuOverlay, null, 'overlay state is reset after dismissal');
}

// Test 2: Selecting each of the four core options opens its respective overlay
function testOverlayNavigation() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);

    // Option 0: BAG
    assert.equal(game.menuSelection, 0);
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'BAG', 'BAG overlay opens');
    assert.equal(game.bagMode, 'list');

    // Dismiss BAG overlay back to main menu
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.menuOverlay, null, 'BAG overlay dismisses to menu');
    assert.equal(game.state, CONSTANTS.STATES.MENU);

    // Option 1: TRAINS
    pressKey(game, 'down');
    game.updateMenu();
    assert.equal(game.menuSelection, 1);
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'TRAINS', 'TRAINS overlay opens');

    // Dismiss TRAINS overlay
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.menuOverlay, null, 'TRAINS overlay dismisses to menu');

    // Option 2: SAVE
    pressKey(game, 'down');
    game.updateMenu();
    assert.equal(game.menuSelection, 2);
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'SAVE', 'SAVE overlay opens');

    // Dismiss SAVE overlay
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.menuOverlay, null, 'SAVE overlay dismisses to menu');

    // Option 3: OPTIONS
    pressKey(game, 'down');
    game.updateMenu();
    assert.equal(game.menuSelection, 3);
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'OPTIONS', 'OPTIONS overlay opens');

    // Dismiss OPTIONS overlay
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.menuOverlay, null, 'OPTIONS overlay dismisses to menu');
}

// Test 3: Bag menu allows using items on party members
function testBagUseItem() {
    const game = createTestGame();
    const train = game.player.party[0];
    train.currentHP = 10; // Damaged train
    game.player.items.potion = 2;

    game.setState(CONSTANTS.STATES.MENU);
    pressKey(game, 'a'); // Open BAG
    game.updateMenu();
    assert.equal(game.menuOverlay, 'BAG');
    assert.equal(game.bagMode, 'list');

    // Select potion (index 0)
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.bagMode, 'use_on_train', 'enters train selection for item');

    // Use on party member 0
    pressKey(game, 'a');
    game.updateMenu();
    assert.ok(train.currentHP > 10, 'train is healed by potion');
    assert.equal(game.player.items.potion, 1, 'potion count decremented');
    assert.equal(game.bagMode, 'list', 'returns to item list after use');
}

// Test 4: Trains menu displays stats and moves
function testTrainsMenuStatsAndMoves() {
    const game = createTestGame();
    const train = game.player.party[0];
    assert.ok(train.attack > 0, 'train has attack stat');
    assert.ok(train.defense > 0, 'train has defense stat');
    assert.ok(train.speed > 0, 'train has speed stat');
    assert.ok(train.special > 0, 'train has special stat');
    assert.ok(train.moves.length > 0, 'train has moves');

    game.setState(CONSTANTS.STATES.MENU);
    game.menuSelection = 1; // TRAINS
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'TRAINS');
    assert.equal(game.trainSelection, 0);

    // Verify drawing does not throw
    const ctx = canvasMock.getContext();
    assert.doesNotThrow(() => {
        UI.drawTrainsOverlay(ctx, game.player, game.trainSelection);
    });
}

// Test 5: Save menu triggers manual save
function testSaveMenu() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    game.menuSelection = 2; // SAVE
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'SAVE');

    // Confirm YES (selection 0)
    pressKey(game, 'a');
    game.updateMenu();
    assert.ok(game.saveMessage.includes('saved'), 'save confirmation message shown');

    // Verify save data written
    const saved = localStorageMock.getItem(game.SAVE_KEY);
    assert.ok(saved !== null, 'data was saved to storage');
}

// Test 6: Options exposes audio toggle and text speed placeholder
function testOptionsMenu() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    game.menuSelection = 3; // OPTIONS
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.menuOverlay, 'OPTIONS');

    // Option 0: Audio toggle
    assert.equal(game.optionsSelection, 0);
    const initialMuted = game.audio.muted;
    pressKey(game, 'a');
    game.updateMenu();
    assert.equal(game.audio.muted, !initialMuted, 'audio toggle switches muted state');

    // Option 1: Text speed toggle
    pressKey(game, 'down');
    game.updateMenu();
    assert.equal(game.optionsSelection, 1);
    const initialSpeed = game.textSpeedSetting;
    pressKey(game, 'a');
    game.updateMenu();
    assert.notEqual(game.textSpeedSetting, initialSpeed, 'text speed toggled');
}

// Test 7: Menus dismissed cleanly without breaking overworld input state
function testCleanDismissal() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    game.menuSelection = 0;
    pressKey(game, 'a'); // Open BAG
    game.updateMenu();
    assert.equal(game.menuOverlay, 'BAG');

    // Cancel back to main menu
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.menuOverlay, null);
    assert.equal(game.state, CONSTANTS.STATES.MENU);

    // Cancel back to overworld
    pressKey(game, 'b');
    game.updateMenu();
    assert.equal(game.state, CONSTANTS.STATES.OVERWORLD);
    assert.equal(game.player.isMoving, false);

    // Overworld movement works cleanly afterwards
    pressKey(game, 'right');
    game.updateOverworld(0.016);
    assert.equal(game.player.direction, CONSTANTS.DIRECTIONS.RIGHT);
}

// Test 8: Overlays tolerate empty party slots and an out-of-range selection
function testOverlaysSkipEmptySlots() {
    const game = createTestGame();
    const ctx = canvasMock.getContext();
    game.player.party = [null, new Train(1, 10)];
    assert.doesNotThrow(() => UI.drawTrainsOverlay(ctx, game.player, 0), 'trains overlay skips null slot');
    assert.doesNotThrow(() => UI.drawTrainsOverlay(ctx, game.player, 5), 'trains overlay handles bad selection');
    assert.doesNotThrow(() => UI.drawBagUseOnTrain(ctx, game.player, 1, 'potion'), 'item target skips null slot');
}

// Test 9: Depot menu allows depositing and withdrawing trains
function testDepotMenu() {
    const game = createTestGame();
    game.setState(CONSTANTS.STATES.MENU);
    game.bagMode = 'depot';
    game.trainSelection = 0;

    // Verify drawing does not throw
    const ctx = canvasMock.getContext();
    assert.doesNotThrow(() => UI.drawDepot(ctx, game.player, game.trainSelection), 'depot overlay renders');

    // Navigate to a different train
    game.input.keyJustPressed['ArrowUp'] = true;
    game.updateMenu();
    assert.equal(game.trainSelection, 0, 'train selection does not go negative');
    game.input.keyJustPressed['ArrowUp'] = false;

    // Only one train exists, so down should stay at 0
    game.input.keyJustPressed['ArrowDown'] = true;
    game.updateMenu();
    assert.equal(game.trainSelection, 0, 'can navigate down but stays at 0 when only one train');
    game.input.keyJustPressed['ArrowDown'] = false;

    // Try to deposit the only train - should fail because we need at least one healthy train
    game.input.keyJustPressed['Enter'] = true;
    game.updateMenu();
    assert.ok(game.player.menuMessage.includes('Keep at least one healthy train'), 'depot prevents depositing last train');
    assert.equal(game.player.party.length, 1, 'party train remains');

    // Add a second train to allow deposit
    game.player.party.push(new Train(2, 10));
    game.player.party[1].currentHP = 100; // Ensure healthy

    // Now deposit the first train
    game.input.keyJustPressed['Enter'] = true;
    game.updateMenu();
    // Check party/storage state instead of message (message gets overwritten)
    assert.equal(game.player.party.length, 1, 'party train removed');
    assert.equal(game.player.storage.length, 1, 'storage train added');
    assert.equal(game.player.storage[0].species.id, 1, 'correct train stored');
    assert.equal(game.player.storage[0].level, 10, 'train level preserved');

    // Set trainSelection to point to storage (party.length = 1, so storage starts at index 1)
    game.trainSelection = 1;
    game.input.keyJustPressed['Enter'] = true;
    game.updateMenu();
    // Check state instead of message
    assert.equal(game.player.party.length, 2, 'party train added back');
    assert.equal(game.player.party[1].species.id, 1, 'correct train returned');
    assert.equal(game.player.party[1].level, 10, 'train level preserved');
    assert.equal(game.player.storage.length, 0, 'storage train removed');

    // Close depot menu
    game.input.keyJustPressed['Backspace'] = true;
    game.updateMenu();
    assert.equal(game.bagMode, null, 'depot mode closes');
    assert.equal(game.state, CONSTANTS.STATES.OVERWORLD, 'returns to overworld');
}

testMenuOpen();
testOverlayNavigation();
testBagUseItem();
testTrainsMenuStatsAndMoves();
testSaveMenu();
testOptionsMenu();
testCleanDismissal();
testOverlaysSkipEmptySlots();
testDepotMenu();

console.log('All menu overlay tests passed!');
