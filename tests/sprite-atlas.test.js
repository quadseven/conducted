// Sprite atlas rendering pipeline (#154): overworld tiles, characters and
// battle trains are baked once into shared atlas pages, then blitted at whole
// pixel positions with integer scaling so nothing jitters or blurs.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Recording 2D context: every call lands in `ops` so a test can compare what
// two paint passes produced, or inspect where a blit landed.
function recordingContext(canvas) {
    const ops = [];
    const ctx = {
        canvas, ops, imageSmoothingEnabled: true,
        fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: 'left',
        textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', shadowColor: '', shadowBlur: 0, globalAlpha: 1,
        measureText: text => ({ width: String(text).length * 8 }),
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(100) }),
        putImageData: (image, x, y) => ops.push(['putImageData', Array.from(image.data.slice(0, 8)), x, y])
    };
    const methods = ['save', 'restore', 'translate', 'scale', 'rect', 'clip', 'fillRect', 'strokeRect', 'fillText',
        'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'fill', 'stroke', 'drawImage', 'clearRect'];
    for (const name of methods) {
        ctx[name] = (...args) => ops.push([name, ctx.fillStyle, ctx.strokeStyle, ...args.map(a => (a && a.ops ? 'canvas' : a))]);
    }
    return ctx;
}

function fakeCanvas(width = 300, height = 150) {
    const canvas = { width, height };
    canvas.ctx = recordingContext(canvas);
    canvas.getContext = () => canvas.ctx;
    canvas.ops = canvas.ctx.ops;
    return canvas;
}

const sandbox = {
    console, Math, Date, Object, Array, String, Number, Boolean, Set, Map, JSON, Uint8ClampedArray,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    window: { addEventListener() {}, removeEventListener() {}, innerWidth: 1024, innerHeight: 768 },
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => fakeCanvas() },
    navigator: { userAgent: 'Node' },
    Image: class { constructor() { this.src = ''; } },
    module: { exports: {} }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const file of ['js/constants.js', 'js/utils.js', 'js/types.js', 'js/train-data.js', 'js/trainData.js',
    'js/npcData.js', 'js/maps.js', 'js/story.js', 'js/items.js', 'js/sprite-atlas.js', 'js/moves.js',
    'js/train.js', 'js/battle.js', 'js/map.js', 'js/ui.js', 'js/world-maps.js', 'js/graphics.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox, { filename: file });
}

const SpriteAtlas = vm.runInContext('SpriteAtlas', sandbox);
const spriteAtlas = vm.runInContext('spriteAtlas', sandbox);
const WorldArt = vm.runInContext('WorldArt', sandbox);
const WORLD_MAPS = vm.runInContext('WORLD_MAPS', sandbox);
const Battle = vm.runInContext('Battle', sandbox);
const Train = vm.runInContext('Train', sandbox);
const UI = vm.runInContext('UI', sandbox);

const blits = ctx => ctx.ops.filter(op => op[0] === 'drawImage');
const TILE = 48;

function test(name, fn) {
    fn();
    console.log(`ok - ${name}`);
}

test('atlas bakes a frame once and reuses it', () => {
    const atlas = new SpriteAtlas({ createCanvas: (w, h) => fakeCanvas(w, h), pageSize: 64 });
    let paints = 0;
    const paint = (ctx, ox, oy) => { paints++; ctx.fillRect(ox, oy, 4, 4); };
    const screen = fakeCanvas();
    atlas.draw(screen.ctx, 'dot', 4, 4, paint, 10, 10);
    atlas.draw(screen.ctx, 'dot', 4, 4, paint, 20, 10);
    assert.equal(paints, 1, 'second draw reuses the baked frame');
    assert.equal(atlas.size, 1);
    assert.equal(blits(screen.ctx).length, 2);
});

test('atlas packs frames into non-overlapping slots across pages', () => {
    const atlas = new SpriteAtlas({ createCanvas: (w, h) => fakeCanvas(w, h), pageSize: 64 });
    const frames = [];
    for (let i = 0; i < 12; i++) frames.push(atlas.frame(`f${i}`, 20, 20, () => {}));
    for (let a = 0; a < frames.length; a++) {
        const fa = frames[a];
        assert.ok(fa.x + fa.w <= 64 && fa.y + fa.h <= 64, 'frame fits inside its page');
        for (let b = a + 1; b < frames.length; b++) {
            const fb = frames[b];
            const overlap = fa.canvas === fb.canvas && fa.x < fb.x + fb.w && fb.x < fa.x + fa.w &&
                fa.y < fb.y + fb.h && fb.y < fa.y + fa.h;
            assert.ok(!overlap, `frames ${a} and ${b} do not overlap`);
        }
    }
    assert.ok(atlas.pages.length > 1, 'a full page spills onto a new one');
    assert.throws(() => atlas.frame('huge', 65, 8, () => {}), /larger than an atlas page/);
});

test('atlas blits at whole pixels with integer nearest-neighbour scaling', () => {
    const atlas = new SpriteAtlas({ createCanvas: (w, h) => fakeCanvas(w, h) });
    const screen = fakeCanvas();
    atlas.draw(screen.ctx, 'sprite', 10, 8, () => {}, 12.6, 7.4, { scale: 3 });
    const [op] = blits(screen.ctx);
    const [dx, dy, dw, dh] = op.slice(-4);
    assert.deepEqual([dx, dy, dw, dh], [13, 7, 30, 24]);
    assert.equal(screen.ctx.imageSmoothingEnabled, true, 'caller smoothing state is restored');
});

