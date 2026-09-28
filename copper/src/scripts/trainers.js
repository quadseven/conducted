// Wild encounter tables, route trainers, and the first rival battle.
(function (CD) {
  'use strict';
  const W = CD.world, O = CD.overworld, U = CD.ui, E = CD.engine;
  const map = id => W.maps[id];
  const say = (t, sp) => U.say(t, sp ? { speaker: sp } : undefined);

  // [species, min level, max level, weight]; rate is out of 256 per step
  map('Route1').encounters = {
    grass: { rate: 26, slots: [[10, 2, 4, 32], [58, 2, 4, 28], [13, 3, 5, 18], [28, 3, 4, 10], [22, 3, 4, 7], [132, 3, 4, 5]] },
  };
  map('CoalHarbor').encounters = {
    yard: { rate: 30, slots: [[43, 5, 8, 24], [52, 6, 8, 18], [25, 5, 7, 18], [16, 5, 7, 14], [141, 5, 7, 10], [40, 6, 8, 8], [78, 7, 8, 5], [34, 6, 7, 3]] },
  };

  const add = (id, n) => { (map(id).npcs = map(id).npcs || []).push(n); };
  add('Route1', { id: 'r1youngster', sprite: 'youngster', x: 5, y: 8, dir: 'right', move: 'still',
    trainer: { id: 'r1youngster', cls: 'YOUNGSTER', name: 'TOBY', sight: 4, prize: 16, party: [[58, 4], [10, 4]],
      intro: "Hey! You've got a train! Mine are the fastest on Route 1!", defeat: "Aw, my Commutot missed its connection...", post: 'I\'m going to train in the tall grass until my trains never miss a timetable.' } });
  add('Route1', { id: 'r1lass', sprite: 'lass', look: { hair: '#5a3a28' }, x: 15, y: 17, dir: 'left', move: 'still',
    trainer: { id: 'r1lass2', cls: 'LASS', name: 'PENNY', sight: 3, prize: 18, party: [[10, 5], [13, 5]],
      intro: 'Our eyes met! That means we battle. Those are the rules of the rails!', defeat: "Oh! You're strong. My Cargoat's all tuckered out.", post: 'Cargoat climb anything. Mine climbed my dad\'s shed last week.' } });
  add('Route1', { id: 'r1bugkid', sprite: 'bugkid', x: 12, y: 24, dir: 'left', move: 'still',
    trainer: { id: 'r1bugkid', cls: 'RAIL FAN', name: 'RORY', sight: 3, prize: 12, party: [[10, 3], [10, 4], [11, 6]],
      intro: "I've been spotting trains all morning! Let me see yours up close!", defeat: 'Wow! I have to write that down in my spotter book.', post: 'Trackie turn into Coachoon, and then something amazing. Keep training and see!' } });

  // ---------- the first rival battle, right there in the lab ----------
  CD.story.rivalBattle = function* (rv) {
    const st = CD.state, R = st.rivalName;
    yield* say(`Wait, {PLAYER}! Let's check out our trains! Come on, I'll take you on!`, R);
    CD.audio.music('rival');
    // walk down in front of the player
    const p = CD.ow.player;
    const path = CD.story.path(rv.x, rv.y, p.x + 1, rv.y, true).concat(CD.story.path(p.x + 1, rv.y, p.x + 1, p.y));
    yield* O.walk(rv, path, { force: true });
    O.faceToward(rv, p); O.faceToward(p, rv);
    const n = { id: 'rivalLab', sprite: 'rival', trainer: {
      id: 'rival1', name: R, prize: 20, party: [[st.rivalStarter, 5]], music: 'trainer',
      defeat: 'What? Unbelievable! I picked the wrong egg!',
    } };
    const res = yield* CD.encounters.fightTrainer(n, { noBlackout: true });
    CD.state.flags.beatRival1 = res === 'win';
    if (res !== 'win') { CD.state.trainers.rival1 = true; yield* say('Yeah! Am I great or what? Just like I planned!', R); }
    yield* say("Fine. I'll toughen up out on the rails. See you at Coal Harbor, {PLAYER}!", R);
    CD.audio.music('lab');
    yield* O.walk(rv, CD.story.path(rv.x, rv.y, 5, rv.y, true).concat(CD.story.path(5, rv.y, 5, 11)), { force: true });
    CD.story.despawn(rv); CD.state.flags.rivalLeftLab = true;
  };

  CD.encounters.wireTrainers();
})(window.CD);
