function setupLoginForm() {
    const form = document.getElementById("loginForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const loginButton = document.getElementById("loginButton");
        const loginMessage = document.getElementById("loginMessage");

        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
        loginMessage.innerHTML = "";

        try {
            clearAuthStorage();

            const response = await requestAPI("/api/token/", "POST", {
                username: username,
                password: password
            });

            localStorage.setItem("access_token", response.data.access);
            localStorage.setItem("refresh_token", response.data.refresh);
            localStorage.setItem("username", username);

            if (response.data.role) {
                localStorage.setItem("role", response.data.role);
            }

            if (response.data.user_role) {
                localStorage.setItem("user_role", response.data.user_role);
            }

            window.location.hash = "#dashboard";
            handleRoute();
        } catch (error) {
            loginMessage.innerHTML = `
                <div class="alert alert-danger mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Login gagal. Periksa username dan password, lalu pastikan server API sedang berjalan.
                </div>
            `;
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Masuk';
        }
    });
}

function logout() {
    clearAuthStorage();

    window.location.hash = "#dashboard";
    handleRoute();
}