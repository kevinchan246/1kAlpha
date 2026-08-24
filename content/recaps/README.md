# Recap narratives

One markdown file per week, named `week-<sunday>.md` — the same Sunday that names
the recap it belongs to, e.g. `week-2026-08-30.md`.

This is the half of a weekly recap that a session writes: what actually mattered,
what the numbers do not say on their own, and what would change the view. The
other half — every figure, table and chart on the page — is computed by
`scripts/generate-recap.js` from `ALPHA_DATA`.

Keeping them apart is the point. A session writing here cannot mistype a number
into the page, and the generator cannot invent a story. If this file is missing
the recap still publishes, just without commentary.

## Writing one

Plain markdown, and only a small subset is rendered: paragraphs, `## `
subheadings, bullet lists, `**bold**`, `*italic*`, and `[links](https://...)`.
Everything is escaped before formatting is applied, so prose cannot introduce
markup — which also means raw HTML in here will show up as literal text.

Two things worth doing every week:

- **Say what the numbers do not.** "NAV rose 2.9%" is already on the page. Why it
  rose, and whether the reason is repeatable, is not.
- **Name what would change the view** — the level, the event, the datapoint. Same
  convention the trading log follows; see the CLAUDE.md section on it. An honest
  "nothing clean here this week" beats a manufactured level.

Do not restate the tables. The reader can see them.
