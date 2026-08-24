'use strict';

/* Shared page chrome for generated blog pages, matching the hand-written
   posts in blog/ so generated and hand-written pages are indistinguishable. */

const SITE = 'https://1kalpha.com';

const X_ICON =
  '<svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

const CSS = `  :root{
    --bg:#0a0e0f; --bg-panel:#10171a; --bg-panel-2:#141d20;
    --border:#213032; --border-soft:#1a2528;
    --text:#e7edee; --text-dim:#8ba0a2; --text-faint:#4e6567;
    --amber:#ffb400; --amber-dim:#8a640e; --teal:#5eead4; --green:#34d399; --red:#f87171;
    --mono:'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;
    --sans:'IBM Plex Sans', -apple-system, sans-serif;
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  html{background:var(--bg);}
  body{
    background:
      radial-gradient(ellipse 1200px 600px at 15% -10%, rgba(255,180,0,0.06), transparent 60%),
      radial-gradient(ellipse 1000px 800px at 100% 0%, rgba(94,234,212,0.05), transparent 55%),
      var(--bg);
    color:var(--text); font-family:var(--sans); line-height:1.6; padding-bottom:60px; min-height:100vh;
  }
  .wrap{max-width:800px; margin:0 auto; padding:0 24px;}
  header.blog-head{
    border-bottom:1px solid var(--border); padding:22px 0 20px; margin-bottom:40px;
    display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;
  }
  .brand-link{font-family:var(--mono); font-weight:700; font-size:17px; color:var(--text); text-decoration:none; letter-spacing:-0.01em;}
  .brand-link span{color:var(--amber);}
  .blog-nav a{font-family:var(--mono); font-size:12px; color:var(--text-dim); text-decoration:none; margin-left:18px; display:inline-flex; align-items:center; gap:5px;}
  .blog-nav .x-icon{width:11px; height:11px; fill:currentColor;}
  .blog-nav a:hover{color:var(--amber);}

  .post-meta{font-family:var(--mono); font-size:12px; color:var(--text-faint); margin-bottom:14px; display:flex; gap:14px; flex-wrap:wrap; letter-spacing:.03em;}
  article h1{font-size:clamp(26px,4.2vw,36px); color:var(--text); margin-bottom:20px; line-height:1.25;}
  article h2{font-size:21px; color:var(--text); margin:40px 0 14px;}
  article h2::before{content:''; display:inline-block; width:3px; height:14px; background:var(--amber); margin-right:10px; vertical-align:middle;}
  article h3{font-size:16px; color:var(--text); margin:26px 0 10px;}
  article p{font-size:15.5px; color:var(--text-dim); margin-bottom:16px;}
  article ul, article ol{margin:0 0 16px 22px; color:var(--text-dim); font-size:15.5px;}
  article li{margin-bottom:6px;}
  article strong{color:var(--text);}
  article a{color:var(--teal);}
  article code{font-family:var(--mono); font-size:13px; background:var(--bg-panel-2); padding:1px 6px; border-radius:3px; color:var(--amber);}
  figcaption{font-size:12px; color:var(--text-faint); text-align:center; margin-bottom:28px;}

  .table-wrap{overflow-x:auto; margin:20px 0 28px;}
  table{width:100%; border-collapse:collapse; font-family:var(--mono); font-size:12.5px; min-width:620px;}
  th{text-align:right; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--text-faint); padding:8px 10px; border-bottom:1px solid var(--border); white-space:nowrap;}
  th:first-child, td:first-child{text-align:left;}
  td{text-align:right; padding:9px 10px; border-bottom:1px solid var(--border-soft); color:var(--text-dim); white-space:nowrap;}
  td:first-child{color:var(--text); font-weight:600;}
  tr.highlight td{color:var(--amber);}
  td.up{color:var(--green);} td.down{color:var(--red);}

  .callout{background:var(--bg-panel); border-left:3px solid var(--amber); padding:16px 20px; margin:26px 0; font-size:14.5px; color:var(--text-dim); line-height:1.7;}
  .callout b{color:var(--amber);}
  .callout.warn{border-left-color:var(--red);}
  .callout.warn b{color:var(--red);}

  /* --- weekly recap specifics --- */
  .stat-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin:26px 0 30px;}
  .stat{border:1px solid var(--border); background:var(--bg-panel); padding:14px 16px;}
  .stat .k{font-family:var(--mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-faint); margin-bottom:7px;}
  .stat .v{font-family:var(--mono); font-size:19px; font-weight:600; color:var(--text); letter-spacing:-0.01em;}
  .stat .v.up{color:var(--green);} .stat .v.down{color:var(--red);}
  .stat .s{font-family:var(--mono); font-size:11px; color:var(--text-faint); margin-top:5px;}

  .navchart{border:1px solid var(--border); background:var(--bg-panel); padding:18px 8px 8px; margin:8px 0 6px;}
  .navchart svg{display:block; width:100%; height:auto;}

  .trade-card{border:1px solid var(--border); background:var(--bg-panel); padding:18px 20px; margin:20px 0;}
  .trade-card .head{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:12px;}
  .trade-card .act{font-family:var(--mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:3px 9px; border-radius:3px;}
  .trade-card .act.buy{color:#0a0e0f; background:var(--green);}
  .trade-card .act.sell{color:#0a0e0f; background:var(--red);}
  .trade-card .sym{font-family:var(--mono); font-size:16px; font-weight:700; color:var(--text);}
  .trade-card .when{font-family:var(--mono); font-size:11px; color:var(--text-faint); margin-left:auto;}
  .trade-card .terms{font-family:var(--mono); font-size:12.5px; color:var(--amber); margin-bottom:12px;}
  .trade-card p{font-size:14.5px; margin-bottom:12px;}
  .trade-card p:last-child{margin-bottom:0;}

  .checkin-list{list-style:none; margin:0 0 24px; font-family:var(--mono); font-size:12.5px;}
  .checkin-list li{display:flex; gap:12px; padding:7px 0; border-bottom:1px solid var(--border-soft); color:var(--text-dim); margin:0;}
  .checkin-list .d{color:var(--text); min-width:92px;}

  .gennote{font-family:var(--mono); font-size:11.5px; color:var(--text-faint); border:1px dashed var(--border); padding:12px 16px; margin:34px 0 0; line-height:1.7;}

  footer{margin-top:64px; padding-top:22px; border-top:1px solid var(--border);}
  footer p{font-size:12px; color:var(--text-faint); line-height:1.8; max-width:800px; margin-bottom:10px;}
  footer a{color:var(--text-dim);}

  @media (max-width:640px){
    header.blog-head{flex-direction:column; align-items:flex-start;}
    .blog-nav a{margin-left:0; margin-right:16px;}
    .trade-card .when{margin-left:0; width:100%;}
  }`;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Turn a multi-paragraph reason string from ALPHA_DATA into <p> blocks. */
