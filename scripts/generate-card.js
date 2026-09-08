#!/usr/bin/env node
'use strict';

/*
 * Builds the social card — the image X shows when a post links to the site.
 *
 * Until now index.html declared twitter:card=summary with the app icon, so
 * every log post rendered as a small logo. This draws the actual state of the
 * experiment instead: the NAV line since inception, the trades marked on it,
 * and the review-to-trade ratio, which is the thing the account is actually
 * about and the thing no post had ever shown.
 *
 * Everything is read from ALPHA_DATA. Writing the SVG needs nothing; producing
 * the PNG needs `sharp`, which the publishing workflow installs. Without it the
 * SVG is still written and the script exits cleanly, so a local run is useful
 * without pulling a dependency into a repo that has none.
 *
 * Usage:
 *   node scripts/generate-card.js            # og-card.svg (+ .png if sharp is here)
 *   node scripts/generate-card.js --out-dir /tmp/x
 */

const fs = require('fs');
const path = require('path');
const { readAlphaData, ROOT } = require('./lib/alpha-data');
const { esc } = require('./lib/render');

const W = 1600, H = 900;

/* Site tokens. One hue carries the data; text wears text tokens, never the
   series colour. Trade markers are the surface colour with a line-coloured
   ring, so they read as punched into the line rather than as a second series —
   two bright hues on this surface compete instead of layering. */
const C = {
  bg: '#0a0e0f',
  panel: '#10171a',
  border: '#213032',
  text: '#e7edee',
  dim: '#8ba0a2',
  faint: '#4e6567',
  line: '#ffb400',
  lineDim: '#8a640e',
  up: '#34d399',
  down: '#f87171',
};

const usd = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;

function build(data) {
  const snaps = data.snapshots;
  if (snaps.length < 2) throw new Error('need at least two snapshots to draw a line');

  const baseline = data.meta.initialCapital;
  const values = snaps.map((s) => s.totalValue);
  const nav = values[values.length - 1];
  const totalPct = (nav / baseline - 1) * 100;

  const reviews = data.trades.length;
  const orders = data.trades.filter((t) => t.action !== 'hold').length;

  // Trades sit on the snapshot whose date matches, so a marker lands on the line.
  const dateIndex = new Map(snaps.map((s, i) => [s.date, i]));
  const marks = [...new Set(
    data.trades.filter((t) => t.action !== 'hold')
      .map((t) => dateIndex.get(t.date))
      .filter((i) => i !== undefined)
  )];

  /* ---- plot geometry ---- */
  const padL = 96, padR = 96, plotTop = 396, plotBottom = 742;
  const innerW = W - padL - padR, innerH = plotBottom - plotTop;

  let lo = Math.min(...values, baseline), hi = Math.max(...values, baseline);
  const span = hi - lo || 1;
  lo -= span * 0.18; hi += span * 0.18;

  const X = (i) => padL + (i / (values.length - 1)) * innerW;
  const Y = (v) => plotTop + innerH - ((v - lo) / (hi - lo)) * innerH;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(values.length - 1).toFixed(1)},${plotBottom} L${padL},${plotBottom} Z`;
  const baseY = Y(baseline).toFixed(1);

  const markers = marks.map((i) =>
    `<circle cx="${X(i).toFixed(1)}" cy="${Y(values[i]).toFixed(1)}" r="9" fill="${C.bg}" stroke="${C.line}" stroke-width="3"/>`
  ).join('');

  const dir = totalPct >= 0 ? C.up : C.down;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     font-family="IBM Plex Mono, DejaVu Sans Mono, ui-monospace, monospace">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.line}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${C.line}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${C.line}"/>

  <text x="${padL}" y="132" font-size="40" font-weight="700" fill="${C.text}">1K<tspan fill="${C.line}">Alpha</tspan></text>
  <text x="${W - padR}" y="132" font-size="28" fill="${C.faint}" text-anchor="end">1kalpha.com</text>

  <text x="${padL}" y="252" font-size="132" font-weight="700" fill="${C.text}">${esc(usd(nav))}</text>
  <text x="${padL}" y="316" font-size="40" fill="${dir}">${esc(pct(totalPct))}<tspan fill="${C.faint}" font-size="34" dx="14">since inception · day ${data.meta.dayCount}</tspan></text>

  <line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="${C.lineDim}" stroke-width="2" stroke-dasharray="10 10"/>
  <text x="${W - padR}" y="${(+baseY + 40).toFixed(1)}" font-size="26" fill="${C.lineDim}" text-anchor="end">${esc(usd(baseline))} start</text>

  <path d="${area}" fill="url(#fill)"/>
  <path d="${line}" fill="none" stroke="${C.line}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
  ${markers}

  <circle cx="${padL + 9}" cy="778" r="9" fill="${C.bg}" stroke="${C.line}" stroke-width="3"/>
  <text x="${padL + 32}" y="787" font-size="26" fill="${C.faint}">days we traded</text>

  <line x1="${padL}" y1="806" x2="${W - padR}" y2="806" stroke="${C.border}" stroke-width="2"/>
  <text x="${padL}" y="862" font-size="38" fill="${C.text}">${reviews} reviews<tspan fill="${C.faint}" dx="12">·</tspan><tspan dx="12">${orders} trades</tspan></text>
  <text x="${W - padR}" y="862" font-size="30" fill="${C.dim}" text-anchor="end">every decision logged in public</text>
</svg>
`;
}

function altText(data) {
  const nav = data.snapshots[data.snapshots.length - 1].totalValue;
  const p = (nav / data.meta.initialCapital - 1) * 100;
  const orders = data.trades.filter((t) => t.action !== 'hold').length;
  const days = new Set(data.trades.filter((t) => t.action !== 'hold').map((t) => t.date)).size;
  return `1KAlpha net asset value since inception, now ${usd(nav)} (${pct(p)}) on day ${data.meta.dayCount}. `
    + `${data.trades.length} logged reviews and ${orders} trades; the ${days} days a trade happened are ringed on the line.`;
}

function main() {
  const args = process.argv.slice(2);
  let outDir = ROOT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out-dir') outDir = path.resolve(args[++i]);
    else throw new Error(`Unknown argument: ${args[i]}`);
  }

  const data = readAlphaData();
  const svg = build(data);
  fs.mkdirSync(outDir, { recursive: true });

  const svgPath = path.join(outDir, 'og-card.svg');
  fs.writeFileSync(svgPath, svg);
  console.log(`wrote ${path.relative(ROOT, svgPath) || 'og-card.svg'}`);
  console.log(`alt: ${altText(data)}`);

  let sharp;
  try { sharp = require('sharp'); } catch (e) {
    console.log('sharp not installed — SVG only. `npm i sharp` to also write the PNG.');
    return;
  }
  const pngPath = path.join(outDir, 'og-card.png');
  sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(pngPath)
    .then((info) => console.log(`wrote ${path.relative(ROOT, pngPath) || 'og-card.png'} — ${info.width}x${info.height}, ${info.size} bytes`))
    .catch((err) => { console.error(`rasterising failed: ${err.message}`); process.exit(1); });
}

if (require.main === module) {
  try { main(); } catch (err) { console.error(`generate-card: ${err.message}`); process.exit(1); }
}

module.exports = { build, altText };
