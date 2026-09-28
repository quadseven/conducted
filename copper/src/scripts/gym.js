// Coal Harbor Gym: a maze of cargo crates, two crew members on watch, and
// Captain Marina with the Harbor Badge. Dialogue follows WORLDBUILDING.md.
(function (CD) {
  'use strict';
  const W = CD.world, O = CD.overworld, U = CD.ui, E = CD.engine;
  const say = (t, sp) => U.say(t, sp ? { speaker: sp } : undefined);
  const M = 'CAPTAIN MARINA';

  const gym = W.maps.HarborGym;
  gym.npcs = [
    { id: 'gymGuide', sprite: 'sailor', look: { stripes: '#c8513f' }, x: 4, y: 12, dir: 'down', move: 'still', text: s => s.badges.includes('harbor')
      ? 'You beat the Captain! You sailed through this gym like it was calm water.'
      : "Ahoy, future champ! The Captain's crew runs FREIGHT trains: heavy and hard to budge. DIESEL power pushes them around, and heavy freight does little to MAGLEV trains. Good luck!" },
    { id: 'gymSailor', sprite: 'sailor', x: 0, y: 8, dir: 'right', move: 'still',
      trainer: { id: 'gymSailor', cls: 'DECKHAND', name: 'GUS', sight: 5, prize: 30, party: [[16, 9], [13, 10]],
        intro: "Stop right there! Nobody reaches the Captain without getting past the crew!", defeat: 'Man overboard! That was me!', post: "The Captain's ferry train is her pride. Watch out for its tidal attacks." } },
    { id: 'gymWorker', sprite: 'worker', x: 8, y: 4, dir: 'left', move: 'still',
      trainer: { id: 'gymWorker', cls: 'DOCKHAND', name: 'IDA', sight: 4, prize: 30, party: [[43, 10], [52, 10]],
        intro: 'I load crates all day. Hauling your train off this dock will be easy!', defeat: "Well, I'll be. You hauled me instead.", post: 'Keep your trains healthy. The Captain never gives up easily.' } },
    { id: 'marina', sprite: 'marina', x: 5, y: 2, dir: 'down', move: 'still', talk: marina },
  ];

  function* marina(n) {
    const st = CD.state;
    if (st.badges.includes('harbor')) {
      yield* say("The harbor's always bustling with ships and trains coming and going. It's the life I love: never a dull moment!", M);
      yield* say("Once the new line opens, head northeast to Voltage City. Engineer Spark runs that gym. Sharp as a tack and twice as energetic! Give 'em my regards!", M);
      return;
    }
    yield* say("Ahoy there, young Conductor! Welcome to Coal Harbor! I'm Captain Marina, and this gym is my ship!", M);
    yield* say("My freight trains have hauled cargo across stormy seas and treacherous mountain passes. They're tough as iron and twice as stubborn!", M);
    yield* say("Your grandfather once stood where you're standing, you know. He earned his first badge right here! Let's see if you've got his mettle! All hands on deck!", M);
    n.trainer = { id: 'marina', cls: 'STATIONMASTER', name: 'MARINA', prize: 100, party: [[13, 10], [16, 11], [17, 13]], items: ['superpotion'],
      music: 'leader', victory: 'victoryTrainer', terrain: 'gym',
      defeat: "Blow me down! You've got the heart of a true Conductor! Your grandfather would've been proud to see that battle!" };
    const res = yield* CD.encounters.fightTrainer(n);
    n.trainer = null;
    if (res !== 'win') return;
    yield* say("You've earned your passage! The Harbor Badge is yours, sailor. You've proven you can weather any storm!", M);
    yield* say('This Harbor Badge represents the strength of the sea and the perseverance of freight trains. Wear it with pride!', M);
    st.badges.push('harbor');
    CD.audio.jingle('badge');
    yield* badgeShow('harbor');
    yield* say('{PLAYER} received the HARBOR BADGE from Captain Marina!');
    yield* say("With that badge, your trains will trust you more, and you can use CARGO PULL outside of battle. Fair winds and following seas!", M);
    st.bag.superpotion = (st.bag.superpotion || 0) + 2;
    CD.audio.jingle('item');
    yield* say('{PLAYER} also received 2 SUPER POTIONS!');
    O.resume();
  }

  // ---------- badge art ----------
  const BADGES = {
    harbor: { name: 'HARBOR BADGE', rim: '#8e6c2c', face: '#2f5f8a', mark: '#ecd08a' },
  };
  function draw(s, id, cx, cy, big) {
    const b = BADGES[id]; if (!b) return;
    const k = big ? 3 : 1;
    s.ellipse(cx, cy, 7 * k, 7 * k, b.rim); s.ellipse(cx, cy, 6 * k, 6 * k, CD.pal.brass); s.ellipse(cx, cy, 4.5 * k, 4.5 * k, b.face);
    // an anchor over a wave
    const px = (x, y) => s.fill(Math.round(cx + x * k), Math.round(cy + y * k), k, k, b.mark);
    for (let y = -3; y <= 2; y++) px(0, y);
    for (let x = -2; x <= 2; x++) px(x, -2);
    for (let x = -3; x <= 3; x++) px(x, 3 - Math.round(Math.abs(x) * 0.6));
    px(0, -4);
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
  CD.badges = { BADGES, draw, badgeShow };

  CD.encounters.wireTrainers();
})(window.CD);
