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

  // The depot of every town on the line. The nurse heals the party and the
  // terminal keeps stored trains; the second hand is a placeholder for the
  // dialogue and quests still to come.
  const DEPOTS = {
    SteamspringDepot: {
      nurse: 'ssNurse', hand: 'ssHand', sprite: 'worker', dir: 'right',
      text: 'Old Iron passed through here, you know. Conductor Ember still keeps its firebox lit.',
    },
    DieselDepot: {
      nurse: 'ddNurse', hand: 'ddHand', sprite: 'worker', dir: 'right',
      text: 'Diesel Den builds the engines everyone else takes credit for. Grease first, talk later.',
    },
    MaglevDepot: {
      nurse: 'mhNurse', hand: 'mhHand', sprite: 'aide', dir: 'right',
      text: 'Maglev trains have no wheels. They need current, patience and a very clear sky.',
    },
    GraveyardDepot: {
      nurse: 'ggNurse', hand: 'ggHand', sprite: 'oldman', dir: 'right',
      text: 'Rest them here. Every engine that stops for good comes to the Graveyard eventually, and I see them in.',
    },
    NuclearDepot: {
      nurse: 'nsNurse', hand: 'nsHand', sprite: 'aide', dir: 'right',
      text: 'Containment is holding. Doctor Atom checks it twice a day, and the checks are not the boring part.',
    },
    SummitDepot: {
      nurse: 'mtNurse', hand: 'mtHand', sprite: 'oldman', dir: 'right',
      text: 'One beam, and the mountain becomes a straight line. Mind the ice on the platform.',
    },
  };
  for (const mapId of Object.keys(DEPOTS)) {
    const staff = DEPOTS[mapId];
    map(mapId).npcs = [
      { id: staff.nurse, sprite: 'nurse', x: 5, y: 1, dir: 'down', move: 'still',
        talk: function* (n) { yield* CD.town.nurse(n, { map: mapId, x: 5, y: 3 }); } },
      { id: staff.hand, sprite: staff.sprite, x: 2, y: 3, dir: staff.dir, move: 'look', text: staff.text },
    ];
    map(mapId).interact = (x, y, cell) => {
      if (cell && cell.ch === 'Q') return CD.town.storage();
      if (cell && cell.ch === 'H') return U.say('The restoration bay hums quietly. Its lamps glow a warm amber.');
      return null;
    };
  }

  // The mart of every town on the line. The clerk opens the shop; the other
  // shopper is a placeholder for the dialogue and quests still to come.
  const MARTS = {
    SteamspringMart: {
      clerk: 'ssClerk', shopper: 'ssShopper', sprite: 'youngster', dir: 'left',
      text: 'Do you think a steam train can outrun an electric one? Papa says never, but he says that about everything.',
      stock: ['trainball', 'potion', 'antidote', 'burnheal', 'parlyzheal', 'awakening'],
      shelves: 'Shelves of coal biscuits, brass polish and a tin of coal oil that smells like a whole hillside.',
    },
    DieselMart: {
      clerk: 'ddClerk', shopper: 'ddShopper', sprite: 'youngster', dir: 'left',
      text: 'Boss Torque says horsepower is earned. I have earned six kinds of grease and still no horsepower.',
      stock: ['trainball', 'greatball', 'potion', 'superpotion', 'antidote', 'burnheal', 'parlyzheal', 'awakening', 'repel'],
      shelves: 'Shelves of gaskets, grinding wheels and spare couplings in every size but the one you need.',
    },
    MaglevMart: {
      clerk: 'mhClerk', shopper: 'mhShopper', sprite: 'lass', dir: 'left',
      text: 'They say the Weather Institute can call the lightning down onto the beam. I asked them not to. They laughed.',
      stock: ['trainball', 'greatball', 'potion', 'superpotion', 'fullheal', 'antidote', 'burnheal', 'parlyzheal', 'awakening', 'repel'],
      shelves: 'Shelves of magnetic pads, rail dust and coils that hum when the shop is quiet.',
    },
    GraveyardMart: {
      clerk: 'ggClerk', shopper: 'ggShopper', sprite: 'granny', dir: 'left',
      text: 'Ghost rails, ghost prices. What you carry out of here is your own trouble.',
      stock: ['trainball', 'greatball', 'potion', 'superpotion', 'fullheal', 'repel', 'escape'],
      shelves: 'Shelves of salvaged fittings, each one with the name of the engine it came off.',
    },
    NuclearMart: {
      clerk: 'nsClerk', shopper: 'nsShopper', sprite: 'worker', dir: 'left',
      text: 'Cave shifts pay double. Nobody will tell you what we bring back up, and nobody who went down has asked.',
      stock: ['trainball', 'greatball', 'ultraball', 'potion', 'superpotion', 'fullheal', 'revive'],
      shelves: 'Shelves of lead-lined cases, and a locked cabinet with a warning nobody in the station will explain.',
    },
    SummitMart: {
      clerk: 'mtClerk', shopper: 'mtShopper', sprite: 'sailor', dir: 'left',
      text: 'The summit mart stocks what climbers need and charges what climbers can pay.',
      stock: ['trainball', 'greatball', 'ultraball', 'potion', 'superpotion', 'fullheal', 'revive', 'repel', 'escape'],
      shelves: 'Shelves of storm gear, hot tea tins and blankets that smell of the last twenty people who used them.',
    },
  };
  for (const mapId of Object.keys(MARTS)) {
    const staff = MARTS[mapId];
    map(mapId).npcs = [
      { id: staff.clerk, sprite: 'clerk', x: 0, y: 3, dir: 'right', move: 'still',
        talk: function* () { yield* CD.town.mart(staff.stock); } },
      { id: staff.shopper, sprite: staff.sprite, x: 5, y: 4, dir: staff.dir, move: 'look', text: staff.text },
    ];
    map(mapId).interact = (x, y, cell) => cell && cell.ch === 'E' ? U.say(staff.shelves) : null;
  }
})(window.CD);
