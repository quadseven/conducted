# Simple Art Workflow (NO WATCHER NEEDED!)

## TL;DR - Manual Process

You don't need a watcher script! Here's the simple manual workflow:

### Step 1: Open AUTOMATIC1111 Web UI
1. Open your browser to: **http://<your-a1111-host>:7860**
2. Go to the **txt2img** tab

### Step 2: For Each Prompt File
Go through each JSON file in `assets/prompts/queue/` one at a time:

#### Example: `piston-town-tiles.json`
1. Open the file and copy the values
2. In A1111 web UI:
   - **Prompt box**: Paste the `"prompt"` value
   - **Negative prompt box**: Paste the `"negative_prompt"` value
   - **Width**: 512
   - **Height**: 512
   - **Sampling steps**: 36
   - **CFG Scale**: 7.5
   - **Sampler**: DPM++ 2M Karras
   - **Batch count**: 3 (so you get 3 images to choose from)
3. Click **Generate**
4. Wait for images to render
5. Right-click the best image → **Save image as...**
6. Save to: `assets/out/piston-town-tiles_001.png`

### Step 3: Repeat for All 9 Prompts

**Tilesets:**
- `piston-town-tiles.json` → save best as `assets/out/piston-town-tiles_001.png`
- `route1-grass-tiles.json` → save best as `assets/out/route1-grass-tiles_001.png`
- `lab-interior-tiles.json` → save best as `assets/out/lab-interior-tiles_001.png`

**Train Sprites:**
- `steamini-front.json` → `assets/out/steamini-front_001.png`
- `steamini-back.json` → `assets/out/steamini-back_001.png`
- `sparkart-front.json` → `assets/out/sparkart-front_001.png`
- `sparkart-back.json` → `assets/out/sparkart-back_001.png`
- `diesling-front.json` → `assets/out/diesling-front_001.png`
- `diesling-back.json` → `assets/out/diesling-back_001.png`

### Step 4: Tell Claude

Once you've saved all 9 PNG files to `assets/out/`, just say:
> "Art renders are done"

I'll then:
1. Check `assets/out/` for the PNGs
2. Promote them to final locations (`assets/tiles/`, `assets/sprites/`)
3. Wire them up in the code (`js/world-maps.js`, `js/battle.js`)
4. Commit everything

---

## Optional: Python Script (If You Want Automation)

If you want to automate this later, here's what you'd need:

### Install Python Script on Remote Machine

**File: `art_watcher.py`** (put this on the machine with A1111)

```python
#!/usr/bin/env python3
import os
import json
import time
import requests
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

A1111_URL = "http://localhost:7860"
QUEUE_DIR = Path("assets/prompts/queue")
OUTPUT_DIR = Path("assets/out")

class PromptHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith('.json'):
            print(f"New prompt detected: {event.src_path}")
            self.process_prompt(event.src_path)

    def process_prompt(self, filepath):
        with open(filepath, 'r') as f:
            spec = json.load(f)

        payload = {
            "prompt": spec["prompt"],
            "negative_prompt": spec["negative_prompt"],
            "width": spec["width"],
            "height": spec["height"],
            "steps": spec["steps"],
            "cfg_scale": spec["cfg_scale"],
            "sampler_name": spec["sampler_name"],
            "batch_size": spec["batch_size"],
            "n_iter": spec["n_iter"],
            "seed": spec["seed"]
        }

        print(f"Rendering {spec['name']}...")
        response = requests.post(f"{A1111_URL}/sdapi/v1/txt2img", json=payload)

        if response.status_code == 200:
            images = response.json()["images"]
            for i, img_data in enumerate(images):
                import base64
                img_bytes = base64.b64decode(img_data)
                out_path = OUTPUT_DIR / f"{spec['name']}_{i+1:03d}.png"
                with open(out_path, 'wb') as f:
                    f.write(img_bytes)
                print(f"✅ Saved: {out_path}")
        else:
            print(f"❌ Error: {response.status_code}")

if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    event_handler = PromptHandler()
    observer = Observer()
    observer.schedule(event_handler, str(QUEUE_DIR), recursive=False)
    observer.start()
    print(f"👀 Watching {QUEUE_DIR} for new prompts...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
```

**Install dependencies:**
```bash
pip install watchdog requests
```

**Run it:**
```bash
python3 art_watcher.py
```

---

## Summary

**For now: MANUAL is easiest!**
1. Open A1111 web UI
2. Copy/paste prompts from JSON files
3. Generate images
4. Save best ones to `assets/out/`
5. Tell me when done

**Later: Automation** (optional, if you want hands-free)
