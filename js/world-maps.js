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
    tiles: (() => { const t = boxed(10, 10, 0, 3); t[9][4] = 12; return t; })(),
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
        techniqueReward: 'Track Clear',
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

function townDialogue(speaker, town) {
  return player => {
    const flags = player.storyFlags || {};
    const badges = (player.badges || []).length;
    const lines = [`${town} keeps its lamps lit for every train that comes through.`,
      badges ? `Your ${badges} badge${badges === 1 ? '' : 's'} ${badges === 1 ? 'shows' : 'show'} how far you have traveled.` : 'Earn your first badge and the whole line will open to you.'];
    const steamPunkProgress = flags.teamSteamPunkProgress || flags.steamPunkProgress || 0;
    if (flags.steamPunkDefeated || flags.derailDefeated) lines.push('With Team Steam Punk stopped, our freight is moving safely again.');
    else if (steamPunkProgress || flags.switchyardCleared || flags.manifestRecovered || flags.gridRestored) lines.push('Team Steam Punk has disrupted the line, but conductors like you are pushing back.');
    else lines.push('Keep an eye out for Team Steam Punk wherever the signals turn strange.');
    if (flags.rival_blake_stage) lines.push('Your rival is still keeping pace. The next meeting will be a good one.');
    else if (flags.rival1Defeated || flags.defeated_rival_blake_1) lines.push('Word is you and your rival have already tested each other on the rails.');
    return lines.map(text => ({ speaker, text }));
  };
}

function questNpc(id, name, x, y, questId, item, rewardText, challenge) {
  return { id, name, x, y, type: 'npc', quest: { id: questId, item, rewardText, challenge },
    dialogue: [{ speaker: name, text: 'I have a small favor to ask. Speak with me again when you are ready.' }] };
}

function getRivalStarterId(player, stage) {
  let base = 4; // Sparkart (Electric)
  if (player && player.party && player.party.length > 0) {
    const p0 = player.party[0].speciesId;
    if (p0 >= 1 && p0 <= 3) {
      base = 4; // Player has Steam -> Blake picks Electric
    } else if (p0 >= 4 && p0 <= 6) {
      base = 7; // Player has Electric -> Blake picks Diesel
    } else if (p0 >= 7 && p0 <= 9) {
      base = 1; // Player has Diesel -> Blake picks Steam
    }
  }
  if (stage <= 2) return base;
  if (stage === 3) return base + 1; // Evolved to 2nd stage
  return base + 2; // Evolved to final stage
}

