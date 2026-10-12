/**
 * Film Component Interactive Story Player
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
  var totalScenes = 4;
  var sceneDuration = 5500; // 5.5 seconds per chapter
  var totalDuration = totalScenes * sceneDuration; // 22 seconds total cycle

  var currentTime = 0; // ms in loop: 0 to totalDuration
  var isPlaying = true;
  var rafId = null;
  var lastTimestamp = null;

  var iconPlay = playBtn.querySelector('.icon-play');
  var iconPause = playBtn.querySelector('.icon-pause');
  var tallyNumberEl = document.getElementById('filmTallyNumber');

  var chapterNames = [
    'The Old Way',
    'Paywalls & Noise',
    'Curated for 50+',
    'Genuine Pacing'
  ];

  function updateTallyCounter(sceneOffset) {
    if (!tallyNumberEl) return;
    if (currentScene === 0) {
      // In Scene 0, count up from 0 to 26 matches over the first 2.4 seconds
      var countTarget = Math.min(26, Math.floor((sceneOffset / 2400) * 26));
      var currentVal = parseInt(tallyNumberEl.textContent, 10) || 0;
      if (countTarget !== currentVal) {
        tallyNumberEl.textContent = countTarget;
        tallyNumberEl.classList.remove('bump');
        void tallyNumberEl.offsetWidth; // trigger reflow
        tallyNumberEl.classList.add('bump');
      }
    } else {
      if (tallyNumberEl.textContent !== '0') {
        tallyNumberEl.textContent = '0';
      }
    }
  }

  function applySceneUI(sceneIndex) {
    if (sceneIndex < 0) sceneIndex = 0;
    if (sceneIndex >= totalScenes) sceneIndex = totalScenes - 1;
    currentScene = sceneIndex;

    stage.setAttribute('data-current-scene', currentScene);
    if (currentScene >= 2) {
      stage.classList.add('f-paper');
    } else {
      stage.classList.remove('f-paper');
    }

    if (tallyNumberEl && currentScene === 0) {
      tallyNumberEl.textContent = '0';
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

    // If tab woke from sleep or inactive for > 2s, don't jump massively
    if (delta > 2000) {
      delta = 16.6;
    } else {
      // Normal frame, cap to 250ms max to catch up gracefully without freezing
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

  // Prev button (if already more than 1.5s into current scene, rewind to start of scene; else jump to prev scene)
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

    // Keyboard accessibility: Left / Right arrows & Space
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

  // Tab visibility changes (pause RAF when hidden to save battery & prevent time warp)
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
