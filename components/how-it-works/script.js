/**
 * Component: How It Works Interactive Behavior
 * Handles smooth scrolling navigation rail and interaction tracking.
 */
(function() {
  'use strict';

  // Smooth scroll for quick-jump rail items
  var railLinks = document.querySelectorAll('.hiw-nav-rail a[href^="#"]');
  railLinks.forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        var headerOffset = 90;
        var elementPosition = targetEl.getBoundingClientRect().top;
        var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Outbound action button handling
  var actionBtns = document.querySelectorAll('.how-it-works-page [data-action="join-partner"]');
  actionBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var source = this.getAttribute('data-source') || 'how_it_works';
      if (window.EventBus) {
        window.EventBus.emit('cta:click', { source: source });
      }
    });
  });
})();
