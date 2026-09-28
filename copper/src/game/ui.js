// UI primitives and modal scenes: framed windows, the dialogue box (typewriter,
// two lines per page, speaker tab), yes/no and list choices, and screen fades.
(function (CD) {
  'use strict';
  const { Surface, hex, shade } = CD.gfx;
  const P = CD.pal;
  const F = CD.font;
  const E = CD.engine;
  const I = CD.input;

  // A ticket-stock window: cream paper, double ink rule, copper corner rivets
  function frame(s, x, y, w, h, opts) {
    opts = opts || {};
    const paper = opts.paper || P.paper;
    s.fill(x + 1, y, w - 2, h, P.ink); s.fill(x, y + 1, w, h - 2, P.ink);
    s.fill(x + 1, y + 1, w - 2, h - 2, opts.rim || '#8a6a52');
    s.fill(x + 2, y + 2, w - 4, h - 4, P.ink);
    s.fill(x + 3, y + 3, w - 6, h - 6, paper);
    s.hline(x + 3, y + 3, w - 6, P.cream);
    s.hline(x + 3, y + h - 4, w - 6, P.paper2);
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) s.px(cx, cy, P.brassL);
  }
  function cursor(s, x, y, blink) {
    if (blink && (CD.frame >> 4) % 2) return;
    F.draw(s, '\x01', x, y, P.ink);
  }

  // ---------- fades ----------
  const fx = { a: 0, color: '#000000', flash: 0, flashColor: '#ffffff', shake: 0 };
  fx.draw = function (s) {
    if (fx.a > 0) { const c = hex(fx.color); if (fx.a >= 1) s.data.fill(c); else for (let i = 0; i < s.data.length; i++) s.data[i] = CD.gfx.mix(s.data[i], c, fx.a); }
    if (fx.flash > 0) { const c = hex(fx.flashColor); for (let i = 0; i < s.data.length; i++) s.data[i] = CD.gfx.mix(s.data[i], c, fx.flash); }
  };
  CD.fx = fx;
  function* fadeOut(n, color) { fx.color = color || '#000000'; yield* E.tween(n || 16, v => { fx.a = v; }); fx.a = 1; }
  function* fadeIn(n) { const a0 = fx.a; yield* E.tween(n || 16, v => { fx.a = a0 * (1 - v); }); fx.a = 0; }
  function* flash(times, color) {
    fx.flashColor = color || '#ffffff';
    for (let i = 0; i < times; i++) { fx.flash = 0.85; yield* E.wait(4); fx.flash = 0; yield* E.wait(4); }
  }

  // ---------- dialogue ----------
  const BOX = { x: 4, y: 112, w: 232, h: 46 };
  const TEXT_SPEED = { slow: 2, mid: 1, fast: 0 };
  function textSpeed() { return CD.state && CD.state.options ? CD.state.options.textSpeed || 'mid' : 'mid'; }

  // Substitute tokens: {PLAYER} {RIVAL} {STARTER} and any key in state.vars
  function fill(text) {
    const st = CD.state || {};
    return String(text).replace(/\{(\w+)\}/g, (m, k) => {
      if (k === 'PLAYER') return st.name || 'ALEX';
      if (k === 'RIVAL') return st.rivalName || 'BLAKE';
      if (st.vars && st.vars[k] !== undefined) return st.vars[k];
      return m;
    });
  }

  class TextBox {
    constructor(text, opts) {
      opts = opts || {};
      this.speaker = opts.speaker || null;
      this.keepOpen = !!opts.keepOpen;
      this.lines = F.wrap(fill(text), BOX.w - 18);
      this.page = 0; this.shown = 0; this.tick = 0; this.waiting = false;
      this.autoClose = opts.auto || 0;
      this.pos = opts.top ? { x: BOX.x, y: 4 } : { x: BOX.x, y: BOX.y };
    }
    pageText() { return this.lines.slice(this.page * 2, this.page * 2 + 2); }
    update(active) {
      const total = this.pageText().join('').length;
      if (this.shown < total) {
        const spd = TEXT_SPEED[textSpeed()];
        const skip = active && (I.held.a || I.held.b);
        if (spd === 0 || skip) this.shown = Math.min(total, this.shown + (skip ? 4 : 3));
        else if (++this.tick >= spd) { this.tick = 0; this.shown++; if (this.shown % 3 === 0) CD.audio.sfx('text'); }
        return;
      }
      if (this.autoClose) { if (--this.autoClose <= 0) this.done = true; return; }
      const more = (this.page + 1) * 2 < this.lines.length;
      if (!active) return;
      if (I.pressed.a || I.pressed.b) {
        if (more) { this.page++; this.shown = 0; CD.audio.sfx('text'); }
        else { this.done = true; }
      }
    }
    draw(s) {
      const { x, y } = this.pos;
      frame(s, x, y, BOX.w, BOX.h);
      if (this.speaker) {
        const w = F.measure(this.speaker) + 10;
        frame(s, x + 6, y - 12, w, 15, { paper: P.paper2 });
        F.draw(s, this.speaker, x + 11, y - 8, P.ink);
        s.fill(x + 9, y + 1, w - 6, 3, P.paper); s.hline(x + 9, y + 3, w - 6, P.cream);
      }
      let left = this.shown;
      this.pageText().forEach((ln, i) => {
        const part = ln.slice(0, Math.max(0, left));
        left -= ln.length;
        F.draw(s, part, x + 9, y + 11 + i * 15, P.ink, P.paper2);
      });
      const total = this.pageText().join('').length;
      if (this.shown >= total && !this.autoClose) {
        const more = (this.page + 1) * 2 < this.lines.length;
        const bob = (CD.frame >> 3) % 2;
        if (more || !this.keepOpen) F.draw(s, '\x02', x + BOX.w - 14, y + BOX.h - 12 + bob, P.copperD);
      }
    }
  }
  function* say(text, opts) {
    if (typeof opts === 'string') opts = { speaker: opts };
    return yield* E.run(new TextBox(text, opts));
  }
  // Show a box that stays on screen (drawn) while another prompt appears
  class Choice {
    constructor(items, opts) {
      opts = opts || {};
      this.items = items; this.i = opts.start || 0; this.cancel = opts.cancel === undefined ? items.length - 1 : opts.cancel;
      this.w = opts.w || Math.max(...items.map(t => F.measure(typeof t === 'string' ? t : t.label))) + 24;
      this.h = items.length * 13 + 10;
      this.x = opts.x !== undefined ? opts.x : 236 - this.w;
      this.y = opts.y !== undefined ? opts.y : BOX.y - this.h - 2;
      this.under = opts.under || null;
      this.onMove = opts.onMove;
    }
    label(i) { const t = this.items[i]; return typeof t === 'string' ? t : t.label; }
    disabled(i) { const t = this.items[i]; return t && t.disabled; }
    update(active) {
      if (!active) return;
      const n = this.items.length;
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; CD.audio.sfx('cursor'); if (this.onMove) this.onMove(this.i); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; CD.audio.sfx('cursor'); if (this.onMove) this.onMove(this.i); }
      if (I.pressed.a) {
        if (this.disabled(this.i)) { CD.audio.sfx('bump'); return; }
        CD.audio.sfx('select'); this.result = this.i; this.done = true;
      } else if (I.pressed.b && this.cancel !== null && this.cancel >= 0) { CD.audio.sfx('cancel'); this.result = this.cancel === 'none' ? -1 : this.cancel; this.done = true; }
    }
    draw(s) {
      if (this.under) this.under.draw(s);
      frame(s, this.x, this.y, this.w, this.h);
      for (let i = 0; i < this.items.length; i++) {
        const yy = this.y + 7 + i * 13;
        F.draw(s, this.label(i), this.x + 15, yy, this.disabled(i) ? '#a09080' : P.ink);
        if (i === this.i) cursor(s, this.x + 7, yy);
      }
    }
  }
  function* choose(items, opts) { return yield* E.run(new Choice(items, opts)); }
  // Ask a yes/no question: the question stays visible beneath the choice
  function* ask(text, opts) {
    opts = opts || {};
    const tb = new TextBox(text, { speaker: opts.speaker, keepOpen: true });
    E.push(tb);
    // the box pages itself; hand over to the choice once its last page is fully typed
    while (tb.shown < tb.pageText().join('').length || (tb.page + 1) * 2 < tb.lines.length) yield;
    E.remove(tb);
    const r = yield* E.run(new Choice(opts.items || ['YES', 'NO'], { under: tb, cancel: opts.cancel === undefined ? 1 : opts.cancel }));
    return r;
  }

  // A scene that just draws something until done is set by a script
  function overlay(drawFn) { return { draw: drawFn, update() {} }; }

  CD.ui = { frame, cursor, say, ask, choose, TextBox, Choice, fadeOut, fadeIn, flash, fill, overlay, BOX };
})(window.CD);
