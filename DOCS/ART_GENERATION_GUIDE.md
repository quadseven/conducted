# Art Generation Guide - Train Battle RPG
> Complete pipeline for generating all pixel art assets using automatic1111 + Stable Diffusion

## 🎨 Overview

This project uses **automatic1111 Stable Diffusion WebUI** with the **pixelArtDiffusionXL_spriteShaper** model to generate all visual assets locally on RTX 3080.

### Asset Categories
- **Characters**: Player, Rival, Professor, NPCs, Trainers
- **Train Sprites**: 151 trains (front/back battle sprites)
- **World Tilesets**: Routes, forests, caves, mountains, water, cities
- **Interior Tilesets**: Labs, gyms, shops, houses, healing depots

---

## 🚀 Quick Start

### Generate Everything (30-60 minutes)
```bash
./gen_all_art.sh
```

### Generate Specific Asset Types
```bash
# Characters
./gen_rival_character.sh          # Rival character (12 variants)
./gen_npc_townspeople.sh          # 6 NPC types (8 variants each)
./gen_trainer_classes.sh          # 6 trainer classes (10 variants each)

# Trains
./gen_starter_train_sprites.sh    # 3 starters × 2 views (10 variants each)

# Tilesets
./gen_world_tilesets.sh           # 7 biome tilesets (6 variants each)
./gen_interior_tilesets.sh        # 6 interior types (6 variants each)
```

---

## 📋 Generation Pipeline Details

### 1. Character Sprites (512×512 → scale to 64×64)

#### Rival Character
- **Script**: `gen_rival_character.sh`
- **Output**: `assets/sprites/characters/rival-*.png`
- **Style**: Spiky hair, confident smirk, red scarf, cocky attitude
- **Variants**: 12 per run

#### NPC Townspeople
- **Script**: `gen_npc_townspeople.sh`
- **Output**: `assets/sprites/npcs/`
- **Types**:
  - Elderly man (walking cane)
  - Shopkeeper woman (apron)
  - Mechanic (wrench)
  - Little girl (pigtails)
  - Teen boy (backpack)
  - Elderly woman (hat)
- **Variants**: 8 per NPC type

#### Trainer Classes
- **Script**: `gen_trainer_classes.sh`
- **Output**: `assets/sprites/trainers/`
- **Types**:
  - Youngster (bug catcher style)
  - Engineer (biker/mechanic)
  - Conductor (hiker)
  - Passenger (beauty)
  - Railyard Worker (scientist)
  - Signalman (fisherman)
- **Variants**: 10 per trainer class

### 2. Train Battle Sprites (512×512 → scale to 64×64)

#### Starter Trains
- **Script**: `gen_starter_train_sprites.sh`
- **Output**: `assets/sprites/trains/`
- **Trains**:
  - **Steamini**: Steam locomotive (round, cute, smokestack)
  - **Sparkart**: Electric locomotive (yellow/blue, sleek, modern)
  - **Diesling**: Diesel locomotive (red/black, streamlined)
- **Views**: Front + Back for each
- **Variants**: 10 per view

### 3. World Tilesets (768×768 sheets)

#### Tileset Types
- **Script**: `gen_world_tilesets.sh`
- **Output**: `assets/tiles/generated/`
- **Biomes**:
  - Route (grass paths, dirt roads, trees, flowers)
  - Forest (dense vegetation, dark green)
  - Cave (rocky walls, stalagmites, gray/brown)
  - Mountain (cliffs, snow, rocky terrain)
  - Water Route (ocean, waves, shore, beach)
  - City (buildings, houses, roofs, doors)
  - Railyard (tracks, metal, gears, industrial)
- **Size**: 768×768 (48×48 tiles at 16×16 each)
- **Variants**: 6 per biome

### 4. Interior Tilesets (768×768 sheets)

#### Interior Types
- **Script**: `gen_interior_tilesets.sh`
- **Output**: `assets/tiles/interiors-generated/`
- **Locations**:
  - Laboratory (science equipment, tables, computers)
  - Gym (battle arena, floor patterns)
  - Mart/Shop (counter, shelves, items)
  - House (furniture, bed, table, chairs)
  - Healing Depot (counter, beds, nurse station)
  - Museum (display cases, exhibits)
- **Size**: 768×768
- **Variants**: 6 per interior type

---

## 🛠️ Technical Setup

