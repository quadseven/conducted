// Map layouts for Locomotia. Legends are in src/game/world.js.
// Outdoor maps join seamlessly through `connections`; interiors are entered by warps.
(function (CD) {
  'use strict';
  const D = CD.world.define;

  // ------------------------------------------------------------------ Piston Town
  D('PistonTown', {
    name: 'PISTON TOWN', music: 'piston',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T.......f==f.......T',
      'T..BBBB..==...BBBB.T',
      'T..BBBB..==...BBBB.T',
      'T..BBBBm.==..mBBBB.T',
      'T...=....==.....=..T',
      'T...============...T',
      'T.ff.....==.BBBBBB.T',
      'T.ff.....==.BBBBBB.T',
      'T..Aa....==.BBBBBB.T',
      'T......I.==.BBBBBB.T',
      'T........======....T',
      'T..BBBBBB==ff..fff.T',
      'T..BBBBBB==.....x..T',
      'T.lBBBBBB==.......lT',
      'T+++++++++++++++++ST',
      'TY##################',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    buildings: [
      { x: 3, y: 2, w: 4, h: 3, style: 'house', door: 1 },
      { x: 14, y: 2, w: 4, h: 3, style: 'houseTeal', door: 1 },
      { x: 12, y: 7, w: 6, h: 4, style: 'lab', door: 2 },
      { x: 3, y: 12, w: 6, h: 3, style: 'station', door: null },
    ],
    warps: [
      { x: 4, y: 4, to: 'PlayerHouse1F', tx: 3, ty: 7, dir: 'up' },
      { x: 15, y: 4, to: 'RivalHouse', tx: 3, ty: 7, dir: 'up' },
      { x: 14, y: 10, to: 'CypressLab', tx: 4, ty: 11, dir: 'up' },
    ],
    connections: { north: { map: 'Route1', offset: 0 } },
    signs: [
      { x: 7, y: 10, text: 'PISTON TOWN\nWhere every journey leaves on time.' },
      { x: 7, y: 4, text: "{PLAYER}'s house" },
      { x: 13, y: 4, text: "{RIVAL}'s house" },
      { x: 3, y: 9, text: 'OLD IRON\nWho carried Locomotia through the Great Derailment.' },
      { x: 4, y: 9, text: 'OLD IRON\nWho carried Locomotia through the Great Derailment.' },
      { x: 6, y: 14, text: 'PISTON DEPOT\nClosed for restoration. The old engines rest here.' },
    ],
  });

  D('PlayerHouse1F', {
    name: 'PISTON TOWN', indoor: true, floor: 'wood', wallTint: '#e8d8b4', music: 'piston',
    rows: [
      'WWWWWWWW',
      'KKk..vEU',
      '........',
      '.htth...',
      '........',
      '......p.',
      '........',
      '...M....',
    ],
    warps: [
      { x: 3, y: 7, to: 'PistonTown', tx: 4, ty: 4, dir: 'down' },
      { x: 7, y: 1, to: 'PlayerHouse2F', tx: 7, ty: 1, dir: 'left', any: true },
    ],
  });
  D('PlayerHouse2F', {
    name: 'PISTON TOWN', indoor: true, floor: 'wood', wallTint: '#d8e0c8', music: 'piston',
    rows: [
      'WWWWWWWW',
      'QK..G.vV',
      '........',
      '........',
      '....cc..',
      '.b..cc..',
      '.B......',
      '........',
    ],
    carpetTint: '#6a8ac0',
    warps: [{ x: 7, y: 1, to: 'PlayerHouse1F', tx: 7, ty: 1, dir: 'left', any: true }],
  });
  D('RivalHouse', {
    name: 'PISTON TOWN', indoor: true, floor: 'wood', wallTint: '#e0d0e0', music: 'piston',
    rows: [
      'WWWWWWWW',
      'KKe..vKK',
      '........',
      '..htth..',
      '........',
      'p......p',
      '........',
      '...M....',
    ],
    warps: [{ x: 3, y: 7, to: 'PistonTown', tx: 15, ty: 4, dir: 'down' }],
  });
  D('CypressLab', {
    name: 'PISTON TOWN', indoor: true, floor: 'tile', wallTint: '#dce4ec', music: 'lab',
    rows: [
      'WWWWWWWWWW',
      'ZQ..e.KKKK',
      '..........',
      '......123.',
      '..........',
      '..........',
      'KKKK..KKKK',
      '..........',
      '.w......G.',
      '..........',
      '..........',
      '....M.....',
    ],
    warps: [{ x: 4, y: 11, to: 'PistonTown', tx: 14, ty: 10, dir: 'down' }],
  });

  // ------------------------------------------------------------------ Route 1
  D('Route1', {
    name: 'ROUTE 1', music: 'route1',
    rows: [
      'TTTTTTT..==..TTTTTTT',
      'TTTTTT...==...TTTTTT',
      'TT.""""..==..""""".T',
      'TT.""""..==..""""".T',
      'TT......f==f......TT',
      'TTTT.....==.......TT',
      'TTLLLLLLL==LLLLLL.TT',
      'TT...T...==...T...TT',
      'TT.......==.......TT',
      'TT......i==.......TT',
      'TT.ff....==....ff.TT',
      'TTFFFFFFF==FFFFFFFTT',
      'TT.......==....S..TT',
      '#########XX#########',
      'TT.......==.......TT',
      'TT.S.....==.......TT',
      'TT"""""..=====....TT',
      'TT"""""......=....TT',
      'TT"""""..T...=.TT.TT',
      'TT"""""......=....TT',
      'TT"""""...====....TT',
      'TT........=.......TT',
      'TTLLLLLLLL=LLLLLL.TT',
      'TT........=.."""".TT',
      'TT..TT....=.."""".TT',
      'TT..TT...==.."""".TT',
      'TT.......==.."""".TT',
      'TT..f....==.......TT',
      'TTT......==......TTT',
      'TTTT.....==.....TTTT',
      'TTTTTT...==...TTTTTT',
      'TTTTTTTT.==.TTTTTTTT',
    ],
    connections: { south: { map: 'PistonTown', offset: 0 }, north: { map: 'CoalHarbor', offset: -2 } },
    ambientTrain: { row: 13, dir: 1, speed: 2, cars: 3, every: 1100 },
    signs: [{ x: 8, y: 9, text: 'ROUTE 1\nPISTON TOWN - COAL HARBOR' }],
  });

  // ------------------------------------------------------------------ Coal Harbor
  D('CoalHarbor', {
    name: 'COAL HARBOR', music: 'harbor', base: 'cobble',
    rows: [
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~DD~~~~~~~~~~~~~~~DD~~~~',
      '~~~~~DD~~~~~~~~~~~~~~~DD~~~~',
      '::o::DD::o::n::::o::::DD::o:',
      '::::::::::::::::::::::::::::',
      ':BBBBBB::C:O:::BBBBBB::::::T',
      ':BBBBBB::::::::BBBBBB::::::T',
      ':BBBBBB::::::::BBBBBB::::::T',
      '::::::::l::::l:BBBBBB:l::::T',
      '::::::::::::::::::::I:::::::',
      '###########XX#########X#####',
      ':::::::::::::::::::::::::::T',
      ':BBBBB:::BBBB::::I:::BBBB::T',
      ':BBBBB:::BBBB::::::::BBBB::T',
      ':BBBBB:::BBBB:x::x:::BBBB::T',
      '::::::::::::::::::::::::::TT',
      'TT:::::::::::::::::::::::TTT',
      'TT..hhh...:::...hhh...%%%TTT',
      'TT..............:.....%%%TTT',
      'TTT.ff.........::..ff.%%%TTT',
      'TTTT..........::......gggTTT',
      'TTTTTT.....==.........%%%TTT',
      'TTTTTTTTTTT==TTTTTTTTTTTTTTT',
    ],
    buildings: [
      { x: 1, y: 6, w: 6, h: 3, style: 'warehouse', door: null },
      { x: 15, y: 6, w: 6, h: 4, style: 'gym', door: 3 },
      { x: 1, y: 13, w: 5, h: 3, style: 'depot', door: 2 },
      { x: 9, y: 13, w: 4, h: 3, style: 'mart', door: 2 },
      { x: 21, y: 13, w: 4, h: 3, style: 'houseBlue', door: 1 },
    ],
    warps: [
      { x: 18, y: 9, to: 'HarborGym', tx: 5, ty: 13, dir: 'up' },
      { x: 3, y: 15, to: 'HarborDepot', tx: 5, ty: 7, dir: 'up' },
      { x: 11, y: 15, to: 'HarborMart', tx: 3, ty: 7, dir: 'up' },
      { x: 22, y: 15, to: 'HarborHouse', tx: 3, ty: 7, dir: 'up' },
    ],
    connections: { south: { map: 'Route1', offset: 2 }, north: { map: 'Route2', offset: 0 } },
    ambientTrain: { row: 11, dir: -1, speed: 2, cars: 4, every: 900 },
    signs: [
      { x: 17, y: 13, text: 'COAL HARBOR\nThe tide brings trains to our door.' },
      { x: 12, y: 4, text: 'An anchor from the first train ferry. Barnacles have made it their station.' },
      { x: 4, y: 8, text: 'HARBOR FREIGHT SHED\nAuthorized crews only.' },
      { x: 20, y: 10, text: 'COAL HARBOR GYM\nSTATIONMASTER: CAPTAIN MARINA\nThe tide waits for no conductor!' },
    ],
  });

  D('HarborDepot', {
    name: 'COAL HARBOR', indoor: true, floor: 'tile', wallTint: '#f0dcd0', music: 'depot',
    rows: [
      'WWWWWWWWWWW',
      'p...H....Qp',
      '...NNNNN...',
      '...........',
      '.h.......h.',
      '.t.......t.',
      '...........',
      '.....M.....',
    ],
    warps: [{ x: 5, y: 7, to: 'CoalHarbor', tx: 3, ty: 15, dir: 'down' }],
  });
  D('HarborMart', {
    name: 'COAL HARBOR', indoor: true, floor: 'tile', wallTint: '#dce4f0', music: 'depot',
    rows: [
      'WWWWWWWW',
      'EE.EEEEE',
      '.n......',
      '.n......',
      '.n......',
      '....E.E.',
      '....E.E.',
      '...M....',
    ],
    warps: [{ x: 3, y: 7, to: 'CoalHarbor', tx: 11, ty: 15, dir: 'down' }],
  });
  D('HarborHouse', {
    name: 'COAL HARBOR', indoor: true, floor: 'wood', wallTint: '#d8e4e8', music: 'harbor',
    rows: [
      'WWWWWWWW',
      'KK.w.v.p',
      '........',
      '..htth..',
      '........',
      'O.......',
      'O.......',
      '...M....',
    ],
    warps: [{ x: 3, y: 7, to: 'CoalHarbor', tx: 22, ty: 15, dir: 'down' }],
  });
  D('HarborGym', {
    name: 'COAL HARBOR GYM', indoor: true, floor: 'wood', wallTint: '#c8d0dc', music: 'gym',
    rows: [
      'WWWWWWWWWWW',
      'O...ccc...O',
      '....ccc....',
      '.rrr...rrr.',
      '.r.......r.',
      '.r.rr.rr.r.',
      '...r...r...',
      'rr.r...r.rr',
      '...........',
      '.rrrr.rrrr.',
      '...........',
      'O.........O',
      '...........',
      '.....M.....',
    ],
    carpetTint: '#2f3f6a',
    warps: [{ x: 5, y: 13, to: 'CoalHarbor', tx: 18, ty: 9, dir: 'down' }],
  });

  // The main line grows east from the harbor through increasingly rugged
  // regions before reaching the summit. Each outdoor map has a clear rail-side
  // path and a walkable grass area for exploration.
  function makeOutdoorRows(theme) {
    const rows = [
      'TTTTTTTTT==TTTTTTTTT',
      'T........==........T',
      'T..RR....==....RR..T',
      'T........==........T',
      'T..""....==....""..T',
      'T........==........T',
      'TTTT.....==.....TTTT',
      'TT.................TT',
      'TT..f......f......TT',
      'TT.................TT',
      'TT.....i...........TT',
      'TT.................TT',
      'TT""......==....""TT',
      'TT........==.......TT',
      'TT........==.......TT',
      'TT........==.......TT',
      'TTTT.....==.....TTTT',
      'TTTTTTTTT==TTTTTTTTT',
    ];
    if (theme === 'coast') rows[3] = 'T..~~~~..==..~~~~..T';
    if (theme === 'city') rows[7] = 'TT...++++==++++...TT';
    if (theme === 'mountain' || theme === 'snow') rows[2] = 'T..RRR...==...RRR.T';
    if (theme === 'industrial') rows[6] = 'TT...####==####..TT';
    if (theme === 'haunted') rows[8] = 'TT...l....==...l..TT';
    if (theme === 'facility') rows[7] = 'TT...++++==++++...TT';
    return rows.map(row => row.length > 20 ? row.slice(0, 20) : row.padEnd(20, 'T'));
  }
  function addTown(id, name, theme, route, direction, nextRoute) {
    const rows = makeOutdoorRows(theme);
    const connections = {};
    connections[direction] = { map: route, offset: 0 };
    if (nextRoute) connections[direction === 'south' ? 'north' : 'south'] = { map: nextRoute, offset: 0 };
    D(id, {
      name, music: theme === 'snow' || theme === 'haunted' ? 'route1' : 'harbor',
      base: theme === 'coast' ? 'sand' : theme === 'industrial' ? 'cobble' : 'grass',
      rows,
      connections,
      signs: [{ x: 7, y: 10, text: name + '\nA station on the Locomotia main line.' }],
    });
  }
  function addRoute(id, name, from, to, theme) {
    D(id, {
      name, music: 'route1', base: theme === 'coast' ? 'sand' : 'grass',
      rows: makeOutdoorRows(theme),
      connections: { south: { map: from, offset: 0 }, north: { map: to, offset: 0 } },
      signs: [{ x: 7, y: 10, text: name + '\nKeep to the marked railway path.' }],
    });
  }
  function addSpecial(id, name, theme) {
    const rows = makeOutdoorRows(theme);
    rows[0] = 'TTTTTTTTT==TTTTTTTTT';
    rows[17] = 'TTTTTTTTT==TTTTTTTTT';
    D(id, { name, music: 'route1', base: theme === 'snow' ? 'snow' : 'grass', rows,
      signs: [{ x: 7, y: 10, text: name + '\nWild trains gather near the old tracks.' }] });
  }

  addRoute('Route2', 'ROUTE 2 - COASTAL LINE', 'CoalHarbor', 'VoltageCity', 'coast');
  addTown('VoltageCity', 'VOLTAGE CITY', 'city', 'Route2', 'south', 'Route3');
  addRoute('Route3', 'ROUTE 3 - VOLTAGE VALLEY', 'VoltageCity', 'SteamspringVillage', 'city');
  addSpecial('VoltageValley', 'VOLTAGE VALLEY', 'city', null);
  addTown('SteamspringVillage', 'STEAMSPRING VILLAGE', 'historic', 'Route3', 'south', 'Route4');
  addRoute('Route4', 'ROUTE 4 - WHISTLESTOP WAY', 'SteamspringVillage', 'DieselDen', 'forest');
  addSpecial('WhistlestopForest', 'WHISTLESTOP FOREST', 'forest', null);
  addTown('DieselDen', 'DIESEL DEN', 'industrial', 'Route4', 'south', 'Route5');
  addRoute('Route5', 'ROUTE 5 - IRON MOUNTAIN', 'DieselDen', 'MaglevHeights', 'mountain');
  addSpecial('IronMountainRange', 'IRON MOUNTAIN RANGE', 'mountain', null);
  addTown('MaglevHeights', 'MAGLEV HEIGHTS', 'city', 'Route5', 'south', 'Route6');
  addRoute('Route6', 'ROUTE 6 - THE OLD SIDING', 'MaglevHeights', 'GhostRailGraveyard', 'haunted');
  addTown('GhostRailGraveyard', 'GHOST RAIL GRAVEYARD', 'haunted', 'Route6', 'south', 'Route7');
  addSpecial('MysteryTower', 'MYSTERY TOWER', 'haunted', null);
  addRoute('Route7', 'ROUTE 7 - SUNSET DESERT', 'GhostRailGraveyard', 'NuclearStation', 'desert');
  addSpecial('SunsetDesert', 'SUNSET DESERT', 'desert', null);
  addTown('NuclearStation', 'NUCLEAR STATION', 'facility', 'Route7', 'south', 'Route8');
  addSpecial('PowerPlant', 'POWER PLANT', 'facility', null);
  addSpecial('RadioactiveCaves', 'RADIOACTIVE CAVES', 'facility', null);
  addRoute('Route8', 'ROUTE 8 - FROZEN TUNDRA', 'NuclearStation', 'MonorailMountaintop', 'snow');
  addSpecial('FrozenTundra', 'FROZEN TUNDRA', 'snow', null);
  addTown('MonorailMountaintop', 'MONORAIL MOUNTAINTOP', 'snow', 'Route8', 'south');
  addSpecial('VictoryRoad', 'VICTORY ROAD', 'mountain', null);
  addSpecial('SpaceStation', 'SPACE STATION', 'city', null);
  addSpecial('WeatherInstitute', 'WEATHER RESEARCH INSTITUTE', 'city', null);
  addSpecial('TrainMuseum', 'TRAIN MUSEUM', 'historic', null);
  addSpecial('HotSprings', 'HOT SPRINGS', 'historic', null);
})(window.CD);
