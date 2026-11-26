// Both account forms submit JSON and display the server's response here.
const authForm = document.querySelector('[data-auth]');
const feedback = authForm.querySelector('[role="status"]');
const submitButton = authForm.querySelector('button[type="submit"]');

function showFeedback(message, kind) {
  feedback.textContent = message;
  feedback.dataset.kind = kind;
  feedback.hidden = false;
  feedback.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
}

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;

  const payload = Object.fromEntries(new FormData(authForm));
  if (payload.idNumber?.trim() === '') delete payload.idNumber;
  submitButton.disabled = true;
  submitButton.classList.add('is-submitting');
  authForm.setAttribute('aria-busy', 'true');
  showFeedback(authForm.dataset.pending, 'pending');

  let redirect;
  try {
    const response = await fetch(authForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Portal-Form': '1' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      const messages = result.errors?.map(error => error.message).join(' ');
      throw new Error(messages || result.message || 'The request could not be completed.');
    }
    redirect = result.redirectTo || authForm.dataset.success;
  } catch (error) {
    showFeedback(error instanceof SyntaxError ? 'The server returned an unexpected response. Try again.' : error.message, 'error');
  } finally {
    authForm.removeAttribute('aria-busy');
    submitButton.classList.remove('is-submitting');
    submitButton.disabled = false;
  }
  if (redirect) window.location.assign(redirect);
});
