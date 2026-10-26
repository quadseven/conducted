'use strict';
const assert = require('node:assert/strict');
const H = require('./harness.js');
const CD = H.load().CD;
const W = CD.world;

for (const id of ['Route2', 'Route3', 'Route4']) {
  const map = W.get(id);
  const size = W.size(map);
  assert(size.w > 0 && size.h > 0, id + ' has dimensions');
  assert.equal(map.rows.length, size.h, id + ' has complete tile rows');
  assert(map.encounters && map.encounters.grass, id + ' has grass encounter placeholders');
}

const village = W.get('SteamspringVillage');
for (const [style, interior] of [
  ['depot', 'SteamspringDepot'], ['mart', 'SteamspringMart'], ['gym', 'BoilerGym'],
  ['station', 'SteamspringMuseum'],
]) {
  const building = village.buildings.find(item => item.style === style);
  assert(building, 'village has a ' + style + ' footprint');
  assert(building.label, style + ' footprint is labeled');
  const warp = village.warps.find(item => item.to === interior);
  assert(warp, style + ' has a labeled entrance warp');
}

const corridor = ['CoalHarbor', 'Route2', 'VoltageCity', 'Route3', 'Route4', 'SteamspringVillage'];
for (let i = 0; i < corridor.length - 1; i++) {
  const from = W.get(corridor[i]);
  const to = W.get(corridor[i + 1]);
  const side = Object.keys(from.connections || {}).find(key => from.connections[key].map === to.id);
  assert(side, from.id + ' connects to ' + to.id);
  const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' }[side];
  assert.equal(to.connections[opposite].map, from.id, to.id + ' connects back to ' + from.id);
  const size = W.size(from);
  const edgeY = side === 'north' ? 0 : size.h - 1;
  const edgeX = side === 'east' || side === 'west' ?
    (side === 'east' ? size.w - 1 : 0) : -1;
  const edge = side === 'north' || side === 'south' ? from.rows[edgeY] : '';
  const x = edgeX >= 0 ? edgeX : Math.max(0, edge.indexOf('='));
  const y = edgeY;
  const direction = { north: 'up', south: 'down', east: 'right', west: 'left' }[side];
  const step = W.canStep({}, from, x, y, direction, 'player');
  assert(step.ok && step.crossMap && step.crossMap.map.id === to.id, 'walking crosses from ' + from.id + ' into ' + to.id);
}

const start = [W.get('CoalHarbor'), 11, W.size(W.get('CoalHarbor')).h - 1];
const queue = [start];
const visited = new Set([start[0].id + ':' + start[1] + ',' + start[2]]);
for (let cursor = 0; cursor < queue.length; cursor++) {
  const [map, x, y] = queue[cursor];
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const cell = W.cellAt(map, x + dx, y + dy);
    if (!cell || cell.cell.solid) continue;
    const key = cell.map.id + ':' + cell.x + ',' + cell.y;
    if (!visited.has(key)) {
      visited.add(key);
      queue.push([cell.map, cell.x, cell.y]);
    }
  }
}
assert(visited.has('SteamspringVillage:9,9'), 'walking from the Coal Harbor entrance reaches Steamspring Village');

console.log('route2_4.test: ok');
