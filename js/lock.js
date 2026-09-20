// PIN lock screen. Purely a casual-access deterrent (all client-side) — not
// strong security. Gates the calendar behind a 4-digit PIN on every fresh
// app launch. Exposes LedgerLock.startChange() for changing the PIN later.
const LedgerLock = (() => {
  const PIN_LENGTH = 4;

  const el = {
    screen: document.getElementById('lock-screen'),
    title: document.getElementById('lock-title'),
    dots: document.getElementById('lock-dots'),
    error: document.getElementById('lock-error'),
    keypad: document.querySelector('.lock-keypad'),
    del: document.getElementById('lock-del'),
    forgot: document.getElementById('lock-forgot'),
    cancel: document.getElementById('lock-cancel'),
  };

  // mode: 'setup-first' | 'setup-confirm' | 'unlock' | 'change-verify' | 'change-first' | 'change-confirm'
  let mode = 'unlock';
  let buffer = '';
  let pendingNewPin = '';
  let onUnlocked = null;

  function renderDots() {
    const dots = el.dots.querySelectorAll('.lock-dot');
    dots.forEach((d, i) => d.classList.toggle('filled', i < buffer.length));
  }

  function setError(msg) {
    el.error.textContent = msg || '';
    if (msg) {
      el.dots.classList.remove('shake');
      void el.dots.offsetWidth; // restart animation
      el.dots.classList.add('shake');
    }
  }

  function setMode(next, title) {
    mode = next;
    buffer = '';
    el.title.textContent = title;
    setError('');
    renderDots();
    el.forgot.classList.toggle('hidden', mode !== 'unlock');
    el.cancel.classList.toggle('hidden', !mode.startsWith('change'));
  }

  function show() {
    el.screen.classList.remove('hidden');
  }

  function hide() {
    el.screen.classList.add('hidden');
  }

  async function handleComplete() {
    const entered = buffer;
    if (mode === 'setup-first') {
      pendingNewPin = entered;
      setMode('setup-confirm', 'Confirm PIN');
      return;
    }
    if (mode === 'setup-confirm') {
      if (entered === pendingNewPin) {
        const hash = await Storage.hashPin(entered);
        Storage.setPinHash(hash);
        hide();
        if (onUnlocked) onUnlocked();
      } else {
        setError("PINs didn't match — try again");
        setTimeout(() => setMode('setup-first', 'Set a PIN'), 500);
      }
      return;
    }
    if (mode === 'unlock') {
      const hash = await Storage.hashPin(entered);
      if (hash === Storage.getPinHash()) {
        hide();
        if (onUnlocked) onUnlocked();
      } else {
        setError('Incorrect PIN');
        buffer = '';
        renderDots();
      }
      return;
    }
    if (mode === 'change-verify') {
      const hash = await Storage.hashPin(entered);
      if (hash === Storage.getPinHash()) {
        setMode('change-first', 'Enter New PIN');
      } else {
        setError('Incorrect PIN');
        buffer = '';
        renderDots();
      }
      return;
    }
    if (mode === 'change-first') {
      pendingNewPin = entered;
      setMode('change-confirm', 'Confirm New PIN');
      return;
    }
    if (mode === 'change-confirm') {
      if (entered === pendingNewPin) {
        const hash = await Storage.hashPin(entered);
        Storage.setPinHash(hash);
        hide();
        alert('PIN updated.');
      } else {
        setError("PINs didn't match — try again");
        setTimeout(() => setMode('change-first', 'Enter New PIN'), 500);
      }
      return;
    }
  }

  el.keypad.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.lock-key[data-digit]');
    if (!btn || buffer.length >= PIN_LENGTH) return;
    buffer += btn.dataset.digit;
    setError('');
    renderDots();
    if (buffer.length === PIN_LENGTH) handleComplete();
  });

  el.del.addEventListener('click', () => {
    buffer = buffer.slice(0, -1);
    renderDots();
  });

  el.forgot.addEventListener('click', () => {
    if (confirm('This erases ALL entries and the PIN on this device. This cannot be undone. Continue?')) {
      Storage.wipeAll();
      location.reload();
    }
  });

  el.cancel.addEventListener('click', () => {
    hide();
  });

  function init(unlockedCallback) {
    onUnlocked = unlockedCallback;
    if (!Storage.getPinHash()) {
      setMode('setup-first', 'Set a PIN');
    } else {
      setMode('unlock', 'Enter PIN');
    }
    show();
  }

  function startChange() {
    setMode('change-verify', 'Enter Current PIN');
    show();
  }

  return { init, startChange };
})();
