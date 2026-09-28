// Runaway Junction: procedural pixel art.
//
// Every pixel on screen is computed here and written into a 32-bit frame
// buffer (one packed RGBA value per pixel). There are no image files. The
// static yard (grass, ballast, sleepers, rails, platforms, trees, roofs) is
// painted once into a background layer; switches, signals, water, trains,
// smoke and text are painted on top every frame.
//
// Runs in the browser and in Node (the tests render frames headlessly).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
    else root.DispatchArt = factory(root.DispatchLogic);
})(typeof self !== 'undefined' ? self : this, function (L) {
    'use strict';

    const T = 16;                 // tile size in pixels
    const { DX, DY, opp, key } = L;

    // ------------------------------------------------------------------
    // Colour

    const rgb = (r, g, b) => ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
    const R = c => c & 255, G = c => (c >>> 8) & 255, B = c => (c >>> 16) & 255;
    function hex(s) { const n = parseInt(s.slice(1), 16); return rgb(n >> 16, (n >> 8) & 255, n & 255); }
    function mix(a, b, t) {
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return rgb(R(a) + (R(b) - R(a)) * t, G(a) + (G(b) - G(a)) * t, B(a) + (B(b) - B(a)) * t);
    }
    // Shadows lean toward a cool violet and highlights toward warm cream,
    // which reads as sunlight rather than plain black-and-white shading.
    const COOL = hex('#1c1733'), WARM = hex('#fff3c4');
    function tone(c, amt) { return amt < 0 ? mix(c, COOL, -amt * 0.85) : mix(c, WARM, amt * 0.8); }
    function ramp(c) { return [tone(c, -0.55), tone(c, -0.3), c, tone(c, 0.25), tone(c, 0.5)]; }

    const P = {
        grass: [hex('#35613a'), hex('#437442'), hex('#548a4a'), hex('#6aa152')],
        tuft: hex('#86b85c'),
        flowers: [hex('#f2d45c'), hex('#f08fb0'), hex('#f4f1e6'), hex('#9fc4f0')],
        gravel: [hex('#5e574f'), hex('#766d62'), hex('#8e8476'), hex('#a39889')],
        sleeper: [hex('#4a3022'), hex('#6a4530'), hex('#83573b')],
        railDark: hex('#39404d'), rail: hex('#8d98a6'), railHi: hex('#e2e8ee'),
        railDim: hex('#6f6a66'), railDimHi: hex('#9a918a'),
        sand: [hex('#b98f4c'), hex('#d0a862'), hex('#e3c27d')],
        concrete: [hex('#9f998b'), hex('#b5ae9f'), hex('#c8c1b1')],
        safety: hex('#e9c94a'),
        roof: [hex('#9c4633'), hex('#b3573e'), hex('#c96d4e')],
        leaf: [hex('#1b3527'), hex('#28503a'), hex('#3a6f40'), hex('#55914a'), hex('#86bd62')],
        water: [hex('#1e4468'), hex('#2a6390'), hex('#3f86b5'), hex('#86c6e2')],
        shore: hex('#c9b27a'),
        ink: hex('#10151c'),
        outline: hex('#141820'),
        cream: hex('#f1e8cc'),
        gold: hex('#f4c95d'),
        red: hex('#e2483a'), redDim: hex('#4d1f1c'),
        green: hex('#5fe08a'), greenDim: hex('#173a26'),
        amber: hex('#f2a93b'),
        white: hex('#ffffff')
    };

    // ------------------------------------------------------------------
    // Noise and dithering

    function hash(x, y, s) {
        let h = (x * 374761393 + y * 668265263 + (s || 0) * 2246822519) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    // Smooth value noise on a coarse lattice, for patches of colour.
    function vnoise(x, y, cell, s) {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        const fx = x / cell - gx, fy = y / cell - gy;
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), d = hash(gx + 1, gy + 1, s);
        return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const dither = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
    // Pick from a palette by a 0..1 value, with ordered dithering between steps.
    function pick(pal, v, x, y) {
        const f = Math.max(0, Math.min(0.999, v)) * (pal.length - 1);
        const i = Math.floor(f);
        return pal[Math.min(pal.length - 1, i + (f - i > dither(x, y) ? 1 : 0))];
    }

    // ------------------------------------------------------------------
    // Surface

    function Surface(w, h) { this.w = w; this.h = h; this.data = new Uint32Array(w * h); }
    Surface.prototype.set = function (x, y, c) {
        x |= 0; y |= 0;
        if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
    };
    Surface.prototype.get = function (x, y) {
        x |= 0; y |= 0;
        return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.data[y * this.w + x] : 0;
    };
    Surface.prototype.darken = function (x, y, amt) {
        const c = this.get(x, y);
        if (c) this.set(x, y, tone(c, -amt));
    };
    Surface.prototype.rect = function (x, y, w, h, c) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    };

    // Dithered translucent disc: the pixel is drawn where alpha beats the
    // Bayer threshold, which gives soft smoke without real blending.
    function disc(s, cx, cy, r, c, alpha) {
        const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
                if (d > r) continue;
                const a = alpha * (1 - (d / r) * 0.5);
                if (a > dither(x, y)) s.set(x, y, c);
            }
        }
    }

    // ------------------------------------------------------------------
    // Pixel font: 3x5 glyphs, drawn at any integer scale.
    const GLYPHS = {
        'A': '.#.#.#####.##.#', 'B': '##.#.###.#.###.', 'C': '.###..#..#...##', 'D': '##.#.##.##.###.',
        'E': '####..##.#..###', 'F': '####..##.#..#..', 'G': '.###..#.##.#.##', 'H': '#.##.#####.##.#',
        'I': '###.#..#..#.###', 'J': '..#..#..##.#.#.', 'K': '#.##.###.#.##.#', 'L': '#..#..#..#..###',
        'M': '#.########.##.#', 'N': '##.#.##.##.##.#', 'O': '.#.#.##.##.#.#.', 'P': '##.#.###.#..#..',
        'Q': '.#.#.##.###..##', 'R': '##.#.###.#.##.#', 'S': '.###...#...###.', 'T': '###.#..#..#..#.',
        'U': '#.##.##.##.####', 'V': '#.##.##.##.#.#.', 'W': '#.##.########.#', 'X': '#.##.#.#.#.##.#',
        'Y': '#.##.#.#..#..#.', 'Z': '###..#.#.#..###', '0': '####.##.##.####', '1': '.#.##..#..#.###',
        '2': '##...#.#.#..###', '3': '##...#.#...###.', '4': '#.##.####..#..#', '5': '####..##...###.',
        '6': '.###..####.####', '7': '###..#.#..#..#.', '8': '####.#####.####', '9': '####.####..###.',
        ':': '....#.....#....', '.': '.............#.', '!': '.#..#..#.....#.', '-': '......###......',
        '+': '....#.###.#....', '/': '..#..#.#.#..#..', '?': '##...#.#.....#.', "'": '.#..#..........',
        ',': '..........#.#..'
    };
    function textWidth(str, scale) { return str.length * 4 * (scale || 1) - (scale || 1); }
    function text(s, str, x, y, c, scale, shadow) {
        scale = scale || 1;
        str = String(str).toUpperCase();
        for (let n = 0; n < str.length; n++) {
            const g = GLYPHS[str[n]];
            if (!g) continue;
            for (let j = 0; j < 5; j++) {
                for (let i = 0; i < 3; i++) {
                    if (g[j * 3 + i] !== '#') continue;
                    const px = x + (n * 4 + i) * scale, py = y + j * scale;
                    if (shadow) s.rect(px + scale, py + scale, scale, scale, shadow);
                    s.rect(px, py, scale, scale, c);
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Track geometry inside one tile. A route joins side a to side b (b = -1
    // for a buffer-stop stub). Returns distance from the centre line and
    // distance along it, in pixels.
    function routeMetric(a, b, fx, fy) {
        if (b < 0 || b === opp(a)) {
            const vertical = a === 0 || a === 2;
            const across = vertical ? Math.abs(fx - 8) : Math.abs(fy - 8);
            const along = vertical ? fy : fx;
            if (b < 0) {
                const fromSide = a === 0 ? fy : a === 2 ? 16 - fy : a === 3 ? fx : 16 - fx;
                if (fromSide > 10) return null;
            }
            return { across, along };
        }
        const kx = 8 + 8 * (DX[a] + DX[b]), ky = 8 + 8 * (DY[a] + DY[b]);
        const r = Math.hypot(fx - kx, fy - ky);
        if (r > 16) return null;
        const ang = Math.atan2(fy - ky, fx - kx);
        return { across: Math.abs(r - 8), along: ang * 8 };
    }

    function tileRoutes(t) {
        const sides = [];
        for (let d = 0; d < 4; d++) if (t.conns & (1 << d)) sides.push(d);
        if (t.kind === 'end') return [{ a: sides[0], b: -1, active: true }];
        if (t.kind === 'crossing') return [{ a: 0, b: 2, active: true }, { a: 1, b: 3, active: true }];
        if (t.kind === 'switch') {
            const legs = L.switchLegs(t);
            return [
                { a: legs.trunk, b: legs.straight, active: !t.sw.diverge },
                { a: legs.trunk, b: legs.branch, active: t.sw.diverge }
            ];
        }
        return [{ a: sides[0], b: sides[1], active: true }];
    }

    // Paint one track tile (ground already painted underneath).
    function paintTrack(s, t) {
        const ox = t.x * T, oy = t.y * T;
        const routes = tileRoutes(t);
        // inactive routes first, so the live road through a switch sits on top
        routes.sort((p, q) => (p.active ? 1 : 0) - (q.active ? 1 : 0));
        for (let pass = 0; pass < 3; pass++) {
            for (const rt of routes) {
                for (let py = 0; py < T; py++) {
                    for (let px = 0; px < T; px++) {
                        const m = routeMetric(rt.a, rt.b, px + 0.5, py + 0.5);
                        if (!m) continue;
                        const X = ox + px, Y = oy + py;
                        const n = hash(X, Y, 7);
                        if (pass === 0) {
                            if (m.across < 6 + n * 1.3) {
                                s.set(X, Y, t.drag && m.across < 3.2 ? pick(P.sand, 0.3 + n * 0.6, X, Y) : pick(P.gravel, 0.25 + n * 0.7 - m.across * 0.05, X, Y));
                            } else if (m.across < 7.6) s.darken(X, Y, 0.18);
                        } else if (pass === 1 && !t.drag) {
                            const ph = ((m.along % 4) + 4) % 4;
                            if (m.across < 5.4 && ph > 0.6 && ph < 2.6) {
                                const edge = ph < 1.2 ? 2 : ph > 2.1 ? 0 : 1;
                                s.set(X, Y, rt.active ? P.sleeper[edge] : tone(P.sleeper[edge], -0.15));
                            }
                        } else if (pass === 2) {
                            const d = m.across;
                            if (d >= 2.4 && d < 4.1) {
                                const inner = d < 3.1;
                                const outer = d > 3.7;
                                let c = rt.active ? (inner ? P.railHi : outer ? P.railDark : P.rail) : (inner ? P.railDimHi : outer ? P.railDark : P.railDim);
                                s.set(X, Y, c);
                            }
                        }
                    }
                }
            }
        }
        if (t.kind === 'end') paintBuffer(s, t, routes[0].a);
    }

    function paintBuffer(s, t, side) {
        const cx = t.x * T + 8, cy = t.y * T + 8;
        const vertical = side === 0 || side === 2;
        for (let i = -5; i <= 5; i++) {
            for (let k = -1; k <= 1; k++) {
                const x = vertical ? cx + i : cx + k, y = vertical ? cy + k : cy + i;
                const stripe = ((i + 6) >> 1) & 1;
                s.set(x, y, k === 1 ? P.outline : stripe ? P.red : P.cream);
            }
        }
    }

    // ------------------------------------------------------------------
    // Scenery

    function paintGrass(s, x0, y0, w, h) {
        for (let y = y0; y < y0 + h; y++) {
            for (let x = x0; x < x0 + w; x++) {
                const v = vnoise(x, y, 11, 1) * 0.65 + vnoise(x, y, 4, 2) * 0.35;
                let c = pick(P.grass, v * 1.1 - 0.05, x, y);
                const n = hash(x, y, 3);
                if (n > 0.965) c = P.tuft;
                else if (n > 0.93 && hash(x, y - 1, 3) < 0.5) c = tone(c, 0.12);
                if (n < 0.004) c = P.flowers[Math.floor(hash(x, y, 9) * 4)];
                s.set(x, y, c);
            }
        }
    }

    function paintShadowBlob(s, cx, cy, rx, ry, amt) {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
            for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
                const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
                if (d <= 1 && (1 - d) * 1.6 > dither(x, y) * 0.9) s.darken(x, y, amt);
            }
        }
    }

    // A round canopy built from a few overlapping blobs, lit from the top left.
    function paintTree(s, cx, cy, size, seed) {
        const blobs = [{ x: cx, y: cy, r: size }];
        const k = 2 + Math.floor(hash(seed, 1, 11) * 3);
        for (let i = 0; i < k; i++) {
            const a = hash(seed, i, 12) * Math.PI * 2;
            blobs.push({ x: cx + Math.cos(a) * size * 0.55, y: cy + Math.sin(a) * size * 0.5, r: size * (0.5 + hash(seed, i, 13) * 0.25) });
        }
        paintShadowBlob(s, cx + 2.5, cy + 3, size + 1, size * 0.8, 0.35);
        const x0 = Math.floor(cx - size * 1.7), x1 = Math.ceil(cx + size * 1.7);
        const y0 = Math.floor(cy - size * 1.7), y1 = Math.ceil(cy + size * 1.7);
        const inside = (x, y) => {
            let best = null, bd = 1e9;
            for (const b of blobs) {
                const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) / b.r;
                if (d <= 1 && d - (b.r / size) * 0.2 < bd) { bd = d - (b.r / size) * 0.2; best = { b, d }; }
            }
            return best;
        };
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const hit = inside(x, y);
                if (!hit) continue;
                const nx = (x + 0.5 - hit.b.x) / hit.b.r, ny = (y + 0.5 - hit.b.y) / hit.b.r;
                const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                let light = 0.5 + 0.45 * (-0.55 * nx - 0.65 * ny + 0.5 * nz) - 0.1;
                light += (hash(x, y, seed) - 0.5) * 0.25;
                const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
                s.set(x, y, edge ? P.leaf[0] : pick(P.leaf, light, x, y));
            }
        }
    }

    // A cottage seen from above: a gable roof with a lit and a shaded pitch.
    function paintHouse(s, tx, ty, seed) {
        const roofs = ['#a24a3a', '#4b6a8f', '#6f7f3e', '#8a5c9a'];
        const base = hex(roofs[Math.floor(hash(seed, 2, 21) * roofs.length)]);
        const x0 = tx * T + 1, y0 = ty * T + 2, w = 14, h = 12;
        paintShadowBlob(s, x0 + w / 2 + 2, y0 + h / 2 + 2, w / 2 + 1, h / 2 + 1, 0.4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const top = y < h / 2;
                let c = top ? tone(base, 0.18) : tone(base, -0.22);
                if ((x + (y >> 1)) % 3 === 0 && y % 2 === 0) c = tone(c, -0.12);
                if (y === Math.floor(h / 2) || y === Math.floor(h / 2) - 1) c = tone(base, 0.35);
                if (x === 0 || x === w - 1 || y === 0 || y === h - 1) c = P.outline;
                s.set(x0 + x, y0 + y, c);
            }
        }
        const chx = x0 + 3 + Math.floor(hash(seed, 3, 21) * 7);
        s.rect(chx, y0 + 1, 3, 3, hex('#5b4a45'));
        s.set(chx + 1, y0 + 2, P.outline);
    }

    function paintPlatform(s, pl, trackBelow) {
        for (let y = pl.y * T; y < pl.y * T + T; y++) {
            for (let x = pl.x * T; x < (pl.x + pl.w) * T; x++) {
                const ly = y - pl.y * T;
                const edgeY = trackBelow ? T - 1 - ly : ly;
                let c = pick(P.concrete, 0.5 + (hash(x, y, 31) - 0.5) * 0.5, x, y);
                if (x % 8 === 0 || ly % 8 === 0) c = tone(c, -0.12);
                if (edgeY === 3) c = P.safety;
                if (edgeY <= 1) c = edgeY === 0 ? P.outline : tone(P.concrete[0], -0.2);
                s.set(x, y, c);
            }
        }
    }

    function paintStationBuilding(s, b, shadowDown) {
        const x0 = b.x * T, y0 = b.y * T + 2, w = b.w * T, h = 12;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const ridge = Math.abs(y - h / 2 + 0.5);
                let c = y < h / 2 ? P.roof[2] : P.roof[0];
                if (ridge < 1) c = tone(P.roof[2], 0.3);
                else if (y % 3 === 0) c = tone(c, -0.15);
                else if ((x + (y % 2) * 2) % 4 === 0) c = tone(c, -0.08);
                if (x === 0 || x === w - 1 || y === 0 || y === h - 1) c = P.outline;
                s.set(x0 + x, y0 + y, c);
            }
        }
        // skylights and a clock turret
        for (let x = 6; x < w - 6; x += 10) { s.rect(x0 + x, y0 + 2, 4, 2, hex('#9fd3e6')); s.rect(x0 + x, y0 + 8, 4, 2, hex('#6aa7c0')); }
        const cx = x0 + Math.floor(w / 2) - 3;
        s.rect(cx, y0 + 3, 7, 6, P.outline);
        s.rect(cx + 1, y0 + 4, 5, 4, P.cream);
        s.set(cx + 3, y0 + 5, P.ink); s.set(cx + 3, y0 + 6, P.ink); s.set(cx + 4, y0 + 6, P.ink);
        const sy = shadowDown ? y0 + h : y0 - 2;
        for (let x = 1; x < w + 1; x++) for (let k = 0; k < 2; k++) s.darken(x0 + x, sy + k, 0.3);
    }

    function paintSign(s, cx, cy, label) {
        const w = textWidth(label, 1) + 6;
        const x0 = Math.round(cx - w / 2), y0 = cy - 4;
        s.rect(x0 - 1, y0 - 1, w + 2, 9, P.outline);
        s.rect(x0, y0, w, 7, hex('#1d4a3c'));
        text(s, label, x0 + 3, y0 + 1, P.cream);
    }

    function paintPond(s, cx, cy, rx, ry) {
        const cells = [];
        for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
            for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
                const wob = vnoise(x, y, 6, 41) * 0.35;
                const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) + wob - 0.15;
                if (d > 1.12) continue;
                if (d > 1) { s.set(x, y, P.shore); continue; }
                cells.push({ x, y, depth: 1 - d });
            }
        }
        return cells;
    }

    // ------------------------------------------------------------------
    // Background: the whole yard, painted once.

    function buildBackground(layout, seed) {
        const W = layout.width * T, H = layout.height * T;
        const s = new Surface(W, H);
        paintGrass(s, 0, 0, W, H);
        const blocked = new Set();
        for (const t of layout.tiles.values()) blocked.add(key(t.x, t.y));
        const deco = { pond: [], signals: [] };
        for (const st of layout.stations) {
            const pl = st.platform, trackBelow = pl.y < st.stop[1];
            for (let i = 0; i < pl.w; i++) { blocked.add(key(pl.x + i, pl.y)); blocked.add(key(st.building.x + i, st.building.y)); }
        }
        for (const g of layout.gates) for (const sg of g.signals) blocked.add(key(sg.x, sg.y));
        // pond in the quiet corner of the loop
        const pond = { x: 11, y: 8, w: 2, h: 2 };
        for (let j = 0; j < pond.h; j++) for (let i = 0; i < pond.w; i++) blocked.add(key(pond.x + i, pond.y + j));
        deco.pond = paintPond(s, (pond.x + 1) * T, (pond.y + 1) * T - 2, 13, 10);
        for (const t of layout.tiles.values()) paintTrack(s, t);
        for (const st of layout.stations) {
            const trackBelow = st.platform.y < st.stop[1];
            paintPlatform(s, st.platform, trackBelow);
            paintStationBuilding(s, st.building, !trackBelow);
            paintSign(s, (st.platform.x + st.platform.w / 2) * T, st.platform.y * T + (trackBelow ? 6 : 10), st.name);
        }
        // trees, bushes and cottages on the free ground
        const isTrack = (x, y) => layout.tiles.has(key(x, y));
        const r = L.rng(seed || 5);
        for (let ty = 0; ty < layout.height; ty++) {
            for (let tx = 0; tx < layout.width; tx++) {
                if (blocked.has(key(tx, ty))) continue;
                const nearTrack = isTrack(tx + 1, ty) || isTrack(tx - 1, ty) || isTrack(tx, ty + 1) || isTrack(tx, ty - 1);
                const roll = r();
                const cx = tx * T + 8, cy = ty * T + 8;
                if (!nearTrack && roll < 0.14) paintHouse(s, tx, ty, tx * 31 + ty);
                else if (!nearTrack && roll < 0.62) paintTree(s, cx + (r() - 0.5) * 4, cy + (r() - 0.5) * 4, 5 + r() * 2, tx * 97 + ty * 13);
                else if (roll < 0.8) paintTree(s, cx + (r() - 0.5) * 3, cy + (r() - 0.5) * 3, 3 + r() * 1.2, tx * 53 + ty * 7);
            }
        }
        return { surface: s, deco };
    }

    // ------------------------------------------------------------------
    // Per-frame layers

    function paintWater(s, cells, time) {
        const tick = Math.floor(time * 5);
        for (const c of cells) {
            const wave = Math.sin(c.x * 0.7 + c.y * 0.35 + time * 2.2) * 0.12;
            let col = pick(P.water, 0.2 + c.depth * 0.25 + wave + (c.y % 3 === 0 ? 0.08 : 0), c.x, c.y);
            if (hash(c.x, c.y, tick) > 0.985) col = P.water[3];
            s.set(c.x, c.y, col);
        }
    }

    function paintSwitchLamp(s, t) {
        const legs = L.switchLegs(t);
        // lamp sits on the corner away from the branch
        const cx = t.x * T + 8 + (DX[legs.branch] ? -DX[legs.branch] * 6 : 6);
        const cy = t.y * T + 8 + (DY[legs.branch] ? -DY[legs.branch] * 6 : -6);
        s.rect(cx - 2, cy - 2, 5, 5, P.outline);
        s.rect(cx - 1, cy - 1, 3, 3, t.sw.diverge ? P.amber : P.green);
        s.set(cx - 1, cy - 1, P.white);
    }

    function paintSignal(s, sg, red, blink) {
        const cx = sg.x * T + 8, base = sg.y * T + 13;
        paintShadowBlob(s, cx + 3, base + 1, 4, 1.5, 0.35);
        for (let y = base - 9; y <= base; y++) { s.set(cx, y, P.outline); s.set(cx + 1, y, hex('#4a5260')); }
        const hx = cx - 2, hy = base - 17;
        s.rect(hx, hy, 6, 10, P.outline);
        s.rect(hx + 1, hy + 1, 4, 8, hex('#262c36'));
        const lampR = red ? (blink ? P.red : tone(P.red, 0.25)) : P.redDim;
        const lampG = red ? P.greenDim : P.green;
        s.rect(hx + 2, hy + 2, 2, 2, lampR);
        s.rect(hx + 2, hy + 6, 2, 2, lampG);
        const gx = hx + 3, gy = red ? hy + 3 : hy + 7;
        const glow = red ? P.red : P.green;
        for (let y = gy - 4; y <= gy + 4; y++) {
            for (let x = gx - 4; x <= gx + 4; x++) {
                const d = Math.hypot(x - gx, y - gy);
                if (d > 1.5 && d < 4.2 && (4.2 - d) / 5 > dither(x, y)) s.set(x, y, mix(s.get(x, y), glow, 0.45));
            }
        }
    }

    function paintGateFrame(s, g, red, time) {
        if (!red) return;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (const [x, y] of g.cells) { x0 = Math.min(x0, x * T); y0 = Math.min(y0, y * T); x1 = Math.max(x1, x * T + T - 1); y1 = Math.max(y1, y * T + T - 1); }
        const phase = Math.floor(time * 6);
        for (let x = x0 - 3; x <= x1 + 3; x++) {
            for (const y of [y0 - 1, y1 + 1]) s.set(x, y, ((x + phase) >> 1) & 1 ? P.red : P.cream);
        }
        // barrier arms across the passenger line either side of the crossing
        for (let y = y0; y <= y1; y++) {
            for (const x of [x0 - 3, x1 + 3]) s.set(x, y, ((y + phase) >> 1) & 1 ? P.red : P.cream);
        }
    }

    function paintLabel(s, x, y, str, fg, bg) {
        const w = textWidth(str, 1) + 4;
        s.rect(x - 1, y - 1, w + 2, 9, P.outline);
        s.rect(x, y, w, 7, bg);
        text(s, str, x + 2, y + 1, fg);
    }

    // ------------------------------------------------------------------
    // Rolling stock. Each car is a small shader: given a pixel's position in
    // the car's own frame (u forward, v to the right, in pixels) it returns
    // a colour or 0. Rotating the frame lets one design face any heading.

    const LIVERY = {
        player: { body: hex('#2f7d5b'), trim: hex('#f4c95d') },
        runaway: { body: hex('#b0432f'), trim: hex('#f2d45c') },
        east: { body: hex('#2c8c9a'), trim: hex('#f1e8cc') },
        west: { body: hex('#7b4a8c'), trim: hex('#f1e8cc') }
    };

    function cylinder(base, v, half, lightSide) {
        const n = v / half;
        const lit = 0.55 - 0.45 * n * lightSide + 0.35 * (1 - n * n) - 0.3;
        return pick(ramp(base), lit, 0, 0);
    }

    function locoShader(u, v, o) {
        const au = Math.abs(u), av = Math.abs(v);
        if (au > 7.5 || av > 4.5 || (au > 6.6 && av > 3.6)) return 0;
        const body = o.livery.body, trim = o.livery.trim;
        if (u > 6.6) return av > 2.2 && av < 3.6 ? P.ink : hex('#b8412f');
        if (Math.hypot(u - 5.2, v) < 1.5) return Math.hypot(u - 5.2, v) < 0.8 ? P.ink : hex('#2a2a31');
        if (u > 4.4) return cylinder(hex('#2b2e36'), v, 3.4, o.ls);
        if (Math.hypot(u - 2, v) < 1.3) return tone(trim, 0.2 - v * 0.1 * o.ls);
        if (u > -1.6) {
            if (av > 3.3) return hex('#3b3f46');
            if (Math.abs(u - 0.4) < 0.5 || Math.abs(u - 3.6) < 0.5) return trim;
            return cylinder(body, v, 3.3, o.ls);
        }
        // cab roof
        if (av > 3.7 || u < -7) return trim;
        if (u > -2.3) return tone(body, -0.4);
        return tone(body, -0.1 - v * 0.06 * o.ls);
    }

    function wagonShader(u, v, o) {
        const au = Math.abs(u), av = Math.abs(v);
        if (au > 7.2 || av > 4.4) return 0;
        const body = o.livery.body;
        if (au > 6.4) return av < 1 ? P.ink : tone(body, -0.45);
        if (av > 3.6) return tone(body, -0.35);
        if (av < 0.8) return tone(body, 0.28);
        let c = cylinder(body, v, 4.4, o.ls * 0.5);
        if ((Math.floor(u + 8) % 3) === 0) c = tone(c, -0.18);
        if (o.beacon && au > 5.2 && av > 2.4) return o.flash ? P.gold : tone(P.gold, -0.5);
        return c;
    }

    function coachShader(u, v, o) {
        const au = Math.abs(u), av = Math.abs(v);
        if (au > 7.3 || av > 4.3) return 0;
        if (o.front && u > 5 && (u - 5) * 1.3 + av * 0.8 > 3.6) return 0; // tapered nose
        const body = o.livery.body;
        if (o.front && u > 4.2) {
            if (u > 6.2) return P.gold;
            return av < 2.8 ? (v * o.ls < -0.5 ? hex('#9fd3e6') : hex('#27405a')) : tone(body, -0.2);
        }
        if (o.back && u < -6.4 && av > 2) return P.red;
        if (av > 3.5) return tone(body, -0.3);
        if (av > 2.6) return o.livery.trim;
        const roof = mix(body, hex('#c7ccd1'), 0.35);
        if (av < 1 && Math.floor(u + 8) % 4 === 1) return tone(roof, -0.4);
        return cylinder(roof, v, 3.4, o.ls * 0.6);
    }

    const car = new Surface(22, 22);
    function paintCar(s, pose, shader, opts) {
        const cx = pose.x * T, cy = pose.y * T;
        const ca = Math.cos(pose.angle), sa = Math.sin(pose.angle);
        // which side of the car faces the light (top left of the screen)
        opts.ls = (-sa * -0.6 + ca * -0.8) > 0 ? 1 : -1;
        const ox = Math.floor(cx) - 11, oy = Math.floor(cy) - 11;
        car.data.fill(0);
        for (let j = 0; j < 22; j++) {
            for (let i = 0; i < 22; i++) {
                const dx = ox + i + 0.5 - cx, dy = oy + j + 0.5 - cy;
                const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
                const c = shader(u, v, opts);
                if (c) car.data[j * 22 + i] = c;
            }
        }
        // drop shadow, then outline, then body
        for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) {
            if (car.data[j * 22 + i]) s.darken(ox + i + 1, oy + j + 2, 0.45);
        }
        for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) {
            if (car.data[j * 22 + i]) continue;
            const nb = car.get(i - 1, j) || car.get(i + 1, j) || car.get(i, j - 1) || car.get(i, j + 1);
            if (nb) s.set(ox + i, oy + j, P.outline);
        }
        for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) {
            const c = car.data[j * 22 + i];
            if (c) s.set(ox + i, oy + j, c);
        }
    }

    function paintTrain(s, train, time) {
        const poses = L.carPoses(train);
        for (let i = poses.length - 1; i >= 0; i--) {
            const pose = poses[i];
            if (pose.x < -1 || pose.y < -1 || pose.x > 21 || pose.y > 13) continue;
            if (train.kind === 'player') paintCar(s, pose, locoShader, { livery: LIVERY.player });
            else if (train.kind === 'runaway') paintCar(s, pose, wagonShader, { livery: LIVERY.runaway, beacon: !train.coupled && !train.stopped, flash: Math.floor(time * 6 + i * 3) % 2 === 0 });
            else paintCar(s, pose, coachShader, { livery: LIVERY[train.line] || LIVERY.east, front: i === 0, back: i === poses.length - 1 });
        }
    }

    // ------------------------------------------------------------------
    // Particles: smoke, sparks, sand, debris, fire, coupling ring.

    function Particles() { this.list = []; }
    Particles.prototype.emit = function (p) { if (this.list.length < 400) this.list.push(Object.assign({ age: 0 }, p)); };
    Particles.prototype.update = function (dt) {
        for (const p of this.list) {
            p.age += dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.kind === 'smoke') { p.vx *= 0.96; p.vy = p.vy * 0.96 - 4 * dt; }
            if (p.kind === 'debris' || p.kind === 'spark') p.vy += 40 * dt;
        }
        this.list = this.list.filter(p => p.age < p.life);
    };
    Particles.prototype.draw = function (s) {
        for (const p of this.list) {
            const k = p.age / p.life;
            if (p.kind === 'smoke') disc(s, p.x, p.y, p.size * (0.6 + k * 1.4), mix(hex('#f4efe6'), hex('#6d6a73'), k), 0.9 * (1 - k));
            else if (p.kind === 'fire') disc(s, p.x, p.y, p.size * (1 - k * 0.5), k < 0.3 ? P.gold : k < 0.6 ? P.amber : P.red, 1 - k);
            else if (p.kind === 'ring') {
                const r = 2 + k * 12;
                for (let a = 0; a < 40; a++) {
                    if ((a + Math.floor(k * 10)) % 3 === 0) continue;
                    s.set(p.x + Math.cos(a / 40 * Math.PI * 2) * r, p.y + Math.sin(a / 40 * Math.PI * 2) * r, k < 0.5 ? P.white : P.gold);
                }
            } else {
                const c = p.kind === 'spark' ? (k < 0.4 ? P.white : P.gold) : p.kind === 'sand' ? P.sand[2] : P.outline;
                s.set(p.x, p.y, c);
            }
        }
    };

    // ------------------------------------------------------------------
    // Frame composition

    function Renderer(layout, seed) {
        this.layout = layout;
        this.W = layout.width * T;
        this.H = layout.height * T;
        const bg = buildBackground(layout, seed);
        this.bg = bg.surface;
        this.deco = bg.deco;
        this.frame = new Surface(this.W, this.H);
        this.particles = new Particles();
    }

    // view: { time, trains, cursor: {x,y}|null, hint: tile|null, warnGates: Set, banner, sub, dim }
    Renderer.prototype.draw = function (view) {
        const s = this.frame, layout = this.layout, time = view.time || 0;
        s.data.set(this.bg.data);
        paintWater(s, this.deco.pond, time);
        for (const t of layout.switches) paintTrack(s, t);
        for (const t of layout.switches) paintSwitchLamp(s, t);
        const blink = Math.floor(time * 4) % 2 === 0;
        for (const g of layout.gates) {
            const warn = view.warnGates && view.warnGates.has(g.id);
            paintGateFrame(s, g, g.red, time);
            for (const sg of g.signals) paintSignal(s, sg, g.red, blink);
            const [lx, ly] = g.cells[0];
            const bgc = g.red ? hex('#7d211d') : warn && blink ? P.amber : hex('#1d4a3c');
            paintLabel(s, lx * T + 18, ly * T - 11, g.id, P.cream, bgc);
        }
        for (const t of layout.switches) {
            const n = t.sw.id.slice(1);
            const lx = t.x * T + (t.y === 1 ? 5 : 5), ly = t.y === 1 ? t.y * T - 9 : t.y * T + T + 2 > this.H - 8 ? t.y * T - 9 : t.y * T + T + 1;
            paintLabel(s, lx, ly, n, P.ink, t.sw.diverge ? P.amber : P.green);
        }
        if (view.hint) this.bracket(view.hint.x, view.hint.y, P.gold, time, true);
        if (view.cursor) this.bracket(view.cursor.x, view.cursor.y, P.white, time, false);
        for (const tr of view.trains || []) paintTrain(s, tr, time);
        this.particles.draw(s);
        if (view.dim) for (let i = 0; i < s.data.length; i++) s.data[i] = tone(s.data[i], -0.45);
        if (view.banner) this.banner(view.banner, view.sub, view.bannerColor);
        return s;
    };

    Renderer.prototype.bracket = function (tx, ty, c, time, pulse) {
        const s = this.frame;
        const o = pulse ? (Math.floor(time * 5) % 2) : 0;
        const x0 = tx * T - 2 - o, y0 = ty * T - 2 - o, x1 = tx * T + T + 1 + o, y1 = ty * T + T + 1 + o;
        for (let i = 0; i < 4; i++) {
            s.set(x0 + i, y0, c); s.set(x0, y0 + i, c);
            s.set(x1 - i, y0, c); s.set(x1, y0 + i, c);
            s.set(x0 + i, y1, c); s.set(x0, y1 - i, c);
            s.set(x1 - i, y1, c); s.set(x1, y1 - i, c);
        }
    };

    Renderer.prototype.banner = function (title, sub, color) {
        const s = this.frame;
        const tw = textWidth(title, 3), sw = sub ? textWidth(sub, 1) : 0;
        const w = Math.max(tw, sw) + 20, h = sub ? 34 : 26;
        const x0 = Math.floor((this.W - w) / 2), y0 = Math.floor((this.H - h) / 2);
        s.rect(x0 - 2, y0 - 2, w + 4, h + 4, P.outline);
        s.rect(x0, y0, w, h, hex('#12302a'));
        for (let x = x0; x < x0 + w; x++) { s.set(x, y0 + 1, P.gold); s.set(x, y0 + h - 2, P.gold); }
        text(s, title, Math.floor((this.W - tw) / 2), y0 + 6, color || P.cream, 3, P.outline);
        if (sub) text(s, sub, Math.floor((this.W - sw) / 2), y0 + 24, P.gold);
    };

    return { T, Surface, Renderer, Particles, hex, mix, tone, text, textWidth, GLYPHS, P, buildBackground };
});
