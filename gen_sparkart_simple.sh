#!/bin/bash
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute electric train, (flat shading:1.2), (minimalist:1.4)",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline, bullet train, modern",
    "width": 512,
    "height": 512,
    "steps": 20,
    "cfg_scale": 8,
    "sampler_name": "Euler a",
    "batch_size": 1,
    "n_iter": 5,
    "seed": -1,
    "override_settings": {
      "sd_model_checkpoint": "pixel-art-xl-v1.1.safetensors"
    }
  }' > /tmp/sparkart_simple.json

for i in 0 1 2 3 4; do
  cat /tmp/sparkart_simple.json | jq -r ".images[$i]" | base64 -d > "assets/out/sparkart-simple-$i.png"
done
echo "✅ Done!"
