// Tests for NPC rendering visibility through buildings and solid tiles.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createTestContext() {
  const drawnSprites = [];
  const mockCtx = {
    imageSmoothingEnabled: false,
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    rect() {},
    clip() {},
    fillRect() {},
    drawImage(...args) { drawnSprites.push(args); },
    getImageData() { return { data: new Uint8Array(4) }; },
    putImageData() {}
  };
  const mockCanvas = {
    width: 256,
    height: 256,
    getContext: () => mockCtx
  };
  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Map, Set,
    Uint32Array, Uint8Array, Int16Array, Float32Array, Error, RangeError,
    document: { createElement: () => mockCanvas },
    window: null,
    globalThis: null,
    Image: function () { this.onload = null; this.onerror = null; this.src = ''; }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const scripts = [
    'js/constants.js',
    'js/utils.js',
    'js/types.js',
    'js/npcData.js',
    'js/map.js',
    'js/maps.js',
    'js/world-maps.js',
    'js/sprite-atlas.js',
    'js/graphics.js'
  ];

  for (const rel of scripts) {
    const full = path.join(__dirname, '..', rel);
    const code = fs.readFileSync(full, 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  }

  return { ctx, mockCtx, drawnSprites };
}

// 1. NPCs only render on the same map, not through buildings
{
  const { ctx, mockCtx, drawnSprites } = createTestContext();
  const WorldArt = ctx.WorldArt;
  const maps = ctx.WORLD_MAPS;
  const town = maps.PistonTown;

  // NPC defined for a different map (e.g. LabInterior) should not render in PistonTown
  const labNpc = { id: 'cypress', name: 'Professor Cypress', x: 4, y: 7, map: 'LabInterior' };
  assert.equal(
    WorldArt.shouldRenderCharacter(labNpc, { map: town }),
    false,
    'NPC with different map property should not be rendered'
  );

  drawnSprites.length = 0;
  WorldArt.drawWorldCharacter(mockCtx, labNpc, 50, 50, 16, { map: town });
  assert.equal(drawnSprites.length, 0, 'drawWorldCharacter should not draw an NPC on a different map');

  // NPC on the same map with matching map id should be allowed to render
  const townNpc = { id: 'guide', name: 'Station Guide', x: 8, y: 7, map: 'PistonTown' };
  assert.equal(
    WorldArt.shouldRenderCharacter(townNpc, { map: town }),
    true,
    'NPC on the same map should be rendered'
  );

  // NPC with no explicit map property defaults to current map
  const defaultNpc = { id: 'gardener', name: 'Rail Gardener', x: 12, y: 8 };
  assert.equal(
    WorldArt.shouldRenderCharacter(defaultNpc, { map: town }),
    true,
    'NPC with no map property on current map should be rendered'
  );

  // NPC on the same map should render when options.map is a string id
  assert.equal(
    WorldArt.shouldRenderCharacter(townNpc, { map: 'PistonTown' }),
    true,
    'NPC on the same map should render when options.map is a string id'
  );
  assert.equal(
    WorldArt.shouldRenderCharacter(labNpc, { map: 'PistonTown' }),
    false,
    'NPC on different map should not render when options.map is a string id'
  );
}

