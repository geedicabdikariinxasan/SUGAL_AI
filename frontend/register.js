document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerButton = document.getElementById('registerButton');
    const buttonText = document.getElementById('buttonText');
    const buttonArrow = document.getElementById('buttonArrow');

    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const terms = document.getElementById('terms').checked;

            if (password.length < 8) {
                alert('Password-ku waa inuu ka badan yahay ama le\'eg yahay 8 xaraf.');
                return;
            }

            if (password !== confirmPassword) {
                alert('Password-yadu isku mid ma ahan! Fadlan dib u eeg.');
                return;
            }

            if (!terms) {
                alert('Fadlan aqbal Terms & Conditions.');
                return;
            }

            // Start Loading State
            if (registerButton) registerButton.disabled = true;
            if (buttonText) buttonText.textContent = 'Creating Account...';

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fullName: fullName,
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Account-kaaga waa la sameeyay! Waxaa loo gudbinayaa Login Page...');
                    // Toos u redirect-garee root-ka ama login.html
                    window.location.href = '/'; 
                } else {
                    alert(data.detail || 'Cillad ayaa dhacday.');
                    resetButton();
                }
            } catch (error) {
                alert('Network error ama server-ka ayaa xidhan.');
                resetButton();
            }
        });
    }

    function resetButton() {
        if (registerButton) registerButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Create Account';
    }
});