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

  // 14 Stratified candidate zones covering the entire stage background canvas
  // Positioned across the top horizon, bottom baseline, center gutter and right flank
  // Guarantees balanced distribution without clumping while keeping left editorial text 100% legible
  var STAGE_ZONES = [
    // Top horizon band (across full canvas width)
    { minX: 4,  maxX: 22, minY: 5,  maxY: 18 }, // Top-Left corner (above kicker)
    { minX: 24, maxX: 42, minY: 5,  maxY: 18 }, // Top-Left inner
    { minX: 44, maxX: 60, minY: 5,  maxY: 19 }, // Top-Gutter
    { minX: 62, maxX: 78, minY: 5,  maxY: 18 }, // Top-Right above phone
    { minX: 80, maxX: 94, minY: 5,  maxY: 18 }, // Top-Right outer corner

    // Center channel & Right flank (clear of text and phone core)
    { minX: 44, maxX: 56, minY: 24, maxY: 44 }, // Mid-Gutter upper
    { minX: 44, maxX: 56, minY: 48, maxY: 68 }, // Mid-Gutter lower
    { minX: 85, maxX: 95, minY: 26, maxY: 48 }, // Mid-Right outer upper
    { minX: 85, maxX: 95, minY: 52, maxY: 72 }, // Mid-Right outer lower

    // Bottom baseline band (across full canvas width)
    { minX: 4,  maxX: 20, minY: 76, maxY: 89 }, // Bot-Left corner
    { minX: 22, maxX: 40, minY: 76, maxY: 89 }, // Bot-Left below chips
    { minX: 42, maxX: 60, minY: 76, maxY: 89 }, // Bot-Gutter
    { minX: 62, maxX: 78, minY: 76, maxY: 89 }, // Bot-Right below phone
    { minX: 80, maxX: 94, minY: 76, maxY: 89 }  // Bot-Right outer
  ];

  // =========================================================================
  // Dedicated Feature Graphic Pools (Directly from 网站与APP功能清单.md)
  // Each chapter has 8 distinct semantic vector badges & interactive motifs.
  // When a chapter is selected or re-clicked, a random sample is drawn from the array.
  // =========================================================================
  var SCENE_FEATURE_POOLS = [
    // Chapter 0: Curated Daily Picks (每日推荐 / 补充推荐 / 喜欢与配对)
    [
      '<div class="dyn-motif-item dmi-card-badge dmi-badge-pill"><span class="dmi-star">&#9733;</span><span>98% Daily Match</span></div>',
      '<div class="dyn-motif-item dmi-sunrise-arc"><svg viewBox="0 0 140 80" class="sunrise-svg"><defs><linearGradient id="sunGrad0" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stop-color="rgba(233, 66, 102, 0.35)"/><stop offset="100%" stop-color="rgba(245, 158, 11, 0.15)"/></linearGradient></defs><path d="M10 75 A 60 60 0 0 1 130 75 Z" fill="url(#sunGrad0)" stroke="rgba(233, 66, 102, 0.45)" stroke-width="1.5"/><line x1="70" y1="12" x2="70" y2="2" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="26" x2="24" y2="18" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><line x1="108" y1="26" x2="116" y2="18" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/></svg></div>',
      '<div class="dyn-motif-item dmi-heart-pill dmi-badge-pill"><span class="dmi-heart-icon">&hearts;</span><span>Mutual Match</span></div>',
      '<div class="dyn-motif-item dmi-curated-ribbon dmi-badge-pill"><span>&#9734; Curated at 9 AM</span></div>',
      '<div class="dyn-motif-item dmi-picks-count dmi-badge-pill"><span class="dmi-count-num">+3</span><span>Daily Additions</span></div>',
      '<div class="dyn-motif-item dmi-rewind-pill dmi-badge-pill"><svg class="dmi-svg-rewind" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/></svg><span>Revisit Passed</span></div>',
      '<div class="dyn-motif-item dmi-resonance-rings"><span class="ring-core"></span><span class="ring-ripple"></span></div>',
      '<div class="dyn-motif-item dmi-twinkle-diamond"><svg viewBox="0 0 32 32"><path d="M16 2 L19 13 L30 16 L19 19 L16 30 L13 19 L2 16 L13 13 Z" fill="#F59E0B"/></svg></div>'
    ],
    // Chapter 1: Age 50–99 Filters & Discovery (按条件筛选 / Gallery / 关键字查找)
    [
      '<div class="dyn-motif-item dmi-filter-slider"><div class="dfs-header"><span>Age Range</span><span>50–99</span></div><div class="dfs-bar"><i></i></div></div>',
      '<div class="dyn-motif-item dmi-geo-pill dmi-badge-pill"><svg class="dmi-icon-pin" viewBox="0 0 20 20"><path d="M10 2C6.69 2 4 4.69 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg><span>Within 25 mi</span></div>',
      '<div class="dyn-motif-item dmi-verified-pill dmi-badge-pill"><span class="dmi-check">&#10003;</span><span>Photo Verified</span></div>',
      '<div class="dyn-motif-item dmi-keyword-tag dmi-badge-pill"><span class="dmi-kw-lens">&#x1F50D;</span><span>Garden &amp; Travel</span></div>',
      '<div class="dyn-motif-item dmi-reticle-view"><span class="reticle-circ"></span><span class="reticle-dot"></span></div>',
      '<div class="dyn-motif-item dmi-gallery-tile dmi-badge-pill"><span class="gt-dot"></span><span>Gallery View</span></div>',
      '<div class="dyn-motif-item dmi-lifestyle-badge dmi-badge-pill"><span>Active Lifestyle</span></div>',
      '<div class="dyn-motif-item dmi-compass-rose"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 3"/><polygon points="20,6 23,17 34,20 23,23 20,34 17,23 6,20 17,17" fill="currentColor"/></svg></div>'
    ],
    // Chapter 2: In-Depth Profiles & Live Verification (真人核验 / 故事相册 / 隐私)
    [
      '<div class="dyn-motif-item dmi-seal-badge dmi-badge-pill"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/></svg><span>Real-Person Verified</span></div>',
      '<div class="dyn-motif-item dmi-video-pill dmi-badge-pill"><svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg><span>Video Verified &#10003;</span></div>',
      '<div class="dyn-motif-item dmi-completion-meter dmi-badge-pill"><span class="dcm-num">100%</span><span>Profile Complete</span></div>',
      '<div class="dyn-motif-item dmi-story-journal"><svg viewBox="0 0 54 36"><path d="M4 6 C15 4 23 8 27 10 C31 8 39 4 50 6 L50 30 C39 28 31 32 27 34 C23 32 15 28 4 30 Z" fill="rgba(255,255,255,0.92)" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="1.2"/><line x1="32" y1="12" x2="45" y2="12" stroke="currentColor" stroke-width="1.2"/><line x1="32" y1="18" x2="43" y2="18" stroke="currentColor" stroke-width="1.2"/></svg></div>',
      '<div class="dyn-motif-item dmi-silver-crest dmi-badge-pill"><span class="dsc-gem">&#9670;</span><span>Silver Select</span></div>',
      '<div class="dyn-motif-item dmi-album-frame dmi-badge-pill"><svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg><span>Custom Albums</span></div>',
      '<div class="dyn-motif-item dmi-botanical-vine"><svg viewBox="0 0 48 72"><path d="M24 68 C24 40 32 20 24 4" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="16" cy="16" rx="6" ry="3.5" transform="rotate(-30 16 16)" fill="currentColor" opacity="0.6"/><ellipse cx="32" cy="28" rx="6" ry="3.5" transform="rotate(30 32 28)" fill="currentColor" opacity="0.6"/><ellipse cx="14" cy="40" rx="6" ry="3.5" transform="rotate(-30 14 40)" fill="currentColor" opacity="0.6"/><ellipse cx="34" cy="52" rx="6" ry="3.5" transform="rotate(30 34 52)" fill="currentColor" opacity="0.6"/></svg></div>',
      '<div class="dyn-motif-item dmi-privacy-shield dmi-badge-pill"><span>&#x1F512; Privacy Protected</span></div>'
    ],
    // Chapter 3: Voice Connection & Private Calling (语音与视频通话)
    [
      '<div class="dyn-motif-item dmi-voice-capsule dmi-badge-pill"><span class="dvc-play">&#9658;</span><span class="dvc-wave"><i></i><i></i><i></i><i></i><i></i></span><span class="dvc-dur">0:42</span></div>',
      '<div class="dyn-motif-item dmi-eq-bars"><span></span><span></span><span></span><span></span><span></span><span></span></div>',
      '<div class="dyn-motif-item dmi-private-call dmi-badge-pill"><svg viewBox="0 0 20 20"><path d="M10 1L3 4v5c0 5 7 9 7 9s7-4 7-9V4l-7-3zm-1 12H8v-2h1v2zm0-4H8V5h1v4z" fill="currentColor"/></svg><span>Number Protected</span></div>',
      '<div class="dyn-motif-item dmi-sound-arcs"><svg viewBox="0 0 44 36"><path d="M6 10 L6 26 L14 26 L24 34 L24 2 L14 10 Z" fill="currentColor"/><path d="M29 12 A 8 8 0 0 1 29 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M34 7 A 14 14 0 0 1 34 29" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"/></svg></div>',
      '<div class="dyn-motif-item dmi-video-frame dmi-badge-pill"><span class="dvf-dot"></span><span>Video Chat</span></div>',
      '<div class="dyn-motif-item dmi-call-guard dmi-badge-pill"><span>&#x2714; Call Guard Active</span></div>',
      '<div class="dyn-motif-item dmi-audio-node"><span class="an-core"></span><span class="an-ripple"></span></div>',
      '<div class="dyn-motif-item dmi-clef-trail dmi-badge-pill"><span class="dmi-clef-glyph">&#9835;</span><span>Warm Tone</span></div>'
    ],
    // Chapter 4: Conversation Starters & Winks (私信、打招呼与破冰)
    [
      '<div class="dyn-motif-item dmi-wink-tag dmi-badge-pill"><span class="dmi-wink-icon">&#128521;</span><span>Wink Sent &#10024;</span></div>',
      '<div class="dyn-motif-item dmi-speech-bubble"><span class="dsb-dots"><i></i><i></i><i></i></span><span class="dsb-tail"></span></div>',
      '<div class="dyn-motif-item dmi-pinned-ribbon dmi-badge-pill"><span class="dmi-pin-icon">&#128204;</span><span>Pinned Chat</span></div>',
      '<div class="dyn-motif-item dmi-card-envelope dmi-badge-pill"><svg viewBox="0 0 24 18"><path d="M2 2h20v14H2z" fill="rgba(255,255,255,0.92)" stroke="currentColor" stroke-width="1.5"/><path d="M2 2l10 8L22 2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="2" fill="#E94266"/></svg><span>Greeting Card</span></div>',
      '<div class="dyn-motif-item dmi-emoji-bubble dmi-badge-pill"><span class="dmi-emoji-symbol">&#128156;</span><span>Heartfelt</span></div>',
      '<div class="dyn-motif-item dmi-idea-burst"><svg viewBox="0 0 26 26"><path d="M13 0 L15 10 L25 13 L15 16 L13 26 L11 16 L1 13 L11 10 Z" fill="currentColor"/></svg></div>',
      '<div class="dyn-motif-item dmi-read-receipt dmi-badge-pill"><span class="dmi-checks">&#10003;&#10003;</span><span>Delivered</span></div>',
      '<div class="dyn-motif-item dmi-icebreaker-quote"><span>&ldquo;Weekend hike?&rdquo;</span></div>'
    ],
    // Chapter 5: 1-on-1 Coffee Meetups & Community (线下见面与活动)
    [
      '<div class="dyn-motif-item dmi-meetup-card dmi-badge-pill"><span class="dmc-icon">&#9749;</span><span>1-to-1 Tea Meetup</span></div>',
      '<div class="dyn-motif-item dmi-ceramic-cup"><svg viewBox="0 0 48 38"><path d="M8 32 C16 36 32 36 40 32" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 14 L15 28 C16 31 34 31 35 28 L38 14 Z" fill="rgba(255,255,255,0.92)" stroke="currentColor" stroke-width="1.5"/><path d="M38 17 C42 17 44 21 41 24 C39 25 37 25 36 24" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M20 10 Q23 6 20 2" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M28 10 Q31 6 28 2" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div>',
      '<div class="dyn-motif-item dmi-venue-shield dmi-badge-pill"><svg viewBox="0 0 20 20"><path d="M10 2L3 5v6c0 4.5 3.5 8.5 7 9.5 3.5-1 7-5 7-9.5V5l-7-3z" fill="currentColor"/></svg><span>Public Venue Safe</span></div>',
      '<div class="dyn-motif-item dmi-calendar-dial"><span class="dcd-time">3:00 PM</span><span class="dcd-day">Saturday</span></div>',
      '<div class="dyn-motif-item dmi-event-ticket dmi-badge-pill"><span class="det-dot">&#9679;</span><span>Art Walk &amp; Talk</span></div>',
      '<div class="dyn-motif-item dmi-moments-badge dmi-badge-pill"><span class="dmi-camera-glyph">&#128247;</span><span>Moments</span></div>',
      '<div class="dyn-motif-item dmi-amber-drop dmi-badge-pill"><span class="ad-gem"></span><span>Golden Hour</span></div>',
      '<div class="dyn-motif-item dmi-cheers-badge dmi-badge-pill"><span class="dmi-cheers-icon">&#127861;</span><span>Relaxed Setting</span></div>'
    ]
  ];

  function randomizeSceneElements(sceneIdx) {
    if (window.innerWidth <= 768) return;
    var motifEl = stage.querySelector('.motif-scene-' + sceneIdx);
    if (!motifEl) return;

    var container = motifEl.querySelector('.dyn-sampled-motifs') || motifEl;
    var pool = SCENE_FEATURE_POOLS[sceneIdx];
    if (!pool || !pool.length) return;

    // 1. Randomly draw 5 to 6 distinct items from the feature pool without replacement
    var sampleCount = 5 + Math.floor(Math.random() * 2);
    var poolIndices = [];
    for (var k = 0; k < pool.length; k++) poolIndices.push(k);
    for (var p = poolIndices.length - 1; p > 0; p--) {
      var rp = Math.floor(Math.random() * (p + 1));
      var tmpP = poolIndices[p];
      poolIndices[p] = poolIndices[rp];
      poolIndices[rp] = tmpP;
    }
    var chosen = poolIndices.slice(0, sampleCount);

    // 2. Shuffle candidate zones across 100% of canvas
    var shuffledZones = STAGE_ZONES.slice();
    for (var z = shuffledZones.length - 1; z > 0; z--) {
      var rz = Math.floor(Math.random() * (z + 1));
      var tmpZ = shuffledZones[z];
      shuffledZones[z] = shuffledZones[rz];
      shuffledZones[rz] = tmpZ;
    }

    // 3. Clear container and inject drawn items with position-aware kinetic physics
    container.innerHTML = '';
    var tempWrap = document.createElement('div');

    chosen.forEach(function(poolIdx, i) {
      tempWrap.innerHTML = pool[poolIdx];
      var el = tempWrap.firstElementChild;
      if (!el) return;

      var zone = shuffledZones[i % shuffledZones.length];
      var posX = zone.minX + Math.random() * (zone.maxX - zone.minX);
      var posY = zone.minY + Math.random() * (zone.maxY - zone.minY);

      // Position-aware kinetic motion dynamics:
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

      var baseRot = (posX < 50 ? -1 : 1) * (3 + Math.floor(Math.random() * 11)); // -14deg to +14deg
      var swing = 3 + Math.floor(Math.random() * 5); // 3deg to 7deg
      var scale = (0.88 + Math.random() * 0.24).toFixed(2); // 0.88 to 1.12
      var dur = (3.4 + Math.random() * 2.6).toFixed(2); // 3.4s to 6.0s
      var delay = Math.floor(50 + Math.random() * 480); // 50ms to 530ms
      var popDur = (0.64 + Math.random() * 0.22).toFixed(2);

      el.style.left = posX.toFixed(1) + '%';
      el.style.top = posY.toFixed(1) + '%';
      el.style.right = 'auto';
      el.style.bottom = 'auto';

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

      container.appendChild(el);
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
