// Form errors stay inline. Toasts surface outcomes without moving focus.
(() => {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;

  const title = toast.querySelector('[data-toast-title]');
  const copy = toast.querySelector('[data-toast-message]');
  const close = toast.querySelector('[data-toast-close]');
  const live = document.querySelector('[data-toast-announcement]');
  const titles = { success: 'Completed', info: 'Preview', error: 'Couldn’t save' };
  let timer;
  let announceTimer;
  let focusBeforeToast;

  function dismiss() {
    clearTimeout(timer);
    clearTimeout(announceTimer);
    live.textContent = '';
    if (toast.contains(document.activeElement) && focusBeforeToast?.isConnected) {
      focusBeforeToast.focus();
    }
    toast.hidden = true;
  }

  function scheduleDismiss() {
    clearTimeout(timer);
    if (!toast.hidden && !toast.matches(':hover, :focus-within')) {
      timer = setTimeout(dismiss, 5000);
    }
  }

  function show({ kind, message, announce = true }) {
    if (!message || !Object.hasOwn(titles, kind)) return;
    toast.dataset.kind = kind;
    title.textContent = titles[kind];
    copy.textContent = message;
    toast.hidden = false;
    clearTimeout(announceTimer);
    live.textContent = '';
    if (announce) {
      announceTimer = setTimeout(() => { live.textContent = message; }, 50);
    }
    toast.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
    scheduleDismiss();
  }

  close.addEventListener('click', dismiss);
  toast.addEventListener('pointerenter', () => clearTimeout(timer));
  toast.addEventListener('pointerleave', scheduleDismiss);
  toast.addEventListener('focusin', event => {
    focusBeforeToast = event.relatedTarget;
    clearTimeout(timer);
  });
  toast.addEventListener('focusout', () => queueMicrotask(scheduleDismiss));
  window.addEventListener('pagehide', dismiss);
  document.addEventListener('portal:toast', event => show(event.detail));

  const notice = document.querySelector('[data-toast-source]');
  if (notice) {
    show({ kind: 'success', message: notice.textContent.trim() });
    notice.hidden = true;
  }
})();
