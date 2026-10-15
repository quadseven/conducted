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
    this.techniqueNotice = '';
    this.techniqueNoticeTime = 0;

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
    this.menuOptions = ['BAG', 'TRAINS', 'SAVE', 'OPTIONS'];
    this.menuOverlay = null; // null (main menu), 'BAG', 'TRAINS', 'SAVE', 'OPTIONS'
    this.bagSelection = 0;
    this.bagMode = null; // null, 'list', 'use_on_train', or 'depot'
    this.selectedItem = null;
    this.trainSelection = 0;
    this.saveSelection = 0; // 0: YES, 1: NO
    this.saveMessage = '';
    this.optionsSelection = 0; // 0: Audio, 1: Text Speed
    this.textSpeedSetting = 'MID';

    // Shop system - catalog derived from the Items registry (single source of
    // truth). UI expects {name, displayName, price, description}.
    this.shopSelection = 0;
    this.shopMode = null;
    this.shopCategory = 'Trainballs';
    this.shopCategories = ['Trainballs', 'Healing Items', 'Sell Items'];
    this.shopMessage = '';
    this.shopCapacity = 99;
    this.shopItems = Items.shopInventory().map(item => ({
        name: item.id,
        displayName: item.name,
        price: item.price,
        description: item.description,
        category: item.kind === 'capture' ? 'Trainballs' : 'Healing Items'
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
            this.menuOverlay = null;
            this.bagMode = null;
            this.shopMode = null;
            this.selectedItem = null;
            this.saveSelection = 0;
            this.saveMessage = '';
            this.optionsSelection = 0;
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
            if (this.player.storyFlags.leagueChallengeActive) {
                this.player.menuMessage = 'Use the League healing room between battles.';
                return;
            }
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
    this.techniqueNoticeTime = Math.max(0, this.techniqueNoticeTime - deltaTime);
    // Open pause menu with Start button, mobile menu button, Escape, or virtual keys
    const isMenuTriggered = typeof this.input.isMenuJustPressed === 'function'
        ? this.input.isMenuJustPressed()
        : (this.input.isKeyJustPressed('Escape') || this.input.isKeyJustPressed('m') || this.input.isKeyJustPressed('M') || this.input.isKeyJustPressed('Start') || this.input.isVirtualKeyJustPressed('start') || this.input.isVirtualKeyJustPressed('menu'));

    if (!this.player.isMoving && (isMenuTriggered || this.input.isVirtualKeyJustPressed('start') || this.input.isVirtualKeyJustPressed('menu') || this.input.isVirtualKeyJustPressed('b'))) {
        this.setState(CONSTANTS.STATES.MENU);
        console.log('-> MENU');
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
            this.tryMovePlayer(CONSTANTS.DIRECTIONS.UP);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.tryMovePlayer(CONSTANTS.DIRECTIONS.DOWN);
        } else if (this.input.isKeyJustPressed('ArrowLeft') || this.input.isVirtualKeyJustPressed('left')) {
            this.tryMovePlayer(CONSTANTS.DIRECTIONS.LEFT);
        } else if (this.input.isKeyJustPressed('ArrowRight') || this.input.isVirtualKeyJustPressed('right')) {
            this.tryMovePlayer(CONSTANTS.DIRECTIONS.RIGHT);
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

Game.prototype.tryMovePlayer = function (direction) {
    const offsets = {
        [CONSTANTS.DIRECTIONS.UP]: [0, -1],
        [CONSTANTS.DIRECTIONS.DOWN]: [0, 1],
        [CONSTANTS.DIRECTIONS.LEFT]: [-1, 0],
        [CONSTANTS.DIRECTIONS.RIGHT]: [1, 0]
    };
    const [dx, dy] = offsets[direction];
    const x = this.player.x + dx;
    const y = this.player.y + dy;
    const obstacle = this.currentMap.getTechniqueObstacle && this.currentMap.getTechniqueObstacle(x, y);
    const moved = this.player.move(direction, this.currentMap);
    if (obstacle && !moved) this.showTechniqueNotice(`Path blocked. Requires ${obstacle.technique}.`);
    else if (obstacle && moved) this.showTechniqueNotice(obstacle.clearedMessage);
    return moved;
};

Game.prototype.showTechniqueNotice = function (message) {
    this.techniqueNotice = message;
    this.techniqueNoticeTime = 3;
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
        if (npc.type === 'storage') {
            this.setState(CONSTANTS.STATES.MENU);
            this.trainSelection = 0;
            this.bagMode = 'depot';
            this.player.menuMessage = '';
            return;
        }
        const flags = this.player.storyFlags || (this.player.storyFlags = {});
        const requirements = npc.requires || [];
        const hasReq = (req) => {
            if (flags[req] || this.player.hasBadge(req)) return true;
            if (req === 'hasStarter' && (this.player.hasStarterTrain || (this.player.party && this.player.party.length > 0))) return true;
            return false;
        };
        const missing = requirements.filter(req => !hasReq(req));
        if (missing.length) {
            this.state = CONSTANTS.STATES.DIALOGUE;
            let blockedText = [{ speaker: npc.name, text: `This line is closed. Required: ${missing.join(', ')}.` }];
            if (typeof npc.blockedDialogue === 'function') {
                blockedText = npc.blockedDialogue(this.player, missing);
            } else if (npc.blockedDialogue && npc.blockedDialogue.length > 0) {
                blockedText = npc.blockedDialogue;
            }
            this.dialogueBox.show(blockedText, () => {
                this.state = CONSTANTS.STATES.OVERWORLD;
            });
            return;
        }
        if (npc.type === 'healer') {
            if (flags.leagueChallengeActive && npc.id !== 'league_healer') {
                this.state = CONSTANTS.STATES.DIALOGUE;
                this.dialogueBox.show([{ speaker: npc.name, text: 'The League challenge only permits service at its healing room.' }], () => {
                    this.state = CONSTANTS.STATES.OVERWORLD;
                });
                return;
            }
            this.player.healParty();
            this.save();
            this.audio.playSound('heal');
            this.state = CONSTANTS.STATES.DIALOGUE;
            this.dialogueBox.show([
                { speaker: npc.name, text: 'Welcome to the Train Depot. Shall I service your crew?' },
                { speaker: npc.name, text: 'Your trains are ready for service! Please wait while I finish.' },
                { speaker: npc.name, text: 'All done! Your trains are back in fighting shape.' }
            ], () => {
                this.state = CONSTANTS.STATES.OVERWORLD;
            });
            return;
        }
        if (npc.type === 'shopkeeper' || (this.currentMap.theme === 'mart' && npc.type === 'npc')) {
            this.setState(CONSTANTS.STATES.MENU);
            this.menuSelection = this.menuOptions.indexOf('SHOP');
            this.shopSelection = 0;
            this.shopMode = 'categories';
            this.shopCategory = 'Trainballs';
            this.shopMessage = '';
            this.player.menuMessage = '';
            return;
        }
        // Start trainer battle if applicable
        if ((npc.type === 'trainer' || npc.type === 'gym_leader' || npc.type === 'champion') && npc.canBattle && !npc.defeated) {
            if (!this.player.hasAliveTrain()) {
                this.player.healParty();
            }
            let battleIntro = npc.dialogue;
            if (flags['attempted_' + npc.id] && npc.retryDialogue && npc.retryDialogue.length > 0) {
                battleIntro = npc.retryDialogue;
            }
            // Show dialogue first, then start battle
            if (battleIntro && battleIntro.length > 0) {
                this.state = CONSTANTS.STATES.DIALOGUE;
                this.dialogueBox.show(battleIntro, () => {
                    this.startTrainerBattle(npc);
                });
            } else {
                this.startTrainerBattle(npc);
            }
        } else {
            // Show dialogue for defeated trainers or non-battle NPCs
            let dialogue = npc.dialogue;
            if (npc.defeated) {
                if (typeof npc.revisitDialogue === 'function') {
                    dialogue = npc.revisitDialogue(this.player);
                } else if (npc.revisitDialogue && npc.revisitDialogue.length > 0) {
                    dialogue = npc.revisitDialogue;
                } else if (npc.defeatDialogue && npc.defeatDialogue.length > 0) {
                    dialogue = npc.defeatDialogue;
                }
            }
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
    if (NPC_DATA.eliteConductors.some(conductor => conductor.id === npc.id)) {
        this.player.storyFlags.leagueChallengeActive = true;
    }
    this.player.storyFlags['attempted_' + npc.id] = true;

    // Generate enemy trains from NPC party data. Train(speciesId, level) takes
    // a numeric species id and looks it up in TRAIN_SPECIES itself.
    const partyData = typeof npc.getParty === 'function' ? npc.getParty(this.player) : npc.party;
    const enemyTrains = partyData.map(data => {
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
        if (npc.type === 'champion') {
            this.player.storyFlags.leagueChallengeActive = false;
            this.player.storyFlags.creditsSeen = true;
            this.player.storyFlags.epilogueSeen = true;
            this.player.storyFlags.postgameUnlocked = true;
        }
        if (npc.isRival && npc.rivalStage) {
            this.player.storyFlags['rival_blake_stage'] = Math.max(
                this.player.storyFlags['rival_blake_stage'] || 0,
                npc.rivalStage
            );
        }
        console.log(`${npc.name} defeated!`);

        // Award badge if gym leader
        if (npc.type === 'gym_leader' && npc.badge) {
            const earned = this.player.earnBadge(npc.badge);
            if (earned) {
                this.player.storyFlags[npc.badge] = true;
                if (!this.player.defeatedGymLeaders.includes(npc.id)) this.player.defeatedGymLeaders.push(npc.id);
                console.log(`🏅 Earned ${npc.badge}!`);
            }
            if (npc.techniqueReward && this.player.learnTechnique(npc.techniqueReward)) {
                this.player.menuMessage = `Learned ${npc.techniqueReward}!`;
                this.showTechniqueNotice(this.player.menuMessage);
            }
        }

        if (typeof npc.onVictory === 'function') {
            npc.onVictory(this.player);
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
                this.pendingPCTrain = added ? null : this.battle.caughtTrain;
                this.caughtTrainResult = { name: this.battle.caughtTrain.species.name, added };
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
    if (this.pendingPCTrain) {
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            this.player.storage.push(this.pendingPCTrain);
            this.pendingPCTrain = null;
            this.caughtTrainResult.sentToPC = true;
        }
        return;
    }
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        const trainer = this.battle ? this.battle.trainerNPC : null;
        this.battle = null;
        if (trainer && trainer.defeatDialogue && trainer.defeatDialogue.length > 0) {
            this.state = CONSTANTS.STATES.DIALOGUE;
            this.dialogueBox.show(trainer.defeatDialogue, () => {
                this.state = CONSTANTS.STATES.OVERWORLD;
            });
        } else {
            this.state = CONSTANTS.STATES.OVERWORLD;
        }
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
            : this.caughtTrainResult.sentToPC
                ? `${this.caughtTrainResult.name} was sent to the PC.`
                : `Party full. Send ${this.caughtTrainResult.name} to PC? Press A.`;
        ctx.fillText(msg, this.canvas.width / 2, boxY + 140);
    }

    ctx.textAlign = 'left'; // Reset text align
};

Game.prototype.handleDefeat = function () {
    const trainer = this.battle ? this.battle.trainerNPC : null;
    const isRival = trainer && (trainer.isRival || (trainer.id && trainer.id.includes('blake')));

    if (trainer && (trainer.type === 'champion' || NPC_DATA.eliteConductors.some(conductor => conductor.id === trainer.id))) {
        this.player.storyFlags.leagueChallengeActive = false;
    }

    // Heal all trains to full HP (and clear status).
    this.player.healParty();

    if (isRival) {
        console.log('Player defeated by Blake - triggering rival fail state (heal + retry)');
        this.battle = null;
        const retryDialogue = (typeof trainer.lossDialogue === 'function')
            ? trainer.lossDialogue(this.player)
            : (trainer.lossDialogue || [
                { speaker: trainer.name || 'Blake', text: "Tough break, Alex! I patched up your trains. Catch your breath and let's go again whenever you're ready!" }
            ]);
        this.state = CONSTANTS.STATES.DIALOGUE;
        this.dialogueBox.show(retryDialogue, () => {
            this.state = CONSTANTS.STATES.OVERWORLD;
        });
        return;
    }

    console.log('Player defeated - triggering blackout');

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
    const px = 6;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Dawn beyond the Terminus glass: flat stepped bands preserve the pixel
    // language when the 768x672 canvas is scaled by the browser.
    ctx.fillStyle = '#78b8c4'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a8d1c0'; ctx.fillRect(0, 86, w, 214);
    ctx.fillStyle = '#f1c47c'; ctx.fillRect(0, 176, w, 166);
    ctx.fillStyle = '#fff0bd'; ctx.fillRect(0, 248, w, 116);
    ctx.fillStyle = '#e99a57'; ctx.fillRect(0, 330, w, 46);

    // Monumental station silhouette, arched glass and iron ribs.
    ctx.fillStyle = '#15283a';
    ctx.fillRect(0, 0, w, 34);
    ctx.fillRect(0, 34, 34, 472); ctx.fillRect(w - 34, 34, 34, 472);
    for (let x = 48; x < w; x += 96) ctx.fillRect(x, 36, 12, 330);
    ctx.fillRect(0, 354, w, 18);
    ctx.strokeStyle = '#294b5b'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(w / 2, 350, 330, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#d39a3d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(w / 2, 350, 304, Math.PI, 0); ctx.stroke();

    // Distant city and platform details.
    ctx.fillStyle = '#365a55';
    for (let x = 0; x < w; x += 30) {
        const bh = 24 + ((x * 7) % 54);
        ctx.fillRect(x, 354 - bh, 24, bh);
    }
    ctx.fillStyle = '#253544'; ctx.fillRect(0, 372, w, 300);
    ctx.fillStyle = '#596b68'; ctx.fillRect(0, 382, w, 78);
    ctx.fillStyle = '#d2b46c'; ctx.fillRect(0, 382, w, 8);
    ctx.fillStyle = '#9a7a3d';
    for (let x = 0; x < w; x += 48) ctx.fillRect(x, 414, 30, 4);

    // Rails converge into the adventure beyond the station.
    ctx.fillStyle = '#121c29';
    ctx.beginPath(); ctx.moveTo(226, h); ctx.lineTo(337, 438); ctx.lineTo(350, 438); ctx.lineTo(316, h); ctx.fill();
    ctx.beginPath(); ctx.moveTo(452, h); ctx.lineTo(418, 438); ctx.lineTo(431, 438); ctx.lineTo(542, h); ctx.fill();
    ctx.fillStyle = '#7c6045';
    for (let y = 462; y < h; y += Math.max(12, Math.floor((y - 410) / 8))) {
        const spread = (y - 428) * 0.72;
        ctx.fillRect(w / 2 - spread, y, spread * 2, 8);
    }

    // Hero locomotive: chunky, shaded, and readable as a creature silhouette.
    this.drawTitleTrain(ctx, 112, 390, 3.15);

    // Enamel station-name crest.
    const tx = w / 2;
    ctx.fillStyle = '#0c1724'; this.roundRect(ctx, 104, 54, 560, 194, 16); ctx.fill();
    ctx.fillStyle = '#bb7b2c'; this.roundRect(ctx, 112, 62, 544, 178, 12); ctx.fill();
    ctx.fillStyle = '#173f49'; this.roundRect(ctx, 120, 70, 528, 162, 8); ctx.fill();
    ctx.fillStyle = '#205a5f'; ctx.fillRect(132, 82, 504, 8);
    ctx.fillStyle = '#f5d984'; ctx.fillRect(132, 212, 504, 6);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#09141e'; ctx.font = 'bold 52px monospace'; ctx.fillText('GRAND TRANSIT', tx + 4, 146);
    ctx.fillStyle = '#ffe39a'; ctx.fillText('GRAND TRANSIT', tx, 142);
    ctx.fillStyle = '#d9f0d3'; ctx.font = 'bold 18px monospace';
    ctx.fillText('THE IRONLIGHT LEAGUE', tx, 184);

    // Riveted prompt plate stays readable over the rails.
    ctx.fillStyle = '#101c29'; this.roundRect(ctx, 232, 574, 304, 58, 8); ctx.fill();
    ctx.fillStyle = '#e9d6a1'; this.roundRect(ctx, 238, 580, 292, 46, 5); ctx.fill();
    ctx.fillStyle = '#a9792d';
    for (const [rx, ry] of [[247,589],[515,589],[247,614],[515,614]]) ctx.fillRect(rx, ry, px, px);
    if (Math.floor(this.animClock * 2) % 2 === 0) {
        ctx.fillStyle = '#182739'; ctx.font = 'bold 20px monospace'; ctx.fillText('PRESS ENTER', tx, 610);
    }
    ctx.fillStyle = '#d9e5d2'; ctx.font = '12px monospace'; ctx.fillText('A GRAND TRANSIT ADVENTURE', tx, 654);
    ctx.textAlign = 'left'; ctx.restore();
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
    const r = (c, xx, yy, ww, hh) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + xx * s), Math.round(y + yy * s), Math.round(ww * s), Math.round(hh * s)); };
    r('#0c1520', -5, 18, 84, 5); r('#203342', 0, 2, 70, 20);
    r('#315361', 5, 5, 45, 10); r('#132535', 49, -13, 23, 31);
    r('#4b7180', 54, -8, 12, 9); r('#0e1b28', 57, -6, 7, 6);
    r('#b56830', -4, 0, 8, 23); r('#e0a63d', 9, -14, 8, 17);
    r('#925128', 7, -17, 12, 4); r('#d95135', 18, 13, 30, 5);
    r('#e7c568', 2, 7, 7, 7); r('#fff2ae', 4, 9, 3, 3);
    for (let i = 0; i < 3; i++) {
        const wx = 12 + i * 22;
        r('#08111a', wx - 7, 17, 15, 15); r('#5f7180', wx - 4, 20, 9, 9); r('#d09a3f', wx - 1, 23, 3, 3);
    }
    // Pixel steam puffs drift in discrete steps.
    const drift = Math.floor((this.animClock * 8) % 10);
    r('#d9e7df', 10 - drift, -25, 10, 8); r('#edf4df', 0 - drift, -34, 14, 10); r('#b8d3d0', -13 - drift, -42, 18, 12);
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
        const w = ctx.canvas.width, h = ctx.canvas.height;
        ctx.fillStyle = '#132a34'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#294d50'; ctx.fillRect(0, 0, w, 170);
        ctx.fillStyle = '#d9c58e'; ctx.fillRect(0, 170, w, h - 170);
        ctx.fillStyle = '#4b3425';
        for (let y = 174; y < h; y += 36) ctx.fillRect(0, y, w, 3);
        // Lab machinery, map board and specimen tank.
        ctx.fillStyle = '#10202b'; ctx.fillRect(42, 52, 250, 120);
        ctx.fillStyle = '#80b3a5'; ctx.fillRect(52, 62, 230, 96);
        ctx.fillStyle = '#386f62';
        for (let i = 0; i < 8; i++) ctx.fillRect(62 + i * 26, 76 + ((i * 19) % 54), 18, 8);
        ctx.fillStyle = '#9a672e'; ctx.fillRect(540, 42, 142, 190);
        ctx.fillStyle = '#a9d7c7'; ctx.fillRect(552, 54, 118, 132);
        this.drawTitleTrain(ctx, 570, 106, 1.05);
        // Cypress portrait built in the same crisp world palette.
        this.drawCharacter(ctx, 86, 270, 144, '#eef0d8', CONSTANTS.DIRECTIONS.DOWN, false);
        ctx.fillStyle = '#192633'; ctx.fillRect(220, 238, 506, 268);
        ctx.fillStyle = '#f1e5bd'; ctx.fillRect(230, 248, 486, 248);
        ctx.fillStyle = '#b97931'; ctx.fillRect(230, 248, 486, 8);
        ctx.fillStyle = '#173742'; ctx.font = 'bold 22px monospace'; ctx.fillText(dialogue.speaker.toUpperCase(), 254, 292);
        ctx.fillStyle = '#25313b'; ctx.font = '18px monospace'; this.wrapText(ctx, dialogue.text, 254, 334, 430, 31);
        ctx.fillStyle = '#173742'; ctx.font = 'bold 14px monospace'; ctx.fillText('ENTER  CONTINUE', 520, 470);
    }
};

Game.prototype.renderStarterSelection = function (ctx) {
    if (!this.starterSelection) return;

    const ss = this.starterSelection;

    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.fillStyle = '#10242e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#315c59'; ctx.fillRect(0, 0, w, 92);
    ctx.fillStyle = '#d8c58e'; ctx.fillRect(0, 92, w, h - 92);
    ctx.fillStyle = '#8f683d';
    for (let y = 98; y < h; y += 32) ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = '#f5e8bd'; ctx.font = '16px monospace';

    if (ss.phase === 'intro') {
        const dialogue = ss.getCurrentIntroDialogue();
        if (dialogue) {
            ctx.fillStyle = '#132733'; this.roundRect(ctx, 56, 150, 656, 340, 10); ctx.fill();
            ctx.fillStyle = '#f2e5bd'; this.roundRect(ctx, 66, 160, 636, 320, 6); ctx.fill();
            ctx.fillStyle = '#173d47'; ctx.font = 'bold 24px monospace'; ctx.fillText(dialogue.speaker.toUpperCase(), 94, 214);
            ctx.fillStyle = '#28343c'; ctx.font = '18px monospace'; this.wrapText(ctx, dialogue.text, 94, 262, 570, 31);
            ctx.font = 'bold 14px monospace'; ctx.fillText('ENTER  CONTINUE', 492, 444);
        }
    } else if (ss.phase === 'selection') {
        ctx.textAlign = 'center'; ctx.fillStyle = '#f7e8b2'; ctx.font = 'bold 26px monospace';
        ctx.fillText('CHOOSE YOUR FIRST ENGINE', w / 2, 57);

        for (let i = 0; i < ss.starters.length; i++) {
            const starter = ss.starters[i];
            const x = 30 + i * 246;
            const y = 124;
            if (i === ss.selection) {
                ctx.fillStyle = '#e0a83d'; this.roundRect(ctx, x - 8, y - 8, 232, 388, 12); ctx.fill();
            }
            ctx.fillStyle = i === ss.selection ? '#173d47' : '#213641'; this.roundRect(ctx, x, y, 216, 372, 7); ctx.fill();
            ctx.fillStyle = '#e9dfbc'; ctx.fillRect(x + 10, y + 10, 196, 236);
            ctx.fillStyle = ['#b74b36', '#3a7eb4', '#937043'][i]; ctx.fillRect(x + 10, y + 10, 196, 12);
            this.drawStarterTrain(ctx, x + 28, y + 82, 2.25, i);
            ctx.fillStyle = '#f5e8bd'; ctx.font = 'bold 19px monospace'; ctx.fillText(starter.displayName.toUpperCase(), x + 108, y + 286);
            ctx.fillStyle = ['#e17445', '#70c4e9', '#d6a460'][i]; ctx.font = 'bold 14px monospace';
            ctx.fillText(starter.types[0].toUpperCase(), x + 108, y + 321);
            ctx.fillStyle = '#c9d5cb'; ctx.font = '12px monospace'; ctx.fillText(['STEADY & BRAVE', 'QUICK & BRIGHT', 'TOUGH & LOYAL'][i], x + 108, y + 350);
        }
        ctx.fillStyle = '#172b35'; this.roundRect(ctx, 168, 548, 432, 54, 7); ctx.fill();
        ctx.fillStyle = '#f5e8bd'; ctx.font = 'bold 15px monospace'; ctx.fillText('← →  SELECT     ENTER  CONFIRM', w / 2, 581);
        ctx.textAlign = 'left';
    } else if (ss.phase === 'confirmation') {
        const starter = ss.getCurrentStarter();
        ctx.fillStyle = '#152b36'; this.roundRect(ctx, 128, 190, 512, 230, 10); ctx.fill();
        ctx.fillStyle = '#f1e4bd'; this.roundRect(ctx, 138, 200, 492, 210, 6); ctx.fill();
        ctx.textAlign = 'center'; ctx.fillStyle = '#173d47'; ctx.font = 'bold 25px monospace'; ctx.fillText(`BOARD ${starter.displayName.toUpperCase()}?`, w / 2, 280);
        ctx.font = 'bold 17px monospace'; ctx.fillText('ENTER  YES       B  BACK', w / 2, 355); ctx.textAlign = 'left';
    } else if (ss.phase === 'post-selection') {
        const dialogue = ss.getCurrentPostDialogue();
        if (dialogue) {
            ctx.fillStyle = '#152b36'; this.roundRect(ctx, 64, 160, 640, 330, 10); ctx.fill();
            ctx.fillStyle = '#f1e4bd'; this.roundRect(ctx, 74, 170, 620, 310, 6); ctx.fill();
            ctx.fillStyle = '#173d47'; ctx.font = 'bold 23px monospace'; ctx.fillText(dialogue.speaker.toUpperCase(), 100, 220);
            ctx.fillStyle = '#28343c'; ctx.font = '18px monospace'; this.wrapText(ctx, dialogue.text, 100, 270, 556, 31);
            ctx.font = 'bold 14px monospace'; ctx.fillText('ENTER  CONTINUE', 486, 448);
        }
    }
};

Game.prototype.drawStarterTrain = function (ctx, x, y, s, variant) {
    const body = ['#a84232', '#397ca7', '#8a643d'][variant];
    const light = ['#e3794d', '#7bd0e7', '#d3a35b'][variant];
    const r = (c, xx, yy, ww, hh) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + xx * s), Math.round(y + yy * s), Math.round(ww * s), Math.round(hh * s)); };
    r('#27323a', 2, 36, 72, 6); r(body, 6, 12, 61, 25); r(light, 12, 16, 39, 9);
    r('#17232e', 49, 2, 20, 33); r('#b9e1d5', 54, 7, 10, 9);
    r('#e9bf57', 2, 19, 8, 10); r('#f7edb0', 4, 21, 3, 4);
    if (variant === 0) { r('#d6a23d', 17, 0, 8, 14); r('#84512a', 14, 0, 14, 4); }
    if (variant === 1) { r('#d8f2dc', 15, 5, 26, 4); r('#f3d65e', 26, 0, 4, 13); }
    if (variant === 2) { r('#e0a941', 10, 10, 8, 27); r('#482f25', 23, 21, 24, 4); }
    for (let i = 0; i < 3; i++) { r('#121a21', 12 + i * 20, 31, 15, 15); r('#8ba0a2', 16 + i * 20, 35, 7, 7); }
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
    const displayPosition = this.player.getDisplayPosition ? this.player.getDisplayPosition() : this.player;

    // Camera system - center on player
    const cameraX = Math.floor((displayPosition.x * tileSize) - (canvas.width / 2) + (tileSize / 2));
    const cameraY = Math.floor((displayPosition.y * tileSize) - (canvas.height / 2) + (tileSize / 2));

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

    // Semantic renderer: every map shares a deliberate material vocabulary.
    // This avoids the original prototype's stretched per-map atlas textures.
    for (let y = startTileY; y < endTileY; y++) {
        for (let x = startTileX; x < endTileX; x++) {
            const tile = this.currentMap.getTile(x, y);
            const screenX = (x * tileSize) - clampedCameraX;
            const screenY = (y * tileSize) - clampedCameraY;
            if (typeof drawWorldTile === 'function') {
                drawWorldTile(ctx, tile, screenX, screenY, tileSize, x, y, {
                    map: this.currentMap,
                    clock: this.animClock
                });
            } else {
                this.drawFallbackTile(ctx, tile, screenX, screenY, tileSize, x, y);
            }
        }
    }

    // Large authored props and building facades sit above the material layer.
    if (this.currentMap.decorations && typeof drawWorldDecoration === 'function') {
        for (const decoration of this.currentMap.decorations) {
            drawWorldDecoration(ctx, decoration, clampedCameraX, clampedCameraY, tileSize, {
                map: this.currentMap,
                clock: this.animClock
            });
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

                if (typeof drawWorldCharacter === 'function') {
                    drawWorldCharacter(ctx, npc, npcScreenX, npcScreenY, tileSize, {
                        map: this.currentMap, clock: this.animClock,
                        direction: npc.direction || CONSTANTS.DIRECTIONS.DOWN
                    });
                } else {
                    const shirt = npc.defeated ? '#8A8A8A' : npc.type === 'trainer' ? '#D64545' : '#5878A8';
                    this.drawCharacter(ctx, npcScreenX, npcScreenY, tileSize, shirt, npc.direction || CONSTANTS.DIRECTIONS.DOWN);
                }
            }
        }
    }

    // Draw player (centered on screen or clamped to map edges)
    const playerScreenX = (displayPosition.x * tileSize) - clampedCameraX;
    const playerScreenY = (displayPosition.y * tileSize) - clampedCameraY;

    if (typeof drawWorldCharacter === 'function') {
        drawWorldCharacter(ctx, {
            isPlayer: true, type: 'player', direction: this.player.direction
        }, playerScreenX, playerScreenY, tileSize, {
            map: this.currentMap, clock: this.animClock,
            moving: this.player.isMoving, direction: this.player.direction
        });
    } else {
        this.drawPlayer(ctx, playerScreenX, playerScreenY, tileSize, this.player.direction);
    }

    // Developer overlay - off by default (was always-on, cluttering the view).
    if (this.debug) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(6, 6, 190, 38);
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.font = '12px monospace';
        ctx.fillText(`Map: ${this.currentMap.id || this.currentMap.name}`, 12, 22);
        ctx.fillText(`Pos: (${this.player.x}, ${this.player.y})`, 12, 37);
    }

    if (this.techniqueNoticeTime > 0) {
        const notice = this.techniqueNotice;
        ctx.font = '14px monospace';
        const width = Math.min(canvas.width - 32, ctx.measureText(notice).width + 28);
        const x = (canvas.width - width) / 2;
        const y = canvas.height - 56;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(x, y, width, 36);
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.textAlign = 'center';
        ctx.fillText(notice, canvas.width / 2, y + 23);
        ctx.textAlign = 'left';
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

        // Map NPC objects are runtime singletons and are not serialized with
        // Player. Rehydrate their defeated state from the canonical flags so
        // loading cannot reopen completed trainer or Stationmaster battles.
        for (const map of Object.values(this.maps)) {
            for (const npc of map.npcs || []) {
                if (!npc.canBattle || !npc.id) continue;
                const storyFlag = npc.storyFlag || `defeated_${npc.id}`;
                npc.defeated = !!this.player.storyFlags[storyFlag] ||
                    !!(npc.badge && this.player.badges.includes(npc.badge)) ||
                    this.player.defeatedGymLeaders.includes(npc.id);
            }
        }

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
Game.prototype.getShopEntries = function () {
    if (this.shopMode === 'categories') return this.shopCategories;
    if (this.shopMode === 'buy') return this.shopItems.filter(item => item.category === this.shopCategory);
    return Object.keys(this.player.items)
        .filter(id => this.player.items[id] > 0 && Items.get(id) && Items.get(id).price > 0)
        .map(id => ({ ...this.shopItems.find(item => item.name === id), price: Math.max(1, Math.floor(Items.get(id).price / 2)) }));
};

Game.prototype.selectShopEntry = function (entry) {
    if (this.shopMode === 'categories') {
        if (entry === 'Sell Items') this.shopMode = 'sell';
        else {
            this.shopCategory = entry;
            this.shopMode = 'buy';
        }
        this.shopSelection = 0;
        return;
    }
    if (!entry) return;
    const count = this.player.items[entry.name] || 0;
    if (this.shopMode === 'sell') {
        this.player.items[entry.name] = count - 1;
        this.player.addMoney(entry.price);
        this.shopMessage = `Sold ${entry.displayName} for $${entry.price}.`;
    } else if (count >= this.shopCapacity) {
        this.shopMessage = 'Your inventory is full.';
    } else if (!this.player.spendMoney(entry.price)) {
        this.shopMessage = `Not enough money. Need $${entry.price}.`;
    } else {
        this.player.items[entry.name] = count + 1;
        this.shopMessage = `Bought ${entry.displayName} for $${entry.price}.`;
    }
    this.player.menuMessage = this.shopMessage;
};

Game.prototype.updateMenu = function () {
    if (this.bagMode === 'depot') {
        this.updateDepotMenu();
        return;
    }
    if (this.menuOverlay === 'BAG') {
        this.updateMenuBag();
        return;
    }
    if (this.menuOverlay === 'TRAINS') {
        this.updateMenuTrains();
        return;
    }
    if (this.menuOverlay === 'SAVE') {
        this.updateMenuSave();
        return;
    }
    if (this.menuOverlay === 'OPTIONS') {
        this.updateMenuOptions();
        return;
    }
    this.updateMainMenu();
};

Game.prototype.updateMainMenu = function () {
    // Navigation
    if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
        this.menuSelection = (this.menuSelection - 1 + this.menuOptions.length) % this.menuOptions.length;
    } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
        this.menuSelection = (this.menuSelection + 1) % this.menuOptions.length;
    }

    // Select core option
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        const option = this.menuOptions[this.menuSelection];
        if (option === 'BAG') {
            this.menuOverlay = 'BAG';
            this.bagMode = 'list';
            this.bagSelection = 0;
            this.selectedItem = null;
        } else if (option === 'TRAINS') {
            this.menuOverlay = 'TRAINS';
            this.trainSelection = 0;
        } else if (option === 'SAVE') {
            this.menuOverlay = 'SAVE';
            this.saveSelection = 0;
            this.saveMessage = '';
        } else if (option === 'OPTIONS') {
            this.menuOverlay = 'OPTIONS';
            this.optionsSelection = 0;
        }
        return;
    }

    // Close menu with B, X, Backspace, Escape, or mobile menu buttons
    const isDismiss = this.input.isKeyJustPressed('Backspace') ||
                      this.input.isKeyJustPressed('x') ||
                      this.input.isVirtualKeyJustPressed('b') ||
                      this.input.isKeyJustPressed('Escape') ||
                      this.input.isVirtualKeyJustPressed('start') ||
                      this.input.isVirtualKeyJustPressed('menu');

    if (isDismiss) {
        this.state = CONSTANTS.STATES.OVERWORLD;
        if (this.input) this.input.reset();
        console.log('-> OVERWORLD');
    }
};

