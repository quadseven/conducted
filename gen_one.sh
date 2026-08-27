#!/bin/bash
cd "$(dirname "$0")"
curl -s -X POST "${A1111_URL:?Set A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example}/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d @assets/prompts/queue/steamini-v4.json > /tmp/response.json

cat /tmp/response.json | jq -r '.images[0]' | base64 -d > assets/out/steamini-v4_001.png
echo "✅ Generated steamini-v4_001.png"
ls -lh assets/out/steamini-v4_001.png
