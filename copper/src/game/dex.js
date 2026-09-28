// The Traindex: a list of all 151 species (seen, caught, or unknown) and an entry
// page with the sprite, classification, size and description.
(function (CD) {
  'use strict';
  const E = CD.engine, I = CD.input, U = CD.ui, F = CD.font;
  const P = CD.pal;
  const TOTAL = 151;

  function counts() { const d = CD.state.dex; return { seen: Object.keys(d.seen).length, caught: Object.keys(d.caught).length }; }

  function* entry(id) {
    const sp = CD.species.get(id);
    const caught = !!CD.state.dex.caught[id];
    CD.audio.cry(id, sp.types[0]);
    const sc = { opaque: true, update(a) { if (a && (I.pressed.a || I.pressed.b)) { CD.audio.sfx('cancel'); this.done = true; } }, draw(s) {
      s.clear('#b8584a');
      for (let y = 0; y < 160; y += 3) s.hline(0, y, 240, '#a84e42');
      U.frame(s, 4, 4, 88, 84, { paper: '#eef2f6' });
      s.blit(CD.trainArt.sprite(id, 'front'), 16, 12);
      U.frame(s, 96, 4, 140, 84);
      F.draw(s, 'No.' + String(id).padStart(3, '0'), 104, 11, P.copperD);
      F.draw(s, sp.name, 104, 24, P.ink);
      if (sp.dex) {
        F.draw(s, sp.dex.cls.toUpperCase(), 104, 37, '#6a5a4a');
        F.draw(s, 'HT ' + (caught ? sp.dex.ht.toFixed(1) + ' m' : '??? m'), 104, 52, P.ink);
        F.draw(s, 'WT ' + (caught ? sp.dex.wt + ' kg' : '??? kg'), 104, 64, P.ink);
      }
      let x = 104; for (const t of sp.types) x += CD.partyScreen.typeChip(s, x, 74, t) + 3;
      U.frame(s, 4, 92, 232, 64);
      const text = caught && sp.dex ? sp.dex.text : 'Catch this train to learn more about it.';
      F.wrap(text, 214).slice(0, 4).forEach((ln, i) => F.draw(s, ln, 12, 101 + i * 13, P.ink));
    } };
    yield* E.run(sc);
  }

  class DexList {
    constructor() { this.i = DexList.last || 0; this.opaque = true; }
    update(a) {
      if (!a) return;
      if (I.repeat.up) { this.i = (this.i + TOTAL - 1) % TOTAL; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.i = (this.i + 1) % TOTAL; CD.audio.sfx('cursor'); }
      if (I.repeat.left) { this.i = Math.max(0, this.i - 8); CD.audio.sfx('cursor'); }
      if (I.repeat.right) { this.i = Math.min(TOTAL - 1, this.i + 8); CD.audio.sfx('cursor'); }
      if (I.pressed.a) { const id = this.i + 1; if (CD.state.dex.seen[id]) { DexList.last = this.i; this.result = id; this.done = true; } else CD.audio.sfx('bump'); }
      if (I.pressed.b) { CD.audio.sfx('cancel'); DexList.last = this.i; this.result = 0; this.done = true; }
    }
    draw(s) {
      s.clear('#b8584a');
      for (let y = 0; y < 160; y += 3) s.hline(0, y, 240, '#a84e42');
      U.frame(s, 4, 4, 128, 152);
      const top = Math.max(0, Math.min(this.i - 5, TOTAL - 11));
      for (let r = 0; r < 11; r++) {
        const id = top + r + 1, y = 12 + r * 13;
        const seen = CD.state.dex.seen[id], caught = CD.state.dex.caught[id];
        F.draw(s, String(id).padStart(3, '0'), 20, y, '#8a7a6a');
        if (caught) { s.ellipse(44, y + 3, 3, 3, P.ink); s.ellipse(44, y + 3, 2, 2, P.copper); }
        F.draw(s, seen ? CD.species.get(id).name : '----------', 52, y, seen ? P.ink : '#a09080');
        if (id - 1 === this.i) U.cursor(s, 12, y);
      }
      U.frame(s, 136, 4, 100, 100, { paper: '#eef2f6' });
      const id = this.i + 1;
      if (CD.state.dex.seen[id]) s.blit(CD.trainArt.sprite(id, 'front'), 154, 18, CD.state.dex.caught[id] ? undefined : { silhouette: '#5a5068' });
      else F.drawCenter(s, '?', 186, 50, '#a09080');
      const c = counts();
      U.frame(s, 136, 108, 100, 48);
      F.draw(s, 'SEEN', 146, 118, P.ink); F.drawRight(s, String(c.seen), 226, 118, P.ink);
      F.draw(s, 'OWNED', 146, 136, P.ink); F.drawRight(s, String(c.caught), 226, 136, P.ink);
    }
  }
  function* open() {
    for (;;) {
      const id = yield* E.run(new DexList());
      if (!id) return;
      yield* entry(id);
    }
  }

  CD.dexScreen = { open, entry, counts, DexList };
  if (CD.menu) CD.menu.screens.dex = open;
})(window.CD);
