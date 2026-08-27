# Menu Navigation Test Checklist

## REQUIRED BEFORE EVERY COMMIT

Run through this entire checklist manually using Playwright MCP.

### Setup
- [ ] Navigate to file://<repo-root>/index.html
- [ ] Skip through intro/starter selection to reach overworld
- [ ] Verify state is 'overworld'

### Menu Opening
- [ ] Press ESC → Menu opens
- [ ] Press ESC again → Menu closes
- [ ] Press ESC → Menu opens again

### Menu Navigation (Up/Down)
- [ ] Start at TRAINS (top)
- [ ] Press Down → Moves to BAG
- [ ] Press Down → Moves to SHOP
- [ ] Press Down → Moves to HEAL
- [ ] Press Down → Moves to SAVE
- [ ] Press Down → Moves to CLOSE
- [ ] Press Down → Wraps back to TRAINS
- [ ] Press Up → Moves to CLOSE
- [ ] Press Up → Moves to SAVE
- [ ] Keep going up → Wraps to TRAINS

### Menu Selection - CLOSE
- [ ] Navigate to CLOSE
- [ ] Press Enter → Returns to overworld
- [ ] State is 'overworld'

### Menu Selection - SAVE
- [ ] Open menu
- [ ] Navigate to SAVE
- [ ] Press Enter → Game saves
- [ ] Returns to overworld

### Menu Selection - HEAL
- [ ] Open menu
- [ ] Navigate to HEAL
- [ ] Press Enter → Party heals
- [ ] Returns to overworld after 1 second

### Menu Selection - BAG
- [ ] Open menu
- [ ] Navigate to BAG
- [ ] Press Enter → BAG UI appears
- [ ] Can navigate items with Up/Down
- [ ] Press B/ESC → Returns to main menu
- [ ] Press B/ESC again → Returns to overworld

### Menu Selection - SHOP
- [ ] Open menu
- [ ] Navigate to SHOP
- [ ] Press Enter → SHOP UI appears
- [ ] Can navigate items with Up/Down
- [ ] Press B/ESC → Returns to main menu
- [ ] Press B/ESC again → Returns to overworld

### Menu Selection - TRAINS
- [ ] Open menu
- [ ] Navigate to TRAINS
- [ ] Press Enter → TRAINS UI appears
- [ ] Can see party
- [ ] Press B/ESC → Returns to main menu

### Edge Cases
- [ ] Rapid Up/Down navigation works smoothly
- [ ] No crashes when spamming keys
- [ ] Menu renders correctly over overworld
- [ ] Semi-transparent overlay visible
- [ ] All text readable

### ALL TESTS MUST PASS ✅

If ANY test fails, DO NOT COMMIT. Fix the bug first.
