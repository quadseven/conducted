// The new-game introduction can be skipped: START during Professor Cypress's
// narration jumps straight to name entry, and the lines after the name are
// skipped as well, so a returning player reaches the bedroom in a few presses.
// Played through the real title flow with button presses only.
'use strict';
const assert = require('assert');
const H = require('./harness.js');

// Boot the title flow and pick NEW GAME; returns once the first narration box is open.
function toIntro(seed) {
  const h = H.load({ seed });
  const CD = h.CD;
  CD.engine.spawn(CD.main.flow(), 'flow');
  h.step(20);
  h.press('start', 30);
  h.press('a', 30);                                   // NEW GAME
  assert(h.until(() => h.top() instanceof CD.ui.TextBox, 400), 'the intro narration opens');
  return { h, CD };
}

// ---- the intro tells the player it can be skipped ----
{
  const { h, CD } = toIntro(3);
  assert.strictEqual(CD.title.introSkippable(), true, 'the intro is skippable while the narration runs');
  assert.strictEqual(typeof CD.title.SKIP_HINT, 'string', 'the skip hint text is exported');
  assert(/START/.test(CD.title.SKIP_HINT), 'the hint names the START button');
}

// ---- START skips the narration and lands on name entry ----
{
  const { h, CD } = toIntro(4);
  assert(/Locomotia/.test(h.topText()), 'the first line welcomes the player to Locomotia');
  h.press('start', 2);
  assert(h.top() instanceof CD.title.NameEntry, 'START jumps straight to name entry');
  assert.strictEqual(CD.title.introSkippable(), false, 'once skipped, the skip is spent');
  // the START that skipped must not also finish the name entry
  assert.strictEqual(h.top().done, undefined, 'name entry is still open after the skip');
  for (const ch of 'ab') { h.press('a', 2); h.press('right', 2); }
  h.press('start', 4);
  assert.strictEqual(CD.state.name, 'AB', 'the typed name is kept after skipping');
  // the closing lines are skipped too: no text box before the bedroom
  let sawText = false;
  const reached = h.until(() => {
    if (h.top() instanceof CD.ui.TextBox) sawText = true;
    return h.top() === CD.overworld.scene && CD.fx.a === 0;
  }, 400);
  assert(reached, 'the skipped intro ends in the bedroom');
  assert.strictEqual(sawText, false, 'no narration plays after the name once skipped');
  assert.strictEqual(CD.state.map, 'PlayerHouse2F', 'a skipped intro starts in the same place');
}

// ---- without START, the full narration still plays ----
{
  const { h, CD } = toIntro(5);
  let lines = 0, last = null;
  assert(h.until(() => {
    const t = h.top();
    if (t instanceof CD.ui.TextBox && t !== last) { last = t; lines++; }
    return t instanceof CD.title.NameEntry;
  }, 6000, 'a'), 'mashing A reaches name entry');
  assert(lines >= 5, 'all of the opening narration played (' + lines + ' boxes)');
}

console.log('intro-skip.test.js passed');
