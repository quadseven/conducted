#!/bin/bash
# Generate PISTON TOWN specific tilesets
# Focus on fleshing out the starter town

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/tiles/piston-town"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating Piston Town Tilesets..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo ""

# Piston Town specific tilesets
declare -a TILESET_TYPES=(
    "pixel art tileset starter town houses roofs chimneys doors windows:town-buildings"
    "pixel art tileset train depot platform tracks maintenance yard:depot"
    "pixel art tileset laboratory research building modern clean:lab-building"
    "pixel art tileset small town paths cobblestone dirt roads:town-paths"
    "pixel art tileset town decorations flowers benches signs lamp posts:town-decor"
    "pixel art tileset piston town square fountain center plaza:town-square"
)

for tileset_desc in "${TILESET_TYPES[@]}"; do
    IFS=':' read -r PROMPT FILENAME <<< "$tileset_desc"

    echo "📍 Generating: $FILENAME tileset"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"prompt\": \"$PROMPT, 16x16 tiles, top-down view, game boy color palette, seamless, pokemon style, <lora:fesba:0.8>\",
        \"negative_prompt\": \"text, watermark, blurry, realistic, 3d render, characters, people, animals, trains, perspective, isometric, diagonal\",
        \"width\": 768,
        \"height\": 768,
        \"steps\": 32,
        \"cfg_scale\": 7.5,
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
    print(f'  🎉 Generated {len(data[\"images\"])} variants for $FILENAME')
else:
    print('  ❌ Error: No images generated')
"

    echo ""
    sleep 3
done

echo "🎉 All Piston Town tilesets generated!"
echo "📂 Check $OUTPUT_DIR/"
