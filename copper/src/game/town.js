// Town services: the Train Depot (healing and storage) and the Mart.
// All spending goes through spend(), which refuses rather than go negative.
(function (CD) {
  'use strict';
  const E = CD.engine, I = CD.input, U = CD.ui, F = CD.font, T = CD.train;
  const P = CD.pal;

  function spend(n) {
    if (n < 0 || CD.state.money < n) return false;
    CD.state.money -= n;
    return true;
  }
  // Atomic purchase: money and items change together or not at all
  function buy(id, qty) {
    const item = CD.items.get(id);
    if (!item || qty < 1) return false;
    if (!spend(item.price * qty)) return false;
    CD.state.bag[id] = (CD.state.bag[id] || 0) + qty;
    return true;
  }
  function sell(id, qty) {
    const item = CD.items.get(id);
    if (!item || item.kind === 'key' || (CD.state.bag[id] || 0) < qty) return false;
    CD.state.bag[id] -= qty; if (!CD.state.bag[id]) delete CD.state.bag[id];
    CD.state.money += Math.floor(item.price / 2) * qty;
    return true;
  }

  // ---------- depot ----------
  function* nurse(npc, here) {
    const S = t => U.say(t, { speaker: 'DEPOT' });
    yield* S('Welcome to the Train Depot! We service tired trains back to full steam.');
    const r = yield* U.ask('Shall we service your trains?');
    if (r !== 0) { yield* S('We hope to see you again!'); return; }
    yield* S("Okay, I'll take your trains for a moment.");
    npc.dir = 'left';
    CD.audio.music(null);
    CD.audio.jingle('heal', CD.world.get(CD.state.map).music);
    for (let i = 0; i < CD.state.party.length; i++) { CD.audio.sfx('select'); yield* E.wait(14); }
    yield* E.wait(Math.round(CD.audio.jingleSeconds('heal') * 60));
    for (const t of CD.state.party) T.heal(t);
    CD.state.lastHeal = here;
    npc.dir = 'down';
    CD.overworld.resume();
    yield* S('Thank you for waiting. Your trains are fighting fit!');
    yield* S('We hope to see you again!');
  }

  // Storage terminal: deposit and withdraw
  class BoxList {
    constructor(title) { this.title = title; this.i = 0; this.top = 0; }
    update(a) {
      if (!a) return;
      const n = CD.state.box.length + 1;
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; CD.audio.sfx('cursor'); }
      if (this.i < this.top) this.top = this.i; if (this.i > this.top + 7) this.top = this.i - 7;
      if (I.pressed.a) { CD.audio.sfx('select'); this.result = this.i < CD.state.box.length ? this.i : -1; this.done = true; }
      else if (I.pressed.b) { CD.audio.sfx('cancel'); this.result = -1; this.done = true; }
    }
    draw(s) {
      s.clear('#c8d0d8');
      U.frame(s, 4, 4, 232, 124);
      F.draw(s, this.title + '  (' + CD.state.box.length + ' stored)', 12, 10, P.copperD);
      const rows = CD.state.box.map(t => T.name(t) + '  L' + t.level).concat(['CANCEL']);
      for (let r = 0; r < 8 && this.top + r < rows.length; r++) {
        const y = 24 + r * 12, k = this.top + r;
        F.draw(s, rows[k], 24, y, P.ink);
        if (k === this.i) U.cursor(s, 14, y);
      }
      const t = CD.state.box[this.i];
      if (t) s.blit(CD.trainArt.sprite(t.id, 'front'), 168, 40);
      U.frame(s, 4, 128, 232, 28);
      F.draw(s, t ? 'Take out ' + T.name(t) + '?' : 'Close the storage list.', 12, 138, P.ink);
    }
  }
  function* storage() {
    CD.audio.sfx('select');
    yield* U.say('{PLAYER} logged into the depot storage system.');
    for (;;) {
      const r = yield* U.choose(['WITHDRAW', 'DEPOSIT', 'LOG OFF'], { x: 140, y: 20, w: 96 });
      if (r === 0) {
        if (!CD.state.box.length) { yield* U.say('There are no trains in storage.'); continue; }
        if (CD.state.party.length >= 6) { yield* U.say('Your party is full! Deposit a train first.'); continue; }
        const i = yield* E.run(new BoxList('WITHDRAW'));
        if (i < 0) continue;
        const t = CD.state.box.splice(i, 1)[0];
        CD.state.party.push(t);
        yield* U.say(`${T.name(t)} rejoined your party.`);
      } else if (r === 1) {
        if (CD.state.party.length <= 1) { yield* U.say("You can't deposit your last train!"); continue; }
        const i = yield* CD.partyScreen.pick({ title: 'Deposit which train?' });
        if (i < 0) continue;
        const able = CD.state.party.filter((t, j) => j !== i && t.hp > 0).length;
        if (!able) { yield* U.say('You need at least one train that can run!'); continue; }
        const t = CD.state.party.splice(i, 1)[0];
        CD.state.box.push(t);
        yield* U.say(`${T.name(t)} was stored in the depot.`);
      } else return;
    }
  }

  // ---------- mart ----------
  class ShopList {
    constructor(ids, mode) { this.ids = ids; this.mode = mode; this.i = 0; }
    price(id) { const p = CD.items.get(id).price; return this.mode === 'sell' ? Math.floor(p / 2) : p; }
    update(a) {
      if (!a) return;
      const n = this.ids.length + 1;
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; CD.audio.sfx('cursor'); }
      if (I.pressed.a) { CD.audio.sfx('select'); this.result = this.i < this.ids.length ? this.ids[this.i] : null; this.done = true; }
      else if (I.pressed.b) { CD.audio.sfx('cancel'); this.result = null; this.done = true; }
    }
    draw(s) {
      U.frame(s, 4, 4, 100, 20);
      F.draw(s, '\x07' + CD.state.money, 12, 10, P.ink);
      U.frame(s, 60, 26, 176, 84);
      const rows = this.ids.concat(['__']);
      const top = Math.max(0, Math.min(this.i - 3, rows.length - 6));
      for (let r = 0; r < 6 && top + r < rows.length; r++) {
        const k = top + r, id = rows[k], y = 34 + r * 12;
        if (id === '__') F.draw(s, 'CANCEL', 78, y, P.ink);
        else { F.draw(s, CD.items.name(id), 78, y, P.ink); F.drawRight(s, this.mode === 'sell' ? '\x08' + CD.state.bag[id] + '  \x07' + this.price(id) : '\x07' + this.price(id), 228, y, P.ink); }
        if (k === this.i) U.cursor(s, 70, y);
      }
      U.frame(s, 4, 112, 232, 46);
      const id = this.ids[this.i];
      F.wrap(id ? CD.items.get(id).desc : 'Leave the counter.', 214).forEach((ln, j) => F.draw(s, ln, 12, 122 + j * 14, P.ink));
    }
  }
  class Qty {
    constructor(max, unit) { this.n = 1; this.max = Math.max(1, max); this.unit = unit; }
    update(a) {
      if (!a) return;
      if (I.repeat.up) { this.n = this.n >= this.max ? 1 : this.n + 1; CD.audio.sfx('cursor'); }
      if (I.repeat.down) { this.n = this.n <= 1 ? this.max : this.n - 1; CD.audio.sfx('cursor'); }
      if (I.repeat.right) { this.n = Math.min(this.max, this.n + 10); CD.audio.sfx('cursor'); }
      if (I.repeat.left) { this.n = Math.max(1, this.n - 10); CD.audio.sfx('cursor'); }
      if (I.pressed.a) { CD.audio.sfx('select'); this.result = this.n; this.done = true; }
      if (I.pressed.b) { CD.audio.sfx('cancel'); this.result = 0; this.done = true; }
    }
    draw(s) {
      U.frame(s, 136, 84, 100, 26, { paper: P.cream });
      F.draw(s, '\x08' + String(this.n).padStart(2, '0'), 144, 93, P.ink);
      F.drawRight(s, '\x07' + this.unit * this.n, 228, 93, P.ink);
    }
  }
  function* mart(stock) {
    const S = t => U.say(t, { speaker: 'CLERK' });
    yield* S('Hi there! May I help you?');
    for (;;) {
      const r = yield* U.choose(['BUY', 'SELL', 'QUIT'], { x: 4, y: 4, w: 64 });
      if (r === 0) {
        for (;;) {
          const list = new ShopList(stock, 'buy');
          const id = yield* E.run(list);
          if (!id) break;
          const item = CD.items.get(id);
          const q = new Qty(Math.min(99, Math.floor(CD.state.money / item.price)), item.price);
          if (q.max < 1 || CD.state.money < item.price) { yield* S("You don't have enough money."); continue; }
          E.push(list); const n = yield* E.run(q); E.remove(list);
          if (!n) continue;
          const c = yield* U.ask(`${item.name}, and you want ${n}. That will be \x07${item.price * n}. OK?`);
          if (c !== 0) continue;
          if (buy(id, n)) { CD.audio.sfx('save'); yield* S('Here you are! Thank you!'); }
          else yield* S("You don't have enough money.");
        }
      } else if (r === 1) {
        for (;;) {
          const ids = Object.keys(CD.state.bag).filter(k => CD.state.bag[k] > 0 && CD.items.get(k) && CD.items.get(k).kind !== 'key');
          if (!ids.length) { yield* S("You don't have anything I can buy."); break; }
          const list = new ShopList(ids, 'sell');
          const id = yield* E.run(list);
          if (!id) break;
          const q = new Qty(CD.state.bag[id], Math.floor(CD.items.get(id).price / 2));
          E.push(list); const n = yield* E.run(q); E.remove(list);
          if (!n) continue;
          const c = yield* U.ask(`I can pay \x07${Math.floor(CD.items.get(id).price / 2) * n} for that. OK?`);
          if (c === 0 && sell(id, n)) CD.audio.sfx('save');
        }
      } else { yield* S('Please come again!'); return; }
    }
  }

  CD.town = { spend, buy, sell, nurse, storage, mart, ShopList, BoxList };
})(window.CD);
