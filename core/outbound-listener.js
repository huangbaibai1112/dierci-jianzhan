/**
 * Core Outbound Affiliate Dispatcher
 * Subscribes to navigation events and translates them into outbound referrals.
 */
(function() {
  'use strict';

  function buildUrl(customParams) {
    var config = window.APP_CONFIG || {};
    var baseUrl = config.partnerRegisterUrl || "https://www.silversingles.com/register";
    var params = Object.assign({}, config.tracking || {}, customParams || {});

    try {
      var url = new URL(baseUrl);
      Object.keys(params).forEach(function(k) {
        if (params[k]) url.searchParams.set(k, params[k]);
      });
      return url.toString();
    } catch (err) {
      var query = Object.keys(params).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      return baseUrl + (baseUrl.indexOf('?') !== -1 ? '&' : '?') + query;
    }
  }

  function handleDispatch(detail) {
    var config = window.APP_CONFIG || {};
    var url = buildUrl(detail || {});

    if (config.openInNewTab) {
      var win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = url;
      }
    } else {
      window.location.href = url;
    }
  }

  // 1. Listen via EventBus
  if (window.EventBus) {
    window.EventBus.on('affiliate:dispatch', handleDispatch);
  }

  // 2. Global attribute listener for declarative HTML buttons [data-action="join-partner"]
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="join-partner"]');
    if (!btn) return;
    e.preventDefault();
    var source = btn.getAttribute('data-source') || 'button_click';
    handleDispatch({ subid_pos: source });
  });
})();
