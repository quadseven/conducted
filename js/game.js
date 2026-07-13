/**
 * Game - Main game state machine and orchestration
 * Manages transitions between title, intro, overworld, battle states
 */

function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Pixel-art: disable bilinear smoothing so upscaled 16px tiles/sprites stay
    // crisp (matches the stated GB-era art spec).
    this.ctx.imageSmoothingEnabled = false;
    this.state = 'loading'; // Start in loading state

    // Core systems
    this.input = new InputHandler();
    this.player = new Player();
    this.ui = new UI(this.ctx);
    this.dialogueBox = new DialogueBox();
    this.audio = new AudioManager();
    this.audio.load();

    // Map system
    this.currentMap = null;
    this.maps = {}; // Will be populated from createStarterMap() and world-maps.js maps
    this.tilesets = {}; // To store loaded tilesets

    // Scene controllers
    this.introScene = null;
    this.starterSelection = null;
    this.battle = null;

    // Image storage
    this.images = {};
    this.imagesLoaded = false;
    this.loadingProgress = 0;

    // Visual-only flags / animation clocks (no gameplay effect).
    this.debug = false;        // set true to show the Map/Pos developer overlay
    this.animClock = 0;        // seconds, drives subtle idle animations

    // Debug menu
    this.debugMenuSelection = 0;
    this.debugMenuOptions = [
        { label: 'Title Screen', state: CONSTANTS.STATES.TITLE },
        { label: 'Intro', state: CONSTANTS.STATES.INTRO },
        { label: 'Starter Selection', state: CONSTANTS.STATES.STARTER_SELECTION },
        { label: 'Overworld (Piston Town)', state: CONSTANTS.STATES.OVERWORLD },
        { label: 'Wild Battle', action: 'wildBattle' },
        { label: 'Gym Leader Battle', action: 'gymBattle' },
        { label: 'Victory Road (High Lv)', action: 'victoryRoad' },
        { label: 'Heal Party', action: 'heal' },
        { label: 'Close Debug Menu', action: 'close' }
    ];

    // Pause menu system
    this.menuSelection = 0;
    this.menuOptions = ['TRAINDEX', 'TRAINS', 'DEPOT', 'BAG', 'SHOP', 'HEAL', 'SAVE', 'CLOSE'];
    this.bagSelection = 0;
    this.bagMode = null; // null, 'list', or 'use_on_train'
    this.selectedItem = null;
    this.trainSelection = 0;

    // Shop system - catalog derived from the Items registry (single source of
    // truth). UI expects {name, displayName, price, description}.
    this.shopSelection = 0;
    this.shopMode = null;  // null or 'active' when shop is open
    this.shopItems = Items.shopInventory().map(item => ({
        name: item.id,
        displayName: item.name,
        price: item.price,
        description: item.description
    }));

    // Initialize maps and assets
    this.initAssets();


    console.log('✅ Game initialized');
}

Game.prototype.initAssets = async function () {
    console.log('Starting asset loading...');
    try {
        // Setup maps synchronously FIRST
        this.setupMaps();

        // Start sprite loading immediately (non-blocking)
        this.preloadAssets();

        // Start tileset loading (non-blocking)
        this.loadTilesets().then(() => {
            console.log('Tilesets loaded');
        }).catch(e => {
            console.error('Tileset load failed:', e);
        });

    } catch (e) {
        console.error('Error in initAssets:', e);
    }

    // Resolve immediately to let game loop start
    return Promise.resolve();
};

Game.prototype.setupMaps = function () {
    console.log('🗺️ Setting up maps...');
    // Add world maps if available - iterate through ALL maps dynamically
    if (typeof WORLD_MAPS !== 'undefined') {
        for (const mapId in WORLD_MAPS) {
            this.maps[mapId] = WORLD_MAPS[mapId];
        }
    } else {
        console.error('❌ WORLD_MAPS is undefined!');
    }

    // Set current map IMMEDIATELY after populating maps
    if (this.maps['PistonTown']) {
        this.currentMap = this.maps['PistonTown'];
        console.log('✅ Set initial map to PistonTown');
    }
};

Game.prototype.loadTilesets = async function () {
    console.log('🎨 Loading tilesets...');
    // Load all tilesets
    for (const mapId in this.maps) {
        const map = this.maps[mapId];
        if (map.tileset) {
            // console.log(`Loading tileset for ${mapId}: ${map.tileset}`);
            try {
                const tileset = await loadTileset({ src: map.tileset });
                this.tilesets[mapId] = tileset;
                map.tilesetRef = tileset; // Add a direct reference to the map object
                // console.log(`✅ Tileset loaded for ${mapId}`);
            } catch (error) {
                console.error(`❌ Failed to load tileset for ${mapId}:`, error);
            }
        }
    }
    console.log('✅ All tilesets loaded');
};

// Preload the sprites that actually ship as assets. Only the three starter
// species use the {Name}/front.png + back.png layout the battle renderer reads;
// every other train falls back to procedural art. Images load asynchronously
// and are looked up lazily at draw time (sprite.complete is checked there), so
// this never blocks boot - main.js drives the loading -> title transition.
//
// (Replaces the old preloadStarterSprites/initMaps, which referenced an
// undefined `trains` global and a misnamed method, so preloading never ran.)
Game.prototype.preloadAssets = function () {
    const SPRITE_SPECIES = ['Steamini', 'Sparkart', 'Diesling'];

    const load = (key, src) => {
        const img = new Image();
        img.src = src;
        this.images[key] = img;
    };

    for (const name of SPRITE_SPECIES) {
        load(name, `assets/sprites/${name}/front.png`);          // starter-select screen uses [name]
        load(`${name}_front`, `assets/sprites/${name}/front.png`);
        load(`${name}_back`, `assets/sprites/${name}/back.png`);
    }

    this.imagesLoaded = true;
    this.loadingProgress = 1;
};

// Central state transition. Clears any stale "just pressed" input so a key
// buffered during one state can't auto-trigger an action in the next, and runs
// per-state entry setup in one place.
Game.prototype.setState = function (next) {
    this.state = next;
    const music = {
        [CONSTANTS.STATES.TITLE]: 'title',
        [CONSTANTS.STATES.OVERWORLD]: 'overworld',
        [CONSTANTS.STATES.BATTLE]: 'battle',
        [CONSTANTS.STATES.BATTLE_SUMMARY]: 'victory'
    }[next];
    if (music) this.audio.playMusic(music);
    if (this.input) this.input.reset();

    switch (next) {
        case CONSTANTS.STATES.MENU:
            this.menuSelection = 0;
            this.bagMode = null;
            this.shopMode = null;
            this.selectedItem = null;
            break;
        case CONSTANTS.STATES.BATTLE_SUMMARY:
            // caughtTrainResult is set by the caller before transitioning.
            break;
    }
};

Game.prototype.update = function (deltaTime) {
    this.animClock += deltaTime || 0; // visual-only clock for idle animations
    switch (this.state) {
        case 'loading':
            // Images are loading, wait for completion
            break;
        case CONSTANTS.STATES.TITLE:
            this.updateTitle();
            break;
        case CONSTANTS.STATES.INTRO:
            this.updateIntro();
            break;
        case CONSTANTS.STATES.STARTER_SELECTION:
            this.updateStarterSelection();
            break;
        case CONSTANTS.STATES.OVERWORLD:
            this.updateOverworld(deltaTime);
            break;
        case CONSTANTS.STATES.BATTLE:
            this.updateBattle(deltaTime);
            break;
        case CONSTANTS.STATES.BATTLE_SUMMARY:
            this.updateBattleSummary();
            break;
        case CONSTANTS.STATES.MENU:
            this.updateMenu();
            break;
        case CONSTANTS.STATES.DIALOGUE:
            this.updateDialogue(deltaTime);
            break;
        case 'debug':
            this.updateDebugMenu();
            break;
    }
};

