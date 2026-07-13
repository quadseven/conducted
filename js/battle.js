/**
 * Battle System - Turn-based Pokemon-style battles
 */

class Battle {
    constructor(game, playerTrains, enemyTrains, isWild = true, trainerNPC = null) {
        this.game = game;
        this.playerTrains = playerTrains;
        this.enemyTrains = enemyTrains;
        this.isWild = isWild;
        this.trainerNPC = trainerNPC;

        // Inventory is read live from the player (single source of truth) rather
        // than passed in via an ambiguous overloaded parameter.
        this.playerInventory = (game && game.player) ? game.player.items : null;

        this.playerActive = playerTrains[0];
        this.enemyActive = enemyTrains[0];
        if (game && game.player) game.player.registerSeen(this.enemyActive.speciesId);

        // Gen-1 stat stages live on the battle, per side, not on the Train
        // instance (so they reset when the battle ends and never persist).
        this.stages = {
            player: { attack: 0, defense: 0, speed: 0, special: 0, accuracy: 0, evasion: 0 },
            enemy: { attack: 0, defense: 0, speed: 0, special: 0, accuracy: 0, evasion: 0 }
        };
        // Per-turn flinch flags (cleared at the start of each turn).
        this.flinch = { player: false, enemy: false };
        // Volatile conditions are battle-only and clear on switching.
        this.volatile = {
            player: { confusedTurns: 0, rechargeTurns: 0 },
            enemy: { confusedTurns: 0, rechargeTurns: 0 }
        };
        // Ordered actions for the current turn.
        this.turnActions = [];

        this.state = CONSTANTS.BATTLE_STATES.INTRO;
        this.messages = [];
        this.currentMessage = 0;
        this.menuSelection = 0;
        this.moveSelection = 0;
        this.itemSelection = 0;

        this.battleEnded = false;
        this.playerWon = false;
        this.onVictory = null;
        this.caughtTrain = null;

        this.animationQueue = [];
        this.animationTimer = 0;

        // Visual animation state
        this.playerShake = 0;
        this.enemyShake = 0;
        this.enemyFlash = 0;
        this.playerFlash = 0;
        this.visualMoveType = null;
        this.visualMoveSide = null;
        this.visualMoveTimer = 0;

        // Intro message
        if (this.isWild) {
            this.addMessage(`A wild ${this.enemyActive.species.name} appeared!`);
            this.addMessage(`Go! ${this.playerActive.species.name}!`);
        } else {
            const trainerName = this.trainerNPC ? this.trainerNPC.name : 'Conductor';
            this.addMessage(`${trainerName} wants to battle!`);
            this.addMessage(`${trainerName} sent out ${this.enemyActive.species.name}!`);
            this.addMessage(`Go! ${this.playerActive.species.name}!`);
        }
    }

    addMessage(text) {
        this.messages.push(text);
    }

    update(deltaTime) {
        this.animationTimer += deltaTime;

        // Decay animation effects
        if (this.playerShake > 0) this.playerShake -= deltaTime * 10;
        if (this.enemyShake > 0) this.enemyShake -= deltaTime * 10;
        if (this.playerFlash > 0) this.playerFlash -= deltaTime * 3;
        if (this.enemyFlash > 0) this.enemyFlash -= deltaTime * 3;
        if (this.visualMoveTimer > 0) this.visualMoveTimer -= deltaTime;

        // Handle state-based updates
        switch (this.state) {
            case CONSTANTS.BATTLE_STATES.INTRO:
                // Wait for intro messages
                break;

            case CONSTANTS.BATTLE_STATES.MENU:
                // Player selecting action
                break;

            case CONSTANTS.BATTLE_STATES.FIGHT:
                // Player selecting move
                break;

            case CONSTANTS.BATTLE_STATES.ANIMATION:
                // Playing battle animation
                this.updateAnimation(deltaTime);
                break;

            case CONSTANTS.BATTLE_STATES.MESSAGE:
                // Showing message
                break;

            case CONSTANTS.BATTLE_STATES.VICTORY:
            case CONSTANTS.BATTLE_STATES.DEFEAT:
                this.battleEnded = true;
                break;
        }
    }

    updateAnimation(deltaTime) {
        if (this.animationQueue.length > 0 && this.animationTimer > 0.5) {
            const anim = this.animationQueue.shift();
            anim.callback();
            this.animationTimer = 0;

            // After executing the last animation, check if battle should end
            if (this.animationQueue.length === 0) {
                this.checkBattleEnd();
            }
        }
    }

    handleInput(action) {
        switch (this.state) {
            case CONSTANTS.BATTLE_STATES.INTRO:
                this.currentMessage++;
                if (this.currentMessage >= this.messages.length) {
                    this.state = CONSTANTS.BATTLE_STATES.MENU;
                    this.messages = [];
                    this.currentMessage = 0;
                }
                break;

            case CONSTANTS.BATTLE_STATES.MENU:
                this.handleMenuInput(action);
                break;

            case CONSTANTS.BATTLE_STATES.FIGHT:
                this.handleFightInput(action);
                break;

            case CONSTANTS.BATTLE_STATES.ITEM:
                this.handleItemInput(action);
                break;

            case CONSTANTS.BATTLE_STATES.MESSAGE:
                this.currentMessage++;
                if (this.currentMessage >= this.messages.length) {
                    this.state = CONSTANTS.BATTLE_STATES.MENU;
                    this.messages = [];
                    this.currentMessage = 0;
                }
                break;
        }
    }

    handleMenuInput(action) {
        if (action === 'up' || action === 'down') {
            this.menuSelection = (this.menuSelection + 2) % 4;
        } else if (action === 'left' || action === 'right') {
            this.menuSelection = this.menuSelection < 2 ? this.menuSelection + 1 : this.menuSelection - 1;
        } else if (action === 'a') {
            switch (this.menuSelection) {
                case 0:
                    this.state = CONSTANTS.BATTLE_STATES.FIGHT;
                    this.moveSelection = 0;
                    break;
                case 1:
                    // ITEM
                    if (this.getUsableItems().length > 0) {
                        this.state = CONSTANTS.BATTLE_STATES.ITEM;
                        this.itemSelection = 0;
                    } else {
                        this.addMessage("No items available!");
                        this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
                        this.currentMessage = 0;
                    }
                    break;
                case 2:
                    // TRAIN - switch to a healthy benched train (costs the turn).
                    this.switchToBenchedTrain();
                    break;
                case 3:
                    // RUN
                    if (this.isWild) {
                        this.addMessage("Got away safely!");
                        this.battleEnded = true;
                        this.playerWon = false;
                    } else {
                        this.addMessage("Can't run from a trainer battle!");
                        this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
                        this.currentMessage = 0;
                    }
                    break;
            }
        }
    }

