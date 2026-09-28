// The START menu and its simple screens: trainer card, options and save.
// Party, bag and Traindex screens register themselves in CD.menu.screens.
(function (CD) {
  'use strict';
  const E = CD.engine, I = CD.input, U = CD.ui, F = CD.font;
  const P = CD.pal;

  const screens = {};   // name -> generator function opening that screen

  function fmtTime(frames) {
    const m = Math.floor(frames / 3600), h = Math.floor(m / 60);
    return h + ':' + String(m % 60).padStart(2, '0');
  }

  function* card() {
    const st = CD.state;
    const sc = { opaque: false, update(a) { if (a && (I.pressed.a || I.pressed.b)) { CD.audio.sfx('cancel'); this.done = true; } }, draw(s) {
      CD.overworld.drawWorld(s);
      U.frame(s, 12, 10, 216, 140, { paper: '#f4ecd8' });
      s.fill(16, 14, 208, 18, '#8b5230'); s.hline(16, 31, 208, P.brass);
      F.draw(s, 'CONDUCTOR PASS', 22, 20, P.cream, P.ink);
      F.drawRight(s, 'No. ' + String((st.name.charCodeAt(0) * 7919) % 100000).padStart(5, '0'), 218, 20, P.brassL);
      const rows = [['NAME', st.name], ['MONEY', '\x07' + st.money], ['TRAINDEX', Object.keys(st.dex.caught).length + ' caught'], ['TIME', fmtTime(st.frames)]];
      rows.forEach(([k, v], i) => { F.draw(s, k, 24, 42 + i * 14, '#8a6a52'); F.draw(s, v, 88, 42 + i * 14, P.ink); });
      const f = CD.chars.frames('player');
      s.blitScaled(f.down[0], 170, 38, 2);
      F.draw(s, 'RAIL BADGES', 24, 104, '#8a6a52');
      for (let i = 0; i < 8; i++) {
        const x = 26 + i * 24, y = 118;
        const got = st.badges[i];
        s.ellipse(x + 8, y + 8, 8, 8, got ? P.brassD : '#d8ccb4');
        s.ellipse(x + 8, y + 8, 6, 6, got ? P.brass : '#e8dcc4');
        if (got && CD.badges && CD.badges.draw) CD.badges.draw(s, got, x + 8, y + 8);
      }
    } };
    yield* E.run(sc);
  }

  function* options() {
    const st = CD.state;
    const speeds = ['slow', 'mid', 'fast'];
    for (;;) {
      const items = [
        'TEXT SPEED: ' + st.options.textSpeed.toUpperCase(),
        'SOUND: ' + (st.options.sound ? 'ON' : 'OFF'),
        'BATTLE ANIMS: ' + (st.options.battleAnims ? 'ON' : 'OFF'),
        'DONE',
      ];
      const r = yield* U.choose(items, { x: 60, y: 30, w: 150, cancel: 3 });
      if (r === 0) st.options.textSpeed = speeds[(speeds.indexOf(st.options.textSpeed) + 1) % 3];
      else if (r === 1) { st.options.sound = !st.options.sound; CD.audio.setMuted(!st.options.sound); }
      else if (r === 2) st.options.battleAnims = !st.options.battleAnims;
      else return;
    }
  }

  function* doSave() {
    const r = yield* U.ask('Would you like to save your journey?');
    if (r !== 0) return;
    const res = CD.save.save();
    if (res.ok) { CD.audio.sfx('save'); yield* U.say('{PLAYER} saved the journey!'); }
    else yield* U.say(res.error);
  }

  // A read-only bag listing; the party slice replaces it with a usable bag
  screens.bag = function* () {
    const ids = Object.keys(CD.state.bag).filter(k => CD.state.bag[k] > 0);
    if (!ids.length) { yield* U.say('The bag is empty.'); return; }
    const items = ids.map(k => CD.items.name(k) + '  \x08' + CD.state.bag[k]).concat(['CANCEL']);
    yield* U.choose(items, { x: 40, y: 8, w: 160 });
  };

  // A plain party summary; the party slice replaces it with the full screen
  screens.party = function* () {
    const items = CD.state.party.map(t => CD.train.name(t) + '  L' + t.level + '  ' + t.hp + '/' + t.stats.hp).concat(['CANCEL']);
    yield* U.choose(items, { x: 30, y: 8, w: 180 });
  };

  let last = 0;
  function* open() {
    CD.audio.sfx('select');
    for (;;) {
      const st = CD.state;
      const entries = [];
      if (st.flags.gotDex) entries.push(['TRAINDEX', screens.dex]);
      if (st.party.length) entries.push(['TRAINS', screens.party]);
      entries.push(['BAG', screens.bag]);
      entries.push([st.name, card]);
      entries.push(['SAVE', doSave]);
      entries.push(['OPTIONS', options]);
      entries.push(['EXIT', null]);
      const r = yield* U.choose(entries.map(e => e[0]), { x: 160, y: 4, w: 76, start: Math.min(last, entries.length - 1), cancel: entries.length - 1 });
      last = r;
      const fn = entries[r][1];
      if (!fn) return;
      const done = yield* fn();
      if (done === 'close') return;
    }
  }

  CD.menu = { open, screens, card, options, doSave, fmtTime };
})(window.CD);
