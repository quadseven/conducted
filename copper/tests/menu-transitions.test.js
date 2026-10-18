// The option list opens with a motion instead of a snap: it fades up and slides
// the last few pixels into place, the cursor travels between rows rather than
// jumping, and each motion starts on the frame its sound does.
'use strict';
const assert = require('assert');
const H = require('./harness.js');

const h = H.load();
const CD = h.CD;
const ANIM = CD.ui.MENU_ANIM;

// Draw the scene stack onto a fresh surface, so a sample is one frame and nothing else
function render() {
  const s = new CD.gfx.Surface(CD.gfx.W, CD.gfx.H);
  CD.engine.draw(s);
  return s;
}
const at = (s, x, y) => s.data[y * s.w + x];
// a composited pixel comes back opaque; an untouched one keeps the surface's own zero
const painted = c => (c >>> 24) !== 0;

// the window's top ink edge, found by scanning a column that carries no label glyphs
function topEdge(s, col) {
  for (let y = 0; y < s.h; y++) if (painted(at(s, col, y))) return y;
  return -1;
}
// the first row in a column that the window has reached
function frontEdge(s, col, bg) {
  for (let y = 0; y < s.h; y++) if (at(s, col, y) !== bg) return y;
  return -1;
}
// the cursor glyph \x01 opens with '#...', so its top row is ink at x and paper at x+1
function cursorRow(s, col) {
  const ink = CD.gfx.hex(CD.pal.ink);
  for (let y = 0; y < s.h; y++) if (at(s, col, y) === ink && at(s, col + 1, y) !== ink) return y;
  return -1;
}
function open(items, opts) {
  const c = new CD.ui.Choice(items, opts);
  CD.engine.push(c);
  return c;
}
const PAPER = () => CD.gfx.hex(CD.pal.paper);

// 1. the window fades up from nothing to full paper, over about 200ms
{
  const x = 60, y = 30;
  const c = open(['BAG', 'SAVE', 'EXIT'], { x, y, w: 90 });
  assert.strictEqual(Math.round(ANIM.openFrames * 1000 / 60), 200, 'the fade is pitched at about 200ms');
  const full = PAPER();
  // a spot clear of the labels that stays on paper at every point of the slide
  const probe = [x + 50, y + 8 + ANIM.openSlide];
  const px = [];
  let arrived = -1;
  for (let f = 1; f <= ANIM.openFrames + 2; f++) {
    h.step(1);
    const v = at(render(), probe[0], probe[1]);
    px.push(v);
    if (arrived < 0 && v === full) arrived = f;
  }
  assert.notStrictEqual(px[0], full, 'the window starts transparent, not already drawn');
  assert(CD.gfx.R(px[0]) < CD.gfx.R(full), 'the first frame is only part faded in');
  for (let i = 1; i < ANIM.openFrames; i++) {
    assert(CD.gfx.R(px[i]) > CD.gfx.R(px[i - 1]), 'frame ' + i + ' is darker than the one before it');
  }
  assert.strictEqual(arrived, ANIM.openFrames, 'the fade reaches full opacity on schedule');
  assert.strictEqual(px[ANIM.openFrames + 1], full, 'and stays there');
  CD.engine.remove(c);
}

// 2. the window slides the last few pixels down as it fades, and stops exactly on its mark
{
  const x = 60, y = 30;
  const c = open(['BAG', 'SAVE', 'EXIT'], { x, y, w: 90 });
  const edges = [];
  for (let f = 1; f <= ANIM.openFrames + 1; f++) { h.step(1); edges.push(topEdge(render(), x + 50)); }
  const drop = edges[0] - y;
  assert(drop >= 5 && drop <= 10, 'the window starts 5 to 10px below its resting place, got ' + drop);
  assert(drop <= ANIM.openSlide, 'and never further than the slide it is given');
  for (let i = 1; i < edges.length; i++) assert(edges[i] <= edges[i - 1], 'the slide never runs backwards');
  assert.strictEqual(edges[edges.length - 1], y, 'the window lands exactly where it belongs');
  CD.engine.remove(c);
}

// 3. the fade dissolves with the scene beneath it rather than coming out of black
{
  const x = 60, y = 30;
  const sky = '#204080';
  const backdrop = { draw(s) { s.fill(0, 0, s.w, s.h, sky); } };
  CD.engine.push(backdrop);
  const c = open(['BAG', 'SAVE', 'EXIT'], { x, y, w: 90 });
  const probe = [x + 50, y + 8 + ANIM.openSlide];
  const bg = CD.gfx.hex(sky);
  h.step(1);
  const s = render();
  const mid = at(s, probe[0], probe[1]);
  assert(CD.gfx.B(mid) > CD.gfx.B(bg), 'the blue behind the window still shows through');
  assert(CD.gfx.R(mid) > CD.gfx.R(bg), 'and the paper is coming through too');
  assert.notStrictEqual(mid, PAPER(), 'the window is not opaque yet');
  // frame() paints every pixel of the window but its four corners, so the corners
  // have to come back out as the scene left them
  const corner = frontEdge(s, x + 50, bg);
  assert.notStrictEqual(at(s, x + 50, corner), bg, 'the window has a leading edge to find');
  assert.strictEqual(at(s, x, corner), bg, 'and the corner beside it is left exactly as the scene found it');
  h.step(ANIM.openFrames + 1);
  assert.strictEqual(at(render(), probe[0], probe[1]), PAPER(), 'and it arrives fully paper');
  CD.engine.remove(c);
  CD.engine.remove(backdrop);
}

