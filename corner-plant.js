/* ========================================
   EASTER EGG — CORNER PLANT (homepage only)

   Isolated, reusable script — included only on index.html via
   <script src="corner-plant.js">. Builds its own markup, so nothing
   needs to be hand-written into index.html for it. Optionally
   cooperates with cursor.js (see "SEED CURSOR" below) but degrades
   quietly if that script isn't present or is disabled on this
   device — nothing here depends on it.

   EDIT POINTS in this file:
   - NEAR_RADIUS_PX        how close the cursor must come, in pixels,
                           before the leaves react at all. The bud
                           glow (once grown) reuses this same radius
                           — see "BUD GLOW" below — rather than
                           requiring the cursor to precisely hit the
                           3–4px dot.
   - MAX_TILT_DEG          how far a leaf can tilt at its most extreme.
   - GROW_DWELL_MS         bud growth delay — how long the cursor
                           must stay near, continuously, before the
                           bud grows in.
   - BUD_GLOW_ENTER_MS,
     BUD_GLOW_EXIT_MS      how long the halo takes to reveal itself
                           on approach vs. fade out on leaving.
   - BUD_GLOW_MAX_OPACITY  halo opacity at closest range.
   - BUD_REST_OPACITY,
     BUD_BRIGHTEN_MAX      the dot's own opacity at rest, and how much
                           brighter (not bigger) it gets at closest
                           range.
   - MESSAGES              the pool of strings hovering can reveal, in
                           the fixed order they're shown — see "HOVER
                           MESSAGE" below.
   - EXIT_DELAY_MS         how long to wait, after the pointer leaves,
                           before the message starts fading out (lets
                           a brief accidental leave-and-return not
                           count).
   - EXIT_FADE_MS          how long that fade-out itself takes.

   Bud size/position live in this file's markup (see the EDIT POINT
   comment above the bud's two <circle>s). Colour, stroke weight, and
   the halo's blur radius live in style.css → "EASTER EGG — CORNER
   PLANT" section.
======================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;


  /* ----------------------------------------
     MARKUP
  ---------------------------------------- */

  var plant = document.createElement("div");
  plant.className = "corner-plant";
  plant.setAttribute("aria-hidden", "true");

  // Paths are deliberately not perfectly straight/mirrored — a very
  // slight bow in the stem and two differently-sized, differently-
  // curved leaves, so the plant reads as hand-drawn rather than a
  // geometric construction. Both ends of the stem are pinned to
  // exactly the same coordinates as before ((32, 84) at the base and
  // (32, 24) at the top) so nothing about the stem/leaves needed to
  // change here.
  plant.innerHTML =
    '<svg class="corner-plant-svg" viewBox="0 0 64 88">' +
      '<path class="plant-stem" d="M32 84 C 34 68, 29 46, 32 24" />' +
      '<path class="plant-leaf plant-leaf-left" d="M32 62 C 22 59, 14 52, 16 44" />' +
      '<path class="plant-leaf plant-leaf-right" d="M32 42 C 48 38, 58 26, 50 12" />' +
      // EDIT POINT — bud position/size. A tiny circular growth point
      // (not an oval/leaf/seed shape) sitting exactly at the apical
      // tip of the stem: cy + r = 24, matching the stem path's own
      // top endpoint above, so the stem visually terminates at the
      // dot's centre-bottom rather than beside it. ~4.4 units (px)
      // in diameter. The halo shares the dot's centre, invisible at
      // rest — see "BUD GLOW" below for how it's revealed and grows.
      '<g class="plant-bud" aria-hidden="true">' +
        '<circle class="plant-bud-halo" cx="32" cy="21.8" r="3.2" />' +
        '<circle class="plant-bud-dot" cx="32" cy="21.8" r="2.2" />' +
      "</g>" +
    "</svg>" +
    '<p class="corner-plant-message"></p>';

  document.body.appendChild(plant);

  var leafLeft = plant.querySelector(".plant-leaf-left");
  var leafRight = plant.querySelector(".plant-leaf-right");
  var budEl = plant.querySelector(".plant-bud");
  var budHalo = plant.querySelector(".plant-bud-halo");
  var budDot = plant.querySelector(".plant-bud-dot");
  var messageEl = plant.querySelector(".corner-plant-message");


  /* ----------------------------------------
     PROXIMITY — tilt the leaves toward the cursor when it wanders
     close, and start the growth dwell timer. Throttled to one check
     per animation frame regardless of how often pointermove fires.
  ---------------------------------------- */

  // EDIT POINT — how close (in pixels, from the plant's leaf centre)
  // counts as "near enough" to react at all.
  var NEAR_RADIUS_PX = 150;

  // EDIT POINT — the largest angle a leaf is allowed to tilt to.
  var MAX_TILT_DEG = 26;

  // EDIT POINT — bud growth delay: how long the cursor must stay
  // inside NEAR_RADIUS_PX, continuously, before the bud is allowed
  // to grow in. Runs under reduced motion too (see growBud() below)
  // — only the reveal's own animation is skipped there, not the
  // dwell wait itself.
  var GROW_DWELL_MS = 1800;

  // EDIT POINTS — bud glow, once grown. Deliberately reuses this
  // same NEAR_RADIUS_PX/`near`/`strength` the leaf tilt above
  // already computes, rather than a separate tighter zone around the
  // bud itself — so the cursor never has to precisely hit a 3–4px
  // target, just be generally near the plant.
  var BUD_GLOW_ENTER_MS = 600; // transition-in duration (halo appearing)
  var BUD_GLOW_EXIT_MS = 850; // transition-out duration (halo fading away)
  var BUD_GLOW_MAX_OPACITY = 0.22; // halo opacity at closest range
  var BUD_GLOW_MIN_SCALE = 0.6; // halo's own size just as it starts appearing
  var BUD_GLOW_MAX_SCALE = 1.5; // halo's own size at closest range — this (not the dot) is what visibly grows
  var BUD_REST_OPACITY = 0.85; // the dot's own opacity at rest
  var BUD_BRIGHTEN_MAX = 0.12; // how much brighter the dot gets at closest range — small, so it reads as a subtle brighten, not a size change

  var isNear = false;
  var growTimer = null;
  var hasGrown = false;
  var latestPointer = null;
  var frameScheduled = false;

  function plantLeafCenter() {
    var rect = plant.getBoundingClientRect();
    return {
      // Roughly where the leaves sit, not the base of the stem —
      // tilting reacts to the cursor near the leaves themselves.
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height * 0.32
    };
  }

  function updateProximity() {
    frameScheduled = false;
    if (!latestPointer) return;

    var center = plantLeafCenter();
    var dx = latestPointer.x - center.x;
    var dy = latestPointer.y - center.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var near = distance < NEAR_RADIUS_PX;
    // How close within the radius, 0 (edge) to 1 (dead centre) — the
    // leaf tilt below already needed this; the bud glow now reuses
    // the exact same value, so both respond to one shared sense of
    // "how near is the cursor to the plant".
    var strength = near ? 1 - distance / NEAR_RADIUS_PX : 0;

    // Optional detail — let the custom cursor visually resemble a
    // seed while it lingers near the plant. No-op if cursor.js isn't
    // present (touch devices, reduced motion elsewhere, etc.).
    if (window.TowardsWonderCursor) {
      window.TowardsWonderCursor.setSeedMode(near);
    }

    if (near) {
      if (!isNear) {
        isNear = true;
        plant.classList.add("is-near");

        // Dwell timer — only starts once per approach, and only if
        // the bud hasn't already grown this page load. A real
        // setTimeout, not rAF-driven, so it fires on schedule even
        // if the cursor then holds perfectly still (no further
        // pointermove events to re-trigger this check). Runs under
        // reduced motion too — growBud() itself just skips the
        // animated reveal in that case, it doesn't skip growing.
        if (!hasGrown && !growTimer) {
          growTimer = window.setTimeout(growBud, GROW_DWELL_MS);
        }

        // Entering the radius — use the shorter "revealing" duration
        // for whatever glow change happens next this approach.
        if (hasGrown && !reduceMotion) {
          budHalo.style.transitionDuration = BUD_GLOW_ENTER_MS + "ms";
          budDot.style.transitionDuration = BUD_GLOW_ENTER_MS + "ms";
        }
      }

      if (!reduceMotion) {
        // Tilt eases out toward the edge of the radius and peaks at
        // MAX_TILT_DEG right next to the plant; direction follows
        // which side the cursor is on.
        var direction = Math.max(-1, Math.min(1, dx / NEAR_RADIUS_PX));
        var angle = direction * MAX_TILT_DEG * strength;

        leafLeft.style.transform = "rotate(" + angle + "deg)";
        leafRight.style.transform = "rotate(" + angle + "deg)";

        // Bud glow — only once grown. The halo grows both brighter
        // (opacity) and visibly larger (scale) with proximity, so
        // "near" and "very near" read as distinctly different —
        // matching the soft-point-of-light-becoming-visible feel.
        // The dot itself only gets a slight brighten, never scales,
        // so it never looks like it's enlarging.
        if (hasGrown) {
          var haloScale =
            BUD_GLOW_MIN_SCALE +
            (BUD_GLOW_MAX_SCALE - BUD_GLOW_MIN_SCALE) * strength;

          budHalo.style.opacity = (BUD_GLOW_MAX_OPACITY * strength).toFixed(2);
          budHalo.style.transform = "scale(" + haloScale.toFixed(2) + ")";
          budDot.style.opacity = (
            BUD_REST_OPACITY + BUD_BRIGHTEN_MAX * strength
          ).toFixed(2);
        }
      }
    } else if (isNear) {
      isNear = false;
      plant.classList.remove("is-near");
      leafLeft.style.transform = "";
      leafRight.style.transform = "";

      // Leaving before the dwell completes cancels and resets the
      // timer — the next approach starts the full wait over again.
      if (growTimer) {
        window.clearTimeout(growTimer);
        growTimer = null;
      }

      // Leaving the radius — switch to the longer "fading out"
      // duration before dropping the glow back to its resting state.
      if (hasGrown && !reduceMotion) {
        budHalo.style.transitionDuration = BUD_GLOW_EXIT_MS + "ms";
        budDot.style.transitionDuration = BUD_GLOW_EXIT_MS + "ms";
        budHalo.style.opacity = "0";
        budHalo.style.transform = "scale(" + BUD_GLOW_MIN_SCALE.toFixed(2) + ")";
        budDot.style.opacity = BUD_REST_OPACITY.toFixed(2);
      }
    }
  }

  // Reveals the bud once, ever, per page load — adding .is-grown is
  // permanent (nothing ever removes it), so the bud stays visible
  // even after the cursor wanders away. Under reduced motion this
  // still runs (see the dwell-timer condition above) but style.css's
  // reduced-motion override collapses the transition to 0.01ms, so
  // the bud simply appears rather than animating in — and its glow
  // is never engaged at all under reduced motion (see the
  // !reduceMotion guards above), so it just rests quietly at
  // BUD_REST_OPACITY.
  function growBud() {
    growTimer = null;
    hasGrown = true;
    budEl.classList.add("is-grown");
  }

  window.addEventListener(
    "pointermove",
    function (event) {
      latestPointer = { x: event.clientX, y: event.clientY };

      if (!frameScheduled) {
        frameScheduled = true;
        requestAnimationFrame(updateProximity);
      }
    },
    { passive: true }
  );


  /* ----------------------------------------
     HOVER MESSAGE — shown automatically while the pointer is over
     the plant (no click needed), cycling through MESSAGES in a
     fixed order rather than randomly. One reusable element, never
     stacked or re-triggered mid-hover.

     Uses pointerenter/pointerleave (not CSS :hover, not
     mouseover/out) on the shared .corner-plant container — those
     events fire only when the pointer actually crosses into or out
     of the container's whole hit region, not for every sub-element
     boundary crossed inside it. Since .corner-plant-message is a
     descendant of .corner-plant and becomes pointer-events: auto
     once visible (see style.css), moving from the plant up onto the
     message stays "entered" the whole time — no flicker.
  ---------------------------------------- */

  // EDIT POINT — the pool of messages hovering can reveal, shown in
  // this exact order (not randomly), looping back to the first
  // after the last.
  var MESSAGES = [
    "You found a quiet corner.",
    "Stay curious.",
    "Something small is growing.",
    "Where will you wander next?"
  ];

  // EDIT POINT — after the pointer leaves, how long to wait before
  // starting the fade-out. A short accidental leave-and-return
  // inside this window is treated as still one continuous hover.
  var EXIT_DELAY_MS = 300;

  // EDIT POINT — how long the fade-out itself takes once it starts.
  var EXIT_FADE_MS = 850;

  var messageIndex = 0;
  var exitDelayTimer = null;
  var advanceTimer = null;

  function showMessage() {
    // Cancel any pending hide/advance from a previous hover — this
    // also covers "re-entered while fading out": we simply stop the
    // fade (by re-adding .is-visible below) and never advance the
    // index, so the same message that was leaving reappears instead
    // of the next one.
    window.clearTimeout(exitDelayTimer);
    window.clearTimeout(advanceTimer);
    exitDelayTimer = null;
    advanceTimer = null;

    // Reduced motion: leave transition-duration alone so the
    // stylesheet's own prefers-reduced-motion override (near-
    // instant) governs both directions, instead of this file's
    // explicit exit duration fighting it.
    if (!reduceMotion) {
      messageEl.style.transitionDuration = "";
    }

    messageEl.textContent = MESSAGES[messageIndex];
    messageEl.classList.add("is-visible");
  }

  function scheduleHide() {
    exitDelayTimer = window.setTimeout(function () {
      exitDelayTimer = null;

      if (!reduceMotion) {
        messageEl.style.transitionDuration = EXIT_FADE_MS + "ms";
      }
      messageEl.classList.remove("is-visible");

      // The index only advances once this hover has fully finished
      // — pointer left, delay elapsed, fade-out complete — never
      // while still hovering or mid-cancel.
      advanceTimer = window.setTimeout(
        function () {
          advanceTimer = null;
          messageIndex = (messageIndex + 1) % MESSAGES.length;
        },
        reduceMotion ? 0 : EXIT_FADE_MS
      );
    }, EXIT_DELAY_MS);
  }

  plant.addEventListener("pointerenter", showMessage);
  plant.addEventListener("pointerleave", scheduleHide);
})();
