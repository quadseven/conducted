// The eight Station Masters of Locomotia, in campaign order (STORY.md): where
// each gym stands, the leader's party and lines, the badge they award, and what
// that badge does for the player. src/scripts/gym.js turns these records into
// the gym crews and leader battles; nothing here touches the game state.
//
// party:   [[species id, level], ...], strongest train last. Each leader's
//          ace and average level beat the previous leader's.
// effect:  stat  -> the player's trains get BOOST on that stat in battle
//                   (the handheld badge boost; crits ignore it like stages)
//          technique -> the field technique the badge lets trains use
// crew:    gym trainers between the door and the leader
(function (CD) {
  'use strict';
  const BOOST = 1.125;

  const LIST = [
    {
      badge: 'harbor', badgeName: 'HARBOR BADGE', town: 'CoalHarbor', map: 'HarborGym', type: 'FREIGHT',
      leader: { id: 'marina', name: 'MARINA', title: 'CAPTAIN MARINA', sprite: 'marina', x: 5, y: 2 },
      party: [[13, 10], [16, 11], [17, 13]],
      effect: { stat: 'atk', technique: 'CARGO PULL' },
      gift: { item: 'superpotion', count: 2 }, prize: 100,
      art: { rim: '#8e6c2c', face: '#2f5f8a', mark: '#ecd08a', shape: 'anchor' },
      guide: { x: 4, y: 12, sprite: 'sailor', look: { stripes: '#c8513f' },
        before: "Ahoy, future champ! The Captain's crew runs FREIGHT trains: heavy and hard to budge. DIESEL power pushes them around, and heavy freight does little to MAGLEV trains. Good luck!",
        after: 'You beat the Captain! You sailed through this gym like it was calm water.' },
      puzzle: {
        switches: [
          { x: 2, y: 3, id: 'harborSwitch1' },
          { x: 8, y: 3, id: 'harborSwitch2' },
          { x: 5, y: 7, id: 'harborSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0, 1, 0],
          [0, 1, 0, 2, 2, 2, 0, 1, 0],
          [0, 1, 0, 2, 3, 2, 0, 1, 0],
          [0, 1, 0, 2, 2, 2, 0, 1, 0],
          [0, 1, 0, 0, 0, 0, 0, 1, 0],
          [0, 1, 1, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false], // All switches start OFF (blocked)
      },
      crew: [
        { id: 'gymSailor', sprite: 'sailor', x: 0, y: 8, dir: 'right', cls: 'DECKHAND', name: 'GUS', sight: 5, prize: 30, party: [[16, 9], [13, 10]],
          intro: 'Stop right there! Nobody reaches the Captain without getting past the crew!', defeat: 'Man overboard! That was me!', post: "The Captain's ferry train is her pride. Watch out for its tidal attacks." },
        { id: 'gymWorker', sprite: 'worker', x: 8, y: 4, dir: 'left', cls: 'DOCKHAND', name: 'IDA', sight: 4, prize: 30, party: [[43, 10], [52, 10]],
          intro: 'I load crates all day. Hauling your train off this dock will be easy!', defeat: "Well, I'll be. You hauled me instead.", post: 'Keep your trains healthy. The Captain never gives up easily.' },
      ],
      dialogue: {
        pre: [
          "Ahoy there, young Conductor! Welcome to Coal Harbor! I'm Captain Marina, and this gym is my ship!",
          "My freight trains have hauled cargo across stormy seas and treacherous mountain passes. They're tough as iron and twice as stubborn!",
          "Your grandfather once stood where you're standing, you know. He earned his first badge right here! Let's see if you've got his mettle! All hands on deck!",
        ],
        defeat: "Blow me down! You've got the heart of a true Conductor! Your grandfather would've been proud to see that battle!",
        award: [
          "You've earned your passage! The Harbor Badge is yours, sailor. You've proven you can weather any storm!",
          'This Harbor Badge represents the strength of the sea and the perseverance of freight trains. Wear it with pride!',
        ],
        effect: 'With that badge, your trains will trust you more, and you can use CARGO PULL outside of battle. Fair winds and following seas!',
        post: [
          "The harbor's always bustling with ships and trains coming and going. It's the life I love: never a dull moment!",
          "Once the new line opens, head northeast to Voltage City. Engineer Spark runs that gym. Sharp as a tack and twice as energetic! Give 'em my regards!",
        ],
      },
    },
    {
      badge: 'voltage', badgeName: 'VOLTAGE BADGE', town: 'VoltageCity', map: 'VoltageGym', type: 'ELECTRIC',
      leader: { id: 'spark', name: 'SPARK', title: 'ENGINEER SPARK', sprite: 'spark', x: 5, y: 1 },
      party: [[28, 18], [29, 19], [136, 20], [5, 22]],
      effect: { stat: 'spd', technique: 'ELECTRO-DASH' },
      gift: { item: 'parlyzheal', count: 3 }, prize: 180,
      art: { rim: '#8a7a1a', face: '#2a2a30', mark: '#f8e040', shape: 'bolt' },
      crew: [{ id: 'gymVoltageTech', sprite: 'worker', look: { hatCol: '#f8e040', shirt: '#2a2a30' }, x: 2, y: 6, dir: 'right', cls: 'LINE TECH', name: 'WATT', sight: 4, party: [[28, 15], [134, 17]],
        intro: 'Live wire coming through! Nobody touches the boss without a spark check!', defeat: 'Zapped! My circuits are fried.', post: 'The boss rebuilt the city grid with his own two hands. Ground yourself before you go up.' }],
      puzzle: {
        switches: [
          { x: 3, y: 4, id: 'voltageSwitch1' },
          { x: 7, y: 4, id: 'voltageSwitch2' },
          { x: 5, y: 8, id: 'voltageSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          "Hey hey HEY! Fresh challenger! I'm Engineer Spark, and WELCOME to Voltage City, the place that NEVER sleeps because we've got too much ENERGY!",
          "My electric trains are the fastest, sleekest, most ELECTRIFYING trains you'll ever see! They move at the speed of lightning. Literally!",
          "I've been itching for a good battle all day! Let's see if you can keep up with the current! Time to get CHARGED UP!",
        ],
        defeat: 'WHOOOOA! That was SHOCKING! You short-circuited my whole strategy! That was AMAZING!',
        award: [
          "I haven't had a battle that electrifying in MONTHS! You've totally earned the Voltage Badge, no question!",
          'This Voltage Badge is YOURS! It represents speed, innovation, and the unstoppable force of progress! BZZZZT!',
        ],
        effect: "With that badge, your trains' SPEED will get a boost! Plus you can use ELECTRO-DASH to zoom across the map! So cool, right?!",
        post: [
          'Voltage City runs on innovation! We are always upgrading, always improving! The future is ELECTRIC, my friend!',
          "Next stop: Steamspring Village! Conductor Ember's old-fashioned, but don't underestimate tradition. There's power in history too!",
        ],
      },
    },
    {
      badge: 'boiler', badgeName: 'BOILER BADGE', town: 'SteamspringVillage', map: 'BoilerGym', type: 'STEAM',
      leader: { id: 'ember', name: 'EMBER', title: 'CONDUCTOR EMBER', sprite: 'ember', x: 5, y: 1 },
      party: [[132, 24], [2, 25], [78, 26], [20, 28]],
      effect: { stat: 'def', technique: 'STEAM CLOUD' },
      gift: { item: 'burnheal', count: 3 }, prize: 220,
      art: { rim: '#6a2a2a', face: '#8a3a3a', mark: '#f0c070', shape: 'flame' },
      crew: [{ id: 'gymBoilerStoker', sprite: 'conductor', look: { hatCol: '#6a2a2a', shirt: '#6a2a2a' }, x: 8, y: 7, dir: 'left', cls: 'STOKER', name: 'COLE', sight: 4, party: [[19, 21], [132, 22]],
        intro: 'Mind the firebox! Every challenger here gets a taste of the heat first.', defeat: 'My fire burned out before yours did.', post: "Conductor Ember keeps the old engines running out of love. You can feel it in the warmth of this place." }],
      puzzle: {
        switches: [
          { x: 4, y: 5, id: 'boilerSwitch1' },
          { x: 6, y: 5, id: 'boilerSwitch2' },
          { x: 5, y: 8, id: 'boilerSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          "Welcome to Steamspring Village, young Conductor. I'm Conductor Ember, keeper of the old ways and guardian of steam train history.",
          'I see your grandfather in you: the same determined eyes, the same gentle way you treat your train. He was a dear friend of mine, you know.',
          "Steam trains are the heart of Locomotia's heritage. They're not the fastest or the flashiest, but they have soul. Let me show you the beauty of tradition!",
        ],
        defeat: "Ah... yes. I can see it clearly now. Your grandfather's spirit lives on in you, but your path is your own. Beautifully done.",
        award: [
          "You've honored both tradition and innovation in your battle. The Boiler Badge is yours, earned with skill and heart.",
          'This Boiler Badge represents the enduring power of steam, the foundation upon which all trains were built. Carry it with respect.',
        ],
        effect: "With this badge, your trains' DEFENSE will strengthen, and you can use the STEAM CLOUD ability to navigate foggy areas. Use it wisely.",
        post: [
          'Your grandfather used to visit the hot springs here to rest his trains. Old Iron loved the warm mineral waters... I miss those days.',
          'The path ahead grows more challenging. Diesel Den is an industrial place: loud, grimy, but honest. Boss Torque is tough, but fair. Good luck, young one.',
        ],
      },
    },
    {
      badge: 'piston', badgeName: 'PISTON BADGE', town: 'DieselDen', map: 'PistonGym', type: 'DIESEL',
      leader: { id: 'torque', name: 'TORQUE', title: 'BOSS TORQUE', sprite: 'torque', x: 5, y: 1 },
      party: [[34, 29], [115, 30], [105, 32], [36, 34]],
      effect: { stat: 'spc', technique: 'TORQUE SHIFT' },
      gift: { item: 'superpotion', count: 3 }, prize: 260,
      art: { rim: '#4a4a4a', face: '#6a5a3a', mark: '#e8a040', shape: 'gear' },
      crew: [{ id: 'gymPistonMechanic', sprite: 'worker', look: { shirt: '#5a5a5a' }, x: 1, y: 5, dir: 'right', cls: 'MECHANIC', name: 'RIVET', sight: 4, party: [[7, 26], [34, 27]],
        intro: "Shift's not over till I say so! Let's see what's under your hood.", defeat: 'Blew a gasket. Nice driving.', post: "Boss Torque doesn't talk much. He lets his engines do it for him." }],
      puzzle: {
        switches: [
          { x: 2, y: 4, id: 'pistonSwitch1' },
          { x: 8, y: 4, id: 'pistonSwitch2' },
          { x: 5, y: 7, id: 'pistonSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          "So you're the kid working the main line. I'm Boss Torque. Diesel Den builds the engines everyone else takes credit for.",
          "Out here nobody hands you anything. You earn it with sweat, grease and horsepower. My crew runs on all three.",
          "Talk's cheap. Let's hear your engines roar. Throttle up!",
        ],
        defeat: "Hah! Stalled me out cold. That's honest work, kid. I respect that.",
        award: [
          "You out-pulled the whole Den. The Piston Badge is yours, and you earned every bolt of it.",
          'This Piston Badge stands for the grit that keeps Locomotia moving when the shiny trains break down.',
        ],
        effect: "With it your trains' SPECIAL power runs hotter, and you can use TORQUE SHIFT to push heavy carts off the line.",
        post: [
          "The Den never stops. Somebody's always welding something. Best noise in the world.",
          "Maglev Heights is next. Sky Captain Aria's trains don't even touch the rails. Keep your feet on the ground, kid.",
        ],
      },
    },
    {
      badge: 'levitation', badgeName: 'LEVITATION BADGE', town: 'MaglevHeights', map: 'LevitationGym', type: 'MAGLEV',
      leader: { id: 'aria', name: 'ARIA', title: 'SKY CAPTAIN ARIA', sprite: 'aria', x: 5, y: 1 },
      party: [[31, 33], [32, 35], [61, 36], [69, 37], [33, 39]],
      effect: { technique: 'MAG LIFT' },
      gift: { item: 'revive', count: 1 }, prize: 300,
      art: { rim: '#3a5a8a', face: '#a8c8e8', mark: '#ffffff', shape: 'wing' },
      crew: [{ id: 'gymLevitationPilot', sprite: 'aide', look: { shirt: '#a8c8e8', shirt2: '#3a5a8a' }, x: 9, y: 5, dir: 'left', cls: 'PILOT', name: 'SKYE', sight: 5, party: [[31, 30], [119, 32]],
        intro: 'Altitude check! Only conductors with steady nerves reach the captain.', defeat: 'I lost my bearings completely.', post: "Captain Aria says a maglev doesn't fight the rails, it floats over them. Try to think like that." }],
      puzzle: {
        switches: [
          { x: 3, y: 4, id: 'levitationSwitch1' },
          { x: 7, y: 4, id: 'levitationSwitch2' },
          { x: 5, y: 8, id: 'levitationSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          "Welcome aboard, Conductor. I'm Sky Captain Aria. Up here, we leave friction behind.",
          'My maglev trains never touch the ground. No wheels to slip, no rails to wear. Only balance and focus.',
          "Let's see whether your trains can keep up when the ground falls away. Clear for departure!",
        ],
        defeat: 'You kept your course through every gust. That was a beautiful flight.',
        award: [
          "Then it's settled. The Levitation Badge is yours, Conductor.",
          'This Levitation Badge marks a conductor who stays calm when everything around them is moving fast.',
        ],
        effect: 'With it your trains can use MAG LIFT, gliding over gaps the old rails cannot cross.',
        post: [
          'From the observation deck you can see the whole main line. It looks so small from up here.',
          "The old siding south of here leads to the Ghost Rail Graveyard. Phantom Conductor Raven waits there. Don't let the fog get to you.",
        ],
      },
    },
    {
      badge: 'specter', badgeName: 'SPECTER BADGE', town: 'GhostRailGraveyard', map: 'SpecterGym', type: 'FREIGHT',
      leader: { id: 'raven', name: 'RAVEN', title: 'PHANTOM CONDUCTOR RAVEN', sprite: 'raven', x: 5, y: 1 },
      party: [[82, 38], [40, 40], [112, 41], [42, 42], [48, 44]],
      effect: { technique: 'NIGHT LAMP' },
      gift: { item: 'fullheal', count: 2 }, prize: 340,
      art: { rim: '#2a1a3a', face: '#4a3a5a', mark: '#a8f0c8', shape: 'lantern' },
      crew: [{ id: 'gymSpecterKeeper', sprite: 'oldman', look: { shirt: '#3a2a4a' }, x: 2, y: 8, dir: 'right', cls: 'YARD KEEPER', name: 'MORT', sight: 4, party: [[40, 36], [82, 37]],
        intro: 'Shh... the old freight cars are sleeping. You will wake them with a battle.', defeat: 'Even the dead ones cheered for you.', post: "Raven talks to the abandoned trains. Some nights, they talk back." }],
      puzzle: {
        switches: [
          { x: 3, y: 4, id: 'specterSwitch1' },
          { x: 7, y: 4, id: 'specterSwitch2' },
          { x: 5, y: 8, id: 'specterSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          '...You found your way through the fog. Few do. I am Raven, the Phantom Conductor.',
          'These freight cars were left to rust when the lines closed. I kept them company, and they stayed with me.',
          'Their last run is tonight. Ride it with them, if you dare. All aboard the final train!',
        ],
        defeat: 'The old cars are quiet now. I think you gave them the run they were waiting for.',
        award: [
          'Take the Specter Badge. It belongs to a conductor who is not afraid of the dark.',
          'This Specter Badge remembers every train that never came home. Keep their memory with you.',
        ],
        effect: 'With it your trains can use NIGHT LAMP and see the way through dark tunnels.',
        post: [
          'Listen. Can you hear the whistle? No one else ever can.',
          'Doctor Atom runs the Nuclear Station past the desert. Power without restraint is how lines like these end up here.',
        ],
      },
    },
    {
      badge: 'fusion', badgeName: 'FUSION BADGE', town: 'NuclearStation', map: 'FusionGym', type: 'NUCLEAR',
      leader: { id: 'atom', name: 'ATOM', title: 'DOCTOR ATOM', sprite: 'atom', x: 5, y: 1 },
      party: [[25, 42], [26, 44], [65, 45], [46, 46], [27, 47], [66, 49]],
      effect: { technique: 'REACTOR SURGE' },
      gift: { item: 'antidote', count: 5 }, prize: 380,
      art: { rim: '#2a5a2a', face: '#1a2a1a', mark: '#a8f040', shape: 'atom' },
      crew: [{ id: 'gymFusionScientist', sprite: 'aide', look: { shirt: '#e8f0e0', shirt2: '#5a8a3a' }, x: 8, y: 9, dir: 'left', cls: 'SCIENTIST', name: 'CURIE', sight: 4, party: [[25, 40], [137, 41]],
        intro: 'Unauthorized personnel! I must run a containment test on you at once.', defeat: 'My readings were... inconclusive.', post: 'Doctor Atom measures everything twice. Battles included.' }],
      puzzle: {
        switches: [
          { x: 3, y: 4, id: 'fusionSwitch1' },
          { x: 7, y: 4, id: 'fusionSwitch2' },
          { x: 5, y: 8, id: 'fusionSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          'Ah, the conductor from the main line. I am Doctor Atom. My readings predicted you would arrive about now.',
          'Nuclear trains carry more energy in one core than a city burns in a year. The trick is never letting it run away from you.',
          'Let us run the experiment. Hypothesis: your bond with your trains outlasts a meltdown. Begin!',
        ],
        defeat: 'Fascinating. My model did not account for you at all. I shall have to start over.',
        award: [
          'The data is conclusive. The Fusion Badge belongs to you.',
          'This Fusion Badge stands for power held in balance. Remember that half of it is restraint.',
        ],
        effect: 'With it your trains can use REACTOR SURGE to restart dead signal grids along the line.',
        post: [
          'The reactor hums at exactly the right pitch today. Can you hear it? Perfectly stable.',
          'Only Master Zen remains, on Monorail Mountaintop past the frozen tundra. He has not lost a battle in years.',
        ],
      },
    },
    {
      badge: 'summit', badgeName: 'SUMMIT BADGE', town: 'MonorailMountaintop', map: 'SummitGym', type: 'MONORAIL',
      leader: { id: 'zen', name: 'ZEN', title: 'MASTER ZEN', sprite: 'zen', x: 5, y: 1 },
      party: [[37, 46], [92, 48], [94, 49], [93, 50], [38, 52], [57, 54]],
      effect: { technique: 'SUMMIT CLIMB' },
      gift: { item: 'revive', count: 2 }, prize: 420,
      art: { rim: '#5a6a7a', face: '#e8f0f8', mark: '#4a7ab0', shape: 'peak' },
      crew: [{ id: 'gymSummitMonk', sprite: 'granny', look: { shirt: '#c8d8e8' }, x: 2, y: 9, dir: 'right', cls: 'HERMIT', name: 'SAGE', sight: 4, party: [[37, 44], [92, 45]],
        intro: 'The summit is quiet. Let us break the silence with one battle.', defeat: 'Your mind is clear. Go on up.', post: 'Master Zen rides a single rail across the clouds. Balance is everything to him.' }],
      puzzle: {
        switches: [
          { x: 3, y: 4, id: 'summitSwitch1' },
          { x: 7, y: 4, id: 'summitSwitch2' },
          { x: 5, y: 8, id: 'summitSwitch3' },
        ],
        track: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 2, 3, 0, 0],
          [0, 1, 0, 2, 2, 0, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        solution: [false, false, false],
      },
      dialogue: {
        pre: [
          'You climbed the whole mountain to stand here. Breathe. I am Master Zen.',
          'A monorail has one beam and nothing else. Every train that rides it must find perfect balance, or fall.',
          'Seven badges brought you this far. Show me the balance you found along the way.',
        ],
        defeat: 'Still as the peak, swift as the wind. You have found it.',
        award: [
          'You hold every badge of Locomotia now. The Summit Badge completes your journey.',
          'This Summit Badge marks the end of one line and the start of another. The Grand Terminus waits.',
        ],
        effect: 'With it your trains can use SUMMIT CLIMB to ride the steepest grades in the land.',
        post: [
          'The clouds part every morning at the same moment. I have watched them for thirty years.',
          'Go to Victory Road. The Elite Conductors will not be as gentle with you as I was.',
        ],
      },
    },
  ];

  const byBadge = id => LIST.find(g => g.badge === id);

  // The stat multipliers the player's trains get from the badges in hand.
  function boosts(badges) {
    const out = { atk: 1, def: 1, spd: 1, spc: 1 };
    for (const id of badges || []) {
      const g = byBadge(id);
      if (g && g.effect.stat) out[g.effect.stat] = BOOST;
    }
    return out;
  }

  CD.gyms = { LIST, BOOST, byBadge, boosts };
})(window.CD);