Game.prototype.updateDialogue = function (deltaTime) {
    this.dialogueBox.update(deltaTime);

    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        this.dialogueBox.advance();
    }
};

Game.prototype.updateTitle = function () {
    // Debug menu shortcut
    if (this.input.isKeyJustPressed('`') || this.input.isKeyJustPressed('F1')) {
        this.state = 'debug';
        console.log('→ DEBUG MENU');
        return;
    }

    if (this.input.isKeyJustPressed('Enter') || this.input.isVirtualKeyJustPressed('a')) {
        // Resume an existing save straight into the overworld; otherwise start
        // the new-game intro. (We no longer persist `state`, so the decision is
        // made here from whether a save with a party was loaded.)
        if (this.loadedSave && this.player.party && this.player.party.length > 0) {
            this.setState(CONSTANTS.STATES.OVERWORLD);
            console.log('→ OVERWORLD (resumed save)');
        } else {
            this.state = CONSTANTS.STATES.INTRO;
            this.introScene = new IntroScene();
            console.log('→ INTRO');
        }
    }
};

Game.prototype.updateDebugMenu = function () {
    // Navigation
    if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
        this.debugMenuSelection = (this.debugMenuSelection - 1 + this.debugMenuOptions.length) % this.debugMenuOptions.length;
    }
    if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
        this.debugMenuSelection = (this.debugMenuSelection + 1) % this.debugMenuOptions.length;
    }

    // Selection
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        const option = this.debugMenuOptions[this.debugMenuSelection];

        if (option.action === 'close') {
            this.state = CONSTANTS.STATES.TITLE;
            console.log('→ TITLE (from debug menu)');
            return;
        }

        if (option.action === 'wildBattle') {
            // Initialize a wild battle
            this.state = CONSTANTS.STATES.OVERWORLD;
            // Ensure player has a starter
            if (!this.player.party || this.player.party.length === 0) {
                this.player.party = [new Train(1, 5)]; // Steamini (ID 1)
            }
            // Trigger wild encounter
            const wildTrainId = Math.floor(Math.random() * 10) + 1; // Random from IDs 1-10
            const wildTrain = new Train(wildTrainId, 5);
            this.battle = new Battle(this, this.player.party, [wildTrain]);
            this.state = CONSTANTS.STATES.BATTLE;
            console.log('→ WILD BATTLE (debug)');
            return;
        }

        if (option.action === 'gymBattle') {
            this.state = CONSTANTS.STATES.OVERWORLD;
            // Ensure player has a starter
            if (!this.player.party || this.player.party.length === 0) {
                this.player.party = [new Train(1, 15)]; // Steamini Lv 15
            }

            // Find Gym Leader Marina in Coal Harbor Gym data
            // We need to access the map data directly since we might not be in the gym
            const gymMap = this.maps['CoalHarborGym'] || WORLD_MAPS['CoalHarborGym'];
            const marina = gymMap.npcs.find(n => n.id === 'gym_leader_marina');

            if (marina) {
                this.startTrainerBattle(marina);
            } else {
                console.error('Gym Leader Marina not found!');
            }
            return;
        }

        if (option.action === 'victoryRoad') {
            this.state = CONSTANTS.STATES.OVERWORLD;
            if (!this.player.party || this.player.party.length === 0) {
                this.player.party = [new Train(3, 40)]; // Diesling Lv 40
            }
            // High level wild encounter
            const wildTrainId = Math.floor(Math.random() * 5) + 10; // Later IDs
            const wildTrain = new Train(wildTrainId, 45);
            this.battle = new Battle(this, this.player.party, [wildTrain]);
            this.state = CONSTANTS.STATES.BATTLE;
            console.log('→ VICTORY ROAD BATTLE (debug)');
            return;
        }

        if (option.action === 'heal') {
            this.player.healParty();
            console.log('→ PARTY HEALED');
            this.state = CONSTANTS.STATES.OVERWORLD;
            return;
        }

        if (option.state) {
            // Jump to state
            switch (option.state) {
                case CONSTANTS.STATES.TITLE:
                    this.state = CONSTANTS.STATES.TITLE;
                    console.log('→ TITLE (debug)');
                    break;
                case CONSTANTS.STATES.INTRO:
                    this.state = CONSTANTS.STATES.INTRO;
                    this.introScene = new IntroScene();
                    console.log('→ INTRO (debug)');
                    break;
                case CONSTANTS.STATES.STARTER_SELECTION:
                    this.state = CONSTANTS.STATES.STARTER_SELECTION;
                    this.starterSelection = new StarterSelection(this);
                    console.log('→ STARTER_SELECTION (debug)');
                    break;
                case CONSTANTS.STATES.OVERWORLD:
                    this.state = CONSTANTS.STATES.OVERWORLD;
                    // Ensure player has a starter
                    if (!this.player.party || this.player.party.length === 0) {
                        this.player.party = [new Train(1, 5)]; // Steamini (ID 1)
                    }
                    console.log('→ OVERWORLD (debug)');
                    break;
            }
        }
    }

    // ESC or B to close
    if (this.input.isKeyJustPressed('Escape') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b')) {
        this.state = CONSTANTS.STATES.TITLE;
        console.log('→ TITLE (from debug menu)');
    }
};

Game.prototype.updateIntro = function () {
    // Allow B to go back through intro or return to title
    if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b')) {
        if (this.introScene.currentIndex > 0) {
            this.introScene.currentIndex--;
            console.log('Back through intro scene');
        } else {
            this.state = CONSTANTS.STATES.TITLE;
            console.log('→ TITLE (cancelled from intro)');
        }
    } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        if (this.introScene.isComplete()) {
            this.state = CONSTANTS.STATES.STARTER_SELECTION;
            this.starterSelection = new StarterSelection(this);
            console.log('→ STARTER_SELECTION');
        } else {
            this.introScene.advance();
        }
    }
};

Game.prototype.updateStarterSelection = function () {
    const ss = this.starterSelection;

    // Handle input based on phase
    if (ss.phase === 'intro') {
        // Allow B to go back through dialogue or return to title
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b')) {
            if (ss.dialogueIndex > 0) {
                ss.dialogueIndex--;
                console.log('Back through intro dialogue');
            } else {
                this.state = CONSTANTS.STATES.TITLE;
                console.log('→ TITLE (cancelled from intro)');
            }
        } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            ss.advanceIntro();
        }
    } else if (ss.phase === 'selection') {
        // Allow B to go back to intro dialogue
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b')) {
            ss.phase = 'intro';
            ss.dialogueIndex = Math.max(0, ss.dialogueIndex - 1);
            console.log('Back to intro from selection');
        } else if (this.input.isKeyJustPressed('ArrowLeft') || this.input.isVirtualKeyJustPressed('left')) {
            ss.moveSelection('left');
        } else if (this.input.isKeyJustPressed('ArrowRight') || this.input.isVirtualKeyJustPressed('right')) {
            ss.moveSelection('right');
        } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            ss.confirmSelection();
        }
    } else if (ss.phase === 'confirmation') {
        // Check CANCEL first (B/X/Backspace)
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b')) {
            ss.cancelSelection();
            console.log('Cancelled starter selection');
        } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            ss.confirmSelection();
        }
    } else if (ss.phase === 'post-selection') {
        // Allow B to go back during post-selection dialogue
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b')) {
            ss.phase = 'selection';
            ss.confirmed = false;
        } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            const complete = ss.advancePostSelection();
            if (complete) {
                if (!this.currentMap) {
                    if (this.maps['PistonTown']) {
                        this.currentMap = this.maps['PistonTown'];
                    } else if (typeof WORLD_MAPS !== 'undefined' && WORLD_MAPS['PistonTown']) {
                        this.currentMap = WORLD_MAPS['PistonTown'];
                    }
                }

                this.state = CONSTANTS.STATES.OVERWORLD;
                console.log('→ OVERWORLD');
            }
        }
    }
};

