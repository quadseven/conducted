#!/bin/bash
# Generate Trainer Class sprites (battle opponents)
# Style: Chibi pixel art trainer characters

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/sprites/trainers"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating Trainer Class sprites..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo ""

# Trainer Classes (Pokemon-style archetypes adapted for trains)
declare -a TRAINER_TYPES=(
    "young bug catcher boy with net and cap:youngster"
    "cool biker with leather jacket and bandana:engineer"
    "hiker with backpack and hiking boots:conductor"
    "beauty with fancy dress and hat:passenger"
    "scientist with lab coat and goggles:railyard-worker"
    "fisherman with fishing rod and waders:signalman"
)

for trainer_desc in "${TRAINER_TYPES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$trainer_desc"

    echo "📍 Generating: $FILENAME ($PROMPT)"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"cute chibi $PROMPT character, determined expression, battle stance, centered sprite, <lora:fesba:0.8>, <lora:chibi:0.7>, <lora:| |:0.5>\",
        \"negative_prompt\": \"text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline, train tracks, scenery, background, landscape, grass, sky, rails, multiple objects, train vehicle, locomotive, multiple characters, friendly, smiling\",
        \"width\": 512,
        \"height\": 512,
        \"steps\": 25,
        \"cfg_scale\": 7,
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

echo "🎉 All Trainer Class sprites generated!"
echo "📂 Check $OUTPUT_DIR/ for all trainers"
