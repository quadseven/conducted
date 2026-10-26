// Rail-switch puzzle tests for all eight gyms
'use strict';
const assert = require('assert');
const H = require('./harness.js');
const h = H.load({ seed: 13 });
const CD = h.CD;

// Test 1: Verify that all gyms have puzzle layouts and initialize them
// Note: puzzles are initialized when the gym.js script loads, not in CD.newState()
for (const g of CD.gyms.LIST) {
  if (g.puzzle) {
    assert(Array.isArray(g.puzzle.switches), `Gym ${g.badge} has invalid switches`);
    assert(Array.isArray(g.puzzle.track), `Gym ${g.badge} has invalid track`);
    assert(Array.isArray(g.puzzle.solution), `Gym ${g.badge} has invalid solution`);
    assert(g.puzzle.switches.length > 0, `Gym ${g.badge} must have at least one switch`);
    assert(g.puzzle.switches.length === g.puzzle.solution.length, `Gym ${g.badge} switches/solution length mismatch`);
    
    const puzzleState = CD.state.puzzles[g.badge];
    assert(puzzleState, `Gym ${g.badge} should have puzzle state`);
    assert(!puzzleState.solved, `Gym ${g.badge} should not be solved initially`);
    assert(puzzleState.switches.every(val => !val), `Gym ${g.badge} switches should all be OFF initially`);
  }
}

console.log('rail-switch layout test: ok');