// Guards error-test.html, the debug page that mirrors window errors and console
// output into the DOM, and js/error-capture.js, the module behind it.
//
// It used to build each captured line by pasting the captured text into
// innerHTML. Captured text is runtime input -- an error message, a logged value
// -- so anything in it that looked like markup was reinterpreted as HTML
// instead of shown, which is what code scanning reports as cross-site scripting
// on the page (CWE-79). Captured text now goes in through textContent, and this
// test runs the page's own capture code to prove it.
//
// That capture code is loaded as a module rather than run out of the page's
// markup. Evaluating text this suite read out of an HTML file is the shape of
// code injection (CWE-94), and a guard that did it would carry the very risk it
// exists to check for, so the page and its guard load one file and run the code
// it exports.
//
// Run with: node tests/error-page-escaping.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const MODULE = path.join(ROOT, 'js', 'error-capture.js');
const page = fs.readFileSync(path.join(ROOT, 'error-test.html'), 'utf8');
const moduleSource = fs.readFileSync(MODULE, 'utf8');
const { install } = require(MODULE);

// Text that only survives the trip intact if it is never treated as markup.
const MARKUP = '<img src=x onerror="boom()">';

// The smallest element and document the capture code needs: enough DOM to run
// it for real, with every innerHTML write recorded rather than parsed, so a
// regression shows up as a write instead of as silent markup.
function fakeElement(writes) {
    return {
        style: {},
        children: [],
        set innerHTML(value) { writes.push(String(value)); },
        get innerHTML() { return ''; },
        set textContent(value) { this.own = String(value); },
        get textContent() {
            return this.own === undefined
                ? this.children.map(child => child.textContent).join('')
                : this.own;
        },
        appendChild(child) { this.children.push(child); return child; },
    };
}

// Run the capture code against that DOM, and hand back the panels it wrote to,
// the console it replaced, and the handler it registered for window errors.
function loadPage() {
    const writes = [];
    const panels = { errors: fakeElement(writes), 'console-log': fakeElement(writes) };
    const handlers = [];
    const quiet = () => {};
    const consoleOut = { log: quiet, error: quiet, warn: quiet };
    const doc = {
        getElementById: id => panels[id] || null,
        createElement: () => fakeElement(writes),
    };

    install(doc, consoleOut, handler => { handlers.push(handler); });
    assert.equal(handlers.length, 1, 'the page registers exactly one window error handler');
    return { writes, panels, handlers, console: consoleOut };
}

// Everything the page captures is shown as the text that was captured: no
// markup, on any of the three console levels or the window error handler.
function testCapturedTextIsNeverReinterpretedAsMarkup() {
    const { writes, panels, handlers, console: pageConsole } = loadPage();

    handlers[0]({ message: MARKUP, filename: 'js/game.js', lineno: 42 });
    pageConsole.log('a value worth logging:', MARKUP);
    pageConsole.error('something went wrong:', MARKUP);
    pageConsole.warn('and a warning:', MARKUP);

    assert.deepEqual(writes, [], 'no captured line is built by assigning to innerHTML');
    assert.ok(panels['console-log'].textContent.includes(MARKUP), 'logged text reaches the page verbatim');
    assert.ok(panels.errors.textContent.includes(MARKUP), 'errored text reaches the page verbatim');
}

// The captured line keeps the shape the page always had: one paragraph per
// event, saying what it always said, in the colour it always had, so showing
// captured text as text changes nothing on screen.
function testCapturedLinesKeepTheirShape() {
    const { panels, handlers, console: pageConsole } = loadPage();

    pageConsole.log('a value');
    pageConsole.error('bad things');
    pageConsole.warn('odd things');
    handlers[0]({ message: 'boom', filename: 'js/game.js', lineno: 42 });

    const shown = panel => panel.children.map(p => [p.textContent, p.style.color]);
    assert.deepEqual(
        [...shown(panels['console-log']), ...shown(panels.errors)],
        [
            ['a value', undefined],
            ['CONSOLE ERROR: bad things', 'red'],
            ['WARNING: odd things', 'orange'],
            // The window error handler reports through console.error as well as
            // writing its own line, so the errors panel ends with both.
            ['ERROR: boom at js/game.js:42', 'red'],
            ['CONSOLE ERROR: Caught error: [object Object]', 'red'],
        ],
        'each capture still writes its own paragraph, unchanged in wording and colour'
    );
}

// The rule the two checks above pin down, stated over both files that write to
// the page's panels, so a future edit cannot reintroduce the sink somewhere
// they do not exercise.
function testNeitherThePageNorTheModuleBuildsMarkupFromCapturedText() {
    for (const [name, source] of [['error-test.html', page], ['js/error-capture.js', moduleSource]]) {
        assert.ok(!/\.innerHTML\s*\+?=/.test(source), name + ' never assigns to innerHTML');
    }
    assert.match(moduleSource, /\.textContent\s*=/, 'captured text is written through textContent');
}

// The guard exercises the module, and the page runs it: a page and a test that
// each had their own copy of the capture code could pass while the page broke.
function testThePageRunsTheCodeThisTestDrives() {
    assert.match(page, /js\/error-capture\.js/, 'error-test.html loads the module');
    assert.match(page, /ErrorCapture\.install\(/, 'error-test.html installs it on load');
}

testNeitherThePageNorTheModuleBuildsMarkupFromCapturedText();
testThePageRunsTheCodeThisTestDrives();
testCapturedTextIsNeverReinterpretedAsMarkup();
testCapturedLinesKeepTheirShape();

console.log('Error page escaping tests passed');