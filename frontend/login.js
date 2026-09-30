document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // 1. Isha Password-ka lagu arko / qariyo
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
        });
    }

    // 2. Marka Login-ka la riixo
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const messageBox = document.getElementById('messageBox');
            const loginButton = document.getElementById('loginButton');
            const loginText = document.getElementById('loginText');

            if (!email || !password) {
                showMessage("Fadlan geli email-kaaga iyo password-kaaga!", "error");
                return;
            }

            // Nadiifi fariintii hore oo batoonka xiro
            if (messageBox) messageBox.classList.add('hidden');
            if (loginButton) loginButton.disabled = true;
            if (loginText) loginText.textContent = "Logging in...";

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    // Keydi xogta qofka
                    localStorage.setItem('user', JSON.stringify(data.user));

                    showMessage("Si guul leh ayaad u soo gashay!", "success");

                    // 🚀 TOOS U GEL DASHBOARD-KA
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 400);

                } else {
                    showMessage(data.detail || "Email-ka ama Password-ka waa khalad!", "error");
                    resetButton();
                }
            } catch (err) {
                console.error("Login Error:", err);
                showMessage("Server-ka laguma xiri karin! Hubi in backend-ku shaqaynayo.", "error");
                resetButton();
            }
        });
    }

    function showMessage(text, type) {
        const messageBox = document.getElementById('messageBox');
        if (!messageBox) return;

        messageBox.textContent = text;
        messageBox.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'border-red-200', 'bg-green-50', 'text-green-600', 'border-green-200');

        if (type === 'error') {
            messageBox.classList.add('bg-red-50', 'text-red-600', 'border', 'border-red-200');
        } else {
            messageBox.classList.add('bg-green-50', 'text-green-600', 'border', 'border-green-200');
        }
    }

    function resetButton() {
        const loginButton = document.getElementById('loginButton');
        const loginText = document.getElementById('loginText');
        if (loginButton) loginButton.disabled = false;
        if (loginText) loginText.textContent = "Login";
    }
});