/**
 * World Maps - Piston Town, interiors, and Route 1
 * Minimal starter maps with warp/door metadata and collision helpers
 */

// --- helpers ---
function rect(x, y, w = 1, h = 1) { return { x, y, w, h }; }
function pos(x, y, dir = 'down') { return { x, y, dir }; }

// make an empty map filled with tileIndex
function grid(width, height, fillIndex = 0) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fillIndex));
}

// quick border builder: frame with a wall tile, inside floor tile
function boxed(width, height, wallIndex = 1, floorIndex = 0) {
  const t = grid(width, height, floorIndex);
  for (let x = 0; x < width; x++) { t[0][x] = wallIndex; t[height - 1][x] = wallIndex; }
  for (let y = 0; y < height; y++) { t[y][0] = wallIndex; t[y][width - 1] = wallIndex; }
  return t;
}

// Tile collision types
const TILE_TYPES = {
  BLOCKED: 0,      // Walls, buildings, trees - can't walk
  WALKABLE: 1,     // Paths, floors - can walk
  GRASS: 2,        // Grass - can walk, encounters
  TALL_GRASS: 3,   // Tall grass - can walk, more encounters
  DOOR: 12,         // Doors - can walk, triggers warp
  WATER: 5         // Water - blocked unless surfing
};

