// The battle screen. A battle is one script: transition in, introductions, then
// turns until the rules in battle.js say it is over. Each turn's events are played
// back here with text, HP bar drains, move effects, faints and EXP.
(function (CD) {
  'use strict';
  const { Surface, mix, shade, hash2 } = CD.gfx;
  const E = CD.engine, I = CD.input, U = CD.ui, F = CD.font, B = CD.battle, T = CD.train;
  const P = CD.pal;
  const SW = CD.gfx.W, SH = CD.gfx.H;

  // ---------- backdrops ----------
  const bgCache = {};
  function backdrop(kind) {
    if (bgCache[kind]) return bgCache[kind];
    const s = new Surface(SW, 112);
    const sky = { grass: ['#a8d0e8', '#e8f0e0'], yard: ['#d8a878', '#f0d8b0'], gym: ['#c8d0dc', '#e8e4dc'], town: ['#b8d8f0', '#f0ecdc'] }[kind] || ['#a8d0e8', '#e8f0e0'];
    for (let y = 0; y < 112; y++) s.hline(0, y, SW, mix(sky[0], sky[1], Math.min(1, y / 70)));
    if (kind === 'gym') {
      // harbor gym: timber wall with round windows onto the bay, plank floor
      s.fill(0, 0, SW, 54, '#8a6a4a');
      for (let x = 0; x < SW; x += 12) s.vline(x, 0, 54, '#7a5a3a');
      for (let i = 0; i < 4; i++) { const cx = 30 + i * 60; s.ellipse(cx, 24, 12, 12, P.brass); s.ellipse(cx, 24, 10, 10, '#6aa8d8'); s.fill(cx - 10, 26, 21, 8, '#3f7cb0'); s.hline(cx - 9, 27, 19, '#8cc3e2'); }
      for (let y = 54; y < 112; y++) for (let x = 0; x < SW; x++) s.px(x, y, (y >> 2) % 2 ? '#c89464' : (x + (y >> 2) * 7) % 24 === 0 ? '#9a6a44' : '#d4a070');
      s.hline(0, 54, SW, '#5f3f28');
    } else {
      // hills and a ground plane
      for (let x = 0; x < SW; x++) {
        const h = 44 + Math.sin(x * 0.03) * 6 + Math.sin(x * 0.011 + 1) * 8;
        for (let y = Math.floor(h); y < 70; y++) s.px(x, y, kind === 'yard' ? '#8a7a6a' : y < h + 2 ? '#8ab878' : '#7aa868');
      }
      for (let y = 60; y < 112; y++) for (let x = 0; x < SW; x++) {
        const n = hash2(x, y, 5);
        let c = kind === 'yard' ? (n < 0.25 ? P.ballastD : n > 0.8 ? P.ballastL : P.ballast) : kind === 'town' ? (n < 0.1 ? P.cobbleD : P.cobble) : (n < 0.08 ? P.grassD : n > 0.95 ? P.grassL : P.grass);
        s.px(x, y, c);
      }
      if (kind === 'yard') for (const ry of [74, 96]) { for (let x = 0; x < SW; x += 5) s.fill(x, ry - 2, 2, 7, P.sleeper); s.hline(0, ry, SW, P.steelL); s.hline(0, ry + 3, SW, P.steelL); }
    }
    bgCache[kind] = s;
    return s;
  }
  // The stage a train stands on: a round ballast bed with a length of track
  function platform(s, cx, cy, rx, ry, kind) {
    const top = kind === 'gym' ? '#b88a5a' : kind === 'yard' ? P.ballastL : kind === 'town' ? P.cobbleL : '#98c878';
    s.ellipse(cx, cy + 2, rx, ry, shade(top, -0.35));
    s.ellipse(cx, cy, rx, ry, top);
    s.ellipse(cx, cy - 1, rx - 4, ry - 3, shade(top, 0.08));
    for (let x = -rx + 8; x < rx - 8; x += 5) s.fill(cx + x, cy - 3, 2, 6, P.sleeper);
    s.hline(cx - rx + 6, cy - 2, rx * 2 - 12, P.steelL); s.hline(cx - rx + 6, cy + 2, rx * 2 - 12, P.steelL);
  }

  // ---------- HUD ----------
  function hpColor(frac) { return frac > 0.5 ? P.hpGreen : frac > 0.2 ? P.hpYellow : P.hpRed; }
  function hpBar(s, x, y, w, frac) {
    s.fill(x - 1, y - 1, w + 2, 5, P.ink);
    s.fill(x, y, w, 3, '#4a4458');
    const f = Math.max(0, Math.min(1, frac));
    const fw = Math.ceil(w * f);
    if (fw > 0) { s.fill(x, y, fw, 3, hpColor(f)); s.hline(x, y, fw, shade(hpColor(f), 0.35)); }
  }
  const STATUS_TAG = { brn: ['BRN', '#e0603a'], par: ['PAR', '#d8b030'], psn: ['PSN', '#a060c8'], slp: ['SLP', '#8a8a9a'] };
  function statusTag(s, x, y, st) {
    if (!st || !STATUS_TAG[st]) return;
    const [t, c] = STATUS_TAG[st];
    s.fill(x, y, 18, 9, c); s.rect(x, y, 18, 9, P.ink); F.draw(s, t, x + 2, y + 1, P.white);
  }
  function hud(s, sc, si) {
    const t = sc.shown[si].t; if (!t || !sc.hudOn[si]) return;
    const player = si === 0;
    const x = player ? 124 + sc.hudSlide[si] : 6 - sc.hudSlide[si], y = player ? 74 : 6, w = 110, h = player ? 34 : 26;
    U.frame(s, x, y, w, h, { paper: P.paper });
    F.draw(s, T.name(t), x + 7, y + 6, P.ink);
    F.drawRight(s, 'L' + (sc.shown[si].level || t.level), x + w - 7, y + 6, P.ink);
    F.draw(s, 'HP', x + 7, y + 16, P.copperD);
    hpBar(s, x + 20, y + 17, w - 30, sc.shown[si].hp / t.stats.hp);
    statusTag(s, x + w - 30, y - 5, t.status);
    if (player) {
      F.drawRight(s, Math.ceil(sc.shown[si].hp) + '/' + t.stats.hp, x + w - 8, y + 22, P.ink);
      // EXP bar along the bottom edge
      s.fill(x + 6, y + h - 5, w - 12, 2, '#4a4458');
      s.fill(x + 6, y + h - 5, Math.round((w - 12) * sc.shown[si].exp), 2, P.exp);
    }
  }

  // ---------- the scene ----------
  class Scene {
    constructor(opts) {
      this.opts = opts;
      this.opaque = true;
      this.kind = opts.terrain || 'grass';
      this.shown = [{ t: null, hp: 0, exp: 0 }, { t: null, hp: 0, exp: 0 }];
      this.hudOn = [false, false];
      this.hudSlide = [0, 0];
      this.spr = [{ x: 0, y: 0, vis: false, flash: 0, sink: 0, scale: 1, alpha: 1 }, { x: 0, y: 0, vis: false, flash: 0, sink: 0, scale: 1, alpha: 1 }];
      this.trainerSpr = [{ vis: true, x: 0 }, { vis: !!opts.trainer, x: 0 }];
      this.fx = null;       // {anim, f, c}
      this.shake = 0;
      this.ball = null;     // thrown ball {x,y,shakeT}
      this.balls = null;    // party indicators
      this.t = 0;
    }
    update() {}
    tick() {}
    pos(si) {
      // centre of each train on screen (used by effects)
      return si === 0 ? { x: 60 + this.spr[0].x, y: 80 + this.spr[0].y } : { x: 182 + this.spr[1].x, y: 44 + this.spr[1].y };
    }
    draw(s) {
      this.t++;
      const sx = this.shake ? Math.round(Math.sin(this.t * 1.7) * this.shake) : 0;
      s.blit(backdrop(this.kind), sx, 0);
      s.fill(0, 112, SW, 48, P.ink);
      platform(s, 182 + sx, 66, 40, 9, this.kind);
      platform(s, 64 + sx, 106, 48, 10, this.kind);
      // enemy side
      const e = this.spr[1];
      if (this.trainerSpr[1].vis && this.opts.trainer) {
        const f = CD.chars.frames(this.opts.trainer.sprite, this.opts.trainer.look).down[0];
        s.blitScaled(f, 158 + this.trainerSpr[1].x + sx, 6, 3);
      }
      if (e.vis && this.shown[1].t) {
        const img = CD.trainArt.sprite(this.shown[1].t.id, 'front');
        const y = 7 + e.y + e.sink;
        const opt = { clipY: 70, flip: false };
        if (e.flash && (e.flash >> 1) % 2) opt.alpha = 0;
        if (e.alpha < 1) opt.tint = '#ffffff', opt.tintA = 1 - e.alpha;
        if (e.silhouette) opt.silhouette = '#3a3448';
        if (opt.alpha !== 0) s.blit(img, 150 + e.x + sx, y, opt);
      }
      // player side
      const p = this.spr[0];
      if (this.trainerSpr[0].vis) {
        const f = CD.chars.frames('player').up[0];
        s.blitScaled(f, 30 + this.trainerSpr[0].x + sx, 52, 3.4);
      }
      if (p.vis && this.shown[0].t) {
        const img = CD.trainArt.sprite(this.shown[0].t.id, 'back');
        const k = 1.25 * p.scale;
        const x = 64 - 32 * k + p.x + sx, y = 110 - 60 * k + p.y + p.sink;
        if (!(p.flash && (p.flash >> 1) % 2)) {
          if (p.alpha < 1) s.blitScaled(img, x, y, k, { tint: '#ffffff', tintA: 1 - p.alpha });
          else s.blitScaled(img, x, y, k);
        }
        s.fill(0, 112, SW, 48, P.ink);
      }
      if (this.ball) this.drawBall(s);
      if (this.fx) { const c = this.fx.c; this.fx.anim.draw(s, this.fx.f, c); }
      if (this.balls) this.drawPartyBalls(s);
      hud(s, this, 1); hud(s, this, 0);
      if (this.wipe !== undefined) this.drawWipe(s);
    }
    drawBall(s) {
      const b = this.ball;
      const x = Math.round(b.x), y = Math.round(b.y);
      const wob = b.wob ? Math.round(Math.sin(b.wob) * 2) : 0;
      s.ellipse(x + wob, y, 4.5, 4.5, P.ink);
      s.ellipse(x + wob, y, 3.6, 3.6, b.color || P.copper);
      s.fill(x - 3 + wob, y, 7, 4, '#e8e4dc'); s.hline(x - 4 + wob, y, 9, P.ink);
      s.ellipse(x + wob, y, 1.4, 1.4, P.white); s.px(x - 2 + wob, y - 2, P.cream);
    }
    drawPartyBalls(s) {
      const { side, list, slide } = this.balls;
      const y = side === 1 ? 30 : 100, x0 = side === 1 ? 14 - slide : 138 + slide;
      U.frame(s, x0 - 6, y - 7, 86, 15, { paper: P.paper2 });
      for (let i = 0; i < 6; i++) {
        const t = list[i], x = x0 + i * 12;
        const c = !t ? '#b8b0a0' : t.hp > 0 ? (t.status ? '#d8b030' : P.copper) : '#6a6070';
        s.ellipse(x + 3, y, 4, 4, P.ink); s.ellipse(x + 3, y, 3, 3, c);
      }
    }
    drawWipe(s) {
      // closing: rail-car bars slide in from alternating sides
      const n = 10, h = SH / n;
      for (let i = 0; i < n; i++) {
        const w = Math.round(SW * Math.min(1, Math.max(0, this.wipe * 1.6 - i * 0.06)));
        if (w <= 0) continue;
        const x = i % 2 ? SW - w : 0;
        s.fill(x, Math.floor(i * h), w, Math.ceil(h), P.ink);
        s.hline(x, Math.floor(i * h) + 2, w, '#3a2f48');
      }
    }
  }

  // ---------- menus drawn over the battle ----------
  class ActionMenu {
    constructor(sc, name) { this.sc = sc; this.name = name; this.i = ActionMenu.last || 0; }
    update(a) {
      if (!a) return;
      if (I.repeat.left || I.repeat.right) { this.i ^= 1; CD.audio.sfx('cursor'); }
      if (I.repeat.up || I.repeat.down) { this.i ^= 2; CD.audio.sfx('cursor'); }
      if (I.pressed.a) { CD.audio.sfx('select'); ActionMenu.last = this.i; this.result = this.i; this.done = true; }
    }
    draw(s) {
      U.frame(s, 4, 112, 232, 46);
      F.draw(s, 'What will', 12, 122, P.ink);
      F.draw(s, this.name + ' do?', 12, 137, P.ink);
      U.frame(s, 124, 112, 112, 46, { paper: P.cream });
      const labels = ['FIGHT', 'TRAINS', 'BAG', 'RUN'];
      labels.forEach((l, i) => { const x = 140 + (i % 2) * 50, y = 123 + (i >> 1) * 16; F.draw(s, l, x, y, P.ink); if (i === this.i) U.cursor(s, x - 8, y); });
    }
  }
  class MoveMenu {
    constructor(t) { this.t = t; this.i = Math.min(MoveMenu.last || 0, t.moves.length - 1); }
    update(a) {
      if (!a) return;
      const n = this.t.moves.length;
      const mv = d => { const j = this.i ^ d; if (j < n) { this.i = j; CD.audio.sfx('cursor'); } };
      if (I.repeat.left || I.repeat.right) mv(1);
      if (I.repeat.up || I.repeat.down) mv(2);
      if (I.pressed.b) { CD.audio.sfx('cancel'); this.result = -1; this.done = true; }
      else if (I.pressed.a) {
        if (this.t.moves[this.i].pp <= 0 && this.t.moves.some(m => m.pp > 0)) { CD.audio.sfx('bump'); this.noPP = 40; return; }
        CD.audio.sfx('select'); MoveMenu.last = this.i; this.result = this.i; this.done = true;
      }
      if (this.noPP) this.noPP--;
    }
    draw(s) {
      U.frame(s, 4, 112, 160, 46);
      this.t.moves.forEach((m, i) => { const x = 16 + (i % 2) * 74, y = 122 + (i >> 1) * 16; F.draw(s, m.name.toUpperCase(), x, y, P.ink); if (i === this.i) U.cursor(s, x - 8, y); });
      U.frame(s, 164, 112, 72, 46, { paper: P.cream });
      const m = this.t.moves[this.i], mv = CD.moves.get(m.name);
      if (this.noPP) { F.draw(s, 'No PP left!', 170, 128, P.red); return; }
      F.draw(s, 'PP', 172, 122, P.copperD); F.drawRight(s, m.pp + '/' + m.max, 228, 122, m.pp === 0 ? P.red : P.ink);
      s.fill(170, 136, 60, 12, CD.typeColor[mv.type]); s.rect(170, 136, 60, 12, P.ink);
      F.drawCenter(s, mv.type, 200, 139, P.white, shade(CD.typeColor[mv.type], -0.5));
    }
  }

  // ---------- playback helpers ----------
  function* msg(text, wait) {
    // battle text auto-advances after a pause; A skips ahead
    const tb = new U.TextBox(text, { auto: wait || 50 });
    tb.update = (function (orig) { return function (a) { if (this.shown >= this.pageText().join('').length && a && (I.pressed.a || I.pressed.b)) { this.done = true; return; } orig.call(this, a); }; })(tb.update);
    yield* E.run(tb);
  }
  function* hpTo(sc, si, to) {
    const t = sc.shown[si];
    const max = t.t.stats.hp;
    const step = Math.max(max / 45, 0.35);
    while (Math.abs(t.hp - to) > 0.01) {
      t.hp = t.hp > to ? Math.max(to, t.hp - step) : Math.min(to, t.hp + step);
      yield;
    }
    if (si === 0 && to > 0 && to <= max / 5) CD.audio.sfx('lowhp');
  }
  function* playFx(sc, animName, si, type) {
    if (!CD.state.options.battleAnims) return;
    const anim = CD.vfx.get(animName);
    const a = sc.pos(si), b = sc.pos(1 - si);
    const c = { a, b, dir: si === 0 ? 1 : -1, col: CD.typeColor[type] || '#ffffff' };
    sc.fx = { anim, f: 0, c };
    const spr = sc.spr[si];
    for (let f = 0; f < anim.len; f++) {
      sc.fx.f = f;
      if (anim.lunge) { const k = anim.lunge === 'dash' ? 16 : 10; const q = f < 6 ? f / 6 : f < 12 ? 1 - (f - 6) / 6 : 0; spr.x = c.dir * k * q; }
      if (anim.shake && f > 6) sc.shake = anim.shake;
      if (anim.flash && f === 8) CD.fx.flash = 0.5;
      if (CD.fx.flash > 0) CD.fx.flash = Math.max(0, CD.fx.flash - 0.1);
      yield;
    }
    spr.x = 0; sc.shake = 0; sc.fx = null; CD.fx.flash = 0;
  }
  function* blink(sc, si, frames) { const s = sc.spr[si]; for (let f = frames; f > 0; f--) { s.flash = f; yield; } s.flash = 0; }

  function* sendOut(sc, si, t, first) {
    sc.shown[si] = { t, hp: t.hp, exp: T.expProgress(t), level: t.level };
    const spr = sc.spr[si];
    // the ball arcs out and bursts open
    const from = si === 0 ? { x: 40, y: 70 } : { x: 200, y: 20 }, to = sc.pos(si);
    CD.audio.sfx('throw');
    yield* E.tween(18, v => { sc.ball = { x: from.x + (to.x - from.x) * v, y: from.y + (to.y - from.y) * v - Math.sin(v * Math.PI) * 20 }; });
    sc.ball = null;
    CD.audio.sfx('poof');
    spr.vis = true; spr.alpha = 0; spr.scale = 0.4;
    yield* E.tween(14, v => { spr.alpha = v; spr.scale = 0.4 + 0.6 * v; sc.fx = { anim: CD.vfx.FX.burst, f: Math.round(v * 12), c: { a: to, b: to, dir: 1, col: '#fff0c0' } }; });
    sc.fx = null; spr.alpha = 1; spr.scale = 1;
    CD.audio.cry(t.id, T.types(t)[0]);
    sc.hudOn[si] = true;
    yield* E.tween(10, v => { sc.hudSlide[si] = Math.round((1 - v) * 120); });
    yield* E.wait(6);
  }
  function* recall(sc, si) {
    const spr = sc.spr[si];
    CD.audio.sfx('poof');
    yield* E.tween(12, v => { spr.alpha = 1 - v; spr.scale = 1 - v * 0.6; });
    spr.vis = false; spr.alpha = 1; spr.scale = 1;
    sc.hudOn[si] = false;
  }

  // Play the events a turn produced
  function* play(sc, b, events) {
    for (const ev of events) {
      if (ev.t === 'text') yield* msg(ev.s);
      else if (ev.t === 'move') yield* playFx(sc, ev.anim, ev.side, ev.type);
      else if (ev.t === 'hit') {
        CD.audio.sfx(ev.eff > 1 ? 'hitsuper' : ev.eff < 1 ? 'hitweak' : 'hit');
        yield* blink(sc, ev.side, 16);
      } else if (ev.t === 'hp') yield* hpTo(sc, ev.side, ev.to);
      else if (ev.t === 'shake') { sc.shake = 2; yield* E.wait(12); sc.shake = 0; }
      else if (ev.t === 'stat') { CD.audio.sfx(ev.n > 0 ? 'statup' : 'statdown'); yield* playFx(sc, ev.n > 0 ? 'charge' : 'sparks', ev.side, ev.n > 0 ? 'ELECTRIC' : 'NUCLEAR'); }
      else if (ev.t === 'statusfx') { const fx = CD.vfx.STATUS_FX[ev.st]; if (fx) { const c = { a: sc.pos(ev.side), b: sc.pos(ev.side), dir: 1 }; sc.fx = { anim: fx, f: 0, c }; for (let f = 0; f < fx.len; f++) { sc.fx.f = f; yield; } sc.fx = null; } }
      else if (ev.t === 'status') { /* HUD reads the live status */ }
      else if (ev.t === 'faint') {
        const spr = sc.spr[ev.side];
        CD.audio.sfx('faint');
        yield* E.tween(22, v => { spr.sink = Math.round(v * 64); });
        spr.vis = false; spr.sink = 0; sc.hudOn[ev.side] = false;
      } else if (ev.t === 'exp') yield* expFill(sc, b, ev);
      else if (ev.t === 'recall') { if (sc.spr[ev.side].vis) yield* recall(sc, ev.side); }
      else if (ev.t === 'send') yield* sendOut(sc, ev.side, b.sides[ev.side].party[ev.idx]);
      else if (ev.t === 'ball') yield* throwBall(sc, b, ev.result);
    }
  }
  function* expFill(sc, b, ev) {
    const t = b.sides[0].party[ev.idx];
    const onField = b.sides[0].active === ev.idx && sc.shown[0].t === t;
    let lv = ev.before.level;
    const growth = CD.species.get(t.id).growth;
    // animate the bar level by level
    let exp = ev.before.exp;
    while (true) {
      const next = T.expAt(growth, lv + 1), base = T.expAt(growth, lv);
      const target = Math.min(ev.after.exp, next);
      if (onField) {
        const from = (exp - base) / (next - base), to = (target - base) / (next - base);
        const n = Math.max(6, Math.round((to - from) * 50));
        for (let i = 1; i <= n; i++) { sc.shown[0].exp = from + (to - from) * i / n; if (i % 3 === 0) CD.audio.sfx('expfill', i); yield; }
      }
      exp = target;
      if (target >= next && lv < ev.after.level) {
        lv++;
        if (onField) { sc.shown[0].level = lv; sc.shown[0].exp = 0; sc.shown[0].hp = Math.min(t.stats.hp, t.hp); }
        CD.audio.jingle('levelup');
        yield* msg(`${T.name(t)} grew to level ${lv}!`, 70);
        const learned = ev.events.filter(e => (e.kind === 'learn' || e.kind === 'full') && CD.species.get(t.id).learnset.some(l => l.level === lv && l.move === e.move));
        if (lv === ev.after.level && onField) yield* statBox(ev.before.stats, t.stats);
        for (const e of learned) yield* learnMove(t, e);
      } else break;
    }
    if (onField) sc.shown[0].hp = t.hp;
  }
  function* statBox(before, after) {
    const box = { draw(s) {
      U.frame(s, 132, 30, 104, 80, { paper: P.paper });
      [['MAX HP', 'hp'], ['ATTACK', 'atk'], ['DEFENSE', 'def'], ['SPEED', 'spd'], ['SPECIAL', 'spc']].forEach(([l, k], i) => {
        F.draw(s, l, 140, 38 + i * 13, P.ink);
        F.drawRight(s, String(after[k]), 204, 38 + i * 13, P.ink);
        F.drawRight(s, '+' + (after[k] - before[k]), 228, 38 + i * 13, P.copperD);
      });
    }, update(a) { if (a && (I.pressed.a || I.pressed.b)) this.done = true; } };
    yield* E.run(box);
  }
  // Teaching a move, asking which to forget when the list is full
  function* learnMove(t, e) {
    const nmT = T.name(t);
    if (e.kind === 'learn') { CD.audio.jingle('item'); yield* U.say(`${nmT} learned ${e.move.toUpperCase()}!`); return; }
    for (;;) {
      yield* U.say(`${nmT} wants to learn ${e.move.toUpperCase()}, but it already knows four moves.`);
      const r = yield* U.ask(`Forget a move to make room for ${e.move.toUpperCase()}?`);
      if (r === 0) {
        const pick = yield* U.choose(t.moves.map(m => m.name.toUpperCase()).concat(['CANCEL']), { x: 120, y: 30, w: 116, cancel: 4 });
        if (pick < 4) {
          const old = t.moves[pick].name;
          t.moves[pick] = T.moveSlot(e.move);
          yield* U.say(`1, 2 and... Poof! ${nmT} forgot ${old.toUpperCase()}, and learned ${e.move.toUpperCase()}!`);
          return;
        }
      }
      const r2 = yield* U.ask(`Stop learning ${e.move.toUpperCase()}?`);
      if (r2 === 0) { yield* U.say(`${nmT} did not learn ${e.move.toUpperCase()}.`); return; }
    }
  }

  function* throwBall(sc, b, res) {
    const to = sc.pos(1);
    CD.audio.sfx('throw');
    yield* E.tween(24, v => { sc.ball = { x: 50 + (to.x - 50) * v, y: 96 + (to.y - 96) * v - Math.sin(v * Math.PI) * 40 }; });
    CD.audio.sfx('poof');
    const spr = sc.spr[1];
    yield* E.tween(12, v => { spr.alpha = 1 - v; spr.scale = 1 - v; });
    spr.vis = false;
    yield* E.tween(10, v => { sc.ball = { x: to.x, y: to.y + v * 20 }; });
    for (let i = 0; i < res.shakes; i++) {
      yield* E.wait(20);
      CD.audio.sfx('shake');
      yield* E.tween(16, v => { sc.ball.wob = Math.sin(v * Math.PI * 2) * 2.2; });
      sc.ball.wob = 0;
    }
    yield* E.wait(20);
    if (res.caught) {
      sc.ball.color = '#8a8a9a';
      CD.audio.jingle('caught');
      yield* msg(`Gotcha! ${T.name(b.sides[1].party[0])} was coupled on!`, 110);
      return;
    }
    sc.ball = null;
    CD.audio.sfx('poof');
    spr.vis = true; spr.alpha = 1; spr.scale = 1;
    yield* msg(['Oh no! The train broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Shoot! It was so close, too!'][res.shakes]);
  }

  // ---------- party picker (switching in battle) ----------
  function* pickTrain(b, forced) {
    for (;;) {
      const r = yield* CD.partyScreen.pick({ title: forced ? 'Choose a train.' : 'Switch to which train?', cancel: !forced });
      if (r < 0) return -1;
      const t = CD.state.party[r];
      if (t.hp <= 0) { yield* U.say(`${T.name(t)} has no steam left!`); continue; }
      if (r === b.sides[0].active && !forced) { yield* U.say(`${T.name(t)} is already out!`); continue; }
      return r;
    }
  }

  // ---------- the battle script ----------
  // opts: { kind: 'wild'|'trainer', enemy: [trains], trainer: {name, cls, sprite, look, prize, defeat, items}, terrain, music }
  function* battle(opts) {
    const st = CD.state;
    const party = st.party;
    const b = B.create(party, opts.enemy, { kind: opts.kind, trainer: opts.trainer, terrain: opts.terrain, items: opts.trainer && opts.trainer.items });
    CD.lastBattle = b;
    const sc = new Scene(opts);
    // transition from the overworld
    CD.audio.music(opts.music || (opts.kind === 'trainer' ? 'trainer' : 'wild'));
    CD.audio.sfx('encounter');
    yield* U.flash(3, '#ffffff');
    const cover = { draw: s => sc.drawWipe(s), update() {} };
    sc.wipe = 0; E.push(cover);
    yield* E.tween(28, v => { sc.wipe = v; });
    E.remove(cover); sc.wipe = undefined;
    E.push(sc);
    for (const t of opts.enemy) st.dex.seen[t.id] = true;
    // slide in
    sc.shown[1].t = opts.kind === 'wild' ? opts.enemy[0] : null;
    sc.shown[1].hp = opts.enemy[0].hp;
    if (opts.kind === 'wild') { sc.spr[1].vis = true; sc.spr[1].silhouette = true; }
    sc.trainerSpr[0].x = 180; sc.trainerSpr[1].x = -180; sc.spr[1].x = -180;
    yield* E.tween(40, v => { const k = Math.round((1 - v) * 180); sc.trainerSpr[0].x = k; sc.trainerSpr[1].x = -k; sc.spr[1].x = -k; }, t => 1 - (1 - t) * (1 - t));
    sc.spr[1].silhouette = false;
    const lead = b.sides[0].active;
    if (opts.kind === 'wild') {
      CD.audio.cry(opts.enemy[0].id, T.types(opts.enemy[0])[0]);
      sc.hudOn[1] = true; sc.shown[1] = { t: opts.enemy[0], hp: opts.enemy[0].hp, exp: 0, level: opts.enemy[0].level };
      yield* msg(`A wild ${T.name(opts.enemy[0])} appeared!`, 70);
    } else {
      sc.balls = { side: 1, list: opts.enemy, slide: 0 };
      yield* msg(`${opts.trainer.cls ? opts.trainer.cls + ' ' : ''}${opts.trainer.name} wants to battle!`, 80);
      yield* E.tween(16, v => { sc.balls.slide = Math.round(v * 120); sc.trainerSpr[1].x = Math.round(v * 120); });
      sc.balls = null; sc.trainerSpr[1].vis = false;
      yield* msg(`${opts.trainer.name} sent out ${T.name(opts.enemy[0])}!`, 30);
      yield* sendOut(sc, 1, opts.enemy[0]);
    }
    yield* E.tween(16, v => { sc.trainerSpr[0].x = -Math.round(v * 120); });
    sc.trainerSpr[0].vis = false;
    yield* msg(`Go! ${T.name(party[lead])}!`, 20);
    yield* sendOut(sc, 0, party[lead]);

    // turns
    while (!b.over) {
      const me = B.act(b.sides[0]);
      let action = null;
      if (b.sides[0].vol.recharge) action = { kind: 'move', i: 0 };
      while (!action) {
        const menu = new ActionMenu(sc, T.name(me));
        const c = yield* E.run(menu);
        if (c === 0) {
          const mm = new MoveMenu(me);
          const i = yield* E.run(mm);
          if (i >= 0) action = { kind: 'move', i };
        } else if (c === 1) {
          const i = yield* pickTrain(b, false);
          if (i >= 0) action = { kind: 'switch', i };
        } else if (c === 2) {
          const r = yield* CD.bagScreen.battleUse(b);
          if (r) action = r;
        } else if (c === 3) {
          if (!b.canRun) { yield* msg("No! There's no running from a trainer battle!", 70); continue; }
          action = { kind: 'run' };
        }
      }
      if (action.kind === 'item' && CD.items.get(action.id).kind === 'ball') action.result = B.catchRoll(b, CD.items.get(action.id).fx.rate);
      const events = B.runTurn(b, action);
      yield* play(sc, b, events);
      if (b.outcome === 'caught') break;
      if (b.over) break;
      if (b.needEnemySwitch) {
        const i = B.nextEnemy(b);
        if (party.filter(t => t.hp > 0).length > 1 && opts.kind === 'trainer') {
          const r = yield* U.ask(`${opts.trainer.name} is about to send out ${T.name(b.sides[1].party[i])}. Will you switch trains?`);
          if (r === 0) { const j = yield* pickTrain(b, false); if (j >= 0) yield* play(sc, b, B.replace(b, 0, j)); }
        }
        yield* play(sc, b, B.replace(b, 1, i));
      }
      if (b.needPlayerSwitch) {
        const i = yield* pickTrain(b, true);
        yield* play(sc, b, B.replace(b, 0, i));
      }
    }

    // outcomes
    const result = b.outcome;
    if (result === 'win' && opts.kind === 'trainer') {
      CD.audio.music(opts.victory || 'victoryTrainer');
      sc.trainerSpr[1].vis = true; sc.trainerSpr[1].x = 120;
      yield* E.tween(20, v => { sc.trainerSpr[1].x = Math.round((1 - v) * 120); });
      yield* msg(`{PLAYER} defeated ${opts.trainer.cls ? opts.trainer.cls + ' ' : ''}${opts.trainer.name}!`, 90);
      if (opts.trainer.defeat) yield* U.say(opts.trainer.defeat, { speaker: opts.trainer.name });
      const prize = opts.trainer.prize * opts.enemy[opts.enemy.length - 1].level;
      st.money += prize;
      yield* U.say(`{PLAYER} got \x07${prize} for winning!`);
    } else if (result === 'win') {
      CD.audio.music('victoryWild');
      yield* E.wait(20);
    } else if (result === 'caught') {
      yield* afterCatch(b.sides[1].party[0]);
    } else if (result === 'run') {
      CD.audio.sfx('run');
    } else if (result === 'lose') {
      yield* U.say('{PLAYER} has no trains that can run!');
      yield* U.say('{PLAYER} scurried back to the nearest depot, keeping the trains safe...');
    }
    // evolution checks for trains that crossed a threshold
    const evolving = result === 'win' || result === 'caught' || result === 'run' ? b.exp.slice() : [];
    yield* U.fadeOut(16);
    E.remove(sc);
    for (const t of party) { t.expGiven = undefined; }
    for (const t of opts.enemy) delete t.expGiven;
    if (CD.evolution) for (const i of evolving) { const t = party[i]; const into = T.evolveTarget(t); if (into && t.hp > 0) yield* CD.evolution.run(t, into); }
    return result;
  }

  function* afterCatch(t) {
    const st = CD.state;
    const firstTime = !st.dex.caught[t.id];
    st.dex.caught[t.id] = true;
    t.ot = st.name; t.caught = { map: st.map, level: t.level };
    delete t.expGiven;
    if (firstTime && st.flags.gotDex) {
      yield* U.say(`New Traindex data will be added for ${T.name(t)}!`);
      if (CD.dexScreen) yield* CD.dexScreen.entry(t.id);
    }
    const r = yield* U.ask(`Give a nickname to the caught ${T.name(t)}?`);
    if (r === 0) {
      const n = yield* E.run(new CD.title.NameEntry('NICKNAME?', ''));
      if (n) t.nick = n.toUpperCase() === CD.species.get(t.id).name ? null : n;
    }
    if (st.party.length < 6) st.party.push(t);
    else {
      st.box.push(t);
      yield* U.say(`${T.name(t)} was sent to the DEPOT storage.`);
    }
  }

  CD.battleScene = { battle, Scene, msg, sendOut, learnMove, backdrop, afterCatch };
})(window.CD);
