// Tests for conducted#124: Diesel Den and Maglev Heights regions + Routes 5-6.
//
// Design (decided on the ticket; see STORY.md sections 5/6 and epic #19):
// - DieselDen and MaglevHeights are handcrafted towns occupying the City5 and
//   City6 slots of the Grand Transit chain, replacing the generic makeCity
//   output for those slots: City4 -Route5-> DieselDen -Route6-> MaglevHeights
//   -Route7-> City7. Existing Gym5/Gym6 keep their return warps, retargeted.
// - Diesel Den: "The Industrial Heart" (STORY.md) - grimy factory city, Diesel
//   gym. Palette cues from ART_DIRECTION_SPECS.md: dark metal #3A3A3A, soot
//   and ember tones; theme 'foundry'.
// - Maglev Heights: "Touching the Sky" (STORY.md) - futuristic floating city
//   on magnetic rails, Maglev gym. Palette cues: cyan glow #8FC8E8, pale cyan
//   #E0F4FF maglev field; theme 'sky'.
// - STORY.md NPC placements: Diesel Den gets a Train modification shop and an
//   Underground fighting ring; Maglev Heights gets a Space Station (rare
//   trains) and a Weather Research Institute. Gym leaders stubbed from the
//   story bible: Boss Torque (Diesel) and Sky Captain Aria (Maglev).
// - Routes 5-6 keep the standardized connection system (north/south edge
//   warps via rect/pos, same as every other route) and carry water/tree
//   obstacle tiles reserved for future track techniques (Surf/Cut analogs).
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

const ids = vm.runInContext(
    `['DieselDen', 'MaglevHeights', 'Route5', 'Route6', 'Route7', 'City4', 'City7'].filter(id => WORLD_MAPS[id])`,
    context);

// 1. The towns exist.
assert.ok(ids.includes('DieselDen'), 'WORLD_MAPS.DieselDen must exist');
assert.ok(ids.includes('MaglevHeights'), 'WORLD_MAPS.MaglevHeights must exist');

const result = vm.runInContext(`(() => {
    const out = {};
    for (const id of ['DieselDen', 'MaglevHeights', 'Route5', 'Route6', 'Route7']) {
        out[id] = WORLD_MAPS[id];
    }
    // Walkable north-to-south corridor through a map (entry row 0 to exit row h-1).
    function corridorWalkable(map) {
        const seen = new Set();
        const queue = [];
        for (let x = 0; x < map.width; x++) {
            if (map.isWalkable(x, 0)) { seen.add('0,' + x); queue.push([x, 0]); }
        }
        while (queue.length) {
            const [x, y] = queue.pop();
            if (y === map.height - 1) return true;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, key = ny + ',' + nx;
                if (!seen.has(key) && map.isWalkable(nx, ny)) { seen.add(key); queue.push([nx, ny]); }
            }
        }
        return false;
    }
    const warpTargets = map => (map.warps || []).map(w => w.to.mapId);
    const doorTiles = map => {
        const doors = [];
        for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++)
            if (map.tiles[y][x] === 12) doors.push([x, y]);
        return doors;
    };
    const tileKinds = map => new Set(map.tiles.flat());
    const buildings = map => (map.decorations || []).filter(d => d.type === 'building');
    out.corridor = { DieselDen: corridorWalkable(out.DieselDen), MaglevHeights: corridorWalkable(out.MaglevHeights) };
    out.warps = { DieselDen: warpTargets(out.DieselDen), MaglevHeights: warpTargets(out.MaglevHeights),
        Route5: warpTargets(out.Route5), Route6: warpTargets(out.Route6), Route7: warpTargets(out.Route7) };
    out.doors = { DieselDen: doorTiles(out.DieselDen), MaglevHeights: doorTiles(out.MaglevHeights) };
    out.doorWarped = {};
    for (const id of ['DieselDen', 'MaglevHeights']) {
        const map = out[id];
        out.doorWarped[id] = out.doors[id].every(([x, y]) =>
            (map.warps || []).some(w => x >= w.from.x && x < w.from.x + (w.from.w || 1) &&
                y >= w.from.y && y < w.from.y + (w.from.h || 1)));
    }
    out.tiles = { Route5: [...tileKinds(out.Route5)], Route6: [...tileKinds(out.Route6)] };
    out.buildings = { DieselDen: buildings(out.DieselDen), MaglevHeights: buildings(out.MaglevHeights) };
    out.themes = { DieselDen: out.DieselDen.theme, MaglevHeights: out.MaglevHeights.theme };
    out.leaders = {};
    for (const id of ['DieselDen', 'MaglevHeights']) {
        const npc = out[id].npcs.find(n => n.type === 'gym_leader');
        out.leaders[id] = npc ? { id: npc.id, name: npc.name } : null;
    }
    out.encounters = { Route5: out.Route5.encounterRange, Route6: out.Route6.encounterRange };
    out.trainers = { Route5: out.Route5.npcs.filter(n => n.type === 'trainer').length,
        Route6: out.Route6.npcs.filter(n => n.type === 'trainer').length };
    return out;
})()`, context);

