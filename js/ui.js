/**
 * UI Helper Functions
 */

class UI {
    // Pixel-art panel: notched dark-brown border, gold inner rule and a
    // parchment fill, all snapped to whole pixels so it stays crisp when the
    // canvas is scaled up on mobile.
    static drawPanel(ctx, x, y, width, height) {
        const px = Math.round(x), py = Math.round(y), w = Math.round(width), h = Math.round(height);
        const colors = CONSTANTS.COLORS;
        ctx.fillStyle = colors.PANEL_BORDER;
        ctx.fillRect(px + 1, py, w - 2, h);
        ctx.fillRect(px, py + 1, w, h - 2);
        ctx.fillStyle = colors.PANEL_ACCENT;
        ctx.fillRect(px + 3, py + 3, w - 6, h - 6);
        ctx.fillStyle = colors.PANEL_FILL;
        ctx.fillRect(px + 4, py + 4, w - 8, h - 8);
    }

    static drawTextBox(ctx, x, y, width, height, text) {
        UI.drawPanel(ctx, x, y, width, height);

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
        UI.drawPanel(ctx, x, y, width, height);

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

        UI.drawPanel(ctx, x, y, width, height);

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
        const x = 480;
        const y = 120;
        const width = 250;
        const height = 300;

        UI.drawPanel(ctx, x, y, width, height);

        // Header
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 20px monospace';
        ctx.fillText('MENU', x + 20, y + 35);

        // Draw options
        ctx.font = '18px monospace';
        const lineHeight = 38;

        for (let i = 0; i < options.length; i++) {
            const optionY = y + 75 + i * lineHeight;

            // Highlight selected
            if (i === selectedIndex) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, optionY - 22, width - 20, lineHeight - 6);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            ctx.fillText(options[i], x + 30, optionY);
        }

