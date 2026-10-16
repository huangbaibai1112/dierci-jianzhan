/**
 * Platform Features Component Script
 * Category filter functionality
 */
(function() {
  'use strict';

  var filterButtons = Array.from(document.querySelectorAll('.filter-tab-btn'));
  var featureCards = Array.from(document.querySelectorAll('.feature-card'));

  if (filterButtons.length > 0 && featureCards.length > 0) {
    filterButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var filterVal = btn.getAttribute('data-filter');

        // Update active tab state
        filterButtons.forEach(function(b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');

        // Filter cards
        featureCards.forEach(function(card) {
          var cardCategory = card.getAttribute('data-category');
          if (filterVal === 'all' || cardCategory === filterVal) {
            card.removeAttribute('hidden');
          } else {
            card.setAttribute('hidden', '');
          }
        });
      });
    });
  }
})();
