// This script changes browser behavior. Form actions still point to Express routes.
(() => {
  const menu = document.querySelector('[data-menu]');
  const sidebar = document.querySelector('#sidebar');
  const mobile = matchMedia('(max-width: 760px)');

  function setMenu(open, returnFocus = false) {
    if (!sidebar || !menu) return;
    document.body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
    sidebar.inert = mobile.matches && !open;
    if (open) {
      const activeLink = sidebar.querySelector('[aria-current="page"]') || sidebar.querySelector('a');
      activeLink?.focus();
      sidebar.dispatchEvent(new Event('portal:menu', { bubbles: true }));
    } else if (returnFocus) {
      menu.focus();
    }
  }

  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  document.querySelector('[data-menu-close]')?.addEventListener('click', () => setMenu(false, true));
  mobile.addEventListener('change', () => setMenu(false, mobile.matches && sidebar?.contains(document.activeElement)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false, true);
  });
  document.addEventListener('focusin', event => {
    if (document.body.classList.contains('menu-open') && !event.target.closest('#sidebar, [data-menu], [data-menu-close]')) {
      setMenu(false);
    }
  });
  setMenu(false);

  const profileMenu = document.querySelector('[data-profile-menu]');
  if (profileMenu) {
    function closeProfileWhenOutside(event) {
      if (!profileMenu.contains(event.target) && !document.querySelector('dialog[open]')) {
        profileMenu.open = false;
      }
    }

    document.addEventListener('click', closeProfileWhenOutside);
    document.addEventListener('focusin', closeProfileWhenOutside);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !profileMenu.open || document.querySelector('dialog[open]')) return;
      if (profileMenu.querySelector('.appearance-popover')?.getClientRects().length) return;
      event.preventDefault();
      profileMenu.open = false;
      profileMenu.querySelector('summary').focus();
    });
  }

  document.querySelector('[data-workspace]')?.addEventListener('change', event => {
    window.location.assign(event.target.value);
  });

  for (const editor of document.querySelectorAll('[data-image-editor]')) {
    const input = editor.querySelector('input[type="file"]');
    const remove = editor.querySelector('[name="removeImage"]');
    const preview = editor.querySelector('[data-image-preview]');
    const status = editor.querySelector('[role="status"]');
    const undo = editor.querySelector('[data-undo-image]');

    function display(source) {
      preview.hidden = !source;
      if (source) preview.src = source;
      else preview.removeAttribute('src');
    }

    function feedback(message, invalid = false) {
      status.textContent = message;
      status.classList.toggle('field-error', invalid);
      input.setCustomValidity(invalid ? message : '');
      if (invalid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function update() {
      const file = input.files[0];
      undo.hidden = !file && !remove?.checked;
      display(remove?.checked ? preview.dataset.fallback : preview.dataset.saved);
      feedback(remove?.checked ? 'The default will be restored when you save.' : '');
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) return feedback('Choose an image of 4 MB or less.', true);
      if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return feedback('Choose a JPEG, PNG, or WebP image.', true);
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (input.files[0] !== file) return;
        display(reader.result);
        feedback('New image selected. Save to apply it.');
      };
      reader.onerror = () => {
        if (input.files[0] === file) feedback('This file could not be read. Choose it again.', true);
      };
      reader.readAsDataURL(file);
    }

    input.addEventListener('change', () => {
      if (remove && input.files.length) remove.checked = false;
      update();
    });
    preview.addEventListener('error', () => {
      if (input.files.length && preview.getAttribute('src')?.startsWith('data:')) {
        display(preview.dataset.saved);
        feedback('This image could not be opened. Choose another JPEG, PNG, or WebP.', true);
      }
    });
    remove?.addEventListener('change', () => { input.value = ''; update(); });
    undo.addEventListener('click', () => {
      input.value = '';
      if (remove) remove.checked = false;
      update();
      input.focus();
    });
    input.form.addEventListener('reset', () => queueMicrotask(update));
  }

  for (const button of document.querySelectorAll('[data-password]')) {
    const input = document.getElementById(button.dataset.password);
    const field = input.name === 'confirmPassword' ? 'password confirmation' : 'password';
    button.hidden = false;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
      button.setAttribute('aria-label', (show ? 'Hide ' : 'Show ') + field);
    });
  }

  for (const confirmation of document.querySelectorAll('[data-match-password]')) {
    const password = document.getElementById(confirmation.dataset.matchPassword);
    const error = document.getElementById(confirmation.getAttribute('aria-describedby'));
    const mismatch = 'Passwords don’t match. Enter the same password in both fields.';

    function checkMatch(showError) {
      const different = confirmation.value !== '' && confirmation.value !== password.value;
      confirmation.setCustomValidity(different ? mismatch : '');
      error.hidden = !(different && showError);
      error.textContent = error.hidden ? '' : mismatch;
      if (error.hidden) confirmation.removeAttribute('aria-invalid');
      else confirmation.setAttribute('aria-invalid', 'true');
    }

    for (const field of [password, confirmation]) {
      field.addEventListener('input', () => checkMatch(!error.hidden));
      field.addEventListener('change', () => checkMatch(true));
    }
    confirmation.addEventListener('blur', () => checkMatch(true));
    confirmation.addEventListener('invalid', () => checkMatch(true));
    // Recheck autofilled values before either a live or a preview form submits.
    confirmation.form.addEventListener('submit', event => {
      checkMatch(true);
      if (!confirmation.reportValidity()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }

  const dialog = document.querySelector('#portal-dialog');
  const confirmed = new WeakSet();
  let pendingForm;
  let submitter;
  let dialogTrigger;

  function openDialog({ title, message, label, confirm }) {
    if (!dialog) return;
    dialog.querySelector('[data-dialog-title]').textContent = title;
    dialog.querySelector('[data-dialog-message]').textContent = message;
    dialog.querySelector('[data-dialog-cancel]').hidden = !confirm;
    const button = dialog.querySelector('[data-dialog-confirm]');
    button.textContent = label;
    dialog.returnValue = '';
    dialogTrigger = submitter || document.activeElement;
    dialog.showModal();
    if (!confirm) button.focus();
    dialog.dispatchEvent(new Event('portal:open', { bubbles: true }));
  }

  function showPreview(message) {
    openDialog({ title: 'Preview complete', message, label: 'Got it', confirm: false });
  }

  dialog?.addEventListener('close', () => {
    const form = pendingForm;
    const button = submitter;
    pendingForm = null;
    submitter = null;
    dialogTrigger?.focus();
    if (form && dialog.returnValue === 'confirm' && form.reportValidity()) {
      confirmed.add(form);
      form.requestSubmit(button || undefined);
    }
  });

  for (const form of document.querySelectorAll('[data-confirm]')) {
    if (!dialog?.showModal) continue;
    // The disclosure provides a two-step sign-out when scripts are unavailable.
    const disclosure = form.querySelector('[data-confirm-disclosure]');
    if (disclosure) disclosure.replaceWith(disclosure.querySelector('button[type="submit"]'));
    form.addEventListener('submit', event => {
      if (confirmed.delete(form)) return;
      event.preventDefault();
      pendingForm = form;
      submitter = event.submitter;
      openDialog({
        title: form.dataset.confirm,
        message: form.dataset.confirmMessage || 'Confirm to save this change.',
        label: submitter?.textContent.trim() || 'Continue',
        confirm: true,
      });
    });
  }

  for (const button of document.querySelectorAll('[data-preview-action]')) {
    button.addEventListener('click', () => showPreview(button.dataset.message));
  }

  for (const form of document.querySelectorAll('[data-preview-form]')) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      showPreview('This is a sample workspace. Changes are available in the live portal.');
    });
    form.inert = false;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = false;
  }

  for (const form of document.querySelectorAll('[data-submit]')) {
    const fields = Array.from(form.elements);
    let feedback = form.querySelector('.form-feedback');

    function showFormStatus(message, kind) {
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'form-feedback';
        feedback.setAttribute('aria-live', 'polite');
        form.append(feedback);
      }
      feedback.textContent = message;
      feedback.dataset.kind = kind;
      feedback.hidden = false;
    }

    function showFormError(message, errors = [], expired = false) {
      showFormStatus(message, 'error');
      if (errors.length) {
        const list = document.createElement('ul');
        for (const error of errors) {
          const item = document.createElement('li');
          const field = fields.find(input => input.name === error.field || input.name === error.field?.split('.')[0]);
          if (field?.id && !field.disabled) {
            field.setAttribute('aria-invalid', 'true');
            const link = document.createElement('a');
            link.href = '#' + field.id;
            link.textContent = error.message;
            link.addEventListener('click', event => {
              event.preventDefault();
              field.focus();
            });
            item.append(link);
          } else {
            item.textContent = error.message;
          }
          list.append(item);
        }
        feedback.append(list);
      }
      if (expired) {
        const link = document.createElement('a');
        link.href = '/auth/login';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Sign in in a new tab';
        feedback.append(document.createElement('br'), link);
      }
      feedback.tabIndex = -1;
      feedback.focus();
      feedback.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
    }

    form.addEventListener('input', event => {
      if (!event.target.validity?.customError) event.target.removeAttribute('aria-invalid');
    });
    form.addEventListener('reset', () => {
      if (feedback) feedback.hidden = true;
      fields.forEach(field => field.removeAttribute('aria-invalid'));
    });
    form.addEventListener('submit', async event => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (form.dataset.saving === 'true') return;
      const button = event.submitter;
      const values = new FormData(form, button || undefined);
      const body = form.enctype === 'multipart/form-data' ? values : new URLSearchParams(values);
      fields.forEach(field => field.removeAttribute('aria-invalid'));
      form.dataset.saving = 'true';
      form.setAttribute('aria-busy', 'true');
      if (button) {
        button.classList.add('is-submitting');
        button.disabled = true;
      }
      showFormStatus('Saving…', 'pending');

      try {
        const response = await fetch(form.action, { method: 'POST', body, headers: { 'X-Portal-Form': '1' } });
        if (response.redirected && new URL(response.url).pathname === '/auth/login') {
          showFormError('Your session expired. Sign in, then retry this form.', [], true);
          return;
        }
        if (!response.headers.get('content-type')?.includes('application/json')) {
          showFormError(response.status === 403
            ? 'Your account no longer has permission to make this change.'
            : 'The portal could not confirm the save. Reload the page to check before retrying.');
          return;
        }
        const result = await response.json();
        if (!response.ok) {
          showFormError(result.message || 'Review the form and try saving again.', Array.isArray(result.errors) ? result.errors : []);
          return;
        }
        window.location.assign(result.redirectTo);
      } catch {
        showFormError('The portal could not confirm the save. Check your connection before retrying.');
      } finally {
        delete form.dataset.saving;
        form.removeAttribute('aria-busy');
        if (button) {
          button.classList.remove('is-submitting');
          button.disabled = false;
        }
      }
    });
  }

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    for (const button of document.querySelectorAll('.is-submitting')) {
      button.disabled = false;
      button.classList.remove('is-submitting');
      button.form?.removeAttribute('aria-busy');
      if (button.form) delete button.form.dataset.saving;
    }
  });

  for (const input of document.querySelectorAll('[data-table-search]')) {
    const tableId = input.dataset.tableSearch;
    const rows = document.getElementById(tableId).tBodies[0].rows;
    const empty = document.querySelector(`[data-empty-for="${tableId}"]`);
    const status = document.querySelector(`[data-count-for="${tableId}"]`);
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      let matches = 0;
      for (const row of rows) {
        const words = row.dataset.searchRow || row.textContent;
        row.hidden = !words.toLowerCase().includes(query);
        if (!row.hidden) matches += 1;
      }
      status.textContent = query ? `Showing ${matches} of ${rows.length}` : '';
      status.hidden = !query;
      if (matches === 0 && empty.hidden) {
        empty.hidden = false;
        empty.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
      } else {
        empty.hidden = matches > 0;
      }
    });
  }

  for (const wrap of document.querySelectorAll('.table-wrap')) {
    const table = wrap.querySelector('table');
    if (!table?.caption) continue;
    const hint = document.createElement('p');
    hint.className = 'table-scroll-note';
    hint.textContent = 'Scroll to see all columns.';
    hint.hidden = true;
    wrap.after(hint);
    const updateScrollAccess = () => {
      const overflow = wrap.scrollWidth > wrap.clientWidth;
      hint.hidden = !overflow;
      if (overflow) {
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', table.caption.textContent.trim());
      } else {
        wrap.removeAttribute('tabindex');
        wrap.removeAttribute('role');
        wrap.removeAttribute('aria-label');
      }
    };
    const observer = new ResizeObserver(updateScrollAccess);
    observer.observe(wrap);
    observer.observe(table);
  }

  for (const form of document.querySelectorAll('[data-gradebook]')) {
    const count = form.querySelector('[data-grade-count]');
    const submit = form.querySelector('button[type="submit"]');
    const updateGrades = () => {
      const selected = Array.from(form.querySelectorAll('select')).filter(select => select.value).length;
      count.textContent = selected ? `${selected} grade${selected === 1 ? '' : 's'} selected · Unsaved` : 'Select a grade to save';
      count.hidden = false;
      submit.disabled = selected === 0 || form.dataset.saving === 'true';
    };
    form.addEventListener('change', updateGrades);
    form.addEventListener('reset', () => queueMicrotask(updateGrades));
    updateGrades();
  }

  const meetings = document.querySelector('[data-meetings]');
  const template = document.querySelector('[data-meeting-template]');
  const addMeeting = document.querySelector('[data-add-meeting]');

  if (meetings && template && addMeeting) {
    let nextIndex = meetings.children.length;
    const refreshRemoveButtons = () => {
      for (const button of meetings.querySelectorAll('[data-remove-meeting]')) {
        button.hidden = meetings.children.length < 2;
      }
    };
    const checkTimes = (row) => {
      const start = row.querySelector('[data-start]');
      const end = row.querySelector('[data-end]');
      end.setCustomValidity(end.value && start.value && end.value <= start.value
        ? 'End time must be later than start time.' : '');
    };
    meetings.addEventListener('input', event => {
      if (event.target.matches('[data-start], [data-end]')) checkTimes(event.target.closest('[data-meeting]'));
    });
    meetings.addEventListener('click', event => {
      if (!event.target.matches('[data-remove-meeting]')) return;
      event.target.closest('[data-meeting]').remove();
      refreshRemoveButtons();
      addMeeting.focus();
    });
    meetings.closest('form').addEventListener('reset', () => {
      for (const end of meetings.querySelectorAll('[data-end]')) end.setCustomValidity('');
    });
    addMeeting.addEventListener('click', () => {
      const row = template.content.firstElementChild.cloneNode(true);
      for (const element of row.querySelectorAll('[id], [name], [for]')) {
        for (const attribute of ['id', 'name', 'for']) {
          if (element.hasAttribute(attribute)) {
            element.setAttribute(attribute, element.getAttribute(attribute).replace('INDEX', nextIndex));
          }
        }
      }
      nextIndex += 1;
      meetings.append(row);
      refreshRemoveButtons();
      row.querySelector('select').focus();
      row.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
    });
    refreshRemoveButtons();
    addMeeting.hidden = false;
  }
})();
