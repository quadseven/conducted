// Runs every automated suite in this repo with one command: `npm test`.
//
// Dependency-free, like the suites themselves, so a fresh clone can run the
// tests with nothing but the Node already on PATH. Each suite runs in its own
// process because that is how they are written (top-level assertions that
// throw), and the run exits non-zero if any suite fails, so a broken overworld
// or battle loop fails the command the way a broken test is supposed to.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Directories whose *.test.js files are suites. Everything in them runs headless.
const SUITE_DIRS = ['copper/tests', 'tests'];

// Suites that cannot join the headless run, each with the reason it is out, so
// that excluding them stays visible instead of quietly dropping coverage.
const NOT_HEADLESS = {
  'tests/menu-navigation.test.js': 'drives a real browser through Playwright, which this repo does not depend on',
  'tests/rival.test.js': 'instantiates the browser build in js/, which needs window and a DOM',
  'tests/rail-mart.test.js': 'drives the shop path inside Game.updateMenu, which the menu overlays replaced',
};

// Every suite in the repo, as repo-relative paths, in a stable order.
function discover() {
  const found = [];
  for (const dir of SUITE_DIRS) {
    for (const name of fs.readdirSync(path.join(ROOT, dir)).sort()) {
      if (name.endsWith('.test.js')) found.push(dir + '/' + name);
    }
  }
  return found;
}

// Run one suite in its own process, from the repo root (the suites read
// sources through paths relative to it).
function run(suite) {
  const res = spawnSync(process.execPath, [suite], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  if (res.error) return { ok: false, output: String(res.error.stack || res.error) };
  return { ok: res.status === 0, output: (res.stdout || '') + (res.stderr || '') };
}

function report(suite, outcome) {
  if (outcome.ok) {
    console.log('  ok    ' + suite);
    return 0;
  }
  console.log('  FAIL  ' + suite);
  for (const line of outcome.output.trim().split('\n')) console.log('          ' + line);
  return 1;
}

function reportSkipped(suites) {
  if (!suites.length) return;
  console.log('\nNot run here (' + suites.length + ' suites, listed so the gap stays visible):');
  for (const suite of suites) console.log('  ' + suite + '\n      ' + NOT_HEADLESS[suite]);
}

function main() {
  const filter = process.argv[2];
  const all = discover();
  const skipped = all.filter(s => NOT_HEADLESS[s]);
  const suites = all.filter(s => !NOT_HEADLESS[s] && (!filter || s.includes(filter)));
  if (!suites.length) {
    console.error('No suites matched' + (filter ? ' "' + filter + '"' : '') + '.');
    return 1;
  }

  console.log('Running ' + suites.length + ' suite' + (suites.length === 1 ? '' : 's') +
    ' headlessly on ' + process.version + '\n');

  const started = process.hrtime.bigint();
  let failed = 0;
  for (const suite of suites) failed += report(suite, run(suite));
  const seconds = (Number(process.hrtime.bigint() - started) / 1e9).toFixed(1);

  console.log('\n' + (suites.length - failed) + ' passed, ' + failed + ' failed in ' + seconds + 's');
  reportSkipped(skipped);
  return failed ? 1 : 0;
}

process.exitCode = main();