// 4. the cursor travels between rows instead of teleporting
{
  const x = 60, y = 30;
  const c = open(['BAG', 'TRAINS', 'SAVE', 'EXIT'], { x, y, w: 90 });
  h.step(ANIM.openFrames + 1);
  const rest = cursorRow(render(), x + 7);
  assert.strictEqual(rest, y + 7, 'the cursor waits on the first row');
  CD.input.script('down', true);
  h.step(1);
  CD.input.script('down', false);
  assert.strictEqual(c.i, 1, 'the selection is on the second row');
  assert.strictEqual(cursorRow(render(), x + 7), rest, 'the cursor has not jumped on the frame it sets off');
  const rows = [];
  for (let f = 0; f < ANIM.cursorFrames + 2; f++) { h.step(1); rows.push(cursorRow(render(), x + 7)); }
  const between = rows.filter(r => r > rest && r < rest + 13);
  assert(between.length >= 2, 'the cursor is drawn in between the rows on the way, got ' + JSON.stringify(rows));
  for (let i = 1; i < rows.length; i++) assert(rows[i] >= rows[i - 1], 'the cursor only ever moves down');
  assert.strictEqual(rows[rows.length - 1], rest + 13, 'the cursor comes to rest on the second row');
  CD.engine.remove(c);
}

// 5. wrapping round the ends is a jump, not a sweep through every row
{
  const x = 60, y = 30;
  const c = open(['BAG', 'TRAINS', 'SAVE'], { x, y, w: 90 });
  h.step(ANIM.openFrames + 1);
  CD.input.script('up', true);
  h.step(1);
  CD.input.script('up', false);
  assert.strictEqual(c.i, 2, 'up from the first row wraps to the last');
  h.step(1);
  assert.strictEqual(cursorRow(render(), x + 7), y + 7 + 2 * 13, 'the cursor lands on the last row at once');
  CD.engine.remove(c);
}

// 6. a settled menu costs nothing: the same frames, the same pixels
{
  const x = 60, y = 30;
  const c = open(['BAG', 'SAVE', 'EXIT'], { x, y, w: 90 });
  h.step(ANIM.openFrames + 1);
  // only the window's own rectangle is repainted while it moves
  let prev = render();
  for (let f = 0; f < 4; f++) {
    h.step(1);
    const s = render();
    for (let yy = 0; yy < s.h; yy++) {
      for (let xx = 0; xx < s.w; xx++) {
        if (at(prev, xx, yy) === at(s, xx, yy)) continue;
        assert(xx >= x && xx < x + 90, 'column ' + xx + ' is inside the window');
        assert(yy >= y && yy < y + c.h + ANIM.openSlide, 'row ' + yy + ' is inside the window');
      }
    }
    prev = s;
  }
  const settled = render();
  h.step(1);
  const after = render();
  let moved = 0;
  for (let i = 0; i < settled.data.length; i++) if (settled.data[i] !== after.data[i]) moved++;
  assert.strictEqual(moved, 0, 'a settled menu redraws nothing that changes');
  CD.engine.remove(c);
}

// 7. every motion starts on the frame its sound does
{
  CD.newState();
  const real = CD.audio.sfx;
  const log = [];
  CD.audio.sfx = name => log.push([CD.frame, name]);
  try {
    CD.engine.spawn(CD.menu.open(), 'menu-open');
    h.step(1);
    const c = h.top();
    assert(c instanceof CD.ui.Choice, 'the START menu is an option list');
    assert(log.some(([f, n]) => n === 'select' && f === c.bornAt), 'the open sound starts on the frame the window starts fading');
    h.step(ANIM.openFrames + 1);
    log.length = 0;
    CD.input.script('down', true);
    h.step(1);
    CD.input.script('down', false);
    const movedAt = CD.frame;
    assert.strictEqual(c.i, 1, 'the cursor moved a row');
    assert(log.some(([f, n]) => n === 'cursor' && f === movedAt), 'the cursor sound starts on the frame the cursor sets off');
    assert.strictEqual(c.t, 0, 'and the travel starts there too');
    CD.engine.remove(c);
  } finally {
    CD.audio.sfx = real;
  }
}

console.log('menu-transitions.test: ok');