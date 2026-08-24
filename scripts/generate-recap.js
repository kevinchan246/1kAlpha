#!/usr/bin/env node
'use strict';

/*
 * Generates a Weekly Recap post from the trading log in index.html and links
 * it from blog/index.html. Everything it prints is derived from ALPHA_DATA —
 * it summarises the log, it never invents a number.
 *
 * Usage:
 *   node scripts/generate-recap.js                  # most recent completed week (Mon-Sun)
 *   node scripts/generate-recap.js --end 2026-08-23 # a specific week-ending Sunday
 *   node scripts/generate-recap.js --dry-run        # print the target paths, write nothing
 *   node scripts/generate-recap.js --out-dir /tmp/x # write the post elsewhere (testing)
 *   node scripts/generate-recap.js --narrative path.md  # override the narrative file
 *
 * The narrative — the part a session writes, saying what actually mattered — is
 * read from content/recaps/week-<sunday>.md when it exists. The generator owns
 * every figure and the layout; the narrative file owns the words. Neither can
 * do the other's job, which is the point: a session cannot mistype a number
 * into the page, and the generator cannot invent a story.
 */

const fs = require('fs');
const path = require('path');
const { readAlphaData, ROOT } = require('./lib/alpha-data');
const { SITE, esc, paragraphs, renderNarrative, page } = require('./lib/render');

/* When run from GitHub Actions, hand the calling workflow the week we
   published so it doesn't have to parse stdout or guess from git status. */
function setActionOutputs(kv) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(kv).map(([k, v]) => `${k}=${v}\n`).join('');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, lines);
}

/* ---------- dates (all plain YYYY-MM-DD, handled in UTC) ---------- */

const DAY_MS = 86400000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const toDate = (s) => new Date(`${s}T00:00:00Z`);
const toStr = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);

function todayInNewYork() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/* The most recent Sunday on or before `from` — recaps cover Monday..Sunday. */
function weekEndingOnOrBefore(from) {
  const d = toDate(from);
  return toStr(addDays(d, -d.getUTCDay()));
}

