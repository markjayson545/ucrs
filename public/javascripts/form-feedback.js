// Show server errors at the form and next to the fields they refer to.
function createFormFeedback(form) {
  let summary = form.querySelector('.form-feedback');
  let submittedFields = [];
  const inlineErrors = new Map();
  const normalizeName = name => name.replace(/\[([^\]]+)\]/g, '.$1');

  function clearField(field) {
    const inline = inlineErrors.get(field);
    if (!inline) return;
    const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/)
      .filter(id => id && id !== inline.id);
    if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
    else field.removeAttribute('aria-describedby');
    const hasOtherError = descriptions.some(id => document.getElementById(id)?.matches('.field-error:not([hidden])'));
    if (!field.validity.customError && !hasOtherError) field.removeAttribute('aria-invalid');
    inline.remove();
    inlineErrors.delete(field);
  }

  function show(message, kind, { errors = [], recoveryLink } = {}) {
    for (const field of inlineErrors.keys()) clearField(field);
    if (kind === 'pending') {
      // Match the submitted row numbers even if a meeting is removed while saving.
      submittedFields = Array.from(form.elements)
        .filter(field => field.id && field.name && field.matches('input, select, textarea'))
        .map(field => ({ field, name: normalizeName(field.name), path: field.dataset.errorField }));
    }
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'form-feedback';
      form.prepend(summary);
    }
    summary.removeAttribute('role');
    summary.setAttribute('aria-live', kind === 'error' ? 'off' : 'polite');
    summary.textContent = errors.length === 1 && errors[0].message === message ? 'Review this before trying again.' : message;
    summary.dataset.kind = kind;

    if (errors.length) {
      const fields = submittedFields
        .filter(({ field }) => field.isConnected && !field.matches(':disabled, [readonly]') && !field.closest('[hidden]'));
      const list = document.createElement('ul');
      for (const error of errors) {
        const name = normalizeName(error.field || '');
        const entry = fields.find(field => field.name === name || field.path === name)
          || fields.find(field => field.name === name.split('.')[0]);
        const field = entry?.field;
        const item = document.createElement('li');
        if (field) {
          let inline = inlineErrors.get(field);
          if (!inline) {
            inline = document.createElement('p');
            inline.id = field.id + '-server-error';
            inline.className = 'field-hint field-error';
            (field.closest('.password-field, label') || field).after(inline);
            const description = field.getAttribute('aria-describedby') || '';
            field.setAttribute('aria-describedby', `${description} ${inline.id}`.trim());
            field.setAttribute('aria-invalid', 'true');
            inlineErrors.set(field, inline);
          }
          inline.textContent = [inline.textContent, error.message].filter(Boolean).join(' ');

          const link = document.createElement('a');
          link.href = '#' + field.id;
          link.textContent = error.message;
          link.addEventListener('click', event => {
            event.preventDefault();
            if (field.isConnected && !field.disabled) field.focus();
          });
          item.append(link);
        } else {
          item.textContent = error.message;
        }
        list.append(item);
      }
      summary.append(list);
    }
    if (recoveryLink) summary.append(document.createElement('br'), recoveryLink);
    summary.hidden = false;
    if (kind === 'error') {
      summary.tabIndex = -1;
      summary.focus();
    }
    summary.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
  }

  for (const event of ['input', 'change']) {
    form.addEventListener(event, event => clearField(event.target));
  }
  form.addEventListener('reset', () => {
    if (summary) summary.hidden = true;
    for (const field of inlineErrors.keys()) clearField(field);
  });
  return { show };
}
