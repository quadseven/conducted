// Runaway Junction: browser shell. Fixed 60 Hz simulation, keyboard and
// touch input, the HUD, and the bridge from game events to sound and
// particles. The rules live in logic.js, the pixels in art.js.
(function () {
    'use strict';
    const L = window.DispatchLogic, A = window.DispatchArt, S = window.DispatchSound;
    const T = A.T;
    const STEP = 1 / 60;

    const canvas = document.getElementById('rj-canvas');
    const ctx = canvas.getContext('2d');
    const $ = id => document.getElementById(id);
    const hud = {
        round: $('rj-round'), score: $('rj-score'), best: $('rj-best'), onTime: $('rj-ontime'),
        engine: $('rj-engine'), engineBar: $('rj-engine-bar'), runaway: $('rj-runaway'), runawayBar: $('rj-runaway-bar'),
        msg: $('rj-msg'), mute: $('rj-mute')
    };

    const store = {
        get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: keep going without it */ } }
    };

    const sound = new S.Sound();
    sound.setMuted(store.get('rj-muted', '0') === '1');

    let mode = 'title';
    let world = null, renderer = null, image = null;
    let round = 1, best = +store.get('rj-best', '0') || 0;
    let banner = null;            // { title, sub, color, until }
    let modeTimer = 0;
    let chuffPhase = 0, shake = 0;
    const held = { power: false, brake: false };
    const popups = [];

    function setMessage(str) { hud.msg.textContent = str; }

    function fitCanvas() {
        canvas.width = renderer.W;
        canvas.height = renderer.H;
        image = ctx.createImageData(renderer.W, renderer.H);
    }

    function attract() {
        mode = 'title';
        world = L.createWorld({ seed: 1 + Math.floor(Math.random() * 9999), player: false, runaway: false });
        renderer = new A.Renderer(world.layout, 5);
        fitCanvas();
        banner = { title: 'RUNAWAY JUNCTION', sub: 'TAP OR PRESS ENTER TO START' };
        setMessage('A freight car has broken loose. Catch it before it hits a passenger train.');
    }

    function startGame() {
        sound.unlock();
        round = 1;
        newRound(0);
    }

    function newRound(score) {
        const seed = 1 + Math.floor(Math.random() * 99999);
        world = L.createWorld({ round, seed, score });
        renderer = new A.Renderer(world.layout, 5);
        fitCanvas();
        mode = 'play';
        banner = { title: 'ROUND ' + round, sub: 'CATCH THE RUNAWAY!', until: 2.6 };
        setMessage('Chase the red wagons. Match speed to couple, then brake to a stop.');
        sound.play(seed, [57, 60, 55, 62, 59][(round - 1) % 5]);
        sound.fx('horn');
    }

    // ------------------------------------------------------------------
    // Controls

    function throwPoints(id) {
        if (mode !== 'play') return;
        const t = world.layout.switches.find(s => s.sw.id === id);
        if (t) L.toggleSwitch(world, t.x, t.y);
    }
    function throwNext() {
        if (mode !== 'play' || !world.player) return;
        const t = L.nextFacingSwitch(world, world.player);
        if (t) L.toggleSwitch(world, t.x, t.y);
        else setMessage('No points ahead of your engine.');
    }
    function gate(id) { if (mode === 'play') L.toggleGate(world, id); }
    function reverse() {
        if (mode !== 'play') return;
        if (!L.reversePlayer(world)) setMessage(world.player.coupled ? 'Coupled: brake to a stop instead.' : 'Stop the engine before reversing.');
    }
    function togglePause() {
        if (mode === 'play') { mode = 'pause'; banner = { title: 'PAUSED', sub: 'PRESS P OR TAP TO RESUME' }; sound.stop(); }
        else if (mode === 'pause') { mode = 'play'; banner = null; sound.play(world.seed, 57); }
    }
    function toggleMute() {
        sound.setMuted(!sound.muted);
        store.set('rj-muted', sound.muted ? '1' : '0');
        hud.mute.textContent = sound.muted ? 'Sound off' : 'Sound on';
        hud.mute.setAttribute('aria-pressed', sound.muted ? 'true' : 'false');
    }
    function primary() {
        sound.unlock();
        if (mode === 'title' || mode === 'over') startGame();
        else if (mode === 'pause') togglePause();
    }

    const KEYS = {
        ArrowUp: 'power', w: 'power', W: 'power',
        ArrowDown: 'brake', s: 'brake', S: 'brake'
    };
    window.addEventListener('keydown', e => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        sound.unlock();
        const k = e.key;
        if (KEYS[k]) { held[KEYS[k]] = true; e.preventDefault(); return; }
        if (k === ' ') { e.preventDefault(); if (mode === 'play') throwNext(); else primary(); return; }
        if (k === 'Enter') { e.preventDefault(); primary(); return; }
        if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); return; }
        if (k === 'm' || k === 'M') { toggleMute(); return; }
        if (k === 'r' || k === 'R') { reverse(); return; }
        if (k === '1' || k === '2' || k === '3') { throwPoints('P' + k); return; }
        const up = k.toUpperCase();
        if (up === 'A' || up === 'B' || up === 'C') gate(up);
    });
    window.addEventListener('keyup', e => { if (KEYS[e.key]) held[KEYS[e.key]] = false; });
    window.addEventListener('blur', () => { held.power = held.brake = false; });

    // Tap the map: the nearest set of points or gate within reach toggles.
    canvas.addEventListener('pointerdown', e => {
        e.preventDefault();
        sound.unlock();
        if (mode !== 'play') { primary(); return; }
        const r = canvas.getBoundingClientRect();
        const tx = (e.clientX - r.left) / r.width * world.layout.width;
        const ty = (e.clientY - r.top) / r.height * world.layout.height;
        let best = null, bd = 1.7;
        const consider = (d, act) => { if (d < bd) { bd = d; best = act; } };
        for (const t of world.layout.switches) consider(Math.hypot(t.x + 0.5 - tx, t.y + 0.5 - ty), () => L.toggleSwitch(world, t.x, t.y));
        for (const g of world.layout.gates) {
            const spots = g.cells.map(([x, y]) => [x + 0.5, y + 0.5]).concat(g.signals.map(s => [s.x + 0.5, s.y + 0.5]));
            for (const [x, y] of spots) consider(Math.hypot(x - tx, y - ty), () => L.toggleGate(world, g.id));
        }
        if (best) best();
    });

    for (const btn of document.querySelectorAll('[data-hold]')) {
        const k = btn.getAttribute('data-hold');
        const on = e => { e.preventDefault(); sound.unlock(); held[k] = true; btn.classList.add('down'); if (btn.setPointerCapture) try { btn.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ } };
        const off = () => { held[k] = false; btn.classList.remove('down'); };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('lostpointercapture', off);
        btn.addEventListener('contextmenu', e => e.preventDefault());
    }
    const ACTIONS = {
        next: throwNext, reverse, pause: togglePause, mute: toggleMute, start: primary,
        'gate-A': () => gate('A'), 'gate-B': () => gate('B'), 'gate-C': () => gate('C'),
        'points-1': () => throwPoints('P1'), 'points-2': () => throwPoints('P2'), 'points-3': () => throwPoints('P3')
    };
    for (const btn of document.querySelectorAll('[data-act]')) {
        btn.addEventListener('click', e => { e.preventDefault(); sound.unlock(); const f = ACTIONS[btn.getAttribute('data-act')]; if (f) f(); });
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') togglePause(); });

    // ------------------------------------------------------------------
    // Events from the simulation

    function popup(x, y, str, color) { popups.push({ x: x * T, y: y * T, str, color, age: 0 }); }

    function burst(x, y) {
        const px = x * T, py = y * T;
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2, v = 10 + Math.random() * 50;
            renderer.particles.emit({ kind: i < 16 ? 'fire' : i < 30 ? 'debris' : 'smoke', x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.6 + Math.random() * 1.2, size: 2 + Math.random() * 3 });
        }
    }

    function handleEvents() {
        for (const ev of L.takeEvents(world)) {
            switch (ev.type) {
                case 'points': sound.fx('points'); break;
                case 'locked': sound.fx('locked'); setMessage('Those points are locked: a train is standing on them.'); break;
                case 'gate': sound.fx(ev.red ? 'gateRed' : 'gateGreen'); setMessage('Gate ' + ev.id + (ev.red ? ' closed: passenger trains will wait.' : ' open: passenger trains may cross.')); break;
                case 'station': sound.fx('station'); break;
                case 'arrive': {
                    sound.fx('arrive', ev.onTime);
                    const p = world.layout.portals.find(q => q.line === ev.line && q.role === 'out');
                    if (p && mode === 'play') popup(p.x + (p.side === 1 ? -0.5 : 1), p.y + 0.5, ev.onTime ? '+100' : '+40 LATE', ev.onTime ? A.P.gold : A.P.amber);
                    break;
                }
                case 'couple':
                    sound.fx('couple');
                    renderer.particles.emit({ kind: 'ring', x: ev.x * T, y: ev.y * T, vx: 0, vy: 0, life: 0.6 });
                    setMessage('Coupled! Hold BRAKE to bring her to a stand.');
                    break;
                case 'caught':
                case 'secured':
                    sound.fx('whistle');
                    setTimeout(() => sound.fx('clear'), 500);
                    mode = 'clear';
                    modeTimer = 3.2;
                    banner = { title: ev.type === 'caught' ? 'CAUGHT!' : 'SECURED!', sub: 'SCORE ' + world.score + '  -  NEXT ROUND', color: A.P.gold };
                    setMessage(ev.type === 'caught' ? 'Runaway brought to a stand. Bonus awarded.' : 'The sand drag held her. Smaller bonus.');
                    break;
                case 'crash':
                    sound.fx('crash');
                    sound.stop();
                    burst(ev.x, ev.y);
                    shake = 0.5;
                    mode = 'over';
                    modeTimer = 1.2;
                    if (world.score > best) { best = world.score; store.set('rj-best', String(best)); }
                    banner = null;
                    setMessage(ev.why === 'buffer' ? 'Hit the buffers too fast.' : 'Collision on the line.');
                    setTimeout(() => sound.fx('over'), 900);
                    break;
                case 'reverse': sound.fx('reverse'); break;
                default: break;
            }
        }
    }

    // ------------------------------------------------------------------
    // Simulation tick

    let clock = 0;
    function tick() {
        clock += STEP;
        if (mode === 'title') {
            L.step(world, STEP);
            L.takeEvents(world);
            // keep the demo lively: flip a gate now and then
            if (Math.random() < 0.002) L.toggleGate(world, 'ABC'[Math.floor(Math.random() * 3)]);
        } else if (mode === 'play' || mode === 'clear') {
            const p = world.player;
            p.throttle = mode === 'clear' ? -1 : held.power && !held.brake ? 1 : held.brake ? -1 : 0;
            L.step(world, STEP);
            handleEvents();
            // engine smoke and chuffs follow the driving wheels
            chuffPhase += p.speed * STEP * 2.2;
            if (chuffPhase >= 1) {
                chuffPhase -= 1;
                if (mode === 'play') sound.fx('chuff', p.speed / 5.5);
                const pose = L.carPoses(p)[0];
                const fx = pose.x * T + Math.cos(pose.angle) * 5, fy = pose.y * T + Math.sin(pose.angle) * 5;
                renderer.particles.emit({ kind: 'smoke', x: fx, y: fy, vx: (Math.random() - 0.5) * 6, vy: -8, life: 0.9 + p.throttle * 0.4, size: 2 + (p.throttle > 0 ? 1 : 0) });
            }
            const r = world.runaway;
            if (r && !r.coupled && r.speed > 2.8 && Math.random() < (r.speed - 2.5) * 0.12) {
                const pt = L.pointBack(r, r.cars - 0.2);
                renderer.particles.emit({ kind: 'spark', x: pt.x * T + (Math.random() - 0.5) * 8, y: pt.y * T + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 30, vy: -20 * Math.random(), life: 0.3 });
            }
            for (const tr of world.trains) {
                const h = tr.path[tr.path.length - 1];
                const tile = world.layout.tiles.get(L.key(h.x, h.y));
                if (tile && tile.drag && tr.speed > 0.3 && Math.random() < 0.5) {
                    const pt = L.pointBack(tr, 0);
                    renderer.particles.emit({ kind: 'sand', x: pt.x * T + (Math.random() - 0.5) * 8, y: pt.y * T, vx: (Math.random() - 0.5) * 20, vy: -15, life: 0.4 });
                }
            }
            if (mode === 'play') sound.setIntensity(r && !r.coupled ? (r.speed - 1) / 3.5 : 0.15);
            if (mode === 'clear') {
                modeTimer -= STEP;
                if (modeTimer <= 0) { round++; newRound(world.score); }
            }
        } else if (mode === 'over') {
            modeTimer -= STEP;
            if (modeTimer <= 0 && !banner) banner = { title: 'WRECKED', sub: 'SCORE ' + world.score + '  -  TAP OR ENTER TO RETRY', color: A.P.red };
        }
        renderer.particles.update(STEP);
        for (const p of popups) { p.age += STEP; p.y -= 10 * STEP; }
        while (popups.length && popups[0].age > 1.4) popups.shift();
        if (banner && banner.until != null) { banner.until -= STEP; if (banner.until <= 0) banner = null; }
        if (shake > 0) shake -= STEP;
    }

    // ------------------------------------------------------------------
    // Draw

    function draw() {
        const p = world.player;
        const hint = mode === 'play' && p ? L.nextFacingSwitch(world, p) : null;
        const warn = mode === 'play' ? L.gatesAtRisk(world, world.runaway, 7) : null;
        const frame = renderer.draw({
            time: clock,
            trains: world.trains,
            hint,
            warnGates: warn,
            dim: mode === 'pause' || (mode === 'over' && banner),
            banner: banner && banner.title, sub: banner && banner.sub, bannerColor: banner && banner.color
        });
        for (const pp of popups) A.text(frame, pp.str, Math.round(pp.x - A.textWidth(pp.str, 1) / 2), Math.round(pp.y), pp.color, 1, A.P.outline);
        image.data.set(new Uint8ClampedArray(frame.data.buffer));
        ctx.putImageData(image, 0, 0);
        canvas.style.transform = shake > 0 ? 'translate(' + ((Math.random() - 0.5) * 8).toFixed(1) + 'px,' + ((Math.random() - 0.5) * 8).toFixed(1) + 'px)' : '';
        updateHud(warn);
    }

    let lastHud = '';
    function updateHud(warn) {
        const p = world.player, r = world.runaway;
        const pv = p ? p.speed : 0, rv = r ? r.speed : 0;
        const key = [mode, round, world.score, best, world.onTime, pv.toFixed(1), rv.toFixed(1), warn ? [...warn].join('') : ''].join('|');
        if (key === lastHud) return;
        lastHud = key;
        hud.round.textContent = mode === 'title' ? '-' : String(round);
        hud.score.textContent = String(world.score);
        hud.best.textContent = String(Math.max(best, world.score));
        hud.onTime.textContent = world.onTime + ' / ' + (world.onTime + world.late);
        hud.engine.textContent = (pv * 12).toFixed(0) + ' km/h';
        hud.runaway.textContent = r ? (r.coupled ? 'coupled' : r.stopped ? 'stopped' : (rv * 12).toFixed(0) + ' km/h') : '-';
        hud.engineBar.style.width = Math.min(100, pv / 5.5 * 100) + '%';
        hud.runawayBar.style.width = Math.min(100, rv / 5.5 * 100) + '%';
        for (const id of ['A', 'B', 'C']) {
            const b = document.querySelector('[data-act="gate-' + id + '"]');
            const g = world.layout.gates.find(q => q.id === id);
            if (b && g) { b.classList.toggle('red', g.red); b.classList.toggle('warn', !!(warn && warn.has(id))); }
        }
        for (const t of world.layout.switches) {
            const b = document.querySelector('[data-act="points-' + t.sw.id.slice(1) + '"]');
            if (b) b.classList.toggle('diverge', t.sw.diverge);
        }
    }

    // ------------------------------------------------------------------
    // Loop: fixed steps, drawn once per animation frame.

    let last = performance.now(), acc = 0;
    function loop(now) {
        acc += Math.min(0.1, (now - last) / 1000);
        last = now;
        let n = 0;
        while (acc >= STEP && n < 5) { if (mode !== 'pause') tick(); acc -= STEP; n++; }
        draw();
        requestAnimationFrame(loop);
    }

    attract();
    hud.mute.textContent = sound.muted ? 'Sound off' : 'Sound on';
    requestAnimationFrame(loop);
})();
