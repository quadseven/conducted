// Runaway Junction: tests for the track graph, switching, signals,
// scheduling, collisions and coupling. Run with: node tests/dispatch-logic.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const L = require('../js/dispatch/logic.js');
const A = require('../js/dispatch/art.js');
const S = require('../js/dispatch/sound.js');
const { N, E, S: SOUTH, W } = L;

const bare = (extra) => L.createWorld(Object.assign({ player: false, runaway: false, autoServices: false }, extra));
const run = (world, seconds, each) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
        if (each) each(world);
        L.step(world, 1 / 60);
        if (world.status === 'crashed') break;
    }
    return world;
};
const headTile = t => t.path[t.path.length - 1];
const tileAt = (w, x, y) => w.layout.tiles.get(L.key(x, y));

test('the default yard is a sound track graph', () => {
    const layout = L.buildLayout(L.YARD);
    assert.deepEqual(L.validateLayout(layout), []);
    assert.equal(layout.tiles.get('9,1').kind, 'switch');
    assert.equal(layout.tiles.get('2,5').kind, 'crossing');
    assert.equal(layout.tiles.get('9,6').kind, 'crossing');
    assert.equal(layout.tiles.get('13,7').kind, 'end');
    assert.equal(layout.tiles.get('2,1').kind, 'curve');
    assert.equal(layout.tiles.get('5,1').kind, 'track');
    assert.equal(layout.switches.length, 3);
});

test('validation flags junctions without points and a badly placed trunk', () => {
    const noPoints = L.buildLayout({ width: 5, height: 5, lines: [[[0, 2], [4, 2]], [[2, 2], [2, 4]]] });
    assert.ok(L.validateLayout(noPoints).some(p => p.includes('without points')));
    const badTrunk = L.buildLayout({ width: 5, height: 5, lines: [[[0, 2], [4, 2]], [[2, 2], [2, 4]]], switches: [{ x: 2, y: 2, trunk: SOUTH, id: 'X' }] });
    assert.ok(L.validateLayout(badTrunk).some(p => p.includes('trunk')));
    const dangling = L.buildLayout({ width: 3, height: 3, lines: [[[0, 1], [2, 1]]] });
    assert.deepEqual(L.validateLayout(dangling), [], 'buffer stops at both ends are legal');
    assert.throws(() => L.buildLayout({ width: 3, height: 3, lines: [[[0, 0], [2, 2]]] }), /straight/);
});

test('points route facing moves by their setting and trailing moves to the trunk', () => {
    const w = bare();
    const layout = w.layout;
    // P1 at (9,1): trunk W, straight E, branch S
    assert.equal(L.exitFor(layout, 9, 1, W), E);
    tileAt(w, 9, 1).sw.diverge = true;
    assert.equal(L.exitFor(layout, 9, 1, W), SOUTH);
    assert.equal(L.exitFor(layout, 9, 1, E), W, 'trailing from the straight leg');
    assert.equal(L.exitFor(layout, 9, 1, SOUTH), W, 'trailing from the branch');
    // crossings run straight through, buffers stop, off-map runs straight
    assert.equal(L.exitFor(layout, 9, 5, N), SOUTH);
    assert.equal(L.exitFor(layout, 9, 5, W), E);
    assert.equal(L.exitFor(layout, 13, 7, SOUTH), -1);
    assert.equal(L.exitFor(layout, 25, 5, W), E);
    assert.equal(L.exitFor(layout, 5, 1, N), -2, 'entering a side with no rail derails');
});

test('a train advances along the track at its speed and follows curves', () => {
    const w = bare();
    const t = L.addTrain(w, { kind: 'runaway', x: 4, y: 1, dir: E, cars: 1, speed: 2, maxSpeed: 2 });
    run(w, 1.05);
    assert.deepEqual([headTile(t).x, headTile(t).y], [6, 1]);
    // around the top-right corner and down the right side
    t.speed = 4;
    run(w, 3.5);
    const h = headTile(t);
    assert.equal(h.x, 17);
    assert.ok(h.y >= 3, 'turned the corner onto the right-hand side');
    const pt = L.pointBack(t, 0);
    assert.ok(Math.abs(pt.x - 17.5) < 1e-9, 'stays on the rail centre line');
});

test('throwing the points sends a train down the branch', () => {
    const w = bare();
    const t = L.addTrain(w, { kind: 'runaway', x: 6, y: 1, dir: E, cars: 1, speed: 3, maxSpeed: 3 });
    assert.ok(L.toggleSwitch(w, 9, 1));
    run(w, 2);
    assert.equal(headTile(t).x, 9);
    assert.ok(headTile(t).y > 1, 'went south down the middle line');
    const ev = L.takeEvents(w);
    assert.ok(ev.some(e => e.type === 'points' && e.diverge === true));
});

