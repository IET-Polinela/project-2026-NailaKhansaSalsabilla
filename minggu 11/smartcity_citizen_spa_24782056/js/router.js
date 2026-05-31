let cachedReports = [];

function getAccessToken() {
    return localStorage.getItem("access_token");
}

function getRefreshToken() {
    return localStorage.getItem("refresh_token");
}

function escapeHTML(value) {
    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function updateNavbar() {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) {
        return;
    }

    if (getAccessToken()) {
        logoutButton.classList.remove("d-none");
    } else {
        logoutButton.classList.add("d-none");
    }
}

function renderLoginPage() {
    return `
        <div class="row g-4 align-items-stretch">
            <aside class="col-12 col-lg-3">
                <div class="side-card h-100 p-4">
                    <div class="mini-icon mb-3">
                        <i class="bi bi-compass-fill"></i>
                    </div>
                    <h4 class="fw-bold">Akses Warga</h4>
                    <p class="text-muted mb-0">
                        Portal SPA untuk membaca laporan publik dan mengelola draft milik akun sendiri.
                    </p>
                </div>
            </aside>

            <section class="col-12 col-lg-6">
                <div class="glass-card p-4 p-md-5">
                    <div class="text-center mb-4">
                        <div class="mini-icon mb-3">
                            <i class="bi bi-shield-lock-fill"></i>
                        </div>
                        <h3 class="fw-bold mb-1">Masuk Citizen Portal</h3>
                        <p class="text-muted mb-0">Gunakan akun citizen untuk mengakses dashboard laporan.</p>
                    </div>

                    <form id="loginForm">
                        <div class="mb-3">
                            <label for="username" class="form-label fw-semibold">Username</label>
                            <input type="text" id="username" class="form-control soft-input" required>
                        </div>

                        <div class="mb-4">
                            <label for="password" class="form-label fw-semibold">Password</label>
                            <input type="password" id="password" class="form-control soft-input" required>
                        </div>

                        <button type="submit" id="loginButton" class="btn btn-primary w-100 py-2 fw-semibold">
                            <i class="bi bi-box-arrow-in-right me-2"></i>Masuk
                        </button>

                        <div id="loginMessage"></div>
                    </form>
                </div>
            </section>

            <aside class="col-12 col-lg-3">
                <div class="side-card h-100 p-4">
                    <div class="mini-icon mb-3">
                        <i class="bi bi-database-lock"></i>
                    </div>
                    <h4 class="fw-bold">Sesi Token</h4>
                    <p class="text-muted mb-0">
                        Token JWT akan disimpan di localStorage setelah login berhasil.
                    </p>
                </div>
            </aside>
        </div>
    `;
}

function renderDashboardPage() {
    return `
        <div class="row g-4">
            <aside class="col-12 col-lg-3">
                <div class="side-card p-4 mb-4">
                    <div class="mini-icon mb-3">
                        <i class="bi bi-sliders2-vertical"></i>
                    </div>
                    <h4 class="fw-bold">Kontrol Portal</h4>
                    <p class="text-muted text-small">
                        Muat ulang data laporan dari API Django.
                    </p>
                    <button class="btn btn-primary w-100" onclick="loadReports()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Muat Ulang
                    </button>
                </div>

                <div class="side-card p-4">
                    <h6 class="fw-bold mb-3">
                        <i class="bi bi-info-circle me-2"></i>Aturan Draft
                    </h6>
                    <p class="text-muted text-small mb-0">
                        Draft hanya muncul jika dibuat oleh akun citizen yang sedang login.
                    </p>
                </div>
            </aside>

            <section class="col-12 col-lg-6">
                <div class="glass-card p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-start gap-3">
                        <div>
                            <h3 class="fw-bold mb-1">
                                <i class="bi bi-kanban-fill me-2"></i>Ruang Laporan Citizen
                            </h3>
                            <p class="text-muted mb-0">
                                Laporan publik dan draft milik akun login ditampilkan dari endpoint /api/report/.
                            </p>
                        </div>
                        <span class="badge text-bg-primary rounded-pill">SPA</span>
                    </div>
                </div>

                <div id="workPanel"></div>

                <div id="reportList">
                    <div class="alert alert-info">
                        <span class="spinner-border spinner-border-sm me-2"></span>
                        Memuat data laporan...
                    </div>
                </div>
            </section>

            <aside class="col-12 col-lg-3">
                <div class="side-card p-4 mb-4">
                    <div class="mini-icon mb-3">
                        <i class="bi bi-fingerprint"></i>
                    </div>
                    <h4 class="fw-bold">Autentikasi</h4>
                    <p class="text-muted text-small">Token JWT aktif di browser.</p>
                    <div id="tokenStatus"></div>
                </div>

                <div class="side-card p-4">
                    <h5 class="fw-bold mb-3">
                        <i class="bi bi-eye-fill me-2"></i>Panel Detail
                    </h5>
                    <div id="detailPanel" class="text-muted text-small">
                        Klik tombol Detail pada salah satu laporan.
                    </div>
                </div>
            </aside>
        </div>
    `;
}