// --- map registry (global WORLD_MAPS object) ---
const WORLD_MAPS = {
  PistonTown: {
    id: 'PistonTown',
    name: 'Piston Town',
    tileset: 'assets/tiles/piston-town.png',
    width: 20, height: 15,
    tiles: [
      // Row 0 - Top border with tall grass (using row 7 of tileset, indices ~227)
      [227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 227],
      // Row 1 - Tall grass border with player house (top-left)
      [227, 227, 163, 163, 227, 227, 226, 226, 226, 226, 226, 226, 226, 226, 227, 227, 227, 227, 227, 227],
      // Row 2 - Player house with door, grass area
      [227, 227, 163, 163, 227, 226, 226, 226, 226, 226, 226, 226, 226, 226, 226, 227, 227, 227, 227, 227],
      // Row 3 - Path starts, grass areas, Professor Lab (top)
      [227, 227, 140, 139, 139, 139, 226, 226, 163, 163, 163, 226, 226, 226, 226, 226, 227, 227, 227, 227],
      // Row 4 - Main horizontal path with Lab middle
      [227, 226, 226, 139, 226, 139, 139, 139, 163, 132, 163, 139, 139, 139, 226, 226, 226, 227, 227, 227],
      // Row 5 - Lab bottom with door, path continues
      [227, 226, 226, 139, 226, 226, 226, 139, 163, 140, 163, 139, 226, 226, 226, 226, 226, 226, 227, 227],
      // Row 6 - Central path intersection
      [227, 226, 139, 139, 139, 226, 226, 139, 139, 139, 139, 139, 139, 139, 226, 226, 226, 226, 226, 227],
      // Row 7 - Town center path (player spawn at 10,7), Depot (right)
      [227, 226, 139, 226, 226, 140, 226, 226, 226, 226, 139, 226, 226, 226, 226, 163, 163, 226, 226, 227],
      // Row 8 - Depot with door, Mart (top), grass
      [227, 226, 139, 226, 226, 226, 226, 226, 226, 226, 139, 226, 226, 226, 226, 163, 163, 226, 226, 227],
      // Row 9 - Path to south, Mart (bottom)
      [227, 226, 139, 226, 226, 226, 226, 226, 163, 163, 139, 226, 226, 226, 226, 140, 139, 226, 226, 227],
      // Row 10 - Vertical path continues with Mart door
      [227, 226, 139, 226, 226, 226, 226, 226, 163, 163, 139, 226, 226, 226, 226, 226, 139, 226, 226, 227],
      // Row 11 - Path widens south
      [227, 226, 139, 226, 226, 226, 226, 226, 140, 139, 139, 139, 226, 226, 226, 226, 139, 226, 226, 227],
      // Row 12 - Path continues to exit
      [227, 226, 139, 139, 226, 226, 226, 226, 226, 226, 139, 226, 226, 226, 226, 226, 139, 226, 226, 227],
      // Row 13 - Near exit with grass
      [227, 226, 226, 139, 139, 139, 226, 226, 226, 226, 139, 226, 226, 226, 139, 139, 139, 226, 226, 227],
      // Row 14 - Bottom border with exit at center
      [227, 227, 227, 227, 227, 227, 227, 227, 227, 227, 139, 227, 227, 227, 227, 227, 227, 227, 227, 227],
    ],
    warps: [
      // door into Player House
      { from: rect(2, 3), to: { mapId: 'PlayerHouse', ...pos(3, 6, 'down') } },
      // door into Lab
      { from: rect(9, 5), to: { mapId: 'LabInterior', ...pos(4, 7, 'down') } },
      // door into Coal Harbor Gym
      { from: rect(5, 7), to: { mapId: 'CoalHarborGym', ...pos(7, 13, 'up') } },
      // door into Depot
      { from: rect(15, 9), to: { mapId: 'HealingDepot', ...pos(3, 6, 'down') } },
      // door into Mart
      { from: rect(8, 11), to: { mapId: 'TrainMart', ...pos(3, 6, 'down') } },
      // route exit on bottom (SEAMLESS transition)
      { from: rect(10, 14), to: { mapId: 'Route1', ...pos(10, 0, 'down') } },
    ],
    connections: {
      south: { mapId: 'Route1', offsetX: 0, offsetY: 0 } // Connect bottom edge to Route1 top
    },
    npcs: [],
    getTile: function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return this.tiles[y][x];
    },
    isWalkable: function(x, y) {
      const tile = this.getTile(x, y);
      const npcAtPosition = this.npcs.find(npc => npc.x === x && npc.y === y);
      if (npcAtPosition) return false;

      // PistonTown uses tileset indices from piston-town.png
      // Walkable: 139=path, 140=door, 226=grass, 227=tall_grass
      // Blocked: 163=buildings, 132=special_tiles
      const walkableTiles = [139, 140, 226, 227];
      return walkableTiles.includes(tile);
    },
    checkForEncounter: function() {
      return false; // No encounters in town
    }
  },

  LabInterior: {
    id: 'LabInterior',
    name: 'Professor Cypress Lab',
    tileset: 'assets/tiles/interiors-lab.png',
    width: 10, height: 10,
    tiles: boxed(10, 10, 3, 0),
    warps: [
      // door back to town (Lab entrance)
      { from: rect(4, 9), to: { mapId: 'PistonTown', ...pos(9, 7, 'down') } },
    ],
    npcs: [],
    getTile: function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return this.tiles[y][x];
    },
    isWalkable: function(x, y) {
      const tile = this.getTile(x, y);
      const npcAtPosition = this.npcs.find(npc => npc.x === x && npc.y === y);
      if (npcAtPosition) return false;
      const walkableTiles = [3, 12]; // Floor and door
      return walkableTiles.includes(tile);
    },
    checkForEncounter: function() {
      return false;
    }
  },

  CoalHarbor: {
    id: 'CoalHarbor',
    name: 'Coal Harbor',
    tileset: 'assets/tiles/piston-town.png',
    width: 20, height: 15,
    tiles: [
      // Row 0 - Entry from Route 1 (north, columns 8-11)
      [2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      // Row 1 - Path expands, houses on west
      [2, 2, 5, 5, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2],
      // Row 2 - House with door, path continues
      [2, 2, 5, 5, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
      // Row 3 - House door, grass, Depot (top-right)
      [2, 2, 12, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 5, 5, 2, 2],
      // Row 4 - Main horizontal path, Depot middle
      [2, 1, 1, 3, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 5, 0, 5, 2, 2],
      // Row 5 - Another house (west), Depot door
      [2, 1, 5, 5, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 5, 12, 5, 2, 2],
      // Row 6 - House door, central path continues
      [2, 1, 5, 5, 1, 1, 3, 3, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 2, 2],
      // Row 7 - House door at 2,7, town center intersection
      [2, 1, 12, 3, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 2, 2],
      // Row 8 - Path continues, Mart (top-right)
      [2, 1, 3, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 5, 5, 1, 2, 2],
      // Row 9 - Mart with door
      [2, 1, 3, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 5, 5, 1, 2, 2],
      // Row 10 - Path to gym
      [2, 1, 3, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 12, 3, 1, 2, 2],
      // Row 11 - Gym entrance (top), south path
      [2, 1, 3, 3, 1, 1, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 3, 1, 2, 2],
      // Row 12 - Gym middle with door at center
      [2, 1, 1, 3, 1, 1, 5, 0, 0, 12, 5, 1, 1, 1, 1, 1, 3, 1, 2, 2],
      // Row 13 - Gym bottom
      [2, 1, 1, 3, 3, 1, 5, 5, 5, 5, 5, 1, 1, 3, 3, 3, 3, 1, 2, 2],
      // Row 14 - Bottom border with grass
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ],
    warps: [
      // House doors (west side)
      { from: rect(2, 3), to: { mapId: 'CoalHouse', ...pos(3, 6, 'down') } },
      { from: rect(2, 7), to: { mapId: 'CoalHouse', ...pos(3, 6, 'down') } },
      // Depot door (east)
      { from: rect(16, 5), to: { mapId: 'CoalDepot', ...pos(3, 6, 'down') } },
      // Mart door (southeast)
      { from: rect(15, 10), to: { mapId: 'CoalMart', ...pos(3, 6, 'down') } },
      // Gym door (south center)
      { from: rect(9, 12), to: { mapId: 'CoalHarborGym', ...pos(7, 13, 'up') } },
      // Route 1 entrance (north)
      { from: rect(8, 0), to: { mapId: 'Route1', ...pos(8, 14, 'up') } },
      { from: rect(9, 0), to: { mapId: 'Route1', ...pos(9, 14, 'up') } },
      { from: rect(10, 0), to: { mapId: 'Route1', ...pos(10, 14, 'up') } },
      { from: rect(11, 0), to: { mapId: 'Route1', ...pos(11, 14, 'up') } },
    ],
    connections: {
      north: { mapId: 'Route1', offsetX: 0, offsetY: 0 }
    },
    npcs: [],
    getTile: function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return this.tiles[y][x];
    },
    isWalkable: function(x, y) {
      const tile = this.getTile(x, y);
      const npcAtPosition = this.npcs.find(npc => npc.x === x && npc.y === y);
      if (npcAtPosition) return false;
      const walkableTiles = [1, 2, 3, 12];
      return walkableTiles.includes(tile);
    },
    checkForEncounter: function() {
      return false; // No encounters in town
    }
  },

  Route1: {
    id: 'Route1',
    name: 'Route 1',
    tileset: 'assets/tiles/route-grass.png',
    width: 20, height: 15,
    tiles: [
      // Row 0 - Entry from Piston Town (seamless connection)
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      // Row 1 - Path begins, grass on sides
      [5, 5, 5, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 5, 5, 5],
      // Row 2 - Path with grass patches on sides
      [5, 5, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 5, 5],
      // Row 3 - Ledge on left, sign on path, grass on right
      [5, 5, 2, 2, 6, 1, 1, 1, 1, 4, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5],
      // Row 4 - Path continues, grass patches
      [5, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 5],
      // Row 5 - Wider path section, trainer battle zone
      [5, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 5],
      // Row 6 - Path with trees/landmarks on sides
      [5, 2, 2, 1, 1, 1, 1, 1, 7, 1, 1, 7, 1, 1, 1, 1, 2, 2, 2, 5],
      // Row 7 - Central area (trainer positioned here)
      [5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 5],
      // Row 8 - Path continues with grass
      [5, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 5],
      // Row 9 - Narrower path section
      [5, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 5],
      // Row 10 - Path with ledge on right
      [5, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 6, 2, 2, 2, 2, 2, 5],
      // Row 11 - Path widens before exit
      [5, 5, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5],
      // Row 12 - Grass patches narrow path
      [5, 5, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 5, 5],
      // Row 13 - Approaching next area
      [5, 5, 5, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 5, 5, 5],
      // Row 14 - Exit to next route/area
      [5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    ],
    warps: [
      // back to town top edge (SEAMLESS transition)
      { from: rect(10, 0), to: { mapId: 'PistonTown', ...pos(10, 14, 'up') } },
      // south exit to Coal Harbor (columns 8-10, row 14)
      { from: rect(8, 14, 3, 1), to: { mapId: 'CoalHarbor', ...pos(9, 0, 'down') } },
    ],
    connections: {
      north: { mapId: 'PistonTown', offsetX: 0, offsetY: 0 } // Connect top edge to PistonTown bottom
    },
    npcs: [
      {
        id: 'route1_youngster_joey',
        name: 'Youngster Joey',
        x: 10,
        y: 7,
        type: 'trainer',
        direction: 'down',
        canBattle: true,
        defeated: false,
        baseReward: 50,
        party: [
          { speciesId: 1, level: 5 } // Steamini
        ],
        dialogue: [
          { speaker: 'Youngster Joey', text: 'Hey! You look like a new conductor!' },
          { speaker: 'Youngster Joey', text: 'Let me show you how it\'s done!' }
        ],
        defeatDialogue: [
          { speaker: 'Youngster Joey', text: 'Wow! You\'re really good!' },
          { speaker: 'Youngster Joey', text: 'I need to train more...' }
        ]
      }
    ],
    getTile: function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return this.tiles[y][x];
    },
    isWalkable: function(x, y) {
      const tile = this.getTile(x, y);
      const npcAtPosition = this.npcs.find(npc => npc.x === x && npc.y === y);
      if (npcAtPosition) return false;
      const walkableTiles = [1, 2, 3, 4]; // 1=path, 2=tall grass, 3=normal grass, 4=sign (walkable but interactive)
      return walkableTiles.includes(tile);
    },
    checkForEncounter: function(x, y) {
      const tile = this.getTile(x, y);
      // Only encounter in grass tiles (2=tall grass, 3=normal grass)
      if (tile !== 2 && tile !== 3) return false;
      return Math.random() < 0.10; // 10% encounter rate in grass
    },
    getRandomEncounter: function() {
      const level = Utils.randomInt(3, 7); // Wild trains level 3-7
      const speciesId = Utils.randomInt(1, 20); // Early game trains (IDs 1-20)
      console.log(`Wild encounter: Train #${speciesId} (Lv.${level})`);
      return new Train(speciesId, level);
    }
  },

  CoalHarborGym: {
    id: 'CoalHarborGym',
    name: 'Coal Harbor Gym',
    tileset: 'assets/tiles/piston-town.png',
    width: 15, height: 15,
    tiles: [
      // Row 0 - Top wall
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      // Row 1 - Interior with path
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 2 - Gym Leader Marina position (center)
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 3
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 4
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 5 - Water strip
      [5, 4, 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 4, 5],
      // Row 6
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 7
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 8
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 9
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 10
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 11
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 12
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 13
      [5, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 5],
      // Row 14 - Bottom wall with door at center
      [5, 5, 5, 5, 5, 5, 5, 12, 5, 5, 5, 5, 5, 5, 5],
    ],
    warps: [
      // Door back to Coal Harbor
      { from: rect(7, 14), to: { mapId: 'CoalHarbor', ...pos(9, 12, 'down') } },
    ],
    npcs: [
      {
        id: 'gym_leader_marina',
        name: 'Captain Marina',
        x: 7,
        y: 2,
        type: 'gym_leader',
        color: '#3498DB',
        badgeColor: '#1ABC9C',
        canBattle: true,
        defeated: false,
        badge: 'Harbor Badge',
        party: [
          { speciesId: 7, level: 12 },
          { speciesId: 8, level: 14 },
          { speciesId: 9, level: 16 }
        ],
        dialogue: [
          { speaker: 'Captain Marina', text: 'Ahoy! Welcome to the Coal Harbor Gym!' },
          { speaker: 'Captain Marina', text: 'My freight trains are the toughest in the region! Let\'s see if you can handle them!' }
        ],
        defeatDialogue: [
          { speaker: 'Captain Marina', text: 'Well, blow me down! You\'re a natural!' },
          { speaker: 'Captain Marina', text: 'You\'ve earned the Harbor Badge!' }
        ]
      }
    ],
    getTile: function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return this.tiles[y][x];
    },
    isWalkable: function(x, y) {
      const tile = this.getTile(x, y);
      const npcAtPosition = this.npcs.find(npc => npc.x === x && npc.y === y);
      if (npcAtPosition) return false;
      const walkableTiles = [1, 3, 12]; // Floor, path, and door
      return walkableTiles.includes(tile);
    },
    checkForEncounter: function() {
      return false; // No encounters in gym
    }
  },
};

