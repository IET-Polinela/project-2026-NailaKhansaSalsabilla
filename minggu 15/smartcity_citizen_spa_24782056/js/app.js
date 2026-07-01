let cachedReports = [];
let currentTab = "my_reports";
let currentPage = 1;
let editingReportId = null;

function getAccessToken() {
    return localStorage.getItem("access_token");
}

function getCurrentUsername() {
    return (localStorage.getItem("username") || "").toLowerCase();
}

function isAdminAccountInSPA() {
    const username = getCurrentUsername();
    const role = (localStorage.getItem("role") || localStorage.getItem("user_role") || "").toLowerCase();

    return role === "admin" || username === "admin" || username === "khansa" || username === "min";
}

function escapeHTML(value) {
    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const jam = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
    }).replace(":", ".");

    const tanggal = date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    return `jam ${jam} tanggal ${tanggal}`;
}

function updateNavbar() {
    const logoutButton = document.getElementById("logoutButton");
    const userGreeting = document.getElementById("userGreeting");
    const username = localStorage.getItem("username") || "Warga";

    if (logoutButton) {
        if (getAccessToken()) {
            logoutButton.classList.remove("d-none");
        } else {
            logoutButton.classList.add("d-none");
        }
    }

    if (userGreeting) {
        if (getAccessToken()) {
            userGreeting.classList.remove("d-none");
            userGreeting.innerHTML = `<i class="bi bi-person-circle me-1"></i>Haii, ${escapeHTML(username)}`;
        } else {
            userGreeting.classList.add("d-none");
        }
    }
}

function renderLoginPage() {
    return `
        <div class="row justify-content-center">
            <section class="col-12 col-md-7 col-lg-5">
                <div class="side-card p-5">
                    <div class="text-center mb-4">
                        <h3 class="fw-bold mb-1">Masuk Citizen Portal</h3>
                        <p class="text-muted mb-0">Gunakan akun untuk mengakses data laporan.</p>
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
        </div>
    `;
}

function renderCreateReportButton() {
    if (isAdminAccountInSPA()) {
        return "";
    }

    return `
        <div class="side-card p-4 mb-4">
            <button class="btn btn-primary w-100 create-button" onclick="openCreateModal()">
                <i class="bi bi-plus-circle me-2"></i>Buat<br>Laporan<br>Baru
            </button>
        </div>
    `;
}

function renderCitizenSidebar() {
    return `
        <aside class="col-12 col-lg-2">
            ${renderCreateReportButton()}

            <div class="side-card p-4">
                <h5 class="status-title mb-3">
                    <i class="bi bi-activity me-1"></i>STATUS LAPORAN ANDA
                </h5>

                <div class="status-row d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-pencil-square text-secondary me-2"></i>Draf</span>
                    <span id="statDraft" class="badge rounded-pill text-bg-secondary">0</span>
                </div>

                <div class="status-row d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-send-fill text-warning me-2"></i>Diajukan</span>
                    <span id="statReported" class="badge rounded-pill text-bg-warning">0</span>
                </div>

                <div class="status-row d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-send-check-fill text-primary me-2"></i>Diverifikasi</span>
                    <span id="statVerified" class="badge rounded-pill text-bg-primary">0</span>
                </div>

                <div class="status-row d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-gear-fill text-info me-2"></i>Diproses</span>
                    <span id="statProgress" class="badge rounded-pill text-bg-info">0</span>
                </div>

                <div class="status-row d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-check-circle-fill text-success me-2"></i>Selesai</span>
                    <span id="statResolved" class="badge rounded-pill text-bg-success">0</span>
                </div>
            </div>
        </aside>
    `;
}

