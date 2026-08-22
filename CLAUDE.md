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

## Say what would prove the position wrong

A review's reasoning should end by naming **what evidence would change the
decision** — the level, the event, or the datapoint that, if it arrives, means
the current stance was wrong.

This is not the same thing as position sizing, and the log has a standing habit
of substituting one for the other. "BTC is already at its 20% target, so no
chasing" answers *how much to hold*. It does not answer *when the thesis breaks*.
A position can sit obediently at its target weight the whole way down, every
sizing rule satisfied, and still give the entire move back — the rules capped the
damage, they never said when to stop taking it.

Written before the fact, an invalidation condition is worth far more than an
explanation produced afterwards. Anyone can narrate why a position was held once
the outcome is known; the log's credibility comes from the parts that were
committed while the answer was still unknown, and this is the cheapest such part
to add.

What it looks like in practice:

- A level the thesis rests on — if the reasoning for holding BTC is that it
  reclaimed the 200-day moving average and the short-term-holder cost basis, then
  losing and closing below them is the clean falsifier, and it should be written
  down *while* that is the reason.
- A scheduled event that will settle the question — an earnings print is a natural
  one. Record what kind of result would change the view **before** it lands.
- An honest "nothing clean here." When a position has no crisp invalidation level
  — thin catalysts, a chop-driven tape — say that rather than manufacture a
  number. A fabricated level is worse than none: it reads as rigour and provides
  none, and later reviews will treat it as a real prior.

This is a writing convention, not a schema change: it lives inside the existing
`reason` text, in all four languages, with no new fields.

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

## Credentials

Nothing secret belongs in this repo — it is public, and a value pushed here is
harvested within seconds. Removing it afterwards does not help; the only fix is
to revoke and reissue.

Where the X credentials live:

- **GitHub Actions secrets** on this repo: `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`,
  `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`. These survive a change of repository
  visibility. The `Post pending tweet` workflow is the only thing that reads them.
- **A second copy on the owner's machine**, for the local `reply-tweet.js`. Keep it
  in a user-scoped environment variable or a file outside the repo — never beside
  the code. Both copies must be updated together on rotation.

If a credential is exposed, or on the annual rotation:

1. Regenerate the keys in the X developer portal — this invalidates the old ones,
   which is the part that actually closes the hole.
2. Update all four GitHub Actions secrets.
3. Update the local copy.
4. Post something through the workflow to confirm the new keys work: only an HTTP
   201 makes it delete `pending-tweet.txt`, so a surviving file means it failed.

Open item: the four secrets are repository-level, so *every* workflow in this repo
can read them. Moving them into a GitHub Environment (and declaring
`environment:` on the posting job only) would scope them to the one job that
needs them. Worth doing as the number of workflows grows.

## Housekeeping

- Don't commit working files. A draft tweet was once committed and then deleted
  (`b006973` → `b9f0a79`), and it is still readable in history — deleting a file
  from a public repo does not unpublish it.
- Secrets belong in Actions secrets, never in the tree.
- `sitemap.xml` is rebuilt by the recap generator; don't hand-edit it.