// Full Grand Transit campaign. These maps deliberately use the engine's
// procedural fallback tiles so every location remains playable if optional
// image assets fail to load. Piston Town, Route 1, Coal Harbor and its gym
// above remain the handcrafted opening chapter; this registry continues the
// railway through the remaining seven cities and the Grand Terminus.
(function installGrandTransitCampaign() {
  const cityNames = ['Coal Harbor', 'Copper Junction', 'Ironworks', 'Verdant Platform',
    'Skybeam', 'Isotope City', 'Velocity Terminal', 'Crown Central'];
  const routeThemes = ['Meadow Line', 'Copper Cut', 'Foundry Pass', 'Garden Viaduct',
    'Cloud Causeway', 'Atomic Expanse', 'Velocity Run', 'Royal Approach'];
  const routeRanges = [[1, 20], [16, 38], [31, 56], [45, 72], [64, 94], [82, 116], [103, 139], [124, 151]];

  function dialogue(speaker, text) { return [{ speaker, text }]; }
  function runtimeMap(id, name, tiles, npcs, warps, encounterRange) {
    return {
      id, name, tiles, npcs: npcs || [], warps: warps || [],
      width: tiles[0].length, height: tiles.length,
      getTile(x, y) { return x < 0 || y < 0 || x >= this.width || y >= this.height ? 0 : this.tiles[y][x]; },
      isWalkable(x, y) {
        if (this.npcs.some(n => n.x === x && n.y === y && !n.hidden)) return false;
        return [1, 2, 3, 6, 12].includes(this.getTile(x, y));
      },
      checkForEncounter(x, y) { return !!encounterRange && this.getTile(x, y) === 2 && Math.random() < 0.105; },
      getRandomEncounter() {
        const lo = encounterRange[0], hi = encounterRange[1];
        const badgeLevel = 4 + Math.min(7, Math.max(0, this.routeIndex || 0)) * 6;
        return new Train(Utils.randomInt(lo, hi), Utils.randomInt(badgeLevel, badgeLevel + 5));
      }
    };
  }
  function makeInterior(id, name, returnMap, returnX, returnY, attendant) {
    const t = boxed(8, 8, 0, 1);
    t[7][4] = 12;
    return runtimeMap(id, name, t, attendant ? [{
      id: `${id}_attendant`, name: attendant, x: 4, y: 2, type: id.includes('Depot') ? 'healer' : 'npc',
      dialogue: dialogue(attendant, id.includes('Depot')
        ? 'Welcome to the Healing Depot. Your whole crew is back at full pressure!'
        : id.includes('Mart') ? 'Boxcars, Potions, and Tickets keep a conductor moving.' : 'A warm boiler and a safe platform make any station home.')
    }] : [], [{ from: rect(4, 7), to: { mapId: returnMap, ...pos(returnX, returnY, 'down') } }]);
  }
  function trainer(id, name, x, y, species, level, line, requires, sets) {
    return { id, name, x, y, type: 'trainer', direction: 'down', canBattle: true,
      defeated: false, baseReward: 65, party: species.map((s, i) => ({ speciesId: s, level: level + i })),
      requires: requires || [], storyFlag: sets || `defeated_${id}`,
      dialogue: dialogue(name, line), defeatDialogue: dialogue(name, 'You kept your timetable. I need a better route!') };
  }
  function makeRoute(n) {
    const w = 20, h = 24, t = grid(w, h, 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || x === w - 1) t[y][x] = 0;
        else if (x >= 8 && x <= 11) t[y][x] = (y % 5 === 2 ? 6 : 3);
        else if ((x * 3 + y + n) % 7 === 0) t[y][x] = 1;
      }
    }
    t[0][10] = 3; t[h - 1][10] = 3;
    const lo = routeRanges[n - 1][0];
    const foes = [
      trainer(`route${n}_railfan`, 'Railfan', 7, 7, [lo, Math.min(151, lo + 3)], 3 + n * 5,
        'Every great engine deserves a battle record!'),
      trainer(`route${n}_inspector`, 'Track Inspector', 12, 15, [Math.min(151, lo + 6), Math.min(151, lo + 10)], 4 + n * 5,
        'Your crew must pass my safety inspection!')
    ];
    if (n === 3) foes.push(trainer('grunt_switch', 'Derail Grunt Switch', 10, 12, [23, 27], 20,
      'Team Derail reversed the points. This line belongs to us!', ['Circuit Badge'], 'switchyardCleared'));
    if (n === 6) foes.push(trainer('grunt_smoke', 'Derail Grunt Smoke', 10, 10, [26, 51, 79], 35,
      'The signal blackout will strand the whole region!', ['Beam Badge'], 'gridRestored'));
    if (n === 7) foes.push(trainer('admin_wreck', 'Admin Wreck', 10, 16, [54, 66, 115, 143], 44,
      'We will uncouple every city and rule the wreckage!', ['Core Badge', 'gridRestored'], 'derailDefeated'));
    const from = n === 1 ? 'PistonTown' : (n === 2 ? 'CoalHarbor' : `City${n - 1}`);
    const to = n === 1 ? 'CoalHarbor' : `City${n}`;
    const map = runtimeMap(`Route${n}`, `Route ${n}: ${routeThemes[n - 1]}`, t, foes, [
      { from: rect(10, 0), to: { mapId: from, ...pos(10, from === 'PistonTown' ? 14 : 13, 'up') } },
      { from: rect(10, h - 1), to: { mapId: to, ...pos(10, to === 'GrandTerminus' ? 27 : 0, 'down') } }
    ], routeRanges[n - 1]);
    map.routeIndex = n - 1;
    return map;
  }
  function makeCity(n) {
    const w = 20, h = 15, t = grid(w, h, 1);
    for (let x = 0; x < w; x++) { t[0][x] = 0; t[h - 1][x] = 0; }
    for (let y = 0; y < h; y++) { t[y][0] = 0; t[y][w - 1] = 0; }
    for (let y = 0; y < h; y++) { t[y][9] = 3; t[y][10] = 3; }
    for (let x = 1; x < w - 1; x++) t[7][x] = 3;
    for (let y = 2; y <= 5; y++) for (let x = 3; x <= 6; x++) t[y][x] = 0;
    t[5][5] = 12; t[0][10] = 3; t[h - 1][10] = 3;
    const townsfolk = [
      { id: `city${n}_guide`, name: 'Station Guide', x: 12, y: 7, type: 'npc',
        dialogue: dialogue('Station Guide', `${cityNames[n - 1]} connects every traveler to a new possibility.`) },
      { id: `city${n}_mechanic`, name: 'Mechanic', x: 7, y: 10, type: 'npc',
        dialogue: dialogue('Mechanic', 'Type matchups matter as much as horsepower. Plan before you depart!') }
    ];
    if (n === 4) townsfolk.push(trainer('grunt_spike', 'Derail Grunt Spike', 9, 7, [40, 49], 28,
      'The regional manifest is ours. No timetable can stop us!', ['Torque Badge'], 'manifestRecovered'));
    return runtimeMap(`City${n}`, cityNames[n - 1], t, townsfolk, [
      { from: rect(10, 0), to: { mapId: n === 2 ? 'Route2' : `Route${n}`, ...pos(10, 22, 'up') } },
      { from: rect(5, 5), to: { mapId: `Gym${n}`, ...pos(6, 10, 'up') } },
      { from: rect(10, h - 1), to: { mapId: n === 8 ? 'GrandTerminus' : `Route${n + 1}`, ...pos(10, n === 8 ? 27 : 1, 'down') } }
    ]);
  }
  function makeGym(n) {
    const leader = NPC_DATA.stationmasters[n - 1], w = 13, h = 12, t = boxed(w, h, 0, 1);
    for (let y = 3; y < 10; y += 3) for (let x = 2; x < 11; x++) if (x !== (y + n) % 8 + 2) t[y][x] = 6;
    t[h - 1][6] = 12;
    const npc = { id: leader.id, name: leader.name, x: 6, y: 1, type: 'gym_leader', canBattle: true,
      defeated: false, badge: leader.badge, baseReward: 120,
      requires: n === 1 ? [] : [NPC_DATA.stationmasters[n - 2].badge],
      party: leader.roster.map(r => ({ speciesId: r[0], level: r[1] })),
      dialogue: dialogue(leader.name, leader.dialogue.intro), defeatDialogue: dialogue(leader.name, leader.dialogue.defeat) };
    return runtimeMap(`Gym${n}`, `${cityNames[n - 1]} Grand Station`, t, [npc], [
      { from: rect(6, h - 1), to: { mapId: n === 1 ? 'CoalHarbor' : `City${n}`, ...pos(5, 6, 'down') } }
    ]);
  }

  // Route 1 and Gym 1 use the handcrafted maps. Add their canonical aliases
  // only where useful, then build the rest of the region.
  WORLD_MAPS.Route1.routeIndex = 0;
  WORLD_MAPS.PlayerHouse = makeInterior('PlayerHouse', 'Piston House', 'PistonTown', 2, 4, 'Grandma Ash');
  WORLD_MAPS.HealingDepot = makeInterior('HealingDepot', 'Piston Healing Depot', 'PistonTown', 15, 10, 'Depot Nurse Joyner');
  WORLD_MAPS.TrainMart = makeInterior('TrainMart', 'Piston Train Mart', 'PistonTown', 8, 12, 'Quartermaster Cole');
  WORLD_MAPS.CoalHouse = makeInterior('CoalHouse', 'Coal Harbor House', 'CoalHarbor', 2, 8, 'Dockworker Finn');
  WORLD_MAPS.CoalDepot = makeInterior('CoalDepot', 'Coal Harbor Depot', 'CoalHarbor', 16, 6, 'Depot Nurse Joyner');
  WORLD_MAPS.CoalMart = makeInterior('CoalMart', 'Coal Harbor Mart', 'CoalHarbor', 15, 11, 'Quartermaster Cole');
  WORLD_MAPS.CoalHarbor.warps.push({ from: rect(10, 14), to: { mapId: 'Route2', ...pos(10, 1, 'down') } });
  for (let n = 2; n <= 8; n++) {
    WORLD_MAPS[`Route${n}`] = makeRoute(n);
    WORLD_MAPS[`City${n}`] = makeCity(n);
    WORLD_MAPS[`Gym${n}`] = makeGym(n);
  }

  const elite = NPC_DATA.eliteConductors.concat([NPC_DATA.champion]);
  const tt = boxed(13, 30, 0, 3); tt[29][6] = 12;
  const eliteNPCs = elite.map((e, i) => ({ id: e.id, name: e.name, x: 6, y: 24 - i * 5,
    type: i === 4 ? 'champion' : 'trainer', canBattle: true, defeated: false, baseReward: 250,
    requires: i === 0 ? ['Crown Badge', 'derailDefeated'] : [`defeated_${elite[i - 1].id}`],
    storyFlag: i === 4 ? 'gameComplete' : `defeated_${e.id}`,
    party: e.roster.map(r => ({ speciesId: r[0], level: r[1] })),
    dialogue: dialogue(e.name, e.dialogue.intro), defeatDialogue: dialogue(e.name, e.dialogue.defeat) }));
  WORLD_MAPS.GrandTerminus = runtimeMap('GrandTerminus', 'Grand Terminus', tt, eliteNPCs, [
    { from: rect(6, 29), to: { mapId: 'Route8', ...pos(10, 22, 'up') } }
  ]);
})();

