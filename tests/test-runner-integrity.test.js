// Guards the harness that `npm test` runs the repo's suites with.
//
// The runner used to shell out to Node once per suite. CodeQL read the variable
// command line as a high-severity command injection, and the shape it flagged
// was a real foot-gun as well: a suite file whose name started with a Node flag
// would have been read as that flag. The suites now run as workers, so nothing
// in the runner builds a command line, and the checks below keep it that way.
//
// Run with: node tests/test-runner-integrity.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RUNNER = path.join(__dirname, '..', 'tools', 'run-tests.js');
const source = fs.readFileSync(RUNNER, 'utf8');

// The runner must never assemble a command line, and it must stay importable
// without running anything. Both are checked before the runner is required
// below, so a regression fails here instead of launching the suites again.
function testNoCommandLines() {
    for (const forbidden of ['child_process', 'spawnSync', 'spawn(', 'execSync', 'execFile', 'exec(']) {
        assert.ok(!source.includes(forbidden), 'the runner must not shell out (' + forbidden + ')');
    }
    assert.ok(source.includes('require.main === module'),
        'the runner runs the suites only when it is the entry point, so this test can require it');
}

testNoCommandLines();

const { discover, NOT_HEADLESS, SUITE_DIRS, run } = require(RUNNER);

// Every suite the runner finds is a plain file in a suite directory. Nothing
// outside those directories is ever run, and no name can point elsewhere.
function testDiscovery() {
    const suites = discover();
    assert.ok(suites.length >= 20, 'the runner finds the suites in ' + SUITE_DIRS.join(' and '));
    assert.ok(suites.includes('copper/tests/smoke.test.js'), 'the smoke suite is wired into npm test');
    for (const suite of suites) {
        const dir = suite.slice(0, suite.lastIndexOf('/'));
        assert.ok(SUITE_DIRS.includes(dir), suite + ' comes from a suite directory');
        assert.ok(!suite.includes('..'), suite + ' is a plain name, not a path out of the tree');
        assert.ok(fs.statSync(path.join(__dirname, '..', suite)).isFile(), suite + ' is a file on disk');
    }
    assert.deepEqual(suites, suites.slice().sort(), 'suites run in a stable order, so a failure reads the same twice');
}

// A suite is only left out of the headless run with a stated reason, so the
// gap stays visible instead of quietly costing coverage.
function testSkippedSuitesAreExplained() {
    const skipped = discover().filter(suite => NOT_HEADLESS[suite]);
    assert.ok(skipped.length < discover().length, 'some suites still cannot run headlessly, and say so');
    for (const suite of skipped) {
        assert.ok(typeof NOT_HEADLESS[suite] === 'string' && NOT_HEADLESS[suite].length > 20,
            suite + ' is skipped with a reason worth reading');
    }
}

// Running a suite still works, and a passing suite passes.
async function testRunningASuite() {
    const outcome = await run('copper/tests/smoke.test.js');
    assert.equal(outcome.ok, true, 'a passing suite passes: ' + outcome.output);
    assert.match(outcome.output, /smoke\.test/, 'its output is captured, so a failure can show it');
}

(async () => {
    testDiscovery();
    testSkippedSuitesAreExplained();
    await testRunningASuite();
    console.log('Test runner integrity tests passed');
})().catch(err => {
    console.error(err.stack || err);
    process.exitCode = 1;
});