Game.prototype.updateMenuBag = function () {
    const isCancel = this.input.isKeyJustPressed('Backspace') ||
                     this.input.isKeyJustPressed('x') ||
                     this.input.isVirtualKeyJustPressed('b') ||
                     this.input.isKeyJustPressed('Escape');

    if (this.bagMode === 'use_on_train') {
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.trainSelection = Math.max(0, this.trainSelection - 1);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.trainSelection = Math.min(this.player.party.length - 1, this.trainSelection + 1);
        }

        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            this.useItemOnTrain(this.selectedItem, this.trainSelection);
        } else if (isCancel) {
            this.bagMode = 'list';
            this.selectedItem = null;
        }
        return;
    }

    const items = Object.keys(this.player.items).filter(k => this.player.items[k] > 0);
    this.bagSelection = Math.min(this.bagSelection, Math.max(0, items.length - 1));
    if (items.length > 0) {
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.bagSelection = Math.max(0, this.bagSelection - 1);
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.bagSelection = Math.min(items.length - 1, this.bagSelection + 1);
        }

        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
            const selectedItem = items[this.bagSelection];
            const def = (typeof Items !== 'undefined' && typeof Items.get === 'function') ? Items.get(selectedItem) : null;
            if (def && def.usableInField) {
                this.selectedItem = selectedItem;
                this.bagMode = 'use_on_train';
                this.trainSelection = 0;
            } else {
                this.player.menuMessage = "Can't use that here!";
            }
        }
    }

    if (isCancel) {
        this.menuOverlay = null;
        this.bagMode = null;
        this.selectedItem = null;
    }
};

