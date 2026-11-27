// Both account forms submit JSON and display the server's response here.
const authForm = document.querySelector('[data-auth]');
const authFeedback = createFormFeedback(authForm);
const submitButton = authForm.querySelector('button[type="submit"]');

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;

  const payload = Object.fromEntries(new FormData(authForm));
  if (payload.idNumber?.trim() === '') delete payload.idNumber;
  submitButton.disabled = true;
  submitButton.classList.add('is-submitting');
  authForm.setAttribute('aria-busy', 'true');
  authFeedback.show(authForm.dataset.pending, 'pending');

  let redirect;
  try {
    const response = await fetch(authForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Portal-Form': '1' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      const errors = Array.isArray(result.errors) ? result.errors : [];
      authFeedback.show(errors.length ? 'Check the highlighted fields.' : result.message || 'The request could not be completed.',
        'error', { errors });
      return;
    }
    redirect = result.redirectTo || authForm.dataset.success;
  } catch (error) {
    authFeedback.show(error instanceof SyntaxError
      ? 'The server returned an unexpected response. Try again.'
      : 'Could not reach the portal. Check your connection and try again.', 'error');
  } finally {
    authForm.removeAttribute('aria-busy');
    submitButton.classList.remove('is-submitting');
    submitButton.disabled = false;
  }
  if (redirect) window.location.assign(redirect);
});
