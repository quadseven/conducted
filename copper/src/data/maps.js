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
      '~~~~~~~~~==~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~==~~~~~~~~~~~~~~~~~',
      '~~~~~DD~~==~~~~~~~~~~~DD~~~~',
      '~~~~~DD~~==~~~~~~~~~~~DD~~~~',
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
      'T'.repeat(11) + '==' + 'T'.repeat(15),
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
  // A town's gym stands north-east of the main path: a 6x4 footprint at
  // GYM_LOT whose door (GYM_DOOR) warps onto the interior's doormat.
  const GYM_LOT = { x: 12, y: 2, w: 6, h: 4 }, GYM_DOOR = { x: 15, y: 5 }, GYM_MAT = { x: 5, y: 13 };
  function stampGym(rows) {
    const out = rows.slice();
    for (let y = GYM_LOT.y; y < GYM_LOT.y + GYM_LOT.h; y++) {
      out[y] = out[y].slice(0, GYM_LOT.x) + 'B'.repeat(GYM_LOT.w) + out[y].slice(GYM_LOT.x + GYM_LOT.w);
    }
    const sy = GYM_DOOR.y, sx = GYM_LOT.x - 1;
    out[sy] = out[sy].slice(0, sx) + 'I' + out[sy].slice(sx + 1);
    return out;
  }
  // A town carries three civic buildings besides its gym: a depot, a mart and a
  // story hub. They stand in the same slots in every town, so the main line
  // reads the same from town to town: the depot on the west side under the
  // gym, the story hub below it, and the mart opposite the hub.
  const CIVIC_SLOTS = {
    depot: { x: 1, y: 6, w: 5, h: 3, door: 2 },
    hub: { x: 1, y: 11, w: 6, h: 4, door: 2 },
    mart: { x: 13, y: 11, w: 4, h: 4, door: 1 },
  };
  // The signpost that stands beside each door.
  const CIVIC_POSTS = {
    depot: { x: 6, y: 8 },
    hub: { x: 7, y: 14 },
    mart: { x: 12, y: 14 },
  };
  // The three interiors of every town from Steamspring Village up. Each one is
  // a walled room with a doormat at the bottom centre: the player lands on the
  // mat coming in and steps down onto it to go back out.
  const CIVIC = {
    SteamspringVillage: {
      depot: {
        id: 'SteamspringDepot', name: 'STEAMSPRING DEPOT',
        post: 'STEAMSPRING DEPOT\nTired trains sleep here.',
        style: 'depot', sign: 'DEPOT',
        floor: 'wood', wallTint: '#e0c8b0', music: 'depot', mat: [5, 7],
        rows: [
          'WWWWWWWWWWW',
          'p...H....Qp',
          '...NNNNN...',
          '...........',
          '.h.......h.',
          '.t...e...t.',
          '...........',
          '.....M.....',
        ],
      },
      mart: {
        id: 'SteamspringMart', name: 'STEAMSPRING MART',
        post: 'STEAMSPRING MART\nCoal biscuits and brass polish.',
        style: 'mart', sign: 'MART',
        floor: 'tile', wallTint: '#e8dcc0', music: 'depot', mat: [3, 7],
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
      },
      hub: {
        id: 'SteamspringMuseum', name: 'TRAIN MUSEUM',
        post: 'TRAIN MUSEUM\nTwo hundred years of steam, under glass.',
        style: 'station', sign: 'MUSEUM',
        floor: 'wood', wallTint: '#e8d8b4', music: 'piston', mat: [5, 9],
        rows: [
          'WWWWWWWWWWWW',
          'KKe......K.K',
          '............',
          '..e..w..e...',
          '............',
          '...NNNN.....',
          '............',
          '..G......e..',
          '............',
          '.....M......',
        ],
      },
    },
    DieselDen: {
      depot: {
        id: 'DieselDepot', name: 'DIESEL DEN DEPOT',
        post: 'DIESEL DEN DEPOT\nGrease first, talk later.',
        style: 'depot', sign: 'DEPOT',
        floor: 'tile', wallTint: '#b8b0a8', music: 'depot', mat: [5, 7],
        rows: [
          'WWWWWWWWWWW',
          'p...H....Qp',
          '...NNNNN...',
          '...........',
          '.r.......r.',
          '.r...O...r.',
          '...........',
          '.....M.....',
        ],
      },
      mart: {
        id: 'DieselMart', name: 'DIESEL DEN MART',
        post: 'DIESEL DEN MART\nGaskets, wheels and a little oil.',
        style: 'mart', sign: 'MART',
        floor: 'tile', wallTint: '#c8b8a0', music: 'depot', mat: [3, 7],
        rows: [
          'WWWWWWWW',
          'EE.EEEEE',
          '.n......',
          '.n......',
          '.n......',
          '.E.E....',
          '..E.E...',
          '...M....',
        ],
      },
      hub: {
        id: 'DieselModShop', name: 'MODIFICATION SHOP',
        post: 'MODIFICATION SHOP\nBring a tired engine. Leave with a hungry one.',
        style: 'lab', sign: 'MODS',
        floor: 'tile', wallTint: '#c0b8a8', music: 'depot', mat: [5, 8],
        rows: [
          'WWWWWWWWWWWW',
          'ZZ......r.ZZ',
          '............',
          '..r..Z..r...',
          '............',
          'O..........O',
          '............',
          '............',
          '.....M......',
        ],
      },
    },
    MaglevHeights: {
      depot: {
        id: 'MaglevDepot', name: 'MAGLEV HEIGHTS DEPOT',
        post: 'MAGLEV HEIGHTS DEPOT\nCurrent, patience and a clear sky.',
        style: 'depot', sign: 'DEPOT',
        floor: 'tile', wallTint: '#dce8f4', music: 'depot', mat: [5, 7],
        rows: [
          'WWWWWWWWWWW',
          'p...H....Qp',
          '...NNNNN...',
          '...........',
          '.h...G...h.',
          '.t...Z...t.',
          '...........',
          '.....M.....',
        ],
      },
      mart: {
        id: 'MaglevMart', name: 'MAGLEV HEIGHTS MART',
        post: 'MAGLEV HEIGHTS MART\nMagnetic pads and rail dust.',
        style: 'mart', sign: 'MART',
        floor: 'tile', wallTint: '#d0e0f0', music: 'depot', mat: [3, 7],
        rows: [
          'WWWWWWWW',
          'EE.EEEEE',
          '.n......',
          '.n......',
          '.n......',
          '..E.E.E.',
          '..E.E..E',
          '...M....',
        ],
      },
      hub: {
        id: 'MaglevInstitute', name: 'WEATHER INSTITUTE',
        post: 'WEATHER INSTITUTE\nThey read the sky for the whole line.',
        style: 'lab', sign: 'WEATHER',
        floor: 'tile', wallTint: '#c8dcec', music: 'lab', mat: [5, 9],
        rows: [
          'WWWWWWWWWWWW',
          'ZG......G.ZZ',
          '............',
          '..w..Z..w...',
          '............',
          '...NNNN.....',
          '............',
          '............',
          '............',
          '.....M......',
        ],
      },
    },
    GhostRailGraveyard: {
      depot: {
        id: 'GraveyardDepot', name: 'THE RESTING HALL',
        post: 'THE RESTING HALL\nEvery engine that stops for good comes here.',
        style: 'depot', sign: 'DEPOT',
        floor: 'wood', wallTint: '#8a8098', music: 'depot', mat: [5, 7],
        // TODO(art): the resting hall wants candle and lantern props; crates
        // and barrels stand in until those exist.
        rows: [
          'WWWWWWWWWWW',
          'p...H....Qp',
          '...NNNNN...',
          '...........',
          '.r.......r.',
          '.O.......O.',
          '...........',
          '.....M.....',
        ],
      },
      mart: {
        id: 'GraveyardMart', name: 'RELIC MART',
        post: 'RELIC MART\nGhost rails, ghost prices.',
        style: 'mart', sign: 'RELICS',
        floor: 'wood', wallTint: '#7a7088', music: 'depot', mat: [3, 7],
        rows: [
          'WWWWWWWW',
          'EE.EEEEE',
          '.n......',
          '.n......',
          '.n......',
          '.p....p.',
          '....E.E.',
          '...M....',
        ],
      },
      hub: {
        id: 'GhostSanctuary', name: 'GHOST RAIL SANCTUARY',
        post: 'GHOST RAIL SANCTUARY\nThe old singers still sing here.',
        style: 'station', sign: 'SANCTUARY',
        floor: 'wood', wallTint: '#6a6080', carpetTint: '#3a2a4a', music: 'route1', mat: [5, 9],
        // TODO(art): the sanctuary wants a candle prop and a mourning train
        // model; the wheel display and crates stand in until they exist.
        rows: [
          'WWWWWWWWWWWW',
          'K..........K',
          '............',
          '..e..w..e...',
          '............',
          '...NNNN.....',
          '............',
          '..r..O..r...',
          '............',
          '.....M......',
        ],
      },
    },
    NuclearStation: {
      depot: {
        id: 'NuclearDepot', name: 'NUCLEAR STATION DEPOT',
        post: 'NUCLEAR STATION DEPOT\nContainment is holding.',
        style: 'depot', sign: 'DEPOT',
        floor: 'tile', wallTint: '#d0e0c8', music: 'depot', mat: [5, 7],
        rows: [
          'WWWWWWWWWWW',
          'p...H....Qp',
          '...NNNNN...',
          '...........',
          '.h...Z...h.',
          '.Z...Z...Z.',
          '...........',
          '.....M.....',
        ],
      },
      mart: {
        id: 'NuclearMart', name: 'NUCLEAR STATION MART',
        post: 'NUCLEAR STATION MART\nEverything behind a locked cabinet.',
        style: 'mart', sign: 'MART',
        floor: 'tile', wallTint: '#c8dcc4', music: 'depot', mat: [3, 7],
        rows: [
          'WWWWWWWW',
          'EE.EEEEE',
          '.n......',
          '.n......',
          '.n......',
          '..E.E...',
          '.p..E.E.',
          '...M....',
        ],
      },
      hub: {
        id: 'NuclearLab', name: 'NUCLEAR RESEARCH LAB',
        post: 'NUCLEAR RESEARCH LAB\nThe core is stable. That is the whole job.',
        style: 'lab', sign: 'RESEARCH',
        floor: 'tile', wallTint: '#c0d8b8', music: 'lab', mat: [5, 9],
        rows: [
          'WWWWWWWWWWWW',
          'ZQ......Q.ZZ',
          '............',
          '..Z..G..Z...',
          '............',
          '...NNNN.....',
          '............',
          '..Z..Z..Z...',
          '............',
          '.....M......',
        ],
      },
    },
    MonorailMountaintop: {
      depot: {
        id: 'SummitDepot', name: 'SUMMIT DEPOT',
        post: 'SUMMIT DEPOT\nMind the ice on the platform.',
        style: 'depot', sign: 'DEPOT',
        floor: 'wood', wallTint: '#e8eef4', music: 'depot', mat: [5, 7],
        rows: [
          'WWWWWWWWWWW',
          'p...H....Qp',
          '...NNNNN...',
          '...........',
          '.h...e...h.',
          '.t.......t.',
          '...........',
          '.....M.....',
        ],
      },
      mart: {
        id: 'SummitMart', name: 'SUMMIT MART',
        post: 'SUMMIT MART\nWhat climbers need, at what climbers can pay.',
        style: 'mart', sign: 'MART',
        floor: 'tile', wallTint: '#e0e8f0', music: 'depot', mat: [3, 7],
        rows: [
          'WWWWWWWW',
          'EE.EEEEE',
          '.n......',
          '.n......',
          '.n......',
          '....E.E.',
          '..p.E.E.',
          '...M....',
        ],
      },
      hub: {
        id: 'SummitStation', name: 'MONORAIL SUMMIT STATION',
        post: 'MONORAIL SUMMIT STATION\nOne beam, and the mountain is a straight line.',
        style: 'station', sign: 'SUMMIT',
        floor: 'tile', wallTint: '#dce6f0', carpetTint: '#4a7ab0', music: 'route1', mat: [5, 9],
        rows: [
          'WWWWWWWWWWWW',
          'ZG......G.ZZ',
          '............',
          '..w.cccc.w..',
          '............',
          '...NNNN.....',
          '............',
          '............',
          '............',
          '.....M......',
        ],
      },
    },
  };
  // Until story text defines residents or a count, reserve two generic home
  // lots in Steamspring without assigning owners or plot.
  const STEAMSPRING_HOMES = [
    { id: 'SteamspringHomeA', label: 'WEST HOUSE', sign: 'WEST HOUSE', x: 12, y: 7, postX: 12, door: 1, style: 'house' },
    { id: 'SteamspringHomeB', label: 'EAST HOUSE', sign: 'EAST HOUSE', x: 16, y: 7, postX: 18, door: 1, style: 'houseTeal' },
  ];
  const STEAMSPRING_HOME_ROWS = [
    'WWWWWWWW',
    'W......W',
    'W......W',
    'W......W',
    'W......W',
    'W......W',
    'W......W',
    '....M...',
  ];
  // Write a building footprint into the town rows.
  function stampBuilding(rows, b) {
    for (let y = b.y; y < b.y + b.h; y++) {
      rows[y] = rows[y].slice(0, b.x) + 'B'.repeat(b.w) + rows[y].slice(b.x + b.w);
    }
  }
  // Write a signpost into the town rows.
  function stampSign(rows, x, y) {
    rows[y] = rows[y].slice(0, x) + 'I' + rows[y].slice(x + 1);
  }
  // Add a town's three civic interiors. Each one gets a door on the town and a
  // room inside whose doormat warps back to that same door.
  function addCivic(townId, spec, rows, buildings, warps, signs) {
    for (const kind of ['depot', 'mart', 'hub']) {
      const room = spec[kind], slot = CIVIC_SLOTS[kind], post = CIVIC_POSTS[kind];
      const b = { x: slot.x, y: slot.y, w: slot.w, h: slot.h, door: slot.door, style: room.style, sign: room.sign, label: room.name };
      stampBuilding(rows, b);
      stampSign(rows, post.x, post.y);
      buildings.push(b);
      const dx = b.x + b.door, dy = b.y + b.h - 1;
      warps.push({ x: dx, y: dy, to: room.id, tx: room.mat[0], ty: room.mat[1], dir: 'up' });
      signs.push({ x: post.x, y: post.y, text: room.post });
      D(room.id, {
        name: room.name, indoor: true, floor: room.floor, wallTint: room.wallTint, carpetTint: room.carpetTint, music: room.music,
        rows: room.rows,
        warps: [{ x: room.mat[0], y: room.mat[1], to: townId, tx: dx, ty: dy, dir: 'down' }],
      });
    }
  }
  function addSteamspringHomes(rows, buildings, warps, signs) {
    for (const home of STEAMSPRING_HOMES) {
      const b = { x: home.x, y: home.y, w: 3, h: 3, door: home.door, style: home.style, sign: home.sign, label: home.label };
      stampBuilding(rows, b);
      buildings.push(b);
      stampSign(rows, home.postX, 10);
      signs.push({ x: home.postX, y: 10, text: home.label + '\nA home in Steamspring Village.' });
      const dx = b.x + b.door, dy = b.y + b.h - 1;
      warps.push({ x: dx, y: dy, to: home.id, tx: 4, ty: 7, dir: 'up' });
      D(home.id, {
        name: home.label, indoor: true, floor: 'wood', wallTint: '#e0d0b8', music: 'harbor',
        rows: STEAMSPRING_HOME_ROWS,
        warps: [{ x: 4, y: 7, to: 'SteamspringVillage', tx: dx, ty: dy, dir: 'down' }],
      });
    }
  }
  function addTown(id, name, theme, route, direction, nextRoute, gym) {
    const rows = gym ? stampGym(makeOutdoorRows(theme)) : makeOutdoorRows(theme);
    const connections = {};
    connections[direction] = { map: route, offset: 0 };
    if (nextRoute) connections[direction === 'south' ? 'north' : 'south'] = { map: nextRoute, offset: 0 };
    const signs = [{ x: 7, y: 10, text: name + '\nA station on the Locomotia main line.' }];
    const buildings = [], warps = [];
    if (gym) {
      buildings.push(Object.assign({ style: 'gym', door: GYM_DOOR.x - GYM_LOT.x, label: gym.name }, GYM_LOT));
      warps.push({ x: GYM_DOOR.x, y: GYM_DOOR.y, to: gym.map, tx: GYM_MAT.x, ty: GYM_MAT.y, dir: 'up' });
      signs.push({ x: GYM_LOT.x - 1, y: GYM_DOOR.y, text: gym.sign });
    }
    if (CIVIC[id]) addCivic(id, CIVIC[id], rows, buildings, warps, signs);
    if (id === 'SteamspringVillage') addSteamspringHomes(rows, buildings, warps, signs);
    D(id, {
      name, music: theme === 'snow' || theme === 'haunted' ? 'route1' : 'harbor',
      base: theme === 'coast' ? 'sand' : theme === 'industrial' ? 'cobble' : 'grass',
      rows,
      connections,
      buildings,
      warps,
      signs,
    });
    if (gym) {
      D(gym.map, {
        name: gym.name, indoor: true, floor: gym.floor, wallTint: gym.wallTint, carpetTint: gym.carpetTint, music: 'gym',
        rows: gym.rows,
        warps: [{ x: GYM_MAT.x, y: GYM_MAT.y, to: id, tx: GYM_DOOR.x, ty: GYM_DOOR.y, dir: 'down' }],
      });
    }
  }

  // Gym interiors, one layout per Station Master. The leader stands on the
  // carpet at the top; the doormat is at the bottom centre.
  const GYMS = {
    VoltageCity: {
      map: 'VoltageGym', name: 'VOLTAGE CITY GYM', floor: 'tile', wallTint: '#d8d8c0', carpetTint: '#c8a020',
      sign: 'VOLTAGE CITY GYM\nSTATIONMASTER: ENGINEER SPARK\nThe future runs on current!',
      rows: [
        'WWWWWWWWWWW',
        'ZQ..ccc..QZ',
        '....ccc....',
        'ZZZZ...ZZZZ',
        '...........',
        '.ZZZZ.ZZZZ.',
        '...........',
        'ZZZ.ZZZ.ZZZ',
        '...........',
        '.Z.Z...Z.Z.',
        '...........',
        'p.........p',
        '...........',
        '.....M.....',
      ],
    },
    SteamspringVillage: {
      map: 'BoilerGym', name: 'STEAMSPRING GYM', floor: 'wood', wallTint: '#e0c8b0', carpetTint: '#7a2a3a',
      sign: 'STEAMSPRING VILLAGE GYM\nSTATIONMASTER: CONDUCTOR EMBER\nTradition under pressure.',
      rows: [
        'WWWWWWWWWWW',
        'ek..ccc..ke',
        '....ccc....',
        '.kk.....kk.',
        '...........',
        'kkk.kkk.kkk',
        '...........',
        '.e.......e.',
        '...........',
        'kkkk...kkkk',
        '...........',
        'O.........O',
        '...........',
        '.....M.....',
      ],
    },
    DieselDen: {
      map: 'PistonGym', name: 'DIESEL DEN GYM', floor: 'tile', wallTint: '#b8b0a8', carpetTint: '#c86a20',
      sign: 'DIESEL DEN GYM\nSTATIONMASTER: BOSS TORQUE\nHorsepower is earned, not given.',
      rows: [
        'WWWWWWWWWWW',
        'ZZ..ccc..ZZ',
        '....ccc....',
        'rrr.....rrr',
        '...rr.rr...',
        '...........',
        'OO.rrrrr.OO',
        '...........',
        '.rrr...rrr.',
        '...........',
        'rr.O...O.rr',
        '...........',
        '...........',
        '.....M.....',
      ],
    },
    MaglevHeights: {
      map: 'LevitationGym', name: 'MAGLEV HEIGHTS GYM', floor: 'tile', wallTint: '#dce8f4', carpetTint: '#3a5a8a',
      sign: 'MAGLEV HEIGHTS GYM\nSTATIONMASTER: SKY CAPTAIN ARIA\nLeave friction behind.',
      rows: [
        'WWWWWWWWWWW',
        'G...ccc...G',
        '....ccc....',
        '  ..   ..  ',
        ' ......... ',
        '.. ..... ..',
        '...  .  ...',
        ' ...   ... ',
        '...........',
        '  .. . ..  ',
        '...........',
        'p.........p',
        '...........',
        '.....M.....',
      ],
    },
    GhostRailGraveyard: {
      map: 'SpecterGym', name: 'GHOST RAIL GYM', floor: 'wood', wallTint: '#8a8098', carpetTint: '#3a2a4a',
      sign: 'GHOST RAIL GYM\nSTATIONMASTER: PHANTOM CONDUCTOR RAVEN\nThe last train never left.',
      rows: [
        'WWWWWWWWWWW',
        'K...ccc...K',
        '....ccc....',
        '.r.r...r.r.',
        '...........',
        'O.rr.O.rr.O',
        '...........',
        '.r.r.r.r.r.',
        '...........',
        'rr.rr.rr.rr',
        '...........',
        'O.........O',
        '...........',
        '.....M.....',
      ],
    },
    NuclearStation: {
      map: 'FusionGym', name: 'NUCLEAR STATION GYM', floor: 'tile', wallTint: '#d0e0c8', carpetTint: '#3a6a2a',
      sign: 'NUCLEAR STATION GYM\nSTATIONMASTER: DOCTOR ATOM\nPower held in balance.',
      rows: [
        'WWWWWWWWWWW',
        'QZ..ccc..ZQ',
        '....ccc....',
        'ZZZ.ZZZ.ZZZ',
        '...........',
        '.Q.......Q.',
        'ZZ.ZZ.ZZ.ZZ',
        '...........',
        'Z.ZZZ.ZZZ.Z',
        '...........',
        '.Z.......Z.',
        '...........',
        '...........',
        '.....M.....',
      ],
    },
    MonorailMountaintop: {
      map: 'SummitGym', name: 'SUMMIT GYM', floor: 'wood', wallTint: '#e8eef4', carpetTint: '#4a7ab0',
      sign: 'MONORAIL MOUNTAINTOP GYM\nSTATIONMASTER: MASTER ZEN\nOne beam. Perfect balance.',
      rows: [
        'WWWWWWWWWWW',
        ' p..ccc..p ',
        ' ...ccc... ',
        '  .......  ',
        '  .. . ..  ',
        ' ... . ... ',
        ' .. ... .. ',
        '..  ...  ..',
        '.. .. .. ..',
        '...........',
        ' ......... ',
        'p.........p',
        '...........',
        '.....M.....',
      ],
    },
  };
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
  addTown('VoltageCity', 'VOLTAGE CITY', 'city', 'Route2', 'south', 'Route3', GYMS.VoltageCity);
  addRoute('Route3', 'ROUTE 3 - VOLTAGE VALLEY', 'VoltageCity', 'Route4', 'city');
  addSpecial('VoltageValley', 'VOLTAGE VALLEY', 'city', null);
  addTown('SteamspringVillage', 'STEAMSPRING VILLAGE', 'historic', 'Route4', 'south', 'DieselDen', GYMS.SteamspringVillage);
  addRoute('Route4', 'ROUTE 4 - WHISTLESTOP WAY', 'Route3', 'SteamspringVillage', 'forest');
  addSpecial('WhistlestopForest', 'WHISTLESTOP FOREST', 'forest', null);
  addTown('DieselDen', 'DIESEL DEN', 'industrial', 'SteamspringVillage', 'south', 'Route5', GYMS.DieselDen);
  addRoute('Route5', 'ROUTE 5 - IRON MOUNTAIN', 'DieselDen', 'MaglevHeights', 'mountain');
  addSpecial('IronMountainRange', 'IRON MOUNTAIN RANGE', 'mountain', null);
  addTown('MaglevHeights', 'MAGLEV HEIGHTS', 'city', 'Route5', 'south', 'Route6', GYMS.MaglevHeights);
  addRoute('Route6', 'ROUTE 6 - THE OLD SIDING', 'MaglevHeights', 'GhostRailGraveyard', 'haunted');
  addTown('GhostRailGraveyard', 'GHOST RAIL GRAVEYARD', 'haunted', 'Route6', 'south', 'Route7', GYMS.GhostRailGraveyard);
  addSpecial('MysteryTower', 'MYSTERY TOWER', 'haunted', null);
  addRoute('Route7', 'ROUTE 7 - SUNSET DESERT', 'GhostRailGraveyard', 'NuclearStation', 'desert');
  addSpecial('SunsetDesert', 'SUNSET DESERT', 'desert', null);
  addTown('NuclearStation', 'NUCLEAR STATION', 'facility', 'Route7', 'south', 'Route8', GYMS.NuclearStation);
  addSpecial('PowerPlant', 'POWER PLANT', 'facility', null);
  addSpecial('RadioactiveCaves', 'RADIOACTIVE CAVES', 'facility', null);
  addRoute('Route8', 'ROUTE 8 - FROZEN TUNDRA', 'NuclearStation', 'MonorailMountaintop', 'snow');
  addSpecial('FrozenTundra', 'FROZEN TUNDRA', 'snow', null);
  addTown('MonorailMountaintop', 'MONORAIL MOUNTAINTOP', 'snow', 'Route8', 'south', null, GYMS.MonorailMountaintop);
  addSpecial('VictoryRoad', 'VICTORY ROAD', 'mountain', null);
  addSpecial('SpaceStation', 'SPACE STATION', 'city', null);
  addSpecial('WeatherInstitute', 'WEATHER RESEARCH INSTITUTE', 'city', null);
  addSpecial('TrainMuseum', 'TRAIN MUSEUM', 'historic', null);
  addSpecial('HotSprings', 'HOT SPRINGS', 'historic', null);
})(window.CD);