Game.prototype.updateOverworld = function (deltaTime) {
    // Open pause menu with Escape key (only when not moving)
    if (!this.player.isMoving && this.input.isKeyJustPressed('Escape')) {
        this.setState(CONSTANTS.STATES.MENU);
        console.log('→ MENU');
        return;
    }

    // Track if player just finished moving
    const wasMoving = this.player.isMoving;

    // Update player animation
    this.player.update(deltaTime);

    const justStopped = wasMoving && !this.player.isMoving;

    // Player movement (only if not currently moving)
    if (!this.player.isMoving) {
        // Check for NPC interaction (A button)
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            this.checkNPCInteraction();
            return; // Don't process movement if interacting
        }

        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.player.move(CONSTANTS.DIRECTIONS.UP, this.currentMap);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.player.move(CONSTANTS.DIRECTIONS.DOWN, this.currentMap);
        } else if (this.input.isKeyJustPressed('ArrowLeft') || this.input.isVirtualKeyJustPressed('left')) {
            this.player.move(CONSTANTS.DIRECTIONS.LEFT, this.currentMap);
        } else if (this.input.isKeyJustPressed('ArrowRight') || this.input.isVirtualKeyJustPressed('right')) {
            this.player.move(CONSTANTS.DIRECTIONS.RIGHT, this.currentMap);
        }
    }

    // Check for warp transitions after movement animation completes
    if (justStopped) {
        this.checkWarpTransition();

        // Check for wild encounters in grass (not on paths)
        if (this.currentMap.checkForEncounter && this.currentMap.checkForEncounter(this.player.x, this.player.y) && this.player.party.length > 0) {
            if (this.currentMap.getRandomEncounter) {
                const wildTrain = this.currentMap.getRandomEncounter();
                this.startBattle(wildTrain, false);
            }
        }
    }

};

Game.prototype.checkNPCInteraction = function () {
    if (!this.currentMap.npcs || this.currentMap.npcs.length === 0) return;

    // Calculate tile player is facing
    let facingX = this.player.x;
    let facingY = this.player.y;

    switch (this.player.direction) {
        case CONSTANTS.DIRECTIONS.UP:
            facingY--;
            break;
        case CONSTANTS.DIRECTIONS.DOWN:
            facingY++;
            break;
        case CONSTANTS.DIRECTIONS.LEFT:
            facingX--;
            break;
        case CONSTANTS.DIRECTIONS.RIGHT:
            facingX++;
            break;
    }

    // Find NPC at facing position
    const npc = this.currentMap.npcs.find(n => n.x === facingX && n.y === facingY);

    if (npc) {
        const flags = this.player.storyFlags || (this.player.storyFlags = {});
        const requirements = npc.requires || [];
        const missing = requirements.filter(required => !flags[required] && !this.player.hasBadge(required));
        if (missing.length) {
            this.state = CONSTANTS.STATES.DIALOGUE;
            this.dialogueBox.show([{ speaker: npc.name, text: `This line is closed. Required: ${missing.join(', ')}.` }], () => {
                this.state = CONSTANTS.STATES.OVERWORLD;
            });
            return;
        }
        if (npc.type === 'healer') {
            for (const train of this.player.party) {
                train.currentHP = train.maxHP;
                train.status = null;
                train.fainted = false;
                train.restorePP();
            }
            this.save();
            this.audio.playSound('heal');
        }
        // Start trainer battle if applicable
        if ((npc.type === 'trainer' || npc.type === 'gym_leader' || npc.type === 'champion') && npc.canBattle && !npc.defeated) {
            // Show dialogue first, then start battle
            if (npc.dialogue && npc.dialogue.length > 0) {
                this.state = CONSTANTS.STATES.DIALOGUE;
                this.dialogueBox.show(npc.dialogue, () => {
                    this.startTrainerBattle(npc);
                });
            } else {
                this.startTrainerBattle(npc);
            }
        } else {
            // Show dialogue for defeated trainers or non-battle NPCs
            const dialogue = npc.defeated && npc.defeatDialogue ? npc.defeatDialogue : npc.dialogue;
            if (dialogue && dialogue.length > 0) {
                this.state = CONSTANTS.STATES.DIALOGUE;
                this.dialogueBox.show(dialogue, () => {
                    this.state = CONSTANTS.STATES.OVERWORLD;
                });
            }
        }
    }
};

Game.prototype.startTrainerBattle = function (npc) {
    if (this.player.party.length === 0) {
        console.warn('Cannot start trainer battle - no trains in party');
        return;
    }

    console.log(`Starting trainer battle with ${npc.name}...`);

    // Generate enemy trains from NPC party data. Train(speciesId, level) takes
    // a numeric species id and looks it up in TRAIN_SPECIES itself.
    const enemyTrains = npc.party.map(data => {
        if (!TRAIN_SPECIES[data.speciesId]) {
            console.error(`Species not found: ${data.speciesId}`);
            return null;
        }
        return new Train(data.speciesId, data.level);
    }).filter(t => t !== null);

    if (enemyTrains.length === 0) {
        console.error('No valid enemy trains!');
        return;
    }

    // Create trainer battle
    this.battle = new Battle(this, this.player.party, enemyTrains, false, npc);
    this.audio.playMusic('battle');

    // Set up victory callback for defeat tracking and badges
    const originalOnVictory = this.battle.onVictory;
    this.battle.onVictory = () => {
        // Mark trainer as defeated
        npc.defeated = true;
        const storyFlag = npc.storyFlag || `defeated_${npc.id}`;
        this.player.storyFlags[storyFlag] = true;
        console.log(`${npc.name} defeated!`);

        // Award badge if gym leader
        if (npc.type === 'gym_leader' && npc.badge) {
            const earned = this.player.earnBadge(npc.badge);
            if (earned) {
                this.player.storyFlags[npc.badge] = true;
                if (!this.player.defeatedGymLeaders.includes(npc.id)) this.player.defeatedGymLeaders.push(npc.id);
                console.log(`🏅 Earned ${npc.badge}!`);
            }
        }

        // Call original callback if exists
        if (originalOnVictory) {
            originalOnVictory();
        }
    };

    this.state = CONSTANTS.STATES.BATTLE;
    console.log('→ BATTLE (Trainer)');
};

Game.prototype.checkWarpTransition = function () {
    // Only works with new world-maps system
    if (!this.currentMap.warps) return;

    const warp = this.findWarp(this.currentMap, this.player.x, this.player.y);
    if (warp) {
        const to = warp.to;
        console.log(`🚪 Warp: ${this.currentMap.id} → ${to.mapId} (${to.x},${to.y})`);

        // Change map
        if (this.maps[to.mapId]) {
            this.currentMap = this.maps[to.mapId];
            this.player.currentMap = to.mapId;
        } else {
            console.error(`Map not found: ${to.mapId}`);
            return;
        }

        // Teleport player
        this.player.x = to.x;
        this.player.y = to.y;
        this.player.targetX = to.x;
        this.player.targetY = to.y;

        // Set direction if specified
        if (to.dir) {
            const dirMap = { 'up': 0, 'down': 1, 'left': 2, 'right': 3 };
            this.player.direction = dirMap[to.dir] ?? CONSTANTS.DIRECTIONS.DOWN;
        }
    }
};

