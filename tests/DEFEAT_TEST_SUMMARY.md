# Battle Defeat Handling - Test Summary

## Quick Reference for Manual Testing

### What to Test
After the defeat fix is implemented, verify that losing a battle correctly:
1. Shows defeat messages
2. Heals player party
3. Reduces money
4. Teleports to Piston Town
5. Returns to overworld

---

## Minimal Test Steps (Fast Version)

### Setup
1. Load game at https://quadseven.github.io/conducted/
2. Press **F1** to open debug menu
3. Select **Wild Battle** to start a battle

### Execute Defeat
4. Press **Enter** to select FIGHT
5. Press **Enter** to select first move
6. Wait for enemy to attack
7. **Repeat steps 4-6** until player train faints

### Verify Defeat Sequence
8. Confirm message: **"{TrainName} fainted!"**
9. Press Enter
10. Confirm message: **"You have no more trains!"**
11. Press Enter
12. Confirm message: **"You blacked out!"**
13. Press Enter

### Verify Post-Defeat State
14. Open browser console (F12)
15. Check player state:
```javascript
console.log({
  position: { x: game.player.x, y: game.player.y, map: game.player.currentMap },
  money: game.player.money,
  partyHealed: game.player.party.every(t => t.currentHP === t.maxHP)
});
```

### Expected Console Output
```javascript
{
  position: { x: 10, y: 7, map: "piston_town" },
  money: 250,  // 50% of starting $500, or 0 if was < $100
  partyHealed: true
}
```

---

## Key Verification Points

| Item | How to Check | Expected Result |
|------|--------------|-----------------|
| **Defeat Messages** | Battle text box | 3 messages in order |
| **Teleport** | Overworld position | x=10, y=7, Piston Town |
| **Money Reduction** | Console: `game.player.money` | 50% of original (or 0 if < $100) |
| **Party Healed** | Console: `game.player.party[0].currentHP` | Equals maxHP for all trains |
| **Overworld Return** | Game state | Overworld rendered, player can move |

---

## What Should Happen (Code References)

### Battle.js - handleDefeat() (lines 330-336)
```javascript
handleDefeat() {
    this.addMessage("You have no more trains!");
    this.addMessage("You blacked out!");
    this.state = CONSTANTS.BATTLE_STATES.DEFEAT;
    this.battleEnded = true;
    this.playerWon = false;
}
```

### Game.js - handleDefeat() (lines 417-437)
```javascript
handleDefeat() {
    console.log('Player defeated - triggering blackout');

    // Heal all trains to full HP
    this.player.healParty();

    // Reduce money by 50% (or set to 0 if less than 100)
    if (this.player.money < 100) {
        this.player.money = 0;
    } else {
        this.player.money = Math.floor(this.player.money * 0.5);
    }

    // Teleport player back to Piston Town
    this.player.x = 10;
    this.player.y = 7;
    this.player.currentMap = 'piston_town';
    this.player.direction = CONSTANTS.DIRECTIONS.DOWN;

    console.log(`Blackout - Money reduced to ${this.player.money}, teleported to Piston Town`);
}
```

### Player.js - healParty() (lines 111-115)
```javascript
healParty() {
    for (const train of this.party) {
        train.heal(train.maxHP);
    }
}
```

---

## Console Commands for Quick Testing

### Check Current State
```javascript
game.state  // Should be 'overworld' after defeat
```

### Force a Defeat (Testing Only)
```javascript
// Lower player train HP to 1 for quick defeat testing
game.player.party[0].currentHP = 1;
```

### Verify Healing Works
```javascript
// Before defeat
game.player.party.map(t => t.currentHP)  // [1, 45, 30]

// After defeat
game.player.party.map(t => t.currentHP)  // [60, 45, 30] (all = maxHP)
```

### Check Money Reduction
```javascript
// Before defeat
game.player.money  // 500

// After defeat
game.player.money  // 250 (50%)
```

---

## Edge Cases

### 1. Money Edge Case: < $100
**Setup**: Set money to $80
```javascript
game.player.money = 80;
```
**Expected After Defeat**: Money = $0 (not negative)

### 2. Multiple Trains
**Expected**: Each train faints one by one, defeat only after last train

### 3. Already in Piston Town
**Expected**: Still teleports to x=10, y=7 (healing depot spawn)

---

## Common Issues to Watch For

### ❌ Battle Doesn't End
**Symptom**: Messages show but stuck in battle state
**Check**: Console for errors, verify `battle.isComplete()` exists

### ❌ Money Not Reduced
**Symptom**: Money unchanged after defeat
**Check**: Verify `handleDefeat()` is called (check console logs)

### ❌ Trains Stay Fainted
**Symptom**: Party HP still 0 after defeat
**Check**: Verify `player.healParty()` is called

### ❌ Player Not Teleported
**Symptom**: Player still at battle location
**Check**: Verify player.x, player.y, player.currentMap values

---

## Test Result Template

```
DEFEAT HANDLING TEST - [DATE]

✅ / ❌  Defeat messages appear (3 total)
✅ / ❌  Player teleported to Piston Town (10, 7)
✅ / ❌  Money reduced by 50%
✅ / ❌  All trains healed to full HP
✅ / ❌  Returned to overworld state
✅ / ❌  No console errors
✅ / ❌  Player can move after defeat

Notes:
[Any observations or issues]

Overall: PASS / FAIL
```

---

## Full Test Plan
See `DEFEAT_HANDLING_TEST_PLAN.md` for comprehensive test script with Playwright MCP commands.