function renderDashboardPage() {
    const isAdmin = isAdminAccountInSPA();

    if (isAdmin) {
        return `
            <div class="row g-4">
                <section class="col-12">
                    <div class="side-card p-4 mb-4">
                        <h4 class="fw-bold mb-1">
                            <i class="bi bi-shield-check me-2"></i>Mode Admin
                        </h4>
                        <p class="text-muted mb-0">
                            Admin tidak dapat membuat laporan. Tab Laporan Saya dikosongkan, sedangkan laporan publik tampil pada Feed Kota (Publik).
                        </p>
                    </div>

                    <ul class="nav content-tabs">
                        <li class="nav-item">
                            <button id="myReportsTab" class="nav-link active" onclick="switchTab('my_reports')">
                                <i class="bi bi-folder-fill me-2"></i>Laporan Saya
                            </button>
                        </li>
                        <li class="nav-item">
                            <button id="feedTab" class="nav-link" onclick="switchTab('feed')">
                                <i class="bi bi-globe2 me-2"></i>Feed Kota (Publik)
                            </button>
                        </li>
                    </ul>

                    <div id="reportList">
                        <div class="empty-box">
                            <span class="spinner-border spinner-border-sm me-2"></span>
                            Memuat laporan...
                        </div>
                    </div>

                    <nav id="paginationContainer" class="mt-4"></nav>
                </section>
            </div>
        `;
    }

    return `
        <div class="row g-4">
            ${renderCitizenSidebar()}

            <section class="col-12 col-lg-10">
                <ul class="nav content-tabs">
                    <li class="nav-item">
                        <button id="myReportsTab" class="nav-link active" onclick="switchTab('my_reports')">
                            <i class="bi bi-folder-fill me-2"></i>Laporan Saya
                        </button>
                    </li>
                    <li class="nav-item">
                        <button id="feedTab" class="nav-link" onclick="switchTab('feed')">
                            <i class="bi bi-globe2 me-2"></i>Feed Kota (Publik)
                        </button>
                    </li>
                </ul>

                <div id="reportList">
                    <div class="empty-box">
                        <span class="spinner-border spinner-border-sm me-2"></span>
                        Memuat laporan...
                    </div>
                </div>

                <nav id="paginationContainer" class="mt-4"></nav>
            </section>
        </div>
    `;
}

function getStatusBadgeClass(status) {
    if (status === "DRAFT") return "text-bg-dark";
    if (status === "REPORTED") return "text-bg-warning";
    if (status === "VERIFIED") return "text-bg-info";
    if (status === "IN_PROGRESS") return "text-bg-primary";
    if (status === "RESOLVED") return "text-bg-success";
    return "text-bg-secondary";
}

function getProgressInfo(status) {
    if (status === "DRAFT") {
        return { percent: 10, label: "Draf", className: "bg-secondary" };
    }

    if (status === "REPORTED") {
        return { percent: 25, label: "Diajukan", className: "bg-warning" };
    }

    if (status === "VERIFIED") {
        return { percent: 50, label: "Diverifikasi", className: "bg-info" };
    }

    if (status === "IN_PROGRESS") {
        return { percent: 75, label: "Diproses", className: "bg-primary" };
    }

    if (status === "RESOLVED") {
        return { percent: 100, label: "Selesai", className: "bg-success" };
    }

    return { percent: 0, label: "Tidak diketahui", className: "bg-secondary" };
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    const myReportsTab = document.getElementById("myReportsTab");
    const feedTab = document.getElementById("feedTab");

    if (myReportsTab) {
        myReportsTab.classList.toggle("active", tab === "my_reports");
    }

    if (feedTab) {
        feedTab.classList.toggle("active", tab === "feed");
    }

    loadDashboardData(currentTab, currentPage);
}

async function loadDashboardData(tab = currentTab, page = currentPage) {
    const reportList = document.getElementById("reportList");

    if (!reportList) {
        return;
    }

    currentTab = tab;
    currentPage = page;

    reportList.innerHTML = `
        <div class="empty-box">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Memuat laporan...
        </div>
    `;

    try {
        const response = await requestAPI(`/api/report/?tab=${tab}&page=${page}`, "GET");
        const data = response.data;
        const reports = Array.isArray(data) ? data : data.results || [];

        cachedReports = reports;

        renderList(reports, tab);
        renderPagination(data, tab, page);

        if (!isAdminAccountInSPA()) {
            loadSummaryStats();
        }
    } catch (error) {
        if (error.status === 401) {
            clearAuthStorage();
            handleRoute();
            return;
        }

        reportList.innerHTML = `
            <div class="empty-box text-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Gagal memuat laporan dari API.
            </div>
        `;
    }
}

function renderList(reports, tab) {
    const reportList = document.getElementById("reportList");

    if (reports.length === 0) {
        if (isAdminAccountInSPA() && tab === "my_reports") {
            reportList.innerHTML = `
                <div class="empty-box">
                    Laporan Saya kosong untuk akun admin.
                    <br>
                    Silakan buka tab Feed Kota (Publik) untuk melihat laporan citizen yang bukan draft.
                </div>
            `;
            return;
        }

        reportList.innerHTML = `
            <div class="empty-box">
                Belum ada laporan di tab ini.
            </div>
        `;
        return;
    }

    reportList.innerHTML = `
        <div class="row g-4">
            ${reports.map(function (report) {
                return renderReportCard(report, tab);
            }).join("")}
        </div>
    `;
}