    handleFightInput(action) {
        const moves = this.playerActive.moves;

        if (action === 'up' && this.moveSelection >= 2) {
            this.moveSelection -= 2;
        } else if (action === 'down' && this.moveSelection < 2 && this.moveSelection + 2 < moves.length) {
            this.moveSelection += 2;
        } else if (action === 'left' && this.moveSelection % 2 === 1) {
            this.moveSelection--;
        } else if (action === 'right' && this.moveSelection % 2 === 0 && this.moveSelection + 1 < moves.length) {
            this.moveSelection++;
        } else if (action === 'a') {
            const move = moves[this.moveSelection];
            if ((this.playerActive.movePP[move] || 0) <= 0) {
                const hasAnyPP = moves.some(name => (this.playerActive.movePP[name] || 0) > 0);
                if (hasAnyPP) {
                    this.addMessage(`No PP left for ${move}!`);
                    this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
                    this.currentMessage = 0;
                } else {
                    this.playerActive.movePP.Ram = 1;
                    this.executeTurn('Ram');
                }
            } else {
                this.executeTurn(move);
            }
        } else if (action === 'b') {
            this.state = CONSTANTS.BATTLE_STATES.MENU;
        }
    }

    // Entry point when the player commits to a move. Builds the ordered turn
    // and resolves it action-by-action. Damage is computed at resolution time
    // (not here), so the second attacker hits the post-first-hit state.
    executeTurn(playerMoveName) {
        this.state = CONSTANTS.BATTLE_STATES.ANIMATION;
        this.flinch.player = false;
        this.flinch.enemy = false;

        const enemyMoveName = this.chooseEnemyMove();
        this.turnActions = this.orderActions(playerMoveName, enemyMoveName);
        this.processNextAction();
    }

    // Order by move priority, then effective (status-adjusted) speed, ties random.
    orderActions(playerMoveName, enemyMoveName) {
        const playerAction = { side: 'player', attacker: this.playerActive, defender: this.enemyActive, move: playerMoveName };
        const enemyAction = { side: 'enemy', attacker: this.enemyActive, defender: this.playerActive, move: enemyMoveName };

        const pPrio = (MOVES_DB[playerMoveName] && MOVES_DB[playerMoveName].effect && MOVES_DB[playerMoveName].effect.priority) || 0;
        const ePrio = (MOVES_DB[enemyMoveName] && MOVES_DB[enemyMoveName].effect && MOVES_DB[enemyMoveName].effect.priority) || 0;
        if (pPrio !== ePrio) return pPrio > ePrio ? [playerAction, enemyAction] : [enemyAction, playerAction];

        const pSpeed = this.effectiveSpeed('player', this.playerActive);
        const eSpeed = this.effectiveSpeed('enemy', this.enemyActive);
        if (pSpeed !== eSpeed) return pSpeed > eSpeed ? [playerAction, enemyAction] : [enemyAction, playerAction];

        return Utils.randomInt(0, 1) === 0 ? [playerAction, enemyAction] : [enemyAction, playerAction];
    }

    effectiveSpeed(side, train) {
        let speed = this.effectiveStat(side, train, 'speed');
        if (train.status === 'paralyze') speed = Math.floor(speed / 4); // Gen-1 paralysis
        return speed;
    }

    // Gen-1 stat-stage multiplier.
    stageMult(stage) {
        return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
    }

    effectiveStat(side, train, statName) {
        const stage = (this.stages[side] && this.stages[side][statName]) || 0;
        return Math.max(1, Math.floor(train[statName] * this.stageMult(stage)));
    }

    resetStages(side) {
        this.stages[side] = { attack: 0, defense: 0, speed: 0, special: 0, accuracy: 0, evasion: 0 };
        this.volatile[side] = { confusedTurns: 0, rechargeTurns: 0 };
    }

    // Trainer AI favours reliable, effective attacks and uses setup/debuffs
    // early. A little noise keeps battles from becoming deterministic.
    chooseEnemyMove() {
        const moves = this.enemyActive.moves.filter(name => MOVES_DB[name] && (this.enemyActive.movePP[name] || 0) > 0);
        if (moves.length === 0) {
            this.enemyActive.movePP.Ram = 1;
            return 'Ram';
        }
        let best = moves[0];
        let bestScore = -Infinity;
        for (const name of moves) {
            const move = MOVES_DB[name];
            let score;
            if (move.category === 'status') {
                score = this.isWild ? 18 : 30;
                if (move.effect && move.effect.status && this.playerActive.status) score = 1;
            } else {
                const stab = this.enemyActive.types.includes(move.type) ? 1.5 : 1;
                const effectiveness = getTypeEffectiveness(move.type, this.playerActive.types);
                score = move.power * (move.accuracy / 100) * stab * effectiveness;
                if (this.playerActive.currentHP < this.playerActive.maxHP / 3) score *= 1.15;
            }
            score *= 0.9 + Math.random() * 0.2;
            if (score > bestScore) { bestScore = score; best = name; }
        }
        return best;
    }

    // Pull the next action off the turn queue and resolve it.
    processNextAction() {
        // Stop the turn if either active train has fainted; checkBattleEnd
        // (the single end-of-battle owner) runs once the queue drains.
        if (this.playerActive.fainted || this.enemyActive.fainted) {
            this.turnActions = [];
            return;
        }
        if (this.turnActions.length === 0) {
            this.endOfTurn();
            return;
        }

        const action = this.turnActions.shift();
        if (action.attacker.fainted) {
            this.processNextAction();
            return;
        }

        const prefix = action.side === 'enemy' ? 'Enemy ' : '';

        const volatile = this.volatile[action.side];
        if (volatile.rechargeTurns > 0) {
            volatile.rechargeTurns--;
            this.addMessage(`${prefix}${action.attacker.species.name} must recharge!`);
            this.animationQueue.push({ callback: () => this.processNextAction() });
            return;
        }

        // Paralysis full-skip (25%).
        if (action.attacker.status === 'paralyze' && Utils.randomInt(1, 100) <= 25) {
            this.addMessage(`${prefix}${action.attacker.species.name} is paralyzed! It can't move!`);
            this.animationQueue.push({ callback: () => this.processNextAction() });
            return;
        }
        // Flinch (set by a faster attacker earlier this turn).
        if (this.flinch[action.side]) {
            this.flinch[action.side] = false;
            this.addMessage(`${prefix}${action.attacker.species.name} flinched and couldn't move!`);
            this.animationQueue.push({ callback: () => this.processNextAction() });
            return;
        }

        if (volatile.confusedTurns > 0) {
            volatile.confusedTurns--;
            this.addMessage(`${prefix}${action.attacker.species.name} is confused!`);
            if (Utils.randomInt(1, 100) <= 50) {
                const damage = Math.max(1, Math.floor((((2 * action.attacker.level / 5 + 2) * 40 * action.attacker.attack / Math.max(1, action.attacker.defense)) / 50) + 2));
                action.attacker.takeDamage(damage);
                this.addMessage('It hurt itself in its confusion!');
                this.animationQueue.push({ callback: () => this.processNextAction() });
                return;
            }
            if (volatile.confusedTurns === 0) this.addMessage(`${prefix}${action.attacker.species.name} snapped out of confusion!`);
        }

        if ((action.attacker.movePP[action.move] || 0) <= 0) {
            this.addMessage(`${prefix}${action.attacker.species.name} has no PP left for ${action.move}!`);
            this.animationQueue.push({ callback: () => this.processNextAction() });
            return;
        }
        action.attacker.movePP[action.move]--;
        this.addMessage(`${prefix}${action.attacker.species.name} used ${action.move}!`);
        this.animationQueue.push({ callback: () => this.performAttack(action) });
    }

