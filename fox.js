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
      '<ellipse class="fox-ground" cx="20" cy="42.5" rx="13" ry="2.2" />' +
      '<g class="fox-rig">' +

        // Tail — three overlapping rounded blocks, tapering to a
        // cream tip, base pinned near the body's right shoulder so
        // it reads as attached whichever way it's rotated.
        '<g class="fox-tail">' +
          '<rect class="fox-fur" x="27" y="22" width="8" height="10" rx="4" />' +
          '<rect class="fox-fur" x="31" y="13" width="8" height="10" rx="4" />' +
          '<rect class="fox-cream" x="33" y="5" width="7" height="9" rx="3.5" />' +
        "</g>" +

        // Body — torso, cream chest/belly patch, and two front paws
        // with small shadow "toes". The accessory (camera / book /
        // compass / envelope) sits tucked beside the right paw.
        '<g class="fox-body">' +
          '<rect class="fox-fur" x="8" y="24" width="24" height="16" rx="8" />' +
          '<rect class="fox-cream" x="14" y="30" width="12" height="10" rx="5" />' +
          '<rect class="fox-cream" x="11" y="37" width="6" height="5" rx="2" />' +
          '<rect class="fox-shadow" x="12" y="40" width="4" height="2" rx="1" />' +
          '<rect class="fox-cream" x="23" y="37" width="6" height="5" rx="2" />' +
          '<rect class="fox-shadow" x="24" y="40" width="4" height="2" rx="1" />' +
          '<g class="fox-accessory">' +
            '<g class="fox-accessory-camera">' +
              '<rect class="fox-ink" x="24" y="33" width="8" height="6" rx="1" />' +
              '<circle class="fox-fur-light" cx="28" cy="36" r="2" />' +
            "</g>" +
            '<g class="fox-accessory-book">' +
              '<rect class="fox-cream" x="22" y="34" width="9" height="6" rx="1" />' +
              '<rect class="fox-shadow" x="26.3" y="34" width="1" height="6" />' +
            "</g>" +
            '<g class="fox-accessory-compass">' +
              '<circle class="fox-cream" cx="27" cy="37" r="4" />' +
              '<rect class="fox-shadow" x="26.6" y="33.4" width="0.8" height="7.2" />' +
              '<rect class="fox-shadow" x="23.4" y="36.6" width="7.2" height="0.8" />' +
            "</g>" +
            '<g class="fox-accessory-envelope">' +
              '<rect class="fox-cream" x="22" y="34" width="9" height="6" rx="1" />' +
              '<path class="fox-envelope-flap" d="M22 34 L26.5 37.4 L31 34" />' +
            "</g>" +
          "</g>" +
        "</g>" +

        // Head — ears (each independently twitchable), face, muzzle,
        // eyes, nose, plus the hidden-by-default fluff tufts and "?"
        // shown only during the fluffy/confused reaction.
        '<g class="fox-head">' +
          '<g class="fox-ear-left">' +
            '<rect class="fox-fur" x="10" y="2" width="4" height="4" />' +
            '<rect class="fox-fur" x="7" y="6" width="8" height="4" />' +
            '<rect class="fox-fur-light" x="10" y="6.5" width="4" height="3" />' +
          "</g>" +
          '<g class="fox-ear-right">' +
            '<rect class="fox-fur" x="26" y="2" width="4" height="4" />' +
            '<rect class="fox-fur" x="25" y="6" width="8" height="4" />' +
            '<rect class="fox-fur-light" x="26" y="6.5" width="4" height="3" />' +
          "</g>" +
          '<rect class="fox-fur" x="6" y="8" width="28" height="18" rx="7" />' +
          '<g class="fox-fluff">' +
            '<circle class="fox-fur-light" cx="8" cy="9" r="1.8" />' +
            '<circle class="fox-fur-light" cx="32" cy="9" r="1.8" />' +
            '<circle class="fox-fur-light" cx="4.5" cy="16" r="1.8" />' +
            '<circle class="fox-fur-light" cx="35.5" cy="16" r="1.8" />' +
            '<circle class="fox-fur-light" cx="11" cy="4.5" r="1.6" />' +
            '<circle class="fox-fur-light" cx="29" cy="4.5" r="1.6" />' +
          "</g>" +
          '<rect class="fox-cream" x="13" y="18" width="14" height="9" rx="4.5" />' +
          '<g class="fox-eyes">' +
            '<rect class="fox-ink" x="13" y="15.5" width="3" height="4" rx="1" />' +
            '<rect class="fox-ink" x="24" y="15.5" width="3" height="4" rx="1" />' +
          "</g>" +
          '<rect class="fox-ink" x="18.5" y="22.5" width="3" height="2.5" rx="1" />' +
          '<text class="fox-question" x="20" y="1">?</text>' +
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
  // envelope, About its quieter pose, everything else the plain
  // default. Only wired up when those section ids actually exist on
  // the page, so this is a no-op everywhere else.
  if (staticContext === "home" && "IntersectionObserver" in window) {
    var sectionContexts = [
      { id: "map", ctx: "map" },
      { id: "gallery", ctx: "gallery" },
      { id: "about-me", ctx: "about" },
      { id: "contact", ctx: "contact" }
    ].filter(function (entry) {
      return document.getElementById(entry.id);
    });

    if (sectionContexts.length) {
      var sectionObserver = new IntersectionObserver(
        function (entries) {
          var best = null;
          entries.forEach(function (entry) {
            if (
              entry.isIntersecting &&
              (!best || entry.intersectionRatio > best.intersectionRatio)
            ) {
              best = entry;
            }
          });

          if (!best) {
            setContext("home");
            return;
          }

          var match = sectionContexts.filter(function (entry) {
            return document.getElementById(entry.id) === best.target;
          })[0];

          setContext(match ? match.ctx : "home");
        },
        { threshold: [0.35, 0.5, 0.65] }
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