### Model Configuration
- **Checkpoint**: `pixelArtDiffusionXL_spriteShaper.safetensors`
- **LoRAs**:
  - `fesba:0.8-0.9` (pixel art style)
  - `chibi:0.7` (character sprites only)
  - `| |:0.5` (character sprites only)

### Generation Parameters
```json
{
  "steps": 25-30,
  "cfg_scale": 7.0-7.5,
  "sampler": "Euler a",
  "width": 512 (characters) / 768 (tilesets),
  "height": 512 (characters) / 768 (tilesets)
}
```

### API Endpoint
```
http://<your-a1111-host>:7860/sdapi/v1/txt2img
```

---

## 📦 Post-Generation Workflow

### 1. Review & Select
- Each script generates multiple variants (6-12 per asset)
- Manually review all outputs
- Pick the best variant for each asset type

### 2. Rename & Organize
```bash
# Example: Pick best rival sprite
cp assets/sprites/characters/rival-5.png assets/sprites/characters/rival.png

# Example: Pick best Steamini front sprite
cp assets/sprites/trains/steamini-front-3.png assets/sprites/trains/steamini-front.png
```

### 3. Scale Character Sprites (if needed)
```bash
# Use ImageMagick to scale from 512×512 to 64×64
convert input.png -scale 64x64 output.png
```

### 4. Slice Tilesets
- Use Tiled Map Editor or custom tool to slice 768×768 sheets into 16×16 tiles
- Export as individual tiles or keep as sheet with tile index mapping

### 5. Integrate into Game
- Update `js/world-maps.js` with new tileset paths
- Update `js/battle.js` with train sprite paths
- Update NPC/character data with sprite references

---

## 🎯 Asset Checklist

### Characters
- [ ] Rival character
- [ ] Player character (already generated)
- [ ] Professor Cypress (already generated)
- [ ] Elderly man NPC
- [ ] Shopkeeper woman NPC
- [ ] Mechanic NPC
- [ ] Little girl NPC
- [ ] Teen boy NPC
- [ ] Elderly woman NPC
- [ ] Youngster trainer
- [ ] Engineer trainer
- [ ] Conductor trainer
- [ ] Passenger trainer
- [ ] Railyard worker trainer
- [ ] Signalman trainer

### Train Sprites
- [ ] Steamini (front)
- [ ] Steamini (back)
- [ ] Sparkart (front)
- [ ] Sparkart (back)
- [ ] Diesling (front)
- [ ] Diesling (back)

### World Tilesets
- [ ] Route/Grass tileset
- [ ] Forest tileset
- [ ] Cave tileset
- [ ] Mountain tileset
- [ ] Water route tileset
- [ ] City tileset
- [ ] Railyard tileset

### Interior Tilesets
- [ ] Laboratory tileset
- [ ] Gym tileset
- [ ] Mart/Shop tileset
- [ ] House tileset
- [ ] Healing Depot tileset
- [ ] Museum tileset

---

## 🔧 Troubleshooting

### "Connection refused" error
- Check automatic1111 is running: `http://<your-a1111-host>:7860`
- Verify API is enabled in WebUI settings

### "No images generated"
- Check model is loaded correctly
- Verify LoRAs are installed
- Review negative prompts (might be too restrictive)

### Poor quality results
- Increase steps (25 → 35)
- Adjust CFG scale (7 → 8)
- Try different seeds
- Refine prompts

### Tilesets don't tile seamlessly
- This is expected - manual editing required
- Use Aseprite or Photoshop to fix seams
- Or generate larger sheets and cherry-pick good tiles

---

## 📚 Resources

- [automatic1111 Documentation](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
- [PixelArt Diffusion XL](https://civitai.com/models/120096/pixel-art-diffusion-xl)
- [Tiled Map Editor](https://www.mapeditor.org/)
- [Aseprite](https://www.aseprite.org/) (pixel art editing)

---

## 🚀 Next Steps After Generation

1. **Run the full pipeline**: `./gen_all_art.sh`
2. **Review outputs in**:
   - `assets/sprites/characters/`
   - `assets/sprites/npcs/`
   - `assets/sprites/trainers/`
   - `assets/sprites/trains/`
   - `assets/tiles/generated/`
   - `assets/tiles/interiors-generated/`
3. **Select best variants** and rename to canonical names
4. **Create GitHub issue** for art integration
5. **Update game code** to reference new assets
6. **Test in-game** appearance and performance
7. **Commit assets** with proper versioning

---

Generated: 2025-11-02
