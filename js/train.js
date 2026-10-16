/**
 * Train class - represents a single train creature
 */

class Train {
    constructor(speciesId, level = 5, moves = null) {
        this.speciesId = speciesId;
        this.species = TRAIN_SPECIES[speciesId];
        this.nickname = this.species.name;
        this.level = level;
        this.exp = this.calculateExpForLevel(level);

        // Base stats
        this.baseHP = this.species.baseStats.hp;
        this.baseAttack = this.species.baseStats.attack;
        this.baseDefense = this.species.baseStats.defense;
        this.baseSpeed = this.species.baseStats.speed;
        this.baseSpecial = this.species.baseStats.special;

        // Individual Values (IVs) - like Pokemon
        this.ivHP = Utils.randomInt(0, 15);
        this.ivAttack = Utils.randomInt(0, 15);
        this.ivDefense = Utils.randomInt(0, 15);
        this.ivSpeed = Utils.randomInt(0, 15);
        this.ivSpecial = Utils.randomInt(0, 15);

        // Gen 1 stat experience (EVs): each stat grows independently to 65535.
        this.evHP = 0;
        this.evAttack = 0;
        this.evDefense = 0;
        this.evSpeed = 0;
        this.evSpecial = 0;

        // Calculate actual stats
        this.maxHP = this.calculateStat('hp');
        this.currentHP = this.maxHP;
        this.attack = this.calculateStat('attack');
        this.defense = this.calculateStat('defense');
        this.speed = this.calculateStat('speed');
        this.special = this.calculateStat('special');

        // Moves
        this.moves = moves || this.getStartingMoves();
        this.movePP = Object.fromEntries(this.moves.map(move => [move, MOVES_DB[move] ? MOVES_DB[move].pp : 0]));

        // Status
        this.status = null;
        this.fainted = false;

        // Types - CLONE the template array. `this.species` is a shared
        // read-only template; aliasing its arrays would let a type-changing
        // move corrupt every train of this species. Always copy mutable state.
        this.types = [...this.species.types];
    }

    calculateStat(statName) {
        let base, iv, ev;

        if (statName === 'hp') {
            base = this.baseHP;
            iv = this.ivHP;
            ev = this.evHP;
        } else {
            if (statName === 'attack') {
                base = this.baseAttack;
                iv = this.ivAttack;
                ev = this.evAttack;
            } else if (statName === 'defense') {
                base = this.baseDefense;
                iv = this.ivDefense;
                ev = this.evDefense;
            } else if (statName === 'speed') {
                base = this.baseSpeed;
                iv = this.ivSpeed;
                ev = this.evSpeed;
            } else {
                base = this.baseSpecial;
                iv = this.ivSpecial;
                ev = this.evSpecial;
            }
        }
        const statExp = Math.floor(Math.sqrt(ev)) >> 2;
        const scaled = Math.floor((((base + iv) * 2 + statExp) * this.level) / 100);
        return statName === 'hp' ? scaled + this.level + 10 : scaled + 5;
    }

    gainStatExp(defeatedSpecies) {
        const oldMaxHP = this.maxHP;
        this.evHP = Math.min(65535, this.evHP + defeatedSpecies.baseStats.hp);
        this.evAttack = Math.min(65535, this.evAttack + defeatedSpecies.baseStats.attack);
        this.evDefense = Math.min(65535, this.evDefense + defeatedSpecies.baseStats.defense);
        this.evSpeed = Math.min(65535, this.evSpeed + defeatedSpecies.baseStats.speed);
        this.evSpecial = Math.min(65535, this.evSpecial + defeatedSpecies.baseStats.special);
        this.maxHP = this.calculateStat('hp');
        this.currentHP = Math.min(this.maxHP, this.currentHP + this.maxHP - oldMaxHP);
        this.attack = this.calculateStat('attack');
        this.defense = this.calculateStat('defense');
        this.speed = this.calculateStat('speed');
        this.special = this.calculateStat('special');
    }

    calculateExpForLevel(level) {
        // Medium Fast growth rate
        return level ** 3;
    }

    // Fraction (0..1) of the way from this level's EXP threshold to the next.
    expProgress(exp = this.exp) {
        const floor = this.calculateExpForLevel(this.level);
        const span = this.calculateExpForLevel(this.level + 1) - floor;
        return Math.min(1, Math.max(0, (exp - floor) / span));
    }

    // Returns one levelUp() record per level gained, in order.
    gainExp(amount) {
        this.exp += amount;
        const records = [];
        while (this.exp >= this.calculateExpForLevel(this.level + 1) && this.level < CONSTANTS.MAX_LEVEL) {
            records.push(this.levelUp());
        }
        return records;
    }

    recalculateStats() {
        const before = { hp: this.maxHP, attack: this.attack, defense: this.defense, speed: this.speed, special: this.special };
        this.maxHP = this.calculateStat('hp');
        this.currentHP += (this.maxHP - before.hp);
        this.attack = this.calculateStat('attack');
        this.defense = this.calculateStat('defense');
        this.speed = this.calculateStat('speed');
        this.special = this.calculateStat('special');
        return {
            hp: this.maxHP - before.hp,
            attack: this.attack - before.attack,
            defense: this.defense - before.defense,
            speed: this.speed - before.speed,
            special: this.special - before.special
        };
    }

    // Raises the level by one. The record lists the stat gains, the moves
    // learned outright and the moves waiting on learnMove() for a free slot.
    levelUp() {
        this.level++;
        const gains = this.recalculateStats();
        return { level: this.level, gains, ...this.checkForNewMoves() };
    }

