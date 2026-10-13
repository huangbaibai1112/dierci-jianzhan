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
  var sceneDuration = 5800; // 5.8 seconds per chapter - relaxed, comfortable, unhurried cadence
  var totalDuration = totalScenes * sceneDuration; // 34.8 seconds total cycle

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

  // 13 Stratified candidate zones covering the entire stage background canvas
  // Guarantees balanced distribution without clumping while covering 100% of the canvas area
  var STAGE_ZONES = [
    // Top row (across entire stage width)
    { minX: 3,  maxX: 18, minY: 4,  maxY: 22 }, // Top-Left edge
    { minX: 20, maxX: 36, minY: 5,  maxY: 20 }, // Top-Left inner
    { minX: 38, maxX: 54, minY: 5,  maxY: 22 }, // Top-Gutter
    { minX: 56, maxX: 72, minY: 5,  maxY: 22 }, // Top-Right inner
    { minX: 74, maxX: 90, minY: 4,  maxY: 22 }, // Top-Right edge

    // Middle band (left flank, center gutter, right flank)
    { minX: 2,  maxX: 15, minY: 28, maxY: 56 }, // Mid-Left edge
    { minX: 38, maxX: 54, minY: 26, maxY: 60 }, // Mid-Gutter
    { minX: 82, maxX: 94, minY: 28, maxY: 60 }, // Mid-Right edge

    // Bottom row (across entire stage width)
    { minX: 3,  maxX: 18, minY: 68, maxY: 88 }, // Bot-Left edge
    { minX: 20, maxX: 36, minY: 70, maxY: 88 }, // Bot-Left inner
    { minX: 38, maxX: 54, minY: 68, maxY: 88 }, // Bot-Gutter
    { minX: 56, maxX: 72, minY: 70, maxY: 88 }, // Bot-Right inner
    { minX: 74, maxX: 90, minY: 68, maxY: 88 }  // Bot-Right edge
  ];

  function randomizeSceneElements(sceneIdx) {
    var motifEl = stage.querySelector('.motif-scene-' + sceneIdx);
    if (!motifEl) return;

    var items = motifEl.querySelectorAll('.dyn-motif-item');
    if (!items.length) return;

    // Shuffle candidate zones so each item receives a distinct zone across the canvas
    var shuffledZones = STAGE_ZONES.slice().sort(function() {
      return 0.5 - Math.random();
    });

    items.forEach(function(el, i) {
      var zone = shuffledZones[i % shuffledZones.length];
      var posX = zone.minX + Math.random() * (zone.maxX - zone.minX);
      var posY = zone.minY + Math.random() * (zone.maxY - zone.minY);

      // Position-aware kinetic motion dynamics ("根据位置来随机出现随机设"):
      // 1. Vertical physics based on spawn height:
      // - Upper elements (posY <= 35) float/glide downward into view; idle drifts downward
      // - Lower elements (posY >= 65) spring/hop upward into view; idle drifts upward
      // - Middle elements (35 < posY < 65) pop radially with elastic expansion
      var entranceY = 0;
      var driftY = 0;
      if (posY <= 35) {
        entranceY = -(22 + Math.floor(Math.random() * 24));
        driftY = 8 + Math.floor(Math.random() * 16);
      } else if (posY >= 65) {
        entranceY = 24 + Math.floor(Math.random() * 26);
        driftY = -(10 + Math.floor(Math.random() * 18));
      } else {
        entranceY = (Math.random() > 0.5 ? 1 : -1) * (14 + Math.floor(Math.random() * 16));
        driftY = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.floor(Math.random() * 14));
      }

      // 2. Horizontal physics based on spawn lateral position:
      // - Left elements (posX <= 32) drift inward towards right
      // - Right elements (posX >= 68) drift inward towards left, flanking phone
      // - Center elements (32 < posX < 68) sway laterally
      var entranceX = 0;
      var driftX = 0;
      if (posX <= 32) {
        entranceX = -(16 + Math.floor(Math.random() * 18));
        driftX = 6 + Math.floor(Math.random() * 16);
      } else if (posX >= 68) {
        entranceX = 16 + Math.floor(Math.random() * 18);
        driftX = -(6 + Math.floor(Math.random() * 16));
      } else {
        entranceX = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.floor(Math.random() * 14));
        driftX = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.floor(Math.random() * 14));
      }

      // 3. Orientation, scale & timing jitter:
      var baseRot = (posX < 50 ? -1 : 1) * (3 + Math.floor(Math.random() * 11)); // -14deg to +14deg
      var swing = 3 + Math.floor(Math.random() * 5); // 3deg to 7deg
      var scale = (0.86 + Math.random() * 0.28).toFixed(2); // 0.86 to 1.14
      var dur = (3.4 + Math.random() * 2.6).toFixed(2); // 3.4s to 6.0s
      var delay = Math.floor(50 + Math.random() * 520); // 50ms to 570ms
      var popDur = (0.64 + Math.random() * 0.22).toFixed(2); // 0.64s to 0.86s

      // Apply coordinates spanning the entire stage canvas
      el.style.left = posX.toFixed(1) + '%';
      el.style.top = posY.toFixed(1) + '%';
      el.style.right = 'auto';
      el.style.bottom = 'auto';

      // Apply dynamic kinetic CSS properties
      el.style.setProperty('--entrance-x', entranceX + 'px');
      el.style.setProperty('--entrance-y', entranceY + 'px');
      el.style.setProperty('--rnd-drift-x', driftX + 'px');
      el.style.setProperty('--rnd-drift-y', driftY + 'px');
      el.style.setProperty('--rnd-rot', baseRot + 'deg');
      el.style.setProperty('--rnd-swing', swing + 'deg');
      el.style.setProperty('--rnd-scale', scale);
      el.style.setProperty('--rnd-dur', dur + 's');
      el.style.setProperty('--pop-delay', delay + 'ms');
      el.style.setProperty('--pop-dur', popDur + 's');
    });

    // Re-trigger CSS animations smoothly
    motifEl.classList.remove('is-spawned');
    void motifEl.offsetWidth; // force reflow
    motifEl.classList.add('is-spawned');
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

    // 1. Update narrative copy with unhurried organic cadence and irregular delays
    var copies = stage.querySelectorAll('.scene-copy');
    copies.forEach(function(el) {
      var isTarget = parseInt(el.getAttribute('data-scene-index'), 10) === currentScene;
      if (isTarget) {
        el.classList.remove('active');

        // Ensure word tokens exist
        if (window.MotionEngine && window.MotionEngine.splitWords) {
          var titleEl = el.querySelector('.scene-title');
          if (titleEl && !titleEl.getAttribute('data-words-split')) {
            window.MotionEngine.splitWords(titleEl, 0);
          }
        }

        // Random organic jitter for kicker tag
        var kicker = el.querySelector('.scene-kicker');
        if (kicker) {
          var kickerDelay = 90 + Math.floor(Math.random() * 80); // 90ms - 170ms
          kicker.style.setProperty('--kicker-delay', kickerDelay + 'ms');
        }

        // Irregular, natural cadence across individual title words
        var words = el.querySelectorAll('.scene-title .w');
        var wordDelay = 180 + Math.floor(Math.random() * 60);
        words.forEach(function(w) {
          var step = 75 + Math.floor(Math.random() * 85); // 75ms - 160ms variation
          wordDelay += step;
          var wordDur = 780 + Math.floor(Math.random() * 140); // 780ms - 920ms unhurried duration
          w.style.setProperty('--word-delay', wordDelay + 'ms');
          w.style.setProperty('--word-duration', wordDur + 'ms');
        });

        // Unhurried description paragraph entrance
        var desc = el.querySelector('.scene-desc');
        var descDelay = Math.max(560, wordDelay - 140 + Math.floor(Math.random() * 100));
        if (desc) {
          desc.style.setProperty('--desc-delay', descDelay + 'ms');
        }

        // Stagger each chip individually with organic delay
        var chips = el.querySelectorAll('.scene-floating-chips > *');
        var chipDelay = (desc ? descDelay : 650) + 160;
        chips.forEach(function(chip) {
          chipDelay += 140 + Math.floor(Math.random() * 120);
          chip.style.setProperty('--chip-delay', chipDelay + 'ms');
        });

        // Force reflow so transitions re-trigger smoothly
        void el.offsetWidth;
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // 2. Update phone screens
    var screens = stage.querySelectorAll('.phone-screen-view');
    screens.forEach(function(el) {
      if (parseInt(el.getAttribute('data-screen-for'), 10) === currentScene) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // 3. Update right-side floating pill popups with random, irregular spring pop delays and position jitter
    var allPops = stage.querySelectorAll('.phone-scene-pops');
    allPops.forEach(function(popsEl) {
      popsEl.classList.remove('is-active');
    });

    var currentPops = stage.querySelector('.pops-scene-' + currentScene);
    if (currentPops) {
      var pills = currentPops.children;
      var baseDelays = [340, 920, 1540];
      for (var p = 0; p < pills.length; p++) {
        var pill = pills[p];
        // Random organic jitter: -100ms to +140ms
        var jitter = Math.floor(Math.random() * 240) - 100;
        var delay = Math.max(200, (baseDelays[p] || (400 + p * 550)) + jitter);
        var duration = 750 + Math.floor(Math.random() * 150); // 750ms - 900ms tactile pop
        var pillJitterX = Math.floor(Math.random() * 28) - 14; // -14px to +14px
        var pillJitterY = Math.floor(Math.random() * 24) - 12; // -12px to +12px
        var pillRot = Math.floor(Math.random() * 10) - 5; // -5deg to +5deg

        pill.style.setProperty('--pop-delay', delay + 'ms');
        pill.style.setProperty('--pop-duration', duration + 'ms');
        pill.style.setProperty('--pill-jitter-x', pillJitterX + 'px');
        pill.style.setProperty('--pill-jitter-y', pillJitterY + 'px');
        pill.style.setProperty('--pill-rot', pillRot + 'deg');
      }
      // Force reflow so animation restarts from scratch with the new random delays
      void currentPops.offsetWidth;
      currentPops.classList.add('is-active');
    }

    // 4. Randomize and animate background motif elements across the entire canvas with position-aware kinetics
    randomizeSceneElements(currentScene);

    // 5. Update segment active states
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
