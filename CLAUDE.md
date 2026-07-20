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
- Gallery (`#gallery` in `index.html`, plus `gallery/photographs.html` and `gallery/drawings.html`) — a museum-style entrance, not a portfolio grid. See "Gallery architecture" below for the full module structure, data convention, and how to add real images.

## Field Note page template

This is the standing structure for every `field-notes/*.html` page — follow it exactly for new notes, don't drift back toward the essay template:

- `<body class="field-note-page">`, header `<header class="nav field-note-page-nav">` (same nav links, just pointing `Field Notes` at `#discoveries` instead of `Essays`).
- **No** `.reading-progress` bar markup, and **no** inline reading-progress `<script>` at the bottom (essays have both; field notes have neither).
- `.article-header` contains only: the `.article-back` link ("← Back to field notes"), a plain `<h1>` (no `.section-label` eyebrow above it, no `.article-subtitle` below it), and one `.article-meta` line.
- **Title**: plain text, no `<em>` emphasis span and no forced `<br>` line break — don't invent an italicized word just to echo the essay layout. Styled smaller/lighter via `.field-note-page .article-header h1` (~32–48px vs. essays' ~56–91px).
- **Meta line** (reuses `.article-meta`/`.article-meta-dot`, same dot-separated style as essays, different content): exactly four items, in this order — `No. 0XX` (the note's current number) → topic tag(s) → exact date → reading time. No author name, no visible word count.
- **Date format on the page** is the full exact date, e.g. `12 July 2026` (`<time datetime="2026-07-12">`) — this is deliberately more precise than the card's abbreviated `Jul 2026`; the two formats coexist by design (card = compact list view, page = precise record).
- Body content below the header is unchanged from the essay system: drop cap on the lead paragraph, `.article-bridge` on short standalone lines (in place, not duplicated), `.article-ending` on the closing line. No `.article-pullquote` duplication of her own sentences — if a line deserves emphasis, style it in place rather than repeating it.

## Gallery architecture

The Gallery is two completely independent modules — Photographs and Drawings — reached through a shared entrance. It is deliberately not a portfolio: no cards, no colour, no Pinterest-style grid. Every image gets room to breathe.

**Files:**
- `index.html` `#gallery` — the entrance. Two full-bleed panels (`.gallery-panel`), each a single `<a>` linking to one of the two exhibition pages. No buttons; the image itself is the link.
- `gallery/photographs.html` — standalone exhibition page, **room-switcher** interaction (see below): one collection visible at a time — Stillness, Light, Human Traces, Landscapes, Details, in that order — switched horizontally, browsed vertically. Grid mode `"masonry"`: CSS `column-count`, cropped to fixed aspect keywords, meant to read as an organic photo stream.
- `gallery/drawings.html` — standalone exhibition page, **same room-switcher**, same nav/transition/keyboard/touch/lightbox behaviour as Photographs — Sketches, Illustrations, Comics, Visual Thoughts, in that order. Grid mode `"editorial"`: CSS Grid, each artwork at its own natural `aspectRatio` (no cropping), matted tiles (`.exhibit-tile--editorial`) so it reads as composed, individual works rather than a photo stream. Photographs and Drawings share every structural and interaction layer; only the grid mode and the data differ — see "Room switcher" below for what's shared vs. what's mode-specific.
- `gallery/data/photographs-data.js` and `gallery/data/drawings-data.js` — the content, one file per module. `photographs-data.js` still contains an `editors-selection` collection — it's just not part of the room rotation `photographs.html` renders. Leave the data in place; reviving it is a one-line change to the `roomIds` array in `photographs.html`'s inline script.
- `gallery/gallery.js` — shared rendering engine used by both pages (see below).
- `gallery/rooms.js` — the room-switcher, shared by both pages (mode-agnostic — see below).

**Data convention — JSON-shaped, but loaded as a script, not `fetch()`.** The data files assign to `window.PHOTOGRAPHS_DATA` / `window.DRAWINGS_DATA` instead of being `.json` files fetched at runtime. This is deliberate: `fetch()` of a local file fails under `file://` (CORS), which would break this site's core convention of previewing by double-clicking `index.html` with no server. Loading data as a plain `<script src="data/...">` keeps that working. If a real build step is ever introduced, converting these to true `.json` + `fetch()` is a small, mechanical change — the shape stays identical.

**Photographs schema** (`aspect` keyword, masonry mode):
```js
window.PHOTOGRAPHS_DATA = {
  totalCount: 257,               // shown on the entrance panel only
  collections: [
    {
      id: "stillness",           // used for DOM ids and lightbox state
      title: "Stillness",
      sentence: "One line, shown under the title before the grid.",
      featured: true,             // optional — bigger masonry columns if a collection using this is ever rendered in the vertical-stack style (renderCollections)
      comingSoon: true,           // optional — renders "More to come." instead of a grid
      images: [
        { id: "stillness-001", src: null, alt: "", aspect: "portrait" }
      ]
    }
  ]
};
```
`aspect` is one of `portrait` / `square` / `landscape` / `tall` / `wide` — varied, for masonry rhythm, mapped to a fixed CSS `aspect-ratio` on `.exhibit-tile`.

**Drawings schema** (`aspectRatio` value, editorial mode) — see the full field-by-field comment at the top of `gallery/data/drawings-data.js`:
```js
window.DRAWINGS_DATA = {
  totalCount: 36,
  collections: [
    {
      id: "comics",
      title: "Comics",
      sentence: "Small stories told in sequence.",
      images: [
        {
          id: "comics-morning-walk-1",
          src: null, thumbnail: null, alt: "",
          category: "comics",              // sketches | illustrations | comics | visual-thoughts
          aspectRatio: "3 / 2",             // CSS aspect-ratio value — natural proportion, never forced
          featured: false,                  // optional — spans 2 grid columns
          sequence: { group: "morning-walk", page: 1 }, // optional — comic pages that belong together
          title: undefined, year: undefined, medium: undefined, // optional — surfaced in the lightbox meta line when present
          dimensions: undefined, description: undefined, order: 1
        }
      ]
    }
  ]
};
```
Every field beyond `id`/`src`/`alt`/`aspectRatio`/`category` is optional; today's placeholder data deliberately leaves `title`/`year`/`medium`/`dimensions`/`description` unset rather than inventing real-sounding artwork info — fill them in alongside `src` when Elvira supplies real drawings. `category` drives the medium-specific grid rhythm: `comics` gets a wide 2-column card (`.exhibit-tile--comics`) so panels stay legible without cropping; the others render at whatever `aspectRatio` and `featured` specify. `sequence` and `order` are structural metadata only — nothing groups sequence pages into a sub-carousel or resorts by `order` yet; both are there for whenever that's worth building.

**Adding a real image**: give it a `src` (path under `../images/gallery/...`) and a short `alt`. Until `src` is set, `gallery.js` renders a quiet numbered placeholder tile instead of a broken image — this is what the site shows today, since no real photographs or drawings have been supplied yet. Adding more images to a collection just means adding more entries to its `images` array (or raising the count passed to the `makeImages()` helper already used in both data files) — nothing in the layout or rendering code needs to change, by design, so the structure holds at hundreds of images.

**`gallery.js` responsibilities** (the shared engine both pages build on):
- `TowardsWonderGallery.renderCollections(data, rootSelector, mode)` — vertical stack of every collection in `data`, appended into one root. Not used by either gallery page today (both use the room switcher) — kept available for a future page that wants a plain scrolling list instead of rooms.
- `TowardsWonderGallery.buildCollectionSection(collection, mode)` — builds one collection (intro + grid + infinite scroll) and returns it **detached**, for a caller to place wherever it wants. `mode` is `"masonry"` or `"editorial"` — see `createTile()` for how each mode sets tile classes/aspect-ratio. `rooms.js` calls this once per room panel, on both pages.
- Optional artwork count line (`.exhibit-collection-count`, e.g. "10 works") under the collection sentence — only rendered when `mode === "editorial"`, so the Photographs header is untouched.
- Batches images in 12 at a time per collection (infinite scroll), via one `IntersectionObserver` per collection watching a trailing sentinel element — not a single global scroll listener.
- Native `loading="lazy"` on real `<img>` tags for lazy loading once real `src` values exist.
- A single shared fullscreen lightbox (built once, reused across every tile on the page, regardless of which collection or room it's in): fade + gentle scale transition, ←/→/Esc keyboard navigation, click-outside-to-close, focus returns to the originating tile on close. `TowardsWonderGallery.isLightboxOpen()` is exposed so other code (the room switcher) can check before acting on the same keys. An optional metadata line (`.lightbox-meta`, title · year · medium, whichever parts exist) sits above the index/total caption and is hidden via `:empty` when an image carries none of those fields — true for every Photographs image and every placeholder Drawings image today, so it's invisible until real artwork metadata is added.
- A separate `IntersectionObserver` fades/rises each tile in as it enters the viewport (respects `prefers-reduced-motion`).

**Room switcher (`gallery/rooms.js`, shared by both pages)**: turns a list of collections into "exhibition rooms" — only one in the DOM flow at a time, switched by click / ←→ arrow keys / touch swipe / trackpad horizontal wheel, never by page reload, and cyclically (there is always a previous and next room, wrapping past the first/last). `initRooms(data, roomIds, navSelector, stageSelector, mode)` takes the grid mode as its last argument (`"masonry"` for `photographs.html`, `"editorial"` for `drawings.html`, defaulting to `"masonry"` if omitted) and passes it straight through to `buildCollectionSection()` — `rooms.js` itself has no opinion on how a room's grid looks, only on which room is showing. Mechanically:
- All rooms are built up front via `buildCollectionSection()` (this is the "preload adjacent collections" Elvira asked for — with a handful of placeholder rooms, building all of them up front is simpler than true adjacent-only lazy building and costs nothing noticeable; revisit only if real content ever makes a single room's initial batch expensive).
- **Nav design**: `.room-nav` shows only three items — previous / current / next room title (e.g. "← Light   Stillness   Human Traces →"), not all five at once. Previous/next are muted with a small arrow that nudges on hover; current is bolder/accent-coloured. The three labels are rebuilt (not just re-highlighted) on every room change, since which collections count as "prev"/"next" changes too — see `updateNav()` in `rooms.js`. This was chosen over showing all five names at once (which Elvira had explicitly allowed as a fallback) because it reads calmer and more like standing between two doorways than clicking a tab bar. `.room-nav` stays `position: sticky` under the site's top nav.
- **Cyclic navigation**: `cycle(index, delta) = (index + delta + rooms.length) % rooms.length` — going next from the last room wraps to the first, and vice versa, so the nav never has to grey out an unusable arrow. `goToRoom()` takes an explicit `direction` parameter from `goNext()`/`goPrev()` (rather than inferring it from the raw index difference) so the slide direction is still correct at the wrap boundary.
- **Edge fades** (`.room-stage-edge--left/right`): two fixed-position gradient strips at the page edges, present at all times (navigation is cyclic, so the exhibition always continues past either side) — a quiet, wordless hint that horizontal interaction exists, deliberately not tutorial text like "swipe left or right".
- Switching rooms: the outgoing and incoming panels are both set `position: absolute` and the stage's `min-height` is locked to the outgoing panel's height first, so nothing jumps; the incoming panel starts translated off to one side (`.is-entering-from-left/right`), a forced reflow (`void el.offsetWidth`) makes that starting position "stick" for one frame, then both panels' classes flip to their resting state so the CSS `transition` actually animates between the two — a fade + short horizontal slide, direction-aware. After the transition timeout, the outgoing panel is fully hidden and the incoming one returns to normal document flow.
- Arrow-key nav is gated on `!TowardsWonderGallery.isLightboxOpen()` so it never fights the lightbox's own ←/→ image navigation.
- Touch swipe requires the horizontal delta to clearly dominate the vertical one before it acts, and the stage has `touch-action: pan-y`, so vertical scrolling to browse photographs is never intercepted — the two interactions (browse vs. switch room) are structurally kept apart, not just tuned to feel separate. Once a gesture reveals itself as horizontal, its `touchmove` calls `preventDefault()` (via a `{ passive: false }` listener) for the rest of that gesture — otherwise the same horizontal drag is also read by the browser itself as an edge-swipe "go back" gesture, which would leave the Photographs page entirely and land back on the Hero section. A gesture that reveals itself as vertical is never touched.
- On mobile (`max-width: 760px`), the prev/next room *names* are hidden and only their arrows remain (plus the current room's name) — showing all three full titles at once got tight on narrow screens; the arrows alone are enough to signal "more rooms this way."

**Visual system**: scoped to `.gallery-page` / `.gallery-entrance` — background `#f8f7f4` (Elvira's spec, distinct from the homepage's `--bg`), same typography and grain as the rest of the site. Motion is intentionally slow (0.5–1.2s, calm easing) and small (hover scale caps at 1.03) — do not add shadows, dashboard-style cards, boxed/coloured tabs, or fast/dramatic transitions here; that would work against the "quiet museum" brief this system was built to.

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

- `images/about-me.jpg` is referenced in `index.html` but does not exist in `images/`.
- No real photographs or drawings have been supplied yet — every Gallery tile renders as a numbered placeholder until real images are added to `gallery/data/*.js` (see "Gallery architecture" above). The Photographs entrance panel does use a real photo (`images/Florence1.jpeg`); the Drawings panel is a placeholder tone fill.
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