    // Resolve a single attack. Damage is computed HERE, against current state.
    performAttack(action) {
        const { side, attacker, defender, move } = action;
        const moveData = MOVES_DB[move];
        if (!moveData) {
            this.addMessage(`${attacker.species.name} has no usable move!`);
            this.processNextAction();
            return;
        }
        const defenderSide = side === 'player' ? 'enemy' : 'player';
        this.visualMoveType = moveData.type;
        this.visualMoveSide = side;
        this.visualMoveTimer = 0.7;
        const physical = moveData.category === 'physical';

        if (physical) {
            if (side === 'player') this.playerShake = 3; else this.enemyShake = 3;
        }

        // Accuracy/evasion stages affect every targeted move, including status.
        const targetsSelf = moveData.effect && moveData.effect.target === 'self';
        const accuracyStage = Math.max(-6, Math.min(6,
            this.stages[side].accuracy - (targetsSelf ? 0 : this.stages[defenderSide].evasion)));
        const accuracyMultiplier = accuracyStage >= 0
            ? (3 + accuracyStage) / 3
            : 3 / (3 - accuracyStage);
        if (Utils.randomInt(1, 100) > Math.min(100, moveData.accuracy * accuracyMultiplier)) {
            this.addMessage('Attack missed!');
            this.processNextAction();
            return;
        }

        // Status moves: apply effect, no damage.
        if (moveData.category === 'status') {
            this.applyMoveEffect(action, moveData);
            this.processNextAction();
            return;
        }

        // Staged + burn-adjusted attacking stat.
        let attackStat = this.effectiveStat(side, attacker, physical ? 'attack' : 'special');
        if (physical && attacker.status === 'burn') attackStat = Math.floor(attackStat / 2);
        const defenseStat = this.effectiveStat(defenderSide, defender, physical ? 'defense' : 'special');

        const hits = moveData.effect && moveData.effect.hits
            ? Utils.randomInt(moveData.effect.hits[0], moveData.effect.hits[1])
            : 1;
        let totalDamage = 0;
        let result = { hit: true, critical: false, effectiveness: 1.0 };
        for (let h = 0; h < hits; h++) {
            // Accuracy was resolved above so the damage helper gets a guaranteed
            // hit, avoiding a second independent accuracy roll.
            result = calculateDamage(attacker, defender, move, { attackStat, defenseStat, skipAccuracy: true });
            if (!result.hit) break;
            if (side === 'player') this.enemyFlash = 1; else this.playerFlash = 1;
            defender.takeDamage(result.damage);
            if (this.game && this.game.audio) this.game.audio.playSound('hit');
            totalDamage += result.damage;
            if (defender.fainted) break;
        }

        if (!result.hit && totalDamage === 0) {
            this.addMessage('Attack missed!');
            this.processNextAction();
            return;
        }

        if (result.critical) this.addMessage('Critical hit!');
        const effText = getEffectivenessText(result.effectiveness);
        if (effText) this.addMessage(effText);
        if (hits > 1) this.addMessage(`Hit ${hits} times!`);

        // Recoil to the attacker.
        if (moveData.effect && moveData.effect.recoilPercent && totalDamage > 0) {
            const recoil = Math.max(1, Math.floor(totalDamage * moveData.effect.recoilPercent / 100));
            attacker.takeDamage(recoil);
            this.addMessage(`${attacker.species.name} is hit with recoil!`);
        }

        if (moveData.effect && moveData.effect.rechargeTurns && !attacker.fainted) {
            this.volatile[side].rechargeTurns = moveData.effect.rechargeTurns;
        }

        if (defender.fainted) {
            this.addMessage(`${defenderSide === 'enemy' ? 'Enemy ' : ''}${defender.species.name} fainted!`);
            this.processNextAction();
            return;
        }

        // Secondary effects only land if the defender survived.
        this.applyMoveEffect(action, moveData);
        this.processNextAction();
    }

    // Apply a move's secondary effect (status / stat stages / flinch).
    applyMoveEffect(action, moveData) {
        const effect = moveData.effect;
        if (!effect) return;
        const { side, defender } = action;
        const defenderSide = side === 'player' ? 'enemy' : 'player';
        const roll = (chance) => Utils.randomInt(1, 100) <= chance;

        // One status condition at a time.
        if (!defender.status) {
            if (effect.status === 'paralyzed' && roll(effect.chance || 100)) {
                defender.status = 'paralyze';
                this.addMessage(`${defender.species.name} is paralyzed!`);
            } else if (effect.paralyzeChance && roll(effect.paralyzeChance)) {
                defender.status = 'paralyze';
                this.addMessage(`${defender.species.name} is paralyzed!`);
            } else if (effect.burnChance && roll(effect.burnChance)) {
                defender.status = 'burn';
                this.addMessage(`${defender.species.name} was burned!`);
            } else if (effect.poisonChance && roll(effect.poisonChance)) {
                defender.status = 'poison';
                this.addMessage(`${defender.species.name} was poisoned!`);
            }
        }

        if (effect.flinchChance && roll(effect.flinchChance)) {
            this.flinch[defenderSide] = true;
        }
        if (effect.confuseChance && roll(effect.confuseChance) && this.volatile[defenderSide].confusedTurns === 0) {
            this.volatile[defenderSide].confusedTurns = Utils.randomInt(2, 5);
            this.addMessage(`${defender.species.name} became confused!`);
        }

        const bump = (targetSide, stat, delta, label) => {
            const stages = this.stages[targetSide];
            const before = stages[stat];
            stages[stat] = Math.max(-6, Math.min(6, before + delta));
            if (stages[stat] !== before) {
                const who = targetSide === 'player' ? this.playerActive : this.enemyActive;
                this.addMessage(`${who.species.name}'s ${label} ${delta > 0 ? 'rose' : 'fell'}!`);
            }
        };
        if (effect.stat && effect.stages) {
            const targetSide = effect.target === 'self' ? side : defenderSide;
            const chance = effect.chance || 100;
            if (roll(chance)) bump(targetSide, effect.stat, effect.stages, effect.stat[0].toUpperCase() + effect.stat.slice(1));
        }
    }

