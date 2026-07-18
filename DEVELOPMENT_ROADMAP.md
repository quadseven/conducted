# CONDUCTED - Development Roadmap
## Train Battle RPG - Pokemon Red/Blue Replica

**Last Updated:** October 30, 2025
**Status:** Pre-MVP Development
**Total Issues:** 59 (12 new, 47 existing)
**GitHub Milestones:** 6 phases planned

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Development Philosophy](#development-philosophy)
3. [Milestone Breakdown](#milestone-breakdown)
4. [Critical Path (Next 2-4 Weeks)](#critical-path-next-2-4-weeks)
5. [Issue Categories](#issue-categories)
6. [Priority System](#priority-system)
7. [Dependencies and Blockers](#dependencies-and-blockers)
8. [Testing Strategy](#testing-strategy)
9. [Completion Criteria](#completion-criteria)

---

## Project Overview

**CONDUCTED** is a pixel-perfect replica of Pokemon Red/Blue using trains instead of Pokemon. The game features:
- 151 unique train species (already defined in `js/train-data.js`)
- Classic turn-based battle system with Gen 1 damage calculations
- 8 train types with type advantages (Steam, Electric, Diesel, Maglev, Freight, Passenger, Nuclear, Monorail)
- Mobile-first design with touch controls
- Complete story campaign with 8 gym leaders, rival battles, and Team Steam Punk storyline
- Full worldbuilding and character dialogue documented in `WORLDBUILDING.md` and `STORY.md`

### Recent Victory
✅ **Building entry bug (#12) fixed** - Players can now enter and exit buildings correctly

### Current State
- Basic battle system exists but incomplete (no PP, status conditions, party switching)
- World map has limited areas (mostly Piston Town)
- Save/load works but needs expansion for new features
- All 151 trains defined with stats, moves, and evolution data
- Complete narrative content written and ready to implement

---

## Development Philosophy

### Make Each Milestone Independently Playable
Each milestone should result in a game that:
1. Can be played from start to current endpoint
2. Doesn't crash or soft-lock
3. Provides a complete (if limited) experience

### Bite-Sized Coding Tasks
Issues are designed to be:
- Completable in 1-4 hours for most features
- Clearly scoped with acceptance criteria
- Minimal external dependencies where possible

### Mobile-First, Desktop-Compatible
- Touch controls are already implemented
- All new UI must work on mobile screens
- Keyboard controls remain fully functional

---

## Milestone Breakdown

### Milestone 1: Core Gameplay Loop (MVP)
**Due Date:** November 15, 2025 (2 weeks)
**Goal:** Make the game actually playable with a complete minimal game loop

#### Key Features (18 issues)
**P0-Critical Issues:**
- #52 Fix map transitions and door entry/exit system
- #12 Make door tiles walkable and trigger building entry transitions

**P1-High Issues:**
- #3 Implement Gym Battles and Badge System (basic version)
- #4 Implement Train Evolution System
- #6 Improve Save/Load System
- #9 Create Title Screen and Intro Sequence
- #10 Expand the World Map
- #48 Implement level-up experience system and progression
- #49 Implement trainer battles with rewards and defeat dialogue
- #50 Implement evolution triggering and animation
- #51 Implement item system with bag, inventory, and item effects
- #53 Add money/currency system with battle rewards and spending
- #54 Implement starter selection scene with Professor Cypress dialogue
- #55 Create Route 1 and Coal Harbor maps with wild encounters
- #56 Implement white-out (defeat) and respawn system
- #57 Add pause menu with Trains/Bag/Save/Options

**P2-Medium Issues:**
- #7 Enhance UI/Menu System
- #58 Implement run/flee from wild battles

#### What Players Can Do After M1:
- Start a new game with Professor Cypress intro
- Choose a starter train (Steamini, Sparkart, or Diesling)
- Battle wild trains on Route 1 and gain experience
- Level up and learn new moves
- Evolve trains at appropriate levels
- Battle NPC trainers for money
- Use items (Potions, Trainballs) from bag
- Catch wild trains (basic capture mechanics)
- Visit Coal Harbor town
- Heal at Train Depot
- Buy items at Rail Mart
- Save and load progress
- Experience defeat and respawn at depot

#### Success Metrics:
- 30+ minutes of gameplay without bugs
- Complete loop: catch → train → evolve → heal → save
- Players can reach level 15-20 with starter
- At least 5 different train species catchable

---

### Milestone 2: Battle System Polish
**Due Date:** December 1, 2025 (4 weeks total)
**Goal:** Complete all Pokemon battle mechanics to match Gen 1 quality

#### Key Features (8 issues)
**P1-High Issues:**
- #26 Implement battle bag menu and item usage
- #27 Add Trainball capture mechanics for wild battles
- #28 Enable party switching and forced swaps in battle
- #29 Add status conditions and end-of-turn processing
- #30 Track move PP and disable moves at 0

**P2-Medium Issues:**
- #15 Add difficulty scaling for progression
- #17 Balance move damage and type effectiveness for strategic depth
- #31 Upgrade trainer AI for move choice and switching

#### What's New After M2:
- Battles feel like Pokemon Red/Blue
- Status conditions (burn, poison, paralysis, sleep, freeze) work correctly
- PP tracking forces strategic move management
- Can switch trains mid-battle
- Trainer AI makes smart move choices
- Capture mechanics use proper Gen 1 formula
- Difficulty scales appropriately across game

#### Success Metrics:
- Battles require strategic thinking
- Status moves are useful
- Trainer battles are challenging but fair
- Capture rate feels like Pokemon

---

### Milestone 3: World Exploration
**Due Date:** December 22, 2025 (8 weeks total)
**Goal:** Expand the map with all towns, services, and progression gating

#### Key Features (14 issues)
**P1-High Issues:**
- #23 Implement Train Depot healing service
- #24 Create Rail Mart shop interface and economy
- #25 Add Rail PC storage system for trains and items
- #32 Implement track technique gating (Cut/Surf analogs)
- #38 Extend save data schema for badges, story flags, and PC storage

**P2-Medium Issues:**
- #1 Add Comprehensive NPC Dialogues
- #2 Expand Town Interiors
- #13 Replace hardcoded door transitions with data-driven definitions
- #14 Build Piston Town interior maps and connect their entrances
- #16 Hook up world map edge transitions using connection metadata
- #18 Build Routes 2-4 and Steamspring Village overworld maps
- #19 Design Diesel Den and Maglev Heights regions with connecting routes
- #37 Build unified menu overlays (Bag, Trains, Save, Options) with mobile support
- #40 Balance wild encounters and trainer parties across Locomotia
- #41 Create interiors for remaining towns (Steamspring through Monorail Summit)
- #59 Add badge tracking and overworld permissions system

#### What's New After M3:
- All 9 major towns exist with interiors
- Routes 1-8+ connect towns logically
- Train Depots heal party in every town
- Rail Marts sell items with proper economy
- PC storage for 150+ trains
- Track techniques gate progression (need badges)
- Rich NPC dialogues throughout world
- Balanced wild encounters per area

#### Success Metrics:
- 5+ hours of exploration content
- All towns feel distinct and alive
- Progression gating works smoothly
- Economy feels balanced (not too easy/hard to buy items)

---

### Milestone 4: Story & NPCs
**Due Date:** January 15, 2026 (11 weeks total)
**Goal:** Implement the full story campaign with all narrative beats

#### Key Features (4 issues)
**P1-High Issues:**
- #33 Build gym battles, puzzles, and badge rewards for all station masters

**P2-Medium Issues:**
- #21 Script Team Steam Punk encounters and hideout infiltration
- #22 Implement rival Blake encounters across the campaign
- #45 Author NPC dialogue passes and side quests for each town

#### What's New After M4:
- 8 gym battles with unique puzzles and themed leaders
- Rival Blake appears at key story moments
- Team Steam Punk storyline unfolds across 3 acts
- Rich side quests in every town
- Gym badges unlock new areas and abilities
- NPC dialogue reacts to player progress

#### Success Metrics:
- Complete story playthrough in 8-12 hours
- Each gym leader feels unique and memorable
- Rival battles provide difficulty spikes
- Story is engaging and motivates progression

---

### Milestone 5: Polish & Features
**Due Date:** February 5, 2026 (14 weeks total)
**Goal:** Add audio, visuals, and quality-of-life features

#### Key Features (7 issues)
**P2-Medium Issues:**
- #8 Add Sound Effects and Music
- #35 Implement audio manager for music and SFX
- #36 Integrate location music and battle SFX library
- #39 Set up automated smoke tests for overworld and battle loops
- #44 Integrate Traindex (Pokédex) tracking into the in-game menu

**P3-Low Issues:**
- #42 Integrate updated pixel art tiles, sprites, and UI per art direction
- #46 Add rail pass fast travel system unlocked mid-game
- #47 Enhance battle visuals with animations and feedback

#### What's New After M5:
- Music plays in every location
- Sound effects for battles and UI
- Pixel art replaces placeholder graphics
- Battle animations add juice to combat
- Traindex accessible from pause menu
- Fast travel between visited towns
- Automated tests prevent regressions

#### Success Metrics:
- Game feels polished and professional
- Audio enhances immersion
- Visuals match art direction specs
- QoL features reduce tedium

---

### Milestone 6: Endgame Content
**Due Date:** February 28, 2026 (17 weeks total)
**Goal:** Implement Victory Road, Elite Four, and completionist content

#### Key Features (4 issues)
**P1-High Issues:**
- #34 Implement Victory Road, Elite Four, and Champion finale

**P2-Medium Issues:**
- #20 Build late-game areas (Ghost Graveyard, Nuclear Station, Monorail Summit)

**P3-Low Issues:**
- #5 Complete the Traindex (151 Trains)
- #11 Research advanced train behaviors and personality traits
- #43 Design and implement branching train evolutions with comedic twists

#### What's New After M6:
- Victory Road dungeon with tough trainers
- Elite Four sequential boss battles
- Champion battle and credits sequence
- Post-game legendary train hunts
- All 151 trains catchable and documented
- Branching evolutions add replay value
- 100% completion achievable

#### Success Metrics:
- Elite Four provides satisfying challenge
- Post-game content extends playtime 3-5 hours
- Catching all 151 trains is achievable
- Game feels complete and polished

---

## Critical Path (Next 2-4 Weeks)

### Week 1 (Nov 1-7): Foundation Fixes
**Priority:** Fix game-breaking issues and core systems

1. **#52 Fix map transitions** (P0-Critical)
   - Ensure door entry/exit works perfectly
   - Test all existing map connections
   - Fix any spawn position bugs
   - **Blocks:** All exploration features

2. **#48 Implement level-up system** (P1-High)
   - EXP gain after battles
   - Level-up animation and stat increases
   - Move learning at designated levels
   - **Blocks:** Evolution, trainer battles

3. **#51 Implement item system** (P1-High)
   - Inventory storage
   - Item usage (Potions, Trainballs)
   - Integration with bag menu
   - **Blocks:** Healing, capturing, shops

### Week 2 (Nov 8-14): Core Loop Completion
**Priority:** Make the basic game loop playable

4. **#54 Starter selection scene** (P1-High)
   - Professor Cypress dialogue
   - Three starter choice
   - Initial item gifts
   - **Blocks:** New game experience

5. **#49 Trainer battles** (P1-High)
   - NPC trainer system
   - Prize money rewards
   - Defeat flags
   - **Blocks:** Gym battles, rival fights

6. **#55 Route 1 and Coal Harbor** (P1-High)
   - First route with wild encounters
   - Coal Harbor town layout
   - Basic NPCs and services
   - **Blocks:** Early game content

7. **#50 Evolution system** (P1-High)
   - Trigger on level-up
   - Animation sequence
   - Data updates
   - **Blocks:** Progression feel

### Week 3 (Nov 15-21): Services and Economy
**Priority:** Add healing, shopping, and saving

8. **#53 Money system** (P1-High)
   - Money from trainer battles
   - Spending at shops
   - Persistence in save data

9. **#23 Train Depot healing** (P1-High)
   - Clerk interaction
   - Full party heal
   - Available in all towns

10. **#24 Rail Mart shops** (P1-High)
    - Buy/sell UI
    - Item inventory
    - Mobile-friendly controls

11. **#56 White-out system** (P1-High)
    - Defeat handling
    - Money loss
    - Respawn at depot

### Week 4 (Nov 22-28): Polish and Testing
**Priority:** Make Milestone 1 feel complete

12. **#57 Pause menu** (P1-High)
    - Trains, Bag, Save, Options
    - Mobile touch navigation
    - Clean state management

13. **#6 Improve save/load** (P1-High)
    - Save all new data (items, money, flags)
    - Test save/load at multiple points
    - Ensure no data loss

14. **#58 Run from battles** (P2-Medium)
    - Flee from wild encounters
    - Speed-based success rate
    - Cannot flee from trainers

15. **Comprehensive testing**
    - Play through entire M1 content
    - Fix any discovered bugs
    - Verify save/load at checkpoints

---

## Issue Categories

### By Type
- **Feature** (26 issues): New gameplay mechanics
- **Content** (19 issues): Maps, dialogue, NPCs, data
- **Bug/Critical** (3 issues): Game-breaking fixes
- **Polish** (7 issues): Visual/audio enhancements
- **Testing** (1 issue): QA and automated tests

### By Priority
- **P0-Critical** (3 issues): Game-breaking bugs
- **P1-High** (28 issues): Core gameplay features for MVP
- **P2-Medium** (22 issues): Important but not blocking
- **P3-Low** (6 issues): Polish and nice-to-haves

---

## Priority System

### P0-Critical
**Definition:** Game-breaking bugs that prevent core gameplay
**Timeline:** Fix immediately, within 24-48 hours
**Examples:**
- #52 Map transitions broken
- #12 Can't enter buildings

### P1-High
**Definition:** Core gameplay features needed for MVP
**Timeline:** Complete within current milestone
**Examples:**
- #48 Level-up system
- #49 Trainer battles
- #54 Starter selection

### P2-Medium
**Definition:** Important features that enhance the experience
**Timeline:** Complete in following milestone
**Examples:**
- #37 Advanced menus
- #40 Encounter balancing
- #31 Improved AI

### P3-Low
**Definition:** Polish and nice-to-have features
**Timeline:** Complete in polish phase (M5/M6)
**Examples:**
- #42 Pixel art integration
- #46 Fast travel
- #43 Branching evolutions

---

## Dependencies and Blockers

### Core Dependencies (Must Build First)
1. **Item System (#51)** → Required for:
   - Capture mechanics (#27)
   - Battle bag menu (#26)
   - Shops (#24)
   - Healing (#23)

2. **Level-Up System (#48)** → Required for:
   - Evolution (#50)
   - Trainer battles (#49)
   - Difficulty scaling (#15)

3. **Money System (#53)** → Required for:
   - Shops (#24)
   - White-out penalty (#56)
   - Trainer rewards (#49)

4. **Map Transitions (#52)** → Required for:
   - World expansion (#10)
   - Town interiors (#2, #14, #41)
   - Route connections (#16, #18, #19)

### Parallel Development Opportunities
These can be built simultaneously:
- **Art & Audio:** #42 (pixel art) + #35/36 (audio) = no code conflicts
- **Content Creation:** #45 (dialogue) + #40 (encounters) = data-only changes
- **Testing:** #39 (automated tests) can be built alongside features

---

## Testing Strategy

### Manual Testing Checkpoints
After each major feature, test:
1. **Save/Load:** Does the feature persist correctly?
2. **Mobile:** Does it work on touch controls?
3. **Edge Cases:** What happens with 0 HP, full party, no money, etc.?
4. **Integration:** Does it break existing features?

### Milestone Testing
Before marking a milestone complete:
1. Play through all content from scratch
2. Test save/load at 5+ different points
3. Verify mobile controls work for all new UI
4. Confirm no soft-locks or crashes
5. Check performance on lower-end devices

### Automated Testing (#39)
Goal: Prevent regressions in core loops
- Map navigation tests
- Battle victory/defeat tests
- Save/load serialization tests
- Wild encounter triggering tests

---

## Completion Criteria

### Milestone 1 Complete When:
- [ ] New game starts with Professor Cypress intro
- [ ] Player can choose and receive starter train
- [ ] Wild encounters work on Route 1
- [ ] Battles award EXP and level up trains
- [ ] Trains evolve at correct levels
- [ ] Can catch wild trains with Trainballs
- [ ] Trainer battles award money
- [ ] Can buy items at Rail Mart
- [ ] Can heal at Train Depot
- [ ] Can save/load at any point
- [ ] Defeat respawns at last depot
- [ ] 30+ minutes of bug-free gameplay

### Full Game Complete When (Milestone 6):
- [ ] All 8 gyms beatable with badges
- [ ] Elite Four and Champion defeated
- [ ] All 151 trains catchable
- [ ] Traindex 100% complete
- [ ] Story fully playable from start to credits
- [ ] All music and SFX implemented
- [ ] Pixel art replaces all placeholders
- [ ] No known game-breaking bugs
- [ ] Mobile experience is polished
- [ ] 10-15 hours of gameplay content

---

## Resources and Documentation

### Key Files
- **Train Data:** `js/train-data.js` (all 151 trains already defined)
- **Move Data:** `js/moves.js` (complete move list)
- **World Maps:** `js/world-maps.js` (map definitions)
- **Story Content:** `STORY.md` (campaign outline)
- **Character Dialogue:** `WORLDBUILDING.md` (NPC dialogue scripts)
- **Art Specs:** `ART_DIRECTION_SPECS.md` (visual guidelines)
- **Audio Specs:** `AUDIO_SPECIFICATIONS.md` (music/SFX requirements)

### External Resources
- **GitHub Issues:** https://github.com/quadseven/conducted/issues
- **Milestones:** https://github.com/quadseven/conducted/milestones
- **Gen 1 Pokemon Mechanics:** https://bulbapedia.bulbagarden.net/wiki/Generation_I

---

## Development Velocity Estimates

### Optimistic (Full-time development)
- Milestone 1: 2 weeks
- Milestone 2: 2 weeks
- Milestone 3: 3 weeks
- Milestone 4: 3 weeks
- Milestone 5: 3 weeks
- Milestone 6: 2 weeks
- **Total: 15 weeks (4 months)**

### Realistic (Part-time development)
- Milestone 1: 3-4 weeks
- Milestone 2: 3 weeks
- Milestone 3: 4 weeks
- Milestone 4: 4 weeks
- Milestone 5: 3 weeks
- Milestone 6: 3 weeks
- **Total: 20-21 weeks (5 months)**

### Conservative (Hobby pace)
- Milestone 1: 6 weeks
- Milestone 2: 4 weeks
- Milestone 3: 6 weeks
- Milestone 4: 6 weeks
- Milestone 5: 4 weeks
- Milestone 6: 4 weeks
- **Total: 30 weeks (7.5 months)**

---

## Quick Reference: Next Steps

### Right Now (This Week)
1. Fix map transitions (#52)
2. Build level-up system (#48)
3. Implement item system (#51)

### Next Week
4. Create starter selection (#54)
5. Build trainer battles (#49)
6. Create Route 1 (#55)

### Week After
7. Add money system (#53)
8. Add depot healing (#23)
9. Add shops (#24)

### Week 4
10. Build pause menu (#57)
11. Improve save system (#6)
12. Add flee mechanic (#58)
13. Test entire M1 thoroughly

---

## Success Metrics Dashboard

### Current Status (October 30, 2025)
- **Milestones Created:** 6/6 ✅
- **Issues Organized:** 59/59 ✅
- **Labels Applied:** All issues labeled ✅
- **Documentation:** Comprehensive roadmap complete ✅

### Milestone 1 Progress
- **Total Issues:** 18
- **Completed:** 0
- **In Progress:** 0
- **Not Started:** 18
- **% Complete:** 0%

### Overall Project Health
- **Total Issues:** 59
- **P0-Critical:** 3 (need immediate attention)
- **P1-High:** 28 (core gameplay)
- **Documented Content:** Ready to implement (WORLDBUILDING.md, STORY.md)
- **Art Assets:** Specs ready, implementation pending
- **Audio Assets:** Specs ready, implementation pending

---

## Contributing Guidelines

### For Developers
1. Pick an issue from current milestone
2. Check dependencies - can it be built now?
3. Work on branch named `feature/issue-##`
4. Test mobile controls before PR
5. Update documentation if behavior changes
6. Link PR to issue number

### For Designers
1. Pixel art specs in `ART_DIRECTION_SPECS.md`
2. Export at correct pixel sizes
3. Use specified color palettes
4. Test on mobile resolutions
5. Provide animations as sprite sheets

### For Writers
1. All dialogue goes in `WORLDBUILDING.md`
2. Follow character voice guidelines
3. Keep tone warm and cozy
4. Reference existing examples
5. Maintain consistency with STORY.md

---

## FAQ

**Q: Can I work on Milestone 5 features now?**
A: Not recommended. Focus on M1 first to get a playable game.

**Q: What if I find a bug not in the issue list?**
A: Create a new issue with `P0-critical` label if game-breaking, otherwise add to appropriate milestone.

**Q: How accurate to Pokemon Red/Blue should this be?**
A: Mechanics should match Gen 1 exactly. Theming and content are train-themed variations.

**Q: Can I change the art style?**
A: Follow `ART_DIRECTION_SPECS.md` guidelines. Propose changes via issue discussion first.

**Q: What about Pokemon mechanics from later generations?**
A: Defer to post-launch. This is explicitly a Gen 1 replica.

---

**Last Updated:** October 30, 2025
**Next Review:** November 15, 2025 (after M1 deadline)
**Maintained By:** Evan + Contributors