test('crisp frames quantize alpha to fully opaque or fully clear', () => {
    const page = fakeCanvas(64, 64);
    const atlas = new SpriteAtlas({ createCanvas: () => page, pageSize: 64 });
    atlas.frame('crisp', 2, 1, () => {}, { crisp: true });
    const put = page.ops.find(op => op[0] === 'putImageData');
    assert.ok(put, 'crisp frame rewrites its pixels');
    assert.deepEqual(put[1], [100, 100, 100, 0, 100, 100, 100, 0], 'alpha below half becomes clear');
});

test('overworld materials each get distinct atlas art', () => {
    const map = WORLD_MAPS.Route1;
    const keys = new Set([1, 2, 3, 4, 6, 7, 12].map(tile => WorldArt.tileKey(tile, 5, 5, TILE, { map: WORLD_MAPS.City2 })));
    assert.equal(keys.size, 7, 'grass, tall grass, path, water, rail, tree and door are distinct');
    assert.ok(WorldArt.tileKey(0, 5, 5, TILE, { map: WORLD_MAPS.City2 }), 'buildings resolve to a key');
    assert.ok(map, 'Route1 exists');
});

test('every overworld cell sharing an atlas key paints identically', () => {
    for (const [id, map] of Object.entries(WORLD_MAPS)) {
        const seen = new Map();
        for (const clock of [0, 0.3]) {
            for (let y = 0; y < map.height; y++) {
                for (let x = 0; x < map.width; x++) {
                    const tile = map.getTile ? map.getTile(x, y) : map.tiles[y][x];
                    const options = { map, clock };
                    const key = WorldArt.tileKey(tile, x, y, TILE, options);
                    const canvas = fakeCanvas();
                    WorldArt.paintWorldTile(canvas.ctx, tile, 0, 0, TILE, x, y, options);
                    const art = JSON.stringify(canvas.ops);
                    if (seen.has(key)) assert.equal(art, seen.get(key), `${id} (${x},${y}) matches its key ${key}`);
                    else seen.set(key, art);
                }
            }
        }
        assert.ok(seen.size < map.width * map.height * 2, `${id} reuses atlas frames`);
    }
});

test('overworld tiles render through the shared atlas', () => {
    const screen = fakeCanvas();
    const before = spriteAtlas.size;
    WorldArt.drawWorldTile(screen.ctx, 1, 96, 48, TILE, 3, 4, { map: WORLD_MAPS.Route1, clock: 0 });
    assert.equal(blits(screen.ctx).length, 1, 'one blit per tile');
    assert.equal(screen.ops.filter(op => op[0] === 'fillRect').length, 0, 'no per-frame primitive painting');
    assert.ok(spriteAtlas.size >= before);
});

test('characters blit whole-pixel sprites so movement does not jitter', () => {
    const screen = fakeCanvas();
    const npc = { type: 'trainer', direction: 'left' };
    for (const sx of [100.2, 100.5, 100.8]) {
        WorldArt.drawWorldCharacter(screen.ctx, npc, sx, 50.4, TILE, { map: WORLD_MAPS.Route1, clock: 0 });
    }
    const shots = blits(screen.ctx);
    assert.equal(shots.length, 3);
    for (const op of shots) {
        const [dx, dy, dw, dh] = op.slice(-4);
        assert.ok(Number.isInteger(dx) && Number.isInteger(dy), 'blit lands on whole pixels');
        assert.deepEqual([dw, dh], [TILE, TILE]);
    }
    const walking = fakeCanvas();
    WorldArt.drawWorldCharacter(walking.ctx, { type: 'player', isPlayer: true }, 0, 0, TILE, { moving: true, clock: 0.2 });
    const standing = fakeCanvas();
    WorldArt.drawWorldCharacter(standing.ctx, { type: 'player', isPlayer: true }, 0, 0, TILE, { moving: false, clock: 0.2 });
    assert.notDeepEqual(blits(walking.ctx)[0].slice(4, 6), blits(standing.ctx)[0].slice(4, 6), 'walk frame is its own sprite');
});

test('battle trains blit crisp sprites at integer positions and scales', () => {
    const player = new Train(1, 10);
    const enemy = new Train(4, 8);
    const battle = new Battle(null, [player], [enemy], true);
    for (const t of [0.13, 0.71, 1.37]) {
        battle.animationTimer = t;
        const screen = fakeCanvas(768, 672);
        battle.drawEnemyTrain(screen.ctx, 464.37, 114);
        battle.drawPlayerTrain(screen.ctx, 67.81, 282);
        const shots = blits(screen.ctx);
        assert.equal(shots.length, 2, 'one sprite blit per train');
        for (const op of shots) {
            const [sw, sh, dx, dy, dw, dh] = op.slice(-6);
            assert.ok(Number.isInteger(dx) && Number.isInteger(dy), 'train lands on whole pixels');
            assert.ok(Number.isInteger(dw / sw) && dw / sw === dh / sh && dw / sw >= 2, 'integer upscale');
        }
    }
});

test('UI panels draw a pixel frame in the art-direction palette', () => {
    const screen = fakeCanvas();
    UI.drawPanel(screen.ctx, 10.5, 20, 200, 80);
    const rects = screen.ops.filter(op => op[0] === 'fillRect');
    assert.ok(rects.length >= 4, 'frame is built from pixel rects');
    for (const op of rects) assert.ok(op.slice(3).every(Number.isInteger), 'panel rects snap to whole pixels');
    const fills = new Set(rects.map(op => op[1].toUpperCase()));
    assert.ok(fills.has('#2C2416'), 'dark brown border from the spec');
    assert.ok(fills.has('#F8F4E8'), 'parchment fill from the spec');
    assert.equal(screen.ops.filter(op => op[0] === 'strokeRect').length, 0, 'no anti-aliased stroke outline');
});

console.log('All sprite atlas tests passed');
