/* ========================================
   AMBIENT MUSIC — quiet reading companion (all pages)

   Isolated, reusable script — included on every page via
   <script src="audio.js"> (or "../audio.js" from a subdirectory),
   the same site-wide pattern as cursor.js and fox.js. Builds its own
   button; nothing needs to be hand-written into any page for it.

   Behaviour, deliberately conservative:
   - Never autoplays. The <audio> element isn't even created until
     the first click — true opt-in, and zero network cost for anyone
     who never touches the button.
   - Click toggles play/pause. Both directions fade the volume
     (rather than snapping on/off), so starting or stopping the music
     never interrupts the page with a hard audio edge.
   - Default volume sits at TARGET_VOLUME (30%) — background
     ambience, not something that competes with the page.
   - The track itself (audio/quiet-reading.mp3) is a seamless loop —
     see the button's own quiet "breathing" pulse while playing,
     which echoes the same slow-breathing language used in the
     hero's entrance and the scroll reveals elsewhere on the site.

   EDIT POINTS:
   - TARGET_VOLUME              resting volume once faded in (0–1).
   - FADE_IN_MS / FADE_OUT_MS   how long each fade takes.
   - AUDIO_SRC (below)          which track plays; swap the file in
                                 audio/ and update the filename here.

   Icon/button styling lives in style.css → "AMBIENT MUSIC BUTTON".
======================================== */

