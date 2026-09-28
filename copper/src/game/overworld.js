// The overworld scene: grid movement for the player and NPCs, the camera,
// y-sorted drawing of ground, props, buildings and characters, map connections,
// warps, sign reading, and the hooks the story and encounters plug into.
(function (CD) {
  'use strict';
  const { Surface, shade } = CD.gfx;
  const W = CD.world, T = CD.tiles, E = CD.engine, I = CD.input, U = CD.ui;
  const P = CD.pal;
  const TS = 16;
  const SW = CD.gfx.W, SH = CD.gfx.H;

  // A walker moves one tile at a time. prog counts pixels travelled into the step.
  function walker(o) {
    return Object.assign({ x: 0, y: 0, dir: 'down', moving: false, prog: 0, speed: 2, anim: 0, tx: 0, ty: 0, jump: 0, hidden: false }, o);
  }
  const ow = {
    player: walker({ sprite: 'player' }),
    npcs: [],          // runtime NPCs on the current map
    locked: 0,         // >0 while a script owns the controls
    banner: null,      // location name banner {text, t}
    emotes: [],        // {who, kind, t}
    hooks: { afterStep: [], beforeStep: [] },
    trainState: null,  // ambient trains on the current map
  };
  CD.ow = ow;

  function map() { return W.get(CD.state.map); }

  // ---------- loading ----------
  function loadNpcs(m) {
    ow.npcs = (m.npcs || []).filter(n => !n.cond || n.cond(CD.state)).map(n => walker(Object.assign({}, n, {
      map: m.id, home: { x: n.x, y: n.y }, dir: n.dir || 'down', wait: 60 + Math.floor(Math.random() * 120), speed: 1,
    })));
  }
  function enterMap(id, x, y, dir, opts) {
    opts = opts || {};
    const prev = CD.state.map;
    CD.state.map = id; CD.state.x = x; CD.state.y = y; if (dir) CD.state.dir = dir;
    const p = ow.player;
    p.x = x; p.y = y; p.tx = x; p.ty = y; p.moving = false; p.prog = 0; if (dir) p.dir = dir;
    const m = map();
    if (!opts.keepNpcs) loadNpcs(m);
    if (m.music) CD.audio.music(typeof m.music === 'function' ? m.music(CD.state) : m.music);
    if (m.name && (!opts.quiet) && (W.get(prev).name !== m.name)) ow.banner = { text: m.name, t: 150 };
    ow.trainState = m.ambientTrain ? { t: m.ambientTrain.every * 0.4, x: null } : null;
    if (m.onEnter) script(m.onEnter(CD.state), 'enter:' + id);
  }

  // ---------- player helpers ----------
  function facing(w) { const [dx, dy] = W.DV[w.dir]; return { x: w.x + dx, y: w.y + dy }; }
  function stateView() {
    return { npcs: ow.npcs, player: { map: CD.state.map, x: ow.player.x, y: ow.player.y, tx: ow.player.tx, ty: ow.player.ty }, blocked: (m, x, y) => blockedByTrain(m, x, y) };
  }
  function blockedByTrain(m, x, y) {
    const ts = ow.trainState;
    if (!ts || ts.x === null || m.id !== CD.state.map) return false;
    const at = map().ambientTrain;
    return at && y === at.row && x >= Math.floor(ts.x / TS) - 1 && x <= Math.floor(ts.x / TS) + at.cars + 1;
  }

  function startStep(w, dir, who) {
    w.dir = dir;
    const m = W.get(w.map || CD.state.map);
    const r = W.canStep(stateView(), m, w.x, w.y, dir, who);
    if (!r.ok) return r;
    w.moving = true; w.prog = 0; w.tx = r.tx; w.ty = r.ty; w.jump = r.ledge ? 1 : 0; w.cross = r.crossMap || null;
    if (r.ledge) CD.audio.sfx('ledge');
    return r;
  }
  function advance(w) {
    if (!w.moving) return false;
    const dist = w.jump ? 32 : 16;
    w.prog += w.speed;
    if (w.prog >= dist) {
      w.x = w.tx; w.y = w.ty; w.moving = false; w.prog = 0; w.jump = 0; w.anim++;
      return true;
    }
    return false;
  }
  // Pixel position of a walker (top-left of its tile), including step interpolation
  function pixel(w) {
    let px = w.x * TS, py = w.y * TS, lift = 0;
    if (w.moving) {
      const dist = w.jump ? 32 : 16;
      const t = w.prog / dist;
      px += (w.tx - w.x) * TS * t; py += (w.ty - w.y) * TS * t;
      if (w.jump) lift = Math.round(Math.sin(t * Math.PI) * 8);
    }
    return { px, py, lift };
  }

  // Scripted movement: walk a list of directions, waiting for each step
  function* walk(w, dirs, opts) {
    opts = opts || {};
    // while a script walks someone, the scene loop must not also advance them
    w.scripted = (w.scripted || 0) + 1;
    try { return yield* walkSteps(w, dirs, opts); } finally { w.scripted--; }
  }
  function* walkSteps(w, dirs, opts) {
    for (const d of dirs) {
      if (d === 'face') continue;
      let tries = 0;
      w.speed = opts.speed || (w === ow.player ? 2 : 1);
      while (!w.moving) {
        const r = startStep(w, d, opts.force ? 'script' : (w === ow.player ? 'player' : 'npc'));
        if (!r.ok) {
          if (opts.force) { w.moving = true; w.prog = 0; const [dx, dy] = W.DV[d]; w.tx = w.x + dx; w.ty = w.y + dy; break; }
          if (++tries > 90) return false;
          yield;
        }
      }
      while (w.moving) { if (advance(w)) { if (w === ow.player) syncPlayer(); } yield; }
    }
    return true;
  }
  function syncPlayer() { const p = ow.player; CD.state.x = p.x; CD.state.y = p.y; CD.state.dir = p.dir; }
  function face(w, dir) { w.dir = dir; }
  function faceToward(w, t) { const dx = t.x - w.x, dy = t.y - w.y; w.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); }
  function npc(id) { return ow.npcs.find(n => n.id === id); }

  // ---------- interaction ----------
  function interact() {
    const p = ow.player, f = facing(p), m = map();
    const n = W.npcAt({ npcs: ow.npcs }, m, f.x, f.y);
    if (n) { runTalk(n); return; }
    // talk across a counter
    const r = W.cellAt(m, f.x, f.y);
    if (r && r.cell.counter) {
      const f2 = { x: f.x + (f.x - p.x), y: f.y + (f.y - p.y) };
      const n2 = W.npcAt({ npcs: ow.npcs }, m, f2.x, f2.y);
      if (n2) { runTalk(n2); return; }
    }
    const sgn = W.signAt(m, f.x, f.y);
    if (sgn && (!sgn.dir || sgn.dir === p.dir)) { script(function* () { if (sgn.script) yield* sgn.script(); else yield* U.say(sgn.text); }); return; }
    if (m.interact) { const g = m.interact(f.x, f.y, r && r.cell); if (g) { script(() => g); return; } }
  }
  function runTalk(n) {
    script(function* () {
      const prevDir = n.dir;
      if (!n.noFace) faceToward(n, ow.player);
      if (n.talk) yield* n.talk(n);
      else if (n.text) yield* U.say(typeof n.text === 'function' ? n.text(CD.state) : n.text, n.speaker ? { speaker: n.speaker } : undefined);
      if (n.move === 'still') n.dir = prevDir;
    }, 'talk:' + n.id);
  }
  // Run a story script with the controls locked
  function script(fn, name) {
    ow.locked++;
    const gen = typeof fn === 'function' ? fn() : fn;
    return E.spawn((function* () {
      try { yield* gen; }
      finally { ow.locked = Math.max(0, ow.locked - 1); I.swallow(); }
    })(), name || 'script');
  }

  // ---------- arrival: warps, triggers, encounters ----------
  function* doWarp(w) {
    const dest = W.get(w.to);
    CD.audio.sfx(w.sfx || (dest.indoor ? 'door' : 'door'));
    yield* U.fadeOut(10);
    enterMap(w.to, w.tx, w.ty, w.dir || 'down');
    yield* E.wait(4);
    yield* U.fadeIn(10);
    // stepping out of a door: take one step away from it
    const cell = W.cellAt(dest, w.tx, w.ty);
    if (cell && cell.cell.door) yield* walk(ow.player, ['down']);
  }
  function onArrive(prevDir) {
    const p = ow.player;
    let m = map();
    // crossing into a connected map
    if (p.cross) {
      const r = p.cross; p.cross = null;
      enterMap(r.map.id, r.x, r.y, p.dir);
      m = map();
    }
    syncPlayer();
    CD.state.stepCount++;
    for (const h of ow.hooks.afterStep) if (h(m, p)) return;
    const cell = W.cellAt(m, p.x, p.y).cell;
    const wp = W.warpAt(m, p.x, p.y);
    if (wp && (!cell.exit || prevDir === 'down' || wp.any)) { script(doWarp(wp), 'warp'); return; }
    const trig = (m.triggers || []).find(t => t.x === p.x && t.y === p.y && (!t.cond || t.cond(CD.state)));
    if (trig) { script(trig.script(), 'trigger'); return; }
    if (CD.encounters && cell.grass) CD.encounters.check(m, cell);
  }

  // ---------- NPC behaviour ----------
  function updateNpcs() {
    for (const n of ow.npcs) {
      if (n.scripted) continue;
      if (n.moving) { advance(n); continue; }
      if (ow.locked || n.move === 'still' || n.scripted) continue;
      if (--n.wait > 0) continue;
      n.wait = 90 + Math.floor(Math.random() * 150);
      const dirs = ['up', 'down', 'left', 'right'];
      const d = dirs[Math.floor(Math.random() * 4)];
      if (n.move === 'look' || n.move === 'turn') { n.dir = d; continue; }
      const [dx, dy] = W.DV[d];
      const r = n.range === undefined ? 2 : n.range;
      if (Math.abs(n.x + dx - n.home.x) > r || Math.abs(n.y + dy - n.home.y) > r) { n.dir = d; continue; }
      startStep(n, d, 'npc');
    }
  }

  // ---------- ambient trains ----------
  function updateTrain() {
    const at = map().ambientTrain, ts = ow.trainState;
    if (!at || !ts) return;
    if (ts.x === null) {
      if (--ts.t > 0) return;
      // do not start a train while the player stands on the line
      if (ow.player.y === at.row || ow.player.ty === at.row) { ts.t = 60; return; }
      ts.x = at.dir > 0 ? -at.cars * 32 - 32 : W.size(map()).w * TS + 32;
      CD.audio.sfx('whistle', 3);
      return;
    }
    ts.x += at.dir * at.speed;
    const w = W.size(map()).w * TS;
    if ((at.dir > 0 && ts.x > w + 64) || (at.dir < 0 && ts.x < -at.cars * 32 - 64)) { ts.x = null; ts.t = at.every; }
  }

  // ---------- the scene ----------
  const scene = {
    opaque: true,
    update(active) {
      CD.state.frames++;
      updateNpcs();
      updateTrain();
      if (ow.banner && --ow.banner.t <= 0) ow.banner = null;
      ow.emotes = ow.emotes.filter(e => --e.t > 0);
      const p = ow.player;
      if (p.scripted) return;
      if (p.moving) {
        p.speed = p.jump ? 2 : (I.held.b && !ow.locked && CD.state.flags.runningShoes !== false ? 4 : 2);
        const prevDir = p.dir;
        if (advance(p)) onArrive(prevDir);
        if (p.moving || ow.locked) return;
      }
      if (!active || ow.locked) return;
      if (I.pressed.start) { if (CD.menu) script(CD.menu.open(), 'menu'); return; }
      if (I.pressed.a) { interact(); return; }
      const d = I.dir();
      if (d) {
        // a quick tap turns in place; holding walks
        if (p.dir !== d && I.heldFor[d] < 5 && !p.moving) { p.dir = d; return; }
        if (I.heldFor[d] < 3 && p.dir !== d) return;
        const r = startStep(p, d, 'player');
        if (!r.ok) {
          p.dir = d;
          if (!p.bumped || CD.frame - p.bumped > 18) { CD.audio.sfx('bump'); p.bumped = CD.frame; }
          // pressing into a doormat from inside exits even though the mat is the last cell
          const m = map(), c = W.cellAt(m, p.x, p.y);
          const wp = W.warpAt(m, p.x, p.y);
          if (c && c.cell.exit && wp && d === 'down') script(doWarp(wp), 'warp');
        }
      }
    },
    draw(s) { drawWorld(s); },
  };

  // ---------- drawing ----------
  function drawWorld(s) {
    const m = map();
    const p = ow.player;
    const pp = pixel(p);
    const camX = Math.round(pp.px - (SW / 2 - 8));
    const camY = Math.round(pp.py - (SH / 2 - 8));
    ow.cam = { x: camX, y: camY };
    const frame = CD.frame;
    const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS);
    const cols = Math.ceil(SW / TS) + 1, rows = Math.ceil(SH / TS) + 1;
    s.clear(m.indoor ? '#16121e' : P.grass);
    const tint = m.wallTint, floor = m.floor;
    for (let ty = y0; ty < y0 + rows; ty++) for (let tx = x0; tx < x0 + cols; tx++) {
      const label = W.labelAt(m, tx, ty);
      const nb = (dx, dy) => W.labelAt(m, tx + dx, ty + dy);
      T.drawCell(s, label, tx, ty, tx * TS - camX, ty * TS - camY, nb, frame, { tint: label === 'wall' ? tint : label === 'carpet' ? m.carpetTint : undefined, floor });
    }
    // gather sprites for y-sorting: [bottomY, drawFn]
    const list = [];
    for (let ty = y0 - 1; ty < y0 + rows + 2; ty++) for (let tx = x0 - 1; tx < x0 + cols + 1; tx++) {
      const r = W.cellAt(m, tx, ty);
      let prop = r ? r.cell.prop : (m.indoor ? null : 'tree');
      if (r && r.cell.egg && CD.state.flags['egg' + r.cell.egg]) prop = 'eggEmpty';
      if (prop) list.push([(ty + 1) * TS - 0.5, () => CD.props.draw(s, prop, tx, ty, camX, camY, Math.floor(CD.gfx.hash2(tx, ty, 2) * 6))]);
    }
    // buildings of this map and any connected maps
    const origins = [[m, 0, 0]];
    const con = m.connections || {};
    const sz = W.size(m);
    if (con.north) { const n = W.get(con.north.map); origins.push([n, con.north.offset || 0, -W.size(n).h]); }
    if (con.south) origins.push([W.get(con.south.map), con.south.offset || 0, sz.h]);
    if (con.west) { const n = W.get(con.west.map); origins.push([n, -W.size(n).w, con.west.offset || 0]); }
    if (con.east) origins.push([W.get(con.east.map), sz.w, con.east.offset || 0]);
    for (const [mm, ox, oy] of origins) for (const b of mm.buildings || []) {
      const bb = Object.assign({}, b, { x: b.x + ox, y: b.y + oy });
      if ((bb.x + bb.w) * TS < camX || bb.x * TS > camX + SW || (bb.y + bb.h) * TS < camY || (bb.y - 1) * TS > camY + SH) continue;
      list.push([(bb.y + bb.h) * TS - 1, () => CD.buildings.draw(s, bb, camX, camY)]);
    }
    for (const n of ow.npcs) if (!n.hidden) list.push([pixel(n).py + TS, () => drawWalker(s, n, camX, camY)]);
    if (!p.hidden) list.push([pp.py + TS + 0.25, () => drawWalker(s, p, camX, camY)]);
    // ambient train
    const at = m.ambientTrain, ts = ow.trainState;
    if (at && ts && ts.x !== null) list.push([(at.row + 1) * TS - 0.1, () => drawAmbientTrain(s, at, ts.x - camX, at.row * TS - camY)]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of list) fn();
    // emotes ('!' bubbles)
    for (const e of ow.emotes) {
      const q = pixel(e.who);
      const x = q.px - camX + 3, y = q.py - camY - 16 - q.lift;
      CD.ui.frame(s, x - 1, y, 12, 13, {});
      CD.font.draw(s, e.kind === '?' ? '?' : '!', x + 4, y + 3, e.kind === '?' ? P.blue : P.red);
    }
    if (m.night || m.dim) s.fillA(0, 0, SW, SH, P.night, m.dim || 0.35);
    if (ow.banner) drawBanner(s, ow.banner);
  }
  function drawWalker(s, w, camX, camY) {
    const f = CD.chars.frames(w.sprite, w.look);
    let fr = 0;
    if (w.moving) { const t = w.prog / (w.jump ? 32 : 16); fr = CD.chars.frameFor(w.anim * 2 + (t >= 0.5 ? 1 : 0) + 1); }
    const q = pixel(w);
    const x = Math.round(q.px - camX), y = Math.round(q.py - camY) - 4 - q.lift;
    CD.gfx.shadow(s, x + 8, Math.round(q.py - camY) + 14, 5, 2, w.jump ? 0.18 : 0.25);
    s.blit(f[w.dir][fr], x, y);
    // legs vanish into tall grass
    const m = map();
    const cx = w.moving && w.prog > 8 ? w.tx : w.x, cy = w.moving && w.prog > 8 ? w.ty : w.y;
    const c = W.cellAt(m, cx, cy);
    if (c && c.cell.g === 'tall' && !w.jump) s.blit(T.tallFront(Math.floor(CD.frame / 24)), Math.round(cx * TS - camX), Math.round(cy * TS - camY) + 8);
  }
  function drawAmbientTrain(s, at, x, y) {
    // a little freight train: engine plus boxcars, drawn along the rail row
    const loco = CD.trainArt ? CD.trainArt.overworldLoco(at.dir) : null;
    for (let i = 0; i < at.cars; i++) {
      const cx = at.dir > 0 ? x - (i + 1) * 30 : x + 32 + i * 30;
      s.fill(cx + 1, y - 6, 28, 16, ['#8a4a3a', '#4a6a8a', '#6a7a4a'][i % 3]);
      s.hline(cx + 1, y - 6, 28, '#e8dcc0'); s.hline(cx + 1, y + 9, 28, '#2a2230');
      for (let k = 4; k < 28; k += 6) s.vline(cx + k, y - 4, 12, shade(['#8a4a3a', '#4a6a8a', '#6a7a4a'][i % 3], -0.2));
      s.fill(cx + 4, y + 10, 5, 4, '#2a2230'); s.fill(cx + 20, y + 10, 5, 4, '#2a2230');
    }
    if (loco) s.blit(loco, x, y - 14);
    else { s.fill(x, y - 8, 30, 18, '#3a3a48'); s.fill(x + (at.dir > 0 ? 20 : 2), y - 14, 6, 7, '#2a2230'); }
    // smoke puffs trail behind the chimney
    for (let i = 0; i < 4; i++) {
      const age = (CD.frame + i * 12) % 48;
      s.ellipseA(x + (at.dir > 0 ? 22 : 6) - at.dir * age * 0.8, y - 18 - age * 0.35, 3 + age * 0.08, 2.5 + age * 0.06, '#f0ece4', 0.75 - age / 64);
    }
  }
  function drawBanner(s, b) {
    const slide = Math.min(1, (150 - b.t) / 12, b.t / 12);
    const w = CD.font.measure(b.text) + 22;
    const y = Math.round(-22 + slide * 26);
    CD.ui.frame(s, 4, y, w, 19, { paper: P.paper });
    CD.font.draw(s, '\x04', 10, y + 6, P.copperD);
    CD.font.draw(s, b.text, 18, y + 6, P.ink);
  }

  // Back from a battle or menu: restore the map's music without re-running its enter script
  function resume() { const m = map(); if (m.music) CD.audio.music(typeof m.music === 'function' ? m.music(CD.state) : m.music); }
  function emote(who, kind, frames) { ow.emotes.push({ who, kind: kind || '!', t: frames || 50 }); }

  CD.overworld = { scene, enterMap, resume, walk, face, faceToward, npc, script, emote, pixel, map, doWarp, interact, drawWorld, startStep };
})(window.CD);
