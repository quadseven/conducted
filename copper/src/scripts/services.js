// Depot nurses, storage terminals and mart clerks, placed on their maps.
(function (CD) {
  'use strict';
  const W = CD.world, U = CD.ui;
  const map = id => W.maps[id];

  map('HarborDepot').npcs = [
    { id: 'hdNurse', sprite: 'nurse', x: 5, y: 1, dir: 'down', move: 'still', talk: function* (n) { yield* CD.town.nurse(n, { map: 'HarborDepot', x: 5, y: 4 }); } },
    { id: 'hdGent', sprite: 'oldman', x: 8, y: 5, dir: 'left', move: 'look', text: 'Trains that run out of steam aren\'t gone for good. The depot here can get any engine running again.' },
    { id: 'hdLass', sprite: 'lass', look: { hair: '#2a2a30', shirt: '#6aa8d8' }, x: 2, y: 3, move: 'wander', range: 1, text: 'You can store extra trains in the depot terminal and swap them out whenever you visit.' },
  ];
  map('HarborDepot').interact = (x, y, cell) => {
    if (cell && cell.ch === 'Q') return CD.town.storage();
    if (cell && cell.ch === 'H') return U.say('The restoration bay hums quietly. Its lamps glow a warm amber.');
    return null;
  };
  map('HarborMart').npcs = [
    { id: 'hmClerk', sprite: 'clerk', x: 0, y: 3, dir: 'right', move: 'still', talk: function* () {
      yield* CD.town.mart(['trainball', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'burnheal', 'awakening', 'repel']);
    } },
    { id: 'hmShopper', sprite: 'granny', x: 5, y: 3, move: 'wander', range: 1, text: 'SUPER POTIONS are dear, but they get a tired train back on the rails in no time.' },
  ];
  map('HarborMart').interact = (x, y, cell) => cell && cell.ch === 'E' ? U.say('Shelves of polish, spare bolts and tins of coal biscuits for trains.') : null;
})(window.CD);
