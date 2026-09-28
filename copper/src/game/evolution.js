// Evolution: the old and new forms flicker as silhouettes, faster and faster,
// until the new form holds. Pressing B during a level-up evolution stops it.
(function (CD) {
  'use strict';
  const { mix } = CD.gfx;
  const E = CD.engine, I = CD.input, U = CD.ui, T = CD.train;
  const SW = CD.gfx.W;

  function* run(t, into, forced) {
    const from = t.id;
    const oldName = T.name(t);
    let showNew = false, sil = 0, rays = 0, cancelled = false, t0 = 0;
    const sc = { opaque: true, update() {}, draw(s) {
      t0++;
      for (let y = 0; y < 112; y++) s.hline(0, y, SW, mix('#1a1430', '#3a2a58', y / 112));
      // slow rotating rays of light behind the train
      const cx = 120, cy = 58;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + t0 * 0.01;
        for (let r = 10; r < 150; r += 2) { const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8; if (y < 112) s.blend(x, y, '#f8e8b0', 0.25 * (1 - r / 150) * (0.5 + rays * 0.5)); }
      }
      const img = CD.trainArt.sprite(showNew ? into : from, 'front');
      s.blit(img, 88, 26, sil > 0 ? { tint: '#ffffff', tintA: sil } : undefined);
      s.fill(0, 112, SW, 48, CD.pal.ink);
    } };
    E.push(sc);
    CD.audio.music(null);
    yield* U.fadeIn(12);
    yield* U.say(`What? ${oldName} is evolving!`);
    CD.audio.music('evolve');
    // silhouette flicker: gap between swaps shrinks from 24 frames to 2
    yield* E.tween(20, v => { sil = v; rays = v; });
    let gap = 24, elapsed = 0;
    while (gap > 2) {
      for (let f = 0; f < gap; f++) {
        if (!forced && I.pressed.b) { cancelled = true; break; }
        yield;
      }
      if (cancelled) break;
      showNew = !showNew; elapsed += gap;
      gap = Math.max(2, Math.floor(gap * 0.86));
      if (gap <= 2 && elapsed > 200) break;
    }
    if (cancelled) {
      showNew = false;
      yield* E.tween(16, v => { sil = 1 - v; });
      CD.audio.music(null);
      yield* U.say(`Huh? ${oldName} stopped evolving!`);
      E.remove(sc);
      return false;
    }
    showNew = true;
    CD.fx.flash = 1;
    yield* E.tween(24, v => { CD.fx.flash = 1 - v; });
    yield* E.tween(24, v => { sil = 1 - v; });
    CD.audio.cry(into, CD.species.get(into).types[0]);
    CD.audio.jingle('evolved', null);
    const events = T.evolve(t, into);
    CD.state.dex.seen[into] = true; CD.state.dex.caught[into] = true;
    yield* U.say(`Congratulations! Your ${oldName} evolved into ${CD.species.get(into).name}!`);
    for (const e of events) yield* CD.battleScene.learnMove(t, e);
    yield* U.fadeOut(12);
    E.remove(sc);
    if (CD.overworld) CD.overworld.resume();
    yield* U.fadeIn(12);
    return true;
  }
  CD.evolution = { run };
})(window.CD);
