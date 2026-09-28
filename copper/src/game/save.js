// Save and load. One serialization owner: the whole CD.state object, versioned.
// Stored in localStorage; failures (private mode, quota) are reported, never silent.
(function (CD) {
  'use strict';
  const KEY = 'conducted.copper.save';

  function serialize(state) {
    const copy = JSON.parse(JSON.stringify(state));
    // derived stats are recomputed on load
    for (const t of copy.party.concat(copy.box)) delete t.stats;
    return JSON.stringify({ v: CD.STATE_VERSION, at: Date.now(), state: copy });
  }
  function deserialize(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.state) throw new Error('not a save file');
    if (data.v > CD.STATE_VERSION) throw new Error('save is from a newer version');
    const s = Object.assign(CD.freshState(), data.state);
    s.options = Object.assign(CD.freshState().options, data.state.options || {});
    for (const t of s.party.concat(s.box)) { delete t.stats; CD.train.refresh(t); }
    return s;
  }
  function storage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }
  function save() {
    const ls = storage();
    if (!ls) return { ok: false, error: 'This browser is not letting the game store data.' };
    try {
      CD.state.x = CD.ow.player.x; CD.state.y = CD.ow.player.y; CD.state.dir = CD.ow.player.dir;
      ls.setItem(KEY, serialize(CD.state));
      return { ok: true };
    } catch (e) { return { ok: false, error: 'Saving failed: ' + e.message }; }
  }
  function exists() { const ls = storage(); try { return !!(ls && ls.getItem(KEY)); } catch (e) { return false; } }
  function summary() {
    const ls = storage(); if (!ls) return null;
    try { const d = JSON.parse(ls.getItem(KEY)); return d && d.state ? d.state : null; } catch (e) { return null; }
  }
  function load() {
    const ls = storage(); if (!ls) return { ok: false, error: 'No storage available.' };
    try {
      const text = ls.getItem(KEY);
      if (!text) return { ok: false, error: 'No saved game.' };
      CD.state = deserialize(text);
      return { ok: true };
    } catch (e) { return { ok: false, error: 'The save could not be read: ' + e.message }; }
  }
  CD.save = { KEY, serialize, deserialize, save, load, exists, summary };
})(window.CD);
