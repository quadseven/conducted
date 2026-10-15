const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class FakeTrain {
    constructor(id, fainted = false) { this.id = id; this.fainted = fainted; }
    toJSON() { return { id: this.id, fainted: this.fainted }; }
    static fromJSON(data) { return new FakeTrain(data.id, data.fainted); }
}

const context = { CONSTANTS: { DIRECTIONS: { DOWN: 'down' }, MAX_PARTY_SIZE: 6 }, Train: FakeTrain,
    console: { warn() {} }, module: { exports: {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/player.js', 'utf8'), context, { filename: 'js/player.js' });
const Player = context.module.exports;

const player = new Player();
player.party = [new FakeTrain('healthy'), new FakeTrain('fainted', true)];
assert.equal(player.depositTrain(0), 'Keep at least one healthy train in your crew.');
assert.equal(player.party.length, 2, 'cannot deposit the last healthy train');
assert.equal(player.depositTrain(1), 'Train deposited.', 'fainted train can be stored');
assert.equal(player.storage.length, 1);

player.party = Array.from({ length: 6 }, (_, i) => new FakeTrain(`party-${i}`));
assert.equal(player.withdrawTrain(0), 'Your crew is full.');
assert.equal(player.storage.length, 1, 'full crew leaves the stored train in storage');
player.party.pop();
assert.equal(player.withdrawTrain(0), 'Train withdrawn.');

const loaded = Player.fromJSON(JSON.parse(JSON.stringify(player.toJSON())));
assert.deepEqual(loaded.storage.map(train => train.id), []);
assert.deepEqual(loaded.party.map(train => train.id), player.party.map(train => train.id));
player.storage.push(new FakeTrain('persistent'));
const roundTrip = Player.fromJSON(JSON.parse(JSON.stringify(player.toJSON())));
assert.deepEqual(roundTrip.storage.map(train => train.id), ['persistent']);

console.log('Train storage tests passed');
