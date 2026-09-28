// The scene loop: a script that throws is cleaned up (its scenes removed, the
// controls unlocked) instead of freezing the game behind an orphaned text box.
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load();
const CD = h.CD, E = CD.engine;
const seen = [];
CD.onError = (e, name) => seen.push(name + ':' + e.message);
CD.newState();
CD.overworld.enterMap('PistonTown', 5, 6, 'down', { quiet: true });
E.push(CD.overworld.scene);
CD.overworld.script(function* () { yield* CD.ui.say('Hello'); }(), 'ok');
h.step(3);
assert.strictEqual(E.top().constructor.name, 'TextBox', 'the script opened a text box');
const box = new CD.ui.TextBox('This box belongs to a script that fails.');
CD.overworld.script(function* () { E.push(box); yield; yield; throw new Error('boom'); }(), 'bad');
h.step(5);
assert(seen.some(s => s === 'bad:boom'), 'the error was reported');
assert(!E.scenes.includes(box), "the failed script's scene was removed");
h.until(() => !CD.ow.locked, 2000, 'a');
assert.strictEqual(CD.ow.locked, 0, 'controls unlocked');
console.log('engine.test: ok');