Game.prototype.findWarp = function (map, x, y) {
    if (!map.warps) return null;

    for (const w of map.warps) {
        const f = w.from;
        if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) {
            return w;
        }
    }
    return null;
};

Game.prototype.startBattle = function (wildTrain, isTrainerBattle = false) {
    if (this.player.party.length === 0) {
        console.warn('Cannot start battle - no trains in party');
        return;
    }

    // Battle constructor expects: (playerTrains[], enemyTrains[], isWild, trainerNPC)
    if (isTrainerBattle) {
        // Trainer battle (not yet implemented)
        this.battle = new Battle(this, this.player.party, [wildTrain], false, null);
    } else {
        // Wild encounter
        this.battle = new Battle(this, this.player.party, [wildTrain], true);
    }
    this.state = CONSTANTS.STATES.BATTLE;
    this.audio.playMusic('battle');
    console.log('→ BATTLE');
};

Game.prototype.updateBattle = function (deltaTime) {
    if (!this.battle) {
        this.state = CONSTANTS.STATES.OVERWORLD;
        return;
    }

    // Update battle animations
    this.battle.update(deltaTime);

    // Handle input
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        this.battle.handleInput('a');
    } else if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
        this.battle.handleInput('up');
    } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
        this.battle.handleInput('down');
    } else if (this.input.isKeyJustPressed('ArrowLeft') || this.input.isVirtualKeyJustPressed('left')) {
        this.battle.handleInput('left');
    } else if (this.input.isKeyJustPressed('ArrowRight') || this.input.isVirtualKeyJustPressed('right')) {
        this.battle.handleInput('right');
    } else if (this.input.isKeyJustPressed('x') || this.input.isKeyJustPressed('Backspace') || this.input.isVirtualKeyJustPressed('b')) {
        this.battle.handleInput('b');
    }

    // Handle battle completion
    if (this.battle.isComplete && this.battle.isComplete()) {
        // Check if player was defeated
        if (this.battle.state === CONSTANTS.BATTLE_STATES.DEFEAT) {
            this.handleDefeat();
        } else if (this.battle.state === CONSTANTS.BATTLE_STATES.VICTORY) {
            // Award money from battle (funnelled through the single accessor).
            if (this.battle.moneyEarned) {
                this.player.addMoney(this.battle.moneyEarned);
                console.log(`Earned $${this.battle.moneyEarned}! Total: $${this.player.money}`);
            }
            // A wild train was captured this battle: add it to the party (or
            // note that the party was full). Previously caughtTrain was set but
            // never read, so captured trains silently vanished.
            if (this.battle.caughtTrain) {
                this.player.registerCaught(this.battle.caughtTrain.speciesId);
                const added = this.player.addTrain(this.battle.caughtTrain);
                if (!added) this.player.storage.push(this.battle.caughtTrain);
                this.caughtTrainResult = { name: this.battle.caughtTrain.species.name, added };
                console.log(added ? 'Caught train added to party' : 'Party full - caught train sent to Depot');
            } else {
                this.caughtTrainResult = null;
            }
            this.state = CONSTANTS.STATES.BATTLE_SUMMARY;
        } else {
            this.battle = null;
            this.state = CONSTANTS.STATES.OVERWORLD;
            console.log('→ OVERWORLD');
        }
    }
};

Game.prototype.updateBattleSummary = function () {
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        this.battle = null;
        this.state = CONSTANTS.STATES.OVERWORLD;
        console.log('→ OVERWORLD');
    }
};


Game.prototype.renderBattleSummary = function (ctx) {
    if (!this.battle) return;

    // Render the battle behind the summary
    this.renderBattle(ctx);

    // Draw a semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the summary box
    const boxX = this.canvas.width / 2 - 200;
    const boxY = this.canvas.height / 2 - 100;
    const boxWidth = 400;
    const boxHeight = 200;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Summary text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', this.canvas.width / 2, boxY + 50);

    if (this.battle.moneyEarned) {
        ctx.font = '20px monospace';
        ctx.fillText(`You earned $${this.battle.moneyEarned}!`, this.canvas.width / 2, boxY + 95);
    }

    if (this.caughtTrainResult) {
        ctx.font = '16px monospace';
        const msg = this.caughtTrainResult.added
            ? `Caught ${this.caughtTrainResult.name}!`
            : `${this.caughtTrainResult.name} was sent to the Depot.`;
        ctx.fillText(msg, this.canvas.width / 2, boxY + 140);
    }

    ctx.textAlign = 'left'; // Reset text align
};

Game.prototype.handleDefeat = function () {
    console.log('Player defeated - triggering blackout');

    // Heal all trains to full HP (and clear status).
    this.player.healParty();

    // Lose half your money on blackout.
    this.player.money = this.player.money < 100 ? 0 : Math.floor(this.player.money * 0.5);

    // Teleport back to the Piston Town spawn. The map key MUST match the key
    // maps are registered under ('PistonTown'), and we must reassign the live
    // currentMap object - not just the player's map-id string.
    const respawnKey = this.maps['PistonTown'] ? 'PistonTown' : 'pallet_town';
    this.currentMap = this.maps[respawnKey];
    this.player.currentMap = respawnKey;
    this.player.x = 10;
    this.player.y = 7;
    this.player.targetX = 10;
    this.player.targetY = 7;
    this.player.isMoving = false;
    this.player.direction = CONSTANTS.DIRECTIONS.DOWN;

    this.battle = null;
    this.state = CONSTANTS.STATES.OVERWORLD;
    console.log(`Blackout - money now ${this.player.money}, respawned at ${respawnKey}`);
};

Game.prototype.render = function () {
    const ctx = this.ctx;

    // Clear screen
    ctx.fillStyle = CONSTANTS.COLORS.BLACK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.state) {
        case 'loading':
            this.renderLoading(ctx);
            break;
        case CONSTANTS.STATES.TITLE:
            this.renderTitle(ctx);
            break;
        case CONSTANTS.STATES.INTRO:
            this.renderIntro(ctx);
            break;
        case CONSTANTS.STATES.STARTER_SELECTION:
            this.renderStarterSelection(ctx);
            break;
        case CONSTANTS.STATES.OVERWORLD:
            this.renderOverworld(ctx);
            break;
        case CONSTANTS.STATES.BATTLE:
            this.renderBattle(ctx);
            break;
        case CONSTANTS.STATES.BATTLE_SUMMARY:
            this.renderBattleSummary(ctx);
            break;
        case CONSTANTS.STATES.MENU:
            this.renderMenu(ctx);
            break;
        case 'debug':
            this.renderDebugMenu(ctx);
            break;
    }
};

Game.prototype.renderLoading = function (ctx) {
    const w = this.canvas.width, h = this.canvas.height;
    const C = CONSTANTS.COLORS;
    ctx.fillStyle = C.UI_BG;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = C.LOCO_BODY;
    ctx.font = '24px monospace';
    ctx.fillText('NOW LOADING', w / 2, h / 2 - 50);

    const barWidth = 400, barHeight = 26;
    const barX = (w - barWidth) / 2, barY = h / 2 - 10;
    ctx.fillStyle = '#181818';
    this.roundRect(ctx, barX - 4, barY - 4, barWidth + 8, barHeight + 8, 8); ctx.fill();
    ctx.fillStyle = C.HP_BG;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, 6); ctx.fill();
    ctx.fillStyle = C.LOCO_BRASS;
    const fillW = Math.max(0, (barWidth) * this.loadingProgress);
    if (fillW > 0) { this.roundRect(ctx, barX, barY, fillW, barHeight, 6); ctx.fill(); }

    ctx.fillStyle = C.DARK;
    ctx.font = '16px monospace';
    ctx.fillText(`${Math.floor(this.loadingProgress * 100)}%`, w / 2, barY + 60);
    ctx.textAlign = 'left';
};

