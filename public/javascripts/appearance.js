// Run in <head> so the saved colors apply before the browser paints the page.
(() => {
  const storageKey = 'ucrs.appearance';
  const modes = ['light', 'dark', 'system'];
  const accents = ['clay', 'teal', 'indigo', 'plum', 'moss'];
  const root = document.documentElement;
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function readPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return {
        mode: modes.includes(saved?.mode) ? saved.mode : 'light',
        accent: accents.includes(saved?.accent) ? saved.accent : 'clay',
      };
    } catch {
      return { mode: 'light', accent: 'clay' };
    }
  }

  let preferences = readPreferences();
  function applyPreferences() {
    const { mode, accent } = preferences;
    root.dataset.theme = mode === 'system'
      ? (systemTheme.matches ? 'dark' : 'light')
      : mode;
    root.dataset.accent = accent;
  }

  applyPreferences();

  document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.querySelector('#appearance-dialog');
    if (!dialog) return;
    const form = dialog.querySelector('[data-appearance-form]');
    const themeButtons = document.querySelectorAll('[data-theme-toggle]');
    let trigger;

    function updateControls() {
      form.elements.mode.value = preferences.mode;
      form.elements.accent.value = preferences.accent;
      const isDark = root.dataset.theme === 'dark';
      for (const button of themeButtons) {
        button.setAttribute('aria-pressed', String(isDark));
        button.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      }
    }

    function updateAppearance() {
      applyPreferences();
      updateControls();
    }

    function writePreferences(next = preferences) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The current page still uses the selected appearance.
      }
    }

    function savePreferences(next) {
      preferences = next;
      updateAppearance();
      writePreferences();
    }

    async function toggleTheme(event) {
      if (root.hasAttribute('data-theme-transition')) return;

      const mode = root.dataset.theme === 'dark' ? 'light' : 'dark';
      if (reducedMotion.matches || typeof document.startViewTransition !== 'function') {
        savePreferences({ ...preferences, mode });
        return;
      }

      function applyToggle() {
        preferences = { ...preferences, mode };
        updateAppearance();
      }

      const button = event.currentTarget;
      let { clientX: x, clientY: y } = event;
      // Native keyboard activation has no pointer coordinates.
      if (event.detail === 0) {
        const bounds = button.getBoundingClientRect();
        x = bounds.left + bounds.width / 2;
        y = bounds.top + bounds.height / 2;
      }
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty('--theme-origin-x', x + 'px');
      root.style.setProperty('--theme-origin-y', y + 'px');
      root.style.setProperty('--theme-radius', radius + 'px');
      root.dataset.themeTransition = 'to-' + mode;
      button.dataset.themeActive = '';
      button.setAttribute('aria-disabled', 'true');

      // Keep synchronous storage out of the snapshot callback and active frames.
      const saveOnLeave = () => writePreferences({ ...preferences, mode });
      window.addEventListener('pagehide', saveOnLeave, { once: true });
      try {
        const transition = document.startViewTransition(applyToggle);
        await transition.finished;
      } catch {
        // A failed animation must still leave the requested theme applied.
        applyToggle();
      } finally {
        window.removeEventListener('pagehide', saveOnLeave);
        delete root.dataset.themeTransition;
        delete button.dataset.themeActive;
        button.removeAttribute('aria-disabled');
        root.style.removeProperty('--theme-origin-x');
        root.style.removeProperty('--theme-origin-y');
        root.style.removeProperty('--theme-radius');
        writePreferences();
      }
    }

    updateControls();
    systemTheme.addEventListener('change', updateAppearance);
    for (const button of themeButtons) {
      button.addEventListener('click', toggleTheme);
      button.hidden = false;
    }

    for (const button of document.querySelectorAll('[data-appearance-open]')) {
      button.hidden = false;
      button.addEventListener('click', () => {
        trigger = button;
        updateControls();
        dialog.showModal();
        dialog.dispatchEvent(new Event('portal:open', { bubbles: true }));
      });
    }
    dialog.addEventListener('close', () => trigger?.focus());

    form.addEventListener('change', () => {
      savePreferences({ mode: form.elements.mode.value, accent: form.elements.accent.value });
    });

    window.addEventListener('storage', event => {
      if (event.key !== storageKey && event.key !== null) return;
      preferences = readPreferences();
      updateAppearance();
    });

    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      preferences = readPreferences();
      updateAppearance();
    });
  });
})();
