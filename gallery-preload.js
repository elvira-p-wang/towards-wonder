/* ========================================
   GALLERY PRELOAD (homepage + essay pages only)

   Warms the browser's image cache for all three Gallery modules —
   Photographs, Drawings, Concerts — before the visitor ever opens
   one, so each feels instant when they do, without slowing down the
   page it runs on. Isolated, reusable script, included via
   <script src="gallery-preload.js"> from index.html or
   <script src="../gallery-preload.js"> from an essay page. Does
   nothing else: it never builds gallery markup, never runs
   gallery.js's reveal/hover animations, and never touches the DOM
   beyond a couple of dynamically-inserted <script> tags per module,
   used to fetch that module's own data files.

   Drawings and Concerts have no real images yet (every tile is still
   a placeholder with src: null — see CLAUDE.md → "Gallery
   architecture"), so warming them today fetches nothing at all. The
   moment real photos/art exist there, this starts warming them
   automatically — no changes needed here.

   EDIT POINTS:
   - IDLE_BATCH_SIZE   how many of a module's first collection's
                       images to warm during idle time.
   - HOVER_BATCH_SIZE  how many additional images to warm the instant
                       a visitor shows intent (hover/focus/touch) on
                       that module's link.
   - GALLERIES         which modules exist and how to reach each
                       one's data/link.
======================================== */

