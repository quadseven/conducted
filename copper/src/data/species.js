// Train species. Names and evolution lines come from TRAIN_NAMES.md; types map
// each line's theme onto the eight train types; starter descriptions come from
// WORLDBUILDING.md. Stats are this game's own, built from a role (how the total
// is spread) and a total that grows with each evolution stage.
//
// S(id, name, types, stats, growth, catchRate, expYield, evo, moves, dex, art)
//   stats: [hp, atk, def, spd, spc] or st(role, total)
//   evo:   [level, intoId] or ['item', itemId, intoId] or null
//   moves: 'level:Move, level:Move' or null to derive from the type pools
//   dex:   [classification, height m, weight kg, entry]
(function (CD) {
  'use strict';
  const list = {};
  const ROLES = {
    bal: [1, 1, 1, 1, 1], fast: [0.85, 1.05, 0.8, 1.5, 0.9], tank: [1.2, 0.95, 1.5, 0.55, 0.8],
    phys: [1, 1.45, 1, 0.95, 0.6], spec: [0.9, 0.65, 0.8, 1.1, 1.55], wall: [1.5, 0.7, 1.25, 0.5, 1.05],
    glass: [0.7, 1.3, 0.6, 1.45, 1.05], swift: [0.8, 0.8, 0.8, 1.6, 1.1], bruiser: [1.25, 1.35, 1.1, 0.65, 0.65],
  };
  function st(role, total) {
    const w = ROLES[role], sum = w.reduce((a, b) => a + b, 0);
    return w.map(x => Math.max(10, Math.round(total * x / sum)));
  }
  // Type move pools, weakest first. Derived learnsets walk these by level.
  const POOL = {
    PASSENGER: ['Ram', 'Horn Honk', 'Express Shunt', 'Whistle Blast', 'Iron Bumper', 'Passenger Rush', 'Coupler Crush', 'Double Header', 'Full Throttle', 'Timetable'],
    STEAM: ['Firebox', 'Coal Throw', 'Smoke Screen', 'Steam Jet', 'Stoke Up', 'Scald Whistle', 'Boiler Burst', 'Pressure Blast', 'Mega Steam'],
    ELECTRIC: ['Spark', 'Pantograph Spark', 'Static Hum', 'Third Rail', 'Charge Beam', 'Rail Gun', 'Lightning Express', 'Overload', 'EMP Blast'],
    DIESEL: ['Engine Rev', 'Exhaust Fumes', 'Diesel Spray', 'Torque Punch', 'Idle Rumble', 'Fuel Blast', 'Piston Drive', 'Turbo Charge'],
    FREIGHT: ['Cargo Toss', 'Ballast Toss', 'Tarp Wrap', 'Boxcar Bash', 'Anchor Drop', 'Tidal Haul', 'Container Crush', 'Heavy Haul', 'Freight Frenzy'],
    MAGLEV: ['Sonic Boom', 'Polarity Flip', 'Levitation', 'Signal Jam', 'Maglev Rush', 'Air Cushion', 'Magnetic Pulse'],
    MONORAIL: ['Mono-Strike', 'Beam Balance', 'Frost Rail', 'Cable Lash', 'Summit Drop'],
    NUCLEAR: ['Corrode', 'Radiation Leak', 'Isotope Sap', 'Containment Field', 'Atomic Flash', 'Reactor Meltdown'],
  };
  const P_LV = [1, 6, 11, 16, 22, 28, 35, 42, 50];
  const S_LV = [9, 19, 31, 45];
  function derive(types) {
    const out = [{ level: 1, move: 'Ram' }];
    const prim = POOL[types[0]];
    prim.forEach((m, i) => { if (i < P_LV.length) out.push({ level: P_LV[i], move: m }); });
    const second = types[1] ? POOL[types[1]] : POOL.PASSENGER.slice(1);
    second.forEach((m, i) => { if (i < S_LV.length) out.push({ level: S_LV[i], move: m }); });
    return out.filter((l, i, a) => a.findIndex(o => o.move === l.move) === i).sort((a, b) => a.level - b.level);
  }
  function S(id, name, types, base, growth, catchRate, exp, evo, moves, dex, art) {
    const ts = types.split('/');
    list[id] = {
      id, name, types: ts,
      base: { hp: base[0], atk: base[1], def: base[2], spd: base[3], spc: base[4] },
      growth, catchRate, exp,
      evo: evo ? (evo[0] === 'item' ? { item: evo[1], into: evo[2] } : { level: evo[0], into: evo[1] }) : null,
      learnset: moves ? moves.split(',').map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf(':'); return { level: +s.slice(0, i), move: s.slice(i + 1).trim() }; }) : derive(ts),
      dex: dex ? { cls: dex[0], ht: dex[1], wt: dex[2], text: dex[3] } : null,
      art,
    };
  }
  const A = (body, col, extra) => Object.assign({ body, col }, extra || {});
  const COPPER = '#c07a4a';

  // ------------------------------------------------------------ starters
  S(1, 'STEAMINI', 'STEAM', [44, 48, 46, 42, 56], 'mslow', 45, 64, [16, 2],
    '1:Ram, 1:Whistle Blast, 7:Coal Throw, 10:Smoke Screen, 13:Steam Jet, 18:Emergency Brake, 22:Coupler Crush, 27:Boiler Burst, 33:Pressure Blast',
    ['Little Engine Train', 2.4, 38, 'Friendly copper engines with gentle, patient hearts. They puff white steam when happy and never give up, even pulling twice their weight.'],
    A('steam', COPPER, { len: 36, h: 20, scale: 0.95, col2: '#8b5230', trim: '#c8a24e', faceCol: '#d8ccc0', eye: '#4a6a9a', stack: 'short', wheels: 2, wheelR: 7, bell: true, cowCol: '#d64545', face: 'cute' }));
  S(2, 'STEAMORE', 'STEAM', [60, 64, 60, 58, 72], 'mslow', 45, 142, [32, 3],
    '1:Ram, 1:Whistle Blast, 1:Coal Throw, 10:Smoke Screen, 13:Steam Jet, 18:Emergency Brake, 24:Coupler Crush, 30:Boiler Burst, 37:Pressure Blast, 44:Full Throttle',
    ['Journeyman Train', 4.3, 112, 'Its copper takes on a burnished bronze sheen. It runs on time, every time, and will push itself to the limit to protect its friends.'],
    A('steam', '#b0703e', { len: 48, h: 17, col2: '#6b4226', trim: '#d4a857', faceCol: '#cfc6bc', eye: '#3a5a8a', stack: 'tall', wheels: 3, wheelR: 6.5, bell: true, tender: true, face: 'bold' }));
  S(3, 'LOCOMOTOR', 'STEAM/FREIGHT', [80, 86, 84, 76, 92], 'mslow', 45, 236, null,
    '1:Ram, 1:Coal Throw, 1:Steam Jet, 1:Smoke Screen, 18:Emergency Brake, 24:Coupler Crush, 30:Boiler Burst, 32:Container Crush, 40:Pressure Blast, 48:Mega Steam',
    ['Legendary Engine Train', 6.7, 310, 'Polished steel with golden trim. Its steam burns so hot it glows faintly blue, and its whistle can be heard for miles.'],
    A('steam', '#6a7a92', { len: 54, h: 18, scale: 1.05, col2: '#3a4258', trim: '#e0b04e', faceCol: '#d8dce4', eye: '#2a6ab0', stack: 'tall', stackCol: '#2a3040', wheels: 3, wheelR: 7, tender: true, face: 'fierce', mouth: 'grin' }));
  S(4, 'SPARKART', 'ELECTRIC', [40, 50, 40, 64, 58], 'mslow', 45, 62, [16, 5],
    '1:Spark, 1:Horn Honk, 7:Pantograph Spark, 11:Express Shunt, 15:Third Rail, 19:Charge Beam, 25:Iron Bumper, 30:Rail Gun, 38:Lightning Express',
    ['Electric Bullet Train', 2.1, 30, 'Sleek and silver, crackling with small arcs when excited. Sparkart love to race the wind and sometimes make nearby lights flicker.'],
    A('electric', '#c8ccd8', { len: 42, h: 15, scale: 0.92, col2: '#aab0c0', stripe: '#3a78c8', window: '#9ad8f0', eye: '#2a8ad8', windows: 2, spark: '#f8e060', face: 'cute' }));
  S(5, 'VOLTRAIN', 'ELECTRIC', [58, 64, 56, 82, 76], 'mslow', 45, 142, [36, 6],
    '1:Spark, 1:Horn Honk, 1:Pantograph Spark, 11:Express Shunt, 15:Third Rail, 21:Charge Beam, 27:Iron Bumper, 33:Rail Gun, 42:Lightning Express, 48:Overload',
    ['High-Speed Train', 4.0, 88, 'Yellow bolt markings run along its frame. It accelerates so quickly it leaves electric afterimages on the track.'],
    A('electric', '#d0d4e0', { len: 50, h: 15, col2: '#b8bccc', stripe: '#e8c030', window: '#8ac8f0', eye: '#2a6ac8', windows: 3, spark: '#f8e060', face: 'bold' }));
  S(6, 'THUNDERAIL', 'ELECTRIC/MAGLEV', [76, 82, 74, 108, 104], 'mslow', 45, 240, null,
    '1:Spark, 1:Pantograph Spark, 1:Third Rail, 1:Express Shunt, 21:Charge Beam, 27:Iron Bumper, 33:Rail Gun, 36:Magnetic Pulse, 44:Lightning Express, 52:EMP Blast',
    ['Supersonic Train', 6.1, 190, 'Its body shimmers with shifting currents and its eyes glow like white-hot plasma. It outruns thunderstorms along the old routes.'],
    A('maglev', '#e8e8f0', { len: 56, h: 15, col2: '#c8c8dc', stripe: '#f0c828', window: '#5a4a9a', glow: '#f8f0a0', eye: '#e8a820', windows: 2, fins: true, face: 'fierce', mouth: 'fang' }));
  S(7, 'DIESLING', 'DIESEL', [48, 50, 56, 38, 44], 'mslow', 45, 63, [16, 8],
    '1:Ram, 1:Engine Rev, 7:Diesel Spray, 10:Wheel Grind, 13:Exhaust Fumes, 18:Iron Bumper, 22:Fuel Blast, 28:Coupler Crush, 34:Turbo Charge',
    ['Diesel Engine Train', 2.7, 52, 'Sturdy brown engines with the heart of a loyal working dog. Slow to start, but once rolling nothing stops them.'],
    A('diesel', '#9a6a44', { len: 40, h: 17, scale: 0.92, col2: '#b8824e', stripe: '#e8c040', faceCol: '#c8a070', eye: '#6a4a2a', exhaust: true, face: 'cute' }));
  S(8, 'WARTORQUE', 'DIESEL', [62, 66, 76, 52, 58], 'mslow', 45, 142, [32, 9],
    '1:Ram, 1:Engine Rev, 1:Diesel Spray, 10:Wheel Grind, 13:Exhaust Fumes, 20:Iron Bumper, 25:Fuel Blast, 31:Coupler Crush, 38:Turbo Charge, 45:Heavy Haul',
    ['Freight Hound Train', 4.6, 180, 'Broad and heavily plated, it can pull loads that would stop three smaller trains. Its engine rumble can be felt through the ground.'],
    A('diesel', '#7a5236', { len: 50, h: 18, col2: '#9a6a44', stripe: '#e8a030', faceCol: '#b88a5a', eye: '#8a3a2a', exhaust: true, face: 'bold', mouth: 'grille' }));
  S(9, 'TITANORQUE', 'DIESEL/FREIGHT', [84, 90, 104, 64, 70], 'mslow', 45, 239, null,
    '1:Ram, 1:Engine Rev, 1:Diesel Spray, 1:Wheel Grind, 20:Iron Bumper, 25:Fuel Blast, 31:Coupler Crush, 32:Heavy Haul, 42:Turbo Charge, 50:Freight Frenzy',
    ['Ultimate Freight Train', 7.3, 540, 'A colossal gentle giant. Its horn sounds like an old foghorn and its headlamps cut through the thickest fog.'],
    A('diesel', '#5a4a3a', { len: 56, h: 20, scale: 1.02, col2: '#7a6048', stripe: '#e8c040', faceCol: '#a88a6a', eye: '#c84a2a', exhaust: true, face: 'fierce', mouth: 'grille' }));

  // ------------------------------------------------------------ common lines of the early routes
  S(10, 'TRACKIE', 'PASSENGER', st('fast', 215), 'medium', 255, 39, [7, 11], '1:Ram, 1:Horn Honk, 5:Wheel Grind',
    ['Handcar Train', 0.6, 3, 'A tiny handcar that scurries along field tracks in busy little bursts. Flocks of them rattle through tall grass at dawn.'],
    A('tram', '#8ab860', { len: 30, h: 14, scale: 0.85, stripe: '#e8c040', window: '#e8f0c0', panto: false, eye: '#3a5a2a', face: 'cute' }));
  S(11, 'COACHOON', 'PASSENGER', st('wall', 225), 'medium', 120, 72, [10, 12], '1:Emergency Brake, 7:Emergency Brake',
    ['Shrouded Coach Train', 0.8, 10, 'It wraps itself in a canvas tarp and barely moves while its new carriage takes shape inside.'],
    A('coach', '#9a9a78', { len: 34, h: 18, scale: 0.9, windows: 0, roof: '#7a7a5a', stripe: '#b8b890', eye: '#5a5a3a', face: 'sleepy', mouth: 'line' }));
  S(12, 'MAJESTICAB', 'PASSENGER/MAGLEV', st('spec', 395), 'medium', 45, 178, null, '1:Ram, 10:Signal Jam, 13:Polarity Flip, 16:Passenger Rush, 21:Levitation, 26:Magnetic Pulse, 32:Express Service, 38:Air Cushion',
    ['Parlor Car Train', 1.1, 32, 'Emerging from its shroud, it unfolds velvet-lined wings of awning and glides on a cushion of air to the next flower-lined station.'],
    A('coach', '#8a6ab0', { len: 44, h: 16, windows: 4, roof: '#5a3a80', stripe: '#e8c8f0', window: '#f8e8a8', wings: true, wingCol: '#e8d8f8', eye: '#6a3a9a', face: 'cute' }));
  S(13, 'CARGOAT', 'FREIGHT', st('phys', 290), 'medium', 190, 58, [18, 14], '1:Ram, 1:Cargo Toss, 6:Horn Honk, 11:Iron Bumper, 16:Boxcar Bash, 22:Ballast Toss, 28:Anchor Drop, 35:Container Crush',
    ['Kid Boxcar Train', 1.0, 28, 'A stubborn little boxcar that butts anything in its way with its brass coupling horns. It will climb any grade to reach sweet hay.'],
    A('boxcar', '#b85a3a', { len: 34, h: 17, scale: 0.9, col2: '#9a4a2a', roof: '#7a3a22', horn: true, hornCol: '#e8d8b0', eye: '#4a2a1a', face: 'bold', mouth: 'smile' }));
  S(14, 'FREIGHTMARE', 'FREIGHT', st('phys', 395), 'medium', 90, 132, [36, 15], null,
    ['Night Freight Train', 2.2, 160, 'It thunders through junctions after dark with its lamps doused. Signalmen claim they hear it before it ever appears.'],
    A('boxcar', '#4a3a4a', { len: 46, h: 18, col2: '#2a2030', roof: '#1a1422', horn: true, hornCol: '#c8c0b8', spikes: 2, spikeY: 22, eye: '#c83a3a', face: 'fierce', mouth: 'fang' }));
  S(15, 'HAULOSSAL', 'FREIGHT/DIESEL', st('bruiser', 495), 'medium', 45, 221, null, null,
    ['Colossal Hauler Train', 5.8, 820, 'The heaviest train in common service. Bridges are tested by driving a Haulossal over them twice.'],
    A('hopper', '#6a5a4a', { len: 56, h: 22, load: '#3a3430', eye: '#e8a030', face: 'fierce', mouth: 'grille' }));
  S(16, 'PONTOON', 'FREIGHT', st('wall', 280), 'medium', 190, 56, [20, 17], '1:Ram, 1:Tarp Wrap, 7:Cargo Toss, 12:Tidal Haul, 17:Anchor Drop, 24:Beam Balance, 31:Container Crush',
    ['Float Car Train', 0.9, 20, 'A buoyant little barrel car that bobs across harbor slips. It loves being splashed and hums while it floats.'],
    A('tank', '#4f8fc0', { len: 32, h: 16, scale: 0.9, col2: '#6aaad8', stripe: '#e8f0f8', faceCol: '#b8d8ec', eye: '#2a4a7a', face: 'cute' }));
  S(17, 'FERROCEAN', 'FREIGHT/PASSENGER', st('wall', 395), 'medium', 90, 130, [38, 18], '1:Ram, 1:Tarp Wrap, 1:Cargo Toss, 12:Tidal Haul, 17:Anchor Drop, 20:Passenger Rush, 26:Beam Balance, 33:Container Crush, 41:Heavy Haul',
    ['Train Ferry Train', 3.6, 380, 'Half ship, half train, it carries whole carriages across the bay in its hold. It hoots a deep greeting to every lighthouse.'],
    A('coach', '#3f6f9a', { len: 50, h: 18, windows: 5, roof: '#e8e8e8', stripe: '#c84a3a', window: '#e8f4f8', eye: '#1a3a5a', face: 'bold' }));
  S(18, 'TSUNARAIL', 'FREIGHT/MAGLEV', st('bruiser', 500), 'medium', 45, 214, null, null,
    ['Tidal Wave Train', 6.2, 610, 'It surfs the crest of storm tides along coastal lines. Harbors ring their bells when one is sighted offshore.'],
    A('maglev', '#2f5f8a', { len: 56, h: 17, col2: '#3f7fb0', stripe: '#e8f8ff', window: '#a8e0f0', glow: '#c8f0ff', fins: true, eye: '#e8f8ff', face: 'fierce', mouth: 'fang' }));
  S(19, 'EMBERN', 'STEAM', st('glass', 285), 'medium', 190, 60, [22, 20], null,
    ['Ember Engine Train', 0.8, 18, 'A hot-tempered little tank engine. Its firebox never quite goes out, even when it sleeps.'],
    A('steam', '#c84a3a', { len: 32, h: 17, scale: 0.88, col2: '#8a2a22', trim: '#e8b040', faceCol: '#e8c8b0', stack: 'short', wheels: 2, wheelR: 6, eye: '#8a2a1a', face: 'bold', mouth: 'grin' }));
  S(20, 'BLAZELINE', 'STEAM', st('glass', 400), 'medium', 90, 128, [40, 21], null,
    ['Flame Express Train', 3.2, 140, 'Streamlined in scarlet, it leaves a ribbon of sparks along the rails. Farmers blame it for every dry-season brush fire.'],
    A('steam', '#d8502a', { len: 48, h: 16, col2: '#8a2a22', trim: '#f0c040', faceCol: '#f0d0b0', stack: 'short', wheels: 3, wheelR: 6, tender: true, eye: '#c83a1a', face: 'fierce' }));
  S(21, 'INFERNOTRAIN', 'STEAM/MAGLEV', st('glass', 510), 'medium', 45, 220, null, null,
    ['Inferno Express Train', 6.0, 400, 'Its boiler burns so hot the rails glow behind it. It is said to have crossed the Sunset Desert without once stopping for water.'],
    A('maglev', '#e0602a', { len: 56, h: 16, col2: '#a83a1a', stripe: '#f8e060', window: '#f8c060', glow: '#f8a040', fins: true, horn: true, hornCol: '#f8e0a0', eye: '#f8e060', face: 'fierce', mouth: 'grin' }));
  S(22, 'SPROUTCAR', 'PASSENGER', st('spec', 290), 'mslow', 190, 60, [16, 23], null,
    ['Garden Car Train', 0.7, 12, 'A little hopper car with a garden sprouting from its bin. It sunbathes on sidings to help its seedlings grow.'],
    A('hopper', '#8a6a44', { len: 32, h: 15, scale: 0.9, load: '#6ab04a', eye: '#3a5a2a', face: 'cute' }));
  S(23, 'VINEYARD', 'PASSENGER', st('spec', 390), 'mslow', 90, 128, [34, 24], null,
    ['Vine Coach Train', 2.4, 90, 'Grapevines twine around its coach and trail from its windows. Its passengers always arrive smelling of summer.'],
    A('coach', '#6a8a4a', { len: 44, h: 16, windows: 3, roof: '#3a6a3a', stripe: '#9a5a8a', window: '#e8f0b0', eye: '#3a5a2a', face: 'bold' }));
  S(24, 'FLORACOMOTIV', 'PASSENGER/STEAM', st('spec', 500), 'mslow', 45, 216, null, null,
    ['Blossom Engine Train', 5.1, 450, 'A garden locomotive whose smoke smells of lilac. Wherever it passes, wildflowers bloom along the ballast the following spring.'],
    A('steam', '#5a8a4a', { len: 52, h: 18, col2: '#3a6a3a', trim: '#e8a0c8', faceCol: '#f0e8c8', stack: 'tall', stackCol: '#3a5a3a', wheels: 3, wheelR: 6.5, tender: true, crest: '#e880b0', eye: '#8a3a6a', face: 'bold' }));
  S(25, 'TOXICAR', 'NUCLEAR', st('bal', 290), 'medium', 190, 60, [21, 26], null,
    ['Chemical Tank Train', 0.9, 25, 'A tank car that sloshes with something that should not glow. It hides in sidings and sulks when inspected.'],
    A('tank', '#7a5a9a', { len: 34, h: 16, scale: 0.9, col2: '#9a7ab8', hazard: true, faceCol: '#c8b8d8', eye: '#4a2a6a', face: 'sleepy', mouth: 'fang' }));
  S(26, 'NOXITRAIN', 'NUCLEAR', st('bal', 395), 'medium', 90, 131, [38, 27], null,
    ['Fume Tanker Train', 3.0, 210, 'Rows of tanks vent a violet haze. Crops wilt along the lines it frequents, so farmers paint warning stripes on their fences.'],
    A('tank', '#5a3a7a', { len: 48, h: 18, col2: '#7a5a9a', rings: true, glow: '#b8f060', faceCol: '#b8a8c8', eye: '#8af040', face: 'fierce', mouth: 'grin' }));
  S(27, 'HAZTRAK', 'NUCLEAR/DIESEL', st('bruiser', 500), 'medium', 45, 218, null, null,
    ['Hazmat Express Train', 5.5, 700, 'An armored hazmat hauler that sealed itself shut long ago. Its hazard lamps never stop flashing.'],
    A('diesel', '#4a3a5a', { len: 54, h: 19, col2: '#e8c040', stripe: '#e8c040', faceCol: '#8a7a9a', exhaust: true, spikes: 2, spikeY: 20, spikeCol: '#e8c040', eye: '#b8f060', face: 'fierce', mouth: 'grille' }));
  S(28, 'DYNAMINI', 'ELECTRIC', st('swift', 290), 'medium', 190, 62, [22, 29], null,
    ['Dynamo Train', 0.5, 6, 'A pocket-sized tram that stores static in its roof coil. Rubbing its bumper makes your hair stand on end.'],
    A('tram', '#e8c040', { len: 28, h: 14, scale: 0.85, stripe: '#3a3a48', window: '#fff8d0', eye: '#3a3a48', face: 'cute' }));
  S(29, 'AMPEROAD', 'ELECTRIC', st('swift', 400), 'medium', 75, 130, ['item', 'thunderstone', 30], null,
    ['Current Train', 2.0, 52, 'It sprints between substations to top up its charge. Power cuts follow it like a shadow.'],
    A('electric', '#e8b830', { len: 44, h: 14, col2: '#c89820', stripe: '#3a3a48', window: '#fff0b0', spark: '#fff8a0', eye: '#3a3a48', face: 'bold' }));
  S(30, 'MEGAWATTAGE', 'ELECTRIC/NUCLEAR', st('spec', 505), 'medium', 45, 222, null, null,
    ['Power Station Train', 4.4, 480, 'Its hull carries a working generator. A single Megawattage can light a mountain town through the longest winter.'],
    A('electric', '#c8a030', { len: 54, h: 17, col2: '#8a6a20', stripe: '#8af060', window: '#f8f0a0', spark: '#b8f060', windows: 3, eye: '#8af060', face: 'fierce', mouth: 'grin' }));
  S(31, 'LEVITOT', 'MAGLEV', st('spec', 295), 'mslow', 190, 62, [16, 32], null,
    ['Hover Train', 0.6, 4, 'A tiny maglev that floats a finger\'s width above the rail. It naps in midair and drifts wherever the field takes it.'],
    A('maglev', '#d8a0d0', { len: 34, h: 13, scale: 0.9, col2: '#e8c0e0', stripe: '#8a5ab0', window: '#6a4a9a', glow: '#f0d0ff', hover: 4, eye: '#6a3a8a', face: 'sleepy' }));
  S(32, 'MAGLINE', 'MAGLEV', st('spec', 400), 'mslow', 90, 134, [36, 33], null,
    ['Field Line Train', 3.0, 30, 'It reads the magnetic fields of the land like a map and is never late. Some say it knows where you are going before you do.'],
    A('maglev', '#9a6ac8', { len: 48, h: 14, col2: '#b88ad8', stripe: '#f0e0ff', window: '#4a3a7a', glow: '#e0c0ff', eye: '#f0e0ff', face: 'bold' }));
  S(33, 'TELEPORTH', 'MAGLEV', st('spec', 505), 'mslow', 45, 221, null, null,
    ['Blink Line Train', 5.2, 60, 'It vanishes from one platform and appears at the next. Timetables list its departures but never its journeys.'],
    A('maglev', '#6a4aa8', { len: 54, h: 15, col2: '#8a6ac8', stripe: '#f0c8ff', window: '#2a1a5a', glow: '#d0a8ff', fins: true, crest: '#f0c8ff', eye: '#f0c8ff', face: 'fierce' }));
  S(34, 'BRAWLCAR', 'DIESEL', st('phys', 300), 'mslow', 180, 61, [28, 35], null,
    ['Shunter Train', 1.2, 40, 'A scrappy yard shunter that picks fights with buffer stops. It never wins, but it never stops trying.'],
    A('diesel', '#c84a3a', { len: 34, h: 16, scale: 0.9, col2: '#e0603a', stripe: '#f0e0c0', faceCol: '#e8a080', eye: '#3a1a1a', face: 'bold', mouth: 'grin' }));
  S(35, 'COMBATTERY', 'DIESEL/ELECTRIC', st('phys', 405), 'mslow', 90, 142, [40, 36], null,
    ['Battle Hybrid Train', 2.8, 190, 'It swaps between diesel and battery power mid-shove. Rival yards bet their lunch money on its bouts.'],
    A('diesel', '#a83a3a', { len: 46, h: 18, col2: '#3a78c8', stripe: '#e8c040', faceCol: '#d88a70', exhaust: true, eye: '#e8c040', face: 'fierce', mouth: 'grin' }));
  S(36, 'CHAMPIONTRAK', 'DIESEL', st('bruiser', 505), 'mslow', 45, 227, null, null,
    ['Champion Train', 4.9, 620, 'A decorated heavy engine that has won every tug-of-war it has entered. Its plates are covered in old trophy ribbons.'],
    A('diesel', '#8a2a2a', { len: 54, h: 20, col2: '#c8a040', stripe: '#f0d060', faceCol: '#c87a60', exhaust: true, horn: true, hornCol: '#f0d060', eye: '#f0d060', face: 'fierce', mouth: 'grille' }));
  S(37, 'CHILLDREN', 'MONORAIL', st('bal', 295), 'medium', 190, 60, [24, 38], null,
    ['Reefer Tot Train', 0.8, 15, 'A little refrigerated pod that rides the mountain beam. Frost feathers its windows even in summer.'],
    A('mono', '#a8d8f0', { len: 32, h: 16, scale: 0.9, window: '#e8f8ff', stripe: '#6aa8d8', eye: '#3a6a9a', face: 'cute' }));
  S(38, 'FROSTLINE', 'MONORAIL/MAGLEV', st('bal', 400), 'medium', 90, 132, [42, 39], null,
    ['Frost Express Train', 3.2, 180, 'It glides along a beam of ice it lays down itself. Skiers race it down the slopes and always lose.'],
    A('mono', '#78b8e0', { len: 46, h: 16, window: '#e0f4ff', stripe: '#f0f8ff', eye: '#1a4a7a', face: 'bold' }));
  S(39, 'GLACIATOR', 'MONORAIL/FREIGHT', st('tank', 505), 'medium', 45, 220, null, null,
    ['Glacier Train', 5.8, 900, 'It moves as slowly as the ice itself and crushes anything left on its beam. Mountain villages move their houses rather than argue.'],
    A('mono', '#5a98c8', { len: 56, h: 19, window: '#c8ecff', stripe: '#f0faff', spikes: 3, spikeY: 20, spikeCol: '#d8f0ff', eye: '#e8f8ff', face: 'fierce', mouth: 'fang' }));
  S(40, 'SPOOKCAR', 'FREIGHT/MAGLEV', st('spec', 300), 'mslow', 190, 62, [25, 41], null,
    ['Ghost Car Train', 1.0, 1, 'An empty boxcar found rolling on disused sidings with no engine attached. Its doors slide open by themselves.'],
    A('boxcar', '#8a8aa8', { len: 34, h: 16, scale: 0.9, col2: '#6a6a88', roof: '#4a4a68', eye: '#c8f0ff', face: 'sleepy', mouth: 'fang' }));
  S(41, 'PHANTOMOTIVE', 'STEAM/MAGLEV', st('spec', 405), 'mslow', 90, 142, [40, 42], null,
    ['Phantom Engine Train', 3.4, 2, 'A pale engine that steams through closed tunnels. Its whistle is heard on nights when no trains are timetabled.'],
    A('steam', '#a8a0c8', { len: 46, h: 16, col2: '#6a6088', trim: '#c8f0ff', faceCol: '#e8e8f8', stack: 'tall', stackCol: '#4a4468', wheels: 3, wheelR: 6, eye: '#6ae0ff', face: 'sleepy', mouth: 'o' }));
  S(42, 'SPECTRAILER', 'FREIGHT/MAGLEV', st('spec', 505), 'mslow', 45, 225, null, null,
    ['Specter Freight Train', 5.4, 3, 'A whole ghost train that drifts through the old graveyard yards. Its cargo manifest lists only names nobody remembers.'],
    A('coach', '#4a4468', { len: 54, h: 17, windows: 5, roof: '#2a2440', window: '#8af0ff', stripe: '#8af0ff', eye: '#8af0ff', face: 'fierce', mouth: 'fang' }));
  S(43, 'PEBBLEWAY', 'FREIGHT', st('tank', 300), 'mslow', 255, 60, [25, 44], '1:Ram, 1:Tarp Wrap, 6:Cargo Toss, 11:Ballast Toss, 16:Iron Bumper, 21:Boxcar Bash, 29:Heavy Haul, 36:Summit Drop',
    ['Ballast Car Train', 0.8, 60, 'A stubby hopper full of track gravel. It hides among ballast heaps and pelts intruders with pebbles.'],
    A('hopper', '#8a8480', { len: 30, h: 15, scale: 0.9, load: '#a8a098', eye: '#3a3430', face: 'bold' }));
  S(44, 'BOULDROAD', 'FREIGHT/DIESEL', st('tank', 405), 'mslow', 120, 137, [38, 45], null,
    ['Quarry Train', 2.1, 420, 'It hauls boulders out of mountain quarries and eats the small ones. Its hoppers creak with every step.'],
    A('hopper', '#7a6a5a', { len: 46, h: 18, load: '#8a8078', eye: '#e8a030', face: 'fierce' }));
  S(45, 'MOUNTAINEER', 'FREIGHT/DIESEL', st('tank', 505), 'mslow', 45, 223, null, null,
    ['Summit Train', 5.0, 1200, 'A rock-plated diesel that climbs grades nothing else can. Iron Mountain\'s passes were cut by its plow.'],
    A('diesel', '#6a5a4a', { len: 54, h: 20, col2: '#8a7a6a', stripe: '#a8a098', faceCol: '#a89888', spikes: 3, spikeY: 19, spikeCol: '#8a8078', eye: '#e8c040', face: 'fierce', mouth: 'grille' }));
  S(46, 'WYRMCAR', 'NUCLEAR', st('bal', 300), 'slow', 45, 67, [30, 47], null,
    ['Serpent Car Train', 1.8, 33, 'A long, low tank car that coils around warm reactors. Old engineers call it good luck to see one.'],
    A('tank', '#3a8a8a', { len: 40, h: 14, scale: 0.9, col2: '#5ab0a8', stripe: '#e8c040', faceCol: '#a8d8d0', eye: '#e8c040', face: 'cute' }));
  S(47, 'DRACOTRACK', 'NUCLEAR/MAGLEV', st('bal', 420), 'slow', 45, 144, [55, 48], null,
    ['Dragon Line Train', 4.0, 180, 'It flies low over valleys on a field it generates itself. Scales of heat-resistant tile shimmer down its flanks.'],
    A('maglev', '#2a7a7a', { len: 50, h: 15, col2: '#4aa8a0', stripe: '#e8c040', window: '#1a4a4a', glow: '#8af0e0', fins: true, eye: '#e8c040', face: 'bold', mouth: 'fang' }));
  S(48, 'LEVIATHAN', 'NUCLEAR/FREIGHT', st('bruiser', 600), 'slow', 45, 270, null, null,
    ['Leviathan Train', 8.0, 2100, 'Legends say a Leviathan once pulled an entire city to higher ground before a flood. Its horn can split thunderclouds.'],
    A('maglev', '#1a5a6a', { len: 58, h: 19, col2: '#2a7a8a', stripe: '#f0c040', window: '#0a2a3a', glow: '#6af0d0', fins: true, horn: true, hornCol: '#f0e0b0', eye: '#f0c040', face: 'fierce', mouth: 'fang' }));
  S(49, 'SHADOWLINE', 'DIESEL', st('glass', 300), 'medium', 120, 66, [27, 50], null,
    ['Night Shunter Train', 1.0, 30, 'It shunts only after sunset and slips into tunnels at the first sound of footsteps. Its lamp is always dimmed.'],
    A('electric', '#3a3048', { len: 36, h: 14, scale: 0.9, col2: '#4a4058', stripe: '#8a3aa8', window: '#6a3a8a', eye: '#e8c8ff', face: 'sleepy', mouth: 'fang' }));
  S(50, 'ECLIPSER', 'DIESEL/MAGLEV', st('glass', 410), 'medium', 75, 140, [42, 51], null,
    ['Eclipse Train', 3.4, 120, 'When it passes, the light seems to dim. Stationmasters count their lanterns after it leaves.'],
    A('maglev', '#2a2438', { len: 50, h: 15, col2: '#3a3448', stripe: '#c8a0f0', window: '#5a3a8a', glow: '#a080d0', eye: '#e8c8ff', face: 'fierce', mouth: 'fang' }));
  S(51, 'NIGHTMARAIL', 'DIESEL/MAGLEV', st('glass', 510), 'medium', 45, 226, null, null,
    ['Nightmare Train', 5.9, 300, 'A black express that appears in the dreams of engineers who skipped their safety checks. It arrives on time, every time.'],
    A('steam', '#1a1422', { len: 54, h: 17, col2: '#2a2032', trim: '#c83a3a', faceCol: '#4a3a4a', stack: 'tall', stackCol: '#0a0810', wheels: 3, wheelR: 6.5, tender: true, eye: '#f04040', face: 'fierce', mouth: 'grin' }));
  S(52, 'TINYTANK', 'FREIGHT', st('tank', 305), 'medium', 190, 64, [26, 53], '1:Ram, 1:Tarp Wrap, 7:Cargo Toss, 12:Iron Bumper, 17:Boxcar Bash, 23:Anchor Drop, 30:Container Crush, 37:Heavy Haul',
    ['Armored Tot Train', 0.7, 80, 'A little armored wagon with plating thicker than it is wide. It rolls into a ball of steel when startled.'],
    A('tank', '#6a7a4a', { len: 32, h: 16, scale: 0.9, col2: '#8a9a6a', stripe: '#3a4a2a', faceCol: '#a8b890', eye: '#2a3a1a', face: 'bold' }));
  S(53, 'ARMOROAD', 'FREIGHT', st('tank', 410), 'medium', 90, 140, [44, 54], null,
    ['Armored Car Train', 2.4, 520, 'It carries mail and coin between cities behind plates of riveted steel. Robbers have given up trying.'],
    A('boxcar', '#5a6a42', { len: 46, h: 18, col2: '#7a8a5a', roof: '#3a4a2a', eye: '#e8c040', face: 'bold', mouth: 'line' }));
  S(54, 'WARFORTRESS', 'FREIGHT/DIESEL', st('tank', 520), 'medium', 45, 229, null, null,
    ['Fortress Train', 6.5, 2600, 'A rolling fortress bristling with iron plates. It once held a mountain pass alone for three days.'],
    A('diesel', '#4a5a3a', { len: 56, h: 20, col2: '#6a7a4a', stripe: '#c8a040', faceCol: '#8a9a6a', spikes: 3, spikeY: 19, spikeCol: '#8a8a6a', exhaust: true, eye: '#f0c040', face: 'fierce', mouth: 'grille' }));
  S(55, 'TWINKLEWAY', 'MONORAIL', st('spec', 290), 'fast', 190, 62, [24, 56], null,
    ['Starlight Train', 0.6, 5, 'A little pod that rides moonbeams on clear nights. Children wish on it instead of shooting stars.'],
    A('mono', '#f0c0d8', { len: 30, h: 15, scale: 0.88, window: '#fff8e0', stripe: '#f8e080', eye: '#8a4a7a', face: 'cute' }));
  S(56, 'STARLINE', 'MONORAIL/MAGLEV', st('spec', 400), 'fast', 90, 130, [40, 57], null,
    ['Constellation Train', 2.6, 24, 'Its windows show star charts that shift with the seasons. It runs a single loop around the observatory hill.'],
    A('mono', '#c8a0e0', { len: 46, h: 16, window: '#f8f0c0', stripe: '#f8e080', eye: '#5a3a8a', face: 'bold' }));
  S(57, 'CELESTRAIN', 'MONORAIL/MAGLEV', st('spec', 510), 'fast', 45, 228, null, null,
    ['Heavenly Express Train', 5.0, 70, 'A white-and-gold express that seems to run on light itself. Its passengers say the journey felt like a dream.'],
    A('maglev', '#f4f0e8', { len: 56, h: 15, col2: '#e8d8b0', stripe: '#e0b040', window: '#f8e8a0', glow: '#fff8d0', wings: true, wingCol: '#fff8e8', eye: '#c89020', face: 'bold' }));
  S(58, 'COMMUTOT', 'PASSENGER', st('bal', 250), 'medium', 255, 50, [16, 59], '1:Ram, 1:Horn Honk, 5:Express Shunt, 9:Whistle Blast, 14:Iron Bumper, 20:Passenger Rush, 27:Coupler Crush, 34:Timetable',
    ['Commuter Train', 0.8, 18, 'A cheerful little commuter car found on every branch line. It greets everyone with a double toot.'],
    A('tram', '#d8c8a0', { len: 30, h: 15, scale: 0.88, stripe: '#c8603a', window: '#f8f0d0', panto: false, eye: '#4a3a2a', face: 'cute' }));
  S(59, 'ROUTINER', 'PASSENGER', st('bal', 380), 'medium', 120, 123, [36, 60], null,
    ['Regular Train', 2.6, 90, 'It runs the same route every day and knows every passenger by name. It sulks when the timetable changes.'],
    A('coach', '#c8b890', { len: 46, h: 16, windows: 4, roof: '#8a7a5a', stripe: '#c8603a', window: '#f8f0d0', eye: '#4a3a2a', face: 'bold' }));
  S(60, 'METROPOLIS', 'PASSENGER/ELECTRIC', st('bal', 495), 'medium', 45, 212, null, null,
    ['City Master Train', 6.0, 480, 'A grand metro set that carries a whole city\'s morning. Office towers set their clocks by its arrival.'],
    A('electric', '#8a8a9a', { len: 56, h: 16, col2: '#a8a8b8', stripe: '#c8603a', window: '#f8e8a0', windows: 4, eye: '#3a3a4a', face: 'bold' }));

  // ------------------------------------------------------------ legendary trains
  S(61, 'CHRONOCART', 'MAGLEV', st('spec', 580), 'slow', 3, 261, null, null,
    ['Time Train', 1.2, 10, 'A tiny cart that arrives before it departs. Scholars argue whether it is the oldest train or the newest.'],
    A('mono', '#e8d8a0', { len: 40, h: 16, window: '#a8e8f0', stripe: '#6a4aa8', crest: '#6a4aa8', eye: '#6a4aa8', face: 'bold' }));
  S(62, 'SPATIALWAY', 'MAGLEV', st('spec', 580), 'slow', 3, 261, null, null,
    ['Space Train', 5.4, 340, 'It folds distance like a timetable. Its route map has only one station: everywhere.'],
    A('maglev', '#3a4a8a', { len: 56, h: 16, col2: '#5a6ab8', stripe: '#f0e8ff', window: '#1a1a3a', glow: '#c8d0ff', fins: true, eye: '#f0e8ff', face: 'fierce' }));
  S(63, 'GRAVITRAK', 'MAGLEV/FREIGHT', st('tank', 580), 'slow', 3, 261, null, null,
    ['Gravity Train', 4.8, 9990, 'It bends the rails beneath it without touching them. Pebbles roll uphill toward it.'],
    A('tank', '#3a3a5a', { len: 50, h: 20, col2: '#5a5a8a', rings: true, glow: '#a080ff', faceCol: '#6a6a9a', eye: '#c8b0ff', face: 'fierce' }));
  S(64, 'QUANTUMLINE', 'MAGLEV/NUCLEAR', st('swift', 580), 'slow', 3, 261, null, null,
    ['Reality Train', 4.2, 1, 'It is seen on two tracks at once until someone checks its ticket.'],
    A('maglev', '#f0f0f8', { len: 54, h: 14, col2: '#d0d0e8', stripe: '#8af0c0', window: '#1a3a3a', glow: '#8af0c0', eye: '#8af0c0', face: 'bold' }));
  S(65, 'NUCLEON', 'NUCLEAR', st('spec', 580), 'slow', 3, 261, null, null,
    ['Atomic Train', 3.0, 400, 'A sealed core on wheels that hums with patient power. It has never needed to refuel.'],
    A('tank', '#4a6a3a', { len: 44, h: 20, col2: '#6a8a4a', rings: true, glow: '#b8f060', faceCol: '#8aa870', eye: '#b8f060', face: 'bold' }));
  S(66, 'FUSIONEER', 'NUCLEAR/STEAM', st('bruiser', 580), 'slow', 3, 261, null, null,
    ['Power Plant Train', 5.6, 1400, 'Its boiler holds a small sun. Scientists at Nuclear Station bow when it passes.'],
    A('steam', '#5a7a4a', { len: 54, h: 18, col2: '#3a5a3a', trim: '#b8f060', faceCol: '#d8f0c0', stack: 'tall', stackCol: '#2a3a2a', wheels: 3, wheelR: 7, tender: true, eye: '#b8f060', face: 'fierce', mouth: 'grin' }));
  S(67, 'HYPERLOOP', 'MAGLEV/ELECTRIC', st('swift', 580), 'slow', 3, 261, null, null,
    ['Vacuum Train', 6.8, 300, 'It travels in a tube of its own making at the speed of a thrown thought.'],
    A('maglev', '#c8d0d8', { len: 58, h: 13, col2: '#a8b0b8', stripe: '#3a8ad8', window: '#1a2a3a', glow: '#8ad0ff', hover: 3, eye: '#3a8ad8', face: 'bold' }));
  S(68, 'SUBWAYVERN', 'NUCLEAR/DIESEL', st('bruiser', 580), 'slow', 3, 261, null, null,
    ['Underground Dragon Train', 7.0, 1800, 'It burrows new tunnels beneath the cities and sleeps curled around their foundations.'],
    A('diesel', '#3a4a3a', { len: 56, h: 18, col2: '#5a6a4a', stripe: '#c83a3a', faceCol: '#7a8a6a', spikes: 3, spikeY: 18, spikeCol: '#6a7a5a', horn: true, hornCol: '#e8e0c0', eye: '#f04040', face: 'fierce', mouth: 'fang' }));
  S(69, 'AEROPRESS', 'MAGLEV/PASSENGER', st('swift', 580), 'slow', 3, 261, null, null,
    ['Flying Train', 5.0, 520, 'A winged express that leaves the rails behind at the end of every line and keeps going.'],
    A('coach', '#e8e8f0', { len: 50, h: 15, windows: 5, roof: '#3a78c8', stripe: '#3a78c8', window: '#a8d8f0', wings: true, wingCol: '#f0f4ff', eye: '#3a78c8', face: 'bold' }));
  S(70, 'MARINETRAIN', 'FREIGHT/MONORAIL', st('wall', 580), 'slow', 3, 261, null, null,
    ['Undersea Train', 6.4, 2200, 'It runs a line along the seabed that no chart records. Divers follow its lamps home.'],
    A('mono', '#2a5a7a', { len: 56, h: 18, window: '#8ae8f0', stripe: '#f0c040', fins: true, eye: '#8ae8f0', face: 'fierce' }));

  // ------------------------------------------------------------ specialty trains
  S(71, 'BULLETER', 'ELECTRIC', st('fast', 330), 'medium', 120, 88, [30, 72], null,
    ['Bullet Train', 2.2, 60, 'A young high-speed train that practices its launches on every straight. It hates curves.'],
    A('electric', '#f0f0f0', { len: 44, h: 14, col2: '#e0e0e8', stripe: '#3a5ab0', window: '#1a2a4a', eye: '#3a5ab0', face: 'bold' }));
  S(72, 'SHINKANSTRIKE', 'ELECTRIC/MAGLEV', st('fast', 480), 'medium', 45, 190, null, null,
    ['Lightning Bullet Train', 4.6, 180, 'Its long nose parts the air so cleanly that birds ride its wake. It has never once been late.'],
    A('electric', '#f8f8f8', { len: 56, h: 14, col2: '#e8e8f0', stripe: '#2a4a9a', window: '#1a2a4a', windows: 4, spark: '#a8d0ff', eye: '#2a4a9a', face: 'fierce' }));
  S(73, 'ORIENTALIST', 'PASSENGER', st('spec', 460), 'medium', 45, 175, null, null,
    ['Grand Luxury Train', 5.2, 300, 'A mahogany express with crystal lamps in every compartment. Its dining car is booked for years.'],
    A('coach', '#4a2a2a', { len: 54, h: 17, windows: 5, roof: '#2a1a1a', stripe: '#d8b040', window: '#f8d888', eye: '#d8b040', face: 'bold' }));
  S(74, 'TRANSIBERIAN', 'DIESEL/MONORAIL', st('tank', 470), 'slow', 45, 180, null, null,
    ['Long Haul Train', 5.8, 1500, 'It crosses the Frozen Tundra in a single week-long run and hums old songs to keep awake.'],
    A('diesel', '#3a5a4a', { len: 56, h: 18, col2: '#c83a3a', stripe: '#e8e0c0', faceCol: '#8aa898', exhaust: true, eye: '#2a4a3a', face: 'bold', mouth: 'grille' }));
  S(75, 'EUROSTEAM', 'STEAM/PASSENGER', st('bal', 430), 'medium', 75, 160, null, null,
    ['Continental Train', 4.0, 260, 'A polished tourist engine that speaks in whistles of three different pitches.'],
    A('steam', '#2a5a3a', { len: 50, h: 16, col2: '#1a3a2a', trim: '#e0b040', faceCol: '#e8e0c8', stack: 'tall', wheels: 3, wheelR: 6, tender: true, eye: '#1a3a2a', face: 'bold' }));
  S(76, 'AMTRACTION', 'DIESEL/PASSENGER', st('bal', 430), 'medium', 75, 158, null, null,
    ['Cross-Country Train', 4.4, 380, 'A long-distance diesel that stops at every small town, just in case someone is waiting.'],
    A('diesel', '#c8ccd8', { len: 54, h: 17, col2: '#3a5ab0', stripe: '#c83a3a', faceCol: '#e0e0e8', exhaust: true, eye: '#2a3a7a', face: 'bold', mouth: 'smile' }));
  S(77, 'CARGOPLEX', 'FREIGHT', st('bruiser', 470), 'slow', 60, 178, null, null,
    ['Super Freight Train', 6.0, 3000, 'Its container stacks reach higher than signal gantries. Yard crews measure their shifts in Cargoplex loads.'],
    A('boxcar', '#3a6a9a', { len: 56, h: 22, col2: '#c8603a', roof: '#e8c040', eye: '#e8c040', face: 'bold', mouth: 'line' }));
  S(78, 'COALBURNER', 'STEAM', st('phys', 380), 'medium', 190, 118, null, null,
    ['Old School Train', 2.8, 350, 'A soot-black veteran that refuses to retire. It clears its throat loudly whenever an electric passes.'],
    A('steam', '#2a2a30', { len: 44, h: 17, col2: '#1a1a20', trim: '#c83a3a', faceCol: '#8a8a90', stack: 'short', stackCol: '#1a1a1a', wheels: 3, wheelR: 6, tender: true, eye: '#c83a3a', face: 'bold', mouth: 'grin' }));
  S(79, 'OILSLICK', 'DIESEL/NUCLEAR', st('spec', 400), 'medium', 120, 140, null, null,
    ['Oil Tanker Train', 3.0, 900, 'A glossy black tanker whose trail makes rails slippery for hours. Brakemen dread its schedule.'],
    A('tank', '#1a1a22', { len: 48, h: 18, col2: '#2a2a38', stripe: '#e8c040', faceCol: '#5a5a6a', eye: '#e8c040', face: 'fierce', mouth: 'fang' }));
  S(80, 'GRAINERY', 'FREIGHT', st('wall', 390), 'medium', 190, 120, null, null,
    ['Grain Car Train', 3.2, 600, 'A covered hopper that smells of warm bread. Sparrows follow it across the plains for the spillage.'],
    A('hopper', '#d8b870', { len: 46, h: 18, load: '#f0d890', eye: '#6a4a2a', face: 'cute' }));
  S(81, 'LUMBERYARD', 'FREIGHT/PASSENGER', st('phys', 400), 'medium', 190, 128, null, null,
    ['Log Car Train', 3.4, 700, 'It carries timber down from the forest lines, stacked higher than its own cab.'],
    A('hopper', '#7a5236', { len: 48, h: 16, load: '#a87a4a', eye: '#3a2a1a', face: 'bold' }));
  S(82, 'IRONCROSS', 'FREIGHT', st('tank', 420), 'medium', 120, 145, null, null,
    ['Ore Car Train', 2.6, 1100, 'Its iron hoppers are heavy enough to cross a river on the bottom.'],
    A('hopper', '#5a4a4a', { len: 44, h: 17, load: '#8a3a2a', eye: '#e8a030', face: 'bold' }));
  S(83, 'GOLDRUSHER', 'FREIGHT/MAGLEV', st('fast', 440), 'medium', 45, 170, null, null,
    ['Precious Cargo Train', 2.9, 950, 'It carries gold from the mountains in an armored hopper and gleams in the sun like a promise.'],
    A('hopper', '#c8a040', { len: 44, h: 16, load: '#f8d860', eye: '#6a4a1a', face: 'bold', mouth: 'grin' }));
  S(84, 'ARMORDILLO', 'FREIGHT/DIESEL', st('tank', 440), 'medium', 90, 160, null, null,
    ['Armored Train', 2.4, 1300, 'It curls its plated carriages around its engine when threatened and waits.'],
    A('tank', '#8a7a5a', { len: 46, h: 18, col2: '#a8987a', stripe: '#6a5a3a', faceCol: '#c8b898', spikes: 2, spikeY: 23, spikeCol: '#6a5a3a', eye: '#3a2a1a', face: 'bold' }));
  S(85, 'PEACELINER', 'PASSENGER/MONORAIL', st('wall', 450), 'medium', 45, 168, null, null,
    ['Diplomatic Train', 4.8, 400, 'A white liner that carries envoys between rival cities. Arguments seem to cool in its carriages.'],
    A('coach', '#f0f0f0', { len: 54, h: 16, windows: 5, roof: '#3a78c8', stripe: '#e8c040', window: '#a8d8f0', eye: '#3a78c8', face: 'cute' }));
  S(86, 'HOSPITRAIN', 'PASSENGER', st('wall', 440), 'fast', 60, 160, null, null,
    ['Medical Train', 4.2, 380, 'A clinic on rails that visits remote halts once a month. It gently hums lullabies to injured trains.'],
    A('coach', '#f8f0f0', { len: 50, h: 17, windows: 4, roof: '#e87888', stripe: '#e87888', window: '#e8f4ff', eye: '#c84a5a', face: 'cute' }));
  S(87, 'SCHOOLBUS', 'PASSENGER', st('bal', 360), 'fast', 190, 110, null, null,
    ['Education Train', 3.0, 300, 'A mustard-yellow coach that runs the morning school line. It honks twice outside every sleepy house.'],
    A('coach', '#e8b830', { len: 46, h: 16, windows: 5, roof: '#3a3a48', stripe: '#3a3a48', window: '#f8f0d0', eye: '#3a3a48', face: 'cute' }));
  S(88, 'FIRETRUCK', 'STEAM/DIESEL', st('phys', 440), 'medium', 75, 162, null, null,
    ['Emergency Train', 3.4, 480, 'A fire-red rail engine with a water cannon on its roof. It races toward smoke that other trains flee.'],
    A('diesel', '#c83a2a', { len: 50, h: 17, col2: '#e8e0d0', stripe: '#e8e0d0', faceCol: '#e88a70', exhaust: true, horn: true, hornCol: '#c8ccd8', eye: '#2a1a1a', face: 'bold', mouth: 'grin' }));
  S(89, 'POLICAR', 'ELECTRIC', st('fast', 420), 'medium', 75, 150, null, null,
    ['Patrol Train', 3.0, 260, 'It patrols the yards at night with its blue lamps turning. Rail thieves hear its siren in their sleep.'],
    A('electric', '#2a3a6a', { len: 46, h: 15, col2: '#f0f0f0', stripe: '#f0f0f0', window: '#a8c8f0', spark: '#6aa8ff', eye: '#6aa8ff', face: 'fierce' }));
  S(90, 'AMBULANCHE', 'PASSENGER/MONORAIL', st('swift', 440), 'medium', 60, 164, null, null,
    ['Rescue Train', 3.2, 280, 'An avalanche-rescue pod that speeds down mountain beams toward trouble. Its bell never stops ringing.'],
    A('mono', '#f0f0f0', { len: 46, h: 16, window: '#a8d8f0', stripe: '#e84a4a', eye: '#c83a3a', face: 'bold' }));
  S(91, 'TRAMSIT', 'ELECTRIC/PASSENGER', st('bal', 370), 'medium', 190, 115, null, null,
    ['City Tram Train', 2.6, 180, 'A friendly street tram that stops for anyone who waves. It rings its bell at cats on the tracks.'],
    A('tram', '#c83a3a', { len: 42, h: 16, stripe: '#e8c040', window: '#f8f0c0', eye: '#3a1a1a', face: 'cute' }));
  S(92, 'CABLEWAY', 'MONORAIL', st('spec', 380), 'medium', 120, 120, null, null,
    ['Cable Car Train', 2.2, 90, 'It climbs impossible slopes hanging from a single thread and never looks down.'],
    A('mono', '#c8603a', { len: 36, h: 18, window: '#f8f0c0', stripe: '#e8c040', eye: '#3a1a1a', face: 'bold' }));
  S(93, 'FUNICULAR', 'MONORAIL/FREIGHT', st('tank', 400), 'medium', 120, 130, null, null,
    ['Hill Climber Train', 2.8, 700, 'It works in pairs with another Funicular, one climbing while the other descends. They chat as they pass.'],
    A('coach', '#6a8a5a', { len: 40, h: 18, windows: 3, roof: '#3a5a3a', stripe: '#e8c040', window: '#f8f0c0', eye: '#2a3a1a', face: 'bold' }));
  S(94, 'MONORIDER', 'MONORAIL', st('fast', 400), 'medium', 120, 130, null, null,
    ['Single Beam Train', 3.0, 160, 'It balances on one beam at any speed and gets dizzy on double track.'],
    A('mono', '#4aa8b8', { len: 48, h: 16, window: '#e0f8ff', stripe: '#f0f0f0', eye: '#1a4a5a', face: 'bold' }));
  S(95, 'DUALRAIL', 'PASSENGER', st('bal', 320), 'medium', 190, 90, [32, 96], null,
    ['Double Track Train', 2.0, 110, 'Twin coaches that never agree on which way to go, so they go both ways at once.'],
    A('coach', '#a88a6a', { len: 40, h: 15, windows: 2, roof: '#6a5a4a', stripe: '#3a78c8', window: '#f8f0d0', eye: '#3a2a1a', face: 'cute' }));
  S(96, 'MULTICART', 'PASSENGER/FREIGHT', st('bal', 450), 'medium', 75, 165, null, null,
    ['Many Car Train', 5.0, 900, 'It keeps adding carriages as it grows. Nobody has ever counted them all before it went round a bend.'],
    A('coach', '#8a6a4a', { len: 56, h: 16, windows: 6, roof: '#5a4a3a', stripe: '#3a78c8', window: '#f8f0d0', eye: '#3a2a1a', face: 'bold' }));
  S(97, 'UNITRAIN', 'PASSENGER', st('bal', 380), 'medium', 120, 120, null, null,
    ['Versatile Train', 2.8, 200, 'It can pull any load on any gauge and is secretly proud of it.'],
    A('diesel', '#8a9aa8', { len: 44, h: 16, col2: '#a8b8c8', stripe: '#e8c040', faceCol: '#c8d0d8', eye: '#2a3a4a', face: 'bold' }));
  S(98, 'OMNIBUS', 'PASSENGER/ELECTRIC', st('wall', 420), 'medium', 90, 145, null, null,
    ['All-Purpose Train', 3.6, 420, 'A roomy railbus that will stop anywhere at all if you ask nicely.'],
    A('tram', '#3a8a6a', { len: 46, h: 17, stripe: '#e8e0c0', window: '#f8f0c0', eye: '#1a3a2a', face: 'cute' }));
  S(99, 'VERSATILE', 'PASSENGER', st('bal', 400), 'medium', 45, 150, null, null,
    ['Adaptive Train', 2.4, 150, 'Its coachwork shifts to suit whatever line it runs on. Engineers argue about what it really looks like.'],
    A('coach', '#b8a8c8', { len: 44, h: 16, windows: 3, roof: '#8a7a9a', stripe: '#f0c040', window: '#f8f0d0', eye: '#4a3a5a', face: 'cute' }));
  S(100, 'TRANSFORMOTIVE', 'MAGLEV/PASSENGER', st('bal', 420), 'medium', 35, 160, null, null,
    ['Changing Train', 2.2, 80, 'It reshapes itself into a copy of any train it meets. Its only tell is a sleepy, crooked smile.'],
    A('coach', '#c8a0d8', { len: 40, h: 16, windows: 2, roof: '#9a7ab0', window: '#f0e0f8', eye: '#6a4a8a', face: 'sleepy', mouth: 'smile' }));
  S(101, 'HERITAGER', 'STEAM', st('bal', 330), 'medium', 120, 95, [34, 102], null,
    ['Historic Train', 2.4, 260, 'A preserved engine that runs heritage specials on weekends. It loves to be photographed.'],
    A('steam', '#2a4a6a', { len: 40, h: 16, col2: '#1a2a4a', trim: '#e0b040', faceCol: '#d8d8e0', stack: 'tall', wheels: 2, wheelR: 7, eye: '#1a2a4a', face: 'cute' }));
  S(102, 'VINTAGER', 'STEAM/PASSENGER', st('bal', 470), 'medium', 45, 172, null, null,
    ['Classic Train', 4.6, 520, 'A lovingly restored express. Crowds line the tracks whenever it steams out of Steamspring Village.'],
    A('steam', '#1a3a5a', { len: 54, h: 17, col2: '#0a1a3a', trim: '#f0c040', faceCol: '#e8e8f0', stack: 'tall', wheels: 3, wheelR: 7, tender: true, bell: true, eye: '#0a1a3a', face: 'bold' }));
  S(103, 'MODERNIA', 'ELECTRIC', st('spec', 340), 'medium', 120, 98, [36, 104], null,
    ['Contemporary Train', 2.6, 150, 'Clean lines and quiet motors. It frowns at anything with a smokestack.'],
    A('electric', '#e8e8e8', { len: 44, h: 14, col2: '#d0d0d8', stripe: '#e84a4a', window: '#2a2a3a', eye: '#e84a4a', face: 'bold' }));
  S(104, 'FUTURIST', 'ELECTRIC/MAGLEV', st('spec', 480), 'medium', 45, 175, null, null,
    ['Advanced Train', 4.8, 260, 'It arrives looking like next year\'s model and leaves looking like the year after.'],
    A('maglev', '#e0e0f0', { len: 56, h: 14, col2: '#c0c0d8', stripe: '#e84a4a', window: '#1a1a2a', glow: '#ffb0b0', fins: true, eye: '#e84a4a', face: 'fierce' }));
  S(105, 'PIONEAR', 'DIESEL', st('bal', 340), 'medium', 120, 98, [35, 106], null,
    ['First Line Train', 2.4, 320, 'It lays its own track as it goes and has never met a frontier it disliked.'],
    A('diesel', '#8a6a3a', { len: 42, h: 16, col2: '#c8a060', stripe: '#3a5a3a', faceCol: '#c8a070', exhaust: true, eye: '#3a2a1a', face: 'bold' }));
  S(106, 'INNOVATOR', 'DIESEL/ELECTRIC', st('spec', 480), 'medium', 45, 175, null, null,
    ['Inventor Train', 4.2, 540, 'It tinkers with its own engine at every stop. Half its parts are its own inventions.'],
    A('diesel', '#5a7a8a', { len: 52, h: 17, col2: '#8aa8b8', stripe: '#e8c040', faceCol: '#a8c8d8', exhaust: true, eye: '#e8c040', face: 'bold', mouth: 'grin' }));
  S(107, 'CLASSIQUE', 'PASSENGER', st('spec', 300), 'fast', 190, 70, [25, 108], null,
    ['Timeless Train', 1.4, 60, 'An elegant little carriage with lace curtains. It insists on afternoon tea at every halt.'],
    A('coach', '#6a3a4a', { len: 34, h: 15, scale: 0.9, windows: 2, roof: '#3a1a2a', stripe: '#e0b040', window: '#f8e8c0', eye: '#3a1a2a', face: 'cute' }));
  S(108, 'LUXURIA', 'PASSENGER/MONORAIL', st('spec', 405), 'fast', 90, 140, [40, 109], null,
    ['Opulent Train', 3.4, 200, 'Velvet seats, silver cutlery, and a pianist in the lounge car. Tickets cost a small fortune.'],
    A('coach', '#8a2a4a', { len: 48, h: 16, windows: 4, roof: '#4a1a2a', stripe: '#f0c040', window: '#f8e0a0', eye: '#f0c040', face: 'bold' }));
  S(109, 'REGALIA', 'PASSENGER/MAGLEV', st('spec', 505), 'fast', 45, 220, null, null,
    ['Royal Train', 5.0, 420, 'It carries the crown of Crown Central on state occasions. Its crest glows on the anniversaries of old coronations.'],
    A('coach', '#5a1a6a', { len: 54, h: 17, windows: 4, roof: '#e0b040', stripe: '#e0b040', window: '#f8e0a0', crest: '#f0c040', eye: '#f0c040', face: 'bold' }));
  S(110, 'EXCELSIOR', 'MAGLEV/MONORAIL', st('swift', 520), 'slow', 25, 230, null, null,
    ['Ever Upward Train', 5.5, 160, 'It never runs downhill. Climbers swear they have seen it rising into the clouds above Monorail Mountaintop.'],
    A('maglev', '#f0e8d0', { len: 56, h: 15, col2: '#e0c890', stripe: '#3a78c8', window: '#1a2a4a', glow: '#fff0c0', fins: true, crest: '#3a78c8', eye: '#3a78c8', face: 'fierce' }));
  S(111, 'PRIMERIDIAN', 'MONORAIL', st('bal', 460), 'slow', 45, 170, null, null,
    ['First Line Train', 3.8, 300, 'It runs the line from which every distance in Locomotia is measured. It never takes a day off.'],
    A('mono', '#d8c8a0', { len: 50, h: 16, window: '#f8f0c0', stripe: '#8a3a2a', eye: '#3a2a1a', face: 'bold' }));
  S(112, 'TERMINUS', 'FREIGHT/MAGLEV', st('wall', 470), 'slow', 45, 175, null, null,
    ['End Station Train', 4.0, 2400, 'Where Terminus stops, the line ends. Nobody knows who put the buffer stops there first.'],
    A('boxcar', '#4a4a5a', { len: 48, h: 20, col2: '#3a3a4a', roof: '#c83a3a', eye: '#c83a3a', face: 'fierce', mouth: 'line' }));
  S(113, 'JUNCTION', 'ELECTRIC/FREIGHT', st('bal', 440), 'medium', 60, 160, null, null,
    ['Connection Train', 3.2, 600, 'Every line it touches becomes connected to every other. Signal boxes light up when it passes.'],
    A('electric', '#6a7a4a', { len: 48, h: 16, col2: '#8a9a6a', stripe: '#e8c040', window: '#f8f0a0', eye: '#e8c040', face: 'bold' }));
  S(114, 'SWITCHBACK', 'MONORAIL/DIESEL', st('phys', 440), 'medium', 60, 160, null, null,
    ['Reversal Train', 3.0, 500, 'It climbs zigzag lines by reversing at every corner and never loses its temper.'],
    A('diesel', '#8a5a3a', { len: 46, h: 17, col2: '#a87a4a', stripe: '#e8e0c0', faceCol: '#c89a70', exhaust: true, eye: '#3a2a1a', face: 'bold' }));
  S(115, 'SIDETRACK', 'DIESEL', st('glass', 320), 'medium', 190, 88, [30, 116], null,
    ['Branch Line Train', 1.8, 180, 'It wanders onto every branch line it can find and forgets where it was going.'],
    A('diesel', '#5a8a6a', { len: 38, h: 15, scale: 0.9, col2: '#7aaa8a', stripe: '#f0e0a0', faceCol: '#9ac8a8', eye: '#2a3a2a', face: 'sleepy' }));
  S(116, 'MAINLINER', 'DIESEL/PASSENGER', st('fast', 460), 'medium', 75, 168, null, null,
    ['Primary Line Train', 4.6, 600, 'The backbone of the network. When it is late, everything is late.'],
    A('diesel', '#3a6a5a', { len: 54, h: 17, col2: '#5a8a7a', stripe: '#f0e0a0', faceCol: '#8ab8a8', exhaust: true, eye: '#f0e0a0', face: 'bold' }));
  S(117, 'BRANCHWAY', 'PASSENGER', st('bal', 310), 'medium', 190, 82, [28, 118], null,
    ['Secondary Line Train', 2.0, 110, 'It serves the quiet villages the expresses skip. The villagers adore it.'],
    A('tram', '#7a9a5a', { len: 36, h: 15, stripe: '#e8d8a0', window: '#f8f0c0', eye: '#2a3a1a', face: 'cute' }));
  S(118, 'SPURLINE', 'PASSENGER/MONORAIL', st('bal', 440), 'medium', 75, 160, null, null,
    ['Extension Train', 3.4, 300, 'It builds little spur lines to places that deserve a station and runs them itself.'],
    A('mono', '#5a8a4a', { len: 46, h: 16, window: '#f8f0c0', stripe: '#e8d8a0', eye: '#2a3a1a', face: 'bold' }));
  S(119, 'LOOPBACK', 'MAGLEV', st('swift', 430), 'medium', 75, 158, null, null,
    ['Circular Train', 2.2, 90, 'It runs a loop so quickly it sometimes catches up with itself.'],
    A('maglev', '#d8a860', { len: 44, h: 14, col2: '#e8c080', stripe: '#6a3a8a', window: '#3a2a5a', glow: '#f8e0b0', eye: '#6a3a8a', face: 'cute' }));
  S(120, 'RAILYARD', 'FREIGHT', st('wall', 440), 'slow', 60, 165, null, null,
    ['Depot Train', 4.0, 1800, 'A gathering of old wagons that moves as one. Lost trains always find their way back to a Railyard.'],
    A('boxcar', '#8a6a5a', { len: 54, h: 18, col2: '#6a4a3a', roof: '#4a3a2a', eye: '#e8c040', face: 'sleepy', mouth: 'line' }));
  S(121, 'STATIONMASTER', 'PASSENGER/MAGLEV', st('spec', 470), 'slow', 45, 175, null, null,
    ['Controller Train', 3.6, 280, 'It dispatches other trains with a flick of its signal arms and expects to be obeyed.'],
    A('coach', '#2a3a5a', { len: 50, h: 17, windows: 3, roof: '#c8a24e', stripe: '#c8a24e', window: '#f8f0c0', crest: '#c8a24e', eye: '#c8a24e', face: 'fierce' }));
  S(122, 'CONDUCTOR', 'PASSENGER', st('bal', 460), 'slow', 45, 170, null, null,
    ['Leader Train', 3.0, 240, 'It keeps order among wild trains and checks tickets nobody remembers buying.'],
    A('coach', '#2a3050', { len: 46, h: 16, windows: 3, roof: '#1a2040', stripe: '#c8a24e', window: '#f8e8a0', eye: '#c8a24e', face: 'bold' }));
  S(123, 'ENGINEAR', 'STEAM', st('phys', 440), 'medium', 75, 160, null, null,
    ['Driver Train', 3.2, 420, 'It listens to every rattle in its own boiler and fixes the problem before it happens.'],
    A('steam', '#5a4a3a', { len: 46, h: 16, col2: '#3a2a1a', trim: '#c8a24e', faceCol: '#c8b8a8', stack: 'tall', wheels: 3, wheelR: 6, eye: '#3a2a1a', face: 'bold' }));
  S(124, 'BRAKEMAN', 'FREIGHT', st('tank', 440), 'medium', 75, 160, null, null,
    ['Safety Train', 3.0, 1500, 'A heavy caboose that brings runaway wagons to a halt by simply standing in their way.'],
    A('boxcar', '#b8402a', { len: 40, h: 18, col2: '#8a2a1a', roof: '#3a3a3a', eye: '#f0e0a0', face: 'bold', mouth: 'line' }));
  S(125, 'SIGNALER', 'ELECTRIC', st('swift', 320), 'medium', 190, 86, [30, 126], null,
    ['Communication Train', 1.4, 40, 'It blinks red, amber and green lamps to talk. Flocks of them flash messages across the plains at dusk.'],
    A('tram', '#3a3a48', { len: 32, h: 15, scale: 0.9, stripe: '#e84a4a', window: '#8af0a0', eye: '#e8c040', face: 'cute' }));
  S(126, 'SWITCHMAN', 'ELECTRIC/DIESEL', st('phys', 460), 'medium', 75, 168, null, null,
    ['Track Changer Train', 3.6, 520, 'It throws points with its levered arms faster than any signal box. Wrong-way trains end up wherever it likes.'],
    A('diesel', '#e8c040', { len: 50, h: 17, col2: '#3a3a48', stripe: '#3a3a48', faceCol: '#f0d890', exhaust: true, eye: '#3a3a48', face: 'fierce' }));
  S(127, 'FLAGMAN', 'PASSENGER', st('fast', 400), 'medium', 120, 130, null, null,
    ['Guide Train', 2.4, 120, 'It waves a flag of red canvas to guide lost trains. Wild trains follow it without question.'],
    A('tram', '#e84a3a', { len: 40, h: 15, stripe: '#f0f0f0', window: '#f8f0c0', eye: '#3a1a1a', face: 'bold' }));
  S(128, 'PORTERWAY', 'FREIGHT/PASSENGER', st('wall', 420), 'medium', 120, 140, null, null,
    ['Service Train', 2.6, 300, 'A luggage car that carries everyone\'s bags and never loses one. It politely declines tips.'],
    A('boxcar', '#6a4a8a', { len: 42, h: 16, col2: '#8a6aa8', roof: '#3a2a5a', eye: '#e8c040', face: 'cute' }));
  S(129, 'TICKETRON', 'ELECTRIC', st('spec', 330), 'medium', 190, 90, [30, 130], null,
    ['Fare Train', 1.2, 30, 'A chattering ticket machine on wheels. It punches holes in anything shaped like a ticket, including leaves.'],
    A('tram', '#4a78a8', { len: 32, h: 16, scale: 0.9, stripe: '#e8e0c0', window: '#c8f0a0', eye: '#e8e0c0', face: 'cute' }));
  S(130, 'SCHEDULAR', 'ELECTRIC/MAGLEV', st('spec', 470), 'medium', 75, 172, null, null,
    ['Timetable Train', 3.2, 160, 'It knows the departure of every train in Locomotia by heart and recites them when nervous.'],
    A('electric', '#3a5a8a', { len: 50, h: 15, col2: '#5a7ab0', stripe: '#e8e0c0', window: '#c8f0a0', eye: '#e8e0c0', face: 'bold' }));
  S(131, 'HOROLOGIUM', 'MAGLEV', st('wall', 470), 'slow', 45, 175, null, null,
    ['Clock Train', 3.8, 600, 'A clock tower on rails whose chimes set every station clock in Locomotia.'],
    A('tank', '#c8a24e', { len: 42, h: 20, col2: '#e0c070', stripe: '#3a2a1a', faceCol: '#f8f0d8', eye: '#3a2a1a', face: 'bold', mouth: 'line' }));
  S(132, 'WHISTLE', 'STEAM', st('swift', 300), 'fast', 190, 80, [26, 133], null,
    ['Horn Train', 0.6, 8, 'A tiny steam whistle on wheels. Its toot is far louder than its size suggests.'],
    A('steam', '#d8b060', { len: 28, h: 16, scale: 0.85, col2: '#a88040', trim: '#f0e0a0', faceCol: '#f0e0c0', stack: 'tall', wheels: 2, wheelR: 5, eye: '#6a4a1a', face: 'cute', mouth: 'o' }));
  S(133, 'BELLRINGER', 'STEAM/MONORAIL', st('swift', 440), 'fast', 90, 160, null, null,
    ['Alert Train', 2.6, 180, 'It rings a great brass bell before every crossing. Livestock three valleys away lift their heads.'],
    A('steam', '#c8a040', { len: 46, h: 16, col2: '#8a6a20', trim: '#f0e0a0', faceCol: '#f0e0c0', stack: 'short', wheels: 3, wheelR: 6, bell: true, eye: '#6a4a1a', face: 'bold', mouth: 'o' }));
  S(134, 'LAMPLIGHT', 'ELECTRIC', st('spec', 310), 'medium', 190, 82, [28, 135], null,
    ['Signal Lamp Train', 0.8, 12, 'A lamp-car that lights the way for lost travellers on foggy nights. It flickers when it giggles.'],
    A('tram', '#e8d8a0', { len: 30, h: 15, scale: 0.88, stripe: '#c8603a', window: '#fff8b0', eye: '#6a4a1a', face: 'cute' }));
  S(135, 'SEMAFOR', 'ELECTRIC/PASSENGER', st('spec', 445), 'medium', 75, 162, null, null,
    ['Flag Signal Train', 3.0, 140, 'It raises and lowers its signal arms to argue with other trains. It always wins on points.'],
    A('electric', '#e8e4dc', { len: 48, h: 15, col2: '#c8c4bc', stripe: '#c83a3a', window: '#2a2a3a', eye: '#c83a3a', face: 'bold' }));
  S(136, 'TELEGRAF', 'ELECTRIC', st('swift', 300), 'medium', 190, 76, [20, 137], null,
    ['Wire Train', 0.9, 14, 'It taps messages along the lineside wires in dots and dashes. Its clicking keeps the linesmen awake.'],
    A('tram', '#8a6a4a', { len: 30, h: 15, scale: 0.88, stripe: '#e8c040', window: '#f0f0d0', eye: '#2a1a0a', face: 'cute' }));
  S(137, 'RADIOTRAIN', 'ELECTRIC/MAGLEV', st('swift', 400), 'medium', 90, 132, [38, 138], null,
    ['Broadcast Train', 2.4, 110, 'It hums songs from far-off stations as it runs. Radios crackle to life when it is nearby.'],
    A('electric', '#b88a5a', { len: 44, h: 15, col2: '#d8aa7a', stripe: '#3a3a48', window: '#f0f0d0', spark: '#f8e060', eye: '#3a3a48', face: 'bold' }));
  S(138, 'CELLULAR', 'ELECTRIC/NUCLEAR', st('swift', 500), 'medium', 45, 218, null, null,
    ['Mobile Train', 3.8, 160, 'It keeps every train in the network in touch with every other. Its silence means something is wrong.'],
    A('maglev', '#3a4a5a', { len: 52, h: 14, col2: '#5a6a7a', stripe: '#8af0c0', window: '#1a2a2a', glow: '#8af0c0', eye: '#8af0c0', face: 'fierce' }));
  S(139, 'SATELLINK', 'MAGLEV', st('spec', 360), 'medium', 120, 110, [40, 140], null,
    ['Space Comm Train', 2.0, 50, 'It points its dish at the sky every night and listens for trains on distant worlds.'],
    A('maglev', '#c8c8d8', { len: 40, h: 14, col2: '#a8a8c0', stripe: '#3a5ab0', window: '#1a2a4a', glow: '#c8d8ff', eye: '#3a5ab0', face: 'cute' }));
  S(140, 'NETWORKER', 'MAGLEV/ELECTRIC', st('spec', 495), 'medium', 45, 212, null, null,
    ['Connected Train', 4.6, 280, 'It knows every train by name and every name by heart. It has never once felt lonely.'],
    A('maglev', '#5a6ab8', { len: 54, h: 15, col2: '#7a8ad8', stripe: '#f0e080', window: '#1a1a4a', glow: '#b8c8ff', fins: true, eye: '#f0e080', face: 'bold' }));
  S(141, 'STEELWHEEL', 'FREIGHT', st('tank', 280), 'mslow', 190, 60, [18, 142], null,
    ['Wheelset Train', 0.6, 90, 'A single stray wheelset that rolls about the yards looking for a wagon to call home.'],
    A('tank', '#8a8a98', { len: 28, h: 14, scale: 0.85, col2: '#a8a8b8', stripe: '#5a5a6a', faceCol: '#c8c8d0', eye: '#2a2a3a', face: 'cute' }));
  S(142, 'IRONCOUPLER', 'FREIGHT', st('tank', 380), 'mslow', 120, 118, [34, 143], null,
    ['Connection Train', 1.8, 400, 'It links wagons together with a grip that no storm can break.'],
    A('boxcar', '#6a6a78', { len: 42, h: 17, col2: '#8a8a98', roof: '#4a4a58', eye: '#e8a030', face: 'bold' }));
  S(143, 'BRONZEBOLT', 'FREIGHT/DIESEL', st('bruiser', 480), 'mslow', 45, 178, null, null,
    ['Fastener Train', 3.2, 1200, 'Bolted together from a hundred salvaged parts, it holds tighter than anything cast whole.'],
    A('diesel', '#a86a3a', { len: 52, h: 18, col2: '#c88a4a', stripe: '#3a2a1a', faceCol: '#d8a870', exhaust: true, spikes: 2, spikeY: 20, spikeCol: '#8a5a2a', eye: '#3a2a1a', face: 'fierce' }));
  S(144, 'SILVERSTREAM', 'MONORAIL', st('swift', 320), 'medium', 120, 86, [25, 145], null,
    ['Fast Flow Train', 1.6, 50, 'A glinting pod that streams along its beam like water down a glass.'],
    A('mono', '#c8ccd8', { len: 36, h: 14, scale: 0.9, window: '#e8f8ff', stripe: '#6a8ab0', eye: '#2a3a5a', face: 'cute' }));
  S(145, 'GOLDTRAK', 'MONORAIL/FREIGHT', st('swift', 420), 'medium', 75, 150, [42, 146], null,
    ['Precious Line Train', 2.8, 380, 'It polishes its own beam as it runs, leaving a line of gold across the valleys.'],
    A('mono', '#d8b040', { len: 46, h: 15, window: '#fff8d0', stripe: '#8a5a1a', eye: '#6a4a1a', face: 'bold' }));
  S(146, 'PLATINUMLINE', 'MONORAIL/MAGLEV', st('swift', 510), 'medium', 45, 225, null, null,
    ['Elite Line Train', 4.2, 300, 'The rarest of the metal lines. Its beam leaves no trace at all.'],
    A('maglev', '#e0e4ec', { len: 56, h: 14, col2: '#c8ccd8', stripe: '#a8b8d0', window: '#2a3a4a', glow: '#f0f8ff', fins: true, eye: '#6a8ab0', face: 'fierce' }));
  S(147, 'DIAMONDEXPRESS', 'MONORAIL/NUCLEAR', st('tank', 580), 'slow', 3, 261, null, null,
    ['Legendary Express Train', 5.2, 3100, 'Its facets split starlight into rainbows along the Summit line. It was cut, legend says, from a single gem.'],
    A('mono', '#b8e8f8', { len: 56, h: 19, window: '#f8ffff', stripe: '#e8f8ff', spikes: 3, spikeY: 19, spikeCol: '#e8f8ff', eye: '#3a8ab0', face: 'fierce' }));
  S(148, 'CRYSTALLINE', 'MONORAIL/MAGLEV', st('spec', 580), 'slow', 3, 261, null, null,
    ['Pure Line Train', 4.6, 700, 'A glass train through which the whole landscape can be seen. It chimes softly in the wind.'],
    A('maglev', '#d8f0f8', { len: 54, h: 15, col2: '#b8e0f0', stripe: '#f8ffff', window: '#e8faff', glow: '#f0ffff', fins: true, eye: '#3a8ab0', face: 'bold' }));
  S(149, 'MYTHRILWAY', 'MAGLEV/NUCLEAR', st('swift', 580), 'slow', 3, 261, null, null,
    ['Magical Train', 4.0, 90, 'Lighter than a feather and harder than steel. It appears only to Conductors with a pure heart.'],
    A('maglev', '#a8c8b8', { len: 52, h: 14, col2: '#c8e8d8', stripe: '#f0f8f0', window: '#1a3a2a', glow: '#d8fff0', wings: true, wingCol: '#e8fff0', eye: '#3a8a6a', face: 'bold' }));
  S(150, 'ADAMANTRAIN', 'FREIGHT/NUCLEAR', st('tank', 600), 'slow', 3, 270, null, null,
    ['Unbreakable Train', 6.0, 9000, 'Nothing has ever scratched its hull. It rests at the bottom of the deepest mine, waiting for a worthy load.'],
    A('diesel', '#3a3a48', { len: 56, h: 20, col2: '#5a5a6a', stripe: '#8af0c0', faceCol: '#7a7a8a', spikes: 3, spikeY: 19, spikeCol: '#8af0c0', exhaust: true, eye: '#8af0c0', face: 'fierce', mouth: 'grille' }));
  S(151, 'MEGALOCOMOTIVE', 'STEAM/NUCLEAR', st('bal', 640), 'slow', 3, 300, null, null,
    ['Ultimate Train', 9.9, 5000, 'The engine from which, some say, every train in Locomotia descends. Its whistle has not been heard in a thousand years.'],
    A('steam', '#c8a040', { len: 58, h: 19, col2: '#6a4a1a', trim: '#f8f0c0', faceCol: '#f8f0d8', stack: 'tall', stackCol: '#3a2a1a', wheels: 3, wheelR: 7.5, tender: true, crest: '#f8f0c0', eye: '#c8603a', face: 'fierce', mouth: 'grin' }));

  CD.species = {
    list,
    get: id => list[id],
    all: () => Object.values(list),
    byName: n => Object.values(list).find(s => s.name === String(n).toUpperCase()),
    S, st, derive, POOL,
  };
})(window.CD);
