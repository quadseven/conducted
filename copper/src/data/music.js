// The soundtrack. Melodies are written by hand in the MML dialect of core/audio.js;
// harmony, bass and drum bars are generated from each song's chord chart so a
// song reads as melody + progression. Keys, tempos and progressions follow
// AUDIO_SPECIFICATIONS.md (Piston Town in C at 102, Coal Harbor a 6/8 shanty in
// D minor turning to D major, and so on).
(function (CD) {
  'use strict';
  const NAMES = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
  const ROOT = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6], sus4: [0, 5, 7], aug: [0, 4, 8], maj7: [0, 4, 7, 11] };
  function parse(ch) {
    const m = /^([A-G][#b]?)(.*)$/.exec(ch);
    if (!m || !(m[2] in QUAL)) throw new Error('unknown chord ' + ch);   // fail at load, never mid-song
    return { root: ROOT[m[1]], iv: QUAL[m[2]] };
  }
  // absolute note (octave, semitone) -> MML token with explicit octave
  function n(oct, semi, len) { const o = oct + Math.floor(semi / 12); return 'o' + o + NAMES[((semi % 12) + 12) % 12] + (len || ''); }
  function tones(ch, oct) { const c = parse(ch); return c.iv.map(i => [oct, c.root + i]); }

  // Harmony bars
  const ARP = {
    up8: (ch, o) => { const t = tones(ch, o); const seq = [t[0], t[2], t[1], t[2]]; return [...seq, ...seq].map(([a, b]) => n(a, b, 8)).join(' '); },
    roll8: (ch, o) => { const t = tones(ch, o); const seq = [t[0], t[1], t[2], [t[0][0] + 1, t[0][1]], t[2], t[1], t[2], t[1]]; return seq.map(([a, b]) => n(a, b, 8)).join(' '); },
    stab: (ch, o) => { const t = tones(ch, o); return `r8 ${n(t[1][0], t[1][1], 8)} r8 ${n(t[2][0], t[2][1], 8)} r8 ${n(t[1][0], t[1][1], 8)} r8 ${n(t[2][0], t[2][1], 8)}`; },
    hold: (ch, o) => { const t = tones(ch, o); return `${n(t[1][0], t[1][1], 2)} ${n(t[2][0], t[2][1], 2)}`; },
    waltz: (ch, o) => { const t = tones(ch, o); return `${n(t[0][0], t[0][1], 8)} ${n(t[2][0], t[2][1], 8)} ${n(t[1][0], t[1][1], 8)} ${n(t[2][0], t[2][1], 8)} ${n(t[1][0], t[1][1], 8)} ${n(t[2][0], t[2][1], 8)}`; },
    sixteenths: (ch, o) => { const t = tones(ch, o); const seq = [t[0], t[1], t[2], t[1]]; return [...seq, ...seq, ...seq, ...seq].map(([a, b]) => n(a, b, 16)).join(' '); },
  };
  const BASS = {
    root5: (ch, o) => { const c = parse(ch); return `${n(o, c.root, 4)} ${n(o, c.root + 7, 4)} ${n(o, c.root, 4)} ${n(o, c.root + 7, 4)}`; },
    walk: (ch, o) => { const c = parse(ch); return `${n(o, c.root, 4)} ${n(o, c.root + c.iv[1], 4)} ${n(o, c.root + 7, 4)} ${n(o, c.root + c.iv[1], 4)}`; },
    pump: (ch, o) => { const c = parse(ch); return `${n(o, c.root, 8)} ${n(o, c.root, 8)} ${n(o + 1, c.root, 8)} ${n(o, c.root, 8)} ${n(o, c.root + 7, 8)} ${n(o, c.root, 8)} ${n(o + 1, c.root, 8)} ${n(o, c.root + 7, 8)}`; },
    long: (ch, o) => { const c = parse(ch); return `${n(o, c.root, 2)} ${n(o, c.root + 7, 2)}`; },
    six8: (ch, o) => { const c = parse(ch); return `${n(o, c.root, 8)} ${n(o + 1, c.root, 8)} ${n(o, c.root + 7, 8)} ${n(o, c.root, 8)} ${n(o + 1, c.root, 8)} ${n(o, c.root + 7, 8)}`; },
    march: (ch, o) => { const c = parse(ch); return `${n(o, c.root, 8)} r8 ${n(o, c.root + 7, 8)} r8 ${n(o, c.root, 8)} ${n(o, c.root, 8)} ${n(o, c.root + 7, 8)} r8`; },
  };
  const DRUM = {
    soft: '[k8 h8 s8 h8]2', chug: '[k16 h16 h16 h16 s16 h16 h16 h16]2', drive: 'k8 h8 s8 k8 k8 h8 s8 h8',
    six8: 'k8 h8 h8 k8 h8 s8', rest: 'r1', march: 'k8 k8 s8 h8 k8 h8 s8 s16 s16',
  };
  function bars(chart, fn, oct) { return chart.map(ch => ch === '-' ? 'r1' : fn(ch, oct)).join(' '); }

  function song(id, def) {
    const ch = [def.lead];
    const pre = def.intro || [];
    const chart = def.chart;
    if (def.arp) ch.push(`v${def.arpVol || 6} @${def.arpDuty === undefined ? 1 : def.arpDuty} q6 ${bars(pre, ARP[def.arp], def.arpOct || 4)} | ${bars(chart, ARP[def.arp], def.arpOct || 4)}`);
    if (def.bass) ch.push(`v12 @3 q7 ${bars(pre, BASS[def.bass], def.bassOct || 3)} | ${bars(chart, BASS[def.bass], def.bassOct || 3)}`);
    if (def.drum) ch.push(`v${def.drumVol || 7} ${pre.map(() => DRUM[def.drum]).join(' ')} | ${chart.map((_, i) => (def.fill && i % 8 === 7) ? DRUM[def.fill] : DRUM[def.drum]).join(' ')}`);
    CD.audio.define(id, { bpm: def.bpm, ch, loop: def.loop });
  }

  // ---------------------------------------------------------------- Title
  song('title', {
    bpm: 138, arp: 'stab', arpOct: 4, bass: 'march', bassOct: 2, drum: 'chug', drumVol: 6,
    intro: ['G', 'D'],
    lead: `v11 @1 q7 o5 r1 r2 d8 e8 f+8 a8 |
      d4. d8 g4 b4  a4. f+8 d4 a4  b4. g8 e4 b4  a8 b8 a8 g8 e4 g4
      d4. d8 g4 b4  >d4. c8< b4 a4  g4 e8 g8 >c4 e4  d2< a4 f+4
      e4 g4 >c4. <b8  a4 f+4 d4. e8  f+4 b4 >d4. c+8<  b2 g4 e4
      e8 f+8 g8 a8 b4 >c4<  >d4 c8< b8 a4 f+4  g2 b4 >d4<  g2 r2`,
    chart: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'G'],
  });

  // ---------------------------------------------------------------- Piston Town
  song('piston', {
    bpm: 102, arp: 'up8', arpOct: 4, arpVol: 5, bass: 'root5', bassOct: 3, drum: 'soft', drumVol: 4,
    intro: ['C', 'G'],
    lead: `v10 @0 q7 o5 r1 r1 |
      e4 g4 >c4< b8 a8  a4 e4 c4 e8 g8  f4 a4 g8 f8 e8 d8  d4 g8 f8 e4 d4
      e4 g4 >c4< b8 >c8  d4 c4< a4 g8 e8  f8 e8 f8 a8 g4 d4  c2. r4
      a4. g8 f4 a4  g4. f8 e4 d4  e4 g4 b4 g4  a2 e4 g4
      a4 >c4< a4 f4  g4 b4 >d4 c8< b8  >c2< g4 e4  c2 r2`,
    chart: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
  });

  // ---------------------------------------------------------------- Professor's lab
  song('lab', {
    bpm: 112, arp: 'roll8', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'walk', bassOct: 2, drum: 'soft', drumVol: 3,
    lead: `v10 @1 q6 o5 |
      c8 f8 a8 f8 >c4< a4  d8 f8 a8 f8 >d4< a4  b-8 a8 g8 f8 d4 f4  e8 f8 g8 a8 g4 c4
      c8 f8 a8 >c8 f4 c4<  a8 g8 f8 a8 >d4< a4  b8 a8 g8 b8 >d4 c4<  g2 e4 c4`,
    chart: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'G', 'C'],
  });

  // ---------------------------------------------------------------- Route 1
  song('route1', {
    bpm: 132, arp: 'stab', arpOct: 4, arpVol: 6, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 6, fill: 'march',
    lead: `v11 @1 q7 o5 |
      f+8 a8 >d4< a8 f+8 d8 f+8  e8 a8 >c+4< a8 e8 c+8 e8  f+8 d8 f+8 b8 a4 f+4  g8 f+8 e8 d8 e4. r8
      f+8 a8 >d4< a8 >d8 f+8 e8<  e8 c+8 e8 a8 g+8 a8 b8 >c+8<  >d4 c+8< b8 a4 g4  e4 a8 g8 f+4 e4
      b4. a8 g4 b4  a4 >c+4< e4 a4  f+4 a4 >c+4< a8 f+8  b2 >d4 c+4<
      b8 >c+8 d8 c+8< b4 g4  a8 b8 >c+8 d8 e4 c+4<  >d4< a4 f+4 a4  >d2< r2`,
    chart: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D'],
  });

  // ---------------------------------------------------------------- Coal Harbor (6/8)
  song('harbor', {
    bpm: 168, arp: 'waltz', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'six8', bassOct: 2, drum: 'six8', drumVol: 6,
    intro: ['Dm', 'Dm'],
    lead: `v11 @1 q7 o6 d4. r4. o5 a4. r4. |
      d4 f8 a4 f8  c4 f8 a4 >c8<  g4 e8 c4 e8  d4 g8 a+4 a8
      a4 >d8 c4< a8  f4 a8 g4 f8  e4 g8 f4 e8  d4. r4.
      f+4 a8 >d4< a8  g4 b8 >d4< b8  a4 >c+8 e4 c+8<  b4 >d8< b4 f+8
      g4 b8 a4 g8  f+4 e8 c+4 e8  d4 f+8 a4 >d8<  d4. r4.`,
    chart: ['Dm', 'F', 'C', 'Gm', 'Dm', 'F', 'C', 'Dm', 'D', 'G', 'A', 'Bm', 'G', 'A', 'D', 'D'],
  });

  // ---------------------------------------------------------------- Depot and Mart
  song('depot', {
    bpm: 96, arp: 'roll8', arpOct: 4, arpVol: 4, arpDuty: 0, bass: 'long', bassOct: 2,
    lead: `v9 @0 q7 o5 |
      b4. a8 g4 d4  e4 g4 b2  a4 g4 e4 g4  f+4 a4 d2
      b4. >c8 d4< b4  a4 g4 e2  e8 f+8 g4 a4 b4  a2 d2`,
    chart: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'],
  });

  // ---------------------------------------------------------------- Gym
  song('gym', {
    bpm: 144, arp: 'sixteenths', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 7, fill: 'march',
    lead: `v11 @1 q7 o5 |
      e4 g8 b8 >e4< b4  >c4< g8 e8 g4 e4  d4 f+8 a8 >d4< a4  f+4 b8 >d+8 f+4 d+4<
      e4 e8 g8 b4 >e4<  >c4< b8 a8 g4 e4  a4 >c8 e8 d4 c4<  b4 >d+4 f+4< b4`,
    chart: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'],
  });


  // ---------------------------------------------------------------- Battles
  song('wild', {
    bpm: 160, arp: 'sixteenths', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 7, fill: 'march',
    intro: ['E', 'B'],
    lead: `v11 @1 q7 o5 r1 r2 b8 >d8 e8 f+8< |
      e8 g8 b8 >e4 d8< b8 g8  e8 g8 >c4< b8 g8 e4  f+8 a8 >d4 c8< a8 f+8 d8  d+8 f+8 b4 a8 f+8 d+4
      e4 b4 >e8 d8 c8< b8  >c4 e4 d8 c8< b8 a8  a4 >c4 e8 d8 c8< a8  b2 >d+4 f+4<
      >c4< g4 e8 f+8 g8 a8  b4 a8 g8 f+4 d4  f+4 b4 >d8 c+8< b8 a8  g4 e4 b2
      >c8< b8 a8 g8 e4 g4  a8 g8 f+8 e8 d4 f+4  d+4 f+4 a4 >c4<  b2 r4 b4`,
    chart: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'B', 'B'],
  });
  song('trainer', {
    bpm: 152, arp: 'sixteenths', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 7, fill: 'march',
    intro: ['Am', 'E'],
    lead: `v11 @1 q7 o5 r1 r2 e8 g+8 b8 >d8< |
      a8 >c8 e8 a4 g8 e8 c8<  a8 >c8 f4 e8 c8< a4  b8 >d8 g4 f8 d8< b4  g+8 b8 >e4 d8< b8 g+4
      a4 e4 a8 b8 >c8 d8<  >e4 d8 c8< a4 f4  f4 a4 >d8 c8< a8 f8  e2 g+4 b4
      >c4< a8 >c8 f4 e4<  >d4< b8 >d8 g4 f4<  e4 g4 b8 a8 g8 e8  a2 >c4 e4<
      >d8 c8< a8 f8 d4 f4  e8 f8 g+8 a8 b4 >d4<  >c4< a4 e4 c4  <b2 >e4 g+4`,
    chart: ['Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'Em', 'Am', 'Dm', 'E', 'Am', 'E'],
  });
  song('leader', {
    bpm: 164, arp: 'sixteenths', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 8, fill: 'march',
    intro: ['Cm', 'G'],
    lead: `v11 @1 q7 o5 r1 r2 g8 a-8 b8 >d8< |
      c8 e-8 g8 >c4< g8 e-8 c8  c8 e-8 a-4 g8 e-8 c4  d8 f8 b-4 a-8 f8 d4  b8 >d8 g4 f8 d8< b4
      >c4< g4 e-8 f8 g8 a-8  g4 e-4 c8 d8 e-8 c8  f4 a-4 >c8< b-8 a-8 f8  g2 b4 >d4<
      >e-4 c8< a-8 >c4< a-4  >f4 d8< b-8 >d4< b-4  g4 b-4 >d8 c8< b-8 g8  >c2< g4 e-4
      a-8 b-8 >c8 e-8 d4 c4<  b-8 >c8 d8 f8 e-4 d4<  b4 >d4 g4 f4<  g2 r4 g4`,
    chart: ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Fm', 'G', 'Ab', 'Bb', 'Gm', 'Cm', 'Ab', 'Bb', 'G', 'G'],
  });
  song('rival', {
    bpm: 136, arp: 'stab', arpOct: 4, arpVol: 6, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 6,
    lead: `v11 @1 q7 o5 |
      g8 b8 >d8< b8 >g4 d4<  e8 g8 >c8< g8 >e4 c4<  f+8 a8 >d8< a8 >f+4 d4<  >g8 f+8 e8 d8< b4 g4
      e8 g8 b8 >e8 d4< b4  >c8< b8 a8 g8 e4 c4  d8 e8 f+8 g8 a8 b8 >c8 d8<  d4 a4 f+4 d4`,
    chart: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'D'],
  });
  song('spotted', {
    bpm: 140, arp: 'stab', arpOct: 4, arpVol: 5, bass: 'pump', bassOct: 2, drum: 'drive', drumVol: 6,
    lead: `v11 @1 q6 o5 | a8 >c8 e8 c8< a8 >c8 e8 c8<  g+8 b8 >e8< b8 g+8 b8 >e8< b8`,
    chart: ['Am', 'E'],
  });
  song('victoryWild', {
    bpm: 120, arp: 'up8', arpOct: 4, arpVol: 5, bass: 'root5', bassOct: 3, drum: 'soft', drumVol: 4,
    intro: ['C', 'G'],
    lead: `v11 @1 q7 o5 g8 g8 g8 >c2 r8 < e4 d4 c2 | e4 g4 >c4< g4  a4 >c4< a4 f4  f4 a4 g4 f4  e4 d4 c2`,
    chart: ['C', 'Am', 'F', 'G'],
  });
  song('victoryTrainer', {
    bpm: 124, arp: 'up8', arpOct: 4, arpVol: 5, bass: 'root5', bassOct: 3, drum: 'soft', drumVol: 4,
    intro: ['F', 'C'],
    lead: `v11 @1 q7 o5 c8 c8 c8 f2 r8  a4 g4 f2 | a4 >c4 f4 c4<  d4 f4 a4 f4  d4 f4 e4 d4  c4 e4 f2`,
    chart: ['F', 'Dm', 'Bb', 'C'],
  });
  CD.audio.define('levelup', { bpm: 140, loop: false, ch: [
    'v11 @1 q7 o5 c8 e8 g8 >c4< g8 >c4',
    'v7 @0 q7 o4 e8 g8 >c8 e4< e8 g4',
    'v12 @3 q7 o3 c4 g4 c4 c4',
  ] });
  CD.audio.define('caught', { bpm: 132, loop: false, ch: [
    'v11 @1 q7 o5 g8 a8 b8 >c4< b8 >c8 e8 g2 r2',
    'v7 @0 q7 o4 e8 f8 g8 a4 g8 a8 >c8 e2 r2',
    'v12 @3 q7 o3 c4 g4 f4 g4 c2 r2',
  ] });


  song('evolve', {
    bpm: 112, arp: 'roll8', arpOct: 4, arpVol: 5, arpDuty: 0, bass: 'long', bassOct: 2, drum: 'soft', drumVol: 3,
    lead: `v10 @0 q7 o5 | e2 a2  f2 >c2<  g2 e2  d2 g2`,
    chart: ['Am', 'F', 'C', 'G'],
  });
  CD.audio.define('evolved', { bpm: 128, loop: false, ch: [
    'v11 @1 q7 o5 g8 >c8 e8 g4 e8 g8 >c2<',
    'v7 @0 q7 o5 e8 g8 >c8 e4 c8 e8 g2<',
    'v12 @3 q7 o3 c4 g4 e4 g4 c2',
  ] });

  // ---------------------------------------------------------------- Jingles (no loop)
  CD.audio.define('heal', { bpm: 120, loop: false, ch: [
    'v11 @1 q7 o5 c8 e8 g8 >c4< g8 >c4 e4 c2',
    'v7 @0 q7 o4 e8 g8 >c8 e4< e8 g4 >c4< e2',
    'v12 @3 q7 o3 c4 g4 c4 g4 c2',
  ] });
  CD.audio.define('badge', { bpm: 120, loop: false, ch: [
    'v11 @1 q7 o5 c8 c8 c8 g4 e8 g8 >c2 r8 < a8 b8 >c4 e4 c2',
    'v7 @0 q7 o4 e8 e8 e8 >c4< g8 >c8 e2 r8 < f8 g8 a4 >c4 e2',
    'v12 @3 q7 o3 c4 c4 g4 c4 f4 g4 c2',
    'v6 k8 h8 s8 h8 k8 h8 s8 h8 k8 h8 s8 h8 x2',
  ] });
  CD.audio.define('item', { bpm: 132, loop: false, ch: [
    'v11 @1 q6 o5 g8 a8 b8 >d4 < b8 >d8 g4 r4',
    'v7 @0 q6 o4 b8 >c8 d8 g4 d8 g8 b4 r4',
    'v12 @3 q7 o3 g4 d4 g4 g4',
  ] });
})(window.CD);