    // Learns this level's moves while there is room; the rest are left to the
    // player, who chooses which move to forget via learnMove().
    checkForNewMoves() {
        const learnedMoves = [];
        const pendingMoves = [];
        for (const moveData of this.species.learnset) {
            if (moveData.level !== this.level) continue;
            if (this.moves.length < CONSTANTS.MAX_MOVES) {
                this.addMove(moveData.move);
                learnedMoves.push(moveData.move);
            } else {
                pendingMoves.push(moveData.move);
            }
        }
        return { learnedMoves, pendingMoves };
    }

    addMove(move) {
        this.moves.push(move);
        this.movePP[move] = MOVES_DB[move].pp;
    }

    // Swaps the move in slot `replaceIndex` for `move` and returns the forgotten one.
    learnMove(move, replaceIndex) {
        const forgotten = this.moves[replaceIndex];
        delete this.movePP[forgotten];
        this.moves[replaceIndex] = move;
        this.movePP[move] = MOVES_DB[move].pp;
        return forgotten;
    }

    getStartingMoves() {
        const moves = [];
        for (const moveData of this.species.learnset) {
            if (moveData.level <= this.level && moves.length < CONSTANTS.MAX_MOVES) {
                moves.push(moveData.move);
            }
        }
        return moves.length > 0 ? moves : ["Ram"];
    }

    takeDamage(damage) {
        this.currentHP = Math.max(0, this.currentHP - damage);
        if (this.currentHP === 0) {
            this.fainted = true;
        }
    }

    heal(amount) {
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
        if (this.currentHP > 0) {
            this.fainted = false;
        }
    }

    restorePP(amount = Infinity) {
        for (const move of this.moves) {
            const maximum = MOVES_DB[move] ? MOVES_DB[move].pp : 0;
            this.movePP[move] = Math.min(maximum, (this.movePP[move] || 0) + amount);
        }
    }

    getHPPercentage() {
        return (this.currentHP / this.maxHP) * 100;
    }

    getHPColor() {
        const percentage = this.getHPPercentage();
        if (percentage > 50) return CONSTANTS.COLORS.HP_GREEN;
        if (percentage > 20) return CONSTANTS.COLORS.HP_YELLOW;
        return CONSTANTS.COLORS.HP_RED;
    }

    // Context may carry an item, trade flag, form, or branching choice target.
    canEvolve(context = {}) {
        const evolution = this.species.evolution;
        if (!evolution) return false;
        if (evolution.method === 'level') {
            return this.level >= evolution.level;
        }
        if (evolution.method === 'item') {
            return context.item === evolution.item;
        }
        if (evolution.method === 'trade') {
            return context.trade === true;
        }
        if (evolution.method === 'form') {
            return evolution.forms.some(form => form.name === context.form);
        }
        if (evolution.method === 'branch') {
            return this.level >= evolution.level && evolution.choices.some(choice => choice.evolvesTo === context.choice);
        }
        return false;
    }

    // The species id this train would become in `context`, or null if it can't evolve.
    evolutionTarget(context = {}) {
        if (!this.canEvolve(context)) return null;
        const evolution = this.species.evolution;
        if (evolution.method === 'branch') return context.choice;
        if (evolution.method === 'form') return evolution.forms.find(form => form.name === context.form).evolvesTo;
        return evolution.evolvesTo;
    }

    evolve(context = {}) {
        const target = this.evolutionTarget(context);
        if (target !== null) {
            this.speciesId = target;
            this.species = TRAIN_SPECIES[this.speciesId];
            this.nickname = this.species.name;
            this.types = [...this.species.types];

            // Update base stats
            this.baseHP = this.species.baseStats.hp;
            this.baseAttack = this.species.baseStats.attack;
            this.baseDefense = this.species.baseStats.defense;
            this.baseSpeed = this.species.baseStats.speed;
            this.baseSpecial = this.species.baseStats.special;

            this.recalculateStats();

            return true;
        }
        return false;
    }

    toJSON() {
        return {
            speciesId: this.speciesId,
            nickname: this.nickname,
            level: this.level,
            exp: this.exp,
            currentHP: this.currentHP,
            moves: this.moves,
            movePP: this.movePP,
            ivHP: this.ivHP,
            ivAttack: this.ivAttack,
            ivDefense: this.ivDefense,
            ivSpeed: this.ivSpeed,
            ivSpecial: this.ivSpecial,
            evHP: this.evHP,
            evAttack: this.evAttack,
            evDefense: this.evDefense,
            evSpeed: this.evSpeed,
            evSpecial: this.evSpecial,
            status: this.status,
            fainted: this.fainted
        };
    }

    static fromJSON(data) {
        const train = new Train(data.speciesId, data.level, data.moves);
        train.nickname = data.nickname;
        train.exp = data.exp;
        train.currentHP = data.currentHP;
        train.ivHP = data.ivHP;
        train.ivAttack = data.ivAttack;
        train.ivDefense = data.ivDefense;
        train.ivSpeed = data.ivSpeed;
        train.ivSpecial = data.ivSpecial;
        train.evHP = data.evHP || 0;
        train.evAttack = data.evAttack || 0;
        train.evDefense = data.evDefense || 0;
        train.evSpeed = data.evSpeed || 0;
        train.evSpecial = data.evSpecial || 0;
        train.movePP = { ...train.movePP, ...(data.movePP || {}) };
        train.status = data.status;
        train.fainted = data.fainted;

        // Recalculate stats
        train.maxHP = train.calculateStat('hp');
        train.attack = train.calculateStat('attack');
        train.defense = train.calculateStat('defense');
        train.speed = train.calculateStat('speed');
        train.special = train.calculateStat('special');

        return train;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Train;
}
if (typeof window !== 'undefined') {
    window.Train = Train;
}
