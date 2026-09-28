// Train instances: stats, experience, levelling, move learning, evolution, healing.
// Instances are plain JSON-safe objects so saving is a straight serialization.
(function (CD) {
  'use strict';
  const STATS = ['hp', 'atk', 'def', 'spd', 'spc'];

  // Total experience needed to reach level n on each growth curve
  function expAt(growth, n) {
    if (n <= 1) return 0;
    const c = n * n * n;
    switch (growth) {
      case 'fast': return Math.floor(4 * c / 5);
      case 'slow': return Math.floor(5 * c / 4);
      case 'mslow': return Math.max(0, Math.floor(6 * c / 5 - 15 * n * n + 100 * n - 140));
      default: return c;
    }
  }
  function levelFor(growth, exp) { let l = 1; while (l < 100 && expAt(growth, l + 1) <= exp) l++; return l; }

  function rng() { return CD.rng ? CD.rng() : Math.random(); }
  let uidSeq = 1;

  function calcStats(t) {
    const sp = CD.species.get(t.id);
    const out = {};
    for (const k of STATS) {
      const evBonus = Math.floor(Math.ceil(Math.sqrt(t.ev[k] || 0)) / 4);
      const core = Math.floor(((sp.base[k] + t.iv[k]) * 2 + evBonus) * t.level / 100);
      out[k] = k === 'hp' ? core + t.level + 10 : core + 5;
    }
    return out;
  }
  function refresh(t) {
    const old = t.stats ? t.stats.hp : null;
    t.stats = calcStats(t);
    if (t.hp === undefined) t.hp = t.stats.hp;                                   // brand new
    else if (old === null) t.hp = Math.min(t.stats.hp, t.hp);                  // loaded from a save
    else if (t.hp > 0) t.hp = Math.min(t.stats.hp, t.hp + (t.stats.hp - old)); // level up keeps the damage taken
    return t;
  }
  function movesAt(id, level) {
    const sp = CD.species.get(id);
    const known = [];
    for (const l of sp.learnset) if (l.level <= level && !known.includes(l.move)) known.push(l.move);
    return known.slice(-4);
  }
  function moveSlot(name) { const mv = CD.moves.get(name); if (!mv) throw new Error('unknown move ' + name); return { name, pp: mv.pp, max: mv.pp }; }

  function make(id, level, opts) {
    opts = opts || {};
    const sp = CD.species.get(id);
    if (!sp) throw new Error('unknown species ' + id);
    const iv = opts.iv || { atk: Math.floor(rng() * 16), def: Math.floor(rng() * 16), spd: Math.floor(rng() * 16), spc: Math.floor(rng() * 16) };
    // HP IV derives from the others' low bits, as on the old handhelds
    iv.hp = ((iv.atk & 1) << 3) | ((iv.def & 1) << 2) | ((iv.spd & 1) << 1) | (iv.spc & 1);
    const t = {
      uid: (Date.now() % 1e9) * 100 + (uidSeq++ % 100), id, nick: null, level,
      exp: expAt(sp.growth, level), iv, ev: { hp: 0, atk: 0, def: 0, spd: 0, spc: 0 },
      moves: (opts.moves || movesAt(id, level)).map(moveSlot),
      status: null, ot: opts.ot || null, caught: opts.caught || null,
    };
    return refresh(t);
  }
  function name(t) { return t.nick || CD.species.get(t.id).name; }
  function types(t) { return CD.species.get(t.id).types; }

  // Give experience; returns a list of events for the UI to narrate:
  // {kind:'level', level}, {kind:'learn', move}, {kind:'full', move} (needs a replace prompt)
  function gainExp(t, amount) {
    const sp = CD.species.get(t.id);
    const events = [];
    if (t.level >= 100) return events;
    t.exp += amount;
    while (t.level < 100 && t.exp >= expAt(sp.growth, t.level + 1)) {
      t.level++;
      refresh(t);
      events.push({ kind: 'level', level: t.level });
      for (const l of sp.learnset) if (l.level === t.level) {
        if (t.moves.some(m => m.name === l.move)) continue;
        if (t.moves.length < 4) { t.moves.push(moveSlot(l.move)); events.push({ kind: 'learn', move: l.move }); }
        else events.push({ kind: 'full', move: l.move });
      }
    }
    if (t.level >= 100) t.exp = Math.min(t.exp, expAt(sp.growth, 100));
    return events;
  }
  function expProgress(t) {
    const sp = CD.species.get(t.id);
    if (t.level >= 100) return 1;
    const a = expAt(sp.growth, t.level), b = expAt(sp.growth, t.level + 1);
    return Math.max(0, Math.min(1, (t.exp - a) / (b - a)));
  }
  function addEVs(t, fromSpecies) {
    const b = CD.species.get(fromSpecies).base;
    for (const k of STATS) t.ev[k] = Math.min(65535, (t.ev[k] || 0) + b[k]);
  }
  // Level evolution fires only at or after the threshold; item evolution only with its item
  function evolveTarget(t, item) {
    const e = CD.species.get(t.id).evo;
    if (!e) return null;
    if (e.item) return item === e.item ? e.into : null;
    return t.level >= e.level ? e.into : null;
  }
  function evolve(t, into) {
    t.id = into;
    refresh(t);
    const events = [];
    // a freshly evolved train may learn its new form's move for the current level
    for (const l of CD.species.get(into).learnset) if (l.level === t.level && !t.moves.some(m => m.name === l.move)) {
      if (t.moves.length < 4) { t.moves.push(moveSlot(l.move)); events.push({ kind: 'learn', move: l.move }); }
      else events.push({ kind: 'full', move: l.move });
    }
    return events;
  }
  function heal(t) { t.hp = t.stats.hp; t.status = null; for (const m of t.moves) m.pp = m.max; return t; }
  function fainted(t) { return t.hp <= 0; }

  CD.train = { STATS, expAt, levelFor, calcStats, refresh, make, name, types, gainExp, expProgress, addEVs, evolveTarget, evolve, heal, fainted, movesAt, moveSlot };
})(window.CD);
