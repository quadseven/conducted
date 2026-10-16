/**
 * Evolution - handles train evolution animation and interaction
 */

class Evolution {
    constructor(train, options = {}) {
        this.train = train;
        this.context = options.context || {};
        this.game = options.game || null;
        this.battle = options.battle || null;
        this.onComplete = options.onComplete || null;
        this.onCancel = options.onCancel || null;

        this.oldName = train.nickname || train.species.name;
        this.targetSpeciesId = train.getEvolutionTarget
            ? train.getEvolutionTarget(this.context)
            : (train.species && train.species.evolution && train.species.evolution.evolvesTo);

        const speciesDb = (typeof TRAIN_SPECIES !== 'undefined') ? TRAIN_SPECIES : null;
        this.targetSpecies = (speciesDb && this.targetSpeciesId) ? speciesDb[this.targetSpeciesId] : null;

        this.state = 'evolving';
        this.cancelled = false;
        this.completed = false;
        this.timer = 0;
        this.duration = options.duration !== undefined ? options.duration : 2.5;

        this.showNew = false;
        this.flickerTimer = 0;
        this.flickerInterval = 0.25;
        this.raysAngle = 0;

        this.dialogue = 'What? ' + this.oldName + ' is evolving!';
        this.messages = [this.dialogue];
        this.currentMessage = 0;
    }

    canEvolve() {
        return this.train ? this.train.canEvolve(this.context) : false;
    }

    getCurrentMessage() {
        if (this.messages.length > 0 && this.currentMessage < this.messages.length) {
            return this.messages[this.currentMessage];
        }
        return this.dialogue;
    }

    update(deltaTime) {
        if (this.state !== 'evolving') return;
        const dt = Math.max(0, deltaTime || 0.016);
        this.timer += dt;
        this.raysAngle += dt * 2;
        this.flickerTimer += dt;

        if (this.flickerTimer >= this.flickerInterval) {
            this.flickerTimer = 0;
            this.showNew = !this.showNew;
            this.flickerInterval = Math.max(0.04, this.flickerInterval * 0.88);
        }

        if (this.timer >= this.duration && !this.cancelled) {
            this.complete();
        }
    }

    cancel() {
        if (this.state !== 'evolving') return false;
        this.cancelled = true;
        this.state = 'cancelled';
        this.showNew = false;
        this.dialogue = 'Huh? ' + this.oldName + ' stopped evolving!';
        this.messages = [this.dialogue];
        this.currentMessage = 0;
        if (typeof this.onCancel === 'function') {
            this.onCancel(this.train);
        }
        return true;
    }

    complete() {
        if (this.state !== 'evolving') return false;
        const success = this.train.evolve(this.context);
        if (!success) return false;

        this.completed = true;
        this.state = 'completed';
        this.showNew = true;

        const newName = this.train.species.name;
        this.dialogue = 'Congratulations! Your ' + this.oldName + ' evolved into ' + newName + '!';
        this.messages = [this.dialogue];
        this.currentMessage = 0;

        if (this.game && this.game.player) {
            this.game.player.registerSeen(this.train.speciesId);
            this.game.player.registerCaught(this.train.speciesId);
        }

        if (this.game && this.game.audio && typeof this.game.audio.playSound === 'function') {
            this.game.audio.playSound('caught');
        }

        if (typeof this.onComplete === 'function') {
            this.onComplete(this.train);
        }
        return true;
    }

    handleInput(action) {
        if (this.state === 'evolving') {
            if (action === 'b') {
                return this.cancel();
            }
            if (action === 'a') {
                return this.complete();
            }
            return false;
        }
        if (action === 'a' || action === 'b') {
            this.currentMessage++;
            return true;
        }
        return false;
    }

    isFinished() {
        const isDone = this.state === 'cancelled' || this.state === 'completed';
        return isDone && this.currentMessage >= this.messages.length;
    }

    render(ctx) {
        if (!ctx) return;
        const canvas = ctx.canvas || { width: 768, height: 672 };
        const w = canvas.width || 768;
        const h = canvas.height || 672;

        ctx.save();
        ctx.fillStyle = '#07151d';
        ctx.fillRect(0, 0, w, h);

        const cx = Math.floor(w / 2);
        const cy = 260;

        this.drawRays(ctx, cx, cy);
        this.drawPlatform(ctx, cx, cy + 90);
        this.drawTrainSprite(ctx, cx, cy);
        this.drawDialogueBox(ctx, w, h);
        ctx.restore();
    }

    drawRays(ctx, cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.raysAngle);
        ctx.fillStyle = 'rgba(248, 232, 176, 0.16)';
        for (let i = 0; i < 12; i++) {
            const a1 = (i * Math.PI) / 6;
            const a2 = a1 + 0.18;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a1) * 350, Math.sin(a1) * 350);
            ctx.lineTo(Math.cos(a2) * 350, Math.sin(a2) * 350);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    drawPlatform(ctx, cx, cy) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 8, 140, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1c2830';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 140, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c6923b';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    drawTrainSprite(ctx, cx, cy) {
        const displaySpecies = (this.showNew && this.targetSpecies) ? this.targetSpecies : this.train.species;
        const displayTrain = {
            speciesId: displaySpecies ? displaySpecies.id : this.train.speciesId,
            types: displaySpecies ? displaySpecies.types : this.train.types,
            nickname: displaySpecies ? displaySpecies.name : this.train.nickname
        };

        const hasAtlas = typeof spriteAtlas !== 'undefined';
        if (this.battle && typeof this.battle.drawLoco === 'function' && hasAtlas) {
            this.battle.drawLoco(ctx, cx - 96, cy - 70, 'front', displayTrain);
        } else {
            ctx.fillStyle = this.showNew ? '#f1cd68' : '#e4eef2';
            ctx.fillRect(cx - 50, cy - 50, 100, 80);
            ctx.fillStyle = '#181818';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(displayTrain.nickname || 'TRAIN', cx, cy - 60);
            ctx.textAlign = 'left';
        }
    }

    drawDialogueBox(ctx, w, h) {
        ctx.fillStyle = '#071116';
        ctx.fillRect(0, 548, w, 124);
        ctx.fillStyle = '#c6923b';
        ctx.fillRect(0, 548, w, 5);
        ctx.fillStyle = '#26363a';
        ctx.fillRect(14, 560, w - 28, 100);
        ctx.fillStyle = '#f0dfb8';
        ctx.fillRect(20, 566, w - 40, 88);
        ctx.fillStyle = '#b56c2c';
        ctx.fillRect(20, 566, 7, 88);

        ctx.fillStyle = '#142328';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(this.getCurrentMessage(), 40, 610);

        if (this.state === 'evolving') {
            ctx.fillStyle = '#7a5a3a';
            ctx.font = 'bold 13px monospace';
            ctx.fillText('[B] Cancel', w - 130, 638);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Evolution;
}
if (typeof window !== 'undefined') {
    window.Evolution = Evolution;
}
if (typeof globalThis !== 'undefined') {
    globalThis.Evolution = Evolution;
}