Game.prototype.renderTitle = function (ctx) {
    const w = this.canvas.width, h = this.canvas.height;
    const C = CONSTANTS.COLORS;

    // Sky gradient backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, C.BATTLE_SKY2);
    sky.addColorStop(1, C.BATTLE_SKY);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Rolling hills
    ctx.fillStyle = C.GRASS_ALT;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.72);
    ctx.quadraticCurveTo(w * 0.85, h * 0.8, w, h * 0.68);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

    // A little locomotive riding the hill
    this.drawTitleTrain(ctx, w * 0.5 - 80, h * 0.55, 2.2);

    // Title logo plate
    const tx = w / 2;
    ctx.fillStyle = '#181818';
    this.roundRect(ctx, tx - 250, 70, 500, 120, 16); ctx.fill();
    ctx.fillStyle = C.UI_BG;
    this.roundRect(ctx, tx - 242, 78, 484, 104, 12); ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = C.LOCO_RED;
    ctx.font = 'bold 42px monospace';
    ctx.fillText('GRAND TRANSIT', tx + 3, 128);
    ctx.fillStyle = C.LOCO_BRASS;
    ctx.fillText('GRAND TRANSIT', tx, 125);
    ctx.fillStyle = '#181818';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('R A I L W A Y', tx, 168);

    // Blinking prompt
    if (Math.floor(this.animClock * 2) % 2 === 0) {
        ctx.fillStyle = '#181818';
        ctx.font = '20px monospace';
        ctx.fillText('PRESS ENTER', tx, h - 90);
    }
    ctx.font = '12px monospace';
    ctx.fillStyle = C.DARK;
    ctx.fillText('` or F1 for debug menu', tx, h - 50);
    ctx.textAlign = 'left';
};

// Rounded-rect path helper (uses native roundRect where available).
Game.prototype.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

// Decorative locomotive for the title screen.
Game.prototype.drawTitleTrain = function (ctx, x, y, s) {
    const C = CONSTANTS.COLORS;
    ctx.fillStyle = C.LOCO_BODY;
    ctx.fillRect(x, y, 70 * s, 22 * s);            // boiler
    ctx.fillStyle = C.LOCO_BODY_DARK;
    ctx.fillRect(x + 50 * s, y - 14 * s, 20 * s, 16 * s); // cab
    ctx.fillStyle = C.LOCO_IRON_DARK;
    ctx.fillRect(x - 4 * s, y - 4 * s, 8 * s, 30 * s);   // front buffer
    ctx.fillStyle = C.LOCO_BRASS;
    ctx.fillRect(x + 10 * s, y - 12 * s, 7 * s, 12 * s); // smokestack
    // wheels
    ctx.fillStyle = C.LOCO_IRON;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + (12 + i * 22) * s, y + 22 * s, 7 * s, 0, Math.PI * 2);
        ctx.fill();
    }
    // steam puffs
    ctx.fillStyle = 'rgba(232,232,232,0.9)';
    for (let i = 0; i < 3; i++) {
        const px = x + (13 * s) + Math.sin(this.animClock + i) * 6 - i * 10 * s;
        ctx.beginPath();
        ctx.arc(px, y - (22 + i * 10) * s, (4 + i * 2) * s, 0, Math.PI * 2);
        ctx.fill();
    }
};

Game.prototype.renderDebugMenu = function (ctx) {
    ctx.fillStyle = CONSTANTS.COLORS.WHITE;
    ctx.font = '28px monospace';
    ctx.fillText('DEBUG MENU', 260, 80);

    ctx.font = '14px monospace';
    ctx.fillStyle = CONSTANTS.COLORS.UI_TEXT;
    ctx.fillText('Press ` or F1 from title screen to open', 180, 110);
    ctx.fillText('Arrow Keys: Navigate | Enter: Select | ESC/B: Close', 130, 130);

    const startY = 180;
    const lineHeight = 40;

    this.debugMenuOptions.forEach((option, index) => {
        const y = startY + (index * lineHeight);
        const isSelected = index === this.debugMenuSelection;

        // Selection indicator
        if (isSelected) {
            ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
            ctx.fillRect(100, y - 25, 560, 35);
        }

        // Option text
        ctx.fillStyle = isSelected ? CONSTANTS.COLORS.BLACK : CONSTANTS.COLORS.WHITE;
        ctx.font = isSelected ? 'bold 18px monospace' : '18px monospace';
        ctx.fillText(option.label, 120, y);
    });
};

Game.prototype.wrapText = function (ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
            ctx.fillText(line, x, currentY);
            line = word + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
};

Game.prototype.renderIntro = function (ctx) {
    if (!this.introScene) return;

    const dialogue = this.introScene.getCurrentDialogue();
    if (dialogue) {
        // Draw professor sprite if available
        const professorSprite = this.images['professor-cypress-1'];
        if (professorSprite && professorSprite.complete && dialogue.speaker === 'Professor Cypress') {
            ctx.drawImage(professorSprite, 50, 200, 128, 128);
        }

        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.font = '20px monospace';
        ctx.fillText(dialogue.speaker, 200, 250);
        ctx.font = '16px monospace';
        this.wrapText(ctx, dialogue.text, 200, 280, 550, 25);
        ctx.fillText('Press ENTER to continue', 250, 600);
    }
};

Game.prototype.renderStarterSelection = function (ctx) {
    if (!this.starterSelection) return;

    const ss = this.starterSelection;

    ctx.fillStyle = CONSTANTS.COLORS.WHITE;
    ctx.font = '16px monospace';

    if (ss.phase === 'intro') {
        const dialogue = ss.getCurrentIntroDialogue();
        if (dialogue) {
            ctx.fillText(dialogue.speaker, 50, 100);
            this.wrapText(ctx, dialogue.text, 50, 150, 600, 25);
            ctx.fillText('Press ENTER to continue', 50, 600);
        }
    } else if (ss.phase === 'selection') {
        ctx.fillText('Choose your starter train:', 200, 100);

        // Draw starters
        for (let i = 0; i < ss.starters.length; i++) {
            const starter = ss.starters[i];
            const x = 100 + i * 200;
            const y = 200;

            // Highlight selected
            if (i === ss.selection) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x - 10, y - 10, 180, 200);
            }

            // Draw sprite image
            const spriteImg = this.images[starter.name];
            if (spriteImg && spriteImg.complete) {
                ctx.drawImage(spriteImg, x + 10, y + 70, 128, 128);
            }

            ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            ctx.fillText(starter.displayName, x, y + 20);
            ctx.font = '12px monospace';
            ctx.fillText(`Type: ${starter.types[0]}`, x, y + 50);
            ctx.font = '16px monospace';
        }

        ctx.fillText('Use ← → to select, ENTER to confirm', 150, 500);
    } else if (ss.phase === 'confirmation') {
        const starter = ss.getCurrentStarter();
        ctx.fillText(`Choose ${starter.displayName}?`, 250, 250);
        ctx.fillText('ENTER = Yes    B = No', 230, 350);
    } else if (ss.phase === 'post-selection') {
        const dialogue = ss.getCurrentPostDialogue();
        if (dialogue) {
            ctx.fillText(dialogue.speaker, 50, 100);
            this.wrapText(ctx, dialogue.text, 50, 150, 600, 25);
            ctx.fillText('Press ENTER to continue', 50, 600);
        }
    }
};

