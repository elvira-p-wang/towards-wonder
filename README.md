# Towards Wonder

A place for curiosity.

Towards Wonder is a personal website collecting essays, field notes, illustrations, photographs, travel memories, and small interactive experiments.

Rather than a portfolio, it's an evolving archive of things I don't want to forget.

🌐 https://elvira.studio

---

## Philosophy

Towards Wonder wasn't built to impress.

It was built to slow people down.

I wanted to create a website that feels calm, thoughtful, and quietly playful - where design supports stories instead of competing with them.

Every page is designed around one idea:

> Stay curious.  
> Keep noticing.  
> Move a little slower.

---

## Features

### ✦ Essays

Long-form reflections on identity, science, creativity, travel, and the quiet questions that stay with us.

### ✦ Field Notes

Tiny observations, unfinished thoughts, and moments that quietly stayed with me - some serious, some just funny things that happened after an exam.

### ✦ Gallery

Photography, drawings, and concert memories, presented like a quiet museum rather than a portfolio grid - one exhibition room at a time, nothing cropped or rushed.

### ✦ Interactive World Map

A hand-drawn 3D globe of the countries I've visited, each one paired with a personal memory instead of a travel guide. Built from scratch with plain canvas and trigonometry - no 3D library underneath.

### ✦ Quiet Interactions

Small details that reward curiosity, never ones that demand attention.

Including:

- 🦊 A tiny pixel fox that quietly accompanies visitors, and occasionally falls asleep
- 🖱️ A soft custom cursor, restrained further on long-form reading pages
- ✨ Gentle scroll reveals and hover transitions
- 🎵 An optional, opt-in ambient music button - never autoplaying

---

## Design Principles

This website follows a few simple rules.

- Minimal before decorative.
- Every interaction should have a reason.
- Reading always comes first.
- Small details matter.
- Curiosity over productivity.

---

## Built With

Plain HTML, CSS, and JavaScript - no frameworks, no build step, no runtime dependencies.

- HTML / CSS / JavaScript, hand-authored
- A small amount of dev-only Node tooling (see below) to prepare gallery images before deploy
- Git & GitHub for version control
- Any static host - Netlify Drop, GitHub Pages, or similar

Designed and built entirely from scratch. Every interaction on this site, including the 3D globe, is written in plain JavaScript with nothing imported at runtime.

---

## Project Structure

```text
/
├── index.html            # The whole homepage - Hero, Explore, Map, Gallery, Field Notes, Projects, About, Contact
├── style.css             # One stylesheet for the entire site
├── script.js              # Scroll memory, hero transition, scroll-reveal animations
├── globe.js                # The interactive 3D travel map
├── cursor.js                 # The custom cursor
├── fox.js                     # The pixel fox companion
├── audio.js                    # The ambient music button
├── gallery-preload.js            # Warms the Gallery's image cache before you open it
├── essays/                        # Long-form writing
├── field-notes/                    # Short, personal notes
├── gallery/                         # Photographs, Visual Arts & Concerts - each its own exhibition page
├── images/                           # Every image on the site, including gallery originals
├── audio/                              # The ambient background track
├── scripts/                             # Dev-only tooling that prepares gallery images (Node + sharp)
└── package.json                          # Powers only the gallery pipeline above, not a build step
```

---

## Running Locally

No build step, no server required.

- Double-click `index.html` to open it directly in a browser, or
- Serve the folder locally - `python3 -m http.server` from the project root, then visit `http://localhost:8000`

Adding real photos or drawings to the Gallery:

```bash
npm install          # once
npm run prepare-gallery   # optimises new images and regenerates gallery data
```

---

## Performance

Built with simplicity in mind.

- Responsive design
- Lightweight vanilla JavaScript
- Optimised, size-aware image compression
- Smooth scrolling
- Mobile-friendly layouts
- Accessible navigation
- Thoughtfully crafted interactions

---

## Why Vanilla JavaScript?

This project intentionally avoids frameworks and libraries, even for the parts that look like they'd need one - like the 3D globe.

Building everything from scratch helped me better understand how the web actually works, while keeping the site light, fast, and entirely my own.

Sometimes simplicity is the better design choice.

---

## Inspiration

Inspired by:

- Nordic minimalism
- Editorial design
- Museums and quiet libraries
- Slow travel
- Nature
- The small moments that often go unnoticed

---

## Currently Brewing ☕

More is on the way.

- Interactive projects
- More essays
- More field notes
- Oral health experiments
- More illustrations
- New places on the map

---

## About

Hi, I'm Elvira.

I study oral health, write, illustrate, and build thoughtful experiences for the web.

I'm interested in the space where science, design, technology, and human stories meet.

Towards Wonder is where those interests come together.

---

## Connect

🌐 Website  
https://elvira.studio

💼 LinkedIn  
https://www.linkedin.com/in/pinrou-wang-66a6463b7

---

## License

This is a personal, creative project rather than open-source software - the code structure is here for anyone curious to read, but the writing, photographs, and artwork remain © Elvira Wang. Please don't republish them without asking.

---

Designed and built by Elvira Wang.

Built slowly, one small detail at a time.

Made with curiosity, patience, and a little pixel fox. 🦊
