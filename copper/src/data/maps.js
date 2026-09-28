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
    connections: { south: { map: 'Route1', offset: 2 } },
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
      'p...H....Kp',
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
      'EE..EEEE',
      '........',
      'nn......',
      '...E..E.',
      '...E..E.',
      '........',
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
      '.r.r...r.r.',
      '...........',
      'rr.rr.rr.rr',
      '...........',
      '.r...r...r.',
      '...........',
      'rrr.rrr.rrr',
      '...........',
      'O.........O',
      '...........',
      '.....M.....',
    ],
    carpetTint: '#2f3f6a',
    warps: [{ x: 5, y: 13, to: 'CoalHarbor', tx: 18, ty: 9, dir: 'down' }],
  });
})(window.CD);
