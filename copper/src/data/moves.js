// Moves. The first fifty follow conducted's original move list (names, types,
// power, accuracy, PP, effects); the rest widen each type's options.
// cat: phys | spec | status.  fx keys:
//   brn/par/psn/slp/conf/flinch: chance %      stat: [who, stat, stages, chance%]
//   recoil: fraction of damage   drain: fraction healed   heal: fraction of max HP
//   fixed: n | 'half' | 'level'  hits: [min, max]   recharge: true   crit: true
//   inflict: 'par'|'psn'|'slp'|'conf' (status moves)   prio: +1   rest: true
// anim names a battle effect in art/vfx.js.
(function (CD) {
  'use strict';
  const M = {};
  function m(name, type, cat, pow, acc, pp, fx, anim, desc) { M[name] = { name, type, cat, pow, acc, pp, fx: fx || {}, anim: anim || 'bump', desc: desc || '' }; }

  // PASSENGER
  m('Ram', 'PASSENGER', 'phys', 40, 100, 35, null, 'bump', 'Charges straight into the foe.');
  m('Express Shunt', 'PASSENGER', 'phys', 40, 100, 30, { prio: 1 }, 'dash', 'Darts forward before the foe can react.');
  m('Full Throttle', 'PASSENGER', 'phys', 85, 100, 15, { par: 30 }, 'dash', 'Hits at top speed. May leave the foe shorted.');
  m('Emergency Brake', 'PASSENGER', 'status', 0, 100, 30, { stat: ['self', 'def', 1] }, 'brace', 'Locks the wheels to raise DEFENSE.');
  m('Whistle Blast', 'PASSENGER', 'status', 0, 100, 30, { stat: ['foe', 'def', -1] }, 'soundwave', 'A shrill whistle that lowers the foe\'s DEFENSE.');
  m('Wheel Grind', 'PASSENGER', 'status', 0, 100, 30, { stat: ['foe', 'spd', -1] }, 'sparks', 'Grinds sparks to lower the foe\'s SPEED.');
  m('Horn Honk', 'PASSENGER', 'status', 0, 100, 40, { stat: ['foe', 'atk', -1] }, 'soundwave', 'A loud honk that lowers the foe\'s ATTACK.');
  m('Track Grease', 'PASSENGER', 'status', 0, 95, 40, { stat: ['foe', 'acc', -1] }, 'splat', 'Slicks the rails to lower ACCURACY.');
  m('High Beams', 'PASSENGER', 'status', 0, 100, 20, { inflict: 'par' }, 'flash', 'Dazzling headlamps that short the foe out.');
  m('Multi-Track Drift', 'PASSENGER', 'phys', 15, 85, 20, { hits: [2, 5] }, 'multi', 'Swerves in to hit 2 to 5 times.');
  m('Coupler Crush', 'PASSENGER', 'phys', 80, 90, 15, { flinch: 20 }, 'crunch', 'Clamps down with its couplers. May cause flinching.');
  m('Derailment', 'PASSENGER', 'phys', 1, 90, 10, { fixed: 'half' }, 'quake', 'Knocks the foe off the rails: halves its HP.');
  m('Iron Bumper', 'PASSENGER', 'phys', 60, 100, 25, { flinch: 30 }, 'bump', 'Buffers slam the foe. May cause flinching.');
  m('Passenger Rush', 'PASSENGER', 'phys', 75, 100, 20, null, 'dash', 'A full carriage charges in.');
  m('Express Service', 'PASSENGER', 'phys', 60, 100, 20, { prio: 1 }, 'dash', 'Priority service: strikes first.');
  m('Timetable', 'PASSENGER', 'status', 0, 100, 10, { rest: true }, 'heal', 'Stops for a rest: full HP, then idles for two turns.');
  m('Double Header', 'PASSENGER', 'phys', 35, 90, 10, { hits: [2, 2] }, 'multi', 'Two engines strike one after another.');

  // STEAM
  m('Coal Throw', 'STEAM', 'phys', 50, 95, 25, { brn: 10 }, 'coal', 'Hurls hot coal. May overheat the foe.');
  m('Steam Jet', 'STEAM', 'spec', 65, 100, 20, { brn: 20 }, 'steam', 'A scalding jet of steam. May overheat the foe.');
  m('Boiler Burst', 'STEAM', 'spec', 90, 85, 15, { brn: 30 }, 'burst', 'Vents the boiler in a blast. May overheat the foe.');
  m('Pressure Blast', 'STEAM', 'spec', 110, 80, 10, null, 'burst', 'Everything the boiler has, in one blow.');
  m('Mega Steam', 'STEAM', 'spec', 150, 90, 5, { recoil: 0.5 }, 'burst', 'An enormous blast. The user takes heavy recoil.');
  m('Smoke Screen', 'STEAM', 'status', 0, 100, 20, { stat: ['foe', 'acc', -1] }, 'smoke', 'Belches smoke to lower ACCURACY.');
  m('Firebox', 'STEAM', 'spec', 40, 100, 25, { brn: 10 }, 'ember', 'Sparks from the firebox. May overheat the foe.');
  m('Scald Whistle', 'STEAM', 'spec', 80, 100, 15, { brn: 10 }, 'steam', 'A whistle blast of scalding vapor.');
  m('Stoke Up', 'STEAM', 'status', 0, 100, 20, { stat: ['self', 'spc', 2] }, 'stoke', 'Shovels coal to sharply raise SPECIAL.');

  // ELECTRIC
  m('Spark', 'ELECTRIC', 'phys', 40, 100, 30, { par: 10 }, 'spark', 'A charged tackle. May short the foe out.');
  m('Pantograph Spark', 'ELECTRIC', 'spec', 40, 100, 30, { par: 10 }, 'zap', 'An arc leaps from the pantograph.');
  m('Charge Beam', 'ELECTRIC', 'spec', 65, 100, 20, { stat: ['self', 'spc', 1, 70] }, 'beam', 'A beam that may raise the user\'s SPECIAL.');
  m('Third Rail', 'ELECTRIC', 'status', 0, 100, 20, { inflict: 'par' }, 'zap', 'Live current shorts the foe out.');
  m('Rail Gun', 'ELECTRIC', 'spec', 90, 100, 15, null, 'beam', 'Fires a magnetically hurled slug.');
  m('Lightning Express', 'ELECTRIC', 'spec', 110, 85, 10, null, 'bolt', 'A thunderbolt that runs on schedule.');
  m('EMP Blast', 'ELECTRIC', 'spec', 120, 70, 5, { stat: ['foe', 'spc', -1, 100] }, 'bolt', 'A pulse that also lowers the foe\'s SPECIAL.');
  m('Overload', 'ELECTRIC', 'spec', 120, 70, 10, { par: 30 }, 'bolt', 'Dumps the whole circuit. May short the foe out.');
  m('Static Hum', 'ELECTRIC', 'status', 0, 100, 20, { stat: ['self', 'spd', 2] }, 'charge', 'Charges up to sharply raise SPEED.');

  // DIESEL
  m('Diesel Spray', 'DIESEL', 'spec', 55, 95, 25, null, 'splat', 'Sprays hot fuel oil.');
  m('Engine Rev', 'DIESEL', 'status', 0, 100, 30, { stat: ['self', 'atk', 1] }, 'rev', 'Revs the engine to raise ATTACK.');
  m('Fuel Blast', 'DIESEL', 'spec', 80, 100, 15, null, 'burst', 'Ignites a spray of fuel.');
  m('Turbo Charge', 'DIESEL', 'phys', 100, 95, 10, { recoil: 0.25 }, 'dash', 'A turbocharged charge with some recoil.');
  m('Exhaust Fumes', 'DIESEL', 'spec', 15, 100, 35, { psn: 30 }, 'smoke', 'Choking fumes. May corrode the foe.');
  m('Torque Punch', 'DIESEL', 'phys', 75, 100, 15, { flinch: 10 }, 'crunch', 'Transfers raw torque into one blow.');
  m('Piston Drive', 'DIESEL', 'phys', 90, 90, 10, null, 'quake', 'Pistons pound the foe into the ballast.');
  m('Idle Rumble', 'DIESEL', 'status', 0, 75, 15, { inflict: 'slp' }, 'soundwave', 'A low idling rumble that lulls the foe to sleep.');

  // FREIGHT
  m('Cargo Toss', 'FREIGHT', 'phys', 50, 100, 25, null, 'crate', 'Throws a crate from the hold.');
  m('Boxcar Bash', 'FREIGHT', 'phys', 70, 95, 20, null, 'bump', 'A loaded boxcar rams the foe.');
  m('Container Crush', 'FREIGHT', 'phys', 85, 100, 15, { flinch: 10 }, 'crate', 'Drops a shipping container. May cause flinching.');
  m('Freight Frenzy', 'FREIGHT', 'phys', 120, 100, 10, { recharge: true }, 'quake', 'A tremendous haul. The user must rest next turn.');
  m('Heavy Haul', 'FREIGHT', 'phys', 100, 90, 10, { stat: ['self', 'spd', -1, 100] }, 'quake', 'Crushing weight that also slows the user.');
  m('Ballast Toss', 'FREIGHT', 'phys', 35, 90, 25, { hits: [2, 5] }, 'gravel', 'Flings gravel 2 to 5 times.');
  m('Tarp Wrap', 'FREIGHT', 'status', 0, 100, 20, { stat: ['self', 'def', 2] }, 'brace', 'Lashes a tarp tight to sharply raise DEFENSE.');
  m('Tidal Haul', 'FREIGHT', 'spec', 75, 100, 15, null, 'wave', 'Drags a wall of harbor water onto the foe.');
  m('Anchor Drop', 'FREIGHT', 'phys', 65, 100, 20, { stat: ['foe', 'spd', -1, 30] }, 'anchor', 'Drops an anchor. May lower the foe\'s SPEED.');

  // MAGLEV
  m('Maglev Rush', 'MAGLEV', 'phys', 80, 100, 15, null, 'dash', 'Glides in on a magnetic cushion.');
  m('Magnetic Pulse', 'MAGLEV', 'spec', 90, 95, 10, { conf: 20 }, 'pulse', 'A pulse that may confuse the foe.');
  m('Levitation', 'MAGLEV', 'status', 0, 100, 30, { stat: ['self', 'spd', 2] }, 'float', 'Rises off the rails to sharply raise SPEED.');
  m('Sonic Boom', 'MAGLEV', 'spec', 1, 90, 20, { fixed: 20 }, 'soundwave', 'Always deals 20 damage.');
  m('Signal Jam', 'MAGLEV', 'status', 0, 100, 20, { inflict: 'conf' }, 'pulse', 'Scrambles the foe\'s signals to confuse it.');
  m('Polarity Flip', 'MAGLEV', 'spec', 50, 100, 25, { conf: 10 }, 'pulse', 'Flips the field. May confuse the foe.');
  m('Air Cushion', 'MAGLEV', 'status', 0, 100, 10, { heal: 0.5 }, 'heal', 'Floats free of wear to restore half its HP.');

  // MONORAIL
  m('Mono-Strike', 'MONORAIL', 'phys', 35, 100, 35, { crit: true }, 'slash', 'A precise strike with a high critical-hit ratio.');
  m('Beam Balance', 'MONORAIL', 'status', 0, 100, 20, { stat: ['self', 'def', 2] }, 'brace', 'Finds perfect balance to sharply raise DEFENSE.');
  m('Frost Rail', 'MONORAIL', 'spec', 60, 100, 25, { stat: ['foe', 'spd', -1, 30] }, 'frost', 'Freezes the rail. May lower the foe\'s SPEED.');
  m('Cable Lash', 'MONORAIL', 'phys', 70, 95, 15, null, 'slash', 'Whips with a drive cable.');
  m('Summit Drop', 'MONORAIL', 'phys', 95, 90, 10, null, 'quake', 'Drops from a great height.');

  // NUCLEAR
  m('Radiation Leak', 'NUCLEAR', 'spec', 65, 100, 20, { psn: 30 }, 'glow', 'A glowing leak. May corrode the foe.');
  m('Reactor Meltdown', 'NUCLEAR', 'spec', 120, 90, 5, { recoil: 0.33 }, 'burst', 'A meltdown that hurts the user too.');
  m('Atomic Flash', 'NUCLEAR', 'spec', 95, 100, 10, { stat: ['foe', 'spc', -1, 30] }, 'flash', 'A blinding flash. May lower SPECIAL.');
  m('Containment Field', 'NUCLEAR', 'status', 0, 100, 20, { stat: ['self', 'spc', 2] }, 'shield', 'Seals its core to sharply raise SPECIAL.');
  m('Corrode', 'NUCLEAR', 'status', 0, 90, 35, { inflict: 'psn' }, 'glow', 'Coats the foe in something that eats metal.');
  m('Isotope Sap', 'NUCLEAR', 'spec', 40, 100, 20, { drain: 0.5 }, 'drain', 'Draws energy from the foe and heals by half.');

  CD.moves = { M, get: n => M[n], list: () => Object.values(M) };
})(window.CD);
