// Tests for conducted#214: Routes 2-4 and Steamspring Village.
//
// Steamspring Village (STORY.md section 4, "Preserving History") takes the
// City4 slot of the Grand Transit chain, directly before Diesel Den:
//   CoalHarbor -Route2-> City2 -Route3-> City3 -Route4-> SteamspringVillage
// WORLD_MAPS.City4 stays registered as an alias, so story triggers and fast
// travel that name City4 keep resolving.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {} }, module: undefined, Math };
vm.createContext(context);
for (const file of [
    'js/constants.js', 'js/utils.js', 'js/types.js', 'js/moves.js',
    'js/train-data.js', 'js/trainData.js', 'js/npcData.js', 'js/maps.js', 'js/map.js', 'js/story.js', 'js/world-maps.js'
]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const maps = vm.runInContext('WORLD_MAPS', context);

// 1. Routes 2-4 carry dimensions, matching tile data, and encounter placeholders.
for (const id of ['Route2', 'Route3', 'Route4']) {
    const route = maps[id];
    assert.ok(route, `${id} must exist`);
    assert.equal(route.tiles.length, route.height, `${id} tile rows must match its height`);
    assert.ok(route.tiles.every(row => row.length === route.width), `${id} tile columns must match its width`);
    assert.equal(route.encounterRange.length, 2, `${id} needs an encounter range placeholder`);
}

// 2. The village exists and owns the City4 slot.
const village = maps.SteamspringVillage;
assert.ok(village, 'WORLD_MAPS.SteamspringVillage must exist');
assert.equal(village.name, 'Steamspring Village');
assert.equal(maps.City4, village, 'City4 must alias Steamspring Village');

// 3. Labeled entrances: every building has a door tile with a warp into a real map.
const buildings = village.decorations.filter(d => d.type === 'building');
const kinds = buildings.map(b => b.kind);
for (const kind of ['depot', 'mart', 'gym', 'home']) {
    assert.ok(kinds.includes(kind), `Steamspring Village needs a ${kind} building`);
}
const warpAt = (map, x, y) => (map.warps || []).find(w =>
    x >= w.from.x && x < w.from.x + (w.from.w || 1) && y >= w.from.y && y < w.from.y + (w.from.h || 1));
for (const b of buildings) {
    assert.ok(b.label, `building at ${b.x},${b.y} needs a label`);
    const doorY = b.y + b.h - 1;
    assert.equal(village.tiles[doorY][b.doorX], 12, `${b.label} needs a door tile`);
    const warp = warpAt(village, b.doorX, doorY);
    assert.ok(warp && maps[warp.to.mapId], `${b.label} door must warp into an existing map`);
    const inside = maps[warp.to.mapId];
    const exit = inside.warps.find(w => maps[w.to.mapId] === village);
    assert.ok(exit, `${b.label} interior must lead back to the village`);
    assert.ok(village.isWalkable(exit.to.x, exit.to.y), `${b.label} exit must land on a walkable tile`);
}
const gym = buildings.find(b => b.kind === 'gym');
assert.equal(warpAt(village, gym.doorX, gym.y + gym.h - 1).to.mapId, 'Gym4', 'the village gym must be Gym4');

// 4. Walking from Coal Harbor through Routes 2-4 reaches the village, using
//    only walkable tiles and the warps a footstep triggers.
const allowed = new Set(['CoalHarbor', 'Route2', 'City2', 'Route3', 'City3', 'Route4', 'City4']);
function walkReaches(start, goal) {
    const seen = new Set();
    const queue = [[start, 10, 1]];
    while (queue.length) {
        const [id, x, y] = queue.shift();
        const key = `${id}:${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (maps[id] === goal) return true;
        const map = maps[id];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!map.isWalkable(nx, ny)) continue;
            const warp = warpAt(map, nx, ny);
            if (!warp) queue.push([id, nx, ny]);
            else if (allowed.has(warp.to.mapId)) queue.push([warp.to.mapId, warp.to.x, warp.to.y]);
        }
    }
    return false;
}
assert.equal(walkReaches('CoalHarbor', village), true, 'Coal Harbor must reach Steamspring Village on foot');

// 5. The village continues the chain south to Diesel Den's route.
assert.ok(village.warps.some(w => w.to.mapId === 'Route4'), 'Steamspring Village must warp north to Route4');
assert.ok(village.warps.some(w => w.to.mapId === 'Route5'), 'Steamspring Village must warp south to Route5');

console.log('steamspring-village tests passed');
