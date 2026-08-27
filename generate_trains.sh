#!/bin/bash
# 🚂 CHOO CHOO! GENERATE PIXEL ART TRAINS! 🚂

A1111_URL="${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}"
QUEUE_DIR="assets/prompts/queue"
OUTPUT_DIR="assets/out"

mkdir -p "$OUTPUT_DIR"

echo "🚂🚂🚂 TRAIN GENERATION STATION 🚂🚂🚂"
echo "Using Pixel Art XL Model!"
echo "=========================================="

for prompt_file in "$QUEUE_DIR"/*-xl.json; do
    name=$(basename "$prompt_file" .json)
    echo ""
    echo "🚂 GENERATING: $name"
    echo "----------------------------------------"

    # Build payload with override_settings for model selection
    payload=$(jq -c '{
        prompt: .prompt,
        negative_prompt: .negative_prompt,
        width: .width,
        height: .height,
        steps: .steps,
        cfg_scale: .cfg_scale,
        sampler_name: .sampler_name,
        batch_size: .batch_size,
        n_iter: .n_iter,
        seed: .seed,
        override_settings: .override_settings
    }' "$prompt_file")

    echo "Prompt: $(jq -r '.prompt' "$prompt_file" | cut -c1-60)..."
    echo "Size: $(jq -r '.width' "$prompt_file")x$(jq -r '.height' "$prompt_file"), Steps: $(jq -r '.steps' "$prompt_file"), Variations: $(jq -r '.n_iter' "$prompt_file")"

    # Call API
    response=$(curl -s -X POST "$A1111_URL/sdapi/v1/txt2img" \
        -H "Content-Type: application/json" \
        -d "$payload")

    # Save images
    if echo "$response" | jq -e '.images' > /dev/null 2>&1; then
        image_count=$(echo "$response" | jq -r '.images | length')
        echo "✅ Generated $image_count beautiful trains!"

        for i in $(seq 0 $((image_count - 1))); do
            img_data=$(echo "$response" | jq -r ".images[$i]")
            out_path="$OUTPUT_DIR/${name}_$(printf '%03d' $((i + 1))).png"
            echo "$img_data" | base64 -d > "$out_path"
            echo "   🚂 Saved: $out_path"
        done
    else
        echo "❌ Error generating"
        echo "$response" | head -3
    fi
done

echo ""
echo "=========================================="
echo "🎉 ALL TRAINS GENERATED! CHOO CHOO! 🎉"
echo "Check $OUTPUT_DIR/ for your beautiful sprites!"
echo "=========================================="
