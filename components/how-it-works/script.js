/**
 * Component: How It Works - Platform Manual & Operating Guide
 * Interactive 1:1 Hardware Simulator, Step Sequencer & Engineering Teardown Controller
 */
(function() {
  'use strict';

  var currentStep = 1;
  var totalSteps = 6;

  var stepButtons = document.querySelectorAll('.wnav-step-item');
  var screenViews = document.querySelectorAll('.device-screen-view');
  var teardownCards = document.querySelectorAll('.teardown-card');
  var stepCounter = document.getElementById('stepCounterDisplay');
  var prevBtn = document.getElementById('prevStepBtn');
  var nextBtn = document.getElementById('nextStepBtn');

  function setStep(index) {
    if (index < 1 || index > totalSteps) return;
    currentStep = index;

    // 1. Update step selector buttons
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

    // 2. Update 1:1 Phone screen view
    screenViews.forEach(function(view) {
      if (view.id === 'screen-view-' + currentStep) {
        view.classList.add('is-active');
        view.removeAttribute('hidden');
      } else {
        view.classList.remove('is-active');
        view.setAttribute('hidden', 'true');
      }
    });

    // 3. Update Engineering Teardown Dossier
    teardownCards.forEach(function(card) {
      if (card.id === 'dossier-step-' + currentStep) {
        card.classList.add('is-active');
        card.removeAttribute('hidden');
      } else {
        card.classList.remove('is-active');
        card.setAttribute('hidden', 'true');
      }
    });

    // 4. Update counter display
    if (stepCounter) {
      var pad = currentStep < 10 ? '0' + currentStep : currentStep;
      stepCounter.textContent = 'STEP ' + pad + ' OF 06';
    }

    // 5. Update prev/next button states
    if (prevBtn) {
      prevBtn.disabled = (currentStep === 1);
    }
    if (nextBtn) {
      prevBtn.disabled = (currentStep === 1);
      nextBtn.disabled = (currentStep === totalSteps);
      if (currentStep === totalSteps) {
        nextBtn.textContent = 'All Steps Reviewed \u2713';
      } else {
        nextBtn.textContent = 'Next Step \u2192';
      }
    }

    // Reset any active highlights
    clearHighlights();
  }

  function clearHighlights() {
    document.querySelectorAll('.hotspot-pin.is-highlighted').forEach(function(pin) {
      pin.classList.remove('is-highlighted');
    });
    document.querySelectorAll('.td-callout-item.is-highlighted').forEach(function(item) {
      item.classList.remove('is-highlighted');
    });
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

  // Cross-Highlighting: Synchronize Hotspot Pins & Teardown Callout Cards
  function initCrossHighlighting() {
    var workbench = document.getElementById('workbenchShell');
    if (!workbench) return;

    // Hover or click on Callout Card -> highlight corresponding Pin on Phone
    workbench.addEventListener('mouseover', function(e) {
      var callout = e.target.closest('.td-callout-item');
      if (callout) {
        var pinId = callout.getAttribute('data-target-pin');
        var activeScreen = document.getElementById('screen-view-' + currentStep);
        if (activeScreen) {
          var pin = activeScreen.querySelector('.hotspot-pin[data-pin="' + pinId + '"]');
          if (pin) pin.classList.add('is-highlighted');
        }
      }
    });

    workbench.addEventListener('mouseout', function(e) {
      var callout = e.target.closest('.td-callout-item');
      if (callout) {
        var pinId = callout.getAttribute('data-target-pin');
        var activeScreen = document.getElementById('screen-view-' + currentStep);
        if (activeScreen) {
          var pin = activeScreen.querySelector('.hotspot-pin[data-pin="' + pinId + '"]');
          if (pin) pin.classList.remove('is-highlighted');
        }
      }
    });

    // Hover or click on Pin on Phone -> highlight corresponding Callout Card
    workbench.addEventListener('mouseover', function(e) {
      var pin = e.target.closest('.hotspot-pin');
      if (pin) {
        var pinId = pin.getAttribute('data-pin');
        var activeDossier = document.getElementById('dossier-step-' + currentStep);
        if (activeDossier) {
          var callout = activeDossier.querySelector('.td-callout-item[data-target-pin="' + pinId + '"]');
          if (callout) callout.classList.add('is-highlighted');
        }
      }
    });

    workbench.addEventListener('mouseout', function(e) {
      var pin = e.target.closest('.hotspot-pin');
      if (pin) {
        var pinId = pin.getAttribute('data-pin');
        var activeDossier = document.getElementById('dossier-step-' + currentStep);
        if (activeDossier) {
          var callout = activeDossier.querySelector('.td-callout-item[data-target-pin="' + pinId + '"]');
          if (callout) callout.classList.remove('is-highlighted');
        }
      }
    });

    // Touch support / click toggle
    workbench.addEventListener('click', function(e) {
      var pin = e.target.closest('.hotspot-pin');
      if (pin) {
        var pinId = pin.getAttribute('data-pin');
        var activeDossier = document.getElementById('dossier-step-' + currentStep);
        if (activeDossier) {
          clearHighlights();
          pin.classList.add('is-highlighted');
          var callout = activeDossier.querySelector('.td-callout-item[data-target-pin="' + pinId + '"]');
          if (callout) {
            callout.classList.add('is-highlighted');
            callout.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    });
  }

  initCrossHighlighting();

  // Keyboard navigation for power users
  document.addEventListener('keydown', function(e) {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowRight' && currentStep < totalSteps) {
      setStep(currentStep + 1);
    } else if (e.key === 'ArrowLeft' && currentStep > 1) {
      setStep(currentStep - 1);
    }
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
