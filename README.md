# Grand Transit

Grand Transit is a zero-dependency browser RPG about collecting, training, and battling 151 train species. The campaign spans eight railway districts, Team Derail's sabotage plot, eight Stationmasters, four Elite Conductors, and the Champion.

The game runs in an HTML5 Canvas. It uses procedural pixel art and Web Audio synthesis. It does not fetch images, music, libraries, or game data from external services.

## Start the game

Serve the repository through a local web server so browsers can load every asset consistently.

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/index.html`.

## Controls

Desktop controls:

- arrow keys move and navigate menus
- Z or Enter confirms, interacts, and advances dialogue
- X or Backspace cancels
- Escape opens the field menu

Touch devices show a directional pad and A and B buttons below the game screen.

## Campaign

Choose Steamini, Sparkart, or Diesling in Piston Town. The main line then crosses these districts:

1. Coal Harbor
2. Copper Junction
3. Ironworks
4. Verdant Platform
5. Skybeam
6. Isotope City
7. Velocity Terminal
8. Crown Central

Each district has a route, trainers, wild encounters, a city, and a Stationmaster battle. Team Derail blocks key routes during the middle chapters. Eight badges open Grand Terminus, where the Elite Conductors and Champion wait.

## Visual direction

The runtime art is drawn procedurally at a crisp 16-pixel tile scale. Each district has its own material palette, architecture, track furniture, vegetation, signs, platforms, and station details. Battles take place in an iron-and-glass terminal arena, where the eight train types use distinct creature silhouettes and every species receives deterministic body, wheel, cargo, crest, and color variation.

The surrounding interface is designed as a railway dispatch cabinet on desktop and a compact handheld control deck on mobile. No runtime artwork depends on a network request.

## Collection and progression

The game includes:

- 151 named species with stable types, stats, catch rates, experience yields, and learnsets
- eight train types and a complete 8 by 8 effectiveness chart
- 50 physical, special, and status moves
- wild encounters and four-shake Boxcar capture checks
- a persistent TrainDex for seen and caught species
- six active crew slots and persistent Depot storage
- experience, level-up moves, and evolution
- 0 to 15 individual values and Gen 1 stat experience
- shops, field items, battle items, healing depots, money, and blackout penalties

## Battle rules

Battles use the Gen 1 base damage structure, 1.5 times same-type attack bonus, a 6.25% base critical rate, and a random damage factor from 217 to 255. The engine also supports stat stages, accuracy, evasion, poison, burn, paralysis, confusion, flinching, recoil, recharge turns, fixed damage, and multi-hit moves.

Trainer AI scores move power, accuracy, same-type bonus, type effectiveness, status value, and the opponent's remaining HP. It adds a small random factor so repeated battles do not use an identical script.

## Saving

The game saves to browser local storage every 30 seconds. The field controls also provide manual save, load, export, and import actions.

Save data includes:

- player position and current map
- party and Depot trains
- levels, moves, HP, status, IVs, and stat experience
- inventory and money
- badges and defeated trainers
- story flags and TrainDex records

## Project structure

The main browser runtime lives in `js/`:

- `train-data.js`, `types.js`, and `moves.js` define battle data
- `npcData.js`, `world-maps.js`, and `story.js` define the campaign
- `train.js`, `player.js`, and `battle.js` implement progression and combat
- `game.js` owns the state machine and campaign orchestration
- `graphics.js` and Canvas drawing methods render the game
- `audio.js` generates music and effects through Web Audio
- `main.js` runs the 60 FPS update and render loop

The older Python files are not part of the browser build.

## Validation

Run the dependency-free integrity tests:

```bash
node tests/core-integrity.test.js
node tests/starter-selection.test.js
```

The core test verifies species and move counts, unique names, learnsets, types, matchups, NPC rosters, campaign map counts, warp destinations, warp coordinates, EV serialization, Depot serialization, and old-save map migration.

## Original work

Grand Transit uses an original railway setting, train species, names, story, graphics, sounds, maps, and dialogue. Its turn-based collection structure draws inspiration from handheld monster-training RPGs.
