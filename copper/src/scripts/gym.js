// The eight gyms. Each record in src/data/gyms.js becomes a gym guide, the gym
// crew, and a Station Master who battles once, awards the badge, unlocks its
// field technique and hands over a gift. Coal Harbor's lines follow
// WORLDBUILDING.md; the rest follow the leaders listed in STORY.md.
(function (CD) {
  'use strict';
  const W = CD.world, O = CD.overworld, U = CD.ui, E = CD.engine;
  const say = (t, sp) => U.say(t, sp ? { speaker: sp } : undefined);

  function guideNpc(g) {
    const gd = g.guide || {};
    return {
      id: 'guide:' + g.badge, sprite: gd.sprite || 'aide', look: gd.look, x: gd.x !== undefined ? gd.x : 4, y: gd.y !== undefined ? gd.y : 12, dir: 'down', move: 'still',
      text: s => s.badges.includes(g.badge)
        ? (gd.after || `You beat ${g.leader.title}! That ${g.badgeName} looks good on you.`)
        : (gd.before || `Hey, challenger! ${g.leader.title} runs ${g.type} trains. Pick your matchups carefully and keep your trains healthy!`),
    };
  }
  function crewNpc(c) {
    return { id: c.id, sprite: c.sprite, look: c.look, x: c.x, y: c.y, dir: c.dir, move: 'still',
      trainer: { id: c.id, cls: c.cls, name: c.name, sight: c.sight, prize: c.prize || 40, party: c.party, intro: c.intro, defeat: c.defeat, post: c.post } };
  }

  function leaderTalk(g) {
    const SP = g.leader.title, d = g.dialogue;
    return function* (n) {
      const st = CD.state;
      if (st.badges.includes(g.badge)) {
        for (const line of d.post) yield* say(line, SP);
        return;
      }
      for (const line of d.pre) yield* say(line, SP);
      n.trainer = { id: g.leader.id, cls: 'STATIONMASTER', name: g.leader.name, prize: g.prize, party: g.party, items: ['superpotion'], ai: 'ace',
        music: 'leader', victory: 'victoryTrainer', terrain: 'gym', defeat: d.defeat };
      const res = yield* CD.encounters.fightTrainer(n);
      n.trainer = null;
      if (res !== 'win') return;
      yield* award(g);
      O.resume();
    };
  }

  // Hand over a leader's badge, its technique and the gift. Awarding twice is a no-op.
  function* award(g) {
    const st = CD.state, SP = g.leader.title, d = g.dialogue;
    if (st.badges.includes(g.badge)) return;
    for (const line of d.award) yield* say(line, SP);
    st.badges.push(g.badge);
    if (g.effect.technique && !st.techniques.includes(g.effect.technique)) st.techniques.push(g.effect.technique);
    CD.audio.jingle('badge');
    yield* badgeShow(g.badge);
    yield* say(`{PLAYER} received the ${g.badgeName} from ${titleCase(SP)}!`);
    yield* say(d.effect, SP);
    if (g.gift) {
      st.bag[g.gift.item] = (st.bag[g.gift.item] || 0) + g.gift.count;
      CD.audio.jingle('item');
      const it = CD.items && CD.items.get ? CD.items.get(g.gift.item) : null;
      yield* say(`{PLAYER} also received ${g.gift.count} ${it ? it.name : g.gift.item.toUpperCase()}${g.gift.count > 1 ? 'S' : ''}!`);
    }
  }
  function titleCase(s) { return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()); }

  for (const g of CD.gyms.LIST) {
    const gym = W.maps[g.map];
    if (!gym) throw new Error('gym ' + g.badge + ' has no interior map ' + g.map);
    gym.npcs = [guideNpc(g)].concat((g.crew || []).map(crewNpc), [
      { id: g.leader.id, sprite: g.leader.sprite, x: g.leader.x, y: g.leader.y, dir: 'down', move: 'still', talk: leaderTalk(g) },
    ]);
  }

  // Stepping onto a gym's rail switch flips its track tiles. It runs before the
  // trainer-sight hook so a crew member spotting the player cannot swallow it.
  CD.ow.hooks.afterStep.unshift((m, p) => { CD.railSwitch.onArrive(CD.state, m.id, p.x, p.y); return false; });

  // ---------- badge art ----------
  const BADGES = {};
  for (const g of CD.gyms.LIST) BADGES[g.badge] = Object.assign({ name: g.badgeName }, g.art);

  // Each mark is drawn on a 9x9 grid centred on the badge, one cell per pixel at k=1.
  const MARKS = {
    anchor: px => { for (let y = -3; y <= 2; y++) px(0, y); for (let x = -2; x <= 2; x++) px(x, -2); for (let x = -3; x <= 3; x++) px(x, 3 - Math.round(Math.abs(x) * 0.6)); px(0, -4); },
    bolt: px => { [[1, -4], [0, -3], [1, -3], [-1, -2], [0, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [0, 0], [1, 0], [-1, 1], [0, 1], [-1, 2], [-2, 3]].forEach(([x, y]) => px(x, y)); },
    flame: px => { for (let y = -3; y <= 3; y++) { const r = y < 0 ? 3 + y : 3 - Math.floor(y / 2); for (let x = -r + 1; x < r; x++) px(x, y); } px(0, -4); },
    gear: px => { for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; px(Math.round(Math.cos(t) * 3), Math.round(Math.sin(t) * 3)); px(Math.round(Math.cos(t) * 4), Math.round(Math.sin(t) * 4)); } for (const [x, y] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) px(x, y); },
    wing: px => { for (let x = -4; x <= 4; x++) px(x, Math.abs(x) > 2 ? -1 : 0); for (let x = -3; x <= 3; x++) px(x, 1); for (let x = -2; x <= 2; x++) px(x, 2); px(0, -1); px(0, -2); },
    lantern: px => { for (let x = -1; x <= 1; x++) { px(x, -4); px(x, 3); } for (let y = -3; y <= 2; y++) { px(-2, y); px(2, y); } px(0, -1); px(0, 0); px(0, 1); },
    atom: px => { for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; px(Math.round(Math.cos(t) * 4), Math.round(Math.sin(t) * 1.5)); px(Math.round(Math.sin(t) * 1.5), Math.round(Math.cos(t) * 4)); } px(0, 0); },
    peak: px => { for (let y = -3; y <= 3; y++) for (let x = -(y + 3) / 1.2; x <= (y + 3) / 1.2; x++) px(Math.round(x), y); },
  };

  function draw(s, id, cx, cy, big) {
    const b = BADGES[id]; if (!b) return;
    const k = big ? 3 : 1;
    s.ellipse(cx, cy, 7 * k, 7 * k, b.rim); s.ellipse(cx, cy, 6 * k, 6 * k, CD.pal.brass); s.ellipse(cx, cy, 4.5 * k, 4.5 * k, b.face);
    const px = (x, y) => s.fill(Math.round(cx + x * k), Math.round(cy + y * k), k, k, b.mark);
    (MARKS[b.shape] || MARKS.anchor)(px);
    if (big) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + CD.frame * 0.05; s.px(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, '#fff8d0'); }
  }
  function* badgeShow(id) {
    const sc = { update() {}, draw(s) {
      U.frame(s, 76, 12, 88, 86, { paper: '#2a2440' });
      draw(s, id, 120, 50, true);
      CD.font.drawCenter(s, BADGES[id].name, 120, 84, CD.pal.brassL);
    } };
    E.push(sc);
    yield* E.wait(Math.round(CD.audio.jingleSeconds('badge') * 60) + 30);
    E.remove(sc);
  }
  CD.badges = { BADGES, MARKS, draw, badgeShow, award };

  CD.encounters.wireTrainers();
})(window.CD);
