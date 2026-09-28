// Named colours. Warm, muted earth tones per the art direction: nothing fully
// saturated, shadows lean violet, highlights lean cream.
(function (CD) {
  'use strict';
  CD.pal = {
    ink: '#241c30', ink2: '#3a2f48', paper: '#f7f0dc', paper2: '#e9dcbc', cream: '#fff8e4',
    grass: '#8cbf64', grassD: '#6aa251', grassDD: '#4e8545', grassL: '#aad27a', grassLL: '#c8e39a',
    tall: '#4f9148', tallD: '#357a3e', tallDD: '#255e36', tallL: '#79b35a', tallLL: '#a4d06e',
    path: '#dcc08e', pathD: '#c3a372', pathDD: '#a3845a', pathL: '#ecd6a6',
    cobble: '#c9b8a0', cobbleD: '#a8967f', cobbleL: '#e2d4bc',
    sand: '#ecd9a4', sandD: '#d6be86', sandL: '#f8eac0',
    water: '#5b9ccc', waterD: '#3f7cb0', waterDD: '#2f6394', waterL: '#8cc3e2', foam: '#e8f6fa',
    trunk: '#7a5236', trunkD: '#553823',
    leaf: '#5e9c4c', leafD: '#3f7a3e', leafDD: '#2b5a34', leafL: '#86bd5c', leafLL: '#b0d676',
    wood: '#b5824f', woodD: '#8a5e3a', woodDD: '#5f3f28', woodL: '#d4a672',
    stone: '#a7a3a8', stoneD: '#7f7a86', stoneDD: '#5c5766', stoneL: '#cac6c8',
    steel: '#9aa4b0', steelD: '#6a7280', steelL: '#d8dee6',
    ballast: '#8f877e', ballastD: '#6e6660', ballastL: '#aba399',
    sleeper: '#6d4a33', sleeperD: '#4b3222',
    brass: '#c8a24e', brassL: '#ecd08a', brassD: '#8e6c2c',
    red: '#c8513f', redD: '#963a33', redL: '#e27a5e',
    blue: '#4f78b8', blueD: '#3a5a92', blueL: '#7ea3d8',
    navy: '#2f3f6a', teal: '#3f8f8a', tealL: '#6fbab0',
    copper: '#c07a4a', copperD: '#8b5230', copperL: '#e0a574',
    white: '#fbf7ee', black: '#1a1422', shadow: '#1a1430',
    hpGreen: '#58c05a', hpYellow: '#e8c040', hpRed: '#e05040', exp: '#4fa0e8',
    night: '#1c2448',
  };
  // Type colours (battle UI chips, move animations)
  CD.typeColor = {
    STEAM: '#d0703f', ELECTRIC: '#e3b53a', DIESEL: '#8a6a4a', MAGLEV: '#9a6cc8',
    FREIGHT: '#5a7a96', PASSENGER: '#b4a888', NUCLEAR: '#6cbf4a', MONORAIL: '#4aa8b8',
  };
})(window.CD);
