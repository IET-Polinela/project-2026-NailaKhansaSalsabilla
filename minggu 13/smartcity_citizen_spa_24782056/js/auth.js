function setupLoginForm() {
    const form = document.getElementById("loginForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const loginButton = document.getElementById("loginButton");
        const loginMessage = document.getElementById("loginMessage");

        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
        loginMessage.innerHTML = "";

        try {
            const response = await requestAPI("/api/token/", "POST", {
                username: username,
                password: password
            });

            localStorage.setItem("access_token", response.data.access);
            localStorage.setItem("refresh_token", response.data.refresh);
            localStorage.setItem("username", username);

            window.location.hash = "#dashboard";
            handleRoute();
        } catch (error) {
            loginMessage.innerHTML = `
                <div class="alert alert-danger mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Login gagal. Periksa username dan password.
                </div>
            `;
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Masuk';
        }
    });
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");

    window.location.hash = "#dashboard";
    handleRoute();
}