# Art Generation Queue Status

## Prompts Submitted (2025-11-01)

### Tilesets (16×16)
- [x] **piston-town-tiles.json** - Town buildings, paths, rails, trees
- [x] **route1-grass-tiles.json** - Wild grass, flowers, cliffs, route signs  
- [x] **lab-interior-tiles.json** - Lab interior, furniture, equipment

### Train Battle Sprites (64×64)

#### Steamini (ID: 1, Starter #1)
- [x] **steamini-front.json** - Copper steam locomotive, front view
- [x] **steamini-back.json** - Copper steam locomotive, back view (player's train)

#### Sparkart (ID: 4, Starter #2)  
- [x] **sparkart-front.json** - Silver electric train, lightning effects
- [x] **sparkart-back.json** - Silver electric train, back view

#### Diesling (ID: 7, Starter #3)
- [x] **diesling-front.json** - Brown diesel locomotive, sturdy design
- [x] **diesling-back.json** - Brown diesel locomotive, back view

## Expected Outputs

Remote watcher at **http://<your-a1111-host>:7860** should render to:
```
assets/out/piston-town-tiles_*.png
assets/out/route1-grass-tiles_*.png
assets/out/lab-interior-tiles_*.png
assets/out/steamini-front_*.png
assets/out/steamini-back_*.png
assets/out/sparkart-front_*.png
assets/out/sparkart-back_*.png
assets/out/diesling-front_*.png
assets/out/diesling-back_*.png
```

## Next Pass - Consume & Install

Once renders complete:
1. Curate best PNG from each set (newest mtime or highest index)
2. Promote to final locations:
   - Tilesets → `assets/tiles/piston-town.png`, `assets/tiles/route-grass.png`, `assets/tiles/interiors-lab.png`
   - Sprites → `assets/sprites/Steamini/front.png`, `assets/sprites/Steamini/back.png`, etc.
3. Update `js/world-maps.js` tileset paths
4. Update `js/battle.js` sprite paths
5. Commit asset wiring + PNG files

## Status
⏳ Waiting for remote renders...
