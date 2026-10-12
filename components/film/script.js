/**
 * Film Component Interactive Story Player (6 Comprehensive Chapters)
 * Controls play/pause, chapter stepping, and continuous real-time timeline progression.
 * Automatically advances smoothly across chapters in real-time.
 */
(function() {
  'use strict';

  var stage = document.getElementById('filmStage');
  var prevBtn = document.getElementById('filmPrevBtn');
  var playBtn = document.getElementById('filmPlayBtn');
  var progressFill = document.getElementById('filmProgressFill');
  var timeline = document.getElementById('filmTimeline');
  var segments = document.querySelectorAll('.timeline-segment');
  
  if (!stage || !playBtn) return;

  var currentScene = 0;
  var totalScenes = 6;
  var sceneDuration = 5200; // 5.2 seconds per chapter
  var totalDuration = totalScenes * sceneDuration; // 31.2 seconds total cycle

  var currentTime = 0; // ms in loop: 0 to totalDuration
  var isPlaying = true;
  var rafId = null;
  var lastTimestamp = null;

  var iconPlay = playBtn.querySelector('.icon-play');
  var iconPause = playBtn.querySelector('.icon-pause');
  var tallyNumberEl = document.getElementById('filmTallyNumber');

  var chapterNames = [
    'Curated Daily Picks',
    'Age 50–99 Filters',
    'In-Depth Profiles',
    'Voice Connection',
    'Conversation Starters',
    '1-on-1 Coffee & Tea'
  ];

  function updateTallyCounter(sceneOffset) {
    if (!tallyNumberEl) return;
    if (currentScene === 0) {
      // In Scene 0 (Daily Picks), count up from 1 to 3 curated intros over first 1.8s
      var countTarget = Math.max(1, Math.min(3, Math.floor((sceneOffset / 1800) * 3) + 1));
      var currentVal = parseInt(tallyNumberEl.textContent, 10) || 1;
      if (countTarget !== currentVal) {
        tallyNumberEl.textContent = countTarget;
        tallyNumberEl.classList.remove('bump');
        void tallyNumberEl.offsetWidth; // trigger reflow
        tallyNumberEl.classList.add('bump');
      }
    } else {
      if (tallyNumberEl.textContent !== '3') {
        tallyNumberEl.textContent = '3';
      }
    }
  }

  function applySceneUI(sceneIndex) {
    if (sceneIndex < 0) sceneIndex = 0;
    if (sceneIndex >= totalScenes) sceneIndex = totalScenes - 1;
    currentScene = sceneIndex;

    stage.setAttribute('data-current-scene', currentScene);
    // All 6 scenes share the cohesive, continuous master cinema atmosphere

    if (tallyNumberEl && currentScene === 0) {
      tallyNumberEl.textContent = '1';
    }

    // Update narrative copy with clean animation reset
    var copies = stage.querySelectorAll('.scene-copy');
    copies.forEach(function(el) {
      var isTarget = parseInt(el.getAttribute('data-scene-index'), 10) === currentScene;
      if (isTarget) {
        el.classList.remove('active');
        // Force reflow so transitions re-trigger smoothly
        void el.offsetWidth;
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update phone screens
    var screens = stage.querySelectorAll('.phone-screen-view');
    screens.forEach(function(el) {
      if (parseInt(el.getAttribute('data-screen-for'), 10) === currentScene) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update segment active states
    segments.forEach(function(seg, i) {
      if (i === currentScene) {
        seg.classList.add('active');
      } else {
        seg.classList.remove('active');
      }
    });

    if (timeline) {
      timeline.setAttribute('aria-valuetext', 'Chapter ' + (currentScene + 1) + ' of ' + totalScenes + ': ' + chapterNames[currentScene]);
    }
  }

  function renderProgress(ratio) {
    if (progressFill) {
      var clamped = Math.max(0, Math.min(1, ratio));
      progressFill.style.transform = 'scaleX(' + clamped + ')';
    }
    if (timeline) {
      timeline.setAttribute('aria-valuenow', Math.round(ratio * 100));
    }
  }

  function loop(timestamp) {
    if (!isPlaying) return;

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      rafId = requestAnimationFrame(loop);
      return;
    }

    var delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (delta > 2000) {
      delta = 16.6;
    } else {
      delta = Math.min(delta, 250);
    }

    currentTime += delta;
    if (currentTime >= totalDuration) {
      currentTime = currentTime % totalDuration;
    }

    var newScene = Math.min(totalScenes - 1, Math.floor(currentTime / sceneDuration));
    if (newScene !== currentScene) {
      applySceneUI(newScene);
    }

    var sceneOffset = currentTime % sceneDuration;
    updateTallyCounter(sceneOffset);

    renderProgress(currentTime / totalDuration);

    rafId = requestAnimationFrame(loop);
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true;
    lastTimestamp = null;
    if (iconPlay && iconPause) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'inline-block';
    }
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    isPlaying = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTimestamp = null;
    if (iconPlay && iconPause) {
      iconPlay.style.display = 'inline-block';
      iconPause.style.display = 'none';
    }
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function jumpToScene(targetScene) {
    if (targetScene < 0) targetScene = totalScenes - 1;
    if (targetScene >= totalScenes) targetScene = 0;
    
    currentTime = targetScene * sceneDuration;
    lastTimestamp = null;
    applySceneUI(targetScene);
    updateTallyCounter(0);
    renderProgress(currentTime / totalDuration);
  }

  // Play/Pause button
  playBtn.addEventListener('click', togglePlay);

  // Prev button
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      var sceneOffset = currentTime % sceneDuration;
      if (sceneOffset > 1500) {
        jumpToScene(currentScene);
      } else {
        jumpToScene(currentScene - 1);
      }
    });
  }

  // Click on individual segment tick buttons
  segments.forEach(function(seg) {
    seg.addEventListener('click', function(e) {
      e.stopPropagation();
      var targetStep = parseInt(seg.getAttribute('data-step'), 10);
      if (!isNaN(targetStep)) {
        jumpToScene(targetStep);
      }
    });
  });

  // Click anywhere on timeline scrubber bar to scrub
  if (timeline) {
    timeline.addEventListener('click', function(e) {
      var rect = timeline.getBoundingClientRect();
      var clickX = e.clientX - rect.left;
      var ratio = Math.max(0, Math.min(1, clickX / rect.width));
      currentTime = ratio * totalDuration;
      var targetScene = Math.min(totalScenes - 1, Math.floor(currentTime / sceneDuration));
      lastTimestamp = null;
      applySceneUI(targetScene);
      renderProgress(ratio);
    });

    // Keyboard accessibility
    timeline.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        jumpToScene(currentScene + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        jumpToScene(currentScene - 1);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        togglePlay();
      }
    });
  }

  // Tab visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (isPlaying) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        lastTimestamp = null;
      }
    } else {
      if (isPlaying) {
        lastTimestamp = null;
        rafId = requestAnimationFrame(loop);
      }
    }
  });

  // Initialize playback immediately
  applySceneUI(0);
  renderProgress(0);
  isPlaying = true;
  rafId = requestAnimationFrame(loop);
})();
