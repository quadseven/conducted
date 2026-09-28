// Train species. Names and evolution lines come from TRAIN_NAMES.md; types map
// each line's theme onto the eight train types; starter descriptions come from
// WORLDBUILDING.md. Stats are this game's own.
//
// S(id, name, types, [hp, atk, def, spd, spc], growth, catchRate, expYield, evo, moves, dex, art)
//   evo:   [level, intoId] or ['item', itemId, intoId] or null
//   moves: 'level:Move Name, level:Move Name, ...'
//   dex:   [classification, height m, weight kg, entry]
(function (CD) {
  'use strict';
  const list = {};
  function S(id, name, types, base, growth, catchRate, exp, evo, moves, dex, art) {
    list[id] = {
      id, name, types: types.split('/'),
      base: { hp: base[0], atk: base[1], def: base[2], spd: base[3], spc: base[4] },
      growth, catchRate, exp,
      evo: evo ? (evo[0] === 'item' ? { item: evo[1], into: evo[2] } : { level: evo[0], into: evo[1] }) : null,
      learnset: moves.split(',').map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf(':'); return { level: +s.slice(0, i), move: s.slice(i + 1).trim() }; }),
      dex: dex ? { cls: dex[0], ht: dex[1], wt: dex[2], text: dex[3] } : null,
      art,
    };
  }
  const COPPER = '#c07a4a';

  S(1, 'STEAMINI', 'STEAM', [44, 48, 46, 42, 56], 'mslow', 45, 64, [16, 2],
    '1:Ram, 1:Whistle Blast, 7:Coal Throw, 10:Smoke Screen, 13:Steam Jet, 18:Emergency Brake, 22:Coupler Crush, 27:Boiler Burst, 33:Pressure Blast',
    ['Little Engine Train', 2.4, 38, 'Friendly copper engines with gentle, patient hearts. They puff white steam when happy and never give up, even pulling twice their weight.'],
    { body: 'steam', len: 36, h: 20, scale: 0.95, col: COPPER, col2: '#8b5230', trim: '#c8a24e', faceCol: '#d8ccc0', eye: '#4a6a9a', stack: 'short', wheels: 2, wheelR: 7, bell: true, cowCol: '#d64545', face: 'cute' });
  S(2, 'STEAMORE', 'STEAM', [60, 64, 60, 58, 72], 'mslow', 45, 142, [32, 3],
    '1:Ram, 1:Whistle Blast, 1:Coal Throw, 10:Smoke Screen, 13:Steam Jet, 18:Emergency Brake, 24:Coupler Crush, 30:Boiler Burst, 37:Pressure Blast, 44:Full Throttle',
    ['Journeyman Train', 4.3, 112, 'Its copper takes on a burnished bronze sheen. It runs on time, every time, and will push itself to the limit to protect its friends.'],
    { body: 'steam', len: 48, h: 17, scale: 1, col: '#b0703e', col2: '#6b4226', trim: '#d4a857', faceCol: '#cfc6bc', eye: '#3a5a8a', stack: 'tall', wheels: 3, wheelR: 6.5, bell: true, tender: true, face: 'bold' });
  S(3, 'LOCOMOTOR', 'STEAM/FREIGHT', [80, 86, 84, 76, 92], 'mslow', 45, 236, null,
    '1:Ram, 1:Coal Throw, 1:Steam Jet, 1:Smoke Screen, 18:Emergency Brake, 24:Coupler Crush, 30:Boiler Burst, 32:Container Crush, 40:Pressure Blast, 48:Mega Steam',
    ['Legendary Engine Train', 6.7, 310, 'Polished steel with golden trim. Its steam burns so hot it glows faintly blue, and its whistle can be heard for miles.'],
    { body: 'steam', len: 54, h: 18, scale: 1.05, col: '#6a7a92', col2: '#3a4258', trim: '#e0b04e', faceCol: '#d8dce4', eye: '#2a6ab0', stack: 'tall', stackCol: '#2a3040', wheels: 3, wheelR: 7, tender: true, face: 'fierce', mouth: 'grin', spikes: 0 });
  S(4, 'SPARKART', 'ELECTRIC', [40, 50, 40, 64, 58], 'mslow', 45, 62, [16, 5],
    '1:Spark, 1:Horn Honk, 7:Pantograph Spark, 11:Express Shunt, 15:Third Rail, 19:Charge Beam, 25:Iron Bumper, 30:Rail Gun, 38:Lightning Express',
    ['Electric Bullet Train', 2.1, 30, 'Sleek and silver, crackling with small arcs when excited. Sparkart love to race the wind and sometimes make nearby lights flicker.'],
    { body: 'electric', len: 42, h: 15, scale: 0.92, col: '#c8ccd8', col2: '#aab0c0', stripe: '#3a78c8', window: '#9ad8f0', eye: '#2a8ad8', windows: 2, spark: '#f8e060', face: 'cute' });
  S(5, 'VOLTRAIN', 'ELECTRIC', [58, 64, 56, 82, 76], 'mslow', 45, 142, [36, 6],
    '1:Spark, 1:Horn Honk, 1:Pantograph Spark, 11:Express Shunt, 15:Third Rail, 21:Charge Beam, 27:Iron Bumper, 33:Rail Gun, 42:Lightning Express, 48:Overload',
    ['High-Speed Train', 4.0, 88, 'Yellow bolt markings run along its frame. It accelerates so quickly it leaves electric afterimages on the track.'],
    { body: 'electric', len: 50, h: 15, scale: 1, col: '#d0d4e0', col2: '#b8bccc', stripe: '#e8c030', window: '#8ac8f0', eye: '#2a6ac8', windows: 3, spark: '#f8e060', face: 'bold' });
  S(6, 'THUNDERAIL', 'ELECTRIC/MAGLEV', [76, 82, 74, 108, 104], 'mslow', 45, 240, null,
    '1:Spark, 1:Pantograph Spark, 1:Third Rail, 1:Express Shunt, 21:Charge Beam, 27:Iron Bumper, 33:Rail Gun, 36:Magnetic Pulse, 44:Lightning Express, 52:EMP Blast',
    ['Supersonic Train', 6.1, 190, 'Its body shimmers with shifting currents and its eyes glow like white-hot plasma. It outruns thunderstorms along the old routes.'],
    { body: 'maglev', len: 56, h: 15, scale: 1, col: '#e8e8f0', col2: '#c8c8dc', stripe: '#f0c828', window: '#5a4a9a', glow: '#f8f0a0', eye: '#e8a820', windows: 2, fins: true, face: 'fierce', mouth: 'fang' });
  S(7, 'DIESLING', 'DIESEL', [48, 50, 56, 38, 44], 'mslow', 45, 63, [16, 8],
    '1:Ram, 1:Engine Rev, 7:Diesel Spray, 10:Wheel Grind, 13:Exhaust Fumes, 18:Iron Bumper, 22:Fuel Blast, 28:Coupler Crush, 34:Turbo Charge',
    ['Diesel Engine Train', 2.7, 52, 'Sturdy brown engines with the heart of a loyal working dog. Slow to start, but once rolling nothing stops them.'],
    { body: 'diesel', len: 40, h: 17, scale: 0.92, col: '#9a6a44', col2: '#b8824e', stripe: '#e8c040', faceCol: '#c8a070', eye: '#6a4a2a', exhaust: true, face: 'cute' });
  S(8, 'WARTORQUE', 'DIESEL', [62, 66, 76, 52, 58], 'mslow', 45, 142, [32, 9],
    '1:Ram, 1:Engine Rev, 1:Diesel Spray, 10:Wheel Grind, 13:Exhaust Fumes, 20:Iron Bumper, 25:Fuel Blast, 31:Coupler Crush, 38:Turbo Charge, 45:Heavy Haul',
    ['Freight Hound Train', 4.6, 180, 'Broad and heavily plated, it can pull loads that would stop three smaller trains. Its engine rumble can be felt through the ground.'],
    { body: 'diesel', len: 50, h: 18, scale: 1, col: '#7a5236', col2: '#9a6a44', stripe: '#e8a030', faceCol: '#b88a5a', eye: '#8a3a2a', exhaust: true, face: 'bold', mouth: 'grille' });
  S(9, 'TITANORQUE', 'DIESEL/FREIGHT', [84, 90, 104, 64, 70], 'mslow', 45, 239, null,
    '1:Ram, 1:Engine Rev, 1:Diesel Spray, 1:Wheel Grind, 20:Iron Bumper, 25:Fuel Blast, 31:Coupler Crush, 32:Heavy Haul, 42:Turbo Charge, 50:Freight Frenzy',
    ['Ultimate Freight Train', 7.3, 540, 'A colossal gentle giant. Its horn sounds like an old foghorn and its headlamps cut through the thickest fog.'],
    { body: 'diesel', len: 56, h: 20, scale: 1.02, col: '#5a4a3a', col2: '#7a6048', stripe: '#e8c040', faceCol: '#a88a6a', eye: '#c84a2a', exhaust: true, face: 'fierce', mouth: 'grille' });

  CD.species = {
    list,
    get: id => list[id],
    all: () => Object.values(list),
    byName: n => Object.values(list).find(s => s.name === String(n).toUpperCase()),
    S,
  };
})(window.CD);