function createRivalBlakeNPC(stage, x, y, direction) {
  const stageConfigs = {
    1: {
      id: 'rival_blake_1',
      requires: ['hasStarter'],
      storyFlag: 'defeated_rival_blake_1',
      baseReward: 60,
      defaultParty: [{ speciesId: 4, level: 5 }],
      getParty: function (player) {
        return [{ speciesId: getRivalStarterId(player, 1), level: 5 }];
      },
      blockedDialogue: [
        { speaker: 'Blake', text: "Hey Alex! Go see Professor Cypress in the lab and pick your starter train first. Then we'll battle!" }
      ],
      dialogue: [
        { speaker: 'Blake', text: "Hey Alex! I see you got your starter train from Professor Cypress!" },
        { speaker: 'Blake', text: "My engine is all fired up. Let's see who's the better conductor right now!" }
      ],
      retryDialogue: [
        { speaker: 'Blake', text: "Ready for a rematch, Alex? Let's see if your engine is running smoother this time!" }
      ],
      defeatDialogue: [
        { speaker: 'Blake', text: "Whoa, nice shunting! You really know how to handle that engine." },
        { speaker: 'Blake', text: "I'm heading down Route 1 to challenge Captain Marina at Coal Harbor. Don't fall behind!" }
      ],
      lossDialogue: [
        { speaker: 'Blake', text: "Tough break, Alex! I patched up your trains. Catch your breath and let's go again whenever you're ready!" }
      ],
      revisitDialogue: function (player) {
        if (player && player.hasBadge && player.hasBadge('Harbor Badge')) {
          return [{ speaker: 'Blake', text: "You already took down Captain Marina and got the Harbor Badge?! I need to get moving!" }];
        }
        return [{ speaker: 'Blake', text: "I'm tuning up my engine before heading out. Meet me down Route 1, Alex!" }];
      }
    },
    2: {
      id: 'rival_blake_2',
      requires: ['defeated_rival_blake_1'],
      storyFlag: 'defeated_rival_blake_2',
      baseReward: 80,
      defaultParty: [{ speciesId: 10, level: 8 }, { speciesId: 4, level: 9 }],
      getParty: function (player) {
        return [{ speciesId: 10, level: 8 }, { speciesId: getRivalStarterId(player, 2), level: 9 }];
      },
      blockedDialogue: [
        { speaker: 'Blake', text: "Catch up with me back in Piston Town first, Alex!" }
      ],
      dialogue: [
        { speaker: 'Blake', text: "Hold up, Alex! Coal Harbor is just ahead!" },
        { speaker: 'Blake', text: "Captain Marina's freight crew is no joke. Prove you're ready by getting past me first!" }
      ],
      retryDialogue: [
        { speaker: 'Blake', text: "Back for another round before Coal Harbor? Let's go!" }
      ],
      defeatDialogue: [
        { speaker: 'Blake', text: "Urgh, derailed again! You've got some serious torque." },
        { speaker: 'Blake', text: "All right, go take on Marina! Let's see if you can win the Harbor Badge." }
      ],
      lossDialogue: [
        { speaker: 'Blake', text: "Looks like your timing was off, Alex! I got your boiler back up to pressure. Challenge me again when you're ready!" }
      ],
      revisitDialogue: function (player) {
        if (player && player.hasBadge && player.hasBadge('Harbor Badge')) {
          return [{ speaker: 'Blake', text: "You beat Marina and got the Harbor Badge! I'm heading over to the Coal Harbor docks." }];
        }
        return [{ speaker: 'Blake', text: "Captain Marina is waiting in the Coal Harbor Gym. Go show her your hauling power!" }];
      }
    },
    3: {
      id: 'rival_blake_3',
      requires: ['Harbor Badge', 'defeated_rival_blake_2'],
      storyFlag: 'defeated_rival_blake_3',
      baseReward: 120,
      defaultParty: [{ speciesId: 20, level: 18 }, { speciesId: 14, level: 19 }, { speciesId: 5, level: 21 }],
      getParty: function (player) {
        return [
          { speciesId: 20, level: 18 },
          { speciesId: 14, level: 19 },
          { speciesId: getRivalStarterId(player, 3), level: 21 }
        ];
      },
      blockedDialogue: [
        { speaker: 'Blake', text: "Only conductors who have proven themselves against Captain Marina can board the luxury passenger line!" }
      ],
      dialogue: [
        { speaker: 'Blake', text: "Alex! Welcome to the S.S. Starlight passenger terminal!" },
        { speaker: 'Blake', text: "They say the best conductors from across the region ride these rails. Let's see if our training holds up!" }
      ],
      retryDialogue: [
        { speaker: 'Blake', text: "The ship isn't leaving yet! Ready for round two on the pier?" }
      ],
      defeatDialogue: [
        { speaker: 'Blake', text: "Unbelievable! Your crew is running smoother than a streamlined express." },
        { speaker: 'Blake', text: "The conductor gave me a regional railpass. I'm taking the main line all the way to Crown Central!" }
      ],
      lossDialogue: [
        { speaker: 'Blake', text: "That was close! Your engine just needs a quick tune-up. I fixed your gauges--let's battle again soon!" }
      ],
      revisitDialogue: function (player) {
        if (player && player.hasBadge && player.hasBadge('Crown Badge')) {
          return [{ speaker: 'Blake', text: "All eight badges?! Then we both know where this ends--Grand Terminus!" }];
        }
        return [{ speaker: 'Blake', text: "The luxury rail-ferry is an amazing sight. Keep collecting badges along the line, Alex!" }];
      }
    },
    4: {
      id: 'rival_blake_4',
      requires: ['Crown Badge', 'derailDefeated', 'defeated_rival_blake_3'],
      storyFlag: 'defeated_rival_blake_4',
      baseReward: 200,
      defaultParty: [
        { speciesId: 36, level: 50 },
        { speciesId: 57, level: 51 },
        { speciesId: 66, level: 52 },
        { speciesId: 99, level: 53 },
        { speciesId: 6, level: 55 }
      ],
      getParty: function (player) {
        return [
          { speciesId: 36, level: 50 },
          { speciesId: 57, level: 51 },
          { speciesId: 66, level: 52 },
          { speciesId: 99, level: 53 },
          { speciesId: getRivalStarterId(player, 4), level: 55 }
        ];
      },
      blockedDialogue: [
        { speaker: 'Blake', text: "The Grand Terminus only admits conductors who have defeated Team Derail and earned all eight badges!" }
      ],
      dialogue: [
        { speaker: 'Blake', text: "I knew you'd make it here, Alex! We started in Piston Town with tiny engines..." },
        { speaker: 'Blake', text: "Now the Grand Conductors and the Champion are waiting just ahead. But first, let's settle who the true number one is!" }
      ],
      retryDialogue: [
        { speaker: 'Blake', text: "No backing down before the Elite Four! Let's go all out, Alex!" }
      ],
      defeatDialogue: [
        { speaker: 'Blake', text: "What an incredible battle! You really are the greatest conductor on these rails." },
        { speaker: 'Blake', text: "Go on through, Alex. Become the Champion of the Grand Transit!" }
      ],
      lossDialogue: [
        { speaker: 'Blake', text: "Don't stop now, Alex! If you can't beat me, the Elite Conductors will stop you cold. I healed your crew--let's go again!" }
      ],
      revisitDialogue: function (player) {
        if (player && player.storyFlags && player.storyFlags['gameComplete']) {
          return [{ speaker: 'Blake', text: "Champion Alex! The entire region is talking about your victory. I'm training for our next rematch!" }];
        }
        return [{ speaker: 'Blake', text: "The Four Conductors and Cypress are waiting beyond that gate. Show them what Piston Town can do!" }];
      }
    }
  };

  const cfg = stageConfigs[stage];
  return {
    id: cfg.id,
    name: 'Blake',
    x: x,
    y: y,
    type: 'trainer',
    isRival: true,
    rivalStage: stage,
    direction: direction || 'down',
    canBattle: true,
    defeated: false,
    baseReward: cfg.baseReward,
    party: cfg.defaultParty,
    getParty: cfg.getParty,
    requires: cfg.requires,
    storyFlag: cfg.storyFlag,
    blockedDialogue: cfg.blockedDialogue,
    dialogue: cfg.dialogue,
    retryDialogue: cfg.retryDialogue,
    defeatDialogue: cfg.defeatDialogue,
    lossDialogue: cfg.lossDialogue,
    revisitDialogue: cfg.revisitDialogue
  };
}

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
    const npcs = attendant ? [{
      id: `${id}_attendant`, name: attendant, x: 4, y: 2, type: id.includes('Depot') ? 'healer' : 'npc',
      dialogue: dialogue(attendant, id.includes('Depot')
        ? 'Welcome to the Healing Depot. Your whole crew is back at full pressure!'
        : id.includes('Mart') ? 'Boxcars, Potions, and Tickets keep a conductor moving.' : 'A warm boiler and a safe platform make any station home.')
    }] : [];
    if (id.includes('Depot')) npcs.push({
      id: `${id}_storage`, name: 'Storage Terminal', x: 6, y: 2, type: 'storage'
    });
    return runtimeMap(id, name, t, npcs, [{ from: rect(4, 7), to: { mapId: returnMap, ...pos(returnX, returnY, 'down') } }]);
  }
  function makeCoalHarborInterior(id, kind, attendant, dialogueText) {
    const width = 10, height = 9, tiles = boxed(width, height, 0, 1);
    tiles[height - 1][4] = 12;
    if (kind === 'depot') {
      for (let x = 2; x < 8; x++) tiles[2][x] = 0;
      tiles[2][4] = 1;
      tiles[4][2] = 3;
      tiles[4][3] = 3;
      tiles[4][6] = 3;
      tiles[4][7] = 3;
    } else {
      for (const x of [2, 3, 6, 7]) {
        tiles[2][x] = 0;
        tiles[3][x] = 0;
        tiles[4][x] = 0;
      }
      tiles[2][4] = 0;
      tiles[2][5] = 0;
    }
    const npc = {
      id: `${id}_attendant`, name: attendant, x: 4, y: 2,
      type: kind === 'depot' ? 'healer' : 'npc',
      dialogue: dialogue(attendant, dialogueText)
    };
    const npcs = kind === 'depot' ? [npc, {
      id: `${id}_storage`, name: 'Storage Terminal', x: 6, y: 2, type: 'storage'
    }] : [npc];
    const map = runtimeMap(id, `Coal Harbor ${kind === 'depot' ? 'Depot' : 'Mart'}`, tiles, npcs, [
      { from: rect(4, height - 1), to: { mapId: 'CoalHarbor', ...pos(kind === 'depot' ? 16 : 15, kind === 'depot' ? 6 : 13, 'down') } }
    ]);
    map.theme = kind;
    return map;
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
        dialogue: townDialogue('Station Guide', cityNames[n - 1]) },
      { id: `city${n}_mechanic`, name: 'Mechanic', x: 7, y: 10, type: 'npc',
        dialogue: townDialogue('Mechanic', cityNames[n - 1]) },
      { id: `city${n}_porter`, name: 'Platform Porter', x: 12, y: 9, type: 'npc',
        dialogue: townDialogue('Platform Porter', cityNames[n - 1]) }
    ];
    if (n === 2) townsfolk.push(questNpc('copper_signal_keeper', 'Signal Keeper', 6, 9,
      'copper_signal_challenge', 'super_potion', 'The signal challenge is complete. Take this Super Potion!', true));
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
      techniqueReward: ({ 2: 'River Ferry', 3: 'Tunnel Bore' })[n],
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
  WORLD_MAPS.CoalDepot = makeCoalHarborInterior('CoalDepot', 'depot', 'Depot Nurse Joyner',
    'Welcome to the Coal Harbor Depot. Your whole crew is back at full pressure!');
  WORLD_MAPS.CoalMart = makeCoalHarborInterior('CoalMart', 'mart', 'Quartermaster Cole',
    'Boxcars, Potions, and Tickets keep a conductor moving.');
  WORLD_MAPS.CoalHarbor.warps.push({ from: rect(10, 14), to: { mapId: 'Route2', ...pos(10, 1, 'down') } });
  for (let n = 2; n <= 8; n++) {
    WORLD_MAPS[`Route${n}`] = makeRoute(n);
    WORLD_MAPS[`City${n}`] = makeCity(n);
    WORLD_MAPS[`Gym${n}`] = makeGym(n);
  }

  const victoryRoadTiles = grid(20, 24, 2);
  for (let y = 0; y < 24; y++) {
    victoryRoadTiles[y][0] = 0;
    victoryRoadTiles[y][19] = 0;
    for (let x = 8; x <= 11; x++) victoryRoadTiles[y][x] = 1;
  }
  for (const [x, y] of [[8, 5], [11, 5], [8, 11], [11, 11], [8, 17], [11, 17]]) {
    victoryRoadTiles[y][x] = 0;
  }
  victoryRoadTiles[0][10] = 1;
  victoryRoadTiles[23][10] = 1;
  const roadTrainers = [
    trainer('road_guard_1', 'Route Guard', 6, 6, [107, 108], 48, 'Show me the strength of your crew!', ['Crown Badge']),
    trainer('road_guard_2', 'Signal Keeper', 13, 12, [109, 110], 52, 'Only a steady hand can pass these signals.', ['Crown Badge']),
    trainer('road_guard_3', 'Rail Marshal', 6, 18, [147, 150], 56, 'The final platform is close. Prove you are ready.', ['Crown Badge'])
  ];
  const victoryRoad = runtimeMap('VictoryRoad', 'Victory Road', victoryRoadTiles, roadTrainers, [
    { from: rect(10, 0), to: { mapId: 'Route8', ...pos(10, 22, 'up') } },
    { from: rect(10, 23), to: { mapId: 'GrandTerminus', ...pos(6, 29, 'up') } }
  ], [124, 151]);
  victoryRoad.encounterTable = [
    { speciesId: 124, minLevel: 48, maxLevel: 52, weight: 4 },
    { speciesId: 139, minLevel: 50, maxLevel: 54, weight: 3 },
    { speciesId: 147, minLevel: 52, maxLevel: 56, weight: 2 },
    { speciesId: 151, minLevel: 55, maxLevel: 58, weight: 1 }
  ];
  victoryRoad.routeIndex = 8;
  victoryRoad.getRandomEncounter = function() {
    const totalWeight = this.encounterTable.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Utils.randomInt(1, totalWeight);
    const entry = this.encounterTable.find(candidate => (roll -= candidate.weight) <= 0);
    return new Train(entry.speciesId, Utils.randomInt(entry.minLevel, entry.maxLevel));
  };
  victoryRoad.puzzles = [{ id: 'signal-switches', description: 'Three signal gates require the side paths to be crossed.' }];
  WORLD_MAPS.VictoryRoad = victoryRoad;
  WORLD_MAPS.Route8.warps = WORLD_MAPS.Route8.warps.map(warp => warp.to.mapId === 'GrandTerminus'
    ? { ...warp, to: { mapId: 'VictoryRoad', ...pos(10, 1, 'down') } }
    : warp);

  const elite = NPC_DATA.eliteConductors.concat([NPC_DATA.champion]);
  const tt = boxed(13, 30, 0, 3); tt[29][6] = 12;
  const eliteNPCs = elite.map((e, i) => ({ id: e.id, name: e.name, x: 6, y: 24 - i * 5,
    type: i === 4 ? 'champion' : 'trainer', canBattle: true, defeated: false, baseReward: 250,
    requires: i === 0 ? ['Crown Badge', 'derailDefeated', 'defeated_rival_blake_4'] : [`defeated_${elite[i - 1].id}`],
    storyFlag: i === 4 ? 'gameComplete' : `defeated_${e.id}`,
    party: e.roster.map(r => ({ speciesId: r[0], level: r[1] })),
    dialogue: dialogue(e.name, e.dialogue.intro), defeatDialogue: dialogue(e.name, e.dialogue.defeat) }));
  eliteNPCs[4].defeatDialogue = [
    { speaker: 'Champion Cypress', text: 'The Grand Transit has its new Champion.' },
    { speaker: 'Credits', text: 'CREDITS - The rails continue wherever you choose to travel.' },
    { speaker: 'Conductor', text: 'Old Iron and legendary trains await beyond the main line.' }
  ];
  const blake4 = createRivalBlakeNPC(4, 6, 26, 'down');
  const leagueHealer = { id: 'league_healer', name: 'Platform Attendant', x: 10, y: 27,
    type: 'healer', dialogue: dialogue('Platform Attendant', 'Rest here between the Elite Conductors.') };
  const oldIronRematch = { id: 'old_iron_rematch', name: 'Old Iron Rematch', x: 10, y: 3,
    type: 'trainer', canBattle: true, baseReward: 500, requires: ['postgameUnlocked'],
    storyFlag: 'oldIronRematchWon', party: [{ speciesId: 151, level: 70 }],
    dialogue: dialogue('Old Iron', 'The rails have one more lesson to teach.') };
  WORLD_MAPS.GrandTerminus = runtimeMap('GrandTerminus', 'Grand Terminus', tt, [blake4, ...eliteNPCs, leagueHealer, oldIronRematch], [
    { from: rect(6, 29), to: { mapId: 'VictoryRoad', ...pos(10, 22, 'up') } }
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
      { from: rect(10, 5), to: { mapId: 'LabInterior', ...pos(4, 7, 'up') }, reverse: { from: rect(4, 9), to: pos(10, 6, 'down') } },
      { from: rect(16, 6), to: { mapId: 'HealingDepot', ...pos(3, 6, 'up') } },
      { from: rect(4, 12), to: { mapId: 'TrainMart', ...pos(3, 6, 'up') } },
      { from: rect(9, 14, 2, 1), to: { mapId: 'Route1', ...pos(10, 1, 'down') } }
    ];
    map.npcs = [createRivalBlakeNPC(1, 10, 13, 'down'),
      { id: 'piston_station_guide', name: 'Station Guide', x: 8, y: 7, type: 'npc', dialogue: townDialogue('Station Guide', 'Piston Town') },
      { id: 'piston_gardener', name: 'Rail Gardener', x: 12, y: 8, type: 'npc', dialogue: townDialogue('Rail Gardener', 'Piston Town') },
      questNpc('piston_courier', 'Courier', 7, 8, 'piston_potion_delivery', 'potion', 'The depot crew thanks you for the delivery. Here is an Ether.')];
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
    map.npcs = (map.npcs || []).filter(n => n.id !== 'rival_blake_2');
    map.npcs.push(createRivalBlakeNPC(2, 10, 18, 'down'));
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
      { from: rect(5, 12), to: { mapId: 'CoalHarborGym', ...pos(7, 13, 'up') }, reverse: { from: rect(7, 14), to: pos(5, 13, 'down') } },
      { from: rect(15, 12), to: { mapId: 'CoalMart', ...pos(3, 6, 'down') } },
      { from: rect(9, 0, 2, 1), to: { mapId: 'Route1', ...pos(10, 22, 'up') } },
      { from: rect(9, 14, 2, 1), to: { mapId: 'Route2', ...pos(10, 1, 'down') } }
    ];
    map.npcs = [createRivalBlakeNPC(3, 16, 8, 'right'),
      { id: 'coalharbor_dock_guide', name: 'Dock Guide', x: 8, y: 7, type: 'npc', dialogue: townDialogue('Dock Guide', 'Coal Harbor') },
      { id: 'coalharbor_freight_clerk', name: 'Freight Clerk', x: 12, y: 8, type: 'npc', dialogue: townDialogue('Freight Clerk', 'Coal Harbor') },
      { id: 'coalharbor_fisher', name: 'Harbor Fisher', x: 7, y: 8, type: 'npc', dialogue: townDialogue('Harbor Fisher', 'Coal Harbor') }];
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

  // Build reverse interior exits from the exterior door metadata.
  for (const sourceMap of Object.values(WORLD_MAPS)) {
    for (const transition of sourceMap.warps || []) {
      if (transition.reverse) {
        addReverseWarp(sourceMap, WORLD_MAPS[transition.to.mapId], transition);
      }
    }
  }

  // Interior exits land just outside the authored exterior doorways.
  const returnTo = (id, mapId, x, y) => {
    const map = WORLD_MAPS[id];
    if (map && map.warps && map.warps[0]) map.warps[0].to = { mapId, ...pos(x, y, 'down') };
  };
  returnTo('PlayerHouse', 'PistonTown', 4, 6);
  returnTo('HealingDepot', 'PistonTown', 16, 7);
  returnTo('TrainMart', 'PistonTown', 4, 13);
  returnTo('CoalHouse', 'CoalHarbor', 4, 6);
  returnTo('CoalDepot', 'CoalHarbor', 16, 6);
  returnTo('CoalMart', 'CoalHarbor', 15, 13);
})();