function longDate(s) {
  const d = toDate(s);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function dateRangeLabel(startStr, endStr) {
  const a = toDate(startStr), b = toDate(endStr);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  if (sameMonth) {
    return `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}–${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()} – ${MONTHS[b.getUTCMonth()]} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }
  return `${longDate(startStr)} – ${longDate(endStr)}`;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const shortDay = (s) => `${WEEKDAY[toDate(s).getUTCDay()]} ${toDate(s).getUTCDate()}`;

/* ---------- formatting ---------- */

const usd = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedUsd = (n) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedPct = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;
const dirClass = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '');

function qty(n, decimals) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ---------- the week's numbers ---------- */

function buildWeek(data, endStr) {
  const startStr = toStr(addDays(toDate(endStr), -6));
  const inWeek = (d) => d >= startStr && d <= endStr;

  const allSnaps = data.snapshots.map((s, i) => ({ ...s, dayNum: i + 1 }));
  const snapshots = allSnaps.filter((s) => inWeek(s.date));
  const priorSnaps = allSnaps.filter((s) => s.date < startStr);
  const carryIn = priorSnaps.length ? priorSnaps[priorSnaps.length - 1] : null;

  const trades = data.trades.filter((t) => inWeek(t.date));
  const executed = trades.filter((t) => t.action === 'buy' || t.action === 'sell');
  const holds = trades.filter((t) => t.action === 'hold');

  const navOpen = carryIn ? carryIn.totalValue : data.meta.initialCapital;
  const navClose = snapshots.length ? snapshots[snapshots.length - 1].totalValue : navOpen;
  const weekPnl = navClose - navOpen;
  const weekPct = navOpen !== 0 ? (weekPnl / navOpen) * 100 : 0;

  const totalPnl = navClose - data.meta.initialCapital;
  const totalPct = (totalPnl / data.meta.initialCapital) * 100;

  const navValues = snapshots.map((s) => s.totalValue);
  const high = navValues.length ? Math.max(...navValues) : navClose;
  const low = navValues.length ? Math.min(...navValues) : navClose;

  const holdingsValue = data.holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const bookValue = holdingsValue + data.cash;

  return {
    startStr, endStr, carryIn, snapshots, trades, executed, holds,
    navOpen, navClose, weekPnl, weekPct, totalPnl, totalPct, high, low,
    holdingsValue, bookValue,
  };
}

/* ---------- NAV chart (inline SVG, no runtime dependencies) ---------- */

function navChart(week, baseline) {
  const pts = [];
  if (week.carryIn) pts.push({ date: week.carryIn.date, v: week.carryIn.totalValue, carry: true });
  for (const s of week.snapshots) pts.push({ date: s.date, v: s.totalValue, carry: false });
  if (pts.length < 2) return '';

  const W = 720, H = 210;
  const padL = 62, padR = 20, padT = 18, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const xs = pts.map((p) => toDate(p.date).getTime());
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const values = pts.map((p) => p.v);
  let lo = Math.min(...values, baseline), hi = Math.max(...values, baseline);
  const span = hi - lo || 1;
  lo -= span * 0.12; hi += span * 0.12;

  const X = (t) => padL + (x1 === x0 ? innerW / 2 : ((t - x0) / (x1 - x0)) * innerW);
  const Y = (v) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(xs[i]).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(xs[xs.length - 1]).toFixed(1)},${(padT + innerH).toFixed(1)} L${X(xs[0]).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const dots = pts.map((p, i) => {
    const cx = X(xs[i]).toFixed(1), cy = Y(p.v).toFixed(1);
    const fill = p.carry ? '#4e6567' : '#ffb400';
    return `<circle cx="${cx}" cy="${cy}" r="${p.carry ? 2.5 : 3}" fill="${fill}"/>`;
  }).join('');

  const xLabels = pts.map((p, i) => {
    const label = p.carry ? `${shortDay(p.date)} · carry-in` : shortDay(p.date);
    return `<text x="${X(xs[i]).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="9" fill="#4e6567">${esc(label)}</text>`;
  }).join('');

  // Label the week's actual high and low plus the starting-capital baseline,
  // dropping any label that would collide with one already placed.
  const marks = [
    { v: Math.max(...values), base: false },
    { v: Math.min(...values), base: false },
    { v: baseline, base: true },
  ];
  const placed = [];
  const grid = marks.map((mk) => {
    const y = Y(mk.v);
    const line = `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${mk.base ? '#8a640e' : '#1a2528'}" stroke-width="1"${mk.base ? ' stroke-dasharray="4 4"' : ''}/>`;
    if (placed.some((py) => Math.abs(py - y) < 11)) return line;
    placed.push(y);
    return line + `<text x="${padL - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="${mk.base ? '#8a640e' : '#4e6567'}">${esc(usd(mk.v))}</text>`;
  }).join('');

  return `    <div class="navchart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Portfolio NAV through the week, ${usd(week.navOpen)} to ${usd(week.navClose)}" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Mono, monospace">
        <defs><linearGradient id="navfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffb400" stop-opacity="0.20"/>
          <stop offset="100%" stop-color="#ffb400" stop-opacity="0"/>
        </linearGradient></defs>
        ${grid}
        <path d="${area}" fill="url(#navfill)"/>
        <path d="${line}" fill="none" stroke="#ffb400" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${xLabels}
      </svg>
    </div>
    <figcaption>Portfolio NAV at each daily close check. The dashed line is the ${usd(baseline)} starting capital.</figcaption>`;
}

/* ---------- article body ---------- */

