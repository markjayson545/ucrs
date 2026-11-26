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
  function themeFor(mode) {
    return mode === 'system' ? (systemTheme.matches ? 'dark' : 'light') : mode;
  }

  function applyPreferences() {
    const { mode, accent } = preferences;
    root.dataset.theme = themeFor(mode);
    root.dataset.accent = accent;
  }

  applyPreferences();

  document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('[data-appearance-form]');
    const themeButtons = document.querySelectorAll('[data-theme-toggle]');

    function updateControls() {
      for (const form of forms) {
        form.elements.mode.value = preferences.mode;
        form.elements.accent.value = preferences.accent;
      }
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

    function writePreferences() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(preferences));
      } catch {
        // The current page still uses the selected appearance.
      }
    }

    async function changeAppearance(next, control) {
      const theme = themeFor(next.mode);
      preferences = next;
      writePreferences();
      if (theme === root.dataset.theme || reducedMotion.matches ||
          root.hasAttribute('data-theme-transition') || !document.startViewTransition) {
        updateAppearance();
        return;
      }

      const bounds = control.getBoundingClientRect();
      const x = bounds.left + bounds.width / 2;
      const y = bounds.top + bounds.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty('--theme-origin-x', x + 'px');
      root.style.setProperty('--theme-origin-y', y + 'px');
      root.style.setProperty('--theme-radius', radius + 'px');
      root.dataset.themeTransition = 'to-' + theme;
      control.dataset.themeActive = '';

      try {
        const transition = document.startViewTransition(updateAppearance);
        await transition.finished;
      } catch {
        updateAppearance();
      } finally {
        delete root.dataset.themeTransition;
        delete control.dataset.themeActive;
        root.style.removeProperty('--theme-origin-x');
        root.style.removeProperty('--theme-origin-y');
        root.style.removeProperty('--theme-radius');
      }
    }

    updateControls();
    systemTheme.addEventListener('change', updateAppearance);
    for (const button of themeButtons) {
      button.addEventListener('click', () => {
        const mode = themeFor(preferences.mode) === 'dark' ? 'light' : 'dark';
        changeAppearance({ ...preferences, mode }, button);
      });
      button.hidden = false;
    }

    for (const button of document.querySelectorAll('[data-appearance-open]')) {
      const panel = document.getElementById(button.getAttribute('popovertarget'));
      const controls = button.parentElement;
      const native = typeof panel.showPopover === 'function';
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-expanded', 'false');
      button.hidden = false;

      function closePanel() {
        if (native) panel.hidePopover();
        else setOpen(false);
      }

      function placePanel() {
        const gap = 8;
        const anchor = button.getBoundingClientRect();
        if (anchor.bottom <= 0 || anchor.top >= innerHeight) {
          closePanel();
          return;
        }
        const spaceBelow = innerHeight - anchor.bottom;
        const flip = spaceBelow < panel.offsetHeight + gap && anchor.top > spaceBelow;
        const top = flip ? anchor.top - gap - panel.offsetHeight : anchor.bottom + gap;
        panel.style.top = Math.max(gap, Math.min(top, innerHeight - panel.offsetHeight - gap)) + 'px';
        panel.style.left = Math.max(gap, Math.min(anchor.right - panel.offsetWidth, root.clientWidth - panel.offsetWidth - gap)) + 'px';
      }

      function setOpen(open) {
        button.setAttribute('aria-expanded', String(open));
        if (!native) panel.hidden = !open;
        if (open) {
          window.addEventListener('resize', placePanel);
          document.addEventListener('scroll', placePanel, true);
          placePanel();
          panel.dispatchEvent(new Event('portal:open', { bubbles: true }));
        } else {
          window.removeEventListener('resize', placePanel);
          document.removeEventListener('scroll', placePanel, true);
        }
      }

      if (native) {
        panel.hidden = false;
        panel.addEventListener('toggle', event => setOpen(event.newState === 'open'));
      } else {
        panel.removeAttribute('popover');
        button.removeAttribute('popovertarget');
        button.addEventListener('click', () => setOpen(panel.hidden));
        document.addEventListener('click', event => {
          if (!panel.hidden && !controls.contains(event.target)) closePanel();
        });
        controls.addEventListener('keydown', event => {
          if (event.key !== 'Escape' || panel.hidden) return;
          event.stopPropagation();
          closePanel();
          button.focus();
        });
      }
      controls.addEventListener('focusout', event => {
        if (event.relatedTarget && !controls.contains(event.relatedTarget)) closePanel();
      });
    }

    for (const form of forms) {
      form.addEventListener('change', event => {
        changeAppearance({ mode: form.elements.mode.value, accent: form.elements.accent.value }, event.target.closest('label'));
      });
    }

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
