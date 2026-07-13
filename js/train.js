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

    gainExp(amount) {
        this.exp += amount;

        while (this.exp >= this.calculateExpForLevel(this.level + 1) && this.level < CONSTANTS.MAX_LEVEL) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;

        // Recalculate stats
        const oldMaxHP = this.maxHP;
        this.maxHP = this.calculateStat('hp');
        this.currentHP += (this.maxHP - oldMaxHP);
        this.attack = this.calculateStat('attack');
        this.defense = this.calculateStat('defense');
        this.speed = this.calculateStat('speed');
        this.special = this.calculateStat('special');

        // Check for new moves
        this.checkForNewMoves();

        return true;
    }

    checkForNewMoves() {
        for (const moveData of this.species.learnset) {
            if (moveData.level === this.level) {
                if (this.moves.length < CONSTANTS.MAX_MOVES) {
                    this.moves.push(moveData.move);
                } else {
                    const forgotten = this.moves.shift();
                    delete this.movePP[forgotten];
                    this.moves.push(moveData.move);
                }
                this.movePP[moveData.move] = MOVES_DB[moveData.move].pp;
            }
        }
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

    restorePP() {
        for (const move of this.moves) this.movePP[move] = MOVES_DB[move] ? MOVES_DB[move].pp : 0;
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

    // context may carry { item } for stone-style evolutions.
    canEvolve(context = {}) {
        const evolution = this.species.evolution;
        if (!evolution) return false;
        if (evolution.method === 'level') {
            return this.level >= evolution.level;
        }
        if (evolution.method === 'item') {
            return context.item === evolution.item;
        }
        return false;
    }

    evolve(context = {}) {
        const evolution = this.species.evolution;
        if (evolution && this.canEvolve(context)) {
            this.speciesId = evolution.evolvesTo;
            this.species = TRAIN_SPECIES[this.speciesId];
            this.nickname = this.species.name;
            this.types = [...this.species.types];

            // Update base stats
            this.baseHP = this.species.baseStats.hp;
            this.baseAttack = this.species.baseStats.attack;
            this.baseDefense = this.species.baseStats.defense;
            this.baseSpeed = this.species.baseStats.speed;
            this.baseSpecial = this.species.baseStats.special;

            // Recalculate stats
            const oldMaxHP = this.maxHP;
            this.maxHP = this.calculateStat('hp');
            this.currentHP += (this.maxHP - oldMaxHP);
            this.attack = this.calculateStat('attack');
            this.defense = this.calculateStat('defense');
            this.speed = this.calculateStat('speed');
            this.special = this.calculateStat('special');

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
