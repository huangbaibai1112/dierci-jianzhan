/**
 * Header Component Behavior
 * Completely self-contained: manages mobile menu toggle.
 */
(function() {
  'use strict';

  var btn = document.getElementById('headerMenuBtn');
  var list = document.getElementById('headerNavList');
  if (!btn || !list) return;

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = list.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', function(e) {
    if (!list.contains(e.target) && !btn.contains(e.target) && list.classList.contains('is-open')) {
      list.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Highlight current page active link
  var page = window.location.pathname.split('/').pop() || 'index.html';
  var links = list.querySelectorAll('a');
  links.forEach(function(link) {
    var href = link.getAttribute('href') || '';
    if (page === 'how-it-works.html' && href.indexOf('how-it-works.html') !== -1) {
      link.classList.add('is-active');
    }
  });
})();
