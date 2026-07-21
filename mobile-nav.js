/* ========================================
   MOBILE SITE MENU

   Drives the hamburger toggle + full-screen site index used on
   narrow viewports (see ".nav-menu-toggle" / ".site-menu" in
   style.css). Fully isolated, single-purpose file — same pattern as
   cursor.js, fox.js, and globe.js — and a no-op above the 760px
   breakpoint where the full inline nav is already visible.
======================================== */

(function () {
  const toggle = document.querySelector('.nav-menu-toggle');
  const menu = document.getElementById('siteMenu');

  if (!toggle || !menu) return;

  const menuLinks = menu.querySelectorAll('a');
  const menuList = menu.querySelector('.site-menu-list');

  function openMenu() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');

    menu.setAttribute('aria-hidden', 'false');

    document.documentElement.classList.add('site-menu-open');
  }

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');

    menu.setAttribute('aria-hidden', 'true');

    document.documentElement.classList.remove('site-menu-open');
  }

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  toggle.addEventListener('click', () => {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      closeMenu();
      toggle.focus();
    }
  });

  /* Clicking the quiet space around the list (not a link itself)
     also closes it — the whole overlay counts as a backdrop. */
  menu.addEventListener('click', event => {
    if (event.target === menu || event.target === menuList) {
      closeMenu();
    }
  });

  /* If a resize (e.g. rotating to landscape, or a resized desktop
     window) crosses back above the mobile breakpoint while the menu
     is open, close it rather than leaving it stuck open and inert
     behind the now-visible full nav. */
  let resizeTimer = null;

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(() => {
      if (isOpen() && window.innerWidth > 760) {
        closeMenu();
      }
    }, 150);
  });
})();
