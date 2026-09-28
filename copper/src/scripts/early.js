// Piston Town, Route 1 and Coal Harbor: NPCs, signs and the opening story beats.
// Dialogue for Professor Cypress follows WORLDBUILDING.md.
(function (CD) {
  'use strict';
  const W = CD.world, O = CD.overworld, U = CD.ui, E = CD.engine;
  const st = () => CD.state;
  const flag = f => !!CD.state.flags[f];
  const set = (f, v) => { CD.state.flags[f] = v === undefined ? true : v; };
  const say = (t, sp) => U.say(t, sp ? { speaker: sp } : undefined);
  const CY = 'PROF. CYPRESS';
  const RIVAL = () => st().rivalName;

  function map(id) { return W.maps[id]; }
  // Manhattan path from (x0,y0) to (x1,y1): vertical first unless told otherwise
  function path(x0, y0, x1, y1, horizFirst) {
    const v = [], h = [];
    for (let i = 0; i < Math.abs(y1 - y0); i++) v.push(y1 > y0 ? 'down' : 'up');
    for (let i = 0; i < Math.abs(x1 - x0); i++) h.push(x1 > x0 ? 'right' : 'left');
    return horizFirst ? h.concat(v) : v.concat(h);
  }
  function spawn(def) {
    const n = Object.assign({ map: st().map, dir: 'down', moving: false, prog: 0, speed: 2, anim: 0, tx: def.x, ty: def.y, jump: 0, move: 'still', home: { x: def.x, y: def.y }, wait: 0 }, def);
    CD.ow.npcs.push(n);
    return n;
  }
  function despawn(n) { const i = CD.ow.npcs.indexOf(n); if (i >= 0) CD.ow.npcs.splice(i, 1); }
  function* give(item, n, text) {
    CD.state.bag[item] = (CD.state.bag[item] || 0) + n;
    CD.audio.jingle('item');
    yield* U.say(text);
  }
  // Restore every train in the party: full HP, status cleared, PP refilled
  function* healParty(withJingle) {
    for (const t of CD.state.party) CD.train.heal(t);
    if (withJingle) {
      yield* U.fadeOut(12, '#ffffff');
      CD.audio.jingle('heal');
      yield* E.wait(Math.round(CD.audio.jingleSeconds('heal') * 60));
      yield* U.fadeIn(12);
    }
  }
  CD.story = { path, spawn, despawn, give, flag, set, healParty };

  // ------------------------------------------------------------ bedroom and house
  map('PlayerHouse2F').npcs = [];
  map('PlayerHouse2F').interact = (x, y, cell) => {
    if (!cell) return null;
    if (cell.ch === 'Q') return (function* () {
      yield* say('{PLAYER} booted up the PC.');
      yield* say('An old message from Grandpa is pinned to the desktop: "Look after the little engines, and they will look after you."');
    })();
    if (cell.ch === 'v') return say('A film about a steam engine crossing a desert all alone. It never stops once, not even for water.');
    if (cell.ch === 'G') return say('A globe of Locomotia. Rail lines are drawn on it in gold ink.');
    if (cell.ch === 'K') return say('Timetables, a book of knots, and "Your First Train" with the corners worn soft.');
    return null;
  };
  map('PlayerHouse1F').npcs = [
    { id: 'mom', sprite: 'mom', x: 5, y: 3, dir: 'left', move: 'still', talk: function* () {
      if (!flag('gotStarter')) {
        yield* say("Oh, {PLAYER}! You're finally up. Professor Cypress stopped by this morning.", 'MOM');
        yield* say("He said he had something special to show you at his lab. Don't keep him waiting!", 'MOM');
      } else if (CD.state.party.length) {
        yield* say('{PLAYER}, you and your train look tired. Take a quick rest.', 'MOM');
        yield* CD.story.healParty(true);
        yield* say('There! Good as new. Your grandfather used to come home covered in soot, too.', 'MOM');
      } else yield* say('Be careful out there, dear.', 'MOM');
    } },
  ];
  map('PlayerHouse1F').interact = (x, y, cell) => {
    if (!cell) return null;
    if (cell.ch === 'k') return say("Something is simmering. It smells like Mom's lentil stew.");
    if (cell.ch === 'v') return say('The news: "Rail traffic is up at Coal Harbor as the ferry season begins."');
    if (cell.ch === 'K' || cell.ch === 'E') return say('Cookbooks and train magazines, mostly train magazines.');
    return null;
  };
  map('RivalHouse').npcs = [
    { id: 'sis', sprite: 'lass', look: { hair: '#8a5a30' }, x: 4, y: 2, dir: 'down', move: 'look', text: s => s.flags.gotStarter
      ? "{RIVAL} left for Coal Harbor in a hurry. He always wants to be first. You'll catch up, I'm sure."
      : "Hi {PLAYER}! {RIVAL}'s already at the lab. He was up before the milk train!" },
  ];
  map('RivalHouse').interact = (x, y, cell) => cell && cell.ch === 'e' ? say('A model of the Great Northern express. The paint is chipped where someone played with it a lot.') : null;

  // ------------------------------------------------------------ Piston Town
  map('PistonTown').npcs = [
    { id: 'girl', sprite: 'lass', x: 3, y: 7, move: 'wander', range: 1, text: 'They say Old Iron still whistles on stormy nights. My grandma heard it once!' },
    { id: 'worker', sprite: 'worker', x: 12, y: 14, move: 'look', text: s => s.flags.gotStarter
      ? 'That train of yours has a good sound to it. The rails of this town remember engines like that.'
      : 'Piston Depot was the heart of this town. Every engine in Locomotia passed through here once.' },
  ];
  // Leaving town without a train: the Professor stops you and walks you to the lab
  function* stopAtEdge() {
    const p = CD.ow.player;
    CD.audio.music(null);
    yield* say('Wait! Hold on! Don\'t go out there!', CY);
    CD.overworld.emote(p, '!'); CD.audio.sfx('exclaim');
    yield* E.wait(40);
    p.dir = 'down';
    CD.audio.music('lab');
    const cy = spawn({ id: 'cypressWalk', sprite: 'cypress', x: 14, y: 11, dir: 'left' });
    const x = p.x;
    yield* O.walk(cy, path(14, 11, x, 11, true).concat(path(x, 11, x, p.y + 1)), { speed: 2 });
    cy.dir = 'up';
    yield* say('Phew! Wild trains roam the tall grass beyond town. Without a train of your own, they\'d run right over you!', CY);
    yield* say('That\'s exactly why I wanted to see you. Come with me to the lab!', CY);
    const cyPath = path(x, p.y + 1, x, 11).concat(path(x, 11, 14, 11, true)).concat(['up']);
    const plPath = ['down'].concat(cyPath.slice(0, -1));
    yield* E.together(O.walk(cy, cyPath, { speed: 2, force: true }), O.walk(p, plPath, { speed: 2, force: true }));
    despawn(cy);
    set('escorted');
    yield* O.walk(p, ['up'], { force: true });
    yield* O.doWarp(W.warpAt(W.get('PistonTown'), 14, 10));
  }
  map('PistonTown').triggers = [
    { x: 9, y: 1, cond: s => !s.flags.gotStarter, script: stopAtEdge },
    { x: 10, y: 1, cond: s => !s.flags.gotStarter, script: stopAtEdge },
  ];

  // ------------------------------------------------------------ Cypress Lab
  const STARTER_TEXT = {
    1: 'STEAMINI, the Steam Engine Train. A copper-colored steam train with a warm, gentle heart. Reliable and steadfast: a true friend for any journey.',
    4: 'SPARKART, the Electric Bullet Train. A sleek, silver electric train crackling with energy. Fast, ambitious, and always ready for a challenge!',
    7: 'DIESLING, the Diesel Engine Train. A sturdy brown diesel with a loyal, protective nature. Slow to start, but once it gets going, nothing can stop it.',
  };
  const CHOSEN_TEXT = {
    1: "Ah, STEAMINI! An excellent choice! This little steam train has a heart as warm as its boiler. Your grandfather's Old Iron was a steam type too. It seems the rails have a way of connecting families!",
    4: 'Ah, SPARKART! A splendid choice! This electric speedster has lightning in its wheels and fire in its spirit. You two are going to have quite the electrifying adventure together!',
    7: 'Ah, DIESLING! A wonderful choice! This diesel engine has the strength of mountains and the loyalty of a lifelong friend. Together, you\'ll overcome any obstacle on the tracks ahead!',
  };
  // The rival always takes the egg whose type beats yours
  const COUNTER = { 1: 4, 4: 7, 7: 1 };
  const EGG_X = { 1: 6, 4: 7, 7: 8 };

  map('CypressLab').npcs = [
    { id: 'cypress', sprite: 'cypress', x: 5, y: 2, dir: 'down', move: 'still', cond: s => s.flags.escorted, talk: function* () {
      if (!flag('gotStarter')) yield* say('Go on, take a look at the eggs. Choose the partner who calls to you!', CY);
      else if (!flag('beatRival1') && CD.battle) yield* say('Your train is eager to stretch its wheels. Why not test it against ' + RIVAL() + '?', CY);
      else if (CD.state.badges.includes('harbor')) yield* say("Remarkable! You've earned the Harbor Badge already! You're a natural Conductor, just like your grandfather!", CY);
      else yield* say('Head north on Route 1 to Coal Harbor. Captain Marina will be waiting to test you. May your rails always run true!', CY);
    } },
    { id: 'rivalLab', sprite: 'rival', x: 9, y: 4, dir: 'left', move: 'still', cond: s => s.flags.escorted && !s.flags.rivalLeftLab, talk: function* () {
      if (!flag('gotStarter')) yield* say("Hey {PLAYER}! The Professor made me wait for you. Hurry up and pick, will you?", RIVAL());
      else yield* say('My train is way better than yours. Just you wait.', RIVAL());
    } },
    { id: 'aide1', sprite: 'aide', x: 2, y: 9, move: 'wander', range: 1, text: 'The Professor studies how trains grow and change. Some even evolve into completely new forms!' },
    { id: 'aide2', sprite: 'aide', look: { hair: '#8a4a2a', shirt2: '#c8603a' }, x: 8, y: 10, move: 'look', text: 'Those eggs were found near the old Whistlestop Yards. Nobody has ever seen three together!' },
  ];
  map('CypressLab').onEnter = function* () {
    if (flag('escorted') && !flag('labIntro')) {
      set('labIntro');
      const p = CD.ow.player;
      O.npc('cypress').hidden = true;
      const cw = spawn({ id: 'cyWalk', sprite: 'cypress', x: 4, y: 10, dir: 'up' });
      yield* E.wait(10);
      yield* O.walk(cw, path(4, 10, 5, 3, false), { speed: 2 });
      yield* O.walk(cw, ['up'], { force: true, speed: 2 });
      despawn(cw);
      const c = O.npc('cypress'); c.hidden = false; c.dir = 'down';
      yield* O.walk(p, path(4, 11, 4, 5), { speed: 2 });
      p.dir = 'up';
      yield* say('{RIVAL}! You\'re already here?', st().name);
      yield* say("Of course. What took you so long, {PLAYER}?", RIVAL());
      yield* say("Now then. Look here! I've discovered three rare train eggs near the old Whistlestop Yards. Each one contains a different type of train!", CY);
      yield* say("As my late friend, your grandfather, used to say: 'The best train isn't the strongest or fastest. It's the one whose heart beats in rhythm with yours.'", CY);
      yield* say('Now, take your time and choose the partner who calls to you. This is an important decision!', CY);
      yield* say('Hey! What about me, Professor?', RIVAL());
      yield* say('Be patient, ' + RIVAL() + '. {PLAYER} chooses first.', CY);
    }
  };
  map('CypressLab').triggers = [
    { x: 4, y: 10, cond: s => s.flags.escorted && !s.flags.gotStarter, script: function* () {
      yield* say("Hey! Don't go away yet! You haven't chosen your train.", CY);
      yield* O.walk(CD.ow.player, ['up']);
    } },
    { x: 5, y: 10, cond: s => s.flags.escorted && !s.flags.gotStarter, script: function* () {
      yield* say("Hey! Don't go away yet! You haven't chosen your train.", CY);
      yield* O.walk(CD.ow.player, ['up']);
    } },
  ];
  // The egg preview: the train inside, shown in a window above the text box
  function preview(id) {
    return { draw(s) {
      U.frame(s, 76, 8, 88, 92, { paper: '#eef2f6' });
      const t = CD.frame;
      s.blit(CD.trainArt.sprite(id, 'front'), 88, 18 + Math.round(Math.sin(t / 12)));
      CD.font.drawCenter(s, CD.species.get(id).name, 120, 86, CD.pal.ink);
    }, update() {} };
  }
  function* chooseEgg(id) {
    if (flag('gotStarter')) {
      if (flag('egg' + id)) return yield* say('An empty cradle, still warm.');
      return yield* say("That's the Professor's last egg. He's keeping it safe for research.");
    }
    if (!flag('labIntro')) return yield* say('Three eggs rest in padded cradles. Better not touch them without the Professor.');
    const pv = preview(id);
    E.push(pv);
    CD.audio.cry(id, CD.species.get(id).types[0]);
    yield* say(STARTER_TEXT[id]);
    const r = yield* U.ask('So, you want ' + CD.species.get(id).name + '?');
    E.remove(pv);
    if (r !== 0) return;
    set('egg' + id); set('gotStarter'); st().vars.STARTER = CD.species.get(id).name;
    st().starter = id;
    yield* say(CHOSEN_TEXT[id], CY);
    const tr = CD.train.make(id, 5, { ot: st().name });
    st().party.push(tr);
    st().dex.seen[id] = true; st().dex.caught[id] = true;
    CD.audio.jingle('item');
    yield* say('{PLAYER} received ' + CD.species.get(id).name + '!');
    // the rival takes the egg that beats yours
    const rid = COUNTER[id];
    const rv = O.npc('rivalLab');
    const ex = EGG_X[rid];
    yield* say("Then I'll take this one!", RIVAL());
    yield* O.walk(rv, path(rv.x, rv.y, rv.x, 2).concat(path(rv.x, 2, ex, 2, true)));
    rv.dir = 'down';
    set('egg' + rid); st().rivalStarter = rid;
    CD.audio.cry(rid, CD.species.get(rid).types[0]);
    yield* say(RIVAL() + ' received ' + CD.species.get(rid).name + '!');
    yield* say('Heh. Mine beats yours on the timetable, {PLAYER}!', RIVAL());
    yield* say('Now then! Your ' + CD.species.get(id).name + ' is officially registered to you as its Conductor. The bond between you two begins today!', CY);
    yield* say('Before you set off, let me give you some essential supplies. Every Conductor needs these!', CY);
    CD.state.bag.trainball = (CD.state.bag.trainball || 0) + 5;
    CD.state.bag.potion = (CD.state.bag.potion || 0) + 2;
    CD.audio.jingle('item');
    yield* say('Professor Cypress handed you 5 TRAINBALLS and 2 POTIONS!');
    set('gotDex');
    CD.audio.jingle('item');
    yield* say('{PLAYER} received the TRAINDEX! Every train you meet is recorded in it automatically.');
    yield* say('Trainballs are used to catch wild trains. Throw one when a wild train is weakened in battle! Potions heal your trains when they\'re hurt.', CY);
    if (CD.story.rivalBattle) yield* CD.story.rivalBattle(rv);
    else {
      yield* say("I'm heading to Coal Harbor. Don't fall too far behind, {PLAYER}!", RIVAL());
      yield* O.walk(rv, path(rv.x, rv.y, 9, rv.y, true).concat(path(9, rv.y, 9, 7)).concat(path(9, 7, 5, 7, true)).concat(path(5, 7, 5, 11)), { force: true });
      despawn(rv); set('rivalLeftLab');
    }
    yield* say("The rails will take you anywhere, but only your heart will show you where to go. That's what your grandfather used to say.", CY);
    yield* say('Now, head north to Coal Harbor! Captain Marina is the Stationmaster there. Defeat her in battle to earn your first Rail Badge!', CY);
    yield* say('Good luck, young Conductor! May your rails always run true, and may your trains always come home safely!', CY);
  }
  map('CypressLab').interact = (x, y, cell) => {
    if (!cell) return null;
    if (cell.egg) return chooseEgg(cell.egg);
    if (cell.ch === 'Q') return say('Research notes: "Evolution appears tied to experience on the rails, not age alone."');
    if (cell.ch === 'Z') return say('A pressure gauge the size of a dinner plate. The needle twitches whenever a train walks by.');
    if (cell.ch === 'e') return say('A copper model of Old Iron. The Professor polishes it every morning.');
    if (cell.ch === 'w') return say('A driving wheel from a retired engine. Its spokes are worn smooth by a million turns.');
    if (cell.ch === 'G') return say('A globe with every rail line in the world marked in red.');
    if (cell.ch === 'K') return say('Shelves of research journals. "Coupler Behavior in Juvenile Freight Trains, Vol. 3."');
    return null;
  };

  // ------------------------------------------------------------ Route 1
  map('Route1').npcs = [
    { id: 'r1worker', sprite: 'worker', x: 12, y: 12, dir: 'down', move: 'look', text: 'Stop, look and listen! Trains always have right of way at a level crossing.' },
    { id: 'r1lass', sprite: 'lass', x: 14, y: 8, move: 'wander', range: 2, text: 'I love watching the freight trains go by. Did you know wild trains hide in the tall grass along the line?' },
    { id: 'r1old', sprite: 'oldman', x: 6, y: 27, move: 'look', text: s => s.party.length ? 'Ho! A young Conductor. Walk into tall grass and wild trains will try their luck against you.' : 'The grass is full of wild trains. You\'d best not go in without a partner.' },
  ];

  // ------------------------------------------------------------ Coal Harbor
  map('CoalHarbor').npcs = [
    { id: 'chSailor', sprite: 'sailor', x: 23, y: 4, dir: 'up', move: 'still', text: s => s.badges.includes('harbor') ? 'The ferry sails once the season opens. With that badge, you\'ll be welcome aboard.' : "The train ferry's not taking passengers yet. Come back when you've got a Harbor Badge, sailor." },
    { id: 'chFisher', sprite: 'fisher', x: 6, y: 4, dir: 'up', move: 'still', text: "I've been fishing off this dock for thirty years. Once I hooked a tiny ferry train! It swam right off with my lure." },
    { id: 'chWorker', sprite: 'worker', x: 9, y: 9, move: 'wander', range: 2, text: 'The weedy sidings in the east yard are full of wild trains. Rusty old freight cars, mostly.' },
    { id: 'chGranny', sprite: 'granny', x: 7, y: 17, move: 'wander', range: 2, text: 'Captain Marina started out loading cargo trains on these very docks. Now look at her!' },
    { id: 'chKid', sprite: 'youngster', x: 18, y: 19, move: 'wander', range: 2, text: "The Gym's full of crates. You've got to find a way through them to reach the Captain!" },
    { id: 'chConductor', sprite: 'conductor', x: 13, y: 10, dir: 'down', move: 'look', text: 'The harbor line runs freight all day. Wait for the train to pass before you cross.' },
  ];
  map('HarborHouse').npcs = [
    { id: 'hhMan', sprite: 'sailor', look: { stripes: '#b8574a' }, x: 5, y: 3, dir: 'left', move: 'look', text: 'The captain keeps her freight trains shipshape. Tough as iron and twice as stubborn, she says.' },
    { id: 'hhGirl', sprite: 'lass', look: { hair: '#3a2a20' }, x: 2, y: 5, move: 'wander', range: 1, text: "Do you know the move CARGO PULL? The Captain lets Harbor Badge holders use it outside of battle." },
  ];
  map('HarborHouse').interact = (x, y, cell) => cell && cell.ch === 'w' ? say('A ship\'s wheel mounted on the wall, repainted every spring.') : cell && cell.ch === 'v' ? say('A weather report: "Fog rolling in over the bay by evening."') : null;
})(window.CD);