(function () {
  "use strict";

  var TARGET_VOLUME = 0.3;
  var FADE_IN_MS = 1800;
  var FADE_OUT_MS = 1200;

  // Note: the volume fade itself is intentionally NOT gated on
  // prefers-reduced-motion — it's an audio transition, not visual
  // motion, and an abrupt on/off would be more jarring, not less.
  // The button's own visual "breathing" pulse (CSS) does respect it.

  // ----------------------------------------
  // Resolve the track's URL relative to this script's own location
  // (not the page's), so the same path works whether the page is at
  // the project root (index.html) or one level down (essays/,
  // field-notes/, gallery/) — same technique as gallery-preload.js.
  // ----------------------------------------

  var scriptEl = document.currentScript;
  var PROJECT_ROOT = scriptEl ? new URL(".", scriptEl.src).href : null;
  if (!PROJECT_ROOT) return;

  var AUDIO_SRC = new URL("audio/quiet-reading.mp3", PROJECT_ROOT).href;

  // ----------------------------------------
  // MARKUP
  //
  // Lives in the top nav, not a fixed corner: inserted directly into
  // this page's own <header class="nav ..."> — right before
  // .nav-menu-toggle when that exists (index.html only), so it sits
  // beside the hamburger once the text links hide on mobile; appended
  // as the header's last child everywhere else (essays/field-notes/
  // gallery pages have no hamburger). Combined with the "nav { margin-
  // left: auto }" rule in style.css, this keeps it grouped tightly
  // with the nav links and hamburger on the right, logo still pinned
  // left — see "AMBIENT MUSIC BUTTON" in style.css for the layout
  // side of this.
  // ----------------------------------------

  var button = document.createElement("button");
  button.type = "button";
  button.className = "music-toggle";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "Play ambient music");
  button.title = "Play ambient music";

  button.innerHTML =
    '<svg class="music-toggle-icon" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9 18V5l10-2v13"/>' +
    '<circle cx="6" cy="18" r="3"/>' +
    '<circle cx="16" cy="16" r="3"/>' +
    "</svg>";

  var navHeader = document.querySelector("header.nav");

  if (navHeader) {
    var navMenuToggle = navHeader.querySelector(".nav-menu-toggle");
    if (navMenuToggle) {
      navHeader.insertBefore(button, navMenuToggle);
    } else {
      navHeader.appendChild(button);
    }
  } else {
    // Shouldn't happen on this site, but never lose the button
    // entirely if some future page lacks a <header class="nav">.
    document.body.appendChild(button);
  }

  // ----------------------------------------
  // AUDIO — created lazily, only on first play
  //
  // Volume is faded via a Web Audio GainNode rather than the
  // <audio> element's own .volume property. This isn't optional
  // polish: iOS Safari (and anything else on WebKit/iOS, since
  // Apple requires every iOS browser to use it) hard-ignores JS
  // writes to a media element's .volume — it's locked to the
  // hardware volume by design. Fading .volume there would be a
  // silent no-op: the track would just start at full perceived
  // volume with no fade at all. Routing through a GainNode sidesteps
  // that entirely and works identically on desktop and mobile.
  // ----------------------------------------

  var audio = null;
  var gainNode = null;
  var audioCtx = null;
  var isPlaying = false;
  var fadeRafId = null;

  var AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  function ensureAudio() {
    if (audio) return audio;

    audio = new Audio();
    audio.preload = "none";
    audio.loop = true;
    audio.src = AUDIO_SRC;

    audio.addEventListener("error", function () {
      setUiState(false);
      isPlaying = false;
    });

    if (AudioContextCtor) {
      try {
        audioCtx = new AudioContextCtor();
        var source = audioCtx.createMediaElementSource(audio);
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        source.connect(gainNode).connect(audioCtx.destination);
      } catch (e) {
        // Web Audio graph failed to set up (very old/unusual
        // browser) — fall back to the plain element below, which
        // still works everywhere except iOS Safari's fade.
        gainNode = null;
        audioCtx = null;
      }
    }

    if (!gainNode) {
      audio.volume = 0;
    }

    return audio;
  }

  function getVolume() {
    return gainNode ? gainNode.gain.value : audio.volume;
  }

  function setVolume(v) {
    if (gainNode) {
      gainNode.gain.value = v;
    } else {
      audio.volume = v;
    }
  }

  function cancelFade() {
    if (fadeRafId !== null) {
      cancelAnimationFrame(fadeRafId);
      fadeRafId = null;
    }
  }

  function fadeVolumeTo(target, duration, onDone) {
    cancelFade();

    ensureAudio();
    var start = getVolume();
    var startTime = performance.now();

    if (duration <= 0) {
      setVolume(target);
      if (onDone) onDone();
      return;
    }

    function step(now) {
      var elapsed = now - startTime;
      var t = Math.min(elapsed / duration, 1);
      var eased = t * t * (3 - 2 * t); // smoothstep — gentler than linear

      setVolume(start + (target - start) * eased);

      if (t < 1) {
        fadeRafId = requestAnimationFrame(step);
      } else {
        fadeRafId = null;
        if (onDone) onDone();
      }
    }

    fadeRafId = requestAnimationFrame(step);
  }

  function setUiState(playing) {
    button.classList.toggle("is-playing", playing);
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    var label = playing ? "Pause ambient music" : "Play ambient music";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function play() {
    if (isPlaying) return;

    var el = ensureAudio();
    isPlaying = true;
    setUiState(true);

    // iOS/Safari (and Chrome's autoplay policy generally) start a
    // new AudioContext "suspended" until a user gesture resumes it —
    // this click is that gesture, so resume synchronously here
    // rather than waiting on the promise elsewhere in the flow.
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    var playPromise = el.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {
        // Playback was blocked or interrupted — reflect that
        // honestly in the button rather than pretending it's on.
        isPlaying = false;
        setUiState(false);
      });
    }

    fadeVolumeTo(TARGET_VOLUME, FADE_IN_MS);
  }

  function pause() {
    if (!isPlaying) return;

    isPlaying = false;
    setUiState(false);

    fadeVolumeTo(0, FADE_OUT_MS, function () {
      if (audio) audio.pause();
    });
  }

  button.addEventListener("click", function () {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  });

  // Stop cleanly rather than leaving a fade hanging if someone
  // navigates away mid-fade.
  window.addEventListener("pagehide", function () {
    cancelFade();
    if (audio) audio.pause();
  });
})();