// Derived collision metadata: void=0, water=4, wall=5, and tree=7 are blocked;
// rail tile 6 is traversable. Player movement uses each map's isWalkable().
for (const m of Object.values(WORLD_MAPS)) {
  m.collisions = new Set();
  const { tiles } = m;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const idx = tiles[y][x];
      // Rails are traversable in Grand Transit; void/walls/trees are not.
      if (idx === 0 || idx === 4 || idx === 5 || idx === 7) {
        m.collisions.add(`${x},${y}`);
      }
    }
  }
}

console.log('🗺️ World maps loaded:', Object.keys(WORLD_MAPS));

// conducted#124: Diesel Den and Maglev Heights - handcrafted mid-game towns.
// They occupy the City5/City6 slots of the Grand Transit chain:
//   City4 -Route5-> DieselDen -Route6-> MaglevHeights -Route7-> City7
// STORY.md sections 5/6: Diesel Den = "The Industrial Heart" (grimy factory
// city, Diesel gym, train mod shop, underground fighting ring); Maglev Heights
// = "Touching the Sky" (futuristic floating city, Maglev gym, space station,
// weather research institute). The art-pass theme slot carries the
// ART_DIRECTION_SPECS.md palette cues: 'foundry' (dark metal/soot/ember) and
// 'sky' (cyan glow/maglev field). City5/City6 stay registered as aliases so
// existing Grand Transit references keep resolving.
(function installDieselDenMaglevHeights() {
  const fillRectTiles = (tiles, x, y, w, h, value) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = value;
  };
  const frame = (tiles, value = 0) => {
    const h = tiles.length, w = tiles[0].length;
    for (let x = 0; x < w; x++) { tiles[0][x] = value; tiles[h - 1][x] = value; }
    for (let y = 0; y < h; y++) { tiles[y][0] = value; tiles[y][w - 1] = value; }
  };
  const decorateBuilding = (x, y, w, h, kind, label, doorX) => ({ type: 'building', x, y, w, h, kind, label, doorX });
  const computeCollisions = map => {
    map.collisions = new Set();
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const idx = map.tiles[y][x];
      if (idx === 0 || idx === 4 || idx === 5 || idx === 7) map.collisions.add(`${x},${y}`);
    }
  };
  const say = (speaker, text) => [{ speaker, text }];

  // Handcrafted town: north-south walkable corridor, east-west connector,
  // blocked building rects with door tiles (12) carrying door metadata.
  function townMap(id, name, theme, buildings, npcs, warps) {
    const w = 20, h = 15, t = grid(w, h, 1);
    frame(t, 0);
    for (let y = 1; y < h - 1; y++) { t[y][9] = 3; t[y][10] = 3; }
    t[0][9] = 3; t[0][10] = 3; t[h - 1][9] = 3; t[h - 1][10] = 3;
    for (let x = 1; x < w - 1; x++) t[7][x] = 3;
    const decorations = [];
    for (const b of buildings) {
      fillRectTiles(t, b.x, b.y, b.w, b.hh, 0);
      if (b.door) {
        const [dx, dy] = b.door;
        t[dy][dx] = 12;
        t[dy + 1][dx] = 3;
      }
      decorations.push(decorateBuilding(b.x, b.y, b.w, b.hh, b.kind, b.label, b.door ? b.door[0] : b.x));
    }
    const map = {
      id, name, theme, decorations, npcs: npcs || [], warps: warps || [],
      width: w, height: h, tiles: t,
      getTile(x, y) { return x < 0 || y < 0 || x >= this.width || y >= this.height ? 0 : this.tiles[y][x]; },
      isWalkable(x, y) {
        if (this.npcs.some(n => n.x === x && n.y === y && !n.hidden)) return false;
        return [1, 2, 3, 6, 12].includes(this.getTile(x, y));
      },
      checkForEncounter() { return false; }
    };
    computeCollisions(map);
    return map;
  }

  function stubInterior(id, name, returnMapId, returnX, returnY, attendant, line) {
    const t = boxed(8, 8, 0, 1);
    t[7][4] = 12;
    const map = {
      id, name, theme: 'interior', decorations: [],
      npcs: attendant ? [{
        id: `${id}_attendant`, name: attendant, x: 4, y: 2, type: 'npc',
        dialogue: say(attendant, line)
      }] : [],
      warps: [{ from: rect(4, 7), to: { mapId: returnMapId, ...pos(returnX, returnY, 'down') } }],
      width: 8, height: 8, tiles: t,
      getTile(x, y) { return x < 0 || y < 0 || x >= this.width || y >= this.height ? 0 : this.tiles[y][x]; },
      isWalkable(x, y) {
        if (this.npcs.some(n => n.x === x && n.y === y && !n.hidden)) return false;
        return [1, 12].includes(this.getTile(x, y));
      },
      checkForEncounter() { return false; }
    };
    computeCollisions(map);
    return map;
  }

  function gymLeader(id, name, x, y, badge, party, intro) {
    return {
      id, name, x, y, type: 'gym_leader', canBattle: true, defeated: false,
      badge, baseReward: 150, party,
      dialogue: say(name, intro),
      defeatDialogue: say(name, 'You kept your timetable. The badge is yours!')
    };
  }

  // --- Diesel Den: "The Industrial Heart" ---
  WORLD_MAPS.DieselDen = townMap('DieselDen', 'Diesel Den', 'foundry', [
    { x: 2, y: 2, w: 4, hh: 3, kind: 'shop', label: 'DIESEL MOD SHOP', door: [3, 4] },
    { x: 13, y: 2, w: 4, hh: 3, kind: 'arena', label: 'UNDERGROUND FIGHTING RING', door: [15, 4] },
    { x: 2, y: 9, w: 4, hh: 3, kind: 'depot', label: 'SCRAP BUNKER' },
    { x: 13, y: 9, w: 4, hh: 3, kind: 'gym', label: 'DIESEL GYM', door: [15, 11] }
  ], [
    gymLeader('gym_leader_torque', 'Boss Torque', 14, 12, 'Piston Badge',
      [{ speciesId: 64, level: 30 }, { speciesId: 66, level: 32 }, { speciesId: 69, level: 34 }],
      'Hah! My diesel freighters will grind you into scrap!'),
    {
      id: 'dieselden_mechanic', name: 'Mod Mechanic', x: 3, y: 6, type: 'npc',
      dialogue: townDialogue('Mod Mechanic', 'Diesel Den')
    },
    {
      id: 'dieselden_brawler', name: 'Ring Brawler', x: 15, y: 6, type: 'npc',
      dialogue: townDialogue('Ring Brawler', 'Diesel Den')
    },
    { id: 'dieselden_scrap_merchant', name: 'Scrap Merchant', x: 7, y: 8, type: 'npc', dialogue: townDialogue('Scrap Merchant', 'Diesel Den') }
  ], [
    { from: rect(3, 4), to: { mapId: 'DieselModShop', ...pos(4, 6, 'down') } },
    { from: rect(15, 4), to: { mapId: 'FightingRing', ...pos(4, 6, 'down') } },
    { from: rect(15, 11), to: { mapId: 'Gym5', ...pos(6, 10, 'up') } },
    { from: rect(9, 0, 2, 1), to: { mapId: 'Route5', ...pos(10, 22, 'up') } },
    { from: rect(9, 14, 2, 1), to: { mapId: 'Route6', ...pos(10, 1, 'down') } }
  ]);
  WORLD_MAPS.DieselDen.decorations.push({ type: 'sign', x: 8, y: 8 });
  WORLD_MAPS.DieselModShop = stubInterior('DieselModShop', 'Diesel Mod Shop', 'DieselDen', 3, 5,
    'Shopkeeper Wrench', 'Custom boilers, reinforced cowcatchers - name your upgrade.');
  WORLD_MAPS.FightingRing = stubInterior('FightingRing', 'Underground Fighting Ring', 'DieselDen', 15, 5,
    'Ring Announcer', 'Winner takes the scrap purse. Loser takes the walk of shame.');

  // --- Maglev Heights: "Touching the Sky" ---
  WORLD_MAPS.MaglevHeights = townMap('MaglevHeights', 'Maglev Heights', 'sky', [
    { x: 2, y: 2, w: 4, hh: 3, kind: 'station', label: 'SPACE STATION', door: [3, 4] },
    { x: 13, y: 2, w: 4, hh: 3, kind: 'lab', label: 'WEATHER RESEARCH INSTITUTE', door: [15, 4] },
    { x: 2, y: 9, w: 4, hh: 3, kind: 'dock', label: 'SKY DOCK' },
    { x: 13, y: 9, w: 4, hh: 3, kind: 'gym', label: 'MAGLEV GYM', door: [15, 11] }
  ], [
    gymLeader('gym_leader_aria', 'Sky Captain Aria', 14, 12, 'Levitation Badge',
      [{ speciesId: 82, level: 36 }, { speciesId: 85, level: 38 }, { speciesId: 88, level: 40 }],
      'Catch me if you can - my maglevs ride the wind itself!'),
    {
      id: 'maglevheights_scientist', name: 'Institute Scientist', x: 15, y: 6, type: 'npc',
      dialogue: townDialogue('Institute Scientist', 'Maglev Heights')
    },
    {
      id: 'maglevheights_watcher', name: 'Star Watcher', x: 3, y: 6, type: 'npc',
      dialogue: townDialogue('Star Watcher', 'Maglev Heights')
    },
    { id: 'maglevheights_signal_tech', name: 'Signal Technician', x: 7, y: 8, type: 'npc', dialogue: townDialogue('Signal Technician', 'Maglev Heights') }
  ], [
    { from: rect(3, 4), to: { mapId: 'SpaceStation', ...pos(4, 6, 'down') } },
    { from: rect(15, 4), to: { mapId: 'WeatherInstitute', ...pos(4, 6, 'down') } },
    { from: rect(15, 11), to: { mapId: 'Gym6', ...pos(6, 10, 'up') } },
    { from: rect(9, 0, 2, 1), to: { mapId: 'Route6', ...pos(10, 22, 'up') } },
    { from: rect(9, 14, 2, 1), to: { mapId: 'Route7', ...pos(10, 1, 'down') } }
  ]);
  WORLD_MAPS.MaglevHeights.decorations.push({ type: 'sign', x: 11, y: 8 });
  WORLD_MAPS.SpaceStation = stubInterior('SpaceStation', 'Space Station', 'MaglevHeights', 3, 5,
    'Station Chief Nova', 'Rare trains pass through the orbital dock. Keep your tickets ready.');
  WORLD_MAPS.WeatherInstitute = stubInterior('WeatherInstitute', 'Weather Research Institute', 'MaglevHeights', 15, 5,
    'Researcher Gale', 'We seed clouds so your rails never flood.');

  // City5/City6 slots now resolve to the handcrafted towns.
  WORLD_MAPS.City5 = WORLD_MAPS.DieselDen;
  WORLD_MAPS.City6 = WORLD_MAPS.MaglevHeights;

  // Rewire the chain through the new towns (standardized edge-warp connections).
  const retarget = (mapId, oldTarget, newTarget, x, y, dir) => {
    for (const w of (WORLD_MAPS[mapId].warps || [])) {
      if (w.to.mapId === oldTarget) { w.to.mapId = newTarget; w.to.x = x; w.to.y = y; w.to.dir = dir; }
    }
  };
  retarget('Route5', 'City5', 'DieselDen', 10, 0, 'down');
  retarget('Route6', 'City5', 'DieselDen', 10, 13, 'down');
  retarget('Route6', 'City6', 'MaglevHeights', 10, 0, 'down');
  retarget('Route7', 'City6', 'MaglevHeights', 10, 13, 'down');
  // Gym5/Gym6 keep their return warps, retargeted to the handcrafted towns.
  retarget('Gym5', 'City5', 'DieselDen', 15, 12, 'down');
  retarget('Gym6', 'City6', 'MaglevHeights', 15, 12, 'down');

  // Encounter-range metadata the engine reads from the map registry.
  const encounterRanges = [[1, 20], [16, 38], [31, 56], [45, 72], [64, 94], [82, 116], [103, 139], [124, 151]];
  for (let n = 1; n <= 8; n++) WORLD_MAPS[`Route${n}`].encounterRange = encounterRanges[n - 1];

  // Track technique gates sit on obstacle tiles away from the rail path.
  const stamp = (mapId, waters, trees) => {
    const map = WORLD_MAPS[mapId];
    for (const [x, y, w, h] of waters) fillRectTiles(map.tiles, x, y, w, h, 5);
    for (const [x, y, w, h] of trees) fillRectTiles(map.tiles, x, y, w, h, 7);
    computeCollisions(map);
  };
  stamp('Route5', [[2, 5, 3, 3]], [[15, 15, 3, 3]]);
  stamp('Route6', [[15, 10, 3, 3]], [[2, 5, 3, 3]]);
  const addTechniqueGates = (mapId, gates) => {
    const map = WORLD_MAPS[mapId];
    map.techniqueObstacles = gates;
    const canWalk = map.isWalkable.bind(map);
    map.getTechniqueObstacle = (x, y) => gates.find(gate => gate.x === x && gate.y === y) || null;
    map.isWalkable = function (x, y, player) {
      const gate = this.getTechniqueObstacle(x, y);
      if (gate) return Boolean(player && player.hasTechnique(gate.technique));
      return canWalk(x, y);
    };
  };
  addTechniqueGates('Route5', [
    { x: 2, y: 5, technique: 'River Ferry', clearedMessage: 'River Ferry carries you across the water.' },
    { x: 15, y: 15, technique: 'Track Clear', clearedMessage: 'Track Clear opens a path through the trees.' }
  ]);
  addTechniqueGates('Route6', [
    { x: 2, y: 5, technique: 'Tunnel Bore', clearedMessage: 'Tunnel Bore cuts through the rockfall.' }
  ]);
})();

// Add attendants after campaign and town NPC setup so station staff remain
// present when authored NPC lists are replaced.
(function installRailPassStations() {
  const towns = ['PistonTown', 'CoalHarbor', 'City2', 'City3', 'City4', 'City5', 'City6', 'City7', 'City8'];
  for (const id of towns) {
    const map = WORLD_MAPS[id];
    if (!map) continue;
    map.npcs.push({ id: `station_${id}`, name: 'Rail Attendant', x: 11, y: 7, type: 'station',
      dialogue: [{ speaker: 'Rail Attendant', text: 'The rail pass lets you return to towns you have already visited.' }] });
  }
})();

if (typeof window !== 'undefined') {
  window.WORLD_MAPS = WORLD_MAPS;
  window.createRivalBlakeNPC = createRivalBlakeNPC;
  window.getRivalStarterId = getRivalStarterId;
}
if (typeof globalThis !== 'undefined') {
  globalThis.WORLD_MAPS = WORLD_MAPS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORLD_MAPS, createRivalBlakeNPC, getRivalStarterId };
}

