#!/bin/bash
# Regenerate Trainers WITHOUT CHIBI - Passenger-like proportions
# Skip passengers (already perfect)

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/sprites/trainers"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Regenerating Trainers WITHOUT CHIBI..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo "Using passenger proportions as reference!"
echo ""

# Trainer types (skip passenger)
declare -a TRAINER_TYPES=(
    "young bug catcher boy with net and cap shorts:youngster-v2"
    "cool biker engineer leather jacket bandana motorcycle:engineer-v2"
    "hiker conductor backpack hiking boots uniform:conductor-v2"
    "signalman fisherman waders fishing rod railroad uniform:signalman-v2"
)

for trainer_desc in "${TRAINER_TYPES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$trainer_desc"

    echo "📍 Generating: $FILENAME"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"pixel art character sprite, $PROMPT, 3-4 heads tall proportions, full body, standing pose, <lora:fesba:0.9>\",
        \"negative_prompt\": \"text, watermark, blurry, deformed, realistic, 3d render, chibi, big head, oversized head, 2 heads tall, cartoon proportions, train tracks, scenery, background, landscape, train vehicle\",
        \"width\": 512,
        \"height\": 512,
        \"steps\": 30,
        \"cfg_scale\": 7.5,
        \"sampler_name\": \"Euler a\",
        \"batch_size\": 1,
        \"n_iter\": 12,
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

echo "🎉 All trainers regenerated without chibi!"
