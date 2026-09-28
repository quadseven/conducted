// Render a sheet of species sprites: node tests/sheet.js out.png [ids...]
'use strict';
const H = require('./harness.js');
const h = H.load();
const CD = h.CD;
const ids = process.argv.slice(3).map(Number);
const list = ids.length ? ids : CD.species.all().map(s => s.id);
const cols = Math.min(8, list.length), rows = Math.ceil(list.length / cols);
const s = new CD.gfx.Surface(cols * 68, rows * 76);
s.clear('#e8e0d0');
list.forEach((id, i) => {
  const x = (i % cols) * 68 + 2, y = Math.floor(i / cols) * 76 + 2;
  s.blit(CD.trainArt.sprite(id, 'front'), x, y);
  CD.font.draw(s, String(CD.species.get(id).name).slice(0, 11), x, y + 64, '#241c30');
});
H.writePNG(process.argv[2], s, 3);
