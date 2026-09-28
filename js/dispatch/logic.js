// Runaway Junction: pure simulation logic.
//
// No DOM, no canvas, no audio. The browser page and the Node tests load the
// same file. Everything is measured in tiles and seconds.
//
// Track model
//   The yard is a grid. Each track tile lists the sides it connects to
//   (N, E, S, W). Two sides make plain track or a curve, three sides make a
//   set of points (a switch), four make a diamond crossing, one makes a buffer
//   stop. A switch names its trunk side: a train entering from the trunk takes
//   whichever leg the points are set for; a train entering from either leg
//   always leaves by the trunk.
//
// Train model
//   A train is a list of tile segments it has driven through, newest last,
//   plus a progress value in [0, 1) along the newest one. Cars trail the head
//   at one tile per car, so any point on a train is "distance s back from the
//   head", measured along the segments.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DispatchLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const N = 0, E = 1, S = 2, W = 3;
    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];
    const DIR_NAMES = 'NESW';
    const opp = d => (d + 2) & 3;
    const key = (x, y) => x + ',' + y;
    const bit = d => 1 << d;

    const TUNING = {
        playerMax: 5.5,
        playerAccel: 2.4,
        playerBrake: 4.5,
        coupledBrake: 2.2,
        friction: 0.25,
        dragDecel: 6,
        serviceAccel: 2,
        serviceDecel: 3,
        bufferCrashSpeed: 1.6,
        crashDistance: 0.55,
        coupleDistance: 0.8,
        coupleSpeed: 1.6,
        stationDwell: 1.6,
        spawnClear: 2.2,
        lateSlack: 5
    };

    // ------------------------------------------------------------------
    // Seeded random numbers (mulberry32), so schedules replay exactly.
    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ------------------------------------------------------------------
    // Layout

    // The default yard. A clockwise loop, a shortcut down the middle, a sand
    // drag siding, and a double-track passenger line that cuts straight
    // across all three at level crossings guarded by gates A, B and C.
    const YARD = {
        name: 'Copper Junction Yard',
        width: 20,
        height: 12,
        lines: [
            [[2, 1], [17, 1], [17, 10], [2, 10], [2, 1]],
            [[9, 1], [9, 10]],
            [[13, 10], [13, 7]],
            [[0, 5], [19, 5]],
            [[0, 6], [19, 6]]
        ],
        switches: [
            { x: 9, y: 1, trunk: W, id: 'P1' },
            { x: 9, y: 10, trunk: W, id: 'P2' },
            { x: 13, y: 10, trunk: E, id: 'P3' }
        ],
        drag: [[13, 9], [13, 8], [13, 7]],
        portals: [
            { x: 0, y: 5, side: W, line: 'east', role: 'in' },
            { x: 19, y: 5, side: E, line: 'east', role: 'out' },
            { x: 19, y: 6, side: E, line: 'west', role: 'in' },
            { x: 0, y: 6, side: W, line: 'west', role: 'out' }
        ],
        gates: [
            { id: 'A', tiles: [[2, 5], [2, 6]], signals: [{ x: 1, y: 4, faces: E }, { x: 3, y: 7, faces: W }] },
            { id: 'B', tiles: [[9, 5], [9, 6]], signals: [{ x: 8, y: 4, faces: E }, { x: 10, y: 7, faces: W }] },
            { id: 'C', tiles: [[17, 5], [17, 6]], signals: [{ x: 16, y: 4, faces: E }, { x: 18, y: 7, faces: W }] }
        ],
        stations: [
            { id: 'copper', name: 'COPPER JCT', line: 'east', stop: [13, 5], platform: { x: 11, y: 4, w: 5 }, building: { x: 11, y: 3, w: 5 } },
            { id: 'harbor', name: 'HARBOR', line: 'west', stop: [6, 6], platform: { x: 5, y: 7, w: 3 }, building: { x: 5, y: 8, w: 3 } }
        ],
        playerStart: { x: 2, y: 8, dir: N },
        runawayStart: { x: 12, y: 1, dir: E }
    };

    function buildLayout(def) {
        const tiles = new Map();
        const tileAt = (x, y) => {
            const k = key(x, y);
            let t = tiles.get(k);
            if (!t) { t = { x, y, conns: 0, kind: 'track', drag: false, portal: null, sw: null }; tiles.set(k, t); }
            return t;
        };
        const link = (x, y, d) => {
            tileAt(x, y).conns |= bit(d);
            tileAt(x + DX[d], y + DY[d]).conns |= bit(opp(d));
        };
        for (const line of def.lines) {
            for (let i = 0; i + 1 < line.length; i++) {
                let [x, y] = line[i];
                const [tx, ty] = line[i + 1];
                if (x !== tx && y !== ty) throw new Error('line segments must be straight: ' + line[i] + ' -> ' + line[i + 1]);
                const d = tx > x ? E : tx < x ? W : ty > y ? S : N;
                while (x !== tx || y !== ty) { link(x, y, d); x += DX[d]; y += DY[d]; }
            }
        }
        for (const p of def.portals || []) {
            const t = tiles.get(key(p.x, p.y));
            if (!t) throw new Error('portal off track at ' + key(p.x, p.y));
            t.conns |= bit(p.side);
            t.portal = p;
        }
        for (const [x, y] of def.drag || []) {
            const t = tiles.get(key(x, y));
            if (!t) throw new Error('drag off track at ' + key(x, y));
            t.drag = true;
        }
        const switches = [];
        for (const s of def.switches || []) {
            const t = tiles.get(key(s.x, s.y));
            if (!t) throw new Error('switch off track at ' + key(s.x, s.y));
            t.sw = { id: s.id, trunk: s.trunk, diverge: false };
            switches.push(t);
        }
        for (const t of tiles.values()) {
            const n = popcount(t.conns);
            t.kind = n === 1 ? 'end' : n === 2 ? (isStraight(t.conns) ? 'track' : 'curve') : n === 3 ? 'switch' : 'crossing';
        }
        const gates = (def.gates || []).map(g => ({ id: g.id, tiles: g.tiles.map(([x, y]) => key(x, y)), cells: g.tiles, signals: g.signals, red: false }));
        const gateByTile = new Map();
        for (const g of gates) for (const k of g.tiles) gateByTile.set(k, g);
        return {
            name: def.name, width: def.width, height: def.height,
            tiles, switches, gates, gateByTile,
            stations: def.stations || [],
            portals: def.portals || [],
            playerStart: def.playerStart, runawayStart: def.runawayStart
        };
    }

    function popcount(m) { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; }
    function isStraight(m) { return m === (bit(N) | bit(S)) || m === (bit(E) | bit(W)); }
    function has(t, d) { return !!(t.conns & bit(d)); }

    // Problems with a layout, as strings. An empty list means it is sound.
    function validateLayout(layout) {
        const problems = [];
        for (const t of layout.tiles.values()) {
            const inside = t.x >= 0 && t.y >= 0 && t.x < layout.width && t.y < layout.height;
            if (!inside) problems.push('tile outside the map at ' + key(t.x, t.y));
            for (let d = 0; d < 4; d++) {
                if (!has(t, d)) continue;
                const nx = t.x + DX[d], ny = t.y + DY[d];
                const n = layout.tiles.get(key(nx, ny));
                if (n) { if (!has(n, opp(d))) problems.push('one-way link at ' + key(t.x, t.y) + ' ' + DIR_NAMES[d]); }
                else if (!(t.portal && t.portal.side === d)) problems.push('link into nothing at ' + key(t.x, t.y) + ' ' + DIR_NAMES[d]);
            }
            if (t.kind === 'switch') {
                if (!t.sw) problems.push('three-way tile without points at ' + key(t.x, t.y));
                else if (!has(t, t.sw.trunk) || !has(t, opp(t.sw.trunk))) problems.push('points trunk must face a straight leg at ' + key(t.x, t.y));
            } else if (t.sw) problems.push('points on a ' + t.kind + ' tile at ' + key(t.x, t.y));
        }
        return problems;
    }

    // Which side a train leaves a tile by, given the side it came in.
    // -1: buffer stop. Off-map tiles run straight, so trains can drive in
    // and out through portals.
    function exitFor(layout, x, y, entry) {
        const t = layout.tiles.get(key(x, y));
        if (!t) return opp(entry);
        if (!has(t, entry)) return -2;
        if (t.kind === 'end') return -1;
        if (t.kind === 'crossing') return opp(entry);
        if (t.kind === 'switch') {
            const trunk = t.sw.trunk;
            if (entry !== trunk) return trunk;
            if (!t.sw.diverge) return opp(trunk);
            for (let d = 0; d < 4; d++) if (d !== trunk && d !== opp(trunk) && has(t, d)) return d;
        }
        for (let d = 0; d < 4; d++) if (d !== entry && has(t, d)) return d;
        return -1;
    }

    // The leg a switch's points are set for, and the other one.
    function switchLegs(t) {
        const trunk = t.sw.trunk;
        let branch = -1;
        for (let d = 0; d < 4; d++) if (d !== trunk && d !== opp(trunk) && has(t, d)) branch = d;
        return { trunk, straight: opp(trunk), branch, active: t.sw.diverge ? branch : opp(trunk) };
    }

    // ------------------------------------------------------------------
    // Geometry: a point part-way along a tile segment, in tile units.
    function segmentPoint(seg, t) {
        const cx = seg.x + 0.5, cy = seg.y + 0.5;
        const ex = seg.exit;
        if (ex === opp(seg.entry)) {
            const ax = cx + DX[seg.entry] * 0.5, ay = cy + DY[seg.entry] * 0.5;
            const bx = cx + DX[ex] * 0.5, by = cy + DY[ex] * 0.5;
            return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dx: DX[ex], dy: DY[ex] };
        }
        // Quarter circle of radius 0.5 around the corner the two sides share.
        const kx = cx + (DX[seg.entry] + DX[ex]) * 0.5, ky = cy + (DY[seg.entry] + DY[ex]) * 0.5;
        const a0 = Math.atan2(cy + DY[seg.entry] * 0.5 - ky, cx + DX[seg.entry] * 0.5 - kx);
        const a1 = Math.atan2(cy + DY[ex] * 0.5 - ky, cx + DX[ex] * 0.5 - kx);
        let da = a1 - a0;
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        const a = a0 + da * t;
        const sgn = da > 0 ? 1 : -1;
        return { x: kx + Math.cos(a) * 0.5, y: ky + Math.sin(a) * 0.5, dx: -Math.sin(a) * sgn, dy: Math.cos(a) * sgn };
    }

    // A point s tiles back from the train's head, following its path.
    function pointBack(train, s) {
        let i = train.path.length - 1;
        let t = train.progress;
        let rem = s;
        while (rem > t && i > 0) { rem -= t; i--; t = 1; }
        return segmentPoint(train.path[i], Math.max(0, t - rem));
    }

    // Sample points along a whole train: head, every half tile, tail.
    function trainPoints(train) {
        const pts = [];
        const len = train.cars - 0.15;
        for (let s = 0; s < len; s += 0.5) pts.push(pointBack(train, s));
        pts.push(pointBack(train, len));
        return pts;
    }

    // Car centres and headings for drawing.
    function carPoses(train) {
        const out = [];
        for (let i = 0; i < train.cars; i++) {
            const a = pointBack(train, i + 0.08), b = pointBack(train, i + 0.86);
            out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, angle: Math.atan2(a.y - b.y, a.x - b.x), index: i });
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Trains

    let nextTrainId = 1;

    // Place a train with its head entering (x, y) heading `dir`, and lay the
    // rest of it back along the track (or off the map edge, for arrivals).
    function placeTrain(layout, props) {
        const { x, y, dir } = props;
        const entry = opp(dir);
        const head = { x, y, entry, exit: exitFor(layout, x, y, entry) };
        if (head.exit < 0) head.exit = opp(entry);
        const path = [head];
        let cur = head;
        for (let i = 0; i < props.cars + 2; i++) {
            const px = cur.x + DX[cur.entry], py = cur.y + DY[cur.entry];
            const exit = opp(cur.entry);
            const t = layout.tiles.get(key(px, py));
            let pentry = opp(exit);
            if (t) {
                for (let d = 0; d < 4; d++) {
                    if (d !== exit && has(t, d) && exitFor(layout, px, py, d) === exit) { pentry = d; break; }
                }
            }
            cur = { x: px, y: py, entry: pentry, exit };
            path.unshift(cur);
        }
        return {
            id: nextTrainId++,
            kind: props.kind,
            cars: props.cars,
            path,
            progress: props.progress || 0,
            speed: props.speed || 0,
            maxSpeed: props.maxSpeed || TUNING.playerMax,
            accel: props.accel || 0,
            throttle: 0,
            line: props.line || null,
            due: props.due || 0,
            dwell: 0,
            served: {},
            coupled: false,
            stopped: false,
            gone: false
        };
    }

    const head = train => train.path[train.path.length - 1];

    function nextTile(train) {
        const h = head(train);
        return { x: h.x + DX[h.exit], y: h.y + DY[h.exit] };
    }

    // ------------------------------------------------------------------
    // Schedules

    function roundSettings(round) {
        return {
            runawayStart: 1.1 + 0.25 * round,
            runawayAccel: 0.05 + 0.012 * round,
            runawayCap: Math.min(4.9, 2.9 + 0.35 * round),
            serviceGap: Math.max(4.5, 11 - round),
            serviceSpeed: 2.3 + 0.12 * round
        };
    }

    // Service departures for one round, as [{ at, line, cars, speed }].
    function buildSchedule(round, seed, horizon) {
        const r = rng(seed * 7919 + round * 104729);
        const cfg = roundSettings(round);
        const out = [];
        let t = 2 + r() * 2;
        const end = horizon || 600;
        while (t < end) {
            out.push({
                at: Math.round(t * 10) / 10,
                line: r() < 0.5 ? 'east' : 'west',
                cars: r() < 0.3 ? 3 : 2,
                speed: Math.round((cfg.serviceSpeed + r() * 0.8) * 100) / 100
            });
            t += cfg.serviceGap + r() * 4;
        }
        return out;
    }

    // ------------------------------------------------------------------
    // World

    function createWorld(opts) {
        opts = opts || {};
        const layout = buildLayout(opts.layout || YARD);
        const round = opts.round || 1;
        const seed = opts.seed || 1;
        const cfg = roundSettings(round);
        const world = {
            layout, round, seed, cfg,
            time: 0,
            score: opts.score || 0,
            onTime: 0,
            late: 0,
            status: 'running',
            trains: [],
            events: [],
            schedule: opts.schedule || buildSchedule(round, seed),
            nextService: 0,
            player: null,
            runaway: null,
            crash: null,
            autoServices: opts.autoServices !== false
        };
        if (opts.player !== false && layout.playerStart) {
            const p = layout.playerStart;
            world.player = placeTrain(layout, { kind: 'player', x: p.x, y: p.y, dir: p.dir, cars: 1, maxSpeed: TUNING.playerMax });
            world.trains.push(world.player);
        }
        if (opts.runaway !== false && layout.runawayStart) {
            const r = layout.runawayStart;
            world.runaway = placeTrain(layout, { kind: 'runaway', x: r.x, y: r.y, dir: r.dir, cars: 2, speed: cfg.runawayStart, maxSpeed: cfg.runawayCap, accel: cfg.runawayAccel });
            world.trains.push(world.runaway);
        }
        return world;
    }

    function addTrain(world, props) {
        const t = placeTrain(world.layout, props);
        world.trains.push(t);
        return t;
    }

    function occupiedTiles(world, except) {
        const set = new Set();
        for (const tr of world.trains) {
            if (tr === except || tr.gone) continue;
            for (const p of trainPoints(tr)) set.add(key(Math.floor(p.x), Math.floor(p.y)));
        }
        return set;
    }

    // Throw the points at (x, y). Refused while a train stands on them.
    function toggleSwitch(world, x, y) {
        const t = world.layout.tiles.get(key(x, y));
        if (!t || !t.sw) return false;
        if (occupiedTiles(world).has(key(x, y))) {
            world.events.push({ type: 'locked', x, y });
            return false;
        }
        t.sw.diverge = !t.sw.diverge;
        world.events.push({ type: 'points', x, y, diverge: t.sw.diverge });
        return true;
    }

    function toggleGate(world, id) {
        const g = world.layout.gates.find(gg => gg.id === id);
        if (!g) return false;
        g.red = !g.red;
        world.events.push({ type: 'gate', id, red: g.red });
        return true;
    }

    // The first set of points ahead of a train that it will meet from the
    // trunk (the only kind whose setting changes where it goes).
    function nextFacingSwitch(world, train, maxTiles) {
        const layout = world.layout;
        let h = head(train);
        let x = h.x, y = h.y, dir = h.exit;
        for (let i = 0; i < (maxTiles || 40); i++) {
            x += DX[dir]; y += DY[dir];
            const t = layout.tiles.get(key(x, y));
            if (!t) return null;
            const entry = opp(dir);
            if (t.sw && t.sw.trunk === entry) return t;
            const ex = exitFor(layout, x, y, entry);
            if (ex < 0) return null;
            dir = ex;
        }
        return null;
    }

    // The next n tile keys a train will enter with the points as now set.
    function tilesAhead(world, train, n) {
        const layout = world.layout;
        const h = head(train);
        const out = [];
        let x = h.x, y = h.y, dir = h.exit;
        for (let i = 0; i < n; i++) {
            x += DX[dir]; y += DY[dir];
            out.push(key(x, y));
            const ex = exitFor(layout, x, y, opp(dir));
            if (ex < 0) break;
            dir = ex;
        }
        return out;
    }

    // Gates a moving train will reach within n tiles while they stand open.
    function gatesAtRisk(world, train, n) {
        const risk = new Set();
        if (!train || train.speed <= 0) return risk;
        for (const k of tilesAhead(world, train, n)) {
            const g = world.layout.gateByTile.get(k);
            if (g && !g.red) risk.add(g.id);
        }
        return risk;
    }

    // Reverse the player's engine where it stands. The old tail becomes the
    // new head, so the body does not jump.
    function reversePlayer(world) {
        const p = world.player;
        if (!p || p.coupled || Math.abs(p.speed) > 0.01) return false;
        // The drawn body spans 0.08 to cars - 0.14 behind the head, so pivot
        // on its middle.
        let i = p.path.length - 1, t = p.progress, rem = p.cars - 0.06;
        while (rem > t && i > 0) { rem -= t; i--; t = 1; }
        const tailT = Math.max(0, t - rem);
        const flipped = [];
        for (let j = p.path.length - 1; j >= i; j--) {
            const sgm = p.path[j];
            flipped.push({ x: sgm.x, y: sgm.y, entry: sgm.exit, exit: sgm.entry, end: false });
        }
        p.path = flipped;
        p.progress = 1 - tailT;
        if (p.progress >= 1) p.progress = 0.999;
        world.events.push({ type: 'reverse' });
        return true;
    }

    // Would a service have to stop before entering the next tile?
    function serviceBlocked(world, train, occ) {
        const nt = nextTile(train);
        const k = key(nt.x, nt.y);
        const gate = world.layout.gateByTile.get(k);
        if (gate && gate.red) return 'signal';
        if (occ.has(k)) return 'block';
        const h = head(train);
        for (const st of world.layout.stations) {
            if (st.line === train.line && st.stop[0] === h.x && st.stop[1] === h.y && !train.served[st.id]) return 'station';
        }
        return null;
    }

    // Advance a train's head by d tiles. Returns what stopped it, if anything.
    function advance(world, train, d) {
        const layout = world.layout;
        train.progress += d;
        while (train.progress >= 1) {
            const h = head(train);
            const nx = h.x + DX[h.exit], ny = h.y + DY[h.exit];
            const entry = opp(h.exit);
            let exit = exitFor(layout, nx, ny, entry);
            if (exit === -2) return 'derail';
            const deadEnd = exit === -1;
            if (deadEnd) exit = opp(entry);
            train.progress -= 1;
            train.path.push({ x: nx, y: ny, entry, exit, end: deadEnd });
            if (train.path.length > train.cars + 4) train.path.shift();
        }
        const h = head(train);
        if (h.end && train.progress >= 0.5) { train.progress = 0.5; return 'buffer'; }
        return null;
    }

    function offMap(world, train) {
        const L = world.layout;
        return trainPoints(train).every(p => p.x < 0 || p.y < 0 || p.x >= L.width || p.y >= L.height);
    }

    function onDrag(world, train) {
        const h = head(train);
        const t = world.layout.tiles.get(key(h.x, h.y));
        return !!(t && t.drag);
    }

    function spawnDue(world) {
        if (!world.autoServices) return;
        while (world.nextService < world.schedule.length && world.schedule[world.nextService].at <= world.time) {
            const svc = world.schedule[world.nextService];
            const portal = world.layout.portals.find(p => p.line === svc.line && p.role === 'in');
            const occ = occupiedTiles(world);
            let clear = true;
            for (let i = 0; i < TUNING.spawnClear; i++) {
                const d = opp(portal.side);
                if (occ.has(key(portal.x + DX[d] * i, portal.y + DY[d] * i))) clear = false;
            }
            if (!clear) return; // hold the departure until the line clears
            const run = world.layout.width + svc.cars;
            const due = world.time + run / svc.speed + TUNING.stationDwell + TUNING.lateSlack;
            addTrain(world, { kind: 'service', line: svc.line, x: portal.x, y: portal.y, dir: opp(portal.side), cars: svc.cars, speed: svc.speed, maxSpeed: svc.speed, due });
            world.events.push({ type: 'depart', line: svc.line });
            world.nextService++;
        }
    }

    function updatePlayer(world, p, dt) {
        const brake = p.coupled ? TUNING.coupledBrake : TUNING.playerBrake;
        if (p.throttle > 0) p.speed = Math.min(p.maxSpeed, p.speed + TUNING.playerAccel * dt);
        else if (p.throttle < 0) p.speed = Math.max(0, p.speed - brake * dt);
        else p.speed = Math.max(0, p.speed - TUNING.friction * dt);
        if (onDrag(world, p)) p.speed = Math.max(0, p.speed - TUNING.dragDecel * dt);
    }

    function updateRunaway(world, r, dt) {
        if (r.coupled) return;
        if (onDrag(world, r)) {
            r.speed = Math.max(0, r.speed - TUNING.dragDecel * dt);
            if (r.speed === 0 && world.status === 'running') {
                world.status = 'secured';
                world.score += 250 + 25 * world.round;
                world.events.push({ type: 'secured' });
            }
        } else if (!r.stopped) {
            r.speed = Math.min(r.maxSpeed, r.speed + r.accel * dt);
        }
    }

    const HOLD_AT = 0.55;

    function updateService(world, s, dt, occ) {
        const why = serviceBlocked(world, s, occ);
        let target = s.maxSpeed;
        if (why) {
            // Brake to halt with the head just past the middle of the tile,
            // clear of whatever is in the next one.
            const room = Math.max(0, HOLD_AT - s.progress);
            target = Math.min(target, Math.sqrt(2 * TUNING.serviceDecel * room));
            if (why === 'station' && room < 0.05 && s.speed < 0.2) {
                if (s.dwell === 0) world.events.push({ type: 'station', line: s.line });
                s.dwell += dt;
                if (s.dwell >= TUNING.stationDwell) {
                    const h = head(s);
                    for (const st of world.layout.stations) if (st.stop[0] === h.x && st.stop[1] === h.y) s.served[st.id] = true;
                    s.dwell = 0;
                }
            }
        }
        if (s.speed > target) s.speed = Math.max(target, s.speed - TUNING.serviceDecel * 2 * dt);
        else s.speed = Math.min(target, s.speed + TUNING.serviceAccel * dt);
        s.waiting = !!why && s.speed < 0.05;
        // Never roll into a blocked tile. A service already past the hold
        // point when the block appears stops at the tile edge instead.
        const limit = s.progress <= HOLD_AT ? HOLD_AT : 0.995;
        if (why && s.progress + s.speed * dt > limit) s.speed = Math.max(0, (limit - s.progress) / dt);
    }

    // Contact between two trains: coupling if gentle and same-way, else crash.
    function contact(world, a, b) {
        const pa = trainPoints(a), pb = trainPoints(b);
        let best = Infinity, bi = 0, bj = 0;
        for (let i = 0; i < pa.length; i++) {
            for (let j = 0; j < pb.length; j++) {
                const d = Math.hypot(pa[i].x - pb[j].x, pa[i].y - pb[j].y);
                if (d < best) { best = d; bi = i; bj = j; }
            }
        }
        const pr = [a, b];
        const isCatch = pr.includes(world.player) && pr.includes(world.runaway);
        if (isCatch && !world.runaway.coupled && best <= TUNING.coupleDistance) {
            const endA = bi === 0 || bi === pa.length - 1;
            const endB = bj === 0 || bj === pb.length - 1;
            const same = pa[bi].dx * pb[bj].dx + pa[bi].dy * pb[bj].dy > 0.6;
            const gentle = Math.abs(a.speed - b.speed) <= TUNING.coupleSpeed;
            if (endA && endB && same && gentle) return { type: 'couple', x: (pa[bi].x + pb[bj].x) / 2, y: (pa[bi].y + pb[bj].y) / 2 };
        }
        if (best <= TUNING.crashDistance) {
            if (isCatch && world.runaway.coupled) return null;
            return { type: 'crash', x: (pa[bi].x + pb[bj].x) / 2, y: (pa[bi].y + pb[bj].y) / 2 };
        }
        return null;
    }

    function crash(world, x, y, why) {
        if (world.status !== 'running') return;
        world.status = 'crashed';
        world.crash = { x, y, why };
        world.events.push({ type: 'crash', x, y, why });
    }

    // Advance the whole world by dt seconds.
    function step(world, dt) {
        if (world.status === 'crashed') return world;
        world.time += dt;
        spawnDue(world);
        const p = world.player, r = world.runaway;
        if (p) updatePlayer(world, p, dt);
        if (r) updateRunaway(world, r, dt);
        if (p && r && r.coupled) {
            r.speed = p.speed;
            if (p.speed === 0 && world.status === 'running') {
                world.status = 'caught';
                world.score += 500 + 50 * world.round;
                world.events.push({ type: 'caught' });
            }
        }
        for (const t of world.trains) {
            if (t.kind !== 'service' || t.gone) continue;
            const occ = new Set();
            for (const o of world.trains) {
                if (o === t || o.gone || o.kind !== 'service') continue;
                for (const pt of trainPoints(o)) occ.add(key(Math.floor(pt.x), Math.floor(pt.y)));
            }
            updateService(world, t, dt, occ);
        }
        for (const t of world.trains) {
            if (t.gone || t.speed <= 0) continue;
            const before = t.speed;
            const stop = advance(world, t, t.speed * dt);
            if (stop === 'buffer') {
                if (before > TUNING.bufferCrashSpeed) { const h = head(t); crash(world, h.x + 0.5, h.y + 0.5, 'buffer'); }
                t.speed = 0;
                if (t.kind === 'runaway') t.stopped = true;
                if (t === p && r && r.coupled) r.speed = 0;
            } else if (stop === 'derail') {
                const h = head(t); crash(world, h.x + 0.5, h.y + 0.5, 'derail');
            }
        }
        // Services that have driven off the map are finished.
        for (const t of world.trains) {
            if (t.kind === 'service' && !t.gone && t.path.length > t.cars + 2 && offMap(world, t) && head(t).x !== undefined) {
                const h = head(t);
                const L = world.layout;
                if (h.x < 0 || h.x >= L.width) {
                    t.gone = true;
                    const onTime = world.time <= t.due;
                    world.score += onTime ? 100 : 40;
                    if (onTime) world.onTime++; else world.late++;
                    world.events.push({ type: 'arrive', line: t.line, onTime });
                }
            }
        }
        world.trains = world.trains.filter(t => !t.gone);
        // Contacts.
        const live = world.trains;
        for (let i = 0; i < live.length; i++) {
            for (let j = i + 1; j < live.length; j++) {
                const c = contact(world, live[i], live[j]);
                if (!c) continue;
                if (c.type === 'couple') {
                    const shared = (p.speed + r.speed) / 2;
                    p.speed = r.speed = shared;
                    r.coupled = p.coupled = true;
                    world.events.push({ type: 'couple', x: c.x, y: c.y });
                } else {
                    crash(world, c.x, c.y, 'collision');
                }
            }
        }
        return world;
    }

    function takeEvents(world) {
        const ev = world.events;
        world.events = [];
        return ev;
    }

    return {
        N, E, S, W, DX, DY, opp, key,
        TUNING, YARD, rng,
        buildLayout, validateLayout, exitFor, switchLegs,
        segmentPoint, pointBack, trainPoints, carPoses,
        placeTrain, addTrain, nextTile,
        roundSettings, buildSchedule,
        createWorld, step, takeEvents,
        toggleSwitch, toggleGate, nextFacingSwitch, reversePlayer, tilesAhead, gatesAtRisk,
        occupiedTiles
    };
});
