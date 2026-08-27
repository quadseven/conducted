#!/bin/bash
# Generate Starter Train Battle Sprites (Front & Back)
# Based on prompts from DOCS/ART_PROMPTS.md

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/sprites/trains"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating Starter Train Battle Sprites..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo ""

# Starter trains with front/back views
declare -a TRAIN_SPRITES=(
    "pixel art cute small steam locomotive round boiler smokestack wheels front view game boy color palette 64x64 white background:steamini-front"
    "pixel art cute small steam locomotive coal tender rear view game boy color palette 64x64 white background:steamini-back"
    "pixel art electric locomotive yellow blue sleek modern front view game boy color palette 64x64 white background:sparkart-front"
    "pixel art electric locomotive pantograph power cables rear view game boy color palette 64x64 white background:sparkart-back"
    "pixel art diesel locomotive red black streamlined aerodynamic front view game boy color palette 64x64 white background:diesling-front"
    "pixel art diesel locomotive exhaust pipes vents rear view game boy color palette 64x64 white background:diesling-back"
)

for sprite_desc in "${TRAIN_SPRITES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$sprite_desc"

    echo "📍 Generating: $FILENAME"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"$PROMPT, simple clean centered sprite, <lora:fesba:0.9>\",
        \"negative_prompt\": \"text, watermark, blurry, photo, realistic, complex, detailed, multiple trains, scenery, tracks, background elements, people, characters, shading complexity\",
        \"width\": 512,
        \"height\": 512,
        \"steps\": 28,
        \"cfg_scale\": 7.5,
        \"sampler_name\": \"Euler a\",
        \"batch_size\": 1,
        \"n_iter\": 10,
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
    print(f'  🎉 Generated {len(data[\"images\"])} sprites for $FILENAME')
else:
    print('  ❌ Error: No images generated')
"

    echo ""
    sleep 2
done

echo "🎉 All Starter Train sprites generated!"
echo "📂 Check $OUTPUT_DIR/ for battle sprites"
echo "🔍 Pick the best sprites and name them properly (e.g., steamini-front.png)"
