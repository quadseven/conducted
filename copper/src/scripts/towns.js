// The story hubs of the towns on the line and the people who wait in them.
// Every line here is a placeholder: the hubs exist so the dialogue and quests
// written later have a room, a prop and somebody to talk to.
(function (CD) {
  'use strict';
  const W = CD.world, U = CD.ui;
  const map = id => W.maps[id];

  // The people in each story hub. The first stands behind the counter, the
  // second waits in the room.
  const HUBS = {
    SteamspringMuseum: [
      { id: 'ssCurator', sprite: 'oldman', x: 4, y: 4, dir: 'down', move: 'still',
        text: 'The Train Museum. Two hundred years of steam, all under glass. Mind the case on your left, the Big Boiler cracked in the Great Derailment.' },
      { id: 'ssStudent', sprite: 'aide', x: 8, y: 6, dir: 'left', move: 'look',
        text: 'Fossil prints. An engine walked this coast before rails were ever laid. The museum keeps them in the back room.' },
    ],
    DieselModShop: [
      { id: 'ddTuner', sprite: 'worker', x: 4, y: 4, dir: 'down', move: 'still',
        text: 'Bring me a tired engine and I will give you a hungry one. That is the whole trade, and nobody else will tell you that.' },
      { id: 'ddBrawler', sprite: 'grunt', x: 8, y: 6, dir: 'left', move: 'look',
        text: 'Word is there is a fighting ring under the foundry. The foreman says there is not. The foreman also says the trains are clean.' },
    ],
    MaglevInstitute: [
      { id: 'mhScientist', sprite: 'aide', x: 4, y: 4, dir: 'down', move: 'still',
        text: 'Pressure falling, wind turning north. There will be a storm over the Heights before the light goes.' },
      { id: 'mhAssistant', sprite: 'aide', look: { hair: '#8a6ab0' }, x: 8, y: 6, dir: 'left', move: 'look',
        text: 'The maps here are drawn in magnetic ink. Touch the wrong plate and the whole sky lights up.' },
    ],
    GhostSanctuary: [
      { id: 'ggKeeper', sprite: 'granny', x: 4, y: 4, dir: 'down', move: 'still',
        text: 'The old singers still run the evening service. Come back at dusk and bring a lamp. We have candles, but they are not what you want.' },
      { id: 'ggFinder', sprite: 'youngster', x: 8, y: 6, dir: 'left', move: 'look',
        text: 'I found a lantern in the sidings with a name on it. The name was scratched off. I did not scratch it off.' },
    ],
    NuclearLab: [
      { id: 'nsScientist', sprite: 'aide', x: 4, y: 4, dir: 'down', move: 'still',
        text: 'The core is stable. That is the whole job, and it is the hardest job in Locomotia.' },
      { id: 'nsApprentice', sprite: 'youngster', x: 8, y: 6, dir: 'left', move: 'look',
        text: 'Doctor Atom says the reactor sings in A flat. I say it screams. We are not allowed to argue in front of it.' },
    ],
    SummitStation: [
      { id: 'mtMonk', sprite: 'oldman', x: 4, y: 4, dir: 'down', move: 'still',
        text: 'Master Zen trains above the clouds. Listen long enough and you can hear the beam hum in the snow.' },
      { id: 'mtPilgrim', sprite: 'youngster', x: 8, y: 6, dir: 'left', move: 'look',
        text: 'I came to see the Champion. They say the Champion does not come down. They say a lot of things.' },
    ],
  };
  for (const mapId of Object.keys(HUBS)) map(mapId).npcs = HUBS[mapId];

  // What each prop in a story hub has to say for itself.
  const HUB_PROPS = {
    SteamspringMuseum: {
      e: 'A model of the express that opened the coast line. The paint is chipped where children have poked it.',
      w: 'A driving wheel from Old Iron herself, if the curator is to be believed.',
      K: 'Ledgers of every engine that ran out of Steamspring, including the ones that never made it.',
      G: 'A globe with the old coast line drawn in red ink, before the line was rerouted.',
    },
    DieselModShop: {
      Z: 'A lathe the size of a barn. It turns an axle true enough to sing.',
      r: 'Crates of spare couplings, each one tagged with the engine it came off.',
      O: 'A barrel of the stuff the foundry calls its perfume.',
    },
    MaglevInstitute: {
      G: 'A globe wrapped in isobars. The needle follows the front.',
      w: 'An anemometer from the old summit station. It still reads, badly.',
      Z: 'The barograph, ticking away at the weather like a patient.',
      Q: 'A terminal of half-read forecasts, each one crossed out when it came true.',
    },
    GhostSanctuary: {
      K: 'Books of names, one page for every engine laid to rest here.',
      e: 'A mourning train, black-lacquered, with its headlamps dimmed.',
      w: 'A wheel from the last train that never left the graveyard.',
      r: 'Crates of offerings: coal oil, coal biscuits and coal for fires that are not lit.',
      O: 'A barrel of tar, kept for a ceremony nobody remembers.',
    },
    NuclearLab: {
      Q: 'A terminal of readings, all in a green that means nothing has gone wrong yet.',
      Z: 'The containment model, a glass sphere with a glow that never quite settles.',
      G: 'A globe with the reactor marked in the middle and the caves in red.',
    },
    SummitStation: {
      G: 'A globe with only one line on it: the beam, running straight to the top.',
      w: 'The summit counterweight, a wheel of polished stone.',
      c: 'A runner of blue carpet, kept clean for the day the Champion comes down.',
    },
  };
  for (const mapId of Object.keys(HUB_PROPS)) {
    const props = HUB_PROPS[mapId];
    map(mapId).interact = (x, y, cell) => (cell && props[cell.ch]) ? U.say(props[cell.ch]) : null;
  }

  // The one person waiting outside each town, ready to be replaced by the
  // dialogue and quests that the towns still owe.
  const TOWNS = {
    SteamspringVillage: { id: 'ssGreeter', sprite: 'granny', x: 7, y: 7, dir: 'down',
      text: 'Steam trains are the only ones with a heart, my mother always said. Conductor Ember would tell you the same, if you caught her between fittings.' },
    DieselDen: { id: 'ddGreeter', sprite: 'worker', x: 12, y: 7, dir: 'left',
      text: 'Keep your hoods shut and your ears open. The foundry runs all night and the trains do not care for sleepers.' },
    MaglevHeights: { id: 'mhGreeter', sprite: 'aide', x: 7, y: 9, dir: 'down',
      text: 'Welcome to the Heights. Mind the gap. It is not a gap, it is four hundred metres of air, but it does not feel like one.' },
    GhostRailGraveyard: { id: 'ggGreeter', sprite: 'oldman', x: 12, y: 9, dir: 'left',
      text: 'Walk quiet past the sidings. The trains that rest here were not switched off. They were called in.' },
    NuclearStation: { id: 'nsGreeter', sprite: 'aide', x: 17, y: 11, dir: 'left',
      text: 'Station rules: no running, no shouting, and no touching anything that glows.' },
    MonorailMountaintop: { id: 'mtGreeter', sprite: 'granny', x: 12, y: 13, dir: 'left',
      text: 'I walked the whole line to see the summit. The view is worth every step of it.' },
  };
  for (const town of Object.keys(TOWNS)) {
    const greeter = TOWNS[town];
    map(town).npcs = (map(town).npcs || []).concat([Object.assign({ move: 'look' }, greeter)]);
  }
})(window.CD);