// 2. Walkable paths: a traversable corridor from the north edge to the south edge.
assert.equal(result.corridor.DieselDen, true, 'Diesel Den needs a walkable north-south corridor');
assert.equal(result.corridor.MaglevHeights, true, 'Maglev Heights needs a walkable north-south corridor');

// 3. Door metadata: door tiles exist and every door tile has a warp on it.
assert.ok(result.doors.DieselDen.length >= 2, 'Diesel Den needs door tiles');
assert.ok(result.doors.MaglevHeights.length >= 2, 'Maglev Heights needs door tiles');
assert.equal(result.doorWarped.DieselDen, true, 'every Diesel Den door must have door metadata (a warp)');
assert.equal(result.doorWarped.MaglevHeights, true, 'every Maglev Heights door must have door metadata (a warp)');

// 4. Building placements (STORY.md): mod shop + fighting ring in Diesel Den,
//    space station + weather institute in Maglev Heights, plus each gym.
const ddLabels = result.buildings.DieselDen.map(b => b.label);
const mhLabels = result.buildings.MaglevHeights.map(b => b.label);
assert.ok(ddLabels.some(l => /mod/i.test(l)), 'Diesel Den needs the train modification shop');
assert.ok(ddLabels.some(l => /fight|ring/i.test(l)), 'Diesel Den needs the underground fighting ring');
assert.ok(mhLabels.some(l => /space|station/i.test(l)), 'Maglev Heights needs the space station');
assert.ok(mhLabels.some(l => /weather|institute/i.test(l)), 'Maglev Heights needs the weather research institute');

// 5. Routes 5-6 connect previous regions to the towns via the standardized
//    connection system (edge warps on both sides of each boundary).
assert.ok(result.warps.DieselDen.includes('Route5'), 'Diesel Den must warp north to Route5');
assert.ok(result.warps.DieselDen.includes('Route6'), 'Diesel Den must warp south to Route6');
assert.ok(result.warps.MaglevHeights.includes('Route6'), 'Maglev Heights must warp north to Route6');
assert.ok(result.warps.MaglevHeights.includes('Route7'), 'Maglev Heights must warp south to Route7');
assert.ok(result.warps.Route5.includes('City4'), 'Route5 must connect back to City4');
assert.ok(result.warps.Route5.includes('DieselDen'), 'Route5 must connect forward to DieselDen');
assert.ok(result.warps.Route6.includes('DieselDen'), 'Route6 must connect back to DieselDen');
assert.ok(result.warps.Route6.includes('MaglevHeights'), 'Route6 must connect forward to MaglevHeights');
assert.ok(result.warps.Route7.includes('MaglevHeights'), 'Route7 must connect back to MaglevHeights');
assert.ok(result.warps.Route7.includes('City7'), 'Route7 must still connect forward to City7');

// 6. Obstacles for future track techniques (Surf/Cut analogs): water and tree
//    tiles on the themed routes.
for (const id of ['Route5', 'Route6']) {
    assert.ok(result.tiles[id].includes(5), `${id} needs water tiles for future Surf-analog obstacles`);
    assert.ok(result.tiles[id].includes(7), `${id} needs tree tiles for future Cut-analog obstacles`);
}

// 7. Encounter tables and trainer stubs for mid-to-late game tuning.
// Array.from: the encounter arrays live in the vm realm, whose Array prototype
// never deep-equals the test realm's (same workaround as coal-harbor-interiors).
assert.deepEqual(Array.from(result.encounters.Route5), [64, 94], 'Route5 keeps its mid-game encounter table');
assert.deepEqual(Array.from(result.encounters.Route6), [82, 116], 'Route6 keeps its late-mid-game encounter table');
assert.ok(result.trainers.Route5 >= 2, 'Route5 needs trainer stubs');
assert.ok(result.trainers.Route6 >= 2, 'Route6 needs trainer stubs');

// 8. Gym leader stubs from the story bible.
assert.ok(result.leaders.DieselDen, 'Diesel Den must stub its gym leader');
assert.equal(result.leaders.DieselDen.name, 'Boss Torque');
assert.ok(result.leaders.MaglevHeights, 'Maglev Heights must stub its gym leader');
assert.equal(result.leaders.MaglevHeights.name, 'Sky Captain Aria');

// 9. Palette cues from ART_DIRECTION_SPECS.md via the art-pass theme system.
assert.equal(result.themes.DieselDen, 'foundry', 'Diesel Den theme must be foundry (industrial palette)');
assert.equal(result.themes.MaglevHeights, 'sky', 'Maglev Heights theme must be sky (maglev palette)');

console.log('Diesel Den / Maglev Heights region tests passed');
