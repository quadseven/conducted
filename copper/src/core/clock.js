// Time of day from the player's own clock. Outdoor maps are tinted at dusk and
// night, and lamps and windows light up. CD.clock.fixed can pin an hour for tests.
(function (CD) {
  'use strict';
  const clock = { fixed: null };
  clock.hour = () => (clock.fixed !== null ? clock.fixed : (typeof Date !== 'undefined' ? new Date().getHours() + new Date().getMinutes() / 60 : 12));
  clock.light = () => {
    const h = clock.hour();
    if (h >= 20 || h < 5) return { tint: 0.42, color: '#1c2448', windows: true, phase: 'night' };
    if (h >= 18) return { tint: 0.2 + (h - 18) * 0.08, color: '#6a3a5a', windows: h >= 19, phase: 'dusk' };
    if (h < 7) return { tint: 0.3 - (h - 5) * 0.13, color: '#5a5a8a', windows: h < 6, phase: 'dawn' };
    return { tint: 0, phase: 'day' };
  };
  CD.clock = clock;
})(window.CD);
