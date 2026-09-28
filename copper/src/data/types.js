// The eight train types and their matchup chart (conducted's own chart, rows attack,
// columns defend). Values: 2 super effective, 0.5 not very effective, 1 neutral.
(function (CD) {
  'use strict';
  const TYPES = ['STEAM', 'ELECTRIC', 'DIESEL', 'MAGLEV', 'FREIGHT', 'PASSENGER', 'NUCLEAR', 'MONORAIL'];
  const CHART = {
    STEAM: { STEAM: 0.5, ELECTRIC: 1, DIESEL: 2, MAGLEV: 0.5, FREIGHT: 1, PASSENGER: 1, NUCLEAR: 0.5, MONORAIL: 2 },
    ELECTRIC: { STEAM: 2, ELECTRIC: 0.5, DIESEL: 1, MAGLEV: 0.5, FREIGHT: 1, PASSENGER: 2, NUCLEAR: 0.5, MONORAIL: 2 },
    DIESEL: { STEAM: 0.5, ELECTRIC: 2, DIESEL: 0.5, MAGLEV: 1, FREIGHT: 2, PASSENGER: 1, NUCLEAR: 1, MONORAIL: 1 },
    MAGLEV: { STEAM: 2, ELECTRIC: 2, DIESEL: 1, MAGLEV: 0.5, FREIGHT: 0.5, PASSENGER: 1, NUCLEAR: 1, MONORAIL: 2 },
    FREIGHT: { STEAM: 1, ELECTRIC: 1, DIESEL: 0.5, MAGLEV: 2, FREIGHT: 0.5, PASSENGER: 2, NUCLEAR: 1, MONORAIL: 2 },
    PASSENGER: { STEAM: 1, ELECTRIC: 0.5, DIESEL: 1, MAGLEV: 2, FREIGHT: 0.5, PASSENGER: 1, NUCLEAR: 2, MONORAIL: 1 },
    NUCLEAR: { STEAM: 2, ELECTRIC: 2, DIESEL: 2, MAGLEV: 1, FREIGHT: 1, PASSENGER: 0.5, NUCLEAR: 0.5, MONORAIL: 1 },
    MONORAIL: { STEAM: 0.5, ELECTRIC: 0.5, DIESEL: 2, MAGLEV: 0.5, FREIGHT: 2, PASSENGER: 1, NUCLEAR: 2, MONORAIL: 0.5 },
  };
  function effectiveness(atk, defTypes) {
    if (!CHART[atk]) throw new RangeError('unknown type ' + atk);
    return defTypes.reduce((m, t) => m * CHART[atk][t], 1);
  }
  CD.types = { TYPES, CHART, effectiveness };
})(window.CD);