function buildArticle(data, week, narrative) {
  const range = dateRangeLabel(week.startStr, week.endStr);
  const title = `Weekly Recap: ${range}`;
  const baseline = data.meta.initialCapital;
  const dirWord = week.weekPnl > 0 ? 'up' : week.weekPnl < 0 ? 'down' : 'flat';

  /* --- opener --- */
  const openFrom = week.carryIn
    ? `${usd(week.navOpen)} at the previous close check (${week.carryIn.date})`
    : `${usd(week.navOpen)} of starting capital`;
  const tradeSentence = week.executed.length === 0
    ? `No positions were bought or sold: all ${week.trades.length} check-in${week.trades.length === 1 ? '' : 's'} ended in a hold.`
    : `${week.executed.length} order${week.executed.length === 1 ? '' : 's'} ${week.executed.length === 1 ? 'was' : 'were'} filled across ${week.trades.length} check-in${week.trades.length === 1 ? '' : 's'}; the other ${week.trades.length - week.executed.length} ended in a hold.`;

  const intro = `<p>Week of <strong>${esc(range)}</strong>. The book closed the week at <strong>${esc(usd(week.navClose))}</strong>, ${dirWord} ${esc(signedUsd(week.weekPnl))} (${esc(signedPct(week.weekPct))}) from ${esc(openFrom)}. ${esc(tradeSentence)} Against the ${esc(usd(baseline))} starting capital the simulation now stands at ${esc(signedUsd(week.totalPnl))} (${esc(signedPct(week.totalPct))}).</p>`;

  /* --- stat cards --- */
  const stats = [
    { k: 'NAV at week close', v: usd(week.navClose), s: `Day ${week.snapshots.length ? week.snapshots[week.snapshots.length - 1].dayNum : '—'} of the simulation`, cls: '' },
    { k: 'Week change', v: `${signedPct(week.weekPct)}`, s: signedUsd(week.weekPnl), cls: dirClass(week.weekPnl) },
    { k: 'Since inception', v: `${signedPct(week.totalPct)}`, s: `${signedUsd(week.totalPnl)} vs ${usd(baseline)}`, cls: dirClass(week.totalPnl) },
    { k: 'Week high / low', v: usd(week.high), s: `low ${usd(week.low)}`, cls: '' },
    { k: 'Check-ins', v: String(week.trades.length), s: `${week.executed.length} order${week.executed.length === 1 ? '' : 's'} filled`, cls: '' },
    { k: 'Cash reserve', v: usd(data.cash), s: `${week.bookValue ? ((data.cash / week.bookValue) * 100).toFixed(1) : '0.0'}% of the book`, cls: '' },
  ];
  const statGrid = `    <div class="stat-grid">
${stats.map((st) => `      <div class="stat"><div class="k">${esc(st.k)}</div><div class="v${st.cls ? ' ' + st.cls : ''}">${esc(st.v)}</div><div class="s">${esc(st.s)}</div></div>`).join('\n')}
    </div>`;

  /* --- NAV path --- */
  const chart = navChart(week, baseline);
  const navRows = week.snapshots.map((s, i) => {
    const prev = i === 0 ? week.navOpen : week.snapshots[i - 1].totalValue;
    const chg = s.totalValue - prev;
    const chgPct = prev !== 0 ? (chg / prev) * 100 : 0;
    return `        <tr><td>${esc(s.date)}</td><td>${esc(String(s.dayNum))}</td><td>${esc(usd(s.totalValue))}</td><td class="${dirClass(chg)}">${esc(signedUsd(chg))}</td><td class="${dirClass(chg)}">${esc(signedPct(chgPct))}</td></tr>`;
  }).join('\n');

  const navSection = week.snapshots.length ? `    <h2>NAV through the week</h2>
${chart}
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Day</th><th>NAV</th><th>Change</th><th>Change %</th></tr></thead>
        <tbody>
${navRows}
        </tbody>
      </table>
    </div>` : `    <h2>NAV through the week</h2>
    <p>No close-check snapshot was recorded inside this window, so there is no NAV path to show for the week.</p>`;

  /* --- trades --- */
  // Share counts are formatted to the precision the dashboard uses for that
  // asset; a position that has since been closed out has no holdings entry
  // to consult, so print the logged quantity exactly as recorded.
  const tradeQty = (t) => {
    const h = data.holdings.find((x) => x.symbol === t.symbol);
    return h ? qty(t.shares, h.qtyDecimals) : String(t.shares);
  };
  const tradeCards = week.executed.map((t) => {
    const terms = `${tradeQty(t)} ${t.symbol} @ ${usd(t.price)} = ${usd(t.amount)} · cash after ${usd(t.cashAfter)}`;
    return `    <div class="trade-card">
      <div class="head">
        <span class="act ${t.action}">${t.action}</span>
        <span class="sym">${esc(t.symbol)}</span>
        <span class="when">${esc(t.date)} · ${esc(t.time.en)}</span>
      </div>
      <div class="terms">${esc(terms)}</div>
      ${paragraphs(t.reason.en)}
    </div>`;
  }).join('\n');

  const tradeSection = week.executed.length
    ? `    <h2>Orders filled</h2>\n${tradeCards}`
    : `    <h2>Orders filled</h2>\n    <p>None. Every check-in this week concluded that the existing mix was the right one to hold, so no orders were placed. Doing nothing is a decision the log records the same way it records a trade.</p>`;

  /* --- hold check-ins --- */
  const holdList = week.holds.map((h) => {
    const nav = typeof h.navAtCheck === 'number' ? usd(h.navAtCheck) : '—';
    return `      <li><span class="d">${esc(h.date)}</span><span>${esc(h.time.en)}</span><span style="margin-left:auto">NAV ${esc(nav)}</span></li>`;
  }).join('\n');

  const holdSection = week.holds.length ? `    <h2>Hold check-ins</h2>
    <p>${week.holds.length} scheduled review${week.holds.length === 1 ? '' : 's'} ended without a trade. Each one is logged in full, with reasoning, on the <a href="../#trades">trading log</a>.</p>
    <ul class="checkin-list">
${holdList}
    </ul>` : '';

  /* --- book at week end --- */
  const posRows = data.holdings.map((h) => {
    const mv = h.shares * h.currentPrice;
    const cost = h.shares * h.avgCost;
    const pnl = mv - cost;
    const pnlPct = cost !== 0 ? (pnl / cost) * 100 : 0;
    const weight = week.bookValue ? (mv / week.bookValue) * 100 : 0;
    return `        <tr><td>${esc(h.symbol)}</td><td>${esc(qty(h.shares, h.qtyDecimals))}</td><td>${esc(usd(h.avgCost))}</td><td>${esc(usd(h.currentPrice))}</td><td>${esc(usd(mv))}</td><td class="${dirClass(pnl)}">${esc(signedUsd(pnl))} (${esc(signedPct(pnlPct))})</td><td>${weight.toFixed(1)}%</td></tr>`;
  }).join('\n');
  const cashWeight = week.bookValue ? (data.cash / week.bookValue) * 100 : 0;

  const bookSection = `    <h2>The book at week close</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Asset</th><th>Qty</th><th>Avg cost</th><th>Price</th><th>Market value</th><th>Unrealised P&amp;L</th><th>Weight</th></tr></thead>
        <tbody>
${posRows}
        <tr><td>CASH</td><td>—</td><td>—</td><td>—</td><td>${esc(usd(data.cash))}</td><td>—</td><td>${cashWeight.toFixed(1)}%</td></tr>
        <tr class="highlight"><td>TOTAL</td><td>—</td><td>—</td><td>—</td><td>${esc(usd(week.bookValue))}</td><td>${esc(signedUsd(week.totalPnl))} (${esc(signedPct(week.totalPct))})</td><td>100.0%</td></tr>
        </tbody>
      </table>
    </div>
    <p>Prices are the last values recorded in the log (${esc(data.meta.lastUpdated)}); equity and ETF marks stay frozen at the last NYSE close over weekends and holidays, while crypto keeps updating.</p>`;

  /* --- watchlist --- */
  const watchSection = (data.watchlist && data.watchlist.length) ? `    <h2>Still on the watchlist</h2>
${data.watchlist.map((w) => `    <p><strong>${esc(w.symbol)}</strong> — ${esc(w.status.en)} · ${esc(w.price.en)}<br>${esc(w.note.en)}</p>`).join('\n')}` : '';

  const genNote = `    <div class="gennote">Every figure on this page is generated straight from the trading log in <code>index.html</code> by <code>scripts/generate-recap.js</code> — read from the same data the live dashboard renders, never estimated or filled in after the fact.${narrative ? ' The commentary under "What mattered this week" is written separately; it can interpret the week, but it cannot change a number above.' : ''}</div>`;

  const narrativeSection = narrative ? `    <h2>What mattered this week</h2>
    ${renderNarrative(narrative)}` : '';

  const body = [intro, narrativeSection, statGrid, navSection, tradeSection, holdSection, bookSection, watchSection, genNote]
    .filter(Boolean).join('\n\n');

  const readMin = Math.max(2, Math.round(body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200));

  const description = `Week of ${range}: 1KAlpha's simulated book closed at ${usd(week.navClose)}, ${signedPct(week.weekPct)} on the week and ${signedPct(week.totalPct)} since inception, across ${week.trades.length} logged check-in${week.trades.length === 1 ? '' : 's'} and ${week.executed.length} order${week.executed.length === 1 ? '' : 's'}.`;

  const summary = `NAV closed the week at ${usd(week.navClose)}, ${signedPct(week.weekPct)} over the week and ${signedPct(week.totalPct)} since inception. ${week.executed.length === 0 ? 'No orders filled' : `${week.executed.length} order${week.executed.length === 1 ? '' : 's'} filled`} across ${week.trades.length} logged check-in${week.trades.length === 1 ? '' : 's'}.`;

  const articleHtml = `  <article>
    <div class="post-meta">
      <span>${esc(week.endStr)}</span>
      <span>·</span>
      <span>${readMin} min read</span>
      <span>·</span>
      <span>weekly recap</span>
    </div>
    <h1>${esc(title)}</h1>

${body}
  </article>

  <footer>
    <p>This recap is part of <b>1KAlpha</b>, a transparent, publicly logged AI trading simulation using virtual funds only. Nothing here is investment advice, and nothing here is a forecast — it is a record of what a simulated $1,000 book did over one week. Past performance, simulated or real, does not indicate future results.</p>
    <p><a href="../../">← Back to 1KAlpha.com</a> &nbsp;·&nbsp; <a href="../">More posts</a></p>
  </footer>`;

  return { title, description, summary, articleHtml };
}

