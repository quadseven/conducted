#!/bin/bash
cd "$(dirname "$0")"

echo "🚂 GENERATING TRAIN CHARACTERS (NO TRACKS!)"
echo "Style: Cute chibi characters, centered, like cat+train"
echo ""

# Steamini - cute steam train CHARACTER
echo "🎨 Steamini (steam train character)..."
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "cute chibi steam train character, centered sprite, <lora:fesba:0.8>, <lora:chibi:0.7>, <lora:| |:0.5>",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline, train tracks, scenery, background, landscape, grass, sky, rails, multiple objects",
    "width": 512,
    "height": 512,
    "steps": 25,
    "cfg_scale": 7,
    "sampler_name": "Euler a",
    "batch_size": 1,
    "n_iter": 12,
    "seed": -1,
    "override_settings": {
      "sd_model_checkpoint": "pixelArtDiffusionXL_spriteShaper.safetensors"
    }
  }' > /tmp/steamini_char.json

for i in 0 1 2 3 4 5 6 7 8 9 10 11; do
  cat /tmp/steamini_char.json | jq -r ".images[$i]" | base64 -d > "assets/out/steamini-char-$i.png"
done
echo "✅ Steamini characters (12)"

# Sparkart - cute electric train CHARACTER
echo "🎨 Sparkart (electric train character)..."
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "cute chibi electric train character, centered sprite, <lora:fesba:0.8>, <lora:chibi:0.7>, <lora:| |:0.5>",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline, train tracks, scenery, background, landscape, grass, sky, rails, multiple objects",
    "width": 512,
    "height": 512,
    "steps": 25,
    "cfg_scale": 7,
    "sampler_name": "Euler a",
    "batch_size": 1,
    "n_iter": 12,
    "seed": -1,
    "override_settings": {
      "sd_model_checkpoint": "pixelArtDiffusionXL_spriteShaper.safetensors"
    }
  }' > /tmp/sparkart_char.json

for i in 0 1 2 3 4 5 6 7 8 9 10 11; do
  cat /tmp/sparkart_char.json | jq -r ".images[$i]" | base64 -d > "assets/out/sparkart-char-$i.png"
done
echo "✅ Sparkart characters (12)"

# Diesling - cute diesel train CHARACTER
echo "🎨 Diesling (diesel train character)..."
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "cute chibi diesel locomotive character, centered sprite, <lora:fesba:0.8>, <lora:chibi:0.7>, <lora:| |:0.5>",
    "negative_prompt": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline, train tracks, scenery, background, landscape, grass, sky, rails, multiple objects",
    "width": 512,
    "height": 512,
    "steps": 25,
    "cfg_scale": 7,
    "sampler_name": "Euler a",
    "batch_size": 1,
    "n_iter": 12,
    "seed": -1,
    "override_settings": {
      "sd_model_checkpoint": "pixelArtDiffusionXL_spriteShaper.safetensors"
    }
  }' > /tmp/diesling_char.json

for i in 0 1 2 3 4 5 6 7 8 9 10 11; do
  cat /tmp/diesling_char.json | jq -r ".images[$i]" | base64 -d > "assets/out/diesling-char-$i.png"
done
echo "✅ Diesling characters (12)"

echo ""
echo "🎉 36 TRAIN CHARACTERS GENERATED!"
echo "Style: Chibi characters, NO tracks/scenery"
ls -lh assets/out/*-char-*.png | tail -10
