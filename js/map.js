/**
 * Map System - manages world maps and tiles
 */

class GameMap {
    constructor(name, width, height) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.tiles = Utils.create2DArray(width, height, 1); // 1 = grass
        this.encounters = [];
        this.npcs = [];
    }

    fillRect(x, y, width, height, tileType) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
                    this.tiles[ty][tx] = tileType;
                }
            }
        }
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0; // Wall/border
        }
        return this.tiles[y][x];
    }

    isWalkable(x, y) {
        const tile = this.getTile(x, y);

        // Check for NPCs at this position
        const npcAtPosition = this.npcs.find(npc => npc.x === x && npc.y === y);
        if (npcAtPosition) return false;

        // Walkable tiles: GRASS(1), TALL_GRASS(2), PATH(3), RAILS(6), GRAVEYARD(9), SAND(10), DOOR(12)
        // Unwalkable: VOID(0), WATER(4), WALL(5), BUILDING(7), STATION(8), CAVE(11)
        const walkableTiles = [1, 2, 3, 6, 9, 10, 12];
        return walkableTiles.includes(tile);
    }

    isDoor(x, y) {
        // Check if this tile is a building entrance
        const tile = this.getTile(x, y);
        return tile === 12;
    }

    checkForEncounter() {
        // 10% chance of wild encounter in grass
        return Math.random() < 0.10;
    }

    getRandomEncounter() {
        // Simple random encounter
        const level = Utils.randomInt(2, 7);
        const speciesId = Utils.randomInt(1, 26); // First 26 trains
        return new Train(speciesId, level);
    }

    getNPCAt(x, y) {
        return this.npcs.find(npc => npc.x === x && npc.y === y);
    }
}

function addReverseWarp(sourceMap, destinationMap, transition) {
    const reverse = transition && transition.reverse;
    if (!reverse || !reverse.from || !reverse.to || !destinationMap) return false;

    destinationMap.warps = destinationMap.warps || [];
    destinationMap.warps = destinationMap.warps.filter(warp =>
        warp.from.x !== reverse.from.x || warp.from.y !== reverse.from.y
    );
    destinationMap.warps.push({
        from: reverse.from,
        to: {
            mapId: sourceMap.id,
            x: reverse.to.x,
            y: reverse.to.y,
            dir: reverse.to.dir || 'down'
        }
    });
    return true;
}

// Create starter map
function createStarterMap() {
    const map = new GameMap("pallet_town", 20, 18);

    // Simple grass area
    for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 20; x++) {
            if (x === 0 || x === 19 || y === 0 || y === 17) {
                map.tiles[y][x] = 0; // Border
            } else if (y > 10) {
                map.tiles[y][x] = 2; // Path
            } else {
                map.tiles[y][x] = 1; // Grass
            }
        }
    }

    // Encounters in grass areas
    map.encounters = [1, 4, 7, 10, 13, 16, 19, 21, 23, 25];

    return map;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameMap, createStarterMap };
}
