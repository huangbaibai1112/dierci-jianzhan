/**
 * FAQ & Help Center Component Script
 * Live keyword search and category pill filtering
 */
(function() {
  'use strict';

  var searchInput = document.getElementById('faqSearchInput');
  var countDisplay = document.getElementById('faqSearchResultCount');
  var catPills = Array.from(document.querySelectorAll('.cat-pill-btn'));
  var faqItems = Array.from(document.querySelectorAll('.faq-item'));

  var currentCategory = 'all';
  var currentSearchQuery = '';

  function applyFilters() {
    var visibleCount = 0;

    faqItems.forEach(function(item) {
      var itemCategory = item.getAttribute('data-category');
      var itemText = item.textContent.toLowerCase();

      var matchesCategory = (currentCategory === 'all' || itemCategory === currentCategory);
      var matchesSearch = (currentSearchQuery === '' || itemText.indexOf(currentSearchQuery) !== -1);

      if (matchesCategory && matchesSearch) {
        item.removeAttribute('hidden');
        visibleCount++;
      } else {
        item.setAttribute('hidden', '');
      }
    });

    if (countDisplay) {
      if (visibleCount === faqItems.length) {
        countDisplay.textContent = 'Showing all ' + visibleCount + ' questions';
      } else {
        countDisplay.textContent = 'Showing ' + visibleCount + ' of ' + faqItems.length + ' questions';
      }
    }
  }

  // 1. Category Pill Click Handler
  if (catPills.length > 0) {
    catPills.forEach(function(btn) {
      btn.addEventListener('click', function() {
        currentCategory = btn.getAttribute('data-category') || 'all';

        catPills.forEach(function(b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');

        applyFilters();
      });
    });
  }

  // 2. Search Input Keyup/Input Handler
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      currentSearchQuery = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

})();
