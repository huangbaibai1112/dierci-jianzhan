/**
 * Component: How It Works - Platform Manual & Operating Guide
 * Interactive Device Workbench Simulator & Step Controller
 */
(function() {
  'use strict';

  var currentStep = 1;
  var totalSteps = 6;

  var stepButtons = document.querySelectorAll('.wnav-step-item');
  var screenViews = document.querySelectorAll('.device-screen-view');
  var stepCounter = document.getElementById('stepCounterDisplay');
  var prevBtn = document.getElementById('prevStepBtn');
  var nextBtn = document.getElementById('nextStepBtn');

  function setStep(index) {
    if (index < 1 || index > totalSteps) return;
    currentStep = index;

    // Update buttons state
    stepButtons.forEach(function(btn) {
      var s = parseInt(btn.getAttribute('data-step'), 10);
      if (s === currentStep) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Update screen views
    screenViews.forEach(function(view) {
      if (view.id === 'screen-view-' + currentStep) {
        view.classList.add('is-active');
        view.removeAttribute('hidden');
      } else {
        view.classList.remove('is-active');
        view.setAttribute('hidden', 'true');
      }
    });

    // Update counter display
    if (stepCounter) {
      var pad = currentStep < 10 ? '0' + currentStep : currentStep;
      stepCounter.textContent = 'STEP ' + pad + ' OF 06';
    }

    // Update prev/next button states
    if (prevBtn) {
      prevBtn.disabled = (currentStep === 1);
    }
    if (nextBtn) {
      nextBtn.disabled = (currentStep === totalSteps);
      if (currentStep === totalSteps) {
        nextBtn.textContent = 'All Steps Reviewed \u2713';
      } else {
        nextBtn.textContent = 'Next Step \u2192';
      }
    }
  }

  // Bind step list buttons
  stepButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var s = parseInt(this.getAttribute('data-step'), 10);
      setStep(s);
    });
  });

  // Bind next/prev controls
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (currentStep > 1) {
        setStep(currentStep - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (currentStep < totalSteps) {
        setStep(currentStep + 1);
      }
    });
  }

  // Hotspot pin click interactions on touch devices
  var pins = document.querySelectorAll('.hotspot-pin');
  pins.forEach(function(pin) {
    pin.addEventListener('click', function(e) {
      e.stopPropagation();
      var popup = this.querySelector('.pin-popup');
      if (popup) {
        var isOpen = popup.style.opacity === '1';
        // Close all popups
        document.querySelectorAll('.pin-popup').forEach(function(p) {
          p.style.opacity = '';
        });
        if (!isOpen) {
          popup.style.opacity = '1';
          popup.style.transform = 'translateX(-50%) translateY(-6px)';
        }
      }
    });
  });

  document.addEventListener('click', function() {
    document.querySelectorAll('.pin-popup').forEach(function(p) {
      p.style.opacity = '';
      p.style.transform = '';
    });
  });

  // Global Conversion Emitter
  var actionBtns = document.querySelectorAll('.how-it-works-page [data-action="join-partner"]');
  actionBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var source = this.getAttribute('data-source') || 'operating_manual';
      if (window.EventBus) {
        window.EventBus.emit('cta:click', { source: source });
      }
    });
  });

})();
