const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Load the UI class the way the browser does: constants first, then ui.js.
const context = { console };
vm.createContext(context);
for (const file of ['js/constants.js', 'js/ui.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const UI = vm.runInContext('UI', context);

// Superseded draw helpers that nothing calls; the menu overlays replaced them (#237).
for (const name of ['drawMenu', 'drawTrainSummary', 'drawShop', 'drawTrainParty', 'drawTrainDex']) {
    assert.equal(UI[name], undefined, `UI.${name} is dead code and stays removed`);
}

// The live helpers the game and the overlays draw with are still there.
for (const name of ['drawPanel', 'drawProgressBar', 'drawPauseMenu', 'drawTraindex', 'drawDepot']) {
    assert.equal(typeof UI[name], 'function', `UI.${name} is still defined`);
}

console.log('ui-dead-code tests passed');
