#!/bin/bash
cd "$(dirname "$0")"

echo "🚂 Generating with EXACT corgi recipe..."

# Steamini - baby steam locomotive
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute baby steam locomotive train, (flat shading:1.2), (minimalist:1.4)",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline",
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
  }' > /tmp/steamini_exact.json

for i in 0 1 2 3 4; do
  cat /tmp/steamini_exact.json | jq -r ".images[$i]" | base64 -d > "assets/out/steamini-exact-$i.png"
done
echo "✅ Steamini generated (5 variations)"

# Sparkart - electric train
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute electric bullet train, (flat shading:1.2), (minimalist:1.4)",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline",
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
  }' > /tmp/sparkart_exact.json

for i in 0 1 2 3 4; do
  cat /tmp/sparkart_exact.json | jq -r ".images[$i]" | base64 -d > "assets/out/sparkart-exact-$i.png"
done
echo "✅ Sparkart generated (5 variations)"

# Diesling - diesel locomotive
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute diesel locomotive train, (flat shading:1.2), (minimalist:1.4)",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline",
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
  }' > /tmp/diesling_exact.json

for i in 0 1 2 3 4; do
  cat /tmp/diesling_exact.json | jq -r ".images[$i]" | base64 -d > "assets/out/diesling-exact-$i.png"
done
echo "✅ Diesling generated (5 variations)"

echo ""
echo "🎉 ALL TRAINS GENERATED WITH CORGI RECIPE!"
ls -lh assets/out/*-exact-*.png
