# Design Hand-off Brief (for Claude Design)

Hand-off point: after the M1 core-systems rewrite + the spec bootstrap +
in-engine renderer overhaul landed on `main` (PR #89). This brief tells the
design loop what state the visuals are in, what to work on, the hard
constraints, and how design changes flow back into the verified spec layer.

## 1. Where the visuals are now

An in-engine renderer overhaul shipped (canvas drawing only, no real new art):
- Cohesive GBC palette in `js/constants.js` (`COLORS`).
- Battle screen: framed HUD cards, type chips, HP bars, stylized procedural
  locomotive fallback art, type-tinted 2x2 menu, sky/ground + platforms
  (`js/battle.js` `render()` and the `draw*Train` helpers).
- Overworld: directional player sprite, role-colored NPCs, textured fallback
  tiles; debug overlay gated behind `game.debug` (default false)
  (`js/game.js` `renderOverworld`, `drawPlayer`, `Game.TILE_COLORS`).
- Title + loading screens restyled (`js/game.js`).
- `imageSmoothingEnabled = false` (crisp pixels) - keep it.

Two things explicitly NOT solved in-engine (need real assets - the GPU/Spark
pipeline, see §5):
- The baked overworld **tileset PNG** is still the harsh pure-green art. Palette
  work only shows on tileset-less maps; softening the world needs regenerating
  `assets/tiles/*` and the per-map `tileset` images.
- **Per-species battle sprites**: only the 3 starters (Steamini/Sparkart/
  Diesling) have `assets/sprites/<Name>/front.png` + `back.png`. The other 148
  use the procedural locomotive. Intro screen (Professor Cypress) is still plain
  text.

## 2. Sources of truth (read these first)

- `ART_DIRECTION_SPECS.md` - the authoritative visual spec: per-train sprite
  specs, the 7 battle-UI components (HP bars, info boxes, move buttons, message
  box, action menu, background, sprite display), master color palette, and the
  priority implementation order. **This is the design north star.**
- `WORLDBUILDING.md`, `STORY.md` - world/narrative tone (serious adventure,
  subtle absurdity). Names/locations must match these.
- `specs/DESIGN.md` - the BEHAVIOURAL contracts. Design must not violate
  these (see §3).

## 3. Hard constraints

1. **Render-only.** Do not change game logic: battle resolution/turn order,
   capture, save/load, progression, input, state transitions. Logic lives in
   `js/{battle,game,player,train,moves,items,train-data,main}.js`; touch only
   rendering paths. If you need new state, add visual-only fields (e.g. another
   `game.*` animation clock), never gameplay state.
2. **Do not break the behavioural contracts.** `specs/DESIGN.md` encodes 7
   invariants (battle single-resolution, capture, party<=6, progression,
   save/load, map-warp, economy). They are currently behavioural, not visual,
   so design has wide freedom - BUT if you introduce a *load-bearing* visual
   rule (e.g. "evolution animation must complete before the battle ends"),
   round-trip it into `specs/DESIGN.md` + a spec bool (see §6). Don't quietly
   land behavior with no contract.
3. **Keep it bootable.** After changes: `node --check` every edited JS file,
   load the game (see §4), confirm 0 console errors, and screenshot the screens
   you touched.
4. **ASCII + small commits.** One issue per PR, conventional-commit messages,
   PRs pass the Grug Definition-of-Ready gate (Why / Acceptance criteria /
   Test plan / `Size: X` / Out of scope / issue link).

## 4. How to run + verify

```
python3 -m http.server 8080        # from repo root
# open http://127.0.0.1:8080/index.html
```
- `window.DEBUG_GAME` exposes the live `Game`. Press ` or F1 on the title for
  the debug menu (jump to overworld / wild battle / gym battle).
- To stage a battle screenshot:
  `g=DEBUG_GAME; g.player.party=[new Train(1,12)];
   g.battle=new Battle(g,g.player.party,[new Train(10,8)],true);
   g.battle.state=CONSTANTS.BATTLE_STATES.MENU; g.state=CONSTANTS.STATES.BATTLE`

## 5. Asset pipeline (the GPU items)

Art generation is GPU-side, NOT in-chat (see root `CLAUDE.md`). The repo has
`gen_*.sh` scripts and `DOCS/ASSET_PIPELINE.md` for ComfyUI / Stable Diffusion.
An NVIDIA Spark is being brought online for generation; until then, output the
prompts + file targets per `ART_DIRECTION_SPECS.md` and the operator runs them.
The two high-value targets:
- Overworld tilesets -> `assets/tiles/*` (muted GBC palette per art direction).
- Per-species front/back battle sprites -> `assets/sprites/<Name>/{front,back}.png`
  (the battle renderer already looks these up by species name and falls back if
  absent, so they can be dropped in incrementally).

## 6. Prioritized design backlog (open issues)

P1 / structural:
- #62 smooth scrolling movement (camera tween) - affects overworld feel most.
- #61 NPCs visible through buildings (render z-order bug).
- #42 integrate updated pixel tiles/sprites/UI per art direction (the umbrella).

Polish / screens:
- #74 pixel-perfect dialogue boxes (battle + overworld text box).
- #75 menu fade/slide transitions.
- #47 battle visuals - animations + feedback (hit/faint/throw animations).
- #50 evolution animation (logic already triggers evolution; needs the visuals).

Assets (gated on §5 pipeline):
- #67 overworld player character sprites.
- #66 Professor Cypress character sprite (intro screen still plain text).

## 7. Round-trip BACK to the spec layer (fill this out when done)

When a design session ends, report back in these 6 sections so the spec layer
absorbs changes without re-discovery (bullets > prose, file paths + §-numbers):

1. **DESIGN.md delta** - did you edit `specs/DESIGN.md`? List changed §-numbers,
   each flagged ADDITIVE / REPLACING / RELAXING. Else "no DESIGN.md delta".
2. **Implementation delta** - every JS/asset file edited + which §/issue it
   grounds.
3. **New contracts needing spec encoding** - any load-bearing rule you landed
   that has no §-anchor yet.
4. **Contracts removed or weakened** - so spec bools can drop/relax to match.
5. **Render state** - did you verify in-browser? Screenshots? Live or mock-only?
6. **Open questions** - anything ambiguous to resolve before spec encoding.

The spec-side then updates `specs/` + re-runs `verify-all.sh` and reports the
bool diff + cascade result.
