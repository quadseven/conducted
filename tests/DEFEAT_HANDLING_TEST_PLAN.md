# Playwright Test Plan: Battle Defeat Handling

## Test Objective
Verify that when a player loses a battle (all trains faint), the game correctly:
1. Shows defeat messages
2. Heals all player trains to full HP
3. Reduces player money by 50% (or to 0 if < $100)
4. Teleports player to Piston Town healing depot
5. Returns to overworld state

## System Under Test
- **Files**: `/Users/evan/Documents/GitHub/conducted/js/battle.js`, `/Users/evan/Documents/GitHub/conducted/js/game.js`
- **Battle State Flow**: INTRO → MENU → FIGHT → ANIMATION → MESSAGE → DEFEAT
- **Defeat Handler**: `Game.prototype.handleDefeat()` (lines 417-437 in game.js)
- **Battle Defeat Logic**: `Battle.prototype.handleDefeat()` (lines 330-336 in battle.js)

## Pre-Test Setup Required

### 1. Save File Preparation
Create a save state with:
- **Player Money**: $500 (to test 50% reduction)
- **Player Position**: Route 1 or any location other than Piston Town
- **Party Composition**:
  - 1 weak train (Level 5, low stats)
  - Other party members can be higher level (for post-defeat verification)

### 2. Battle Configuration
- **Enemy Train**: High-level train (Level 20+) to guarantee player defeat
- **Battle Type**: Wild battle (simplest to trigger)
- **Expected Outcome**: Player train faints, triggers defeat

---

## Test Script Steps

### Phase 1: Navigate to Battle Start
```
1. Open browser and navigate to https://quadseven.github.io/conducted/
2. Wait for game to load (check for canvas element and "Load" button)
3. Click "Load" button to load prepared save file
4. Verify player position (should NOT be in Piston Town)
5. Verify player money = $500
6. Take snapshot to confirm overworld state
```

### Phase 2: Initiate Battle
```
7. Use debug menu (F1 or backtick key) to access "Wild Battle" option
   - Alternative: Move around Route 1 until wild encounter triggers
8. Select "Wild Battle" option
9. Wait for battle state to load
10. Take snapshot to verify battle screen renders
11. Verify battle HUD shows:
    - Player train name, level, HP bar
    - Enemy train name, level
    - Battle menu (FIGHT, POKEMON, ITEM, RUN)
```

### Phase 3: Lose the Battle
```
12. Select FIGHT from main battle menu
13. Select any move (e.g., first move)
14. Wait for player attack animation and damage
15. Wait for enemy attack animation
16. Observe player HP decrease
17. Repeat steps 12-16 until player train HP reaches 0
18. Take snapshot when player train faints
```

### Phase 4: Verify Defeat Messages
```
19. Wait for message: "{TrainName} fainted!"
20. Press Enter/A to advance message
21. Verify message: "You have no more trains!"
22. Take snapshot of defeat message
23. Press Enter/A to advance
24. Verify message: "You blacked out!"
25. Take snapshot of blackout message
26. Press Enter/A to advance
```

### Phase 5: Verify Post-Defeat State
```
27. Wait for return to overworld state
28. Take snapshot to verify overworld renders
29. Verify player position:
    - X coordinate = 10
    - Y coordinate = 7
    - Current map = "piston_town"
30. Open debug menu or use console to check player.money
31. Verify money = $250 (50% of $500)
32. Check party status (use console: game.player.party)
33. Verify ALL trains have currentHP = maxHP (fully healed)
34. Take final snapshot showing healed party at Piston Town
```

---

## Expected Results Summary

| Check Point | Expected Value | Verification Method |
|-------------|----------------|---------------------|
| Defeat Message 1 | "{TrainName} fainted!" | Battle message box |
| Defeat Message 2 | "You have no more trains!" | Battle message box |
| Defeat Message 3 | "You blacked out!" | Battle message box |
| Player Position X | 10 | Console: `game.player.x` |
| Player Position Y | 7 | Console: `game.player.y` |
| Player Map | "piston_town" | Console: `game.player.currentMap` |
| Player Money | $250 | Console: `game.player.money` |
| Party Train 1 HP | currentHP = maxHP | Console: `game.player.party[0].currentHP === game.player.party[0].maxHP` |
| Party Train 2 HP | currentHP = maxHP | Console: `game.player.party[1].currentHP === game.player.party[1].maxHP` |
| Game State | OVERWORLD | Console: `game.state === CONSTANTS.STATES.OVERWORLD` |

---

## Edge Cases to Test

