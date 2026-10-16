'use strict';
const assert = require('node:assert/strict');
const H = require('./harness.js');
const CD = H.load().CD;

const towns = ['PistonTown', 'CoalHarbor', 'VoltageCity', 'SteamspringVillage', 'DieselDen', 'MaglevHeights', 'GhostRailGraveyard', 'NuclearStation', 'MonorailMountaintop'];
const routes = ['Route1', 'Route2', 'Route3', 'Route4', 'Route5', 'Route6', 'Route7', 'Route8'];
const specials = ['WhistlestopForest', 'IronMountainRange', 'SunsetDesert', 'FrozenTundra', 'VictoryRoad', 'RadioactiveCaves', 'MysteryTower', 'PowerPlant', 'SpaceStation', 'WeatherInstitute', 'TrainMuseum', 'HotSprings'];
for (const id of [...towns, ...routes, ...specials]) {
  assert(CD.world.maps[id], `${id} has a map`);
}
for (const id of [...routes, 'WhistlestopForest', 'IronMountainRange', 'SunsetDesert', 'FrozenTundra', 'VictoryRoad', 'RadioactiveCaves']) {
  const map = CD.world.get(id);
  assert(map.encounters && (map.encounters.grass || map.encounters.yard), `${id} has wild train encounters`);
}
for (const id of specials) {
  const map = CD.world.get(id);
  assert(map.encounters && map.encounters.grass, `${id} has a wild train encounter table`);
}
for (const id of routes) {
  const map = CD.world.get(id);
  for (const link of Object.values(map.connections || {})) assert(CD.world.maps[link.map], `${id} connection target exists`);
}
console.log('world-expansion.test: ok');
