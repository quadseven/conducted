#!/bin/bash
# Generate Professor Cypress - ELDER TRAIN CONDUCTOR (not scientist!)
# NO CHIBI - Normal proportions (3-4 heads tall)

API_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img"
OUTPUT_DIR="assets/sprites/characters"
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating Professor Cypress - Elder Train Conductor..."
echo "Model: pixelArtDiffusionXL_spriteShaper"
echo "NO CHIBI - Normal proportions!"
echo ""

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "pixel art character sprite, elderly train conductor emeritus, white hair, conductor uniform, cap with badge, wise expression, standing pose, 3-4 heads tall proportions, full body, <lora:fesba:0.9>",
    "negative_prompt": "text, watermark, blurry, deformed, realistic, 3d render, chibi, big head, oversized head, 2 heads tall, cartoon proportions, train tracks, scenery, background, landscape, train vehicle, locomotive, lab coat, scientist, goggles",
    "width": 512,
    "height": 512,
    "steps": 30,
    "cfg_scale": 7.5,
    "sampler_name": "Euler a",
    "batch_size": 1,
    "n_iter": 15,
    "seed": -1,
    "override_settings": {
      "sd_model_checkpoint": "pixelArtDiffusionXL_spriteShaper.safetensors"
    }
  }' | \
python3 -c "
import sys, json, base64, os

data = json.load(sys.stdin)
if 'images' in data:
    for i, img_data in enumerate(data['images']):
        filename = f'$OUTPUT_DIR/professor-cypress-v2-{i+1}.png'
        with open(filename, 'wb') as f:
            f.write(base64.b64decode(img_data))
        print(f'✅ Saved: {filename}')
    print(f'\n🎉 Generated {len(data[\"images\"])} Professor Cypress sprites!')
else:
    print('❌ Error: No images generated')
    print(json.dumps(data, indent=2))
"
