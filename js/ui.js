/**
 * UI Helper Functions
 */

class UI {
    static drawTextBox(ctx, x, y, width, height, text) {
        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw text
        if (text) {
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = '18px monospace';

            const lines = Utils.wrapText(text, width - 40, ctx, 18);
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], x + 20, y + 30 + i * 25);
            }
        }
    }

    static drawMenu(ctx, x, y, width, height, options, selectedIndex) {
        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw options
        ctx.font = '20px monospace';
        const lineHeight = 35;

        for (let i = 0; i < options.length; i++) {
            const optionY = y + 30 + i * lineHeight;

            // Highlight selected
            if (i === selectedIndex) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 5, optionY - 20, width - 10, lineHeight - 5);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            ctx.fillText(options[i], x + 20, optionY);
        }
    }

    static drawProgressBar(ctx, x, y, width, height, percentage, color) {
        // Background
        ctx.fillStyle = CONSTANTS.COLORS.LIGHT_GRAY;
        ctx.fillRect(x, y, width, height);

        // Fill
        const fillWidth = (width * percentage) / 100;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, fillWidth, height);

        // Border
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    }

    static drawTrainSummary(ctx, train, x, y) {
        // Background panel
        const width = 400;
        const height = 200;

        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Train name and level
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 24px monospace';
        ctx.fillText(train.species.name, x + 20, y + 35);
        ctx.font = '18px monospace';
        ctx.fillText(`Lv. ${train.level}`, x + 280, y + 35);

        // HP
        ctx.fillText(`HP: ${train.currentHP}/${train.maxHP}`, x + 20, y + 70);
        this.drawProgressBar(ctx, x + 20, y + 80, 360, 15, train.getHPPercentage(), train.getHPColor());

        // Stats
        ctx.font = '16px monospace';
        ctx.fillText(`ATK: ${train.attack}`, x + 20, y + 120);
        ctx.fillText(`DEF: ${train.defense}`, x + 120, y + 120);
        ctx.fillText(`SPD: ${train.speed}`, x + 220, y + 120);
        ctx.fillText(`SPC: ${train.special}`, x + 320, y + 120);

        // Types
        ctx.font = 'bold 14px monospace';
        for (let i = 0; i < train.types.length; i++) {
            const type = train.types[i];
            const typeX = x + 20 + i * 100;
            const typeY = y + 150;

            ctx.fillStyle = CONSTANTS.TYPE_COLORS[type] || '#888888';
            ctx.fillRect(typeX, typeY, 90, 30);

            ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            ctx.fillText(type, typeX + 10, typeY + 20);
        }
    }

    static drawPauseMenu(ctx, options, selectedIndex, player) {
        const x = 500;
        const y = 100;
        const width = 250;
        const height = 400;

        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw options
        ctx.font = '20px monospace';
        const lineHeight = 40;

        for (let i = 0; i < options.length; i++) {
            const optionY = y + 40 + i * lineHeight;

            // Highlight selected
            if (i === selectedIndex) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, optionY - 25, width - 20, lineHeight - 5);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            ctx.fillText(options[i], x + 30, optionY);
        }

        // Draw money at bottom
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        ctx.fillText(`MONEY: $${player.money}`, x + 30, y + height - 20);
    }

    static drawBag(ctx, player, bagSelection) {
        const x = 50;
        const y = 100;
        const width = 650;
        const height = 450;

        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 24px monospace';
        ctx.fillText('BAG', x + 20, y + 40);

        // Item list
        ctx.font = '20px monospace';
        const lineHeight = 40;
        const items = [
            { name: 'Potion', count: player.items.potion },
            { name: 'Super Potion', count: player.items.super_potion },
            { name: 'Boxcar', count: player.items.boxcar },
            { name: 'Train Ticket', count: player.items.train_ticket }
        ];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemY = y + 100 + i * lineHeight;

            // Highlight selected
            if (i === bagSelection) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, itemY - 25, width - 20, lineHeight - 5);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            ctx.fillText(`${item.name} x${item.count}`, x + 30, itemY);
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        ctx.fillText('Press A to use • B to exit', x + 20, y + height - 20);
    }

    static drawBagUseOnTrain(ctx, player, trainSelection, itemName) {
        const x = 100;
        const y = 150;
        const width = 550;
        const height = 350;

        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`Use ${itemName} on which train?`, x + 20, y + 35);

        // Train list
        ctx.font = '18px monospace';
        const lineHeight = 50;

        for (let i = 0; i < player.party.length; i++) {
            const train = player.party[i];
            const trainY = y + 80 + i * lineHeight;

            // Highlight selected
            if (i === trainSelection) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, trainY - 30, width - 20, lineHeight - 5);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            const hpPercent = Math.floor((train.currentHP / train.maxHP) * 100);
            ctx.fillText(`${train.nickname || train.species.name} Lv${train.level} HP: ${train.currentHP}/${train.maxHP} (${hpPercent}%)`, x + 20, trainY);
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        ctx.fillText('Press A to use • B to cancel', x + 20, y + height - 20);
    }

    static drawShop(ctx, shopItems, selectedIndex, player) {
        const x = 100;
        const y = 100;
        const width = 600;
        const height = 400;

        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 24px monospace';
        ctx.fillText('RAIL MART', x + 20, y + 40);

        // Money display
        ctx.font = '18px monospace';
        ctx.fillText(`Money: $${player.money}`, x + 400, y + 40);

        // Item list
        ctx.font = '20px monospace';
        const lineHeight = 60;

        for (let i = 0; i < shopItems.length; i++) {
            const item = shopItems[i];
            const itemY = y + 120 + i * lineHeight;

            // Highlight selected
            if (i === selectedIndex) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, itemY - 35, width - 20, lineHeight - 5);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            // Item name and price
            ctx.fillText(`${item.displayName}`, x + 30, itemY - 5);
            ctx.font = '16px monospace';
            ctx.fillText(`$${item.price}`, x + 400, itemY - 5);
            ctx.fillText(item.description, x + 30, itemY + 20);
            ctx.font = '20px monospace';
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        ctx.fillText('Press A to buy • B to exit', x + 20, y + height - 20);
    }

    static drawTrainParty(ctx, player, trainSelection) {
        const x = 100;
        const y = 150;
        const width = 550;
        const height = 350;

        // Draw box
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 20px monospace';
        ctx.fillText('Your Trains', x + 20, y + 35);

        // Train list
        ctx.font = '18px monospace';
        const lineHeight = 50;

        for (let i = 0; i < player.party.length; i++) {
            const train = player.party[i];
            const trainY = y + 80 + i * lineHeight;

            // Highlight selected
            if (i === trainSelection) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, trainY - 30, width - 20, lineHeight - 5);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            const hpPercent = Math.floor((train.currentHP / train.maxHP) * 100);
            ctx.fillText(`${train.nickname || train.species.name} Lv${train.level} HP: ${train.currentHP}/${train.maxHP} (${hpPercent}%)`, x + 20, trainY);
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        ctx.fillText('Press B to return', x + 20, y + height - 20);
    }

    static drawDepot(ctx, player, selectedIndex) {
        const x = 70, y = 55, width = 628, height = 560;
        ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 24px monospace';
        ctx.fillText('GRAND TRANSIT DEPOT', x + 24, y + 38);
        ctx.font = '14px monospace';
        ctx.fillText('A: move train   B: close', x + 24, y + 64);
        const entries = [
            ...player.party.map(train => ({ train, group: 'CREW' })),
            ...player.storage.map(train => ({ train, group: 'STORED' }))
        ];
        const start = Math.max(0, Math.min(selectedIndex - 7, Math.max(0, entries.length - 9)));
        for (let row = 0; row < 9 && start + row < entries.length; row++) {
            const index = start + row, entry = entries[index], ry = y + 92 + row * 48;
            ctx.fillStyle = index === selectedIndex ? CONSTANTS.COLORS.UI_HIGHLIGHT : '#e8e0c4';
            ctx.fillRect(x + 18, ry, width - 36, 38);
            ctx.fillStyle = index === selectedIndex ? CONSTANTS.COLORS.WHITE : CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`${entry.group.padEnd(7)} ${entry.train.species.name}`, x + 30, ry + 25);
            ctx.textAlign = 'right';
            ctx.fillText(`Lv${entry.train.level}`, x + width - 30, ry + 25);
            ctx.textAlign = 'left';
        }
    }

    static drawTrainDex(ctx, player, selectedIndex) {
        const x = 70, y = 45, width = 628, height = 580;
        ctx.fillStyle = CONSTANTS.COLORS.WHITE; ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK; ctx.lineWidth = 4; ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = CONSTANTS.COLORS.BLACK; ctx.font = 'bold 24px monospace';
        ctx.fillText(`TRAINDEX  SEEN ${player.seenSpecies.length}/151  CAUGHT ${player.caughtSpecies.length}/151`, x + 20, y + 38);
        const start = Math.max(0, Math.min(selectedIndex - 7, 141));
        for (let row = 0; row < 10; row++) {
            const id = start + row + 1, species = TRAIN_SPECIES[id], ry = y + 70 + row * 47;
            const seen = player.seenSpecies.includes(id), caught = player.caughtSpecies.includes(id);
            ctx.fillStyle = id - 1 === selectedIndex ? CONSTANTS.COLORS.UI_HIGHLIGHT : '#e8e0c4';
            ctx.fillRect(x + 18, ry, width - 36, 37);
            ctx.fillStyle = id - 1 === selectedIndex ? CONSTANTS.COLORS.WHITE : CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`#${String(id).padStart(3, '0')}  ${seen ? species.name : '----------'}`, x + 28, ry + 25);
            ctx.textAlign = 'right'; ctx.fillText(caught ? 'CAUGHT' : seen ? 'SEEN' : '', x + width - 28, ry + 25); ctx.textAlign = 'left';
        }
    }
}

