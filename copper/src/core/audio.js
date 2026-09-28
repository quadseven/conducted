// Chiptune synthesizer and sequencer on Web Audio. No audio files: every song is
// note text in a small MML dialect (see compile()), rendered through pulse, triangle
// and noise voices built here. Sound effects are short procedural gestures.
//
// MML dialect, per channel string:
//   c d e f g a b   notes; + or # sharp, - flat; optional length (1,2,4,8,16,32) and dots
//   r               rest            o4  set octave     > <  octave up / down
//   l8              default length  v10 volume 0..15   q6  gate (6/8 of the note sounds)
//   @1              pulse duty: 0=12.5% 1=25% 2=50%, 3=triangle
//   [ ... ]3        repeat three times      |   loop point (playback returns here)
//   ^4              tie: extend the previous note by a length
//   Noise channel:  k kick, s snare, h hat, H open hat, x crash, t tom (lengths as notes)
(function (CD) {
  'use strict';
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let unlocked = false, muted = false;
  const waves = {};
  let noiseBuf = null;

  const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  // Compile one channel string to events measured in beats (quarter note = 1 beat)
  function compile(src) {
    const ev = [];
    let i = 0, oct = 4, len = 8, vol = 10, gate = 7, duty = 1, t = 0, loopAt = 0;
    const stack = [];
    const s = src.replace(/\s+/g, ' ');
    function num() { let n = ''; while (i < s.length && /[0-9]/.test(s[i])) n += s[i++]; return n === '' ? null : +n; }
    function length() {
      const n = num();
      let beats = 4 / (n || len);
      let add = beats;
      while (s[i] === '.') { add /= 2; beats += add; i++; }
      return beats;
    }
    while (i < s.length) {
      const c = s[i++];
      if (c === ' ') continue;
      if (c === 'o') { oct = num(); continue; }
      if (c === '>') { oct++; continue; }
      if (c === '<') { oct--; continue; }
      if (c === 'l') { len = num(); continue; }
      if (c === 'v') { vol = num(); continue; }
      if (c === 'q') { gate = num(); continue; }
      if (c === '@') { duty = num(); continue; }
      if (c === '|') { loopAt = t; continue; }
      if (c === '[') { stack.push({ at: i, count: null }); continue; }
      if (c === ']') {
        const top = stack[stack.length - 1];
        const n = num() || 2;
        if (top.count === null) top.count = n - 1;
        if (top.count > 0) { top.count--; i = top.at; } else stack.pop();
        continue;
      }
      if (c === '^') { const b = length(); if (ev.length) { ev[ev.length - 1].dur += b; } t += b; continue; }
      if (c === 'r') { t += length(); continue; }
      if (NOTE[c] !== undefined) {
        let n = NOTE[c];
        while (s[i] === '+' || s[i] === '#') { n++; i++; }
        while (s[i] === '-') { n--; i++; }
        const b = length();
        ev.push({ t, dur: b, midi: 12 * (oct + 1) + n, vol, gate, duty });
        t += b; continue;
      }
      if ('kshHxt'.includes(c)) { const b = length(); ev.push({ t, dur: b, drum: c, vol }); t += b; continue; }
    }
    return { ev, len: t, loopAt };
  }

  const songs = {};      // id -> {bpm, chans:[{ev,len,loopAt,inst,vol}]}
  function define(id, def) {
    songs[id] = {
      id, bpm: def.bpm, loop: def.loop !== false,
      chans: def.ch.map(src => compile(src)),
    };
  }

  function ensure() {
    if (ctx || typeof window === 'undefined') return !!ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
    // a gentle low-pass keeps the square waves warm rather than harsh
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 7200; tone.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(tone);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(tone);
    for (const [k, d] of [[0, 0.125], [1, 0.25], [2, 0.5]]) {
      const N = 48, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d) * Math.pow(0.97, n);
      // cosine form of a pulse wave: a_n = 2/(n pi) sin(n pi d)
      for (let n = 1; n < N; n++) { re[n] = im[n]; im[n] = 0; }
      waves[k] = ctx.createPeriodicWave(re, im);
    }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 0x7fff;
    for (let i = 0; i < d.length; i++) { // 15-bit LFSR noise, the classic handheld hiss
      const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14);
      d[i] = (lfsr & 1) ? 0.9 : -0.9;
    }
    setInterval(pump, 30);
    return true;
  }
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) { unlocked = true; if (want) startSong(want, true); }
  }

  // ---- voices ----
  function tone(bus, when, dur, f, vol, duty, opts) {
    opts = opts || {};
    const o = ctx.createOscillator();
    if (duty === 3) o.type = 'triangle'; else o.setPeriodicWave(waves[duty] || waves[1]);
    o.frequency.setValueAtTime(f, when);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, when + dur);
    if (opts.vibrato && dur > 0.25) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, when); lg.gain.linearRampToValueAtTime(f * 0.012, when + Math.min(0.4, dur));
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(when); lfo.stop(when + dur + 0.05);
    }
    const g = ctx.createGain();
    const peak = vol * (duty === 3 ? 0.34 : 0.12);
    const rel = opts.release || 0.03;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.006);
    g.gain.setTargetAtTime(peak * (opts.sustain === undefined ? 0.7 : opts.sustain), when + 0.02, opts.decay || 0.12);
    g.gain.setValueAtTime(g.gain.value, when + dur);
    g.gain.setTargetAtTime(0, when + dur, rel);
    o.connect(g); g.connect(bus);
    o.start(when); o.stop(when + dur + rel * 6);
  }
  function noise(bus, when, dur, vol, type, fr) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = fr || 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(when, Math.random() * 0.5); src.stop(when + dur + 0.02);
  }
  function drum(bus, when, kind, vol) {
    const v = vol / 15;
    if (kind === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(42, when + 0.12);
      g.gain.setValueAtTime(0.55 * v, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
      o.connect(g); g.connect(bus); o.start(when); o.stop(when + 0.18);
      noise(bus, when, 0.02, 0.08 * v, 'lowpass', 1200);
    } else if (kind === 's') {
      noise(bus, when, 0.14, 0.3 * v, 'bandpass', 1800);
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(220, when); o.frequency.exponentialRampToValueAtTime(120, when + 0.08);
      g.gain.setValueAtTime(0.25 * v, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
      o.connect(g); g.connect(bus); o.start(when); o.stop(when + 0.1);
    } else if (kind === 'h') noise(bus, when, 0.035, 0.12 * v, 'highpass', 7000);
    else if (kind === 'H') noise(bus, when, 0.16, 0.1 * v, 'highpass', 6000);
    else if (kind === 'x') noise(bus, when, 0.7, 0.16 * v, 'highpass', 4000);
    else if (kind === 't') {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(180, when); o.frequency.exponentialRampToValueAtTime(90, when + 0.15);
      g.gain.setValueAtTime(0.4 * v, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
      o.connect(g); g.connect(bus); o.start(when); o.stop(when + 0.2);
    }
  }

  // ---- sequencer ----
  let cur = null;       // {song, start, cursors:[{i, base}], gain, onEnd}
  let want = null;      // id of the song that should be playing (kept even while locked/headless)
  let resumeAfterJingle = null;
  const LOOKAHEAD = 0.22;

  function startSong(id, fromUnlock) {
    if (!ctx || !unlocked) return;
    const song = songs[id]; if (!song) return;
    if (cur) stopCur(0.12);
    const gain = ctx.createGain(); gain.gain.value = 1; gain.connect(musicBus);
    cur = { song, gain, start: ctx.currentTime + 0.06, cursors: song.chans.map(() => ({ i: 0, base: 0 })), ended: false };
    if (fromUnlock) cur.start = ctx.currentTime + 0.05;
  }
  function stopCur(fade) {
    if (!cur) return;
    const g = cur.gain;
    g.gain.setTargetAtTime(0, ctx.currentTime, fade || 0.05);
    setTimeout(() => g.disconnect(), 800);
    cur = null;
  }
  function pump() {
    if (!ctx || !cur || muted) return;
    const spb = 60 / cur.song.bpm;
    const horizon = ctx.currentTime + LOOKAHEAD;
    let allDone = true;
    cur.song.chans.forEach((ch, ci) => {
      const cu = cur.cursors[ci];
      if (!ch.ev.length) return;
      for (let guard = 0; guard < 256; guard++) {
        if (cu.i >= ch.ev.length) {
          if (!cur.song.loop) break;
          cu.base += ch.len - ch.loopAt;
          cu.i = ch.ev.findIndex(e => e.t >= ch.loopAt);
          if (cu.i < 0) break;
        }
        const e = ch.ev[cu.i];
        const when = cur.start + (cu.base + e.t) * spb;
        if (when > horizon) { allDone = false; break; }
        cu.i++;
        if (when < ctx.currentTime - 0.05) continue;
        const dur = e.dur * spb;
        if (e.drum) drum(cur.gain, when, e.drum, e.vol);
        else tone(cur.gain, when, dur * (e.gate / 8), freq(e.midi), e.vol / 15, e.duty, { vibrato: e.duty !== 3 && dur > 0.3, decay: e.duty === 3 ? 0.5 : 0.18, sustain: e.duty === 3 ? 0.9 : 0.62 });
      }
      if (cu.i < ch.ev.length) allDone = false;
    });
    if (!cur.song.loop && allDone && !cur.ended) {
      cur.ended = true;
      const endAt = cur.start + Math.max(...cur.song.chans.map(c => c.len)) * spb;
      const me = cur;
      setTimeout(() => { if (cur === me) { stopCur(0.05); if (resumeAfterJingle) { const r = resumeAfterJingle; resumeAfterJingle = null; want = r; startSong(r); } } }, Math.max(0, (endAt - ctx.currentTime) * 1000));
    }
  }

  function music(id) {
    if (want === id && (cur || !unlocked)) return;
    want = id; resumeAfterJingle = null;
    if (!id) { if (cur) stopCur(0.2); return; }
    if (ctx && unlocked) startSong(id);
  }
  // A short fanfare that interrupts the current song and then restarts it
  function jingle(id, resume) {
    const back = resume === undefined ? want : resume;
    want = id;
    if (ctx && unlocked) { startSong(id); resumeAfterJingle = back; }
    else want = back;
  }
  function jingleSeconds(id) {
    const s = songs[id]; if (!s) return 0;
    return Math.max(...s.chans.map(c => c.len)) * 60 / s.bpm;
  }

  // ---- sound effects ----
  function sfx(name, arg) {
    if (!ctx || !unlocked || muted) return;
    const t = ctx.currentTime + 0.01, B = sfxBus;
    const P = (dt, d, f, v, duty, o) => tone(B, t + dt, d, f, v, duty === undefined ? 1 : duty, o);
    switch (name) {
      case 'cursor': P(0, 0.035, 1760, 0.5, 2); break;
      case 'select': P(0, 0.04, 1318, 0.55, 1); P(0.045, 0.06, 1976, 0.55, 1); break;
      case 'cancel': P(0, 0.05, 880, 0.5, 1); P(0.05, 0.06, 660, 0.45, 1); break;
      case 'bump': P(0, 0.09, 98, 0.9, 2, { slideTo: 70 }); break;
      case 'text': P(0, 0.02, 2349, 0.18, 0); break;
      case 'door': noise(B, t, 0.12, 0.25, 'bandpass', 700); P(0.02, 0.08, 330, 0.4, 3); P(0.1, 0.12, 247, 0.4, 3); break;
      case 'stairs': [523, 659, 784, 1047].forEach((f, i) => P(i * 0.05, 0.05, f, 0.4, 1)); break;
      case 'ledge': P(0, 0.14, 400, 0.5, 2, { slideTo: 160 }); break;
      case 'save': [784, 988, 1175, 1568].forEach((f, i) => P(i * 0.08, 0.1, f, 0.5, 1)); break;
      case 'hit': noise(B, t, 0.16, 0.5, 'lowpass', 1600); P(0, 0.08, 180, 0.6, 2, { slideTo: 60 }); break;
      case 'hitweak': noise(B, t, 0.1, 0.3, 'lowpass', 900); break;
      case 'hitsuper': noise(B, t, 0.24, 0.6, 'lowpass', 2600); P(0, 0.12, 300, 0.7, 2, { slideTo: 50 }); P(0.1, 0.1, 150, 0.6, 2, { slideTo: 40 }); break;
      case 'faint': P(0, 0.6, 700, 0.6, 1, { slideTo: 90, sustain: 1 }); break;
      case 'throw': P(0, 0.25, 300, 0.4, 2, { slideTo: 900 }); break;
      case 'shake': P(0, 0.05, 220, 0.5, 2); P(0.07, 0.05, 180, 0.5, 2); break;
      case 'poof': noise(B, t, 0.3, 0.3, 'bandpass', 1400); break;
      case 'run': [660, 520, 400, 300].forEach((f, i) => P(i * 0.05, 0.05, f, 0.4, 2)); break;
      case 'statup': [0, 1, 2, 3, 4, 5].forEach(i => P(i * 0.04, 0.05, 600 + i * 150, 0.35, 0)); break;
      case 'statdown': [0, 1, 2, 3, 4, 5].forEach(i => P(i * 0.04, 0.05, 1350 - i * 150, 0.35, 0)); break;
      case 'heal': P(0, 0.5, 440, 0.3, 0, { slideTo: 880 }); break;
      case 'expfill': P(0, 0.03, 1200 + (arg || 0) * 8, 0.18, 0); break;
      case 'encounter': noise(B, t, 0.5, 0.2, 'bandpass', 3000); [0, 1, 2, 3].forEach(i => P(i * 0.07, 0.06, 1400 - i * 200, 0.4, 0)); break;
      case 'exclaim': P(0, 0.06, 1568, 0.5, 1); P(0.07, 0.14, 2093, 0.5, 1); break;
      case 'item': [0, 4, 7, 12].forEach((n, i) => P(i * 0.09, 0.09, 523 * Math.pow(2, n / 12), 0.5, 1)); break;
      case 'lowhp': P(0, 0.08, 1568, 0.2, 2); P(0.2, 0.08, 1568, 0.2, 2); break;
      case 'steam': noise(B, t, 0.5, 0.2, 'bandpass', 5200); break;
      case 'whistle': cry(arg || 1); break;
      case 'buzz': noise(B, t, 0.12, 0.2, 'bandpass', 300); break;
      case 'water': noise(B, t, 0.35, 0.15, 'lowpass', 600); break;
      default: break;
    }
  }
  // A train's cry: a whistle, horn or buzz chord shaped by its species id and type
  function cry(id, type) {
    if (!ctx || !unlocked || muted) return;
    const t = ctx.currentTime + 0.01;
    const r = n => { const x = Math.sin(id * 97.13 + n * 13.7) * 43758.5453; return x - Math.floor(x); };
    const base = 330 + r(1) * 380;
    const chord = type === 'DIESEL' || type === 'FREIGHT' ? [1, 1.26, 1.5] : type === 'ELECTRIC' ? [1, 1.5, 2.01] : type === 'MAGLEV' ? [1, 1.335, 2] : [1, 1.19, 1.5];
    const dur = 0.35 + r(2) * 0.35;
    const duty = type === 'ELECTRIC' ? 0 : type === 'DIESEL' || type === 'FREIGHT' ? 2 : 1;
    chord.forEach((k, i) => tone(sfxBus, t + i * 0.012, dur, base * k * (type === 'DIESEL' || type === 'FREIGHT' ? 0.5 : 1), 0.45, duty, { slideTo: base * k * (0.92 + r(3) * 0.2), vibrato: true, sustain: 0.9 }));
    if (type === 'STEAM' || !type) noise(sfxBus, t, dur + 0.2, 0.12, 'bandpass', 4500);
    if (type === 'ELECTRIC') noise(sfxBus, t, 0.2, 0.15, 'bandpass', 250);
  }

  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.6; }

  CD.audio = { define, compile, music, jingle, jingleSeconds, sfx, cry, unlock, setMuted, get muted() { return muted; }, get current() { return want; }, songs };
})(window.CD);
