// Battle effects. Each effect is a pure function of the frame number: draw(s, f, c)
// where c holds the attacker and target centres (a, b), a type colour, and whether
// the attacker is the player (so effects travel the right way). Nothing is stored
// between frames, so any frame can be drawn at any time.
(function (CD) {
  'use strict';
  const { mix, shade, hash2 } = CD.gfx;
  const P = CD.pal;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

  function ring(s, cx, cy, r, col, a, thick) {
    thick = thick || 1.2;
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const d = Math.abs(Math.hypot(x - cx, (y - cy) * 1.15) - r);
      if (d < thick) s.blend(x, y, col, a * (1 - d / thick));
    }
  }
  function puff(s, x, y, r, col, a) { s.ellipseA(x, y, r, r * 0.85, col, a); s.ellipseA(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.4, '#ffffff', a * 0.5); }
  function bolt(s, x0, y0, x1, y1, col, seed) {
    const n = 7; let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const jx = i === n ? 0 : (hash2(i, seed, 3) - 0.5) * 12, jy = i === n ? 0 : (hash2(seed, i, 4) - 0.5) * 6;
      const x = lerp(x0, x1, t) + jx, y = lerp(y0, y1, t) + jy;
      s.line(px, py, x, y, '#ffffff'); s.line(px + 1, py, x + 1, y, col);
      px = x; py = y;
    }
  }
  function sparkle(s, x, y, size, col) {
    s.px(x, y, '#ffffff');
    for (let i = 1; i <= size; i++) { s.blend(x + i, y, col, 1 - i / (size + 1)); s.blend(x - i, y, col, 1 - i / (size + 1)); s.blend(x, y + i, col, 1 - i / (size + 1)); s.blend(x, y - i, col, 1 - i / (size + 1)); }
  }

  // Each: { len, lunge?: 'tackle'|'dash', shake?, flash?, draw(s, f, c) }
  const FX = {
    bump: { len: 20, lunge: 'tackle', draw(s, f, c) { if (f > 8 && f < 16) for (let i = 0; i < 5; i++) sparkle(s, c.b.x + Math.cos(i * 1.3) * (f - 6) * 1.6, c.b.y + Math.sin(i * 1.3) * (f - 6), 2, '#fff0c0'); } },
    dash: { len: 24, lunge: 'dash', draw(s, f, c) {
      if (f < 14) for (let i = 0; i < 8; i++) { const y = c.a.y - 16 + i * 5, x = c.a.x - c.dir * (10 + ((f * 7 + i * 13) % 30)); s.hline(Math.round(x), y, 10, '#ffffff'); }
      if (f > 10 && f < 20) ring(s, c.b.x, c.b.y, (f - 10) * 3, '#fff8d0', 1 - (f - 10) / 10, 1.5);
    } },
    multi: { len: 30, lunge: 'tackle', draw(s, f, c) { const k = f % 10; if (k > 3 && k < 8) for (let i = 0; i < 4; i++) sparkle(s, c.b.x + (hash2(f, i, 1) - 0.5) * 30, c.b.y + (hash2(i, f, 2) - 0.5) * 20, 3, '#fff0c0'); } },
    crunch: { len: 24, draw(s, f, c) {
      const t = ease(f / 12), gap = f < 12 ? 22 - t * 18 : 4;
      for (const sgn of [-1, 1]) { const y = c.b.y + sgn * gap; s.fill(c.b.x - 16, Math.round(y) - 3, 32, 6, '#3a3a48'); s.hline(c.b.x - 16, Math.round(y) - 3, 32, '#8a8a98'); for (let x = -14; x < 16; x += 6) s.fill(c.b.x + x, Math.round(y) + (sgn < 0 ? 3 : -5), 3, 2, '#e8e8f0'); }
    } },
    slash: { len: 18, draw(s, f, c) { for (let i = 0; i < 3; i++) { const t = ease((f - i * 3) / 8); if (t <= 0) continue; const x0 = c.b.x - 18 + i * 8, y0 = c.b.y - 18; s.line(x0, y0, x0 + 24 * t, y0 + 30 * t, '#ffffff'); s.line(x0 + 1, y0, x0 + 1 + 24 * t, y0 + 30 * t, c.col); } } },
    quake: { len: 30, shake: 3, draw(s, f, c) { for (let i = 0; i < 10; i++) { const x = c.b.x + (hash2(i, 1, 1) - 0.5) * 60, y = c.b.y + 12 - ((f * 2 + i * 7) % 26); s.fillA(Math.round(x), Math.round(y), 3, 3, '#8a7a6a', 0.9); } } },
    coal: { len: 30, draw(s, f, c) { for (let i = 0; i < 4; i++) { const t = ease((f - i * 4) / 16); if (t <= 0 || t >= 1) continue; const x = lerp(c.a.x, c.b.x, t), y = lerp(c.a.y, c.b.y, t) - Math.sin(t * Math.PI) * 26; s.ellipse(x, y, 3, 3, '#2a2230'); s.px(Math.round(x) - 1, Math.round(y) - 1, '#f08040'); } if (f > 18) for (let i = 0; i < 6; i++) puff(s, c.b.x + (hash2(i, 5, 1) - 0.5) * 24, c.b.y - (f - 18) * 1.2 + (hash2(5, i, 1) - 0.5) * 10, 3, '#f06030', 0.7 - (f - 18) / 16); } },
    ember: { len: 26, draw(s, f, c) { for (let i = 0; i < 7; i++) { const t = ease((f - i * 2) / 14); if (t <= 0 || t >= 1.01) continue; const x = lerp(c.a.x, c.b.x, t) + Math.sin(f * 0.6 + i) * 3, y = lerp(c.a.y, c.b.y, t) + (i - 3) * 2; s.ellipse(x, y, 2.4, 2.4, '#f8a040'); s.px(Math.round(x), Math.round(y), '#fff0a0'); } } },
    steam: { len: 34, draw(s, f, c) { for (let i = 0; i < 9; i++) { const t = (f - i * 2) / 18; if (t <= 0 || t > 1.4) continue; const tt = Math.min(1, t); const x = lerp(c.a.x, c.b.x, tt) + Math.sin(i * 2 + f * 0.3) * 4, y = lerp(c.a.y, c.b.y, tt) - 4 + Math.cos(i) * 5; puff(s, x, y, 3 + tt * 4, '#f4f0ea', Math.max(0, 0.9 - (t - 1) * 2)); } } },
    burst: { len: 32, flash: 4, draw(s, f, c) { const t = f / 32; for (let k = 0; k < 3; k++) ring(s, c.b.x, c.b.y, 4 + (f - k * 4) * 2.2, k ? c.col : '#fff8d0', Math.max(0, 1 - t - k * 0.2), 2); if (f < 14) s.ellipseA(c.b.x, c.b.y, 4 + f * 1.4, 3 + f, '#fff8e0', 0.8 - f / 18); } },
    smoke: { len: 36, draw(s, f, c) { for (let i = 0; i < 12; i++) { const t = (f - i) / 24; if (t <= 0) continue; puff(s, c.b.x + (hash2(i, 2, 7) - 0.5) * 50 * Math.min(1, t * 1.5), c.b.y + (hash2(2, i, 7) - 0.5) * 24 - t * 8, 4 + t * 5, '#6a6470', Math.max(0, 0.85 - t * 0.6)); } } },
    spark: { len: 24, lunge: 'tackle', draw(s, f, c) { if (f > 6) for (let i = 0; i < 3; i++) bolt(s, c.b.x - 14 + i * 12, c.b.y - 18, c.b.x - 8 + i * 10, c.b.y + 12, c.col, f + i * 7); } },
    zap: { len: 22, draw(s, f, c) { const t = ease(f / 12); bolt(s, c.a.x, c.a.y - 10, lerp(c.a.x, c.b.x, t), lerp(c.a.y - 10, c.b.y, t), c.col, (f >> 1)); if (f > 12) ring(s, c.b.x, c.b.y, (f - 12) * 2.5, c.col, 1 - (f - 12) / 10); } },
    bolt: { len: 30, flash: 3, draw(s, f, c) { if (f % 6 < 4) { bolt(s, c.b.x + 6, -4, c.b.x - 2, c.b.y, '#f8e060', f >> 2); bolt(s, c.b.x - 10, -4, c.b.x + 4, c.b.y + 4, '#f8e060', (f >> 2) + 9); } if (f > 8) ring(s, c.b.x, c.b.y, (f - 8) * 1.6, '#f8f0a0', 1 - (f - 8) / 22, 2); } },
    beam: { len: 28, draw(s, f, c) { const t = ease(f / 10); const x1 = lerp(c.a.x, c.b.x, t), y1 = lerp(c.a.y, c.b.y, t); for (let w = -2; w <= 2; w++) s.line(c.a.x, c.a.y + w, x1, y1 + w, Math.abs(w) < 1 ? '#ffffff' : c.col); if (f > 10) ring(s, c.b.x, c.b.y, 4 + (f - 10) * 1.5, c.col, 1 - (f - 10) / 18, 2); } },
    charge: { len: 28, draw(s, f, c) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + f * 0.1, r = 26 - f * 0.8; if (r > 2) sparkle(s, c.a.x + Math.cos(a) * r, c.a.y + Math.sin(a) * r * 0.8, 2, c.col); } } },
    splat: { len: 26, draw(s, f, c) { for (let i = 0; i < 6; i++) { const t = ease((f - i * 2) / 12); if (t <= 0) continue; const x = lerp(c.a.x, c.b.x + (i - 3) * 5, t), y = lerp(c.a.y, c.b.y + (hash2(i, 1, 9) - 0.5) * 16, t) - Math.sin(t * Math.PI) * 14; s.ellipse(x, y, t >= 1 ? 4 : 2.5, t >= 1 ? 2 : 2.5, c.col); } } },
    soundwave: { len: 30, draw(s, f, c) { for (let k = 0; k < 4; k++) { const t = (f - k * 5) / 18; if (t <= 0 || t > 1) continue; const x = lerp(c.a.x, c.b.x, t), y = lerp(c.a.y, c.b.y, t); ring(s, x, y, 5 + t * 8, '#fff8e0', 1 - t * 0.5, 1.2); } } },
    pulse: { len: 30, draw(s, f, c) { for (let k = 0; k < 4; k++) { const r = (f - k * 5) * 2; if (r > 0) ring(s, c.b.x, c.b.y, r, c.col, Math.max(0, 1 - r / 44), 1.6); } } },
    crate: { len: 28, shake: 2, draw(s, f, c) { const t = ease(f / 12); const y = lerp(-20, c.b.y - 6, t); s.fill(c.b.x - 9, Math.round(y) - 9, 18, 16, P.wood); s.rect(c.b.x - 9, Math.round(y) - 9, 18, 16, P.woodDD); s.line(c.b.x - 8, Math.round(y) - 8, c.b.x + 8, Math.round(y) + 6, P.woodD); if (f > 12) for (let i = 0; i < 5; i++) puff(s, c.b.x + (i - 2) * 7, c.b.y + 10, 3 + (f - 12) * 0.2, '#c8b8a0', 0.8 - (f - 12) / 16); } },
    gravel: { len: 30, draw(s, f, c) { for (let i = 0; i < 12; i++) { const t = ease((f - i) / 12); if (t <= 0 || t >= 1) continue; const x = lerp(c.a.x, c.b.x + (hash2(i, 3, 3) - 0.5) * 24, t), y = lerp(c.a.y, c.b.y + (hash2(3, i, 3) - 0.5) * 16, t) - Math.sin(t * Math.PI) * 18; s.fill(Math.round(x), Math.round(y), 2, 2, i % 2 ? '#8a847e' : '#aca49a'); } } },
    anchor: { len: 30, shake: 2, draw(s, f, c) { const t = ease(f / 14); const y = lerp(-24, c.b.y, t); s.vline(c.b.x, Math.round(y) - 14, 18, '#3a3a48'); s.hline(c.b.x - 5, Math.round(y) - 10, 11, '#3a3a48'); for (let i = -7; i <= 7; i++) s.px(c.b.x + i, Math.round(y) + 4 - Math.round(Math.abs(i) * 0.6), '#3a3a48'); s.line(c.b.x, -30, c.b.x, Math.round(y) - 14, '#8a7a6a'); } },
    wave: { len: 36, draw(s, f, c) { const x0 = lerp(c.b.x - c.dir * 70, c.b.x + c.dir * 20, f / 36); for (let x = -26; x <= 26; x++) { const h = 22 * Math.exp(-(x * x) / 180); const xx = Math.round(x0 + x); for (let y = 0; y < h; y++) s.blend(xx, c.b.y + 14 - y, y > h - 3 ? '#e8f8ff' : '#4f8fc8', 0.8); } } },
    float: { len: 26, draw(s, f, c) { for (let i = 0; i < 6; i++) { const y = c.a.y + 20 - ((f * 2 + i * 9) % 36), x = c.a.x - 16 + i * 6; s.blend(x, y, c.col, 0.9); s.blend(x, y - 1, '#ffffff', 0.7); } } },
    frost: { len: 30, draw(s, f, c) { for (let i = 0; i < 10; i++) { const t = ease((f - i) / 14); if (t <= 0) continue; const x = lerp(c.a.x, c.b.x + (hash2(i, 1, 4) - 0.5) * 30, t), y = lerp(c.a.y, c.b.y + (hash2(1, i, 4) - 0.5) * 20, t); sparkle(s, Math.round(x), Math.round(y), 3, '#c8f0ff'); } } },
    glow: { len: 32, draw(s, f, c) { for (let i = 0; i < 8; i++) { const t = (f - i * 2) / 16; if (t <= 0 || t > 1.3) continue; const tt = Math.min(1, t); puff(s, lerp(c.a.x, c.b.x, tt) + Math.sin(i * 3) * 6, lerp(c.a.y, c.b.y, tt) + Math.cos(i * 2) * 6, 3, '#b8f060', Math.max(0, 0.9 - (t - 1) * 3)); } } },
    flash: { len: 20, flash: 6, draw(s, f, c) { ring(s, c.b.x, c.b.y, f * 3, '#ffffff', 1 - f / 20, 2); } },
    drain: { len: 36, draw(s, f, c) { for (let i = 0; i < 8; i++) { const t = ease((f - i * 2) / 20); if (t <= 0 || t >= 1) continue; const x = lerp(c.b.x, c.a.x, t) + Math.sin(t * 6 + i) * 8, y = lerp(c.b.y, c.a.y, t) + Math.cos(t * 5 + i) * 6; sparkle(s, Math.round(x), Math.round(y), 2, '#b8f060'); } } },
    heal: { len: 34, draw(s, f, c) { for (let i = 0; i < 8; i++) { const y = c.a.y + 18 - ((f * 1.5 + i * 7) % 34), x = c.a.x - 18 + i * 5; sparkle(s, x, Math.round(y), 2, '#a8f0c0'); } } },
    brace: { len: 26, draw(s, f, c) { ring(s, c.a.x, c.a.y, 24 - Math.abs(13 - f), '#c8d8f0', 0.8, 2); } },
    shield: { len: 28, draw(s, f, c) { for (let k = 0; k < 2; k++) ring(s, c.a.x, c.a.y, 18 + k * 5, c.col, 0.6 + 0.3 * Math.sin(f * 0.5), 1.5); } },
    stoke: { len: 28, draw(s, f, c) { for (let i = 0; i < 6; i++) { const y = c.a.y + 10 - ((f * 2 + i * 9) % 30); s.ellipseA(c.a.x - 12 + i * 5, y, 2, 3, '#f8a040', 0.9); } } },
    rev: { len: 26, shake: 1, draw(s, f, c) { for (let i = 0; i < 5; i++) puff(s, c.a.x + c.dir * -20 - ((f * 2 + i * 6) % 18) * c.dir, c.a.y + 8 - i, 3, '#5a5460', 0.7); } },
    sparks: { len: 24, draw(s, f, c) { for (let i = 0; i < 8; i++) { const t = (f + i * 3) % 12; s.px(c.b.x + (i - 4) * 4 + t, c.b.y + 14 - t * 1.5, '#f8e060'); s.px(c.b.x + (i - 4) * 4 + t + 1, c.b.y + 14 - t * 1.5, '#f8a040'); } } },
  };
  // Condition effects shown at end of turn
  const STATUS_FX = {
    brn: { len: 24, draw(s, f, c) { for (let i = 0; i < 6; i++) { const y = c.a.y + 10 - ((f * 1.5 + i * 7) % 24); s.ellipseA(c.a.x - 14 + i * 6, y, 2, 3, '#f06030', 0.9); } } },
    psn: { len: 24, draw(s, f, c) { for (let i = 0; i < 6; i++) { const y = c.a.y + 8 - ((f + i * 5) % 20); puff(s, c.a.x - 12 + i * 5, y, 2, '#a060d0', 0.8); } } },
  };
  function get(name) { return FX[name] || FX.bump; }

  CD.vfx = { FX, STATUS_FX, get, ring, sparkle, puff };
})(window.CD);