// Art pass: all maps use semantic tiles rendered by Canvas. The original
// stretched prototype atlases are deliberately disabled.
(function installWorldArtDirection() {
  const decorateBuilding = (x, y, w, h, kind, label, doorX) => ({ type: 'building', x, y, w, h, kind, label, doorX });
  const fillRectTiles = (tiles, x, y, w, h, value) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = value;
  };
  const frame = (tiles, value = 0) => {
    const h = tiles.length, w = tiles[0].length;
    for (let x = 0; x < w; x++) { tiles[0][x] = value; tiles[h - 1][x] = value; }
    for (let y = 0; y < h; y++) { tiles[y][0] = value; tiles[y][w - 1] = value; }
  };

  for (const map of Object.values(WORLD_MAPS)) {
    delete map.tileset;
    delete map.tilesetRef;
    map.decorations = map.decorations || [];
    if (/Route/.test(map.id)) map.theme = ['meadow', 'copper', 'foundry', 'garden', 'sky', 'isotope', 'velocity', 'royal'][map.routeIndex || 0];
    else if (/Gym|Terminus/.test(map.id)) map.theme = 'grand-station';
    else if (/House|Depot|Mart|Interior/.test(map.id)) map.theme = map.id.includes('Depot') ? 'depot' : map.id.includes('Mart') ? 'mart' : 'interior';
    else map.theme = 'rail-town';
  }

  // Piston Town: a readable station village with three civic buildings,
  // planted squares, a fountain, and a clear line to Route 1.
  {
    const map = WORLD_MAPS.PistonTown, t = grid(20, 15, 1);
    frame(t, 0);
    for (let y = 1; y < 15; y++) { t[y][9] = 3; t[y][10] = 3; }
    for (let x = 1; x < 19; x++) t[7][x] = 3;
    fillRectTiles(t, 2, 2, 5, 4, 0); t[5][4] = 12;
    fillRectTiles(t, 8, 1, 5, 5, 0); t[5][10] = 12;
    fillRectTiles(t, 14, 3, 4, 4, 0); t[6][16] = 12;
    fillRectTiles(t, 2, 9, 5, 4, 0); t[12][4] = 12;
    t[14][9] = 6; t[14][10] = 6;
    map.tiles = t; map.width = 20; map.height = 15;
    map.decorations = [
      decorateBuilding(2, 2, 5, 4, 'home', 'ASH HOUSE', 4),
      decorateBuilding(8, 1, 5, 5, 'lab', 'CYPRESS LAB', 10),
      decorateBuilding(14, 3, 4, 4, 'depot', 'DEPOT', 16),
      decorateBuilding(2, 9, 5, 4, 'mart', 'RAIL MART', 4),
      { type: 'fountain', x: 13, y: 9 }, { type: 'sign', x: 8, y: 8 },
      { type: 'flowerbed', x: 12, y: 4, w: 2 }, { type: 'flowerbed', x: 15, y: 9, w: 3 }
    ];
    map.warps = [
      { from: rect(4, 5), to: { mapId: 'PlayerHouse', ...pos(3, 6, 'down') } },
      { from: rect(10, 5), to: { mapId: 'LabInterior', ...pos(4, 7, 'down') } },
      { from: rect(16, 6), to: { mapId: 'HealingDepot', ...pos(3, 6, 'down') } },
      { from: rect(4, 12), to: { mapId: 'TrainMart', ...pos(3, 6, 'down') } },
      { from: rect(9, 14, 2, 1), to: { mapId: 'Route1', ...pos(10, 1, 'down') } }
    ];
    map.isWalkable = function (x, y) { return [1, 3, 6, 12].includes(this.getTile(x, y)) && !this.npcs.some(n => n.x === x && n.y === y); };
  }

  // Route 1: a forest rail cutting with a meandering footpath and wild grass.
  {
    const map = WORLD_MAPS.Route1, t = grid(20, 24, 2);
    frame(t, 0);
    const centers = [10, 10, 9, 9, 8, 8, 9, 10, 10, 11, 11, 10, 9, 9, 8, 8, 9, 10, 10, 11, 11, 10, 10, 10];
    for (let y = 0; y < 24; y++) for (let x = centers[y] - 2; x <= centers[y] + 2; x++) t[y][x] = 3;
    for (let y = 3; y < 21; y++) { t[y][14] = 6; t[y][15] = 6; }
    for (let y = 4; y < 22; y += 5) { t[y][4] = 1; t[y][5] = 1; t[y][6] = 1; }
    map.tiles = t; map.width = 20; map.height = 24; map.routeIndex = 0;
    map.decorations = [
      { type: 'bridge', x: 13, y: 10, w: 3 }, { type: 'sign', x: 7, y: 4 },
      { type: 'signal', x: 13, y: 7 }, { type: 'signal', x: 16, y: 17 },
      { type: 'flowers', x: 5, y: 8 }, { type: 'stump', x: 4, y: 15 }
    ];
    map.warps = [
      { from: rect(8, 0, 5, 1), to: { mapId: 'PistonTown', ...pos(10, 13, 'up') } },
      { from: rect(8, 23, 5, 1), to: { mapId: 'CoalHarbor', ...pos(10, 1, 'down') } }
    ];
    map.isWalkable = function (x, y) { return [1, 2, 3, 6].includes(this.getTile(x, y)) && !this.npcs.some(n => n.x === x && n.y === y); };
  }

  // Coal Harbor: copper-roofed port terminus with a strong central promenade,
  // visible harbor water, and distinct destinations around the civic square.
  {
    const map = WORLD_MAPS.CoalHarbor, t = grid(20, 15, 1);
    frame(t, 0);
    for (let y = 0; y < 15; y++) { t[y][9] = 3; t[y][10] = 3; }
    for (let x = 1; x < 19; x++) t[7][x] = 3;
    fillRectTiles(t, 2, 2, 5, 4, 0); t[5][4] = 12;
    fillRectTiles(t, 14, 2, 4, 4, 0); t[5][16] = 12;
    fillRectTiles(t, 2, 9, 6, 4, 0); t[12][5] = 12;
    fillRectTiles(t, 13, 9, 5, 4, 0); t[12][15] = 12;
    for (let y = 8; y < 14; y++) t[y][18] = 4;
    t[0][9] = 3; t[0][10] = 3; t[14][9] = 6; t[14][10] = 6;
    map.tiles = t; map.width = 20; map.height = 15; map.theme = 'copper';
    map.decorations = [
      decorateBuilding(2, 2, 5, 4, 'home', 'HARBOR HOUSE', 4),
      decorateBuilding(14, 2, 4, 4, 'depot', 'COAL DEPOT', 16),
      decorateBuilding(2, 9, 6, 4, 'gym', 'BRASSWORK GYM', 5),
      decorateBuilding(13, 9, 5, 4, 'mart', 'CARGO MART', 15),
      { type: 'clock', x: 12, y: 4 }, { type: 'signal', x: 8, y: 4 },
      { type: 'fountain', x: 11, y: 9 }, { type: 'sign', x: 8, y: 8 },
      { type: 'flowers', x: 6, y: 7 }, { type: 'platform', x: 17, y: 8, h: 6 }
    ];
    map.warps = [
      { from: rect(4, 5), to: { mapId: 'CoalHouse', ...pos(3, 6, 'down') } },
      { from: rect(16, 5), to: { mapId: 'CoalDepot', ...pos(3, 6, 'down') } },
      { from: rect(5, 12), to: { mapId: 'CoalHarborGym', ...pos(7, 13, 'up') } },
      { from: rect(15, 12), to: { mapId: 'CoalMart', ...pos(3, 6, 'down') } },
      { from: rect(9, 0, 2, 1), to: { mapId: 'Route1', ...pos(10, 22, 'up') } },
      { from: rect(9, 14, 2, 1), to: { mapId: 'Route2', ...pos(10, 1, 'down') } }
    ];
    map.isWalkable = function (x, y) { return [1, 2, 3, 6, 12].includes(this.getTile(x, y)) && !this.npcs.some(n => n.x === x && n.y === y); };
  }

  // Semantic decorations for generated cities and interiors.
  for (let n = 2; n <= 8; n++) {
    const city = WORLD_MAPS[`City${n}`];
    city.decorations.push(
      decorateBuilding(3, 2, 4, 4, n % 2 ? 'depot' : 'station', city.name.toUpperCase(), 5),
      { type: 'clock', x: 15, y: 4 }, { type: 'sign', x: 11, y: 8 },
      { type: 'flowerbed', x: 13, y: 10, w: 3 }
    );
  }
  for (const map of Object.values(WORLD_MAPS)) {
    if (map.theme === 'interior' || map.theme === 'depot' || map.theme === 'mart') {
      map.decorations.push({ type: 'counter', x: 2, y: 1, w: Math.max(3, map.width - 4) });
    }
  }

  // Interior exits land just outside the authored exterior doorways.
  const returnTo = (id, mapId, x, y) => {
    const map = WORLD_MAPS[id];
    if (map && map.warps && map.warps[0]) map.warps[0].to = { mapId, ...pos(x, y, 'down') };
  };
  returnTo('PlayerHouse', 'PistonTown', 4, 6);
  returnTo('LabInterior', 'PistonTown', 10, 6);
  returnTo('HealingDepot', 'PistonTown', 16, 7);
  returnTo('TrainMart', 'PistonTown', 4, 13);
  returnTo('CoalHouse', 'CoalHarbor', 4, 6);
  returnTo('CoalDepot', 'CoalHarbor', 16, 6);
  returnTo('CoalMart', 'CoalHarbor', 15, 13);
  returnTo('CoalHarborGym', 'CoalHarbor', 5, 13);
})();

// Add collisions to each map (non-walkable tiles: void=0, wall=5, ledge=6, tree=7)
for (const m of Object.values(WORLD_MAPS)) {
  m.collisions = new Set();
  const { tiles } = m;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const idx = tiles[y][x];
      // Rails are traversable in Grand Transit; void/walls/trees are not.
      if (idx === 0 || idx === 5 || idx === 7) {
        m.collisions.add(`${x},${y}`);
      }
    }
  }
}

console.log('🗺️ World maps loaded:', Object.keys(WORLD_MAPS));
