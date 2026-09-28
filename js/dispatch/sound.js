// Runaway Junction: procedural chiptune and sound effects (Web Audio).
//
// No audio files. The music is composed at run time from a seed: a chord
// progression, a two-bar motif developed over eight bars, a walking bass, an
// arpeggio layer and a "chuff-a-chuff" noise rhythm that sounds like wheels
// on rail joints. Tempo and key follow the game: faster and minor while the
// runaway is loose and quick.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DispatchSound = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ------------------------------------------------------------------
    // Composition (pure, testable)

    const MAJOR = [0, 2, 4, 5, 7, 9, 11];
    const MINOR = [0, 2, 3, 5, 7, 8, 10];
    // Progressions as scale degrees (0 = I). Two 4-bar phrases.
    const PROGRESSIONS = {
        major: [[0, 4, 5, 3], [0, 3, 4, 4]],
        minor: [[0, 5, 2, 6], [0, 3, 6, 4]]
    };
    const RHYTHMS = [
        [0, 4, 6, 8, 12],
        [0, 2, 4, 8, 10, 12, 14],
        [0, 3, 6, 8, 12, 14],
        [0, 4, 8, 10, 11, 12],
        [0, 6, 8, 10, 12]
    ];

    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), a | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Returns { bars: [{ chord, lead: [{step, deg, len}], ... }], scale }.
    // Degrees are scale steps above the key's tonic; the player turns them
    // into pitches, so one composition can play in any key and mode.
    function compose(seed, mode) {
        const r = rng(seed);
        const prog = PROGRESSIONS[mode] || PROGRESSIONS.major;
        const chords = prog[0].concat(prog[1]);
        const motifRhythm = [RHYTHMS[Math.floor(r() * RHYTHMS.length)], RHYTHMS[Math.floor(r() * RHYTHMS.length)]];
        const bars = [];
        let deg = 7 + chords[0] + (r() < 0.5 ? 2 : 0);
        let motif = null;
        for (let b = 0; b < 8; b++) {
            const chord = chords[b];
            const tones = [chord, chord + 2, chord + 4].map(d => d + 7);
            const rhythm = motifRhythm[b % 2];
            let lead;
            if (b === 2 || b === 6) {
                // answer phrase: the opening motif moved to the new chord
                const shift = chord - chords[0];
                lead = motif[0].map(n => ({ step: n.step, deg: Math.max(4, Math.min(16, n.deg + shift)), len: n.len }));
            } else {
                lead = [];
                for (let i = 0; i < rhythm.length; i++) {
                    const step = rhythm[i];
                    const len = (rhythm[i + 1] || 16) - step;
                    const strong = step % 8 === 0;
                    if (strong) {
                        // land on the nearest chord tone
                        let best = tones[0];
                        for (const t of tones) for (const o of [-7, 0, 7]) if (Math.abs(t + o - deg) < Math.abs(best - deg)) best = t + o;
                        deg = best;
                    } else {
                        deg += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
                    }
                    deg = Math.max(4, Math.min(14, deg));
                    lead.push({ step, deg, len: Math.max(1, Math.min(len, 6)) });
                }
                if (b === 7) { lead = lead.filter(n => n.step < 12); lead.push({ step: 12, deg: 7, len: 4 }); }
            }
            if (b < 2) motif = motif || [];
            if (b < 2) motif[b] = lead;
            bars.push({ chord, lead });
        }
        return { bars, mode };
    }

    function degToMidi(tonic, scale, deg) {
        const oct = Math.floor(deg / 7);
        const i = ((deg % 7) + 7) % 7;
        return tonic + oct * 12 + scale[i];
    }
    const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

    // ------------------------------------------------------------------
    // Playback

    function Sound() {
        this.ctx = null;
        this.muted = false;
        this.song = null;
        this.intensity = 0;
        this.timer = null;
    }

    Sound.prototype.unlock = function () {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        if (!this.ctx) {
            const ctx = new AC();
            this.ctx = ctx;
            this.master = ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.5;
            this.master.connect(ctx.destination);
            this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.3; this.musicBus.connect(this.master);
            this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
            // Pulse waves with a chosen duty cycle, from their Fourier series.
            this.pulse = {};
            for (const duty of [0.125, 0.25, 0.5]) {
                const n = 40, re = new Float32Array(n), im = new Float32Array(n);
                for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
                this.pulse[duty] = ctx.createPeriodicWave(re, im);
            }
            const len = ctx.sampleRate;
            this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
            const ch = this.noiseBuf.getChannelData(0);
            let seed = 12345;
            for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) >>> 0; ch[i] = (seed / 4294967296) * 2 - 1; }
        }
        if (this.ctx.state !== 'running') {
            const pr = this.ctx.resume();
            if (pr && pr.catch) pr.catch(() => {});
        }
    };

    Sound.prototype.setMuted = function (m) {
        this.muted = m;
        if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    };

    Sound.prototype.ready = function () { return this.ctx && this.ctx.state === 'running'; };

    Sound.prototype.voice = function (t, hz, dur, o) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator(), g = ctx.createGain();
        if (o.wave === 'tri') osc.type = 'triangle';
        else if (o.wave === 'saw') osc.type = 'sawtooth';
        else if (o.wave === 'sine') osc.type = 'sine';
        else osc.setPeriodicWave(this.pulse[o.duty || 0.5]);
        osc.frequency.setValueAtTime(hz, t);
        if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, hz * o.slide), t + dur);
        if (o.detune) osc.detune.setValueAtTime(o.detune, t);
        const v = o.vol == null ? 0.25 : o.vol;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v, t + (o.attack || 0.004));
        g.gain.setValueAtTime(v * (o.sustain == null ? 0.7 : o.sustain), t + Math.min(dur, 0.06));
        g.gain.linearRampToValueAtTime(0.0001, t + dur + (o.release || 0.03));
        osc.connect(g); g.connect(o.bus || this.musicBus);
        osc.start(t); osc.stop(t + dur + (o.release || 0.03) + 0.02);
    };

    Sound.prototype.hiss = function (t, dur, o) {
        const ctx = this.ctx;
        const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = o.type || 'highpass'; f.frequency.value = o.freq || 5000;
        if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
        const g = ctx.createGain(); const v = o.vol == null ? 0.2 : o.vol;
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        src.connect(f); f.connect(g); g.connect(o.bus || this.musicBus);
        src.start(t, (t * 7.31) % 0.8); src.stop(t + dur + 0.02);
    };

    // ------------------------------------------------------------------
    // Music

    Sound.prototype.play = function (seed, tonic) {
        this.stop();
        if (!this.ctx) return;
        this.songs = { major: compose(seed, 'major'), minor: compose(seed + 1, 'minor') };
        this.tonic = tonic || 57;
        this.step = 0;
        this.next = this.ctx.currentTime + 0.08;
        this.timer = setInterval(() => this.pump(), 30);
    };

    Sound.prototype.stop = function () {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    };

    Sound.prototype.setIntensity = function (x) { this.intensity = Math.max(0, Math.min(1, x)); };

    Sound.prototype.pump = function () {
        if (!this.ready()) { this.next = this.ctx ? this.ctx.currentTime + 0.08 : 0; return; }
        while (this.next < this.ctx.currentTime + 0.15) {
            const bpm = 116 + this.intensity * 44;
            const dur = 60 / bpm / 4;
            this.playStep(this.step, this.next, dur);
            this.step++;
            this.next += dur;
        }
    };

    Sound.prototype.playStep = function (n, t, dur) {
        const tense = this.intensity > 0.55;
        const song = tense ? this.songs.minor : this.songs.major;
        const scale = tense ? MINOR : MAJOR;
        const barIdx = Math.floor(n / 16) % 8, step = n % 16;
        const bar = song.bars[barIdx];
        const tonic = this.tonic;
        // lead
        for (const note of bar.lead) {
            if (note.step !== step) continue;
            this.voice(t, midiHz(degToMidi(tonic + 12, scale, note.deg)), note.len * dur * 0.9, { duty: 0.25, vol: 0.2, sustain: 0.6 });
        }
        // bass: root on the beat, fifth on the "and", a pickup at the bar end
        const root = degToMidi(tonic - 12, scale, bar.chord);
        if (step === 0 || step === 8) this.voice(t, midiHz(root), dur * 3, { wave: 'tri', vol: 0.4, sustain: 0.8 });
        if (step === 4 || step === 12) this.voice(t, midiHz(root + 7), dur * 2, { wave: 'tri', vol: 0.32 });
        if (step === 14) this.voice(t, midiHz(root + 12), dur * 1.5, { wave: 'tri', vol: 0.28 });
        // arpeggio, louder as the chase heats up
        if (this.intensity > 0.2 && step % 2 === 0) {
            const tones = [0, 2, 4, 7];
            const d = bar.chord + tones[(step / 2) % 4];
            this.voice(t, midiHz(degToMidi(tonic + 12, scale, d)), dur * 0.8, { duty: 0.125, vol: 0.05 + this.intensity * 0.08 });
        }
        // wheels on rail joints: chuff-a-chuff
        const accent = step % 4 === 0 ? 0.16 : step % 4 === 2 ? 0.09 : step % 4 === 3 ? 0.04 : 0;
        if (accent) this.hiss(t, dur * 0.9, { freq: step % 4 === 0 ? 2500 : 6000, vol: accent });
        if (step === 0 || step === 8 || (tense && step === 10)) this.voice(t, 110, 0.09, { wave: 'sine', slide: 0.4, vol: 0.5 });
        if (step === 4 || step === 12) this.hiss(t, 0.12, { type: 'bandpass', freq: 1800, vol: 0.2 });
    };

    // ------------------------------------------------------------------
    // Effects

    const FX = {
        points(s, t) {
            s.hiss(t, 0.04, { freq: 3000, vol: 0.5, bus: s.sfxBus });
            s.voice(t + 0.05, 180, 0.05, { duty: 0.5, vol: 0.25, slide: 0.6, bus: s.sfxBus });
            s.hiss(t + 0.07, 0.05, { freq: 1500, vol: 0.4, bus: s.sfxBus });
        },
        locked(s, t) { s.voice(t, 140, 0.18, { duty: 0.5, vol: 0.25, bus: s.sfxBus }); s.voice(t + 0.2, 110, 0.2, { duty: 0.5, vol: 0.25, bus: s.sfxBus }); },
        gateRed(s, t) { for (let i = 0; i < 3; i++) { s.voice(t + i * 0.16, 1320, 0.1, { wave: 'sine', vol: 0.22, bus: s.sfxBus }); s.voice(t + i * 0.16, 1760, 0.08, { wave: 'sine', vol: 0.1, bus: s.sfxBus }); } },
        gateGreen(s, t) { s.voice(t, 880, 0.1, { wave: 'sine', vol: 0.2, bus: s.sfxBus }); s.voice(t + 0.1, 1175, 0.14, { wave: 'sine', vol: 0.2, bus: s.sfxBus }); },
        horn(s, t) { for (const [hz, dt] of [[311, 0], [370, 0], [466, 0]]) s.voice(t + dt, hz, 0.5, { duty: 0.5, vol: 0.12, attack: 0.03, sustain: 0.9, release: 0.1, bus: s.sfxBus }); },
        whistle(s, t) { s.voice(t, 1046, 0.22, { wave: 'sine', vol: 0.18, attack: 0.02, bus: s.sfxBus }); s.voice(t + 0.26, 1318, 0.45, { wave: 'sine', vol: 0.18, attack: 0.02, bus: s.sfxBus }); s.hiss(t, 0.7, { type: 'bandpass', freq: 3200, vol: 0.05, bus: s.sfxBus }); },
        couple(s, t) { s.hiss(t, 0.18, { type: 'bandpass', freq: 2200, vol: 0.7, bus: s.sfxBus }); s.voice(t, 220, 0.25, { duty: 0.25, vol: 0.3, slide: 0.5, bus: s.sfxBus }); s.hiss(t + 0.12, 0.1, { type: 'bandpass', freq: 3200, vol: 0.4, bus: s.sfxBus }); },
        crash(s, t) {
            s.hiss(t, 1.6, { type: 'lowpass', freq: 5000, sweep: 120, vol: 0.9, bus: s.sfxBus });
            s.voice(t, 160, 0.9, { wave: 'saw', vol: 0.3, slide: 0.2, bus: s.sfxBus });
            for (let i = 0; i < 6; i++) s.hiss(t + 0.1 + i * 0.13, 0.08, { type: 'bandpass', freq: 1500 + i * 400, vol: 0.4, bus: s.sfxBus });
        },
        station(s, t) { [659, 523, 784].forEach((hz, i) => s.voice(t + i * 0.14, hz, 0.22, { wave: 'sine', vol: 0.15, bus: s.sfxBus })); },
        arrive(s, t, good) { s.voice(t, good ? 988 : 440, 0.07, { duty: 0.25, vol: 0.15, bus: s.sfxBus }); if (good) s.voice(t + 0.08, 1319, 0.1, { duty: 0.25, vol: 0.15, bus: s.sfxBus }); },
        clear(s, t) { [0, 4, 7, 12, 16, 19, 24].forEach((st, i) => s.voice(t + i * 0.09, midiHz(60 + st), 0.16, { duty: 0.25, vol: 0.2, bus: s.sfxBus })); s.voice(t + 0.7, midiHz(84), 0.6, { duty: 0.5, vol: 0.15, bus: s.sfxBus }); },
        over(s, t) { [12, 7, 3, 0, -5].forEach((st, i) => s.voice(t + i * 0.2, midiHz(57 + st), 0.28, { duty: 0.5, vol: 0.2, bus: s.sfxBus })); },
        reverse(s, t) { s.hiss(t, 0.25, { freq: 4000, vol: 0.2, bus: s.sfxBus }); },
        chuff(s, t, v) { s.hiss(t, 0.09, { type: 'bandpass', freq: 900 + v * 250, vol: 0.12 + v * 0.03, bus: s.sfxBus }); },
        start(s, t) { [0, 7, 12].forEach((st, i) => s.voice(t + i * 0.08, midiHz(69 + st), 0.1, { duty: 0.25, vol: 0.18, bus: s.sfxBus })); }
    };

    Sound.prototype.fx = function (name, arg) {
        if (!this.ready() || this.muted || !FX[name]) return;
        FX[name](this, this.ctx.currentTime + 0.01, arg);
    };

    return { Sound, compose, degToMidi, midiHz, MAJOR, MINOR, FX_NAMES: Object.keys(FX) };
});
