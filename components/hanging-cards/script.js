/**
 * Hanging Cards - Interactive Platform Advantages Controller
 * Features:
 * - Unhurried sequential highlight flow when idle (cycling through the 4 standards)
 * - Instant hover-to-highlight upon mouseover with auto-flow pause
 * - Subtle physical micro-tilt and smooth transition
 * - Keyboard focus accessibility
 */

(function () {
  'use strict';

  function initHangingCards() {
    const stage = document.getElementById('hangingStage');
    if (!stage) return;

    const suspensions = stage.querySelectorAll('.card-suspension');
    const cards = stage.querySelectorAll('.hanging-card');
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = 0;
    let autoFlowTimer = null;
    let isUserInteracting = false;
    const CYCLE_INTERVAL = 3800; // Unhurried, dignified cadence

    function setActiveCard(index, manual = false) {
      if (index < 0 || index >= cards.length) return;
      activeIndex = index;

      cards.forEach((card, i) => {
        const isCurrent = i === index;
        card.classList.toggle('is-active', isCurrent);
        card.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      });
    }

    function startAutoFlow() {
      stopAutoFlow();
      if (prefersReducedMotion || isUserInteracting) return;

      autoFlowTimer = setInterval(() => {
        if (!isUserInteracting) {
          activeIndex = (activeIndex + 1) % cards.length;
          setActiveCard(activeIndex, false);
        }
      }, CYCLE_INTERVAL);
    }

    function stopAutoFlow() {
      if (autoFlowTimer) {
        clearInterval(autoFlowTimer);
        autoFlowTimer = null;
      }
    }

    // Set initial active card
    setActiveCard(0);
    startAutoFlow();

    // Attach interaction handlers per card
    cards.forEach((card, index) => {
      const suspension = card.closest('.card-suspension');
      const baseRestAngle = parseFloat(suspension?.style.getPropertyValue('--rest-angle') || '0');

      // Mouse Enter: Highlight immediately & pause auto-flow
      card.addEventListener('mouseenter', () => {
        isUserInteracting = true;
        stopAutoFlow();
        setActiveCard(index, true);
      });

      // Subtle Micro-tilt on Mouse Move
      card.addEventListener('mousemove', (e) => {
        if (prefersReducedMotion || !suspension) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const normalizedX = (x / rect.width) - 0.5; // -0.5 to +0.5
        const tiltDelta = normalizedX * 2.2; // subtle +/- 1.1deg swing

        suspension.style.transform = `translateY(calc(var(--sag-offset, 0px) - 6px)) rotate(${baseRestAngle + tiltDelta}deg)`;
      });

      // Mouse Leave: Settle suspension & resume unhurried cycle
      card.addEventListener('mouseleave', () => {
        if (suspension) {
          suspension.style.transform = `translateY(var(--sag-offset, 0px)) rotate(${baseRestAngle}deg)`;
        }
      });

      // Focus Accessibility (keyboard navigation)
      card.addEventListener('focusin', () => {
        isUserInteracting = true;
        stopAutoFlow();
        setActiveCard(index, true);
      });

      card.addEventListener('focusout', () => {
        isUserInteracting = false;
        startAutoFlow();
      });
    });

    // When mouse completely leaves the hanging stage
    stage.addEventListener('mouseleave', () => {
      isUserInteracting = false;
      startAutoFlow();
    });
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHangingCards);
  } else {
    initHangingCards();
  }

  window.initHangingCards = initHangingCards;
})();
