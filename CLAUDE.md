# 1kAlpha — project notes for Claude

Project-level facts that are easy to lose between sessions. This file lives in the
repo on purpose: it is read by any session working on this repo, local or cloud,
so nothing here depends on a path on one particular machine.

## What this is

A transparent, publicly logged AI trading simulation of a virtual $1,000 account,
live at [1kalpha.com](https://1kalpha.com). Static site, no build step, no runtime
dependencies beyond two CDN links. Deployed on **Netlify** (not GitHub Pages).
The repo is **public**, and that is deliberate: the append-only commit history is
what lets a reader verify the trading log was never backfilled or edited after the
fact. Treat that history as part of the product.

## Portfolio state

`index.html` holds `ALPHA_DATA` — the single source of truth for holdings, cash,
the trading log, the watchlist and the daily NAV snapshots. There is no data file
and no build step; the state lives in a `<script>` block. **The comment block
directly above it (`index.html:418`) is the authoritative daily update procedure**
— read it before editing, and keep it accurate if the shape changes.

Points worth knowing up front:

- Free-text fields are `{zh, en, es, fr}`. Tickers and company names stay plain
  strings, identical across languages.
- Equity and ETF `currentPrice` only moves on NYSE trading days (see
  `holidays.json`); crypto moves every day.
- A no-action review is logged as a `trades[]` entry with `action:"hold"` — the
  log records a decision to do nothing the same way it records a trade.
- Append to `snapshots[]` **once per calendar day, at the close check only**.

## Check cadence

Two scheduled reviews a day, **11:30 and 15:00 ET**. On weekends and NYSE
holidays they still run, crypto-only, with equity marks frozen at the last close.
The 15:00 ET check settles that day's NAV snapshot.

## Weekly recaps

`scripts/generate-recap.js` reads `ALPHA_DATA` out of `index.html` and writes one
Monday–Sunday recap to `blog/recaps/week-<sunday>.html`, links it from
`blog/index.html`, and rebuilds `sitemap.xml`. Every figure is read from the log;
nothing is estimated. Re-running a week overwrites it in place. See `README.md`
for the flags.

The `Publish weekly recap` workflow runs it Sunday 21:00 ET. **Scheduled workflows
only fire from the default branch** — a change to the schedule does nothing until
it is merged to `master`.

## X / Twitter

- Committing `pending-tweet.txt` to `master` triggers `Post pending tweet`, which
  posts it and deletes the file. Needs the `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`,
  `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` repo secrets.
- That workflow posts **standalone tweets only** — the request body is just
  `{ text }`, with no reply field.
- `reply-tweet.js` is **not in this repo**. It lives in the owner's local tooling
  and works for replying within our own threads.
- Programmatic replies to *other accounts'* tweets returned 403 in testing (the
  attempt to reply to Camillo). The operating decision is that replying to other
  people stays **manual** — the "auto-reply to influencers" growth tactic is off
  the table. (The 403's specific cause was never isolated; it may be an app
  permission tier or the target's reply settings rather than a blanket rule. Not
  worth revisiting unless that tactic becomes important again.)
- A push made with `GITHUB_TOKEN` does not trigger other workflows, so a workflow
  cannot chain into the tweet workflow without a PAT.

## Analytics — pending

**Umami Cloud (free tier)** is the chosen analytics, picked for custom-event
tracking on the subscribe-box funnel. Not yet installed: it is waiting on the
owner to sign up and hand over the tracking snippet / website ID. There is
currently **no analytics of any kind** on the site.

## Housekeeping

- Don't commit working files. A draft tweet was once committed and then deleted
  (`b006973` → `b9f0a79`), and it is still readable in history — deleting a file
  from a public repo does not unpublish it.
- Secrets belong in Actions secrets, never in the tree.
- `sitemap.xml` is rebuilt by the recap generator; don't hand-edit it.
