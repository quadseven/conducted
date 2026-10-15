# Audio track and cue map

Audio is synthesized at runtime by the Web Audio engine. There are no external
audio files to download or compress. Track IDs below are the stable lookup keys
used by maps and game events; replace the implementation in
`src/data/music.js` or the procedural cues in `src/core/audio.js` when authored
assets are ready.

## Music tracks

| Track ID | Use / trigger | Source |
| --- | --- | --- |
| `title` | Title screen | `src/data/music.js` |
| `lab` | Professor's lab map | `src/data/music.js` |
| `piston` | Piston Town and its house interiors | `src/data/music.js` |
| `route1` | Route 1 | `src/data/music.js` |
| `harbor` | Coal Harbor and Harbor House | `src/data/music.js` |
| `depot` | Harbor Depot and Harbor Mart | `src/data/music.js` |
| `gym` | Harbor Gym | `src/data/music.js` |
| `wild` | Wild battle | `src/data/music.js` |
| `trainer` | Trainer battle | `src/data/music.js` |
| `leader` | Gym leader battle | `src/data/music.js` |
| `rival` | Rival battle | `src/data/music.js` |
| `spotted` | Trainer noticed / pre-battle | `src/data/music.js` |
| `victoryWild` | Wild battle victory | `src/data/music.js` |
| `victoryTrainer` | Trainer battle victory | `src/data/music.js` |
| `evolve` | Evolution sequence | `src/data/music.js` |

## One-shot music cues

| Cue ID | Trigger | Source |
| --- | --- | --- |
| `heal` | Party healing | `src/data/music.js` |
| `levelup` | Train levels up | `src/data/music.js` |
| `caught` | Capture succeeds | `src/data/music.js` |
| `evolved` | Evolution completes | `src/data/music.js` |
| `badge` | Badge awarded | `src/data/music.js` |
| `item` | Item or move learned | `src/data/music.js` |

## Sound effects

`src/core/audio.js` owns the procedural SFX. Existing event IDs include
`cursor`, `select`, `cancel`, `hit`, `hitweak`, `hitsuper`, `throw`, `shake`,
`poof`, `faint`, `heal`, `statup`, `statdown`, `expfill`, `encounter`, `run`,
and `lowhp`. Battle scenes call these for attacks, capture attempts, healing,
and battle state changes; menus use the cursor/select/cancel set.

Map entry and return-from-menu music playback is handled by
`src/game/overworld.js`, which reads each map's `music` ID from
`src/data/maps.js`. Battle and event transitions call the same audio manager
directly from `src/game/battlescene.js` and related scenes.

Only Piston Town, Route 1, and Coal Harbor are currently authored as outdoor
locations. Later towns should add a track definition and assign its ID in the
map data. Keep generated audio in code until a sourced or commissioned asset
is available, and record any file replacement here with its format and size.