Game.prototype.useItemOnTrain = function (itemId, trainIndex) {
    const train = this.player.party[trainIndex];
    const def = (typeof Items !== 'undefined' && typeof Items.get === 'function') ? Items.get(itemId) : null;
    if (!train || !def) return;

    if (def.kind === 'heal' && this.player.storyFlags.leagueChallengeActive) {
        this.player.menuMessage = 'Use the League healing room between battles.';
        return;
    }

    if (def.kind === 'heal') {
        if (train.currentHP >= train.maxHP) {
            this.player.menuMessage = 'HP is already full.';
            return;
        }
        train.heal(def.amount);
        this.player.items[def.id] = Math.max(0, (this.player.items[def.id] || 0) - 1);
        this.player.menuMessage = `Used ${def.name} on ${train.nickname || train.species.name}!`;
        if (this.audio && typeof this.audio.playSound === 'function') {
            this.audio.playSound('heal');
        }
        this.bagMode = 'list';
        this.selectedItem = null;
    } else if (def.kind === 'pp') {
        const canRestore = train.moves.some(move => (train.movePP[move] || 0) < MOVES_DB[move].pp);
        if (!canRestore) {
            this.player.menuMessage = 'PP is already full.';
            return;
        }
        train.restorePP(def.amount);
        this.player.items[def.id] = Math.max(0, (this.player.items[def.id] || 0) - 1);
        this.player.menuMessage = `Restored PP for ${train.nickname || train.species.name}!`;
        this.bagMode = 'list';
        this.selectedItem = null;
    } else {
        this.player.menuMessage = "Can't use that here!";
    }
};

