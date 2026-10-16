/**
 * Trust & Safety Interactive Behavior Controller
 * Tab switching, Call Shield simulator toggles, and pre-meetup checklist interactions.
 */
(function() {
  'use strict';

  // 1. Workbench Tab Controller
  var tabButtons = Array.from(document.querySelectorAll('.sec-tab-btn'));
  var panels = Array.from(document.querySelectorAll('.sec-panel-view'));

  if (tabButtons.length > 0 && panels.length > 0) {
    tabButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tabId = btn.getAttribute('data-tab');
        
        // Update tab states
        tabButtons.forEach(function(b) {
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

        var activePanel = document.getElementById('sec-panel-' + tabId);
        if (activePanel) {
          activePanel.classList.add('is-active');
          activePanel.removeAttribute('hidden');
        }
      });
    });
  }

  // 2. Call Shield Technology Simulator
  var btnTelecom = document.getElementById('toggleTelecomBtn');
  var btnShield = document.getElementById('toggleShieldBtn');
  var circuitDisplay = document.getElementById('circuitDisplay');
  var callerMeta = document.getElementById('callerMeta');
  var receiverMeta = document.getElementById('receiverMeta');
  var hubTitle = document.getElementById('hubTitle');
  var hubMeta = document.getElementById('hubMeta');
  var connTag1 = document.getElementById('connTag1');
  var connTag2 = document.getElementById('connTag2');
  var verdictIcon = document.getElementById('verdictIcon');
  var verdictHeading = document.getElementById('verdictHeading');
  var verdictText = document.getElementById('verdictText');

  if (btnTelecom && btnShield && circuitDisplay) {
    function setShieldMode() {
      btnShield.classList.add('is-active');
      btnShield.setAttribute('aria-checked', 'true');
      btnTelecom.classList.remove('is-active');
      btnTelecom.setAttribute('aria-checked', 'false');

      circuitDisplay.setAttribute('data-active-mode', 'shield');
      if (callerMeta) callerMeta.textContent = 'Caller ID: Protected';
      if (receiverMeta) receiverMeta.textContent = 'Phone Visible: None';
      if (hubTitle) hubTitle.textContent = 'Call Shield Relay Hub';
      if (hubMeta) hubMeta.textContent = 'AES-256 Cloaked Server';
      if (connTag1) connTag1.textContent = 'Encrypted Tunnel';
      if (connTag2) connTag2.textContent = 'Zero Number Pass';
      if (verdictIcon) verdictIcon.textContent = '\u2705';
      if (verdictHeading) verdictHeading.textContent = 'Active Protection: Complete Telephone Anonymity';
      if (verdictText) {
        verdictText.textContent = 'Calls travel through our secure intermediary servers. Both parties communicate with crystal clarity while their personal mobile telephone numbers, home area codes, and subscriber data stay permanently concealed.';
      }
    }

    function setTelecomMode() {
      btnTelecom.classList.add('is-active');
      btnTelecom.setAttribute('aria-checked', 'true');
      btnShield.classList.remove('is-active');
      btnShield.setAttribute('aria-checked', 'false');

      circuitDisplay.setAttribute('data-active-mode', 'telecom');
      if (callerMeta) callerMeta.textContent = 'Caller ID: Exposed';
      if (receiverMeta) receiverMeta.textContent = 'Phone Visible: Real Number';
      if (hubTitle) hubTitle.textContent = 'Public Cellular Relay';
      if (hubMeta) hubMeta.textContent = 'Uncloaked Telecom Line';
      if (connTag1) connTag1.textContent = 'Cleartext Routing';
      if (connTag2) connTag2.textContent = 'Caller ID Forwarded';
      if (verdictIcon) verdictIcon.textContent = '\u26A0\uFE0F';
      if (verdictHeading) verdictHeading.textContent = 'Caution: Cellular Telephone Number Exposed';
      if (verdictText) {
        verdictText.textContent = 'Direct cellular calls disclose your personal phone number, home telephone exchange, and reverse-lookup directory records, leaving your private contact information vulnerable to outside searches.';
      }
    }

    btnTelecom.addEventListener('click', setTelecomMode);
    btnShield.addEventListener('click', setShieldMode);
  }

  // 3. Pre-Meetup Checklist State Persistence & Counter
  var checkboxes = Array.from(document.querySelectorAll('.chk-input'));
  var chkCounter = document.getElementById('chkCounter');
  var resetChecklistBtn = document.getElementById('resetChecklistBtn');

  function updateChecklistCounter() {
    if (!chkCounter || checkboxes.length === 0) return;
    var checkedCount = checkboxes.filter(function(c) { return c.checked; }).length;
    chkCounter.textContent = checkedCount + ' of ' + checkboxes.length + ' Completed';
    if (checkedCount === checkboxes.length) {
      chkCounter.style.color = 'var(--accent-juniper-dark)';
      chkCounter.style.fontWeight = '700';
    } else {
      chkCounter.style.color = 'var(--ink-secondary)';
      chkCounter.style.fontWeight = '500';
    }
  }

  if (checkboxes.length > 0) {
    checkboxes.forEach(function(chk) {
      if (window.localStorage) {
        var saved = localStorage.getItem('safety_chk_' + chk.id);
        if (saved === 'true') {
          chk.checked = true;
        }
      }
      chk.addEventListener('change', function() {
        if (window.localStorage) {
          localStorage.setItem('safety_chk_' + chk.id, chk.checked ? 'true' : 'false');
        }
        updateChecklistCounter();
      });
    });
    updateChecklistCounter();
  }

  if (resetChecklistBtn) {
    resetChecklistBtn.addEventListener('click', function() {
      checkboxes.forEach(function(chk) {
        chk.checked = false;
        if (window.localStorage) {
          localStorage.removeItem('safety_chk_' + chk.id);
        }
      });
      updateChecklistCounter();
    });
  }

  // 4. Accessible Safety Report Modal Controller
  var reportButtons = Array.from(document.querySelectorAll('[data-action="safety-report"]'));
  var reportModal = document.getElementById('safetyReportModal');
  var closeReportModalBtn = document.getElementById('closeReportModalBtn');
  var cancelReportBtn = document.getElementById('cancelReportBtn');
  var reportForm = document.getElementById('safetyReportForm');
  var reportToast = document.getElementById('safetyReportToast');

  function openReportModal() {
    if (reportModal) {
      reportModal.removeAttribute('hidden');
      if (reportToast) reportToast.setAttribute('hidden', '');
      var firstInput = reportModal.querySelector('select, input, textarea');
      if (firstInput) firstInput.focus();
    }
  }

  function closeReportModal() {
    if (reportModal) {
      reportModal.setAttribute('hidden', '');
    }
  }

  reportButtons.forEach(function(b) {
    b.addEventListener('click', function(e) {
      e.preventDefault();
      openReportModal();
    });
  });

  if (closeReportModalBtn) closeReportModalBtn.addEventListener('click', closeReportModal);
  if (cancelReportBtn) cancelReportBtn.addEventListener('click', closeReportModal);

  if (reportModal) {
    reportModal.addEventListener('click', function(e) {
      if (e.target === reportModal) closeReportModal();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && reportModal && !reportModal.hasAttribute('hidden')) {
      closeReportModal();
    }
  });

  if (reportForm) {
    reportForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (reportToast) {
        reportToast.removeAttribute('hidden');
      }
      setTimeout(function() {
        closeReportModal();
        reportForm.reset();
        if (reportToast) reportToast.setAttribute('hidden', '');
      }, 2000);
    });
  }

})();