/* ---------- blog index wiring ---------- */

function updateBlogIndex(indexPath, { slug, title, summary, dateStr }) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const href = `recaps/${slug}`;

  const sectionRe = /(<section class="blog-section" id="recaps">)([\s\S]*?)(<\/section>)/;
  const m = html.match(sectionRe);
  if (!m) throw new Error(`Could not find the #recaps section in ${indexPath}`);

  let inner = m[2];

  // The placeholder only makes sense while the section is empty.
  inner = inner.replace(/\n\s*<p class="empty-note">[\s\S]*?<\/p>/, '');

  const card = `
    <a class="post-card" href="${href}">
      <span class="tag">Weekly Recap</span>
      <div class="date">${esc(dateStr)}</div>
      <h2>${esc(title)}</h2>
      <p>${esc(summary)}</p>
    </a>
`;

  // Replacements go through functions throughout: the card text contains
  // dollar figures, and `$1`/`$&` in a replacement string are substitution
  // patterns, not literals.
  const hrefRe = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingRe = new RegExp(`\\n\\s*<a class="post-card" href="${hrefRe}">[\\s\\S]*?<\\/a>\\n`);
  if (existingRe.test(inner)) {
    inner = inner.replace(existingRe, () => card); // regenerating the same week: replace in place
  } else {
    // Newest recap first, right after the section note.
    const noteRe = /<p class="section-note">[\s\S]*?<\/p>\n/;
    if (!noteRe.test(inner)) throw new Error('Could not find the recaps section note to insert after');
    inner = inner.replace(noteRe, (note) => `${note}${card}`);
  }

  const updated = html.replace(sectionRe, () => `${m[1]}${inner}${m[3]}`);
  return { html: updated, changed: updated !== html };
}

