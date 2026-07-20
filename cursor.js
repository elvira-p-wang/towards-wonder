/* ========================================
   CUSTOM CURSOR

   Isolated, reusable script — included on every page of the site via
   <script src="cursor.js"> (or "../cursor.js" from a subdirectory).
   Touches nothing outside the elements it creates itself; safe to
   drop onto any page unmodified.

   EDIT POINTS in this file:
   - INTERACTIVE_SELECTOR   which elements trigger the enlarged hover
                            state (kept tag/role-based, not tied to
                            any page's specific class names, so this
                            file needs no changes when new pages or
                            components are added).
   - isRestrained           which pages get the smaller, quieter hover
                            state (long-form reading pages, so the
                            cursor never competes with body text).
   - TRAIL_EASE             how much the cursor lags behind the real
                            pointer (0–1; lower = more trailing delay).

   Size, colour, opacity and the hover/press easing curves themselves
   live in style.css → "CUSTOM CURSOR" section, as CSS custom
   properties — edit them there.
======================================== */

(function () {
  "use strict";

  // Only replace the cursor where a real mouse/trackpad is present.
  // Touch devices keep the native cursor entirely — nothing here
  // runs for them.
  var supportsCustomCursor = window.matchMedia(
    "(pointer: fine) and (hover: hover)"
  ).matches;

  if (!supportsCustomCursor) return;

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // EDIT POINT — selector for anything that should enlarge the
  // cursor on hover. Deliberately generic (tags/roles, not page-
  // specific classes like .pin or .exhibit-tile) since virtually
  // every clickable element on this site is already a native <a> or
  // <button>.
  var INTERACTIVE_SELECTOR =
    "a, button, input, textarea, select, summary, label, " +
    "[role='button'], [tabindex]:not([tabindex='-1'])";

  // EDIT POINT — long-form reading pages (essays, field notes) get a
  // smaller, quieter hover state via the .custom-cursor--restrained
  // modifier class, styled in style.css, so the cursor never
  // distracts from body text.
  var isRestrained =
    document.body.classList.contains("essay-page") ||
    document.body.classList.contains("field-note-page");


  /* ----------------------------------------
     MARKUP
     Two layers: an outer wrapper JS moves every frame via
     translate3d (no CSS transition on it — the lerp below already
     smooths the motion), and an inner dot whose scale/opacity are
     controlled purely by CSS classes so their transitions (defined
     in style.css) animate independently and without fighting the
     per-frame position updates.
  ---------------------------------------- */

  var root = document.createElement("div");
  root.className =
    "custom-cursor" + (isRestrained ? " custom-cursor--restrained" : "");
  root.setAttribute("aria-hidden", "true");

  var dot = document.createElement("div");
  dot.className = "custom-cursor-dot";
  root.appendChild(dot);

  document.body.appendChild(root);
  document.documentElement.classList.add("custom-cursor-active");


  /* ----------------------------------------
     MOVEMENT — requestAnimationFrame + linear interpolation
  ---------------------------------------- */

  // EDIT POINT — trailing delay. 1 = no lag (snaps to the pointer),
  // smaller values trail further behind. Reduced-motion users get no
  // lag at all, since the interpolation itself is a motion effect.
  var TRAIL_EASE = reduceMotion ? 1 : 0.18;

  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var cursorX = pointerX;
  var cursorY = pointerY;
  var hasMoved = false;

  function onPointerMove(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (!hasMoved) {
      // Snap in on the first real movement instead of lerping in
      // from the viewport centre.
      cursorX = pointerX;
      cursorY = pointerY;
      hasMoved = true;
      root.classList.add("is-visible");
    }
  }

  function tick() {
    cursorX += (pointerX - cursorX) * TRAIL_EASE;
    cursorY += (pointerY - cursorY) * TRAIL_EASE;

    root.style.transform =
      "translate3d(" + cursorX + "px, " + cursorY + "px, 0)";

    requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  requestAnimationFrame(tick);

  // Fade out when the pointer leaves the viewport (e.g. into browser
  // chrome) and back in on return, so it never appears "stuck".
  document.addEventListener(
    "mouseleave",
    function () {
      root.classList.remove("is-visible");
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseenter",
    function () {
      if (hasMoved) root.classList.add("is-visible");
    },
    { passive: true }
  );


  /* ----------------------------------------
     HOVER STATE — delegated, so elements added later (infinite
     scroll batches, the lightbox, room-switcher panels) are picked
     up automatically with no extra wiring anywhere else.
  ---------------------------------------- */

  document.addEventListener(
    "pointerover",
    function (event) {
      if (event.target.closest && event.target.closest(INTERACTIVE_SELECTOR)) {
        dot.classList.add("is-hover");
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerout",
    function (event) {
      if (!event.target.closest || !event.target.closest(INTERACTIVE_SELECTOR)) {
        return;
      }

      // Moving between nested interactive elements (e.g. an icon
      // inside a link) shouldn't flicker the hover state off.
      var movingTo =
        event.relatedTarget &&
        event.relatedTarget.closest &&
        event.relatedTarget.closest(INTERACTIVE_SELECTOR);

      if (movingTo) return;

      dot.classList.remove("is-hover");
    },
    { passive: true }
  );


  /* ----------------------------------------
     PRESS STATE — brief shrink on mousedown, released on mouseup,
     returning to whatever hover state currently applies.
  ---------------------------------------- */

  document.addEventListener(
    "pointerdown",
    function () {
      dot.classList.add("is-pressed");
    },
    { passive: true }
  );

  ["pointerup", "pointercancel"].forEach(function (type) {
    document.addEventListener(
      type,
      function () {
        dot.classList.remove("is-pressed");
      },
      { passive: true }
    );
  });


  /* ----------------------------------------
     PUBLIC API — optional. Lets another isolated script (currently
     just corner-plant.js, homepage only) react to the cursor without
     reaching into its internals. Safe to ignore entirely; nothing in
     this file depends on anyone calling these.
  ---------------------------------------- */

  window.TowardsWonderCursor = {
    setSeedMode: function (isSeed) {
      dot.classList.toggle("is-seed", !!isSeed);
    }
  };
})();