function paragraphs(text, cls) {
  const attr = cls ? ` class="${cls}"` : '';
  return String(text)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p${attr}>${esc(p)}</p>`)
    .join('\n      ');
}

/*
 * `depth` is how many directory levels the page sits below the site root,
 * so relative links resolve from blog/ and blog/recaps/ alike.
 */
function page({ title, description, canonical, ogImage, depth, bodyHtml }) {
  const up = '../'.repeat(depth);
  const img = ogImage || `${SITE}/apple-touch-icon.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · 1KAlpha</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:site" content="@OnekAlpha">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${up}favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script defer src="https://cloud.umami.is/script.js" data-website-id="2dcbaf06-d535-480a-a4a3-f571b7b1a79c"></script>
<style>
${CSS}
</style>
</head>
<body>
<div class="wrap">

  <header class="blog-head">
    <a class="brand-link" href="${up}">1K<span>Alpha</span></a>
    <nav class="blog-nav">
      <a href="${up}blog/">Blog</a>
      <a href="https://x.com/OnekAlpha" target="_blank" rel="noopener">${X_ICON}Follow</a>
    </nav>
  </header>

${bodyHtml}

</div>
</body>
</html>
`;
}

/*
 * Renders the hand-written narrative for a recap.
 *
 * The narrative is prose authored by a session; everything else on the page is
 * computed. Escaping happens FIRST and formatting is applied to the escaped
 * text, so prose can never introduce markup — a stray "<" in a sentence is a
 * broken page, and an authored href is a worse problem than that. Only a small
 * subset is supported on purpose: paragraphs, "## " subheadings, bullet lists,
 * **bold**, *italic*, and [links](https://...) restricted to http(s) or a
 * relative path.
 */
function inlineMarkdown(escaped) {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\.{0,2}\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
}

function renderNarrative(md) {
  const blocks = String(md)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const heading = block.match(/^##\s+(.+)$/);
    if (heading) return `<h3>${inlineMarkdown(esc(heading[1]))}</h3>`;

    const lines = block.split('\n').map((l) => l.trim());
    if (lines.length && lines.every((l) => /^[-*]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${inlineMarkdown(esc(l.replace(/^[-*]\s+/, '')))}</li>`)
        .join('\n      ');
      return `<ul>\n      ${items}\n    </ul>`;
    }

    return `<p>${inlineMarkdown(esc(block.replace(/\n/g, ' ')))}</p>`;
  }).join('\n    ');
}

module.exports = { SITE, X_ICON, CSS, esc, paragraphs, renderNarrative, page };
