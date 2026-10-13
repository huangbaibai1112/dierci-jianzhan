/**
 * Hero Hanging Experience Cards Controller
 * Features:
 * - Unhurried, flowing auto-highlight across the 4 cards when idle
 * - Instant mouse-in / hover highlight on user interaction
 * - Touch & keyboard accessibility
 */

(function () {
  'use strict';

  function initHeroHangingStage() {
    var stage = document.getElementById('heroHangingStage');
    if (!stage) return;

    var units = stage.querySelectorAll('.hanging-card-unit');
    if (!units.length) return;

    var currentIndex = 0;
    var cycleInterval = 4500; // 4.5s unhurried cadence
    var timer = null;
    var isUserInteracting = false;

    function activateCard(index) {
      if (index < 0 || index >= units.length) index = 0;
      currentIndex = index;

      units.forEach(function (unit, idx) {
        var card = unit.querySelector('.unit-card');
        if (!card) return;

        if (idx === index) {
          card.classList.add('is-active');
        } else {
          card.classList.remove('is-active');
        }
      });
    }

    function startAutoFlow() {
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        if (isUserInteracting) return;
        var nextIndex = (currentIndex + 1) % units.length;
        activateCard(nextIndex);
      }, cycleInterval);
    }

    // Attach mouse & touch listeners to each card unit
    units.forEach(function (unit, idx) {
      var card = unit.querySelector('.unit-card');
      if (!card) return;

      // Mouse enter instantly highlights hovered card
      unit.addEventListener('mouseenter', function () {
        isUserInteracting = true;
        activateCard(idx);
      });

      // Subtle mousemove parallax tilt
      unit.addEventListener('mousemove', function (e) {
        var rect = unit.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var tiltX = (((y - rect.height / 2) / (rect.height / 2)) * -3.5).toFixed(2);
        var tiltY = (((x - rect.width / 2) / (rect.width / 2)) * 3.5).toFixed(2);
        card.style.transform = 'perspective(800px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
      });

      unit.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });

      // Touch / Click activation
      unit.addEventListener('click', function () {
        activateCard(idx);
      });

      // Keyboard navigation
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateCard(idx);
        }
      });
    });

    // Stage level mouse leave resumes auto flow
    stage.addEventListener('mouseleave', function () {
      isUserInteracting = false;
    });

    stage.addEventListener('mouseenter', function () {
      isUserInteracting = true;
    });

    // Initialize with first card active and start auto-flow
    activateCard(0);
    startAutoFlow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroHangingStage);
  } else {
    initHeroHangingStage();
  }
})();
