// Overworld characters: 16x20 sprites built from a small spec (skin, hair style,
// hat, clothes). Four facings x three frames (stand, left step, right step).
// The right facing is the left facing mirrored.
(function (CD) {
  'use strict';
  const { Surface, hex, shade, outline } = CD.gfx;
  const P = CD.pal;
  const cache = new Map();
  const CW = 16, CH = 20;

  // Presets for the cast. Anything may be overridden per NPC.
  const CAST = {
    player: { skin: '#f2c8a0', hair: '#4a2c20', style: 'short', hat: 'cap', hatCol: '#c0603a', hatBand: '#f0e0c0', shirt: '#c8603a', shirt2: '#f0e0c0', pants: '#3a4a6a', shoes: '#2a2230', bag: '#e8c040' },
    rival: { skin: '#f0c49a', hair: '#8a5a30', style: 'spiky', shirt: '#4a6ab0', shirt2: '#2a3a6a', pants: '#4a3a30', shoes: '#2a2230' },
    cypress: { skin: '#eec09a', hair: '#d8d4d0', style: 'balding', beard: '#d8d4d0', shirt: '#f4f4f0', coat: true, shirt2: '#6a8a5a', pants: '#6a5a4a', shoes: '#3a2a20' },
    mom: { skin: '#f2c8a0', hair: '#7a4a30', style: 'long', shirt: '#d87a8a', apron: '#f8f0e0', pants: '#8a4a5a', shoes: '#4a3030', skirt: true },
    marina: { skin: '#d8a078', hair: '#9a9894', style: 'short', hat: 'captain', hatCol: '#2f3f6a', hatBand: '#c8a24e', shirt: '#2f3f6a', shirt2: '#c8a24e', pants: '#2a2a38', shoes: '#1a1422', buttons: '#c8a24e' },
    aide: { skin: '#f0c49a', hair: '#3a3a48', style: 'short', shirt: '#f4f4f0', coat: true, shirt2: '#4a6ab0', pants: '#4a4a5a', shoes: '#2a2230' },
    worker: { skin: '#d8a078', hair: '#3a2a20', style: 'short', hat: 'hard', hatCol: '#e8c040', shirt: '#e0803a', shirt2: '#f0e0a0', pants: '#4a5a7a', shoes: '#3a2a20' },
    sailor: { skin: '#e0b088', hair: '#2a2a38', style: 'short', hat: 'beanie', hatCol: '#3a5a8a', shirt: '#f0f0f0', stripes: '#3a5a8a', pants: '#3a4a6a', shoes: '#2a2230' },
    lass: { skin: '#f2c8a0', hair: '#c8803a', style: 'pigtails', shirt: '#e8a0c0', pants: '#6a8ac0', shoes: '#c04a5a', skirt: true },
    youngster: { skin: '#f0c49a', hair: '#3a2a20', style: 'short', hat: 'cap', hatCol: '#3a8a5a', hatBand: '#f0f0e0', shirt: '#e8c040', shirt2: '#f0f0e0', pants: '#3a4a8a', shoes: '#c04a3a' },
    oldman: { skin: '#e8b890', hair: '#e0dcd8', style: 'balding', beard: '#e0dcd8', shirt: '#8a6a4a', pants: '#5a4a3a', shoes: '#3a2a20', cane: true },
    granny: { skin: '#eec09a', hair: '#d8d4e0', style: 'bun', shirt: '#8a6aa0', pants: '#6a4a7a', shoes: '#3a2a30', skirt: true },
    conductor: { skin: '#e8b890', hair: '#4a3a30', style: 'short', hat: 'conductor', hatCol: '#2a3050', hatBand: '#c8a24e', shirt: '#2a3050', shirt2: '#c8a24e', pants: '#2a3050', shoes: '#1a1422', buttons: '#c8a24e' },
    clerk: { skin: '#f0c49a', hair: '#5a3a28', style: 'short', hat: 'cap', hatCol: '#3f74b0', hatBand: '#f0f0f0', shirt: '#3f74b0', shirt2: '#f0f0f0', pants: '#3a3a4a', shoes: '#2a2230' },
    nurse: { skin: '#f2c8a0', hair: '#c85a6a', style: 'bun', hat: 'nurse', hatCol: '#f8f8f8', shirt: '#f8e0e4', apron: '#ffffff', pants: '#f8e0e4', shoes: '#e0a0b0', skirt: true },
    fisher: { skin: '#d8a078', hair: '#4a3a30', style: 'short', hat: 'bucket', hatCol: '#8a9a5a', shirt: '#6a8a5a', shirt2: '#e8d8a0', pants: '#4a5a4a', shoes: '#3a2a20' },
    bugkid: { skin: '#f0c49a', hair: '#2a2a2a', style: 'short', hat: 'cap', hatCol: '#e8e8e0', hatBand: '#58a060', shirt: '#58a060', shirt2: '#e8e8d0', pants: '#8a6a40', shoes: '#4a3a30' },
    grunt: { skin: '#e0b088', hair: '#2a2a2a', style: 'short', hat: 'goggles', hatCol: '#3a3030', shirt: '#4a4040', shirt2: '#c8783a', pants: '#3a3030', shoes: '#1a1422' },
  };

  function paint(spec, dir, frame) {
    const s = new Surface(CW, CH);
    const skin = hex(spec.skin), skinD = shade(skin, -0.2);
    const hair = hex(spec.hair || '#3a2a20'), hairD = shade(hair, -0.25), hairL = shade(hair, 0.25);
    const shirt = hex(spec.shirt), shirtD = shade(shirt, -0.22), shirtL = shade(shirt, 0.18);
    const pants = hex(spec.pants), pantsD = shade(pants, -0.25);
    const shoes = hex(spec.shoes || '#2a2230');
    const side = dir === 'left';
    const back = dir === 'up';
    const step = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    const bob = frame ? 1 : 0; // body dips on step frames

    // ---- legs and feet ----
    const legY = 15 + bob;
    if (spec.skirt) {
      for (let y = 0; y < 3; y++) s.hline(4 - (y > 1 ? 1 : 0), legY + y - 1, 8 + (y > 1 ? 2 : 0), y === 2 ? shade(pants, -0.1) : pants);
      s.fill(5, legY + 2, 2, 2, skin); s.fill(9, legY + 2, 2, 2, skin);
      s.fill(5 + (step < 0 ? 0 : 0), 18 - (step < 0 ? 1 : 0), 2, 2, shoes); s.fill(9, 18 - (step > 0 ? 1 : 0), 2, 2, shoes);
    } else if (side) {
      const a = step, b = -step;
      s.fill(6 + a, legY, 3, 3, pants); s.vline(8 + a, legY, 3, pantsD);
      s.fill(8 + b, legY, 2, 3, pantsD);
      s.fill(5 + a, 18, 4, 2, shoes); s.fill(8 + b, 18, 3, 2, shade(shoes, 0.15));
    } else {
      const ly = step < 0 ? -1 : 0, ry = step > 0 ? -1 : 0;
      s.fill(5, legY + ly, 3, 3 - ly, pants); s.fill(8, legY + ry, 3, 3 - ry, pantsD);
      s.vline(7, legY, 3, pantsD);
      s.fill(5, 18 + ly, 3, 2, shoes); s.fill(8, 18 + ry, 3, 2, shoes);
    }

    // ---- torso ----
    const ty = 10 + bob;
    const torsoW = side ? 6 : 8, tx = side ? 5 : 4;
    s.fill(tx, ty, torsoW, 6, shirt);
    s.vline(tx + torsoW - 1, ty, 6, shirtD);
    s.hline(tx, ty, torsoW, shirtL);
    if (spec.stripes) for (let y = ty + 1; y < ty + 6; y += 2) s.hline(tx, y, torsoW, spec.stripes);
    if (spec.coat) { // lab coat hangs open over a coloured shirt, longer hem
      s.fill(tx, ty, torsoW, 7, '#f4f4f0'); s.vline(tx + torsoW - 1, ty, 7, '#c8c8d0');
      if (!back && !side) { s.fill(7, ty + 1, 2, 5, spec.shirt2 || '#6a8a5a'); }
      if (side) s.vline(tx + 1, ty + 1, 5, spec.shirt2 || '#6a8a5a');
    } else if (spec.apron && !back) { s.fill(side ? 5 : 5, ty + 2, side ? 3 : 6, 5, spec.apron); }
    else if (spec.shirt2 && !back && !side) { s.fill(7, ty, 2, 2, spec.shirt2); }
    if (spec.buttons && !back && !side) { s.px(7, ty + 3, spec.buttons); s.px(8, ty + 3, spec.buttons); s.px(7, ty + 5, spec.buttons); s.px(8, ty + 5, spec.buttons); }
    if (spec.bag && back) { s.fill(5, ty + 1, 6, 4, spec.bag); s.hline(5, ty + 1, 6, shade(spec.bag, 0.25)); s.hline(5, ty + 4, 6, shade(spec.bag, -0.3)); }
    if (spec.bag && !back) { s.px(side ? 9 : 4, ty, shade(spec.bag, -0.3)); s.px(side ? 9 : 11, ty + 1, shade(spec.bag, -0.3)); }
    // arms swing opposite to legs
    if (side) {
      const sw = -step;
      s.fill(7 + sw, ty + 1, 2, 4, spec.coat ? '#e8e8e4' : shirtD); s.fill(7 + sw, ty + 5, 2, 1, skin);
    } else {
      const la = step > 0 ? -1 : 0, ra = step < 0 ? -1 : 0;
      s.fill(3, ty + 1 + la, 1, 4, spec.coat ? '#e8e8e4' : shirtD); s.px(3, ty + 5 + la, skin);
      s.fill(12, ty + 1 + ra, 1, 4, spec.coat ? '#d8d8dc' : shirtD); s.px(12, ty + 5 + ra, skin);
    }
    if (spec.cane && !back) { s.vline(side ? 3 : 13, ty + 2, 8 - bob, P.woodD); s.px(side ? 4 : 12, ty + 2, P.woodD); }

    // ---- head ----
    const hy = bob;
    const hx0 = 3, hw = 10;
    for (let y = 0; y < 10; y++) for (let x = 0; x < hw; x++) {
      const nx = (x + 0.5 - hw / 2) / (hw / 2), ny = (y + 0.5 - 5.2) / 5.2;
      if (nx * nx + ny * ny > 1.05) continue;
      s.px(hx0 + x, hy + y + 1, x > hw - 3 ? skinD : skin);
    }
    // hair
    const H = (x, y, c) => s.px(x, hy + y, c === undefined ? hair : c);
    const style = spec.style || 'short';
    if (back) {
      for (let y = 1; y < 10; y++) for (let x = 3; x < 13; x++) { const nx = (x - 7.5) / 5, ny = (y - 5.5) / 5; if (nx * nx + ny * ny <= 1.05) H(x, y, x > 10 ? hairD : (y < 3 ? hairL : hair)); }
      if (style === 'long' || style === 'pigtails') for (let y = 8; y < 13; y++) { H(4, y); H(5, y); H(10, y); H(11, y, hairD); }
      if (style === 'bun') { for (let x = 6; x < 10; x++) for (let y = 0; y < 3; y++) H(x, y, y === 0 ? hairL : hair); }
      if (style === 'balding') for (let y = 1; y < 5; y++) for (let x = 5; x < 11; x++) H(x, y, x > 9 ? skinD : skin);
    } else if (side) {
      for (let y = 1; y < 6; y++) for (let x = 4; x < 13; x++) { const nx = (x - 8) / 5, ny = (y - 5) / 4.5; if (nx * nx + ny * ny <= 1 && (y < 4 || x > 7)) H(x, y, y < 2 ? hairL : hair); }
      for (let y = 4; y < 9; y++) { H(10, y); H(11, y, hairD); H(12, y, hairD); }
      if (style === 'long' || style === 'pigtails') for (let y = 8; y < 13; y++) { H(10, y); H(11, y, hairD); }
      if (style === 'spiky') { H(12, 1); H(13, 2); H(13, 4); H(9, 0); H(6, 0); }
      if (style === 'bun') for (let x = 10; x < 14; x++) for (let y = 1; y < 4; y++) H(x, y);
      if (style === 'balding') for (let y = 1; y < 4; y++) for (let x = 4; x < 10; x++) H(x, y, skin);
      // face: eye and nose
      s.px(5, hy + 6, P.ink); s.px(5, hy + 7, P.ink);
      s.px(3, hy + 7, skinD);
      if (spec.beard) { for (let x = 3; x < 9; x++) { H(x, 9, spec.beard); H(x, 10, spec.beard); } H(4, 8, spec.beard); }
    } else {
      for (let y = 1; y < 5; y++) for (let x = 3; x < 13; x++) { const nx = (x - 7.5) / 5, ny = (y - 5) / 4; if (nx * nx + ny * ny <= 1.05) H(x, y, y < 2 ? hairL : hair); }
      H(3, 5); H(3, 6); H(12, 5, hairD); H(12, 6, hairD);
      if (style !== 'balding') { H(4, 5); H(6, 5); H(9, 5); H(11, 5, hairD); }
      if (style === 'long' || style === 'pigtails') for (let y = 6; y < 12; y++) { H(2, y); H(3, y); H(12, y, hairD); H(13, y, hairD); }
      if (style === 'pigtails') { H(1, 9); H(1, 10); H(14, 9, hairD); H(14, 10, hairD); }
      if (style === 'spiky') { H(4, 0); H(7, 0); H(10, 0); H(2, 3); H(13, 3); H(5, 5); H(8, 5); }
      if (style === 'bun') for (let x = 6; x < 10; x++) H(x, 0);
      if (style === 'balding') for (let y = 1; y < 4; y++) for (let x = 5; x < 11; x++) H(x, y, y === 1 ? shade(skin, 0.1) : skin);
      // eyes and blush
      s.px(5, hy + 6, P.ink); s.px(5, hy + 7, P.ink); s.px(10, hy + 6, P.ink); s.px(10, hy + 7, P.ink);
      s.px(4, hy + 8, '#e89a88'); s.px(11, hy + 8, '#e89a88');
      if (spec.beard) { for (let x = 4; x < 12; x++) { H(x, 9, spec.beard); H(x, 10, x > 5 && x < 10 ? spec.beard : undefined); } s.px(7, hy + 8, spec.beard); s.px(8, hy + 8, spec.beard); }
    }
    // hats
    if (spec.hat) {
      const hc = hex(spec.hatCol), hcD = shade(hc, -0.25), hcL = shade(hc, 0.2);
      const band = spec.hatBand ? hex(spec.hatBand) : hcD;
      const cap = (y0, w) => { for (let y = 0; y < 3; y++) for (let x = 0; x < w; x++) s.px(8 - w / 2 + x, hy + y0 + y, y === 0 ? hcL : x > w - 3 ? hcD : hc); };
      if (spec.hat === 'cap') {
        cap(1, 10); s.hline(4, hy + 3, 8, band);
        if (!back && !side) { s.hline(3, hy + 4, 10, hcD); }
        if (side) { s.hline(1, hy + 4, 5, hcD); s.hline(2, hy + 3, 3, hc); }
        if (back) s.hline(5, hy + 4, 6, hcD);
      } else if (spec.hat === 'captain' || spec.hat === 'conductor') {
        for (let y = 0; y < 4; y++) for (let x = 0; x < 12; x++) s.px(2 + x, hy + y, y === 0 ? hcL : hc);
        s.hline(2, hy + 3, 12, band);
        if (!back) { if (side) s.hline(1, hy + 4, 5, P.ink); else s.hline(3, hy + 4, 10, P.ink); }
        if (!back && !side) { s.px(7, hy + 1, spec.hatBand); s.px(8, hy + 1, spec.hatBand); }
        if (spec.hat === 'captain') { s.px(2, hy, P.white); s.px(13, hy, P.white); }
      } else if (spec.hat === 'hard') {
        for (let y = 0; y < 4; y++) for (let x = 0; x < 10 + (y === 3 ? 2 : 0); x++) s.px(3 + x - (y === 3 ? 1 : 0), hy + y, y === 0 ? hcL : y === 3 ? hcD : hc);
        s.vline(8, hy, 3, hcL);
      } else if (spec.hat === 'beanie' || spec.hat === 'bucket' || spec.hat === 'goggles') {
        cap(0, 10); s.hline(3, hy + 3, 10, spec.hat === 'bucket' ? hcD : band);
        if (spec.hat === 'bucket') { s.hline(2, hy + 4, 12, hcD); }
        if (spec.hat === 'goggles' && !back) { s.fill(side ? 3 : 4, hy + 3, side ? 3 : 3, 2, '#6ab0c8'); if (!side) s.fill(9, hy + 3, 3, 2, '#6ab0c8'); }
      } else if (spec.hat === 'nurse') {
        s.fill(5, hy, 6, 3, hc); s.px(7, hy + 1, P.red); s.px(8, hy + 1, P.red);
      }
    }
    return outline(s, P.ink);
  }

  function frames(name, overrides) {
    const key = name + (overrides ? JSON.stringify(overrides) : '');
    let f = cache.get(key);
    if (f) return f;
    const spec = Object.assign({}, CAST[name] || CAST.youngster, overrides || {});
    f = {};
    for (const d of ['down', 'up', 'left']) f[d] = [0, 1, 2].map(i => paint(spec, d, i));
    f.right = f.left.map(src => { const s = new Surface(CW, CH); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) s.data[y * CW + x] = src.data[y * CW + (CW - 1 - x)]; return s; });
    cache.set(key, f);
    return f;
  }
  // walk cycle: stand, step, stand, step
  function frameFor(anim) { return [0, 1, 0, 2][anim & 3]; }

  CD.chars = { CAST, frames, frameFor, CW, CH };
})(window.CD);
