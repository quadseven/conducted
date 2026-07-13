const GT_TILE = Object.freeze({ FLOOR: 0, WALL: 1, GRASS: 2, ROAD: 3, DOOR: 4, WATER: 5 });
const GT_CITY_NAMES = ["Coal Harbor", "Copper Junction", "Ironworks", "Verdant Platform", "Skybeam", "Isotope City", "Velocity Terminal", "Crown Central"];

function makeCityMap(index) {
    const width = 20;
    const height = 15;
    const tiles = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return x === 10 ? GT_TILE.ROAD : GT_TILE.WALL;
        if (x === 9 || x === 10 || y === 7) return GT_TILE.ROAD;
        if ((x >= 3 && x <= 6 && y >= 3 && y <= 5) || (x >= 13 && x <= 16 && y >= 9 && y <= 11)) return GT_TILE.WALL;
        return GT_TILE.FLOOR;
    }));
    tiles[5][4] = GT_TILE.DOOR;
    tiles[11][14] = GT_TILE.DOOR;
    return { id: `city${index + 1}`, name: GT_CITY_NAMES[index], width, height, tiles, stationmaster: NPC_DATA.stationmasters[index].id, warps: [{ x: 4, y: 5, to: `gym${index + 1}` }, { x: 10, y: 14, to: index === 7 ? "terminus" : `route${index + 1}` }] };
}

function makeRouteMap(index) {
    const width = 20;
    const height = 24;
    const tiles = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
        if (x === 0 || x === width - 1) return GT_TILE.WALL;
        if (x >= 8 && x <= 11) return GT_TILE.ROAD;
        if ((x + y + index) % 5 < 3) return GT_TILE.GRASS;
        return GT_TILE.FLOOR;
    }));
    return { id: `route${index + 1}`, name: `Route ${index + 1}`, width, height, tiles, encounters: [index * 18 + 1, index * 18 + 4, index * 18 + 7, index * 18 + 10, index * 18 + 13].map(id => Math.min(151, id)), warps: [{ x: 10, y: 0, to: `city${index + 1}` }, { x: 10, y: height - 1, to: index === 7 ? "city8" : `city${index + 2}` }] };
}

function makeGymMap(index) {
    const width = 12;
    const height = 12;
    const tiles = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? GT_TILE.WALL : GT_TILE.FLOOR));
    tiles[11][6] = GT_TILE.DOOR;
    return { id: `gym${index + 1}`, name: `${GT_CITY_NAMES[index]} Station`, width, height, tiles, leader: NPC_DATA.stationmasters[index].id, warps: [{ x: 6, y: 11, to: `city${index + 1}` }] };
}

const GT_MAPS = Object.freeze(Object.fromEntries([
    ...Array.from({ length: 8 }, (_, i) => makeCityMap(i)),
    ...Array.from({ length: 8 }, (_, i) => makeRouteMap(i)),
    ...Array.from({ length: 8 }, (_, i) => makeGymMap(i)),
    { id: "terminus", name: "Terminus Station", width: 12, height: 30, tiles: Array.from({ length: 30 }, (_, y) => Array.from({ length: 12 }, (_, x) => x === 0 || x === 11 || y === 0 || y === 29 ? GT_TILE.WALL : GT_TILE.ROAD)), battles: ["brass", "aurora", "vector", "radia", "champion_cypress"] }
].map(map => [map.id, map])));

if (typeof module !== "undefined" && module.exports) module.exports = { GT_TILE, GT_MAPS };