        // Draw money and instructions at bottom
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '14px monospace';
        ctx.fillText(`MONEY: $${player.money}`, x + 20, y + height - 38);
        ctx.fillText('A: Select  B: Exit', x + 20, y + height - 16);
    }

    static drawBag(ctx, player, bagSelection) {
        const x = 50;
        const y = 100;
        const width = 650;
        const height = 480;

        UI.drawPanel(ctx, x, y, width, height);

        // Title
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 24px monospace';
        ctx.fillText('BAG', x + 20, y + 40);

        // Build item list dynamically from player inventory
        const itemKeys = Object.keys(player.items || {}).filter(k => player.items[k] > 0);
        const items = itemKeys.map(k => {
            const def = (typeof Items !== 'undefined' && typeof Items.get === 'function') ? Items.get(k) : null;
            return {
                id: k,
                name: def ? def.name : k,
                count: player.items[k],
                description: def ? def.description : ''
            };
        });

        if (items.length === 0) {
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = '18px monospace';
            ctx.fillText('Your bag is empty.', x + 30, y + 100);
        } else {
            ctx.font = '18px monospace';
            const lineHeight = 38;
            const maxVisible = 7;
            const startIdx = Math.max(0, Math.min(bagSelection - 3, items.length - maxVisible));
            const endIdx = Math.min(items.length, startIdx + maxVisible);

            for (let i = startIdx; i < endIdx; i++) {
                const item = items[i];
                const rowIdx = i - startIdx;
                const itemY = y + 90 + rowIdx * lineHeight;

                if (i === bagSelection) {
                    ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                    ctx.fillRect(x + 10, itemY - 24, width - 20, lineHeight - 6);
                    ctx.fillStyle = CONSTANTS.COLORS.WHITE;
                } else {
                    ctx.fillStyle = CONSTANTS.COLORS.BLACK;
                }

                ctx.fillText(`${item.name} x${item.count}`, x + 30, itemY);
            }

            // Description of highlighted item
            const currentItem = items[bagSelection];
            if (currentItem && currentItem.description) {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
                ctx.font = '14px monospace';
                ctx.fillText(currentItem.description, x + 20, y + height - 48);
            }
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '14px monospace';
        ctx.fillText('A: Use item  -  B: Exit', x + 20, y + height - 20);
    }

    static drawBagUseOnTrain(ctx, player, trainSelection, itemName) {
        const x = 100;
        const y = 140;
        const width = 550;
        const height = 400;

        UI.drawPanel(ctx, x, y, width, height);

        // Title
        const def = (typeof Items !== 'undefined' && typeof Items.get === 'function') ? Items.get(itemName) : null;
        const displayName = def ? def.name : itemName;
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`Use ${displayName} on which train?`, x + 20, y + 35);

        // Train list
        ctx.font = '16px monospace';
        const lineHeight = 50;

        for (let i = 0; i < player.party.length; i++) {
            const train = player.party[i];
            if (!train) continue;
            const trainY = y + 80 + i * lineHeight;

            // Highlight selected
            if (i === trainSelection) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 10, trainY - 28, width - 20, lineHeight - 6);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            const hpPercent = Math.floor((train.currentHP / train.maxHP) * 100);
            ctx.fillText(`${train.nickname || train.species.name} Lv${train.level}  HP: ${train.currentHP}/${train.maxHP} (${hpPercent}%)`, x + 20, trainY);
            this.drawProgressBar(ctx, x + 350, trainY - 14, 160, 12, hpPercent, train.getHPColor());
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '14px monospace';
        if (player.menuMessage) {
            ctx.fillText(player.menuMessage, x + 20, y + height - 42);
        }
        ctx.fillText('A: Confirm  -  B: Cancel', x + 20, y + height - 18);
    }

    static drawTrainsOverlay(ctx, player, trainSelection) {
        const x = 34;
        const y = 30;
        const width = 700;
        const height = 612;

        // Main frame
        UI.drawPanel(ctx, x, y, width, height);

        // Header
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 22px monospace';
        ctx.fillText('TRAIN CREW & SPECS', x + 20, y + 36);

        // Party column on left (width 260)
        const leftW = 260;
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 14, y + 54, leftW, height - 100);

        const party = player.party || [];
        ctx.font = '15px monospace';
        for (let i = 0; i < party.length; i++) {
            const train = party[i];
            if (!train) continue;
            const rowY = y + 80 + i * 54;

            if (i === trainSelection) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 16, rowY - 20, leftW - 4, 48);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            ctx.fillText(`${train.nickname || train.species.name}`, x + 24, rowY);
            ctx.font = '12px monospace';
            ctx.fillText(`Lv.${train.level}  HP: ${train.currentHP}/${train.maxHP}`, x + 24, rowY + 18);
            ctx.font = '15px monospace';
        }

        // Details panel on right (width 390)
        const rightX = x + leftW + 28;
        const selectedTrain = party[trainSelection];

        if (selectedTrain) {
            // Species name and level
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 20px monospace';
            ctx.fillText(`${selectedTrain.nickname || selectedTrain.species.name}`, rightX, y + 80);
            ctx.font = '16px monospace';
            ctx.fillText(`Level ${selectedTrain.level}`, rightX + 240, y + 80);

            // Types
            for (let i = 0; i < (selectedTrain.types || []).length; i++) {
                const typeName = selectedTrain.types[i];
                const badgeX = rightX + i * 90;
                const badgeY = y + 96;
                ctx.fillStyle = (CONSTANTS.TYPE_COLORS && CONSTANTS.TYPE_COLORS[typeName]) || '#888888';
                ctx.fillRect(badgeX, badgeY, 80, 22);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
                ctx.font = 'bold 12px monospace';
                ctx.fillText(typeName, badgeX + 8, badgeY + 16);
            }

            // HP bar
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = '14px monospace';
            ctx.fillText(`HP: ${selectedTrain.currentHP} / ${selectedTrain.maxHP}`, rightX, y + 144);
            const hpPct = Math.floor((selectedTrain.currentHP / selectedTrain.maxHP) * 100);
            const hpCol = selectedTrain.getHPColor();
            this.drawProgressBar(ctx, rightX, y + 152, 360, 14, hpPct, hpCol);

            // Stats grid
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 15px monospace';
            ctx.fillText('STATS', rightX, y + 196);
            ctx.font = '14px monospace';
            ctx.fillText(`ATK: ${selectedTrain.attack}`, rightX, y + 224);
            ctx.fillText(`DEF: ${selectedTrain.defense}`, rightX + 100, y + 224);
            ctx.fillText(`SPD: ${selectedTrain.speed}`, rightX + 200, y + 224);
            ctx.fillText(`SPC: ${selectedTrain.special}`, rightX + 290, y + 224);

            // Moves box
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 15px monospace';
            ctx.fillText('MOVES', rightX, y + 270);

            const moves = selectedTrain.moves || [];
            ctx.font = '14px monospace';
            for (let i = 0; i < 4; i++) {
                const moveY = y + 300 + i * 50;
                ctx.strokeStyle = CONSTANTS.COLORS.LIGHT_GRAY;
                ctx.lineWidth = 1;
                ctx.strokeRect(rightX, moveY - 18, 360, 42);

                if (i < moves.length) {
                    const moveKey = moves[i];
                    const def = (typeof MOVES_DB !== 'undefined' && MOVES_DB[moveKey]) ? MOVES_DB[moveKey] : null;
                    const moveName = def ? def.name : moveKey;
                    const maxPP = def ? def.pp : 0;
                    const currentPP = (selectedTrain.movePP && selectedTrain.movePP[moveKey] !== undefined) ? selectedTrain.movePP[moveKey] : maxPP;
                    const moveType = def ? def.type : 'NORMAL';
                    const power = def && def.power ? def.power : '--';

                    ctx.fillStyle = CONSTANTS.COLORS.BLACK;
                    ctx.font = 'bold 14px monospace';
                    ctx.fillText(moveName, rightX + 10, moveY + 2);
                    ctx.font = '12px monospace';
                    ctx.fillText(`TYPE: ${moveType}  PWR: ${power}`, rightX + 10, moveY + 18);
                    ctx.fillText(`PP: ${currentPP}/${maxPP}`, rightX + 260, moveY + 8);
                } else {
                    ctx.fillStyle = '#888888';
                    ctx.fillText(' - ', rightX + 10, moveY + 8);
                }
            }
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '14px monospace';
        ctx.fillText('Up/Down: Select Train  -  B: Back', x + 20, y + height - 16);
    }

    static drawTraindex(ctx, player, entries, selection) {
        const x = 40;
        const y = 50;
        const width = 688;
        const height = 572;

        UI.drawPanel(ctx, x, y, width, height);

        const list = entries || [];
        const sel = Math.min(Math.max(0, selection || 0), Math.max(0, list.length - 1));
        const caughtCount = list.filter(entry => entry.caught).length;

        // Header
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 22px monospace';
        ctx.fillText('TRAINDEX', x + 20, y + 38);
        ctx.font = '16px monospace';
        ctx.fillText(`Caught: ${caughtCount} / ${list.length}`, x + width - 230, y + 38);

        // List column on left
        const leftW = 280;
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 14, y + 56, leftW, height - 100);

        const rowsPerPage = 11;
        const rowH = 42;
        const listTop = y + 88;
        const first = Math.floor(sel / rowsPerPage) * rowsPerPage;
        for (let i = 0; i < rowsPerPage && first + i < list.length; i++) {
            const idx = first + i;
            const entry = list[idx];
            const rowY = listTop + i * rowH;

            if (idx === sel) {
                ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                ctx.fillRect(x + 16, rowY - 22, leftW - 4, rowH - 6);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            } else {
                ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            }

            ctx.font = '14px monospace';
            const num = '#' + String(entry.id).padStart(3, '0');
            ctx.fillText(entry.caught ? `${num} ${entry.name}` : `${num} ??????`, x + 24, rowY);
        }

        // Details panel on right
        const rightX = x + leftW + 28;
        const selected = list[sel];

        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        if (selected && selected.caught) {
            ctx.font = 'bold 20px monospace';
            ctx.fillText(selected.name, rightX, y + 88);
            ctx.font = '16px monospace';
            ctx.fillText('#' + String(selected.id).padStart(3, '0'), rightX + 300, y + 88);

            // Types
            const types = selected.types || [];
            for (let i = 0; i < types.length; i++) {
                const badgeX = rightX + i * 90;
                const badgeY = y + 104;
                ctx.fillStyle = (CONSTANTS.TYPE_COLORS && CONSTANTS.TYPE_COLORS[types[i]]) || '#888888';
                ctx.fillRect(badgeX, badgeY, 80, 22);
                ctx.fillStyle = CONSTANTS.COLORS.WHITE;
                ctx.font = 'bold 12px monospace';
                ctx.fillText(types[i], badgeX + 8, badgeY + 16);
            }

            // Base stats
            const stats = selected.baseStats || {};
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 15px monospace';
            ctx.fillText('BASE STATS', rightX, y + 176);
            ctx.font = '14px monospace';
            ctx.fillText(`HP:  ${stats.hp}`, rightX, y + 204);
            ctx.fillText(`ATK: ${stats.attack}`, rightX + 150, y + 204);
            ctx.fillText(`DEF: ${stats.defense}`, rightX, y + 232);
            ctx.fillText(`SPD: ${stats.speed}`, rightX + 150, y + 232);
            ctx.fillText(`SPC: ${stats.special}`, rightX, y + 260);
        } else if (selected) {
            ctx.font = 'bold 20px monospace';
            ctx.fillText('NO DATA', rightX, y + 88);
            ctx.font = '14px monospace';
            ctx.fillText('Catch this train to', rightX, y + 130);
            ctx.fillText('register it in the', rightX, y + 152);
            ctx.fillText('Traindex.', rightX, y + 174);
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '14px monospace';
        ctx.fillText('Up/Down: Browse  -  B: Back', x + 20, y + height - 16);
    }

    static drawSaveOverlay(ctx, player, currentMap, saveSelection, saveMessage) {
        const x = 134;
        const y = 110;
        const width = 500;
        const height = 430;

        // Main frame
        UI.drawPanel(ctx, x, y, width, height);

        // Header
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 22px monospace';
        ctx.fillText('SAVE JOURNEY', x + 24, y + 42);

        // Player summary block
        const summaryY = y + 70;
        ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 24, summaryY, width - 48, 140);

        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        const mapName = currentMap ? (currentMap.name || currentMap.id || 'Aurum Region') : 'Aurum Region';
        ctx.fillText(`Location : ${mapName}`, x + 40, summaryY + 32);
        ctx.fillText(`Badges   : ${(player.badges || []).length} / 8`, x + 40, summaryY + 64);
        const seenCount = (player.seenSpecies || []).length;
        const caughtCount = (player.caughtSpecies || []).length;
        ctx.fillText(`Traindex : Caught ${caughtCount} / Seen ${seenCount}`, x + 40, summaryY + 96);
        ctx.fillText(`Party    : ${(player.party || []).length} Trains`, x + 40, summaryY + 124);

        if (saveMessage) {
            ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
            ctx.fillRect(x + 24, y + 240, width - 48, 80);
            ctx.fillStyle = CONSTANTS.COLORS.WHITE;
            ctx.font = 'bold 18px monospace';
            ctx.fillText(saveMessage, x + 40, y + 286);

            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = '14px monospace';
            ctx.fillText('Press A or B to return', x + 24, y + height - 24);
        } else {
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = 'bold 18px monospace';
            ctx.fillText('Would you like to save your progress?', x + 24, y + 250);

            // Choice options: YES / NO
            const choiceY = y + 290;
            const choices = ['YES', 'NO'];

            for (let i = 0; i < choices.length; i++) {
                const btnX = x + 80 + i * 180;
                if (i === saveSelection) {
                    ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
                    ctx.fillRect(btnX, choiceY, 120, 44);
                    ctx.fillStyle = CONSTANTS.COLORS.WHITE;
                } else {
                    ctx.fillStyle = CONSTANTS.COLORS.LIGHT_GRAY;
                    ctx.fillRect(btnX, choiceY, 120, 44);
                    ctx.fillStyle = CONSTANTS.COLORS.BLACK;
                }
                ctx.strokeStyle = CONSTANTS.COLORS.BLACK;
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, choiceY, 120, 44);
                ctx.font = 'bold 18px monospace';
                ctx.fillText(choices[i], btnX + 42, choiceY + 28);
            }

            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = '14px monospace';
            ctx.fillText('Left/Right: Select  -  A: Confirm  -  B: Cancel', x + 24, y + height - 24);
        }
    }

    static drawOptionsOverlay(ctx, audio, textSpeedSetting, optionsSelection) {
        const x = 134;
        const y = 130;
        const width = 500;
        const height = 370;

        // Main frame
        UI.drawPanel(ctx, x, y, width, height);

        // Header
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 22px monospace';
        ctx.fillText('OPTIONS', x + 24, y + 42);

        // Option 1: Audio Toggle
        const opt1Y = y + 90;
        if (optionsSelection === 0) {
            ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
            ctx.fillRect(x + 20, opt1Y, width - 40, 50);
            ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        } else {
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        }
        ctx.font = 'bold 18px monospace';
        ctx.fillText('AUDIO', x + 40, opt1Y + 32);
        const audioState = (audio && audio.muted) ? 'OFF' : 'ON';
        ctx.fillText(audioState, x + width - 120, opt1Y + 32);

        // Option 2: Text Speed Placeholder
        const opt2Y = y + 160;
        if (optionsSelection === 1) {
            ctx.fillStyle = CONSTANTS.COLORS.UI_HIGHLIGHT;
            ctx.fillRect(x + 20, opt2Y, width - 40, 50);
            ctx.fillStyle = CONSTANTS.COLORS.WHITE;
        } else {
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        }
        ctx.font = 'bold 18px monospace';
        ctx.fillText('TEXT SPEED', x + 40, opt2Y + 32);
        const speedState = textSpeedSetting || 'MID';
        ctx.fillText(speedState, x + width - 120, opt2Y + 32);

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '14px monospace';
        ctx.fillText('Up/Down: Select  -  Left/Right/A: Change  -  B: Back', x + 24, y + height - 24);
    }

    static drawShop(ctx, shopItems, selectedIndex, player, mode = 'buy', message = '') {
        const x = 100;
        const y = 100;
        const width = 600;
        const height = 400;

        UI.drawPanel(ctx, x, y, width, height);

        // Title
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = 'bold 24px monospace';
        ctx.fillText(mode === 'categories' ? 'RAIL MART' : mode === 'sell' ? 'SELL ITEMS' : 'BUY ' + mode.toUpperCase(), x + 20, y + 40);

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
            const label = typeof item === 'string' ? item : item.displayName;
            ctx.fillText(label, x + 30, itemY - 5);
            if (typeof item !== 'string') {
                ctx.font = '16px monospace';
                ctx.fillText(`$${item.price}`, x + 400, itemY - 5);
                ctx.fillText(item.description, x + 30, itemY + 20);
            }
            ctx.font = '20px monospace';
        }

        // Instructions
        ctx.fillStyle = CONSTANTS.COLORS.BLACK;
        ctx.font = '16px monospace';
        if (message) ctx.fillText(message, x + 20, y + height - 52);
        ctx.fillText(mode === 'categories' ? 'A: choose / B: close' : mode === 'sell' ? 'A: sell / B: categories' : 'A: buy / B: categories', x + 20, y + height - 20);
    }

    static drawTrainParty(ctx, player, trainSelection) {
        const x = 100;
        const y = 150;
        const width = 550;
        const height = 350;

        UI.drawPanel(ctx, x, y, width, height);

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
        UI.drawPanel(ctx, x, y, width, height);
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
        if (player.menuMessage) {
            ctx.fillStyle = CONSTANTS.COLORS.BLACK;
            ctx.font = '14px monospace';
            ctx.fillText(player.menuMessage, x + 24, y + height - 18);
        }
    }

    static drawTrainDex(ctx, player, selectedIndex) {
        const x = 70, y = 45, width = 628, height = 580;
        UI.drawPanel(ctx, x, y, width, height);
        ctx.fillStyle = CONSTANTS.COLORS.BLACK; ctx.font = 'bold 24px monospace';
        const totalSpecies = Object.keys(TRAIN_SPECIES).length;
        ctx.fillText(`TRAINDEX  SEEN ${player.seenSpecies.length}/${totalSpecies}  CAUGHT ${player.caughtSpecies.length}/${totalSpecies}`, x + 20, y + 38);
        const start = Math.max(0, Math.min(selectedIndex - 7, totalSpecies - 10));
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
