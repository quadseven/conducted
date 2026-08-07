# Conducted - Game Systems Design (Spec Source of Truth)

This is the authoritative contract document for the Conducted core game systems.
Sections are `§N`-numbered so code and other docs can cite them precisely. If
code and this doc disagree, align code to the doc (or amend the doc in the same
change and note why).

Narrative/world/art truth lives in `WORLDBUILDING.md`, `STORY.md`, and
`ART_DIRECTION_SPECS.md`. This doc governs *behavioural* contracts only.

The contracts below were derived from the post-audit core-systems rewrite; each
encodes a bug class that was found and fixed, so the spec layer guards against
regression.

---

## §1 Overview

Conducted is a browser, Canvas-2D, no-framework Pokemon-style RPG where the
player captures, trains, and battles trains. State is held in plain objects;
persistence is `localStorage`. There is no server.

Core entities with kernel-verified contracts:

- §3 Battle lifecycle  -> `0001-battle`
- §4 Capture           -> `0002-capture`
- §5 Party             -> `0003-party`
- §6 Progression       -> `0004-progression`
- §7 Save / Load       -> `0005-save-load`
- §8 Map / Warp        -> `0006-map-warp`
- §9 Economy / Shop    -> `0007-economy`

---

## §2 Top-level game state machine

`title -> intro -> starter_selection -> overworld -> {battle | menu | dialogue}`.

- A returning player with a save and a non-empty party resumes from `title`
  straight to `overworld` (the transient run-state is NOT persisted; §7).
- Every state transition clears one-shot "just pressed" input so a key buffered
  during one state cannot auto-trigger an action in the next.

---

## §3 Battle lifecycle

A battle is created, runs zero or more turns, resolves exactly once, and is then
torn down. Contracts:

1. **Single end-of-battle owner.** Exactly ONE code path resolves the end of a
   battle (`checkBattleEnd`). Victory/defeat handlers are idempotent. At most one
   end-of-battle resolution may be in flight at any time. (Fixes the double-EXP /
   double-badge race.)
2. **Turn order by effective speed + priority.** The acting order of a turn is
   determined by move priority first, then status-adjusted effective speed
   (paralysis quarters speed), ties broken randomly. The player does NOT always
   act first.
3. **Damage computed at resolution time.** A move's damage is computed when it
   resolves, against the then-current state - not when the move is selected.
4. **Faint interrupts the turn.** When a train faints mid-turn, remaining queued
   actions for that turn do not execute; resolution passes to the single owner.
5. **EXP awarded once per defeated enemy.** Each defeated enemy grants EXP to the
   active train exactly once, before the next enemy (if any) is sent out.

Lifecycle: `Drafted -> Engaged -> Resolved -> Retired`. `Resolved` is reached at
most once; `Retired` is terminal and returns control to the overworld.

---

## §4 Capture

Throwing a Boxcar at a WILD train may capture it (Gen-1 style shake formula).
Contracts:

1. **No trainer capture.** A Boxcar can never capture a trainer-owned train.
2. **Captured trains are never lost.** A successfully captured train is always
   added to the party, or (if the party is full) explicitly released with a
   message - it never silently vanishes. (Fixes the inert-capture bug where the
   caught train was recorded but never read.)
3. **Guaranteed-catch shortcut.** Catch math honours the Gen-1 instant-catch
   case; a failed catch grants the wild train one free turn.

Lifecycle: `Drafted -> Thrown -> Resolved -> Retired`. `Resolved` records the
single outcome (caught-and-placed OR broke-free).

---

## §5 Party

The player's party of trains. Contracts:

1. **Bounded size.** The party never exceeds 6 trains.
2. **Overflow is explicit.** Adding to a full party fails loudly (caller handles
   box/release), never silently drops the train.
3. **Heal is total.** Healing the party restores full HP AND clears status AND
   revives fainted trains, via a single canonical method.

Lifecycle: `Drafted -> Active -> Full -> Retired` (Full = at the 6 cap).

---

## §6 Progression

A train gains EXP, levels up, and may evolve. Contracts:

1. **Gain-before-level ordering.** A level-up only occurs after EXP is gained
   past the next threshold; level is capped at 100.
2. **Evolve only when eligible.** Evolution fires only when `canEvolve` holds:
   level-method at/after the threshold level, or item-method with the matching
   item. Evolution happens after the level-up that made it eligible.
3. **Instance isolation.** A train instance never mutates its shared species
   template (type arrays are cloned), so evolving/altering one train cannot
   corrupt other trains of the same species.

Lifecycle: `Drafted -> Leveled -> Evolved -> Retired`.

---

## §7 Save / Load

Persistence to `localStorage`. Contracts:

1. **Single serialization owner.** Save/load delegate to `Player.toJSON` /
   `Player.fromJSON` - the one schema. No hand-rolled divergent copy. (Fixes the
   bug where badges + story flags were silently dropped on load.)
2. **Round-trip preserves progress.** Badges, badge count, story flags
   (`metProfessor`, `defeatedGymLeaders`), party (with IVs), items, and money
   survive a save -> load round trip.
3. **No transient state persisted.** The run-state (title/battle/menu) is not
   saved; the title screen decides whether to resume (§2). A save carries a
   `version` for future migration.

Lifecycle: `Drafted -> Saved -> Loaded -> Retired`.

---

## §8 Map / Warp transitions

Overworld movement and map-to-map warps. Contracts:

1. **Warps resolve to a real map.** A warp only fires if its destination map is
   registered; an unknown destination is refused (never strands the player).
2. **Never warp into a wall.** A warp destination tile is walkable.
3. **Reciprocal, re-entry-safe.** Warp endpoints are paired, and stepping onto a
   destination tile does not immediately re-trigger the reciprocal warp
   (no ping-pong).

Lifecycle: `Drafted -> Entered -> Arrived -> Retired` (Arrived = on the
destination map at the destination tile).

---

## §9 Economy / Shop

Money and the mart. Contracts:

1. **Single spend gate.** All spending goes through `Player.spendMoney`, which
   refuses if unaffordable; money can never go negative.
2. **Atomic purchase.** A purchase either deducts the price AND grants the item,
   or does neither.
3. **Catalog is data.** The shop catalog is derived from the single Items
   registry, not hardcoded per call site.

Lifecycle: `Drafted -> Priced -> Settled -> Retired` (Settled = purchase
committed or refused).
