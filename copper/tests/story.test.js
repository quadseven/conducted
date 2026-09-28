// End-to-end: title -> intro -> bedroom -> town -> the Professor's escort -> lab
// -> choose Steamini -> leave for Route 1. Driven only by button presses.
'use strict';
const assert = require('assert');
const H = require('./harness.js');

const h = H.load({ seed: 7 });
const CD = h.CD;
CD.engine.spawn(CD.main.flow(), 'flow');
h.step(20);
h.press('start', 30);
h.press('a', 30);                                   // NEW GAME
assert(h.until(() => h.top() instanceof CD.title.NameEntry, 4000, 'a'), 'reached name entry');
for (const ch of 'ab') { h.press('a', 2); h.press('right', 2); }
h.press('start', 10);
assert.strictEqual(CD.state.name, 'AB', 'typed name is kept');
assert(h.until(() => h.top() === CD.overworld.scene && CD.fx.a === 0, 4000, 'a'), 'in the bedroom');
assert.strictEqual(CD.state.map, 'PlayerHouse2F');

// downstairs and out of the front door
h.route('r4 u3');
assert(h.until(() => CD.state.map === 'PlayerHouse1F' && !CD.ow.locked, 200), 'stairs lead down');
h.route('d3 l4 d3'); h.walk('down', 1);
assert(h.until(() => CD.state.map === 'PistonTown' && !CD.ow.locked, 300), 'front door leads outside');
assert.deepStrictEqual([CD.ow.player.x, CD.ow.player.y], [4, 5], 'stepped off the doorstep');

// try to leave town: the Professor stops us and walks us to the lab
h.route('d1 r5 u6');
assert(h.until(() => CD.state.map === 'CypressLab' && !CD.ow.locked, 6000, 'a'), 'escorted into the lab');
assert(CD.state.flags.escorted && CD.state.flags.labIntro, 'lab intro played');
h.settle();

// walk to the Steamini egg (6,3) and pick it
h.route('r2 u1');
assert.deepStrictEqual([CD.ow.player.x, CD.ow.player.y, CD.ow.player.dir], [6, 4, 'up']);
h.press('a', 10);
assert(h.until(() => h.top() instanceof CD.ui.Choice, 2000, 'a'), 'asked to confirm');
h.press('a', 10);                                   // YES
h.settle(8000);
assert.strictEqual(CD.state.party.length, 1, 'party has the starter');
assert.strictEqual(CD.state.party[0].id, 1, 'starter is Steamini');
assert.strictEqual(CD.state.party[0].level, 5);
assert.strictEqual(CD.state.rivalStarter, 4, 'rival takes the type that beats steam');
assert.strictEqual(CD.state.bag.trainball, 5);
assert.strictEqual(CD.state.bag.potion, 2);

// head out and north onto Route 1 through the seamless connection
h.route('l2 d7'); h.walk('down', 1);
assert(h.until(() => CD.state.map === 'PistonTown' && !CD.ow.locked, 300), 'left the lab');
h.route('l4 u13');
assert.strictEqual(CD.state.map, 'Route1', 'walked north into Route 1');
console.log('story.test: ok (' + CD.state.map + ' ' + CD.ow.player.x + ',' + CD.ow.player.y + ')');
