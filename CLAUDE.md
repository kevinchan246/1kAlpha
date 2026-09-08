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

**A position can be large because nobody decided it should be.** The 35%
concentration cap is a ceiling, not a thesis. A holding that drifted up to 33% on
appreciation — or stayed there while falling — was never sized for whatever is
about to happen to it. *"No room to add, no reason to sell"* is the sentence that
hides this: it reads as discipline and contains no decision.

So before a scheduled event that will move a position hard — an earnings print
above all — the review has to do two things, and the last check before the event
is the last chance to do either honestly:

1. Name the result that would change the view.
2. Ask whether the current weight is one you would choose *today* if the position
   were cash. If the answer is no, that weight is a bet nobody made, and saying so
   is more useful than any level.

This is a writing convention, not a schema change: it lives inside the existing
`reason` text, in all four languages, with no new fields.

## Weekly recaps

Settled design, after the two mechanisms collided on 2026-08-23 (see the note at
the end).

**One week convention: Monday to Sunday.** A recap covers the seven days ending
on the Sunday that names it.

**One output location: `blog/recaps/week-<sunday>.html`.**

**Two authors, split so neither can do the other's job:**

- `scripts/generate-recap.js` owns **every figure, table, chart and the layout**.
  It reads `ALPHA_DATA` out of `index.html`; it cannot invent a number, and the
  same input always produces the same page. It also links the post from
  `blog/index.html` and rebuilds `sitemap.xml` — it is the only thing that writes
  either.
- `content/recaps/week-<sunday>.md` owns **the words** — what actually mattered,
  what the numbers do not say, what would change the view. A session writes it.
  It renders into the "What mattered this week" section. Only a small markdown
  subset is supported, and everything is escaped before formatting is applied,
  so prose cannot introduce markup. If the file is absent the recap still
  publishes, just without commentary. See `content/recaps/README.md`.

The publishing flow, which the Routine drives:

1. `node scripts/generate-recap.js --dry-run` — see the week's figures.
2. Write `content/recaps/week-<sunday>.md`.
3. `node scripts/generate-recap.js` — renders the page, links it, rebuilds the
   sitemap.
4. Commit all of it together.

Re-running step 3 after editing the narrative overwrites the page in place and
replaces the existing card rather than adding a second one, so it is safe to run
again.

**Re-running a *past* week is a different thing, and it rewrites numbers.**
`snapshots[]` records only `totalValue`, so there is no per-holding price
history — the book table always shows the marks currently in `ALPHA_DATA`.
Generated on the Sunday it covers, those are that week's close and the heading
says "The book at week close"; run later, they are not, and the heading says
"The book as of <lastUpdated>" instead. The TOTAL row's P&L is derived from the
same book value the rows sum to, so it can never print today's book beside a
stale week's gain. Everything else on the page — NAV, the chart, the trades — is
week-scoped and reproducible. **Regenerating an already-published recap still
changes its holdings table, so don't**, and patch the head by hand if a meta
tag needs to move.

**The `Publish weekly recap` workflow stays on manual dispatch only.** Its
schedule is deliberately off: if it fired on its own it would be a second
publisher writing `blog/index.html`, which is exactly what went wrong before. Use
it to backfill a week by hand (`week_end` input), not as a routine.

Two notes on the history:

- `blog/recap-2026-08-23.html` is the one recap published under the old
  arrangement — flat in `blog/`, on a Sunday-to-Sunday week. **Leave it alone.**
  It is what was published, and the log's whole claim is that published things
  are not quietly rewritten.
- Scheduled workflows only fire from the default branch, and GitHub runs them
  late — the one run that schedule got fired 82 minutes after its cron slot.

**Naming: never "Week N."** `meta.dayCount` counts days since inception, not
weeks — a recap titled or tweeted as "Week 15" when the log is only ~2 calendar
weeks old is a real error (this happened once, in the tweet text only, and had
to be caught after posting). Title recaps and their tweets by the date range
instead, e.g. `Week in Review: Aug 16–23`.

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

## Writing the tweet

Every check queues a `pending-tweet.txt`. Those tweets are getting 2–12 views
each, while one *reply* to a large account got 460. The reply worked because it
had a point and a number someone else could check. The daily posts do not,
because of their shape:

> Close check: HOLD. Oil (WTI $94.54, Brent ~$99) and 10Y yield (4.79%) crept
> closer to our triggers amid Houthi strikes on Saudi oil sites, but neither
> cleared the bar. NAV settled $1,048.92 (-0.05% vs this AM). [link]

The reasoning in the middle is genuinely interesting. It is buried behind an
announcement of our own schedule, and followed by a NAV move of five cents.
**Nobody follows an account for its calendar.** Same content, led differently:

> Houthi strikes on Saudi oil sites put WTI at $94.54. Our trigger to act is
> $100. That gap is the whole decision — 62 reviews in, we've traded 5 times,
> and "close to the line" has never been a reason to cross it.

Rules that follow from that:

- **Open with the finding, never the ritual.** No "Close check:", "Hold.",
  "Day 30 close:", "Sat 15:00 ET check:". The reader does not need to know which
  slot this was; if the post is worth reading it is worth reading without that.
- **Lead with what nearly changed the decision.** A hold is only interesting as
  the story of what almost made us act and why it did not. "Oil at $94.54
  against a $100 trigger" is that story. "No invalidation levels touched" is a
  status code.
