// Versioned save files with three independently managed browser slots.
(function (CD) {
  'use strict';
  const KEY = 'conducted.copper.save';
  const SLOT_COUNT = 3;

  function slotKey(slot) {
    if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) throw new Error('invalid save slot');
    return slot === 1 ? KEY : KEY + '.' + slot;
  }
  function backupKey(slot) { return slotKey(slot) + '.backup'; }
  function serialize(state) {
    const copy = JSON.parse(JSON.stringify(state));
    if (!Array.isArray(copy.party) || !Array.isArray(copy.box)) throw new Error('invalid game state');
    for (const t of copy.party.concat(copy.box)) delete t.stats;
    return JSON.stringify({ v: CD.STATE_VERSION, at: Date.now(), state: copy });
  }
  function deserialize(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.state) throw new Error('not a save file');
    if (data.v > CD.STATE_VERSION) throw new Error('save is from a newer version');
    if (!Array.isArray(data.state.party) || !Array.isArray(data.state.box)) throw new Error('not a save file');
    const s = Object.assign(CD.freshState(), data.state);
    s.options = Object.assign(CD.freshState().options, data.state.options || {});
    for (const t of s.party.concat(s.box)) { delete t.stats; CD.train.refresh(t); }
    return s;
  }
  function storage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }
  function readValid(ls, key) {
    const text = ls.getItem(key);
    if (!text) return null;
    deserialize(text);
    return text;
  }
  function readSlot(ls, slot) {
    try { return readValid(ls, slotKey(slot)); } catch (e) { return readValid(ls, backupKey(slot)); }
  }
  function save(slot) {
    slot = slot === undefined ? 1 : slot;
    const ls = storage();
    if (!ls) return { ok: false, error: 'This browser is not letting the game store data.' };
    try {
      CD.state.x = CD.ow.player.x; CD.state.y = CD.ow.player.y; CD.state.dir = CD.ow.player.dir;
      const text = serialize(CD.state);
      deserialize(text);
      const key = slotKey(slot), previous = ls.getItem(key);
      if (previous) { deserialize(previous); ls.setItem(backupKey(slot), previous); }
      ls.setItem(key, text);
      if (ls.getItem(key) !== text) throw new Error('storage did not confirm the save');
      return { ok: true };
    } catch (e) { return { ok: false, error: 'Saving failed: ' + e.message }; }
  }
  function load(slot) {
    slot = slot === undefined ? 1 : slot;
    const ls = storage(); if (!ls) return { ok: false, error: 'No storage available.' };
    try {
      const text = readSlot(ls, slot);
      if (!text) return { ok: false, error: 'No saved game in that slot.' };
      CD.state = deserialize(text);
      return { ok: true };
    } catch (e) { return { ok: false, error: 'The save could not be read: ' + e.message }; }
  }
  function slotExists(slot) {
    const ls = storage(); if (!ls) return false;
    try { return !!readSlot(ls, slot); } catch (e) { return false; }
  }
  function slots() {
    return Array.from({ length: SLOT_COUNT }, (_, i) => {
      const slot = i + 1, ls = storage();
      if (!ls) return { slot, exists: false, summary: null };
      try {
        const text = readSlot(ls, slot);
        const data = text && JSON.parse(text);
        return { slot, exists: !!data, summary: data ? data.state : null };
      } catch (e) { return { slot, exists: false, summary: null, error: 'Unreadable save' }; }
    });
  }
  function remove(slot) {
    const ls = storage(); if (!ls) return { ok: false, error: 'No storage available.' };
    try { ls.removeItem(slotKey(slot)); ls.removeItem(backupKey(slot)); return { ok: true }; }
    catch (e) { return { ok: false, error: 'Deleting failed: ' + e.message }; }
  }
  function exists() { return slotExists(1); }
  function summary() { const entry = slots()[0]; return entry && entry.summary; }
  CD.save = { KEY, SLOT_COUNT, slotKey, serialize, deserialize, save, load, exists, summary, slots, slotExists, remove };
})(window.CD);
