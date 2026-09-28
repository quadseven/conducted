// The one game-state object. Everything a save file needs lives here; runtime-only
// things (the scene stack, walkers in motion, open menus) live elsewhere.
(function (CD) {
  'use strict';
  const VERSION = 1;

  function fresh() {
    return {
      version: VERSION,
      name: 'ALEX', rivalName: 'BLAKE',
      map: 'PlayerHouse2F', x: 3, y: 4, dir: 'down',
      flags: {},          // story flags: gotStarter, beatRival1, ...
      vars: {},
      party: [],          // train instances (see train.js)
      box: [],            // depot storage
      bag: {},            // itemId -> count
      money: 3000,
      badges: [],         // badge ids in order earned
      dex: { seen: {}, caught: {} },
      trainers: {},       // trainer id -> true once beaten
      items: {},          // picked-up field items by map:x:y
      options: { textSpeed: 'mid', sound: true, battleAnims: true },
      frames: 0,          // play time in frames
      lastHeal: { map: 'PlayerHouse1F', x: 3, y: 5 },
      stepCount: 0,
    };
  }

  CD.state = fresh();
  CD.freshState = fresh;   // pure: builds a new state object without installing it
  CD.newState = () => { CD.state = fresh(); return CD.state; };
  CD.STATE_VERSION = VERSION;
})(window.CD);
