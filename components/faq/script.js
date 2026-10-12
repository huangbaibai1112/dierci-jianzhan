/**
 * FAQ Component Behavior
 * Self-contained: smoothly coordinates single-open behavior.
 */
(function() {
  'use strict';

  var cards = document.querySelectorAll('.faq-card');
  if (!cards.length) return;

  cards.forEach(function(card) {
    card.addEventListener('toggle', function() {
      if (card.open) {
        cards.forEach(function(other) {
          if (other !== card && other.open) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });
})();
