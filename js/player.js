/**
 * Player class - manages player state and party
 */

class Player {
    constructor() {
        this.name = "Alex";
        this.x = 10;  // Start in center of Piston Town (map is 20x15, so center is ~10,7)
        this.y = 7;
        this.direction = CONSTANTS.DIRECTIONS.DOWN;
        this.currentMap = 'PistonTown';

        // Party - empty until starter selection
        this.party = [];
        this.storage = [];
        this.seenSpecies = [];
        this.caughtSpecies = [];

        // Inventory - empty until starter selection
        this.items = {
            potion: 0,
            super_potion: 0,
            boxcar: 0,  // Will receive 5 Boxcars after starter selection
            train_ticket: 1
        };

        this.money = 3000;
        this.badges = [];  // Array of badge names
        this.badgeCount = 0;

        // Story flags
        this.hasStarterTrain = false;
        this.metProfessor = false;
        this.defeatedGymLeaders = [];
        this.storyFlags = {};

        // Animation
        this.isMoving = false;
        this.moveProgress = 0;
        this.targetX = this.x;
        this.targetY = this.y;
    }

    move(direction, map = null) {
        if (this.isMoving) return false;

        this.direction = direction;

        let newX = this.x;
        let newY = this.y;

        switch (direction) {
            case CONSTANTS.DIRECTIONS.UP:
                newY--;
                break;
            case CONSTANTS.DIRECTIONS.DOWN:
                newY++;
                break;
            case CONSTANTS.DIRECTIONS.LEFT:
                newX--;
                break;
            case CONSTANTS.DIRECTIONS.RIGHT:
                newX++;
                break;
        }

        // Check collision with map if provided
        if (map) {
            const walkable = map.isWalkable(newX, newY);
            if (walkable) {
                this.targetX = newX;
                this.targetY = newY;
                this.isMoving = true;
                this.moveProgress = 0;
                return true;
            }
        } else {
            // Fallback for compatibility
            this.targetX = newX;
            this.targetY = newY;
            this.isMoving = true;
            this.moveProgress = 0;
            return true;
        }

        return false;
    }

    update(deltaTime) {
        if (this.isMoving) {
            // Smoother movement: 2.5 instead of 4 (was too fast/jumpy)
            this.moveProgress += deltaTime * 2.5;

            if (this.moveProgress >= 1.0) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.isMoving = false;
                this.moveProgress = 0;
            }
        }
    }

    getDisplayPosition() {
        if (this.isMoving) {
            const currentX = Utils.lerp(this.x, this.targetX, this.moveProgress);
            const currentY = Utils.lerp(this.y, this.targetY, this.moveProgress);
            return { x: currentX, y: currentY };
        }
        return { x: this.x, y: this.y };
    }

    hasAliveTrain() {
        return this.party.some(train => !train.fainted);
    }

    // Single canonical heal: full HP, clear status, revive fainted.
    // (healAllTrains is kept as an alias below for older call sites.)
    healParty() {
        for (const train of this.party) {
            if (!train || typeof train.maxHP === 'undefined') continue;
            train.currentHP = train.maxHP;
            train.status = null;
            train.fainted = false;
            train.restorePP();
        }
    }

    addTrain(train) {
        this.registerCaught(train.speciesId);
        if (this.party.length < CONSTANTS.MAX_PARTY_SIZE) {
            this.party.push(train);
            return true;
        }
        return false;
    }

    registerSeen(speciesId) {
        if (!this.seenSpecies.includes(speciesId)) this.seenSpecies.push(speciesId);
    }

    registerCaught(speciesId) {
        this.registerSeen(speciesId);
        if (!this.caughtSpecies.includes(speciesId)) this.caughtSpecies.push(speciesId);
    }

    addItem(item, quantity) {
        if (this.items[item]) {
            this.items[item] += quantity;
        } else {
            this.items[item] = quantity;
        }
    }

    addMoney(amount) {
        this.money = Math.max(0, this.money + Math.floor(amount));
    }

    // Returns true and deducts if affordable; false otherwise. The single
    // gate for spending so money can never be driven negative.
    spendMoney(amount) {
        amount = Math.floor(amount);
        if (amount < 0 || this.money < amount) return false;
        this.money -= amount;
        return true;
    }

    earnBadge(badgeName) {
        if (!this.badges.includes(badgeName)) {
            this.badges.push(badgeName);
            this.badgeCount = this.badges.length;
            return true;
        }
        return false;
    }

    hasBadge(badgeName) {
        return this.badges.includes(badgeName);
    }

    // Alias kept for backwards compatibility - delegates to the canonical heal.
    healAllTrains() {
        this.healParty();
    }

    toJSON() {
        return {
            version: Player.SAVE_VERSION,
            name: this.name,
            x: this.x,
            y: this.y,
            direction: this.direction,
            currentMap: this.currentMap,
            party: this.party.map(t => t.toJSON()),
            storage: this.storage.map(t => t.toJSON()),
            seenSpecies: this.seenSpecies,
            caughtSpecies: this.caughtSpecies,
            items: this.items,
            money: this.money,
            badges: this.badges,
            badgeCount: this.badgeCount,
            hasStarterTrain: this.hasStarterTrain,
            metProfessor: this.metProfessor,
            defeatedGymLeaders: this.defeatedGymLeaders,
            storyFlags: this.storyFlags
        };
    }

    static fromJSON(data) {
        const player = new Player();
        if (!data) return player;

        player.name = data.name ?? player.name;
        player.x = data.x ?? player.x;
        player.y = data.y ?? player.y;
        player.direction = data.direction ?? player.direction;
        const savedMap = data.currentMap ?? player.currentMap;
        player.currentMap = savedMap === 'piston_town' || savedMap === 'pallet_town' ? 'PistonTown' : savedMap;

        // Party: guard against missing/empty and drop any entry that fails to
        // deserialize rather than throwing out the whole save.
        player.party = Array.isArray(data.party)
            ? data.party.map(t => {
                try { return Train.fromJSON(t); } catch (e) { console.warn('Bad train in save, skipped:', e); return null; }
            }).filter(Boolean)
            : [];
        player.storage = Array.isArray(data.storage)
            ? data.storage.map(t => {
                try { return Train.fromJSON(t); } catch (e) { console.warn('Bad stored train in save, skipped:', e); return null; }
            }).filter(Boolean)
            : [];
        player.seenSpecies = Array.isArray(data.seenSpecies) ? data.seenSpecies : [];
        player.caughtSpecies = Array.isArray(data.caughtSpecies) ? data.caughtSpecies : [];

        // Merge saved items OVER the constructor defaults so keys added in a
        // newer build (future items) are still present after loading an old save.
        player.items = { ...player.items, ...(data.items || {}) };

        player.money = typeof data.money === 'number' ? data.money : player.money;
        player.badges = data.badges || [];
        player.badgeCount = data.badgeCount || player.badges.length;
        player.hasStarterTrain = data.hasStarterTrain || false;
        player.metProfessor = data.metProfessor || false;
        player.defeatedGymLeaders = data.defeatedGymLeaders || [];
        player.storyFlags = data.storyFlags || {};
        return player;
    }
}

// Bump when the save shape changes incompatibly so loaders can migrate.
Player.SAVE_VERSION = 3;

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}
