/**
 * Error capture for the debug page.
 *
 * error-test.html mirrors window errors and console output into two panels, so
 * a developer can see what went wrong without opening devtools. The captured
 * text is runtime input -- an error message, a logged value -- and it reaches
 * the page as text, through textContent, never by pasting it into innerHTML:
 * markup inside a message would otherwise be run as markup instead of shown.
 *
 * The page loads this file and calls install(); tests/error-page-escaping.test.js
 * requires it and drives it against a stub DOM, so the page and its guard run
 * the same capture code rather than a copy of it.
 */

const ErrorCapture = (function () {
    'use strict';

    // Add one captured line to a panel, in the colour the caller asks for.
    function capture(doc, panel, color, text) {
        const line = doc.createElement('p');
        if (color) line.style.color = color;
        line.textContent = text;
        doc.getElementById(panel).appendChild(line);
    }

    // Mirror one console level into a panel, leaving the console itself alone:
    // the page still logs to the real console, it just also shows the line.
    function mirror(doc, consoleOut, method, panel, color, prefix) {
        const original = consoleOut[method];
        consoleOut[method] = function (...args) {
            original.apply(consoleOut, args);
            capture(doc, panel, color, prefix + args.join(' '));
        };
    }

    // Report window errors and the three console levels into the page's panels.
    // `onError` is how the caller registers the error handler, so this module
    // never reaches for a global window and stays testable.
    function install(doc, consoleOut, onError) {
        onError(event => {
            capture(doc, 'errors', 'red', `ERROR: ${event.message} at ${event.filename}:${event.lineno}`);
            consoleOut.error('Caught error:', event);
        });

        mirror(doc, consoleOut, 'log', 'console-log', null, '');
        mirror(doc, consoleOut, 'error', 'errors', 'red', 'CONSOLE ERROR: ');
        mirror(doc, consoleOut, 'warn', 'errors', 'orange', 'WARNING: ');
    }

    return { install };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorCapture;
}