Game.prototype.renderOverworld = function (ctx) {
    if (!this.currentMap) {
        // Only log once to avoid spam
        if (!this._loggedMapError) {
            console.error('❌ renderOverworld: currentMap is null!');
            this._loggedMapError = true;
        }
        return;
    }

    const tileSize = CONSTANTS.TILE_SIZE * CONSTANTS.SCALE;
    const canvas = ctx.canvas;

    // Camera system - center on player
    const cameraX = Math.floor((this.player.x * tileSize) - (canvas.width / 2) + (tileSize / 2));
    const cameraY = Math.floor((this.player.y * tileSize) - (canvas.height / 2) + (tileSize / 2));

    // Clamp camera to map bounds
    const mapPixelWidth = this.currentMap.width * tileSize;
    const mapPixelHeight = this.currentMap.height * tileSize;
    const clampedCameraX = Math.max(0, Math.min(cameraX, mapPixelWidth - canvas.width));
    const clampedCameraY = Math.max(0, Math.min(cameraY, mapPixelHeight - canvas.height));

    // Calculate visible tile range
    const startTileX = Math.floor(clampedCameraX / tileSize);
    const startTileY = Math.floor(clampedCameraY / tileSize);
    const endTileX = Math.min(this.currentMap.width, Math.ceil((clampedCameraX + canvas.width) / tileSize));
    const endTileY = Math.min(this.currentMap.height, Math.ceil((clampedCameraY + canvas.height) / tileSize));

    // Draw visible map tiles
    if (this.currentMap.tilesetRef) {
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tileIndex = this.currentMap.getTile(x, y);
                const dx = (x * tileSize) - clampedCameraX;
                const dy = (y * tileSize) - clampedCameraY;
                drawTile(this.ctx, this.currentMap.tilesetRef, tileIndex, dx, dy, tileSize);
            }
        }
    } else {
        // Textured fallback tiles (no tileset loaded). No more flat rects with
        // a harsh grid outline - drawFallbackTile gives each material a surface.
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tile = this.currentMap.getTile(x, y);
                const screenX = (x * tileSize) - clampedCameraX;
                const screenY = (y * tileSize) - clampedCameraY;
                this.drawFallbackTile(ctx, tile, screenX, screenY, tileSize, x, y);
            }
        }
    }
    // Draw NPCs
    if (this.currentMap.npcs && this.currentMap.npcs.length > 0) {
        for (const npc of this.currentMap.npcs) {
            const npcScreenX = (npc.x * tileSize) - clampedCameraX;
            const npcScreenY = (npc.y * tileSize) - clampedCameraY;

            // Only draw if in visible range
            if (npcScreenX >= -tileSize && npcScreenX < canvas.width &&
                npcScreenY >= -tileSize && npcScreenY < canvas.height) {

                // Tint per role/defeated; draw as a little person, not a square.
                let shirt;
                if (npc.defeated) shirt = '#8A8A8A';
                else if (npc.type === 'gym_leader') shirt = CONSTANTS.COLORS.LOCO_BRASS;
                else if (npc.type === 'trainer') shirt = '#D64545';
                else shirt = '#5878A8';
                this.drawCharacter(ctx, npcScreenX, npcScreenY, tileSize, shirt, CONSTANTS.DIRECTIONS.DOWN);
            }
        }
    }

    // Draw player (centered on screen or clamped to map edges)
    const playerScreenX = (this.player.x * tileSize) - clampedCameraX;
    const playerScreenY = (this.player.y * tileSize) - clampedCameraY;

    // For now, draw a Pokemon-style trainer representation
    this.drawPlayer(ctx, playerScreenX, playerScreenY, tileSize, this.player.direction);

    // Developer overlay - off by default (was always-on, cluttering the view).
    if (this.debug) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(6, 6, 190, 38);
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.font = '12px monospace';
        ctx.fillText(`Map: ${this.currentMap.id || this.currentMap.name}`, 12, 22);
        ctx.fillText(`Pos: (${this.player.x}, ${this.player.y})`, 12, 37);
    }

    // Render dialogue box if active
    if (this.state === CONSTANTS.STATES.DIALOGUE && this.dialogueBox.isActive()) {
        const dialogue = this.dialogueBox.getCurrentDialogue();
        if (dialogue) {
            // Draw box at bottom
            const boxHeight = 100;
            const boxY = canvas.height - boxHeight - 10;
            UI.drawTextBox(ctx, 10, boxY, canvas.width - 20, boxHeight, dialogue.text);

            // Draw speaker name
            if (dialogue.speaker) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(20, boxY - 15, ctx.measureText(dialogue.speaker).width + 20, 25);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
                ctx.font = 'bold 16px monospace';
                ctx.fillText(dialogue.speaker, 30, boxY + 2);
            }
        }
    }
};

// Hoisted out of getTileColor so the literal isn't rebuilt on every tile,
// every frame (the fallback path draws hundreds of tiles per frame).
// Muted GBC palette - the old pure #00FF00 grass read as eye-searing.
Game.TILE_COLORS = {
    0: '#3A3A3A', // void/wall
    1: '#7BB662', // grass
    2: '#4F9A4B', // tall grass
    3: '#D8C7A0', // path
    4: '#5878A8', // water
    5: '#6B4226', // wall
    6: '#5C5C5C', // rails
    12: '#8B5A3C' // door
};

Game.prototype.getTileColor = function (tile) {
    return Game.TILE_COLORS[tile] || '#7BB662';
};

// Draw a single textured fallback tile. Two-tone + deterministic speckle keyed
// on tile coords so grass/path/water read as a surface, not a flat fill.
Game.prototype.drawFallbackTile = function (ctx, tile, sx, sy, size, tx, ty) {
    const C = CONSTANTS.COLORS;
    const even = ((tx + ty) & 1) === 0;
    // Deterministic pseudo-noise per tile (no Math.random -> stable frames).
    const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;

    if (tile === 1) { // grass
        ctx.fillStyle = even ? C.GRASS_BASE : C.GRASS_ALT;
        ctx.fillRect(sx, sy, size, size);
        ctx.fillStyle = C.GRASS_SPECK;
        // a few short blades, placed deterministically
        for (let i = 0; i < 3; i++) {
            const bx = sx + ((h >> (i * 3)) % (size - 4)) + 2;
            const by = sy + ((h >> (i * 3 + 8)) % (size - 6)) + 4;
            ctx.fillRect(bx, by, 2, 4);
        }
    } else if (tile === 2) { // tall grass
        ctx.fillStyle = even ? C.TALLGRASS_BASE : C.TALLGRASS_ALT;
        ctx.fillRect(sx, sy, size, size);
        ctx.fillStyle = C.GRASS_BASE;
        for (let i = 0; i < 4; i++) {
            const bx = sx + 3 + i * (size / 4);
            ctx.fillRect(bx, sy + size - 10, 3, 8);
        }
    } else if (tile === 3 || tile === 12) { // path / door
        ctx.fillStyle = tile === 12 ? C.DOOR_BASE : C.PATH_BASE;
        ctx.fillRect(sx, sy, size, size);
        ctx.fillStyle = tile === 12 ? C.WALL_ALT : C.PATH_ALT;
        // subtle paving speckle
        ctx.fillRect(sx + (h % (size - 3)), sy + ((h >> 5) % (size - 3)), 2, 2);
        if (tile === 12) { // doorway frame
            ctx.fillStyle = C.LOCO_BRASS;
            ctx.fillRect(sx + size * 0.3, sy + size * 0.15, size * 0.4, size * 0.7);
        }
    } else if (tile === 4) { // water
        ctx.fillStyle = C.WATER_BASE;
        ctx.fillRect(sx, sy, size, size);
        ctx.fillStyle = C.WATER_ALT;
        const wob = Math.sin((this.animClock * 2) + tx + ty) > 0 ? 0 : 3;
        ctx.fillRect(sx + 3 + wob, sy + size * 0.4, size * 0.4, 2);
        ctx.fillRect(sx + size * 0.5 - wob, sy + size * 0.7, size * 0.3, 2);
    } else if (tile === 6) { // rails
        ctx.fillStyle = C.PATH_ALT;
        ctx.fillRect(sx, sy, size, size);
        ctx.fillStyle = C.RAIL_TIE;
        for (let i = 0; i < 3; i++) ctx.fillRect(sx + 2, sy + 3 + i * (size / 3), size - 4, 3);
        ctx.fillStyle = C.RAIL_BASE;
        ctx.fillRect(sx + size * 0.28, sy, 3, size);
        ctx.fillRect(sx + size * 0.62, sy, 3, size);
    } else { // 0 = wall / void and anything else
        ctx.fillStyle = even ? C.WALL_BASE : C.WALL_ALT;
        ctx.fillRect(sx, sy, size, size);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(sx, sy + size - 4, size, 4); // bottom shadow for depth
    }
};

