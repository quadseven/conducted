// Encounter balancing configuration for Locomotia
// This file defines tiered encounter tables aligned with badge progression
// and trainer party scaling. Designers can adjust values here without
// touching battle logic code.

(function (CD) {
  'use strict';

  // Badge progression for Locomotia
  // Each badge tier has specific level ranges and encounter themes
  const BADGE_TIERS = {
    TIER_1: { name: 'TIER_1', minLevel: 2, maxLevel: 5, badge: null },
    TIER_2: { name: 'TIER_2', minLevel: 6, maxLevel: 10, badge: 'harbor' },
    TIER_3: { name: 'TIER_3', minLevel: 11, maxLevel: 15, badge: 'voltage' },
    TIER_4: { name: 'TIER_4', minLevel: 16, maxLevel: 20, badge: 'cinder' },
    TIER_5: { name: 'TIER_5', minLevel: 21, maxLevel: 25, badge: 'breeze' },
    TIER_6: { name: 'TIER_6', minLevel: 26, maxLevel: 30, badge: 'magnetic' },
    TIER_7: { name: 'TIER_7', minLevel: 31, maxLevel: 35, badge: 'aquamarine' },
    TIER_8: { name: 'TIER_8', minLevel: 36, maxLevel: 40, badge: 'emerald' },
    TIER_9: { name: 'TIER_9', minLevel: 41, maxLevel: 45, badge: 'sky' },
    TIER_10: { name: 'TIER_10', minLevel: 46, maxLevel: 50, badge: 'core' },
  };

  // Species to use in encounter tables (referenced by species.js IDs)
  // Each type has a curated list of appropriate species
  const ENCOUNTER_TABLES = {
    // Opening route - common trackies and grass monsters
    ROUTE_1_GRASS: [
      { species: 10, minLevel: 2, maxLevel: 4, weight: 32 }, // TRACKIE (Passenger)
      { species: 58, minLevel: 2, maxLevel: 4, weight: 28 }, // COCOGAT (Passenger)
      { species: 13, minLevel: 3, maxLevel: 5, weight: 18 }, // SHUH (Firefly)
      { species: 28, minLevel: 3, maxLevel: 4, weight: 10 }, // CATERPILLUS (Caterpillar)
      { species: 22, minLevel: 3, maxLevel: 4, weight: 7 }, // BUTTERWING (Moth)
      { species: 132, minLevel: 3, maxLevel: 4, weight: 5 }, // SPEARLOW (Sparrow)
    ],

    // Harbor yard - cargo trains and yard workers
    COAL_HARBOR_YARD: [
      { species: 43, minLevel: 5, maxLevel: 8, weight: 24 }, // MENTALIS (Psychic)
      { species: 52, minLevel: 6, maxLevel: 8, weight: 18 }, // EXEGGUTOR (Nut)
      { species: 25, minLevel: 5, maxLevel: 7, weight: 18 }, // PIKACHU ( Electric)
      { species: 16, minLevel: 5, maxLevel: 7, weight: 14 }, // RATTATA (Mouse)
      { species: 141, minLevel: 5, maxLevel: 7, weight: 10 }, // CABRIOLET (Goat)
      { species: 40, minLevel: 6, maxLevel: 8, weight: 8 }, // WIGGLYTUFF (Blob)
      { species: 78, minLevel: 7, maxLevel: 8, weight: 5 }, // RAPIDASH (Horse)
      { species: 34, minLevel: 6, maxLevel: 7, weight: 3 }, // CLEFAIRY (Fairy)
    ],

    // Route 5-10: Mix of types as player explores
    MID_GAME_GRASS: [
      { species: 59, minLevel: 11, maxLevel: 13, weight: 25 }, // ARCANINE (Fire)
      { species: 66, minLevel: 11, maxLevel: 13, weight: 20 }, // MACHOP (Fighting)
      { species: 69, minLevel: 12, maxLevel: 14, weight: 18 }, // BELSLEB (Mushroom)
      { species: 72, minLevel: 12, maxLevel: 14, weight: 15 }, // TENTACOOL (Jelly)
      { species: 92, minLevel: 13, maxLevel: 15, weight: 12 }, // GASTLY (Ghost)
      { species: 129, minLevel: 13, maxLevel: 15, weight: 10 }, // MAGIKARP (Fish)
    ],

    // Mountain routes - rocky terrain species
    MOUNTAIN_TRAILS: [
      { species: 54, minLevel: 18, maxLevel: 20, weight: 25 }, // ODDISH (Flower)
      { species: 74, minLevel: 18, maxLevel: 20, weight: 20 }, // GEODUDE (Rock)
      { species: 95, minLevel: 19, maxLevel: 21, weight: 18 }, // ONIX (Rock)
      { species: 116, minLevel: 19, maxLevel: 21, weight: 15 }, // HORSEA (Dragon)
      { species: 128, minLevel: 20, maxLevel: 22, weight: 12 }, // TAuros (Bull)
      { species: 134, minLevel: 20, maxLevel: 22, weight: 10 }, // VADER (Water)
    ],

    // Cave dungeons - dark/rock/ground species
    CAVE_DUNGEONS: [
      { species: 74, minLevel: 22, maxLevel: 24, weight: 30 }, // GEODUDE (Rock)
      { species: 95, minLevel: 23, maxLevel: 25, weight: 25 }, // ONIX (Rock)
      { species: 83, minLevel: 23, maxLevel: 25, weight: 20 }, // FARFETCHD (Duck)
      { species: 133, minLevel: 24, maxLevel: 26, weight: 15 }, // EEVEE (Evolution)
      { species: 203, minLevel: 25, maxLevel: 27, weight: 10 }, // GIRAFARIG (Giraffe)
    ],

    // Late game routes - powerful species
    LATE_GAME: [
      { species: 54, minLevel: 35, maxLevel: 37, weight: 25 }, // ODDISH (Flower)
      { species: 134, minLevel: 36, maxLevel: 38, weight: 20 }, // VADER (Water)
      { species: 143, minLevel: 35, maxLevel: 37, weight: 18 }, // ZUBAT (Bat)
      { species: 150, minLevel: 40, maxLevel: 42, weight: 12 }, // LARVITAR (Rock)
      { species: 248, minLevel: 45, maxLevel: 47, weight: 8 }, // TYRANITAR (Rock)
    ],

    // Elite Four and Champion -顶级 species
    ELITE_FOUR: [
      { species: 150, minLevel: 55, maxLevel: 57, weight: 20 }, // CHARIZARD (Fire)
      { species: 151, minLevel: 56, maxLevel: 58, weight: 20 }, // BLASTOISE (Water)
      { species: 152, minLevel: 55, maxLevel: 57, weight: 18 }, // VENUSAUR (Grass)
      { species: 248, minLevel: 58, maxLevel: 60, weight: 15 }, // TYRANITAR (Rock)
      { species: 130, minLevel: 57, maxLevel: 59, weight: 12 }, // Gyarados (Water)
      { species: 142, minLevel: 56, maxLevel: 58, weight: 10 }, // AERODACTYL (Rock)
      { species: 144, minLevel: 58, maxLevel: 60, weight: 5 }, // Articuno (Ice)
    ],
  };

  // Trainer classes with their themed party types
  const TRAINER_CLASSES = {
    YOUNGSTER: {
      theme: 'Beginner trainers with basic starter trains',
      prizeBase: 16,
      partySize: 2,
      typeBias: 'passenger',
    },
    LASS: {
      theme: 'Trainers focused on fast, agile trains',
      prizeBase: 18,
      partySize: 2,
      typeBias: 'passenger/electric',
    },
    RAIL_FAN: {
      theme: 'Eclectic parties showcasing rare or interesting trains',
      prizeBase: 12,
      partySize: 3,
      typeBias: 'mixed',
    },
    DECKHAND: {
      theme: 'Freight train crew members',
      prizeBase: 30,
      partySize: 2,
      typeBias: 'freight/diesel',
    },
    DOCKHAND: {
      theme: 'Harbor workers with heavy-haul trains',
      prizeBase: 30,
      partySize: 2,
      typeBias: 'freight/diesel',
    },
    STATIONMASTER: {
      theme: 'Gym leaders with elite, well-trained parties',
      prizeBase: 100,
      partySize: 3,
      typeBias: 'freight/diesel',
    },
    COORDINATOR: {
      theme: 'Showcase trainers with beautiful, well-trained trains',
      prizeBase: 50,
      partySize: 3,
      typeBias: 'mixed/beauty',
    },
    SCIENTIST: {
      theme: 'Researchers with experimental or rare trains',
      prizeBase: 60,
      partySize: 3,
      typeBias: 'psychic/electric',
    },
    LEADER: {
      theme: 'Elite trainers with highly evolved trains',
      prizeBase: 150,
      partySize: 3,
      typeBias: 'mixed/ultimate',
    },
  };

  // Prize scaling factor: base prize multiplied by (1 + badgeTier * scaling)
  const PRIZE_SCALING = {
    scalePerBadge: 1.25,
    minPrize: 10,
    maxPrize: 500,
  };

  // Encounter rate per step (out of 256) by environment type
  const ENCOUNTER_RATES = {
    grass: 26, // Standard tall grass
    road: 18, // Clear roads
    cave: 22, // Caves with some light
    darkCave: 30, // Pitch-black caves
    water: 10, // Surfing encounters
    yard: 30, // Yard/siding areas
    building: 0, // No wild encounters
  };

  // Map encounter assignments - each map points to one or more encounter tables
  const MAP_ENCOUNTERS = {
    // Route 1 - Opening route, Tier 1
    'Route1': {
      grass: {
        table: ENCOUNTER_TABLES.ROUTE_1_GRASS,
        rate: 26,
      },
    },

    // Coal Harbor yard - Tier 1/2 transition
    'CoalHarbor': {
      yard: {
        table: ENCOUNTER_TABLES.COAL_HARBOR_YARD,
        rate: 30,
      },
    },

    // Later routes will be added here as the game progresses
    // These are placeholders showing the structure
    'Route5': {
      grass: {
        table: ENCOUNTER_TABLES.MID_GAME_GRASS,
        rate: 26,
      },
    },

    'Route10': {
      grass: {
        table: ENCOUNTER_TABLES.LATE_GAME,
        rate: 26,
      },
    },

    'MysteryCave': {
      cave: {
        table: ENCOUNTER_TABLES.CAVE_DUNGEONS,
        rate: 22,
      },
    },

    'VictoryRoad': {
      darkCave: {
        table: ENCOUNTER_TABLES.ELITE_FOUR,
        rate: 30,
      },
    },
  };

  // Helper function to scale species levels by badge tier
  function scaleSpeciesByTier(speciesTables, badgeTier, tierConfig) {
    const levelOffset = (badgeTier - 1) * 3;
    const minLvl = tierConfig ? tierConfig.minLevel + levelOffset : 1;
    const maxLvl = tierConfig ? tierConfig.maxLevel + levelOffset : 20;

    return speciesTables.map(table => ({
      ...table,
      slots: table.slots.map(slot => [
        slot[0], // species ID
        Math.max(1, slot[1] + levelOffset), // min level
        Math.min(100, slot[2] + levelOffset), // max level
        slot[3], // weight
      ]),
    }));
  }

  // Helper to calculate scaled prize money
  function calculatePrize(basePrize, badgeCount, config) {
    const scaled = basePrize * Math.pow(config.scalePerBadge, badgeCount);
    return Math.min(config.maxPrize, Math.max(config.minPrize, Math.floor(scaled)));
  }

  // Helper to build a party with proper level scaling
  function buildScaledParty(partyTemplate, badgeCount, baseLevel) {
    const levelScale = badgeCount * 2;
    return partyTemplate.map(([speciesId, level]) => [
      speciesId,
      Math.min(100, level + levelScale),
    ]);
  }

  // Export configuration for use in trainers.js and documentation
  CD.encounterConfig = {
    BADGE_TIERS,
    ENCOUNTER_TABLES,
    TRAINER_CLASSES,
    PRIZE_SCALING,
    ENCOUNTER_RATES,
    MAP_ENCOUNTERS,
    scaleSpeciesByTier,
    calculatePrize,
    buildScaledParty,
  };

  // Validation: check that all required fields are present
  function validateConfig() {
    const issues = [];

    // Check badge tiers
    Object.values(BADGE_TIERS).forEach(tier => {
      if (tier.minLevel >= tier.maxLevel) {
        issues.push(`Badge tier ${tier.name} has invalid level range: ${tier.minLevel}-${tier.maxLevel}`);
      }
    });

    // Check encounter tables have valid species IDs
    Object.entries(ENCOUNTER_TABLES).forEach(([name, slots]) => {
      slots.forEach((slot, i) => {
        if (slot.species < 0) {
          issues.push(`${name}[${i}]: invalid species ID ${slot.species}`);
        }
        if (slot.minLevel > slot.maxLevel) {
          issues.push(`${name}[${i}]: minLevel (${slot.minLevel}) > maxLevel (${slot.maxLevel})`);
        }
        if (slot.weight <= 0) {
          issues.push(`${name}[${i}]: invalid weight ${slot.weight}`);
        }
      });
    });

    // Check trainer classes have valid prize bases
    Object.entries(TRAINER_CLASSES).forEach(([cls, data]) => {
      if (data.prizeBase < 10) {
        issues.push(`Trainer class ${cls}: prizeBase (${data.prizeBase}) is too low`);
      }
    });

    // Check rates are valid (0-256)
    Object.entries(ENCOUNTER_RATES).forEach(([type, rate]) => {
      if (rate < 0 || rate > 256) {
        issues.push(`Encounter rate ${type}: ${rate} is out of range 0-256`);
      }
    });

    if (issues.length > 0) {
      console.error('Encounter config validation failed:');
      issues.forEach(issue => console.error(`  - ${issue}`));
      return false;
    }

    return true;
  }

  // Initialize validation
  if (typeof window !== 'undefined' && window.CD && CD.encounterConfig) {
    const valid = validateConfig();
    if (valid) {
      console.log('Encounter configuration validated successfully');
    }
  }
})(window.CD);
