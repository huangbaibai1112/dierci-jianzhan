/**
 * FAQ Component Behavior
 * Self-contained: strictly coordinates exclusive accordion (single-open) behavior.
 * When any item is opened, all previously opened items automatically fold and collapse.
 */
(function() {
  'use strict';

  var rows = document.querySelectorAll('.faq-row, .faq-card');
  if (!rows.length) return;

  rows.forEach(function(row) {
    row.addEventListener('toggle', function() {
      if (row.open) {
        rows.forEach(function(other) {
          if (other !== row && other.open) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });
})();
