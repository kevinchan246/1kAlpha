'use strict';

/*
 * Reads the ALPHA_DATA object literal out of index.html.
 *
 * index.html is a hand-edited single file with no build step, so the
 * portfolio state lives inside a <script> block rather than a data file.
 * Rather than duplicate that state, we lift the literal out and evaluate
 * it in an isolated context.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const START_MARKER = 'const ALPHA_DATA = {';

function readAlphaData(indexPath) {
  const file = indexPath || path.join(ROOT, 'index.html');
  const html = fs.readFileSync(file, 'utf8');

  const start = html.indexOf(START_MARKER);
  if (start === -1) {
    throw new Error(`Could not find "${START_MARKER}" in ${file}`);
  }
  const objStart = start + START_MARKER.length - 1; // points at the '{'

  // Every line inside the literal is indented, so a '};' at column 0 is
  // unambiguously the end of the object.
  const rest = html.slice(objStart);
  const end = rest.search(/\n\};/);
  if (end === -1) {
    throw new Error(`Could not find the end of the ALPHA_DATA literal in ${file}`);
  }
  const literal = rest.slice(0, end + 2); // include the closing '}'

  const data = vm.runInNewContext(`(${literal})`, Object.create(null), {
    timeout: 5000,
    filename: 'ALPHA_DATA',
  });

  if (!data || !data.meta || !Array.isArray(data.trades) || !Array.isArray(data.snapshots)) {
    throw new Error('ALPHA_DATA parsed but is missing meta/trades/snapshots');
  }
  return data;
}

module.exports = { readAlphaData, ROOT };