function renderTokenStatus() {
    const tokenStatus = document.getElementById("tokenStatus");

    if (!tokenStatus) {
        return;
    }

    if (getAccessToken() && getRefreshToken()) {
        tokenStatus.innerHTML = `
            <div class="alert alert-success mb-2">
                <i class="bi bi-check-circle-fill me-2"></i>access_token tersimpan
            </div>
            <div class="alert alert-success mb-0">
                <i class="bi bi-check-circle-fill me-2"></i>refresh_token tersimpan
            </div>
        `;
    } else {
        tokenStatus.innerHTML = `
            <div class="alert alert-warning mb-0">
                <i class="bi bi-exclamation-circle-fill me-2"></i>Token belum tersedia.
            </div>
        `;
    }
}

function getStatusBadgeClass(status) {
    if (status === "DRAFT") {
        return "text-bg-dark";
    }

    if (status === "REPORTED") {
        return "text-bg-primary";
    }

    if (status === "VERIFIED") {
        return "text-bg-info";
    }

    if (status === "IN_PROGRESS") {
        return "text-bg-warning";
    }

    if (status === "RESOLVED") {
        return "text-bg-success";
    }

    return "text-bg-secondary";
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("id-ID");
}

function getReportById(id) {
    return cachedReports.find(function (report) {
        return Number(report.id) === Number(id);
    });
}