test('points under a train are locked', () => {
    const w = bare();
    L.addTrain(w, { kind: 'runaway', x: 9, y: 1, dir: E, cars: 1, speed: 0 });
    assert.equal(L.toggleSwitch(w, 9, 1), false);
    assert.equal(tileAt(w, 9, 1).sw.diverge, false);
    assert.ok(L.takeEvents(w).some(e => e.type === 'locked'));
});

test('passenger trains hold at a red gate and go on green', () => {
    const w = bare();
    L.toggleGate(w, 'B');
    const s = L.addTrain(w, { kind: 'service', line: 'east', x: 5, y: 5, dir: E, cars: 2, speed: 2.5, maxSpeed: 2.5, due: 999 });
    run(w, 6);
    assert.equal(w.status, 'running');
    assert.equal(headTile(s).x, 8, 'stopped in the tile before the crossing');
    assert.ok(s.speed < 0.05);
    assert.ok(s.waiting);
    L.toggleGate(w, 'B');
    run(w, 2);
    assert.ok(headTile(s).x > 9, 'crossed once the gate opened');
});

test('passenger trains call at their station, leave the map and score', () => {
    const w = bare();
    const s = L.addTrain(w, { kind: 'service', line: 'east', x: 0, y: 5, dir: E, cars: 2, speed: 3, maxSpeed: 3, due: 60 });
    let dwelt = 0;
    run(w, 30, () => { if (s.waiting && headTile(s).x === 13) dwelt += 1 / 60; });
    assert.ok(dwelt >= L.TUNING.stationDwell - 0.1, 'waited at the platform, dwell ' + dwelt.toFixed(2));
    assert.ok(s.served.copper);
    assert.equal(w.trains.length, 0, 'left through the far portal');
    assert.equal(w.onTime, 1);
    assert.equal(w.score, 100);
});

test('a held passenger train arrives late and scores less', () => {
    const w = bare();
    L.toggleGate(w, 'C');
    L.addTrain(w, { kind: 'service', line: 'east', x: 0, y: 5, dir: E, cars: 2, speed: 3, maxSpeed: 3, due: 10 });
    run(w, 14);
    L.toggleGate(w, 'C');
    run(w, 10);
    assert.equal(w.late, 1);
    assert.equal(w.score, 40);
});

test('the schedule spawns services at their portals in order', () => {
    const w = L.createWorld({ player: false, runaway: false, seed: 9, schedule: [{ at: 0.5, line: 'west', cars: 2, speed: 2 }, { at: 1, line: 'east', cars: 2, speed: 2 }] });
    run(w, 0.4);
    assert.equal(w.trains.length, 0);
    run(w, 0.8);
    assert.equal(w.trains.length, 2);
    const west = w.trains.find(t => t.line === 'west');
    assert.equal(headTile(west).y, 6);
    assert.ok(headTile(west).x <= 19);
});

test('schedules replay exactly per seed and tighten with each round', () => {
    const a = L.buildSchedule(2, 42), b = L.buildSchedule(2, 42), c = L.buildSchedule(2, 43);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    for (let i = 1; i < a.length; i++) assert.ok(a[i].at > a[i - 1].at);
    const gap = s => (s[s.length - 1].at - s[0].at) / (s.length - 1);
    assert.ok(gap(L.buildSchedule(6, 1)) < gap(L.buildSchedule(1, 1)));
    assert.ok(L.roundSettings(5).runawayCap > L.roundSettings(1).runawayCap);
    assert.ok(L.roundSettings(20).runawayCap < L.TUNING.playerMax, 'the engine can always outrun the runaway');
});

test('a runaway in a crossing with a passenger train is a wreck', () => {
    const w = bare();
    L.addTrain(w, { kind: 'service', line: 'east', x: 5, y: 5, dir: E, cars: 2, speed: 2, maxSpeed: 2, due: 99 });
    L.addTrain(w, { kind: 'runaway', x: 9, y: 2, dir: SOUTH, cars: 2, speed: 1.5, maxSpeed: 1.5 });
    run(w, 5);
    assert.equal(w.status, 'crashed');
    assert.equal(w.crash.why, 'collision');
    assert.ok(Math.abs(w.crash.x - 9.5) < 1 && w.crash.y > 4.5 && w.crash.y < 7);
});

