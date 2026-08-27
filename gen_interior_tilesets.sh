#!/bin/bash
# Generate Interior Tileset sheets
# Style: 16x16 pixel art tiles for building interiors

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/tiles/interiors-generated"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating Interior Tileset sheets..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo ""

# Interior types
declare -a INTERIOR_TYPES=(
    "laboratory science equipment tables computers pokemon professor lab style game boy color:lab"
    "gym battle arena floor walls pokeball decorations game boy color:gym"
    "shop counter shelves items mart store pokemon center style game boy color:mart"
    "house home furniture bed table chairs cozy pokemon style game boy color:house"
    "healing center counter beds nurse station pokemon center style game boy color:healing-depot"
    "museum display cases exhibits artifacts pokemon style game boy color:museum"
)

for interior_desc in "${INTERIOR_TYPES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$interior_desc"

    echo "📍 Generating: $FILENAME interior tileset"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"pixel art tileset grid, 16x16 tiles, $PROMPT, top-down view, interior floor tiles, no characters, <lora:fesba:0.8>\",
        \"negative_prompt\": \"text, watermark, blurry, deformed, realistic, 3d render, outline, characters, people, animals, trains, perspective, isometric, diagonal, outdoor, sky, grass\",
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

echo "🎉 All Interior Tileset sheets generated!"
echo "📂 Check $OUTPUT_DIR/ for interior tilesets"
echo "🔍 Review and manually slice into 16x16 tiles as needed"