// 2. NPCs not visible through solid tiles from outside
{
  const { ctx, mockCtx, drawnSprites } = createTestContext();
  const WorldArt = ctx.WorldArt;
  const maps = ctx.WORLD_MAPS;
  const town = maps.PistonTown;

  // Ash House building in PistonTown is at x:2..6, y:2..5 with tile 0 (solid)
  // An NPC positioned inside the building rectangle should not render from outside
  const npcInsideBuilding = { id: 'hidden_npc', name: 'Hidden', x: 3, y: 3 };
  assert.equal(
    WorldArt.shouldRenderCharacter(npcInsideBuilding, { map: town }),
    false,
    'NPC inside building decoration should not render from outside'
  );

  drawnSprites.length = 0;
  WorldArt.drawWorldCharacter(mockCtx, npcInsideBuilding, 30, 30, 16, { map: town });
  assert.equal(drawnSprites.length, 0, 'drawWorldCharacter should not draw an NPC inside a building');

  // NPC on a solid wall tile (tile 0 border) should not render
  const npcOnSolidTile = { id: 'wall_npc', name: 'Wall', x: 0, y: 7 };
  assert.equal(
    WorldArt.shouldRenderCharacter(npcOnSolidTile, { map: town }),
    false,
    'NPC on solid border tile should not render from outside'
  );

  // NPC behind a solid building from the player's perspective (line of sight obstructed)
  // Player at (10, 3), building at (8, 1, w:5, h:5 - Cypress Lab), NPC at (7, 3)
  const observer = { x: 14, y: 3 };
  const targetBehindBuilding = { id: 'behind_lab', name: 'Behind', x: 7, y: 3 };
  assert.equal(
    WorldArt.hasLineOfSight(town, observer.x, observer.y, targetBehindBuilding.x, targetBehindBuilding.y),
    false,
    'Line of sight through building should be blocked'
  );
  assert.equal(
    WorldArt.shouldRenderCharacter(targetBehindBuilding, { map: town, player: observer }),
    false,
    'NPC obstructed by solid building along line of sight should not render'
  );

  // Obstructions are detected even when options.map is a string id
  assert.equal(
    WorldArt.shouldRenderCharacter(npcInsideBuilding, { map: 'PistonTown' }),
    false,
    'NPC inside building decoration should not render when options.map is a string id'
  );
  assert.equal(
    WorldArt.shouldRenderCharacter(targetBehindBuilding, { map: 'PistonTown', player: observer }),
    false,
    'NPC obstructed by solid building along line of sight should not render when options.map is a string id'
  );
}

// 3. Existing same-map NPC rendering remains unaffected
{
  const { ctx, mockCtx, drawnSprites } = createTestContext();
  const WorldArt = ctx.WorldArt;
  const maps = ctx.WORLD_MAPS;

  // Outdoor open-ground NPC on Route 1 (Youngster Joey at 10, 7)
  const route = maps.Route1;
  const joey = route.npcs.find(n => n.id === 'route1_youngster_joey');
  assert.ok(joey, 'Joey exists on Route 1');
  assert.equal(
    WorldArt.shouldRenderCharacter(joey, { map: route, player: { x: 10, y: 4 } }),
    true,
    'Open-path NPC with clear line of sight should render normally'
  );
  assert.equal(
    WorldArt.shouldRenderCharacter(joey, { map: 'Route1', player: { x: 10, y: 4 } }),
    true,
    'Open-path NPC with clear line of sight should render normally when options.map is a string id'
  );

  drawnSprites.length = 0;
  WorldArt.drawWorldCharacter(mockCtx, joey, 100, 70, 16, { map: route });
  assert.ok(drawnSprites.length > 0, 'drawWorldCharacter draws same-map open NPC');

  // Indoor NPC inside gym (Captain Marina at 7, 2 in CoalHarborGym)
  const gym = maps.CoalHarborGym;
  const marina = gym.npcs.find(n => n.id === 'gym_leader_marina');
  assert.ok(marina, 'Marina exists in Coal Harbor Gym');
  assert.equal(
    WorldArt.shouldRenderCharacter(marina, { map: gym, player: { x: 7, y: 8 } }),
    true,
    'Indoor NPC on indoor map should render normally'
  );

  // Player character should render when active
  const player = { isPlayer: true, type: 'player', x: 3, y: 3 };
  assert.equal(
    WorldArt.shouldRenderCharacter(player, { map: route }),
    true,
    'Player character should be rendered on current map'
  );

  // Hidden player character should not render
  const hiddenPlayer = { isPlayer: true, type: 'player', x: 3, y: 3, hidden: true };
  assert.equal(
    WorldArt.shouldRenderCharacter(hiddenPlayer, { map: route }),
    false,
    'Hidden player character should not be rendered'
  );

  // Hidden NPC should not render
  const hiddenNpc = { id: 'hidden_route_npc', name: 'Hidden NPC', x: 10, y: 7, hidden: true };
  assert.equal(
    WorldArt.shouldRenderCharacter(hiddenNpc, { map: route }),
    false,
    'Hidden NPC should not be rendered'
  );
}
