const form = document.querySelector('#register-form');
const feedback = form.querySelector('.form-feedback');
const button = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = new FormData(form);
    const payload = {
        name: fields.get('name'),
        email: fields.get('email'),
        department: fields.get('department'),
        password: fields.get('password')
    }

    const idNumber = fields.get('idNumber').trim();
    if (idNumber) payload.idNumber = idNumber;

    button.disabled = true;
    feedback.hidden = false;
    feedback.textContent = 'Creating your account...';

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if ((!response.ok)) {
            const details = result.errors
                ?.map(error => error.message)
                .join(' ');

            throw new Error((
                details || result.message || 'Registration failed. Please try again.'
            ));
        }

        feedback.textContent = 'Registration successful! Redirecting...';

        form.reset();

        setTimeout(() => {
            window.location.href = '/auth/login';
        }, 2000);

    } catch (e) {
        feedback.textContent = e.message;
    } finally {
        button.disabled = false;
    }
})