    // Residual damage (burn/poison) at end of turn, then back to the menu.
    endOfTurn() {
        const residual = (train, side) => {
            if (train.fainted || !train.status) return;
            let dmg = 0;
            if (train.status === 'burn') dmg = Math.max(1, Math.floor(train.maxHP / 16));
            else if (train.status === 'poison') dmg = Math.max(1, Math.floor(train.maxHP / 8));
            if (dmg > 0) {
                const prefix = side === 'enemy' ? 'Enemy ' : '';
                train.takeDamage(dmg);
                this.addMessage(`${prefix}${train.species.name} is hurt by its ${train.status}!`);
                if (train.fainted) this.addMessage(`${prefix}${train.species.name} fainted!`);
            }
        };
        residual(this.playerActive, 'player');
        residual(this.enemyActive, 'enemy');

        if (!this.playerActive.fainted && !this.enemyActive.fainted) {
            this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
            this.currentMessage = 0;
        }
    }

    // Used after a potion/boxcar - the wild/enemy train gets one free attack.
    enemyFreeTurn() {
        this.flinch.player = false;
        this.flinch.enemy = false;
        const move = this.chooseEnemyMove();
        this.turnActions = [{ side: 'enemy', attacker: this.enemyActive, defender: this.playerActive, move }];
        this.processNextAction();
    }

    // Grant EXP for a defeated enemy to the active train (and evolve if eligible).
    awardExp(enemyTrain) {
        const expGained = Math.floor(enemyTrain.species.expYield * enemyTrain.level / 7);
        this.addMessage(`${this.playerActive.species.name} gained ${expGained} EXP!`);
        const beforeLevel = this.playerActive.level;
        this.playerActive.gainStatExp(enemyTrain.species);
        this.playerActive.gainExp(expGained);
        if (this.playerActive.level > beforeLevel) {
            this.addMessage(`${this.playerActive.species.name} grew to Lv${this.playerActive.level}!`);
        }
        // Level-up evolution.
        if (this.playerActive.canEvolve()) {
            const oldName = this.playerActive.species.name;
            if (this.playerActive.evolve()) {
                this.addMessage(`${oldName} evolved into ${this.playerActive.species.name}!`);
            }
        }
    }

    handleVictory() {
        if (this.battleEnded) return;

        if (!this.isWild && this.trainerNPC) {
            const highestLevel = Math.max(...this.trainerNPC.party.map(t => t.level));
            const baseReward = this.trainerNPC.baseReward ||
                (this.trainerNPC.type === 'gym_leader' ? 100 : 50);
            const moneyEarned = baseReward * highestLevel * 2;
            this.addMessage(`You won $${moneyEarned}!`);
            this.moneyEarned = moneyEarned;
        } else if (this.isWild) {
            const moneyEarned = Math.floor(this.enemyActive.level * 10 + Utils.randomInt(0, 20));
            this.addMessage(`You found $${moneyEarned}!`);
            this.moneyEarned = moneyEarned;
        }

        if (this.onVictory) this.onVictory();

        this.state = CONSTANTS.BATTLE_STATES.VICTORY;
        this.battleEnded = true;
        this.playerWon = true;
    }

    handleDefeat() {
        if (this.battleEnded) return;
        this.addMessage("You have no more trains!");
        this.addMessage("You blacked out!");
        this.state = CONSTANTS.BATTLE_STATES.DEFEAT;
        this.battleEnded = true;
        this.playerWon = false;
    }

    // THE single owner of end-of-battle resolution. Called once per drained
    // animation queue. Idempotent via the battleEnded guard.
    checkBattleEnd() {
        if (this.battleEnded) return;

        if (this.playerActive.fainted) {
            const nextTrain = this.playerTrains.find(t => !t.fainted);
            if (nextTrain) {
                this.playerActive = nextTrain;
                this.resetStages('player');
                this.addMessage(`Go! ${this.playerActive.species.name}!`);
            } else {
                this.handleDefeat();
                return;
            }
        }

        if (this.enemyActive.fainted) {
            // Award EXP for THIS defeated enemy before sending out the next one.
            this.awardExp(this.enemyActive);
            const nextTrain = this.enemyTrains.find(t => !t.fainted);
            if (nextTrain) {
            this.enemyActive = nextTrain;
            if (this.game && this.game.player) this.game.player.registerSeen(nextTrain.speciesId);
                this.resetStages('enemy');
                this.addMessage(`Enemy sent out ${this.enemyActive.species.name}!`);
            } else {
                this.handleVictory();
                return;
            }
        }

        // Switched in a new train without ending the battle: back to the menu.
        if (!this.battleEnded) {
            this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
            this.currentMessage = 0;
        }
    }

    getCurrentMessage() {
        if (this.messages.length > 0 && this.currentMessage < this.messages.length) {
            return this.messages[this.currentMessage];
        }
        return "";
    }

    handleItemInput(action) {
        const items = this.getUsableItems();

        if (action === 'up' && this.itemSelection > 0) {
            this.itemSelection--;
        } else if (action === 'down' && this.itemSelection < items.length - 1) {
            this.itemSelection++;
        } else if (action === 'a') {
            if (items.length > 0) {
                this.useItem(items[this.itemSelection]);
            }
        } else if (action === 'b') {
            this.state = CONSTANTS.BATTLE_STATES.MENU;
        }
    }

    // Battle item list derived from the live inventory + Items registry.
    getUsableItems() {
        if (!this.game || !this.game.player) return [];
        return Items.battleUsable(this.game.player).map(it => ({
            name: it.id, displayName: it.name, quantity: it.quantity
        }));
    }

    useItem(item) {
        const def = Items.get(item.name);
        if (!def) return;
        if (def.kind === 'capture') this.useBoxcar();
        else if (def.kind === 'heal') this.usePotion(item.name);
    }

    // Switch the active train to the next healthy benched one. Costs the turn.
    switchToBenchedTrain() {
        const next = this.playerTrains.find(t => t !== this.playerActive && !t.fainted);
        if (!next) {
            this.addMessage("No other trains available!");
            this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
            this.currentMessage = 0;
            return;
        }
        this.state = CONSTANTS.BATTLE_STATES.ANIMATION;
        this.playerActive = next;
        this.resetStages('player');
        this.addMessage(`Go! ${this.playerActive.species.name}!`);
        this.animationQueue.push({ callback: () => this.enemyFreeTurn() });
    }

    usePotion(potionType) {
        const def = Items.get(potionType);
        const healAmount = def ? def.amount : 20;

        if (this.playerActive.currentHP === this.playerActive.maxHP) {
            this.addMessage("HP is already full!");
            this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
            this.currentMessage = 0;
            return;
        }

        this.state = CONSTANTS.BATTLE_STATES.ANIMATION;
        this.addMessage(`You used a ${def ? def.name : potionType}!`);

        const oldHP = this.playerActive.currentHP;
        this.playerActive.heal(healAmount);
        const actualHealed = this.playerActive.currentHP - oldHP;

        this.playerInventory[potionType] = Math.max(0, (this.playerInventory[potionType] || 0) - 1);

        this.animationQueue.push({
            callback: () => {
                this.addMessage(`${this.playerActive.species.name} recovered ${actualHealed} HP!`);
                this.enemyFreeTurn();
            }
        });
    }

