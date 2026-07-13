// Grand Transit graphics primitives and procedural overworld art.
// Everything is drawn on Canvas so the game has no runtime asset dependency.

const TILE_SIZE = 16;

const IMG_CACHE = new Map();
function loadImage(src) {
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = setTimeout(() => reject(new Error(`Timeout loading ${src}`)), 4000);
    image.onload = () => { clearTimeout(timeoutId); resolve(image); };
    image.onerror = (error) => { clearTimeout(timeoutId); reject(error); };
    image.src = src;
  });
  IMG_CACHE.set(src, promise);
  return promise;
}

async function loadTileset({ src, tileSize = TILE_SIZE, atlasJson = null }) {
  const image = await loadImage(src);
  return {
    src,
    image,
    tileSize,
    cols: Math.floor(image.width / tileSize),
    rows: Math.floor(image.height / tileSize),
    atlas: atlasJson
  };
}

function drawTile(ctx, tileset, tileIndex, dx, dy, scaledSize) {
  if (tileIndex < 0) return;
  const { image, tileSize, cols } = tileset;
  const sx = (tileIndex % cols) * tileSize;
  const sy = Math.floor(tileIndex / cols) * tileSize;
  const size = scaledSize === undefined ? tileSize : scaledSize;
  ctx.drawImage(image, sx, sy, tileSize, tileSize, dx, dy, size, size);
}

function drawMap(ctx, tileset, map, camera = { x: 0, y: 0 }, viewTilesW = 20, viewTilesH = 15) {
  const size = tileset.tileSize;
  const startX = Math.max(0, Math.floor(camera.x / size));
  const startY = Math.max(0, Math.floor(camera.y / size));
  const endX = Math.min(map.width, startX + viewTilesW + 1);
  const endY = Math.min(map.height, startY + viewTilesH + 1);
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      drawTile(ctx, map.tilesetRef || tileset, map.tiles[y][x], x * size - camera.x, y * size - camera.y);
    }
  }
}

async function loadSprite(src) {
  const image = await loadImage(src);
  return { src, image, w: image.width, h: image.height };
}

function drawSprite(ctx, sprite, dx, dy) {
  ctx.drawImage(sprite.image, dx, dy);
}

