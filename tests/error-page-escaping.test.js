// Guards error-test.html, the debug page that mirrors window errors and console
// output into the DOM.
//
// It used to build each captured line by pasting the captured text into
// innerHTML. Captured text is runtime input -- an error message, a logged value
// -- so anything in it that looked like markup was reinterpreted as HTML
// instead of shown, which is what code scanning reports as stored
// cross-site scripting on the page. Captured text now goes in through
// textContent, and this test runs the page's own handler code to prove it.
//
// Run with: node tests/error-page-escaping.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PAGE = path.join(__dirname, '..', 'error-test.html');
const html = fs.readFileSync(PAGE, 'utf8');

// Text that only survives the trip intact if it is never treated as markup.
const MARKUP = '<img src=x onerror="boom()">';

// The inline script that installs the error and console handlers: the only
// block on the page that writes into the DOM.
function captureScript() {
    const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    const block = blocks.find(b => b.includes("addEventListener('error'"));
    assert.ok(block, 'error-test.html still installs an error handler');
    return block;
}

// The smallest element and document the capture script needs: enough DOM to run
// the page's real code, with every innerHTML write recorded rather than parsed,
// so a regression shows up as a write instead of as silent markup.
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

// Run the page's capture script against that DOM, and hand back the panels it
// wrote to plus the console it replaced.
function loadPage() {
    const writes = [];
    const panels = { errors: fakeElement(writes), 'console-log': fakeElement(writes) };
    const listeners = {};
    const quiet = () => {};
    const sandbox = {
        console: { log: quiet, error: quiet, warn: quiet },
        document: {
            getElementById: id => panels[id] || null,
            createElement: () => fakeElement(writes),
        },
    };
    sandbox.window = sandbox;
    sandbox.window.addEventListener = (type, handler) => { listeners[type] = handler; };

    vm.runInNewContext(captureScript(), sandbox, { filename: 'error-test.html' });
    return { writes, panels, listeners, console: sandbox.console };
}

// Everything the page captures is shown as the text that was captured: no
// markup, on any of the three console levels or the window error handler.
function testCapturedTextIsNeverReinterpretedAsMarkup() {
    const { writes, panels, listeners, console: pageConsole } = loadPage();

    listeners.error({ message: MARKUP, filename: 'js/game.js', lineno: 42 });
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
    const { panels, listeners, console: pageConsole } = loadPage();

    pageConsole.log('a value');
    pageConsole.error('bad things');
    pageConsole.warn('odd things');
    listeners.error({ message: 'boom', filename: 'js/game.js', lineno: 42 });

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

// The rule the two checks above pin down, stated directly over the whole page,
// so a future edit cannot reintroduce the sink somewhere they do not exercise.
function testPageNeverBuildsMarkupFromCapturedText() {
    assert.ok(!/\.innerHTML\s*\+?=/.test(html), 'error-test.html never assigns to innerHTML');
    assert.match(html, /\.textContent\s*=/, 'captured text is written through textContent');
}

testPageNeverBuildsMarkupFromCapturedText();
testCapturedTextIsNeverReinterpretedAsMarkup();
testCapturedLinesKeepTheirShape();

console.log('Error page escaping tests passed');