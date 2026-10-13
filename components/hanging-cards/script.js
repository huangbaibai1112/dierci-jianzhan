/**
 * Hanging ID Badge Cards - Interactive Controller
 * Features:
 * - 3D Click / Tap Card Flip with Physical Pendulum Kick
 * - Real-time Holographic Prism Shimmer & Glare Tracking
 * - Responsive Touch & Keyboard Accessibility
 */

(function () {
  'use strict';

  function initHangingCards() {
    const stage = document.getElementById('hangingStage');
    if (!stage) return;

    const cards = stage.querySelectorAll('.hanging-card');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cards.forEach((card) => {
      const flipper = card.querySelector('.card-flipper');
      const suspension = card.closest('.card-suspension');
      const baseRestAngle = parseFloat(suspension?.style.getPropertyValue('--rest-angle') || '0');

      let isFlipped = false;
      let isHovered = false;

      // 1. Flip Trigger Function
      function triggerFlip(e) {
        // Prevent default if triggered via keyboard to prevent page scrolling
        if (e && e.type === 'keydown' && (e.key === ' ' || e.key === 'Spacebar')) {
          e.preventDefault();
        }

        isFlipped = !isFlipped;
        card.classList.toggle('is-flipped', isFlipped);
        card.setAttribute('aria-expanded', isFlipped ? 'true' : 'false');

        // Physical swing kick impulse on flip
        if (!prefersReducedMotion && suspension) {
          const impulseAngle = isFlipped ? baseRestAngle + 3.5 : baseRestAngle - 3.5;
          suspension.style.transition = 'transform 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)';
          suspension.style.transform = `translateY(var(--sag-offset, 0px)) rotate(${impulseAngle}deg)`;

          setTimeout(() => {
            suspension.style.transition = 'transform 0.8s cubic-bezier(0.25, 1.3, 0.5, 1)';
            suspension.style.transform = `translateY(var(--sag-offset, 0px)) rotate(${baseRestAngle}deg)`;
          }, 240);
        }
      }

      // Click / Tap listener
      card.addEventListener('click', (e) => {
        // Don't trigger flip if user clicked directly on an email link
        if (e.target.closest('a')) return;
        triggerFlip(e);
      });

      // Keyboard accessible flip
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          triggerFlip(e);
        }
      });

      // 2. Mouse Move: Hologram Shimmer & Micro 3D Parallax Tilt
      card.addEventListener('mouseenter', () => {
        isHovered = true;
      });

      card.addEventListener('mousemove', (e) => {
        if (prefersReducedMotion) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Normalized percentages (0% to 100%)
        const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const py = Math.max(0, Math.min(100, (y / rect.height) * 100));

        // Update holographic shimmer coordinates
        card.style.setProperty('--mouse-x', `${px.toFixed(1)}%`);
        card.style.setProperty('--mouse-y', `${py.toFixed(1)}%`);
        card.style.setProperty('--shimmer-tilt', `${((px - 50) * 0.9).toFixed(1)}deg`);

        // Subtle dynamic 3D tilt
        const tiltX = (((py - 50) / 50) * -5.5).toFixed(2);
        const tiltY = (((px - 50) / 50) * 5.5).toFixed(2);

        if (flipper) {
          const rotY = isFlipped ? 180 + parseFloat(tiltY) : parseFloat(tiltY);
          flipper.style.transform = `rotateX(${tiltX}deg) rotateY(${rotY}deg)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        isHovered = false;
        // Smoothly settle flipper transform back to natural orientation
        if (flipper) {
          flipper.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
        }
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '40%');
        card.style.setProperty('--shimmer-tilt', '0deg');
      });
    });
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHangingCards);
  } else {
    initHangingCards();
  }

  // Export for external initializers if needed
  window.initHangingCards = initHangingCards;
})();
