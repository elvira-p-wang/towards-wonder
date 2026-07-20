/*
  Shared behaviour for the Gallery exhibition pages (photographs.html,
  drawings.html and concerts.html): renders collections from a data
  file, batches images in as the visitor scrolls (infinite scroll +
  lazy loading), and drives a shared fullscreen lightbox with
  keyboard navigation.

  Deliberately framework-free, consistent with the rest of the site.
  See CLAUDE.md → "Gallery architecture" for the overall shape.
*/

(function () {
  "use strict";

  var BATCH_SIZE = 12;

  var collectionState = {};

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "120px 0px" }
  );


  /* ----------------------------------------
     TILES
  ---------------------------------------- */

  function createTile(image, collectionId, globalIndex, mode) {
    var tile = document.createElement("button");

    tile.type = "button";

    if (mode === "editorial") {
      // Editorial (Drawings) tiles keep their natural proportions —
      // an inline aspect-ratio per artwork instead of the fixed
      // keyword classes the Photographs masonry uses — and are never
      // cropped, so a set aspectRatio takes priority over any legacy
      // `aspect` keyword.
      tile.className =
        "exhibit-tile exhibit-tile--editorial" +
        (image.category ? " exhibit-tile--" + image.category : "") +
        (image.featured ? " exhibit-tile--span2" : "");
      tile.style.aspectRatio = image.aspectRatio || "4 / 5";
    } else {
      tile.className = "exhibit-tile exhibit-tile--" + image.aspect;

      // Real photographs (see generate-gallery-data.js) carry their
      // own measured aspectRatio — set inline so it overrides the
      // fixed-ratio keyword class above, sizing the tile to the
      // photo's true proportions instead of a preset crop box.
      // Collections still on placeholders have no aspectRatio field,
      // so they're completely unaffected and keep the keyword-cycled
      // masonry rhythm as before.
      if (image.aspectRatio) {
        tile.classList.add("exhibit-tile--natural");
        tile.style.aspectRatio = image.aspectRatio;
      }
    }

    tile.setAttribute("data-collection", collectionId);
    tile.setAttribute("data-global-index", String(globalIndex));
    tile.setAttribute(
      "aria-label",
      "Open image " + (globalIndex + 1) + " in " + collectionId.replace(/-/g, " ")
    );

    if (image.src) {
      var img = document.createElement("img");
      img.src = image.src;
      img.alt = image.alt || "";
      img.loading = "lazy";
      tile.appendChild(img);
    } else {
      var placeholder = document.createElement("span");
      placeholder.className = "exhibit-tile-placeholder";

      var index = document.createElement("span");
      index.className = "exhibit-tile-index";
      index.textContent = String(globalIndex + 1).padStart(3, "0");

      placeholder.appendChild(index);
      tile.appendChild(placeholder);
    }

    tile.addEventListener("click", function () {
      openLightbox(collectionId, globalIndex);
    });

    if (reduceMotion) {
      tile.classList.add("is-revealed");
    } else {
      revealObserver.observe(tile);
    }

    return tile;
  }

  function loadMore(collectionId) {
    var state = collectionState[collectionId];
    if (!state) return;

    var next = state.images.slice(state.rendered, state.rendered + BATCH_SIZE);
    if (!next.length) return;

    next.forEach(function (image, i) {
      var globalIndex = state.rendered + i;
      state.gridEl.appendChild(
        createTile(image, collectionId, globalIndex, state.mode)
      );
    });

    state.rendered += next.length;

    if (state.rendered >= state.images.length && state.sentinelObserver) {
      state.sentinelObserver.disconnect();
    }
  }


  /* ----------------------------------------
     COLLECTIONS

     buildCollectionSection() builds and wires up one collection
     (intro + grid + infinite scroll) but does NOT attach it anywhere
     — the caller decides where it lives. renderCollection() is the
     simple case (append straight into a root) — concerts.html uses
     this path via renderCollections(), since it has a single
     collection and no room switcher. rooms.js calls
     buildCollectionSection() directly, once per room panel, for
     photographs.html ("masonry" mode) and drawings.html ("editorial"
     mode).
  ---------------------------------------- */

  function buildCollectionSection(collection, mode) {
    var section = document.createElement("section");
    section.className =
      "exhibit-collection" +
      (collection.featured ? " exhibit-collection--featured" : "");
    section.id = "collection-" + collection.id;

    // Collections with no title skip the intro block entirely — used
    // by single-collection pages (Concerts) whose title/subtitle are
    // already shown once in the page's own .exhibit-header, so the
    // grid doesn't repeat them a second time.
    if (collection.title) {
      var intro = document.createElement("div");
      intro.className = "exhibit-collection-intro";

      var title = document.createElement("h2");
      title.className = "exhibit-collection-title";
      title.textContent = collection.title;

      var sentence = document.createElement("p");
      sentence.className = "exhibit-collection-sentence";
      sentence.textContent = collection.sentence;

      intro.appendChild(title);
      intro.appendChild(sentence);

      // Artwork count — editorial (Drawings) collections only, so the
      // Photographs masonry header is untouched.
      if (mode === "editorial" && collection.images && collection.images.length) {
        var count = document.createElement("p");
        count.className = "exhibit-collection-count";
        count.textContent =
          collection.images.length +
          (collection.images.length === 1 ? " work" : " works");
        intro.appendChild(count);
      }

      section.appendChild(intro);
    }

    if (collection.comingSoon || !collection.images.length) {
      var soon = document.createElement("p");
      soon.className = "exhibit-coming-soon";
      soon.textContent = "More to come.";
      section.appendChild(soon);
      return section;
    }

    var grid = document.createElement("div");
    grid.className = "exhibit-grid exhibit-grid--" + mode;
    section.appendChild(grid);

    var sentinel = document.createElement("div");
    sentinel.className = "exhibit-sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    section.appendChild(sentinel);

    collectionState[collection.id] = {
      images: collection.images,
      rendered: 0,
      gridEl: grid,
      mode: mode
    };

    loadMore(collection.id);

    var sentinelObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadMore(collection.id);
          }
        });
      },
      { rootMargin: "800px 0px" }
    );

    sentinelObserver.observe(sentinel);
    collectionState[collection.id].sentinelObserver = sentinelObserver;

    return section;
  }

  function renderCollection(collection, rootEl, mode) {
    rootEl.appendChild(buildCollectionSection(collection, mode));
  }


  /* ----------------------------------------
     LIGHTBOX
  ---------------------------------------- */

  var lightboxEl = null;
  var lightboxImg = null;
  var lightboxPlaceholder = null;
  var lightboxPlaceholderIndex = null;
  var lightboxCaption = null;
  var lightboxMeta = null;
  var lastFocusedTile = null;

  var currentCollection = null;
  var currentIndex = 0;
  var lightboxReady = false;

  function ensureRendered(collectionId, upToIndex) {
    var state = collectionState[collectionId];
    if (!state) return;
    while (state.rendered <= upToIndex && state.rendered < state.images.length) {
      loadMore(collectionId);
    }
  }

  function initLightbox() {
    if (lightboxReady) return;
    lightboxReady = true;

    lightboxEl = document.createElement("div");
    lightboxEl.className = "lightbox";
    lightboxEl.setAttribute("aria-hidden", "true");
    lightboxEl.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Close">×</button>' +
      '<button type="button" class="lightbox-prev" aria-label="Previous image">←</button>' +
      '<div class="lightbox-stage">' +
      '<img class="lightbox-image" alt="">' +
      '<span class="lightbox-placeholder"><span class="lightbox-placeholder-index"></span></span>' +
      "</div>" +
      '<button type="button" class="lightbox-next" aria-label="Next image">→</button>' +
      '<p class="lightbox-meta"></p>' +
      '<p class="lightbox-caption"></p>';

    document.body.appendChild(lightboxEl);

    lightboxImg = lightboxEl.querySelector(".lightbox-image");
    lightboxPlaceholder = lightboxEl.querySelector(".lightbox-placeholder");
    lightboxPlaceholderIndex = lightboxEl.querySelector(
      ".lightbox-placeholder-index"
    );
    lightboxMeta = lightboxEl.querySelector(".lightbox-meta");
    lightboxCaption = lightboxEl.querySelector(".lightbox-caption");

    lightboxEl
      .querySelector(".lightbox-close")
      .addEventListener("click", closeLightbox);
    lightboxEl
      .querySelector(".lightbox-prev")
      .addEventListener("click", function () {
        step(-1);
      });
    lightboxEl
      .querySelector(".lightbox-next")
      .addEventListener("click", function () {
        step(1);
      });

    lightboxEl.addEventListener("click", function (event) {
      if (event.target === lightboxEl) closeLightbox();
    });

    document.addEventListener("keydown", function (event) {
      if (!lightboxEl.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    });
  }

  function openLightbox(collectionId, index) {
    currentCollection = collectionId;
    currentIndex = index;
    lastFocusedTile = document.activeElement;

    showCurrent();

    lightboxEl.classList.add("is-open");
    lightboxEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");

    requestAnimationFrame(function () {
      lightboxEl.classList.add("is-visible");
    });

    lightboxEl.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    lightboxEl.classList.remove("is-visible");
    document.body.classList.remove("lightbox-open");

    window.setTimeout(
      function () {
        lightboxEl.classList.remove("is-open");
        lightboxEl.setAttribute("aria-hidden", "true");
        if (lastFocusedTile) lastFocusedTile.focus();
      },
      reduceMotion ? 0 : 400
    );
  }

  function step(direction) {
    var state = collectionState[currentCollection];
    if (!state) return;

    var total = state.images.length;
    currentIndex = (currentIndex + direction + total) % total;
    ensureRendered(currentCollection, currentIndex);
    showCurrent();
  }

  function showCurrent() {
    var state = collectionState[currentCollection];
    if (!state) return;
    var image = state.images[currentIndex];

    if (image.src) {
      lightboxImg.src = image.src;
      lightboxImg.alt = image.alt || "";
      lightboxImg.style.display = "block";
      lightboxPlaceholder.style.display = "none";
    } else {
      lightboxImg.style.display = "none";
      lightboxImg.removeAttribute("src");
      lightboxPlaceholder.style.display = "flex";
      lightboxPlaceholderIndex.textContent = String(currentIndex + 1).padStart(
        3,
        "0"
      );
    }

    lightboxCaption.textContent =
      currentIndex + 1 + " / " + state.images.length;

    // Metadata line — title / year / medium, each part optional.
    // Left empty (and so hidden via CSS :empty) when an artwork
    // carries none of these, which is the case for every placeholder
    // image and for all Photographs data today.
    var metaParts = [];
    if (image.title) metaParts.push(image.title);
    if (image.year) metaParts.push(String(image.year));
    if (image.medium) metaParts.push(image.medium);
    lightboxMeta.textContent = metaParts.join(" · ");
  }


  /* ----------------------------------------
     PUBLIC API
  ---------------------------------------- */

  window.TowardsWonderGallery = {
    // Vertical stack of every collection in `data`, all appended into
    // one root. Used by concerts.html, which has no subcategories and
    // so needs no room switcher — just its one collection's grid.
    // Photographs and Drawings still use the room switcher instead.
    renderCollections: function (data, rootSelector, mode) {
      var rootEl = document.querySelector(rootSelector);
      if (!rootEl || !data || !data.collections) return;

      initLightbox();

      data.collections.forEach(function (collection) {
        renderCollection(collection, rootEl, mode);
      });
    },

    // Builds one collection's section (intro + grid + infinite scroll)
    // without attaching it anywhere, so a caller like rooms.js can
    // place it inside its own panel. Also ensures the lightbox exists,
    // since a page using only this entry point never calls
    // renderCollections().
    buildCollectionSection: function (collection, mode) {
      initLightbox();
      return buildCollectionSection(collection, mode);
    },

    isLightboxOpen: function () {
      return !!lightboxEl && lightboxEl.classList.contains("is-open");
    }
  };
})();
