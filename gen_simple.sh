#!/bin/bash
cd "$(dirname "$0")"

# ULTRA SIMPLE - just like the corgi probably was
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "pixel art cute steam locomotive train",
    "negative_prompt": "",
    "width": 512,
    "height": 512,
    "steps": 30,
    "cfg_scale": 7,
    "sampler_name": "Euler a",
    "batch_size": 1,
    "n_iter": 5,
    "seed": -1,
    "override_settings": {
      "sd_model_checkpoint": "pixel-art-xl-v1.1.safetensors"
    }
  }' > /tmp/simple_response.json

# Extract all 5 images
for i in 0 1 2 3 4; do
  cat /tmp/simple_response.json | jq -r ".images[$i]" | base64 -d > "assets/out/simple-train-$i.png"
done

echo "✅ Generated 5 SIMPLE variations"
ls -lh assets/out/simple-train-*.png
