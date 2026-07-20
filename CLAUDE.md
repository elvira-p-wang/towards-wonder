# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal website ("Towards Wonder") for Elvira Wang — plain HTML/CSS/JS with no build tooling, no package manager, and no framework. Every page is hand-authored and linked via relative paths.

## Commands

There is no build, lint, or test setup. To preview changes, either:
- Double-click `index.html` to open it directly in a browser, or
- Serve the directory locally, e.g. `python3 -m http.server` from the project root, then visit `http://localhost:8000`.

To publish: drag the folder into Netlify Drop, or push to a GitHub Pages–enabled repo (per [README.txt](README.txt)).

## Architecture

- `index.html` — the entire single-page site. All sections (Hero, Explore, Travel Map, Tiny Discoveries, Essays, Gallery, Projects, About Me, Contact) live in one file, navigated via in-page anchor links (`#explore`, `#map`, `#essays`, etc.) rather than separate routes.
- `style.css` — one stylesheet for the whole site, including both the homepage design system and the longform essay layout (see below). CSS custom properties in `:root` (`--bg`, `--ink`, `--accent`, etc.) define the palette; change them there rather than hardcoding colors elsewhere.
- `script.js` — all homepage interactivity, in four independent, unrelated pieces:
  1. Scroll-position memory (saves/restores exact `scrollY` per-path via `sessionStorage`, with `history.scrollRestoration = 'manual'`).
  2. Hero → Explore transition (the "Begin" button locks hover states via a pointermove listener until the user actually moves the mouse, to avoid accidental hover-triggered animations after the scroll).
  3. `IntersectionObserver`-driven scroll reveals for the Explore intro text and list items.
  4. Travel map pin interactions — clicking a `.pin` button rewrites `#mapNote`'s innerHTML from the `notes` object keyed by place name.
- `essays/*.html` — standalone longform essay pages, each a full HTML document (own `<head>`, own Google Fonts `<link>`s) that links back to `../style.css` and `../images/`. They share one structural template: `essay-page` body class → `.reading-progress` bar → `.article-header` (title/subtitle/meta) → `.article-body` (drop cap, pull quotes, `article-bridge`/`article-ending` styled asides) → `.article-references` → `.article-footer`.
  - **Known duplication**: each essay page inlines its own `<script>` for the reading-progress bar calculation — identical logic copy-pasted three times rather than factored into `script.js`. When editing this behavior, update all three essay files.
  - When adding a new essay, copy the structure of an existing one in `essays/` (matching class names exactly, since all styling comes from the shared `.article-*` rules in `style.css`) and add a corresponding `.essay-spine` entry to the Essays section of `index.html`.
- Field Notes (`#discoveries` in `index.html`, styled by `.field-note-*` rules in `style.css`) — a horizontally scrollable row of small note cards, deliberately not styled like the Essays shelf. Each `.field-note-card` shows only a number/title/tag(s)/date by default; hovering (or `:focus-visible`) crossfades the title into a one-line hook sentence plus a reveal link (`N min →`). The row contains only real notes Elvira has sent — there are no placeholder/demo cards, and none should be added. See "Field Notes maintenance rules" below — follow this process automatically whenever Elvira sends a new note, without being asked.
- Field Note reading pages (`field-notes/*.html`, e.g. `field-notes/the-shape-of-home.html`) — deliberately **not** a copy of the essay template. Body class is `field-note-page` (not `essay-page`), nav wrapper is `field-note-page-nav`. They reuse the shared longform primitives (`.article-main`, `.longform-essay`, `.article-body`, `.drop-cap`, `.article-bridge`, `.article-ending`, `.article-footer`, same width/palette/grain/nav) but the header is intentionally shorter and quieter — see "Field Note page template" below. No reading-progress bar, no `.article-references` section (these are personal notes, not research essays).

## Field Note page template

This is the standing structure for every `field-notes/*.html` page — follow it exactly for new notes, don't drift back toward the essay template:

