// Party screen, train summary and bag, used from the START menu and in battle.
(function (CD) {
  'use strict';
  const { shade } = CD.gfx;
  const E = CD.engine, I = CD.input, U = CD.ui, F = CD.font, T = CD.train;
  const P = CD.pal;
  const SW = CD.gfx.W;

  function hpBar(s, x, y, w, frac) {
    const f = Math.max(0, Math.min(1, frac));
    const c = f > 0.5 ? P.hpGreen : f > 0.2 ? P.hpYellow : P.hpRed;
    s.fill(x - 1, y - 1, w + 2, 5, P.ink); s.fill(x, y, w, 3, '#4a4458');
    if (f > 0) { s.fill(x, y, Math.ceil(w * f), 3, c); s.hline(x, y, Math.ceil(w * f), shade(c, 0.35)); }
  }
  function typeChip(s, x, y, type) {
    const w = F.measure(type) + 6;
    s.fill(x, y, w, 10, CD.typeColor[type]); s.rect(x, y, w, 10, P.ink);
    F.draw(s, type, x + 3, y + 2, P.white);
    return w;
  }

  // ---------- party list ----------
  class PartyList {
    constructor(opts) { this.opts = opts || {}; this.i = 0; this.opaque = true; this.swapFrom = -1; }
    update(a) {
      if (!a) return;
      const n = CD.state.party.length + (this.opts.cancel !== false ? 1 : 0);
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; CD.audio.sfx('cursor'); }
      if (I.pressed.a) { CD.audio.sfx('select'); this.result = this.i >= CD.state.party.length ? -1 : this.i; this.done = true; }
      else if (I.pressed.b && this.opts.cancel !== false) { CD.audio.sfx('cancel'); this.result = -1; this.done = true; }
    }
    draw(s) {
      s.clear('#d8c8a8');
      for (let y = 0; y < 160; y += 4) s.hline(0, y, SW, '#d0c0a0');
      const party = CD.state.party;
      party.forEach((t, i) => {
        const y = 4 + i * 19, sel = i === this.i, swap = i === this.swapFrom;
        U.frame(s, 4, y, 232, 19, { paper: swap ? '#f0d8a8' : sel ? P.cream : P.paper, rim: sel ? P.copper : undefined });
        const bob = sel && t.hp > 0 ? ((CD.frame >> 3) % 2) : 0;
        s.blit(CD.trainArt.sprite(t.id, 'icon'), 8, y - 3 - bob, t.hp <= 0 ? { tint: '#8a8a9a', tintA: 0.6 } : undefined);
        F.draw(s, T.name(t), 36, y + 6, P.ink);
        F.draw(s, 'L' + t.level, 108, y + 6, P.ink);
        if (t.status) { const tag = { brn: 'BRN', par: 'PAR', psn: 'PSN', slp: 'SLP' }[t.status]; F.draw(s, tag, 128, y + 6, P.red); }
        if (t.hp <= 0) F.draw(s, 'STALL', 128, y + 6, P.red);
        hpBar(s, 152, y + 7, 44, t.hp / t.stats.hp);
        F.drawRight(s, t.hp + '/' + t.stats.hp, 230, y + 6, P.ink);
        if (this.opts.note) { const n = this.opts.note(t); if (n) F.drawRight(s, n, 230, y + 6, n === 'ABLE' ? P.blueD : P.red); }
      });
      if (this.opts.cancel !== false) {
        const y = 4 + party.length * 19;
        U.frame(s, 170, y, 66, 17, { paper: this.i === party.length ? P.cream : P.paper });
        F.draw(s, 'CANCEL', 184, y + 5, P.ink);
        if (this.i === party.length) U.cursor(s, 176, y + 5);
      }
      U.frame(s, 4, 128, 160, 28);
      F.draw(s, this.opts.title || 'Choose a train.', 12, 138, P.ink);
    }
  }
  function* pick(opts) { return yield* E.run(new PartyList(opts)); }

  // ---------- summary ----------
  function* summary(idx) {
    let i = idx, page = 0;
    const sc = { opaque: true, update(a) {
      if (!a) return;
      const n = CD.state.party.length;
      if (I.repeat.up && n > 1) { i = (i + n - 1) % n; CD.audio.cry(CD.state.party[i].id, T.types(CD.state.party[i])[0]); }
      if (I.repeat.down && n > 1) { i = (i + 1) % n; CD.audio.cry(CD.state.party[i].id, T.types(CD.state.party[i])[0]); }
      if (I.repeat.left || I.repeat.right) { page ^= 1; CD.audio.sfx('cursor'); }
      if (I.pressed.b || I.pressed.a) { CD.audio.sfx('cancel'); this.done = true; }
    }, draw(s) {
      const t = CD.state.party[i], sp = CD.species.get(t.id);
      s.clear('#d8c8a8');
      U.frame(s, 4, 4, 92, 100, { paper: '#eef2f6' });
      s.blit(CD.trainArt.sprite(t.id, 'front'), 18, 20);
      F.draw(s, 'No.' + String(t.id).padStart(3, '0'), 10, 10, P.copperD);
      F.draw(s, T.name(t), 10, 88, P.ink);
      F.drawRight(s, 'L' + t.level, 90, 88, P.ink);
      let x = 8; for (const ty of sp.types) x += typeChip(s, x, 108, ty) + 3;
      U.frame(s, 100, 4, 136, 152);
      if (page === 0) {
        F.draw(s, 'STATS', 108, 10, P.copperD);
        F.drawRight(s, '\x03\x02 train   \x01 moves', 230, 10, '#a09080');
        F.draw(s, 'HP', 108, 26, P.ink); hpBar(s, 130, 27, 60, t.hp / t.stats.hp); F.drawRight(s, t.hp + '/' + t.stats.hp, 230, 26, P.ink);
        [['ATTACK', 'atk'], ['DEFENSE', 'def'], ['SPEED', 'spd'], ['SPECIAL', 'spc']].forEach(([l, k], j) => { F.draw(s, l, 108, 40 + j * 13, P.ink); F.drawRight(s, String(t.stats[k]), 230, 40 + j * 13, P.ink); });
        F.draw(s, 'EXP', 108, 96, P.ink); F.drawRight(s, String(t.exp), 230, 96, P.ink);
        F.draw(s, 'TO NEXT', 108, 109, P.ink); F.drawRight(s, t.level >= 100 ? '-' : String(T.expAt(sp.growth, t.level + 1) - t.exp), 230, 109, P.ink);
        s.fill(108, 121, 122, 3, '#4a4458'); s.fill(108, 121, Math.round(122 * T.expProgress(t)), 3, P.exp);
        F.draw(s, 'CONDUCTOR', 108, 132, P.ink); F.drawRight(s, t.ot || CD.state.name, 230, 132, P.ink);
        if (t.status) F.draw(s, 'STATUS: ' + CD.battle.STATUS_TEXT[t.status].toUpperCase(), 108, 144, P.red);
      } else {
        F.draw(s, 'MOVES', 108, 10, P.copperD);
        t.moves.forEach((m, j) => {
          const mv = CD.moves.get(m.name), y = 24 + j * 32;
          F.draw(s, m.name.toUpperCase(), 108, y, P.ink);
          typeChip(s, 108, y + 11, mv.type);
          F.drawRight(s, 'PP ' + m.pp + '/' + m.max, 230, y + 12, P.ink);
          F.drawRight(s, mv.cat === 'status' ? '---' : 'POW ' + mv.pow, 230, y, '#8a7a6a');
        });
      }
    } };
    CD.audio.cry(CD.state.party[i].id, T.types(CD.state.party[i])[0]);
    yield* E.run(sc);
  }

  // Field party screen from the START menu: summary, reorder
  function* fieldParty() {
    const list = new PartyList({ title: 'Choose a train.' });
    E.push(list);
    try {
      for (;;) {
        list.done = false; list.result = undefined;
        while (!list.done) yield;
        const i = list.result;
        if (i < 0) return;
        const t = CD.state.party[i];
        const r = yield* U.choose(['SUMMARY', 'SWITCH', 'CANCEL'], { x: 160, y: 64, w: 76 });
        if (r === 0) yield* summary(i);
        else if (r === 1) {
          list.swapFrom = i; list.opts.title = 'Move to where?';
          list.done = false;
          while (!list.done) yield;
          const j = list.result;
          if (j >= 0 && j !== i) { const p = CD.state.party; [p[i], p[j]] = [p[j], p[i]]; CD.audio.sfx('select'); }
          list.swapFrom = -1; list.opts.title = 'Choose a train.';
        }
      }
    } finally { E.remove(list); }
  }

  // ---------- bag ----------
  function owned(filter) { return Object.keys(CD.state.bag).filter(k => CD.state.bag[k] > 0 && CD.items.get(k) && (!filter || filter(CD.items.get(k)))); }
  class BagList {
    constructor(ids, title) { this.ids = ids; this.title = title; this.i = 0; this.top = 0; }
    update(a) {
      if (!a) return;
      const n = this.ids.length + 1;
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; CD.audio.sfx('cursor'); }
      if (this.i < this.top) this.top = this.i; if (this.i > this.top + 5) this.top = this.i - 5;
      if (I.pressed.a) { CD.audio.sfx('select'); this.result = this.i < this.ids.length ? this.ids[this.i] : null; this.done = true; }
      else if (I.pressed.b) { CD.audio.sfx('cancel'); this.result = null; this.done = true; }
    }
    draw(s) {
      U.frame(s, 70, 4, 166, 106);
      F.draw(s, 'BAG', 80, 10, P.copperD);
      const rows = this.ids.concat(['__cancel']);
      for (let r = 0; r < 6 && this.top + r < rows.length; r++) {
        const k = rows[this.top + r], y = 24 + r * 13;
        if (k === '__cancel') F.draw(s, 'CLOSE BAG', 90, y, P.ink);
        else { F.draw(s, CD.items.name(k), 90, y, P.ink); F.drawRight(s, '\x08' + CD.state.bag[k], 228, y, P.ink); }
        if (this.top + r === this.i) U.cursor(s, 82, y);
      }
      U.frame(s, 4, 112, 232, 46);
      const k = this.ids[this.i];
      F.wrap(k ? CD.items.get(k).desc : 'Close the bag.', 214).forEach((ln, j) => F.draw(s, ln, 12, 122 + j * 14, P.ink));
    }
  }
  function take(id) { CD.state.bag[id]--; if (CD.state.bag[id] <= 0) delete CD.state.bag[id]; }

  // Use a healing/cure/revive/evolution item on a party member outside battle
  function* useOn(id) {
    const item = CD.items.get(id);
    for (;;) {
      const i = yield* pick({ title: 'Use on which train?', note: item.kind === 'evo' ? t => (T.evolveTarget(t, id) ? 'ABLE' : 'NOT ABLE') : null });
      if (i < 0) return false;
      const t = CD.state.party[i];
      if (item.kind === 'evo') {
        const into = T.evolveTarget(t, id);
        if (!into) { yield* U.say("It won't have any effect."); continue; }
        take(id);
        if (CD.evolution) yield* CD.evolution.run(t, into, true); else T.evolve(t, into);
        return true;
      }
      if (item.kind === 'revive') {
        if (t.hp > 0) { yield* U.say("It won't have any effect."); continue; }
        take(id); t.hp = Math.floor(t.stats.hp * item.fx.revive); CD.audio.sfx('heal');
        yield* U.say(`${T.name(t)} is running again!`); return true;
      }
      if (t.hp <= 0) { yield* U.say(`${T.name(t)} has no steam left. It needs a JUMP START.`); continue; }
      if (item.kind === 'heal') {
        if (t.hp >= t.stats.hp) { yield* U.say("It won't have any effect."); continue; }
        take(id); const from = t.hp; t.hp = Math.min(t.stats.hp, t.hp + item.fx.hp); CD.audio.sfx('heal');
        yield* U.say(`${T.name(t)} recovered ${t.hp - from} HP!`); return true;
      }
      if (item.kind === 'status') {
        if (!t.status || (item.fx.cure !== 'all' && item.fx.cure !== t.status)) { yield* U.say("It won't have any effect."); continue; }
        take(id); t.status = null; CD.audio.sfx('heal');
        yield* U.say(`${T.name(t)} is back in working order!`); return true;
      }
      return false;
    }
  }
  function* fieldBag() {
    for (;;) {
      const ids = owned();
      const id = yield* E.run(new BagList(ids));
      if (!id) return;
      const item = CD.items.get(id);
      const opts = item.kind === 'key' ? ['CANCEL'] : ['USE', 'TOSS', 'CANCEL'];
      const r = yield* U.choose(opts, { x: 164, y: 60, w: 72, cancel: opts.length - 1 });
      if (opts[r] === 'USE') {
        if (['heal', 'status', 'revive', 'evo'].includes(item.kind)) yield* useOn(id);
        else if (item.kind === 'field' && item.fx.repel) { take(id); CD.state.repel = item.fx.repel; CD.audio.sfx('select'); yield* U.say(`{PLAYER} sounded the ${item.name}. Weak wild trains will keep their distance.`); }
        else yield* U.say("This isn't the time to use that!");
      } else if (opts[r] === 'TOSS') {
        const c = yield* U.ask(`Throw away one ${item.name}?`);
        if (c === 0) { take(id); yield* U.say(`Threw away a ${item.name}.`); }
      }
    }
  }
  // In battle: returns an action or null
  function* battleUse(b) {
    const ids = owned(it => it.kind === 'ball' || it.kind === 'heal' || it.kind === 'status' || it.kind === 'revive');
    const id = yield* E.run(new BagList(ids));
    if (!id) return null;
    const item = CD.items.get(id);
    if (item.kind === 'ball') {
      if (b.kind !== 'wild') { yield* U.say("The trainer blocked the TRAINBALL! Don't be a thief!"); return null; }
      if (CD.state.party.length >= 6 && CD.state.box.length >= 240) { yield* U.say('There is no room left for another train!'); return null; }
      take(id);
      return { kind: 'item', id };
    }
    for (;;) {
      const i = yield* pick({ title: 'Use on which train?' });
      if (i < 0) return null;
      const t = CD.state.party[i];
      const ok = item.kind === 'revive' ? t.hp <= 0 : t.hp > 0 && (item.kind === 'heal' ? t.hp < t.stats.hp : t.status && (item.fx.cure === 'all' || item.fx.cure === t.status));
      if (!ok) { yield* U.say("It won't have any effect."); continue; }
      take(id);
      return { kind: 'item', id, target: i };
    }
  }

  CD.partyScreen = { pick, summary, fieldParty, PartyList, typeChip, hpBar };
  CD.bagScreen = { fieldBag, battleUse, useOn, BagList, take, owned };
  if (CD.menu) { CD.menu.screens.party = fieldParty; CD.menu.screens.bag = fieldBag; }
})(window.CD);
