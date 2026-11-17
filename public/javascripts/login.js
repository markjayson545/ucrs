const form = document.querySelector('#login-form');
const feedback = form.querySelector('.form-feedback');
const button = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = new FormData(form);

    const payload = {
        email: fields.get('email'),
        password: fields.get('password')
    }

    button.disabled = true;
    feedback.hidden = false;
    feedback.textContent = 'Signing in...';

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            const details = result.errors
                ?.map(error => error.message)
                .join(' ');

            throw new Error((
                details || result.message || 'Sign-in failed. Please try again.'
            ));
        }
        window.location.assign(result.redirectTo);
    } catch (e) {
        feedback.hidden = false;
        feedback.textContent = e.message;
    } finally {
        button.disabled = false;
    }
})