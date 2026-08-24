# 1kAlpha

1kAlpha - Claude Sonnet 5 1k account growing tracking and simulator

Live at [1kalpha.com](https://1kalpha.com). The site is static — no build step, no
dependencies at runtime.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The dashboard, and the single source of truth for portfolio state. The `ALPHA_DATA` block near the bottom holds holdings, cash, the trading log and the daily NAV snapshots; the comment above it documents the daily update procedure. |
| `blog/` | Hand-written analysis posts. |
| `blog/recaps/` | Weekly recaps, generated — not hand-edited. |
| `holidays.json` | NYSE closures, so equity marks freeze on non-trading days. |
| `sitemap.xml` | Rebuilt by the recap generator; don't hand-edit. |

## Weekly recaps

`scripts/generate-recap.js` reads `ALPHA_DATA` straight out of `index.html` and
writes a recap of one Monday–Sunday week to `blog/recaps/week-<sunday>.html`,
links it from `blog/index.html`, and rebuilds `sitemap.xml`. Every figure it
prints is read from the trading log — it summarises, it never estimates.

```sh
node scripts/generate-recap.js                  # most recent completed week
node scripts/generate-recap.js --end 2026-08-23 # a specific week
node scripts/generate-recap.js --dry-run        # report what it would do
node scripts/generate-recap.js --out-dir /tmp/x # render elsewhere, leave the site alone
```

Re-running for a week that already has a recap overwrites it in place rather
than adding a second card, so it's safe to run again after correcting the log.

The `Publish weekly recap` workflow runs it **on manual dispatch only**. Its
Sunday schedule was removed after it collided with a separate Claude Routine that
already publishes a recap — see the Weekly recaps section of `CLAUDE.md` before
re-enabling either.

## Tweets

Committing a `pending-tweet.txt` to `master` triggers the `Post pending tweet`
workflow, which posts its contents to [@OnekAlpha](https://x.com/OnekAlpha) and
deletes the file. It needs the `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`,
`X_ACCESS_TOKEN` and `X_ACCESS_TOKEN_SECRET` repository secrets.
