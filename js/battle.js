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
        const C = CONSTANTS.COLORS;
        const ph = 86;
        // shadow + frame
        ctx.fillStyle = 'rgba(24,24,24,0.25)';
        this.rr(ctx, px + 4, py + 4, pw, ph, 12); ctx.fill();
        ctx.fillStyle = '#181818';
        this.rr(ctx, px, py, pw, ph, 12); ctx.fill();
        ctx.fillStyle = C.UI_BG;
        this.rr(ctx, px + 4, py + 4, pw - 8, ph - 8, 9); ctx.fill();

        // name + level
        ctx.fillStyle = '#181818';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(train.nickname || train.species.name, px + 16, py + 28);
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv${train.level}`, px + pw - 14, py + 28);
        ctx.textAlign = 'left';

        // status badge (PAR/BRN/PSN)
        if (train.status) {
            const tag = { paralyze: 'PAR', burn: 'BRN', poison: 'PSN' }[train.status] || '';
            const col = { paralyze: '#F8C838', burn: '#F83048', poison: '#A040A0' }[train.status] || '#888';
            ctx.fillStyle = col;
            this.rr(ctx, px + 16, py + 34, 40, 16, 4); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
            ctx.fillText(tag, px + 22, py + 46);
        }

        // HP bar
        const barX = px + (train.status ? 64 : 16), barY = py + 38, barW = pw - (barX - px) - 16, barH = 12;
        const pct = Math.max(0, train.currentHP / train.maxHP);
        ctx.fillStyle = '#181818';
        this.rr(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 4); ctx.fill();
        ctx.fillStyle = C.HP_BG;
        this.rr(ctx, barX, barY, barW, barH, 3); ctx.fill();
        ctx.fillStyle = this.hpColor(pct);
        if (pct > 0) { this.rr(ctx, barX, barY, barW * pct, barH, 3); ctx.fill(); }

        // type chips
        let chipX = px + 16;
        const chipY = py + 58;
        ctx.font = 'bold 10px monospace';
        for (const t of train.types) {
            const cw = ctx.measureText(t).width + 14;
            ctx.fillStyle = CONSTANTS.TYPE_COLORS[t] || '#888';
            this.rr(ctx, chipX, chipY, cw, 16, 4); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(t, chipX + 7, chipY + 12);
            chipX += cw + 6;
        }

        if (showNumbers) {
            ctx.fillStyle = '#181818';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${train.currentHP}/${train.maxHP}`, px + pw - 14, py + 70);
            ctx.textAlign = 'left';
        }
    }

    drawMenuGrid(ctx, items, selectedIndex, colorFor) {
        const C = CONSTANTS.COLORS;
        const menuX = 408, menuY = 566, bw = 162, bh = 40, gap = 6;
        items.forEach((label, index) => {
            if (!label) return;
            const x = menuX + (index % 2) * (bw + gap);
            const y = menuY + Math.floor(index / 2) * (bh + gap);
            const sel = index === selectedIndex;
            const accent = colorFor ? colorFor(index) : C.UI_HIGHLIGHT;
            ctx.fillStyle = '#181818';
            this.rr(ctx, x, y, bw, bh, 8); ctx.fill();
            ctx.fillStyle = sel ? accent : C.WHITE;
            this.rr(ctx, x + 3, y + 3, bw - 6, bh - 6, 6); ctx.fill();
            // selection cursor
            if (sel) {
                ctx.fillStyle = '#181818';
                ctx.font = 'bold 16px monospace';
                ctx.fillText('>', x + 10, y + bh / 2 + 6);
            }
            ctx.fillStyle = sel ? '#fff' : '#181818';
            ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, x + bw / 2 + 6, y + bh / 2 + 6);
            ctx.textAlign = 'left';
        });
    }

    render(ctx) {
        const canvas = ctx.canvas;
        const C = CONSTANTS.COLORS;

        // Backdrop: sky gradient + ground band
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, C.BATTLE_SKY2);
        sky.addColorStop(1, C.BATTLE_SKY);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = C.BATTLE_GROUND;
        ctx.fillRect(0, 372, canvas.width, canvas.height - 372);

        // Battle platforms (oval pads under each combatant)
        ctx.fillStyle = C.BATTLE_PLATFORM;
        ctx.beginPath(); ctx.ellipse(604, 280, 132, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(196, 452, 156, 36, 0, 0, Math.PI * 2); ctx.fill();

        // deltaTime-driven shake (no Date.now())
        const enemyShakeX = this.enemyShake > 0 ? Math.sin(this.animationTimer * 40) * this.enemyShake * 2 : 0;
        const playerShakeX = this.playerShake > 0 ? Math.sin(this.animationTimer * 40) * this.playerShake * 2 : 0;

        if (this.enemyActive) {
            this.drawEnemyTrain(ctx, 540 + enemyShakeX, 150);
            if (this.enemyFlash > 0) {
                ctx.globalAlpha = this.enemyFlash * 0.5;
                ctx.fillStyle = C.HP_RED;
                ctx.fillRect(540 + enemyShakeX, 150, 128, 128);
                ctx.globalAlpha = 1.0;
            }
            this.drawStatusPanel(ctx, this.enemyActive, 36, 40, 320, false);
        }

        if (this.playerActive) {
            this.drawPlayerTrain(ctx, 132 + playerShakeX, 312);
            if (this.playerFlash > 0) {
                ctx.globalAlpha = this.playerFlash * 0.5;
                ctx.fillStyle = C.HP_RED;
                ctx.fillRect(132 + playerShakeX, 312, 128, 128);
                ctx.globalAlpha = 1.0;
            }
            this.drawStatusPanel(ctx, this.playerActive, canvas.width - 356, 452, 320, true);
        }

        // Message box (framed, bottom full-width)
        ctx.fillStyle = '#181818';
        this.rr(ctx, 16, 556, canvas.width - 32, 100, 14); ctx.fill();
        ctx.fillStyle = C.UI_BG;
        this.rr(ctx, 22, 562, canvas.width - 44, 88, 10); ctx.fill();

        ctx.fillStyle = '#181818';
        ctx.font = '18px monospace';
        if (this.messages.length > 0 && this.currentMessage < this.messages.length) {
            this.wrapText(ctx, this.messages[this.currentMessage], 40, 592, canvas.width - 360, 24);
        }

        // Action menu (FIGHT/TRAIN/ITEM/RUN)
        if (this.state === CONSTANTS.BATTLE_STATES.MENU) {
            this.drawMenuGrid(ctx, ['FIGHT', 'TRAIN', 'ITEM', 'RUN'], this.menuSelection);
        }

        // Move menu - each button tinted by the move's type.
        if (this.state === CONSTANTS.BATTLE_STATES.FIGHT) {
            const moves = this.playerActive.moves;
            this.drawMenuGrid(ctx, moves.map(m => `${m} ${this.playerActive.movePP[m] || 0}`), this.moveSelection,
                (i) => {
                    const md = MOVES_DB[moves[i]];
                    return (md && CONSTANTS.TYPE_COLORS[md.type]) || CONSTANTS.COLORS.UI_HIGHLIGHT;
                });
        }
    }

    // Stylized locomotive fallback art (steam-engine palette). facing 'front'
    // points the cab/buffer toward the player; 'back' faces away.
    drawLoco(ctx, x, y, facing, train) {
        const C = CONSTANTS.COLORS;
        const speciesId = train ? train.speciesId : 1;
        const types = train ? train.types : ['STEAM'];
        const hue = (speciesId * 47) % 360;
        const bodyColor = `hsl(${hue} 42% 38%)`;
        const bodyDark = `hsl(${hue} 46% 23%)`;
        const accent = CONSTANTS.TYPE_COLORS[types[0]] || C.LOCO_BRASS;
        const front = facing === 'front';
        const w = 124, bodyY = y + 36, bodyH = 38 + (speciesId % 3) * 5;

        // contact shadow
        ctx.fillStyle = 'rgba(24,24,24,0.22)';
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + 116, 58, 12, 0, 0, Math.PI * 2); ctx.fill();

        // boiler body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + 8, bodyY, w - 16, bodyH);
        ctx.fillStyle = bodyDark;
        ctx.fillRect(x + 8, bodyY + bodyH - 8, w - 16, 8); // underside shade
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 8, bodyY, w - 16, 6); // top sheen

        // cab (rear)
        const cabX = front ? x + w - 42 : x + 6;
        ctx.fillStyle = bodyDark;
        ctx.fillRect(cabX, y + 14, 36, bodyH + 6);
        ctx.fillStyle = '#9CD0E8'; // cab window
        ctx.fillRect(cabX + 7, y + 22, 22, 16);

        // smokestack + dome (front)
        const stackX = front ? x + 20 : x + w - 34;
        ctx.fillStyle = C.LOCO_IRON_DARK;
        ctx.fillRect(stackX, y + 6, 14, 32);
        ctx.fillStyle = accent;
        ctx.fillRect(stackX - 2, y + 4, 18, 6); // stack rim
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(x + w / 2, bodyY + 6, 8, Math.PI, 0); ctx.fill(); // steam dome

        // front buffer beam + headlight (only when facing us)
        if (front) {
            ctx.fillStyle = C.LOCO_IRON_DARK;
            ctx.fillRect(x, bodyY + 6, 10, bodyH - 6);
            ctx.fillStyle = accent;
            ctx.beginPath(); ctx.arc(x + 6, bodyY + bodyH / 2, 6, 0, Math.PI * 2); ctx.fill(); // headlight
            ctx.fillStyle = accent;
            ctx.fillRect(x + 8, bodyY + bodyH - 14, w - 16, 5); // red accent stripe
        }

        // wheels
        const wheelCount = 2 + speciesId % 4;
        ctx.fillStyle = C.LOCO_IRON;
        for (let i = 0; i < wheelCount; i++) {
            const wx = x + 20 + i * (84 / Math.max(1, wheelCount - 1));
            ctx.beginPath(); ctx.arc(wx, bodyY + bodyH, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = C.LOCO_IRON_DARK;
            ctx.beginPath(); ctx.arc(wx, bodyY + bodyH, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = C.LOCO_IRON;
        }

        if (types.includes('ELECTRIC') || types.includes('MAGLEV')) {
            ctx.strokeStyle = accent; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(x + 44, y + 16); ctx.lineTo(x + 60, y - 4); ctx.lineTo(x + 78, y + 16); ctx.stroke();
            ctx.fillStyle = '#f8f0b0';
            ctx.fillRect(x + 56 + speciesId % 15, y - 8, 5, 5);
        }
        if (types.includes('FREIGHT')) {
            ctx.fillStyle = bodyDark;
            const crates = 2 + speciesId % 3;
            for (let i = 0; i < crates; i++) ctx.fillRect(x + 38 + i * 20, bodyY - 13 - (i % 2) * 5, 17, 15 + (i % 2) * 5);
        }
        if (types.includes('NUCLEAR')) {
            ctx.strokeStyle = '#d8ff58'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x + 64, bodyY + 22, 13, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#d8ff58'; ctx.fillRect(x + 61, bodyY + 12, 6, 20); ctx.fillRect(x + 54, bodyY + 19, 20, 6);
        }
        if (types.includes('MONORAIL')) {
            ctx.fillStyle = accent;
            ctx.fillRect(x + 4, bodyY + bodyH + 9, w - 8, 7);
            ctx.fillStyle = C.LOCO_IRON_DARK;
            ctx.fillRect(x + 56, bodyY + bodyH, 12, 20);
        }

        // steam puffs from the stack
        ctx.fillStyle = 'rgba(232,232,232,0.85)';
        for (let i = 0; i < 3; i++) {
            const t = this.animationTimer + i;
            ctx.beginPath();
            ctx.arc(stackX + 7 + Math.sin(t) * 5, y + 2 - i * 9, 5 + i * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawEnemyTrain(ctx, x, y) {
        const sprite = this.game.images[`${this.enemyActive.species.name}_front`];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, x, y, 128, 128);
        } else {
            this.drawLoco(ctx, x, y, 'front', this.enemyActive);
        }
    }

    drawPlayerTrain(ctx, x, y) {
        const sprite = this.game.images[`${this.playerActive.species.name}_back`];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, x, y, 128, 128);
        } else {
            this.drawLoco(ctx, x, y, 'back', this.playerActive);
        }
    }

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
