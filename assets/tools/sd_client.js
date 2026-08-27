// assets/tools/sd_client.js
// Node 18+ required (global fetch). Simple TXT2IMG client for A1111 API.
import fs from 'node:fs/promises';

const API = process.env.SD_API || process.env.A1111_URL;
if (!API) {
  throw new Error('Set SD_API or A1111_URL to your local Stable Diffusion (A1111) endpoint, e.g. http://127.0.0.1:7860 - see .env.example');
}

function nowStamp() {
  return new Date().toISOString().replaceAll(':', '-').slice(0, 19);
}

async function txt2img({
  prompt,
  negative_prompt = "lowres, blurry, bad anatomy, extra limbs, text, watermark, signature",
  width = 256, height = 256, steps = 28, cfg_scale = 7, sampler_name = "DPM++ 2M Karras",
  batch_size = 1, n_iter = 1, seed = -1, model = null,
}) {
  const body = {
    prompt,
    negative_prompt,
    width, height, steps, cfg_scale, sampler_name,
    batch_size, n_iter, seed,
  };
  if (model) body.override_settings = { sd_model_checkpoint: model };

  const res = await fetch(`${API}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const outDir = process.argv[2] || 'assets/out';
  const promptFile = process.argv[3] || 'assets/prompts/prompt.json';
  const raw = await fs.readFile(promptFile, 'utf8');
  const spec = JSON.parse(raw);

  const result = await txt2img(spec);
  await fs.mkdir(outDir, { recursive: true });

  let i = 0;
  for (const b64 of result.images) {
    const buf = Buffer.from(b64, 'base64');
    const name = `${spec.name || 'gen'}_${nowStamp()}_${i}.png`;
    await fs.writeFile(`${outDir}/${name}`, buf);
    console.log(`Wrote ${outDir}/${name}`);
    i++;
  }
}

main().catch(e => { console.error(e); process.exit(1); });