const WorldArt = (() => {
  const BASE = {
    ink: '#172e2b', deepInk: '#0c1d1c', grass: '#76ad54', grassLight: '#9acb65',
    grassDark: '#467b43', turf: '#5b984b', leaf: '#2f6b48', leafLight: '#57934d',
    leafDark: '#1d4c3d', trunk: '#6f4329', path: '#d5c08c', pathLight: '#ead7a4',
    pathDark: '#a68c60', stone: '#8f9586', stoneLight: '#c2c6ae', stoneDark: '#5e675f',
    water: '#2e83a0', waterLight: '#72c6c3', waterDark: '#1c596f', wood: '#7d4b2a',
    woodLight: '#b47b42', iron: '#4a5961', steel: '#b9c4bd', brass: '#d4a63a',
    roof: '#2e6661', roofLight: '#4d8b7b', brick: '#9b6348', plaster: '#ead8ac',
    window: '#59aeb8', flowerA: '#f4c857', flowerB: '#e96d74', shadow: 'rgba(16,30,28,.28)'
  };

  const DISTRICTS = [
    null,
    { roof: '#334f58', roofLight: '#5f7b7d', brick: '#735747', grass: '#6f9c52' },
    { roof: '#356e66', roofLight: '#58a08a', brick: '#a56242', brass: '#d49a3b' },
    { roof: '#4b5158', roofLight: '#747b7a', brick: '#8b4f3d', path: '#b9a37d' },
    { roof: '#376956', roofLight: '#5d9e72', grass: '#73aa58', flowerA: '#f2d35e' },
    { roof: '#4c6585', roofLight: '#7795b5', grass: '#86b66a', path: '#d8cbab' },
    { roof: '#48664a', roofLight: '#78945d', grass: '#798f4d', brass: '#b9d65a' },
    { roof: '#3d6476', roofLight: '#69a3aa', path: '#b9c4be', steel: '#d2e0dd' },
    { roof: '#594c72', roofLight: '#8778a2', brick: '#9a6b55', brass: '#edc859' }
  ];

  function hash(x, y, salt = 0) {
    let n = Math.imul(x + 41, 374761393) ^ Math.imul(y + 73, 668265263) ^ Math.imul(salt + 7, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }

  function mapId(map) { return String((map && (map.id || map.name)) || ''); }
  function districtNumber(map) {
    const id = mapId(map);
    const match = id.match(/(?:City|Route|Gym)(\d+)/i);
    if (match) return Math.max(1, Math.min(8, Number(match[1])));
    if (/Coal/i.test(id)) return 1;
    if (/Piston|Lab|House|Depot|Mart/i.test(id)) return 2;
    if (/Terminus/i.test(id)) return 8;
    return 4;
  }

  function palette(map) { return Object.assign({}, BASE, DISTRICTS[districtNumber(map)]); }
  function indoor(map) { return /Gym|House|Depot|Mart|Lab|Terminus|Museum/i.test(mapId(map)); }
  function city(map) { return /City\d|PistonTown|CoalHarbor/i.test(mapId(map)); }
  function route(map) { return /Route\d/i.test(mapId(map)); }
  function tileAt(map, x, y) {
    if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return -1;
    return typeof map.getTile === 'function' ? map.getTile(x, y) : map.tiles[y][x];
  }
  function same(map, x, y, ids) { return ids.includes(tileAt(map, x, y)); }
  function pathAt(map, x, y) {
    const id = mapId(map), tile = tileAt(map, x, y);
    if (/PistonTown/i.test(id)) return tile === 139 || tile === 140;
    if (/^Route1$/i.test(id)) return tile === 1 || tile === 4;
    return tile === 3 || tile === 6 || tile === 12;
  }

  function painter(ctx, sx, sy, size) {
    const unit = size / 16;
    return {
      r(color, x, y, w, h) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(sx + x * unit), Math.round(sy + y * unit), Math.ceil(w * unit), Math.ceil(h * unit));
      },
      line(color, width, points) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, Math.round(width * unit));
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        points.forEach((point, index) => {
          const x = Math.round(sx + point[0] * unit);
          const y = Math.round(sy + point[1] * unit);
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      },
      poly(color, points) {
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach((point, index) => {
          const x = Math.round(sx + point[0] * unit);
          const y = Math.round(sy + point[1] * unit);
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
      }
    };
  }

  function ground(p, c, x, y, seed) {
    p.r(c.grass, 0, 0, 16, 16);
    p.r(c.grassLight, (seed >>> 3) % 13, (seed >>> 8) % 13, 2, 1);
    p.r(c.grassDark, (seed >>> 13) % 14, (seed >>> 18) % 14, 1, 2);
    if ((seed & 3) === 0) {
      const bx = 3 + ((seed >>> 21) % 9);
      const by = 3 + ((seed >>> 25) % 8);
      p.r(c.grassDark, bx, by + 1, 1, 2);
      p.r(c.grassLight, bx + 1, by, 1, 2);
    }
  }

  function drawGrass(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), seed = hash(tx, ty);
    ground(p, c, tx, ty, seed);
    if (route(map) && seed % 29 === 0) drawFlower(ctx, sx, sy, size, seed & 1 ? c.flowerA : c.flowerB, seed);
    if (city(map) && seed % 47 === 0) drawLamp(ctx, sx, sy, size, c);
    else if (seed % 61 === 0) {
      p.r(c.stoneDark, 10, 10, 3, 2); p.r(c.stone, 9, 9, 3, 2); p.r(c.stoneLight, 10, 9, 1, 1);
    }
  }

  function drawTallGrass(ctx, sx, sy, size, tx, ty, map) {
    drawGrass(ctx, sx, sy, size, tx, ty, map);
    const p = painter(ctx, sx, sy, size), c = palette(map), seed = hash(tx, ty, 2);
    p.r(c.turf, 0, 8, 16, 8);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 5; i++) {
        const x = ((i * 4 + row * 2 + (seed & 1)) % 17) - 1;
        const y = 7 + row * 5;
        p.poly(c.grassDark, [[x, y + 6], [x + 1, y], [x + 2, y + 4], [x + 4, y + 1], [x + 3, y + 7]]);
        p.r(c.grassLight, x + 2, y + 3, 1, 3);
      }
    }
  }

  function drawPath(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), seed = hash(tx, ty, 3);
    ground(p, c, tx, ty, seed);
    const n = pathAt(map, tx, ty - 1);
    const e = pathAt(map, tx + 1, ty);
    const s = pathAt(map, tx, ty + 1);
    const w = pathAt(map, tx - 1, ty);
    const left = w || (!e && (n || s)) ? 0 : 3;
    const right = e || (!w && (n || s)) ? 16 : 13;
    const top = n || (!s && (e || w)) ? 0 : 3;
    const bottom = s || (!n && (e || w)) ? 16 : 13;
    p.r(c.pathDark, left, top, right - left, bottom - top);
    p.r(c.path, left + (left ? 1 : 0), top + (top ? 1 : 0), right - left - (left ? 1 : 0), bottom - top - (top ? 1 : 0));
    if (!n && top > 0) p.r(c.pathLight, left + 1, top, Math.max(1, right - left - 2), 1);
    if (!w && left > 0) p.r(c.pathLight, left, top + 1, 1, Math.max(1, bottom - top - 2));
    p.r(c.pathLight, left + 3 + (seed % Math.max(2, right - left - 5)), top + 3 + ((seed >>> 8) % Math.max(2, bottom - top - 5)), 1, 1);
    p.r(c.pathDark, left + 2 + ((seed >>> 13) % Math.max(2, right - left - 4)), top + 2 + ((seed >>> 19) % Math.max(2, bottom - top - 4)), 2, 1);
  }

  function drawWater(ctx, sx, sy, size, tx, ty, map, clock) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.waterDark, 0, 0, 16, 16);
    p.r(c.water, 0, 1, 16, 14);
    const phase = (Math.floor((clock || 0) * 4) + tx * 3 + ty * 5) & 7;
    p.r(c.waterLight, (phase + 1) % 9, 3, 6, 1);
    p.r(c.waterLight, (12 - phase) % 10, 10, 5, 1);
    p.r(c.waterDark, (phase + 5) % 12, 7, 4, 1);
    if (!same(map, tx, ty - 1, [4])) p.r(c.pathLight, 0, 0, 16, 1);
  }

  function drawRail(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), seed = hash(tx, ty, 6);
    p.r(c.pathDark, 0, 0, 16, 16);
    p.r(c.stone, 0, 0, 16, 16);
    for (let i = 0; i < 5; i++) p.r(i & 1 ? c.stoneDark : c.stoneLight, (seed >>> (i * 4)) % 15, (seed >>> (i * 5 + 2)) % 15, 1, 1);
    const n = same(map, tx, ty - 1, [6]), e = same(map, tx + 1, ty, [6]);
    const s = same(map, tx, ty + 1, [6]), w = same(map, tx - 1, ty, [6]);
    const vertical = n || s || (!e && !w);
    const horizontal = e || w;
    if (vertical) {
      for (let y = 0; y < 16; y += 4) { p.r(c.wood, 2, y, 12, 2); p.r(c.woodLight, 3, y, 10, 1); }
      p.r(c.iron, 4, 0, 2, 16); p.r(c.steel, 4, 0, 1, 16);
      p.r(c.iron, 11, 0, 2, 16); p.r(c.steel, 11, 0, 1, 16);
    }
    if (horizontal) {
      for (let x = 0; x < 16; x += 4) { p.r(c.wood, x, 2, 2, 12); p.r(c.woodLight, x, 3, 1, 10); }
      p.r(c.iron, 0, 4, 16, 2); p.r(c.steel, 0, 4, 16, 1);
      p.r(c.iron, 0, 11, 16, 2); p.r(c.steel, 0, 11, 16, 1);
    }
    if (vertical && horizontal) { p.r(c.brass, 7, 7, 3, 3); p.r(c.ink, 8, 8, 1, 1); }
  }

  function drawTree(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), seed = hash(tx, ty, 7);
    ground(p, c, tx, ty, seed);
    p.r(c.shadow, 3, 12, 11, 3);
    p.r(c.trunk, 7, 9, 4, 6); p.r(c.woodLight, 8, 9, 1, 5);
    p.r(c.leafDark, 2, 4, 12, 8); p.r(c.leaf, 1, 6, 14, 5);
    p.r(c.leaf, 4, 1, 8, 12); p.r(c.leafLight, 5, 2, 5, 3);
    p.r(c.grassDark, 2, 9, 2, 2); p.r(c.ink, 12, 8, 1, 2);
  }

  function interiorWall(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.deepInk, 0, 0, 16, 16);
    p.r(c.wood, 0, 0, 16, 3);
    p.r(c.brick, 0, 3, 16, 10);
    for (let y = 4; y < 13; y += 4) {
      const offset = ((y / 4) & 1) * 4;
      for (let x = -offset; x < 16; x += 8) p.r(c.ink, x, y, 7, 1);
    }
    p.r(c.deepInk, 0, 13, 16, 3);
    p.r(c.brass, 1, 13, 14, 1);
  }

  function isBuildingCell(map, tx, ty) {
    const id = mapId(map);
    const tile = tileAt(map, tx, ty);
    const buildingTile = tile === 0 || (/CoalHarbor/i.test(id) && tile === 5) || (/PistonTown/i.test(id) && tile === 163);
    if (!city(map) || !buildingTile) return false;
    if (tx <= 1 || ty <= 1 || tx >= map.width - 2 || ty >= map.height - 2) return false;
    return true;
  }

  function buildingCell(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    const up = isBuildingCell(map, tx, ty - 1), down = isBuildingCell(map, tx, ty + 1);
    const left = isBuildingCell(map, tx - 1, ty), right = isBuildingCell(map, tx + 1, ty);
    p.r(c.shadow, 1, 2, 15, 14);
    if (!up) {
      p.r(c.deepInk, 0, 1, 16, 3); p.r(c.roof, 0, 0, 16, 11);
      p.poly(c.roofLight, [[0, 0], [16, 0], [16, 2], [0, 6]]);
      p.r(c.ink, 0, 10, 16, 2); p.r(c.brass, 0, 9, 16, 1);
    } else if (!down) {
      p.r(c.plaster, 0, 0, 16, 14); p.r(c.brick, 0, 12, 16, 3);
      p.r(c.ink, 3, 4, 10, 8); p.r(c.window, 4, 5, 8, 5);
      p.r(c.waterLight, 5, 5, 2, 4); p.r(c.brass, 7, 4, 1, 8);
      p.r(c.ink, 0, 14, 16, 2);
    } else {
      p.r(c.roof, 0, 0, 16, 16);
      for (let y = 1; y < 16; y += 4) p.r(c.roofLight, 0, y, 16, 1);
      p.r(c.ink, 0, 15, 16, 1);
    }
    if (!left) p.r(c.ink, 0, 0, 1, 16);
    if (!right) p.r(c.deepInk, 14, 0, 2, 16);
  }

  function drawBarrier(ctx, sx, sy, size, tx, ty, map) {
    if (indoor(map)) { interiorWall(ctx, sx, sy, size, tx, ty, map); return; }
    if (isBuildingCell(map, tx, ty)) { buildingCell(ctx, sx, sy, size, tx, ty, map); return; }
    drawTree(ctx, sx, sy, size, tx, ty, map);
  }

  function drawFenceTile(ctx, sx, sy, size, tx, ty, map) {
    drawGrass(ctx, sx, sy, size, tx, ty, map);
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.shadow, 0, 11, 16, 3); p.r(c.wood, 0, 6, 16, 3); p.r(c.woodLight, 0, 6, 16, 1);
    p.r(c.wood, 2, 3, 3, 11); p.r(c.woodLight, 2, 3, 1, 9);
    p.r(c.wood, 12, 3, 3, 11); p.r(c.woodLight, 12, 3, 1, 9);
  }

  function drawDoor(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    if (indoor(map)) {
      p.r(c.pathDark, 0, 0, 16, 16); p.r(c.path, 1, 0, 14, 16);
      p.r(c.brass, 1, 2, 14, 2); p.r(c.deepInk, 3, 5, 10, 11);
      p.r(c.roof, 5, 6, 6, 10); p.r(c.brass, 9, 11, 1, 1);
    } else {
      drawPath(ctx, sx, sy, size, tx, ty, map);
      p.r(c.shadow, 2, 13, 12, 3); p.r(c.deepInk, 3, 1, 10, 14);
      p.r(c.wood, 5, 3, 6, 12); p.r(c.woodLight, 6, 4, 1, 9);
      p.r(c.brass, 9, 9, 1, 1); p.r(c.roof, 2, 0, 12, 3); p.r(c.brass, 3, 2, 10, 1);
    }
  }

  function drawInteriorFloor(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), seed = hash(tx, ty, 11);
    p.r(c.pathDark, 0, 0, 16, 16); p.r(c.path, 1, 1, 15, 15);
    p.r(c.pathLight, 1, 1, 14, 1); p.r(c.pathDark, 0, 15, 16, 1);
    if (/Gym|Terminus/i.test(mapId(map))) {
      p.r(c.iron, 0, 0, 1, 16); p.r(c.brass, 1, 1, 1, 14);
      if (((tx + ty) & 3) === 0) p.r(c.brass, 7, 7, 2, 2);
    } else if (seed % 7 === 0) p.r(c.pathLight, 10, 4, 2, 1);
  }

  function drawFlower(ctx, sx, sy, size, color, seed = 0) {
    const p = painter(ctx, sx, sy, size), c = BASE;
    const x = 4 + (seed % 7), y = 7 + ((seed >>> 4) % 4);
    p.r(c.grassDark, x, y, 1, 4); p.r(color, x - 1, y - 1, 3, 1);
    p.r(color, x, y - 2, 1, 3); p.r(c.pathLight, x, y - 1, 1, 1);
  }

  function drawLamp(ctx, sx, sy, size, c = BASE) {
    const p = painter(ctx, sx, sy, size);
    p.r(c.shadow, 8, 12, 6, 2); p.r(c.ink, 8, 5, 2, 9); p.r(c.brass, 7, 4, 4, 2);
    p.r(c.pathLight, 8, 2, 2, 3); p.r(c.brass, 7, 1, 4, 2); p.r(c.ink, 6, 3, 1, 4); p.r(c.ink, 11, 3, 1, 4);
  }

  function drawSign(ctx, sx, sy, size, label = 'GT', map = null) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.shadow, 4, 12, 10, 2); p.r(c.wood, 7, 8, 2, 6); p.r(c.ink, 2, 2, 12, 8);
    p.r(c.brass, 3, 3, 10, 6); p.r(c.deepInk, 4, 4, 8, 4);
    ctx.save();
    ctx.fillStyle = c.pathLight;
    ctx.font = `bold ${Math.max(5, Math.floor(size * .14))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(label).slice(0, 3), sx + size / 2, sy + size * .36);
    ctx.restore();
  }

  function drawPlatform(ctx, sx, sy, size, tx, ty, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.stoneDark, 0, 0, 16, 16); p.r(c.stoneLight, 0, 0, 16, 13);
    p.r(c.pathLight, 0, 1, 16, 10); p.r(c.brass, 0, 11, 16, 2);
    for (let x = ((tx & 1) ? -4 : 0); x < 16; x += 8) {
      p.poly(c.deepInk, [[x, 11], [x + 3, 11], [x + 6, 13], [x + 3, 13]]);
    }
  }

  function drawBuildingDecoration(ctx, d, sx, sy, size, map) {
    const c = palette(map), w = Math.max(3, d.w || 4), h = Math.max(3, d.h || 4);
    const width = w * size, height = h * size;
    const u = size / 16;
    const snap = value => Math.round(value);
    const rect = (color, x, y, rw, rh) => {
      ctx.fillStyle = color;
      ctx.fillRect(snap(sx + x * u), snap(sy + y * u), Math.ceil(rw * u), Math.ceil(rh * u));
    };
    const roofRows = Math.max(18, h * 8 - 5);
    ctx.fillStyle = c.shadow;
    ctx.fillRect(sx + size * .18, sy + size * .25, width, height);
    rect(c.deepInk, 0, 5, w * 16, h * 16 - 4);
    rect(c.plaster, 2, roofRows, w * 16 - 4, h * 16 - roofRows - 3);
    rect(c.brick, 2, h * 16 - 8, w * 16 - 4, 6);

    // Broad railway roof with staggered slate rows, a brass ridge, and a
    // projecting lower eave. Kind changes the civic silhouette without
    // introducing a separate visual language.
    ctx.fillStyle = c.roof;
    ctx.beginPath();
    ctx.moveTo(sx, sy + roofRows * u);
    ctx.lineTo(sx + width * .12, sy + 2 * u);
    ctx.lineTo(sx + width * .88, sy + 2 * u);
    ctx.lineTo(sx + width, sy + roofRows * u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.roofLight;
    for (let y = 6; y < roofRows - 2; y += 5) {
      const inset = Math.max(1, Math.round((roofRows - y) * .4));
      ctx.fillRect(sx + inset * u, sy + y * u, width - inset * 2 * u, Math.max(1, u));
    }
    rect(c.brass, w * 2, 1, w * 12, 2);
    rect(c.ink, 0, roofRows - 2, w * 16, 3);
    rect(c.brass, 2, roofRows - 2, w * 16 - 4, 1);

    if (d.kind === 'lab' || d.kind === 'station') {
      const towerX = w * 8 - 8;
      rect(c.deepInk, towerX - 2, 6, 20, roofRows + 6);
      rect(c.roof, towerX, 2, 16, roofRows + 8);
      rect(c.roofLight, towerX + 3, 5, 10, roofRows + 2);
      rect(c.brass, towerX + 6, 7, 4, 4);
    }
    if (d.kind === 'depot') {
      rect(c.iron, w * 16 - 12, 1, 6, 12);
      rect(c.steel, w * 16 - 11, 0, 4, 3);
    }

    const doorTile = Number.isFinite(d.doorX) ? d.doorX - d.x : Math.floor(w / 2);
    const doorX = Math.max(1, Math.min(w - 2, doorTile)) * 16 + 3;
    rect(c.deepInk, doorX - 1, h * 16 - 22, 12, 20);
    rect(c.wood, doorX + 1, h * 16 - 20, 8, 18);
    rect(c.woodLight, doorX + 2, h * 16 - 19, 2, 15);
    rect(c.brass, doorX + 7, h * 16 - 11, 1, 1);
    for (let x = 8; x < w * 16 - 12; x += 24) {
      if (Math.abs(x - doorX) < 15) continue;
      rect(c.deepInk, x - 1, h * 16 - 22, 14, 13);
      rect(c.window, x + 1, h * 16 - 20, 10, 9);
      rect(c.waterLight, x + 2, h * 16 - 19, 3, 7);
      rect(c.brass, x + 6, h * 16 - 21, 1, 11);
    }

    if (d.label) {
      const label = String(d.label).slice(0, Math.max(5, w * 4));
      const signW = Math.min(width - size * .5, Math.max(size * 1.8, label.length * size * .22));
      const signX = sx + (width - signW) / 2;
      const signY = sy + (roofRows + 3) * u;
      ctx.fillStyle = c.deepInk; ctx.fillRect(signX - 2 * u, signY - 2 * u, signW + 4 * u, 9 * u);
      ctx.fillStyle = c.brass; ctx.fillRect(signX, signY, signW, 5 * u);
      ctx.fillStyle = c.deepInk;
      ctx.font = `bold ${Math.max(6, Math.floor(size * .16))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, sx + width / 2, signY + 2.5 * u, signW - 2 * u);
    }
  }

  function drawFountain(ctx, sx, sy, size, map, clock) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.shadow, 1, 11, 15, 4); p.r(c.stoneDark, 0, 8, 16, 6);
    p.r(c.stoneLight, 1, 7, 14, 5); p.r(c.waterDark, 3, 8, 10, 3); p.r(c.water, 4, 8, 8, 2);
    p.r(c.stoneDark, 7, 3, 3, 7); p.r(c.stoneLight, 7, 2, 2, 6); p.r(c.brass, 6, 1, 5, 2);
    const phase = Math.floor((clock || 0) * 4) & 1;
    p.r(c.waterLight, 4 + phase, 3, 2, 1); p.r(c.waterLight, 11 - phase, 4, 2, 1);
  }

  function drawSignal(ctx, sx, sy, size, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.shadow, 6, 13, 9, 2); p.r(c.iron, 8, 5, 3, 10); p.r(c.steel, 9, 6, 1, 7);
    p.r(c.deepInk, 5, 0, 9, 9); p.r(c.brass, 6, 1, 7, 1);
    p.r('#e25f4f', 8, 2, 3, 3); p.r('#f1c94a', 8, 5, 3, 2);
  }

  function drawClock(ctx, sx, sy, size, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.shadow, 6, 13, 9, 2); p.r(c.iron, 7, 7, 4, 8); p.r(c.brass, 5, 0, 8, 8);
    p.r(c.deepInk, 6, 1, 6, 6); p.r(c.pathLight, 7, 2, 4, 4);
    p.r(c.ink, 8, 2, 1, 3); p.r(c.ink, 8, 4, 2, 1);
  }

  function drawStump(ctx, sx, sy, size, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map);
    p.r(c.shadow, 3, 11, 12, 3); p.r(c.trunk, 4, 6, 9, 7); p.r(c.woodLight, 5, 5, 7, 4);
    p.r(c.wood, 6, 6, 5, 2); p.r(c.deepInk, 8, 6, 2, 1); p.r(c.grassDark, 3, 10, 2, 3);
  }

  function drawFlowerbed(ctx, d, sx, sy, size, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), w = Math.max(1, d.w || 1);
    p.r(c.shadow, 1, 11, w * 16, 3); p.r(c.brick, 0, 5, w * 16, 9);
    p.r(c.woodLight, 1, 6, w * 16 - 2, 6); p.r(c.grassDark, 2, 5, w * 16 - 4, 5);
    for (let x = 4; x < w * 16 - 2; x += 6) {
      const color = ((x / 6) & 1) ? c.flowerA : c.flowerB;
      p.r(color, x - 1, 4, 3, 2); p.r(c.pathLight, x, 4, 1, 1); p.r(c.leaf, x, 6, 1, 4);
    }
  }

  function drawBridge(ctx, d, sx, sy, size, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), w = Math.max(2, d.w || 3);
    p.r(c.deepInk, 0, 2, w * 16, 13); p.r(c.wood, 0, 3, w * 16, 10);
    for (let x = 1; x < w * 16; x += 6) { p.r(c.woodLight, x, 4, 1, 8); p.r(c.deepInk, x + 4, 4, 1, 9); }
    p.r(c.iron, 0, 1, w * 16, 2); p.r(c.steel, 0, 1, w * 16, 1);
    p.r(c.iron, 0, 13, w * 16, 2); p.r(c.brass, 1, 13, w * 16 - 2, 1);
  }

  function drawCounter(ctx, d, sx, sy, size, map) {
    const p = painter(ctx, sx, sy, size), c = palette(map), w = Math.max(2, d.w || 3);
    p.r(c.shadow, 1, 10, w * 16, 5); p.r(c.deepInk, 0, 2, w * 16, 12);
    p.r(c.wood, 1, 3, w * 16 - 2, 10); p.r(c.woodLight, 0, 1, w * 16, 4);
    p.r(c.brass, 1, 2, w * 16 - 2, 1);
    for (let x = 7; x < w * 16; x += 16) p.r(c.ink, x, 7, 2, 6);
  }

  function drawWorldDecoration(ctx, decoration, cameraX, cameraY, tileSize, options = {}) {
    if (!decoration) return;
    const map = options.map || options.currentMap || null;
    const sx = decoration.x * tileSize - cameraX;
    const sy = decoration.y * tileSize - cameraY;
    const type = String(decoration.type || '').toLowerCase();
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (type === 'building') drawBuildingDecoration(ctx, decoration, sx, sy, tileSize, map);
    else if (type === 'fountain') drawFountain(ctx, sx, sy, tileSize, map, options.clock);
    else if (type === 'sign') drawSign(ctx, sx, sy, tileSize, decoration.label || 'GT', map);
    else if (type === 'flowerbed' || type === 'flowers') drawFlowerbed(ctx, decoration, sx, sy, tileSize, map);
    else if (type === 'bridge') drawBridge(ctx, decoration, sx, sy, tileSize, map);
    else if (type === 'signal') drawSignal(ctx, sx, sy, tileSize, map);
    else if (type === 'stump') drawStump(ctx, sx, sy, tileSize, map);
    else if (type === 'clock') drawClock(ctx, sx, sy, tileSize, map);
    else if (type === 'counter') drawCounter(ctx, decoration, sx, sy, tileSize, map);
    ctx.restore();
  }

  function drawWorldCharacter(ctx, character, sx, sy, size, options = {}) {
    const c = palette(options.map), p = painter(ctx, sx, sy, size);
    const role = String(character.type || character.role || (character.isPlayer ? 'player' : 'npc')).toLowerCase();
    const direction = String(character.direction || options.direction || 'down').toLowerCase();
    const moving = !!options.moving;
    const step = moving ? (Math.floor((options.clock || 0) * 8) & 1) : 0;
    const shirt = character.color || (role.includes('leader') ? c.brass : role.includes('trainer') ? '#b84e46' : role.includes('healer') ? '#e8e3d3' : role === 'player' ? '#315c83' : '#52756f');
    const hat = role === 'player' ? '#b8423b' : role.includes('leader') ? c.roof : role.includes('trainer') ? '#6f372d' : c.ink;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    p.r(c.shadow, 3, 13, 11, 3);
    const legOffset = step ? 1 : 0;
    p.r(c.deepInk, 5 - legOffset, 11, 3, 4); p.r(c.deepInk, 9 + legOffset, 11, 3, 4);
    p.r(shirt, 4, 7, 9, 6); p.r(c.deepInk, 3, 8, 2, 4); p.r(c.deepInk, 13, 8, 2, 4);
    p.r('#d89d74', 5, 3, 7, 5);
    if (direction === 'up') p.r('#4a3028', 5, 3, 7, 5);
    else {
      p.r('#452d24', 5, 3, 1, 4); p.r('#452d24', 11, 3, 1, 4);
      p.r(c.deepInk, direction === 'left' ? 6 : 10, 5, 1, 1);
    }
    p.r(hat, 4, 1, 9, 3);
    if (direction === 'left') p.r(hat, 2, 3, 4, 1);
    else if (direction === 'right') p.r(hat, 11, 3, 4, 1);
    else p.r(hat, 8, 3, 6, 1);
    if (role.includes('healer')) { p.r('#df6068', 7, 1, 3, 3); p.r('#fff4dc', 8, 1, 1, 3); }
    if (role.includes('leader')) p.r(c.brass, 7, 8, 3, 2);
    ctx.restore();
  }

  function drawWorldTile(ctx, tile, sx, sy, size, tx, ty, options = {}) {
    const map = options.map || options.currentMap || null;
    const id = mapId(map);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // The handcrafted opening maps predate the campaign's normalized tile
    // vocabulary. Translate their material IDs here so old layouts receive
    // exactly the same art direction as the procedural campaign.
    if (/PistonTown/i.test(id) && tile === 227) drawTallGrass(ctx, sx, sy, size, tx, ty, map);
    else if (/PistonTown/i.test(id) && tile === 226) drawGrass(ctx, sx, sy, size, tx, ty, map);
    else if (/PistonTown/i.test(id) && tile === 139) drawPath(ctx, sx, sy, size, tx, ty, map);
    else if (/PistonTown/i.test(id) && tile === 140) drawDoor(ctx, sx, sy, size, tx, ty, map);
    else if (/PistonTown/i.test(id) && tile === 163) buildingCell(ctx, sx, sy, size, tx, ty, map);
    else if (/PistonTown/i.test(id) && tile === 132) {
      drawGrass(ctx, sx, sy, size, tx, ty, map); drawSign(ctx, sx, sy, size, 'GT', map);
    }
    else if (/CoalHarbor$/i.test(id) && tile === 5) buildingCell(ctx, sx, sy, size, tx, ty, map);
    else if (/CoalHarborGym/i.test(id) && tile === 5) interiorWall(ctx, sx, sy, size, tx, ty, map);
    else if (indoor(map) && tile === 1) drawInteriorFloor(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 0) drawBarrier(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 1) drawGrass(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 2) drawTallGrass(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 3) indoor(map) ? drawInteriorFloor(ctx, sx, sy, size, tx, ty, map) : drawPath(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 4) drawWater(ctx, sx, sy, size, tx, ty, map, options.clock);
    else if (tile === 5) drawFenceTile(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 6) drawRail(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 7) drawTree(ctx, sx, sy, size, tx, ty, map);
    else if (tile === 12) drawDoor(ctx, sx, sy, size, tx, ty, map);
    else drawGrass(ctx, sx, sy, size, tx, ty, map);
    ctx.restore();
  }

  return {
    palette, drawWorldTile, drawGrass, drawTallGrass, drawPath, drawWater,
    drawRail, drawTree, drawFence: drawFenceTile, drawDoor, drawSign, drawLamp,
    drawPlatform, drawBuilding: buildingCell, drawInteriorFloor, drawInteriorWall: interiorWall,
    drawWorldDecoration, drawWorldCharacter
  };
})();

function drawWorldTile(ctx, tile, sx, sy, size, tx, ty, options) {
  WorldArt.drawWorldTile(ctx, tile, sx, sy, size, tx, ty, options);
}

function drawWorldDecoration(ctx, decoration, cameraX, cameraY, tileSize, options) {
  WorldArt.drawWorldDecoration(ctx, decoration, cameraX, cameraY, tileSize, options);
}

function drawWorldCharacter(ctx, character, sx, sy, size, options) {
  WorldArt.drawWorldCharacter(ctx, character, sx, sy, size, options);
}

if (typeof window !== 'undefined') window.WorldArt = WorldArt;