function renderReportCard(report, tab) {
    const progress = getProgressInfo(report.status);
    const isAdmin = isAdminAccountInSPA();
    const canManageDraft = !isAdmin && tab === "my_reports" && report.status === "DRAFT" && report.is_owner === true;

    return `
        <div class="col-12 col-xl-6">
            <article class="card report-card h-100">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="badge ${getStatusBadgeClass(report.status)}">${escapeHTML(report.status)}</span>
                        <span class="text-muted text-small">${escapeHTML(report.category)}</span>
                    </div>

                    <h5 class="report-title mb-3">${escapeHTML(report.title)}</h5>

                    <p class="report-description mb-3">${escapeHTML(report.description)}</p>

                    <div class="report-meta">
                        <div><strong>Lokasi:</strong> ${escapeHTML(report.location)}</div>
                        <div><strong>Oleh:</strong> ${escapeHTML(report.reporter)}</div>
                        <div><strong>Dibuat:</strong> ${escapeHTML(formatDateTime(report.created_at))}</div>
                        <div><strong>Diperbarui:</strong> ${escapeHTML(formatDateTime(report.updated_at))}</div>
                    </div>

                    <div class="mt-auto pt-4">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="progress-label">Progress Laporan:</span>
                            <span class="progress-label text-primary">${progress.label} (${progress.percent}%)</span>
                        </div>

                        <div class="progress mb-3">
                            <div class="progress-bar ${progress.className}" role="progressbar" style="width: ${progress.percent}%"></div>
                        </div>

                        <div class="d-flex justify-content-end flex-wrap gap-2">
                            ${canManageDraft ? `
                                <button class="btn btn-sm btn-outline-warning" onclick="editDraft(${report.id})">
                                    <i class="bi bi-pencil-square me-1"></i>Edit
                                </button>

                                <button class="btn btn-sm btn-success" onclick="submitDraft(${report.id})">
                                    <i class="bi bi-send me-1"></i>Kirim
                                </button>
                            ` : ""}
                        </div>
                    </div>
                </div>
            </article>
        </div>
    `;
}

