#!/bin/bash
cd "$(dirname "$0")"
for i in 1 2 3; do
  echo "🎨 Generating variation $i..."
  curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "pixel art in the exact style of a cute corgi illustration, simple cute baby steam train locomotive character, centered, front view, clean thick black outlines, solid flat colors, orange and black colors, smooth pixel edges, minimalist design, single object, plain pastel background, professional pixel art, game character sprite",
      "negative_prompt": "messy pixels, noisy, complex, realistic, 3d, photograph, multiple trains, side view, detailed background, gradient, blurry, rough edges",
      "width": 512,
      "height": 512,
      "steps": 40,
      "cfg_scale": 9,
      "sampler_name": "DPM++ 2M Karras",
      "batch_size": 1,
      "n_iter": 1,
      "seed": -1,
      "override_settings": {
        "sd_model_checkpoint": "pixel-art-xl-v1.1.safetensors"
      }
    }' > /tmp/resp_$i.json

  cat /tmp/resp_$i.json | jq -r '.images[0]' | base64 -d > "assets/out/steamini-corgi-v$i.png"
  echo "   ✅ Saved variation $i"
done
echo "✅ Done! Generated 3 variations"
ls -lh assets/out/steamini-corgi-*.png