test('closing the gate in time prevents the same wreck', () => {
    const w = bare();
    L.toggleGate(w, 'B');
    L.addTrain(w, { kind: 'service', line: 'east', x: 5, y: 5, dir: E, cars: 2, speed: 2, maxSpeed: 2, due: 99 });
    L.addTrain(w, { kind: 'runaway', x: 9, y: 2, dir: SOUTH, cars: 2, speed: 1.5, maxSpeed: 1.5 });
    run(w, 5);
    assert.equal(w.status, 'running');
});

function chase(playerSpeed, runawaySpeed) {
    const w = L.createWorld({ autoServices: false, player: false, runaway: false });
    w.runaway = L.addTrain(w, { kind: 'runaway', x: 8, y: 1, dir: E, cars: 2, speed: runawaySpeed, maxSpeed: runawaySpeed });
    w.player = L.addTrain(w, { kind: 'player', x: 5, y: 1, dir: E, cars: 1, speed: playerSpeed, maxSpeed: L.TUNING.playerMax });
    return w;
}

test('a gentle same-way touch couples, then braking catches the runaway', () => {
    const w = chase(3, 2.2);
    let coupledAt = null;
    run(w, 8, ww => { if (ww.runaway.coupled && coupledAt == null) coupledAt = ww.time; ww.player.throttle = ww.runaway.coupled ? -1 : 0; });
    assert.ok(coupledAt != null, 'coupled');
    assert.equal(w.status, 'caught');
    assert.equal(w.runaway.speed, 0);
    assert.ok(w.score >= 500);
});

test('ramming the runaway too fast is a wreck, not a coupling', () => {
    const w = chase(5.5, 1);
    run(w, 4, ww => { ww.player.throttle = 1; });
    assert.equal(w.status, 'crashed');
    assert.equal(w.runaway.coupled, false);
});

test('meeting the runaway head-on is always a wreck', () => {
    const w = L.createWorld({ autoServices: false, player: false, runaway: false });
    w.runaway = L.addTrain(w, { kind: 'runaway', x: 12, y: 1, dir: W, cars: 2, speed: 1, maxSpeed: 1 });
    w.player = L.addTrain(w, { kind: 'player', x: 5, y: 1, dir: E, cars: 1, speed: 1, maxSpeed: 1 });
    run(w, 6, ww => { ww.player.throttle = 1; });
    assert.equal(w.status, 'crashed');
});

test('the sand drag brings the runaway to a stand and secures it', () => {
    const w = L.createWorld({ autoServices: false, player: false, runaway: false, round: 8 });
    const cap = L.roundSettings(8).runawayCap;
    w.runaway = L.addTrain(w, { kind: 'runaway', x: 16, y: 10, dir: W, cars: 2, speed: cap, maxSpeed: cap, accel: 0.1 });
    L.toggleSwitch(w, 13, 10);
    run(w, 6);
    assert.equal(w.status, 'secured', 'even at the fastest runaway speed');
    assert.ok(w.score > 0);
});

test('buffer stops: fast is a wreck, slow is a stop', () => {
    const fast = L.createWorld({ autoServices: false, player: false, runaway: false });
    L.addTrain(fast, { kind: 'player', x: 13, y: 10, dir: N, cars: 1, speed: 5, maxSpeed: 5 });
    fast.layout.tiles.get('13,9').drag = fast.layout.tiles.get('13,8').drag = fast.layout.tiles.get('13,7').drag = false;
    fast.trains[0].throttle = 1;
    run(fast, 3, w => { w.trains[0].throttle = 1; });
    assert.equal(fast.status, 'crashed');
    assert.equal(fast.crash.why, 'buffer');

    const slow = L.createWorld({ autoServices: false, player: false, runaway: false });
    const t = L.addTrain(slow, { kind: 'player', x: 13, y: 10, dir: N, cars: 1, speed: 1, maxSpeed: 1 });
    run(slow, 6);
    assert.equal(slow.status, 'running');
    assert.equal(t.speed, 0);
    assert.deepEqual([headTile(t).x, headTile(t).y], [13, 7]);
});

test('reversing keeps the engine where it stands and is refused while moving', () => {
    const w = L.createWorld({ autoServices: false, runaway: false });
    const p = w.player;
    p.speed = 2;
    assert.equal(L.reversePlayer(w), false, 'moving');
    run(w, 1.3, ww => { ww.player.throttle = 0; });
    p.speed = 0;
    const before = L.carPoses(p)[0];
    assert.ok(L.reversePlayer(w));
    const after = L.carPoses(p)[0];
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 0.02, 'the body does not jump');
    const turn = Math.abs(Math.atan2(Math.sin(after.angle - before.angle), Math.cos(after.angle - before.angle)));
    assert.ok(Math.abs(turn - Math.PI) < 0.02, 'it now faces the other way');
    const oldY = L.pointBack(p, 0).y;
    p.speed = 2;
    run(w, 1);
    assert.ok(L.pointBack(p, 0).y > oldY, 'now drives south');
});

