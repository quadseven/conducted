// Grand Transit sprite atlas. Procedural pixel art (tiles, characters, battle
// trains) is baked once per distinct look into shared offscreen pages, then
// blitted with nearest-neighbour scaling at whole-pixel positions. Baking
// keeps per-frame cost to one drawImage per sprite, and snapping the blit as
// a single unit stops sprites shimmering or jittering as they move.

const ATLAS_PAGE_SIZE = 1024;
const ATLAS_GUTTER = 1;

function createAtlasCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

// Snap alpha to fully opaque or fully clear so a sprite rasterized from
// vector shapes keeps hard pixel edges when it is upscaled.
function quantizeAlpha(ctx, x, y, width, height) {
    const image = ctx.getImageData(x, y, width, height);
    const data = image.data;
    for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= 128 ? 255 : 0;
    ctx.putImageData(image, x, y);
}

class SpriteAtlas {
    constructor({ createCanvas = createAtlasCanvas, pageSize = ATLAS_PAGE_SIZE } = {}) {
        this.createCanvas = createCanvas;
        this.pageSize = pageSize;
        this.pages = [];
        this.frames = new Map();
    }

    get size() { return this.frames.size; }

    // Returns the baked frame for `key`, painting it on first use. `paint`
    // receives the page context and the slot origin to draw at.
    frame(key, width, height, paint, options = {}) {
        let frame = this.frames.get(key);
        if (!frame) {
            frame = this.bake(width, height, paint, options);
            this.frames.set(key, frame);
        }
        return frame;
    }

    bake(width, height, paint, options) {
        const slot = this.allocate(width, height);
        const ctx = slot.page.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, width, height);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        paint(ctx, slot.x, slot.y);
        ctx.restore();
        if (options.crisp) quantizeAlpha(ctx, slot.x, slot.y, width, height);
        return { canvas: slot.page.canvas, x: slot.x, y: slot.y, w: width, h: height };
    }

    // Shelf packing: frames fill a row left to right, a new row starts below
    // the tallest frame so far, and a full page spills onto a fresh one.
    allocate(width, height) {
        const span = this.pageSize - ATLAS_GUTTER;
        if (width > span || height > span) {
            throw new Error(`Sprite ${width}x${height} is larger than an atlas page (${this.pageSize}px)`);
        }
        let page = this.pages[this.pages.length - 1];
        if (page && page.x + width > span) {
            page.x = ATLAS_GUTTER;
            page.y += page.rowHeight + ATLAS_GUTTER;
            page.rowHeight = 0;
        }
        if (!page || page.y + height > span) page = this.addPage();
        const slot = { page, x: page.x, y: page.y };
        page.x += width + ATLAS_GUTTER;
        page.rowHeight = Math.max(page.rowHeight, height);
        return slot;
    }

    addPage() {
        const canvas = this.createCanvas(this.pageSize, this.pageSize);
        const page = { canvas, ctx: canvas.getContext('2d'), x: ATLAS_GUTTER, y: ATLAS_GUTTER, rowHeight: 0 };
        this.pages.push(page);
        return page;
    }

    // Blits a frame at a whole-pixel position, upscaled by an integer factor.
    draw(ctx, key, width, height, paint, dx, dy, options = {}) {
        const frame = this.frame(key, width, height, paint, options);
        const scale = Math.max(1, Math.round(options.scale || 1));
        const smoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frame.canvas, frame.x, frame.y, frame.w, frame.h,
            Math.round(dx), Math.round(dy), frame.w * scale, frame.h * scale);
        ctx.imageSmoothingEnabled = smoothing;
        return frame;
    }
}

const spriteAtlas = new SpriteAtlas();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteAtlas, spriteAtlas, quantizeAlpha };
}
