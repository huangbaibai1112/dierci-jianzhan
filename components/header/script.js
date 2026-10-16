/**
 * Header Component Behavior
 * Multi-page routing, ScrollSpy, in-page smooth navigation, and mobile menu controller.
 */
(function() {
  'use strict';

  var btn = document.getElementById('headerMenuBtn');
  var list = document.getElementById('headerNavList');
  var backdrop = document.getElementById('headerNavBackdrop');
  if (!btn || !list) return;

  function closeMenu() {
    if (list.classList.contains('is-open')) {
      list.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (backdrop) backdrop.classList.remove('is-active');
    }
  }

  function openMenu() {
    list.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    if (backdrop) backdrop.classList.add('is-active');
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (list.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeMenu);
  }

  document.addEventListener('click', function(e) {
    if (!list.contains(e.target) && !btn.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && list.classList.contains('is-open')) {
      closeMenu();
      btn.focus();
    }
  });

  // Current page detection
  var rawPath = window.location.pathname;
  var page = rawPath.split('/').pop() || 'index.html';
  if (!page || page === '') page = 'index.html';
  var isIndexPage = (page === 'index.html');
  var isHiwPage = (page === 'how-it-works.html');

  var navLinks = Array.from(list.querySelectorAll('a'));

  // Multi-Page & In-Page Link Handling
  navLinks.forEach(function(link) {
    var href = link.getAttribute('href') || '';

    // Active state for dedicated subpages
    if (isHiwPage && href.indexOf('how-it-works.html') !== -1) {
      link.classList.add('is-active');
    }

    link.addEventListener('click', function(e) {
      closeMenu();

      // If we are on index.html and clicking an anchor link target
      if (isIndexPage && href.indexOf('#') !== -1) {
        var hash = href.split('#')[1];
        var targetEl = document.getElementById(hash);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
          if (history.pushState) {
            history.pushState(null, '', '#' + hash);
          }
          // Highlight clicked nav link immediately
          navLinks.forEach(function(nl) {
            nl.classList.remove('is-active');
          });
          link.classList.add('is-active');
        }
      }
    });
  });

  // Also close mobile drawer when clicking the Sign Up CTA in header
  var headerCta = document.querySelector('.comp-header .btn-primary');
  if (headerCta) {
    headerCta.addEventListener('click', closeMenu);
  }

  // ScrollSpy on index.html
  if (isIndexPage) {
    // The sequence in document order:
    // 1. experience (film)
    // 2. standards (hanging-cards)
    // 3. features (comparison)
    // 4. safety (trust)
    // 5. faq (faq)
    var sectionIds = ['experience', 'standards', 'features', 'safety', 'faq'];

    function getSectionsInDocumentOrder() {
      var arr = [];
      sectionIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          arr.push({ id: id, el: el });
        }
      });
      // Sort dynamically by physical position in the document
      arr.sort(function(a, b) {
        var topA = a.el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
        var topB = b.el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
        return topA - topB;
      });
      return arr;
    }

    var sectionElements = getSectionsInDocumentOrder();
    var ticking = false;

    function highlightNav(activeId) {
      navLinks.forEach(function(link) {
        var h = link.getAttribute('href') || '';
        if (h.indexOf('#') !== -1) {
          var linkHash = h.split('#')[1];
          if (linkHash === activeId) {
            link.classList.add('is-active');
          } else {
            link.classList.remove('is-active');
          }
        }
      });
    }

    function updateScrollSpy() {
      var scrollPos = window.pageYOffset || document.documentElement.scrollTop;
      var winHeight = window.innerHeight || document.documentElement.clientHeight;
      var docHeight = document.documentElement.scrollHeight;
      var headerOffset = 90;

      // If at very top (e.g. hero), clear active links
      if (scrollPos < 350) {
        navLinks.forEach(function(link) {
          var h = link.getAttribute('href') || '';
          if (h.indexOf('#') !== -1) link.classList.remove('is-active');
        });
        ticking = false;
        return;
      }

      // Check if user has scrolled near bottom of page -> highlight FAQ
      if (scrollPos + winHeight >= docHeight - 60) {
        var lastId = sectionElements[sectionElements.length - 1] ? sectionElements[sectionElements.length - 1].id : 'faq';
        highlightNav(lastId);
        ticking = false;
        return;
      }

      var currentActiveId = null;
      for (var i = sectionElements.length - 1; i >= 0; i--) {
        var rect = sectionElements[i].el.getBoundingClientRect();
        if (rect.top <= headerOffset + 80) {
          currentActiveId = sectionElements[i].id;
          break;
        }
      }

      if (currentActiveId) {
        highlightNav(currentActiveId);
      }

      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollSpy);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', function() {
      sectionElements = getSectionsInDocumentOrder();
      updateScrollSpy();
    }, { passive: true });

    function handleHashJump() {
      if (window.location.hash) {
        var targetHash = window.location.hash.substring(1);
        var targetEl = document.getElementById(targetHash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
          highlightNav(targetHash);
          setTimeout(updateScrollSpy, 250);
        }
      }
    }

    // Handle initial hash jump smoothly
    if (window.location.hash) {
      setTimeout(handleHashJump, 120);
    }

    // Handle hash change via browser back/forward or programmatic navigation
    window.addEventListener('hashchange', function() {
      handleHashJump();
    });
  }
})();
