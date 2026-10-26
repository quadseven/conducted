// Rail-switch puzzles: the gym floor switches that flip track tiles between
// open and blocked. A gym record's `puzzle` (src/data/gyms.js) lists its track
// tiles and its switches; stepping onto a switch flips every track tile it
// names. A track tile is open when an odd number of the switches that name it
// are thrown, so every track starts blocked and stepping on a switch twice
// undoes it. Which switches are thrown lives in the save at
// state.puzzles[badge], one boolean per switch, so a solved gym stays solved.
(function (CD) {
  'use strict';

  const key = (x, y) => x + ',' + y;
  const byMap = {};
  for (const g of CD.gyms.LIST) if (g.puzzle) byMap[g.map] = g;

  // The gym whose puzzle stands on this map, or null.
  function gymFor(mapId) { return byMap[mapId] || null; }

  // The thrown/unthrown list for a gym, created (all unthrown) on first use.
  // A list of the wrong length (an older save, an edited puzzle) starts over.
  function thrown(st, g) {
    if (!st.puzzles || typeof st.puzzles !== 'object' || Array.isArray(st.puzzles)) st.puzzles = {};
    let list = st.puzzles[g.badge];
    if (!Array.isArray(list) || list.length !== g.puzzle.switches.length) {
      list = g.puzzle.switches.map(() => false);
      st.puzzles[g.badge] = list;
    }
    return list;
  }

  // The same list without creating or repairing anything: what movement and
  // drawing read, so neither ever writes to the save.
  function peek(st, g) {
    const list = st.puzzles && st.puzzles[g.badge];
    return Array.isArray(list) && list.length === g.puzzle.switches.length ? list : g.puzzle.switches.map(() => false);
  }

  // Is the track tile at (x, y) open under this switch list? null when the
  // tile is not a track tile of the puzzle.
  function trackOpen(puzzle, list, x, y) {
    if (!puzzle.tracks.some(([tx, ty]) => tx === x && ty === y)) return null;
    let open = false;
    puzzle.switches.forEach((sw, i) => {
      if (list[i] && sw.flips.some(([fx, fy]) => fx === x && fy === y)) open = !open;
    });
    return open;
  }

  // Index of the switch at (x, y), or -1.
  function switchAt(puzzle, x, y) { return puzzle.switches.findIndex(sw => sw.x === x && sw.y === y); }

  // Every track tile that is blocked under this switch list, as "x,y" keys.
  function blockedSet(puzzle, list) {
    const out = new Set();
    for (const [x, y] of puzzle.tracks) if (!trackOpen(puzzle, list, x, y)) out.add(key(x, y));
    return out;
  }

  // Overworld movement asks this before any step: true on a blocked track tile.
  function blocked(st, mapId, x, y) {
    const g = gymFor(mapId);
    if (!g) return false;
    return trackOpen(g.puzzle, peek(st, g), x, y) === false;
  }

  // Throw (or unthrow) switch i of the gym on this map. Returns the new list.
  function press(st, mapId, i) {
    const g = gymFor(mapId);
    if (!g) return null;
    const list = thrown(st, g);
    list[i] = !list[i];
    return list;
  }

  // The player just arrived on (x, y): flip the switch there, if any.
  function onArrive(st, mapId, x, y) {
    const g = gymFor(mapId);
    if (!g) return false;
    const i = switchAt(g.puzzle, x, y);
    if (i < 0) return false;
    press(st, mapId, i);
    if (CD.audio && CD.audio.sfx) CD.audio.sfx('shake');
    return true;
  }

  // Draw the switches and track tiles over the floor of the current map.
  function draw(s, m, camX, camY) {
    const g = gymFor(m.id);
    if (!g) return;
    const list = peek(CD.state, g), TS = 16;
    for (const [x, y] of g.puzzle.tracks) {
      const px = x * TS - camX, py = y * TS - camY;
      const open = trackOpen(g.puzzle, list, x, y);
      // two rails on sleepers; a blocked tile adds a red-and-white buffer bar
      for (let k = 1; k < TS; k += 4) s.fill(px + 1, py + k, TS - 2, 2, '#6a4a2a');
      s.fill(px + 4, py, 2, TS, '#9aa0a8'); s.fill(px + TS - 6, py, 2, TS, '#9aa0a8');
      if (!open) {
        s.fill(px + 1, py + 6, TS - 2, 4, '#f0f0f0');
        for (let k = 1; k < TS - 1; k += 4) s.fill(px + k, py + 6, 2, 4, '#c83a2a');
      }
    }
    g.puzzle.switches.forEach((sw, i) => {
      const px = sw.x * TS - camX, py = sw.y * TS - camY;
      s.fill(px + 3, py + 3, TS - 6, TS - 6, '#4a4a52');
      s.fill(px + 4, py + 4, TS - 8, TS - 8, list[i] ? '#58c858' : '#c8b048');
      // the lever leans one way or the other
      s.fill(list[i] ? px + 9 : px + 5, py + 5, 2, 6, '#f0f0f0');
    });
  }

  CD.railSwitch = { gymFor, thrown, peek, trackOpen, switchAt, blockedSet, blocked, press, onArrive, draw };
})(window.CD);
