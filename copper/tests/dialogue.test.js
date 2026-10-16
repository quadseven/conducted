// The dialogue box: a 3px ink border around a 2px white rule, text inset 3px
// inside that, typed one character at a time at a speed the box can override,
// a down arrow once the page is typed, and a slide up from below on open.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load();
const CD = h.CD, E = CD.engine, U = CD.ui, P = CD.pal, hex = CD.gfx.hex;
const { x: BX, y: BY, w: BW, h: BH } = U.BOX;
CD.newState();

function drawn(box) {
  const s = new CD.gfx.Surface(CD.gfx.W, CD.gfx.H).clear('#00ff00');
  box.draw(s);
  return s;
}
function typeAll(box) { for (let i = 0; i < 400 && !box.typed(); i++) box.update(false); }

// border: 3px ink, then 2px white, then paper, on all four sides
{
  const s = drawn(new U.TextBox('', { slide: false }));
  const mx = BX + 60, my = BY + 20;
  const edges = [
    d => s.get(mx, BY + d), d => s.get(mx, BY + BH - 1 - d),
    d => s.get(BX + d, my), d => s.get(BX + BW - 1 - d, my),
  ];
  for (const at of edges) {
    for (let d = 0; d < 3; d++) assert.strictEqual(at(d), hex(P.ink), 'border pixel ' + d + ' is ink');
    for (let d = 3; d < 5; d++) assert.strictEqual(at(d), hex(P.white), 'rule pixel ' + d + ' is white');
    assert.strictEqual(at(5), hex(P.paper), 'paper starts inside the rule');
  }
}

// padding: the first glyph starts 3px inside the white rule
{
  const box = new U.TextBox('HI', { slide: false });
  typeAll(box);
  const s = drawn(box);
  let left = Infinity;
  for (let y = BY + 5; y < BY + BH - 5; y++) for (let x = BX + 5; x < BX + 40; x++) if (s.get(x, y) === hex(P.ink)) left = Math.min(left, x);
  assert.strictEqual(left - BX, U.DIALOG.border + U.DIALOG.rule + U.DIALOG.pad, 'text is padded 3px from the rule');
}

// typewriter: one character per frame at mid, one per two frames at slow
{
  CD.state.options.textSpeed = 'mid';
  const mid = new U.TextBox('ABCDEFGH', { slide: false });
  for (let i = 0; i < 4; i++) mid.update(false);
  assert.strictEqual(mid.shown, 4, 'mid speed types a character a frame');
  const slow = new U.TextBox('ABCDEFGH', { slide: false, speed: 'slow' });
  for (let i = 0; i < 4; i++) slow.update(false);
  assert.strictEqual(slow.shown, 2, 'a box can override the speed option');
  assert.throws(() => new U.TextBox('A', { speed: 'warp' }), /unknown text speed/, 'a bad speed is refused');
}

// arrow: hidden while typing, a bobbing down triangle once the page is typed
{
  const arrowPixels = s => {
    let n = 0;
    for (let y = BY + BH - 14; y < BY + BH - 5; y++) for (let x = BX + BW - 16; x < BX + BW - 5; x++) if (s.get(x, y) === hex(P.copperD)) n++;
    return n;
  };
  const box = new U.TextBox('Wait for it.', { slide: false });
  box.update(false);
  assert(!box.typed(), 'still typing');
  assert.strictEqual(arrowPixels(drawn(box)), 0, 'no arrow while typing');
  typeAll(box);
  assert(box.typed(), 'page typed');
  assert.strictEqual(arrowPixels(drawn(box)), 9, 'the 5-3-1 triangle shows once typed');
}

// slide: starts below the screen, eases out to rest, and types nothing until open
{
  const box = new U.TextBox('Hello.');
  const offs = [box.offset()];
  for (let i = 0; i < U.DIALOG.openFrames; i++) { box.update(false); offs.push(box.offset()); }
  assert.strictEqual(offs[0], CD.gfx.H - BY, 'starts just below the screen');
  assert.strictEqual(offs[offs.length - 1], 0, 'rests in place after openFrames');
  for (let i = 1; i < offs.length; i++) assert(offs[i] <= offs[i - 1], 'moves only upward');
  assert(offs[0] - offs[1] > offs[offs.length - 2] - offs[offs.length - 1], 'eases out: fast start, gentle stop');
  assert.strictEqual(box.shown, 0, 'no text is typed while sliding');
  box.update(false);
  assert.strictEqual(box.shown, 1, 'typing begins once open');
  assert(new U.TextBox('Up here.', { top: true }).offset() < 0, 'a top box slides down from above');
}

// a box that replaces one closing this frame stays put, as one conversation
{
  const first = E.push(new U.TextBox('One.'));
  E.remove(first);
  const next = E.push(new U.TextBox('Two.'));
  assert.strictEqual(next.offset(), 0, 'the next line of a conversation does not slide');
  E.remove(next);
  h.step(3);
  const later = E.push(new U.TextBox('Later.'));
  assert(later.offset() > 0, 'a new conversation slides in again');
  E.remove(later);
}

console.log('dialogue.test: ok');