/* ---------- sitemap ---------- */

function buildSitemap(root) {
  const urls = [
    { loc: `${SITE}/`, changefreq: 'daily' },
    { loc: `${SITE}/blog/`, changefreq: 'weekly' },
  ];

  const posts = fs.readdirSync(path.join(root, 'blog'))
    .filter((f) => f.endsWith('.html') && f !== 'index.html').sort();
  for (const f of posts) urls.push({ loc: `${SITE}/blog/${f}`, changefreq: 'monthly' });

  const recapDir = path.join(root, 'blog', 'recaps');
  if (fs.existsSync(recapDir)) {
    const recaps = fs.readdirSync(recapDir).filter((f) => f.endsWith('.html')).sort().reverse();
    for (const f of recaps) {
      const lastmod = (f.match(/(\d{4}-\d{2}-\d{2})/) || [])[1];
      urls.push({ loc: `${SITE}/blog/recaps/${f}`, changefreq: 'monthly', lastmod });
    }
  }

  const body = urls.map((u) => [
    '  <url>',
    `    <loc>${u.loc}</loc>`,
    u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
    `    <changefreq>${u.changefreq}</changefreq>`,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/* ---------- main ---------- */

function parseArgs(argv) {
  const args = { dryRun: false, end: null, outDir: null, narrative: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--end') args.end = argv[++i];
    else if (argv[i] === '--out-dir') args.outDir = argv[++i];
    else if (argv[i] === '--narrative') args.narrative = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (args.end && !/^\d{4}-\d{2}-\d{2}$/.test(args.end)) {
    throw new Error(`--end must be YYYY-MM-DD, got "${args.end}"`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = readAlphaData();

  const endStr = args.end ? weekEndingOnOrBefore(args.end) : weekEndingOnOrBefore(todayInNewYork());
  const week = buildWeek(data, endStr);

  if (!week.trades.length && !week.snapshots.length) {
    console.log(`No logged activity for the week ending ${endStr} — nothing to publish.`);
    setActionOutputs({ published: 'false', week_end: endStr });
    return;
  }

  const narrativePath = args.narrative
    ? path.resolve(args.narrative)
    : path.join(ROOT, 'content', 'recaps', `week-${endStr}.md`);
  const narrative = fs.existsSync(narrativePath)
    ? fs.readFileSync(narrativePath, 'utf8').trim()
    : null;

  const { title, description, summary, articleHtml } = buildArticle(data, week, narrative);
  const slug = `week-${endStr}.html`;
  const canonical = `${SITE}/blog/recaps/${slug}`;

  const html = page({ title, description, canonical, depth: 2, bodyHtml: articleHtml });

  const outDir = args.outDir ? path.resolve(args.outDir) : path.join(ROOT, 'blog', 'recaps');
  const outFile = path.join(outDir, slug);

  console.log(`Week ${week.startStr} → ${endStr}`);
  console.log(`  NAV ${usd(week.navOpen)} → ${usd(week.navClose)} (${signedPct(week.weekPct)})`);
  console.log(`  ${week.trades.length} check-ins, ${week.executed.length} order${week.executed.length === 1 ? "" : "s"} filled`);
  console.log(`  narrative: ${narrative ? path.relative(ROOT, narrativePath) : `none (looked for ${path.relative(ROOT, narrativePath)})`}`);
  console.log(`  post: ${path.relative(ROOT, outFile)}`);

  if (args.dryRun) {
    console.log('  (dry run — nothing written)');
    setActionOutputs({ published: 'false', week_end: endStr });
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, html);

  if (args.outDir) {
    console.log('  (--out-dir set — blog index and sitemap left untouched)');
    setActionOutputs({ published: 'false', week_end: endStr });
    return;
  }

  const blogIndex = path.join(ROOT, 'blog', 'index.html');
  const { html: newIndex, changed } = updateBlogIndex(blogIndex, { slug, title, summary, dateStr: endStr });
  fs.writeFileSync(blogIndex, newIndex);
  console.log(`  blog/index.html: ${changed ? 'updated' : 'already current'}`);

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, buildSitemap(ROOT));
  console.log('  sitemap.xml: rebuilt');

  setActionOutputs({ published: 'true', week_end: endStr });
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`generate-recap: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { buildWeek, buildArticle, updateBlogIndex, buildSitemap, weekEndingOnOrBefore };