// Player uses the shared character drawer with a red cap (Pokemon-protagonist
// vibe). Kept as its own method so existing call sites don't change.
Game.prototype.drawPlayer = function (ctx, x, y, size, direction) {
    this.drawCharacter(ctx, x, y, size, '#3A6BB0', direction, true);
};

// A small top-down trainer sprite drawn from blocks: ground shadow, legs,
// torso (shirt color), head with skin tone, and a cap whose brim shows the
// facing direction. Used for both the player and NPCs.
Game.prototype.drawCharacter = function (ctx, x, y, size, shirt, direction, isPlayer) {
    const cx = x + size / 2;
    const u = size / 16; // pixel unit on a 16-grid
    const skin = '#F0C8A0';
    const cap = isPlayer ? '#D64545' : '#2C2C3A';
    const hair = '#3A2A1A';

    // soft contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, y + size - 2 * u, 5 * u, 2 * u, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs
    ctx.fillStyle = '#3A3A4A';
    ctx.fillRect(cx - 3 * u, y + 11 * u, 2.5 * u, 4 * u);
    ctx.fillRect(cx + 0.5 * u, y + 11 * u, 2.5 * u, 4 * u);

    // torso
    ctx.fillStyle = shirt;
    ctx.fillRect(cx - 4 * u, y + 7 * u, 8 * u, 5 * u);
    // arms
    ctx.fillStyle = shirt;
    ctx.fillRect(cx - 5 * u, y + 7 * u, 1.5 * u, 4 * u);
    ctx.fillRect(cx + 3.5 * u, y + 7 * u, 1.5 * u, 4 * u);

    // head
    ctx.fillStyle = skin;
    ctx.fillRect(cx - 3.5 * u, y + 2 * u, 7 * u, 5 * u);

    // hair/cap base
    ctx.fillStyle = cap;
    ctx.fillRect(cx - 4 * u, y + 1 * u, 8 * u, 2.5 * u);
    // cap brim points in the facing direction
    ctx.fillStyle = cap;
    switch (direction) {
        case CONSTANTS.DIRECTIONS.DOWN:
            ctx.fillRect(cx - 3 * u, y + 3 * u, 6 * u, 1.2 * u); break;
        case CONSTANTS.DIRECTIONS.UP:
            ctx.fillStyle = hair; ctx.fillRect(cx - 3.5 * u, y + 3 * u, 7 * u, 2 * u); break;
        case CONSTANTS.DIRECTIONS.LEFT:
            ctx.fillRect(cx - 5 * u, y + 2.5 * u, 2 * u, 1.5 * u); break;
        case CONSTANTS.DIRECTIONS.RIGHT:
            ctx.fillRect(cx + 3 * u, y + 2.5 * u, 2 * u, 1.5 * u); break;
    }

    // eyes (only when facing toward/side the camera)
    if (direction !== CONSTANTS.DIRECTIONS.UP) {
        ctx.fillStyle = '#1A1208';
        if (direction === CONSTANTS.DIRECTIONS.LEFT) {
            ctx.fillRect(cx - 2.5 * u, y + 4.5 * u, 1.2 * u, 1.2 * u);
        } else if (direction === CONSTANTS.DIRECTIONS.RIGHT) {
            ctx.fillRect(cx + 1.3 * u, y + 4.5 * u, 1.2 * u, 1.2 * u);
        } else {
            ctx.fillRect(cx - 2.5 * u, y + 4.5 * u, 1.2 * u, 1.2 * u);
            ctx.fillRect(cx + 1.3 * u, y + 4.5 * u, 1.2 * u, 1.2 * u);
        }
    }
};

Game.prototype.renderBattle = function (ctx) {
    if (this.battle && this.battle.render) {
        this.battle.render(ctx);
    }
};

// Save/Load system
//
// Serialization is owned by Player.toJSON/fromJSON (single source of truth) so
// badges, story flags, and IVs can never be silently dropped by a divergent
// hand-rolled schema. The transient `state` is deliberately NOT persisted -
// the title screen decides whether to resume (see updateTitle).
Game.prototype.SAVE_KEY = 'trainBattleRPG_save';

Game.prototype.save = function () {
    try {
        const saveData = {
            version: Player.SAVE_VERSION,
            player: this.player.toJSON(),
            savedAt: Date.now()
        };
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
        console.log('💾 Game saved');
        return true;
    } catch (err) {
        console.error('Save failed:', err);
        return false;
    }
};

Game.prototype.load = function () {
    try {
        const saved = localStorage.getItem(this.SAVE_KEY);
        if (!saved) return false;

        const data = JSON.parse(saved);
        if (!data || !data.player) return false;

        this.player = Player.fromJSON(data.player);

        // Resolve the live map object from the saved map-id key, falling back
        // to the start town if the key is stale/unknown.
        if (this.maps[this.player.currentMap]) {
            this.currentMap = this.maps[this.player.currentMap];
        } else if (this.maps['PistonTown']) {
            this.currentMap = this.maps['PistonTown'];
            this.player.currentMap = 'PistonTown';
        }

        this.loadedSave = true;
        console.log('📁 Game loaded');
        return true;
    } catch (err) {
        console.error('Load failed:', err);
        return false;
    }
};

Game.prototype.exportSaveToken = function () {
    const saved = localStorage.getItem(this.SAVE_KEY);
    return saved ? btoa(saved) : null;
};