(function () {
  "use strict";

  // ----------------------------------------
  // GUARDS — never preload on a slow or data-saving connection. The
  // Network Information API isn't universally supported (notably
  // Safari/Firefox); where it's absent we have no signal either way,
  // so we proceed rather than assume the worst.
  // ----------------------------------------

  var connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    if (connection.saveData) return;
    if (/^(slow-2g|2g)$/.test(connection.effectiveType || "")) return;
  }

  // ----------------------------------------
  // This script always lives at the project root (same level as
  // cursor.js), so resolving "." against its own <script src> gives
  // the project root's URL regardless of whether the *page* running
  // it is at that same root (index.html) or one level down
  // (essays/*.html) — needed because the image paths stored in each
  // module's data file are written relative to gallery/*.html
  // (e.g. "../images/gallery/photographs/presence/presence1.jpeg"),
  // which only resolves correctly from within gallery/ itself.
  // ----------------------------------------

  var scriptEl = document.currentScript;
  var PROJECT_ROOT = scriptEl ? new URL(".", scriptEl.src).href : null;
  if (!PROJECT_ROOT) return;

  function resolveGalleryImageUrl(relativeSrc) {
    // Strip the one leading "../" the data file's paths always carry
    // (written relative to gallery/*.html) and resolve what's left
    // against the project root instead of this page's own location.
    return new URL(relativeSrc.replace(/^\.\.\//, ""), PROJECT_ROOT).href;
  }

  // ----------------------------------------
  // CACHE WARMING — a plain, off-DOM Image() object triggers a
  // normal-priority fetch that populates the browser's HTTP cache
  // under that exact URL, with nothing rendered, laid out, or
  // animated. Deliberately not <link rel="preload">, which signals
  // "I need this imminently" and gets elevated fetch priority in
  // most browsers — the opposite of what a quiet background warm-up
  // during idle time should ask for. Shared across all three
  // galleries so the same URL is never fetched twice even if two
  // modules' warm-ups somehow overlap.
  // ----------------------------------------

  var preloadedUrls = Object.create(null);

  function preloadUrl(url) {
    if (!url || preloadedUrls[url]) return;
    preloadedUrls[url] = true;
    var img = new Image();
    img.src = url;
  }

  // ----------------------------------------
  // PER-MODULE CONFIG — each gallery's own data files, globals and
  // link selector. `roomsVar` is null for Concerts, which has no
  // room switcher and so no rooms file — its data has exactly one
  // collection, used directly.
  // ----------------------------------------

  var IDLE_BATCH_SIZE = 12;
  var HOVER_BATCH_SIZE = 12;

  var GALLERIES = [
    {
      name: "photographs",
      dataScripts: ["gallery/data/photographs-rooms.js", "gallery/data/photographs-data.js"],
      dataVar: "PHOTOGRAPHS_DATA",
      roomsVar: "PHOTOGRAPHS_ROOM_ORDER",
      linkSelector: 'a[href*="photographs.html"], a[href$="#gallery"]'
    },
    {
      name: "drawings",
      dataScripts: ["gallery/data/drawings-rooms.js", "gallery/data/drawings-data.js"],
      dataVar: "DRAWINGS_DATA",
      roomsVar: "DRAWINGS_ROOM_ORDER",
      linkSelector: 'a[href*="drawings.html"]'
    },
    {
      name: "concerts",
      dataScripts: ["gallery/data/concerts-data.js"],
      dataVar: "CONCERTS_DATA",
      roomsVar: null,
      linkSelector: 'a[href*="concerts.html"]'
    }
  ];

  // ----------------------------------------
  // DATA LOADING — deferred entirely behind the same idle/intent
  // triggers as the image warm-up itself, via dynamically-inserted
  // <script> tags rather than static ones in the page's own HTML, so
  // this adds zero network requests (and zero JS parse time) to the
  // homepage/essay page's normal load — only once genuinely idle, or
  // once a visitor shows real intent, does anything start.
  // ----------------------------------------

  function loadGalleryData(gallery) {
    if (gallery.dataReadyPromise) return gallery.dataReadyPromise;

    gallery.dataReadyPromise = new Promise(function (resolve) {
      if (window[gallery.dataVar] && (!gallery.roomsVar || window[gallery.roomsVar])) {
        resolve();
        return;
      }

      var remaining = gallery.dataScripts.length;
      function oneDone() {
        remaining -= 1;
        if (remaining === 0) resolve();
      }

      gallery.dataScripts.forEach(function (relativePath) {
        var el = document.createElement("script");
        el.src = PROJECT_ROOT + relativePath;
        el.onload = oneDone;
        el.onerror = oneDone; // don't hang forever if the data files ever move
        document.head.appendChild(el);
      });
    });

    return gallery.dataReadyPromise;
  }

  function firstCollectionImageUrls(gallery, count) {
    var data = window[gallery.dataVar];
    if (!data || !data.collections || !data.collections.length) return [];

    var firstId = gallery.roomsVar
      ? (window[gallery.roomsVar] || [])[0]
      : data.collections[0].id;
    if (!firstId) return [];

    var collection = null;
    for (var i = 0; i < data.collections.length; i++) {
      if (data.collections[i].id === firstId) {
        collection = data.collections[i];
        break;
      }
    }
    if (!collection) return [];

    return collection.images
      .slice(0, count)
      .map(function (image) {
        return image.src;
      })
      .filter(Boolean)
      .map(resolveGalleryImageUrl);
  }

  // ----------------------------------------
  // IDLE-TIME WARM-UP — each gallery's first collection, first batch
  // only (matching gallery.js's own BATCH_SIZE), i.e. exactly what a
  // visitor sees immediately on opening that gallery — not the whole
  // exhibition. All three run off the same idle callback; today this
  // costs nothing extra for Drawings/Concerts since they have no real
  // images yet (see file header).
  // ----------------------------------------

  function requestIdle(fn) {
    if (window.requestIdleCallback) {
      requestIdleCallback(fn, { timeout: 4000 });
    } else {
      // Safari has no requestIdleCallback — a generous fixed delay
      // approximates "after the page has settled" well enough.
      window.setTimeout(fn, 2000);
    }
  }

  requestIdle(function () {
    GALLERIES.forEach(function (gallery) {
      loadGalleryData(gallery).then(function () {
        firstCollectionImageUrls(gallery, IDLE_BATCH_SIZE).forEach(preloadUrl);
      });
    });
  });

  // ----------------------------------------
  // INTENT-TRIGGERED WARM-UP — hovering, focusing, or touching a
  // gallery-bound link immediately warms a further batch for that
  // specific gallery, so by the time a click actually lands, more of
  // that exhibition is ready.
  // ----------------------------------------

  GALLERIES.forEach(function (gallery) {
    var intentTriggered = false;

    function preloadOnIntent() {
      if (intentTriggered) return;
      intentTriggered = true;

      loadGalleryData(gallery).then(function () {
        firstCollectionImageUrls(gallery, IDLE_BATCH_SIZE + HOVER_BATCH_SIZE).forEach(
          preloadUrl
        );
      });
    }

    var links = document.querySelectorAll(gallery.linkSelector);
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("mouseenter", preloadOnIntent, { passive: true });
      links[i].addEventListener("focus", preloadOnIntent, { passive: true });
      links[i].addEventListener("touchstart", preloadOnIntent, { passive: true });
    }
  });
})();
