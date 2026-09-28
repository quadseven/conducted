// Title screen and the new-game introduction with Professor Cypress.
(function (CD) {
  'use strict';
  const { Surface, mix, shade, hash2 } = CD.gfx;
  const E = CD.engine, I = CD.input, U = CD.ui, F = CD.font;
  const P = CD.pal;
  const SW = CD.gfx.W, SH = CD.gfx.H;

  // ---------- painted backdrop: dusk over the hills, a railway in the foreground ----------
  let backdrop = null;
  function paintBackdrop() {
    const s = new Surface(SW * 2, SH);
    for (let y = 0; y < SH; y++) {
      const t = y / 110;
      const c = t < 0.55 ? mix('#2a2a5a', '#c8607a', t / 0.55) : mix('#c8607a', '#f0b070', Math.min(1, (t - 0.55) / 0.45));
      for (let x = 0; x < s.w; x++) {
        let cc = c;
        if (y < 60 && hash2(x, y, 5) > 0.994) cc = '#fff8e0';
        s.px(x, y, cc);
      }
    }
    // far hills, near hills (tileable across the doubled width)
    const ridge = (x, base, amp, f1, f2) => base - amp * (0.5 + 0.3 * Math.sin(x * f1) + 0.2 * Math.sin(x * f2 + 1.3));
    for (let x = 0; x < s.w; x++) {
      const w = (Math.PI * 2) / s.w;
      const h1 = ridge(x, 104, 26, w * 2, w * 5), h2 = ridge(x, 118, 20, w * 3, w * 7);
      for (let y = Math.floor(h1); y < SH; y++) s.px(x, y, y < h1 + 2 ? '#8a6a8a' : '#6a4a72');
      for (let y = Math.floor(h2); y < SH; y++) s.px(x, y, y < h2 + 2 ? '#5a6a5a' : '#3f5048');
    }
    // embankment and track
    for (let x = 0; x < s.w; x++) {
      for (let y = 128; y < SH; y++) s.px(x, y, y < 131 ? '#6a7a4a' : hash2(x, y, 9) < 0.2 ? '#4a4038' : '#5a5046');
      if (x % 6 < 3) s.fill(x, 136, 1, 6, '#3a2a22');
      s.px(x, 135, '#c8ccd4'); s.px(x, 136, '#6a7280'); s.px(x, 141, '#c8ccd4'); s.px(x, 142, '#6a7280');
    }
    return s;
  }

  let steamini = null;
  function logo(s, x, y) {
    const text = 'CONDUCTED';
    const k = 3;
    const w = F.measure(text) * k + (text.length - 1);
    const x0 = Math.round(x - w / 2);
    // shadow, outline, then a copper gradient fill row by row
    for (const [dx, dy, c] of [[2, 3, '#1a1030'], [-1, 0, P.ink], [1, 0, P.ink], [0, -1, P.ink], [0, 1, P.ink], [1, 1, P.ink]]) F.drawBig(s, text, x0 + dx, y + dy, k, c);
    const tmp = new Surface(w + 4, 7 * k + 2);
    F.drawBig(tmp, text, 0, 0, k, '#ffffff');
    for (let yy = 0; yy < tmp.h; yy++) for (let xx = 0; xx < tmp.w; xx++) {
      if (!(tmp.data[yy * tmp.w + xx] >>> 24)) continue;
      const t = yy / (7 * k);
      let c = t < 0.35 ? mix('#fff0c8', '#f0a860', t / 0.35) : mix('#e08848', '#9a4a2a', (t - 0.35) / 0.65);
      if ((yy % k) === 0 && t < 0.5) c = shade(c, 0.15);
      s.px(x0 + xx, y + yy, c);
    }
  }

  const title = {
    opaque: true,
    t: 0,
    enter() { CD.audio.music('title'); this.t = 0; this.state = 'press'; },
    tick() { this.t++; },
    update(active) {
      this.t++;
      if (!active) return;
      if (this.state === 'press' && (I.pressed.start || I.pressed.a)) { CD.audio.sfx('select'); this.result = true; this.done = true; }
    },
    draw(s) {
      if (!backdrop) backdrop = paintBackdrop();
      if (!steamini) steamini = CD.trainArt.sprite(1, 'back');
      const off = Math.floor(this.t * 0.35) % (SW * 2);
      s.blit(backdrop, -off, 0); s.blit(backdrop, SW * 2 - off, 0);
      // the train crosses the screen, then comes round again
      const tx = ((this.t * 0.9) % (SW + 140)) - 70;
      const bob = Math.round(Math.sin(this.t * 0.4));
      s.blit(steamini, Math.round(tx), 83 + bob);
      for (let i = 0; i < 6; i++) {
        const age = (this.t + i * 11) % 66;
        const px = tx + 22 - age * 1.2, py = 86 - age * 0.6;
        s.ellipseA(px, py, 2.5 + age * 0.12, 2 + age * 0.08, '#fff8f0', Math.max(0, 0.8 - age / 70));
      }
      logo(s, SW / 2, 16);
      F.drawCenter(s, 'COPPER VERSION', SW / 2, 44, P.brassL, P.ink);
      if ((this.t >> 5) % 2 === 0) F.drawCenter(s, 'PRESS START', SW / 2, 150, P.cream, P.ink);
      F.draw(s, 'v1', 3, 151, '#b89878');
    },
  };

  // ---------- name entry ----------
  class NameEntry {
    constructor(prompt, def) {
      this.prompt = prompt; this.name = ''; this.def = def;
      this.rows = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ-', 'abcdefghi', 'jklmnopqr', 'stuvwxyz.'];
      this.cx = 0; this.cy = 0; this.max = 8;
    }
    update(active) {
      if (!active) return;
      const R = this.rows.length + 1;
      if (I.repeat.up) { this.cy = (this.cy + R - 1) % R; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.cy = (this.cy + 1) % R; CD.audio.sfx('cursor'); }
      if (I.repeat.left) { this.cx = (this.cx + 8) % 9; CD.audio.sfx('cursor'); }
      if (I.repeat.right) { this.cx = (this.cx + 1) % 9; CD.audio.sfx('cursor'); }
      if (I.pressed.b) { this.name = this.name.slice(0, -1); CD.audio.sfx('cancel'); }
      if (I.pressed.start) { this.finish(); return; }
      if (I.pressed.a) {
        if (this.cy === this.rows.length) { this.finish(); return; }
        if (this.name.length < this.max) { this.name += this.rows[this.cy][this.cx]; CD.audio.sfx('select'); if (this.name.length === this.max) { this.cy = this.rows.length; } }
      }
    }
    finish() { CD.audio.sfx('select'); this.result = this.name.trim() || this.def; this.done = true; }
    draw(s) {
      s.clear(P.paper2);
      U.frame(s, 8, 6, 224, 34);
      F.draw(s, this.prompt, 18, 12, P.ink);
      const shown = this.name + ((CD.frame >> 4) % 2 ? '_' : ' ');
      F.draw(s, shown, 18, 25, P.copperD);
      U.frame(s, 8, 44, 224, 110);
      this.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) F.draw(s, r[x], 30 + x * 22, 54 + y * 14, P.ink); });
      F.draw(s, 'END', 30, 54 + this.rows.length * 14, P.ink);
      F.draw(s, 'B: erase   START: done', 110, 54 + this.rows.length * 14, '#8a7a6a');
      if (this.cy === this.rows.length) U.cursor(s, 22, 54 + this.rows.length * 14);
      else U.cursor(s, 22 + this.cx * 22, 54 + this.cy * 14);
    }
  }

  // ---------- the introduction ----------
  function stage(drawFn) { const sc = { opaque: true, draw: drawFn, update() {} }; E.push(sc); return sc; }
  function* intro() {
    const bg = s => {
      for (let y = 0; y < SH; y++) s.hline(0, y, SW, mix('#f4ead0', '#d8c8a0', y / SH));
      for (let x = 0; x < SW; x += 2) s.px(x, 108, '#c8b890');
    };
    let who = 'cypress', train = 0, slide = 0;
    const sc = stage(s => {
      bg(s);
      if (who) {
        const f = CD.chars.frames(who);
        CD.gfx.shadow(s, 120, 104, 18, 5, 0.25);
        s.blitScaled(f.down[0], 120 - 24 + slide, 44, 3);
      }
      if (train) { CD.gfx.shadow(s, 190, 104, 22, 4, 0.2); s.blit(CD.trainArt.sprite(train, 'front'), 158, 46); }
    });
    CD.audio.music('lab');
    yield* U.fadeIn(20);
    const S = t => U.say(t, { speaker: 'PROF. CYPRESS' });
    yield* S('Welcome to the world of Locomotia! This land is home to remarkable creatures called trains: living beings of steam, steel, and spirit.');
    train = 1; CD.audio.cry(1, 'STEAM');
    yield* S("Trains aren't mere machines here. They're born from the ancient Rails of Power, and each one has its own personality, dreams, and fighting spirit!");
    yield* S('People who bond with these trains are called Conductors. We raise them, battle alongside them, and journey together across this great land.');
    train = 0;
    yield* S('Your grandfather... he was the greatest Conductor Locomotia has ever known. His partner train, Old Iron, saved us all during the Great Derailment.');
    yield* S('But enough about the old days. Tell me about yourself. What is your name?');
    const nm = yield* E.run(new NameEntry('YOUR NAME?', 'ALEX'));
    CD.state.name = nm;
    yield* S('{PLAYER}! What a fine name. Your grandfather always believed that trains and humans were meant to be partners, equals on the journey of life.');
    yield* S('Your very own train legend is about to unfold! A new chapter in the great story of Locomotia begins with you!');
    // shrink away into the bedroom
    CD.audio.sfx('stairs');
    yield* U.fadeOut(24, '#000000');
    E.remove(sc);
  }

  CD.title = { scene: title, intro, NameEntry };
})(window.CD);