Game.prototype.importSaveToken = function (token) {
    try {
        const decoded = atob(token);
        localStorage.setItem(this.SAVE_KEY, decoded);
        return this.load();
    } catch (err) {
        console.error('Import failed:', err);
        return false;
    }
};
Game.prototype.updateMenu = function () {
    // SHOP mode - browse and purchase items (only if shop is actually open, not just highlighted)
    if (this.menuOptions[this.menuSelection] === 'SHOP' && this.shopMode === 'active') {
        // Navigate shop items
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.shopSelection = Math.max(0, this.shopSelection - 1);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.shopSelection = Math.min(this.shopItems.length - 1, this.shopSelection + 1);
        }

        // Purchase item (spendMoney is the single gate; never goes negative).
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            const item = this.shopItems[this.shopSelection];
            if (this.player.spendMoney(item.price)) {
                this.player.items[item.name] = (this.player.items[item.name] || 0) + 1;
                console.log(`Bought ${item.displayName} for $${item.price}! Money: $${this.player.money}`);
            } else {
                console.log(`Not enough money! Need $${item.price}, have $${this.player.money}`);
            }
        }

        // Exit shop
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
            this.menuSelection = 0;
            this.shopMode = null;  // Clear shop mode to return to main menu
            return;
        }

        return; // Don't process main menu navigation while in shop
    }

    // BAG mode with item usage
    if (this.menuOptions[this.menuSelection] === 'BAG' && this.bagMode === 'use_on_train') {
        // Navigate trains
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.trainSelection = Math.max(0, this.trainSelection - 1);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.trainSelection = Math.min(this.player.party.length - 1, this.trainSelection + 1);
        }

        // Select train to use item on
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            const train = this.player.party[this.trainSelection];
            const def = Items.get(this.selectedItem);

            // Train has `maxHP`, NOT `stats.hp` (that property does not exist and
            // threw here previously). Heal amount comes from the Items registry.
            if (def && def.kind === 'heal' && train && train.currentHP < train.maxHP) {
                train.heal(def.amount);
                this.player.items[def.id] = Math.max(0, (this.player.items[def.id] || 0) - 1);
                this.bagMode = 'list';
                this.selectedItem = null;
                console.log(`Used ${def.name} on ${train.nickname || train.species.name}`);
            }
        }

        // Cancel
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
            this.bagMode = 'list';
            this.selectedItem = null;
        }
        return;
    }

    // BAG mode - list items (only if bag is actually open, not just highlighted)
    if (this.menuOptions[this.menuSelection] === 'BAG' && this.bagMode === 'list') {
        const items = Object.keys(this.player.items).filter(item => this.player.items[item] > 0);

        if (items.length > 0) {
            if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
                this.bagSelection = Math.max(0, this.bagSelection - 1);
            } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
                this.bagSelection = Math.min(items.length - 1, this.bagSelection + 1);
            }

            // Use item
            if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
                const selectedItem = items[this.bagSelection];

                if (selectedItem === 'boxcar') {
                    console.log("Can't use Boxcars here!");
                } else if (selectedItem === 'potion' || selectedItem === 'super_potion') {
                    this.selectedItem = selectedItem;
                    this.bagMode = 'use_on_train';
                    this.trainSelection = 0;
                }
            }
        }

        // Back to main menu
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
            this.menuSelection = 0;
            this.bagMode = null;  // Clear bag mode to return to main menu
        }
        return;
    }

    // TRAINS mode - view party
    if (this.menuOptions[this.menuSelection] === 'TRAINS' && this.bagMode === 'trains') {
        // Navigate trains
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.trainSelection = Math.max(0, this.trainSelection - 1);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.trainSelection = Math.min(this.player.party.length - 1, this.trainSelection + 1);
        }

        // Back to main menu
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
            this.menuSelection = 0;
            this.bagMode = null;  // Clear trains mode to return to main menu
        }
        return;
    }

    if (this.menuOptions[this.menuSelection] === 'DEPOT' && this.bagMode === 'depot') {
        const total = this.player.party.length + this.player.storage.length;
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.trainSelection = Math.max(0, this.trainSelection - 1);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.trainSelection = Math.min(Math.max(0, total - 1), this.trainSelection + 1);
        } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            if (this.trainSelection < this.player.party.length && this.player.party.length > 1) {
                this.player.storage.push(this.player.party.splice(this.trainSelection, 1)[0]);
            } else if (this.player.party.length < CONSTANTS.MAX_PARTY_SIZE) {
                const storageIndex = this.trainSelection - this.player.party.length;
                if (storageIndex >= 0 && this.player.storage[storageIndex]) this.player.party.push(this.player.storage.splice(storageIndex, 1)[0]);
            }
            this.trainSelection = 0;
        }
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
            this.menuSelection = 0;
            this.bagMode = null;
        }
        return;
    }

    if (this.menuOptions[this.menuSelection] === 'TRAINDEX' && this.bagMode === 'dex') {
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) this.trainSelection = Math.max(0, this.trainSelection - 1);
        else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) this.trainSelection = Math.min(150, this.trainSelection + 1);
        if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
            this.menuSelection = 0;
            this.bagMode = null;
        }
        return;
    }

    // Main menu navigation with wrapping
    if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
        this.menuSelection = (this.menuSelection - 1 + this.menuOptions.length) % this.menuOptions.length;
    } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
        this.menuSelection = (this.menuSelection + 1) % this.menuOptions.length;
    }

    // Select menu option
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        const option = this.menuOptions[this.menuSelection];

        if (option === 'TRAINDEX') {
            this.trainSelection = 0;
            this.bagMode = 'dex';
        } else if (option === 'TRAINS') {
            this.trainSelection = 0;
            this.bagMode = 'trains'; // Reuse bagMode for trains view
        } else if (option === 'DEPOT') {
            this.trainSelection = 0;
            this.bagMode = 'depot';
        } else if (option === 'BAG') {
            this.bagSelection = 0;
            this.bagMode = 'list';
        } else if (option === 'SHOP') {
            this.shopSelection = 0;
            this.shopMode = 'active';
        } else if (option === 'HEAL') {
            // Heal synchronously. A setTimeout here could fire after the player
            // had already opened another menu or entered a battle, yanking them
            // out of it mid-action.
            this.player.healParty();
            console.log('All trains healed to full HP!');
            this.setState(CONSTANTS.STATES.OVERWORLD);
        } else if (option === 'SAVE') {
            this.save();
            console.log('Game saved!');
        } else if (option === 'CLOSE') {
            this.state = CONSTANTS.STATES.OVERWORLD;
            console.log('→ OVERWORLD');
        }
    }

    // Close menu with B/X
    if (this.input.isKeyJustPressed('Backspace') || this.input.isKeyJustPressed('x') || this.input.isVirtualKeyJustPressed('b') || this.input.isKeyJustPressed('Escape')) {
        this.state = CONSTANTS.STATES.OVERWORLD;
        console.log('→ OVERWORLD');
    }
};

Game.prototype.renderMenu = function () {
    // Render overworld behind menu
    this.renderOverworld(this.ctx);

    // Draw semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Only show submenus when they're actually open (shopMode/bagMode set), not just highlighted
    if (this.menuOptions[this.menuSelection] === 'SHOP' && this.shopMode === 'active') {
        UI.drawShop(this.ctx, this.shopItems, this.shopSelection, this.player);
    } else if (this.menuOptions[this.menuSelection] === 'TRAINDEX' && this.bagMode === 'dex') {
        UI.drawTrainDex(this.ctx, this.player, this.trainSelection);
    } else if (this.menuOptions[this.menuSelection] === 'TRAINS' && this.bagMode === 'trains') {
        UI.drawTrainParty(this.ctx, this.player, this.trainSelection);
    } else if (this.menuOptions[this.menuSelection] === 'DEPOT' && this.bagMode === 'depot') {
        UI.drawDepot(this.ctx, this.player, this.trainSelection);
    } else if (this.menuOptions[this.menuSelection] === 'BAG' && this.bagMode) {
        if (this.bagMode === 'use_on_train') {
            UI.drawBagUseOnTrain(this.ctx, this.player, this.trainSelection, this.selectedItem);
        } else {
            UI.drawBag(this.ctx, this.player, this.bagSelection);
        }
    } else {
        UI.drawPauseMenu(this.ctx, this.menuOptions, this.menuSelection, this.player);
    }
};
