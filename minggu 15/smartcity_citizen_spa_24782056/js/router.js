function getAppContainer() {
    return document.getElementById('app-content') || document.getElementById('app') || document.body;
}

function hasAccessToken() {
    return !!localStorage.getItem('access_token');
}

function setHashSilently(hash) {
    const newUrl = window.location.pathname + window.location.search + hash;
    history.replaceState(null, '', newUrl);
}

function goLogin() {
    setHashSilently('#login');
    renderLoginPageSafe();
}

function goDashboard() {
    setHashSilently('#dashboard');
    renderDashboardPageSafe();
}

function renderLoginFallback() {
    const app = getAppContainer();

    app.innerHTML = `
        <div class="container py-5">
            <div class="row justify-content-center">
                <div class="col-md-7 col-lg-6">
                    <div class="card shadow border-0 rounded-4">
                        <div class="card-body p-5">
                            <h3 class="text-center fw-bold mb-2">Masuk Citizen Portal</h3>
                            <p class="text-center text-muted mb-4">Gunakan akun untuk mengakses data laporan.</p>

                            <form id="loginForm">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Username</label>
                                    <input type="text" id="loginUsername" class="form-control soft-input" required>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Password</label>
                                    <input type="password" id="loginPassword" class="form-control soft-input" required>
                                </div>

                                <button type="submit" class="btn btn-primary w-100 fw-bold mt-2">
                                    <i class="bi bi-box-arrow-in-right me-1"></i> Masuk
                                </button>
                            </form>

                            <div class="text-center mt-3">
                                <a href="#register">Belum punya akun? Register</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (typeof setupLoginForm === 'function') {
        setupLoginForm();
    }
}

function renderRegisterFallback() {
    const app = getAppContainer();

    app.innerHTML = `
        <div class="container py-5">
            <div class="row justify-content-center">
                <div class="col-md-7 col-lg-6">
                    <div class="card shadow border-0 rounded-4">
                        <div class="card-body p-5">
                            <h3 class="text-center fw-bold mb-2">Daftar Citizen</h3>
                            <p class="text-center text-muted mb-4">Buat akun baru untuk mengirim laporan.</p>

                            <form id="registerForm">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Username</label>
                                    <input type="text" id="registerUsername" class="form-control soft-input" required>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Password</label>
                                    <input type="password" id="registerPassword" class="form-control soft-input" required>
                                </div>

                                <button type="submit" class="btn btn-primary w-100 fw-bold mt-2">
                                    Register
                                </button>
                            </form>

                            <div class="text-center mt-3">
                                <a href="#login">Sudah punya akun? Login</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (typeof setupRegisterForm === 'function') {
        setupRegisterForm();
    }
}

function renderDashboardFallback() {
    const app = getAppContainer();

    app.innerHTML = `
        <div class="container-fluid">
            <div class="row g-4">
                <div class="col-lg-3">
                    <div class="card side-card mb-3">
                        <div class="card-body">
                            <button id="btnBukaModal" class="btn btn-primary w-100 create-button">
                                <i class="bi bi-plus-circle d-block mb-2"></i>
                                Buat<br>Laporan Baru
                            </button>
                        </div>
                    </div>

                    <div id="summaryStats" class="card side-card">
                        <div class="card-body">
                            <div class="status-title mb-2">Ringkasan Laporan</div>
                            <div class="status-row d-flex justify-content-between">
                                <span>Draf</span>
                                <span class="badge bg-secondary">0</span>
                            </div>
                            <div class="status-row d-flex justify-content-between">
                                <span>Reported</span>
                                <span class="badge bg-primary">0</span>
                            </div>
                            <div class="status-row d-flex justify-content-between">
                                <span>Selesai</span>
                                <span class="badge bg-success">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-9">
                    <ul class="nav content-tabs">
                        <li class="nav-item">
                            <button id="myReportsTab" class="nav-link active" type="button">
                                Laporan Saya
                            </button>
                        </li>
                        <li class="nav-item">
                            <button id="feedTab" class="nav-link" type="button">
                                Feed Kota
                            </button>
                        </li>
                        <li class="nav-item d-none">
                            <button id="tabFeedKota" class="nav-link" type="button">
                                Feed Kota
                            </button>
                        </li>
                    </ul>

                    <div id="reportList" class="row g-4"></div>
                    <div id="listContainer" class="row g-4"></div>
                    <div id="paginationContainer" class="mt-4"></div>
                </div>
            </div>
        </div>
    `;

    if (typeof setupDashboardEvents === 'function') {
        setupDashboardEvents();
    }

    if (typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}

function renderLoginPageSafe() {
    if (typeof renderLoginPage === 'function') {
        renderLoginPage();
    } else if (typeof renderLogin === 'function') {
        renderLogin();
    } else {
        renderLoginFallback();
    }

    const userGreeting = document.getElementById('userGreeting');
    const logoutButton = document.getElementById('logoutButton');

    if (userGreeting) userGreeting.classList.add('d-none');
    if (logoutButton) logoutButton.classList.add('d-none');
}

function renderRegisterPageSafe() {
    if (typeof renderRegisterPage === 'function') {
        renderRegisterPage();
    } else if (typeof renderRegister === 'function') {
        renderRegister();
    } else {
        renderRegisterFallback();
    }

    const userGreeting = document.getElementById('userGreeting');
    const logoutButton = document.getElementById('logoutButton');

    if (userGreeting) userGreeting.classList.add('d-none');
    if (logoutButton) logoutButton.classList.add('d-none');
}

function renderDashboardPageSafe() {
    if (typeof renderDashboardPage === 'function') {
        renderDashboardPage();
    } else if (typeof renderDashboard === 'function') {
        renderDashboard();
    } else {
        renderDashboardFallback();
    }

    const userGreeting = document.getElementById('userGreeting');
    const logoutButton = document.getElementById('logoutButton');

    if (userGreeting) userGreeting.classList.remove('d-none');
    if (logoutButton) logoutButton.classList.remove('d-none');

    if (typeof setupDashboardEvents === 'function') {
        setupDashboardEvents();
    }

    if (typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}

function handleRouting() {
    const token = hasAccessToken();
    const hash = window.location.hash || '';

    if (!hash || hash === '#') {
        if (token) {
            goDashboard();
        } else {
            goLogin();
        }
        return;
    }

    if (hash === '#dashboard') {
        if (token) {
            renderDashboardPageSafe();
        } else {
            goLogin();
        }
        return;
    }

    if (hash === '#login') {
        if (token) {
            goDashboard();
        } else {
            renderLoginPageSafe();
        }
        return;
    }

    if (hash === '#register') {
        if (token) {
            goDashboard();
        } else {
            renderRegisterPageSafe();
        }
        return;
    }

    if (token) {
        goDashboard();
    } else {
        goLogin();
    }
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);
window.addEventListener('load', handleRouting);