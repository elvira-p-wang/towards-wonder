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
