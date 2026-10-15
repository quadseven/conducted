// Every song compiles; in looping songs all channels share one loop length and
// loop point, so parts never drift apart after the first repeat.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load();
const songs = h.CD.audio.songs;
const ids = Object.keys(songs);
assert(ids.length >= 9, 'songs defined');
const maps = Object.values(h.CD.world.maps);
for (const map of maps) {
  assert(map.music, `${map.id} has location music`);
  assert(songs[map.music], `${map.id} references a defined song: ${map.music}`);
}
for (const id of ['title', 'lab', 'piston', 'route1', 'harbor', 'depot', 'gym', 'wild', 'trainer', 'leader', 'victoryWild', 'victoryTrainer', 'heal', 'levelup', 'caught']) {
  assert(songs[id], `required music or event cue exists: ${id}`);
}
const fs = require('fs');
const path = require('path');
const assetMap = fs.readFileSync(path.join(__dirname, '..', 'AUDIO_ASSET_MAP.md'), 'utf8');
for (const id of ids) assert(assetMap.includes(`\`${id}\``), `asset map documents ${id}`);
for (const id of ids) {
  const s = songs[id];
  assert(s.chans.length >= 2, id + ' has parts');
  for (const c of s.chans) assert(c.ev.length > 0, id + ' channel has notes');
  if (!s.loop) continue;
  const L = s.chans.map(c => +(c.len - c.loopAt).toFixed(4));
  const A = s.chans.map(c => +c.loopAt.toFixed(4));
  assert(L.every(x => x === L[0]), `${id} loop lengths match: ${L.join(', ')}`);
  assert(A.every(x => x === A[0]), `${id} loop points match: ${A.join(', ')}`);
}
// the MML reader
const c = h.CD.audio.compile('o4 l8 c d e4. [f g]2 | r2 c+ d-');
assert.strictEqual(c.ev[0].midi, 60, 'c4 is middle C');
assert.strictEqual(c.ev[2].dur, 1.5, 'dotted quarter');
assert.strictEqual(c.ev.filter(e => e.midi === 65).length, 2, 'repeat plays twice');
assert.strictEqual(c.loopAt, 4.5, 'loop point after the repeat (0.5+0.5+1.5+4x0.5 beats)');
assert.strictEqual(c.ev[c.ev.length - 1].midi, 61, 'd- is c#');
console.log('audio.test: ok (' + ids.length + ' songs)');