class DialogueBox {
    constructor() {
        this.queue = [];
        this.currentIndex = 0;
        this.active = false;
        this.callback = null;
        this.charIndex = 0;
        this.textSpeed = 30; // Characters per second
        this.currentText = '';
    }

    show(dialogues, onComplete = null) {
        this.queue = Array.isArray(dialogues) ? dialogues : [dialogues];
        this.currentIndex = 0;
        this.active = true;
        this.onComplete = onComplete;
        this.charIndex = 0;
        this.currentText = '';
        this.startDialogue(this.queue[this.currentIndex]);
    }

    startDialogue(dialogue) {
        this.charIndex = 0;
        this.currentText = '';
        this.textSpeed = dialogue.speed || 30;
    }

    update(deltaTime) {
        if (!this.active || this.isFinished()) return;

        const dialogue = this.getCurrentDialogue();
        if (dialogue && this.currentText.length < dialogue.text.length) {
            this.charIndex += this.textSpeed * deltaTime;
            this.currentText = dialogue.text.substring(0, Math.floor(this.charIndex));
        }
    }

    advance() {
        if (this.isFinished()) {
            this.currentIndex++;
            if (this.currentIndex >= this.queue.length) {
                this.active = false;
                if (this.onComplete) {
                    this.onComplete();
                    this.onComplete = null;
                }
            } else {
                this.startDialogue(this.queue[this.currentIndex]);
            }
        } else {
            this.currentText = this.getCurrentDialogue().text;
        }
    }

    handleChoice(choiceIndex) {
        const dialogue = this.getCurrentDialogue();
        if (dialogue && dialogue.choices && dialogue.choices[choiceIndex]) {
            const choice = dialogue.choices[choiceIndex];
            if (choice.callback) {
                choice.callback();
            }
        }
    }

    isFinished() {
        const dialogue = this.getCurrentDialogue();
        return !dialogue || this.currentText.length === dialogue.text.length;
    }

    getCurrentDialogue() {
        if (this.active && this.currentIndex < this.queue.length) {
            return this.queue[this.currentIndex];
        }
        return null;
    }

    isActive() {
        return this.active;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UI, DialogueBox };
}
