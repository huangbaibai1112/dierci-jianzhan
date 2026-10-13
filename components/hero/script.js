/**
 * Hero Component Living Rhythms Flow Engine
 * Slow, unhurried highlight rotation across the 3 core living rhythms.
 * Supports interactive mouse hover pause and manual click lock.
 */
(function() {
  'use strict';
  
  var consoleEl = document.getElementById('heroRhythmConsole');
  if (!consoleEl) return;
  
  var cards = consoleEl.querySelectorAll('.rhythm-card');
  if (!cards.length) return;
  
  var currentIndex = 0;
  var cycleInterval = 4200; // 4.2 seconds - leisurely, relaxed cadence
  var timer = null;
  var isHovered = false;
  
  function activateRhythm(index) {
    if (index < 0 || index >= cards.length) index = 0;
    cards.forEach(function(card, idx) {
      if (idx === index) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });
    currentIndex = index;
  }
  
  function startFlow() {
    if (timer) clearInterval(timer);
    timer = setInterval(function() {
      if (isHovered) return;
      var nextIndex = (currentIndex + 1) % cards.length;
      activateRhythm(nextIndex);
    }, cycleInterval);
  }
  
  // Interactive bindings
  cards.forEach(function(card, idx) {
    card.addEventListener('mouseenter', function() {
      isHovered = true;
      activateRhythm(idx);
    });
    
    card.addEventListener('click', function() {
      activateRhythm(idx);
    });
    
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateRhythm(idx);
      }
    });
  });
  
  consoleEl.addEventListener('mouseleave', function() {
    isHovered = false;
  });
  
  // Start flow cycle
  activateRhythm(0);
  startFlow();
})();