test('lookahead finds the next facing points and open gates in the runaway\'s path', () => {
    const w = L.createWorld({ autoServices: false });
    assert.equal(L.nextFacingSwitch(w, w.runaway).sw.id, 'P3', 'round the corner to the sand drag points');
    const t = L.addTrain(w, { kind: 'runaway', x: 5, y: 1, dir: E, cars: 1, speed: 1 });
    assert.equal(L.nextFacingSwitch(w, t).sw.id, 'P1');
    assert.deepEqual([...L.gatesAtRisk(w, w.runaway, 14)], ['C']);
    L.toggleGate(w, 'C');
    assert.deepEqual([...L.gatesAtRisk(w, w.runaway, 14)], []);
});

test('a long random session never produces bad state', () => {
    const r = L.rng(77);
    for (let game = 0; game < 6; game++) {
        const w = L.createWorld({ seed: game + 1, round: 1 + game });
        run(w, 90, ww => {
            if (!ww.player) return;
            if (r() < 0.02) ww.player.throttle = [-1, 0, 1][Math.floor(r() * 3)];
            if (r() < 0.004) L.toggleGate(ww, 'ABC'[Math.floor(r() * 3)]);
            if (r() < 0.004) { const s = ww.layout.switches[Math.floor(r() * 3)]; L.toggleSwitch(ww, s.x, s.y); }
            if (r() < 0.003) L.reversePlayer(ww);
        });
        for (const t of w.trains) {
            for (const p of L.trainPoints(t)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
            assert.ok(t.speed >= 0 && t.speed <= Math.max(t.maxSpeed, L.TUNING.playerMax) + 1e-9);
        }
        assert.ok(['running', 'crashed', 'caught', 'secured'].includes(w.status));
    }
});

test('the renderer paints a full frame from code alone', () => {
    const w = L.createWorld({ seed: 3 });
    run(w, 3);
    const r = new A.Renderer(w.layout, 5);
    const bgOnly = r.draw({ time: 0, trains: [] }).data.slice();
    const f = r.draw({ time: 3, trains: w.trains, banner: 'ROUND 1', sub: 'CATCH THE RUNAWAY!' });
    assert.equal(f.w, 320);
    assert.equal(f.h, 192);
    const colors = new Set(f.data);
    assert.ok(colors.size > 60, 'rich palette, got ' + colors.size);
    assert.ok(!colors.has(0), 'every pixel painted');
    const p = L.pointBack(w.runaway, 0.5);
    const i = Math.floor(p.y * 16) * 320 + Math.floor(p.x * 16);
    assert.notEqual(f.data[i], bgOnly[i], 'the runaway is drawn');
    for (const [k, g] of Object.entries(A.GLYPHS)) assert.equal(g.length, 15, 'glyph ' + k);
});

test('the game ships no image or audio files', () => {
    const root = path.join(__dirname, '..');
    const files = ['runaway.html', 'js/dispatch/logic.js', 'js/dispatch/art.js', 'js/dispatch/sound.js', 'js/dispatch/main.js'];
    for (const f of files) {
        const src = fs.readFileSync(path.join(root, f), 'utf8');
        assert.doesNotMatch(src, /\.(png|jpe?g|gif|webp|mp3|wav|ogg|m4a)\b/i, f);
        assert.doesNotMatch(src, /(src|href)\s*=\s*["']https?:|fetch\(|XMLHttpRequest|import\(/i, f + ' fetches nothing from the network');
    }
});

test('the music composer is deterministic and stays in range', () => {
    const a = S.compose(11, 'major'), b = S.compose(11, 'major');
    assert.deepEqual(a, b);
    assert.equal(a.bars.length, 8);
    for (const bar of a.bars) for (const n of bar.lead) {
        assert.ok(n.step >= 0 && n.step < 16 && n.len >= 1);
        assert.ok(n.deg >= 4 && n.deg <= 16);
    }
    // the answer phrase reuses the opening rhythm
    assert.deepEqual(a.bars[2].lead.map(n => n.step), a.bars[0].lead.map(n => n.step));
    assert.equal(S.degToMidi(57, S.MAJOR, 7), 69);
    assert.ok(Math.abs(S.midiHz(69) - 440) < 1e-9);
});