### Edge Case 1: Money < $100
**Setup**: Player has $80
**Expected**: Money reduced to $0 (not negative)
**Test Steps**: Same as main test, but verify money = 0

### Edge Case 2: Multiple Trains in Party
**Setup**: Player has 3 trains, all faint sequentially
**Expected**: Each faint triggers message, final defeat after last train faints
**Test Steps**:
1. Let first train faint
2. Verify "Switch train" prompt
3. Send out second train
4. Let second train faint
5. Continue until all trains fainted
6. Verify defeat sequence

### Edge Case 3: Last Train Faints from Status/Recoil
**Setup**: Player train at low HP, uses recoil move or has poison/burn
**Expected**: Defeat triggers even without enemy attack
**Test Steps**: Use recoil move (if available) to KO own train

---

## Manual Playwright MCP Test Commands

### Setup Phase
```javascript
// Navigate to game
mcp__playwright__browser_navigate({ url: "https://quadseven.github.io/conducted/" })

// Wait for load
mcp__playwright__browser_wait_for({ time: 3 })

// Take initial snapshot
mcp__playwright__browser_snapshot()

// Click Load button (find ref from snapshot)
mcp__playwright__browser_click({ element: "Load button", ref: "{ref from snapshot}" })
```

### Battle Trigger Phase
```javascript
// Press F1 for debug menu
mcp__playwright__browser_press_key({ key: "F1" })

// Take snapshot to see debug menu
mcp__playwright__browser_snapshot()

// Navigate to Wild Battle option (use arrow keys)
mcp__playwright__browser_press_key({ key: "ArrowDown" })
mcp__playwright__browser_press_key({ key: "ArrowDown" })
mcp__playwright__browser_press_key({ key: "ArrowDown" })
mcp__playwright__browser_press_key({ key: "ArrowDown" })

// Select Wild Battle
mcp__playwright__browser_press_key({ key: "Enter" })

// Wait for battle to load
mcp__playwright__browser_wait_for({ time: 2 })

// Take battle snapshot
mcp__playwright__browser_snapshot()
```

### Battle Execution Phase
```javascript
// Select FIGHT
mcp__playwright__browser_press_key({ key: "Enter" })

// Select first move
mcp__playwright__browser_press_key({ key: "Enter" })

// Wait for turn to complete
mcp__playwright__browser_wait_for({ time: 3 })

// Take snapshot after turn
mcp__playwright__browser_snapshot()

// Repeat above 3-5 times until defeat
```

### Verification Phase
```javascript
// Check console for player state
mcp__playwright__browser_evaluate({
  function: "() => ({ money: game.player.money, x: game.player.x, y: game.player.y, map: game.player.currentMap, party: game.player.party.map(t => ({ name: t.species.name, hp: t.currentHP, maxHP: t.maxHP })) })"
})

// Take final overworld snapshot
mcp__playwright__browser_snapshot()
```

---

## Test Pass Criteria

✅ **PASS** if all of the following are true:
1. All three defeat messages appear in sequence
2. Player teleports to Piston Town (x=10, y=7)
3. Player money reduced by 50% (or to 0 if < $100)
4. All trains in party are fully healed (currentHP = maxHP)
5. Game returns to OVERWORLD state
6. No JavaScript errors in console
7. No visual glitches or UI corruption

❌ **FAIL** if any of the following occur:
1. Defeat messages don't appear
2. Player not teleported (stays in battle location)
3. Money not reduced correctly
4. Trains remain fainted
5. Game stuck in BATTLE state
6. JavaScript errors thrown
7. Game becomes unresponsive

---

## Known Issues to Watch For
- **Issue #68**: Input not updating (fixed) - verify keyboard input works throughout test
- **Battle state stuck**: If battle doesn't end, check `battle.isComplete()` method
- **Money calculation**: Verify `Math.floor(money * 0.5)` for correct rounding

---

## Test Artifacts to Capture
1. `defeat-message-1-fainted.png` - Screenshot of "{TrainName} fainted!" message
2. `defeat-message-2-no-trains.png` - Screenshot of "You have no more trains!" message
3. `defeat-message-3-blackout.png` - Screenshot of "You blacked out!" message
4. `post-defeat-overworld.png` - Screenshot of player in Piston Town
5. `console-party-healed.json` - Console output showing party HP values
6. `console-money-reduced.json` - Console output showing money value

---

## Automation Potential
This test can be fully automated using Playwright with:
- Snapshot assertions for UI state
- JavaScript evaluation for game state verification
- Screenshot comparison for visual regression
- Console log monitoring for errors

**Estimated Manual Test Time**: 5-8 minutes
**Estimated Automated Test Time**: 45-60 seconds
