/**
 * Component: How It Works Interactive Behavior
 * Unified Master Stage Controller & Tactile Simulations
 */
(function() {
  'use strict';

  // 1. Master Console Phase Switcher (Dossier, Dispatch, Acoustic, Daylight, Ledger)
  var navPills = document.querySelectorAll('.stage-nav-pill');
  var viewPanels = document.querySelectorAll('.stage-view-panel');
  var stageEl = document.getElementById('masterLivingStage');

  function switchPhase(phaseId, scrollIntoView) {
    var targetPanelId = 'view-' + phaseId;

    // Update Nav Pills
    navPills.forEach(function(pill) {
      if (pill.getAttribute('data-phase') === phaseId) {
        pill.classList.add('is-active');
        pill.setAttribute('aria-selected', 'true');
      } else {
        pill.classList.remove('is-active');
        pill.setAttribute('aria-selected', 'false');
      }
    });

    // Update Stage Panels
    viewPanels.forEach(function(panel) {
      if (panel.id === targetPanelId) {
        panel.classList.add('is-active');
        panel.removeAttribute('hidden');
      } else {
        panel.classList.remove('is-active');
        panel.setAttribute('hidden', 'true');
      }
    });

    if (scrollIntoView && stageEl) {
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navPills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      var phase = this.getAttribute('data-phase');
      switchPhase(phase, false);
    });
  });

  // Next Phase Button Handlers
  document.querySelectorAll('.btn-console-next').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var nextPhase = this.getAttribute('data-next-phase');
      if (nextPhase) {
        switchPhase(nextPhase, true);
      }
    });
  });


  // 2. Phase 02 Curation Switcher (Eleanor, Arthur, Clara)
  var subtabs = document.querySelectorAll('.ribbon-tab');
  var subcards = document.querySelectorAll('.letterpress-card');

  subtabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var targetId = 'subcard-' + this.getAttribute('data-tab');

      subtabs.forEach(function(t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('is-active');
      this.setAttribute('aria-selected', 'true');

      subcards.forEach(function(card) {
        if (card.id === targetId) {
          card.classList.add('is-active');
          card.removeAttribute('hidden');
        } else {
          card.classList.remove('is-active');
          card.setAttribute('hidden', 'true');
        }
      });
    });
  });


  // 3. Rewind Dial Simulation
  var rewindBtn = document.getElementById('rewindDialBtn');
  var rewindStatus = document.getElementById('rewindStatusText');
  var dialCap = document.querySelector('.dial-center-cap');

  if (rewindBtn && rewindStatus && dialCap) {
    var isRewinding = false;
    rewindBtn.addEventListener('click', function() {
      if (isRewinding) return;
      isRewinding = true;

      dialCap.style.transform = 'rotate(-720deg)';
      rewindStatus.textContent = 'Retrieving yesterday\u2019s passed recommendation...';
      rewindStatus.style.color = '#E94266';

      setTimeout(function() {
        dialCap.style.transform = 'rotate(0deg)';
        rewindStatus.textContent = '\u2713 Successfully restored Arthur, 64 to your batch!';
        rewindStatus.style.color = '#27AE60';

        setTimeout(function() {
          rewindStatus.textContent = 'Click to Rewind Yesterday\u2019s Batch';
          rewindStatus.style.color = '';
          isRewinding = false;
        }, 3500);
      }, 700);
    });
  }


  // 4. Acoustic Voice Note Player Simulation
  var playBtn = document.getElementById('voicePlayBtn');
  var playIcon = document.getElementById('playIconSpan');
  var grooveStation = document.querySelector('.voice-groove-station');
  var scrubFill = document.getElementById('scrubFillBar');
  var currentTimeEl = document.getElementById('currentTime');

  if (playBtn && playIcon && grooveStation && scrubFill && currentTimeEl) {
    var isPlaying = false;
    var timerId = null;
    var currentSeconds = 5;
    var totalSeconds = 14;

    function formatTime(s) {
      return '0:' + (s < 10 ? '0' + s : s);
    }

    playBtn.addEventListener('click', function() {
      isPlaying = !isPlaying;

      if (isPlaying) {
        grooveStation.classList.add('is-playing');
        playIcon.textContent = '\u23F8'; // Pause icon
        timerId = setInterval(function() {
          currentSeconds++;
          if (currentSeconds > totalSeconds) {
            currentSeconds = 0;
          }
          currentTimeEl.textContent = formatTime(currentSeconds);
          scrubFill.style.width = Math.round((currentSeconds / totalSeconds) * 100) + '%';
        }, 1000);
      } else {
        grooveStation.classList.remove('is-playing');
        playIcon.textContent = '\u25B6'; // Play icon
        clearInterval(timerId);
      }
    });
  }


  // 5. Mock Curation Actions
  document.querySelectorAll('[data-action="mock-pass"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var originalText = this.querySelector('span:last-child').textContent;
      var span = this.querySelector('span:last-child');
      span.textContent = 'Passed (Stored in Rewind)';
      this.style.opacity = '0.6';
      setTimeout(function() {
        span.textContent = originalText;
        btn.style.opacity = '1';
      }, 2000);
    });
  });

  document.querySelectorAll('[data-action="mock-wink"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var span = this.querySelector('span:last-child');
      span.textContent = '\u2713 Warm Wink Sent!';
      this.style.background = '#DCFCE7';
      this.style.color = '#15803D';
      setTimeout(function() {
        span.textContent = 'Send Warm Wink';
        btn.style.background = '';
        btn.style.color = '';
      }, 2500);
    });
  });


  // 6. Mock Call Shield Decline
  var declineBtn = document.querySelector('[data-action="mock-decline"]');
  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      var parent = this.closest('.shield-call-screen');
      if (parent) {
        var callStatus = parent.querySelector('.cs-call-type');
        if (callStatus) {
          callStatus.textContent = '\u2715 Call Ended Privately & Silenced';
          callStatus.style.color = '#F87171';
          setTimeout(function() {
            callStatus.textContent = 'Encrypted In-App Audio Call';
            callStatus.style.color = '#94A3B8';
          }, 3000);
        }
      }
    });
  }


  // 7. Global Conversion Emitter
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
