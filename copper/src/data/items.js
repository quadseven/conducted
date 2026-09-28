// Item registry: the single source for names, prices, descriptions and effects.
// kind: ball | heal | status | revive | battle | key | evo
(function (CD) {
  'use strict';
  const I = {};
  function it(id, name, kind, price, desc, fx) { I[id] = { id, name, kind, price, desc, fx: fx || {} }; }
  it('trainball', 'TRAINBALL', 'ball', 200, 'A coupling sphere for catching wild trains.', { rate: 1 });
  it('greatball', 'EXPRESSBALL', 'ball', 600, 'A tighter coupling. Catches better than a TRAINBALL.', { rate: 1.5 });
  it('ultraball', 'FREIGHTBALL', 'ball', 1200, 'Heavy-duty coupling for strong wild trains.', { rate: 2 });
  it('potion', 'POTION', 'heal', 300, 'Restores 20 HP to one train.', { hp: 20 });
  it('superpotion', 'SUPER POTION', 'heal', 700, 'Restores 50 HP to one train.', { hp: 50 });
  it('antidote', 'DESCALER', 'status', 100, 'Cures a corroded (poisoned) train.', { cure: 'psn' });
  it('burnheal', 'COOLANT', 'status', 250, 'Cools an overheating (burned) train.', { cure: 'brn' });
  it('parlyzheal', 'RESET FUSE', 'status', 200, 'Fixes a shorted-out (paralyzed) train.', { cure: 'par' });
  it('awakening', 'WAKE BELL', 'status', 250, 'Rouses an idling (sleeping) train.', { cure: 'slp' });
  it('fullheal', 'FULL SERVICE', 'status', 600, 'Cures any status problem.', { cure: 'all' });
  it('revive', 'JUMP START', 'revive', 1500, 'Restarts a stalled train with half its HP.', { revive: 0.5 });
  it('repel', 'TRACK HORN', 'field', 350, 'Keeps weak wild trains away for 100 steps.', { repel: 100 });
  it('escape', 'ESCAPE TICKET', 'field', 550, 'Returns you to the last depot you visited.', {});
  it('thunderstone', 'SPARK COIL', 'evo', 2100, 'Makes certain electric trains evolve.', {});
  it('mapcase', 'RAIL MAP', 'key', 0, 'A map of the Locomotia rail network.', {});
  it('pass', 'CONDUCTOR PASS', 'key', 0, 'Proof that you are a registered Conductor.', {});
  CD.items = { I, get: id => I[id], name: id => (I[id] ? I[id].name : id.toUpperCase()) };
})(window.CD);