function renderPagination(data, tab, page) {
    const paginationContainer = document.getElementById("paginationContainer");

    if (!paginationContainer) {
        return;
    }

    if (Array.isArray(data) || !data.count || data.count <= 10) {
        paginationContainer.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(data.count / 10);
    const pages = [];

    for (let i = 1; i <= Math.min(3, totalPages); i++) {
        pages.push(i);
    }

    if (totalPages > 3 && !pages.includes(totalPages)) {
        pages.push(totalPages);
    }

    let items = "";

    items += `
        <li class="page-item ${page <= 1 ? "disabled" : ""}">
            <button class="page-link" onclick="loadDashboardData('${tab}', ${page - 1})">Sebelumnya</button>
        </li>
    `;

    pages.forEach(function (item) {
        items += `
            <li class="page-item ${item === page ? "active" : ""}">
                <button class="page-link" onclick="loadDashboardData('${tab}', ${item})">${item}</button>
            </li>
        `;
    });

    items += `
        <li class="page-item ${page >= totalPages ? "disabled" : ""}">
            <button class="page-link" onclick="loadDashboardData('${tab}', ${page + 1})">Selanjutnya</button>
        </li>
    `;

    paginationContainer.innerHTML = `
        <ul class="pagination justify-content-center flex-wrap">
            ${items}
        </ul>
    `;
}

async function loadSummaryStats() {
    if (isAdminAccountInSPA()) {
        return;
    }

    try {
        const response = await requestAPI("/api/report/?tab=my_reports&page_size=1000", "GET");
        const reports = Array.isArray(response.data) ? response.data : response.data.results || [];

        const statDraft = document.getElementById("statDraft");
        const statReported = document.getElementById("statReported");
        const statVerified = document.getElementById("statVerified");
        const statProgress = document.getElementById("statProgress");
        const statResolved = document.getElementById("statResolved");

        if (statDraft) statDraft.textContent = reports.filter(report => report.status === "DRAFT").length;
        if (statReported) statReported.textContent = reports.filter(report => report.status === "REPORTED").length;
        if (statVerified) statVerified.textContent = reports.filter(report => report.status === "VERIFIED").length;
        if (statProgress) statProgress.textContent = reports.filter(report => report.status === "IN_PROGRESS").length;
        if (statResolved) statResolved.textContent = reports.filter(report => report.status === "RESOLVED").length;
    } catch (error) {
        return;
    }
}

function openCreateModal() {
    if (isAdminAccountInSPA()) {
        alert("Admin tidak diperbolehkan membuat laporan.");
        return;
    }

    const reportForm = document.getElementById("reportForm");
    const reportModalTitle = document.getElementById("reportModalTitle");
    const modalElement = document.getElementById("reportModal");

    editingReportId = null;
    reportForm.reset();
    reportModalTitle.textContent = "Tambah Laporan Baru";

    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

async function editDraft(id) {
    if (isAdminAccountInSPA()) {
        alert("Admin tidak dapat mengedit laporan citizen.");
        return;
    }

    try {
        const response = await requestAPI(`/api/report/${id}/`, "GET");
        const report = response.data;

        if (report.status !== "DRAFT" || report.is_owner !== true) {
            alert("Laporan ini tidak dapat diedit.");
            return;
        }

        editingReportId = report.id;

        document.getElementById("reportModalTitle").textContent = "Edit Draft Laporan";
        document.getElementById("reportTitle").value = report.title;
        document.getElementById("reportCategory").value = report.category;
        document.getElementById("reportLocation").value = report.location;
        document.getElementById("reportDescription").value = report.description;

        bootstrap.Modal.getOrCreateInstance(document.getElementById("reportModal")).show();
    } catch (error) {
        alert("Gagal mengambil data draft.");
    }
}

function getReportPayload(targetStatus) {
    return {
        title: document.getElementById("reportTitle").value,
        category: document.getElementById("reportCategory").value,
        location: document.getElementById("reportLocation").value,
        description: document.getElementById("reportDescription").value,
        status: targetStatus
    };
}

async function submitModalForm(targetStatus) {
    if (isAdminAccountInSPA()) {
        alert("Admin tidak diperbolehkan membuat laporan.");
        return;
    }

    const reportForm = document.getElementById("reportForm");

    if (!reportForm.checkValidity()) {
        reportForm.reportValidity();
        return;
    }

    const payload = getReportPayload(targetStatus);
    const method = editingReportId === null ? "POST" : "PUT";
    const endpoint = editingReportId === null ? "/api/report/" : `/api/report/${editingReportId}/`;

    try {
        const response = await requestAPI(endpoint, method, payload);

        if (response.status === 201 || response.status === 200) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById("reportModal")).hide();
            reportForm.reset();
            editingReportId = null;
            await loadDashboardData(currentTab, currentPage);
        }
    } catch (error) {
        alert("Gagal menyimpan laporan. Pastikan data lengkap dan akun memiliki izin.");
    }
}

async function deleteReport(id) {
    alert("Fitur hapus laporan tidak diizinkan.");
}

async function submitDraft(id) {
    if (isAdminAccountInSPA()) {
        alert("Admin tidak dapat mengirim draft citizen.");
        return;
    }

    if (!confirm("Yakin ingin mengirim draft ini? Setelah dikirim, laporan tidak dapat diedit sebagai draft.")) {
        return;
    }

    try {
        await requestAPI(`/api/report/${id}/submit/`, "POST");
        await loadDashboardData(currentTab, currentPage);
    } catch (error) {
        alert("Gagal mengirim draft. Pastikan laporan masih DRAFT dan milik akun ini.");
    }
}

function setupReportModalButtons() {
    const saveDraftButton = document.getElementById("saveDraftButton");
    const submitReportButton = document.getElementById("submitReportButton");

    if (saveDraftButton) {
        saveDraftButton.addEventListener("click", function () {
            submitModalForm("DRAFT");
        });
    }

    if (submitReportButton) {
        submitReportButton.addEventListener("click", function () {
            submitModalForm("REPORTED");
        });
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
        loadDashboardData("my_reports", 1);
    } else {
        appContent.innerHTML = renderLoginPage();
        setupLoginForm();
    }
}

window.addEventListener("load", function () {
    setupReportModalButtons();
    handleRoute();
});

window.addEventListener("hashchange", handleRoute);