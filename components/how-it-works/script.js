/**
 * Component: How It Works Interactive Behavior
 * Handles accordion interactions and conversion click event bubbling.
 */
(function() {
  'use strict';

  // Conversion action handlers
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
