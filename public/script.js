const form = document.getElementById('form');
const descEl = document.getElementById('description');
const regentsEl = document.getElementById('regents');
const submitBtn = document.getElementById('submit');
const resultsEl = document.getElementById('results');
const suggestionsEl = document.getElementById('suggestions');
const errorEl = document.getElementById('error');
const loadingEl = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');

const LOADING_MESSAGES = [
  'Reading your description',
  'Searching the catalog',
  'Weighing tone and balance',
  'Picking the best fit',
  'Polishing the choices',
];

let loadingTimer = null;

function showLoading() {
  loadingEl.hidden = false;
  let i = 0;
  loadingText.textContent = LOADING_MESSAGES[0];
  loadingText.style.animation = 'none';
  void loadingText.offsetWidth;
  loadingText.style.animation = '';
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingText.style.animation = 'none';
    void loadingText.offsetWidth;
    loadingText.style.animation = '';
    loadingText.textContent = LOADING_MESSAGES[i];
  }, 1600);
}

function hideLoading() {
  loadingEl.hidden = true;
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
}
const summaryText = document.getElementById('summary-text');
const editBtn = document.getElementById('edit-btn');
const collapseBtn = document.getElementById('collapse-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help');
const helpCloseBtn = document.getElementById('help-close');
const ackModal = document.getElementById('ack');
const ackBtn = document.getElementById('ack-btn');
const piiWarning = document.getElementById('pii-warning');

const ACK_VERSION = '2026-05-01';
const ACK_KEY = 'kalima_ack';

const lockEl = document.getElementById('lock');
const lockForm = document.getElementById('lock-form');
const lockInput = document.getElementById('lock-password');
const lockError = document.getElementById('lock-error');

const PW_KEY = 'kalima_pw';

function showError(msg) {
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = '';
}

function getPassword() {
  return localStorage.getItem(PW_KEY) || '';
}

function showLock(message) {
  lockEl.hidden = false;
  document.body.classList.add('locked');
  if (message) {
    lockError.hidden = false;
    lockError.textContent = message;
  } else {
    lockError.hidden = true;
    lockError.textContent = '';
  }
  setTimeout(() => lockInput.focus(), 50);
}

function hideLock() {
  lockEl.hidden = true;
  document.body.classList.remove('locked');
}

async function checkPassword(password) {
  const res = await fetch('/api/auth/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Site-Password': password,
    },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

async function initAuth() {
  let required = true;
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    required = !!data.required;
  } catch {
    // If status check fails, fall through and require password to be safe.
  }

  if (!required) {
    hideLock();
    return;
  }

  const cached = getPassword();
  if (cached && (await checkPassword(cached))) {
    hideLock();
    return;
  }
  localStorage.removeItem(PW_KEY);
  showLock();
}

lockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = lockInput.value;
  if (!pw) return;
  lockError.hidden = true;
  const submitButton = lockForm.querySelector('button');
  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = 'Checking…';
  try {
    if (await checkPassword(pw)) {
      localStorage.setItem(PW_KEY, pw);
      lockInput.value = '';
      hideLock();
    } else {
      lockError.hidden = false;
      lockError.textContent = 'Incorrect password.';
      lockInput.select();
    }
  } catch (err) {
    lockError.hidden = false;
    lockError.textContent =
      'Could not reach the server. Make sure it is running and you are on the right URL.';
    console.error('lock check failed:', err);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

function renderSuggestions(items) {
  suggestionsEl.innerHTML = '';
  suggestionsEl.classList.remove('show-extras');
  for (const s of items) {
    const li = document.createElement('li');
    li.className = 'suggestion' + (s.required ? ' is-required' : '');

    const top = document.createElement('div');
    top.className = 'top';

    const code = document.createElement('span');
    code.className = 'code';
    code.textContent = `#${s.code}`;
    top.appendChild(code);

    if (s.required) {
      const pin = document.createElement('span');
      pin.className = 'pin';
      pin.textContent = 'Required';
      top.appendChild(pin);
    }

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy';
    copy.textContent = 'Copy code';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(String(s.code));
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = 'Copy code'), 1200);
      } catch {
        copy.textContent = 'Copy failed';
      }
    });
    top.appendChild(copy);

    const text = document.createElement('p');
    text.className = 'text';
    text.textContent = s.comment;

    li.appendChild(top);
    li.appendChild(text);

    const meta = document.createElement('div');
    meta.className = 'meta';

    let reason = null;
    if (s.reason) {
      const whyBtn = document.createElement('button');
      whyBtn.type = 'button';
      whyBtn.className = 'why-toggle';
      whyBtn.textContent = 'See why';

      reason = document.createElement('p');
      reason.className = 'reason';
      reason.textContent = s.reason;
      reason.hidden = true;

      whyBtn.addEventListener('click', () => {
        const nowHidden = !reason.hidden;
        reason.hidden = nowHidden;
        whyBtn.textContent = nowHidden ? 'See why' : 'Hide';
      });

      meta.appendChild(whyBtn);
    }

    const catLabel = document.createElement('span');
    catLabel.className = 'cat-label';
    const parts = [s.category || 'General'];
    if (s.level && s.level !== 'NA') parts.push(s.level);
    catLabel.textContent = parts.join(' · ');
    meta.appendChild(catLabel);

    li.appendChild(meta);
    if (reason) li.appendChild(reason);

    suggestionsEl.appendChild(li);
  }

  const VISIBLE_DEFAULT = 3;
  const allCards = Array.from(suggestionsEl.querySelectorAll('.suggestion'));
  const extras = allCards.slice(VISIBLE_DEFAULT);
  extras.forEach((card) => card.classList.add('hidden-extra'));

  if (extras.length > 0) {
    const toggleLi = document.createElement('li');
    toggleLi.className = 'see-more';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'see-more-btn';
    btn.textContent = `See ${extras.length} more options ▾`;
    toggleLi.appendChild(btn);
    suggestionsEl.appendChild(toggleLi);

    btn.addEventListener('click', () => {
      const expanded = suggestionsEl.classList.toggle('show-extras');
      btn.textContent = expanded
        ? 'Show fewer ▴'
        : `See ${extras.length} more options ▾`;
    });
  }

  resultsEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const description = descEl.value.trim();
  if (description.length < 5) {
    showError('Please write a longer description.');
    return;
  }
  const pii = detectPII(description);
  if (pii.found) {
    updatePiiWarning();
    showError(
      `Submission blocked: looks like a name (“${pii.sample}”). Replace with “the student” or initials, then try again.`
    );
    descEl.focus();
    piiWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Thinking…';
  resultsEl.hidden = true;
  suggestionsEl.innerHTML = '';
  showLoading();

  try {
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Password': getPassword(),
      },
      body: JSON.stringify({
        description,
        regents: regentsEl.checked,
      }),
    });

    if (res.status === 401) {
      localStorage.removeItem(PW_KEY);
      showLock('Your session expired — please re-enter the password.');
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      if (data.pii) {
        updatePiiWarning();
        piiWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showError(data.error || `Request failed (${res.status}).`);
      return;
    }
    renderSuggestions(data.suggestions);
    summaryText.textContent = description;
    summaryText.title = description;
    form.classList.add('minimized', 'has-results');
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (err) {
    showError(err.message || 'Network error.');
  } finally {
    hideLoading();
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

editBtn.addEventListener('click', () => {
  form.classList.remove('minimized');
  setTimeout(() => descEl.focus(), 50);
});

collapseBtn.addEventListener('click', () => {
  form.classList.add('minimized');
});

function openHelp() {
  helpModal.hidden = false;
  helpCloseBtn.focus();
}

function closeHelp() {
  helpModal.hidden = true;
  helpBtn.focus();
}

helpBtn.addEventListener('click', openHelp);
helpCloseBtn.addEventListener('click', closeHelp);
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) closeHelp();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !helpModal.hidden) closeHelp();
});

// Acknowledgement modal — once per browser, per ACK_VERSION.
function showAck() {
  ackModal.hidden = false;
  setTimeout(() => ackBtn.focus(), 50);
}

function hideAck() {
  ackModal.hidden = true;
}

function maybeShowAck() {
  const stored = localStorage.getItem(ACK_KEY);
  if (stored !== ACK_VERSION) showAck();
}

ackBtn.addEventListener('click', () => {
  localStorage.setItem(ACK_KEY, ACK_VERSION);
  hideAck();
});

// Use the shared PII detector loaded from /pii.js. The same logic also runs
// on the server, so a missing or stale client check can't bypass the rule.
const detectPII = window.KalimaPII.detectPII;

function updatePiiWarning() {
  const result = detectPII(descEl.value);
  if (result.found) {
    piiWarning.hidden = false;
    piiWarning.innerHTML =
      '<strong>Possible name detected (“' +
      escapeHtml(result.sample) +
      '”).</strong> ' +
      'Replace with “the student” or initials. Submission is blocked until removed.';
    submitBtn.disabled = true;
    submitBtn.title = 'Remove the name to enable submission.';
  } else {
    piiWarning.hidden = true;
    submitBtn.disabled = false;
    submitBtn.title = '';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

descEl.addEventListener('input', updatePiiWarning);

initAuth();
maybeShowAck();
