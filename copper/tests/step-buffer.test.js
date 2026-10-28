'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 5 });
const C = h.CD;
C.newState();
C.overworld.enterMap('PistonTown', 4, 5, 'down', { quiet: true });
C.engine.push(C.overworld.scene);
h.step(2);
const p = C.ow.player;
C.input.script('down', true);
h.step(1);
C.input.script('down', false);
assert(p.moving, 'started the first step');
const phases = new Set([p.animPhase]);
const walkFrames = new Map([[p.animPhase, C.chars.frameFor(p.anim * 2 + p.animPhase)]]);
const cameras = [];
let stepFrames = 0;
// A tap released before the first step ends must not be lost.
C.input.script('right', true);
h.step(1);
C.input.script('right', false);
while (p.moving && p.y === 5 && stepFrames++ < 30) {
  phases.add(p.animPhase);
  walkFrames.set(p.animPhase, C.chars.frameFor(p.anim * 2 + p.animPhase));
  h.draw();
  cameras.push(C.ow.cam.y);
  h.step(1);
}
assert(stepFrames >= 12 && stepFrames <= 18, 'normal step takes 200-300 ms at 60 fps');
assert.deepStrictEqual([...phases].sort(), [0, 1, 2, 3], 'all four walk phases appear');
assert.deepStrictEqual([0, 1, 2, 3].map(phase => walkFrames.get(phase)), [0, 1, 0, 2], 'walking uses stand, left, stand, right sprites');
assert(cameras.length > 1 && cameras[cameras.length - 1] > cameras[0], 'camera follows during the step');
assert(cameras.slice(1).every((y, i) => y >= cameras[i] && y - cameras[i] <= 2), 'camera advances smoothly');
assert(h.until(() => p.x === 5 && p.y === 6 && !p.moving, 80), 'queued turn runs after arrival');

// The pointer controller feeds the same buffering path as the keyboard.
const events = {};
const dpad = { id: 'dpad', dataset: {}, classList: { toggle() {} }, closest() { return this; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } };
const doc = { addEventListener(name, fn) { events[name] = fn; },
  getElementById() { return dpad; }, querySelectorAll() { return []; } };
h.ctx.navigator = {};
C.input.bindTouch(doc);
const touch = (type, id, x, y) => events[type]({ pointerId: id, clientX: x, clientY: y,
  target: dpad, preventDefault() {} });
C.overworld.enterMap('PistonTown', 4, 5, 'down', { quiet: true });
touch('pointerdown', 1, 50, 90); h.step(1); touch('pointerup', 1, 50, 90);
touch('pointerdown', 2, 90, 50); h.step(1); touch('pointerup', 2, 90, 50);
assert(h.until(() => p.x === 5 && p.y === 6 && !p.moving, 80), 'a touch tap is buffered during a step');

C.overworld.enterMap('PistonTown', 4, 5, 'down', { quiet: true });
C.input.script('down', true); h.step(1);
C.input.script('right', true); h.step(1); C.input.script('right', false);
assert(h.until(() => p.x === 5 && p.y === 6, 80), 'the buffered turn takes precedence over an older held direction');
C.input.script('down', false);
h.step(20);

C.overworld.enterMap('PistonTown', 4, 5, 'down', { quiet: true });
C.input.script('down', true); h.step(1); C.input.script('down', false);
C.input.script('right', true); h.step(1); C.input.script('right', false);
C.overworld.enterMap('PistonTown', 4, 5, 'down', { quiet: true });
h.step(30);
assert.strictEqual(p.x, 4, 'map entry discards the old queued turn');
assert.strictEqual(p.y, 5, 'map entry does not replay the interrupted step');
C.overworld.enterMap('PistonTown', 4, 5, 'down', { quiet: true });
C.input.script('down', true); h.step(1); C.input.script('down', false);
C.input.script('right', true); h.step(1); C.input.script('right', false);
assert.strictEqual(C.ow.queuedDir, 'right', 'turn is queued before deactivation');
C.overworld.scene.update(false);
assert.strictEqual(C.ow.queuedDir, null, 'deactivation during a step discards the queued turn');
h.step(30);
assert.strictEqual(p.x, 4, 'reactivation does not replay the queued turn');

console.log('step-buffer.test: ok');