    useBoxcar() {
        // Can't catch trainer's trains
        if (!this.isWild) {
            this.addMessage("Can't catch a trainer's train!");
            this.state = CONSTANTS.BATTLE_STATES.MESSAGE;
            this.currentMessage = 0;
            return;
        }

        this.state = CONSTANTS.BATTLE_STATES.ANIMATION;
        this.addMessage("You threw a Boxcar!");

        this.playerInventory.boxcar = Math.max(0, (this.playerInventory.boxcar || 0) - 1);

        // Gen 3-style four-shake capture check. Low HP and status matter, while
        // a common full-health train still has a fair (not near-zero) chance.
        const catchRate = this.enemyActive.species.catchRate || 45;
        const maxHP = this.enemyActive.maxHP;
        const currentHP = this.enemyActive.currentHP;

        // Formula: ((HPmax * 3 - HP * 2) * CatchRate) / (HPmax * 3)
        const statusBonus = this.enemyActive.status ? 1.5 : 1;
        const a = Math.min(255, Math.floor(((maxHP * 3 - currentHP * 2) * catchRate * statusBonus) / (maxHP * 3)));

        this.animationQueue.push({
            callback: () => {
                const shakeThreshold = a >= 255
                    ? 65536
                    : Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
                let shakes = 0;
                for (let i = 0; i < 4; i++) {
                    if (Utils.randomInt(0, 65535) < shakeThreshold) {
                        shakes++;
                    } else {
                        break;
                    }
                }

                if (shakes === 4) {
                    // Caught!
                    this.addMessage(`Got it! ${this.enemyActive.species.name} was caught!`);
                    this.caughtTrain = this.enemyActive;
                    if (this.game && this.game.audio) this.game.audio.playSound('catch');
                    this.state = CONSTANTS.BATTLE_STATES.VICTORY;
                    this.battleEnded = true;
                    this.playerWon = true;
                } else {
                    // Failed
                    const shakeMessages = [
                        "Oh no! The train broke free!",
                        "Aww! It appeared to be caught!",
                        "Aargh! Almost had it!",
                        "Shoot! It was so close too!"
                    ];
                    this.addMessage(shakeMessages[shakes] || "Oh no! The train broke free!");

                    // The wild train gets a free turn after a failed catch.
                    this.enemyFreeTurn();
                }
            }
        });
    }

    // Rounded-rect path helper.
    rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    hpColor(pct) {
        const C = CONSTANTS.COLORS;
        return pct > 0.5 ? C.HP_GREEN : pct > 0.2 ? C.HP_YELLOW : C.HP_RED;
    }

    // One combatant's status panel: framed card, name + Lv, HP bar, type chips.
    drawStatusPanel(ctx, train, px, py, pw, showNumbers) {
        const ph = 92;
        const primary = CONSTANTS.TYPE_COLORS[train.types[0]] || '#bf8c42';
        ctx.fillStyle = 'rgba(4, 10, 14, .55)';
        this.rr(ctx, px + 7, py + 7, pw, ph, 3); ctx.fill();
        ctx.fillStyle = '#09151b';
        this.rr(ctx, px, py, pw, ph, 4); ctx.fill();
        ctx.fillStyle = '#c6923b';
        this.rr(ctx, px + 3, py + 3, pw - 6, ph - 6, 2); ctx.fill();
        ctx.fillStyle = '#f0dfb8';
        this.rr(ctx, px + 6, py + 6, pw - 12, ph - 12, 1); ctx.fill();
        ctx.fillStyle = '#26363a';
        ctx.fillRect(px + 6, py + 6, pw - 12, 8);
        ctx.fillStyle = primary;
        ctx.fillRect(px + 10, py + 17, 5, 36);

        ctx.fillStyle = '#142328';
        ctx.font = 'bold 18px monospace';
        ctx.fillText((train.nickname || train.species.name).toUpperCase(), px + 24, py + 36);
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`LV.${train.level}`, px + pw - 16, py + 35);
        ctx.textAlign = 'left';

