/* ========================================
   KEEP THE EXACT READING POSITION ON REFRESH
======================================== */

const scrollStorageKey = `reading-position:${location.pathname}`;
let isRestoringScroll = true;
let saveScrollTimer = null;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function getSavedScrollPosition() {
  const value = sessionStorage.getItem(scrollStorageKey);

  if (value === null) {
    return null;
  }

  const position = Number(value);

  return Number.isFinite(position)
    ? position
    : null;
}

function saveScrollPosition() {
  if (isRestoringScroll) {
    return;
  }

  sessionStorage.setItem(
    scrollStorageKey,
    String(window.scrollY)
  );
}

function restoreScrollPosition() {
  const savedPosition = getSavedScrollPosition();

  if (savedPosition === null) {
    isRestoringScroll = false;
    return;
  }

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = 'auto';

  const restore = () => {
    window.scrollTo(0, savedPosition);
  };

  restore();

  requestAnimationFrame(() => {
    restore();

    requestAnimationFrame(() => {
      restore();
    });
  });

  window.addEventListener(
    'load',
    () => {
      restore();

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready
          .then(restore)
          .catch(() => {});
      }

      window.setTimeout(() => {
        restore();

        root.style.scrollBehavior =
          previousScrollBehavior;

        isRestoringScroll = false;
      }, 250);
    },
    {
      once: true
    }
  );
}

restoreScrollPosition();

window.addEventListener(
  'scroll',
  () => {
    window.clearTimeout(saveScrollTimer);

    saveScrollTimer = window.setTimeout(
      saveScrollPosition,
      80
    );
  },
  {
    passive: true
  }
);

window.addEventListener(
  'pagehide',
  () => {
    sessionStorage.setItem(
      scrollStorageKey,
      String(window.scrollY)
    );
  }
);

/* ========================================
   HERO → EXPLORE TRANSITION
======================================== */

const beginButton = document.querySelector('.begin-button');
const exploreSection = document.querySelector('.explore-section');
const exploreIntro = document.querySelector('.explore-intro');
const exploreList = document.querySelector('.explore-list');

let hoverLocked = false;
let startPointerX = 0;
let startPointerY = 0;

function handleExplorePointerMove(event) {
  if (!hoverLocked || !exploreSection) return;

  const distanceX = Math.abs(event.clientX - startPointerX);
  const distanceY = Math.abs(event.clientY - startPointerY);

  if (distanceX < 30 && distanceY < 30) return;

  hoverLocked = false;
  exploreSection.classList.remove('explore-entering');

  window.removeEventListener(
    'pointermove',
    handleExplorePointerMove
  );
}

function revealExploreIntro() {
  if (!exploreSection) return;

  exploreSection.classList.add('intro-visible');
}

if (beginButton && exploreSection) {
  beginButton.addEventListener('click', event => {
    event.preventDefault();

exploreSection.classList.add('intro-reset');
exploreSection.classList.remove('intro-visible');

void exploreSection.offsetHeight;

    exploreSection.classList.add('explore-entering');

    hoverLocked = true;
    startPointerX = event.clientX;
    startPointerY = event.clientY;

    window.removeEventListener(
      'pointermove',
      handleExplorePointerMove
    );

    window.addEventListener(
      'pointermove',
      handleExplorePointerMove
    );

    exploreSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

window.setTimeout(() => {

  exploreSection.classList.remove('intro-reset');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      revealExploreIntro();
    });
  });
}, 350);

  });
}

/* ========================================
   MANUAL SCROLL TO EXPLORE
======================================== */

if (exploreIntro && exploreSection) {
  const introObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        if (hoverLocked) return;

        requestAnimationFrame(() => {
          revealExploreIntro();
        });
      });
    },
    {
      threshold: 0.45,
      rootMargin: '0px 0px -12% 0px'
    }
  );

  introObserver.observe(exploreIntro);
}

/* ========================================
   EXPLORE ITEMS REVEAL
======================================== */
const exploreItems = document.querySelectorAll('.explore-item');

if (exploreItems.length) {

  exploreItems.forEach(item => {
    item.classList.remove('item-visible');
  });

  const itemObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        requestAnimationFrame(() => {
          entry.target.classList.add('item-visible');
        });

        itemObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0,

      rootMargin: '0px 0px -25% 0px'
    }
  );

  exploreItems.forEach(item => {
    itemObserver.observe(item);
  });
}

/* ========================================
   TOUCH DEVICES
======================================== */

window.addEventListener(
  'touchstart',
  () => {
    if (!exploreSection) return;

    hoverLocked = false;
    exploreSection.classList.remove('explore-entering');

    window.removeEventListener(
      'pointermove',
      handleExplorePointerMove
    );
  },
  {
    passive: true
  }
);

/* ========================================
   TRAVEL MAP — moved to globe.js

   The old flat, aesthetically-arranged map has been replaced by an
   interactive 3D globe. Its data (GLOBE_LOCATIONS), rendering, and
   interaction all live in globe.js now — see that file's header
   comment. Kept out of this file so it can be a fully isolated,
   optional feature, same pattern as cursor.js and fox.js.
======================================== */
