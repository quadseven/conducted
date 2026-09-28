// Battle rules as pure logic. A turn takes both sides' choices and returns a list
// of events ({t:'text'}, {t:'move'}, {t:'hp'}, {t:'faint'}, ...) that the battle
// scene plays back. Nothing here draws or waits, so every rule is testable in Node.
//
// Damage follows the classic handheld structure: level factor, power, attack over
// defense, +2, then same-type bonus 1.5, type effectiveness, and a 217-255 random
// factor. Critical hits double damage and ignore stat stages.
(function (CD) {
  'use strict';
  const T = CD.train;
  const rnd = () => (CD.rng ? CD.rng() : Math.random());
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  const STRUGGLE = { name: 'Struggle', type: null, cat: 'phys', pow: 50, acc: 100, pp: 1, fx: { recoil: 0.25 }, anim: 'bump' };
  const STAT_NAME = { atk: 'ATTACK', def: 'DEFENSE', spd: 'SPEED', spc: 'SPECIAL', acc: 'ACCURACY', eva: 'EVASION' };
  const STATUS_TEXT = { brn: 'is overheating', par: 'is shorted out', psn: 'is corroding', slp: 'went idle' };

  function stageMult(n) { return n >= 0 ? (2 + n) / 2 : 2 / (2 - n); }
  function accMult(n) { return n >= 0 ? (3 + n) / 3 : 3 / (3 - n); }

  function side(party, isPlayer) {
    return { party, active: party.findIndex(t => t.hp > 0), isPlayer, stages: fresh(), vol: {}, participants: new Set() };
  }
  function fresh() { return { atk: 0, def: 0, spd: 0, spc: 0, acc: 0, eva: 0 }; }

  function create(playerParty, enemyParty, opts) {
    opts = opts || {};
    const b = {
      kind: opts.kind || 'wild', trainer: opts.trainer || null, terrain: opts.terrain || 'grass',
      sides: [side(playerParty, true), side(enemyParty, false)],
      turn: 0, runs: 0, over: false, outcome: null, exp: [], ai: opts.ai || (opts.kind === 'trainer' ? 'smart' : 'wild'),
      canRun: opts.kind !== 'trainer', noCatch: opts.kind === 'trainer', expBonus: opts.kind === 'trainer' ? 1.5 : 1,
      itemsLeft: opts.items ? opts.items.slice() : [],
    };
    b.sides[0].participants.add(b.sides[0].active);
    return b;
  }
  const act = s => s.party[s.active];
  const foeOf = (b, i) => b.sides[1 - i];

  function effSpeed(s) {
    const t = act(s);
    let v = t.stats.spd * stageMult(s.stages.spd);
    if (t.status === 'par') v *= 0.25;
    return v;
  }
  function statFor(s, key, crit) {
    const t = act(s);
    let v = t.stats[key];
    if (!crit) v *= stageMult(s.stages[key]);
    if (key === 'atk' && t.status === 'brn') v *= 0.5;
    return Math.max(1, Math.floor(v));
  }

  // Core damage formula; returns {dmg, crit, eff}
  function damage(b, ai, move, opts) {
    opts = opts || {};
    const A = b.sides[ai], D = foeOf(b, ai);
    const at = act(A), df = act(D);
    const eff = move.type ? CD.types.effectiveness(move.type, T.types(df)) : 1;
    if (eff === 0) return { dmg: 0, crit: false, eff };
    const fx = move.fx || {};
    if (fx.fixed === 'half') return { dmg: Math.max(1, Math.floor(df.hp / 2)), crit: false, eff: 1 };
    if (fx.fixed === 'level') return { dmg: at.level, crit: false, eff: 1 };
    if (typeof fx.fixed === 'number') return { dmg: fx.fixed, crit: false, eff: 1 };
    const critChance = opts.noCrit ? 0 : fx.crit ? 0.5 : 0.0625;
    const crit = opts.crit !== undefined ? opts.crit : rnd() < critChance;
    const phys = move.cat === 'phys';
    const atkStat = statFor(A, phys ? 'atk' : 'spc', crit);
    const defStat = statFor(D, phys ? 'def' : 'spc', crit);
    const L = at.level * (crit ? 2 : 1);
    let d = Math.floor(Math.floor(Math.floor(2 * L / 5 + 2) * move.pow * atkStat / defStat) / 50) + 2;
    if (move.type && T.types(at).includes(move.type)) d = Math.floor(d * 1.5);
    d = Math.floor(d * eff);
    const r = opts.roll !== undefined ? opts.roll : ri(217, 255);
    d = Math.floor(d * r / 255);
    return { dmg: Math.max(1, d), crit, eff };
  }

  function hit(ev, b, di, amount) {
    const s = b.sides[di], t = act(s);
    const from = t.hp;
    t.hp = Math.max(0, t.hp - amount);
    ev.push({ t: 'hp', side: di, from, to: t.hp });
    return from - t.hp;
  }
  function healHp(ev, b, si, amount) {
    const t = act(b.sides[si]);
    const from = t.hp;
    t.hp = Math.min(t.stats.hp, t.hp + amount);
    if (t.hp !== from) ev.push({ t: 'hp', side: si, from, to: t.hp });
  }
  function nm(b, si) { return (b.sides[si].isPlayer ? '' : (b.kind === 'wild' ? 'Wild ' : 'Foe ')) + T.name(act(b.sides[si])); }

  function applyStage(ev, b, si, stat, n) {
    const s = b.sides[si];
    const cur = s.stages[stat];
    if ((n > 0 && cur >= 6) || (n < 0 && cur <= -6)) { ev.push({ t: 'text', s: `${nm(b, si)}'s ${STAT_NAME[stat]} won't go any ${n > 0 ? 'higher' : 'lower'}!` }); return false; }
    s.stages[stat] = Math.max(-6, Math.min(6, cur + n));
    ev.push({ t: 'stat', side: si, stat, n });
    ev.push({ t: 'text', s: `${nm(b, si)}'s ${STAT_NAME[stat]} ${n > 0 ? (n > 1 ? 'rose sharply' : 'rose') : (n < -1 ? 'harshly fell' : 'fell')}!` });
    return true;
  }
  function inflict(ev, b, si, st, silentFail) {
    const t = act(b.sides[si]);
    if (st === 'conf') {
      if (b.sides[si].vol.conf) { if (!silentFail) ev.push({ t: 'text', s: `${nm(b, si)} is already confused!` }); return false; }
      b.sides[si].vol.conf = ri(2, 5);
      ev.push({ t: 'status', side: si, st: 'conf' });
      ev.push({ t: 'text', s: `${nm(b, si)}'s signals are scrambled! It became confused!` });
      return true;
    }
    if (t.status || t.hp <= 0) { if (!silentFail) ev.push({ t: 'text', s: 'But it failed!' }); return false; }
    // a train cannot be hurt by its own element's condition
    const ty = T.types(t);
    if ((st === 'brn' && ty.includes('STEAM')) || (st === 'par' && ty.includes('ELECTRIC')) || (st === 'psn' && ty.includes('NUCLEAR'))) {
      if (!silentFail) ev.push({ t: 'text', s: `It doesn't affect ${nm(b, si)}...` });
      return false;
    }
    t.status = st;
    if (st === 'slp') b.sides[si].vol.sleep = ri(1, 3);
    ev.push({ t: 'status', side: si, st });
    ev.push({ t: 'text', s: `${nm(b, si)} ${STATUS_TEXT[st]}!` });
    return true;
  }

  // Can this side act this turn? Handles sleep, paralysis, confusion, flinch, recharge.
  function canAct(ev, b, si) {
    const s = b.sides[si], t = act(s);
    if (s.vol.recharge) { s.vol.recharge = false; ev.push({ t: 'text', s: `${nm(b, si)} must recharge!` }); return false; }
    if (t.status === 'slp') {
      if (--s.vol.sleep <= 0) { t.status = null; ev.push({ t: 'status', side: si, st: null }); ev.push({ t: 'text', s: `${nm(b, si)} rumbled back to life!` }); return false; }
      ev.push({ t: 'text', s: `${nm(b, si)} is idling on the siding.` }); return false;
    }
    if (s.vol.flinch) { s.vol.flinch = false; ev.push({ t: 'text', s: `${nm(b, si)} flinched!` }); return false; }
    if (t.status === 'par' && rnd() < 0.25) { ev.push({ t: 'text', s: `${nm(b, si)} is shorted out and can't move!` }); return false; }
    if (s.vol.conf) {
      if (--s.vol.conf <= 0) { s.vol.conf = 0; ev.push({ t: 'text', s: `${nm(b, si)}'s signals cleared up!` }); }
      else {
        ev.push({ t: 'text', s: `${nm(b, si)} is confused!` });
        if (rnd() < 1 / 3) {
          const selfMove = { type: null, cat: 'phys', pow: 40, fx: {} };
          // hitting itself: its own attack against its own defense
          const at = act(s);
          const d = Math.max(1, Math.floor(Math.floor(Math.floor(2 * at.level / 5 + 2) * 40 * statFor(s, 'atk') / statFor(s, 'def')) / 50) + 2);
          ev.push({ t: 'text', s: 'It hurt itself in its confusion!' });
          ev.push({ t: 'shake', side: si });
          hit(ev, b, si, d);
          return false;
        }
      }
    }
    return true;
  }

  function useMove(ev, b, si, move, slot) {
    const A = b.sides[si], di = 1 - si, D = b.sides[di];
    const at = act(A), df = act(D);
    const fx = move.fx || {};
    if (slot) slot.pp = Math.max(0, slot.pp - 1);
    ev.push({ t: 'text', s: `${nm(b, si)} used ${move.name.toUpperCase()}!` });
    // self-targeted status moves never miss
    const selfOnly = move.cat === 'status' && (fx.heal || fx.rest || (fx.stat && fx.stat[0] === 'self'));
    if (!selfOnly && df.hp > 0) {
      const acc = move.acc * accMult(A.stages.acc) / accMult(D.stages.eva);
      if (rnd() * 100 >= acc) { ev.push({ t: 'text', s: `${nm(b, si)}'s attack missed!` }); return; }
    }
    ev.push({ t: 'move', side: si, move: move.name, anim: move.anim, type: move.type });
    if (move.cat === 'status') {
      if (fx.rest) {
        if (at.hp === at.stats.hp) { ev.push({ t: 'text', s: 'But it failed!' }); return; }
        at.status = null; healHp(ev, b, si, at.stats.hp); at.status = 'slp'; A.vol.sleep = 2;
        ev.push({ t: 'status', side: si, st: 'slp' });
        ev.push({ t: 'text', s: `${nm(b, si)} pulled into the siding and rested up!` });
        return;
      }
      if (fx.heal) {
        if (at.hp === at.stats.hp) { ev.push({ t: 'text', s: 'But it failed!' }); return; }
        healHp(ev, b, si, Math.floor(at.stats.hp * fx.heal));
        ev.push({ t: 'text', s: `${nm(b, si)} restored its HP!` });
        return;
      }
      if (fx.inflict) {
        if (fx.inflict !== 'conf') {
          const e = CD.types.effectiveness(move.type, T.types(df));
          if (e === 0) { ev.push({ t: 'text', s: `It doesn't affect ${nm(b, di)}...` }); return; }
        }
        inflict(ev, b, di, fx.inflict);
        return;
      }
      if (fx.stat) { const [who, stat, n] = fx.stat; applyStage(ev, b, who === 'self' ? si : di, stat, n); return; }
      return;
    }
    // damaging moves
    let total = 0, hits = 1, lastEff = 1, anyCrit = false;
    if (fx.hits) { const [a, c] = fx.hits; hits = a === c ? a : [2, 2, 2, 3, 3, 3, 4, 5][ri(0, 7)]; hits = Math.max(a, Math.min(c, hits)); }
    for (let h = 0; h < hits && df.hp > 0; h++) {
      const r = damage(b, si, move);
      lastEff = r.eff;
      if (r.eff === 0) { ev.push({ t: 'text', s: `It doesn't affect ${nm(b, di)}...` }); return; }
      ev.push({ t: 'hit', side: di, eff: r.eff, crit: r.crit });
      total += hit(ev, b, di, r.dmg);
      if (r.crit) { anyCrit = true; ev.push({ t: 'text', s: 'A critical hit!' }); }
    }
    if (hits > 1) ev.push({ t: 'text', s: `Hit ${hits} times!` });
    if (lastEff > 1) ev.push({ t: 'text', s: "It's super effective!" });
    else if (lastEff < 1) ev.push({ t: 'text', s: "It's not very effective..." });
    if (fx.recoil && total > 0) { ev.push({ t: 'text', s: `${nm(b, si)} is hit with recoil!` }); hit(ev, b, si, Math.max(1, Math.floor(total * fx.recoil))); }
    if (fx.drain && total > 0) { healHp(ev, b, si, Math.max(1, Math.floor(total * fx.drain))); ev.push({ t: 'text', s: `Energy was drained from ${nm(b, di)}!` }); }
    if (fx.recharge) A.vol.recharge = true;
    if (df.hp > 0) {
      for (const st of ['brn', 'par', 'psn', 'slp']) if (fx[st] && rnd() * 100 < fx[st]) inflict(ev, b, di, st, true);
      if (fx.conf && rnd() * 100 < fx.conf) inflict(ev, b, di, 'conf', true);
      if (fx.flinch && rnd() * 100 < fx.flinch) D.vol.flinch = true;
      if (fx.stat) { const [who, stat, n, ch] = fx.stat; if (rnd() * 100 < (ch === undefined ? 100 : ch)) applyStage(ev, b, who === 'self' ? si : di, stat, n); }
    } else if (fx.stat && fx.stat[0] === 'self') { const [, stat, n, ch] = fx.stat; if (rnd() * 100 < (ch === undefined ? 100 : ch)) applyStage(ev, b, si, stat, n); }
    return anyCrit;
  }

  function endOfTurn(ev, b, si) {
    const t = act(b.sides[si]);
    if (t.hp <= 0) return;
    if (t.status === 'brn') { ev.push({ t: 'text', s: `${nm(b, si)} is hurt by its overheated boiler!` }); ev.push({ t: 'statusfx', side: si, st: 'brn' }); hit(ev, b, si, Math.max(1, Math.floor(t.stats.hp / 16))); }
    if (t.status === 'psn') { ev.push({ t: 'text', s: `${nm(b, si)} is hurt by corrosion!` }); ev.push({ t: 'statusfx', side: si, st: 'psn' }); hit(ev, b, si, Math.max(1, Math.floor(t.stats.hp / 8))); }
  }

  // The move a side will use for a chosen slot (Struggle when out of PP)
  function moveFor(t, i) {
    if (!t.moves.some(m => m.pp > 0)) return { move: STRUGGLE, slot: null };
    const slot = t.moves[i];
    return { move: CD.moves.get(slot.name), slot };
  }

  // ---------- AI ----------
  function aiChoose(b) {
    const s = b.sides[1], t = act(s), foe = act(b.sides[0]);
    const usable = t.moves.map((m, i) => ({ m, i })).filter(o => o.m.pp > 0);
    if (!usable.length) return { kind: 'move', i: 0 };
    // trainers heal once when low, if they carry a potion
    if (b.ai === 'smart' && b.itemsLeft.length && t.hp < t.stats.hp / 4 && rnd() < 0.7) return { kind: 'item', id: b.itemsLeft.shift() };
    if (b.ai === 'wild') return { kind: 'move', i: usable[ri(0, usable.length - 1)].i };
    let best = null, bestScore = -1;
    for (const o of usable) {
      const mv = CD.moves.get(o.m.name), fx = mv.fx;
      let score;
      if (mv.cat === 'status') {
        if (fx.inflict) score = (fx.inflict === 'conf' ? !b.sides[0].vol.conf : !foe.status) ? 38 : 2;
        else if (fx.stat) { const [who, stat, n] = fx.stat; const st = (who === 'self' ? s : b.sides[0]).stages[stat]; score = Math.abs(st) >= 2 ? 4 : 26 - b.turn * 3; if (n < 0 && who === 'self') score = 1; }
        else if (fx.heal || fx.rest) score = t.hp < t.stats.hp / 2 ? 45 : 3;
        else score = 5;
      } else {
        const eff = mv.type ? CD.types.effectiveness(mv.type, T.types(foe)) : 1;
        const stab = mv.type && T.types(t).includes(mv.type) ? 1.5 : 1;
        const pow = typeof fx.fixed === 'number' ? fx.fixed * 1.5 : fx.fixed ? 55 : mv.pow;
        score = pow * eff * stab * (mv.acc / 100) * (fx.hits ? 3 : 1) / (fx.recharge ? 1.6 : 1);
        const est = damage(b, 1, mv, { noCrit: true, roll: 236 }).dmg;
        if (est >= foe.hp) score += 80;
      }
      score *= 0.85 + rnd() * 0.3;
      if (score > bestScore) { bestScore = score; best = o.i; }
    }
    return { kind: 'move', i: best };
  }

  // ---------- turn ----------
  // Resolve one turn. pAct: {kind:'move', i} | {kind:'switch', i} | {kind:'item', id, target, result} | {kind:'run'}
  function runTurn(b, pAct, eAct) {
    const ev = [];
    if (b.over) return ev;
    b.turn++;
    eAct = eAct || aiChoose(b);
    // forced recharge: that side's choice is overridden
    const acts = [pAct, eAct];
    // non-move actions happen first, player before enemy
    for (const si of [0, 1]) {
      const a = acts[si];
      if (a.kind === 'run') {
        b.runs++;
        const ps = effSpeed(b.sides[0]), es = effSpeed(b.sides[1]);
        const odds = es <= ps ? 256 : Math.floor(ps * 128 / es) + 30 * b.runs;
        if (odds >= 256 || ri(0, 255) < odds) { ev.push({ t: 'text', s: 'Got away safely!' }); ev.push({ t: 'run' }); b.over = true; b.outcome = 'run'; return ev; }
        ev.push({ t: 'text', s: "Couldn't get away!" });
      } else if (a.kind === 'switch') {
        doSwitch(ev, b, si, a.i);
      } else if (a.kind === 'item') {
        useItem(ev, b, si, a);
        if (b.over) return ev;
      }
    }
    // moves: priority, then effective speed, ties random
    const movers = [0, 1].filter(si => acts[si].kind === 'move' || b.sides[si].vol.recharge);
    const prio = si => { const a = acts[si]; if (a.kind !== 'move') return 0; const m = moveFor(act(b.sides[si]), a.i).move; return (m.fx && m.fx.prio) || 0; };
    movers.sort((x, y) => (prio(y) - prio(x)) || (effSpeed(b.sides[y]) - effSpeed(b.sides[x])) || (rnd() < 0.5 ? -1 : 1));
    for (const si of movers) {
      if (b.over) break;
      const s = b.sides[si];
      if (act(s).hp <= 0 || act(foeOf(b, si)).hp <= 0) break;   // a faint interrupts the turn
      if (!canAct(ev, b, si)) { if (act(s).hp <= 0) break; continue; }
      const { move, slot } = moveFor(act(s), acts[si].i);
      // damage is computed here, at resolution time, against the current state
      useMove(ev, b, si, move, slot);
    }
    for (const s of b.sides) s.vol.flinch = false;
    if (!faintCheck(ev, b)) for (const si of [0, 1]) endOfTurn(ev, b, si);
    faintCheck(ev, b);
    return ev;
  }

  // Single owner of battle end: marks faints, awards EXP once per defeated enemy, decides outcome
  function faintCheck(ev, b) {
    let any = false;
    for (const si of [1, 0]) {
      const s = b.sides[si], t = act(s);
      if (t.hp > 0 || s.fainted === s.active) continue;
      s.fainted = s.active; any = true;
      ev.push({ t: 'faint', side: si });
      ev.push({ t: 'text', s: `${nm(b, si)} ran out of steam!` });
      if (si === 1 && !t.expGiven) { t.expGiven = true; awardExp(ev, b, t); }
    }
    const alive = s => s.party.some(t => t.hp > 0);
    if (!alive(b.sides[1])) { b.over = true; b.outcome = 'win'; ev.push({ t: 'win' }); }
    else if (!alive(b.sides[0])) { b.over = true; b.outcome = 'lose'; ev.push({ t: 'lose' }); }
    else {
      if (act(b.sides[1]).hp <= 0) b.needEnemySwitch = true;
      if (act(b.sides[0]).hp <= 0) b.needPlayerSwitch = true;
    }
    return any;
  }
  function awardExp(ev, b, foe) {
    const sp = CD.species.get(foe.id);
    const ps = b.sides[0];
    const gainers = [...ps.participants].filter(i => ps.party[i] && ps.party[i].hp > 0);
    if (!gainers.length) return;
    const each = Math.max(1, Math.floor(Math.floor(sp.exp * foe.level / 7) * b.expBonus / gainers.length));
    for (const i of gainers) {
      const t = ps.party[i];
      T.addEVs(t, foe.id);
      ev.push({ t: 'text', s: `${T.name(t)} gained ${each} EXP. Points!` });
      const before = { level: t.level, stats: Object.assign({}, t.stats), exp: t.exp };
      const events = T.gainExp(t, each);
      ev.push({ t: 'exp', idx: i, before, after: { level: t.level, exp: t.exp }, events });
      if (T.evolveTarget(t) && !b.exp.includes(i)) b.exp.push(i);
    }
    ps.participants = new Set([ps.active]);
  }

  function doSwitch(ev, b, si, i) {
    const s = b.sides[si];
    if (s.party[s.active].hp > 0 && si === 0) ev.push({ t: 'text', s: `Come back, ${T.name(act(s))}!` });
    ev.push({ t: 'recall', side: si });
    s.active = i; s.stages = fresh(); s.vol = {}; s.fainted = undefined;
    if (si === 0) s.participants.add(i);
    ev.push({ t: 'send', side: si, idx: i });
    ev.push({ t: 'text', s: si === 0 ? `Go! ${T.name(act(s))}!` : `${b.trainer ? b.trainer.name : 'Foe'} sent out ${T.name(act(s))}!` });
  }
  // Replacement after a faint (not a turn)
  function replace(b, si, i) {
    const ev = [];
    doSwitch(ev, b, si, i);
    if (si === 0) b.needPlayerSwitch = false; else b.needEnemySwitch = false;
    return ev;
  }
  function nextEnemy(b) { return b.sides[1].party.findIndex(t => t.hp > 0); }

  function useItem(ev, b, si, a) {
    const item = CD.items.get(a.id);
    const s = b.sides[si];
    if (si === 1) {
      const t = act(s);
      ev.push({ t: 'text', s: `${b.trainer.name} used a ${item.name}!` });
      healHp(ev, b, 1, item.fx.hp || 50);
      return;
    }
    if (item.kind === 'ball') { ev.push({ t: 'ball', result: a.result }); if (a.result && a.result.caught) { b.over = true; b.outcome = 'caught'; } return; }
    const target = s.party[a.target === undefined ? s.active : a.target];
    ev.push({ t: 'text', s: `{PLAYER} used a ${item.name}!` });
    if (item.fx.hp) {
      const from = target.hp; target.hp = Math.min(target.stats.hp, target.hp + item.fx.hp);
      if (target === act(s)) ev.push({ t: 'hp', side: 0, from, to: target.hp });
      ev.push({ t: 'text', s: `${T.name(target)} recovered ${target.hp - from} HP!` });
    } else if (item.fx.cure) {
      target.status = null; if (target === act(s)) { ev.push({ t: 'status', side: 0, st: null }); s.vol.conf = 0; }
      ev.push({ t: 'text', s: `${T.name(target)} is back in working order!` });
    } else if (item.fx.revive) {
      target.hp = Math.floor(target.stats.hp * item.fx.revive);
      ev.push({ t: 'text', s: `${T.name(target)} is running again!` });
    }
  }

  // Catch roll for a thrown ball. Returns {caught, shakes}.
  function catchRoll(b, rate) {
    const t = act(b.sides[1]);
    const sp = CD.species.get(t.id);
    const bonus = t.status === 'slp' ? 2 : t.status ? 1.5 : 1;
    const a = Math.floor((3 * t.stats.hp - 2 * t.hp) * sp.catchRate * rate / (3 * t.stats.hp) * bonus);
    if (a >= 255) return { caught: true, shakes: 3, a };
    const shakeOdds = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
    let shakes = 0;
    for (let i = 0; i < 4; i++) { if (ri(0, 65535) < shakeOdds) shakes++; else break; }
    return { caught: shakes === 4, shakes: Math.min(3, shakes), a };
  }

  CD.battle = { create, runTurn, aiChoose, damage, catchRoll, replace, nextEnemy, effSpeed, stageMult, accMult, moveFor, act, STRUGGLE, STATUS_TEXT };
})(window.CD);
