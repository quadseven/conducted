#!/bin/bash
# Generate World Tileset sheets
# Style: 16x16 pixel art tiles for overworld maps

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/tiles/generated"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating World Tileset sheets..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo ""

# Tileset types for different biomes/areas
declare -a TILESET_TYPES=(
    "grass route path dirt road trees flowers pokemon style game boy color:route-grass"
    "forest trees dense vegetation dark green pokemon style game boy color:forest"
    "cave rocky walls stalagmites stones gray brown pokemon style game boy color:cave"
    "mountain rocky terrain cliffs snow peaks pokemon style game boy color:mountain"
    "water ocean waves shore beach sand pokemon style game boy color:water-route"
    "city buildings houses roofs doors windows pokemon style game boy color:city"
    "industrial railway tracks metal gears steam punk pokemon style game boy color:railyard"
)

for tileset_desc in "${TILESET_TYPES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$tileset_desc"

    echo "📍 Generating: $FILENAME tileset"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"pixel art tileset grid, 16x16 tiles, $PROMPT, top-down view, seamless, no characters, <lora:fesba:0.8>\",
        \"negative_prompt\": \"text, watermark, blurry, deformed, realistic, 3d render, outline, characters, people, animals, trains, perspective, isometric, diagonal\",
        \"width\": 768,
        \"height\": 768,
        \"steps\": 30,
        \"cfg_scale\": 7.5,
        \"sampler_name\": \"Euler a\",
        \"batch_size\": 1,
        \"n_iter\": 6,
        \"seed\": -1,
        \"override_settings\": {
          \"sd_model_checkpoint\": \"pixelArtDiffusionXL_spriteShaper.safetensors\"
        }
      }" | \
    python3 -c "
import sys, json, base64, os

data = json.load(sys.stdin)
if 'images' in data:
    for i, img_data in enumerate(data['images']):
        filename = f'$OUTPUT_DIR/$FILENAME-{i+1}.png'
        with open(filename, 'wb') as f:
            f.write(base64.b64decode(img_data))
        print(f'  ✅ Saved: {filename}')
    print(f'  🎉 Generated {len(data[\"images\"])} tileset variants for $FILENAME')
else:
    print('  ❌ Error: No images generated')
"

    echo ""
    sleep 3
done

echo "🎉 All World Tileset sheets generated!"
echo "📂 Check $OUTPUT_DIR/ for tilesets"
echo "🔍 Review and manually slice into 16x16 tiles as needed"