function renderReportCards(reports) {
    const reportList = document.getElementById("reportList");

    if (!reportList) {
        return;
    }

    if (reports.length === 0) {
        reportList.innerHTML = `
            <div class="alert alert-secondary">
                <i class="bi bi-inbox-fill me-2"></i>
                Belum ada laporan yang dapat ditampilkan.
            </div>
        `;
        return;
    }

    reportList.innerHTML = reports.map(function (report) {
        const title = escapeHTML(report.title);
        const category = escapeHTML(report.category);
        const location = escapeHTML(report.location);
        const description = escapeHTML(report.description);
        const status = escapeHTML(report.status);
        const reporter = escapeHTML(report.reporter);
        const createdAt = escapeHTML(formatDate(report.created_at));
        const badgeClass = getStatusBadgeClass(report.status);
        const isDraft = report.status === "DRAFT";

        return `
            <article class="card report-item mb-3">
                <div class="d-flex">
                    <div class="report-accent"></div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
                            <div>
                                <h5 class="fw-bold mb-1">${title}</h5>
                                <div class="text-muted text-small">
                                    <i class="bi bi-tag me-1"></i>${category}
                                    <span class="mx-2">•</span>
                                    <i class="bi bi-geo-alt me-1"></i>${location}
                                </div>
                            </div>
                            <span class="badge ${badgeClass}">${status}</span>
                        </div>

                        <p class="mb-3">${description}</p>

                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div class="text-muted text-small">
                                <div><i class="bi bi-person me-1"></i>${reporter}</div>
                                <div><i class="bi bi-clock me-1"></i>${createdAt}</div>
                            </div>

                            <div class="d-flex flex-wrap gap-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="showDetail(${report.id})">
                                    <i class="bi bi-eye me-1"></i>Detail
                                </button>

                                ${isDraft ? `
                                    <button class="btn btn-sm btn-outline-warning" onclick="showEditForm(${report.id})">
                                        <i class="bi bi-pencil-square me-1"></i>Edit
                                    </button>

                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteReport(${report.id})">
                                        <i class="bi bi-trash me-1"></i>Hapus
                                    </button>

                                    <button class="btn btn-sm btn-success" onclick="submitReport(${report.id})">
                                        <i class="bi bi-send me-1"></i>Kirim
                                    </button>
                                ` : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

async function loadReports() {
    const reportList = document.getElementById("reportList");
    const workPanel = document.getElementById("workPanel");

    if (!reportList) {
        return;
    }

    if (workPanel) {
        workPanel.innerHTML = "";
    }

    reportList.innerHTML = `
        <div class="alert alert-info">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Memuat data laporan...
        </div>
    `;

    try {
        const response = await requestAPI("/api/report/", "GET");
        cachedReports = Array.isArray(response.data) ? response.data : response.data.results || [];
        renderReportCards(cachedReports);
    } catch (error) {
        if (error.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            handleRoute();
            return;
        }

        reportList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Gagal memuat laporan dari API.
            </div>
        `;
    }
}

function showDetail(id) {
    const report = getReportById(id);
    const detailPanel = document.getElementById("detailPanel");

    if (!report || !detailPanel) {
        return;
    }

    detailPanel.innerHTML = `
        <div class="mb-2">
            <span class="badge ${getStatusBadgeClass(report.status)}">${escapeHTML(report.status)}</span>
        </div>
        <h6 class="fw-bold">${escapeHTML(report.title)}</h6>
        <p class="mb-2">${escapeHTML(report.description)}</p>
        <div><i class="bi bi-tag me-1"></i>${escapeHTML(report.category)}</div>
        <div><i class="bi bi-geo-alt me-1"></i>${escapeHTML(report.location)}</div>
        <div><i class="bi bi-clock me-1"></i>${escapeHTML(formatDate(report.created_at))}</div>
    `;
}

function showEditForm(id) {
    const report = getReportById(id);
    const workPanel = document.getElementById("workPanel");

    if (!report || !workPanel || report.status !== "DRAFT") {
        return;
    }

    workPanel.innerHTML = `
        <div class="glass-card p-4 mb-4">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h5 class="fw-bold mb-1">
                        <i class="bi bi-pencil-square me-2"></i>Edit Draft
                    </h5>
                    <p class="text-muted mb-0">Perubahan hanya dapat dilakukan saat laporan masih DRAFT.</p>
                </div>
                <button class="btn btn-sm btn-outline-secondary" onclick="clearWorkPanel()">
                    Batal
                </button>
            </div>

            <form id="editForm">
                <input type="hidden" id="editId" value="${report.id}">

                <div class="mb-3">
                    <label class="form-label fw-semibold">Judul</label>
                    <input type="text" id="editTitle" class="form-control soft-input" value="${escapeHTML(report.title)}" required>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-semibold">Kategori</label>
                    <input type="text" id="editCategory" class="form-control soft-input" value="${escapeHTML(report.category)}" required>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-semibold">Lokasi</label>
                    <input type="text" id="editLocation" class="form-control soft-input" value="${escapeHTML(report.location)}" required>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-semibold">Deskripsi</label>
                    <textarea id="editDescription" class="form-control soft-input" rows="4" required>${escapeHTML(report.description)}</textarea>
                </div>

                <button type="submit" class="btn btn-warning">
                    <i class="bi bi-save me-1"></i>Simpan Perubahan
                </button>
            </form>
        </div>
    `;

    document.getElementById("editForm").addEventListener("submit", updateReport);
}

function clearWorkPanel() {
    const workPanel = document.getElementById("workPanel");

    if (workPanel) {
        workPanel.innerHTML = "";
    }
}

async function updateReport(event) {
    event.preventDefault();

    const id = document.getElementById("editId").value;

    try {
        await requestAPI(`/api/report/${id}/`, "PATCH", {
            title: document.getElementById("editTitle").value,
            category: document.getElementById("editCategory").value,
            location: document.getElementById("editLocation").value,
            description: document.getElementById("editDescription").value
        });

        clearWorkPanel();
        await loadReports();
    } catch (error) {
        alert("Gagal mengedit draft. Pastikan laporan masih DRAFT dan milik akun ini.");
    }
}

async function deleteReport(id) {
    const confirmed = confirm("Yakin ingin menghapus draft ini?");

    if (!confirmed) {
        return;
    }

    try {
        await requestAPI(`/api/report/${id}/`, "DELETE");
        await loadReports();
    } catch (error) {
        alert("Gagal menghapus draft. Pastikan laporan masih DRAFT dan milik akun ini.");
    }
}

async function submitReport(id) {
    const confirmed = confirm("Yakin ingin mengirim draft ini? Setelah dikirim, laporan tidak bisa diedit sebagai draft.");

    if (!confirmed) {
        return;
    }

    try {
        await requestAPI(`/api/report/${id}/submit/`, "POST");
        await loadReports();
    } catch (error) {
        alert("Gagal mengirim draft. Pastikan laporan masih DRAFT dan milik akun ini.");
    }
}

function handleRoute() {
    const appContent = document.getElementById("app-content");

    if (window.location.hash !== "#dashboard") {
        window.location.hash = "#dashboard";
    }

    updateNavbar();

    if (getAccessToken()) {
        appContent.innerHTML = renderDashboardPage();
        renderTokenStatus();
        loadReports();
    } else {
        appContent.innerHTML = renderLoginPage();
        setupLoginForm();
    }
}

window.addEventListener("load", handleRoute);
window.addEventListener("hashchange", handleRoute);