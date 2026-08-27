#!/bin/bash
# Generate NPC Townspeople sprites
# Style: Chibi pixel art various town residents

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/sprites/npcs"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating NPC Townspeople sprites..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo ""

# NPC Types to generate
declare -a NPC_TYPES=(
    "old man with walking cane:elderly-man"
    "young woman shopkeeper with apron:shopkeeper-woman"
    "middle-aged man mechanic with wrench:mechanic"
    "little girl with pigtails:little-girl"
    "teenage boy with backpack:teen-boy"
    "elderly woman with hat:elderly-woman"
)

for npc_desc in "${NPC_TYPES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$npc_desc"

    echo "📍 Generating: $FILENAME ($PROMPT)"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"cute chibi $PROMPT character, friendly expression, centered sprite, <lora:fesba:0.8>, <lora:chibi:0.7>, <lora:| |:0.5>\",
        \"negative_prompt\": \"text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline, train tracks, scenery, background, landscape, grass, sky, rails, multiple objects, train vehicle, locomotive, multiple characters\",
        \"width\": 512,
        \"height\": 512,
        \"steps\": 25,
        \"cfg_scale\": 7,
        \"sampler_name\": \"Euler a\",
        \"batch_size\": 1,
        \"n_iter\": 8,
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

echo "🎉 All NPC townspeople sprites generated!"
echo "📂 Check $OUTPUT_DIR/ for all NPCs"
