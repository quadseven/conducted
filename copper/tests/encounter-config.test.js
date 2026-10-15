// Test encounter config structure and scaling logic
const assert = require('assert');
const H = require('./harness.js');

function testEncounterConfigStructure() {
  const h = H.load({ seed: 100 });
  const CD = h.CD;
  const config = CD.encounterConfig;

  // Test 1: Badge tiers exist and have valid level ranges
  console.log('Testing badge tier configuration...');
  const tiers = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5', 'TIER_6', 'TIER_7', 'TIER_8', 'TIER_9', 'TIER_10'];
  tiers.forEach(tierName => {
    const tier = config.BADGE_TIERS[tierName];
    assert(tier, `Badge tier ${tierName} should exist`);
    assert(tier.minLevel < tier.maxLevel, `${tierName}: minLevel (${tier.minLevel}) should be < maxLevel (${tier.maxLevel})`);
  });

  // Test 2: Encounter tables exist and have valid species
  console.log('Testing encounter table structure...');
  const tables = [
    'ROUTE_1_GRASS',
    'COAL_HARBOR_YARD',
    'MID_GAME_GRASS',
    'MOUNTAIN_TRAILS',
    'CAVE_DUNGEONS',
    'LATE_GAME',
    'ELITE_FOUR',
  ];
  tables.forEach(tableName => {
    const table = config.ENCOUNTER_TABLES[tableName];
    assert(table, `Encounter table ${tableName} should exist`);
    assert(Array.isArray(table), `${tableName} should be an array`);
    table.forEach((slot, i) => {
      assert(slot.species >= 0, `${tableName}[${i}]: species ID should be >= 0`);
      assert(slot.minLevel <= slot.maxLevel, `${tableName}[${i}]: minLevel (${slot.minLevel}) should be <= maxLevel (${slot.maxLevel})`);
      assert(slot.weight > 0, `${tableName}[${i}]: weight (${slot.weight}) should be > 0`);
    });
  });

  // Test 3: Trainer classes exist with valid properties
  console.log('Testing trainer class configuration...');
  const classes = ['YOUNGSTER', 'LASS', 'RAIL_FAN', 'DECKHAND', 'DOCKHAND', 'STATIONMASTER', 'COORDINATOR', 'SCIENTIST', 'LEADER'];
  classes.forEach(className => {
    const cls = config.TRAINER_CLASSES[className];
    assert(cls, `Trainer class ${className} should exist`);
    assert(cls.theme, `${className}: should have theme`);
    assert(cls.prizeBase >= 10, `${className}: prizeBase (${cls.prizeBase}) should be >= 10`);
    assert(cls.partySize > 0, `${className}: partySize (${cls.partySize}) should be > 0`);
  });

  // Test 4: Encounter rates are valid (0-256)
  console.log('Testing encounter rate configuration...');
  const rates = ['grass', 'road', 'cave', 'darkCave', 'water', 'yard', 'building'];
  rates.forEach(rateType => {
    const rate = config.ENCOUNTER_RATES[rateType];
    assert(rate >= 0 && rate <= 256, `Encounter rate ${rateType}: ${rate} should be 0-256`);
  });

  // Test 5: Prize scaling math
  console.log('Testing prize scaling calculation...');
  const scaled1 = config.calculatePrize(16, 0, config.PRIZE_SCALING);
  assert.strictEqual(scaled1, 16, 'Prize should be base when badge count is 0');
  const scaled2 = config.calculatePrize(16, 1, config.PRIZE_SCALING);
  assert(scaled2 > 16, 'Prize should increase with badges');
  const scaledMax = config.calculatePrize(500, 10, config.PRIZE_SCALING);
  assert.strictEqual(scaledMax, 500, 'Prize should cap at maxPrize');

  // Test 6: Level scaling
  console.log('Testing level scaling...');
  const testTable = [
    { species: 10, minLevel: 2, maxLevel: 4, weight: 32 },
    { species: 58, minLevel: 3, maxLevel: 5, weight: 28 },
  ];
  const scaledTable = config.scaleSpeciesByTier([{ slots: testTable }], 2, config.BADGE_TIERS.TIER_2);
  assert(scaledTable.length === 1, 'Should return array of same length');
  const slot0 = scaledTable[0].slots[0];
  assert.strictEqual(slot0[1], 5, 'Min level should be scaled (2 + 3*1 = 5)');
  assert.strictEqual(slot0[2], 7, 'Max level should be scaled (4 + 3*1 = 7)');

  // Test 7: Party scaling
  console.log('Testing party scaling...');
  const party = [[10, 4], [58, 4]];
  const scaledParty = config.buildScaledParty(party, 2, 10);
  assert.strictEqual(scaledParty[0][1], 8, 'Party levels should scale (4 + 2*2 = 8)');
  assert.strictEqual(scaledParty[1][1], 8, 'All party members should scale equally');

  // Test 8: Map encounters configuration exists
  console.log('Testing map encounter assignments...');
  const maps = ['Route1', 'CoalHarbor', 'Route5', 'Route10', 'MysteryCave', 'VictoryRoad'];
  maps.forEach(mapName => {
    const mapEncounters = config.MAP_ENCOUNTERS[mapName];
    assert(mapEncounters, `Map ${mapName} should have encounter config`);
    Object.entries(mapEncounters).forEach(([env, config]) => {
      assert(config.table, `${mapName}.${env} should have table reference`);
      assert(config.rate, `${mapName}.${env} should have encounter rate`);
    });
  });

  console.log('All encounter config tests passed!');
  return true;
}

// Run the test
try {
  testEncounterConfigStructure();
  console.log('encounter-config.test: ok');
} catch (e) {
  console.error('encounter-config.test: FAIL', e.message);
  process.exit(1);
}
