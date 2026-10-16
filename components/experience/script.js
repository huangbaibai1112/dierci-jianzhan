/**
 * The Experience Interactive Behavior Controller
 * 6-Stage chronometer navigation, audio voice prompt simulator, and daylight itinerary calculator.
 */
(function() {
  'use strict';

  // 1. Stage Tab Controller (The 24-Hour Chronometer)
  var stageTabs = Array.from(document.querySelectorAll('.stage-tab-btn'));
  var panels = Array.from(document.querySelectorAll('.exp-panel-view'));

  if (stageTabs.length > 0 && panels.length > 0) {
    stageTabs.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var stageId = btn.getAttribute('data-stage');

        // Update tab states
        stageTabs.forEach(function(b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');

        // Update panel visibility
        panels.forEach(function(p) {
          p.classList.remove('is-active');
          p.setAttribute('hidden', '');
        });

        var targetPanel = document.getElementById('exp-panel-' + stageId);
        if (targetPanel) {
          targetPanel.classList.add('is-active');
          targetPanel.removeAttribute('hidden');
        }
      });
    });
  }

  // 2. Morning Batch Simulator Actions
  var passBtn = document.getElementById('simPassBtn');
  var likeBtn = document.getElementById('simLikeBtn');
  var simCounter = document.querySelector('.sim-counter');

  var sampleProfiles = [
    {
      initial: 'E',
      name: 'Eleanor M.',
      age: 'Age 61',
      city: 'Portland, OR',
      occupation: 'Retired Park Architect & Botanical Volunteer',
      bio: 'Looking for an honest companion to share unhurried weekend walks through historic neighborhoods, quiet museum afternoons, and conversations over good tea.',
      tags: ['Botanical Gardens', 'Classical Concerts', 'Morning Espresso', 'Non-Smoker', 'Selfie Verified']
    },
    {
      initial: 'H',
      name: 'Harold B.',
      age: 'Age 64',
      city: 'Seattle, WA',
      occupation: 'Former High School Principal & Woodworker',
      bio: 'Enjoy classical guitar, Saturday farmers markets, and cooking unhurried dinners. Hoping for thoughtful conversation and genuine friendship.',
      tags: ['Woodworking', 'Acoustic Folk', 'Historic Fiction', 'Active Hiker', 'Video Verified']
    },
    {
      initial: 'C',
      name: 'Clara S.',
      age: 'Age 58',
      city: 'San Francisco, CA',
      occupation: 'Independent Book Editor & Ceramic Artist',
      bio: 'Drawn to morning coastal walks, black-and-white photography, and sincere discussions. Appreciate kindness, wit, and emotional maturity.',
      tags: ['Ceramics', 'Independent Cinema', 'Coastal Walks', 'Tea Enthusiast', 'Selfie Verified']
    }
  ];

  var currentIndex = 0;

  function renderProfile(idx) {
    var p = sampleProfiles[idx];
    if (!p) return;

    var avatarBox = document.querySelector('.sim-avatar-letter');
    var nameEl = document.querySelector('.sim-name');
    var ageEl = document.querySelector('.sim-age');
    var cityEl = document.querySelector('.sim-city');
    var occEl = document.querySelector('.sim-occupation');
    var bioEl = document.querySelector('.sim-bio-snippet');
    var tagsStrip = document.querySelector('.sim-tags-strip');

    if (avatarBox) avatarBox.textContent = p.initial;
    if (nameEl) nameEl.textContent = p.name;
    if (ageEl) ageEl.textContent = p.age;
    if (cityEl) cityEl.textContent = '· ' + p.city;
    if (occEl) occEl.textContent = p.occupation;
    if (bioEl) bioEl.innerHTML = '&ldquo;' + p.bio + '&rdquo;';

    if (tagsStrip) {
      tagsStrip.innerHTML = '';
      p.tags.forEach(function(tag) {
        var span = document.createElement('span');
        span.className = 'stag';
        span.textContent = tag;
        tagsStrip.appendChild(span);
      });
    }

    if (simCounter) {
      simCounter.textContent = 'PROFILE ' + (idx + 1) + ' OF ' + sampleProfiles.length + ' IN MORNING SELECTION';
    }
  }

  function advanceProfile() {
    currentIndex = (currentIndex + 1) % sampleProfiles.length;
    renderProfile(currentIndex);
  }

  if (passBtn) {
    passBtn.addEventListener('click', function() {
      advanceProfile();
    });
  }

  if (likeBtn) {
    likeBtn.addEventListener('click', function() {
      advanceProfile();
    });
  }

  // 3. Audio Voice Prompt Simulator
  var audioSim = document.getElementById('audioPlayerSim');
  var audioToggle = document.getElementById('audioPlayToggle');
  var playIcon = document.getElementById('playIcon');
  var audioTimer = document.getElementById('audioTimer');
  var audioStatusText = document.getElementById('audioStatusText');
  var waveformBars = document.getElementById('waveformBars');
  var isAudioPlaying = false;
  var audioInterval = null;
  var playSeconds = 0;

  if (audioToggle && audioSim) {
    audioToggle.addEventListener('click', function() {
      if (isAudioPlaying) {
        // Pause
        isAudioPlaying = false;
        clearInterval(audioInterval);
        audioSim.classList.remove('is-playing');
        if (waveformBars) waveformBars.classList.remove('is-playing');
        if (playIcon) playIcon.innerHTML = '&#x25B6;';
        if (audioStatusText) audioStatusText.textContent = 'Playback paused';
      } else {
        // Play
        isAudioPlaying = true;
        audioSim.classList.add('is-playing');
        if (waveformBars) waveformBars.classList.add('is-playing');
        if (playIcon) playIcon.innerHTML = '&#x23F8;';
        if (audioStatusText) audioStatusText.textContent = 'Playing voice introduction sample (18 seconds)...';

        audioInterval = setInterval(function() {
          playSeconds++;
          if (playSeconds > 18) {
            playSeconds = 0;
            isAudioPlaying = false;
            clearInterval(audioInterval);
            audioSim.classList.remove('is-playing');
            if (waveformBars) waveformBars.classList.remove('is-playing');
            if (playIcon) playIcon.innerHTML = '&#x25B6;';
            if (audioStatusText) audioStatusText.textContent = 'Sample finished playing. Press play to repeat.';
            if (audioTimer) audioTimer.textContent = '0:18 / 0:18';
            return;
          }
          var formatted = '0:' + (playSeconds < 10 ? '0' + playSeconds : playSeconds);
          if (audioTimer) audioTimer.textContent = formatted + ' / 0:18';
        }, 1000);
      }
    });
  }

  // 4. Interactive Daylight Meetup Itinerary Calculator
  var venueSelect = document.getElementById('venueSelect');
  var timeSelect = document.getElementById('timeSelect');
  var planTiming = document.getElementById('planTiming');
  var planTitle = document.getElementById('planTitle');
  var calculatePlanBtn = document.getElementById('calculatePlanBtn');

  var itineraries = {
    botanical: {
      title: 'Botanical Garden Tea Pavilion',
      desc: 'Meet near the main conservatory reception desk. Stroll leisurely past the glasshouse flora before finding a quiet courtyard table for herbal tea. Arrive independently; conclude gracefully after 45 minutes.'
    },
    museum: {
      title: 'Fine Arts Museum Espresso Rendezvous',
      desc: 'Meet by the sculpture garden courtyard adjacent to the museum espresso bar. Review a favorite exhibition wing before sitting down for coffee. Self-driven arrival and departures.'
    },
    library: {
      title: 'Historic Independent Bookstore Corner',
      desc: 'Meet in the reading room mezzanine tea salon. Quiet acoustics and natural lighting support unhurried conversation centered around literature and shared passions.'
    },
    artisan: {
      title: 'Artisan Bakery Daytime Rendezvous',
      desc: 'Meet at a corner booth in a well-patronized neighborhood bakery. Enjoy fresh pastry and unhurried conversation with ample public ambiance and easy street parking.'
    }
  };

  var timings = {
    morning: '10:30 AM – 11:15 AM (45 Minutes)',
    lunch: '12:30 PM – 01:15 PM (45 Minutes)',
    afternoon: '02:30 PM – 03:15 PM (45 Minutes)'
  };

  function updateItinerary() {
    var v = venueSelect ? venueSelect.value : 'museum';
    var t = timeSelect ? timeSelect.value : 'lunch';

    var plan = itineraries[v] || itineraries.museum;
    var timing = timings[t] || timings.lunch;

    if (planTiming) planTiming.textContent = timing;
    if (planTitle) planTitle.textContent = plan.title;
  }

  if (venueSelect) venueSelect.addEventListener('change', updateItinerary);
  if (timeSelect) timeSelect.addEventListener('change', updateItinerary);
  if (calculatePlanBtn) calculatePlanBtn.addEventListener('click', updateItinerary);

})();
