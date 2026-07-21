/* ========================================
   PIXEL FOX — interactive companion (all pages)

   Isolated, reusable script — included on every page via
   <script src="fox.js"> (or "../fox.js" from a subdirectory), the
   same site-wide pattern as cursor.js. Builds its own markup, so
   nothing needs to be hand-written into any page for it. Replaces
   the old homepage-only corner-plant Easter egg.

   Structure: one SVG built from flat, blocky shapes in the site's
   warm palette (see the --fox-* custom properties in style.css) —
   pixel-inspired rather than a literal frame-by-frame sprite sheet,
   animated entirely with CSS transforms/transitions driven by a
   small set of classes this file toggles. A single <p class=
   "fox-message"> sibling handles both the hover/click speech bubble
   and the smaller autonomous "thought" bubble.

   EDIT POINTS in this file:
   - SIT_DELAY_MS / LIE_DELAY_MS / SLEEP_DELAY_MS   inactivity
                             thresholds for the sit → lie down →
                             sleep progression (cumulative, from the
                             last time the page registered activity).
   - WAKE_STRETCH_MS        how long the stretch-before-standing
                             wake animation takes.
   - NEAR_WAKE_RADIUS_PX    how close the cursor must come to a
                             sleeping fox, in pixels, to wake it
                             (clicking it always wakes it too).
   - HOP_MS                 click/tap hop duration.
   - FLUFFY_MIN_CLICKS / FLUFFY_MAX_CLICKS / CLICK_WINDOW_MS /
     FLUFFY_DURATION_MS     the repeated-click "fluffy and confused"
                             reaction: a random threshold between
                             these two counts, within this rolling
                             window, triggers it; it calms back down
                             on its own after FLUFFY_DURATION_MS.
   - BLINK_MIN_MS / BLINK_MAX_MS / BLINK_DURATION_MS   idle blinking.
   - EAR_TWITCH_MIN_MS / EAR_TWITCH_MAX_MS / EAR_TWITCH_DURATION_MS
                             occasional single-ear twitches.
   - IDLE_AUTONOMY_MIN_MS / IDLE_AUTONOMY_MAX_MS   how often, while
                             fully idle and otherwise undisturbed,
                             the fox quietly looks around or shows a
                             tiny random thought bubble on its own.
   - DIALOGUE / RANDOM_THOUGHTS   the lines themselves, grouped by
                             page context; see "CONTEXT" below.

   Colour, size, and every animation curve/keyframe live in style.css
   → "PIXEL FOX COMPANION" section.
======================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;


  /* ----------------------------------------
     MARKUP
  ---------------------------------------- */

  var fox = document.createElement("div");
  fox.className = "pixel-fox";
  fox.setAttribute("aria-hidden", "true");
  fox.setAttribute("data-accessory", "none");

  fox.innerHTML =
    '<svg class="pixel-fox-svg" viewBox="0 0 40 44">' +
      '<ellipse class="fox-ground" cx="20" cy="41.5" rx="13" ry="2.2" />' +
      '<g class="fox-rig">' +

        // Tail — four chunky, only gently tapering blocks curling up
        // and out to the side, ending in a generously sized cream
        // tip — fluffy/bushy, not a thin sharp point. rx=0
        // throughout the fox, deliberately — true crisp pixel edges
        // rather than soft rounded blobs.
        '<g class="fox-tail">' +
          '<rect class="fox-fur" x="27" y="23" width="10" height="9" />' +
          '<rect class="fox-fur" x="30" y="15" width="9" height="9" />' +
          '<rect class="fox-fur" x="32" y="8" width="8" height="8" />' +
          '<rect class="fox-cream" x="32" y="2" width="7" height="7" />' +
        "</g>" +

        // Body — torso, a cream chest/belly patch that runs
        // continuously up into the face patch above, two front paws,
        // and the per-context accessory (tucked beside the right
        // paw, except the book, which sits centred between both).
        '<g class="fox-body">' +
          '<rect class="fox-fur" x="8" y="25" width="24" height="16" />' +
          '<rect class="fox-cream" x="13" y="25" width="14" height="13" />' +
          '<rect class="fox-cream" x="11" y="36" width="6" height="5" />' +
          '<rect class="fox-shadow" x="12" y="39.5" width="4" height="1.5" />' +
          '<rect class="fox-cream" x="23" y="36" width="6" height="5" />' +
          '<rect class="fox-shadow" x="24" y="39.5" width="4" height="1.5" />' +
          '<g class="fox-accessory">' +
            '<g class="fox-accessory-camera">' +
              '<rect class="fox-ink" x="23" y="33" width="8" height="6" />' +
              '<circle class="fox-fur-light" cx="27" cy="36" r="2" />' +
            "</g>" +
            // Book — centred between the two paws (x11-17 and
            // x23-29) but wider than the gap between them, so it
            // extends a little past each paw's outer edge, like an
            // open book actually being held rather than tucked
            // neatly inside the gap. Deliberately thin top-to-bottom
            // (4 tall vs. 22 wide) — a booklet resting flat on the
            // paws, not a thick tome.
            '<g class="fox-accessory-book">' +
              '<rect class="fox-cream" x="9" y="32" width="11" height="4" />' +
              '<rect class="fox-shadow" x="11" y="33" width="6" height="0.6" />' +
              '<rect class="fox-shadow" x="11" y="34.4" width="6" height="0.6" />' +
              '<rect class="fox-cream" x="20" y="32" width="11" height="4" />' +
              '<rect class="fox-shadow" x="23" y="33" width="6" height="0.6" />' +
              '<rect class="fox-shadow" x="23" y="34.4" width="6" height="0.6" />' +
              '<rect class="fox-shadow" x="19.5" y="32" width="1" height="4" />' +
            "</g>" +
            // Compass — outer casing ring, lighter face, a two-tone
            // N/S needle (dark tip pointing north, light tip
            // pointing south, like a real compass needle) with a
            // small pivot dot at centre, plus four cardinal tick
            // marks on the rim — reads as an actual compass rather
            // than a circle with a plus sign through it.
            '<g class="fox-accessory-compass">' +
              '<circle class="fox-shadow" cx="27" cy="36" r="4.5" />' +
              '<circle class="fox-cream" cx="27" cy="36" r="3.5" />' +
              '<rect class="fox-shadow" x="26.7" y="32.3" width="0.6" height="1" />' +
              '<rect class="fox-shadow" x="26.7" y="38.7" width="0.6" height="1" />' +
              '<rect class="fox-shadow" x="30.2" y="35.7" width="1" height="0.6" />' +
              '<rect class="fox-shadow" x="22.8" y="35.7" width="1" height="0.6" />' +
              '<path class="fox-ink" d="M27 32.7 L28.2 36 L25.8 36 Z" />' +
              '<path class="fox-fur-light" d="M27 39.3 L28.2 36 L25.8 36 Z" />' +
              '<circle class="fox-shadow" cx="27" cy="36" r="0.5" />' +
            "</g>" +
            '<g class="fox-accessory-envelope">' +
              '<rect class="fox-cream" x="22" y="33" width="9" height="6" />' +
              '<path class="fox-envelope-flap" d="M22 33 L26.5 36.4 L31 33" />' +
            "</g>" +
          "</g>" +
        "</g>" +

        // Head — three-step tapered ears (each independently
        // twitchable) with a deeper-tone tip, a wide cream "shield"
        // covering both cheeks and the chin (the fox's face marking,
        // not just a small muzzle patch), eyes, nose, plus the
        // hidden-by-default fluff tufts and "?" shown only during
        // the fluffy/confused reaction.
        '<g class="fox-head">' +
          '<g class="fox-ear-left">' +
            '<rect class="fox-fur" x="7" y="7" width="7" height="3" />' +
            '<rect class="fox-fur" x="8" y="4" width="5" height="3" />' +
            '<rect class="fox-fur-deep" x="9" y="1" width="3" height="3" />' +
            '<rect class="fox-fur-light" x="9" y="5" width="3" height="4" />' +
          "</g>" +
          '<g class="fox-ear-right">' +
            '<rect class="fox-fur" x="26" y="7" width="7" height="3" />' +
            '<rect class="fox-fur" x="27" y="4" width="5" height="3" />' +
            '<rect class="fox-fur-deep" x="28" y="1" width="3" height="3" />' +
            '<rect class="fox-fur-light" x="28" y="5" width="3" height="4" />' +
          "</g>" +
          '<rect class="fox-fur" x="6" y="9" width="28" height="17" />' +
          '<g class="fox-fluff">' +
            '<circle class="fox-fur-light" cx="7" cy="11" r="1.8" />' +
            '<circle class="fox-fur-light" cx="33" cy="11" r="1.8" />' +
            '<circle class="fox-fur-light" cx="4" cy="18" r="1.8" />' +
            '<circle class="fox-fur-light" cx="36" cy="18" r="1.8" />' +
            '<circle class="fox-fur-light" cx="10" cy="6" r="1.6" />' +
            '<circle class="fox-fur-light" cx="30" cy="6" r="1.6" />' +
          "</g>" +
          // Face patch runs from the nose's own top edge (nose sits
          // right at the patch's top, not above it in the fur) down
          // to the head's own bottom edge, so it reads as continuous
          // with the body's chest patch (which starts 1 unit higher,
          // at the body's top) — one unbroken white marking from
          // muzzle to chest.
          '<rect class="fox-cream" x="10" y="19" width="20" height="7" />' +
          '<g class="fox-eyes">' +
            '<rect class="fox-ink" x="13" y="15" width="3" height="3" />' +
            '<rect class="fox-ink" x="24" y="15" width="3" height="3" />' +
          "</g>" +
          '<rect class="fox-ink" x="18" y="19" width="4" height="2" />' +
          // Round black-framed glasses — hidden by default (see
          // .fox-glasses in CSS), shown only for Projects/About Me.
          // Deliberately oversized (13 diameter, well over 4x the
          // eyes' own 3-unit size) for a cute, slightly nerdy
          // look — open rings (fill: none) centred on each eye so
          // the eye pixels themselves stay untouched and still show
          // through, overlapping in the middle where a short bridge
          // sits, plus two short temple stubs at the outer edges.
          '<g class="fox-glasses">' +
            '<circle class="fox-glasses-lens" cx="14" cy="16.5" r="4.3" />' +
            '<circle class="fox-glasses-lens" cx="26" cy="16.5" r="4.3" />' +
            '<rect class="fox-ink" x="19" y="16" width="2" height="1" />' +
            '<rect class="fox-ink" x="6" y="16" width="4" height="1" />' +
            '<rect class="fox-ink" x="30" y="16" width="4" height="1" />' +
          "</g>" +
          '<text class="fox-question" x="20" y="-1">?</text>' +
        "</g>" +

        // Thinking paw — hidden by default (see .fox-chin-paw in
        // CSS), shown alongside the glasses for Projects/About Me:
        // a paw propped against the chin/cheek, overlapping down
        // into the shoulder so it reads as connected to the body
        // rather than floating. Painted after the head so it sits
        // on top of both head and body.
        '<g class="fox-chin-paw">' +
          '<rect class="fox-cream" x="22" y="22" width="5" height="6" />' +
          '<rect class="fox-shadow" x="23" y="27" width="3" height="1" />' +
        "</g>" +

        // Sleep "z"s and click sparkles — hidden until their state
        // classes are added below.
        '<g class="fox-zzz">' +
          '<text x="27" y="6" font-size="4">z</text>' +
          '<text x="31" y="1" font-size="5.5">z</text>' +
          '<text x="35.5" y="-4" font-size="7">z</text>' +
        "</g>" +
        '<text class="fox-sparkle fox-sparkle-a" x="4" y="18">+</text>' +
        '<text class="fox-sparkle fox-sparkle-b" x="35" y="14">+</text>' +
      "</g>" +
    "</svg>" +
    '<p class="fox-message" aria-hidden="true"></p>';

  document.body.appendChild(fox);

  var head = fox.querySelector(".fox-head");
  var earLeft = fox.querySelector(".fox-ear-left");
  var earRight = fox.querySelector(".fox-ear-right");
  var eyes = fox.querySelector(".fox-eyes");
  var messageEl = fox.querySelector(".fox-message");


  /* ----------------------------------------
     CONTEXT — which page (or, on the single-page home, which
     section) the fox is currently keeping company with. Drives both
     the accessory shown near its paw and which pool of dialogue
     lines it draws from.
  ---------------------------------------- */

  var ACCESSORY_BY_CONTEXT = {
    home: "none",
    about: "none",
    gallery: "camera",
    essay: "book",
    map: "compass",
    contact: "envelope"
  };

  // EDIT POINT — dialogue lines, grouped by context, shown on hover
  // (desktop) or tap (touch) and on click.
  var DIALOGUE = {
    home: ["hi there!", "welcome back."],
    gallery: ["hold still...", "what a view."],
    essay: ["one more page.", "worth keeping."],
    map: ["where next?", "let's go."],
    about: ["good to see you here.", "stay curious."],
    contact: ["hello!", "drop a note?"]
  };

  // EDIT POINT — the pool a quiet, unprompted thought bubble draws
  // from, shown occasionally on its own (see "AUTONOMOUS IDLE
  // BEHAVIOUR" below) — deliberately smaller/vaguer than the
  // context dialogue above.
  var RANDOM_THOUGHTS = ["just exploring.", "hmm...", "quiet here.", "..."];

  var staticContext = (function () {
    var body = document.body;
    if (body.classList.contains("gallery-page")) return "gallery";
    if (
      body.classList.contains("essay-page") ||
      body.classList.contains("field-note-page")
    ) {
      return "essay";
    }
    return "home";
  })();

  var context = staticContext;

  function setContext(next) {
    if (next === context) return;
    context = next;
    fox.setAttribute("data-accessory", ACCESSORY_BY_CONTEXT[next] || "none");
    fox.classList.toggle("is-about", next === "about");
  }

  setContext(staticContext);

  // On the single-page home, refine context further by which
  // section is actually in view — Map gets its compass, Contact its
  // envelope, About its quieter pose, Essays and Field Notes both
  // get the book (and the essay dialogue pool) same as the standalone
  // essay/field-note pages, everything else the plain default. Only
  // wired up when those section ids actually exist on the page, so
  // this is a no-op everywhere else.
  if (staticContext === "home" && "IntersectionObserver" in window) {
    var sectionContexts = [
      { id: "map", ctx: "map" },
      { id: "gallery", ctx: "gallery" },
      { id: "essays", ctx: "essay" },
      { id: "discoveries", ctx: "essay" },
      { id: "projects", ctx: "about" },
      { id: "about-me", ctx: "about" },
      { id: "contact", ctx: "contact" }
    ].filter(function (entry) {
      return document.getElementById(entry.id);
    });

    if (sectionContexts.length) {
      // Tracks each section's own currently-visible pixel height,
      // persisted across callbacks — not just whichever entries
      // happened to cross a threshold in this particular batch (an
      // IntersectionObserver callback only ever reports the
      // sections whose ratio just crossed a threshold, not the full
      // set being observed, so recomputing "best" from only that
      // batch loses track of sections — like Map, which is taller
      // than the viewport — that are still genuinely on screen but
      // didn't fire this time).
      //
      // Comparing raw intersectionRatio (visible area ÷ the
      // section's *own* total area) also unfairly penalises a tall
      // section like Map: once it's scrolled to fully fill the
      // viewport, only a small fraction of its own great height is
      // "visible" by that ratio, so a short section peeking in at
      // the edge can outrank it. Comparing visible pixel height
      // instead treats every section fairly regardless of how tall
      // it is.
      var visiblePx = {};
      sectionContexts.forEach(function (entry) {
        visiblePx[entry.id] = 0;
      });

      function pickBestSection() {
        var bestId = null;
        var bestPx = 0;
        sectionContexts.forEach(function (entry) {
          var px = visiblePx[entry.id] || 0;
          if (px > bestPx) {
            bestPx = px;
            bestId = entry.id;
          }
        });

        if (!bestId) {
          setContext("home");
          return;
        }

        var match = sectionContexts.filter(function (entry) {
          return entry.id === bestId;
        })[0];

        setContext(match ? match.ctx : "home");
      }

      var sectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var match = sectionContexts.filter(function (s) {
              return document.getElementById(s.id) === entry.target;
            })[0];
            if (!match) return;

            visiblePx[match.id] = entry.isIntersecting
              ? entry.intersectionRect.height
              : 0;
          });

          pickBestSection();
        },
        { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }
      );

      sectionContexts.forEach(function (entry) {
        sectionObserver.observe(document.getElementById(entry.id));
      });
    }
  }

  var lastLine = null;
  function pickLine(pool) {
    if (pool.length === 1) return pool[0];
    var line;
    do {
      line = pool[Math.floor(Math.random() * pool.length)];
    } while (line === lastLine);
    lastLine = line;
    return line;
  }


  /* ----------------------------------------
     MESSAGE BUBBLE — one element, reused for the hover/click speech
     bubble and the smaller autonomous thought bubble (".is-thought").
  ---------------------------------------- */

  var hideTimer = null;

  function showMessage(text, isThought) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
    messageEl.classList.toggle("is-thought", !!isThought);
    messageEl.textContent = text;
    // Force a reflow so re-showing the same text still restarts the
    // opacity/transform transition rather than being a no-op.
    void messageEl.offsetWidth;
    messageEl.classList.add("is-visible");
  }

  function hideMessage() {
    messageEl.classList.remove("is-visible");
  }

  function scheduleHide(delay) {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideMessage, delay);
  }

  // EDIT POINT — how long a click/tap dialogue line and an
  // autonomous thought bubble stay up before fading on their own
  // (hover dialogue instead hides shortly after the pointer leaves).
  var CLICK_DIALOGUE_MS = 2200;
  var THOUGHT_MS = 2600;
  var HOVER_EXIT_DELAY_MS = 260;


  /* ----------------------------------------
     POSE — idle → sitting → lying → sleeping, all the way back to
     idle via a stretch-then-stand wake. Cumulative inactivity
     thresholds, reset by real page activity (mouse/keyboard/scroll)
     while awake; once asleep, only approaching the fox or clicking
     it wakes it — incidental activity elsewhere on the page no
     longer counts, so a truly sleeping fox isn't startled by it.
  ---------------------------------------- */

  // EDIT POINTS — inactivity → sleep-cycle timing.
  var SIT_DELAY_MS = 20000;
  var LIE_DELAY_MS = 40000;
  var SLEEP_DELAY_MS = 60000;
  var WAKE_STRETCH_MS = 820;
  var NEAR_WAKE_RADIUS_PX = 140;

  var POSE_CLASSES = ["is-idle", "is-sitting", "is-lying", "is-sleeping", "is-waking"];
  var pose = "idle";
  var sitTimer = null;
  var lieTimer = null;
  var sleepTimer = null;
  var wakeTimer = null;

  function setPose(next) {
    if (next === pose) return;
    for (var i = 0; i < POSE_CLASSES.length; i++) {
      fox.classList.remove(POSE_CLASSES[i]);
    }
    fox.classList.add("is-" + next);
    pose = next;
  }

  function clearPoseTimers() {
    window.clearTimeout(sitTimer);
    window.clearTimeout(lieTimer);
    window.clearTimeout(sleepTimer);
    sitTimer = lieTimer = sleepTimer = null;
  }

  function scheduleSleepCycle() {
    clearPoseTimers();
    sitTimer = window.setTimeout(function () {
      setPose("sitting");
    }, SIT_DELAY_MS);
    lieTimer = window.setTimeout(function () {
      setPose("lying");
    }, LIE_DELAY_MS);
    sleepTimer = window.setTimeout(function () {
      setPose("sleeping");
    }, SLEEP_DELAY_MS);
  }

  function wakeUp() {
    if (pose === "sitting" || pose === "lying") {
      setPose("idle");
      scheduleSleepCycle();
      return;
    }
    if (pose !== "sleeping") return;

    clearPoseTimers();
    setPose("waking");
    window.clearTimeout(wakeTimer);
    wakeTimer = window.setTimeout(
      function () {
        setPose("idle");
        scheduleSleepCycle();
      },
      reduceMotion ? 10 : WAKE_STRETCH_MS
    );
  }

  // General page activity nudges the sleep cycle back while awake;
  // once asleep it's deliberately ignored (see wakeUp()/proximity
  // check below) so only direct attention wakes the fox.
  var lastActivityAt = 0;
  function registerActivity() {
    var now = Date.now();
    if (now - lastActivityAt < 500) return;
    lastActivityAt = now;

    if (pose === "sitting" || pose === "lying") {
      setPose("idle");
      scheduleSleepCycle();
    } else if (pose === "idle") {
      scheduleSleepCycle();
    }
  }

  ["pointermove", "keydown", "wheel", "scroll", "click"].forEach(function (type) {
    window.addEventListener(type, registerActivity, { passive: true });
  });

  // Cursor-proximity wake — only relevant while sleeping. Reuses one
  // rAF-throttled pointermove listener regardless of how often the
  // event fires.
  var latestPointer = null;
  var proximityFrameScheduled = false;

  function checkProximity() {
    proximityFrameScheduled = false;
    if (!latestPointer || pose !== "sleeping") return;

    var rect = fox.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = latestPointer.x - cx;
    var dy = latestPointer.y - cy;

    if (Math.sqrt(dx * dx + dy * dy) < NEAR_WAKE_RADIUS_PX) {
      wakeUp();
    }
  }

  window.addEventListener(
    "pointermove",
    function (event) {
      latestPointer = { x: event.clientX, y: event.clientY };
      if (!proximityFrameScheduled) {
        proximityFrameScheduled = true;
        requestAnimationFrame(checkProximity);
      }
    },
    { passive: true }
  );


  /* ----------------------------------------
     CLICK / TAP — hop + sparkle, a dialogue line, and (on repeated
     rapid clicks) the fluffy/confused reaction. A click on a
     sleeping or waking fox just wakes it instead.
  ---------------------------------------- */

  // EDIT POINTS — hop duration, and the repeated-click "fluffy"
  // reaction: a random threshold between FLUFFY_MIN_CLICKS and
  // FLUFFY_MAX_CLICKS clicks inside CLICK_WINDOW_MS triggers it; it
  // calms back down on its own after FLUFFY_DURATION_MS.
  var HOP_MS = 420;
  var FLUFFY_MIN_CLICKS = 5;
  var FLUFFY_MAX_CLICKS = 8;
  var CLICK_WINDOW_MS = 4500;
  var FLUFFY_DURATION_MS = 3800;

  var hopTimer = null;
  function playHop() {
    fox.classList.remove("is-hopping");
    void fox.offsetWidth;
    fox.classList.add("is-hopping");
    window.clearTimeout(hopTimer);
    hopTimer = window.setTimeout(
      function () {
        fox.classList.remove("is-hopping");
      },
      reduceMotion ? 10 : HOP_MS
    );
  }

  function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  var clickTimes = [];
  var fluffyThreshold = randomInt(FLUFFY_MIN_CLICKS, FLUFFY_MAX_CLICKS);
  var fluffyTimer = null;

  function registerClickForFluffy() {
    var now = Date.now();
    clickTimes.push(now);
    clickTimes = clickTimes.filter(function (t) {
      return now - t <= CLICK_WINDOW_MS;
    });

    if (clickTimes.length >= fluffyThreshold && !fox.classList.contains("is-fluffy")) {
      fox.classList.add("is-fluffy");
      clickTimes = [];
      fluffyThreshold = randomInt(FLUFFY_MIN_CLICKS, FLUFFY_MAX_CLICKS);

      window.clearTimeout(fluffyTimer);
      fluffyTimer = window.setTimeout(
        function () {
          fox.classList.remove("is-fluffy");
        },
        reduceMotion ? 10 : FLUFFY_DURATION_MS
      );
    }
  }

  fox.addEventListener("click", function () {
    if (pose === "sleeping" || pose === "waking") {
      wakeUp();
      return;
    }
    if (pose === "sitting" || pose === "lying") {
      setPose("idle");
      scheduleSleepCycle();
    }

    playHop();
    showMessage(pickLine(DIALOGUE[context] || DIALOGUE.home), false);
    scheduleHide(CLICK_DIALOGUE_MS);
    registerClickForFluffy();
  });


  /* ----------------------------------------
     HOVER — look up, and the same dialogue pool. Desktop only in
     effect (touch devices have no hover; they get the same lines via
     tap/click above instead).
  ---------------------------------------- */

  fox.addEventListener("pointerenter", function () {
    if (pose === "sleeping" || pose === "waking" || pose === "lying") return;
    fox.classList.add("is-looking");
    showMessage(pickLine(DIALOGUE[context] || DIALOGUE.home), false);
  });

  fox.addEventListener("pointerleave", function () {
    fox.classList.remove("is-looking");
    scheduleHide(HOVER_EXIT_DELAY_MS);
  });


  /* ----------------------------------------
     BLINKING + EAR TWITCHES — small, frequent, only while genuinely
     awake and settled (idle or sitting).
  ---------------------------------------- */

  // EDIT POINTS — blink and ear-twitch timing.
  var BLINK_MIN_MS = 2600;
  var BLINK_MAX_MS = 6200;
  var BLINK_DURATION_MS = 140;
  var EAR_TWITCH_MIN_MS = 4200;
  var EAR_TWITCH_MAX_MS = 9000;
  var EAR_TWITCH_DURATION_MS = 360;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function scheduleBlink() {
    window.setTimeout(function () {
      if (!document.hidden && (pose === "idle" || pose === "sitting")) {
        eyes.classList.add("is-blinking");
        window.setTimeout(
          function () {
            eyes.classList.remove("is-blinking");
          },
          reduceMotion ? 10 : BLINK_DURATION_MS
        );
      }
      scheduleBlink();
    }, rand(BLINK_MIN_MS, BLINK_MAX_MS));
  }

  function scheduleEarTwitch() {
    window.setTimeout(function () {
      if (!document.hidden && (pose === "idle" || pose === "sitting")) {
        var ear = Math.random() < 0.5 ? earLeft : earRight;
        ear.classList.add("is-twitching");
        window.setTimeout(
          function () {
            ear.classList.remove("is-twitching");
          },
          reduceMotion ? 10 : EAR_TWITCH_DURATION_MS
        );
      }
      scheduleEarTwitch();
    }, rand(EAR_TWITCH_MIN_MS, EAR_TWITCH_MAX_MS));
  }


  /* ----------------------------------------
     AUTONOMOUS IDLE BEHAVIOUR — every few minutes, while fully idle
     and not already mid-interaction, the fox quietly looks left and
     right or shows a tiny unprompted thought bubble.
  ---------------------------------------- */

  // EDIT POINTS — how often this can happen (a random interval
  // between the two, re-rolled every time).
  var IDLE_AUTONOMY_MIN_MS = 90000;
  var IDLE_AUTONOMY_MAX_MS = 240000;
  var LOOK_AROUND_MS = 1800;

  function playLookAround() {
    if (reduceMotion) return;
    head.classList.remove("is-looking-around");
    void head.offsetWidth;
    head.classList.add("is-looking-around");
    window.setTimeout(function () {
      head.classList.remove("is-looking-around");
    }, LOOK_AROUND_MS);
  }

  function showAutonomousThought() {
    showMessage(pickLine(RANDOM_THOUGHTS), true);
    scheduleHide(THOUGHT_MS);
  }

  function scheduleAutonomy() {
    window.setTimeout(function () {
      var settled =
        !document.hidden &&
        pose === "idle" &&
        !fox.classList.contains("is-fluffy") &&
        !messageEl.classList.contains("is-visible");

      if (settled) {
        if (Math.random() < 0.5) {
          playLookAround();
        } else {
          showAutonomousThought();
        }
      }
      scheduleAutonomy();
    }, rand(IDLE_AUTONOMY_MIN_MS, IDLE_AUTONOMY_MAX_MS));
  }


  /* ----------------------------------------
     INIT
  ---------------------------------------- */

  setPose("idle");
  scheduleSleepCycle();
  scheduleBlink();
  scheduleEarTwitch();
  scheduleAutonomy();
})();
