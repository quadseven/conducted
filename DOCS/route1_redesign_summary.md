# Route 1 Redesign Summary

**Date:** 2025-11-03
**Task:** Redesign Route 1 to match Pokemon Red/Blue routing standards

## Problem Statement
Route 1 was originally designed as a solid field of tall grass (tile index 2) with border walls, making it impossible for players to avoid wild encounters. This design violated Pokemon routing conventions where routes have clear paths with avoidable grass patches.

## Solution Implemented

### New Route 1 Design
A Pokemon Red/Blue-style route with:
- **Vertical dirt path** running through the center (columns 8-11)
- **Grass patches** on the sides of the path (avoidable)
- **Border cliffs** on the edges for boundaries
- **Landmarks**: Sign at (9,3), Trees at (8,6) and (11,6)
- **Ledges** at (4,3) and (13,10) for future one-way travel mechanic

### Tile Mapping
```
Tile Index | Type          | Walkable | Encounters | Description
-----------|---------------|----------|------------|------------------
0          | Void          | NO       | NO         | Out of bounds
1          | Path/Dirt     | YES      | NO         | Main walkable path
2          | Tall Grass    | YES      | YES        | Dark red grass
3          | Normal Grass  | YES      | YES        | Light green grass
4          | Sign          | YES      | NO         | Interactive landmark
5          | Border/Cliff  | NO       | NO         | Route boundaries
6          | Ledge         | NO       | NO         | One-way barriers
7          | Tree/Landmark | NO       | NO         | Visual variety
```

### Tileset Information
- **File:** `<repo-root>/assets/tiles/route-grass.png`
- **Dimensions:** 512x512 pixels
- **Tile Size:** 16x16 pixels
- **Grid:** 32 columns x 32 rows (1024 total tiles)

## Code Changes

### 1. `<repo-root>/js/world-maps.js`

#### Route1 Tilemap
Replaced `boxed(20, 15, 5, 2)` with explicit 15-row tilemap array featuring:
- Clear vertical path through center
- Grass patches on sides
- Border cliffs on edges
- Landmarks (sign, trees, ledges)

#### Route1.isWalkable()
Updated walkable tiles from `[2, 3]` to `[1, 2, 3, 4]`
- Added tile 1 (path)
- Added tile 4 (sign - walkable but interactive)

#### Route1.checkForEncounter()
**CRITICAL CHANGE:** Now takes `(x, y)` parameters and checks tile type
```javascript
checkForEncounter: function(x, y) {
  const tile = this.getTile(x, y);
  // Only encounter in grass tiles (2=tall grass, 3=normal grass)
  if (tile !== 2 && tile !== 3) return false;
  return Math.random() < 0.10; // 10% encounter rate in grass
}
```

#### Collision System
Updated collision generation to include new blocking tiles:
```javascript
if (idx === 0 || idx === 5 || idx === 6 || idx === 7) {
  m.collisions.add(`${x},${y}`);
}
```

### 2. `<repo-root>/js/game.js`

#### Encounter Check (Line 392-398)
Updated encounter trigger to pass player position:
```javascript
// OLD (broken):
if (this.currentMap.getTile(this.player.x, this.player.y) === 2) {
    if (this.currentMap.checkForEncounter && this.currentMap.checkForEncounter() ...

// NEW (correct):
if (this.currentMap.checkForEncounter && this.currentMap.checkForEncounter(this.player.x, this.player.y) ...
```

This ensures encounters ONLY trigger when standing in grass tiles, not on paths.

## Design Philosophy Alignment

### Pokemon Red/Blue Route 1 Features
- ✅ Clear vertical path through center
- ✅ Grass patches on sides (avoidable)
- ✅ Border elements (trees, cliffs)
- ✅ Landmarks for visual guidance (sign, trees)
- ✅ Ledges for one-way travel (future mechanic)
- ✅ Trainer battle area (row 7)
- ✅ Seamless town connection

### Player Experience Improvements
1. **Choice**: Players can now choose to walk on paths to avoid encounters
2. **Risk/Reward**: Grass patches are visible - players decide when to risk encounters
3. **Visual Clarity**: Clear path shows where to go
4. **Exploration**: Landmarks and variety encourage exploration
5. **Pacing**: Players control encounter frequency by path choice

## Missing/Future Tile Types

Based on tileset analysis, these tile types may need creation:
- **Ledge tile (6)**: Should be a small cliff for one-way jumps
- **Tree tile (7)**: Should be a small tree or bush obstacle

**Action Item**: Verify tiles 6 and 7 exist in route-grass.png at expected visual appearance. If not, regenerate tileset with proper ledge and tree tiles.

## Testing Checklist
- [ ] Route 1 loads without errors
- [ ] Player can walk on path tiles (1) without encounters
- [ ] Walking into grass tiles (2, 3) triggers encounters
- [ ] Border tiles (5) are impassable
- [ ] Sign tile (4) is walkable
- [ ] Ledge tiles (6) are impassable
- [ ] Tree tiles (7) are impassable
- [ ] Youngster Joey trainer is positioned correctly at (10, 7)
- [ ] Seamless transition from Piston Town to Route 1
- [ ] Visual appearance matches Pokemon route aesthetic

## Related Files
- `<repo-root>/js/world-maps.js` - Route data
- `<repo-root>/js/game.js` - Encounter logic
- `<repo-root>/assets/tiles/route-grass.png` - Tileset
- `<repo-root>/js/graphics.js` - Rendering

## Next Steps
1. Test in-game to verify visual appearance
2. Verify tile indices 6 and 7 appear correctly
3. Consider adding interactive sign text at (9, 3)
4. Implement ledge one-way jump mechanic (future)
5. Add more trainer NPCs along the route