Game.prototype.updateMenuTrains = function () {
    const party = this.player.party || [];
    if (party.length > 0) {
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
            this.trainSelection = (this.trainSelection - 1 + party.length) % party.length;
        } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
            this.trainSelection = (this.trainSelection + 1) % party.length;
        }
    }

    const isCancel = this.input.isKeyJustPressed('Backspace') ||
                     this.input.isKeyJustPressed('x') ||
                     this.input.isVirtualKeyJustPressed('b') ||
                     this.input.isKeyJustPressed('Escape');

    if (isCancel) {
        this.menuOverlay = null;
    }
};

Game.prototype.updateMenuSave = function () {
    const isCancel = this.input.isKeyJustPressed('Backspace') ||
                     this.input.isKeyJustPressed('x') ||
                     this.input.isVirtualKeyJustPressed('b') ||
                     this.input.isKeyJustPressed('Escape');

    const isConfirm = this.input.isKeyJustPressed('Enter') ||
                      this.input.isKeyJustPressed('z') ||
                      this.input.isVirtualKeyJustPressed('a');

    if (this.saveMessage) {
        if (isConfirm || isCancel) {
            this.menuOverlay = null;
            this.saveMessage = '';
        }
        return;
    }

    const toggle = this.input.isKeyJustPressed('ArrowLeft') || this.input.isVirtualKeyJustPressed('left') ||
                   this.input.isKeyJustPressed('ArrowRight') || this.input.isVirtualKeyJustPressed('right') ||
                   this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up') ||
                   this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down');

    if (toggle) {
        this.saveSelection = this.saveSelection === 0 ? 1 : 0;
    }

    if (isConfirm) {
        if (this.saveSelection === 0) {
            const success = this.save();
            this.saveMessage = success ? 'Game saved successfully!' : 'Save failed!';
            if (this.audio && typeof this.audio.playSound === 'function') {
                this.audio.playSound('select');
            }
        } else {
            this.menuOverlay = null;
        }
        return;
    }

    if (isCancel) {
        this.menuOverlay = null;
        this.saveMessage = '';
    }
};

