/**
 * Core Motion & Soothing Text Reveal Engine
 * Orchestrates word-by-word unblur + buoyant elevation transitions
 * Strictly scoped ONLY to:
 * 1. Hero Headline (首屏标题)
 * 2. Cinema Stage Scene Titles (这个核心画面中的场景标题)
 * Slightly slower, gentle unhurried cadence.
 */
(function() {
  'use strict';

  var hasReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Recursively split text nodes into individual word tokens
   * Wrapped in <span class="w" style="--i: N"> while preserving
   * existing markup like <em>, <strong>, <span class="highlight">, <br>.
   */
  function splitWordsInElement(el, startIndex) {
    if (!el || el.getAttribute('data-words-split') === 'true') return startIndex || 0;
    el.setAttribute('data-words-split', 'true');

    var wordIndex = typeof startIndex === 'number' ? startIndex : 0;

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var text = node.textContent;
        if (!text || !text.trim()) return;

        // Split by standard whitespace boundaries (space, tab, newline)
        // EXCLUDING non-breaking spaces (\u00A0) so non-breaking word pairs stay together!
        var tokens = text.split(/([^\S\u00A0]+)/);
        var fragment = document.createDocumentFragment();

        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];
          if (/^[^\S\u00A0]+$/.test(token)) {
            fragment.appendChild(document.createTextNode(token));
          } else if (token.length > 0) {
            // Check if punctuation only (e.g. trailing period after </em>)
            var isPunctOnly = /^[.,!?:;]+$/.test(token);
            var span = document.createElement('span');
            span.className = 'w';
            var assignedIndex = (isPunctOnly && wordIndex > 0) ? (wordIndex - 1) : wordIndex;
            span.style.setProperty('--i', assignedIndex);
            span.textContent = token;
            fragment.appendChild(span);
            if (!isPunctOnly) {
              wordIndex++;
            }
          }
        }
        node.parentNode.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains('w')) return;
        if (node.tagName.toLowerCase() === 'br') return;

        var children = Array.from(node.childNodes);
        for (var c = 0; c < children.length; c++) {
          walk(children[c]);
        }
      }
    }

    walk(el);
    return wordIndex;
  }

  /**
   * Initialize text splitting strictly scoped to:
   * 1. Hero Headline (首屏的字)
   * 2. Cinema Stage Scene Titles (这个核心画面中的字)
   */
  function initTextSplitting() {
    if (hasReducedMotion) return;

    // 1. Hero Headline (首屏的字)
    var heroTitle = document.querySelector('.hero-headline');
    if (heroTitle) splitWordsInElement(heroTitle, 0);

    // 2. Cinema Stage Scene Titles (这个画面中的字)
    var sceneTitles = document.querySelectorAll('.film-narrative-box .scene-title');
    sceneTitles.forEach(function(st) {
      splitWordsInElement(st, 0);
    });
  }

  /**
   * Hero Entrance trigger
   */
  function setupHeroReveal() {
    var compHero = document.querySelector('.comp-hero');
    if (compHero) {
      setTimeout(function() {
        compHero.classList.add('is-revealed');
      }, 90);
    }
  }

  // Public Motion API for components
  window.MotionEngine = {
    splitWords: splitWordsInElement,
    hasReducedMotion: hasReducedMotion
  };

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initTextSplitting();
      setupHeroReveal();
    });
  } else {
    initTextSplitting();
    setupHeroReveal();
  }
})();
