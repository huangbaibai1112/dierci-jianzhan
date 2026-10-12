/**
 * Core Event Bus (Decoupled Pub/Sub Pattern)
 * Components communicate solely through events.
 * No component holds a direct reference or dependency on any other component.
 */
(function() {
  'use strict';

  var EventBus = {
    emit: function(eventName, detail) {
      var event = new CustomEvent(eventName, {
        detail: detail || {},
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    },

    on: function(eventName, callback) {
      document.addEventListener(eventName, function(e) {
        callback(e.detail, e);
      });
    }
  };

  window.EventBus = EventBus;
})();