Game.prototype.updateMenuOptions = function () {
    const isCancel = this.input.isKeyJustPressed('Backspace') ||
                     this.input.isKeyJustPressed('x') ||
                     this.input.isVirtualKeyJustPressed('b') ||
                     this.input.isKeyJustPressed('Escape');

    if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
        this.optionsSelection = (this.optionsSelection - 1 + 2) % 2;
    } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
        this.optionsSelection = (this.optionsSelection + 1) % 2;
    }

    const toggle = this.input.isKeyJustPressed('ArrowLeft') || this.input.isVirtualKeyJustPressed('left') ||
                   this.input.isKeyJustPressed('ArrowRight') || this.input.isVirtualKeyJustPressed('right') ||
                   this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') ||
                   this.input.isVirtualKeyJustPressed('a');

    if (toggle) {
        if (this.optionsSelection === 0) {
            this.audio.muted = !this.audio.muted;
            if (this.audio.muted) {
                this.audio.stopMusic();
            } else {
                this.audio.playMusic('overworld');
            }
        } else if (this.optionsSelection === 1) {
            const speeds = ['SLOW', 'MID', 'FAST'];
            const speedValues = { SLOW: 20, MID: 35, FAST: 60 };
            const currIdx = speeds.indexOf(this.textSpeedSetting || 'MID');
            const nextIdx = (currIdx + 1) % speeds.length;
            this.textSpeedSetting = speeds[nextIdx];
            if (this.dialogueBox) {
                this.dialogueBox.textSpeed = speedValues[this.textSpeedSetting];
            }
        }
        if (this.audio && typeof this.audio.playSound === 'function') {
            this.audio.playSound('select');
        }
    }

    if (isCancel) {
        this.menuOverlay = null;
    }
};

