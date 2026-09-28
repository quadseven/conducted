// Boot: title -> (continue | new game with intro) -> overworld. Also the page
// layout that sizes the canvas and the touch controller for any screen.
(function (CD) {
  'use strict';
  const E = CD.engine, U = CD.ui, O = CD.overworld;

  function* startNew() {
    CD.newState();
    yield* CD.title.intro();
    O.enterMap('PlayerHouse2F', 3, 4, 'down', { quiet: true });
    E.push(O.scene);
    yield* U.fadeIn(24);
  }
  function* continueGame() {
    const r = CD.save.load();
    if (!r.ok) { yield* U.say(r.error); return false; }
    CD.audio.setMuted(!CD.state.options.sound);
    yield* U.fadeOut(12);
    O.enterMap(CD.state.map, CD.state.x, CD.state.y, CD.state.dir, { quiet: false });
    E.push(O.scene);
    yield* U.fadeIn(16);
    return true;
  }
  function* flow() {
    for (;;) {
      const t = CD.title.scene;
      t.done = false;
      E.push(t);
      while (!t.done) yield;
      const has = CD.save.exists();
      const items = has ? ['CONTINUE', 'NEW GAME', 'OPTIONS'] : ['NEW GAME', 'OPTIONS'];
      let pick;
      for (;;) {
        const r = yield* U.choose(items, { x: 80, y: 88, w: 80, cancel: 'none' });
        pick = items[r];
        if (pick === 'OPTIONS') { yield* CD.menu.options(); continue; }
        if (pick === undefined) { pick = null; }
        break;
      }
      if (!pick) { E.remove(t); continue; }
      if (pick === 'CONTINUE') {
        const s = CD.save.summary();
        const r = yield* U.ask(`Continue as ${s.name}? ${s.badges.length} badge(s), ${CD.menu.fmtTime(s.frames)} played.`);
        if (r !== 0) { E.remove(t); continue; }
        E.remove(t);
        if (yield* continueGame()) return;
        continue;
      }
      if (pick === 'NEW GAME' && has) {
        const r = yield* U.ask('Start a new journey? Your saved game stays until you save over it.');
        if (r !== 0) { E.remove(t); continue; }
      }
      yield* U.fadeOut(20);
      E.remove(t);
      yield* startNew();
      return;
    }
  }

  // ---------- page layout ----------
  function layout() {
    const canvas = document.getElementById('screen');
    const pad = document.getElementById('pad');
    const touch = document.documentElement.classList.contains('touch');
    const W = CD.gfx.W, H = CD.gfx.H;
    const vw = window.innerWidth, vh = window.innerHeight;
    let scale, x, y;
    if (touch) {
      pad.hidden = false;
      const portrait = vh >= vw;
      document.body.classList.toggle('portrait', portrait);
      document.body.classList.toggle('landscape', !portrait);
      if (portrait) {
        scale = Math.min(vw / W, (vh * 0.56) / H);
        const s2 = Math.floor(scale);
        if (s2 >= 2 && s2 >= scale * 0.86) scale = s2;
        x = (vw - W * scale) / 2; y = Math.max(8, Math.min(40, vh * 0.04));
      } else {
        scale = Math.min((vw - 300) / W, (vh - 16) / H);
        x = (vw - W * scale) / 2; y = (vh - H * scale) / 2;
      }
    } else {
      pad.hidden = true;
      scale = Math.max(1, Math.floor(Math.min((vw - 24) / W, (vh - 64) / H)));
      x = (vw - W * scale) / 2; y = Math.max(12, (vh - 40 - H * scale) / 2);
    }
    canvas.style.width = Math.round(W * scale) + 'px';
    canvas.style.height = Math.round(H * scale) + 'px';
    canvas.style.left = Math.round(x) + 'px';
    canvas.style.top = Math.round(y) + 'px';
    document.documentElement.style.setProperty('--screen-bottom', Math.round(y + H * scale) + 'px');
  }

  function boot() {
    const canvas = document.getElementById('screen');
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window) document.documentElement.classList.add('touch');
    CD.input.bindKeyboard(window);
    CD.input.bindTouch(document);
    CD.onError = (e, name) => { console.error('script error in', name, e); };
    E.spawn(flow(), 'flow');
    E.startBrowser(canvas, layout);
    // any first gesture unlocks audio
    const unlock = () => CD.audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  CD.main = { boot, flow, startNew, continueGame, layout };
  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('screen')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
})(window.CD);
