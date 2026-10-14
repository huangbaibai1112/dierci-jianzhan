/**
 * Component: How It Works Interactive Behavior
 * Handcrafted tactile interactions: Curation tabs, Rewind dial, Voice player, Call shield
 */
(function() {
  'use strict';

  // 1. Curation Tab Ribbon Switcher (Eleanor, Arthur, Clara)
  var tabs = document.querySelectorAll('.ribbon-tab');
  var cards = document.querySelectorAll('.letterpress-card');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var targetId = 'card-' + this.getAttribute('data-tab');

      // Update tabs state
      tabs.forEach(function(t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('is-active');
      this.setAttribute('aria-selected', 'true');

      // Update card panels
      cards.forEach(function(card) {
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

  // 2. Rewind Dial Simulation
  var rewindBtn = document.getElementById('rewindDialBtn');
  var rewindStatus = document.getElementById('rewindStatusText');
  var dialCap = document.querySelector('.dial-center-cap');

  if (rewindBtn && rewindStatus && dialCap) {
    var isRewinding = false;
    rewindBtn.addEventListener('click', function() {
      if (isRewinding) return;
      isRewinding = true;

      // Animate dial rotation
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

  // 3. Acoustic Voice Note Player Simulation
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

  // 4. Mock Curation Tray Actions (Pass / Wink feedback)
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

  // 5. Mock Call Shield Decline
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

  // 6. Global Conversion Action Emitter
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
