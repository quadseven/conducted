// Input: eight buttons (up, down, left, right, a, b, start, select) fed by the
// keyboard, the on-screen touch controller, gamepads, or a test script.
// Scenes read `pressed` (edge this frame), `held`, and `repeat` (menu auto-repeat).
(function (CD) {
  'use strict';
  const BTNS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', KeyJ: 'a', Space: 'a',
    KeyX: 'b', KeyK: 'b', Backspace: 'b', Escape: 'b',
    Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select', KeyC: 'select',
  };
  const sources = { key: {}, touch: {}, pad: {}, script: {} };
  const latched = {};   // presses that began and maybe ended between two frames
  const held = {}, pressed = {}, released = {}, heldFor = {}, repeat = {};
  let prev = {};
  let lastDir = null;

  function rawDown(b) { return !!(sources.key[b] || sources.touch[b] || sources.pad[b] || sources.script[b]); }
  function set(src, b, v) {
    if (!b) return;
    if (v && !sources[src][b]) latched[b] = true;
    sources[src][b] = v;
  }

  function pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads && [...pads].find(p => p && p.connected);
    if (!gp) return;
    const bt = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp.axes || [];
    set('pad', 'a', bt(0)); set('pad', 'b', bt(1));
    set('pad', 'start', bt(9)); set('pad', 'select', bt(8));
    set('pad', 'up', bt(12) || ax[1] < -0.5); set('pad', 'down', bt(13) || ax[1] > 0.5);
    set('pad', 'left', bt(14) || ax[0] < -0.5); set('pad', 'right', bt(15) || ax[0] > 0.5);
  }

  function update() {
    pollGamepad();
    for (const b of BTNS) {
      const d = rawDown(b) || !!latched[b];
      held[b] = d;
      pressed[b] = d && !prev[b];
      released[b] = !d && !!prev[b];
      heldFor[b] = d ? (heldFor[b] || 0) + 1 : 0;
      // menu auto-repeat: first frame, then after 16 frames every 5
      const h = heldFor[b];
      repeat[b] = h === 1 || (h > 16 && (h - 16) % 5 === 0);
      latched[b] = false;
    }
    prev = Object.assign({}, held);
    for (const b of ['up', 'down', 'left', 'right']) if (pressed[b]) lastDir = b;
  }
  // The direction currently held; if several are held, the most recently pressed wins.
  function dir() {
    if (lastDir && held[lastDir]) return lastDir;
    for (const b of ['up', 'down', 'left', 'right']) if (held[b]) return b;
    return null;
  }
  function clear() {
    for (const b of BTNS) { pressed[b] = false; repeat[b] = false; latched[b] = false; }
  }
  // Eat all current input until every button is released (used on scene changes)
  function swallow() { clear(); for (const b of BTNS) prev[b] = true; }

  function bindKeyboard(target) {
    target.addEventListener('keydown', e => {
      const b = KEYMAP[e.code] || KEYMAP[e.key];
      if (!b) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      e.preventDefault();
      set('key', b, true);
      if (CD.audio) CD.audio.unlock();
    });
    target.addEventListener('keyup', e => { const b = KEYMAP[e.code] || KEYMAP[e.key]; if (b) set('key', b, false); });
    target.addEventListener('blur', () => { for (const b of BTNS) sources.key[b] = false; });
  }

  // On-screen controller: any element with data-btn is a button; #dpad is an 8-way pad
  function bindTouch(doc) {
    const pointers = new Map(); // pointerId -> {el, btn}
    function release(id) {
      const p = pointers.get(id); if (!p) return;
      pointers.delete(id);
      recompute();
    }
    function recompute() {
      const t = {};
      for (const p of pointers.values()) for (const b of p.btns) t[b] = true;
      for (const b of BTNS) set('touch', b, !!t[b]);
      const dp = doc.getElementById('dpad');
      if (dp) for (const d of ['up', 'down', 'left', 'right']) dp.classList.toggle(d, !!t[d]);
      doc.querySelectorAll('[data-btn]').forEach(el => el.classList.toggle('on', !!t[el.dataset.btn]));
    }
    function dpadDirs(el, e) {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return [];
      // four-way only: the grid game moves in cardinal steps
      return Math.abs(dx) > Math.abs(dy) ? [dx < 0 ? 'left' : 'right'] : [dy < 0 ? 'up' : 'down'];
    }
    function down(e) {
      const el = e.target.closest('[data-btn], #dpad');
      if (!el) return;
      e.preventDefault();
      if (CD.audio) CD.audio.unlock();
      if (el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch (_) { /* capture is best-effort */ }
      const btns = el.id === 'dpad' ? dpadDirs(el, e) : [el.dataset.btn];
      pointers.set(e.pointerId, { el, btns });
      if (navigator.vibrate && btns.length) try { navigator.vibrate(8); } catch (_) { /* haptics optional */ }
      recompute();
    }
    function move(e) {
      const p = pointers.get(e.pointerId);
      if (!p || p.el.id !== 'dpad') return;
      p.btns = dpadDirs(p.el, e);
      recompute();
    }
    doc.addEventListener('pointerdown', down, { passive: false });
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', e => release(e.pointerId));
    doc.addEventListener('pointercancel', e => release(e.pointerId));
    doc.addEventListener('contextmenu', e => { if (e.target.closest('#pad')) e.preventDefault(); });
  }

  // Test / demo hook: press(btn) for n frames
  function script(b, v) { set('script', b, v); }

  CD.input = { BTNS, held, pressed, released, repeat, heldFor, update, dir, clear, swallow, bindKeyboard, bindTouch, script };
})(window.CD);
