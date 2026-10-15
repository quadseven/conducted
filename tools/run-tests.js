// Runs every automated suite in this repo with one command: `npm test`.
//
// Dependency-free, like the suites themselves, so a fresh clone can run the
// tests with nothing but the Node already on PATH. Each suite runs alone in
// its own worker thread because that is how they are written (top-level
// assertions that throw, and a game VM built per suite), and the run exits
// non-zero if any suite fails, so a broken overworld or battle loop fails the
// command the way a broken test is supposed to.
'use strict';
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

const ROOT = path.join(__dirname, '..');

// How long one suite may take before the run gives up on it and moves on.
const TIMEOUT_MS = 120000;

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

// Run one suite on its own worker, collecting whatever it printed so a failure
// can show the assertion that broke. A worker rather than a child process: it
// isolates the suite just as well, it needs no command line assembled to do
// it, and a suite path can never be read as a Node option. Code scanning reads
// the command-line form as a command injection (CWE-78) either way.
function run(suite) {
  return new Promise(resolve => {
    const chunks = [];
    let failure = null;
    let timedOut = false;

    const worker = new Worker(path.join(ROOT, suite), { stdout: true, stderr: true });
    worker.stdout.on('data', chunk => chunks.push(chunk));
    worker.stderr.on('data', chunk => chunks.push(chunk));

    const timer = setTimeout(() => { timedOut = true; worker.terminate(); }, TIMEOUT_MS);
    worker.on('error', err => { failure = String(err.stack || err); });
    worker.on('exit', code => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks).toString('utf8');
      const reason = timedOut ? 'timed out after ' + (TIMEOUT_MS / 1000) + 's' : failure;
      resolve({ ok: code === 0 && !reason, output: reason ? output + reason + '\n' : output });
    });
  });
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

async function main() {
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
  for (const suite of suites) failed += report(suite, await run(suite));
  const seconds = (Number(process.hrtime.bigint() - started) / 1e9).toFixed(1);

  console.log('\n' + (suites.length - failed) + ' passed, ' + failed + ' failed in ' + seconds + 's');
  reportSkipped(skipped);
  return failed ? 1 : 0;
}

module.exports = { discover, NOT_HEADLESS, SUITE_DIRS, run };

// Only the `npm test` entry point runs the suites; a test that requires this
// module gets the functions above and nothing else.
if (require.main === module) main().then(code => { process.exitCode = code; });