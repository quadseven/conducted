class AudioManager {
    constructor() {
        this.context = null;
        this.master = null;
        this.currentMusic = null;
        this.musicTimer = null;
        this.muted = false;
    }

    load() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.context.destination);
    }

    unlock() {
        if (this.context && this.context.state === "suspended") this.context.resume();
    }

    tone(frequency, duration, wave = "square", volume = 0.25, delay = 0) {
        if (!this.context || this.muted) return;
        this.unlock();
        const start = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(start);
        oscillator.stop(start + duration);
    }

    noise(duration = 0.08, volume = 0.2) {
        if (!this.context || this.muted) return;
        const frames = Math.ceil(this.context.sampleRate * duration);
        const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1;
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(volume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
        source.connect(gain);
        gain.connect(this.master);
        source.start();
    }

    playSound(name) {
        const sounds = {
            select: () => { this.tone(659, 0.05); this.tone(988, 0.06, "square", 0.2, 0.05); },
            cancel: () => this.tone(196, 0.12, "square", 0.2),
            step: () => this.noise(0.025, 0.08),
            hit: () => { this.noise(0.12, 0.25); this.tone(110, 0.12, "sawtooth", 0.18); },
            whistle: () => { this.tone(880, 0.2, "square", 0.18); this.tone(1175, 0.35, "square", 0.16, 0.18); },
            catch: () => [523, 659, 784, 1047].forEach((note, i) => this.tone(note, 0.12, "square", 0.16, i * 0.1)),
            heal: () => [392, 494, 587, 784].forEach((note, i) => this.tone(note, 0.18, "triangle", 0.2, i * 0.12)),
            chug: () => { this.noise(0.05, 0.16); this.tone(82, 0.06, "square", 0.14); }
        };
        (sounds[name] || sounds.select)();
    }

    playMusic(name) {
        if (!this.context || this.muted || this.currentMusic === name) return;
        this.stopMusic();
        this.currentMusic = name;
        const songs = {
            title: [262, 330, 392, 523, 392, 330],
            overworld: [262, 294, 330, 392, 330, 294, 247, 294],
            battle: [220, 220, 262, 220, 330, 294, 262, 196],
            victory: [392, 523, 659, 784, 659, 784]
        };
        const notes = songs[name] || songs.overworld;
        let index = 0;
        const tick = () => {
            if (this.currentMusic !== name) return;
            this.tone(notes[index % notes.length], 0.14, "square", 0.1);
            if (index % 2 === 0) this.tone(notes[index % notes.length] / 2, 0.18, "triangle", 0.06);
            index++;
        };
        tick();
        this.musicTimer = setInterval(tick, 180);
    }

    stopMusic() {
        if (this.musicTimer) clearInterval(this.musicTimer);
        this.musicTimer = null;
        this.currentMusic = null;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) this.stopMusic();
        return this.muted;
    }
}

if (typeof module !== "undefined" && module.exports) module.exports = AudioManager;
