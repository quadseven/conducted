// Rail-switch puzzle tests for all eight gyms
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 13 });
const CD = h.CD;

function reachesLeader(g, switches) {
  const { track, gates } = g.puzzle;
  const center = Math.floor(track[0].length / 2);
  const start = [center, 7], goal = [center, 4];
  const open = (x, y) => {
    const tile = track[y] && track[y][x];
    if (tile === undefined) return false;
    const gateIndex = gates.findIndex(gate => gate.cells.some(([gx, gy]) => gx === x && gy === y));
    if (gateIndex >= 0) return switches[gateIndex];
    return tile !== 0;
  };
  const queue = [start], seen = new Set([start.join(',')]);
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === goal[0] && y === goal[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, y + dy], key = next.join(',');
      if (open(...next) && !seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  return false;
}

// Test 1: Verify that all gyms have puzzle layouts and initialize them
// Note: puzzles are initialized when the gym.js script loads, not in CD.newState()
for (const g of CD.gyms.LIST) {
  assert(g.puzzle, `Gym ${g.badge} needs a rail-switch puzzle`);
    assert(Array.isArray(g.puzzle.switches), `Gym ${g.badge} has invalid switches`);
    assert(Array.isArray(g.puzzle.track), `Gym ${g.badge} has invalid track`);
    assert(Array.isArray(g.puzzle.solution), `Gym ${g.badge} has invalid solution`);
    assert(g.puzzle.switches.length > 0, `Gym ${g.badge} must have at least one switch`);
    assert(g.puzzle.switches.length === g.puzzle.solution.length, `Gym ${g.badge} switches/solution length mismatch`);
    assert.strictEqual(g.puzzle.gates.length, g.puzzle.switches.length, `Gym ${g.badge} needs one gate per switch`);
    const map = CD.world.get(g.map), compiled = CD.world.compile(map);
    for (const sw of g.puzzle.switches) {
      assert(!compiled.cells[sw.y * compiled.w + sw.x].solid, `Gym ${g.badge} switch at ${sw.x},${sw.y} must be walkable`);
    }
    
    const puzzleState = CD.state.puzzles[g.badge];
    assert(puzzleState, `Gym ${g.badge} should have puzzle state`);
    assert(!puzzleState.solved, `Gym ${g.badge} should not be solved initially`);
    assert(puzzleState.switches.every(val => !val), `Gym ${g.badge} switches should all be OFF initially`);
    assert(!reachesLeader(g, puzzleState.switches), `Gym ${g.badge} leader must stay unreachable before solving`);
    assert(reachesLeader(g, g.puzzle.solution), `Gym ${g.badge} solution must open a path to its leader`);
}

console.log('rail-switch layout test: ok');
