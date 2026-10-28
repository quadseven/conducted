'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load();
const C = h.CD;

// Legacy sound state becomes independent volume settings.
for (const [sound, expected] of [[true, 10], [false, 0]]) {
  const s = C.freshState();
  s.options = { sound };
  const restored = C.save.deserialize(JSON.stringify({ v: 1, state: s }));
  assert.strictEqual(restored.options.musicVolume, expected);
  assert.strictEqual(restored.options.sfxVolume, expected);
}
C.state.options.musicVolume = 3;
C.state.options.sfxVolume = 7;
const restored = C.save.deserialize(C.save.serialize(C.state));
assert.strictEqual(restored.options.musicVolume, 3);
assert.strictEqual(restored.options.sfxVolume, 7);

// Verify the actual Web Audio bus gains and pre-unlock settings.
{
  const audio = H.load();
  const gains = [];
  audio.ctx.setInterval = () => 0;
  audio.ctx.AudioContext = class {
    constructor() { this.destination = {}; this.sampleRate = 32; this.state = 'running'; }
    createGain() { const gain = { gain: { value: 0 }, connect() {} }; gains.push(gain); return gain; }
    createBiquadFilter() { return { frequency: {}, connect() {} }; }
    createPeriodicWave() { return {}; }
    createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
  };
  audio.CD.audio.setMusicVolume(4);
  audio.CD.audio.unlock();
  assert.strictEqual(gains[1].gain.value, 0.55 * 4 / 10);
  assert.strictEqual(gains[2].gain.value, 0.8);
  audio.CD.audio.setMusicVolume(0);
  assert.strictEqual(gains[1].gain.value, 0);
  assert.strictEqual(gains[2].gain.value, 0.8);
  audio.CD.audio.setSfxVolume(0);
  assert.strictEqual(gains[1].gain.value, 0);
  assert.strictEqual(gains[2].gain.value, 0);
  audio.CD.audio.setMusicVolume(7);
  assert.strictEqual(gains[2].gain.value, 0);
}

// Exercise the actual options generator and observe its independent settings.
const seen = [];
const picks = [1, 2, 4];
C.ui.choose = function* (items) { seen.push(Array.from(items)); return picks.shift(); };
const calls = [];
C.audio.setMusicVolume = v => calls.push(['music', v]);
C.audio.setSfxVolume = v => calls.push(['sfx', v]);
const g = C.menu.options();
g.next();
assert(seen[0].some(x => x.startsWith('MUSIC:')));
assert(seen[0].some(x => x.startsWith('SFX:')));
assert.deepStrictEqual(calls, [['music', 4], ['sfx', 8]]);
console.log('audio-volume.test: ok');
{
  const game = H.load();
  const G = game.CD;
  G.engine.spawn(G.menu.options(), 'volume-options');
  game.step(2);
  assert(game.top().items.some(x => x.startsWith('MUSIC:')));
  assert(game.top().items.some(x => x.startsWith('SFX:')));
  game.press('down');
  game.press('a');
  assert.strictEqual(G.state.options.musicVolume, 0);
  game.press('down');
  game.press('down');
  game.press('a');
  assert.strictEqual(G.state.options.sfxVolume, 0);
}
{
  const game = H.load();
  const G = game.CD;
  G.overworld.enterMap('Route1', 9, 20, 'up', { quiet: true });
  G.state.options.musicVolume = 2;
  G.state.options.sfxVolume = 8;
  assert(G.save.save().ok);
  G.state.options.musicVolume = 9;
  G.state.options.sfxVolume = 9;
  assert(G.save.load().ok);
  assert.strictEqual(G.state.options.musicVolume, 2);
  assert.strictEqual(G.state.options.sfxVolume, 8);
  const legacy = JSON.parse(game.store.get(G.save.KEY));
  legacy.state.options = { sound: false };
  game.store.set(G.save.KEY, JSON.stringify(legacy));
  assert(G.save.load().ok);
  assert.strictEqual(G.state.options.musicVolume, 0);
  assert.strictEqual(G.state.options.sfxVolume, 0);
  G.engine.spawn(G.menu.options(), 'unmute-old-save');
  game.step(2);
  game.press('down');
  game.press('a');
  assert.strictEqual(G.state.options.sound, true);
  assert.strictEqual(G.audio.muted, false);
  assert.strictEqual(G.state.options.musicVolume, 1);
}
