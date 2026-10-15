const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { console: { log() {}, error() {}, warn() {} }, module: undefined };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/game.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const result = vm.runInContext(`(() => {
    const train = { currentHP: 1, maxHP: 20, status: 'psn', fainted: true, ppRestored: false,
        restorePP() { this.ppRestored = true; } };
    let saved = false, played = false, complete;
    const lines = [];
    const game = {
        player: { x: 4, y: 3, direction: CONSTANTS.DIRECTIONS.UP, party: [train],
            healParty() { train.currentHP = train.maxHP; train.status = null; train.fainted = false; train.restorePP(); } },
        currentMap: { npcs: [{ x: 4, y: 2, name: 'Depot Clerk', type: 'healer' }] },
        state: CONSTANTS.STATES.OVERWORLD,
        dialogueBox: { show(dialogue, onComplete) { lines.push(...dialogue); complete = onComplete; } },
        save() { saved = true; }, audio: { playSound() { played = true; } }
    };
    Game.prototype.checkNPCInteraction.call(game);
    return { train, saved, played, lines, state: game.state, complete: !!complete,
        finish() { complete(); return game.state; } };
})()`, context);

assert.equal(result.train.currentHP, result.train.maxHP, 'healing restores HP');
assert.equal(result.train.status, null, 'healing clears status');
assert.equal(result.train.fainted, false, 'healing revives fainted trains');
assert.equal(result.train.ppRestored, true, 'healing restores PP');
assert.equal(result.saved, true, 'healed party is saved');
assert.equal(result.played, true, 'healing feedback plays');
assert.ok(Array.from(result.lines).some(line => /service|heal|restor/i.test(line.text)), 'clerk dialogue describes service');
assert.equal(result.state, 'dialogue');
assert.equal(result.complete, true);
assert.equal(result.finish(), 'overworld', 'dialogue completion returns to overworld');

console.log('Depot healing tests passed');