- **Name the level.** The specific threshold is the differentiated content —
  it is already in the log, it is checkable, and almost nobody else posts one.
- **NAV only when it is the story.** On a ±$0.50 day it is noise, and printing
  it daily teaches readers the number does not matter. Weekly recaps and days
  the book actually moved are where it belongs.
- **Use the ratio.** As of Day 31: 62 reviews, 5 trades. Restraint is the whole
  thesis and the posts never say it. It is worth a mention whenever a check
  concludes in another hold.
- **Vary the length.** Every post being three sentences is why they blur
  together. When a day genuinely has nothing, one short line is the honest
  version — do not inflate it to fill the usual shape.
- **No hashtags.** X ranks on the full text semantically; hashtags are not a
  ranking feature, and three or more trip spam classifiers. This account is
  already automated, templated and link-bearing, which is spam-adjacent enough
  without them.

Still true regardless of shape: no forecasts, no advice, nothing the log does
not support.

**Images arrive through the link preview, not an upload.** Posts used to render
as a small app icon because `index.html` declared `twitter:card=summary`. It now
declares `summary_large_image` pointing at `og-card.png`, so a post linking to
the site gets a full-width card showing the NAV line since inception, the days a
trade happened ringed on it, and the review-to-trade ratio.

`scripts/generate-card.js` builds it from `ALPHA_DATA` — SVG always, plus the
PNG when `sharp` is present. The `Post pending tweet` workflow installs `sharp`,
regenerates the card after a successful post and commits it alongside removing
`pending-tweet.txt`, so the card tracks the log with no change to any Routine.
Card generation is deliberately non-fatal there: the tweet is already out by
that point, and letting a card failure abort the commit would leave
`pending-tweet.txt` in place and repost the same text on the next check.

Two things to know about this route:

- **X caches card images per URL.** Every log post links to `1kalpha.com/#LOG-nnn`
  and the fragment is invisible to the crawler, so they share one cached card.
  Expect it to lag the live number rather than match it post-for-post. The text
  carries the specifics; the card carries the shape.
- **Attaching a fresh image per post is not currently possible.** That needs
  `POST /2/media/upload`, which requires OAuth 2.0 with the `media.write` scope;
  the v1.1 upload endpoint that OAuth 1.0a could use was deprecated in March
  2025. This repo authenticates with OAuth 1.0a, so per-post images would mean
  migrating the whole credential flow — including refresh-token rotation inside
  a stateless workflow — with developers still reporting 403s afterwards. Not
  worth it for the gain over the link preview.

Every page carries the same card: `index.html`, `blog/index.html`, and the recap
template in `scripts/lib/render.js`. The one exception is
`blog/recap-2026-08-23.html`, left on the old `summary` card for the same reason
its layout was left alone.

**Not a Routine's job:** replying to other accounts. Those replies are the
best-performing thing this account does and they stay manual — see the X /
Twitter section on why.

## Analytics

**Umami Cloud (free tier)**, chosen for custom-event tracking on the
subscribe-box funnel. The tracking script is in the `<head>` of every page,
including the recap template in `scripts/lib/render.js`, so generated pages
carry it too. The website ID is a public identifier — it ships in the page
source to every visitor — so it belongs in the tree like any other markup.

Two custom events instrument the subscribe box, both defined in the funnel
script at the bottom of `index.html`:

- `subscribe-view` — fired once, when the box first scrolls into view.
- `subscribe-submit` — fired when the form is submitted.

The pair is the point: submissions over *views* is a conversion rate,
submissions over pageviews mostly measures whether people scroll.

Both carry a `source` property — `utm_source`/`ref` if the URL has one, else
the referring host, else `direct` — and the same string is posted to Buttondown
as `metadata__signup_source`. That is what lets "which channel produced this
subscriber" be answered later, since no web analytics can see what happens
inside the newsletter.

Two constraints worth remembering:

- `cloud.umami.is` is blocked by most ad blockers, so `window.umami` is absent
  for a real share of visitors. Every call is guarded; **subscribing must keep
  working when tracking does not.** The form is never `preventDefault`ed to wait
  on an analytics call.
- The free tier keeps **6 months** of data. For a project whose whole claim is a
  long, continuous record, that is short — either move to Pro before the first
  six months lapse, or export periodically through the API.

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

## Merging

The owner has standing authorisation for Claude to merge its own pull requests
once they are clean — no need to wait for a review. "Clean" means all four of:

1. A security review of the diff turns up nothing.
2. CI is green on the PR's current head.
3. The PR is mergeable with no conflicts.
4. No review comment is left unaddressed.

**Merging to `master` ships to production.** Netlify deploys the default branch,
so a merge is a release to 1kalpha.com, not just a repository operation. Check
the diff for anything a visitor would see before merging, not after.

Still worth asking about first, standing authorisation notwithstanding: changes
to how credentials are handled, anything that rewrites published history, and
anything touching the meaning of `ALPHA_DATA` — the trading log is the product,
and a mistake there is not a bug, it is a false record.

## Housekeeping

- Don't commit working files. A draft tweet was once committed and then deleted
  (`b006973` → `b9f0a79`), and it is still readable in history — deleting a file
  from a public repo does not unpublish it.
- Secrets belong in Actions secrets, never in the tree.
- `sitemap.xml` is rebuilt by the recap generator; don't hand-edit it.