Game.prototype.updateDepotMenu = function () {
    const total = this.player.party.length + this.player.storage.length;
    if (this.input.isKeyJustPressed('ArrowUp') || this.input.isVirtualKeyJustPressed('up')) {
        this.trainSelection = Math.max(0, this.trainSelection - 1);
    } else if (this.input.isKeyJustPressed('ArrowDown') || this.input.isVirtualKeyJustPressed('down')) {
        this.trainSelection = Math.min(Math.max(0, total - 1), this.trainSelection + 1);
    } else if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('z') || this.input.isVirtualKeyJustPressed('a')) {
        if (this.trainSelection < this.player.party.length) {
            this.player.menuMessage = this.player.depositTrain(this.trainSelection);
        } else {
            const storageIndex = this.trainSelection - this.player.party.length;
            this.player.menuMessage = this.player.withdrawTrain(storageIndex);
        }
        this.save();
        this.trainSelection = 0;
    }

    const isCancel = this.input.isKeyJustPressed('Backspace') ||
                     this.input.isKeyJustPressed('x') ||
                     this.input.isVirtualKeyJustPressed('b') ||
                     this.input.isKeyJustPressed('Escape');

    if (isCancel) {
        this.bagMode = null;
        this.state = CONSTANTS.STATES.OVERWORLD;
        if (this.input) this.input.reset();
    }
};

Game.prototype.renderMenu = function () {
    // Render overworld behind menu
    this.renderOverworld(this.ctx);

    // Draw semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.bagMode === 'depot') {
        UI.drawDepot(this.ctx, this.player, this.trainSelection);
    } else if (this.menuOverlay === 'BAG') {
        if (this.bagMode === 'use_on_train') {
            UI.drawBagUseOnTrain(this.ctx, this.player, this.trainSelection, this.selectedItem);
        } else {
            UI.drawBag(this.ctx, this.player, this.bagSelection);
        }
    } else if (this.menuOverlay === 'TRAINS') {
        UI.drawTrainsOverlay(this.ctx, this.player, this.trainSelection);
    } else if (this.menuOverlay === 'SAVE') {
        UI.drawSaveOverlay(this.ctx, this.player, this.currentMap, this.saveSelection, this.saveMessage);
    } else if (this.menuOverlay === 'OPTIONS') {
        UI.drawOptionsOverlay(this.ctx, this.audio, this.textSpeedSetting, this.optionsSelection);
    } else {
        UI.drawPauseMenu(this.ctx, this.menuOptions, this.menuSelection, this.player);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
