/*
  Room-switcher shared by both gallery exhibition pages
  (photographs.html and drawings.html). Turns a set of collections
  into "exhibition rooms": one visible at a time, vertical scroll
  browses the artwork inside the current room, horizontal interaction
  (click / arrow keys / swipe / trackpad) changes rooms — cyclically,
  so there is always a previous and a next room to point toward. See
  CLAUDE.md → "Gallery architecture" → "Room switcher" for the
  reasoning.

  Built on top of gallery.js's buildCollectionSection(), which does
  the actual tile rendering, infinite scroll and lightbox — this file
  only handles which room is showing and how it gets there. The
  `mode` param ("masonry" for Photographs, "editorial" for Drawings)
  is passed straight through to buildCollectionSection() untouched;
  this file has no opinion on how a room's grid looks.
*/

(function () {
  "use strict";

  var TRANSITION_MS = 600;
  var SWIPE_THRESHOLD = 60;
  var WHEEL_THRESHOLD = 30;

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function init(data, roomIds, navSelector, stageSelector, mode) {
    mode = mode || "masonry";

    var navEl = document.querySelector(navSelector);
    var stageEl = document.querySelector(stageSelector);
    if (!navEl || !stageEl || !data || !data.collections) return;

    var collectionsById = {};
    data.collections.forEach(function (c) {
      collectionsById[c.id] = c;
    });

    var rooms = roomIds
      .map(function (id) {
        return collectionsById[id];
      })
      .filter(Boolean);

    if (!rooms.length) return;

    var panels = [];
    var activeIndex = 0;
    var transitioning = false;

    // Edge fades — a quiet hint that the exhibition continues past
    // either side, always present since navigation is cyclic.

    var edgeLeft = document.createElement("div");
    edgeLeft.className = "room-stage-edge room-stage-edge--left";
    edgeLeft.setAttribute("aria-hidden", "true");

    var edgeRight = document.createElement("div");
    edgeRight.className = "room-stage-edge room-stage-edge--right";
    edgeRight.setAttribute("aria-hidden", "true");

    document.body.appendChild(edgeLeft);
    document.body.appendChild(edgeRight);

    rooms.forEach(function (collection, i) {
      var panel = document.createElement("div");
      panel.className = "room-panel" + (i === 0 ? " is-active" : "");
      panel.setAttribute("data-room-index", String(i));
      panel.appendChild(
        window.TowardsWonderGallery.buildCollectionSection(
          collection,
          mode
        )
      );
      stageEl.appendChild(panel);
      panels.push(panel);
    });


    /* ----------------------------------------
       PREV / CURRENT / NEXT NAV
       Only three items are ever shown — the nav
       is rebuilt (not just re-highlighted) on
       every room change, since which collections
       count as "prev" and "next" changes too.
    ---------------------------------------- */

    var prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "room-nav-prev";

    var prevArrow = document.createElement("span");
    prevArrow.className = "room-nav-arrow";
    prevArrow.setAttribute("aria-hidden", "true");
    prevArrow.textContent = "←";

    var prevLabel = document.createElement("span");
    prevLabel.className = "room-nav-label";

    prevButton.appendChild(prevArrow);
    prevButton.appendChild(prevLabel);
    prevButton.addEventListener("click", goPrev);

    var currentLabel = document.createElement("span");
    currentLabel.className = "room-nav-current";

    var nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "room-nav-next";

    var nextLabel = document.createElement("span");
    nextLabel.className = "room-nav-label";

    var nextArrow = document.createElement("span");
    nextArrow.className = "room-nav-arrow";
    nextArrow.setAttribute("aria-hidden", "true");
    nextArrow.textContent = "→";

    nextButton.appendChild(nextLabel);
    nextButton.appendChild(nextArrow);
    nextButton.addEventListener("click", goNext);

    navEl.appendChild(prevButton);
    navEl.appendChild(currentLabel);
    navEl.appendChild(nextButton);

    function cycle(index, delta) {
      return (index + delta + rooms.length) % rooms.length;
    }

    function updateNav(index) {
      var prevIndex = cycle(index, -1);
      var nextIndex = cycle(index, 1);

      prevLabel.textContent = rooms[prevIndex].title;
      currentLabel.textContent = rooms[index].title;
      nextLabel.textContent = rooms[nextIndex].title;

      prevButton.setAttribute(
        "aria-label",
        "Previous room: " + rooms[prevIndex].title
      );
      nextButton.setAttribute(
        "aria-label",
        "Next room: " + rooms[nextIndex].title
      );
    }

    updateNav(0);


    /* ----------------------------------------
       TRANSITION
    ---------------------------------------- */

    function goToRoom(index, direction) {
      if (index === activeIndex || transitioning) return;

      var oldPanel = panels[activeIndex];
      var newPanel = panels[index];

      updateNav(index);

      if (reduceMotion) {
        oldPanel.classList.remove("is-active");
        newPanel.classList.add("is-active");
        activeIndex = index;
        return;
      }

      transitioning = true;

      stageEl.style.minHeight = oldPanel.offsetHeight + "px";

      oldPanel.classList.add("is-transitioning");
      newPanel.classList.add("is-transitioning");
      newPanel.classList.add(
        direction === 1 ? "is-entering-from-right" : "is-entering-from-left"
      );
      newPanel.classList.add("is-active");

      // Force layout so the entering offset is applied before we
      // animate away from it — otherwise the browser coalesces both
      // class changes into one paint and nothing transitions.
      void newPanel.offsetWidth;

      oldPanel.classList.add(
        direction === 1 ? "is-leaving-to-left" : "is-leaving-to-right"
      );
      newPanel.classList.remove(
        "is-entering-from-right",
        "is-entering-from-left"
      );

      window.setTimeout(function () {
        oldPanel.classList.remove(
          "is-active",
          "is-transitioning",
          "is-leaving-to-left",
          "is-leaving-to-right"
        );
        newPanel.classList.remove("is-transitioning");
        stageEl.style.minHeight = "";

        activeIndex = index;
        transitioning = false;
      }, TRANSITION_MS);
    }

    function goNext() {
      goToRoom(cycle(activeIndex, 1), 1);
    }

    function goPrev() {
      goToRoom(cycle(activeIndex, -1), -1);
    }


    /* Keyboard — arrow keys switch rooms, unless the lightbox is
       open, in which case they belong to it (image prev/next). Does
       not touch Alt/Cmd+Arrow, so browser history shortcuts are
       untouched. */

    document.addEventListener("keydown", function (event) {
      if (window.TowardsWonderGallery.isLightboxOpen()) return;
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    });


    /* Touch swipe — horizontal only. Vertical panning stays fully
       native (touch-action: pan-y on .room-stage). The tricky part
       is that a horizontal swipe, left unprevented, can also be
       read by the browser itself as an edge-swipe "go back"
       gesture — which would leave the Photographs experience
       entirely and land back on the Hero. So once a gesture reveals
       itself as horizontal, its touchmove is prevented for the rest
       of that gesture; a gesture that reveals itself as vertical is
       never touched, so normal scrolling is never at risk. */

    var touchStartX = 0;
    var touchStartY = 0;
    var touchTracking = false;
    var touchDeciding = false;
    var touchIsHorizontal = false;

    stageEl.addEventListener(
      "touchstart",
      function (event) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchTracking = true;
        touchDeciding = true;
        touchIsHorizontal = false;
      },
      { passive: true }
    );

    stageEl.addEventListener(
      "touchmove",
      function (event) {
        if (!touchTracking) return;

        var dx = event.touches[0].clientX - touchStartX;
        var dy = event.touches[0].clientY - touchStartY;

        if (touchDeciding) {
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            touchIsHorizontal = Math.abs(dx) > Math.abs(dy);
            touchDeciding = false;
          }
        }

        if (touchIsHorizontal) {
          // Stops the browser's own edge-swipe navigation from
          // firing underneath this gesture.
          event.preventDefault();
        }
      },
      { passive: false }
    );

    stageEl.addEventListener(
      "touchend",
      function (event) {
        if (!touchTracking) return;
        touchTracking = false;
        if (!touchIsHorizontal) return;

        var dx = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;

        if (dx < 0) {
          goNext();
        } else {
          goPrev();
        }
      },
      { passive: true }
    );

    stageEl.addEventListener(
      "touchcancel",
      function () {
        touchTracking = false;
      },
      { passive: true }
    );


    /* Trackpad horizontal gesture. Only acts on wheel events that
       are clearly more horizontal than vertical, so ordinary
       vertical scrolling to browse photographs is completely
       untouched — and preventDefault here also stops a strong
       horizontal trackpad swipe from being read as browser
       back/forward navigation. */

    var wheelLocked = false;

    stageEl.addEventListener(
      "wheel",
      function (event) {
        if (Math.abs(event.deltaX) < WHEEL_THRESHOLD) return;
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

        event.preventDefault();

        if (wheelLocked) return;
        wheelLocked = true;

        if (event.deltaX > 0) {
          goNext();
        } else {
          goPrev();
        }

        window.setTimeout(
          function () {
            wheelLocked = false;
          },
          TRANSITION_MS + 150
        );
      },
      { passive: false }
    );
  }

  window.TowardsWonderGallery = window.TowardsWonderGallery || {};
  window.TowardsWonderGallery.initRooms = init;
})();