- `<body class="field-note-page">`, header `<header class="nav field-note-page-nav">` (same nav links, just pointing `Field Notes` at `#discoveries` instead of `Essays`).
- **No** `.reading-progress` bar markup, and **no** inline reading-progress `<script>` at the bottom (essays have both; field notes have neither).
- `.article-header` contains only: the `.article-back` link ("← Back to field notes"), a plain `<h1>` (no `.section-label` eyebrow above it, no `.article-subtitle` below it), and one `.article-meta` line.
- **Title**: plain text, no `<em>` emphasis span and no forced `<br>` line break — don't invent an italicized word just to echo the essay layout. Styled smaller/lighter via `.field-note-page .article-header h1` (~32–48px vs. essays' ~56–91px).
- **Meta line** (reuses `.article-meta`/`.article-meta-dot`, same dot-separated style as essays, different content): exactly four items, in this order — `No. 0XX` (the note's current number) → topic tag(s) → exact date → reading time. No author name, no visible word count.
- **Date format on the page** is the full exact date, e.g. `12 July 2026` (`<time datetime="2026-07-12">`) — this is deliberately more precise than the card's abbreviated `Jul 2026`; the two formats coexist by design (card = compact list view, page = precise record).
- Body content below the header is unchanged from the essay system: drop cap on the lead paragraph, `.article-bridge` on short standalone lines (in place, not duplicated), `.article-ending` on the closing line. No `.article-pullquote` duplication of her own sentences — if a line deserves emphasis, style it in place rather than repeating it.

## Field Notes maintenance rules

Elvira will send real Field Notes over time — full article text plus a publication date. For every note she sends, follow this process automatically, without being asked:

1. **Preserve the article.** Use her title and article text as given; don't rewrite, shorten, or alter the argument unless she explicitly asks for an edit. Create (or update) the note's full reading page in `field-notes/` following the "Field Note page template" above, and point the card's `href` at it.
2. **Reading time.** Word count ÷ 220 wpm, rounded **up** to the nearest whole minute, minimum 1. Replace the card's `Read →` with `N min →` (exactly that format — not "min read"). On the reading page itself, the same figure is shown as `N min read` in the meta line. Recalculate whenever the article text changes.
3. **Topic tag.** Pick the single most fitting tag from: Humanity, Meaning, Home, Belonging, Growth, Presence, Identity, Perception, Relationships, Dentistry, Design, Travel, Nature, Technology, Care, Beauty, Art, Ethics. If Elvira specifies the topic herself when sending a note, use exactly what she says (add it to this list if new) rather than reclassifying it. Use two only when both are genuinely central (format `Tag · Tag`, matching the existing separator). Tags may be revisited/reclassified later as the collection grows — when a note is reclassified, update both the card and the reading page's meta line together (they must always match).
4. **Hover sentence** (`.field-note-hook`). Does not need to be an exact quote from the article — it can be an original "editor's line": a short, inviting sentence written for the card, in the spirit of an epigraph or pull-quote at the front of an essay collection. Either way it must be concise, capture the piece's core argument or emotional/philosophical core, and spark curiosity — never a summary, description, or clickbait. Wrap it in curly quotation marks (`“…”`) in the card markup — this applies to every hover sentence, past and future. Keep it short enough to sit comfortably in the card.
5. **Date.** Use exactly the date she provides. Card shows the abbreviated form (e.g. `Jan 2026`); the reading page shows the exact form (e.g. `12 January 2026`). Never infer or invent a more precise date than given.
6. **Reorder + renumber the whole collection.** Numbers are continuous starting at `001` = oldest; numbers increase with recency; the newest note gets the highest number. Cards run newest → oldest, left → right (highest number = leftmost `.field-note-card`). Every time a note is added, re-sort and renumber *all* cards by date — don't just append — since she may send notes out of chronological order. When a note's number changes, update its `No. 0XX` on its reading page too.
7. **Same-date ties.** If two notes share a date, preserve the order she provided them in; don't invent a more precise time to break the tie.
8. **Song lyrics.** If a note quotes a song, don't reproduce the lyric text in the published page — omit that line, leave an HTML comment noting it was skipped, and flag it to Elvira so she can add it herself or say how she'd like the moment represented instead.
9. **Preserve the existing design.** Keep the current card layout/typography/spacing/hover transition and the Field Note page template as-is; don't redesign either while adding content unless explicitly asked. Insert the new card into its correct chronological position in the row rather than just appending it at one end.

**Before implementing**, report: word count, calculated reading time, chosen tag(s), the selected hover sentence, and where the note lands chronologically relative to existing notes. Then make the changes.

## Known gaps to be aware of

- `images/gallery-01.jpg`, `gallery-02.jpg`, `gallery-03.jpg`, and `images/about-me.jpg` are referenced in `index.html` but do not exist in `images/`.
- The Contact section's mailto link still uses the placeholder `your.email@example.com`.
- `index.html` has a duplicate empty `<section id="projects" class="section projects"></section>` immediately before the populated Projects section.

## Project Philosophy

Towards Wonder is not a portfolio.

It is an editorial space for thoughtful writing, travel, and curiosity.

Design principles:

- calm over stimulation
- editorial rather than corporate
- generous whitespace
- typography first
- subtle interactions only
- Scandinavian-inspired minimalism
- every animation should feel intentional

Avoid:

- flashy UI
- gradients
- unnecessary JavaScript
- dashboard aesthetics
- decorative effects without purpose