        if (train.status) {
            const tag = { paralyze: 'PAR', burn: 'BRN', poison: 'PSN' }[train.status] || '';
            const col = { paralyze: '#F8C838', burn: '#F83048', poison: '#A040A0' }[train.status] || '#888';
            ctx.fillStyle = col;
            this.rr(ctx, px + 23, py + 42, 35, 14, 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
            ctx.fillText(tag, px + 30, py + 53);
        }

        const barX = px + (train.status ? 66 : 24), barY = py + 45, barW = pw - (barX - px) - 18, barH = 11;
        const pct = Math.max(0, train.currentHP / train.maxHP);
        ctx.fillStyle = '#152126';
        this.rr(ctx, barX - 18, barY - 2, barW + 20, barH + 4, 2); ctx.fill();
        ctx.fillStyle = '#e8c65c'; ctx.font = 'bold 9px monospace';
        ctx.fillText('HP', barX - 16, barY + 8);
        ctx.fillStyle = '#4b5553';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = this.hpColor(pct);
        if (pct > 0) ctx.fillRect(barX + 2, barY + 2, Math.max(1, (barW - 4) * pct), barH - 4);

        let chipX = px + 24;
        const chipY = py + 66;
        ctx.font = 'bold 10px monospace';
        for (const t of train.types) {
            const cw = ctx.measureText(t).width + 14;
            ctx.fillStyle = CONSTANTS.TYPE_COLORS[t] || '#888';
            this.rr(ctx, chipX, chipY, cw, 16, 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(t, chipX + 7, chipY + 12);
            chipX += cw + 6;
        }

        if (showNumbers) {
            ctx.fillStyle = '#181818';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${train.currentHP}/${train.maxHP}`, px + pw - 16, py + 79);
            ctx.textAlign = 'left';
        }
    }

    drawMenuGrid(ctx, items, selectedIndex, colorFor) {
        const menuX = 405, menuY = 565, bw = 166, bh = 42, gap = 5;
        items.forEach((label, index) => {
            if (!label) return;
            const x = menuX + (index % 2) * (bw + gap);
            const y = menuY + Math.floor(index / 2) * (bh + gap);
            const sel = index === selectedIndex;
            const accent = colorFor ? colorFor(index) : '#b56c2c';
            ctx.fillStyle = sel ? '#f1cd68' : '#0c171c';
            this.rr(ctx, x, y, bw, bh, 3); ctx.fill();
            ctx.fillStyle = sel ? accent : '#26363a';
            this.rr(ctx, x + 3, y + 3, bw - 6, bh - 6, 1); ctx.fill();
            ctx.fillStyle = sel ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)';
            ctx.fillRect(x + 6, y + 6, bw - 12, 5);
            if (sel) {
                ctx.fillStyle = '#fff4bf';
                ctx.beginPath();
                ctx.moveTo(x + 10, y + 15); ctx.lineTo(x + 18, y + 21); ctx.lineTo(x + 10, y + 27); ctx.fill();
            }
            ctx.fillStyle = '#fff7dd';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, x + bw / 2 + 6, y + bh / 2 + 6);
            ctx.textAlign = 'left';
        });
    }

    render(ctx) {
        const canvas = ctx.canvas;
        ctx.imageSmoothingEnabled = false;
        this.drawStationArena(ctx, canvas.width, canvas.height);
        this.drawBattlePlatform(ctx, 575, 285, 150, 33, false);
        this.drawBattlePlatform(ctx, 198, 465, 178, 39, true);

        // deltaTime-driven shake (no Date.now())
        const enemyShakeX = this.enemyShake > 0 ? Math.sin(this.animationTimer * 40) * this.enemyShake * 2 : 0;
        const playerShakeX = this.playerShake > 0 ? Math.sin(this.animationTimer * 40) * this.playerShake * 2 : 0;

        if (this.enemyActive) {
            this.drawEnemyTrain(ctx, 464 + enemyShakeX, 114);
            if (this.enemyFlash > 0) {
                this.drawImpactBurst(ctx, 574 + enemyShakeX, 205, this.visualMoveType, this.enemyFlash);
            }
            this.drawStatusPanel(ctx, this.enemyActive, 22, 25, 322, false);
        }

        if (this.playerActive) {
            this.drawPlayerTrain(ctx, 67 + playerShakeX, 282);
            if (this.playerFlash > 0) {
                this.drawImpactBurst(ctx, 196 + playerShakeX, 388, this.visualMoveType, this.playerFlash);
            }
            this.drawStatusPanel(ctx, this.playerActive, canvas.width - 346, 449, 324, true);
        }

        if (this.visualMoveTimer > 0) this.drawMoveTrail(ctx);

        ctx.fillStyle = '#071116';
        ctx.fillRect(0, 548, canvas.width, 124);
        ctx.fillStyle = '#c6923b';
        ctx.fillRect(0, 548, canvas.width, 5);
        ctx.fillStyle = '#26363a';
        this.rr(ctx, 14, 560, canvas.width - 28, 100, 4); ctx.fill();
        ctx.fillStyle = '#f0dfb8';
        this.rr(ctx, 20, 566, canvas.width - 40, 88, 2); ctx.fill();
        ctx.fillStyle = '#b56c2c';
        ctx.fillRect(20, 566, 7, 88);

        ctx.fillStyle = '#142328';
        ctx.font = 'bold 17px monospace';
        if (this.messages.length > 0 && this.currentMessage < this.messages.length) {
            this.wrapText(ctx, this.messages[this.currentMessage], 40, 595, canvas.width - 410, 24);
        }

        // Action menu (FIGHT/TRAIN/ITEM/RUN)
        if (this.state === CONSTANTS.BATTLE_STATES.MENU) {
            this.drawMenuGrid(ctx, ['FIGHT', 'TRAIN', 'ITEM', 'RUN'], this.menuSelection);
        }

        // Move menu - each button tinted by the move's type.
        if (this.state === CONSTANTS.BATTLE_STATES.FIGHT) {
            const moves = this.playerActive.moves;
            this.drawMenuGrid(ctx, moves.map(m => `${m}  ${this.playerActive.movePP[m] || 0}PP`), this.moveSelection,
                (i) => {
                    const md = MOVES_DB[moves[i]];
                    return (md && CONSTANTS.TYPE_COLORS[md.type]) || CONSTANTS.COLORS.UI_HIGHLIGHT;
                });
        }

        if (this.state === CONSTANTS.BATTLE_STATES.ITEM) {
            const items = this.getUsableItems();
            this.drawMenuGrid(ctx, items.slice(0, 4).map(it => `${it.displayName} x${it.quantity}`), this.itemSelection, () => '#75502d');
        }
    }

    drawStationArena(ctx, w) {
        const wall = ctx.createLinearGradient(0, 0, 0, 548);
        wall.addColorStop(0, '#07151d'); wall.addColorStop(.58, '#18323a'); wall.addColorStop(1, '#5d4a34');
        ctx.fillStyle = wall; ctx.fillRect(0, 0, w, 548);

        // Grand iron-and-glass terminal roof.
        ctx.fillStyle = '#091116'; ctx.fillRect(0, 0, w, 22);
        ctx.strokeStyle = '#8d642f'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(w / 2, 178, 390, Math.PI, 0); ctx.stroke();
        ctx.strokeStyle = '#263b40'; ctx.lineWidth = 4;
        for (let x = 18; x < w; x += 70) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(w / 2 + (x - w / 2) * .64, 178); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(49, 154, 181, .22)';
        for (let x = 18; x < w - 20; x += 72) ctx.fillRect(x, 25, 55, 88 - Math.abs(x - w / 2) * .06);

        // Repeating station arches and blue night windows.
        for (let x = 20; x < w; x += 126) {
            ctx.fillStyle = '#111d21'; ctx.fillRect(x, 115, 96, 182);
            ctx.fillStyle = '#326b78'; ctx.fillRect(x + 13, 142, 70, 112);
            ctx.fillStyle = '#73b9c3'; ctx.fillRect(x + 18, 147, 60, 7);
            ctx.fillStyle = '#142d36';
            ctx.fillRect(x + 44, 142, 7, 112); ctx.fillRect(x + 13, 190, 70, 7);
            ctx.strokeStyle = '#b17a35'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(x + 48, 142, 38, Math.PI, 0); ctx.stroke();
        }
        ctx.fillStyle = '#0a1114'; ctx.fillRect(0, 286, w, 16);
        ctx.fillStyle = '#b27b34'; ctx.fillRect(0, 286, w, 4);

        // Riveted pillars, lamps, and crimson railway banners.
        for (let x = 8; x < w; x += 188) {
            ctx.fillStyle = '#111b1e'; ctx.fillRect(x, 62, 18, 286);
            ctx.fillStyle = '#9e7136'; ctx.fillRect(x + 3, 62, 5, 286);
            for (let y = 80; y < 340; y += 28) { ctx.fillStyle = '#d1a351'; ctx.fillRect(x + 5, y, 3, 3); }
            ctx.fillStyle = '#ffd275'; ctx.fillRect(x - 2, 250, 24, 12);
            ctx.fillStyle = 'rgba(255,204,103,.13)'; ctx.fillRect(x - 14, 262, 48, 55);
        }
        for (let x = 112; x < w; x += 250) {
            ctx.fillStyle = '#6d2428'; ctx.fillRect(x, 76, 36, 100);
            ctx.fillStyle = '#d6aa52'; ctx.fillRect(x + 4, 76, 4, 100);
            ctx.fillRect(x + 15, 98, 11, 24);
        }

        // Converging platform tiles and rails make the arena read in perspective.
        const floor = ctx.createLinearGradient(0, 300, 0, 548);
        floor.addColorStop(0, '#3b3e38'); floor.addColorStop(1, '#786544');
        ctx.fillStyle = floor; ctx.fillRect(0, 302, w, 246);
        ctx.strokeStyle = 'rgba(239,202,130,.2)'; ctx.lineWidth = 2;
        for (let y = 320; y < 548; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let x = -120; x < w + 120; x += 70) { ctx.beginPath(); ctx.moveTo(w / 2, 302); ctx.lineTo(x, 548); ctx.stroke(); }
        ctx.strokeStyle = '#181d1d'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(342, 302); ctx.lineTo(255, 548); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(426, 302); ctx.lineTo(520, 548); ctx.stroke();
        ctx.strokeStyle = '#b08850'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(342, 302); ctx.lineTo(255, 548); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(426, 302); ctx.lineTo(520, 548); ctx.stroke();
    }

    drawBattlePlatform(ctx, x, y, rx, ry, near) {
        ctx.fillStyle = 'rgba(4,8,10,.55)';
        ctx.beginPath(); ctx.ellipse(x, y + 9, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#182428'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c18a3f'; ctx.lineWidth = near ? 7 : 5; ctx.stroke();
        ctx.strokeStyle = '#5f4a2b'; ctx.lineWidth = 2;
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.moveTo(x - rx * .75, y + i * 6); ctx.lineTo(x + rx * .75, y + i * 6); ctx.stroke();
        }
    }

    speciesPalette(train) {
        const id = train ? train.speciesId : 1;
        const type = (train && train.types[0]) || 'STEAM';
        const base = {
            STEAM: ['#27323a', '#11191e', '#d99b3d', '#ed4a32'], ELECTRIC: ['#164b68', '#0b2738', '#43c9ff', '#ffe45c'],
            DIESEL: ['#526638', '#27351f', '#d8a943', '#e45d35'], MAGLEV: ['#d9e4e5', '#667a8d', '#7d5ce0', '#49e6ff'],
            FREIGHT: ['#885329', '#41291d', '#d5913d', '#5fb5c7'], PASSENGER: ['#efe2bd', '#754038', '#d5a535', '#3a9cae'],
            NUCLEAR: ['#53615d', '#222b2d', '#91e54c', '#e7ff7b'], MONORAIL: ['#d9e3df', '#607172', '#298bb3', '#76d9ef']
        }[type] || ['#555', '#222', '#c90', '#eee'];
        const shift = (id % 5) * 7;
        return { body: base[0], dark: base[1], metal: base[2], glow: base[3], shift };
    }

    trainSeed(id, n) {
        let v = (id * 1103515245 + n * 12345) >>> 0;
        v ^= v >>> 13; return (v >>> 0) / 4294967295;
    }

    poly(ctx, color, points) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
        ctx.closePath(); ctx.fill();
    }

    wheel(ctx, x, y, r, palette, claw) {
        ctx.fillStyle = '#0a1114'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = palette.metal; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = palette.dark; ctx.beginPath(); ctx.arc(x, y, r * .43, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1c66b'; ctx.fillRect(x - 2, y - r + 2, 4, r * 2 - 4);
        if (claw) { ctx.fillStyle = '#11191d'; ctx.fillRect(x - 8, y + r, 16, 9); ctx.fillRect(x - 13, y + r + 6, 7, 6); }
    }

    drawLoco(ctx, x, y, facing, train) {
        const id = train ? train.speciesId : 1;
        const types = (train && train.types) || ['STEAM'];
        const type = types[0];
        const p = this.speciesPalette(train);
        const enemy = facing === 'front';
        const s = enemy ? 1.12 : 1.35;
        const bob = Math.sin(this.animationTimer * 2.4 + id) * 1.5;
        ctx.save();
        ctx.translate(x + (enemy ? 194 : 0), y + bob);
        ctx.scale(enemy ? -s : s, s);
        ctx.lineJoin = 'miter';

        // Every species gets a stable silhouette recipe from its ID.
        const long = 142 + Math.floor(this.trainSeed(id, 2) * 18);
        const tall = 46 + Math.floor(this.trainSeed(id, 3) * 13);
        const outline = '#081014';
        ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.beginPath(); ctx.ellipse(83, 111, 76, 12, 0, 0, Math.PI * 2); ctx.fill();

        if (type === 'MAGLEV' || type === 'MONORAIL') {
            // Sleek hovering beasts: long nose, segmented canopy, luminous lift pads.
            this.poly(ctx, outline, [7,64, 22,42, 95,28, 142,39, 164,62, 148,88, 35,91]);
            this.poly(ctx, p.body, [12,64, 27,47, 96,34, 138,43, 157,62, 144,81, 34,84]);
            this.poly(ctx, p.dark, [13,67, 70,66, 101,82, 34,84]);
            this.poly(ctx, '#cdebf2', [92,38, 137,46, 151,60, 116,58]);
            ctx.fillStyle = p.glow; ctx.fillRect(24, 61, 106, 5);
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = outline; ctx.fillRect(31 + i * 43, 88, 25, 12);
                ctx.fillStyle = p.glow; ctx.fillRect(35 + i * 43, 91, 17, 5);
            }
            if (type === 'MONORAIL') {
                ctx.fillStyle = p.dark; ctx.fillRect(73, 89, 14, 22);
                ctx.fillStyle = p.metal; ctx.fillRect(10, 108, 151, 7);
            } else {
                ctx.strokeStyle = p.glow; ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(43 + i * 44, 102, 13, .1, Math.PI - .1); ctx.stroke(); }
            }
        } else if (type === 'NUCLEAR') {
            // Reactor-centaur: armored cylindrical core on articulated bogies.
            this.poly(ctx, outline, [11,51, 31,32, 121,31, 158,52, 160,83, 137,96, 29,93, 8,75]);
            this.poly(ctx, p.body, [16,53, 34,38, 118,37, 152,55, 153,78, 134,88, 31,86, 15,72]);
            ctx.fillStyle = p.dark; ctx.fillRect(36, 38, 8, 49); ctx.fillRect(120, 38, 9, 50);
            ctx.shadowColor = p.glow; ctx.shadowBlur = 12;
            ctx.fillStyle = p.glow; ctx.beginPath(); ctx.arc(87, 62, 23, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = '#20342e'; ctx.beginPath(); ctx.arc(87, 62, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.glow; ctx.fillRect(84,49,6,26); ctx.fillRect(74,59,26,6);
            this.wheel(ctx, 38, 96, 12, p, true); this.wheel(ctx, 132, 96, 12, p, true);
        } else if (type === 'FREIGHT' || type === 'DIESEL') {
            // Heavy beetle/tank bodies with cargo armor and mechanical feet.
            this.poly(ctx, outline, [5,56, 19,36, 119,28, 157,48, 165,77, 149,94, 22,94, 5,78]);
            this.poly(ctx, p.body, [11,58, 23,42, 116,34, 151,52, 158,75, 144,87, 25,87, 11,75]);
            ctx.fillStyle = p.dark; ctx.fillRect(25, 47, 89, 36);
            const crates = 3 + (id % 2);
            for (let i = 0; i < crates; i++) {
                const cx = 28 + i * 29; ctx.fillStyle = i % 2 ? p.body : p.metal;
                ctx.fillRect(cx, 30 - (i % 2) * 7, 25, 41 + (i % 2) * 7);
                ctx.strokeStyle = outline; ctx.lineWidth = 3; ctx.strokeRect(cx, 30 - (i % 2) * 7, 25, 41 + (i % 2) * 7);
                ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 3, 34); ctx.lineTo(cx + 22, 65); ctx.stroke();
            }
            this.poly(ctx, p.dark, [132,48,154,57,157,72,139,72]);
            for (let i = 0; i < 3; i++) this.wheel(ctx, 34 + i * 52, 92, 13 + (id % 3), p, type === 'FREIGHT');
            if (type === 'DIESEL') { ctx.fillStyle = '#182126'; ctx.fillRect(30,20,11,20); ctx.fillStyle = 'rgba(90,90,85,.65)'; ctx.fillRect(28,13,16,9); }
        } else if (type === 'PASSENGER') {
            // Regal rail-lion: cream streamliner, observation windows, brass prow.
            this.poly(ctx, outline, [6,59, 29,34, 118,31, 158,50, 165,77, 143,94, 20,91]);
            this.poly(ctx, p.body, [12,60, 32,40, 115,37, 152,54, 158,74, 139,86, 23,84]);
            ctx.fillStyle = p.dark; ctx.fillRect(35,45,91,20);
            for (let i = 0; i < 4; i++) { ctx.fillStyle = '#85c7d0'; ctx.fillRect(40 + i * 21,49,15,11); ctx.fillStyle = '#dff6ee'; ctx.fillRect(42 + i * 21,50,10,3); }
            ctx.fillStyle = p.metal; ctx.fillRect(18,68,130,6);
            this.poly(ctx, p.metal, [147,53,166,63,147,83,151,71]);
            for (let i = 0; i < 3; i++) this.wheel(ctx, 39 + i * 48, 89, 11, p, false);
        } else {
            // Steam and Electric are heroic locomotive beasts: boiler torsos, armored prow, legs/wheels.
            ctx.fillStyle = outline; ctx.fillRect(20,40,118,52);
            ctx.fillStyle = p.body; ctx.fillRect(25,45,110,40);
            ctx.fillStyle = p.dark; ctx.fillRect(30,72,105,14);
            ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(72,65,34,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = p.body; ctx.beginPath(); ctx.arc(72,65,28,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = p.metal; ctx.beginPath(); ctx.arc(72,65,19,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = p.dark; ctx.beginPath(); ctx.arc(72,65,10,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = outline; ctx.fillRect(21,13,18,40); ctx.fillRect(16,10,28,9);
            ctx.fillStyle = p.metal; ctx.fillRect(25,15,10,34); ctx.fillRect(19,10,22,5);
            ctx.fillStyle = outline; ctx.fillRect(112,24,36,62);
            ctx.fillStyle = p.dark; ctx.fillRect(117,29,26,53);
            ctx.fillStyle = '#78b9c7'; ctx.fillRect(121,35,18,16);
            this.poly(ctx, outline, [134,65, 166,72, 151,92, 130,84]);
            this.poly(ctx, p.glow, [137,70, 160,74, 149,86, 133,81]);
            const wc = 2 + id % 3;
            for (let i = 0; i < wc; i++) this.wheel(ctx, 39 + i * (83 / Math.max(1,wc-1)), 91, 12, p, type === 'ELECTRIC');
            if (type === 'ELECTRIC') {
                ctx.strokeStyle = p.glow; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(57,39); ctx.lineTo(75,18); ctx.lineTo(95,39); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(54,21); ctx.lineTo(69,13); ctx.lineTo(77,20); ctx.lineTo(92,10); ctx.stroke();
            } else {
                ctx.fillStyle = 'rgba(225,235,225,.82)';
                for (let i = 0; i < 4; i++) { const drift = Math.sin(this.animationTimer * 1.7 + i) * 3; ctx.beginPath(); ctx.arc(29 - i * 7 + drift, 6 - i * 7, 6 + i * 2, 0, Math.PI*2); ctx.fill(); }
            }
        }

        // Shared creature identity: luminous eye/headlamp, ID-driven crests and markings.
        const eyeY = type === 'MAGLEV' || type === 'MONORAIL' ? 61 : 59;
        ctx.shadowColor = p.glow; ctx.shadowBlur = 8; ctx.fillStyle = p.glow;
        ctx.fillRect(147, eyeY, 9, 7); ctx.shadowBlur = 0; ctx.fillStyle = '#fff8bd'; ctx.fillRect(151, eyeY + 1, 3, 3);
        if (id % 3 === 0) { ctx.fillStyle = p.metal; this.poly(ctx, p.metal, [101,34, 109,14, 117,35]); }
        if (id % 5 === 0) { ctx.fillStyle = p.glow; for (let i=0;i<4;i++) ctx.fillRect(45+i*18,76,10,3); }
        if (types[1]) { ctx.fillStyle = CONSTANTS.TYPE_COLORS[types[1]] || p.glow; ctx.fillRect(87,38,6,46); }
        ctx.restore();
    }

    drawImpactBurst(ctx, x, y, type, strength) {
        const color = CONSTANTS.TYPE_COLORS[type] || '#ffdf69';
        ctx.save(); ctx.globalAlpha = Math.min(1, strength);
        ctx.strokeStyle = '#fff8cf'; ctx.lineWidth = 4;
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6; const r = 24 + (i % 3) * 8;
            ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke();
        }
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill(); ctx.restore();
    }

    drawMoveTrail(ctx) {
        const fromPlayer = this.visualMoveSide === 'player';
        const sx = fromPlayer ? 270 : 505, sy = fromPlayer ? 370 : 225;
        const ex = fromPlayer ? 535 : 235, ey = fromPlayer ? 220 : 390;
        const progress = 1 - Math.max(0, this.visualMoveTimer) / .7;
        const color = CONSTANTS.TYPE_COLORS[this.visualMoveType] || '#ffe16a';
        ctx.save(); ctx.globalAlpha = Math.sin(progress * Math.PI);
        for (let i = 0; i < 7; i++) {
            const t = Math.max(0, Math.min(1, progress - i * .045));
            const x = sx + (ex - sx) * t, y = sy + (ey - sy) * t + Math.sin(i * 2.4) * 9;
            ctx.fillStyle = i % 2 ? '#fff4b5' : color; ctx.fillRect(Math.round(x), Math.round(y), 9 - i, 9 - i);
        }
        ctx.restore();
    }

    drawEnemyTrain(ctx, x, y) { this.drawLoco(ctx, x, y, 'front', this.enemyActive); }

    drawPlayerTrain(ctx, x, y) { this.drawLoco(ctx, x, y, 'back', this.playerActive); }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
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
    }

    isComplete() {
        return this.battleEnded;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Battle;
}
