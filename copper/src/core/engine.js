// Scene stack, script scheduler and the fixed-step main loop.
//
// A scene is an object with optional update(), draw(surf), and flags:
//   opaque  - scenes beneath it are not drawn
//   done    - set by the scene when finished; run() pops it and returns scene.result
// Scripts are generator functions. `yield` waits one frame, `yield* CD.engine.run(scene)`
// waits for a scene, `yield* wait(n)` waits n frames. Story, battles and menus are
// all written as scripts, which keeps multi-step sequences readable top to bottom.
(function (CD) {
  'use strict';
  const scenes = [];
  const tasks = [];
  let frame = 0;
  let current = null;   // the task running right now, so pushed scenes know their owner

  function push(scene) { scene.bornAt = frame; scene.owner = current; scenes.push(scene); if (scene.enter) scene.enter(); return scene; }
  function remove(scene) {
    const i = scenes.lastIndexOf(scene);
    if (i >= 0) { scenes.splice(i, 1); if (scene.exit) scene.exit(); }
  }
  function top() { return scenes[scenes.length - 1]; }

  function spawn(gen, name) {
    const t = { gen, name: name || 'task', done: false, value: undefined };
    tasks.push(t);
    return t;
  }
  function* run(scene) {
    push(scene);
    while (!scene.done) yield;
    remove(scene);
    return scene.result;
  }
  function* wait(n) { for (let i = 0; i < n; i++) yield; }
  function* until(pred) { while (!pred()) yield; }
  // Run generators side by side until every one finishes
  function* together(...gens) {
    const live = gens.filter(Boolean).map(g => ({ g, done: false }));
    for (;;) {
      let pending = false;
      for (const l of live) if (!l.done) { if (l.g.next().done) l.done = true; else pending = true; }
      if (!pending) return;
      yield;
    }
  }
  // Tween a value from a to b over n frames, calling fn(v, t) each frame
  function* tween(n, fn, ease) {
    ease = ease || (t => t);
    for (let i = 1; i <= n; i++) { fn(ease(i / n), i / n); yield; }
  }

  function step() {
    frame++;
    CD.frame = frame;
    CD.input.update();
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.done) continue;
      current = t;
      try {
        const r = t.gen.next();
        if (r.done) { t.done = true; t.value = r.value; }
      } catch (e) {
        t.done = true;
        // a failed script must not leave its menus or text boxes blocking the game
        for (let j = scenes.length - 1; j >= 0; j--) if (scenes[j].owner === t) remove(scenes[j]);
        if (CD.onError) CD.onError(e, t.name); else throw e;
      } finally { current = null; }
    }
    for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i].done) tasks.splice(i, 1);
    const s = top();
    // A scene pushed during this frame does not see the press that opened it.
    if (s && s.update) s.update(s.bornAt !== frame);
    for (const sc of scenes) if (sc !== s && sc.tick) sc.tick();
  }

  function draw(surf) {
    let start = 0;
    for (let i = scenes.length - 1; i >= 0; i--) if (scenes[i].opaque) { start = i; break; }
    for (let i = start; i < scenes.length; i++) if (scenes[i].draw) scenes[i].draw(surf);
    if (CD.fx && CD.fx.draw) CD.fx.draw(surf);
  }

  function startBrowser(canvas, layout) {
    const surf = CD.gfx.screen;
    const ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = CD.gfx.W; canvas.height = CD.gfx.H;
    const img = ctx.createImageData(CD.gfx.W, CD.gfx.H);
    const view = new Uint32Array(img.data.buffer);
    if (layout) { window.addEventListener('resize', layout); window.addEventListener('orientationchange', layout); layout(); }
    const STEP = 1000 / 60;
    let last = performance.now(), acc = 0;
    function loop(now) {
      acc += Math.min(120, now - last); last = now;
      let n = 0;
      while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
      if (n) { draw(surf); view.set(surf.data); ctx.putImageData(img, 0, 0); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  CD.engine = { push, remove, top, spawn, run, wait, until, together, tween, step, draw, startBrowser, scenes, tasks };
  CD.frame = 0;
})(window.CD);
