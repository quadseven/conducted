// Wild encounters in tall grass and weedy yards, trainers who spot you from a
// distance, and blacking out. Maps declare their encounter tables; NPCs with a
// `trainer` block become opponents.
(function (CD) {
  'use strict';
  const W = CD.world, O = CD.overworld, U = CD.ui, E = CD.engine, T = CD.train;
  const rnd = () => (CD.rng ? CD.rng() : Math.random());

  function lead() { return CD.state.party.find(t => t.hp > 0); }

  // Pick a slot by weight and roll a level in its range
  function roll(table) {
    const total = table.slots.reduce((a, s) => a + s[3], 0);
    let r = rnd() * total;
    for (const s of table.slots) { r -= s[3]; if (r < 0) return { id: s[0], level: s[1] + Math.floor(rnd() * (s[2] - s[1] + 1)) }; }
    const s = table.slots[0]; return { id: s[0], level: s[1] };
  }

  function check(m, cell) {
    const st = CD.state;
    if (!lead() || !m.encounters) return false;
    const table = cell.g === 'yard' ? m.encounters.yard : m.encounters.grass;
    if (!table) return false;
    if (st.repel > 0) st.repel--;
    if (rnd() * 256 >= table.rate) { if (st.repel === 0) { st.repel = undefined; O.script(U.say('The TRACK HORN fell silent.')); } return false; }
    const w = roll(table);
    if (st.repel > 0 && w.level < lead().level) return false;
    O.script(wildBattle(w.id, w.level, cell.g === 'yard' ? 'yard' : 'grass'), 'wild');
    return true;
  }

  function* wildBattle(id, level, terrain) {
    const foe = T.make(id, level);
    const result = yield* CD.battleScene.battle({ kind: 'wild', enemy: [foe], terrain });
    yield* afterBattle(result);
    return result;
  }
  function* afterBattle(result) {
    if (result === 'lose') { yield* blackout(); return; }
    O.resume();
    yield* U.fadeIn(16);
  }
  // All trains out of steam: back to the last place you healed, half your money gone
  function* blackout() {
    const st = CD.state;
    const lost = Math.floor(st.money / 2);
    st.money -= lost;
    for (const t of st.party) T.heal(t);
    const h = st.lastHeal;
    O.enterMap(h.map, h.x, h.y, 'up', { quiet: true });
    yield* U.fadeIn(20);
    if (lost) yield* U.say(`{PLAYER} dropped \x07${lost} in the panic...`);
    yield* U.say('Your trains were looked after and are back to full steam. Take care out there!');
  }

  // ---------- trainers ----------
  function beaten(n) { return !!CD.state.trainers[n.trainer.id]; }
  function makeParty(list) { return list.map(([id, lv]) => T.make(id, lv)); }
  function* fightTrainer(n, opts) {
    opts = opts || {};
    const tr = n.trainer;
    if (tr.intro) yield* U.say(tr.intro, { speaker: tr.cls ? tr.cls + ' ' + tr.name : tr.name });
    const result = yield* CD.battleScene.battle({
      kind: 'trainer', enemy: makeParty(typeof tr.party === 'function' ? tr.party(CD.state) : tr.party), terrain: tr.terrain || (CD.world.get(CD.state.map).indoor ? 'gym' : 'grass'),
      trainer: { name: tr.name, cls: tr.cls, sprite: n.sprite, look: n.look, prize: tr.prize || 10, defeat: tr.defeat, items: tr.items },
      music: tr.music, victory: tr.victory,
    });
    if (result === 'win') CD.state.trainers[tr.id] = true;
    if (result === 'lose') { if (opts.noBlackout) { for (const t of CD.state.party) T.heal(t); O.resume(); yield* U.fadeIn(16); } else yield* blackout(); return result; }
    O.resume();
    yield* U.fadeIn(16);
    if (tr.after && result === 'win') yield* tr.after(n);
    return result;
  }
  // Talking to a trainer: battle if unbeaten, otherwise their after-battle line
  function talkTrainer(n) {
    return function* () {
      if (!beaten(n)) { yield* fightTrainer(n); return; }
      yield* U.say(n.trainer.post || n.trainer.defeat || '...', { speaker: n.trainer.name });
    };
  }
  // After each player step: does an unbeaten trainer see the player?
  function spot(m) {
    if (!lead()) return false;
    const p = CD.ow.player;
    for (const n of CD.ow.npcs) {
      if (!n.trainer || beaten(n) || n.hidden) continue;
      const sight = n.trainer.sight || 4;
      const [dx, dy] = W.DV[n.dir];
      for (let k = 1; k <= sight; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        const c = W.cellAt(m, x, y);
        if (!c || c.cell.solid || (W.npcAt({ npcs: CD.ow.npcs }, m, x, y))) break;
        if (x === p.x && y === p.y) {
          O.script(approach(n, k - 1), 'trainer:' + n.trainer.id);
          return true;
        }
      }
    }
    return false;
  }
  function* approach(n, steps) {
    const p = CD.ow.player;
    CD.audio.music(n.trainer.eyeMusic || 'spotted');
    O.emote(n, '!'); CD.audio.sfx('exclaim');
    yield* E.wait(45);
    n.scripted = (n.scripted || 0) + 1;
    try { yield* O.walk(n, new Array(steps).fill(n.dir), { speed: 2 }); } finally { n.scripted--; }
    O.faceToward(p, n);
    yield* fightTrainer(n);
  }
  O && CD.ow.hooks.afterStep.push((m) => spot(m));

  // Wrap map NPC definitions that carry trainer blocks so talking starts the fight
  function wireTrainers() {
    for (const id in W.maps) for (const n of W.maps[id].npcs || []) if (n.trainer && !n.talk) n.talk = function* (self) { yield* talkTrainer(self)(); };
  }

  CD.encounters = { check, roll, wildBattle, blackout, fightTrainer, spot, wireTrainers, makeParty, afterBattle };
})(window.CD);
